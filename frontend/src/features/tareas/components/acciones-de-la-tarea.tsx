import { useEffect, useRef, useState } from "react"
import { Link, useNavigate } from "react-router"

import { Button } from "@/components/ui/button"
import { buttonVariants } from "@/components/ui/button-variants"
import { Card, CardContent } from "@/components/ui/card"

import { TEXTOS_DETALLE_TAREA } from "../data"
import { useBorrarTarea } from "../hooks"
import type { TareaDetalle } from "../types"

interface AccionesDeLaTareaProps {
  claseId: string
  tarea: TareaDetalle
  // La ruta base de la clase en la perspectiva actual; al borrar se vuelve a su "Trabajo de clase".
  base: string
}

// §D-10, DESIGN.md §7.20: "Editar tarea" y "Borrar tarea" de maestro y admin. Cada botón sale de lo que
// dice el servidor (`puedeEditar`, `puedeBorrar`), nunca del rol. Borrar pide confirmación en línea
// (§7.14): el foco va a "Cancelar" al pedirla y vuelve a "Borrar tarea" al cancelar; al borrar,
// navega a "Trabajo de clase" (TAREAS-01e, §D-10; el aviso lo da el hook). Sin ninguno de los dos permisos no pinta nada.
export function AccionesDeLaTarea({ claseId, tarea, base }: AccionesDeLaTareaProps) {
  const navigate = useNavigate()
  const borrar = useBorrarTarea(claseId, tarea.id)
  const [confirmando, setConfirmando] = useState(false)
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

  if (!tarea.puedeEditar && !tarea.puedeBorrar) return null

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
            <p className="text-small">{TEXTOS_DETALLE_TAREA.confirmarBorrar}</p>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="destructive"
                onClick={() =>
                  borrar.mutate(undefined, { onSuccess: () => navigate(`${base}/trabajo`) })
                }
                enEspera={borrar.isPending}
              >
                {TEXTOS_DETALLE_TAREA.siBorrar}
              </Button>
              <Button
                ref={cancelarBtnRef}
                type="button"
                variant="outline"
                onClick={() => setConfirmando(false)}
              >
                {TEXTOS_DETALLE_TAREA.cancelar}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
