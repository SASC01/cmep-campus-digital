import { ArrowLeft, Clock } from "lucide-react"
import { useEffect, useRef, useState, type ReactNode } from "react"
import { Link, useParams } from "react-router"
import { toast } from "sonner"

import { Cargando } from "@/components/cargando"
import { ConClaseDeLaRuta } from "@/components/clase/con-clase-de-la-ruta"
import { FirmaDelAutor } from "@/components/clase/firma-del-autor"
import { useGeneracionDeSoloLectura, useSoloLecturaDeLaClase } from "@/components/clase/hooks"
import { EstadoEntregaBadge } from "@/components/estado-entrega-badge"
import { MensajeError } from "@/components/mensaje-error"
import { useMarcarViejaSiQuedoEnError } from "@/components/seccion/hooks"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { buttonVariants } from "@/components/ui/button-variants"
import { Card, CardContent } from "@/components/ui/card"
import { esErrorDeCursor } from "@/lib/errores-de-api"
import { estadoDeEntregaVisible } from "@/lib/estado-de-entrega"
import { formatearFechaHora } from "@/lib/format"
import { unirPaginasSinRepetidas } from "@/lib/unir-paginas"
import { claveForo } from "@/services/trabajoService"

import { CalificacionDeLaEntrega } from "./components/calificacion-de-la-entrega"
import { DevolucionesDeLaParticipante } from "./components/devoluciones"
import { PanelDeCalificacion } from "./components/panel-de-calificacion"
import {
  MENSAJES_ERROR_FORO,
  MENSAJES_ERROR_TAREAS,
  TEXTOS_CALIFICAR,
  TEXTOS_DEL_PANEL_POR_TIPO,
  TEXTOS_DETALLE_FORO,
  TEXTOS_PARTICIPACIONES,
  TEXTOS_PARTICIPANTE,
} from "./data"
import {
  useAvisoDeRecargaFallidaDelForo,
  useAvisoDeRecargaFallidaEnElForo,
  useFocoAlEncabezadoSiSePierde,
  useFocoAlPerderseElControl,
  useForo,
  useMarcarElFalloComoAvisado,
  useParticipacionesDeAlumno,
  useParticipante,
  useRutaDeLaClase,
  useVerMasConservandoLaLista,
} from "./hooks"
import {
  claveDeFocoDeLaTarea,
  claveParticipacionesDeAlumno,
  claveParticipante,
  enlaceAParticipantes,
  errorQueRedirigeElCliente,
  errorQueReemplazaLaVistaDelForo,
  fraseDeParticipante,
  idCanonicoDeLaRuta,
  mensajeDeConsultaForo,
  recargaLaTareaTrasConflicto,
} from "./lib"
import type { EntregaDeAlumno, ForoDetalle } from "./types"

interface ParticipanteDelForoProps {
  claseId: string
  foroId: string
  alumnoId: string
}

// FORO-01e (§D-8.5, §E13.6): «Sus participaciones», lo que escribió el alumno en el foro (su principal y
// sus réplicas, con «En respuesta a» y la firma de la persona a quien responde), de la más antigua a la
// más reciente. La primera carga fallida la dice el bloque (DH-19); una recarga fallida con datos la
// conserva y avisa una vez por fallo; el cursor vencido dice su frase sin «Ver más participaciones». Un
// error que reemplazaría la vista no se repite aquí: el gancho vuelve a pedir la participante (R-01e-14).
// Si desaparece el control con el foco dentro del bloque, el foco va a su h3.
function SusParticipaciones({ claseId, foroId, alumnoId }: ParticipanteDelForoProps) {
  const consulta = useParticipacionesDeAlumno(claseId, foroId, alumnoId)
  const encabezadoRef = useRef<HTMLHeadingElement>(null)
  const bloqueRef = useRef<HTMLElement>(null)
  const clave = claveParticipacionesDeAlumno(claseId, foroId, alumnoId)
  useMarcarViejaSiQuedoEnError(clave)
  const filas =
    consulta.data === undefined
      ? undefined
      : unirPaginasSinRepetidas(consulta.data.pages.map((pagina) => pagina.participaciones))
  const ids = filas?.map(({ id }) => id)
  useAvisoDeRecargaFallidaEnElForo(
    clave,
    consulta.isError &&
      consulta.data !== undefined &&
      !consulta.isFetchNextPageError &&
      !esErrorDeCursor(consulta.error) &&
      !errorQueReemplazaLaVistaDelForo(true, consulta.error),
    consulta,
    TEXTOS_PARTICIPANTE.recargaFallidaDeLoQueEscribio,
  )

  const enfocarFila = (id: string): boolean => {
    const fila = document.querySelector<HTMLElement>(`[data-participacion-de-alumno="${id}"]`)
    fila?.focus()
    return fila !== null
  }

  const { refVerMas, handleVerMas } = useVerMasConservandoLaLista(consulta, {
    ids,
    enfocarFila,
    enfocarEncabezado: () => encabezadoRef.current?.focus(),
  })
  useFocoAlEncabezadoSiSePierde(bloqueRef, encabezadoRef)

  const lista = (): ReactNode => {
    if (consulta.isError && esErrorDeCursor(consulta.error)) {
      return <MensajeError mensaje={TEXTOS_PARTICIPANTE.cambioMientrasLasVeias} />
    }
    if (filas === undefined && consulta.isError) {
      return <MensajeError mensaje={TEXTOS_PARTICIPANTE.errorAlCargar} />
    }
    if (filas === undefined) return <Cargando />
    if (filas.length === 0) {
      return (
        <p className="text-small text-muted-foreground">{TEXTOS_PARTICIPANTE.sinParticipaciones}</p>
      )
    }
    return (
      <>
        <ul className="flex flex-col divide-y divide-border">
          {filas.map((participacion) => (
            <li
              key={participacion.id}
              data-participacion-de-alumno={participacion.id}
              tabIndex={-1}
              className="flex flex-col gap-1 py-3 first:pt-0 last:pb-0"
            >
              <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-small text-muted-foreground">
                <span>{formatearFechaHora(participacion.creadoEn)}</span>
                {participacion.conRetraso && (
                  <Badge variant="warning" icon={<Clock aria-hidden="true" />}>
                    {TEXTOS_PARTICIPACIONES.conRetraso}
                  </Badge>
                )}
              </p>
              {participacion.enRespuestaA !== null && (
                <p className="text-small text-muted-foreground">
                  {TEXTOS_PARTICIPANTE.enRespuestaA}{" "}
                  <FirmaDelAutor autor={participacion.enRespuestaA.autor} />
                </p>
              )}
              <p className="max-w-prose wrap-anywhere whitespace-pre-line text-body">
                {participacion.texto}
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
            {TEXTOS_PARTICIPANTE.verMas}
          </Button>
        )}
      </>
    )
  }

  return (
    <Card>
      <CardContent>
        <section ref={bloqueRef} className="flex flex-col gap-3">
          <h3 ref={encabezadoRef} tabIndex={-1} className="text-h3">
            {TEXTOS_PARTICIPANTE.susParticipaciones}
          </h3>
          {lista()}
        </section>
      </CardContent>
    </Card>
  )
}

// FORO-01e (§D-8.5, §E13.6 y §E13.7, DESIGN.md §7.26): la participación de un alumno en un foro, para sus
// maestros y el admin: su nombre con su estado, cuándo participó, lo que escribió, la calificación (el
// panel del maestro o la lectura del admin) y los comentarios de la devolución. Tiene la forma de la entrega
// de un alumno (entrega-de-alumno-view.tsx):
// - un error que reemplaza la vista (el foro o el alumno ya no existen, se perdió el acceso) la reemplaza;
// - con la participante en caché, una recarga fallida avisa una vez por fallo; la del foro, la suya;
// - tras un 409 de calificar se vuelve a pedir la participante y, si el conflicto depende del foro, el
//   foro; si las dos responden, el panel se reinicia; si falla la participante, un aviso (DH-19);
// - en una clase archivada se lee la calificación, sin panel.
// Es el contenido, montado con key por el foro y el alumno juntos debajo de la raíz del marco: lo escrito
// en el panel, la versión y los reinicios son de esta participación.
function ParticipacionDeUnAlumno({ claseId, foroId, alumnoId }: ParticipanteDelForoProps) {
  const { perspectiva, base } = useRutaDeLaClase(claseId)
  const foro = useForo(claseId, foroId)
  const consulta = useParticipante(claseId, foroId, alumnoId)
  const marcarComoAvisado = useMarcarElFalloComoAvisado()
  const hayForo = foro.data !== undefined
  const hayParticipante = consulta.data !== undefined
  const [reinicios, setReinicios] = useState(0)
  // Mientras se recarga tras un 409, el fallo de esa recarga lo avisa el panel (DH-19), no el de la
  // recarga fallida.
  const [recargando, setRecargando] = useState(false)
  const soloLectura = useSoloLecturaDeLaClase()
  if (soloLectura && reinicios > 0) setReinicios(0)
  const { generacion, sigueVigente } = useGeneracionDeSoloLectura()
  const montadoRef = useRef(false)

  useEffect(() => {
    montadoRef.current = true
    return () => {
      montadoRef.current = false
    }
  }, [])

  const participanteReemplazaLaVista =
    consulta.isError && errorQueReemplazaLaVistaDelForo(hayParticipante, consulta.error)
  const foroReemplazaLaVista = foro.isError && errorQueReemplazaLaVistaDelForo(hayForo, foro.error)

  useAvisoDeRecargaFallidaDelForo(
    claseId,
    foroId,
    foro.isError &&
      hayForo &&
      !errorQueReemplazaLaVistaDelForo(hayForo, foro.error) &&
      !participanteReemplazaLaVista &&
      !recargando,
    foro,
    TEXTOS_DETALLE_FORO.avisoRecargaFallida,
  )
  useAvisoDeRecargaFallidaEnElForo(
    claveParticipante(claseId, foroId, alumnoId),
    consulta.isError &&
      hayParticipante &&
      !participanteReemplazaLaVista &&
      !foroReemplazaLaVista &&
      !recargando,
    consulta,
    TEXTOS_PARTICIPANTE.recargaFallida,
  )

  const recargarTrasConflicto = async (error: unknown) => {
    if (!montadoRef.current || !sigueVigente(generacion)) return
    setRecargando(true)
    try {
      const [participanteNueva, foroNuevo] = await Promise.all([
        consulta.refetch(),
        recargaLaTareaTrasConflicto(error) ? foro.refetch() : Promise.resolve(null),
      ])
      // T-01 (ronda 1): un solo aviso de la recarga. Si falló el foro, lo avisa su propio aviso de
      // recarga fallida (como la tarea en la entrega de un alumno) y el fallo de la participante queda como
      // avisado. Con la vista ya desmontada (o la clase en solo lectura), los dos fallos quedan como avisados:
      // al volver no se anuncia un fallo de una recarga que ya nadie veía.
      const vigente = montadoRef.current && sigueVigente(generacion)
      const falloElForo = foroNuevo !== null && foroNuevo.isError
      if (participanteNueva.isError && (falloElForo || !vigente)) {
        marcarComoAvisado(claveParticipante(claseId, foroId, alumnoId))
      }
      if (falloElForo && !vigente) marcarComoAvisado(claveForo(claseId, foroId))
      if (!vigente || falloElForo) return
      if (participanteNueva.isError) {
        marcarComoAvisado(claveParticipante(claseId, foroId, alumnoId))
        if (errorQueReemplazaLaVistaDelForo(true, participanteNueva.error)) return
        if (errorQueRedirigeElCliente(participanteNueva.error)) return
        toast.error(TEXTOS_DEL_PANEL_POR_TIPO.foro.avisoRecargaFallida)
        return
      }
      setReinicios((n) => n + 1)
    } catch {
      if (montadoRef.current && sigueVigente(generacion)) {
        toast.error(TEXTOS_DEL_PANEL_POR_TIPO.foro.avisoRecargaFallida)
      }
    } finally {
      if (montadoRef.current) setRecargando(false)
    }
  }

  // S-01: el maestro califica con el panel; el admin (o el maestro en una clase archivada) lee.
  const calificacion = (foroDetalle: ForoDetalle, entrega: EntregaDeAlumno): ReactNode => {
    if (perspectiva === "maestro" && !soloLectura) {
      return (
        <PanelDeCalificacion
          key={reinicios}
          claseId={claseId}
          tareaId={foroId}
          alumnoId={alumnoId}
          tarea={foroDetalle}
          entrega={entrega}
          actividad={{ tipo: "foro", id: foroId }}
          onConflicto={recargarTrasConflicto}
          onCalificada={() => {
            if (!sigueVigente(generacion)) return
            setReinicios((n) => n + 1)
          }}
          enfocarAlMontar={reinicios > 0}
        />
      )
    }

    if (perspectiva === "estudiante") return null

    return (
      <Card>
        <CardContent className="flex flex-col gap-4">
          <h3 tabIndex={-1} className="text-h3">
            {TEXTOS_CALIFICAR.titulo}
          </h3>
          {entrega.calificacion === null ? (
            <p className="text-small text-muted-foreground">{TEXTOS_CALIFICAR.sinCalificar}</p>
          ) : (
            <CalificacionDeLaEntrega calificacion={entrega.calificacion} />
          )}
        </CardContent>
      </Card>
    )
  }

  const contenido = (): ReactNode => {
    if (foro.isError && errorQueReemplazaLaVistaDelForo(hayForo, foro.error)) {
      return <MensajeError mensaje={mensajeDeConsultaForo(foro.error)} />
    }

    if (participanteReemplazaLaVista) {
      return <MensajeError mensaje={mensajeDeConsultaForo(consulta.error)} />
    }

    if (!foro.data || !consulta.data) {
      return <Cargando texto={TEXTOS_PARTICIPANTE.cargando} />
    }

    const { entrega } = consulta.data
    const estado = estadoDeEntregaVisible(entrega, foro.data.foro.fechaLimite, new Date())

    return (
      <div className="flex flex-col gap-5">
        <Card>
          <CardContent className="flex flex-col gap-4">
            <Link
              to={enlaceAParticipantes(base, foroId)}
              className={buttonVariants({ variant: "ghost", size: "sm", className: "self-start" })}
            >
              <ArrowLeft aria-hidden="true" />
              {TEXTOS_PARTICIPANTE.volver}
            </Link>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <h2 tabIndex={-1} className="wrap-anywhere text-h2">
                {entrega.alumno.nombre}
              </h2>
              <EstadoEntregaBadge estado={estado} />
            </div>
            <p className="wrap-anywhere text-small text-muted-foreground">
              {foro.data.foro.titulo}
            </p>
            <p className="text-small">{fraseDeParticipante(entrega)}</p>
          </CardContent>
        </Card>
        <SusParticipaciones claseId={claseId} foroId={foroId} alumnoId={alumnoId} />
        {calificacion(foro.data.foro, entrega)}
        <Card>
          <CardContent>
            <DevolucionesDeLaParticipante claseId={claseId} foroId={foroId} alumnoId={alumnoId} />
          </CardContent>
        </Card>
      </div>
    )
  }

  return contenido()
}

// CHORE-06a (§D-1, Forma C): el marco conserva la raíz de foco y su clave compuesta; la clave cambia con
// el foro o con el alumno, así que si el control con el foco se desmonta al pasar a otra participación o
// porque la vista se reemplaza, el foco va a la raíz y no a <body>. Lee las mismas consultas que el
// contenido (misma clave, una petición).
function ParticipanteDelForo({ claseId, foroId, alumnoId }: ParticipanteDelForoProps) {
  const foro = useForo(claseId, foroId)
  const consulta = useParticipante(claseId, foroId, alumnoId)
  const raizRef = useRef<HTMLDivElement>(null)
  useFocoAlPerderseElControl(
    raizRef,
    `${claveDeFocoDeLaTarea(foroId, foro)}|${claveDeFocoDeLaTarea(alumnoId, consulta)}`,
  )

  return (
    <div ref={raizRef} tabIndex={-1}>
      <ParticipacionDeUnAlumno
        key={`${foroId}:${alumnoId}`}
        claseId={claseId}
        foroId={foroId}
        alumnoId={alumnoId}
      />
    </div>
  )
}

// El :claseId lo lee ConClaseDeLaRuta; el :foroId y el :alumnoId, esta vista, en su forma canónica antes
// de pedir y de armar claves, keys y rutas. Sin alguno de los dos no pide nada y dice lo mismo que un foro
// o un alumno que no existen.
export function ParticipanteView() {
  const { foroId, alumnoId } = useParams<{ foroId: string; alumnoId: string }>()

  return (
    <ConClaseDeLaRuta>
      {(claseId) => {
        if (foroId === undefined) {
          return <MensajeError mensaje={MENSAJES_ERROR_FORO.foroNoEncontrado} />
        }
        if (alumnoId === undefined) {
          return <MensajeError mensaje={MENSAJES_ERROR_TAREAS.alumnoNoEncontrado} />
        }
        return (
          <ParticipanteDelForo
            claseId={claseId}
            foroId={idCanonicoDeLaRuta(foroId)}
            alumnoId={idCanonicoDeLaRuta(alumnoId)}
          />
        )
      }}
    </ConClaseDeLaRuta>
  )
}
