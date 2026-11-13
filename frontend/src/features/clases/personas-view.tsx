import { useRef, type ReactNode } from "react"
import { useLocation } from "react-router"

import { Cargando } from "@/components/cargando"
import { EstadoVacio } from "@/components/estado-vacio"
import { MensajeError } from "@/components/mensaje-error"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"

import { AlumnosView } from "./alumnos-view"
import { ConClaseDeLaRuta } from "./components/con-clase-de-la-ruta"
import { ListaMaestrosDeClase } from "./components/lista-maestros-de-clase"
import { ListaPersonas } from "./components/lista-personas"
import { TEXTOS_PERSONAS } from "./data"
import { useClase, useFocoAlCargarMas, usePersonas } from "./hooks"
import {
  etiquetaDeMaestros,
  mensajeDeConsultaClases,
  perspectivaDeRuta,
  textoConteoAlumnos,
} from "./lib"
import { MaestrosDeClaseView } from "./maestros-de-clase-view"

interface PersonasDeLaClaseProps {
  claseId: string
}

// §D-B4: compañeros de la clase (RF-19). La ruta es la del estudiante inscrito; el backend también
// deja pasar al maestro dueño (requireMembership), pero el router no le da una ruta propia. Nombre y
// correo (texto plano, CLASES-02d §D-2D2): nunca estado de pago ni restricción de acceso (S-09).
function PersonasDeLaClase({ claseId }: PersonasDeLaClaseProps) {
  const personas = usePersonas(claseId)
  const encabezadoRef = useRef<HTMLHeadingElement>(null)
  // T-26: "Ver más alumnos" se desmonta con el foco dentro al cargar la última página; el foco va a la
  // primera persona nueva (su <li> con tabIndex -1) o, si no llegó nadie, al encabezado "Alumnos".
  const refVerMas = useFocoAlCargarMas(
    personas.data?.pages.flatMap((pagina) => pagina.alumnos.map((alumno) => alumno.id)),
    (id) => {
      const fila = document.querySelector<HTMLElement>(`[data-persona-id="${id}"]`)
      fila?.focus()
      return fila !== null
    },
    () => encabezadoRef.current?.focus(),
  )

  // Antes de la primera carga no hay vista que conservar: solo el error o el cargando.
  if (personas.data === undefined) {
    if (personas.isError) return <MensajeError mensaje={mensajeDeConsultaClases(personas.error)} />
    return <Cargando />
  }

  const primera = personas.data?.pages[0]
  const ultima = personas.data?.pages.at(-1)
  const cargada = !personas.isError && primera !== undefined && ultima !== undefined
  const alumnos = cargada ? personas.data?.pages.flatMap((pagina) => pagina.alumnos) : undefined

  // T-27: después de la primera carga, el encabezado "Alumnos" queda montado en todos los estados
  // de la vista (error, cargando, vacío y datos): si la consulta de la página siguiente falla, el foco que estaba en "Ver más
  // alumnos" tiene a dónde ir. Estados en orden: error → cargando → vacío → datos.
  const contenido = (): ReactNode => {
    if (personas.isError) return <MensajeError mensaje={mensajeDeConsultaClases(personas.error)} />
    if (personas.isLoading || !alumnos) return <Cargando />
    if (alumnos.length === 0) return <EstadoVacio titulo={TEXTOS_PERSONAS.vacio} />
    return (
      <>
        <ListaPersonas personas={alumnos} etiqueta={TEXTOS_PERSONAS.alumnos} />
        {personas.hasNextPage && (
          <Button
            ref={refVerMas}
            type="button"
            variant="outline"
            onClick={() => void personas.fetchNextPage({ cancelRefetch: false })}
            enEspera={personas.isFetching}
            className="self-start"
          >
            {TEXTOS_PERSONAS.verMas}
          </Button>
        )}
      </>
    )
  }

  return (
    <Card>
      <CardContent className="flex flex-col gap-6">
        {cargada && (
          <section aria-labelledby="personas-maestro" className="flex flex-col gap-2">
            <h2 id="personas-maestro" className="text-h3">
              {etiquetaDeMaestros(primera.maestros.length)}
            </h2>
            <ListaPersonas
              personas={primera.maestros}
              etiqueta={etiquetaDeMaestros(primera.maestros.length)}
            />
          </section>
        )}

        <section aria-labelledby="personas-alumnos" className="flex flex-col gap-2">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 id="personas-alumnos" ref={encabezadoRef} tabIndex={-1} className="text-h3">
              {TEXTOS_PERSONAS.alumnos}
            </h2>
            {cargada && alumnos !== undefined && alumnos.length > 0 && (
              <p className="text-small text-muted-foreground">
                {textoConteoAlumnos(ultima.totalAlumnos)}
              </p>
            )}
          </div>
          {contenido()}
        </section>
      </CardContent>
    </Card>
  )
}

interface MaestrosDeLaClaseEnLecturaProps {
  claseId: string
}

// CLASES-03 (§D-7.7, S-07): los maestros de la clase para el maestro, de solo lectura (sin "Quitar":
// asignar y quitar es del admin). Los nombres salen del detalle de la clase, la misma consulta del
// encabezado, ya en caché: ninguna petición nueva. Estados en orden: error → cargando → datos.
function MaestrosDeLaClaseEnLectura({ claseId }: MaestrosDeLaClaseEnLecturaProps) {
  const clase = useClase(claseId)
  const titulo =
    clase.data === undefined
      ? TEXTOS_PERSONAS.maestros
      : etiquetaDeMaestros(clase.data.maestros.length)

  const contenido = (): ReactNode => {
    if (clase.isError) return <MensajeError mensaje={mensajeDeConsultaClases(clase.error)} />
    if (clase.isLoading || !clase.data) return <Cargando />
    return (
      <ListaMaestrosDeClase
        etiqueta={titulo}
        maestros={clase.data.maestros}
        confirmar={false}
        quitando={false}
        puedeQuitar={false}
        onQuitar={() => undefined}
        alQuedarseSinDestino={() => undefined}
      />
    )
  }

  return (
    <Card>
      <CardHeader>
        <h2 className="text-h2">{titulo}</h2>
      </CardHeader>
      <CardContent>{contenido()}</CardContent>
    </Card>
  )
}

// CLASES-03 (§D-7.7, S-07, DH-09): "Personas" decide por la perspectiva de la ruta. El estudiante ve a
// sus maestros y compañeros (lo de antes); el maestro, a los maestros de la clase (solo lectura) y su
// roster con el buscador (lo que era "Alumnos"); el admin, la asignación de maestros (lo que era
// "Maestros") y el roster con el buscador. Maestros arriba, alumnos abajo. Se componen las vistas que
// ya existían; cada una lee :claseId con ConClaseDeLaRuta. Sin :claseId válido, la vista dice una sola
// vez que no hay acceso: las vistas compuestas solo se montan dentro de la comprobación de afuera.
export function PersonasView() {
  const { pathname } = useLocation()
  const perspectiva = perspectivaDeRuta(pathname)
  if (perspectiva === "admin") {
    return (
      <ConClaseDeLaRuta>
        {() => (
          <div className="flex flex-col gap-5">
            <MaestrosDeClaseView />
            <AlumnosView />
          </div>
        )}
      </ConClaseDeLaRuta>
    )
  }
  if (perspectiva === "maestro") {
    return (
      <ConClaseDeLaRuta>
        {(claseId) => (
          <div className="flex flex-col gap-5">
            <MaestrosDeLaClaseEnLectura claseId={claseId} />
            <AlumnosView />
          </div>
        )}
      </ConClaseDeLaRuta>
    )
  }
  // El :claseId lo lee ConClaseDeLaRuta (§D-C5 bis).
  return (
    <ConClaseDeLaRuta>
      {(claseId) => <PersonasDeLaClase key={claseId} claseId={claseId} />}
    </ConClaseDeLaRuta>
  )
}
