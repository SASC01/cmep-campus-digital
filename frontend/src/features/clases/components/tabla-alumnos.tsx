import { useEffect, useRef, useState, type ReactNode } from "react"
import { toast } from "sonner"

import { AccesoRestringidoBadge } from "@/components/acceso-restringido-badge"
import { Cargando } from "@/components/cargando"
import { EstadoPagoBadge } from "@/components/estado-pago-badge"
import { EstadoVacio } from "@/components/estado-vacio"
import { MensajeError } from "@/components/mensaje-error"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatearFechaHora } from "@/lib/format"

import { TEXTOS_TABLA_ALUMNOS } from "../data"
import { useAlumnos, useFilaEnFoco, useFocoAlCargarMas, useQuitarAlumno } from "../hooks"
import { focoPerdido, mensajeDeErrorClases } from "../lib"
import type { AlumnoDeClase } from "../types"

interface FilaAlumnoProps {
  claseId: string
  alumno: AlumnoDeClase
  // La tabla guarda el "Quitar" de cada fila para poder llevar el foco a una fila vecina cuando
  // otra desaparece (T-21).
  registrarQuitar: (id: string, nodo: HTMLButtonElement | null) => void
}

// §D-B4, DESIGN.md §7.14: confirmación en línea en la misma fila. Al pedirla, el foco va a
// "Cancelar" (nunca a la acción destructiva) y, al cancelar, vuelve a "Quitar". Se compara contra el
// valor de "confirmando" que el efecto ya procesó para que el doble montaje de StrictMode no repita
// el movimiento de foco (mismo patrón que FilaEnlace de features/admin). El nombre accesible de cada
// botón suma el nombre del alumno como texto sr-only (§7.9), nunca aria-label.
function FilaAlumno({ claseId, alumno, registrarQuitar }: FilaAlumnoProps) {
  const [confirmando, setConfirmando] = useState(false)
  const quitar = useQuitarAlumno(claseId)
  const quitarBtnRef = useRef<HTMLButtonElement | null>(null)
  const cancelarBtnRef = useRef<HTMLButtonElement>(null)
  const confirmandoAnteriorRef = useRef(confirmando)

  useEffect(() => {
    if (confirmandoAnteriorRef.current === confirmando) return
    confirmandoAnteriorRef.current = confirmando
    if (confirmando) {
      cancelarBtnRef.current?.focus()
      return
    }
    quitarBtnRef.current?.focus()
  }, [confirmando])

  const handleQuitar = () => {
    quitar.mutate(alumno.id, {
      // T-21: la fila desaparece cuando llegan los datos nuevos, así que aquí no se mueve el foco
      // (enfocar este mismo "Quitar" lo dejaba en <body> al desmontarse); la tabla lo lleva a la
      // fila vecina cuando la fila ya no está.
      onSuccess: () => {
        toast.success(TEXTOS_TABLA_ALUMNOS.quitado(alumno.nombre))
      },
      onError: (error) => toast.error(mensajeDeErrorClases(error)),
    })
  }

  return (
    <TableRow className="h-12" data-alumno-id={alumno.id}>
      <TableCell className="wrap-anywhere font-bold">{alumno.nombre}</TableCell>
      <TableCell className="wrap-anywhere">{alumno.email}</TableCell>
      <TableCell>
        <EstadoPagoBadge estado={alumno.estadoPago} />
      </TableCell>
      <TableCell>
        {alumno.accesoRestringido ? (
          <AccesoRestringidoBadge />
        ) : (
          TEXTOS_TABLA_ALUMNOS.sinRestriccion
        )}
      </TableCell>
      <TableCell>{formatearFechaHora(alumno.inscritoEn)}</TableCell>
      <TableCell>
        {!confirmando && (
          <Button
            ref={(nodo) => {
              quitarBtnRef.current = nodo
              registrarQuitar(alumno.id, nodo)
            }}
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setConfirmando(true)}
          >
            {TEXTOS_TABLA_ALUMNOS.quitar} <span className="sr-only">{alumno.nombre}</span>
          </Button>
        )}
        {confirmando && (
          <div className="flex flex-col gap-2 py-2">
            <p className="text-small">{TEXTOS_TABLA_ALUMNOS.confirmarQuitar}</p>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={handleQuitar}
                enEspera={quitar.isPending}
              >
                {TEXTOS_TABLA_ALUMNOS.siQuitar} <span className="sr-only">{alumno.nombre}</span>
              </Button>
              <Button
                ref={cancelarBtnRef}
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setConfirmando(false)}
              >
                {TEXTOS_TABLA_ALUMNOS.cancelar} <span className="sr-only">{alumno.nombre}</span>
              </Button>
            </div>
          </div>
        )}
      </TableCell>
    </TableRow>
  )
}

interface TablaAlumnosProps {
  claseId: string
}

// §D-B4, DESIGN.md §8: el roster del maestro es una tabla opaca dentro de un panel de vidrio, con
// filas de 48 px y botones de 36 px. Correo completo, estado de pago y restricción de acceso (RF-39).
export function TablaAlumnos({ claseId }: TablaAlumnosProps) {
  const alumnos = useAlumnos(claseId)
  const encabezadoRef = useRef<HTMLHeadingElement>(null)
  const botonesQuitar = useRef(new Map<string, HTMLButtonElement>())
  const filaEnFocoRef = useFilaEnFoco("data-alumno-id")
  const idsPrevios = useRef<string[] | undefined>(undefined)
  const filas = alumnos.data?.pages.flatMap((pagina) => pagina.alumnos)

  const registrarQuitar = (id: string, nodo: HTMLButtonElement | null) => {
    if (nodo === null) {
      botonesQuitar.current.delete(id)
      return
    }
    botonesQuitar.current.set(id, nodo)
  }

  // T-22 y T-23: la tabla recuerda por id qué fila tiene el foco (useFilaEnFoco), sin depender del
  // `onSuccess` de ninguna petición ni de la lista capturada al hacer clic.
  // T-21, T-22, T-23, DESIGN.md §7.14: después de cada render, si la fila que tenía el foco dejó de
  // tenerlo porque su control se desmontó (la fila salió de los datos, o la tabla se reemplazó por un
  // error o por el vacío), el foco va al "Quitar" de la fila que ocupa su lugar (la siguiente o, si
  // era la última, la anterior) y, si no hay ninguno, al encabezado del panel. Nunca a <body>.
  useEffect(() => {
    const ids = filas?.map((alumno) => alumno.id)
    const previos = idsPrevios.current
    idsPrevios.current = ids
    const id = filaEnFocoRef.current
    if (id === null) return
    if (!focoPerdido(document)) return
    const indice = previos?.indexOf(id) ?? ids?.indexOf(id) ?? -1
    const vecina =
      ids === undefined || ids.length === 0
        ? undefined
        : ids[Math.min(Math.max(indice, 0), ids.length - 1)]
    const destino = vecina === undefined ? undefined : botonesQuitar.current.get(vecina)
    filaEnFocoRef.current = null
    if (destino === undefined) {
      encabezadoRef.current?.focus()
      return
    }
    destino.focus()
  })

  // T-26: "Ver más alumnos" se desmonta con el foco dentro al cargar la última página; el foco va al
  // "Quitar" de la primera fila nueva o, si no llegó ninguna, al encabezado del panel.
  const refVerMas = useFocoAlCargarMas(
    filas?.map((alumno) => alumno.id),
    (id) => {
      const boton = botonesQuitar.current.get(id)
      boton?.focus()
      return boton !== undefined
    },
    () => encabezadoRef.current?.focus(),
  )

  // Estados en orden: error → cargando → vacío → datos.
  const contenido = (): ReactNode => {
    if (alumnos.isError) return <MensajeError mensaje={mensajeDeErrorClases(alumnos.error)} />
    if (alumnos.isLoading || !filas) return <Cargando />
    if (filas.length === 0) return <EstadoVacio titulo={TEXTOS_TABLA_ALUMNOS.vacio} />
    return (
      <>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{TEXTOS_TABLA_ALUMNOS.columnas.nombre}</TableHead>
              <TableHead>{TEXTOS_TABLA_ALUMNOS.columnas.correo}</TableHead>
              <TableHead>{TEXTOS_TABLA_ALUMNOS.columnas.estadoPago}</TableHead>
              <TableHead>{TEXTOS_TABLA_ALUMNOS.columnas.acceso}</TableHead>
              <TableHead>{TEXTOS_TABLA_ALUMNOS.columnas.seUnio}</TableHead>
              <TableHead>{TEXTOS_TABLA_ALUMNOS.columnas.acciones}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filas.map((alumno) => (
              <FilaAlumno
                key={alumno.id}
                claseId={claseId}
                alumno={alumno}
                registrarQuitar={registrarQuitar}
              />
            ))}
          </TableBody>
        </Table>
        {alumnos.hasNextPage && (
          <Button
            ref={refVerMas}
            type="button"
            variant="outline"
            onClick={() => void alumnos.fetchNextPage()}
            enEspera={alumnos.isFetchingNextPage}
            className="self-start"
          >
            {TEXTOS_TABLA_ALUMNOS.verMas}
          </Button>
        )}
      </>
    )
  }

  return (
    <Card>
      <CardHeader>
        <h2 ref={encabezadoRef} tabIndex={-1} className="text-h2">
          {TEXTOS_TABLA_ALUMNOS.titulo}
        </h2>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">{contenido()}</CardContent>
    </Card>
  )
}
