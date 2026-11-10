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
import { archivarClaseDePrueba } from "./ayudas-clases-archivadas.js"
import {
  borrarMovimientosYClasesDePrueba,
  crearClaseDePrueba,
  idDelAdminDePrueba,
} from "./ayudas-clases.js"

// ADMIN-01e (ADM-1E22, M-09, §D-7.11; y la parte de los logs de ADM-1E07). Con LOG_LEVEL=trace se
// captura todo lo que pino escribe (descriptores 1 y 2, como logs-02a-r1) mientras el admin pide las
// listas con estado de pago, nombres y cursores en la consulta y da de alta a un alumno. El log
// registra cada ruta sin su cadena de consulta y nunca la contraseña temporal.

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

interface Pedida {
  nombre: string
  method: "GET" | "POST"
  url: string
  estado: number
}

const pedidas: Pedida[] = []
// Todo lo que no puede aparecer en el log, en claro y codificado para URL.
const secretos: string[] = []
const marca = `zq${randomBytes(5).toString("hex")}`
let app: FastifyInstance | undefined

const alumna = async (letra: string): Promise<{ nombre: string; email: string }> => {
  const nombre = `${marca} Peña Núñez ${letra}`
  const email = `${marca}-${letra}-${randomUUID()}@pruebas.local`
  const { id } = await obtenerDb().usuario.create({
    data: {
      email,
      hashContrasena: "hash-que-no-debe-salir-01e",
      nombre,
      nombreBusqueda: normalizarParaBusqueda(nombre),
      rol: "estudiante",
      estadoPago: "deudor",
    },
    select: { id: true },
  })
  idsUsuarios.push(id)
  return { nombre, email }
}

beforeAll(async () => {
  const base = cargarEnv()
  const env: Env = { ...base, LOG_LEVEL: "trace" }
  inicializarDb({ connectionString: base.DATABASE_URL })
  await inicializarAuth(opcionesDeAuth(base))
  const a = await alumna("a")
  const b = await alumna("b")
  secretos.push(a.nombre, b.nombre, a.email, b.email, marca)
  const maestroId = (
    await obtenerDb().usuario.create({
      data: {
        email: `${marca}-maestro-${randomUUID()}@pruebas.local`,
        hashContrasena: "hash-que-no-debe-salir-01e",
        nombre: `${marca} Maestro`,
        nombreBusqueda: normalizarParaBusqueda(`${marca} Maestro`),
        rol: "maestro",
      },
      select: { id: true },
    })
  ).id
  idsUsuarios.push(maestroId)
  for (const desfase of [1, 2]) {
    const clase = await crearClaseDePrueba(idsClases, { maestroId })
    await archivarClaseDePrueba(clase.id, new Date(Date.now() - desfase * 1000))
  }
  const token = await firmarTokenDePrueba({ usuarioId: await idDelAdminDePrueba() })
  const correoAlta = `${marca}-alta-${randomUUID()}@pruebas.local`
  secretos.push(correoAlta)

  capturar()
  try {
    app = await construirApp({ env })
    await app.ready()
    const pedir = async (
      nombre: string,
      method: "GET" | "POST",
      url: string,
      payload?: Record<string, unknown>,
    ): Promise<LightMyRequestResponse> => {
      if (!app) throw new Error("La aplicación no se construyó")
      const r = await app.inject({
        method,
        url,
        headers: { authorization: `Bearer ${token}` },
        ...(payload === undefined ? {} : { payload }),
      })
      pedidas.push({ nombre, method, url, estado: r.statusCode })
      return r
    }
    const lista = (consulta: Record<string, string>) =>
      `/api/admin/usuarios?${new URLSearchParams(consulta).toString()}`

    const deudoras = { q: marca, rol: "estudiante", estadoPago: "deudor", limite: "1" }
    const p1 = await pedir("deudoras", "GET", lista(deudoras))
    const cuerpo = p1.json<{
      siguienteCursor: string | null
      siguienteCursorNombre: string | null
    }>()
    secretos.push(
      cuerpo.siguienteCursor ?? "sin-cursor",
      cuerpo.siguienteCursorNombre ?? "sin-nombre",
    )
    await pedir(
      "deudoras, página 2",
      "GET",
      lista({
        ...deudoras,
        cursor: cuerpo.siguienteCursor ?? "",
        cursorNombre: cuerpo.siguienteCursorNombre ?? "",
      }),
    )
    await pedir("al corriente", "GET", lista({ ...deudoras, estadoPago: "al_corriente" }))
    const parteDelCorreo = a.email.slice(0, 18)
    secretos.push(parteDelCorreo)
    await pedir("por correo", "GET", lista({ q: parteDelCorreo }))

    const archivadas = await pedir(
      "archivadas",
      "GET",
      "/api/admin/clases?estado=archivadas&limite=1",
    )
    const deArchivadas = archivadas.json<{
      siguienteCursor: string | null
      siguienteCursorArchivadaEn: string | null
    }>()
    secretos.push(
      deArchivadas.siguienteCursor ?? "sin-cursor",
      deArchivadas.siguienteCursorArchivadaEn ?? "sin-posicion",
    )
    await pedir(
      "archivadas, página 2",
      "GET",
      `/api/admin/clases?${new URLSearchParams({
        estado: "archivadas",
        limite: "1",
        cursor: deArchivadas.siguienteCursor ?? "",
        cursorArchivadaEn: deArchivadas.siguienteCursorArchivadaEn ?? "",
      }).toString()}`,
    )
    const termino = `${marca}maestr`
    secretos.push(termino)
    await pedir("candidatos", "GET", `/api/admin/maestros/candidatos?q=${termino}`)

    const alta = await pedir("alta", "POST", "/api/admin/alumnos", {
      nombre: "Alta Del Log",
      email: correoAlta,
    })
    secretos.push(alta.json<{ contrasenaTemporal: string }>().contrasenaTemporal)
  } finally {
    soltar()
  }
}, 120_000)

afterAll(async () => {
  const delAlta = await obtenerDb().usuario.findFirst({
    where: { email: { startsWith: `${marca}-alta-` } },
    select: { id: true },
  })
  if (delAlta) idsUsuarios.push(delAlta.id)
  await borrarMovimientosYClasesDePrueba(idsClases)
  await borrarUsuariosDePrueba(idsUsuarios)
  await app?.close()
})

interface LineaDeLog {
  msg?: string
  req?: { method?: string; url?: string }
}

const lineas = (): LineaDeLog[] =>
  capturado
    .split("\n")
    .filter((linea) => linea.startsWith("{"))
    .map((linea) => JSON.parse(linea) as LineaDeLog)

describe("el log sin la consulta (ADM-1E22)", () => {
  it("ADM-1E22: precondición: las peticiones respondieron lo esperado y hay una línea «incoming request» por petición, con su método y su ruta sin consulta", () => {
    expect(pedidas.map((p) => [p.nombre, p.estado])).toEqual([
      ["deudoras", 200],
      ["deudoras, página 2", 200],
      ["al corriente", 200],
      ["por correo", 200],
      ["archivadas", 200],
      ["archivadas, página 2", 200],
      ["candidatos", 200],
      ["alta", 201],
    ])
    const entrantes = lineas().filter((l) => l.msg === "incoming request")
    expect(entrantes).toHaveLength(pedidas.length)
    expect(entrantes.map((l) => [l.req?.method, l.req?.url])).toEqual(
      pedidas.map((p) => [p.method, p.url.split("?", 1)[0]]),
    )
    expect(entrantes.map((l) => l.req?.url)).toEqual(
      expect.arrayContaining([
        "/api/admin/usuarios",
        "/api/admin/clases",
        "/api/admin/maestros/candidatos",
        "/api/admin/alumnos",
      ]),
    )
  })

  it("ADM-1E22: ningún req.url del log lleva «?», y el log no contiene el estado de pago, los nombres de los parámetros, los nombres ni los correos de las alumnas, el término buscado ni ningún cursor (tampoco codificados para URL)", () => {
    const conConsulta = lineas().filter((l) => (l.req?.url ?? "").includes("?"))
    expect(conConsulta).toEqual([])
    for (const prohibido of [
      "deudor",
      "al_corriente",
      "estadoPago",
      "cursorNombre",
      "cursorArchivadaEn",
    ]) {
      expect(capturado, prohibido).not.toContain(prohibido)
    }
    expect(secretos.length).toBeGreaterThan(8)
    for (const secreto of secretos) {
      expect(capturado, secreto).not.toContain(secreto)
      expect(capturado, secreto).not.toContain(encodeURIComponent(secreto))
      expect(capturado, secreto).not.toContain(
        new URLSearchParams({ x: secreto }).toString().slice(2),
      )
    }
  })

  it("ADM-1E07: la contraseña temporal del alta no aparece en los logs (ni el hash de las cuentas)", () => {
    const temporal = secretos.at(-1) ?? ""
    expect(temporal.length, "Precondición: el alta devolvió la temporal").toBeGreaterThanOrEqual(10)
    expect(capturado).not.toContain(temporal)
    expect(capturado).not.toContain("hash-que-no-debe-salir-01e")
  })
})
