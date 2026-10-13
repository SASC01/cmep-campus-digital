import { Link } from "react-router"

import { EstadoEntregaBadge } from "@/components/estado-entrega-badge"
import { buttonVariants } from "@/components/ui/button-variants"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { estadoDeEntregaVisible } from "@/lib/estado-de-entrega"
import { formatearFechaHora } from "@/lib/format"

import { TEXTOS_ENTREGAS } from "../data"
import { enlaceAEntregaDeAlumno } from "../lib"
import type { FilaDeEntrega } from "../types"

interface TablaDeEntregasProps {
  filas: readonly FilaDeEntrega[]
  // La fecha límite vigente de la tarea: sin entregar y vencida, la fila dice "Sin entregar".
  fechaLimite: string
  base: string
  tareaId: string
}

// ENTREGAS-01e (§D-10.2, DESIGN.md §7.26 y §8): la tabla de entregas de una tarea, opaca dentro del
// panel (Card) de la vista, como el roster del maestro, con filas de 48 px y botones de 36 px.
// Columnas: alumno, estado (con texto, EstadoEntregaBadge), fecha de entrega o "—" y "Ver entrega" con
// el nombre del alumno como texto sr-only. Cada fila lleva el id del alumno para que "Ver más alumnos"
// pueda llevar el foco a la primera fila nueva (§7.14).
export function TablaDeEntregas({ filas, fechaLimite, base, tareaId }: TablaDeEntregasProps) {
  const ahora = new Date()

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{TEXTOS_ENTREGAS.columnas.alumno}</TableHead>
          <TableHead>{TEXTOS_ENTREGAS.columnas.estado}</TableHead>
          <TableHead>{TEXTOS_ENTREGAS.columnas.entregada}</TableHead>
          <TableHead>{TEXTOS_ENTREGAS.columnas.acciones}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {filas.map((fila) => (
          <TableRow key={fila.alumno.id} className="h-12" data-entrega-de-alumno={fila.alumno.id}>
            <TableCell className="wrap-anywhere font-bold">{fila.alumno.nombre}</TableCell>
            <TableCell>
              <EstadoEntregaBadge estado={estadoDeEntregaVisible(fila, fechaLimite, ahora)} />
            </TableCell>
            <TableCell>
              {fila.fechaEntrega === null
                ? TEXTOS_ENTREGAS.sinFecha
                : formatearFechaHora(fila.fechaEntrega)}
            </TableCell>
            <TableCell>
              <Link
                to={enlaceAEntregaDeAlumno(base, tareaId, fila.alumno.id)}
                className={buttonVariants({ variant: "outline", size: "sm" })}
              >
                {TEXTOS_ENTREGAS.verEntrega} <span className="sr-only">{fila.alumno.nombre}</span>
              </Link>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
