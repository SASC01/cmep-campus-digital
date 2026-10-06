import { useEffect, useRef, useState } from "react"

import { Button } from "@/components/ui/button"

import { TEXTOS_MAESTROS_DE_CLASE } from "../data"
import { useFilaEnFoco } from "../hooks"
import { focoPerdido, vecinaDeFila } from "../lib"
import type { MaestroDeLista } from "../types"

interface FilaMaestroProps {
  maestro: MaestroDeLista
  // Con confirmación (los maestros de una clase) o directo (los elegidos al crear, que solo cambian
  // el estado del formulario).
  confirmar: boolean
  quitando: boolean
  puedeQuitar: boolean
  onQuitar: (maestro: MaestroDeLista) => void
  registrarQuitar: (id: string, nodo: HTMLButtonElement | null) => void
}

// DESIGN.md §7.14: confirmación en línea en la misma fila. Al pedirla, el foco va a "Cancelar"
// (nunca a la acción destructiva) y, al cancelar, vuelve a "Quitar". El nombre accesible de cada
// botón suma el nombre del maestro como texto sr-only (§7.9), nunca aria-label.
function FilaMaestro({
  maestro,
  confirmar,
  quitando,
  puedeQuitar,
  onQuitar,
  registrarQuitar,
}: FilaMaestroProps) {
  const [confirmando, setConfirmando] = useState(false)
  const quitarBtnRef = useRef<HTMLButtonElement | null>(null)
  const cancelarBtnRef = useRef<HTMLButtonElement>(null)
  const confirmandoAnteriorRef = useRef(confirmando)

  useEffect(() => {
    if (confirmandoAnteriorRef.current === confirmando) return
    confirmandoAnteriorRef.current = confirmando
    if (confirmando) {
      cancelarBtnRef.current?.focus()
      return
    }
    quitarBtnRef.current?.focus()
  }, [confirmando])

  const alPedirQuitar = () => {
    if (confirmar) {
      setConfirmando(true)
      return
    }
    onQuitar(maestro)
  }

  return (
    <li
      data-maestro-id={maestro.id}
      className="flex flex-wrap items-center justify-between gap-3 border-b border-border py-3 last:border-0"
    >
      <div className="flex min-w-0 flex-col">
        <span className="wrap-anywhere font-bold">{maestro.nombre}</span>
        {maestro.email !== undefined && (
          <span className="wrap-anywhere text-small text-muted-foreground">{maestro.email}</span>
        )}
      </div>
      {puedeQuitar && !confirmando && (
        <Button
          ref={(nodo) => {
            quitarBtnRef.current = nodo
            registrarQuitar(maestro.id, nodo)
          }}
          type="button"
          variant="ghost"
          size="sm"
          onClick={alPedirQuitar}
        >
          {TEXTOS_MAESTROS_DE_CLASE.quitar} <span className="sr-only">{maestro.nombre}</span>
        </Button>
      )}
      {puedeQuitar && confirmando && (
        <div className="flex w-full flex-col gap-2 py-1">
          <p className="text-small">{TEXTOS_MAESTROS_DE_CLASE.consecuencia}</p>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={() => onQuitar(maestro)}
              enEspera={quitando}
            >
              {TEXTOS_MAESTROS_DE_CLASE.siQuitar} <span className="sr-only">{maestro.nombre}</span>
            </Button>
            <Button
              ref={cancelarBtnRef}
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setConfirmando(false)}
            >
              {TEXTOS_MAESTROS_DE_CLASE.cancelar} <span className="sr-only">{maestro.nombre}</span>
            </Button>
          </div>
        </div>
      )}
    </li>
  )
}

interface ListaMaestrosDeClaseProps {
  maestros: readonly MaestroDeLista[]
  confirmar: boolean
  quitando: boolean
  // Con un solo maestro no se puede quitar a nadie (una clase necesita al menos uno).
  puedeQuitar: boolean
  onQuitar: (maestro: MaestroDeLista) => void
  // Cuando el foco se pierde y ya no queda un "Quitar" al que ir, el foco va aquí (el encabezado
  // del panel o el campo de búsqueda); nunca a <body>.
  alQuedarseSinDestino: () => void
  etiqueta: string
}

// §D-2C2, DESIGN.md §7.14: la lista de maestros, la de una clase o la de los elegidos al crearla.
// Cuando una fila se quita, el foco va al "Quitar" de la fila que ocupa su lugar (la siguiente o, si
// era la última, la anterior); sin ninguno, a `alQuedarseSinDestino`. Se reacciona después de cada
// render, sin depender del onSuccess de ninguna petición.
export function ListaMaestrosDeClase({
  maestros,
  confirmar,
  quitando,
  puedeQuitar,
  onQuitar,
  alQuedarseSinDestino,
  etiqueta,
}: ListaMaestrosDeClaseProps) {
  const botonesQuitar = useRef(new Map<string, HTMLButtonElement>())
  const filaEnFocoRef = useFilaEnFoco("data-maestro-id")
  const idsPrevios = useRef<string[] | undefined>(undefined)

  const registrarQuitar = (id: string, nodo: HTMLButtonElement | null) => {
    if (nodo === null) {
      botonesQuitar.current.delete(id)
      return
    }
    botonesQuitar.current.set(id, nodo)
  }

  useEffect(() => {
    const ids = maestros.map((maestro) => maestro.id)
    const previos = idsPrevios.current
    idsPrevios.current = ids
    const id = filaEnFocoRef.current
    if (id === null || !focoPerdido(document)) return
    filaEnFocoRef.current = null
    const vecina = vecinaDeFila(previos, ids, id)
    const destino = vecina === undefined ? undefined : botonesQuitar.current.get(vecina)
    if (destino === undefined) {
      alQuedarseSinDestino()
      return
    }
    destino.focus()
  })

  return (
    <ul aria-label={etiqueta} className="flex flex-col">
      {maestros.map((maestro) => (
        <FilaMaestro
          key={maestro.id}
          maestro={maestro}
          confirmar={confirmar}
          quitando={quitando}
          puedeQuitar={puedeQuitar}
          onQuitar={onQuitar}
          registrarQuitar={registrarQuitar}
        />
      ))}
    </ul>
  )
}
