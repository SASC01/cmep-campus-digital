import { meRespuestaSchema } from "@campus/shared"
import {
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query"
import { useMemo } from "react"
import { useNavigate } from "react-router"

import { api, ApiError } from "@/services/apiClient"
import { haySesion, login, logout, registro, restaurarSesion } from "@/services/authService"

import { ANUNCIOS_DE_EJEMPLO } from "./data"
import { ordenarAnuncios, rutaTrasLogin } from "./lib"
import type { Anuncio, Login, Registro } from "./types"

// Pasará a useQuery sobre el endpoint público de anuncios del login (RF-07) cuando exista.
export const useAnunciosLogin = (): { anuncios: Anuncio[] } => {
  const anuncios = useMemo(() => ordenarAnuncios(ANUNCIOS_DE_EJEMPLO), [])
  return { anuncios }
}

// GET /me (DEC-13). Sin token en memoria, primero intenta restaurar la sesión con la cookie: una
// sola llamada a /refrescar por carga. Si no se restaura, lanza NO_AUTENTICADO sin llamar a /me y
// la guarda navega a /login con <Navigate> (M-08). Rol y banderas vienen siempre de aquí.
export const consultaMe = queryOptions({
  queryKey: ["me"],
  queryFn: async () => {
    if (!haySesion()) {
      const restaurada = await restaurarSesion()
      if (!restaurada) {
        throw new ApiError("NO_AUTENTICADO", "Inicia sesión para continuar.", 401)
      }
    }
    return api("/api/me", { schema: meRespuestaSchema })
  },
  retry: false,
  staleTime: 60_000,
})

export const useMe = () => useQuery(consultaMe)

// Tras entrar, /me decide el destino (RF-05): nunca el token ni el formulario. El /me en caché puede
// ser de otra cuenta (T-02: alguien vuelve a /login y entra con otra), así que se descarta antes de
// consultar el de la cuenta nueva: una sola petición a /me, siempre fresca.
const consultarMeDeLaCuentaNueva = (queryClient: QueryClient) => {
  queryClient.removeQueries({ queryKey: consultaMe.queryKey })
  return queryClient.fetchQuery(consultaMe)
}

export const useLogin = () => {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  return useMutation({
    mutationFn: async (credenciales: Login) => {
      await login(credenciales)
      return consultarMeDeLaCuentaNueva(queryClient)
    },
    onSuccess: async (me) => {
      await navigate(rutaTrasLogin(me), { replace: true })
    },
  })
}

// Registro con sesión iniciada (P-01): mismo camino que el login.
export const useRegistro = () => {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  return useMutation({
    mutationFn: async (datos: Registro) => {
      await registro(datos)
      return consultarMeDeLaCuentaNueva(queryClient)
    },
    onSuccess: async (me) => {
      await navigate(rutaTrasLogin(me), { replace: true })
    },
  })
}

// DEC-15. logout nunca rechaza (un fallo de red no impide salir). Se navega a /login antes de
// vaciar la caché: así ninguna guarda montada vuelve a pedir /me con la caché vacía.
export const useCerrarSesion = () => {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  return useMutation({
    mutationFn: logout,
    onSettled: async () => {
      await navigate("/login", { replace: true })
      queryClient.clear()
    },
  })
}
