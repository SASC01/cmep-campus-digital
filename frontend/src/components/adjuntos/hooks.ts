import {
  descargaRespuestaSchema,
  solicitarSubidaRespuestaSchema,
  type SolicitarSubida,
} from "@campus/shared"
import { useMutation } from "@tanstack/react-query"

import { api } from "@/services/apiClient"

// TAREAS-01c (§D-9): movidos sin cambios desde features/clases/hooks.ts, que los reexporta.

// CLASES-d (§D-D3, §D-D5). Pide una URL prefirmada para subir un archivo directo al almacén. Sin
// avisos propios: el formulario decide qué decirle a la persona según en qué paso falló.
export const useSolicitarSubida = (claseId: string) =>
  useMutation({
    mutationFn: (datos: SolicitarSubida) =>
      api(`/api/clases/${claseId}/archivos`, {
        method: "POST",
        body: datos,
        schema: solicitarSubidaRespuestaSchema,
      }),
  })

// Pide la URL de descarga de un adjunto (5 minutos de vigencia); quien la usa decide qué hacer con
// ella y avisa si falla.
export const useUrlDeDescarga = (claseId: string) =>
  useMutation({
    mutationFn: (archivoId: string) =>
      api(`/api/clases/${claseId}/archivos/${archivoId}/descarga`, {
        method: "POST",
        schema: descargaRespuestaSchema,
      }),
  })
