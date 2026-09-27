import { cva } from "class-variance-authority"

// Variante por defecto "outline" y acción principal "primary" (CLAUDE.md > Componentes).
// Sin anular el contorno por defecto ni usar el anillo de Tailwind: el foco es la regla global de
// index.css (DESIGN-01a, D-9).
export const buttonVariants = cva(
  "inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-pill text-small whitespace-nowrap transition-colors duration-150 disabled:pointer-events-none disabled:opacity-50 aria-busy:cursor-progress [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        primary:
          "bg-primary font-bold text-primary-foreground hover:bg-primary/90 focus-visible:-outline-offset-4 focus-visible:outline-primary-foreground",
        // En contexto opaco (administrador) el borde queda en --foreground (tinta), no en --input:
        // --input es el borde, más claro, de los campos (DESIGN.md, "Bordes", cierre de 01a).
        outline:
          "vidrio-fuerte font-bold text-foreground hover:bg-surface in-data-[material=opaco]:border-2 in-data-[material=opaco]:border-foreground in-data-[material=opaco]:hover:bg-muted",
        destructive:
          "bg-destructive font-bold text-destructive-foreground hover:bg-destructive/90 focus-visible:-outline-offset-4 focus-visible:outline-destructive-foreground",
        ghost:
          "border border-transparent font-bold text-foreground hover:vidrio-fuerte in-data-[material=opaco]:hover:bg-muted",
        link: "font-medium text-link underline-offset-4 hover:underline",
      },
      size: {
        default: "h-(--control-height) px-5",
        sm: "h-9 px-3",
        icon: "size-(--control-height)",
        "icon-sm": "size-9",
        enlace: "min-h-11 w-fit px-0",
      },
    },
    defaultVariants: {
      variant: "outline",
      size: "default",
    },
  },
)
