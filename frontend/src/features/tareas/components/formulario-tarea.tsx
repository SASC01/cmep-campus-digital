import { Check, Paperclip } from "lucide-react"
import { useEffect, useId, useRef, useState, type ChangeEvent, type FormEvent } from "react"
import { Link } from "react-router"
import { toast } from "sonner"

import { ACCEPT_DE_ADJUNTOS, TEXTOS_ADJUNTOS } from "@/components/adjuntos/data"
import { useSolicitarSubida } from "@/components/adjuntos/hooks"
import {
  avisoDeFalloAlSubir,
  errorDeArchivoElegido,
  tipoDeArchivo,
} from "@/components/adjuntos/lib"
import { ListaDeAdjuntosElegidos } from "@/components/adjuntos/lista-de-adjuntos-elegidos"
import { Cargando } from "@/components/cargando"
import { ErrorDeCampo } from "@/components/error-de-campo"
import { MensajeError } from "@/components/mensaje-error"
import { Button } from "@/components/ui/button"
import { buttonVariants } from "@/components/ui/button-variants"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { subirArchivo } from "@/services/almacenService"

import { CLASES_DE_POSICION_DEL_INDICADOR, TEXTOS_FORMULARIO_TAREA } from "../data"
import { useCategoriasDeLaClase, useTemasDeLaClase } from "../hooks"
import {
  cuerpoDeTarea,
  erroresConLlavesDeFila,
  erroresDeLaTareaDeApi,
  erroresSinFilasQuitadas,
  esTareaModificada,
  estadoInicialDelFormulario,
  mensajeDeErrorTareas,
  puntosDeLaTarea,
} from "../lib"
import type {
  Categoria,
  CrearTarea,
  ErroresFormulario,
  EstadoDelFormulario,
  TareaDetalle,
  Tema,
} from "../types"
import { EditorDeRubrica } from "./editor-de-rubrica"
import { ListaDeAdjuntosPublicados } from "./lista-de-adjuntos-publicados"

interface FormularioTareaProps {
  claseId: string
  // La tarea que se edita; null al crear.
  tarea: TareaDetalle | null
  // A dónde lleva "Cancelar": el muro al crear, el detalle al editar.
  cancelarA: string
  pendiente: boolean
  // Envía el cuerpo (con sus archivoIds) y navega al terminar; si falla, rechaza y el formulario marca
  // el campo del error. El aviso de los demás errores lo da el hook de la mutación. La versión es la
  // de la tarea con que se abrió el formulario (null al crear; ENTREGAS-01a, P-05 a′).
  onGuardar: (datos: CrearTarea, versionDeApertura: number | null) => Promise<void>
  // ENTREGAS-01a (§D-8.3.3): ante 409 TAREA_MODIFICADA, la vista de edición recarga la tarea y reinicia
  // el formulario. Mientras tanto la guarda sigue marcada y "Guardar cambios" sigue en espera.
  onConflicto?: () => Promise<void>
  // ENTREGAS-01a (§D-8.3.5): tras un reinicio por conflicto, el foco va a "Título" al montar.
  enfocarAlMontar?: boolean
}

interface CamposDelFormularioProps extends FormularioTareaProps {
  categorias: readonly Categoria[]
  temas: readonly Tema[]
}

function CamposDelFormulario({
  claseId,
  tarea,
  cancelarA,
  pendiente,
  onGuardar,
  onConflicto,
  enfocarAlMontar = false,
  categorias,
  temas,
}: CamposDelFormularioProps) {
  const solicitar = useSolicitarSubida(claseId)
  const idBase = useId()
  const [escrito, setEstado] = useState<EstadoDelFormulario>(() =>
    estadoInicialDelFormulario(tarea),
  )
  // ENTREGAS-01a (P-05 a′, §D-8.2): la versión nace con el estado, al montar, y ninguna recarga
  // posterior la cambia: se edita sobre la versión con que se abrió (DESIGN.md §7.21).
  const [versionDeApertura] = useState(() => (tarea === null ? null : tarea.version))
  // T-08: la categoría o el tema elegidos que ya no están en la lista de la clase (porque se pidió de
  // nuevo tras un 404) dejan el campo en su opción vacía; el navegador nunca conserva en silencio una
  // opción que ya no existe.
  const estado: EstadoDelFormulario = {
    ...escrito,
    categoriaId: categorias.some(({ id }) => id === escrito.categoriaId) ? escrito.categoriaId : "",
    temaId: temas.some(({ id }) => id === escrito.temaId) ? escrito.temaId : "",
  }
  const [publicados, setPublicados] = useState(() => (tarea === null ? [] : tarea.adjuntos))
  const [elegidos, setElegidos] = useState<readonly File[]>([])
  const [errores, setErrores] = useState<ErroresFormulario>({})
  const [errorDeArchivos, setErrorDeArchivos] = useState<string | null>(null)
  const [enProceso, setEnProceso] = useState(false)
  const tituloRef = useRef<HTMLInputElement>(null)
  const selectorRef = useRef<HTMLInputElement>(null)
  const adjuntarRef = useRef<HTMLButtonElement>(null)
  const listaRef = useRef<HTMLDivElement>(null)
  // Se marca de forma síncrona antes del primer await y se libera en el finally: mientras está
  // marcada, la lista de archivos no cambia (se envía exactamente la que se ve) y no hay doble envío.
  const guardandoRef = useRef(false)
  // Las filas de la rúbrica que hay ahora (T-10): la respuesta de un envío llega después de que se
  // pudieron quitar filas.
  const filasVigentesRef = useRef(escrito.rubrica)
  // Posición, entre todos los "Quitar" de archivos (publicados y luego elegidos), a la que va el foco
  // cuando la lista ya se pintó sin el archivo quitado.
  const focoTrasQuitarRef = useRef<number | null>(null)
  const esEdicion = tarea !== null
  const hayCategorias = categorias.length > 0
  const idTitulo = `${idBase}-titulo`
  const idInstrucciones = `${idBase}-instrucciones`
  const idFecha = `${idBase}-fecha`
  const idPuntos = `${idBase}-puntos`
  const idCategoria = `${idBase}-categoria`
  const idTema = `${idBase}-tema`
  const idArchivos = `${idBase}-archivos`

  useEffect(() => {
    const posicion = focoTrasQuitarRef.current
    if (posicion === null) return
    focoTrasQuitarRef.current = null
    const controles = listaRef.current?.querySelectorAll<HTMLElement>(
      "[data-quitar-publicado], [data-quitar-indice]",
    )
    const total = controles?.length ?? 0
    const vecino = controles?.item(Math.min(posicion, total - 1))
    if (vecino) {
      vecino.focus()
      return
    }
    adjuntarRef.current?.focus()
  }, [publicados, elegidos])

  useEffect(() => {
    filasVigentesRef.current = escrito.rubrica
  }, [escrito.rubrica])

  // §D-8.3.5: el reinicio por conflicto quita el control que tenía el foco; este efecto corre antes que
  // los de la vista (useFocoAlPerderseElControl), así que el foco nunca cae en <body>. En la primera
  // apertura no se mueve.
  useEffect(() => {
    if (!enfocarAlMontar) return
    tituloRef.current?.focus()
  }, [enfocarAlMontar])

  const cambiar = (cambios: Partial<EstadoDelFormulario>) => setEstado({ ...estado, ...cambios })

  const handleElegir = (evento: ChangeEvent<HTMLInputElement>) => {
    const seleccion = evento.target.files
    if (seleccion === null) return
    const nuevos = Array.from(seleccion)
    evento.target.value = ""
    if (guardandoRef.current) return
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
    if (guardandoRef.current) return
    setPublicados(publicados.filter((_, i) => i !== indice))
    setErrorDeArchivos(null)
    focoTrasQuitarRef.current = indice
  }

  const handleQuitarElegido = (indice: number) => {
    if (guardandoRef.current) return
    setElegidos(elegidos.filter((_, i) => i !== indice))
    setErrorDeArchivos(null)
    focoTrasQuitarRef.current = publicados.length + indice
  }

  const handleGuardar = async (
    datos: CrearTarea,
    filasEnviadas: EstadoDelFormulario["rubrica"],
  ) => {
    guardandoRef.current = true
    setEnProceso(true)
    let archivoEnSubida: string | null = null
    try {
      const archivoIds: string[] = publicados.map((adjunto) => adjunto.id)
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
      await onGuardar({ ...datos, archivoIds }, versionDeApertura)
    } catch (error) {
      if (archivoEnSubida !== null) {
        toast.error(avisoDeFalloAlSubir(error, archivoEnSubida, mensajeDeErrorTareas))
        return
      }
      // §D-8.3.3: el aviso ya lo dio el hook; la vista recarga la tarea dentro de este try, así que la
      // guarda y la espera del botón siguen hasta que la recarga termina (refetch no lanza).
      if (esTareaModificada(error)) {
        await onConflicto?.()
        return
      }
      // Falló al guardar: el aviso ya lo dio el hook; aquí solo se marca el campo, si el error es de
      // un campo.
      const erroresDeCampo = erroresDeLaTareaDeApi(error)
      // T-10: una fila que se quitó mientras el envío estaba en vuelo ya no puede mostrar su error:
      // pasa a ser el error de la rúbrica.
      if (erroresDeCampo) {
        setErrores(
          erroresSinFilasQuitadas(
            erroresConLlavesDeFila(erroresDeCampo, filasEnviadas),
            filasVigentesRef.current,
          ),
        )
      }
    } finally {
      guardandoRef.current = false
      setEnProceso(false)
    }
  }

  const handleSubmit = (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault()
    if (guardandoRef.current || pendiente) return
    const resultado = cuerpoDeTarea(estado, categorias.length)
    if (!resultado.ok) {
      setErrores(erroresConLlavesDeFila(resultado.errores, estado.rubrica))
      return
    }
    setErrores({})
    void handleGuardar(resultado.datos, estado.rubrica)
  }

  const tituloDelFormulario = esEdicion
    ? TEXTOS_FORMULARIO_TAREA.tituloEditar
    : TEXTOS_FORMULARIO_TAREA.tituloCrear
  const textoDelBoton = esEdicion
    ? TEXTOS_FORMULARIO_TAREA.guardar
    : TEXTOS_FORMULARIO_TAREA.publicar
  const mostrarElige = hayCategorias && estado.categoriaId === ""

  return (
    <Card>
      <CardContent>
        <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-4">
          <h2 className="text-h2">{tituloDelFormulario}</h2>

          <div className="flex flex-col gap-2">
            <Label htmlFor={idTitulo}>{TEXTOS_FORMULARIO_TAREA.campoTitulo}</Label>
            <Input
              ref={tituloRef}
              id={idTitulo}
              name="titulo"
              autoComplete="off"
              value={estado.titulo}
              onChange={(evento) => cambiar({ titulo: evento.target.value })}
              aria-invalid={errores.titulo !== undefined}
              aria-describedby={errores.titulo ? `${idTitulo}-error` : undefined}
            />
            {errores.titulo && (
              <ErrorDeCampo id={`${idTitulo}-error`}>{errores.titulo}</ErrorDeCampo>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor={idInstrucciones}>{TEXTOS_FORMULARIO_TAREA.campoInstrucciones}</Label>
            <Textarea
              id={idInstrucciones}
              name="instrucciones"
              rows={5}
              autoComplete="off"
              value={estado.instrucciones}
              onChange={(evento) => cambiar({ instrucciones: evento.target.value })}
              aria-invalid={errores.instrucciones !== undefined}
              aria-describedby={errores.instrucciones ? `${idInstrucciones}-error` : undefined}
            />
            {errores.instrucciones && (
              <ErrorDeCampo id={`${idInstrucciones}-error`}>{errores.instrucciones}</ErrorDeCampo>
            )}
          </div>

          <div className="flex flex-wrap items-start gap-x-4 gap-y-4">
            <div className="flex min-w-56 flex-1 flex-col gap-2">
              <Label htmlFor={idFecha}>{TEXTOS_FORMULARIO_TAREA.campoFecha}</Label>
              <Input
                id={idFecha}
                name="fechaLimite"
                type="datetime-local"
                autoComplete="off"
                value={estado.fechaLimite}
                onChange={(evento) => cambiar({ fechaLimite: evento.target.value })}
                aria-invalid={errores.fechaLimite !== undefined}
                aria-describedby={
                  errores.fechaLimite ? `${idFecha}-ayuda ${idFecha}-error` : `${idFecha}-ayuda`
                }
              />
              <p id={`${idFecha}-ayuda`} className="text-small text-muted-foreground">
                {TEXTOS_FORMULARIO_TAREA.ayudaFecha}
              </p>
              {errores.fechaLimite && (
                <ErrorDeCampo id={`${idFecha}-error`}>{errores.fechaLimite}</ErrorDeCampo>
              )}
            </div>
            <div className="flex w-40 flex-col gap-2">
              <Label htmlFor={idPuntos}>{TEXTOS_FORMULARIO_TAREA.campoPuntos}</Label>
              <Input
                id={idPuntos}
                name="puntos"
                type="number"
                inputMode="numeric"
                autoComplete="off"
                value={estado.puntos}
                onChange={(evento) => cambiar({ puntos: evento.target.value })}
                aria-invalid={errores.puntos !== undefined}
                aria-describedby={errores.puntos ? `${idPuntos}-error` : undefined}
              />
              {errores.puntos && (
                <ErrorDeCampo id={`${idPuntos}-error`}>{errores.puntos}</ErrorDeCampo>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-start gap-x-4 gap-y-4">
            <div className="flex min-w-56 flex-1 flex-col gap-2">
              <Label htmlFor={idCategoria}>{TEXTOS_FORMULARIO_TAREA.campoCategoria}</Label>
              <NativeSelect
                id={idCategoria}
                name="categoriaId"
                autoComplete="off"
                value={estado.categoriaId}
                onChange={(evento) => cambiar({ categoriaId: evento.target.value })}
                aria-invalid={errores.categoriaId !== undefined}
                aria-describedby={errores.categoriaId ? `${idCategoria}-error` : undefined}
              >
                {!hayCategorias && (
                  <NativeSelectOption value="">
                    {TEXTOS_FORMULARIO_TAREA.sinCategoria}
                  </NativeSelectOption>
                )}
                {mostrarElige && (
                  <NativeSelectOption value="">
                    {TEXTOS_FORMULARIO_TAREA.eligeCategoria}
                  </NativeSelectOption>
                )}
                {categorias.map((categoria) => (
                  <NativeSelectOption key={categoria.id} value={categoria.id}>
                    {TEXTOS_FORMULARIO_TAREA.opcionDeCategoria(categoria.nombre, categoria.peso)}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
              {errores.categoriaId && (
                <ErrorDeCampo id={`${idCategoria}-error`}>{errores.categoriaId}</ErrorDeCampo>
              )}
            </div>
            <div className="flex min-w-56 flex-1 flex-col gap-2">
              <Label htmlFor={idTema}>{TEXTOS_FORMULARIO_TAREA.campoTema}</Label>
              <NativeSelect
                id={idTema}
                name="temaId"
                autoComplete="off"
                value={estado.temaId}
                onChange={(evento) => cambiar({ temaId: evento.target.value })}
                aria-invalid={errores.temaId !== undefined}
                aria-describedby={errores.temaId ? `${idTema}-error` : undefined}
              >
                <NativeSelectOption value="">{TEXTOS_FORMULARIO_TAREA.sinTema}</NativeSelectOption>
                {temas.map((tema) => (
                  <NativeSelectOption key={tema.id} value={tema.id}>
                    {tema.nombre}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
              {errores.temaId && (
                <ErrorDeCampo id={`${idTema}-error`}>{errores.temaId}</ErrorDeCampo>
              )}
            </div>
          </div>

          {/* ENTREGAS-01a (P-03 a), DESIGN.md §7.3: "Cómo se entrega", el mismo control segmentado de
              dos botones que el de entregas tardías, justo antes de él. */}
          <div className="flex flex-col gap-2">
            <p id={`${idBase}-como-se-entrega`} className="text-body font-bold text-foreground">
              {TEXTOS_FORMULARIO_TAREA.grupoComoSeEntrega}
            </p>
            <div
              role="group"
              aria-labelledby={`${idBase}-como-se-entrega`}
              aria-describedby={
                errores.requiereAdjuntos ? `${idBase}-como-se-entrega-error` : undefined
              }
              className="vidrio-fuerte w-fit rounded-card p-1"
            >
              <div className="relative grid grid-cols-2">
                <span
                  aria-hidden="true"
                  className={cn(
                    "absolute inset-y-0 left-0 w-1/2 rounded-row bg-surface transition-transform duration-200 in-data-[material=opaco]:bg-accent-soft motion-reduce:transition-none",
                    CLASES_DE_POSICION_DEL_INDICADOR[estado.requiereAdjuntos ? 0 : 1],
                  )}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  aria-pressed={estado.requiereAdjuntos}
                  onClick={() => cambiar({ requiereAdjuntos: true })}
                  className="relative w-full aria-pressed:text-link"
                >
                  {estado.requiereAdjuntos && <Check aria-hidden="true" />}
                  {TEXTOS_FORMULARIO_TAREA.conArchivosOEnlaces}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  aria-pressed={!estado.requiereAdjuntos}
                  onClick={() => cambiar({ requiereAdjuntos: false })}
                  className="relative w-full aria-pressed:text-link"
                >
                  {!estado.requiereAdjuntos && <Check aria-hidden="true" />}
                  {TEXTOS_FORMULARIO_TAREA.marcarComoCompletada}
                </Button>
              </div>
            </div>
            {/* El campo está en CAMPOS_DEL_FORMULARIO: un VALIDACION del servidor se muestra aquí. */}
            {errores.requiereAdjuntos && (
              <ErrorDeCampo id={`${idBase}-como-se-entrega-error`}>
                {errores.requiereAdjuntos}
              </ErrorDeCampo>
            )}
          </div>

          {/* S-13, DESIGN.md §7.3: control segmentado de dos botones, como el del tipo de publicación.
              El estado lo dicen aria-pressed, el Check y el color del texto, nunca solo la posición. */}
          <div className="flex flex-col gap-2">
            <p id={`${idBase}-tardias`} className="text-body font-bold text-foreground">
              {TEXTOS_FORMULARIO_TAREA.grupoEntregasTardias}
            </p>
            <div
              role="group"
              aria-labelledby={`${idBase}-tardias`}
              className="vidrio-fuerte w-fit rounded-card p-1"
            >
              <div className="relative grid grid-cols-2">
                <span
                  aria-hidden="true"
                  className={cn(
                    "absolute inset-y-0 left-0 w-1/2 rounded-row bg-surface transition-transform duration-200 in-data-[material=opaco]:bg-accent-soft motion-reduce:transition-none",
                    CLASES_DE_POSICION_DEL_INDICADOR[estado.aceptaTardias ? 0 : 1],
                  )}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  aria-pressed={estado.aceptaTardias}
                  onClick={() => cambiar({ aceptaTardias: true })}
                  className="relative w-full aria-pressed:text-link"
                >
                  {estado.aceptaTardias && <Check aria-hidden="true" />}
                  {TEXTOS_FORMULARIO_TAREA.aceptarConRetraso}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  aria-pressed={!estado.aceptaTardias}
                  onClick={() => cambiar({ aceptaTardias: false })}
                  className="relative w-full aria-pressed:text-link"
                >
                  {!estado.aceptaTardias && <Check aria-hidden="true" />}
                  {TEXTOS_FORMULARIO_TAREA.noAceptar}
                </Button>
              </div>
            </div>
          </div>

          <EditorDeRubrica
            idBase={`${idBase}-rubrica`}
            criterios={estado.rubrica}
            puntosDeLaTarea={puntosDeLaTarea(estado.puntos)}
            errores={errores}
            onCambiar={(rubrica) => cambiar({ rubrica })}
          />

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
            {publicados.length > 0 && (
              <ListaDeAdjuntosPublicados adjuntos={publicados} onQuitar={handleQuitarPublicado} />
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
            <Button type="submit" variant="primary" enEspera={enProceso || pendiente}>
              {textoDelBoton}
            </Button>
            <Link to={cancelarA} className={buttonVariants({ variant: "outline" })}>
              {TEXTOS_FORMULARIO_TAREA.cancelar}
            </Link>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

// §D-10, DESIGN.md §7.21: el formulario para crear o editar una tarea. Pide primero las categorías y los
// temas de la clase (error → cargando → formulario). Valida con el mismo esquema que el servidor
// (cuerpoDeTarea) antes de enviar; los archivos se solicitan, se suben directo al almacén y solo
// entonces se guarda la tarea con sus ids (los ya publicados que siguen, más los nuevos).
export function FormularioTarea(props: FormularioTareaProps) {
  const categorias = useCategoriasDeLaClase(props.claseId)
  const temas = useTemasDeLaClase(props.claseId)

  // Con las listas ya cargadas, una recarga que falla no desmonta el formulario (se perdería lo
  // escrito): sigue con las últimas que se tuvieron.
  if (!categorias.data || !temas.data) {
    if (categorias.isError || temas.isError) {
      return <MensajeError mensaje={TEXTOS_FORMULARIO_TAREA.errorOpciones} />
    }
    return <Cargando texto={TEXTOS_FORMULARIO_TAREA.cargandoOpciones} />
  }

  return (
    <CamposDelFormulario
      {...props}
      categorias={categorias.data.categorias}
      temas={temas.data.temas}
    />
  )
}
