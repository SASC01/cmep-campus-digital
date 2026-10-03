import { randomBytes, randomUUID } from "node:crypto"
import fs from "node:fs"

import type { FastifyInstance, LightMyRequestResponse } from "fastify"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { inicializarAuth } from "../src/adapters/auth/index.js"
import { inicializarDb, obtenerDb } from "../src/adapters/db/cliente.js"
import { construirApp } from "../src/app.js"
import { opcionesDeAuth } from "../src/config/auth.js"
import { cargarEnv, type Env } from "../src/config/env.js"
import { normalizarParaBusqueda } from "../src/core/auth/normalizacion.js"
import { borrarUsuariosDePrueba, firmarTokenDePrueba } from "./ayudas-auth.js"
import {
  borrarMovimientosYClasesDePrueba,
  crearClaseDePrueba,
  idDelAdminDePrueba,
  inscribirDePrueba,
} from "./ayudas-clases.js"

// Ataque del Tester (CLASES-02a, ronda 1; PA-10 y punto 7): con LOG_LEVEL=trace, todo lo que pino
// escribe en los descriptores 1 y 2 se captura mientras el admin usa las rutas nuevas y las que se
// le abren (buscador de maestros con correo completo, roster con correos, buscador de alumnos,
// crear, asignar, retirar, errores 400/404/409). Ningún correo completo de un candidato, ningún
// token, encabezado de autorización ni hash puede aparecer en el log.

const idsUsuarios: string[] = []
const idsClases: string[] = []
let capturado = ""
const writeSyncOriginal = fs.writeSync
const writeOriginal = fs.write
const stdoutOriginal = process.stdout.write.bind(process.stdout)
const stderrOriginal = process.stderr.write.bind(process.stderr)

const aTexto = (dato: unknown): string => {
  if (typeof dato === "string") return dato
  if (dato instanceof Uint8Array) return Buffer.from(dato).toString("utf8")
  return ""
}

const capturar = (): void => {
  const writeSyncCapturado = (fd: number, dato: unknown, ...resto: unknown[]): number => {
    if (fd === 1 || fd === 2) {
      const texto = aTexto(dato)
      capturado += texto
      return Buffer.byteLength(texto)
    }
    return (writeSyncOriginal as (...a: unknown[]) => number)(fd, dato, ...resto)
  }
  const writeCapturado = (fd: number, dato: unknown, ...resto: unknown[]): void => {
    const retrollamada = resto.at(-1)
    if ((fd === 1 || fd === 2) && typeof retrollamada === "function") {
      const texto = aTexto(dato)
      capturado += texto
      ;(retrollamada as (e: null, n: number) => void)(null, Buffer.byteLength(texto))
      return
    }
    ;(writeOriginal as (...a: unknown[]) => void)(fd, dato, ...resto)
  }
  Object.assign(fs, { writeSync: writeSyncCapturado, write: writeCapturado })
  process.stdout.write = ((dato: unknown) => {
    capturado += aTexto(dato)
    return true
  }) as typeof process.stdout.write
  process.stderr.write = ((dato: unknown) => {
    capturado += aTexto(dato)
    return true
  }) as typeof process.stderr.write
}

const soltar = (): void => {
  Object.assign(fs, { writeSync: writeSyncOriginal, write: writeOriginal })
  process.stdout.write = stdoutOriginal
  process.stderr.write = stderrOriginal
}

const crearCuenta = async (
  nombre: string,
  rol: "estudiante" | "maestro",
): Promise<{ id: string; email: string; nombre: string }> => {
  const email = `l02a-r1-${randomUUID()}@pruebas.local`
  const { id } = await obtenerDb().usuario.create({
    data: {
      email,
      hashContrasena: "hash-secreto-que-no-debe-salir",
      nombre,
      nombreBusqueda: normalizarParaBusqueda(nombre),
      rol,
      estadoPago: "deudor",
    },
    select: { id: true },
  })
  idsUsuarios.push(id)
  return { id, email, nombre }
}

const correos: string[] = []
const estados: Record<string, number> = {}
let tokenAdmin = ""
let app: FastifyInstance | undefined

beforeAll(async () => {
  const base = cargarEnv()
  const env: Env = { ...base, LOG_LEVEL: "trace" }
  inicializarDb({ connectionString: base.DATABASE_URL })
  await inicializarAuth(opcionesDeAuth(base))
  const t = `qz${randomBytes(5).toString("hex")}`
  const maestroA = await crearCuenta(`Logs Maestra ${t}`, "maestro")
  const maestroB = await crearCuenta(`Logs Maestro ${t}`, "maestro")
  const maestroC = await crearCuenta(`Logs Tercero ${t}`, "maestro")
  const alumna = await crearCuenta(`Logs Alumna ${t}`, "estudiante")
  const candidata = await crearCuenta(`Logs Candidata ${t}`, "estudiante")
  correos.push(maestroA.email, maestroB.email, maestroC.email, alumna.email, candidata.email)
  const clase = await crearClaseDePrueba(idsClases, { maestroId: maestroA.id })
  await inscribirDePrueba(clase.id, alumna.id)
  tokenAdmin = await firmarTokenDePrueba({ usuarioId: await idDelAdminDePrueba() })
  const con = { authorization: `Bearer ${tokenAdmin}` }

  capturar()
  try {
    app = await construirApp({ env })
    await app.ready()
    const pedir = async (
      nombre: string,
      method: "GET" | "POST" | "PUT" | "DELETE",
      url: string,
      payload?: unknown,
    ): Promise<LightMyRequestResponse> => {
      if (!app) throw new Error("La aplicación no se construyó")
      const r = await app.inject({
        method,
        url,
        headers: con,
        ...(payload === undefined ? {} : { payload: payload as Record<string, unknown> }),
      })
      estados[nombre] = r.statusCode
      return r
    }
    await pedir("candidatos maestros", "GET", `/api/admin/maestros/candidatos?q=${t}`)
    await pedir("roster", "GET", `/api/clases/${clase.id}/alumnos`)
    await pedir("candidatos alumnos", "GET", `/api/clases/${clase.id}/alumnos/candidatos?q=${t}`)
    const creada = await pedir("crear", "POST", "/api/admin/clases", {
      nombre: `Logs ${t}`,
      maestroIds: [maestroA.id, maestroB.id],
    })
    if (creada.statusCode === 201) idsClases.push(creada.json<{ clase: { id: string } }>().clase.id)
    await pedir("crear con estudiante", "POST", "/api/admin/clases", {
      nombre: `Logs mal ${t}`,
      maestroIds: [alumna.id],
    })
    await pedir("crear con correo como id", "POST", "/api/admin/clases", {
      nombre: `Logs correo ${t}`,
      maestroIds: [maestroC.email],
    })
    await pedir("asignar", "POST", `/api/admin/clases/${clase.id}/maestros`, {
      maestroId: maestroB.id,
    })
    await pedir("asignar tope", "POST", `/api/admin/clases/${clase.id}/maestros`, {
      maestroId: maestroC.id,
    })
    await pedir("asignar con correo", "POST", `/api/admin/clases/${clase.id}/maestros`, {
      maestroId: maestroC.email,
    })
    await pedir("retirar", "DELETE", `/api/admin/clases/${clase.id}/maestros/${maestroB.id}`)
    await pedir("retirar único", "DELETE", `/api/admin/clases/${clase.id}/maestros/${maestroA.id}`)
    await pedir("alta", "POST", `/api/clases/${clase.id}/alumnos`, { alumnoId: candidata.id })
    await pedir("baja", "DELETE", `/api/clases/${clase.id}/alumnos/${candidata.id}`)
    await pedir("lista", "GET", "/api/admin/clases?limite=5")
    await pedir("editar", "PUT", `/api/admin/clases/${clase.id}`, { nombre: `Logs editada ${t}` })
  } finally {
    soltar()
  }
}, 120_000)

afterAll(async () => {
  await borrarMovimientosYClasesDePrueba(idsClases)
  await borrarUsuariosDePrueba(idsUsuarios)
  await app?.close()
})

describe("ataque CLASES-02a r1: logs de las rutas de gestión (PA-10)", () => {
  it("precondición: las peticiones respondieron lo esperado y el log a nivel trace las registró", () => {
    expect(estados).toEqual({
      "candidatos maestros": 200,
      roster: 200,
      "candidatos alumnos": 200,
      crear: 201,
      "crear con estudiante": 404,
      "crear con correo como id": 400,
      asignar: 200,
      "asignar tope": 409,
      "asignar con correo": 400,
      retirar: 200,
      "retirar único": 409,
      alta: 200,
      baja: 204,
      lista: 200,
      editar: 200,
    })
    expect(capturado).toContain("incoming request")
    expect(capturado).toContain("/api/admin/maestros/candidatos")
    expect(capturado.match(/"msg":"request completed"/g)?.length ?? 0).toBeGreaterThanOrEqual(15)
  })

  it("ningún correo completo (de los maestros del buscador, del roster, de la candidata ni el que se mandó como id), ningún token, encabezado Bearer ni hash aparece en el log", () => {
    const fugas = correos.filter((correo) => capturado.includes(correo))
    expect(fugas).toEqual([])
    expect(capturado).not.toContain(tokenAdmin)
    expect(capturado).not.toMatch(/Bearer\s/)
    expect(capturado).not.toContain("hash-secreto-que-no-debe-salir")
    expect(capturado).not.toContain("deudor")
  })
})
