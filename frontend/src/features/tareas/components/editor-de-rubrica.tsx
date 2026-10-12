import { Plus } from "lucide-react"
import { useEffect, useRef } from "react"

import { ErrorDeCampo } from "@/components/error-de-campo"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

import { LIMITE_CRITERIOS, TEXTOS_FORMULARIO_TAREA, TEXTOS_RUBRICA } from "../data"
import { criterioVacio, totalDeRubrica } from "../lib"
import type { CriterioDelFormulario, ErroresFormulario } from "../types"

interface EditorDeRubricaProps {
  idBase: string
  criterios: readonly CriterioDelFormulario[]
  puntosDeLaTarea: number | null
  errores: ErroresFormulario
  onCambiar: (criterios: readonly CriterioDelFormulario[]) => void
}

// §D-10, DESIGN.md §7.21: las filas de la rúbrica de una tarea. Cada fila lleva "Criterio" y "Puntos
// máximos"; "Quitar criterio" nombra su número solo para lectores de pantalla. El foco sigue §7.14: al
// quitar, pasa al "Quitar criterio" de la fila vecina (la que ocupa su lugar o, si era la última, la
// anterior) y, sin filas, a "Agregar criterio"; al agregar, a "Criterio" de la fila nueva. Nunca a
// <body>. Quitar y agregar solo cambian estado local: no esperan nada (sin enEspera).
export function EditorDeRubrica({
  idBase,
  criterios,
  puntosDeLaTarea,
  errores,
  onCambiar,
}: EditorDeRubricaProps) {
  const listaRef = useRef<HTMLDivElement>(null)
  const agregarRef = useRef<HTMLButtonElement>(null)
  // Dónde va el foco cuando la lista ya se pintó con el cambio; "agregar" es el botón y los demás son
  // el índice de la fila.
  const focoRef = useRef<{ destino: "quitar" | "criterio"; indice: number } | null>(null)
  const enElTope = criterios.length >= LIMITE_CRITERIOS

  useEffect(() => {
    const foco = focoRef.current
    if (foco === null) return
    focoRef.current = null
    const atributo = foco.destino === "quitar" ? "data-quitar-criterio" : "data-criterio"
    const control = listaRef.current?.querySelector<HTMLElement>(`[${atributo}="${foco.indice}"]`)
    if (control) {
      control.focus()
      return
    }
    agregarRef.current?.focus()
  }, [criterios])

  const handleAgregar = () => {
    if (enElTope) return
    focoRef.current = { destino: "criterio", indice: criterios.length }
    onCambiar([...criterios, criterioVacio()])
  }

  const handleQuitar = (indice: number) => {
    focoRef.current = {
      destino: "quitar",
      indice: indice < criterios.length - 1 ? indice : indice - 1,
    }
    onCambiar(criterios.filter((_, i) => i !== indice))
  }

  const handleEscribir = (indice: number, cambios: Partial<CriterioDelFormulario>) => {
    onCambiar(
      criterios.map((criterio, i) => (i === indice ? { ...criterio, ...cambios } : criterio)),
    )
  }

  return (
    <fieldset
      className="flex flex-col gap-3"
      aria-describedby={criterios.length > 0 ? `${idBase}-total` : undefined}
    >
      <legend className="text-body font-bold text-foreground">{TEXTOS_RUBRICA.titulo}</legend>

      <div ref={listaRef} className="flex flex-col gap-3">
        {criterios.map((criterio, indice) => {
          const idCriterio = `${idBase}-criterio-${criterio.llave}`
          const idPuntos = `${idBase}-puntos-${criterio.llave}`
          const errorCriterio = errores[`rubrica.${criterio.llave}.criterio`]
          const errorPuntos = errores[`rubrica.${criterio.llave}.puntosMax`]
          return (
            <div key={criterio.llave} className="flex flex-wrap items-start gap-x-3 gap-y-2">
              <div className="flex min-w-48 flex-1 flex-col gap-2">
                <Label htmlFor={idCriterio}>
                  {TEXTOS_RUBRICA.criterio} <span className="sr-only">{indice + 1}</span>
                </Label>
                <Input
                  id={idCriterio}
                  name="criterio"
                  autoComplete="off"
                  data-criterio={indice}
                  value={criterio.criterio}
                  onChange={(evento) => handleEscribir(indice, { criterio: evento.target.value })}
                  aria-invalid={errorCriterio !== undefined}
                  aria-describedby={errorCriterio ? `${idCriterio}-error` : undefined}
                />
                {errorCriterio && (
                  <ErrorDeCampo id={`${idCriterio}-error`}>{errorCriterio}</ErrorDeCampo>
                )}
              </div>
              <div className="flex w-40 flex-col gap-2">
                <Label htmlFor={idPuntos}>
                  {TEXTOS_RUBRICA.puntosMaximos} <span className="sr-only">{indice + 1}</span>
                </Label>
                <Input
                  id={idPuntos}
                  name="puntosMax"
                  type="number"
                  inputMode="numeric"
                  autoComplete="off"
                  value={criterio.puntosMax}
                  onChange={(evento) => handleEscribir(indice, { puntosMax: evento.target.value })}
                  aria-invalid={errorPuntos !== undefined}
                  aria-describedby={errorPuntos ? `${idPuntos}-error` : undefined}
                />
                {errorPuntos && <ErrorDeCampo id={`${idPuntos}-error`}>{errorPuntos}</ErrorDeCampo>}
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                data-quitar-criterio={indice}
                onClick={() => handleQuitar(indice)}
                className="self-end"
              >
                {TEXTOS_RUBRICA.quitar} <span className="sr-only">{indice + 1}</span>
              </Button>
            </div>
          )
        })}
      </div>

      {errores.rubrica && <ErrorDeCampo id={`${idBase}-error`}>{errores.rubrica}</ErrorDeCampo>}

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <Button ref={agregarRef} type="button" variant="outline" size="sm" onClick={handleAgregar}>
          <Plus aria-hidden="true" />
          {TEXTOS_RUBRICA.agregar}
        </Button>
        {enElTope && (
          <p className="text-small text-muted-foreground">
            {TEXTOS_FORMULARIO_TAREA.tope(LIMITE_CRITERIOS)}
          </p>
        )}
      </div>

      {criterios.length > 0 && (
        <p id={`${idBase}-total`} className="text-small text-muted-foreground">
          {TEXTOS_RUBRICA.total(totalDeRubrica(criterios), puntosDeLaTarea)}
        </p>
      )}
    </fieldset>
  )
}
