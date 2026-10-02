import { useEffect, useRef, type ReactNode } from "react"
import { useLocation } from "react-router"

import { Cargando } from "@/components/cargando"
import { EstadoVacio } from "@/components/estado-vacio"
import { MensajeError } from "@/components/mensaje-error"
import { Button } from "@/components/ui/button"

import { ConClaseDeLaRuta } from "./components/con-clase-de-la-ruta"
import { FormularioPublicacion } from "./components/formulario-publicacion"
import { PublicacionDelMuro } from "./components/publicacion-del-muro"
import { TEXTOS_MURO } from "./data"
import { useFilaEnFoco, useFocoAlCargarMas, usePublicaciones } from "./hooks"
import { focoPerdido, mensajeDeErrorDeLista, vecinaDeFila } from "./lib"

interface MuroDeLaClaseProps {
  claseId: string
}

// §D-C5: el muro de una clase. El maestro dueño ve arriba el formulario para publicar (su "Publicar
// anuncio" o "Publicar material" es la única acción principal de la vista); el estudiante solo
// lee y comenta. La ruta decide el rol por su prefijo, igual que ClaseLayout (§D-A5); el backend lo
// exige por su cuenta. Estados de la lista en orden: error → cargando → vacío → datos.
function MuroDeLaClase({ claseId }: MuroDeLaClaseProps) {
  const ubicacion = useLocation()
  const esMaestro = ubicacion.pathname.startsWith("/maestro")
  const publicaciones = usePublicaciones(claseId)
  const encabezadoRef = useRef<HTMLHeadingElement>(null)
  const filaEnFocoRef = useFilaEnFoco("data-publicacion-id")
  const idsPrevios = useRef<string[] | undefined>(undefined)
  const filas = publicaciones.data?.pages.flatMap((pagina) => pagina.publicaciones)
  const ids = filas?.map((publicacion) => publicacion.id)

  const enfocarPublicacion = (id: string): boolean => {
    const fila = document.querySelector<HTMLElement>(`[data-publicacion-id="${id}"]`)
    fila?.focus()
    return fila !== null
  }

  // T-35: pulsar "Muro" estando en el muro agrega una entrada con la misma ruta, pero la vista no se
  // desmonta. Si la lista estaba en error (el cursor ya no existe), esa navegación la vuelve a pedir
  // desde la primera página, sin recargar. Con la lista sana no hace nada.
  const llaveDeLaUbicacion = useRef(ubicacion.key)
  const { isError, refetch } = publicaciones
  useEffect(() => {
    if (llaveDeLaUbicacion.current === ubicacion.key) return
    llaveDeLaUbicacion.current = ubicacion.key
    if (!isError) return
    void refetch()
  }, [ubicacion.key, isError, refetch])

  // "Ver más publicaciones" se desmonta con el foco dentro al cargar la última página (§7.14): el foco
  // va a la primera publicación nueva o, si no llegó ninguna, al encabezado de la lista.
  const refVerMas = useFocoAlCargarMas(ids, enfocarPublicacion, () =>
    encabezadoRef.current?.focus(),
  )

  // Si la publicación que tenía el foco sale de la lista (se borró), el foco va al "Borrar publicación"
  // de la vecina (o a la propia publicación vecina) y, sin vecinas, al encabezado. Nunca a <body>.
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
      `[data-publicacion-id="${vecina}"] [data-borrar-publicacion]`,
    )
    if (boton !== null) {
      boton.focus()
      return
    }
    enfocarPublicacion(vecina)
  })

  const contenido = (): ReactNode => {
    if (publicaciones.isError) {
      return (
        <MensajeError
          mensaje={mensajeDeErrorDeLista(publicaciones.error, TEXTOS_MURO.cambioMientrasLoVeias)}
        />
      )
    }
    if (publicaciones.isLoading || !filas) return <Cargando />
    if (filas.length === 0) {
      return (
        <EstadoVacio titulo={esMaestro ? TEXTOS_MURO.vacioMaestro : TEXTOS_MURO.vacioEstudiante} />
      )
    }
    return (
      <>
        <ul className="flex flex-col gap-4">
          {filas.map((publicacion) => (
            <li key={publicacion.id}>
              <PublicacionDelMuro
                claseId={claseId}
                publicacion={publicacion}
                esMaestro={esMaestro}
              />
            </li>
          ))}
        </ul>
        {publicaciones.hasNextPage && (
          <Button
            ref={refVerMas}
            type="button"
            variant="outline"
            onClick={() => void publicaciones.fetchNextPage()}
            enEspera={publicaciones.isFetchingNextPage}
            className="self-start"
          >
            {TEXTOS_MURO.verMasPublicaciones}
          </Button>
        )}
      </>
    )
  }

  return (
    <div className="flex flex-col gap-5">
      {esMaestro && <FormularioPublicacion claseId={claseId} />}
      <section className="flex flex-col gap-4">
        <h2 ref={encabezadoRef} tabIndex={-1} className="sr-only">
          {TEXTOS_MURO.tituloLista}
        </h2>
        {contenido()}
      </section>
    </div>
  )
}

export function MuroView() {
  return <ConClaseDeLaRuta>{(claseId) => <MuroDeLaClase claseId={claseId} />}</ConClaseDeLaRuta>
}
