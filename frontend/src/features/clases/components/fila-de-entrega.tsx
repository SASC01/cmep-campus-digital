import { Link } from "react-router"

import { cn } from "@/lib/utils"
import { vencimientoDe } from "@/lib/vencimiento"

import { CLASES_DEL_CUADRO_DE_FECHA, TEXTOS_TRABAJO } from "../data"
import { cuadroDeFecha } from "../lib"

interface FilaDeEntregaProps {
  titulo: string
  fechaLimite: string
  // El detalle de la tarea en la perspectiva de quien mira (lo arma la sección con la base de la ruta).
  destino: string
}

// §D-11, DESIGN.md §7.7: una tarea en "Trabajo de clase". La fila entera es un enlace al detalle, en
// vidrio fuerte, con el cuadro de fecha a la izquierda (44 × 44 px) y, a la derecha, el título y el
// estado en palabras (vencimientoDe, S-10). El estado nunca se dice solo con color: el texto lo nombra,
// y el enlace empieza con "Tarea:" para quien no ve el cuadro.
export function FilaDeEntrega({ titulo, fechaLimite, destino }: FilaDeEntregaProps) {
  const vencimiento = vencimientoDe(fechaLimite, new Date())
  const cuadro = cuadroDeFecha(fechaLimite)
  const colores = CLASES_DEL_CUADRO_DE_FECHA[vencimiento.estado]

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
        <span className={cn("text-small", colores.estado)}>{vencimiento.texto}</span>
      </span>
    </Link>
  )
}
