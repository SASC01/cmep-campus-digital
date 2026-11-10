import { useEffect, useRef, useState } from "react"

import { focoPerdido } from "@/components/foco/lib"
import { MensajeError } from "@/components/mensaje-error"
import { Button } from "@/components/ui/button"

import { TEXTOS_USUARIO } from "../data"
import { useCambiarAcceso, useCambiarActivo } from "../hooks"
import { errorQueRedirigeElCliente, mensajeDeErrorAdmin } from "../lib"
import type { FocoPendiente, ParDeAcciones, UsuarioAdminFila } from "../types"
import { DialogoDarDeBaja } from "./dialogo-dar-de-baja"
import { DialogoRestringirAcceso } from "./dialogo-restringir-acceso"

interface AccionesDeCuentaProps {
  cuenta: UsuarioAdminFila
}

// ADMIN-01f (§D-11, DH-06, DH-09): «Dar de baja» (diálogo) o «Reactivar» (sin diálogo), salvo en la
// cuenta de administración; y, para alumnos, «Restringir acceso» (diálogo) o «Restablecer acceso» (sin
// diálogo). Los dos sin diálogo esperan con enEspera y una guarda con ref, y su error va en un solo
// MensajeError. Foco (matriz): al cerrarse un diálogo, o cuando el botón que tenía el foco desaparece
// porque la acción salió bien, va al botón de su par que quede («Dar de baja» o «Reactivar»; «Restringir
// acceso» o «Restablecer acceso»), nunca a <body>; si la persona ya está en otro control, no se mueve.
export function AccionesDeCuenta({ cuenta }: AccionesDeCuentaProps) {
  const reactivar = useCambiarActivo()
  const restablecerAcceso = useCambiarAcceso()
  const [dialogo, setDialogo] = useState<ParDeAcciones | null>(null)
  // A qué par vuelve el foco y cuando la ficha traiga qué estado (se lee después de cada render, no en
  // un callback: el diálogo se cierra antes de que llegue la ficha renovada).
  const focoPendienteRef = useRef<FocoPendiente | null>(null)
  const reactivandoRef = useRef(false)
  const restableciendoRef = useRef(false)
  const actividadRef = useRef<HTMLButtonElement>(null)
  const accesoRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const pendiente = focoPendienteRef.current
    if (pendiente === null) return
    if (pendiente.activo !== cuenta.activo) return
    if (pendiente.accesoRestringido !== cuenta.accesoRestringido) return
    focoPendienteRef.current = null
    if (!focoPerdido(document)) return
    const destino = pendiente.par === "actividad" ? actividadRef.current : accesoRef.current
    destino?.focus()
  })

  const volverElFocoA = (par: ParDeAcciones, cambio: Partial<Omit<FocoPendiente, "par">> = {}) => {
    focoPendienteRef.current = {
      par,
      activo: cuenta.activo,
      accesoRestringido: cuenta.accesoRestringido,
      ...cambio,
    }
  }

  const cerrarDialogo = () => {
    if (dialogo !== null) volverElFocoA(dialogo)
    setDialogo(null)
  }

  const dialogoHecho = (cambio: Partial<Omit<FocoPendiente, "par">>) => {
    if (dialogo !== null) volverElFocoA(dialogo, cambio)
    setDialogo(null)
  }

  const handleReactivar = () => {
    if (reactivandoRef.current) return
    reactivandoRef.current = true
    reactivar.mutate(
      { id: cuenta.id, activo: true },
      {
        onSuccess: () => volverElFocoA("actividad", { activo: true }),
        onSettled: () => {
          reactivandoRef.current = false
        },
      },
    )
  }

  const handleRestablecerAcceso = () => {
    if (restableciendoRef.current) return
    restableciendoRef.current = true
    restablecerAcceso.mutate(
      { id: cuenta.id, datos: { restringido: false } },
      {
        onSuccess: () => volverElFocoA("acceso", { accesoRestringido: false }),
        onSettled: () => {
          restableciendoRef.current = false
        },
      },
    )
  }

  const esAlumno = cuenta.rol === "estudiante"

  return (
    <div className="flex flex-col gap-3">
      {reactivar.isError && !errorQueRedirigeElCliente(reactivar.error) && (
        <MensajeError mensaje={mensajeDeErrorAdmin(reactivar.error)} />
      )}
      {restablecerAcceso.isError && !errorQueRedirigeElCliente(restablecerAcceso.error) && (
        <MensajeError mensaje={mensajeDeErrorAdmin(restablecerAcceso.error)} />
      )}
      <div className="flex flex-wrap gap-2">
        {cuenta.rol !== "admin" && cuenta.activo && (
          <Button
            ref={actividadRef}
            type="button"
            variant="destructive"
            onClick={() => setDialogo("actividad")}
          >
            {TEXTOS_USUARIO.baja.boton}
          </Button>
        )}
        {cuenta.rol !== "admin" && !cuenta.activo && (
          <Button
            ref={actividadRef}
            type="button"
            variant="outline"
            onClick={handleReactivar}
            enEspera={reactivar.isPending}
          >
            {TEXTOS_USUARIO.reactivar.boton}
          </Button>
        )}
        {esAlumno && cuenta.accesoRestringido === false && (
          <Button
            ref={accesoRef}
            type="button"
            variant="outline"
            onClick={() => setDialogo("acceso")}
          >
            {TEXTOS_USUARIO.restringir.boton}
          </Button>
        )}
        {esAlumno && cuenta.accesoRestringido === true && (
          <Button
            ref={accesoRef}
            type="button"
            variant="outline"
            onClick={handleRestablecerAcceso}
            enEspera={restablecerAcceso.isPending}
          >
            {TEXTOS_USUARIO.restablecerAcceso.boton}
          </Button>
        )}
      </div>
      {dialogo === "actividad" && (
        <DialogoDarDeBaja
          cuenta={cuenta}
          onCerrar={cerrarDialogo}
          onHecho={() => dialogoHecho({ activo: false })}
        />
      )}
      {dialogo === "acceso" && (
        <DialogoRestringirAcceso
          cuenta={cuenta}
          onCerrar={cerrarDialogo}
          onHecho={() => dialogoHecho({ accesoRestringido: true })}
        />
      )}
    </div>
  )
}
