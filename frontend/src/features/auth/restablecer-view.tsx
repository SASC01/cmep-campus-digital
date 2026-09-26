import { EnlaceInvalido, FormularioNuevaContrasena } from "./components/formulario-nueva-contrasena"
import { TarjetaDeCuenta } from "./components/tarjeta-de-cuenta"
import { TEXTOS_NUEVA_CONTRASENA } from "./data"
import { useTokenDelEnlace } from "./hooks"

// DEC-18: el token viene en el fragmento (#token=). Sin token válido, ni una petición: se muestra
// el mismo estado que un enlace rechazado por el servidor.
export function RestablecerView() {
  const token = useTokenDelEnlace()
  const textos = TEXTOS_NUEVA_CONTRASENA.recuperacion

  if (token === null) {
    return (
      <TarjetaDeCuenta titulo={textos.titulo}>
        <EnlaceInvalido tipo="recuperacion" />
      </TarjetaDeCuenta>
    )
  }

  return (
    <TarjetaDeCuenta titulo={textos.titulo}>
      <FormularioNuevaContrasena tipo="recuperacion" token={token} />
    </TarjetaDeCuenta>
  )
}
