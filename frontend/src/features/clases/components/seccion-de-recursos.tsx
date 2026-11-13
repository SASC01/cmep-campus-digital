import { useEffect, useId, useRef, type FocusEvent, type ReactNode } from "react"

import { Cargando } from "@/components/cargando"
import { MensajeError } from "@/components/mensaje-error"
import { useAlPulsarLaSeccionActiva } from "@/components/seccion/hooks"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

import { ID_DEL_AVISO_DE_RECARGA_DE_RECURSOS, TEXTOS_RECURSOS } from "../data"
import { useAvisoDeRecargaFallida, useFilaEnFoco, useFocoAlCargarMas, useRecursos } from "../hooks"
import {
  errorQueRedirigeElCliente,
  esErrorDeCursor,
  focoPerdido,
  marcaDeSeccionDeRecursos,
  mensajeDeConsultaClases,
  mensajeDeErrorDeLista,
  vecinaDeFila,
} from "../lib"
import type { BloqueDeRecurso, Perspectiva, SeccionDeTrabajo, Tema } from "../types"
import { ElementoDeRecurso } from "./elemento-de-recurso"

interface SeccionDeRecursosProps {
  claseId: string
  bloque: BloqueDeRecurso
  seccion: SeccionDeTrabajo
  // Los temas del bloque (de su consulta por sección), para "Mover".
  temas: readonly Tema[]
  // La vista decide la perspectiva y la base (perspectivaDeRuta); aquí solo se pasan.
  base: string
  perspectiva: Perspectiva
}

// CLASES-03d (§D-8.2, DESIGN.md §7.30): un tema de un bloque de "Recursos" (o "Sin tema"), en un panel
// (Card) con su encabezado (nombre y conteo). Pide su primera página (5) al montarse, en la fila del
// limitador de "Recursos", y "Ver más de <tema>" (20 más). Mientras espera muestra la carga de §7.10; un
// fallo solo afecta a esta sección, y el cursor vencido dice R3. Si el recurso que tenía el foco sale de
// la sección (se borró o se movió), el foco va al control equivalente de la fila vecina ("Mover" o
// "Borrar recurso") o a la fila y, sin vecinas, al encabezado de la sección (§7.14).
export function SeccionDeRecursos({
  claseId,
  bloque,
  seccion,
  temas,
  base,
  perspectiva,
}: SeccionDeRecursosProps) {
  const recursos = useRecursos(claseId, bloque, seccion.clave)
  const idTitulo = useId()
  const encabezadoRef = useRef<HTMLHeadingElement>(null)
  const filaEnFocoRef = useFilaEnFoco("data-recurso-id")
  // El control de la fila que tenía el foco: "Mover" lleva al "Mover" de la vecina; cualquier otro, a su
  // "Borrar recurso".
  const conMoverEnFocoRef = useRef(false)
  const idsPrevios = useRef<string[] | undefined>(undefined)
  const filas = recursos.data?.pages.flatMap((pagina) => pagina.recursos)
  const ids = filas?.map((recurso) => recurso.id)
  // §D-14: el cursor vencido (R3) y la primera carga fallida (R9) reemplazan la lista de la sección. Con
  // filas a la vista, cualquier otro fallo ("Ver más de <tema>" con un 5xx o sin red, o una recarga) las
  // conserva y avisa una vez por fallo, con el id de los avisos de "Recursos" (uno a la vista); el botón
  // sigue ahí para repetir (R7).
  const reemplazaLaLista =
    recursos.isError && (filas === undefined || esErrorDeCursor(recursos.error))

  useAvisoDeRecargaFallida(
    recursos.errorUpdateCount,
    filas !== undefined &&
      !esErrorDeCursor(recursos.error) &&
      !errorQueRedirigeElCliente(recursos.error),
    mensajeDeConsultaClases(recursos.error),
    claseId,
    ID_DEL_AVISO_DE_RECARGA_DE_RECURSOS,
  )

  const enfocarRecurso = (id: string): boolean => {
    const fila = document.querySelector<HTMLElement>(`[data-recurso-id="${id}"]`)
    fila?.focus()
    return fila !== null
  }

  const refVerMas = useFocoAlCargarMas(ids, enfocarRecurso, () => encabezadoRef.current?.focus())

  // R3 y R9 (§D-10 a, N-54): pulsar "Recursos" estando ahí vuelve a pedir este tema desde su primera
  // página si está en error (el cursor ya no existe o la primera carga falló); un tema sano no pide nada.
  useAlPulsarLaSeccionActiva(() => {
    if (!recursos.isError) return
    void recursos.refetch()
  })

  useEffect(() => {
    const previos = idsPrevios.current
    idsPrevios.current = ids
    const idEnFoco = filaEnFocoRef.current
    if (idEnFoco === null || previos?.includes(idEnFoco) !== true) return
    if (!focoPerdido(document)) return
    filaEnFocoRef.current = null
    // La fila sigue pero el control con el foco desapareció (por ejemplo, "Mover" tras un
    // MOVER_NO_PERMITIDO, o "Borrar recurso" tras un BORRADO_NO_PERMITIDO): al encabezado de la sección.
    if (ids?.includes(idEnFoco) === true) {
      encabezadoRef.current?.focus()
      return
    }
    const vecina = ids === undefined ? undefined : vecinaDeFila(previos, ids, idEnFoco)
    if (vecina === undefined) {
      encabezadoRef.current?.focus()
      return
    }
    const control = conMoverEnFocoRef.current ? "[data-mover]" : "[data-borrar-recurso]"
    const boton = document.querySelector<HTMLElement>(`[data-recurso-id="${vecina}"] ${control}`)
    if (boton !== null) {
      boton.focus()
      return
    }
    enfocarRecurso(vecina)
  })

  const alEnfocar = (evento: FocusEvent<HTMLElement>) => {
    conMoverEnFocoRef.current =
      evento.target instanceof Element && evento.target.closest("[data-mover]") !== null
  }

  const contenido = (): ReactNode => {
    if (reemplazaLaLista) {
      return (
        <MensajeError
          mensaje={mensajeDeErrorDeLista(recursos.error, TEXTOS_RECURSOS.cambioMientrasLoVeias)}
        />
      )
    }
    if (!filas) return <Cargando texto={TEXTOS_RECURSOS.cargandoTema(seccion.nombre)} />
    if (filas.length === 0) return null
    return (
      <>
        <ul className="flex flex-col gap-3" onFocus={alEnfocar}>
          {filas.map((recurso) => (
            <ElementoDeRecurso
              key={recurso.id}
              claseId={claseId}
              recurso={recurso}
              base={base}
              perspectiva={perspectiva}
              temaActual={seccion.tema?.id ?? null}
              temas={temas}
            />
          ))}
        </ul>
        {recursos.hasNextPage && (
          <Button
            ref={refVerMas}
            type="button"
            variant="outline"
            onClick={() => void recursos.fetchNextPage({ cancelRefetch: false })}
            // T-19 (ronda 2 de 01e): en espera también mientras la lista se recarga, para que el clic no
            // se una a la recarga y se pierda.
            enEspera={recursos.isFetching}
            className="self-start"
          >
            {TEXTOS_RECURSOS.verMasDe(seccion.nombre)}
          </Button>
        )}
      </>
    )
  }

  return (
    <section
      data-seccion-de-recursos={marcaDeSeccionDeRecursos(bloque, seccion.clave)}
      aria-labelledby={idTitulo}
    >
      <Card className="gap-4">
        <CardContent className="flex flex-col gap-4">
          <h3
            ref={encabezadoRef}
            id={idTitulo}
            tabIndex={-1}
            data-encabezado-tema=""
            className="text-h3 font-bold wrap-anywhere"
          >
            {seccion.nombre}{" "}
            <span className="text-small font-normal text-muted-foreground">
              · {TEXTOS_RECURSOS.conteo(seccion.elementos)}
            </span>
          </h3>
          {contenido()}
        </CardContent>
      </Card>
    </section>
  )
}
