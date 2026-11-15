import { randomUUID } from "node:crypto"

import { foroRespuestaSchema, listaForosRespuestaSchema } from "@campus/shared"
import type { FastifyInstance, LightMyRequestResponse } from "fastify"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { obtenerDb } from "../src/adapters/db/cliente.js"
import { crearTarea } from "../src/adapters/db/tareas.js"
import { encolar } from "../src/adapters/queue/index.js"
import { construirApp } from "../src/app.js"
import { cargarEnv } from "../src/config/env.js"
import { COLA_RECORDATORIO_24H, COLA_TAREA_CREADA } from "../src/core/eventos/avisos-de-clase.js"
import { crearAlmacenEnMemoria } from "./almacen-en-memoria.js"
import { borrarUsuariosDePrueba, crearUsuarioDePrueba, firmarTokenDePrueba } from "./ayudas-auth.js"
import {
  borrarMovimientosYClasesDePrueba,
  crearClaseDePrueba,
  crearPublicacionDePrueba,
} from "./ayudas-clases.js"
import { crearEntregaDePrueba } from "./ayudas-entregas.js"
import {
  codigoDe,
  contarParticipaciones,
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
import {
  crearCategoriaDePrueba,
  crearTareaDePrueba,
  leerTareaDb,
  trabajosDeTarea,
} from "./ayudas-tareas.js"

// FORO-01a. FORO-1A20 (crear), FORO-1A21 (editar), FORO-1A22 (borrar), FORO-1A23 (autoría), FORO-1A24
// (la lista de foros) y FORO-1A26 (el muro no trae foros).

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

const crear = (e: EscenarioDeForo, cuerpo: Record<string, unknown>, token = e.tokenMaestro) =>
  pedir({ method: "POST", url: urlForos(e.claseId), token, payload: cuerpo })

const idDelForo = (respuesta: LightMyRequestResponse): string => {
  expect(respuesta.statusCode, respuesta.body).toBeLessThan(300)
  return foroRespuestaSchema.parse(respuesta.json()).foro.id
}

const versionDe = async (foroId: string): Promise<number> => {
  const fila = await leerTareaDb(foroId)
  if (fila === null) throw new Error("Precondición: el foro existe")
  return fila.version
}

const CLAVES_DEL_DETALLE = [
  "aceptaTardias",
  "actualizadoEn",
  "adjuntos",
  "autor",
  "categoria",
  "creadoEn",
  "fechaLimite",
  "id",
  "instrucciones",
  "puedeBorrar",
  "puedeEditar",
  "puntos",
  "rubrica",
  "tema",
  "titulo",
  "version",
]

describe("FORO-1A20: crear un foro", () => {
  it("FORO-1A20: el maestro y el admin crean un foro: 201 con el detalle, sin requiereAdjuntos, trabajo, rol ni correos", async () => {
    const e = await escenario()
    for (const token of [e.tokenMaestro, e.tokenAdmin]) {
      const respuesta = await crear(e, cuerpoDeForo({ requiereAdjuntos: true }), token)
      expect(respuesta.statusCode, respuesta.body).toBe(201)
      const cuerpo = respuesta.json<{ foro: Record<string, unknown> }>()
      expect(Object.keys(cuerpo.foro).sort()).toEqual(CLAVES_DEL_DETALLE)
      expect(cuerpo.foro).toMatchObject({
        titulo: "Debate de la unidad 2",
        instrucciones: "¿Qué opinas del texto?",
        aceptaTardias: true,
        version: 0,
      })
      expect(Object.keys(cuerpo.foro.autor as object).sort()).toEqual([
        "administracion",
        "id",
        "nombre",
      ])
      const id = foroRespuestaSchema.parse(cuerpo).foro.id
      const fila = await obtenerDb().publicacion.findUnique({
        where: { id },
        select: { tipo: true, tarea: { select: { requiereAdjuntos: true } } },
      })
      expect(fila).toEqual({ tipo: "foro", tarea: { requiereAdjuntos: false } })
    }
  })

  it("FORO-1A20: TAREA_CREADA lleva el id del foro y solo ids; RECORDATORIO_24H queda en created con start_after = fecha − 24 h y su id en trabajo_id", async () => {
    const e = await escenario()
    const fecha = new Date(Date.now() + 5 * 24 * HORA_MS)
    const id = idDelForo(await crear(e, cuerpoDeForo({ fechaLimite: fecha.toISOString() })))
    const creada = await trabajosDeTarea(COLA_TAREA_CREADA, id)
    expect(creada).toHaveLength(1)
    expect(creada[0]?.id).toBe(id)
    expect(creada[0]?.datos).toEqual({ tareaId: id, claseId: e.claseId })
    const recordatorios = await trabajosDeTarea(COLA_RECORDATORIO_24H, id)
    expect(recordatorios).toHaveLength(1)
    expect(recordatorios[0]?.state).toBe("created")
    expect(recordatorios[0]?.datos).toEqual({ tareaId: id, claseId: e.claseId })
    expect(recordatorios[0]?.start_after.getTime()).toBe(fecha.getTime() - 24 * HORA_MS)
    expect((await leerTareaDb(id))?.trabajoId).toBe(recordatorios[0]?.id)
  })

  it("FORO-1A20: a menos de 24 h no se programa recordatorio y trabajo_id queda nulo", async () => {
    const e = await escenario()
    const id = idDelForo(
      await crear(
        e,
        cuerpoDeForo({ fechaLimite: new Date(Date.now() + 12 * HORA_MS).toISOString() }),
      ),
    )
    expect(await trabajosDeTarea(COLA_RECORDATORIO_24H, id)).toHaveLength(0)
    expect(await trabajosDeTarea(COLA_TAREA_CREADA, id)).toHaveLength(1)
    expect((await leerTareaDb(id))?.trabajoId).toBeNull()
  })

  it("FORO-1A20: si falla el encolado, no queda el foro ni su trabajo", async () => {
    const e = await escenario()
    const id = randomUUID()
    await expect(
      crearTarea(
        {
          id,
          claseId: e.claseId,
          autor: { id: e.maestro.id, rol: "maestro" },
          tipo: "foro",
          titulo: "Foro que no queda",
          instrucciones: "Planteamiento",
          fechaLimite: new Date(Date.now() + 5 * 24 * HORA_MS),
          puntos: 10,
          aceptaTardias: true,
          requiereAdjuntos: false,
          categoriaId: null,
          temaId: null,
          rubrica: [],
          trabajoId: null,
        },
        async (sql) => {
          await encolar(COLA_TAREA_CREADA, { tareaId: id, claseId: e.claseId }, { id, sql })
          throw new Error("fallo deliberado del encolado")
        },
      ),
    ).rejects.toThrow("fallo deliberado del encolado")
    expect(await obtenerDb().publicacion.findUnique({ where: { id } })).toBeNull()
    expect(await leerTareaDb(id)).toBeNull()
    expect(await trabajosDeTarea(COLA_TAREA_CREADA, id)).toHaveLength(0)
  })

  it("FORO-1A20: sin planteamiento, 400 VALIDACION con el texto del foro", async () => {
    const e = await escenario()
    const respuesta = await crear(e, cuerpoDeForo({ instrucciones: "   " }))
    expect(respuesta.statusCode).toBe(400)
    expect(codigoDe(respuesta)).toBe("VALIDACION")
    expect(mensajeDe(respuesta)).toContain("Escribe el planteamiento del foro")
  })
})

describe("FORO-1A21: editar un foro", () => {
  it("FORO-1A21: con la versión vieja, 409 TAREA_MODIFICADA con el texto del foro y nada cambia", async () => {
    const e = await escenario()
    const id = idDelForo(await crear(e, cuerpoDeForo()))
    const primera = await pedir({
      method: "PUT",
      url: urlForo(e.claseId, id),
      token: e.tokenMaestro,
      payload: cuerpoDeForo({ titulo: "Primera", version: 0 }),
    })
    expect(primera.statusCode, primera.body).toBe(200)
    const vieja = await pedir({
      method: "PUT",
      url: urlForo(e.claseId, id),
      token: e.tokenMaestro,
      payload: cuerpoDeForo({ titulo: "Segunda", version: 0 }),
    })
    expect(vieja.statusCode).toBe(409)
    expect(codigoDe(vieja)).toBe("TAREA_MODIFICADA")
    expect(mensajeDe(vieja)).toBe(
      "Otra persona guardó cambios en este foro mientras lo editabas. Tus cambios no se guardaron: vuelve a hacerlos sobre la versión actual.",
    )
    const fila = await obtenerDb().publicacion.findUnique({
      where: { id },
      select: { titulo: true },
    })
    expect(fila?.titulo).toBe("Primera")
    expect(await versionDe(id)).toBe(1)
  })

  it("FORO-1A21: mover la fecha cancela el recordatorio y crea otro, en la misma transacción", async () => {
    const e = await escenario()
    const id = idDelForo(await crear(e, cuerpoDeForo()))
    const antes = await trabajosDeTarea(COLA_RECORDATORIO_24H, id)
    expect(antes).toHaveLength(1)
    const nueva = new Date(Date.now() + 9 * 24 * HORA_MS)
    const respuesta = await pedir({
      method: "PUT",
      url: urlForo(e.claseId, id),
      token: e.tokenMaestro,
      payload: cuerpoDeForo({ fechaLimite: nueva.toISOString(), version: 0 }),
    })
    expect(respuesta.statusCode, respuesta.body).toBe(200)
    const despues = await trabajosDeTarea(COLA_RECORDATORIO_24H, id)
    expect(despues).toHaveLength(2)
    expect(despues.find((t) => t.id === antes[0]?.id)?.state).toBe("cancelled")
    const vigente = despues.find((t) => t.id !== antes[0]?.id)
    expect(vigente?.state).toBe("created")
    expect(vigente?.start_after.getTime()).toBe(nueva.getTime() - 24 * HORA_MS)
    expect((await leerTareaDb(id))?.trabajoId).toBe(vigente?.id)
  })

  it("FORO-1A21: con una calificada, cambiar los puntos responde 409 TAREA_CON_CALIFICACIONES con el texto del foro", async () => {
    const e = await escenario()
    const id = idDelForo(await crear(e, cuerpoDeForo()))
    await crearEntregaDePrueba({ tareaId: id, alumnoId: e.alumno.id, estado: "calificado" })
    const respuesta = await pedir({
      method: "PUT",
      url: urlForo(e.claseId, id),
      token: e.tokenMaestro,
      payload: cuerpoDeForo({ puntos: 20, version: 0 }),
    })
    expect(respuesta.statusCode).toBe(409)
    expect(codigoDe(respuesta)).toBe("TAREA_CON_CALIFICACIONES")
    expect(mensajeDe(respuesta)).toBe(
      "Este foro ya tiene calificaciones: no puedes cambiar sus puntos ni su rúbrica. Lo demás sí se puede editar.",
    )
    expect((await leerTareaDb(id))?.puntos).toBe(10)
  })

  it("FORO-1A21: con categorías en la clase, crear o editar sin una responde 409 CATEGORIA_REQUERIDA con el texto del foro", async () => {
    const e = await escenario()
    const id = idDelForo(await crear(e, cuerpoDeForo()))
    await crearCategoriaDePrueba({ claseId: e.claseId })
    for (const respuesta of [
      await crear(e, cuerpoDeForo()),
      await pedir({
        method: "PUT",
        url: urlForo(e.claseId, id),
        token: e.tokenMaestro,
        payload: cuerpoDeForo({ version: 0 }),
      }),
    ]) {
      expect(respuesta.statusCode).toBe(409)
      expect(codigoDe(respuesta)).toBe("CATEGORIA_REQUERIDA")
      expect(mensajeDe(respuesta)).toBe("Elige la categoría del foro.")
    }
  })
})

describe("FORO-1A22: borrar un foro", () => {
  it("FORO-1A22: sin participaciones, 204 y cancela el recordatorio y TAREA_CREADA", async () => {
    const e = await escenario()
    const id = idDelForo(await crear(e, cuerpoDeForo()))
    const respuesta = await pedir({
      method: "DELETE",
      url: urlForo(e.claseId, id),
      token: e.tokenMaestro,
    })
    expect(respuesta.statusCode, respuesta.body).toBe(204)
    expect(await obtenerDb().publicacion.findUnique({ where: { id } })).toBeNull()
    expect((await trabajosDeTarea(COLA_RECORDATORIO_24H, id))[0]?.state).toBe("cancelled")
    expect((await trabajosDeTarea(COLA_TAREA_CREADA, id))[0]?.state).toBe("cancelled")
  })

  it("FORO-1A22: con una principal, el maestro recibe 409 TAREA_CON_ENTREGAS con el texto del foro; el admin confirma y se borra en cascada", async () => {
    const e = await escenario()
    const id = idDelForo(await crear(e, cuerpoDeForo()))
    const principal = await pedir({
      method: "POST",
      url: `${urlForo(e.claseId, id)}/participaciones`,
      token: e.tokenAlumno,
      payload: { texto: "Mi participación" },
    })
    expect(principal.statusCode, principal.body).toBe(201)
    await crearParticipacionDePrueba({
      foroId: id,
      autorId: e.otroAlumno.id,
      principalId: principal.json<{ participacion: { id: string } }>().participacion.id,
    })
    const delMaestro = await pedir({
      method: "DELETE",
      url: urlForo(e.claseId, id),
      token: e.tokenMaestro,
    })
    expect(delMaestro.statusCode).toBe(409)
    expect(codigoDe(delMaestro)).toBe("TAREA_CON_ENTREGAS")
    expect(mensajeDe(delMaestro)).toBe(
      "Este foro tiene 1 alumno con participación o calificación y no se puede borrar. Si de verdad hay que borrarlo, pídelo a administración.",
    )
    const sinConfirmar = await pedir({
      method: "DELETE",
      url: urlForo(e.claseId, id),
      token: e.tokenAdmin,
    })
    expect(sinConfirmar.statusCode).toBe(409)
    expect(mensajeDe(sinConfirmar)).toBe(
      "Este foro tiene 1 alumno con participación o calificación. Si lo borras, también se borrarán sus participaciones, sus réplicas y sus calificaciones, y no se puede deshacer.",
    )
    expect(await contarParticipaciones(id)).toBe(2)
    const delAdmin = await pedir({
      method: "DELETE",
      url: `${urlForo(e.claseId, id)}?confirmar=entregas`,
      token: e.tokenAdmin,
    })
    expect(delAdmin.statusCode, delAdmin.body).toBe(204)
    expect(await contarParticipaciones(id)).toBe(0)
    expect(await obtenerDb().entrega.count({ where: { tareaId: id } })).toBe(0)
    expect(await leerTareaDb(id)).toBeNull()
  })
})

describe("FORO-1A23: la autoría del foro sigue la de las tareas (RN-07)", () => {
  it("FORO-1A23: un maestro no edita ni borra el foro del admin ni el de otro maestro que sigue en la clase; sí el de uno que ya no la da; puedeEditar y puedeBorrar en el detalle", async () => {
    const maestra = await crearUsuarioDePrueba(idsUsuarios, { rol: "maestro", nombre: "Maestra A" })
    const maestro = await crearUsuarioDePrueba(idsUsuarios, { rol: "maestro", nombre: "Maestro B" })
    const clase = await crearClaseDePrueba(idsClases, {
      maestroId: maestra.id,
      maestroIds: [maestra.id, maestro.id],
    })
    const tokenA = await firmarTokenDePrueba({ usuarioId: maestra.id })
    const adminId = (await obtenerDb().usuario.findFirst({ where: { rol: "admin" } }))?.id
    if (adminId === undefined) throw new Error("Precondición: el admin de seed:admin existe")
    const delAdmin = await crearForoDePrueba({ claseId: clase.id, autorId: adminId })
    const deB = await crearForoDePrueba({ claseId: clase.id, autorId: maestro.id })

    for (const foroId of [delAdmin, deB]) {
      const detalle = await pedir({ method: "GET", url: urlForo(clase.id, foroId), token: tokenA })
      expect(detalle.statusCode, detalle.body).toBe(200)
      expect(detalle.json()).toMatchObject({ foro: { puedeEditar: false, puedeBorrar: false } })
      const editar = await pedir({
        method: "PUT",
        url: urlForo(clase.id, foroId),
        token: tokenA,
        payload: cuerpoDeForo({ version: 0 }),
      })
      expect(editar.statusCode).toBe(403)
      expect(codigoDe(editar)).toBe("EDICION_NO_PERMITIDA")
      const borrar = await pedir({
        method: "DELETE",
        url: urlForo(clase.id, foroId),
        token: tokenA,
      })
      expect(borrar.statusCode).toBe(403)
      expect(codigoDe(borrar)).toBe("BORRADO_NO_PERMITIDO")
    }

    // El maestro B deja la clase: su foro lo puede corregir y borrar quien sí la da.
    await obtenerDb().maestroDeClase.delete({
      where: { claseId_maestroId: { claseId: clase.id, maestroId: maestro.id } },
    })
    const detalle = await pedir({ method: "GET", url: urlForo(clase.id, deB), token: tokenA })
    expect(detalle.json()).toMatchObject({ foro: { puedeEditar: true, puedeBorrar: true } })
    const editar = await pedir({
      method: "PUT",
      url: urlForo(clase.id, deB),
      token: tokenA,
      payload: cuerpoDeForo({ titulo: "Corregido", version: 0 }),
    })
    expect(editar.statusCode, editar.body).toBe(200)
    const borrar = await pedir({ method: "DELETE", url: urlForo(clase.id, deB), token: tokenA })
    expect(borrar.statusCode).toBe(204)
  })
})

describe("FORO-1A24: la lista de foros de la clase", () => {
  it("FORO-1A24: del más reciente al más antiguo, con cursor, con el conteo de principales y la entrega solo para el alumno", async () => {
    const e = await escenario()
    const base = Date.now() - 10 * HORA_MS
    const ids = await Promise.all(
      [0, 1, 2].map((i) =>
        crearForoDePrueba({
          claseId: e.claseId,
          autorId: e.maestro.id,
          titulo: `Foro ${String(i)}`,
          creadoEn: new Date(base + i * HORA_MS),
        }),
      ),
    )
    const [f0, f1, f2] = ids
    if (f0 === undefined || f1 === undefined || f2 === undefined) throw new Error("Precondición")
    // Una tarea y un anuncio de la clase no salen en la lista.
    await crearTareaDePrueba({ claseId: e.claseId, autorId: e.maestro.id })
    await crearPublicacionDePrueba({ claseId: e.claseId, autorId: e.maestro.id })
    const principal = await crearParticipacionDePrueba({ foroId: f2, autorId: e.alumno.id })
    await crearParticipacionDePrueba({ foroId: f2, autorId: e.otroAlumno.id })
    await crearParticipacionDePrueba({
      foroId: f2,
      autorId: e.otroAlumno.id,
      principalId: principal,
    })
    await crearEntregaDePrueba({ tareaId: f2, alumnoId: e.alumno.id, conRetraso: true })

    const primera = await pedir({
      method: "GET",
      url: `${urlForos(e.claseId)}?limite=2`,
      token: e.tokenAlumno,
    })
    expect(primera.statusCode, primera.body).toBe(200)
    const pagina = listaForosRespuestaSchema.parse(primera.json())
    expect(pagina.foros.map((foro) => foro.id)).toEqual([f2, f1])
    expect(pagina.foros[0]).toMatchObject({
      participaciones: 2,
      entrega: { estado: "entregado", conRetraso: true },
    })
    expect(pagina.foros[1]).toMatchObject({ participaciones: 0, entrega: null })
    expect(pagina.siguienteCursor).toBe(f1)
    const segunda = await pedir({
      method: "GET",
      url: `${urlForos(e.claseId)}?limite=2&cursor=${f1}`,
      token: e.tokenAlumno,
    })
    expect(listaForosRespuestaSchema.parse(segunda.json())).toMatchObject({
      foros: [{ id: f0 }],
      siguienteCursor: null,
    })

    const delMaestro = listaForosRespuestaSchema.parse(
      (await pedir({ method: "GET", url: urlForos(e.claseId), token: e.tokenMaestro })).json(),
    )
    expect(delMaestro.foros.map((foro) => foro.entrega)).toEqual([null, null, null])
  })

  it("FORO-1A24: un foro de otra clase, una tarea o un anuncio como cursor responden 400 VALIDACION", async () => {
    const e = await escenario()
    const otra = await escenario()
    await crearForoDePrueba({ claseId: e.claseId, autorId: e.maestro.id })
    const ajeno = await crearForoDePrueba({ claseId: otra.claseId, autorId: otra.maestro.id })
    const tarea = await crearTareaDePrueba({ claseId: e.claseId, autorId: e.maestro.id })
    const anuncio = await crearPublicacionDePrueba({ claseId: e.claseId, autorId: e.maestro.id })
    for (const cursor of [ajeno, tarea, anuncio]) {
      const respuesta = await pedir({
        method: "GET",
        url: `${urlForos(e.claseId)}?cursor=${cursor}`,
        token: e.tokenMaestro,
      })
      expect(respuesta.statusCode).toBe(400)
      expect(codigoDe(respuesta)).toBe("VALIDACION")
    }
  })
})

describe("FORO-1A26: el muro no trae foros", () => {
  it("FORO-1A26: la lista del muro sin tipo no devuelve foros ni acepta uno como cursor; con tipo=anuncio, igual", async () => {
    const e = await escenario()
    const anuncio = await crearPublicacionDePrueba({ claseId: e.claseId, autorId: e.maestro.id })
    const foro = await crearForoDePrueba({ claseId: e.claseId, autorId: e.maestro.id })
    const tarea = await crearTareaDePrueba({ claseId: e.claseId, autorId: e.maestro.id })
    const url = `/api/clases/${e.claseId}/publicaciones`
    const sinTipo = await pedir({ method: "GET", url, token: e.tokenAlumno })
    expect(sinTipo.statusCode, sinTipo.body).toBe(200)
    const ids = sinTipo.json<{ publicaciones: { id: string }[] }>().publicaciones.map((p) => p.id)
    expect(ids.sort()).toEqual([anuncio, tarea].sort())
    const conTipo = await pedir({ method: "GET", url: `${url}?tipo=anuncio`, token: e.tokenAlumno })
    expect(
      conTipo.json<{ publicaciones: { id: string }[] }>().publicaciones.map((p) => p.id),
    ).toEqual([anuncio])
    for (const consulta of [`?cursor=${foro}`, `?tipo=anuncio&cursor=${foro}`]) {
      const respuesta = await pedir({
        method: "GET",
        url: `${url}${consulta}`,
        token: e.tokenAlumno,
      })
      expect(respuesta.statusCode).toBe(400)
      expect(codigoDe(respuesta)).toBe("VALIDACION")
    }
    expect(ids).not.toContain(foro)
  })
})
