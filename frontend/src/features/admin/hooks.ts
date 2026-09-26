import {
  buscarUsuarioRespuestaSchema,
  contrasenaTemporalRespuestaSchema,
  usuarioAdminSchema,
  type BuscarUsuario,
  type InvitarMaestro,
} from "@campus/shared"
import { useMutation } from "@tanstack/react-query"

import { api } from "@/services/apiClient"

import type { CorregirCorreoVariables } from "./types"

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
