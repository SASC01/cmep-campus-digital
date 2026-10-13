import { crearComentarioSchema, normalizarTextoLargo } from "@campus/shared"
import { useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from "react"
import { toast } from "sonner"

import { Cargando } from "@/components/cargando"
import { FirmaDelAutor } from "@/components/clase/firma-del-autor"
import { ErrorDeCampo } from "@/components/error-de-campo"
import { MensajeError } from "@/components/mensaje-error"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { formatearFechaHora } from "@/lib/format"

import { TEXTOS_HILO_PRIVADO } from "../data"
import { useComentarEnHilo, useHiloPrivado } from "../hooks"
import {
  errorDeTextoDeApi,
  errorQueRedirigeElCliente,
  errorQueReemplazaLaVista,
  mensajeDeErrorTareas,
} from "../lib"
import type { CrearComentario } from "../types"

interface FormularioDelHiloProps {
  claseId: string
  tareaId: string
  rutaDelHilo: string
}

// §D-9.6: un comentario privado. Valida con el mismo esquema que el servidor (crearComentarioSchema,
// de 1 a 1000 caracteres visibles): vacío, o solo con invisibles, dice "Escribe tu comentario" y no
// llama a la API. "Enviar comentario" espera la respuesta con una guarda síncrona con ref (un doble clic
// o un Enter repetido hacen una sola petición). Al enviar, el campo se vacía y el foco vuelve a él.
function FormularioDelHilo({ claseId, tareaId, rutaDelHilo }: FormularioDelHiloProps) {
  const comentar = useComentarEnHilo(claseId, tareaId, rutaDelHilo)
  const idCampo = useId()
  const idError = `${idCampo}-error`
  const [texto, setTexto] = useState("")
  const [error, setError] = useState<string | null>(null)
  // Ronda 2 (T-04): el error del texto que dio el servidor describe lo que se envió; al escribir se
  // descarta. Bajo el campo hay un solo mensaje: el local si lo hay, si no el del servidor.
  const [errorDelServidor, setErrorDelServidor] = useState<string | null>(null)
  const enviandoRef = useRef(false)
  const campoRef = useRef<HTMLTextAreaElement>(null)
  const mensaje = error ?? errorDelServidor

  const handleEnviar = async (datos: CrearComentario) => {
    enviandoRef.current = true
    try {
      await comentar.mutateAsync(datos)
      setTexto("")
      campoRef.current?.focus()
    } catch (falla) {
      // Los demás avisos los da el gancho; aquí solo se marca el campo.
      setErrorDelServidor(errorDeTextoDeApi(falla))
    } finally {
      enviandoRef.current = false
    }
  }

  const handleSubmit = (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault()
    if (enviandoRef.current) return
    const resultado = crearComentarioSchema.safeParse({ texto: normalizarTextoLargo(texto) })
    if (!resultado.success) {
      setError(TEXTOS_HILO_PRIVADO.escribeTuComentario)
      setErrorDelServidor(null)
      return
    }
    setError(null)
    setErrorDelServidor(null)
    void handleEnviar(resultado.data)
  }

  return (
    <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-2">
      <Label htmlFor={idCampo}>{TEXTOS_HILO_PRIVADO.campo}</Label>
      <Textarea
        ref={campoRef}
        id={idCampo}
        name="texto"
        rows={2}
        autoComplete="off"
        value={texto}
        onChange={(evento) => {
          setTexto(evento.target.value)
          setErrorDelServidor(null)
        }}
        aria-invalid={mensaje !== null}
        aria-describedby={mensaje === null ? undefined : idError}
      />
      {mensaje !== null && <ErrorDeCampo id={idError}>{mensaje}</ErrorDeCampo>}
      <div>
        <Button type="submit" variant="outline" enEspera={comentar.isPending}>
          {TEXTOS_HILO_PRIVADO.enviar}
        </Button>
      </div>
    </form>
  )
}

interface HiloPrivadoProps {
  // La clase y la tarea del hilo: un 404 de la tarea al comentar la renueva (ronda 1, T-01).
  claseId: string
  tareaId: string
  // La ruta del hilo: la del alumno (…/entrega/comentarios) o, en 01e, la de un alumno para sus
  // maestros (…/entregas/:alumnoId/comentarios).
  rutaDelHilo: string
  puedeEscribir: boolean
  textoDePrivacidad: string
}

// ENTREGAS-01d (§D-9.6, DESIGN.md §7.25): "Comentarios privados", el hilo de una entrega. Estados en
// orden: error → cargando → vacío → lista, del más antiguo al más reciente, con divisores; cada
// comentario con su firma (FirmaDelAutor: la de la administración la decide el servidor), su fecha y su
// texto plano. "Ver más comentarios" está en espera también mientras la lista se recarga (isFetching) y,
// si desaparece al cargar lo último, el foco va al primer comentario nuevo o al encabezado (§7.14).
export function HiloPrivado({
  claseId,
  tareaId,
  rutaDelHilo,
  puedeEscribir,
  textoDePrivacidad,
}: HiloPrivadoProps) {
  const hilo = useHiloPrivado(claseId, tareaId, rutaDelHilo)
  const encabezadoRef = useRef<HTMLHeadingElement>(null)
  const verMasRef = useRef<HTMLButtonElement>(null)
  const pidiendoMasRef = useRef(false)
  // Ronda 2 (T-05): la página siguiente puede responder cuando el hilo ya se desmontó (la vista pasó a
  // su mensaje por otro error, o la persona se fue): entonces no se avisa.
  const montadoRef = useRef(false)

  useEffect(() => {
    montadoRef.current = true
    return () => {
      montadoRef.current = false
    }
  }, [])
  // Los ids que había al pedir la página siguiente (null: no se está esperando una).
  const idsAntesDeVerMasRef = useRef<readonly string[] | null>(null)
  const comentarios = hilo.data?.pages.flatMap((pagina) => pagina.comentarios)

  useEffect(() => {
    const antes = idsAntesDeVerMasRef.current
    if (antes === null || comentarios === undefined || hilo.isFetchingNextPage) return
    idsAntesDeVerMasRef.current = null
    if (verMasRef.current?.isConnected === true) return
    const activo = document.activeElement
    if (activo !== null && activo !== document.body && activo.isConnected) return
    const nuevo = comentarios.find((comentario) => !antes.includes(comentario.id))
    const fila =
      nuevo === undefined
        ? null
        : document.querySelector<HTMLElement>(`[data-comentario-privado="${nuevo.id}"]`)
    if (fila !== null) {
      fila.focus()
      return
    }
    encabezadoRef.current?.focus()
  })

  const handleVerMas = async () => {
    if (pidiendoMasRef.current || hilo.isFetching || comentarios === undefined) return
    pidiendoMasRef.current = true
    idsAntesDeVerMasRef.current = comentarios.map((comentario) => comentario.id)
    try {
      const resultado = await hilo.fetchNextPage({ cancelRefetch: false })
      // Ronda 2 (T-05): un solo aviso por error. Sin aviso si el hilo ya no está montado, si el error
      // reemplaza la vista (la tarea se renueva y la vista dice su mensaje; si otra petición ya lo
      // avisó, no se repite) o si apiClient ya redirigió.
      if (!resultado.isError || !montadoRef.current) return
      if (errorQueReemplazaLaVista(true, resultado.error)) return
      if (errorQueRedirigeElCliente(resultado.error)) return
      toast.error(mensajeDeErrorTareas(resultado.error))
    } finally {
      pidiendoMasRef.current = false
    }
  }

  const contenido = (): ReactNode => {
    if (hilo.isError && comentarios === undefined) {
      return <MensajeError mensaje={mensajeDeErrorTareas(hilo.error)} />
    }

    if (comentarios === undefined) {
      return <Cargando texto={TEXTOS_HILO_PRIVADO.cargando} />
    }

    if (comentarios.length === 0) {
      return <p className="text-small text-muted-foreground">{TEXTOS_HILO_PRIVADO.vacio}</p>
    }

    return (
      <>
        <ul aria-label={TEXTOS_HILO_PRIVADO.lista} className="flex flex-col">
          {comentarios.map((comentario) => (
            <li
              key={comentario.id}
              data-comentario-privado={comentario.id}
              tabIndex={-1}
              className="flex flex-col gap-1 border-b border-border py-3 last:border-0"
            >
              <p className="text-small text-muted-foreground">
                <FirmaDelAutor autor={comentario.autor} /> ·{" "}
                {formatearFechaHora(comentario.creadoEn)}
              </p>
              <p className="max-w-prose wrap-anywhere whitespace-pre-line text-body">
                {comentario.texto}
              </p>
            </li>
          ))}
        </ul>
        {hilo.hasNextPage && (
          <div>
            <Button
              ref={verMasRef}
              type="button"
              variant="outline"
              size="sm"
              enEspera={hilo.isFetching}
              onClick={() => void handleVerMas()}
            >
              {TEXTOS_HILO_PRIVADO.verMas}
            </Button>
          </div>
        )}
      </>
    )
  }

  return (
    <Card>
      <CardContent className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <h3 ref={encabezadoRef} tabIndex={-1} className="text-h3">
            {TEXTOS_HILO_PRIVADO.titulo}
          </h3>
          <p className="text-small text-muted-foreground">{textoDePrivacidad}</p>
        </div>
        {contenido()}
        {puedeEscribir && (
          <FormularioDelHilo claseId={claseId} tareaId={tareaId} rutaDelHilo={rutaDelHilo} />
        )}
      </CardContent>
    </Card>
  )
}
