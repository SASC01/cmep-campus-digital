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
// pendiente, sin publicación y de las últimas 24 h. Si falta alguno, el handler no llega a preguntarle
// nada al almacén por un archivo ajeno (sin oráculo). Devuelve las filas en el orden de `ids`.
export const buscarArchivosParaConfirmar = async (
  { ids, claseId, subidoPor }: { ids: readonly string[]; claseId: string; subidoPor: string },
  ejecutor: Ejecutor = obtenerDb(),
): Promise<ArchivoDb[]> => {
  const filas = await ejecutor.archivo.findMany({
    where: {
      id: { in: [...ids] },
      claseId,
      subidoPor,
      estado: "pendiente",
      publicacionId: null,
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
export const buscarArchivoConfirmado = async (
  { archivoId, claseId }: { archivoId: string; claseId: string },
  ejecutor: Ejecutor = obtenerDb(),
): Promise<ArchivoDb | null> =>
  ejecutor.archivo.findFirst({
    where: { id: archivoId, claseId, estado: "confirmado" },
    select: SELECT_ARCHIVO,
  })
