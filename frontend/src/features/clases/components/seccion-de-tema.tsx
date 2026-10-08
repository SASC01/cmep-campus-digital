import { ChevronDown, ChevronUp } from "lucide-react"
import { useEffect, useId, useRef, useState, type ReactNode, type RefObject } from "react"

import { Cargando } from "@/components/cargando"
import { MensajeError } from "@/components/mensaje-error"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

import { TEXTOS_TEMAS, TEXTOS_TRABAJO } from "../data"
import { useBorrarTema, useFilaEnFoco, useFocoAlCargarMas, useTrabajo } from "../hooks"
import { focoPerdido, mensajeDeErrorDeLista, vecinaDeFila } from "../lib"
import type { ControlDeOrden, OrdenEnVuelo, SeccionDeTrabajo, Tema } from "../types"
import { ElementoDeTrabajo } from "./elemento-de-trabajo"
import { FilaDeEntrega } from "./fila-de-entrega"
import { FormularioTema } from "./formulario-tema"
import { MoverElemento } from "./mover-elemento"

interface ElementosDelTemaProps {
  claseId: string
  base: string
  seccion: SeccionDeTrabajo
  temas: readonly Tema[]
  // T-16: "Mover" y su selector solo para maestro y admin; el alumno ve la sección de solo lectura
  // aunque el dato diga `puedeMover`.
  gestionar: boolean
  encabezadoRef: RefObject<HTMLHeadingElement | null>
}

// Los elementos de un tema con elementos: la primera página (5) al montarse, en la fila del limitador
// (Enmienda 5), y "Ver más de <tema>" (20 más). Mientras espera su turno o su respuesta muestra la
// carga de §7.10; un fallo solo afecta a esta sección. Si el elemento que tenía el foco sale de la
// sección (se movió a otro tema), el foco va al "Mover" de la fila vecina y, sin vecinas, al
// encabezado de la sección (§7.14).
function ElementosDelTema({
  claseId,
  base,
  seccion,
  temas,
  gestionar,
  encabezadoRef,
}: ElementosDelTemaProps) {
  const trabajo = useTrabajo(claseId, seccion.clave)
  const filaEnFocoRef = useFilaEnFoco("data-elemento-id")
  const idsPrevios = useRef<string[] | undefined>(undefined)
  const elementos = trabajo.data?.pages.flatMap((pagina) => pagina.elementos)
  const ids = elementos?.map((elemento) => elemento.id)

  const enfocarElemento = (id: string): boolean => {
    const fila = document.querySelector<HTMLElement>(`[data-elemento-id="${id}"]`)
    fila?.focus()
    return fila !== null
  }

  const refVerMas = useFocoAlCargarMas(ids, enfocarElemento, () => encabezadoRef.current?.focus())

  useEffect(() => {
    const previos = idsPrevios.current
    idsPrevios.current = ids
    const idEnFoco = filaEnFocoRef.current
    if (idEnFoco === null || previos?.includes(idEnFoco) !== true) return
    if (ids?.includes(idEnFoco) === true || !focoPerdido(document)) return
    filaEnFocoRef.current = null
    const vecina = ids === undefined ? undefined : vecinaDeFila(previos, ids, idEnFoco)
    if (vecina === undefined) {
      encabezadoRef.current?.focus()
      return
    }
    const boton = document.querySelector<HTMLElement>(`[data-elemento-id="${vecina}"] [data-mover]`)
    if (boton !== null) {
      boton.focus()
      return
    }
    enfocarElemento(vecina)
  })

  if (trabajo.isError) {
    return (
      <MensajeError
        mensaje={mensajeDeErrorDeLista(trabajo.error, TEXTOS_TRABAJO.cambioMientrasLoVeias)}
      />
    )
  }

  if (!elementos) {
    return <Cargando texto={TEXTOS_TRABAJO.cargandoTema(seccion.nombre)} />
  }

  if (elementos.length === 0) {
    return <p className="text-small text-muted-foreground">{TEXTOS_TRABAJO.temaVacio}</p>
  }

  return (
    <>
      <ul className="flex flex-col gap-3">
        {elementos.map((elemento) => (
          <li
            key={elemento.id}
            data-elemento-id={elemento.id}
            tabIndex={-1}
            className="flex flex-col gap-2"
          >
            {elemento.tipo === "tarea" && (
              <FilaDeEntrega
                titulo={elemento.titulo}
                fechaLimite={elemento.tarea?.fechaLimite ?? ""}
                destino={`${base}/tareas/${elemento.id}`}
              />
            )}
            {elemento.tipo === "material" && (
              <ElementoDeTrabajo claseId={claseId} elemento={elemento} />
            )}
            {gestionar && elemento.puedeMover && (
              <MoverElemento
                claseId={claseId}
                publicacionId={elemento.id}
                titulo={elemento.titulo}
                temaActual={seccion.tema?.id ?? null}
                temas={temas}
              />
            )}
          </li>
        ))}
      </ul>
      {trabajo.hasNextPage && (
        <Button
          ref={refVerMas}
          type="button"
          variant="outline"
          onClick={() => void trabajo.fetchNextPage({ cancelRefetch: false })}
          // T-19 (ronda 2 de 01e): también en espera mientras la lista se recarga (tras mover, publicar
          // o borrar, o al volver a la pestaña). Con la recarga en vuelo, fetchNextPage se uniría a ella
          // y el clic se perdería; en espera, el clic no se acepta hasta que la recarga termina.
          enEspera={trabajo.isFetching}
          className="self-start"
        >
          {TEXTOS_TRABAJO.verMasDe(seccion.nombre)}
        </Button>
      )}
    </>
  )
}

interface SeccionDeTemaProps {
  claseId: string
  base: string
  seccion: SeccionDeTrabajo
  temas: readonly Tema[]
  // Maestro y admin: renombrar, subir, bajar y borrar (nunca en "Sin tema").
  gestionar: boolean
  esPrimero: boolean
  esUltimo: boolean
  ordenEnVuelo: OrdenEnVuelo | null
  onOrdenar: (temaId: string, control: ControlDeOrden) => void
}

// §D-11, P-03 de CLASES-01: un tema de "Trabajo de clase" (o "Sin tema"), en un panel (Card) con su
// encabezado (nombre y conteo). Un tema vacío lo dice sin pedir nada. Maestro y admin: "Renombrar" (en
// línea), "Subir" y "Bajar" (iconos con el nombre del tema solo para lectores de pantalla; no aparecen
// en el primero ni en el último) y "Borrar tema", con la confirmación en línea de §7.14 (foco a
// "Cancelar" al pedirla y de vuelta a "Borrar tema" al cancelar).
export function SeccionDeTema({
  claseId,
  base,
  seccion,
  temas,
  gestionar,
  esPrimero,
  esUltimo,
  ordenEnVuelo,
  onOrdenar,
}: SeccionDeTemaProps) {
  const borrar = useBorrarTema(claseId)
  const idTitulo = useId()
  const encabezadoRef = useRef<HTMLHeadingElement>(null)
  const renombrarRef = useRef<HTMLButtonElement>(null)
  const borrarRef = useRef<HTMLButtonElement>(null)
  const cancelarRef = useRef<HTMLButtonElement>(null)
  const [renombrando, setRenombrando] = useState(false)
  const [confirmando, setConfirmando] = useState(false)
  // El control al que vuelve el foco cuando se cierra lo que abrió (el formulario o la confirmación).
  const focoAlCerrarRef = useRef<RefObject<HTMLButtonElement | null> | null>(null)
  const tema = seccion.tema
  // M-01 y M-02 (revisión de la ronda 1): guarda síncrona del borrado. `borrar.isPending` llega un
  // render después; mientras está marcada no sale un segundo DELETE y "Cancelar" no cierra la
  // confirmación.
  const borrandoRef = useRef(false)

  const confirmarBorrado = (temaId: string) => {
    if (borrandoRef.current) return
    borrandoRef.current = true
    borrar.mutate(temaId, {
      onSettled: () => {
        borrandoRef.current = false
      },
    })
  }

  useEffect(() => {
    const destino = focoAlCerrarRef.current
    if (destino === null) return
    focoAlCerrarRef.current = null
    destino.current?.focus()
  }, [renombrando, confirmando])

  useEffect(() => {
    if (confirmando) cancelarRef.current?.focus()
  }, [confirmando])

  const cerrarRenombrar = () => {
    focoAlCerrarRef.current = renombrarRef
    setRenombrando(false)
  }

  const cancelarBorrado = () => {
    if (borrandoRef.current) return
    focoAlCerrarRef.current = borrarRef
    setConfirmando(false)
  }

  const controles = (temaDeLaSeccion: Tema): ReactNode => {
    const enVuelo = ordenEnVuelo?.temaId === temaDeLaSeccion.id ? ordenEnVuelo.control : null
    const delTema = TEXTOS_TEMAS.delTema(temaDeLaSeccion.nombre)
    return (
      <div className="flex flex-wrap items-center gap-1">
        <Button
          ref={renombrarRef}
          type="button"
          variant="ghost"
          size="sm"
          data-renombrar=""
          onClick={() => setRenombrando(true)}
        >
          {TEXTOS_TEMAS.renombrar} <span className="sr-only">{delTema}</span>
        </Button>
        {!esPrimero && (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            data-subir=""
            onClick={() => onOrdenar(temaDeLaSeccion.id, "subir")}
            enEspera={enVuelo === "subir"}
          >
            <ChevronUp aria-hidden="true" />
            <span className="sr-only">
              {TEXTOS_TEMAS.subir} {delTema}
            </span>
          </Button>
        )}
        {!esUltimo && (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            data-bajar=""
            onClick={() => onOrdenar(temaDeLaSeccion.id, "bajar")}
            enEspera={enVuelo === "bajar"}
          >
            <ChevronDown aria-hidden="true" />
            <span className="sr-only">
              {TEXTOS_TEMAS.bajar} {delTema}
            </span>
          </Button>
        )}
        {!confirmando && (
          <Button
            ref={borrarRef}
            type="button"
            variant="ghost"
            size="sm"
            data-borrar-tema=""
            onClick={() => setConfirmando(true)}
          >
            {TEXTOS_TEMAS.borrar} <span className="sr-only">{delTema}</span>
          </Button>
        )}
      </div>
    )
  }

  return (
    <section data-tema-id={seccion.clave} aria-labelledby={idTitulo}>
      <Card className="gap-4">
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2
              ref={encabezadoRef}
              id={idTitulo}
              tabIndex={-1}
              data-encabezado-tema=""
              className="text-h3 font-bold wrap-anywhere"
            >
              {seccion.nombre}{" "}
              <span className="text-small font-normal text-muted-foreground">
                · {TEXTOS_TRABAJO.conteo(seccion.elementos)}
              </span>
            </h2>
            {gestionar && tema !== null && !renombrando && controles(tema)}
          </div>

          {gestionar && tema !== null && renombrando && (
            <FormularioTema
              claseId={claseId}
              temaId={tema.id}
              nombreInicial={tema.nombre}
              onTerminar={cerrarRenombrar}
            />
          )}

          {gestionar && tema !== null && confirmando && (
            <div className="flex flex-col gap-2">
              <p className="text-small">{TEXTOS_TEMAS.consecuencia(seccion.elementos)}</p>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => confirmarBorrado(tema.id)}
                  enEspera={borrar.isPending}
                >
                  {TEXTOS_TEMAS.siBorrar}
                </Button>
                <Button ref={cancelarRef} type="button" variant="outline" onClick={cancelarBorrado}>
                  {TEXTOS_TEMAS.cancelar}
                </Button>
              </div>
            </div>
          )}

          {seccion.elementos === 0 && (
            <p className="text-small text-muted-foreground">{TEXTOS_TRABAJO.temaVacio}</p>
          )}
          {seccion.elementos > 0 && (
            <ElementosDelTema
              claseId={claseId}
              base={base}
              seccion={seccion}
              temas={temas}
              gestionar={gestionar}
              encabezadoRef={encabezadoRef}
            />
          )}
        </CardContent>
      </Card>
    </section>
  )
}
