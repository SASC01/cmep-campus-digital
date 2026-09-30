import { useRef, useState } from "react"
import { toast } from "sonner"

import { MensajeError } from "@/components/mensaje-error"
import { Button } from "@/components/ui/button"

import { TEXTOS_CODIGO } from "../data"
import { useRegenerarCodigo } from "../hooks"

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
  const [confirmando, setConfirmando] = useState(false)
  const regenerar = useRegenerarCodigo(claseId)
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
    setConfirmando(false)
  }

  const handleRegenerar = () => {
    regenerar.mutate(undefined, {
      onSuccess: () => {
        toast.success(TEXTOS_CODIGO.avisoRegenerado)
        setConfirmando(false)
      },
      // T-06 (ronda 1 del tester): un fallo cerraba la confirmación sin avisar; el maestro podía
      // creer que regeneró el código.
      onError: () => {
        toast.error(TEXTOS_CODIGO.avisoErrorRegenerar)
        setConfirmando(false)
      },
    })
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
              onClick={handleRegenerar}
              enEspera={regenerar.isPending}
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
            onClick={() => setConfirmando(true)}
          >
            {TEXTOS_CODIGO.regenerar}
          </Button>
        )}
      </div>
    </div>
  )
}
