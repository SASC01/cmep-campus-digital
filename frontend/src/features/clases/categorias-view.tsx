import { useLocation } from "react-router"

import { Cargando } from "@/components/cargando"
import { MensajeError } from "@/components/mensaje-error"
import { Card, CardContent } from "@/components/ui/card"

import { ConClaseDeLaRuta } from "./components/con-clase-de-la-ruta"
import { EditorDeCategorias } from "./components/editor-de-categorias"
import {
  CAPACIDADES_POR_PERSPECTIVA,
  TEXTOS_CATEGORIAS,
  TEXTOS_CATEGORIAS_RECARGA,
  TEXTOS_CLASE,
} from "./data"
import { useAvisoDeRecargaFallida, useCategorias } from "./hooks"
import { errorQuitaLaVista, mensajeDeErrorClases, perspectivaDeRuta } from "./lib"

interface CategoriasDeLaClaseProps {
  claseId: string
}

// §D-11, RF-32, S-06: "Categorías de calificación" de una clase (maestro y admin; no es una sección).
// La ruta decide la perspectiva, como en el muro; el estudiante no tiene esta ruta y, si llegara, no
// se pide nada. Estados: error → cargando → editor (que tiene su propio vacío).
function CategoriasDeLaClase({ claseId }: CategoriasDeLaClaseProps) {
  const { pathname } = useLocation()
  const perspectiva = perspectivaDeRuta(pathname)
  const { gestionarTrabajo } = CAPACIDADES_POR_PERSPECTIVA[perspectiva]
  const categorias = useCategorias(claseId, gestionarTrabajo)
  // Una recarga fallida conserva el editor (y lo que se está escribiendo) y avisa una vez por fallo.
  const conservaLaVista = categorias.data !== undefined && !errorQuitaLaVista(categorias.error)
  useAvisoDeRecargaFallida(categorias.errorUpdateCount, conservaLaVista, TEXTOS_CATEGORIAS_RECARGA)

  const contenido = () => {
    if (!gestionarTrabajo) return <MensajeError mensaje={TEXTOS_CLASE.sinAcceso} />
    if (categorias.isError && !conservaLaVista) {
      return <MensajeError mensaje={mensajeDeErrorClases(categorias.error)} />
    }
    if (categorias.data === undefined) return <Cargando />
    // La llave es la clase: al pasar a otra clase el editor parte de cero.
    return (
      <EditorDeCategorias key={claseId} claseId={claseId} categorias={categorias.data.categorias} />
    )
  }

  return (
    <Card>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-h2">{TEXTOS_CATEGORIAS.titulo}</h2>
          <p className="max-w-prose text-small text-muted-foreground">{TEXTOS_CATEGORIAS.frase}</p>
        </div>
        {contenido()}
      </CardContent>
    </Card>
  )
}

export function CategoriasView() {
  return (
    <ConClaseDeLaRuta>{(claseId) => <CategoriasDeLaClase claseId={claseId} />}</ConClaseDeLaRuta>
  )
}
