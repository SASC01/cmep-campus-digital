import { randomUUID } from "node:crypto"

import {
  errorApiSchema,
  listaTemasRespuestaSchema,
  moverElementoRespuestaSchema,
  publicacionRespuestaSchema,
  temaRespuestaSchema,
} from "@campus/shared"
import type { FastifyInstance, InjectOptions, LightMyRequestResponse } from "fastify"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

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
import {
  crearMaterialConTemaDePrueba,
  crearTareaDePrueba,
  crearTemaDePrueba,
  leerTemaDb,
  listarTemasDb,
} from "./ayudas-tareas.js"

// TAREAS-01a. PR-1A04 (temas de punta a punta), PR-1A05 (concurrencia de temas) y PR-1A06 (mover un
// elemento de tema y elegir tema al publicar un material).

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
  alumno: UsuarioDePrueba
  tokenMaestro: string
  tokenAlumno: string
}

const escenario = async (): Promise<Escenario> => {
  const maestro = await crearUsuarioDePrueba(idsUsuarios, {
    rol: "maestro",
    nombre: "Maestra Temas",
  })
  const alumno = await crearUsuarioDePrueba(idsUsuarios, { nombre: "Alumno Temas" })
  const clase = await crearClaseDePrueba(idsClases, { maestroId: maestro.id })
  await inscribirDePrueba(clase.id, alumno.id, "codigo")
  return {
    claseId: clase.id,
    maestro,
    alumno,
    tokenMaestro: await firmarTokenDePrueba({ usuarioId: maestro.id }),
    tokenAlumno: await firmarTokenDePrueba({ usuarioId: alumno.id }),
  }
}

const peticion = (opciones: {
  method: "GET" | "POST" | "PUT" | "DELETE"
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

const codigoDe = (respuesta: LightMyRequestResponse): string =>
  errorApiSchema.parse(respuesta.json()).error.codigo

const urlTemas = (claseId: string): string => `/api/clases/${claseId}/temas`
const urlTema = (claseId: string, temaId: string): string => `${urlTemas(claseId)}/${temaId}`
const urlOrden = (claseId: string): string => `${urlTemas(claseId)}/orden`
const urlMover = (claseId: string, publicacionId: string): string =>
  `/api/clases/${claseId}/publicaciones/${publicacionId}/tema`

const crearTema = (e: Escenario, nombre: string): Promise<LightMyRequestResponse> =>
  peticion({ method: "POST", url: urlTemas(e.claseId), token: e.tokenMaestro, payload: { nombre } })

const listar = async (e: Escenario, token = e.tokenMaestro) => {
  const respuesta = await peticion({ method: "GET", url: urlTemas(e.claseId), token })
  expect(respuesta.statusCode).toBe(200)
  return listaTemasRespuestaSchema.parse(respuesta.json())
}

const sembrarTemas = async (claseId: string, cantidad: number): Promise<string[]> => {
  const ids: string[] = []
  for (let i = 0; i < cantidad; i++) {
    ids.push(
      (await crearTemaDePrueba({ claseId, nombre: `Tema sembrado ${String(i)}`, orden: i })).id,
    )
  }
  return ids
}

beforeAll(async () => {
  app = await construirApp({ env: cargarEnv() })
  await app.ready()
})

afterAll(async () => {
  // N-10: clases (con sus temas y publicaciones en cascada) antes que los usuarios.
  await borrarMovimientosYClasesDePrueba(idsClases)
  await borrarUsuariosDePrueba(idsUsuarios)
  await app?.close()
})

describe("temas de punta a punta (PR-1A04)", () => {
  it("PR-1A04: crear deja cada tema al final del orden y la respuesta lleva elementos en 0", async () => {
    const e = await escenario()

    for (const [indice, nombre] of ["Unidad 1", "Unidad 2", "Unidad 3"].entries()) {
      const respuesta = await crearTema(e, nombre)
      expect(respuesta.statusCode).toBe(201)
      const { tema } = temaRespuestaSchema.parse(respuesta.json())
      expect(tema).toMatchObject({ nombre, orden: indice, elementos: 0 })
    }
    const filas = await listarTemasDb(e.claseId)
    expect(filas.map((fila) => [fila.nombre, fila.orden])).toEqual([
      ["Unidad 1", 0],
      ["Unidad 2", 1],
      ["Unidad 3", 2],
    ])
  })

  it("PR-1A04: el nombre se guarda recortado y con CRLF normalizado", async () => {
    const e = await escenario()

    const respuesta = await crearTema(e, "  Unidad con espacios \r\n")

    expect(respuesta.statusCode).toBe(201)
    expect(temaRespuestaSchema.parse(respuesta.json()).tema.nombre).toBe("Unidad con espacios")
  })

  it("PR-1A04: listar trae los temas en orden con elementos y sinTema (sin contar anuncios) y lo ve el estudiante", async () => {
    const e = await escenario()
    const a = await crearTemaDePrueba({ claseId: e.claseId, nombre: "A", orden: 0 })
    const b = await crearTemaDePrueba({ claseId: e.claseId, nombre: "B", orden: 1 })
    await crearMaterialConTemaDePrueba({ claseId: e.claseId, autorId: e.maestro.id, temaId: a.id })
    await crearTareaDePrueba({ claseId: e.claseId, autorId: e.maestro.id, temaId: a.id })
    await crearMaterialConTemaDePrueba({ claseId: e.claseId, autorId: e.maestro.id })
    await crearTareaDePrueba({ claseId: e.claseId, autorId: e.maestro.id })
    await crearPublicacionDePrueba({ claseId: e.claseId, autorId: e.maestro.id })

    const comoMaestro = await listar(e)
    const comoAlumno = await listar(e, e.tokenAlumno)

    for (const lista of [comoMaestro, comoAlumno]) {
      expect(lista.temas.map((tema) => [tema.id, tema.nombre, tema.orden, tema.elementos])).toEqual(
        [
          [a.id, "A", 0, 2],
          [b.id, "B", 1, 0],
        ],
      )
      expect(lista.sinTema).toBe(2)
    }
  })

  it("PR-1A04: renombrar responde el tema con su conteo, y a su mismo nombre también pasa", async () => {
    const e = await escenario()
    const tema = await crearTemaDePrueba({ claseId: e.claseId, nombre: "Viejo", orden: 0 })
    await crearMaterialConTemaDePrueba({
      claseId: e.claseId,
      autorId: e.maestro.id,
      temaId: tema.id,
    })

    const renombrado = await peticion({
      method: "PUT",
      url: urlTema(e.claseId, tema.id),
      token: e.tokenMaestro,
      payload: { nombre: "Nuevo" },
    })
    expect(renombrado.statusCode).toBe(200)
    expect(temaRespuestaSchema.parse(renombrado.json()).tema).toEqual({
      id: tema.id,
      nombre: "Nuevo",
      orden: 0,
      elementos: 1,
    })
    expect((await leerTemaDb(tema.id))?.nombre).toBe("Nuevo")

    const igual = await peticion({
      method: "PUT",
      url: urlTema(e.claseId, tema.id),
      token: e.tokenMaestro,
      payload: { nombre: "NUEVO" },
    })
    expect(igual.statusCode).toBe(200)
  })

  it("PR-1A04: reordenar guarda el orden completo y lo responde como el GET", async () => {
    const e = await escenario()
    const [a, b, c] = await sembrarTemas(e.claseId, 3)
    if (a === undefined || b === undefined || c === undefined)
      throw new Error("Precondición: 3 temas")

    const respuesta = await peticion({
      method: "PUT",
      url: urlOrden(e.claseId),
      token: e.tokenMaestro,
      payload: { temaIds: [c, a, b] },
    })

    expect(respuesta.statusCode).toBe(200)
    const lista = listaTemasRespuestaSchema.parse(respuesta.json())
    expect(lista.temas.map((tema) => [tema.id, tema.orden])).toEqual([
      [c, 0],
      [a, 1],
      [b, 2],
    ])
    expect(await listar(e)).toEqual(lista)
  })

  it("PR-1A04: borrar un tema deja sus materiales con tema_id nulo y cuentan en sinTema", async () => {
    const e = await escenario()
    const tema = await crearTemaDePrueba({ claseId: e.claseId, nombre: "Se va", orden: 0 })
    const otro = await crearTemaDePrueba({ claseId: e.claseId, nombre: "Se queda", orden: 1 })
    const material = await crearMaterialConTemaDePrueba({
      claseId: e.claseId,
      autorId: e.maestro.id,
      temaId: tema.id,
    })
    const tarea = await crearTareaDePrueba({
      claseId: e.claseId,
      autorId: e.maestro.id,
      temaId: tema.id,
    })

    const respuesta = await peticion({
      method: "DELETE",
      url: urlTema(e.claseId, tema.id),
      token: e.tokenMaestro,
    })

    expect(respuesta.statusCode).toBe(204)
    expect(await leerTemaDb(tema.id)).toBeNull()
    expect((await leerPublicacionDb(material))?.temaId).toBeNull()
    expect((await leerPublicacionDb(tarea))?.temaId).toBeNull()
    const lista = await listar(e)
    expect(lista.temas.map((fila) => fila.id)).toEqual([otro.id])
    expect(lista.sinTema).toBe(2)
  })

  it("PR-1A04: renombrar y borrar un tema de otra clase responde 404 TEMA_NO_ENCONTRADO sin cambiar nada", async () => {
    const e = await escenario()
    const otra = await escenario()
    const ajeno = await crearTemaDePrueba({ claseId: otra.claseId, nombre: "Ajeno", orden: 0 })

    const renombrar = await peticion({
      method: "PUT",
      url: urlTema(e.claseId, ajeno.id),
      token: e.tokenMaestro,
      payload: { nombre: "Robado" },
    })
    const borrar = await peticion({
      method: "DELETE",
      url: urlTema(e.claseId, ajeno.id),
      token: e.tokenMaestro,
    })
    const inexistente = await peticion({
      method: "DELETE",
      url: urlTema(e.claseId, randomUUID()),
      token: e.tokenMaestro,
    })

    for (const respuesta of [renombrar, borrar, inexistente]) {
      expect(respuesta.statusCode).toBe(404)
      expect(codigoDe(respuesta)).toBe("TEMA_NO_ENCONTRADO")
    }
    expect((await leerTemaDb(ajeno.id))?.nombre).toBe("Ajeno")
  })

  it("PR-1A04: un nombre repetido (sin distinguir mayúsculas ni acentos) responde 409 TEMA_REPETIDO", async () => {
    const e = await escenario()
    await crearTema(e, "Álgebra")

    const repetido = await crearTema(e, "  ALGEBRA ")
    const tema = await crearTemaDePrueba({ claseId: e.claseId, nombre: "Geometría", orden: 5 })
    const renombrar = await peticion({
      method: "PUT",
      url: urlTema(e.claseId, tema.id),
      token: e.tokenMaestro,
      payload: { nombre: "algebra" },
    })

    expect(repetido.statusCode).toBe(409)
    expect(codigoDe(repetido)).toBe("TEMA_REPETIDO")
    expect(renombrar.statusCode).toBe(409)
    expect(codigoDe(renombrar)).toBe("TEMA_REPETIDO")
    expect((await listarTemasDb(e.claseId)).length).toBe(2)
  })

  it("PR-1A04: un nombre inválido responde 400 VALIDACION y no crea nada", async () => {
    const e = await escenario()

    for (const nombre of ["", "   ", "Uno\nDos", "a".repeat(81)]) {
      const respuesta = await crearTema(e, nombre)
      expect(respuesta.statusCode, JSON.stringify(nombre)).toBe(400)
      expect(codigoDe(respuesta)).toBe("VALIDACION")
    }
    expect(await listarTemasDb(e.claseId)).toHaveLength(0)
  })

  it("PR-1A04: con 30 temas, crear otro responde 409 TOPE_DE_TEMAS", async () => {
    const e = await escenario()
    await sembrarTemas(e.claseId, 30)

    const respuesta = await crearTema(e, "El 31")

    expect(respuesta.statusCode).toBe(409)
    expect(codigoDe(respuesta)).toBe("TOPE_DE_TEMAS")
    expect(await listarTemasDb(e.claseId)).toHaveLength(30)
  })

  it("PR-1A04: reordenar con un conjunto distinto del actual responde 409 ORDEN_DESACTUALIZADO y no cambia nada", async () => {
    const e = await escenario()
    const [a, b, c] = await sembrarTemas(e.claseId, 3)
    if (a === undefined || b === undefined || c === undefined)
      throw new Error("Precondición: 3 temas")
    const ajeno = await crearTemaDePrueba({
      claseId: (await escenario()).claseId,
      nombre: "Ajeno",
      orden: 0,
    })

    const intentos = [
      [a, b],
      [a, b, c, randomUUID()],
      [a, b, ajeno.id],
    ]
    for (const temaIds of intentos) {
      const respuesta = await peticion({
        method: "PUT",
        url: urlOrden(e.claseId),
        token: e.tokenMaestro,
        payload: { temaIds },
      })
      expect(respuesta.statusCode).toBe(409)
      expect(codigoDe(respuesta)).toBe("ORDEN_DESACTUALIZADO")
    }
    expect((await listarTemasDb(e.claseId)).map((fila) => [fila.id, fila.orden])).toEqual([
      [a, 0],
      [b, 1],
      [c, 2],
    ])
  })

  it('PR-1A04: "orden" como :temaId en DELETE responde 400 VALIDACION y en PUT con cuerpo de nombre también', async () => {
    const e = await escenario()

    const borrar = await peticion({
      method: "DELETE",
      url: urlOrden(e.claseId),
      token: e.tokenMaestro,
    })
    const renombrarComoOrden = await peticion({
      method: "PUT",
      url: urlOrden(e.claseId),
      token: e.tokenMaestro,
      payload: { nombre: "Algo" },
    })

    expect(borrar.statusCode).toBe(400)
    expect(codigoDe(borrar)).toBe("VALIDACION")
    expect(renombrarComoOrden.statusCode).toBe(400)
    expect(codigoDe(renombrarComoOrden)).toBe("VALIDACION")
  })
})

describe("concurrencia de temas (PR-1A05)", () => {
  it("PR-1A05: dos creaciones simultáneas con 29 temas: una 201 y otra 409 TOPE_DE_TEMAS", async () => {
    const e = await escenario()
    await sembrarTemas(e.claseId, 29)

    const respuestas = await Promise.all([crearTema(e, "Carrera A"), crearTema(e, "Carrera B")])

    expect(respuestas.map((respuesta) => respuesta.statusCode).sort()).toEqual([201, 409])
    const rechazada = respuestas.find((respuesta) => respuesta.statusCode === 409)
    expect(rechazada && codigoDe(rechazada)).toBe("TOPE_DE_TEMAS")
    expect(await listarTemasDb(e.claseId)).toHaveLength(30)
  })

  it("PR-1A05: diez creaciones simultáneas con 25 temas: cinco 201, cinco 409 TOPE_DE_TEMAS y 30 temas", async () => {
    const e = await escenario()
    await sembrarTemas(e.claseId, 25)

    const respuestas = await Promise.all(
      Array.from({ length: 10 }, (_, i) => crearTema(e, `Carrera ${String(i)}`)),
    )

    const estados = respuestas.map((respuesta) => respuesta.statusCode)
    expect(estados.filter((estado) => estado === 201)).toHaveLength(5)
    expect(estados.filter((estado) => estado === 409)).toHaveLength(5)
    for (const respuesta of respuestas.filter((r) => r.statusCode === 409)) {
      expect(codigoDe(respuesta)).toBe("TOPE_DE_TEMAS")
    }
    const filas = await listarTemasDb(e.claseId)
    expect(filas).toHaveLength(30)
    expect(new Set(filas.map((fila) => fila.orden)).size).toBe(30)
  })

  it("PR-1A05: dos creaciones simultáneas con el mismo nombre: una 201 y otra 409 TEMA_REPETIDO", async () => {
    const e = await escenario()

    const respuestas = await Promise.all([
      crearTema(e, "Mismo nombre"),
      crearTema(e, "  MISMO NOMBRE"),
    ])

    expect(respuestas.map((respuesta) => respuesta.statusCode).sort()).toEqual([201, 409])
    const rechazada = respuestas.find((respuesta) => respuesta.statusCode === 409)
    expect(rechazada && codigoDe(rechazada)).toBe("TEMA_REPETIDO")
    expect(await listarTemasDb(e.claseId)).toHaveLength(1)
  })

  it("PR-1A05: un reordenamiento y un borrado simultáneos: 200 con el orden nuevo o 409 ORDEN_DESACTUALIZADO, nunca 500", async () => {
    const e = await escenario()
    const [a, b, c] = await sembrarTemas(e.claseId, 3)
    if (a === undefined || b === undefined || c === undefined)
      throw new Error("Precondición: 3 temas")

    const [orden, borrado] = await Promise.all([
      peticion({
        method: "PUT",
        url: urlOrden(e.claseId),
        token: e.tokenMaestro,
        payload: { temaIds: [c, b, a] },
      }),
      peticion({ method: "DELETE", url: urlTema(e.claseId, b), token: e.tokenMaestro }),
    ])

    expect(borrado.statusCode).toBe(204)
    const restantes = (await listarTemasDb(e.claseId)).map((fila) => fila.id)
    expect([200, 409]).toContain(orden.statusCode)
    if (orden.statusCode === 200) {
      expect(restantes).toEqual([c, a])
    } else {
      expect(codigoDe(orden)).toBe("ORDEN_DESACTUALIZADO")
      expect(restantes).toEqual([a, c])
    }
  })

  it("PR-1A05: renombrar y borrar el mismo tema a la vez termina sin 500", async () => {
    const e = await escenario()
    const tema = await crearTemaDePrueba({ claseId: e.claseId, nombre: "Disputado", orden: 0 })

    const [renombrado, borrado] = await Promise.all([
      peticion({
        method: "PUT",
        url: urlTema(e.claseId, tema.id),
        token: e.tokenMaestro,
        payload: { nombre: "Otro nombre" },
      }),
      peticion({ method: "DELETE", url: urlTema(e.claseId, tema.id), token: e.tokenMaestro }),
    ])

    expect(borrado.statusCode).toBe(204)
    expect([200, 404]).toContain(renombrado.statusCode)
    expect(await leerTemaDb(tema.id)).toBeNull()
  })
})

describe("mover un elemento de tema y elegir tema al publicar (PR-1A06)", () => {
  it("PR-1A06: un material pasa a un tema y de vuelta a null", async () => {
    const e = await escenario()
    const tema = await crearTemaDePrueba({ claseId: e.claseId, nombre: "Destino", orden: 0 })
    const material = await crearMaterialConTemaDePrueba({
      claseId: e.claseId,
      autorId: e.maestro.id,
    })

    const aTema = await peticion({
      method: "PUT",
      url: urlMover(e.claseId, material),
      token: e.tokenMaestro,
      payload: { temaId: tema.id },
    })
    expect(aTema.statusCode).toBe(200)
    expect(moverElementoRespuestaSchema.parse(aTema.json())).toEqual({
      publicacionId: material,
      temaId: tema.id,
    })
    expect((await leerPublicacionDb(material))?.temaId).toBe(tema.id)
    expect((await listar(e)).temas[0]?.elementos).toBe(1)

    const aNulo = await peticion({
      method: "PUT",
      url: urlMover(e.claseId, material),
      token: e.tokenMaestro,
      payload: { temaId: null },
    })
    expect(aNulo.statusCode).toBe(200)
    expect(moverElementoRespuestaSchema.parse(aNulo.json()).temaId).toBeNull()
    expect((await leerPublicacionDb(material))?.temaId).toBeNull()
  })

  it("PR-1A06: una tarea también se mueve, y el admin puede mover lo de un maestro (mover no es editar)", async () => {
    const e = await escenario()
    const tema = await crearTemaDePrueba({ claseId: e.claseId, nombre: "Destino", orden: 0 })
    const tarea = await crearTareaDePrueba({ claseId: e.claseId, autorId: e.maestro.id })

    const respuesta = await peticion({
      method: "PUT",
      url: urlMover(e.claseId, tarea),
      token: await tokenDelAdminDePrueba(),
      payload: { temaId: tema.id },
    })

    expect(respuesta.statusCode).toBe(200)
    expect((await leerPublicacionDb(tarea))?.temaId).toBe(tema.id)
  })

  it("PR-1A06: un anuncio responde 409 ANUNCIO_SIN_TEMA y no cambia", async () => {
    const e = await escenario()
    const tema = await crearTemaDePrueba({ claseId: e.claseId, nombre: "Destino", orden: 0 })
    const anuncio = await crearPublicacionDePrueba({ claseId: e.claseId, autorId: e.maestro.id })

    const respuesta = await peticion({
      method: "PUT",
      url: urlMover(e.claseId, anuncio),
      token: e.tokenMaestro,
      payload: { temaId: tema.id },
    })

    expect(respuesta.statusCode).toBe(409)
    expect(codigoDe(respuesta)).toBe("ANUNCIO_SIN_TEMA")
    expect((await leerPublicacionDb(anuncio))?.temaId).toBeNull()
  })

  it("PR-1A06: un tema de otra clase o inexistente responde 404 TEMA_NO_ENCONTRADO sin cambiar el elemento", async () => {
    const e = await escenario()
    const otra = await escenario()
    const propio = await crearTemaDePrueba({ claseId: e.claseId, nombre: "Propio", orden: 0 })
    const ajeno = await crearTemaDePrueba({ claseId: otra.claseId, nombre: "Ajeno", orden: 0 })
    const material = await crearMaterialConTemaDePrueba({
      claseId: e.claseId,
      autorId: e.maestro.id,
      temaId: propio.id,
    })

    for (const temaId of [ajeno.id, randomUUID()]) {
      const respuesta = await peticion({
        method: "PUT",
        url: urlMover(e.claseId, material),
        token: e.tokenMaestro,
        payload: { temaId },
      })
      expect(respuesta.statusCode).toBe(404)
      expect(codigoDe(respuesta)).toBe("TEMA_NO_ENCONTRADO")
    }
    expect((await leerPublicacionDb(material))?.temaId).toBe(propio.id)
  })

  it("PR-1A06: una publicación de otra clase responde 404 PUBLICACION_NO_ENCONTRADA sin cambiarla", async () => {
    const e = await escenario()
    const otra = await escenario()
    const tema = await crearTemaDePrueba({ claseId: e.claseId, nombre: "Propio", orden: 0 })
    const ajena = await crearMaterialConTemaDePrueba({
      claseId: otra.claseId,
      autorId: otra.maestro.id,
    })

    for (const publicacionId of [ajena, randomUUID()]) {
      const respuesta = await peticion({
        method: "PUT",
        url: urlMover(e.claseId, publicacionId),
        token: e.tokenMaestro,
        payload: { temaId: tema.id },
      })
      expect(respuesta.statusCode).toBe(404)
      expect(codigoDe(respuesta)).toBe("PUBLICACION_NO_ENCONTRADA")
    }
    expect((await leerPublicacionDb(ajena))?.temaId).toBeNull()
  })

  it("PR-1A06: sin la clave temaId o con un valor que no es uuid, 400 VALIDACION", async () => {
    const e = await escenario()
    const material = await crearMaterialConTemaDePrueba({
      claseId: e.claseId,
      autorId: e.maestro.id,
    })

    for (const payload of [{}, { temaId: "sin-tema" }, { temaId: 5 }]) {
      const respuesta = await peticion({
        method: "PUT",
        url: urlMover(e.claseId, material),
        token: e.tokenMaestro,
        payload,
      })
      expect(respuesta.statusCode, JSON.stringify(payload)).toBe(400)
      expect(codigoDe(respuesta)).toBe("VALIDACION")
    }
  })

  it("PR-1A06: publicar un material con temaId lo deja en ese tema; sin la clave o con null queda sin tema", async () => {
    const e = await escenario()
    const tema = await crearTemaDePrueba({ claseId: e.claseId, nombre: "Unidad", orden: 0 })
    const publicar = (payload: InjectOptions["payload"]) =>
      peticion({
        method: "POST",
        url: `/api/clases/${e.claseId}/publicaciones`,
        token: e.tokenMaestro,
        payload,
      })

    const conTema = await publicar({ tipo: "material", titulo: "Con tema", temaId: tema.id })
    const sinClave = await publicar({ tipo: "material", titulo: "Sin clave" })
    const conNulo = await publicar({ tipo: "material", titulo: "Con null", temaId: null })

    for (const respuesta of [conTema, sinClave, conNulo]) expect(respuesta.statusCode).toBe(201)
    const ids = [conTema, sinClave, conNulo].map(
      (respuesta) => publicacionRespuestaSchema.parse(respuesta.json()).publicacion.id,
    )
    const temas = await Promise.all(ids.map(async (id) => (await leerPublicacionDb(id))?.temaId))
    expect(temas).toEqual([tema.id, null, null])
    expect((await listar(e)).temas[0]?.elementos).toBe(1)
  })

  it("PR-1A06: un anuncio con temaId se publica sin tema (la clave se descarta)", async () => {
    const e = await escenario()
    const tema = await crearTemaDePrueba({ claseId: e.claseId, nombre: "Unidad", orden: 0 })

    const respuesta = await peticion({
      method: "POST",
      url: `/api/clases/${e.claseId}/publicaciones`,
      token: e.tokenMaestro,
      payload: { tipo: "anuncio", texto: "Aviso", temaId: tema.id },
    })

    expect(respuesta.statusCode).toBe(201)
    const id = publicacionRespuestaSchema.parse(respuesta.json()).publicacion.id
    expect((await leerPublicacionDb(id))?.temaId).toBeNull()
  })

  it("PR-1A06: publicar un material con un tema de otra clase responde 404, sin publicación ni trabajo MATERIAL_CREADO", async () => {
    const e = await escenario()
    const otra = await escenario()
    const ajeno = await crearTemaDePrueba({ claseId: otra.claseId, nombre: "Ajeno", orden: 0 })

    const respuesta = await peticion({
      method: "POST",
      url: `/api/clases/${e.claseId}/publicaciones`,
      token: e.tokenMaestro,
      payload: { tipo: "material", titulo: "Con tema ajeno", temaId: ajeno.id },
    })

    expect(respuesta.statusCode).toBe(404)
    expect(codigoDe(respuesta)).toBe("TEMA_NO_ENCONTRADO")
    expect(await contarPublicaciones(e.claseId)).toBe(0)
    expect(await leerTrabajosDeCola(COLA_MATERIAL_CREADO, "claseId", e.claseId)).toHaveLength(0)
  })
})
