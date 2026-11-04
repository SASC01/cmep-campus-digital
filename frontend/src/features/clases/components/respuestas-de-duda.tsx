import { useEffect, useRef, useState, type ReactNode } from "react"

import { Cargando } from "@/components/cargando"
import { MensajeError } from "@/components/mensaje-error"
import { useAlPulsarLaSeccionActiva } from "@/components/seccion/hooks"
import { Button } from "@/components/ui/button"
import { formatearFechaHora } from "@/lib/format"

import { CAPACIDADES_POR_PERSPECTIVA, TEXTOS_RESPUESTAS } from "../data"
import {
  useBorrarRespuesta,
  useFilaEnFoco,
  useFocoAlCargarMas,
  useRenovarSiLaDudaYaNoEsta,
  useRespuestas,
} from "../hooks"
import { focoPerdido, mensajeDeErrorDeLista, vecinaDeFila } from "../lib"
import type { Comentario, Perspectiva } from "../types"
import { FirmaDelAutor } from "./firma-del-autor"
import { FormularioRespuesta } from "./formulario-respuesta"

interface FilaRespuestaProps {
  claseId: string
  dudaId: string
  respuesta: Comentario
}

// DESIGN.md §7.14: confirmación en línea en la misma respuesta. Al pedirla, el foco va a "Cancelar"
// (nunca a la acción destructiva) y, al cancelar, vuelve a "Borrar". "Borrar" sale de `puedeBorrar` de
// cada respuesta (lo decide el servidor con la regla de autoría). Mientras el borrado está en vuelo, la
// guarda síncrona evita un segundo DELETE y "Cancelar" no cierra la confirmación.
function FilaRespuesta({ claseId, dudaId, respuesta }: FilaRespuestaProps) {
  const [confirmando, setConfirmando] = useState(false)
  const borrar = useBorrarRespuesta(claseId, dudaId)
  const borrarBtnRef = useRef<HTMLButtonElement>(null)
  const cancelarBtnRef = useRef<HTMLButtonElement>(null)
  const confirmandoAnteriorRef = useRef(confirmando)
  const borrandoRef = useRef(false)

  useEffect(() => {
    if (confirmandoAnteriorRef.current === confirmando) return
    confirmandoAnteriorRef.current = confirmando
    if (confirmando) {
      cancelarBtnRef.current?.focus()
      return
    }
    borrarBtnRef.current?.focus()
  }, [confirmando])

  const confirmarBorrado = () => {
    if (borrandoRef.current) return
    borrandoRef.current = true
    borrar.mutate(respuesta.id, {
      onSettled: () => {
        borrandoRef.current = false
      },
    })
  }

  const cancelarBorrado = () => {
    if (borrandoRef.current) return
    setConfirmando(false)
  }

  return (
    <li
      data-respuesta-id={respuesta.id}
      tabIndex={-1}
      className="flex flex-col gap-1 border-b border-border py-3 last:border-0"
    >
      <p className="text-small text-muted-foreground">
        <FirmaDelAutor autor={respuesta.autor} /> · {formatearFechaHora(respuesta.creadoEn)}
      </p>
      <p className="max-w-prose wrap-anywhere whitespace-pre-line text-body">{respuesta.texto}</p>
      {respuesta.puedeBorrar && !confirmando && (
        <div>
          <Button
            ref={borrarBtnRef}
            type="button"
            variant="ghost"
            size="sm"
            data-borrar-respuesta=""
            onClick={() => setConfirmando(true)}
          >
            {TEXTOS_RESPUESTAS.borrar}
          </Button>
        </div>
      )}
      {respuesta.puedeBorrar && confirmando && (
        <div className="flex flex-wrap gap-2 py-1">
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={confirmarBorrado}
            enEspera={borrar.isPending}
          >
            {TEXTOS_RESPUESTAS.siBorrar}
          </Button>
          <Button
            ref={cancelarBtnRef}
            type="button"
            variant="outline"
            size="sm"
            onClick={cancelarBorrado}
          >
            {TEXTOS_RESPUESTAS.cancelar}
          </Button>
        </div>
      )}
    </li>
  )
}

interface RespuestasDeDudaProps {
  id: string
  claseId: string
  dudaId: string
  perspectiva: Perspectiva
  // El bloque se abrió con "Responder" (la duda no tenía respuestas): el foco va al campo.
  enfocarCampo: boolean
  // false mientras la duda se borra o si ya no existe: sus respuestas no se vuelven a pedir (T-02).
  pedir: boolean
}

// CLASES-03e (§D-9.3): se monta al desplegar las respuestas y pide su primera página entonces (también
// con 0 respuestas: alguien pudo responder entre la lista y el clic); si llega vacía, solo queda el
// formulario, sin texto de vacío (Enmienda 4). Estados: error → cargando → vacío → datos, en orden
// ascendente. El cursor vencido dice R5 y "Ver más respuestas" no se ofrece mientras tanto. El foco nunca
// queda en <body>: al borrar una respuesta va al "Borrar" vecino o al encabezado, y "Ver más respuestas"
// lo lleva a la primera respuesta nueva o al encabezado (§7.14). El admin lee sin escribir (P-07).
export function RespuestasDeDuda({
  id,
  claseId,
  dudaId,
  perspectiva,
  enfocarCampo,
  pedir,
}: RespuestasDeDudaProps) {
  const respuestas = useRespuestas(claseId, dudaId, pedir)
  // T-02 (ronda 1 de 03e): si al pedirlas la duda ya no existe, la lista se renueva y la fila sale.
  useRenovarSiLaDudaYaNoEsta(claseId, respuestas.errorUpdateCount, respuestas.error)
  const encabezadoRef = useRef<HTMLHeadingElement>(null)
  const filaEnFocoRef = useFilaEnFoco("data-respuesta-id")
  const idsPrevios = useRef<string[] | undefined>(undefined)
  const filas = respuestas.data?.pages.flatMap((pagina) => pagina.comentarios)
  const ids = filas?.map((respuesta) => respuesta.id)

  const enfocarRespuesta = (respuestaId: string): boolean => {
    const fila = document.querySelector<HTMLElement>(`[data-respuesta-id="${respuestaId}"]`)
    fila?.focus()
    return fila !== null
  }

  const refVerMas = useFocoAlCargarMas(ids, enfocarRespuesta, () => encabezadoRef.current?.focus())

  // R5 y R9 (§D-10 b): pulsar "Dudas" estando ahí vuelve a pedir estas respuestas desde la primera página
  // si están en error; unas respuestas sanas no piden nada (S-10). M-01 (b) de la verificación de la ronda
  // 2: refetch no mira `enabled`, así que tampoco pide mientras la duda se borra o si ya no existe.
  useAlPulsarLaSeccionActiva(() => {
    if (!pedir || !respuestas.isError) return
    void respuestas.refetch()
  })

  // Después de cada render, si la respuesta que tenía el foco salió de la lista (se borró), el foco va a
  // su "Borrar" vecino (o a la propia respuesta vecina) y, sin vecinas, al encabezado. Si el bloque pasó
  // a error con el foco dentro, también al encabezado.
  useEffect(() => {
    const previos = idsPrevios.current
    idsPrevios.current = ids
    const idEnFoco = filaEnFocoRef.current
    if (idEnFoco === null || !focoPerdido(document)) return
    filaEnFocoRef.current = null
    const vecina = ids === undefined ? undefined : vecinaDeFila(previos, ids, idEnFoco)
    if (vecina === undefined || respuestas.isError) {
      encabezadoRef.current?.focus()
      return
    }
    const boton = document.querySelector<HTMLElement>(
      `[data-respuesta-id="${vecina}"] [data-borrar-respuesta]`,
    )
    if (boton !== null) {
      boton.focus()
      return
    }
    enfocarRespuesta(vecina)
  })

  const contenido = (): ReactNode => {
    if (respuestas.isError)
      return (
        <MensajeError
          mensaje={mensajeDeErrorDeLista(
            respuestas.error,
            TEXTOS_RESPUESTAS.cambioMientrasLasVeias,
          )}
        />
      )
    if (respuestas.isLoading || !filas) return <Cargando />
    if (filas.length === 0) return null
    return (
      <>
        <ul className="flex flex-col">
          {filas.map((respuesta) => (
            <FilaRespuesta
              key={respuesta.id}
              claseId={claseId}
              dudaId={dudaId}
              respuesta={respuesta}
            />
          ))}
        </ul>
        {respuestas.hasNextPage && (
          <Button
            ref={refVerMas}
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              // fetchNextPage tampoco mira `enabled` (T-04): sin `pedir`, no se pide.
              if (!pedir) return
              void respuestas.fetchNextPage({ cancelRefetch: false })
            }}
            // T-19 (ronda 2 de 01e): en espera también mientras las respuestas se recargan, para que el
            // clic no se una a la recarga y se pierda.
            // T-04 (ronda 2 de 03e): también mientras la duda se borra o si ya no existe (`pedir` falso):
            // fetchNextPage no mira `enabled`, y una página de una duda borrada solo daría otro mensaje.
            enEspera={respuestas.isFetching || !pedir}
            className="self-start"
          >
            {TEXTOS_RESPUESTAS.verMas}
          </Button>
        )}
      </>
    )
  }

  // M-01 (a) de la verificación de la ronda 2: mientras la duda se borra o si ya no existe, un bloque que se
  // despliega sin respuestas en la caché (se quitaron al plegarlo, o al llegar el borrado con el bloque
  // plegado) no pinta nada: ni «Cargando…» de una consulta que no se va a pedir, ni el formulario de una
  // duda que se va. Lo que ya se veía (con datos o con su error) sigue hasta que la fila sale.
  if (!pedir && filas === undefined && !respuestas.isError) return null

  return (
    <div id={id} className="flex flex-col gap-3 border-t border-border pt-3">
      <h3 ref={encabezadoRef} tabIndex={-1} className="sr-only">
        {TEXTOS_RESPUESTAS.titulo}
      </h3>
      {contenido()}
      {CAPACIDADES_POR_PERSPECTIVA[perspectiva].formularioComentario && (
        <FormularioRespuesta claseId={claseId} dudaId={dudaId} enfocarAlMontar={enfocarCampo} />
      )}
    </div>
  )
}
