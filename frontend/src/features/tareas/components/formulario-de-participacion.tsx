import { crearParticipacionSchema } from "@campus/shared"
import { useId, useRef, useState, type FormEvent } from "react"

import { ErrorDeCampo } from "@/components/error-de-campo"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

import { TEXTOS_PARTICIPACIONES } from "../data"
import { usePublicarParticipacion } from "../hooks"
import { errorDelTextoDeLaParticipacion } from "../lib"
import type { MiParticipacionRespuesta } from "../types"

interface FormularioDeParticipacionProps {
  claseId: string
  foroId: string
  mia: MiParticipacionRespuesta
  // La vista lleva el foco a la participación nueva cuando aparece en la lista.
  onPublicada: (participacionId: string) => void
}

// FORO-01d (§D-8.4): el formulario de la principal del alumno. La nota de retraso la decide el
// servidor (participarConRetraso, E1-1). El texto vacío se rechaza aquí, sin pedir nada; el error de
// «texto» del servidor se pinta bajo el campo, y el envío siguiente lo reemplaza (un solo mensaje). Lo
// escrito se conserva ante cualquier error.
export function FormularioDeParticipacion({
  claseId,
  foroId,
  mia,
  onPublicada,
}: FormularioDeParticipacionProps) {
  const publicar = usePublicarParticipacion(claseId, foroId)
  const idCampo = useId()
  const [texto, setTexto] = useState("")
  const [errorDelCampo, setErrorDelCampo] = useState<string | null>(null)
  const publicandoRef = useRef(false)

  const handleSubmit = (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault()
    if (publicandoRef.current || publicar.isPending) return
    const resultado = crearParticipacionSchema.safeParse({ texto })
    if (!resultado.success) {
      setErrorDelCampo(resultado.error.issues[0]?.message ?? TEXTOS_PARTICIPACIONES.campo)
      return
    }
    setErrorDelCampo(null)
    publicandoRef.current = true
    publicar.mutate(resultado.data, {
      onSuccess: ({ participacion }) => {
        setTexto("")
        onPublicada(participacion.id)
      },
      onError: (error) => {
        setErrorDelCampo(errorDelTextoDeLaParticipacion(error))
      },
      onSettled: () => {
        publicandoRef.current = false
      },
    })
  }

  return (
    <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-3">
      {mia.participarConRetraso && (
        <p className="text-small text-muted-foreground">{TEXTOS_PARTICIPACIONES.notaDeRetraso}</p>
      )}
      <div className="flex flex-col gap-2">
        <Label htmlFor={idCampo}>{TEXTOS_PARTICIPACIONES.campo}</Label>
        <Textarea
          id={idCampo}
          name="texto"
          rows={4}
          autoComplete="off"
          value={texto}
          onChange={(evento) => setTexto(evento.target.value)}
          aria-invalid={errorDelCampo !== null}
          aria-describedby={errorDelCampo === null ? undefined : `${idCampo}-error`}
        />
        {errorDelCampo !== null && (
          <ErrorDeCampo id={`${idCampo}-error`}>{errorDelCampo}</ErrorDeCampo>
        )}
      </div>
      <Button type="submit" variant="primary" enEspera={publicar.isPending} className="self-start">
        {TEXTOS_PARTICIPACIONES.publicar}
      </Button>
    </form>
  )
}
