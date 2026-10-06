import { useRef, type ReactNode } from "react"
import { Link, useNavigate } from "react-router"

import { Cargando } from "@/components/cargando"
import { EstadoVacio } from "@/components/estado-vacio"
import { MensajeError } from "@/components/mensaje-error"
import { Button } from "@/components/ui/button"
import { buttonVariants } from "@/components/ui/button-variants"
import { Card, CardAction, CardContent, CardHeader } from "@/components/ui/card"

import { TablaClasesAdmin } from "./components/tabla-clases-admin"
import { CLAVE_CLASES_ADMIN, TEXTOS_CLASES_ADMIN } from "./data"
import { useClasesAdmin, useFocoAlCargarMas, useFocoAlPasarAError } from "./hooks"
import { esErrorDeCursor } from "./lib"

// §D-2C2, DESIGN.md §7.9: /admin/clases, la lista institucional (RF-52). "Crear clase" es la única
// acción principal de la vista (el vacío ofrece "Crea la primera clase" en outline). Estados en
// orden: error → cargando → vacío → datos. "Cargar más clases" sigue el criterio de foco de §7.14:
// al cargar la última página, el foco va al "Abrir" de la primera clase nueva o, si no llegó
// ninguna, al encabezado.
export function ClasesAdminView() {
  const clases = useClasesAdmin()
  const navigate = useNavigate()
  const encabezadoRef = useRef<HTMLHeadingElement>(null)
  // T-04: si la lista se recarga con error con el foco dentro, va al encabezado.
  useFocoAlPasarAError(
    clases.isError,
    clases.data !== undefined,
    CLAVE_CLASES_ADMIN.join("/"),
    encabezadoRef,
  )
  const filas = clases.data?.pages.flatMap((pagina) => pagina.clases)

  const refVerMas = useFocoAlCargarMas(
    filas?.map((clase) => clase.id),
    (id) => {
      const abrir = document.querySelector<HTMLElement>(`[data-clase-id="${id}"] a`)
      abrir?.focus()
      return abrir !== null
    },
    () => encabezadoRef.current?.focus(),
  )

  const contenido = (): ReactNode => {
    if (clases.isError) {
      return (
        <MensajeError
          mensaje={
            esErrorDeCursor(clases.error)
              ? TEXTOS_CLASES_ADMIN.cambioMientrasLasVeias
              : TEXTOS_CLASES_ADMIN.error
          }
        />
      )
    }
    if (clases.isLoading || !filas) return <Cargando />
    if (filas.length === 0) {
      return (
        <EstadoVacio
          titulo={TEXTOS_CLASES_ADMIN.vacioTitulo}
          accion={{
            texto: TEXTOS_CLASES_ADMIN.vacioAccion,
            onClick: () => void navigate("/admin/clases/nueva"),
            variante: "outline",
          }}
        />
      )
    }
    return (
      <>
        <TablaClasesAdmin clases={filas} />
        {clases.hasNextPage && (
          <Button
            ref={refVerMas}
            type="button"
            variant="outline"
            onClick={() => void clases.fetchNextPage({ cancelRefetch: false })}
            enEspera={clases.isFetchingNextPage}
            className="self-start"
          >
            {TEXTOS_CLASES_ADMIN.verMas}
          </Button>
        )}
      </>
    )
  }

  return (
    <Card>
      <CardHeader>
        <h1 ref={encabezadoRef} tabIndex={-1} className="text-h1">
          {TEXTOS_CLASES_ADMIN.titulo}
        </h1>
        <CardAction>
          <Link to="/admin/clases/nueva" className={buttonVariants({ variant: "primary" })}>
            {TEXTOS_CLASES_ADMIN.crear}
          </Link>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">{contenido()}</CardContent>
    </Card>
  )
}
