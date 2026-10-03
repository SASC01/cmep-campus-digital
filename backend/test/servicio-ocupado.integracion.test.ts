import { errorApiSchema } from "@campus/shared"
import Fastify, { type FastifyInstance } from "fastify"
import { pino } from "pino"
import { randomUUID } from "node:crypto"
import { Writable } from "node:stream"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { enTransaccion, obtenerDb } from "../src/adapters/db/cliente.js"
import {
  crearEnlaceRegistro,
  registrarMaestroConEnlace,
  revocarEnlaceRegistro,
} from "../src/adapters/db/index.js"
import { MENSAJE_SERVICIO_OCUPADO } from "../src/adapters/db/errores.js"
import { construirApp } from "../src/app.js"
import { cargarEnv } from "../src/config/env.js"
import { COLA_COMENTARIO_CREADO } from "../src/core/eventos/avisos-de-clase.js"
import { AppError } from "../src/core/errores.js"
import { manejoDeErrores } from "../src/handlers/errores.js"
import {
  borrarUsuariosDePrueba,
  borrarUsuariosDePruebaPorCorreo,
  correoDePrueba,
  crearSesionDePrueba,
  crearUsuarioDePrueba,
  encabezadoCookieRefresco,
  firmarTokenDePrueba,
  NOMBRE_COOKIE,
  refrescarDePrueba,
} from "./ayudas-auth.js"
import { conFilaRetenida } from "./ayudas-concurrencia.js"
import {
  borrarMovimientosYClasesDePrueba,
  contarComentarios,
  crearAlumnoDePrueba,
  crearClaseDePrueba,
  crearPublicacionDePrueba,
  inscribirDePrueba,
  leerTrabajosDeCola,
} from "./ayudas-clases.js"
import { crearTokenDePrueba, leerTokens } from "./ayudas-cuentas.js"

// CHORE-02 (§D-4): una transacción que Prisma cierra por tiempo (P2028) responde 503
// SERVICIO_OCUPADO, nunca 500, y no deja nada escrito ni encolado. Cada caso retiene solo filas
// propias, con timeout explícito.

let app: FastifyInstance | undefined
const idsUsuarios: string[] = []
const idsClases: string[] = []
const idsEnlaces: string[] = []
const correosDeEnlaces: string[] = []

const obtenerApp = (): FastifyInstance => {
  if (!app) throw new Error("La aplicación no se construyó en beforeAll")
  return app
}

const esperar = (ms: number): Promise<void> => new Promise((resolver) => setTimeout(resolver, ms))

// Más que el timeout por defecto de una transacción interactiva (5 s): la petición formada detrás
// de la fila retenida expira antes de que la retenedora la suelte.
const RETENCION_MS = 5500

const unDia = (): Date => new Date(Date.now() + 24 * 60 * 60_000)

beforeAll(async () => {
  app = await construirApp({ env: cargarEnv() })
  await app.ready()
})

afterAll(async () => {
  // Los registrados de un enlace antes que el enlace (FK ON DELETE RESTRICT).
  await borrarUsuariosDePruebaPorCorreo(correosDeEnlaces)
  await obtenerDb().enlaceRegistro.deleteMany({ where: { id: { in: idsEnlaces } } })
  // N-10: clases (con sus publicaciones y comentarios en cascada) antes que los usuarios.
  await borrarMovimientosYClasesDePrueba(idsClases)
  await borrarUsuariosDePrueba(idsUsuarios)
  await app?.close()
})

describe("enTransaccion traduce el P2028 (PR-CH-04c)", () => {
  it("PR-CH-04c: una transacción que pasa su timeout rechaza con SERVICIO_OCUPADO 503 y no escribe nada", async () => {
    // CHORE-02 (T-04, PR-CH-13b): la fila de prueba va en enlaces_registro, sin llaves foráneas: una
    // fila sin confirmar no es visible para nadie y no retiene "usuarios" ni interfiere con las
    // pruebas que recorren la lista de enlaces.
    const hashToken = randomUUID()
    try {
      const error = await enTransaccion(obtenerDb(), async (tx) => {
        await tx.enlaceRegistro.create({
          data: { hashToken, expiraEn: new Date(Date.now() + 24 * 60 * 60_000) },
          select: { id: true },
        })
        await esperar(5300)
        await tx.$queryRaw`SELECT 1`
      }).then(
        () => undefined,
        (rechazo: unknown) => rechazo,
      )

      expect(error, "la transacción expirada debe rechazar").toBeInstanceOf(AppError)
      const appError = error as AppError
      expect(appError.codigo).toBe("SERVICIO_OCUPADO")
      expect(appError.estado).toBe(503)
      expect(appError.message).toBe(MENSAJE_SERVICIO_OCUPADO)
      expect(appError.cause).toBeDefined()
      const fila = await obtenerDb().enlaceRegistro.findUnique({ where: { hashToken } })
      expect(fila, "Prisma revierte la transacción expirada: la fila no existe").toBeNull()
    } finally {
      await obtenerDb().enlaceRegistro.deleteMany({ where: { hashToken } })
    }
  }, 30_000)
})

describe("POST /api/auth/cambiar-contrasena con la fila del usuario retenida (PR-CH-04d)", () => {
  it("PR-CH-04d: responde 503 SERVICIO_OCUPADO sin escribir nada, y la misma petición sin retención responde 204", async () => {
    const usuario = await crearUsuarioDePrueba(idsUsuarios, { debeCambiarContrasena: true })
    const sesionA = await crearSesionDePrueba({ usuarioId: usuario.id, expiraEn: unDia() })
    const sesionB = await crearSesionDePrueba({ usuarioId: usuario.id, expiraEn: unDia() })
    const recuperacion = await crearTokenDePrueba({
      usuarioId: usuario.id,
      tipo: "recuperacion",
      expiraEn: unDia(),
    })
    const tokenAcceso = await firmarTokenDePrueba({ usuarioId: usuario.id })
    const antes = await obtenerDb().usuario.findUnique({
      where: { id: usuario.id },
      select: { hashContrasena: true },
    })
    const cambiar = () =>
      obtenerApp().inject({
        method: "POST",
        url: "/api/auth/cambiar-contrasena",
        headers: { authorization: `Bearer ${tokenAcceso}` },
        payload: { contrasenaNueva: "contrasena-nueva-ocupado-1" },
        cookies: { [NOMBRE_COOKIE]: sesionA.token },
      })

    const [respuesta] = await conFilaRetenida(
      { tabla: "usuarios", id: usuario.id },
      [cambiar],
      async () => {
        await esperar(RETENCION_MS)
      },
    )

    expect(respuesta, "Precondición: la operación devolvió una respuesta").toBeTruthy()
    if (!respuesta) throw new Error("Precondición: la operación devolvió una respuesta")
    expect(respuesta.statusCode, respuesta.body).toBe(503)
    const cuerpo = errorApiSchema.parse(respuesta.json())
    expect(cuerpo.error.codigo).toBe("SERVICIO_OCUPADO")
    expect(cuerpo.error.mensaje).toBe(MENSAJE_SERVICIO_OCUPADO)

    const despues = await obtenerDb().usuario.findUnique({
      where: { id: usuario.id },
      select: { hashContrasena: true, debeCambiarContrasena: true },
    })
    expect(despues?.hashContrasena).toBe(antes?.hashContrasena)
    expect(despues?.debeCambiarContrasena).toBe(true)
    const vivas = await obtenerDb().sesion.count({
      where: { id: { in: [sesionA.id, sesionB.id] }, revocadaEn: null },
    })
    expect(vivas).toBe(2)
    const tokenVivo = (await leerTokens(usuario.id)).find((token) => token.id === recuperacion.id)
    expect(tokenVivo?.revocadoEn).toBeNull()
    expect(tokenVivo?.usadoEn).toBeNull()

    // El pool sigue sano y el intento no se consumió como fallo.
    const repetida = await cambiar()
    expect(repetida.statusCode, repetida.body).toBe(204)
    const final = await obtenerDb().usuario.findUnique({
      where: { id: usuario.id },
      select: { debeCambiarContrasena: true },
    })
    expect(final?.debeCambiarContrasena).toBe(false)
  }, 30_000)
})

describe("POST /api/auth/refrescar con la fila del usuario retenida (PR-CH-04e)", () => {
  it("PR-CH-04e: responde 503 SERVICIO_OCUPADO sin cookie nueva ni rotar la sesión, y un refresco posterior responde 200", async () => {
    const usuario = await crearUsuarioDePrueba(idsUsuarios)
    const sesion = await crearSesionDePrueba({ usuarioId: usuario.id, expiraEn: unDia() })

    const [respuesta] = await conFilaRetenida(
      { tabla: "usuarios", id: usuario.id },
      [() => refrescarDePrueba(obtenerApp(), sesion.token)],
      async () => {
        await esperar(RETENCION_MS)
      },
    )

    expect(respuesta, "Precondición: la operación devolvió una respuesta").toBeTruthy()
    if (!respuesta) throw new Error("Precondición: la operación devolvió una respuesta")
    expect(respuesta.statusCode, respuesta.body).toBe(503)
    const cuerpo = errorApiSchema.parse(respuesta.json())
    expect(cuerpo.error.codigo).toBe("SERVICIO_OCUPADO")
    expect(cuerpo.error.mensaje).toBe(MENSAJE_SERVICIO_OCUPADO)
    expect(encabezadoCookieRefresco(respuesta)).toBeUndefined()

    const fila = await obtenerDb().sesion.findUnique({
      where: { id: sesion.id },
      select: { revocadaEn: true, reemplazadaPor: true },
    })
    expect(fila?.revocadaEn).toBeNull()
    expect(fila?.reemplazadaPor).toBeNull()

    // No cuenta como reutilización: la misma cookie sigue sirviendo.
    const posterior = await refrescarDePrueba(obtenerApp(), sesion.token)
    expect(posterior.statusCode, posterior.body).toBe(200)
  }, 30_000)
})

describe("POST /api/clases/:claseId/publicaciones/:publicacionId/comentarios con la fila del autor retenida (PR-CH-04f)", () => {
  it("PR-CH-04f: responde 503 SERVICIO_OCUPADO sin comentario ni trabajo en la cola", async () => {
    const maestro = await crearUsuarioDePrueba(idsUsuarios, { rol: "maestro" })
    const clase = await crearClaseDePrueba(idsClases, { maestroId: maestro.id })
    const alumno = await crearAlumnoDePrueba(idsUsuarios, { nombre: "Alumno ocupado" })
    await inscribirDePrueba(clase.id, alumno.id, "codigo")
    const publicacionId = await crearPublicacionDePrueba({
      claseId: clase.id,
      autorId: maestro.id,
    })
    const token = await firmarTokenDePrueba({ usuarioId: alumno.id })

    const [respuesta] = await conFilaRetenida(
      { tabla: "usuarios", id: alumno.id },
      [
        () =>
          obtenerApp().inject({
            method: "POST",
            url: `/api/clases/${clase.id}/publicaciones/${publicacionId}/comentarios`,
            headers: { authorization: `Bearer ${token}` },
            payload: { texto: "Comentario que no debe guardarse" },
          }),
      ],
      async () => {
        await esperar(RETENCION_MS)
      },
    )

    expect(respuesta, "Precondición: la operación devolvió una respuesta").toBeTruthy()
    if (!respuesta) throw new Error("Precondición: la operación devolvió una respuesta")
    expect(respuesta.statusCode, respuesta.body).toBe(503)
    const cuerpo = errorApiSchema.parse(respuesta.json())
    expect(cuerpo.error.codigo).toBe("SERVICIO_OCUPADO")
    expect(cuerpo.error.mensaje).toBe(MENSAJE_SERVICIO_OCUPADO)
    expect(await contarComentarios(publicacionId)).toBe(0)
    expect(
      await leerTrabajosDeCola(COLA_COMENTARIO_CREADO, "publicacionId", publicacionId),
    ).toHaveLength(0)
  }, 30_000)
})

// PR-CH-04g: una app suelta con el envoltorio de errores y un logger en memoria (sin la base).
describe("registro del SERVICIO_OCUPADO en el envoltorio de errores (PR-CH-04g)", () => {
  const NIVEL_WARN = 40

  interface LineaDeLog {
    level: number
    msg: string
    codigo?: string
    err?: { code?: string }
  }

  const appConLog = async () => {
    let salida = ""
    const destino = new Writable({
      write(trozo: Buffer, _codificacion, listo) {
        salida += trozo.toString("utf8")
        listo()
      },
    })
    const servidor = Fastify({ loggerInstance: pino({ level: "trace" }, destino) })
    await servidor.register(manejoDeErrores)
    // Solo las líneas de nivel warn o más: las de "incoming request" y "request completed" no cuentan.
    const lineas = (): LineaDeLog[] =>
      salida
        .split("\n")
        .filter((linea) => linea.trim() !== "")
        .map((linea) => JSON.parse(linea) as LineaDeLog)
        .filter((linea) => linea.level >= NIVEL_WARN)
    return { servidor, lineas, crudo: () => salida }
  }

  it("un AppError 503 con causa P2028 produce una línea warn con el código de Prisma y el codigo del error", async () => {
    const { servidor, lineas, crudo } = await appConLog()
    const causa = Object.assign(new Error("Transaction expired"), { code: "P2028" })
    servidor.get("/ocupado", async () => {
      throw new AppError("SERVICIO_OCUPADO", MENSAJE_SERVICIO_OCUPADO, 503, { causa })
    })
    try {
      const respuesta = await servidor.inject({ method: "GET", url: "/ocupado" })

      expect(respuesta.statusCode).toBe(503)
      expect(errorApiSchema.parse(respuesta.json()).error.codigo).toBe("SERVICIO_OCUPADO")
      const registradas = lineas()
      expect(registradas).toHaveLength(1)
      expect(registradas[0]?.level).toBe(NIVEL_WARN)
      expect(registradas[0]?.msg).toBe("Error controlado del servidor")
      expect(registradas[0]?.codigo).toBe("SERVICIO_OCUPADO")
      expect(registradas[0]?.err?.code).toBe("P2028")
      expect(crudo()).toContain('"code":"P2028"')
    } finally {
      await servidor.close()
    }
  })

  it("un AppError 503 sin causa y un AppError 4xx con causa no producen ninguna línea warn", async () => {
    const { servidor, lineas } = await appConLog()
    servidor.get("/sin-causa", async () => {
      throw new AppError("BASE_DE_DATOS_NO_DISPONIBLE", "No disponible.", 503)
    })
    servidor.get("/cliente-con-causa", async () => {
      throw new AppError("PRUEBA", "Mensaje", 409, { causa: new Error("detalle") })
    })
    try {
      const sinCausa = await servidor.inject({ method: "GET", url: "/sin-causa" })
      const conCausa = await servidor.inject({ method: "GET", url: "/cliente-con-causa" })

      expect(sinCausa.statusCode).toBe(503)
      expect(conCausa.statusCode).toBe(409)
      expect(lineas()).toHaveLength(0)
    } finally {
      await servidor.close()
    }
  })

  it("un Error común sigue produciendo Error no controlado y 500 ERROR_INTERNO", async () => {
    const { servidor, lineas } = await appConLog()
    servidor.get("/roto", async () => {
      throw new Error("boom")
    })
    try {
      const respuesta = await servidor.inject({ method: "GET", url: "/roto" })

      expect(respuesta.statusCode).toBe(500)
      expect(errorApiSchema.parse(respuesta.json()).error.codigo).toBe("ERROR_INTERNO")
      const registradas = lineas()
      expect(registradas).toHaveLength(1)
      expect(registradas[0]?.msg).toBe("Error no controlado")
    } finally {
      await servidor.close()
    }
  })
})

// M-08 (§E3-2): con el pool del proceso (10 conexiones) ocupado, una transacción que va en serie
// sobre la fila de un enlace espera hasta 10 s por una conexión en lugar de los 2 s por defecto.
const CONEXIONES_DEL_POOL = 10
const SOLTAR_EL_POOL_A_LOS_MS = 3000

// Ocupa las 10 conexiones del pool con transacciones propias que se sueltan a los 3 s, lanza la
// operación cuando todas están tomadas y espera a que ambas terminen. Devuelve lo que la operación
// resolvió o rechazó, con lo que tardó.
const conElPoolOcupado = async <T>(
  operacion: () => Promise<T>,
): Promise<{ resultado: PromiseSettledResult<T>; ms: number }> => {
  let tomadas = 0
  const retenedoras = Array.from({ length: CONEXIONES_DEL_POOL }, () =>
    obtenerDb().$transaction(
      async (tx) => {
        await tx.$queryRaw`SELECT 1`
        tomadas += 1
        await esperar(SOLTAR_EL_POOL_A_LOS_MS)
      },
      { timeout: 20_000, maxWait: 10_000 },
    ),
  )
  const limite = Date.now() + 5000
  while (tomadas < CONEXIONES_DEL_POOL && Date.now() < limite) await esperar(10)
  expect(tomadas, "Precondición: las 10 conexiones del pool quedaron ocupadas").toBe(
    CONEXIONES_DEL_POOL,
  )
  const inicio = Date.now()
  const [resultado] = await Promise.allSettled([operacion()])
  const ms = Date.now() - inicio
  await Promise.all(retenedoras)
  return { resultado, ms }
}

describe("enTransaccion con maxWait (PR-CH-10a)", () => {
  it("PR-CH-10a: con maxWait de 8 s y el pool ocupado 3 s, no rechaza y resuelve después de soltarlo; sin la opción rechaza con 503", async () => {
    const conOpcion = await conElPoolOcupado(() =>
      enTransaccion(
        obtenerDb(),
        async (tx) => (await tx.$queryRaw<{ n: number }[]>`SELECT 1 AS n`)[0]?.n,
        {
          maxWait: 8000,
        },
      ),
    )
    expect(conOpcion.resultado.status).toBe("fulfilled")
    expect(conOpcion.ms, "esperó a que se soltara el pool").toBeGreaterThan(1500)

    // Control: sin la opción, el maxWait por defecto (2 s) vence antes de que se suelte el pool.
    const sinOpcion = await conElPoolOcupado(() =>
      enTransaccion(obtenerDb(), async (tx) => tx.$queryRaw`SELECT 1`),
    )
    expect(sinOpcion.resultado.status).toBe("rejected")
    const motivo =
      sinOpcion.resultado.status === "rejected" ? sinOpcion.resultado.reason : undefined
    expect(motivo).toBeInstanceOf(AppError)
    expect((motivo as AppError).codigo).toBe("SERVICIO_OCUPADO")
    expect((motivo as AppError).estado).toBe(503)
  }, 30_000)
})

describe("transacciones del enlace de registro con el pool ocupado (PR-CH-10b)", () => {
  it("PR-CH-10b: registrarMaestroConEnlace y revocarEnlaceRegistro esperan la conexión y resuelven, sin 503", async () => {
    const vigente = new Date(Date.now() + 24 * 60 * 60_000)
    const enlaceParaRegistrar = await crearEnlaceRegistro({
      hashToken: randomUUID(),
      expiraEn: vigente,
    })
    const enlaceParaRevocar = await crearEnlaceRegistro({
      hashToken: randomUUID(),
      expiraEn: vigente,
    })
    idsEnlaces.push(enlaceParaRegistrar.id, enlaceParaRevocar.id)
    const email = correoDePrueba("enlace-ocupado")
    correosDeEnlaces.push(email)

    const { resultado, ms } = await conElPoolOcupado(() =>
      Promise.all([
        registrarMaestroConEnlace({
          enlaceId: enlaceParaRegistrar.id,
          usuario: {
            nombre: "Maestro ocupado",
            nombreBusqueda: "maestro ocupado",
            email,
            hashContrasena: "hash-de-prueba",
            rol: "maestro",
            enlaceRegistroId: enlaceParaRegistrar.id,
          },
          sesion: {
            hashToken: randomUUID(),
            expiraEn: vigente,
            ip: null,
            agente: null,
          },
          ahora: new Date(),
        }),
        revocarEnlaceRegistro({ id: enlaceParaRevocar.id }),
      ]),
    )

    expect(resultado.status, JSON.stringify(resultado)).toBe("fulfilled")
    if (resultado.status !== "fulfilled") throw new Error("Precondición: ambas debían resolver")
    const [registro, revocado] = resultado.value
    expect(registro?.usuarioId).toBeDefined()
    expect(revocado?.id).toBe(enlaceParaRevocar.id)
    expect(revocado?.revocadoEn).not.toBeNull()
    expect(ms, "esperaron a que se soltara el pool").toBeGreaterThan(1500)
  }, 30_000)
})
