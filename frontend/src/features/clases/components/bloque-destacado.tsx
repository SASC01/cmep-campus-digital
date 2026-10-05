import type { ReactNode } from "react"

import { Cargando } from "@/components/cargando"
import { formatearFechaLarga } from "@/lib/format"

import { siguientePasoInicio, titularInicio } from "../lib"
import type { RolDeClases } from "../types"

// T-10 (ronda 1 del tester): error → cargando → titular, sin ternario anidado en el JSX.
const tituloDelBloque = (
  esError: boolean,
  errorTitular: string,
  cargando: boolean,
  total: number | undefined,
  rol: RolDeClases,
): string | null => {
  if (esError) return errorTitular
  if (cargando || total === undefined) return null
  return titularInicio(rol, total)
}

interface BloqueDestacadoProps {
  rol: RolDeClases
  nombre: string
  total: number | undefined
  cargando: boolean
  esError: boolean
  errorTitular: string
  // La tarjeta interna es opcional (§7.5): el maestro no la tiene desde CLASES-02, porque no crea
  // clases y no hay una acción principal que ofrecerle.
  insignia?: string
  tituloTarjeta?: string
  children?: ReactNode
}

// §D-A5, §7.5: el saludo depende solo de la sesión (se ve aunque falle la consulta de clases); el
// titular y el siguiente paso dependen de las clases del rol. Vidrio azul (único uso de la clase en
// CLASES-a, C-8 de la ronda 0), foco blanco por dentro para cualquier elemento fuera de la tarjeta
// interna (S-07; hoy ninguno).
//
// M-06 (ronda 4, revisión final del manager): sobre vidrio azul solo van blanco puro (--accent-foreground)
// y --accent-soft-glass (§3, §6, §7.2). El saludo, la fecha, el titular (dato o error) y el
// siguiente paso ya no heredan
// --foreground ni --muted-foreground; el siguiente paso deja de usar --accent-soft-glass como
// fondo (bg-accent-soft-glass), que es un color de texto, no de superficie. La tarjeta interna, de
// vidrio fuerte, conserva sus propios colores (--foreground, --muted-foreground): no la toca M-06.
//
// N-01 (ronda 4): maquetación según §7.5. Relleno fijo de 32 px arriba/abajo y 36 px a los lados
// (antes 24 y 32, con "sm:"); la tarjeta interna pasa a la derecha desde 640 px (antes siempre
// debajo del texto).
export function BloqueDestacado({
  rol,
  nombre,
  total,
  cargando,
  esError,
  errorTitular,
  insignia,
  tituloTarjeta,
  children,
}: BloqueDestacadoProps) {
  const titulo = tituloDelBloque(esError, errorTitular, cargando, total, rol)

  return (
    <section className="flex flex-col gap-6 rounded-hero vidrio-azul px-9 py-8 sm:flex-row sm:items-start sm:justify-between sm:gap-8">
      <div className="flex flex-col gap-3 sm:flex-1">
        {/* T-12 (ronda 2 del tester, revisión de H-6): un nombre de sesión de 120 caracteres sin
            espacios se saldría de este bloque de columnas flex (no es una rejilla, pero el texto
            sin cortar tampoco se ajusta); se cubre con la misma regla de corte que el resto. */}
        <div className="flex flex-wrap items-baseline gap-x-2 text-small text-accent-soft-glass">
          <span className="wrap-anywhere">{`Hola, ${nombre}`}</span>
          <span aria-hidden="true">·</span>
          <span>{formatearFechaLarga(new Date())}</span>
        </div>

        {titulo === null ? (
          <Cargando />
        ) : (
          <h1 className="text-display-compacto text-accent-foreground sm:text-display">{titulo}</h1>
        )}

        {!esError && total !== undefined && (
          <p className="text-body text-accent-soft-glass">{siguientePasoInicio(rol, total)}</p>
        )}
      </div>

      {children !== undefined && (
        <div className="flex w-full flex-col gap-3 rounded-panel vidrio-fuerte p-6 sm:w-80">
          <span className="text-caption font-bold text-muted-foreground uppercase">{insignia}</span>
          {tituloTarjeta && <h2 className="text-h3">{tituloTarjeta}</h2>}
          {children}
        </div>
      )}
    </section>
  )
}
