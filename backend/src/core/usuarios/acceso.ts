import type { Rol } from "@campus/shared"

import { AppError } from "../errores.js"
import { TEXTOS_USUARIOS } from "./textos.js"

export interface PedidoDeAcceso {
  restringido: boolean
  // Ya normalizado por el esquema (S-10): un motivo sin caracteres visibles llega como undefined.
  motivo?: string | undefined
}

export interface CambioDeAcceso {
  rol: Rol
  restringidoActual: boolean
  motivoActual: string | null
  pedido: PedidoDeAcceso
}

export interface DecisionDeAcceso {
  escribir: boolean
  revocarSesiones: boolean
}

export const errorNoEsAlumno = (): AppError =>
  new AppError("NO_ES_ALUMNO", TEXTOS_USUARIOS.noEsAlumno, 409)

// Pura (§D-8, RF-55). Solo se restringe a un alumno. Restringir a quien no lo estaba escribe y
// revoca sus sesiones (RF-04c); restringir de nuevo con otro motivo solo cambia el motivo (la fecha
// se queda, lo resuelve el adaptador); restablecer escribe y no revoca nada. Pedir el estado que ya
// tiene, con el mismo motivo, no escribe.
export const decidirCambioDeAcceso = ({
  rol,
  restringidoActual,
  motivoActual,
  pedido,
}: CambioDeAcceso): DecisionDeAcceso | AppError => {
  if (rol !== "estudiante") return errorNoEsAlumno()
  if (!pedido.restringido) return { escribir: restringidoActual, revocarSesiones: false }
  if (!restringidoActual) return { escribir: true, revocarSesiones: true }
  const motivoPedido = pedido.motivo ?? null
  return { escribir: motivoPedido !== motivoActual, revocarSesiones: false }
}
