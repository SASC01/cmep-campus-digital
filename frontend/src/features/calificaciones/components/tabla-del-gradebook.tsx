import { TriangleAlert } from "lucide-react"
import { Link } from "react-router"

import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatearPorcentaje, formatearPuntos } from "@/lib/format"

import { TEXTOS_GRADEBOOK } from "../data"
import { enlaceAEntregaDeAlumno, textoDeCelda, textoDeMotivos } from "../lib"
import type { GradebookRespuesta } from "../types"

interface TablaDelGradebookProps {
  tareas: GradebookRespuesta["tareas"]
  alumnos: GradebookRespuesta["alumnos"]
}

// §D-13.3 (RF-37, DESIGN.md §7.28): la tabla opaca del gradebook (§7.9), con su caption para el
// lector de pantalla. Filas: alumnos; columnas: las tareas de la ventana, con el título (dos líneas
// como máximo), "de N puntos" y la categoría. Cada celda es un enlace a la entrega de ese alumno en esa
// tarea (relativo a la clase, S-14) con el texto de la celda y, para el lector, "<alumno>, <tarea>". Al
// final, el promedio y el riesgo con su insignia y su motivo en texto. Filas de 48 px, cifras tabulares
// a la derecha. La tabla se desplaza dentro de su contenedor; la página nunca. La columna del alumno
// (también su encabezado) se queda a la izquierda al desplazarla, con el fondo --surface para que las
// celdas no se vean debajo.
export function TablaDelGradebook({ tareas, alumnos }: TablaDelGradebookProps) {
  const ahora = new Date()

  return (
    <Table>
      <caption className="sr-only">{TEXTOS_GRADEBOOK.caption}</caption>
      <TableHeader>
        <TableRow>
          <TableHead scope="col" className="sticky left-0 bg-surface">
            {TEXTOS_GRADEBOOK.alumno}
          </TableHead>
          {tareas.map((tarea) => (
            <TableHead key={tarea.id} scope="col" className="min-w-36 py-2 align-bottom">
              <span className="line-clamp-2 wrap-anywhere text-foreground">{tarea.titulo}</span>
              <span className="block font-medium">
                {TEXTOS_GRADEBOOK.dePuntos(formatearPuntos(tarea.puntos))}
              </span>
              <span className="block font-medium wrap-anywhere">
                {tarea.categoria?.nombre ?? TEXTOS_GRADEBOOK.sinCategoria}
              </span>
            </TableHead>
          ))}
          <TableHead scope="col" className="text-right">
            {TEXTOS_GRADEBOOK.promedio}
          </TableHead>
          <TableHead scope="col">{TEXTOS_GRADEBOOK.riesgo}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {alumnos.map((fila) => (
          <TableRow key={fila.alumno.id} className="h-12">
            <TableCell className="sticky left-0 max-w-48 bg-surface font-bold wrap-anywhere">
              {fila.alumno.nombre}
            </TableCell>
            {tareas.map((tarea, indice) => {
              const celda = fila.celdas[indice]
              if (celda === undefined) return <TableCell key={tarea.id} />
              const texto = textoDeCelda(celda, tarea.fechaLimite, ahora)
              return (
                <TableCell key={tarea.id} className="text-right tabular-nums">
                  <Link
                    to={enlaceAEntregaDeAlumno(tarea.id, fila.alumno.id)}
                    relative="path"
                    className="text-link underline-offset-4 hover:underline"
                  >
                    <span aria-hidden={texto.soloLector === null ? undefined : true}>
                      {texto.visible}
                    </span>
                    {texto.soloLector !== null && (
                      <span className="sr-only">{texto.soloLector}</span>
                    )}{" "}
                    <span className="sr-only">
                      {TEXTOS_GRADEBOOK.celdaDe(fila.alumno.nombre, tarea.titulo)}
                    </span>
                  </Link>
                  {texto.conRetraso && (
                    <span className="block text-small text-muted-foreground">
                      {TEXTOS_GRADEBOOK.conRetraso}
                    </span>
                  )}
                </TableCell>
              )
            })}
            <TableCell className="text-right tabular-nums">
              {fila.porcentaje === null
                ? TEXTOS_GRADEBOOK.sinDato
                : formatearPorcentaje(fila.porcentaje)}
            </TableCell>
            <TableCell className="py-2">
              {fila.motivosDeRiesgo.length === 0 ? (
                TEXTOS_GRADEBOOK.sinDato
              ) : (
                <div className="flex flex-col gap-1">
                  <Badge variant="warning" icon={<TriangleAlert aria-hidden="true" />}>
                    {TEXTOS_GRADEBOOK.enRiesgo}
                  </Badge>
                  <span className="text-small text-muted-foreground">
                    {textoDeMotivos(fila.motivosDeRiesgo)}
                  </span>
                </div>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
