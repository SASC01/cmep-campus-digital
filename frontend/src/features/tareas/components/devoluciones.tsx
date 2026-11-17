import { useRef, type ReactNode } from "react"

import { Cargando } from "@/components/cargando"
import { FirmaDelAutor } from "@/components/clase/firma-del-autor"
import { MensajeError } from "@/components/mensaje-error"
import { useMarcarViejaSiQuedoEnError } from "@/components/seccion/hooks"
import { Button } from "@/components/ui/button"
import { esErrorDeCursor } from "@/lib/errores-de-api"
import { formatearFechaHora } from "@/lib/format"
import { unirPaginasSinRepetidas } from "@/lib/unir-paginas"

import { TEXTOS_DEVOLUCIONES } from "../data"
import {
  useAvisoDeRecargaFallidaEnElForo,
  useDevoluciones,
  useFocoAlEncabezadoSiSePierde,
  useMisDevoluciones,
  useVerMasConservandoLaLista,
} from "../hooks"
import { claveDevoluciones, claveMisDevoluciones, errorQueReemplazaLaVistaDelForo } from "../lib"
import type { ConsultaDeDevoluciones, TextosDeDevoluciones } from "../types"

interface ListaDeDevolucionesProps {
  consulta: ConsultaDeDevoluciones
  clave: readonly unknown[]
  textos: TextosDeDevoluciones
  // El nivel de su encabezado: h3 en la participación de un alumno, h4 dentro de «Tu participación».
  nivel: 3 | 4
}

// FORO-01e (§D-8.5, §E13.6 y §E13.7, DESIGN.md §7.25): los comentarios de la devolución, en solo lectura
// y del más antiguo al más reciente, con la lógica de las listas de features/tareas.
// - La primera carga fallida la dice el bloque, con su texto y sin aviso. Un error que reemplazaría la
//   vista no se repite aquí: el gancho de la consulta vuelve a pedir lo principal (R-01e-14).
// - Una recarga fallida con datos los conserva y avisa una vez por fallo (memoria por consulta).
// - El cursor vencido dice su frase, sin «Ver más comentarios»; al salir en error queda vieja.
// - Sin `vacio` (el del alumno), el bloque no se pinta mientras carga ni vacío.
// - Si desaparece el control que tenía el foco dentro del bloque, el foco va a su encabezado.
function ListaDeDevoluciones({ consulta, clave, textos, nivel }: ListaDeDevolucionesProps) {
  const encabezadoRef = useRef<HTMLHeadingElement>(null)
  const bloqueRef = useRef<HTMLElement>(null)
  useMarcarViejaSiQuedoEnError(clave)
  const filas =
    consulta.data === undefined
      ? undefined
      : unirPaginasSinRepetidas(consulta.data.pages.map((pagina) => pagina.comentarios))
  const ids = filas?.map(({ id }) => id)
  useAvisoDeRecargaFallidaEnElForo(
    clave,
    consulta.isError &&
      consulta.data !== undefined &&
      !consulta.isFetchNextPageError &&
      !esErrorDeCursor(consulta.error) &&
      !errorQueReemplazaLaVistaDelForo(true, consulta.error),
    consulta,
    textos.recargaFallida,
  )

  const enfocarFila = (id: string): boolean => {
    const fila = document.querySelector<HTMLElement>(`[data-devolucion-id="${id}"]`)
    fila?.focus()
    return fila !== null
  }

  const { refVerMas, handleVerMas } = useVerMasConservandoLaLista(consulta, {
    ids,
    enfocarFila,
    enfocarEncabezado: () => encabezadoRef.current?.focus(),
  })
  useFocoAlEncabezadoSiSePierde(bloqueRef, encabezadoRef)

  const sinPintar = textos.vacio === null && (filas === undefined || filas.length === 0)
  if (sinPintar && !consulta.isError) return null

  const lista = (): ReactNode => {
    if (consulta.isError && esErrorDeCursor(consulta.error)) {
      return <MensajeError mensaje={textos.cambioMientrasLosVeias} />
    }
    if (filas === undefined && consulta.isError) {
      return <MensajeError mensaje={textos.errorAlCargar} />
    }
    if (filas === undefined) return <Cargando />
    if (filas.length === 0) {
      return <p className="text-small text-muted-foreground">{textos.vacio}</p>
    }
    return (
      <>
        <ul className="flex flex-col divide-y divide-border">
          {filas.map((comentario) => (
            <li
              key={comentario.id}
              data-devolucion-id={comentario.id}
              tabIndex={-1}
              className="flex flex-col gap-1 py-3 first:pt-0 last:pb-0"
            >
              <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-small text-muted-foreground">
                <FirmaDelAutor autor={comentario.autor} />
                <span>{formatearFechaHora(comentario.creadoEn)}</span>
              </p>
              <p className="max-w-prose wrap-anywhere whitespace-pre-line text-body">
                {comentario.texto}
              </p>
            </li>
          ))}
        </ul>
        {consulta.hasNextPage && (
          <Button
            ref={refVerMas}
            type="button"
            variant="outline"
            size="sm"
            enEspera={consulta.isFetching}
            onClick={() => void handleVerMas()}
            className="self-start"
          >
            {TEXTOS_DEVOLUCIONES.verMas}
          </Button>
        )}
      </>
    )
  }

  const encabezado =
    nivel === 3 ? (
      <h3 ref={encabezadoRef} tabIndex={-1} className="text-h3">
        {textos.titulo}
      </h3>
    ) : (
      <h4 ref={encabezadoRef} tabIndex={-1} className="text-body font-bold">
        {textos.titulo}
      </h4>
    )

  return (
    <section ref={bloqueRef} className="flex flex-col gap-3">
      {encabezado}
      {lista()}
    </section>
  )
}

interface DevolucionesDeLaParticipanteProps {
  claseId: string
  foroId: string
  alumnoId: string
}

// «Comentarios de la devolución» de un alumno, para sus maestros y el admin (ruta 15).
export function DevolucionesDeLaParticipante({
  claseId,
  foroId,
  alumnoId,
}: DevolucionesDeLaParticipanteProps) {
  const consulta = useDevoluciones(claseId, foroId, alumnoId)
  return (
    <ListaDeDevoluciones
      consulta={consulta}
      clave={claveDevoluciones(claseId, foroId, alumnoId)}
      textos={TEXTOS_DEVOLUCIONES.deLaParticipante}
      nivel={3}
    />
  )
}

interface DevolucionesDeTuMaestroProps {
  claseId: string
  foroId: string
}

// «Comentarios de tu maestro», en «Tu participación» del alumno (ruta 7). Quien la monta lo hace solo con
// calificación (R-01e-11).
export function DevolucionesDeTuMaestro({ claseId, foroId }: DevolucionesDeTuMaestroProps) {
  const consulta = useMisDevoluciones(claseId, foroId)
  return (
    <ListaDeDevoluciones
      consulta={consulta}
      clave={claveMisDevoluciones(claseId, foroId)}
      textos={TEXTOS_DEVOLUCIONES.deTuMaestro}
      nivel={4}
    />
  )
}
