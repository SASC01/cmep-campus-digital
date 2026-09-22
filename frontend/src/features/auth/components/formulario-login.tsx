import type { FormEvent } from "react"
import { Link } from "react-router"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

import { TEXTOS_LOGIN } from "../data"

// Sin estado ni validación: el envío real llega con el encargo de autenticación (carril sensible).
export function FormularioLogin() {
  const handleSubmit = (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault()
    toast.message(TEXTOS_LOGIN.avisoPendiente)
  }

  return (
    <form
      noValidate
      aria-label={TEXTOS_LOGIN.entrar}
      onSubmit={handleSubmit}
      className="flex flex-col gap-5"
    >
      <div className="flex flex-col gap-2">
        <label htmlFor="correo" className="text-sm font-medium">
          {TEXTOS_LOGIN.correo}
        </label>
        <Input id="correo" name="correo" type="email" autoComplete="email" required />
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
        />
      </div>
      <Button type="submit" variant="primary">
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
