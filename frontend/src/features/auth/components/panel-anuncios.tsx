import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

import { TEXTOS_LOGIN } from "../data"
import type { Anuncio } from "../types"

interface PanelAnunciosProps {
  anuncios: Anuncio[]
}

// Escritorio: columna desplazable de tarjetas. Móvil: lista compacta (título y una línea) con
// altura máxima y desplazamiento propio, arriba del formulario (RF-06, formato compacto).
export function PanelAnuncios({ anuncios }: PanelAnunciosProps) {
  return (
    <aside aria-label="Anuncios" className="flex flex-col gap-4 lg:max-h-svh lg:overflow-y-auto">
      <h2 className="text-lg font-semibold tracking-tight lg:text-2xl">
        {TEXTOS_LOGIN.tituloAnuncios}
      </h2>
      <ul className="flex max-h-56 flex-col gap-3 overflow-y-auto lg:max-h-none lg:gap-4 lg:overflow-visible">
        {anuncios.map((anuncio) => (
          <li key={anuncio.anuncioId}>
            <Card className="gap-2 py-4 lg:gap-4 lg:py-6">
              <CardHeader className="px-4 lg:px-6">
                <CardTitle className="text-base lg:text-lg">{anuncio.titulo}</CardTitle>
              </CardHeader>
              <CardContent className="px-4 lg:px-6">
                <p className="line-clamp-1 text-sm text-muted-foreground lg:line-clamp-none lg:text-base">
                  {anuncio.texto}
                </p>
              </CardContent>
            </Card>
          </li>
        ))}
      </ul>
    </aside>
  )
}
