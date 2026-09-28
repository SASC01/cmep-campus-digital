import { clsx, type ClassValue } from "clsx"
import { extendTailwindMerge } from "tailwind-merge"

// La escala de tokens.css reemplaza a la de Tailwind (DESIGN-01a): tailwind-merge necesita
// conocerla para no confundir, por ejemplo, "text-small" con un color.
const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      text: ["display", "h1", "h2", "h3", "body", "small", "caption"],
      radius: ["hero", "panel", "bar", "card", "row", "date", "pill"],
      shadow: ["overlay"],
    },
  },
})

export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs))
