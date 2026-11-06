import { useEffect, useRef, useState } from "react"
import { Link } from "react-router"

import { Button } from "@/components/ui/button"
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
import { useGestionEnVuelo, useRestaurarClase } from "../hooks"
import { formatearFechaDeClase } from "../lib"
import type { ClaseAdmin, EstadoDeClases } from "../types"
import { ConfirmarArchivado } from "./confirmar-archivado"

interface NombreDeLaAccionProps {
  accion: string
  nombre: string
}

// O-01c-3: el nombre de la clase nunca es un nodo de texto propio dentro de un botón; la acción y la
// clase van en el mismo texto sr-only, y lo visible queda fuera del nombre accesible.
function NombreDeLaAccion({ accion, nombre }: NombreDeLaAccionProps) {
  return (
    <>
      <span aria-hidden="true">{accion}</span>
      <span className="sr-only">{TEXTOS_CLASES_ADMIN.accionSobre(accion, nombre)}</span>
    </>
  )
}

interface FilaClaseAdminProps {
  clase: ClaseAdmin
  estado: EstadoDeClases
  onBorrar: (clase: ClaseAdmin) => void
}

// ADMIN-01c (§D-10): las acciones de cada fila. "Abrir" es siempre el primer enlace (O-01c-4). En
// "Activas", «Archivar» abre la confirmación en línea (§7.14: el foco va a «Cancelar» y, al cancelar,
// vuelve a «Archivar»). En "Archivadas", «Restaurar» (sin confirmación, con enEspera y una guarda con
// ref) y «Borrar definitivamente», que abre el diálogo de la vista. `data-accion` dice qué control
// recibe el foco cuando otra fila sale (useFocoAlQuitarUnaClase). Corrección de la ronda 1 (T-02):
// «Restaurar» lee de la caché de mutaciones si esa clase ya se está restaurando, así que la fila que se
// vuelve a montar con la petición en vuelo sigue en espera y no manda otra.
function FilaClaseAdmin({ clase, estado, onBorrar }: FilaClaseAdminProps) {
  const [confirmando, setConfirmando] = useState(false)
  const restaurar = useRestaurarClase(clase.id)
  const restauracion = useGestionEnVuelo("restaurar", clase.id)
  const restaurandoRef = useRef(false)
  const archivarRef = useRef<HTMLButtonElement>(null)
  const confirmandoAnteriorRef = useRef(confirmando)

  useEffect(() => {
    if (confirmandoAnteriorRef.current === confirmando) return
    confirmandoAnteriorRef.current = confirmando
    if (!confirmando) archivarRef.current?.focus()
  }, [confirmando])

  const handleRestaurar = () => {
    if (restaurandoRef.current || restauracion.sigueEnVuelo()) return
    restaurandoRef.current = true
    restaurar.reset()
    restaurar.mutate(undefined, {
      onSettled: () => {
        restaurandoRef.current = false
      },
    })
  }

  return (
    <TableRow data-clase-id={clase.id}>
      <TableCell className="wrap-anywhere font-bold">{clase.nombre}</TableCell>
      <TableCell className="wrap-anywhere">
        {clase.maestros.map((maestro) => maestro.nombre).join(", ")}
      </TableCell>
      <TableCell className="text-right tabular-nums">{clase.alumnos}</TableCell>
      <TableCell>
        {estado === "activas" && formatearFechaDeClase(clase.creadoEn)}
        {estado === "archivadas" &&
          typeof clase.archivadaEn === "string" &&
          formatearFechaDeClase(clase.archivadaEn)}
      </TableCell>
      <TableCell>
        <div className="flex flex-wrap gap-2">
          <Link
            to={`/admin/clases/${clase.id}`}
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            {TEXTOS_CLASES_ADMIN.abrir} <span className="sr-only">{clase.nombre}</span>
          </Link>
          {estado === "archivadas" && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              data-accion="restaurar"
              onClick={handleRestaurar}
              enEspera={restaurar.isPending || restauracion.enVuelo}
            >
              <NombreDeLaAccion accion={TEXTOS_CLASES_ADMIN.restaurar} nombre={clase.nombre} />
            </Button>
          )}
          <Link
            to={`/admin/clases/${clase.id}/duplicar`}
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            {TEXTOS_CLASES_ADMIN.duplicar} <span className="sr-only">{clase.nombre}</span>
          </Link>
          {estado === "activas" && !confirmando && (
            <Button
              ref={archivarRef}
              type="button"
              variant="ghost"
              size="sm"
              data-accion="archivar"
              onClick={() => setConfirmando(true)}
            >
              <NombreDeLaAccion accion={TEXTOS_CLASES_ADMIN.archivar} nombre={clase.nombre} />
            </Button>
          )}
          {estado === "archivadas" && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              data-accion="borrar"
              onClick={() => onBorrar(clase)}
            >
              <NombreDeLaAccion accion={TEXTOS_CLASES_ADMIN.borrar} nombre={clase.nombre} />
            </Button>
          )}
        </div>
        {estado === "activas" && confirmando && (
          <ConfirmarArchivado clase={clase} onCancelar={() => setConfirmando(false)} />
        )}
      </TableCell>
    </TableRow>
  )
}

interface TablaClasesAdminProps {
  clases: readonly ClaseAdmin[]
  estado: EstadoDeClases
  onBorrar: (clase: ClaseAdmin) => void
}

// §D-2C2, DESIGN.md §7.9: la tabla institucional de clases, opaca y densa (el contexto lo da el
// marco del administrador). "Alumnos" a la derecha con cifras tabulares; "Abrir" y "Duplicar" llevan el
// nombre de la clase como texto sr-only (nunca aria-label). ADMIN-01c (§D-10): "Activas" muestra
// "Creada"; "Archivadas", "Archivada". Las columnas de "Activas" no cambian.
export function TablaClasesAdmin({ clases, estado, onBorrar }: TablaClasesAdminProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{TEXTOS_CLASES_ADMIN.columnas.clase}</TableHead>
          <TableHead>{TEXTOS_CLASES_ADMIN.columnas.maestros}</TableHead>
          <TableHead className="text-right">{TEXTOS_CLASES_ADMIN.columnas.alumnos}</TableHead>
          <TableHead>
            {estado === "activas"
              ? TEXTOS_CLASES_ADMIN.columnas.creada
              : TEXTOS_CLASES_ADMIN.archivada}
          </TableHead>
          <TableHead>{TEXTOS_CLASES_ADMIN.columnas.acciones}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {clases.map((clase) => (
          <FilaClaseAdmin key={clase.id} clase={clase} estado={estado} onBorrar={onBorrar} />
        ))}
      </TableBody>
    </Table>
  )
}
