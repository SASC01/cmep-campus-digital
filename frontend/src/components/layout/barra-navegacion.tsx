import { useRef } from "react"
import { Link, useLocation } from "react-router"

import { cn } from "@/lib/utils"

import { TEXTOS_MARCO } from "./data"
import { ListaDeClases } from "./lista-de-clases"
import type { Destino, Rol } from "./types"

interface BarraNavegacionProps {
  rol: Rol
  destinos: readonly Destino[]
}

// Una sola nav (R-08 de plan.md): barra lateral desde 768 px, barra inferior fija por debajo. La lista
// de clases (CLASES-02d) es solo del estudiante y del maestro (P-07 a) y solo desde 768 px.
// ADMIN-01g (E-06): el destino activo se calcula aquí, sin la barra final de la ruta: "/admin/" deja
// activo «Inicio» como "/admin". Un destino exacto, solo en su ruta; uno de prefijo, también en sus
// subrutas. Sin distinguir mayúsculas, como el router.
export function BarraNavegacion({ rol, destinos }: BarraNavegacionProps) {
  const navRef = useRef<HTMLElement>(null)
  const { pathname } = useLocation()
  const actual = (pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname).toLowerCase()
  const estaActivo = (destino: Destino) => {
    const ruta = destino.ruta.toLowerCase()
    if (actual === ruta) return true
    return destino.coincidencia === "prefijo" && actual.startsWith(`${ruta}/`)
  }
  return (
    <nav
      ref={navRef}
      aria-label={TEXTOS_MARCO.navegacion}
      className="vidrio fixed inset-x-4 bottom-4 z-10 flex h-16 items-center justify-center gap-3 rounded-panel px-2 md:sticky md:inset-x-auto md:top-6 md:bottom-auto md:h-[calc(100svh-3rem)] md:w-24 md:flex-col md:justify-start md:px-3 md:pt-5"
    >
      <ul className="flex gap-3 md:flex-col">
        {destinos.map((destino) => {
          const activo = estaActivo(destino)
          return (
            <li key={destino.ruta}>
              <Link
                to={destino.ruta}
                aria-current={activo ? "page" : undefined}
                className={cn(
                  "flex h-14 w-18 flex-col items-center justify-center gap-1 rounded-row text-caption font-medium text-foreground transition-colors duration-150 hover:vidrio-fuerte in-data-[material=opaco]:hover:bg-muted md:h-15",
                  activo &&
                    "vidrio-fuerte font-bold text-link in-data-[material=opaco]:bg-accent-soft",
                )}
              >
                <destino.icono aria-hidden="true" className="size-5" />
                <span>{destino.etiqueta}</span>
              </Link>
            </li>
          )
        })}
      </ul>
      {rol !== "admin" && <ListaDeClases rol={rol} navRef={navRef} />}
    </nav>
  )
}
