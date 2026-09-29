import { useEffect, useRef, useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { formatearFechaHora } from "@/lib/format"

import { TEXTOS_MAESTROS } from "../data"

interface EnlaceNuevoProps {
  url: string
  expiraEn: string
  // T-14: solo se mueve el foco a "Copiar enlace" si nadie más lo tenía cuando llegó la respuesta.
  enfocarAlMostrar: boolean
}

// DESIGN.md §7.13, "Dato que se muestra una sola vez": el enlace vive solo en el estado de quien lo
// pidió (M-05, R-09), nunca en la caché de TanStack Query.
export function EnlaceNuevo({ url, expiraEn, enfocarAlMostrar }: EnlaceNuevoProps) {
  const [copiando, setCopiando] = useState(false)
  const copiarBtnRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (enfocarAlMostrar) copiarBtnRef.current?.focus()
  }, [enfocarAlMostrar])

  const handleCopiar = async () => {
    try {
      setCopiando(true)
      await navigator.clipboard.writeText(url)
      toast.success(TEXTOS_MAESTROS.enlaces.copiada)
    } catch {
      toast.error(TEXTOS_MAESTROS.enlaces.noCopiada)
    } finally {
      setCopiando(false)
    }
  }

  return (
    <div
      role="status"
      className="flex flex-col gap-2 rounded-row border border-border bg-muted p-3"
    >
      <p className="text-h3 font-bold break-all">{url}</p>
      <p className="text-small text-muted-foreground">
        {TEXTOS_MAESTROS.enlaces.vence(formatearFechaHora(expiraEn))}
      </p>
      <p className="text-small text-muted-foreground">{TEXTOS_MAESTROS.enlaces.aviso}</p>
      <Button
        ref={copiarBtnRef}
        type="button"
        variant="outline"
        onClick={handleCopiar}
        enEspera={copiando}
      >
        {TEXTOS_MAESTROS.enlaces.copiarEnlace}
      </Button>
    </div>
  )
}
