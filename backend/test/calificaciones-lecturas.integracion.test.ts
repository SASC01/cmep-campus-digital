import {
  entregaDeAlumnoRespuestaSchema,
  errorApiSchema,
  listaEntregasRespuestaSchema,
  miEntregaRespuestaSchema,
} from "@campus/shared"
import type { FastifyInstance, LightMyRequestResponse } from "fastify"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { obtenerDb } from "../src/adapters/db/cliente.js"
import { construirApp } from "../src/app.js"
import { cargarEnv } from "../src/config/env.js"
import { crearAlmacenEnMemoria } from "./almacen-en-memoria.js"
import { borrarUsuariosDePrueba, crearUsuarioDePrueba, firmarTokenDePrueba } from "./ayudas-auth.js"
import {
  borrarMovimientosYClasesDePrueba,
  crearClaseDePrueba,
  inscribirDePrueba,
  tokenDelAdminDePrueba,
} from "./ayudas-clases.js"
import { crearEntregaDePrueba } from "./ayudas-entregas.js"
import { crearCriteriosDePrueba, crearTareaDePrueba } from "./ayudas-tareas.js"

// CALIFICACIONES-01a (CAL-1A15). La calificación en las dos lecturas de una entrega (§D-5): el alumno
// la ve con su desglose y nunca la versión; el maestro y el admin, con la versión. Sin calificar,
// calificacion es null. Las respuestas traen exactamente las llaves de sus esquemas (estrictos). Las
// filas calificadas se fabrican con SQL parametrizado (la calificación por la API la prueba
// calificaciones.integracion).

let app: FastifyInstance | undefined
const idsUsuarios: string[] = []
const idsClases: string[] = []

const obtenerApp = (): FastifyInstance => {
  if (!app) throw new Error("La aplicación no se construyó en beforeAll")
  return app
}

beforeAll(async () => {
  app = await construirApp({ env: cargarEnv(), almacen: crearAlmacenEnMemoria() })
  await app.ready()
})

afterAll(async () => {
  await borrarMovimientosYClasesDePrueba(idsClases)
  await borrarUsuariosDePrueba(idsUsuarios)
  await app?.close()
})

const pedir = (token: string, url: string): Promise<LightMyRequestResponse> =>
  obtenerApp().inject({ method: "GET", url, headers: { authorization: `Bearer ${token}` } })

const LLAVES_MI_ENTREGA = [
  "adjuntos",
  "calificacion",
  "conRetraso",
  "enlaces",
  "estado",
  "fechaEntrega",
  "puedeAnular",
  "puedeEntregar",
]
const LLAVES_ENTREGA_DE_ALUMNO = [
  "adjuntos",
  "alumno",
  "calificacion",
  "conRetraso",
  "enlaces",
  "estado",
  "fechaEntrega",
  "version",
]
const LLAVES_CALIFICACION = ["fecha", "puntajes", "puntos", "sobre"]

const llavesDe = (objeto: object): string[] => Object.keys(objeto).sort()

const escenario = async () => {
  const maestro = await crearUsuarioDePrueba(idsUsuarios, { rol: "maestro" })
  const alumna = await crearUsuarioDePrueba(idsUsuarios, { nombre: "Alumna Lectura" })
  const clase = await crearClaseDePrueba(idsClases, { maestroId: maestro.id })
  await inscribirDePrueba(clase.id, alumna.id)
  const conRubrica = await crearTareaDePrueba({
    claseId: clase.id,
    autorId: maestro.id,
    puntos: 10,
  })
  await crearCriteriosDePrueba(conRubrica, 2)
  const sinRubrica = await crearTareaDePrueba({
    claseId: clase.id,
    autorId: maestro.id,
    puntos: 80,
  })
  const tokens = {
    maestro: await firmarTokenDePrueba({ usuarioId: maestro.id }),
    alumna: await firmarTokenDePrueba({ usuarioId: alumna.id }),
    admin: await tokenDelAdminDePrueba(),
  }
  return { claseId: clase.id, alumna, conRubrica, sinRubrica, tokens }
}

describe("la calificación en las lecturas de una entrega (CAL-1A15)", () => {
  it("CAL-1A15: con rúbrica, el alumno ve la calificación con el desglose en el orden de la rúbrica y sin version; el maestro y el admin, con version", async () => {
    const e = await escenario()
    const fechaCalificacion = new Date("2026-10-13T15:00:00.000Z")
    const entregaId = await crearEntregaDePrueba({
      tareaId: e.conRubrica,
      alumnoId: e.alumna.id,
      estado: "calificado",
      calificacion: 7.5,
      version: 3,
    })
    await obtenerDb().$executeRaw`
      UPDATE entregas SET fecha_calificacion = ${fechaCalificacion} WHERE id = ${entregaId}::uuid`
    const criterios = await obtenerDb().criterioRubrica.findMany({
      where: { tareaId: e.conRubrica },
      orderBy: { orden: "asc" },
      select: { id: true, criterio: true },
    })
    const [c1, c2] = criterios
    if (c1 === undefined || c2 === undefined) throw new Error("Precondición: dos criterios")
    // Se insertan al revés del orden de la rúbrica: la lectura los ordena.
    await obtenerDb().$executeRaw`
      INSERT INTO puntajes_rubrica (entrega_id, criterio_id, puntos)
      VALUES (${entregaId}::uuid, ${c2.id}::uuid, ${4}::numeric),
             (${entregaId}::uuid, ${c1.id}::uuid, ${3.5}::numeric)`
    const esperada = {
      puntos: 7.5,
      sobre: 10,
      fecha: fechaCalificacion.toISOString(),
      puntajes: [
        { criterioId: c1.id, criterio: c1.criterio, puntosMax: 10, puntos: 3.5 },
        { criterioId: c2.id, criterio: c2.criterio, puntosMax: 10, puntos: 4 },
      ],
    }

    const delAlumno = await pedir(
      e.tokens.alumna,
      `/api/clases/${e.claseId}/tareas/${e.conRubrica}/entrega`,
    )
    expect(delAlumno.statusCode, delAlumno.body).toBe(200)
    const mia = miEntregaRespuestaSchema.parse(delAlumno.json()).entrega
    expect(llavesDe(delAlumno.json().entrega as object)).toEqual(LLAVES_MI_ENTREGA)
    expect(mia.calificacion).toEqual(esperada)
    expect(llavesDe(delAlumno.json().entrega.calificacion as object)).toEqual(LLAVES_CALIFICACION)
    expect(delAlumno.body).not.toMatch(/"version"/)

    for (const token of [e.tokens.maestro, e.tokens.admin]) {
      const respuesta = await pedir(
        token,
        `/api/clases/${e.claseId}/tareas/${e.conRubrica}/entregas/${e.alumna.id}`,
      )
      expect(respuesta.statusCode, respuesta.body).toBe(200)
      const deAlumno = entregaDeAlumnoRespuestaSchema.parse(respuesta.json()).entrega
      expect(llavesDe(respuesta.json().entrega as object)).toEqual(LLAVES_ENTREGA_DE_ALUMNO)
      expect(deAlumno.calificacion).toEqual(esperada)
      expect(deAlumno.version).toBe(3)
    }
  })

  it("CAL-1A15: sin rúbrica, la calificación directa trae puntajes []; sin calificar (con y sin fila), calificacion es null", async () => {
    const e = await escenario()
    await crearEntregaDePrueba({
      tareaId: e.sinRubrica,
      alumnoId: e.alumna.id,
      estado: "calificado",
      calificacion: 72.25,
    })
    const mia = miEntregaRespuestaSchema.parse(
      (
        await pedir(e.tokens.alumna, `/api/clases/${e.claseId}/tareas/${e.sinRubrica}/entrega`)
      ).json(),
    ).entrega
    expect(mia.calificacion).toMatchObject({ puntos: 72.25, sobre: 80, puntajes: [] })

    // Sin fila.
    const sinFila = await pedir(
      e.tokens.alumna,
      `/api/clases/${e.claseId}/tareas/${e.conRubrica}/entrega`,
    )
    expect(miEntregaRespuestaSchema.parse(sinFila.json()).entrega.calificacion).toBeNull()
    const sinFilaMaestro = await pedir(
      e.tokens.maestro,
      `/api/clases/${e.claseId}/tareas/${e.conRubrica}/entregas/${e.alumna.id}`,
    )
    expect(entregaDeAlumnoRespuestaSchema.parse(sinFilaMaestro.json()).entrega).toMatchObject({
      calificacion: null,
      version: 0,
      estado: "asignado",
    })

    // Con fila entregada.
    await crearEntregaDePrueba({ tareaId: e.conRubrica, alumnoId: e.alumna.id })
    const entregada = await pedir(
      e.tokens.maestro,
      `/api/clases/${e.claseId}/tareas/${e.conRubrica}/entregas/${e.alumna.id}`,
    )
    expect(entregaDeAlumnoRespuestaSchema.parse(entregada.json()).entrega).toMatchObject({
      calificacion: null,
      estado: "entregado",
    })
    const entregadaAlumno = await pedir(
      e.tokens.alumna,
      `/api/clases/${e.claseId}/tareas/${e.conRubrica}/entrega`,
    )
    expect(miEntregaRespuestaSchema.parse(entregadaAlumno.json()).entrega.calificacion).toBeNull()
  })

  it("CAL-1A15: una tarea de otra clase sigue siendo 404 TAREA_NO_ENCONTRADA en las dos lecturas", async () => {
    const e = await escenario()
    const otra = await escenario()
    const delAlumno = await pedir(
      e.tokens.alumna,
      `/api/clases/${e.claseId}/tareas/${otra.conRubrica}/entrega`,
    )
    expect(delAlumno.statusCode).toBe(404)
    expect(errorApiSchema.parse(delAlumno.json()).error.codigo).toBe("TAREA_NO_ENCONTRADA")
    const delMaestro = await pedir(
      e.tokens.maestro,
      `/api/clases/${e.claseId}/tareas/${otra.conRubrica}/entregas/${e.alumna.id}`,
    )
    expect(delMaestro.statusCode).toBe(404)
    expect(errorApiSchema.parse(delMaestro.json()).error.codigo).toBe("TAREA_NO_ENCONTRADA")
  })
})

// CALIFICACIONES-01a, ronda 1 (T-01). Con P-03 (c′) una entrega calificada puede no tener fecha de
// entrega: "entregó" es tener fecha_entrega (RF-35), no estar entregado o calificado.
describe("quiénes entregaron en la lista de entregas (CAL-1A15b)", () => {
  it("CAL-1A15b: en la lista de entregas, entregadas cuenta la entregada y la calificada con fecha de entrega, y no la calificada sin entrega", async () => {
    const e = await escenario()
    const conFecha = await crearUsuarioDePrueba(idsUsuarios, { nombre: "Alumna Calificada" })
    const sinEntrega = await crearUsuarioDePrueba(idsUsuarios, { nombre: "Alumna Sin Entrega" })
    const sinFila = await crearUsuarioDePrueba(idsUsuarios, { nombre: "Alumna Sin Fila" })
    for (const alumno of [conFecha, sinEntrega, sinFila])
      await inscribirDePrueba(e.claseId, alumno.id)
    await crearEntregaDePrueba({ tareaId: e.sinRubrica, alumnoId: e.alumna.id })
    await crearEntregaDePrueba({
      tareaId: e.sinRubrica,
      alumnoId: conFecha.id,
      estado: "calificado",
      calificacion: 70,
    })
    const calificadaSinEntrega = await crearEntregaDePrueba({
      tareaId: e.sinRubrica,
      alumnoId: sinEntrega.id,
      estado: "calificado",
      calificacion: 0,
    })
    await obtenerDb().$executeRaw`
      UPDATE entregas SET fecha_entrega = NULL WHERE id = ${calificadaSinEntrega}::uuid`

    const respuesta = await pedir(
      e.tokens.maestro,
      `/api/clases/${e.claseId}/tareas/${e.sinRubrica}/entregas`,
    )
    expect(respuesta.statusCode, respuesta.body).toBe(200)
    const lista = listaEntregasRespuestaSchema.parse(respuesta.json())
    expect(lista.total).toBe(4)
    expect(lista.entregadas, "la calificada sin entrega no cuenta como entregada").toBe(2)
    const fila = lista.entregas.find((f) => f.alumno.id === sinEntrega.id)
    expect(fila).toMatchObject({ estado: "calificado", fechaEntrega: null })
    const conFechaFila = lista.entregas.find((f) => f.alumno.id === conFecha.id)
    expect(conFechaFila?.estado).toBe("calificado")
    expect(conFechaFila?.fechaEntrega).not.toBeNull()
  })
})
