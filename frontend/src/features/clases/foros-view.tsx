import { Plus } from "lucide-react"
import { useEffect, useId, useRef, type ReactNode } from "react"
import { Link, useLocation } from "react-router"

import { Cargando } from "@/components/cargando"
import { useSoloLecturaDeLaClase } from "@/components/clase/hooks"
import { EstadoEntregaBadge } from "@/components/estado-entrega-badge"
import { EstadoVacio } from "@/components/estado-vacio"
import { MensajeError } from "@/components/mensaje-error"
import {
  useMarcarViejaSiQuedoEnError,
  useRecargarAlPulsarLaSeccion,
} from "@/components/seccion/hooks"
import { Button } from "@/components/ui/button"
import { buttonVariants } from "@/components/ui/button-variants"
import { Card, CardContent } from "@/components/ui/card"
import { estadoDeEntregaVisible } from "@/lib/estado-de-entrega"
import { baseDeClase } from "@/lib/ruta-de-clase"
import { claveListaDeForos } from "@/services/trabajoService"

import { ConClaseDeLaRuta } from "./components/con-clase-de-la-ruta"
import { FilaDeEntrega } from "./components/fila-de-entrega"
import { CAPACIDADES_POR_PERSPECTIVA, TEXTOS_FOROS } from "./data"
import {
  useAvisoDeRecargaFallida,
  useFocoAlCargarMas,
  useFocoAlPasarAError,
  useFilaEnFoco,
  useForos,
  useListaConservadaTrasLaPagina,
} from "./hooks"
import {
  focoPerdido,
  mensajeDeConsultaClases,
  mensajeDeErrorDeLista,
  perspectivaDeRuta,
} from "./lib"
import type { ElementoDeForo } from "./types"

interface ForosDeLaClaseProps {
  claseId: string
}

// FORO-01c1 (§D-8.2, DESIGN.md §7.7 y §7.10): la sección "Foro" en las tres perspectivas, como "Dudas".
// El h2 visible y, para el alumno, su frase; para el maestro y el admin, "Crear foro" (la única acción
// principal de la vista), que no se pinta en una clase archivada. La lista va en un panel, del foro más
// reciente al más antiguo; cada foro es una fila de entrega con "Foro:" oculto al inicio: el alumno ve
// el estado de su participación y el maestro y el admin el conteo de participaciones. La ruta decide la
// perspectiva (perspectivaDeRuta); el backend lo exige por su cuenta. Estados de la lista en orden:
// error → cargando → vacío → datos. Se monta de nuevo con cada clase (key={claseId}, CHORE-06a).
function ForosDeLaClase({ claseId }: ForosDeLaClaseProps) {
  const { pathname } = useLocation()
  const perspectiva = perspectivaDeRuta(pathname)
  const capacidades = CAPACIDADES_POR_PERSPECTIVA[perspectiva]
  const base = baseDeClase(perspectiva, claseId)
  const soloLectura = useSoloLecturaDeLaClase()
  const foros = useForos(claseId)
  const idTitulo = useId()
  const encabezadoRef = useRef<HTMLHeadingElement>(null)
  // CHORE-04: guarda síncrona de "Ver más foros"; enEspera llega un render después.
  const cargandoMasRef = useRef(false)
  // CHORE-06b (§D-5, DESIGN.md §7.10): el fallo de la página siguiente (red o 5xx) conserva la lista,
  // también mientras una recarga la recupera; avisa una vez por fallo.
  const conserva = useListaConservadaTrasLaPagina(
    claveListaDeForos(claseId),
    foros.isFetchNextPageError,
    foros.isError,
    foros.errorUpdateCount,
    foros.errorUpdatedAt,
    foros.error,
  )
  useAvisoDeRecargaFallida(
    foros.errorUpdateCount,
    conserva,
    mensajeDeConsultaClases(foros.error),
    claseId,
  )
  // T-04 (02c): si la lista se recarga con error, el foco va al encabezado, nunca a <body>.
  useFocoAlPasarAError(foros.isError && !conserva, foros.data !== undefined, claseId, encabezadoRef)
  // CHORE-06b (§D-4): pulsar "Foro" estando ahí vuelve a pedir la lista en error o vieja, sin cancelar
  // ni duplicar lo que vuela; salir con la lista en error la deja vieja para que volver la pida.
  useRecargarAlPulsarLaSeccion(foros)
  useMarcarViejaSiQuedoEnError(claveListaDeForos(claseId))
  const filaEnFocoRef = useFilaEnFoco("data-foro-id")
  const filas = foros.data?.pages.flatMap((pagina) => pagina.foros)
  const ids = filas?.map((foro) => foro.id)

  // N-28 (verificación de 01c1, §7.14): si una recarga (también la correcta) quita el foro que tenía el
  // foco, el foco va al encabezado, nunca a <body>. La lista no tiene acciones por fila, así que no hay
  // control equivalente en una vecina.
  useEffect(() => {
    const idEnFoco = filaEnFocoRef.current
    if (idEnFoco === null || !focoPerdido(document)) return
    filaEnFocoRef.current = null
    encabezadoRef.current?.focus()
  })

  const enfocarForo = (id: string): boolean => {
    const enlace = document.querySelector<HTMLElement>(`[data-foro-id="${id}"] a`)
    enlace?.focus()
    return enlace !== null
  }

  // "Ver más foros" se desmonta con el foco dentro al cargar la última página (§7.14): el foco va al
  // primer foro nuevo o, si no llegó ninguno, al encabezado.
  const refVerMas = useFocoAlCargarMas(ids, enfocarForo, () => encabezadoRef.current?.focus())

  const handleVerMas = () => {
    if (cargandoMasRef.current) return
    cargandoMasRef.current = true
    void foros.fetchNextPage({ cancelRefetch: false }).finally(() => {
      cargandoMasRef.current = false
    })
  }

  // El alumno ve el estado de su participación (entrega null y asignado se ven igual, S-10); el maestro
  // y el admin, cuántos participaron.
  const complementoDe = (foro: ElementoDeForo): ReactNode => {
    if (capacidades.gestionarTrabajo) {
      return (
        <span className="text-small text-muted-foreground">
          {TEXTOS_FOROS.participaciones(foro.participaciones)}
        </span>
      )
    }
    return (
      <EstadoEntregaBadge
        estado={estadoDeEntregaVisible(foro.entrega, foro.fechaLimite, new Date())}
      />
    )
  }

  const contenido = (): ReactNode => {
    if (foros.isError && !conserva) {
      return (
        <MensajeError
          mensaje={mensajeDeErrorDeLista(foros.error, TEXTOS_FOROS.cambioMientrasLosVeias)}
        />
      )
    }
    if (foros.isLoading || !filas) return <Cargando texto={TEXTOS_FOROS.cargando} />
    if (filas.length === 0) {
      return (
        <Card>
          <EstadoVacio titulo={TEXTOS_FOROS.vacio} />
        </Card>
      )
    }
    return (
      <Card>
        <CardContent className="flex flex-col gap-3">
          <ul className="flex flex-col gap-2">
            {filas.map((foro) => (
              <li key={foro.id} data-foro-id={foro.id}>
                <FilaDeEntrega
                  titulo={foro.titulo}
                  fechaLimite={foro.fechaLimite}
                  destino={`${base}/foros/${foro.id}`}
                  rotulo={TEXTOS_FOROS.rotuloDeLaFila}
                  complemento={complementoDe(foro)}
                />
              </li>
            ))}
          </ul>
          {foros.hasNextPage && (
            <Button
              ref={refVerMas}
              type="button"
              variant="outline"
              onClick={handleVerMas}
              // T-19 (ronda 2 de 01e): en espera también mientras la lista se recarga.
              enEspera={foros.isFetching}
              className="self-start"
            >
              {TEXTOS_FOROS.verMas}
            </Button>
          )}
        </CardContent>
      </Card>
    )
  }

  return (
    <section aria-labelledby={idTitulo} className="flex flex-col gap-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h2 ref={encabezadoRef} id={idTitulo} tabIndex={-1} className="text-h2">
            {TEXTOS_FOROS.titulo}
          </h2>
          {!capacidades.gestionarTrabajo && !soloLectura && (
            <p className="text-small text-muted-foreground">{TEXTOS_FOROS.frase}</p>
          )}
        </div>
        {capacidades.gestionarTrabajo && !soloLectura && (
          <Link to={`${base}/foros/nuevo`} className={buttonVariants({ variant: "primary" })}>
            <Plus aria-hidden="true" />
            {TEXTOS_FOROS.crear}
          </Link>
        )}
      </div>
      {contenido()}
    </section>
  )
}

export function ForosView() {
  return (
    <ConClaseDeLaRuta>
      {(claseId) => <ForosDeLaClase key={claseId} claseId={claseId} />}
    </ConClaseDeLaRuta>
  )
}
