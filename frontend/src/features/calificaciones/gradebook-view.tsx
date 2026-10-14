import { useEffect, useRef, useState, type ReactNode } from "react"

import { Cargando } from "@/components/cargando"
import { ConClaseDeLaRuta } from "@/components/clase/con-clase-de-la-ruta"
import { EstadoVacio } from "@/components/estado-vacio"
import { useFocoAlPerderseElControl } from "@/components/foco/hooks"
import { claveDeFocoDeLaConsulta } from "@/components/foco/lib"
import { MensajeError } from "@/components/mensaje-error"
import { Card, CardContent } from "@/components/ui/card"

import { NavegacionDelGradebook } from "./components/navegacion-del-gradebook"
import { ResumenDelGradebook } from "./components/resumen-del-gradebook"
import { TablaDelGradebook } from "./components/tabla-del-gradebook"
import {
  CAMPOS_DE_CURSOR_DEL_GRADEBOOK,
  MENSAJES_ERROR_CALIFICACIONES,
  TEXTOS_GRADEBOOK,
} from "./data"
import {
  useAlPulsarLaSeccionActiva,
  useGradebook,
  useMarcarViejoElGradebook,
  useRecargarLaPrimeraVentana,
} from "./hooks"
import {
  DIMENSION_DE_LA_ACCION,
  esErrorDeCursorDeCalificaciones,
  esErrorDeSinAcceso,
  mensajeDeErrorCalificaciones,
  VENTANAS_INICIALES,
  ventanaAnterior,
  ventanaSiguiente,
} from "./lib"
import type { AccionDeVentana, GradebookRespuesta, VentanasDelGradebook } from "./types"

interface GradebookDeLaClaseProps {
  claseId: string
}

// §D-13.3 (RF-37, DESIGN.md §7.28): el gradebook del maestro y del admin. La raíz de la vista es un
// contexto opaco (M-03): el panel, los botones, los enlaces y la tabla cuelgan de ella y se pintan
// opacos. Dentro del panel: el h2, el resumen de la clase, las ventanas y la tabla. Las dos dimensiones
// se recorren por ventanas (S-07): cada respuesta es una sola instantánea y la tabla anterior se ve
// mientras llega la nueva. Estados: error → cargando → vacío → datos.
// - Un error sin tabla a la vista (primera carga o ventana nueva) o que la reemplaza (se perdió el
//   acceso a la clase) va en un solo MensajeError, sin aviso: el 400 de un cursor dice su texto fijo;
//   lo demás, el de sin acceso o el genérico. Nunca el texto que trae el servidor (S-21, S-22).
// - Una recarga de fondo que falla con la tabla a la vista la conserva, sin aviso (S-19).
// - Si el botón pulsado ya no está al llegar la ventana nueva (de la red o de la caché), el foco va al
//   h2; si una recarga quita el control con el foco sin que se haya pulsado, a la raíz.
function GradebookDeLaClase({ claseId }: GradebookDeLaClaseProps) {
  const [ventanas, setVentanas] = useState<VentanasDelGradebook>(VENTANAS_INICIALES)
  const consulta = useGradebook(claseId, ventanas.ventana)
  const raizRef = useRef<HTMLDivElement>(null)
  const encabezadoRef = useRef<HTMLHeadingElement>(null)
  const pidiendoRef = useRef(false)
  // El botón de la ventana que se pidió (null: no se está esperando una).
  const pulsadoRef = useRef<AccionDeVentana | null>(null)
  const datos = consulta.data

  // Al terminar la petición de una ventana se libera la guarda. Si la ventana está a la vista y el botón
  // pulsado ya no está, el foco va al h2 (nunca a <body> ni a la raíz), venga la ventana de la red o de
  // la caché (M-08). El botón puede desaparecer al pulsarlo (su pila se vacía o la ventana de destino ya
  // estaba en caché): entonces el gancho de foco, que corre después, ya lo llevó a la raíz mientras
  // llegaba la ventana, y aquí pasa al h2. Si un fallo reemplaza la tabla no hay h2 y el foco se queda
  // en la raíz.
  useEffect(() => {
    if (consulta.isFetching) return
    pidiendoRef.current = false
    const pulsado = pulsadoRef.current
    if (pulsado === null) return
    pulsadoRef.current = null
    const boton = raizRef.current?.querySelector(`[data-ventana="${pulsado}"]`)
    if (boton?.isConnected === true) return
    const activo = document.activeElement
    const sinControl = activo === null || activo === document.body || activo === raizRef.current
    if (!sinControl && activo.isConnected) return
    encabezadoRef.current?.focus()
  })

  // T-08: pulsar la sección "Calificaciones" estando en ella (con o sin el texto del cursor a la vista)
  // vuelve a la ventana inicial, sin pilas, y pide otra vez la primera ventana, como al abrir la vista.
  // La ventana que se esperaba ya no mueve el foco: se queda en la sección pulsada, como en el muro.
  const recargarLaPrimeraVentana = useRecargarLaPrimeraVentana(claseId)
  useAlPulsarLaSeccionActiva(() => {
    pulsadoRef.current = null
    recargarLaPrimeraVentana()
    setVentanas(VENTANAS_INICIALES)
  })

  useFocoAlPerderseElControl(
    raizRef,
    claveDeFocoDeLaConsulta(
      `gradebook:${ventanas.ventana.cursor ?? ""}:${ventanas.ventana.cursorTareas ?? ""}`,
      consulta,
    ),
  )

  const handleIr = (accion: AccionDeVentana) => {
    if (pidiendoRef.current || consulta.isFetching || datos === undefined) return
    const dimension = DIMENSION_DE_LA_ACCION[accion]
    const siguiente = dimension === "alumnos" ? datos.siguienteCursor : datos.siguienteCursorTareas
    const avanza = accion === "alumnos-siguientes" || accion === "tareas-antiguas"
    if (avanza && siguiente === null) return
    pidiendoRef.current = true
    pulsadoRef.current = accion
    setVentanas((estado) =>
      avanza && siguiente !== null
        ? ventanaSiguiente(estado, dimension, siguiente)
        : ventanaAnterior(estado, dimension),
    )
  }

  const reemplazada =
    consulta.isError && (datos === undefined || esErrorDeSinAcceso(consulta.error))

  // T-06: una ventana que llega vacía no es la clase vacía. Si se pidió con algún cursor (o lo que se ve
  // es la ventana anterior mientras llega otra, que solo se pide desde una ventana con navegación), el
  // alumno o la tarea del cursor desapareció entre dos ventanas: el texto del cursor va en lugar de la
  // tabla y el resumen y la navegación siguen, para poder regresar. Los vacíos de la clase quedan para
  // la primera ventana, sin cursores.
  const conCursor =
    ventanas.ventana.cursor !== null ||
    ventanas.ventana.cursorTareas !== null ||
    consulta.isPlaceholderData

  const errorDeCursor =
    reemplazada && esErrorDeCursorDeCalificaciones(consulta.error, CAMPOS_DE_CURSOR_DEL_GRADEBOOK)

  // T-07: el texto del cursor pide volver a abrir Calificaciones; cada vez que se ve (el 400 de un
  // cursor o la ventana pedida con cursor que llega vacía, no la de respaldo mientras llega otra), las
  // demás ventanas de la clase quedan viejas. Una ocurrencia por respuesta o fallo nuevo.
  const ventanaVaciaConCursor =
    (ventanas.ventana.cursor !== null || ventanas.ventana.cursorTareas !== null) &&
    !consulta.isPlaceholderData &&
    datos !== undefined &&
    (datos.alumnos.length === 0 || datos.tareas.length === 0)
  let ocurrenciaDelCursor: string | null = null
  if (errorDeCursor) {
    ocurrenciaDelCursor = `cursor:${String(consulta.errorUpdatedAt)}:${String(consulta.errorUpdateCount)}`
  } else if (ventanaVaciaConCursor) {
    ocurrenciaDelCursor = `vacia:${String(consulta.dataUpdatedAt)}`
  }
  useMarcarViejoElGradebook(claseId, ventanas.ventana, ocurrenciaDelCursor)

  const cuerpo = (respuesta: GradebookRespuesta): ReactNode => {
    if (respuesta.alumnos.length === 0 && !conCursor) {
      return <EstadoVacio titulo={TEXTOS_GRADEBOOK.sinAlumnos} />
    }

    if (respuesta.tareas.length === 0 && !conCursor) {
      return <EstadoVacio titulo={TEXTOS_GRADEBOOK.sinTareas} />
    }

    const ventanaVacia = respuesta.alumnos.length === 0 || respuesta.tareas.length === 0
    const tabla = ventanaVacia ? (
      <MensajeError mensaje={MENSAJES_ERROR_CALIFICACIONES.cursorDelGradebook} />
    ) : (
      <TablaDelGradebook tareas={respuesta.tareas} alumnos={respuesta.alumnos} />
    )

    return (
      <>
        <ResumenDelGradebook resumen={respuesta.resumen} />
        <NavegacionDelGradebook
          hayTareasRecientes={ventanas.anterioresDeTareas.length > 0}
          hayTareasAntiguas={respuesta.siguienteCursorTareas !== null}
          hayAlumnosAnteriores={ventanas.anterioresDeAlumnos.length > 0}
          hayAlumnosSiguientes={respuesta.siguienteCursor !== null}
          pidiendo={consulta.isFetching}
          onIr={handleIr}
        />
        {tabla}
      </>
    )
  }

  const contenido = (): ReactNode => {
    if (errorDeCursor) {
      return <MensajeError mensaje={MENSAJES_ERROR_CALIFICACIONES.cursorDelGradebook} />
    }

    if (reemplazada) {
      return (
        <MensajeError
          mensaje={mensajeDeErrorCalificaciones(
            consulta.error,
            MENSAJES_ERROR_CALIFICACIONES.gradebook,
          )}
        />
      )
    }

    if (!datos) {
      return <Cargando texto={TEXTOS_GRADEBOOK.cargando} />
    }

    return (
      <Card>
        <CardContent className="flex flex-col gap-4">
          <h2 ref={encabezadoRef} tabIndex={-1} className="text-h2">
            {TEXTOS_GRADEBOOK.titulo}
          </h2>
          {cuerpo(datos)}
        </CardContent>
      </Card>
    )
  }

  return (
    <div ref={raizRef} tabIndex={-1} data-material="opaco">
      {contenido()}
    </div>
  )
}

// El :claseId lo lee ConClaseDeLaRuta (sin él no pide nada y dice "No tienes acceso a esta clase.").
export function GradebookView() {
  return (
    <ConClaseDeLaRuta>{(claseId) => <GradebookDeLaClase claseId={claseId} />}</ConClaseDeLaRuta>
  )
}
