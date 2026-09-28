import { invitarMaestroSchema } from "@campus/shared"
import { useState, type FormEvent } from "react"

import { ErrorDeCampo } from "@/components/error-de-campo"
import { MensajeError } from "@/components/mensaje-error"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

import { TEXTOS_CUENTAS } from "../data"
import { useInvitarMaestro } from "../hooks"
import { erroresPorCampoAdmin, mensajeDeErrorAdmin } from "../lib"
import type { ErroresFormularioAdmin } from "../types"

// DEC-11, DEC-19: alta de maestros por invitación (RF-04b). El rol lo fija el servidor.
export function FormularioInvitarMaestro() {
  const invitar = useInvitarMaestro()
  const [errores, setErrores] = useState<ErroresFormularioAdmin>({})

  const handleSubmit = (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault()
    if (invitar.isPending) return

    const formulario = evento.currentTarget
    const datosFormulario = new FormData(formulario)
    const resultado = invitarMaestroSchema.safeParse({
      nombre: datosFormulario.get("nombre"),
      email: datosFormulario.get("correo"),
    })
    if (!resultado.success) {
      setErrores(erroresPorCampoAdmin(resultado.error.issues))
      return
    }

    setErrores({})
    invitar.mutate(resultado.data, { onSuccess: () => formulario.reset() })
  }

  return (
    <form
      noValidate
      aria-label={TEXTOS_CUENTAS.invitar.boton}
      onSubmit={handleSubmit}
      className="flex flex-col gap-4 rounded-panel border border-border bg-surface p-4"
    >
      <h2 className="text-h3">{TEXTOS_CUENTAS.invitar.titulo}</h2>
      {invitar.isError && <MensajeError mensaje={mensajeDeErrorAdmin(invitar.error)} />}
      {invitar.isSuccess && (
        <p role="status" className="text-small text-success">
          {TEXTOS_CUENTAS.invitar.exito(invitar.data.nombre)}
        </p>
      )}
      <div className="flex flex-col gap-2">
        <Label htmlFor="nombre-maestro">{TEXTOS_CUENTAS.invitar.nombre}</Label>
        <Input
          id="nombre-maestro"
          name="nombre"
          type="text"
          autoComplete="off"
          required
          aria-invalid={errores.nombre !== undefined}
          aria-describedby={errores.nombre ? "nombre-maestro-error" : undefined}
        />
        {errores.nombre && <ErrorDeCampo id="nombre-maestro-error">{errores.nombre}</ErrorDeCampo>}
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="correo-maestro">{TEXTOS_CUENTAS.invitar.correo}</Label>
        <Input
          id="correo-maestro"
          name="correo"
          type="email"
          autoComplete="off"
          required
          aria-invalid={errores.email !== undefined}
          aria-describedby={errores.email ? "correo-maestro-error" : undefined}
        />
        {errores.email && <ErrorDeCampo id="correo-maestro-error">{errores.email}</ErrorDeCampo>}
      </div>
      <Button type="submit" variant="primary" enEspera={invitar.isPending}>
        {TEXTOS_CUENTAS.invitar.boton}
      </Button>
    </form>
  )
}
