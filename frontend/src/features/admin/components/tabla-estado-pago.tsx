import { Lock } from "lucide-react"
import { useRef } from "react"

import { EstadoPagoBadge } from "@/components/estado-pago-badge"
import { MensajeError } from "@/components/mensaje-error"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

import { TEXTOS_ESTADO_PAGO, TEXTOS_USUARIOS } from "../data"
import { useCambiarAcceso, useCambiarEstadoPago } from "../hooks"
import {
  errorQueRedirigeElCliente,
  estadoContrario,
  formatearFechaCorta,
  mensajeDeErrorAdmin,
} from "../lib"
import type { AccionVigente, EstadoPago, SeleccionDeAlumnos, UsuarioAdminFila } from "../types"

interface NombreDeLaAccionProps {
  accion: string
  nombre: string
}

// §7.9: lo visible queda fuera del nombre accesible; la acción y el alumno van en un solo texto sr-only.
function NombreDeLaAccion({ accion, nombre }: NombreDeLaAccionProps) {
  return (
    <>
      <span aria-hidden="true">{accion}</span>
      <span className="sr-only">{TEXTOS_ESTADO_PAGO.accionSobre(accion, nombre)}</span>
    </>
  )
}

interface FilaEstadoPagoProps {
  fila: UsuarioAdminFila
  estadoPago: EstadoPago
  seleccionada: boolean
  accionVigente: AccionVigente
  onSeleccionar: (fila: UsuarioAdminFila, estadoPago: EstadoPago, elegida: boolean) => void
  onAccion: (alumnoId: string, accion: "marcar" | "restablecer") => void
  onRestringir: (alumnoId: string) => void
}

// ADMIN-01g (§D-11, Enmienda 15). Criterio de T-01: lo que la fila pinta sale de la fila de la consulta en
// cada render, sin copia local: la insignia, el botón de «Marcar…» (el estado contrario al de la fila) y
// el de acceso («Restringir» o «Restablecer», el mismo elemento, así el foco se queda en él al cambiar).
// «Marcar…» manda el estado contrario al que la fila muestra al pulsarlo. Su error va en un solo
// MensajeError dentro de la fila, solo si su acción es la vigente de la vista (M-23); con la fila
// desmontada, avisa el gancho (01f). Guardas síncronas con ref en las dos acciones.
function FilaEstadoPago({
  fila,
  estadoPago,
  seleccionada,
  accionVigente,
  onSeleccionar,
  onAccion,
  onRestringir,
}: FilaEstadoPagoProps) {
  const cambiar = useCambiarEstadoPago()
  const restablecerAcceso = useCambiarAcceso()
  const cambiandoRef = useRef(false)
  const restableciendoRef = useRef(false)
  const restringido = fila.accesoRestringido === true
  const vigenteMarcar =
    accionVigente?.tipo === "fila" &&
    accionVigente.alumnoId === fila.id &&
    accionVigente.accion === "marcar"
  const vigenteRestablecer =
    accionVigente?.tipo === "fila" &&
    accionVigente.alumnoId === fila.id &&
    accionVigente.accion === "restablecer"
  const accionDeMarcar =
    estadoPago === "deudor" ? TEXTOS_ESTADO_PAGO.marcarAlCorriente : TEXTOS_ESTADO_PAGO.marcarDeudor
  const accionDeAcceso = restringido
    ? TEXTOS_ESTADO_PAGO.restablecer
    : TEXTOS_ESTADO_PAGO.restringir

  const handleMarcar = () => {
    if (cambiandoRef.current) return
    cambiandoRef.current = true
    onAccion(fila.id, "marcar")
    cambiar.mutate(
      { id: fila.id, estadoPago: estadoContrario(estadoPago) },
      {
        onSettled: () => {
          cambiandoRef.current = false
        },
      },
    )
  }

  // Ronda 1 (O-01g-r1-2): con «Restablecer» en vuelo, el botón de acceso sigue en espera aunque una
  // recarga ya traiga la fila sin restricción (su texto pasa a «Restringir», como dice el servidor): no
  // abre el diálogo de restringir hasta que el PUT en vuelo se asiente.
  const handleAcceso = () => {
    if (restableciendoRef.current) return
    if (!restringido) {
      onRestringir(fila.id)
      return
    }
    restableciendoRef.current = true
    onAccion(fila.id, "restablecer")
    restablecerAcceso.mutate(
      { id: fila.id, datos: { restringido: false } },
      {
        onSettled: () => {
          restableciendoRef.current = false
        },
      },
    )
  }

  return (
    <TableRow data-alumno-id={fila.id}>
      <TableCell>
        <label className="inline-flex size-(--control-height) cursor-pointer items-center justify-center">
          <input
            type="checkbox"
            className="size-4 accent-primary"
            checked={seleccionada}
            onChange={(evento) => onSeleccionar(fila, estadoPago, evento.target.checked)}
          />
          <span className="sr-only">{TEXTOS_ESTADO_PAGO.seleccionarA(fila.nombre)}</span>
        </label>
      </TableCell>
      <TableCell className="wrap-anywhere font-bold">{fila.nombre}</TableCell>
      <TableCell className="wrap-anywhere">{fila.email}</TableCell>
      <TableCell>
        <EstadoPagoBadge estado={estadoPago} />
      </TableCell>
      <TableCell>
        {typeof fila.fechaEstadoPago === "string"
          ? formatearFechaCorta(fila.fechaEstadoPago)
          : TEXTOS_ESTADO_PAGO.sinCambios}
      </TableCell>
      <TableCell>
        {restringido && (
          <Badge variant="warning" icon={<Lock aria-hidden="true" />}>
            {TEXTOS_USUARIOS.acceso.restringido}
          </Badge>
        )}
        {!restringido && TEXTOS_USUARIOS.acceso.sinRestriccion}
      </TableCell>
      <TableCell>
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              data-accion="marcar"
              onClick={handleMarcar}
              enEspera={cambiar.isPending}
            >
              <NombreDeLaAccion accion={accionDeMarcar} nombre={fila.nombre} />
            </Button>
            <Button
              type="button"
              variant="ghost"
              data-accion="acceso"
              onClick={handleAcceso}
              enEspera={restablecerAcceso.isPending}
            >
              <NombreDeLaAccion accion={accionDeAcceso} nombre={fila.nombre} />
            </Button>
          </div>
          {vigenteMarcar && cambiar.isError && !errorQueRedirigeElCliente(cambiar.error) && (
            <MensajeError mensaje={mensajeDeErrorAdmin(cambiar.error)} />
          )}
          {vigenteRestablecer &&
            restablecerAcceso.isError &&
            !errorQueRedirigeElCliente(restablecerAcceso.error) && (
              <MensajeError mensaje={mensajeDeErrorAdmin(restablecerAcceso.error)} />
            )}
        </div>
      </TableCell>
    </TableRow>
  )
}

interface TablaEstadoPagoProps {
  filas: readonly UsuarioAdminFila[]
  seleccion: SeleccionDeAlumnos
  accionVigente: AccionVigente
  onSeleccionar: (fila: UsuarioAdminFila, estadoPago: EstadoPago, elegida: boolean) => void
  onSeleccionarTodas: (elegidas: boolean) => void
  onAccion: (alumnoId: string, accion: "marcar" | "restablecer") => void
  onRestringir: (alumnoId: string) => void
}

// ADMIN-01g (§D-11, DESIGN.md §7.9): la tabla de /admin/estado-pago, opaca y densa (el contexto lo da el
// marco del administrador), con su casilla por fila y la de la cabecera, que elige todas las filas que la
// tabla muestra (las de todas las páginas cargadas; N-E15-2, "Todas las que se ven"). M-26 (DESIGN.md §6):
// el área pulsable de cada casilla es su etiqueta, del tamaño de un control (--control-height: 44 px, o
// 36 px desde 768 px en el contexto denso); la casilla se ve de 16 px. Los botones de la fila y de la barra
// de lote llevan el tamaño de un control por la misma regla.
export function TablaEstadoPago({
  filas,
  seleccion,
  accionVigente,
  onSeleccionar,
  onSeleccionarTodas,
  onAccion,
  onRestringir,
}: TablaEstadoPagoProps) {
  const todasElegidas = filas.length > 0 && filas.every((fila) => seleccion[fila.id] !== undefined)

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>
            <label className="inline-flex size-(--control-height) cursor-pointer items-center justify-center">
              <input
                type="checkbox"
                className="size-4 accent-primary"
                checked={todasElegidas}
                onChange={(evento) => onSeleccionarTodas(evento.target.checked)}
              />
              <span className="sr-only">{TEXTOS_ESTADO_PAGO.seleccionarPagina}</span>
            </label>
          </TableHead>
          <TableHead>{TEXTOS_ESTADO_PAGO.columnas.alumno}</TableHead>
          <TableHead>{TEXTOS_ESTADO_PAGO.columnas.correo}</TableHead>
          <TableHead>{TEXTOS_ESTADO_PAGO.columnas.estadoPago}</TableHead>
          <TableHead>{TEXTOS_ESTADO_PAGO.columnas.desde}</TableHead>
          <TableHead>{TEXTOS_ESTADO_PAGO.columnas.acceso}</TableHead>
          <TableHead>{TEXTOS_ESTADO_PAGO.columnas.acciones}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {filas.map((fila) =>
          fila.estadoPago === undefined ? null : (
            <FilaEstadoPago
              key={fila.id}
              fila={fila}
              estadoPago={fila.estadoPago}
              seleccionada={seleccion[fila.id] !== undefined}
              accionVigente={accionVigente}
              onSeleccionar={onSeleccionar}
              onAccion={onAccion}
              onRestringir={onRestringir}
            />
          ),
        )}
      </TableBody>
    </Table>
  )
}
