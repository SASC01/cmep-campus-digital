import { useRef, type ReactNode } from "react"
import { Link } from "react-router"

import { Cargando } from "@/components/cargando"
import { EstadoVacio } from "@/components/estado-vacio"
import { MensajeError } from "@/components/mensaje-error"
import { useAlPulsarLaSeccionActiva } from "@/components/seccion/hooks"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { formatearFechaLarga } from "@/lib/format"
import { unirPaginasSinRepetidas } from "@/lib/unir-paginas"

import { claveClasesAnteriores, TEXTOS_CLASES_ANTERIORES } from "../data"
import {
  useClasesAnteriores,
  useFocoAlCargarMas,
  useFocoAlPasarAError,
  useRecuperarListaDeClasesAnteriores,
} from "../hooks"
import { esErrorDeCursor, unirNombres } from "../lib"

interface ListaDeClasesAnterioresProps {
  titulo: string
  vacio: string
  error: string
  // A dónde lleva cada clase: la vista de una clase anterior (alumno) o la clase en solo lectura (maestro).
  destino: (claseId: string) => string
}

// ADMIN-01d2 (§D-9, DESIGN.md §7.2): "Clases anteriores" del alumno y "Clases archivadas" del maestro, de
// la archivada más recientemente a la más antigua: filas con divisores dentro de un panel, cada una con el
// nombre (enlace), sus maestros y la fecha en que se archivó. Las páginas se unen sin filas repetidas
// (R-19). Estados en orden: error → cargando → vacío → datos.
// Un error reemplaza la lista con su texto, sin aviso; si ya había filas y quedaban más, «Cargar más» sigue
// en su lugar, con el foco, y al repetirlo vuelve a pedir la lista desde la primera página (ADM-1D204 d); tras
// el 400 del cursor la lista se vacía mientras tanto y el foco va al encabezado.
// Si el botón desaparece al cargar la última página, el foco va a la primera clase nueva o al encabezado
// (§7.14).
export function ListaDeClasesAnteriores({
  titulo,
  vacio,
  error,
  destino,
}: ListaDeClasesAnterioresProps) {
  const clases = useClasesAnteriores()
  const encabezadoRef = useRef<HTMLHeadingElement>(null)
  const cargandoMasRef = useRef(false)

  useFocoAlPasarAError(
    clases.isError,
    clases.data !== undefined,
    claveClasesAnteriores().join("/"),
    encabezadoRef,
  )

  const volverAPedirSiFallo = useRecuperarListaDeClasesAnteriores()
  useAlPulsarLaSeccionActiva(volverAPedirSiFallo)

  const filas = clases.data
    ? unirPaginasSinRepetidas(clases.data.pages.map((pagina) => pagina.clases))
    : undefined

  const refCargarMas = useFocoAlCargarMas(
    filas?.map((clase) => clase.id),
    (id) => {
      const enlace = document.querySelector<HTMLElement>(`[data-clase-anterior-id="${id}"] a`)
      enlace?.focus()
      return enlace !== null
    },
    () => encabezadoRef.current?.focus(),
  )

  // Guarda síncrona: enEspera llega un render después.
  const cargarMas = () => {
    if (cargandoMasRef.current) return
    // Tras el 400 del cursor, los cursores de las páginas ya cargadas tampoco sirven: desde la primera.
    if (clases.isError && esErrorDeCursor(clases.error)) {
      volverAPedirSiFallo()
      return
    }
    cargandoMasRef.current = true
    const peticion = clases.isError
      ? clases.refetch({ cancelRefetch: false })
      : clases.fetchNextPage({ cancelRefetch: false })
    void peticion.finally(() => {
      cargandoMasRef.current = false
    })
  }

  const contenido = (): ReactNode => {
    if (clases.isError && esErrorDeCursor(clases.error)) {
      return <MensajeError mensaje={TEXTOS_CLASES_ANTERIORES.cambioMientrasLasVeias} />
    }
    if (clases.isError) return <MensajeError mensaje={error} />
    if (clases.isLoading || !filas) return <Cargando />
    if (filas.length === 0) return <EstadoVacio titulo={vacio} />
    return (
      <ul className="flex flex-col">
        {filas.map((clase) => (
          <li
            key={clase.id}
            data-clase-anterior-id={clase.id}
            className="flex flex-col gap-1 border-b border-border py-3 last:border-0"
          >
            <Link
              to={destino(clase.id)}
              className="font-bold wrap-anywhere text-link underline-offset-4 hover:underline"
            >
              {clase.nombre}
            </Link>
            <p className="text-small wrap-anywhere text-muted-foreground">
              {unirNombres(clase.maestros.map((maestro) => maestro.nombre))}
            </p>
            <p className="text-small text-muted-foreground">
              {TEXTOS_CLASES_ANTERIORES.archivadaEl(
                formatearFechaLarga(new Date(clase.archivadaEn)),
              )}
            </p>
          </li>
        ))}
      </ul>
    )
  }

  return (
    <Card>
      <CardHeader>
        <h1 ref={encabezadoRef} tabIndex={-1} className="text-h1">
          {titulo}
        </h1>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {contenido()}
        {filas !== undefined && filas.length > 0 && clases.hasNextPage && (
          <Button
            ref={refCargarMas}
            type="button"
            variant="outline"
            onClick={cargarMas}
            enEspera={clases.isFetching}
            className="self-start"
          >
            {TEXTOS_CLASES_ANTERIORES.cargarMas}
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
