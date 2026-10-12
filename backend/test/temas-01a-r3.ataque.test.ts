import { readdirSync, readFileSync, statSync } from "node:fs"
import { join, relative, sep } from "node:path"
import { fileURLToPath } from "node:url"

import { claveDeNombre, errorApiSchema, listaTemasRespuestaSchema } from "@campus/shared"
import type { FastifyInstance, InjectOptions, LightMyRequestResponse } from "fastify"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

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
  leerPublicacionDb,
} from "./ayudas-clases.js"
import {
  crearMaterialConTemaDePrueba,
  crearTareaDePrueba,
  crearTemaDePrueba,
  leerTemaDb,
  listarCategoriasDb,
  listarTemasDb,
} from "./ayudas-tareas.js"

// Ataque del Tester, TAREAS-01a, ronda 3 (última del tope): el remedio de T-05 en sus bordes, dentro
// de lo arbitrado (U+2800 y U+1D159 cuentan como espacio; los Default_Ignorable se quitan), y lo que
// faltaba de "Puntos de ataque" → 01a y de la lista general: SET NULL en carrera con publicaciones,
// conteos tras mover, idempotencia del orden, doble envío y la revisión estática final.

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
  const maestro = await crearUsuarioDePrueba(idsUsuarios, { rol: "maestro", nombre: "Maestra R3" })
  const alumno = await crearUsuarioDePrueba(idsUsuarios, { nombre: "Alumno R3" })
  const clase = await crearClaseDePrueba(idsClases, { maestroId: maestro.id })
  await inscribirDePrueba(clase.id, alumno.id, "codigo")
  return {
    claseId: clase.id,
    maestro,
    tokenMaestro: await firmarTokenDePrueba({ usuarioId: maestro.id }),
    tokenAlumno: await firmarTokenDePrueba({ usuarioId: alumno.id }),
  }
}

const peticion = (opciones: {
  method: "GET" | "HEAD" | "POST" | "PUT" | "DELETE"
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
const urlMuro = (claseId: string): string => `/api/clases/${claseId}/publicaciones`
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
const listarApi = async (e: Escenario, token = e.tokenMaestro) => {
  const r = await peticion({ method: "GET", url: urlTemas(e.claseId), token })
  expect(r.statusCode).toBe(200)
  return listaTemasRespuestaSchema.parse(r.json())
}

const BRAILLE = "\u2800"
const NULA = "\u{1D159}"

// Variantes de "Unidad 1" con U+2800 y U+1D159 al inicio, al final, repetidos, junto a espacios
// reales y mezclados con Default_Ignorable y NFD. Todas deben tener la clave de "Unidad 1".
const VARIANTES: readonly [string, string][] = [
  ["braille al inicio", `${BRAILLE}Unidad 1`],
  ["U+1D159 al inicio", `${NULA}Unidad 1`],
  ["braille repetido en lugar del espacio", `Unidad${BRAILLE}${BRAILLE}1`],
  ["braille junto a un espacio real", `Unidad ${BRAILLE} 1`],
  ["dos espacios reales y U+1D159 al final", `Unidad  1${NULA}${NULA}`],
  [
    "braille entre invisibles al inicio y al final",
    `\u200B${BRAILLE}\uFEFFUnidad 1\u2060${BRAILLE}`,
  ],
  ["NFD, ancho completo, ZWSP y braille", `\uFF35ni\u200Bda\u0301d${BRAILLE}\uFF11`],
]

describe("ataque TAREAS-01a r3: T-05 en sus bordes (U+2800 y U+1D159 cuentan como espacio)", () => {
  it("la clave de cada variante es la de «Unidad 1»: colapsa y recorta (precondición del ataque)", () => {
    const esperada = claveDeNombre("Unidad 1")
    expect(VARIANTES.map(([etiqueta, v]) => [etiqueta, claveDeNombre(v)])).toEqual(
      VARIANTES.map(([etiqueta]) => [etiqueta, esperada]),
    )
  })

  it("con «Unidad 1» en la clase, crear y renombrar otro tema con cada variante: 409 TEMA_REPETIDO; los nombres no cambian", async () => {
    const e = await escenario()
    await crearTemaDePrueba({ claseId: e.claseId, nombre: "Unidad 1" })
    const otro = await crearTemaDePrueba({ claseId: e.claseId, nombre: "Unidad 2", orden: 1 })
    const fallas: string[] = []
    for (const [etiqueta, variante] of VARIANTES) {
      const alCrear = await crearTemaApi(e, variante)
      if (alCrear.statusCode !== 409)
        fallas.push(`crear ${etiqueta}: ${String(alCrear.statusCode)}`)
      const alRenombrar = await renombrarApi(e, otro.id, variante)
      if (alRenombrar.statusCode !== 409) {
        fallas.push(`renombrar ${etiqueta}: ${String(alRenombrar.statusCode)}`)
      }
    }
    expect(fallas).toEqual([])
    expect((await listarTemasDb(e.claseId)).map(({ nombre }) => nombre)).toEqual([
      "Unidad 1",
      "Unidad 2",
    ])
  })

  it("renombrar «Unidad 1» a cada variante (a sí mismo): 200, y el nombre se guarda y se muestra íntegro, con sus blancos", async () => {
    const e = await escenario()
    const tema = await crearTemaDePrueba({ claseId: e.claseId, nombre: "Unidad 1" })
    await crearTemaDePrueba({ claseId: e.claseId, nombre: "Unidad 2", orden: 1 })
    const fallas: string[] = []
    for (const [etiqueta, variante] of VARIANTES) {
      const r = await renombrarApi(e, tema.id, variante)
      // El esquema recorta los espacios de los extremos (no los blancos U+2800 ni U+1D159).
      const guardado = (await leerTemaDb(tema.id))?.nombre
      const mostrado = (await listarApi(e, e.tokenAlumno)).temas.find(
        ({ id }) => id === tema.id,
      )?.nombre
      if (r.statusCode !== 200 || guardado !== variante.trim() || mostrado !== variante.trim()) {
        fallas.push(`${etiqueta}: ${String(r.statusCode)} ${JSON.stringify(guardado)}`)
      }
    }
    expect(fallas).toEqual([])
  })

  it("dos categorías equivalentes en un guardado («Unidad 1» y cada variante): 400 «No repitas el nombre de una categoría»; renombrar una categoría a su variante pasa", async () => {
    const e = await escenario()
    const fallas: string[] = []
    for (const [etiqueta, variante] of VARIANTES) {
      const r = await guardarCategorias(e, [
        { nombre: "Unidad 1", peso: 50 },
        { nombre: variante, peso: 50 },
      ])
      if (r.statusCode !== 400 || codigoDe(r) !== "VALIDACION") {
        fallas.push(`${etiqueta}: ${String(r.statusCode)}`)
      }
    }
    expect(fallas).toEqual([])
    expect(await listarCategoriasDb(e.claseId)).toEqual([])
    const creada = await guardarCategorias(e, [{ nombre: "Unidad 1", peso: 100 }])
    const id = (creada.json() as { categorias: { id: string }[] }).categorias[0]?.id
    if (!id) throw new Error("Precondición: no se creó la categoría")
    const variante = `Unidad${BRAILLE}1`
    const renombrada = await guardarCategorias(e, [{ id, nombre: variante, peso: 100 }])
    expect(renombrada.statusCode).toBe(200)
    expect((await listarCategoriasDb(e.claseId)).map(({ id: i, nombre }) => [i, nombre])).toEqual([
      [id, variante],
    ])
  })

  it("un nombre solo de U+2800, U+1D159, espacios e invisibles responde 400 VALIDACION en temas y en categorías", async () => {
    const e = await escenario()
    const vacio = `${BRAILLE} ${NULA}\u200B${BRAILLE}`
    const tema = await crearTemaApi(e, vacio)
    const categoria = await guardarCategorias(e, [{ nombre: vacio, peso: 100 }])
    expect([tema.statusCode, codigoDe(tema)]).toEqual([400, "VALIDACION"])
    expect([categoria.statusCode, codigoDe(categoria)]).toEqual([400, "VALIDACION"])
    expect(await listarTemasDb(e.claseId)).toEqual([])
  })
})

describe("ataque TAREAS-01a r3: SET NULL, conteos y doble envío (§D-2, §D-7)", () => {
  it(
    "borrar un tema con materiales mientras se publican cinco materiales con ese tema: nunca 500; cada publicación queda sin tema o no existe; el tema ya no existe",
    { timeout: 60_000 },
    async () => {
      const e = await escenario()
      const tema = await crearTemaDePrueba({ claseId: e.claseId, nombre: "Se borra" })
      const previos = await Promise.all(
        [0, 1].map(() =>
          crearMaterialConTemaDePrueba({
            claseId: e.claseId,
            autorId: e.maestro.id,
            temaId: tema.id,
          }),
        ),
      )
      const respuestas = await Promise.all([
        ...Array.from({ length: 5 }, (_, i) =>
          peticion({
            method: "POST",
            url: urlMuro(e.claseId),
            token: e.tokenMaestro,
            payload: {
              tipo: "material",
              titulo: `En carrera ${String(i)}`,
              archivoIds: [],
              temaId: tema.id,
            },
          }),
        ),
        peticion({ method: "DELETE", url: urlTema(e.claseId, tema.id), token: e.tokenMaestro }),
      ])
      const borrar = respuestas[5]
      if (!borrar) throw new Error("Precondición: falta la respuesta del borrado")
      expect(borrar.statusCode).toBe(204)
      const publicaciones = respuestas.slice(0, 5)
      expect(
        publicaciones.filter((r) => ![201, 404].includes(r.statusCode)).map((r) => r.statusCode),
      ).toEqual([])
      for (const r of publicaciones.filter((r) => r.statusCode === 404)) {
        expect(codigoDe(r)).toBe("TEMA_NO_ENCONTRADO")
      }
      const creadas = publicaciones
        .filter((r) => r.statusCode === 201)
        .map((r) => (r.json() as { publicacion: { id: string } }).publicacion.id)
      for (const id of [...previos, ...creadas]) {
        expect((await leerPublicacionDb(id))?.temaId, id).toBeNull()
      }
      expect(await leerTemaDb(tema.id)).toBeNull()
      const lista = await listarApi(e, e.tokenAlumno)
      expect(lista).toEqual({ temas: [], sinTema: previos.length + creadas.length })
    },
  )

  it("los conteos de GET …/temas siguen a cada movimiento (material y tarea, a otro tema y a Sin tema) y no cuentan anuncios; una query extra no cambia nada", async () => {
    const e = await escenario()
    const a = await crearTemaDePrueba({ claseId: e.claseId, nombre: "A" })
    const b = await crearTemaDePrueba({ claseId: e.claseId, nombre: "B", orden: 1 })
    const material = await crearMaterialConTemaDePrueba({
      claseId: e.claseId,
      autorId: e.maestro.id,
      temaId: a.id,
    })
    const tarea = await crearTareaDePrueba({
      claseId: e.claseId,
      autorId: e.maestro.id,
      temaId: a.id,
    })
    const anuncio = await peticion({
      method: "POST",
      url: urlMuro(e.claseId),
      token: e.tokenMaestro,
      payload: { tipo: "anuncio", texto: "Aviso", archivoIds: [] },
    })
    expect(anuncio.statusCode).toBe(201)
    const conteos = async () =>
      (await listarApi(e)).temas.map(({ nombre, elementos }) => [nombre, elementos])

    expect(await conteos()).toEqual([
      ["A", 2],
      ["B", 0],
    ])
    const mover = (id: string, temaId: string | null) =>
      peticion({
        method: "PUT",
        url: urlMover(e.claseId, id),
        token: e.tokenMaestro,
        payload: { temaId },
      })
    expect((await mover(material, b.id)).statusCode).toBe(200)
    expect(await conteos()).toEqual([
      ["A", 1],
      ["B", 1],
    ])
    expect((await mover(tarea, null)).statusCode).toBe(200)
    expect(await conteos()).toEqual([
      ["A", 0],
      ["B", 1],
    ])
    expect((await listarApi(e)).sinTema).toBe(1)
    const conQuery = await peticion({
      method: "GET",
      url: `${urlTemas(e.claseId)}?limite=-1&cursor=x'%3B--&orden=nombre`,
      token: e.tokenMaestro,
    })
    expect(conQuery.statusCode).toBe(200)
    expect(listaTemasRespuestaSchema.parse(conQuery.json()).temas.map(({ id }) => id)).toEqual([
      a.id,
      b.id,
    ])
  })

  it("PUT …/temas/orden repetido con el mismo cuerpo es idempotente: 200 las dos veces con la misma respuesta", async () => {
    const e = await escenario()
    const ids: string[] = []
    for (let i = 0; i < 4; i++) {
      ids.push(
        (await crearTemaDePrueba({ claseId: e.claseId, nombre: `T${String(i)}`, orden: i })).id,
      )
    }
    const cuerpo = { temaIds: [ids[2], ids[0], ids[3], ids[1]] }
    const ordenar = () =>
      peticion({
        method: "PUT",
        url: `${urlTemas(e.claseId)}/orden`,
        token: e.tokenMaestro,
        payload: cuerpo,
      })
    const primera = await ordenar()
    const segunda = await ordenar()
    expect([primera.statusCode, segunda.statusCode]).toEqual([200, 200])
    expect(segunda.json()).toEqual(primera.json())
    expect((await listarTemasDb(e.claseId)).map(({ id, orden }) => [id, orden])).toEqual(
      cuerpo.temaIds.map((id, orden) => [id, orden]),
    )
    const simultaneas = await Promise.all([ordenar(), ordenar(), ordenar()])
    expect(simultaneas.map((r) => r.statusCode)).toEqual([200, 200, 200])
  })

  it("doble envío: dos guardados idénticos de categorías sin ids a la vez dejan un solo juego (sin duplicados); dos movimientos del mismo material a temas distintos dejan uno de los dos", async () => {
    const e = await escenario()
    const cuerpo = [
      { nombre: "Tareas", peso: 40 },
      { nombre: "Examen", peso: 60 },
    ]
    const guardados = await Promise.all([
      guardarCategorias(e, cuerpo),
      guardarCategorias(e, cuerpo),
    ])
    expect(guardados.map((r) => r.statusCode)).toEqual([200, 200])
    expect((await listarCategoriasDb(e.claseId)).map(({ nombre, peso }) => [nombre, peso])).toEqual(
      [
        ["Tareas", 40],
        ["Examen", 60],
      ],
    )

    const a = await crearTemaDePrueba({ claseId: e.claseId, nombre: "A" })
    const b = await crearTemaDePrueba({ claseId: e.claseId, nombre: "B", orden: 1 })
    const material = await crearMaterialConTemaDePrueba({
      claseId: e.claseId,
      autorId: e.maestro.id,
    })
    const movimientos = await Promise.all(
      [a.id, b.id].map((temaId) =>
        peticion({
          method: "PUT",
          url: urlMover(e.claseId, material),
          token: e.tokenMaestro,
          payload: { temaId },
        }),
      ),
    )
    expect(movimientos.map((r) => r.statusCode)).toEqual([200, 200])
    expect([a.id, b.id]).toContain((await leerPublicacionDb(material))?.temaId)
  })
})

// Revisión estática final del backend (código de producción, sin pruebas ni el cliente generado).
const SRC = fileURLToPath(new URL("../src", import.meta.url))
const SHARED = fileURLToPath(new URL("../../shared/src", import.meta.url))
const listar = (directorio: string): string[] =>
  readdirSync(directorio).flatMap((nombre) => {
    const ruta = join(directorio, nombre)
    if (statSync(ruta).isDirectory()) {
      return nombre === "generated" || nombre === "node_modules" ? [] : listar(ruta)
    }
    return /\.ts$/.test(nombre) && !/\.test\.ts$/.test(nombre) ? [ruta] : []
  })
const sinComentarios = (texto: string): string =>
  texto.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`])\/\/.*$/gm, "$1")
const fuentes = listar(SRC).map((ruta) => ({
  ruta: relative(SRC, ruta).split(sep).join("/"),
  codigo: sinComentarios(readFileSync(ruta, "utf8")),
}))
const donde = (patron: RegExp): string[] =>
  fuentes.filter(({ codigo }) => patron.test(codigo)).map(({ ruta }) => ruta)

describe("ataque TAREAS-01a r3: revisión estática final", () => {
  it("$queryRawUnsafe solo en adapters/db/cliente.ts; Prisma, @prisma/adapter-pg y pg solo en adapters/", () => {
    expect(fuentes.length).toBeGreaterThan(20)
    expect(donde(/\$queryRawUnsafe|\$executeRawUnsafe/)).toEqual(["adapters/db/cliente.ts"])
    expect(
      donde(/from\s+["'](@prisma\/client|@prisma\/adapter-pg|pg)["']|generated\/client/).filter(
        (ruta) => !ruta.startsWith("adapters/"),
      ),
    ).toEqual([])
  })

  // TAREAS-01b ronda 0 (C-7, §D-R0, el más cercano: reglas estáticas sobre los archivos nuevos;
  // "Cambios por capa" de 01b): core/tareas/ gana tareas.ts, recordatorio.ts y texto.ts, y
  // handlers/tareas/ gana tareas.ts. La lista cerrada los suma; lo que protege no cambia (ni console.,
  // ni estadoPago, ni roles comparados a mano fuera de core/), y vale también para ellos.
  it("ningún archivo nuevo de 01a ni de 01b usa console., menciona estadoPago o compara un rol a mano; shared/src/tareas.ts tampoco usa console.", () => {
    const nuevos = fuentes.filter(({ ruta }) =>
      [
        "core/tareas/",
        "handlers/tareas/",
        "adapters/db/temas.ts",
        "adapters/db/categorias.ts",
        "adapters/db/referencias.ts",
        "adapters/db/bloqueo-clase.ts",
      ].some((prefijo) => ruta.startsWith(prefijo)),
    )
    expect(nuevos.map(({ ruta }) => ruta).sort()).toEqual([
      "adapters/db/bloqueo-clase.ts",
      "adapters/db/categorias.ts",
      "adapters/db/referencias.ts",
      "adapters/db/temas.ts",
      "core/tareas/categorias.ts",
      "core/tareas/recordatorio.ts",
      "core/tareas/tareas.ts",
      "core/tareas/temas.ts",
      "core/tareas/texto.ts",
      "handlers/tareas/categorias.ts",
      // ENTREGAS-01b ronda 0 (C-4, §D-R0; "Cambios por capa" de 01b del plan de ENTREGAS-01): el
      // handler de entregas. La regla de relacion === se conserva y lo cubre (alumnoDeLaRelacion vive
      // en core/, M-02 de la Enmienda 1).
      "handlers/tareas/entregas.ts",
      "handlers/tareas/tareas.ts",
      "handlers/tareas/temas.ts",
    ])
    expect(
      nuevos.filter(({ codigo }) => /console\.|estadoPago/.test(codigo)).map(({ ruta }) => ruta),
    ).toEqual([])
    expect(
      nuevos
        .filter(({ ruta }) => !ruta.startsWith("core/"))
        .filter(({ codigo }) =>
          /\.rol\b|relacion\s*===|===\s*"(admin|maestro|estudiante)"/.test(codigo),
        )
        .map(({ ruta }) => ruta),
    ).toEqual([])
    expect(/console\./.test(sinComentarios(readFileSync(join(SHARED, "tareas.ts"), "utf8")))).toBe(
      false,
    )
  })
})
