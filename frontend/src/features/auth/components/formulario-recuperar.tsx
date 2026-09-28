import { recuperarSchema } from "@campus/shared"
import { useState, type FormEvent } from "react"
import { Link } from "react-router"

import { ErrorDeCampo } from "@/components/error-de-campo"
import { MensajeError } from "@/components/mensaje-error"
import { Button } from "@/components/ui/button"
import { buttonVariants } from "@/components/ui/button-variants"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

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
        <Link to="/login" className={buttonVariants({ variant: "link", size: "enlace" })}>
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
        <Label htmlFor="correo">{TEXTOS_RECUPERAR.correo}</Label>
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
      <Button type="submit" variant="primary" enEspera={recuperar.isPending}>
        {TEXTOS_RECUPERAR.enviar}
      </Button>
      <div className="flex flex-col gap-2">
        <p className="text-small text-muted-foreground">{TEXTOS_RECUPERAR.notaAdministracion}</p>
        <Link to="/login" className={buttonVariants({ variant: "link", size: "enlace" })}>
          {TEXTOS_RECUPERAR.volver}
        </Link>
      </div>
    </form>
  )
}
