import { crearClaseAdminSchema, crearClaseSchema, normalizarTextoLargo } from "@campus/shared"
import { useState, type FormEvent } from "react"
import { Link, useNavigate } from "react-router"
import { toast } from "sonner"

import { ErrorDeCampo } from "@/components/error-de-campo"
import { Button } from "@/components/ui/button"
import { buttonVariants } from "@/components/ui/button-variants"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"

import { TEXTOS_FORMULARIO_CLASE } from "../data"
import { useCrearClase, useEditarClase } from "../hooks"
import { erroresDeFormularioClases, erroresPorCampo, mensajeDeErrorClases } from "../lib"
import type { CandidatoMaestro, ErroresFormulario, MaestroDeLista } from "../types"
import { SelectorDeMaestros } from "./selector-de-maestros"

interface FormularioClaseProps {
  modo: "crear" | "editar"
  claseId?: string
  valoresIniciales?: { nombre: string; descripcion: string | null }
}

// El texto del campo, ya normalizado (CRLF y CR a LF, recorte) antes de validarlo con el esquema
// (§D-2C5; la misma regla que aplica el servidor). Un valor que no es texto se deja igual para que
// el esquema lo rechace.
const descripcionNormalizada = (valor: FormDataEntryValue | null): unknown =>
  typeof valor === "string" ? normalizarTextoLargo(valor) : valor

// Un solo formulario para crear y editar (§D-A5, §D-2C2): crear y editar una clase son del
// administrador. Al crear, suma el selector de uno o dos maestros (crearClaseAdminSchema); al
// editar, la validación en cliente usa crearClaseSchema (misma forma que editarClaseSchema).
// autoComplete="off": el administrador captura datos de otra persona, no los suyos.
export function FormularioClase({ modo, claseId, valoresIniciales }: FormularioClaseProps) {
  const crear = useCrearClase()
  const editar = useEditarClase()
  const mutacion = modo === "crear" ? crear : editar
  const navigate = useNavigate()
  const [errores, setErrores] = useState<ErroresFormulario>({})
  const [elegidos, setElegidos] = useState<MaestroDeLista[]>([])

  const alElegir = (maestro: CandidatoMaestro) => {
    setElegidos((actuales) => [...actuales, maestro])
    setErrores((actuales) =>
      Object.fromEntries(Object.entries(actuales).filter(([campo]) => campo !== "maestroIds")),
    )
  }

  const alQuitar = (maestro: MaestroDeLista) => {
    setElegidos((actuales) => actuales.filter((elegido) => elegido.id !== maestro.id))
  }

  const alTerminar = async (id: string) => {
    toast.success(
      modo === "crear"
        ? TEXTOS_FORMULARIO_CLASE.avisoCreada
        : TEXTOS_FORMULARIO_CLASE.avisoGuardada,
    )
    await navigate(`/admin/clases/${id}`)
  }

  // T-17 (ronda 2 del tester): el error del servidor se asocia al campo que nombra, no siempre a
  // "nombre". T-19 (ronda 3 del tester): un error que no es de un campo (500, sin conexión,
  // SIN_ACCESO_A_LA_CLASE, MAESTRO_NO_ENCONTRADO) no marca ningún campo como inválido; se avisa como
  // error del formulario.
  const alFallar = (error: unknown) => {
    const erroresDeCampo = erroresDeFormularioClases(error, ["nombre", "descripcion", "maestroIds"])
    if (erroresDeCampo) {
      setErrores(erroresDeCampo)
      return
    }
    toast.error(mensajeDeErrorClases(error))
  }

  const handleSubmit = (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault()
    if (mutacion.isPending) return

    const formulario = new FormData(evento.currentTarget)
    const campos = {
      nombre: formulario.get("nombre"),
      descripcion: descripcionNormalizada(formulario.get("descripcion")),
    }

    if (modo === "crear") {
      const resultado = crearClaseAdminSchema.safeParse({
        ...campos,
        maestroIds: elegidos.map((maestro) => maestro.id),
      })
      if (!resultado.success) {
        setErrores(erroresPorCampo(resultado.error.issues))
        return
      }
      setErrores({})
      crear.mutate(resultado.data, {
        onSuccess: (respuesta) => alTerminar(respuesta.clase.id),
        onError: alFallar,
      })
      return
    }

    // Sin id de clase no hay nada que editar: el id llega al mutar, sin valor de respaldo.
    if (claseId === undefined) return
    const resultado = crearClaseSchema.safeParse(campos)
    if (!resultado.success) {
      setErrores(erroresPorCampo(resultado.error.issues))
      return
    }
    setErrores({})
    editar.mutate(
      { claseId, datos: resultado.data },
      { onSuccess: (respuesta) => alTerminar(respuesta.clase.id), onError: alFallar },
    )
  }

  return (
    <Card>
      <CardHeader>
        <h1 className="text-h1">
          {modo === "crear"
            ? TEXTOS_FORMULARIO_CLASE.tituloCrear
            : TEXTOS_FORMULARIO_CLASE.tituloEditar}
        </h1>
      </CardHeader>
      <CardContent>
        <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <Label htmlFor="nombre">{TEXTOS_FORMULARIO_CLASE.campoNombre}</Label>
            <Input
              id="nombre"
              name="nombre"
              autoComplete="off"
              defaultValue={valoresIniciales?.nombre}
              aria-invalid={errores.nombre !== undefined}
              aria-describedby={errores.nombre ? "nombre-clase-error" : undefined}
            />
            {errores.nombre && (
              <ErrorDeCampo id="nombre-clase-error">{errores.nombre}</ErrorDeCampo>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="descripcion">{TEXTOS_FORMULARIO_CLASE.campoDescripcion}</Label>
            <Textarea
              id="descripcion"
              name="descripcion"
              rows={4}
              autoComplete="off"
              defaultValue={valoresIniciales?.descripcion ?? ""}
              aria-invalid={errores.descripcion !== undefined}
              aria-describedby={errores.descripcion ? "descripcion-clase-error" : undefined}
            />
            {errores.descripcion && (
              <ErrorDeCampo id="descripcion-clase-error">{errores.descripcion}</ErrorDeCampo>
            )}
          </div>
          {modo === "crear" && (
            <SelectorDeMaestros
              elegidos={elegidos}
              onElegir={alElegir}
              onQuitar={alQuitar}
              error={errores.maestroIds}
            />
          )}
          <div className="flex gap-3">
            <Button type="submit" variant="primary" enEspera={mutacion.isPending}>
              {modo === "crear"
                ? TEXTOS_FORMULARIO_CLASE.botonCrear
                : TEXTOS_FORMULARIO_CLASE.botonGuardar}
            </Button>
            <Link
              to={modo === "crear" ? "/admin/clases" : `/admin/clases/${claseId}`}
              className={buttonVariants({ variant: "outline" })}
            >
              {TEXTOS_FORMULARIO_CLASE.cancelar}
            </Link>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
