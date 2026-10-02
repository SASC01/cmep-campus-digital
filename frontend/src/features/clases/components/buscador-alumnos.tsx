import { LONGITUD_MAXIMA_BUSQUEDA } from "@campus/shared"
import { useEffect, useRef, useState, type ReactNode } from "react"

import { Cargando } from "@/components/cargando"
import { ErrorDeCampo } from "@/components/error-de-campo"
import { MensajeError } from "@/components/mensaje-error"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

import { ESPERA_BUSQUEDA_MS, TEXTOS_BUSCADOR_ALUMNOS } from "../data"
import { useAgregarAlumno, useCandidatos, useFilaEnFoco, useTerminoDiferido } from "../hooks"
import {
  focoPerdido,
  mensajeDeErrorClases,
  terminoDeBusquedaMuyLargo,
  terminoDeBusquedaValido,
} from "../lib"
import type { Candidato } from "../types"

const ID_CAMPO_BUSQUEDA = "campo-buscar-alumno"
const ID_AYUDA_BUSQUEDA = "ayuda-buscar-alumno"
const ID_ERROR_BUSQUEDA = "error-buscar-alumno"

interface FilaCandidatoProps {
  claseId: string
  candidato: Candidato
  // El buscador guarda el "Agregar" de cada fila para poder llevar el foco a otra cuando el de esta
  // se convierte en la insignia "Ya está en la clase" (T-25).
  registrarAgregar: (id: string, nodo: HTMLButtonElement | null) => void
}

// Cada fila tiene su propia mutación: el botón de una fila espera sin tocar el de las demás. El
// nombre accesible del botón suma, después de un espacio explícito, el nombre del alumno como texto
// sr-only (DESIGN.md §7.9): nunca aria-label ni aria-hidden.
function FilaCandidato({ claseId, candidato, registrarAgregar }: FilaCandidatoProps) {
  const agregar = useAgregarAlumno(claseId)

  // Los avisos (éxito, "ya estaba" y error) salen de los callbacks de useAgregarAlumno (§D-C5 bis):
  // la fila puede desmontarse con el POST en vuelo.
  const handleAgregar = () => {
    agregar.mutate(candidato.id)
  }

  return (
    <li
      data-candidato-id={candidato.id}
      className="flex flex-wrap items-center justify-between gap-3 border-b border-border py-3 last:border-0"
    >
      <div className="flex min-w-0 flex-col">
        <span className="wrap-anywhere font-bold">{candidato.nombre}</span>
        <span className="wrap-anywhere text-small text-muted-foreground">
          {candidato.correoEnmascarado}
        </span>
      </div>
      {candidato.yaInscrito && (
        <Badge variant="muted">{TEXTOS_BUSCADOR_ALUMNOS.yaEstaEnLaClase}</Badge>
      )}
      {!candidato.yaInscrito && (
        <Button
          ref={(nodo) => registrarAgregar(candidato.id, nodo)}
          type="button"
          variant="outline"
          size="sm"
          onClick={handleAgregar}
          enEspera={agregar.isPending}
        >
          {TEXTOS_BUSCADOR_ALUMNOS.agregar} <span className="sr-only">{candidato.nombre}</span>
        </Button>
      )}
    </li>
  )
}

interface BuscadorAlumnosProps {
  claseId: string
}

// §D-B4, DESIGN.md §7.17: mínimo de 3 letras, 300 ms de espera desde la última tecla y ayuda
// permanente. El correo se muestra enmascarado tal como llega de la API: el frontend no enmascara.
export function BuscadorAlumnos({ claseId }: BuscadorAlumnosProps) {
  const [escrito, setEscrito] = useState("")
  const termino = useTerminoDiferido(escrito, ESPERA_BUSQUEDA_MS)
  const candidatos = useCandidatos(claseId, termino)
  const muyLargo = terminoDeBusquedaMuyLargo(escrito)
  const campoRef = useRef<HTMLInputElement>(null)
  const botonesAgregar = useRef(new Map<string, HTMLButtonElement>())
  const filaEnFocoRef = useFilaEnFoco("data-candidato-id")
  const idsDeFilas = candidatos.data?.candidatos.map((candidato) => candidato.id)

  const registrarAgregar = (id: string, nodo: HTMLButtonElement | null) => {
    if (nodo === null) {
      botonesAgregar.current.delete(id)
      return
    }
    botonesAgregar.current.set(id, nodo)
  }

  // T-25, DESIGN.md §7.14: al agregar, el botón con el foco se reemplaza por la insignia "Ya está en
  // la clase", que no se enfoca. Después de cada render, si la fila que tenía el foco lo perdió, va
  // al siguiente "Agregar a la clase" de la lista (o al anterior si era el último) y, si no queda
  // ninguno, al campo de búsqueda. Nunca a <body>, y no depende del onSuccess.
  useEffect(() => {
    const id = filaEnFocoRef.current
    if (id === null || !focoPerdido(document)) return
    filaEnFocoRef.current = null
    if (idsDeFilas === undefined) {
      campoRef.current?.focus()
      return
    }
    const ids = idsDeFilas
    const indice = ids.indexOf(id)
    const despues = ids.slice(indice + 1)
    const antes = ids.slice(0, Math.max(indice, 0)).reverse()
    const destino = [...despues, ...antes]
      .map((otro) => botonesAgregar.current.get(otro))
      .find((boton) => boton !== undefined)
    if (destino === undefined) {
      campoRef.current?.focus()
      return
    }
    destino.focus()
  })

  // Estados en orden: sin término válido (solo la ayuda) → error → cargando → sin resultados →
  // resultados.
  const resultados = (): ReactNode => {
    if (!terminoDeBusquedaValido(termino)) return null
    if (candidatos.isError) return <MensajeError mensaje={mensajeDeErrorClases(candidatos.error)} />
    if (candidatos.isLoading || !candidatos.data) return <Cargando />
    const { candidatos: filas, hayMas } = candidatos.data
    if (filas.length === 0) {
      return <p className="text-small">{TEXTOS_BUSCADOR_ALUMNOS.sinResultados}</p>
    }
    return (
      <>
        <ul aria-label={TEXTOS_BUSCADOR_ALUMNOS.resultados} className="flex flex-col">
          {filas.map((candidato) => (
            <FilaCandidato
              key={candidato.id}
              claseId={claseId}
              candidato={candidato}
              registrarAgregar={registrarAgregar}
            />
          ))}
        </ul>
        {hayMas && <p className="text-small">{TEXTOS_BUSCADOR_ALUMNOS.hayMas}</p>}
      </>
    )
  }

  return (
    <Card>
      <CardHeader>
        <h2 className="text-h2">{TEXTOS_BUSCADOR_ALUMNOS.titulo}</h2>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor={ID_CAMPO_BUSQUEDA}>{TEXTOS_BUSCADOR_ALUMNOS.campo}</Label>
          <Input
            ref={campoRef}
            id={ID_CAMPO_BUSQUEDA}
            value={escrito}
            onChange={(evento) => setEscrito(evento.target.value)}
            autoComplete="off"
            spellCheck={false}
            // maxLength cuenta unidades de UTF-16, no los caracteres normalizados del servidor: es
            // solo un tope de captura. El tope real lo decide estadoDeTerminoDeBusqueda (T-24).
            maxLength={LONGITUD_MAXIMA_BUSQUEDA}
            aria-invalid={muyLargo}
            aria-describedby={
              muyLargo ? `${ID_AYUDA_BUSQUEDA} ${ID_ERROR_BUSQUEDA}` : ID_AYUDA_BUSQUEDA
            }
          />
          <p id={ID_AYUDA_BUSQUEDA} className="text-small text-muted-foreground">
            {TEXTOS_BUSCADOR_ALUMNOS.ayuda}
          </p>
          {muyLargo && (
            <ErrorDeCampo id={ID_ERROR_BUSQUEDA}>{TEXTOS_BUSCADOR_ALUMNOS.muyLargo}</ErrorDeCampo>
          )}
        </div>
        {resultados()}
      </CardContent>
    </Card>
  )
}
