import { useRef, useState } from "react"
import { toast } from "sonner"

import { MensajeError } from "@/components/mensaje-error"
import { Button } from "@/components/ui/button"

import { TEXTOS_CODIGO } from "../data"
import { useRegeneracionEnVuelo, useRegenerarCodigo } from "../hooks"

interface CodigoDeClaseProps {
  claseId: string
  codigo: string | undefined
  isError: boolean
  errorMensaje: string
}

// §D-A5, §7.14: confirmación en línea antes de regenerar. El foco va a "Cancelar" al abrirla y, al
// cancelar, vuelve a "Regenerar código". Ese botón se desmonta mientras se confirma, así que el
// foco se restaura con un ref de callback (marca pendiente en un ref mutable, sin estado ni
// efecto) en cuanto React lo vuelve a montar.
export function CodigoDeClase({ claseId, codigo, isError, errorMensaje }: CodigoDeClaseProps) {
  const [copiando, setCopiando] = useState(false)
  const regenerar = useRegenerarCodigo(claseId)
  const regeneracion = useRegeneracionEnVuelo(claseId)
  const regenerandoRef = useRef<string | null>(null)
  // La confirmación es de una clase: no pasa abierta a otra si el encabezado sobrevive al cambio.
  const [confirmandoEn, setConfirmandoEn] = useState<string | null>(null)
  // Enmienda 3 (M-03): al cambiar de clase, la confirmación de la otra se cierra (no reaparece al volver).
  if (confirmandoEn !== null && confirmandoEn !== claseId) setConfirmandoEn(null)
  const confirmando = confirmandoEn === claseId
  const debeEnfocarRegenerar = useRef(false)

  const refBotonRegenerar = (nodo: HTMLButtonElement | null) => {
    if (nodo && debeEnfocarRegenerar.current) {
      nodo.focus()
      debeEnfocarRegenerar.current = false
    }
  }

  // T-05 (ronda 1 del tester): sin código que copiar (todavía cargando o la consulta falló), avisa
  // en lugar de no hacer nada; nunca `disabled` (CLAUDE.md, "Botón de acción principal…").
  const handleCopiar = async () => {
    if (!codigo) {
      toast.error(TEXTOS_CODIGO.errorCopiarSinCodigo)
      return
    }
    try {
      setCopiando(true)
      await navigator.clipboard.writeText(codigo)
      toast.success(TEXTOS_CODIGO.avisoCopiado)
    } catch {
      toast.error(TEXTOS_CODIGO.errorCopiarSinConexion)
    } finally {
      setCopiando(false)
    }
  }

  const cancelar = () => {
    debeEnfocarRegenerar.current = true
    setConfirmandoEn(null)
  }

  // CHORE-04 (§D-4 ter): la guarda guarda la clase y se suelta en el finally, porque el encabezado
  // sobrevive al cambio de clase y la clave por clase suelta al observador (el onSettled del mutate ya
  // no correría).
  const handleRegenerar = async () => {
    if (regenerandoRef.current === claseId || regeneracion.sigueEnVuelo()) return
    regenerandoRef.current = claseId
    try {
      await regenerar.mutateAsync()
    } catch {
      // El aviso lo da useRegenerarCodigo (T-03 de 01d1).
    } finally {
      if (regenerandoRef.current === claseId) regenerandoRef.current = null
      setConfirmandoEn((actual) => (actual === claseId ? null : actual))
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {isError ? (
        <MensajeError mensaje={errorMensaje} />
      ) : (
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-small text-muted-foreground">{TEXTOS_CODIGO.etiqueta}</span>
          <span className="font-mono text-h2">{codigo ?? "…"}</span>
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleCopiar}
          enEspera={copiando}
        >
          {TEXTOS_CODIGO.copiar}
        </Button>
        {confirmando ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-small">{TEXTOS_CODIGO.confirmacion}</span>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={() => void handleRegenerar()}
              enEspera={regenerar.isPending || regeneracion.enVuelo}
            >
              {TEXTOS_CODIGO.siRegenerar}
            </Button>
            <Button type="button" variant="outline" size="sm" autoFocus onClick={cancelar}>
              {TEXTOS_CODIGO.cancelar}
            </Button>
          </div>
        ) : (
          <Button
            ref={refBotonRegenerar}
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setConfirmandoEn(claseId)}
          >
            {TEXTOS_CODIGO.regenerar}
          </Button>
        )}
      </div>
    </div>
  )
}
