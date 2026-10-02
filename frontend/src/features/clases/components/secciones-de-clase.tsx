import { NavLink, useMatch } from "react-router"

import { buttonVariants } from "@/components/ui/button-variants"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"

import { TEXTOS_CLASE } from "../data"

interface SeccionesDeClaseProps {
  claseId: string
  esDueno: boolean
}

// §D-A5: no es una <nav> (esa es la de components/layout, en components/layout/barra-navegacion).
// "Muro" para todos y, desde CLASES-b, "Personas" (estudiante) o "Alumnos" (maestro). NavLink pone
// aria-current="page" en el enlace activo por su cuenta. Ajuste del humano (2026-10-02): el grupo va
// en vidrio (Card) y el indicador de la activa se desliza con transform; el estado también lo dicen
// aria-current y el color del texto, no solo la posición del indicador.
export function SeccionesDeClase({ claseId, esDueno }: SeccionesDeClaseProps) {
  const base = esDueno ? `/maestro/clases/${claseId}` : `/estudiante/clases/${claseId}`
  const seccionDelRol = esDueno
    ? { destino: `${base}/alumnos`, texto: TEXTOS_CLASE.alumnos }
    : { destino: `${base}/personas`, texto: TEXTOS_CLASE.personas }
  // Sin sección activa (por ejemplo, /editar dentro de ClaseLayout) no hay indicador: un indicador
  // diría algo que aria-current y el color del texto no respaldan (DESIGN.md §7.3).
  const primeraActiva = useMatch({ path: base, end: true }) !== null
  const segundaActiva = useMatch({ path: seccionDelRol.destino, end: false }) !== null
  const hayActiva = primeraActiva || segundaActiva

  const clasesDelEnlace = ({ isActive }: { isActive: boolean }) =>
    cn(buttonVariants({ variant: "ghost", size: "sm" }), "relative w-full", isActive && "text-link")

  return (
    <Card className="w-fit gap-0 rounded-card p-1">
      <div className="relative">
        {hayActiva && (
          <span
            aria-hidden="true"
            className={cn(
              "absolute inset-y-0 left-0 w-1/2 rounded-row bg-surface transition-transform duration-200 motion-reduce:transition-none",
              segundaActiva && "translate-x-full",
            )}
          />
        )}
        <ul aria-label={TEXTOS_CLASE.secciones} className="relative grid grid-cols-2 gap-0">
          <li>
            <NavLink to={base} end className={clasesDelEnlace}>
              {TEXTOS_CLASE.muro}
            </NavLink>
          </li>
          <li>
            <NavLink to={seccionDelRol.destino} className={clasesDelEnlace}>
              {seccionDelRol.texto}
            </NavLink>
          </li>
        </ul>
      </div>
    </Card>
  )
}
