import { useRef, type ReactNode, type RefObject } from "react"
import { useInRouterContext } from "react-router"

import { Cargando } from "@/components/cargando"
import { useFocoAlCargarMas } from "@/components/foco/hooks"
import { useAlPulsarLaSeccionActiva } from "@/components/seccion/hooks"
import { EstadoVacio } from "@/components/estado-vacio"
import { MensajeError } from "@/components/mensaje-error"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatearFechaHora } from "@/lib/format"
import { unirPaginasSinRepetidas } from "@/lib/unir-paginas"

import { TEXTOS_MAESTROS } from "../data"
import {
  claveRegistradosDelEnlace,
  useMarcarViejaSiQuedoEnError,
  useRegistradosDelEnlace,
  useVolverAPedirSiFallo,
} from "../hooks"
import { errorQueRedirigeElCliente, mensajeDeConsultaAdmin, textoOcultoDeFila } from "../lib"

interface RegistradosDelEnlaceProps {
  enlaceId: string
  // R-18 (Enmienda 6, decidido por el manager): con dos filas expandidas, "Cargar más" repetiría su
  // nombre accesible. Mismo patrón que los botones de fila de TablaEnlaces (§D-B6): el texto visible
  // no cambia, el dato que distingue la fila va después, como texto sr-only.
  creadoEnDelEnlace: string
  // Ronda 1 (T-03, hermano de E-18): a dónde va el foco si «Cargar más» se desmonta con el foco dentro
  // (la última página o un error que reemplaza la lista): el botón que abrió la lista en la fila del enlace.
  destinoDelFocoRef: RefObject<HTMLButtonElement | null>
}

interface AlPulsarLaSeccionActivaProps {
  alPulsar: () => void
}

// ADMIN-01g, ronda 2 (T-06): useAlPulsarLaSeccionActiva lee la location del router. Las listas de
// /admin/maestros también se montan fuera de un router (pruebas de la vista de antes de 01g), así que el
// gancho vive en este componente, que solo se monta dentro de uno. Lo usan esta lista y TablaEnlaces.
export function AlPulsarLaSeccionActiva({ alPulsar }: AlPulsarLaSeccionActivaProps) {
  useAlPulsarLaSeccionActiva(alPulsar)
  return null
}

// AUTH-03b, §D-B6: tabla de registrados dentro de la fila expandida de un enlace. Su vacío no lleva
// acción (§7.10, excepción documentada): ahí no hay nada que hacer.
export function RegistradosDelEnlace({
  enlaceId,
  creadoEnDelEnlace,
  destinoDelFocoRef,
}: RegistradosDelEnlaceProps) {
  const registrados = useRegistradosDelEnlace(enlaceId)
  // ADMIN-01g (E-07, fila 25 de CHORE-04): guarda síncrona, la espera de isFetching y cancelRefetch: false.
  const cargandoMasRef = useRef(false)

  // Ronda 2 (hermano de T-06): con la lista abierta y en error, pulsar «Maestros» estando aquí la vuelve a
  // pedir desde la primera página; ocultarla y volver a verla también (en error se marca vieja al
  // desmontarse).
  useMarcarViejaSiQuedoEnError(claveRegistradosDelEnlace(enlaceId))
  const volverAPedirSiFallo = useVolverAPedirSiFallo(claveRegistradosDelEnlace(enlaceId))
  const enUnRouter = useInRouterContext()
  // Sin filas repetidas si una página siguiente repite un registrado (R-19).
  const filas = registrados.data
    ? unirPaginasSinRepetidas(registrados.data.pages.map((pagina) => pagina.registrados))
    : undefined

  // Sus filas no tienen controles: al desmontarse «Cargar más» con el foco dentro, el foco va al botón
  // de la fila del enlace que abrió la lista, nunca a <body>.
  const refCargarMas = useFocoAlCargarMas(
    filas?.map((registrado) => registrado.id),
    () => false,
    () => destinoDelFocoRef.current?.focus(),
  )

  const cargarMas = () => {
    if (cargandoMasRef.current) return
    cargandoMasRef.current = true
    void registrados.fetchNextPage({ cancelRefetch: false }).finally(() => {
      cargandoMasRef.current = false
    })
  }

  const contenido = (): ReactNode => {
    // Ronda 1: un error con que apiClient redirige no se pinta (la página se va).
    if (registrados.isError && !errorQueRedirigeElCliente(registrados.error)) {
      return <MensajeError mensaje={mensajeDeConsultaAdmin(registrados.error)} />
    }

    if (registrados.isLoading || !filas) {
      return <Cargando />
    }

    if (filas.length === 0) {
      return <EstadoVacio titulo={TEXTOS_MAESTROS.enlaces.registrados.vacioTitulo} />
    }

    return (
      <div className="flex flex-col gap-3">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{TEXTOS_MAESTROS.enlaces.registrados.nombre}</TableHead>
              <TableHead>{TEXTOS_MAESTROS.enlaces.registrados.correo}</TableHead>
              <TableHead>{TEXTOS_MAESTROS.enlaces.registrados.registro}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filas.map((registrado) => (
              <TableRow key={registrado.id}>
                <TableCell>{registrado.nombre}</TableCell>
                <TableCell>{registrado.email}</TableCell>
                <TableCell>{formatearFechaHora(registrado.creadoEn)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {registrados.hasNextPage && (
          <Button
            ref={refCargarMas}
            type="button"
            variant="outline"
            onClick={cargarMas}
            enEspera={registrados.isFetching}
          >
            {TEXTOS_MAESTROS.enlaces.registrados.cargarMas}{" "}
            <span className="sr-only">
              {textoOcultoDeFila(
                TEXTOS_MAESTROS.enlaces.ocultoDeFila.cargarMasRegistrados,
                formatearFechaHora(creadoEnDelEnlace),
              )}
            </span>
          </Button>
        )}
      </div>
    )
  }

  return (
    <>
      {enUnRouter && <AlPulsarLaSeccionActiva alPulsar={volverAPedirSiFallo} />}
      {contenido()}
    </>
  )
}
