import { MensajeError } from "@/components/mensaje-error"

import { FormularioRegistroMaestro } from "./components/formulario-registro-maestro"
import { TarjetaDeCuenta } from "./components/tarjeta-de-cuenta"
import { TEXTOS_REGISTRO_MAESTRO } from "./data"
import { useTokenDelEnlace } from "./hooks"

// AUTH-03b, §D-B6: registro público de maestro con un enlace de registro que genera el admin.
export function RegistroMaestroView() {
  const token = useTokenDelEnlace()

  if (token === null) {
    return (
      <TarjetaDeCuenta titulo={TEXTOS_REGISTRO_MAESTRO.titulo}>
        <MensajeError mensaje={TEXTOS_REGISTRO_MAESTRO.enlaceInvalido} />
      </TarjetaDeCuenta>
    )
  }

  return (
    <TarjetaDeCuenta
      titulo={TEXTOS_REGISTRO_MAESTRO.titulo}
      descripcion={TEXTOS_REGISTRO_MAESTRO.subtitulo}
    >
      <FormularioRegistroMaestro token={token} />
    </TarjetaDeCuenta>
  )
}
