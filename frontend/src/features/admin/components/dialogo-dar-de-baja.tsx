import { useRef } from "react"

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

import { TEXTOS_USUARIO } from "../data"
import { useCambiarActivo } from "../hooks"
import { errorQueRedirigeElCliente, mensajeDeErrorAdmin } from "../lib"
import type { UsuarioAdminFila } from "../types"

interface DialogoDarDeBajaProps {
  cuenta: UsuarioAdminFila
  onCerrar: () => void
  // Con éxito: se cierra y quien lo abrió decide el foco cuando la ficha traiga el cambio.
  onHecho: () => void
}

// ADMIN-01f (§D-11, DH-09, E-23): dar de baja es una de las acciones sensibles de CLAUDE.md que van en
// diálogo. Quien lo abre lo monta solo abierto (cada apertura empieza sin error) y decide el foco al
// cerrarlo. Su contenido vive en el portal, fuera del contenedor del rol: lleva el contexto opaco y denso
// propio. Foco inicial en «Cancelar». Mientras la baja está en vuelo no se cierra; al cerrarlo, la baja
// vuelve a reposo. Un 409 (MAESTRO_CON_CLASES, CUENTA_DE_ADMINISTRACION) o un VALIDACION se leen en un
// solo MensajeError dentro del diálogo, que sigue abierto.
export function DialogoDarDeBaja({ cuenta, onCerrar, onHecho }: DialogoDarDeBajaProps) {
  const baja = useCambiarActivo()
  const enviandoRef = useRef(false)
  const cancelarRef = useRef<HTMLButtonElement>(null)

  const cerrar = () => {
    if (baja.isPending) return
    baja.reset()
    onCerrar()
  }

  const handleConfirmar = () => {
    if (enviandoRef.current) return
    enviandoRef.current = true
    baja.mutate(
      { id: cuenta.id, activo: false },
      {
        onSuccess: onHecho,
        onSettled: () => {
          enviandoRef.current = false
        },
      },
    )
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
          <DialogTitle className="wrap-anywhere">
            {TEXTOS_USUARIO.baja.titulo(cuenta.nombre)}
          </DialogTitle>
          <DialogDescription>{TEXTOS_USUARIO.baja.texto}</DialogDescription>
        </DialogHeader>
        {baja.isError && !errorQueRedirigeElCliente(baja.error) && (
          <MensajeError mensaje={mensajeDeErrorAdmin(baja.error)} />
        )}
        <DialogFooter>
          <Button ref={cancelarRef} type="button" variant="outline" onClick={cerrar}>
            {TEXTOS_USUARIO.baja.cancelar}
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleConfirmar}
            enEspera={baja.isPending}
          >
            {TEXTOS_USUARIO.baja.confirmar}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
