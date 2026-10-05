import { BookOpen, Megaphone } from "lucide-react"
import { useEffect, useId, useRef, useState } from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { formatearFechaHora } from "@/lib/format"

import { TEXTOS_PUBLICACION } from "../data"
import { useBorrarPublicacion } from "../hooks"
import type { Perspectiva, Publicacion } from "../types"
import { AdjuntosDePublicacion } from "./adjuntos-de-publicacion"
import { ComentariosDePublicacion } from "./comentarios-de-publicacion"
import { FirmaDelAutor } from "./firma-del-autor"

interface PublicacionDelMuroProps {
  claseId: string
  publicacion: Publicacion
  perspectiva: Perspectiva
}

// §D-C5, DESIGN.md §7.18: una publicación del muro, en un panel (el vidrio sale de Card). La
// insignia del tipo lleva texto e icono; el texto es plano (React lo escapa, sin HTML) con
// whitespace-pre-line y max-w-prose. "Ver comentarios" pliega y despliega los comentarios; el
// botón "Borrar publicación" sale de `puedeBorrar` (lo decide el servidor con la regla de autoría),
// nunca del rol; pide confirmación en línea (§7.14): el foco va a "Cancelar" al pedirla y vuelve a
// "Borrar publicación" al cancelar. La firma sale de FirmaDelAutor (§D-2C4).
export function PublicacionDelMuro({ claseId, publicacion, perspectiva }: PublicacionDelMuroProps) {
  const [abierto, setAbierto] = useState(false)
  const [confirmando, setConfirmando] = useState(false)
  const idComentarios = useId()
  const borrar = useBorrarPublicacion(claseId)
  const borrarBtnRef = useRef<HTMLButtonElement>(null)
  const cancelarBtnRef = useRef<HTMLButtonElement>(null)
  const confirmandoAnteriorRef = useRef(confirmando)
  const esMaterial = publicacion.tipo === "material"
  const textoDeConfirmacion =
    publicacion.adjuntos.length > 0
      ? TEXTOS_PUBLICACION.confirmarBorrarPublicacionConAdjuntos
      : TEXTOS_PUBLICACION.confirmarBorrarPublicacion

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
    <Card data-publicacion-id={publicacion.id} tabIndex={-1} className="gap-3">
      <CardContent className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          {esMaterial && (
            <Badge variant="muted" icon={<BookOpen aria-hidden="true" />}>
              {TEXTOS_PUBLICACION.insigniaMaterial}
            </Badge>
          )}
          {!esMaterial && (
            <Badge variant="muted" icon={<Megaphone aria-hidden="true" />}>
              {TEXTOS_PUBLICACION.insigniaAnuncio}
            </Badge>
          )}
          <p className="text-small text-muted-foreground">
            <FirmaDelAutor autor={publicacion.autor} /> · {formatearFechaHora(publicacion.creadoEn)}
          </p>
        </div>

        {publicacion.titulo !== null && (
          <h3 className="wrap-anywhere text-h3">{publicacion.titulo}</h3>
        )}
        {publicacion.texto !== "" && (
          <p className="max-w-prose wrap-anywhere whitespace-pre-line text-body">
            {publicacion.texto}
          </p>
        )}

        <AdjuntosDePublicacion claseId={claseId} adjuntos={publicacion.adjuntos} />

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            aria-expanded={abierto}
            aria-controls={abierto ? idComentarios : undefined}
            onClick={() => setAbierto(!abierto)}
          >
            {abierto
              ? TEXTOS_PUBLICACION.ocultarComentarios
              : TEXTOS_PUBLICACION.verComentarios(publicacion.comentarios)}
          </Button>
          {publicacion.puedeBorrar && !confirmando && (
            <Button
              ref={borrarBtnRef}
              type="button"
              variant="ghost"
              size="sm"
              data-borrar-publicacion=""
              onClick={() => setConfirmando(true)}
            >
              {TEXTOS_PUBLICACION.borrarPublicacion}
            </Button>
          )}
        </div>

        {publicacion.puedeBorrar && confirmando && (
          <div className="flex flex-col gap-2">
            <p className="text-small">{textoDeConfirmacion}</p>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={() => borrar.mutate(publicacion.id)}
                enEspera={borrar.isPending}
              >
                {TEXTOS_PUBLICACION.siBorrar}
              </Button>
              <Button
                ref={cancelarBtnRef}
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setConfirmando(false)}
              >
                {TEXTOS_PUBLICACION.cancelar}
              </Button>
            </div>
          </div>
        )}

        {abierto && (
          <ComentariosDePublicacion
            id={idComentarios}
            claseId={claseId}
            publicacionId={publicacion.id}
            perspectiva={perspectiva}
          />
        )}
      </CardContent>
    </Card>
  )
}
