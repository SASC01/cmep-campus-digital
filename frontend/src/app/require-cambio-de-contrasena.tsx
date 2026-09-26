import { Navigate, Outlet } from "react-router"

import { Cargando } from "@/components/cargando"
import { useMe } from "@/features/auth/hooks"
import { requiereCambioDeContrasena, rutaTrasLogin } from "@/features/auth/lib"

// Fuera de RequireSesion (DEC-17, C-01): un cambio pendiente responde 403 incluso en GET /me, así
// que esta guarda vive aparte. Sin cambio pendiente, /me responde 200 y no hay nada que mostrar
// aquí: se manda al dashboard del rol. Sin sesión (NO_AUTENTICADO), a /login, como las demás guardas.
export function RequireCambioDeContrasena() {
  const { data, error, isPending, isError } = useMe()

  if (isPending) {
    return (
      <div className="p-6">
        <Cargando />
      </div>
    )
  }

  if (isError) {
    if (requiereCambioDeContrasena(error)) return <Outlet />
    return <Navigate to="/login" replace />
  }

  return <Navigate to={rutaTrasLogin(data)} replace />
}
