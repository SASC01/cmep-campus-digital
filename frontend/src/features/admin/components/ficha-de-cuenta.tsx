import { CircleAlert } from "lucide-react"
import { useEffect, useRef, useState, type FocusEvent } from "react"

import { MensajeError } from "@/components/mensaje-error"
import { Button } from "@/components/ui/button"

import { TEXTOS_CUENTAS } from "../data"
import { useRestablecerContrasena } from "../hooks"
import { etiquetaDeRolAdmin, mensajeDeErrorAdmin } from "../lib"
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
  const restablecerBtnRef = useRef<HTMLButtonElement>(null)
  const cancelarBtnRef = useRef<HTMLButtonElement>(null)
  // T-11 (ronda 3): refleja si el foco sigue dentro de esta confirmación mientras la petición está
  // en vuelo. Se lee (nunca durante el render, solo en manejadores o en el propio onSuccess) para
  // decidir si "Copiar" puede tomar el foco al llegar la temporal (ver ContrasenaTemporal).
  const tieneFocoRef = useRef(false)
  // T-13 (ronda 4): guarda el último valor de "confirmando" que el efecto ya procesó, inicializado
  // con el valor del primer render. Con <StrictMode>, React vuelve a ejecutar este efecto en un
  // segundo montaje simulado (main.tsx envuelve la app en <StrictMode>), pero "confirmando" no
  // cambió entre esas dos ejecuciones: comparar contra el valor anterior (en vez de una bandera de
  // "primer render", que ese segundo montaje ya no distingue) hace que ambas ejecuciones no muevan
  // el foco, y solo lo mueve una transición real de "confirmando".
  const confirmandoAnteriorRef = useRef(confirmando)
  // Capturado en el propio onSuccess de la mutación, no leído del ref durante el render (ESLint
  // react-hooks/refs lo prohíbe: un ref no es un valor de render).
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
        setEnfocarTemporal(tieneFocoRef.current)
      },
      onError: () => {
        // T-12 (ronda 4): en Chromium, "Sí, restablecer" pierde el foco hacia <body> en cuanto se
        // deshabilita, aunque el admin no se haya movido (ver manejarDesenfoque). Si seguía dentro
        // de la confirmación, se recupera el foco hacia "Cancelar" al conocer el resultado, nunca
        // antes: la corrección del foco del navegador debe completarse primero.
        if (tieneFocoRef.current) cancelarBtnRef.current?.focus()
      },
      onSettled: () => {
        enviandoRef.current = false
      },
    })
  }

  const manejarFoco = () => {
    tieneFocoRef.current = true
  }

  const manejarDesenfoque = (evento: FocusEvent<HTMLDivElement>) => {
    // T-12 (ronda 4): en Chromium, un botón deshabilitado que tenía el foco lo pierde hacia <body>
    // en la siguiente actualización de la página (la "corrección del foco" del HTML), aunque el
    // admin no se haya movido de la confirmación. Ahí el evento no tiene un destino real
    // (relatedTarget es <body> o nulo, porque nada más pidió el foco): no cuenta como abandono. Si
    // el nuevo foco es un control de verdad (el admin se movió a otro campo o botón), relatedTarget
    // lo señala y sí se apaga tieneFocoRef. document.activeElement no sirve aquí: en el momento del
    // blur todavía no refleja el destino, sea cual sea.
    const destino = evento.relatedTarget
    if (destino === null || destino === document.body) return
    tieneFocoRef.current = false
  }

  if (restablecer.isSuccess) {
    return (
      <div onFocusCapture={manejarFoco} onBlurCapture={manejarDesenfoque}>
        <ContrasenaTemporal
          contrasena={restablecer.data.contrasenaTemporal}
          enfocarAlMostrar={enfocarTemporal}
        />
      </div>
    )
  }

  if (confirmando) {
    return (
      <div
        onFocusCapture={manejarFoco}
        onBlurCapture={manejarDesenfoque}
        className="flex flex-col gap-2"
      >
        {restablecer.isError && <MensajeError mensaje={mensajeDeErrorAdmin(restablecer.error)} />}
        <p className="text-sm">{TEXTOS_CUENTAS.ficha.confirmarRestablecer}</p>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="destructive"
            onClick={handleConfirmar}
            disabled={restablecer.isPending}
            aria-busy={restablecer.isPending}
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
      </div>
    )
  }

  return (
    <div
      onFocusCapture={manejarFoco}
      onBlurCapture={manejarDesenfoque}
      className="flex flex-col gap-2"
    >
      {restablecer.isError && <MensajeError mensaje={mensajeDeErrorAdmin(restablecer.error)} />}
      <Button
        ref={restablecerBtnRef}
        type="button"
        variant="destructive"
        onClick={() => setConfirmando(true)}
      >
        {TEXTOS_CUENTAS.ficha.restablecer}
      </Button>
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
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4">
      <div className="flex flex-col gap-1">
        <p className="font-medium">{usuario.nombre}</p>
        <p className="text-sm text-muted-foreground">{usuario.email}</p>
        <p className="text-sm text-muted-foreground">{etiquetaDeRolAdmin(usuario.rol)}</p>
        {!usuario.activo && (
          <p className="flex items-center gap-1.5 text-sm text-warning">
            <CircleAlert aria-hidden="true" className="size-4 shrink-0" />
            {TEXTOS_CUENTAS.ficha.inactiva}
          </p>
        )}
      </div>

      {usuario.rol === "admin" ? (
        <p className="text-sm text-muted-foreground">{TEXTOS_CUENTAS.ficha.noPermiteRestablecer}</p>
      ) : (
        <AccionRestablecer usuarioId={usuario.id} />
      )}

      <FormularioCorregirCorreo usuario={usuario} onCorregido={onCorreoCorregido} />
    </div>
  )
}
