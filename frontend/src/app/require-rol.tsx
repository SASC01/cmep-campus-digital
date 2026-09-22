import { Outlet } from "react-router"

import type { Rol } from "@/components/layout/types"

interface RequireRolProps {
  rol: Rol
}

// El rol se leerá de GET /me (nunca del token) en el encargo de autenticación; hasta entonces
// RequireSesion ya redirige a /login porque no existe sesión. La prop rol queda en la firma para
// que las rutas declaren desde hoy qué exigen; se marca como no usada a propósito.
export function RequireRol({ rol }: RequireRolProps) {
  void rol
  return <Outlet />
}
