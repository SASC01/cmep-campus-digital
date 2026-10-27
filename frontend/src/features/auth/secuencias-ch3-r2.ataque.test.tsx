import { contarCaracteresVisibles } from "@campus/shared"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { StrictMode, type ReactNode } from "react"
import { MemoryRouter } from "react-router"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { ENTRADAS_DE_FORMULARIO, MENSAJE_DE_PRUEBA } from "@/lib/errores-de-api-fuera-de-contrato"
import { irA } from "@/services/navegacion"
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
  TEXTOS_NUEVA_CONTRASENA,
  TEXTOS_REGISTRO_MAESTRO,
} from "./data"

// Tester, ronda 2 de CHORE-03 03c. El remedio de T-05 en features/auth (`if (<m>.isError) <m>.reset()`
// después de la guarda isPending) ante secuencias que el programador no recorre: servidor → local →
// servidor → local alternados; local → servidor → local → local; dos rechazos locales seguidos por
// caminos distintos; los dos (o tres) caminos de rechazo local de restablecer, establecer y el cambio
// obligatorio, cada uno tras un error del servidor distinto; un rechazo local enviado con la petición en
// vuelo; CAMBIO_NO_REQUERIDO con la recarga de /me fallida o retenida (estado 10 de la adenda M-06);
// ENLACE_INVALIDO tras un error del servidor y tras un rechazo local (estado 9); y un código que
// apiClient redirige seguido de un reenvío antes de que irA recargue (estado 11). En cada paso, un solo
// mensaje: el del envío que la persona acaba de hacer. Servidor en memoria; reloj fijo (solo Date).

vi.mock("@/services/navegacion", () => ({ irA: vi.fn(), rutaActual: vi.fn(() => "/admin") }))
const aviso = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }))
vi.mock("sonner", () => ({ toast: aviso, Toaster: () => null }))

const AHORA = new Date("2030-01-10T12:00:00.000Z")
const GENERICO = MENSAJE_ERROR_AUTH_GENERICO
const M = MENSAJE_DE_PRUEBA
const TOKEN = "C".repeat(43)
const CLAVE = "clave-secreta-1234"
const CORTA = "corta"

const ME = {
  id: "5a5d7a3e-1c1f-4b8e-9a1e-0f2a3b4c5d6e",
  nombre: "Ana López",
  email: "ana@colegio.mx",
  rol: "estudiante",
  debeCambiarContrasena: false,
  accesoRestringido: false,
}

const respuestaJson = (estado: number, cuerpo: unknown) =>
  new Response(JSON.stringify(cuerpo), {
    status: estado,
    headers: { "Content-Type": "application/json" },
  })

const errorApi = (estado: number, codigo: string, mensaje: string) =>
  respuestaJson(estado, { error: { codigo, mensaje } })

type Respuesta = () => Response | Promise<Response>

interface Llamada {
  metodo: string
  ruta: string
}

let preparadas: { metodo: string; ruta: string; respuesta: Respuesta }[] = []
let llamadas: Llamada[] = []
let inesperadas: string[] = []

const preparar = (metodo: string, ruta: string, ...respuestas: Respuesta[]) => {
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

const montar = (elemento: ReactNode) => {
  const cliente = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  render(
    <QueryClientProvider client={cliente}>
      <MemoryRouter>{elemento}</MemoryRouter>
    </QueryClientProvider>,
  )
  return cliente
}

const reposar = async () => {
  await act(async () => {
    for (let i = 0; i < 6; i += 1) await new Promise((r) => setTimeout(r, 0))
  })
}

type Campos = readonly (readonly [string, string])[]

interface Formulario {
  elemento: () => ReactNode
  ruta: string
  boton: string
  titulo: string
  campos: Campos
  // Caminos de rechazo local, cada uno con lo que se escribe (sobre los campos válidos).
  locales: readonly (readonly [string, Campos])[]
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
    locales: [
      ["correo sin arroba", [["Correo", "no-es-un-correo"]]],
      ["contraseña vacía", [["Contraseña", ""]]],
    ],
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
    locales: [
      ["correo sin arroba", [["Correo", "no-es-un-correo"]]],
      ["contraseña corta", [["Contraseña", CORTA]]],
      ["nombre solo de espacios", [["Nombre completo", "   "]]],
    ],
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
    locales: [
      ["nombre solo de espacios", [["Nombre completo", "   "]]],
      ["correo sin arroba", [["Correo", "no-es-un-correo"]]],
      ["contraseña corta", [["Contraseña", CORTA]]],
    ],
  },
  "recuperar contraseña": {
    elemento: () => <FormularioRecuperar />,
    ruta: "/api/auth/recuperar",
    boton: "Enviar enlace",
    titulo: "Error",
    campos: [["Correo", "ana@colegio.mx"]],
    locales: [
      ["correo sin arroba", [["Correo", "no-es-un-correo"]]],
      ["correo vacío", [["Correo", ""]]],
    ],
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
    locales: [
      [
        "contraseña corta (esquema)",
        [
          ["Contraseña nueva", CORTA],
          ["Confirma la contraseña nueva", CORTA],
        ],
      ],
      ["confirmación distinta", [["Confirma la contraseña nueva", "otra-clave-9999"]]],
    ],
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
    locales: [
      ["nombre vacío", [["Nombre completo", ""]]],
      [
        "contraseña corta (esquema)",
        [
          ["Contraseña nueva", CORTA],
          ["Confirma la contraseña nueva", CORTA],
        ],
      ],
      ["confirmación distinta", [["Confirma la contraseña nueva", "otra-clave-9999"]]],
    ],
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
    locales: [
      ["confirmación distinta", [["Confirma la contraseña nueva", "otra-clave-9999"]]],
      [
        "contraseña corta (esquema)",
        [
          ["Contraseña nueva", CORTA],
          ["Confirma la contraseña nueva", CORTA],
        ],
      ],
    ],
  },
} as const satisfies Readonly<Record<string, Formulario>>

type NombreDeFormulario = keyof typeof FORMULARIOS
const NOMBRES = Object.keys(FORMULARIOS) as NombreDeFormulario[]

// [nombre, respuesta, lo que la persona lee].
type RechazoDelServidor = readonly [string, Respuesta, string]

const F1: RechazoDelServidor = [
  "F1",
  () => errorApi(400, "VALIDACION", ENTRADAS_DE_FORMULARIO["campo-no-pintable"].mensaje),
  M,
]
const F3: RechazoDelServidor = [
  "F3",
  () => errorApi(400, "VALIDACION", ENTRADAS_DE_FORMULARIO["sin-texto-visible"].mensaje),
  GENERICO,
]
const FIJO: RechazoDelServidor = [
  "DEMASIADOS_INTENTOS",
  () => errorApi(429, "DEMASIADOS_INTENTOS", "email: texto del servidor"),
  MENSAJES_ERROR_AUTH.DEMASIADOS_INTENTOS,
]
const RECHAZOS = [F1, F3, FIJO] as const

const escribir = (campos: Campos) => {
  for (const [etiqueta, valor] of campos) {
    fireEvent.change(screen.getByLabelText(etiqueta), { target: { value: valor } })
  }
}

const peticionesA = (ruta: string) =>
  llamadas.filter((llamada) => llamada.metodo === "POST" && llamada.ruta === ruta).length

const formularioDe = (nombre: NombreDeFormulario): Formulario => FORMULARIOS[nombre]

const botonDe = (formulario: Formulario) => screen.getByRole("button", { name: formulario.boton })

// Exactamente un MensajeError con su título y el texto esperado; ningún campo inválido ni aviso.
const soloElMensajeError = async (formulario: Formulario, esperado: string) => {
  await waitFor(() => {
    expect(screen.getAllByRole("alert")).toHaveLength(1)
    expect(screen.getByRole("alert").textContent).toBe(`${formulario.titulo}${esperado}`)
  })
  expect(contarCaracteresVisibles(esperado)).toBeGreaterThan(0)
  expect(document.querySelectorAll('[aria-invalid="true"]')).toHaveLength(0)
  expect(aviso.error).not.toHaveBeenCalled()
}

// Exactamente un campo inválido, con su ErrorDeCampo con texto; ningún role="alert", ni ahora ni
// después de dejar correr la cola (un resultado tardío no puede volver a pintar el error viejo).
const soloElErrorDeCampo = async () => {
  const comprobar = () => {
    expect(screen.queryAllByRole("alert")).toHaveLength(0)
    const invalidos = document.querySelectorAll('[aria-invalid="true"]')
    expect(invalidos).toHaveLength(1)
    const ids = (invalidos[0]?.getAttribute("aria-describedby") ?? "").split(" ")
    const idDelError = ids.find((id) => id.endsWith("-error"))
    expect(idDelError, "el campo inválido apunta a su ErrorDeCampo").toBeDefined()
    const texto = document.getElementById(idDelError ?? "")?.textContent ?? ""
    expect(contarCaracteresVisibles(texto)).toBeGreaterThan(0)
  }
  comprobar()
  await reposar()
  comprobar()
  expect(aviso.error).not.toHaveBeenCalled()
}

const enReposo = async (formulario: Formulario, cliente: QueryClient) => {
  await waitFor(() => expect(cliente.isMutating()).toBe(0))
  await waitFor(() => expect(botonDe(formulario)).not.toHaveAttribute("aria-busy", "true"))
  expect(botonDe(formulario)).not.toHaveAttribute("aria-disabled", "true")
}

const conservaLoEscrito = (campos: Campos) => {
  for (const [etiqueta, valor] of campos) {
    expect(screen.getByLabelText(etiqueta)).toHaveValue(valor)
  }
}

// Un envío válido que el servidor rechaza: una petición más y solo su MensajeError.
const pasoDelServidor = async (
  formulario: Formulario,
  cliente: QueryClient,
  rechazo: RechazoDelServidor,
  peticionesEsperadas: number,
) => {
  preparar("POST", formulario.ruta, rechazo[1])
  escribir(formulario.campos)
  fireEvent.click(botonDe(formulario))
  await waitFor(() => expect(peticionesA(formulario.ruta)).toBe(peticionesEsperadas))
  await soloElMensajeError(formulario, rechazo[2])
  await enReposo(formulario, cliente)
  conservaLoEscrito(formulario.campos)
}

// Un envío que la validación local rechaza: ninguna petición más y solo su ErrorDeCampo.
const pasoLocal = async (
  formulario: Formulario,
  campos: Campos,
  peticionesEsperadas: number,
  textosQueNoQuedan: readonly string[],
) => {
  escribir(formulario.campos)
  escribir(campos)
  fireEvent.click(botonDe(formulario))
  await soloElErrorDeCampo()
  expect(peticionesA(formulario.ruta)).toBe(peticionesEsperadas)
  for (const texto of textosQueNoQuedan) expect(document.body.textContent).not.toContain(texto)
  conservaLoEscrito(campos)
  expect(botonDe(formulario)).not.toHaveAttribute("aria-busy", "true")
}

const localDe = (formulario: Formulario, indice: number): Campos => {
  const local = formulario.locales[indice % formulario.locales.length]
  if (local === undefined) throw new Error("Precondición: el formulario tiene un rechazo local")
  return local[1]
}

const iniciar = async (nombre: NombreDeFormulario) => {
  const formulario = formularioDe(nombre)
  const cliente = montar(formulario.elemento())
  await screen.findByRole("button", { name: formulario.boton })
  return { formulario, cliente }
}

describe("ataque CHORE-03 03c r2 · features/auth: secuencias largas con el remedio de T-05", () => {
  it("precondición: los siete formularios tienen al menos dos caminos de rechazo local", () => {
    expect(NOMBRES).toHaveLength(7)
    for (const nombre of NOMBRES) {
      expect(formularioDe(nombre).locales.length, nombre).toBeGreaterThanOrEqual(2)
    }
  })

  it.each(NOMBRES.map((nombre) => [nombre] as const))(
    "%s: servidor (F1) → local → servidor (código fijo) → otro local → servidor (F3) → local: en cada paso un solo mensaje, el del envío recién hecho, y solo los envíos válidos llegan al servidor",
    async (nombre) => {
      const { formulario, cliente } = await iniciar(nombre)

      await pasoDelServidor(formulario, cliente, F1, 1)
      await pasoLocal(formulario, localDe(formulario, 0), 1, [M])
      await pasoDelServidor(formulario, cliente, FIJO, 2)
      await pasoLocal(formulario, localDe(formulario, 1), 2, [FIJO[2]])
      await pasoDelServidor(formulario, cliente, F3, 3)
      await pasoLocal(formulario, localDe(formulario, 0), 3, [GENERICO])

      expect(inesperadas).toEqual([])
    },
  )

  it.each(NOMBRES.map((nombre) => [nombre] as const))(
    "%s: local → servidor (F1) → local → otro local seguido: el segundo rechazo local tampoco trae de vuelta el MensajeError",
    async (nombre) => {
      const { formulario, cliente } = await iniciar(nombre)

      await pasoLocal(formulario, localDe(formulario, 0), 0, [])
      await pasoDelServidor(formulario, cliente, F1, 1)
      await pasoLocal(formulario, localDe(formulario, 0), 1, [M])
      await pasoLocal(formulario, localDe(formulario, 1), 1, [M])

      expect(inesperadas).toEqual([])
    },
  )

  it.each(
    NOMBRES.flatMap((nombre) => RECHAZOS.map((rechazo) => [nombre, rechazo[0], rechazo] as const)),
  )(
    "%s: tras %s, un rechazo local enviado con la petición siguiente en vuelo (submit del formulario) no pide ni pinta nada; al soltarla con F1 queda un solo MensajeError y el rechazo local siguiente deja solo el ErrorDeCampo",
    async (nombre, _rechazo, rechazo) => {
      const { formulario, cliente } = await iniciar(nombre)
      await pasoDelServidor(formulario, cliente, rechazo, 1)

      const soltar: ((respuesta: Response) => void)[] = []
      preparar(
        "POST",
        formulario.ruta,
        () =>
          new Promise<Response>((resolver) => {
            soltar.push(resolver)
          }),
      )
      escribir(formulario.campos)
      fireEvent.click(botonDe(formulario))
      await waitFor(() => expect(peticionesA(formulario.ruta)).toBe(2))
      await waitFor(() => expect(botonDe(formulario)).toHaveAttribute("aria-busy", "true"))
      expect(screen.queryAllByRole("alert")).toHaveLength(0)

      escribir(localDe(formulario, 0))
      const elFormulario = botonDe(formulario).closest("form")
      if (elFormulario === null) throw new Error("Precondición: el botón está en un formulario")
      fireEvent.submit(elFormulario)
      await reposar()
      expect(peticionesA(formulario.ruta)).toBe(2)
      expect(document.querySelectorAll('[aria-invalid="true"]')).toHaveLength(0)
      expect(screen.queryAllByRole("alert")).toHaveLength(0)

      const liberar = soltar[0]
      if (liberar === undefined) throw new Error("Precondición: la petición retenida salió")
      liberar(errorApi(400, "VALIDACION", ENTRADAS_DE_FORMULARIO["campo-no-pintable"].mensaje))
      await soloElMensajeError(formulario, M)
      await enReposo(formulario, cliente)

      fireEvent.click(botonDe(formulario))
      await soloElErrorDeCampo()
      expect(peticionesA(formulario.ruta)).toBe(2)
      expect(document.body.textContent).not.toContain(M)
      expect(inesperadas).toEqual([])
    },
  )
})

const CON_VARIOS_CAMINOS: readonly NombreDeFormulario[] = [
  "restablecer contraseña",
  "establecer contraseña (invitación)",
  "cambio obligatorio de contraseña",
]

describe("ataque CHORE-03 03c r2 · los caminos de rechazo local de restablecer, establecer y el cambio obligatorio", () => {
  it.each(
    CON_VARIOS_CAMINOS.flatMap((nombre) =>
      formularioDe(nombre).locales.flatMap(([camino], indice) =>
        RECHAZOS.map((rechazo) => [nombre, camino, rechazo[0], indice, rechazo] as const),
      ),
    ),
  )(
    "%s: el camino «%s» tras %s deja solo su ErrorDeCampo, con las contraseñas conservadas; repetirlo deja lo mismo",
    async (nombre, _camino, _rechazo, indice, rechazo) => {
      const { formulario, cliente } = await iniciar(nombre)
      await pasoDelServidor(formulario, cliente, rechazo, 1)

      await pasoLocal(formulario, localDe(formulario, indice), 1, [rechazo[2]])
      await pasoLocal(formulario, localDe(formulario, indice), 1, [rechazo[2]])
      expect(inesperadas).toEqual([])
    },
  )

  it.each(CON_VARIOS_CAMINOS.map((nombre) => [nombre] as const))(
    "%s: todos los caminos alternados con errores del servidor (servidor → camino 1 → servidor → camino 2 → …): nunca dos mensajes",
    async (nombre) => {
      const { formulario, cliente } = await iniciar(nombre)
      let peticiones = 0
      for (const [indice] of formulario.locales.entries()) {
        const rechazo = RECHAZOS[indice % RECHAZOS.length] ?? F1
        peticiones += 1
        await pasoDelServidor(formulario, cliente, rechazo, peticiones)
        await pasoLocal(formulario, localDe(formulario, indice), peticiones, [rechazo[2]])
      }
      expect(peticiones).toBe(formulario.locales.length)
      expect(inesperadas).toEqual([])
    },
  )
})

describe("ataque CHORE-03 03c r2 · estado 10: CAMBIO_NO_REQUERIDO con la recarga de /me fallida", () => {
  const CAMBIO: Formulario = FORMULARIOS["cambio obligatorio de contraseña"]
  const CAMBIO_NO_REQUERIDO = () =>
    errorApi(409, "CAMBIO_NO_REQUERIDO", "contrasenaNueva: texto del servidor")

  it.each([
    ["/me en 500", () => errorApi(500, "ERROR_INTERNO", "x: texto de /me")],
    ["/me sin conexión", () => Promise.reject(new TypeError("Failed to fetch"))],
    [
      "/me en 403 CAMBIO_DE_CONTRASENA_REQUERIDO (otra carrera)",
      () => errorApi(403, "CAMBIO_DE_CONTRASENA_REQUERIDO", "x: texto de /me"),
    ],
  ] as const)(
    "con %s: queda solo el texto fijo de CAMBIO_NO_REQUERIDO; los dos rechazos locales siguientes dejan solo su ErrorDeCampo; repetir manda otra petición",
    async (_me, respuestaDeMe) => {
      preparar("GET", "/api/me", respuestaDeMe)
      const { formulario, cliente } = await iniciar("cambio obligatorio de contraseña")
      preparar("POST", CAMBIO.ruta, CAMBIO_NO_REQUERIDO)
      escribir(formulario.campos)
      fireEvent.click(botonDe(formulario))

      await soloElMensajeError(formulario, MENSAJES_ERROR_AUTH.CAMBIO_NO_REQUERIDO)
      await enReposo(formulario, cliente)
      expect(llamadas.filter((llamada) => llamada.ruta === "/api/me")).toHaveLength(1)
      expect(document.body.textContent).not.toContain("texto")

      await pasoLocal(formulario, localDe(formulario, 0), 1, [
        MENSAJES_ERROR_AUTH.CAMBIO_NO_REQUERIDO,
      ])
      await pasoLocal(formulario, localDe(formulario, 1), 1, [
        MENSAJES_ERROR_AUTH.CAMBIO_NO_REQUERIDO,
      ])
      await pasoDelServidor(formulario, cliente, F1, 2)
      expect(inesperadas).toEqual([])
    },
  )

  it("con /me retenido: mientras recarga, el botón sigue en espera y un rechazo local por submit no pide ni pinta nada; al fallar /me queda solo el texto fijo, y el rechazo local siguiente lo quita", async () => {
    const soltar: ((respuesta: Response) => void)[] = []
    preparar(
      "GET",
      "/api/me",
      () =>
        new Promise<Response>((resolver) => {
          soltar.push(resolver)
        }),
    )
    const { formulario, cliente } = await iniciar("cambio obligatorio de contraseña")
    preparar("POST", CAMBIO.ruta, CAMBIO_NO_REQUERIDO)
    escribir(formulario.campos)
    fireEvent.click(botonDe(formulario))

    await waitFor(() => expect(soltar).toHaveLength(1))
    await reposar()
    expect(botonDe(formulario)).toHaveAttribute("aria-busy", "true")
    expect(screen.queryAllByRole("alert")).toHaveLength(0)

    escribir(localDe(formulario, 0))
    const elFormulario = botonDe(formulario).closest("form")
    if (elFormulario === null) throw new Error("Precondición: el botón está en un formulario")
    fireEvent.submit(elFormulario)
    await reposar()
    expect(peticionesA(CAMBIO.ruta)).toBe(1)
    expect(document.querySelectorAll('[aria-invalid="true"]')).toHaveLength(0)
    expect(screen.queryAllByRole("alert")).toHaveLength(0)

    const liberar = soltar[0]
    if (liberar === undefined) throw new Error("Precondición: /me retenido salió")
    liberar(errorApi(500, "ERROR_INTERNO", "x: texto de /me"))
    await soloElMensajeError(formulario, MENSAJES_ERROR_AUTH.CAMBIO_NO_REQUERIDO)
    await enReposo(formulario, cliente)

    fireEvent.click(botonDe(formulario))
    await soloElErrorDeCampo()
    expect(peticionesA(CAMBIO.ruta)).toBe(1)
    expect(document.body.textContent).not.toContain(MENSAJES_ERROR_AUTH.CAMBIO_NO_REQUERIDO)
    expect(inesperadas).toEqual([])
  })
})

const CON_ENLACE = [
  ["registro de maestro por enlace", TEXTOS_REGISTRO_MAESTRO.enlaceInvalido],
  ["restablecer contraseña", TEXTOS_NUEVA_CONTRASENA.recuperacion.enlaceInvalido],
  ["establecer contraseña (invitación)", TEXTOS_NUEVA_CONTRASENA.invitacion.enlaceInvalido],
] as const

describe("ataque CHORE-03 03c r2 · estado 9: ENLACE_INVALIDO tras otros mensajes", () => {
  it.each(CON_ENLACE)(
    "%s: local → servidor (F1) → local → ENLACE_INVALIDO: queda solo el texto fijo del enlace, sin formulario, sin campo inválido y sin otra petición",
    async (nombre, textoDelEnlace) => {
      const { formulario, cliente } = await iniciar(nombre)
      await pasoLocal(formulario, localDe(formulario, 0), 0, [])
      await pasoDelServidor(formulario, cliente, F1, 1)
      await pasoLocal(formulario, localDe(formulario, 1), 1, [M])

      preparar("POST", formulario.ruta, () =>
        errorApi(400, "ENLACE_INVALIDO", "token: texto del servidor"),
      )
      escribir(formulario.campos)
      fireEvent.click(botonDe(formulario))

      await waitFor(() => {
        expect(screen.getAllByRole("alert")).toHaveLength(1)
        expect(screen.getByRole("alert")).toHaveTextContent(textoDelEnlace)
      })
      await reposar()
      expect(screen.getAllByRole("alert")).toHaveLength(1)
      expect(screen.queryByRole("button", { name: formulario.boton })).toBeNull()
      expect(document.querySelectorAll('[aria-invalid="true"]')).toHaveLength(0)
      expect(document.body.textContent).not.toContain(M)
      expect(document.body.textContent).not.toContain("texto del servidor")
      expect(peticionesA(formulario.ruta)).toBe(2)
      expect(aviso.error).not.toHaveBeenCalled()
      expect(inesperadas).toEqual([])
    },
  )
})

describe("ataque CHORE-03 03c r2 · estado 11: un código que apiClient redirige y un reenvío antes de que irA recargue", () => {
  it.each([
    [
      "cambio obligatorio de contraseña",
      "403 ACCESO_RESTRINGIDO",
      () => errorApi(403, "ACCESO_RESTRINGIDO", "x: texto del servidor"),
      "/acceso-restringido",
    ],
    [
      "recuperar contraseña",
      "403 CAMBIO_DE_CONTRASENA_REQUERIDO",
      () => errorApi(403, "CAMBIO_DE_CONTRASENA_REQUERIDO", "x: texto del servidor"),
      "/cambiar-contrasena",
    ],
    [
      "registro de estudiante",
      "403 ACCESO_RESTRINGIDO",
      () => errorApi(403, "ACCESO_RESTRINGIDO", "x: texto del servidor"),
      "/acceso-restringido",
    ],
  ] as const)(
    "%s con %s: irA a %s; el rechazo local siguiente deja solo el ErrorDeCampo y el reenvío válido manda otra petición con un solo MensajeError",
    async (nombre, _codigo, respuesta, destino) => {
      const { formulario, cliente } = await iniciar(nombre)
      preparar("POST", formulario.ruta, respuesta)
      escribir(formulario.campos)
      fireEvent.click(botonDe(formulario))
      await waitFor(() => expect(irA).toHaveBeenCalledWith(destino))
      await enReposo(formulario, cliente)
      expect(screen.queryAllByRole("alert").length).toBeLessThanOrEqual(1)
      expect(document.body.textContent).not.toContain("texto del servidor")

      await pasoLocal(formulario, localDe(formulario, 0), 1, ["texto del servidor"])
      expect(document.body.textContent).not.toContain(GENERICO)
      await pasoDelServidor(formulario, cliente, F1, 2)
      expect(inesperadas).toEqual([])
    },
  )

  it("iniciar sesión con /me en 403 CAMBIO_DE_CONTRASENA_REQUERIDO: irA y el texto fijo; el rechazo local siguiente lo quita; el reenvío válido vuelve a pedir el login", async () => {
    preparar("GET", "/api/me", () =>
      errorApi(403, "CAMBIO_DE_CONTRASENA_REQUERIDO", "x: texto del servidor"),
    )
    const { formulario, cliente } = await iniciar("iniciar sesión")
    preparar("POST", formulario.ruta, () => respuestaJson(200, { tokenAcceso: "token-nuevo" }))
    escribir(formulario.campos)
    fireEvent.click(botonDe(formulario))
    await waitFor(() => expect(irA).toHaveBeenCalledWith("/cambiar-contrasena"))
    await soloElMensajeError(formulario, MENSAJES_ERROR_AUTH.CAMBIO_DE_CONTRASENA_REQUERIDO)
    await enReposo(formulario, cliente)

    await pasoLocal(formulario, localDe(formulario, 1), 1, [
      MENSAJES_ERROR_AUTH.CAMBIO_DE_CONTRASENA_REQUERIDO,
    ])
    await pasoDelServidor(formulario, cliente, F1, 2)
    expect(inesperadas).toEqual([])
  })

  it("cambio obligatorio con un 401 y el refresco rechazado: irA a /login; el rechazo local siguiente deja solo el ErrorDeCampo", async () => {
    preparar("POST", "/api/auth/refrescar", () => errorApi(401, "SESION_INVALIDA", "x: y"))
    const { formulario, cliente } = await iniciar("cambio obligatorio de contraseña")
    preparar("POST", formulario.ruta, () =>
      errorApi(401, "NO_AUTENTICADO", "x: texto del servidor"),
    )
    escribir(formulario.campos)
    fireEvent.click(botonDe(formulario))
    await waitFor(() => expect(irA).toHaveBeenCalledWith("/login"))
    await enReposo(formulario, cliente)
    expect(screen.queryAllByRole("alert").length).toBeLessThanOrEqual(1)

    await pasoLocal(formulario, localDe(formulario, 1), 1, ["texto del servidor"])
    expect(inesperadas).toEqual([])
  })
})

describe("ataque CHORE-03 03c r2 · features/auth dentro de StrictMode (como main.tsx)", () => {
  it.each(NOMBRES.map((nombre) => [nombre] as const))(
    "%s: servidor (F1) → local → servidor (F3) → otro local: un solo mensaje en cada paso y una petición por envío válido",
    async (nombre) => {
      const formulario = formularioDe(nombre)
      const cliente = montar(<StrictMode>{formulario.elemento()}</StrictMode>)
      await screen.findByRole("button", { name: formulario.boton })

      await pasoDelServidor(formulario, cliente, F1, 1)
      await pasoLocal(formulario, localDe(formulario, 0), 1, [M])
      await pasoDelServidor(formulario, cliente, F3, 2)
      await pasoLocal(formulario, localDe(formulario, 1), 2, [GENERICO])
      expect(inesperadas).toEqual([])
    },
  )
})
