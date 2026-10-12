import { enlaceDeEntregaSchema, MAXIMO_ENLACES_POR_ENTREGA } from "@campus/shared"
import { Link } from "lucide-react"
import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react"

import { ErrorDeCampo } from "@/components/error-de-campo"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

import { TEXTOS_TU_TRABAJO } from "../data"

interface CampoDeEnlacesProps {
  enlaces: readonly string[]
  onCambiar: (enlaces: string[]) => void
  // Mientras se entrega, la lista no cambia (§D-9.3): agregar y quitar no actúan.
  fija: boolean
  // Un VALIDACION de `enlaces.N` del servidor (§D-9.3, "Errores").
  errorDelServidor: string | null
  // Ronda 2 (T-04): el error del servidor describe la lista que se envió; en cuanto el campo cambia (se
  // escribe, se intenta agregar o se quita un enlace) ya no la describe y se descarta.
  onDescartarErrorDelServidor: () => void
}

// ENTREGAS-01d (§D-9.3): el campo "Enlace", "Agregar enlace" y la lista de enlaces agregados. Agregar
// valida con el mismo esquema que el servidor (enlaceDeEntregaSchema, S-08) y guarda el enlace
// normalizado; un enlace inválido se dice bajo el campo y no se agrega. Con 5 enlaces, "Agregar enlace"
// no hace nada y una nota lo dice (sin `disabled`, como el tope de criterios). "Quitar" lleva el foco al
// "Quitar" vecino y, sin filas, al campo (DESIGN.md §7.14).
export function CampoDeEnlaces({
  enlaces,
  onCambiar,
  fija,
  errorDelServidor,
  onDescartarErrorDelServidor,
}: CampoDeEnlacesProps) {
  const idBase = useId()
  const idCampo = `${idBase}-enlace`
  const idAyuda = `${idBase}-ayuda`
  const idError = `${idBase}-error`
  const idTope = `${idBase}-tope`
  const [valor, setValor] = useState("")
  const [error, setError] = useState<string | null>(null)
  const campoRef = useRef<HTMLInputElement>(null)
  const listaRef = useRef<HTMLUListElement>(null)
  const focoTrasQuitarRef = useRef<number | null>(null)
  const enElTope = enlaces.length >= MAXIMO_ENLACES_POR_ENTREGA

  useEffect(() => {
    const posicion = focoTrasQuitarRef.current
    if (posicion === null) return
    focoTrasQuitarRef.current = null
    const botones = listaRef.current?.querySelectorAll<HTMLElement>("[data-quitar-enlace]")
    const total = botones?.length ?? 0
    const vecino = botones?.item(Math.min(posicion, total - 1))
    if (vecino) {
      vecino.focus()
      return
    }
    campoRef.current?.focus()
  }, [enlaces])

  const agregar = () => {
    if (fija || enElTope) return
    onDescartarErrorDelServidor()
    const resultado = enlaceDeEntregaSchema.safeParse(valor)
    if (!resultado.success) {
      setError(resultado.error.issues[0]?.message ?? TEXTOS_TU_TRABAJO.ayudaEnlaces)
      return
    }
    setError(null)
    onCambiar([...enlaces, resultado.data])
    setValor("")
  }

  // Enter en el campo agrega el enlace; no envía la entrega.
  const handleTecla = (evento: KeyboardEvent<HTMLInputElement>) => {
    if (evento.key !== "Enter") return
    evento.preventDefault()
    agregar()
  }

  const quitar = (indice: number) => {
    if (fija) return
    onCambiar(enlaces.filter((_, i) => i !== indice))
    focoTrasQuitarRef.current = indice
  }

  const idErrorDelServidor = `${idError}-servidor`
  // Ronda 2 (T-04): un solo mensaje por campo. Si el error local dice lo mismo que el del servidor,
  // el del servidor no se repite.
  const errorDelServidorVisible = errorDelServidor === error ? null : errorDelServidor
  // Ronda 1 (T-03): el error de enlaces que devuelve el servidor también describe el campo y lo marca
  // inválido, como el error local: sin aviso, es la única forma de que llegue a un lector de pantalla.
  const describe = [
    idAyuda,
    enElTope ? idTope : null,
    error === null ? null : idError,
    errorDelServidorVisible === null ? null : idErrorDelServidor,
  ]
    .filter((id) => id !== null)
    .join(" ")

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={idCampo}>{TEXTOS_TU_TRABAJO.campoEnlace}</Label>
      <div className="flex flex-wrap items-center gap-2">
        <Input
          ref={campoRef}
          id={idCampo}
          type="url"
          inputMode="url"
          autoComplete="off"
          className="min-w-0 flex-1"
          value={valor}
          onChange={(evento) => {
            setValor(evento.target.value)
            onDescartarErrorDelServidor()
          }}
          onKeyDown={handleTecla}
          aria-invalid={error !== null || errorDelServidor !== null}
          aria-describedby={describe}
        />
        <Button type="button" variant="outline" size="sm" onClick={agregar}>
          <Link aria-hidden="true" />
          {TEXTOS_TU_TRABAJO.agregarEnlace}
        </Button>
      </div>
      <p id={idAyuda} className="text-small text-muted-foreground">
        {TEXTOS_TU_TRABAJO.ayudaEnlaces}
      </p>
      {enElTope && (
        <p id={idTope} className="text-small text-muted-foreground">
          {TEXTOS_TU_TRABAJO.topeDeEnlaces}
        </p>
      )}
      {error !== null && <ErrorDeCampo id={idError}>{error}</ErrorDeCampo>}
      {errorDelServidorVisible !== null && (
        <ErrorDeCampo id={idErrorDelServidor}>{errorDelServidorVisible}</ErrorDeCampo>
      )}
      {enlaces.length > 0 && (
        <ul
          ref={listaRef}
          aria-label={TEXTOS_TU_TRABAJO.enlacesAgregados}
          className="flex flex-col gap-2"
        >
          {enlaces.map((enlace, indice) => (
            <li
              key={`${indice}-${enlace}`}
              className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-row bg-muted px-3 py-2"
            >
              <span className="min-w-0 flex-1 wrap-anywhere text-small text-foreground">
                {enlace}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                data-quitar-enlace={indice}
                onClick={() => quitar(indice)}
              >
                {TEXTOS_TU_TRABAJO.quitar} <span className="sr-only">{enlace}</span>
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
