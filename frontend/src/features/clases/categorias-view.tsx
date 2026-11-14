import { useLocation } from "react-router"

import { Cargando } from "@/components/cargando"
import { useSoloLecturaDeLaClase } from "@/components/clase/hooks"
import { MensajeError } from "@/components/mensaje-error"
import { Card, CardContent } from "@/components/ui/card"

import { CategoriasDeSoloLectura } from "./components/categorias-de-solo-lectura"
import { ConClaseDeLaRuta } from "./components/con-clase-de-la-ruta"
import { EditorDeCategorias } from "./components/editor-de-categorias"
import {
  CAPACIDADES_POR_PERSPECTIVA,
  TEXTOS_CATEGORIAS,
  TEXTOS_CATEGORIAS_RECARGA,
  TEXTOS_CLASE,
} from "./data"
import { useAvisoDeRecargaFallida, useCategorias } from "./hooks"
import {
  errorQueRedirigeElCliente,
  errorQuitaLaVista,
  mensajeDeConsultaClases,
  perspectivaDeRuta,
} from "./lib"

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
  // ADMIN-01d1 (§D-9, fila 15): en una clase archivada las categorías se leen, sin el editor.
  const soloLectura = useSoloLecturaDeLaClase()
  // Una recarga fallida conserva el editor (y lo que se está escribiendo) y avisa una vez por fallo.
  const conservaLaVista = categorias.data !== undefined && !errorQuitaLaVista(categorias.error)
  // CHORE-06a (§D-3): un error con que apiClient ya redirige no avisa.
  useAvisoDeRecargaFallida(
    categorias.errorUpdateCount,
    conservaLaVista && !errorQueRedirigeElCliente(categorias.error),
    TEXTOS_CATEGORIAS_RECARGA,
    claseId,
  )

  const contenido = () => {
    if (!gestionarTrabajo) return <MensajeError mensaje={TEXTOS_CLASE.sinAcceso} />
    if (categorias.isError && !conservaLaVista) {
      return <MensajeError mensaje={mensajeDeConsultaClases(categorias.error)} />
    }
    if (categorias.data === undefined) return <Cargando />
    if (soloLectura) return <CategoriasDeSoloLectura categorias={categorias.data.categorias} />
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
          {/* ADMIN-01d2 (tabla D): la frase se dirige a quien edita, y en una clase archivada nadie edita. */}
          {!soloLectura && (
            <p className="max-w-prose text-small text-muted-foreground">
              {TEXTOS_CATEGORIAS.frase}
            </p>
          )}
        </div>
        {contenido()}
      </CardContent>
    </Card>
  )
}

export function CategoriasView() {
  return (
    <ConClaseDeLaRuta>
      {(claseId) => <CategoriasDeLaClase key={claseId} claseId={claseId} />}
    </ConClaseDeLaRuta>
  )
}
