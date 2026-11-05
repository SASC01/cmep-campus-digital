import { claveDeMaterial } from "../archivos/politica.js"

// ADMIN-01b (§D-5, S-07, DH-03). Qué se copia al duplicar una clase: temas (nombre y orden),
// categorías (nombre y peso) y recursos de aprendizaje con sus archivos confirmados. Nunca maestros,
// alumnos, avisos, actividades, recursos del docente, comentarios, dudas ni calificaciones. Puro:
// recibe lo leído de la original, el id de la clase nueva, la hora y un generador de ids.

export type TipoDePublicacionOriginal = "anuncio" | "material" | "tarea"
export type BloqueOriginal = "aprendizaje" | "docente" | null
export type EstadoDeArchivoOriginal = "pendiente" | "confirmado" | "descartado"

// La regla de bloqueEfectivo (core/recursos.ts): el bloque guardado o, si es nulo (un material
// anterior a CLASES-03), aprendizaje solo si lo publicó el administrador.
export const esRecursoDeAprendizaje = ({
  tipo,
  bloque,
  autorEsAdmin,
}: {
  tipo: TipoDePublicacionOriginal
  bloque: BloqueOriginal
  autorEsAdmin: boolean
}): boolean => {
  if (tipo !== "material") return false
  if (bloque === null) return autorEsAdmin
  return bloque === "aprendizaje"
}

export interface TemaOriginal {
  id: string
  nombre: string
  orden: number
}

export interface CategoriaOriginal {
  id: string
  nombre: string
  peso: number
  creadoEn: Date
}

export interface RecursoOriginal {
  id: string
  tipo: TipoDePublicacionOriginal
  bloque: BloqueOriginal
  autorId: string
  autorEsAdmin: boolean
  titulo: string | null
  texto: string
  temaId: string | null
  creadoEn: Date
}

export interface ArchivoOriginal {
  id: string
  publicacionId: string | null
  estado: EstadoDeArchivoOriginal
  nombre: string
  tipo: string
  tamano: number
  subidoPor: string
  creadoEn: Date
}

export interface OriginalParaDuplicar {
  temas: readonly TemaOriginal[]
  categorias: readonly CategoriaOriginal[]
  recursos: readonly RecursoOriginal[]
  archivos: readonly ArchivoOriginal[]
}

export interface DatosDeLaCopia {
  claseId: string
  ahora: Date
  generarId: () => string
}

export interface TemaDeLaCopia {
  id: string
  claseId: string
  nombre: string
  orden: number
}

export interface CategoriaDeLaCopia {
  id: string
  claseId: string
  nombre: string
  peso: number
  creadoEn: Date
}

export interface RecursoDeLaCopia {
  id: string
  claseId: string
  autorId: string
  tipo: "material"
  titulo: string | null
  texto: string
  temaId: string | null
  bloque: "aprendizaje"
  version: 0
  creadoEn: Date
}

export interface ArchivoDeLaCopia {
  id: string
  claseId: string
  publicacionId: string
  estado: "confirmado"
  nombre: string
  tipo: string
  tamano: number
  subidoPor: string
  claveObjeto: string
  copiaDe: string
  creadoEn: Date
}

export interface PlanDeDuplicado {
  temas: TemaDeLaCopia[]
  categorias: CategoriaDeLaCopia[]
  recursos: RecursoDeLaCopia[]
  archivos: ArchivoDeLaCopia[]
}

const compararIds = (a: string, b: string): number => {
  if (a < b) return -1
  if (a > b) return 1
  return 0
}

const masMs = (fecha: Date, ms: number): Date => new Date(fecha.getTime() + ms)

export const planDeDuplicado = (
  original: OriginalParaDuplicar,
  { claseId, ahora, generarId }: DatosDeLaCopia,
): PlanDeDuplicado => {
  // Temas, en el orden de la original (orden, id). Los ids nuevos se reparten ya ordenados: dos temas
  // con el mismo `orden` conservan entre sí el orden que tenían.
  const temasOrdenados = [...original.temas].sort(
    (a, b) => a.orden - b.orden || compararIds(a.id, b.id),
  )
  const idsDeTemas = temasOrdenados.map(() => generarId()).sort(compararIds)
  const temaNuevoDe = new Map<string, string>()
  const temas = temasOrdenados.map((tema, i): TemaDeLaCopia => {
    const id = idsDeTemas[i] ?? generarId()
    temaNuevoDe.set(tema.id, id)
    return { id, claseId, nombre: tema.nombre, orden: tema.orden }
  })

  // N-04: un createMany da a todas las filas el mismo creado_en; las marcas crecientes conservan el
  // orden (creado_en, id) de la original.
  const categorias = [...original.categorias]
    .sort((a, b) => a.creadoEn.getTime() - b.creadoEn.getTime() || compararIds(a.id, b.id))
    .map((categoria, i): CategoriaDeLaCopia => ({
      id: generarId(),
      claseId,
      nombre: categoria.nombre,
      peso: categoria.peso,
      creadoEn: masMs(ahora, i),
    }))

  // N-04: los recursos se listan del más reciente al más antiguo; el primero de la original queda
  // con la marca más reciente de la copia.
  const recursoNuevoDe = new Map<string, string>()
  const recursos = original.recursos
    .filter((recurso) => esRecursoDeAprendizaje(recurso))
    .sort((a, b) => b.creadoEn.getTime() - a.creadoEn.getTime() || compararIds(b.id, a.id))
    .map((recurso, i): RecursoDeLaCopia => {
      const id = generarId()
      recursoNuevoDe.set(recurso.id, id)
      const temaId = recurso.temaId === null ? null : (temaNuevoDe.get(recurso.temaId) ?? null)
      return {
        id,
        claseId,
        autorId: recurso.autorId,
        tipo: "material",
        titulo: recurso.titulo,
        texto: recurso.texto,
        temaId,
        bloque: "aprendizaje",
        version: 0,
        creadoEn: masMs(ahora, -i),
      }
    })

  // Solo los confirmados de un recurso copiado. Los adjuntos de un recurso se listan por
  // (creado_en, id): las marcas crecientes conservan también ese orden.
  const archivos = original.archivos
    .filter((archivo) => archivo.estado === "confirmado" && archivo.publicacionId !== null)
    .flatMap((archivo) => {
      const publicacionId =
        archivo.publicacionId === null ? undefined : recursoNuevoDe.get(archivo.publicacionId)
      return publicacionId === undefined ? [] : [{ archivo, publicacionId }]
    })
    .sort(
      (a, b) =>
        a.archivo.creadoEn.getTime() - b.archivo.creadoEn.getTime() ||
        compararIds(a.archivo.id, b.archivo.id),
    )
    .map(({ archivo, publicacionId }, i): ArchivoDeLaCopia => {
      const id = generarId()
      return {
        id,
        claseId,
        publicacionId,
        estado: "confirmado",
        nombre: archivo.nombre,
        tipo: archivo.tipo,
        tamano: archivo.tamano,
        subidoPor: archivo.subidoPor,
        claveObjeto: claveDeMaterial(claseId, id),
        copiaDe: archivo.id,
        creadoEn: masMs(ahora, i),
      }
    })

  return { temas, categorias, recursos, archivos }
}
