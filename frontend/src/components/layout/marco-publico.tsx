import type { ReactNode } from "react"

import { PieDePagina } from "./pie-de-pagina"

interface MarcoPublicoProps {
  children: ReactNode
}

// Pantallas sin rol (§D-4): login, registro, recuperar, restablecer, establecer, diagnóstico,
// /cambiar-contrasena y /acceso-restringido (salvo la rama del Navigate, E-6). El pie queda al
// final de la ventana sin forzar desplazamiento.
export function MarcoPublico({ children }: MarcoPublicoProps) {
  return (
    <div className="flex min-h-svh flex-col">
      <div className="flex flex-1 flex-col">{children}</div>
      <div className="px-4 pb-4 lg:px-12 lg:pb-8">
        <PieDePagina />
      </div>
    </div>
  )
}
