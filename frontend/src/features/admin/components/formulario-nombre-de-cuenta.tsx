import { editarNombreSchema } from "@campus/shared"
import { useEffect, useRef, useState, type FormEvent } from "react"

import { ErrorDeCampo } from "@/components/error-de-campo"
import { MensajeError } from "@/components/mensaje-error"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

import { TEXTOS_USUARIO } from "../data"
import { useEditarNombre } from "../hooks"
import {
  erroresDelNombreDeOtraPersona,
  erroresPorCampoAdmin,
  errorQueRedirigeElCliente,
  mensajeDeErrorAdmin,
  textoParaTerceros,
} from "../lib"
import type { ErroresFormularioAdmin, UsuarioAdminFila } from "../types"

interface FormularioNombreDeCuentaProps {
  cuenta: UsuarioAdminFila
}

// ADMIN-01f (§D-11, RF-58): "Editar nombre" en línea dentro de la ficha. Cerrado, solo el botón; abierto,
// el campo con el nombre de hoy, «Guardar nombre» y «Cancelar». El admin escribe el nombre de otra
// persona (autoComplete="off", textoParaTerceros). El error del servidor va en un solo MensajeError del
// formulario; lo escrito se conserva. Al guardar o cancelar, el foco vuelve a «Editar nombre».
export function FormularioNombreDeCuenta({ cuenta }: FormularioNombreDeCuentaProps) {
  const editar = useEditarNombre()
  const [abierto, setAbierto] = useState(false)
  const [errores, setErrores] = useState<ErroresFormularioAdmin>({})
  const enviandoRef = useRef(false)
  const abrirRef = useRef<HTMLButtonElement>(null)
  const nombreRef = useRef<HTMLInputElement>(null)
  const abiertoAnteriorRef = useRef(abierto)

  useEffect(() => {
    if (abiertoAnteriorRef.current === abierto) return
    abiertoAnteriorRef.current = abierto
    if (abierto) {
      nombreRef.current?.focus()
      return
    }
    abrirRef.current?.focus()
  }, [abierto])

  const cerrar = () => {
    if (editar.isPending) return
    editar.reset()
    setErrores({})
    setAbierto(false)
  }

  const handleSubmit = (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault()
    if (enviandoRef.current) return
    if (editar.isPending) return
    // T-05 de CHORE-03: el error del servidor del envío anterior se quita antes de validar, para que la
    // persona lea un solo mensaje: el de este envío.
    if (editar.isError) editar.reset()

    const formulario = new FormData(evento.currentTarget)
    const resultado = editarNombreSchema.safeParse({ nombre: formulario.get("nombre") })
    if (!resultado.success) {
      setErrores(erroresDelNombreDeOtraPersona(erroresPorCampoAdmin(resultado.error.issues)))
      return
    }

    setErrores({})
    enviandoRef.current = true
    editar.mutate(
      { id: cuenta.id, datos: resultado.data },
      {
        onSuccess: () => setAbierto(false),
        onSettled: () => {
          enviandoRef.current = false
        },
      },
    )
  }

  if (!abierto) {
    return (
      <Button
        ref={abrirRef}
        type="button"
        variant="outline"
        className="self-start"
        onClick={() => setAbierto(true)}
      >
        {TEXTOS_USUARIO.editarNombre.titulo}
      </Button>
    )
  }

  return (
    <form
      noValidate
      aria-labelledby="editar-nombre-titulo"
      onSubmit={handleSubmit}
      className="flex flex-col gap-3 rounded-panel border border-border bg-surface p-4"
    >
      <h3 id="editar-nombre-titulo" className="text-h3">
        {TEXTOS_USUARIO.editarNombre.titulo}
      </h3>
      {editar.isError && !errorQueRedirigeElCliente(editar.error) && (
        <MensajeError mensaje={textoParaTerceros(mensajeDeErrorAdmin(editar.error))} />
      )}
      <div className="flex flex-col gap-2">
        <Label htmlFor="nombre-de-cuenta">{TEXTOS_USUARIO.editarNombre.nombre}</Label>
        <Input
          ref={nombreRef}
          id="nombre-de-cuenta"
          name="nombre"
          type="text"
          autoComplete="off"
          defaultValue={cuenta.nombre}
          required
          aria-invalid={errores.nombre !== undefined}
          aria-describedby={errores.nombre ? "nombre-de-cuenta-error" : undefined}
        />
        {errores.nombre && (
          <ErrorDeCampo id="nombre-de-cuenta-error">{errores.nombre}</ErrorDeCampo>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="submit" variant="outline" enEspera={editar.isPending}>
          {TEXTOS_USUARIO.editarNombre.guardar}
        </Button>
        <Button type="button" variant="ghost" onClick={cerrar}>
          {TEXTOS_USUARIO.editarNombre.cancelar}
        </Button>
      </div>
    </form>
  )
}
