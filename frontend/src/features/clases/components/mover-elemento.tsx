import { useId, useRef, useState } from "react"

import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"

import { TEXTOS_TEMAS, TEXTOS_TRABAJO } from "../data"
import { useMoverElemento } from "../hooks"
import type { Tema } from "../types"

interface MoverElementoProps {
  claseId: string
  publicacionId: string
  titulo: string
  // El tema donde está hoy el elemento (null es "Sin tema").
  temaActual: string | null
  temas: readonly Tema[]
}

// §D-11: mover un elemento de tema (P-02 b: organiza la clase, no es editarlo). Se muestra solo cuando
// el servidor dice `puedeMover`. El select lleva su nombre ("Tema de «<título>»") como etiqueta solo
// para lectores de pantalla y "Mover" espera la respuesta. Elegir el mismo tema no pide nada.
export function MoverElemento({
  claseId,
  publicacionId,
  titulo,
  temaActual,
  temas,
}: MoverElementoProps) {
  const mover = useMoverElemento(claseId)
  const idSelect = useId()
  const [destino, setDestino] = useState(temaActual ?? "")
  // M-01 (revisión de la ronda 1): guarda síncrona; `mover.isPending` llega un render después.
  const moviendoRef = useRef(false)
  // Si el tema elegido se borró mientras tanto, el select vuelve a "Sin tema" en lugar de enviar un id
  // que ya no existe.
  const destinoVigente = temas.some(({ id }) => id === destino) ? destino : ""

  const handleMover = () => {
    if (moviendoRef.current) return
    const temaId = destinoVigente === "" ? null : destinoVigente
    if (temaId === temaActual) return
    const nombreDelTema = temas.find(({ id }) => id === temaId)?.nombre ?? TEXTOS_TRABAJO.sinTema
    moviendoRef.current = true
    mover.mutate(
      { publicacionId, temaId, titulo, nombreDelTema },
      {
        onSettled: () => {
          moviendoRef.current = false
        },
      },
    )
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Label htmlFor={idSelect} className="sr-only">
        {TEXTOS_TEMAS.temaDe(titulo)}
      </Label>
      <div className="w-full sm:w-64">
        <NativeSelect
          id={idSelect}
          autoComplete="off"
          value={destinoVigente}
          onChange={(evento) => setDestino(evento.target.value)}
        >
          <NativeSelectOption value="">{TEXTOS_TRABAJO.sinTema}</NativeSelectOption>
          {temas.map((tema) => (
            <NativeSelectOption key={tema.id} value={tema.id}>
              {tema.nombre}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        data-mover=""
        onClick={handleMover}
        enEspera={mover.isPending}
      >
        {TEXTOS_TEMAS.mover}
      </Button>
    </div>
  )
}
