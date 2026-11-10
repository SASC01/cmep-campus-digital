import { useRef } from "react"
import { Link, Navigate, Outlet } from "react-router"

import { Cargando } from "@/components/cargando"
import { ContextoDeSoloLectura } from "@/components/clase/contexto-de-solo-lectura"
import { MensajeError } from "@/components/mensaje-error"
import { buttonVariants } from "@/components/ui/button-variants"
import { Card, CardHeader } from "@/components/ui/card"
import { baseDeClase } from "@/lib/ruta-de-clase"

import { AvisoDeClaseArchivada } from "./components/aviso-de-clase-archivada"
import { ConClaseDeLaRuta } from "./components/con-clase-de-la-ruta"
import { RUTA_CLASES_ANTERIORES_DEL_ALUMNO, TEXTOS_CLASES_ANTERIORES } from "./data"
import { useClase, useClaseArchivadaEnSuLista, useFocoAlPasarAError } from "./hooks"
import { estaArchivada, mensajeDeConsultaClases } from "./lib"

interface ClaseAnteriorDeLaRutaProps {
  claseId: string
}

// ADMIN-01d2 (§D-9, Enmienda 12): una clase archivada del alumno: su nombre, el aviso y, en el Outlet, sus
// calificaciones, que compone app/router.tsx (regla 9). Sin secciones. Estados en orden: error → cargando →
// clase activa → clase archivada. Una clase activa (el enlace guardado o la que el admin restauró) va a su
// ruta normal, el sentido contrario de N-05; las dos redirecciones leen la misma consulta, así que no se
// pueden contradecir. La key del Outlet reinicia "Mis calificaciones" al pasar a otra clase anterior (E-02).
function ClaseAnteriorDeLaRuta({ claseId }: ClaseAnteriorDeLaRutaProps) {
  const { data, isError, error, isLoading } = useClase(claseId)
  const errorRef = useRef<HTMLDivElement>(null)
  // Corrección M-13: si el error reemplaza la vista con el foco dentro, el foco va a este contenedor.
  useFocoAlPasarAError(isError, data !== undefined, claseId, errorRef)
  useClaseArchivadaEnSuLista(claseId, data !== undefined && estaArchivada(data))

  const volver = (
    <Link
      to={RUTA_CLASES_ANTERIORES_DEL_ALUMNO}
      className={buttonVariants({ variant: "link", size: "enlace" })}
    >
      {TEXTOS_CLASES_ANTERIORES.volverAClasesAnteriores}
    </Link>
  )

  if (isError) {
    return (
      <div ref={errorRef} tabIndex={-1} className="flex flex-col gap-3">
        <MensajeError mensaje={mensajeDeConsultaClases(error)} />
        {volver}
      </div>
    )
  }

  if (isLoading || !data) {
    return <Cargando />
  }

  if (!estaArchivada(data)) {
    return <Navigate replace to={baseDeClase("estudiante", data.id)} />
  }

  return (
    <ContextoDeSoloLectura value={true}>
      <div className="flex flex-col gap-5">
        <Card>
          <CardHeader>
            {volver}
            <h1 tabIndex={-1} className="min-w-0 text-h1 wrap-anywhere">
              {data.nombre}
            </h1>
          </CardHeader>
        </Card>
        <AvisoDeClaseArchivada
          claseId={data.id}
          archivadaEn={data.archivadaEn}
          perspectiva="estudiante"
        />
        <Outlet key={claseId} />
      </div>
    </ContextoDeSoloLectura>
  )
}

export function ClaseAnteriorView() {
  return (
    <ConClaseDeLaRuta>{(claseId) => <ClaseAnteriorDeLaRuta claseId={claseId} />}</ConClaseDeLaRuta>
  )
}
