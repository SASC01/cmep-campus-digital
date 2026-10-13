import { useNavigate } from "react-router"

import { ConClaseDeLaRuta } from "@/components/clase/con-clase-de-la-ruta"

import { FormularioTarea } from "./components/formulario-tarea"
import { useCrearTarea, useRutaDeLaClase } from "./hooks"
import type { CrearTarea } from "./types"

interface CrearTareaDeLaClaseProps {
  claseId: string
}

// §D-10, DESIGN.md §7.21: crear una tarea. Al terminar navega al detalle de la tarea nueva (el aviso
// "Tarea publicada" lo da el hook); "Cancelar" vuelve al muro. El backend decide quién puede crear.
function CrearTareaDeLaClase({ claseId }: CrearTareaDeLaClaseProps) {
  const { base } = useRutaDeLaClase(claseId)
  const navigate = useNavigate()
  const crear = useCrearTarea(claseId)

  const handleGuardar = async (datos: CrearTarea) => {
    const { tarea } = await crear.mutateAsync(datos)
    navigate(`${base}/tareas/${tarea.id}`)
  }

  return (
    <FormularioTarea
      claseId={claseId}
      tarea={null}
      cancelarA={base}
      pendiente={crear.isPending}
      onGuardar={handleGuardar}
      version={null}
    />
  )
}

export function CrearTareaView() {
  return (
    <ConClaseDeLaRuta>{(claseId) => <CrearTareaDeLaClase claseId={claseId} />}</ConClaseDeLaRuta>
  )
}
