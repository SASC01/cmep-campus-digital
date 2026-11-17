import { useId, type ReactNode } from "react"

import { Cargando } from "@/components/cargando"
import { EstadoEntregaBadge } from "@/components/estado-entrega-badge"
import { MensajeError } from "@/components/mensaje-error"
import { Card, CardContent } from "@/components/ui/card"

import { TEXTOS_CALIFICAR, TEXTOS_MI_CALIFICACION_DEL_FORO, TEXTOS_MI_PARTICIPACION } from "../data"
import { useAvisoDeRecargaFallidaEnElForo, useMiParticipacion } from "../hooks"
import {
  claveMiParticipacion,
  errorQueReemplazaLaVistaDelForo,
  estadoVisibleDeMiParticipacion,
  fraseDeMiParticipacion,
} from "../lib"
import { CalificacionDeLaEntrega } from "./calificacion-de-la-entrega"
import { DevolucionesDeTuMaestro } from "./devoluciones"

interface MiParticipacionProps {
  claseId: string
  foroId: string
}

// FORO-01d (§D-8.4, E1-11, DESIGN.md §7.20): «Tu participación», en la columna derecha del foro, solo
// para el alumno: la insignia de su estado y la frase con la fecha y la hora en que participó. Lo decide
// el servidor (E1-1): aquí no se compara ninguna fecha. La primera carga fallida lo dice en el panel, sin
// aviso; una recarga fallida con datos conserva lo que se ve y avisa una vez por fallo.
// FORO-01e (§D-8.5, DESIGN.md §7.27): con calificación, la calificación en lectura (y, si se calificó sin
// participar, lo dice) y «Comentarios de tu maestro», que solo se pide con calificación (R-01e-11).
export function MiParticipacion({ claseId, foroId }: MiParticipacionProps) {
  const consulta = useMiParticipacion(claseId, foroId, true)
  const idTitulo = useId()
  useAvisoDeRecargaFallidaEnElForo(
    claveMiParticipacion(claseId, foroId),
    consulta.isError &&
      consulta.data !== undefined &&
      !errorQueReemplazaLaVistaDelForo(true, consulta.error),
    consulta,
    TEXTOS_MI_PARTICIPACION.recargaFallida,
  )

  const contenido = (): ReactNode => {
    if (consulta.data === undefined && consulta.isError) {
      return <MensajeError mensaje={TEXTOS_MI_PARTICIPACION.errorAlCargar} />
    }
    if (consulta.data === undefined) return <Cargando />
    const mia = consulta.data
    return (
      <div className="flex flex-col items-start gap-2">
        <EstadoEntregaBadge estado={estadoVisibleDeMiParticipacion(mia)} />
        <p className="text-body text-foreground">{fraseDeMiParticipacion(mia)}</p>
        {mia.calificacion !== null && (
          <div className="flex flex-col gap-3 self-stretch border-t border-border pt-3">
            <h4 className="text-body font-bold">{TEXTOS_CALIFICAR.titulo}</h4>
            {mia.fechaEntrega === null && (
              <p className="text-small text-muted-foreground">
                {TEXTOS_MI_CALIFICACION_DEL_FORO.sinParticipar}
              </p>
            )}
            <CalificacionDeLaEntrega calificacion={mia.calificacion} />
            <DevolucionesDeTuMaestro claseId={claseId} foroId={foroId} />
          </div>
        )}
      </div>
    )
  }

  return (
    <Card>
      <CardContent>
        <section aria-labelledby={idTitulo} className="flex flex-col gap-3">
          <h3 id={idTitulo} className="text-h3">
            {TEXTOS_MI_PARTICIPACION.titulo}
          </h3>
          {contenido()}
        </section>
      </CardContent>
    </Card>
  )
}
