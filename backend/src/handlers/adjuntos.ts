import type { Adjunto } from "@campus/shared"

import { buscarArchivosParaConfirmar, type ArchivoDb } from "../adapters/db/index.js"
import type { Almacen } from "../core/archivos/almacen.js"
import {
  almacenNoConfigurado,
  archivoNoCoincide,
  archivoNoSubido,
  coincideConLoDeclarado,
  disposicionDeContenido,
  esImagenConVistaPrevia,
  prefijoDeMateriales,
  VIGENCIA_URL_FIRMADA_S,
} from "../core/archivos/politica.js"

// TAREAS-01b (A-6): movidas sin cambios desde clases/muro.ts para que las usen el muro y las tareas.

// §D-D3, punto 4: la clave del objeto nunca sale; la vista previa solo existe para las cuatro
// imágenes y solo con almacén. Firmar es un cálculo local, sin red.
export const adjuntosParaResponder = (
  almacen: Almacen | null,
  archivos: readonly ArchivoDb[],
): Promise<Adjunto[]> =>
  Promise.all(
    archivos.map(async ({ id, nombre, tipo, tamano, claveObjeto }): Promise<Adjunto> => {
      if (almacen === null || !esImagenConVistaPrevia(tipo)) {
        return { id, nombre, tipo, tamano, vistaPrevia: null }
      }
      const url = await almacen.urlDeDescarga({
        clave: claveObjeto,
        tipo,
        disposicion: disposicionDeContenido(nombre, "inline"),
      })
      const expiraEn = new Date(Date.now() + VIGENCIA_URL_FIRMADA_S * 1000).toISOString()
      return { id, nombre, tipo, tamano, vistaPrevia: { url, expiraEn } }
    }),
  )

// §D-D3, puntos 3.1 y 3.2: los archivos se leen una vez (acotados a la clase, al usuario y, desde
// ENTREGAS-01b, al prefijo de su contexto: §D-3.6) y se comprueba en el almacén que lo subido es lo
// declarado. Sin ids no toca ni la base ni el almacén.
export const archivosParaConfirmar = async ({
  almacen,
  ids,
  claseId,
  subidoPor,
  prefijo,
}: {
  almacen: Almacen | null
  ids: readonly string[]
  claseId: string
  subidoPor: string
  prefijo: string
}): Promise<ArchivoDb[]> => {
  if (ids.length === 0) return []
  if (almacen === null) throw almacenNoConfigurado()
  const archivos = await buscarArchivosParaConfirmar({ ids, claseId, subidoPor, prefijo })
  if (archivos.length !== ids.length) throw archivoNoCoincide()
  const reales = await Promise.all(
    archivos.map((archivo) => almacen.metadatosDe(archivo.claveObjeto)),
  )
  const veredictos = archivos.map((archivo, i) =>
    coincideConLoDeclarado(archivo, reales[i] ?? null),
  )
  if (veredictos.includes("falta")) throw archivoNoSubido()
  if (veredictos.includes("distinto")) throw archivoNoCoincide()
  return archivos
}

// Publicaciones (muro y tareas): solo archivos subidos con la clave de materiales de la clase.
export const archivosParaPublicar = (p: {
  almacen: Almacen | null
  ids: readonly string[]
  claseId: string
  subidoPor: string
}): Promise<ArchivoDb[]> => archivosParaConfirmar({ ...p, prefijo: prefijoDeMateriales(p.claseId) })
