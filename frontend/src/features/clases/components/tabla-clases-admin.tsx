import { Link } from "react-router"

import { buttonVariants } from "@/components/ui/button-variants"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

import { TEXTOS_CLASES_ADMIN } from "../data"
import { formatearFechaDeClase } from "../lib"
import type { ClaseAdmin } from "../types"

interface TablaClasesAdminProps {
  clases: readonly ClaseAdmin[]
}

// §D-2C2, DESIGN.md §7.9: la tabla institucional de clases, opaca y densa (el contexto lo da el
// marco del administrador). "Alumnos" a la derecha con cifras tabulares; "Abrir" lleva el nombre
// de la clase como texto sr-only (nunca aria-label). Sin botones con petición: no lleva enEspera.
export function TablaClasesAdmin({ clases }: TablaClasesAdminProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{TEXTOS_CLASES_ADMIN.columnas.clase}</TableHead>
          <TableHead>{TEXTOS_CLASES_ADMIN.columnas.maestros}</TableHead>
          <TableHead className="text-right">{TEXTOS_CLASES_ADMIN.columnas.alumnos}</TableHead>
          <TableHead>{TEXTOS_CLASES_ADMIN.columnas.creada}</TableHead>
          <TableHead>{TEXTOS_CLASES_ADMIN.columnas.acciones}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {clases.map((clase) => (
          <TableRow key={clase.id} data-clase-id={clase.id}>
            <TableCell className="wrap-anywhere font-bold">{clase.nombre}</TableCell>
            <TableCell className="wrap-anywhere">
              {clase.maestros.map((maestro) => maestro.nombre).join(", ")}
            </TableCell>
            <TableCell className="text-right tabular-nums">{clase.alumnos}</TableCell>
            <TableCell>{formatearFechaDeClase(clase.creadoEn)}</TableCell>
            <TableCell>
              <Link
                to={`/admin/clases/${clase.id}`}
                className={buttonVariants({ variant: "outline", size: "sm" })}
              >
                {TEXTOS_CLASES_ADMIN.abrir} <span className="sr-only">{clase.nombre}</span>
              </Link>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
