import { FileText, Paperclip } from "lucide-react"
import { useEffect, useId, useRef, useState, type ChangeEvent, type FormEvent } from "react"
import { Link } from "react-router"
import { toast } from "sonner"

import { ErrorDeCampo } from "@/components/error-de-campo"
import { Button } from "@/components/ui/button"
import { buttonVariants } from "@/components/ui/button-variants"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { Textarea } from "@/components/ui/textarea"
import { formatearTamano } from "@/lib/format"
import { subirArchivo } from "@/services/almacenService"

import { ACCEPT_DE_ADJUNTOS, TEXTOS_ADJUNTOS, TEXTOS_FORMULARIO_RECURSO } from "../data"
import { useCrearRecurso, useEditarRecurso, useSolicitarSubida, useTemasDelRecurso } from "../hooks"
import {
  avisoDeFalloAlSubir,
  errorDeArchivoElegido,
  erroresDelRecursoDeApi,
  esRecursoModificado,
  recursoEditadoValidado,
  recursoNuevoValidado,
  temaVigente,
  tipoDeArchivo,
} from "../lib"
import type { EnvioDelRecurso, ErroresFormulario, RecursoDetalle } from "../types"
import { ListaDeAdjuntosElegidos } from "./lista-de-adjuntos-elegidos"

interface FormularioRecursoCrearProps {
  modo: "crear"
  claseId: string
  // La frase del bloque al que va el recurso ("Se publicará en Recursos del docente." o "… de
  // aprendizaje."); la elige la vista por su perspectiva.
  destino: string
}

interface FormularioRecursoEditarProps {
  modo: "editar"
  claseId: string
  // El recurso tal como se abrió: su versión es la de apertura (§7.21) y ninguna recarga posterior la
  // cambia; tras un 409 la vista lo vuelve a montar con la versión actual.
  recurso: RecursoDetalle
  // A dónde lleva "Cancelar".
  cancelarA: string
  // Tras guardar: la vista navega a "Recursos" si sigue montada.
  onGuardado: () => void
  // Ante 409 RECURSO_MODIFICADO, la vista vuelve a pedir el recurso y reinicia el formulario. Mientras
  // tanto la guarda sigue marcada y "Guardar cambios" sigue en espera.
  onConflicto: () => Promise<void>
  // Tras un reinicio por conflicto, el foco va a "Título del recurso" al montar.
  enfocarAlMontar: boolean
}

// CLASES-03d (§D-8.5, DESIGN.md §7.30): "Nuevo recurso" y "Editar recurso", un solo formulario con dos
// modos. Campos: "Título del recurso", "Tema" (solo si la lista de temas de la clase llegó y tiene temas;
// en crear, si falló, una nota en línea), "Descripción (opcional)" y los adjuntos (al editar, los
// publicados con "Quitar"). Valida en local con el esquema del servidor; el título vacío o sin contenido
// visible dice "Escribe el título del recurso" en los dos modos (Enmienda 10). Cada archivo se solicita, se
// sube directo al almacén y solo entonces se guarda el recurso con sus ids. "Publicar recurso" o "Guardar
// cambios" sigue en espera desde la primera subida hasta la respuesta; la guarda síncrona evita un
// segundo envío. Un error del título o de la descripción va bajo su campo; los demás los avisa el gancho.
export function FormularioRecurso(
  props: FormularioRecursoCrearProps | FormularioRecursoEditarProps,
) {
  const { claseId } = props
  const edicion = props.modo === "editar" ? props : null
  const crear = useCrearRecurso(claseId)
  const editar = useEditarRecurso(claseId)
  const solicitar = useSolicitarSubida(claseId)
  // T-02 y T-03: al editar, solo una lista de temas pedida después de abrir el formulario decide que el
  // tema del recurso "ya no está" (useTemasDelRecurso).
  const { temas, lista: listaVigente } = useTemasDelRecurso(claseId, edicion !== null)
  const idBase = useId()
  const [titulo, setTitulo] = useState(() => edicion?.recurso.titulo ?? "")
  const [texto, setTexto] = useState(() => edicion?.recurso.texto ?? "")
  const [temaElegido, setTemaElegido] = useState(() => edicion?.recurso.tema?.id ?? "")
  // §7.21: la versión nace con el estado, al montar, y ninguna recarga posterior la cambia.
  const [versionDeApertura] = useState(() => edicion?.recurso.version ?? null)
  const [publicados, setPublicados] = useState(() =>
    edicion === null ? [] : edicion.recurso.adjuntos,
  )
  const [elegidos, setElegidos] = useState<readonly File[]>([])
  const [errores, setErrores] = useState<ErroresFormulario>({})
  const [errorDeArchivos, setErrorDeArchivos] = useState<string | null>(null)
  const [enProceso, setEnProceso] = useState(false)
  const tituloRef = useRef<HTMLInputElement>(null)
  const selectorRef = useRef<HTMLInputElement>(null)
  const adjuntarRef = useRef<HTMLButtonElement>(null)
  const listaRef = useRef<HTMLDivElement>(null)
  // T-38: se marca de forma síncrona, antes del primer await, y se libera en el finally. Mientras está
  // marcada, la lista de archivos no cambia (se envía exactamente la que se ve) y no hay doble envío.
  const publicandoRef = useRef(false)
  // Posición, entre todos los "Quitar" de archivos (publicados y luego elegidos), a la que va el foco
  // cuando la lista ya se pintó sin el archivo quitado.
  const focoTrasQuitarRef = useRef<number | null>(null)
  const enfocarAlMontar = edicion?.enfocarAlMontar === true
  const idTitulo = `${idBase}-titulo`
  const idTexto = `${idBase}-texto`
  const idTema = `${idBase}-tema`
  const idArchivos = `${idBase}-archivos`
  const hayTemas = listaVigente !== undefined && listaVigente.length > 0
  const temaIdEfectivo = temaVigente(temaElegido, listaVigente)
  const temasFallidos = edicion === null && temas.isError && temas.data === undefined
  const pendiente = enProceso || crear.isPending || editar.isPending

  useEffect(() => {
    const posicion = focoTrasQuitarRef.current
    if (posicion === null) return
    focoTrasQuitarRef.current = null
    const controles = listaRef.current?.querySelectorAll<HTMLElement>(
      "[data-quitar-publicado], [data-quitar-indice]",
    )
    const vecino = controles?.item(Math.min(posicion, controles.length - 1))
    if (vecino) {
      vecino.focus()
      return
    }
    adjuntarRef.current?.focus()
  }, [publicados, elegidos])

  // §7.21: el reinicio por conflicto quita el control que tenía el foco; el foco va a "Título del
  // recurso". En la primera apertura no se mueve.
  useEffect(() => {
    if (!enfocarAlMontar) return
    tituloRef.current?.focus()
  }, [enfocarAlMontar])

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
      const error = errorDeArchivoElegido(archivo, publicados.length + acumulados.length)
      if (error === null) {
        acumulados = [...acumulados, archivo]
        continue
      }
      primerError ??= error
    }
    setElegidos(acumulados)
    setErrorDeArchivos(primerError)
  }

  // DESIGN.md §7.14: el foco pasa al "Quitar" que ocupa el lugar del archivo quitado (o al anterior si
  // era el último) y, sin archivos, a "Adjuntar archivos". Nunca a <body>.
  const handleQuitarPublicado = (indice: number) => {
    if (publicandoRef.current) return
    setPublicados(publicados.filter((_, i) => i !== indice))
    setErrorDeArchivos(null)
    focoTrasQuitarRef.current = indice
  }

  const handleQuitarElegido = (indice: number) => {
    if (publicandoRef.current) return
    setElegidos(elegidos.filter((_, i) => i !== indice))
    setErrorDeArchivos(null)
    focoTrasQuitarRef.current = publicados.length + indice
  }

  const handleEnviar = async (envio: EnvioDelRecurso) => {
    publicandoRef.current = true
    setEnProceso(true)
    let archivoEnSubida: string | null = null
    try {
      const nuevos: string[] = []
      for (const archivo of elegidos) {
        archivoEnSubida = archivo.name
        const { archivo: creado, subida } = await solicitar.mutateAsync({
          nombre: archivo.name,
          tipo: tipoDeArchivo(archivo),
          tamano: archivo.size,
        })
        await subirArchivo(subida, archivo)
        nuevos.push(creado.id)
      }
      archivoEnSubida = null
      if (envio.modo === "crear") {
        // C-22: la clave archivoIds va siempre, [] si no hay adjuntos.
        await crear.mutateAsync({
          ...envio.datos,
          archivoIds: [...envio.datos.archivoIds, ...nuevos],
        })
        setTitulo("")
        setTexto("")
        setTemaElegido("")
        setElegidos([])
        return
      }
      if (edicion === null) return
      await editar.mutateAsync({
        recursoId: edicion.recurso.id,
        datos: { ...envio.datos, archivoIds: [...envio.datos.archivoIds, ...nuevos] },
      })
      edicion.onGuardado()
    } catch (error) {
      if (archivoEnSubida !== null) {
        toast.error(avisoDeFalloAlSubir(error, archivoEnSubida))
        return
      }
      // §7.21: el aviso ya lo dio el gancho; la vista vuelve a pedir el recurso dentro de este try, así
      // que la guarda y la espera del botón siguen hasta que la recarga termina (refetch no lanza).
      if (edicion !== null && esRecursoModificado(error)) {
        await edicion.onConflicto()
        return
      }
      // Falló al guardar: el aviso ya lo dio el gancho; aquí solo se marca el campo, si es de un campo.
      const erroresDeCampo = erroresDelRecursoDeApi(error, envio.modo)
      if (erroresDeCampo) setErrores(erroresDeCampo)
    } finally {
      publicandoRef.current = false
      setEnProceso(false)
    }
  }

  const handleSubmit = (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault()
    if (publicandoRef.current || crear.isPending || editar.isPending) return
    // T-31: se mide lo que el servidor va a medir (normalizado), sin reescribir los campos visibles. La
    // validación local reemplaza el error del servidor que vivía en `errores` (CLAUDE.md › Formularios).
    const campos = { titulo, texto, temaId: temaIdEfectivo }
    if (edicion === null) {
      const resultado = recursoNuevoValidado(campos)
      if (!resultado.ok) {
        setErrores(resultado.errores)
        return
      }
      setErrores({})
      void handleEnviar({ modo: "crear", datos: resultado.datos })
      return
    }
    // Al editar la versión de apertura siempre existe (nace con el recurso).
    if (versionDeApertura === null) return
    const resultado = recursoEditadoValidado(
      campos,
      publicados.map(({ id }) => id),
      versionDeApertura,
    )
    if (!resultado.ok) {
      setErrores(resultado.errores)
      return
    }
    setErrores({})
    void handleEnviar({ modo: "editar", datos: resultado.datos })
  }

  const tituloDelFormulario =
    edicion === null
      ? TEXTOS_FORMULARIO_RECURSO.tituloCrear
      : TEXTOS_FORMULARIO_RECURSO.tituloEditar
  const textoDelBoton =
    edicion === null ? TEXTOS_FORMULARIO_RECURSO.publicar : TEXTOS_FORMULARIO_RECURSO.guardar

  return (
    <Card>
      <CardContent>
        <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <h2 className="text-h2">{tituloDelFormulario}</h2>
            {props.modo === "crear" && (
              <p className="text-small text-muted-foreground">{props.destino}</p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor={idTitulo}>{TEXTOS_FORMULARIO_RECURSO.campoTitulo}</Label>
            <Input
              ref={tituloRef}
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

          {hayTemas && (
            <div className="flex flex-col gap-2">
              <Label htmlFor={idTema}>{TEXTOS_FORMULARIO_RECURSO.campoTema}</Label>
              <NativeSelect
                id={idTema}
                name="temaId"
                autoComplete="off"
                value={temaIdEfectivo}
                onChange={(evento) => setTemaElegido(evento.target.value)}
              >
                <NativeSelectOption value="">
                  {TEXTOS_FORMULARIO_RECURSO.sinTema}
                </NativeSelectOption>
                {listaVigente.map((tema) => (
                  <NativeSelectOption key={tema.id} value={tema.id}>
                    {tema.nombre}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </div>
          )}
          {temasFallidos && (
            <p className="text-small text-muted-foreground">
              {TEXTOS_FORMULARIO_RECURSO.temasNoCargados}
            </p>
          )}

          <div className="flex flex-col gap-2">
            <Label htmlFor={idTexto}>{TEXTOS_FORMULARIO_RECURSO.campoDescripcion}</Label>
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
            {/* §7.21: los adjuntos ya publicados, al editar; "Quitar" solo cambia estado local y el
                archivo sale del recurso al guardar. */}
            {publicados.length > 0 && (
              <ul aria-label={TEXTOS_ADJUNTOS.adjuntos} className="flex flex-col gap-2">
                {publicados.map((adjunto, indice) => (
                  <li
                    key={adjunto.id}
                    className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-row bg-muted px-3 py-2"
                  >
                    <FileText aria-hidden="true" className="size-4 shrink-0 text-foreground" />
                    <span className="min-w-0 flex-1 wrap-anywhere text-small font-bold text-foreground">
                      {adjunto.nombre}
                    </span>
                    <span className="text-small text-muted-foreground">
                      {formatearTamano(adjunto.tamano)}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      data-quitar-publicado={indice}
                      onClick={() => handleQuitarPublicado(indice)}
                    >
                      {TEXTOS_ADJUNTOS.quitar} <span className="sr-only">{adjunto.nombre}</span>
                    </Button>
                  </li>
                ))}
              </ul>
            )}
            {elegidos.length > 0 && (
              <ListaDeAdjuntosElegidos archivos={elegidos} onQuitar={handleQuitarElegido} />
            )}
            {enProceso && (
              <p role="status" className="text-small text-muted-foreground">
                {TEXTOS_ADJUNTOS.listaFija}
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" variant="primary" enEspera={pendiente}>
              {textoDelBoton}
            </Button>
            {edicion !== null && (
              <Link to={edicion.cancelarA} className={buttonVariants({ variant: "outline" })}>
                {TEXTOS_FORMULARIO_RECURSO.cancelar}
              </Link>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
