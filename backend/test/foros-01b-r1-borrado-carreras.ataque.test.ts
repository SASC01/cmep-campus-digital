import { conteoDeBorradoRespuestaSchema, gradebookRespuestaSchema } from "@campus/shared"
import type { FastifyInstance, LightMyRequestResponse } from "fastify"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { obtenerDb } from "../src/adapters/db/cliente.js"
import { construirApp } from "../src/app.js"
import { cargarEnv } from "../src/config/env.js"
import { crearAlmacenEnMemoria } from "./almacen-en-memoria.js"
import { borrarUsuariosDePrueba, crearUsuarioDePrueba, firmarTokenDePrueba } from "./ayudas-auth.js"
import { terminarCopiasDePrueba } from "./ayudas-borrado-duplicado.js"
import { borrarMovimientosYClasesDePrueba } from "./ayudas-clases.js"
import { formadasDetrasDe } from "./ayudas-concurrencia.js"
import { leerEntregaDb } from "./ayudas-entregas.js"
import {
  codigoDe,
  crearEscenarioDeForo,
  crearForoDePrueba,
  cuerpoDeForo,
  pedirForo,
  urlForo,
  urlForos,
  type EscenarioDeForo,
} from "./ayudas-foros.js"

// Ataque FORO-01b, ronda 1 (tester). Punto 1 (concurrencia de la ruta 17 más allá de FORO-1A67 y
// FORO-1A68): borrar una participación contra el borrado del foro (con la fila del foro retenida y a la
// vez), contra volver a publicar, contra dos réplicas en vuelo, tres borrados a la vez y contra
// archivar la clase. Punto 7 (ADMIN-01 con datos más ricos): el conteo y el borrado definitivo con una
// principal ya borrada y réplicas de un maestro dado de baja; un alumno calificado dado de baja y
// reactivado. Ningún LOCK TABLE; la retenedora lleva timeout explícito.

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
  await terminarCopiasDePrueba(idsClases)
  await borrarMovimientosYClasesDePrueba(idsClases)
  await borrarUsuariosDePrueba(idsUsuarios)
  await app?.close()
})

const esperar = (ms: number): Promise<void> => new Promise((resolver) => setTimeout(resolver, ms))

const escenario = (): Promise<EscenarioDeForo> => crearEscenarioDeForo(idsUsuarios, idsClases)

const publicar = (e: EscenarioDeForo, foroId: string, token: string) =>
  pedir({
    method: "POST",
    url: `${urlForo(e.claseId, foroId)}/participaciones`,
    token,
    payload: { texto: "Principal" },
  })

const publicarId = async (e: EscenarioDeForo, foroId: string, token: string): Promise<string> => {
  const respuesta = await publicar(e, foroId, token)
  expect(respuesta.statusCode, respuesta.body).toBe(201)
  return (respuesta.json() as { participacion: { id: string } }).participacion.id
}

const replicar = (e: EscenarioDeForo, foroId: string, principalId: string, token: string) =>
  pedir({
    method: "POST",
    url: `${urlForo(e.claseId, foroId)}/participaciones/${principalId}/replicas`,
    token,
    payload: { texto: "Réplica" },
  })

const borrar = (e: EscenarioDeForo, foroId: string, participacionId: string) =>
  pedir({
    method: "DELETE",
    url: `${urlForo(e.claseId, foroId)}/participaciones/${participacionId}`,
    token: e.tokenAdmin,
  })

const sinCincos = (respuestas: readonly LightMyRequestResponse[]): void => {
  for (const respuesta of respuestas) {
    expect(respuesta.statusCode, respuesta.body).toBeLessThan(500)
    expect(respuesta.body).not.toMatch(/P2002|P2003|P2028/)
  }
}

// Retiene la fila de tareas del foro FOR UPDATE (como borrarTarea), lanza la operación, espera a que
// espere esa fila y, dentro de la retenedora, hace lo que haría la rival antes de soltarla.
const conFilaDelForoRetenida = async (
  foroId: string,
  operacion: () => Promise<LightMyRequestResponse>,
  rival: (
    sql: (texto: TemplateStringsArray, ...valores: unknown[]) => Promise<number>,
  ) => Promise<void>,
): Promise<LightMyRequestResponse> => {
  let lanzada: Promise<LightMyRequestResponse> | undefined
  await obtenerDb().$transaction(
    async (tx) => {
      await tx.$queryRaw`SELECT id FROM tareas WHERE id = ${foroId}::uuid FOR UPDATE`
      const [propio] = await tx.$queryRaw<{ pid: number }[]>`SELECT pg_backend_pid() AS pid`
      if (!propio) throw new Error("Precondición: no se obtuvo el pid de la retenedora")
      let terminada = false
      lanzada = operacion()
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
      expect(terminada, "Precondición: la operación terminó sin esperar la fila del foro").toBe(
        false,
      )
      expect(formada, "Precondición: la operación no llegó a la fila del foro en 10 s").toBe(true)
      await rival((texto, ...valores) => tx.$executeRaw(texto, ...valores))
    },
    { timeout: 30_000, maxWait: 5_000 },
  )
  if (lanzada === undefined) throw new Error("Precondición: la operación se lanzó")
  return lanzada
}

const filasDelForo = async (foroId: string) => ({
  participaciones: await obtenerDb().participacionForo.count({ where: { foroId } }),
  entregas: await obtenerDb().entrega.count({ where: { tareaId: foroId } }),
  publicacion: await obtenerDb().publicacion.count({ where: { id: foroId } }),
})

describe("ataque FORO-01b r1 · punto 1: la ruta 17 en carrera", () => {
  it("ATQ-FORO-60: con el borrado del foro reteniendo su fila, el borrado de una principal formado detrás responde 404 «Ese foro ya no existe.» al confirmar el del foro, nunca 500 ni P2003, y no queda ninguna fila", async () => {
    const e = await escenario()
    const foroId = await crearForoDePrueba({ claseId: e.claseId, autorId: e.maestro.id })
    const principalId = await publicarId(e, foroId, e.tokenAlumno)
    const respuesta = await conFilaDelForoRetenida(
      foroId,
      () => borrar(e, foroId, principalId),
      async (sql) => {
        await sql`DELETE FROM publicaciones WHERE id = ${foroId}::uuid`
      },
    )
    expect(respuesta.statusCode, respuesta.body).toBe(404)
    expect(codigoDe(respuesta)).toBe("TAREA_NO_ENCONTRADA")
    expect(respuesta.body).toContain("Ese foro ya no existe.")
    expect(await filasDelForo(foroId)).toEqual({ participaciones: 0, entregas: 0, publicacion: 0 })
  }, 60_000)

  it("ATQ-FORO-61: cinco vueltas del borrado de una principal (con réplicas) a la vez que el borrado confirmado del foro: cada uno 204 o 404, nunca 500, y no queda ninguna fila del foro", async () => {
    const e = await escenario()
    for (let vuelta = 0; vuelta < 5; vuelta += 1) {
      const foroId = await crearForoDePrueba({ claseId: e.claseId, autorId: e.maestro.id })
      const principalId = await publicarId(e, foroId, e.tokenAlumno)
      expect((await replicar(e, foroId, principalId, e.tokenOtroAlumno)).statusCode).toBe(201)
      const respuestas = await Promise.all([
        borrar(e, foroId, principalId),
        pedir({
          method: "DELETE",
          url: `${urlForo(e.claseId, foroId)}?confirmar=entregas`,
          token: e.tokenAdmin,
        }),
      ])
      sinCincos(respuestas)
      const [deLaPrincipal, delForo] = respuestas
      expect([204, 404], deLaPrincipal?.body).toContain(deLaPrincipal?.statusCode)
      expect([204, 404], delForo?.body).toContain(delForo?.statusCode)
      // Si la principal se borró antes, el foro se queda sin entregas que confirmar: 204 igual.
      expect(delForo?.statusCode).toBe(204)
      expect(await filasDelForo(foroId)).toEqual({
        participaciones: 0,
        entregas: 0,
        publicacion: 0,
      })
    }
  }, 90_000)

  it("ATQ-FORO-62: cinco vueltas del borrado de una principal sin calificar a la vez que su autor vuelve a publicar: nunca 500 ni dos principales; la entrega queda entregada si y solo si hay principal, y su versión sube una vez por cada escritura que confirmó", async () => {
    const e = await escenario()
    for (let vuelta = 0; vuelta < 5; vuelta += 1) {
      const foroId = await crearForoDePrueba({ claseId: e.claseId, autorId: e.maestro.id })
      const principalId = await publicarId(e, foroId, e.tokenAlumno)
      const [borrado, republicada] = await Promise.all([
        borrar(e, foroId, principalId),
        publicar(e, foroId, e.tokenAlumno),
      ])
      sinCincos([borrado, republicada])
      expect(borrado.statusCode, borrado.body).toBe(204)
      expect([201, 409], republicada.body).toContain(republicada.statusCode)
      if (republicada.statusCode === 409) {
        expect(codigoDe(republicada)).toBe("PARTICIPACION_YA_PUBLICADA")
      }
      const principales = await obtenerDb().participacionForo.findMany({
        where: { foroId, autorId: e.alumno.id, principalId: null },
        select: { id: true },
      })
      const entrega = await leerEntregaDb(foroId, e.alumno.id)
      if (republicada.statusCode === 201) {
        expect(principales).toHaveLength(1)
        expect(principales[0]?.id).not.toBe(principalId)
        expect(entrega).toMatchObject({ estado: "entregado", version: 3 })
        continue
      }
      expect(principales).toEqual([])
      expect(entrega).toMatchObject({ estado: "asignado", fechaEntrega: null, version: 2 })
    }
  }, 90_000)

  it("ATQ-FORO-63: cinco vueltas de dos réplicas en vuelo y el borrado de su principal: el borrado 204, cada réplica 201 o 404 PARTICIPACION_NO_ENCONTRADA, nunca 500 ni P2003, y no queda ninguna réplica huérfana", async () => {
    const e = await escenario()
    for (let vuelta = 0; vuelta < 5; vuelta += 1) {
      const foroId = await crearForoDePrueba({ claseId: e.claseId, autorId: e.maestro.id })
      const principalId = await publicarId(e, foroId, e.tokenAlumno)
      const respuestas = await Promise.all([
        replicar(e, foroId, principalId, e.tokenOtroAlumno),
        replicar(e, foroId, principalId, e.tokenMaestro),
        borrar(e, foroId, principalId),
      ])
      sinCincos(respuestas)
      const [r1, r2, borrado] = respuestas
      expect(borrado?.statusCode, borrado?.body).toBe(204)
      for (const replica of [r1, r2]) {
        expect([201, 404], replica?.body).toContain(replica?.statusCode)
        if (replica?.statusCode === 404) {
          expect(codigoDe(replica)).toBe("PARTICIPACION_NO_ENCONTRADA")
        }
      }
      expect(await obtenerDb().participacionForo.count({ where: { foroId } })).toBe(0)
      expect(await leerEntregaDb(foroId, e.alumno.id)).toMatchObject({
        estado: "asignado",
        version: 2,
      })
    }
  }, 90_000)

  it("ATQ-FORO-64: tres borrados a la vez de la misma principal sin calificar y tres de la misma réplica: un 204 y dos 404 en cada grupo, la versión sube una sola vez y nunca 500", async () => {
    const e = await escenario()
    const foroId = await crearForoDePrueba({ claseId: e.claseId, autorId: e.maestro.id })
    const principalDelOtro = await publicarId(e, foroId, e.tokenOtroAlumno)
    const replica = await replicar(e, foroId, principalDelOtro, e.tokenAlumno)
    expect(replica.statusCode).toBe(201)
    const replicaId = (replica.json() as { replica: { id: string } }).replica.id
    const principalId = await publicarId(e, foroId, e.tokenAlumno)
    const deLaPrincipal = await Promise.all([1, 2, 3].map(() => borrar(e, foroId, principalId)))
    const deLaReplica = await Promise.all([1, 2, 3].map(() => borrar(e, foroId, replicaId)))
    for (const grupo of [deLaPrincipal, deLaReplica]) {
      sinCincos(grupo)
      expect(grupo.map((r) => r.statusCode).sort()).toEqual([204, 404, 404])
      for (const r of grupo.filter((x) => x.statusCode === 404)) {
        expect(codigoDe(r)).toBe("PARTICIPACION_NO_ENCONTRADA")
      }
    }
    expect(await leerEntregaDb(foroId, e.alumno.id)).toMatchObject({
      estado: "asignado",
      version: 2,
    })
    expect(
      await obtenerDb().participacionForo.findMany({ where: { foroId }, select: { id: true } }),
    ).toEqual([{ id: principalDelOtro }])
  }, 60_000)

  it("ATQ-FORO-65: borrar una principal a la vez que se archiva la clase: el archivado responde 200, el borrado 204 o 409 CLASE_ARCHIVADA, nunca 500, y la entrega queda coherente con lo que confirmó", async () => {
    const e = await escenario()
    const foroId = await crearForoDePrueba({ claseId: e.claseId, autorId: e.maestro.id })
    const principalId = await publicarId(e, foroId, e.tokenAlumno)
    const [archivada, borrado] = await Promise.all([
      pedir({
        method: "POST",
        url: `/api/admin/clases/${e.claseId}/archivar`,
        token: e.tokenAdmin,
      }),
      borrar(e, foroId, principalId),
    ])
    sinCincos([archivada, borrado])
    expect(archivada.statusCode, archivada.body).toBe(200)
    expect([204, 409], borrado.body).toContain(borrado.statusCode)
    const quedan = await obtenerDb().participacionForo.count({ where: { foroId } })
    const entrega = await leerEntregaDb(foroId, e.alumno.id)
    if (borrado.statusCode === 204) {
      expect(quedan).toBe(0)
      expect(entrega).toMatchObject({ estado: "asignado", version: 2 })
      return
    }
    expect(codigoDe(borrado)).toBe("CLASE_ARCHIVADA")
    expect(quedan).toBe(1)
    expect(entrega).toMatchObject({ estado: "entregado", version: 1 })
  }, 60_000)
})

describe("ataque FORO-01b r1 · punto 7: ADMIN-01 con datos más ricos", () => {
  it("ATQ-FORO-66: con una principal calificada que el admin borró, otra sin calificar borrada, réplicas de un maestro dado de baja que sigue en la clase archivada: el conteo cuenta la entrega calificada (con su fecha) y no la vuelta a sin participar; el duplicado no copia nada del foro y el borrado definitivo responde 204 sin dejar filas, con los usuarios intactos", async () => {
    const e = await escenario()
    const otroMaestro = await crearUsuarioDePrueba(idsUsuarios, {
      rol: "maestro",
      nombre: "Maestro Que Se Va",
    })
    await obtenerDb().maestroDeClase.create({
      data: { claseId: e.claseId, maestroId: otroMaestro.id },
      select: { claseId: true },
    })
    const tokenOtroMaestro = await firmarTokenDePrueba({ usuarioId: otroMaestro.id })
    const creado = await pedir({
      method: "POST",
      url: urlForos(e.claseId),
      token: e.tokenMaestro,
      payload: cuerpoDeForo(),
    })
    expect(creado.statusCode, creado.body).toBe(201)
    const foroId = (creado.json() as { foro: { id: string } }).foro.id
    const calificadaId = await publicarId(e, foroId, e.tokenAlumno)
    const sinCalificarId = await publicarId(e, foroId, e.tokenOtroAlumno)
    for (const principal of [calificadaId, sinCalificarId]) {
      expect((await replicar(e, foroId, principal, tokenOtroMaestro)).statusCode).toBe(201)
    }
    const calificada = await pedir({
      method: "PUT",
      url: `${urlForo(e.claseId, foroId)}/participantes/${e.alumno.id}/calificacion`,
      token: e.tokenMaestro,
      payload: {
        version: 1,
        puntosDeLaTarea: 10,
        puntajes: [],
        calificacion: 9,
        comentario: "Bien",
      },
    })
    expect(calificada.statusCode, calificada.body).toBe(200)
    for (const id of [calificadaId, sinCalificarId]) {
      expect((await borrar(e, foroId, id)).statusCode).toBe(204)
    }
    expect(
      (
        await pedir({
          method: "POST",
          url: `/api/admin/clases/${e.claseId}/archivar`,
          token: e.tokenAdmin,
        })
      ).statusCode,
    ).toBe(200)
    const baja = await pedir({
      method: "PUT",
      url: `/api/admin/usuarios/${otroMaestro.id}/activo`,
      token: e.tokenAdmin,
      payload: { activo: false },
    })
    expect(baja.statusCode, baja.body).toBe(200)

    const conteo = await pedir({
      method: "GET",
      url: `/api/admin/clases/${e.claseId}/conteo-de-borrado`,
      token: e.tokenAdmin,
    })
    expect(conteo.statusCode, conteo.body).toBe(200)
    expect(conteoDeBorradoRespuestaSchema.parse(conteo.json())).toMatchObject({
      actividades: 1,
      entregas: 1,
      calificaciones: 1,
    })

    const copia = await pedir({
      method: "POST",
      url: `/api/admin/clases/${e.claseId}/duplicar`,
      token: e.tokenAdmin,
      payload: { nombre: "Copia con foro moderado", maestroIds: [e.maestro.id] },
    })
    expect(copia.statusCode, copia.body).toBe(201)
    const copiaId = (copia.json() as { clase: { id: string } }).clase.id
    idsClases.push(copiaId)
    expect(await obtenerDb().publicacion.count({ where: { claseId: copiaId } })).toBe(0)
    expect(
      await obtenerDb().participacionForo.count({ where: { foro: { claseId: copiaId } } }),
    ).toBe(0)

    const borrada = await pedir({
      method: "DELETE",
      url: `/api/admin/clases/${e.claseId}?confirmar=borrar`,
      token: e.tokenAdmin,
    })
    expect(borrada.statusCode, borrada.body).toBe(204)
    expect(await filasDelForo(foroId)).toEqual({ participaciones: 0, entregas: 0, publicacion: 0 })
    expect(
      await obtenerDb().usuario.count({
        where: { id: { in: [e.alumno.id, e.otroAlumno.id, otroMaestro.id, e.maestro.id] } },
      }),
    ).toBe(4)
  }, 90_000)

  it("ATQ-FORO-67: un alumno con su principal calificada, dado de baja y reactivado: mientras está de baja sale del gradebook y su principal sigue en la lista con su nombre; al reactivarlo vuelve con su calificación, y el admin puede seguir borrando su principal sin perderla", async () => {
    const e = await escenario()
    const foroId = await crearForoDePrueba({ claseId: e.claseId, autorId: e.maestro.id })
    const principalId = await publicarId(e, foroId, e.tokenAlumno)
    const calificada = await pedir({
      method: "PUT",
      url: `${urlForo(e.claseId, foroId)}/participantes/${e.alumno.id}/calificacion`,
      token: e.tokenMaestro,
      payload: { version: 1, puntosDeLaTarea: 10, puntajes: [], calificacion: 7 },
    })
    expect(calificada.statusCode, calificada.body).toBe(200)
    const activo = (valor: boolean) =>
      pedir({
        method: "PUT",
        url: `/api/admin/usuarios/${e.alumno.id}/activo`,
        token: e.tokenAdmin,
        payload: { activo: valor },
      })
    const gradebook = async () =>
      gradebookRespuestaSchema.parse(
        (
          await pedir({
            method: "GET",
            url: `/api/clases/${e.claseId}/gradebook`,
            token: e.tokenMaestro,
          })
        ).json(),
      )
    expect((await activo(false)).statusCode).toBe(200)
    expect((await gradebook()).alumnos.map((a) => a.alumno.id)).not.toContain(e.alumno.id)
    const lista = await pedir({
      method: "GET",
      url: `${urlForo(e.claseId, foroId)}/participaciones`,
      token: e.tokenAdmin,
    })
    expect(lista.json()).toMatchObject({
      participaciones: [{ id: principalId, autor: { nombre: "Alumna Foro" }, puedeBorrar: true }],
    })
    expect((await borrar(e, foroId, principalId)).statusCode).toBe(204)
    expect((await activo(true)).statusCode).toBe(200)
    const fila = (await gradebook()).alumnos.find((a) => a.alumno.id === e.alumno.id)
    expect(fila?.celdas).toEqual([
      { tareaId: foroId, estado: "calificado", conRetraso: false, calificacion: 7 },
    ])
    expect(await leerEntregaDb(foroId, e.alumno.id)).toMatchObject({ estado: "calificado" })
  }, 60_000)
})
