import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatearFechaHora } from "@/lib/format"

import { TEXTOS_MOVIMIENTOS } from "../data"
import type { MovimientoInscripcion } from "../types"

interface TablaMovimientosProps {
  movimientos: readonly MovimientoInscripcion[]
}

// ADMIN-01g (§D-7.7, §D-11, DESIGN.md §7.9): el registro de altas y bajas de inscripción, del más reciente
// al más antiguo, de solo lectura. "Hecho por" es la firma que manda el servidor (la administración sale
// con su nombre institucional, RN-07).
export function TablaMovimientos({ movimientos }: TablaMovimientosProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{TEXTOS_MOVIMIENTOS.columnas.fecha}</TableHead>
          <TableHead>{TEXTOS_MOVIMIENTOS.columnas.clase}</TableHead>
          <TableHead>{TEXTOS_MOVIMIENTOS.columnas.alumno}</TableHead>
          <TableHead>{TEXTOS_MOVIMIENTOS.columnas.movimiento}</TableHead>
          <TableHead>{TEXTOS_MOVIMIENTOS.columnas.hechoPor}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {movimientos.map((movimiento) => (
          <TableRow key={movimiento.id} data-movimiento-id={movimiento.id}>
            <TableCell>{formatearFechaHora(movimiento.creadoEn)}</TableCell>
            <TableCell className="wrap-anywhere">{movimiento.clase.nombre}</TableCell>
            <TableCell className="wrap-anywhere">{movimiento.alumno.nombre}</TableCell>
            <TableCell>{TEXTOS_MOVIMIENTOS.tipos[movimiento.tipo]}</TableCell>
            <TableCell className="wrap-anywhere">{movimiento.actor.nombre}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
