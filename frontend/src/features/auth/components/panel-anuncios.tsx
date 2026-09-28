import { useId } from "react"

import { Card } from "@/components/ui/card"

import { TEXTOS_LOGIN } from "../data"
import type { Anuncio } from "../types"

interface PanelAnunciosProps {
  anuncios: Anuncio[]
}

// Escritorio: panel de vidrio con una lista desplazable de filas de vidrio fuerte. Móvil: lista
// compacta (título y una línea) con altura máxima, arriba del formulario (RF-06, formato compacto).
// Recorte de la sombra (DESIGN-01b, §7.2): las filas dentro de la lista con desplazamiento propio
// no llevan sombra (sin-sombra-de-vidrio redefine --shadow-glass en su subárbol; el borde y el
// brillo del filo se quedan). La sombra la da la Card, que no está dentro de ningún recorte.
export function PanelAnuncios({ anuncios }: PanelAnunciosProps) {
  const tituloId = useId()

  return (
    <aside aria-label="Anuncios" className="flex min-h-0 flex-col lg:self-center">
      <Card className="min-h-0 gap-4 py-4 lg:max-h-[calc(100svh-6rem)] lg:py-6">
        <h2 id={tituloId} className="px-4 text-h3 lg:px-6 lg:text-h2">
          {TEXTOS_LOGIN.tituloAnuncios}
        </h2>
        <ul
          tabIndex={0}
          aria-labelledby={tituloId}
          className="sin-sombra-de-vidrio mx-4 flex max-h-56 min-h-0 flex-col gap-3 overflow-y-auto lg:mx-6 lg:max-h-none lg:flex-1"
        >
          {anuncios.map((anuncio) => (
            <li
              key={anuncio.anuncioId}
              className="vidrio-fuerte flex flex-col gap-1 rounded-row p-4"
            >
              <h3 className="text-body font-bold">{anuncio.titulo}</h3>
              <p className="line-clamp-1 text-small text-muted-foreground lg:line-clamp-none">
                {anuncio.texto}
              </p>
            </li>
          ))}
        </ul>
      </Card>
    </aside>
  )
}
