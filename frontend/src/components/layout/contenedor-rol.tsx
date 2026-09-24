import { LogOut } from "lucide-react"
import { Outlet } from "react-router"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

import type { Rol } from "./types"

interface ContenedorRolProps {
  rol: Rol
  nombre: string
  etiquetaRol: string
  onCerrarSesion: () => void
  cerrando: boolean
}

// Densidad por rol (CLAUDE.md): estudiante ligera, maestro intermedia, admin densa.
// Único punto donde se decide el espaciado base de cada rol.
const ESPACIADO_POR_ROL: Record<Rol, string> = {
  estudiante: "gap-8",
  maestro: "gap-6",
  admin: "gap-4",
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
  return (
    <div
      data-rol={rol}
      className={cn(
        "flex min-h-svh flex-col bg-background text-foreground",
        ESPACIADO_POR_ROL[rol],
      )}
    >
      <nav
        aria-label="Navegación principal"
        className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3"
      >
        <span className="font-heading font-semibold tracking-tight">Campus Digital</span>
        <div className="flex items-center gap-3">
          <p className="flex flex-col text-right text-sm leading-tight">
            <span className="font-medium">{nombre}</span>
            <span className="text-muted-foreground">{etiquetaRol}</span>
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onCerrarSesion}
            disabled={cerrando}
            aria-busy={cerrando}
          >
            <LogOut aria-hidden="true" />
            Cerrar sesión
          </Button>
        </div>
      </nav>
      <main className="flex-1 px-4 py-6">
        <Outlet />
      </main>
    </div>
  )
}
