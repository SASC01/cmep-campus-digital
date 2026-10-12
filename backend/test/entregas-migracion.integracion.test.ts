import { randomUUID } from "node:crypto"

import { tareaRespuestaSchema } from "@campus/shared"
import type { FastifyInstance } from "fastify"
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
  crearPublicacionDePrueba,
  inscribirDePrueba,
} from "./ayudas-clases.js"
import { crearTareaDePrueba, cuerpoDeTarea, leerTareaDb } from "./ayudas-tareas.js"

// ENTREGAS-01a (PR-1A01). La migración entregas_e_hilo_privado y sus CHECK a mano (§D-1): cada
// escritura que los viola se hace con SQL parametrizado y la base la rechaza con el nombre de su
// restricción. Las filas válidas que se siembran mueren en cascada con la clase.

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
  alumno: UsuarioDePrueba
  tareaId: string
  publicacionId: string
}

const escenario = async (): Promise<Escenario> => {
  const maestro = await crearUsuarioDePrueba(idsUsuarios, { rol: "maestro" })
  const alumno = await crearUsuarioDePrueba(idsUsuarios, { nombre: "Alumno Migración" })
  const clase = await crearClaseDePrueba(idsClases, { maestroId: maestro.id })
  await inscribirDePrueba(clase.id, alumno.id, "codigo")
  const tareaId = await crearTareaDePrueba({ claseId: clase.id, autorId: maestro.id })
  const publicacionId = await crearPublicacionDePrueba({ claseId: clase.id, autorId: maestro.id })
  return { claseId: clase.id, maestro, alumno, tareaId, publicacionId }
}

// Una entrega válida (asignada, sin fecha ni enlaces), para los contextos de comentarios y archivos.
const entregaValida = async (e: Escenario): Promise<string> => {
  const id = randomUUID()
  await obtenerDb().$executeRaw`
    INSERT INTO entregas (id, tarea_id, alumno_id) VALUES (${id}::uuid, ${e.tareaId}::uuid, ${e.alumno.id}::uuid)`
  return id
}

const insertarEntrega = (
  e: Escenario,
  datos: {
    estado: "asignado" | "entregado" | "calificado"
    fechaEntrega: Date | null
    conRetraso: boolean
    enlaces: string
    version?: number
  },
) =>
  obtenerDb().$executeRaw`
    INSERT INTO entregas (tarea_id, alumno_id, estado, fecha_entrega, con_retraso, enlaces, version)
    VALUES (${e.tareaId}::uuid, ${e.alumno.id}::uuid, ${datos.estado}::estado_entrega,
            ${datos.fechaEntrega}, ${datos.conRetraso}, ${datos.enlaces}::jsonb, ${datos.version ?? 0})`

const insertarComentario = (
  e: Escenario,
  { publicacionId, entregaId }: { publicacionId: string | null; entregaId: string | null },
) =>
  obtenerDb().$executeRaw`
    INSERT INTO comentarios (publicacion_id, entrega_id, autor_id, texto)
    VALUES (${publicacionId}::uuid, ${entregaId}::uuid, ${e.maestro.id}::uuid, ${"Hola"})`

const insertarArchivo = (
  e: Escenario,
  {
    estado,
    publicacionId,
    entregaId,
  }: {
    estado: "pendiente" | "confirmado" | "descartado"
    publicacionId: string | null
    entregaId: string | null
  },
) => {
  const id = randomUUID()
  return obtenerDb().$executeRaw`
    INSERT INTO archivos (id, clave_objeto, nombre, tipo, tamano, subido_por, estado, clase_id,
                          publicacion_id, entrega_id)
    VALUES (${id}::uuid, ${`materiales/${e.claseId}/${id}`}, ${"guia.pdf"}, ${"application/pdf"},
            ${1000}, ${e.maestro.id}::uuid, ${estado}::estado_archivo, ${e.claseId}::uuid,
            ${publicacionId}::uuid, ${entregaId}::uuid)`
}

describe("migración entregas_e_hilo_privado (PR-1A01)", () => {
  it("PR-1A01: un comentario sin contexto o con los dos contextos se rechaza (comentarios_un_solo_contexto)", async () => {
    const e = await escenario()
    const entregaId = await entregaValida(e)

    await expect(insertarComentario(e, { publicacionId: null, entregaId: null })).rejects.toThrow(
      /comentarios_un_solo_contexto/,
    )
    await expect(
      insertarComentario(e, { publicacionId: e.publicacionId, entregaId }),
    ).rejects.toThrow(/comentarios_un_solo_contexto/)
    // Con exactamente uno, pasa: el muro y el hilo privado.
    await expect(
      insertarComentario(e, { publicacionId: e.publicacionId, entregaId: null }),
    ).resolves.toBe(1)
    await expect(insertarComentario(e, { publicacionId: null, entregaId })).resolves.toBe(1)
  })

  it("PR-1A01: un archivo confirmado con los dos contextos o sin ninguno, y uno pendiente con contexto, se rechazan (archivos_confirmado_si_y_solo_si_contexto)", async () => {
    const e = await escenario()
    const entregaId = await entregaValida(e)
    const restriccion = /archivos_confirmado_si_y_solo_si_contexto/

    await expect(
      insertarArchivo(e, { estado: "confirmado", publicacionId: e.publicacionId, entregaId }),
    ).rejects.toThrow(restriccion)
    await expect(
      insertarArchivo(e, { estado: "confirmado", publicacionId: null, entregaId: null }),
    ).rejects.toThrow(restriccion)
    await expect(
      insertarArchivo(e, { estado: "pendiente", publicacionId: null, entregaId }),
    ).rejects.toThrow(restriccion)
    await expect(
      insertarArchivo(e, { estado: "pendiente", publicacionId: e.publicacionId, entregaId: null }),
    ).rejects.toThrow(restriccion)
    // Confirmado con exactamente un contexto (publicación o entrega) y pendiente sin ninguno, pasan.
    await expect(
      insertarArchivo(e, { estado: "confirmado", publicacionId: null, entregaId }),
    ).resolves.toBe(1)
    await expect(
      insertarArchivo(e, { estado: "confirmado", publicacionId: e.publicacionId, entregaId: null }),
    ).resolves.toBe(1)
    await expect(
      insertarArchivo(e, { estado: "pendiente", publicacionId: null, entregaId: null }),
    ).resolves.toBe(1)
  })

  it("PR-1A01: una entrega asignada con fecha de entrega, con retraso o con enlaces se rechaza; una entregada sin fecha también", async () => {
    const e = await escenario()
    const ahora = new Date()

    await expect(
      insertarEntrega(e, {
        estado: "asignado",
        fechaEntrega: ahora,
        conRetraso: false,
        enlaces: "[]",
      }),
    ).rejects.toThrow(/entregas_fecha_segun_estado/)
    await expect(
      insertarEntrega(e, {
        estado: "entregado",
        fechaEntrega: null,
        conRetraso: false,
        enlaces: "[]",
      }),
    ).rejects.toThrow(/entregas_fecha_segun_estado/)
    await expect(
      insertarEntrega(e, {
        estado: "asignado",
        fechaEntrega: null,
        conRetraso: true,
        enlaces: "[]",
      }),
    ).rejects.toThrow(/entregas_asignada_sin_retraso_ni_enlaces/)
    await expect(
      insertarEntrega(e, {
        estado: "asignado",
        fechaEntrega: null,
        conRetraso: false,
        enlaces: JSON.stringify(["https://ejemplo.com"]),
      }),
    ).rejects.toThrow(/entregas_asignada_sin_retraso_ni_enlaces/)
    expect(await obtenerDb().entrega.count({ where: { tareaId: e.tareaId } })).toBe(0)
  })

  it("PR-1A01: una entrega con 6 enlaces o con enlaces que no son una lista se rechaza; con 5 pasa", async () => {
    const e = await escenario()
    const enlaces = (n: number): string =>
      JSON.stringify(Array.from({ length: n }, (_, k) => `https://ejemplo.com/${String(k)}`))
    const entregada = (lista: string) =>
      insertarEntrega(e, {
        estado: "entregado",
        fechaEntrega: new Date(),
        conRetraso: false,
        enlaces: lista,
      })

    await expect(entregada(enlaces(6))).rejects.toThrow(/entregas_enlaces_es_lista/)
    // Un objeto o una cadena no son listas: la base los rechaza (por el CHECK o por
    // jsonb_array_length, que no acepta algo que no es lista).
    await expect(entregada(JSON.stringify({ a: 1 }))).rejects.toThrow(
      /entregas_enlaces_es_lista|non-array|scalar/,
    )
    await expect(entregada(JSON.stringify("https://ejemplo.com"))).rejects.toThrow(
      /entregas_enlaces_es_lista|non-array|scalar/,
    )
    await expect(entregada(enlaces(5))).resolves.toBe(1)
  })

  it("PR-1A01: version negativa se rechaza en tareas y en entregas", async () => {
    const e = await escenario()

    await expect(
      obtenerDb().$executeRaw`UPDATE tareas SET version = ${-1} WHERE id = ${e.tareaId}::uuid`,
    ).rejects.toThrow(/tareas_version_no_negativa/)
    await expect(
      insertarEntrega(e, {
        estado: "asignado",
        fechaEntrega: null,
        conRetraso: false,
        enlaces: "[]",
        version: -1,
      }),
    ).rejects.toThrow(/entregas_version_no_negativa/)
    expect(await leerTareaDb(e.tareaId)).toMatchObject({ version: 0 })
  })

  it("PR-1A01: una tarea creada por la API nace con requiere_adjuntos = true y version = 0", async () => {
    const e = await escenario()
    const token = await firmarTokenDePrueba({ usuarioId: e.maestro.id })

    const respuesta = await obtenerApp().inject({
      method: "POST",
      url: `/api/clases/${e.claseId}/tareas`,
      headers: { authorization: `Bearer ${token}` },
      payload: cuerpoDeTarea(),
    })

    expect(respuesta.statusCode, respuesta.body).toBe(201)
    const { id } = tareaRespuestaSchema.parse(respuesta.json()).tarea
    const [fila] = await obtenerDb().$queryRaw<{ requiere_adjuntos: boolean; version: number }[]>`
      SELECT requiere_adjuntos, version FROM tareas WHERE id = ${id}::uuid`
    expect(fila).toEqual({ requiere_adjuntos: true, version: 0 })
  })
})
