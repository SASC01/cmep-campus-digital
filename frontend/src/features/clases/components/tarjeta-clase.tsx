import { Link } from "react-router"

import { cn } from "@/lib/utils"

import { CLASES_POR_VARIANTE } from "../data"
import { varianteDeClase } from "../lib"

interface TarjetaClaseProps {
  claseId: string
  nombre: string
  metadatos: string
  destino: string
}

// S-06, S-07: la variante de color se deriva del id, sin guardarse ni elegirse. Foco blanco por
// dentro en las variantes de color; en la blanca, el foco global de --ring por fuera (solo con la
// utilidad focus-visible, sin ninguna otra utilidad de foco ni el anillo de Tailwind).
export function TarjetaClase({ claseId, nombre, metadatos, destino }: TarjetaClaseProps) {
  const variante = varianteDeClase(claseId)
  return (
    <Link
      to={destino}
      aria-label={nombre}
      className={cn(
        "vidrio-fuerte flex min-h-26 flex-col justify-center gap-1 rounded-card p-5 transition-colors duration-150",
        CLASES_POR_VARIANTE[variante].fondo,
      )}
    >
      {/* T-08 (ronda 1 del tester): un nombre largo o sin espacios se recorta a 2 líneas
          (line-clamp-2) y rompe en cualquier punto (wrap-anywhere) en vez de desbordar la tarjeta. */}
      <span className="line-clamp-2 wrap-anywhere text-h3 font-bold">{nombre}</span>
      {/* T-12 (ronda 2 del tester): el nombre del maestro también puede llegar sin espacios; la
          tarjeta es un elemento de la rejilla de PanelMisClases y su ancho mínimo era el de este
          texto sin cortar. */}
      <span className={cn("wrap-anywhere text-small", CLASES_POR_VARIANTE[variante].metadatos)}>
        {metadatos}
      </span>
    </Link>
  )
}
