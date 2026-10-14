import { useEffect, useId, useRef, useState, type ChangeEvent, type ReactNode } from "react"
import { toast } from "sonner"

import { Cargando } from "@/components/cargando"
import { ConClaseDeLaRuta } from "@/components/clase/con-clase-de-la-ruta"
import { EstadoVacio } from "@/components/estado-vacio"
import { useFocoAlPerderseElControl } from "@/components/foco/hooks"
import { claveDeFocoDeLaConsulta } from "@/components/foco/lib"
import { MensajeError } from "@/components/mensaje-error"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { formatearPorcentaje } from "@/lib/format"

import { CalculoDeCalificacion } from "./components/calculo-de-calificacion"
import { ListaDeMisCalificaciones } from "./components/lista-de-mis-calificaciones"
import {
  CAMPOS_DE_CURSOR_DE_MIS_CALIFICACIONES,
  MENSAJES_ERROR_CALIFICACIONES,
  OPCIONES_DEL_FILTRO,
  TEXTOS_MIS_CALIFICACIONES,
  VACIOS_POR_FILTRO,
} from "./data"
import { useAlPulsarLaSeccionActiva, useMisCalificaciones } from "./hooks"
import {
  errorQueRedirigeElCliente,
  esErrorDeCursorDeCalificaciones,
  esErrorDeSinAcceso,
  mensajeDeErrorCalificaciones,
} from "./lib"
import type { FiltroDeMisCalificaciones } from "./types"

interface MisCalificacionesDeLaClaseProps {
  claseId: string
}

// §D-13.4 (RF-17, DESIGN.md §7.29): "Mis calificaciones" del alumno en una clase. Un panel (Card) con
// el h2, la calificación general con "Ver cálculo" (el modal de RF-18), el selector "Mostrar" y la
// lista de tareas. El selector sigue a la vista con la opción elegida en todos los estados, así que al
// cambiarlo el foco se queda en él. Estados de la lista: error → cargando → vacío → datos.
// - Un error sin filas a la vista (primera carga o filtro nuevo) o que reemplaza la vista (se perdió el
//   acceso) va en un solo MensajeError en lugar de la lista, sin aviso; el 400 de un cursor dice su
//   texto fijo. Nunca el texto que trae el servidor (S-21, S-22).
// - Una recarga de fondo que falla con filas a la vista las conserva, sin aviso (S-19).
// - "Ver más tareas" que falla avisa una vez por intento, solo con la vista montada y si el error no
//   es del cursor, no reemplaza la vista ni lo redirige apiClient; el del cursor dice su texto en lugar
//   de la lista.
// Si una recarga quita el control con el foco, el foco va a la raíz.
function MisCalificacionesDeLaClase({ claseId }: MisCalificacionesDeLaClaseProps) {
  const [filtro, setFiltro] = useState<FiltroDeMisCalificaciones>("todas")
  const lista = useMisCalificaciones(claseId, filtro)
  const raizRef = useRef<HTMLDivElement>(null)
  const encabezadoRef = useRef<HTMLHeadingElement>(null)
  const verMasRef = useRef<HTMLButtonElement>(null)
  // El filtro cuya página siguiente está en vuelo (null: ninguna). La guarda es de ese filtro: al
  // cambiarlo se libera, y la respuesta de la página vieja no la libera ni la toma para el nuevo (M-09).
  const pidiendoMasDeRef = useRef<FiltroDeMisCalificaciones | null>(null)
  const filtroRef = useRef<FiltroDeMisCalificaciones>(filtro)
  const montadoRef = useRef(false)
  // Las tareas que había al pedir la página siguiente (null: no se está esperando una).
  const idsAntesDeVerMasRef = useRef<readonly string[] | null>(null)
  const idDelFiltro = useId()
  const paginas = lista.data?.pages
  const filas = paginas?.flatMap((pagina) => pagina.tareas)
  const general = paginas?.at(-1)?.general

  useEffect(() => {
    montadoRef.current = true
    return () => {
      montadoRef.current = false
    }
  }, [])

  // §7.14: si "Ver más tareas" desaparece al cargar la última página, el foco va al enlace de la
  // primera fila nueva o, si no llegó ninguna, al h2. Nunca a <body>. Un fallo no mueve el foco aquí:
  // si quita el botón (el cursor), lo lleva a la raíz el gancho de foco, que corre después.
  useEffect(() => {
    const antes = idsAntesDeVerMasRef.current
    if (antes === null || filas === undefined || lista.isFetchingNextPage) return
    idsAntesDeVerMasRef.current = null
    if (lista.isError) return
    if (verMasRef.current?.isConnected === true) return
    const activo = document.activeElement
    if (activo !== null && activo !== document.body && activo.isConnected) return
    const nueva = filas.find((fila) => !antes.includes(fila.id))
    const enlace =
      nueva === undefined
        ? null
        : (raizRef.current?.querySelector<HTMLElement>(
            `[data-tarea-de-mis-calificaciones="${nueva.id}"] a`,
          ) ?? null)
    if (enlace !== null) {
      enlace.focus()
      return
    }
    encabezadoRef.current?.focus()
  })

  useFocoAlPerderseElControl(raizRef, claveDeFocoDeLaConsulta(`mis:${filtro}`, lista))

  // T-08: pulsar la sección "Calificaciones" estando en ella (con o sin el texto del cursor a la vista)
  // vuelve a pedir la lista desde la primera página, con el filtro elegido, que sigue a la vista. Si ya
  // pide algo (también "Ver más tareas"), no la cancela ni la duplica. El foco se queda en la sección.
  const { refetch } = lista
  useAlPulsarLaSeccionActiva(() => {
    void refetch({ cancelRefetch: false })
  })

  const handleVerMas = async () => {
    if (pidiendoMasDeRef.current !== null || lista.isFetching || filas === undefined) return
    const filtroDeLaPeticion = filtro
    pidiendoMasDeRef.current = filtroDeLaPeticion
    idsAntesDeVerMasRef.current = filas.map((fila) => fila.id)
    try {
      const resultado = await lista.fetchNextPage({ cancelRefetch: false })
      // Un solo aviso por intento, solo si falló la página siguiente de lo que se observa: sin aviso si
      // el filtro cambió mientras llegaba (la respuesta es de otra clave), si la vista ya no está
      // montada, si es el 400 del cursor (dice su texto en la lista), si el error reemplaza la vista o
      // si apiClient ya redirigió.
      if (filtroRef.current !== filtroDeLaPeticion) return
      if (!resultado.isFetchNextPageError || !montadoRef.current) return
      if (esErrorDeCursorDeCalificaciones(resultado.error, CAMPOS_DE_CURSOR_DE_MIS_CALIFICACIONES))
        return
      if (esErrorDeSinAcceso(resultado.error)) return
      if (errorQueRedirigeElCliente(resultado.error)) return
      toast.error(
        mensajeDeErrorCalificaciones(resultado.error, MENSAJES_ERROR_CALIFICACIONES.verMasTareas),
      )
    } finally {
      if (pidiendoMasDeRef.current === filtroDeLaPeticion) pidiendoMasDeRef.current = null
    }
  }

  const handleFiltro = (evento: ChangeEvent<HTMLSelectElement>) => {
    const opcion = OPCIONES_DEL_FILTRO.find((o) => o.valor === evento.target.value)
    if (opcion === undefined) return
    idsAntesDeVerMasRef.current = null
    pidiendoMasDeRef.current = null
    filtroRef.current = opcion.valor
    setFiltro(opcion.valor)
  }

  const listaReemplazada = lista.isError && (filas === undefined || esErrorDeSinAcceso(lista.error))
  const enfocarLaRaiz = () => raizRef.current?.focus()

  // El 400 del cursor dice su texto en lugar de la lista: sin filas a la vista o al pedir la página
  // siguiente. En una recarga de fondo con filas, no (S-19).
  const errorDeCursor =
    lista.isError &&
    esErrorDeCursorDeCalificaciones(lista.error, CAMPOS_DE_CURSOR_DE_MIS_CALIFICACIONES)

  const cuerpoDeLaLista = (): ReactNode => {
    if (errorDeCursor && (listaReemplazada || lista.isFetchNextPageError)) {
      return <MensajeError mensaje={MENSAJES_ERROR_CALIFICACIONES.cursorDeMisCalificaciones} />
    }

    if (listaReemplazada) {
      return (
        <MensajeError
          mensaje={mensajeDeErrorCalificaciones(
            lista.error,
            MENSAJES_ERROR_CALIFICACIONES.misCalificaciones,
          )}
        />
      )
    }

    if (!filas) {
      return <Cargando texto={TEXTOS_MIS_CALIFICACIONES.cargando} />
    }

    if (filas.length === 0) {
      return <EstadoVacio titulo={VACIOS_POR_FILTRO[filtro]} />
    }

    return (
      <>
        <ListaDeMisCalificaciones tareas={filas} />
        {lista.hasNextPage && (
          <Button
            ref={verMasRef}
            type="button"
            variant="outline"
            enEspera={lista.isFetching}
            onClick={() => void handleVerMas()}
            className="self-start"
          >
            {TEXTOS_MIS_CALIFICACIONES.verMas}
          </Button>
        )}
      </>
    )
  }

  const calificacionGeneral = (): ReactNode => {
    if (listaReemplazada || general === undefined) return null

    return (
      <div className="flex flex-col gap-2">
        <p className="text-small font-bold text-muted-foreground">
          {TEXTOS_MIS_CALIFICACIONES.general}
        </p>
        {general.porcentaje === null ? (
          <p>{TEXTOS_MIS_CALIFICACIONES.sinGeneral}</p>
        ) : (
          <p className="text-h2 tabular-nums">{formatearPorcentaje(general.porcentaje)}</p>
        )}
        <CalculoDeCalificacion general={general} alCerrarSinBoton={enfocarLaRaiz} />
      </div>
    )
  }

  return (
    <div ref={raizRef} tabIndex={-1}>
      <Card>
        <CardContent className="flex flex-col gap-4">
          <h2 ref={encabezadoRef} tabIndex={-1} className="text-h2">
            {TEXTOS_MIS_CALIFICACIONES.titulo}
          </h2>
          {calificacionGeneral()}
          <div className="flex max-w-xs flex-col gap-2">
            <Label htmlFor={idDelFiltro}>{TEXTOS_MIS_CALIFICACIONES.mostrar}</Label>
            <NativeSelect id={idDelFiltro} value={filtro} onChange={handleFiltro}>
              {OPCIONES_DEL_FILTRO.map((opcion) => (
                <NativeSelectOption key={opcion.valor} value={opcion.valor}>
                  {opcion.texto}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </div>
          {cuerpoDeLaLista()}
        </CardContent>
      </Card>
    </div>
  )
}

// El :claseId lo lee ConClaseDeLaRuta (sin él no pide nada y dice "No tienes acceso a esta clase.").
export function MisCalificacionesView() {
  return (
    <ConClaseDeLaRuta>
      {(claseId) => <MisCalificacionesDeLaClase claseId={claseId} />}
    </ConClaseDeLaRuta>
  )
}
