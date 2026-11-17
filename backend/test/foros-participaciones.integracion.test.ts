import {
  listaParticipacionesRespuestaSchema,
  listaReplicasRespuestaSchema,
  miParticipacionRespuestaSchema,
  participacionPublicadaRespuestaSchema,
} from "@campus/shared"
import type { FastifyInstance, LightMyRequestResponse } from "fastify"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { obtenerDb } from "../src/adapters/db/cliente.js"
import { construirApp } from "../src/app.js"
import { cargarEnv } from "../src/config/env.js"
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
import { crearCriteriosDePrueba } from "./ayudas-tareas.js"

// FORO-01a. FORO-1A27 a FORO-1A35: participar, replicar, las listas, "mi participación", que nada de
// esto encola y la validación de los textos.

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

const FUTURA = (): Date => new Date(Date.now() + 5 * 24 * HORA_MS)
const PASADA = (): Date => new Date(Date.now() - 2 * HORA_MS)

const participar = (
  e: EscenarioDeForo,
  foroId: string,
  texto = "Mi participación",
  token = e.tokenAlumno,
) =>
  pedir({
    method: "POST",
    url: `${urlForo(e.claseId, foroId)}/participaciones`,
    token,
    payload: { texto },
  })

const replicar = (
  e: EscenarioDeForo,
  foroId: string,
  principalId: string,
  token: string,
  texto = "Mi réplica",
) =>
  pedir({
    method: "POST",
    url: `${urlForo(e.claseId, foroId)}/participaciones/${principalId}/replicas`,
    token,
    payload: { texto },
  })

const miParticipacion = async (e: EscenarioDeForo, foroId: string, token = e.tokenAlumno) => {
  const respuesta = await pedir({
    method: "GET",
    url: `${urlForo(e.claseId, foroId)}/mi-participacion`,
    token,
  })
  expect(respuesta.statusCode, respuesta.body).toBe(200)
  return miParticipacionRespuestaSchema.parse(respuesta.json())
}

const principalesDb = (foroId: string, autorId: string) =>
  obtenerDb().participacionForo.findMany({ where: { foroId, autorId, principalId: null } })

const trabajosQueMencionan = async (valor: string): Promise<number> => {
  const [fila] = await obtenerDb().$queryRaw<{ n: number }[]>`
    SELECT count(*)::int AS n FROM pgboss.job WHERE data::text LIKE ${`%${valor}%`}`
  return fila?.n ?? 0
}

describe("FORO-1A27 y FORO-1A28: concurrencia", () => {
  it("FORO-1A27: diez principales simultáneas del mismo alumno dan una 201 y nueve 409 PARTICIPACION_YA_PUBLICADA, una sola fila principal y la entrega entregado con version 1", async () => {
    const e = await escenario()
    const foroId = await crearForoDePrueba({ claseId: e.claseId, autorId: e.maestro.id })
    const respuestas = await Promise.all(
      Array.from({ length: 10 }, (_, i) => participar(e, foroId, `Participación ${String(i)}`)),
    )
    const estados = respuestas.map((r) => r.statusCode).sort()
    expect(estados).toEqual([201, 409, 409, 409, 409, 409, 409, 409, 409, 409])
    for (const respuesta of respuestas.filter((r) => r.statusCode === 409)) {
      expect(codigoDe(respuesta)).toBe("PARTICIPACION_YA_PUBLICADA")
    }
    expect(await principalesDb(foroId, e.alumno.id)).toHaveLength(1)
    const entrega = await leerEntregaDb(foroId, e.alumno.id)
    expect(entrega).toMatchObject({ estado: "entregado", version: 1 })
  }, 60_000)

  it("FORO-1A28: una réplica mientras se borra el foro responde 201 antes o 404 después, nunca 500 ni P2003", async () => {
    const e = await escenario()
    for (let vuelta = 0; vuelta < 5; vuelta += 1) {
      const foroId = await crearForoDePrueba({ claseId: e.claseId, autorId: e.maestro.id })
      const principal = await crearParticipacionDePrueba({ foroId, autorId: e.otroAlumno.id })
      await crearEntregaDePrueba({ tareaId: foroId, alumnoId: e.otroAlumno.id })
      const [replica, borrado] = await Promise.all([
        replicar(e, foroId, principal, e.tokenAlumno),
        pedir({
          method: "DELETE",
          url: `${urlForo(e.claseId, foroId)}?confirmar=entregas`,
          token: e.tokenAdmin,
        }),
      ])
      expect(borrado.statusCode, borrado.body).toBe(204)
      expect([201, 404], replica.body).toContain(replica.statusCode)
      if (replica.statusCode === 404) expect(codigoDe(replica)).toBe("TAREA_NO_ENCONTRADA")
      expect(await obtenerDb().participacionForo.count({ where: { foroId } })).toBe(0)
    }
  }, 60_000)
})

describe("FORO-1A29 y FORO-1A30: la principal y la regla tardía", () => {
  it("FORO-1A29: a tiempo, la entrega queda entregado con la hora de la principal, sin retraso y con la versión siguiente", async () => {
    const e = await escenario()
    const foroId = await crearForoDePrueba({
      claseId: e.claseId,
      autorId: e.maestro.id,
      fechaLimite: FUTURA(),
    })
    const respuesta = await participar(e, foroId)
    expect(respuesta.statusCode, respuesta.body).toBe(201)
    const publicada = participacionPublicadaRespuestaSchema.parse(respuesta.json())
    expect(publicada.participacion).toMatchObject({ propia: true, replicas: 0, conRetraso: false })
    expect(publicada.miParticipacion).toMatchObject({
      estado: "entregado",
      principalId: publicada.participacion.id,
      puedeParticipar: false,
    })
    const [fila] = await principalesDb(foroId, e.alumno.id)
    const entrega = await leerEntregaDb(foroId, e.alumno.id)
    expect(entrega).toMatchObject({ estado: "entregado", conRetraso: false, version: 1 })
    expect(entrega?.fechaEntrega?.getTime()).toBe(fila?.creadoEn.getTime())
    expect(fila?.conRetraso).toBe(false)
  })

  it("FORO-1A29: después de la fecha con tardías, la participación y la entrega quedan con retraso", async () => {
    const e = await escenario()
    const foroId = await crearForoDePrueba({
      claseId: e.claseId,
      autorId: e.maestro.id,
      fechaLimite: PASADA(),
      aceptaTardias: true,
    })
    expect((await participar(e, foroId)).statusCode).toBe(201)
    expect((await principalesDb(foroId, e.alumno.id))[0]?.conRetraso).toBe(true)
    expect((await leerEntregaDb(foroId, e.alumno.id))?.conRetraso).toBe(true)
  })

  it("FORO-1A29: sin tardías y vencido, 409 FORO_CERRADO sin fila perezosa; reabrirlo (fecha futura o aceptar tardías) deja publicar", async () => {
    const e = await escenario()
    const foroId = await crearForoDePrueba({
      claseId: e.claseId,
      autorId: e.maestro.id,
      fechaLimite: PASADA(),
      aceptaTardias: false,
    })
    const cerrado = await participar(e, foroId)
    expect(cerrado.statusCode).toBe(409)
    expect(codigoDe(cerrado)).toBe("FORO_CERRADO")
    expect(mensajeDe(cerrado)).toBe(
      "La fecha límite ya pasó y este foro no acepta participaciones con retraso.",
    )
    expect(await leerEntregaDb(foroId, e.alumno.id)).toBeNull()
    expect(await principalesDb(foroId, e.alumno.id)).toHaveLength(0)

    await obtenerDb().tarea.update({
      where: { id: foroId },
      data: { aceptaTardias: true },
      select: { id: true },
    })
    expect((await participar(e, foroId)).statusCode).toBe(201)

    const otro = await crearForoDePrueba({
      claseId: e.claseId,
      autorId: e.maestro.id,
      fechaLimite: PASADA(),
      aceptaTardias: false,
    })
    expect((await participar(e, otro)).statusCode).toBe(409)
    await obtenerDb().tarea.update({
      where: { id: otro },
      data: { fechaLimite: FUTURA() },
      select: { id: true },
    })
    expect((await participar(e, otro)).statusCode).toBe(201)
  })

  it("FORO-1A30: calificado sin participar (cerrado), 409 PARTICIPACION_CALIFICADA aunque se reabra; sus réplicas siguen la regla", async () => {
    const e = await escenario()
    const foroId = await crearForoDePrueba({
      claseId: e.claseId,
      autorId: e.maestro.id,
      fechaLimite: PASADA(),
      aceptaTardias: false,
    })
    await obtenerDb().$executeRaw`
      INSERT INTO entregas (tarea_id, alumno_id, estado, calificacion, fecha_calificacion, version)
      VALUES (${foroId}::uuid, ${e.alumno.id}::uuid, 'calificado', 5, now(), 1)`
    const principal = await crearParticipacionDePrueba({ foroId, autorId: e.otroAlumno.id })
    const calificada = await participar(e, foroId)
    expect(calificada.statusCode).toBe(409)
    expect(codigoDe(calificada)).toBe("PARTICIPACION_CALIFICADA")
    // Cerrado: la réplica tampoco.
    expect(codigoDe(await replicar(e, foroId, principal, e.tokenAlumno))).toBe("FORO_CERRADO")

    await obtenerDb().tarea.update({
      where: { id: foroId },
      data: { aceptaTardias: true },
      select: { id: true },
    })
    expect(codigoDe(await participar(e, foroId))).toBe("PARTICIPACION_CALIFICADA")
    expect((await replicar(e, foroId, principal, e.tokenAlumno)).statusCode).toBe(201)
  })
})

describe("FORO-1A31: las réplicas", () => {
  it("FORO-1A31: el alumno replica en una principal ajena y en la suya sin haber publicado antes la suya (DH-04 a)", async () => {
    const e = await escenario()
    const foroId = await crearForoDePrueba({ claseId: e.claseId, autorId: e.maestro.id })
    const ajena = await crearParticipacionDePrueba({ foroId, autorId: e.otroAlumno.id })
    const enAjena = await replicar(e, foroId, ajena, e.tokenAlumno)
    expect(enAjena.statusCode, enAjena.body).toBe(201)
    expect(enAjena.json()).toMatchObject({ replica: { propia: true, conRetraso: false } })
    const propia = participacionPublicadaRespuestaSchema.parse((await participar(e, foroId)).json())
    expect((await replicar(e, foroId, propia.participacion.id, e.tokenAlumno)).statusCode).toBe(201)
    // Replicar no cambia la entrega.
    expect((await leerEntregaDb(foroId, e.alumno.id))?.version).toBe(1)
  })

  it("FORO-1A31: el maestro replica después de la fecha en un foro sin tardías, sin retraso", async () => {
    const e = await escenario()
    const foroId = await crearForoDePrueba({
      claseId: e.claseId,
      autorId: e.maestro.id,
      fechaLimite: PASADA(),
      aceptaTardias: false,
    })
    const principal = await crearParticipacionDePrueba({ foroId, autorId: e.alumno.id })
    const respuesta = await replicar(e, foroId, principal, e.tokenMaestro)
    expect(respuesta.statusCode, respuesta.body).toBe(201)
    const fila = await obtenerDb().participacionForo.findFirst({
      where: { foroId, principalId: principal },
    })
    expect(fila?.conRetraso).toBe(false)
  })

  it("FORO-1A31: una principal de otro foro, una réplica como principal o una inexistente responden 404 PARTICIPACION_NO_ENCONTRADA", async () => {
    const e = await escenario()
    const foroId = await crearForoDePrueba({ claseId: e.claseId, autorId: e.maestro.id })
    const otroForo = await crearForoDePrueba({ claseId: e.claseId, autorId: e.maestro.id })
    const deOtroForo = await crearParticipacionDePrueba({
      foroId: otroForo,
      autorId: e.otroAlumno.id,
    })
    const principal = await crearParticipacionDePrueba({ foroId, autorId: e.otroAlumno.id })
    const replica = await crearParticipacionDePrueba({
      foroId,
      autorId: e.otroAlumno.id,
      principalId: principal,
    })
    for (const id of [deOtroForo, replica, "00000000-0000-4000-8000-000000000000"]) {
      for (const respuesta of [
        await replicar(e, foroId, id, e.tokenAlumno),
        await pedir({
          method: "GET",
          url: `${urlForo(e.claseId, foroId)}/participaciones/${id}/replicas`,
          token: e.tokenAlumno,
        }),
      ]) {
        expect(respuesta.statusCode, id).toBe(404)
        expect(codigoDe(respuesta)).toBe("PARTICIPACION_NO_ENCONTRADA")
      }
    }
    expect(await obtenerDb().participacionForo.count({ where: { foroId } })).toBe(2)
  })
})

describe("FORO-1A32: las listas de principales y réplicas", () => {
  it("FORO-1A32: principales ascendentes con réplicas y propia; conRetraso para el maestro y el admin en todas y para el alumno solo en la suya", async () => {
    const e = await escenario()
    const foroId = await crearForoDePrueba({ claseId: e.claseId, autorId: e.maestro.id })
    const base = Date.now() - 5 * HORA_MS
    const deOtro = await crearParticipacionDePrueba({
      foroId,
      autorId: e.otroAlumno.id,
      conRetraso: true,
      creadoEn: new Date(base),
    })
    const mia = await crearParticipacionDePrueba({
      foroId,
      autorId: e.alumno.id,
      conRetraso: true,
      creadoEn: new Date(base + HORA_MS),
    })
    await crearParticipacionDePrueba({
      foroId,
      autorId: e.alumno.id,
      principalId: deOtro,
      conRetraso: true,
      creadoEn: new Date(base + 2 * HORA_MS),
    })
    const lista = async (token: string) => {
      const respuesta = await pedir({
        method: "GET",
        url: `${urlForo(e.claseId, foroId)}/participaciones`,
        token,
      })
      expect(respuesta.statusCode, respuesta.body).toBe(200)
      return listaParticipacionesRespuestaSchema.parse(respuesta.json()).participaciones
    }
    const delAlumno = await lista(e.tokenAlumno)
    expect(delAlumno.map((p) => p.id)).toEqual([deOtro, mia])
    expect(delAlumno[0]).toMatchObject({ replicas: 1, propia: false })
    expect(delAlumno[0]).not.toHaveProperty("conRetraso")
    expect(delAlumno[1]).toMatchObject({ replicas: 0, propia: true, conRetraso: true })
    for (const token of [e.tokenMaestro, e.tokenAdmin]) {
      const ve = await lista(token)
      expect(ve.map((p) => p.conRetraso)).toEqual([true, true])
      expect(ve.map((p) => p.propia)).toEqual([false, false])
    }
    const replicas = async (token: string) => {
      const respuesta = await pedir({
        method: "GET",
        url: `${urlForo(e.claseId, foroId)}/participaciones/${deOtro}/replicas`,
        token,
      })
      expect(respuesta.statusCode, respuesta.body).toBe(200)
      return listaReplicasRespuestaSchema.parse(respuesta.json()).replicas
    }
    expect(await replicas(e.tokenAlumno)).toMatchObject([{ propia: true, conRetraso: true }])
    const delOtro = await replicas(e.tokenOtroAlumno)
    expect(delOtro[0]).toMatchObject({ propia: false })
    expect(delOtro[0]).not.toHaveProperty("conRetraso")
    expect(await replicas(e.tokenMaestro)).toMatchObject([{ conRetraso: true }])
  })

  it("FORO-1A32: las páginas siguen con su cursor, y un cursor de otro foro o una réplica en la lista de principales responden 400", async () => {
    const e = await escenario()
    const foroId = await crearForoDePrueba({ claseId: e.claseId, autorId: e.maestro.id })
    const otroForo = await crearForoDePrueba({ claseId: e.claseId, autorId: e.maestro.id })
    const base = Date.now() - 5 * HORA_MS
    const p1 = await crearParticipacionDePrueba({
      foroId,
      autorId: e.alumno.id,
      creadoEn: new Date(base),
    })
    const p2 = await crearParticipacionDePrueba({
      foroId,
      autorId: e.otroAlumno.id,
      creadoEn: new Date(base + HORA_MS),
    })
    const r1 = await crearParticipacionDePrueba({
      foroId,
      autorId: e.alumno.id,
      principalId: p1,
      creadoEn: new Date(base + 2 * HORA_MS),
    })
    const r2 = await crearParticipacionDePrueba({
      foroId,
      autorId: e.otroAlumno.id,
      principalId: p1,
      creadoEn: new Date(base + 3 * HORA_MS),
    })
    const r3 = await crearParticipacionDePrueba({
      foroId,
      autorId: e.otroAlumno.id,
      principalId: p2,
      creadoEn: new Date(base + 4 * HORA_MS),
    })
    const deOtroForo = await crearParticipacionDePrueba({ foroId: otroForo, autorId: e.alumno.id })
    const url = `${urlForo(e.claseId, foroId)}/participaciones`
    const primera = await pedir({ method: "GET", url: `${url}?limite=1`, token: e.tokenMaestro })
    expect(listaParticipacionesRespuestaSchema.parse(primera.json())).toMatchObject({
      participaciones: [{ id: p1 }],
      siguienteCursor: p1,
    })
    const segunda = await pedir({
      method: "GET",
      url: `${url}?limite=1&cursor=${p1}`,
      token: e.tokenMaestro,
    })
    expect(listaParticipacionesRespuestaSchema.parse(segunda.json())).toMatchObject({
      participaciones: [{ id: p2 }],
      siguienteCursor: null,
    })
    for (const cursor of [deOtroForo, r1]) {
      const respuesta = await pedir({
        method: "GET",
        url: `${url}?cursor=${cursor}`,
        token: e.tokenMaestro,
      })
      expect(respuesta.statusCode).toBe(400)
      expect(codigoDe(respuesta)).toBe("VALIDACION")
    }
    const urlReplicas = `${url}/${p1}/replicas`
    const pagina = await pedir({
      method: "GET",
      url: `${urlReplicas}?limite=1`,
      token: e.tokenMaestro,
    })
    expect(listaReplicasRespuestaSchema.parse(pagina.json())).toMatchObject({
      replicas: [{ id: r1 }],
      siguienteCursor: r1,
    })
    const siguiente = await pedir({
      method: "GET",
      url: `${urlReplicas}?limite=1&cursor=${r1}`,
      token: e.tokenMaestro,
    })
    expect(listaReplicasRespuestaSchema.parse(siguiente.json()).replicas.map((r) => r.id)).toEqual([
      r2,
    ])
    for (const cursor of [r3, p1, deOtroForo]) {
      const respuesta = await pedir({
        method: "GET",
        url: `${urlReplicas}?cursor=${cursor}`,
        token: e.tokenMaestro,
      })
      expect(respuesta.statusCode).toBe(400)
      expect(codigoDe(respuesta)).toBe("VALIDACION")
    }
  })
})

describe("FORO-1A33: mi participación", () => {
  it("FORO-1A33: sin fila, asignado sin calificación; puedeParticipar y los avisos de retraso los decide la regla", async () => {
    const e = await escenario()
    const abierto = await crearForoDePrueba({
      claseId: e.claseId,
      autorId: e.maestro.id,
      fechaLimite: FUTURA(),
    })
    expect(await miParticipacion(e, abierto)).toEqual({
      estado: "asignado",
      fechaEntrega: null,
      conRetraso: false,
      calificacion: null,
      principalId: null,
      puedeParticipar: true,
      puedeReplicar: true,
      participarConRetraso: false,
      replicarConRetraso: false,
    })
    const tardio = await crearForoDePrueba({
      claseId: e.claseId,
      autorId: e.maestro.id,
      fechaLimite: PASADA(),
      aceptaTardias: true,
    })
    expect(await miParticipacion(e, tardio)).toMatchObject({
      puedeParticipar: true,
      participarConRetraso: true,
      replicarConRetraso: true,
    })
    const cerrado = await crearForoDePrueba({
      claseId: e.claseId,
      autorId: e.maestro.id,
      fechaLimite: PASADA(),
      aceptaTardias: false,
    })
    expect(await miParticipacion(e, cerrado)).toMatchObject({
      puedeParticipar: false,
      puedeReplicar: false,
    })
    // Sin fila perezosa: leer no la crea.
    expect(await leerEntregaDb(abierto, e.alumno.id)).toBeNull()
  })

  it("FORO-1A33: con principal, su id y la fecha de entrega; calificada, con el desglose por criterio", async () => {
    const e = await escenario()
    const foroId = await crearForoDePrueba({
      claseId: e.claseId,
      autorId: e.maestro.id,
      puntos: 20,
    })
    await crearCriteriosDePrueba(foroId, 2)
    const publicada = participacionPublicadaRespuestaSchema.parse(
      (await participar(e, foroId)).json(),
    )
    const conPrincipal = await miParticipacion(e, foroId)
    expect(conPrincipal).toMatchObject({
      estado: "entregado",
      principalId: publicada.participacion.id,
      puedeParticipar: false,
      calificacion: null,
    })
    expect(conPrincipal.fechaEntrega).not.toBeNull()
    const [c1, c2] = await idsDeCriterios(foroId)
    if (c1 === undefined || c2 === undefined) throw new Error("Precondición: dos criterios")
    const calificar = await pedir({
      method: "PUT",
      url: `${urlForo(e.claseId, foroId)}/participantes/${e.alumno.id}/calificacion`,
      token: e.tokenMaestro,
      payload: {
        version: 1,
        puntosDeLaTarea: 20,
        calificacion: null,
        puntajes: [
          { criterioId: c1, puntos: 10 },
          { criterioId: c2, puntos: 5 },
        ],
      },
    })
    expect(calificar.statusCode, calificar.body).toBe(200)
    const calificada = await miParticipacion(e, foroId)
    expect(calificada.estado).toBe("calificado")
    expect(calificada.calificacion).toMatchObject({
      puntos: 15,
      sobre: 20,
      puntajes: [
        { criterioId: c1, criterio: "Criterio 1", puntosMax: 10, puntos: 10 },
        { criterioId: c2, criterio: "Criterio 2", puntosMax: 10, puntos: 5 },
      ],
    })
  })
})

describe("FORO-1A34 y FORO-1A35: sin trabajos y con textos válidos", () => {
  it("FORO-1A34: participar y replicar no encolan ningún trabajo", async () => {
    const e = await escenario()
    const foroId = await crearForoDePrueba({ claseId: e.claseId, autorId: e.maestro.id })
    const publicada = participacionPublicadaRespuestaSchema.parse(
      (await participar(e, foroId)).json(),
    )
    expect(
      (await replicar(e, foroId, publicada.participacion.id, e.tokenOtroAlumno)).statusCode,
    ).toBe(201)
    expect((await replicar(e, foroId, publicada.participacion.id, e.tokenMaestro)).statusCode).toBe(
      201,
    )
    expect(await trabajosQueMencionan(foroId)).toBe(0)
    expect(await trabajosQueMencionan(publicada.participacion.id)).toBe(0)
  })

  it("FORO-1A35: texto vacío, solo invisibles o demasiado largo responde 400 VALIDACION con «texto: …»; un carácter nulo, 400 y nunca 500", async () => {
    const e = await escenario()
    const foroId = await crearForoDePrueba({ claseId: e.claseId, autorId: e.maestro.id })
    const principal = await crearParticipacionDePrueba({ foroId, autorId: e.otroAlumno.id })
    const casos: { respuesta: () => Promise<LightMyRequestResponse>; nombre: string }[] = [
      { nombre: "principal vacía", respuesta: () => participar(e, foroId, "") },
      { nombre: "principal invisible", respuesta: () => participar(e, foroId, "​​ ") },
      { nombre: "principal larga", respuesta: () => participar(e, foroId, "a".repeat(5001)) },
      {
        nombre: "réplica vacía",
        respuesta: () => replicar(e, foroId, principal, e.tokenAlumno, ""),
      },
      {
        nombre: "réplica larga",
        respuesta: () => replicar(e, foroId, principal, e.tokenAlumno, "a".repeat(1001)),
      },
    ]
    for (const { nombre, respuesta } of casos) {
      const r = await respuesta()
      expect(r.statusCode, nombre).toBe(400)
      expect(codigoDe(r)).toBe("VALIDACION")
      expect(mensajeDe(r), nombre).toMatch(/^texto: /)
    }
    for (const r of [
      await participar(e, foroId, "Hola\u0000mundo"),
      await replicar(e, foroId, principal, e.tokenAlumno, "Hola\u0000mundo"),
    ]) {
      expect(r.statusCode, r.body).toBe(400)
    }
    expect(await obtenerDb().participacionForo.count({ where: { foroId } })).toBe(1)
    // Los límites exactos sí pasan.
    expect((await participar(e, foroId, "a".repeat(5000))).statusCode).toBe(201)
    expect((await replicar(e, foroId, principal, e.tokenAlumno, "a".repeat(1000))).statusCode).toBe(
      201,
    )
  })
})
