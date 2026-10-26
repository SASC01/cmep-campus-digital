import { fraseDeCalificacion, fraseDeFechaDeCalificacion, fraseDePuntaje } from "../lib"
import type { CalificacionDeEntrega } from "../types"

interface CalificacionDeLaEntregaProps {
  calificacion: CalificacionDeEntrega
}

// CALIFICACIONES-01c (§D-12.6, S-13, DESIGN.md §7.27): la calificación publicada, en solo lectura:
// "Calificación: 8.5 de 10", cuándo se calificó y, con rúbrica, el desglose por criterio. La usan
// "Tu trabajo" del alumno y la entrega de un alumno vista por la administración.
export function CalificacionDeLaEntrega({ calificacion }: CalificacionDeLaEntregaProps) {
  return (
    <div className="flex flex-col gap-1">
      <p className="text-body font-bold text-foreground">{fraseDeCalificacion(calificacion)}</p>
      <p className="text-small text-muted-foreground">{fraseDeFechaDeCalificacion(calificacion)}</p>
      {calificacion.puntajes.length > 0 && (
        <ul className="flex flex-col gap-1 pt-1">
          {calificacion.puntajes.map((puntaje) => (
            <li key={puntaje.criterioId} className="wrap-anywhere text-small text-foreground">
              {fraseDePuntaje(puntaje)}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
