import { Eye, EyeOff } from "lucide-react"
import { useEffect, useLayoutEffect, useRef, useState, type ComponentProps } from "react"
import { flushSync } from "react-dom"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

import type { Seleccion } from "../types"

interface CampoContrasenaProps extends Omit<ComponentProps<typeof Input>, "type"> {
  id: string
  nombreDelBoton: string
}

// Selección actual del campo, tomada en el instante que se llama (Chromium manda la selección al
// final al cambiar el type de un input, así que hay que restaurarla después).
const capturarSeleccion = (campo: HTMLInputElement): Seleccion => ({
  inicio: campo.selectionStart,
  fin: campo.selectionEnd,
  tenerFoco: document.activeElement === campo,
})

// Botón para mostrar u ocultar la contraseña (§D-7; P-05 B, humano, 2026-09-27): nombre fijo por
// campo; el nombre accesible va como texto visualmente oculto dentro del botón, nunca como
// atributo de etiqueta; el estado va en el atributo de presionado. Solo lo usa auth (regla 5 de
// CLAUDE.md).
export function CampoContrasena({ id, nombreDelBoton, className, ...props }: CampoContrasenaProps) {
  const [visible, setVisible] = useState(false)
  const campoRef = useRef<HTMLInputElement>(null)
  // Selección pendiente de restaurar tras el próximo cambio de type; se consume una sola vez, para
  // que un cambio de visible posterior no reaplique una selección vieja (T-01, ronda 1 de 01b-2).
  const seleccionRef = useRef<Seleccion | null>(null)

  // CC-3: antes de cambiar el type, se guarda la selección de ese instante y si el campo tenía el
  // foco.
  const alternar = () => {
    const campo = campoRef.current
    if (campo) seleccionRef.current = capturarSeleccion(campo)
    setVisible((valorAnterior) => !valorAnterior)
  }

  useLayoutEffect(() => {
    const campo = campoRef.current
    const seleccion = seleccionRef.current
    seleccionRef.current = null
    if (!campo || !seleccion || !seleccion.tenerFoco) return
    if (document.activeElement !== campo) return
    if (seleccion.inicio === null || seleccion.fin === null) return
    campo.setSelectionRange(seleccion.inicio, seleccion.fin)
  }, [visible])

  // CC-6 (P-04 A): al enviar el formulario, también si la validación en cliente falla, la
  // contraseña vuelve a ocultarse. El envío sigue su curso: no se llama a preventDefault. La
  // selección que se restaura es la de este instante, no una guardada antes por alternar (T-01).
  useEffect(() => {
    const formulario = campoRef.current?.form
    if (!formulario) return
    const ocultarAlEnviar = () => {
      const campo = campoRef.current
      if (campo) seleccionRef.current = capturarSeleccion(campo)
      flushSync(() => setVisible(false))
    }
    formulario.addEventListener("submit", ocultarAlEnviar, { capture: true })
    return () => formulario.removeEventListener("submit", ocultarAlEnviar, { capture: true })
  }, [])

  return (
    <div className="relative">
      <Input
        ref={campoRef}
        id={id}
        type={visible ? "text" : "password"}
        spellCheck={false}
        autoCapitalize="none"
        autoCorrect="off"
        className={cn("pr-12", className)}
        {...props}
      />
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="absolute top-0 right-0"
        aria-pressed={visible}
        aria-controls={id}
        onMouseDown={(evento) => evento.preventDefault()}
        onClick={alternar}
      >
        {visible ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
        <span className="sr-only">{nombreDelBoton}</span>
      </Button>
    </div>
  )
}
