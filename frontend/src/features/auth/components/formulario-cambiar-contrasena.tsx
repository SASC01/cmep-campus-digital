import { cambiarContrasenaSchema } from "@campus/shared"
import { useState, type FormEvent } from "react"

import { ErrorDeCampo } from "@/components/error-de-campo"
import { MensajeError } from "@/components/mensaje-error"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

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
        <Label htmlFor="contrasenaActual">{TEXTOS_CAMBIAR.contrasenaActual}</Label>
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
          <ErrorDeCampo id="contrasenaActual-error">{errores.contrasenaActual}</ErrorDeCampo>
        )}
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="contrasenaNueva">{TEXTOS_CAMBIAR.contrasenaNueva}</Label>
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
        <p id="contrasenaNueva-ayuda" className="text-small text-muted-foreground">
          {TEXTOS_CAMBIAR.ayudaContrasena}
        </p>
        {errores.contrasenaNueva && (
          <ErrorDeCampo id="contrasenaNueva-error">{errores.contrasenaNueva}</ErrorDeCampo>
        )}
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="confirmacion">{TEXTOS_CAMBIAR.confirmacion}</Label>
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
          <ErrorDeCampo id="confirmacion-error">{MENSAJE_CONFIRMACION_NO_COINCIDE}</ErrorDeCampo>
        )}
      </div>
      <div className="flex flex-col gap-3 sm:flex-row">
        <Button type="submit" variant="primary" enEspera={cambiar.isPending}>
          {TEXTOS_CAMBIAR.guardar}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => cerrarSesion.mutate()}
          enEspera={cerrarSesion.isPending}
        >
          {TEXTOS_CAMBIAR.cerrarSesion}
        </Button>
      </div>
    </form>
  )
}
