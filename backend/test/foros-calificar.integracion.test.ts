import {
  entregaDeAlumnoRespuestaSchema,
  exportacionDeCalificacionesRespuestaSchema,
  gradebookRespuestaSchema,
  listaComentariosPrivadosRespuestaSchema,
  listaEntregasRespuestaSchema,
  listaForosRespuestaSchema,
  listaParticipacionesDeAlumnoRespuestaSchema,
  misCalificacionesRespuestaSchema,
} from "@campus/shared"
import type { FastifyInstance } from "fastify"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { obtenerDb } from "../src/adapters/db/cliente.js"
import { construirApp } from "../src/app.js"
import { cargarEnv } from "../src/config/env.js"
import { COLA_CALIFICACION_PUBLICADA } from "../src/core/eventos/avisos-de-clase.js"
import { crearAlmacenEnMemoria } from "./almacen-en-memoria.js"
import { borrarUsuariosDePrueba } from "./ayudas-auth.js"
import { idsDeCriterios } from "./ayudas-calificaciones.js"
import { borrarMovimientosYClasesDePrueba } from "./ayudas-clases.js"
import { crearEntregaDePrueba, leerEntregaDb } from "./ayudas-entregas.js"
import {
  codigoDe,
  crearEscenarioDeForo,
  crearForoDePrueba,
  crearParticipacionDePrueba,
  HORA_MS,
  mensajeDe,
  pedirForo,
  urlForo,
  type EscenarioDeForo,
} from "./ayudas-foros.js"
import {
  crearCategoriaDePrueba,
  crearCriteriosDePrueba,
  crearTareaDePrueba,
  trabajosDeTarea,
} from "./ayudas-tareas.js"

// FORO-01a. FORO-1A40 a FORO-1A44: el foro en el gradebook, el riesgo, "Mis calificaciones" y la
// exportación; calificar a un participante, su aviso y sus devoluciones; y los participantes.

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

const escenario = (): Promise<EscenarioDeForo> => crearEscenarioDeForo(idsUsuarios, idsClases)

const PASADA = (): Date => new Date(Date.now() - 2 * HORA_MS)

const urlCalificar = (e: EscenarioDeForo, foroId: string, alumnoId = e.alumno.id): string =>
  `${urlForo(e.claseId, foroId)}/participantes/${alumnoId}/calificacion`

const calificar = (
  e: EscenarioDeForo,
  foroId: string,
  cuerpo: Record<string, unknown>,
  alumnoId = e.alumno.id,
) =>
  pedir({
    method: "PUT",
    url: urlCalificar(e, foroId, alumnoId),
    token: e.tokenMaestro,
    payload: { puntajes: [], calificacion: null, ...cuerpo },
  })

const participar = (e: EscenarioDeForo, foroId: string, token = e.tokenAlumno) =>
  pedir({
    method: "POST",
    url: `${urlForo(e.claseId, foroId)}/participaciones`,
    token,
    payload: { texto: "Mi participación" },
  })

const calificadaSinParticipar = async (foroId: string, alumnoId: string, calificacion = 5) => {
  await obtenerDb().$executeRaw`
    INSERT INTO entregas (tarea_id, alumno_id, estado, calificacion, fecha_calificacion, version)
    VALUES (${foroId}::uuid, ${alumnoId}::uuid, 'calificado', ${calificacion}, now(), 1)`
}

describe("FORO-1A40 y FORO-1A41: el foro en las calificaciones de la clase", () => {
  it("FORO-1A40: un foro calificado sale como columna del gradebook y de la exportación, con su calificación, y pondera en su categoría como una tarea", async () => {
    const e = await escenario()
    const tareas = await crearCategoriaDePrueba({ claseId: e.claseId, nombre: "Tareas", peso: 60 })
    const foros = await crearCategoriaDePrueba({ claseId: e.claseId, nombre: "Foros", peso: 40 })
    const tareaId = await crearTareaDePrueba({
      claseId: e.claseId,
      autorId: e.maestro.id,
      categoriaId: tareas.id,
      puntos: 10,
    })
    await crearEntregaDePrueba({
      tareaId,
      alumnoId: e.alumno.id,
      estado: "calificado",
      calificacion: 8,
    })
    const foroId = await crearForoDePrueba({
      claseId: e.claseId,
      autorId: e.maestro.id,
      categoriaId: foros.id,
      puntos: 10,
    })
    expect((await participar(e, foroId)).statusCode).toBe(201)
    const calificado = await calificar(e, foroId, {
      version: 1,
      puntosDeLaTarea: 10,
      calificacion: 5,
    })
    expect(calificado.statusCode, calificado.body).toBe(200)

    const gradebook = gradebookRespuestaSchema.parse(
      (
        await pedir({
          method: "GET",
          url: `/api/clases/${e.claseId}/gradebook`,
          token: e.tokenMaestro,
        })
      ).json(),
    )
    expect(gradebook.tareas.map((t) => t.id).sort()).toEqual([foroId, tareaId].sort())
    const fila = gradebook.alumnos.find((a) => a.alumno.id === e.alumno.id)
    const indice = gradebook.tareas.findIndex((t) => t.id === foroId)
    expect(fila?.celdas[indice]).toEqual({
      tareaId: foroId,
      estado: "calificado",
      conRetraso: false,
      calificacion: 5,
    })
    // 60 % de 8/10 y 40 % de 5/10.
    expect(fila?.porcentaje).toBe(68)

    const exportacion = exportacionDeCalificacionesRespuestaSchema.parse(
      (
        await pedir({
          method: "GET",
          url: `/api/clases/${e.claseId}/calificaciones/exportacion`,
          token: e.tokenMaestro,
        })
      ).json(),
    )
    const columna = exportacion.tareas.findIndex((t) => t.id === foroId)
    expect(columna).toBeGreaterThanOrEqual(0)
    const deLaAlumna = exportacion.alumnos.find((a) => a.alumno.id === e.alumno.id)
    expect(deLaAlumna?.celdas[columna]).toMatchObject({ calificacion: 5 })
    expect(deLaAlumna?.porcentaje).toBe(68)
  })

  it("FORO-1A41: un foro vencido sin principal cuenta en vencidasSinEntregar; con principal o calificado sin participar, no; Mis calificaciones lo lista en cada filtro", async () => {
    const e = await escenario()
    const foroId = await crearForoDePrueba({
      claseId: e.claseId,
      autorId: e.maestro.id,
      fechaLimite: PASADA(),
    })
    await crearParticipacionDePrueba({ foroId, autorId: e.otroAlumno.id })
    await crearEntregaDePrueba({ tareaId: foroId, alumnoId: e.otroAlumno.id })
    const gradebook = gradebookRespuestaSchema.parse(
      (
        await pedir({
          method: "GET",
          url: `/api/clases/${e.claseId}/gradebook`,
          token: e.tokenMaestro,
        })
      ).json(),
    )
    const vencidas = (id: string) =>
      gradebook.alumnos.find((a) => a.alumno.id === id)?.vencidasSinEntregar
    expect(vencidas(e.alumno.id)).toBe(1)
    expect(vencidas(e.otroAlumno.id)).toBe(0)

    const mis = async (token: string, estado: string) =>
      misCalificacionesRespuestaSchema
        .parse(
          (
            await pedir({
              method: "GET",
              url: `/api/clases/${e.claseId}/mis-calificaciones?estado=${estado}`,
              token,
            })
          ).json(),
        )
        .tareas.map((t) => t.id)
    expect(await mis(e.tokenAlumno, "sin-entregar")).toEqual([foroId])
    expect(await mis(e.tokenAlumno, "entregadas")).toEqual([])
    expect(await mis(e.tokenOtroAlumno, "entregadas")).toEqual([foroId])
    expect(await mis(e.tokenOtroAlumno, "sin-entregar")).toEqual([])

    await calificadaSinParticipar(foroId, e.alumno.id)
    const despues = gradebookRespuestaSchema.parse(
      (
        await pedir({
          method: "GET",
          url: `/api/clases/${e.claseId}/gradebook`,
          token: e.tokenMaestro,
        })
      ).json(),
    )
    expect(despues.alumnos.find((a) => a.alumno.id === e.alumno.id)?.vencidasSinEntregar).toBe(0)
    expect(await mis(e.tokenAlumno, "calificadas")).toEqual([foroId])
    expect(await mis(e.tokenAlumno, "todas")).toEqual([foroId])
  })
})

describe("FORO-1A41 (M-09): cada estado de la entrega de un foro en cada filtro, en la lista de foros y en Participantes", () => {
  const FUTURA = (): Date => new Date(Date.now() + 5 * 24 * HORA_MS)
  const FILTROS = ["todas", "asignadas", "entregadas", "calificadas", "sin-entregar"] as const

  const misCalificaciones = async (e: EscenarioDeForo, estado: string): Promise<string[]> => {
    const respuesta = await pedir({
      method: "GET",
      url: `/api/clases/${e.claseId}/mis-calificaciones?estado=${estado}`,
      token: e.tokenAlumno,
    })
    expect(respuesta.statusCode, respuesta.body).toBe(200)
    return misCalificacionesRespuestaSchema
      .parse(respuesta.json())
      .tareas.map((t) => t.id)
      .sort()
  }

  // Seis foros de la misma clase, uno por cada estado posible de la entrega del alumno.
  const seisEstados = async (e: EscenarioDeForo) => {
    const foro = (fechaLimite: Date, aceptaTardias = false) =>
      crearForoDePrueba({ claseId: e.claseId, autorId: e.maestro.id, fechaLimite, aceptaTardias })
    const abierto = await foro(FUTURA())
    const vencido = await foro(PASADA())
    const entregado = await foro(FUTURA())
    const conRetraso = await foro(PASADA(), true)
    const calificadoConParticipacion = await foro(PASADA())
    const calificadoSinParticipar = await foro(PASADA())
    for (const foroId of [entregado, conRetraso, calificadoConParticipacion]) {
      await crearParticipacionDePrueba({
        foroId,
        autorId: e.alumno.id,
        conRetraso: foroId === conRetraso,
      })
    }
    await crearEntregaDePrueba({ tareaId: entregado, alumnoId: e.alumno.id })
    await crearEntregaDePrueba({ tareaId: conRetraso, alumnoId: e.alumno.id, conRetraso: true })
    await crearEntregaDePrueba({
      tareaId: calificadoConParticipacion,
      alumnoId: e.alumno.id,
      estado: "calificado",
      calificacion: 9,
    })
    await calificadaSinParticipar(calificadoSinParticipar, e.alumno.id)
    return {
      abierto,
      vencido,
      entregado,
      conRetraso,
      calificadoConParticipacion,
      calificadoSinParticipar,
    }
  }

  it("FORO-1A41: un foro abierto sin principal del alumno está en asignadas y no en sin-entregar; al publicar su principal sale de asignadas y aparece en entregadas", async () => {
    const e = await escenario()
    const foroId = await crearForoDePrueba({
      claseId: e.claseId,
      autorId: e.maestro.id,
      fechaLimite: FUTURA(),
    })
    expect(await misCalificaciones(e, "asignadas")).toEqual([foroId])
    expect(await misCalificaciones(e, "sin-entregar")).toEqual([])
    expect(await misCalificaciones(e, "entregadas")).toEqual([])
    expect((await participar(e, foroId)).statusCode).toBe(201)
    expect(await misCalificaciones(e, "asignadas")).toEqual([])
    expect(await misCalificaciones(e, "entregadas")).toEqual([foroId])
    expect(await misCalificaciones(e, "sin-entregar")).toEqual([])
  })

  it("FORO-1A41: cada estado de la entrega (asignado abierto, vencido sin participar, entregado, entregado con retraso, calificado con y sin participación) está exactamente en sus filtros", async () => {
    const e = await escenario()
    const f = await seisEstados(e)
    const esperado: Record<(typeof FILTROS)[number], string[]> = {
      todas: Object.values(f),
      asignadas: [f.abierto],
      entregadas: [f.entregado, f.conRetraso],
      calificadas: [f.calificadoConParticipacion, f.calificadoSinParticipar],
      "sin-entregar": [f.vencido],
    }
    for (const filtro of FILTROS) {
      expect(await misCalificaciones(e, filtro), filtro).toEqual([...esperado[filtro]].sort())
    }
    const todas = misCalificacionesRespuestaSchema.parse(
      (
        await pedir({
          method: "GET",
          url: `/api/clases/${e.claseId}/mis-calificaciones`,
          token: e.tokenAlumno,
        })
      ).json(),
    ).tareas
    const entregaDe = (id: string) => todas.find((t) => t.id === id)?.entrega
    expect(entregaDe(f.abierto)).toEqual({
      estado: "asignado",
      conRetraso: false,
      calificacion: null,
    })
    expect(entregaDe(f.vencido)).toEqual({
      estado: "asignado",
      conRetraso: false,
      calificacion: null,
    })
    expect(entregaDe(f.conRetraso)).toMatchObject({ estado: "entregado", conRetraso: true })
    expect(entregaDe(f.calificadoSinParticipar)).toMatchObject({
      estado: "calificado",
      calificacion: 5,
    })
  })

  it("FORO-1A24 y FORO-1A44: los mismos seis estados en la entrega de la lista de foros del alumno y en Participantes del maestro", async () => {
    const e = await escenario()
    const f = await seisEstados(e)
    const lista = listaForosRespuestaSchema.parse(
      (
        await pedir({ method: "GET", url: `/api/clases/${e.claseId}/foros`, token: e.tokenAlumno })
      ).json(),
    ).foros
    const entregaEnLaLista = (id: string) => lista.find((foro) => foro.id === id)?.entrega
    expect(entregaEnLaLista(f.abierto)).toBeNull()
    expect(entregaEnLaLista(f.vencido)).toBeNull()
    expect(entregaEnLaLista(f.entregado)).toEqual({ estado: "entregado", conRetraso: false })
    expect(entregaEnLaLista(f.conRetraso)).toEqual({ estado: "entregado", conRetraso: true })
    expect(entregaEnLaLista(f.calificadoConParticipacion)).toEqual({
      estado: "calificado",
      conRetraso: false,
    })
    expect(entregaEnLaLista(f.calificadoSinParticipar)).toEqual({
      estado: "calificado",
      conRetraso: false,
    })

    const participante = async (foroId: string) => {
      const respuesta = listaEntregasRespuestaSchema.parse(
        (
          await pedir({
            method: "GET",
            url: `${urlForo(e.claseId, foroId)}/participantes`,
            token: e.tokenMaestro,
          })
        ).json(),
      )
      const fila = respuesta.entregas.find((x) => x.alumno.id === e.alumno.id)
      return {
        estado: fila?.estado,
        conRetraso: fila?.conRetraso,
        conFecha: fila?.fechaEntrega !== null,
        entregadas: respuesta.entregadas,
      }
    }
    expect(await participante(f.abierto)).toEqual({
      estado: "asignado",
      conRetraso: false,
      conFecha: false,
      entregadas: 0,
    })
    expect(await participante(f.vencido)).toEqual({
      estado: "asignado",
      conRetraso: false,
      conFecha: false,
      entregadas: 0,
    })
    expect(await participante(f.entregado)).toEqual({
      estado: "entregado",
      conRetraso: false,
      conFecha: true,
      entregadas: 1,
    })
    expect(await participante(f.conRetraso)).toEqual({
      estado: "entregado",
      conRetraso: true,
      conFecha: true,
      entregadas: 1,
    })
    expect(await participante(f.calificadoConParticipacion)).toEqual({
      estado: "calificado",
      conRetraso: false,
      conFecha: true,
      entregadas: 1,
    })
    expect(await participante(f.calificadoSinParticipar)).toEqual({
      estado: "calificado",
      conRetraso: false,
      conFecha: false,
      entregadas: 0,
    })
  })
})

describe("FORO-1A42: calificar a un participante", () => {
  it("FORO-1A42: con rúbrica (suma escalada) y sin rúbrica, y recalificar", async () => {
    const e = await escenario()
    const conRubrica = await crearForoDePrueba({
      claseId: e.claseId,
      autorId: e.maestro.id,
      puntos: 20,
    })
    await crearCriteriosDePrueba(conRubrica, 2)
    expect((await participar(e, conRubrica)).statusCode).toBe(201)
    const [c1, c2] = await idsDeCriterios(conRubrica)
    if (c1 === undefined || c2 === undefined) throw new Error("Precondición: dos criterios")
    const primera = await calificar(e, conRubrica, {
      version: 1,
      puntosDeLaTarea: 20,
      puntajes: [
        { criterioId: c1, puntos: 10 },
        { criterioId: c2, puntos: 5 },
      ],
    })
    expect(primera.statusCode, primera.body).toBe(200)
    // (10 + 5) × 20 / 20 = 15.
    expect(entregaDeAlumnoRespuestaSchema.parse(primera.json()).entrega).toMatchObject({
      estado: "calificado",
      version: 2,
      calificacion: { puntos: 15, sobre: 20 },
    })
    const recalificada = await calificar(e, conRubrica, {
      version: 2,
      puntosDeLaTarea: 20,
      puntajes: [
        { criterioId: c1, puntos: 10 },
        { criterioId: c2, puntos: 10 },
      ],
    })
    expect(
      entregaDeAlumnoRespuestaSchema.parse(recalificada.json()).entrega.calificacion,
    ).toMatchObject({ puntos: 20 })

    const sinRubrica = await crearForoDePrueba({ claseId: e.claseId, autorId: e.maestro.id })
    expect((await participar(e, sinRubrica)).statusCode).toBe(201)
    const directa = await calificar(e, sinRubrica, {
      version: 1,
      puntosDeLaTarea: 10,
      calificacion: 7.5,
    })
    expect(entregaDeAlumnoRespuestaSchema.parse(directa.json()).entrega.calificacion).toMatchObject(
      {
        puntos: 7.5,
        puntajes: [],
      },
    )
  })

  it("FORO-1A42: la versión vieja o una principal publicada después de abrir el panel dan 409 ENTREGA_MODIFICADA, y puntos viejos 409 RUBRICA_MODIFICADA, con el texto del foro", async () => {
    const e = await escenario()
    const foroId = await crearForoDePrueba({ claseId: e.claseId, autorId: e.maestro.id })
    // El maestro abre el panel con la versión 0 (sin fila) y la alumna publica antes de que guarde.
    const panel = await pedir({
      method: "GET",
      url: `${urlForo(e.claseId, foroId)}/participantes/${e.alumno.id}`,
      token: e.tokenMaestro,
    })
    expect(entregaDeAlumnoRespuestaSchema.parse(panel.json()).entrega.version).toBe(0)
    expect((await participar(e, foroId)).statusCode).toBe(201)
    const tarde = await calificar(e, foroId, { version: 0, puntosDeLaTarea: 10, calificacion: 8 })
    expect(tarde.statusCode).toBe(409)
    expect(codigoDe(tarde)).toBe("ENTREGA_MODIFICADA")
    expect(mensajeDe(tarde)).toBe(
      "La participación cambió mientras la calificabas: el alumno la publicó u otra persona la calificó. No se guardó tu calificación; revisa la participación actual.",
    )
    const puntos = await calificar(e, foroId, { version: 1, puntosDeLaTarea: 50, calificacion: 8 })
    expect(puntos.statusCode).toBe(409)
    expect(codigoDe(puntos)).toBe("RUBRICA_MODIFICADA")
    expect(mensajeDe(puntos)).toBe(
      "La rúbrica o los puntos del foro cambiaron mientras calificabas. No se guardó tu calificación; vuelve a calificar con la versión actual.",
    )
    expect((await leerEntregaDb(foroId, e.alumno.id))?.estado).toBe("entregado")
  })

  it("FORO-1A42: a quien no participó, con el foro abierto, 409 ENTREGA_NO_CALIFICABLE con el texto del foro; cerrado, 200 y calificado sin fecha de entrega", async () => {
    const e = await escenario()
    const abierto = await crearForoDePrueba({
      claseId: e.claseId,
      autorId: e.maestro.id,
      fechaLimite: PASADA(),
      aceptaTardias: true,
    })
    const respuesta = await calificar(e, abierto, {
      version: 0,
      puntosDeLaTarea: 10,
      calificacion: 3,
    })
    expect(respuesta.statusCode).toBe(409)
    expect(codigoDe(respuesta)).toBe("ENTREGA_NO_CALIFICABLE")
    expect(mensajeDe(respuesta)).toBe(
      "Este alumno todavía puede participar. Podrás calificarlo cuando participe o cuando se cierre el foro.",
    )
    expect(await leerEntregaDb(abierto, e.alumno.id)).toBeNull()

    const cerrado = await crearForoDePrueba({
      claseId: e.claseId,
      autorId: e.maestro.id,
      fechaLimite: PASADA(),
      aceptaTardias: false,
    })
    const ok = await calificar(e, cerrado, { version: 0, puntosDeLaTarea: 10, calificacion: 3 })
    expect(ok.statusCode, ok.body).toBe(200)
    expect(await leerEntregaDb(cerrado, e.alumno.id)).toMatchObject({
      estado: "calificado",
      fechaEntrega: null,
    })
  })
})

describe("FORO-1A43: el aviso de la calificación y las devoluciones", () => {
  it("FORO-1A43: encola CALIFICACION_PUBLICADA con solo ids y un id nuevo por publicación; el comentario sale en las devoluciones del alumno y del maestro, ascendentes", async () => {
    const e = await escenario()
    const foroId = await crearForoDePrueba({ claseId: e.claseId, autorId: e.maestro.id })
    expect((await participar(e, foroId)).statusCode).toBe(201)
    const uno = await calificar(e, foroId, {
      version: 1,
      puntosDeLaTarea: 10,
      calificacion: 6,
      comentario: "Buen inicio",
    })
    expect(uno.statusCode, uno.body).toBe(200)
    const dos = await calificar(e, foroId, {
      version: 2,
      puntosDeLaTarea: 10,
      calificacion: 9,
      comentario: "Mejoraste",
    })
    expect(dos.statusCode, dos.body).toBe(200)
    const entrega = await leerEntregaDb(foroId, e.alumno.id)
    if (entrega === null) throw new Error("Precondición: la entrega existe")
    const trabajos = await trabajosDeTarea(COLA_CALIFICACION_PUBLICADA, foroId)
    expect(trabajos).toHaveLength(2)
    expect(new Set(trabajos.map((t) => t.id)).size).toBe(2)
    expect(trabajos.map((t) => t.datos)).toEqual([
      { entregaId: entrega.id, tareaId: foroId, claseId: e.claseId, version: 2 },
      { entregaId: entrega.id, tareaId: foroId, claseId: e.claseId, version: 3 },
    ])
    const comentarios = await obtenerDb().comentario.findMany({ where: { entregaId: entrega.id } })
    expect(comentarios).toHaveLength(2)

    for (const { url, token } of [
      { url: `${urlForo(e.claseId, foroId)}/mi-participacion/devoluciones`, token: e.tokenAlumno },
      {
        url: `${urlForo(e.claseId, foroId)}/participantes/${e.alumno.id}/devoluciones`,
        token: e.tokenMaestro,
      },
    ]) {
      const respuesta = await pedir({ method: "GET", url, token })
      expect(respuesta.statusCode, respuesta.body).toBe(200)
      const lista = listaComentariosPrivadosRespuestaSchema.parse(respuesta.json())
      expect(lista.comentarios.map((c) => c.texto)).toEqual(["Buen inicio", "Mejoraste"])
      const primera = await pedir({ method: "GET", url: `${url}?limite=1`, token })
      const pagina = listaComentariosPrivadosRespuestaSchema.parse(primera.json())
      expect(pagina.comentarios).toHaveLength(1)
      expect(pagina.siguienteCursor).not.toBeNull()
    }

    // Un cursor de otro hilo responde 400.
    const otroForo = await crearForoDePrueba({ claseId: e.claseId, autorId: e.maestro.id })
    expect((await participar(e, otroForo, e.tokenOtroAlumno)).statusCode).toBe(201)
    const ajeno = await calificar(
      e,
      otroForo,
      { version: 1, puntosDeLaTarea: 10, calificacion: 4, comentario: "Otro hilo" },
      e.otroAlumno.id,
    )
    expect(ajeno.statusCode, ajeno.body).toBe(200)
    const delOtro = await obtenerDb().comentario.findFirst({ where: { texto: "Otro hilo" } })
    if (delOtro === null) throw new Error("Precondición: el comentario del otro hilo existe")
    const conCursorAjeno = await pedir({
      method: "GET",
      url: `${urlForo(e.claseId, foroId)}/mi-participacion/devoluciones?cursor=${delOtro.id}`,
      token: e.tokenAlumno,
    })
    expect(conCursorAjeno.statusCode).toBe(400)
    expect(codigoDe(conCursorAjeno)).toBe("VALIDACION")
  })
})

describe("FORO-1A44: los participantes", () => {
  it("FORO-1A44: la lista con total y entregadas (quienes participaron), el participante con su versión y sin enlaces ni adjuntos, y lo que escribió con enRespuestaA", async () => {
    const e = await escenario()
    const foroId = await crearForoDePrueba({ claseId: e.claseId, autorId: e.maestro.id })
    const publicada = (await participar(e, foroId)).json<{ participacion: { id: string } }>()
    const deOtro = await crearParticipacionDePrueba({
      foroId,
      autorId: e.otroAlumno.id,
      creadoEn: new Date(Date.now() - HORA_MS),
    })
    await crearParticipacionDePrueba({
      foroId,
      autorId: e.alumno.id,
      principalId: deOtro,
      texto: "Respondo al otro",
    })

    const lista = listaEntregasRespuestaSchema.parse(
      (
        await pedir({
          method: "GET",
          url: `${urlForo(e.claseId, foroId)}/participantes`,
          token: e.tokenMaestro,
        })
      ).json(),
    )
    expect(lista.total).toBe(2)
    expect(lista.entregadas).toBe(1)
    expect(lista.entregas.find((f) => f.alumno.id === e.alumno.id)?.estado).toBe("entregado")
    expect(lista.entregas.find((f) => f.alumno.id === e.otroAlumno.id)?.estado).toBe("asignado")
    const primera = listaEntregasRespuestaSchema.parse(
      (
        await pedir({
          method: "GET",
          url: `${urlForo(e.claseId, foroId)}/participantes?limite=1`,
          token: e.tokenAdmin,
        })
      ).json(),
    )
    expect(primera.entregas).toHaveLength(1)
    expect(primera.siguienteCursor).toBe(primera.entregas[0]?.alumno.id)

    const participante = entregaDeAlumnoRespuestaSchema.parse(
      (
        await pedir({
          method: "GET",
          url: `${urlForo(e.claseId, foroId)}/participantes/${e.alumno.id}`,
          token: e.tokenMaestro,
        })
      ).json(),
    )
    expect(participante.entrega).toMatchObject({
      estado: "entregado",
      version: 1,
      enlaces: [],
      adjuntos: [],
    })

    const escritas = listaParticipacionesDeAlumnoRespuestaSchema.parse(
      (
        await pedir({
          method: "GET",
          url: `${urlForo(e.claseId, foroId)}/participantes/${e.alumno.id}/participaciones`,
          token: e.tokenMaestro,
        })
      ).json(),
    )
    expect(escritas.participaciones).toHaveLength(2)
    expect(escritas.participaciones[0]).toMatchObject({
      id: publicada.participacion.id,
      enRespuestaA: null,
    })
    expect(escritas.participaciones[1]).toMatchObject({
      texto: "Respondo al otro",
      enRespuestaA: {
        participacionId: deOtro,
        autor: { id: e.otroAlumno.id, nombre: "Alumno Foro", administracion: false },
      },
    })

    // Un alumno que no está inscrito en la clase: 404 ALUMNO_NO_ENCONTRADO en 13 a 16.
    const ajeno = "00000000-0000-4000-8000-000000000001"
    for (const sufijo of ["", "/participaciones", "/devoluciones"]) {
      const respuesta = await pedir({
        method: "GET",
        url: `${urlForo(e.claseId, foroId)}/participantes/${ajeno}${sufijo}`,
        token: e.tokenMaestro,
      })
      expect(respuesta.statusCode, sufijo).toBe(404)
      expect(codigoDe(respuesta)).toBe("ALUMNO_NO_ENCONTRADO")
    }
    const calificarAjeno = await calificar(
      e,
      foroId,
      { version: 0, puntosDeLaTarea: 10, calificacion: 1 },
      ajeno,
    )
    expect(codigoDe(calificarAjeno)).toBe("ALUMNO_NO_ENCONTRADO")
  })
})
