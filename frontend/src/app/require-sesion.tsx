import { Navigate, Outlet } from "react-router"

import { Cargando } from "@/components/cargando"
import { useMe } from "@/features/auth/hooks"
import { requiereCambioDeContrasena } from "@/features/auth/lib"

// Sin sesión restaurable, useMe falla sin llamar a /me y se navega a /login sin recarga (M-08).
// Solo evita pantallas vacías: la seguridad real está en el middleware del backend. Con un cambio
// de contraseña pendiente (DEC-17), se navega a /cambiar-contrasena en vez de a /login.
export function RequireSesion() {
  const { error, isPending, isError } = useMe()

  if (isError) {
    if (requiereCambioDeContrasena(error)) return <Navigate to="/cambiar-contrasena" replace />
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
