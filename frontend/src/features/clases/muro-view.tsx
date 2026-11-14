import { useEffect, useRef, type ReactNode } from "react"
import { useLocation } from "react-router"

import { Cargando } from "@/components/cargando"
import { useSoloLecturaDeLaClase } from "@/components/clase/hooks"
import { EstadoVacio } from "@/components/estado-vacio"
import { MensajeError } from "@/components/mensaje-error"
import {
  useMarcarViejaSiQuedoEnError,
  useRecargarAlPulsarLaSeccion,
} from "@/components/seccion/hooks"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { clavePublicaciones } from "@/services/clasesService"

import { ConClaseDeLaRuta } from "./components/con-clase-de-la-ruta"
import { FormularioPublicacion } from "./components/formulario-publicacion"
import { PublicacionDelMuro } from "./components/publicacion-del-muro"
import { CAPACIDADES_POR_PERSPECTIVA, TEXTOS_MURO } from "./data"
import {
  useAvisoDeRecargaFallida,
  useFilaEnFoco,
  useFocoAlCargarMas,
  useFocoAlPasarAError,
  useListaConservadaTrasLaPagina,
  usePublicaciones,
} from "./hooks"
import {
  focoPerdido,
  mensajeDeConsultaClases,
  mensajeDeErrorDeLista,
  perspectivaDeRuta,
  vecinaDeFila,
} from "./lib"
import type { Perspectiva } from "./types"

interface MuroDeLaClaseProps {
  claseId: string
}

// Lo que dice el muro vacío según quién lo mira (§D-2C4).
const tituloDelMuroVacio = (perspectiva: Perspectiva): string => {
  if (perspectiva === "maestro") return TEXTOS_MURO.vacioMaestro
  if (perspectiva === "admin") return TEXTOS_MURO.vacioAdmin
  return TEXTOS_MURO.vacioEstudiante
}

// §D-C5, §D-2C1: el muro de una clase, la sección "Avisos" desde CLASES-03 (§D-7.5; sin "Crear tarea",
// S-09). El maestro y el admin ven arriba el formulario para publicar
// (su "Publicar anuncio" o "Publicar material" es la única acción principal de la vista); el
// estudiante solo lee y comenta, y el admin lee sin comentar. La ruta decide la perspectiva por su
// prefijo, igual que ClaseLayout (§D-A5); el backend lo exige por su cuenta. Estados de la lista en
// orden: error → cargando → vacío → datos.
function MuroDeLaClase({ claseId }: MuroDeLaClaseProps) {
  const ubicacion = useLocation()
  const perspectiva = perspectivaDeRuta(ubicacion.pathname)
  const publicaciones = usePublicaciones(claseId)
  // ADMIN-01d1 (§D-9, fila 3): en una clase archivada no se publica.
  const soloLectura = useSoloLecturaDeLaClase()
  const encabezadoRef = useRef<HTMLHeadingElement>(null)
  // CHORE-06b (§D-5, DH-02 a): el fallo de la página siguiente (red o 5xx) conserva la lista, también
  // mientras una recarga la recupera; avisa una vez por fallo, con la clase como clave.
  const conserva = useListaConservadaTrasLaPagina(
    clavePublicaciones(claseId),
    publicaciones.isFetchNextPageError,
    publicaciones.isError,
    publicaciones.errorUpdateCount,
    publicaciones.errorUpdatedAt,
    publicaciones.error,
  )
  useAvisoDeRecargaFallida(
    publicaciones.errorUpdateCount,
    conserva,
    mensajeDeConsultaClases(publicaciones.error),
    claseId,
  )
  // T-04: si la lista se recarga con error tras borrar una publicación, el foco va al encabezado. Con la
  // lista conservada no hay paso a error (CHORE-06b, M-02).
  useFocoAlPasarAError(
    publicaciones.isError && !conserva,
    publicaciones.data !== undefined,
    claseId,
    encabezadoRef,
  )
  const filaEnFocoRef = useFilaEnFoco("data-publicacion-id")
  const idsPrevios = useRef<string[] | undefined>(undefined)
  const clasePrevia = useRef(claseId)
  const filas = publicaciones.data?.pages.flatMap((pagina) => pagina.publicaciones)
  const ids = filas?.map((publicacion) => publicacion.id)

  const enfocarPublicacion = (id: string): boolean => {
    // CHORE-06a (ronda 2): tras un cambio de clase, «Ver más» de la anterior no lleva el foco a una
    // publicación de la nueva (O-14): sin fila, el gancho va al encabezado de la lista.
    if (clasePrevia.current !== claseId) return false
    const fila = document.querySelector<HTMLElement>(`[data-publicacion-id="${id}"]`)
    fila?.focus()
    return fila !== null
  }

  // T-35 y R1 (§D-10 a): pulsar "Avisos" estando en Avisos agrega una entrada con la misma ruta, pero
  // la vista no se desmonta. CHORE-06b (§D-4): la lista en error o vieja se vuelve a pedir desde la
  // primera página, sin cancelar ni duplicar lo que vuela; sana y fresca, nada. También al saltar con el
  // historial a Avisos de otra clase (DH-10).
  useRecargarAlPulsarLaSeccion(publicaciones)
  useMarcarViejaSiQuedoEnError(clavePublicaciones(claseId))

  // "Ver más avisos" se desmonta con el foco dentro al cargar la última página (§7.14): el foco
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
    // O-14 (02d, DESIGN.md §7.14, ronda 4 de 02c: cambio de clave): al pasar de una clase a otra la
    // instancia se reutiliza. Una publicación de la clase anterior no tiene "vecina" en la nueva (los
    // índices de una lista no valen para la otra, aunque la nueva ya esté en la caché): el foco que
    // se perdió va al encabezado de la lista, nunca a una publicación al azar de la clase nueva.
    if (clasePrevia.current !== claseId) {
      clasePrevia.current = claseId
      if (idEnFoco === null || !focoPerdido(document)) return
      filaEnFocoRef.current = null
      encabezadoRef.current?.focus()
      return
    }
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
    if (publicaciones.isError && !conserva) {
      return (
        <MensajeError
          mensaje={mensajeDeErrorDeLista(publicaciones.error, TEXTOS_MURO.cambioMientrasLoVeias)}
        />
      )
    }
    if (publicaciones.isLoading || !filas) return <Cargando />
    if (filas.length === 0) {
      return (
        <Card>
          {/* ADMIN-01d2 (tabla D): en una clase archivada nadie puede publicar el primer aviso. */}
          <EstadoVacio
            titulo={soloLectura ? TEXTOS_MURO.vacioEstudiante : tituloDelMuroVacio(perspectiva)}
          />
        </Card>
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
                perspectiva={perspectiva}
              />
            </li>
          ))}
        </ul>
        {publicaciones.hasNextPage && (
          <Button
            ref={refVerMas}
            type="button"
            variant="outline"
            onClick={() => void publicaciones.fetchNextPage({ cancelRefetch: false })}
            // T-19 (ronda 2 de 01e, hermano): en espera también mientras el muro se recarga, para que
            // el clic no se una a la recarga y se pierda.
            enEspera={publicaciones.isFetching}
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
      {CAPACIDADES_POR_PERSPECTIVA[perspectiva].formularioPublicacion && !soloLectura && (
        <FormularioPublicacion key={claseId} claseId={claseId} />
      )}
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
