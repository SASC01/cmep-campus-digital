import { Plus } from "lucide-react"
import { useEffect, useRef, useState, type ReactNode } from "react"
import { Link, useLocation } from "react-router"

import { Cargando } from "@/components/cargando"
import { useGeneracionDeSoloLectura, useSoloLecturaDeLaClase } from "@/components/clase/hooks"
import { esClaseArchivada } from "@/components/clase/lib"
import { EstadoVacio } from "@/components/estado-vacio"
import { MensajeError } from "@/components/mensaje-error"
import { useAlPulsarLaSeccionActiva } from "@/components/seccion/hooks"
import { Button } from "@/components/ui/button"
import { buttonVariants } from "@/components/ui/button-variants"
import { Card, CardContent } from "@/components/ui/card"
import { baseDeClase } from "@/lib/ruta-de-clase"

import { ConClaseDeLaRuta } from "./components/con-clase-de-la-ruta"
import { FormularioTema } from "./components/formulario-tema"
import { SeccionDeTema } from "./components/seccion-de-tema"
import { CAPACIDADES_POR_PERSPECTIVA, TEXTOS_TRABAJO } from "./data"
import {
  useAvisoDeRecargaFallida,
  useFilaEnFoco,
  useOrdenarTemas,
  useOrdenDeTemasEnVuelo,
  useTemas,
  useTemasDeLaSeccion,
} from "./hooks"
import {
  elementosEnTotalDelTema,
  errorQueRedirigeElCliente,
  errorQuitaLaVista,
  focoPerdido,
  mensajeDeConsultaClases,
  ordenTrasMover,
  perspectivaDeRuta,
  seccionesDeTrabajo,
  seccionVecina,
} from "./lib"
import type { ControlDeOrden, OrdenEnVuelo, OrdenPropioEnVuelo } from "./types"

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

// §D-11, P-03 de CLASES-01: "Trabajo de clase", la sección "Actividades de aprendizaje" desde
// CLASES-03 (§D-7.6; el archivo y el segmento `trabajo` se conservan, DH-09). El alumno lo ve
// agrupado por tema y de solo lectura; el maestro y el admin además crean, renombran, ordenan y borran
// temas y mueven elementos (los botones salen de la perspectiva, y "Mover" de `puedeMover` de cada
// elemento). "Sin tema" va primero si tiene actividades y después los temas en su orden; cada sección
// pide su primera página al montarse, así que la fila del limitador respeta ese orden (Enmienda 5).
// CLASES-03c2: la estructura (temas, orden, nombres y conteos) sale de la lista de temas de la sección;
// la lista total solo da la frase de borrar un tema, y solo la piden el maestro y el admin (N-08).
// Estados: error → cargando → vacío → datos.
function TrabajoDeLaClase({ claseId }: TrabajoDeLaClaseProps) {
  const { pathname } = useLocation()
  const perspectiva = perspectivaDeRuta(pathname)
  const capacidades = CAPACIDADES_POR_PERSPECTIVA[perspectiva]
  const base = baseDeClase(perspectiva, claseId)
  // ADMIN-01d1 (§D-9, filas 7 y 8): en una clase archivada no se crean tareas ni temas; las
  // categorías de calificación siguen, para leerlas.
  const soloLectura = useSoloLecturaDeLaClase()
  const temas = useTemasDeLaSeccion(claseId, "actividades")
  const temasEnTotal = useTemas(claseId, capacidades.gestionarTrabajo)
  const ordenar = useOrdenarTemas(claseId)
  // CHORE-04 (§D-4, fila 29): un orden de esta clase lanzado por otra vista que ya se desmontó.
  const ordenDeLaCache = useOrdenDeTemasEnVuelo(claseId)
  const encabezadoRef = useRef<HTMLHeadingElement>(null)
  const nuevoTemaRef = useRef<HTMLButtonElement>(null)
  // T-01 (ronda 1 de 01d1): al pasar a solo lectura, lo que estaba abierto se cierra aquí mismo, para que
  // al volver a activa (restaurada en esta u otra sesión) no reaparezca abierto sin que nadie lo pida.
  // CHORE-06a (§D-1): «Nuevo tema» es de su clase; al pasar a otra o a solo lectura, se cierra.
  const [creandoEn, setCreandoEn] = useState<string | null>(null)
  if (creandoEn !== null && (creandoEn !== claseId || soloLectura)) setCreandoEn(null)
  const creando = creandoEn === claseId
  // CHORE-04 (§D-4 bis): el orden propio guarda su clase; la vista sobrevive al cambio de clase.
  const [ordenPropio, setOrdenPropio] = useState<OrdenPropioEnVuelo | null>(null)
  const focoTrasOrdenarRef = useRef<OrdenPropioEnVuelo | null>(null)
  // T-02 (ronda 2 de 01d1): un orden lanzado antes de pasar a solo lectura no mueve el foco al llegar.
  const { generacion, sigueVigente } = useGeneracionDeSoloLectura()
  const generacionDelOrdenRef = useRef(generacion)
  // M-01 (revisión de la ronda 1): guarda síncrona de "Subir" y "Bajar"; `ordenar.isPending` llega un
  // render después, y en esa ventana otro clic mandaría un orden calculado con la lista vieja.
  // CHORE-04 (§D-4 bis): guarda la clase del orden y se suelta en el finally de mutateAsync (la clave por
  // clase suelta al observador al cambiar de clase, y el onSettled del mutate ya no correría).
  const ordenandoRef = useRef<string | null>(null)
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
    temas.data !== undefined &&
      !errorQuitaLaVista(temas.error) &&
      !esClaseArchivada(temas.error) &&
      !errorQueRedirigeElCliente(temas.error),
    TEXTOS_TRABAJO.recargaFallida,
    claseId,
  )

  // R2 (§D-10 a, N-54): pulsar "Actividades de aprendizaje" estando ahí no desmonta la vista. Si la
  // lista de temas está en error, la vuelve a pedir; cada tema en error lo hace por su cuenta
  // (SeccionDeTema). Lo que está sano no se pide (S-10).
  useAlPulsarLaSeccionActiva(() => {
    if (!temas.isError) return
    void temas.refetch()
  })

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
    // CHORE-04 (§D-4 bis): un orden de otra clase no mueve el foco en esta.
    if (pendiente !== null && pendiente.claseId !== claseId) {
      focoTrasOrdenarRef.current = null
      return
    }
    if (pendiente === null || ordenar.isPending) return
    focoTrasOrdenarRef.current = null
    if (!sigueVigente(generacionDelOrdenRef.current)) return
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

  const handleOrdenar = async (temaId: string, control: ControlDeOrden) => {
    if (ordenandoRef.current === claseId) return
    if (ordenDeLaCache.sigueEnVuelo() || listaDeTemas === undefined) return
    const orden = ordenTrasMover(
      listaDeTemas.map(({ id }) => id),
      temaId,
      control,
    )
    if (orden === null) return
    const enVuelo: OrdenPropioEnVuelo = { claseId, temaId, control }
    setOrdenPropio(enVuelo)
    focoTrasOrdenarRef.current = enVuelo
    generacionDelOrdenRef.current = generacion
    ordenandoRef.current = claseId
    try {
      await ordenar.mutateAsync({ temaIds: orden, temaId, control })
    } catch {
      // El aviso y la renovación los da useOrdenarTemas.
    } finally {
      if (ordenandoRef.current === enVuelo.claseId) ordenandoRef.current = null
      setOrdenPropio((actual) => (actual === enVuelo ? null : actual))
    }
  }

  // El orden propio solo si es de esta clase; si no, el de la caché (otra vista lo lanzó).
  const ordenPropioDeEstaClase = ordenPropio?.claseId === claseId ? ordenPropio : null
  const ordenEnVuelo: OrdenEnVuelo | null = ordenPropioDeEstaClase ?? ordenDeLaCache.ordenEnVuelo

  const cerrarFormulario = () => {
    focoAlCerrarRef.current = true
    setCreandoEn(null)
  }

  const contenido = (): ReactNode => {
    if (temas.isError && (temas.data === undefined || errorQuitaLaVista(temas.error))) {
      return <MensajeError mensaje={mensajeDeConsultaClases(temas.error)} />
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
          const elementosEnTotal =
            seccion.tema === null
              ? null
              : elementosEnTotalDelTema(temasEnTotal.data, temasEnTotal.isError, seccion.tema.id)
          return (
            <SeccionDeTema
              key={`${claseId}:${seccion.clave}`}
              claseId={claseId}
              base={base}
              seccion={seccion}
              temas={listaDeTemas}
              elementosEnTotal={elementosEnTotal}
              gestionar={capacidades.gestionarTrabajo}
              esPrimero={posicion === 0}
              esUltimo={posicion === listaDeTemas.length - 1}
              ordenEnVuelo={ordenEnVuelo}
              onOrdenar={(temaId, control) => void handleOrdenar(temaId, control)}
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
            {!soloLectura && (
              <Link to={`${base}/tareas/nueva`} className={buttonVariants({ variant: "primary" })}>
                <Plus aria-hidden="true" />
                {TEXTOS_TRABAJO.crearTarea}
              </Link>
            )}
            {!soloLectura && !creando && (
              <Button
                ref={nuevoTemaRef}
                type="button"
                variant="outline"
                onClick={() => setCreandoEn(claseId)}
              >
                {TEXTOS_TRABAJO.nuevoTema}
              </Button>
            )}
            <Link to={`${base}/categorias`} className={buttonVariants({ variant: "outline" })}>
              {TEXTOS_TRABAJO.categorias}
            </Link>
          </div>
          {!soloLectura && creando && (
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
