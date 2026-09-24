import { Navigate, Outlet } from "react-router"

import { Cargando } from "@/components/cargando"
import { useMe } from "@/features/auth/hooks"

// Sin sesión restaurable, useMe falla sin llamar a /me y se navega a /login sin recarga (M-08).
// Solo evita pantallas vacías: la seguridad real está en el middleware del backend.
export function RequireSesion() {
  const { isPending, isError } = useMe()

  if (isError) {
    return <Navigate to="/login" replace />
  }

  if (isPending) {
    return (
      <div className="p-6">
        <Cargando />
      </div>
    )
  }

  return <Outlet />
}
