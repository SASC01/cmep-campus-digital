import { spawn } from "node:child_process"
import { randomBytes } from "node:crypto"
import { createServer } from "node:net"
import { fileURLToPath } from "node:url"

import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { inicializarAuth } from "../src/adapters/auth/index.js"
import { cerrarConexion, inicializarDb, obtenerDb } from "../src/adapters/db/cliente.js"
import { opcionesDeAuth } from "../src/config/auth.js"
import { cargarEnv } from "../src/config/env.js"
import { borrarUsuariosDePruebaPorCorreo, correoDePrueba } from "./ayudas-auth.js"

// Ataque del Tester (AUTH-03b, ronda 1): la API real (tsx, un PID, sin shell, puerto libre, nivel
// trace) recorre las rutas de enlaces de registro del admin y POST /auth/registro-maestro (válido,
// con un token basura, con un correo repetido y con el enlace ya revocado). Ningún token del
// enlace, su hash, contraseña, JWT ni cookie debe aparecer en el log (AGENTS.md, regla 13; plan,
// PA-10). Mismo método de completitud que logs-03a-r1 (reescrito aquí: no se importa de ningún
// *.ataque).

const DIRECTORIO_BACKEND = fileURLToPath(new URL("..", import.meta.url))
const env = cargarEnv()
const correos: string[] = []
const enlaces: string[] = []

interface LineaDeLog {
  requestId?: string
  msg?: string
  req?: { url?: string }
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

const lineasCompletas = (log: string): LineaDeLog[] => {
  const resultado: LineaDeLog[] = []
  for (const linea of log.split("\n")) {
    if (!linea.startsWith("{")) continue
    try {
      resultado.push(JSON.parse(linea) as LineaDeLog)
    } catch {
      // Línea parcial: cuenta como faltante hasta completarse.
    }
  }
  return resultado
}

const faltanteEnElLog = (log: string, urlCentinela: string): string | null => {
  const todas = lineasCompletas(log)
  const cerradas = new Set(
    todas.filter((l) => l.msg === "request completed").map((l) => l.requestId),
  )
  const entrantes = todas.filter((l) => l.msg === "incoming request")
  const centinela = entrantes.find((l) => l.req?.url === urlCentinela)
  if (!centinela) return "falta el centinela"
  if (!cerradas.has(centinela.requestId)) return "falta el cierre del centinela"
  const abiertas = entrantes.filter((l) => !cerradas.has(l.requestId))
  if (abiertas.length > 0) return `${abiertas.length} peticiones sin "request completed"`
  return null
}

const secreta = (prefijo: string): string => `${prefijo}-${randomBytes(9).toString("base64url")}`

let log = ""
let faltante: string | null = "beforeAll no terminó"
const secretos: [string, string][] = []
const estados: Record<string, number> = {}

beforeAll(async () => {
  inicializarDb({ connectionString: env.DATABASE_URL })
  await inicializarAuth(opcionesDeAuth(env))

  const adminPassword = process.env.ADMIN_PASSWORD ?? ""
  const adminEmail = process.env.ADMIN_EMAIL ?? ""
  if (adminPassword.length < 10 || adminEmail === "") {
    throw new Error("Precondición: setup.ts debe exponer ADMIN_EMAIL y ADMIN_PASSWORD")
  }

  const correoMaestro = correoDePrueba("ataque-logs-03b-maestro")
  correos.push(correoMaestro)
  const contrasenaMaestro = secreta("maestro03b")
  const contrasenaRepetida = secreta("repetida03b")
  const contrasenaRevocado = secreta("revocado03b")
  const tokenBasura = randomBytes(32).toString("base64url")
  secretos.push(
    ["contraseña del maestro", contrasenaMaestro],
    ["contraseña del registro repetido", contrasenaRepetida],
    ["contraseña del registro con el enlace revocado", contrasenaRevocado],
    ["token basura", tokenBasura],
    ["contraseña del admin", adminPassword],
  )

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

  const enviar = async (
    nombre: string,
    metodo: "GET" | "POST",
    ruta: string,
    cuerpo: unknown,
    extra: Record<string, string> = {},
  ): Promise<Response> => {
    const respuesta = await fetch(`${base}${ruta}`, {
      method: metodo,
      headers: {
        ...(cuerpo === undefined ? {} : { "content-type": "application/json" }),
        ...extra,
      },
      ...(cuerpo === undefined ? {} : { body: JSON.stringify(cuerpo) }),
    })
    estados[nombre] = respuesta.status
    return respuesta
  }
  const cookieDe = (respuesta: Response): string => {
    const cruda = respuesta.headers.getSetCookie().find((c) => c.startsWith("campus_refresco="))
    return cruda?.split(";")[0]?.slice("campus_refresco=".length) ?? ""
  }

  try {
    const inicio = Date.now()
    while (!log.includes("Server listening") && Date.now() - inicio < 45_000) {
      await new Promise((resolver) => setTimeout(resolver, 200))
    }
    if (!log.includes("Server listening")) throw new Error("La API no arrancó")

    const loginAdmin = await enviar("login admin", "POST", "/api/auth/login", {
      email: adminEmail,
      contrasena: adminPassword,
    })
    const { tokenAcceso: jwtAdmin } = (await loginAdmin.json()) as { tokenAcceso: string }
    secretos.push(["JWT del admin", jwtAdmin], ["cookie del admin", cookieDe(loginAdmin)])
    const comoAdmin = { authorization: `Bearer ${jwtAdmin}` }

    const creado = await enviar(
      "crear enlace",
      "POST",
      "/api/admin/enlaces-registro",
      { vigenciaDias: 2 },
      comoAdmin,
    )
    const { enlace, token } = (await creado.json()) as { enlace: { id: string }; token: string }
    enlaces.push(enlace.id)
    const fila = await obtenerDb().enlaceRegistro.findUnique({
      where: { id: enlace.id },
      select: { hashToken: true },
    })
    if (!fila) throw new Error("Precondición: no se guardó el enlace")
    secretos.push(["token del enlace", token], ["hash del token del enlace", fila.hashToken])

    await enviar(
      "listar enlaces",
      "GET",
      "/api/admin/enlaces-registro?limite=5",
      undefined,
      comoAdmin,
    )

    const alta = await enviar("registro valido", "POST", "/api/auth/registro-maestro", {
      nombre: "Maestra Logs",
      email: correoMaestro,
      contrasena: contrasenaMaestro,
      token,
    })
    const { tokenAcceso: jwtMaestro } = (await alta.json()) as { tokenAcceso: string }
    secretos.push(["JWT del maestro", jwtMaestro], ["cookie del maestro", cookieDe(alta)])

    await enviar("registro basura", "POST", "/api/auth/registro-maestro", {
      nombre: "Maestra Basura",
      email: correoDePrueba("ataque-logs-03b-basura"),
      contrasena: contrasenaRepetida,
      token: tokenBasura,
    })
    await enviar("registro repetido", "POST", "/api/auth/registro-maestro", {
      nombre: "Maestra Repetida",
      email: correoMaestro.toUpperCase(),
      contrasena: contrasenaRepetida,
      token,
    })
    await enviar(
      "registrados",
      "GET",
      `/api/admin/enlaces-registro/${enlace.id}/registrados`,
      undefined,
      comoAdmin,
    )
    await enviar(
      "revocar",
      "POST",
      `/api/admin/enlaces-registro/${enlace.id}/revocar`,
      undefined,
      comoAdmin,
    )
    await enviar("registro revocado", "POST", "/api/auth/registro-maestro", {
      nombre: "Maestra Tarde",
      email: correoDePrueba("ataque-logs-03b-tarde"),
      contrasena: contrasenaRevocado,
      token,
    })

    const urlCentinela = `/api/salud?centinela=${randomBytes(8).toString("hex")}`
    await fetch(`${base}${urlCentinela}`)
    const espera = Date.now()
    while (faltanteEnElLog(log, urlCentinela) !== null && Date.now() - espera < 20_000) {
      await new Promise((resolver) => setTimeout(resolver, 100))
    }
    hijo.kill()
    await terminado
    faltante = faltanteEnElLog(log, urlCentinela)
  } catch (error) {
    hijo.kill()
    await terminado
    throw error
  }
}, 120_000)

afterAll(async () => {
  await borrarUsuariosDePruebaPorCorreo(correos)
  await obtenerDb().usuario.deleteMany({ where: { enlaceRegistroId: { in: enlaces } } })
  await obtenerDb().enlaceRegistro.deleteMany({ where: { id: { in: enlaces } } })
  await cerrarConexion()
})

describe("ataque (AUTH-03b r1): secretos de 03b en el log de la API real", () => {
  it("el recorrido llegó a cada ruta con el resultado esperado (precondición)", () => {
    expect(estados).toEqual({
      "login admin": 200,
      "crear enlace": 201,
      "listar enlaces": 200,
      "registro valido": 201,
      "registro basura": 400,
      "registro repetido": 409,
      registrados: 200,
      revocar: 200,
      "registro revocado": 400,
    })
    expect(faltante, `log incompleto: ${String(faltante)}`).toBeNull()
    const urls = lineasCompletas(log).map((linea) => linea.req?.url)
    expect(urls).toContain("/api/auth/registro-maestro")
    expect(urls).toContain("/api/admin/enlaces-registro")
  })

  it("ningún token del enlace, su hash, contraseña, JWT, cookie ni #token= aparece en el log", () => {
    expect(faltante, `log incompleto: ${String(faltante)}`).toBeNull()
    expect(secretos.length).toBe(11)
    for (const [etiqueta, valor] of secretos) {
      expect(valor.length, `valor vacío: ${etiqueta}`).toBeGreaterThan(8)
      expect(log.includes(valor), `el log contiene: ${etiqueta}`).toBe(false)
    }
    expect(log).not.toContain("#token=")
  })
})
