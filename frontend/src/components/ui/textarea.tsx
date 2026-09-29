import type { ComponentProps } from "react"

import { cn } from "@/lib/utils"

// AUTH-03c, §D-C8: el mismo borde, fondo, foco y estado inválido que Input; solo cambia la altura
// (por filas, no fija) y que se puede redimensionar en vertical.
function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "w-full min-w-0 resize-y rounded-row border border-input bg-surface px-3 py-2 text-body text-foreground transition-colors duration-150 selection:bg-primary selection:text-primary-foreground placeholder:text-muted-foreground focus-visible:border-accent disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive",
        className,
      )}
      {...props}
    />
  )
}

export { Textarea }
