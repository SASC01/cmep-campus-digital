import { Check, Clock } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { TEXTOS_ESTADO_DE_ENTREGA, type EstadoDeEntregaVisible } from "@/lib/estado-de-entrega"

interface EstadoEntregaBadgeProps {
  estado: EstadoDeEntregaVisible
}

// ENTREGAS-01d (§D-9.1, DESIGN.md §7.8): la insignia del estado de una entrega, con su texto (y, en
// "Entregado" y "Entregado con retraso", su icono): el estado nunca se dice solo con color. Sin valor
// por defecto: un estado desconocido no tiene rama (el último return es de tipo never).
export function EstadoEntregaBadge({ estado }: EstadoEntregaBadgeProps) {
  const texto = TEXTOS_ESTADO_DE_ENTREGA[estado]
  if (estado === "asignado") return <Badge variant="muted">{texto}</Badge>
  if (estado === "sin-entregar") return <Badge variant="danger">{texto}</Badge>
  if (estado === "calificado") return <Badge variant="success">{texto}</Badge>
  if (estado === "entregado") {
    return (
      <Badge variant="success" icon={<Check aria-hidden="true" />}>
        {texto}
      </Badge>
    )
  }
  if (estado === "entregado-con-retraso") {
    return (
      <Badge variant="warning" icon={<Clock aria-hidden="true" />}>
        {texto}
      </Badge>
    )
  }
  return estado satisfies never
}
