import type { VariantProps } from "class-variance-authority"
import { LoaderCircle } from "lucide-react"
import { Slot } from "radix-ui"
import type { ComponentProps, MouseEvent } from "react"

import { buttonVariants } from "@/components/ui/button-variants"
import { cn } from "@/lib/utils"

type PropiedadesEnEspera =
  { asChild?: false; enEspera?: boolean } | { asChild: true; enEspera?: never }

type ButtonProps = ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> &
  PropiedadesEnEspera

// Un botón con una petición en vuelo usa enEspera, nunca disabled: conserva el foco, sigue en el
// orden de tabulación y no dispara su acción (CLAUDE.md > Componentes; DESIGN-01a, D-5).
function Button({
  className,
  variant = "outline",
  size = "default",
  asChild = false,
  enEspera,
  onClick,
  children,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot.Root : "button"

  const manejarClic = (evento: MouseEvent<HTMLButtonElement>) => {
    if (enEspera) {
      evento.preventDefault()
      return
    }
    onClick?.(evento)
  }

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      data-en-espera={enEspera ? "" : undefined}
      aria-disabled={enEspera ? "true" : undefined}
      aria-busy={enEspera ? "true" : undefined}
      className={cn(buttonVariants({ variant, size, className }))}
      onClick={asChild ? onClick : manejarClic}
      {...props}
    >
      {asChild ? (
        children
      ) : (
        <>
          {enEspera ? (
            <LoaderCircle
              aria-hidden="true"
              className="size-4 animate-spin motion-reduce:animate-none"
            />
          ) : null}
          {children}
        </>
      )}
    </Comp>
  )
}

export { Button }
