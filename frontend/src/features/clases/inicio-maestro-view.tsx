import { TEXTOS_PANEL } from "./data"
import { BloqueDestacado } from "./components/bloque-destacado"
import { PanelMisClases } from "./components/panel-mis-clases"
import { TarjetaClase } from "./components/tarjeta-clase"
import { useClasesImpartidas, useNombreDeSesion } from "./hooks"
import { mensajeDeErrorDeLista, textoConteoAlumnos } from "./lib"
import type { ClaseDelPanel } from "./types"

export function InicioMaestroView() {
  const nombre = useNombreDeSesion()
  const clases = useClasesImpartidas()
  const primeraPagina = clases.data?.pages[0]
  const total = primeraPagina?.total
  // Corrección de la ronda 1 (T-09, segunda pasada): sin valor de respaldo. Mientras `clases.data`
  // no exista, `filas` queda en `undefined` (no en un arreglo vacío fabricado); PanelMisClases ya
  // resuelve error y carga antes de leerlo, así que solo llega a mapearlo cuando sí hay datos.
  const filas: ClaseDelPanel[] | undefined = clases.data?.pages.flatMap((pagina) =>
    pagina.clases.map((clase) => ({
      id: clase.id,
      nombre: clase.nombre,
      metadatos: textoConteoAlumnos(clase.alumnos),
      destino: `/maestro/clases/${clase.id}`,
    })),
  )

  return (
    <div className="flex flex-col gap-6">
      <BloqueDestacado
        rol="maestro"
        nombre={nombre.data ?? ""}
        total={total}
        cargando={clases.isLoading}
        esError={clases.isError}
        errorTitular={TEXTOS_PANEL.error}
      />

      <PanelMisClases
        isError={clases.isError}
        errorMensaje={
          clases.isError
            ? mensajeDeErrorDeLista(clases.error, TEXTOS_PANEL.cambioMientrasLasVeias)
            : ""
        }
        isLoading={clases.isLoading}
        clases={filas}
        hasNextPage={clases.hasNextPage}
        isFetchingNextPage={clases.isFetchingNextPage}
        onVerMas={() => void clases.fetchNextPage({ cancelRefetch: false })}
        descripcionVacio={TEXTOS_PANEL.vacioDescripcionMaestro}
        render={(clase) => (
          <TarjetaClase
            key={clase.id}
            claseId={clase.id}
            nombre={clase.nombre}
            metadatos={clase.metadatos}
            destino={clase.destino}
          />
        )}
      />
    </div>
  )
}
