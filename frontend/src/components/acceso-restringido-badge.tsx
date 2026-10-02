import { Lock } from "lucide-react"

import { Badge } from "@/components/ui/badge"

// DESIGN.md §7.8: Acceso restringido (danger, Lock). El rojo vive solo en badge.tsx (V-13).
export function AccesoRestringidoBadge() {
  return (
    <Badge variant="danger" icon={<Lock aria-hidden="true" />}>
      Acceso restringido
    </Badge>
  )
}
