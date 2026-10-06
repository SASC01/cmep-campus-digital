import { LONGITUD_MAXIMA_BUSQUEDA } from "@campus/shared"
import { useEffect, useRef, useState, type ReactNode, type RefObject } from "react"

import { Cargando } from "@/components/cargando"
import { ErrorDeCampo } from "@/components/error-de-campo"
import { MensajeError } from "@/components/mensaje-error"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

import { ESPERA_BUSQUEDA_MS, TEXTOS_BUSCADOR_MAESTROS } from "../data"
import {
  useAsignarMaestro,
  useCandidatosMaestro,
  useFilaEnFoco,
  useTerminoDiferido,
} from "../hooks"
import {
  focoPerdido,
  mensajeDeErrorClases,
  terminoDeBusquedaMuyLargo,
  terminoDeBusquedaValido,
} from "../lib"
import type { CandidatoMaestro } from "../types"

const ID_CAMPO_BUSQUEDA = "campo-buscar-maestro"
const ID_AYUDA_BUSQUEDA = "ayuda-buscar-maestro"
const ID_ERROR_BUSQUEDA = "error-buscar-maestro"

interface FilaCandidatoProps {
  candidato: CandidatoMaestro
  yaEsta: boolean
  // El buscador guarda el botón de cada fila para llevar el foco a otro cuando el de esta se
  // convierte en una insignia (DESIGN.md §7.14).
  registrarBoton: (id: string, nodo: HTMLButtonElement | null) => void
}

interface FilaParaElegirProps extends FilaCandidatoProps {
  onElegir: (maestro: CandidatoMaestro) => void
}

interface FilaParaAsignarProps extends FilaCandidatoProps {
  claseId: string
}

interface DatosDelCandidatoProps {
  candidato: CandidatoMaestro
}

// El correo se muestra completo: solo el administrador usa este buscador (S-06).
function DatosDelCandidato({ candidato }: DatosDelCandidatoProps) {
  return (
    <div className="flex min-w-0 flex-col">
      <span className="wrap-anywhere font-bold">{candidato.nombre}</span>
      <span className="wrap-anywhere text-small text-muted-foreground">{candidato.email}</span>
    </div>
  )
}

const CLASES_DE_LA_FILA =
  "flex flex-wrap items-center justify-between gap-3 border-b border-border py-3 last:border-0"

// "Elegir" (crear clase): solo cambia el estado del formulario, no pide nada y no espera.
function FilaParaElegir({ candidato, yaEsta, registrarBoton, onElegir }: FilaParaElegirProps) {
  return (
    <li data-candidato-id={candidato.id} className={CLASES_DE_LA_FILA}>
      <DatosDelCandidato candidato={candidato} />
      {yaEsta && <Badge variant="muted">{TEXTOS_BUSCADOR_MAESTROS.yaElegido}</Badge>}
      {!yaEsta && (
        <Button
          ref={(nodo) => registrarBoton(candidato.id, nodo)}
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onElegir(candidato)}
        >
          {TEXTOS_BUSCADOR_MAESTROS.elegir} <span className="sr-only">{candidato.nombre}</span>
        </Button>
      )}
    </li>
  )
}

// "Asignar a la clase": cada fila tiene su propia mutación, así que el botón de una fila espera sin
// tocar el de las demás. Los avisos salen de useAsignarMaestro (§D-C5 bis).
function FilaParaAsignar({ candidato, yaEsta, registrarBoton, claseId }: FilaParaAsignarProps) {
  const asignar = useAsignarMaestro(claseId)

  return (
    <li data-candidato-id={candidato.id} className={CLASES_DE_LA_FILA}>
      <DatosDelCandidato candidato={candidato} />
      {yaEsta && <Badge variant="muted">{TEXTOS_BUSCADOR_MAESTROS.yaDaLaClase}</Badge>}
      {!yaEsta && (
        <Button
          ref={(nodo) => registrarBoton(candidato.id, nodo)}
          type="button"
          variant="outline"
          size="sm"
          onClick={() => asignar.mutate({ id: candidato.id, nombre: candidato.nombre })}
          enEspera={asignar.isPending}
        >
          {TEXTOS_BUSCADOR_MAESTROS.asignar} <span className="sr-only">{candidato.nombre}</span>
        </Button>
      )}
    </li>
  )
}

interface BuscadorDeMaestrosProps {
  // Los maestros que ya están elegidos (crear clase) o ya dan la clase (asignar).
  yaElegidos: readonly string[]
  // Con claseId, el botón de cada fila asigna a la clase; sin él, elige para el formulario.
  claseId?: string
  onElegir?: (maestro: CandidatoMaestro) => void
  // El campo de búsqueda, para que quien lo usa pueda llevarle el foco.
  campoRef?: RefObject<HTMLInputElement | null>
}

// §D-2C2, DESIGN.md §7.17: un solo buscador de maestros con dos usos (elegir al crear una clase y
// asignar en la clase), por props; no se generaliza BuscadorAlumnos. Mínimo de 3 letras, 300 ms
// desde la última tecla y ayuda permanente. Muestra el correo completo (solo lo ve el admin).
export function BuscadorDeMaestros({
  yaElegidos,
  claseId,
  onElegir,
  campoRef,
}: BuscadorDeMaestrosProps) {
  const [escrito, setEscrito] = useState("")
  const termino = useTerminoDiferido(escrito, ESPERA_BUSQUEDA_MS)
  const candidatos = useCandidatosMaestro(termino)
  const muyLargo = terminoDeBusquedaMuyLargo(escrito)
  const campoPropio = useRef<HTMLInputElement>(null)
  const campo = campoRef ?? campoPropio
  const botones = useRef(new Map<string, HTMLButtonElement>())
  const filaEnFocoRef = useFilaEnFoco("data-candidato-id")
  const idsDeFilas = candidatos.data?.candidatos.map((candidato) => candidato.id)

  const registrarBoton = (id: string, nodo: HTMLButtonElement | null) => {
    if (nodo === null) {
      botones.current.delete(id)
      return
    }
    botones.current.set(id, nodo)
  }

  // DESIGN.md §7.14: al elegir o asignar, el botón con el foco se reemplaza por una insignia que no
  // se enfoca. Después de cada render, si la fila que tenía el foco lo perdió, va al siguiente botón
  // de la lista (o al anterior si era el último) y, si no queda ninguno, al campo de búsqueda.
  useEffect(() => {
    const id = filaEnFocoRef.current
    if (id === null || !focoPerdido(document)) return
    filaEnFocoRef.current = null
    if (idsDeFilas === undefined) {
      campo.current?.focus()
      return
    }
    const indice = idsDeFilas.indexOf(id)
    const despues = idsDeFilas.slice(indice + 1)
    const antes = idsDeFilas.slice(0, Math.max(indice, 0)).reverse()
    const destino = [...despues, ...antes]
      .map((otro) => botones.current.get(otro))
      .find((boton) => boton !== undefined)
    if (destino === undefined) {
      campo.current?.focus()
      return
    }
    destino.focus()
  })

  const fila = (candidato: CandidatoMaestro): ReactNode => {
    const yaEsta = yaElegidos.includes(candidato.id)
    if (claseId !== undefined) {
      return (
        <FilaParaAsignar
          key={candidato.id}
          candidato={candidato}
          yaEsta={yaEsta}
          registrarBoton={registrarBoton}
          claseId={claseId}
        />
      )
    }
    return (
      <FilaParaElegir
        key={candidato.id}
        candidato={candidato}
        yaEsta={yaEsta}
        registrarBoton={registrarBoton}
        onElegir={(maestro) => onElegir?.(maestro)}
      />
    )
  }

  // Estados en orden: sin término válido (solo la ayuda) → error → cargando → sin resultados →
  // resultados.
  const resultados = (): ReactNode => {
    if (!terminoDeBusquedaValido(termino)) return null
    if (candidatos.isError) return <MensajeError mensaje={mensajeDeErrorClases(candidatos.error)} />
    if (candidatos.isLoading || !candidatos.data) return <Cargando />
    const { candidatos: filas, hayMas } = candidatos.data
    if (filas.length === 0) {
      return <p className="text-small">{TEXTOS_BUSCADOR_MAESTROS.sinResultados}</p>
    }
    return (
      <>
        <ul aria-label={TEXTOS_BUSCADOR_MAESTROS.resultados} className="flex flex-col">
          {filas.map(fila)}
        </ul>
        {hayMas && <p className="text-small">{TEXTOS_BUSCADOR_MAESTROS.hayMas}</p>}
      </>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor={ID_CAMPO_BUSQUEDA}>{TEXTOS_BUSCADOR_MAESTROS.campo}</Label>
        <Input
          ref={campo}
          id={ID_CAMPO_BUSQUEDA}
          value={escrito}
          onChange={(evento) => setEscrito(evento.target.value)}
          // Datos de otra persona: el administrador busca a un maestro, no escribe los suyos.
          autoComplete="off"
          spellCheck={false}
          maxLength={LONGITUD_MAXIMA_BUSQUEDA}
          aria-invalid={muyLargo}
          aria-describedby={
            muyLargo ? `${ID_AYUDA_BUSQUEDA} ${ID_ERROR_BUSQUEDA}` : ID_AYUDA_BUSQUEDA
          }
        />
        <p id={ID_AYUDA_BUSQUEDA} className="text-small text-muted-foreground">
          {TEXTOS_BUSCADOR_MAESTROS.ayuda}
        </p>
        {muyLargo && (
          <ErrorDeCampo id={ID_ERROR_BUSQUEDA}>{TEXTOS_BUSCADOR_MAESTROS.muyLargo}</ErrorDeCampo>
        )}
      </div>
      {resultados()}
    </div>
  )
}
