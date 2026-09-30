import { NavLink } from "react-router"

import { buttonVariants } from "@/components/ui/button-variants"
import { cn } from "@/lib/utils"

import { TEXTOS_CLASE } from "../data"

interface SeccionesDeClaseProps {
  claseId: string
  esDueno: boolean
}

// §D-A5: no es una <nav> (esa es la de components/layout, en components/layout/barra-navegacion).
// En a solo "Muro"; CLASES-b suma "Personas" (estudiante) o "Alumnos" (maestro). NavLink pone
// aria-current="page" en el enlace activo por su cuenta.
export function SeccionesDeClase({ claseId, esDueno }: SeccionesDeClaseProps) {
  const base = esDueno ? `/maestro/clases/${claseId}` : `/estudiante/clases/${claseId}`

  return (
    <ul aria-label={TEXTOS_CLASE.secciones} className="flex gap-2">
      <li>
        <NavLink
          to={base}
          end
          className={({ isActive }) =>
            cn(buttonVariants({ variant: "ghost", size: "sm" }), isActive && "bg-surface text-link")
          }
        >
          {TEXTOS_CLASE.muro}
        </NavLink>
      </li>
    </ul>
  )
}
