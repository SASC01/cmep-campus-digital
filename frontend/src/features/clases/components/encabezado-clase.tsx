import { Link } from "react-router"

import { buttonVariants } from "@/components/ui/button-variants"
import { Card, CardContent, CardHeader } from "@/components/ui/card"

import { TEXTOS_CLASE } from "../data"
import { useCodigoDeClase } from "../hooks"
import { mensajeDeErrorClases } from "../lib"
import type { ClaseDetalle } from "../types"
import { CodigoDeClase } from "./codigo-de-clase"

interface EncabezadoClaseProps {
  clase: ClaseDetalle
  esDueno: boolean
}

// §D-A5: nombre, maestro y descripción; el dueño ve además el código y el enlace a editar.
export function EncabezadoClase({ clase, esDueno }: EncabezadoClaseProps) {
  const codigo = useCodigoDeClase(clase.id, esDueno)

  return (
    <Card>
      <CardHeader>
        <Link
          to={esDueno ? "/maestro" : "/estudiante"}
          className={buttonVariants({ variant: "link", size: "enlace" })}
        >
          {TEXTOS_CLASE.volver}
        </Link>
        {/* T-08 (segunda pasada): CardHeader es un grid; un elemento de grid no se encoge bajo su
            ancho de contenido mínimo aunque lleve una regla de corte, así que hace falta min-w-0
            además de wrap-anywhere para que el título realmente se recorte a 360 px. */}
        <h1 className="min-w-0 text-h1 wrap-anywhere">{clase.nombre}</h1>
        {/* T-12 (ronda 2 del tester): mismo mecanismo que el h1 de arriba (grid de CardHeader). */}
        <p className="min-w-0 wrap-anywhere text-small text-muted-foreground">
          {TEXTOS_CLASE.maestro(clase.maestro.nombre)}
        </p>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {clase.descripcion && (
          <p className="max-w-prose whitespace-pre-line text-body">{clase.descripcion}</p>
        )}
        {esDueno && (
          <>
            <CodigoDeClase
              claseId={clase.id}
              codigo={codigo.data}
              isError={codigo.isError}
              errorMensaje={codigo.isError ? mensajeDeErrorClases(codigo.error) : ""}
            />
            <Link
              to={`/maestro/clases/${clase.id}/editar`}
              className={buttonVariants({ variant: "link", size: "enlace" })}
            >
              {TEXTOS_CLASE.editar}
            </Link>
          </>
        )}
      </CardContent>
    </Card>
  )
}
