import { Link } from "react-router"

import { cn } from "@/lib/utils"

import { TEXTOS_TRABAJO } from "../data"
import { cuadroDeFecha, segundaLineaDeLaFila } from "../lib"
import type { ElementoDeTrabajo } from "../types"

interface FilaDeEntregaProps {
  titulo: string
  fechaLimite: string
  // El detalle de la tarea en la perspectiva de quien mira (lo arma la sección con la base de la ruta).
  destino: string
  // ENTREGAS-01d (§D-9.8): la entrega del alumno (o null si aún no tiene). Solo la perspectiva del
  // estudiante la pasa; sin ella (maestro y admin) la fila es la de siempre, con el vencimiento.
  entrega?: ElementoDeTrabajo["entrega"] | undefined
}

// §D-11, DESIGN.md §7.7: una tarea en "Trabajo de clase". La fila entera es un enlace al detalle, en
// vidrio fuerte, con el cuadro de fecha a la izquierda (44 × 44 px) y, a la derecha, el título y el
// estado en palabras (vencimientoDe, S-10; para el alumno, el estado de su entrega desde ENTREGAS-01d,
// §D-9.8). El estado nunca se dice solo con color: el texto lo nombra,
// y el enlace empieza con "Tarea:" para quien no ve el cuadro.
export function FilaDeEntrega({ titulo, fechaLimite, destino, entrega }: FilaDeEntregaProps) {
  const { texto, colores } = segundaLineaDeLaFila(fechaLimite, entrega, new Date())
  const cuadro = cuadroDeFecha(fechaLimite)

  return (
    <Link
      to={destino}
      className="vidrio-fuerte flex items-center gap-3 rounded-row p-4 text-foreground"
    >
      <span
        aria-hidden="true"
        className={cn(
          "flex size-11 shrink-0 flex-col items-center justify-center rounded-date",
          colores.cuadro,
        )}
      >
        <span className="text-h2 tabular-nums">
          {cuadro?.dia ?? TEXTOS_TRABAJO.diaNoDisponible}
        </span>
        <span className="text-caption font-bold">{cuadro?.mes ?? ""}</span>
      </span>
      <span className="flex min-w-0 flex-col">
        <span className="line-clamp-2 font-bold wrap-anywhere">
          <span className="sr-only">{TEXTOS_TRABAJO.tarea}</span> {titulo}
        </span>
        <span className={cn("text-small", colores.estado)}>{texto}</span>
      </span>
    </Link>
  )
}
