import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import type { ReactNode } from "react"
import { MemoryRouter, Route, Routes } from "react-router"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { establecerToken, limpiarToken } from "@/services/tokenAcceso"

import { AlumnosView } from "./alumnos-view"
import { CategoriasView } from "./categorias-view"
import { ClaseLayout } from "./clase-layout"
import { FormularioClase } from "./components/formulario-clase"
import { FormularioPublicacion } from "./components/formulario-publicacion"
import {
  TEXTOS_BUSCADOR_ALUMNOS,
  TEXTOS_BUSCADOR_MAESTROS,
  TEXTOS_FORMULARIO_CLASE,
  TEXTOS_FORMULARIO_PUBLICACION,
  TEXTOS_PERSONAS,
  TEXTOS_TABLA_ALUMNOS,
} from "./data"
import { EditarClaseView } from "./editar-clase-view"
import { MaestrosDeClaseView } from "./maestros-de-clase-view"
import { PersonasView } from "./personas-view"
import { TrabajoView } from "./trabajo-view"

// Tester, ronda 1 de CHORE-03 03b. Tres frentes, con el servidor como doble en memoria y el reloj fijo
// (las filas del roster y del muro pintan fechas):
// 1. O-15 y la regla de AGENTS.md ("un campo que el formulario no pinta"): en crear y editar clase y en
//    publicar un anuncio o un material, un 400 VALIDACION da exactamente un mensaje legible (un aviso o
//    un ErrorDeCampo, nunca los dos ni ninguno), lo escrito se conserva y el botón sale de la espera.
//    El error bajo los maestros usa useId(): se localiza por el grupo y su descripción accesible.
// 2. O-13: "Ver más alumnos" en "Personas" y en el roster con cursor:, limite: y vecinos: el genérico,
//    nunca el fragmento "no es válido" ni el texto de zod (cambio visible declarado, O-12).
// 3. Consultas de §D-4 con las rutas dobles del inventario (claseId: claseId:, tema: tema:, temaIds.0:
//    temaId:): el texto fijo de "sin acceso" o el genérico, nunca la ruta.

vi.mock("@/services/navegacion", () => ({ irA: vi.fn(), rutaActual: vi.fn(() => "/") }))
const aviso = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }))
vi.mock("sonner", () => ({ toast: aviso, Toaster: () => null }))

const AHORA = new Date("2030-01-10T12:00:00.000Z")
const GENERICO = "Algo salió mal. Inténtalo de nuevo."
const SIN_ACCESO = "No tienes acceso a esta clase."
const ID_INVALIDO = "debe ser un identificador válido"
const M = "Revisa este valor."
const CLASE_ID = "2a2b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d01"
const TEMA_ID = "7a7b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d31"
const CURSOR = "6a6b3c4d-1c1f-4b8e-9a1e-0000000000c1"
const RUTA_CLASE = `/api/clases/${CLASE_ID}`
const MAESTRO = { id: "3a3b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d09", nombre: "Luis Pérez" }

const respuestaJson = (estado: number, cuerpo: unknown) =>
  new Response(JSON.stringify(cuerpo), {
    status: estado,
    headers: { "Content-Type": "application/json" },
  })

const validacion = (mensaje: string) =>
  respuestaJson(400, { error: { codigo: "VALIDACION", mensaje } })

interface Llamada {
  metodo: string
  url: string
}

const ME = (rol: string) => ({
  id: "5a5d7a3e-1c1f-4b8e-9a1e-0f2a3b4c5d6e",
  nombre: "Ana Ruiz",
  email: "ana@ejemplo.mx",
  rol,
  debeCambiarContrasena: false,
  accesoRestringido: false,
})

const alumno = (n: number) => ({
  id: `4a4b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d${String(10 + n)}`,
  nombre: `Alumno ${String(n)}`,
  email: `alumno${String(n)}@x.mx`,
  estadoPago: "al_corriente",
  accesoRestringido: false,
  origen: "codigo",
  inscritoEn: "2030-01-02T15:00:00.000Z",
})

const respuestaNormal = ({ metodo, url }: Llamada, rol: string): Response | null => {
  const { pathname } = new URL(url, "http://local")
  if (pathname === "/api/me") return respuestaJson(200, ME(rol))
  if (metodo !== "GET") return null
  if (pathname === "/api/admin/maestros/candidatos") {
    return respuestaJson(200, {
      candidatos: [{ id: MAESTRO.id, nombre: MAESTRO.nombre, email: "luis@x.mx" }],
      hayMas: false,
    })
  }
  if (pathname === RUTA_CLASE) {
    return respuestaJson(200, {
      clase: {
        id: CLASE_ID,
        nombre: "Álgebra I",
        descripcion: null,
        maestro: MAESTRO,
        maestros: [MAESTRO],
      },
    })
  }
  if (pathname === `${RUTA_CLASE}/codigo`) return respuestaJson(200, { codigo: "ABCD234" })
  if (pathname === `${RUTA_CLASE}/categorias`) return respuestaJson(200, { categorias: [] })
  if (pathname === `${RUTA_CLASE}/temas`) {
    return respuestaJson(200, {
      temas: [{ id: TEMA_ID, nombre: "Unidad 1", orden: 0, elementos: 1 }],
      sinTema: 0,
    })
  }
  if (pathname === `${RUTA_CLASE}/trabajo`) {
    return respuestaJson(200, { elementos: [], siguienteCursor: null })
  }
  if (pathname === `${RUTA_CLASE}/personas`) {
    return respuestaJson(200, {
      maestro: { ...MAESTRO, email: "luis@x.mx" },
      maestros: [{ ...MAESTRO, email: "luis@x.mx" }],
      alumnos: [{ id: alumno(1).id, nombre: "Alumno 1", email: "a@x.mx" }],
      totalAlumnos: 2,
      siguienteCursor: CURSOR,
    })
  }
  if (pathname === `${RUTA_CLASE}/alumnos`) {
    return respuestaJson(200, { alumnos: [alumno(1)], total: 2, siguienteCursor: CURSOR })
  }
  if (pathname.endsWith("/candidatos")) return respuestaJson(200, { candidatos: [], hayMas: false })
  if (pathname === `${RUTA_CLASE}/publicaciones`) {
    return respuestaJson(200, { publicaciones: [], siguienteCursor: null })
  }
  return null
}

let falla: (llamada: Llamada) => boolean = () => false
let mensajeDeFalla = M
let rolDeSesion = "admin"
let llamadas: Llamada[] = []
let fallidas: Llamada[] = []
let inesperadas: string[] = []

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] })
  vi.setSystemTime(AHORA)
  establecerToken("token-de-prueba")
  falla = () => false
  mensajeDeFalla = M
  rolDeSesion = "admin"
  llamadas = []
  fallidas = []
  inesperadas = []
  vi.stubGlobal(
    "fetch",
    vi.fn<typeof fetch>((entrada, init) => {
      const llamada = { metodo: init?.method ?? "GET", url: String(entrada) }
      llamadas.push(llamada)
      if (falla(llamada)) {
        fallidas.push(llamada)
        return Promise.resolve(validacion(mensajeDeFalla))
      }
      const normal = respuestaNormal(llamada, rolDeSesion)
      if (normal !== null) return Promise.resolve(normal)
      inesperadas.push(`${llamada.metodo} ${llamada.url}`)
      return Promise.resolve(
        respuestaJson(500, { error: { codigo: "ERROR_INTERNO", mensaje: "no esperada" } }),
      )
    }),
  )
})

afterEach(() => {
  cleanup()
  limpiarToken()
  vi.unstubAllGlobals()
  vi.useRealTimers()
  aviso.success.mockClear()
  aviso.error.mockClear()
})

const reposar = async () => {
  await act(async () => {
    for (let i = 0; i < 6; i += 1) await new Promise((r) => setTimeout(r, 0))
  })
}

// La única función de montaje: el elemento en su ruta, con un cliente sin reintentos.
const montar = async (ruta: string, patron: string, elemento: ReactNode) => {
  const cliente = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  render(
    <QueryClientProvider client={cliente}>
      <MemoryRouter initialEntries={[ruta]}>
        <Routes>
          <Route path={patron} element={elemento} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
  await reposar()
  return cliente
}

const asentar = async (cliente: QueryClient) => {
  await waitFor(() => expect(cliente.isFetching() + cliente.isMutating()).toBe(0))
  await reposar()
}

const escribir = (etiqueta: string, valor: string): void => {
  fireEvent.change(screen.getByLabelText(etiqueta), { target: { value: valor } })
}

const avisos = () => aviso.error.mock.calls.map((llamada) => String(llamada[0]))

// ---------------------------------------------------------------------------------------------------
// 1. O-15 y los campos que el formulario no pinta.

type Donde = "aviso" | "campo" | "cualquiera"

interface Formulario {
  nombre: string
  ruta: string
  patron: string
  elemento: () => ReactNode
  llenar: () => Promise<void>
  boton: () => HTMLElement
  envio: (llamada: Llamada) => boolean
  conservado: () => void
}

const es = (metodo: string, ruta: string) => (llamada: Llamada) =>
  llamada.metodo === metodo && new URL(llamada.url, "http://local").pathname === ruta

const CREAR_CLASE: Formulario = {
  nombre: "crear clase",
  ruta: "/admin/clases/nueva",
  patron: "/admin/clases/nueva",
  elemento: () => <FormularioClase modo="crear" />,
  llenar: async () => {
    escribir(TEXTOS_FORMULARIO_CLASE.campoNombre, "Álgebra")
    escribir(TEXTOS_BUSCADOR_MAESTROS.campo, "Luis")
    fireEvent.click(await screen.findByRole("button", { name: "Elegir Luis Pérez" }))
  },
  boton: () => screen.getByRole("button", { name: TEXTOS_FORMULARIO_CLASE.botonCrear }),
  envio: es("POST", "/api/admin/clases"),
  conservado: () =>
    expect(screen.getByLabelText(TEXTOS_FORMULARIO_CLASE.campoNombre)).toHaveValue("Álgebra"),
}

const EDITAR_CLASE: Formulario = {
  nombre: "editar clase",
  ruta: `/admin/clases/${CLASE_ID}/editar`,
  patron: "/admin/clases/:claseId/editar",
  elemento: () => (
    <FormularioClase
      modo="editar"
      claseId={CLASE_ID}
      valoresIniciales={{ nombre: "Álgebra", descripcion: null }}
    />
  ),
  llenar: async () => escribir(TEXTOS_FORMULARIO_CLASE.campoNombre, "Álgebra II"),
  boton: () => screen.getByRole("button", { name: TEXTOS_FORMULARIO_CLASE.botonGuardar }),
  envio: es("PUT", `/api/admin/clases/${CLASE_ID}`),
  conservado: () =>
    expect(screen.getByLabelText(TEXTOS_FORMULARIO_CLASE.campoNombre)).toHaveValue("Álgebra II"),
}

const ANUNCIO: Formulario = {
  nombre: "publicar un anuncio",
  ruta: `/maestro/clases/${CLASE_ID}`,
  patron: "/maestro/clases/:claseId",
  elemento: () => <FormularioPublicacion claseId={CLASE_ID} />,
  llenar: async () => escribir(TEXTOS_FORMULARIO_PUBLICACION.campoAnuncio, "Mañana hay examen"),
  boton: () => screen.getByRole("button", { name: TEXTOS_FORMULARIO_PUBLICACION.publicarAnuncio }),
  envio: es("POST", `${RUTA_CLASE}/publicaciones`),
  conservado: () =>
    expect(screen.getByLabelText(TEXTOS_FORMULARIO_PUBLICACION.campoAnuncio)).toHaveValue(
      "Mañana hay examen",
    ),
}

const MATERIAL: Formulario = {
  nombre: "publicar un material",
  ruta: `/maestro/clases/${CLASE_ID}`,
  patron: "/maestro/clases/:claseId",
  elemento: () => <FormularioPublicacion claseId={CLASE_ID} />,
  llenar: async () => {
    fireEvent.click(screen.getByRole("button", { name: TEXTOS_FORMULARIO_PUBLICACION.material }))
    escribir(TEXTOS_FORMULARIO_PUBLICACION.campoTitulo, "Lectura")
    escribir(TEXTOS_FORMULARIO_PUBLICACION.campoDescripcion, "Capítulo 3")
    await waitFor(() => expect(llamadas.some(es("GET", `${RUTA_CLASE}/temas`))).toBe(true))
  },
  boton: () => screen.getByRole("button", { name: TEXTOS_FORMULARIO_PUBLICACION.publicarMaterial }),
  envio: es("POST", `${RUTA_CLASE}/publicaciones`),
  conservado: () => {
    expect(screen.getByLabelText(TEXTOS_FORMULARIO_PUBLICACION.campoTitulo)).toHaveValue("Lectura")
    expect(screen.getByLabelText(TEXTOS_FORMULARIO_PUBLICACION.campoDescripcion)).toHaveValue(
      "Capítulo 3",
    )
  },
}

const grupoDeMaestros = () => screen.getByRole("group", { name: TEXTOS_BUSCADOR_MAESTROS.grupo })
const campoTitulo = () => screen.getByLabelText(TEXTOS_FORMULARIO_PUBLICACION.campoTitulo)

interface CasoDeFormulario {
  formulario: Formulario
  mensaje: string
  esperado: string
  donde: Donde
  // El control cuya descripción accesible debe ser el error, si el error va en un campo.
  control?: () => HTMLElement
}

const RESTOS = ["", "\u{00A0}\u{200B}\n", "\u0085", "\u{3000}\u{2060}"] as const

const CASOS_DE_FORMULARIO: readonly CasoDeFormulario[] = [
  // Crear clase: el selector de maestros pinta maestroIds.
  {
    formulario: CREAR_CLASE,
    mensaje: `maestroIds: ${M}`,
    esperado: M,
    donde: "campo",
    control: grupoDeMaestros,
  },
  {
    formulario: CREAR_CLASE,
    mensaje: `maestroIds: maestroId: ${M}`,
    esperado: M,
    donde: "campo",
    control: grupoDeMaestros,
  },
  ...RESTOS.map((resto) => ({
    formulario: CREAR_CLASE,
    mensaje: `maestroIds:${resto}`,
    esperado: GENERICO,
    donde: "campo" as const,
    control: grupoDeMaestros,
  })),
  {
    formulario: CREAR_CLASE,
    mensaje: `maestroIds.0: maestroId: ${ID_INVALIDO}`,
    esperado: ID_INVALIDO,
    donde: "aviso",
  },
  {
    formulario: CREAR_CLASE,
    mensaje: `maestroIds.1:maestroId:\t${ID_INVALIDO}`,
    esperado: ID_INVALIDO,
    donde: "aviso",
  },
  {
    formulario: CREAR_CLASE,
    mensaje: "maestroIds.0: maestroId:\u{200B}",
    esperado: GENERICO,
    donde: "aviso",
  },
  // Editar clase: el selector de maestros no se pinta; el formulario sigue aceptando maestroIds.
  { formulario: EDITAR_CLASE, mensaje: `maestroIds: ${M}`, esperado: M, donde: "cualquiera" },
  {
    formulario: EDITAR_CLASE,
    mensaje: "maestroIds:\u{200B}",
    esperado: GENERICO,
    donde: "cualquiera",
  },
  {
    formulario: EDITAR_CLASE,
    mensaje: `maestroIds.0: maestroId: ${ID_INVALIDO}`,
    esperado: ID_INVALIDO,
    donde: "aviso",
  },
  {
    formulario: EDITAR_CLASE,
    mensaje: `descripcion: ${M}`,
    esperado: M,
    donde: "campo",
    control: () => screen.getByLabelText(TEXTOS_FORMULARIO_CLASE.campoDescripcion),
  },
  // Anuncio: el campo del título no se pinta; el formulario y su gancho siguen aceptando titulo.
  { formulario: ANUNCIO, mensaje: `titulo: ${M}`, esperado: M, donde: "cualquiera" },
  { formulario: ANUNCIO, mensaje: "titulo:\u{00A0}", esperado: GENERICO, donde: "cualquiera" },
  {
    formulario: ANUNCIO,
    mensaje: `temaId: temaId: ${ID_INVALIDO}`,
    esperado: ID_INVALIDO,
    donde: "aviso",
  },
  // Material: el título sí se pinta.
  {
    formulario: MATERIAL,
    mensaje: `titulo: ${M}`,
    esperado: M,
    donde: "campo",
    control: campoTitulo,
  },
  {
    formulario: MATERIAL,
    mensaje: "titulo:\u{200B}\n",
    esperado: GENERICO,
    donde: "campo",
    control: campoTitulo,
  },
  {
    formulario: MATERIAL,
    mensaje: `temaId: temaId: ${ID_INVALIDO}`,
    esperado: ID_INVALIDO,
    donde: "aviso",
  },
]

const casosNombrados = CASOS_DE_FORMULARIO.map((caso) => ({
  ...caso,
  titulo: `${caso.formulario.nombre} con «${caso.mensaje.replace(/[^\x20-\x7EÀ-ſ]/gu, "·")}»`,
}))

describe("ataque CHORE-03 03b r1 · un solo mensaje legible en los formularios (O-15 y campos no pintados)", () => {
  it.each(casosNombrados.map((caso) => [caso.titulo, caso.donde, caso] as const))(
    "%s da exactamente un mensaje legible (%s), sin ruta; lo escrito se conserva y el botón sale de la espera",
    async (_titulo, _donde, { formulario, mensaje, esperado, donde, control }) => {
      rolDeSesion = formulario === ANUNCIO || formulario === MATERIAL ? "maestro" : "admin"
      falla = formulario.envio
      mensajeDeFalla = mensaje
      const cliente = await montar(formulario.ruta, formulario.patron, formulario.elemento())
      await formulario.llenar()
      await asentar(cliente)

      fireEvent.click(formulario.boton())
      await waitFor(() => expect(fallidas).toHaveLength(1))
      await asentar(cliente)

      const enPantalla = screen.queryAllByText(esperado)
      const total = avisos().length + enPantalla.length
      expect(
        total,
        `avisos: ${JSON.stringify(avisos())}; textos en pantalla: ${String(enPantalla.length)}`,
      ).toBe(1)
      for (const texto of avisos()) expect(texto).toBe(esperado)
      if (donde === "aviso") expect(avisos()).toEqual([esperado])
      if (donde === "campo") {
        expect(avisos()).toEqual([])
        expect(control?.()).toHaveAccessibleDescription(esperado)
      }
      const visible = document.body.textContent ?? ""
      for (const ruta of ["maestroIds", "maestroId:", "titulo:", "temaId:", "descripcion:"]) {
        expect(visible).not.toContain(ruta)
      }
      formulario.conservado()
      expect(formulario.boton()).not.toHaveAttribute("aria-busy", "true")
      expect(formulario.boton()).not.toHaveAttribute("aria-disabled", "true")
      expect(inesperadas).toEqual([])
    },
  )
})

// ---------------------------------------------------------------------------------------------------
// 2. O-13: "Ver más alumnos" en "Personas" y en el roster.

const conCursor = (llamada: Llamada) => llamada.url.includes(`cursor=${CURSOR}`)
const enRuta =
  (ruta: string) =>
  ({ metodo, url }: Llamada) =>
    metodo === "GET" && new URL(url, "http://local").pathname === ruta

interface VerMas {
  nombre: string
  rol: string
  ruta: string
  patron: string
  elemento: ReactNode
  falla: (llamada: Llamada) => boolean
  boton: string
}

const VER_MAS: readonly VerMas[] = [
  {
    nombre: "«Personas»",
    rol: "estudiante",
    ruta: `/estudiante/clases/${CLASE_ID}/personas`,
    patron: "/estudiante/clases/:claseId/personas",
    elemento: <PersonasView />,
    falla: (llamada) => enRuta(`${RUTA_CLASE}/personas`)(llamada) && conCursor(llamada),
    boton: TEXTOS_PERSONAS.verMas,
  },
  {
    nombre: "el roster",
    rol: "maestro",
    ruta: `/maestro/clases/${CLASE_ID}/alumnos`,
    patron: "/maestro/clases/:claseId/alumnos",
    elemento: <AlumnosView />,
    falla: (llamada) => enRuta(`${RUTA_CLASE}/alumnos`)(llamada) && conCursor(llamada),
    boton: TEXTOS_TABLA_ALUMNOS.verMas,
  },
]

const MENSAJES_DE_VER_MAS: readonly [string, string][] = [
  ["cursor: no es válido", "cursor"],
  ["cursor:", "cursor vacío"],
  ["cursor:\u{200B}", "cursor invisible"],
  ["cursor.0: no es válido", "cursor con índice"],
  ["Cursor: no es válido", "Cursor con mayúscula"],
  ["limite: Too big: expected number to be <=50", "limite"],
  ["limite:\u{00A0}", "limite invisible"],
]

const casosDeVerMas = VER_MAS.flatMap((vista) =>
  MENSAJES_DE_VER_MAS.map(([mensaje, etiqueta]) => ({ vista, mensaje, etiqueta })),
)

describe("ataque CHORE-03 03b r1 · «Ver más alumnos» con un VALIDACION (O-13)", () => {
  it.each(casosDeVerMas)(
    "$vista.nombre con $etiqueta: el genérico, nunca el fragmento ni el texto de zod",
    async ({ vista, mensaje }) => {
      rolDeSesion = vista.rol
      falla = vista.falla
      mensajeDeFalla = mensaje
      const cliente = await montar(vista.ruta, vista.patron, vista.elemento)
      await asentar(cliente)
      fireEvent.click(await screen.findByRole("button", { name: vista.boton }))
      await waitFor(() => expect(fallidas).toHaveLength(1))
      await asentar(cliente)

      expect(await screen.findByText(GENERICO)).toBeInTheDocument()
      expect(screen.getAllByText(GENERICO)).toHaveLength(1)
      const visible = document.body.textContent ?? ""
      for (const fragmento of ["no es válido", "cursor", "Cursor", "limite", "Too big"]) {
        expect(visible).not.toContain(fragmento)
      }
      expect(avisos()).toEqual([])
      expect(inesperadas).toEqual([])
    },
  )
})

// ---------------------------------------------------------------------------------------------------
// 3. Consultas de §D-4 con las rutas dobles del inventario.

interface Consulta {
  nombre: string
  rol: string
  ruta: string
  patron: string
  elemento: ReactNode
  falla: (llamada: Llamada) => boolean
  accionar: () => Promise<void>
}

const nada = async () => undefined

const CONSULTAS: readonly Consulta[] = [
  {
    nombre: "las categorías",
    rol: "maestro",
    ruta: `/maestro/clases/${CLASE_ID}/categorias`,
    patron: "/maestro/clases/:claseId/categorias",
    elemento: <CategoriasView />,
    falla: enRuta(`${RUTA_CLASE}/categorias`),
    accionar: nada,
  },
  {
    nombre: "la clase en el marco",
    rol: "maestro",
    ruta: `/maestro/clases/${CLASE_ID}`,
    patron: "/maestro/clases/:claseId",
    elemento: <ClaseLayout />,
    falla: enRuta(RUTA_CLASE),
    accionar: nada,
  },
  {
    nombre: "el código en el marco",
    rol: "maestro",
    ruta: `/maestro/clases/${CLASE_ID}`,
    patron: "/maestro/clases/:claseId",
    elemento: <ClaseLayout />,
    falla: enRuta(`${RUTA_CLASE}/codigo`),
    accionar: nada,
  },
  {
    nombre: "«Editar clase»",
    rol: "admin",
    ruta: `/admin/clases/${CLASE_ID}/editar`,
    patron: "/admin/clases/:claseId/editar",
    elemento: <EditarClaseView />,
    falla: enRuta(RUTA_CLASE),
    accionar: nada,
  },
  {
    nombre: "«Maestros» de la clase",
    rol: "admin",
    ruta: `/admin/clases/${CLASE_ID}/maestros`,
    patron: "/admin/clases/:claseId/maestros",
    elemento: <MaestrosDeClaseView />,
    falla: enRuta(RUTA_CLASE),
    accionar: nada,
  },
  {
    nombre: "los temas de «Trabajo de clase»",
    rol: "maestro",
    ruta: `/maestro/clases/${CLASE_ID}/trabajo`,
    patron: "/maestro/clases/:claseId/trabajo",
    elemento: <TrabajoView />,
    falla: enRuta(`${RUTA_CLASE}/temas`),
    accionar: nada,
  },
  {
    nombre: "la sección de un tema en «Trabajo de clase»",
    rol: "maestro",
    ruta: `/maestro/clases/${CLASE_ID}/trabajo`,
    patron: "/maestro/clases/:claseId/trabajo",
    elemento: <TrabajoView />,
    falla: enRuta(`${RUTA_CLASE}/trabajo`),
    accionar: nada,
  },
  {
    nombre: "«Personas»",
    rol: "estudiante",
    ruta: `/estudiante/clases/${CLASE_ID}/personas`,
    patron: "/estudiante/clases/:claseId/personas",
    elemento: <PersonasView />,
    falla: enRuta(`${RUTA_CLASE}/personas`),
    accionar: nada,
  },
  {
    nombre: "el roster",
    rol: "maestro",
    ruta: `/maestro/clases/${CLASE_ID}/alumnos`,
    patron: "/maestro/clases/:claseId/alumnos",
    elemento: <AlumnosView />,
    falla: enRuta(`${RUTA_CLASE}/alumnos`),
    accionar: nada,
  },
  {
    nombre: "el buscador de alumnos",
    rol: "maestro",
    ruta: `/maestro/clases/${CLASE_ID}/alumnos`,
    patron: "/maestro/clases/:claseId/alumnos",
    elemento: <AlumnosView />,
    falla: enRuta(`${RUTA_CLASE}/alumnos/candidatos`),
    accionar: async () => {
      fireEvent.change(await screen.findByLabelText(TEXTOS_BUSCADOR_ALUMNOS.campo), {
        target: { value: "Ana" },
      })
    },
  },
  {
    nombre: "el buscador de maestros",
    rol: "admin",
    ruta: "/admin/clases/nueva",
    patron: "/admin/clases/nueva",
    elemento: <FormularioClase modo="crear" />,
    falla: enRuta("/api/admin/maestros/candidatos"),
    accionar: async () => {
      fireEvent.change(await screen.findByLabelText(TEXTOS_BUSCADOR_MAESTROS.campo), {
        target: { value: "Luis" },
      })
    },
  },
]

const MENSAJES_DE_CONSULTA: readonly [string, string, string][] = [
  [`claseId: claseId: ${ID_INVALIDO}`, "claseId doble", SIN_ACCESO],
  ["claseId:\u{00A0}\u{200B}\n", "claseId sin texto visible", SIN_ACCESO],
  ["tema: tema: elige un tema válido", "tema doble", GENERICO],
  [`temaIds.0: temaId: ${ID_INVALIDO}`, "temaIds con temaId", GENERICO],
  [`pa\u{0301}rametro: ${M}`, "parámetro con marca combinante", GENERICO],
]

const casosDeConsulta = CONSULTAS.flatMap((consulta) =>
  MENSAJES_DE_CONSULTA.map(([mensaje, etiqueta, esperado]) => ({
    consulta,
    mensaje,
    etiqueta,
    esperado,
  })),
)

describe("ataque CHORE-03 03b r1 · consultas de clases con las rutas dobles del inventario", () => {
  it.each(casosDeConsulta)(
    "$consulta.nombre con $etiqueta da «$esperado», nunca la ruta ni el texto del servidor",
    async ({ consulta, mensaje, esperado }) => {
      rolDeSesion = consulta.rol
      falla = consulta.falla
      mensajeDeFalla = mensaje
      const cliente = await montar(consulta.ruta, consulta.patron, consulta.elemento)
      await consulta.accionar()
      await waitFor(() => expect(fallidas.length).toBeGreaterThan(0))
      await asentar(cliente)

      expect((await screen.findAllByText(esperado)).length).toBeGreaterThan(0)
      const visible = document.body.textContent ?? ""
      for (const fragmento of [
        "claseId",
        "temaId",
        "tema:",
        "elige un tema",
        "identificador",
        "rametro",
        M,
      ]) {
        expect(visible).not.toContain(fragmento)
      }
      expect(inesperadas).toEqual([])
    },
  )
})
