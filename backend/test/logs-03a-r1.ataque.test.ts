import { spawn } from "node:child_process"
import { randomBytes } from "node:crypto"
import { createServer } from "node:net"
import { fileURLToPath } from "node:url"

import { afterAll, beforeAll, describe, expect, it } from "vitest"

import {
  derivarTokenDeCuenta,
  hashContrasena,
  inicializarAuth,
} from "../src/adapters/auth/index.js"
import { cerrarConexion, inicializarDb, obtenerDb } from "../src/adapters/db/cliente.js"
import { opcionesDeAuth } from "../src/config/auth.js"
import { cargarEnv } from "../src/config/env.js"
import { borrarUsuariosDePruebaPorCorreo, correoDePrueba } from "./ayudas-auth.js"

// Ataque del Tester (AUTH-03a, ronda 1): la API real (tsx, un PID, sin shell, puerto libre, nivel
// trace) recorre POST /auth/invitacion, /auth/establecer-contrasena con un nombre corregido y el
// cambio obligatorio sin la temporal (sin cookie, repetida y con éxito, más un contrasenaActual
// sobrante). Ningún token, contraseña, nombre de la invitación, JWT ni cookie debe aparecer en el
// log (AGENTS.md, regla 13; plan, "Puntos de ataque" AUTH-03a, punto 2). Mismo método de
// completitud que logs-cuentas-r1 (reescrito aquí: no se importa de ningún *.ataque).

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

const secreta = (prefijo: string): string => `${prefijo}-${randomBytes(9).toString("base64url")}`
const nombreSecreto = (prefijo: string): string => `${prefijo} ${randomBytes(6).toString("hex")}`

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

  const correoInvitado = correoDePrueba("ataque-logs-03a-invitado")
  const correoAlumno = correoDePrueba("ataque-logs-03a-alumno")
  correos.push(correoInvitado, correoAlumno)
  const contrasenaAlumno = secreta("inicial03a")
  const alumno = await obtenerDb().usuario.create({
    data: {
      email: correoAlumno,
      hashContrasena: await hashContrasena(contrasenaAlumno),
      nombre: "Logs Tres A",
      nombreBusqueda: "logs tres a",
      rol: "estudiante",
    },
    select: { id: true },
  })

  const nombreInvitacion = nombreSecreto("Invitado")
  const nombreCorregido = nombreSecreto("Corregido")
  const contrasenaMaestro = secreta("maestro03a")
  const nuevaPorCambio = secreta("porcambio03a")
  const actualSobrante = secreta("sobrante03a")
  const tokenBasura = randomBytes(32).toString("base64url")
  secretos.push(
    ["contraseña inicial del alumno", contrasenaAlumno],
    ["nombre de la invitación", nombreInvitacion],
    ["nombre corregido", nombreCorregido],
    ["contraseña del maestro", contrasenaMaestro],
    ["nueva por cambio", nuevaPorCambio],
    ["contrasenaActual sobrante", actualSobrante],
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
    ruta: string,
    cuerpo: unknown,
    extra: Record<string, string> = {},
  ): Promise<Response> => {
    const respuesta = await fetch(`${base}${ruta}`, {
      method: "POST",
      headers: { "content-type": "application/json", ...extra },
      body: JSON.stringify(cuerpo),
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

    const loginAdmin = await enviar("login admin", "/api/auth/login", {
      email: adminEmail,
      contrasena: adminPassword,
    })
    const { tokenAcceso: jwtAdmin } = (await loginAdmin.json()) as { tokenAcceso: string }
    secretos.push(["JWT del admin", jwtAdmin], ["cookie del admin", cookieDe(loginAdmin)])
    const comoAdmin = { authorization: `Bearer ${jwtAdmin}` }

    const invitar = await enviar(
      "invitar",
      "/api/admin/maestros",
      { nombre: nombreInvitacion, email: correoInvitado },
      comoAdmin,
    )
    const { id: maestroId } = (await invitar.json()) as { id: string }
    const fila = await obtenerDb().tokenCuenta.findFirst({
      where: { usuarioId: maestroId, tipo: "invitacion" },
      select: { id: true },
    })
    if (!fila) throw new Error("Precondición: la invitación no creó un token")
    const tokenInvitacion = derivarTokenDeCuenta(fila.id).token
    secretos.push(["token de la invitación", tokenInvitacion])

    const datos = await enviar("invitacion valida", "/api/auth/invitacion", {
      token: tokenInvitacion,
    })
    const { nombre: nombreLeido } = (await datos.json()) as { nombre: string }
    if (nombreLeido !== nombreInvitacion) {
      throw new Error("Precondición: /auth/invitacion no devolvió el nombre de la invitación")
    }
    await enviar("invitacion basura", "/api/auth/invitacion", { token: tokenBasura })
    await enviar("establecer con nombre", "/api/auth/establecer-contrasena", {
      token: tokenInvitacion,
      contrasena: contrasenaMaestro,
      nombre: nombreCorregido,
    })
    await enviar("invitacion usada", "/api/auth/invitacion", { token: tokenInvitacion })

    const reset = await enviar(
      "restablecer admin",
      `/api/admin/usuarios/${alumno.id}/restablecer-contrasena`,
      {},
      comoAdmin,
    )
    const { contrasenaTemporal } = (await reset.json()) as { contrasenaTemporal: string }
    secretos.push(["contraseña temporal", contrasenaTemporal])
    const loginTemporal = await enviar("login temporal", "/api/auth/login", {
      email: correoAlumno,
      contrasena: contrasenaTemporal,
    })
    const { tokenAcceso: jwtAlumno } = (await loginTemporal.json()) as { tokenAcceso: string }
    const cookieAlumno = cookieDe(loginTemporal)
    secretos.push(["JWT del alumno", jwtAlumno], ["cookie del alumno", cookieAlumno])
    const soloJwt = { authorization: `Bearer ${jwtAlumno}` }
    const conCookie = { ...soloJwt, cookie: `campus_refresco=${cookieAlumno}` }

    await enviar(
      "cambiar sin cookie",
      "/api/auth/cambiar-contrasena",
      { contrasenaNueva: nuevaPorCambio },
      soloJwt,
    )
    await enviar(
      "cambiar repetida",
      "/api/auth/cambiar-contrasena",
      { contrasenaNueva: contrasenaTemporal },
      conCookie,
    )
    await enviar(
      "cambiar",
      "/api/auth/cambiar-contrasena",
      { contrasenaActual: actualSobrante, contrasenaNueva: nuevaPorCambio },
      conCookie,
    )

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

describe("ataque (AUTH-03a r1): secretos de 03a en el log de la API real", () => {
  it("el recorrido llegó a cada ruta con el resultado esperado (precondición)", () => {
    expect(estados).toEqual({
      "login admin": 200,
      invitar: 201,
      "invitacion valida": 200,
      "invitacion basura": 400,
      "establecer con nombre": 204,
      "invitacion usada": 400,
      "restablecer admin": 200,
      "login temporal": 200,
      "cambiar sin cookie": 401,
      "cambiar repetida": 400,
      cambiar: 204,
    })
    expect(faltante, `log incompleto: ${String(faltante)}`).toBeNull()
    // El log sí registró las rutas atacadas: la ausencia de secretos no es por un log vacío.
    const urls = lineasCompletas(log).map((linea) => linea.req?.url)
    expect(urls).toContain("/api/auth/invitacion")
    expect(urls).toContain("/api/auth/establecer-contrasena")
    expect(urls).toContain("/api/auth/cambiar-contrasena")
  })

  it("ningún token, contraseña, nombre de la invitación, JWT ni cookie aparece en el log", () => {
    expect(faltante, `log incompleto: ${String(faltante)}`).toBeNull()
    expect(secretos.length).toBe(14)
    for (const [etiqueta, valor] of secretos) {
      expect(valor.length, `valor vacío: ${etiqueta}`).toBeGreaterThan(8)
      expect(log.includes(valor), `el log contiene: ${etiqueta}`).toBe(false)
    }
  })
})
