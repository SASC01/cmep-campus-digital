import { CircleCheck } from "lucide-react"
import { useEffect, useId, useRef, useState } from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { formatearFechaHora } from "@/lib/format"

import { CAPACIDADES_POR_PERSPECTIVA, TEXTOS_DUDAS } from "../data"
import { useBorrarDuda, useFilaEnFoco, useMarcarDuda } from "../hooks"
import { esDudaNoEncontrada, focoPerdido } from "../lib"
import type { Duda, Perspectiva } from "../types"
import { FirmaDelAutor } from "./firma-del-autor"
import { RespuestasDeDuda } from "./respuestas-de-duda"

interface ElementoDeDudaProps {
  claseId: string
  duda: Duda
  // La perspectiva la decide la vista (perspectivaDeRuta); aquí no se calcula.
  perspectiva: Perspectiva
}

// El texto del control que despliega las respuestas (Enmienda 4, S-14 y S-15): desplegado, el de plegarlas
// con cualquier número; plegado, el de verlas (n) con n ≥ 1 o el de responder con 0 (TEXTOS_DUDAS).
const textoDelControl = (abierto: boolean, respuestas: number): string => {
  if (abierto) return TEXTOS_DUDAS.ocultarRespuestas
  if (respuestas > 0) return TEXTOS_DUDAS.verRespuestas(respuestas)
  return TEXTOS_DUDAS.responder
}

// CLASES-03e (§D-9.2, DESIGN.md §7.31): una duda en la lista (divisores, sin vidrio). La firma, la fecha
// y, si está resuelta, la insignia "Resuelta" (texto e icono: nunca solo color); el texto plano (nunca se
// interpreta como HTML). El control de las respuestas es siempre el mismo botón, así el foco se queda
// cuando cambia su texto; el admin, que no responde (P-07), no lo ve en una duda sin respuestas mientras
// esté plegado. "Marcar como resuelta" / "Quitar «Resuelta»" es un solo botón (el foco se queda) y solo
// con `puedeMarcar`, nunca en la perspectiva del estudiante. "Borrar duda" sale de `puedeBorrar` y pide
// confirmación en línea (§7.14): el foco va a "Cancelar" al pedirla y vuelve a "Borrar duda" al cancelar.
export function ElementoDeDuda({ claseId, duda, perspectiva }: ElementoDeDudaProps) {
  const [abierto, setAbierto] = useState(false)
  // Si el bloque se abrió con "Responder", el foco va al campo de la respuesta.
  const [enfocarCampo, setEnfocarCampo] = useState(false)
  const [confirmando, setConfirmando] = useState(false)
  const idRespuestas = useId()
  const marcar = useMarcarDuda(claseId)
  const borrar = useBorrarDuda(claseId)
  const borrarBtnRef = useRef<HTMLButtonElement>(null)
  const cancelarBtnRef = useRef<HTMLButtonElement>(null)
  const confirmandoAnteriorRef = useRef(confirmando)
  // §D-12: guardas síncronas; `isPending` llega un render después. Mientras están marcadas no sale una
  // segunda petición y "Cancelar" no cierra la confirmación.
  const marcandoRef = useRef(false)
  const borrandoRef = useRef(false)
  const capacidades = CAPACIDADES_POR_PERSPECTIVA[perspectiva]
  const ofreceControl = abierto || duda.respuestas > 0 || capacidades.formularioComentario
  const ofreceMarcar = capacidades.gestionarTrabajo && duda.puedeMarcar
  const filaRef = useRef<HTMLLIElement>(null)
  // S-14: si el control de las respuestas desaparece con el foco dentro (el admin pliega un bloque sin
  // respuestas, o una recarga baja el conteo a 0), el foco va a la fila, nunca a <body>. T-01 (ronda 1 de
  // 03e): la marca de "el foco está en el control" es la de useFilaEnFoco, el mismo mecanismo que usa la
  // lista: un foco que pasa a otro elemento la cambia y un clic en blanco con la ventana enfocada la
  // borra; el control que se desmonta, o el cambio de pestaña, la conservan. El control lleva el id de
  // su duda en `data-desplegar-respuestas`, así cada fila reconoce el suyo.
  const controlEnFocoRef = useFilaEnFoco("data-desplegar-respuestas")
  const habiaControlRef = useRef(ofreceControl)
  // T-02 (ronda 1 de 03e): mientras se borra la duda, y si ya no existe (se borró o el servidor responde
  // DUDA_NO_ENCONTRADA), sus respuestas abiertas no se vuelven a pedir: un GET de una duda borrada solo
  // pintaría en la fila un error que repite el aviso. Lo que ya se ve se queda hasta que la fila sale.
  const dudaQueSeVa =
    borrar.isPending || borrar.isSuccess || (borrar.isError && esDudaNoEncontrada(borrar.error))

  useEffect(() => {
    const habiaControl = habiaControlRef.current
    habiaControlRef.current = ofreceControl
    if (ofreceControl || !habiaControl || controlEnFocoRef.current !== duda.id) return
    controlEnFocoRef.current = null
    if (!focoPerdido(document)) return
    filaRef.current?.focus()
  }, [ofreceControl, controlEnFocoRef, duda.id])

  useEffect(() => {
    if (confirmandoAnteriorRef.current === confirmando) return
    confirmandoAnteriorRef.current = confirmando
    if (confirmando) {
      cancelarBtnRef.current?.focus()
      return
    }
    borrarBtnRef.current?.focus()
  }, [confirmando])

  const alternarRespuestas = () => {
    setEnfocarCampo(!abierto && duda.respuestas === 0)
    setAbierto(!abierto)
  }

  const alternarMarca = () => {
    if (marcandoRef.current) return
    marcandoRef.current = true
    marcar.mutate(
      { dudaId: duda.id, resuelta: !duda.resuelta },
      {
        onSettled: () => {
          marcandoRef.current = false
        },
      },
    )
  }

  const confirmarBorrado = () => {
    if (borrandoRef.current) return
    borrandoRef.current = true
    borrar.mutate(duda.id, {
      onSettled: () => {
        borrandoRef.current = false
      },
    })
  }

  const cancelarBorrado = () => {
    if (borrandoRef.current) return
    setConfirmando(false)
  }

  return (
    <li
      ref={filaRef}
      data-duda-id={duda.id}
      tabIndex={-1}
      className="flex flex-col gap-2 border-b border-border py-4 last:border-0"
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <p className="text-small text-muted-foreground">
          <FirmaDelAutor autor={duda.autor} /> · {formatearFechaHora(duda.creadoEn)}
        </p>
        {duda.resuelta && (
          <Badge variant="success" icon={<CircleCheck aria-hidden="true" />}>
            {TEXTOS_DUDAS.resuelta}
          </Badge>
        )}
      </div>
      <p className="max-w-prose wrap-anywhere whitespace-pre-line text-body">{duda.texto}</p>

      <div className="flex flex-wrap items-center gap-2">
        {ofreceControl && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            data-desplegar-respuestas={duda.id}
            aria-expanded={abierto}
            aria-controls={abierto ? idRespuestas : undefined}
            onClick={alternarRespuestas}
          >
            {textoDelControl(abierto, duda.respuestas)}
          </Button>
        )}
        {ofreceMarcar && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            data-marcar-duda=""
            onClick={alternarMarca}
            enEspera={marcar.isPending}
          >
            {duda.resuelta ? TEXTOS_DUDAS.quitarMarca : TEXTOS_DUDAS.marcar}
          </Button>
        )}
        {duda.puedeBorrar && !confirmando && (
          <Button
            ref={borrarBtnRef}
            type="button"
            variant="ghost"
            size="sm"
            data-borrar-duda=""
            onClick={() => setConfirmando(true)}
          >
            {TEXTOS_DUDAS.borrar}
          </Button>
        )}
      </div>

      {duda.puedeBorrar && confirmando && (
        <div className="flex flex-col gap-2">
          <p className="text-small">{TEXTOS_DUDAS.consecuencia}</p>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="destructive"
              size="sm"
              data-confirmar-borrado=""
              onClick={confirmarBorrado}
              enEspera={borrar.isPending}
            >
              {TEXTOS_DUDAS.siBorrar}
            </Button>
            <Button
              ref={cancelarBtnRef}
              type="button"
              variant="outline"
              size="sm"
              onClick={cancelarBorrado}
            >
              {TEXTOS_DUDAS.cancelar}
            </Button>
          </div>
        </div>
      )}

      {abierto && (
        <RespuestasDeDuda
          id={idRespuestas}
          claseId={claseId}
          dudaId={duda.id}
          perspectiva={perspectiva}
          enfocarCampo={enfocarCampo}
          pedir={!dudaQueSeVa}
        />
      )}
    </li>
  )
}
