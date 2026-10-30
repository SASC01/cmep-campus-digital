import type { CSSProperties } from "react"
import { NavLink, useLocation } from "react-router"

import { buttonVariants } from "@/components/ui/button-variants"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"

import { CAPACIDADES_POR_PERSPECTIVA, TEXTOS_CLASE } from "../data"
import { useIndicadorDeSecciones } from "../hooks"
import { baseDeClase, indiceDeSeccionActiva } from "../lib"
import type { Perspectiva } from "../types"

interface SeccionesDeClaseProps {
  claseId: string
  perspectiva: Perspectiva
}

// §D-A5, §D-2C1: no es una <nav> (esa es la de components/layout, en components/layout/barra-navegacion).
// CLASES-03 (§D-7.1): las mismas secciones en las tres perspectivas ("Avisos", "Actividades de
// aprendizaje", "Personas" y "Calificaciones"). NavLink pone aria-current="page" en el enlace activo
// por su cuenta. El grupo va en vidrio (Card) y cada opción tiene su ancho natural (DH-03, §D-7.2): el
// indicador de la activa toma su posición y su ancho medidos, en dos variables CSS (la única
// excepción a los valores sueltos, A-01), y solo la posición se desliza. En contexto opaco (el admin)
// el indicador usa --accent-soft en vez de --surface, que sobre la superficie opaca no se vería; el
// estado también lo dicen aria-current y el color del texto, no solo el indicador. Si el grupo no
// cabe, se desplaza en horizontal dentro de su panel y la opción activa queda a la vista; la página
// nunca.
export function SeccionesDeClase({ claseId, perspectiva }: SeccionesDeClaseProps) {
  const { pathname } = useLocation()
  const { secciones } = CAPACIDADES_POR_PERSPECTIVA[perspectiva]
  const base = baseDeClase(perspectiva, claseId)
  // Sin sección activa (por ejemplo, /editar dentro de ClaseLayout) no hay indicador: un indicador
  // diría algo que aria-current y el color del texto no respaldan (DESIGN.md §7.3).
  const activa = indiceDeSeccionActiva(pathname, base, secciones)
  const { panelRef, listaRef, medida } = useIndicadorDeSecciones(activa, base)

  const clasesDelEnlace = ({ isActive }: { isActive: boolean }) =>
    cn(
      buttonVariants({ variant: "ghost", size: "sm" }),
      "relative whitespace-nowrap",
      isActive && "text-link",
    )

  // T-01 de la ronda 1 de 03c1: el indicador no se pinta sin su medida. Así, al entrar, al volver de
  // una pantalla sin sección o al cambiar de clase aparece ya en su lugar; solo al cambiar de sección
  // parte de la medida de la anterior y se desliza.
  const estiloDelIndicador =
    medida === null
      ? undefined
      : ({
          "--indicador-x": `${String(medida.x)}px`,
          "--indicador-ancho": `${String(medida.ancho)}px`,
        } as CSSProperties)

  return (
    <Card ref={panelRef} className="w-fit max-w-full gap-0 overflow-x-auto rounded-card p-1">
      <div className="relative w-max">
        {activa >= 0 && medida !== null && (
          <span
            aria-hidden="true"
            style={estiloDelIndicador}
            className="absolute inset-y-0 left-0 w-(--indicador-ancho) translate-x-(--indicador-x) rounded-row bg-surface transition-transform duration-200 in-data-[material=opaco]:bg-accent-soft motion-reduce:transition-none"
          />
        )}
        <ul ref={listaRef} aria-label={TEXTOS_CLASE.secciones} className="relative flex">
          {secciones.map(({ segmento, texto }) => (
            <li key={segmento} className="shrink-0">
              <NavLink
                to={segmento === "" ? base : `${base}/${segmento}`}
                end={segmento === ""}
                className={clasesDelEnlace}
              >
                {texto}
              </NavLink>
            </li>
          ))}
        </ul>
      </div>
    </Card>
  )
}
