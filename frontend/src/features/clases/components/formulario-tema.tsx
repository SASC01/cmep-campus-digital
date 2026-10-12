import { crearTemaSchema, normalizarTextoLargo } from "@campus/shared"
import { useEffect, useId, useRef, useState, type FormEvent } from "react"

import { ErrorDeCampo } from "@/components/error-de-campo"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

import { TEXTOS_TEMAS } from "../data"
import { useCrearTema, useRenombrarTema } from "../hooks"
import { erroresDelTemaDeApi, erroresPorCampo } from "../lib"
import type { ErroresFormulario } from "../types"

interface FormularioTemaProps {
  claseId: string
  // Sin `temaId` crea un tema nuevo; con él, lo renombra.
  temaId?: string | undefined
  nombreInicial?: string | undefined
  // Se llama al guardar o al cancelar; quien abrió el formulario devuelve el foco a su botón.
  onTerminar: () => void
}

// §D-11: crear un tema o renombrarlo, en línea (sin diálogo). Un solo botón de envío ("Crear tema" o
// "Guardar nombre", en espera hasta que la lista nueva ya llegó) y "Cancelar". Valida con el mismo
// esquema que el servidor; un nombre vacío, largo o repetido se muestra bajo el campo. Al abrirse, el
// foco va al campo.
export function FormularioTema({
  claseId,
  temaId,
  nombreInicial = "",
  onTerminar,
}: FormularioTemaProps) {
  const crear = useCrearTema(claseId)
  const renombrar = useRenombrarTema(claseId)
  const idNombre = useId()
  const [nombre, setNombre] = useState(nombreInicial)
  const [errores, setErrores] = useState<ErroresFormulario>({})
  const campoRef = useRef<HTMLInputElement>(null)
  const esRenombrar = temaId !== undefined
  const guardando = crear.isPending || renombrar.isPending
  // M-01 y M-02 (revisión de la ronda 1): se marca de forma síncrona antes de `mutate` y se libera al
  // asentarse. Mientras está marcada no sale un segundo envío y "Cancelar" no actúa: cerrar el
  // formulario con la petición en vuelo diría que nada se guardó, y el tema se crea o se renombra igual.
  const enviandoRef = useRef(false)

  useEffect(() => {
    campoRef.current?.focus()
  }, [])

  const alFallar = (error: unknown) => {
    const delCampo = erroresDelTemaDeApi(error)
    if (delCampo !== null) setErrores(delCampo)
  }

  const handleCancelar = () => {
    if (enviandoRef.current) return
    onTerminar()
  }

  const handleSubmit = (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault()
    if (enviandoRef.current) return
    const resultado = crearTemaSchema.safeParse({ nombre: normalizarTextoLargo(nombre) })
    if (!resultado.success) {
      setErrores(erroresPorCampo(resultado.error.issues))
      return
    }
    setErrores({})
    enviandoRef.current = true
    const opciones = {
      onSuccess: onTerminar,
      onError: alFallar,
      onSettled: () => {
        enviandoRef.current = false
      },
    }
    if (esRenombrar) {
      renombrar.mutate({ temaId, nombre: resultado.data.nombre }, opciones)
      return
    }
    crear.mutate(resultado.data, opciones)
  }

  return (
    <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-3">
      <div className="flex flex-col gap-2">
        <Label htmlFor={idNombre}>{TEXTOS_TEMAS.campoNombre}</Label>
        <Input
          ref={campoRef}
          id={idNombre}
          name="nombre"
          autoComplete="off"
          value={nombre}
          onChange={(evento) => setNombre(evento.target.value)}
          aria-invalid={errores.nombre !== undefined}
          aria-describedby={errores.nombre ? `${idNombre}-error` : undefined}
        />
        {errores.nombre && <ErrorDeCampo id={`${idNombre}-error`}>{errores.nombre}</ErrorDeCampo>}
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="submit" variant="outline" size="sm" enEspera={guardando}>
          {esRenombrar ? TEXTOS_TEMAS.guardarNombre : TEXTOS_TEMAS.crear}
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={handleCancelar}>
          {TEXTOS_TEMAS.cancelar}
        </Button>
      </div>
    </form>
  )
}
