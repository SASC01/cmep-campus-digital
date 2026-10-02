import { crearPublicacionSchema, normalizarTextoLargo } from "@campus/shared"
import { Check } from "lucide-react"
import { useId, useState, type FormEvent } from "react"

import { ErrorDeCampo } from "@/components/error-de-campo"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

import { TEXTOS_FORMULARIO_PUBLICACION } from "../data"
import { useCrearPublicacion } from "../hooks"
import { erroresDeFormularioClases, erroresPorCampo } from "../lib"
import type { ErroresFormulario, TipoPublicacion } from "../types"

interface FormularioPublicacionProps {
  claseId: string
}

// §D-C5: formulario del maestro para publicar un anuncio o un material, arriba del muro. El tipo se
// elige con un grupo de dos botones (aria-pressed); el botón principal cambia su objeto según el
// tipo. Valida con el mismo esquema que el servidor (crearPublicacionSchema) antes de enviar.
export function FormularioPublicacion({ claseId }: FormularioPublicacionProps) {
  const crear = useCrearPublicacion(claseId)
  const idBase = useId()
  const [tipo, setTipo] = useState<TipoPublicacion>("anuncio")
  const [titulo, setTitulo] = useState("")
  const [texto, setTexto] = useState("")
  const [errores, setErrores] = useState<ErroresFormulario>({})
  const esMaterial = tipo === "material"
  const idTitulo = `${idBase}-titulo`
  const idTexto = `${idBase}-texto`

  const handleSubmit = (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault()
    if (crear.isPending) return

    // T-31: se mide lo que el servidor va a medir (normalizado), sin reescribir el campo visible.
    const textoNormalizado = normalizarTextoLargo(texto)
    const candidato = esMaterial
      ? { tipo, titulo: normalizarTextoLargo(titulo), texto: textoNormalizado }
      : { tipo, texto: textoNormalizado }
    const resultado = crearPublicacionSchema.safeParse(candidato)
    if (!resultado.success) {
      setErrores(erroresPorCampo(resultado.error.issues))
      return
    }

    setErrores({})
    crear.mutate(resultado.data, {
      onSuccess: () => {
        setTitulo("")
        setTexto("")
      },
      onError: (error) => {
        // Los avisos los da el hook; aquí solo se marca el campo, si el error es de un campo.
        const erroresDeCampo = erroresDeFormularioClases(error, ["titulo", "texto"])
        if (erroresDeCampo) setErrores(erroresDeCampo)
      },
    })
  }

  return (
    <Card>
      <CardContent>
        <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div
            role="group"
            aria-label={TEXTOS_FORMULARIO_PUBLICACION.grupoTipo}
            className="flex flex-wrap gap-2"
          >
            <Button
              type="button"
              variant="outline"
              size="sm"
              aria-pressed={!esMaterial}
              onClick={() => setTipo("anuncio")}
              className="aria-pressed:bg-surface aria-pressed:text-link"
            >
              {!esMaterial && <Check aria-hidden="true" />}
              {TEXTOS_FORMULARIO_PUBLICACION.anuncio}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              aria-pressed={esMaterial}
              onClick={() => setTipo("material")}
              className="aria-pressed:bg-surface aria-pressed:text-link"
            >
              {esMaterial && <Check aria-hidden="true" />}
              {TEXTOS_FORMULARIO_PUBLICACION.material}
            </Button>
          </div>

          {esMaterial && (
            <div className="flex flex-col gap-2">
              <Label htmlFor={idTitulo}>{TEXTOS_FORMULARIO_PUBLICACION.campoTitulo}</Label>
              <Input
                id={idTitulo}
                name="titulo"
                autoComplete="off"
                value={titulo}
                onChange={(evento) => setTitulo(evento.target.value)}
                aria-invalid={errores.titulo !== undefined}
                aria-describedby={errores.titulo ? `${idTitulo}-error` : undefined}
              />
              {errores.titulo && (
                <ErrorDeCampo id={`${idTitulo}-error`}>{errores.titulo}</ErrorDeCampo>
              )}
            </div>
          )}

          <div className="flex flex-col gap-2">
            <Label htmlFor={idTexto}>
              {esMaterial
                ? TEXTOS_FORMULARIO_PUBLICACION.campoDescripcion
                : TEXTOS_FORMULARIO_PUBLICACION.campoAnuncio}
            </Label>
            <Textarea
              id={idTexto}
              name="texto"
              rows={4}
              autoComplete="off"
              value={texto}
              onChange={(evento) => setTexto(evento.target.value)}
              aria-invalid={errores.texto !== undefined}
              aria-describedby={errores.texto ? `${idTexto}-error` : undefined}
            />
            {errores.texto && <ErrorDeCampo id={`${idTexto}-error`}>{errores.texto}</ErrorDeCampo>}
          </div>

          <div>
            <Button type="submit" variant="primary" enEspera={crear.isPending}>
              {esMaterial
                ? TEXTOS_FORMULARIO_PUBLICACION.publicarMaterial
                : TEXTOS_FORMULARIO_PUBLICACION.publicarAnuncio}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
