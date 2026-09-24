import { spawn } from "node:child_process"
import { randomUUID } from "node:crypto"
import { createServer } from "node:net"
import { fileURLToPath } from "node:url"

import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { hashContrasena, inicializarAuth } from "../src/adapters/auth/index.js"
import { cerrarConexion, inicializarDb, obtenerDb } from "../src/adapters/db/cliente.js"
import { opcionesDeAuth } from "../src/config/auth.js"
import { cargarEnv } from "../src/config/env.js"
import {
  borrarUsuariosDePruebaPorCorreo,
  CONTRASENA_DE_PRUEBA,
  correoDePrueba,
  firmarJwtDePrueba,
  firmarTokenDePrueba,
} from "./ayudas-auth.js"

// Ataques del Tester (AUTH-01, ronda 2) contra la corrección de T-09: userId en las líneas de log
// de la petición autenticada (también en las de error) y nunca en las de peticiones sin
// autenticar. API real arrancada y detenida por esta prueba (un PID, sin shell, puerto libre).

const DIRECTORIO_BACKEND = fileURLToPath(new URL("..", import.meta.url))
const env = cargarEnv()
const correos: string[] = []

interface LineaDeLog {
  requestId?: string
  userId?: string
  msg?: string
  level?: number
  req?: { url?: string; method?: string }
}

const puertoLibre = (): Promise<number> =>
  new Promise((resolver, rechazar) => {
    const servidor = createServer()
    servidor.once("error", rechazar)
    servidor.listen(0, "127.0.0.1", () => {
      const direccion = servidor.address()
      const puerto = typeof direccion === "object" && direccion ? direccion.port : 0
      servidor.close(() => resolver(puerto))
    })
  })

const lineas = (log: string): LineaDeLog[] =>
  log
    .split("\n")
    .filter((linea) => linea.startsWith("{"))
    .map((linea) => JSON.parse(linea) as LineaDeLog)

// Todas las líneas de la petición cuya línea "incoming request" tiene ese método y URL, en orden.
const lineasDe = (todas: readonly LineaDeLog[], metodo: string, url: string): LineaDeLog[][] => {
  const ids = todas
    .filter((l) => l.msg === "incoming request" && l.req?.method === metodo && l.req.url === url)
    .map((l) => l.requestId)
  return ids.map((id) => todas.filter((l) => l.requestId === id))
}

// Completitud del log (M-13). En Windows, ChildProcess.kill() termina el proceso a la fuerza con
// cualquier señal (SIGTERM y SIGINT incluidas), así que el cierre ordenado de server.ts nunca corre
// y pino (SonicBoom, asíncrono) puede perder sus últimas líneas. Por eso, antes de detener la API
// se envía una petición centinela y se espera a que el log tenga su "request completed" y el de
// todas las peticiones anteriores; cada caso exige esa completitud antes de afirmar nada.
const lineasCompletas = (log: string): LineaDeLog[] => {
  const resultado: LineaDeLog[] = []
  for (const linea of log.split("\n")) {
    if (!linea.startsWith("{")) continue
    try {
      resultado.push(JSON.parse(linea) as LineaDeLog)
    } catch {
      // Línea aún parcial (llegó a medias por el pipe): cuenta como faltante hasta completarse.
    }
  }
  return resultado
}

// null si el log está completo; si no, qué falta.
const faltanteEnElLog = (log: string, urlCentinela: string): string | null => {
  const todas = lineasCompletas(log)
  const cerradas = new Set(
    todas.filter((l) => l.msg === "request completed").map((l) => l.requestId),
  )
  const entrantes = todas.filter((l) => l.msg === "incoming request")
  const centinela = entrantes.find((l) => l.req?.url === urlCentinela)
  if (!centinela) return `falta "incoming request" del centinela ${urlCentinela}`
  if (!cerradas.has(centinela.requestId)) {
    return `falta "request completed" del centinela ${urlCentinela}`
  }
  const abiertas = entrantes
    .filter((l) => !cerradas.has(l.requestId))
    .map((l) => `${l.req?.method ?? "?"} ${l.req?.url ?? "?"}`)
  if (abiertas.length > 0) return `peticiones sin "request completed": ${abiertas.join(", ")}`
  return null
}

const esperarLogCompleto = async (leer: () => string, urlCentinela: string): Promise<void> => {
  const inicio = Date.now()
  while (faltanteEnElLog(leer(), urlCentinela) !== null && Date.now() - inicio < 20_000) {
    await new Promise((resolver) => setTimeout(resolver, 100))
  }
}

let log = ""
let urlCentinela = ""
let faltante: string | null = "el log no se evaluó (beforeAll no terminó)"
const usuarioNormal = { id: "", token: "" }
const usuarioRaro = { id: "", token: "" }

// Precondición de todo caso (M-13): si el log está incompleto, falla con un mensaje claro en lugar
// de dar por buena una ausencia (o una presencia) sobre un log truncado.
const exigirLogCompleto = (): void => {
  expect(faltante, `Log de la API incompleto; no se puede afirmar nada sobre él: ${faltante}`).toBe(
    null,
  )
}

beforeAll(async () => {
  inicializarDb({ connectionString: env.DATABASE_URL })
  await inicializarAuth(opcionesDeAuth(env))
  const hash = await hashContrasena(CONTRASENA_DE_PRUEBA)

  // Usuario normal y otro con un uuid que PostgreSQL acepta pero meRespuestaSchema (z.uuid, RFC)
  // no: su GET /me termina en un 500 dentro de la ruta autenticada, para ver la línea de error.
  const correoNormal = correoDePrueba("ataque-logs")
  const correoRaro = correoDePrueba("ataque-logs-500")
  correos.push(correoNormal, correoRaro)
  const uuid = randomUUID()
  const idRaro = `${uuid.slice(0, 19)}0${uuid.slice(20)}`
  const normal = await obtenerDb().usuario.create({
    data: {
      email: correoNormal,
      hashContrasena: hash,
      nombre: "Logs Normal",
      nombreBusqueda: "logs normal",
      rol: "estudiante",
    },
    select: { id: true },
  })
  await obtenerDb().usuario.create({
    data: {
      id: idRaro,
      email: correoRaro,
      hashContrasena: hash,
      nombre: "Logs Raro",
      nombreBusqueda: "logs raro",
      rol: "estudiante",
    },
    select: { id: true },
  })
  usuarioNormal.id = normal.id
  usuarioNormal.token = await firmarTokenDePrueba({ usuarioId: normal.id })
  usuarioRaro.id = idRaro
  usuarioRaro.token = await firmarTokenDePrueba({ usuarioId: idRaro })

  const puerto = await puertoLibre()
  const base = `http://127.0.0.1:${puerto}`
  const hijo = spawn(process.execPath, ["--import", "tsx", "src/server.ts"], {
    cwd: DIRECTORIO_BACKEND,
    env: {
      ...process.env,
      HOST: "127.0.0.1",
      PORT: String(puerto),
      LOG_LEVEL: "trace",
      NODE_ENV: "development",
    },
    stdio: ["ignore", "pipe", "pipe"],
  })
  hijo.stdout.on("data", (dato: Buffer) => (log += dato.toString("utf8")))
  hijo.stderr.on("data", (dato: Buffer) => (log += dato.toString("utf8")))
  const terminado = new Promise<void>((resolver) => hijo.on("close", () => resolver()))

  try {
    const inicio = Date.now()
    while (!log.includes("Server listening") && Date.now() - inicio < 45_000) {
      await new Promise((resolver) => setTimeout(resolver, 200))
    }
    if (!log.includes("Server listening")) throw new Error(`La API no arrancó:\n${log}`)

    const falso = firmarJwtDePrueba({
      payload: { sub: usuarioNormal.id, iat: 1, exp: 2 },
      secreto: "otro-secreto-de-al-menos-treinta-y-dos-caracteres",
    })
    await fetch(`${base}/api/me`, { headers: { authorization: `Bearer ${usuarioNormal.token}` } })
    await fetch(`${base}/api/me`, { headers: { authorization: `Bearer ${falso}` } })
    await fetch(`${base}/api/me`, { headers: { authorization: `Bearer ${usuarioRaro.token}` } })
    await fetch(`${base}/api/auth/login`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: correoNormal, contrasena: CONTRASENA_DE_PRUEBA }),
    })
    await fetch(`${base}/api/auth/refrescar`, { method: "POST" })

    // Centinela: la última petición. Se detiene la API solo cuando su línea y las de todas las
    // anteriores ya están en el log.
    urlCentinela = `/api/salud?centinela=${randomUUID()}`
    await fetch(`${base}${urlCentinela}`)
    await esperarLogCompleto(() => log, urlCentinela)
  } finally {
    hijo.kill()
    await terminado
  }
  // Se evalúa sobre el log final, ya con el proceso cerrado y el pipe vaciado.
  faltante = faltanteEnElLog(log, urlCentinela)
}, 120_000)

afterAll(async () => {
  await borrarUsuariosDePruebaPorCorreo(correos)
  await cerrarConexion()
})

describe("ataque (ronda 2): userId en los logs (T-09)", () => {
  it("todas las líneas posteriores a authenticate de un GET /api/me válido llevan el userId correcto", () => {
    exigirLogCompleto()
    const peticiones = lineasDe(lineas(log), "GET", "/api/me")
    const valida = peticiones.find((grupo) =>
      grupo.some((l) => l.msg === "request completed" && l.userId === usuarioNormal.id),
    )
    expect(valida).toBeDefined()
    const completada = valida?.find((l) => l.msg === "request completed")
    expect(completada?.userId).toBe(usuarioNormal.id)
  })

  it("la línea de error de un 500 dentro de una ruta autenticada lleva el userId", () => {
    exigirLogCompleto()
    const errores = lineas(log).filter((l) => l.msg === "Error no controlado")
    expect(errores.length).toBeGreaterThan(0)
    expect(errores.map((l) => l.userId)).toContain(usuarioRaro.id)
  })

  it("un token falso no deja userId en ninguna línea de su petición", () => {
    exigirLogCompleto()
    const peticiones = lineasDe(lineas(log), "GET", "/api/me")
    const conFirmaAjena = peticiones.find((grupo) =>
      grupo.some((l) => l.msg === "request completed" && l.userId === undefined),
    )
    expect(conFirmaAjena).toBeDefined()
    expect(conFirmaAjena?.every((l) => l.userId === undefined)).toBe(true)
  })

  it("login y refrescar (sin JWT) no llevan userId", () => {
    exigirLogCompleto()
    const todas = lineas(log)
    for (const [metodo, url] of [
      ["POST", "/api/auth/login"],
      ["POST", "/api/auth/refrescar"],
    ] as const) {
      const grupos = lineasDe(todas, metodo, url)
      expect(grupos.length).toBeGreaterThan(0)
      for (const grupo of grupos) expect(grupo.every((l) => l.userId === undefined)).toBe(true)
    }
  })

  it("ninguna línea contiene los JWT usados", () => {
    exigirLogCompleto()
    expect(log.includes(usuarioNormal.token)).toBe(false)
    expect(log.includes(usuarioRaro.token)).toBe(false)
  })
})
