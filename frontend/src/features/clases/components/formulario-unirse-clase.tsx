import { unirseSchema } from "@campus/shared"
import { useState, type FormEvent } from "react"
import { useNavigate } from "react-router"
import { toast } from "sonner"

import { ErrorDeCampo } from "@/components/error-de-campo"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

import { TEXTOS_UNIRSE } from "../data"
import { useUnirseAClase } from "../hooks"
import { erroresDeFormularioClases, erroresPorCampo, mensajeDeErrorClases } from "../lib"
import type { ErroresFormulario } from "../types"

// Id fijo: el vacío de PanelMisClases le lleva el foco (PR-A18g), sin contexto compartido.
export const ID_CAMPO_CODIGO_CLASE = "campo-codigo-clase"

export function FormularioUnirseClase() {
  const unirse = useUnirseAClase()
  const navigate = useNavigate()
  const [errores, setErrores] = useState<ErroresFormulario>({})

  const handleSubmit = (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault()
    if (unirse.isPending) return

    const formulario = new FormData(evento.currentTarget)
    const resultado = unirseSchema.safeParse({ codigo: formulario.get("codigo") })
    if (!resultado.success) {
      setErrores(erroresPorCampo(resultado.error.issues))
      return
    }

    setErrores({})
    unirse.mutate(resultado.data, {
      onSuccess: async (respuesta) => {
        toast.success(
          respuesta.yaEstabas
            ? TEXTOS_UNIRSE.yaEstaba(respuesta.clase.nombre)
            : TEXTOS_UNIRSE.exitoso(respuesta.clase.nombre),
        )
        await navigate(`/estudiante/clases/${respuesta.clase.id}`)
      },
      onError: (error) => {
        // T-17 (ronda 2 del tester): sin el prefijo técnico "codigo:" en el mensaje. T-19 (ronda 3
        // del tester): CODIGO_INVALIDO no es un VALIDACION con ese prefijo, pero sigue siendo un
        // error de este campo (el único que tiene este formulario), a diferencia de
        // FormularioClase.
        setErrores(
          erroresDeFormularioClases(error, ["codigo"]) ?? { codigo: mensajeDeErrorClases(error) },
        )
      },
    })
  }

  return (
    <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-3">
      <div className="flex flex-col gap-2">
        <Label htmlFor={ID_CAMPO_CODIGO_CLASE}>{TEXTOS_UNIRSE.campoCodigo}</Label>
        <Input
          id={ID_CAMPO_CODIGO_CLASE}
          name="codigo"
          autoComplete="off"
          spellCheck={false}
          className="font-mono uppercase"
          aria-invalid={errores.codigo !== undefined}
          aria-describedby={errores.codigo ? "codigo-clase-error" : undefined}
        />
        {errores.codigo && <ErrorDeCampo id="codigo-clase-error">{errores.codigo}</ErrorDeCampo>}
      </div>
      <Button type="submit" variant="primary" enEspera={unirse.isPending}>
        {TEXTOS_UNIRSE.boton}
      </Button>
    </form>
  )
}
