import { Link } from "react-router"

import { EstadoEntregaBadge } from "@/components/estado-entrega-badge"
import { estadoDeEntregaVisible } from "@/lib/estado-de-entrega"
import { formatearPuntos } from "@/lib/format"
import { vencimientoDe } from "@/lib/vencimiento"

import { TEXTOS_MIS_CALIFICACIONES } from "../data"
import { enlaceATarea } from "../lib"
import type { TareaDeMisCalificaciones } from "../types"

interface ListaDeMisCalificacionesProps {
  tareas: readonly TareaDeMisCalificaciones[]
}

// §D-13.4 (DESIGN.md §7.29): las tareas de la clase del alumno, con divisores de 1 px y sin fondo
// propio por fila (como el hilo privado, §7.25). Cada fila: el título (enlace al detalle, relativo a la clase),
// la categoría, la fecha límite con el texto de vencimientoDe, la insignia del estado y, si está
// calificada, "8.5 de 10". Cada fila lleva el id de la tarea para el foco de "Ver más tareas".
export function ListaDeMisCalificaciones({ tareas }: ListaDeMisCalificacionesProps) {
  const ahora = new Date()

  return (
    <ul className="flex flex-col">
      {tareas.map((tarea) => {
        const vencimiento = vencimientoDe(tarea.fechaLimite, ahora)
        const estado = estadoDeEntregaVisible(tarea.entrega, tarea.fechaLimite, ahora)
        const calificacion =
          tarea.entrega.estado === "calificado" ? tarea.entrega.calificacion : null

        return (
          <li
            key={tarea.id}
            data-tarea-de-mis-calificaciones={tarea.id}
            className="flex flex-col gap-2 border-b border-border py-3 last:border-0 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex min-w-0 flex-col gap-1">
              <Link
                to={enlaceATarea(tarea.id)}
                relative="path"
                className="font-bold wrap-anywhere text-link underline-offset-4 hover:underline"
              >
                {tarea.titulo}
              </Link>
              <p className="text-small wrap-anywhere text-muted-foreground">
                {tarea.categoria?.nombre ?? TEXTOS_MIS_CALIFICACIONES.sinCategoria}
              </p>
              <p className="text-small text-muted-foreground">{vencimiento.texto}</p>
            </div>
            <div className="flex shrink-0 items-center gap-3">
              <EstadoEntregaBadge estado={estado} />
              {calificacion !== null && (
                <span className="font-bold tabular-nums">
                  {TEXTOS_MIS_CALIFICACIONES.calificacionDe(
                    formatearPuntos(calificacion),
                    formatearPuntos(tarea.puntos),
                  )}
                </span>
              )}
            </div>
          </li>
        )
      })}
    </ul>
  )
}
