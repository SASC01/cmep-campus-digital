import { useParams } from "react-router"

import { Cargando } from "@/components/cargando"
import { MensajeError } from "@/components/mensaje-error"

import { FormularioClase } from "./components/formulario-clase"
import { useClase } from "./hooks"
import { mensajeDeErrorClases } from "./lib"

// PR-A21d: precarga los datos con useClase antes de mostrar el formulario.
export function EditarClaseView() {
  const { claseId } = useParams<{ claseId: string }>()
  const { data, isError, error, isLoading } = useClase(claseId ?? "")

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
