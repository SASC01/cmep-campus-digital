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

// Ataque del Tester (AUTH-03c, ronda 1): la API real (tsx, un PID, sin shell, puerto libre, nivel
// trace y un límite diario de 10,000 para no depender de la base compartida) recibe tres listas de
// POST /api/admin/maestros/lote: una mixta (nuevas con nombre, sin nombre, una ya existente,
// inválidas que contienen correos y una repetida), una de 101 líneas (400) y una con un cuerpo que
// no es texto. Ningún correo ni nombre de las listas debe aparecer en el log (plan, "Puntos de
// ataque" AUTH-03c: "que el log no contenga los correos de la lista"; AGENTS.md, regla 13).
// Mismo método de completitud que logs-03b-r1 (reescrito aquí: no se importa de ningún *.ataque).

const DIRECTORIO_BACKEND = fileURLToPath(new URL("..", import.meta.url))
const env = cargarEnv()
const correos: string[] = []

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

const nuevo = (prefijo: string): string => {
  const correo = correoDePrueba(`ataque-logs-03c-${prefijo}`)
  correos.push(correo)
  return correo
}

let log = ""
let faltante: string | null = "beforeAll no terminó"
const secretos: [string, string][] = []
const estados: Record<string, number> = {}
const enviadas: string[] = []

beforeAll(async () => {
  inicializarDb({ connectionString: env.DATABASE_URL })
  await inicializarAuth(opcionesDeAuth(env))

  const adminPassword = process.env.ADMIN_PASSWORD ?? ""
  const adminEmail = process.env.ADMIN_EMAIL ?? ""
  if (adminPassword.length < 10 || adminEmail === "") {
    throw new Error("Precondición: setup.ts debe exponer ADMIN_EMAIL y ADMIN_PASSWORD")
  }

  const marca = randomBytes(4).toString("hex")
  const conNombre = nuevo("con-nombre")
  const sinNombre = nuevo("sin-nombre")
  const nombreVisible = `Maestra Registrable ${marca}`
  const existenteNombre = `Nombre Existente ${marca}`
  const existente = nuevo("existente")
  await obtenerDb().usuario.create({
    data: {
      email: existente,
      hashContrasena: "x",
      nombre: existenteNombre,
      nombreBusqueda: existenteNombre.toLowerCase(),
      rol: "maestro",
    },
    select: { id: true },
  })
  const enTextoInvalido = nuevo("en-texto-invalido")
  const nombreInvalido = nuevo("nombre-invalido")
  const listaMixta = [
    `${conNombre}, ${nombreVisible}`,
    sinNombre,
    `${existente}; Otro Nombre ${marca}`,
    `Texto ${enTextoInvalido} sin separador valido`,
    `${nombreInvalido}, X`,
    conNombre.toUpperCase(),
  ].join("\n")
  const listaDeMas = Array.from({ length: 101 }, (_, i) => nuevo(`de-mas-${String(i)}`)).join("\n")
  secretos.push(
    ["correo con nombre", conNombre],
    ["correo sin nombre", sinNombre],
    ["correo existente", existente],
    ["correo dentro de una línea inválida", enTextoInvalido],
    ["correo con nombre inválido", nombreInvalido],
    ["nombre de la lista", nombreVisible],
    ["nombre de la línea existente", `Otro Nombre ${marca}`],
    ["primer correo de la lista de 101", correos.find((c) => c.includes("de-mas-0-")) ?? ""],
    ["último correo de la lista de 101", correos.find((c) => c.includes("de-mas-100-")) ?? ""],
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
      INVITACIONES_LIMITE_DIARIO: "10000",
    },
    stdio: ["ignore", "pipe", "pipe"],
  })
  hijo.stdout.on("data", (dato: Buffer) => (log += dato.toString("utf8")))
  hijo.stderr.on("data", (dato: Buffer) => (log += dato.toString("utf8")))
  const terminado = new Promise<void>((resolver) => hijo.on("close", () => resolver()))

  const enviar = async (
    nombre: string,
    ruta: string,
    cuerpo: string,
    extra: Record<string, string> = {},
  ): Promise<Response> => {
    const respuesta = await fetch(`${base}${ruta}`, {
      method: "POST",
      headers: { "content-type": "application/json", ...extra },
      body: cuerpo,
    })
    estados[nombre] = respuesta.status
    return respuesta
  }

  try {
    const inicio = Date.now()
    while (!log.includes("Server listening") && Date.now() - inicio < 45_000) {
      await new Promise((resolver) => setTimeout(resolver, 200))
    }
    if (!log.includes("Server listening")) throw new Error("La API no arrancó")

    const loginAdmin = await enviar(
      "login admin",
      "/api/auth/login",
      JSON.stringify({ email: adminEmail, contrasena: adminPassword }),
    )
    const { tokenAcceso: jwtAdmin } = (await loginAdmin.json()) as { tokenAcceso: string }
    secretos.push(["JWT del admin", jwtAdmin])
    const comoAdmin = { authorization: `Bearer ${jwtAdmin}` }

    const mixta = await enviar(
      "lista mixta",
      "/api/admin/maestros/lote",
      JSON.stringify({ lista: listaMixta }),
      comoAdmin,
    )
    const cuerpo = (await mixta.json()) as { enviadas: { email: string }[] }
    enviadas.push(...cuerpo.enviadas.map((e) => e.email))
    await enviar(
      "lista de 101",
      "/api/admin/maestros/lote",
      JSON.stringify({ lista: listaDeMas }),
      comoAdmin,
    )
    await enviar("cuerpo roto", "/api/admin/maestros/lote", `{"lista": "${conNombre}\n`, comoAdmin)

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
  await cerrarConexion()
})

describe("ataque (AUTH-03c r1): correos y nombres de la lista en el log de la API real", () => {
  it("el recorrido llegó a la ruta con el resultado esperado (precondición)", () => {
    expect(estados).toEqual({
      "login admin": 200,
      "lista mixta": 200,
      "lista de 101": 400,
      "cuerpo roto": 400,
    })
    expect(enviadas).toHaveLength(2)
    expect(faltante, `log incompleto: ${String(faltante)}`).toBeNull()
    const urls = lineasCompletas(log).map((linea) => linea.req?.url)
    expect(urls.filter((url) => url === "/api/admin/maestros/lote")).toHaveLength(3)
  })

  it("ningún correo ni nombre de las listas, ni la contraseña ni el JWT del admin, aparece en el log", () => {
    expect(faltante, `log incompleto: ${String(faltante)}`).toBeNull()
    expect(secretos.length).toBe(11)
    const logEnMinusculas = log.toLowerCase()
    for (const [etiqueta, valor] of secretos) {
      expect(valor.length, `valor vacío: ${etiqueta}`).toBeGreaterThan(8)
      expect(log.includes(valor), `el log contiene: ${etiqueta}`).toBe(false)
      expect(logEnMinusculas.includes(valor.toLowerCase()), `el log contiene: ${etiqueta}`).toBe(
        false,
      )
    }
  })
})
