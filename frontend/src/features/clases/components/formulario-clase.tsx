import { crearClaseSchema } from "@campus/shared"
import { useState, type FormEvent } from "react"
import { Link, useNavigate } from "react-router"
import { toast } from "sonner"

import { ErrorDeCampo } from "@/components/error-de-campo"
import { Button } from "@/components/ui/button"
import { buttonVariants } from "@/components/ui/button-variants"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"

import { TEXTOS_FORMULARIO_CLASE } from "../data"
import { useCrearClase, useEditarClase } from "../hooks"
import { erroresDeFormularioClases, erroresPorCampo, mensajeDeErrorClases } from "../lib"
import type { ErroresFormulario } from "../types"

interface FormularioClaseProps {
  modo: "crear" | "editar"
  claseId?: string
  valoresIniciales?: { nombre: string; descripcion: string | null }
}

// Un solo formulario para crear y editar (§D-A5): la validación en cliente usa crearClaseSchema
// (misma forma que editarClaseSchema). autoComplete="off": el maestro no captura sus propios datos.
export function FormularioClase({ modo, claseId, valoresIniciales }: FormularioClaseProps) {
  const crear = useCrearClase()
  const editar = useEditarClase(claseId ?? "")
  const mutacion = modo === "crear" ? crear : editar
  const navigate = useNavigate()
  const [errores, setErrores] = useState<ErroresFormulario>({})

  const handleSubmit = (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault()
    if (mutacion.isPending) return

    const formulario = new FormData(evento.currentTarget)
    const resultado = crearClaseSchema.safeParse({
      nombre: formulario.get("nombre"),
      descripcion: formulario.get("descripcion"),
    })
    if (!resultado.success) {
      setErrores(erroresPorCampo(resultado.error.issues))
      return
    }

    setErrores({})
    mutacion.mutate(resultado.data, {
      onSuccess: async (respuesta) => {
        toast.success(
          modo === "crear"
            ? TEXTOS_FORMULARIO_CLASE.avisoCreada
            : TEXTOS_FORMULARIO_CLASE.avisoGuardada,
        )
        await navigate(`/maestro/clases/${respuesta.clase.id}`)
      },
      onError: (error) => {
        // T-17 (ronda 2 del tester): el error del servidor se asocia al campo que nombra, no
        // siempre a "nombre". T-19 (ronda 3 del tester): un error que no es de un campo (500, sin
        // conexión, SIN_ACCESO_A_LA_CLASE al editar) no marca ningún campo como inválido; se avisa
        // como error del formulario.
        const erroresDeCampo = erroresDeFormularioClases(error, ["nombre", "descripcion"])
        if (erroresDeCampo) {
          setErrores(erroresDeCampo)
          return
        }
        toast.error(mensajeDeErrorClases(error))
      },
    })
  }

  return (
    <Card>
      <CardHeader>
        <h1 className="text-h1">
          {modo === "crear"
            ? TEXTOS_FORMULARIO_CLASE.tituloCrear
            : TEXTOS_FORMULARIO_CLASE.tituloEditar}
        </h1>
      </CardHeader>
      <CardContent>
        <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <Label htmlFor="nombre">{TEXTOS_FORMULARIO_CLASE.campoNombre}</Label>
            <Input
              id="nombre"
              name="nombre"
              autoComplete="off"
              defaultValue={valoresIniciales?.nombre}
              aria-invalid={errores.nombre !== undefined}
              aria-describedby={errores.nombre ? "nombre-clase-error" : undefined}
            />
            {errores.nombre && (
              <ErrorDeCampo id="nombre-clase-error">{errores.nombre}</ErrorDeCampo>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="descripcion">{TEXTOS_FORMULARIO_CLASE.campoDescripcion}</Label>
            <Textarea
              id="descripcion"
              name="descripcion"
              rows={4}
              autoComplete="off"
              defaultValue={valoresIniciales?.descripcion ?? ""}
              aria-invalid={errores.descripcion !== undefined}
              aria-describedby={errores.descripcion ? "descripcion-clase-error" : undefined}
            />
            {errores.descripcion && (
              <ErrorDeCampo id="descripcion-clase-error">{errores.descripcion}</ErrorDeCampo>
            )}
          </div>
          <div className="flex gap-3">
            <Button type="submit" variant="primary" enEspera={mutacion.isPending}>
              {modo === "crear"
                ? TEXTOS_FORMULARIO_CLASE.botonCrear
                : TEXTOS_FORMULARIO_CLASE.botonGuardar}
            </Button>
            <Link
              to={modo === "crear" ? "/maestro" : `/maestro/clases/${claseId}`}
              className={buttonVariants({ variant: "outline" })}
            >
              {TEXTOS_FORMULARIO_CLASE.cancelar}
            </Link>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
