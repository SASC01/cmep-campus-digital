import { errorApiSchema } from "@campus/shared"
import type { FastifyInstance, InjectOptions, LightMyRequestResponse } from "fastify"

import { obtenerDb } from "../src/adapters/db/cliente.js"
import { COLA_CALIFICACION_PUBLICADA } from "../src/core/eventos/avisos-de-clase.js"
import { firmarTokenDePrueba, type UsuarioDePrueba } from "./ayudas-auth.js"
import {
  crearAlumnoDePrueba,
  crearClaseDePrueba,
  inscribirDePrueba,
  tokenDelAdminDePrueba,
} from "./ayudas-clases.js"
import { crearTareaDePrueba, trabajosDeTarea } from "./ayudas-tareas.js"

// CALIFICACIONES-01a. Ayudas de las pruebas de calificar (archivo nuevo: las compartidas no se tocan,
// salvo crearEntregaDePrueba con A-3). Una clase con dos maestros y una alumna inscrita, una tarea con
// o sin rúbrica (criterios sembrados con su texto y su máximo) y los cuerpos del PUT de calificar.
// Todo muere en cascada con la clase (borrarMovimientosYClasesDePrueba antes que los usuarios).

export const HORA_MS = 60 * 60 * 1000

export interface CriterioDePrueba {
  criterio: string
  puntosMax: number
}

export interface OpcionesEscenarioDeCalificar {
  rubrica?: readonly CriterioDePrueba[]
  puntos?: number
  fechaLimite?: Date
  aceptaTardias?: boolean
  // Para distinguir los escenarios en los nombres (el orden del roster no importa aquí).
  ficha?: string
}

export interface EscenarioDeCalificar {
  claseId: string
  tareaId: string
  puntos: number
  // Los ids de los criterios, en el orden de la rúbrica ([] sin rúbrica).
  criterios: string[]
  maestro: UsuarioDePrueba
  otroMaestro: UsuarioDePrueba
  alumno: UsuarioDePrueba
  tokens: { maestro: string; otroMaestro: string; alumno: string; admin: string }
}

export const crearEscenarioDeCalificar = async (
  idsUsuarios: string[],
  idsClases: string[],
  {
    rubrica = [],
    puntos = 10,
    fechaLimite = new Date(Date.now() + 48 * HORA_MS),
    aceptaTardias = true,
    ficha = "",
  }: OpcionesEscenarioDeCalificar = {},
): Promise<EscenarioDeCalificar> => {
  const maestro = await crearAlumnoDePrueba(idsUsuarios, {
    nombre: `Maestra Califica ${ficha}`,
    rol: "maestro",
  })
  const otroMaestro = await crearAlumnoDePrueba(idsUsuarios, {
    nombre: `Maestro Segundo ${ficha}`,
    rol: "maestro",
  })
  const clase = await crearClaseDePrueba(idsClases, {
    maestroId: maestro.id,
    maestroIds: [maestro.id, otroMaestro.id],
  })
  const alumno = await crearAlumnoDePrueba(idsUsuarios, { nombre: `Alumna Calificada ${ficha}` })
  await inscribirDePrueba(clase.id, alumno.id)
  const tareaId = await crearTareaDePrueba({
    claseId: clase.id,
    autorId: maestro.id,
    puntos,
    fechaLimite,
    aceptaTardias,
  })
  if (rubrica.length > 0) {
    await obtenerDb().criterioRubrica.createMany({
      data: rubrica.map((c, orden) => ({
        tareaId,
        criterio: c.criterio,
        puntosMax: c.puntosMax,
        orden,
      })),
    })
  }
  const criterios = await idsDeCriterios(tareaId)
  return {
    claseId: clase.id,
    tareaId,
    puntos,
    criterios,
    maestro,
    otroMaestro,
    alumno,
    tokens: {
      maestro: await firmarTokenDePrueba({ usuarioId: maestro.id }),
      otroMaestro: await firmarTokenDePrueba({ usuarioId: otroMaestro.id }),
      alumno: await firmarTokenDePrueba({ usuarioId: alumno.id }),
      admin: await tokenDelAdminDePrueba(),
    },
  }
}

export const idsDeCriterios = async (tareaId: string): Promise<string[]> =>
  (
    await obtenerDb().criterioRubrica.findMany({
      where: { tareaId },
      orderBy: { orden: "asc" },
      select: { id: true },
    })
  ).map((c) => c.id)

export const urlDeCalificar = (e: EscenarioDeCalificar, alumnoId = e.alumno.id): string =>
  `/api/clases/${e.claseId}/tareas/${e.tareaId}/entregas/${alumnoId}/calificacion`

export const pedirEn =
  (obtenerApp: () => FastifyInstance) =>
  (
    token: string | null,
    method: "GET" | "POST" | "PUT" | "DELETE",
    url: string,
    payload?: InjectOptions["payload"],
  ): Promise<LightMyRequestResponse> =>
    obtenerApp().inject({
      method,
      url,
      ...(payload === undefined ? {} : { payload }),
      headers: token === null ? {} : { authorization: `Bearer ${token}` },
    })

export const codigoDe = (respuesta: LightMyRequestResponse): string =>
  errorApiSchema.parse(respuesta.json()).error.codigo

export const mensajeDe = (respuesta: LightMyRequestResponse): string =>
  errorApiSchema.parse(respuesta.json()).error.mensaje

// El cuerpo de calificar con rúbrica: un puntaje por criterio, en el orden de la rúbrica.
export const cuerpoConRubrica = (
  e: EscenarioDeCalificar,
  puntos: readonly number[],
  cambios: Record<string, unknown> = {},
): Record<string, unknown> => ({
  version: 0,
  puntosDeLaTarea: e.puntos,
  puntajes: e.criterios.map((criterioId, i) => ({ criterioId, puntos: puntos[i] ?? 0 })),
  calificacion: null,
  ...cambios,
})

// El cuerpo de calificar sin rúbrica: la calificación directa.
export const cuerpoDirecto = (
  e: EscenarioDeCalificar,
  calificacion: number,
  cambios: Record<string, unknown> = {},
): Record<string, unknown> => ({
  version: 0,
  puntosDeLaTarea: e.puntos,
  puntajes: [],
  calificacion,
  ...cambios,
})

export const trabajosDeCalificacion = (tareaId: string) =>
  trabajosDeTarea(COLA_CALIFICACION_PUBLICADA, tareaId)

// Trabajos de una cola por el id de la entrega en sus datos (los del hilo privado no llevan tareaId).
export const trabajosPorEntrega = (cola: string, entregaId: string) =>
  obtenerDb().$queryRaw<{ id: string }[]>`
    SELECT id::text AS id FROM pgboss.job
    WHERE name = ${cola} AND data ->> 'entregaId' = ${entregaId}::text`

// Foto de lo que calificar puede escribir para la alumna del escenario: la fila de la entrega, sus
// puntajes, sus comentarios y los trabajos de la tarea en la cola de calificaciones.
export const fotoDeCalificar = async (e: EscenarioDeCalificar, alumnoId = e.alumno.id) => {
  const entrega = await obtenerDb().entrega.findUnique({
    where: { tareaId_alumnoId: { tareaId: e.tareaId, alumnoId } },
    select: {
      id: true,
      estado: true,
      calificacion: true,
      fechaCalificacion: true,
      fechaEntrega: true,
      conRetraso: true,
      enlaces: true,
      version: true,
      actualizadoEn: true,
    },
  })
  const puntajes =
    entrega === null
      ? []
      : await obtenerDb().puntajeRubrica.findMany({
          where: { entregaId: entrega.id },
          orderBy: { criterioId: "asc" },
          select: { criterioId: true, puntos: true },
        })
  const comentarios =
    entrega === null ? 0 : await obtenerDb().comentario.count({ where: { entregaId: entrega.id } })
  return {
    entrega:
      entrega === null
        ? null
        : { ...entrega, calificacion: entrega.calificacion?.toString() ?? null },
    puntajes: puntajes.map((p) => ({ criterioId: p.criterioId, puntos: p.puntos.toString() })),
    comentarios,
    trabajos: (await trabajosDeCalificacion(e.tareaId)).map((t) => t.id),
  }
}
