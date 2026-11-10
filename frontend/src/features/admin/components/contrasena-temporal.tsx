import { useEffect, useRef, useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"

import { TEXTOS_CUENTAS } from "../data"

interface ContrasenaTemporalProps {
  contrasena: string
  // T-11 (ronda 3): solo se mueve el foco a "Copiar" si el admin seguía dentro de la confirmación
  // cuando llegó la temporal. Si movió el foco a otro campo mientras la petición estaba en vuelo
  // (por ejemplo, para invitar a un maestro), esta llegada no se lo debe robar.
  enfocarAlMostrar: boolean
  // ADMIN-01f (alta de alumno, §7.13): lo que se anuncia antes de la temporal ("Cuenta creada para …").
  encabezado?: string
}

// DEC-19: se muestra una sola vez (la llamada ya ocurrió; esto solo la renderiza mientras el
// componente que la pidió siga montado). Sin fuente monoespaciada: CLAUDE.md la reserva para
// códigos de clase, y el alfabeto de la temporal ya evita caracteres ambiguos.
// ADMIN-01f (E-27, como E-14): el role="status" envuelve solo lo que se anuncia, nunca «Copiar»: un
// lector de pantalla no lee el botón como parte del anuncio.
export function ContrasenaTemporal({
  contrasena,
  enfocarAlMostrar,
  encabezado,
}: ContrasenaTemporalProps) {
  const [copiando, setCopiando] = useState(false)
  const copiarBtnRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (enfocarAlMostrar) copiarBtnRef.current?.focus()
  }, [enfocarAlMostrar])

  const handleCopiar = async () => {
    try {
      setCopiando(true)
      await navigator.clipboard.writeText(contrasena)
      toast.success(TEXTOS_CUENTAS.ficha.copiada)
    } catch {
      toast.error(TEXTOS_CUENTAS.ficha.noCopiada)
    } finally {
      setCopiando(false)
    }
  }

  return (
    <div className="flex flex-col gap-2 rounded-row border border-border bg-muted p-3">
      <div role="status" className="flex flex-col gap-2">
        {encabezado !== undefined && <p className="text-small font-medium">{encabezado}</p>}
        <p className="text-h3 font-bold tracking-normal">{contrasena}</p>
        <p className="text-small text-muted-foreground">{TEXTOS_CUENTAS.ficha.temporalAviso}</p>
      </div>
      <Button
        ref={copiarBtnRef}
        type="button"
        variant="outline"
        onClick={handleCopiar}
        enEspera={copiando}
      >
        {TEXTOS_CUENTAS.ficha.copiar}
      </Button>
    </div>
  )
}
