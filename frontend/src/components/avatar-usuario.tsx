import { inicialesDe } from "@/lib/format"
import { cn } from "@/lib/utils"

interface AvatarUsuarioProps {
  nombre: string
  className?: string
}

// Decorativo (aria-hidden): el nombre completo ya va como texto al lado (§D-3).
export function AvatarUsuario({ nombre, className }: AvatarUsuarioProps) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex size-11 shrink-0 items-center justify-center rounded-full bg-accent text-small font-bold text-accent-foreground",
        className,
      )}
    >
      {inicialesDe(nombre)}
    </span>
  )
}
