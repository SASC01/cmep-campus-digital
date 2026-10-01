import { useParams } from "react-router"

import { BuscadorAlumnos } from "./components/buscador-alumnos"
import { TablaAlumnos } from "./components/tabla-alumnos"

// §D-B4: vista del maestro dueño (RF-38, RF-39): buscador para agregar alumnos y roster con estado
// de pago y restricción de acceso. Dos Card, sin acción principal: "Agregar a la clase" es de cada
// fila.
export function AlumnosView() {
  const { claseId } = useParams<{ claseId: string }>()

  return (
    <div className="flex flex-col gap-5">
      <BuscadorAlumnos claseId={claseId ?? ""} />
      <TablaAlumnos claseId={claseId ?? ""} />
    </div>
  )
}
