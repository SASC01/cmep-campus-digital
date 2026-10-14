import { useRef, type ReactNode } from "react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatearPorcentaje, formatearPuntos } from "@/lib/format"

import { TEXTOS_CALCULO, TEXTOS_MIS_CALIFICACIONES } from "../data"
import type { CalificacionGeneral } from "../types"

interface CalculoDeCalificacionProps {
  general: CalificacionGeneral
  // Al cerrarse sin "Ver cálculo" en el documento (la vista se reemplazó con el diálogo abierto).
  alCerrarSinBoton: () => void
}

interface DetalleDelCalculoProps {
  general: CalificacionGeneral
}

// El texto de un porcentaje que puede faltar ("—").
const porcentajeODato = (valor: number | null): string =>
  valor === null ? TEXTOS_CALCULO.sinDato : formatearPorcentaje(valor)

// Lo que explica el modal, según el modo y lo que cuenta (RF-18).
function DetalleDelCalculo({ general }: DetalleDelCalculoProps) {
  const notaSinCategoria: ReactNode =
    general.sinCategoria.tareas > 0 ? (
      <p className="text-small">{TEXTOS_CALCULO.sinCategoria(general.sinCategoria.tareas)}</p>
    ) : null

  if (general.porcentaje === null) {
    return (
      <>
        <DialogDescription>{TEXTOS_CALCULO.nada}</DialogDescription>
        {notaSinCategoria}
      </>
    )
  }

  if (general.modo === "puntos") {
    return (
      <>
        <DialogDescription>{TEXTOS_CALCULO.modoPuntos}</DialogDescription>
        <p className="font-bold tabular-nums">
          {TEXTOS_CALCULO.obtuviste(
            formatearPuntos(general.puntos.obtenido),
            formatearPuntos(general.puntos.posible),
            formatearPorcentaje(general.porcentaje),
          )}
        </p>
      </>
    )
  }

  return (
    <>
      <DialogDescription>{TEXTOS_CALCULO.reparto}</DialogDescription>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead scope="col">{TEXTOS_CALCULO.categoria}</TableHead>
            <TableHead scope="col" className="text-right">
              {TEXTOS_CALCULO.peso}
            </TableHead>
            <TableHead scope="col" className="text-right">
              {TEXTOS_CALCULO.pesoQueCuenta}
            </TableHead>
            <TableHead scope="col" className="text-right">
              {TEXTOS_CALCULO.tuPorcentaje}
            </TableHead>
            <TableHead scope="col" className="text-right">
              {TEXTOS_CALCULO.tareasCalificadas}
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {general.categorias.map((categoria) => (
            <TableRow key={categoria.id}>
              <TableCell className="wrap-anywhere">{categoria.nombre}</TableCell>
              <TableCell className="text-right tabular-nums">
                {formatearPorcentaje(categoria.peso)}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {porcentajeODato(categoria.pesoEfectivo)}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {porcentajeODato(categoria.porcentaje)}
              </TableCell>
              <TableCell className="text-right tabular-nums">{categoria.tareas}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {notaSinCategoria}
      <p className="font-bold tabular-nums">
        {TEXTOS_CALCULO.general(formatearPorcentaje(general.porcentaje))}
      </p>
    </>
  )
}

// §D-13.5 (RF-18; excepción de modal del PRD y de CLAUDE.md): "Ver cálculo" y el modal "Cálculo de tu
// calificación". El contenido va en el portal de DialogContent (la capa flotante opaca, DESIGN.md
// §7.11), así que nada fijo queda dentro del panel de la vista. Un solo control de cierre: "Cerrar" al
// pie, sin la equis de la esquina (N-10). El foco queda dentro; Escape y "Cerrar" lo cierran y el foco
// vuelve a "Ver cálculo". Si la vista se reemplaza con el diálogo abierto, el diálogo deja de pintarse
// y quien lo usa recibe el foco (la raíz de la vista). Lee `general` de la caché: no pide nada.
export function CalculoDeCalificacion({ general, alCerrarSinBoton }: CalculoDeCalificacionProps) {
  const verCalculoRef = useRef<HTMLButtonElement>(null)

  const alCerrar = (evento: Event) => {
    if (verCalculoRef.current?.isConnected === true) return
    evento.preventDefault()
    alCerrarSinBoton()
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button ref={verCalculoRef} type="button" variant="outline" className="self-start">
          {TEXTOS_MIS_CALIFICACIONES.verCalculo}
        </Button>
      </DialogTrigger>
      <DialogContent showCloseButton={false} onCloseAutoFocus={alCerrar} className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{TEXTOS_CALCULO.titulo}</DialogTitle>
        </DialogHeader>
        <DetalleDelCalculo general={general} />
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">
              {TEXTOS_CALCULO.cerrar}
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
