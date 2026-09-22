import { Outlet } from "react-router"

import { cn } from "@/lib/utils"

import type { Rol } from "./types"

interface ContenedorRolProps {
  rol: Rol
}

// Densidad por rol (CLAUDE.md): estudiante ligera, maestro intermedia, admin densa.
// Único punto donde se decide el espaciado base de cada rol.
const ESPACIADO_POR_ROL: Record<Rol, string> = {
  estudiante: "gap-8",
  maestro: "gap-6",
  admin: "gap-4",
}

export function ContenedorRol({ rol }: ContenedorRolProps) {
  return (
    <div
      data-rol={rol}
      className={cn(
        "flex min-h-svh flex-col bg-background text-foreground",
        ESPACIADO_POR_ROL[rol],
      )}
    >
      <nav aria-label="Navegación principal" className="border-b border-border px-4 py-3">
        <span className="font-heading font-semibold tracking-tight">Campus Digital</span>
      </nav>
      <main className="flex-1 px-4 py-6">
        <Outlet />
      </main>
    </div>
  )
}
