import { loginSchema } from "@campus/shared"
import { useState, type FormEvent } from "react"
import { Link } from "react-router"

import { MensajeError } from "@/components/mensaje-error"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

import { TEXTOS_LOGIN } from "../data"
import { useLogin } from "../hooks"
import { erroresPorCampo, mensajeDeErrorAuth } from "../lib"
import type { ErroresFormulario } from "../types"

// Validación en cliente con el esquema de shared/; la definitiva es la del servidor.
export function FormularioLogin() {
  const inicioSesion = useLogin()
  const [errores, setErrores] = useState<ErroresFormulario>({})

  const handleSubmit = (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault()
    if (inicioSesion.isPending) return

    const formulario = new FormData(evento.currentTarget)
    const resultado = loginSchema.safeParse({
      email: formulario.get("correo"),
      contrasena: formulario.get("contrasena"),
    })
    if (!resultado.success) {
      setErrores(erroresPorCampo(resultado.error.issues))
      return
    }

    setErrores({})
    inicioSesion.mutate(resultado.data)
  }

  return (
    <form
      noValidate
      aria-label={TEXTOS_LOGIN.entrar}
      onSubmit={handleSubmit}
      className="flex flex-col gap-5"
    >
      {inicioSesion.isError && (
        <MensajeError
          titulo={TEXTOS_LOGIN.tituloError}
          mensaje={mensajeDeErrorAuth(inicioSesion.error)}
        />
      )}
      <div className="flex flex-col gap-2">
        <label htmlFor="correo" className="text-sm font-medium">
          {TEXTOS_LOGIN.correo}
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
          {TEXTOS_LOGIN.contrasena}
        </label>
        <Input
          id="contrasena"
          name="contrasena"
          type="password"
          autoComplete="current-password"
          required
          aria-invalid={errores.contrasena !== undefined}
          aria-describedby={errores.contrasena ? "contrasena-error" : undefined}
        />
        {errores.contrasena && (
          <p id="contrasena-error" className="text-sm text-destructive">
            {errores.contrasena}
          </p>
        )}
      </div>
      <Button
        type="submit"
        variant="primary"
        disabled={inicioSesion.isPending}
        aria-busy={inicioSesion.isPending}
      >
        {TEXTOS_LOGIN.entrar}
      </Button>
      <div className="flex flex-col gap-2 text-sm">
        <Link to="/recuperar" className="text-accent underline-offset-4 hover:underline">
          {TEXTOS_LOGIN.olvide}
        </Link>
        <p className="text-muted-foreground">{TEXTOS_LOGIN.notaAdministracion}</p>
        <Link to="/registro" className="text-accent underline-offset-4 hover:underline">
          {TEXTOS_LOGIN.registro}
        </Link>
      </div>
    </form>
  )
}
