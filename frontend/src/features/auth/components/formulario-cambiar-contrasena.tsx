import { cambiarContrasenaSchema } from "@campus/shared"
import { useState, type FormEvent } from "react"

import { MensajeError } from "@/components/mensaje-error"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

import { MENSAJE_CONFIRMACION_NO_COINCIDE, TEXTOS_CAMBIAR } from "../data"
import { useCambiarContrasena, useCerrarSesion } from "../hooks"
import { contrasenasCoinciden, erroresPorCampo, mensajeDeErrorAuth } from "../lib"
import type { ErroresFormulario } from "../types"

// DEC-09: cambio obligatorio con una contraseña temporal. "Cerrar sesión" es la salida para quien
// no quiere o no puede cambiarla ahora.
export function FormularioCambiarContrasena() {
  const cambiar = useCambiarContrasena()
  const cerrarSesion = useCerrarSesion()
  const [errores, setErrores] = useState<ErroresFormulario>({})
  const [errorConfirmacion, setErrorConfirmacion] = useState(false)

  const handleSubmit = (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault()
    if (cambiar.isPending) return

    const formulario = new FormData(evento.currentTarget)
    const contrasenaNueva = formulario.get("contrasenaNueva")
    const confirmacion = formulario.get("confirmacion")
    const resultado = cambiarContrasenaSchema.safeParse({
      contrasenaActual: formulario.get("contrasenaActual"),
      contrasenaNueva,
    })
    if (!resultado.success) {
      setErrores(erroresPorCampo(resultado.error.issues))
      setErrorConfirmacion(false)
      return
    }
    if (!contrasenasCoinciden(String(contrasenaNueva), String(confirmacion))) {
      setErrores({})
      setErrorConfirmacion(true)
      return
    }

    setErrores({})
    setErrorConfirmacion(false)
    cambiar.mutate(resultado.data)
  }

  return (
    <form
      noValidate
      aria-label={TEXTOS_CAMBIAR.guardar}
      onSubmit={handleSubmit}
      className="flex flex-col gap-5"
    >
      {cambiar.isError && <MensajeError mensaje={mensajeDeErrorAuth(cambiar.error)} />}
      <div className="flex flex-col gap-2">
        <label htmlFor="contrasenaActual" className="text-sm font-medium">
          {TEXTOS_CAMBIAR.contrasenaActual}
        </label>
        <Input
          id="contrasenaActual"
          name="contrasenaActual"
          type="password"
          autoComplete="current-password"
          required
          aria-invalid={errores.contrasenaActual !== undefined}
          aria-describedby={errores.contrasenaActual ? "contrasenaActual-error" : undefined}
        />
        {errores.contrasenaActual && (
          <p id="contrasenaActual-error" className="text-sm text-destructive">
            {errores.contrasenaActual}
          </p>
        )}
      </div>
      <div className="flex flex-col gap-2">
        <label htmlFor="contrasenaNueva" className="text-sm font-medium">
          {TEXTOS_CAMBIAR.contrasenaNueva}
        </label>
        <Input
          id="contrasenaNueva"
          name="contrasenaNueva"
          type="password"
          autoComplete="new-password"
          required
          aria-invalid={errores.contrasenaNueva !== undefined}
          aria-describedby={
            errores.contrasenaNueva
              ? "contrasenaNueva-ayuda contrasenaNueva-error"
              : "contrasenaNueva-ayuda"
          }
        />
        <p id="contrasenaNueva-ayuda" className="text-sm text-muted-foreground">
          {TEXTOS_CAMBIAR.ayudaContrasena}
        </p>
        {errores.contrasenaNueva && (
          <p id="contrasenaNueva-error" className="text-sm text-destructive">
            {errores.contrasenaNueva}
          </p>
        )}
      </div>
      <div className="flex flex-col gap-2">
        <label htmlFor="confirmacion" className="text-sm font-medium">
          {TEXTOS_CAMBIAR.confirmacion}
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
      <div className="flex flex-col gap-3 sm:flex-row">
        <Button
          type="submit"
          variant="primary"
          disabled={cambiar.isPending}
          aria-busy={cambiar.isPending}
        >
          {TEXTOS_CAMBIAR.guardar}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => cerrarSesion.mutate()}
          disabled={cerrarSesion.isPending}
          aria-busy={cerrarSesion.isPending}
        >
          {TEXTOS_CAMBIAR.cerrarSesion}
        </Button>
      </div>
    </form>
  )
}
