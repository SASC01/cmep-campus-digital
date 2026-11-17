import { Clock } from "lucide-react"
import { useState } from "react"

import { FirmaDelAutor } from "@/components/clase/firma-del-autor"
import { useSoloLecturaDeLaClase } from "@/components/clase/hooks"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { formatearFechaHora } from "@/lib/format"

import { TEXTOS_PARTICIPACIONES } from "../data"
import { useReplicas } from "../hooks"
import { conteoDeReplicasDeLaParticipacion, unirPaginasConLaUltimaAparicion } from "../lib"
import type { Participacion } from "../types"
import { BorrarDelForo, ReplicasDeParticipacion } from "./replicas-de-participacion"

interface ParticipacionDelForoProps {
  claseId: string
  foroId: string
  participacion: Participacion
  puedeReplicar: boolean
  onBorrada: () => void
}

// FORO-01d (§D-8.4, DH-11 a): una principal con su firma, su fecha y hora, «Tuya» y «Con retraso» si el
// servidor lo dice, el texto plano, el control de réplicas (un solo botón que conserva el foco) y su
// bloque. El conteo plegado es el mayor entre el de la lista y lo que el bloque ya cargó (O-r1-2). El
// admin sin réplicas que leer no ve el control. El bloque, la réplica escrita y la confirmación de borrar
// son de esta participación (key={participacion.id} en la lista).
export function ParticipacionDelForo({
  claseId,
  foroId,
  participacion,
  puedeReplicar,
  onBorrada,
}: ParticipacionDelForoProps) {
  // §D-11: «Borrar» lo decide el dato (`puedeBorrar`, del servidor: solo el admin), nunca el rol; en una
  // clase archivada no se pinta.
  const soloLectura = useSoloLecturaDeLaClase()
  const [abierta, setAbierta] = useState(false)
  const enCache = useReplicas(claseId, foroId, participacion.id, false)
  const cargadas =
    enCache.data === undefined
      ? 0
      : unirPaginasConLaUltimaAparicion(enCache.data.pages.map((pagina) => pagina.replicas)).length
  const conteo = conteoDeReplicasDeLaParticipacion(participacion.replicas, cargadas)
  const hayControl = conteo > 0 || puedeReplicar

  const textoDelControl = (): string => {
    if (abierta) return TEXTOS_PARTICIPACIONES.ocultarReplicas
    if (conteo > 0) return TEXTOS_PARTICIPACIONES.verReplicas(conteo)
    return TEXTOS_PARTICIPACIONES.replicar
  }

  return (
    <article className="flex flex-col gap-2">
      <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-small text-muted-foreground">
        <FirmaDelAutor autor={participacion.autor} />
        <span>{formatearFechaHora(participacion.creadoEn)}</span>
        {participacion.propia && <span>{TEXTOS_PARTICIPACIONES.tuya}</span>}
        {participacion.conRetraso === true && (
          <Badge variant="warning" icon={<Clock aria-hidden="true" />}>
            {TEXTOS_PARTICIPACIONES.conRetraso}
          </Badge>
        )}
      </p>
      <p className="max-w-prose wrap-anywhere whitespace-pre-line text-body">
        {participacion.texto}
      </p>
      <div className="flex flex-wrap items-center gap-2">
        {hayControl && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            aria-expanded={abierta}
            onClick={() => setAbierta(!abierta)}
          >
            {textoDelControl()}
          </Button>
        )}
        {!soloLectura && participacion.puedeBorrar && (
          <BorrarDelForo
            claseId={claseId}
            foroId={foroId}
            participacionId={participacion.id}
            principalId={null}
            nombreDelAutor={participacion.autor.nombre}
            onBorrada={onBorrada}
          />
        )}
      </div>
      {abierta && (
        <ReplicasDeParticipacion
          claseId={claseId}
          foroId={foroId}
          participacion={participacion}
          puedeReplicar={puedeReplicar}
        />
      )}
    </article>
  )
}
