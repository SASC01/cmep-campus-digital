import { useEffect, useRef, useState } from "react"
import { Link, useNavigate } from "react-router"

import { Button } from "@/components/ui/button"
import { buttonVariants } from "@/components/ui/button-variants"
import { Card, CardContent } from "@/components/ui/card"

import { TEXTOS_DETALLE_TAREA } from "../data"
import { useBorrarTarea } from "../hooks"
import { esTareaConEntregas, mensajeDeErrorTareas } from "../lib"
import type { TareaDetalle } from "../types"

interface AccionesDeLaTareaProps {
  claseId: string
  tarea: TareaDetalle
  // La ruta base de la clase en la perspectiva actual; al borrar se vuelve a su "Trabajo de clase".
  base: string
  // ENTREGAS-01e (§D-10.5.4): true solo en la perspectiva de admin. La perspectiva decide qué se
  // muestra ("Borrar con las entregas"); el servidor decide qué se permite.
  puedeConfirmarEntregas: boolean
}

// §D-10, DESIGN.md §7.20: "Editar tarea" y "Borrar tarea" de maestro y admin. Cada botón sale de lo que
// dice el servidor (`puedeEditar`, `puedeBorrar`), nunca del rol. Borrar pide confirmación en línea
// (§7.14): el foco va a "Cancelar" al pedirla y vuelve a "Borrar tarea" al cancelar; al borrar,
// navega a "Trabajo de clase" (TAREAS-01e, §D-10; el aviso lo da el hook). Sin ninguno de los dos permisos no pinta nada.
// ENTREGAS-01e (§D-10.5, Enmienda 2): si el servidor responde 409 TAREA_CON_ENTREGAS, la confirmación
// pasa a un segundo paso con su mensaje en role="alert" (sin aviso) y el foco en "Cancelar"; el admin
// ve además "Borrar con las entregas", que manda el DELETE con ?confirmar=entregas. Los dos botones
// destructivos tienen guarda síncrona con ref y enEspera; mientras el borrado vuela, "Cancelar" no
// cierra nada.
export function AccionesDeLaTarea({
  claseId,
  tarea,
  base,
  puedeConfirmarEntregas,
}: AccionesDeLaTareaProps) {
  const navigate = useNavigate()
  const borrar = useBorrarTarea(claseId, tarea.id)
  const [confirmando, setConfirmando] = useState(false)
  // El mensaje del 409 TAREA_CON_ENTREGAS (con el conteo, del servidor); null en el primer paso.
  const [conEntregas, setConEntregas] = useState<string | null>(null)
  const borrandoRef = useRef(false)
  const borrarBtnRef = useRef<HTMLButtonElement>(null)
  const cancelarBtnRef = useRef<HTMLButtonElement>(null)
  const confirmandoAnteriorRef = useRef(confirmando)

  useEffect(() => {
    if (confirmandoAnteriorRef.current === confirmando) return
    confirmandoAnteriorRef.current = confirmando
    if (confirmando) {
      cancelarBtnRef.current?.focus()
      return
    }
    borrarBtnRef.current?.focus()
  }, [confirmando])

  // Al aparecer el segundo paso, "Sí, borrar tarea" (que tenía el foco) ya no está: el foco va a su
  // "Cancelar", nunca a <body>.
  useEffect(() => {
    if (conEntregas === null) return
    cancelarBtnRef.current?.focus()
  }, [conEntregas])

  if (!tarea.puedeEditar && !tarea.puedeBorrar) return null

  const handleBorrar = (confirmarEntregas: boolean) => {
    if (borrandoRef.current) return
    borrandoRef.current = true
    borrar.mutate(confirmarEntregas, {
      onSuccess: () => navigate(`${base}/trabajo`),
      onError: (error) => {
        if (esTareaConEntregas(error)) setConEntregas(mensajeDeErrorTareas(error))
      },
      onSettled: () => {
        borrandoRef.current = false
      },
    })
  }

  const handleCancelar = () => {
    if (borrandoRef.current) return
    setConfirmando(false)
    setConEntregas(null)
  }

  return (
    <Card>
      <CardContent className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {tarea.puedeEditar && (
            <Link
              to={`${base}/tareas/${tarea.id}/editar`}
              className={buttonVariants({ variant: "outline" })}
            >
              {TEXTOS_DETALLE_TAREA.editar}
            </Link>
          )}
          {tarea.puedeBorrar && !confirmando && (
            <Button
              ref={borrarBtnRef}
              type="button"
              variant="ghost"
              onClick={() => setConfirmando(true)}
            >
              {TEXTOS_DETALLE_TAREA.borrar}
            </Button>
          )}
        </div>

        {tarea.puedeBorrar && confirmando && (
          <div className="flex flex-col gap-2">
            {conEntregas === null && (
              <p className="text-small">{TEXTOS_DETALLE_TAREA.confirmarBorrar}</p>
            )}
            {conEntregas !== null && (
              <p role="alert" className="text-small">
                {conEntregas}
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              {conEntregas === null && (
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => handleBorrar(false)}
                  enEspera={borrar.isPending}
                >
                  {TEXTOS_DETALLE_TAREA.siBorrar}
                </Button>
              )}
              {conEntregas !== null && puedeConfirmarEntregas && (
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => handleBorrar(true)}
                  enEspera={borrar.isPending}
                >
                  {TEXTOS_DETALLE_TAREA.borrarConEntregas}
                </Button>
              )}
              <Button ref={cancelarBtnRef} type="button" variant="outline" onClick={handleCancelar}>
                {TEXTOS_DETALLE_TAREA.cancelar}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
