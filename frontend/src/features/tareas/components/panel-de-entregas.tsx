import { Link } from "react-router"

import { buttonVariants } from "@/components/ui/button-variants"
import { Card, CardContent } from "@/components/ui/card"

import { TEXTOS_ENTREGAS } from "../data"
import { enlaceAEntregas } from "../lib"

interface PanelDeEntregasProps {
  // La ruta base de la clase en la perspectiva actual (maestro o admin).
  base: string
  tareaId: string
}

// ENTREGAS-01e (§D-10.1, DESIGN.md §7.20): el panel "Entregas" del detalle para maestro y admin, con el
// enlace "Ver entregas" a la lista de la tarea. No pide nada: el conteo vive en la vista "Entregas".
export function PanelDeEntregas({ base, tareaId }: PanelDeEntregasProps) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-3">
        <h3 className="text-h3">{TEXTOS_ENTREGAS.titulo}</h3>
        <Link
          to={enlaceAEntregas(base, tareaId)}
          className={buttonVariants({ variant: "outline", className: "self-start" })}
        >
          {TEXTOS_ENTREGAS.verEntregas}
        </Link>
      </CardContent>
    </Card>
  )
}
