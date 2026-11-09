import { accesoSchema } from "@campus/shared"
import { useRef, useState, type FormEvent } from "react"

import { ErrorDeCampo } from "@/components/error-de-campo"
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
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

import { TEXTOS_USUARIO } from "../data"
import { useCambiarAcceso } from "../hooks"
import { erroresPorCampoAdmin, errorQueRedirigeElCliente, mensajeDeErrorAdmin } from "../lib"
import type { ErroresFormularioAdmin, UsuarioAdminFila } from "../types"

interface DialogoRestringirAccesoProps {
  cuenta: UsuarioAdminFila
  onCerrar: () => void
  // Con éxito: se cierra y quien lo abrió decide el foco cuando la ficha traiga el cambio.
  onHecho: () => void
}

// ADMIN-01f (§D-11, DH-09, E-23): restringir el acceso de un alumno es una de las acciones sensibles de
// CLAUDE.md que van en diálogo, con el motivo opcional (S-10: hasta 300 caracteres visibles). Se monta
// solo abierto; su contenido lleva el contexto opaco y denso propio, porque vive en el portal. Foco
// inicial en «Cancelar». El motivo se valida con accesoSchema de shared/ (su error, junto al campo); un
// error del servidor va en un solo MensajeError, el diálogo sigue abierto y lo escrito se conserva.
// Mientras la petición está en vuelo no se cierra; al cerrarlo, la mutación vuelve a reposo.
export function DialogoRestringirAcceso({
  cuenta,
  onCerrar,
  onHecho,
}: DialogoRestringirAccesoProps) {
  const restringir = useCambiarAcceso()
  const [errores, setErrores] = useState<ErroresFormularioAdmin>({})
  const enviandoRef = useRef(false)
  const cancelarRef = useRef<HTMLButtonElement>(null)

  const cerrar = () => {
    if (restringir.isPending) return
    restringir.reset()
    onCerrar()
  }

  const handleSubmit = (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault()
    if (enviandoRef.current) return
    if (restringir.isPending) return
    // T-05 de CHORE-03: el error del servidor del envío anterior se quita antes de validar, para que la
    // persona lea un solo mensaje: el de este envío.
    if (restringir.isError) restringir.reset()

    const formulario = new FormData(evento.currentTarget)
    const resultado = accesoSchema.safeParse({
      restringido: true,
      motivo: formulario.get("motivo"),
    })
    if (!resultado.success) {
      setErrores(erroresPorCampoAdmin(resultado.error.issues))
      return
    }

    setErrores({})
    enviandoRef.current = true
    restringir.mutate(
      { id: cuenta.id, datos: resultado.data },
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
            {TEXTOS_USUARIO.restringir.titulo(cuenta.nombre)}
          </DialogTitle>
          <DialogDescription>{TEXTOS_USUARIO.restringir.texto}</DialogDescription>
        </DialogHeader>
        <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-4">
          {restringir.isError && !errorQueRedirigeElCliente(restringir.error) && (
            <MensajeError mensaje={mensajeDeErrorAdmin(restringir.error)} />
          )}
          <div className="flex flex-col gap-2">
            <Label htmlFor="motivo-restriccion">{TEXTOS_USUARIO.restringir.motivo}</Label>
            <Textarea
              id="motivo-restriccion"
              name="motivo"
              rows={3}
              autoComplete="off"
              aria-invalid={errores.motivo !== undefined}
              aria-describedby={
                errores.motivo
                  ? "motivo-restriccion-ayuda motivo-restriccion-error"
                  : "motivo-restriccion-ayuda"
              }
            />
            <p id="motivo-restriccion-ayuda" className="text-small text-muted-foreground">
              {TEXTOS_USUARIO.restringir.ayuda}
            </p>
            {errores.motivo && (
              <ErrorDeCampo id="motivo-restriccion-error">{errores.motivo}</ErrorDeCampo>
            )}
          </div>
          <DialogFooter>
            <Button ref={cancelarRef} type="button" variant="outline" onClick={cerrar}>
              {TEXTOS_USUARIO.restringir.cancelar}
            </Button>
            <Button type="submit" variant="destructive" enEspera={restringir.isPending}>
              {TEXTOS_USUARIO.restringir.confirmar}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
