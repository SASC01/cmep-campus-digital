import { Navigate, Outlet } from "react-router"

import { haySesion } from "@/services/authService"

// Esqueleto honesto: solo evita pantallas vacías. La seguridad real está en el middleware del backend.
export function RequireSesion() {
  if (!haySesion()) return <Navigate to="/login" replace />
  return <Outlet />
}
