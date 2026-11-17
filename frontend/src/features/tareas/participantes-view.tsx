import { ArrowLeft } from "lucide-react"
import { useRef, type ReactNode } from "react"
import { Link, useParams } from "react-router"

import { Cargando } from "@/components/cargando"
import { ConClaseDeLaRuta } from "@/components/clase/con-clase-de-la-ruta"
import { EstadoVacio } from "@/components/estado-vacio"
import { MensajeError } from "@/components/mensaje-error"
import { useMarcarViejaSiQuedoEnError } from "@/components/seccion/hooks"
import { Button } from "@/components/ui/button"
import { buttonVariants } from "@/components/ui/button-variants"
import { Card, CardContent } from "@/components/ui/card"
import { esErrorDeCursor } from "@/lib/errores-de-api"

import { TablaDeEntregas } from "./components/tabla-de-entregas"
import {
  MENSAJES_ERROR_FORO,
  TEXTOS_DE_LA_TABLA_DE_PARTICIPANTES,
  TEXTOS_DETALLE_FORO,
  TEXTOS_PARTICIPANTES,
} from "./data"
import {
  useAvisoDeRecargaFallidaDelForo,
  useAvisoDeRecargaFallidaEnElForo,
  useFocoAlEncabezadoSiSePierde,
  useFocoAlPerderseElControl,
  useForo,
  useParticipantes,
  useRutaDeLaClase,
  useVerMasConservandoLaLista,
} from "./hooks"
import {
  claveDeFocoDeLaTarea,
  claveListaDeParticipantes,
  conteoDeParticipantes,
  enlaceAlForo,
  enlaceAParticipante,
  errorQueReemplazaLaVistaDelForo,
  idCanonicoDeLaRuta,
  mensajeDeConsultaForo,
} from "./lib"

interface ParticipantesDelForoProps {
  claseId: string
  foroId: string
}

// FORO-01e (§D-8.5, §E13.6 y §E13.7, DESIGN.md §7.26): «Participantes» de un foro, para sus maestros y el
// admin: los alumnos de la clase con su estado, cuándo participaron y «Ver participación». La lista de
// Entregas con los textos del foro, y la lógica de las listas de features/tareas:
// - un error que reemplaza la vista (el foro ya no existe, se perdió el acceso) la reemplaza, venga del
//   foro o de la lista; la primera carga fallida de la lista también;
// - el cursor vencido dice que la lista cambió, sin «Ver más alumnos»; al salir en error queda vieja;
// - una recarga fallida con datos conserva la lista y avisa una vez por fallo (DH-20 a); la del foro, la
//   suya;
// - «Ver más alumnos» con el gancho de 01d (sin leer isFetchingNextPage): un aviso si falla, y el foco a
//   la primera fila nueva o al h2;
// - si una recarga quita la fila con el foco, el foco va al h2 «Participantes».
// Es el contenido, montado con key por el foro debajo de la raíz del marco: la guarda de «Ver más alumnos»
// y lo que espera son de este foro.
function ListaDeParticipantes({ claseId, foroId }: ParticipantesDelForoProps) {
  const { base } = useRutaDeLaClase(claseId)
  const foro = useForo(claseId, foroId)
  const lista = useParticipantes(claseId, foroId)
  const encabezadoRef = useRef<HTMLHeadingElement>(null)
  const bloqueRef = useRef<HTMLDivElement>(null)
  const hayForo = foro.data !== undefined
  const filas = lista.data?.pages.flatMap((pagina) => pagina.entregas)
  const ids = filas?.map((fila) => fila.alumno.id)
  useMarcarViejaSiQuedoEnError(claveListaDeParticipantes(claseId, foroId))

  useAvisoDeRecargaFallidaDelForo(
    claseId,
    foroId,
    foro.isError && hayForo && !errorQueReemplazaLaVistaDelForo(hayForo, foro.error),
    foro,
    TEXTOS_DETALLE_FORO.avisoRecargaFallida,
  )
  useAvisoDeRecargaFallidaEnElForo(
    claveListaDeParticipantes(claseId, foroId),
    lista.isError &&
      lista.data !== undefined &&
      !lista.isFetchNextPageError &&
      !esErrorDeCursor(lista.error) &&
      !errorQueReemplazaLaVistaDelForo(true, lista.error),
    lista,
    TEXTOS_PARTICIPANTES.recargaFallida,
  )

  const enfocarFila = (id: string): boolean => {
    const enlace = document.querySelector<HTMLElement>(`[data-entrega-de-alumno="${id}"] a`)
    enlace?.focus()
    return enlace !== null
  }

  const { refVerMas, handleVerMas } = useVerMasConservandoLaLista(lista, {
    ids,
    enfocarFila,
    enfocarEncabezado: () => encabezadoRef.current?.focus(),
  })
  useFocoAlEncabezadoSiSePierde(bloqueRef, encabezadoRef)

  const listaReemplazada =
    lista.isError &&
    !esErrorDeCursor(lista.error) &&
    (filas === undefined || errorQueReemplazaLaVistaDelForo(true, lista.error))

  const cuerpoDeLaLista = (): ReactNode => {
    if (lista.isError && esErrorDeCursor(lista.error)) {
      return <MensajeError mensaje={TEXTOS_PARTICIPANTES.cambioMientrasLaVeias} />
    }

    if (!filas || !foro.data) {
      return <Cargando texto={TEXTOS_PARTICIPANTES.cargando} />
    }

    if (filas.length === 0) {
      return <EstadoVacio titulo={TEXTOS_PARTICIPANTES.vacio} />
    }

    return (
      <>
        <TablaDeEntregas
          filas={filas}
          fechaLimite={foro.data.foro.fechaLimite}
          base={base}
          tareaId={foroId}
          textos={TEXTOS_DE_LA_TABLA_DE_PARTICIPANTES}
          destinoDeFila={(alumnoId) => enlaceAParticipante(base, foroId, alumnoId)}
        />
        {lista.hasNextPage && (
          <Button
            ref={refVerMas}
            type="button"
            variant="outline"
            enEspera={lista.isFetching}
            onClick={() => void handleVerMas()}
            className="self-start"
          >
            {TEXTOS_PARTICIPANTES.verMas}
          </Button>
        )}
      </>
    )
  }

  const contenido = (): ReactNode => {
    if (foro.isError && errorQueReemplazaLaVistaDelForo(hayForo, foro.error)) {
      return <MensajeError mensaje={mensajeDeConsultaForo(foro.error)} />
    }

    if (listaReemplazada) {
      return <MensajeError mensaje={mensajeDeConsultaForo(lista.error)} />
    }

    if (!foro.data) {
      return <Cargando texto={TEXTOS_PARTICIPANTES.cargando} />
    }

    const conteo = lista.data === undefined ? null : conteoDeParticipantes(lista.data.pages)

    return (
      <Card>
        <CardContent ref={bloqueRef} className="flex flex-col gap-4">
          <Link
            to={enlaceAlForo(base, foroId)}
            className={buttonVariants({ variant: "ghost", size: "sm", className: "self-start" })}
          >
            <ArrowLeft aria-hidden="true" />
            {TEXTOS_PARTICIPANTES.volverAlForo}
          </Link>
          <div className="flex flex-col gap-1">
            <h2 ref={encabezadoRef} tabIndex={-1} className="text-h2">
              {TEXTOS_PARTICIPANTES.titulo}
            </h2>
            <p className="wrap-anywhere text-small text-muted-foreground">
              {foro.data.foro.titulo}
            </p>
            {conteo !== null && <p className="text-small">{conteo}</p>}
          </div>
          {cuerpoDeLaLista()}
        </CardContent>
      </Card>
    )
  }

  return contenido()
}

// CHORE-06a (§D-1, Forma C): el marco conserva la raíz de foco y su clave; la clave cambia con el foro y
// con la lista, así que si el control con el foco se desmonta porque la vista se reemplaza o se pasa a
// otro foro, el foco va a la raíz y no a <body>. Lee las mismas consultas que el contenido.
function ParticipantesDelForo({ claseId, foroId }: ParticipantesDelForoProps) {
  const foro = useForo(claseId, foroId)
  const lista = useParticipantes(claseId, foroId)
  const raizRef = useRef<HTMLDivElement>(null)
  useFocoAlPerderseElControl(
    raizRef,
    `${claveDeFocoDeLaTarea(foroId, foro)}|${claveDeFocoDeLaTarea("participantes", lista)}`,
  )

  return (
    <div ref={raizRef} tabIndex={-1}>
      <ListaDeParticipantes key={foroId} claseId={claseId} foroId={foroId} />
    </div>
  )
}

// El :claseId lo lee ConClaseDeLaRuta; el :foroId, esta vista, en su forma canónica antes de pedir y de
// armar claves, keys y rutas (T-02 de 01c2). Sin él no pide nada y dice lo mismo que un foro que no existe.
export function ParticipantesView() {
  const { foroId } = useParams<{ foroId: string }>()

  return (
    <ConClaseDeLaRuta>
      {(claseId) => {
        if (foroId === undefined) {
          return <MensajeError mensaje={MENSAJES_ERROR_FORO.foroNoEncontrado} />
        }
        return <ParticipantesDelForo claseId={claseId} foroId={idCanonicoDeLaRuta(foroId)} />
      }}
    </ConClaseDeLaRuta>
  )
}
