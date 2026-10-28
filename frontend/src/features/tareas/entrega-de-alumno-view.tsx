import { ArrowLeft } from "lucide-react"
import { useEffect, useRef, useState, type ReactNode } from "react"
import { Link, useParams } from "react-router"
import { toast } from "sonner"

import { AdjuntosDePublicacion } from "@/components/adjuntos/adjuntos-de-publicacion"
import { Cargando } from "@/components/cargando"
import { ConClaseDeLaRuta } from "@/components/clase/con-clase-de-la-ruta"
import { EstadoEntregaBadge } from "@/components/estado-entrega-badge"
import { MensajeError } from "@/components/mensaje-error"
import { buttonVariants } from "@/components/ui/button-variants"
import { Card, CardContent } from "@/components/ui/card"
import { estadoDeEntregaVisible } from "@/lib/estado-de-entrega"

import { CalificacionDeLaEntrega } from "./components/calificacion-de-la-entrega"
import { HiloPrivado } from "./components/hilo-privado"
import { ListaDeEnlaces } from "./components/lista-de-enlaces"
import { PanelDeCalificacion } from "./components/panel-de-calificacion"
import {
  MENSAJES_ERROR_TAREAS,
  TEXTOS_CALIFICAR,
  TEXTOS_DETALLE_TAREA,
  TEXTOS_ENTREGAS,
  TEXTOS_HILO_PRIVADO,
} from "./data"
import {
  useAvisoDeRecargaFallida,
  useEntregaDeAlumno,
  useFocoAlPerderseElControl,
  useRutaDeLaClase,
  useTarea,
} from "./hooks"
import {
  claveDeFocoDeLaTarea,
  enlaceAEntregas,
  errorQueRedirigeElCliente,
  errorQueReemplazaLaVista,
  fraseDeEntregaDeAlumno,
  mensajeDeConsultaTareas,
  mensajeDeErrorTareas,
  recargaLaTareaTrasConflicto,
  rutaDeEntregaDeAlumno,
  rutaDelHiloDeAlumno,
} from "./lib"
import type { EntregaDeAlumno, TareaDetalle } from "./types"

interface EntregaDelAlumnoProps {
  claseId: string
  tareaId: string
  alumnoId: string
}

// ENTREGAS-01e (§D-10.3, DESIGN.md §7.26): la entrega de un alumno para sus maestros y el admin: su
// nombre, el estado (con texto), cuándo entregó o "Todavía no entrega.", sus archivos (se descargan por
// la ruta de su entrega) y sus enlaces; debajo, su hilo privado. El maestro escribe en el hilo; el admin
// lo lee sin formulario (P-01 a) y una nota lo dice. Un error que reemplaza la vista (la tarea o el
// alumno ya no existen, o se perdió el acceso) la reemplaza por su mensaje, con la misma regla que el
// detalle; con datos en caché, una recarga fallida de la entrega deja ver la última. Si una recarga
// quita el control con el foco, el foco va a la raíz.
function EntregaDelAlumno({ claseId, tareaId, alumnoId }: EntregaDelAlumnoProps) {
  const { perspectiva, base } = useRutaDeLaClase(claseId)
  const tarea = useTarea(claseId, tareaId)
  const consulta = useEntregaDeAlumno(claseId, tareaId, alumnoId)
  const raizRef = useRef<HTMLDivElement>(null)
  const hayTarea = tarea.data !== undefined
  const hayEntrega = consulta.data !== undefined
  // CALIFICACIONES-01c (§D-12.7): cada reinicio vuelve a montar el panel de calificación (con la
  // versión y los valores actuales) y lleva el foco a su encabezado.
  const [reinicios, setReinicios] = useState(0)
  const montadoRef = useRef(false)

  useEffect(() => {
    montadoRef.current = true
    return () => {
      montadoRef.current = false
    }
  }, [])

  // CALIFICACIONES-01c, ronda 1 (T-03): si la entrega reemplaza la vista, la recarga fallida de la
  // tarea no se avisa ("Mostramos la última versión" ya no es cierto), y mientras la entrega se vuelve
  // a pedir (tras un 409 las dos van a la vez y la tarea puede responder antes) el aviso espera a saber
  // si la reemplaza. M-07: ese fallo callado queda como atendido al salir de la vista.
  const entregaReemplazaLaVista =
    consulta.isError && errorQueReemplazaLaVista(hayEntrega, consulta.error)
  const falloDeLaTarea =
    tarea.isError && hayTarea && !errorQueReemplazaLaVista(hayTarea, tarea.error)
  const callaElFallo = consulta.isFetching || entregaReemplazaLaVista

  // ENTREGAS-01e, ronda 1 (T-01): el mismo gancho da el manejo del error al descargar un adjunto.
  const alFallarLaDescarga = useAvisoDeRecargaFallida(
    claseId,
    tareaId,
    falloDeLaTarea && !callaElFallo,
    tarea,
    TEXTOS_DETALLE_TAREA.avisoRecargaFallida,
    falloDeLaTarea && callaElFallo,
  )
  useFocoAlPerderseElControl(
    raizRef,
    `${claveDeFocoDeLaTarea(tareaId, tarea)}|${claveDeFocoDeLaTarea(alumnoId, consulta)}`,
  )

  // §D-12.7 (Enmienda 1, N-04; N-11): tras un 409 de calificar, se vuelve a pedir la entrega y, si el
  // conflicto depende de la tarea (la rúbrica, sus puntos, la fecha límite o si acepta tardías), la
  // tarea, a la vez. Si las dos responden, el panel se reinicia y lo escrito se descarta. Si una
  // falla, nada se reinicia (lo escrito y la versión se conservan) y se avisa una vez: el fallo de la
  // tarea lo avisa ya su propio aviso de recarga fallida (salvo que la entrega reemplace la vista,
  // T-03: entonces solo queda el del 409); un error que reemplaza la vista o con que
  // apiClient redirigió no se avisa. Con la vista desmontada ("Volver a las entregas" durante la
  // recarga), nada.
  const recargarTrasConflicto = async (error: unknown) => {
    if (!montadoRef.current) return
    try {
      const [entregaNueva, tareaNueva] = await Promise.all([
        consulta.refetch(),
        recargaLaTareaTrasConflicto(error) ? tarea.refetch() : Promise.resolve(null),
      ])
      if (!montadoRef.current) return
      if (tareaNueva !== null && tareaNueva.isError) return
      if (entregaNueva.isError) {
        if (errorQueReemplazaLaVista(true, entregaNueva.error)) return
        if (errorQueRedirigeElCliente(entregaNueva.error)) return
        toast.error(TEXTOS_CALIFICAR.avisoRecargaFallida)
        return
      }
      setReinicios((n) => n + 1)
    } catch {
      if (montadoRef.current) toast.error(TEXTOS_CALIFICAR.avisoRecargaFallida)
    }
  }

  // S-01: el maestro califica con el panel; el admin solo lee la calificación.
  const calificacion = (tareaDetalle: TareaDetalle, entrega: EntregaDeAlumno): ReactNode => {
    if (perspectiva === "maestro") {
      return (
        <PanelDeCalificacion
          key={reinicios}
          claseId={claseId}
          tareaId={tareaId}
          alumnoId={alumnoId}
          tarea={tareaDetalle}
          entrega={entrega}
          onConflicto={recargarTrasConflicto}
          onCalificada={() => setReinicios((n) => n + 1)}
          enfocarAlMontar={reinicios > 0}
        />
      )
    }

    if (perspectiva !== "admin") return null

    return (
      <Card>
        <CardContent className="flex flex-col gap-4">
          <h3 tabIndex={-1} className="text-h3">
            {TEXTOS_CALIFICAR.titulo}
          </h3>
          {entrega.calificacion === null ? (
            <p className="text-small text-muted-foreground">{TEXTOS_CALIFICAR.sinCalificar}</p>
          ) : (
            <CalificacionDeLaEntrega calificacion={entrega.calificacion} />
          )}
        </CardContent>
      </Card>
    )
  }

  const contenido = (): ReactNode => {
    if (tarea.isError && errorQueReemplazaLaVista(hayTarea, tarea.error)) {
      return <MensajeError mensaje={mensajeDeConsultaTareas(tarea.error)} />
    }

    if (consulta.isError && errorQueReemplazaLaVista(hayEntrega, consulta.error)) {
      return <MensajeError mensaje={mensajeDeConsultaTareas(consulta.error)} />
    }

    if (!tarea.data || !consulta.data) {
      return <Cargando texto={TEXTOS_ENTREGAS.cargandoEntrega} />
    }

    const { entrega } = consulta.data
    const estado = estadoDeEntregaVisible(entrega, tarea.data.tarea.fechaLimite, new Date())

    return (
      <div className="flex flex-col gap-5">
        <Card>
          <CardContent className="flex flex-col gap-4">
            <Link
              to={enlaceAEntregas(base, tareaId)}
              className={buttonVariants({ variant: "ghost", size: "sm", className: "self-start" })}
            >
              <ArrowLeft aria-hidden="true" />
              {TEXTOS_ENTREGAS.volverALasEntregas}
            </Link>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <h2 tabIndex={-1} className="wrap-anywhere text-h2">
                {entrega.alumno.nombre}
              </h2>
              <EstadoEntregaBadge estado={estado} />
            </div>
            <p className="wrap-anywhere text-small text-muted-foreground">
              {tarea.data.tarea.titulo}
            </p>
            <p className="text-small">{fraseDeEntregaDeAlumno(entrega)}</p>
            <AdjuntosDePublicacion
              claseId={claseId}
              adjuntos={entrega.adjuntos}
              mensajeDeError={mensajeDeErrorTareas}
              rutaDeArchivos={rutaDeEntregaDeAlumno(claseId, tareaId, alumnoId)}
              alFallarLaDescarga={alFallarLaDescarga}
            />
            {entrega.enlaces.length > 0 && <ListaDeEnlaces enlaces={entrega.enlaces} />}
          </CardContent>
        </Card>
        {calificacion(tarea.data.tarea, entrega)}
        <div className="flex flex-col gap-2">
          <HiloPrivado
            claseId={claseId}
            tareaId={tareaId}
            rutaDelHilo={rutaDelHiloDeAlumno(claseId, tareaId, alumnoId)}
            puedeEscribir={perspectiva === "maestro"}
            textoDePrivacidad={TEXTOS_HILO_PRIVADO.privacidadDeLosMaestros}
          />
          {perspectiva === "admin" && (
            <p className="text-small text-muted-foreground">
              {TEXTOS_HILO_PRIVADO.soloLecturaDelAdmin}
            </p>
          )}
        </div>
      </div>
    )
  }

  return (
    <div ref={raizRef} tabIndex={-1}>
      {contenido()}
    </div>
  )
}

// El :claseId lo lee ConClaseDeLaRuta; el :tareaId y el :alumnoId, esta vista. Sin alguno de los dos
// no pide nada y dice lo mismo que una tarea o un alumno que no existen.
export function EntregaDeAlumnoView() {
  const { tareaId, alumnoId } = useParams<{ tareaId: string; alumnoId: string }>()

  return (
    <ConClaseDeLaRuta>
      {(claseId) => {
        if (tareaId === undefined) {
          return <MensajeError mensaje={MENSAJES_ERROR_TAREAS.tareaNoEncontrada} />
        }
        if (alumnoId === undefined) {
          return <MensajeError mensaje={MENSAJES_ERROR_TAREAS.alumnoNoEncontrado} />
        }
        return <EntregaDelAlumno claseId={claseId} tareaId={tareaId} alumnoId={alumnoId} />
      }}
    </ConClaseDeLaRuta>
  )
}
