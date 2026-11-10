import { TEXTOS_CATEGORIAS } from "../data"
import type { Categoria } from "../types"

interface CategoriasDeSoloLecturaProps {
  categorias: readonly Categoria[]
}

// ADMIN-01d1 (§D-9, fila 15): las categorías de una clase archivada, en lugar del editor. Cada una con su
// nombre y su peso, en filas con divisores dentro del panel de la vista; es texto, sin controles.
export function CategoriasDeSoloLectura({ categorias }: CategoriasDeSoloLecturaProps) {
  if (categorias.length === 0) {
    return <p className="text-small text-muted-foreground">{TEXTOS_CATEGORIAS.vacio}</p>
  }

  return (
    <ul className="flex flex-col">
      {categorias.map((categoria) => (
        <li
          key={categoria.id}
          className="flex items-start justify-between gap-3 border-b border-border py-3 last:border-0"
        >
          <span className="min-w-0 wrap-anywhere">{categoria.nombre}</span>
          <span className="shrink-0 tabular-nums">
            {categoria.peso} {TEXTOS_CATEGORIAS.sufijoPeso}
          </span>
        </li>
      ))}
    </ul>
  )
}
