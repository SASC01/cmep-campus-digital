import { contarCaracteresVisibles } from "@campus/shared"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import type { ReactNode } from "react"
import { MemoryRouter } from "react-router"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import {
  ENTRADAS_DE_FORMULARIO,
  ENTRADAS_FUERA_DE_CONTRATO,
  MENSAJE_DE_PRUEBA,
} from "@/lib/errores-de-api-fuera-de-contrato"
import { irA } from "@/services/navegacion"
import { establecerToken, limpiarToken } from "@/services/tokenAcceso"

import { AccesoRestringidoView } from "./acceso-restringido-view"
import { FormularioCambiarContrasena } from "./components/formulario-cambiar-contrasena"
import { FormularioLogin } from "./components/formulario-login"
import { FormularioNuevaContrasena } from "./components/formulario-nueva-contrasena"
import { FormularioRecuperar } from "./components/formulario-recuperar"
import { FormularioRegistro } from "./components/formulario-registro"
import { FormularioRegistroMaestro } from "./components/formulario-registro-maestro"
import {
  MENSAJE_CONFIRMACION_NO_COINCIDE,
  MENSAJE_ERROR_AUTH_GENERICO,
  MENSAJES_ERROR_AUTH,
  TEXTOS_NUEVA_CONTRASENA,
  TEXTOS_REGISTRO_MAESTRO,
  TEXTOS_SESION,
} from "./data"
import { EstablecerContrasenaView } from "./establecer-contrasena-view"

// Tester, ronda 1 de CHORE-03 03c. features/auth ante lo que el servidor puede mandar: la tabla común
// completa repartida entre los siete formularios; las entradas de "Puntos de ataque" y los campos que
// un formulario pinta solo en otro modo (patrón de T-03 y T-04: `nombre` al restablecer, `token` en el
// registro de estudiante, `contrasena` en el cambio obligatorio…); los códigos fijos con un mensaje del
// servidor que parece ruta; los códigos que auth no conoce; sin conexión; ENLACE_INVALIDO en los tres
// formularios con enlace y en la consulta de la invitación; las dos consultas de S-08 (la invitación y
// /me en "Acceso restringido"); los errores que apiClient redirige; y el MensajeError de un envío
// anterior cuando el siguiente lo rechaza la validación local. En cada caso, exactamente un mensaje
// legible y nunca el texto de un código fijo del servidor. El servidor es un doble en memoria; reloj
// fijo (solo Date).

vi.mock("@/services/navegacion", () => ({ irA: vi.fn(), rutaActual: vi.fn(() => "/admin") }))
const aviso = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }))
vi.mock("sonner", () => ({ toast: aviso, Toaster: () => null }))

const AHORA = new Date("2030-01-10T12:00:00.000Z")
const GENERICO = MENSAJE_ERROR_AUTH_GENERICO
const M = MENSAJE_DE_PRUEBA
const TOKEN = "C".repeat(43)
const CLAVE = "clave-secreta-1234"
const SIN_CONEXION = MENSAJES_ERROR_AUTH.SIN_CONEXION

const ME = {
  id: "5a5d7a3e-1c1f-4b8e-9a1e-0f2a3b4c5d6e",
  nombre: "Ana López",
  email: "ana@colegio.mx",
  rol: "admin",
  debeCambiarContrasena: false,
  accesoRestringido: true,
}

const respuestaJson = (estado: number, cuerpo: unknown) =>
  new Response(JSON.stringify(cuerpo), {
    status: estado,
    headers: { "Content-Type": "application/json" },
  })

const errorApi = (estado: number, codigo: string, mensaje: string) =>
  respuestaJson(estado, { error: { codigo, mensaje } })

interface Llamada {
  metodo: string
  ruta: string
}

let preparadas: { metodo: string; ruta: string; respuesta: () => Response | Promise<Response> }[] =
  []
let llamadas: Llamada[] = []
let inesperadas: string[] = []

const preparar = (
  metodo: string,
  ruta: string,
  ...respuestas: (() => Response | Promise<Response>)[]
) => {
  for (const respuesta of respuestas) preparadas.push({ metodo, ruta, respuesta })
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] })
  vi.setSystemTime(AHORA)
  establecerToken("token-de-prueba")
  preparadas = []
  llamadas = []
  inesperadas = []
  vi.mocked(irA).mockClear()
  vi.stubGlobal(
    "fetch",
    vi.fn<typeof fetch>((entrada, init) => {
      const llamada = {
        metodo: init?.method ?? "GET",
        ruta: new URL(String(entrada), "http://local").pathname,
      }
      llamadas.push(llamada)
      const indice = preparadas.findIndex(
        (p) => p.metodo === llamada.metodo && p.ruta === llamada.ruta,
      )
      if (indice >= 0) {
        const [preparada] = preparadas.splice(indice, 1)
        if (preparada === undefined) throw new Error("Precondición: la respuesta preparada existe")
        return Promise.resolve(preparada.respuesta())
      }
      if (llamada.metodo === "GET" && llamada.ruta === "/api/me") {
        return Promise.resolve(respuestaJson(200, ME))
      }
      inesperadas.push(`${llamada.metodo} ${llamada.ruta}`)
      return Promise.resolve(errorApi(500, "ERROR_INTERNO", "no esperada"))
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

const montar = (elemento: ReactNode, entrada = "/") => {
  const cliente = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  render(
    <QueryClientProvider client={cliente}>
      <MemoryRouter initialEntries={[entrada]}>{elemento}</MemoryRouter>
    </QueryClientProvider>,
  )
  return cliente
}

const reposar = async () => {
  await act(async () => {
    for (let i = 0; i < 6; i += 1) await new Promise((r) => setTimeout(r, 0))
  })
}

interface Formulario {
  elemento: () => ReactNode
  ruta: string
  boton: string
  titulo: string
  campos: readonly (readonly [string, string])[]
  // Lo que se escribe para que la validación local rechace el envío siguiente.
  local: readonly (readonly [string, string])[]
}

const FORMULARIOS = {
  "iniciar sesión": {
    elemento: () => <FormularioLogin />,
    ruta: "/api/auth/login",
    boton: "Iniciar sesión",
    titulo: "No pudimos iniciar sesión",
    campos: [
      ["Correo", "ana@colegio.mx"],
      ["Contraseña", CLAVE],
    ],
    local: [["Correo", "no-es-un-correo"]],
  },
  "registro de estudiante": {
    elemento: () => <FormularioRegistro />,
    ruta: "/api/auth/registro",
    boton: "Crear cuenta",
    titulo: "No pudimos crear tu cuenta",
    campos: [
      ["Nombre completo", "Ana López"],
      ["Correo", "ana@colegio.mx"],
      ["Contraseña", CLAVE],
    ],
    local: [["Correo", "no-es-un-correo"]],
  },
  "registro de maestro por enlace": {
    elemento: () => <FormularioRegistroMaestro token={TOKEN} />,
    ruta: "/api/auth/registro-maestro",
    boton: "Crear mi cuenta",
    titulo: "No pudimos crear tu cuenta",
    campos: [
      ["Nombre completo", "Luis Pérez"],
      ["Correo", "luis@colegio.mx"],
      ["Contraseña", CLAVE],
    ],
    local: [["Correo", "no-es-un-correo"]],
  },
  "recuperar contraseña": {
    elemento: () => <FormularioRecuperar />,
    ruta: "/api/auth/recuperar",
    boton: "Enviar enlace",
    titulo: "Error",
    campos: [["Correo", "ana@colegio.mx"]],
    local: [["Correo", "no-es-un-correo"]],
  },
  "restablecer contraseña": {
    elemento: () => <FormularioNuevaContrasena tipo="recuperacion" token={TOKEN} />,
    ruta: "/api/auth/restablecer",
    boton: "Guardar contraseña",
    titulo: "Error",
    campos: [
      ["Contraseña nueva", CLAVE],
      ["Confirma la contraseña nueva", CLAVE],
    ],
    local: [["Confirma la contraseña nueva", "otra-clave-9999"]],
  },
  "establecer contraseña (invitación)": {
    elemento: () => (
      <FormularioNuevaContrasena tipo="invitacion" token={TOKEN} nombreInicial="Ana López" />
    ),
    ruta: "/api/auth/establecer-contrasena",
    boton: "Activar mi cuenta",
    titulo: "Error",
    campos: [
      ["Nombre completo", "Ana María López"],
      ["Contraseña nueva", CLAVE],
      ["Confirma la contraseña nueva", CLAVE],
    ],
    local: [["Confirma la contraseña nueva", "otra-clave-9999"]],
  },
  "cambio obligatorio de contraseña": {
    elemento: () => <FormularioCambiarContrasena />,
    ruta: "/api/auth/cambiar-contrasena",
    boton: "Guardar y continuar",
    titulo: "Error",
    campos: [
      ["Contraseña nueva", CLAVE],
      ["Confirma la contraseña nueva", CLAVE],
    ],
    local: [["Confirma la contraseña nueva", "otra-clave-9999"]],
  },
} as const satisfies Readonly<Record<string, Formulario>>

type NombreDeFormulario = keyof typeof FORMULARIOS
const NOMBRES = Object.keys(FORMULARIOS) as NombreDeFormulario[]

const escribir = (campos: readonly (readonly [string, string])[]) => {
  for (const [etiqueta, valor] of campos) {
    fireEvent.change(screen.getByLabelText(etiqueta), { target: { value: valor } })
  }
}

const enviar = async (
  nombre: NombreDeFormulario,
  respuesta: () => Response | Promise<Response>,
) => {
  const formulario: Formulario = FORMULARIOS[nombre]
  preparar("POST", formulario.ruta, respuesta)
  const cliente = montar(formulario.elemento())
  const boton = await screen.findByRole("button", { name: formulario.boton })
  escribir(formulario.campos)
  fireEvent.click(boton)
  return { formulario, cliente }
}

const peticionesA = (ruta: string) =>
  llamadas.filter((llamada) => llamada.metodo === "POST" && llamada.ruta === ruta).length

const textoDeLaPantalla = () => document.body.textContent

// Exactamente un mensaje: un MensajeError con su título y el texto esperado; ni ErrorDeCampo ni aviso.
const unSoloMensaje = async (titulo: string, esperado: string) => {
  const alerta = await screen.findByRole("alert")
  expect(screen.getAllByRole("alert")).toHaveLength(1)
  expect(alerta.textContent).toBe(`${titulo}${esperado}`)
  expect(contarCaracteresVisibles(esperado)).toBeGreaterThan(0)
  expect(document.querySelectorAll('[aria-invalid="true"]')).toHaveLength(0)
  expect(aviso.error).not.toHaveBeenCalled()
  expect(aviso.success).not.toHaveBeenCalled()
}

const salioDeLaEspera = async (formulario: Formulario, cliente: QueryClient) => {
  await waitFor(() => expect(cliente.isMutating()).toBe(0))
  const boton = screen.getByRole("button", { name: formulario.boton })
  await waitFor(() => expect(boton).not.toHaveAttribute("aria-busy", "true"))
  expect(boton).not.toHaveAttribute("aria-disabled", "true")
  for (const [etiqueta, valor] of formulario.campos) {
    expect(screen.getByLabelText(etiqueta)).toHaveValue(valor)
  }
}

const validacion = (mensaje: string) => () => errorApi(400, "VALIDACION", mensaje)

const CASOS_DE_LA_TABLA = ENTRADAS_FUERA_DE_CONTRATO.map(
  (entrada, i) =>
    [
      NOMBRES[i % NOMBRES.length] ?? "iniciar sesión",
      JSON.stringify(entrada.mensaje),
      entrada.mensaje,
      entrada.resto ?? GENERICO,
    ] as const,
)

// Puntos de ataque y campos de otro modo, en todos los formularios: [nombre, mensaje, lo que se lee].
const PUNTOS_DE_ATAQUE: readonly (readonly [string, string, string])[] = [
  ["mezcla de restos tras la ruta", "email:\u{00A0}\u{200B}\n", GENERICO],
  ["ruta muy larga", `${"a".repeat(300)}.0.${"b".repeat(300)}: ${M}`, M],
  ["ruta solo de dígitos", `123456: ${M}`, M],
  ["letra con marca combinante", `pa\u{0301}rametro: ${M}`, M],
  ["muchos niveles", `a.0.b.1.c.2.d.3.e.4.f.5.g.6.h: ${M}`, M],
  ["ruta doble con tabuladores", `contrasena:\tcontrasena:\t${M}`, M],
  ["ruta doble sin resto", "email: email:\u{200B}", GENERICO],
  ["nombre (solo se pinta al establecer)", `nombre: ${M}`, M],
  ["token (solo lo manda el registro de maestro y los enlaces)", `token: ${M}`, M],
  ["contrasena (el cambio obligatorio pinta contrasenaNueva)", `contrasena: ${M}`, M],
  ["contrasenaNueva (restablecer manda contrasena)", `contrasenaNueva: ${M}`, M],
  ["confirmacion (solo existe en el cliente)", `confirmacion: ${M}`, M],
  ["email repetido", `email: email: ${M}`, M],
  ["token sin texto visible", "token:\u{3000}\u{2060}", GENERICO],
]

const CASOS_DE_PUNTOS = NOMBRES.flatMap((nombre) =>
  PUNTOS_DE_ATAQUE.map(
    ([entrada, mensaje, esperado]) => [nombre, entrada, mensaje, esperado] as const,
  ),
)

describe("ataque CHORE-03 03c r1 · features/auth ante un VALIDACION que el formulario no espera", () => {
  it.each(CASOS_DE_LA_TABLA)(
    "%s con la entrada %s de la tabla común da un solo MensajeError legible; lo escrito se conserva",
    async (nombre, _titulo, mensaje, esperado) => {
      const { formulario, cliente } = await enviar(nombre, validacion(mensaje))

      await unSoloMensaje(formulario.titulo, esperado)
      await salioDeLaEspera(formulario, cliente)
      expect(peticionesA(formulario.ruta)).toBe(1)
      expect(inesperadas).toEqual([])
    },
  )

  it.each(CASOS_DE_PUNTOS)(
    "%s con %s («%s») da un solo MensajeError «%s», sin ErrorDeCampo ni aria-invalid",
    async (nombre, _entrada, mensaje, esperado) => {
      const { formulario, cliente } = await enviar(nombre, validacion(mensaje))

      await unSoloMensaje(formulario.titulo, esperado)
      await salioDeLaEspera(formulario, cliente)
      for (const ruta of [
        "email:",
        "token:",
        "nombre:",
        "contrasena",
        "confirmacion:",
        "123456:",
      ]) {
        expect(textoDeLaPantalla()).not.toContain(ruta)
      }
      expect(inesperadas).toEqual([])
    },
  )
})

// Códigos fijos de auth con un mensaje del servidor que parece ruta. Fuera de la matriz, los que no
// dan un MensajeError con su texto: ENLACE_INVALIDO reemplaza el formulario en los tres con enlace (va
// aparte), CAMBIO_NO_REQUERIDO en el cambio obligatorio avanza (lo hace el gancho), y
// CAMBIO_DE_CONTRASENA_REQUERIDO lo redirige apiClient (va aparte).
const CON_ENLACE: readonly NombreDeFormulario[] = [
  "registro de maestro por enlace",
  "restablecer contraseña",
  "establecer contraseña (invitación)",
]

const CASOS_DE_CODIGOS = NOMBRES.flatMap((nombre) =>
  Object.entries(MENSAJES_ERROR_AUTH)
    .filter(([codigo]) => !(codigo === "ENLACE_INVALIDO" && CON_ENLACE.includes(nombre)))
    .filter(
      ([codigo]) =>
        !(codigo === "CAMBIO_NO_REQUERIDO" && nombre === "cambio obligatorio de contraseña"),
    )
    .filter(([codigo]) => codigo !== "CAMBIO_DE_CONTRASENA_REQUERIDO")
    .map(([codigo, texto]) => [nombre, codigo, texto] as const),
)

describe("ataque CHORE-03 03c r1 · los códigos de auth nunca muestran el texto del servidor", () => {
  it.each(CASOS_DE_CODIGOS)(
    "%s con %s y el mensaje «email: …» del servidor da su texto fijo «%s»",
    async (nombre, codigo, texto) => {
      const { formulario, cliente } = await enviar(nombre, () =>
        errorApi(409, codigo, `email: ${M}`),
      )

      await unSoloMensaje(formulario.titulo, texto)
      await salioDeLaEspera(formulario, cliente)
      expect(textoDeLaPantalla()).not.toContain(M)
    },
  )

  it.each(
    NOMBRES.flatMap((nombre) =>
      [
        "ENLACE_USADO",
        "CONTRASENA_INCORRECTA",
        "CUENTA_BLOQUEADA",
        "ROL_NO_PERMITIDO",
        "NO_IMPLEMENTADO",
        "toString",
        "__proto__",
      ].map((codigo) => [nombre, codigo] as const),
    ),
  )("%s con el código %s, que auth no traduce, da el genérico", async (nombre, codigo) => {
    const { formulario, cliente } = await enviar(nombre, () =>
      errorApi(409, codigo, "token: texto técnico del servidor"),
    )

    await unSoloMensaje(formulario.titulo, GENERICO)
    await salioDeLaEspera(formulario, cliente)
    expect(textoDeLaPantalla()).not.toContain("texto técnico")
  })

  it.each(
    NOMBRES.flatMap((nombre) =>
      [
        ["fetch rechaza", () => Promise.reject(new TypeError("Failed to fetch"))],
        ["502 sin JSON", () => new Response("Bad Gateway", { status: 502 })],
      ].map(([caso, respuesta]) => [nombre, caso, respuesta] as const),
    ),
  )("%s sin conexión (%s) da el texto fijo de SIN_CONEXION", async (nombre, _caso, respuesta) => {
    if (typeof respuesta !== "function")
      throw new Error("Precondición: la respuesta es una función")
    const { formulario, cliente } = await enviar(nombre, respuesta)

    await unSoloMensaje(formulario.titulo, SIN_CONEXION)
    await salioDeLaEspera(formulario, cliente)
    expect(textoDeLaPantalla()).not.toContain("Failed to fetch")
    expect(textoDeLaPantalla()).not.toContain("Bad Gateway")
  })
})

describe("ataque CHORE-03 03c r1 · ENLACE_INVALIDO reemplaza el formulario con su texto fijo", () => {
  const TEXTO_DEL_ENLACE: Readonly<Record<string, string>> = {
    "registro de maestro por enlace": TEXTOS_REGISTRO_MAESTRO.enlaceInvalido,
    "restablecer contraseña": TEXTOS_NUEVA_CONTRASENA.recuperacion.enlaceInvalido,
    "establecer contraseña (invitación)": TEXTOS_NUEVA_CONTRASENA.invitacion.enlaceInvalido,
  }

  it.each(
    CON_ENLACE.flatMap((nombre) =>
      ["token: El enlace no es válido", "token: token: x", " ", "\u{200B}", "Enlace usado"].map(
        (mensaje) => [nombre, JSON.stringify(mensaje), mensaje] as const,
      ),
    ),
  )(
    "%s con ENLACE_INVALIDO y el mensaje %s: un solo MensajeError con el texto fijo, sin formulario",
    async (nombre, _titulo, mensaje) => {
      const esperado = TEXTO_DEL_ENLACE[nombre]
      if (esperado === undefined) throw new Error(`Precondición: ${nombre} tiene texto de enlace`)
      await enviar(nombre, () => errorApi(400, "ENLACE_INVALIDO", mensaje))

      await waitFor(() => expect(screen.queryByRole("form")).toBeNull())
      await unSoloMensaje("Error", esperado)
      expect(screen.queryByRole("button", { name: FORMULARIOS[nombre].boton })).toBeNull()
      expect(textoDeLaPantalla()).not.toContain("token:")
    },
  )
})

// S-08: las dos consultas de auth usan mensajeDeErrorAuth.
const RUTA_INVITACION = "/api/auth/invitacion"

describe("ataque CHORE-03 03c r1 · las consultas de S-08 (la invitación y /me)", () => {
  it.each([
    ["token: El enlace no es válido", "El enlace no es válido"],
    ["token: token: El enlace no es válido", "El enlace no es válido"],
    ["token:\u{200B}", GENERICO],
    ["token:", GENERICO],
    ["   ", GENERICO],
    [`token.0.valor: ${M}`, M],
  ] as const)(
    "la invitación con VALIDACION «%s»: un solo MensajeError «%s», sin formulario",
    async (mensaje, esperado) => {
      preparar("POST", RUTA_INVITACION, validacion(mensaje))
      montar(<EstablecerContrasenaView />, `/establecer-contrasena#token=${TOKEN}`)

      await unSoloMensaje("Error", esperado)
      expect(screen.queryByRole("button", { name: "Activar mi cuenta" })).toBeNull()
      expect(textoDeLaPantalla()).not.toContain("token")
      expect(peticionesA(RUTA_INVITACION)).toBe(1)
    },
  )

  it.each([
    ["ENLACE_INVALIDO", "token: x", TEXTOS_NUEVA_CONTRASENA.invitacion.enlaceInvalido],
    ["ENLACE_USADO", "token: x", GENERICO],
    ["CREDENCIALES_INVALIDAS", "token: x", MENSAJES_ERROR_AUTH.CREDENCIALES_INVALIDAS],
    ["ERROR_INTERNO", "Error: stack técnico", GENERICO],
  ] as const)(
    "la invitación con %s («%s»): un solo MensajeError «%s»",
    async (codigo, mensaje, esperado) => {
      preparar("POST", RUTA_INVITACION, () => errorApi(409, codigo, mensaje))
      montar(<EstablecerContrasenaView />, `/establecer-contrasena#token=${TOKEN}`)

      await unSoloMensaje("Error", esperado)
      expect(textoDeLaPantalla()).not.toContain("token:")
      expect(textoDeLaPantalla()).not.toContain("stack")
    },
  )

  it("la invitación sin conexión: el texto fijo de SIN_CONEXION", async () => {
    preparar("POST", RUTA_INVITACION, () => Promise.reject(new TypeError("Failed to fetch")))
    montar(<EstablecerContrasenaView />, `/establecer-contrasena#token=${TOKEN}`)

    await unSoloMensaje("Error", SIN_CONEXION)
  })

  it.each([
    ["VALIDACION", `x.y: ${M}`, M],
    ["VALIDACION", "x:\u{200B}\u{0085}", GENERICO],
    ["SESION_INVALIDA", "x: y", MENSAJES_ERROR_AUTH.SESION_INVALIDA],
    ["ROL_NO_PERMITIDO", "rol: texto del servidor", GENERICO],
  ] as const)(
    "«Acceso restringido» con /me en %s («%s»): un solo MensajeError «%s»",
    async (codigo, mensaje, esperado) => {
      preparar("GET", "/api/me", () => errorApi(409, codigo, mensaje))
      montar(<AccesoRestringidoView />, "/acceso-restringido")

      await unSoloMensaje(TEXTOS_SESION.tituloError, esperado)
      expect(textoDeLaPantalla()).not.toContain("texto del servidor")
      expect(textoDeLaPantalla()).not.toContain("x.y:")
    },
  )
})

describe("ataque CHORE-03 03c r1 · los errores que apiClient redirige siguen redirigiendo", () => {
  it("el cambio obligatorio con 403 ACCESO_RESTRINGIDO redirige a /acceso-restringido", async () => {
    await enviar("cambio obligatorio de contraseña", () =>
      errorApi(403, "ACCESO_RESTRINGIDO", "x: texto del servidor"),
    )

    await waitFor(() => expect(irA).toHaveBeenCalledWith("/acceso-restringido"))
    expect(textoDeLaPantalla()).not.toContain("texto del servidor")
  })

  it("iniciar sesión con /me en 403 CAMBIO_DE_CONTRASENA_REQUERIDO redirige a /cambiar-contrasena y da su texto fijo", async () => {
    preparar("GET", "/api/me", () =>
      errorApi(403, "CAMBIO_DE_CONTRASENA_REQUERIDO", "x: texto del servidor"),
    )
    const { formulario } = await enviar("iniciar sesión", () =>
      respuestaJson(200, { tokenAcceso: "token-nuevo" }),
    )

    await waitFor(() => expect(irA).toHaveBeenCalledWith("/cambiar-contrasena"))
    await unSoloMensaje(formulario.titulo, MENSAJES_ERROR_AUTH.CAMBIO_DE_CONTRASENA_REQUERIDO)
  })

  it("el cambio obligatorio con un 401 y el refresco rechazado manda a /login", async () => {
    preparar("POST", "/api/auth/refrescar", () => errorApi(401, "SESION_INVALIDA", "x: y"))
    await enviar("cambio obligatorio de contraseña", () =>
      errorApi(401, "NO_AUTENTICADO", "x: texto del servidor"),
    )

    await waitFor(() => expect(irA).toHaveBeenCalledWith("/login"))
    expect(textoDeLaPantalla()).not.toContain("texto del servidor")
  })
})

describe("ataque CHORE-03 03c r1 · el MensajeError de un envío anterior y el error local del siguiente", () => {
  it.each(NOMBRES.map((nombre) => [nombre] as const))(
    "%s: tras un VALIDACION del servidor, un envío que la validación local rechaza deja un solo mensaje (el error local), no también el MensajeError viejo",
    async (nombre) => {
      const { formulario, cliente } = await enviar(
        nombre,
        validacion(ENTRADAS_DE_FORMULARIO["campo-no-pintable"].mensaje),
      )
      await unSoloMensaje(formulario.titulo, M)
      await salioDeLaEspera(formulario, cliente)

      escribir(formulario.local)
      fireEvent.click(screen.getByRole("button", { name: formulario.boton }))
      await reposar()

      expect(peticionesA(formulario.ruta)).toBe(1)
      expect(document.querySelectorAll('[aria-invalid="true"]')).toHaveLength(1)
      expect(screen.queryAllByRole("alert")).toHaveLength(0)
      expect(textoDeLaPantalla()).not.toContain(M)
      expect(MENSAJE_CONFIRMACION_NO_COINCIDE.length).toBeGreaterThan(0)
    },
  )
})
