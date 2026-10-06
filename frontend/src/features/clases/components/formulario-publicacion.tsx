import { crearPublicacionSchema, normalizarTextoLargo, type CrearPublicacion } from "@campus/shared"
import { Check, Paperclip } from "lucide-react"
import { useEffect, useId, useRef, useState, type ChangeEvent, type FormEvent } from "react"
import { toast } from "sonner"

import { ErrorDeCampo } from "@/components/error-de-campo"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { subirArchivo } from "@/services/almacenService"

import {
  ACCEPT_DE_ADJUNTOS,
  CLASES_DE_POSICION_DEL_INDICADOR,
  TEXTOS_ADJUNTOS,
  TEXTOS_FORMULARIO_PUBLICACION,
} from "../data"
import { useCrearPublicacion, useSolicitarSubida } from "../hooks"
import {
  avisoDeFalloAlSubir,
  errorDeArchivoElegido,
  erroresDeFormularioClases,
  erroresPorCampo,
  tipoDeArchivo,
} from "../lib"
import type { ErroresFormulario, TipoPublicacion } from "../types"
import { ListaDeAdjuntosElegidos } from "./lista-de-adjuntos-elegidos"

interface FormularioPublicacionProps {
  claseId: string
}

// §D-C5, §D-D5: formulario del maestro para publicar un anuncio o un material, arriba del muro. El
// tipo se elige con un control segmentado de dos botones (aria-pressed, §D-2D3); el botón principal cambia su objeto
// según el tipo. Valida con el mismo esquema que el servidor (crearPublicacionSchema) antes de
// enviar. Los archivos se eligen aquí, se validan en cliente y, al publicar, cada uno se solicita,
// se sube directo al almacén y solo entonces se publica con sus ids (siempre en `archivoIds`).
export function FormularioPublicacion({ claseId }: FormularioPublicacionProps) {
  const crear = useCrearPublicacion(claseId)
  const solicitar = useSolicitarSubida(claseId)
  const idBase = useId()
  const [tipo, setTipo] = useState<TipoPublicacion>("anuncio")
  const [titulo, setTitulo] = useState("")
  const [texto, setTexto] = useState("")
  const [elegidos, setElegidos] = useState<readonly File[]>([])
  const [errores, setErrores] = useState<ErroresFormulario>({})
  const [errorDeArchivos, setErrorDeArchivos] = useState<string | null>(null)
  const [enProceso, setEnProceso] = useState(false)
  const selectorRef = useRef<HTMLInputElement>(null)
  const adjuntarRef = useRef<HTMLButtonElement>(null)
  const listaRef = useRef<HTMLDivElement>(null)
  // T-38: handlePublicar la marca de forma síncrona, antes del primer await (el estado de React tarda
  // un render en verse en los manejadores), y la libera en el finally. Mientras está marcada, la
  // lista de archivos no cambia: se publica exactamente la que se ve.
  const publicandoRef = useRef(false)
  // Fila a la que va el foco cuando la lista ya se pintó sin la fila quitada; -1 es "Adjuntar".
  const focoTrasQuitarRef = useRef<number | null>(null)
  const esMaterial = tipo === "material"
  const idTitulo = `${idBase}-titulo`
  const idTexto = `${idBase}-texto`
  const idArchivos = `${idBase}-archivos`

  useEffect(() => {
    const vecina = focoTrasQuitarRef.current
    if (vecina === null) return
    focoTrasQuitarRef.current = null
    const control = listaRef.current?.querySelector<HTMLElement>(`[data-quitar-indice="${vecina}"]`)
    if (control) {
      control.focus()
      return
    }
    adjuntarRef.current?.focus()
  }, [elegidos])

  // El selector se reinicia tras cada elección para poder volver a elegir el mismo archivo.
  const handleElegir = (evento: ChangeEvent<HTMLInputElement>) => {
    const seleccion = evento.target.files
    if (seleccion === null) return
    const nuevos = Array.from(seleccion)
    evento.target.value = ""
    if (publicandoRef.current) return
    let acumulados = elegidos
    let primerError: string | null = null
    for (const archivo of nuevos) {
      const error = errorDeArchivoElegido(archivo, acumulados.length)
      if (error === null) {
        acumulados = [...acumulados, archivo]
        continue
      }
      primerError ??= error
    }
    setElegidos(acumulados)
    setErrorDeArchivos(primerError)
  }

  // DESIGN.md §7.14: el foco pasa a "Quitar" de la fila vecina (la que ocupa su lugar o, si era la
  // última, la anterior) y, sin filas, a "Adjuntar archivos". Nunca a <body>.
  const handleQuitar = (indice: number) => {
    if (publicandoRef.current) return
    setElegidos(elegidos.filter((_, i) => i !== indice))
    setErrorDeArchivos(null)
    focoTrasQuitarRef.current = indice < elegidos.length - 1 ? indice : indice - 1
  }

  const handlePublicar = async (datos: CrearPublicacion) => {
    publicandoRef.current = true
    setEnProceso(true)
    let archivoEnSubida: string | null = null
    try {
      const archivoIds: string[] = []
      for (const archivo of elegidos) {
        archivoEnSubida = archivo.name
        const { archivo: creado, subida } = await solicitar.mutateAsync({
          nombre: archivo.name,
          tipo: tipoDeArchivo(archivo),
          tamano: archivo.size,
        })
        await subirArchivo(subida, archivo)
        archivoIds.push(creado.id)
      }
      archivoEnSubida = null
      // C-22: la clave archivoIds va siempre, [] si no hay adjuntos.
      await crear.mutateAsync({ ...datos, archivoIds })
      setTitulo("")
      setTexto("")
      setElegidos([])
    } catch (error) {
      if (archivoEnSubida === null) {
        // Falló al publicar: el aviso ya lo dio el hook; aquí solo se marca el campo, si el error es
        // de un campo.
        const erroresDeCampo = erroresDeFormularioClases(error, ["titulo", "texto"])
        if (erroresDeCampo) setErrores(erroresDeCampo)
        return
      }
      toast.error(avisoDeFalloAlSubir(error, archivoEnSubida))
    } finally {
      publicandoRef.current = false
      setEnProceso(false)
    }
  }

  const handleSubmit = (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault()
    if (publicandoRef.current || crear.isPending) return

    // T-31: se mide lo que el servidor va a medir (normalizado), sin reescribir el campo visible.
    const textoNormalizado = normalizarTextoLargo(texto)
    const candidato = esMaterial
      ? { tipo, titulo: normalizarTextoLargo(titulo), texto: textoNormalizado }
      : { tipo, texto: textoNormalizado }
    const resultado = crearPublicacionSchema.safeParse(candidato)
    if (!resultado.success) {
      setErrores(erroresPorCampo(resultado.error.issues))
      return
    }

    setErrores({})
    void handlePublicar(resultado.data)
  }

  return (
    <Card>
      <CardContent>
        <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* §D-2D3, DESIGN.md §7.3: control segmentado. Grupo en vidrio fuerte (el formulario ya es un
              panel de vidrio, así que no va otra Card) con un indicador aria-hidden que se desliza bajo
              el botón presionado; el estado también lo dicen aria-pressed, el Check y el color del
              texto, nunca solo la posición. */}
          <div
            role="group"
            aria-label={TEXTOS_FORMULARIO_PUBLICACION.grupoTipo}
            className="vidrio-fuerte w-fit rounded-card p-1"
          >
            <div className="relative grid grid-cols-2">
              <span
                aria-hidden="true"
                className={cn(
                  "absolute inset-y-0 left-0 w-1/2 rounded-row bg-surface transition-transform duration-200 in-data-[material=opaco]:bg-accent-soft motion-reduce:transition-none",
                  CLASES_DE_POSICION_DEL_INDICADOR[esMaterial ? 1 : 0],
                )}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                aria-pressed={!esMaterial}
                onClick={() => setTipo("anuncio")}
                className="relative w-full aria-pressed:text-link"
              >
                {!esMaterial && <Check aria-hidden="true" />}
                {TEXTOS_FORMULARIO_PUBLICACION.anuncio}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                aria-pressed={esMaterial}
                onClick={() => setTipo("material")}
                className="relative w-full aria-pressed:text-link"
              >
                {esMaterial && <Check aria-hidden="true" />}
                {TEXTOS_FORMULARIO_PUBLICACION.material}
              </Button>
            </div>
          </div>

          {esMaterial && (
            <div className="flex flex-col gap-2">
              <Label htmlFor={idTitulo}>{TEXTOS_FORMULARIO_PUBLICACION.campoTitulo}</Label>
              <Input
                id={idTitulo}
                name="titulo"
                autoComplete="off"
                value={titulo}
                onChange={(evento) => setTitulo(evento.target.value)}
                aria-invalid={errores.titulo !== undefined}
                aria-describedby={errores.titulo ? `${idTitulo}-error` : undefined}
              />
              {errores.titulo && (
                <ErrorDeCampo id={`${idTitulo}-error`}>{errores.titulo}</ErrorDeCampo>
              )}
            </div>
          )}

          <div className="flex flex-col gap-2">
            <Label htmlFor={idTexto}>
              {esMaterial
                ? TEXTOS_FORMULARIO_PUBLICACION.campoDescripcion
                : TEXTOS_FORMULARIO_PUBLICACION.campoAnuncio}
            </Label>
            <Textarea
              id={idTexto}
              name="texto"
              rows={4}
              autoComplete="off"
              value={texto}
              onChange={(evento) => setTexto(evento.target.value)}
              aria-invalid={errores.texto !== undefined}
              aria-describedby={errores.texto ? `${idTexto}-error` : undefined}
            />
            {errores.texto && <ErrorDeCampo id={`${idTexto}-error`}>{errores.texto}</ErrorDeCampo>}
          </div>

          <div className="flex flex-col gap-2" ref={listaRef}>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <Button
                ref={adjuntarRef}
                type="button"
                variant="outline"
                size="sm"
                aria-describedby={idArchivos}
                onClick={() => selectorRef.current?.click()}
              >
                <Paperclip aria-hidden="true" />
                {TEXTOS_ADJUNTOS.adjuntar}
              </Button>
              <p id={idArchivos} className="text-small text-muted-foreground">
                {TEXTOS_ADJUNTOS.ayuda}
              </p>
            </div>
            <input
              ref={selectorRef}
              type="file"
              multiple
              hidden
              accept={ACCEPT_DE_ADJUNTOS}
              aria-label={TEXTOS_ADJUNTOS.adjuntar}
              onChange={handleElegir}
            />
            {errorDeArchivos !== null && (
              <ErrorDeCampo id={`${idArchivos}-error`}>{errorDeArchivos}</ErrorDeCampo>
            )}
            {elegidos.length > 0 && (
              <ListaDeAdjuntosElegidos archivos={elegidos} onQuitar={handleQuitar} />
            )}
            {enProceso && (
              <p role="status" className="text-small text-muted-foreground">
                {TEXTOS_ADJUNTOS.listaFija}
              </p>
            )}
          </div>

          <div>
            <Button type="submit" variant="primary" enEspera={enProceso || crear.isPending}>
              {esMaterial
                ? TEXTOS_FORMULARIO_PUBLICACION.publicarMaterial
                : TEXTOS_FORMULARIO_PUBLICACION.publicarAnuncio}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
