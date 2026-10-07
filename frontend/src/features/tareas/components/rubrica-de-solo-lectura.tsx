import { TEXTOS_DETALLE_TAREA } from "../data"
import type { CriterioDeRubrica } from "../types"

interface RubricaDeSoloLecturaProps {
  rubrica: readonly CriterioDeRubrica[]
}

// §D-10, DESIGN.md §7.20: la rúbrica de una tarea tal como la ve quien la lee (criterio y puntos, con
// el total). Texto plano (React lo escapa). Sin criterios no pinta nada: la rúbrica es opcional.
export function RubricaDeSoloLectura({ rubrica }: RubricaDeSoloLecturaProps) {
  if (rubrica.length === 0) return null

  const total = rubrica.reduce((suma, criterio) => suma + criterio.puntosMax, 0)

  return (
    <section className="flex flex-col gap-2">
      <h3 className="text-h3">{TEXTOS_DETALLE_TAREA.rubrica}</h3>
      <ul className="flex flex-col gap-2">
        {rubrica.map((criterio) => (
          <li
            key={criterio.id}
            className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 rounded-row bg-muted px-3 py-2"
          >
            <span className="min-w-0 flex-1 wrap-anywhere text-body text-foreground">
              {criterio.criterio}
            </span>
            <span className="text-small font-bold text-foreground">
              {TEXTOS_DETALLE_TAREA.puntosDeLaFila(criterio.puntosMax)}
            </span>
          </li>
        ))}
      </ul>
      <p className="text-small font-bold text-foreground">{TEXTOS_DETALLE_TAREA.total(total)}</p>
    </section>
  )
}
