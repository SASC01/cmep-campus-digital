import { Cargando } from "@/components/cargando"
import { MensajeError } from "@/components/mensaje-error"

import { ConClaseDeLaRuta } from "./components/con-clase-de-la-ruta"
import { FormularioClase } from "./components/formulario-clase"
import { useClase } from "./hooks"
import { mensajeDeErrorClases } from "./lib"

interface EditarClaseDeLaRutaProps {
  claseId: string
}

// PR-A21d: precarga los datos con useClase antes de mostrar el formulario.
function EditarClaseDeLaRuta({ claseId }: EditarClaseDeLaRutaProps) {
  const { data, isError, error, isLoading } = useClase(claseId)

  if (isError) {
    return <MensajeError mensaje={mensajeDeErrorClases(error)} />
  }

  if (isLoading || !data) {
    return <Cargando />
  }

  return (
    <FormularioClase
      modo="editar"
      claseId={data.id}
      valoresIniciales={{ nombre: data.nombre, descripcion: data.descripcion }}
    />
  )
}

export function EditarClaseView() {
  return (
    <ConClaseDeLaRuta>{(claseId) => <EditarClaseDeLaRuta claseId={claseId} />}</ConClaseDeLaRuta>
  )
}
