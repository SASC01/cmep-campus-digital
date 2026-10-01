import { useRef, type ReactNode } from "react"
import { useParams } from "react-router"

import { Cargando } from "@/components/cargando"
import { EstadoVacio } from "@/components/estado-vacio"
import { MensajeError } from "@/components/mensaje-error"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

import { ListaPersonas } from "./components/lista-personas"
import { TEXTOS_PERSONAS } from "./data"
import { useFocoAlCargarMas, usePersonas } from "./hooks"
import { mensajeDeErrorClases, textoConteoAlumnos } from "./lib"

// §D-B4: compañeros de la clase (RF-19). La ruta es la del estudiante inscrito; el backend también
// deja pasar al maestro dueño (requireMembership), pero el router no le da una ruta propia. Solo
// nombres: ni correo, ni estado de pago ni restricción de acceso (S-09).
export function PersonasView() {
  const { claseId } = useParams<{ claseId: string }>()
  const personas = usePersonas(claseId ?? "")
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
    if (personas.isError) return <MensajeError mensaje={mensajeDeErrorClases(personas.error)} />
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
    if (personas.isError) return <MensajeError mensaje={mensajeDeErrorClases(personas.error)} />
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
            onClick={() => void personas.fetchNextPage()}
            enEspera={personas.isFetchingNextPage}
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
              {TEXTOS_PERSONAS.maestro}
            </h2>
            <ListaPersonas personas={[primera.maestro]} etiqueta={TEXTOS_PERSONAS.maestro} />
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
