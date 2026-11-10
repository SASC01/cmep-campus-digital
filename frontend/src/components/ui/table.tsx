import type { ComponentProps } from "react"

import { cn } from "@/lib/utils"

// AUTH-03b, §D-B9 (DESIGN.md §7.9): tabla densa del administrador, sobre una superficie opaca.
// Contenedor con desplazamiento horizontal propio: la tabla se desplaza, la página nunca.
// H6-1 (ADMIN-01, comprobación humana): `relative` hace del contenedor el bloque contenedor de los
// textos sr-only (position: absolute) de las celdas; sin él, su bloque contenedor quedaba fuera, el
// desplazamiento no los recortaba y ensanchaban el documento a 360 px.
function Table({ className, ...props }: ComponentProps<"table">) {
  return (
    <div className="relative w-full overflow-x-auto rounded-panel border border-border bg-surface">
      <table
        data-slot="table"
        className={cn("w-full caption-bottom text-small", className)}
        {...props}
      />
    </div>
  )
}

function TableHeader({ className, ...props }: ComponentProps<"thead">) {
  return <thead data-slot="table-header" className={cn("bg-muted", className)} {...props} />
}

function TableBody({ className, ...props }: ComponentProps<"tbody">) {
  return <tbody data-slot="table-body" className={className} {...props} />
}

function TableRow({ className, ...props }: ComponentProps<"tr">) {
  return (
    <tr
      data-slot="table-row"
      className={cn("h-10 border-b border-border last:border-0", className)}
      {...props}
    />
  )
}

function TableHead({ className, ...props }: ComponentProps<"th">) {
  return (
    <th
      data-slot="table-head"
      className={cn("px-3 text-left text-caption font-bold text-muted-foreground", className)}
      {...props}
    />
  )
}

// H6-2 (ADMIN-01, arbitraje del manager): una insignia dentro de una celda no se parte; la tabla encoge
// la columna hasta su ancho mínimo y la partía (una sílaba por línea bajo un wrap-anywhere). Dentro de
// la tabla, nowrap no ensancha la página: el contenedor desplaza y recorta (H6-1).
function TableCell({ className, ...props }: ComponentProps<"td">) {
  return (
    <td
      data-slot="table-cell"
      className={cn(
        "px-3 text-small text-foreground [&_[data-slot=badge]]:whitespace-nowrap",
        className,
      )}
      {...props}
    />
  )
}

export { Table, TableBody, TableCell, TableHead, TableHeader, TableRow }
