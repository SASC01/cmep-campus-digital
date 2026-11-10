import { useRef, type ReactNode } from "react"

import { Cargando } from "@/components/cargando"
import { EstadoVacio } from "@/components/estado-vacio"
import { useFocoAlCargarMas } from "@/components/foco/hooks"
import { MensajeError } from "@/components/mensaje-error"
import { useAlPulsarLaSeccionActiva } from "@/components/seccion/hooks"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { esErrorDeCursor } from "@/lib/errores-de-api"
import { unirPaginasSinRepetidas } from "@/lib/unir-paginas"

import { TablaMovimientos } from "./components/tabla-movimientos"
import { CLAVE_MOVIMIENTOS, TEXTOS_MOVIMIENTOS } from "./data"
import { useMarcarViejaSiQuedoEnError, useMovimientos, useVolverAPedirSiFallo } from "./hooks"
import { errorQueRedirigeElCliente } from "./lib"

// ADMIN-01g (§D-7.7, §D-11, RF-70): /admin/movimientos, el registro de altas y bajas, sin filtros. Sin
// «Reintentar»: la frase de error o de lista cambiada se cumple pulsando «Movimientos» estando aquí (la
// lista en error se vuelve a pedir desde la primera página), yendo a otra sección y regresando o con el
// historial (en error se marca vieja al desmontarse). "Cargar más movimientos" con guarda síncrona,
// la espera de isFetching y cancelRefetch: false; sus filas no tienen controles, así que al cargar la
// última página con el foco en el botón, el foco va al encabezado, nunca a <body>.
export function MovimientosView() {
  const movimientos = useMovimientos()
  const encabezadoRef = useRef<HTMLHeadingElement>(null)
  const cargandoMasRef = useRef(false)

  useMarcarViejaSiQuedoEnError(CLAVE_MOVIMIENTOS)
  useAlPulsarLaSeccionActiva(useVolverAPedirSiFallo(CLAVE_MOVIMIENTOS))

  const filas = movimientos.data
    ? unirPaginasSinRepetidas(movimientos.data.pages.map((pagina) => pagina.movimientos))
    : undefined

  const refCargarMas = useFocoAlCargarMas(
    filas?.map((movimiento) => movimiento.id),
    () => false,
    () => encabezadoRef.current?.focus(),
  )

  const cargarMas = () => {
    if (cargandoMasRef.current) return
    cargandoMasRef.current = true
    void movimientos.fetchNextPage({ cancelRefetch: false }).finally(() => {
      cargandoMasRef.current = false
    })
  }

  // Estados en orden: error (lista cambiada u otro) → cargando → vacío → datos.
  const contenido = (): ReactNode => {
    // ADM-1G20 (c): un error con que apiClient redirige (un 401 tras el refresco fallido) no se pinta.
    const errorVisible = movimientos.isError && !errorQueRedirigeElCliente(movimientos.error)
    if (errorVisible && esErrorDeCursor(movimientos.error)) {
      return <MensajeError mensaje={TEXTOS_MOVIMIENTOS.cambioMientrasLaVeias} />
    }
    if (errorVisible) return <MensajeError mensaje={TEXTOS_MOVIMIENTOS.error} />
    if (movimientos.isLoading || !filas) return <Cargando />
    if (filas.length === 0) return <EstadoVacio titulo={TEXTOS_MOVIMIENTOS.vacio} />
    return (
      <>
        <TablaMovimientos movimientos={filas} />
        {movimientos.hasNextPage && (
          <Button
            ref={refCargarMas}
            type="button"
            variant="outline"
            onClick={cargarMas}
            enEspera={movimientos.isFetching}
            className="self-start"
          >
            {TEXTOS_MOVIMIENTOS.cargarMas}
          </Button>
        )}
      </>
    )
  }

  return (
    <Card>
      <CardHeader>
        <h1 ref={encabezadoRef} tabIndex={-1} className="text-h1">
          {TEXTOS_MOVIMIENTOS.titulo}
        </h1>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">{contenido()}</CardContent>
    </Card>
  )
}
