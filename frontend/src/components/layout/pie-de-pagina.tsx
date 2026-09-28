import { buttonVariants } from "@/components/ui/button-variants"

import { ENLACES_DEL_COLEGIO, TEXTOS_MARCO } from "./data"
import { enlacesVisibles, textoDeDerechos } from "./lib"
import type { EnlaceVisible } from "./types"

// Con URL, un enlace real; sin ella (solo en desarrollo), un marcador que no se puede pulsar ni
// enfocar (subrayado discontinuo lo distingue de un enlace real). Nunca href="#".
function renderEnlace(enlace: EnlaceVisible) {
  if (enlace.url === null) {
    return (
      <span
        data-marcador=""
        className="inline-flex min-h-11 items-center text-link underline decoration-dashed underline-offset-4"
      >
        {enlace.texto}
      </span>
    )
  }
  return (
    <a href={enlace.url} className={buttonVariants({ variant: "link", size: "enlace" })}>
      {enlace.texto}
    </a>
  )
}

// Pie de página en todas las pantallas (decisión del humano, 2026-09-27): las URL viven solo en
// components/layout/data.ts. import.meta.env.PROD se lee al pintar, no al cargar el módulo, para
// que la prueba pueda cambiarlo con vi.stubEnv.
export function PieDePagina() {
  const enlaces = enlacesVisibles(ENLACES_DEL_COLEGIO, import.meta.env.PROD)

  return (
    <footer className="vidrio flex flex-col gap-2 rounded-bar px-6 py-3 text-small text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
      <p>{textoDeDerechos(new Date())}</p>
      {enlaces.length > 0 && (
        <ul aria-label={TEXTOS_MARCO.enlacesDelColegio} className="flex flex-wrap gap-x-4">
          {enlaces.map((enlace) => (
            <li key={enlace.texto}>{renderEnlace(enlace)}</li>
          ))}
        </ul>
      )}
    </footer>
  )
}
