import type { ComponentProps } from "react"

import { cn } from "@/lib/utils"

// AUTH-03b, §D-B9 (DESIGN.md §7.9): tabla densa del administrador, sobre una superficie opaca.
// Contenedor con desplazamiento horizontal propio: la tabla se desplaza, la página nunca.
function Table({ className, ...props }: ComponentProps<"table">) {
  return (
    <div className="w-full overflow-x-auto rounded-panel border border-border bg-surface">
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

function TableCell({ className, ...props }: ComponentProps<"td">) {
  return (
    <td
      data-slot="table-cell"
      className={cn("px-3 text-small text-foreground", className)}
      {...props}
    />
  )
}

export { Table, TableBody, TableCell, TableHead, TableHeader, TableRow }
