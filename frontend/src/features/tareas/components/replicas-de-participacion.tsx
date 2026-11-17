import { crearReplicaSchema } from "@campus/shared"
import { Clock } from "lucide-react"
import { useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from "react"

import { Cargando } from "@/components/cargando"
import { FirmaDelAutor } from "@/components/clase/firma-del-autor"
import { useSoloLecturaDeLaClase } from "@/components/clase/hooks"
import { ErrorDeCampo } from "@/components/error-de-campo"
import { MensajeError } from "@/components/mensaje-error"
import { useMarcarViejaSiQuedoEnError } from "@/components/seccion/hooks"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { esErrorDeCursor } from "@/lib/errores-de-api"
import { formatearFechaHora } from "@/lib/format"

import { MENSAJES_ERROR_FORO, TEXTOS_PARTICIPACIONES } from "../data"
import {
  useAvisoDeRecargaFallidaEnElForo,
  useBorrarParticipacion,
  useFocoAlEncabezadoSiSePierde,
  usePublicarReplica,
  useReplicas,
  useVerMasConservandoLaLista,
} from "../hooks"
import {
  claveReplicas,
  errorDelTextoDeLaParticipacion,
  errorQueReemplazaLaVistaDelForo,
  esParticipacionNoEncontrada,
  textoDelErrorDeLasReplicas,
  unirPaginasConLaUltimaAparicion,
} from "../lib"
import type { Participacion } from "../types"

interface BorrarDelForoProps {
  claseId: string
  foroId: string
  participacionId: string
  // null en una principal; el id de su principal en una réplica.
  principalId: string | null
  nombreDelAutor: string
  // La lista lleva el foco a la vecina cuando la fila sale.
  onBorrada: () => void
}

// FORO-01d (§D-11, E3-3, DESIGN.md §7.14): «Borrar» del admin en una principal o una réplica, con su
// confirmación en línea: el foco va a «Cancelar» al pedirla y vuelve a «Borrar» al cancelar. «Sí, borrar
// …» tiene guarda con ref y enEspera; un error deja la confirmación abierta y el botón sale de la espera.
export function BorrarDelForo({
  claseId,
  foroId,
  participacionId,
  principalId,
  nombreDelAutor,
  onBorrada,
}: BorrarDelForoProps) {
  const borrar = useBorrarParticipacion(claseId, foroId)
  const [confirmando, setConfirmando] = useState(false)
  const borrandoRef = useRef(false)
  const borrarRef = useRef<HTMLButtonElement>(null)
  const cancelarRef = useRef<HTMLButtonElement>(null)
  const confirmandoAntesRef = useRef(confirmando)
  const esPrincipal = principalId === null

  useEffect(() => {
    if (confirmandoAntesRef.current === confirmando) return
    confirmandoAntesRef.current = confirmando
    if (confirmando) {
      cancelarRef.current?.focus()
      return
    }
    borrarRef.current?.focus()
  }, [confirmando])

  const handleBorrar = () => {
    if (borrandoRef.current) return
    borrandoRef.current = true
    borrar.mutate(
      { participacionId, principalId },
      {
        onSuccess: () => onBorrada(),
        onSettled: () => {
          borrandoRef.current = false
        },
      },
    )
  }

  const handleCancelar = () => {
    if (borrandoRef.current) return
    setConfirmando(false)
  }

  if (!confirmando) {
    return (
      <Button
        ref={borrarRef}
        type="button"
        variant="ghost"
        size="sm"
        data-borrar=""
        onClick={() => setConfirmando(true)}
        className="self-start"
      >
        {TEXTOS_PARTICIPACIONES.borrar}{" "}
        <span className="sr-only">
          {esPrincipal
            ? TEXTOS_PARTICIPACIONES.borrarParticipacionDe(nombreDelAutor)
            : TEXTOS_PARTICIPACIONES.borrarReplicaDe(nombreDelAutor)}
        </span>
      </Button>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-small">
        {esPrincipal
          ? TEXTOS_PARTICIPACIONES.confirmarBorrarParticipacion
          : TEXTOS_PARTICIPACIONES.confirmarBorrarReplica}
      </p>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="destructive"
          size="sm"
          onClick={handleBorrar}
          enEspera={borrar.isPending}
        >
          {esPrincipal
            ? TEXTOS_PARTICIPACIONES.siBorrarParticipacion
            : TEXTOS_PARTICIPACIONES.siBorrarReplica}
        </Button>
        <Button
          ref={cancelarRef}
          type="button"
          variant="outline"
          size="sm"
          onClick={handleCancelar}
        >
          {TEXTOS_PARTICIPACIONES.cancelar}
        </Button>
      </div>
    </div>
  )
}

interface FormularioDeReplicaProps {
  claseId: string
  foroId: string
  participacionId: string
}

// §D-8.4: «Escribe tu réplica» y «Publicar réplica». Al publicar, la réplica se agrega al bloque, el
// campo se vacía y el foco vuelve al campo.
function FormularioDeReplica({ claseId, foroId, participacionId }: FormularioDeReplicaProps) {
  const publicar = usePublicarReplica(claseId, foroId, participacionId)
  const idCampo = useId()
  const [texto, setTexto] = useState("")
  const [errorDelCampo, setErrorDelCampo] = useState<string | null>(null)
  const publicandoRef = useRef(false)
  const campoRef = useRef<HTMLTextAreaElement>(null)

  const handleSubmit = (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault()
    if (publicandoRef.current || publicar.isPending) return
    const resultado = crearReplicaSchema.safeParse({ texto })
    if (!resultado.success) {
      setErrorDelCampo(resultado.error.issues[0]?.message ?? TEXTOS_PARTICIPACIONES.campoReplica)
      return
    }
    setErrorDelCampo(null)
    publicandoRef.current = true
    publicar.mutate(resultado.data, {
      onSuccess: () => {
        setTexto("")
        campoRef.current?.focus()
      },
      onError: (error) => {
        setErrorDelCampo(errorDelTextoDeLaParticipacion(error))
      },
      onSettled: () => {
        publicandoRef.current = false
      },
    })
  }

  return (
    <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-2">
      <Label htmlFor={idCampo}>{TEXTOS_PARTICIPACIONES.campoReplica}</Label>
      <Textarea
        ref={campoRef}
        id={idCampo}
        name="texto"
        rows={2}
        autoComplete="off"
        value={texto}
        onChange={(evento) => setTexto(evento.target.value)}
        aria-invalid={errorDelCampo !== null}
        aria-describedby={errorDelCampo === null ? undefined : `${idCampo}-error`}
      />
      {errorDelCampo !== null && (
        <ErrorDeCampo id={`${idCampo}-error`}>{errorDelCampo}</ErrorDeCampo>
      )}
      <Button
        type="submit"
        variant="outline"
        size="sm"
        enEspera={publicar.isPending}
        className="self-start"
      >
        {TEXTOS_PARTICIPACIONES.publicarReplica}
      </Button>
    </form>
  )
}

interface ReplicasDeParticipacionProps {
  claseId: string
  foroId: string
  participacion: Participacion
  puedeReplicar: boolean
}

// FORO-01d (§D-8.4, §D-10): el bloque de réplicas de una principal, de la más antigua a la más
// reciente. La primera carga fallida la dice el bloque («No pudimos cargar las réplicas.» o, si la
// principal ya no existe, «Esa participación ya no existe.», y la lista se renueva); el cursor vencido
// dice su frase sin «Ver más réplicas»; al cerrarlo con la lectura en error queda vieja, así que volver a
// abrirlo pide la primera página. Al borrar una réplica el foco va al «Borrar» de la vecina o, sin
// vecinas, al encabezado del bloque (nunca a <body>).
export function ReplicasDeParticipacion({
  claseId,
  foroId,
  participacion,
  puedeReplicar,
}: ReplicasDeParticipacionProps) {
  // §D-11: «Borrar» de cada réplica lo decide el dato, nunca el rol; en una clase archivada no se pinta.
  const soloLectura = useSoloLecturaDeLaClase()
  const replicas = useReplicas(claseId, foroId, participacion.id, true)
  const encabezadoRef = useRef<HTMLHeadingElement>(null)
  const bloqueRef = useRef<HTMLDivElement>(null)
  const pendienteDeFocoRef = useRef<{ borrada: string; vecina: string | null } | null>(null)
  useMarcarViejaSiQuedoEnError(claveReplicas(claseId, foroId, participacion.id))
  const filas =
    replicas.data === undefined
      ? undefined
      : unirPaginasConLaUltimaAparicion(replicas.data.pages.map((pagina) => pagina.replicas))
  const ids = filas?.map(({ id }) => id)
  // M-12 (FORO-1D51): como la lista de participaciones, una recarga fallida con réplicas a la vista las
  // conserva y avisa una vez por fallo nuevo (memoria por consulta). No avisa en la primera carga, con
  // el fallo de una página («Ver más réplicas» avisa por su cuenta), con el cursor vencido (el bloque
  // dice su frase), ante un error que reemplaza la vista ni si la principal ya no existe (la lista se
  // renueva y la fila sale); la clase archivada y los códigos con que apiClient redirige los filtra el
  // gancho.
  useAvisoDeRecargaFallidaEnElForo(
    claveReplicas(claseId, foroId, participacion.id),
    replicas.isError &&
      replicas.data !== undefined &&
      !replicas.isFetchNextPageError &&
      !esErrorDeCursor(replicas.error) &&
      !errorQueReemplazaLaVistaDelForo(true, replicas.error) &&
      !esParticipacionNoEncontrada(replicas.error),
    replicas,
    TEXTOS_PARTICIPACIONES.recargaFallidaReplicas,
  )
  // O-01d-2 (decisión del manager en el arbitraje de la ronda 1): si la recarga con réplicas a la vista
  // recibe 404 PARTICIPACION_NO_ENCONTRADA, la principal ya no existe: la lista se renueva y la fila sale
  // con su bloque (y lo que se estuviera escribiendo). Se avisa una vez por fallo, con el texto de §D-9
  // que §D-10 usa para ese 404; «No pudimos actualizar las réplicas…» sigue excluido arriba.
  useAvisoDeRecargaFallidaEnElForo(
    claveReplicas(claseId, foroId, participacion.id),
    replicas.isError && replicas.data !== undefined && esParticipacionNoEncontrada(replicas.error),
    replicas,
    MENSAJES_ERROR_FORO.participacionNoEncontrada,
  )

  const enfocarFila = (id: string): boolean => {
    const fila = document.querySelector<HTMLElement>(`[data-replica-id="${id}"]`)
    fila?.focus()
    return fila !== null
  }

  const { refVerMas, handleVerMas } = useVerMasConservandoLaLista(replicas, {
    ids,
    enfocarFila,
    enfocarEncabezado: () => encabezadoRef.current?.focus(),
  })

  useEffect(() => {
    const pendiente = pendienteDeFocoRef.current
    if (pendiente === null || ids === undefined || ids.includes(pendiente.borrada)) return
    pendienteDeFocoRef.current = null
    const control =
      pendiente.vecina === null
        ? null
        : document.querySelector<HTMLElement>(
            `[data-replica-id="${pendiente.vecina}"] [data-borrar]`,
          )
    if (control !== null) {
      control.focus()
      return
    }
    encabezadoRef.current?.focus()
  })
  // T-02 (ronda 1): después del efecto de arriba. Si una recarga quita la réplica que tenía el foco, el
  // foco va al h4 «Réplicas» del bloque; lo demás que desaparece (el formulario, la principal entera, la
  // clase en solo lectura) lo atiende «Participaciones», que lo lleva a su h3.
  useFocoAlEncabezadoSiSePierde(bloqueRef, encabezadoRef, "[data-replica-id]")

  const alBorrar = (id: string) => {
    if (ids === undefined) return
    const indice = ids.indexOf(id)
    pendienteDeFocoRef.current = {
      borrada: id,
      vecina: ids[indice + 1] ?? ids[indice - 1] ?? null,
    }
  }

  const contenido = (): ReactNode => {
    if (replicas.isError && esErrorDeCursor(replicas.error)) {
      return <MensajeError mensaje={TEXTOS_PARTICIPACIONES.replicasCambiaron} />
    }
    if (filas === undefined && replicas.isError) {
      return <MensajeError mensaje={textoDelErrorDeLasReplicas(replicas.error)} />
    }
    if (filas === undefined) return <Cargando />
    return (
      <>
        {filas.length > 0 && (
          <ul className="flex flex-col gap-3">
            {filas.map((replica) => (
              <li
                key={replica.id}
                data-replica-id={replica.id}
                tabIndex={-1}
                className="flex flex-col gap-1"
              >
                <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-small text-muted-foreground">
                  <FirmaDelAutor autor={replica.autor} />
                  <span>{formatearFechaHora(replica.creadoEn)}</span>
                  {replica.propia && <span>{TEXTOS_PARTICIPACIONES.tuya}</span>}
                  {replica.conRetraso === true && (
                    <Badge variant="warning" icon={<Clock aria-hidden="true" />}>
                      {TEXTOS_PARTICIPACIONES.conRetraso}
                    </Badge>
                  )}
                </p>
                <p className="max-w-prose wrap-anywhere whitespace-pre-line text-body">
                  {replica.texto}
                </p>
                {!soloLectura && replica.puedeBorrar && (
                  <BorrarDelForo
                    claseId={claseId}
                    foroId={foroId}
                    participacionId={replica.id}
                    principalId={participacion.id}
                    nombreDelAutor={replica.autor.nombre}
                    onBorrada={() => alBorrar(replica.id)}
                  />
                )}
              </li>
            ))}
          </ul>
        )}
        {replicas.hasNextPage && (
          <Button
            ref={refVerMas}
            type="button"
            variant="outline"
            size="sm"
            enEspera={replicas.isFetching}
            onClick={() => void handleVerMas()}
            className="self-start"
          >
            {TEXTOS_PARTICIPACIONES.verMasReplicas}
          </Button>
        )}
      </>
    )
  }

  return (
    <div ref={bloqueRef} className="flex flex-col gap-3 border-l border-border pl-4">
      <h4 ref={encabezadoRef} tabIndex={-1} className="sr-only">
        {TEXTOS_PARTICIPACIONES.replicas}
      </h4>
      {contenido()}
      {puedeReplicar && (
        <FormularioDeReplica claseId={claseId} foroId={foroId} participacionId={participacion.id} />
      )}
    </div>
  )
}
