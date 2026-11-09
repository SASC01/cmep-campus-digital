import { useRef } from "react"
import { Link, Navigate, Outlet, useLocation } from "react-router"

import { Cargando } from "@/components/cargando"
import { ContextoDeSoloLectura } from "@/components/clase/contexto-de-solo-lectura"
import { MensajeError } from "@/components/mensaje-error"
import { buttonVariants } from "@/components/ui/button-variants"

import { CAPACIDADES_POR_PERSPECTIVA } from "./data"
import { AvisoDeClaseArchivada } from "./components/aviso-de-clase-archivada"
import { ConClaseDeLaRuta } from "./components/con-clase-de-la-ruta"
import { EncabezadoClase } from "./components/encabezado-clase"
import { SeccionesDeClase } from "./components/secciones-de-clase"
import {
  useClase,
  useClaseArchivadaEnSuLista,
  useDetalleViejoAnteClaseArchivada,
  useFocoAlPasarAError,
  useFocoAlTituloDeLaClase,
} from "./hooks"
import {
  estaArchivada,
  mensajeDeConsultaClases,
  perspectivaDeRuta,
  rutaDeClaseAnterior,
} from "./lib"

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
  // ADMIN-01d1 (§D-9): la clase archivada es de solo lectura para todos. Un 409 CLASE_ARCHIVADA de
  // cualquier petición de la clase marca viejo su detalle (Enmienda 3); al llegar, el aviso aparece y los
  // controles de escritura dejan de pintarse. Si el control con el foco desaparece, el foco va al título.
  useDetalleViejoAnteClaseArchivada(claseId)
  const soloLectura = data !== undefined && estaArchivada(data)
  useClaseArchivadaEnSuLista(claseId, soloLectura)
  const raizRef = useRef<HTMLDivElement>(null)
  const tituloRef = useRef<HTMLHeadingElement>(null)
  useFocoAlTituloDeLaClase(raizRef, tituloRef, `${claseId}:${String(soloLectura)}`)

  if (isError) {
    return (
      <div ref={errorRef} tabIndex={-1} className="flex flex-col gap-3">
        <MensajeError mensaje={mensajeDeConsultaClases(error)} />
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

  // ADMIN-01d2 (§D-9, N-05): el alumno ve una clase archivada en "Clases anteriores". Sale antes de pintar
  // el Outlet, así que ninguna sección llega a pedir nada, y sin dejar la ruta vieja en el historial.
  if (perspectiva === "estudiante" && estaArchivada(data)) {
    return <Navigate replace to={rutaDeClaseAnterior(data.id)} />
  }

  return (
    <ContextoDeSoloLectura value={soloLectura}>
      <div ref={raizRef} tabIndex={-1} className="flex flex-col gap-5">
        <EncabezadoClase clase={data} perspectiva={perspectiva} tituloRef={tituloRef} />
        {estaArchivada(data) && (
          <AvisoDeClaseArchivada
            claseId={data.id}
            archivadaEn={data.archivadaEn}
            perspectiva={perspectiva}
          />
        )}
        <SeccionesDeClase claseId={data.id} perspectiva={perspectiva} />
        <Outlet />
      </div>
    </ContextoDeSoloLectura>
  )
}

// El :claseId lo lee ConClaseDeLaRuta (§D-C5 bis).
export function ClaseLayout() {
  return <ConClaseDeLaRuta>{(claseId) => <ClaseDeLaRuta claseId={claseId} />}</ConClaseDeLaRuta>
}
