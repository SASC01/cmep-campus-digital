import { useEffect, useRef, useState, type ReactNode } from "react"

import { Cargando } from "@/components/cargando"
import { ErrorDeCampo } from "@/components/error-de-campo"
import { EstadoVacio } from "@/components/estado-vacio"
import { useFocoAlCargarMas, useFocoAlPerderseElControl } from "@/components/foco/hooks"
import { claveDeFocoDeLaConsulta } from "@/components/foco/lib"
import { MensajeError } from "@/components/mensaje-error"
import { useAlPulsarLaSeccionActiva } from "@/components/seccion/hooks"
import { Button } from "@/components/ui/button"
import { Card, CardAction, CardContent, CardHeader } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { esErrorDeCursor } from "@/lib/errores-de-api"
import { unirPaginasSinRepetidas } from "@/lib/unir-paginas"

import { FormularioAltaAlumno } from "./components/formulario-alta-alumno"
import { TablaDeUsuarios } from "./components/tabla-de-usuarios"
import {
  claveTablaDeUsuarios,
  ESPERA_BUSQUEDA_USUARIOS_MS,
  IDS_FILTROS_DE_USUARIOS,
  OPCIONES_FILTRO_DE_ROL,
  TEXTOS_USUARIOS,
} from "./data"
import {
  useMarcarViejaSiQuedoEnError,
  useUsuariosAdmin,
  useValorDiferido,
  useVolverAPedirSiFallo,
} from "./hooks"
import { busquedaDeLaTabla, errorQueRedirigeElCliente, rolDelFiltro } from "./lib"
import type { FiltroDeRol } from "./types"

// ADMIN-01f (§D-11, RF-57, DESIGN.md §7.9 y §7.17): /admin/usuarios. El buscador espera 300 ms y decide
// con el criterio del servidor qué pide (busquedaDeLaTabla, Enmienda 14); el término y el rol viven en el
// estado de la vista, no en la URL. La tabla no tiene «Reintentar»: su frase de error se cumple pulsando
// «Usuarios» estando aquí, yendo a otra sección y regresando, con el historial, editando la búsqueda o
// cambiando el rol y volviendo (la clave que quedó en error se marca vieja al dejarla). «Dar de alta un
// alumno» es la única acción principal: abre el formulario en línea, que la sustituye mientras está
// abierto. "Cargar más usuarios" lleva el foco a la primera fila nueva o, sin ninguna, al encabezado.
export function UsuariosView() {
  const [escrito, setEscrito] = useState("")
  const [filtro, setFiltro] = useState<FiltroDeRol>("todos")
  const [conAlta, setConAlta] = useState(false)
  const diferido = useValorDiferido(escrito, ESPERA_BUSQUEDA_USUARIOS_MS)
  const busqueda = busquedaDeLaTabla(diferido)
  const rol = rolDelFiltro(filtro)
  const usuarios = useUsuariosAdmin(busqueda.q, rol, !busqueda.vacioSinPedir)
  const clave = claveTablaDeUsuarios(busqueda.q, rol)
  const raizRef = useRef<HTMLDivElement>(null)
  const encabezadoRef = useRef<HTMLHeadingElement>(null)
  const darDeAltaRef = useRef<HTMLButtonElement>(null)
  const cargandoMasRef = useRef(false)
  const conAltaAnteriorRef = useRef(conAlta)

  useMarcarViejaSiQuedoEnError(clave)
  useAlPulsarLaSeccionActiva(useVolverAPedirSiFallo(clave))

  // Al cerrar el alta, el foco vuelve a «Dar de alta un alumno», nunca a <body>.
  useEffect(() => {
    if (conAltaAnteriorRef.current === conAlta) return
    conAltaAnteriorRef.current = conAlta
    if (!conAlta) darDeAltaRef.current?.focus()
  }, [conAlta])

  const filas = usuarios.data
    ? unirPaginasSinRepetidas(usuarios.data.pages.map((pagina) => pagina.usuarios))
    : undefined
  const ids = filas?.map((fila) => fila.id)

  const refCargarMas = useFocoAlCargarMas(
    ids,
    (id) => {
      const ver = document.querySelector<HTMLElement>(`[data-usuario-id="${id}"] a`)
      ver?.focus()
      return ver !== null
    },
    () => encabezadoRef.current?.focus(),
  )

  // Corrección M-20 (hermano en la tabla): si otra clave (búsqueda o rol), un error o una recarga quitan
  // el control que tenía el foco (el «Ver» de una fila), el foco va a la raíz de la vista, nunca a <body>.
  // Va después de useFocoAlCargarMas, que decide antes cuando lo que desaparece es «Cargar más usuarios».
  useFocoAlPerderseElControl(raizRef, claveDeFocoDeLaConsulta(JSON.stringify(clave), usuarios))

  const elegirRol = (valor: string) => {
    const opcion = OPCIONES_FILTRO_DE_ROL.find((candidata) => candidata.valor === valor)
    if (opcion === undefined) return
    setFiltro(opcion.valor)
  }

  // CHORE-04: guarda síncrona; enEspera llega un render después.
  const cargarMas = () => {
    if (cargandoMasRef.current) return
    cargandoMasRef.current = true
    void usuarios.fetchNextPage({ cancelRefetch: false }).finally(() => {
      cargandoMasRef.current = false
    })
  }

  // Estados en orden: vacío sin preguntar → error (lista cambiada u otro) → cargando → vacío → datos.
  const contenido = (): ReactNode => {
    if (busqueda.vacioSinPedir) return <EstadoVacio titulo={TEXTOS_USUARIOS.vacioBusqueda} />
    // ADMIN-01g, ronda 1 (T-01, R-23, autorizado por el humano): un error con que apiClient redirige (un
    // 401 tras el refresco fallido) no se pinta: la página se va. Se queda lo que había.
    const errorVisible = usuarios.isError && !errorQueRedirigeElCliente(usuarios.error)
    if (errorVisible && esErrorDeCursor(usuarios.error)) {
      return <MensajeError mensaje={TEXTOS_USUARIOS.cambioMientrasLaVeias} />
    }
    if (errorVisible) return <MensajeError mensaje={TEXTOS_USUARIOS.error} />
    if (usuarios.isLoading || !filas) return <Cargando />
    if (filas.length === 0 && busqueda.q !== undefined) {
      return <EstadoVacio titulo={TEXTOS_USUARIOS.vacioBusqueda} />
    }
    if (filas.length === 0) return <EstadoVacio titulo={TEXTOS_USUARIOS.vacioRol} />
    return (
      <>
        <TablaDeUsuarios usuarios={filas} />
        {usuarios.hasNextPage && (
          <Button
            ref={refCargarMas}
            type="button"
            variant="outline"
            onClick={cargarMas}
            enEspera={usuarios.isFetching}
            className="self-start"
          >
            {TEXTOS_USUARIOS.cargarMas}
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
            {TEXTOS_USUARIOS.titulo}
          </h1>
          {!conAlta && (
            <CardAction>
              <Button
                ref={darDeAltaRef}
                type="button"
                variant="primary"
                onClick={() => setConAlta(true)}
              >
                {TEXTOS_USUARIOS.darDeAlta}
              </Button>
            </CardAction>
          )}
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {conAlta && <FormularioAltaAlumno onCerrar={() => setConAlta(false)} />}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
            <div className="flex flex-1 flex-col gap-2">
              <Label htmlFor={IDS_FILTROS_DE_USUARIOS.campo}>{TEXTOS_USUARIOS.buscar}</Label>
              <Input
                id={IDS_FILTROS_DE_USUARIOS.campo}
                type="search"
                value={escrito}
                onChange={(evento) => setEscrito(evento.target.value)}
                autoComplete="off"
                spellCheck={false}
                aria-invalid={busqueda.largo}
                aria-describedby={
                  busqueda.largo
                    ? `${IDS_FILTROS_DE_USUARIOS.ayuda} ${IDS_FILTROS_DE_USUARIOS.error}`
                    : IDS_FILTROS_DE_USUARIOS.ayuda
                }
              />
              <p id={IDS_FILTROS_DE_USUARIOS.ayuda} className="text-small text-muted-foreground">
                {TEXTOS_USUARIOS.ayuda}
              </p>
              {busqueda.largo && (
                <ErrorDeCampo id={IDS_FILTROS_DE_USUARIOS.error}>
                  {TEXTOS_USUARIOS.muyLargo}
                </ErrorDeCampo>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor={IDS_FILTROS_DE_USUARIOS.rol}>{TEXTOS_USUARIOS.rol}</Label>
              <NativeSelect
                id={IDS_FILTROS_DE_USUARIOS.rol}
                value={filtro}
                onChange={(evento) => elegirRol(evento.target.value)}
              >
                {OPCIONES_FILTRO_DE_ROL.map((opcion) => (
                  <NativeSelectOption key={opcion.valor} value={opcion.valor}>
                    {opcion.texto}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </div>
          </div>
          {contenido()}
        </CardContent>
      </Card>
    </div>
  )
}
