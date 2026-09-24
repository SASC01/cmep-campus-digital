import { spawn } from "node:child_process"
import { createHash, randomUUID } from "node:crypto"
import { createServer } from "node:net"
import { fileURLToPath } from "node:url"

import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { inicializarDb } from "../src/adapters/db/cliente.js"
import { cerrarConexion, existeAdmin } from "../src/adapters/db/index.js"
import { cargarEnv, JWT_SECRET_DE_EJEMPLO } from "../src/config/env.js"
import { borrarUsuariosDePruebaPorCorreo, correoDePrueba } from "./ayudas-auth.js"

// Ataques del Tester (AUTH-01, ronda 1) contra procesos reales: la API arrancada con tsx (logs de
// pino capturados de su salida), el arranque con configuración de production y los scripts de
// administración. Cada proceso lo arranca y lo detiene esta prueba (sin shell: un solo PID).

const DIRECTORIO_BACKEND = fileURLToPath(new URL("..", import.meta.url))
const correos: string[] = []

interface Proceso {
  codigo: number | null
  salida: string
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

// Completitud del log (M-13). En Windows, ChildProcess.kill() termina el proceso a la fuerza con
// cualquier señal (SIGTERM y SIGINT incluidas), así que el cierre ordenado de server.ts nunca corre
// y pino (SonicBoom, asíncrono) puede perder sus últimas líneas. Por eso, antes de detener la API
// se envía una petición centinela y se espera a que el log tenga su "request completed" y el de
// todas las peticiones anteriores; las aserciones de ausencia exigen esa completitud primero.
interface LineaDeLog {
  requestId?: string
  msg?: string
  req?: { url?: string; method?: string }
}

const lineasJson = (log: string): LineaDeLog[] => {
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
  const todas = lineasJson(log)
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

// Ejecuta un script de backend con tsx y espera a que termine (scripts y arranques fallidos).
const ejecutar = (script: string, envExtra: Record<string, string>): Promise<Proceso> =>
  new Promise((resolver) => {
    const hijo = spawn(process.execPath, ["--import", "tsx", script], {
      cwd: DIRECTORIO_BACKEND,
      env: { ...process.env, ...envExtra },
      stdio: ["ignore", "pipe", "pipe"],
    })
    let salida = ""
    hijo.stdout.on("data", (dato: Buffer) => (salida += dato.toString("utf8")))
    hijo.stderr.on("data", (dato: Buffer) => (salida += dato.toString("utf8")))
    const limite = setTimeout(() => hijo.kill(), 60_000)
    hijo.on("close", (codigo) => {
      clearTimeout(limite)
      resolver({ codigo, salida })
    })
  })

describe("ataque: logs de la API real (pino, LOG_LEVEL=trace)", () => {
  const secretos: string[] = []
  let log = ""
  let respuestas: Record<string, number> = {}
  let conUserId = false
  let usuarioSub = ""
  let urlCentinela = ""
  let faltante: string | null = "el log no se evaluó (beforeAll no terminó)"

  // Precondición de toda aserción sobre el log (M-13): si falta algo, falla con un mensaje claro en
  // lugar de dar por buena una ausencia en un log truncado.
  const exigirLogCompleto = (): void => {
    expect(
      faltante,
      `Log de la API incompleto; no se puede afirmar nada sobre él: ${faltante}`,
    ).toBe(null)
  }

  beforeAll(async () => {
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

      const json = { "content-type": "application/json" }
      const contrasena = `Clave-Log-${randomUUID()}`
      const contrasenaNula = `Clave-Nula-${randomUUID()}`
      const contrasenaMalformada = `Clave-Mal-${randomUUID()}`
      const contrasenaCorta = `c${randomUUID().slice(0, 5)}`
      secretos.push(contrasena, contrasenaNula, contrasenaMalformada, contrasenaCorta)
      const email = correoDePrueba("ataque-log")
      const emailNulo = correoDePrueba("ataque-log-nulo")
      correos.push(email, emailNulo)

      const cookieDe = (respuesta: Response): string => {
        const crudo = respuesta.headers.get("set-cookie") ?? ""
        return /campus_refresco=([^;]*)/.exec(crudo)?.[1] ?? ""
      }
      const post = (ruta: string, cuerpo: string | undefined, cookie?: string) =>
        fetch(`${base}${ruta}`, {
          method: "POST",
          headers: {
            ...(cuerpo === undefined ? {} : json),
            ...(cookie ? { cookie: `campus_refresco=${cookie}` } : {}),
          },
          ...(cuerpo === undefined ? {} : { body: cuerpo }),
        })

      const registro = await post(
        "/api/auth/registro",
        JSON.stringify({ nombre: "Ataque Log", email, contrasena }),
      )
      const c1 = cookieDe(registro)
      const { tokenAcceso: t1 } = (await registro.json()) as { tokenAcceso: string }

      const me = await fetch(`${base}/api/me`, { headers: { authorization: `Bearer ${t1}` } })
      const refresco = await post("/api/auth/refrescar", undefined, c1)
      const c2 = cookieDe(refresco)
      const { tokenAcceso: t2 } = (await refresco.json()) as { tokenAcceso: string }
      const reutilizado = await post("/api/auth/refrescar", undefined, c1)
      const malo = await post(
        "/api/auth/login",
        JSON.stringify({ email, contrasena: `${contrasena}x` }),
      )
      const bueno = await post("/api/auth/login", JSON.stringify({ email, contrasena }))
      const c3 = cookieDe(bueno)
      const { tokenAcceso: t3 } = (await bueno.json()) as { tokenAcceso: string }
      const nulo = await post(
        "/api/auth/registro",
        JSON.stringify({ nombre: "Ana\u0000Log", email: emailNulo, contrasena: contrasenaNula }),
      )
      const malformado = await post(
        "/api/auth/registro",
        `{"nombre":"x","email":"${email}","contrasena":"${contrasenaMalformada}"`,
      )
      const corta = await post(
        "/api/auth/registro",
        JSON.stringify({
          nombre: "Corta",
          email: correoDePrueba("nunca"),
          contrasena: contrasenaCorta,
        }),
      )
      const salida = await post("/api/auth/logout", undefined, c3)
      const falso = await fetch(`${base}/api/me`, { headers: { authorization: `Bearer ${t1}x` } })

      secretos.push(t1, t2, t3, c1, c2, c3)
      secretos.push(...[c1, c2, c3].map((c) => createHash("sha256").update(c).digest("hex")))
      respuestas = {
        registro: registro.status,
        me: me.status,
        refresco: refresco.status,
        reutilizado: reutilizado.status,
        malo: malo.status,
        bueno: bueno.status,
        nulo: nulo.status,
        malformado: malformado.status,
        corta: corta.status,
        salida: salida.status,
        falso: falso.status,
      }

      // ¿Queda el userId en las líneas de log de la petición autenticada (ESSENTIALS > Operación)?
      const usuarioId = JSON.parse(
        Buffer.from(t1.split(".")[1] ?? "", "base64url").toString("utf8"),
      ) as { sub: string }
      usuarioSub = usuarioId.sub

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
    conUserId = usuarioSub !== "" && log.includes(usuarioSub)
  }, 120_000)

  afterAll(async () => {
    inicializarDb({ connectionString: cargarEnv().DATABASE_URL })
    await borrarUsuariosDePruebaPorCorreo(correos)
    await cerrarConexion()
  })

  it("el recorrido completo responde lo esperado (control)", () => {
    expect(respuestas).toMatchObject({
      registro: 201,
      me: 200,
      refresco: 200,
      reutilizado: 401,
      malo: 401,
      bueno: 200,
      malformado: 400,
      corta: 400,
      salida: 204,
      falso: 401,
    })
  })

  it("el log no contiene contraseñas, JWT, tokens de refresco ni sus hashes", () => {
    exigirLogCompleto()
    expect(log.length).toBeGreaterThan(0)
    for (const secreto of secretos) {
      expect(secreto.length).toBeGreaterThan(5)
      expect(log.includes(secreto), `aparece en el log: ${secreto.slice(0, 6)}…`).toBe(false)
    }
    expect(log).not.toMatch(
      /\$argon2id?\$|eyJhbGci|"contrasena"|"hashContrasena"|hash_contrasena|hash_token/,
    )
  })

  it("el log de una petición autenticada lleva el userId (ESSENTIALS > Operación: requestId y userId)", () => {
    exigirLogCompleto()
    expect(log).toContain('"requestId"')
    expect(conUserId).toBe(true)
  })
})

describe("ataque: arranque con configuración de production", () => {
  it("con el JWT_SECRET de .env.example la API no arranca y no imprime el secreto", async () => {
    const puerto = await puertoLibre()
    const { codigo, salida } = await ejecutar("src/server.ts", {
      NODE_ENV: "production",
      JWT_SECRET: JWT_SECRET_DE_EJEMPLO,
      PORT: String(puerto),
    })
    expect(codigo).toBe(1)
    expect(salida).toContain("JWT_SECRET: en production")
    expect(salida).not.toContain(JWT_SECRET_DE_EJEMPLO)
    expect(salida).not.toContain("Server listening")
  }, 90_000)
})

describe("ataque: scripts de administración", () => {
  it("seed:admin con un admin ya creado sale con código 1 y no imprime ADMIN_PASSWORD", async () => {
    inicializarDb({ connectionString: cargarEnv().DATABASE_URL })
    const hayAdmin = await existeAdmin()
    await cerrarConexion()
    // Sin admin, el script crearía uno real: esta prueba no escribe filas ajenas.
    if (!hayAdmin) return

    const { codigo, salida } = await ejecutar("src/scripts/seed-admin.ts", {})
    expect(codigo).toBe(1)
    expect(salida).toContain("Ya existe una cuenta de administrador")
    const contrasena = process.env.ADMIN_PASSWORD ?? ""
    expect(contrasena.length).toBeGreaterThanOrEqual(10)
    expect(salida.includes(contrasena)).toBe(false)
  }, 90_000)

  it("seed:admin con ADMIN_PASSWORD corta falla sin mostrar el valor", async () => {
    const corta = "Corta-9zq"
    const { codigo, salida } = await ejecutar("src/scripts/seed-admin.ts", {
      ADMIN_PASSWORD: corta,
    })
    expect(codigo).toBe(1)
    expect(salida).toContain("ADMIN_PASSWORD")
    expect(salida).not.toContain(corta)
  }, 90_000)
})
