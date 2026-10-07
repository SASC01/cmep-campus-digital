import type { Adjunto } from "@campus/shared"
import { FileText } from "lucide-react"

import { TEXTOS_ADJUNTOS } from "@/components/adjuntos/data"
import { Button } from "@/components/ui/button"
import { formatearTamano } from "@/lib/format"

interface ListaDeAdjuntosPublicadosProps {
  adjuntos: readonly Adjunto[]
  onQuitar: (indice: number) => void
}

// §D-10, DESIGN.md §7.19 y §7.21: los archivos que la tarea ya tiene publicados, al editarla. Misma
// fila que la de los elegidos, con "Quitar" (el nombre solo para lectores de pantalla). Quitar solo
// cambia estado local: el archivo sale de la tarea al guardar. El foco lo resuelve el formulario.
export function ListaDeAdjuntosPublicados({ adjuntos, onQuitar }: ListaDeAdjuntosPublicadosProps) {
  return (
    <ul aria-label={TEXTOS_ADJUNTOS.adjuntos} className="flex flex-col gap-2">
      {adjuntos.map((adjunto, indice) => (
        <li
          key={adjunto.id}
          className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-row bg-muted px-3 py-2"
        >
          <FileText aria-hidden="true" className="size-4 shrink-0 text-foreground" />
          <span className="min-w-0 flex-1 wrap-anywhere text-small font-bold text-foreground">
            {adjunto.nombre}
          </span>
          <span className="text-small text-muted-foreground">
            {formatearTamano(adjunto.tamano)}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            data-quitar-publicado={indice}
            onClick={() => onQuitar(indice)}
          >
            {TEXTOS_ADJUNTOS.quitar} <span className="sr-only">{adjunto.nombre}</span>
          </Button>
        </li>
      ))}
    </ul>
  )
}
