import { RotateCw } from "lucide-react"
import type { ReactNode, RefObject } from "react"
import { Link, NavLink } from "react-router"

import { Button } from "@/components/ui/button"
import { inicialesDe } from "@/lib/format"
import { varianteDeClase } from "@/lib/variante-de-clase"
import { cn } from "@/lib/utils"

import { INSIGNIA_POR_VARIANTE, TEXTOS_MARCO } from "./data"
import { useClasesDeLaBarra, useFocoDeLaLista } from "./hooks"
import type { RolConClases } from "./types"

interface ListaDeClasesProps {
  rol: RolConClases
  // La nav que la contiene: a ella vuelve el foco si el control enfocado de la lista desaparece (T-07).
  navRef: RefObject<HTMLElement | null>
}

interface ContenedorDeLaListaProps {
  children: ReactNode
}

// Solo desde 768 px: la barra inferior de móvil conserva solo los destinos (§D-2D1).
function ContenedorDeLaLista({ children }: ContenedorDeLaListaProps) {
  return (
    <div
      data-lista-de-clases=""
      className="hidden min-h-0 w-full flex-1 flex-col gap-2 border-t border-t-(--glass-border) pt-3 md:flex"
    >
      {children}
    </div>
  )
}

// CLASES-02d (§D-2D1, DESIGN.md §7.4): la lista de clases del estudiante y del maestro, dentro de la
// misma nav. Cada clase es un enlace sin `end`, así que queda activo (aria-current="page") en
// cualquier página de la clase. El nombre completo es el nombre accesible y el `title`; el recorte es
// solo visual. Los datos salen de la consulta de la barra (services/clasesService.ts): este módulo
// no importa de features/. Estados: error (sin datos) → cargando → vacío (nada: el inicio ya tiene su
// vacío) → datos. Una recarga fallida con datos conserva la lista.
export function ListaDeClases({ rol, navRef }: ListaDeClasesProps) {
  const clases = useClasesDeLaBarra(rol)
  useFocoDeLaLista(navRef)

  // TanStack Query v5 vuelve a "pending" (isError false) al reintentar una consulta que nunca tuvo
  // datos; errorUpdateCount no se reinicia. Con él, «Reintentar» sigue montado (y conserva el foco)
  // con enEspera mientras pide, en lugar de desaparecer y mostrar «Cargando» en su lugar.
  if (clases.data === undefined && clases.errorUpdateCount > 0) {
    return (
      <ContenedorDeLaLista>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          enEspera={clases.isFetching}
          onClick={() => void clases.refetch()}
          className="h-auto flex-col gap-1 px-1 py-2 text-caption"
        >
          <span className="sr-only">{TEXTOS_MARCO.errorClases}</span>{" "}
          <RotateCw aria-hidden="true" className="size-4" />
          {TEXTOS_MARCO.reintentar}
        </Button>
      </ContenedorDeLaLista>
    )
  }

  if (clases.data === undefined) {
    return (
      <div role="status" className="sr-only">
        {TEXTOS_MARCO.cargandoClases}
      </div>
    )
  }

  if (clases.data.clases.length === 0) return null

  return (
    <ContenedorDeLaLista>
      <p aria-hidden="true" className="text-caption font-bold text-muted-foreground">
        {TEXTOS_MARCO.misClases}
      </p>
      <ul
        aria-label={TEXTOS_MARCO.misClases}
        className="sin-sombra-de-vidrio hidden min-h-0 flex-1 flex-col gap-1 overflow-x-hidden overflow-y-auto md:flex"
      >
        {clases.data.clases.map((clase) => (
          <li key={clase.id}>
            <NavLink
              to={`/${rol}/clases/${clase.id}`}
              title={clase.nombre}
              className={({ isActive }) =>
                cn(
                  "flex h-15 w-full flex-col items-center justify-center gap-1 rounded-row px-1 text-caption font-medium text-foreground transition-colors duration-150 hover:vidrio-fuerte focus-visible:-outline-offset-2 in-data-[material=opaco]:hover:bg-muted",
                  isActive &&
                    "vidrio-fuerte font-bold text-link in-data-[material=opaco]:bg-accent-soft",
                )
              }
            >
              <span
                aria-hidden="true"
                className={cn(
                  "vidrio-fuerte flex size-7 shrink-0 items-center justify-center rounded-row text-caption font-bold",
                  INSIGNIA_POR_VARIANTE[varianteDeClase(clase.id)],
                )}
              >
                {inicialesDe(clase.nombre)}
              </span>
              <span className="w-full truncate text-center">{clase.nombre}</span>
            </NavLink>
          </li>
        ))}
        {clases.data.hayMas && (
          <li>
            <Link
              to={`/${rol}`}
              className="flex h-10 w-full items-center justify-center rounded-row px-1 text-caption font-bold text-link hover:vidrio-fuerte focus-visible:-outline-offset-2 in-data-[material=opaco]:hover:bg-muted"
            >
              {TEXTOS_MARCO.verTodas}
            </Link>
          </li>
        )}
      </ul>
    </ContenedorDeLaLista>
  )
}
