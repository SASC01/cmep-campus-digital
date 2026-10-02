import { NavLink } from "react-router"

import { cn } from "@/lib/utils"

import { TEXTOS_MARCO } from "./data"
import type { Destino } from "./types"

interface BarraNavegacionProps {
  destinos: readonly Destino[]
}

// Una sola nav (R-08 de plan.md): barra lateral desde 768 px, barra inferior fija por debajo.
export function BarraNavegacion({ destinos }: BarraNavegacionProps) {
  return (
    <nav
      aria-label={TEXTOS_MARCO.navegacion}
      className="vidrio fixed inset-x-4 bottom-4 z-10 flex h-16 items-center justify-center gap-3 rounded-panel px-2 md:sticky md:inset-x-auto md:top-6 md:bottom-auto md:h-[calc(100svh-3rem)] md:w-24 md:flex-col md:justify-start md:px-3 md:pt-5"
    >
      <ul className="flex gap-3 md:flex-col">
        {destinos.map((destino) => (
          <li key={destino.ruta}>
            <NavLink
              to={destino.ruta}
              end
              className={({ isActive }) =>
                cn(
                  "flex h-14 w-18 flex-col items-center justify-center gap-1 rounded-row text-caption font-medium text-foreground transition-colors duration-150 hover:vidrio-fuerte in-data-[material=opaco]:hover:bg-muted md:h-15",
                  isActive &&
                    "vidrio-fuerte font-bold text-link in-data-[material=opaco]:bg-accent-soft",
                )
              }
            >
              <destino.icono aria-hidden="true" className="size-5" />
              <span>{destino.etiqueta}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
