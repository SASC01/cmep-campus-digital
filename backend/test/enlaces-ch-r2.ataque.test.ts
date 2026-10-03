import { randomBytes } from "node:crypto"

import { errorApiSchema } from "@campus/shared"
import type { FastifyInstance, LightMyRequestResponse } from "fastify"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { generarTokenDeEnlace } from "../src/adapters/auth/index.js"
import { obtenerDb } from "../src/adapters/db/cliente.js"
import { MENSAJE_SERVICIO_OCUPADO } from "../src/adapters/db/errores.js"
import { construirApp } from "../src/app.js"
import { cargarEnv } from "../src/config/env.js"
import {
  borrarUsuariosDePrueba,
  borrarUsuariosDePruebaPorCorreo,
  correoDePrueba,
  crearUsuarioDePrueba,
  firmarTokenDePrueba,
} from "./ayudas-auth.js"

// La medición viaja en task.meta, que el reporte JSON de Vitest incluye por caso.
declare module "vitest" {
  interface TaskMeta {
    medicion?: string
  }
}

// Ataque del Tester (CHORE-02, ronda 2): M-08 con la opción (i) (§E3-2). Las dos transacciones del
// enlace esperan conexión 10 s; las demás conservan los 2 s por defecto. Se mide:
// - durante una ráfaga de 40 registros del mismo enlace, que otras rutas (login de otra cuenta y
//   GET /api/me) respondan 2xx o 503 SERVICIO_OCUPADO, nunca 500, y su latencia (en task.meta,
//   visible en el reporte JSON de Vitest);
// - con el pool ocupado 3.5 s, que registro (por defecto) dé 503 y registro-maestro y revocar
//   esperen y respondan 201 y 200;
// - que una revocación en medio de la ráfaga no responda 500.
// La app registra en nivel "error": los P2028 que provoca a propósito no entran en el conteo de
// PA-07; un 500 sí saldría.

let app: FastifyInstance | undefined
const ids: string[] = []
const enlaces: string[] = []
const correos: string[] = []
let tokenAdmin = ""

const obtenerApp = (): FastifyInstance => {
  if (!app) throw new Error("La aplicación no se construyó en beforeAll")
  return app
}

const esperar = (ms: number): Promise<void> => new Promise((resolver) => setTimeout(resolver, ms))

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
  await obtenerDb().usuario.deleteMany({ where: { enlaceRegistroId: { in: enlaces } } })
  await borrarUsuariosDePruebaPorCorreo(correos)
  await borrarUsuariosDePrueba(ids)
  await obtenerDb().enlaceRegistro.deleteMany({ where: { id: { in: enlaces } } })
  await app?.close()
})

const crearEnlace = async (): Promise<{ id: string; token: string }> => {
  const { token, hash } = generarTokenDeEnlace()
  const { id } = await obtenerDb().enlaceRegistro.create({
    data: { hashToken: hash, expiraEn: new Date(Date.now() + 7 * 86_400_000) },
    select: { id: true },
  })
  enlaces.push(id)
  return { id, token }
}

const registrarMaestro = (token: string): Promise<LightMyRequestResponse> => {
  const email = correoDePrueba("ch-r2-rafaga")
  correos.push(email)
  return obtenerApp().inject({
    method: "POST",
    url: "/api/auth/registro-maestro",
    payload: {
      nombre: "Maestra Rafaga",
      email,
      contrasena: `clave-${randomBytes(6).toString("hex")}`,
      token,
    },
  })
}

// 2xx, o 503 con el cuerpo exacto de SERVICIO_OCUPADO; cualquier otra cosa se devuelve tal cual.
const clasificar = (respuesta: LightMyRequestResponse): string => {
  if (respuesta.statusCode >= 200 && respuesta.statusCode < 300) return "2xx"
  if (respuesta.statusCode !== 503) return `${String(respuesta.statusCode)} ${respuesta.body}`
  const cuerpo = errorApiSchema.safeParse(respuesta.json())
  const esOcupado =
    cuerpo.success &&
    cuerpo.data.error.codigo === "SERVICIO_OCUPADO" &&
    cuerpo.data.error.mensaje === MENSAJE_SERVICIO_OCUPADO
  return esOcupado ? "503 SERVICIO_OCUPADO" : `503 ${respuesta.body}`
}

const medir = async (
  peticion: () => Promise<LightMyRequestResponse>,
): Promise<{ respuesta: LightMyRequestResponse; ms: number }> => {
  const inicio = Date.now()
  const respuesta = await peticion()
  return { respuesta, ms: Date.now() - inicio }
}

// Ocupa n conexiones del pool hasta que se liberen.
const ocuparPool = async (n: number): Promise<() => Promise<void>> => {
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
  return async () => {
    abrir()
    await Promise.all(transacciones)
  }
}

describe("ataque (CHORE-02 r2): M-08 (i), otras rutas durante la ráfaga del enlace", () => {
  it("durante 40 registros simultáneos del mismo enlace, login de otra cuenta y GET /api/me responden 2xx o 503 SERVICIO_OCUPADO, nunca 500", async ({
    task,
  }) => {
    const enlace = await crearEnlace()
    const otra = await crearUsuarioDePrueba(ids)
    const tokenOtra = await firmarTokenDePrueba({ usuarioId: otra.id })
    const inicio = Date.now()

    const rafaga = Promise.all(Array.from({ length: 40 }, () => registrarMaestro(enlace.token)))
    // A mitad de la ráfaga (cuando ya hay registros formados en la fila del enlace).
    await esperar(300)
    const [login, me] = await Promise.all([
      medir(() =>
        obtenerApp().inject({
          method: "POST",
          url: "/api/auth/login",
          remoteAddress: "10.77.0.1",
          payload: { email: otra.email, contrasena: otra.contrasena },
        }),
      ),
      medir(() =>
        obtenerApp().inject({
          method: "GET",
          url: "/api/me",
          headers: { authorization: `Bearer ${tokenOtra}` },
        }),
      ),
    ])
    const registros = await rafaga
    const duracionRafaga = Date.now() - inicio

    const conteo: Record<string, number> = {}
    for (const r of registros) conteo[clasificar(r)] = (conteo[clasificar(r)] ?? 0) + 1
    task.meta.medicion = JSON.stringify({
      duracionRafagaMs: duracionRafaga,
      registros: conteo,
      login: { desenlace: clasificar(login.respuesta), ms: login.ms },
      me: { desenlace: clasificar(me.respuesta), ms: me.ms },
    })

    const permitidos = ["2xx", "503 SERVICIO_OCUPADO"]
    expect(
      {
        login: permitidos.includes(clasificar(login.respuesta)),
        me: permitidos.includes(clasificar(me.respuesta)),
      },
      String(task.meta.medicion),
    ).toEqual({ login: true, me: true })
    expect(conteo, String(task.meta.medicion)).toEqual({ "2xx": 40 })
  }, 120_000)

  it("una revocación en medio de la ráfaga responde 200 (nunca 500) y ningún registro posterior a ella crea cuenta", async () => {
    const enlace = await crearEnlace()
    const antes = Array.from({ length: 20 }, () => registrarMaestro(enlace.token))
    await esperar(150)
    const revocacion = obtenerApp().inject({
      method: "POST",
      url: `/api/admin/enlaces-registro/${enlace.id}/revocar`,
      headers: { authorization: `Bearer ${tokenAdmin}` },
    })
    const despues = Array.from({ length: 20 }, () => registrarMaestro(enlace.token))
    const [respuestaRevocacion, ...registros] = await Promise.all([
      revocacion,
      ...antes,
      ...despues,
    ])
    if (!respuestaRevocacion) throw new Error("Precondición: la revocación no respondió")

    expect(respuestaRevocacion.statusCode, respuestaRevocacion.body).toBe(200)
    const estados = registros.map((r) => r.statusCode)
    expect(
      estados.every((e) => e === 201 || e === 400),
      `estados: ${JSON.stringify(estados)}`,
    ).toBe(true)
    const fila = await obtenerDb().enlaceRegistro.findUnique({
      where: { id: enlace.id },
      select: { revocadoEn: true },
    })
    const revocadoEn = fila?.revocadoEn?.getTime() ?? Number.NEGATIVE_INFINITY
    const posteriores = await obtenerDb().usuario.count({
      where: { enlaceRegistroId: enlace.id, creadoEn: { gt: new Date(revocadoEn) } },
    })
    expect(posteriores).toBe(0)
    expect(await obtenerDb().usuario.count({ where: { enlaceRegistroId: enlace.id } })).toBe(
      estados.filter((e) => e === 201).length,
    )
  }, 120_000)
})

describe("ataque (CHORE-02 r2): M-08 (i), los 10 s de espera solo valen para el enlace", () => {
  it("con el pool ocupado 3.5 s: registro de alumno (2 s por defecto) responde 503; registro-maestro y revocar esperan y responden 201 y 200", async ({
    task,
  }) => {
    const enlaceRegistro = await crearEnlace()
    const enlaceRevocar = await crearEnlace()
    const emailAlumno = correoDePrueba("ch-r2-alumno")
    correos.push(emailAlumno)

    const liberar = await ocuparPool(10)
    const pendientes = Promise.all([
      medir(() =>
        obtenerApp().inject({
          method: "POST",
          url: "/api/auth/registro",
          payload: {
            nombre: "Alumna Pool",
            email: emailAlumno,
            contrasena: `clave-${randomBytes(6).toString("hex")}`,
          },
        }),
      ),
      medir(() => registrarMaestro(enlaceRegistro.token)),
      medir(() =>
        obtenerApp().inject({
          method: "POST",
          url: `/api/admin/enlaces-registro/${enlaceRevocar.id}/revocar`,
          headers: { authorization: `Bearer ${tokenAdmin}` },
        }),
      ),
    ])
    await esperar(3_500)
    await liberar()
    const [alumno, maestro, revocar] = await pendientes
    task.meta.medicion = JSON.stringify({
      alumno: { estado: alumno.respuesta.statusCode, ms: alumno.ms },
      maestro: { estado: maestro.respuesta.statusCode, ms: maestro.ms },
      revocar: { estado: revocar.respuesta.statusCode, ms: revocar.ms },
    })

    expect(
      {
        alumno: clasificar(alumno.respuesta),
        maestro: maestro.respuesta.statusCode,
        revocar: revocar.respuesta.statusCode,
      },
      String(task.meta.medicion),
    ).toEqual({ alumno: "503 SERVICIO_OCUPADO", maestro: 201, revocar: 200 })
  }, 60_000)
})
