import { useEffect, useId, useRef, type ReactNode } from "react"

import { Cargando } from "@/components/cargando"
import { useSoloLecturaDeLaClase } from "@/components/clase/hooks"
import { MensajeError } from "@/components/mensaje-error"
import { useMarcarViejaSiQuedoEnError } from "@/components/seccion/hooks"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { esErrorDeCursor } from "@/lib/errores-de-api"
import type { Perspectiva } from "@/lib/ruta-de-clase"

import { TEXTOS_PARTICIPACIONES } from "../data"
import {
  useAvisoDeRecargaFallidaEnElForo,
  useFocoAlEncabezadoSiSePierde,
  useMiParticipacion,
  useParticipaciones,
  useVerMasConservandoLaLista,
} from "../hooks"
import {
  claveParticipaciones,
  errorQueReemplazaLaVistaDelForo,
  unirPaginasConLaUltimaAparicion,
} from "../lib"
import { FormularioDeParticipacion } from "./formulario-de-participacion"
import { ParticipacionDelForo } from "./participacion-del-foro"

interface ParticipacionesDelForoProps {
  claseId: string
  // El id canónico que recibe DetalleDelForo (R-01d-4).
  foroId: string
  perspectiva: Perspectiva
}

// FORO-01d (§D-8.4, §D-10, DESIGN.md §7.25): «Participaciones», bajo el planteamiento del foro. Para el
// alumno, el formulario de su principal según «Tu participación» (el servidor decide si puede, si
// quedará con retraso y si el foro ya cerró, E1-1); para el admin, la nota de que solo lee. La lista va
// de la más antigua a la más reciente, con el patrón de Entregas: la primera carga fallida la dice el
// bloque, sin aviso; una recarga fallida con datos la conserva y avisa una vez por fallo; el cursor
// vencido dice su frase sin «Ver más participaciones» y, al salir, queda vieja para pedirla al volver.
// Tras publicar, el foco va a la participación nueva; tras borrar, al «Borrar» de la vecina o, sin
// vecinas, al h3 (nunca a <body>).
export function ParticipacionesDelForo({
  claseId,
  foroId,
  perspectiva,
}: ParticipacionesDelForoProps) {
  const soloLectura = useSoloLecturaDeLaClase()
  const participaciones = useParticipaciones(claseId, foroId)
  const esAlumno = perspectiva === "estudiante"
  const mia = useMiParticipacion(claseId, foroId, esAlumno)
  const idTitulo = useId()
  const encabezadoRef = useRef<HTMLHeadingElement>(null)
  const bloqueRef = useRef<HTMLElement>(null)
  // La participación que debe recibir el foco cuando aparezca (la recién publicada).
  const nuevaRef = useRef<string | null>(null)
  // La que se borró y su vecina, para llevar el foco cuando la fila salga de la lista.
  const borradaRef = useRef<{ borrada: string; vecina: string | null } | null>(null)
  useMarcarViejaSiQuedoEnError(claveParticipaciones(claseId, foroId))
  const filas =
    participaciones.data === undefined
      ? undefined
      : unirPaginasConLaUltimaAparicion(
          participaciones.data.pages.map((pagina) => pagina.participaciones),
        )
  const ids = filas?.map(({ id }) => id)
  useAvisoDeRecargaFallidaEnElForo(
    claveParticipaciones(claseId, foroId),
    participaciones.isError &&
      participaciones.data !== undefined &&
      !participaciones.isFetchNextPageError &&
      !esErrorDeCursor(participaciones.error) &&
      !errorQueReemplazaLaVistaDelForo(true, participaciones.error),
    participaciones,
    TEXTOS_PARTICIPACIONES.recargaFallida,
  )

  const enfocarFila = (id: string): boolean => {
    const fila = document.querySelector<HTMLElement>(`[data-participacion-id="${id}"]`)
    fila?.focus()
    return fila !== null
  }

  const { refVerMas, handleVerMas } = useVerMasConservandoLaLista(participaciones, {
    ids,
    enfocarFila,
    enfocarEncabezado: () => encabezadoRef.current?.focus(),
  })

  useEffect(() => {
    if (ids === undefined) return
    const nueva = nuevaRef.current
    if (nueva !== null && ids.includes(nueva)) {
      nuevaRef.current = null
      enfocarFila(nueva)
      return
    }
    const borrada = borradaRef.current
    if (borrada === null || ids.includes(borrada.borrada)) return
    borradaRef.current = null
    const control =
      borrada.vecina === null
        ? null
        : document.querySelector<HTMLElement>(
            `[data-participacion-id="${borrada.vecina}"] [data-borrar]`,
          )
    if (control !== null) {
      control.focus()
      return
    }
    encabezadoRef.current?.focus()
  })
  // T-02 (ronda 1): después del efecto de arriba. Si desaparece el control que tenía el foco dentro del
  // bloque (el formulario tras publicar o un 409, una fila que sale en una recarga o tras un 404, la
  // clase en solo lectura), el foco va al h3 «Participaciones».
  useFocoAlEncabezadoSiSePierde(bloqueRef, encabezadoRef)

  const alBorrar = (id: string) => {
    if (ids === undefined) return
    const indice = ids.indexOf(id)
    borradaRef.current = { borrada: id, vecina: ids[indice + 1] ?? ids[indice - 1] ?? null }
  }

  const puedeReplicar =
    !soloLectura && (perspectiva === "maestro" || (esAlumno && mia.data?.puedeReplicar === true))

  const formulario = (): ReactNode => {
    if (!esAlumno || soloLectura || mia.data === undefined) return null
    if (mia.data.principalId !== null) return null
    if (!mia.data.puedeParticipar && mia.data.calificacion !== null) return null
    if (!mia.data.puedeParticipar) {
      return <p className="text-small text-muted-foreground">{TEXTOS_PARTICIPACIONES.cerrado}</p>
    }
    return (
      <FormularioDeParticipacion
        claseId={claseId}
        foroId={foroId}
        mia={mia.data}
        onPublicada={(id) => {
          nuevaRef.current = id
        }}
      />
    )
  }

  const lista = (): ReactNode => {
    if (participaciones.isError && esErrorDeCursor(participaciones.error)) {
      return <MensajeError mensaje={TEXTOS_PARTICIPACIONES.cambioMientrasLasVeias} />
    }
    if (filas === undefined && participaciones.isError) {
      return <MensajeError mensaje={TEXTOS_PARTICIPACIONES.errorAlCargar} />
    }
    if (filas === undefined) return <Cargando />
    if (filas.length === 0) {
      return <p className="text-small text-muted-foreground">{TEXTOS_PARTICIPACIONES.vacio}</p>
    }
    return (
      <>
        <ul className="flex flex-col divide-y divide-border">
          {filas.map((participacion) => (
            <li
              key={participacion.id}
              data-participacion-id={participacion.id}
              tabIndex={-1}
              className="py-4 first:pt-0 last:pb-0"
            >
              <ParticipacionDelForo
                claseId={claseId}
                foroId={foroId}
                participacion={participacion}
                puedeReplicar={puedeReplicar}
                onBorrada={() => alBorrar(participacion.id)}
              />
            </li>
          ))}
        </ul>
        {participaciones.hasNextPage && (
          <Button
            ref={refVerMas}
            type="button"
            variant="outline"
            enEspera={participaciones.isFetching}
            onClick={() => void handleVerMas()}
            className="self-start"
          >
            {TEXTOS_PARTICIPACIONES.verMas}
          </Button>
        )}
      </>
    )
  }

  return (
    <Card>
      <CardContent>
        <section ref={bloqueRef} aria-labelledby={idTitulo} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <h3 ref={encabezadoRef} id={idTitulo} tabIndex={-1} className="text-h3">
              {TEXTOS_PARTICIPACIONES.titulo}
            </h3>
            <p className="text-small text-muted-foreground">{TEXTOS_PARTICIPACIONES.frase}</p>
            {perspectiva === "admin" && (
              <p className="text-small text-muted-foreground">
                {TEXTOS_PARTICIPACIONES.notaDelAdmin}
              </p>
            )}
          </div>
          {formulario()}
          {lista()}
        </section>
      </CardContent>
    </Card>
  )
}
