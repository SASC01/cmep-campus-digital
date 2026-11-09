import { Check } from "lucide-react"
import { useRef, useState, type FormEvent } from "react"

import { MensajeError } from "@/components/mensaje-error"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

import { OPCIONES_ESTADO_PAGO, TEXTOS_USUARIO } from "../data"
import { useCambiarEstadoPago } from "../hooks"
import { errorQueRedirigeElCliente, mensajeDeErrorAdmin } from "../lib"
import type { EstadoPago } from "../types"

interface EstadoDePagoDeCuentaProps {
  alumnoId: string
  estadoPago: EstadoPago
}

// ADMIN-01f (§D-11, RF-54, DESIGN.md §7.3): el estado de pago de un alumno desde su ficha, sin diálogo
// (DH-09): el control segmentado "Al corriente" / "Deudor" (vidrio fuerte dentro de la Card de la ficha,
// como el de /admin/clases) y «Guardar», que manda el lote con un solo id. Muestra el estado del servidor
// (T-01 de la ronda 1): sigue a la ficha cada vez que esta trae otro estado. Una elección de la persona
// distinta del estado del servidor, sin guardar o con «Guardar» en vuelo, se conserva aunque llegue otro
// estado; deja de contar cuando el servidor trae ese mismo estado o cuando «Guardar» sale bien (la ficha
// ya lo trae). Un error la conserva.
// Un error del servidor va en un solo MensajeError; la opción elegida se conserva y «Guardar» sale de
// la espera. El foco se queda en «Guardar».
export function EstadoDePagoDeCuenta({ alumnoId, estadoPago }: EstadoDePagoDeCuentaProps) {
  const cambiar = useCambiarEstadoPago()
  const [eleccion, setEleccion] = useState<EstadoPago | null>(null)
  const [estadoVisto, setEstadoVisto] = useState(estadoPago)
  // El estado del servidor cambió: si la persona había elegido justo ese, su elección ya no hace falta.
  if (estadoVisto !== estadoPago) {
    setEstadoVisto(estadoPago)
    if (eleccion === estadoPago) setEleccion(null)
  }
  const elegido = eleccion ?? estadoPago
  const enviandoRef = useRef(false)

  const handleSubmit = (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault()
    if (enviandoRef.current) return
    if (cambiar.isPending) return
    // T-05 de CHORE-03: el error del servidor del envío anterior se quita antes de enviar, para que la
    // persona lea un solo mensaje: el de este envío.
    if (cambiar.isError) cambiar.reset()

    enviandoRef.current = true
    cambiar.mutate(
      { id: alumnoId, estadoPago: elegido },
      {
        onSuccess: () => setEleccion(null),
        onSettled: () => {
          enviandoRef.current = false
        },
      },
    )
  }

  return (
    <form
      noValidate
      aria-labelledby="estado-pago-titulo"
      onSubmit={handleSubmit}
      className="flex flex-col gap-3 border-t border-border pt-3"
    >
      <h3 id="estado-pago-titulo" className="text-h3">
        {TEXTOS_USUARIO.estadoPago.titulo}
      </h3>
      {cambiar.isError && !errorQueRedirigeElCliente(cambiar.error) && (
        <MensajeError mensaje={mensajeDeErrorAdmin(cambiar.error)} />
      )}
      <div
        role="group"
        aria-labelledby="estado-pago-titulo"
        className="vidrio-fuerte w-fit rounded-card p-1"
      >
        <div className="relative grid grid-cols-2">
          <span
            aria-hidden="true"
            className={cn(
              "absolute inset-y-0 left-0 w-1/2 rounded-row bg-surface transition-transform duration-200 in-data-[material=opaco]:bg-accent-soft motion-reduce:transition-none",
              elegido === "deudor" && "translate-x-full",
            )}
          />
          {OPCIONES_ESTADO_PAGO.map((opcion) => (
            <Button
              key={opcion.valor}
              type="button"
              variant="ghost"
              size="sm"
              aria-pressed={opcion.valor === elegido}
              onClick={() => setEleccion(opcion.valor === estadoPago ? null : opcion.valor)}
              className="relative w-full aria-pressed:text-link"
            >
              {opcion.valor === elegido && <Check aria-hidden="true" />}
              {opcion.texto}
            </Button>
          ))}
        </div>
      </div>
      <Button type="submit" variant="outline" className="self-start" enEspera={cambiar.isPending}>
        {TEXTOS_USUARIO.estadoPago.guardar}
      </Button>
    </form>
  )
}
