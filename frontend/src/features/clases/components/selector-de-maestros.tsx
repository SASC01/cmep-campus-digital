import { MAXIMO_MAESTROS_POR_CLASE } from "@campus/shared"
import { useEffect, useId, useRef } from "react"

import { ErrorDeCampo } from "@/components/error-de-campo"

import { TEXTOS_BUSCADOR_MAESTROS } from "../data"
import { focoPerdido } from "../lib"
import type { CandidatoMaestro, MaestroDeLista } from "../types"
import { BuscadorDeMaestros } from "./buscador-de-maestros"
import { ListaMaestrosDeClase } from "./lista-maestros-de-clase"

interface SelectorDeMaestrosProps {
  elegidos: readonly MaestroDeLista[]
  onElegir: (maestro: CandidatoMaestro) => void
  onQuitar: (maestro: MaestroDeLista) => void
  error?: string | undefined
}

// §D-2C2: "Maestros de la clase" al crear una clase. Elige uno o dos maestros con el buscador
// (modo local: solo cambia el estado del formulario) y los muestra en una lista con "Quitar". Con
// dos elegidos, el buscador se oculta y una nota dice por qué. El foco (§7.14) nunca queda en
// <body>: al elegir al segundo va a su primer "Quitar", y al quitar al último vuelve al buscador.
export function SelectorDeMaestros({
  elegidos,
  onElegir,
  onQuitar,
  error,
}: SelectorDeMaestrosProps) {
  const idError = useId()
  const campoRef = useRef<HTMLInputElement>(null)
  const listaRef = useRef<HTMLDivElement>(null)
  const cantidadPrevia = useRef(elegidos.length)
  const topeAlcanzado = elegidos.length >= MAXIMO_MAESTROS_POR_CLASE

  useEffect(() => {
    const previa = cantidadPrevia.current
    cantidadPrevia.current = elegidos.length
    if (previa === elegidos.length || !focoPerdido(document)) return
    if (elegidos.length === 0) {
      campoRef.current?.focus()
      return
    }
    if (topeAlcanzado) listaRef.current?.querySelector("button")?.focus()
  })

  return (
    <fieldset
      aria-describedby={error ? idError : undefined}
      className="flex min-w-0 flex-col gap-3"
    >
      <legend className="text-small font-bold">{TEXTOS_BUSCADOR_MAESTROS.grupo}</legend>
      <p className="text-small text-muted-foreground">{TEXTOS_BUSCADOR_MAESTROS.ayudaEleccion}</p>
      {elegidos.length > 0 && (
        <div ref={listaRef}>
          <ListaMaestrosDeClase
            etiqueta={TEXTOS_BUSCADOR_MAESTROS.elegidos}
            maestros={elegidos}
            confirmar={false}
            quitando={false}
            puedeQuitar
            onQuitar={onQuitar}
            alQuedarseSinDestino={() => campoRef.current?.focus()}
          />
        </div>
      )}
      {topeAlcanzado && <p className="text-small">{TEXTOS_BUSCADOR_MAESTROS.topeAlElegir}</p>}
      {!topeAlcanzado && (
        <BuscadorDeMaestros
          yaElegidos={elegidos.map((maestro) => maestro.id)}
          onElegir={onElegir}
          campoRef={campoRef}
        />
      )}
      {error && <ErrorDeCampo id={idError}>{error}</ErrorDeCampo>}
    </fieldset>
  )
}
