import { useEffect, useRef, useState, type ReactNode } from "react"
import { useInRouterContext } from "react-router"

import { Cargando } from "@/components/cargando"
import { useFocoAlCargarMas, useFocoAlPerderseElControl } from "@/components/foco/hooks"
import { claveDeFocoDeLaConsulta } from "@/components/foco/lib"
import { EstadoVacio } from "@/components/estado-vacio"
import { MensajeError } from "@/components/mensaje-error"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
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

import { InsigniaEstadoEnlace } from "./insignia-estado-enlace"
import { AlPulsarLaSeccionActiva, RegistradosDelEnlace } from "./registrados-del-enlace"
import { CLAVE_ENLACES_REGISTRO, TEXTOS_MAESTROS } from "../data"
import {
  useEnlacesRegistro,
  useMarcarViejaSiQuedoEnError,
  useRevocarEnlace,
  useVolverAPedirSiFallo,
} from "../hooks"
import {
  errorQueRedirigeElCliente,
  mensajeDeConsultaAdmin,
  mensajeDeErrorAdmin,
  textoOcultoDeFila,
} from "../lib"
import type { EnlaceRegistroAdmin } from "../types"

interface FilaEnlaceProps {
  enlace: EnlaceRegistroAdmin
}

// T-10 (ronda 1) / Enmienda 6 (arbitraje del manager, §D-B6): con dos o más filas, los botones de
// acción quedaban indistinguibles para quien navega por la lista de controles de un lector de
// pantalla. El texto visible no cambia; el nombre accesible de cada botón de fila suma, después de
// un espacio explícito, un texto sr-only con el dato que identifica la fila (DESIGN.md §7.9). Nada
// de aria-hidden ni de aria-label: un aria-hidden deja el identificador fuera del nombre accesible
// (lo que un lector de pantalla anuncia), que es justo lo que hay que distinguir. R-17: dos enlaces
// creados en el mismo minuto repetirían el nombre; riesgo aceptado.
interface MarcaProps {
  plantilla: string
  creadoEn: string
}

function Marca({ plantilla, creadoEn }: MarcaProps) {
  return (
    <>
      {" "}
      <span className="sr-only">{textoOcultoDeFila(plantilla, formatearFechaHora(creadoEn))}</span>
    </>
  )
}

function FilaEnlace({ enlace }: FilaEnlaceProps) {
  const [expandido, setExpandido] = useState(false)
  const expandirBtnRef = useRef<HTMLButtonElement>(null)
  const [confirmando, setConfirmando] = useState(false)
  const revocar = useRevocarEnlace()
  const enviandoRef = useRef(false)
  const revocarBtnRef = useRef<HTMLButtonElement>(null)
  const cancelarBtnRef = useRef<HTMLButtonElement>(null)
  // T-09 (ronda 1): mismo patrón que AccionRestablecer (features/admin/components/ficha-de-cuenta.tsx,
  // AUTH-02): compara contra el valor de "confirmando" que el efecto ya procesó, para que el doble
  // montaje de <StrictMode> no repita el movimiento de foco.
  const confirmandoAnteriorRef = useRef(confirmando)

  useEffect(() => {
    if (confirmandoAnteriorRef.current === confirmando) return
    confirmandoAnteriorRef.current = confirmando
    if (confirmando) {
      cancelarBtnRef.current?.focus()
      return
    }
    revocarBtnRef.current?.focus()
  }, [confirmando])

  // ADMIN-01g (E-01): al abrir o cerrar la confirmación, el error de «Sí, revocar» sale y no reaparece
  // al reabrirla. Con la petición en vuelo (la ref se lee al instante) no se toca.
  const abrirConfirmacion = () => {
    if (!enviandoRef.current && !revocar.isPending) revocar.reset()
    setConfirmando(true)
  }

  const cerrarConfirmacion = () => {
    if (!enviandoRef.current && !revocar.isPending) revocar.reset()
    setConfirmando(false)
  }

  const handleRevocar = () => {
    if (enviandoRef.current) return
    enviandoRef.current = true
    revocar.mutate(enlace.id, {
      onSuccess: () => setConfirmando(false),
      onSettled: () => {
        enviandoRef.current = false
      },
    })
  }

  return (
    <>
      <TableRow data-enlace-id={enlace.id}>
        <TableCell>{formatearFechaHora(enlace.creadoEn)}</TableCell>
        <TableCell>{formatearFechaHora(enlace.expiraEn)}</TableCell>
        <TableCell>
          <InsigniaEstadoEnlace estado={enlace.estado} />
        </TableCell>
        <TableCell className="text-right tabular-nums">{enlace.registrados}</TableCell>
        <TableCell>
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <Button
                ref={expandirBtnRef}
                type="button"
                variant="ghost"
                aria-expanded={expandido}
                onClick={() => setExpandido((valor) => !valor)}
              >
                {expandido
                  ? TEXTOS_MAESTROS.enlaces.ocultarRegistrados
                  : TEXTOS_MAESTROS.enlaces.verRegistrados}
                <Marca
                  plantilla={
                    expandido
                      ? TEXTOS_MAESTROS.enlaces.ocultoDeFila.ocultarRegistrados
                      : TEXTOS_MAESTROS.enlaces.ocultoDeFila.verRegistrados
                  }
                  creadoEn={enlace.creadoEn}
                />
              </Button>
              {enlace.estado === "vigente" && !confirmando && (
                <Button
                  ref={revocarBtnRef}
                  type="button"
                  variant="destructive"
                  onClick={abrirConfirmacion}
                >
                  {TEXTOS_MAESTROS.enlaces.revocar}
                  <Marca
                    plantilla={TEXTOS_MAESTROS.enlaces.ocultoDeFila.revocar}
                    creadoEn={enlace.creadoEn}
                  />
                </Button>
              )}
            </div>
            {/* T-09: la frase de consecuencia va antes de "Sí, revocar" en el orden de lectura
                (DESIGN.md §7.14), en la misma celda que los botones (no en una fila aparte, que
                los leería después). */}
            {confirmando && (
              <div className="flex flex-col gap-2">
                {revocar.isError && <MensajeError mensaje={mensajeDeErrorAdmin(revocar.error)} />}
                <p className="text-small">{TEXTOS_MAESTROS.enlaces.confirmarRevocar}</p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={handleRevocar}
                    enEspera={revocar.isPending}
                  >
                    {TEXTOS_MAESTROS.enlaces.siRevocar}
                    <Marca
                      plantilla={TEXTOS_MAESTROS.enlaces.ocultoDeFila.confirmarRevocacion}
                      creadoEn={enlace.creadoEn}
                    />
                  </Button>
                  <Button
                    ref={cancelarBtnRef}
                    type="button"
                    variant="outline"
                    onClick={cerrarConfirmacion}
                  >
                    {TEXTOS_MAESTROS.enlaces.cancelar}
                    <Marca
                      plantilla={TEXTOS_MAESTROS.enlaces.ocultoDeFila.cancelarRevocacion}
                      creadoEn={enlace.creadoEn}
                    />
                  </Button>
                </div>
              </div>
            )}
          </div>
        </TableCell>
      </TableRow>
      {expandido && (
        <TableRow>
          <TableCell colSpan={5}>
            <RegistradosDelEnlace
              enlaceId={enlace.id}
              creadoEnDelEnlace={enlace.creadoEn}
              destinoDelFocoRef={expandirBtnRef}
            />
          </TableCell>
        </TableRow>
      )}
    </>
  )
}

interface TablaEnlacesProps {
  onGenerarPrimero: () => void
}

// AUTH-03b, §D-B6: lista de enlaces de registro, con "Cargar más enlaces" al pie (P-02 A). ADMIN-01g:
// "Cargar más enlaces" con guarda síncrona, la espera de isFetching y cancelRefetch: false (E-07, fila 24
// de CHORE-04); al cargar la última página con el foco en el botón, el foco va a «Ver registrados» del
// primer enlace nuevo o, si no llegó ninguno, al de la primera fila, nunca a <body> (E-18). Ronda 1 (T-02):
// la raíz de la tabla (tabIndex -1) queda montada en todos los estados, así que si la página siguiente
// falla y el error reemplaza la tabla, el foco va a esa raíz. Un error con que apiClient redirige no se
// pinta (la página se va): se queda lo que había.
export function TablaEnlaces({ onGenerarPrimero }: TablaEnlacesProps) {
  const enlaces = useEnlacesRegistro()
  const tablaRef = useRef<HTMLDivElement>(null)
  const cargandoMasRef = useRef(false)
  // Ronda 1 (estado vecino de T-02): sin filas repetidas si una página siguiente repite un enlace (R-19).
  const filas = enlaces.data
    ? unirPaginasSinRepetidas(enlaces.data.pages.map((pagina) => pagina.enlaces))
    : undefined

  const enfocarVerRegistrados = (selector: string): boolean => {
    const boton = tablaRef.current?.querySelector<HTMLElement>(selector) ?? null
    boton?.focus()
    return boton !== null
  }

  const refCargarMas = useFocoAlCargarMas(
    filas?.map((enlace) => enlace.id),
    (id) => enfocarVerRegistrados(`[data-enlace-id="${id}"] button`),
    () => {
      if (enfocarVerRegistrados("[data-enlace-id] button")) return
      tablaRef.current?.focus()
    },
  )

  // Ronda 2 (T-05): si una recarga (o la página siguiente) cambia la lista y quita el control que tenía el
  // foco («Revocar», «Ver registrados», el de su fila abierta o los de una lista de registrados), el
  // foco va a la raíz de la tabla, nunca a <body>. Va después de useFocoAlCargarMas, que decide antes cuando
  // lo que desaparece es «Cargar más enlaces».
  useFocoAlPerderseElControl(tablaRef, claveDeFocoDeLaConsulta("enlaces-registro", enlaces))

  // Ronda 2 (T-06): la frase de error se cumple pulsando «Maestros» estando aquí (la lista en error se
  // vuelve a pedir desde la primera página; una sana, no) y yendo a otra sección y volviendo (en error se
  // marca vieja al desmontarse), como las demás tablas del módulo.
  useMarcarViejaSiQuedoEnError(CLAVE_ENLACES_REGISTRO)
  const volverAPedirSiFallo = useVolverAPedirSiFallo(CLAVE_ENLACES_REGISTRO)
  const enUnRouter = useInRouterContext()

  const cargarMas = () => {
    if (cargandoMasRef.current) return
    cargandoMasRef.current = true
    void enlaces.fetchNextPage({ cancelRefetch: false }).finally(() => {
      cargandoMasRef.current = false
    })
  }

  const contenido = (): ReactNode => {
    if (enlaces.isError && !errorQueRedirigeElCliente(enlaces.error)) {
      return <MensajeError mensaje={mensajeDeConsultaAdmin(enlaces.error)} />
    }

    if (enlaces.isLoading || !filas) {
      return <Cargando />
    }

    if (filas.length === 0) {
      return (
        <Card>
          <EstadoVacio
            titulo={TEXTOS_MAESTROS.enlaces.vacioListaTitulo}
            descripcion={TEXTOS_MAESTROS.enlaces.vacioListaDescripcion}
            accion={{
              texto: TEXTOS_MAESTROS.enlaces.generarElPrimero,
              onClick: onGenerarPrimero,
              variante: "outline",
            }}
          />
        </Card>
      )
    }

    return (
      <>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{TEXTOS_MAESTROS.enlaces.columnas.creado}</TableHead>
              <TableHead>{TEXTOS_MAESTROS.enlaces.columnas.vence}</TableHead>
              <TableHead>{TEXTOS_MAESTROS.enlaces.columnas.estado}</TableHead>
              <TableHead className="text-right">
                {TEXTOS_MAESTROS.enlaces.columnas.registrados}
              </TableHead>
              <TableHead>{TEXTOS_MAESTROS.enlaces.columnas.acciones}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filas.map((enlace) => (
              <FilaEnlace key={enlace.id} enlace={enlace} />
            ))}
          </TableBody>
        </Table>
        {enlaces.hasNextPage && (
          <Button
            ref={refCargarMas}
            type="button"
            variant="outline"
            onClick={cargarMas}
            enEspera={enlaces.isFetching}
          >
            {TEXTOS_MAESTROS.enlaces.cargarMasEnlaces}
          </Button>
        )}
      </>
    )
  }

  return (
    <div ref={tablaRef} tabIndex={-1} className="flex flex-col gap-3">
      {enUnRouter && <AlPulsarLaSeccionActiva alPulsar={volverAPedirSiFallo} />}
      {contenido()}
    </div>
  )
}
