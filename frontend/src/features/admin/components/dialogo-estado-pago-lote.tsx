import { estadoPagoLoteSchema } from "@campus/shared"
import { useRef, useState, type FormEvent } from "react"

import { MensajeError } from "@/components/mensaje-error"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

import { TEXTOS_LOTE } from "../data"
import { useCambiarEstadoPagoLote } from "../hooks"
import { errorLocalDelLote, errorQueRedirigeElCliente, mensajeDeErrorAdmin } from "../lib"
import type { ErrorLocalDelLote, EstadoPago } from "../types"

interface DialogoEstadoPagoLoteProps {
  destino: EstadoPago
  // La selección vigente en este render (la vista la recorta con cada recarga).
  alumnoIds: readonly string[]
  onCerrar: () => void
  onHecho: () => void
}

// ADMIN-01g (§D-11, DH-09, E-23): el cambio masivo de estado de pago, una de las acciones sensibles de
// CLAUDE.md que van en diálogo. Lo monta la vista solo abierto, con el destino que eligió la persona
// (ninguna recarga lo cambia) y la selección vigente, que cuenta en cada render. Su contenido vive en el
// portal: lleva el contexto opaco y denso propio. Foco inicial en «Cancelar». Al confirmar valida con
// estadoPagoLoteSchema de shared/: sin alumnos o con más de 100, su texto (elegido por la incidencia),
// sin petición. Un error del servidor va en un solo MensajeError y el diálogo sigue abierto con la
// selección y el destino. En vuelo no se cierra; al cerrarlo, la mutación vuelve a reposo.
export function DialogoEstadoPagoLote({
  destino,
  alumnoIds,
  onCerrar,
  onHecho,
}: DialogoEstadoPagoLoteProps) {
  const cambiarLote = useCambiarEstadoPagoLote()
  const [errorLocal, setErrorLocal] = useState<ErrorLocalDelLote | null>(null)
  const enviandoRef = useRef(false)
  const cancelarRef = useRef<HTMLButtonElement>(null)

  const cerrar = () => {
    if (enviandoRef.current || cambiarLote.isPending) return
    cambiarLote.reset()
    onCerrar()
  }

  const handleSubmit = (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault()
    if (enviandoRef.current) return
    if (cambiarLote.isPending) return
    // T-05 de CHORE-03 (N-E15-4): el error del servidor del envío anterior se quita antes de validar, para
    // que la persona lea un solo mensaje: el de este envío.
    if (cambiarLote.isError) cambiarLote.reset()

    const resultado = estadoPagoLoteSchema.safeParse({ alumnoIds, estadoPago: destino })
    if (!resultado.success) {
      // Los ids son las claves de la selección, así que nunca van repetidos: la única otra incidencia
      // posible es la del tamaño, y sin alumnos es "minimo".
      setErrorLocal(errorLocalDelLote(resultado.error.issues) ?? "minimo")
      return
    }

    setErrorLocal(null)
    enviandoRef.current = true
    cambiarLote.mutate(resultado.data, {
      onSuccess: onHecho,
      onSettled: () => {
        enviandoRef.current = false
      },
    })
  }

  return (
    <Dialog
      open
      onOpenChange={(abierto) => {
        if (!abierto) cerrar()
      }}
    >
      <DialogContent
        data-material="opaco"
        data-densidad="densa"
        onOpenAutoFocus={(evento) => {
          evento.preventDefault()
          cancelarRef.current?.focus()
        }}
        onCloseAutoFocus={(evento) => evento.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>{TEXTOS_LOTE.titulo}</DialogTitle>
          <DialogDescription>{TEXTOS_LOTE.texto(alumnoIds.length, destino)}</DialogDescription>
        </DialogHeader>
        <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-4">
          {errorLocal === "minimo" && <MensajeError mensaje={TEXTOS_LOTE.eligeAlMenosUno} />}
          {errorLocal === "maximo" && <MensajeError mensaje={TEXTOS_LOTE.maximo} />}
          {cambiarLote.isError && !errorQueRedirigeElCliente(cambiarLote.error) && (
            <MensajeError mensaje={mensajeDeErrorAdmin(cambiarLote.error)} />
          )}
          <DialogFooter>
            <Button ref={cancelarRef} type="button" variant="outline" onClick={cerrar}>
              {TEXTOS_LOTE.cancelar}
            </Button>
            <Button type="submit" variant="primary" enEspera={cambiarLote.isPending}>
              {TEXTOS_LOTE.confirmar}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
