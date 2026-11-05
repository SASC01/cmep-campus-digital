import { randomUUID } from "node:crypto"

import {
  claseRespuestaSchema,
  listaCategoriasRespuestaSchema,
  listaRecursosRespuestaSchema,
} from "@campus/shared"
import type { FastifyInstance, LightMyRequestResponse } from "fastify"
import { pino } from "pino"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { obtenerDb } from "../src/adapters/db/cliente.js"
import { construirApp } from "../src/app.js"
import { cargarEnv } from "../src/config/env.js"
import { procesarBorradoDeObjetos, procesarCopiaDeObjetos } from "../src/workers/objetos.js"
import { crearAlmacenEnMemoria } from "./almacen-en-memoria.js"
import { borrarUsuariosDePrueba, firmarTokenDePrueba, type UsuarioDePrueba } from "./ayudas-auth.js"
import {
  fotoDeLaClase,
  terminarCopiasDePrueba,
  trabajosDeBorradoCon,
  trabajosDeCopiaCon,
} from "./ayudas-borrado-duplicado.js"
import { archivarClaseDePrueba, codigoDeError, pedirComo } from "./ayudas-clases-archivadas.js"
import {
  borrarMovimientosYClasesDePrueba,
  crearAlumnoDePrueba,
  crearArchivoDePrueba,
  crearClaseDePrueba,
  crearComentarioDePrueba,
  crearPublicacionDePrueba,
  idDelAdminDePrueba,
  inscribirDePrueba,
  tokenDelAdminDePrueba,
} from "./ayudas-clases.js"
import { formadasDetrasDe } from "./ayudas-concurrencia.js"
import { crearDudaDePrueba } from "./ayudas-dudas.js"
import {
  crearCategoriaDePrueba,
  crearMaterialConTemaDePrueba,
  crearTareaDePrueba,
  crearTemaDePrueba,
} from "./ayudas-tareas.js"
import { crearObjetosEnMemoria, type ObjetosEnMemoria } from "./objetos-en-memoria.js"

// ADMIN-01b (§D-5): duplicar una clase, la descarga de una copia en curso y los descartes de M-02.
// ADM-1B08 a ADM-1B10, ADM-1B13, ADM-1B17 a ADM-1B20 y ADM-1B24. El worker de copias y el de borrado
// se llaman directo (procesarCopiaDeObjetos, procesarBorradoDeObjetos): ninguna prueba registra un
// consumidor de las colas reales, que competiría con otros archivos (N-29). Todas las clases nacen
// con uno o dos maestros (N-18). Los archivos los sube el maestro de la clase, nunca el admin único:
// otras pruebas cuentan las filas que sube el admin (archivos-d-r1.ataque) y correrían a la vez.

let app: FastifyInstance | undefined
const idsUsuarios: string[] = []
const idsClases: string[] = []
let tokenAdmin = ""
let idAdmin = ""
const almacen = crearAlmacenEnMemoria()
const log = pino({ level: "silent" })

const obtenerApp = (): FastifyInstance => {
  if (!app) throw new Error("La aplicación no se construyó en beforeAll")
  return app
}

const ficha = (): string => randomUUID().slice(0, 8)
const maestroDePrueba = (opciones: { activo?: boolean } = {}) =>
  personaDePrueba({ rol: "maestro", ...opciones })
const personaDePrueba = (opciones: { rol?: "maestro" | "estudiante"; activo?: boolean }) =>
  crearAlumnoDePrueba(idsUsuarios, { nombre: `Persona ${ficha()}`, ...opciones })
const tokenDe = (usuario: UsuarioDePrueba): Promise<string> =>
  firmarTokenDePrueba({ usuarioId: usuario.id })

const pedir = (
  method: "GET" | "POST" | "PUT" | "DELETE",
  url: string,
  token: string,
  payload?: object,
) =>
  pedirComo(obtenerApp(), {
    method,
    url,
    token,
    ...(payload === undefined ? {} : { payload }),
  })

const duplicar = (claseId: string, cuerpo: object) =>
  pedir("POST", `/api/admin/clases/${claseId}/duplicar`, tokenAdmin, cuerpo)

const idDeLaCopia = (respuesta: LightMyRequestResponse): string => {
  expect(respuesta.statusCode, respuesta.body).toBe(201)
  const { clase } = claseRespuestaSchema.parse(respuesta.json())
  idsClases.push(clase.id)
  return clase.id
}

// El trabajo de COPIAR_OBJETOS que lleva estos archivos, procesado directo con el almacén dado.
const correrCopias = async (archivoIds: readonly string[], objetos: ObjetosEnMemoria) => {
  const trabajos = await trabajosDeCopiaCon(archivoIds)
  expect(trabajos.length, "Precondición: el duplicado encoló su trabajo de copia").toBeGreaterThan(
    0,
  )
  for (const trabajo of trabajos) {
    await procesarCopiaDeObjetos(
      { id: trabajo.id, datos: trabajo.datos },
      { almacenDeObjetos: objetos, log },
    )
  }
}

const archivosDe = (claseId: string) =>
  obtenerDb().archivo.findMany({ where: { claseId }, orderBy: { creadoEn: "asc" } })

beforeAll(async () => {
  app = await construirApp({ env: cargarEnv(), almacen })
  await app.ready()
  tokenAdmin = await tokenDelAdminDePrueba()
  idAdmin = await idDelAdminDePrueba()
})

afterAll(async () => {
  await terminarCopiasDePrueba(idsClases)
  await borrarMovimientosYClasesDePrueba(idsClases)
  await borrarUsuariosDePrueba(idsUsuarios)
  await app?.close()
})

// La original de ADM-1B08: lo que se copia y lo que no.
const originalCompleta = async () => {
  const db = obtenerDb()
  const maestro = await maestroDePrueba()
  const alumno = await personaDePrueba({})
  const clase = await crearClaseDePrueba(idsClases, {
    maestroId: maestro.id,
    nombre: `Original ${ficha()}`,
    descripcion: "Descripción de la original",
  })
  await inscribirDePrueba(clase.id, alumno.id)
  await db.movimientoInscripcion.create({
    data: { claseId: clase.id, alumnoId: alumno.id, actorId: maestro.id, tipo: "alta" },
    select: { id: true },
  })
  const temaA = await crearTemaDePrueba({ claseId: clase.id, nombre: "Unidad 1", orden: 0 })
  const temaB = await crearTemaDePrueba({ claseId: clase.id, nombre: "Unidad 3", orden: 4 })
  await crearCategoriaDePrueba({ claseId: clase.id, nombre: "Tareas", peso: 40 })
  await crearCategoriaDePrueba({ claseId: clase.id, nombre: "Examen", peso: 60 })

  const conTema = await crearMaterialConTemaDePrueba({
    claseId: clase.id,
    autorId: idAdmin,
    temaId: temaB.id,
    titulo: "Guía con tema",
    texto: "Lee la guía",
    bloque: "aprendizaje",
  })
  const sinTemaNulo = await crearMaterialConTemaDePrueba({
    claseId: clase.id,
    autorId: idAdmin,
    titulo: "Antiguo del admin",
  })
  const docente = await crearMaterialConTemaDePrueba({
    claseId: clase.id,
    autorId: maestro.id,
    titulo: "Del docente",
    bloque: "docente",
  })
  const nuloDelMaestro = await crearMaterialConTemaDePrueba({
    claseId: clase.id,
    autorId: maestro.id,
    titulo: "Antiguo del maestro",
  })
  const anuncio = await crearPublicacionDePrueba({ claseId: clase.id, autorId: idAdmin })
  await crearTareaDePrueba({ claseId: clase.id, autorId: maestro.id, temaId: temaA.id })
  await crearComentarioDePrueba({ publicacionId: conTema, autorId: alumno.id })
  await crearComentarioDePrueba({ publicacionId: anuncio, autorId: alumno.id })
  await crearDudaDePrueba({ claseId: clase.id, autorId: alumno.id })

  const subir = async (publicacionId: string | undefined, estado: "confirmado" | "pendiente") => {
    const archivo = await crearArchivoDePrueba({
      claseId: clase.id,
      subidoPor: maestro.id,
      estado,
      ...(publicacionId === undefined ? {} : { publicacionId }),
    })
    return archivo
  }
  const deConTema = await subir(conTema, "confirmado")
  const deSinTema = await subir(sinTemaNulo, "confirmado")
  const delDocente = await subir(docente, "confirmado")
  const delNuloMaestro = await subir(nuloDelMaestro, "confirmado")
  const pendiente = await subir(undefined, "pendiente")
  return {
    maestro,
    alumno,
    clase,
    temas: { temaA, temaB },
    recursos: { conTema, sinTemaNulo, docente, nuloDelMaestro, anuncio },
    archivos: { deConTema, deSinTema, delDocente, delNuloMaestro, pendiente },
  }
}

describe("duplicar (ADM-1B08, ADM-1B09)", () => {
  it("ADM-1B08: copia nombre, descripción, temas, categorías, recursos de aprendizaje con sus archivos (copia_de = original); no copia maestros, alumnos, movimientos, anuncios, tareas, recursos del docente, comentarios, dudas ni calificaciones; nace activa con otro código, también desde una archivada; encola COPIAR_OBJETOS", async () => {
    const db = obtenerDb()
    const o = await originalCompleta()
    await archivarClaseDePrueba(o.clase.id)
    const elegido = await maestroDePrueba()
    const otroElegido = await maestroDePrueba()

    const respuesta = await duplicar(o.clase.id, {
      nombre: "  Copia de prueba  ",
      maestroIds: [elegido.id, otroElegido.id],
    })
    const copiaId = idDeLaCopia(respuesta)
    const { clase } = claseRespuestaSchema.parse(respuesta.json())
    expect(clase.nombre).toBe("Copia de prueba")
    expect(clase.descripcion).toBe("Descripción de la original")
    expect(clase.archivadaEn).toBeNull()
    expect(clase.maestros.map((m) => m.id).sort()).toEqual([elegido.id, otroElegido.id].sort())

    const filaCopia = await db.clase.findUniqueOrThrow({ where: { id: copiaId } })
    const filaOriginal = await db.clase.findUniqueOrThrow({ where: { id: o.clase.id } })
    expect(filaCopia.activa).toBe(true)
    expect(filaCopia.archivadaEn).toBeNull()
    expect(filaCopia.codigoInvitacion).not.toBe(filaOriginal.codigoInvitacion)
    expect(filaOriginal.archivadaEn).not.toBeNull()

    const foto = await fotoDeLaClase(copiaId)
    expect(foto).toMatchObject({
      maestros: 2,
      inscripciones: 0,
      movimientos: 0,
      temas: 2,
      categorias: 2,
      publicaciones: 2,
      tareas: 0,
      entregas: 0,
      comentarios: 0,
      dudas: 0,
      archivos: 2,
    })
    expect(
      (await db.tema.findMany({ where: { claseId: copiaId }, orderBy: { orden: "asc" } })).map(
        ({ nombre, orden }) => ({ nombre, orden }),
      ),
    ).toEqual([
      { nombre: "Unidad 1", orden: 0 },
      { nombre: "Unidad 3", orden: 4 },
    ])
    expect(
      (
        await db.categoria.findMany({
          where: { claseId: copiaId },
          orderBy: [{ creadoEn: "asc" }, { id: "asc" }],
        })
      ).map(({ nombre, peso }) => ({ nombre, peso })),
    ).toEqual([
      { nombre: "Tareas", peso: 40 },
      { nombre: "Examen", peso: 60 },
    ])

    const recursos = await db.publicacion.findMany({
      where: { claseId: copiaId },
      include: { tema: true },
      orderBy: { titulo: "asc" },
    })
    expect(
      recursos.map((r) => ({
        titulo: r.titulo,
        texto: r.texto,
        tipo: r.tipo,
        bloque: r.bloque,
        version: r.version,
        autorId: r.autorId,
        tema: r.tema?.nombre ?? null,
        temaDeLaCopia: r.tema === null ? null : r.tema.claseId === copiaId,
      })),
    ).toEqual([
      {
        titulo: "Antiguo del admin",
        texto: "Texto de prueba",
        tipo: "material",
        bloque: "aprendizaje",
        version: 0,
        autorId: idAdmin,
        tema: null,
        temaDeLaCopia: null,
      },
      {
        titulo: "Guía con tema",
        texto: "Lee la guía",
        tipo: "material",
        bloque: "aprendizaje",
        version: 0,
        autorId: idAdmin,
        tema: "Unidad 3",
        temaDeLaCopia: true,
      },
    ])

    const archivos = await archivosDe(copiaId)
    expect(archivos.map((a) => a.copiaDe).sort()).toEqual(
      [o.archivos.deConTema.id, o.archivos.deSinTema.id].sort(),
    )
    for (const archivo of archivos) {
      expect(archivo.estado).toBe("confirmado")
      expect(archivo.claveObjeto).toBe(`materiales/${copiaId}/${archivo.id}`)
      expect(recursos.map((r) => r.id)).toContain(archivo.publicacionId)
    }

    const trabajos = await trabajosDeCopiaCon(archivos.map((a) => a.id))
    expect(trabajos).toHaveLength(1)
    expect(((trabajos[0]?.datos.archivoIds ?? []) as string[]).sort()).toEqual(
      archivos.map((a) => a.id).sort(),
    )
  })

  it("ADM-1B08 (lotes): 101 archivos de recursos de aprendizaje se copian en dos trabajos de COPIAR_OBJETOS, de 100 y de 1", async () => {
    const maestro = await maestroDePrueba()
    const clase = await crearClaseDePrueba(idsClases, { maestroId: maestro.id })
    const recursoId = await crearMaterialConTemaDePrueba({
      claseId: clase.id,
      autorId: idAdmin,
      bloque: "aprendizaje",
    })
    await obtenerDb().archivo.createMany({
      data: Array.from({ length: 101 }, () => {
        const id = randomUUID()
        return {
          id,
          claveObjeto: `materiales/${clase.id}/${id}`,
          nombre: "a.pdf",
          tipo: "application/pdf",
          tamano: 1,
          subidoPor: maestro.id,
          claseId: clase.id,
          publicacionId: recursoId,
          estado: "confirmado" as const,
        }
      }),
    })
    const copiaId = idDeLaCopia(
      await duplicar(clase.id, { nombre: "Copia en lotes", maestroIds: [maestro.id] }),
    )
    const ids = (await archivosDe(copiaId)).map((a) => a.id)
    expect(ids).toHaveLength(101)
    const trabajos = await trabajosDeCopiaCon(ids)
    expect(
      trabajos.map((t) => (t.datos.archivoIds as string[]).length).sort((a, b) => a - b),
    ).toEqual([1, 100])
    expect(trabajos.flatMap((t) => t.datos.archivoIds as string[]).sort()).toEqual([...ids].sort())
  })

  it("ADM-1B09: 0, 3 o repetidos en maestroIds y un nombre inválido → 400; un maestro inactivo o un estudiante → 404 MAESTRO_NO_ENCONTRADO; nada creado", async () => {
    const db = obtenerDb()
    const maestro = await maestroDePrueba()
    const otro = await maestroDePrueba()
    const tercero = await maestroDePrueba()
    const inactivo = await maestroDePrueba({ activo: false })
    const estudiante = await personaDePrueba({})
    const clase = await crearClaseDePrueba(idsClases, { maestroId: maestro.id })
    const nombre = `Copia rechazada ${ficha()}`

    for (const maestroIds of [
      [],
      [maestro.id, otro.id, tercero.id],
      [maestro.id, maestro.id],
      [maestro.id, maestro.id.toUpperCase()],
    ]) {
      const respuesta = await duplicar(clase.id, { nombre, maestroIds })
      expect(respuesta.statusCode, JSON.stringify(maestroIds)).toBe(400)
      expect(codigoDeError(respuesta)).toBe("VALIDACION")
    }
    for (const invalido of [
      { nombre: "x", maestroIds: [maestro.id] },
      { maestroIds: [maestro.id] },
    ]) {
      const respuesta = await duplicar(clase.id, invalido)
      expect(respuesta.statusCode).toBe(400)
      expect(codigoDeError(respuesta)).toBe("VALIDACION")
    }
    for (const maestroIds of [[inactivo.id], [maestro.id, estudiante.id], [randomUUID()]]) {
      const respuesta = await duplicar(clase.id, { nombre, maestroIds })
      expect(respuesta.statusCode, JSON.stringify(maestroIds)).toBe(404)
      expect(respuesta.json()).toEqual({
        error: { codigo: "MAESTRO_NO_ENCONTRADO", mensaje: "No encontramos a ese maestro." },
      })
    }
    expect(await db.clase.count({ where: { nombre } })).toBe(0)
  })
})

// Retiene la fila de la clase y lanza dos operaciones en orden fijo, cada una formada detrás de la
// fila antes de lanzar la siguiente; suelta la fila y devuelve las dos respuestas.
const enSerieDetrasDeLaClase = async (
  claseId: string,
  primera: () => Promise<LightMyRequestResponse>,
  segunda: () => Promise<LightMyRequestResponse>,
): Promise<[LightMyRequestResponse, LightMyRequestResponse]> => {
  const lanzadas: Promise<LightMyRequestResponse>[] = []
  await obtenerDb().$transaction(
    async (tx) => {
      await tx.$queryRaw`SELECT id FROM clases WHERE id = ${claseId}::uuid FOR UPDATE`
      const [{ pid } = { pid: -1 }] = await tx.$queryRaw<{ pid: number }[]>`
        SELECT pg_backend_pid() AS pid`
      for (const [indice, operacion] of [primera, segunda].entries()) {
        lanzadas.push(operacion())
        let formadas = 0
        for (let intento = 0; intento < 200 && formadas < indice + 1; intento++) {
          formadas = await formadasDetrasDe(pid)
          if (formadas < indice + 1) await new Promise((resolver) => setTimeout(resolver, 50))
        }
        expect(formadas, `Precondición: la operación ${String(indice + 1)} espera la fila`).toBe(
          indice + 1,
        )
      }
    },
    { timeout: 20_000, maxWait: 5_000 },
  )
  const [a, b] = await Promise.all(lanzadas)
  if (a === undefined || b === undefined) throw new Error("Faltan respuestas")
  return [a, b]
}

describe("duplicar y borrar a la vez (ADM-1B10)", () => {
  const preparar = async () => {
    const maestro = await maestroDePrueba()
    const clase = await crearClaseDePrueba(idsClases, { maestroId: maestro.id })
    const recursoId = await crearMaterialConTemaDePrueba({
      claseId: clase.id,
      autorId: idAdmin,
      bloque: "aprendizaje",
    })
    await crearArchivoDePrueba({
      claseId: clase.id,
      subidoPor: maestro.id,
      estado: "confirmado",
      publicacionId: recursoId,
    })
    await archivarClaseDePrueba(clase.id)
    return { maestro, clase }
  }

  it("ADM-1B10: con el borrado primero en la fila: borrado (204) y después el duplicado responde 403, sin copia huérfana", async () => {
    const { maestro, clase } = await preparar()
    const nombre = `Carrera ${ficha()}`
    const [borrado, duplicado] = await enSerieDetrasDeLaClase(
      clase.id,
      () => pedir("DELETE", `/api/admin/clases/${clase.id}?confirmar=borrar`, tokenAdmin),
      () => duplicar(clase.id, { nombre, maestroIds: [maestro.id] }),
    )
    expect(borrado.statusCode, borrado.body).toBe(204)
    expect(duplicado.statusCode, duplicado.body).toBe(403)
    expect(codigoDeError(duplicado)).toBe("SIN_ACCESO_A_LA_CLASE")
    expect(await obtenerDb().clase.count({ where: { nombre } })).toBe(0)
  }, 30_000)

  it("ADM-1B10: con el duplicado primero en la fila: duplicado (201) y después el borrado responde 409 CLASE_CON_COPIAS_EN_CURSO; la original sigue", async () => {
    const { maestro, clase } = await preparar()
    const [duplicado, borrado] = await enSerieDetrasDeLaClase(
      clase.id,
      () => duplicar(clase.id, { nombre: `Carrera ${ficha()}`, maestroIds: [maestro.id] }),
      () => pedir("DELETE", `/api/admin/clases/${clase.id}?confirmar=borrar`, tokenAdmin),
    )
    const copiaId = idDeLaCopia(duplicado)
    expect(borrado.statusCode, borrado.body).toBe(409)
    expect(codigoDeError(borrado)).toBe("CLASE_CON_COPIAS_EN_CURSO")
    expect((await fotoDeLaClase(clase.id)).clase).toBe(1)
    for (const archivo of await archivosDe(copiaId)) {
      expect(
        await obtenerDb().archivo.count({ where: { id: archivo.copiaDe ?? "" } }),
        "la copia apunta a un original que existe",
      ).toBe(1)
    }
  }, 30_000)
})

// Una original activa con un recurso de aprendizaje con un archivo cuyo objeto está en `objetos`.
const originalConUnArchivo = async (objetos: ObjetosEnMemoria) => {
  const maestro = await maestroDePrueba()
  const clase = await crearClaseDePrueba(idsClases, { maestroId: maestro.id })
  const recursoId = await crearMaterialConTemaDePrueba({
    claseId: clase.id,
    autorId: idAdmin,
    titulo: `Recurso ${ficha()}`,
    bloque: "aprendizaje",
  })
  const archivo = await crearArchivoDePrueba({
    claseId: clase.id,
    subidoPor: maestro.id,
    estado: "confirmado",
    publicacionId: recursoId,
  })
  objetos.claves.add(archivo.claveObjeto)
  return { maestro, clase, recursoId, archivo }
}

const duplicarYLeerCopia = async (claseId: string, maestroId: string) => {
  const copiaId = idDeLaCopia(
    await duplicar(claseId, { nombre: `Copia ${ficha()}`, maestroIds: [maestroId] }),
  )
  const [archivo] = await archivosDe(copiaId)
  if (archivo === undefined) throw new Error("Precondición: la copia tiene su archivo")
  return { copiaId, archivo }
}

describe("descarga y descartes de una copia en curso (ADM-1B13, ADM-1B17, ADM-1B18)", () => {
  it("ADM-1B13: la descarga de un archivo con copia en curso → 409 ARCHIVO_EN_COPIA para el maestro y el admin; terminada la copia → 200", async () => {
    const objetos = crearObjetosEnMemoria()
    const o = await originalConUnArchivo(objetos)
    const elegido = await maestroDePrueba()
    const { copiaId, archivo } = await duplicarYLeerCopia(o.clase.id, elegido.id)
    const url = `/api/clases/${copiaId}/archivos/${archivo.id}/descarga`

    for (const token of [await tokenDe(elegido), tokenAdmin]) {
      const respuesta = await pedir("POST", url, token)
      expect(respuesta.statusCode).toBe(409)
      expect(respuesta.json()).toEqual({
        error: {
          codigo: "ARCHIVO_EN_COPIA",
          mensaje: "Este archivo todavía se está copiando. Inténtalo en unos minutos.",
        },
      })
    }

    await correrCopias([archivo.id], objetos)
    const firmadasAntes = almacen.descargasFirmadas.length
    const lista = await pedir("POST", url, await tokenDe(elegido))
    expect(lista.statusCode, lista.body).toBe(200)
    expect(almacen.descargasFirmadas.slice(firmadasAntes).map((d) => d.clave)).toEqual([
      archivo.claveObjeto,
    ])
  })

  it("ADM-1B17: borrar el recurso de la copia con su archivo en copia → 204, el archivo queda descartado sin publicación y con copia_de nulo; el worker después no lo copia ni lo toca", async () => {
    const objetos = crearObjetosEnMemoria()
    const o = await originalConUnArchivo(objetos)
    const { copiaId, archivo } = await duplicarYLeerCopia(o.clase.id, o.maestro.id)
    expect(archivo.copiaDe).toBe(o.archivo.id)

    const respuesta = await pedir(
      "DELETE",
      `/api/clases/${copiaId}/publicaciones/${archivo.publicacionId ?? ""}`,
      tokenAdmin,
    )
    expect(respuesta.statusCode, respuesta.body).toBe(204)
    const despues = await obtenerDb().archivo.findUniqueOrThrow({ where: { id: archivo.id } })
    expect(despues).toMatchObject({ estado: "descartado", publicacionId: null, copiaDe: null })

    await correrCopias([archivo.id], objetos)
    expect(objetos.copias).toEqual([])
    expect(await obtenerDb().archivo.findUniqueOrThrow({ where: { id: archivo.id } })).toEqual(
      despues,
    )
  })

  it("ADM-1B18: editar el recurso de la copia quitándole el adjunto en copia → 200, el mismo resultado que ADM-1B17", async () => {
    const objetos = crearObjetosEnMemoria()
    const o = await originalConUnArchivo(objetos)
    const { copiaId, archivo } = await duplicarYLeerCopia(o.clase.id, o.maestro.id)

    const respuesta = await pedir(
      "PUT",
      `/api/clases/${copiaId}/recursos/${archivo.publicacionId ?? ""}`,
      tokenAdmin,
      { titulo: "Sin adjunto", texto: "", temaId: null, archivoIds: [], version: 0 },
    )
    expect(respuesta.statusCode, respuesta.body).toBe(200)
    const despues = await obtenerDb().archivo.findUniqueOrThrow({ where: { id: archivo.id } })
    expect(despues).toMatchObject({ estado: "descartado", publicacionId: null, copiaDe: null })

    await correrCopias([archivo.id], objetos)
    expect(objetos.copias).toEqual([])
    expect(await obtenerDb().archivo.findUniqueOrThrow({ where: { id: archivo.id } })).toEqual(
      despues,
    )
  })
})

describe("duplicar una copia (ADM-1B19) y el orden (ADM-1B20)", () => {
  it("ADM-1B19: duplicar una clase con copias en curso → 409 CLASE_CON_COPIAS_EN_CURSO sin crear nada; cuando el worker termina, duplicarla funciona y sus copias apuntan a objetos que existen", async () => {
    const objetos = crearObjetosEnMemoria()
    const o = await originalConUnArchivo(objetos)
    const b = await duplicarYLeerCopia(o.clase.id, o.maestro.id)

    const nombre = `Copia de copia ${ficha()}`
    const rechazada = await duplicar(b.copiaId, { nombre, maestroIds: [o.maestro.id] })
    expect(rechazada.statusCode).toBe(409)
    expect(rechazada.json()).toEqual({
      error: {
        codigo: "CLASE_CON_COPIAS_EN_CURSO",
        mensaje:
          "Esta clase tiene archivos que todavía se están copiando. Inténtalo en unos minutos.",
      },
    })
    expect(await obtenerDb().clase.count({ where: { nombre } })).toBe(0)

    await correrCopias([b.archivo.id], objetos)
    expect(objetos.claves.has(b.archivo.claveObjeto)).toBe(true)

    const c = await duplicarYLeerCopia(b.copiaId, o.maestro.id)
    expect(c.archivo.copiaDe).toBe(b.archivo.id)
    await correrCopias([c.archivo.id], objetos)
    expect(objetos.copias.at(-1)).toEqual({
      origen: b.archivo.claveObjeto,
      destino: c.archivo.claveObjeto,
    })
    expect(objetos.claves.has(c.archivo.claveObjeto)).toBe(true)
    expect(
      (await obtenerDb().archivo.findUniqueOrThrow({ where: { id: c.archivo.id } })).copiaDe,
    ).toBeNull()
  })

  it("ADM-1B20: la copia conserva el orden de las categorías (GET …/categorias) y de los recursos de cada tema y de «Sin tema» (GET …/recursos), también con creado_en repetidos en la original", async () => {
    const maestro = await maestroDePrueba()
    const clase = await crearClaseDePrueba(idsClases, { maestroId: maestro.id })
    const mismo = new Date("2026-03-01T10:00:00.000Z")
    for (const [nombre, peso] of [
      ["Cat C", 20],
      ["Cat A", 30],
      ["Cat B", 50],
    ] as const) {
      await crearCategoriaDePrueba({ claseId: clase.id, nombre, peso, creadoEn: mismo })
    }
    const tema = await crearTemaDePrueba({ claseId: clase.id, nombre: "Tema" })
    for (const [i, temaId] of [tema.id, tema.id, tema.id, null, null, null].entries()) {
      await crearMaterialConTemaDePrueba({
        claseId: clase.id,
        autorId: idAdmin,
        temaId,
        titulo: `R${String(i)}`,
        bloque: "aprendizaje",
        creadoEn: i % 3 === 2 ? new Date("2026-03-02T10:00:00.000Z") : mismo,
      })
    }

    const copiaId = idDeLaCopia(
      await duplicar(clase.id, { nombre: "Copia ordenada", maestroIds: [maestro.id] }),
    )
    const temaCopia = await obtenerDb().tema.findFirstOrThrow({ where: { claseId: copiaId } })

    const categorias = async (claseId: string) =>
      listaCategoriasRespuestaSchema
        .parse((await pedir("GET", `/api/clases/${claseId}/categorias`, tokenAdmin)).json())
        .categorias.map((c) => c.nombre)
    expect(await categorias(copiaId)).toEqual(await categorias(clase.id))

    const recursos = async (claseId: string, filtro: string) =>
      listaRecursosRespuestaSchema
        .parse(
          (
            await pedir(
              "GET",
              `/api/clases/${claseId}/recursos?bloque=aprendizaje&tema=${filtro}`,
              tokenAdmin,
            )
          ).json(),
        )
        .recursos.map((r) => r.titulo)
    const delTemaOriginal = await recursos(clase.id, tema.id)
    expect(delTemaOriginal).toHaveLength(3)
    expect(await recursos(copiaId, temaCopia.id)).toEqual(delTemaOriginal)
    const sinTemaOriginal = await recursos(clase.id, "sin-tema")
    expect(sinTemaOriginal).toHaveLength(3)
    expect(await recursos(copiaId, "sin-tema")).toEqual(sinTemaOriginal)
  })
})

describe("borrar la original de una copia (ADM-1B24)", () => {
  it("ADM-1B24: duplicar y después borrar definitivamente la original deja la copia intacta (con la copia en curso el borrado responde 409; terminada, 204; la copia sigue confirmada, con su objeto y su descarga 200; BORRAR_OBJETOS solo lleva las claves de la original)", async () => {
    const db = obtenerDb()
    const objetos = crearObjetosEnMemoria()
    const o = await originalConUnArchivo(objetos)
    const maestroCopia = await maestroDePrueba()
    const tokenMaestroCopia = await tokenDe(maestroCopia)
    const urlOriginal = `/api/admin/clases/${o.clase.id}`

    // (a) Duplicar; antes del worker, archivar y borrar la original → 409 sin borrar nada.
    const { copiaId, archivo } = await duplicarYLeerCopia(o.clase.id, maestroCopia.id)
    expect(archivo.copiaDe, "N-28: la copia apunta al archivo original").toBe(o.archivo.id)
    const trabajosDeCopia = await trabajosDeCopiaCon([archivo.id])
    expect(trabajosDeCopia, "N-28: un solo trabajo de COPIAR_OBJETOS con el archivo").toHaveLength(
      1,
    )

    expect((await pedir("POST", `${urlOriginal}/archivar`, tokenAdmin)).statusCode).toBe(200)
    const enCurso = await pedir("DELETE", `${urlOriginal}?confirmar=borrar`, tokenAdmin)
    expect(enCurso.statusCode).toBe(409)
    expect(codigoDeError(enCurso)).toBe("CLASE_CON_COPIAS_EN_CURSO")
    expect(await db.clase.count({ where: { id: o.clase.id } })).toBe(1)
    expect(await db.publicacion.count({ where: { id: o.recursoId } })).toBe(1)
    expect(await db.archivo.count({ where: { id: o.archivo.id } })).toBe(1)
    expect((await db.archivo.findUniqueOrThrow({ where: { id: archivo.id } })).copiaDe).toBe(
      o.archivo.id,
    )
    expect(await trabajosDeBorradoCon([o.archivo.claveObjeto])).toEqual([])

    // (b) El consumidor de COPIAR_OBJETOS, llamado directo (N-29), con el trabajo del duplicado.
    expect(objetos.claves.has(o.archivo.claveObjeto), "N-30: el objeto original existe").toBe(true)
    const [trabajo] = trabajosDeCopia
    if (trabajo === undefined) throw new Error("Precondición: el trabajo de copia existe")
    await procesarCopiaDeObjetos(
      { id: trabajo.id, datos: trabajo.datos },
      { almacenDeObjetos: objetos, log },
    )
    const terminada = await db.archivo.findUniqueOrThrow({ where: { id: archivo.id } })
    expect(terminada.copiaDe, "Precondición: la copia terminó").toBeNull()
    expect(objetos.claves.has(archivo.claveObjeto), "Precondición: el objeto copiado existe").toBe(
      true,
    )

    // (c) El mismo borrado → 204.
    const clavesOriginal = (await db.archivo.findMany({ where: { claseId: o.clase.id } })).map(
      (a) => a.claveObjeto,
    )
    expect(clavesOriginal.length, "N-30: la original tiene claves que borrar").toBeGreaterThan(0)
    const borrado = await pedir("DELETE", `${urlOriginal}?confirmar=borrar`, tokenAdmin)
    expect(borrado.statusCode, borrado.body).toBe(204)
    expect(await db.clase.count({ where: { id: o.clase.id } })).toBe(0)
    expect(await db.publicacion.count({ where: { id: o.recursoId } })).toBe(0)
    expect(await db.archivo.count({ where: { id: o.archivo.id } })).toBe(0)

    // (d) La copia, intacta.
    const claseCopia = await db.clase.findUniqueOrThrow({ where: { id: copiaId } })
    expect(claseCopia.activa).toBe(true)
    expect(claseCopia.archivadaEn).toBeNull()
    const lista = listaRecursosRespuestaSchema.parse(
      (
        await pedir(
          "GET",
          `/api/clases/${copiaId}/recursos?bloque=aprendizaje&tema=sin-tema`,
          tokenMaestroCopia,
        )
      ).json(),
    )
    const recursoOriginal = await db.publicacion.findMany({
      where: { id: terminada.publicacionId ?? "" },
    })
    expect(recursoOriginal).toHaveLength(1)
    expect(
      lista.recursos.map((r) => ({ titulo: r.titulo, adjuntos: r.adjuntos.map((a) => a.id) })),
    ).toEqual([{ titulo: recursoOriginal[0]?.titulo, adjuntos: [archivo.id] }])
    const filaFinal = await db.archivo.findUniqueOrThrow({ where: { id: archivo.id } })
    expect(filaFinal).toMatchObject({
      estado: "confirmado",
      copiaDe: null,
      publicacionId: terminada.publicacionId,
      claseId: copiaId,
      claveObjeto: archivo.claveObjeto,
    })
    expect(objetos.claves.has(archivo.claveObjeto)).toBe(true)
    const firmadasAntes = almacen.descargasFirmadas.length
    const descarga = await pedir(
      "POST",
      `/api/clases/${copiaId}/archivos/${archivo.id}/descarga`,
      tokenMaestroCopia,
    )
    expect(descarga.statusCode, descarga.body).toBe(200)
    expect(almacen.descargasFirmadas.slice(firmadasAntes).map((d) => d.clave)).toEqual([
      archivo.claveObjeto,
    ])

    // (e) BORRAR_OBJETOS: exactamente las claves de la original, nunca la de la copia; su consumidor
    // (llamado directo, sin esperar su inicio diferido) borra el original y deja la copia.
    const trabajosDeBorrado = await trabajosDeBorradoCon(clavesOriginal)
    expect(trabajosDeBorrado.length, "N-30: hay trabajos de BORRAR_OBJETOS").toBeGreaterThan(0)
    const clavesBorradas = trabajosDeBorrado.flatMap((t) => t.datos.claves as string[])
    expect([...clavesBorradas].sort()).toEqual([...clavesOriginal].sort())
    expect(await trabajosDeBorradoCon([archivo.claveObjeto])).toEqual([])
    for (const t of trabajosDeBorrado) {
      await procesarBorradoDeObjetos(
        { id: t.id, datos: t.datos },
        { almacenDeObjetos: objetos, log },
      )
    }
    expect(objetos.claves.has(o.archivo.claveObjeto)).toBe(false)
    expect(objetos.claves.has(archivo.claveObjeto)).toBe(true)
  })
})
