import { EnlaceInvalido, FormularioNuevaContrasena } from "./components/formulario-nueva-contrasena"
import { TarjetaDeCuenta } from "./components/tarjeta-de-cuenta"
import { TEXTOS_NUEVA_CONTRASENA } from "./data"
import { useTokenDelEnlace } from "./hooks"

// DEC-11: enlace de invitación de un maestro. Misma mecánica que /restablecer, con textos propios.
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
      <FormularioNuevaContrasena tipo="invitacion" token={token} />
    </TarjetaDeCuenta>
  )
}
