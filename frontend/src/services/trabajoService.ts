import {
  foroRespuestaSchema,
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
// FORO-01c1 (§D-8): todo lo del foro de una clase cuelga de un prefijo (invalidarlo lo alcanza todo);
// la lista de la sección "Foro" cuelga de él. FORO-01c2: cada foro, también, y lo de cada foro (sus
// participaciones, réplicas y participantes, 01d y 01e) colgará del suyo.
export const clavePrefijoDeForos = (claseId: string) => ["clases", claseId, "foros"] as const
export const claveListaDeForos = (claseId: string) =>
  [...clavePrefijoDeForos(claseId), "lista"] as const
// Corrección de la ronda 1 de 01c2 (T-01): cada foro va bajo el segmento fijo "foro", así su clave
// nunca coincide con la de la lista ni una es prefijo de la otra, aunque el id de la ruta sea "lista"
// (como "alumno" en las entregas de una tarea, features/tareas/lib.ts).
export const claveForo = (claseId: string, foroId: string) =>
  [...clavePrefijoDeForos(claseId), "foro", foroId] as const

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

export const consultaForo = (claseId: string, foroId: string) =>
  queryOptions({
    queryKey: claveForo(claseId, foroId),
    queryFn: () => api(`/api/clases/${claseId}/foros/${foroId}`, { schema: foroRespuestaSchema }),
  })
