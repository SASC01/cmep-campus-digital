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
import { borrarUsuariosDePrueba, crearUsuarioDePrueba } from "./ayudas-auth.js"
import {
  borrarMovimientosYClasesDePrueba,
  crearClaseDePrueba,
  inscribirDePrueba,
} from "./ayudas-clases.js"
import { archivarClaseDePrueba } from "./ayudas-clases-archivadas.js"
import { crearEntregaDePrueba } from "./ayudas-entregas.js"
import {
  CLAVES_QUE_NUNCA_SALEN,
  clavesDe,
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

// Ataque FORO-01b, ronda 1 (tester). Punto 3 (el borrado, estado por estado, con las vistas después
// de cada paso: los cinco filtros de "Mis calificaciones", la lista de foros, "Participantes", el
// gradebook y la exportación), punto 2 (puedeBorrar y las llaves exactas, también en una archivada) y
// lo que nadie más que el admin borra, con ids cruzados.

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
  // Con la fila de la entrega ya creada (por ejemplo, tras borrar su principal), la lista de foros
  // trae { asignado } en lugar de null (§D-3.2: null solo sin fila).
  conFila?: boolean
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
    const exportada = exportacion.alumnos.find((a) => a.alumno.id === alumnoId)
    let vencidas = 0
    let obtenidos = 0
    let posibles = 0
    for (const foro of foros) {
      const x = de(alumnoId, foro.id)
      const celda = {
        tareaId: foro.id,
        estado: x.estado,
        conRetraso: x.conRetraso,
        calificacion: x.calificacion,
      }
      expect(
        fila?.celdas[gradebook.tareas.findIndex((t) => t.id === foro.id)],
        `${paso}: gradebook ${alumnoId} ${foro.id}`,
      ).toEqual(celda)
      expect(
        exportada?.celdas[exportacion.tareas.findIndex((t) => t.id === foro.id)],
        `${paso}: exportación ${alumnoId} ${foro.id}`,
      ).toEqual(celda)
      if (x.estado === "asignado" && foro.vencido) vencidas += 1
      if (x.calificacion !== null) {
        obtenidos += x.calificacion
        posibles += 10
      }
    }
    const porcentaje = posibles === 0 ? null : (obtenidos / posibles) * 100
    expect(fila?.vencidasSinEntregar, `${paso}: vencidas de ${alumnoId}`).toBe(vencidas)
    expect(fila?.porcentaje, `${paso}: porcentaje de ${alumnoId}`).toBe(porcentaje)
    expect(exportada?.porcentaje, `${paso}: porcentaje exportado de ${alumnoId}`).toBe(porcentaje)

    const filtrar = (condicion: (x: Esperada, vencido: boolean) => boolean) =>
      foros
        .filter((foro) => condicion(de(alumnoId, foro.id), foro.vencido))
        .map((foro) => foro.id)
        .sort()
    const porFiltro: Record<string, string[]> = {
      todas: filtrar(() => true),
      asignadas: filtrar((x, vencido) => x.estado === "asignado" && !vencido),
      "sin-entregar": filtrar((x, vencido) => x.estado === "asignado" && vencido),
      entregadas: filtrar((x) => x.estado === "entregado"),
      calificadas: filtrar((x) => x.estado === "calificado"),
    }
    for (const [filtro, ids] of Object.entries(porFiltro)) {
      const mis = misCalificacionesRespuestaSchema.parse(
        await leerJson(`/api/clases/${e.claseId}/mis-calificaciones?estado=${filtro}`, token),
      )
      expect(mis.tareas.map((t) => t.id).sort(), `${paso}: ${filtro} de ${alumnoId}`).toEqual(ids)
      for (const tarea of mis.tareas) {
        const x = de(alumnoId, tarea.id)
        expect(tarea.entrega, `${paso}: ${filtro} ${tarea.id}`).toEqual({
          estado: x.estado,
          conRetraso: x.conRetraso,
          calificacion: x.calificacion,
        })
      }
    }
    const lista = listaForosRespuestaSchema.parse(await leerJson(urlForos(e.claseId), token))
    for (const foro of foros) {
      const x = de(alumnoId, foro.id)
      const elemento = lista.foros.find((f) => f.id === foro.id)
      expect(elemento?.entrega, `${paso}: lista de foros ${alumnoId} ${foro.id}`).toEqual(
        x.estado === "asignado" && x.conFila !== true
          ? null
          : { estado: x.estado, conRetraso: x.conRetraso },
      )
      const principales = await obtenerDb().participacionForo.count({
        where: { foroId: foro.id, principalId: null },
      })
      expect(elemento?.participaciones, `${paso}: conteo de ${foro.id}`).toBe(principales)
    }
  }
  for (const foro of foros) {
    const participantes = listaEntregasRespuestaSchema.parse(
      await leerJson(`${urlForo(e.claseId, foro.id)}/participantes`, e.tokenMaestro),
    )
    let entregadas = 0
    for (const { id: alumnoId } of alumnos) {
      const x = de(alumnoId, foro.id)
      if (x.conFecha) entregadas += 1
      const fila = participantes.entregas.find((f) => f.alumno.id === alumnoId)
      expect(
        {
          estado: fila?.estado,
          conRetraso: fila?.conRetraso,
          conFecha: fila?.fechaEntrega !== null,
        },
        `${paso}: participantes ${alumnoId} ${foro.id}`,
      ).toEqual({ estado: x.estado, conRetraso: x.conRetraso, conFecha: x.conFecha })
    }
    expect(participantes.entregadas, `${paso}: entregadas de ${foro.id}`).toBe(entregadas)
  }
}

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

const borrar = async (e: EscenarioDeForo, foroId: string, participacionId: string) => {
  const respuesta = await pedir({
    method: "DELETE",
    url: `${urlForo(e.claseId, foroId)}/participaciones/${participacionId}`,
    token: e.tokenAdmin,
  })
  expect(respuesta.statusCode, respuesta.body).toBe(204)
}

const calificar = async (
  e: EscenarioDeForo,
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

describe("ataque FORO-01b r1 · punto 3: el borrado del admin, estado por estado, con las vistas", () => {
  it("ATQ-FORO-70: borrar principales a tiempo, tardías, de un foro cerrado y calificadas, volver a publicar y calificar a quien quedó sin participar dejan coherentes, después de cada paso, el gradebook, la exportación, los cinco filtros, la lista de foros (con su conteo) y Participantes", async () => {
    const e = await crearEscenarioDeForo(idsUsuarios, idsClases)
    const pasada = new Date(Date.now() - 3 * HORA_MS)
    const abierto = await crearForoDePrueba({
      claseId: e.claseId,
      autorId: e.maestro.id,
      titulo: "Abierto",
      fechaLimite: new Date(Date.now() + 5 * 24 * HORA_MS),
    })
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
    const foros = [
      { id: abierto, vencido: false },
      { id: conTardias, vencido: true },
      { id: cerrado, vencido: true },
    ]
    const X = e.alumno.id
    const Y = e.otroAlumno.id
    const esperado: Record<string, Record<string, Esperada>> = { [X]: {}, [Y]: {} }
    const fija = (alumnoId: string, foroId: string, valor: Esperada) => {
      esperado[alumnoId] = { ...esperado[alumnoId], [foroId]: valor }
    }

    const xAbierto = await publicarId(e, abierto, e.tokenAlumno)
    const xTarde = await publicarId(e, conTardias, e.tokenAlumno)
    const yAbierto = await publicarId(e, abierto, e.tokenOtroAlumno)
    // El foro cerrado no deja publicar: la principal de X se siembra como si hubiera llegado a tiempo.
    const xCerrado = await crearParticipacionDePrueba({ foroId: cerrado, autorId: X })
    await crearEntregaDePrueba({ tareaId: cerrado, alumnoId: X, fechaEntrega: pasada })
    fija(X, abierto, { estado: "entregado", conRetraso: false, calificacion: null, conFecha: true })
    fija(X, conTardias, {
      estado: "entregado",
      conRetraso: true,
      calificacion: null,
      conFecha: true,
    })
    fija(X, cerrado, { estado: "entregado", conRetraso: false, calificacion: null, conFecha: true })
    fija(Y, abierto, { estado: "entregado", conRetraso: false, calificacion: null, conFecha: true })
    await revisarVistas(e, foros, esperado, "1, publicadas")

    await calificar(e, abierto, Y, 1, 8)
    fija(Y, abierto, { estado: "calificado", conRetraso: false, calificacion: 8, conFecha: true })
    await revisarVistas(e, foros, esperado, "2, Y calificado")

    await borrar(e, abierto, xAbierto)
    fija(X, abierto, { ...ASIGNADA, conFila: true })
    await revisarVistas(e, foros, esperado, "3, borrada la de X a tiempo")

    await borrar(e, conTardias, xTarde)
    fija(X, conTardias, { ...ASIGNADA, conFila: true })
    await revisarVistas(e, foros, esperado, "4, borrada la tardía de X")

    await borrar(e, cerrado, xCerrado)
    fija(X, cerrado, { ...ASIGNADA, conFila: true })
    await revisarVistas(e, foros, esperado, "5, borrada la de X en el foro cerrado")

    await borrar(e, abierto, yAbierto)
    await revisarVistas(e, foros, esperado, "6, borrada la calificada de Y (se conserva)")

    await publicarId(e, abierto, e.tokenAlumno)
    fija(X, abierto, { estado: "entregado", conRetraso: false, calificacion: null, conFecha: true })
    await publicarId(e, conTardias, e.tokenAlumno)
    fija(X, conTardias, {
      estado: "entregado",
      conRetraso: true,
      calificacion: null,
      conFecha: true,
    })
    const enCerrado = await publicar(e, cerrado, e.tokenAlumno)
    expect(enCerrado.statusCode).toBe(409)
    expect(codigoDe(enCerrado)).toBe("FORO_CERRADO")
    await revisarVistas(e, foros, esperado, "7, X vuelve a publicar")

    await calificar(e, cerrado, X, 2, 4)
    fija(X, cerrado, { estado: "calificado", conRetraso: false, calificacion: 4, conFecha: false })
    await revisarVistas(e, foros, esperado, "8, X calificado sin participar en el cerrado")

    const yDeNuevo = await publicar(e, abierto, e.tokenOtroAlumno)
    expect(yDeNuevo.statusCode).toBe(409)
    expect(codigoDe(yDeNuevo)).toBe("PARTICIPACION_YA_PUBLICADA")
    const principalDeX = await obtenerDb().participacionForo.findFirst({
      where: { foroId: abierto, autorId: X, principalId: null },
      select: { id: true },
    })
    if (principalDeX === null) throw new Error("Precondición: X tiene principal en el abierto")
    const replicaDeY = await pedir({
      method: "POST",
      url: `${urlForo(e.claseId, abierto)}/participaciones/${principalDeX.id}/replicas`,
      token: e.tokenOtroAlumno,
      payload: { texto: "Réplica de Y" },
    })
    expect(replicaDeY.statusCode, replicaDeY.body).toBe(201)
    await revisarVistas(e, foros, esperado, "9, Y no vuelve a publicar y sí replica")
  }, 120_000)
})

describe("ataque FORO-01b r1 · punto 2: puedeBorrar y las llaves", () => {
  const LLAVES_PRINCIPAL = ["autor", "creadoEn", "id", "propia", "puedeBorrar", "replicas", "texto"]
  const LLAVES_REPLICA = ["autor", "creadoEn", "id", "propia", "puedeBorrar", "texto"]

  it("ATQ-FORO-71: en las listas 8 y 10, puedeBorrar es true solo para el admin (también en una archivada) y false para el maestro y los alumnos; la 201 de una réplica del alumno y del maestro lo trae en false; las llaves son exactas y nunca hay estado de pago", async () => {
    const e = await crearEscenarioDeForo(idsUsuarios, idsClases)
    await obtenerDb().usuario.updateMany({
      where: { id: { in: [e.alumno.id, e.otroAlumno.id] } },
      data: { estadoPago: "deudor" },
    })
    const foroId = await crearForoDePrueba({ claseId: e.claseId, autorId: e.maestro.id })
    const principalId = await publicarId(e, foroId, e.tokenOtroAlumno)
    for (const token of [e.tokenAlumno, e.tokenMaestro]) {
      const replica = await pedir({
        method: "POST",
        url: `${urlForo(e.claseId, foroId)}/participaciones/${principalId}/replicas`,
        token,
        payload: { texto: "Réplica" },
      })
      expect(replica.statusCode, replica.body).toBe(201)
      const cuerpo = replica.json() as { replica: Record<string, unknown> }
      expect(Object.keys(cuerpo)).toEqual(["replica"])
      expect(cuerpo.replica.puedeBorrar).toBe(false)
      expect(Object.keys(cuerpo.replica).sort()).toEqual([...LLAVES_REPLICA, "conRetraso"].sort())
    }

    const revisar = async (archivada: boolean) => {
      const quienes = archivada
        ? [
            { token: e.tokenMaestro, puede: false, alumno: false },
            { token: e.tokenAdmin, puede: true, alumno: false },
          ]
        : [
            { token: e.tokenAlumno, puede: false, alumno: true },
            { token: e.tokenOtroAlumno, puede: false, alumno: true },
            { token: e.tokenMaestro, puede: false, alumno: false },
            { token: e.tokenAdmin, puede: true, alumno: false },
          ]
      for (const { token, puede, alumno } of quienes) {
        for (const [url, llave, base] of [
          [`${urlForo(e.claseId, foroId)}/participaciones`, "participaciones", LLAVES_PRINCIPAL],
          [
            `${urlForo(e.claseId, foroId)}/participaciones/${principalId}/replicas`,
            "replicas",
            LLAVES_REPLICA,
          ],
        ] as const) {
          const cuerpo = (await leerJson(url, token)) as Record<string, Record<string, unknown>[]>
          const filas = cuerpo[llave] ?? []
          expect(filas.length, url).toBeGreaterThan(0)
          for (const fila of filas) {
            expect(fila.puedeBorrar, `${url} ${String(archivada)}`).toBe(puede)
            const conMarca = !alumno || fila.propia === true
            expect(Object.keys(fila).sort()).toEqual(
              (conMarca ? [...base, "conRetraso"] : [...base]).sort(),
            )
            expect(Object.keys(fila.autor as object).sort()).toEqual([
              "administracion",
              "id",
              "nombre",
            ])
          }
          for (const prohibida of CLAVES_QUE_NUNCA_SALEN) {
            expect(clavesDe(cuerpo)).not.toContain(prohibida)
          }
        }
      }
    }
    await revisar(false)
    await archivarClaseDePrueba(e.claseId)
    await revisar(true)
  }, 60_000)

  it("ATQ-FORO-72: ni el alumno ni el maestro borran su propia réplica (403 del rol); el admin con una réplica de otro foro de la misma clase o con una principal de una clase ajena bajo su foro recibe 404, y nada se borra", async () => {
    const e = await crearEscenarioDeForo(idsUsuarios, idsClases)
    const foroId = await crearForoDePrueba({ claseId: e.claseId, autorId: e.maestro.id })
    const otroForo = await crearForoDePrueba({ claseId: e.claseId, autorId: e.maestro.id })
    const principalId = await publicarId(e, foroId, e.tokenOtroAlumno)
    const replicaDe = async (token: string) => {
      const r = await pedir({
        method: "POST",
        url: `${urlForo(e.claseId, foroId)}/participaciones/${principalId}/replicas`,
        token,
        payload: { texto: "Mía" },
      })
      expect(r.statusCode).toBe(201)
      return (r.json() as { replica: { id: string } }).replica.id
    }
    const delAlumno = await replicaDe(e.tokenAlumno)
    const delMaestro = await replicaDe(e.tokenMaestro)
    for (const [id, token] of [
      [delAlumno, e.tokenAlumno],
      [delMaestro, e.tokenMaestro],
      [principalId, e.tokenOtroAlumno],
    ] as const) {
      const r = await pedir({
        method: "DELETE",
        url: `${urlForo(e.claseId, foroId)}/participaciones/${id}`,
        token,
      })
      expect(r.statusCode, r.body).toBe(403)
      expect(codigoDe(r)).toBe("ROL_NO_PERMITIDO")
    }
    const principalOtroForo = await publicarId(e, otroForo, e.tokenAlumno)
    const replicaOtroForo = await pedir({
      method: "POST",
      url: `${urlForo(e.claseId, otroForo)}/participaciones/${principalOtroForo}/replicas`,
      token: e.tokenOtroAlumno,
      payload: { texto: "Réplica en otro foro" },
    })
    expect(replicaOtroForo.statusCode).toBe(201)
    const replicaOtroForoId = (replicaOtroForo.json() as { replica: { id: string } }).replica.id
    const ajeno = await crearUsuarioDePrueba(idsUsuarios, { nombre: "Alumno De Otra Clase" })
    const otra = await crearClaseDePrueba(idsClases, { maestroId: e.maestro.id })
    await inscribirDePrueba(otra.id, ajeno.id)
    const foroAjeno = await crearForoDePrueba({ claseId: otra.id, autorId: e.maestro.id })
    const principalAjena = await crearParticipacionDePrueba({
      foroId: foroAjeno,
      autorId: ajeno.id,
    })
    for (const id of [replicaOtroForoId, principalOtroForo, principalAjena]) {
      const r = await pedir({
        method: "DELETE",
        url: `${urlForo(e.claseId, foroId)}/participaciones/${id}`,
        token: e.tokenAdmin,
      })
      expect(r.statusCode, r.body).toBe(404)
      expect(codigoDe(r)).toBe("PARTICIPACION_NO_ENCONTRADA")
    }
    const conForoAjeno = await pedir({
      method: "DELETE",
      url: `${urlForo(e.claseId, foroAjeno)}/participaciones/${principalAjena}`,
      token: e.tokenAdmin,
    })
    expect(conForoAjeno.statusCode, conForoAjeno.body).toBe(404)
    expect(codigoDe(conForoAjeno)).toBe("TAREA_NO_ENCONTRADA")
    expect(await obtenerDb().participacionForo.count({ where: { foroId } })).toBe(3)
    expect(await obtenerDb().participacionForo.count({ where: { foroId: otroForo } })).toBe(2)
    expect(await obtenerDb().participacionForo.count({ where: { foroId: foroAjeno } })).toBe(1)
    expect(
      await obtenerDb().entrega.findFirst({
        where: { tareaId: otroForo, alumnoId: e.alumno.id },
        select: { estado: true, version: true },
      }),
    ).toEqual({ estado: "entregado", version: 1 })
  }, 60_000)
})
