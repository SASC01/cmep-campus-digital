import { LogOut } from "lucide-react"

import { AvatarUsuario } from "@/components/avatar-usuario"
import { Button } from "@/components/ui/button"

import { NOMBRE_PRODUCTO, TEXTOS_MARCO } from "./data"

interface BarraSuperiorProps {
  nombre: string
  etiquetaRol: string
  onCerrarSesion: () => void
  cerrando: boolean
}

// Sin botón de avisos (llega con notificaciones). Nombre y rol, avatar y "Cerrar sesión" se
// reducen por debajo de 640 px (S-12): el nombre accesible de "Cerrar sesión" no cambia.
export function BarraSuperior({
  nombre,
  etiquetaRol,
  onCerrarSesion,
  cerrando,
}: BarraSuperiorProps) {
  return (
    <header className="vidrio flex h-16 items-center justify-between gap-3 rounded-bar pr-3 pl-6">
      <p className="font-heading text-h3 font-bold">
        <span>{NOMBRE_PRODUCTO.sigla}</span>{" "}
        <span className="text-brand">{NOMBRE_PRODUCTO.nombre}</span>
      </p>
      <div className="flex items-center gap-3">
        <p className="flex flex-col text-right text-small leading-tight max-sm:sr-only">
          <span className="font-medium">{nombre}</span>
          <span className="text-muted-foreground">{etiquetaRol}</span>
        </p>
        <AvatarUsuario nombre={nombre} className="max-sm:hidden" />
        <Button
          type="button"
          variant="outline"
          onClick={onCerrarSesion}
          enEspera={cerrando}
          className="max-sm:size-(--control-height) max-sm:px-0"
        >
          <LogOut aria-hidden="true" />
          <span className="max-sm:sr-only">{TEXTOS_MARCO.cerrarSesion}</span>
        </Button>
      </div>
    </header>
  )
}
