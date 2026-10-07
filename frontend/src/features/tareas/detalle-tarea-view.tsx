import { ClipboardList } from "lucide-react"
import { useRef, type ReactNode } from "react"
import { useParams } from "react-router"

import { AdjuntosDePublicacion } from "@/components/adjuntos/adjuntos-de-publicacion"
import { Cargando } from "@/components/cargando"
import { FirmaDelAutor } from "@/components/clase/firma-del-autor"
import { ConClaseDeLaRuta } from "@/components/clase/con-clase-de-la-ruta"
import { MensajeError } from "@/components/mensaje-error"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { formatearFechaHora } from "@/lib/format"

import { AccionesDeLaTarea } from "./components/acciones-de-la-tarea"
import { DetallesDeLaTarea } from "./components/detalles-de-la-tarea"
import { RubricaDeSoloLectura } from "./components/rubrica-de-solo-lectura"
import { TuTrabajo } from "./components/tu-trabajo"
import { MENSAJES_ERROR_TAREAS, TEXTOS_DETALLE_TAREA } from "./data"
import {
  useAvisoDeRecargaFallida,
  useFocoAlPerderseElControl,
  useRutaDeLaClase,
  useTarea,
} from "./hooks"
import { claveDeFocoDeLaTarea, errorQueReemplazaLaVista, mensajeDeErrorTareas } from "./lib"

interface DetalleDeLaTareaProps {
  claseId: string
  tareaId: string
}

// §D-10, DESIGN.md §7.20: el detalle de una tarea. Dos columnas desde 1024 px (la tarea a la izquierda,
// sus detalles y acciones a la derecha) y una debajo de ese ancho. El alumno ve "Tu trabajo"; el
// maestro y el admin ven "Editar tarea" y "Borrar tarea" según lo que diga el servidor. Estados en
// orden: error → cargando → datos (un 404 dice "Esa tarea ya no existe.").
function DetalleDeLaTarea({ claseId, tareaId }: DetalleDeLaTareaProps) {
  const { perspectiva, base } = useRutaDeLaClase(claseId)
  const consulta = useTarea(claseId, tareaId)
  const raizRef = useRef<HTMLDivElement>(null)
  const hayTarea = consulta.data !== undefined
  // M-01: con la tarea en caché, una recarga fallida (que no sea 404) no cambia la vista: se avisa.
  useAvisoDeRecargaFallida(
    claseId,
    tareaId,
    consulta.isError && hayTarea && !errorQueReemplazaLaVista(hayTarea, consulta.error),
    consulta,
    TEXTOS_DETALLE_TAREA.avisoRecargaFallida,
  )
  // T-09: si una recarga quita el control con el foco (un permiso que pasa a false, la tarea que ya no
  // existe, un error, otra tarea), el foco va a la raíz de la vista y no a <body>.
  useFocoAlPerderseElControl(
    raizRef,
    // Cada respuesta nueva (o error nuevo) es un momento en que la vista pudo cambiar; el gancho solo
    // actúa si en ese momento el foco se perdió. Así esta vista no lee los permisos (solo
    // AccionesDeLaTarea lee `puedeBorrar`, C-13).
    claveDeFocoDeLaTarea(tareaId, consulta),
  )

  const contenido = (): ReactNode => {
    if (consulta.isError && errorQueReemplazaLaVista(hayTarea, consulta.error)) {
      return <MensajeError mensaje={mensajeDeErrorTareas(consulta.error)} />
    }

    if (consulta.isLoading || !consulta.data) {
      return <Cargando texto={TEXTOS_DETALLE_TAREA.cargando} />
    }

    const { tarea } = consulta.data

    return (
      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <Badge variant="muted" icon={<ClipboardList aria-hidden="true" />}>
                {TEXTOS_DETALLE_TAREA.insignia}
              </Badge>
              <p className="text-small text-muted-foreground">
                <FirmaDelAutor autor={tarea.autor} /> · {formatearFechaHora(tarea.creadoEn)}
              </p>
            </div>

            <h2 className="wrap-anywhere text-h2">{tarea.titulo}</h2>

            {tarea.instrucciones !== "" && (
              <section className="flex flex-col gap-2">
                <h3 className="text-h3">{TEXTOS_DETALLE_TAREA.instrucciones}</h3>
                <p className="max-w-prose wrap-anywhere whitespace-pre-line text-body">
                  {tarea.instrucciones}
                </p>
              </section>
            )}

            <AdjuntosDePublicacion
              claseId={claseId}
              adjuntos={tarea.adjuntos}
              mensajeDeError={mensajeDeErrorTareas}
            />

            <RubricaDeSoloLectura rubrica={tarea.rubrica} />
          </CardContent>
        </Card>

        <div className="flex flex-col gap-5">
          <DetallesDeLaTarea tarea={tarea} />
          {perspectiva === "estudiante" && <TuTrabajo />}
          {perspectiva !== "estudiante" && (
            <AccionesDeLaTarea claseId={claseId} tarea={tarea} base={base} />
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

// El :claseId lo lee ConClaseDeLaRuta; el :tareaId, esta vista. Sin él (una ruta mal armada) no pide
// nada y dice lo mismo que una tarea que no existe.
export function DetalleTareaView() {
  const { tareaId } = useParams<{ tareaId: string }>()

  return (
    <ConClaseDeLaRuta>
      {(claseId) => {
        if (tareaId === undefined) {
          return <MensajeError mensaje={MENSAJES_ERROR_TAREAS.tareaNoEncontrada} />
        }
        return <DetalleDeLaTarea claseId={claseId} tareaId={tareaId} />
      }}
    </ConClaseDeLaRuta>
  )
}
