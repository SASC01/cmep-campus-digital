import { meRespuestaSchema } from "@campus/shared"
import { queryOptions } from "@tanstack/react-query"

import { api, ApiError } from "@/services/apiClient"
import { haySesion, restaurarSesion } from "@/services/authService"

// GET /me (DEC-13, R-19): compartida por features/auth (login, registro, cambio de contraseña) y
// features/clases (los inicios de estudiante y maestro, con useNombreDeSesion). Sin token en
// memoria, primero intenta restaurar la sesión con la cookie: una sola llamada a /refrescar por
// carga. Si no se restaura, lanza NO_AUTENTICADO sin llamar a /me y la guarda navega a /login con
// <Navigate> (M-08). Rol y banderas vienen siempre de aquí.
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
