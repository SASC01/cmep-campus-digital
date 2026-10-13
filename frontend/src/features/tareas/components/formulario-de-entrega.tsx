import { Paperclip } from "lucide-react"
import { useEffect, useId, useRef, useState, type ChangeEvent, type FormEvent } from "react"
import { toast } from "sonner"

import { ACCEPT_DE_ADJUNTOS, TEXTOS_ADJUNTOS } from "@/components/adjuntos/data"
import { useSolicitarSubidaEn } from "@/components/adjuntos/hooks"
import {
  avisoDeFalloAlSubir,
  errorDeArchivoElegido,
  tipoDeArchivo,
} from "@/components/adjuntos/lib"
import { ListaDeAdjuntosElegidos } from "@/components/adjuntos/lista-de-adjuntos-elegidos"
import { ErrorDeCampo } from "@/components/error-de-campo"
import { Button } from "@/components/ui/button"
import { subirArchivo } from "@/services/almacenService"

import { TEXTOS_TU_TRABAJO } from "../data"
import { useEntregar } from "../hooks"
import { errorDeEnlacesDeApi, esEntregaVacia, mensajeDeErrorTareas, rutaDeMiEntrega } from "../lib"
import type { TareaDetalle } from "../types"
import { CampoDeEnlaces } from "./campo-de-enlaces"

interface FormularioDeEntregaProps {
  claseId: string
  tarea: Pick<TareaDetalle, "id" | "requiereAdjuntos">
  // Al entregar, "Tu trabajo" lleva el foco a su encabezado (§D-9.3).
  onEntregada: () => void
}

// ENTREGAS-01d (§D-9.3, DESIGN.md §7.24): "Adjuntar archivos" (la misma validación y ayuda de §7.19),
// los enlaces y un solo botón principal: "Entregar tarea", o "Marcar como completada" si la tarea no
// requiere adjuntos y no se agregó nada. Al entregar, cada archivo se pide por la ruta de la entrega
// (nunca por la de la clase), se sube directo al almacén con subirArchivo (sin el token) y después se
// entrega con sus ids y los enlaces. El botón está en espera desde la primera subida hasta la respuesta
// y una guarda síncrona con ref impide un segundo envío; mientras tanto la lista no cambia. Si falla
// una subida, el aviso nombra el archivo y no se entrega nada; lo elegido se conserva.
export function FormularioDeEntrega({ claseId, tarea, onEntregada }: FormularioDeEntregaProps) {
  const solicitar = useSolicitarSubidaEn(rutaDeMiEntrega(claseId, tarea.id))
  const entregar = useEntregar(claseId, tarea.id)
  const idBase = useId()
  const idArchivos = `${idBase}-archivos`
  const idVacia = `${idBase}-vacia`
  const [elegidos, setElegidos] = useState<readonly File[]>([])
  const [enlaces, setEnlaces] = useState<readonly string[]>([])
  const [errorDeArchivos, setErrorDeArchivos] = useState<string | null>(null)
  const [errorVacia, setErrorVacia] = useState(false)
  const [errorDeEnlaces, setErrorDeEnlaces] = useState<string | null>(null)
  const [enProceso, setEnProceso] = useState(false)
  const entregandoRef = useRef(false)
  const selectorRef = useRef<HTMLInputElement>(null)
  const adjuntarRef = useRef<HTMLButtonElement>(null)
  const listaRef = useRef<HTMLDivElement>(null)
  const focoTrasQuitarRef = useRef<number | null>(null)
  const hayContenido = elegidos.length + enlaces.length > 0
  const textoDelBoton =
    !tarea.requiereAdjuntos && !hayContenido
      ? TEXTOS_TU_TRABAJO.marcarComoCompletada
      : TEXTOS_TU_TRABAJO.entregar

  // DESIGN.md §7.14: al quitar un archivo, el foco va al "Quitar" vecino y, sin archivos, a "Adjuntar
  // archivos". Nunca a <body>.
  useEffect(() => {
    const posicion = focoTrasQuitarRef.current
    if (posicion === null) return
    focoTrasQuitarRef.current = null
    const controles = listaRef.current?.querySelectorAll<HTMLElement>("[data-quitar-indice]")
    const total = controles?.length ?? 0
    const vecino = controles?.item(Math.min(posicion, total - 1))
    if (vecino) {
      vecino.focus()
      return
    }
    adjuntarRef.current?.focus()
  }, [elegidos])

  const handleElegir = (evento: ChangeEvent<HTMLInputElement>) => {
    const seleccion = evento.target.files
    if (seleccion === null) return
    const nuevos = Array.from(seleccion)
    evento.target.value = ""
    if (entregandoRef.current) return
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
    if (acumulados.length > 0) setErrorVacia(false)
  }

  const handleQuitarElegido = (indice: number) => {
    if (entregandoRef.current) return
    setElegidos(elegidos.filter((_, i) => i !== indice))
    setErrorDeArchivos(null)
    focoTrasQuitarRef.current = indice
  }

  const handleCambiarEnlaces = (nuevos: string[]) => {
    if (entregandoRef.current) return
    setEnlaces(nuevos)
    setErrorDeEnlaces(null)
    if (nuevos.length > 0) setErrorVacia(false)
  }

  // Ronda 2 (T-04): escribir o intentar agregar un enlace descarta el error de enlaces del servidor.
  const handleDescartarErrorDeEnlaces = () => setErrorDeEnlaces(null)

  const handleEntregar = async () => {
    entregandoRef.current = true
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
      await entregar.mutateAsync({ archivoIds, enlaces: [...enlaces] })
      onEntregada()
    } catch (error) {
      if (archivoEnSubida !== null) {
        toast.error(avisoDeFalloAlSubir(error, archivoEnSubida, mensajeDeErrorTareas))
        return
      }
      // Los demás avisos los da el gancho; aquí solo se marcan el grupo y la lista de enlaces.
      if (esEntregaVacia(error)) {
        setErrorVacia(true)
        return
      }
      setErrorDeEnlaces(errorDeEnlacesDeApi(error))
    } finally {
      entregandoRef.current = false
      setEnProceso(false)
    }
  }

  const handleSubmit = (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault()
    if (entregandoRef.current) return
    if (tarea.requiereAdjuntos && !hayContenido) {
      setErrorVacia(true)
      return
    }
    setErrorVacia(false)
    void handleEntregar()
  }

  return (
    <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2" ref={listaRef}>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <Button
            ref={adjuntarRef}
            type="button"
            variant="outline"
            size="sm"
            aria-describedby={idArchivos}
            onClick={() => {
              if (entregandoRef.current) return
              selectorRef.current?.click()
            }}
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
          <ListaDeAdjuntosElegidos archivos={elegidos} onQuitar={handleQuitarElegido} />
        )}
      </div>

      <CampoDeEnlaces
        enlaces={enlaces}
        onCambiar={handleCambiarEnlaces}
        fija={enProceso}
        errorDelServidor={errorDeEnlaces}
        onDescartarErrorDelServidor={handleDescartarErrorDeEnlaces}
      />

      {enProceso && (
        <p role="status" className="text-small text-muted-foreground">
          {TEXTOS_TU_TRABAJO.listaFija}
        </p>
      )}
      {errorVacia && <ErrorDeCampo id={idVacia}>{TEXTOS_TU_TRABAJO.vacia}</ErrorDeCampo>}

      <div>
        <Button
          type="submit"
          variant="primary"
          enEspera={enProceso || entregar.isPending}
          aria-describedby={errorVacia ? idVacia : undefined}
        >
          {textoDelBoton}
        </Button>
      </div>
    </form>
  )
}
