import { ArrowLeft } from "lucide-react"
import { useRef, type ReactNode } from "react"
import { Link, useParams } from "react-router"

import { AdjuntosDePublicacion } from "@/components/adjuntos/adjuntos-de-publicacion"
import { Cargando } from "@/components/cargando"
import { ConClaseDeLaRuta } from "@/components/clase/con-clase-de-la-ruta"
import { EstadoEntregaBadge } from "@/components/estado-entrega-badge"
import { MensajeError } from "@/components/mensaje-error"
import { buttonVariants } from "@/components/ui/button-variants"
import { Card, CardContent } from "@/components/ui/card"
import { estadoDeEntregaVisible } from "@/lib/estado-de-entrega"

import { HiloPrivado } from "./components/hilo-privado"
import { ListaDeEnlaces } from "./components/lista-de-enlaces"
import {
  MENSAJES_ERROR_TAREAS,
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
  errorQueReemplazaLaVista,
  fraseDeEntregaDeAlumno,
  mensajeDeErrorTareas,
  rutaDeEntregaDeAlumno,
  rutaDelHiloDeAlumno,
} from "./lib"

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

  // ENTREGAS-01e, ronda 1 (T-01): el mismo gancho da el manejo del error al descargar un adjunto.
  const alFallarLaDescarga = useAvisoDeRecargaFallida(
    claseId,
    tareaId,
    tarea.isError && hayTarea && !errorQueReemplazaLaVista(hayTarea, tarea.error),
    tarea,
    TEXTOS_DETALLE_TAREA.avisoRecargaFallida,
  )
  useFocoAlPerderseElControl(
    raizRef,
    `${claveDeFocoDeLaTarea(tareaId, tarea)}|${claveDeFocoDeLaTarea(alumnoId, consulta)}`,
  )

  const contenido = (): ReactNode => {
    if (tarea.isError && errorQueReemplazaLaVista(hayTarea, tarea.error)) {
      return <MensajeError mensaje={mensajeDeErrorTareas(tarea.error)} />
    }

    if (consulta.isError && errorQueReemplazaLaVista(hayEntrega, consulta.error)) {
      return <MensajeError mensaje={mensajeDeErrorTareas(consulta.error)} />
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
