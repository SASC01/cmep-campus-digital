import { Plus } from "lucide-react"
import { useEffect, useRef, useState, type ReactNode } from "react"
import { Link, useLocation } from "react-router"

import { Cargando } from "@/components/cargando"
import { EstadoVacio } from "@/components/estado-vacio"
import { MensajeError } from "@/components/mensaje-error"
import { Button } from "@/components/ui/button"
import { buttonVariants } from "@/components/ui/button-variants"
import { Card, CardContent } from "@/components/ui/card"
import { baseDeClase } from "@/lib/ruta-de-clase"

import { ConClaseDeLaRuta } from "./components/con-clase-de-la-ruta"
import { FormularioTema } from "./components/formulario-tema"
import { SeccionDeTema } from "./components/seccion-de-tema"
import { CAPACIDADES_POR_PERSPECTIVA, TEXTOS_TRABAJO } from "./data"
import { useAvisoDeRecargaFallida, useFilaEnFoco, useOrdenarTemas, useTemas } from "./hooks"
import {
  errorQuitaLaVista,
  focoPerdido,
  mensajeDeErrorClases,
  ordenTrasMover,
  perspectivaDeRuta,
  seccionesDeTrabajo,
  seccionVecina,
} from "./lib"
import type { ControlDeOrden, OrdenEnVuelo } from "./types"

interface TrabajoDeLaClaseProps {
  claseId: string
}

// Dónde queda el foco tras "Subir" o "Bajar": el mismo botón del tema que se movió o, si ese ya no se
// muestra (llegó arriba o abajo del todo), el otro botón del mismo tema; si no, su encabezado.
const enfocarControlDeOrden = ({ temaId, control }: OrdenEnVuelo): boolean => {
  const seccion = document.querySelector<HTMLElement>(`[data-tema-id="${temaId}"]`)
  if (seccion === null) return false
  const otro: ControlDeOrden = control === "subir" ? "bajar" : "subir"
  const destino =
    seccion.querySelector<HTMLElement>(`[data-${control}]`) ??
    seccion.querySelector<HTMLElement>(`[data-${otro}]`) ??
    seccion.querySelector<HTMLElement>("[data-encabezado-tema]")
  destino?.focus()
  return destino !== null
}

// §D-11, P-03 de CLASES-01: "Trabajo de clase". El alumno lo ve agrupado por tema y de solo lectura;
// el maestro y el admin además crean, renombran, ordenan y borran temas y mueven elementos (los
// botones salen de la perspectiva, y "Mover" de `puedeMover` de cada elemento). "Sin tema" va primero
// si tiene elementos y después los temas en su orden; cada sección pide su primera página al
// montarse, así que la fila del limitador respeta ese orden (Enmienda 5). Estados: error → cargando →
// vacío → datos.
function TrabajoDeLaClase({ claseId }: TrabajoDeLaClaseProps) {
  const { pathname } = useLocation()
  const perspectiva = perspectivaDeRuta(pathname)
  const capacidades = CAPACIDADES_POR_PERSPECTIVA[perspectiva]
  const base = baseDeClase(perspectiva, claseId)
  const temas = useTemas(claseId)
  const ordenar = useOrdenarTemas(claseId)
  const encabezadoRef = useRef<HTMLHeadingElement>(null)
  const nuevoTemaRef = useRef<HTMLButtonElement>(null)
  const [creando, setCreando] = useState(false)
  const [ordenEnVuelo, setOrdenEnVuelo] = useState<OrdenEnVuelo | null>(null)
  const focoTrasOrdenarRef = useRef<OrdenEnVuelo | null>(null)
  // M-01 (revisión de la ronda 1): guarda síncrona de "Subir" y "Bajar"; `ordenar.isPending` llega un
  // render después, y en esa ventana otro clic mandaría un orden calculado con la lista vieja.
  const ordenandoRef = useRef(false)
  const focoAlCerrarRef = useRef(false)
  const temaEnFocoRef = useFilaEnFoco("data-tema-id")
  const clavesPrevias = useRef<string[] | undefined>(undefined)
  const clasePrevia = useRef(claseId)
  const secciones = temas.data === undefined ? undefined : seccionesDeTrabajo(temas.data)
  const claves = secciones?.map(({ clave }) => clave)
  const listaDeTemas = temas.data?.temas

  // Una recarga fallida que conserva la vista avisa una vez por fallo; la que la reemplaza ya lo dice.
  useAvisoDeRecargaFallida(
    temas.errorUpdateCount,
    temas.data !== undefined && !errorQuitaLaVista(temas.error),
    TEXTOS_TRABAJO.recargaFallida,
  )

  // "Nuevo tema" abre el formulario; al cerrarlo (guardado o cancelado), el foco vuelve a "Nuevo tema".
  useEffect(() => {
    if (creando || !focoAlCerrarRef.current) return
    focoAlCerrarRef.current = false
    nuevoTemaRef.current?.focus()
  }, [creando])

  // §7.14: tras "Subir" o "Bajar", el foco vuelve al botón del tema que se movió (las secciones cambian
  // de lugar en la página y el botón pierde el foco), salvo que la persona ya lo haya llevado a otro
  // lado.
  useEffect(() => {
    const pendiente = focoTrasOrdenarRef.current
    if (pendiente === null || ordenar.isPending) return
    focoTrasOrdenarRef.current = null
    const activo = document.activeElement
    const seccion = document.querySelector(`[data-tema-id="${pendiente.temaId}"]`)
    if (!focoPerdido(document) && (seccion === null || !seccion.contains(activo))) return
    enfocarControlDeOrden(pendiente)
  })

  // §7.14: si el tema que tenía el foco desaparece (se borró aquí o en otra pestaña), el foco va al
  // "Borrar tema" del tema vecino (o a su encabezado) y, sin vecinos, al encabezado de la vista. Si el
  // tema sigue pero el control con el foco desapareció (su lista se vació o falló), al encabezado del
  // tema. Al cambiar de clase, al encabezado de la vista. Nunca a <body>.
  useEffect(() => {
    const previas = clavesPrevias.current
    clavesPrevias.current = claves
    const claveEnFoco = temaEnFocoRef.current
    if (clasePrevia.current !== claseId) {
      clasePrevia.current = claseId
      if (claveEnFoco === null || !focoPerdido(document)) return
      temaEnFocoRef.current = null
      encabezadoRef.current?.focus()
      return
    }
    if (claveEnFoco === null || !focoPerdido(document)) return
    temaEnFocoRef.current = null
    if (claves?.includes(claveEnFoco) === true) {
      document
        .querySelector<HTMLElement>(`[data-tema-id="${claveEnFoco}"] [data-encabezado-tema]`)
        ?.focus()
      return
    }
    const vecina = claves === undefined ? undefined : seccionVecina(previas, claves, claveEnFoco)
    if (vecina === undefined) {
      encabezadoRef.current?.focus()
      return
    }
    const seccion = document.querySelector<HTMLElement>(`[data-tema-id="${vecina}"]`)
    const destino =
      seccion?.querySelector<HTMLElement>("[data-borrar-tema]") ??
      seccion?.querySelector<HTMLElement>("[data-encabezado-tema]")
    if (destino === null || destino === undefined) {
      encabezadoRef.current?.focus()
      return
    }
    destino.focus()
  })

  const handleOrdenar = (temaId: string, control: ControlDeOrden) => {
    if (ordenandoRef.current || listaDeTemas === undefined) return
    const orden = ordenTrasMover(
      listaDeTemas.map(({ id }) => id),
      temaId,
      control,
    )
    if (orden === null) return
    const enVuelo = { temaId, control }
    setOrdenEnVuelo(enVuelo)
    focoTrasOrdenarRef.current = enVuelo
    ordenandoRef.current = true
    ordenar.mutate(orden, {
      onSettled: () => {
        ordenandoRef.current = false
        setOrdenEnVuelo(null)
      },
    })
  }

  const cerrarFormulario = () => {
    focoAlCerrarRef.current = true
    setCreando(false)
  }

  const contenido = (): ReactNode => {
    if (temas.isError && (temas.data === undefined || errorQuitaLaVista(temas.error))) {
      return <MensajeError mensaje={mensajeDeErrorClases(temas.error)} />
    }
    if (secciones === undefined || listaDeTemas === undefined) return <Cargando />
    if (secciones.length === 0) {
      return (
        <Card>
          <EstadoVacio titulo={TEXTOS_TRABAJO.vacio} />
        </Card>
      )
    }
    return (
      <div className="flex flex-col gap-4">
        {secciones.map((seccion) => {
          const posicion = listaDeTemas.findIndex(({ id }) => id === seccion.clave)
          return (
            <SeccionDeTema
              key={seccion.clave}
              claseId={claseId}
              base={base}
              seccion={seccion}
              temas={listaDeTemas}
              gestionar={capacidades.gestionarTrabajo}
              esPrimero={posicion === 0}
              esUltimo={posicion === listaDeTemas.length - 1}
              ordenEnVuelo={ordenEnVuelo}
              onOrdenar={handleOrdenar}
            />
          )
        })}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-5">
      <h2 ref={encabezadoRef} tabIndex={-1} className="sr-only">
        {TEXTOS_TRABAJO.titulo}
      </h2>
      {capacidades.gestionarTrabajo && (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Link to={`${base}/tareas/nueva`} className={buttonVariants({ variant: "primary" })}>
              <Plus aria-hidden="true" />
              {TEXTOS_TRABAJO.crearTarea}
            </Link>
            {!creando && (
              <Button
                ref={nuevoTemaRef}
                type="button"
                variant="outline"
                onClick={() => setCreando(true)}
              >
                {TEXTOS_TRABAJO.nuevoTema}
              </Button>
            )}
            <Link to={`${base}/categorias`} className={buttonVariants({ variant: "outline" })}>
              {TEXTOS_TRABAJO.categorias}
            </Link>
          </div>
          {creando && (
            <Card>
              <CardContent>
                <FormularioTema claseId={claseId} onTerminar={cerrarFormulario} />
              </CardContent>
            </Card>
          )}
        </div>
      )}
      {contenido()}
    </div>
  )
}

export function TrabajoView() {
  return <ConClaseDeLaRuta>{(claseId) => <TrabajoDeLaClase claseId={claseId} />}</ConClaseDeLaRuta>
}
