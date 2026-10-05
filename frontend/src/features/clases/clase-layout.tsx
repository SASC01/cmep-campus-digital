import { useRef } from "react"
import { Link, Outlet, useLocation } from "react-router"

import { Cargando } from "@/components/cargando"
import { MensajeError } from "@/components/mensaje-error"
import { buttonVariants } from "@/components/ui/button-variants"

import { CAPACIDADES_POR_PERSPECTIVA } from "./data"
import { ConClaseDeLaRuta } from "./components/con-clase-de-la-ruta"
import { EncabezadoClase } from "./components/encabezado-clase"
import { SeccionesDeClase } from "./components/secciones-de-clase"
import { useClase, useFocoAlPasarAError } from "./hooks"
import { mensajeDeErrorClases, perspectivaDeRuta } from "./lib"

interface ClaseDeLaRutaProps {
  claseId: string
}

// §D-A5, §D-2C1: la ruta decide desde dónde se mira la clase (estudiante inscrito, maestro de la
// clase o administrador); el backend ya lo exige por su cuenta (requireMembership y
// requireOwnership), así que esto solo decide qué mostrar.
function ClaseDeLaRuta({ claseId }: ClaseDeLaRutaProps) {
  const location = useLocation()
  const perspectiva = perspectivaDeRuta(location.pathname)
  const capacidades = CAPACIDADES_POR_PERSPECTIVA[perspectiva]
  const { data, isError, error, isLoading } = useClase(claseId)
  const errorRef = useRef<HTMLDivElement>(null)
  // T-04: si la clase se recarga con error después de una acción (asignar o quitar un maestro), el
  // botón con el foco desaparece con la vista; el foco va a este contenedor.
  useFocoAlPasarAError(isError, data !== undefined, claseId, errorRef)

  if (isError) {
    return (
      <div ref={errorRef} tabIndex={-1} className="flex flex-col gap-3">
        <MensajeError mensaje={mensajeDeErrorClases(error)} />
        <Link
          to={capacidades.volverDestino}
          className={buttonVariants({ variant: "link", size: "enlace" })}
        >
          {capacidades.volverTexto}
        </Link>
      </div>
    )
  }

  if (isLoading || !data) {
    return <Cargando />
  }

  return (
    <div className="flex flex-col gap-5">
      <EncabezadoClase clase={data} perspectiva={perspectiva} />
      <SeccionesDeClase claseId={data.id} perspectiva={perspectiva} />
      <Outlet />
    </div>
  )
}

// El :claseId lo lee ConClaseDeLaRuta (§D-C5 bis).
export function ClaseLayout() {
  return <ConClaseDeLaRuta>{(claseId) => <ClaseDeLaRuta claseId={claseId} />}</ConClaseDeLaRuta>
}
