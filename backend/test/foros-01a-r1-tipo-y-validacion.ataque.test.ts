import { randomUUID } from "node:crypto"

import {
  conteoDeBorradoRespuestaSchema,
  foroRespuestaSchema,
  listaTemasRespuestaSchema,
} from "@campus/shared"
import type { FastifyInstance } from "fastify"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { obtenerDb } from "../src/adapters/db/cliente.js"
import { editarTarea } from "../src/adapters/db/index.js"
import { cancelar } from "../src/adapters/queue/index.js"
import { construirApp } from "../src/app.js"
import { cargarEnv } from "../src/config/env.js"
import { COLA_RECORDATORIO_24H, COLA_TAREA_CREADA } from "../src/core/eventos/avisos-de-clase.js"
import { crearAlmacenEnMemoria } from "./almacen-en-memoria.js"
import { borrarUsuariosDePrueba } from "./ayudas-auth.js"
import { terminarCopiasDePrueba } from "./ayudas-borrado-duplicado.js"
import { borrarMovimientosYClasesDePrueba } from "./ayudas-clases.js"
import {
  codigoDe,
  crearEscenarioDeForo,
  crearForoDePrueba,
  crearParticipacionDePrueba,
  cuerpoDeForo,
  HORA_MS,
  mensajeDe,
  pedirForo,
  urlForo,
  urlForos,
  type EscenarioDeForo,
} from "./ayudas-foros.js"
import { crearTemaDePrueba, trabajosDeTarea } from "./ayudas-tareas.js"

// Ataque FORO-01a, ronda 1 (tester). Punto 6 (tipo cruzado en lo que no cambió, y el foro ante el
// duplicado y el borrado definitivo de su clase), punto 7 (el recordatorio en la frontera de 24 h, sin
// trabajo_id, y la cancelación que se revierte con la escritura) y punto 8 (validación: límites
// exactos, invisibles, combinantes, controles, limite, cursores, llaves de más y prefijos).

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

const escenario = (): Promise<EscenarioDeForo> => crearEscenarioDeForo(idsUsuarios, idsClases)

const crearPorLaApi = async (e: EscenarioDeForo, cambios: Record<string, unknown> = {}) => {
  const creado = await pedir({
    method: "POST",
    url: urlForos(e.claseId),
    token: e.tokenMaestro,
    payload: cuerpoDeForo(cambios),
  })
  expect(creado.statusCode, creado.body).toBe(201)
  return foroRespuestaSchema.parse(creado.json()).foro
}

const leerTareaDelForo = (foroId: string) =>
  obtenerDb().tarea.findUnique({
    where: { id: foroId },
    select: { trabajoId: true, version: true, fechaLimite: true, requiereAdjuntos: true },
  })

describe("ataque FORO-01a r1 · punto 6: el tipo cruzado y la clase entera", () => {
  // FORO-01b ronda 0 (C-T1 del tester, §E7.5.2; §D-3.3 y E1-9): TIPOS_CON_TEMA suma "foro" y la rama
  // de moverATema que sube tareas.version aplica también al foro, así que moverlo de tema por la ruta
  // del muro deja de responder 404 (lo que fijaba la ronda 1 de 01a, declarado para 01b en §E8.1).
  // El total de temas sin sección cuenta el foro; con ?seccion=actividades (sin conForos), no, como
  // hoy. Lo demás que protege el caso no cambia: ?tipo=foro en el muro es 400 y "Trabajo" sin
  // conForos no lista el foro ni lo acepta como cursor.
  it("ATQ-FORO-30: los temas sin sección cuentan el foro y con ?seccion=actividades no; Actividades sin conForos no lo lista ni lo acepta como cursor; ?tipo=foro en el muro es 400; moverlo de tema por la ruta del muro responde 200, lo deja sin tema y sube la versión de su fila de tareas", async () => {
    const e = await escenario()
    const tema = await crearTemaDePrueba({ claseId: e.claseId, nombre: "Unidad 1" })
    const foroId = await crearForoDePrueba({
      claseId: e.claseId,
      autorId: e.maestro.id,
      temaId: tema.id,
    })
    const temas = async (consulta: string) => {
      const respuesta = await pedir({
        method: "GET",
        url: `/api/clases/${e.claseId}/temas${consulta}`,
        token: e.tokenAlumno,
      })
      expect(respuesta.statusCode, respuesta.body).toBe(200)
      return listaTemasRespuestaSchema.parse(respuesta.json())
    }
    expect((await temas("")).temas).toEqual([
      expect.objectContaining({ id: tema.id, elementos: 1 }),
    ])
    expect((await temas("?seccion=actividades")).temas).toEqual([
      expect.objectContaining({ id: tema.id, elementos: 0 }),
    ])

    const muro = await pedir({
      method: "GET",
      url: `/api/clases/${e.claseId}/publicaciones?tipo=foro`,
      token: e.tokenAlumno,
    })
    expect(muro.statusCode).toBe(400)
    expect(codigoDe(muro)).toBe("VALIDACION")

    for (const url of [
      `/api/clases/${e.claseId}/trabajo?tema=${tema.id}&seccion=actividades`,
      `/api/clases/${e.claseId}/trabajo?tema=${tema.id}`,
    ]) {
      const trabajo = await pedir({ method: "GET", url, token: e.tokenMaestro })
      expect(trabajo.statusCode, trabajo.body).toBe(200)
      expect(trabajo.body).not.toContain(foroId)
      const conCursor = await pedir({
        method: "GET",
        url: `${url}&cursor=${foroId}`,
        token: e.tokenMaestro,
      })
      expect(conCursor.statusCode, conCursor.body).toBe(400)
      expect(codigoDe(conCursor)).toBe("VALIDACION")
    }

    const movido = await pedir({
      method: "PUT",
      url: `/api/clases/${e.claseId}/publicaciones/${foroId}/tema`,
      token: e.tokenMaestro,
      payload: { temaId: null },
    })
    expect(movido.statusCode, movido.body).toBe(200)
    expect(movido.json()).toEqual({ publicacionId: foroId, temaId: null })
    expect(
      (
        await obtenerDb().publicacion.findUnique({
          where: { id: foroId },
          select: { temaId: true },
        })
      )?.temaId,
    ).toBeNull()
    expect((await leerTareaDelForo(foroId))?.version).toBe(1)
    expect((await temas("")).sinTema).toBe(1)
    expect((await temas("?seccion=actividades")).sinTema).toBe(0)
  })

  it("ATQ-FORO-31: una clase con un foro, principal, réplicas del alumno y del maestro y una calificación con devolución se duplica sin el foro y, archivada, se cuenta y se borra definitivamente (204) sin dejar participaciones; los usuarios siguen", async () => {
    const e = await escenario()
    const foro = await crearPorLaApi(e)
    const base = urlForo(e.claseId, foro.id)
    const principal = await pedir({
      method: "POST",
      url: `${base}/participaciones`,
      token: e.tokenAlumno,
      payload: { texto: "Principal" },
    })
    expect(principal.statusCode).toBe(201)
    const principalId = (principal.json() as { participacion: { id: string } }).participacion.id
    for (const token of [e.tokenOtroAlumno, e.tokenMaestro]) {
      const replica = await pedir({
        method: "POST",
        url: `${base}/participaciones/${principalId}/replicas`,
        token,
        payload: { texto: "Réplica" },
      })
      expect(replica.statusCode, replica.body).toBe(201)
    }
    const calificada = await pedir({
      method: "PUT",
      url: `${base}/participantes/${e.alumno.id}/calificacion`,
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

    const copia = await pedir({
      method: "POST",
      url: `/api/admin/clases/${e.claseId}/duplicar`,
      token: e.tokenAdmin,
      payload: { nombre: "Copia con foro", maestroIds: [e.maestro.id] },
    })
    expect(copia.statusCode, copia.body).toBe(201)
    const copiaId = (copia.json() as { clase: { id: string } }).clase.id
    idsClases.push(copiaId)
    expect(await obtenerDb().publicacion.count({ where: { claseId: copiaId } })).toBe(0)
    expect(await obtenerDb().tarea.count({ where: { claseId: copiaId } })).toBe(0)

    expect(
      (
        await pedir({
          method: "POST",
          url: `/api/admin/clases/${e.claseId}/archivar`,
          token: e.tokenAdmin,
        })
      ).statusCode,
    ).toBe(200)
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
    const borrada = await pedir({
      method: "DELETE",
      url: `/api/admin/clases/${e.claseId}?confirmar=borrar`,
      token: e.tokenAdmin,
    })
    expect(borrada.statusCode, borrada.body).toBe(204)
    expect(await obtenerDb().participacionForo.count({ where: { foroId: foro.id } })).toBe(0)
    expect(await obtenerDb().publicacion.count({ where: { id: foro.id } })).toBe(0)
    expect(
      await obtenerDb().usuario.count({
        where: { id: { in: [e.alumno.id, e.otroAlumno.id, e.maestro.id] } },
      }),
    ).toBe(3)
    const recordatorios = await trabajosDeTarea(COLA_RECORDATORIO_24H, foro.id)
    expect(recordatorios.map(({ state }) => state)).toEqual(["cancelled"])
  }, 60_000)
})

describe("ataque FORO-01a r1 · punto 7: el recordatorio", () => {
  it("ATQ-FORO-32: a 24 h y 2 min se programa a fecha − 24 h; editar a 23 h lo cancela y deja trabajo_id nulo; editar a 3 días, sin trabajo_id, programa uno nuevo; cambiar solo el título no lo toca; borrar cancela el vivo y TAREA_CREADA", async () => {
    const e = await escenario()
    const primera = new Date(Date.now() + 24 * HORA_MS + 2 * 60_000)
    const foro = await crearPorLaApi(e, { fechaLimite: primera.toISOString() })
    const creada = await leerTareaDelForo(foro.id)
    const [vivo] = await trabajosDeTarea(COLA_RECORDATORIO_24H, foro.id)
    expect(vivo?.id).toBe(creada?.trabajoId)
    expect(vivo?.state).toBe("created")
    expect(vivo?.start_after.getTime()).toBe(primera.getTime() - 24 * HORA_MS)

    const editar = async (cambios: Record<string, unknown>, version: number) => {
      const respuesta = await pedir({
        method: "PUT",
        url: urlForo(e.claseId, foro.id),
        token: e.tokenMaestro,
        payload: cuerpoDeForo({ fechaLimite: primera.toISOString(), version, ...cambios }),
      })
      expect(respuesta.statusCode, respuesta.body).toBe(200)
    }
    await editar({ fechaLimite: new Date(Date.now() + 23 * HORA_MS).toISOString() }, 0)
    expect((await leerTareaDelForo(foro.id))?.trabajoId).toBeNull()
    expect(
      (await trabajosDeTarea(COLA_RECORDATORIO_24H, foro.id)).map(({ state }) => state),
    ).toEqual(["cancelled"])

    const tercera = new Date(Date.now() + 3 * 24 * HORA_MS)
    await editar({ fechaLimite: tercera.toISOString() }, 1)
    const reprogramada = await leerTareaDelForo(foro.id)
    const trabajos = await trabajosDeTarea(COLA_RECORDATORIO_24H, foro.id)
    expect(trabajos.map(({ state }) => state)).toEqual(["cancelled", "created"])
    expect(trabajos[1]?.id).toBe(reprogramada?.trabajoId)
    expect(trabajos[1]?.start_after.getTime()).toBe(tercera.getTime() - 24 * HORA_MS)

    await editar({ fechaLimite: tercera.toISOString(), titulo: "Solo cambia el título" }, 2)
    expect((await leerTareaDelForo(foro.id))?.trabajoId).toBe(reprogramada?.trabajoId)
    expect(
      (await trabajosDeTarea(COLA_RECORDATORIO_24H, foro.id)).map(({ state }) => state),
    ).toEqual(["cancelled", "created"])

    const borrado = await pedir({
      method: "DELETE",
      url: urlForo(e.claseId, foro.id),
      token: e.tokenMaestro,
    })
    expect(borrado.statusCode, borrado.body).toBe(204)
    expect(
      (await trabajosDeTarea(COLA_RECORDATORIO_24H, foro.id)).map(({ state }) => state),
    ).toEqual(["cancelled", "cancelled"])
    expect((await trabajosDeTarea(COLA_TAREA_CREADA, foro.id)).map(({ state }) => state)).toEqual([
      "cancelled",
    ])
  }, 60_000)

  it("ATQ-FORO-37: con el recordatorio ya en curso (active), editar la fecha responde 200, programa uno nuevo con la fecha nueva y deja trabajo_id en él; borrar después responde 204 sin trabajos vivos", async () => {
    const e = await escenario()
    const foro = await crearPorLaApi(e)
    const antes = await leerTareaDelForo(foro.id)
    if (antes?.trabajoId == null) throw new Error("Precondición: el foro tiene recordatorio")
    const enCurso = await obtenerDb().$executeRaw`
      UPDATE pgboss.job SET state = 'active', started_on = now()
      WHERE name = ${COLA_RECORDATORIO_24H} AND id = ${antes.trabajoId}::uuid`
    expect(enCurso, "Precondición: el recordatorio pasó a active").toBe(1)
    const nueva = new Date(Date.now() + 8 * 24 * HORA_MS)
    const editado = await pedir({
      method: "PUT",
      url: urlForo(e.claseId, foro.id),
      token: e.tokenMaestro,
      payload: cuerpoDeForo({ fechaLimite: nueva.toISOString(), version: 0 }),
    })
    expect(editado.statusCode, editado.body).toBe(200)
    const despues = await leerTareaDelForo(foro.id)
    expect(despues?.trabajoId).not.toBe(antes.trabajoId)
    const trabajos = await trabajosDeTarea(COLA_RECORDATORIO_24H, foro.id)
    const vivo = trabajos.find(({ id }) => id === despues?.trabajoId)
    expect(vivo?.state).toBe("created")
    expect(vivo?.start_after.getTime()).toBe(nueva.getTime() - 24 * HORA_MS)
    const borrado = await pedir({
      method: "DELETE",
      url: urlForo(e.claseId, foro.id),
      token: e.tokenMaestro,
    })
    expect(borrado.statusCode, borrado.body).toBe(204)
    expect(
      (await trabajosDeTarea(COLA_RECORDATORIO_24H, foro.id)).filter(({ state }) =>
        ["created", "retry"].includes(state),
      ),
    ).toEqual([])
  }, 60_000)

  it("ATQ-FORO-33: si la escritura de la edición de un foro falla después de cancelar su recordatorio, la cancelación se revierte con ella: el trabajo sigue en created, trabajo_id y el título no cambian", async () => {
    const e = await escenario()
    const foro = await crearPorLaApi(e)
    const antes = await leerTareaDelForo(foro.id)
    if (antes?.trabajoId == null) throw new Error("Precondición: el foro tiene recordatorio")
    const trabajoId = antes.trabajoId
    await expect(
      editarTarea(
        {
          claseId: e.claseId,
          tareaId: foro.id,
          actor: { id: e.maestro.id, rol: "maestro" },
          ahora: new Date(),
          tipo: "foro",
          version: 0,
          idRecordatorioNuevo: randomUUID(),
          titulo: "No debe quedar",
          instrucciones: "No debe quedar",
          fechaLimite: new Date(Date.now() + 6 * 24 * HORA_MS),
          puntos: 10,
          aceptaTardias: true,
          requiereAdjuntos: false,
          categoriaId: null,
          temaId: null,
          rubrica: [],
          archivoIds: [],
          archivosNuevos: [],
        },
        async (sql, plan) => {
          expect(plan.cancelar).toBe(trabajoId)
          if (plan.cancelar !== null) await cancelar(COLA_RECORDATORIO_24H, plan.cancelar, { sql })
          throw new Error("falla simulada después de cancelar")
        },
      ),
    ).rejects.toThrow("falla simulada después de cancelar")
    expect(await leerTareaDelForo(foro.id)).toEqual(antes)
    expect(
      (await trabajosDeTarea(COLA_RECORDATORIO_24H, foro.id)).map(({ state }) => state),
    ).toEqual(["created"])
    expect(
      (
        await obtenerDb().publicacion.findUnique({
          where: { id: foro.id },
          select: { titulo: true },
        })
      )?.titulo,
    ).toBe("Debate de la unidad 2")
  }, 60_000)
})

describe("ataque FORO-01a r1 · punto 8: validación", () => {
  it("ATQ-FORO-34: la principal admite 5000 caracteres y no 5001, la réplica 1000 y no 1001; solo combinantes, solo invisibles, un control o un inversor de dirección responden 400 «texto: …» sin escribir", async () => {
    const e = await escenario()
    const foroId = await crearForoDePrueba({ claseId: e.claseId, autorId: e.maestro.id })
    const otroForo = await crearForoDePrueba({ claseId: e.claseId, autorId: e.maestro.id })
    const principales = `${urlForo(e.claseId, foroId)}/participaciones`
    const largo = await pedir({
      method: "POST",
      url: principales,
      token: e.tokenAlumno,
      payload: { texto: "a".repeat(5001) },
    })
    expect(largo.statusCode).toBe(400)
    expect(mensajeDe(largo)).toBe("texto: No puede tener más de 5000 caracteres")
    const justo = await pedir({
      method: "POST",
      url: principales,
      token: e.tokenAlumno,
      payload: { texto: "a".repeat(5000) },
    })
    expect(justo.statusCode, justo.body).toBe(201)
    const principalId = (justo.json() as { participacion: { id: string } }).participacion.id
    const replicas = `${principales}/${principalId}/replicas`
    const replicaLarga = await pedir({
      method: "POST",
      url: replicas,
      token: e.tokenOtroAlumno,
      payload: { texto: "b".repeat(1001) },
    })
    expect(replicaLarga.statusCode).toBe(400)
    expect(mensajeDe(replicaLarga)).toBe("texto: No puede tener más de 1000 caracteres")
    const replicaJusta = await pedir({
      method: "POST",
      url: replicas,
      token: e.tokenOtroAlumno,
      payload: { texto: "b".repeat(1000) },
    })
    expect(replicaJusta.statusCode, replicaJusta.body).toBe(201)

    const antes = await obtenerDb().participacionForo.count({
      where: { foro: { claseId: e.claseId } },
    })
    const malos = ["́́́", "​⁠﻿", "hola\u0000", "hola\u0007", "a‮b", "   \n\t  "]
    for (const texto of malos) {
      for (const [url, token] of [
        [`${urlForo(e.claseId, otroForo)}/participaciones`, e.tokenOtroAlumno],
        [replicas, e.tokenMaestro],
      ] as const) {
        const respuesta = await pedir({ method: "POST", url, token, payload: { texto } })
        expect(respuesta.statusCode, `${JSON.stringify(texto)} en ${url}`).toBe(400)
        expect(codigoDe(respuesta)).toBe("VALIDACION")
        expect(mensajeDe(respuesta).startsWith("texto: ")).toBe(true)
      }
    }
    expect(
      await obtenerDb().participacionForo.count({ where: { foro: { claseId: e.claseId } } }),
    ).toBe(antes)
    expect(await obtenerDb().entrega.count({ where: { tareaId: otroForo } })).toBe(0)
  }, 60_000)

  it("ATQ-FORO-35: limite 0, 101, -1, 1.5 o no numérico y un cursor que no es uuid responden 400 VALIDACION en cada lista del foro; un id mal formado responde 400 con «foroId: », «participacionId: » o «alumnoId: » delante", async () => {
    const e = await escenario()
    const foroId = await crearForoDePrueba({ claseId: e.claseId, autorId: e.maestro.id })
    const principalId = await crearParticipacionDePrueba({ foroId, autorId: e.alumno.id })
    const base = urlForo(e.claseId, foroId)
    const listas: [string, string][] = [
      [urlForos(e.claseId), e.tokenAlumno],
      [`${base}/mi-participacion/devoluciones`, e.tokenAlumno],
      [`${base}/participaciones`, e.tokenAlumno],
      [`${base}/participaciones/${principalId}/replicas`, e.tokenMaestro],
      [`${base}/participantes`, e.tokenMaestro],
      [`${base}/participantes/${e.alumno.id}/participaciones`, e.tokenAdmin],
      [`${base}/participantes/${e.alumno.id}/devoluciones`, e.tokenMaestro],
    ]
    for (const [url, token] of listas) {
      for (const consulta of [
        "limite=0",
        "limite=101",
        "limite=-1",
        "limite=1.5",
        "limite=abc",
        "cursor=abc",
      ]) {
        const respuesta = await pedir({ method: "GET", url: `${url}?${consulta}`, token })
        expect(respuesta.statusCode, `${url}?${consulta}`).toBe(400)
        expect(codigoDe(respuesta)).toBe("VALIDACION")
        expect(mensajeDe(respuesta)).toMatch(/^(limite|cursor): /)
      }
      const cien = await pedir({ method: "GET", url: `${url}?limite=100`, token })
      expect(cien.statusCode, `${url}?limite=100: ${cien.body}`).toBe(200)
    }
    const malos: [string, string, string, Record<string, unknown> | undefined][] = [
      [
        "GET",
        `${urlForos(e.claseId)}/no-es-id`,
        "foroId: foroId: debe ser un identificador válido",
        undefined,
      ],
      [
        "GET",
        `${base}/participaciones/no-es-id/replicas`,
        "participacionId: participacionId: debe ser un identificador válido",
        undefined,
      ],
      [
        "GET",
        `${base}/participantes/no-es-id`,
        "alumnoId: alumnoId: debe ser un identificador válido",
        undefined,
      ],
      [
        "PUT",
        `${base}/participantes/no-es-id/calificacion`,
        "alumnoId: alumnoId: debe ser un identificador válido",
        { version: 0, puntosDeLaTarea: 10, puntajes: [], calificacion: 5 },
      ],
    ]
    for (const [metodo, url, mensaje, payload] of malos) {
      const respuesta = await pedir({
        method: metodo === "PUT" ? "PUT" : "GET",
        url,
        token: e.tokenMaestro,
        ...(payload === undefined ? {} : { payload }),
      })
      expect(respuesta.statusCode, url).toBe(400)
      expect(mensajeDe(respuesta)).toBe(mensaje)
    }
  }, 60_000)

  it("ATQ-FORO-36: las llaves de más se ignoran: un foro con tipo, requiereAdjuntos, autorId, trabajoId y version queda foro, sin adjuntos requeridos, del autor real y en versión 0; una principal o una réplica con id, autorId, principalId, foroId y conRetraso quedan del autor real, en su lugar y sin retraso", async () => {
    const e = await escenario()
    const idElegido = randomUUID()
    const foro = await crearPorLaApi(e, {
      tipo: "tarea",
      requiereAdjuntos: true,
      autorId: e.alumno.id,
      trabajoId: idElegido,
      version: 7,
      id: idElegido,
    })
    expect(foro.id).not.toBe(idElegido)
    const publicacion = await obtenerDb().publicacion.findUnique({
      where: { id: foro.id },
      select: { tipo: true, autorId: true },
    })
    expect(publicacion).toEqual({ tipo: "foro", autorId: e.maestro.id })
    const tarea = await leerTareaDelForo(foro.id)
    expect(tarea).toMatchObject({ requiereAdjuntos: false, version: 0 })
    expect(tarea?.trabajoId).not.toBe(idElegido)

    const otroForo = await crearForoDePrueba({ claseId: e.claseId, autorId: e.maestro.id })
    const ajena = await crearParticipacionDePrueba({ foroId: otroForo, autorId: e.otroAlumno.id })
    const principal = await pedir({
      method: "POST",
      url: `${urlForo(e.claseId, foro.id)}/participaciones`,
      token: e.tokenAlumno,
      payload: {
        texto: "Con llaves de más",
        id: idElegido,
        autorId: e.otroAlumno.id,
        principalId: ajena,
        foroId: otroForo,
        conRetraso: true,
      },
    })
    expect(principal.statusCode, principal.body).toBe(201)
    const principalId = (principal.json() as { participacion: { id: string } }).participacion.id
    expect(principalId).not.toBe(idElegido)
    const replica = await pedir({
      method: "POST",
      url: `${urlForo(e.claseId, foro.id)}/participaciones/${principalId}/replicas`,
      token: e.tokenOtroAlumno,
      payload: {
        texto: "Réplica con llaves",
        principalId: ajena,
        autorId: e.alumno.id,
        conRetraso: true,
      },
    })
    expect(replica.statusCode, replica.body).toBe(201)
    const filas = await obtenerDb().participacionForo.findMany({
      where: { foroId: foro.id },
      select: { id: true, autorId: true, principalId: true, conRetraso: true },
      orderBy: { creadoEn: "asc" },
    })
    expect(filas).toEqual([
      { id: principalId, autorId: e.alumno.id, principalId: null, conRetraso: false },
      {
        id: expect.any(String) as string,
        autorId: e.otroAlumno.id,
        principalId,
        conRetraso: false,
      },
    ])
    expect(await obtenerDb().participacionForo.count({ where: { foroId: otroForo } })).toBe(1)
  }, 60_000)
})
