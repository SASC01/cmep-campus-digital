import { randomBytes } from "node:crypto"

import { LONGITUD_CODIGO_CLASE } from "@campus/shared"

import { obtenerDb } from "../src/adapters/db/cliente.js"
import { normalizarParaBusqueda } from "../src/core/auth/normalizacion.js"
import { codigoDesdeBytes } from "../src/core/clases/codigo.js"
import { crearUsuarioDePrueba, type UsuarioDePrueba } from "./ayudas-auth.js"

// Ayudas compartidas por las pruebas de clases (CLASES-a). Mismo patrón que ayudas-auth.ts:
// obtenerDb() se usa aquí, y solo aquí fuera de adapters/db, para preparar y limpiar datos.

export const codigoDePrueba = (): string => codigoDesdeBytes(randomBytes(LONGITUD_CODIGO_CLASE))

export interface OpcionesClaseDePrueba {
  maestroId: string
  nombre?: string
  descripcion?: string | null
  codigoInvitacion?: string
  activa?: boolean
}

export interface ClaseDePrueba {
  id: string
  codigoInvitacion: string
}

export const crearClaseDePrueba = async (
  registro: string[],
  {
    maestroId,
    nombre = "Clase de prueba",
    descripcion = null,
    codigoInvitacion,
    activa = true,
  }: OpcionesClaseDePrueba,
): Promise<ClaseDePrueba> => {
  const codigo = codigoInvitacion ?? codigoDePrueba()
  const { id } = await obtenerDb().clase.create({
    data: { maestroId, nombre, descripcion, codigoInvitacion: codigo, activa },
    select: { id: true },
  })
  registro.push(id)
  return { id, codigoInvitacion: codigo }
}

export const inscribirDePrueba = async (
  claseId: string,
  usuarioId: string,
  origen: "codigo" | "manual" = "manual",
): Promise<void> => {
  await obtenerDb().inscripcion.create({
    data: { claseId, usuarioId, origen },
    select: { claseId: true },
  })
}

export const leerClaseDb = (id: string) => obtenerDb().clase.findUnique({ where: { id } })

export const contarInscripciones = (claseId: string): Promise<number> =>
  obtenerDb().inscripcion.count({ where: { claseId } })

// N-10 (regla de b, c y d; aquí solo se limpian clases porque movimientos_inscripcion llega en b):
// las clases de prueba se borran ANTES que los usuarios (clases.maestro_id es ON DELETE RESTRICT).
// Las inscripciones caen en cascada con la clase.
export const borrarClasesDePrueba = async (ids: readonly string[]): Promise<void> => {
  if (ids.length === 0) return
  await obtenerDb().clase.deleteMany({ where: { id: { in: [...ids] } } })
}

// N-10 (regla de b, c y d): movimientos_inscripcion tiene ON DELETE RESTRICT hacia clases y hacia
// usuarios (igual que clases.maestro_id), así que la limpieza de cada archivo de pruebas de
// integración de b, c y d corre ANTES que borrarUsuariosDePrueba, en este orden:
//   1. los movimientos de las clases de prueba;
//   2. las clases (borran en cascada sus inscripciones);
//   3. al final, los usuarios (esa llamada es de ayudas-auth.ts).
// Con otro orden, el borrado de un usuario o de una clase con movimientos falla por el RESTRICT.
export const borrarMovimientosYClasesDePrueba = async (ids: readonly string[]): Promise<void> => {
  if (ids.length === 0) return
  await obtenerDb().movimientoInscripcion.deleteMany({ where: { claseId: { in: [...ids] } } })
  await borrarClasesDePrueba(ids)
}

export interface OpcionesAlumnoDePrueba {
  nombre: string
  rol?: "estudiante" | "maestro"
  estadoPago?: "al_corriente" | "deudor"
  accesoRestringido?: boolean
  activo?: boolean
}

// Cuenta con nombre_busqueda normalizado como lo hace core/ (crearUsuarioDePrueba solo lo pasa a
// minúsculas, sin quitar acentos) y, si se pide, con deuda: lo que necesitan las pruebas del
// buscador y del roster.
export const crearAlumnoDePrueba = async (
  registro: string[],
  { nombre, rol = "estudiante", estadoPago, accesoRestringido, activo }: OpcionesAlumnoDePrueba,
): Promise<UsuarioDePrueba> => {
  const usuario = await crearUsuarioDePrueba(registro, {
    nombre,
    rol,
    ...(accesoRestringido === undefined ? {} : { accesoRestringido }),
    ...(activo === undefined ? {} : { activo }),
  })
  await obtenerDb().usuario.update({
    where: { id: usuario.id },
    data: {
      nombreBusqueda: normalizarParaBusqueda(nombre),
      ...(estadoPago === undefined ? {} : { estadoPago }),
    },
    select: { id: true },
  })
  return usuario
}

export const leerMovimientos = (claseId: string) =>
  obtenerDb().movimientoInscripcion.findMany({
    where: { claseId },
    orderBy: { secuencia: "asc" },
  })

export const leerInscripcion = (claseId: string, usuarioId: string) =>
  obtenerDb().inscripcion.findUnique({
    where: { claseId_usuarioId: { claseId, usuarioId } },
  })

// CLASES-c. Publicaciones y comentarios sembrados directo en la base (sin pasar por la API ni por la
// cola). Su limpieza no necesita un paso nuevo: las clases de prueba se borran antes que los
// usuarios (N-10) y arrastran en cascada sus publicaciones y comentarios; publicaciones.autor_id y
// comentarios.autor_id son ON DELETE RESTRICT, y por eso el orden de limpieza sigue siendo el mismo.
export interface OpcionesPublicacionDePrueba {
  claseId: string
  autorId: string
  tipo?: "anuncio" | "material"
  titulo?: string | null
  texto?: string
  creadoEn?: Date
}

export const crearPublicacionDePrueba = async ({
  claseId,
  autorId,
  tipo = "anuncio",
  titulo,
  texto = "Texto de prueba",
  creadoEn,
}: OpcionesPublicacionDePrueba): Promise<string> => {
  const { id } = await obtenerDb().publicacion.create({
    data: {
      claseId,
      autorId,
      tipo,
      titulo: titulo ?? (tipo === "material" ? "Material de prueba" : null),
      texto,
      ...(creadoEn === undefined ? {} : { creadoEn }),
    },
    select: { id: true },
  })
  return id
}

export const crearComentarioDePrueba = async ({
  publicacionId,
  autorId,
  texto = "Comentario de prueba",
  creadoEn,
}: {
  publicacionId: string
  autorId: string
  texto?: string
  creadoEn?: Date
}): Promise<string> => {
  const { id } = await obtenerDb().comentario.create({
    data: { publicacionId, autorId, texto, ...(creadoEn === undefined ? {} : { creadoEn }) },
    select: { id: true },
  })
  return id
}

export const leerPublicacionDb = (id: string) =>
  obtenerDb().publicacion.findUnique({ where: { id } })

export const contarPublicaciones = (claseId: string): Promise<number> =>
  obtenerDb().publicacion.count({ where: { claseId } })

export const contarComentarios = (publicacionId: string): Promise<number> =>
  obtenerDb().comentario.count({ where: { publicacionId } })

export const leerComentarioDb = (id: string) => obtenerDb().comentario.findUnique({ where: { id } })

// Trabajos de la cola con su política heredada y el momento en que expiran (PA-05): lo que pg-boss
// guardó en pgboss.job, no lo que dice la cola.
export interface TrabajoDeCola {
  id: string
  name: string
  retry_limit: number
  retry_backoff: boolean
  dead_letter: string | null
  retencion_s: number
  datos: Record<string, unknown>
}

export const leerTrabajosDeCola = (cola: string, claveDeDatos: string, valor: string) =>
  obtenerDb().$queryRaw<TrabajoDeCola[]>`
    SELECT id::text AS id, name, retry_limit, retry_backoff, dead_letter,
           EXTRACT(EPOCH FROM (keep_until - start_after))::int AS retencion_s, data AS datos
    FROM pgboss.job
    WHERE name = ${cola} AND data ->> ${claveDeDatos}::text = ${valor}`
