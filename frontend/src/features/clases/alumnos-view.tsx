import { useSoloLecturaDeLaClase } from "@/components/clase/hooks"

import { BuscadorAlumnos } from "./components/buscador-alumnos"
import { ConClaseDeLaRuta } from "./components/con-clase-de-la-ruta"
import { TablaAlumnos } from "./components/tabla-alumnos"

interface AlumnosDeLaClaseProps {
  claseId: string
}

function AlumnosDeLaClase({ claseId }: AlumnosDeLaClaseProps) {
  // ADMIN-01d2 (§D-9, fila 27): en una clase archivada no se dan de alta alumnos.
  const soloLectura = useSoloLecturaDeLaClase()

  return (
    <div className="flex flex-col gap-5">
      {!soloLectura && <BuscadorAlumnos claseId={claseId} />}
      <TablaAlumnos claseId={claseId} />
    </div>
  )
}

// §D-B4: vista del maestro dueño (RF-38, RF-39): buscador para agregar alumnos y roster con estado
// de pago y restricción de acceso. Dos Card, sin acción principal: "Agregar a la clase" es de cada
// fila. El :claseId lo lee ConClaseDeLaRuta (§D-C5 bis).
export function AlumnosView() {
  return <ConClaseDeLaRuta>{(claseId) => <AlumnosDeLaClase claseId={claseId} />}</ConClaseDeLaRuta>
}
