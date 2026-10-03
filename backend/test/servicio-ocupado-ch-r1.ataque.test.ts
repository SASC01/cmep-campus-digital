import { randomBytes } from "node:crypto"

import { errorApiSchema } from "@campus/shared"
import type { FastifyInstance, LightMyRequestResponse } from "fastify"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { generarTokenDeEnlace } from "../src/adapters/auth/index.js"
import { enTransaccion, obtenerDb } from "../src/adapters/db/cliente.js"
import { MENSAJE_SERVICIO_OCUPADO } from "../src/adapters/db/errores.js"
import { construirApp } from "../src/app.js"
import { cargarEnv } from "../src/config/env.js"
import { AppError } from "../src/core/errores.js"
import {
  borrarUsuariosDePrueba,
  borrarUsuariosDePruebaPorCorreo,
  contarSesionesVivas,
  correoDePrueba,
  crearSesionDePrueba,
  crearUsuarioDePrueba,
  encabezadoCookieRefresco,
  firmarTokenDePrueba,
} from "./ayudas-auth.js"
import { conFilaRetenida } from "./ayudas-concurrencia.js"
import {
  borrarMovimientosYClasesDePrueba,
  crearAlumnoDePrueba,
  crearClaseDePrueba,
  leerInscripcion,
  leerMovimientos,
} from "./ayudas-clases.js"
import { crearTokenDePrueba, leerTokens } from "./ayudas-cuentas.js"

// Ataque del Tester (CHORE-02, ronda 1, puntos 4 y 5): el P2028 responde 503 SERVICIO_OCUPADO en
// transacciones que las pruebas del programador no cubren, por las dos vías:
// - timeout (5 s): una petición formada detrás de una fila retenida más de 5 s;
// - maxWait (2 s): con las conexiones del pool ocupadas, la transacción no empieza.
// En cada una: nunca 500, el formato de la API, nada escrito, y la misma petición después
// funciona (el pool sigue sano).
//
// La app de este archivo registra en nivel "error": los P2028 que provoca a propósito (warn,
// "Error controlado del servidor") no entran en el conteo de PA-07 de la corrida completa, y un 500
// sí saldría ("Error no controlado" es nivel error).

let app: FastifyInstance | undefined
const idsUsuarios: string[] = []
const idsClases: string[] = []
const enlaces: string[] = []
let tokenAdmin = ""

const obtenerApp = (): FastifyInstance => {
  if (!app) throw new Error("La aplicación no se construyó en beforeAll")
  return app
}

const esperar = (ms: number): Promise<void> => new Promise((resolver) => setTimeout(resolver, ms))

// Más que el timeout por defecto de la transacción interactiva (5 s).
const RETENCION_MS = 5500
// Conexiones del pool de pg que usa @prisma/adapter-pg sin configuración (max por defecto).
const CONEXIONES_DEL_POOL = 10

const unDia = (): Date => new Date(Date.now() + 24 * 60 * 60_000)

beforeAll(async () => {
  app = await construirApp({ env: { ...cargarEnv(), LOG_LEVEL: "error" } })
  await app.ready()
  const admin = await obtenerDb().usuario.findFirst({
    where: { rol: "admin" },
    select: { id: true },
  })
  if (!admin) throw new Error("Precondición: falta el admin único de la base desechable")
  tokenAdmin = await firmarTokenDePrueba({ usuarioId: admin.id })
})

afterAll(async () => {
  await borrarMovimientosYClasesDePrueba(idsClases)
  await obtenerDb().usuario.deleteMany({ where: { enlaceRegistroId: { in: enlaces } } })
  await borrarUsuariosDePrueba(idsUsuarios)
  await obtenerDb().enlaceRegistro.deleteMany({ where: { id: { in: enlaces } } })
  await app?.close()
})

const unica = (respuestas: (LightMyRequestResponse | null)[]): LightMyRequestResponse => {
  const [respuesta] = respuestas
  expect(respuesta, "Precondición: la operación devolvió una respuesta").toBeTruthy()
  if (!respuesta) throw new Error("Precondición: la operación devolvió una respuesta")
  return respuesta
}

const esServicioOcupado = (respuesta: LightMyRequestResponse): void => {
  expect(respuesta.statusCode, respuesta.body).toBe(503)
  const cuerpo = errorApiSchema.parse(respuesta.json())
  expect(cuerpo).toEqual({
    error: { codigo: "SERVICIO_OCUPADO", mensaje: MENSAJE_SERVICIO_OCUPADO },
  })
}

const crearEnlace = async (): Promise<{ id: string; token: string }> => {
  const { token, hash } = generarTokenDeEnlace()
  const { id } = await obtenerDb().enlaceRegistro.create({
    data: { hashToken: hash, expiraEn: new Date(Date.now() + 7 * 86_400_000) },
    select: { id: true },
  })
  enlaces.push(id)
  return { id, token }
}

// Ocupa n conexiones del pool con transacciones abiertas que esperan a que se las libere. Devuelve
// cuando las n ya están dentro (cada una ejecutó su primera sentencia).
const ocuparPool = async (
  n: number,
): Promise<{ liberar: () => Promise<void>; terminadas: Promise<unknown> }> => {
  let abrir: () => void = () => undefined
  const compuerta = new Promise<void>((resolver) => {
    abrir = resolver
  })
  let dentro = 0
  const transacciones = Array.from({ length: n }, () =>
    obtenerDb().$transaction(
      async (tx) => {
        await tx.$queryRaw`SELECT 1`
        dentro += 1
        await compuerta
      },
      { maxWait: 10_000, timeout: 30_000 },
    ),
  )
  const limite = Date.now() + 10_000
  while (dentro < n && Date.now() < limite) await esperar(20)
  expect(dentro, `Precondición: las ${String(n)} transacciones no abrieron en 10 s`).toBe(n)
  const terminadas = Promise.all(transacciones)
  return {
    liberar: async () => {
      abrir()
      await terminadas
    },
    terminadas,
  }
}

// El pool tiene sus n conexiones: n transacciones pueden estar abiertas a la vez (barrera). Si una
// conexión se perdió tras un maxWait, la n-ésima no entra y la barrera no se completa.
const poolCompleto = async (n: number): Promise<boolean> => {
  let dentro = 0
  let abrir: () => void = () => undefined
  const barrera = new Promise<void>((resolver) => {
    abrir = resolver
  })
  const transacciones = Array.from({ length: n }, () =>
    obtenerDb().$transaction(
      async (tx) => {
        await tx.$queryRaw`SELECT 1`
        dentro += 1
        if (dentro === n) abrir()
        await Promise.race([barrera, esperar(4_000)])
        return dentro === n
      },
      { maxWait: 4_000, timeout: 10_000 },
    ),
  )
  const resultados = await Promise.allSettled(transacciones)
  return resultados.every((r) => r.status === "fulfilled" && r.value === true)
}

describe("ataque (CHORE-02 r1): maxWait, con el pool ocupado la transacción no empieza", () => {
  it("enTransaccion rechaza con AppError 503 SERVICIO_OCUPADO sin ejecutar la función, y el pool conserva sus conexiones", async () => {
    const ocupado = await ocuparPool(CONEXIONES_DEL_POOL)
    let ejecutada = false
    const inicio = Date.now()
    const error = await enTransaccion(obtenerDb(), async () => {
      ejecutada = true
    }).then(
      () => undefined,
      (rechazo: unknown) => rechazo,
    )
    const tardo = Date.now() - inicio
    await ocupado.liberar()

    expect(error, "con el pool ocupado, la transacción debe rechazar").toBeInstanceOf(AppError)
    const appError = error as AppError
    expect({
      codigo: appError.codigo,
      estado: appError.estado,
      mensaje: appError.message,
      codigoDeLaCausa: (appError.cause as { code?: unknown } | undefined)?.code,
      ejecutada,
    }).toEqual({
      codigo: "SERVICIO_OCUPADO",
      estado: 503,
      mensaje: MENSAJE_SERVICIO_OCUPADO,
      codigoDeLaCausa: "P2028",
      ejecutada: false,
    })
    expect(tardo, "el rechazo llega por el maxWait de 2 s, no por el timeout de 5 s").toBeLessThan(
      4_500,
    )
    expect(await poolCompleto(CONEXIONES_DEL_POOL), "una conexión se perdió tras el maxWait").toBe(
      true,
    )
  }, 30_000)

  it("POST /api/auth/registro con el pool ocupado responde 503 SERVICIO_OCUPADO, sin cuenta ni cookie; después 201 y el pool completo", async () => {
    const email = correoDePrueba("ch-r1-maxwait")
    const registrar = () =>
      obtenerApp().inject({
        method: "POST",
        url: "/api/auth/registro",
        payload: {
          nombre: "Alumna Pool Ocupado",
          email,
          contrasena: `clave-${randomBytes(6).toString("hex")}`,
        },
      })
    try {
      const ocupado = await ocuparPool(CONEXIONES_DEL_POOL)
      const respuesta = await registrar()
      await ocupado.liberar()

      esServicioOcupado(respuesta)
      expect(encabezadoCookieRefresco(respuesta), "un 503 no entrega cookie").toBeUndefined()
      expect(await obtenerDb().usuario.count({ where: { email } })).toBe(0)

      const repetida = await registrar()
      expect(repetida.statusCode, repetida.body).toBe(201)
      expect(
        await poolCompleto(CONEXIONES_DEL_POOL),
        "una conexión se perdió tras el maxWait",
      ).toBe(true)
    } finally {
      await borrarUsuariosDePruebaPorCorreo([email])
    }
  }, 30_000)
})

describe("ataque (CHORE-02 r1): timeout, peticiones formadas detrás de una fila retenida más de 5 s", () => {
  it("POST /api/auth/registro-maestro con la fila del enlace retenida: 503, sin cuenta ni cookie; después 201", async () => {
    const enlace = await crearEnlace()
    const email = correoDePrueba("ch-r1-registro-maestro")
    const registrar = () =>
      obtenerApp().inject({
        method: "POST",
        url: "/api/auth/registro-maestro",
        payload: {
          nombre: "Maestra Fila Retenida",
          email,
          contrasena: `clave-${randomBytes(6).toString("hex")}`,
          token: enlace.token,
        },
      })

    const respuesta = unica(
      await conFilaRetenida({ tabla: "enlaces_registro", id: enlace.id }, [registrar], () =>
        esperar(RETENCION_MS),
      ),
    )

    esServicioOcupado(respuesta)
    expect(encabezadoCookieRefresco(respuesta)).toBeUndefined()
    expect(await obtenerDb().usuario.count({ where: { email } })).toBe(0)
    const repetida = await registrar()
    expect(repetida.statusCode, repetida.body).toBe(201)
  }, 30_000)

  it("POST /api/admin/enlaces-registro/:id/revocar con la fila retenida: 503 y el enlace sigue vivo; después 200 revocado", async () => {
    const enlace = await crearEnlace()
    const revocar = () =>
      obtenerApp().inject({
        method: "POST",
        url: `/api/admin/enlaces-registro/${enlace.id}/revocar`,
        headers: { authorization: `Bearer ${tokenAdmin}` },
      })

    const respuesta = unica(
      await conFilaRetenida({ tabla: "enlaces_registro", id: enlace.id }, [revocar], () =>
        esperar(RETENCION_MS),
      ),
    )

    esServicioOcupado(respuesta)
    const fila = await obtenerDb().enlaceRegistro.findUnique({
      where: { id: enlace.id },
      select: { revocadoEn: true },
    })
    expect(fila?.revocadoEn).toBeNull()
    const repetida = await revocar()
    expect(repetida.statusCode, repetida.body).toBe(200)
  }, 30_000)

  it("POST /api/admin/usuarios/:id/restablecer-contrasena con la fila retenida: 503 sin contraseña temporal ni cambios; después 200", async () => {
    const objetivo = await crearUsuarioDePrueba(idsUsuarios)
    const sesion = await crearSesionDePrueba({ usuarioId: objetivo.id, expiraEn: unDia() })
    const antes = await obtenerDb().usuario.findUnique({
      where: { id: objetivo.id },
      select: { hashContrasena: true, debeCambiarContrasena: true },
    })
    const restablecer = () =>
      obtenerApp().inject({
        method: "POST",
        url: `/api/admin/usuarios/${objetivo.id}/restablecer-contrasena`,
        headers: { authorization: `Bearer ${tokenAdmin}` },
      })

    const respuesta = unica(
      await conFilaRetenida({ tabla: "usuarios", id: objetivo.id }, [restablecer], () =>
        esperar(RETENCION_MS),
      ),
    )

    esServicioOcupado(respuesta)
    expect(respuesta.body).not.toContain("contrasenaTemporal")
    const despues = await obtenerDb().usuario.findUnique({
      where: { id: objetivo.id },
      select: { hashContrasena: true, debeCambiarContrasena: true },
    })
    expect(despues).toEqual(antes)
    expect(await contarSesionesVivas(objetivo.id)).toBe(1)
    expect(sesion.id).toBeTruthy()
    const repetida = await restablecer()
    expect(repetida.statusCode, repetida.body).toBe(200)
  }, 30_000)

  it("PUT /api/admin/usuarios/:id/correo con la fila retenida: 503, el correo y los tokens no cambian; después 200", async () => {
    const objetivo = await crearUsuarioDePrueba(idsUsuarios)
    const token = await crearTokenDePrueba({
      usuarioId: objetivo.id,
      tipo: "recuperacion",
      expiraEn: unDia(),
    })
    const nuevo = correoDePrueba("ch-r1-correo")
    const corregir = () =>
      obtenerApp().inject({
        method: "PUT",
        url: `/api/admin/usuarios/${objetivo.id}/correo`,
        headers: { authorization: `Bearer ${tokenAdmin}` },
        payload: { email: nuevo },
      })

    const respuesta = unica(
      await conFilaRetenida({ tabla: "usuarios", id: objetivo.id }, [corregir], () =>
        esperar(RETENCION_MS),
      ),
    )

    esServicioOcupado(respuesta)
    const fila = await obtenerDb().usuario.findUnique({
      where: { id: objetivo.id },
      select: { email: true },
    })
    expect(fila?.email).toBe(objetivo.email)
    const vivo = (await leerTokens(objetivo.id)).find((t) => t.id === token.id)
    expect(vivo?.revocadoEn).toBeNull()
    const repetida = await corregir()
    expect(repetida.statusCode, repetida.body).toBe(200)
  }, 30_000)

  it("POST /api/auth/establecer-contrasena con la fila del usuario retenida: 503, la invitación sigue viva; después 204", async () => {
    const invitado = await crearUsuarioDePrueba(idsUsuarios, { rol: "maestro" })
    const invitacion = await crearTokenDePrueba({
      usuarioId: invitado.id,
      tipo: "invitacion",
      expiraEn: unDia(),
    })
    const antes = await obtenerDb().usuario.findUnique({
      where: { id: invitado.id },
      select: { hashContrasena: true },
    })
    const establecer = () =>
      obtenerApp().inject({
        method: "POST",
        url: "/api/auth/establecer-contrasena",
        payload: { token: invitacion.token, contrasena: "contrasena-ch-r1-invitada" },
      })

    const respuesta = unica(
      await conFilaRetenida({ tabla: "usuarios", id: invitado.id }, [establecer], () =>
        esperar(RETENCION_MS),
      ),
    )

    esServicioOcupado(respuesta)
    const despues = await obtenerDb().usuario.findUnique({
      where: { id: invitado.id },
      select: { hashContrasena: true },
    })
    expect(despues?.hashContrasena).toBe(antes?.hashContrasena)
    const viva = (await leerTokens(invitado.id)).find((t) => t.id === invitacion.id)
    expect({ usadoEn: viva?.usadoEn, revocadoEn: viva?.revocadoEn }).toEqual({
      usadoEn: null,
      revocadoEn: null,
    })
    const repetida = await establecer()
    expect(repetida.statusCode, repetida.body).toBe(204)
  }, 30_000)

  it("POST /api/clases/:claseId/alumnos con la fila del alumno retenida: 503, sin inscripción ni movimiento; después 200", async () => {
    const maestro = await crearUsuarioDePrueba(idsUsuarios, { rol: "maestro" })
    const clase = await crearClaseDePrueba(idsClases, { maestroId: maestro.id })
    const alumno = await crearAlumnoDePrueba(idsUsuarios, { nombre: "Alumna Fila Retenida" })
    const tokenMaestro = await firmarTokenDePrueba({ usuarioId: maestro.id })
    const agregar = () =>
      obtenerApp().inject({
        method: "POST",
        url: `/api/clases/${clase.id}/alumnos`,
        headers: { authorization: `Bearer ${tokenMaestro}` },
        payload: { alumnoId: alumno.id },
      })

    const respuesta = unica(
      await conFilaRetenida({ tabla: "usuarios", id: alumno.id }, [agregar], () =>
        esperar(RETENCION_MS),
      ),
    )

    esServicioOcupado(respuesta)
    expect(await leerInscripcion(clase.id, alumno.id)).toBeNull()
    expect(await leerMovimientos(clase.id)).toHaveLength(0)
    const repetida = await agregar()
    expect(repetida.statusCode, repetida.body).toBe(200)
    expect(await leerInscripcion(clase.id, alumno.id)).not.toBeNull()
  }, 30_000)
})
