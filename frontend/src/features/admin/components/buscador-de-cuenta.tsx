import { buscarUsuarioSchema } from "@campus/shared"
import { useState, type FormEvent } from "react"

import { MensajeError } from "@/components/mensaje-error"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

import { TEXTOS_CUENTAS } from "../data"
import { useBuscarCuenta } from "../hooks"
import { erroresPorCampoAdmin, mensajeDeErrorAdmin } from "../lib"
import type { ErroresFormularioAdmin, UsuarioAdmin } from "../types"
import { FichaDeCuenta } from "./ficha-de-cuenta"

// DEC-10, P-04: coincidencia exacta normalizada. La ficha se remonta por id de usuario: al buscar
// otra cuenta, cualquier temporal que se hubiera mostrado desaparece (DEC-19).
export function BuscadorDeCuenta() {
  const buscar = useBuscarCuenta()
  const [errores, setErrores] = useState<ErroresFormularioAdmin>({})
  // T-04 (ronda 2): la respuesta de corregir el correo reemplaza el usuario mostrado, sin volver a
  // buscar. Se limpia al pedir una búsqueda nueva, exitosa o no (T-05).
  const [usuarioCorregido, setUsuarioCorregido] = useState<UsuarioAdmin | null>(null)

  const handleSubmit = (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault()
    if (buscar.isPending) return

    const formulario = new FormData(evento.currentTarget)
    const resultado = buscarUsuarioSchema.safeParse({ email: formulario.get("correo") })
    if (!resultado.success) {
      // T-05 (ronda 2): una búsqueda rechazada en el cliente también hace desaparecer la ficha (y
      // su temporal) de la cuenta anterior: no es la cuenta que el admin está buscando ahora.
      buscar.reset()
      setUsuarioCorregido(null)
      setErrores(erroresPorCampoAdmin(resultado.error.issues))
      return
    }

    setErrores({})
    setUsuarioCorregido(null)
    buscar.mutate(resultado.data)
  }

  return (
    <div className="flex flex-col gap-4">
      <form
        noValidate
        aria-label={TEXTOS_CUENTAS.buscar.boton}
        onSubmit={handleSubmit}
        className="flex flex-col gap-4 rounded-lg border border-border bg-surface p-4"
      >
        <h2 className="font-heading text-lg font-semibold tracking-tight">
          {TEXTOS_CUENTAS.buscar.titulo}
        </h2>
        <div className="flex flex-col gap-2">
          <label htmlFor="correo-buscar" className="text-sm font-medium">
            {TEXTOS_CUENTAS.buscar.correo}
          </label>
          <Input
            id="correo-buscar"
            name="correo"
            type="email"
            autoComplete="off"
            required
            aria-invalid={errores.email !== undefined}
            aria-describedby={errores.email ? "correo-buscar-error" : undefined}
          />
          {errores.email && (
            <p id="correo-buscar-error" className="text-sm text-destructive">
              {errores.email}
            </p>
          )}
        </div>
        <Button
          type="submit"
          variant="outline"
          disabled={buscar.isPending}
          aria-busy={buscar.isPending}
        >
          {TEXTOS_CUENTAS.buscar.boton}
        </Button>
      </form>
      {buscar.isError && <MensajeError mensaje={mensajeDeErrorAdmin(buscar.error)} />}
      {buscar.isSuccess && (
        <FichaDeCuenta
          key={buscar.data.usuario.id}
          usuario={usuarioCorregido ?? buscar.data.usuario}
          onCorreoCorregido={setUsuarioCorregido}
        />
      )}
    </div>
  )
}
