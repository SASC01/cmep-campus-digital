import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import type { ReactNode } from "react"
import { createMemoryRouter, MemoryRouter, Route, RouterProvider, Routes } from "react-router"
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"

import { ENTRADAS_DE_FORMULARIO, MENSAJE_DE_PRUEBA } from "@/lib/errores-de-api-fuera-de-contrato"
import { establecerToken, limpiarToken } from "@/services/tokenAcceso"

import { FormularioCambiarContrasena } from "./components/formulario-cambiar-contrasena"
import { FormularioLogin } from "./components/formulario-login"
import { FormularioNuevaContrasena } from "./components/formulario-nueva-contrasena"
import { FormularioRecuperar } from "./components/formulario-recuperar"
import { FormularioRegistro } from "./components/formulario-registro"
import { FormularioRegistroMaestro } from "./components/formulario-registro-maestro"
import {
  MENSAJE_ERROR_AUTH_GENERICO,
  MENSAJES_ERROR_AUTH,
  RUTA_POR_ROL,
  TEXTOS_LOGIN,
  TEXTOS_NUEVA_CONTRASENA,
  TEXTOS_RECUPERAR,
  TEXTOS_REGISTRO,
  TEXTOS_REGISTRO_MAESTRO,
} from "./data"

// CHORE-04 (§D-1, §D-2; filas 12 a 18 y 23): guardas de doble clic de los formularios de
// features/auth, de «Cerrar sesión» del marco por rol, de "Acceso restringido" y del cambio
// obligatorio. "El mismo render" es dos eventos dentro de un solo act (plan, "Pruebas requeridas").
// El servidor es un doble de fetch que cuenta las peticiones por método y ruta.

vi.mock("@/services/navegacion", () => ({ irA: vi.fn(), rutaActual: vi.fn(() => "/") }))
const aviso = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }))
vi.mock("sonner", () => ({ toast: aviso, Toaster: () => null }))

const TOKEN = "C".repeat(43)
const CLAVE = "clave-secreta-1234"
const CORTA = "corta1"

type Respuesta = () => Response | Promise<Response>

interface Llamada {
  metodo: string
  ruta: string
}

const respuestaJson = (estado: number, cuerpo: unknown) =>
  new Response(JSON.stringify(cuerpo), {
    status: estado,
    headers: { "Content-Type": "application/json" },
  })

const sinContenido = () => new Response(null, { status: 204 })

const errorApi = (estado: number, codigo: string, mensaje = "mensaje del servidor") =>
  respuestaJson(estado, { error: { codigo, mensaje } })

const error500 = () => errorApi(500, "ERROR_INTERNO")
const errorDeRed = () => Promise.reject(new TypeError("Failed to fetch"))

const meDe = (extra: Record<string, unknown>) => ({
  id: "5a5d7a3e-1c1f-4b8e-9a1e-0f2a3b4c5d6e",
  nombre: "Ana López",
  email: "ana@colegio.mx",
  rol: "maestro",
  debeCambiarContrasena: false,
  accesoRestringido: false,
  ...extra,
})

let colas = new Map<string, Respuesta[]>()
let llamadas: Llamada[] = []
let me: Respuesta = () => respuestaJson(200, meDe({}))

const preparar = (clave: string, ...respuestas: Respuesta[]) => {
  const cola = colas.get(clave)
  if (cola === undefined) {
    colas.set(clave, [...respuestas])
    return
  }
  cola.push(...respuestas)
}

const peticiones = (clave: string) =>
  llamadas.filter((llamada) => `${llamada.metodo} ${llamada.ruta}` === clave).length

// Una respuesta que la prueba suelta cuando quiere.
const retenida = () => {
  const pendientes: ((respuesta: Response) => void)[] = []
  const respuesta: Respuesta = () =>
    new Promise<Response>((resolver) => {
      pendientes.push(resolver)
    })
  const soltar = async (valor: Response) => {
    const resolver = pendientes.shift()
    if (resolver === undefined) throw new Error("Precondición: la petición retenida ya salió")
    await act(async () => {
      resolver(valor)
      await Promise.resolve()
    })
  }
  return { respuesta, soltar }
}

beforeAll(async () => {
  await import("@/app/router")
}, 60_000)

beforeEach(() => {
  establecerToken("token-de-prueba")
  colas = new Map()
  llamadas = []
  me = () => respuestaJson(200, meDe({}))
  vi.stubGlobal(
    "fetch",
    vi.fn<typeof fetch>((entrada, init) => {
      const llamada = { metodo: init?.method ?? "GET", ruta: String(entrada) }
      llamadas.push(llamada)
      const cola = colas.get(`${llamada.metodo} ${llamada.ruta}`)
      const siguiente = cola?.shift()
      if (siguiente !== undefined) return Promise.resolve().then(siguiente)
      if (llamada.ruta === "/api/me") return Promise.resolve(me())
      if (llamada.ruta === "/api/auth/refrescar") {
        return Promise.resolve(respuestaJson(200, { tokenAcceso: "token-de-prueba" }))
      }
      if (llamada.ruta === "/api/auth/invitacion") {
        return Promise.resolve(respuestaJson(200, { nombre: "Ana López" }))
      }
      if (llamada.ruta === "/api/auth/logout") return Promise.resolve(sinContenido())
      return Promise.resolve(error500())
    }),
  )
})

afterEach(() => {
  cleanup()
  limpiarToken()
  vi.unstubAllGlobals()
  aviso.success.mockClear()
  aviso.error.mockClear()
})

type Campos = readonly (readonly [string, string])[]

interface Formulario {
  elemento: () => ReactNode
  clave: string
  boton: string
  campos: Campos
  // Un rechazo de la validación local y lo que lo provoca.
  rechazoLocal: Campos
  exito: () => Response
  destino: () => Promise<void>
}

function Destino() {
  return <p>destino alcanzado</p>
}

const llegaAlDestino = async () => {
  expect(await screen.findByText("destino alcanzado")).toBeInTheDocument()
}

const FORMULARIOS: Readonly<Record<string, Formulario>> = {
  login: {
    elemento: () => <FormularioLogin />,
    clave: "POST /api/auth/login",
    boton: "Iniciar sesión",
    campos: [
      ["Correo", "ana@colegio.mx"],
      ["Contraseña", CLAVE],
    ],
    rechazoLocal: [["Correo", "ana-sin-arroba"]],
    exito: () => respuestaJson(200, { tokenAcceso: "token-nuevo" }),
    destino: llegaAlDestino,
  },
  "registro de estudiante": {
    elemento: () => <FormularioRegistro />,
    clave: "POST /api/auth/registro",
    boton: "Crear cuenta",
    campos: [
      ["Nombre completo", "Ana López"],
      ["Correo", "ana@colegio.mx"],
      ["Contraseña", CLAVE],
    ],
    rechazoLocal: [["Contraseña", CORTA]],
    exito: () => respuestaJson(201, { tokenAcceso: "token-nuevo" }),
    destino: llegaAlDestino,
  },
  "registro de maestro": {
    elemento: () => <FormularioRegistroMaestro token={TOKEN} />,
    clave: "POST /api/auth/registro-maestro",
    boton: "Crear mi cuenta",
    campos: [
      ["Nombre completo", "Luis Pérez"],
      ["Correo", "luis@colegio.mx"],
      ["Contraseña", CLAVE],
    ],
    rechazoLocal: [["Nombre completo", "   "]],
    exito: () => respuestaJson(201, { tokenAcceso: "token-nuevo" }),
    destino: llegaAlDestino,
  },
  recuperar: {
    elemento: () => <FormularioRecuperar />,
    clave: "POST /api/auth/recuperar",
    boton: "Enviar enlace",
    campos: [["Correo", "ana@colegio.mx"]],
    rechazoLocal: [["Correo", "ana-sin-arroba"]],
    exito: sinContenido,
    destino: async () => {
      expect(await screen.findByRole("status")).toHaveTextContent(TEXTOS_RECUPERAR.confirmacion)
    },
  },
  restablecer: {
    elemento: () => <FormularioNuevaContrasena tipo="recuperacion" token={TOKEN} />,
    clave: "POST /api/auth/restablecer",
    boton: "Guardar contraseña",
    campos: [
      ["Contraseña nueva", CLAVE],
      ["Confirma la contraseña nueva", CLAVE],
    ],
    rechazoLocal: [["Confirma la contraseña nueva", "otra-clave-5678"]],
    exito: sinContenido,
    destino: llegaAlDestino,
  },
  establecer: {
    elemento: () => (
      <FormularioNuevaContrasena tipo="invitacion" token={TOKEN} nombreInicial="Ana López" />
    ),
    clave: "POST /api/auth/establecer-contrasena",
    boton: "Activar mi cuenta",
    campos: [
      ["Nombre completo", "Ana María López"],
      ["Contraseña nueva", CLAVE],
      ["Confirma la contraseña nueva", CLAVE],
    ],
    rechazoLocal: [["Nombre completo", ""]],
    exito: sinContenido,
    destino: llegaAlDestino,
  },
  "cambio obligatorio": {
    elemento: () => <FormularioCambiarContrasena />,
    clave: "POST /api/auth/cambiar-contrasena",
    boton: "Guardar y continuar",
    campos: [
      ["Contraseña nueva", CLAVE],
      ["Confirma la contraseña nueva", CLAVE],
    ],
    rechazoLocal: [
      ["Contraseña nueva", CORTA],
      ["Confirma la contraseña nueva", CORTA],
    ],
    exito: sinContenido,
    destino: llegaAlDestino,
  },
}

const NOMBRES = Object.keys(FORMULARIOS)

const formularioDe = (nombre: string): Formulario => {
  const formulario = FORMULARIOS[nombre]
  if (formulario === undefined) throw new Error(`Precondición: existe el formulario ${nombre}`)
  return formulario
}

const montar = async (formulario: Formulario) => {
  const cliente = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  render(
    <QueryClientProvider client={cliente}>
      <MemoryRouter initialEntries={["/formulario"]}>
        <Routes>
          <Route path="/formulario" element={formulario.elemento()} />
          <Route path="*" element={<Destino />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
  await screen.findByRole("button", { name: formulario.boton })
  return cliente
}

const escribir = (campos: Campos) => {
  for (const [etiqueta, valor] of campos) {
    fireEvent.change(screen.getByLabelText(etiqueta), { target: { value: valor } })
  }
}

const botonDe = (formulario: Formulario) => screen.getByRole("button", { name: formulario.boton })

const formularioDelBoton = (formulario: Formulario) => {
  const elemento = botonDe(formulario).closest("form")
  if (elemento === null) throw new Error("Precondición: el botón está dentro de un formulario")
  return elemento
}

const dosClicsEnElMismoRender = (boton: HTMLElement) => {
  act(() => {
    fireEvent.click(boton)
    fireEvent.click(boton)
  })
}

// Devuelve si cada submit siguió su curso (false = preventDefault).
const dosSubmitEnElMismoRender = (formulario: HTMLFormElement) => {
  const resultados: boolean[] = []
  act(() => {
    resultados.push(fireEvent.submit(formulario))
    resultados.push(fireEvent.submit(formulario))
  })
  return resultados
}

const enEspera = async (boton: HTMLElement) => {
  await waitFor(() => expect(boton).toHaveAttribute("aria-busy", "true"))
}

const fueraDeEspera = async (boton: HTMLElement) => {
  await waitFor(() => expect(boton).not.toHaveAttribute("aria-busy", "true"))
  expect(boton).not.toHaveAttribute("aria-disabled", "true")
}

const esperarUnMomento = () => act(() => new Promise((resolver) => setTimeout(resolver, 30)))

const unSoloMensaje = async (texto: string) => {
  await waitFor(() => expect(screen.getAllByRole("alert")).toHaveLength(1))
  expect(screen.getByRole("alert")).toHaveTextContent(texto)
}

const conservaLoEscrito = (campos: Campos) => {
  for (const [etiqueta, valor] of campos) {
    expect(screen.getByLabelText(etiqueta)).toHaveValue(valor)
  }
}

const MENSAJE_RED = MENSAJES_ERROR_AUTH.SIN_CONEXION

// CHORE-04 (arbitraje de la ronda 1): CampoContrasena registra un listener nativo de submit en captura
// con flushSync; vacía el render pendiente, y el segundo envío del mismo act ya ve isPending. Ahí estos
// casos son regresión y no vigilan la ref; en recuperar (sin ese campo) sí la vigilan.
const SOLO_RECUPERAR = [["recuperar"]] as const
const CON_CAMPO_CONTRASENA = NOMBRES.filter((nombre) => nombre !== "recuperar").map(
  (nombre) => [nombre] as const,
)

const casoCH410a = async (nombre: string) => {
  const formulario = formularioDe(nombre)
  const pendiente = retenida()
  preparar(formulario.clave, pendiente.respuesta)
  await montar(formulario)
  escribir(formulario.campos)

  dosClicsEnElMismoRender(botonDe(formulario))
  await esperarUnMomento()

  expect(peticiones(formulario.clave), `peticiones a ${formulario.clave}`).toBe(1)
  await enEspera(botonDe(formulario))
  await pendiente.soltar(formulario.exito())
  await formulario.destino()
  expect(peticiones(formulario.clave)).toBe(1)
}

const casoCH410b = async (nombre: string) => {
  const formulario = formularioDe(nombre)
  const pendiente = retenida()
  preparar(formulario.clave, pendiente.respuesta)
  await montar(formulario)
  escribir(formulario.campos)

  const resultados = dosSubmitEnElMismoRender(formularioDelBoton(formulario))
  await esperarUnMomento()

  expect(resultados[1], "el segundo submit no llamó a preventDefault").toBe(false)
  expect(peticiones(formulario.clave)).toBe(1)
  await enEspera(botonDe(formulario))
  await pendiente.soltar(formulario.exito())
  await formulario.destino()
  expect(peticiones(formulario.clave)).toBe(1)
}

const casoCH413 = async (nombre: string) => {
  const formulario = formularioDe(nombre)
  const pendiente = retenida()
  preparar(formulario.clave, error500, pendiente.respuesta, error500)
  await montar(formulario)
  escribir(formulario.campos)
  fireEvent.click(botonDe(formulario))
  await unSoloMensaje(MENSAJE_ERROR_AUTH_GENERICO)
  await fueraDeEspera(botonDe(formulario))

  const resultados = dosSubmitEnElMismoRender(formularioDelBoton(formulario))
  await esperarUnMomento()

  expect(resultados[1]).toBe(false)
  expect(peticiones(formulario.clave)).toBe(2)
  await enEspera(botonDe(formulario))
  await pendiente.soltar(error500())
  await fueraDeEspera(botonDe(formulario))
  await unSoloMensaje(MENSAJE_ERROR_AUTH_GENERICO)
  expect(peticiones(formulario.clave)).toBe(2)

  fireEvent.click(botonDe(formulario))
  await waitFor(() => expect(peticiones(formulario.clave)).toBe(3))
}

describe("CHORE-04 · formularios de features/auth: una sola petición por envío", () => {
  it.each(SOLO_RECUPERAR)(
    "CH4-10 (a): %s, dos clics en el mismo render mandan una sola petición y el botón espera hasta la respuesta",
    casoCH410a,
  )

  it.each(CON_CAMPO_CONTRASENA)(
    "CH4-10 (a): %s, con el CampoContrasena real, dos clics en un solo act mandan una sola petición y el botón espera hasta la respuesta (regresión; el segundo envío ya ve isPending por el flushSync de CampoContrasena, y la guarda la vigilan ATQ-CH4-01, CH4-01 y C-1)",
    casoCH410a,
  )

  it.each(SOLO_RECUPERAR)(
    "CH4-10 (b): %s, dos submit en el mismo render mandan una sola petición, el segundo con defaultPrevented y el botón en espera",
    casoCH410b,
  )

  it.each(CON_CAMPO_CONTRASENA)(
    "CH4-10 (b): %s, con el CampoContrasena real, dos submit en un solo act mandan una sola petición, el segundo con defaultPrevented y el botón en espera (regresión; el segundo envío ya ve isPending por el flushSync de CampoContrasena, y la guarda la vigilan ATQ-CH4-01, CH4-01 y C-1)",
    casoCH410b,
  )
})

const ERRORES_DE_REINTENTO: readonly (readonly [string, Respuesta, string])[] = [
  ["500", error500, MENSAJE_ERROR_AUTH_GENERICO],
  ["red", errorDeRed, MENSAJE_RED],
]

describe("CHORE-04 · «Inténtalo de nuevo» en features/auth, camino «repetir el control»", () => {
  it.each(
    NOMBRES.flatMap((nombre) =>
      ERRORES_DE_REINTENTO.map(
        ([clase, respuesta, texto]) => [nombre, clase, respuesta, texto] as const,
      ),
    ),
  )(
    "CH4-11: %s con %s: un solo MensajeError, lo escrito se conserva, el botón sale de la espera y un clic más manda la segunda petición y llega al destino",
    async (nombre, _clase, respuesta, texto) => {
      const formulario = formularioDe(nombre)
      preparar(formulario.clave, respuesta, formulario.exito)
      await montar(formulario)
      escribir(formulario.campos)

      fireEvent.click(botonDe(formulario))

      await unSoloMensaje(texto)
      conservaLoEscrito(formulario.campos)
      await fueraDeEspera(botonDe(formulario))
      expect(peticiones(formulario.clave)).toBe(1)

      fireEvent.click(botonDe(formulario))
      await waitFor(() => expect(peticiones(formulario.clave)).toBe(2))
      await formulario.destino()
      expect(screen.queryAllByRole("alert")).toHaveLength(0)
    },
  )
})

describe("CHORE-04 · error previo y doble envío (sin reset() con la petición en vuelo)", () => {
  it.each(SOLO_RECUPERAR)(
    "CH4-13: %s, tras un 500, dos submit válidos en el mismo render mandan una sola petición; espera hasta la respuesta, sale con un solo MensajeError y un clic más manda la tercera",
    casoCH413,
  )

  it.each(CON_CAMPO_CONTRASENA)(
    "CH4-13: %s, con el CampoContrasena real, tras un 500, dos submit válidos en un solo act mandan una sola petición; espera hasta la respuesta, sale con un solo MensajeError y un clic más manda la tercera (regresión; la guarda la vigilan ATQ-CH4-03, CH4-01 y C-1)",
    casoCH413,
  )
})

// Las tres primeras propiedades (un solo mensaje legible, lo escrito y la espera) ya las fijan
// CH3-C03 y CH3-C10 de formularios-ch3.test.tsx; CH4-14 agrega que la ref queda libre: un envío válido
// después manda otra petición.
const entradasDeValidacion = (nombre: string): readonly (readonly [string, string])[] => [
  ["campo no pintado", ENTRADAS_DE_FORMULARIO["campo-no-pintable"].mensaje],
  ["mensaje de solo espacios", ENTRADAS_DE_FORMULARIO["sin-texto-visible"].mensaje],
  ["mensaje vacío", ""],
  ["prefijo con ruta", ENTRADAS_DE_FORMULARIO.ruta.mensaje],
  ...(nombre === "restablecer"
    ? [["nombre: (solo lo pinta la invitación)", `nombre: ${MENSAJE_DE_PRUEBA}`] as const]
    : []),
]

describe("CHORE-04 · VALIDACION fuera de contrato no deja la ref tomada", () => {
  it.each(
    NOMBRES.flatMap((nombre) =>
      entradasDeValidacion(nombre).map(([entrada, mensaje]) => [nombre, entrada, mensaje] as const),
    ),
  )(
    "CH4-14: %s con %s: un solo mensaje legible, lo escrito se conserva, el botón sale de la espera y un envío válido después manda otra petición",
    async (nombre, _entrada, mensaje) => {
      const formulario = formularioDe(nombre)
      preparar(formulario.clave, () => errorApi(400, "VALIDACION", mensaje), formulario.exito)
      await montar(formulario)
      escribir(formulario.campos)

      fireEvent.click(botonDe(formulario))

      await waitFor(() => expect(screen.getAllByRole("alert")).toHaveLength(1))
      expect((screen.getByRole("alert").textContent ?? "").trim().length).toBeGreaterThan(0)
      expect(document.querySelectorAll('[aria-invalid="true"]')).toHaveLength(0)
      conservaLoEscrito(formulario.campos)
      await fueraDeEspera(botonDe(formulario))

      fireEvent.click(botonDe(formulario))
      await waitFor(() => expect(peticiones(formulario.clave)).toBe(2))
      await formulario.destino()
    },
  )

  it.each(NOMBRES.map((nombre) => [nombre] as const))(
    "CH4-14: %s, rechazo del servidor y después un envío que la validación local rechaza: un solo mensaje, el local, y ninguna petición nueva",
    async (nombre) => {
      const formulario = formularioDe(nombre)
      preparar(formulario.clave, () =>
        errorApi(400, "VALIDACION", ENTRADAS_DE_FORMULARIO["campo-no-pintable"].mensaje),
      )
      await montar(formulario)
      escribir(formulario.campos)
      fireEvent.click(botonDe(formulario))
      await waitFor(() => expect(screen.getAllByRole("alert")).toHaveLength(1))
      await fueraDeEspera(botonDe(formulario))

      escribir(formulario.rechazoLocal)
      fireEvent.click(botonDe(formulario))

      await waitFor(() => expect(screen.queryAllByRole("alert")).toHaveLength(0))
      expect(document.querySelectorAll('[aria-invalid="true"]')).toHaveLength(1)
      expect(peticiones(formulario.clave)).toBe(1)
    },
  )
})

describe("CHORE-04 · un envío inválido no toma la ref", () => {
  it.each(NOMBRES.map((nombre) => [nombre] as const))(
    "CH4-16: %s, un envío que la validación local rechaza, se corrige el campo y un solo clic manda la petición",
    async (nombre) => {
      const formulario = formularioDe(nombre)
      preparar(formulario.clave, formulario.exito)
      await montar(formulario)
      escribir(formulario.campos)
      escribir(formulario.rechazoLocal)

      fireEvent.click(botonDe(formulario))
      await waitFor(() =>
        expect(document.querySelectorAll('[aria-invalid="true"]')).toHaveLength(1),
      )
      expect(peticiones(formulario.clave)).toBe(0)

      escribir(formulario.campos)
      fireEvent.click(botonDe(formulario))
      await waitFor(() => expect(peticiones(formulario.clave)).toBe(1))
      await formulario.destino()
    },
  )
})

// Router y caché reales (plan, "Pruebas requeridas"): `rutas` de app/router y las defaultOptions
// de app/providers.tsx.
const montarRutas = async (ruta: string) => {
  const { rutas } = await import("@/app/router")
  const router = createMemoryRouter(rutas, { initialEntries: [ruta] })
  const cliente = new QueryClient({
    defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false, staleTime: 30_000 } },
  })
  render(
    <QueryClientProvider client={cliente}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
  return router
}

interface CaminoDeIdaYVuelta {
  nombre: string
  ruta: string
  enlace: string
  destinoDelEnlace: string
}

const CAMINOS_DE_IDA_Y_VUELTA: readonly CaminoDeIdaYVuelta[] = [
  { nombre: "login", ruta: "/login", enlace: TEXTOS_LOGIN.olvide, destinoDelEnlace: "/recuperar" },
  {
    nombre: "registro de estudiante",
    ruta: "/registro",
    enlace: TEXTOS_REGISTRO.yaTienesCuenta,
    destinoDelEnlace: "/login",
  },
  {
    nombre: "recuperar",
    ruta: "/recuperar",
    enlace: TEXTOS_RECUPERAR.volver,
    destinoDelEnlace: "/login",
  },
]

describe("CHORE-04 · «Inténtalo de nuevo» en features/auth, camino «otra ruta y regreso»", () => {
  it.each(CAMINOS_DE_IDA_Y_VUELTA)(
    "CH4-12: $nombre, tras el 500, ir a $destinoDelEnlace y volver con el historial monta el formulario sin la frase; un envío válido manda una petición nueva",
    async (camino) => {
      const formulario = formularioDe(camino.nombre)
      me = () => errorApi(401, "NO_AUTENTICADO")
      limpiarToken()
      const pendiente = retenida()
      preparar(formulario.clave, error500, pendiente.respuesta)
      const router = await montarRutas(camino.ruta)
      await screen.findByRole("button", { name: formulario.boton })
      escribir(formulario.campos)
      fireEvent.click(botonDe(formulario))
      await unSoloMensaje(MENSAJE_ERROR_AUTH_GENERICO)

      fireEvent.click(screen.getByRole("link", { name: camino.enlace }))
      await waitFor(() => expect(router.state.location.pathname).toBe(camino.destinoDelEnlace))
      await act(async () => {
        await router.navigate(-1)
      })
      await waitFor(() => expect(router.state.location.pathname).toBe(camino.ruta))

      await screen.findByRole("button", { name: formulario.boton })
      expect(screen.queryByText(MENSAJE_ERROR_AUTH_GENERICO)).toBeNull()
      escribir(formulario.campos)
      fireEvent.click(botonDe(formulario))
      await waitFor(() => expect(peticiones(formulario.clave)).toBe(2))
      expect(screen.queryByText(MENSAJE_ERROR_AUTH_GENERICO)).toBeNull()
      await pendiente.soltar(errorApi(429, "DEMASIADOS_INTENTOS"))
      await unSoloMensaje(MENSAJES_ERROR_AUTH.DEMASIADOS_INTENTOS)
    },
  )

  // El token de restablecer, establecer y registro de maestro se lee del fragmento una sola vez y
  // se quita del historial: al volver, la pantalla es la del enlace inválido, sin formulario. El
  // camino "otra ruta y regreso" no existe para ellos.
  it.each([
    {
      nombre: "restablecer",
      ruta: "/restablecer",
      boton: "Guardar contraseña",
      texto: TEXTOS_NUEVA_CONTRASENA.recuperacion.enlaceInvalido,
    },
    {
      nombre: "establecer",
      ruta: "/establecer-contrasena",
      boton: "Activar mi cuenta",
      texto: TEXTOS_NUEVA_CONTRASENA.invitacion.enlaceInvalido,
    },
    {
      nombre: "registro de maestro",
      ruta: "/registro-maestro",
      boton: "Crear mi cuenta",
      texto: TEXTOS_REGISTRO_MAESTRO.enlaceInvalido,
    },
  ])(
    "CH4-12: $nombre, el camino no existe: al volver con el historial, la pantalla es la del enlace inválido, sin el formulario",
    async (caso) => {
      me = () => errorApi(401, "NO_AUTENTICADO")
      limpiarToken()
      const router = await montarRutas(`${caso.ruta}#token=${TOKEN}`)
      await screen.findByRole("button", { name: caso.boton })
      await waitFor(() => expect(router.state.location.hash).toBe(""))

      await act(async () => {
        await router.navigate("/login")
      })
      await act(async () => {
        await router.navigate(-1)
      })

      await waitFor(() => expect(router.state.location.pathname).toBe(caso.ruta))
      expect(await screen.findByText(caso.texto)).toBeInTheDocument()
      expect(screen.queryByRole("button", { name: caso.boton })).toBeNull()
    },
  )

  // El cambio obligatorio no tiene otra ruta a la que ir: la guarda devuelve a /cambiar-contrasena.
  it("CH4-12: cambio obligatorio, el camino no existe: ir a otra ruta devuelve a /cambiar-contrasena", async () => {
    me = () => errorApi(403, "CAMBIO_DE_CONTRASENA_REQUERIDO")
    const router = await montarRutas("/cambiar-contrasena")
    await screen.findByRole("button", { name: "Guardar y continuar" })

    await act(async () => {
      await router.navigate("/estudiante")
    })

    await waitFor(() => expect(router.state.location.pathname).toBe("/cambiar-contrasena"))
    expect(await screen.findByRole("button", { name: "Guardar y continuar" })).toBeInTheDocument()
  })
})

interface CasoCerrarSesion {
  nombre: string
  ruta: string
  me: Respuesta
}

const CASOS_CERRAR_SESION: readonly CasoCerrarSesion[] = [
  {
    nombre: "marco de /estudiante",
    ruta: "/estudiante",
    me: () => respuestaJson(200, meDe({ rol: "estudiante" })),
  },
  {
    nombre: "marco de /maestro",
    ruta: "/maestro",
    me: () => respuestaJson(200, meDe({ rol: "maestro" })),
  },
  {
    nombre: "marco de /admin",
    ruta: "/admin",
    me: () => respuestaJson(200, meDe({ rol: "admin", nombre: "Administración" })),
  },
  {
    nombre: "/acceso-restringido",
    ruta: "/acceso-restringido",
    me: () =>
      respuestaJson(
        200,
        meDe({ rol: "estudiante", accesoRestringido: true, motivoRestriccion: "Adeudo" }),
      ),
  },
  {
    nombre: "/cambiar-contrasena",
    ruta: "/cambiar-contrasena",
    me: () => errorApi(403, "CAMBIO_DE_CONTRASENA_REQUERIDO"),
  },
]

describe("CHORE-04 · «Cerrar sesión», una sola petición", () => {
  it.each(CASOS_CERRAR_SESION)(
    "CH4-15: $nombre, dos clics en el mismo render mandan un solo POST /api/auth/logout y la pantalla termina en /login",
    async (caso) => {
      me = caso.me
      const pendiente = retenida()
      preparar("POST /api/auth/logout", pendiente.respuesta)
      const router = await montarRutas(caso.ruta)
      const boton = await screen.findByRole("button", { name: "Cerrar sesión" })

      dosClicsEnElMismoRender(boton)
      await esperarUnMomento()

      expect(peticiones("POST /api/auth/logout")).toBe(1)
      await pendiente.soltar(sinContenido())
      await waitFor(() => expect(router.state.location.pathname).toBe("/login"))
      expect(peticiones("POST /api/auth/logout")).toBe(1)
    },
  )

  it("CH4-15: cambio obligatorio, con el cambio de contraseña en vuelo, «Cerrar sesión» manda su petición (guardas independientes)", async () => {
    me = () => errorApi(403, "CAMBIO_DE_CONTRASENA_REQUERIDO")
    const cambio = retenida()
    preparar("POST /api/auth/cambiar-contrasena", cambio.respuesta)
    const router = await montarRutas("/cambiar-contrasena")
    await screen.findByRole("button", { name: "Guardar y continuar" })
    escribir([
      ["Contraseña nueva", CLAVE],
      ["Confirma la contraseña nueva", CLAVE],
    ])
    fireEvent.click(screen.getByRole("button", { name: "Guardar y continuar" }))
    await waitFor(() => expect(peticiones("POST /api/auth/cambiar-contrasena")).toBe(1))

    fireEvent.click(screen.getByRole("button", { name: "Cerrar sesión" }))

    await waitFor(() => expect(peticiones("POST /api/auth/logout")).toBe(1))
    await waitFor(() => expect(router.state.location.pathname).toBe("/login"))
    expect(peticiones("POST /api/auth/cambiar-contrasena")).toBe(1)
  })
})

it("CHORE-04 · precondición: los siete formularios del plan y sus destinos", () => {
  expect(NOMBRES).toEqual([
    "login",
    "registro de estudiante",
    "registro de maestro",
    "recuperar",
    "restablecer",
    "establecer",
    "cambio obligatorio",
  ])
  expect(RUTA_POR_ROL.maestro).toBe("/maestro")
})
