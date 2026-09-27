import { registroSchema } from "@campus/shared"
import { useState, type FormEvent } from "react"
import { Link } from "react-router"

import { ErrorDeCampo } from "@/components/error-de-campo"
import { MensajeError } from "@/components/mensaje-error"
import { Button } from "@/components/ui/button"
import { buttonVariants } from "@/components/ui/button-variants"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

import { TEXTOS_REGISTRO } from "../data"
import { useRegistro } from "../hooks"
import { erroresPorCampo, mensajeDeErrorAuth } from "../lib"
import type { ErroresFormulario } from "../types"

// RF-02: registro público solo para estudiantes; el rol lo fija el servidor, no el formulario.
export function FormularioRegistro() {
  const alta = useRegistro()
  const [errores, setErrores] = useState<ErroresFormulario>({})

  const handleSubmit = (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault()
    if (alta.isPending) return

    const formulario = new FormData(evento.currentTarget)
    const resultado = registroSchema.safeParse({
      nombre: formulario.get("nombre"),
      email: formulario.get("correo"),
      contrasena: formulario.get("contrasena"),
    })
    if (!resultado.success) {
      setErrores(erroresPorCampo(resultado.error.issues))
      return
    }

    setErrores({})
    alta.mutate(resultado.data)
  }

  const describeContrasena = errores.contrasena
    ? "contrasena-ayuda contrasena-error"
    : "contrasena-ayuda"

  return (
    <form
      noValidate
      aria-label={TEXTOS_REGISTRO.crear}
      onSubmit={handleSubmit}
      className="flex flex-col gap-5"
    >
      {alta.isError && (
        <MensajeError
          titulo={TEXTOS_REGISTRO.tituloError}
          mensaje={mensajeDeErrorAuth(alta.error)}
        />
      )}
      <div className="flex flex-col gap-2">
        <Label htmlFor="nombre">{TEXTOS_REGISTRO.nombre}</Label>
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
        <Label htmlFor="correo">{TEXTOS_REGISTRO.correo}</Label>
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
        <Label htmlFor="contrasena">{TEXTOS_REGISTRO.contrasena}</Label>
        <Input
          id="contrasena"
          name="contrasena"
          type="password"
          autoComplete="new-password"
          required
          aria-invalid={errores.contrasena !== undefined}
          aria-describedby={describeContrasena}
        />
        <p id="contrasena-ayuda" className="text-small text-muted-foreground">
          {TEXTOS_REGISTRO.ayudaContrasena}
        </p>
        {errores.contrasena && (
          <ErrorDeCampo id="contrasena-error">{errores.contrasena}</ErrorDeCampo>
        )}
      </div>
      <Button type="submit" variant="primary" enEspera={alta.isPending}>
        {TEXTOS_REGISTRO.crear}
      </Button>
      <Link to="/login" className={buttonVariants({ variant: "link", size: "enlace" })}>
        {TEXTOS_REGISTRO.yaTienesCuenta}
      </Link>
    </form>
  )
}
