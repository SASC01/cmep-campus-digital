import { registroMaestroSchema } from "@campus/shared"
import { useState, type FormEvent } from "react"

import { ErrorDeCampo } from "@/components/error-de-campo"
import { MensajeError } from "@/components/mensaje-error"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { esApiError } from "@/services/apiClient"

import { CampoContrasena } from "./campo-contrasena"
import { TEXTOS_CAMPO_CONTRASENA, TEXTOS_REGISTRO_MAESTRO } from "../data"
import { useRegistroMaestro } from "../hooks"
import { erroresPorCampo, mensajeDeErrorAuth } from "../lib"
import type { ErroresFormulario } from "../types"

interface FormularioRegistroMaestroProps {
  token: string
}

// AUTH-03b, §D-B5/§D-B6: registro público de maestro con un enlace de registro vivo. Si el
// servidor rechaza el token (ENLACE_INVALIDO), el mismo mensaje que si nunca hubo token.
export function FormularioRegistroMaestro({ token }: FormularioRegistroMaestroProps) {
  const alta = useRegistroMaestro()
  const [errores, setErrores] = useState<ErroresFormulario>({})

  const handleSubmit = (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault()
    if (alta.isPending) return

    const formulario = new FormData(evento.currentTarget)
    const resultado = registroMaestroSchema.safeParse({
      nombre: formulario.get("nombre"),
      email: formulario.get("correo"),
      contrasena: formulario.get("contrasena"),
      token,
    })
    if (!resultado.success) {
      setErrores(erroresPorCampo(resultado.error.issues))
      return
    }

    setErrores({})
    alta.mutate(resultado.data)
  }

  if (esApiError(alta.error) && alta.error.codigo === "ENLACE_INVALIDO") {
    return <MensajeError mensaje={TEXTOS_REGISTRO_MAESTRO.enlaceInvalido} />
  }

  const describeContrasena = errores.contrasena
    ? "contrasena-ayuda contrasena-error"
    : "contrasena-ayuda"

  return (
    <form
      noValidate
      aria-label={TEXTOS_REGISTRO_MAESTRO.crear}
      onSubmit={handleSubmit}
      className="flex flex-col gap-5"
    >
      {alta.isError && (
        <MensajeError
          titulo={TEXTOS_REGISTRO_MAESTRO.tituloError}
          mensaje={mensajeDeErrorAuth(alta.error)}
        />
      )}
      <div className="flex flex-col gap-2">
        <Label htmlFor="nombre">{TEXTOS_REGISTRO_MAESTRO.nombre}</Label>
        <Input
          id="nombre"
          name="nombre"
          type="text"
          autoComplete="name"
          required
          aria-invalid={errores.nombre !== undefined}
          aria-describedby={errores.nombre ? "nombre-error" : undefined}
        />
        {errores.nombre && <ErrorDeCampo id="nombre-error">{errores.nombre}</ErrorDeCampo>}
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="correo">{TEXTOS_REGISTRO_MAESTRO.correo}</Label>
        <Input
          id="correo"
          name="correo"
          type="email"
          autoComplete="email"
          required
          aria-invalid={errores.email !== undefined}
          aria-describedby={errores.email ? "correo-error" : undefined}
        />
        {errores.email && <ErrorDeCampo id="correo-error">{errores.email}</ErrorDeCampo>}
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="contrasena">{TEXTOS_REGISTRO_MAESTRO.contrasena}</Label>
        <CampoContrasena
          id="contrasena"
          name="contrasena"
          nombreDelBoton={TEXTOS_CAMPO_CONTRASENA.mostrar}
          autoComplete="new-password"
          required
          aria-invalid={errores.contrasena !== undefined}
          aria-describedby={describeContrasena}
        />
        <p id="contrasena-ayuda" className="text-small text-muted-foreground">
          {TEXTOS_REGISTRO_MAESTRO.ayudaContrasena}
        </p>
        {errores.contrasena && (
          <ErrorDeCampo id="contrasena-error">{errores.contrasena}</ErrorDeCampo>
        )}
      </div>
      <Button type="submit" variant="primary" enEspera={alta.isPending}>
        {TEXTOS_REGISTRO_MAESTRO.crear}
      </Button>
    </form>
  )
}
