import { loginSchema } from "@campus/shared"
import { useState, type FormEvent } from "react"
import { Link } from "react-router"

import { ErrorDeCampo } from "@/components/error-de-campo"
import { MensajeError } from "@/components/mensaje-error"
import { Button } from "@/components/ui/button"
import { buttonVariants } from "@/components/ui/button-variants"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

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
        <Label htmlFor="correo">{TEXTOS_LOGIN.correo}</Label>
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
        <Label htmlFor="contrasena">{TEXTOS_LOGIN.contrasena}</Label>
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
          <ErrorDeCampo id="contrasena-error">{errores.contrasena}</ErrorDeCampo>
        )}
      </div>
      <Button type="submit" variant="primary" enEspera={inicioSesion.isPending}>
        {TEXTOS_LOGIN.entrar}
      </Button>
      <div className="flex flex-col gap-2">
        <Link to="/recuperar" className={buttonVariants({ variant: "link", size: "enlace" })}>
          {TEXTOS_LOGIN.olvide}
        </Link>
        <p className="text-small text-muted-foreground">{TEXTOS_LOGIN.notaAdministracion}</p>
        <Link to="/registro" className={buttonVariants({ variant: "link", size: "enlace" })}>
          {TEXTOS_LOGIN.registro}
        </Link>
      </div>
    </form>
  )
}
