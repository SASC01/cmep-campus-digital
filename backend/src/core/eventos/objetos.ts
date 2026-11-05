import { z } from "zod"

// ADMIN-01b (§D-4, §D-5, §D-6). Colas de los objetos del almacén. BORRAR_OBJETOS lleva las claves de
// los objetos de una clase borrada; COPIAR_OBJETOS, los ids de las filas de archivos de una clase
// duplicada cuyo objeto falta copiar. El id de cada trabajo es aleatorio. Los datos llevan solo
// claves o ids: nunca nombres, correos ni texto de las publicaciones.
export const COLA_BORRAR_OBJETOS = "BORRAR_OBJETOS"
export const COLA_BORRAR_OBJETOS_FALLIDO = "BORRAR_OBJETOS_FALLIDO"
export const COLA_COPIAR_OBJETOS = "COPIAR_OBJETOS"
export const COLA_COPIAR_OBJETOS_FALLIDO = "COPIAR_OBJETOS_FALLIDO"

// Un trabajo de borrado por cada 1000 claves (el máximo de una llamada de borrado en lote del
// protocolo S3) y uno de copia por cada 100 archivos.
export const MAXIMO_CLAVES_POR_TRABAJO = 1000
export const MAXIMO_COPIAS_POR_TRABAJO = 100

// N-09: el borrado de objetos nace diferido 10 min. Una URL de subida firmada antes de archivar dura
// 5 min, y su archivo pendiente ya está entre las claves del borrado: a los 10 min esa subida terminó
// o venció, así que el borrado alcanza también su objeto.
export const RETRASO_BORRADO_DE_OBJETOS_MS = 600_000

export const datosBorrarObjetosSchema = z.strictObject({
  claves: z.array(z.string().min(1)).min(1).max(MAXIMO_CLAVES_POR_TRABAJO),
})

export const datosCopiarObjetosSchema = z.strictObject({
  archivoIds: z.array(z.uuid()).min(1).max(MAXIMO_COPIAS_POR_TRABAJO),
})

export type DatosBorrarObjetos = z.infer<typeof datosBorrarObjetosSchema>
export type DatosCopiarObjetos = z.infer<typeof datosCopiarObjetosSchema>
