import { ClipboardList } from "lucide-react"
import { Link } from "react-router"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { formatearFechaHora } from "@/lib/format"
import { baseDeClase } from "@/lib/ruta-de-clase"
import { TEXTO_FECHA_NO_DISPONIBLE, varianteDeVencimiento, vencimientoDe } from "@/lib/vencimiento"

import { TEXTOS_TARJETA_DE_TAREA } from "../data"
import type { Perspectiva, Publicacion } from "../types"
import { FirmaDelAutor } from "./firma-del-autor"

interface LineaDeLaTareaProps {
  tarea: NonNullable<Publicacion["tarea"]>
}

// "<vencimiento> · <n> puntos": la insignia de vencimiento (§7.7) y los puntos.
function LineaDeLaTarea({ tarea }: LineaDeLaTareaProps) {
  const vencimiento = vencimientoDe(tarea.fechaLimite, new Date())

  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
      <Badge variant={varianteDeVencimiento(vencimiento.estado)}>{vencimiento.texto}</Badge>
      <span className="text-small text-muted-foreground">
        · {TEXTOS_TARJETA_DE_TAREA.puntos(tarea.puntos)}
      </span>
    </div>
  )
}

interface TarjetaDeTareaProps {
  claseId: string
  publicacion: Publicacion
  // null es la forma que el esquema admite para un elemento de tipo tarea sin su resumen (no debería
  // llegar): la tarjeta lo dice con una insignia explícita, sin acciones ni comentarios.
  tarea: Publicacion["tarea"]
  perspectiva: Perspectiva
}

// §D-10, DESIGN.md §7.18: una tarea en el muro. Insignia "Tarea" (texto e icono), firma y fecha, el
// título como enlace al detalle de la perspectiva (la recibe por props de PublicacionDelMuro, que la
// saca de la ruta) y "<vencimiento> · <n> puntos". Sin comentarios ni borrado: se editan y borran desde
// su detalle. Conserva `data-publicacion-id` y `tabIndex` para el foco de la lista (§7.14).
export function TarjetaDeTarea({ claseId, publicacion, tarea, perspectiva }: TarjetaDeTareaProps) {
  return (
    <Card data-publicacion-id={publicacion.id} tabIndex={-1} className="gap-3">
      <CardContent className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <Badge variant="muted" icon={<ClipboardList aria-hidden="true" />}>
            {TEXTOS_TARJETA_DE_TAREA.insignia}
          </Badge>
          <p className="text-small text-muted-foreground">
            <FirmaDelAutor autor={publicacion.autor} /> · {formatearFechaHora(publicacion.creadoEn)}
          </p>
        </div>

        <h3 className="wrap-anywhere text-h3">
          <Link
            to={`${baseDeClase(perspectiva, claseId)}/tareas/${publicacion.id}`}
            className="text-link underline-offset-4 hover:underline"
          >
            {publicacion.titulo}
          </Link>
        </h3>

        {tarea === null && <Badge variant="muted">{TEXTO_FECHA_NO_DISPONIBLE}</Badge>}
        {tarea !== null && <LineaDeLaTarea tarea={tarea} />}
      </CardContent>
    </Card>
  )
}
