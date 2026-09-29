import { Ban, CircleCheck, Clock } from "lucide-react"

import { Badge } from "@/components/ui/badge"

import { etiquetaDeEstadoEnlace } from "../lib"
import type { EstadoEnlaceRegistro } from "../types"

interface InsigniaEstadoEnlaceProps {
  estado: EstadoEnlaceRegistro
}

// DESIGN.md §7.8: Vigente (success, CircleCheck), Vencido (muted, Clock) y Revocado (danger, Ban).
export function InsigniaEstadoEnlace({ estado }: InsigniaEstadoEnlaceProps) {
  if (estado === "vigente") {
    return (
      <Badge variant="success" icon={<CircleCheck aria-hidden="true" />}>
        {etiquetaDeEstadoEnlace(estado)}
      </Badge>
    )
  }

  if (estado === "vencido") {
    return (
      <Badge variant="muted" icon={<Clock aria-hidden="true" />}>
        {etiquetaDeEstadoEnlace(estado)}
      </Badge>
    )
  }

  return (
    <Badge variant="danger" icon={<Ban aria-hidden="true" />}>
      {etiquetaDeEstadoEnlace(estado)}
    </Badge>
  )
}
