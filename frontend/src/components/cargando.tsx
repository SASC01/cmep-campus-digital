import { LoaderCircle } from "lucide-react"

interface CargandoProps {
  texto?: string
}

export function Cargando({ texto = "Cargando…" }: CargandoProps) {
  return (
    <p
      role="status"
      aria-live="polite"
      className="inline-flex w-fit items-center gap-2 rounded-pill vidrio-fuerte px-4 py-2 text-muted-foreground"
    >
      <LoaderCircle aria-hidden="true" className="size-4 animate-spin motion-reduce:animate-none" />
      <span>{texto}</span>
    </p>
  )
}
