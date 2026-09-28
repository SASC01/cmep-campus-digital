interface FondoAnimadoProps {
  enMovimiento: boolean
}

// Fondo con orbes (§D-2), montado una sola vez fuera del router (app/fondo-de-la-app.tsx). Sin
// clases: todo el estilo sale de tokens.css por atributos de datos. Decorativo: aria-hidden.
export function FondoAnimado({ enMovimiento }: FondoAnimadoProps) {
  return (
    <div aria-hidden="true" data-fondo="" data-movimiento={enMovimiento ? "si" : "no"}>
      <div data-orbe="azul" />
      <div data-orbe="verde" />
      <div data-orbe="suave" />
      <div data-velo="" />
    </div>
  )
}
