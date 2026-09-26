import type { Rol } from "@campus/shared"

import { AppError } from "../errores.js"

// El restablecimiento del admin nunca aplica a una cuenta admin (ESSENTIALS: "La del admin:
// npm run reset:admin"). Es una regla sobre el objetivo, no autorización de quien pide: la
// autorización de quien pide ya la aplicó requireRole(["admin"]) en la cadena.
export const evaluarObjetivoDeRestablecimiento = (objetivo: { rol: Rol }): AppError | null => {
  if (objetivo.rol !== "admin") return null
  return new AppError(
    "OPERACION_NO_PERMITIDA",
    "La contraseña del administrador se restablece desde el servidor con npm run reset:admin.",
    403,
  )
}
