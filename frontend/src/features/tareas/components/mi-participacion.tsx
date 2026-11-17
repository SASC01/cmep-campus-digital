import { useId, type ReactNode } from "react"

import { Cargando } from "@/components/cargando"
import { EstadoEntregaBadge } from "@/components/estado-entrega-badge"
import { MensajeError } from "@/components/mensaje-error"
import { Card, CardContent } from "@/components/ui/card"

import { TEXTOS_MI_PARTICIPACION } from "../data"
import { useAvisoDeRecargaFallidaEnElForo, useMiParticipacion } from "../hooks"
import {
  claveMiParticipacion,
  errorQueReemplazaLaVistaDelForo,
  estadoVisibleDeMiParticipacion,
  fraseDeMiParticipacion,
} from "../lib"

interface MiParticipacionProps {
  claseId: string
  foroId: string
}

// FORO-01d (§D-8.4, E1-11, DESIGN.md §7.20): «Tu participación», en la columna derecha del foro, solo
// para el alumno: la insignia de su estado y la frase con la fecha y la hora en que participó. Lo decide
// el servidor (E1-1): aquí no se compara ninguna fecha. La primera carga fallida lo dice en el panel, sin
// aviso; una recarga fallida con datos conserva lo que se ve y avisa una vez por fallo. 01e le suma la
// calificación y la devolución.
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
