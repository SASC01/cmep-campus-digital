import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

import { TEXTOS_LOGIN } from "../data"
import type { Anuncio } from "../types"

interface PanelAnunciosProps {
  anuncios: Anuncio[]
}

// Escritorio: columna desplazable de tarjetas. Móvil: lista compacta (título y una línea) con
// altura máxima y desplazamiento propio, arriba del formulario (RF-06, formato compacto).
// El contenedor que hace scroll (aside en escritorio, ul en móvil) recibe un poco de relleno con
// margen negativo a juego: sin él, --shadow-glass de la última tarjeta visible se corta de golpe
// en el borde del recorte y deja un filo recto grisáceo. El p-2 -m-2 es un alivio parcial, sin
// verificar en pantalla (DESIGN.md §7.2, "Contenedor con desplazamiento propio"): la solución de
// fondo la decide DESIGN-01b, que rehace esta composición.
export function PanelAnuncios({ anuncios }: PanelAnunciosProps) {
  return (
    <aside
      aria-label="Anuncios"
      className="flex flex-col gap-4 lg:max-h-svh lg:overflow-y-auto lg:p-2 lg:-m-2"
    >
      <h2 className="text-h3 lg:text-h2">{TEXTOS_LOGIN.tituloAnuncios}</h2>
      <ul className="flex max-h-56 flex-col gap-3 overflow-y-auto p-2 -m-2 lg:max-h-none lg:gap-4 lg:overflow-visible lg:p-0 lg:m-0">
        {anuncios.map((anuncio) => (
          <li key={anuncio.anuncioId}>
            <Card className="gap-2 py-4 lg:gap-4 lg:py-6">
              <CardHeader className="px-4 lg:px-6">
                <CardTitle className="text-body lg:text-h3">{anuncio.titulo}</CardTitle>
              </CardHeader>
              <CardContent className="px-4 lg:px-6">
                <p className="line-clamp-1 text-small text-muted-foreground lg:line-clamp-none lg:text-body">
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
