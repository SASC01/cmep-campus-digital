import { TEXTOS_TU_TRABAJO } from "../data"

interface ListaDeEnlacesProps {
  enlaces: readonly string[]
}

// ENTREGAS-01d (§D-9.5, C-5): los enlaces de una entrega, con su texto completo (llegan normalizados,
// de hasta 2048 caracteres: `wrap-anywhere` los parte sin desbordar a 360 px). Es el único enlace de
// features/tareas que se abre en otra pestaña: abrirlo en la misma sacaría a la persona de la
// entrega y del hilo, y `noopener noreferrer` corta el acceso a window.opener y no envía el Referer.
// El esquema de la respuesta ya exigió http o https: un javascript: nunca llega a pintarse.
export function ListaDeEnlaces({ enlaces }: ListaDeEnlacesProps) {
  return (
    <ul aria-label={TEXTOS_TU_TRABAJO.enlacesDeLaEntrega} className="flex flex-col">
      {enlaces.map((enlace, indice) => (
        <li key={`${indice}-${enlace}`} className="border-b border-border py-2 last:border-0">
          <a
            href={enlace}
            target="_blank"
            rel="noopener noreferrer"
            className="wrap-anywhere text-small text-link underline-offset-4 hover:underline"
          >
            {enlace} <span className="sr-only">{TEXTOS_TU_TRABAJO.otraPestana}</span>
          </a>
        </li>
      ))}
    </ul>
  )
}
