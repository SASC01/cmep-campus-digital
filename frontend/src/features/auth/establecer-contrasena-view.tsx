import { Cargando } from "@/components/cargando"
import { MensajeError } from "@/components/mensaje-error"
import { esApiError } from "@/services/apiClient"

import { EnlaceInvalido, FormularioNuevaContrasena } from "./components/formulario-nueva-contrasena"
import { TarjetaDeCuenta } from "./components/tarjeta-de-cuenta"
import { TEXTOS_NUEVA_CONTRASENA } from "./data"
import { useDatosDeInvitacion, useTokenDelEnlace } from "./hooks"
import { mensajeDeErrorAuth } from "./lib"

// DEC-11, AUTH-03a (§D-A2): enlace de invitación de un maestro. Al montar, con token, pide su
// nombre con POST /auth/invitacion; el formulario lo prellena y deja corregirlo.
export function EstablecerContrasenaView() {
  const token = useTokenDelEnlace()
  const textos = TEXTOS_NUEVA_CONTRASENA.invitacion

  if (token === null) {
    return (
      <TarjetaDeCuenta titulo={textos.titulo} descripcion={textos.descripcion}>
        <EnlaceInvalido tipo="invitacion" />
      </TarjetaDeCuenta>
    )
  }

  return (
    <TarjetaDeCuenta titulo={textos.titulo} descripcion={textos.descripcion}>
      <ContenidoConToken token={token} />
    </TarjetaDeCuenta>
  )
}

interface ContenidoConTokenProps {
  token: string
}

function ContenidoConToken({ token }: ContenidoConTokenProps) {
  const datosDeInvitacion = useDatosDeInvitacion(token)

  if (esApiError(datosDeInvitacion.error) && datosDeInvitacion.error.codigo === "ENLACE_INVALIDO") {
    return <EnlaceInvalido tipo="invitacion" />
  }

  if (datosDeInvitacion.isError) {
    return <MensajeError mensaje={mensajeDeErrorAuth(datosDeInvitacion.error)} />
  }

  if (datosDeInvitacion.isLoading || datosDeInvitacion.data === undefined) {
    return <Cargando />
  }

  return (
    <FormularioNuevaContrasena
      tipo="invitacion"
      token={token}
      nombreInicial={datosDeInvitacion.data.nombre}
    />
  )
}
