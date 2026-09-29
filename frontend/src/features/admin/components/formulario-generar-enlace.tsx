import { crearEnlaceRegistroSchema, VIGENCIA_ENLACE_REGISTRO } from "@campus/shared"
import { useRef, useState, type FormEvent, type RefObject } from "react"

import { ErrorDeCampo } from "@/components/error-de-campo"
import { MensajeError } from "@/components/mensaje-error"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

import { EnlaceNuevo } from "./enlace-nuevo"
import { TEXTOS_MAESTROS } from "../data"
import { useGenerarEnlace } from "../hooks"
import {
  construirUrlDeRegistro,
  erroresPorCampoAdmin,
  focoDisponiblePara,
  mensajeDeErrorAdmin,
} from "../lib"
import type { EnlaceGenerado, ErroresFormularioAdmin } from "../types"

interface FormularioGenerarEnlaceProps {
  vigenciaInputRef?: RefObject<HTMLInputElement | null>
}

// AUTH-03b, §D-B6: genera un enlace de registro de maestro, mostrado una sola vez.
export function FormularioGenerarEnlace({ vigenciaInputRef }: FormularioGenerarEnlaceProps) {
  const generar = useGenerarEnlace()
  const [errores, setErrores] = useState<ErroresFormularioAdmin>({})
  const [enlace, setEnlace] = useState<EnlaceGenerado | null>(null)
  const [enfocarEnlace, setEnfocarEnlace] = useState(false)
  // T-08 (ronda 1): el contenedor de focoDisponiblePara ya no es el <form> completo (que incluía el
  // campo de vigencia): si el admin tomaba ese campo mientras la petición seguía en vuelo,
  // "disponible" daba true de cualquier forma, porque el campo está dentro del formulario. El
  // contenedor ahora es solo el bloque del botón y del resultado, así que un foco en el campo de
  // vigencia (o en cualquier otro control fuera de este bloque) cuenta como "ya tomado".
  const accionRef = useRef<HTMLDivElement>(null)
  const propioInputRef = useRef<HTMLInputElement>(null)
  const inputRef = vigenciaInputRef ?? propioInputRef

  const handleSubmit = (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault()
    if (generar.isPending) return

    const formulario = new FormData(evento.currentTarget)
    const vigenciaDias = formulario.get("vigenciaDias")
    const resultado = crearEnlaceRegistroSchema.safeParse({
      vigenciaDias: vigenciaDias === "" || vigenciaDias === null ? undefined : Number(vigenciaDias),
    })
    if (!resultado.success) {
      setErrores(erroresPorCampoAdmin(resultado.error.issues))
      return
    }

    setErrores({})
    setEnlace(null)
    generar.mutate(resultado.data, {
      onSuccess: (respuesta) => {
        const disponible = focoDisponiblePara(
          accionRef.current,
          document.activeElement,
          document.body,
        )
        setEnlace({
          url: construirUrlDeRegistro(window.location.origin, respuesta.token),
          expiraEn: respuesta.enlace.expiraEn,
        })
        setEnfocarEnlace(disponible)
      },
    })
  }

  return (
    <form
      noValidate
      aria-label={TEXTOS_MAESTROS.enlaces.generar}
      onSubmit={handleSubmit}
      className="flex flex-col gap-4 rounded-panel border border-border bg-surface p-4"
    >
      <h2 className="text-h3">{TEXTOS_MAESTROS.enlaces.titulo}</h2>
      <p className="text-small text-muted-foreground">{TEXTOS_MAESTROS.enlaces.descripcion}</p>
      {generar.isError && <MensajeError mensaje={mensajeDeErrorAdmin(generar.error)} />}
      <div className="flex flex-col gap-2">
        <Label htmlFor="vigenciaDias">{TEXTOS_MAESTROS.enlaces.vigencia}</Label>
        <Input
          ref={inputRef}
          id="vigenciaDias"
          name="vigenciaDias"
          type="number"
          min={VIGENCIA_ENLACE_REGISTRO.minimaDias}
          max={VIGENCIA_ENLACE_REGISTRO.maximaDias}
          defaultValue={VIGENCIA_ENLACE_REGISTRO.porDefectoDias}
          autoComplete="off"
          aria-invalid={errores.vigenciaDias !== undefined}
          aria-describedby={errores.vigenciaDias ? "vigenciaDias-error" : undefined}
        />
        {errores.vigenciaDias && (
          <ErrorDeCampo id="vigenciaDias-error">{errores.vigenciaDias}</ErrorDeCampo>
        )}
      </div>
      <div ref={accionRef} className="flex flex-col gap-4">
        <Button type="submit" variant="outline" enEspera={generar.isPending}>
          {TEXTOS_MAESTROS.enlaces.generar}
        </Button>
        {enlace && (
          <EnlaceNuevo
            url={enlace.url}
            expiraEn={enlace.expiraEn}
            enfocarAlMostrar={enfocarEnlace}
          />
        )}
      </div>
    </form>
  )
}
