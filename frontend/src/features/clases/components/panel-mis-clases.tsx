import type { ReactNode } from "react"

import { Cargando } from "@/components/cargando"
import { EstadoVacio } from "@/components/estado-vacio"
import { MensajeError } from "@/components/mensaje-error"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"

import { TEXTOS_PANEL } from "../data"
import type { ClaseDelPanel } from "../types"

// T-10 (ronda 1 del tester): error → cargando → vacío → datos, sin ternario anidado en el JSX.
const contenidoPanel = (
  props: Pick<
    PanelMisClasesProps,
    | "isError"
    | "errorMensaje"
    | "isLoading"
    | "clases"
    | "hasNextPage"
    | "isFetchingNextPage"
    | "onVerMas"
    | "accionVacio"
    | "render"
  >,
): ReactNode => {
  if (props.isError) return <MensajeError mensaje={props.errorMensaje} />
  if (props.isLoading) return <Cargando />
  // Corrección de la ronda 1 (T-09, segunda pasada): `clases` llega como `undefined` mientras la
  // consulta no tiene datos. Con `isError` e `isLoading` ya descartados arriba, TanStack Query
  // garantiza que hay datos; este `if` solo completa el tipo para TypeScript, nunca inventa un
  // arreglo vacío para un caso real de "faltan datos".
  if (!props.clases) return <Cargando />
  if (props.clases.length === 0) {
    return (
      <EstadoVacio
        titulo={TEXTOS_PANEL.vacioTitulo}
        accion={{ ...props.accionVacio, variante: "outline" }}
      />
    )
  }
  return (
    <>
      {/* N-01 (ronda 4): §7.6 pide 12 px de separación entre tarjetas, no 16 (gap-4). */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">{props.clases.map(props.render)}</div>
      {props.hasNextPage && (
        <Button
          type="button"
          variant="outline"
          onClick={props.onVerMas}
          enEspera={props.isFetchingNextPage}
        >
          {TEXTOS_PANEL.verMas}
        </Button>
      )}
    </>
  )
}

interface PanelMisClasesProps {
  isError: boolean
  errorMensaje: string
  isLoading: boolean
  clases: ClaseDelPanel[] | undefined
  hasNextPage: boolean
  isFetchingNextPage: boolean
  onVerMas: () => void
  accionVacio: {
    texto: string
    onClick: () => void
  }
  render: (clase: ClaseDelPanel) => ReactNode
}

// §D-A5: estados en orden error → cargando → vacío → datos. La acción del vacío la decide cada
// vista (el estudiante lleva el foco al campo del código; el maestro navega a crear su clase).
export function PanelMisClases({
  isError,
  errorMensaje,
  isLoading,
  clases,
  hasNextPage,
  isFetchingNextPage,
  onVerMas,
  accionVacio,
  render,
}: PanelMisClasesProps) {
  return (
    <Card>
      <CardHeader>
        <h2 className="text-h2">{TEXTOS_PANEL.titulo}</h2>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {contenidoPanel({
          isError,
          errorMensaje,
          isLoading,
          clases,
          hasNextPage,
          isFetchingNextPage,
          onVerMas,
          accionVacio,
          render,
        })}
      </CardContent>
    </Card>
  )
}
