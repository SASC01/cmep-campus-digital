import { TriangleAlert } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { formatearPorcentaje } from "@/lib/format"

import { TEXTOS_GRADEBOOK } from "../data"
import type { GradebookRespuesta } from "../types"

interface ResumenDelGradebookProps {
  resumen: GradebookRespuesta["resumen"]
}

// §D-13.3 (RF-37, DESIGN.md §7.28): el resumen de toda la clase, no de la ventana. "30 alumnos",
// "Promedio de la clase: 82.4 %" (o "—") y cuántos están en riesgo: con alguno, la insignia warning con
// su icono y su texto (el estado nunca solo con color); con ninguno, la insignia muted sin icono.
export function ResumenDelGradebook({ resumen }: ResumenDelGradebookProps) {
  const promedio =
    resumen.promedioDeLaClase === null
      ? TEXTOS_GRADEBOOK.sinDato
      : formatearPorcentaje(resumen.promedioDeLaClase)
  const enRiesgo = TEXTOS_GRADEBOOK.enRiesgoConteo(resumen.alumnosEnRiesgo)

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-small">
      <p className="tabular-nums">{TEXTOS_GRADEBOOK.alumnos(resumen.totalAlumnos)}</p>
      <p className="tabular-nums">{TEXTOS_GRADEBOOK.promedioDeLaClase(promedio)}</p>
      {resumen.alumnosEnRiesgo > 0 ? (
        <Badge variant="warning" icon={<TriangleAlert aria-hidden="true" />}>
          {enRiesgo}
        </Badge>
      ) : (
        <Badge variant="muted">{enRiesgo}</Badge>
      )}
    </div>
  )
}
