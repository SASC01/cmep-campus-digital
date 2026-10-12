import { AdjuntosDePublicacion as AdjuntosDePublicacionCompartidos } from "@/components/adjuntos/adjuntos-de-publicacion"

import { mensajeDeErrorClases } from "../lib"
import type { Adjunto } from "../types"

interface AdjuntosDePublicacionProps {
  claseId: string
  adjuntos: readonly Adjunto[]
}

// TAREAS-01c (§D-9): el componente vive en components/adjuntos; este envoltorio conserva el nombre y
// las props de siempre y le pasa los mensajes de error de CLASES (mensajeDeErrorClases).
export function AdjuntosDePublicacion({ claseId, adjuntos }: AdjuntosDePublicacionProps) {
  return (
    <AdjuntosDePublicacionCompartidos
      claseId={claseId}
      adjuntos={adjuntos}
      mensajeDeError={mensajeDeErrorClases}
    />
  )
}
