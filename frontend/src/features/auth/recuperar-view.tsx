import { FormularioRecuperar } from "./components/formulario-recuperar"
import { TarjetaDeCuenta } from "./components/tarjeta-de-cuenta"
import { TEXTOS_RECUPERAR } from "./data"

export function RecuperarView() {
  return (
    <TarjetaDeCuenta titulo={TEXTOS_RECUPERAR.titulo} descripcion={TEXTOS_RECUPERAR.descripcion}>
      <FormularioRecuperar />
    </TarjetaDeCuenta>
  )
}
