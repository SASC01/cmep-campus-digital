import { randomUUID } from "node:crypto"

import { nombreSchema } from "@campus/shared"
import type { FastifyInstance } from "fastify"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { construirApp } from "../src/app.js"
import { derivarTokenDeCuenta, hashDeContrasenaInutilizable } from "../src/adapters/auth/index.js"
import { obtenerDb, type Ejecutor, type EjecutorSql } from "../src/adapters/db/cliente.js"
import {
  CLAVE_BLOQUEO_INVITACIONES_EN_LOTE,
  invitarMaestrosEnLote,
  type CandidatoParaInvitarEnLote,
} from "../src/adapters/db/invitaciones.js"
import { encolarVarios } from "../src/adapters/queue/index.js"
import { cargarEnv } from "../src/config/env.js"
import { evaluarCupo, VENTANA_CUPO_MS } from "../src/core/auth/invitacion-masiva.js"
import { COLA_CORREO_DE_CUENTA } from "../src/core/eventos/correo-de-cuenta.js"
import { correoDePrueba, crearUsuarioDePrueba, firmarTokenDePrueba } from "./ayudas-auth.js"
import { pedirComoAdmin } from "./ayudas-cuentas.js"

// AUTH-03c, §D-C3: POST /api/admin/maestros/lote (invitación masiva).

let app: FastifyInstance
// T-13 (ronda 1): "lista mixta" y "las cuentas nacen como maestro…" no prueban el cupo; con el
// límite por defecto (80) de la app normal, un archivo paralelo que cree 78 invitaciones o más en
// la misma ventana de 24 h les provoca un 409 real. Usan esta app aparte, con el límite máximo que
// admite la variable (10,000), para que el cupo compartido de la suite nunca les alcance, sin
// importar cuánto usen los demás archivos en paralelo.
let appAltoLimite: FastifyInstance
const ids: string[] = []
const correosDePrueba: string[] = []
let tokenAdmin: string

beforeAll(async () => {
  app = await construirApp({ env: cargarEnv() })
  await app.ready()
  const email = process.env.ADMIN_EMAIL
  const contrasena = process.env.ADMIN_PASSWORD
  if (!email || !contrasena) {
    throw new Error("Faltan ADMIN_EMAIL/ADMIN_PASSWORD en el entorno de pruebas")
  }
  const sesion = await pedirComoAdmin(app, { email, contrasena })
  tokenAdmin = sesion.tokenAcceso
  appAltoLimite = await appConLimite(10_000)
})

afterAll(async () => {
  await obtenerDb().usuario.deleteMany({ where: { email: { in: correosDePrueba } } })
  await borrarUsuariosDePruebaIds(ids)
  await app.close()
})

// Igual que borrarUsuariosDePrueba de ayudas-auth.ts, repetido aquí para no reimportarla dos veces
// con el mismo nombre en este archivo (se usa un nombre distinto por claridad de lectura).
const borrarUsuariosDePruebaIds = async (idsPropios: readonly string[]): Promise<void> => {
  if (idsPropios.length === 0) return
  await obtenerDb().usuario.deleteMany({ where: { id: { in: [...idsPropios] } } })
}

const enviarLote = (lista: string, token: string = tokenAdmin, app2: FastifyInstance = app) =>
  app2.inject({
    method: "POST",
    url: "/api/admin/maestros/lote",
    headers: { authorization: `Bearer ${token}` },
    payload: { lista },
  })

const contarUsadasEnVentana = (): Promise<number> => {
  const desde = new Date(Date.now() - VENTANA_CUPO_MS)
  return obtenerDb().tokenCuenta.count({ where: { tipo: "invitacion", creadoEn: { gte: desde } } })
}

// Igual que el patrón ya usado en middleware-orden.integracion.test.ts: una app de más, con su
// propio límite diario, nunca se cierra (su onClose desconectaría el cliente y la cola
// compartidos). El cupo diario es la única diferencia de configuración: el resto (base de datos,
// cola, JWT_SECRET) es el mismo entorno.
const appConLimite = async (limite: number): Promise<FastifyInstance> => {
  const otra = await construirApp({ env: { ...cargarEnv(), INVITACIONES_LIMITE_DIARIO: limite } })
  await otra.ready()
  return otra
}

const listaDeCorreos = (
  cantidad: number,
  prefijo: string,
): { texto: string; correos: string[] } => {
  const correos = Array.from({ length: cantidad }, () => correoDePrueba(prefijo))
  return { texto: correos.join("\n"), correos }
}

describe("POST /api/admin/maestros/lote", () => {
  it("lista mixta: válidas, ya existentes de los tres roles, inválidas y repetidas", async () => {
    const estudiante = await crearUsuarioDePrueba(ids, { rol: "estudiante" })
    const maestro = await crearUsuarioDePrueba(ids, { rol: "maestro" })
    const correoAdmin = process.env.ADMIN_EMAIL as string

    const nuevaConNombre = correoDePrueba("lote-mixta-a")
    const otraConNombre = correoDePrueba("lote-mixta-b")
    const sinNombre = correoDePrueba("lote-mixta-c")
    correosDePrueba.push(nuevaConNombre, otraConNombre, sinNombre)

    const lineas = [
      `${nuevaConNombre},Ana Primera`, // línea 1
      `${otraConNombre},Beto Segundo`, // línea 2
      sinNombre, // línea 3, sin nombre → provisional
      estudiante.email, // línea 4, ya existe (estudiante)
      maestro.email, // línea 5, ya existe (maestro)
      correoAdmin, // línea 6, ya existe (admin)
      "no-es-un-correo", // línea 7, inválida
      nuevaConNombre, // línea 8, repetida
    ]

    const respuesta = await enviarLote(lineas.join("\n"), tokenAdmin, appAltoLimite)
    expect(respuesta.statusCode).toBe(200)
    const cuerpo = respuesta.json<{
      enviadas: { email: string; nombre: string | null }[]
      yaExistentes: { linea: number; email: string }[]
      invalidas: { linea: number; texto: string; motivo: string }[]
    }>()

    expect(cuerpo.enviadas).toEqual([
      { email: nuevaConNombre, nombre: "Ana Primera" },
      { email: otraConNombre, nombre: "Beto Segundo" },
      { email: sinNombre, nombre: null },
    ])
    expect(cuerpo.yaExistentes).toEqual(
      expect.arrayContaining([
        { linea: 4, email: estudiante.email },
        { linea: 5, email: maestro.email },
        { linea: 6, email: correoAdmin },
      ]),
    )
    expect(cuerpo.yaExistentes).toHaveLength(3)
    expect(cuerpo.invalidas).toEqual([
      { linea: 7, texto: "no-es-un-correo", motivo: "correo_invalido" },
      { linea: 8, texto: nuevaConNombre, motivo: "repetido" },
    ])
  })

  it("las cuentas nacen como maestro, con un hash inutilizable compartido y un token de invitación cada una, encolado en pgboss.job", async () => {
    const { texto, correos } = listaDeCorreos(2, "lote-hash")
    correosDePrueba.push(...correos)

    const respuesta = await enviarLote(texto, tokenAdmin, appAltoLimite)
    expect(respuesta.statusCode).toBe(200)

    const cuentas = await obtenerDb().usuario.findMany({
      where: { email: { in: correos } },
      select: { id: true, rol: true, hashContrasena: true, nombre: true },
    })
    expect(cuentas).toHaveLength(2)
    for (const cuenta of cuentas) {
      expect(cuenta.rol).toBe("maestro")
      // M-07: el nombre provisional (parte local del correo) siempre pasa nombreSchema.
      expect(nombreSchema.safeParse(cuenta.nombre).success).toBe(true)
    }
    expect(new Set(cuentas.map((cuenta) => cuenta.hashContrasena)).size).toBe(1)

    const tokens = await obtenerDb().tokenCuenta.findMany({
      where: { usuarioId: { in: cuentas.map((cuenta) => cuenta.id) } },
      select: { id: true, tipo: true },
    })
    expect(tokens).toHaveLength(2)
    expect(tokens.every((token) => token.tipo === "invitacion")).toBe(true)

    const trabajos = await obtenerDb().$queryRaw<
      { id: string; retry_limit: number; dead_letter: string | null }[]
    >`
      SELECT id, retry_limit, dead_letter FROM pgboss.job
      WHERE name = ${COLA_CORREO_DE_CUENTA} AND id IN (${tokens[0]?.id}::uuid, ${tokens[1]?.id}::uuid)
    `
    expect(trabajos).toHaveLength(2)
    for (const trabajo of trabajos) {
      expect(trabajo.retry_limit).toBe(3)
      expect(trabajo.dead_letter).not.toBeNull()
      expect(tokens.some((token) => token.id === trabajo.id)).toBe(true)
    }
  })

  it("lista sin candidatos (solo inválidas) → 200 sin transacción", async () => {
    const respuesta = await enviarLote("no-es-un-correo\n;;;")
    expect(respuesta.statusCode).toBe(200)
    const cuerpo = respuesta.json<{ enviadas: unknown[]; yaExistentes: unknown[] }>()
    expect(cuerpo.enviadas).toEqual([])
    expect(cuerpo.yaExistentes).toEqual([])
  })

  it("las existentes no consumen cupo", async () => {
    const existente = await crearUsuarioDePrueba(ids, { rol: "maestro" })
    const usadas = await contarUsadasEnVentana()
    const app2 = await appConLimite(usadas)

    const respuesta = await enviarLote(existente.email, tokenAdmin, app2)
    expect(respuesta.statusCode).toBe(200)
    const cuerpo = respuesta.json<{
      enviadas: unknown[]
      yaExistentes: { linea: number; email: string }[]
    }>()
    expect(cuerpo.enviadas).toEqual([])
    expect(cuerpo.yaExistentes).toEqual([{ linea: 1, email: existente.email }])
  })

  // Las pruebas de cupo de aquí en adelante llaman a invitarMaestrosEnLote directamente (no por
  // HTTP) con un evaluarCupoDelLote que fija el límite en relación con el "usadas" que la propia
  // función lee en su transacción, no con un conteo leído antes. Así "restantes" da siempre el
  // margen pedido, sin importar cuántas invitaciones hayan creado en paralelo otros archivos de la
  // suite entre leer el conteo y usarlo (T-05/PA-12: las pruebas del cupo deben ser deterministas
  // sin importar lo que hagan los demás archivos, `reporte-tester.md`, "AUTH-03c — Ronda 0").
  const candidatoDePrueba = async (prefijo: string): Promise<CandidatoParaInvitarEnLote> => {
    const email = correoDePrueba(prefijo)
    correosDePrueba.push(email)
    return {
      usuario: {
        id: randomUUID(),
        nombre: `Prueba ${prefijo}`,
        nombreBusqueda: `prueba ${prefijo}`,
        email,
        hashContrasena: await hashDeContrasenaInutilizable(),
        rol: "maestro",
      },
      token: {
        id: randomUUID(),
        hashToken: derivarTokenDeCuenta(randomUUID()).hash,
        expiraEn: new Date(Date.now() + 3600_000),
      },
    }
  }

  it("cupo exacto → 200", async () => {
    const margen = 2
    const candidatos = await Promise.all([
      candidatoDePrueba("cupo-exacto-a"),
      candidatoDePrueba("cupo-exacto-b"),
    ])
    const resultado = await invitarMaestrosEnLote(
      { candidatos, desde: new Date(0) },
      (usadas, solicitadas) => evaluarCupo({ limite: usadas + margen, usadas, solicitadas }),
      async () => {},
    )
    expect(resultado.insertados).toHaveLength(margen)
  })

  it("uno más que el cupo → 409, sin crear nada ni encolar nada", async () => {
    const margen = 2
    const candidatos = await Promise.all([
      candidatoDePrueba("cupo-excedido-a"),
      candidatoDePrueba("cupo-excedido-b"),
      candidatoDePrueba("cupo-excedido-c"),
    ])
    let seLlamoAlGuardar = false
    // alGuardar real (encolarVarios), no un vacío: si por error se llegara a llamar, dejaría
    // trabajos reales en pgboss.job, que la aserción de abajo detectaría.
    const alGuardarReal = async (sql: EjecutorSql, idsDeTokens: string[]): Promise<void> => {
      seLlamoAlGuardar = true
      await encolarVarios(
        COLA_CORREO_DE_CUENTA,
        idsDeTokens.map((id) => ({ id, datos: { tipo: "invitacion" as const } })),
        { sql },
      )
    }

    await expect(
      invitarMaestrosEnLote(
        { candidatos, desde: new Date(0) },
        (usadas, solicitadas) => evaluarCupo({ limite: usadas + margen, usadas, solicitadas }),
        alGuardarReal,
      ),
    ).rejects.toMatchObject({ codigo: "CUPO_DIARIO_INSUFICIENTE" })

    expect(seLlamoAlGuardar).toBe(false)

    const emails = candidatos.map((candidato) => candidato.usuario.email)
    const cuentas = await obtenerDb().usuario.findMany({ where: { email: { in: emails } } })
    expect(cuentas).toHaveLength(0)

    const idsDeTokens = candidatos.map((candidato) => candidato.token.id)
    const tokens = await obtenerDb().tokenCuenta.findMany({
      where: { id: { in: idsDeTokens } },
    })
    expect(tokens).toHaveLength(0)

    const trabajos = await obtenerDb().$queryRaw<{ id: string }[]>`
      SELECT id FROM pgboss.job
      WHERE id IN (${idsDeTokens[0]}::uuid, ${idsDeTokens[1]}::uuid, ${idsDeTokens[2]}::uuid)
    `
    expect(trabajos).toHaveLength(0)
  })

  it("dos lotes evaluados con márgenes independientes: uno con margen para pasar, el otro sin margen para quedarse sin cupo", async () => {
    // Retitulado en la corrección 2 de la ronda 1 (arbitraje del manager): esta prueba NO comprueba
    // que B vea lo que A confirmó (eso lo hace el caso de abajo, con una ventana propia). Con
    // margen 0, B se queda sin cupo siempre, la haya llamado A antes o no; el título anterior
    // ("...ve el cupo ya consumido") afirmaba una propiedad causal que esta prueba no verifica. Lo
    // que sí comprueba, de verdad: dos llamadas independientes, cada una con su propio margen
    // reactivo sobre el "usadas" que lee en su momento, sin depender la una de la otra ni de lo que
    // hagan los demás archivos de la suite.
    const candidatoA = await candidatoDePrueba("lote-en-serie-a")
    const resultadoA = await invitarMaestrosEnLote(
      { candidatos: [candidatoA], desde: new Date(0) },
      (usadas, solicitadas) => evaluarCupo({ limite: usadas + 1, usadas, solicitadas }),
      async () => {},
    )
    expect(resultadoA.insertados).toHaveLength(1)

    const candidatoB = await candidatoDePrueba("lote-en-serie-b")
    await expect(
      invitarMaestrosEnLote(
        { candidatos: [candidatoB], desde: new Date(0) },
        (usadas, solicitadas) => evaluarCupo({ limite: usadas, usadas, solicitadas }),
        async () => {},
      ),
    ).rejects.toMatchObject({ codigo: "CUPO_DIARIO_INSUFICIENTE" })
  })

  it("dos lotes lanzados a la vez quedan en serie: el segundo, formado detrás del bloqueo, ve el cupo que confirmó el primero (M-04)", async () => {
    // Corrección 2 de la ronda 1 (arbitraje del manager): la versión anterior evaluaba con
    // `limite: usadas` (margen 0), así que la llamada formada detrás del bloqueo consultivo
    // recibía 409 SIEMPRE, viera o no lo que la retenedora había confirmado. Eso la volvía
    // determinista sin importar lo que hicieran otros archivos, pero a costa de dejar de probar la
    // propiedad: una regresión que sacara el `count` de `invitarMaestrosEnLote` de abajo del
    // bloqueo consultivo habría pasado igual con los dos casos en verde.
    //
    // Aquí, en vez de un límite fijo o reactivo sobre el conteo GLOBAL (que sube y baja con lo que
    // hagan otros archivos), la prueba abre su propia ventana de tiempo, en el futuro, donde no cae
    // ningún token real de ningún otro archivo de la suite (todos usan "ahora", nunca el año 2100):
    // - la llamada real cuenta "usadas" solo desde esa ventana (`desde: ventanaPropia`), con
    //   `limite: 1`;
    // - la transacción retenedora, antes de soltar el bloqueo (y ya confirmado con
    //   `pg_blocking_pids` que la llamada real quedó formada detrás), inserta a mano un token de
    //   invitación con `creadoEn` puesto exactamente en esa ventana.
    // Si la llamada real cuenta ese token (porque su `count` corre, como debe ser, después de
    // obtener el bloqueo), ve `usadas = 1` y se queda sin cupo (`limite: 1`): 409. Si por una
    // regresión contara antes del bloqueo, no lo vería (`usadas = 0` en ese instante) y pasaría con
    // 200: el caso fallaría. Lo comprobé de verdad simulando ese defecto y revirtiéndolo (ver el
    // resumen del programador, "AUTH-03c — Corrección 2 de la ronda 1").
    const ventanaPropia = new Date("2100-01-01T00:00:00.000Z")
    const candidato = await candidatoDePrueba("serie-bloqueo")
    const usuarioDelTokenRetenedor = await crearUsuarioDePrueba(ids, { rol: "maestro" })

    let promesaLote: ReturnType<typeof invitarMaestrosEnLote> | undefined
    let seResolvioMientrasBloqueado = false

    await obtenerDb().$transaction(async (txRetenedora) => {
      await txRetenedora.$executeRaw`SELECT pg_advisory_xact_lock(${CLAVE_BLOQUEO_INVITACIONES_EN_LOTE})`
      const [propio] = await txRetenedora.$queryRaw<{ pid: number }[]>`
        SELECT pg_backend_pid() AS pid
      `
      if (!propio) {
        throw new Error("Precondición: no se obtuvo el pid de la transacción retenedora")
      }

      promesaLote = invitarMaestrosEnLote(
        { candidatos: [candidato], desde: ventanaPropia },
        (usadas, solicitadas) => evaluarCupo({ limite: 1, usadas, solicitadas }),
        async () => {},
      )
      // Maneja las dos ramas de inmediato (aunque el resultado real se observe después, con
      // `expect(promesaLote).rejects...`, fuera de esta transacción): así Node no la marca como un
      // rechazo sin manejar mientras la promesa sigue formada detrás del bloqueo.
      promesaLote.then(
        () => {
          seResolvioMientrasBloqueado = true
        },
        () => {
          seResolvioMientrasBloqueado = true
        },
      )

      const detrasDelBloqueo = async (): Promise<boolean> => {
        const [fila] = await obtenerDb().$queryRaw<{ n: number }[]>`
          SELECT count(*)::int AS n FROM pg_stat_activity
          WHERE ${propio.pid}::int = ANY(pg_blocking_pids(pid))
        `
        return (fila?.n ?? 0) >= 1
      }

      const limite = Date.now() + 10_000
      let formada = false
      while (!formada && !seResolvioMientrasBloqueado && Date.now() < limite) {
        formada = await detrasDelBloqueo()
        if (!formada) await new Promise((resolve) => setTimeout(resolve, 25))
      }
      expect(
        formada || seResolvioMientrasBloqueado,
        "Precondición: la llamada no llegó al bloqueo consultivo en 10 s",
      ).toBe(true)
      expect(
        seResolvioMientrasBloqueado,
        "no debería resolverse mientras el bloqueo sigue tomado",
      ).toBe(false)

      // Confirma, bajo el bloqueo, el único token de la ventana propia de este caso.
      await txRetenedora.tokenCuenta.create({
        data: {
          id: randomUUID(),
          usuarioId: usuarioDelTokenRetenedor.id,
          tipo: "invitacion",
          hashToken: derivarTokenDeCuenta(randomUUID()).hash,
          expiraEn: new Date(ventanaPropia.getTime() + 3_600_000),
          creadoEn: ventanaPropia,
        },
        select: { id: true },
      })
    })

    // Al salir de $transaction, Prisma hace COMMIT y pg_advisory_xact_lock se libera: la llamada,
    // ya formada detrás, obtiene el bloqueo y SOLO ENTONCES cuenta "usadas" en su ventana propia,
    // así que ve el token que la retenedora acaba de confirmar.
    await expect(promesaLote).rejects.toMatchObject({ codigo: "CUPO_DIARIO_INSUFICIENTE" })

    const cuenta = await obtenerDb().usuario.findUnique({
      where: { email: candidato.usuario.email },
    })
    expect(cuenta).toBeNull()
  })

  it("un correo creado por otra transacción entre la lectura y la inserción se reporta como existente, sin 5xx", async () => {
    const email = correoDePrueba("carrera-insercion")
    correosDePrueba.push(email)

    const candidato: CandidatoParaInvitarEnLote = {
      usuario: {
        id: randomUUID(),
        nombre: "Carrera Insercion",
        nombreBusqueda: "carrera insercion",
        email,
        hashContrasena: await hashDeContrasenaInutilizable(),
        rol: "maestro",
      },
      token: {
        id: randomUUID(),
        hashToken: derivarTokenDeCuenta(randomUUID()).hash,
        expiraEn: new Date(Date.now() + 3600_000),
      },
    }

    const clientePrisma = obtenerDb()
    let interceptado = false

    // Envuelve el usuario real de la transacción para insertar, justo después de que ella lea los
    // correos existentes, un usuario ganador con el mismo correo, desde una transacción real
    // aparte (clientePrisma, fuera de tx). Simula la carrera de §D-C3, paso 6.
    const conBind = (objetivo: object, propiedad: string | symbol) => {
      const valor = Reflect.get(objetivo, propiedad, objetivo) as unknown
      return typeof valor === "function" ? valor.bind(objetivo) : valor
    }

    const ejecutorConCarrera = {
      $transaction: (fn: (tx: unknown) => Promise<unknown>) =>
        clientePrisma.$transaction(async (tx) => {
          const usuarioReal = tx.usuario
          const usuarioConGancho = new Proxy(usuarioReal, {
            get(objetivo, propiedad) {
              if (propiedad === "findMany" && !interceptado) {
                interceptado = true
                const original = objetivo.findMany.bind(objetivo)
                return async (...args: unknown[]) => {
                  const resultado: unknown = await original(...args)
                  await clientePrisma.usuario.create({
                    data: {
                      email,
                      hashContrasena: candidato.usuario.hashContrasena,
                      nombre: "Carrera externa",
                      nombreBusqueda: "carrera externa",
                      rol: "maestro",
                    },
                    select: { id: true },
                  })
                  return resultado
                }
              }
              return conBind(objetivo, propiedad)
            },
          })
          const txConGancho = new Proxy(tx as object, {
            get(objetivo, propiedad) {
              if (propiedad === "usuario") return usuarioConGancho
              return conBind(objetivo, propiedad)
            },
          })
          return fn(txConGancho)
        }),
    } as unknown as Ejecutor

    const resultado = await invitarMaestrosEnLote(
      { candidatos: [candidato], desde: new Date(0) },
      () => null,
      async () => {},
      ejecutorConCarrera,
    )

    expect(resultado.insertados).toEqual([])
    expect(resultado.existentes).toEqual([email])
  })

  it("rollback de alGuardar → nada creado", async () => {
    const email = correoDePrueba("rollback-alguardar")
    const candidato: CandidatoParaInvitarEnLote = {
      usuario: {
        id: randomUUID(),
        nombre: "Rollback Alguardar",
        nombreBusqueda: "rollback alguardar",
        email,
        hashContrasena: await hashDeContrasenaInutilizable(),
        rol: "maestro",
      },
      token: {
        id: randomUUID(),
        hashToken: derivarTokenDeCuenta(randomUUID()).hash,
        expiraEn: new Date(Date.now() + 3600_000),
      },
    }

    await expect(
      invitarMaestrosEnLote(
        { candidatos: [candidato], desde: new Date(0) },
        () => null,
        async () => {
          throw new Error("fallo deliberado en alGuardar")
        },
      ),
    ).rejects.toThrow("fallo deliberado en alGuardar")

    const cuenta = await obtenerDb().usuario.findUnique({ where: { email } })
    expect(cuenta).toBeNull()
    const token = await obtenerDb().tokenCuenta.findUnique({ where: { id: candidato.token.id } })
    expect(token).toBeNull()
  })
})

describe("autorización de POST /api/admin/maestros/lote", () => {
  const cuerpoValido = { lista: correoDePrueba("autorizacion-lote") }

  it("sin token → 401", async () => {
    const respuesta = await app.inject({
      method: "POST",
      url: "/api/admin/maestros/lote",
      payload: cuerpoValido,
    })
    expect(respuesta.statusCode).toBe(401)
  })

  it("un estudiante → 403 ROL_NO_PERMITIDO", async () => {
    const estudiante = await crearUsuarioDePrueba(ids, { rol: "estudiante" })
    const token = await firmarTokenDePrueba({ usuarioId: estudiante.id })
    const respuesta = await enviarLote(cuerpoValido.lista, token)
    expect(respuesta.statusCode).toBe(403)
    expect(respuesta.json<{ error: { codigo: string } }>().error.codigo).toBe("ROL_NO_PERMITIDO")
  })

  it("un maestro → 403 ROL_NO_PERMITIDO", async () => {
    const maestro = await crearUsuarioDePrueba(ids, { rol: "maestro" })
    const token = await firmarTokenDePrueba({ usuarioId: maestro.id })
    const respuesta = await enviarLote(cuerpoValido.lista, token)
    expect(respuesta.statusCode).toBe(403)
  })

  it("un estudiante restringido → 403 ACCESO_RESTRINGIDO", async () => {
    const restringido = await crearUsuarioDePrueba(ids, {
      rol: "estudiante",
      accesoRestringido: true,
    })
    const token = await firmarTokenDePrueba({ usuarioId: restringido.id })
    const respuesta = await enviarLote(cuerpoValido.lista, token)
    expect(respuesta.statusCode).toBe(403)
    expect(respuesta.json<{ error: { codigo: string } }>().error.codigo).toBe("ACCESO_RESTRINGIDO")
  })

  it("una cuenta con cambio pendiente → 403 CAMBIO_DE_CONTRASENA_REQUERIDO", async () => {
    const conCambioPendiente = await crearUsuarioDePrueba(ids, {
      rol: "maestro",
      debeCambiarContrasena: true,
    })
    const token = await firmarTokenDePrueba({ usuarioId: conCambioPendiente.id })
    const respuesta = await enviarLote(cuerpoValido.lista, token)
    expect(respuesta.statusCode).toBe(403)
    expect(respuesta.json<{ error: { codigo: string } }>().error.codigo).toBe(
      "CAMBIO_DE_CONTRASENA_REQUERIDO",
    )
  })

  it("el admin puede", async () => {
    correosDePrueba.push(cuerpoValido.lista)
    const respuesta = await enviarLote(cuerpoValido.lista)
    expect(respuesta.statusCode).toBeLessThan(500)
    expect(respuesta.statusCode).not.toBe(401)
    expect(respuesta.statusCode).not.toBe(403)
  })
})
