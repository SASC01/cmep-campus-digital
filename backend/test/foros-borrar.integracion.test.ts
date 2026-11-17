import {
  entregaDeAlumnoRespuestaSchema,
  exportacionDeCalificacionesRespuestaSchema,
  gradebookRespuestaSchema,
  listaForosRespuestaSchema,
  listaParticipacionesRespuestaSchema,
  listaReplicasRespuestaSchema,
  misCalificacionesRespuestaSchema,
} from "@campus/shared"
import type { FastifyInstance, LightMyRequestResponse } from "fastify"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { obtenerDb } from "../src/adapters/db/cliente.js"
import { construirApp } from "../src/app.js"
import { cargarEnv } from "../src/config/env.js"
import { crearAlmacenEnMemoria } from "./almacen-en-memoria.js"
import { borrarUsuariosDePrueba, crearUsuarioDePrueba, firmarTokenDePrueba } from "./ayudas-auth.js"
import { idsDeCriterios } from "./ayudas-calificaciones.js"
import { borrarMovimientosYClasesDePrueba, inscribirDePrueba } from "./ayudas-clases.js"
import { formadasDetrasDe } from "./ayudas-concurrencia.js"
import {
  conFilaDeEntregasRetenida,
  leerEntregaDb,
  TIMEOUT_DE_LA_RETENCION_MS,
  type Resultado,
} from "./ayudas-entregas.js"
import {
  codigoDe,
  crearEscenarioDeForo,
  crearForoDePrueba,
  crearParticipacionDePrueba,
  HORA_MS,
  pedirForo,
  urlForo,
  urlForos,
  type EscenarioDeForo,
} from "./ayudas-foros.js"
import { crearCriteriosDePrueba, crearTareaDePrueba } from "./ayudas-tareas.js"

// FORO-01b (§D-11; DH-05, PB-1 a, PB-2 a, E5-1 y E5-4). FORO-1A62 a FORO-1A70: el admin borra una
// participación principal o una réplica (ruta 17), con su autorización, la cascada, la calificación
// que se conserva, la entrega que vuelve a sin participar, la concurrencia y las listas con
// puedeBorrar.

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

const urlParticipacion = (e: EscenarioDeForo, foroId: string, participacionId: string): string =>
  `${urlForo(e.claseId, foroId)}/participaciones/${participacionId}`

const borrar = (
  e: EscenarioDeForo,
  foroId: string,
  participacionId: string,
  token = e.tokenAdmin,
): Promise<LightMyRequestResponse> =>
  pedir({ method: "DELETE", url: urlParticipacion(e, foroId, participacionId), token })

const participar = (e: EscenarioDeForo, foroId: string, token = e.tokenAlumno) =>
  pedir({
    method: "POST",
    url: `${urlForo(e.claseId, foroId)}/participaciones`,
    token,
    payload: { texto: "Mi participación" },
  })

const replicar = (e: EscenarioDeForo, foroId: string, principalId: string, token: string) =>
  pedir({
    method: "POST",
    url: `${urlParticipacion(e, foroId, principalId)}/replicas`,
    token,
    payload: { texto: "Mi réplica" },
  })

const calificar = (
  e: EscenarioDeForo,
  foroId: string,
  cuerpo: Record<string, unknown>,
  alumnoId = e.alumno.id,
) =>
  pedir({
    method: "PUT",
    url: `${urlForo(e.claseId, foroId)}/participantes/${alumnoId}/calificacion`,
    token: e.tokenMaestro,
    payload: { puntajes: [], calificacion: null, ...cuerpo },
  })

// La principal del alumno, publicada por la API (crea la entrega `entregado` con versión 1).
const principalDelAlumno = async (e: EscenarioDeForo, foroId: string): Promise<string> => {
  const respuesta = await participar(e, foroId)
  expect(respuesta.statusCode, respuesta.body).toBe(201)
  return respuesta.json<{ participacion: { id: string } }>().participacion.id
}

const principales = async (e: EscenarioDeForo, foroId: string, token = e.tokenMaestro) => {
  const respuesta = await pedir({
    method: "GET",
    url: `${urlForo(e.claseId, foroId)}/participaciones`,
    token,
  })
  expect(respuesta.statusCode, respuesta.body).toBe(200)
  return listaParticipacionesRespuestaSchema.parse(respuesta.json()).participaciones
}

const replicasDe = async (
  e: EscenarioDeForo,
  foroId: string,
  principalId: string,
  token = e.tokenMaestro,
) => {
  const respuesta = await pedir({
    method: "GET",
    url: `${urlParticipacion(e, foroId, principalId)}/replicas`,
    token,
  })
  expect(respuesta.statusCode, respuesta.body).toBe(200)
  return listaReplicasRespuestaSchema.parse(respuesta.json()).replicas
}

const contar = (foroId: string): Promise<number> =>
  obtenerDb().participacionForo.count({ where: { foroId } })

const trabajosQueMencionan = async (valor: string): Promise<number> => {
  const [fila] = await obtenerDb().$queryRaw<{ n: number }[]>`
    SELECT count(*)::int AS n FROM pgboss.job WHERE data::text LIKE ${`%${valor}%`}`
  return fila?.n ?? 0
}

const respuestaDe = (resultado: Resultado<LightMyRequestResponse> | undefined) => {
  if (resultado === undefined || !resultado.ok) {
    throw new Error("Precondición: la operación respondió sin lanzar")
  }
  return resultado.valor
}

const idDeLaEntrega = async (foroId: string, alumnoId: string): Promise<string> => {
  const entrega = await leerEntregaDb(foroId, alumnoId)
  if (entrega === null) throw new Error("Precondición: la entrega existe")
  return entrega.id
}

const esperar = (ms: number): Promise<void> => new Promise((resolver) => setTimeout(resolver, ms))

// La principal retenida FOR UPDATE, como conFilaRetenida (ayudas-concurrencia.ts) y
// conFilaDeEntregasRetenida: el INSERT de una réplica (su llave foránea toma la principal) y el
// DELETE del borrado quedan formados detrás, en el orden en que se lanzan.
const conPrincipalRetenida = async (
  principalId: string,
  operaciones: readonly (() => Promise<LightMyRequestResponse>)[],
): Promise<LightMyRequestResponse[]> => {
  const lanzadas: Promise<LightMyRequestResponse>[] = []
  await obtenerDb().$transaction(
    async (tx) => {
      await tx.$queryRaw`SELECT id FROM participaciones_foro WHERE id = ${principalId}::uuid FOR UPDATE`
      const [propio] = await tx.$queryRaw<{ pid: number }[]>`SELECT pg_backend_pid() AS pid`
      if (!propio) throw new Error("Precondición: no se obtuvo el pid de la transacción retenedora")
      for (const [indice, operacion] of operaciones.entries()) {
        let terminada = false
        const lanzada = operacion()
        lanzada.then(
          () => (terminada = true),
          () => (terminada = true),
        )
        lanzadas.push(lanzada)
        const limite = Date.now() + 10_000
        let formada = false
        while (!formada && !terminada && Date.now() < limite) {
          formada = (await formadasDetrasDe(propio.pid)) >= indice + 1
          if (!formada) await esperar(25)
        }
        expect(terminada, `Precondición: la operación ${String(indice + 1)} no esperó`).toBe(false)
        expect(formada, `Precondición: la operación ${String(indice + 1)} no se formó`).toBe(true)
      }
      await esperar(100)
    },
    { timeout: TIMEOUT_DE_LA_RETENCION_MS, maxWait: 5_000 },
  )
  return Promise.all(lanzadas)
}

describe("FORO-1A62: la autorización de la ruta 17", () => {
  it("FORO-1A62: el maestro, el alumno autor y otro alumno reciben 403 del rol; un restringido, 403 ACCESO_RESTRINGIDO; el admin con una clase inexistente, 403 SIN_ACCESO_A_LA_CLASE; nada se borra", async () => {
    const e = await escenario()
    const foroId = await crearForoDePrueba({ claseId: e.claseId, autorId: e.maestro.id })
    const principal = await crearParticipacionDePrueba({ foroId, autorId: e.alumno.id })
    for (const token of [e.tokenMaestro, e.tokenAlumno, e.tokenOtroAlumno]) {
      const respuesta = await borrar(e, foroId, principal, token)
      expect(respuesta.statusCode).toBe(403)
      expect(codigoDe(respuesta)).toBe("ROL_NO_PERMITIDO")
    }
    const restringido = await crearUsuarioDePrueba(idsUsuarios, {
      nombre: "Alumna Restringida",
      accesoRestringido: true,
      motivoRestriccion: "Pago pendiente",
    })
    await inscribirDePrueba(e.claseId, restringido.id)
    const conRestriccion = await borrar(
      e,
      foroId,
      principal,
      await firmarTokenDePrueba({ usuarioId: restringido.id }),
    )
    expect(conRestriccion.statusCode).toBe(403)
    expect(codigoDe(conRestriccion)).toBe("ACCESO_RESTRINGIDO")
    const inexistente = await pedir({
      method: "DELETE",
      url: `/api/clases/00000000-0000-4000-8000-000000000000/foros/${foroId}/participaciones/${principal}`,
      token: e.tokenAdmin,
    })
    expect(inexistente.statusCode).toBe(403)
    expect(codigoDe(inexistente)).toBe("SIN_ACCESO_A_LA_CLASE")
    expect(await contar(foroId)).toBe(1)
  })

  it("FORO-1A62: el admin con un foro de otra clase, el id de una tarea o una participación de otro foro recibe 404 sin borrar nada", async () => {
    const e = await escenario()
    const otra = await escenario()
    const foroId = await crearForoDePrueba({ claseId: e.claseId, autorId: e.maestro.id })
    const otroForo = await crearForoDePrueba({ claseId: e.claseId, autorId: e.maestro.id })
    const ajeno = await crearForoDePrueba({ claseId: otra.claseId, autorId: otra.maestro.id })
    const tarea = await crearTareaDePrueba({ claseId: e.claseId, autorId: e.maestro.id })
    const principal = await crearParticipacionDePrueba({ foroId, autorId: e.alumno.id })
    const deOtroForo = await crearParticipacionDePrueba({ foroId: otroForo, autorId: e.alumno.id })
    const delAjeno = await crearParticipacionDePrueba({
      foroId: ajeno,
      autorId: otra.alumno.id,
    })
    for (const [foro, participacion, codigo] of [
      [ajeno, delAjeno, "TAREA_NO_ENCONTRADA"],
      [tarea, principal, "TAREA_NO_ENCONTRADA"],
      [foroId, deOtroForo, "PARTICIPACION_NO_ENCONTRADA"],
      [foroId, "00000000-0000-4000-8000-000000000000", "PARTICIPACION_NO_ENCONTRADA"],
    ] as const) {
      const respuesta = await borrar(e, foro, participacion)
      expect(respuesta.statusCode, `${foro} ${participacion}`).toBe(404)
      expect(codigoDe(respuesta)).toBe(codigo)
    }
    expect(await contar(foroId)).toBe(1)
    expect(await contar(otroForo)).toBe(1)
    expect(await contar(ajeno)).toBe(1)
  })
})

describe("FORO-1A63 y FORO-1A64: réplicas y cascada", () => {
  it("FORO-1A63: el admin borra una réplica de un alumno y una de un maestro; la principal y las demás réplicas siguen y el conteo de réplicas baja", async () => {
    const e = await escenario()
    const foroId = await crearForoDePrueba({ claseId: e.claseId, autorId: e.maestro.id })
    const principal = await crearParticipacionDePrueba({ foroId, autorId: e.alumno.id })
    const delAlumno = await crearParticipacionDePrueba({
      foroId,
      autorId: e.otroAlumno.id,
      principalId: principal,
    })
    const delMaestro = await crearParticipacionDePrueba({
      foroId,
      autorId: e.maestro.id,
      principalId: principal,
    })
    const queda = await crearParticipacionDePrueba({
      foroId,
      autorId: e.alumno.id,
      principalId: principal,
    })
    expect((await principales(e, foroId))[0]?.replicas).toBe(3)
    expect((await borrar(e, foroId, delAlumno)).statusCode).toBe(204)
    expect((await borrar(e, foroId, delMaestro)).statusCode).toBe(204)
    expect((await principales(e, foroId)).map((p) => [p.id, p.replicas])).toEqual([[principal, 1]])
    expect((await replicasDe(e, foroId, principal)).map((r) => r.id)).toEqual([queda])
  })

  it("FORO-1A64: borrar una principal con réplicas de tres personas se lleva todas sus réplicas; bajan la lista de principales y el conteo de la lista de foros", async () => {
    const e = await escenario()
    const foroId = await crearForoDePrueba({ claseId: e.claseId, autorId: e.maestro.id })
    const principal = await crearParticipacionDePrueba({ foroId, autorId: e.otroAlumno.id })
    const otra = await crearParticipacionDePrueba({ foroId, autorId: e.alumno.id })
    for (const autorId of [e.alumno.id, e.maestro.id, e.otroAlumno.id]) {
      await crearParticipacionDePrueba({ foroId, autorId, principalId: principal })
    }
    await obtenerDb().entrega.create({
      data: {
        tareaId: foroId,
        alumnoId: e.otroAlumno.id,
        estado: "entregado",
        fechaEntrega: new Date(),
        version: 1,
      },
      select: { id: true },
    })
    const conteo = async () =>
      listaForosRespuestaSchema
        .parse(
          (await pedir({ method: "GET", url: urlForos(e.claseId), token: e.tokenAlumno })).json(),
        )
        .foros.find((foro) => foro.id === foroId)?.participaciones
    expect(await conteo()).toBe(2)
    expect((await borrar(e, foroId, principal)).statusCode).toBe(204)
    expect(await obtenerDb().participacionForo.count({ where: { principalId: principal } })).toBe(0)
    expect((await principales(e, foroId)).map((p) => p.id)).toEqual([otra])
    expect(await conteo()).toBe(1)
    expect(await contar(foroId)).toBe(1)
  })
})

describe("FORO-1A65 y FORO-1A66: la entrega del alumno al borrar su principal", () => {
  it("FORO-1A65: con la principal calificada (rúbrica y devolución), borrarla deja intactos la entrega, los puntajes, la devolución y las calificaciones de la clase; no puede volver a publicar y sí replicar", async () => {
    const e = await escenario()
    const foroId = await crearForoDePrueba({
      claseId: e.claseId,
      autorId: e.maestro.id,
      puntos: 20,
      fechaLimite: FUTURA(),
    })
    await crearCriteriosDePrueba(foroId, 2)
    const principal = await principalDelAlumno(e, foroId)
    const [c1, c2] = await idsDeCriterios(foroId)
    if (c1 === undefined || c2 === undefined) throw new Error("Precondición: dos criterios")
    const calificada = await calificar(e, foroId, {
      version: 1,
      puntosDeLaTarea: 20,
      comentario: "Buen trabajo",
      puntajes: [
        { criterioId: c1, puntos: 8 },
        { criterioId: c2, puntos: 6 },
      ],
    })
    expect(calificada.statusCode, calificada.body).toBe(200)
    const otra = await crearParticipacionDePrueba({ foroId, autorId: e.otroAlumno.id })

    const foto = async () => {
      const entrega = await leerEntregaDb(foroId, e.alumno.id)
      if (entrega === null) throw new Error("Precondición: la entrega existe")
      const gradebook = gradebookRespuestaSchema.parse(
        (
          await pedir({
            method: "GET",
            url: `/api/clases/${e.claseId}/gradebook`,
            token: e.tokenMaestro,
          })
        ).json(),
      )
      return {
        entrega: {
          estado: entrega.estado,
          calificacion: entrega.calificacion?.toString(),
          fechaCalificacion: entrega.fechaCalificacion,
          fechaEntrega: entrega.fechaEntrega,
          version: entrega.version,
        },
        puntajes: await obtenerDb().puntajeRubrica.findMany({
          where: { entregaId: entrega.id },
          select: { criterioId: true, puntos: true },
          orderBy: { criterioId: "asc" },
        }),
        devoluciones: await obtenerDb().comentario.findMany({
          where: { entregaId: entrega.id },
          select: { id: true, texto: true },
        }),
        gradebook: gradebook.alumnos.find((a) => a.alumno.id === e.alumno.id),
        mis: misCalificacionesRespuestaSchema.parse(
          (
            await pedir({
              method: "GET",
              url: `/api/clases/${e.claseId}/mis-calificaciones`,
              token: e.tokenAlumno,
            })
          ).json(),
        ),
        exportacion: exportacionDeCalificacionesRespuestaSchema
          .parse(
            (
              await pedir({
                method: "GET",
                url: `/api/clases/${e.claseId}/calificaciones/exportacion`,
                token: e.tokenMaestro,
              })
            ).json(),
          )
          .alumnos.find((a) => a.alumno.id === e.alumno.id),
      }
    }
    const antes = await foto()
    expect(antes.entrega.estado).toBe("calificado")
    expect(antes.devoluciones).toHaveLength(1)
    expect((await borrar(e, foroId, principal)).statusCode).toBe(204)
    expect(await foto()).toEqual(antes)

    const otraVez = await participar(e, foroId)
    expect(otraVez.statusCode).toBe(409)
    expect(codigoDe(otraVez)).toBe("PARTICIPACION_YA_PUBLICADA")
    expect((await replicar(e, foroId, otra, e.tokenAlumno)).statusCode).toBe(201)
  })

  it("FORO-1A66: sin calificación, la entrega vuelve a asignado con la versión siguiente; calificar con la versión anterior da 409 ENTREGA_MODIFICADA; con el foro abierto, vuelve a publicar", async () => {
    const e = await escenario()
    const foroId = await crearForoDePrueba({
      claseId: e.claseId,
      autorId: e.maestro.id,
      fechaLimite: FUTURA(),
    })
    const principal = await principalDelAlumno(e, foroId)
    expect((await borrar(e, foroId, principal)).statusCode).toBe(204)
    expect(await leerEntregaDb(foroId, e.alumno.id)).toMatchObject({
      estado: "asignado",
      fechaEntrega: null,
      conRetraso: false,
      version: 2,
    })
    const tarde = await calificar(e, foroId, { version: 1, puntosDeLaTarea: 10, calificacion: 5 })
    expect(tarde.statusCode).toBe(409)
    expect(codigoDe(tarde)).toBe("ENTREGA_MODIFICADA")
    const nueva = await principalDelAlumno(e, foroId)
    expect(nueva).not.toBe(principal)
    expect(await leerEntregaDb(foroId, e.alumno.id)).toMatchObject({
      estado: "entregado",
      version: 3,
    })
  })

  it("FORO-1A66: con el foro cerrado, no vuelve a publicar (409 FORO_CERRADO), cuenta como vencida sin entregar y el maestro la puede calificar", async () => {
    const e = await escenario()
    const foroId = await crearForoDePrueba({
      claseId: e.claseId,
      autorId: e.maestro.id,
      fechaLimite: FUTURA(),
      aceptaTardias: false,
    })
    const principal = await principalDelAlumno(e, foroId)
    await obtenerDb().tarea.update({
      where: { id: foroId },
      data: { fechaLimite: PASADA() },
      select: { id: true },
    })
    expect((await borrar(e, foroId, principal)).statusCode).toBe(204)
    const cerrado = await participar(e, foroId)
    expect(cerrado.statusCode).toBe(409)
    expect(codigoDe(cerrado)).toBe("FORO_CERRADO")
    const gradebook = gradebookRespuestaSchema.parse(
      (
        await pedir({
          method: "GET",
          url: `/api/clases/${e.claseId}/gradebook`,
          token: e.tokenMaestro,
        })
      ).json(),
    )
    expect(gradebook.alumnos.find((a) => a.alumno.id === e.alumno.id)?.vencidasSinEntregar).toBe(1)
    const ok = await calificar(e, foroId, { version: 2, puntosDeLaTarea: 10, calificacion: 4 })
    expect(ok.statusCode, ok.body).toBe(200)
    expect(entregaDeAlumnoRespuestaSchema.parse(ok.json()).entrega).toMatchObject({
      estado: "calificado",
      fechaEntrega: null,
    })
  })
})

describe("FORO-1A67 y FORO-1A68: concurrencia", () => {
  it("FORO-1A67: una réplica formada antes que el borrado de su principal se inserta y el borrado se la lleva", async () => {
    const e = await escenario()
    const foroId = await crearForoDePrueba({ claseId: e.claseId, autorId: e.maestro.id })
    const principal = await principalDelAlumno(e, foroId)
    const [replica, borrado] = await conPrincipalRetenida(principal, [
      () => replicar(e, foroId, principal, e.tokenOtroAlumno),
      () => borrar(e, foroId, principal),
    ])
    expect(replica?.statusCode, replica?.body).toBe(201)
    expect(borrado?.statusCode, borrado?.body).toBe(204)
    expect(await contar(foroId)).toBe(0)
  }, 60_000)

  it("FORO-1A67: con el borrado formado antes, la réplica responde 404 PARTICIPACION_NO_ENCONTRADA, nunca 500 ni P2003", async () => {
    const e = await escenario()
    const foroId = await crearForoDePrueba({ claseId: e.claseId, autorId: e.maestro.id })
    const principal = await principalDelAlumno(e, foroId)
    const [borrado, replica] = await conPrincipalRetenida(principal, [
      () => borrar(e, foroId, principal),
      () => replicar(e, foroId, principal, e.tokenOtroAlumno),
    ])
    expect(borrado?.statusCode, borrado?.body).toBe(204)
    expect(replica?.statusCode, replica?.body).toBe(404)
    expect(codigoDe(replica as LightMyRequestResponse)).toBe("PARTICIPACION_NO_ENCONTRADA")
    expect(await contar(foroId)).toBe(0)
  }, 60_000)

  it("FORO-1A67: dos borrados de una principal sin calificar, formados detrás de la entrega: un 204 y un 404, y la versión sube una sola vez", async () => {
    const e = await escenario()
    const foroId = await crearForoDePrueba({ claseId: e.claseId, autorId: e.maestro.id })
    const principal = await principalDelAlumno(e, foroId)
    const resultados = await conFilaDeEntregasRetenida(
      { tabla: "entregas", id: await idDeLaEntrega(foroId, e.alumno.id) },
      [() => borrar(e, foroId, principal), () => borrar(e, foroId, principal)],
    )
    expect(resultados.map((r) => respuestaDe(r).statusCode)).toEqual([204, 404])
    expect(codigoDe(respuestaDe(resultados[1]))).toBe("PARTICIPACION_NO_ENCONTRADA")
    expect(await leerEntregaDb(foroId, e.alumno.id)).toMatchObject({
      estado: "asignado",
      version: 2,
    })
  }, 60_000)

  it("FORO-1A67: dos borrados de una principal calificada, formados detrás de la entrega: un 204 y un 404, y la calificación queda intacta", async () => {
    const e = await escenario()
    const foroId = await crearForoDePrueba({ claseId: e.claseId, autorId: e.maestro.id })
    const principal = await principalDelAlumno(e, foroId)
    expect(
      (await calificar(e, foroId, { version: 1, puntosDeLaTarea: 10, calificacion: 9 })).statusCode,
    ).toBe(200)
    const resultados = await conFilaDeEntregasRetenida(
      { tabla: "entregas", id: await idDeLaEntrega(foroId, e.alumno.id) },
      [() => borrar(e, foroId, principal), () => borrar(e, foroId, principal)],
    )
    expect(resultados.map((r) => respuestaDe(r).statusCode)).toEqual([204, 404])
    const entrega = await leerEntregaDb(foroId, e.alumno.id)
    expect(entrega).toMatchObject({ estado: "calificado", version: 2 })
    expect(entrega?.calificacion?.toNumber()).toBe(9)
    expect(entrega?.fechaEntrega).not.toBeNull()
  }, 60_000)

  it("FORO-1A67: dos borrados de una réplica, formados detrás de la fila del foro: un 204 y un 404", async () => {
    const e = await escenario()
    const foroId = await crearForoDePrueba({ claseId: e.claseId, autorId: e.maestro.id })
    const principal = await crearParticipacionDePrueba({ foroId, autorId: e.alumno.id })
    const replica = await crearParticipacionDePrueba({
      foroId,
      autorId: e.otroAlumno.id,
      principalId: principal,
    })
    const resultados = await conFilaDeEntregasRetenida({ tabla: "tareas", id: foroId }, [
      () => borrar(e, foroId, replica),
      () => borrar(e, foroId, replica),
    ])
    expect(resultados.map((r) => respuestaDe(r).statusCode).sort()).toEqual([204, 404])
    expect(await contar(foroId)).toBe(1)
  }, 60_000)

  it("FORO-1A67: una principal y una de sus réplicas borradas a la vez: la principal da 204, la réplica 204 o 404, nunca 500, y no queda ninguna", async () => {
    const e = await escenario()
    const foroId = await crearForoDePrueba({ claseId: e.claseId, autorId: e.maestro.id })
    const principal = await principalDelAlumno(e, foroId)
    const replica = await crearParticipacionDePrueba({
      foroId,
      autorId: e.otroAlumno.id,
      principalId: principal,
    })
    const [dePrincipal, deReplica] = await conFilaDeEntregasRetenida(
      { tabla: "tareas", id: foroId },
      [() => borrar(e, foroId, principal), () => borrar(e, foroId, replica)],
    )
    expect(respuestaDe(dePrincipal).statusCode).toBe(204)
    expect([204, 404]).toContain(respuestaDe(deReplica).statusCode)
    expect(await contar(foroId)).toBe(0)
    expect((await leerEntregaDb(foroId, e.alumno.id))?.estado).toBe("asignado")
  }, 60_000)

  it("FORO-1A67: un borrado del id viejo formado detrás de la entrega mientras el primero confirma y el alumno publica su principal nueva responde 404; la principal nueva y su entrega quedan intactas", async () => {
    const e = await escenario()
    const foroId = await crearForoDePrueba({
      claseId: e.claseId,
      autorId: e.maestro.id,
      fechaLimite: FUTURA(),
    })
    const vieja = await principalDelAlumno(e, foroId)
    const resultados = await conFilaDeEntregasRetenida(
      { tabla: "entregas", id: await idDeLaEntrega(foroId, e.alumno.id) },
      [() => borrar(e, foroId, vieja), () => borrar(e, foroId, vieja), () => participar(e, foroId)],
    )
    expect(resultados.map((r) => respuestaDe(r).statusCode)).toEqual([204, 404, 201])
    const nueva = await obtenerDb().participacionForo.findFirst({
      where: { foroId, autorId: e.alumno.id, principalId: null },
    })
    expect(nueva?.id).toBeDefined()
    expect(nueva?.id).not.toBe(vieja)
    expect(await leerEntregaDb(foroId, e.alumno.id)).toMatchObject({
      estado: "entregado",
      version: 3,
    })
  }, 60_000)

  it("FORO-1A68: calificar formado antes que el borrado: el borrado ve calificado y conserva", async () => {
    const e = await escenario()
    const foroId = await crearForoDePrueba({ claseId: e.claseId, autorId: e.maestro.id })
    const principal = await principalDelAlumno(e, foroId)
    const resultados = await conFilaDeEntregasRetenida(
      { tabla: "entregas", id: await idDeLaEntrega(foroId, e.alumno.id) },
      [
        () => calificar(e, foroId, { version: 1, puntosDeLaTarea: 10, calificacion: 7 }),
        () => borrar(e, foroId, principal),
      ],
    )
    expect(resultados.map((r) => respuestaDe(r).statusCode)).toEqual([200, 204])
    const entrega = await leerEntregaDb(foroId, e.alumno.id)
    expect(entrega).toMatchObject({ estado: "calificado", version: 2 })
    expect(entrega?.fechaEntrega).not.toBeNull()
    expect(await contar(foroId)).toBe(0)
  }, 60_000)

  it("FORO-1A68: el borrado formado antes que calificar: la versión sube y calificar con la anterior recibe 409 ENTREGA_MODIFICADA", async () => {
    const e = await escenario()
    const foroId = await crearForoDePrueba({ claseId: e.claseId, autorId: e.maestro.id })
    const principal = await principalDelAlumno(e, foroId)
    const resultados = await conFilaDeEntregasRetenida(
      { tabla: "entregas", id: await idDeLaEntrega(foroId, e.alumno.id) },
      [
        () => borrar(e, foroId, principal),
        () => calificar(e, foroId, { version: 1, puntosDeLaTarea: 10, calificacion: 7 }),
      ],
    )
    expect(resultados.map((r) => respuestaDe(r).statusCode)).toEqual([204, 409])
    expect(codigoDe(respuestaDe(resultados[1]))).toBe("ENTREGA_MODIFICADA")
    expect(await leerEntregaDb(foroId, e.alumno.id)).toMatchObject({
      estado: "asignado",
      version: 2,
    })
  }, 60_000)
})

describe("FORO-1A69 y FORO-1A70: sin trabajos y puedeBorrar en las listas", () => {
  it("FORO-1A69: borrar una principal y una réplica no encola ningún trabajo", async () => {
    const e = await escenario()
    const foroId = await crearForoDePrueba({ claseId: e.claseId, autorId: e.maestro.id })
    const principal = await principalDelAlumno(e, foroId)
    const replica = await crearParticipacionDePrueba({
      foroId,
      autorId: e.otroAlumno.id,
      principalId: principal,
    })
    const antes = await trabajosQueMencionan(foroId)
    expect((await borrar(e, foroId, replica)).statusCode).toBe(204)
    expect((await borrar(e, foroId, principal)).statusCode).toBe(204)
    expect(await trabajosQueMencionan(foroId)).toBe(antes)
    expect(await trabajosQueMencionan(principal)).toBe(0)
  })

  it("FORO-1A70: las listas de principales y de réplicas devuelven puedeBorrar en true solo para el admin", async () => {
    const e = await escenario()
    const foroId = await crearForoDePrueba({ claseId: e.claseId, autorId: e.maestro.id })
    const principal = await crearParticipacionDePrueba({ foroId, autorId: e.alumno.id })
    await crearParticipacionDePrueba({ foroId, autorId: e.alumno.id, principalId: principal })
    for (const [token, esperado] of [
      [e.tokenAdmin, true],
      [e.tokenMaestro, false],
      [e.tokenAlumno, false],
      [e.tokenOtroAlumno, false],
    ] as const) {
      expect((await principales(e, foroId, token)).map((p) => p.puedeBorrar)).toEqual([esperado])
      expect((await replicasDe(e, foroId, principal, token)).map((r) => r.puedeBorrar)).toEqual([
        esperado,
      ])
    }
  })
})
