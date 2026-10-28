import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import type { ReactNode } from "react"
import { MemoryRouter, Route, Routes, useLocation } from "react-router"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import {
  CAMPO_FUERA_DE_CONTRATO,
  ENTRADAS_DE_FORMULARIO,
  MENSAJE_DE_PRUEBA,
} from "@/lib/errores-de-api-fuera-de-contrato"
import { establecerToken, limpiarToken } from "@/services/tokenAcceso"

import { FormularioCambiarContrasena } from "./components/formulario-cambiar-contrasena"
import { FormularioLogin } from "./components/formulario-login"
import { FormularioNuevaContrasena } from "./components/formulario-nueva-contrasena"
import { FormularioRecuperar } from "./components/formulario-recuperar"
import { FormularioRegistro } from "./components/formulario-registro"
import { FormularioRegistroMaestro } from "./components/formulario-registro-maestro"
import {
  MENSAJES_ERROR_AUTH,
  RUTA_POR_ROL,
  TEXTOS_NUEVA_CONTRASENA,
  TEXTOS_RECUPERAR,
} from "./data"

// CHORE-03 (03c): los formularios de features/auth ante un 400 VALIDACION fuera de contrato (F1 campo
// no pintable, F3 sin texto visible y sin ruta, F4 ruta de tres niveles) y ante un VALIDACION de un
// campo que el formulario pinta (en algún modo): auth nunca asocia un error del servidor a un campo,
// así que todos van al MensajeError del formulario. En cada caso: exactamente un MensajeError legible,
// sin toast ni ErrorDeCampo, sin la ruta ni un texto invisible; lo escrito se conserva (también las
// contraseñas) y el botón sale de la espera. Una sola función de montaje y una prueba parametrizada
// por formulario (indicación del humano, 2026-10-26). El servidor es un doble en memoria; sin fechas.

vi.mock("@/services/navegacion", () => ({ irA: vi.fn(), rutaActual: vi.fn(() => "/") }))
const aviso = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }))
vi.mock("sonner", () => ({ toast: aviso, Toaster: () => null }))

const GENERICO = "No pudimos completar la operación. Inténtalo de nuevo."
const TOKEN = "C".repeat(43)
const CLAVE = "clave-secreta-1234"

const ME = {
  id: "5a5d7a3e-1c1f-4b8e-9a1e-0f2a3b4c5d6e",
  nombre: "Ana López",
  email: "ana@colegio.mx",
  rol: "maestro",
  debeCambiarContrasena: false,
  accesoRestringido: false,
}

const respuestaJson = (estado: number, cuerpo: unknown) =>
  new Response(JSON.stringify(cuerpo), {
    status: estado,
    headers: { "Content-Type": "application/json" },
  })

const sinContenido = () => new Response(null, { status: 204 })

const errorApi = (estado: number, codigo: string, mensaje: string) =>
  respuestaJson(estado, { error: { codigo, mensaje } })

interface Llamada {
  metodo: string
  ruta: string
}

// La petición del formulario se responde con `respuestas` (en orden); /api/me, con la cuenta.
let rutaDelFormulario = ""
let respuestas: (() => Response | Promise<Response>)[] = []
let llamadas: Llamada[] = []
let inesperadas: string[] = []

beforeEach(() => {
  establecerToken("token-de-prueba")
  rutaDelFormulario = ""
  respuestas = []
  llamadas = []
  inesperadas = []
  vi.stubGlobal(
    "fetch",
    vi.fn<typeof fetch>((entrada, init) => {
      const llamada = { metodo: init?.method ?? "GET", ruta: String(entrada) }
      llamadas.push(llamada)
      if (llamada.metodo === "POST" && llamada.ruta === rutaDelFormulario) {
        const siguiente = respuestas.shift()
        if (siguiente !== undefined) return Promise.resolve(siguiente())
        inesperadas.push(`${llamada.metodo} ${llamada.ruta} sin respuesta preparada`)
        return Promise.resolve(errorApi(500, "ERROR_INTERNO", "no esperada"))
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

interface Formulario {
  elemento: () => ReactNode
  ruta: string
  boton: string
  titulo: string
  // Etiqueta del campo → lo que se escribe en él.
  campos: readonly (readonly [string, string])[]
  // Un campo que el formulario pinta (en este modo o en otro): el servidor lo nombra y aun así el
  // error va al MensajeError, porque auth no asocia errores del servidor a campos.
  campoPintado: string
  exito: () => Response
}

const FORMULARIOS: Readonly<Record<string, Formulario>> = {
  "iniciar sesión": {
    elemento: () => <FormularioLogin />,
    ruta: "/api/auth/login",
    boton: "Iniciar sesión",
    titulo: "No pudimos iniciar sesión",
    campos: [
      ["Correo", "ana@colegio.mx"],
      ["Contraseña", CLAVE],
    ],
    campoPintado: "email",
    exito: () => respuestaJson(200, { tokenAcceso: "token-nuevo" }),
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
    campoPintado: "nombre",
    exito: () => respuestaJson(201, { tokenAcceso: "token-nuevo" }),
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
    campoPintado: "contrasena",
    exito: () => respuestaJson(201, { tokenAcceso: "token-nuevo" }),
  },
  "recuperar contraseña": {
    elemento: () => <FormularioRecuperar />,
    ruta: "/api/auth/recuperar",
    boton: "Enviar enlace",
    titulo: "Error",
    campos: [["Correo", "ana@colegio.mx"]],
    campoPintado: "email",
    exito: sinContenido,
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
    // «nombre» solo se pinta al establecer (invitación): en este modo no se pinta.
    campoPintado: "nombre",
    exito: sinContenido,
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
    campoPintado: "nombre",
    exito: sinContenido,
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
    campoPintado: "contrasenaNueva",
    exito: sinContenido,
  },
}

const NOMBRES = Object.keys(FORMULARIOS)

const formularioDe = (nombre: string): Formulario => {
  const formulario = FORMULARIOS[nombre]
  if (formulario === undefined) throw new Error(`Precondición: existe el formulario ${nombre}`)
  return formulario
}

// Las entradas de cada caso: [nombre de la entrada, mensaje del servidor, lo que la persona lee].
const entradasDe = (formulario: Formulario): readonly (readonly [string, string, string])[] => [
  [
    "F1 campo no pintable",
    ENTRADAS_DE_FORMULARIO["campo-no-pintable"].mensaje,
    ENTRADAS_DE_FORMULARIO["campo-no-pintable"].resto ?? GENERICO,
  ],
  [
    "F3 sin texto visible",
    ENTRADAS_DE_FORMULARIO["sin-texto-visible"].mensaje,
    ENTRADAS_DE_FORMULARIO["sin-texto-visible"].resto ?? GENERICO,
  ],
  [
    "F4 ruta de tres niveles",
    ENTRADAS_DE_FORMULARIO.ruta.mensaje,
    ENTRADAS_DE_FORMULARIO.ruta.resto ?? GENERICO,
  ],
  [
    `campo pintado ${formulario.campoPintado}`,
    `${formulario.campoPintado}: ${MENSAJE_DE_PRUEBA}`,
    MENSAJE_DE_PRUEBA,
  ],
]

const CASOS = NOMBRES.flatMap((nombre) =>
  entradasDe(formularioDe(nombre)).map(
    ([entrada, mensaje, esperado]) => [nombre, entrada, mensaje, esperado] as const,
  ),
)

const llenarYEnviar = async (formulario: Formulario) => {
  const boton = await screen.findByRole("button", { name: formulario.boton })
  for (const [etiqueta, valor] of formulario.campos) {
    fireEvent.change(screen.getByLabelText(etiqueta), { target: { value: valor } })
  }
  fireEvent.click(boton)
}

const peticionesDelFormulario = (formulario: Formulario) =>
  llamadas.filter((llamada) => llamada.metodo === "POST" && llamada.ruta === formulario.ruta).length

// (a) exactamente un mensaje legible, el MensajeError; (b) sin ruta ni texto invisible; (c) lo escrito
// se conserva; (d) el botón sale de la espera.
const comprobarUnSoloMensaje = async (formulario: Formulario, esperado: string) => {
  const alerta = await screen.findByRole("alert")
  expect(screen.getAllByRole("alert")).toHaveLength(1)
  expect(alerta.textContent).toBe(`${formulario.titulo}${esperado}`)
  expect(alerta).not.toHaveTextContent(CAMPO_FUERA_DE_CONTRATO)
  expect(alerta).not.toHaveTextContent("archivoIds")
  expect(alerta).not.toHaveTextContent(`${formulario.campoPintado}:`)
  expect(document.querySelectorAll('[aria-invalid="true"]')).toHaveLength(0)
  expect(aviso.error).not.toHaveBeenCalled()
  expect(aviso.success).not.toHaveBeenCalled()
  for (const [etiqueta, valor] of formulario.campos) {
    expect(screen.getByLabelText(etiqueta)).toHaveValue(valor)
  }
  const boton = screen.getByRole("button", { name: formulario.boton })
  await waitFor(() => expect(boton).not.toHaveAttribute("aria-busy", "true"))
  expect(boton).not.toHaveAttribute("aria-disabled", "true")
}

describe("CHORE-03 · formularios de features/auth ante un VALIDACION fuera de contrato", () => {
  it.each(CASOS)(
    "CH3-C03: %s con %s («%s») da un solo MensajeError legible, sin toast ni ErrorDeCampo; lo escrito se conserva y el botón sale de la espera",
    async (nombre, _entrada, mensaje, esperado) => {
      const formulario = formularioDe(nombre)
      rutaDelFormulario = formulario.ruta
      respuestas = [() => errorApi(400, "VALIDACION", mensaje)]
      const cliente = montar(formulario.elemento())

      await llenarYEnviar(formulario)

      await comprobarUnSoloMensaje(formulario, esperado)
      await waitFor(() => expect(cliente.isMutating()).toBe(0))
      expect(peticionesDelFormulario(formulario)).toBe(1)
      expect(inesperadas).toEqual([])
    },
  )

  it.each(NOMBRES.map((nombre) => [nombre] as const))(
    "CH3-C03: %s, tras F3, repetir el control con una respuesta buena manda una petición nueva y quita la alerta",
    async (nombre) => {
      const formulario = formularioDe(nombre)
      rutaDelFormulario = formulario.ruta
      respuestas = [
        () => errorApi(400, "VALIDACION", ENTRADAS_DE_FORMULARIO["sin-texto-visible"].mensaje),
        formulario.exito,
      ]
      const cliente = montar(formulario.elemento())

      await llenarYEnviar(formulario)
      await comprobarUnSoloMensaje(formulario, GENERICO)

      fireEvent.click(screen.getByRole("button", { name: formulario.boton }))

      await waitFor(() => expect(peticionesDelFormulario(formulario)).toBe(2))
      await waitFor(() => expect(cliente.isMutating()).toBe(0))
      await waitFor(() => expect(screen.queryByRole("alert")).toBeNull())
      expect(respuestas).toHaveLength(0)
      expect(aviso.error).not.toHaveBeenCalled()
      expect(inesperadas).toEqual([])
    },
  )
})

// Enmienda 5 (T-05, 03c ronda 2): tras un rechazo del servidor, el envío siguiente que la validación
// local rechaza deja un solo mensaje, el error local (§D-4: `if (<m>.isError) <m>.reset()` después de
// la guarda isPending). Lo contrario (local y después servidor) deja solo el MensajeError, y lo que no
// debía cambiar sigue igual: dos errores del servidor seguidos y la petición en vuelo. Con rutas, para
// comprobar el destino de siempre tras la respuesta buena.

type Campos = Formulario["campos"]
type RespuestaDelDoble = () => Response | Promise<Response>

// [nombre del rechazo, respuesta del servidor, lo que la persona lee].
type RechazoDelServidor = readonly [string, RespuestaDelDoble, string]

const F1: RechazoDelServidor = [
  "F1 campo no pintable",
  () => errorApi(400, "VALIDACION", ENTRADAS_DE_FORMULARIO["campo-no-pintable"].mensaje),
  MENSAJE_DE_PRUEBA,
]
const F3: RechazoDelServidor = [
  "F3 sin texto visible",
  () => errorApi(400, "VALIDACION", ENTRADAS_DE_FORMULARIO["sin-texto-visible"].mensaje),
  GENERICO,
]
const CODIGO_FIJO: RechazoDelServidor = [
  "DEMASIADOS_INTENTOS con texto fijo",
  () => errorApi(429, "DEMASIADOS_INTENTOS", "email: texto del servidor"),
  MENSAJES_ERROR_AUTH.DEMASIADOS_INTENTOS,
]
const RECHAZOS_DEL_SERVIDOR: readonly RechazoDelServidor[] = [F1, F3, CODIGO_FIJO]

const CORTA = "corta1"
const DISTINTA = "otra-clave-5678"

// [formulario, nombre del rechazo local, lo que se escribe para provocarlo].
const RECHAZOS_LOCALES: readonly (readonly [string, string, Campos])[] = [
  ["iniciar sesión", "correo sin arroba", [["Correo", "ana-sin-arroba"]]],
  ["registro de estudiante", "contraseña corta", [["Contraseña", CORTA]]],
  ["registro de maestro por enlace", "nombre solo de espacios", [["Nombre completo", "   "]]],
  ["recuperar contraseña", "correo sin arroba", [["Correo", "ana-sin-arroba"]]],
  [
    "restablecer contraseña",
    "contraseña corta",
    [
      ["Contraseña nueva", CORTA],
      ["Confirma la contraseña nueva", CORTA],
    ],
  ],
  ["restablecer contraseña", "confirmación distinta", [["Confirma la contraseña nueva", DISTINTA]]],
  ["establecer contraseña (invitación)", "nombre vacío", [["Nombre completo", ""]]],
  [
    "establecer contraseña (invitación)",
    "contraseña corta",
    [
      ["Contraseña nueva", CORTA],
      ["Confirma la contraseña nueva", CORTA],
    ],
  ],
  [
    "establecer contraseña (invitación)",
    "confirmación distinta",
    [["Confirma la contraseña nueva", DISTINTA]],
  ],
  [
    "cambio obligatorio de contraseña",
    "contraseña corta",
    [
      ["Contraseña nueva", CORTA],
      ["Confirma la contraseña nueva", CORTA],
    ],
  ],
  [
    "cambio obligatorio de contraseña",
    "confirmación distinta",
    [["Confirma la contraseña nueva", DISTINTA]],
  ],
]

const CASOS_SERVIDOR_Y_LOCAL = RECHAZOS_LOCALES.flatMap(([nombre, local, campos]) =>
  RECHAZOS_DEL_SERVIDOR.map(
    ([rechazo, respuesta, texto]) => [nombre, rechazo, local, respuesta, texto, campos] as const,
  ),
)

const primerRechazoLocalDe = (nombre: string): Campos => {
  const tupla = RECHAZOS_LOCALES.find(([formulario]) => formulario === nombre)
  if (tupla === undefined) throw new Error(`Precondición: ${nombre} tiene un rechazo local`)
  return tupla[2]
}

const textoDelDestino = (ruta: string, avisoDeLogin: string) =>
  `destino:${ruta}|aviso:${avisoDeLogin}`

// La pantalla a la que lleva la navegación tras la respuesta buena.
function Destino() {
  const { pathname, state } = useLocation()
  const avisoDeLogin =
    typeof state === "object" && state !== null && "aviso" in state ? String(state.aviso) : ""
  return <p>{textoDelDestino(pathname, avisoDeLogin)}</p>
}

const montarConRutas = (elemento: ReactNode) => {
  const cliente = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  render(
    <QueryClientProvider client={cliente}>
      <MemoryRouter initialEntries={["/formulario"]}>
        <Routes>
          <Route path="/formulario" element={elemento} />
          <Route path="*" element={<Destino />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
  return cliente
}

// El destino de siempre de cada formulario cuando el servidor acepta el envío.
const DESTINO: Readonly<Record<string, () => Promise<void>>> = {
  "iniciar sesión": async () => {
    expect(await screen.findByText(textoDelDestino(RUTA_POR_ROL.maestro, ""))).toBeInTheDocument()
  },
  "registro de estudiante": async () => {
    expect(await screen.findByText(textoDelDestino(RUTA_POR_ROL.maestro, ""))).toBeInTheDocument()
  },
  "registro de maestro por enlace": async () => {
    expect(await screen.findByText(textoDelDestino(RUTA_POR_ROL.maestro, ""))).toBeInTheDocument()
  },
  "recuperar contraseña": async () => {
    expect(await screen.findByRole("status")).toHaveTextContent(TEXTOS_RECUPERAR.confirmacion)
  },
  "restablecer contraseña": async () => {
    expect(
      await screen.findByText(
        textoDelDestino("/login", TEXTOS_NUEVA_CONTRASENA.recuperacion.avisoLogin),
      ),
    ).toBeInTheDocument()
  },
  "establecer contraseña (invitación)": async () => {
    expect(
      await screen.findByText(
        textoDelDestino("/login", TEXTOS_NUEVA_CONTRASENA.invitacion.avisoLogin),
      ),
    ).toBeInTheDocument()
  },
  "cambio obligatorio de contraseña": async () => {
    expect(await screen.findByText(textoDelDestino(RUTA_POR_ROL.maestro, ""))).toBeInTheDocument()
  },
}

const destinoDe = (nombre: string) => {
  const comprobar = DESTINO[nombre]
  if (comprobar === undefined) throw new Error(`Precondición: ${nombre} tiene su destino`)
  return comprobar()
}

const escribirEn = (campos: Campos) => {
  for (const [etiqueta, valor] of campos) {
    fireEvent.change(screen.getByLabelText(etiqueta), { target: { value: valor } })
  }
}

const pulsarElBoton = (formulario: Formulario) => {
  fireEvent.click(screen.getByRole("button", { name: formulario.boton }))
}

// Monta con rutas, prepara las respuestas del formulario, llena los campos válidos y envía.
const enviarConRutas = async (nombre: string, siguientes: RespuestaDelDoble[]) => {
  const formulario = formularioDe(nombre)
  rutaDelFormulario = formulario.ruta
  respuestas = siguientes
  const cliente = montarConRutas(formulario.elemento())
  await screen.findByRole("button", { name: formulario.boton })
  escribirEn(formulario.campos)
  pulsarElBoton(formulario)
  return { formulario, cliente }
}

// Exactamente un campo con aria-invalid y su ErrorDeCampo con texto; ningún role="alert".
const soloElErrorDeCampo = async () => {
  await waitFor(() => {
    expect(screen.queryAllByRole("alert")).toHaveLength(0)
    expect(document.querySelectorAll('[aria-invalid="true"]')).toHaveLength(1)
  })
  const invalido = document.querySelector('[aria-invalid="true"]')
  if (invalido === null) throw new Error("Precondición: hay un campo inválido")
  const ids = (invalido.getAttribute("aria-describedby") ?? "").split(" ")
  const idDelError = ids.find((id) => id.endsWith("-error"))
  if (idDelError === undefined) throw new Error("El campo inválido no apunta a su ErrorDeCampo")
  const errorDeCampo = document.getElementById(idDelError)
  if (errorDeCampo === null) throw new Error(`No existe el ErrorDeCampo ${idDelError}`)
  expect((errorDeCampo.textContent ?? "").trim().length).toBeGreaterThan(0)
}

// Exactamente un MensajeError del formulario, con su título y el texto esperado; ningún ErrorDeCampo.
const soloElMensajeError = async (formulario: Formulario, esperado: string) => {
  await waitFor(() => {
    expect(screen.getAllByRole("alert")).toHaveLength(1)
    expect(screen.getByRole("alert").textContent).toBe(`${formulario.titulo}${esperado}`)
  })
  expect(document.querySelectorAll('[aria-invalid="true"]')).toHaveLength(0)
}

const reposado = async (formulario: Formulario, cliente: QueryClient) => {
  await waitFor(() => expect(cliente.isMutating()).toBe(0))
  const boton = screen.getByRole("button", { name: formulario.boton })
  await waitFor(() => expect(boton).not.toHaveAttribute("aria-busy", "true"))
  expect(boton).not.toHaveAttribute("aria-disabled", "true")
}

const conservaLoEscrito = (campos: Campos) => {
  for (const [etiqueta, valor] of campos) {
    expect(screen.getByLabelText(etiqueta)).toHaveValue(valor)
  }
}

// Una respuesta que el caso suelta cuando quiere (la petición queda en vuelo hasta entonces).
const respuestaRetenida = () => {
  const soltar: ((respuesta: Response) => void)[] = []
  const respuesta: RespuestaDelDoble = () =>
    new Promise<Response>((resolver) => {
      soltar.push(resolver)
    })
  const liberar = (valor: Response) => {
    const resolver = soltar[0]
    if (resolver === undefined) throw new Error("Precondición: la petición retenida ya salió")
    resolver(valor)
  }
  return { respuesta, liberar }
}

describe("CHORE-03 · Enmienda 5 (T-05): el error del servidor y el error local de features/auth, nunca a la vez", () => {
  it("CH3-C10: precondición, los siete formularios tienen su rechazo local y su destino", () => {
    expect(NOMBRES.map((nombre) => primerRechazoLocalDe(nombre).length > 0)).toEqual(
      NOMBRES.map(() => true),
    )
    expect(Object.keys(DESTINO)).toEqual(NOMBRES)
    expect(CASOS_SERVIDOR_Y_LOCAL).toHaveLength(33)
  })

  it.each(CASOS_SERVIDOR_Y_LOCAL)(
    "CH3-C10: %s, rechazo del servidor %s y después rechazo local (%s): solo el error local, sin petición; repetir el control corregido manda una petición nueva (F1 otra vez y luego el destino de siempre)",
    async (nombre, _rechazo, _local, respuesta, texto, camposLocales) => {
      const formularioBase = formularioDe(nombre)
      const { formulario, cliente } = await enviarConRutas(nombre, [
        respuesta,
        F1[1],
        formularioBase.exito,
      ])
      await soloElMensajeError(formulario, texto)
      await reposado(formulario, cliente)

      escribirEn(camposLocales)
      pulsarElBoton(formulario)

      await soloElErrorDeCampo()
      expect(document.body.textContent).not.toContain(texto)
      expect(document.body.textContent).not.toContain(GENERICO)
      expect(peticionesDelFormulario(formulario)).toBe(1)
      conservaLoEscrito(camposLocales)
      const boton = screen.getByRole("button", { name: formulario.boton })
      expect(boton).not.toHaveAttribute("aria-busy", "true")
      expect(boton).not.toHaveAttribute("aria-disabled", "true")

      escribirEn(formulario.campos)
      pulsarElBoton(formulario)
      await waitFor(() => expect(peticionesDelFormulario(formulario)).toBe(2))
      await soloElMensajeError(formulario, MENSAJE_DE_PRUEBA)
      await reposado(formulario, cliente)
      conservaLoEscrito(formulario.campos)

      pulsarElBoton(formulario)
      await waitFor(() => expect(peticionesDelFormulario(formulario)).toBe(3))
      await destinoDe(nombre)
      expect(screen.queryAllByRole("alert")).toHaveLength(0)
      expect(respuestas).toHaveLength(0)
      expect(aviso.error).not.toHaveBeenCalled()
      expect(inesperadas).toEqual([])
    },
  )

  it.each(NOMBRES.map((nombre) => [nombre] as const))(
    "CH3-C11: %s, rechazo local y después F1 del servidor: solo el MensajeError, sin ErrorDeCampo y con una petición; repetir el control con la respuesta buena lleva al destino de siempre",
    async (nombre) => {
      const formulario = formularioDe(nombre)
      rutaDelFormulario = formulario.ruta
      respuestas = [F1[1], formulario.exito]
      const cliente = montarConRutas(formulario.elemento())
      await screen.findByRole("button", { name: formulario.boton })
      escribirEn(formulario.campos)
      escribirEn(primerRechazoLocalDe(nombre))
      pulsarElBoton(formulario)
      await soloElErrorDeCampo()
      expect(peticionesDelFormulario(formulario)).toBe(0)

      escribirEn(formulario.campos)
      pulsarElBoton(formulario)

      await soloElMensajeError(formulario, MENSAJE_DE_PRUEBA)
      await reposado(formulario, cliente)
      expect(peticionesDelFormulario(formulario)).toBe(1)
      conservaLoEscrito(formulario.campos)

      pulsarElBoton(formulario)
      await waitFor(() => expect(peticionesDelFormulario(formulario)).toBe(2))
      await destinoDe(nombre)
      expect(screen.queryAllByRole("alert")).toHaveLength(0)
      expect(inesperadas).toEqual([])
    },
  )

  it.each(NOMBRES.map((nombre) => [nombre, CODIGO_FIJO[0]] as const))(
    "CH3-C12: %s, dos envíos válidos que el servidor rechaza (F1 y después %s) dan un solo MensajeError, el del segundo, y dos peticiones",
    async (nombre) => {
      const { formulario, cliente } = await enviarConRutas(nombre, [F1[1], CODIGO_FIJO[1]])
      await soloElMensajeError(formulario, MENSAJE_DE_PRUEBA)
      await reposado(formulario, cliente)

      pulsarElBoton(formulario)

      await waitFor(() => expect(peticionesDelFormulario(formulario)).toBe(2))
      await soloElMensajeError(formulario, CODIGO_FIJO[2])
      await reposado(formulario, cliente)
      expect(document.body.textContent).not.toContain(MENSAJE_DE_PRUEBA)
      expect(inesperadas).toEqual([])
    },
  )

  it.each(NOMBRES.map((nombre) => [nombre] as const))(
    "CH3-C12: %s, un envío con la petición en vuelo (submit del formulario) no manda otra petición y, al soltarla con F1, queda un solo MensajeError",
    async (nombre) => {
      const retenida = respuestaRetenida()
      const { formulario, cliente } = await enviarConRutas(nombre, [retenida.respuesta])
      await waitFor(() => expect(peticionesDelFormulario(formulario)).toBe(1))
      const boton = screen.getByRole("button", { name: formulario.boton })
      await waitFor(() => expect(boton).toHaveAttribute("aria-busy", "true"))
      const formularioDelBoton = boton.closest("form")
      if (formularioDelBoton === null) throw new Error("Precondición: el botón está en un form")

      // N-25: el clic sobre un Button en espera se cancela; el submit llega al manejador.
      fireEvent.submit(formularioDelBoton)
      expect(peticionesDelFormulario(formulario)).toBe(1)

      retenida.liberar(
        errorApi(400, "VALIDACION", ENTRADAS_DE_FORMULARIO["campo-no-pintable"].mensaje),
      )

      await soloElMensajeError(formulario, MENSAJE_DE_PRUEBA)
      await reposado(formulario, cliente)
      expect(peticionesDelFormulario(formulario)).toBe(1)
      conservaLoEscrito(formulario.campos)
      expect(inesperadas).toEqual([])
    },
  )
})
