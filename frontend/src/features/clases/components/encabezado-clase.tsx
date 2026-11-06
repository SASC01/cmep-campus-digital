import type { RefObject } from "react"
import { Link } from "react-router"

import { useSoloLecturaDeLaClase } from "@/components/clase/hooks"

import { buttonVariants } from "@/components/ui/button-variants"
import { Card, CardContent, CardHeader } from "@/components/ui/card"

import { CAPACIDADES_POR_PERSPECTIVA, TEXTOS_CLASE } from "../data"
import { useCodigoDeClase } from "../hooks"
import { baseDeClase, mensajeDeConsultaClases, textoDeMaestros } from "../lib"
import type { ClaseDetalle, Perspectiva } from "../types"
import { CodigoDeClase } from "./codigo-de-clase"

interface EncabezadoClaseProps {
  clase: ClaseDetalle
  perspectiva: Perspectiva
  // ADMIN-01d1 (§D-9): el título recibe el foco cuando la clase pasa a archivada (o deja de estarlo) y
  // el control que lo tenía desapareció.
  tituloRef: RefObject<HTMLHeadingElement | null>
}

// §D-A5, §D-2C1: nombre, maestro o maestros y descripción; quien ve el código (el maestro y el admin)
// lo tiene aquí, y solo el admin ve el enlace a editar la clase. Lo decide
// CAPACIDADES_POR_PERSPECTIVA; el backend lo exige de todas formas.
// ADMIN-01d1 (§D-9, filas 1 y 2): en una clase archivada no se pide ni se pinta el código (no sirve para
// unirse) ni "Editar clase".
export function EncabezadoClase({ clase, perspectiva, tituloRef }: EncabezadoClaseProps) {
  const capacidades = CAPACIDADES_POR_PERSPECTIVA[perspectiva]
  const soloLectura = useSoloLecturaDeLaClase()
  const verCodigo = capacidades.verCodigo && !soloLectura
  const codigo = useCodigoDeClase(clase.id, verCodigo)

  return (
    <Card>
      <CardHeader>
        <Link
          to={capacidades.volverDestino}
          className={buttonVariants({ variant: "link", size: "enlace" })}
        >
          {capacidades.volverTexto}
        </Link>
        {/* T-08 (segunda pasada): CardHeader es un grid; un elemento de grid no se encoge bajo su
            ancho de contenido mínimo aunque lleve una regla de corte, así que hace falta min-w-0
            además de wrap-anywhere para que el título realmente se recorte a 360 px. */}
        <h1 ref={tituloRef} tabIndex={-1} className="min-w-0 text-h1 wrap-anywhere">
          {clase.nombre}
        </h1>
        {/* T-12 (ronda 2 del tester): mismo mecanismo que el h1 de arriba (grid de CardHeader). */}
        <p className="min-w-0 wrap-anywhere text-small text-muted-foreground">
          {textoDeMaestros(clase.maestros.map((maestro) => maestro.nombre))}
        </p>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {clase.descripcion && (
          <p className="max-w-prose min-w-0 wrap-anywhere whitespace-pre-line text-body">
            {clase.descripcion}
          </p>
        )}
        {verCodigo && (
          <CodigoDeClase
            claseId={clase.id}
            codigo={codigo.data}
            isError={codigo.isError}
            errorMensaje={codigo.isError ? mensajeDeConsultaClases(codigo.error) : ""}
          />
        )}
        {capacidades.editar && !soloLectura && (
          <Link
            to={`${baseDeClase(perspectiva, clase.id)}/editar`}
            className={buttonVariants({ variant: "link", size: "enlace" })}
          >
            {TEXTOS_CLASE.editar}
          </Link>
        )}
      </CardContent>
    </Card>
  )
}
