import { CircleAlert } from "lucide-react"
import { useEffect, useRef, useState, type ReactNode } from "react"

import { MensajeError } from "@/components/mensaje-error"
import { Button } from "@/components/ui/button"

import { TEXTOS_CUENTAS } from "../data"
import { useRestablecerContrasena } from "../hooks"
import { etiquetaDeRolAdmin, focoDisponiblePara, mensajeDeErrorAdmin } from "../lib"
import type { UsuarioAdmin } from "../types"
import { ContrasenaTemporal } from "./contrasena-temporal"
import { FormularioCorregirCorreo } from "./formulario-corregir-correo"

interface AccionRestablecerProps {
  usuarioId: string
}

// Confirmación en línea, no modal (CLAUDE.md): es una acción sensible pero no la excepción de
// destructivas de la guía (restringir acceso, dar de baja, cambio masivo), así que aquí basta con
// el patrón en línea con "Sí, restablecer" / "Cancelar".
function AccionRestablecer({ usuarioId }: AccionRestablecerProps) {
  const restablecer = useRestablecerContrasena()
  const [confirmando, setConfirmando] = useState(false)
  // T-03 (ronda 2): un ref se lee y se escribe de forma síncrona, a diferencia de isPending (que
  // TanStack Query notifica en la siguiente tarea): dos clics en el mismo instante nunca hacen dos
  // peticiones. Se libera en onSettled para permitir un reintento tras un error.
  const enviandoRef = useRef(false)
  const raizRef = useRef<HTMLDivElement>(null)
  const restablecerBtnRef = useRef<HTMLButtonElement>(null)
  const cancelarBtnRef = useRef<HTMLButtonElement>(null)
  // T-13 (ronda 4): guarda el último valor de "confirmando" que el efecto ya procesó, inicializado
  // con el valor del primer render. Con <StrictMode>, React vuelve a ejecutar este efecto en un
  // segundo montaje simulado (main.tsx envuelve la app en <StrictMode>), pero "confirmando" no
  // cambió entre esas dos ejecuciones: comparar contra el valor anterior (en vez de una bandera de
  // "primer render", que ese segundo montaje ya no distingue) hace que ambas ejecuciones no muevan
  // el foco, y solo lo mueve una transición real de "confirmando".
  const confirmandoAnteriorRef = useRef(confirmando)
  // Capturado en el propio onSuccess/onError de la mutación, no leído del historial de eventos
  // (T-14, DESIGN-01a D-6): el foco se decide con el elemento activo en el momento de la respuesta.
  const [enfocarTemporal, setEnfocarTemporal] = useState(false)

  // T-09/T-10 (ronda 3): al pedir la confirmación, el foco va a "Cancelar" (nunca a "Sí,
  // restablecer": un segundo Enter o su repetición ya no confirma sin un gesto deliberado). Al
  // cancelar, el foco vuelve a "Restablecer contraseña", nunca a <body>.
  useEffect(() => {
    if (confirmandoAnteriorRef.current === confirmando) return
    confirmandoAnteriorRef.current = confirmando
    if (confirmando) {
      cancelarBtnRef.current?.focus()
      return
    }
    restablecerBtnRef.current?.focus()
  }, [confirmando])

  const handleConfirmar = () => {
    if (enviandoRef.current) return
    enviandoRef.current = true
    restablecer.mutate(usuarioId, {
      onSuccess: () => {
        const disponible = focoDisponiblePara(
          raizRef.current,
          document.activeElement,
          document.body,
        )
        setEnfocarTemporal(disponible)
      },
      onError: () => {
        // T-12 (ronda 4) y T-14: si nadie más tomó el foco mientras la petición estaba en vuelo, se
        // recupera hacia "Cancelar" al conocer el resultado, nunca antes.
        const disponible = focoDisponiblePara(
          raizRef.current,
          document.activeElement,
          document.body,
        )
        if (disponible) cancelarBtnRef.current?.focus()
      },
      onSettled: () => {
        enviandoRef.current = false
      },
    })
  }

  // Elige, con retornos tempranos y sin ternarios anidados, el contenido de cada estado.
  const renderContenido = (): ReactNode => {
    if (restablecer.isSuccess) {
      return (
        <ContrasenaTemporal
          contrasena={restablecer.data.contrasenaTemporal}
          enfocarAlMostrar={enfocarTemporal}
        />
      )
    }

    if (confirmando) {
      return (
        <>
          {restablecer.isError && <MensajeError mensaje={mensajeDeErrorAdmin(restablecer.error)} />}
          <p className="text-small">{TEXTOS_CUENTAS.ficha.confirmarRestablecer}</p>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="destructive"
              onClick={handleConfirmar}
              enEspera={restablecer.isPending}
            >
              {TEXTOS_CUENTAS.ficha.siRestablecer}
            </Button>
            <Button
              ref={cancelarBtnRef}
              type="button"
              variant="outline"
              onClick={() => setConfirmando(false)}
            >
              {TEXTOS_CUENTAS.ficha.cancelar}
            </Button>
          </div>
        </>
      )
    }

    return (
      <>
        {restablecer.isError && <MensajeError mensaje={mensajeDeErrorAdmin(restablecer.error)} />}
        <Button
          ref={restablecerBtnRef}
          type="button"
          variant="destructive"
          onClick={() => setConfirmando(true)}
        >
          {TEXTOS_CUENTAS.ficha.restablecer}
        </Button>
      </>
    )
  }

  return (
    <div ref={raizRef} className="flex flex-col gap-2">
      {renderContenido()}
    </div>
  )
}

interface FichaDeCuentaProps {
  usuario: UsuarioAdmin
  onCorreoCorregido: (usuario: UsuarioAdmin) => void
}

// DEC-19. Sin estadoPago ni datos de restricción: esta pantalla provisional no los usa.
export function FichaDeCuenta({ usuario, onCorreoCorregido }: FichaDeCuentaProps) {
  return (
    <div className="flex flex-col gap-3 rounded-panel border border-border bg-surface p-4">
      <div className="flex flex-col gap-1">
        <p className="font-medium">{usuario.nombre}</p>
        <p className="text-small text-muted-foreground">{usuario.email}</p>
        <p className="text-small text-muted-foreground">{etiquetaDeRolAdmin(usuario.rol)}</p>
        {!usuario.activo && (
          <p className="flex items-center gap-1.5 text-small text-warning">
            <CircleAlert aria-hidden="true" className="size-4 shrink-0" />
            {TEXTOS_CUENTAS.ficha.inactiva}
          </p>
        )}
      </div>

      {usuario.rol === "admin" ? (
        <p className="text-small text-muted-foreground">
          {TEXTOS_CUENTAS.ficha.noPermiteRestablecer}
        </p>
      ) : (
        <AccionRestablecer usuarioId={usuario.id} />
      )}

      <FormularioCorregirCorreo usuario={usuario} onCorregido={onCorreoCorregido} />
    </div>
  )
}
