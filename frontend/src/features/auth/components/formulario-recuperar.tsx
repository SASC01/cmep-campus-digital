import { recuperarSchema } from "@campus/shared"
import { useState, type FormEvent } from "react"
import { Link } from "react-router"

import { MensajeError } from "@/components/mensaje-error"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

import { TEXTOS_RECUPERAR } from "../data"
import { useRecuperar } from "../hooks"
import { erroresPorCampo, mensajeDeErrorAuth } from "../lib"
import type { ErroresFormulario } from "../types"

// DEC-04: la API responde 204 exista o no la cuenta, así que la confirmación es siempre la misma
// (no revela nada). Validación en cliente con el esquema de shared/; la definitiva es la del servidor.
export function FormularioRecuperar() {
  const recuperar = useRecuperar()
  const [errores, setErrores] = useState<ErroresFormulario>({})

  const handleSubmit = (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault()
    if (recuperar.isPending) return

    const formulario = new FormData(evento.currentTarget)
    const resultado = recuperarSchema.safeParse({ email: formulario.get("correo") })
    if (!resultado.success) {
      setErrores(erroresPorCampo(resultado.error.issues))
      return
    }

    setErrores({})
    recuperar.mutate(resultado.data)
  }

  if (recuperar.isSuccess) {
    return (
      <div className="flex flex-col gap-4">
        <p role="status">{TEXTOS_RECUPERAR.confirmacion}</p>
        <Link to="/login" className="text-sm text-accent underline-offset-4 hover:underline">
          {TEXTOS_RECUPERAR.volver}
        </Link>
      </div>
    )
  }

  return (
    <form
      noValidate
      aria-label={TEXTOS_RECUPERAR.enviar}
      onSubmit={handleSubmit}
      className="flex flex-col gap-5"
    >
      {recuperar.isError && <MensajeError mensaje={mensajeDeErrorAuth(recuperar.error)} />}
      <div className="flex flex-col gap-2">
        <label htmlFor="correo" className="text-sm font-medium">
          {TEXTOS_RECUPERAR.correo}
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
      <Button
        type="submit"
        variant="primary"
        disabled={recuperar.isPending}
        aria-busy={recuperar.isPending}
      >
        {TEXTOS_RECUPERAR.enviar}
      </Button>
      <div className="flex flex-col gap-2 text-sm">
        <p className="text-muted-foreground">{TEXTOS_RECUPERAR.notaAdministracion}</p>
        <Link to="/login" className="text-accent underline-offset-4 hover:underline">
          {TEXTOS_RECUPERAR.volver}
        </Link>
      </div>
    </form>
  )
}
