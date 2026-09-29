import { useEffect, useRef, useState } from "react"

import { Cargando } from "@/components/cargando"
import { EstadoVacio } from "@/components/estado-vacio"
import { MensajeError } from "@/components/mensaje-error"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatearFechaHora } from "@/lib/format"

import { InsigniaEstadoEnlace } from "./insignia-estado-enlace"
import { RegistradosDelEnlace } from "./registrados-del-enlace"
import { TEXTOS_MAESTROS } from "../data"
import { useEnlacesRegistro, useRevocarEnlace } from "../hooks"
import { mensajeDeErrorAdmin, textoOcultoDeFila } from "../lib"
import type { EnlaceRegistroAdmin } from "../types"

interface FilaEnlaceProps {
  enlace: EnlaceRegistroAdmin
}

// T-10 (ronda 1) / Enmienda 6 (arbitraje del manager, §D-B6): con dos o más filas, los botones de
// acción quedaban indistinguibles para quien navega por la lista de controles de un lector de
// pantalla. El texto visible no cambia; el nombre accesible de cada botón de fila suma, después de
// un espacio explícito, un texto sr-only con el dato que identifica la fila (DESIGN.md §7.9). Nada
// de aria-hidden ni de aria-label: un aria-hidden deja el identificador fuera del nombre accesible
// (lo que un lector de pantalla anuncia), que es justo lo que hay que distinguir. R-17: dos enlaces
// creados en el mismo minuto repetirían el nombre; riesgo aceptado.
interface MarcaProps {
  plantilla: string
  creadoEn: string
}

function Marca({ plantilla, creadoEn }: MarcaProps) {
  return (
    <>
      {" "}
      <span className="sr-only">{textoOcultoDeFila(plantilla, formatearFechaHora(creadoEn))}</span>
    </>
  )
}

function FilaEnlace({ enlace }: FilaEnlaceProps) {
  const [expandido, setExpandido] = useState(false)
  const [confirmando, setConfirmando] = useState(false)
  const revocar = useRevocarEnlace()
  const enviandoRef = useRef(false)
  const revocarBtnRef = useRef<HTMLButtonElement>(null)
  const cancelarBtnRef = useRef<HTMLButtonElement>(null)
  // T-09 (ronda 1): mismo patrón que AccionRestablecer (features/admin/components/ficha-de-cuenta.tsx,
  // AUTH-02): compara contra el valor de "confirmando" que el efecto ya procesó, para que el doble
  // montaje de <StrictMode> no repita el movimiento de foco.
  const confirmandoAnteriorRef = useRef(confirmando)

  useEffect(() => {
    if (confirmandoAnteriorRef.current === confirmando) return
    confirmandoAnteriorRef.current = confirmando
    if (confirmando) {
      cancelarBtnRef.current?.focus()
      return
    }
    revocarBtnRef.current?.focus()
  }, [confirmando])

  const handleRevocar = () => {
    if (enviandoRef.current) return
    enviandoRef.current = true
    revocar.mutate(enlace.id, {
      onSuccess: () => setConfirmando(false),
      onSettled: () => {
        enviandoRef.current = false
      },
    })
  }

  return (
    <>
      <TableRow>
        <TableCell>{formatearFechaHora(enlace.creadoEn)}</TableCell>
        <TableCell>{formatearFechaHora(enlace.expiraEn)}</TableCell>
        <TableCell>
          <InsigniaEstadoEnlace estado={enlace.estado} />
        </TableCell>
        <TableCell className="text-right tabular-nums">{enlace.registrados}</TableCell>
        <TableCell>
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                aria-expanded={expandido}
                onClick={() => setExpandido((valor) => !valor)}
              >
                {expandido
                  ? TEXTOS_MAESTROS.enlaces.ocultarRegistrados
                  : TEXTOS_MAESTROS.enlaces.verRegistrados}
                <Marca
                  plantilla={
                    expandido
                      ? TEXTOS_MAESTROS.enlaces.ocultoDeFila.ocultarRegistrados
                      : TEXTOS_MAESTROS.enlaces.ocultoDeFila.verRegistrados
                  }
                  creadoEn={enlace.creadoEn}
                />
              </Button>
              {enlace.estado === "vigente" && !confirmando && (
                <Button
                  ref={revocarBtnRef}
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={() => setConfirmando(true)}
                >
                  {TEXTOS_MAESTROS.enlaces.revocar}
                  <Marca
                    plantilla={TEXTOS_MAESTROS.enlaces.ocultoDeFila.revocar}
                    creadoEn={enlace.creadoEn}
                  />
                </Button>
              )}
            </div>
            {/* T-09: la frase de consecuencia va antes de "Sí, revocar" en el orden de lectura
                (DESIGN.md §7.14), en la misma celda que los botones (no en una fila aparte, que
                los leería después). */}
            {confirmando && (
              <div className="flex flex-col gap-2">
                {revocar.isError && <MensajeError mensaje={mensajeDeErrorAdmin(revocar.error)} />}
                <p className="text-small">{TEXTOS_MAESTROS.enlaces.confirmarRevocar}</p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={handleRevocar}
                    enEspera={revocar.isPending}
                  >
                    {TEXTOS_MAESTROS.enlaces.siRevocar}
                    <Marca
                      plantilla={TEXTOS_MAESTROS.enlaces.ocultoDeFila.confirmarRevocacion}
                      creadoEn={enlace.creadoEn}
                    />
                  </Button>
                  <Button
                    ref={cancelarBtnRef}
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setConfirmando(false)}
                  >
                    {TEXTOS_MAESTROS.enlaces.cancelar}
                    <Marca
                      plantilla={TEXTOS_MAESTROS.enlaces.ocultoDeFila.cancelarRevocacion}
                      creadoEn={enlace.creadoEn}
                    />
                  </Button>
                </div>
              </div>
            )}
          </div>
        </TableCell>
      </TableRow>
      {expandido && (
        <TableRow>
          <TableCell colSpan={5}>
            <RegistradosDelEnlace enlaceId={enlace.id} creadoEnDelEnlace={enlace.creadoEn} />
          </TableCell>
        </TableRow>
      )}
    </>
  )
}

interface TablaEnlacesProps {
  onGenerarPrimero: () => void
}

// AUTH-03b, §D-B6: lista de enlaces de registro, con "Cargar más enlaces" al pie (P-02 A).
export function TablaEnlaces({ onGenerarPrimero }: TablaEnlacesProps) {
  const enlaces = useEnlacesRegistro()

  if (enlaces.isError) {
    return <MensajeError mensaje={mensajeDeErrorAdmin(enlaces.error)} />
  }

  if (enlaces.isLoading || !enlaces.data) {
    return <Cargando />
  }

  const filas = enlaces.data.pages.flatMap((pagina) => pagina.enlaces)

  if (filas.length === 0) {
    return (
      <EstadoVacio
        titulo={TEXTOS_MAESTROS.enlaces.vacioListaTitulo}
        descripcion={TEXTOS_MAESTROS.enlaces.vacioListaDescripcion}
        accion={{
          texto: TEXTOS_MAESTROS.enlaces.generarElPrimero,
          onClick: onGenerarPrimero,
          variante: "outline",
        }}
      />
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{TEXTOS_MAESTROS.enlaces.columnas.creado}</TableHead>
            <TableHead>{TEXTOS_MAESTROS.enlaces.columnas.vence}</TableHead>
            <TableHead>{TEXTOS_MAESTROS.enlaces.columnas.estado}</TableHead>
            <TableHead className="text-right">
              {TEXTOS_MAESTROS.enlaces.columnas.registrados}
            </TableHead>
            <TableHead>{TEXTOS_MAESTROS.enlaces.columnas.acciones}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filas.map((enlace) => (
            <FilaEnlace key={enlace.id} enlace={enlace} />
          ))}
        </TableBody>
      </Table>
      {enlaces.hasNextPage && (
        <Button
          type="button"
          variant="outline"
          onClick={() => void enlaces.fetchNextPage()}
          enEspera={enlaces.isFetchingNextPage}
        >
          {TEXTOS_MAESTROS.enlaces.cargarMasEnlaces}
        </Button>
      )}
    </div>
  )
}
