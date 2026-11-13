import { useEffect, useId, useRef, type FocusEvent, type ReactNode } from "react"
import { useLocation } from "react-router"

import { Cargando } from "@/components/cargando"
import { useSoloLecturaDeLaClase } from "@/components/clase/hooks"
import { EstadoVacio } from "@/components/estado-vacio"
import { MensajeError } from "@/components/mensaje-error"
import { useAlPulsarLaSeccionActiva } from "@/components/seccion/hooks"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

import { ConClaseDeLaRuta } from "./components/con-clase-de-la-ruta"
import { ElementoDeDuda } from "./components/elemento-de-duda"
import { FormularioDuda } from "./components/formulario-duda"
import { CAPACIDADES_POR_PERSPECTIVA, TEXTOS_DUDAS } from "./data"
import { useDudas, useFilaEnFoco, useFocoAlCargarMas, useFocoAlPasarAError } from "./hooks"
import { focoPerdido, mensajeDeErrorDeLista, perspectivaDeRuta, vecinaDeFila } from "./lib"

interface DudasDeLaClaseProps {
  claseId: string
}

// CLASES-03e (§D-9.1, DESIGN.md §7.31): "Dudas" en las tres perspectivas. El h2 visible con su frase y,
// para el estudiante y el maestro, "Publicar duda" (la única acción principal de la vista); el admin lee,
// marca y borra sin escribir (P-07: escribe en Dudas quien escribe comentarios). La lista va en un panel
// con divisores, de la más reciente a la más antigua. La ruta decide la perspectiva (perspectivaDeRuta);
// el backend lo exige por su cuenta. Estados de la lista en orden: error → cargando → vacío → datos.
function DudasDeLaClase({ claseId }: DudasDeLaClaseProps) {
  const { pathname } = useLocation()
  const perspectiva = perspectivaDeRuta(pathname)
  const capacidades = CAPACIDADES_POR_PERSPECTIVA[perspectiva]
  // ADMIN-01d2 (§D-9, fila 22 y tabla D): en una clase archivada no se pregunta, y la frase que describe
  // lo que se escribe ya no describe nada.
  const soloLectura = useSoloLecturaDeLaClase()
  const dudas = useDudas(claseId)
  const idTitulo = useId()
  const encabezadoRef = useRef<HTMLHeadingElement>(null)
  // T-04 (02c): si la lista se recarga con error después de una acción, el foco va al encabezado.
  useFocoAlPasarAError(dudas.isError, dudas.data !== undefined, claseId, encabezadoRef)
  const filaEnFocoRef = useFilaEnFoco("data-duda-id")
  // El control de la fila que tenía el foco: "Marcar como resuelta" lleva al de la vecina; cualquier
  // otro, a su "Borrar duda".
  const conMarcarEnFocoRef = useRef(false)
  const idsPrevios = useRef<string[] | undefined>(undefined)
  const clasePrevia = useRef(claseId)
  const filas = dudas.data?.pages.flatMap((pagina) => pagina.dudas)
  const ids = filas?.map((duda) => duda.id)

  const enfocarDuda = (id: string): boolean => {
    // CHORE-06a (ronda 2): tras un cambio de clase, «Ver más» de la anterior no lleva el foco a una
    // duda de la nueva (O-14): sin fila, el gancho va al encabezado de la lista.
    if (clasePrevia.current !== claseId) return false
    const fila = document.querySelector<HTMLElement>(`[data-duda-id="${id}"]`)
    fila?.focus()
    return fila !== null
  }

  // R4 y R9 (§D-10 a, N-54): pulsar "Dudas" estando ahí vuelve a pedir la lista desde la primera página
  // si está en error (el cursor ya no existe o la primera carga falló). Con la lista sana no hace nada.
  useAlPulsarLaSeccionActiva(() => {
    if (!dudas.isError) return
    void dudas.refetch()
  })

  // "Ver más dudas" se desmonta con el foco dentro al cargar la última página (§7.14): el foco va a la
  // primera duda nueva o, si no llegó ninguna, al encabezado.
  const refVerMas = useFocoAlCargarMas(ids, enfocarDuda, () => encabezadoRef.current?.focus())

  // §7.14: si la duda que tenía el foco sale de la lista (se borró, o ya no existía al marcarla o al
  // responderla), el foco va al control equivalente de la vecina ("Marcar como resuelta" o "Borrar
  // duda") o a la vecina y, sin vecinas, al encabezado. Si la duda sigue pero el control con el foco
  // desapareció (el control de las respuestas del admin al bajar a 0, o "Borrar duda" tras un
  // BORRADO_NO_PERMITIDO), a su fila. Al cambiar de clase, al encabezado. Nunca a <body>.
  useEffect(() => {
    const previos = idsPrevios.current
    idsPrevios.current = ids
    const idEnFoco = filaEnFocoRef.current
    if (clasePrevia.current !== claseId) {
      clasePrevia.current = claseId
      if (idEnFoco === null || !focoPerdido(document)) return
      filaEnFocoRef.current = null
      encabezadoRef.current?.focus()
      return
    }
    if (idEnFoco === null || !focoPerdido(document)) return
    filaEnFocoRef.current = null
    if (ids?.includes(idEnFoco) === true) {
      enfocarDuda(idEnFoco)
      return
    }
    const vecina = ids === undefined ? undefined : vecinaDeFila(previos, ids, idEnFoco)
    if (vecina === undefined) {
      encabezadoRef.current?.focus()
      return
    }
    const controles = conMarcarEnFocoRef.current
      ? ["[data-marcar-duda]", "[data-borrar-duda]"]
      : ["[data-borrar-duda]"]
    for (const control of controles) {
      const boton = document.querySelector<HTMLElement>(`[data-duda-id="${vecina}"] ${control}`)
      if (boton === null) continue
      boton.focus()
      return
    }
    enfocarDuda(vecina)
  })

  const alEnfocar = (evento: FocusEvent<HTMLElement>) => {
    conMarcarEnFocoRef.current =
      evento.target instanceof Element && evento.target.closest("[data-marcar-duda]") !== null
  }

  const contenido = (): ReactNode => {
    if (dudas.isError) {
      return (
        <MensajeError
          mensaje={mensajeDeErrorDeLista(dudas.error, TEXTOS_DUDAS.cambioMientrasLasVeias)}
        />
      )
    }
    if (dudas.isLoading || !filas) return <Cargando />
    if (filas.length === 0) {
      return (
        <Card>
          <EstadoVacio titulo={TEXTOS_DUDAS.vacio} />
        </Card>
      )
    }
    return (
      <Card>
        <CardContent className="flex flex-col gap-3">
          <ul className="flex flex-col" onFocus={alEnfocar}>
            {filas.map((duda) => (
              <ElementoDeDuda
                key={duda.id}
                claseId={claseId}
                duda={duda}
                perspectiva={perspectiva}
              />
            ))}
          </ul>
          {dudas.hasNextPage && (
            <Button
              ref={refVerMas}
              type="button"
              variant="outline"
              onClick={() => void dudas.fetchNextPage({ cancelRefetch: false })}
              // T-19 (ronda 2 de 01e): en espera también mientras la lista se recarga, para que el clic
              // no se una a la recarga y se pierda.
              enEspera={dudas.isFetching}
              className="self-start"
            >
              {TEXTOS_DUDAS.verMas}
            </Button>
          )}
        </CardContent>
      </Card>
    )
  }

  return (
    <section aria-labelledby={idTitulo} className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <h2 ref={encabezadoRef} id={idTitulo} tabIndex={-1} className="text-h2">
          {TEXTOS_DUDAS.titulo}
        </h2>
        {!soloLectura && <p className="text-small text-muted-foreground">{TEXTOS_DUDAS.frase}</p>}
      </div>
      {capacidades.formularioComentario && !soloLectura && (
        <FormularioDuda key={claseId} claseId={claseId} />
      )}
      {contenido()}
    </section>
  )
}

export function DudasView() {
  return <ConClaseDeLaRuta>{(claseId) => <DudasDeLaClase claseId={claseId} />}</ConClaseDeLaRuta>
}
