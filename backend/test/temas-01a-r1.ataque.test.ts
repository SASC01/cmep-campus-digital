import { randomUUID } from "node:crypto"
import { readdirSync, readFileSync, statSync } from "node:fs"
import { join, relative, sep } from "node:path"
import { fileURLToPath } from "node:url"

import { errorApiSchema, listaTemasRespuestaSchema, temaRespuestaSchema } from "@campus/shared"
import type { FastifyInstance, InjectOptions, LightMyRequestResponse } from "fastify"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { obtenerDb } from "../src/adapters/db/cliente.js"
import { construirApp } from "../src/app.js"
import { cargarEnv } from "../src/config/env.js"
import { COLA_MATERIAL_CREADO } from "../src/core/eventos/avisos-de-clase.js"
import {
  borrarUsuariosDePrueba,
  crearUsuarioDePrueba,
  firmarTokenDePrueba,
  type UsuarioDePrueba,
} from "./ayudas-auth.js"
import {
  borrarMovimientosYClasesDePrueba,
  contarPublicaciones,
  crearClaseDePrueba,
  crearPublicacionDePrueba,
  inscribirDePrueba,
  leerPublicacionDb,
  leerTrabajosDeCola,
  tokenDelAdminDePrueba,
} from "./ayudas-clases.js"
import { formadasDetrasDe } from "./ayudas-concurrencia.js"
import {
  crearMaterialConTemaDePrueba,
  crearTareaDePrueba,
  crearTemaDePrueba,
  leerTemaDb,
  listarTemasDb,
} from "./ayudas-tareas.js"

// Ataque del Tester, TAREAS-01a, ronda 1: temas y mover un elemento de tema (§D-2, §D-7, §D-8,
// "Autorización" y "Puntos de ataque para el Tester" → 01a). Solo la base desechable; nada de
// producción se toca.

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
  otraClaseId: string
  maestro: UsuarioDePrueba
  alumno: UsuarioDePrueba
  tokenMaestro: string
  tokenAlumno: string
}

// El mismo maestro da las dos clases: el sexto paso pasa en las dos, así que solo el filtro por la
// clase de la ruta separa sus temas y publicaciones.
const escenario = async (): Promise<Escenario> => {
  const maestro = await crearUsuarioDePrueba(idsUsuarios, { rol: "maestro", nombre: "Maestra R1" })
  const alumno = await crearUsuarioDePrueba(idsUsuarios, { nombre: "Alumno R1" })
  const clase = await crearClaseDePrueba(idsClases, { maestroId: maestro.id })
  const otra = await crearClaseDePrueba(idsClases, { maestroId: maestro.id })
  await inscribirDePrueba(clase.id, alumno.id, "codigo")
  return {
    claseId: clase.id,
    otraClaseId: otra.id,
    maestro,
    alumno,
    tokenMaestro: await firmarTokenDePrueba({ usuarioId: maestro.id }),
    tokenAlumno: await firmarTokenDePrueba({ usuarioId: alumno.id }),
  }
}

type Metodo = "GET" | "HEAD" | "POST" | "PUT" | "DELETE"

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
const urlOrden = (claseId: string): string => `${urlTemas(claseId)}/orden`
const urlMover = (claseId: string, publicacionId: string): string =>
  `/api/clases/${claseId}/publicaciones/${publicacionId}/tema`
const urlMuro = (claseId: string): string => `/api/clases/${claseId}/publicaciones`

const crearTemaApi = (e: Escenario, nombre: string): Promise<LightMyRequestResponse> =>
  peticion({ method: "POST", url: urlTemas(e.claseId), token: e.tokenMaestro, payload: { nombre } })

const sembrarTemas = async (claseId: string, cantidad: number): Promise<string[]> => {
  const ids: string[] = []
  for (let i = 0; i < cantidad; i++) {
    ids.push((await crearTemaDePrueba({ claseId, nombre: `Sembrado ${String(i)}`, orden: i })).id)
  }
  return ids
}

const temaDeLaPublicacion = async (id: string): Promise<string | null | undefined> =>
  (await leerPublicacionDb(id))?.temaId

const esperar = (ms: number): Promise<void> => new Promise((resolver) => setTimeout(resolver, ms))

// Retiene, sin confirmar, el borrado de un tema y lanza una operación que lo usa. Espera a que la
// operación esté formada detrás de la fila (wait_event transactionid o tuple, nunca por cualquier
// bloqueo), confirma el borrado y devuelve la respuesta de la operación. Transacción con timeout
// explícito mayor que su espera más larga (AGENTS.md, "Bloqueos en las pruebas").
const conBorradoDelTemaRetenido = async (
  temaId: string,
  operacion: () => Promise<LightMyRequestResponse>,
): Promise<LightMyRequestResponse> => {
  let lanzada: Promise<LightMyRequestResponse> | undefined
  await obtenerDb().$transaction(
    async (tx) => {
      const borrados = await tx.$executeRaw`DELETE FROM temas WHERE id = ${temaId}::uuid`
      expect(borrados, "Precondición: el tema existía").toBe(1)
      const [propio] = await tx.$queryRaw<{ pid: number }[]>`SELECT pg_backend_pid() AS pid`
      if (!propio) throw new Error("Precondición: no se obtuvo el pid de la transacción retenedora")
      let terminada = false
      lanzada = operacion()
      lanzada.then(
        () => (terminada = true),
        () => (terminada = true),
      )
      const limite = Date.now() + 10_000
      let formada = false
      while (!formada && !terminada && Date.now() < limite) {
        formada = (await formadasDetrasDe(propio.pid)) >= 1
        if (!formada) await esperar(25)
      }
      expect(formada, "Precondición: la operación no llegó a esperar la fila del tema").toBe(true)
    },
    { timeout: 30_000, maxWait: 5_000 },
  )
  if (!lanzada) throw new Error("Precondición: la operación no se lanzó")
  return lanzada
}

describe("ataque TAREAS-01a r1: identificadores en mayúsculas (§D-2, «Un id de otra clase…»)", () => {
  it("renombrar con el temaId de la ruta en mayúsculas responde 200 y renombra, igual que en minúsculas", async () => {
    const e = await escenario()
    const creado = temaRespuestaSchema.parse((await crearTemaApi(e, "Unidad 1")).json()).tema

    const respuesta = await peticion({
      method: "PUT",
      url: urlTema(e.claseId, creado.id.toUpperCase()),
      token: e.tokenMaestro,
      payload: { nombre: "Unidad uno" },
    })

    expect([respuesta.statusCode, respuesta.body]).toEqual([200, expect.any(String)])
    expect((await leerTemaDb(creado.id))?.nombre).toBe("Unidad uno")
  })

  it("renombrar a su mismo nombre (otra capitalización) con el temaId en mayúsculas responde 200: no se cuenta a sí mismo", async () => {
    const e = await escenario()
    const creado = temaRespuestaSchema.parse((await crearTemaApi(e, "Unidad 1")).json()).tema

    const respuesta = await peticion({
      method: "PUT",
      url: urlTema(e.claseId, creado.id.toUpperCase()),
      token: e.tokenMaestro,
      payload: { nombre: "UNIDAD 1" },
    })

    expect(respuesta.statusCode).toBe(200)
    expect((await leerTemaDb(creado.id))?.nombre).toBe("UNIDAD 1")
  })

  it("mover con temaId y publicacionId en mayúsculas responde 200 y los dos ids en minúsculas (decisión 6 del resumen: el criterio de los ids de toda la API)", async () => {
    const e = await escenario()
    const [a] = await sembrarTemas(e.claseId, 1)
    if (!a) throw new Error("Precondición: falta el tema")
    const material = await crearMaterialConTemaDePrueba({
      claseId: e.claseId,
      autorId: e.maestro.id,
    })

    const mover = await peticion({
      method: "PUT",
      url: urlMover(e.claseId, material.toUpperCase()),
      token: e.tokenMaestro,
      payload: { temaId: a.toUpperCase() },
    })

    expect(mover.statusCode).toBe(200)
    expect(await temaDeLaPublicacion(material)).toBe(a)
    expect(mover.json()).toEqual({ publicacionId: material, temaId: a })
  })

  it("hermanos: borrar, ordenar y publicar un material aceptan ids en mayúsculas", async () => {
    const e = await escenario()
    const [a, b, c] = await sembrarTemas(e.claseId, 3)
    if (!a || !b || !c) throw new Error("Precondición: faltan temas sembrados")

    const orden = await peticion({
      method: "PUT",
      url: urlOrden(e.claseId.toUpperCase()),
      token: e.tokenMaestro,
      payload: { temaIds: [c, b, a].map((id) => id.toUpperCase()) },
    })
    expect(orden.statusCode).toBe(200)
    expect(listaTemasRespuestaSchema.parse(orden.json()).temas.map(({ id }) => id)).toEqual([
      c,
      b,
      a,
    ])

    const publicar = await peticion({
      method: "POST",
      url: urlMuro(e.claseId),
      token: e.tokenMaestro,
      payload: { tipo: "material", titulo: "Guía", archivoIds: [], temaId: b.toUpperCase() },
    })
    expect(publicar.statusCode).toBe(201)
    const publicacionId = (publicar.json() as { publicacion: { id: string } }).publicacion.id
    expect(await temaDeLaPublicacion(publicacionId)).toBe(b)

    const borrar = await peticion({
      method: "DELETE",
      url: urlTema(e.claseId, c.toUpperCase()),
      token: e.tokenMaestro,
    })
    expect(borrar.statusCode).toBe(204)
    expect(await leerTemaDb(c)).toBeNull()
  })

  it("ids con espacios, sufijos, llaves o sin guiones en la ruta y en el cuerpo responden 400 VALIDACION sin cambiar nada", async () => {
    const e = await escenario()
    const [tema] = await sembrarTemas(e.claseId, 1)
    if (!tema) throw new Error("Precondición: falta el tema")
    const material = await crearMaterialConTemaDePrueba({
      claseId: e.claseId,
      autorId: e.maestro.id,
    })
    const variantes = [
      ` ${tema}`,
      `${tema} `,
      `${tema}x`,
      `{${tema}}`,
      tema.replaceAll("-", ""),
      `${tema}%00`,
      `${tema.slice(0, -1)}g`,
    ]
    const fallas: string[] = []
    for (const variante of variantes) {
      const enRuta = encodeURIComponent(variante).replaceAll("%2500", "%00")
      const respuestas: [string, LightMyRequestResponse][] = [
        [
          "PUT tema",
          await peticion({
            method: "PUT",
            url: urlTema(e.claseId, enRuta),
            token: e.tokenMaestro,
            payload: { nombre: "Cambiado" },
          }),
        ],
        [
          "DELETE tema",
          await peticion({
            method: "DELETE",
            url: urlTema(e.claseId, enRuta),
            token: e.tokenMaestro,
          }),
        ],
        [
          "mover",
          await peticion({
            method: "PUT",
            url: urlMover(e.claseId, material),
            token: e.tokenMaestro,
            payload: { temaId: variante },
          }),
        ],
        [
          "orden",
          await peticion({
            method: "PUT",
            url: urlOrden(e.claseId),
            token: e.tokenMaestro,
            payload: { temaIds: [variante] },
          }),
        ],
        [
          "publicar",
          await peticion({
            method: "POST",
            url: urlMuro(e.claseId),
            token: e.tokenMaestro,
            payload: { tipo: "material", titulo: "Guía", archivoIds: [], temaId: variante },
          }),
        ],
      ]
      for (const [nombre, respuesta] of respuestas) {
        if (respuesta.statusCode !== 400 || codigoDe(respuesta) !== "VALIDACION") {
          fallas.push(`${nombre} «${variante}»: ${String(respuesta.statusCode)}`)
        }
      }
    }
    expect(fallas).toEqual([])
    expect((await leerTemaDb(tema))?.nombre).toBe("Sembrado 0")
    expect(await temaDeLaPublicacion(material)).toBeNull()
    expect(await contarPublicaciones(e.claseId)).toBe(1)
  })
})

describe("ataque TAREAS-01a r1: referencias cruzadas con el mismo maestro en las dos clases", () => {
  it("el tema y la publicación de la otra clase del mismo maestro: 404 en renombrar, borrar, mover y publicar; 409 en ordenar; nada cambia en ninguna", async () => {
    const e = await escenario()
    const [propio] = await sembrarTemas(e.claseId, 1)
    const [ajeno] = await sembrarTemas(e.otraClaseId, 1)
    if (!propio || !ajeno) throw new Error("Precondición: faltan temas")
    const materialPropio = await crearMaterialConTemaDePrueba({
      claseId: e.claseId,
      autorId: e.maestro.id,
    })
    const materialAjeno = await crearMaterialConTemaDePrueba({
      claseId: e.otraClaseId,
      autorId: e.maestro.id,
      temaId: ajeno,
    })

    const casos: [string, LightMyRequestResponse, number, string][] = [
      [
        "renombrar el tema ajeno",
        await peticion({
          method: "PUT",
          url: urlTema(e.claseId, ajeno),
          token: e.tokenMaestro,
          payload: { nombre: "Intruso" },
        }),
        404,
        "TEMA_NO_ENCONTRADO",
      ],
      [
        "borrar el tema ajeno",
        await peticion({ method: "DELETE", url: urlTema(e.claseId, ajeno), token: e.tokenMaestro }),
        404,
        "TEMA_NO_ENCONTRADO",
      ],
      [
        "mover lo propio al tema ajeno",
        await peticion({
          method: "PUT",
          url: urlMover(e.claseId, materialPropio),
          token: e.tokenMaestro,
          payload: { temaId: ajeno },
        }),
        404,
        "TEMA_NO_ENCONTRADO",
      ],
      [
        "mover lo ajeno por la clase propia",
        await peticion({
          method: "PUT",
          url: urlMover(e.claseId, materialAjeno),
          token: e.tokenMaestro,
          payload: { temaId: propio },
        }),
        404,
        "PUBLICACION_NO_ENCONTRADA",
      ],
      [
        "mover lo ajeno a Sin tema por la clase propia",
        await peticion({
          method: "PUT",
          url: urlMover(e.claseId, materialAjeno),
          token: e.tokenMaestro,
          payload: { temaId: null },
        }),
        404,
        "PUBLICACION_NO_ENCONTRADA",
      ],
      [
        "ordenar con el tema ajeno",
        await peticion({
          method: "PUT",
          url: urlOrden(e.claseId),
          token: e.tokenMaestro,
          payload: { temaIds: [propio, ajeno] },
        }),
        409,
        "ORDEN_DESACTUALIZADO",
      ],
      [
        "ordenar solo con el tema ajeno",
        await peticion({
          method: "PUT",
          url: urlOrden(e.claseId),
          token: e.tokenMaestro,
          payload: { temaIds: [ajeno] },
        }),
        409,
        "ORDEN_DESACTUALIZADO",
      ],
      [
        "publicar un material con el tema ajeno",
        await peticion({
          method: "POST",
          url: urlMuro(e.claseId),
          token: e.tokenMaestro,
          payload: { tipo: "material", titulo: "Guía", archivoIds: [], temaId: ajeno },
        }),
        404,
        "TEMA_NO_ENCONTRADO",
      ],
    ]
    expect(casos.map(([nombre, r]) => [nombre, r.statusCode, codigoDe(r)])).toEqual(
      casos.map(([nombre, , estado, codigo]) => [nombre, estado, codigo]),
    )
    expect((await leerTemaDb(ajeno))?.nombre).toBe("Sembrado 0")
    expect((await leerTemaDb(ajeno))?.claseId).toBe(e.otraClaseId)
    expect(await temaDeLaPublicacion(materialPropio)).toBeNull()
    expect(await temaDeLaPublicacion(materialAjeno)).toBe(ajeno)
    expect(await contarPublicaciones(e.claseId)).toBe(1)
    expect((await listarTemasDb(e.claseId)).map(({ id, orden }) => [id, orden])).toEqual([
      [propio, 0],
    ])
  })

  it("el mismo nombre de tema en dos clases distintas no es repetido", async () => {
    const e = await escenario()
    await crearTemaDePrueba({ claseId: e.otraClaseId, nombre: "Unidad 1" })
    const respuesta = await crearTemaApi(e, "Unidad 1")
    expect(respuesta.statusCode).toBe(201)
  })
})

describe("ataque TAREAS-01a r1: nombres repetidos (S-05)", () => {
  it("mayúsculas, acentos, espacios internos y de los extremos, NBSP, U+3000 y la forma NFD cuentan como el mismo nombre al crear y al renombrar", async () => {
    const e = await escenario()
    expect((await crearTemaApi(e, "Álgebra lineal")).statusCode).toBe(201)
    const otro = temaRespuestaSchema.parse((await crearTemaApi(e, "Geometría")).json()).tema
    const variantes = [
      "ÁLGEBRA LINEAL",
      "algebra lineal",
      "  Álgebra   lineal  ",
      "Álgebra\u00A0lineal",
      "Álgebra\u3000lineal",
      "A\u0301lgebra lineal",
      "Álgebra\tlineal",
    ]
    const fallas: string[] = []
    for (const variante of variantes) {
      const alCrear = await crearTemaApi(e, variante)
      if (alCrear.statusCode !== 409 || codigoDe(alCrear) !== "TEMA_REPETIDO") {
        fallas.push(`crear «${variante}»: ${String(alCrear.statusCode)}`)
      }
      const alRenombrar = await peticion({
        method: "PUT",
        url: urlTema(e.claseId, otro.id),
        token: e.tokenMaestro,
        payload: { nombre: variante },
      })
      if (alRenombrar.statusCode !== 409 || codigoDe(alRenombrar) !== "TEMA_REPETIDO") {
        fallas.push(`renombrar «${variante}»: ${String(alRenombrar.statusCode)}`)
      }
    }
    expect(fallas).toEqual([])
    expect((await listarTemasDb(e.claseId)).map(({ nombre }) => nombre)).toEqual([
      "Álgebra lineal",
      "Geometría",
    ])
  })

  it("un carácter invisible dentro del nombre (U+200B, U+00AD, U+200D, U+2060, U+FEFF) no lo vuelve otro: 409 TEMA_REPETIDO al crear y al renombrar", async () => {
    const e = await escenario()
    expect((await crearTemaApi(e, "Unidad 1")).statusCode).toBe(201)
    const otro = temaRespuestaSchema.parse((await crearTemaApi(e, "Unidad 2")).json()).tema
    const fallas: string[] = []
    // Cada intento se compara solo contra "Unidad 1": lo que se haya colado se deshace antes del
    // siguiente, para que un 409 no venga de chocar con la variante anterior.
    for (const invisible of ["\u200B", "\u00AD", "\u200D", "\u2060", "\uFEFF"]) {
      const variante = `Uni${invisible}dad 1`
      const punto = `U+${invisible.codePointAt(0)?.toString(16) ?? "?"}`
      const alRenombrar = await peticion({
        method: "PUT",
        url: urlTema(e.claseId, otro.id),
        token: e.tokenMaestro,
        payload: { nombre: variante },
      })
      if (alRenombrar.statusCode !== 409) {
        fallas.push(`renombrar ${punto}: ${String(alRenombrar.statusCode)}`)
        await obtenerDb().tema.update({ where: { id: otro.id }, data: { nombre: "Unidad 2" } })
      }
      const alCrear = await crearTemaApi(e, variante)
      if (alCrear.statusCode !== 409) {
        fallas.push(`crear ${punto}: ${String(alCrear.statusCode)}`)
        await obtenerDb().tema.deleteMany({ where: { claseId: e.claseId, nombre: variante } })
      }
    }
    expect(fallas).toEqual([])
    expect((await listarTemasDb(e.claseId)).map(({ nombre }) => nombre)).toEqual([
      "Unidad 1",
      "Unidad 2",
    ])
  })

  it("las formas de compatibilidad (ancho completo, ligaduras) no lo vuelven otro: 409 TEMA_REPETIDO", async () => {
    const e = await escenario()
    expect((await crearTemaApi(e, "Unidad 1 final")).statusCode).toBe(201)
    const fallas: string[] = []
    for (const variante of [
      "\uFF35\uFF4E\uFF49\uFF44\uFF41\uFF44 \uFF11 \uFF46\uFF49\uFF4E\uFF41\uFF4C",
      "Unidad 1 \uFB01nal",
      "Unidad \u2460 final",
    ]) {
      const respuesta = await crearTemaApi(e, variante)
      if (respuesta.statusCode !== 409)
        fallas.push(`«${variante}»: ${String(respuesta.statusCode)}`)
    }
    expect(fallas).toEqual([])
  })
})

describe("ataque TAREAS-01a r1: textos del nombre (S-05)", () => {
  it("saltos y separadores Unicode, controles, inversores de dirección y solo invisibles responden 400 VALIDACION sin crear nada", async () => {
    const e = await escenario()
    const invalidos = [
      "Unidad\n1",
      "Unidad\r1",
      "Unidad\u20281",
      "Unidad\u20291",
      "Unidad\u00851",
      "Unidad\u000B1",
      "Unidad\u000C1",
      "Unidad\u00001",
      "Unidad \u202E1",
      "Unidad \u20661\u2069",
      "\u200B\u200D\uFEFF",
      "   ",
      "",
    ]
    const fallas: string[] = []
    for (const nombre of invalidos) {
      const respuesta = await crearTemaApi(e, nombre)
      if (respuesta.statusCode !== 400 || codigoDe(respuesta) !== "VALIDACION") {
        fallas.push(`${JSON.stringify(nombre)}: ${String(respuesta.statusCode)}`)
      }
    }
    for (const cuerpo of [{}, { nombre: null }, { nombre: 5 }, { nombre: ["a"] }, null, "Unidad"]) {
      const respuesta = await peticion({
        method: "POST",
        url: urlTemas(e.claseId),
        token: e.tokenMaestro,
        payload: JSON.stringify(cuerpo),
      })
      if (respuesta.statusCode !== 400) {
        fallas.push(`cuerpo ${JSON.stringify(cuerpo)}: ${String(respuesta.statusCode)}`)
      }
    }
    expect(fallas).toEqual([])
    expect(await listarTemasDb(e.claseId)).toEqual([])
  })

  it("80 puntos de código (16 emojis de familia de 5 puntos cada uno) pasan y 81 no; un nombre con SQL se guarda literal", async () => {
    const e = await escenario()
    const familia = "\u{1F468}\u200D\u{1F469}\u200D\u{1F467}"
    expect(Array.from(familia.repeat(16)).length).toBe(80)
    expect((await crearTemaApi(e, familia.repeat(16))).statusCode).toBe(201)
    const largo = await crearTemaApi(e, `${familia.repeat(16)}a`)
    expect([largo.statusCode, codigoDe(largo)]).toEqual([400, "VALIDACION"])
    const sql = "x'); DROP TABLE temas; --"
    const conSql = await crearTemaApi(e, sql)
    expect(conSql.statusCode).toBe(201)
    expect(temaRespuestaSchema.parse(conSql.json()).tema.nombre).toBe(sql)
    expect((await listarTemasDb(e.claseId)).length).toBe(2)
  })
})

describe("ataque TAREAS-01a r1: orden (§D-2)", () => {
  it("repetido en otra capitalización, 31 ids, un tema borrado en medio, lista vacía o que no es lista: 400 o 409 y el orden no cambia", async () => {
    const e = await escenario()
    const ids = await sembrarTemas(e.claseId, 3)
    const [a, b, c] = ids
    if (!a || !b || !c) throw new Error("Precondición: faltan temas")
    const borrado = (await crearTemaDePrueba({ claseId: e.claseId, nombre: "Se borra", orden: 3 }))
      .id
    await obtenerDb().tema.delete({ where: { id: borrado } })

    const casos: [string, unknown, number, string][] = [
      ["repetido en mayúsculas", { temaIds: [a, b, c, a.toUpperCase()] }, 400, "VALIDACION"],
      ["31 ids", { temaIds: Array.from({ length: 31 }, () => randomUUID()) }, 400, "VALIDACION"],
      [
        "con un tema borrado en medio",
        { temaIds: [a, borrado, b, c] },
        409,
        "ORDEN_DESACTUALIZADO",
      ],
      ["faltante", { temaIds: [a, b] }, 409, "ORDEN_DESACTUALIZADO"],
      ["vacía", { temaIds: [] }, 400, "VALIDACION"],
      ["no es lista", { temaIds: a }, 400, "VALIDACION"],
      ["sin la clave", {}, 400, "VALIDACION"],
      ["con null", { temaIds: [a, b, null] }, 400, "VALIDACION"],
    ]
    const obtenidos: [string, number, string][] = []
    for (const [nombre, payload] of casos) {
      const r = await peticion({
        method: "PUT",
        url: urlOrden(e.claseId),
        token: e.tokenMaestro,
        payload: JSON.stringify(payload),
      })
      obtenidos.push([nombre, r.statusCode, codigoDe(r)])
    }
    expect(obtenidos).toEqual(casos.map(([nombre, , estado, codigo]) => [nombre, estado, codigo]))
    expect((await listarTemasDb(e.claseId)).map(({ id, orden }) => [id, orden])).toEqual([
      [a, 0],
      [b, 1],
      [c, 2],
    ])
  })

  it("«orden» como :temaId: DELETE responde 400 y no borra nada; PUT con cuerpo de orden reordena", async () => {
    const e = await escenario()
    const [a, b] = await sembrarTemas(e.claseId, 2)
    if (!a || !b) throw new Error("Precondición: faltan temas")
    const borrar = await peticion({
      method: "DELETE",
      url: `${urlTemas(e.claseId)}/orden`,
      token: e.tokenMaestro,
    })
    expect([borrar.statusCode, codigoDe(borrar)]).toEqual([400, "VALIDACION"])
    const borrarMayus = await peticion({
      method: "DELETE",
      url: `${urlTemas(e.claseId)}/ORDEN`,
      token: e.tokenMaestro,
    })
    expect(borrarMayus.statusCode).toBe(400)
    expect((await listarTemasDb(e.claseId)).length).toBe(2)
    const ordenar = await peticion({
      method: "PUT",
      url: urlOrden(e.claseId),
      token: e.tokenMaestro,
      payload: { temaIds: [b, a] },
    })
    expect(ordenar.statusCode).toBe(200)
    expect((await listarTemasDb(e.claseId)).map(({ id }) => id)).toEqual([b, a])
  })
})

describe("ataque TAREAS-01a r1: carreras (§D-7)", () => {
  it(
    "28 temas y cinco creaciones simultáneas: dos 201, tres 409 TOPE_DE_TEMAS, 30 temas con 30 órdenes distintos",
    { timeout: 60_000 },
    async () => {
      const e = await escenario()
      await sembrarTemas(e.claseId, 28)
      const respuestas = await Promise.all(
        Array.from({ length: 5 }, (_, i) => crearTemaApi(e, `Nuevo ${String(i)}`)),
      )
      const estados = respuestas.map((r) => r.statusCode).sort()
      expect(estados).toEqual([201, 201, 409, 409, 409])
      for (const r of respuestas.filter((r) => r.statusCode === 409)) {
        expect(codigoDe(r)).toBe("TOPE_DE_TEMAS")
      }
      const filas = await listarTemasDb(e.claseId)
      expect(filas.length).toBe(30)
      expect(new Set(filas.map(({ orden }) => orden)).size).toBe(30)
    },
  )

  it(
    "un reordenamiento y tres creaciones simultáneas: nunca 500, y al final los órdenes no se repiten",
    { timeout: 60_000 },
    async () => {
      const e = await escenario()
      const ids = await sembrarTemas(e.claseId, 5)
      const respuestas = await Promise.all([
        peticion({
          method: "PUT",
          url: urlOrden(e.claseId),
          token: e.tokenMaestro,
          payload: { temaIds: [...ids].reverse() },
        }),
        crearTemaApi(e, "Carrera A"),
        crearTemaApi(e, "Carrera B"),
        crearTemaApi(e, "Carrera C"),
      ])
      const [orden, ...creaciones] = respuestas
      if (!orden) throw new Error("Precondición: falta la respuesta del orden")
      expect([200, 409]).toContain(orden.statusCode)
      expect(creaciones.map((r) => r.statusCode)).toEqual([201, 201, 201])
      const filas = await listarTemasDb(e.claseId)
      expect(filas.length).toBe(8)
      expect(new Set(filas.map(({ orden: o }) => o)).size).toBe(8)
    },
  )

  it("dos borrados simultáneos del mismo tema: uno 204 y otro 404 TEMA_NO_ENCONTRADO", async () => {
    const e = await escenario()
    const [tema] = await sembrarTemas(e.claseId, 1)
    if (!tema) throw new Error("Precondición: falta el tema")
    const respuestas = await Promise.all([
      peticion({ method: "DELETE", url: urlTema(e.claseId, tema), token: e.tokenMaestro }),
      peticion({ method: "DELETE", url: urlTema(e.claseId, tema), token: e.tokenMaestro }),
    ])
    expect(respuestas.map((r) => r.statusCode).sort()).toEqual([204, 404])
    const segundo = respuestas.find((r) => r.statusCode === 404)
    if (!segundo) throw new Error("Precondición: falta el 404")
    expect(codigoDe(segundo)).toBe("TEMA_NO_ENCONTRADO")
  })

  it(
    "publicar un material con un tema cuyo borrado está en curso: espera al borrado y responde 404, sin publicación ni trabajo MATERIAL_CREADO",
    { timeout: 60_000 },
    async () => {
      const e = await escenario()
      const [tema] = await sembrarTemas(e.claseId, 1)
      if (!tema) throw new Error("Precondición: falta el tema")
      const titulo = `Material en carrera ${randomUUID()}`
      const respuesta = await conBorradoDelTemaRetenido(tema, () =>
        peticion({
          method: "POST",
          url: urlMuro(e.claseId),
          token: e.tokenMaestro,
          payload: { tipo: "material", titulo, archivoIds: [], temaId: tema },
        }),
      )
      expect([respuesta.statusCode, codigoDe(respuesta)]).toEqual([404, "TEMA_NO_ENCONTRADO"])
      expect(await contarPublicaciones(e.claseId)).toBe(0)
      expect(await leerTrabajosDeCola(COLA_MATERIAL_CREADO, "claseId", e.claseId)).toEqual([])
    },
  )

  it(
    "mover un material a un tema cuyo borrado está en curso: espera y responde 404 sin cambiar el material",
    { timeout: 60_000 },
    async () => {
      const e = await escenario()
      const [destino, origen] = await sembrarTemas(e.claseId, 2)
      if (!destino || !origen) throw new Error("Precondición: faltan temas")
      const material = await crearMaterialConTemaDePrueba({
        claseId: e.claseId,
        autorId: e.maestro.id,
        temaId: origen,
      })
      const respuesta = await conBorradoDelTemaRetenido(destino, () =>
        peticion({
          method: "PUT",
          url: urlMover(e.claseId, material),
          token: e.tokenMaestro,
          payload: { temaId: destino },
        }),
      )
      expect([respuesta.statusCode, codigoDe(respuesta)]).toEqual([404, "TEMA_NO_ENCONTRADO"])
      expect(await temaDeLaPublicacion(material)).toBe(origen)
    },
  )
})

describe("ataque TAREAS-01a r1: semántica de borrar y de los anuncios (§D-2)", () => {
  it("borrar un tema pasa a «Sin tema» sus materiales y tareas, los demás temas no cambian y los conteos cuadran para el alumno", async () => {
    const e = await escenario()
    const [uno, dos] = await sembrarTemas(e.claseId, 2)
    if (!uno || !dos) throw new Error("Precondición: faltan temas")
    const material = await crearMaterialConTemaDePrueba({
      claseId: e.claseId,
      autorId: e.maestro.id,
      temaId: uno,
    })
    const tarea = await crearTareaDePrueba({
      claseId: e.claseId,
      autorId: e.maestro.id,
      temaId: uno,
    })
    const enDos = await crearMaterialConTemaDePrueba({
      claseId: e.claseId,
      autorId: e.maestro.id,
      temaId: dos,
    })
    await crearPublicacionDePrueba({ claseId: e.claseId, autorId: e.maestro.id })

    const borrar = await peticion({
      method: "DELETE",
      url: urlTema(e.claseId, uno),
      token: e.tokenMaestro,
    })
    expect(borrar.statusCode).toBe(204)
    expect(await temaDeLaPublicacion(material)).toBeNull()
    expect(await temaDeLaPublicacion(tarea)).toBeNull()
    expect(await temaDeLaPublicacion(enDos)).toBe(dos)
    expect(await contarPublicaciones(e.claseId)).toBe(4)

    const lista = await peticion({ method: "GET", url: urlTemas(e.claseId), token: e.tokenAlumno })
    expect(lista.statusCode).toBe(200)
    expect(listaTemasRespuestaSchema.parse(lista.json())).toEqual({
      temas: [{ id: dos, nombre: "Sembrado 1", orden: 1, elementos: 1 }],
      sinTema: 2,
    })
  })

  it("un anuncio: mover a un tema o a null responde 409 ANUNCIO_SIN_TEMA; publicarlo con un temaId de otra clase o basura lo publica sin tema", async () => {
    const e = await escenario()
    const [tema] = await sembrarTemas(e.claseId, 1)
    const [ajeno] = await sembrarTemas(e.otraClaseId, 1)
    if (!tema || !ajeno) throw new Error("Precondición: faltan temas")
    const anuncio = await crearPublicacionDePrueba({ claseId: e.claseId, autorId: e.maestro.id })
    for (const temaId of [tema, null]) {
      const r = await peticion({
        method: "PUT",
        url: urlMover(e.claseId, anuncio),
        token: e.tokenMaestro,
        payload: { temaId },
      })
      expect([r.statusCode, codigoDe(r)]).toEqual([409, "ANUNCIO_SIN_TEMA"])
    }
    expect(await temaDeLaPublicacion(anuncio)).toBeNull()
    for (const temaId of [ajeno, "no-es-uuid", 5]) {
      const r = await peticion({
        method: "POST",
        url: urlMuro(e.claseId),
        token: e.tokenMaestro,
        payload: { tipo: "anuncio", texto: "Aviso", archivoIds: [], temaId },
      })
      expect(r.statusCode).toBe(201)
      const id = (r.json() as { publicacion: { id: string } }).publicacion.id
      expect(await temaDeLaPublicacion(id)).toBeNull()
    }
  })
})

describe("ataque TAREAS-01a r1: autorización y fugas en las seis rutas de temas y mover", () => {
  it("el estudiante inscrito no escribe en ninguna (403 ROL_NO_PERMITIDO) y ninguna respuesta lleva estadoPago, accesoRestringido, correos ni el rol", async () => {
    const e = await escenario()
    const [tema] = await sembrarTemas(e.claseId, 1)
    if (!tema) throw new Error("Precondición: falta el tema")
    const material = await crearMaterialConTemaDePrueba({
      claseId: e.claseId,
      autorId: e.maestro.id,
    })
    const escrituras: [Metodo, string, unknown][] = [
      ["POST", urlTemas(e.claseId), { nombre: "Del alumno" }],
      ["PUT", urlTema(e.claseId, tema), { nombre: "Del alumno" }],
      ["DELETE", urlTema(e.claseId, tema), undefined],
      ["PUT", urlOrden(e.claseId), { temaIds: [tema] }],
      ["PUT", urlMover(e.claseId, material), { temaId: tema }],
    ]
    for (const [method, url, payload] of escrituras) {
      const r = await peticion({
        method,
        url,
        token: e.tokenAlumno,
        ...(payload === undefined ? {} : { payload: payload as InjectOptions["payload"] }),
      })
      expect([`${method} ${url}`, r.statusCode, codigoDe(r)]).toEqual([
        `${method} ${url}`,
        403,
        "ROL_NO_PERMITIDO",
      ])
    }
    expect((await leerTemaDb(tema))?.nombre).toBe("Sembrado 0")
    expect(await temaDeLaPublicacion(material)).toBeNull()

    const tokenAdmin = await tokenDelAdminDePrueba()
    const cuerpos = [
      await peticion({ method: "GET", url: urlTemas(e.claseId), token: e.tokenAlumno }),
      await peticion({ method: "GET", url: urlTemas(e.claseId), token: tokenAdmin }),
      await peticion({
        method: "POST",
        url: urlTemas(e.claseId),
        token: tokenAdmin,
        payload: { nombre: "Del admin" },
      }),
      await peticion({
        method: "PUT",
        url: urlTema(e.claseId, tema),
        token: e.tokenMaestro,
        payload: { nombre: "Renombrado" },
      }),
      await peticion({
        method: "PUT",
        url: urlMover(e.claseId, material),
        token: tokenAdmin,
        payload: { temaId: tema },
      }),
    ]
    for (const r of cuerpos) {
      expect(r.statusCode).toBeLessThan(300)
      expect(r.body).not.toMatch(/estadoPago|accesoRestringido|email|correo|"rol"|@/)
    }
  })

  it("HEAD de …/temas: 200 sin cuerpo al alumno inscrito; 403 al alumno restringido y al maestro de otra clase", async () => {
    const e = await escenario()
    const restringido = await crearUsuarioDePrueba(idsUsuarios, { accesoRestringido: true })
    await inscribirDePrueba(e.claseId, restringido.id)
    const otroMaestro = await crearUsuarioDePrueba(idsUsuarios, { rol: "maestro" })
    const head = (token: string) => peticion({ method: "HEAD", url: urlTemas(e.claseId), token })
    const alumno = await head(e.tokenAlumno)
    expect([alumno.statusCode, alumno.body]).toEqual([200, ""])
    expect((await head(await firmarTokenDePrueba({ usuarioId: restringido.id }))).statusCode).toBe(
      403,
    )
    expect((await head(await firmarTokenDePrueba({ usuarioId: otroMaestro.id }))).statusCode).toBe(
      403,
    )
  })

  it("un maestro retirado de la clase (fila de maestros_de_clase borrada) ya no gestiona sus temas: 403 SIN_ACCESO_A_LA_CLASE", async () => {
    const maestro = await crearUsuarioDePrueba(idsUsuarios, { rol: "maestro" })
    const otro = await crearUsuarioDePrueba(idsUsuarios, { rol: "maestro" })
    const clase = await crearClaseDePrueba(idsClases, {
      maestroId: otro.id,
      maestroIds: [otro.id, maestro.id],
    })
    const [tema] = await sembrarTemas(clase.id, 1)
    if (!tema) throw new Error("Precondición: falta el tema")
    await obtenerDb().maestroDeClase.delete({
      where: { claseId_maestroId: { claseId: clase.id, maestroId: maestro.id } },
    })
    const token = await firmarTokenDePrueba({ usuarioId: maestro.id })
    const r = await peticion({
      method: "PUT",
      url: urlTema(clase.id, tema),
      token,
      payload: { nombre: "Del retirado" },
    })
    expect([r.statusCode, codigoDe(r)]).toEqual([403, "SIN_ACCESO_A_LA_CLASE"])
    expect((await leerTemaDb(tema))?.nombre).toBe("Sembrado 0")
  })
})

// Revisión estática (arquitectura) del código nuevo de 01a, sin comentarios.
const SRC = fileURLToPath(new URL("../src", import.meta.url))
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

describe("ataque TAREAS-01a r1: revisión estática de 01a", () => {
  // TAREAS-01b ronda 0 (C-7, §D-R0: reglas estáticas sobre los archivos de handlers/; §D-4 y
  // "Cambios por capa" de 01b): handlers/tareas/ gana tareas.ts (tareasHandler). Por diseño, ese
  // handler encola TAREA_CREADA y RECORDATORIO_24H y cancela recordatorios dentro de los callbacks
  // que pasa al adaptador (§D-0.4, §D-4, §D-5, como el muro), así que encolar( y cancelar( quedan
  // prohibidos solo en temas.ts y categorias.ts (organizar la clase no avisa a nadie). Lo demás que
  // protege no cambia y vale para los tres: ni SQL, ni el cliente de Prisma, ni roles, ni notifier.
  // ENTREGAS-01b ronda 0 (C-9, §D-R0 y "C-9: cambio por regla", Enmienda 3 del plan de ENTREGAS-01):
  // (1) el FOR KEY SHARE de la tarea de una entrega vive en adapters/db/entregas.ts (una sola función
  // privada, bloquearTareaParaEntregar), además de referencias.ts: la lista se compara ordenada;
  // (2) handlers/tareas/ suma entregas.ts y la regla prohibido no cambia; (3) encolar( se permite en
  // tareas.ts y entregas.ts (ENTREGA_REALIZADA va en el callback alGuardar, §D-0.4 y §D-5) y cancelar(
  // sigue siendo solo de tareas.ts (S-09: anular no cancela nada). bloquearClase y el conteo de
  // fuentes no cambian.
  it("FOR KEY SHARE solo en adapters/db/referencias.ts y entregas.ts; bloquearClase se define solo en bloqueo-clase.ts; los handlers de tareas no usan SQL, Prisma, roles ni notifier; los de temas y categorías no encolan y solo tareas.ts cancela", () => {
    expect(fuentes.length).toBeGreaterThan(20)
    expect(
      fuentes
        .filter(({ codigo }) => /FOR\s+KEY\s+SHARE/i.test(codigo))
        .map(({ ruta }) => ruta)
        .sort(),
    ).toEqual(["adapters/db/entregas.ts", "adapters/db/referencias.ts"])
    expect(
      fuentes
        .filter(({ codigo }) => /(const|function)\s+bloquearClase\b/.test(codigo))
        .map(({ ruta }) => ruta),
    ).toEqual(["adapters/db/bloqueo-clase.ts"])
    const handlers = fuentes.filter(({ ruta }) => ruta.startsWith("handlers/tareas/"))
    expect(handlers.map(({ ruta }) => ruta).sort()).toEqual([
      "handlers/tareas/categorias.ts",
      "handlers/tareas/entregas.ts",
      "handlers/tareas/tareas.ts",
      "handlers/tareas/temas.ts",
    ])
    const prohibido =
      /\$queryRaw|\$executeRaw|obtenerDb|adapters\/db\/cliente|@prisma|\.rol\b|"admin"\s*===|===\s*"(admin|maestro|estudiante)"|notifier/
    expect(handlers.filter(({ codigo }) => prohibido.test(codigo)).map(({ ruta }) => ruta)).toEqual(
      [],
    )
    const PUEDEN_ENCOLAR = ["handlers/tareas/entregas.ts", "handlers/tareas/tareas.ts"]
    expect(
      handlers
        .filter(({ ruta }) => !PUEDEN_ENCOLAR.includes(ruta))
        .filter(({ codigo }) => /encolar\(|cancelar\(/.test(codigo))
        .map(({ ruta }) => ruta),
    ).toEqual([])
    expect(
      handlers
        .filter(({ ruta }) => ruta !== "handlers/tareas/tareas.ts")
        .filter(({ codigo }) => /cancelar\(/.test(codigo))
        .map(({ ruta }) => ruta),
    ).toEqual([])
  })

  it("las consultas de temas.ts, categorias.ts y referencias.ts no viven dentro de un ciclo", () => {
    const archivos = fuentes.filter(({ ruta }) =>
      ["adapters/db/temas.ts", "adapters/db/categorias.ts", "adapters/db/referencias.ts"].includes(
        ruta,
      ),
    )
    expect(archivos.length).toBe(3)
    const conCiclo = archivos.filter(({ codigo }) =>
      /\b(for|while)\s*\([^)]*\)\s*\{[^}]*await\s/.test(codigo),
    )
    expect(conCiclo.map(({ ruta }) => ruta)).toEqual([])
    expect(
      archivos.filter(({ codigo }) => /\.forEach\([^)]*async/.test(codigo)).map(({ ruta }) => ruta),
    ).toEqual([])
  })
})
