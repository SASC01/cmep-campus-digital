import {
  descargaRespuestaSchema,
  solicitarSubidaRespuestaSchema,
  type SolicitarSubida,
} from "@campus/shared"
import { useMutation } from "@tanstack/react-query"

import { api } from "@/services/apiClient"

import { rutaDeArchivosDeLaClase } from "./lib"

// TAREAS-01c (§D-9): movidos sin cambios desde features/clases/hooks.ts, que los reexporta.

// CLASES-d (§D-D3, §D-D5). Pide una URL prefirmada para subir un archivo directo al almacén. Sin
// avisos propios: el formulario decide qué decirle a la persona según en qué paso falló.
// ENTREGAS-01d (§D-9.1): envoltorio del gancho con ruta, con la misma firma y la misma petición.
export const useSolicitarSubida = (claseId: string) =>
  useSolicitarSubidaEn(rutaDeArchivosDeLaClase(claseId))

// Pide la URL de descarga de un adjunto (5 minutos de vigencia); quien la usa decide qué hacer con
// ella y avisa si falla.
// ENTREGAS-01d (§D-9.1): envoltorio del gancho con ruta, con la misma firma y la misma petición.
export const useUrlDeDescarga = (claseId: string) =>
  useUrlDeDescargaEn(rutaDeArchivosDeLaClase(claseId))

// ENTREGAS-01d (§D-9.1, R-04: solo agregados). Los mismos ganchos sobre otra ruta de archivos: la de la
// entrega del alumno (`…/tareas/:tareaId/entrega`) o la de la entrega de un alumno para sus maestros
// (`…/tareas/:tareaId/entregas/:alumnoId`). Piden `${ruta}/archivos` y
// `${ruta}/archivos/:archivoId/descarga`. Los de arriba los envuelven con la ruta de la clase.
export const useSolicitarSubidaEn = (rutaDeArchivos: string) =>
  useMutation({
    mutationFn: (datos: SolicitarSubida) =>
      api(`${rutaDeArchivos}/archivos`, {
        method: "POST",
        body: datos,
        schema: solicitarSubidaRespuestaSchema,
      }),
  })

export const useUrlDeDescargaEn = (rutaDeArchivos: string) =>
  useMutation({
    mutationFn: (archivoId: string) =>
      api(`${rutaDeArchivos}/archivos/${archivoId}/descarga`, {
        method: "POST",
        schema: descargaRespuestaSchema,
      }),
  })
