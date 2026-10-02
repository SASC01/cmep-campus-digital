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

// Ataque del Tester (CLASES-c, ronda 2; punto 6 de la lista del manager y PA-10): la API real (tsx,
// un PID, sin shell, puerto libre, nivel trace) recibe los 400 de las correcciones de la ronda 1:
// cursor borrado en el muro y en los comentarios (T-29), tipo inválido, cuerpo que es un arreglo y
// descripción que no es texto (T-33), y un comentario solo de blancos y otro con CR (T-31). El log
// solo puede llevar la ruta y el código: ni JWT, ni cookies, ni contraseñas, ni correos, ni cuerpos.
// Mismo método de completitud que logs-muro-c-r1 (reescrito aquí: no se importa de ningún *.ataque).

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
    const borrable = await enviar("publicar borrable", "POST", muro, comoMaestra, {
      tipo: "material",
      titulo: tituloMaterial,
    })
    const { publicacion: aBorrar } = (await borrable.json()) as { publicacion: { id: string } }
    await enviar("borrar borrable", "DELETE", `${muro}/${aBorrar.id}`, comoMaestra)
    // T-29: los 400 del cursor borrado, en el muro y en los comentarios.
    await enviar("muro con cursor borrado", "GET", `${muro}?cursor=${aBorrar.id}`, comoAlumna)
    const comentarios = `${muro}/${publicacion.id}/comentarios`
    await enviar(
      "comentarios con cursor borrado",
      "GET",
      `${comentarios}?cursor=${aBorrar.id}`,
      comoAlumna,
    )
    // T-33: tipo inválido, cuerpo que es un arreglo y descripción que no es texto, con los textos.
    await enviar("tipo inválido", "POST", muro, comoMaestra, {
      tipo: "Anuncio",
      texto: textoAnuncio,
    })
    await enviar("cuerpo arreglo", "POST", comentarios, comoAlumna, [textoComentario])
    await enviar("descripción no texto", "POST", muro, comoMaestra, {
      tipo: "material",
      titulo: tituloMaterial,
      texto: { valor: textoAnuncio },
    })
    // T-31: solo blancos (400) y CR solo (201).
    await enviar("comentario en blanco", "POST", comentarios, comoAlumna, {
      texto: "\u{FEFF}\u{3000}\r\r",
    })
    await enviar("comentario con CR", "POST", comentarios, comoAlumna, {
      texto: `${textoComentario}\rsegunda`,
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
  await borrarMovimientosYClasesDePrueba(idsClases)
  await borrarUsuariosDePrueba(idsUsuarios)
  await cerrarConexion()
})

describe("ataque CLASES-c r2: los 400 del muro en el log de la API real (PA-10)", () => {
  it("el recorrido llegó con el resultado esperado (precondición)", () => {
    expect(estados).toEqual({
      "login la maestra": 200,
      "login la alumna": 200,
      "publicar anuncio": 201,
      "publicar borrable": 201,
      "borrar borrable": 204,
      "muro con cursor borrado": 400,
      "comentarios con cursor borrado": 400,
      "tipo inválido": 400,
      "cuerpo arreglo": 400,
      "descripción no texto": 400,
      "comentario en blanco": 400,
      "comentario con CR": 201,
    })
    expect(faltante, `log incompleto: ${String(faltante)}`).toBeNull()
    const delMuro = lineasCompletas(log).filter(
      (l) => l.msg === "incoming request" && l.req?.url?.includes("/api/clases/") === true,
    )
    expect(delMuro).toHaveLength(10)
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

  it("ningún cuerpo (válido o rechazado) aparece en el log", () => {
    expect(faltante, `log incompleto: ${String(faltante)}`).toBeNull()
    expect(textos.length).toBe(3)
    for (const [etiqueta, valor] of textos) {
      expect(log.includes(valor), `el log contiene: ${etiqueta}`).toBe(false)
    }
  })
})
