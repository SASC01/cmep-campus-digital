import type { Rol } from "@campus/shared"

import { AppError } from "../errores.js"
import { mensajeMaestroConClases, TEXTOS_USUARIOS } from "./textos.js"

export interface CambioDeActivo {
  rol: Rol
  activoActual: boolean
  activoPedido: boolean
  // Asignaciones del maestro en clases activas (P-01 a′: las archivadas no cuentan).
  clasesAsignadas: number
}

export const errorCuentaDeAdministracion = (): AppError =>
  new AppError("CUENTA_DE_ADMINISTRACION", TEXTOS_USUARIOS.cuentaDeAdministracion, 409)

export const errorMaestroConClases = (clasesActivas: number): AppError =>
  new AppError("MAESTRO_CON_CLASES", mensajeMaestroConClases(clasesActivas), 409)

// Pura (§D-7.4, P-01 a). La cuenta de administración nunca cambia. Pedir el estado que ya tiene no
// escribe (antes de mirar las clases: repetir la baja de un maestro ya inactivo no es un conflicto).
// Un maestro con clases activas no se da de baja: RN-06, una clase nunca queda sin maestro.
// Reactivar no depende de las clases.
export const decidirCambioDeActivo = ({
  rol,
  activoActual,
  activoPedido,
  clasesAsignadas,
}: CambioDeActivo): { escribir: boolean } | AppError => {
  if (rol === "admin") return errorCuentaDeAdministracion()
  if (activoActual === activoPedido) return { escribir: false }
  if (!activoPedido && rol === "maestro" && clasesAsignadas > 0) {
    return errorMaestroConClases(clasesAsignadas)
  }
  return { escribir: true }
}
