import { Check } from "lucide-react"
import { useRef, useState, type ReactNode } from "react"
import { Link, useNavigate, useSearchParams } from "react-router"

import { Cargando } from "@/components/cargando"
import { EstadoVacio } from "@/components/estado-vacio"
import { MensajeError } from "@/components/mensaje-error"
import { useAlPulsarLaSeccionActiva } from "@/components/seccion/hooks"
import { Button } from "@/components/ui/button"
import { buttonVariants } from "@/components/ui/button-variants"
import { Card, CardAction, CardContent, CardHeader } from "@/components/ui/card"
import { unirPaginasSinRepetidas } from "@/lib/unir-paginas"
import { cn } from "@/lib/utils"

import { DialogoBorrarClase } from "./components/dialogo-borrar-clase"
import { TablaClasesAdmin } from "./components/tabla-clases-admin"
import { claveClasesAdmin, ESTADOS_DE_LA_LISTA, TEXTOS_CLASES_ADMIN } from "./data"
import {
  useClasesAdmin,
  useFocoAlCargarMas,
  useFocoAlCerrarElBorrado,
  useFocoAlPasarAError,
  useFocoAlQuitarUnaClase,
  useRecuperarListaDeClasesAdmin,
} from "./hooks"
import { esErrorDeCursor, estadoDeLaLista } from "./lib"
import type { ClaseAdmin, EstadoDeClases } from "./types"

// §D-2C2, DESIGN.md §7.9: /admin/clases, la lista institucional (RF-52). "Crear clase" es la única
// acción principal de la vista (el vacío de "Activas" ofrece "Crea la primera clase" en outline).
// Estados en orden: error → cargando → vacío → datos. "Cargar más clases" sigue el criterio de foco de
// §7.14: al cargar la última página, el foco va al "Abrir" de la primera clase nueva o, si no llegó
// ninguna, al encabezado.
// ADMIN-01c (§D-10): el control segmentado "Activas" / "Archivadas" (§7.3, vidrio fuerte dentro de la
// Card; en el contexto opaco vale --surface) escribe `?estado=` en el historial; sin el parámetro, la
// vista abre en "Activas" y no lo escribe. Cada estado es su propia consulta; las páginas se unen sin
// filas repetidas (R-19).
export function ClasesAdminView() {
  const [parametros, setParametros] = useSearchParams()
  const estado = estadoDeLaLista(parametros.get("estado"))
  const clases = useClasesAdmin(estado)
  const navigate = useNavigate()
  const encabezadoRef = useRef<HTMLHeadingElement>(null)
  const cargandoMasRef = useRef(false)
  const [claseABorrar, setClaseABorrar] = useState<ClaseAdmin | null>(null)

  // T-04: si la lista se recarga con error con el foco dentro, va al encabezado. O-01c-6: la memoria
  // del gancho es de la lista de cada estado.
  useFocoAlPasarAError(
    clases.isError,
    clases.data !== undefined,
    claveClasesAdmin(estado).join("/"),
    encabezadoRef,
  )

  // ADM-1C07 y ADM-1C12: las frases de error y de lista cambiada se cumplen pulsando "Clases" estando
  // aquí, cambiando de pestaña, con atrás y adelante, y yendo a otra sección y regresando.
  const volverAPedirSiFallo = useRecuperarListaDeClasesAdmin(estado)
  useAlPulsarLaSeccionActiva(volverAPedirSiFallo)

  const filas = clases.data
    ? unirPaginasSinRepetidas(clases.data.pages.map((pagina) => pagina.clases))
    : undefined
  const ids = filas?.map((clase) => clase.id)

  const refVerMas = useFocoAlCargarMas(
    ids,
    (id) => {
      const abrir = document.querySelector<HTMLElement>(`[data-clase-id="${id}"] a`)
      abrir?.focus()
      return abrir !== null
    },
    () => encabezadoRef.current?.focus(),
  )

  const marcarBorrada = useFocoAlQuitarUnaClase(
    ids,
    estado === "activas" ? "archivar" : "restaurar",
    () => encabezadoRef.current?.focus(),
  )

  const devolverElFocoA = useFocoAlCerrarElBorrado(claseABorrar !== null)

  // Corrección de la ronda 1 (hermano de T-01): si la fila ya salió mientras el diálogo estaba abierto
  // (otra pestaña la borró y la lista se renovó), el foco va a la fila vecina, como tras borrar; si sigue,
  // vuelve al «Borrar definitivamente» que abrió el diálogo.
  const alCerrarElBorrado = (id: string) => {
    if (ids?.includes(id) === true) {
      devolverElFocoA(id)
      return
    }
    marcarBorrada(id)
  }

  const elegirEstado = (opcion: EstadoDeClases) => {
    if (opcion === estado) return
    setParametros({ estado: opcion })
  }

  // CHORE-04 (fila 26): guarda síncrona; enEspera llega un render después.
  const cargarMas = () => {
    if (cargandoMasRef.current) return
    cargandoMasRef.current = true
    void clases.fetchNextPage({ cancelRefetch: false }).finally(() => {
      cargandoMasRef.current = false
    })
  }

  const contenido = (): ReactNode => {
    if (clases.isError && esErrorDeCursor(clases.error)) {
      return <MensajeError mensaje={TEXTOS_CLASES_ADMIN.cambioMientrasLasVeias} />
    }
    if (clases.isError) return <MensajeError mensaje={TEXTOS_CLASES_ADMIN.error} />
    if (clases.isLoading || !filas) return <Cargando />
    if (filas.length === 0 && estado === "archivadas") {
      return <EstadoVacio titulo={TEXTOS_CLASES_ADMIN.vacioArchivadas} />
    }
    if (filas.length === 0) {
      return (
        <EstadoVacio
          titulo={TEXTOS_CLASES_ADMIN.vacioTitulo}
          accion={{
            texto: TEXTOS_CLASES_ADMIN.vacioAccion,
            onClick: () => void navigate("/admin/clases/nueva"),
            variante: "outline",
          }}
        />
      )
    }
    return (
      <>
        <TablaClasesAdmin clases={filas} estado={estado} onBorrar={setClaseABorrar} />
        {clases.hasNextPage && (
          <Button
            ref={refVerMas}
            type="button"
            variant="outline"
            onClick={cargarMas}
            enEspera={clases.isFetching}
            className="self-start"
          >
            {TEXTOS_CLASES_ADMIN.verMas}
          </Button>
        )}
      </>
    )
  }

  return (
    <Card>
      <CardHeader>
        <h1 ref={encabezadoRef} tabIndex={-1} className="text-h1">
          {TEXTOS_CLASES_ADMIN.titulo}
        </h1>
        <CardAction>
          <Link to="/admin/clases/nueva" className={buttonVariants({ variant: "primary" })}>
            {TEXTOS_CLASES_ADMIN.crear}
          </Link>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div
          role="group"
          aria-label={TEXTOS_CLASES_ADMIN.estadoDeLasClases}
          className="vidrio-fuerte w-fit rounded-card p-1"
        >
          <div className="relative grid grid-cols-2">
            <span
              aria-hidden="true"
              className={cn(
                "absolute inset-y-0 left-0 w-1/2 rounded-row bg-surface transition-transform duration-200 in-data-[material=opaco]:bg-accent-soft motion-reduce:transition-none",
                estado === "archivadas" && "translate-x-full",
              )}
            />
            {ESTADOS_DE_LA_LISTA.map((opcion) => (
              <Button
                key={opcion.estado}
                type="button"
                variant="ghost"
                size="sm"
                aria-pressed={opcion.estado === estado}
                onClick={() => elegirEstado(opcion.estado)}
                className="relative w-full aria-pressed:text-link"
              >
                {opcion.estado === estado && <Check aria-hidden="true" />}
                {opcion.texto}
              </Button>
            ))}
          </div>
        </div>
        {contenido()}
      </CardContent>
      <DialogoBorrarClase
        clase={claseABorrar}
        onCerrar={() => {
          if (claseABorrar !== null) alCerrarElBorrado(claseABorrar.id)
          setClaseABorrar(null)
        }}
        onBorrada={(id) => {
          marcarBorrada(id)
          setClaseABorrar(null)
        }}
      />
    </Card>
  )
}
