import { crearDudaSchema, normalizarTextoLargo } from "@campus/shared"
import { useId, useRef, useState, type FormEvent } from "react"

import { ErrorDeCampo } from "@/components/error-de-campo"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

import { TEXTOS_DUDAS } from "../data"
import { useCrearDuda } from "../hooks"
import { erroresDeLaDudaDeApi, erroresPorCampo } from "../lib"
import type { ErroresFormulario } from "../types"

interface FormularioDudaProps {
  claseId: string
}

// CLASES-03e (§D-9.1, DESIGN.md §7.31): "Publicar duda" (primary, la única acción principal de la vista),
// para el estudiante y el maestro. Valida con el mismo esquema que el servidor (crearDudaSchema): un texto
// vacío o sin caracteres visibles muestra su ErrorDeCampo y no llama a la API. El error del servidor vive
// en `errores`: la validación local lo reemplaza y se limpia antes de enviar (CLAUDE.md › Formularios).
// Los avisos los da el gancho; aquí solo se marca el campo.
export function FormularioDuda({ claseId }: FormularioDudaProps) {
  const crear = useCrearDuda(claseId)
  const idCampo = useId()
  const idError = `${idCampo}-error`
  const [texto, setTexto] = useState("")
  const [errores, setErrores] = useState<ErroresFormulario>({})
  // §D-12: guarda síncrona; `crear.isPending` llega un render después y dos clics seguidos mandarían
  // dos dudas. Se marca justo antes de `mutate` y se libera al asentarse.
  const enviandoRef = useRef(false)

  const handleSubmit = (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault()
    if (enviandoRef.current) return

    const resultado = crearDudaSchema.safeParse({ texto: normalizarTextoLargo(texto) })
    if (!resultado.success) {
      setErrores(erroresPorCampo(resultado.error.issues))
      return
    }

    setErrores({})
    enviandoRef.current = true
    crear.mutate(resultado.data, {
      onSuccess: () => {
        setTexto("")
      },
      onError: (error) => {
        const erroresDeCampo = erroresDeLaDudaDeApi(error)
        if (erroresDeCampo) setErrores(erroresDeCampo)
      },
      onSettled: () => {
        enviandoRef.current = false
      },
    })
  }

  return (
    <Card>
      <CardContent>
        <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-2">
          <Label htmlFor={idCampo}>{TEXTOS_DUDAS.campo}</Label>
          <Textarea
            id={idCampo}
            name="texto"
            rows={3}
            autoComplete="off"
            value={texto}
            onChange={(evento) => setTexto(evento.target.value)}
            aria-invalid={errores.texto !== undefined}
            aria-describedby={errores.texto ? idError : undefined}
          />
          {errores.texto && <ErrorDeCampo id={idError}>{errores.texto}</ErrorDeCampo>}
          <div>
            <Button type="submit" variant="primary" enEspera={crear.isPending}>
              {TEXTOS_DUDAS.publicar}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
