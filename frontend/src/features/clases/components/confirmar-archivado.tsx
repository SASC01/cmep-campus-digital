import { useEffect, useRef } from "react"

import { Button } from "@/components/ui/button"

import { TEXTOS_CLASES_ADMIN } from "../data"
import { useArchivarClase, useGestionEnVuelo } from "../hooks"
import type { ClaseAdmin } from "../types"

interface ConfirmarArchivadoProps {
  clase: ClaseAdmin
  onCancelar: () => void
}

// ADMIN-01c (§D-10, DESIGN.md §7.14): la confirmación en línea de "Archivar", en la misma fila. Al
// abrirse, el foco va a «Cancelar», nunca a la acción. «Sí, archivar» lleva enEspera y una guarda con
// ref (dos clics seguidos, una sola petición). El aviso y el error viven en useArchivarClase; si la clase
// sale de la lista, la vista lleva el foco a la fila vecina. El nombre de cada botón suma el de la clase
// en el mismo texto sr-only. Corrección de la ronda 1 (T-02): la petición en vuelo se lee de la caché de
// mutaciones, así que una confirmación que se vuelve a montar (otra pestaña de la lista y de regreso)
// sigue en espera y no manda otra. Mientras archivar está en vuelo, «Cancelar» no cierra la
// confirmación: la petición ya salió y no se puede retirar (como «Cancelar» del diálogo de borrar).
export function ConfirmarArchivado({ clase, onCancelar }: ConfirmarArchivadoProps) {
  const archivar = useArchivarClase(clase.id)
  const { enVuelo, sigueEnVuelo } = useGestionEnVuelo("archivar", clase.id)
  const enviandoRef = useRef(false)
  const cancelarRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    cancelarRef.current?.focus()
  }, [])

  const handleArchivar = () => {
    if (enviandoRef.current || sigueEnVuelo()) return
    enviandoRef.current = true
    archivar.mutate(undefined, {
      onSettled: () => {
        enviandoRef.current = false
      },
    })
  }

  const handleCancelar = () => {
    if (enviandoRef.current || sigueEnVuelo()) return
    archivar.reset()
    onCancelar()
  }

  return (
    <div className="flex flex-col gap-2 py-2">
      <p className="text-small">{TEXTOS_CLASES_ADMIN.confirmarArchivado}</p>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="destructive"
          size="sm"
          onClick={handleArchivar}
          enEspera={archivar.isPending || enVuelo}
        >
          <span aria-hidden="true">{TEXTOS_CLASES_ADMIN.siArchivar}</span>
          <span className="sr-only">
            {TEXTOS_CLASES_ADMIN.accionSobre(TEXTOS_CLASES_ADMIN.siArchivar, clase.nombre)}
          </span>
        </Button>
        <Button
          ref={cancelarRef}
          type="button"
          variant="outline"
          size="sm"
          onClick={handleCancelar}
        >
          <span aria-hidden="true">{TEXTOS_CLASES_ADMIN.cancelar}</span>
          <span className="sr-only">
            {TEXTOS_CLASES_ADMIN.accionSobre(TEXTOS_CLASES_ADMIN.cancelar, clase.nombre)}
          </span>
        </Button>
      </div>
    </div>
  )
}
