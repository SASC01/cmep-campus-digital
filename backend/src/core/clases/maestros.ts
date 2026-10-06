import { MAXIMO_MAESTROS_POR_CLASE } from "@campus/shared"

import { AppError } from "../errores.js"

// Puras (§D-2A7): deciden qué hacer con la lista actual de maestros de una clase. El adaptador las
// llama dentro de la transacción, con la fila de la clase bloqueada.
export const decidirAsignacion = (
  actuales: readonly string[],
  maestroId: string,
): "ya_asignado" | "asignar" => {
  if (actuales.includes(maestroId)) return "ya_asignado"
  if (actuales.length >= MAXIMO_MAESTROS_POR_CLASE) {
    throw new AppError(
      "TOPE_DE_MAESTROS",
      "La clase ya tiene 2 maestros. Quita a uno antes de asignar a otro.",
      409,
    )
  }
  return "asignar"
}

export type DecisionDeRetiro = { tipo: "no_asignado" } | { tipo: "retirar"; restantes: string[] }

export const decidirRetiro = (actuales: readonly string[], maestroId: string): DecisionDeRetiro => {
  if (!actuales.includes(maestroId)) return { tipo: "no_asignado" }
  const restantes = actuales.filter((id) => id !== maestroId)
  if (restantes.length === 0) {
    throw new AppError(
      "CLASE_SIN_MAESTRO",
      "Una clase necesita al menos un maestro. Asigna a otro antes de quitar a este.",
      409,
    )
  }
  return { tipo: "retirar", restantes }
}
