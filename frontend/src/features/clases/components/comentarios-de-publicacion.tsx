import { useEffect, useRef, useState, type ReactNode } from "react"

import { Cargando } from "@/components/cargando"
import { MensajeError } from "@/components/mensaje-error"
import { Button } from "@/components/ui/button"
import { formatearFechaHora } from "@/lib/format"

import { CAPACIDADES_POR_PERSPECTIVA, TEXTOS_COMENTARIOS } from "../data"
import { useBorrarComentario, useComentarios, useFilaEnFoco, useFocoAlCargarMas } from "../hooks"
import { focoPerdido, mensajeDeErrorDeLista, vecinaDeFila } from "../lib"
import type { Comentario, Perspectiva } from "../types"
import { FirmaDelAutor } from "./firma-del-autor"
import { FormularioComentario } from "./formulario-comentario"

interface FilaComentarioProps {
  claseId: string
  publicacionId: string
  comentario: Comentario
}

// DESIGN.md §7.14: confirmación en línea en el mismo comentario. Al pedirla, el foco va a
// "Cancelar" (nunca a la acción destructiva) y, al cancelar, vuelve a "Borrar". Se compara contra el
// valor de "confirmando" que el efecto ya procesó para que el doble montaje de StrictMode no repita
// el movimiento de foco. El botón "Borrar" sale de `puedeBorrar` de cada comentario (lo decide el
// servidor con la regla de autoría); el borrado siempre va a la ruta general (§D-2C4).
function FilaComentario({ claseId, publicacionId, comentario }: FilaComentarioProps) {
  const [confirmando, setConfirmando] = useState(false)
  const borrar = useBorrarComentario(claseId, publicacionId)
  const borrarBtnRef = useRef<HTMLButtonElement>(null)
  const cancelarBtnRef = useRef<HTMLButtonElement>(null)
  const confirmandoAnteriorRef = useRef(confirmando)
  const puedeBorrar = comentario.puedeBorrar

  useEffect(() => {
    if (confirmandoAnteriorRef.current === confirmando) return
    confirmandoAnteriorRef.current = confirmando
    if (confirmando) {
      cancelarBtnRef.current?.focus()
      return
    }
    borrarBtnRef.current?.focus()
  }, [confirmando])

  return (
    <li
      data-comentario-id={comentario.id}
      tabIndex={-1}
      className="flex flex-col gap-1 border-b border-border py-3 last:border-0"
    >
      <p className="text-small text-muted-foreground">
        <FirmaDelAutor autor={comentario.autor} /> · {formatearFechaHora(comentario.creadoEn)}
      </p>
      <p className="max-w-prose wrap-anywhere whitespace-pre-line text-body">{comentario.texto}</p>
      {puedeBorrar && !confirmando && (
        <div>
          <Button
            ref={borrarBtnRef}
            type="button"
            variant="ghost"
            size="sm"
            data-borrar-comentario=""
            onClick={() => setConfirmando(true)}
          >
            {TEXTOS_COMENTARIOS.borrar}
          </Button>
        </div>
      )}
      {puedeBorrar && confirmando && (
        <div className="flex flex-wrap gap-2 py-1">
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={() => borrar.mutate(comentario.id)}
            enEspera={borrar.isPending}
          >
            {TEXTOS_COMENTARIOS.siBorrarComentario}
          </Button>
          <Button
            ref={cancelarBtnRef}
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setConfirmando(false)}
          >
            {TEXTOS_COMENTARIOS.cancelar}
          </Button>
        </div>
      )}
    </li>
  )
}

interface ComentariosDePublicacionProps {
  id: string
  claseId: string
  publicacionId: string
  perspectiva: Perspectiva
}

// §D-C5: se monta al abrir "Ver comentarios" y pide la lista solo entonces. Estados en orden: error →
// cargando → vacío (sin comentarios solo queda el formulario) → datos, en orden ascendente. El foco
// nunca queda en <body>: al borrar un comentario va al "Borrar" vecino o al encabezado, y "Ver más
// comentarios" lo lleva al primer comentario nuevo o al encabezado (§7.14).
export function ComentariosDePublicacion({
  id,
  claseId,
  publicacionId,
  perspectiva,
}: ComentariosDePublicacionProps) {
  const comentarios = useComentarios(claseId, publicacionId)
  const encabezadoRef = useRef<HTMLHeadingElement>(null)
  const filaEnFocoRef = useFilaEnFoco("data-comentario-id")
  const idsPrevios = useRef<string[] | undefined>(undefined)
  const filas = comentarios.data?.pages.flatMap((pagina) => pagina.comentarios)
  const ids = filas?.map((comentario) => comentario.id)

  const enfocarComentario = (comentarioId: string): boolean => {
    const fila = document.querySelector<HTMLElement>(`[data-comentario-id="${comentarioId}"]`)
    fila?.focus()
    return fila !== null
  }

  const refVerMas = useFocoAlCargarMas(ids, enfocarComentario, () => encabezadoRef.current?.focus())

  // Después de cada render, si el comentario que tenía el foco salió de la lista (se borró), el foco
  // va a su "Borrar" vecino (o al propio comentario vecino) y, sin vecinos, al encabezado.
  useEffect(() => {
    const previos = idsPrevios.current
    idsPrevios.current = ids
    const idEnFoco = filaEnFocoRef.current
    if (idEnFoco === null || !focoPerdido(document)) return
    filaEnFocoRef.current = null
    const vecina = ids === undefined ? undefined : vecinaDeFila(previos, ids, idEnFoco)
    if (vecina === undefined) {
      encabezadoRef.current?.focus()
      return
    }
    const boton = document.querySelector<HTMLElement>(
      `[data-comentario-id="${vecina}"] [data-borrar-comentario]`,
    )
    if (boton !== null) {
      boton.focus()
      return
    }
    enfocarComentario(vecina)
  })

  const contenido = (): ReactNode => {
    if (comentarios.isError)
      return (
        <MensajeError
          mensaje={mensajeDeErrorDeLista(
            comentarios.error,
            TEXTOS_COMENTARIOS.cambioMientrasLosVeias,
          )}
        />
      )
    if (comentarios.isLoading || !filas) return <Cargando />
    if (filas.length === 0) return null
    return (
      <>
        <ul className="flex flex-col">
          {filas.map((comentario) => (
            <FilaComentario
              key={comentario.id}
              claseId={claseId}
              publicacionId={publicacionId}
              comentario={comentario}
            />
          ))}
        </ul>
        {comentarios.hasNextPage && (
          <Button
            ref={refVerMas}
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void comentarios.fetchNextPage({ cancelRefetch: false })}
            enEspera={comentarios.isFetchingNextPage}
            className="self-start"
          >
            {TEXTOS_COMENTARIOS.verMas}
          </Button>
        )}
      </>
    )
  }

  return (
    <div id={id} className="flex flex-col gap-3 border-t border-border pt-3">
      <h3 ref={encabezadoRef} tabIndex={-1} className="sr-only">
        {TEXTOS_COMENTARIOS.titulo}
      </h3>
      {contenido()}
      {CAPACIDADES_POR_PERSPECTIVA[perspectiva].formularioComentario && (
        <FormularioComentario claseId={claseId} publicacionId={publicacionId} />
      )}
    </div>
  )
}
