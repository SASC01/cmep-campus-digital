import { Card, CardContent } from "@/components/ui/card"

import { TEXTOS_DETALLE_TAREA } from "../data"

// S-12, DESIGN.md §7.20: el panel "Tu trabajo" del alumno. Todavía no hay entregas en Campus Digital:
// el panel lo dice y no ofrece ninguna acción. Lo reemplazará ENTREGAS.
export function TuTrabajo() {
  return (
    <Card>
      <CardContent className="flex flex-col gap-2">
        <h3 className="text-h3">{TEXTOS_DETALLE_TAREA.tuTrabajo}</h3>
        <p className="text-small text-muted-foreground">{TEXTOS_DETALLE_TAREA.tuTrabajoTexto}</p>
      </CardContent>
    </Card>
  )
}
