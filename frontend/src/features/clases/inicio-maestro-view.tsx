import { Link } from "react-router"

import {
  useMarcarViejaSiQuedoEnError,
  useRecargarAlPulsarLaSeccion,
} from "@/components/seccion/hooks"
import { buttonVariants } from "@/components/ui/button-variants"
import { Card, CardContent } from "@/components/ui/card"

import {
  CLAVE_CLASES_IMPARTIDAS,
  RUTA_CLASES_ARCHIVADAS_DEL_MAESTRO,
  TEXTOS_CLASES_ANTERIORES,
  TEXTOS_PANEL,
} from "./data"
import { BloqueDestacado } from "./components/bloque-destacado"
import { PanelMisClases } from "./components/panel-mis-clases"
import { TarjetaClase } from "./components/tarjeta-clase"
import {
  useAvisoDeRecargaFallida,
  useClasesImpartidas,
  useListaConservadaTrasLaPagina,
  useNombreDeSesion,
} from "./hooks"
import { mensajeDeConsultaClases, mensajeDeErrorDeLista, textoConteoAlumnos } from "./lib"
import type { ClaseDelPanel } from "./types"

export function InicioMaestroView() {
  const nombre = useNombreDeSesion()
  const clases = useClasesImpartidas()
  // CHORE-06b (§D-5, DH-02 a; O-E4-1): el fallo de la página siguiente (red o 5xx) conserva la lista,
  // también mientras una recarga la recupera, y el bloque destacado no dice el error; avisa una vez por
  // fallo. La ruta no tiene id: la clave es la de la consulta, que no cambia.
  const conserva = useListaConservadaTrasLaPagina(
    CLAVE_CLASES_IMPARTIDAS,
    clases.isFetchNextPageError,
    clases.isError,
    clases.errorUpdateCount,
    clases.errorUpdatedAt,
    clases.error,
  )
  useAvisoDeRecargaFallida(
    clases.errorUpdateCount,
    conserva,
    mensajeDeConsultaClases(clases.error),
    JSON.stringify(CLAVE_CLASES_IMPARTIDAS),
  )
  // CHORE-06b (§D-4): pulsar «Inicio» de la barra estando en el inicio vuelve a pedir la lista si está
  // en error o vieja, sin cancelar ni duplicar lo que vuela.
  useRecargarAlPulsarLaSeccion(clases)
  useMarcarViejaSiQuedoEnError(CLAVE_CLASES_IMPARTIDAS)
  const errorALaVista = clases.isError && !conserva
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
        esError={errorALaVista}
        errorTitular={TEXTOS_PANEL.error}
      />

      <PanelMisClases
        isError={errorALaVista}
        errorMensaje={
          errorALaVista
            ? mensajeDeErrorDeLista(clases.error, TEXTOS_PANEL.cambioMientrasLasVeias)
            : ""
        }
        isLoading={clases.isLoading}
        clases={filas}
        hasNextPage={clases.hasNextPage}
        isFetching={clases.isFetching}
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

      {/* ADMIN-01d2 (§D-9): sus clases archivadas ya no salen en la lista de arriba. Va en un panel: ningún
          texto va directo sobre el fondo. */}
      <Card>
        <CardContent>
          <Link
            to={RUTA_CLASES_ARCHIVADAS_DEL_MAESTRO}
            className={buttonVariants({ variant: "link", size: "enlace" })}
          >
            {TEXTOS_CLASES_ANTERIORES.archivadas.titulo}
          </Link>
        </CardContent>
      </Card>
    </div>
  )
}
