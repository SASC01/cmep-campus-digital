import {
  listaCategoriasRespuestaSchema,
  listaTemasRespuestaSchema,
  tareaRespuestaSchema,
} from "@campus/shared"
import { queryOptions } from "@tanstack/react-query"

import { api } from "@/services/apiClient"

// TAREAS-01d (§D-10). Claves y consultas de temas, categorías, "Trabajo de clase" y tareas,
// compartidas por features/clases y features/tareas (precedente: clasesService.ts). Todas cuelgan de
// ["clases", claseId, …], así que invalidar el prefijo de una clase las alcanza.
export const claveTemas = (claseId: string) => ["clases", claseId, "temas"] as const
export const claveCategorias = (claseId: string) => ["clases", claseId, "categorias"] as const
// "Trabajo de clase" pide una lista por tema ("sin-tema" o el id del tema); el prefijo alcanza todas.
export const clavePrefijoDelTrabajo = (claseId: string) => ["clases", claseId, "trabajo"] as const
export const claveTrabajo = (claseId: string, tema: string) =>
  ["clases", claseId, "trabajo", tema] as const
export const claveTarea = (claseId: string, tareaId: string) =>
  ["clases", claseId, "tareas", tareaId] as const

export const consultaTemas = (claseId: string) =>
  queryOptions({
    queryKey: claveTemas(claseId),
    queryFn: () => api(`/api/clases/${claseId}/temas`, { schema: listaTemasRespuestaSchema }),
  })

export const consultaCategorias = (claseId: string) =>
  queryOptions({
    queryKey: claveCategorias(claseId),
    queryFn: () =>
      api(`/api/clases/${claseId}/categorias`, { schema: listaCategoriasRespuestaSchema }),
  })

export const consultaTarea = (claseId: string, tareaId: string) =>
  queryOptions({
    queryKey: claveTarea(claseId, tareaId),
    queryFn: () =>
      api(`/api/clases/${claseId}/tareas/${tareaId}`, { schema: tareaRespuestaSchema }),
  })
