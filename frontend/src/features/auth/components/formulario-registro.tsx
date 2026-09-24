import { registroSchema } from "@campus/shared"
import { useState, type FormEvent } from "react"
import { Link } from "react-router"

import { MensajeError } from "@/components/mensaje-error"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

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
        <label htmlFor="nombre" className="text-sm font-medium">
          {TEXTOS_REGISTRO.nombre}
        </label>
        <Input
          id="nombre"
          name="nombre"
          type="text"
          autoComplete="name"
          required
          aria-invalid={errores.nombre !== undefined}
          aria-describedby={errores.nombre ? "nombre-error" : undefined}
        />
        {errores.nombre && (
          <p id="nombre-error" className="text-sm text-destructive">
            {errores.nombre}
          </p>
        )}
      </div>
      <div className="flex flex-col gap-2">
        <label htmlFor="correo" className="text-sm font-medium">
          {TEXTOS_REGISTRO.correo}
        </label>
        <Input
          id="correo"
          name="correo"
          type="email"
          autoComplete="email"
          required
          aria-invalid={errores.email !== undefined}
          aria-describedby={errores.email ? "correo-error" : undefined}
        />
        {errores.email && (
          <p id="correo-error" className="text-sm text-destructive">
            {errores.email}
          </p>
        )}
      </div>
      <div className="flex flex-col gap-2">
        <label htmlFor="contrasena" className="text-sm font-medium">
          {TEXTOS_REGISTRO.contrasena}
        </label>
        <Input
          id="contrasena"
          name="contrasena"
          type="password"
          autoComplete="new-password"
          required
          aria-invalid={errores.contrasena !== undefined}
          aria-describedby={describeContrasena}
        />
        <p id="contrasena-ayuda" className="text-sm text-muted-foreground">
          {TEXTOS_REGISTRO.ayudaContrasena}
        </p>
        {errores.contrasena && (
          <p id="contrasena-error" className="text-sm text-destructive">
            {errores.contrasena}
          </p>
        )}
      </div>
      <Button type="submit" variant="primary" disabled={alta.isPending} aria-busy={alta.isPending}>
        {TEXTOS_REGISTRO.crear}
      </Button>
      <Link to="/login" className="text-sm text-accent underline-offset-4 hover:underline">
        {TEXTOS_REGISTRO.yaTienesCuenta}
      </Link>
    </form>
  )
}
