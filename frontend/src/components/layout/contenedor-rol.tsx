import { Outlet } from "react-router"

import { cn } from "@/lib/utils"

import { BarraNavegacion } from "./barra-navegacion"
import { BarraSuperior } from "./barra-superior"
import { CONTEXTO_POR_ROL, DESTINOS_POR_ROL, ESPACIADO_POR_ROL } from "./data"
import { PieDePagina } from "./pie-de-pagina"
import type { Rol } from "./types"

interface ContenedorRolProps {
  rol: Rol
  nombre: string
  etiquetaRol: string
  onCerrarSesion: () => void
  cerrando: boolean
}

// No importa nada de features/: nombre, etiqueta del rol y cierre de sesión llegan por props desde
// la guarda de rol (app/require-rol.tsx).
export function ContenedorRol({
  rol,
  nombre,
  etiquetaRol,
  onCerrarSesion,
  cerrando,
}: ContenedorRolProps) {
  const contexto = CONTEXTO_POR_ROL[rol]

  return (
    <div
      data-rol={rol}
      data-material={contexto.material}
      data-densidad={contexto.densidad}
      className="min-h-svh p-4 pb-24 text-foreground md:grid md:grid-cols-[6rem_minmax(0,1fr)] md:gap-5 md:p-6"
    >
      <BarraNavegacion rol={rol} destinos={DESTINOS_POR_ROL[rol]} />
      <div
        className={cn(
          "flex min-h-[calc(100svh-7rem)] min-w-0 flex-col md:min-h-[calc(100svh-3rem)]",
          ESPACIADO_POR_ROL[rol],
        )}
      >
        <BarraSuperior
          nombre={nombre}
          etiquetaRol={etiquetaRol}
          onCerrarSesion={onCerrarSesion}
          cerrando={cerrando}
        />
        <main className="flex-1">
          <Outlet />
        </main>
        <PieDePagina />
      </div>
    </div>
  )
}
