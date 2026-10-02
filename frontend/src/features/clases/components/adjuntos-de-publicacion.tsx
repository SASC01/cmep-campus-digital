import { FileText, Image } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { formatearTamano } from "@/lib/format"

import { TEXTOS_ADJUNTOS } from "../data"
import { useUrlDeDescarga } from "../hooks"
import { mensajeDeErrorClases } from "../lib"
import type { Adjunto } from "../types"

interface FichaDeAdjuntoProps {
  claseId: string
  adjunto: Adjunto
}

// La ficha sólida de un archivo adjunto (DESIGN.md §7.19): icono, nombre, tamaño y "Descargar". Pide
// la URL de descarga al hacer clic (los enlaces no se guardan en el DOM: duran 5 minutos) y navega a
// ella; el navegador descarga con el nombre original porque la disposición es `attachment`.
function FichaDeAdjunto({ claseId, adjunto }: FichaDeAdjuntoProps) {
  const descarga = useUrlDeDescarga(claseId)
  const esImagen = adjunto.vistaPrevia !== null

  const handleDescargar = async () => {
    try {
      const { url } = await descarga.mutateAsync(adjunto.id)
      window.location.assign(url)
    } catch (error) {
      toast.error(mensajeDeErrorClases(error))
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-row bg-muted px-3 py-2">
      {esImagen && <Image aria-hidden="true" className="size-4 shrink-0 text-foreground" />}
      {!esImagen && <FileText aria-hidden="true" className="size-4 shrink-0 text-foreground" />}
      <span className="min-w-0 flex-1 wrap-anywhere text-small font-bold text-foreground">
        {adjunto.nombre}
      </span>
      <span className="text-small text-muted-foreground">{formatearTamano(adjunto.tamano)}</span>
      <Button
        type="button"
        variant="outline"
        size="sm"
        enEspera={descarga.isPending}
        onClick={handleDescargar}
      >
        {TEXTOS_ADJUNTOS.descargar} <span className="sr-only">{adjunto.nombre}</span>
      </Button>
    </div>
  )
}

interface AdjuntosDePublicacionProps {
  claseId: string
  adjuntos: readonly Adjunto[]
}

// §D-D5, DESIGN.md §7.19: los archivos de una publicación. Una imagen con vista previa se muestra
// con su descripción en el `alt`; si no carga, desaparece y queda su ficha. Todos los adjuntos
// tienen su ficha con "Descargar". Sin adjuntos no pinta nada.
export function AdjuntosDePublicacion({ claseId, adjuntos }: AdjuntosDePublicacionProps) {
  // T-40: la imagen que falló se recuerda por su URL, no por el id del adjunto: con una URL nueva (el
  // muro se volvió a pedir) se vuelve a intentar.
  const [urlsRotas, setUrlsRotas] = useState<readonly string[]>([])

  if (adjuntos.length === 0) return null

  return (
    <ul aria-label={TEXTOS_ADJUNTOS.adjuntos} className="flex flex-col gap-3">
      {adjuntos.map((adjunto) => {
        const url = adjunto.vistaPrevia === null ? null : adjunto.vistaPrevia.url
        return (
          <li key={adjunto.id} className="flex flex-col gap-2">
            {url !== null && !urlsRotas.includes(url) && (
              <img
                src={url}
                alt={TEXTOS_ADJUNTOS.imagenAdjunta(adjunto.nombre)}
                className="max-h-80 max-w-full self-start rounded-row object-contain"
                onError={() => setUrlsRotas([...urlsRotas, url])}
              />
            )}
            <FichaDeAdjunto claseId={claseId} adjunto={adjunto} />
          </li>
        )
      })}
    </ul>
  )
}
