import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import type { InputHTMLAttributes, ReactNode } from "react"
import { MemoryRouter, Route, Routes } from "react-router"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { establecerToken, limpiarToken } from "@/services/tokenAcceso"

import { FormularioCambiarContrasena } from "./components/formulario-cambiar-contrasena"
import { FormularioLogin } from "./components/formulario-login"
import { FormularioNuevaContrasena } from "./components/formulario-nueva-contrasena"
import { FormularioRecuperar } from "./components/formulario-recuperar"
import { FormularioRegistro } from "./components/formulario-registro"
import { FormularioRegistroMaestro } from "./components/formulario-registro-maestro"
import { MENSAJE_ERROR_AUTH_GENERICO, TEXTOS_RECUPERAR } from "./data"

// Tester, ronda 1 de CHORE-04 (punto 1 del manager). En los seis formularios con contraseña, el
// listener de submit de CampoContrasena llama a flushSync y vacía el render que dejó el primer envío:
// el segundo envío del mismo act ya ve isPending y las pruebas del programador no distinguen la ref
// (M1 y M2 de la revisión). Aquí CampoContrasena se dobla con un <input> sin ese listener, así que lo
// único que puede frenar el segundo envío del mismo render es la ref de §D-1. Se repiten CH4-10 y
// CH4-13 y se recorre la ref tras cada clase de error que el plan nombra (punto 1 de "Puntos de
// ataque"), con dos envíos en el mismo render después de cada error.

vi.mock("@/features/auth/components/campo-contrasena", () => ({
  CampoContrasena: ({
    nombreDelBoton,
    ...props
  }: InputHTMLAttributes<HTMLInputElement> & { id: string; nombreDelBoton: string }) => (
    <input {...props} type="password" data-doble-de-campo-contrasena={nombreDelBoton} />
  ),
}))
vi.mock("@/services/navegacion", () => ({ irA: vi.fn(), rutaActual: vi.fn(() => "/") }))
const aviso = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }))
vi.mock("sonner", () => ({ toast: aviso, Toaster: () => null }))

const TOKEN = "C".repeat(43)
const CLAVE = "clave-secreta-1234"

type Respuesta = () => Response | Promise<Response>

const respuestaJson = (estado: number, cuerpo: unknown) =>
  new Response(JSON.stringify(cuerpo), {
    status: estado,
    headers: { "Content-Type": "application/json" },
  })
const sinContenido = () => new Response(null, { status: 204 })
const errorApi = (estado: number, codigo: string, mensaje = "mensaje del servidor") =>
  respuestaJson(estado, { error: { codigo, mensaje } })
const error500 = () => errorApi(500, "ERROR_INTERNO")

let colas = new Map<string, Respuesta[]>()
let llamadas: string[] = []

const preparar = (clave: string, ...respuestas: Respuesta[]) => {
  colas.set(clave, [...(colas.get(clave) ?? []), ...respuestas])
}
const peticiones = (clave: string) => llamadas.filter((llamada) => llamada === clave).length

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

beforeEach(() => {
  establecerToken("token-de-prueba")
  colas = new Map()
  llamadas = []
  vi.stubGlobal(
    "fetch",
    vi.fn<typeof fetch>((entrada, init) => {
      const clave = `${init?.method ?? "GET"} ${String(entrada)}`
      llamadas.push(clave)
      const siguiente = colas.get(clave)?.shift()
      if (siguiente !== undefined) return Promise.resolve().then(siguiente)
      if (String(entrada) === "/api/auth/refrescar") {
        return Promise.resolve(respuestaJson(200, { tokenAcceso: "token-de-prueba" }))
      }
      if (String(entrada) === "/api/me") {
        return Promise.resolve(
          respuestaJson(200, {
            id: "5a5d7a3e-1c1f-4b8e-9a1e-0f2a3b4c5d6e",
            nombre: "Ana López",
            email: "ana@colegio.mx",
            rol: "maestro",
            debeCambiarContrasena: false,
            accesoRestringido: false,
          }),
        )
      }
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
  nombre: string
  elemento: () => ReactNode
  clave: string
  boton: string
  campos: Campos
  conContrasena: boolean
  exito: () => Response
  destino: () => Promise<void>
}

function Destino() {
  return <p>destino alcanzado</p>
}

const llegaAlDestino = async () => {
  expect(await screen.findByText("destino alcanzado")).toBeInTheDocument()
}

const FORMULARIOS: readonly Formulario[] = [
  {
    nombre: "login",
    elemento: () => <FormularioLogin />,
    clave: "POST /api/auth/login",
    boton: "Iniciar sesión",
    campos: [
      ["Correo", "ana@colegio.mx"],
      ["Contraseña", CLAVE],
    ],
    conContrasena: true,
    exito: () => respuestaJson(200, { tokenAcceso: "token-nuevo" }),
    destino: llegaAlDestino,
  },
  {
    nombre: "registro de estudiante",
    elemento: () => <FormularioRegistro />,
    clave: "POST /api/auth/registro",
    boton: "Crear cuenta",
    campos: [
      ["Nombre completo", "Ana López"],
      ["Correo", "ana@colegio.mx"],
      ["Contraseña", CLAVE],
    ],
    conContrasena: true,
    exito: () => respuestaJson(201, { tokenAcceso: "token-nuevo" }),
    destino: llegaAlDestino,
  },
  {
    nombre: "registro de maestro",
    elemento: () => <FormularioRegistroMaestro token={TOKEN} />,
    clave: "POST /api/auth/registro-maestro",
    boton: "Crear mi cuenta",
    campos: [
      ["Nombre completo", "Luis Pérez"],
      ["Correo", "luis@colegio.mx"],
      ["Contraseña", CLAVE],
    ],
    conContrasena: true,
    exito: () => respuestaJson(201, { tokenAcceso: "token-nuevo" }),
    destino: llegaAlDestino,
  },
  {
    nombre: "recuperar",
    elemento: () => <FormularioRecuperar />,
    clave: "POST /api/auth/recuperar",
    boton: "Enviar enlace",
    campos: [["Correo", "ana@colegio.mx"]],
    conContrasena: false,
    exito: sinContenido,
    destino: async () => {
      expect(await screen.findByRole("status")).toHaveTextContent(TEXTOS_RECUPERAR.confirmacion)
    },
  },
  {
    nombre: "restablecer",
    elemento: () => <FormularioNuevaContrasena tipo="recuperacion" token={TOKEN} />,
    clave: "POST /api/auth/restablecer",
    boton: "Guardar contraseña",
    campos: [
      ["Contraseña nueva", CLAVE],
      ["Confirma la contraseña nueva", CLAVE],
    ],
    conContrasena: true,
    exito: sinContenido,
    destino: llegaAlDestino,
  },
  {
    nombre: "establecer",
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
    conContrasena: true,
    exito: sinContenido,
    destino: llegaAlDestino,
  },
  {
    nombre: "cambio obligatorio",
    elemento: () => <FormularioCambiarContrasena />,
    clave: "POST /api/auth/cambiar-contrasena",
    boton: "Guardar y continuar",
    campos: [
      ["Contraseña nueva", CLAVE],
      ["Confirma la contraseña nueva", CLAVE],
    ],
    conContrasena: true,
    exito: sinContenido,
    destino: llegaAlDestino,
  },
]

const POR_NOMBRE = FORMULARIOS.map((formulario) => [formulario.nombre, formulario] as const)

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
  // Control del doble: el campo de contraseña es el <input> sin listener (ningún botón con
  // aria-pressed, que es el de mostrar u ocultar del campo real).
  const dobles = document.querySelectorAll("[data-doble-de-campo-contrasena]").length
  if (formulario.conContrasena)
    expect(dobles, "precondición: el campo está doblado").toBeGreaterThan(0)
  expect(screen.queryAllByRole("button", { pressed: false })).toHaveLength(0)
}

const escribir = (campos: Campos) => {
  for (const [etiqueta, valor] of campos) {
    fireEvent.change(screen.getByLabelText(etiqueta), { target: { value: valor } })
  }
}

const botonDe = (formulario: Formulario) => screen.getByRole("button", { name: formulario.boton })
const formularioDe = (formulario: Formulario) => {
  const elemento = botonDe(formulario).closest("form")
  if (elemento === null) throw new Error("Precondición: el botón está dentro de un formulario")
  return elemento
}

const esperarUnMomento = () => act(() => new Promise((resolver) => setTimeout(resolver, 30)))

const enEspera = async (boton: HTMLElement) => {
  await waitFor(() => expect(boton).toHaveAttribute("aria-busy", "true"))
}
const fueraDeEspera = async (formulario: Formulario) => {
  await waitFor(() => expect(botonDe(formulario)).not.toHaveAttribute("aria-busy", "true"))
  expect(botonDe(formulario)).not.toHaveAttribute("aria-disabled", "true")
}

// Dos envíos en el mismo render, de tres formas. Devuelve si el segundo siguió su curso.
type FormaDelDobleEnvio = "dos clics" | "dos submit" | "clic y submit"
const dosEnviosEnElMismoRender = (formulario: Formulario, forma: FormaDelDobleEnvio) => {
  const resultados: boolean[] = []
  act(() => {
    if (forma === "dos submit") resultados.push(fireEvent.submit(formularioDe(formulario)))
    else resultados.push(fireEvent.click(botonDe(formulario)))
    if (forma === "dos clics") resultados.push(fireEvent.click(botonDe(formulario)))
    else resultados.push(fireEvent.submit(formularioDe(formulario)))
  })
  return resultados
}

const FORMAS: readonly FormaDelDobleEnvio[] = ["dos clics", "dos submit", "clic y submit"]

describe("ataque CHORE-04 r1 · la ref de los formularios de auth sin el flushSync de CampoContrasena", () => {
  it.each(
    POR_NOMBRE.flatMap(([nombre, formulario]) =>
      FORMAS.map((forma) => [nombre, forma, formulario] as const),
    ),
  )(
    "ATQ-CH4-01: %s, %s en el mismo render mandan una sola petición, el segundo submit sale con defaultPrevented y el botón espera hasta la respuesta",
    async (_nombre, forma, formulario) => {
      const pendiente = retenida()
      preparar(formulario.clave, pendiente.respuesta)
      await montar(formulario)
      escribir(formulario.campos)

      const resultados = dosEnviosEnElMismoRender(formulario, forma)
      await esperarUnMomento()

      expect(peticiones(formulario.clave), `peticiones a ${formulario.clave}`).toBe(1)
      if (forma !== "dos clics") {
        expect(resultados[1], "el segundo submit no llamó a preventDefault").toBe(false)
      }
      await enEspera(botonDe(formulario))
      await pendiente.soltar(formulario.exito())
      await formulario.destino()
      expect(peticiones(formulario.clave)).toBe(1)
    },
  )

  it.each(POR_NOMBRE)(
    "ATQ-CH4-02: %s, un envío, un render y otro envío con la petición en vuelo: una sola petición",
    async (_nombre, formulario) => {
      const pendiente = retenida()
      preparar(formulario.clave, pendiente.respuesta)
      await montar(formulario)
      escribir(formulario.campos)

      fireEvent.click(botonDe(formulario))
      await enEspera(botonDe(formulario))
      const siguio = fireEvent.submit(formularioDe(formulario))
      await esperarUnMomento()

      expect(siguio).toBe(false)
      expect(peticiones(formulario.clave)).toBe(1)
      await pendiente.soltar(formulario.exito())
      await formulario.destino()
    },
  )

  it.each(POR_NOMBRE)(
    "ATQ-CH4-03: %s, tras un 500, dos submit válidos en el mismo render mandan una sola petición; el error viejo se quita una vez, el botón espera hasta la respuesta, sale con un solo MensajeError y un clic más manda la tercera",
    async (_nombre, formulario) => {
      const pendiente = retenida()
      preparar(formulario.clave, error500, pendiente.respuesta, error500)
      await montar(formulario)
      escribir(formulario.campos)
      fireEvent.click(botonDe(formulario))
      await waitFor(() => expect(screen.getAllByRole("alert")).toHaveLength(1))
      expect(screen.getByRole("alert")).toHaveTextContent(MENSAJE_ERROR_AUTH_GENERICO)
      await fueraDeEspera(formulario)

      const resultados = dosEnviosEnElMismoRender(formulario, "dos submit")
      await esperarUnMomento()

      expect(resultados[1]).toBe(false)
      expect(peticiones(formulario.clave)).toBe(2)
      // reset() corrió una vez, con la mutación asentada: el mensaje viejo ya no está y el botón
      // sigue en espera (con reset() en vuelo saldría de la espera y la ref quedaría tomada).
      expect(screen.queryAllByRole("alert")).toHaveLength(0)
      await enEspera(botonDe(formulario))
      await pendiente.soltar(error500())
      await fueraDeEspera(formulario)
      await waitFor(() => expect(screen.getAllByRole("alert")).toHaveLength(1))
      expect(peticiones(formulario.clave)).toBe(2)

      fireEvent.click(botonDe(formulario))
      await waitFor(() => expect(peticiones(formulario.clave)).toBe(3))
    },
  )
})

// Cada clase de error del punto 1 de "Puntos de ataque" que no tiene caso propio en el programador.
// Tras el error, la ref está libre (el siguiente envío manda) y sigue guardando (dos envíos en el mismo
// render mandan uno).
const ERRORES: readonly (readonly [string, Respuesta, boolean])[] = [
  ["503 SERVICIO_OCUPADO", () => errorApi(503, "SERVICIO_OCUPADO"), false],
  [
    "503 sin cuerpo (sin conexión)",
    () => new Response("Service Unavailable", { status: 503 }),
    false,
  ],
  ["429 DEMASIADOS_INTENTOS", () => errorApi(429, "DEMASIADOS_INTENTOS"), false],
  ["401 sin refresco", () => errorApi(401, "NO_AUTENTICADO"), true],
  ["403 ACCESO_RESTRINGIDO", () => errorApi(403, "ACCESO_RESTRINGIDO"), false],
  [
    "403 CAMBIO_DE_CONTRASENA_REQUERIDO",
    () => errorApi(403, "CAMBIO_DE_CONTRASENA_REQUERIDO"),
    false,
  ],
  ["409 CORREO_EN_USO", () => errorApi(409, "CORREO_EN_USO"), false],
  [
    "400 VALIDACION de un campo",
    () => errorApi(400, "VALIDACION", "email: Correo no válido"),
    false,
  ],
]

describe("ataque CHORE-04 r1 · la ref se suelta tras cada clase de error y sigue guardando", () => {
  it.each(
    POR_NOMBRE.flatMap(([nombre, formulario]) =>
      ERRORES.map(
        ([clase, respuesta, sinToken]) => [nombre, clase, formulario, respuesta, sinToken] as const,
      ),
    ),
  )(
    "ATQ-CH4-04: %s con %s: el botón sale de la espera con un solo mensaje y, después, dos submit en el mismo render mandan una sola petición más",
    async (_nombre, _clase, formulario, respuesta, sinToken) => {
      if (sinToken) limpiarToken()
      const pendiente = retenida()
      preparar(formulario.clave, respuesta, pendiente.respuesta)
      await montar(formulario)
      escribir(formulario.campos)

      fireEvent.click(botonDe(formulario))
      await waitFor(() => expect(peticiones(formulario.clave)).toBe(1))
      await fueraDeEspera(formulario)
      // Un solo mensaje legible: un MensajeError o un ErrorDeCampo, nunca los dos ni ninguno.
      const alertas = screen.queryAllByRole("alert").length
      const campos = document.querySelectorAll('[aria-invalid="true"]').length
      expect(alertas + campos, "un solo mensaje").toBe(1)

      const resultados = dosEnviosEnElMismoRender(formulario, "dos submit")
      await esperarUnMomento()

      expect(resultados[1]).toBe(false)
      expect(peticiones(formulario.clave)).toBe(2)
      await enEspera(botonDe(formulario))
      await pendiente.soltar(formulario.exito())
      await formulario.destino()
      expect(peticiones(formulario.clave)).toBe(2)
    },
  )
})
