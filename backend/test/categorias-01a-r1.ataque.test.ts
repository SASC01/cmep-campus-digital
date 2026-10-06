import { randomUUID } from "node:crypto"

import { errorApiSchema, listaCategoriasRespuestaSchema } from "@campus/shared"
import type { FastifyInstance, InjectOptions, LightMyRequestResponse } from "fastify"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { enTransaccion, obtenerDb } from "../src/adapters/db/cliente.js"
import { bloquearCategoriaParaUsar } from "../src/adapters/db/referencias.js"
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
  tokenDelAdminDePrueba,
} from "./ayudas-clases.js"
import { formadasDetrasDe } from "./ayudas-concurrencia.js"
import { crearCategoriaDePrueba, crearTareaDePrueba, listarCategoriasDb } from "./ayudas-tareas.js"

// Ataque del Tester, TAREAS-01a, ronda 1: categorías ponderadas (§D-3, §D-7, §D-8, S-05, S-06,
// "Autorización" y "Puntos de ataque para el Tester" → 01a, punto 4). Solo la base desechable.

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

const escenario = async (): Promise<Escenario> => {
  const maestro = await crearUsuarioDePrueba(idsUsuarios, { rol: "maestro", nombre: "Maestro Cat" })
  const alumno = await crearUsuarioDePrueba(idsUsuarios, { nombre: "Alumna Cat" })
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

const peticion = (opciones: {
  method: "GET" | "HEAD" | "PUT"
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
const mensajeDe = (respuesta: LightMyRequestResponse): string =>
  errorApiSchema.parse(respuesta.json()).error.mensaje

const url = (claseId: string): string => `/api/clases/${claseId}/categorias`

const guardar = (e: Escenario, cuerpo: unknown, claseId = e.claseId) =>
  peticion({
    method: "PUT",
    url: url(claseId),
    token: e.tokenMaestro,
    payload: typeof cuerpo === "string" ? cuerpo : JSON.stringify(cuerpo),
  })

const estadoDb = async (claseId: string) =>
  (await listarCategoriasDb(claseId)).map(({ id, nombre, peso }) => ({ id, nombre, peso }))

const esperar = (ms: number): Promise<void> => new Promise((resolver) => setTimeout(resolver, ms))

describe("ataque TAREAS-01a r1: pesos (punto 4)", () => {
  it("decimales, negativos, texto, null, booleanos, 0, 101, cadenas numéricas y sumas de 100 con flotantes responden 400 VALIDACION y nada cambia", async () => {
    const e = await escenario()
    const actual = await crearCategoriaDePrueba({ claseId: e.claseId, nombre: "Previa", peso: 100 })
    const antes = await estadoDb(e.claseId)
    const listas: unknown[][] = [
      [33.3, 66.7],
      [50.5, 49.5],
      [-50, 150],
      ["50", "50"],
      [null, 100],
      [true, 99],
      [0, 100],
      [101, -1],
      [100.0000001],
      [Number.MAX_SAFE_INTEGER + 2, 100],
    ]
    const fallas: string[] = []
    for (const pesos of listas) {
      const r = await guardar(e, {
        categorias: pesos.map((peso, i) => ({ nombre: `Cat ${String(i)}`, peso })),
      })
      if (r.statusCode !== 400 || codigoDe(r) !== "VALIDACION") {
        fallas.push(`${JSON.stringify(pesos)}: ${String(r.statusCode)}`)
      }
    }
    for (const crudo of [
      '{"categorias":[{"nombre":"A","peso":1e309}]}',
      '{"categorias":[{"nombre":"A","peso":-0}]}',
      '{"categorias":[{"nombre":"A","peso":"1e2"}]}',
    ]) {
      const r = await guardar(e, crudo)
      if (r.statusCode !== 400) fallas.push(`${crudo}: ${String(r.statusCode)}`)
    }
    expect(fallas).toEqual([])
    expect(await estadoDb(e.claseId)).toEqual(antes)
    expect(antes.map(({ id }) => id)).toEqual([actual.id])
  })

  it("1e2 y 100.0 como número JSON valen 100; 33 + 33 + 34 pasa; una de 100 pasa; diez de 10 pasan; once responden 400", async () => {
    const e = await escenario()
    const exponente = await guardar(e, '{"categorias":[{"nombre":"Única","peso":1e2}]}')
    expect(exponente.statusCode).toBe(200)
    expect((await estadoDb(e.claseId)).map(({ peso }) => peso)).toEqual([100])
    expect((await guardar(e, '{"categorias":[{"nombre":"Única","peso":100.0}]}')).statusCode).toBe(
      200,
    )
    const tercios = await guardar(e, {
      categorias: [
        { nombre: "Tareas", peso: 33 },
        { nombre: "Exámenes", peso: 33 },
        { nombre: "Proyecto", peso: 34 },
      ],
    })
    expect(tercios.statusCode).toBe(200)
    const diez = await guardar(e, {
      categorias: Array.from({ length: 10 }, (_, i) => ({ nombre: `D${String(i)}`, peso: 10 })),
    })
    expect(diez.statusCode).toBe(200)
    const listaDiez = listaCategoriasRespuestaSchema.parse(diez.json()).categorias
    expect(listaDiez.map(({ nombre }) => nombre)).toEqual(
      Array.from({ length: 10 }, (_, i) => `D${String(i)}`),
    )
    const antes = await estadoDb(e.claseId)
    const once = await guardar(e, {
      categorias: [
        ...Array.from({ length: 9 }, (_, i) => ({ nombre: `O${String(i)}`, peso: 10 })),
        { nombre: "O9", peso: 5 },
        { nombre: "O10", peso: 5 },
      ],
    })
    expect([once.statusCode, codigoDe(once)]).toEqual([400, "VALIDACION"])
    expect(await estadoDb(e.claseId)).toEqual(antes)
  })
})

describe("ataque TAREAS-01a r1: ids dentro del cuerpo (referencias por id)", () => {
  it("el id de una categoría recién quitada responde 404 CATEGORIA_NO_ENCONTRADA y no cambia nada", async () => {
    const e = await escenario()
    const a = await crearCategoriaDePrueba({ claseId: e.claseId, nombre: "A", peso: 50 })
    const b = await crearCategoriaDePrueba({ claseId: e.claseId, nombre: "B", peso: 50 })
    expect(
      (await guardar(e, { categorias: [{ id: a.id, nombre: "A", peso: 100 }] })).statusCode,
    ).toBe(200)
    const antes = await estadoDb(e.claseId)
    const r = await guardar(e, {
      categorias: [
        { id: a.id, nombre: "A", peso: 50 },
        { id: b.id, nombre: "B", peso: 50 },
      ],
    })
    expect([r.statusCode, codigoDe(r)]).toEqual([404, "CATEGORIA_NO_ENCONTRADA"])
    expect(await estadoDb(e.claseId)).toEqual(antes)
  })

  it("ids en mayúsculas actualizan la misma fila (no crean otra) y la respuesta los da en minúsculas", async () => {
    const e = await escenario()
    const a = await crearCategoriaDePrueba({ claseId: e.claseId, nombre: "A", peso: 60 })
    const b = await crearCategoriaDePrueba({ claseId: e.claseId, nombre: "B", peso: 40 })
    const r = await guardar(e, {
      categorias: [
        { id: a.id.toUpperCase(), nombre: "A bis", peso: 30 },
        { id: b.id.toUpperCase(), nombre: "B bis", peso: 70 },
      ],
    })
    expect(r.statusCode).toBe(200)
    expect(listaCategoriasRespuestaSchema.parse(r.json()).categorias).toEqual([
      { id: a.id, nombre: "A bis", peso: 30, tareas: 0 },
      { id: b.id, nombre: "B bis", peso: 70, tareas: 0 },
    ])
  })

  it("ids con espacios, sufijos, llaves, sin guiones, null o repetidos en otra capitalización responden 400 VALIDACION y nada cambia", async () => {
    const e = await escenario()
    const a = await crearCategoriaDePrueba({ claseId: e.claseId, nombre: "A", peso: 100 })
    const antes = await estadoDb(e.claseId)
    const fallas: string[] = []
    for (const id of [
      ` ${a.id}`,
      `${a.id} `,
      `${a.id}0`,
      `{${a.id}}`,
      a.id.replaceAll("-", ""),
      null,
      5,
    ]) {
      const r = await guardar(e, { categorias: [{ id, nombre: "A", peso: 100 }] })
      if (r.statusCode !== 400) fallas.push(`${JSON.stringify(id)}: ${String(r.statusCode)}`)
    }
    const repetido = await guardar(e, {
      categorias: [
        { id: a.id, nombre: "A", peso: 50 },
        { id: a.id.toUpperCase(), nombre: "Otra", peso: 50 },
      ],
    })
    if (repetido.statusCode !== 400) fallas.push(`repetido: ${String(repetido.statusCode)}`)
    expect(fallas).toEqual([])
    expect(await estadoDb(e.claseId)).toEqual(antes)
  })

  it("el id de una categoría de la otra clase del mismo maestro responde 404 y ninguna de las dos clases cambia", async () => {
    const e = await escenario()
    const propia = await crearCategoriaDePrueba({ claseId: e.claseId, nombre: "Propia", peso: 100 })
    const ajena = await crearCategoriaDePrueba({
      claseId: e.otraClaseId,
      nombre: "Ajena",
      peso: 100,
    })
    const r = await guardar(e, {
      categorias: [
        { id: propia.id, nombre: "Propia", peso: 50 },
        { id: ajena.id, nombre: "Robada", peso: 50 },
      ],
    })
    expect([r.statusCode, codigoDe(r)]).toEqual([404, "CATEGORIA_NO_ENCONTRADA"])
    expect(await estadoDb(e.claseId)).toEqual([{ id: propia.id, nombre: "Propia", peso: 100 }])
    expect(await estadoDb(e.otraClaseId)).toEqual([{ id: ajena.id, nombre: "Ajena", peso: 100 }])
  })
})

describe("ataque TAREAS-01a r1: nombres (S-05)", () => {
  it("mayúsculas, acentos, espacios internos, NBSP, NFD y extremos en blanco cuentan como el mismo nombre: 400 sin cambios", async () => {
    const e = await escenario()
    const fallas: string[] = []
    for (const variante of [
      "EXÁMENES FINALES",
      "examenes finales",
      "Exámenes finales ",
      "  Exámenes   finales",
      "Exa\u0301menes finales",
      "Exámenes\u00A0finales",
      "Exámenes\tfinales",
    ]) {
      const r = await guardar(e, {
        categorias: [
          { nombre: "Exámenes finales", peso: 50 },
          { nombre: variante, peso: 50 },
        ],
      })
      if (
        r.statusCode !== 400 ||
        mensajeDe(r) !== "categorias: No repitas el nombre de una categoría"
      ) {
        fallas.push(`«${variante}»: ${String(r.statusCode)} ${r.body}`)
      }
    }
    expect(fallas).toEqual([])
    expect(await estadoDb(e.claseId)).toEqual([])
  })

  it("un carácter invisible dentro del nombre (U+200B, U+00AD, U+200D, U+2060, U+FEFF) no lo vuelve otro: 400 «No repitas el nombre de una categoría»", async () => {
    const e = await escenario()
    const fallas: string[] = []
    for (const invisible of ["\u200B", "\u00AD", "\u200D", "\u2060", "\uFEFF"]) {
      const r = await guardar(e, {
        categorias: [
          { nombre: "Exámenes", peso: 50 },
          { nombre: `Exá${invisible}menes`, peso: 50 },
        ],
      })
      if (r.statusCode !== 400) {
        fallas.push(`U+${invisible.codePointAt(0)?.toString(16) ?? "?"}: ${String(r.statusCode)}`)
      }
    }
    expect(fallas).toEqual([])
  })

  it("las formas de compatibilidad (ancho completo) no lo vuelven otro: 400 «No repitas el nombre de una categoría»", async () => {
    const e = await escenario()
    const r = await guardar(e, {
      categorias: [
        { nombre: "Tareas", peso: 50 },
        { nombre: "\uFF34\uFF41\uFF52\uFF45\uFF41\uFF53", peso: 50 },
      ],
    })
    expect(r.statusCode).toBe(400)
  })

  it("nombres: se guardan recortados; saltos de línea, inversores o solo invisibles y 61 puntos de código responden 400; intercambiar dos nombres en un guardado pasa", async () => {
    const e = await escenario()
    const a = await crearCategoriaDePrueba({ claseId: e.claseId, nombre: "Tareas", peso: 40 })
    const b = await crearCategoriaDePrueba({ claseId: e.claseId, nombre: "Examen", peso: 60 })
    const intercambio = await guardar(e, {
      categorias: [
        { id: a.id, nombre: "  Examen\r\n", peso: 40 },
        { id: b.id, nombre: "Tareas", peso: 60 },
      ],
    })
    expect(intercambio.statusCode).toBe(200)
    expect(await estadoDb(e.claseId)).toEqual([
      { id: a.id, nombre: "Examen", peso: 40 },
      { id: b.id, nombre: "Tareas", peso: 60 },
    ])
    const antes = await estadoDb(e.claseId)
    const fallas: string[] = []
    for (const nombre of [
      "Exa\nmen",
      "Exa\u2028men",
      "Exa\u202Emen",
      "\u200B\u2060",
      "a".repeat(61),
      "",
      5,
      null,
    ]) {
      const r = await guardar(e, { categorias: [{ nombre, peso: 100 }] })
      if (r.statusCode !== 400) fallas.push(`${JSON.stringify(nombre)}: ${String(r.statusCode)}`)
    }
    for (const cuerpo of [
      "null",
      "[]",
      '"x"',
      "{}",
      '{"categorias":null}',
      '{"categorias":{}}',
      '{"categorias":"[]"}',
    ]) {
      const r = await guardar(e, cuerpo)
      if (r.statusCode !== 400) fallas.push(`cuerpo ${cuerpo}: ${String(r.statusCode)}`)
    }
    expect(fallas).toEqual([])
    expect(await estadoDb(e.claseId)).toEqual(antes)
    const sesenta = await guardar(e, {
      categorias: [{ nombre: "\u{1F600}".repeat(60), peso: 100 }],
    })
    expect(sesenta.statusCode).toBe(200)
  })
})

describe("ataque TAREAS-01a r1: quitar categorías con tareas (P-01 a, §D-8)", () => {
  it("el mensaje dice «1 tarea» en singular y «2 tareas» en plural, con el nombre; con dos categorías con tareas, o con la lista vacía, 409 y nada cambia", async () => {
    const e = await escenario()
    const una = await crearCategoriaDePrueba({ claseId: e.claseId, nombre: "Quiz «A»", peso: 30 })
    const dos = await crearCategoriaDePrueba({ claseId: e.claseId, nombre: "Proyecto", peso: 30 })
    const libre = await crearCategoriaDePrueba({ claseId: e.claseId, nombre: "Libre", peso: 40 })
    await crearTareaDePrueba({ claseId: e.claseId, autorId: e.maestro.id, categoriaId: una.id })
    for (let i = 0; i < 2; i++) {
      await crearTareaDePrueba({ claseId: e.claseId, autorId: e.maestro.id, categoriaId: dos.id })
    }
    const antes = await estadoDb(e.claseId)

    const singular = await guardar(e, {
      categorias: [
        { id: dos.id, nombre: "Proyecto", peso: 60 },
        { id: libre.id, nombre: "Libre", peso: 40 },
      ],
    })
    expect([singular.statusCode, codigoDe(singular), mensajeDe(singular)]).toEqual([
      409,
      "CATEGORIA_CON_TAREAS",
      "«Quiz «A»» tiene 1 tarea. Muévelas a otra categoría antes de quitarla.",
    ])
    const plural = await guardar(e, {
      categorias: [
        { id: una.id, nombre: "Quiz «A»", peso: 60 },
        { id: libre.id, nombre: "Libre", peso: 40 },
      ],
    })
    expect([plural.statusCode, mensajeDe(plural)]).toEqual([
      409,
      "«Proyecto» tiene 2 tareas. Muévelas a otra categoría antes de quitarla.",
    ])
    for (const cuerpo of [
      { categorias: [{ id: libre.id, nombre: "Libre", peso: 100 }] },
      { categorias: [] },
      { categorias: [{ nombre: "Nueva", peso: 100 }] },
    ]) {
      const r = await guardar(e, cuerpo)
      expect([r.statusCode, codigoDe(r)]).toEqual([409, "CATEGORIA_CON_TAREAS"])
    }
    expect(await estadoDb(e.claseId)).toEqual(antes)

    const renombrar = await guardar(e, {
      categorias: [
        { id: una.id, nombre: "Quiz", peso: 20 },
        { id: dos.id, nombre: "Proyecto final", peso: 20 },
        { id: libre.id, nombre: "Libre", peso: 60 },
      ],
    })
    expect(renombrar.statusCode).toBe(200)
    expect(
      listaCategoriasRespuestaSchema.parse(renombrar.json()).categorias.map(({ tareas }) => tareas),
    ).toEqual([1, 2, 0])
  })

  it(
    "§D-7 al revés: con el borrado de la categoría en curso, bloquearCategoriaParaUsar espera y después devuelve false",
    { timeout: 60_000 },
    async () => {
      const e = await escenario()
      const categoria = await crearCategoriaDePrueba({ claseId: e.claseId, nombre: "Se va" })
      let lanzada: Promise<boolean> | undefined
      await obtenerDb().$transaction(
        async (tx) => {
          const borradas =
            await tx.$executeRaw`DELETE FROM categorias WHERE id = ${categoria.id}::uuid`
          expect(borradas, "Precondición: la categoría existía").toBe(1)
          const [propio] = await tx.$queryRaw<{ pid: number }[]>`SELECT pg_backend_pid() AS pid`
          if (!propio) throw new Error("Precondición: sin pid de la retenedora")
          let terminada = false
          lanzada = enTransaccion(obtenerDb(), (otra) =>
            bloquearCategoriaParaUsar(otra, { categoriaId: categoria.id, claseId: e.claseId }),
          )
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
          expect(formada, "Precondición: la lectura no esperó la fila de la categoría").toBe(true)
        },
        { timeout: 30_000, maxWait: 5_000 },
      )
      if (!lanzada) throw new Error("Precondición: la lectura no se lanzó")
      expect(await lanzada).toBe(false)
    },
  )
})

describe("ataque TAREAS-01a r1: guardados simultáneos (§D-7)", () => {
  it(
    "cinco guardados simultáneos con conjuntos y sumas distintas (uno inválido): ninguno 500, el inválido 400, y al final queda exactamente uno de los conjuntos válidos, que suma 100",
    { timeout: 60_000 },
    async () => {
      const e = await escenario()
      await crearCategoriaDePrueba({ claseId: e.claseId, nombre: "Inicial", peso: 100 })
      const conjuntos = [
        [{ nombre: "Uno", peso: 100 }],
        [
          { nombre: "Dos A", peso: 70 },
          { nombre: "Dos B", peso: 30 },
        ],
        [
          { nombre: "Tres A", peso: 20 },
          { nombre: "Tres B", peso: 30 },
          { nombre: "Tres C", peso: 50 },
        ],
        [],
      ]
      const respuestas = await Promise.all([
        ...conjuntos.map((categorias) => guardar(e, { categorias })),
        guardar(e, { categorias: [{ nombre: "Mala", peso: 99 }] }),
      ])
      expect(respuestas.map((r) => r.statusCode)).toEqual([200, 200, 200, 200, 400])
      const final = (await estadoDb(e.claseId)).map(({ nombre, peso }) => ({ nombre, peso }))
      expect(conjuntos).toContainEqual(final)
      const suma = final.reduce((total, { peso }) => total + peso, 0)
      expect(final.length === 0 || suma === 100).toBe(true)
    },
  )
})

describe("ataque TAREAS-01a r1: autorización y fugas de las dos rutas de categorías", () => {
  it("el estudiante inscrito y el restringido reciben 403 en GET, HEAD y PUT; el maestro de otra clase 403 SIN_ACCESO_A_LA_CLASE; nada cambia", async () => {
    const e = await escenario()
    const categoria = await crearCategoriaDePrueba({
      claseId: e.claseId,
      nombre: "Fija",
      peso: 100,
    })
    const restringido = await crearUsuarioDePrueba(idsUsuarios, { accesoRestringido: true })
    await inscribirDePrueba(e.claseId, restringido.id)
    const otroMaestro = await crearUsuarioDePrueba(idsUsuarios, { rol: "maestro" })
    const casos: [string, string, string][] = [
      ["alumno", e.tokenAlumno, "ROL_NO_PERMITIDO"],
      [
        "restringido",
        await firmarTokenDePrueba({ usuarioId: restringido.id }),
        "ACCESO_RESTRINGIDO",
      ],
      [
        "otro maestro",
        await firmarTokenDePrueba({ usuarioId: otroMaestro.id }),
        "SIN_ACCESO_A_LA_CLASE",
      ],
    ]
    for (const [quien, token, codigo] of casos) {
      for (const method of ["GET", "PUT"] as const) {
        const r = await peticion({
          method,
          url: url(e.claseId),
          token,
          ...(method === "PUT" ? { payload: { categorias: [] } } : {}),
        })
        expect([quien, method, r.statusCode, codigoDe(r)]).toEqual([quien, method, 403, codigo])
      }
      const head = await peticion({ method: "HEAD", url: url(e.claseId), token })
      expect([quien, "HEAD", head.statusCode]).toEqual([quien, "HEAD", 403])
    }
    expect(await estadoDb(e.claseId)).toEqual([{ id: categoria.id, nombre: "Fija", peso: 100 }])
  })

  it("el admin lee y guarda en la clase; en una clase inexistente recibe la misma respuesta que el maestro en una ajena; ninguna respuesta lleva estadoPago, correos ni el rol", async () => {
    const e = await escenario()
    const tokenAdmin = await tokenDelAdminDePrueba()
    const guardado = await peticion({
      method: "PUT",
      url: url(e.claseId),
      token: tokenAdmin,
      payload: { categorias: [{ nombre: "Del admin", peso: 100 }] },
    })
    expect(guardado.statusCode).toBe(200)
    const lectura = await peticion({ method: "GET", url: url(e.claseId), token: tokenAdmin })
    expect(lectura.statusCode).toBe(200)
    for (const r of [guardado, lectura]) {
      expect(r.body).not.toMatch(/estadoPago|accesoRestringido|email|correo|"rol"|@/)
    }
    const inexistente = await peticion({ method: "GET", url: url(randomUUID()), token: tokenAdmin })
    const otroMaestro = await crearUsuarioDePrueba(idsUsuarios, { rol: "maestro" })
    const ajena = await peticion({
      method: "GET",
      url: url(e.claseId),
      token: await firmarTokenDePrueba({ usuarioId: otroMaestro.id }),
    })
    expect([inexistente.statusCode, inexistente.body]).toEqual([ajena.statusCode, ajena.body])
    expect(inexistente.statusCode).toBe(403)
  })
})
