import { useEffect, useId, useRef, useState, type FormEvent } from "react"

import { ErrorDeCampo } from "@/components/error-de-campo"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

import { TEXTOS_CALIFICAR } from "../data"
import { useCalificarEntrega } from "../hooks"
import {
  cuerpoDeCalificacion,
  erroresDeCalificacionDeApi,
  esConflictoDeCalificacion,
  estadoInicialDelPanel,
  sePuedeCalificar,
  totalDelPanel,
} from "../lib"
import type {
  CalificarEntrega,
  EntregaDeAlumno,
  ErroresFormulario,
  EstadoDelPanel,
  TareaDeApertura,
  TareaDetalle,
} from "../types"

interface FormularioDeCalificacionProps {
  claseId: string
  tareaId: string
  alumnoId: string
  tarea: TareaDetalle
  entrega: EntregaDeAlumno
  onConflicto: (error: unknown) => Promise<void>
  onCalificada: () => void
}

// Quita el error de un campo al escribir en él (el de un envío anterior ya no describe lo escrito).
const sinElError = (errores: ErroresFormulario, clave: string): ErroresFormulario => {
  if (errores[clave] === undefined) return errores
  return Object.fromEntries(Object.entries(errores).filter(([llave]) => llave !== clave))
}

// §D-12.5 (Enmienda 1, N-03 y M-02). El formulario nace cuando la entrega se puede calificar: la
// versión de la entrega, los puntos y la rúbrica de la tarea, y lo escrito salen de sus
// inicializadores perezosos, al montarse. Ninguna recarga de fondo los cambia: si otra persona cambió
// algo, el guardado recibe un 409 y la vista recarga y reinicia el panel. Las etiquetas dicen los
// puntos de apertura, los mismos que viajan en el cuerpo.
function FormularioDeCalificacion({
  claseId,
  tareaId,
  alumnoId,
  tarea,
  entrega,
  onConflicto,
  onCalificada,
}: FormularioDeCalificacionProps) {
  const calificar = useCalificarEntrega(claseId, tareaId, alumnoId)
  const [apertura] = useState(() => {
    const deLaTarea: TareaDeApertura = { puntos: tarea.puntos, rubrica: tarea.rubrica }
    return {
      version: entrega.version,
      habiaCalificacion: entrega.calificacion !== null,
      tarea: deLaTarea,
    }
  })
  const [estado, setEstado] = useState<EstadoDelPanel>(() =>
    estadoInicialDelPanel(apertura.tarea, entrega),
  )
  const [errores, setErrores] = useState<ErroresFormulario>({})
  // La espera del botón dura el envío y, tras un 409, la recarga de la vista; la ref es la guarda
  // síncrona (un doble clic o un Enter repetido mandan un solo PUT).
  const [enviando, setEnviando] = useState(false)
  const enviandoRef = useRef(false)
  const formularioRef = useRef<HTMLFormElement>(null)
  const idBase = useId()
  const { rubrica } = apertura.tarea
  const conRubrica = rubrica.length > 0
  const ordenDeCampos = [
    ...rubrica.map((criterio) => `puntajes.${criterio.id}`),
    "calificacion",
    "comentario",
  ]

  const enfocarPrimerError = (nuevos: ErroresFormulario) => {
    const primero = ordenDeCampos.find((clave) => nuevos[clave] !== undefined)
    if (primero === undefined) return
    // Cada campo lleva como name su llave de error.
    const campo = formularioRef.current?.elements.namedItem(primero)
    if (campo instanceof HTMLElement) campo.focus()
  }

  const cambiar = (clave: string, siguiente: (previo: EstadoDelPanel) => EstadoDelPanel) => {
    setEstado(siguiente)
    setErrores((previos) => sinElError(previos, clave))
  }

  const enviar = async (cuerpo: CalificarEntrega) => {
    enviandoRef.current = true
    setEnviando(true)
    try {
      await calificar.mutateAsync({ cuerpo, habiaCalificacion: apertura.habiaCalificacion })
      onCalificada()
    } catch (falla) {
      // El aviso lo da el gancho. Un 409 lo resuelve la vista (recarga y reinicio); un error de un
      // campo se pinta bajo ese campo (si el panel no tiene ese campo, el gancho lo avisa, T-02).
      if (esConflictoDeCalificacion(falla)) {
        await onConflicto(falla)
        return
      }
      const deCampo = erroresDeCalificacionDeApi(falla, rubrica)
      if (deCampo === null) return
      setErrores(deCampo)
      enfocarPrimerError(deCampo)
    } finally {
      enviandoRef.current = false
      setEnviando(false)
    }
  }

  const handleSubmit = (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault()
    if (enviandoRef.current) return
    const resultado = cuerpoDeCalificacion(estado, apertura.tarea, apertura.version)
    if (!resultado.ok) {
      setErrores(resultado.errores)
      enfocarPrimerError(resultado.errores)
      return
    }
    setErrores({})
    void enviar(resultado.datos)
  }

  const total = totalDelPanel(estado, apertura.tarea)
  const idComentario = `${idBase}-comentario`
  const idAyudaDelComentario = `${idComentario}-ayuda`
  const errorDelComentario = errores.comentario
  const errorDeLaCalificacion = errores.calificacion
  const idCalificacion = `${idBase}-calificacion`

  return (
    <form ref={formularioRef} noValidate onSubmit={handleSubmit} className="flex flex-col gap-4">
      {rubrica.map((criterio, indice) => {
        const clave = `puntajes.${criterio.id}`
        const id = `${idBase}-criterio-${String(indice)}`
        const error = errores[clave]
        return (
          <div key={criterio.id} className="flex flex-col gap-2">
            <Label htmlFor={id} className="wrap-anywhere">
              {TEXTOS_CALIFICAR.campoCriterio(criterio.criterio, criterio.puntosMax)}
            </Label>
            <Input
              id={id}
              name={clave}
              type="text"
              inputMode="decimal"
              autoComplete="off"
              value={estado.puntajes[criterio.id] ?? ""}
              onChange={(evento) => {
                const valor = evento.target.value
                cambiar(clave, (previo) => ({
                  ...previo,
                  puntajes: { ...previo.puntajes, [criterio.id]: valor },
                }))
              }}
              aria-invalid={error !== undefined}
              aria-describedby={error === undefined ? undefined : `${id}-error`}
            />
            {error !== undefined && <ErrorDeCampo id={`${id}-error`}>{error}</ErrorDeCampo>}
          </div>
        )
      })}
      {conRubrica && (
        <p className="text-small text-muted-foreground">
          {TEXTOS_CALIFICAR.total(
            total.suma,
            total.sumaDeMaximos,
            total.calificacion,
            apertura.tarea.puntos,
          )}
        </p>
      )}
      {!conRubrica && (
        <div className="flex flex-col gap-2">
          <Label htmlFor={idCalificacion}>
            {TEXTOS_CALIFICAR.campoCalificacion(apertura.tarea.puntos)}
          </Label>
          <Input
            id={idCalificacion}
            name="calificacion"
            type="text"
            inputMode="decimal"
            autoComplete="off"
            value={estado.calificacion}
            onChange={(evento) => {
              const valor = evento.target.value
              cambiar("calificacion", (previo) => ({ ...previo, calificacion: valor }))
            }}
            aria-invalid={errorDeLaCalificacion !== undefined}
            aria-describedby={
              errorDeLaCalificacion === undefined ? undefined : `${idCalificacion}-error`
            }
          />
          {errorDeLaCalificacion !== undefined && (
            <ErrorDeCampo id={`${idCalificacion}-error`}>{errorDeLaCalificacion}</ErrorDeCampo>
          )}
        </div>
      )}
      <div className="flex flex-col gap-2">
        <Label htmlFor={idComentario}>{TEXTOS_CALIFICAR.campoComentario}</Label>
        <Textarea
          id={idComentario}
          name="comentario"
          rows={3}
          autoComplete="off"
          value={estado.comentario}
          onChange={(evento) => {
            const valor = evento.target.value
            cambiar("comentario", (previo) => ({ ...previo, comentario: valor }))
          }}
          aria-invalid={errorDelComentario !== undefined}
          aria-describedby={
            errorDelComentario === undefined
              ? idAyudaDelComentario
              : `${idAyudaDelComentario} ${idComentario}-error`
          }
        />
        <p id={idAyudaDelComentario} className="text-small text-muted-foreground">
          {TEXTOS_CALIFICAR.ayudaComentario}
        </p>
        {errorDelComentario !== undefined && (
          <ErrorDeCampo id={`${idComentario}-error`}>{errorDelComentario}</ErrorDeCampo>
        )}
      </div>
      <div>
        <Button type="submit" variant="primary" enEspera={enviando}>
          {apertura.habiaCalificacion
            ? TEXTOS_CALIFICAR.actualizar
            : TEXTOS_CALIFICAR.calificarYDevolver}
        </Button>
      </div>
    </form>
  )
}

interface PanelDeCalificacionProps {
  claseId: string
  tareaId: string
  alumnoId: string
  tarea: TareaDetalle
  entrega: EntregaDeAlumno
  // Tras un 409 de calificar: la vista recarga y, si puede, reinicia el panel.
  onConflicto: (error: unknown) => Promise<void>
  // Tras calificar: la vista reinicia el panel (la caché ya tiene la respuesta).
  onCalificada: () => void
  // Al reiniciarse, el panel lleva el foco a su encabezado.
  enfocarAlMontar: boolean
}

// CALIFICACIONES-01c (§D-12.5, DESIGN.md §7.26): el panel "Calificación" de la entrega de un alumno,
// para sus maestros. Con la entrega calificable, el formulario (con la nota de entrega cerrada si el
// alumno no entregó, P-03 c′); si no, solo la frase de cuándo se podrá calificar. Su encabezado recibe
// el foco cada vez que la vista lo reinicia (tras calificar o tras un 409), también si el panel pasa a
// la frase.
export function PanelDeCalificacion({
  claseId,
  tareaId,
  alumnoId,
  tarea,
  entrega,
  onConflicto,
  onCalificada,
  enfocarAlMontar,
}: PanelDeCalificacionProps) {
  const encabezadoRef = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    if (enfocarAlMontar) encabezadoRef.current?.focus()
  }, [enfocarAlMontar])

  const calificable = sePuedeCalificar(entrega, tarea, new Date())
  const conNota = calificable && entrega.estado === "asignado"

  return (
    <Card>
      <CardContent className="flex flex-col gap-4">
        <h3 ref={encabezadoRef} tabIndex={-1} className="text-h3">
          {TEXTOS_CALIFICAR.titulo}
        </h3>
        {/* M-06: el formulario ocupa siempre la misma posición entre los hijos, aparezca o no la
            nota. Si cambiara de lugar, una recarga de fondo (por ejemplo, la entrega pasa de
            "asignado" a "calificado" porque otro maestro la calificó) lo volvería a montar: se
            perdería lo escrito y la versión de apertura, y el guardado no recibiría el 409. */}
        {conNota && (
          <p className="text-small text-muted-foreground">{TEXTOS_CALIFICAR.notaSinEntrega}</p>
        )}
        {!calificable && (
          <p className="text-small text-muted-foreground">{TEXTOS_CALIFICAR.podrasCalificar}</p>
        )}
        {calificable && (
          <FormularioDeCalificacion
            claseId={claseId}
            tareaId={tareaId}
            alumnoId={alumnoId}
            tarea={tarea}
            entrega={entrega}
            onConflicto={onConflicto}
            onCalificada={onCalificada}
          />
        )}
      </CardContent>
    </Card>
  )
}
