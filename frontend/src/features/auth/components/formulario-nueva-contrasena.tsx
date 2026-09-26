import { nuevaContrasenaConTokenSchema } from "@campus/shared"
import { useState, type FormEvent } from "react"
import { Link } from "react-router"

import { MensajeError } from "@/components/mensaje-error"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { esApiError } from "@/services/apiClient"

import { MENSAJE_CONFIRMACION_NO_COINCIDE, TEXTOS_NUEVA_CONTRASENA } from "../data"
import { useNuevaContrasena } from "../hooks"
import { contrasenasCoinciden, erroresPorCampo, mensajeDeErrorAuth } from "../lib"
import type { ErroresFormulario, TipoEnlace } from "../types"

interface EnlaceInvalidoProps {
  tipo: TipoEnlace
}

// Compartido con la vista: se usa tanto sin token en la URL como cuando el servidor rechaza el
// token al enviarlo (ambos son "el mismo enlace no sirve").
export function EnlaceInvalido({ tipo }: EnlaceInvalidoProps) {
  const textos = TEXTOS_NUEVA_CONTRASENA[tipo]
  return (
    <div className="flex flex-col gap-4">
      <MensajeError mensaje={textos.enlaceInvalido} />
      {tipo === "recuperacion" && (
        <Link to="/recuperar" className="text-sm text-accent underline-offset-4 hover:underline">
          {textos.pedirOtroEnlace}
        </Link>
      )}
    </div>
  )
}

interface FormularioNuevaContrasenaProps {
  tipo: TipoEnlace
  token: string
}

// DEC-08, DEC-17: el token es de un solo uso; si el servidor lo rechaza (ENLACE_INVALIDO), la vista
// pasa al mismo estado que si nunca hubo token. Validación en cliente con el esquema de shared/ más
// la confirmación (que el servidor no conoce).
export function FormularioNuevaContrasena({ tipo, token }: FormularioNuevaContrasenaProps) {
  const textos = TEXTOS_NUEVA_CONTRASENA[tipo]
  const nuevaContrasena = useNuevaContrasena(tipo)
  const [errores, setErrores] = useState<ErroresFormulario>({})
  const [errorConfirmacion, setErrorConfirmacion] = useState(false)

  const handleSubmit = (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault()
    if (nuevaContrasena.isPending) return

    const formulario = new FormData(evento.currentTarget)
    const contrasena = formulario.get("contrasenaNueva")
    const confirmacion = formulario.get("confirmacion")
    const resultado = nuevaContrasenaConTokenSchema.safeParse({ token, contrasena })
    if (!resultado.success) {
      setErrores(erroresPorCampo(resultado.error.issues))
      setErrorConfirmacion(false)
      return
    }
    if (!contrasenasCoinciden(String(contrasena), String(confirmacion))) {
      setErrores({})
      setErrorConfirmacion(true)
      return
    }

    setErrores({})
    setErrorConfirmacion(false)
    nuevaContrasena.mutate(resultado.data)
  }

  if (esApiError(nuevaContrasena.error) && nuevaContrasena.error.codigo === "ENLACE_INVALIDO") {
    return <EnlaceInvalido tipo={tipo} />
  }

  return (
    <form
      noValidate
      aria-label={textos.boton}
      onSubmit={handleSubmit}
      className="flex flex-col gap-5"
    >
      {nuevaContrasena.isError && (
        <MensajeError mensaje={mensajeDeErrorAuth(nuevaContrasena.error)} />
      )}
      <div className="flex flex-col gap-2">
        <label htmlFor="contrasenaNueva" className="text-sm font-medium">
          {textos.contrasenaNueva}
        </label>
        <Input
          id="contrasenaNueva"
          name="contrasenaNueva"
          type="password"
          autoComplete="new-password"
          required
          aria-invalid={errores.contrasena !== undefined}
          aria-describedby={
            errores.contrasena
              ? "contrasenaNueva-ayuda contrasenaNueva-error"
              : "contrasenaNueva-ayuda"
          }
        />
        <p id="contrasenaNueva-ayuda" className="text-sm text-muted-foreground">
          {textos.ayudaContrasena}
        </p>
        {errores.contrasena && (
          <p id="contrasenaNueva-error" className="text-sm text-destructive">
            {errores.contrasena}
          </p>
        )}
      </div>
      <div className="flex flex-col gap-2">
        <label htmlFor="confirmacion" className="text-sm font-medium">
          {textos.confirmacion}
        </label>
        <Input
          id="confirmacion"
          name="confirmacion"
          type="password"
          autoComplete="new-password"
          required
          aria-invalid={errorConfirmacion}
          aria-describedby={errorConfirmacion ? "confirmacion-error" : undefined}
        />
        {errorConfirmacion && (
          <p id="confirmacion-error" className="text-sm text-destructive">
            {MENSAJE_CONFIRMACION_NO_COINCIDE}
          </p>
        )}
      </div>
      <Button
        type="submit"
        variant="primary"
        disabled={nuevaContrasena.isPending}
        aria-busy={nuevaContrasena.isPending}
      >
        {textos.boton}
      </Button>
    </form>
  )
}
