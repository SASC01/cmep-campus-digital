import { meRespuestaSchema, sinContenidoSchema } from "@campus/shared"
import {
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query"
import { useEffect, useMemo, useState } from "react"
import { useLocation, useNavigate } from "react-router"

import { api, ApiError, esApiError } from "@/services/apiClient"
import { haySesion, login, logout, registro, restaurarSesion } from "@/services/authService"

import { ANUNCIOS_DE_EJEMPLO, TEXTOS_NUEVA_CONTRASENA } from "./data"
import { leerTokenDelFragmento, ordenarAnuncios, rutaTrasLogin } from "./lib"
import type {
  Anuncio,
  CambiarContrasena,
  EstadoDeNavegacionLogin,
  Login,
  NuevaContrasenaConToken,
  Recuperar,
  Registro,
  TipoEnlace,
} from "./types"

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

// DEC-04: la API siempre responde 204, exista o no la cuenta. La vista muestra la confirmación fija
// en cuanto la mutación tiene éxito.
export const useRecuperar = () =>
  useMutation({
    mutationFn: (datos: Recuperar) =>
      api("/api/auth/recuperar", { method: "POST", body: datos, schema: sinContenidoSchema }),
  })

// DEC-18/T-01 (ronda 2): el token y la contraseña no pueden depender de cuándo React desmonte el
// formulario para salir de la caché de mutaciones. Una navegación de React Router puede tardar más
// (transición de baja prioridad) que la propia espera de quien vigila la caché, así que se saca la
// mutación en cuanto se asienta (éxito o error), sin esperar al desmontaje. gcTime 0 queda como
// defensa adicional para cualquier otra ruta de limpieza (por ejemplo, si el observador ya no existe).
const sacarDeLaCacheAlAsentar = (queryClient: QueryClient, mutationKey: readonly unknown[]) => {
  const cache = queryClient.getMutationCache()
  for (const mutacion of cache.findAll({ mutationKey })) cache.remove(mutacion)
}

const CLAVE_MUTACION_NUEVA_CONTRASENA = ["nueva-contrasena"] as const

// DEC-17: /restablecer (recuperación) y /establecer-contrasena (invitación) comparten forma y
// esquema; solo cambian la ruta y el aviso que se muestra en /login. No inician sesión (S-04).
export const useNuevaContrasena = (tipo: TipoEnlace) => {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const ruta = tipo === "recuperacion" ? "/api/auth/restablecer" : "/api/auth/establecer-contrasena"
  const aviso = TEXTOS_NUEVA_CONTRASENA[tipo].avisoLogin
  return useMutation({
    mutationKey: CLAVE_MUTACION_NUEVA_CONTRASENA,
    mutationFn: (datos: NuevaContrasenaConToken) =>
      api(ruta, { method: "POST", body: datos, schema: sinContenidoSchema }),
    onSuccess: async () => {
      const estado: EstadoDeNavegacionLogin = { aviso }
      await navigate("/login", { state: estado })
    },
    onSettled: () => sacarDeLaCacheAlAsentar(queryClient, CLAVE_MUTACION_NUEVA_CONTRASENA),
    gcTime: 0,
  })
}

const CLAVE_MUTACION_CAMBIAR_CONTRASENA = ["cambiar-contrasena"] as const

// DEC-09: conserva la sesión actual (la cookie de refresco decide cuál) y revoca las demás. Tras
// cambiarla, /me ya no exige el cambio: se descarta la caché y se consulta de nuevo antes de decidir
// el destino (mismo patrón que consultarMeDeLaCuentaNueva).
export const useCambiarContrasena = () => {
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  // Compartido entre el éxito y el 409 CAMBIO_NO_REQUERIDO (T-02, ronda 2): en los dos casos ya no
  // hay cambio pendiente, así que el destino es el mismo dashboard que /me decida.
  const avanzarTrasCambio = async () => {
    queryClient.removeQueries({ queryKey: consultaMe.queryKey })
    const me = await queryClient.fetchQuery(consultaMe)
    await navigate(rutaTrasLogin(me), { replace: true })
  }

  return useMutation({
    mutationKey: CLAVE_MUTACION_CAMBIAR_CONTRASENA,
    mutationFn: (datos: CambiarContrasena) =>
      api("/api/auth/cambiar-contrasena", {
        method: "POST",
        body: datos,
        schema: sinContenidoSchema,
      }),
    onSuccess: avanzarTrasCambio,
    onError: async (error) => {
      if (!esApiError(error) || error.codigo !== "CAMBIO_NO_REQUERIDO") return
      // Si /me insiste en que el cambio sigue pendiente (otra carrera), el usuario se queda en el
      // formulario con el mensaje propio de CAMBIO_NO_REQUERIDO, no con uno genérico que invite a
      // reintentar algo que ya no puede funcionar.
      await avanzarTrasCambio().catch(() => undefined)
    },
    onSettled: () => sacarDeLaCacheAlAsentar(queryClient, CLAVE_MUTACION_CAMBIAR_CONTRASENA),
    gcTime: 0,
  })
}

// DEC-18: el token vive solo en el estado de React, nunca en localStorage, sessionStorage, la
// caché de TanStack Query ni la URL después de leerlo. Se lee una sola vez (useState con
// inicializador) y el efecto lo quita del historial de inmediato.
export const useTokenDelEnlace = (): string | null => {
  const location = useLocation()
  const navigate = useNavigate()
  const [token] = useState(() => leerTokenDelFragmento(location.hash))

  useEffect(() => {
    if (location.hash === "") return
    void navigate(
      { pathname: location.pathname, search: location.search, hash: "" },
      { replace: true },
    )
    // location.hash queda "" tras el replace: la siguiente ejecución del efecto solo confirma que
    // ya no hay nada que limpiar.
  }, [location.hash, location.pathname, location.search, navigate])

  return token
}
