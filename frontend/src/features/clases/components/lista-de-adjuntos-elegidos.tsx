import { FileText } from "lucide-react"

import { Button } from "@/components/ui/button"
import { formatearTamano } from "@/lib/format"

import { TEXTOS_ADJUNTOS } from "../data"

interface ListaDeAdjuntosElegidosProps {
  archivos: readonly File[]
  onQuitar: (indice: number) => void
}

// §D-D5, DESIGN.md §7.19: los archivos que el maestro eligió y todavía no sube. Cada fila lleva el
// nombre, el tamaño y "Quitar" (con el nombre del archivo solo para lectores de pantalla). Quitar
// solo cambia estado local: no espera nada y el foco lo resuelve el formulario (§7.14).
export function ListaDeAdjuntosElegidos({ archivos, onQuitar }: ListaDeAdjuntosElegidosProps) {
  return (
    <ul aria-label={TEXTOS_ADJUNTOS.elegidos} className="flex flex-col gap-2">
      {archivos.map((archivo, indice) => (
        <li
          key={`${archivo.name}-${indice}`}
          className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-row bg-muted px-3 py-2"
        >
          <FileText aria-hidden="true" className="size-4 shrink-0 text-foreground" />
          <span className="min-w-0 flex-1 wrap-anywhere text-small font-bold text-foreground">
            {archivo.name}
          </span>
          <span className="text-small text-muted-foreground">{formatearTamano(archivo.size)}</span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            data-quitar-indice={indice}
            onClick={() => onQuitar(indice)}
          >
            {TEXTOS_ADJUNTOS.quitar} <span className="sr-only">{archivo.name}</span>
          </Button>
        </li>
      ))}
    </ul>
  )
}
