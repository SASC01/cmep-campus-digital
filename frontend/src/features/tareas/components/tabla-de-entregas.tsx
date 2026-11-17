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
import type { FilaDeEntrega, TextosDeLaTablaDeEntregas } from "../types"

interface TablaDeEntregasProps {
  filas: readonly FilaDeEntrega[]
  // La fecha límite vigente de la tarea: sin entregar y vencida, la fila dice "Sin entregar".
  fechaLimite: string
  base: string
  tareaId: string
  // FORO-01e (§D-8.5): «Participantes» usa la tabla con los textos del foro y el enlace a la participación
  // de cada alumno. Sin ellos, los de la entrega de una tarea, como hoy.
  textos?: TextosDeLaTablaDeEntregas
  destinoDeFila?: (alumnoId: string) => string
}

// ENTREGAS-01e (§D-10.2, DESIGN.md §7.26 y §8): la tabla de entregas de una tarea, opaca dentro del
// panel (Card) de la vista, como el roster del maestro, con filas de 48 px y botones de 36 px.
// Columnas: alumno, estado (con texto, EstadoEntregaBadge), fecha de entrega o "—" y "Ver entrega" con
// el nombre del alumno como texto sr-only. Cada fila lleva el id del alumno para que "Ver más alumnos"
// pueda llevar el foco a la primera fila nueva (§7.14).
export function TablaDeEntregas({
  filas,
  fechaLimite,
  base,
  tareaId,
  textos = TEXTOS_ENTREGAS,
  destinoDeFila = (alumnoId) => enlaceAEntregaDeAlumno(base, tareaId, alumnoId),
}: TablaDeEntregasProps) {
  const ahora = new Date()

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{textos.columnas.alumno}</TableHead>
          <TableHead>{textos.columnas.estado}</TableHead>
          <TableHead>{textos.columnas.entregada}</TableHead>
          <TableHead>{textos.columnas.acciones}</TableHead>
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
              {fila.fechaEntrega === null ? textos.sinFecha : formatearFechaHora(fila.fechaEntrega)}
            </TableCell>
            <TableCell>
              <Link
                to={destinoDeFila(fila.alumno.id)}
                className={buttonVariants({ variant: "outline", size: "sm" })}
              >
                {textos.verEntrega} <span className="sr-only">{fila.alumno.nombre}</span>
              </Link>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
