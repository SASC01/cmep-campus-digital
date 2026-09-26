import { spawn } from "node:child_process"
import { randomBytes } from "node:crypto"
import { createServer } from "node:net"
import { fileURLToPath } from "node:url"

import { describe, expect, it } from "vitest"

// Ataques del Tester (AUTH-02a, ronda 1) contra el arranque: la API sin base no arranca y termina
// (N-03); el worker en production sin configuración de correo no arranca y no imprime valores; y
// test/preparar-cola.ts se niega a conectarse a una base que no es la desechable (N-06 punto 3).
// Todos los procesos apuntan a un puerto cerrado o salen antes de conectarse: ninguno toca la base
// de pruebas ni consume la cola compartida.

const DIRECTORIO_BACKEND = fileURLToPath(new URL("..", import.meta.url))

interface Proceso {
  codigo: number | null
  salida: string
  agotado: boolean
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

const ejecutar = (script: string, envExtra: Record<string, string>, limiteMs = 45_000) =>
  new Promise<Proceso>((resolver) => {
    const hijo = spawn(process.execPath, ["--import", "tsx", script], {
      cwd: DIRECTORIO_BACKEND,
      env: { ...process.env, ...envExtra },
      stdio: ["ignore", "pipe", "pipe"],
    })
    let salida = ""
    let agotado = false
    hijo.stdout.on("data", (dato: Buffer) => (salida += dato.toString("utf8")))
    hijo.stderr.on("data", (dato: Buffer) => (salida += dato.toString("utf8")))
    const limite = setTimeout(() => {
      agotado = true
      hijo.kill()
    }, limiteMs)
    hijo.on("close", (codigo) => {
      clearTimeout(limite)
      resolver({ codigo, salida, agotado })
    })
  })

describe("ataque: arranque de la API y del worker (AUTH-02a)", () => {
  it("la API con la base caída no arranca: sale sola con código distinto de 0 y sin la contraseña de la URL", async () => {
    const puertoCerrado = await puertoLibre()
    const puertoApi = await puertoLibre()
    const clave = `clave-${randomBytes(8).toString("hex")}`
    const { codigo, salida, agotado } = await ejecutar("src/server.ts", {
      NODE_ENV: "development",
      HOST: "127.0.0.1",
      PORT: String(puertoApi),
      DATABASE_URL: `postgresql://campus_pruebas:${clave}@127.0.0.1:${puertoCerrado}/campus_pruebas`,
    })
    expect(agotado, "la API quedó colgada sin base").toBe(false)
    expect(codigo).not.toBe(0)
    expect(salida).not.toContain("Server listening")
    expect(salida).not.toContain(clave)
  }, 60_000)

  it("el worker en production sin RESEND_API_KEY ni remitente propio no arranca y no imprime valores", async () => {
    const puertoCerrado = await puertoLibre()
    const remitente = "CMEP <notificaciones@campus.local>"
    const { codigo, salida, agotado } = await ejecutar("src/worker.ts", {
      NODE_ENV: "production",
      JWT_SECRET: randomBytes(36).toString("base64url"),
      DATABASE_URL: `postgresql://campus_pruebas:x@127.0.0.1:${puertoCerrado}/campus_pruebas`,
      RESEND_API_KEY: "",
      CORREO_REMITENTE: remitente,
      URL_PUBLICA_FRONTEND: "https://campus.colegio-ataque.mx",
    })
    expect(agotado, "el worker quedó colgado").toBe(false)
    expect(codigo).toBe(1)
    expect(salida).toContain("RESEND_API_KEY")
    expect(salida).toContain("CORREO_REMITENTE")
    expect(salida).not.toContain("notificaciones@campus.local")
    expect(salida).not.toContain("worker_listo")
  }, 60_000)

  it("test/preparar-cola.ts contra campus_dev se niega antes de conectarse y no imprime la URL", async () => {
    const puertoCerrado = await puertoLibre()
    const clave = `clave-${randomBytes(8).toString("hex")}`
    const { codigo, salida, agotado } = await ejecutar("test/preparar-cola.ts", {
      DATABASE_URL: `postgresql://campus:${clave}@127.0.0.1:${puertoCerrado}/campus_dev`,
    })
    expect(agotado).toBe(false)
    expect(codigo).not.toBe(0)
    expect(salida).toContain("Guarda de la base de pruebas")
    expect(salida).not.toContain(clave)
    // Si hubiera intentado conectarse al puerto cerrado, el error sería de conexión, no de la guarda.
    expect(salida).not.toMatch(/ECONNREFUSED/)
  }, 60_000)
})
