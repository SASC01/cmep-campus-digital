import { spawn } from "node:child_process"
import { randomBytes } from "node:crypto"
import { createServer } from "node:net"
import { fileURLToPath } from "node:url"

import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { inicializarAuth } from "../src/adapters/auth/index.js"
import { cerrarConexion, inicializarDb } from "../src/adapters/db/cliente.js"
import { opcionesDeAuth } from "../src/config/auth.js"
import { cargarEnv } from "../src/config/env.js"
import { borrarUsuariosDePrueba, crearUsuarioDePrueba } from "./ayudas-auth.js"
import {
  borrarMovimientosYClasesDePrueba,
  crearClaseDePrueba,
  inscribirDePrueba,
} from "./ayudas-clases.js"

// Ataque del Tester (CLASES-c, ronda 1; punto 10 del manager y PA-10): la API real (tsx, un PID,
// sin shell, puerto libre, nivel trace) recibe las 7 rutas del muro con el JWT y la cookie de
// refresco de un maestro y de una alumna. Ni los JWT, ni las cookies, ni las contraseñas, ni los
// correos, ni los textos de las publicaciones y comentarios deben aparecer en el log; el encolado
// solo puede dejar ids. Mismo método de completitud que logs-03c-r1 (reescrito aquí: no se importa
// de ningún *.ataque).

const DIRECTORIO_BACKEND = fileURLToPath(new URL("..", import.meta.url))
const env = cargarEnv()
const idsUsuarios: string[] = []
const idsClases: string[] = []

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

let log = ""
let faltante: string | null = "beforeAll no terminó"
const secretos: [string, string][] = []
const textos: [string, string][] = []
const estados: Record<string, number> = {}

beforeAll(async () => {
  inicializarDb({ connectionString: env.DATABASE_URL })
  await inicializarAuth(opcionesDeAuth(env))

  const marca = randomBytes(6).toString("hex")
  const maestro = await crearUsuarioDePrueba(idsUsuarios, {
    rol: "maestro",
    nombre: `Maestra Logs ${marca}`,
  })
  const alumna = await crearUsuarioDePrueba(idsUsuarios, { nombre: `Alumna Logs ${marca}` })
  const clase = await crearClaseDePrueba(idsClases, { maestroId: maestro.id })
  await inscribirDePrueba(clase.id, alumna.id, "codigo")
  secretos.push(
    ["contraseña de la maestra", maestro.contrasena],
    ["correo de la maestra", maestro.email],
    ["correo de la alumna", alumna.email],
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
    cabeceras: Record<string, string>,
    cuerpo?: unknown,
  ): Promise<Response> => {
    const respuesta = await fetch(`${base}${ruta}`, {
      method: metodo,
      headers: {
        ...(cuerpo === undefined ? {} : { "content-type": "application/json" }),
        ...cabeceras,
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
  const sesion = async (nombre: string, email: string, contrasena: string) => {
    const r = await enviar(`login ${nombre}`, "POST", "/api/auth/login", {}, { email, contrasena })
    const { tokenAcceso } = (await r.json()) as { tokenAcceso: string }
    const cookie = cookieDe(r)
    secretos.push([`JWT de ${nombre}`, tokenAcceso], [`cookie de ${nombre}`, cookie])
    return { authorization: `Bearer ${tokenAcceso}`, cookie: `campus_refresco=${cookie}` }
  }

  try {
    const inicio = Date.now()
    while (!log.includes("Server listening") && Date.now() - inicio < 45_000) {
      await new Promise((resolver) => setTimeout(resolver, 200))
    }
    if (!log.includes("Server listening")) throw new Error("La API no arrancó")

    const comoMaestra = await sesion("la maestra", maestro.email, maestro.contrasena)
    const comoAlumna = await sesion("la alumna", alumna.email, alumna.contrasena)
    const muro = `/api/clases/${clase.id}/publicaciones`
    const textoAnuncio = `anuncio-${marca}-privado`
    const tituloMaterial = `titulo-${marca}-privado`
    const textoComentario = `comentario-${marca}-privado`
    textos.push(
      ["texto del anuncio", textoAnuncio],
      ["título del material", tituloMaterial],
      ["texto del comentario", textoComentario],
    )
    const anuncio = await enviar("publicar anuncio", "POST", muro, comoMaestra, {
      tipo: "anuncio",
      texto: textoAnuncio,
    })
    const { publicacion } = (await anuncio.json()) as { publicacion: { id: string } }
    await enviar("publicar material", "POST", muro, comoMaestra, {
      tipo: "material",
      titulo: tituloMaterial,
    })
    await enviar("publicar inválido", "POST", muro, comoMaestra, {
      tipo: "anuncio",
      texto: `\u{200B}${textoAnuncio}\u{202E}`,
    })
    await enviar("leer muro", "GET", muro, comoAlumna)
    const comentarios = `${muro}/${publicacion.id}/comentarios`
    const comentario = await enviar("comentar", "POST", comentarios, comoAlumna, {
      texto: textoComentario,
    })
    const { comentario: creado } = (await comentario.json()) as { comentario: { id: string } }
    await enviar("leer comentarios", "GET", comentarios, comoMaestra)
    await enviar(
      "borrar mi comentario",
      "DELETE",
      `/api/clases/${clase.id}/mis-comentarios/${creado.id}`,
      comoAlumna,
    )
    await enviar("borrar publicación", "DELETE", `${muro}/${publicacion.id}`, comoMaestra)

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
  await borrarMovimientosYClasesDePrueba(idsClases)
  await borrarUsuariosDePrueba(idsUsuarios)
  await cerrarConexion()
})

describe("ataque CLASES-c r1: el muro en el log de la API real (PA-10)", () => {
  it("el recorrido llegó a las 7 rutas con el resultado esperado (precondición)", () => {
    expect(estados).toEqual({
      "login la maestra": 200,
      "login la alumna": 200,
      "publicar anuncio": 201,
      "publicar material": 201,
      "publicar inválido": 400,
      "leer muro": 200,
      comentar: 201,
      "leer comentarios": 200,
      "borrar mi comentario": 204,
      "borrar publicación": 204,
    })
    expect(faltante, `log incompleto: ${String(faltante)}`).toBeNull()
    const metodosDelMuro = lineasCompletas(log)
      .filter((l) => l.msg === "incoming request" && l.req?.url?.includes("/api/clases/") === true)
      .map((l) => l.req?.method)
    expect(metodosDelMuro).toHaveLength(8)
  })

  it("ningún JWT, cookie, contraseña ni correo aparece en el log", () => {
    expect(faltante, `log incompleto: ${String(faltante)}`).toBeNull()
    expect(secretos.length).toBe(7)
    for (const [etiqueta, valor] of secretos) {
      expect(valor.length, `valor vacío: ${etiqueta}`).toBeGreaterThan(8)
      expect(log.includes(valor), `el log contiene: ${etiqueta}`).toBe(false)
    }
    expect(/authorization|cookie/i.test(log), "el log contiene cabeceras de sesión").toBe(false)
  })

  it("ningún cuerpo del muro (anuncio, título ni comentario) aparece en el log", () => {
    expect(faltante, `log incompleto: ${String(faltante)}`).toBeNull()
    expect(textos.length).toBe(3)
    for (const [etiqueta, valor] of textos) {
      expect(log.includes(valor), `el log contiene: ${etiqueta}`).toBe(false)
    }
  })
})
