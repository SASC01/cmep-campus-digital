import {
  contarLineasConContenido,
  invitacionMasivaSchema,
  LIMITE_LINEAS_INVITACION_MASIVA,
} from "@campus/shared"
import { useState, type FormEvent } from "react"

import { ErrorDeCampo } from "@/components/error-de-campo"
import { MensajeError } from "@/components/mensaje-error"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

import { ResultadoInvitacionMasiva } from "./resultado-invitacion-masiva"
import { TEXTOS_INVITACION_MASIVA } from "../data"
import { useInvitarEnLote } from "../hooks"
import { mensajeDeErrorAdmin } from "../lib"
import type { InvitacionMasivaRespuesta } from "../types"

// AUTH-03c, §D-C6: invitación masiva de maestros. "Enviar invitaciones" es la acción principal de
// la vista (primary, enEspera); "Generar enlace" pasa a outline.
export function FormularioInvitacionMasiva() {
  const invitar = useInvitarEnLote()
  const [lista, setLista] = useState("")
  const [error, setError] = useState<string | undefined>(undefined)
  const [resultado, setResultado] = useState<InvitacionMasivaRespuesta | null>(null)
  const lineas = contarLineasConContenido(lista)

  const handleSubmit = (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault()
    if (invitar.isPending) return

    const analisis = invitacionMasivaSchema.safeParse({ lista })
    if (!analisis.success) {
      setError(analisis.error.issues[0]?.message)
      return
    }

    setError(undefined)
    setResultado(null)
    invitar.mutate(analisis.data, {
      onSuccess: (respuesta) => setResultado(respuesta),
    })
  }

  return (
    <form
      noValidate
      aria-label={TEXTOS_INVITACION_MASIVA.titulo}
      onSubmit={handleSubmit}
      className="flex flex-col gap-4 rounded-panel border border-border bg-surface p-4"
    >
      <h2 className="text-h3">{TEXTOS_INVITACION_MASIVA.titulo}</h2>
      {invitar.isError && <MensajeError mensaje={mensajeDeErrorAdmin(invitar.error)} />}
      <div className="flex flex-col gap-2">
        <Label htmlFor="lista-invitacion-masiva">{TEXTOS_INVITACION_MASIVA.etiquetaLista}</Label>
        <Textarea
          id="lista-invitacion-masiva"
          name="lista"
          rows={10}
          autoComplete="off"
          spellCheck={false}
          value={lista}
          onChange={(evento) => setLista(evento.target.value)}
          placeholder={TEXTOS_INVITACION_MASIVA.ejemplo}
          aria-invalid={error !== undefined}
          aria-describedby={
            error
              ? "lista-invitacion-masiva-ayuda lista-invitacion-masiva-error"
              : "lista-invitacion-masiva-ayuda"
          }
        />
        <p id="lista-invitacion-masiva-ayuda" className="text-small text-muted-foreground">
          {TEXTOS_INVITACION_MASIVA.ayudaLista}
        </p>
        <p aria-live="polite" className="text-small text-muted-foreground">
          {TEXTOS_INVITACION_MASIVA.contador(lineas, LIMITE_LINEAS_INVITACION_MASIVA)}
        </p>
        {error && <ErrorDeCampo id="lista-invitacion-masiva-error">{error}</ErrorDeCampo>}
      </div>
      <Button type="submit" variant="primary" enEspera={invitar.isPending}>
        {TEXTOS_INVITACION_MASIVA.enviar}
      </Button>
      {resultado && <ResultadoInvitacionMasiva resultado={resultado} />}
    </form>
  )
}
