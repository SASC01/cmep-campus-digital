import { useId, useRef, type ReactNode } from "react"

import { Cargando } from "@/components/cargando"
import { EstadoEntregaBadge } from "@/components/estado-entrega-badge"
import { MensajeError } from "@/components/mensaje-error"
import { Card, CardContent } from "@/components/ui/card"
import { estadoDeEntregaVisible } from "@/lib/estado-de-entrega"

import { TEXTOS_DETALLE_TAREA, TEXTOS_TU_TRABAJO } from "../data"
import { useFocoAlPerderseElControl, useMiEntrega } from "../hooks"
import {
  claveDeFocoDeLaTarea,
  entregaCerradaAhora,
  mensajeDeConsultaTareas,
  yaEsTarde,
} from "../lib"
import type { TareaDetalle } from "../types"
import { EntregaRealizada } from "./entrega-realizada"
import { FormularioDeEntrega } from "./formulario-de-entrega"

interface TuTrabajoProps {
  claseId: string
  tarea: TareaDetalle
  // ENTREGAS-01e, ronda 1 (T-01): el error al descargar un archivo (un solo aviso y la renovación de lo
  // que el error vuelve viejo); lo da useAvisoDeRecargaFallida del detalle.
  alFallarLaDescarga: (error: unknown) => void
}

// ENTREGAS-01d (§D-9.2, DESIGN.md §7.24): el panel "Tu trabajo" del alumno. Pide su entrega y la
// muestra según lo que dice el servidor (puedeEntregar y puedeAnular salen de las reglas de core/):
// el formulario si puede entregar (con la nota de retraso si ya venció y la tarea acepta tardías), la
// entrega hecha, o la frase de la entrega cerrada. El encabezado "Tu trabajo" se pinta siempre (también
// mientras carga y tras un error) y recibe el foco al entregar y al anular. Si una recarga de la entrega
// quita el control que tenía el foco (un 409, otra pestaña, la entrega que pasa a cerrada o calificada),
// el foco va a la sección, nunca a <body> (mismo gancho que el detalle).
export function TuTrabajo({ claseId, tarea, alFallarLaDescarga }: TuTrabajoProps) {
  const consulta = useMiEntrega(claseId, tarea.id)
  const idTitulo = useId()
  const seccionRef = useRef<HTMLElement>(null)
  const encabezadoRef = useRef<HTMLHeadingElement>(null)
  useFocoAlPerderseElControl(seccionRef, claveDeFocoDeLaTarea(`entrega:${tarea.id}`, consulta))
  const ahora = new Date()
  const enfocarEncabezado = () => encabezadoRef.current?.focus()

  const insignia = (): ReactNode => {
    if (!consulta.data) return null
    const { entrega } = consulta.data
    return <EstadoEntregaBadge estado={estadoDeEntregaVisible(entrega, tarea.fechaLimite, ahora)} />
  }

  const contenido = (): ReactNode => {
    // Con la entrega ya cargada, una recarga fallida deja ver la última que se tuvo.
    if (consulta.isError && !consulta.data) {
      return <MensajeError mensaje={mensajeDeConsultaTareas(consulta.error)} />
    }

    if (!consulta.data) {
      return <Cargando texto={TEXTOS_TU_TRABAJO.cargando} />
    }

    const { entrega } = consulta.data
    const tarde = yaEsTarde(tarea.fechaLimite, ahora)
    const cerrada = entregaCerradaAhora(tarea, ahora)

    if (entrega.puedeEntregar) {
      return (
        <>
          {tarde && (
            <p className="text-small text-muted-foreground">{TEXTOS_TU_TRABAJO.notaDeRetraso}</p>
          )}
          <FormularioDeEntrega claseId={claseId} tarea={tarea} onEntregada={enfocarEncabezado} />
        </>
      )
    }

    if (entrega.estado === "asignado") {
      return <p className="text-small text-muted-foreground">{TEXTOS_TU_TRABAJO.cerrada}</p>
    }

    return (
      <EntregaRealizada
        claseId={claseId}
        tareaId={tarea.id}
        entrega={entrega}
        cerrada={cerrada}
        conRetrasoSiVuelve={tarde && tarea.aceptaTardias}
        onAnulada={enfocarEncabezado}
        alFallarLaDescarga={alFallarLaDescarga}
      />
    )
  }

  return (
    <Card>
      <CardContent>
        <section
          ref={seccionRef}
          tabIndex={-1}
          aria-labelledby={idTitulo}
          className="flex flex-col gap-3"
        >
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <h3 ref={encabezadoRef} id={idTitulo} tabIndex={-1} className="text-h3">
              {TEXTOS_DETALLE_TAREA.tuTrabajo}
            </h3>
            {insignia()}
          </div>
          {contenido()}
        </section>
      </CardContent>
    </Card>
  )
}
