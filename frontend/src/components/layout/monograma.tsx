import { cn } from "@/lib/utils"

import { NOMBRE_PRODUCTO } from "./data"

interface MonogramaProps {
  className?: string
}

// Decorativo (aria-hidden): "cm" en tarjeta con el radio de §5. Lo usan components/layout y
// features/auth (regla 5 de CLAUDE.md: código usado por 2 o más módulos sube a components/).
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
