import { useRef, type ReactNode, type RefObject } from "react"

import { Cargando } from "@/components/cargando"
import { EstadoVacio } from "@/components/estado-vacio"
import { MensajeError } from "@/components/mensaje-error"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"

import { TEXTOS_PANEL } from "../data"
import { useFocoAlCargarMas } from "../hooks"
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
    | "descripcionVacio"
    | "render"
  >,
  // El ref del botón "Ver más clases" (foco, §7.14) y el de la rejilla de tarjetas.
  refs: { verMas: RefObject<HTMLButtonElement | null>; rejilla: RefObject<HTMLDivElement | null> },
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
        {...(props.descripcionVacio === undefined ? {} : { descripcion: props.descripcionVacio })}
        {...(props.accionVacio === undefined
          ? {}
          : { accion: { ...props.accionVacio, variante: "outline" as const } })}
      />
    )
  }
  return (
    <>
      {/* N-01 (ronda 4): §7.6 pide 12 px de separación entre tarjetas, no 16 (gap-4). */}
      <div ref={refs.rejilla} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {props.clases.map(props.render)}
      </div>
      {props.hasNextPage && (
        <Button
          ref={refs.verMas}
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
  // El vacío del estudiante lleva una acción; el del maestro, solo una frase (§D-2C3).
  accionVacio?: { texto: string; onClick: () => void } | undefined
  descripcionVacio?: string | undefined
  render: (clase: ClaseDelPanel) => ReactNode
}

// §D-A5: estados en orden error → cargando → vacío → datos. El vacío lo decide cada vista: el
// estudiante tiene una acción (lleva el foco al campo del código); el maestro, solo la frase de que
// la administración le asigna sus clases (§D-2C3).
export function PanelMisClases({
  isError,
  errorMensaje,
  isLoading,
  clases,
  hasNextPage,
  isFetchingNextPage,
  onVerMas,
  accionVacio,
  descripcionVacio,
  render,
}: PanelMisClasesProps) {
  const encabezadoRef = useRef<HTMLHeadingElement>(null)
  const rejillaRef = useRef<HTMLDivElement>(null)
  // §D-C5 (heredado de CLASES-b, DESIGN.md §7.14): "Ver más clases" se desmonta con el foco dentro al
  // cargar la última página. El foco va a la primera tarjeta nueva (el enlace de esa clase, por su
  // destino) o, si no llegó ninguna, al encabezado "Mis clases". Nunca a <body>.
  const refVerMas = useFocoAlCargarMas(
    clases?.map((clase) => clase.id),
    (id) => {
      const destino = clases?.find((clase) => clase.id === id)?.destino
      if (destino === undefined) return false
      const tarjeta = rejillaRef.current?.querySelector<HTMLElement>(`a[href="${destino}"]`)
      tarjeta?.focus()
      return tarjeta !== null && tarjeta !== undefined
    },
    () => encabezadoRef.current?.focus(),
  )

  return (
    <Card>
      <CardHeader>
        <h2 ref={encabezadoRef} tabIndex={-1} className="text-h2">
          {TEXTOS_PANEL.titulo}
        </h2>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {contenidoPanel(
          {
            isError,
            errorMensaje,
            isLoading,
            clases,
            hasNextPage,
            isFetchingNextPage,
            onVerMas,
            accionVacio,
            descripcionVacio,
            render,
          },
          { verMas: refVerMas, rejilla: rejillaRef },
        )}
      </CardContent>
    </Card>
  )
}
