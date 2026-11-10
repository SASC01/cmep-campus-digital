import { useEffect, useRef, useState, type ReactNode } from "react"

import { Cargando } from "@/components/cargando"
import { ErrorDeCampo } from "@/components/error-de-campo"
import { EstadoVacio } from "@/components/estado-vacio"
import { useFocoAlCargarMas, useFocoAlPerderseElControl } from "@/components/foco/hooks"
import { claveDeFocoDeLaConsulta, focoPerdido } from "@/components/foco/lib"
import { MensajeError } from "@/components/mensaje-error"
import { useAlPulsarLaSeccionActiva } from "@/components/seccion/hooks"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { esErrorDeCursor } from "@/lib/errores-de-api"
import { unirPaginasSinRepetidas } from "@/lib/unir-paginas"

import { BarraDeLote } from "./components/barra-de-lote"
import { DialogoEstadoPagoLote } from "./components/dialogo-estado-pago-lote"
import { DialogoRestringirAcceso } from "./components/dialogo-restringir-acceso"
import { TablaEstadoPago } from "./components/tabla-estado-pago"
import {
  claveTablaDeEstadoPago,
  ESPERA_BUSQUEDA_USUARIOS_MS,
  IDS_FILTROS_DE_ESTADO_PAGO,
  OPCIONES_FILTRO_DE_ESTADO_PAGO,
  TEXTOS_ESTADO_PAGO,
  TEXTOS_USUARIOS,
} from "./data"
import {
  useAlumnosEstadoPago,
  useMarcarViejaSiQuedoEnError,
  useValorDiferido,
  useVolverAPedirSiFallo,
} from "./hooks"
import {
  busquedaDeLaTabla,
  errorQueRedirigeElCliente,
  estadoDelFiltro,
  seleccionVigente,
} from "./lib"
import type {
  AccionVigente,
  DialogoDeEstadoPago,
  EstadoPago,
  FiltroDeEstadoPago,
  FocoPendienteDeEstadoPago,
  SeleccionDeAlumnos,
  UsuarioAdminFila,
} from "./types"

// ADMIN-01g (§D-11, RF-54, RF-55, DESIGN.md §7.9 y §7.17; Enmienda 15): /admin/estado-pago.
// - El buscador espera 300 ms y decide con el criterio del servidor (busquedaDeLaTabla); el filtro es un
//   NativeSelect. Siempre rol=estudiante. El término y el filtro viven en el estado de la vista.
// - Criterio de T-01: la vista guarda solo elecciones de la persona (la selección con el estado de cada
//   fila al elegirla, el diálogo abierto y su destino, la acción vigente). Lo que se pinta sale de la
//   consulta en cada render; la selección se recorta a la vigente en el render cuando la lista cambia.
// - Los diálogos (lote y restringir) los monta la vista: una recarga que falla no los desmonta; una que
//   saca la fila de restringir lo cierra. Con incluirDialogos, si un cambio de la consulta quita el
//   control que tenía el foco (también dentro de un diálogo), el foco va a la raíz, nunca a <body>.
// - Entre los mensajes de acción se ve a lo sumo uno, el de la acción vigente (M-23); los de carga de la
//   tabla siguen sus reglas.
// - Sin «Reintentar»: la frase de error o de lista cambiada se cumple pulsando «Estado de pago» estando
//   aquí, yendo a otra sección y regresando, con el historial, editando la búsqueda o cambiando el filtro
//   y volviendo (la clave que quedó en error se marca vieja al dejarla).
export function EstadoPagoView() {
  const [escrito, setEscrito] = useState("")
  const [filtro, setFiltro] = useState<FiltroDeEstadoPago>("todos")
  const [seleccion, setSeleccion] = useState<SeleccionDeAlumnos>({})
  const [dialogo, setDialogo] = useState<DialogoDeEstadoPago>(null)
  const [accionVigente, setAccionVigente] = useState<AccionVigente>(null)
  const diferido = useValorDiferido(escrito, ESPERA_BUSQUEDA_USUARIOS_MS)
  const busqueda = busquedaDeLaTabla(diferido)
  const estadoPago = estadoDelFiltro(filtro)
  const alumnos = useAlumnosEstadoPago(busqueda.q, estadoPago, !busqueda.vacioSinPedir)
  const clave = claveTablaDeEstadoPago(busqueda.q, estadoPago)
  const raizRef = useRef<HTMLDivElement>(null)
  const encabezadoRef = useRef<HTMLHeadingElement>(null)
  const tablaRef = useRef<HTMLDivElement>(null)
  const cargandoMasRef = useRef(false)
  const focoPendienteRef = useRef<FocoPendienteDeEstadoPago | null>(null)

  useMarcarViejaSiQuedoEnError(clave)
  const volverAPedirSiFallo = useVolverAPedirSiFallo(clave)
  // ADM-1G11 (a): pulsar «Estado de pago» con la tabla en error la vuelve a pedir desde la primera página,
  // y la selección se vacía (sus filas pueden haber cambiado).
  useAlPulsarLaSeccionActiva(() => {
    if (!alumnos.isError) return
    setSeleccion({})
    volverAPedirSiFallo()
  })

  const filas = alumnos.data
    ? unirPaginasSinRepetidas(alumnos.data.pages.map((pagina) => pagina.usuarios))
    : undefined

  // La selección guardada se recorta a la vigente en el render: una fila que cambió de estado o salió de
  // la lista no vuelve aunque regrese.
  const vigente = seleccionVigente(seleccion, filas)
  const idsVigentes = Object.keys(vigente)
  if (idsVigentes.length !== Object.keys(seleccion).length) setSeleccion(vigente)

  // El diálogo de restringir recibe la fila de la consulta en cada render (con la tabla en error, la
  // última que llegó) y se cierra si una recarga que respondió la saca de la lista.
  const filaARestringir =
    dialogo?.tipo === "restringir" ? filas?.find((fila) => fila.id === dialogo.alumnoId) : undefined
  if (dialogo?.tipo === "restringir" && filaARestringir === undefined) {
    setDialogo(null)
  }

  // El foco al cerrarse un diálogo: se decide después del render en que ya no está.
  useEffect(() => {
    const pendiente = focoPendienteRef.current
    if (pendiente === null) return
    const tabla = tablaRef.current
    if (pendiente.tipo === "lote") {
      focoPendienteRef.current = null
      if (!focoPerdido(document)) return
      const boton = tabla?.querySelector<HTMLElement>(`[data-destino="${pendiente.destino}"]`)
      if (boton) {
        boton.focus()
        return
      }
      encabezadoRef.current?.focus()
      return
    }
    const fila = filas?.find((candidata) => candidata.id === pendiente.alumnoId)
    // Con éxito, se espera a que la fila traiga la restricción (o a que salga, o a que la tabla falle).
    if (
      pendiente.exito &&
      fila !== undefined &&
      fila.accesoRestringido !== true &&
      !alumnos.isError
    ) {
      return
    }
    focoPendienteRef.current = null
    if (!focoPerdido(document)) return
    const boton =
      fila !== undefined && !alumnos.isError
        ? tabla?.querySelector<HTMLElement>(
            `[data-alumno-id="${pendiente.alumnoId}"] [data-accion="acceso"]`,
          )
        : null
    if (boton) {
      boton.focus()
      return
    }
    if (pendiente.exito && fila === undefined) {
      raizRef.current?.focus()
      return
    }
    encabezadoRef.current?.focus()
  })

  const refCargarMas = useFocoAlCargarMas(
    filas?.map((fila) => fila.id),
    (id) => {
      const casilla =
        tablaRef.current?.querySelector<HTMLElement>(`[data-alumno-id="${id}"] input`) ?? null
      casilla?.focus()
      return casilla !== null
    },
    () => encabezadoRef.current?.focus(),
  )

  // T-02: con incluirDialogos, un control de un diálogo de la vista también cuenta. Va después de los dos
  // de arriba, que deciden antes cuando hay un destino propio.
  useFocoAlPerderseElControl(raizRef, claveDeFocoDeLaConsulta(JSON.stringify(clave), alumnos), true)

  const elegirFiltro = (valor: string) => {
    const opcion = OPCIONES_FILTRO_DE_ESTADO_PAGO.find((candidata) => candidata.valor === valor)
    if (opcion === undefined) return
    setFiltro(opcion.valor)
    setSeleccion({})
  }

  const escribir = (valor: string) => {
    setEscrito(valor)
    setSeleccion({})
  }

  const seleccionar = (fila: UsuarioAdminFila, estado: EstadoPago, elegida: boolean) => {
    setSeleccion((anterior) => {
      const nueva: Record<string, EstadoPago> = { ...anterior }
      if (elegida) {
        nueva[fila.id] = estado
        return nueva
      }
      delete nueva[fila.id]
      return nueva
    })
  }

  const seleccionarTodas = (elegidas: boolean) => {
    if (!elegidas || filas === undefined) {
      setSeleccion({})
      return
    }
    const todas: Record<string, EstadoPago> = {}
    for (const fila of filas) {
      if (fila.estadoPago !== undefined) todas[fila.id] = fila.estadoPago
    }
    setSeleccion(todas)
  }

  const abrirLote = (destino: EstadoPago) => {
    setAccionVigente({ tipo: "dialogo" })
    setDialogo({ tipo: "lote", destino })
  }

  const abrirRestringir = (alumnoId: string) => {
    setAccionVigente({ tipo: "dialogo" })
    setDialogo({ tipo: "restringir", alumnoId })
  }

  const cerrarDialogo = (exito: boolean) => {
    if (dialogo?.tipo === "lote") {
      focoPendienteRef.current = { tipo: "lote", destino: dialogo.destino }
      if (exito) setSeleccion({})
    }
    if (dialogo?.tipo === "restringir") {
      focoPendienteRef.current = { tipo: "restringir", alumnoId: dialogo.alumnoId, exito }
    }
    setDialogo(null)
  }

  // CHORE-04: guarda síncrona; enEspera llega un render después.
  const cargarMas = () => {
    if (cargandoMasRef.current) return
    cargandoMasRef.current = true
    void alumnos.fetchNextPage({ cancelRefetch: false }).finally(() => {
      cargandoMasRef.current = false
    })
  }

  const vacio = (): string => {
    if (busqueda.q !== undefined) return TEXTOS_ESTADO_PAGO.vacios.busqueda
    if (estadoPago === "deudor") return TEXTOS_ESTADO_PAGO.vacios.deudores
    if (estadoPago === "al_corriente") return TEXTOS_ESTADO_PAGO.vacios.alCorriente
    return TEXTOS_ESTADO_PAGO.vacios.todos
  }

  // Estados en orden: vacío sin preguntar → error (lista cambiada u otro) → cargando → vacío → datos.
  const contenido = (): ReactNode => {
    if (busqueda.vacioSinPedir) return <EstadoVacio titulo={TEXTOS_ESTADO_PAGO.vacios.busqueda} />
    // ADM-1G20 (c): un error con que apiClient redirige (un 401 tras el refresco fallido) no se pinta: la
    // página se va. Se queda lo que había.
    const errorVisible = alumnos.isError && !errorQueRedirigeElCliente(alumnos.error)
    if (errorVisible && esErrorDeCursor(alumnos.error)) {
      return <MensajeError mensaje={TEXTOS_ESTADO_PAGO.cambioMientrasLaVeias} />
    }
    if (errorVisible) return <MensajeError mensaje={TEXTOS_ESTADO_PAGO.error} />
    if (alumnos.isLoading || !filas) return <Cargando />
    if (filas.length === 0) return <EstadoVacio titulo={vacio()} />
    return (
      <>
        {idsVigentes.length > 0 && (
          <BarraDeLote cuantos={idsVigentes.length} onMarcar={abrirLote} />
        )}
        <TablaEstadoPago
          filas={filas}
          seleccion={vigente}
          accionVigente={accionVigente}
          onSeleccionar={seleccionar}
          onSeleccionarTodas={seleccionarTodas}
          onAccion={(alumnoId, accion) => setAccionVigente({ tipo: "fila", alumnoId, accion })}
          onRestringir={abrirRestringir}
        />
        {alumnos.hasNextPage && (
          <Button
            ref={refCargarMas}
            type="button"
            variant="outline"
            onClick={cargarMas}
            enEspera={alumnos.isFetching}
            className="self-start"
          >
            {TEXTOS_ESTADO_PAGO.cargarMas}
          </Button>
        )}
      </>
    )
  }

  return (
    <div ref={raizRef} tabIndex={-1} className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <h1 ref={encabezadoRef} tabIndex={-1} className="text-h1">
            {TEXTOS_ESTADO_PAGO.titulo}
          </h1>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
            <div className="flex flex-1 flex-col gap-2">
              <Label htmlFor={IDS_FILTROS_DE_ESTADO_PAGO.campo}>{TEXTOS_USUARIOS.buscar}</Label>
              <Input
                id={IDS_FILTROS_DE_ESTADO_PAGO.campo}
                type="search"
                value={escrito}
                onChange={(evento) => escribir(evento.target.value)}
                autoComplete="off"
                spellCheck={false}
                aria-invalid={busqueda.largo}
                aria-describedby={
                  busqueda.largo
                    ? `${IDS_FILTROS_DE_ESTADO_PAGO.ayuda} ${IDS_FILTROS_DE_ESTADO_PAGO.error}`
                    : IDS_FILTROS_DE_ESTADO_PAGO.ayuda
                }
              />
              <p id={IDS_FILTROS_DE_ESTADO_PAGO.ayuda} className="text-small text-muted-foreground">
                {TEXTOS_USUARIOS.ayuda}
              </p>
              {busqueda.largo && (
                <ErrorDeCampo id={IDS_FILTROS_DE_ESTADO_PAGO.error}>
                  {TEXTOS_USUARIOS.muyLargo}
                </ErrorDeCampo>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor={IDS_FILTROS_DE_ESTADO_PAGO.filtro}>{TEXTOS_ESTADO_PAGO.filtro}</Label>
              <NativeSelect
                id={IDS_FILTROS_DE_ESTADO_PAGO.filtro}
                value={filtro}
                onChange={(evento) => elegirFiltro(evento.target.value)}
              >
                {OPCIONES_FILTRO_DE_ESTADO_PAGO.map((opcion) => (
                  <NativeSelectOption key={opcion.valor} value={opcion.valor}>
                    {opcion.texto}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </div>
          </div>
          <div ref={tablaRef} className="flex flex-col gap-4">
            {contenido()}
          </div>
        </CardContent>
      </Card>
      {dialogo?.tipo === "lote" && (
        <DialogoEstadoPagoLote
          destino={dialogo.destino}
          alumnoIds={idsVigentes}
          onCerrar={() => cerrarDialogo(false)}
          onHecho={() => cerrarDialogo(true)}
        />
      )}
      {filaARestringir !== undefined && (
        <DialogoRestringirAcceso
          cuenta={filaARestringir}
          onCerrar={() => cerrarDialogo(false)}
          onHecho={() => cerrarDialogo(true)}
        />
      )}
    </div>
  )
}
