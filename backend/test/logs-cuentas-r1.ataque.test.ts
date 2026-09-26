import { spawn } from "node:child_process"
import { randomBytes, randomUUID } from "node:crypto"
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

// Ataque del Tester (AUTH-02a, ronda 1): la API real (tsx, un PID, sin shell, puerto libre) recorre
// las 8 rutas nuevas con contraseñas, temporales, tokens de enlace, JWT y cookies; nada de eso debe
// aparecer en su log (AGENTS.md, regla 13). Mismo método de completitud que logs-r2 (M-13).

const DIRECTORIO_BACKEND = fileURLToPath(new URL("..", import.meta.url))
const env = cargarEnv()
const correos: string[] = []

interface LineaDeLog {
  requestId?: string
  msg?: string
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

  const contrasenaAlumno = secreta("inicial")
  const correoAlumno = correoDePrueba("ataque-logs-cuentas")
  const correoInvitado = correoDePrueba("ataque-logs-invitado")
  correos.push(correoAlumno, correoInvitado)
  const alumno = await obtenerDb().usuario.create({
    data: {
      email: correoAlumno,
      hashContrasena: await hashContrasena(contrasenaAlumno),
      nombre: "Logs Cuentas",
      nombreBusqueda: "logs cuentas",
      rol: "estudiante",
    },
    select: { id: true },
  })
  const tokenId = randomUUID()
  const enlace = derivarTokenDeCuenta(tokenId)
  const tokenBasura = secreta("tokenbasura")
  const incorrecta = secreta("incorrecta")
  const nuevaPorCambio = secreta("porcambio")
  const nuevaPorEnlace = secreta("porenlace")
  const adminPassword = process.env.ADMIN_PASSWORD ?? ""
  const adminEmail = process.env.ADMIN_EMAIL ?? ""
  if (adminPassword.length < 10 || adminEmail === "") {
    throw new Error("Precondición: setup.ts debe exponer ADMIN_EMAIL y ADMIN_PASSWORD")
  }
  secretos.push(
    ["contraseña inicial", contrasenaAlumno],
    ["token de enlace válido", enlace.token],
    ["token basura", tokenBasura],
    ["temporal incorrecta", incorrecta],
    ["nueva por cambio", nuevaPorCambio],
    ["nueva por enlace", nuevaPorEnlace],
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
    metodo: string,
    ruta: string,
    cuerpo: unknown,
    extra: Record<string, string> = {},
  ): Promise<Response> => {
    const respuesta = await fetch(`${base}${ruta}`, {
      method: metodo,
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

    const loginAdmin = await enviar("login admin", "POST", "/api/auth/login", {
      email: adminEmail,
      contrasena: adminPassword,
    })
    const { tokenAcceso: jwtAdmin } = (await loginAdmin.json()) as { tokenAcceso: string }
    secretos.push(["JWT del admin", jwtAdmin], ["cookie del admin", cookieDe(loginAdmin)])
    const comoAdmin = { authorization: `Bearer ${jwtAdmin}` }

    await enviar(
      "invitar",
      "POST",
      "/api/admin/maestros",
      { nombre: "Invitado Logs", email: correoInvitado },
      comoAdmin,
    )
    await enviar("buscar", "POST", "/api/admin/usuarios/buscar", { email: correoAlumno }, comoAdmin)
    const reset = await enviar(
      "restablecer admin",
      "POST",
      `/api/admin/usuarios/${alumno.id}/restablecer-contrasena`,
      {},
      comoAdmin,
    )
    const { contrasenaTemporal } = (await reset.json()) as { contrasenaTemporal: string }
    secretos.push(["contraseña temporal", contrasenaTemporal])

    const loginTemporal = await enviar("login temporal", "POST", "/api/auth/login", {
      email: correoAlumno,
      contrasena: contrasenaTemporal,
    })
    const { tokenAcceso: jwtAlumno } = (await loginTemporal.json()) as { tokenAcceso: string }
    const cookieAlumno = cookieDe(loginTemporal)
    secretos.push(["JWT del alumno", jwtAlumno], ["cookie del alumno", cookieAlumno])
    const comoAlumno = {
      authorization: `Bearer ${jwtAlumno}`,
      cookie: `campus_refresco=${cookieAlumno}`,
    }

    await enviar(
      "cambiar incorrecta",
      "POST",
      "/api/auth/cambiar-contrasena",
      { contrasenaActual: incorrecta, contrasenaNueva: nuevaPorCambio },
      comoAlumno,
    )
    await enviar(
      "cambiar",
      "POST",
      "/api/auth/cambiar-contrasena",
      { contrasenaActual: contrasenaTemporal, contrasenaNueva: nuevaPorCambio },
      comoAlumno,
    )
    await enviar("recuperar", "POST", "/api/auth/recuperar", { email: correoAlumno })
    // El enlace se crea después del restablecimiento y del cambio, que revocan los enlaces vivos.
    await obtenerDb().tokenCuenta.create({
      data: {
        id: tokenId,
        usuarioId: alumno.id,
        tipo: "recuperacion",
        hashToken: enlace.hash,
        expiraEn: new Date(Date.now() + 30 * 60_000),
      },
      select: { id: true },
    })
    await enviar("establecer basura", "POST", "/api/auth/establecer-contrasena", {
      token: tokenBasura,
      contrasena: nuevaPorEnlace,
    })
    await enviar("restablecer enlace", "POST", "/api/auth/restablecer", {
      token: enlace.token,
      contrasena: nuevaPorEnlace,
    })
    await enviar(
      "corregir",
      "PUT",
      `/api/admin/usuarios/${alumno.id}/correo`,
      { email: correoAlumno },
      comoAdmin,
    )

    const urlCentinela = `/api/salud?centinela=${randomUUID()}`
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

describe("ataque: secretos de cuentas en el log de la API real", () => {
  it("el recorrido llegó a cada ruta con el resultado esperado (precondición)", () => {
    expect(estados).toEqual({
      "login admin": 200,
      invitar: 201,
      buscar: 200,
      "restablecer admin": 200,
      "login temporal": 200,
      "cambiar incorrecta": 400,
      cambiar: 204,
      recuperar: 204,
      "establecer basura": 400,
      "restablecer enlace": 204,
      corregir: 200,
    })
    expect(faltante, `log incompleto: ${String(faltante)}`).toBeNull()
  })

  it("ninguna contraseña, temporal, token de enlace, JWT ni cookie aparece en el log", () => {
    expect(faltante, `log incompleto: ${String(faltante)}`).toBeNull()
    expect(secretos.length).toBeGreaterThanOrEqual(12)
    for (const [etiqueta, valor] of secretos) {
      expect(valor.length, `valor vacío: ${etiqueta}`).toBeGreaterThan(8)
      expect(log.includes(valor), `el log contiene: ${etiqueta}`).toBe(false)
    }
  })
})
