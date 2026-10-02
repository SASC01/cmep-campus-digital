import type { EstadoPagoAlumno } from "@campus/shared"
import { CircleAlert, CircleCheck } from "lucide-react"

import { Badge } from "@/components/ui/badge"

interface EstadoPagoBadgeProps {
  estado: EstadoPagoAlumno
}

// DESIGN.md §7.8: Al corriente (success, CircleCheck) y Deudor (danger, CircleAlert). El estado
// nunca se comunica solo con color: lleva icono y texto. Sin valor por defecto (CLAUDE.md, "Valores
// por defecto"): un estado nuevo en shared/ no tiene rama y deja de compilar en el último return.
export function EstadoPagoBadge({ estado }: EstadoPagoBadgeProps) {
  if (estado === "al_corriente") {
    return (
      <Badge variant="success" icon={<CircleCheck aria-hidden="true" />}>
        Al corriente
      </Badge>
    )
  }

  if (estado === "deudor") {
    return (
      <Badge variant="danger" icon={<CircleAlert aria-hidden="true" />}>
        Deudor
      </Badge>
    )
  }

  return estado satisfies never
}
