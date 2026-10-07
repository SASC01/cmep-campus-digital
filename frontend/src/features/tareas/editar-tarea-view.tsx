import { useRef, type ReactNode } from "react"
import { useNavigate, useParams } from "react-router"

import { Cargando } from "@/components/cargando"
import { ConClaseDeLaRuta } from "@/components/clase/con-clase-de-la-ruta"
import { MensajeError } from "@/components/mensaje-error"

import { FormularioTarea } from "./components/formulario-tarea"
import { MENSAJES_ERROR_TAREAS, TEXTOS_DETALLE_TAREA } from "./data"
import {
  useAvisoDeRecargaFallida,
  useEditarTarea,
  useFocoAlPerderseElControl,
  useRutaDeLaClase,
  useTarea,
} from "./hooks"
import {
  avisoDeRecargaFallidaAlEditar,
  claveDeFocoDeLaTarea,
  errorQueReemplazaLaVista,
  mensajeDeErrorTareas,
} from "./lib"
import type { CrearTarea } from "./types"

interface EditarTareaDeLaClaseProps {
  claseId: string
  tareaId: string
}

// §D-10, DESIGN.md §7.21: editar una tarea. Carga la tarea (error → cargando → datos) y solo muestra el
// formulario si el servidor dice `puedeEditar`; si no, lo dice con "No puedes editar esta tarea." (el
// backend lo niega de todas formas con 403 EDICION_NO_PERMITIDA). Al terminar vuelve al detalle.
function EditarTareaDeLaClase({ claseId, tareaId }: EditarTareaDeLaClaseProps) {
  const { base } = useRutaDeLaClase(claseId)
  const navigate = useNavigate()
  const consulta = useTarea(claseId, tareaId)
  const editar = useEditarTarea(claseId, tareaId)
  const detalle = `${base}/tareas/${tareaId}`
  const raizRef = useRef<HTMLDivElement>(null)
  const hayTarea = consulta.data !== undefined
  // M-01: con la tarea en caché, una recarga fallida (que no sea 404) no cambia la vista: se avisa.
  useAvisoDeRecargaFallida(
    claseId,
    tareaId,
    consulta.isError && hayTarea && !errorQueReemplazaLaVista(hayTarea, consulta.error),
    consulta,
    avisoDeRecargaFallidaAlEditar(consulta.error),
  )
  // T-09 y T-15: si una recarga quita `puedeEditar` (o la tarea ya no existe, o hay un error que reemplaza
  // el formulario, también tras otro fallo que lo conservó) con el foco dentro del formulario, el foco va
  // a la raíz de la vista y no a <body>.
  useFocoAlPerderseElControl(raizRef, claveDeFocoDeLaTarea(tareaId, consulta))

  const contenido = (): ReactNode => {
    if (consulta.isError && errorQueReemplazaLaVista(hayTarea, consulta.error)) {
      return <MensajeError mensaje={mensajeDeErrorTareas(consulta.error)} />
    }

    if (consulta.isLoading || !consulta.data) {
      return <Cargando texto={TEXTOS_DETALLE_TAREA.cargando} />
    }

    const { tarea } = consulta.data

    if (!tarea.puedeEditar) {
      return <MensajeError mensaje={TEXTOS_DETALLE_TAREA.sinPermisoParaEditar} />
    }

    const handleGuardar = async (datos: CrearTarea) => {
      await editar.mutateAsync(datos)
      navigate(detalle)
    }

    return (
      <FormularioTarea
        claseId={claseId}
        tarea={tarea}
        cancelarA={detalle}
        pendiente={editar.isPending}
        onGuardar={handleGuardar}
      />
    )
  }

  return (
    <div ref={raizRef} tabIndex={-1}>
      {contenido()}
    </div>
  )
}

export function EditarTareaView() {
  const { tareaId } = useParams<{ tareaId: string }>()

  return (
    <ConClaseDeLaRuta>
      {(claseId) => {
        if (tareaId === undefined) {
          return <MensajeError mensaje={MENSAJES_ERROR_TAREAS.tareaNoEncontrada} />
        }
        return <EditarTareaDeLaClase claseId={claseId} tareaId={tareaId} />
      }}
    </ConClaseDeLaRuta>
  )
}
