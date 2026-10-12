import { randomUUID } from "node:crypto"

import { errorApiSchema, listaCategoriasRespuestaSchema } from "@campus/shared"
import type { FastifyInstance, InjectOptions, LightMyRequestResponse } from "fastify"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { obtenerDb } from "../src/adapters/db/cliente.js"
import { bloquearCategoriaParaUsar, bloquearTemaParaUsar } from "../src/adapters/db/referencias.js"
import { construirApp } from "../src/app.js"
import { cargarEnv } from "../src/config/env.js"
import {
  borrarUsuariosDePrueba,
  crearUsuarioDePrueba,
  firmarTokenDePrueba,
  type UsuarioDePrueba,
} from "./ayudas-auth.js"
import { formadasDetrasDe } from "./ayudas-concurrencia.js"
import { borrarMovimientosYClasesDePrueba, crearClaseDePrueba } from "./ayudas-clases.js"
import {
  crearCategoriaDePrueba,
  crearTareaDePrueba,
  crearTemaDePrueba,
  leerTareaDb,
  listarCategoriasDb,
} from "./ayudas-tareas.js"

// TAREAS-01a. PR-1A07: categorías ponderadas (guardado en bloque) y las lecturas FOR KEY SHARE de
// adapters/db/referencias.ts.

let app: FastifyInstance | undefined
const idsUsuarios: string[] = []
const idsClases: string[] = []

const obtenerApp = (): FastifyInstance => {
  if (!app) throw new Error("La aplicación no se construyó en beforeAll")
  return app
}

interface Escenario {
  claseId: string
  maestro: UsuarioDePrueba
  tokenMaestro: string
}

const escenario = async (): Promise<Escenario> => {
  const maestro = await crearUsuarioDePrueba(idsUsuarios, {
    rol: "maestro",
    nombre: "Maestra Categorías",
  })
  const clase = await crearClaseDePrueba(idsClases, { maestroId: maestro.id })
  return {
    claseId: clase.id,
    maestro,
    tokenMaestro: await firmarTokenDePrueba({ usuarioId: maestro.id }),
  }
}

const peticion = (opciones: {
  method: "GET" | "PUT"
  url: string
  token: string
  payload?: InjectOptions["payload"]
}): Promise<LightMyRequestResponse> =>
  obtenerApp().inject({
    method: opciones.method,
    url: opciones.url,
    ...(opciones.payload === undefined ? {} : { payload: opciones.payload }),
    headers: { authorization: `Bearer ${opciones.token}` },
  })

const urlCategorias = (claseId: string): string => `/api/clases/${claseId}/categorias`

const guardar = (e: Escenario, categorias: unknown): Promise<LightMyRequestResponse> =>
  peticion({
    method: "PUT",
    url: urlCategorias(e.claseId),
    token: e.tokenMaestro,
    payload: { categorias },
  })

const leer = async (e: Escenario) => {
  const respuesta = await peticion({
    method: "GET",
    url: urlCategorias(e.claseId),
    token: e.tokenMaestro,
  })
  expect(respuesta.statusCode).toBe(200)
  return listaCategoriasRespuestaSchema.parse(respuesta.json()).categorias
}

const codigoDe = (respuesta: LightMyRequestResponse): string =>
  errorApiSchema.parse(respuesta.json()).error.codigo
const mensajeDe = (respuesta: LightMyRequestResponse): string =>
  errorApiSchema.parse(respuesta.json()).error.mensaje

beforeAll(async () => {
  app = await construirApp({ env: cargarEnv() })
  await app.ready()
})

afterAll(async () => {
  // N-10: clases (con sus categorías, temas y tareas en cascada) antes que los usuarios.
  await borrarMovimientosYClasesDePrueba(idsClases)
  await borrarUsuariosDePrueba(idsUsuarios)
  await app?.close()
})

describe("categorías (PR-1A07)", () => {
  it("PR-1A07: una clase sin categorías responde una lista vacía", async () => {
    const e = await escenario()

    expect(await leer(e)).toEqual([])
  })

  it("PR-1A07: PUT crea, renombra, cambia pesos y quita en una sola petición", async () => {
    const e = await escenario()
    const primera = await guardar(e, [
      { nombre: "Tareas", peso: 40 },
      { nombre: "Examen", peso: 30 },
      { nombre: "Participación", peso: 30 },
    ])
    expect(primera.statusCode).toBe(200)
    const [tareas, examen, participacion] = listaCategoriasRespuestaSchema.parse(
      primera.json(),
    ).categorias
    if (!tareas || !examen || !participacion) throw new Error("Precondición: 3 categorías")
    expect([tareas.nombre, examen.nombre, participacion.nombre]).toEqual([
      "Tareas",
      "Examen",
      "Participación",
    ])

    const segunda = await guardar(e, [
      { id: tareas.id, nombre: "Tareas y proyectos", peso: 50 },
      { id: examen.id, nombre: "Examen", peso: 20 },
      { nombre: "Proyecto final", peso: 30 },
    ])

    expect(segunda.statusCode).toBe(200)
    const categorias = listaCategoriasRespuestaSchema.parse(segunda.json()).categorias
    expect(categorias.map(({ nombre, peso, tareas: n }) => [nombre, peso, n])).toEqual([
      ["Tareas y proyectos", 50, 0],
      ["Examen", 20, 0],
      ["Proyecto final", 30, 0],
    ])
    expect(categorias[0]?.id).toBe(tareas.id)
    expect(categorias[1]?.id).toBe(examen.id)
    expect(categorias.map((categoria) => categoria.id)).not.toContain(participacion.id)
    expect(await leer(e)).toEqual(categorias)
    expect((await listarCategoriasDb(e.claseId)).map((fila) => fila.peso)).toEqual([50, 20, 30])
  })

  it("PR-1A07: las categorías nuevas conservan el orden en que se capturaron", async () => {
    const e = await escenario()
    const nombres = ["Zeta", "Alfa", "Medio", "Beta", "Omega"]

    const respuesta = await guardar(
      e,
      nombres.map((nombre) => ({ nombre, peso: 20 })),
    )

    expect(respuesta.statusCode).toBe(200)
    expect(
      listaCategoriasRespuestaSchema.parse(respuesta.json()).categorias.map((c) => c.nombre),
    ).toEqual(nombres)
  })

  it("PR-1A07: el nombre se guarda recortado", async () => {
    const e = await escenario()

    const respuesta = await guardar(e, [{ nombre: "  Examen \r\n", peso: 100 }])

    expect(respuesta.statusCode).toBe(200)
    expect(listaCategoriasRespuestaSchema.parse(respuesta.json()).categorias[0]?.nombre).toBe(
      "Examen",
    )
  })

  it("PR-1A07: GET trae las tareas de cada categoría", async () => {
    const e = await escenario()
    const a = await crearCategoriaDePrueba({
      claseId: e.claseId,
      nombre: "A",
      peso: 60,
      creadoEn: new Date(Date.now() - 2000),
    })
    const b = await crearCategoriaDePrueba({
      claseId: e.claseId,
      nombre: "B",
      peso: 40,
      creadoEn: new Date(Date.now() - 1000),
    })
    for (const categoriaId of [a.id, a.id, a.id, b.id]) {
      await crearTareaDePrueba({ claseId: e.claseId, autorId: e.maestro.id, categoriaId })
    }
    await crearTareaDePrueba({ claseId: e.claseId, autorId: e.maestro.id })

    const categorias = await leer(e)

    expect(categorias.map(({ id, tareas }) => [id, tareas])).toEqual([
      [a.id, 3],
      [b.id, 1],
    ])
  })

  it("PR-1A07: quitar una categoría con tareas responde 409 CATEGORIA_CON_TAREAS con su nombre y conteo, sin cambiar nada", async () => {
    const e = await escenario()
    const examen = await crearCategoriaDePrueba({ claseId: e.claseId, nombre: "Examen", peso: 50 })
    const tareas = await crearCategoriaDePrueba({ claseId: e.claseId, nombre: "Tareas", peso: 50 })
    await crearTareaDePrueba({ claseId: e.claseId, autorId: e.maestro.id, categoriaId: examen.id })
    await crearTareaDePrueba({ claseId: e.claseId, autorId: e.maestro.id, categoriaId: tareas.id })
    await crearTareaDePrueba({ claseId: e.claseId, autorId: e.maestro.id, categoriaId: tareas.id })
    const antes = await listarCategoriasDb(e.claseId)

    const unaTarea = await guardar(e, [{ id: tareas.id, nombre: "Renombrada", peso: 100 }])
    const dosTareas = await guardar(e, [{ id: examen.id, nombre: "Renombrada", peso: 100 }])

    expect(unaTarea.statusCode).toBe(409)
    expect(codigoDe(unaTarea)).toBe("CATEGORIA_CON_TAREAS")
    expect(mensajeDe(unaTarea)).toBe(
      "«Examen» tiene 1 tarea. Muévelas a otra categoría antes de quitarla.",
    )
    expect(dosTareas.statusCode).toBe(409)
    expect(mensajeDe(dosTareas)).toBe(
      "«Tareas» tiene 2 tareas. Muévelas a otra categoría antes de quitarla.",
    )
    expect(await listarCategoriasDb(e.claseId)).toEqual(antes)
  })

  it("PR-1A07: una lista vacía quita todas las categorías sin tareas y deja la clase sin categorías", async () => {
    const e = await escenario()
    await crearCategoriaDePrueba({ claseId: e.claseId, nombre: "Una", peso: 100 })

    const respuesta = await guardar(e, [])

    expect(respuesta.statusCode).toBe(200)
    expect(listaCategoriasRespuestaSchema.parse(respuesta.json()).categorias).toEqual([])
    expect(await listarCategoriasDb(e.claseId)).toHaveLength(0)
  })

  it("PR-1A07: una lista vacía con categorías que tienen tareas responde 409 y no cambia nada", async () => {
    const e = await escenario()
    const categoria = await crearCategoriaDePrueba({ claseId: e.claseId, nombre: "Una", peso: 100 })
    await crearTareaDePrueba({
      claseId: e.claseId,
      autorId: e.maestro.id,
      categoriaId: categoria.id,
    })

    const respuesta = await guardar(e, [])

    expect(respuesta.statusCode).toBe(409)
    expect(codigoDe(respuesta)).toBe("CATEGORIA_CON_TAREAS")
    expect(await listarCategoriasDb(e.claseId)).toHaveLength(1)
  })

  it("PR-1A07: un id de otra clase responde 404 CATEGORIA_NO_ENCONTRADA y no cambia nada", async () => {
    const e = await escenario()
    const otra = await escenario()
    const propia = await crearCategoriaDePrueba({ claseId: e.claseId, nombre: "Propia", peso: 100 })
    const ajena = await crearCategoriaDePrueba({
      claseId: otra.claseId,
      nombre: "Ajena",
      peso: 100,
    })

    for (const id of [ajena.id, randomUUID()]) {
      const respuesta = await guardar(e, [
        { id: propia.id, nombre: "Propia", peso: 50 },
        { id, nombre: "Intrusa", peso: 50 },
      ])
      expect(respuesta.statusCode).toBe(404)
      expect(codigoDe(respuesta)).toBe("CATEGORIA_NO_ENCONTRADA")
    }
    expect((await listarCategoriasDb(e.claseId)).map((fila) => [fila.nombre, fila.peso])).toEqual([
      ["Propia", 100],
    ])
    expect(
      (await listarCategoriasDb(otra.claseId)).map((fila) => [fila.nombre, fila.peso]),
    ).toEqual([["Ajena", 100]])
  })

  it("PR-1A07: pesos que no suman 100 responden 400 VALIDACION y no cambian nada", async () => {
    const e = await escenario()
    await crearCategoriaDePrueba({ claseId: e.claseId, nombre: "Actual", peso: 100 })

    for (const pesos of [[50, 49], [50, 51], [99], [60, 60]]) {
      const respuesta = await guardar(
        e,
        pesos.map((peso, i) => ({ nombre: `Nueva ${String(i)}`, peso })),
      )
      expect(respuesta.statusCode, pesos.join("+")).toBe(400)
      expect(codigoDe(respuesta)).toBe("VALIDACION")
      expect(mensajeDe(respuesta)).toBe("categorias: Los pesos deben sumar 100 %")
    }
    expect((await listarCategoriasDb(e.claseId)).map((fila) => fila.nombre)).toEqual(["Actual"])
  })

  it("PR-1A07: pesos con decimales, texto o fuera de rango, once categorías y nombres repetidos responden 400", async () => {
    const e = await escenario()
    const once = Array.from({ length: 11 }, (_, i) => ({ nombre: `C${String(i)}`, peso: 9 }))
    const casos: unknown[] = [
      [
        { nombre: "Uno", peso: 33.3 },
        { nombre: "Dos", peso: 66.7 },
      ],
      [{ nombre: "Uno", peso: "100" }],
      [
        { nombre: "Uno", peso: 0 },
        { nombre: "Dos", peso: 100 },
      ],
      once,
      [
        { nombre: "Uno", peso: 50 },
        { nombre: " UNO ", peso: 50 },
      ],
      [{ nombre: "Uno\nDos", peso: 100 }],
      "no es una lista",
    ]

    for (const categorias of casos) {
      const respuesta = await guardar(e, categorias)
      expect(respuesta.statusCode, JSON.stringify(categorias)).toBe(400)
      expect(codigoDe(respuesta)).toBe("VALIDACION")
    }
    expect(await listarCategoriasDb(e.claseId)).toHaveLength(0)
  })

  it("PR-1A07: dos guardados simultáneos quedan en serie y el resultado suma 100", async () => {
    const e = await escenario()

    const [uno, dos] = await Promise.all([
      guardar(e, [{ nombre: "Solo una", peso: 100 }]),
      guardar(e, [
        { nombre: "Mitad A", peso: 50 },
        { nombre: "Mitad B", peso: 50 },
      ]),
    ])

    expect(uno.statusCode).toBe(200)
    expect(dos.statusCode).toBe(200)
    const filas = await listarCategoriasDb(e.claseId)
    expect(filas.reduce((suma, fila) => suma + fila.peso, 0)).toBe(100)
    const nombres = filas.map((fila) => fila.nombre)
    expect(
      JSON.stringify(nombres) === JSON.stringify(["Solo una"]) ||
        JSON.stringify(nombres) === JSON.stringify(["Mitad A", "Mitad B"]),
    ).toBe(true)
  })

  it("PR-1A07: diez guardados simultáneos con sumas distintas nunca dejan una suma distinta de 100 ni 500", async () => {
    const e = await escenario()

    const respuestas = await Promise.all(
      Array.from({ length: 10 }, (_, i) =>
        guardar(e, [
          { nombre: `Primera ${String(i)}`, peso: 10 + i },
          { nombre: `Segunda ${String(i)}`, peso: 90 - i },
        ]),
      ),
    )

    for (const respuesta of respuestas) expect(respuesta.statusCode).toBe(200)
    const filas = await listarCategoriasDb(e.claseId)
    expect(filas).toHaveLength(2)
    expect(filas.reduce((suma, fila) => suma + fila.peso, 0)).toBe(100)
  })
})

describe("referencias FOR KEY SHARE (PR-1A07, Enmienda 1, M-03 a)", () => {
  it("PR-1A07: bloquearCategoriaParaUsar da true con una categoría de la clase y false con una de otra clase y con un id inexistente", async () => {
    const e = await escenario()
    const otra = await escenario()
    const propia = await crearCategoriaDePrueba({ claseId: e.claseId, peso: 100 })
    const ajena = await crearCategoriaDePrueba({ claseId: otra.claseId, peso: 100 })

    const resultados = await obtenerDb().$transaction(async (tx) => [
      await bloquearCategoriaParaUsar(tx, { categoriaId: propia.id, claseId: e.claseId }),
      await bloquearCategoriaParaUsar(tx, { categoriaId: ajena.id, claseId: e.claseId }),
      await bloquearCategoriaParaUsar(tx, { categoriaId: randomUUID(), claseId: e.claseId }),
    ])

    expect(resultados).toEqual([true, false, false])
  })

  it("PR-1A07: bloquearTemaParaUsar da true con un tema de la clase y false con uno de otra clase y con un id inexistente", async () => {
    const e = await escenario()
    const otra = await escenario()
    const propio = await crearTemaDePrueba({ claseId: e.claseId, orden: 0 })
    const ajeno = await crearTemaDePrueba({ claseId: otra.claseId, orden: 0 })

    const resultados = await obtenerDb().$transaction(async (tx) => [
      await bloquearTemaParaUsar(tx, { temaId: propio.id, claseId: e.claseId }),
      await bloquearTemaParaUsar(tx, { temaId: ajeno.id, claseId: e.claseId }),
      await bloquearTemaParaUsar(tx, { temaId: randomUUID(), claseId: e.claseId }),
    ])

    expect(resultados).toEqual([true, false, false])
  })

  it("PR-1A07: un guardado que quita una categoría espera a la transacción que la usa y después la rechaza si ya tiene tarea", async () => {
    const e = await escenario()
    const categoria = await crearCategoriaDePrueba({
      claseId: e.claseId,
      nombre: "Usada",
      peso: 100,
    })
    const tareaId = randomUUID()
    let guardado: Promise<LightMyRequestResponse> | undefined

    await obtenerDb().$transaction(
      async (tx) => {
        const bloqueada = await bloquearCategoriaParaUsar(tx, {
          categoriaId: categoria.id,
          claseId: e.claseId,
        })
        expect(bloqueada).toBe(true)
        const [propio] = await tx.$queryRaw<{ pid: number }[]>`SELECT pg_backend_pid() AS pid`
        if (!propio) throw new Error("Precondición: no se obtuvo el pid de la transacción")
        await tx.publicacion.create({
          data: {
            id: tareaId,
            claseId: e.claseId,
            autorId: e.maestro.id,
            tipo: "tarea",
            titulo: "Tarea en curso",
            texto: "",
          },
          select: { id: true },
        })
        await tx.tarea.create({
          data: {
            id: tareaId,
            claseId: e.claseId,
            categoriaId: categoria.id,
            fechaLimite: new Date(Date.now() + 86_400_000),
            puntos: 10,
          },
          select: { id: true },
        })

        guardado = guardar(e, [])
        const limite = Date.now() + 10_000
        let formada = false
        while (!formada && Date.now() < limite) {
          formada = (await formadasDetrasDe(propio.pid)) >= 1
          if (!formada) await new Promise((resolver) => setTimeout(resolver, 25))
        }
        expect(formada, "Precondición: el guardado no llegó a esperar la categoría").toBe(true)
      },
      { timeout: 30_000, maxWait: 5_000 },
    )

    if (!guardado) throw new Error("Precondición: el guardado no se lanzó")
    const respuesta = await guardado
    expect(respuesta.statusCode).toBe(409)
    expect(codigoDe(respuesta)).toBe("CATEGORIA_CON_TAREAS")
    expect((await leerTareaDb(tareaId))?.categoriaId).toBe(categoria.id)
    expect(await listarCategoriasDb(e.claseId)).toHaveLength(1)
  })
})
