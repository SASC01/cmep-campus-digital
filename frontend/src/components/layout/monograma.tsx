import { cn } from "@/lib/utils"

import { NOMBRE_PRODUCTO } from "./data"

interface MonogramaProps {
  className?: string
}

// Decorativo (aria-hidden): "cm" en tarjeta con el radio de §5. Lo usan solo las pantallas
// de cuenta de features/auth; la barra lateral dejó de montarlo (ajuste del humano, 2026-10-02).
export function Monograma({ className }: MonogramaProps) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex size-13 shrink-0 items-center justify-center rounded-card bg-brand font-heading text-h2 text-brand-foreground",
        className,
      )}
    >
      {NOMBRE_PRODUCTO.monograma}
    </span>
  )
}
