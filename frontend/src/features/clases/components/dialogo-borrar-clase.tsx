import { useEffect, useRef, useState, type ReactNode } from "react"

import { Cargando } from "@/components/cargando"
import { MensajeError } from "@/components/mensaje-error"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

import { TEXTOS_BORRAR_CLASE } from "../data"
import { useBorrarClase, useConteoDeBorrado, useOlvidarConteoDeBorrado } from "../hooks"
import {
  consecuenciaDelBorrado,
  errorQueRedirigeElCliente,
  esClaseNoArchivada,
  esClaseQueYaNoExiste,
  focoPerdido,
  mensajeDeConsultaClases,
  mensajeDeErrorClases,
} from "../lib"
import type { ClaseAdmin, ConteoDeBorradoRespuesta } from "../types"

interface DialogoAbiertoProps {
  clase: ClaseAdmin
  onCerrar: () => void
  onBorrada: (id: string) => void
}

// ADMIN-01c (§D-10, E-23, ADM-1C09): el diálogo vive en el portal, fuera del contenedor del rol, así
// que su contenido lleva el contexto opaco y denso. Se monta solo abierto (sin forceMount): cada
// apertura pide el conteo y empieza sin error. Foco inicial en «Cancelar». Mientras el borrado está en
// vuelo no se cierra. El foco al cerrarse lo decide la vista (Radix solo lo devuelve a un
// DialogTrigger, que aquí no hay): al cancelar, al botón que lo abrió; tras borrar, a la fila vecina
// (DESIGN.md §7.14).
function DialogoAbierto({ clase, onCerrar, onBorrada }: DialogoAbiertoProps) {
  const conteo = useConteoDeBorrado(clase.id)
  const olvidarConteo = useOlvidarConteoDeBorrado()
  const borrar = useBorrarClase()
  const enviandoRef = useRef(false)
  const cancelarRef = useRef<HTMLButtonElement>(null)
  // El conteo que la persona tenía a la vista al pulsar «Sí, borrar definitivamente» por primera vez en
  // esta apertura. Desde ese momento es el que se ve, aunque el conteo se vuelva a pedir.
  const [confirmado, setConfirmado] = useState<ConteoDeBorradoRespuesta | null>(null)

  const cerrar = () => {
    if (borrar.isPending) return
    borrar.reset()
    olvidarConteo(clase.id)
    onCerrar()
  }

  const handleBorrar = () => {
    if (enviandoRef.current) return
    enviandoRef.current = true
    if (borrar.isIdle && conteo.data !== undefined) setConfirmado(conteo.data)
    borrar.mutate(
      { id: clase.id },
      {
        onSuccess: () => {
          onBorrada(clase.id)
        },
        onSettled: () => {
          enviandoRef.current = false
        },
      },
    )
  }

  // Qué muestra el diálogo (correcciones de las rondas 1 y 2, T-03 y T-04, y los estados vecinos antes de
  // la ronda 3): un solo mensaje, el del último envío de la persona.
  // - Antes de pulsar «Sí, borrar definitivamente» en esta apertura, si el conteo falla (también al
  //   volver a pedirse al recuperar la conexión), su error sustituye al conteo y al botón: nunca
  //   "Cierra y vuelve a intentarlo" junto a «Sí, borrar definitivamente».
  // - Desde que se pulsa (el borrado en vuelo o ya respondido con error), manda el borrado: se ve el
  //   conteo confirmado (congelado, aunque el conteo se vuelva a pedir y cambie), el botón y, si falló,
  //   solo su error. Un error posterior del conteo ya no se muestra.
  // - Salvo uno: si, con el borrado ya respondido, el conteo dice que la clase ya no existe (otra pestaña
  //   la borró), eso gana: la frase de recuperación sustituye al mensaje del borrado y al botón (borrar
  //   otra vez no puede servir) y las listas ya se renovaron. Con el borrado en vuelo se espera a que
  //   responda.
  // - Un error con que apiClient redirige no se pinta (la página se va), ni del borrado ni del conteo.
  // - Al cerrar el diálogo, el borrado vuelve a reposo (`reset()`) y el conteo sale de la caché.
  const conteoQueRedirige = conteo.isError && errorQueRedirigeElCliente(conteo.error)
  const yaNoExiste =
    conteo.isError && esClaseQueYaNoExiste(conteo.error) && !borrar.isIdle && !borrar.isPending
  const conteoFallo = !conteoQueRedirige && conteo.isError && (borrar.isIdle || yaNoExiste)
  const borradoFallo = borrar.isError && !conteoFallo && !errorQueRedirigeElCliente(borrar.error)
  const conteoVisible = !borrar.isIdle && confirmado !== null ? confirmado : conteo.data

  // Si el botón desaparece con el foco dentro (el conteo dice que la clase ya no existe), el foco va a
  // «Cancelar», dentro del diálogo.
  useEffect(() => {
    if (!conteoFallo) return
    const activo = document.activeElement
    if (!focoPerdido(document) && activo?.getAttribute("role") !== "dialog") return
    cancelarRef.current?.focus()
  })

  // Estados del conteo en orden: error → cargando → datos. Sin conteo no se ofrece borrar.
  const cuerpo = (): ReactNode => {
    if (conteoFallo && esClaseNoArchivada(conteo.error)) {
      return <MensajeError mensaje={mensajeDeConsultaClases(conteo.error)} />
    }
    if (conteoFallo) return <MensajeError mensaje={TEXTOS_BORRAR_CLASE.errorConteo} />
    if (conteoVisible === undefined) return <Cargando />
    return <p>{consecuenciaDelBorrado(conteoVisible)}</p>
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
        aria-describedby={undefined}
        onOpenAutoFocus={(evento) => {
          evento.preventDefault()
          cancelarRef.current?.focus()
        }}
        onCloseAutoFocus={(evento) => evento.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="wrap-anywhere">
            {TEXTOS_BORRAR_CLASE.titulo(clase.nombre)}
          </DialogTitle>
        </DialogHeader>
        {cuerpo()}
        {borradoFallo && <MensajeError mensaje={mensajeDeErrorClases(borrar.error)} />}
        <DialogFooter>
          <Button ref={cancelarRef} type="button" variant="outline" onClick={cerrar}>
            {TEXTOS_BORRAR_CLASE.cancelar}
          </Button>
          {conteoVisible !== undefined && !conteoFallo && (
            <Button
              type="button"
              variant="destructive"
              onClick={handleBorrar}
              enEspera={borrar.isPending}
            >
              {TEXTOS_BORRAR_CLASE.siBorrar}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

interface DialogoBorrarClaseProps {
  clase: ClaseAdmin | null
  onCerrar: () => void
  onBorrada: (id: string) => void
}

// ADMIN-01c (§D-10, DH-09): el borrado definitivo, una de las acciones destructivas de CLAUDE.md que
// van en diálogo. Quien lo abre le pasa la clase; con `null` está cerrado.
export function DialogoBorrarClase({ clase, onCerrar, onBorrada }: DialogoBorrarClaseProps) {
  if (clase === null) return null
  return <DialogoAbierto key={clase.id} clase={clase} onCerrar={onCerrar} onBorrada={onBorrada} />
}
