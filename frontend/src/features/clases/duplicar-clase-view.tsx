import { Cargando } from "@/components/cargando"
import { MensajeError } from "@/components/mensaje-error"

import { ConClaseDeLaRuta } from "./components/con-clase-de-la-ruta"
import { FormularioDuplicarClase } from "./components/formulario-duplicar-clase"
import { useClase } from "./hooks"
import { mensajeDeConsultaClases } from "./lib"

interface DuplicarClaseDeLaRutaProps {
  claseId: string
}

// ADMIN-01c (§D-10): /admin/clases/:claseId/duplicar, dentro de ClaseLayout como "editar". El nombre de
// la original prellena el de la copia; estados en orden: error → cargando → formulario.
function DuplicarClaseDeLaRuta({ claseId }: DuplicarClaseDeLaRutaProps) {
  const { data, isError, error, isLoading } = useClase(claseId)

  if (isError) {
    return <MensajeError mensaje={mensajeDeConsultaClases(error)} />
  }

  if (isLoading || !data) {
    return <Cargando />
  }

  return <FormularioDuplicarClase claseId={data.id} nombreInicial={data.nombre} />
}

export function DuplicarClaseView() {
  return (
    <ConClaseDeLaRuta>
      {(claseId) => <DuplicarClaseDeLaRuta key={claseId} claseId={claseId} />}
    </ConClaseDeLaRuta>
  )
}
