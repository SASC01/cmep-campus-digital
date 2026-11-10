import { altaAlumnoSchema } from "@campus/shared"
import { useEffect, useRef, useState, type FormEvent } from "react"

import { ErrorDeCampo } from "@/components/error-de-campo"
import { MensajeError } from "@/components/mensaje-error"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

import { TEXTOS_ALTA_ALUMNO } from "../data"
import { useAltaAlumno } from "../hooks"
import {
  erroresDelNombreDeOtraPersona,
  erroresPorCampoAdmin,
  esCorreoEnUso,
  errorQueRedirigeElCliente,
  focoDisponiblePara,
  mensajeDeErrorAdmin,
  textoParaTerceros,
} from "../lib"
import type { CuentaCreada, ErroresFormularioAdmin } from "../types"
import { ContrasenaTemporal } from "./contrasena-temporal"

interface FormularioAltaAlumnoProps {
  onCerrar: () => void
}

// ADMIN-01f (§D-11, P-01 a, DESIGN.md §7.13): el alta de un alumno, en línea en /admin/usuarios. El
// admin escribe los datos de otra persona: autoComplete="off" y el texto del nombre impersonal
// (textoParaTerceros). La temporal se muestra una sola vez: vive solo en el estado de este componente
// (la mutación sale de la caché al asentarse) y desaparece con «Cancelar», con un alta nueva o al salir.
// Un error del servidor se lee en un solo lugar: el correo en uso junto a "Correo"; lo demás, en el
// MensajeError del formulario.
export function FormularioAltaAlumno({ onCerrar }: FormularioAltaAlumnoProps) {
  const alta = useAltaAlumno()
  const [errores, setErrores] = useState<ErroresFormularioAdmin>({})
  const [creada, setCreada] = useState<CuentaCreada | null>(null)
  const enviandoRef = useRef(false)
  const raizRef = useRef<HTMLDivElement>(null)
  const nombreRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    nombreRef.current?.focus()
  }, [])

  const handleSubmit = (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault()
    if (enviandoRef.current) return
    if (alta.isPending) return
    // T-05 de CHORE-03: el error del servidor del envío anterior se quita antes de validar, para que la
    // persona lea un solo mensaje: el de este envío.
    if (alta.isError) alta.reset()

    const formulario = evento.currentTarget
    const datosFormulario = new FormData(formulario)
    const resultado = altaAlumnoSchema.safeParse({
      nombre: datosFormulario.get("nombre"),
      email: datosFormulario.get("correo"),
    })
    if (!resultado.success) {
      setErrores(erroresDelNombreDeOtraPersona(erroresPorCampoAdmin(resultado.error.issues)))
      return
    }

    setErrores({})
    setCreada(null)
    enviandoRef.current = true
    alta.mutate(resultado.data, {
      onSuccess: (respuesta) => {
        setCreada({
          nombre: respuesta.usuario.nombre,
          contrasena: respuesta.contrasenaTemporal,
          enfocar: focoDisponiblePara(raizRef.current, document.activeElement, document.body),
        })
        formulario.reset()
      },
      onSettled: () => {
        enviandoRef.current = false
      },
    })
  }

  const correoEnUso = alta.isError && esCorreoEnUso(alta.error)
  const errorDelFormulario = alta.isError && !correoEnUso && !errorQueRedirigeElCliente(alta.error)
  const errorDelCorreo = correoEnUso ? mensajeDeErrorAdmin(alta.error) : errores.email

  return (
    <div ref={raizRef} className="flex flex-col gap-4">
      <form
        noValidate
        aria-labelledby="alta-alumno-titulo"
        onSubmit={handleSubmit}
        className="flex flex-col gap-4 rounded-panel border border-border bg-surface p-4"
      >
        <h2 id="alta-alumno-titulo" className="text-h3">
          {TEXTOS_ALTA_ALUMNO.titulo}
        </h2>
        {errorDelFormulario && (
          <MensajeError mensaje={textoParaTerceros(mensajeDeErrorAdmin(alta.error))} />
        )}
        <div className="flex flex-col gap-2">
          <Label htmlFor="nombre-alumno">{TEXTOS_ALTA_ALUMNO.nombre}</Label>
          <Input
            ref={nombreRef}
            id="nombre-alumno"
            name="nombre"
            type="text"
            autoComplete="off"
            required
            aria-invalid={errores.nombre !== undefined}
            aria-describedby={errores.nombre ? "nombre-alumno-error" : undefined}
          />
          {errores.nombre && <ErrorDeCampo id="nombre-alumno-error">{errores.nombre}</ErrorDeCampo>}
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="correo-alumno">{TEXTOS_ALTA_ALUMNO.correo}</Label>
          <Input
            id="correo-alumno"
            name="correo"
            type="email"
            autoComplete="off"
            required
            aria-invalid={errorDelCorreo !== undefined}
            aria-describedby={errorDelCorreo ? "correo-alumno-error" : undefined}
          />
          {errorDelCorreo && <ErrorDeCampo id="correo-alumno-error">{errorDelCorreo}</ErrorDeCampo>}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="submit" variant="primary" enEspera={alta.isPending}>
            {TEXTOS_ALTA_ALUMNO.crear}
          </Button>
          <Button type="button" variant="outline" onClick={onCerrar}>
            {TEXTOS_ALTA_ALUMNO.cancelar}
          </Button>
        </div>
      </form>
      {creada !== null && (
        <ContrasenaTemporal
          key={creada.contrasena}
          contrasena={creada.contrasena}
          enfocarAlMostrar={creada.enfocar}
          encabezado={TEXTOS_ALTA_ALUMNO.creada(creada.nombre)}
        />
      )}
    </div>
  )
}
