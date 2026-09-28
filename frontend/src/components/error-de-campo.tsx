import { CircleAlert } from "lucide-react"
import type { ReactNode } from "react"

interface ErrorDeCampoProps {
  id: string
  children: ReactNode
}

// El rojo no llega a AA sobre vidrio al 62 % (DESIGN.md §3): el error de un campo va sobre un
// fondo sólido propio, nunca como texto rojo suelto (S-05, DESIGN-01a).
export function ErrorDeCampo({ id, children }: ErrorDeCampoProps) {
  return (
    <p
      id={id}
      className="flex items-start gap-2 rounded-row bg-danger-soft px-3 py-2 text-small text-destructive"
    >
      <CircleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
      {children}
    </p>
  )
}
