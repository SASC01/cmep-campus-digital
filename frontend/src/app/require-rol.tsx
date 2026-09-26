import { Navigate } from "react-router"

import { Cargando } from "@/components/cargando"
import { ContenedorRol } from "@/components/layout/contenedor-rol"
import type { Rol } from "@/components/layout/types"
import { useCerrarSesion, useMe } from "@/features/auth/hooks"
import { etiquetaDeRol, requiereCambioDeContrasena, rutaPorRol } from "@/features/auth/lib"

interface RequireRolProps {
  rol: Rol
}

// El rol y la restricción se leen de GET /me (caché de useMe), nunca del token (DEC-13). Un rol
// distinto vuelve a su propio dashboard; un restringido, a su única pantalla (RN-03); un cambio de
// contraseña pendiente (DEC-17), a /cambiar-contrasena.
export function RequireRol({ rol }: RequireRolProps) {
  const { data, error, isPending, isError } = useMe()
  const cerrarSesion = useCerrarSesion()

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

  if (data.accesoRestringido) {
    return <Navigate to="/acceso-restringido" replace />
  }

  if (data.rol !== rol) {
    return <Navigate to={rutaPorRol(data.rol)} replace />
  }

  return (
    <ContenedorRol
      rol={rol}
      nombre={data.nombre}
      etiquetaRol={etiquetaDeRol(rol)}
      onCerrarSesion={() => cerrarSesion.mutate()}
      cerrando={cerrarSesion.isPending}
    />
  )
}
