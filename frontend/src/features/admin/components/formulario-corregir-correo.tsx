import { corregirCorreoSchema } from "@campus/shared"
import { useState, type FormEvent } from "react"

import { MensajeError } from "@/components/mensaje-error"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

import { TEXTOS_CUENTAS } from "../data"
import { useCorregirCorreo } from "../hooks"
import { erroresPorCampoAdmin, mensajeDeErrorAdmin } from "../lib"
import type { ErroresFormularioAdmin, UsuarioAdmin } from "../types"

interface FormularioCorregirCorreoProps {
  usuario: UsuarioAdmin
  onCorregido: (usuario: UsuarioAdmin) => void
}

// DEC-10: corrige un correo mal escrito. No revoca sesiones (S-06); sí revoca los enlaces vivos
// (se enviaron a la dirección equivocada), del lado del servidor.
export function FormularioCorregirCorreo({ usuario, onCorregido }: FormularioCorregirCorreoProps) {
  const corregir = useCorregirCorreo()
  const [errores, setErrores] = useState<ErroresFormularioAdmin>({})

  const handleSubmit = (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault()
    if (corregir.isPending) return

    const formulario = new FormData(evento.currentTarget)
    const resultado = corregirCorreoSchema.safeParse({ email: formulario.get("correo") })
    if (!resultado.success) {
      setErrores(erroresPorCampoAdmin(resultado.error.issues))
      return
    }

    setErrores({})
    // T-04 (ronda 2): la ficha muestra el correo nuevo en cuanto el servidor lo confirma.
    corregir.mutate({ id: usuario.id, datos: resultado.data }, { onSuccess: onCorregido })
  }

  return (
    <form
      noValidate
      aria-label={TEXTOS_CUENTAS.ficha.guardarCorreo}
      onSubmit={handleSubmit}
      className="flex flex-col gap-2 border-t border-border pt-3"
    >
      <p className="text-sm font-medium">{TEXTOS_CUENTAS.ficha.corregirCorreo}</p>
      {corregir.isError && <MensajeError mensaje={mensajeDeErrorAdmin(corregir.error)} />}
      {corregir.isSuccess && (
        <p role="status" className="text-sm text-success">
          {TEXTOS_CUENTAS.ficha.correoActualizado}
        </p>
      )}
      <div className="flex flex-col gap-2">
        <label htmlFor="correo-corregir" className="text-sm font-medium">
          {TEXTOS_CUENTAS.ficha.correoCorrecto}
        </label>
        <Input
          id="correo-corregir"
          name="correo"
          type="email"
          autoComplete="off"
          required
          aria-invalid={errores.email !== undefined}
          aria-describedby={errores.email ? "correo-corregir-error" : undefined}
        />
        {errores.email && (
          <p id="correo-corregir-error" className="text-sm text-destructive">
            {errores.email}
          </p>
        )}
      </div>
      <Button
        type="submit"
        variant="outline"
        disabled={corregir.isPending}
        aria-busy={corregir.isPending}
      >
        {TEXTOS_CUENTAS.ficha.guardarCorreo}
      </Button>
      <p className="text-sm text-muted-foreground">{TEXTOS_CUENTAS.ficha.notaCorregir}</p>
    </form>
  )
}
