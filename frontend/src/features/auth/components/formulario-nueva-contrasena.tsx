import { establecerContrasenaSchema } from "@campus/shared"
import { useState, type FormEvent } from "react"
import { Link } from "react-router"

import { ErrorDeCampo } from "@/components/error-de-campo"
import { MensajeError } from "@/components/mensaje-error"
import { Button } from "@/components/ui/button"
import { buttonVariants } from "@/components/ui/button-variants"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { esApiError } from "@/services/apiClient"

import { CampoContrasena } from "./campo-contrasena"
import {
  MENSAJE_CONFIRMACION_NO_COINCIDE,
  TEXTOS_CAMPO_CONTRASENA,
  TEXTOS_NUEVA_CONTRASENA,
} from "../data"
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
        <Link to="/recuperar" className={buttonVariants({ variant: "link", size: "enlace" })}>
          {textos.pedirOtroEnlace}
        </Link>
      )}
    </div>
  )
}

interface FormularioNuevaContrasenaProps {
  tipo: TipoEnlace
  token: string
  // AUTH-03a, §D-A2: solo con una invitación. Su presencia agrega el campo "Nombre completo",
  // prellenado y corregible, antes de la contraseña.
  nombreInicial?: string
}

// DEC-08, DEC-17: el token es de un solo uso; si el servidor lo rechaza (ENLACE_INVALIDO), la vista
// pasa al mismo estado que si nunca hubo token. Validación en cliente con el esquema de shared/ más
// la confirmación (que el servidor no conoce).
export function FormularioNuevaContrasena({
  tipo,
  token,
  nombreInicial,
}: FormularioNuevaContrasenaProps) {
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
    const nombre = nombreInicial === undefined ? undefined : formulario.get("nombre")
    const resultado = establecerContrasenaSchema.safeParse({
      token,
      contrasena,
      ...(nombre === undefined ? {} : { nombre }),
    })
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
      {nombreInicial !== undefined && (
        <div className="flex flex-col gap-2">
          <Label htmlFor="nombre">{textos.nombre}</Label>
          <Input
            id="nombre"
            name="nombre"
            autoComplete="name"
            required
            defaultValue={nombreInicial}
            aria-invalid={errores.nombre !== undefined}
            aria-describedby={errores.nombre ? "nombre-ayuda nombre-error" : "nombre-ayuda"}
          />
          <p id="nombre-ayuda" className="text-small text-muted-foreground">
            {textos.ayudaNombre}
          </p>
          {errores.nombre && <ErrorDeCampo id="nombre-error">{errores.nombre}</ErrorDeCampo>}
        </div>
      )}
      <div className="flex flex-col gap-2">
        <Label htmlFor="contrasenaNueva">{textos.contrasenaNueva}</Label>
        <CampoContrasena
          id="contrasenaNueva"
          name="contrasenaNueva"
          nombreDelBoton={TEXTOS_CAMPO_CONTRASENA.mostrarNueva}
          autoComplete="new-password"
          required
          aria-invalid={errores.contrasena !== undefined}
          aria-describedby={
            errores.contrasena
              ? "contrasenaNueva-ayuda contrasenaNueva-error"
              : "contrasenaNueva-ayuda"
          }
        />
        <p id="contrasenaNueva-ayuda" className="text-small text-muted-foreground">
          {textos.ayudaContrasena}
        </p>
        {errores.contrasena && (
          <ErrorDeCampo id="contrasenaNueva-error">{errores.contrasena}</ErrorDeCampo>
        )}
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="confirmacion">{textos.confirmacion}</Label>
        <CampoContrasena
          id="confirmacion"
          name="confirmacion"
          nombreDelBoton={TEXTOS_CAMPO_CONTRASENA.mostrarConfirmacion}
          autoComplete="new-password"
          required
          aria-invalid={errorConfirmacion}
          aria-describedby={errorConfirmacion ? "confirmacion-error" : undefined}
        />
        {errorConfirmacion && (
          <ErrorDeCampo id="confirmacion-error">{MENSAJE_CONFIRMACION_NO_COINCIDE}</ErrorDeCampo>
        )}
      </div>
      <Button type="submit" variant="primary" enEspera={nuevaContrasena.isPending}>
        {textos.boton}
      </Button>
    </form>
  )
}
