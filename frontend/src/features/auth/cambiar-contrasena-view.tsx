import { MarcoPublico } from "@/components/layout/marco-publico"

import { FormularioCambiarContrasena } from "./components/formulario-cambiar-contrasena"
import { TarjetaDeCuenta } from "./components/tarjeta-de-cuenta"
import { TEXTOS_CAMBIAR } from "./data"

export function CambiarContrasenaView() {
  return (
    <MarcoPublico>
      <TarjetaDeCuenta titulo={TEXTOS_CAMBIAR.titulo} descripcion={TEXTOS_CAMBIAR.descripcion}>
        <FormularioCambiarContrasena />
      </TarjetaDeCuenta>
    </MarcoPublico>
  )
}
