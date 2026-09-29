import { cva, type VariantProps } from "class-variance-authority"
import type { ComponentProps, ReactNode } from "react"

import { cn } from "@/lib/utils"

// AUTH-03b, §D-B9 (DESIGN.md §7.8): insignia de estado, con icono opcional. C-16 (M-19): las
// variantes viven aquí, sin exportarse (no existe badge-variants.ts), para que V-13
// (frontend/src/styles/clases-r1.ataque.test.ts) siga vigilando el texto rojo de "danger" en este
// mismo archivo. Si otro archivo necesitara las variantes, detente (PA-06).
const badgeVariants = cva(
  "inline-flex w-fit items-center gap-1 rounded-pill px-2 py-1 text-caption font-bold [&_svg]:size-3.5 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        success: "bg-success-soft text-success",
        warning: "bg-warning-soft text-warning",
        danger: "bg-danger-soft text-danger",
        muted: "bg-muted text-muted-foreground",
      },
    },
    defaultVariants: { variant: "muted" },
  },
)

interface BadgeProps extends ComponentProps<"span">, VariantProps<typeof badgeVariants> {
  icon?: ReactNode
}

function Badge({ className, variant, icon, children, ...props }: BadgeProps) {
  return (
    <span data-slot="badge" className={cn(badgeVariants({ variant, className }))} {...props}>
      {icon}
      {children}
    </span>
  )
}

export { Badge }
