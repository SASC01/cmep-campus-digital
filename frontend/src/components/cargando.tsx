import { LoaderCircle } from "lucide-react"

interface CargandoProps {
  texto?: string
}

export function Cargando({ texto = "Cargando…" }: CargandoProps) {
  return (
    <p role="status" aria-live="polite" className="flex items-center gap-2 text-muted-foreground">
      <LoaderCircle aria-hidden="true" className="size-4 animate-spin motion-reduce:animate-none" />
      <span>{texto}</span>
    </p>
  )
}
