import { ChevronDown } from "lucide-react"
import type { ComponentProps } from "react"

import { cn } from "@/lib/utils"

// TAREAS-01d (A-12): el native-select de shadcn reestilizado con los tokens. Es un <select> nativo
// (el menú abierto lo dibuja el sistema, así que funciona con teclado, lectores de pantalla y en el
// teléfono sin más código) con el mismo borde, fondo, altura, foco y estado inválido que Input; el
// chevron es decorativo. Sin dependencias nuevas.
function NativeSelect({ className, children, ...props }: ComponentProps<"select">) {
  return (
    <div data-slot="native-select-wrapper" className="relative w-full min-w-0">
      <select
        data-slot="native-select"
        className={cn(
          "h-(--control-height) w-full min-w-0 cursor-pointer appearance-none rounded-row border border-input bg-surface pr-10 pl-3 text-body text-foreground transition-colors duration-150 selection:bg-primary selection:text-primary-foreground focus-visible:border-accent disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive",
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-foreground"
      />
    </div>
  )
}

function NativeSelectOption({ className, ...props }: ComponentProps<"option">) {
  return (
    <option
      data-slot="native-select-option"
      className={cn("text-foreground", className)}
      {...props}
    />
  )
}

export { NativeSelect, NativeSelectOption }
