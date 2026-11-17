import { randomUUID } from "node:crypto"

import { foroRespuestaSchema } from "@campus/shared"
import type { FastifyInstance } from "fastify"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { obtenerDb } from "../src/adapters/db/cliente.js"
import { construirApp } from "../src/app.js"
import { cargarEnv } from "../src/config/env.js"
import { COLA_RECORDATORIO_24H, COLA_TAREA_CREADA } from "../src/core/eventos/avisos-de-clase.js"
import { crearAlmacenEnMemoria, type AlmacenEnMemoria } from "./almacen-en-memoria.js"
import { borrarUsuariosDePrueba } from "./ayudas-auth.js"
import {
  borrarMovimientosYClasesDePrueba,
  crearArchivoDePrueba,
  crearPublicacionDePrueba,
} from "./ayudas-clases.js"
import { crearEntregaDePrueba } from "./ayudas-entregas.js"
import {
  codigoDe,
  crearEscenarioDeForo,
  crearForoDePrueba,
  crearParticipacionDePrueba,
  cuerpoDeForo,
  mensajeDe,
  pedirForo,
  rutasDelForo,
  urlForos,
  type EscenarioDeForo,
} from "./ayudas-foros.js"
import {
  crearMaterialConTemaDePrueba,
  crearTareaDePrueba,
  trabajosDeTarea,
} from "./ayudas-tareas.js"

// FORO-01a. FORO-1A45 a FORO-1A48: ninguna ruta de tarea acepta un foro y ninguna ruta del foro acepta
// una tarea, un anuncio ni un material; el muro tampoco toca un foro. Nada se escribe en ninguno.

const almacen: AlmacenEnMemoria = crearAlmacenEnMemoria()
let app: FastifyInstance | undefined
const idsUsuarios: string[] = []
const idsClases: string[] = []

const obtenerApp = (): FastifyInstance => {
  if (!app) throw new Error("La aplicación no se construyó en beforeAll")
  return app
}
const pedir = pedirForo(obtenerApp)

beforeAll(async () => {
  app = await construirApp({ env: cargarEnv(), almacen })
  await app.ready()
})

afterAll(async () => {
  await borrarMovimientosYClasesDePrueba(idsClases)
  await borrarUsuariosDePrueba(idsUsuarios)
  await app?.close()
})

const escenario = (): Promise<EscenarioDeForo> => crearEscenarioDeForo(idsUsuarios, idsClases)

// Un foro real, creado por la API con un adjunto confirmado y su recordatorio programado.
const foroConAdjunto = async (
  e: EscenarioDeForo,
): Promise<{ foroId: string; archivoId: string }> => {
  const archivo = await crearArchivoDePrueba({ claseId: e.claseId, subidoPor: e.maestro.id })
  almacen.subir(archivo.claveObjeto, { tamano: 1000, tipo: "application/pdf" })
  const respuesta = await pedir({
    method: "POST",
    url: urlForos(e.claseId),
    token: e.tokenMaestro,
    payload: cuerpoDeForo({ archivoIds: [archivo.id] }),
  })
  expect(respuesta.statusCode, respuesta.body).toBe(201)
  return { foroId: foroRespuestaSchema.parse(respuesta.json()).foro.id, archivoId: archivo.id }
}

const fotoDelForo = async (foroId: string) => {
  const db = obtenerDb()
  return {
    publicacion: await db.publicacion.findUnique({
      where: { id: foroId },
      select: { titulo: true, texto: true, tipo: true, version: true },
    }),
    tarea: await db.tarea.findUnique({
      where: { id: foroId },
      select: { trabajoId: true, version: true, puntos: true },
    }),
    archivos: await db.archivo.findMany({
      where: { publicacionId: foroId },
      select: { id: true, estado: true },
    }),
    entregas: await db.entrega.count({ where: { tareaId: foroId } }),
    comentarios: await db.comentario.count({ where: { entrega: { tareaId: foroId } } }),
    participaciones: await db.participacionForo.count({ where: { foroId } }),
    recordatorios: (await trabajosDeTarea(COLA_RECORDATORIO_24H, foroId)).map((t) => t.state),
    creadas: (await trabajosDeTarea(COLA_TAREA_CREADA, foroId)).map((t) => t.state),
  }
}

describe("FORO-1A45 y FORO-1A46: las rutas de una tarea no aceptan un foro", () => {
  it("FORO-1A45: GET, PUT y DELETE /tareas/:id con el id de un foro responden 404 TAREA_NO_ENCONTRADA y nada cambia (título, archivos, trabajo_id ni trabajos)", async () => {
    const e = await escenario()
    const { foroId, archivoId } = await foroConAdjunto(e)
    const antes = await fotoDelForo(foroId)
    expect(antes.archivos).toEqual([{ id: archivoId, estado: "confirmado" }])
    expect(antes.recordatorios).toEqual(["created"])
    const url = `/api/clases/${e.claseId}/tareas/${foroId}`
    for (const respuesta of [
      await pedir({ method: "GET", url, token: e.tokenAlumno }),
      await pedir({
        method: "PUT",
        url,
        token: e.tokenMaestro,
        payload: { ...cuerpoDeForo({ titulo: "Cambiado", archivoIds: [] }), version: 0 },
      }),
      await pedir({ method: "DELETE", url, token: e.tokenMaestro }),
      await pedir({ method: "DELETE", url: `${url}?confirmar=entregas`, token: e.tokenAdmin }),
    ]) {
      expect(respuesta.statusCode, respuesta.body).toBe(404)
      expect(codigoDe(respuesta)).toBe("TAREA_NO_ENCONTRADA")
      expect(mensajeDe(respuesta)).toBe("Esa tarea ya no existe.")
    }
    expect(await fotoDelForo(foroId)).toEqual(antes)
  })

  it("FORO-1A46: con el id de un foro, las rutas de la entrega, de las entregas, del hilo privado, de calificar y las dos descargas responden 404 sin fila de entrega ni comentario nuevos", async () => {
    const e = await escenario()
    const foroId = await crearForoDePrueba({ claseId: e.claseId, autorId: e.maestro.id })
    const archivoId = randomUUID()
    const base = `/api/clases/${e.claseId}/tareas/${foroId}`
    const alumno = `${base}/entregas/${e.alumno.id}`
    const casos = [
      { method: "GET", url: `${base}/entrega`, token: e.tokenAlumno },
      {
        method: "POST",
        url: `${base}/entrega`,
        token: e.tokenAlumno,
        payload: { archivoIds: [], enlaces: ["https://ejemplo.mx/a"] },
      },
      { method: "POST", url: `${base}/entrega/anular`, token: e.tokenAlumno, payload: {} },
      {
        method: "POST",
        url: `${base}/entrega/archivos`,
        token: e.tokenAlumno,
        payload: { nombre: "a.pdf", tipo: "application/pdf", tamano: 100 },
      },
      { method: "GET", url: `${base}/entrega/comentarios`, token: e.tokenAlumno },
      {
        method: "POST",
        url: `${base}/entrega/comentarios`,
        token: e.tokenAlumno,
        payload: { texto: "Hola" },
      },
      {
        method: "POST",
        url: `${base}/entrega/archivos/${archivoId}/descarga`,
        token: e.tokenAlumno,
      },
      { method: "GET", url: `${base}/entregas`, token: e.tokenMaestro },
      { method: "GET", url: alumno, token: e.tokenMaestro },
      { method: "GET", url: `${alumno}/comentarios`, token: e.tokenMaestro },
      {
        method: "POST",
        url: `${alumno}/comentarios`,
        token: e.tokenMaestro,
        payload: { texto: "Hola" },
      },
      {
        method: "PUT",
        url: `${alumno}/calificacion`,
        token: e.tokenMaestro,
        payload: { version: 0, puntosDeLaTarea: 10, puntajes: [], calificacion: 5 },
      },
      {
        method: "POST",
        url: `${alumno}/archivos/${archivoId}/descarga`,
        token: e.tokenMaestro,
      },
    ] as const
    expect(casos).toHaveLength(13)
    for (const caso of casos) {
      const respuesta = await pedir(caso)
      expect(respuesta.statusCode, `${caso.method} ${caso.url}`).toBe(404)
      expect(codigoDe(respuesta), `${caso.method} ${caso.url}`).toBe("TAREA_NO_ENCONTRADA")
    }
    expect(await obtenerDb().entrega.count({ where: { tareaId: foroId } })).toBe(0)
    expect(await obtenerDb().comentario.count({ where: { autorId: e.alumno.id } })).toBe(0)
    expect(await obtenerDb().comentario.count({ where: { autorId: e.maestro.id } })).toBe(0)
    expect(await obtenerDb().archivo.count({ where: { subidoPor: e.alumno.id } })).toBe(0)
  })
})

describe("FORO-1A47: las rutas del foro no aceptan una tarea, un anuncio ni un material", () => {
  it("FORO-1A47: con el id de una tarea, un anuncio o un material, cada ruta del foro con :foroId responde 404 «Ese foro ya no existe.» sin escribir nada", async () => {
    const e = await escenario()
    const tarea = await crearTareaDePrueba({
      claseId: e.claseId,
      autorId: e.maestro.id,
      fechaLimite: new Date(Date.now() - 3_600_000),
      aceptaTardias: false,
    })
    await crearEntregaDePrueba({ tareaId: tarea, alumnoId: e.otroAlumno.id })
    const anuncio = await crearPublicacionDePrueba({ claseId: e.claseId, autorId: e.maestro.id })
    const material = await crearMaterialConTemaDePrueba({
      claseId: e.claseId,
      autorId: e.maestro.id,
    })
    // Una principal real de un foro, para que las rutas 10 y 11 lleguen hasta el foro.
    const foro = await crearForoDePrueba({ claseId: e.claseId, autorId: e.maestro.id })
    const principal = await crearParticipacionDePrueba({ foroId: foro, autorId: e.otroAlumno.id })
    const antes = {
      publicaciones: await obtenerDb().publicacion.count({ where: { claseId: e.claseId } }),
      entregas: await obtenerDb().entrega.count({ where: { tareaId: tarea } }),
      tarea: await obtenerDb().tarea.findUnique({ where: { id: tarea } }),
      participaciones: await obtenerDb().participacionForo.count({
        where: { foro: { claseId: e.claseId } },
      }),
    }
    let casos = 0
    for (const id of [tarea, anuncio, material]) {
      const rutas = rutasDelForo({
        claseId: e.claseId,
        foroId: id,
        participacionId: principal,
        alumnoId: e.alumno.id,
      }).filter(({ numero }) => numero !== 1 && numero !== 2)
      expect(rutas).toHaveLength(14)
      for (const ruta of rutas) {
        const token = [6, 7, 9].includes(ruta.numero) ? e.tokenAlumno : e.tokenMaestro
        const respuesta = await pedir({
          method: ruta.method,
          url: ruta.url,
          token,
          ...(ruta.payload === undefined ? {} : { payload: ruta.payload }),
        })
        expect(respuesta.statusCode, `ruta ${String(ruta.numero)} con ${id}`).toBe(404)
        expect(codigoDe(respuesta)).toBe("TAREA_NO_ENCONTRADA")
        expect(mensajeDe(respuesta)).toBe("Ese foro ya no existe.")
        casos += 1
      }
    }
    expect(casos).toBe(42)
    expect({
      publicaciones: await obtenerDb().publicacion.count({ where: { claseId: e.claseId } }),
      entregas: await obtenerDb().entrega.count({ where: { tareaId: tarea } }),
      tarea: await obtenerDb().tarea.findUnique({ where: { id: tarea } }),
      participaciones: await obtenerDb().participacionForo.count({
        where: { foro: { claseId: e.claseId } },
      }),
    }).toEqual(antes)
  })

  it("FORO-1A47: con un foro real, una participación que no es de él responde 404 PARTICIPACION_NO_ENCONTRADA en las rutas 10 y 11", async () => {
    const e = await escenario()
    const foro = await crearForoDePrueba({ claseId: e.claseId, autorId: e.maestro.id })
    const rutas = rutasDelForo({
      claseId: e.claseId,
      foroId: foro,
      participacionId: randomUUID(),
      alumnoId: e.alumno.id,
    }).filter(({ numero }) => numero === 10 || numero === 11)
    for (const ruta of rutas) {
      const respuesta = await pedir({
        method: ruta.method,
        url: ruta.url,
        token: e.tokenAlumno,
        ...(ruta.payload === undefined ? {} : { payload: ruta.payload }),
      })
      expect(respuesta.statusCode).toBe(404)
      expect(codigoDe(respuesta)).toBe("PARTICIPACION_NO_ENCONTRADA")
    }
    expect(await obtenerDb().participacionForo.count({ where: { foroId: foro } })).toBe(0)
  })
})

describe("FORO-1A48: el muro no borra ni comenta un foro", () => {
  it("FORO-1A48: DELETE /publicaciones/:foroId, y leer o escribir los comentarios del muro de un foro, responden 404", async () => {
    const e = await escenario()
    const foro = await crearForoDePrueba({ claseId: e.claseId, autorId: e.maestro.id })
    const base = `/api/clases/${e.claseId}/publicaciones/${foro}`
    for (const { method, url, token, payload } of [
      { method: "DELETE", url: base, token: e.tokenMaestro, payload: undefined },
      { method: "GET", url: `${base}/comentarios`, token: e.tokenAlumno, payload: undefined },
      {
        method: "POST",
        url: `${base}/comentarios`,
        token: e.tokenAlumno,
        payload: { texto: "Hola" },
      },
    ] as const) {
      const respuesta = await pedir({
        method,
        url,
        token,
        ...(payload === undefined ? {} : { payload }),
      })
      expect(respuesta.statusCode, `${method} ${url}`).toBe(404)
    }
    expect(await obtenerDb().publicacion.findUnique({ where: { id: foro } })).not.toBeNull()
    // Como no se puede comentar un foro en el muro, no hay comentario del muro que borrar en él.
    expect(await obtenerDb().comentario.count({ where: { publicacionId: foro } })).toBe(0)
  })
})
