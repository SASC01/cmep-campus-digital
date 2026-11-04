import { crearRespuestaSchema, normalizarTextoLargo } from "@campus/shared"
import { useEffect, useId, useRef, useState, type FormEvent } from "react"

import { ErrorDeCampo } from "@/components/error-de-campo"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

import { TEXTOS_RESPUESTAS } from "../data"
import { useResponder } from "../hooks"
import { erroresDeLaRespuestaDeApi, erroresPorCampo } from "../lib"
import type { ErroresFormulario } from "../types"

interface FormularioRespuestaProps {
  claseId: string
  dudaId: string
  // Al desplegar con "Responder" (una duda sin respuestas), el foco va al campo al montarse.
  enfocarAlMontar: boolean
}

// CLASES-03e (§D-9.3): responder una duda, el patrón de FormularioComentario. Valida con el mismo esquema
// que el servidor (crearRespuestaSchema); el error del servidor vive en `errores` y la validación local lo
// reemplaza (CLAUDE.md › Formularios). El id del campo sale de useId: hay un formulario por duda abierta.
export function FormularioRespuesta({
  claseId,
  dudaId,
  enfocarAlMontar,
}: FormularioRespuestaProps) {
  const responder = useResponder(claseId, dudaId)
  const idCampo = useId()
  const idError = `${idCampo}-error`
  const [texto, setTexto] = useState("")
  const [errores, setErrores] = useState<ErroresFormulario>({})
  const campoRef = useRef<HTMLTextAreaElement>(null)
  // §D-12: guarda síncrona contra el doble clic; se libera al asentarse.
  const enviandoRef = useRef(false)

  useEffect(() => {
    if (!enfocarAlMontar) return
    campoRef.current?.focus()
  }, [enfocarAlMontar])

  const handleSubmit = (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault()
    if (enviandoRef.current) return

    const resultado = crearRespuestaSchema.safeParse({ texto: normalizarTextoLargo(texto) })
    if (!resultado.success) {
      setErrores(erroresPorCampo(resultado.error.issues))
      return
    }

    setErrores({})
    enviandoRef.current = true
    responder.mutate(resultado.data, {
      onSuccess: () => {
        setTexto("")
      },
      onError: (error) => {
        // Los avisos los da el gancho; aquí solo se marca el campo, si el error es de un campo.
        const erroresDeCampo = erroresDeLaRespuestaDeApi(error)
        if (erroresDeCampo) setErrores(erroresDeCampo)
      },
      onSettled: () => {
        enviandoRef.current = false
      },
    })
  }

  return (
    <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-2">
      <Label htmlFor={idCampo}>{TEXTOS_RESPUESTAS.campo}</Label>
      <Textarea
        ref={campoRef}
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
        <Button type="submit" variant="outline" enEspera={responder.isPending}>
          {TEXTOS_RESPUESTAS.responder}
        </Button>
      </div>
    </form>
  )
}
