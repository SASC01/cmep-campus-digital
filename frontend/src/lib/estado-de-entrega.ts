import type { EstadoEntrega } from "@campus/shared"

import { vencimientoDe } from "@/lib/vencimiento"

// ENTREGAS-01d (§D-9.1, DESIGN.md §7.7 y §7.8). El estado visible de la entrega de un alumno: lo usan
// "Trabajo de clase" (features/clases) y "Tu trabajo" (features/tareas), por eso vive aquí (regla 5
// de CLAUDE.md). Puro: recibe `ahora`. "Sin entregar" no se guarda: es una entrega sin hacer (o
// anulada) con la fecha límite ya vencida, con el mismo criterio que vencimientoDe.

export type EstadoDeEntregaVisible =
  "asignado" | "sin-entregar" | "entregado" | "entregado-con-retraso" | "calificado"

export interface EntregaParaElEstado {
  estado: EstadoEntrega
  conRetraso: boolean
}

export const TEXTOS_ESTADO_DE_ENTREGA: Readonly<Record<EstadoDeEntregaVisible, string>> = {
  asignado: "Asignado",
  "sin-entregar": "Sin entregar",
  entregado: "Entregado",
  "entregado-con-retraso": "Entregado con retraso",
  calificado: "Calificado",
}

export const estadoDeEntregaVisible = (
  entrega: EntregaParaElEstado | null,
  fechaLimiteIso: string,
  ahora: Date,
): EstadoDeEntregaVisible => {
  if (entrega?.estado === "calificado") return "calificado"
  if (entrega?.estado === "entregado" && entrega.conRetraso) return "entregado-con-retraso"
  if (entrega?.estado === "entregado") return "entregado"
  if (vencimientoDe(fechaLimiteIso, ahora).estado === "vencida") return "sin-entregar"
  return "asignado"
}
