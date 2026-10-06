import { claveDeNombre, errorApiSchema, normalizarTerminoDeBusqueda } from "@campus/shared"
import type { FastifyInstance, InjectOptions, LightMyRequestResponse } from "fastify"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { obtenerDb } from "../src/adapters/db/cliente.js"
import { construirApp } from "../src/app.js"
import { cargarEnv } from "../src/config/env.js"
import {
  borrarUsuariosDePrueba,
  crearUsuarioDePrueba,
  firmarTokenDePrueba,
  type UsuarioDePrueba,
} from "./ayudas-auth.js"
import {
  borrarMovimientosYClasesDePrueba,
  crearClaseDePrueba,
  inscribirDePrueba,
} from "./ayudas-clases.js"
import {
  crearCategoriaDePrueba,
  crearMaterialConTemaDePrueba,
  crearTemaDePrueba,
  leerTemaDb,
  listarCategoriasDb,
  listarTemasDb,
} from "./ayudas-tareas.js"

// Ataque del Tester, TAREAS-01a, ronda 2: el remedio de T-01 a T-04 en sus bordes (claveDeNombre e
// ids de la ruta y del cuerpo en minúsculas), sus hermanos (los cuatro sitios que comparan nombres y
// las seis rutas de temas y mover) y la ráfaga de más de 10 operaciones que la ronda 1 no cubrió.

let app: FastifyInstance | undefined
const idsUsuarios: string[] = []
const idsClases: string[] = []

const obtenerApp = (): FastifyInstance => {
  if (!app) throw new Error("La aplicación no se construyó en beforeAll")
  return app
}

beforeAll(async () => {
  app = await construirApp({ env: cargarEnv() })
  await app.ready()
})

afterAll(async () => {
  await borrarMovimientosYClasesDePrueba(idsClases)
  await borrarUsuariosDePrueba(idsUsuarios)
  await app?.close()
})

interface Escenario {
  claseId: string
  maestro: UsuarioDePrueba
  tokenMaestro: string
  tokenAlumno: string
}

const escenario = async (): Promise<Escenario> => {
  const maestro = await crearUsuarioDePrueba(idsUsuarios, { rol: "maestro", nombre: "Maestra R2" })
  const alumno = await crearUsuarioDePrueba(idsUsuarios, { nombre: "Alumno R2" })
  const clase = await crearClaseDePrueba(idsClases, { maestroId: maestro.id })
  await inscribirDePrueba(clase.id, alumno.id, "codigo")
  return {
    claseId: clase.id,
    maestro,
    tokenMaestro: await firmarTokenDePrueba({ usuarioId: maestro.id }),
    tokenAlumno: await firmarTokenDePrueba({ usuarioId: alumno.id }),
  }
}

type Metodo = "GET" | "POST" | "PUT" | "DELETE"

const peticion = (opciones: {
  method: Metodo
  url: string
  token: string
  payload?: InjectOptions["payload"]
}): Promise<LightMyRequestResponse> =>
  obtenerApp().inject({
    method: opciones.method,
    url: opciones.url,
    ...(opciones.payload === undefined ? {} : { payload: opciones.payload }),
    headers: {
      authorization: `Bearer ${opciones.token}`,
      ...(opciones.payload === undefined ? {} : { "content-type": "application/json" }),
    },
  })

const codigoDe = (respuesta: LightMyRequestResponse): string =>
  errorApiSchema.parse(respuesta.json()).error.codigo

const urlTemas = (claseId: string): string => `/api/clases/${claseId}/temas`
const urlTema = (claseId: string, temaId: string): string => `${urlTemas(claseId)}/${temaId}`
const urlMover = (claseId: string, publicacionId: string): string =>
  `/api/clases/${claseId}/publicaciones/${publicacionId}/tema`
const urlCategorias = (claseId: string): string => `/api/clases/${claseId}/categorias`

const crearTemaApi = (e: Escenario, nombre: string) =>
  peticion({ method: "POST", url: urlTemas(e.claseId), token: e.tokenMaestro, payload: { nombre } })
const renombrarApi = (e: Escenario, temaId: string, nombre: string) =>
  peticion({
    method: "PUT",
    url: urlTema(e.claseId, temaId),
    token: e.tokenMaestro,
    payload: { nombre },
  })
const guardarCategorias = (e: Escenario, categorias: unknown) =>
  peticion({
    method: "PUT",
    url: urlCategorias(e.claseId),
    token: e.tokenMaestro,
    payload: { categorias } as InjectOptions["payload"],
  })

// Mayúsculas y minúsculas alternadas en las letras de un UUID.
const mezclado = (id: string): string =>
  Array.from(id)
    .map((caracter, i) => (i % 2 === 0 ? caracter.toUpperCase() : caracter))
    .join("")

describe("ataque TAREAS-01a r2: claveDeNombre en combinación, en los cuatro sitios que comparan nombres", () => {
  // "Unidad 1" con: U ancha, ZWSP, mayúsculas, D + acento combinante, dos espacios y el 1 ancho.
  const COMBINADO = "\uFF35NI\u200BDAD\u0301  \uFF11"

  it("la clave del nombre combinado es la de «Unidad 1» (precondición del ataque)", () => {
    expect(claveDeNombre(COMBINADO)).toBe(claveDeNombre("Unidad 1"))
  })

  it("crear un tema y renombrar otro con el nombre combinado: 409 TEMA_REPETIDO; los nombres no cambian", async () => {
    const e = await escenario()
    expect((await crearTemaApi(e, "Unidad 1")).statusCode).toBe(201)
    const otro = await crearTemaDePrueba({ claseId: e.claseId, nombre: "Unidad 2", orden: 1 })
    const alCrear = await crearTemaApi(e, COMBINADO)
    const alRenombrar = await renombrarApi(e, otro.id, COMBINADO)
    expect([alCrear.statusCode, codigoDe(alCrear)]).toEqual([409, "TEMA_REPETIDO"])
    expect([alRenombrar.statusCode, codigoDe(alRenombrar)]).toEqual([409, "TEMA_REPETIDO"])
    expect((await listarTemasDb(e.claseId)).map(({ nombre }) => nombre)).toEqual([
      "Unidad 1",
      "Unidad 2",
    ])
  })

  it("guardar categorías con el nombre combinado junto a «Unidad 1» (refine del esquema) y frente a una que ya existe (core): 400 y nada cambia", async () => {
    const e = await escenario()
    const existente = await crearCategoriaDePrueba({
      claseId: e.claseId,
      nombre: "Unidad 1",
      peso: 100,
    })
    const mismoCuerpo = await guardarCategorias(e, [
      { nombre: "Unidad 1", peso: 50 },
      { nombre: COMBINADO, peso: 50 },
    ])
    const frenteALaExistente = await guardarCategorias(e, [
      { id: existente.id, nombre: "Unidad 1", peso: 40 },
      { nombre: COMBINADO, peso: 60 },
    ])
    for (const r of [mismoCuerpo, frenteALaExistente]) {
      expect([r.statusCode, codigoDe(r)]).toEqual([400, "VALIDACION"])
    }
    expect((await listarCategoriasDb(e.claseId)).map(({ nombre, peso }) => [nombre, peso])).toEqual(
      [["Unidad 1", 100]],
    )
  })

  it("renombrar un tema a su propio nombre con solo un invisible agregado pasa (no se cuenta a sí mismo) y guarda el nombre tal como llegó", async () => {
    const e = await escenario()
    const tema = await crearTemaDePrueba({ claseId: e.claseId, nombre: "Unidad 1" })
    await crearTemaDePrueba({ claseId: e.claseId, nombre: "Unidad 2", orden: 1 })
    const nuevo = "Uni\u200Bdad 1"
    const r = await renombrarApi(e, tema.id.toUpperCase(), nuevo)
    expect(r.statusCode).toBe(200)
    expect((r.json() as { tema: { nombre: string } }).tema.nombre).toBe(nuevo)
    expect((await leerTemaDb(tema.id))?.nombre).toBe(nuevo)
  })
})

describe("ataque TAREAS-01a r2: solo cambia la comparación; el nombre se guarda y se muestra íntegro", () => {
  it("un tema con ancho completo, acento, emoji con selector de variante y familia con ZWJ: la respuesta, GET …/temas y la base lo traen idéntico", async () => {
    const e = await escenario()
    const nombre = "\uFF27\uFF45\uFF4F á \u2B50\uFE0F \u{1F468}\u200D\u{1F469}\u200D\u{1F467}"
    const creado = await crearTemaApi(e, nombre)
    expect(creado.statusCode).toBe(201)
    const tema = (creado.json() as { tema: { id: string; nombre: string } }).tema
    expect(tema.nombre).toBe(nombre)
    const lista = await peticion({ method: "GET", url: urlTemas(e.claseId), token: e.tokenAlumno })
    expect((lista.json() as { temas: { nombre: string }[] }).temas.map((t) => t.nombre)).toEqual([
      nombre,
    ])
    expect((await leerTemaDb(tema.id))?.nombre).toBe(nombre)
  })

  it("una categoría con ancho completo y ZWJ se guarda y se lee idéntica", async () => {
    const e = await escenario()
    const nombre = "\uFF34\uFF41\uFF52\uFF45\uFF41\uFF53 \u{1F468}\u200D\u{1F4BB}"
    const r = await guardarCategorias(e, [{ nombre, peso: 100 }])
    expect(r.statusCode).toBe(200)
    expect((r.json() as { categorias: { nombre: string }[] }).categorias[0]?.nombre).toBe(nombre)
    expect((await listarCategoriasDb(e.claseId))[0]?.nombre).toBe(nombre)
  })

  it("la búsqueda de alumnos no cambió: normalizarTerminoDeBusqueda conserva el ancho completo y los invisibles (arbitraje de la ronda 1, punto 1)", () => {
    expect(normalizarTerminoDeBusqueda("\uFF2A\uFF4F\uFF53é")).toBe("\uFF4A\uFF4F\uFF53e")
    expect(normalizarTerminoDeBusqueda("Jo\u200Bsé  PÉREZ")).toBe("jo\u200Bse perez")
  })
})

describe("ataque TAREAS-01a r2: lo que la regla de shared/ llama «se ve vacío» y claveDeNombre no quita", () => {
  // shared/src/clases.ts: CARACTER_QUE_SE_VE_VACIO = Default_Ignorable + U+2800 + U+1D159.
  // claveDeNombre solo quita los Default_Ignorable.
  const VARIANTES = [
    ["U+2800 al final", "Unidad 1\u2800"],
    ["U+2800 en lugar del espacio", "Unidad\u28001"],
    ["U+1D159 al final", "Unidad 1\u{1D159}"],
  ] as const

  it("crear y renombrar un tema con U+2800 (blanco braille) o U+1D159 en lugar del espacio o al final de «Unidad 1»: 409 TEMA_REPETIDO", async () => {
    const e = await escenario()
    await crearTemaDePrueba({ claseId: e.claseId, nombre: "Unidad 1" })
    const otro = await crearTemaDePrueba({ claseId: e.claseId, nombre: "Unidad 2", orden: 1 })
    const fallas: string[] = []
    for (const [etiqueta, variante] of VARIANTES) {
      const alRenombrar = await renombrarApi(e, otro.id, variante)
      if (alRenombrar.statusCode !== 409) {
        fallas.push(`renombrar ${etiqueta}: ${String(alRenombrar.statusCode)}`)
        await obtenerDb().tema.update({ where: { id: otro.id }, data: { nombre: "Unidad 2" } })
      }
      const alCrear = await crearTemaApi(e, variante)
      if (alCrear.statusCode !== 409) {
        fallas.push(`crear ${etiqueta}: ${String(alCrear.statusCode)}`)
        await obtenerDb().tema.deleteMany({ where: { claseId: e.claseId, nombre: variante } })
      }
    }
    expect(fallas).toEqual([])
  })

  it("guardar dos categorías «Unidad 1» y su variante con U+2800 o U+1D159: 400 «No repitas el nombre de una categoría»", async () => {
    const e = await escenario()
    const fallas: string[] = []
    for (const [etiqueta, variante] of VARIANTES) {
      const r = await guardarCategorias(e, [
        { nombre: "Unidad 1", peso: 50 },
        { nombre: variante, peso: 50 },
      ])
      if (r.statusCode !== 400) fallas.push(`${etiqueta}: ${String(r.statusCode)}`)
    }
    expect(fallas).toEqual([])
  })
})

describe("ataque TAREAS-01a r2: ids de la ruta y del cuerpo en las seis rutas de temas y mover", () => {
  it("mayúsculas alternadas en :temaId (PUT y DELETE), en :publicacionId y en el temaId de mover: éxito, y mover responde los dos ids en minúsculas", async () => {
    const e = await escenario()
    const a = await crearTemaDePrueba({ claseId: e.claseId, nombre: "A" })
    const b = await crearTemaDePrueba({ claseId: e.claseId, nombre: "B", orden: 1 })
    const material = await crearMaterialConTemaDePrueba({
      claseId: e.claseId,
      autorId: e.maestro.id,
    })

    const renombrar = await renombrarApi(e, mezclado(a.id), "A bis")
    expect(renombrar.statusCode).toBe(200)
    expect((renombrar.json() as { tema: { id: string } }).tema.id).toBe(a.id)

    const mover = await peticion({
      method: "PUT",
      url: urlMover(e.claseId, mezclado(material)),
      token: e.tokenMaestro,
      payload: { temaId: mezclado(a.id) },
    })
    expect([mover.statusCode, mover.json()]).toEqual([
      200,
      { publicacionId: material, temaId: a.id },
    ])

    const aNull = await peticion({
      method: "PUT",
      url: urlMover(e.claseId, material.toUpperCase()),
      token: e.tokenMaestro,
      payload: { temaId: null },
    })
    expect([aNull.statusCode, aNull.json()]).toEqual([
      200,
      { publicacionId: material, temaId: null },
    ])

    const borrar = await peticion({
      method: "DELETE",
      url: urlTema(e.claseId, mezclado(b.id)),
      token: e.tokenMaestro,
    })
    expect(borrar.statusCode).toBe(204)
    expect(await leerTemaDb(b.id)).toBeNull()
  })

  it("UUID en forma no canónica (llaves, urn:uuid:, sin guiones, con salto o espacio codificado) en :temaId, :publicacionId y en el cuerpo de mover: 400 VALIDACION", async () => {
    const e = await escenario()
    const tema = await crearTemaDePrueba({ claseId: e.claseId, nombre: "Fijo" })
    const material = await crearMaterialConTemaDePrueba({
      claseId: e.claseId,
      autorId: e.maestro.id,
    })
    const formas = (id: string): [string, string][] => [
      ["llaves", `{${id}}`],
      ["urn", `urn:uuid:${id}`],
      ["sin guiones", id.replaceAll("-", "")],
      ["salto al final", `${id}\n`],
      ["espacio al final", `${id} `],
      ["mayúsculas con sufijo", `${id.toUpperCase()}A`],
    ]
    const fallas: string[] = []
    for (const [etiqueta, forma] of formas(tema.id)) {
      const enRuta = encodeURIComponent(forma)
      const casos: [string, LightMyRequestResponse][] = [
        ["PUT tema", await renombrarApi(e, enRuta, "Otro")],
        [
          "DELETE tema",
          await peticion({
            method: "DELETE",
            url: urlTema(e.claseId, enRuta),
            token: e.tokenMaestro,
          }),
        ],
        [
          "mover cuerpo",
          await peticion({
            method: "PUT",
            url: urlMover(e.claseId, material),
            token: e.tokenMaestro,
            payload: { temaId: forma },
          }),
        ],
      ]
      for (const [nombre, r] of casos) {
        if (r.statusCode !== 400) fallas.push(`${nombre} ${etiqueta}: ${String(r.statusCode)}`)
      }
    }
    for (const [etiqueta, forma] of formas(material)) {
      const r = await peticion({
        method: "PUT",
        url: urlMover(e.claseId, encodeURIComponent(forma)),
        token: e.tokenMaestro,
        payload: { temaId: null },
      })
      if (r.statusCode !== 400) fallas.push(`mover ruta ${etiqueta}: ${String(r.statusCode)}`)
    }
    expect(fallas).toEqual([])
    expect((await leerTemaDb(tema.id))?.nombre).toBe("Fijo")
  })

  it("UUID nulo y máximo en :temaId y en el cuerpo de mover: 404, nunca 400 ni 500", async () => {
    const e = await escenario()
    const material = await crearMaterialConTemaDePrueba({
      claseId: e.claseId,
      autorId: e.maestro.id,
    })
    const fallas: string[] = []
    for (const id of [
      "00000000-0000-0000-0000-000000000000",
      "ffffffff-ffff-ffff-ffff-ffffffffffff",
    ]) {
      const casos: [string, LightMyRequestResponse][] = [
        ["PUT tema", await renombrarApi(e, id, "Otro")],
        [
          "DELETE tema",
          await peticion({ method: "DELETE", url: urlTema(e.claseId, id), token: e.tokenMaestro }),
        ],
        [
          "mover cuerpo",
          await peticion({
            method: "PUT",
            url: urlMover(e.claseId, material),
            token: e.tokenMaestro,
            payload: { temaId: id },
          }),
        ],
        [
          "mover ruta",
          await peticion({
            method: "PUT",
            url: urlMover(e.claseId, id),
            token: e.tokenMaestro,
            payload: { temaId: null },
          }),
        ],
      ]
      for (const [nombre, r] of casos) {
        if (r.statusCode !== 404) fallas.push(`${nombre} ${id}: ${String(r.statusCode)}`)
      }
    }
    expect(fallas).toEqual([])
  })
})

describe("ataque TAREAS-01a r2: ráfaga de más de 10 operaciones sobre una clase (lo no atacado en la ronda 1)", () => {
  it(
    "15 operaciones simultáneas (crear, renombrar, borrar y ordenar temas, mover y guardar categorías): ninguna 5xx; órdenes sin repetir, tope respetado y categorías que suman 100",
    { timeout: 60_000 },
    async () => {
      const e = await escenario()
      const temas: string[] = []
      for (let i = 0; i < 6; i++) {
        temas.push(
          (await crearTemaDePrueba({ claseId: e.claseId, nombre: `Base ${String(i)}`, orden: i }))
            .id,
        )
      }
      const material = await crearMaterialConTemaDePrueba({
        claseId: e.claseId,
        autorId: e.maestro.id,
      })
      const [t0, t1, t2, t3] = temas
      if (!t0 || !t1 || !t2 || !t3) throw new Error("Precondición: faltan temas")
      const respuestas = await Promise.all([
        ...Array.from({ length: 5 }, (_, i) => crearTemaApi(e, `Ráfaga ${String(i)}`)),
        renombrarApi(e, t0, "Base cero"),
        renombrarApi(e, t1, "Base uno"),
        peticion({ method: "DELETE", url: urlTema(e.claseId, t2), token: e.tokenMaestro }),
        peticion({
          method: "PUT",
          url: `${urlTemas(e.claseId)}/orden`,
          token: e.tokenMaestro,
          payload: { temaIds: [...temas].reverse() },
        }),
        peticion({
          method: "PUT",
          url: urlMover(e.claseId, material),
          token: e.tokenMaestro,
          payload: { temaId: t3 },
        }),
        peticion({
          method: "PUT",
          url: urlMover(e.claseId, material),
          token: e.tokenMaestro,
          payload: { temaId: null },
        }),
        guardarCategorias(e, [{ nombre: "Todo", peso: 100 }]),
        guardarCategorias(e, [
          { nombre: "Mitad A", peso: 50 },
          { nombre: "Mitad B", peso: 50 },
        ]),
        guardarCategorias(e, [{ nombre: "Mala", peso: 90 }]),
        peticion({ method: "GET", url: urlTemas(e.claseId), token: e.tokenAlumno }),
      ])
      const estados = respuestas.map((r) => r.statusCode)
      expect(estados.filter((estado) => estado >= 500)).toEqual([])
      expect(estados.slice(0, 5)).toEqual([201, 201, 201, 201, 201])
      expect([200, 409]).toContain(estados[8])
      expect(estados[13]).toBe(400)
      const filas = await listarTemasDb(e.claseId)
      expect(filas.length).toBe(10)
      expect(new Set(filas.map(({ orden }) => orden)).size).toBe(10)
      const pesos = (await listarCategoriasDb(e.claseId)).map(({ peso }) => peso)
      expect(pesos.reduce((total, peso) => total + peso, 0)).toBe(100)
    },
  )
})
