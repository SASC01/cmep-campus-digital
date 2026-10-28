import { ArrowLeft } from "lucide-react"
import { useEffect, useRef, type ReactNode } from "react"
import { Link, useParams } from "react-router"
import { toast } from "sonner"

import { Cargando } from "@/components/cargando"
import { ConClaseDeLaRuta } from "@/components/clase/con-clase-de-la-ruta"
import { EstadoVacio } from "@/components/estado-vacio"
import { MensajeError } from "@/components/mensaje-error"
import { Button } from "@/components/ui/button"
import { buttonVariants } from "@/components/ui/button-variants"
import { Card, CardContent } from "@/components/ui/card"
import { esErrorDeCursor } from "@/lib/errores-de-api"

import { TablaDeEntregas } from "./components/tabla-de-entregas"
import { MENSAJES_ERROR_TAREAS, TEXTOS_DETALLE_TAREA, TEXTOS_ENTREGAS } from "./data"
import {
  useAvisoDeRecargaFallida,
  useEntregasDeLaTarea,
  useFocoAlPerderseElControl,
  useRutaDeLaClase,
  useTarea,
} from "./hooks"
import {
  claveDeFocoDeLaTarea,
  conteoDeEntregas,
  errorQueRedirigeElCliente,
  errorQueReemplazaLaVista,
  mensajeDeConsultaTareas,
} from "./lib"

interface EntregasDeLaTareaProps {
  claseId: string
  tareaId: string
}

// ENTREGAS-01e (§D-10.2, DESIGN.md §7.26): quiénes entregaron una tarea, para sus maestros y el admin.
// La tarea da el título y la fecha límite ("Sin entregar" si venció); la lista, las filas y el conteo.
// Estados: error → cargando → vacío → datos. Un error que reemplaza la vista (la tarea ya no existe, se
// perdió el acceso) la reemplaza por su mensaje, venga de la tarea o de la lista; el 400 del cursor dice
// que la lista cambió. Con la tarea en caché, una recarga fallida avisa una vez (como el detalle); con
// la lista en caché, "Ver más alumnos" que falla avisa una vez, solo si la vista sigue montada y el error
// no la reemplaza ni lo redirige apiClient. Si una recarga quita el control con el foco, el foco va a la
// raíz.
function EntregasDeLaTarea({ claseId, tareaId }: EntregasDeLaTareaProps) {
  const { base } = useRutaDeLaClase(claseId)
  const tarea = useTarea(claseId, tareaId)
  const lista = useEntregasDeLaTarea(claseId, tareaId)
  const raizRef = useRef<HTMLDivElement>(null)
  const encabezadoRef = useRef<HTMLHeadingElement>(null)
  const verMasRef = useRef<HTMLButtonElement>(null)
  const pidiendoMasRef = useRef(false)
  const montadoRef = useRef(false)
  // Los alumnos que había al pedir la página siguiente (null: no se está esperando una).
  const idsAntesDeVerMasRef = useRef<readonly string[] | null>(null)
  const hayTarea = tarea.data !== undefined
  const filas = lista.data?.pages.flatMap((pagina) => pagina.entregas)

  useAvisoDeRecargaFallida(
    claseId,
    tareaId,
    tarea.isError && hayTarea && !errorQueReemplazaLaVista(hayTarea, tarea.error),
    tarea,
    TEXTOS_DETALLE_TAREA.avisoRecargaFallida,
  )
  useFocoAlPerderseElControl(
    raizRef,
    `${claveDeFocoDeLaTarea(tareaId, tarea)}|${claveDeFocoDeLaTarea("entregas", lista)}`,
  )

  useEffect(() => {
    montadoRef.current = true
    return () => {
      montadoRef.current = false
    }
  }, [])

  // §7.14: si "Ver más alumnos" desaparece al cargar la última página, el foco va al "Ver entrega" de la
  // primera fila nueva o, si no llegó ninguna, al encabezado. Nunca a <body>.
  useEffect(() => {
    const antes = idsAntesDeVerMasRef.current
    if (antes === null || filas === undefined || lista.isFetchingNextPage) return
    idsAntesDeVerMasRef.current = null
    if (verMasRef.current?.isConnected === true) return
    const activo = document.activeElement
    if (activo !== null && activo !== document.body && activo.isConnected) return
    const nueva = filas.find((fila) => !antes.includes(fila.alumno.id))
    const enlace =
      nueva === undefined
        ? null
        : document.querySelector<HTMLElement>(`[data-entrega-de-alumno="${nueva.alumno.id}"] a`)
    if (enlace !== null) {
      enlace.focus()
      return
    }
    encabezadoRef.current?.focus()
  })

  const handleVerMas = async () => {
    if (pidiendoMasRef.current || lista.isFetching || filas === undefined) return
    pidiendoMasRef.current = true
    idsAntesDeVerMasRef.current = filas.map((fila) => fila.alumno.id)
    try {
      const resultado = await lista.fetchNextPage({ cancelRefetch: false })
      // Un solo aviso por error: sin aviso si la vista ya no está montada, si el error la reemplaza
      // (también el 400 del cursor, que dice su texto en la lista) o si apiClient ya redirigió.
      if (!resultado.isError || !montadoRef.current) return
      if (esErrorDeCursor(resultado.error)) return
      if (errorQueReemplazaLaVista(true, resultado.error)) return
      if (errorQueRedirigeElCliente(resultado.error)) return
      toast.error(mensajeDeConsultaTareas(resultado.error))
    } finally {
      pidiendoMasRef.current = false
    }
  }

  const listaReemplazada =
    lista.isError && (filas === undefined || errorQueReemplazaLaVista(true, lista.error))

  const cuerpoDeLaLista = (): ReactNode => {
    if (lista.isError && esErrorDeCursor(lista.error)) {
      return <MensajeError mensaje={TEXTOS_ENTREGAS.cambioMientrasLaVeias} />
    }

    if (!filas || !tarea.data) {
      return <Cargando texto={TEXTOS_ENTREGAS.cargando} />
    }

    if (filas.length === 0) {
      return <EstadoVacio titulo={TEXTOS_ENTREGAS.vacio} />
    }

    return (
      <>
        <TablaDeEntregas
          filas={filas}
          fechaLimite={tarea.data.tarea.fechaLimite}
          base={base}
          tareaId={tareaId}
        />
        {lista.hasNextPage && (
          <Button
            ref={verMasRef}
            type="button"
            variant="outline"
            enEspera={lista.isFetching}
            onClick={() => void handleVerMas()}
            className="self-start"
          >
            {TEXTOS_ENTREGAS.verMas}
          </Button>
        )}
      </>
    )
  }

  const contenido = (): ReactNode => {
    if (tarea.isError && errorQueReemplazaLaVista(hayTarea, tarea.error)) {
      return <MensajeError mensaje={mensajeDeConsultaTareas(tarea.error)} />
    }

    if (listaReemplazada && !esErrorDeCursor(lista.error)) {
      return <MensajeError mensaje={mensajeDeConsultaTareas(lista.error)} />
    }

    if (!tarea.data) {
      return <Cargando texto={TEXTOS_ENTREGAS.cargando} />
    }

    const conteo = lista.data === undefined ? null : conteoDeEntregas(lista.data.pages)

    return (
      <Card>
        <CardContent className="flex flex-col gap-4">
          <Link
            to={`${base}/tareas/${tareaId}`}
            className={buttonVariants({ variant: "ghost", size: "sm", className: "self-start" })}
          >
            <ArrowLeft aria-hidden="true" />
            {TEXTOS_ENTREGAS.volverALaTarea}
          </Link>
          <div className="flex flex-col gap-1">
            <h2 ref={encabezadoRef} tabIndex={-1} className="text-h2">
              {TEXTOS_ENTREGAS.titulo}
            </h2>
            <p className="wrap-anywhere text-small text-muted-foreground">
              {tarea.data.tarea.titulo}
            </p>
            {conteo !== null && <p className="text-small">{conteo}</p>}
          </div>
          {cuerpoDeLaLista()}
        </CardContent>
      </Card>
    )
  }

  return (
    <div ref={raizRef} tabIndex={-1}>
      {contenido()}
    </div>
  )
}

// El :claseId lo lee ConClaseDeLaRuta; el :tareaId, esta vista. Sin él no pide nada y dice lo mismo
// que una tarea que no existe.
export function EntregasView() {
  const { tareaId } = useParams<{ tareaId: string }>()

  return (
    <ConClaseDeLaRuta>
      {(claseId) => {
        if (tareaId === undefined) {
          return <MensajeError mensaje={MENSAJES_ERROR_TAREAS.tareaNoEncontrada} />
        }
        return <EntregasDeLaTarea claseId={claseId} tareaId={tareaId} />
      }}
    </ConClaseDeLaRuta>
  )
}
