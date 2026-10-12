import { useEffect, useRef, useState } from "react"

import { AdjuntosDePublicacion } from "@/components/adjuntos/adjuntos-de-publicacion"
import { Button } from "@/components/ui/button"

import { TEXTOS_TU_TRABAJO } from "../data"
import { useAnularEntrega } from "../hooks"
import { fraseDeEntrega, mensajeDeErrorTareas, rutaDeMiEntrega } from "../lib"
import type { MiEntrega } from "../types"
import { ListaDeEnlaces } from "./lista-de-enlaces"

interface EntregaRealizadaProps {
  claseId: string
  tareaId: string
  entrega: MiEntrega
  // P-02 (a): la tarea no acepta tardías y ya es tarde; la entrega queda en solo lectura.
  cerrada: boolean
  // Ya es tarde y la tarea acepta tardías: volver a entregar quedará con retraso.
  conRetrasoSiVuelve: boolean
  // Al anular, "Tu trabajo" lleva el foco a su encabezado (§D-9.4).
  onAnulada: () => void
}

// ENTREGAS-01d (§D-9.2 y §D-9.4, DESIGN.md §7.24): la entrega hecha. Dice cuándo se entregó (o se marcó
// como completada, S-13), sus archivos (descargados por la ruta de la entrega) y sus enlaces. Si se
// puede anular, "Anular entrega" pide la confirmación en línea de §7.14: el foco va a "Cancelar" al
// pedirla y vuelve a "Anular entrega" al cancelar. "Sí, anular entrega" espera la respuesta con una
// guarda síncrona con ref (un doble clic hace una sola petición) y, mientras vuela, "Cancelar" no
// cierra nada.
export function EntregaRealizada({
  claseId,
  tareaId,
  entrega,
  cerrada,
  conRetrasoSiVuelve,
  onAnulada,
}: EntregaRealizadaProps) {
  const anular = useAnularEntrega(claseId, tareaId)
  const [confirmando, setConfirmando] = useState(false)
  const anulandoRef = useRef(false)
  const anularBtnRef = useRef<HTMLButtonElement>(null)
  const cancelarBtnRef = useRef<HTMLButtonElement>(null)
  const confirmandoAnteriorRef = useRef(confirmando)
  const frase = fraseDeEntrega(entrega)

  useEffect(() => {
    if (confirmandoAnteriorRef.current === confirmando) return
    confirmandoAnteriorRef.current = confirmando
    if (confirmando) {
      cancelarBtnRef.current?.focus()
      return
    }
    anularBtnRef.current?.focus()
  }, [confirmando])

  const handleAnular = async () => {
    if (anulandoRef.current) return
    anulandoRef.current = true
    try {
      await anular.mutateAsync()
      onAnulada()
    } catch {
      // El aviso lo da el gancho y la entrega se vuelve a pedir: la vista cambia sola.
    } finally {
      anulandoRef.current = false
    }
  }

  const fraseDeConsecuencia = conRetrasoSiVuelve
    ? TEXTOS_TU_TRABAJO.confirmarAnularConRetraso
    : TEXTOS_TU_TRABAJO.confirmarAnular

  return (
    <div className="flex flex-col gap-3">
      {frase !== null && <p className="text-body text-foreground">{frase}</p>}
      <AdjuntosDePublicacion
        claseId={claseId}
        adjuntos={entrega.adjuntos}
        mensajeDeError={mensajeDeErrorTareas}
        rutaDeArchivos={rutaDeMiEntrega(claseId, tareaId)}
      />
      {entrega.enlaces.length > 0 && <ListaDeEnlaces enlaces={entrega.enlaces} />}
      {entrega.estado === "calificado" && (
        <p className="text-small text-muted-foreground">{TEXTOS_TU_TRABAJO.calificada}</p>
      )}
      {cerrada && <p className="text-small text-muted-foreground">{TEXTOS_TU_TRABAJO.cerrada}</p>}
      {entrega.puedeAnular && !confirmando && (
        <div>
          <Button
            ref={anularBtnRef}
            type="button"
            variant="outline"
            onClick={() => setConfirmando(true)}
          >
            {TEXTOS_TU_TRABAJO.anular}
          </Button>
        </div>
      )}
      {entrega.puedeAnular && confirmando && (
        <div className="flex flex-col gap-2">
          <p className="text-small text-foreground">{fraseDeConsecuencia}</p>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="destructive"
              enEspera={anular.isPending}
              onClick={() => void handleAnular()}
            >
              {TEXTOS_TU_TRABAJO.siAnular}
            </Button>
            <Button
              ref={cancelarBtnRef}
              type="button"
              variant="outline"
              onClick={() => {
                if (anulandoRef.current) return
                setConfirmando(false)
              }}
            >
              {TEXTOS_TU_TRABAJO.cancelar}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
