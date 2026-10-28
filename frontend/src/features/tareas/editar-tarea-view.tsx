import { useRef, useState, type ReactNode } from "react"
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
  mensajeDeConsultaTareas,
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
  // ENTREGAS-01a (P-05 a′, §D-8.3.4): cuántas veces se reinició el formulario tras un 409
  // TAREA_MODIFICADA. Es la `key` del formulario: solo recargarTrasConflicto la cambia, así que ninguna
  // otra recarga (de fondo, de otra mutación) toca lo escrito ni la versión de apertura.
  const [reinicios, setReinicios] = useState(0)
  const hayTarea = consulta.data !== undefined
  // O-r1-2 (cierre de ENTREGAS-01): si al abrir la edición la tarea en caché se está recargando (por
  // ejemplo, alguien la movió de tema y subió su versión), el formulario espera esa primera lectura y
  // nace con la versión fresca; si no, un 409 diría "otra persona" y se perdería lo escrito. Solo la
  // primera: las recargas posteriores no desmontan ni reinician el formulario (§D-8.3, key={reinicios}).
  // Si esa lectura falla, se sigue como en cualquier recarga fallida (aviso, o el error que reemplaza la
  // vista).
  const [esperaLaLecturaFresca, setEsperaLaLecturaFresca] = useState(
    () => hayTarea && consulta.isFetching && consulta.isStale,
  )
  if (esperaLaLecturaFresca && !consulta.isFetching) setEsperaLaLecturaFresca(false)
  const esperando = esperaLaLecturaFresca && consulta.isFetching
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
      return <MensajeError mensaje={mensajeDeConsultaTareas(consulta.error)} />
    }

    if (consulta.isLoading || !consulta.data || esperando) {
      return <Cargando texto={TEXTOS_DETALLE_TAREA.cargando} />
    }

    const { tarea } = consulta.data

    if (!tarea.puedeEditar) {
      return <MensajeError mensaje={TEXTOS_DETALLE_TAREA.sinPermisoParaEditar} />
    }

    // La versión es la de apertura que guarda el formulario, nunca la de consulta.data al enviar.
    const handleGuardar = async (datos: CrearTarea, version: number) => {
      await editar.mutateAsync({ ...datos, version })
      navigate(detalle)
    }

    // §D-8.3.3: una sola petición, esperada. Con éxito y con puedeEditar, el formulario se remonta con
    // la versión nueva (lo escrito y los elegidos se descartan, como en el editor de categorías). Si
    // falla, o la tarea ya no existe, o se perdió el acceso o puedeEditar, no se reinicia: la vista y
    // sus ganchos (useAvisoDeRecargaFallida, errorQueReemplazaLaVista, useFocoAlPerderseElControl)
    // reaccionan como en cualquier recarga.
    const recargarTrasConflicto = async () => {
      const resultado = await consulta.refetch()
      if (!resultado.isSuccess || !resultado.data.tarea.puedeEditar) return
      setReinicios((n) => n + 1)
    }

    return (
      <FormularioTarea
        key={reinicios}
        claseId={claseId}
        tarea={tarea}
        cancelarA={detalle}
        pendiente={editar.isPending}
        onGuardar={handleGuardar}
        version={tarea.version}
        onConflicto={recargarTrasConflicto}
        enfocarAlMontar={reinicios > 0}
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
