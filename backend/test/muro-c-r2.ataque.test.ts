import { randomUUID } from "node:crypto"
import { readdirSync, readFileSync, statSync } from "node:fs"
import { join } from "node:path"
import { fileURLToPath } from "node:url"

import { errorApiSchema, normalizarTextoLargo as normalizarDeShared } from "@campus/shared"
import type { FastifyInstance, LightMyRequestResponse } from "fastify"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { obtenerDb } from "../src/adapters/db/cliente.js"
import { construirApp } from "../src/app.js"
import { cargarEnv } from "../src/config/env.js"
import { normalizarTextoLargo as normalizarDeCore } from "../src/core/clases/texto.js"
import {
  borrarUsuariosDePrueba,
  crearUsuarioDePrueba,
  firmarTokenDePrueba,
  type UsuarioDePrueba,
} from "./ayudas-auth.js"
import {
  borrarMovimientosYClasesDePrueba,
  crearAlumnoDePrueba,
  crearClaseDePrueba,
  crearComentarioDePrueba,
  crearPublicacionDePrueba,
  inscribirDePrueba,
  leerComentarioDb,
  leerPublicacionDb,
} from "./ayudas-clases.js"

// Ataque del Tester (CLASES-c, ronda 2): las correcciones de T-29 (cursor por PK), T-31
// (normalizarTextoLargo en shared/) y T-33 (mensajes en español), con los bordes de la lista del
// manager. Cadenas con caracteres invisibles: siempre con escapes.

let app: FastifyInstance | undefined
const idsUsuarios: string[] = []
const idsClases: string[] = []

const obtenerApp = (): FastifyInstance => {
  if (!app) throw new Error("La aplicación no se construyó en beforeAll")
  return app
}

interface Escenario {
  claseId: string
  otraClaseId: string
  maestro: UsuarioDePrueba
  alumno: UsuarioDePrueba
  tokenMaestro: string
  tokenAlumno: string
}

// El maestro es dueño de las dos clases y la alumna está inscrita en las dos.
const escenario = async (): Promise<Escenario> => {
  const maestro = await crearUsuarioDePrueba(idsUsuarios, { rol: "maestro", nombre: "Maestra R2" })
  const clase = await crearClaseDePrueba(idsClases, { maestroId: maestro.id })
  const otra = await crearClaseDePrueba(idsClases, { maestroId: maestro.id, nombre: "Otra R2" })
  const alumno = await crearAlumnoDePrueba(idsUsuarios, { nombre: "Alumna R2" })
  await inscribirDePrueba(clase.id, alumno.id, "codigo")
  await inscribirDePrueba(otra.id, alumno.id, "codigo")
  return {
    claseId: clase.id,
    otraClaseId: otra.id,
    maestro,
    alumno,
    tokenMaestro: await firmarTokenDePrueba({ usuarioId: maestro.id }),
    tokenAlumno: await firmarTokenDePrueba({ usuarioId: alumno.id }),
  }
}

const pedir = (opciones: {
  method: "GET" | "POST" | "DELETE"
  url: string
  token: string
  payload?: object
  crudo?: string
}): Promise<LightMyRequestResponse> =>
  obtenerApp().inject({
    method: opciones.method,
    url: opciones.url,
    ...(opciones.payload === undefined ? {} : { payload: opciones.payload }),
    ...(opciones.crudo === undefined ? {} : { payload: opciones.crudo }),
    headers: {
      authorization: `Bearer ${opciones.token}`,
      ...(opciones.crudo === undefined ? {} : { "content-type": "application/json" }),
    },
  })

const codigoDe = (r: LightMyRequestResponse): string => errorApiSchema.parse(r.json()).error.codigo
const mensajeDe = (r: LightMyRequestResponse): string =>
  errorApiSchema.parse(r.json()).error.mensaje

const urlPublicaciones = (claseId: string): string => `/api/clases/${claseId}/publicaciones`
const urlComentarios = (claseId: string, publicacionId: string): string =>
  `/api/clases/${claseId}/publicaciones/${publicacionId}/comentarios`

const minutosAntes = (minutos: number): Date => new Date(Date.now() - minutos * 60_000)

const idsDe = (r: LightMyRequestResponse, clave: "publicaciones" | "comentarios"): string[] =>
  r.json<Record<string, { id: string }[]>>()[clave]?.map((fila) => fila.id) ?? []

// Mensajes de zod por defecto (en inglés) que no deben llegar a ningún 400 del muro.
const EN_INGLES = /Invalid|expected|received|discriminator|Required|Unrecognized/

beforeAll(async () => {
  app = await construirApp({ env: cargarEnv() })
  await app.ready()
})

afterAll(async () => {
  await borrarMovimientosYClasesDePrueba(idsClases)
  await borrarUsuariosDePrueba(idsUsuarios)
  await app?.close()
})

describe("ataque CLASES-c r2: bordes de T-29 (cursor por PK)", () => {
  it("regresión por la razón correcta: un cursor borrado responde 400 VALIDACION «cursor: no es válido» en el muro y en los comentarios", async () => {
    const e = await escenario()
    const publicacion = await crearPublicacionDePrueba({
      claseId: e.claseId,
      autorId: e.maestro.id,
    })
    const otra = await crearPublicacionDePrueba({ claseId: e.claseId, autorId: e.maestro.id })
    const comentario = await crearComentarioDePrueba({ publicacionId: otra, autorId: e.alumno.id })
    await obtenerDb().publicacion.delete({ where: { id: publicacion } })
    await obtenerDb().comentario.delete({ where: { id: comentario } })
    const muro = await pedir({
      method: "GET",
      url: `${urlPublicaciones(e.claseId)}?cursor=${publicacion}`,
      token: e.tokenAlumno,
    })
    const comentarios = await pedir({
      method: "GET",
      url: `${urlComentarios(e.claseId, otra)}?cursor=${comentario}`,
      token: e.tokenAlumno,
    })
    for (const r of [muro, comentarios]) {
      expect(r.statusCode).toBe(400)
      expect(codigoDe(r)).toBe("VALIDACION")
      expect(mensajeDe(r)).toBe("cursor: no es válido")
    }
  })

  it("varias páginas: borrar la primera fila de la página siguiente (no el cursor) no pierde ni duplica filas; borrar el cursor de la página 3 después de cargar la 2 responde 400", async () => {
    const e = await escenario()
    const ids: string[] = []
    for (const m of [60, 50, 40, 30, 20, 10]) {
      ids.push(
        await crearPublicacionDePrueba({
          claseId: e.claseId,
          autorId: e.maestro.id,
          creadoEn: minutosAntes(m),
        }),
      )
    }
    const [p1, p2, p3, p4, p5, p6] = ids as [string, string, string, string, string, string]
    const url = (cursor?: string) =>
      `${urlPublicaciones(e.claseId)}?limite=2${cursor === undefined ? "" : `&cursor=${cursor}`}`
    const pagina1 = await pedir({ method: "GET", url: url(), token: e.tokenAlumno })
    expect(idsDe(pagina1, "publicaciones")).toEqual([p6, p5])
    // Se borra la primera de la página siguiente, que no es el cursor.
    await obtenerDb().publicacion.delete({ where: { id: p4 } })
    const pagina2 = await pedir({ method: "GET", url: url(p5), token: e.tokenAlumno })
    expect(idsDe(pagina2, "publicaciones")).toEqual([p3, p2])
    expect(pagina2.json<{ siguienteCursor: string | null }>().siguienteCursor).toBe(p2)
    const pagina3 = await pedir({ method: "GET", url: url(p2), token: e.tokenAlumno })
    expect(idsDe(pagina3, "publicaciones")).toEqual([p1])
    expect(pagina3.json<{ siguienteCursor: string | null }>().siguienteCursor).toBeNull()
    // Ahora se borra el cursor que la persona usaría para la página 3.
    await obtenerDb().publicacion.delete({ where: { id: p2 } })
    const conBorrado = await pedir({ method: "GET", url: url(p2), token: e.tokenAlumno })
    expect(conBorrado.statusCode).toBe(400)
    expect(mensajeDe(conBorrado)).toBe("cursor: no es válido")
  })

  it("el cursor de una publicación de OTRA clase del mismo maestro, el de un comentario usado como cursor del muro y el de un comentario de otra publicación de la misma clase responden idéntico a un UUID inexistente", async () => {
    const e = await escenario()
    const propia = await crearPublicacionDePrueba({ claseId: e.claseId, autorId: e.maestro.id })
    const hermana = await crearPublicacionDePrueba({ claseId: e.claseId, autorId: e.maestro.id })
    const deLaOtraClase = await crearPublicacionDePrueba({
      claseId: e.otraClaseId,
      autorId: e.maestro.id,
    })
    const comentarioHermano = await crearComentarioDePrueba({
      publicacionId: hermana,
      autorId: e.alumno.id,
    })
    await crearComentarioDePrueba({ publicacionId: propia, autorId: e.alumno.id })
    const comoVe = async (url: string) => {
      const r = await pedir({ method: "GET", url, token: e.tokenAlumno })
      return { estado: r.statusCode, cuerpo: r.json<unknown>() }
    }
    const inexistenteMuro = await comoVe(`${urlPublicaciones(e.claseId)}?cursor=${randomUUID()}`)
    expect(inexistenteMuro.estado).toBe(400)
    expect(await comoVe(`${urlPublicaciones(e.claseId)}?cursor=${deLaOtraClase}`)).toEqual(
      inexistenteMuro,
    )
    expect(await comoVe(`${urlPublicaciones(e.claseId)}?cursor=${comentarioHermano}`)).toEqual(
      inexistenteMuro,
    )
    const inexistenteComentarios = await comoVe(
      `${urlComentarios(e.claseId, propia)}?cursor=${randomUUID()}`,
    )
    expect(inexistenteComentarios.estado).toBe(400)
    expect(
      await comoVe(`${urlComentarios(e.claseId, propia)}?cursor=${comentarioHermano}`),
    ).toEqual(inexistenteComentarios)
    expect(await comoVe(`${urlComentarios(e.claseId, propia)}?cursor=${hermana}`)).toEqual(
      inexistenteComentarios,
    )
  })

  it("la publicación de otra clase con un cursor válido de esa publicación responde 404 (la publicación se comprueba antes que el cursor), igual que sin cursor", async () => {
    const e = await escenario()
    const ajena = await crearPublicacionDePrueba({
      claseId: e.otraClaseId,
      autorId: e.maestro.id,
    })
    const comentario = await crearComentarioDePrueba({ publicacionId: ajena, autorId: e.alumno.id })
    const conCursor = await pedir({
      method: "GET",
      url: `${urlComentarios(e.claseId, ajena)}?cursor=${comentario}`,
      token: e.tokenAlumno,
    })
    const sinCursor = await pedir({
      method: "GET",
      url: urlComentarios(e.claseId, ajena),
      token: e.tokenAlumno,
    })
    expect([conCursor.statusCode, codigoDe(conCursor)]).toEqual([404, "PUBLICACION_NO_ENCONTRADA"])
    expect(conCursor.json<unknown>()).toEqual(sinCursor.json<unknown>())
  })
})

describe("ataque CLASES-c r2: T-33 con más tipos de valor (ningún 400 del muro en inglés)", () => {
  it("tipo numérico, nulo, arreglo, objeto, en mayúsculas o con espacios: «tipo: Elige si es un anuncio o un material»", async () => {
    const e = await escenario()
    const fallas: string[] = []
    for (const tipo of [1, null, [], {}, "Anuncio", " anuncio", "anuncio ", "MATERIAL", ""]) {
      const r = await pedir({
        method: "POST",
        url: urlPublicaciones(e.claseId),
        token: e.tokenMaestro,
        payload: { tipo, texto: "Hola" },
      })
      if (r.statusCode !== 400 || mensajeDe(r) !== "tipo: Elige si es un anuncio o un material")
        fallas.push(`${JSON.stringify(tipo)}: ${r.statusCode} ${r.body}`)
    }
    expect(fallas).toEqual([])
  })

  it("descripción del material y texto del comentario con booleano, objeto o arreglo: mensaje en español", async () => {
    const e = await escenario()
    const publicacionId = await crearPublicacionDePrueba({
      claseId: e.claseId,
      autorId: e.maestro.id,
    })
    const fallas: string[] = []
    for (const valor of [true, {}, ["a"], 0]) {
      const material = await pedir({
        method: "POST",
        url: urlPublicaciones(e.claseId),
        token: e.tokenMaestro,
        payload: { tipo: "material", titulo: "t", texto: valor },
      })
      if (
        material.statusCode !== 400 ||
        mensajeDe(material) !== "texto: La descripción debe ser texto"
      )
        fallas.push(`descripción ${JSON.stringify(valor)}: ${material.statusCode} ${material.body}`)
      const titulo = await pedir({
        method: "POST",
        url: urlPublicaciones(e.claseId),
        token: e.tokenMaestro,
        payload: { tipo: "material", titulo: valor },
      })
      if (
        titulo.statusCode !== 400 ||
        mensajeDe(titulo) !== "titulo: Escribe el título del material"
      )
        fallas.push(`título ${JSON.stringify(valor)}: ${titulo.statusCode} ${titulo.body}`)
      const comentario = await pedir({
        method: "POST",
        url: urlComentarios(e.claseId, publicacionId),
        token: e.tokenAlumno,
        payload: { texto: valor },
      })
      if (comentario.statusCode !== 400 || mensajeDe(comentario) !== "texto: Escribe tu comentario")
        fallas.push(
          `comentario ${JSON.stringify(valor)}: ${comentario.statusCode} ${comentario.body}`,
        )
    }
    expect(fallas).toEqual([])
  })

  it("un cuerpo que no es un objeto (cadena, número, null o arreglo) responde 400 en español en las dos rutas que crean", async () => {
    const e = await escenario()
    const publicacionId = await crearPublicacionDePrueba({
      claseId: e.claseId,
      autorId: e.maestro.id,
    })
    const fallas: string[] = []
    for (const crudo of ['"hola"', "5", "null", "[]", '["texto"]', '[{"texto":"hola"}]']) {
      for (const [ruta, url, token] of [
        ["publicaciones", urlPublicaciones(e.claseId), e.tokenMaestro],
        ["comentarios", urlComentarios(e.claseId, publicacionId), e.tokenAlumno],
      ] as const) {
        const r = await pedir({ method: "POST", url, token, crudo })
        if (r.statusCode !== 400) {
          fallas.push(`${ruta} ${crudo}: ${r.statusCode}`)
          continue
        }
        if (EN_INGLES.test(mensajeDe(r))) fallas.push(`${ruta} ${crudo}: «${mensajeDe(r)}»`)
      }
    }
    expect(fallas).toEqual([])
  })
})

describe("ataque CLASES-c r2: T-31 en el servidor (normalizarTextoLargo de shared/)", () => {
  it("normalizarTextoLargo de core/ es el mismo objeto que el de @campus/shared, y el frontend no tiene otra copia", () => {
    expect(normalizarDeCore).toBe(normalizarDeShared)
    const raiz = fileURLToPath(new URL("../../frontend/src", import.meta.url))
    const copias: string[] = []
    const recorrer = (dir: string) => {
      for (const nombre of readdirSync(dir)) {
        const ruta = join(dir, nombre)
        if (statSync(ruta).isDirectory()) {
          recorrer(ruta)
          continue
        }
        if (!/\.(ts|tsx)$/.test(nombre) || /\.test\.tsx?$/.test(nombre)) continue
        const contenido = readFileSync(ruta, "utf8")
        if (/\\r\\n\|\\r|normalizarTextoLargo\s*=/.test(contenido)) copias.push(ruta)
      }
    }
    recorrer(raiz)
    expect(statSync(raiz).isDirectory()).toBe(true)
    expect(copias).toEqual([])
  })

  it("CR solo, extremos en blanco (espacios, tabuladores, saltos, U+FEFF, U+00A0, U+3000) y saltos dentro del título: se guarda lo normalizado; solo blancos responde el mensaje del campo vacío", async () => {
    const e = await escenario()
    const publicacionId = await crearPublicacionDePrueba({
      claseId: e.claseId,
      autorId: e.maestro.id,
    })
    const blancos = "\u{FEFF}\u{A0}\u{3000}\t \r\n\r"
    const comentario = await pedir({
      method: "POST",
      url: urlComentarios(e.claseId, publicacionId),
      token: e.tokenAlumno,
      payload: { texto: `${blancos}uno\rdos\r\rtres${blancos}` },
    })
    expect(comentario.statusCode).toBe(201)
    const id = comentario.json<{ comentario: { id: string } }>().comentario.id
    expect((await leerComentarioDb(id))?.texto).toBe("uno\ndos\n\ntres")
    const material = await pedir({
      method: "POST",
      url: urlPublicaciones(e.claseId),
      token: e.tokenMaestro,
      payload: { tipo: "material", titulo: `${blancos}Unidad 1\rRepaso${blancos}`, texto: blancos },
    })
    expect(material.statusCode).toBe(201)
    const guardado = await leerPublicacionDb(
      material.json<{ publicacion: { id: string } }>().publicacion.id,
    )
    expect(guardado?.titulo).toBe("Unidad 1\nRepaso")
    expect(guardado?.texto).toBe("")
    const soloBlancos = await pedir({
      method: "POST",
      url: urlComentarios(e.claseId, publicacionId),
      token: e.tokenAlumno,
      payload: { texto: blancos },
    })
    expect([soloBlancos.statusCode, mensajeDe(soloBlancos)]).toEqual([
      400,
      "texto: Escribe tu comentario",
    ])
  })
})
