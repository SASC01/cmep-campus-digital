import { NavLink, useLocation } from "react-router"

import { buttonVariants } from "@/components/ui/button-variants"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"

import {
  CAPACIDADES_POR_PERSPECTIVA,
  CLASES_DE_LA_REJILLA_POR_SECCIONES,
  CLASES_DEL_INDICADOR_POR_SECCIONES,
  CLASES_DE_POSICION_DEL_INDICADOR,
  TEXTOS_CLASE,
} from "../data"
import { baseDeClase, indiceDeSeccionActiva } from "../lib"
import type { Perspectiva } from "../types"

interface SeccionesDeClaseProps {
  claseId: string
  perspectiva: Perspectiva
}

// §D-A5, §D-2C1: no es una <nav> (esa es la de components/layout, en components/layout/barra-navegacion).
// Las secciones salen de la perspectiva: "Muro" y "Personas" (estudiante), "Muro" y "Alumnos"
// (maestro) o "Muro", "Alumnos" y "Maestros" (admin). NavLink pone aria-current="page" en el enlace
// activo por su cuenta. El grupo va en vidrio (Card) y el indicador de la activa se desliza con
// transform: mide 1/N y se traslada una posición por sección. En contexto opaco (el admin) el
// indicador usa --accent-soft en vez de --surface, que sobre la superficie opaca no se vería; el
// estado también lo dicen aria-current y el color del texto, no solo la posición del indicador.
export function SeccionesDeClase({ claseId, perspectiva }: SeccionesDeClaseProps) {
  const { pathname } = useLocation()
  const { secciones } = CAPACIDADES_POR_PERSPECTIVA[perspectiva]
  const base = baseDeClase(perspectiva, claseId)
  // Sin sección activa (por ejemplo, /editar dentro de ClaseLayout) no hay indicador: un indicador
  // diría algo que aria-current y el color del texto no respaldan (DESIGN.md §7.3).
  const activa = indiceDeSeccionActiva(pathname, base, secciones)

  const clasesDelEnlace = ({ isActive }: { isActive: boolean }) =>
    cn(buttonVariants({ variant: "ghost", size: "sm" }), "relative w-full", isActive && "text-link")

  return (
    <Card className="w-fit gap-0 rounded-card p-1">
      <div className="relative">
        {activa >= 0 && (
          <span
            aria-hidden="true"
            className={cn(
              "absolute inset-y-0 left-0 rounded-row bg-surface transition-transform duration-200 in-data-[material=opaco]:bg-accent-soft motion-reduce:transition-none",
              CLASES_DEL_INDICADOR_POR_SECCIONES[secciones.length],
              CLASES_DE_POSICION_DEL_INDICADOR[activa],
            )}
          />
        )}
        <ul
          aria-label={TEXTOS_CLASE.secciones}
          className={cn(
            "relative grid gap-0",
            CLASES_DE_LA_REJILLA_POR_SECCIONES[secciones.length],
          )}
        >
          {secciones.map(({ segmento, texto }) => (
            <li key={segmento}>
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
