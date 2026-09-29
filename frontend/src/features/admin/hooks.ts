import {
  buscarUsuarioRespuestaSchema,
  contrasenaTemporalRespuestaSchema,
  crearEnlaceRegistroRespuestaSchema,
  enlaceRegistroRespuestaSchema,
  listaEnlacesRegistroRespuestaSchema,
  listaRegistradosRespuestaSchema,
  usuarioAdminSchema,
  type BuscarUsuario,
  type CrearEnlaceRegistro,
  type InvitarMaestro,
} from "@campus/shared"
import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query"

import { sacarDeLaCacheAlAsentar } from "@/lib/cache-de-mutaciones"
import { api } from "@/services/apiClient"

import type { CorregirCorreoVariables } from "./types"

const LIMITE_ENLACES = 20

const conCursor = (limite: number, cursor?: string): string => {
  const parametros = new URLSearchParams({ limite: String(limite) })
  if (cursor !== undefined) parametros.set("cursor", cursor)
  return parametros.toString()
}

// AUTH-03b, §D-B6: lista paginada de enlaces de registro ("Cargar más enlaces").
export const useEnlacesRegistro = () =>
  useInfiniteQuery({
    queryKey: ["admin", "enlaces-registro"],
    queryFn: ({ pageParam }: { pageParam: string | undefined }) =>
      api(`/api/admin/enlaces-registro?${conCursor(LIMITE_ENLACES, pageParam)}`, {
        schema: listaEnlacesRegistroRespuestaSchema,
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (ultimaPagina) => ultimaPagina.siguienteCursor ?? undefined,
  })

const CLAVE_MUTACION_GENERAR_ENLACE = ["generar-enlace"] as const

// M-05, R-09: el token sale de la caché de mutaciones al asentarse (gcTime 0); quien lo usa lo
// copia a su propio estado en el onSuccess, antes de que se limpie.
export const useGenerarEnlace = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationKey: CLAVE_MUTACION_GENERAR_ENLACE,
    mutationFn: (datos: CrearEnlaceRegistro) =>
      api("/api/admin/enlaces-registro", {
        method: "POST",
        body: datos,
        schema: crearEnlaceRegistroRespuestaSchema,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin", "enlaces-registro"] })
    },
    onSettled: () => sacarDeLaCacheAlAsentar(queryClient, CLAVE_MUTACION_GENERAR_ENLACE),
    gcTime: 0,
  })
}

// Idempotente en el servidor: revocar un enlace ya revocado responde 200.
export const useRevocarEnlace = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      api(`/api/admin/enlaces-registro/${id}/revocar`, {
        method: "POST",
        schema: enlaceRegistroRespuestaSchema,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin", "enlaces-registro"] })
    },
  })
}

export const useRegistradosDelEnlace = (enlaceId: string) =>
  useInfiniteQuery({
    queryKey: ["admin", "enlaces-registro", enlaceId, "registrados"],
    queryFn: ({ pageParam }: { pageParam: string | undefined }) =>
      api(
        `/api/admin/enlaces-registro/${enlaceId}/registrados?${conCursor(LIMITE_ENLACES, pageParam)}`,
        {
          schema: listaRegistradosRespuestaSchema,
        },
      ),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (ultimaPagina) => ultimaPagina.siguienteCursor ?? undefined,
  })

// DEC-11. 201 con la cuenta creada (sin hash ni token).
export const useInvitarMaestro = () =>
  useMutation({
    mutationFn: (datos: InvitarMaestro) =>
      api("/api/admin/maestros", { method: "POST", body: datos, schema: usuarioAdminSchema }),
  })

// DEC-10 (P-04). Coincidencia exacta normalizada por el índice único de email.
export const useBuscarCuenta = () =>
  useMutation({
    mutationFn: (datos: BuscarUsuario) =>
      api("/api/admin/usuarios/buscar", {
        method: "POST",
        body: datos,
        schema: buscarUsuarioRespuestaSchema,
      }),
  })

// DEC-19: gcTime 0 para que la temporal no quede en la caché de mutaciones. El componente que la
// usa se remonta (key por id de usuario) al buscar otra cuenta, así también desaparece de la vista.
export const useRestablecerContrasena = () =>
  useMutation({
    mutationFn: (id: string) =>
      api(`/api/admin/usuarios/${id}/restablecer-contrasena`, {
        method: "POST",
        schema: contrasenaTemporalRespuestaSchema,
      }),
    gcTime: 0,
  })

// DEC-10. No revoca sesiones (S-06): el correo no es la credencial.
export const useCorregirCorreo = () =>
  useMutation({
    mutationFn: ({ id, datos }: CorregirCorreoVariables) =>
      api(`/api/admin/usuarios/${id}/correo`, {
        method: "PUT",
        body: datos,
        schema: usuarioAdminSchema,
      }),
  })
