import { Link, Outlet, useLocation } from "react-router"

import { Cargando } from "@/components/cargando"
import { MensajeError } from "@/components/mensaje-error"
import { buttonVariants } from "@/components/ui/button-variants"

import { TEXTOS_CLASE } from "./data"
import { ConClaseDeLaRuta } from "./components/con-clase-de-la-ruta"
import { EncabezadoClase } from "./components/encabezado-clase"
import { SeccionesDeClase } from "./components/secciones-de-clase"
import { useClase } from "./hooks"
import { mensajeDeErrorClases } from "./lib"

interface ClaseDeLaRutaProps {
  claseId: string
}

// §D-A5: la ruta decide si quien mira es el maestro dueño (bajo /maestro/clases/:claseId) o un
// estudiante inscrito (bajo /estudiante/clases/:claseId); el backend ya lo exige por su cuenta
// (requireMembership/requireOwnership), así que esto solo decide qué mostrar.
function ClaseDeLaRuta({ claseId }: ClaseDeLaRutaProps) {
  const location = useLocation()
  const esDueno = location.pathname.startsWith("/maestro")
  const { data, isError, error, isLoading } = useClase(claseId)

  if (isError) {
    return (
      <div className="flex flex-col gap-3">
        <MensajeError mensaje={mensajeDeErrorClases(error)} />
        <Link
          to={esDueno ? "/maestro" : "/estudiante"}
          className={buttonVariants({ variant: "link", size: "enlace" })}
        >
          {TEXTOS_CLASE.volver}
        </Link>
      </div>
    )
  }

  if (isLoading || !data) {
    return <Cargando />
  }

  return (
    <div className="flex flex-col gap-5">
      <EncabezadoClase clase={data} esDueno={esDueno} />
      <SeccionesDeClase claseId={data.id} esDueno={esDueno} />
      <Outlet />
    </div>
  )
}

// El :claseId lo lee ConClaseDeLaRuta (§D-C5 bis).
export function ClaseLayout() {
  return <ConClaseDeLaRuta>{(claseId) => <ClaseDeLaRuta claseId={claseId} />}</ConClaseDeLaRuta>
}
