import { randomBytes, randomUUID } from "node:crypto"

import { LONGITUD_CODIGO_CLASE } from "@campus/shared"

import { obtenerDb } from "../src/adapters/db/cliente.js"
import { normalizarParaBusqueda } from "../src/core/auth/normalizacion.js"
import { codigoDesdeBytes } from "../src/core/clases/codigo.js"
import { crearUsuarioDePrueba, firmarTokenDePrueba, type UsuarioDePrueba } from "./ayudas-auth.js"

// Ayudas compartidas por las pruebas de clases (CLASES-a). Mismo patrón que ayudas-auth.ts:
// obtenerDb() se usa aquí, y solo aquí fuera de adapters/db, para preparar y limpiar datos.

export const codigoDePrueba = (): string => codigoDesdeBytes(randomBytes(LONGITUD_CODIGO_CLASE))

export interface OpcionesClaseDePrueba {
  // El maestro principal: es clases.maestro_id (solo escritura, P-06 a) y, sin maestroIds, el único
  // maestro asignado.
  maestroId: string
  // CLASES-02: todos los maestros asignados (de uno a dos), con maestroId entre ellos.
  maestroIds?: readonly string[]
  nombre?: string
  descripcion?: string | null
  codigoInvitacion?: string
  activa?: boolean
  // Para ordenar la clase en las listas (la asignación conserva su propia creado_en).
  creadoEn?: Date
}

export interface ClaseDePrueba {
  id: string
  codigoInvitacion: string
}

export const crearClaseDePrueba = async (
  registro: string[],
  {
    maestroId,
    maestroIds,
    nombre = "Clase de prueba",
    descripcion = null,
    codigoInvitacion,
    activa = true,
    creadoEn,
  }: OpcionesClaseDePrueba,
): Promise<ClaseDePrueba> => {
  const codigo = codigoInvitacion ?? codigoDePrueba()
  const asignados = maestroIds ?? [maestroId]
  if (!asignados.includes(maestroId)) {
    throw new Error("crearClaseDePrueba: maestroIds debe incluir a maestroId")
  }
  // CLASES-02 (PR-2A09): la clase y sus asignaciones en un solo create anidado, sin ventana entre
  // las dos y con la misma creado_en. Las clases creadas a mano sin asignación no tienen maestro.
  const { id } = await obtenerDb().clase.create({
    data: {
      maestroId,
      nombre,
      descripcion,
      codigoInvitacion: codigo,
      activa,
      ...(creadoEn === undefined ? {} : { creadoEn }),
      maestros: { create: asignados.map((id) => ({ maestroId: id })) },
    },
    select: { id: true },
  })
  registro.push(id)
  return { id, codigoInvitacion: codigo }
}

// CLASES-02: el administrador único de la base desechable (lo crea seed:admin en global-setup) y su
// token, para las rutas de /api/admin/clases y las que se abren al admin.
export const idDelAdminDePrueba = async (): Promise<string> => {
  const admin = await obtenerDb().usuario.findFirst({
    where: { rol: "admin" },
    select: { id: true },
  })
  if (!admin) throw new Error("Precondición: la base desechable no tiene el admin de seed:admin")
  return admin.id
}

export const tokenDelAdminDePrueba = async (): Promise<string> =>
  firmarTokenDePrueba({ usuarioId: await idDelAdminDePrueba() })

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

// CLASES-d. Archivos sembrados directo en la base (sin pasar por la API ni por el almacén). Se
// borran en cascada con su clase (archivos.clase_id es CASCADE); archivos.subido_por es RESTRICT, y
// por eso la limpieza sigue el mismo orden de N-10: clases antes que usuarios.
export interface OpcionesArchivoDePrueba {
  claseId: string
  subidoPor: string
  estado?: "pendiente" | "confirmado" | "descartado"
  // Obligatorio si y solo si estado es "confirmado" (el CHECK de §D-D1).
  publicacionId?: string
  nombre?: string
  tipo?: string
  tamano?: number
  creadoEn?: Date
}

export interface ArchivoDePrueba {
  id: string
  claveObjeto: string
}

export const crearArchivoDePrueba = async ({
  claseId,
  subidoPor,
  estado = "pendiente",
  publicacionId,
  nombre = "guia.pdf",
  tipo = "application/pdf",
  tamano = 1000,
  creadoEn,
}: OpcionesArchivoDePrueba): Promise<ArchivoDePrueba> => {
  const id = randomUUID()
  const claveObjeto = `materiales/${claseId}/${id}`
  await obtenerDb().archivo.create({
    data: {
      id,
      claveObjeto,
      claseId,
      subidoPor,
      estado,
      nombre,
      tipo,
      tamano,
      ...(publicacionId === undefined ? {} : { publicacionId }),
      ...(creadoEn === undefined ? {} : { creadoEn }),
    },
    select: { id: true },
  })
  return { id, claveObjeto }
}

export const leerArchivoDb = (id: string) => obtenerDb().archivo.findUnique({ where: { id } })

export const listarArchivosDb = (claseId: string) =>
  obtenerDb().archivo.findMany({ where: { claseId }, orderBy: { id: "asc" } })
