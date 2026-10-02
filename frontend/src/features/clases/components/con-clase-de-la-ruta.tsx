import type { ReactNode } from "react"
import { useParams } from "react-router"

import { MensajeError } from "@/components/mensaje-error"

import { TEXTOS_CLASE } from "../data"

interface ConClaseDeLaRutaProps {
  children: (claseId: string) => ReactNode
}

// §D-C5 bis (N-B1): las vistas de una clase leen su :claseId aquí, una sola vez. Sin el parámetro
// (una ruta mal armada) no piden nada y muestran el mismo "No tienes acceso a esta clase." de un
// claseId inválido; con él, pasan el id tal cual, sin un valor de respaldo que pida la clase "".
export function ConClaseDeLaRuta({ children }: ConClaseDeLaRutaProps) {
  const { claseId } = useParams<{ claseId: string }>()

  if (claseId === undefined) {
    return <MensajeError mensaje={TEXTOS_CLASE.sinAcceso} />
  }

  return children(claseId)
}
