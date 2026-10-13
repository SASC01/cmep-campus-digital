import type { Adjunto } from "@campus/shared"
import { FileText, Image } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { formatearTamano } from "@/lib/format"

import { TEXTOS_ADJUNTOS } from "./data"
import { useUrlDeDescarga, useUrlDeDescargaEn } from "./hooks"

// TAREAS-01c (§D-9): movido desde features/clases/components, que conserva un envoltorio con el mismo
// nombre y las mismas props (mensajeDeErrorClases es de ese módulo y llega por `mensajeDeError`).
interface VistaDeFichaProps {
  adjunto: Adjunto
  pidiendo: boolean
  onDescargar: () => void
}

// La ficha sólida de un archivo adjunto (DESIGN.md §7.19): icono, nombre, tamaño y "Descargar". La
// pintan las dos fichas de abajo; solo cambia de dónde sale la URL de descarga.
function VistaDeFicha({ adjunto, pidiendo, onDescargar }: VistaDeFichaProps) {
  const esImagen = adjunto.vistaPrevia !== null

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-row bg-muted px-3 py-2">
      {esImagen && <Image aria-hidden="true" className="size-4 shrink-0 text-foreground" />}
      {!esImagen && <FileText aria-hidden="true" className="size-4 shrink-0 text-foreground" />}
      <span className="min-w-0 flex-1 wrap-anywhere text-small font-bold text-foreground">
        {adjunto.nombre}
      </span>
      <span className="text-small text-muted-foreground">{formatearTamano(adjunto.tamano)}</span>
      <Button type="button" variant="outline" size="sm" enEspera={pidiendo} onClick={onDescargar}>
        {TEXTOS_ADJUNTOS.descargar} <span className="sr-only">{adjunto.nombre}</span>
      </Button>
    </div>
  )
}

// Pide la URL de descarga al hacer clic (los enlaces no se guardan en el DOM: duran 5 minutos) y navega
// a ella; el navegador descarga con el nombre original porque la disposición es `attachment`.
// ENTREGAS-01e (ronda 1, T-01): con `alFallarLaDescarga`, el error lo maneja quien la pasa (avisar una
// sola vez y renovar lo que el error vuelve viejo); sin ella, el aviso de siempre.
const descargar = async (
  pedirUrl: (archivoId: string) => Promise<{ url: string }>,
  adjunto: Adjunto,
  mensajeDeError: (error: unknown) => string,
  alFallarLaDescarga: ((error: unknown) => void) | undefined,
) => {
  try {
    const { url } = await pedirUrl(adjunto.id)
    window.location.assign(url)
  } catch (error) {
    if (alFallarLaDescarga !== undefined) {
      alFallarLaDescarga(error)
      return
    }
    toast.error(mensajeDeError(error))
  }
}

interface FichaDeAdjuntoProps {
  claseId: string
  adjunto: Adjunto
  mensajeDeError: (error: unknown) => string
  alFallarLaDescarga: ((error: unknown) => void) | undefined
}

// Un archivo de una publicación de la clase: la descarga de la clase, como siempre.
function FichaDeAdjunto({
  claseId,
  adjunto,
  mensajeDeError,
  alFallarLaDescarga,
}: FichaDeAdjuntoProps) {
  const descarga = useUrlDeDescarga(claseId)
  return (
    <VistaDeFicha
      adjunto={adjunto}
      pidiendo={descarga.isPending}
      onDescargar={() =>
        void descargar(descarga.mutateAsync, adjunto, mensajeDeError, alFallarLaDescarga)
      }
    />
  )
}

interface FichaDeAdjuntoEnRutaProps {
  rutaDeArchivos: string
  adjunto: Adjunto
  mensajeDeError: (error: unknown) => string
  alFallarLaDescarga: ((error: unknown) => void) | undefined
}

// ENTREGAS-01d (§D-9.1, R-04): un archivo de una entrega, que se descarga por la ruta de la entrega.
// Es una ficha aparte (y no un gancho condicional en la de arriba): sin `rutaDeArchivos`, la lista
// sigue montando solo la ficha de la clase.
function FichaDeAdjuntoEnRuta({
  rutaDeArchivos,
  adjunto,
  mensajeDeError,
  alFallarLaDescarga,
}: FichaDeAdjuntoEnRutaProps) {
  const descarga = useUrlDeDescargaEn(rutaDeArchivos)
  return (
    <VistaDeFicha
      adjunto={adjunto}
      pidiendo={descarga.isPending}
      onDescargar={() =>
        void descargar(descarga.mutateAsync, adjunto, mensajeDeError, alFallarLaDescarga)
      }
    />
  )
}

export interface AdjuntosDePublicacionProps {
  claseId: string
  adjuntos: readonly Adjunto[]
  mensajeDeError: (error: unknown) => string
  // ENTREGAS-01d (§D-9.1): la ruta de archivos de una entrega. Sin ella, la de la clase (como siempre).
  rutaDeArchivos?: string
  // ENTREGAS-01e (ronda 1, T-01): quien la pasa maneja el error de una descarga (un solo aviso y la
  // renovación de lo que el error vuelve viejo). Sin ella, el aviso de siempre con `mensajeDeError`.
  alFallarLaDescarga?: (error: unknown) => void
}

// §D-D5, DESIGN.md §7.19: los archivos de una publicación. Una imagen con vista previa se muestra
// con su descripción en el `alt`; si no carga, desaparece y queda su ficha. Todos los adjuntos
// tienen su ficha con "Descargar". Sin adjuntos no pinta nada.
export function AdjuntosDePublicacion({
  claseId,
  adjuntos,
  mensajeDeError,
  rutaDeArchivos,
  alFallarLaDescarga,
}: AdjuntosDePublicacionProps) {
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
            {rutaDeArchivos === undefined && (
              <FichaDeAdjunto
                claseId={claseId}
                adjunto={adjunto}
                mensajeDeError={mensajeDeError}
                alFallarLaDescarga={alFallarLaDescarga}
              />
            )}
            {rutaDeArchivos !== undefined && (
              <FichaDeAdjuntoEnRuta
                rutaDeArchivos={rutaDeArchivos}
                adjunto={adjunto}
                mensajeDeError={mensajeDeError}
                alFallarLaDescarga={alFallarLaDescarga}
              />
            )}
          </li>
        )
      })}
    </ul>
  )
}
