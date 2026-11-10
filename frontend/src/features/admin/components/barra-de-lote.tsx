import { Button } from "@/components/ui/button"

import { TEXTOS_ESTADO_PAGO } from "../data"
import type { EstadoPago } from "../types"

interface BarraDeLoteProps {
  cuantos: number
  onMarcar: (destino: EstadoPago) => void
}

// ADMIN-01g (§D-11, DESIGN.md §7.9): la barra de la selección, en el flujo de la vista (no fija). Dice
// cuántos alumnos van elegidos y abre el diálogo del lote con su destino; `data-destino` dice a qué botón
// vuelve el foco al cerrarlo.
export function BarraDeLote({ cuantos, onMarcar }: BarraDeLoteProps) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-row border border-border bg-muted p-3">
      <p className="text-small font-bold" aria-live="polite">
        {TEXTOS_ESTADO_PAGO.seleccionados(cuantos)}
      </p>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          data-destino="deudor"
          onClick={() => onMarcar("deudor")}
        >
          {TEXTOS_ESTADO_PAGO.marcarDeudores}
        </Button>
        <Button
          type="button"
          variant="outline"
          data-destino="al_corriente"
          onClick={() => onMarcar("al_corriente")}
        >
          {TEXTOS_ESTADO_PAGO.marcarAlCorrienteLote}
        </Button>
      </div>
    </div>
  )
}
