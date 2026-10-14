import { Button } from "@/components/ui/button"

import { TEXTOS_DE_VENTANAS } from "../data"
import type { AccionDeVentana } from "../types"

interface NavegacionDelGradebookProps {
  hayTareasRecientes: boolean
  hayTareasAntiguas: boolean
  hayAlumnosAnteriores: boolean
  hayAlumnosSiguientes: boolean
  pidiendo: boolean
  onIr: (accion: AccionDeVentana) => void
}

// §D-13.3 (DESIGN.md §7.28): los cuatro botones de las ventanas, outline y sm. Cada uno solo si aplica
// (nunca un botón no disponible a la vista): "más antiguas" y "siguientes" con su cursor siguiente;
// "más recientes" y "anteriores" con su pila no vacía. Los cuatro en espera mientras la consulta pide
// algo (también una recarga de fondo); la guarda con ref vive en la vista. Cada botón lleva su acción
// en data-ventana, para que la vista sepa si el pulsado sigue a la vista al llegar la ventana nueva.
export function NavegacionDelGradebook({
  hayTareasRecientes,
  hayTareasAntiguas,
  hayAlumnosAnteriores,
  hayAlumnosSiguientes,
  pidiendo,
  onIr,
}: NavegacionDelGradebookProps) {
  if (!hayTareasRecientes && !hayTareasAntiguas && !hayAlumnosAnteriores && !hayAlumnosSiguientes) {
    return null
  }

  return (
    <div className="flex flex-wrap gap-2">
      {hayTareasRecientes && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          data-ventana="tareas-recientes"
          enEspera={pidiendo}
          onClick={() => onIr("tareas-recientes")}
        >
          {TEXTOS_DE_VENTANAS["tareas-recientes"]}
        </Button>
      )}
      {hayTareasAntiguas && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          data-ventana="tareas-antiguas"
          enEspera={pidiendo}
          onClick={() => onIr("tareas-antiguas")}
        >
          {TEXTOS_DE_VENTANAS["tareas-antiguas"]}
        </Button>
      )}
      {hayAlumnosAnteriores && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          data-ventana="alumnos-anteriores"
          enEspera={pidiendo}
          onClick={() => onIr("alumnos-anteriores")}
        >
          {TEXTOS_DE_VENTANAS["alumnos-anteriores"]}
        </Button>
      )}
      {hayAlumnosSiguientes && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          data-ventana="alumnos-siguientes"
          enEspera={pidiendo}
          onClick={() => onIr("alumnos-siguientes")}
        >
          {TEXTOS_DE_VENTANAS["alumnos-siguientes"]}
        </Button>
      )}
    </div>
  )
}
