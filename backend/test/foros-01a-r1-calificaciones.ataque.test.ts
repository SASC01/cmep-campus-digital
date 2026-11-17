import { randomUUID } from "node:crypto"

import {
  exportacionDeCalificacionesRespuestaSchema,
  gradebookRespuestaSchema,
  listaEntregasRespuestaSchema,
  listaForosRespuestaSchema,
  misCalificacionesRespuestaSchema,
} from "@campus/shared"
import type { FastifyInstance } from "fastify"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { obtenerDb } from "../src/adapters/db/cliente.js"
import { construirApp } from "../src/app.js"
import { cargarEnv } from "../src/config/env.js"
import { crearAlmacenEnMemoria } from "./almacen-en-memoria.js"
import { borrarUsuariosDePrueba } from "./ayudas-auth.js"
import { borrarMovimientosYClasesDePrueba } from "./ayudas-clases.js"
import {
  crearEscenarioDeForo,
  crearForoDePrueba,
  HORA_MS,
  pedirForo,
  urlForo,
  urlForos,
  type EscenarioDeForo,
} from "./ayudas-foros.js"

// Ataque FORO-01a, ronda 1 (tester). Punto 9 (la precisión del manager): el gradebook, el riesgo,
// "Mis calificaciones", la lista de foros, "Participantes" y la exportación, recorridos por la API
// real después de cada paso (publicar a tiempo, publicar tarde con tardías, calificar a quien
// participó y calificar a quien no participó con el foro cerrado). Y punto 10: las restricciones de
// la migración sobre filas sembradas a mano.

let app: FastifyInstance | undefined
const idsUsuarios: string[] = []
const idsClases: string[] = []

const obtenerApp = (): FastifyInstance => {
  if (!app) throw new Error("La aplicación no se construyó en beforeAll")
  return app
}
const pedir = pedirForo(obtenerApp)

beforeAll(async () => {
  app = await construirApp({ env: cargarEnv(), almacen: crearAlmacenEnMemoria() })
  await app.ready()
})

afterAll(async () => {
  await borrarMovimientosYClasesDePrueba(idsClases)
  await borrarUsuariosDePrueba(idsUsuarios)
  await app?.close()
})

type Estado = "asignado" | "entregado" | "calificado"

interface Esperada {
  estado: Estado
  conRetraso: boolean
  calificacion: number | null
  conFecha: boolean
}

const ASIGNADA: Esperada = {
  estado: "asignado",
  conRetraso: false,
  calificacion: null,
  conFecha: false,
}

const leerJson = async (url: string, token: string): Promise<unknown> => {
  const respuesta = await pedir({ method: "GET", url, token })
  expect(respuesta.statusCode, `${url}: ${respuesta.body}`).toBe(200)
  return respuesta.json()
}

// Compara cada vista con lo esperado para cada alumno y cada foro.
const revisarVistas = async (
  e: EscenarioDeForo,
  foros: { id: string; vencido: boolean }[],
  esperado: Record<string, Record<string, Esperada>>,
  paso: string,
): Promise<void> => {
  const alumnos = [
    { id: e.alumno.id, token: e.tokenAlumno },
    { id: e.otroAlumno.id, token: e.tokenOtroAlumno },
  ]
  const de = (alumnoId: string, foroId: string): Esperada =>
    esperado[alumnoId]?.[foroId] ?? ASIGNADA

  const gradebook = gradebookRespuestaSchema.parse(
    await leerJson(`/api/clases/${e.claseId}/gradebook`, e.tokenMaestro),
  )
  const exportacion = exportacionDeCalificacionesRespuestaSchema.parse(
    await leerJson(`/api/clases/${e.claseId}/calificaciones/exportacion`, e.tokenMaestro),
  )
  for (const { id: alumnoId, token } of alumnos) {
    const fila = gradebook.alumnos.find((a) => a.alumno.id === alumnoId)
    const deExportacion = exportacion.alumnos.find((a) => a.alumno.id === alumnoId)
    let vencidas = 0
    let obtenidos = 0
    let posibles = 0
    for (const foro of foros) {
      const esperada = de(alumnoId, foro.id)
      const celda = {
        tareaId: foro.id,
        estado: esperada.estado,
        conRetraso: esperada.conRetraso,
        calificacion: esperada.calificacion,
      }
      const columna = gradebook.tareas.findIndex((t) => t.id === foro.id)
      expect(fila?.celdas[columna], `${paso}: gradebook ${alumnoId} ${foro.id}`).toEqual(celda)
      const columnaExportada = exportacion.tareas.findIndex((t) => t.id === foro.id)
      expect(
        deExportacion?.celdas[columnaExportada],
        `${paso}: exportación ${alumnoId} ${foro.id}`,
      ).toEqual(celda)
      if (esperada.estado === "asignado" && foro.vencido) vencidas += 1
      if (esperada.calificacion !== null) {
        obtenidos += esperada.calificacion
        posibles += 10
      }
    }
    const porcentaje = posibles === 0 ? null : (obtenidos / posibles) * 100
    expect(fila?.vencidasSinEntregar, `${paso}: vencidas de ${alumnoId}`).toBe(vencidas)
    expect(fila?.porcentaje, `${paso}: porcentaje de ${alumnoId}`).toBe(porcentaje)
    expect(deExportacion?.porcentaje, `${paso}: porcentaje exportado de ${alumnoId}`).toBe(
      porcentaje,
    )

    const filtrar = (condicion: (esperada: Esperada, vencido: boolean) => boolean) =>
      foros
        .filter((foro) => condicion(de(alumnoId, foro.id), foro.vencido))
        .map((foro) => foro.id)
        .sort()
    const esperadosPorFiltro: Record<string, string[]> = {
      todas: filtrar(() => true),
      asignadas: filtrar((x, vencido) => x.estado === "asignado" && !vencido),
      "sin-entregar": filtrar((x, vencido) => x.estado === "asignado" && vencido),
      entregadas: filtrar((x) => x.estado === "entregado"),
      calificadas: filtrar((x) => x.estado === "calificado"),
    }
    for (const [filtro, ids] of Object.entries(esperadosPorFiltro)) {
      const mis = misCalificacionesRespuestaSchema.parse(
        await leerJson(`/api/clases/${e.claseId}/mis-calificaciones?estado=${filtro}`, token),
      )
      expect(mis.tareas.map((t) => t.id).sort(), `${paso}: ${filtro} de ${alumnoId}`).toEqual(ids)
      for (const tarea of mis.tareas) {
        const esperada = de(alumnoId, tarea.id)
        expect(tarea.entrega, `${paso}: entrega en ${filtro}`).toEqual({
          estado: esperada.estado,
          conRetraso: esperada.conRetraso,
          calificacion: esperada.calificacion,
        })
      }
    }

    const lista = listaForosRespuestaSchema.parse(await leerJson(urlForos(e.claseId), token))
    for (const foro of foros) {
      const esperada = de(alumnoId, foro.id)
      const elemento = lista.foros.find((f) => f.id === foro.id)
      expect(elemento?.entrega, `${paso}: lista de foros ${alumnoId} ${foro.id}`).toEqual(
        esperada.estado === "asignado"
          ? null
          : { estado: esperada.estado, conRetraso: esperada.conRetraso },
      )
    }
  }

  for (const foro of foros) {
    const participantes = listaEntregasRespuestaSchema.parse(
      await leerJson(`${urlForo(e.claseId, foro.id)}/participantes`, e.tokenMaestro),
    )
    let entregadas = 0
    for (const { id: alumnoId } of alumnos) {
      const esperada = de(alumnoId, foro.id)
      if (esperada.conFecha) entregadas += 1
      const fila = participantes.entregas.find((f) => f.alumno.id === alumnoId)
      expect(
        {
          estado: fila?.estado,
          conRetraso: fila?.conRetraso,
          conFecha: fila?.fechaEntrega !== null,
        },
        `${paso}: participantes ${alumnoId} ${foro.id}`,
      ).toEqual({
        estado: esperada.estado,
        conRetraso: esperada.conRetraso,
        conFecha: esperada.conFecha,
      })
    }
    expect(participantes.entregadas, `${paso}: entregadas de ${foro.id}`).toBe(entregadas)
    expect(participantes.total).toBe(2)
  }
}

describe("ataque FORO-01a r1 · punto 9: el foro en las calificaciones, paso a paso por la API", () => {
  it("ATQ-FORO-40: publicar a tiempo, publicar tarde con tardías, calificar a quien participó y calificar a quien no participó con el foro cerrado dejan coherentes, después de cada paso, el gradebook (celdas, vencidas y porcentaje), la exportación, los cinco filtros de Mis calificaciones, la lista de foros y Participantes", async () => {
    const e = await crearEscenarioDeForo(idsUsuarios, idsClases)
    const pasada = new Date(Date.now() - 3 * HORA_MS)
    const conTardias = await crearForoDePrueba({
      claseId: e.claseId,
      autorId: e.maestro.id,
      titulo: "Vencido con tardías",
      fechaLimite: pasada,
      aceptaTardias: true,
    })
    const cerrado = await crearForoDePrueba({
      claseId: e.claseId,
      autorId: e.maestro.id,
      titulo: "Vencido sin tardías",
      fechaLimite: pasada,
      aceptaTardias: false,
    })
    const abierto = await crearForoDePrueba({
      claseId: e.claseId,
      autorId: e.maestro.id,
      titulo: "Abierto",
      fechaLimite: new Date(Date.now() + 5 * 24 * HORA_MS),
    })
    const foros = [
      { id: conTardias, vencido: true },
      { id: cerrado, vencido: true },
      { id: abierto, vencido: false },
    ]
    const esperado: Record<string, Record<string, Esperada>> = {
      [e.alumno.id]: {},
      [e.otroAlumno.id]: {},
    }
    await revisarVistas(e, foros, esperado, "0, sin nada")

    const publicar = async (foroId: string) => {
      const respuesta = await pedir({
        method: "POST",
        url: `${urlForo(e.claseId, foroId)}/participaciones`,
        token: e.tokenAlumno,
        payload: { texto: `Principal en ${foroId}` },
      })
      expect(respuesta.statusCode, respuesta.body).toBe(201)
    }
    await publicar(abierto)
    esperado[e.alumno.id] = {
      [abierto]: { estado: "entregado", conRetraso: false, calificacion: null, conFecha: true },
    }
    await revisarVistas(e, foros, esperado, "1, a tiempo")

    await publicar(conTardias)
    esperado[e.alumno.id] = {
      ...esperado[e.alumno.id],
      [conTardias]: { estado: "entregado", conRetraso: true, calificacion: null, conFecha: true },
    }
    await revisarVistas(e, foros, esperado, "2, tarde con tardías")

    const calificar = async (
      foroId: string,
      alumnoId: string,
      version: number,
      calificacion: number,
    ) => {
      const respuesta = await pedir({
        method: "PUT",
        url: `${urlForo(e.claseId, foroId)}/participantes/${alumnoId}/calificacion`,
        token: e.tokenMaestro,
        payload: { version, puntosDeLaTarea: 10, puntajes: [], calificacion },
      })
      expect(respuesta.statusCode, respuesta.body).toBe(200)
    }
    await calificar(conTardias, e.alumno.id, 1, 8)
    esperado[e.alumno.id] = {
      ...esperado[e.alumno.id],
      [conTardias]: { estado: "calificado", conRetraso: true, calificacion: 8, conFecha: true },
    }
    await revisarVistas(e, foros, esperado, "3, calificar a quien participó")

    await calificar(cerrado, e.otroAlumno.id, 0, 4)
    esperado[e.otroAlumno.id] = {
      [cerrado]: { estado: "calificado", conRetraso: false, calificacion: 4, conFecha: false },
    }
    await revisarVistas(e, foros, esperado, "4, calificar a quien no participó con el foro cerrado")

    const gradebook = gradebookRespuestaSchema.parse(
      await leerJson(`/api/clases/${e.claseId}/gradebook`, e.tokenMaestro),
    )
    expect(gradebook.alumnos.find((a) => a.alumno.id === e.otroAlumno.id)?.motivosDeRiesgo).toEqual(
      ["promedio"],
    )
    expect(gradebook.alumnos.find((a) => a.alumno.id === e.alumno.id)?.motivosDeRiesgo).toEqual([])
    expect(gradebook.resumen).toMatchObject({ modo: "puntos", totalAlumnos: 2, alumnosEnRiesgo: 1 })
  }, 90_000)
})

describe("ataque FORO-01a r1 · punto 10: las restricciones de la migración", () => {
  const insertarPublicacion = (
    claseId: string,
    autorId: string,
    tipo: string,
    titulo: string | null,
    bloque: string | null = null,
  ) =>
    obtenerDb().$executeRaw`
      INSERT INTO publicaciones (id, clase_id, autor_id, tipo, titulo, texto, bloque, actualizado_en)
      VALUES (${randomUUID()}::uuid, ${claseId}::uuid, ${autorId}::uuid, ${tipo}::tipo_publicacion,
              ${titulo}, 'Texto', ${bloque}::bloque_recurso, now())`

  it("ATQ-FORO-41: con los cuatro tipos, el CHECK del título rechaza un foro y un material sin título y un anuncio con título; un foro con bloque viola publicaciones_bloque_solo_material; un foro y una tarea con título entran", async () => {
    const e = await crearEscenarioDeForo(idsUsuarios, idsClases)
    await expect(insertarPublicacion(e.claseId, e.maestro.id, "foro", null)).rejects.toThrow(
      /publicaciones_titulo_segun_tipo/,
    )
    await expect(insertarPublicacion(e.claseId, e.maestro.id, "material", null)).rejects.toThrow(
      /publicaciones_titulo_segun_tipo/,
    )
    await expect(
      insertarPublicacion(e.claseId, e.maestro.id, "anuncio", "Con título"),
    ).rejects.toThrow(/publicaciones_titulo_segun_tipo/)
    await expect(
      insertarPublicacion(e.claseId, e.maestro.id, "foro", "Foro con bloque", "aprendizaje"),
    ).rejects.toThrow(/publicaciones_bloque_solo_material/)
    expect(await insertarPublicacion(e.claseId, e.maestro.id, "foro", "Foro válido")).toBe(1)
    expect(await insertarPublicacion(e.claseId, e.maestro.id, "tarea", "Tarea válida")).toBe(1)
  })

  it("ATQ-FORO-42: borrar la fila de tareas del foro (no la publicación) se lleva principales y réplicas; borrar una réplica no toca su principal; la principal de un alumno y su réplica en el mismo foro conviven con el índice único parcial", async () => {
    const e = await crearEscenarioDeForo(idsUsuarios, idsClases)
    const foroId = await crearForoDePrueba({ claseId: e.claseId, autorId: e.maestro.id })
    const db = obtenerDb()
    const principal = await db.participacionForo.create({
      data: { foroId, autorId: e.alumno.id, texto: "Principal" },
      select: { id: true },
    })
    const propia = await db.participacionForo.create({
      data: { foroId, autorId: e.alumno.id, principalId: principal.id, texto: "Réplica propia" },
      select: { id: true },
    })
    const ajena = await db.participacionForo.create({
      data: { foroId, autorId: e.otroAlumno.id, principalId: principal.id, texto: "Réplica ajena" },
      select: { id: true },
    })
    await db.participacionForo.delete({ where: { id: ajena.id } })
    expect(
      (await db.participacionForo.findMany({ where: { foroId }, select: { id: true } }))
        .map(({ id }) => id)
        .sort(),
    ).toEqual([principal.id, propia.id].sort())
    await db.tarea.delete({ where: { id: foroId } })
    expect(await db.participacionForo.count({ where: { foroId } })).toBe(0)
  })
})
