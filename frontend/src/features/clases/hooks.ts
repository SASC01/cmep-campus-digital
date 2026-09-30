import {
  claseRespuestaSchema,
  codigoClaseRespuestaSchema,
  listaClasesImpartidasRespuestaSchema,
  listaClasesInscritasRespuestaSchema,
  unirseRespuestaSchema,
  type CrearClase,
  type EditarClase,
  type Unirse,
} from "@campus/shared"
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { consultaMe } from "@/services/sesionService"
import { api } from "@/services/apiClient"

import {
  CLAVE_CLASES_IMPARTIDAS,
  CLAVE_CLASES_INSCRITAS,
  claveClaseDetalle,
  claveCodigoDeClase,
  LIMITE_CLASES,
} from "./data"

// El saludo del bloque destacado depende solo de la sesión (§D-A5): se ve aunque falle la consulta
// de clases. select evita volver a pedir /me: reutiliza la caché de consultaMe.
export const useNombreDeSesion = () => useQuery({ ...consultaMe, select: (me) => me.nombre })

const conCursor = (limite: number, cursor?: string): string => {
  const parametros = new URLSearchParams({ limite: String(limite) })
  if (cursor !== undefined) parametros.set("cursor", cursor)
  return parametros.toString()
}

export const useClasesInscritas = () =>
  useInfiniteQuery({
    queryKey: CLAVE_CLASES_INSCRITAS,
    queryFn: ({ pageParam }: { pageParam: string | undefined }) =>
      api(`/api/clases/inscritas?${conCursor(LIMITE_CLASES, pageParam)}`, {
        schema: listaClasesInscritasRespuestaSchema,
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (ultimaPagina) => ultimaPagina.siguienteCursor ?? undefined,
  })

export const useClasesImpartidas = () =>
  useInfiniteQuery({
    queryKey: CLAVE_CLASES_IMPARTIDAS,
    queryFn: ({ pageParam }: { pageParam: string | undefined }) =>
      api(`/api/clases/impartidas?${conCursor(LIMITE_CLASES, pageParam)}`, {
        schema: listaClasesImpartidasRespuestaSchema,
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (ultimaPagina) => ultimaPagina.siguienteCursor ?? undefined,
  })

export const useClase = (claseId: string) =>
  useQuery({
    queryKey: claveClaseDetalle(claseId),
    queryFn: () => api(`/api/clases/${claseId}`, { schema: claseRespuestaSchema }),
    select: (respuesta) => respuesta.clase,
  })

// enabled: solo el dueño pide el código (PR-A22e); un estudiante nunca llega a pedirlo.
export const useCodigoDeClase = (claseId: string, enabled: boolean) =>
  useQuery({
    queryKey: claveCodigoDeClase(claseId),
    queryFn: () => api(`/api/clases/${claseId}/codigo`, { schema: codigoClaseRespuestaSchema }),
    select: (respuesta) => respuesta.codigo,
    enabled,
    staleTime: 0,
    gcTime: 0,
  })

// Invalida las listas propias del rol tras crear, editar o unirse: los inicios y el panel quedan
// al día sin recargar.
const invalidarListasDeClases = (queryClient: ReturnType<typeof useQueryClient>) => {
  void queryClient.invalidateQueries({ queryKey: CLAVE_CLASES_INSCRITAS })
  void queryClient.invalidateQueries({ queryKey: CLAVE_CLASES_IMPARTIDAS })
}

export const useCrearClase = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (datos: CrearClase) =>
      api("/api/clases", { method: "POST", body: datos, schema: claseRespuestaSchema }),
    onSuccess: () => invalidarListasDeClases(queryClient),
  })
}

export const useEditarClase = (claseId: string) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (datos: EditarClase) =>
      api(`/api/clases/${claseId}`, {
        method: "PUT",
        body: datos,
        schema: claseRespuestaSchema,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: claveClaseDetalle(claseId) })
      invalidarListasDeClases(queryClient)
    },
  })
}

export const useRegenerarCodigo = (claseId: string) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () =>
      api(`/api/clases/${claseId}/codigo`, {
        method: "POST",
        schema: codigoClaseRespuestaSchema,
      }),
    onSuccess: (respuesta) => {
      queryClient.setQueryData(claveCodigoDeClase(claseId), respuesta)
    },
  })
}

export const useUnirseAClase = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (datos: Unirse) =>
      api("/api/clases/unirse", { method: "POST", body: datos, schema: unirseRespuestaSchema }),
    onSuccess: () => invalidarListasDeClases(queryClient),
  })
}
