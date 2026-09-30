import { TEXTOS_PANEL, TEXTOS_UNIRSE } from "./data"
import { BloqueDestacado } from "./components/bloque-destacado"
import { FormularioUnirseClase, ID_CAMPO_CODIGO_CLASE } from "./components/formulario-unirse-clase"
import { PanelMisClases } from "./components/panel-mis-clases"
import { TarjetaClase } from "./components/tarjeta-clase"
import { useClasesInscritas, useNombreDeSesion } from "./hooks"
import { mensajeDeErrorClases } from "./lib"
import type { ClaseDelPanel } from "./types"

export function InicioEstudianteView() {
  const nombre = useNombreDeSesion()
  const clases = useClasesInscritas()
  const primeraPagina = clases.data?.pages[0]
  const total = primeraPagina?.total
  // Corrección de la ronda 1 (T-09, segunda pasada): sin valor de respaldo. Mientras `clases.data`
  // no exista, `filas` queda en `undefined` (no en un arreglo vacío fabricado); PanelMisClases ya
  // resuelve error y carga antes de leerlo, así que solo llega a mapearlo cuando sí hay datos.
  const filas: ClaseDelPanel[] | undefined = clases.data?.pages.flatMap((pagina) =>
    pagina.clases.map((clase) => ({
      id: clase.id,
      nombre: clase.nombre,
      metadatos: clase.maestro.nombre,
      destino: `/estudiante/clases/${clase.id}`,
    })),
  )

  return (
    <div className="flex flex-col gap-6">
      <BloqueDestacado
        rol="estudiante"
        nombre={nombre.data ?? ""}
        total={total}
        cargando={clases.isLoading}
        esError={clases.isError}
        errorTitular={TEXTOS_PANEL.error}
        insignia={TEXTOS_UNIRSE.insignia}
        tituloTarjeta={TEXTOS_UNIRSE.titulo}
      >
        <FormularioUnirseClase />
      </BloqueDestacado>

      <PanelMisClases
        isError={clases.isError}
        errorMensaje={clases.isError ? mensajeDeErrorClases(clases.error) : ""}
        isLoading={clases.isLoading}
        clases={filas}
        hasNextPage={clases.hasNextPage}
        isFetchingNextPage={clases.isFetchingNextPage}
        onVerMas={() => void clases.fetchNextPage()}
        accionVacio={{
          texto: TEXTOS_PANEL.accionEstudiante,
          onClick: () => document.getElementById(ID_CAMPO_CODIGO_CLASE)?.focus(),
        }}
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
