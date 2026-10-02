import { crearComentarioSchema, normalizarTextoLargo } from "@campus/shared"
import { useId, useState, type FormEvent } from "react"

import { ErrorDeCampo } from "@/components/error-de-campo"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

import { TEXTOS_COMENTARIOS } from "../data"
import { useComentar } from "../hooks"
import { erroresDeFormularioClases, erroresPorCampo } from "../lib"
import type { ErroresFormulario } from "../types"

interface FormularioComentarioProps {
  claseId: string
  publicacionId: string
}

// §D-C5: un comentario de una publicación. Valida con el mismo esquema que el servidor
// (crearComentarioSchema): un texto vacío o sin caracteres visibles muestra su ErrorDeCampo y no
// llama a la API. El id del campo sale de useId: hay un formulario por cada publicación abierta.
export function FormularioComentario({ claseId, publicacionId }: FormularioComentarioProps) {
  const comentar = useComentar(claseId, publicacionId)
  const idCampo = useId()
  const idError = `${idCampo}-error`
  const [texto, setTexto] = useState("")
  const [errores, setErrores] = useState<ErroresFormulario>({})

  const handleSubmit = (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault()
    if (comentar.isPending) return

    const resultado = crearComentarioSchema.safeParse({ texto: normalizarTextoLargo(texto) })
    if (!resultado.success) {
      setErrores(erroresPorCampo(resultado.error.issues))
      return
    }

    setErrores({})
    comentar.mutate(resultado.data, {
      onSuccess: () => {
        setTexto("")
      },
      onError: (error) => {
        // Los avisos los da el hook; aquí solo se marca el campo, si el error es de un campo.
        const erroresDeCampo = erroresDeFormularioClases(error, ["texto"])
        if (erroresDeCampo) setErrores(erroresDeCampo)
      },
    })
  }

  return (
    <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-2">
      <Label htmlFor={idCampo}>{TEXTOS_COMENTARIOS.campo}</Label>
      <Textarea
        id={idCampo}
        name="texto"
        rows={2}
        autoComplete="off"
        value={texto}
        onChange={(evento) => setTexto(evento.target.value)}
        aria-invalid={errores.texto !== undefined}
        aria-describedby={errores.texto ? idError : undefined}
      />
      {errores.texto && <ErrorDeCampo id={idError}>{errores.texto}</ErrorDeCampo>}
      <div>
        <Button type="submit" variant="outline" enEspera={comentar.isPending}>
          {TEXTOS_COMENTARIOS.comentar}
        </Button>
      </div>
    </form>
  )
}
