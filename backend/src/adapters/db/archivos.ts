import { obtenerDb, type Ejecutor } from "./cliente.js"

// CLASES-d (§D-D1, §D-D3). Metadatos de los archivos de una clase. El objeto vive en el almacén; aquí
// solo la fila. Ninguna de estas funciones devuelve la clave del objeto salvo la que la necesita para
// firmar (el handler la usa y nunca la responde).

// Un archivo pendiente solo puede confirmarse dentro de estas horas (§D-D3, punto 3).
export const VIGENCIA_PENDIENTE_MS = 24 * 60 * 60 * 1000

export interface ArchivoDb {
  id: string
  nombre: string
  tipo: string
  tamano: number
  claveObjeto: string
}

export const SELECT_ARCHIVO = {
  id: true,
  nombre: true,
  tipo: true,
  tamano: true,
  claveObjeto: true,
} as const

export const registrarArchivoPendiente = async (
  {
    id,
    claseId,
    subidoPor,
    nombre,
    tipo,
    tamano,
    claveObjeto,
  }: {
    id: string
    claseId: string
    subidoPor: string
    nombre: string
    tipo: string
    tamano: number
    claveObjeto: string
  },
  ejecutor: Ejecutor = obtenerDb(),
): Promise<void> => {
  await ejecutor.archivo.create({
    data: { id, claseId, subidoPor, nombre, tipo, tamano, claveObjeto, estado: "pendiente" },
    select: { id: true },
  })
}

// Una sola consulta por PK, ya acotada a lo que podría confirmarse: de esa clase, de ese usuario,
// pendiente, sin contexto y de las últimas 24 h. Si falta alguno, el handler no llega a preguntarle
// nada al almacén por un archivo ajeno (sin oráculo). Devuelve las filas en el orden de `ids`.
// ENTREGAS-01b (§D-3.6): `prefijo` es obligatorio (el de materiales o el de una entrega, de
// core/archivos/politica.ts): un archivo de entrega nunca se confirma en una publicación ni uno de
// material en una entrega, aunque alguien conozca su id. La comparación no distingue mayúsculas: la
// clave de un material lleva el :claseId tal como llegó en la ruta de subida.
export const buscarArchivosParaConfirmar = async (
  {
    ids,
    claseId,
    subidoPor,
    prefijo,
  }: { ids: readonly string[]; claseId: string; subidoPor: string; prefijo: string },
  ejecutor: Ejecutor = obtenerDb(),
): Promise<ArchivoDb[]> => {
  const filas = await ejecutor.archivo.findMany({
    where: {
      id: { in: [...ids] },
      claseId,
      subidoPor,
      estado: "pendiente",
      publicacionId: null,
      entregaId: null,
      claveObjeto: { startsWith: prefijo, mode: "insensitive" },
      creadoEn: { gt: new Date(Date.now() - VIGENCIA_PENDIENTE_MS) },
    },
    select: SELECT_ARCHIVO,
  })
  const porId = new Map(filas.map((fila) => [fila.id, fila]))
  return ids.flatMap((id) => {
    const fila = porId.get(id)
    return fila === undefined ? [] : [fila]
  })
}

// null: no existe en esa clase o todavía no está confirmado (un pendiente no se descarga).
// ENTREGAS-01b (§D-3.6, PR-1B17): la descarga de la clase solo sirve archivos de publicaciones; sin
// esto, cualquier alumno inscrito descargaría el archivo de entrega de un compañero con su id. Los de
// una entrega se descargan por las rutas de la entrega (db/entregas.ts).
export const buscarArchivoConfirmado = async (
  { archivoId, claseId }: { archivoId: string; claseId: string },
  ejecutor: Ejecutor = obtenerDb(),
): Promise<ArchivoDb | null> =>
  ejecutor.archivo.findFirst({
    where: { id: archivoId, claseId, estado: "confirmado", publicacionId: { not: null } },
    select: SELECT_ARCHIVO,
  })
