import { randomUUID } from "node:crypto"

import { conteoDeBorradoRespuestaSchema } from "@campus/shared"
import type { FastifyInstance } from "fastify"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { obtenerDb } from "../src/adapters/db/cliente.js"
import { construirApp } from "../src/app.js"
import { cargarEnv } from "../src/config/env.js"
import { COLA_RECORDATORIO_24H } from "../src/core/eventos/avisos-de-clase.js"
import { borrarUsuariosDePrueba, firmarTokenDePrueba, type UsuarioDePrueba } from "./ayudas-auth.js"
import {
  fotoDeLaClase,
  terminarCopiasDePrueba,
  trabajosDeBorradoCon,
} from "./ayudas-borrado-duplicado.js"
import { archivarClaseDePrueba, codigoDeError, pedirComo } from "./ayudas-clases-archivadas.js"
import {
  borrarMovimientosYClasesDePrueba,
  crearAlumnoDePrueba,
  crearArchivoDePrueba,
  crearClaseDePrueba,
  crearComentarioDePrueba,
  crearPublicacionDePrueba,
  inscribirDePrueba,
  tokenDelAdminDePrueba,
} from "./ayudas-clases.js"
import { crearDudaDePrueba, crearRespuestaDePrueba } from "./ayudas-dudas.js"
import { crearArchivoDeEntregaDePrueba, crearEntregaDePrueba } from "./ayudas-entregas.js"
import {
  crearCategoriaDePrueba,
  crearCriteriosDePrueba,
  crearMaterialConTemaDePrueba,
  crearTareaDePrueba,
  crearTemaDePrueba,
  cuerpoDeTarea,
  trabajosDeTarea,
} from "./ayudas-tareas.js"

// ADMIN-01b (§D-4): conteo y borrado definitivo de una clase archivada. ADM-1B02 a ADM-1B06 y
// ADM-1B23. Todas las clases de este archivo nacen con un maestro (N-18).

let app: FastifyInstance | undefined
const idsUsuarios: string[] = []
const idsClases: string[] = []
let tokenAdmin = ""

const obtenerApp = (): FastifyInstance => {
  if (!app) throw new Error("La aplicación no se construyó en beforeAll")
  return app
}

const ficha = (): string => randomUUID().slice(0, 8)
const maestroDePrueba = () =>
  crearAlumnoDePrueba(idsUsuarios, { nombre: `Maestro ${ficha()}`, rol: "maestro" })
const estudianteDePrueba = (opciones: { activo?: boolean } = {}) =>
  crearAlumnoDePrueba(idsUsuarios, { nombre: `Estudiante ${ficha()}`, ...opciones })
const tokenDe = (usuario: UsuarioDePrueba): Promise<string> =>
  firmarTokenDePrueba({ usuarioId: usuario.id })

const borrar = (claseId: string, consulta = "?confirmar=borrar") =>
  pedirComo(obtenerApp(), {
    method: "DELETE",
    url: `/api/admin/clases/${claseId}${consulta}`,
    token: tokenAdmin,
  })

const contar = (claseId: string) =>
  pedirComo(obtenerApp(), {
    method: "GET",
    url: `/api/admin/clases/${claseId}/conteo-de-borrado`,
    token: tokenAdmin,
  })

const SIN_FILAS = {
  clase: 0,
  maestros: 0,
  inscripciones: 0,
  movimientos: 0,
  temas: 0,
  categorias: 0,
  publicaciones: 0,
  tareas: 0,
  criterios: 0,
  entregas: 0,
  puntajes: 0,
  comentarios: 0,
  dudas: 0,
  archivos: 0,
}

beforeAll(async () => {
  app = await construirApp({ env: cargarEnv() })
  await app.ready()
  tokenAdmin = await tokenDelAdminDePrueba()
})

afterAll(async () => {
  await terminarCopiasDePrueba(idsClases)
  await borrarMovimientosYClasesDePrueba(idsClases)
  await borrarUsuariosDePrueba(idsUsuarios)
  await app?.close()
})

// Una clase con una fila en cada tabla hija (ADM-1B05), archivada.
const clasePoblada = async () => {
  const db = obtenerDb()
  const maestro = await maestroDePrueba()
  const alumno = await estudianteDePrueba()
  const clase = await crearClaseDePrueba(idsClases, { maestroId: maestro.id })
  await inscribirDePrueba(clase.id, alumno.id)
  await db.movimientoInscripcion.create({
    data: { claseId: clase.id, alumnoId: alumno.id, actorId: maestro.id, tipo: "alta" },
    select: { id: true },
  })
  const tema = await crearTemaDePrueba({ claseId: clase.id })
  const categoria = await crearCategoriaDePrueba({ claseId: clase.id })
  const recursoId = await crearMaterialConTemaDePrueba({
    claseId: clase.id,
    autorId: maestro.id,
    temaId: tema.id,
    bloque: "docente",
  })
  const archivoDePublicacion = await crearArchivoDePrueba({
    claseId: clase.id,
    subidoPor: maestro.id,
    estado: "confirmado",
    publicacionId: recursoId,
  })
  const anuncioId = await crearPublicacionDePrueba({ claseId: clase.id, autorId: maestro.id })
  await crearComentarioDePrueba({ publicacionId: anuncioId, autorId: alumno.id })
  const tareaId = await crearTareaDePrueba({
    claseId: clase.id,
    autorId: maestro.id,
    categoriaId: categoria.id,
    temaId: tema.id,
  })
  await crearCriteriosDePrueba(tareaId, 2)
  const entregaId = await crearEntregaDePrueba({
    tareaId,
    alumnoId: alumno.id,
    estado: "calificado",
    calificacion: 15,
  })
  const criterios = await db.criterioRubrica.findMany({ where: { tareaId }, select: { id: true } })
  await db.puntajeRubrica.createMany({
    data: criterios.map((criterio) => ({ entregaId, criterioId: criterio.id, puntos: 7.5 })),
  })
  await db.comentario.create({
    data: { entregaId, autorId: alumno.id, texto: "Hilo privado" },
    select: { id: true },
  })
  const archivoDeEntrega = await crearArchivoDeEntregaDePrueba({
    claseId: clase.id,
    tareaId,
    alumnoId: alumno.id,
    estado: "confirmado",
    entregaId,
  })
  const dudaId = await crearDudaDePrueba({ claseId: clase.id, autorId: alumno.id })
  await crearRespuestaDePrueba({ dudaId, autorId: maestro.id })
  await archivarClaseDePrueba(clase.id)
  return { maestro, alumno, clase, archivoDePublicacion, archivoDeEntrega }
}

describe("conteo de borrado (ADM-1B02)", () => {
  it("ADM-1B02: alumnos activos, actividades, entregas con fecha, calificaciones y archivos confirmados; lo demás no cuenta", async () => {
    const maestro = await maestroDePrueba()
    const activo1 = await estudianteDePrueba()
    const activo2 = await estudianteDePrueba()
    const inactivo = await estudianteDePrueba({ activo: false })
    const clase = await crearClaseDePrueba(idsClases, { maestroId: maestro.id })
    for (const alumno of [activo1, activo2, inactivo]) await inscribirDePrueba(clase.id, alumno.id)

    const tarea1 = await crearTareaDePrueba({ claseId: clase.id, autorId: maestro.id })
    const tarea2 = await crearTareaDePrueba({ claseId: clase.id, autorId: maestro.id })
    // tarea1: una entregada, una asignada (no cuenta como entrega) y una calificada sin entregar
    // (cuenta como calificación y no como entrega).
    await crearEntregaDePrueba({ tareaId: tarea1, alumnoId: activo1.id, estado: "entregado" })
    await crearEntregaDePrueba({ tareaId: tarea1, alumnoId: activo2.id, estado: "asignado" })
    await obtenerDb().$executeRaw`
      INSERT INTO entregas (tarea_id, alumno_id, estado, calificacion, fecha_calificacion)
      VALUES (${tarea1}::uuid, ${inactivo.id}::uuid, 'calificado', 8, now())`
    // tarea2: una calificada con entrega (cuenta en las dos).
    await crearEntregaDePrueba({ tareaId: tarea2, alumnoId: activo1.id, estado: "calificado" })

    const publicacionId = await crearPublicacionDePrueba({
      claseId: clase.id,
      autorId: maestro.id,
      tipo: "material",
    })
    await crearArchivoDePrueba({
      claseId: clase.id,
      subidoPor: maestro.id,
      estado: "confirmado",
      publicacionId,
    })
    await crearArchivoDePrueba({ claseId: clase.id, subidoPor: maestro.id })
    await crearArchivoDePrueba({ claseId: clase.id, subidoPor: maestro.id, estado: "descartado" })

    const enActiva = await contar(clase.id)
    expect(enActiva.statusCode).toBe(409)
    expect(enActiva.json()).toEqual({
      error: {
        codigo: "CLASE_NO_ARCHIVADA",
        mensaje: "Solo se borra una clase archivada. Archívala primero.",
      },
    })

    await archivarClaseDePrueba(clase.id)
    const respuesta = await contar(clase.id)
    expect(respuesta.statusCode).toBe(200)
    expect(conteoDeBorradoRespuestaSchema.parse(respuesta.json())).toEqual({
      alumnos: 2,
      actividades: 2,
      entregas: 2,
      calificaciones: 2,
      archivos: 1,
    })
  })
})

describe("borrado definitivo (ADM-1B03 a ADM-1B06)", () => {
  it("ADM-1B03: sin confirmar → 409 CONFIRMACION_REQUERIDA y nada borrado; confirmar=otra → 400 VALIDACION; de una activa → 409 CLASE_NO_ARCHIVADA", async () => {
    const { clase } = await clasePoblada()
    const antes = await fotoDeLaClase(clase.id)

    const sinConfirmar = await borrar(clase.id, "")
    expect(sinConfirmar.statusCode).toBe(409)
    expect(sinConfirmar.json()).toEqual({
      error: {
        codigo: "CONFIRMACION_REQUERIDA",
        mensaje: "Confirma el borrado definitivo de la clase.",
      },
    })
    for (const consulta of ["?confirmar=otra", "?confirmar=borrar&confirmar=borrar"]) {
      const invalida = await borrar(clase.id, consulta)
      expect(invalida.statusCode, consulta).toBe(400)
      expect(codigoDeError(invalida), consulta).toBe("VALIDACION")
    }
    expect(await fotoDeLaClase(clase.id)).toEqual(antes)

    const maestro = await maestroDePrueba()
    const activa = await crearClaseDePrueba(idsClases, { maestroId: maestro.id })
    for (const consulta of ["", "?confirmar=borrar"]) {
      const respuesta = await borrar(activa.id, consulta)
      expect(respuesta.statusCode, consulta).toBe(409)
      expect(codigoDeError(respuesta), consulta).toBe("CLASE_NO_ARCHIVADA")
    }
    expect((await fotoDeLaClase(activa.id)).clase).toBe(1)
  })

  it("ADM-1B04: 204; la clase y sus filas hijas desaparecen; sus movimientos también y los de otra clase siguen; los usuarios siguen; sus recordatorios quedan cancelados; BORRAR_OBJETOS lleva todas sus claves (también pendientes y descartadas) y ninguna de otra clase", async () => {
    const db = obtenerDb()
    const maestro = await maestroDePrueba()
    const alumno = await estudianteDePrueba()
    const clase = await crearClaseDePrueba(idsClases, { maestroId: maestro.id })
    const otra = await crearClaseDePrueba(idsClases, { maestroId: maestro.id })
    await inscribirDePrueba(clase.id, alumno.id)
    for (const claseId of [clase.id, otra.id]) {
      await db.movimientoInscripcion.create({
        data: { claseId, alumnoId: alumno.id, actorId: maestro.id, tipo: "alta" },
        select: { id: true },
      })
    }

    // Dos tareas por la API: sus recordatorios nacen en pg-boss con su trabajo_id.
    const tokenMaestro = await tokenDe(maestro)
    const tareaIds: string[] = []
    for (let i = 0; i < 2; i++) {
      const creada = await pedirComo(obtenerApp(), {
        method: "POST",
        url: `/api/clases/${clase.id}/tareas`,
        token: tokenMaestro,
        payload: cuerpoDeTarea({ titulo: `Tarea ${String(i)}` }),
      })
      expect(creada.statusCode, creada.body).toBe(201)
      tareaIds.push((creada.json() as { tarea: { id: string } }).tarea.id)
    }
    const trabajoIds = (
      await db.tarea.findMany({ where: { id: { in: tareaIds } }, select: { trabajoId: true } })
    ).map((tarea) => tarea.trabajoId)
    expect(trabajoIds.every((id) => id !== null)).toBe(true)

    const publicacionId = await crearPublicacionDePrueba({
      claseId: clase.id,
      autorId: maestro.id,
      tipo: "material",
    })
    const confirmado = await crearArchivoDePrueba({
      claseId: clase.id,
      subidoPor: maestro.id,
      estado: "confirmado",
      publicacionId,
    })
    const pendiente = await crearArchivoDePrueba({ claseId: clase.id, subidoPor: maestro.id })
    const descartado = await crearArchivoDePrueba({
      claseId: clase.id,
      subidoPor: maestro.id,
      estado: "descartado",
    })
    const deEntrega = await crearArchivoDeEntregaDePrueba({
      claseId: clase.id,
      tareaId: tareaIds[0] ?? "",
      alumnoId: alumno.id,
    })
    const deOtra = await crearArchivoDePrueba({ claseId: otra.id, subidoPor: maestro.id })
    const clavesDeLaClase = [confirmado, pendiente, descartado, deEntrega].map((a) => a.claveObjeto)

    await archivarClaseDePrueba(clase.id)
    const respuesta = await borrar(clase.id)
    expect(respuesta.statusCode, respuesta.body).toBe(204)
    expect(respuesta.body).toBe("")

    expect(await fotoDeLaClase(clase.id)).toEqual(SIN_FILAS)
    expect(await db.movimientoInscripcion.count({ where: { claseId: otra.id } })).toBe(1)
    expect(await db.usuario.count({ where: { id: { in: [maestro.id, alumno.id] } } })).toBe(2)
    expect((await fotoDeLaClase(otra.id)).archivos).toBe(1)

    for (const tareaId of tareaIds) {
      const recordatorios = await trabajosDeTarea(COLA_RECORDATORIO_24H, tareaId)
      expect(recordatorios.map((t) => t.state)).toEqual(["cancelled"])
    }

    const trabajos = await trabajosDeBorradoCon([...clavesDeLaClase, deOtra.claveObjeto])
    expect(trabajos).toHaveLength(1)
    const claves = (trabajos[0]?.datos.claves ?? []) as string[]
    expect([...claves].sort()).toEqual([...clavesDeLaClase].sort())
    expect(claves).not.toContain(deOtra.claveObjeto)
  })

  it("ADM-1B05: la cascada no falla con una fila en cada tabla hija (categoría con tarea, tema con recurso, rúbrica, entrega calificada con puntajes, archivos de entrega y de publicación, comentarios del muro y del hilo, duda con respuesta, maestros, inscripciones y movimientos)", async () => {
    const { clase, maestro, alumno } = await clasePoblada()
    const antes = await fotoDeLaClase(clase.id)
    for (const [tabla, filas] of Object.entries(antes)) {
      expect(filas, `Precondición: ${tabla} tiene al menos una fila`).toBeGreaterThan(0)
    }

    const respuesta = await borrar(clase.id)
    expect(respuesta.statusCode, respuesta.body).toBe(204)
    expect(await fotoDeLaClase(clase.id)).toEqual(SIN_FILAS)
    expect(
      await obtenerDb().usuario.count({ where: { id: { in: [maestro.id, alumno.id] } } }),
    ).toBe(2)
  })

  it("ADM-1B06: una copia en curso dentro de la clase, o una de otra clase que apunta a un archivo de esta → 409 CLASE_CON_COPIAS_EN_CURSO y nada borrado", async () => {
    const db = obtenerDb()
    const MENSAJE = {
      error: {
        codigo: "CLASE_CON_COPIAS_EN_CURSO",
        mensaje:
          "Esta clase tiene archivos que todavía se están copiando. Inténtalo en unos minutos.",
      },
    }

    // (a) La clase tiene una copia en curso.
    const a = await clasePoblada()
    const b = await clasePoblada()
    await db.archivo.update({
      where: { id: a.archivoDePublicacion.id },
      data: { copiaDe: b.archivoDePublicacion.id },
      select: { id: true },
    })
    const antesA = await fotoDeLaClase(a.clase.id)
    const conCopiaPropia = await borrar(a.clase.id)
    expect(conCopiaPropia.statusCode).toBe(409)
    expect(conCopiaPropia.json()).toEqual(MENSAJE)
    expect(await fotoDeLaClase(a.clase.id)).toEqual(antesA)

    // (b) Otra clase tiene una copia que apunta a un archivo de esta.
    const antesB = await fotoDeLaClase(b.clase.id)
    const originalDeOtra = await borrar(b.clase.id)
    expect(originalDeOtra.statusCode).toBe(409)
    expect(originalDeOtra.json()).toEqual(MENSAJE)
    expect(await fotoDeLaClase(b.clase.id)).toEqual(antesB)

    // Sin la copia en curso, las dos se borran.
    await db.archivo.update({
      where: { id: a.archivoDePublicacion.id },
      data: { copiaDe: null },
      select: { id: true },
    })
    expect((await borrar(b.clase.id)).statusCode).toBe(204)
    expect((await borrar(a.clase.id)).statusCode).toBe(204)
  })

  it("ADM-1B23: los trabajos de BORRAR_OBJETOS nacen diferidos 10 min (entre 10 min después de pedir el borrado y 10 min después de su respuesta), y un archivo pendiente de la clase está entre sus claves", async () => {
    const maestro = await maestroDePrueba()
    const clase = await crearClaseDePrueba(idsClases, { maestroId: maestro.id })
    const pendiente = await crearArchivoDePrueba({ claseId: clase.id, subidoPor: maestro.id })
    await archivarClaseDePrueba(clase.id)

    // T-02 (ronda 1): la API calcula el inicio entre `antes` y `despues`; sin una cota fija que
    // dependa de cuánto tarda la petición (como N-20 de 01a). Mismo reloj (API y prueba en el mismo
    // proceso) y pg-boss guarda la fecha con precisión de milisegundos o más: sin tolerancia.
    const antes = Date.now()
    const respuesta = await borrar(clase.id)
    const despues = Date.now()
    expect(respuesta.statusCode).toBe(204)

    const trabajos = await trabajosDeBorradoCon([pendiente.claveObjeto])
    expect(trabajos).toHaveLength(1)
    const [trabajo] = trabajos
    expect(trabajo?.state).toBe("created")
    expect(trabajo?.datos.claves).toEqual([pendiente.claveObjeto])
    const inicio = trabajo?.start_after.getTime() ?? 0
    expect(inicio).toBeGreaterThanOrEqual(antes + 600_000)
    expect(inicio).toBeLessThanOrEqual(despues + 600_000)
  })

  it("ADM-1B04 (lotes): una clase con 1 001 archivos encola dos trabajos de BORRAR_OBJETOS, de 1000 y de 1 clave", async () => {
    const maestro = await maestroDePrueba()
    const clase = await crearClaseDePrueba(idsClases, { maestroId: maestro.id })
    const claves = Array.from(
      { length: 1001 },
      (_, i) => `materiales/${clase.id}/lote-${String(i).padStart(4, "0")}-${randomUUID()}`,
    )
    await obtenerDb().archivo.createMany({
      data: claves.map((claveObjeto) => ({
        claveObjeto,
        nombre: "a.pdf",
        tipo: "application/pdf",
        tamano: 1,
        subidoPor: maestro.id,
        claseId: clase.id,
        estado: "pendiente" as const,
      })),
    })
    await archivarClaseDePrueba(clase.id)
    expect((await borrar(clase.id)).statusCode).toBe(204)

    const trabajos = await trabajosDeBorradoCon(claves)
    expect(trabajos.map((t) => (t.datos.claves as string[]).length).sort((x, y) => x - y)).toEqual([
      1, 1000,
    ])
    expect(new Set(trabajos.map((t) => t.id)).size).toBe(2)
    const todas = trabajos.flatMap((t) => t.datos.claves as string[])
    expect([...todas].sort()).toEqual([...claves].sort())
  })
})
