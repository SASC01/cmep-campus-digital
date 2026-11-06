import { esApiError } from "@/services/apiClient"

// ADMIN-01d1 (§D-9, Enmienda 3): la única clasificación del 409 de una clase archivada, compartida por
// features/clases y features/tareas. Mira el código del error, nunca su texto.
export const esClaseArchivada = (error: unknown): boolean =>
  esApiError(error) && error.codigo === "CLASE_ARCHIVADA"
