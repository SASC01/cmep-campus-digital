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

import { BuscadorDeCuenta } from "./components/buscador-de-cuenta"
import { FichaDeCuenta } from "./components/ficha-de-cuenta"
import { FormularioCorregirCorreo } from "./components/formulario-corregir-correo"
import { FormularioGenerarEnlace } from "./components/formulario-generar-enlace"
import { FormularioInvitacionMasiva } from "./components/formulario-invitacion-masiva"
import { FormularioInvitarMaestro } from "./components/formulario-invitar-maestro"
import { TablaEnlaces } from "./components/tabla-enlaces"
import { MENSAJE_ERROR_ADMIN_GENERICO, MENSAJES_ERROR_ADMIN } from "./data"

// Tester, ronda 1 de CHORE-03 03c. features/admin ante lo que el servidor puede mandar y el plan no
// inventaría como caso de interfaz: la tabla común completa repartida entre los siete controles; las
// entradas de "Puntos de ataque" (mezclas de restos, rutas largas, solo dígitos, marcas combinantes,
// muchos niveles, la ruta doble `id: id:` con separadores raros) en todos; los códigos fijos con un
// mensaje que parece ruta; CUPO_DIARIO_INSUFICIENTE con y sin texto visible; sin conexión; los
// VALIDACION de parámetro de consulta en la tabla de enlaces y en los registrados (primera carga,
// «Cargar más» y recarga); O-21 (ningún "id:" en todo el texto visible); los errores que apiClient
// redirige; y un error del servidor que queda en pantalla cuando el siguiente envío lo rechaza la
// validación local. En cada caso, exactamente un mensaje legible. El servidor es un doble en memoria;
// reloj fijo (solo Date).

vi.mock("@/services/navegacion", () => ({ irA: vi.fn(), rutaActual: vi.fn(() => "/admin") }))
const aviso = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }))
vi.mock("sonner", () => ({ toast: aviso, Toaster: () => null }))

const AHORA = new Date("2030-01-10T12:00:00.000Z")
const GENERICO = MENSAJE_ERROR_ADMIN_GENERICO
const TITULO = "Error"
const M = MENSAJE_DE_PRUEBA

const USUARIO = {
  id: "1a1b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d01",
  nombre: "Carla Ruiz",
  email: "carla@colegio.mx",
  rol: "maestro",
  activo: true,
} as const

const ENLACE = {
  id: "2a2b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d02",
  creadoEn: "2030-01-02T15:00:00.000Z",
  expiraEn: "2030-01-09T15:00:00.000Z",
  revocadoEn: null,
  estado: "vigente",
  registrados: 1,
} as const

const OTRO_ENLACE = { ...ENLACE, id: "2a2b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d03" }
const CURSOR = "9a9b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d99"

const REGISTRADO = {
  id: "4a4b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d04",
  nombre: "Luis Pérez",
  email: "luis@colegio.mx",
  creadoEn: "2030-01-03T15:00:00.000Z",
}

const RUTA_ENLACES = "/api/admin/enlaces-registro"
const RUTA_RESTABLECER = `/api/admin/usuarios/${USUARIO.id}/restablecer-contrasena`
const RUTA_CORREGIR = `/api/admin/usuarios/${USUARIO.id}/correo`
const RUTA_REVOCAR = `${RUTA_ENLACES}/${ENLACE.id}/revocar`
const RUTA_REGISTRADOS = `${RUTA_ENLACES}/${ENLACE.id}/registrados`

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
  busqueda: string
}

type Respondedor = (llamada: Llamada) => Response | Promise<Response> | null

// Respuestas del caso (por método y ruta, en orden); lo demás, las de siempre.
let preparadas: { metodo: string; ruta: string; respuesta: () => Response | Promise<Response> }[] =
  []
let llamadas: Llamada[] = []
let inesperadas: string[] = []

const deSiempre: Respondedor = ({ metodo, ruta }) => {
  if (metodo === "GET" && ruta === RUTA_ENLACES) {
    return respuestaJson(200, { enlaces: [ENLACE], siguienteCursor: null })
  }
  if (metodo === "GET" && ruta === RUTA_REGISTRADOS) {
    return respuestaJson(200, { registrados: [REGISTRADO], siguienteCursor: null })
  }
  return null
}

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
      const url = new URL(String(entrada), "http://local")
      const llamada = { metodo: init?.method ?? "GET", ruta: url.pathname, busqueda: url.search }
      llamadas.push(llamada)
      const indice = preparadas.findIndex(
        (p) => p.metodo === llamada.metodo && p.ruta === llamada.ruta,
      )
      if (indice >= 0) {
        const [preparada] = preparadas.splice(indice, 1)
        if (preparada === undefined) throw new Error("Precondición: la respuesta preparada existe")
        return Promise.resolve(preparada.respuesta())
      }
      const normal = deSiempre(llamada)
      if (normal !== null) return Promise.resolve(normal)
      inesperadas.push(`${llamada.metodo} ${llamada.ruta}${llamada.busqueda}`)
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

const pulsar = async (nombre: string | RegExp) => {
  fireEvent.click(await screen.findByRole("button", { name: nombre }))
}

const escribir = (campos: readonly (readonly [string, string])[]) => {
  for (const [etiqueta, valor] of campos) {
    fireEvent.change(screen.getByLabelText(etiqueta), { target: { value: valor } })
  }
}

interface Control {
  elemento: () => ReactNode
  metodo: string
  ruta: string
  boton: string | RegExp
  campos: readonly (readonly [string, string])[]
  disparar: () => Promise<void>
}

const formulario = (
  elemento: () => ReactNode,
  metodo: string,
  ruta: string,
  boton: string,
  campos: readonly (readonly [string, string])[],
): Control => ({
  elemento,
  metodo,
  ruta,
  boton,
  campos,
  disparar: async () => {
    await screen.findByRole("button", { name: boton })
    escribir(campos)
    await pulsar(boton)
  },
})

const CONTROLES = {
  "invitar maestro": formulario(
    () => <FormularioInvitarMaestro />,
    "POST",
    "/api/admin/maestros",
    "Enviar invitación",
    [
      ["Nombre completo", "Carla Ruiz"],
      ["Correo", "carla@colegio.mx"],
    ],
  ),
  "invitación masiva": formulario(
    () => <FormularioInvitacionMasiva />,
    "POST",
    "/api/admin/maestros/lote",
    "Enviar invitaciones",
    [["Lista de maestros", "ana@colegio.mx, Ana López\nluis@colegio.mx"]],
  ),
  "generar enlace": formulario(
    () => <FormularioGenerarEnlace />,
    "POST",
    RUTA_ENLACES,
    "Generar enlace",
    [["Vigencia en días", "10"]],
  ),
  "buscar una cuenta": formulario(
    () => <BuscadorDeCuenta />,
    "POST",
    "/api/admin/usuarios/buscar",
    "Buscar",
    [["Correo exacto de la cuenta", "carla@colegio.mx"]],
  ),
  "corregir el correo": formulario(
    () => <FormularioCorregirCorreo usuario={USUARIO} onCorregido={vi.fn()} />,
    "PUT",
    RUTA_CORREGIR,
    "Guardar correo",
    [["Correo correcto", "carla.ruiz@colegio.mx"]],
  ),
  "restablecer desde la ficha": {
    elemento: () => <FichaDeCuenta usuario={USUARIO} onCorreoCorregido={vi.fn()} />,
    metodo: "POST",
    ruta: RUTA_RESTABLECER,
    boton: "Sí, restablecer",
    campos: [],
    disparar: async () => {
      await pulsar("Restablecer contraseña")
      await pulsar("Sí, restablecer")
    },
  },
  "revocar un enlace": {
    elemento: () => <TablaEnlaces onGenerarPrimero={vi.fn()} />,
    metodo: "POST",
    ruta: RUTA_REVOCAR,
    boton: /^Sí, revocar/,
    campos: [],
    disparar: async () => {
      await pulsar(/^Revocar/)
      await pulsar(/^Sí, revocar/)
    },
  },
} as const satisfies Readonly<Record<string, Control>>

type NombreDeControl = keyof typeof CONTROLES
const NOMBRES = Object.keys(CONTROLES) as NombreDeControl[]

const peticionesA = (metodo: string, ruta: string) =>
  llamadas.filter((llamada) => llamada.metodo === metodo && llamada.ruta === ruta).length

// Lo que se ve en la pantalla, sin los textos sr-only (no hay ninguno en el camino del error).
const textoDeLaPantalla = () => document.body.textContent

// Exactamente un mensaje: un MensajeError con el texto esperado; ni ErrorDeCampo, ni aviso.
const unSoloMensaje = async (esperado: string) => {
  const alerta = await screen.findByRole("alert")
  expect(screen.getAllByRole("alert")).toHaveLength(1)
  expect(alerta.textContent).toBe(`${TITULO}${esperado}`)
  expect(contarCaracteresVisibles(esperado)).toBeGreaterThan(0)
  expect(document.querySelectorAll('[aria-invalid="true"]')).toHaveLength(0)
  expect(aviso.error).not.toHaveBeenCalled()
  expect(aviso.success).not.toHaveBeenCalled()
}

const ejecutar = async (nombre: NombreDeControl, respuesta: () => Response | Promise<Response>) => {
  const control: Control = CONTROLES[nombre]
  preparar(control.metodo, control.ruta, respuesta)
  const cliente = montar(control.elemento())
  await control.disparar()
  return { control, cliente }
}

const salioDeLaEspera = async (control: Control, cliente: QueryClient) => {
  await waitFor(() => expect(cliente.isMutating()).toBe(0))
  const boton = screen.getByRole("button", { name: control.boton })
  await waitFor(() => expect(boton).not.toHaveAttribute("aria-busy", "true"))
  expect(boton).not.toHaveAttribute("aria-disabled", "true")
  for (const [etiqueta, valor] of control.campos) {
    expect(screen.getByLabelText(etiqueta)).toHaveProperty("value", valor)
  }
}

const validacion = (mensaje: string) => () => errorApi(400, "VALIDACION", mensaje)

// La tabla común completa, una entrada por control (rotación).
const CASOS_DE_LA_TABLA = ENTRADAS_FUERA_DE_CONTRATO.map(
  (entrada, i) =>
    [
      NOMBRES[i % NOMBRES.length] ?? "invitar maestro",
      JSON.stringify(entrada.mensaje),
      entrada.mensaje,
      entrada.resto ?? GENERICO,
    ] as const,
)

// Puntos de ataque del plan, en todos los controles: [nombre, mensaje, lo que se lee].
const PUNTOS_DE_ATAQUE: readonly (readonly [string, string, string])[] = [
  ["mezcla de restos tras la ruta", "campoFueraDeContrato:\u{00A0}\u{200B}\n", GENERICO],
  ["ruta muy larga", `${"a".repeat(300)}.0.${"b".repeat(300)}: ${M}`, M],
  ["ruta solo de dígitos", `123456: ${M}`, M],
  ["letra con marca combinante", `pa\u{0301}rametro: ${M}`, M],
  ["muchos niveles", `a.0.b.1.c.2.d.3.e.4.f.5.g.6.h: ${M}`, M],
  ["ruta doble id con espacio", `id: id: ${M}`, M],
  ["ruta doble id sin espacios", `id:id:${M}`, M],
  ["ruta doble id con tabuladores", `id:\tid:\t${M}`, M],
  [
    "ruta doble id con varios espacios",
    "id:   id:    debe ser un identificador válido",
    "debe ser un identificador válido",
  ],
  ["ruta doble id sin resto", "id: id:", GENERICO],
  ["ruta doble id con ancho cero", "id: id:\u{200B}", GENERICO],
  ["ruta doble id con relleno ideográfico y unión", "id: id:\u{3000}\u{2060}", GENERICO],
  ["ruta doble id con siguiente línea", "id:id:\u{0085}", GENERICO],
  ["campo pintado repetido", `email: email: ${M}`, M],
  ["campo de otro formulario (lista)", `lista: ${M}`, M],
  ["campo de otro formulario (vigenciaDias)", `vigenciaDias: ${M}`, M],
]

const CASOS_DE_PUNTOS = NOMBRES.flatMap((nombre) =>
  PUNTOS_DE_ATAQUE.map(
    ([entrada, mensaje, esperado]) => [nombre, entrada, mensaje, esperado] as const,
  ),
)

describe("ataque CHORE-03 03c r1 · features/admin ante un VALIDACION que el formulario no espera", () => {
  it.each(CASOS_DE_LA_TABLA)(
    "%s con la entrada %s de la tabla común da un solo MensajeError legible y sale de la espera",
    async (nombre, _titulo, mensaje, esperado) => {
      const { control, cliente } = await ejecutar(nombre, validacion(mensaje))

      await unSoloMensaje(esperado)
      await salioDeLaEspera(control, cliente)
      expect(peticionesA(control.metodo, control.ruta)).toBe(1)
      expect(inesperadas).toEqual([])
    },
  )

  it.each(CASOS_DE_PUNTOS)(
    "%s con %s («%s») da un solo MensajeError «%s», sin «id:» en ninguna parte de la pantalla",
    async (nombre, _entrada, mensaje, esperado) => {
      const { control, cliente } = await ejecutar(nombre, validacion(mensaje))

      await unSoloMensaje(esperado)
      await salioDeLaEspera(control, cliente)
      expect(textoDeLaPantalla()).not.toContain("id:")
      expect(textoDeLaPantalla()).not.toContain("rametro:")
      expect(textoDeLaPantalla()).not.toContain("123456:")
      expect(inesperadas).toEqual([])
    },
  )

  it.each(NOMBRES.map((nombre) => [nombre] as const))(
    "%s con tres prefijos («id: id: id: …») quita como máximo dos (decisión del plan): se lee «id: Revisa este valor.»",
    async (nombre) => {
      const { control, cliente } = await ejecutar(nombre, validacion(`id: id: id: ${M}`))

      await unSoloMensaje(`id: ${M}`)
      await salioDeLaEspera(control, cliente)
    },
  )
})

// O-21: en las cuatro rutas de :id del administrador, "id:" no aparece en todo el texto visible.
const RUTA_DOBLE_DEL_ID = "id: id: debe ser un identificador válido"
const ID_INVALIDO = "debe ser un identificador válido"

describe("ataque CHORE-03 03c r1 · O-21: la ruta doble del id en todo el texto visible", () => {
  it.each([
    ["restablecer desde la ficha", RUTA_DOBLE_DEL_ID, ID_INVALIDO],
    ["corregir el correo", RUTA_DOBLE_DEL_ID, ID_INVALIDO],
    ["revocar un enlace", RUTA_DOBLE_DEL_ID, ID_INVALIDO],
    ["restablecer desde la ficha", "id:id:debe ser un identificador válido", ID_INVALIDO],
    ["corregir el correo", "id:\tid:\u{00A0}debe ser un identificador válido", ID_INVALIDO],
    ["revocar un enlace", "id: id:\u{200B}", GENERICO],
  ] as const)(
    "%s con «%s»: un solo MensajeError «%s» y ningún «id:» en document.body",
    async (nombre, mensaje, esperado) => {
      const { control, cliente } = await ejecutar(nombre, validacion(mensaje))

      await unSoloMensaje(esperado)
      await salioDeLaEspera(control, cliente)
      expect(textoDeLaPantalla()).not.toContain("id:")
    },
  )

  it.each([
    [RUTA_DOBLE_DEL_ID],
    ["id:id:debe ser un identificador válido"],
    ["id: id:\u{200B}"],
  ] as const)(
    "los registrados de un enlace con «%s»: el genérico y ningún «id:» en document.body",
    async (mensaje) => {
      preparar("GET", RUTA_REGISTRADOS, validacion(mensaje))
      montar(<TablaEnlaces onGenerarPrimero={vi.fn()} />)
      await pulsar(/^Ver registrados/)

      await unSoloMensaje(GENERICO)
      expect(textoDeLaPantalla()).not.toContain("id:")
      expect(peticionesA("GET", RUTA_REGISTRADOS)).toBe(1)
    },
  )
})

describe("ataque CHORE-03 03c r1 · códigos fijos, CUPO_DIARIO_INSUFICIENTE y sin conexión", () => {
  const CODIGOS = Object.entries(MENSAJES_ERROR_ADMIN)

  it.each(
    NOMBRES.flatMap((nombre, i) =>
      [CODIGOS[i % CODIGOS.length], CODIGOS[(i + 1) % CODIGOS.length]].map((codigo) => {
        if (codigo === undefined) throw new Error("Precondición: hay códigos fijos")
        return [nombre, codigo[0], codigo[1]] as const
      }),
    ),
  )(
    "%s con %s y un mensaje del servidor que parece ruta da su texto fijo «%s»",
    async (nombre, codigo, texto) => {
      const { control, cliente } = await ejecutar(nombre, () =>
        errorApi(409, codigo, `email: ${M}`),
      )

      await unSoloMensaje(texto)
      await salioDeLaEspera(control, cliente)
      expect(textoDeLaPantalla()).not.toContain(M)
    },
  )

  it.each(
    NOMBRES.flatMap((nombre) =>
      ["ERROR_INTERNO", "CONFLICTO_DE_VERSION", "constructor", "VALIDACION_"].map(
        (codigo) => [nombre, codigo] as const,
      ),
    ),
  )(
    "%s con el código desconocido %s da el genérico, nunca el texto del servidor",
    async (nombre, codigo) => {
      const { control, cliente } = await ejecutar(nombre, () =>
        errorApi(422, codigo, `detalle: texto técnico del servidor`),
      )

      await unSoloMensaje(GENERICO)
      await salioDeLaEspera(control, cliente)
      expect(textoDeLaPantalla()).not.toContain("texto técnico")
    },
  )

  it.each(NOMBRES.map((nombre) => [nombre] as const))(
    "%s sin conexión (fetch rechaza) da el genérico de admin y sale de la espera",
    async (nombre) => {
      const { control, cliente } = await ejecutar(nombre, () =>
        Promise.reject(new TypeError("Failed to fetch")),
      )

      await unSoloMensaje(GENERICO)
      await salioDeLaEspera(control, cliente)
      expect(textoDeLaPantalla()).not.toContain("Failed to fetch")
    },
  )

  it.each([
    [
      "con texto",
      "Hoy solo puedes enviar 3 invitaciones más.",
      "Hoy solo puedes enviar 3 invitaciones más.",
    ],
    ["vacío", "", GENERICO],
    ["solo espacios", "   ", GENERICO],
    ["ancho cero", "\u{200B}", GENERICO],
    ["mezcla de invisibles", "\u{00A0}\u{200B}\u{0085}", GENERICO],
    ["relleno ideográfico", "\u{3000}", GENERICO],
    ["BOM", "\u{FEFF}", GENERICO],
  ] as const)(
    "invitación masiva con CUPO_DIARIO_INSUFICIENTE %s da un solo MensajeError legible",
    async (_nombre, mensaje, esperado) => {
      const { control, cliente } = await ejecutar("invitación masiva", () =>
        errorApi(409, "CUPO_DIARIO_INSUFICIENTE", mensaje),
      )

      await unSoloMensaje(esperado)
      await salioDeLaEspera(control, cliente)
    },
  )
})

describe("ataque CHORE-03 03c r1 · errores que apiClient redirige, desde los controles de admin", () => {
  it.each(
    NOMBRES.flatMap((nombre) =>
      [
        ["ACCESO_RESTRINGIDO", "/acceso-restringido"],
        ["CAMBIO_DE_CONTRASENA_REQUERIDO", "/cambiar-contrasena"],
      ].map(([codigo, destino]) => [nombre, codigo ?? "", destino ?? ""] as const),
    ),
  )(
    "%s con un 403 %s: apiClient redirige a %s y no sale el texto del servidor",
    async (nombre, codigo, destino) => {
      const { cliente } = await ejecutar(nombre, () =>
        errorApi(403, codigo, `x: texto del servidor`),
      )

      await waitFor(() => expect(irA).toHaveBeenCalledWith(destino))
      await waitFor(() => expect(cliente.isMutating()).toBe(0))
      expect(textoDeLaPantalla()).not.toContain("texto del servidor")
      expect(aviso.error).not.toHaveBeenCalled()
    },
  )

  it("invitar maestro con un 401 y el refresco rechazado: apiClient manda a /login", async () => {
    preparar("POST", "/api/auth/refrescar", () => errorApi(401, "SESION_INVALIDA", "x: y"))
    const { cliente } = await ejecutar("invitar maestro", () =>
      errorApi(401, "NO_AUTENTICADO", "x: texto del servidor"),
    )

    await waitFor(() => expect(irA).toHaveBeenCalledWith("/login"))
    await waitFor(() => expect(cliente.isMutating()).toBe(0))
    expect(textoDeLaPantalla()).not.toContain("texto del servidor")
  })
})

describe("ataque CHORE-03 03c r1 · VALIDACION de parámetro en las consultas de admin", () => {
  const PARAMETROS = [
    ["cursor", "cursor: no es válido"],
    ["limite", "limite: Too big: expected number"],
    ["limite sin resto", "limite:\u{200B}"],
    ["limite repetido", "limite: limite: debe ser un número"],
    ["sin ruta", "Los datos enviados tienen caracteres no permitidos."],
  ] as const

  it.each(PARAMETROS)(
    "la tabla de enlaces, primera carga, con %s: el genérico, nunca el texto de zod",
    async (_nombre, mensaje) => {
      preparar("GET", RUTA_ENLACES, validacion(mensaje))
      montar(<TablaEnlaces onGenerarPrimero={vi.fn()} />)

      await unSoloMensaje(GENERICO)
      expect(peticionesA("GET", RUTA_ENLACES)).toBe(1)
      expect(inesperadas).toEqual([])
    },
  )

  it.each(PARAMETROS)(
    "«Cargar más enlaces» con %s: un solo MensajeError con el genérico",
    async (_nombre, mensaje) => {
      preparar(
        "GET",
        RUTA_ENLACES,
        () => respuestaJson(200, { enlaces: [ENLACE], siguienteCursor: CURSOR }),
        validacion(mensaje),
      )
      montar(<TablaEnlaces onGenerarPrimero={vi.fn()} />)
      await pulsar("Cargar más enlaces")

      await unSoloMensaje(GENERICO)
      expect(llamadas.filter((l) => l.ruta === RUTA_ENLACES).map((l) => l.busqueda)).toEqual([
        "?limite=20",
        `?limite=20&cursor=${CURSOR}`,
      ])
      expect(inesperadas).toEqual([])
    },
  )

  it.each(PARAMETROS)(
    "los registrados de un enlace, primera carga, con %s: el genérico",
    async (_nombre, mensaje) => {
      preparar("GET", RUTA_REGISTRADOS, validacion(mensaje))
      montar(<TablaEnlaces onGenerarPrimero={vi.fn()} />)
      await pulsar(/^Ver registrados/)

      await unSoloMensaje(GENERICO)
      expect(inesperadas).toEqual([])
    },
  )

  it.each(PARAMETROS)(
    "«Cargar más» de los registrados con %s: un solo MensajeError con el genérico",
    async (_nombre, mensaje) => {
      preparar(
        "GET",
        RUTA_REGISTRADOS,
        () => respuestaJson(200, { registrados: [REGISTRADO], siguienteCursor: CURSOR }),
        validacion(mensaje),
      )
      montar(<TablaEnlaces onGenerarPrimero={vi.fn()} />)
      await pulsar(/^Ver registrados/)
      await pulsar(/^Cargar más registrados/)

      await unSoloMensaje(GENERICO)
      expect(peticionesA("GET", RUTA_REGISTRADOS)).toBe(2)
      expect(inesperadas).toEqual([])
    },
  )

  it.each(PARAMETROS)(
    "la recarga de la tabla tras generar un enlace, con %s: un solo MensajeError con el genérico",
    async (_nombre, mensaje) => {
      preparar("POST", RUTA_ENLACES, () =>
        respuestaJson(201, { enlace: OTRO_ENLACE, token: "t".repeat(43) }),
      )
      preparar(
        "GET",
        RUTA_ENLACES,
        () => respuestaJson(200, { enlaces: [ENLACE], siguienteCursor: null }),
        validacion(mensaje),
      )
      montar(
        <>
          <FormularioGenerarEnlace />
          <TablaEnlaces onGenerarPrimero={vi.fn()} />
        </>,
      )
      await screen.findByRole("button", { name: /^Revocar/ })
      await pulsar("Generar enlace")
      await waitFor(() => expect(peticionesA("GET", RUTA_ENLACES)).toBe(2))
      await reposar()

      await unSoloMensaje(GENERICO)
      expect(inesperadas).toEqual([])
    },
  )

  it.each(PARAMETROS)(
    "la recarga de la tabla tras revocar un enlace, con %s: un solo MensajeError con el genérico",
    async (_nombre, mensaje) => {
      preparar("POST", RUTA_REVOCAR, () =>
        respuestaJson(200, {
          enlace: { ...ENLACE, estado: "revocado", revocadoEn: AHORA.toISOString() },
        }),
      )
      preparar(
        "GET",
        RUTA_ENLACES,
        () => respuestaJson(200, { enlaces: [ENLACE], siguienteCursor: null }),
        validacion(mensaje),
      )
      montar(<TablaEnlaces onGenerarPrimero={vi.fn()} />)
      await pulsar(/^Revocar/)
      await pulsar(/^Sí, revocar/)
      await waitFor(() => expect(peticionesA("GET", RUTA_ENLACES)).toBe(2))
      await reposar()

      await unSoloMensaje(GENERICO)
      expect(inesperadas).toEqual([])
    },
  )
})

// Un envío que el servidor rechaza deja su MensajeError; el siguiente envío lo rechaza la validación
// local (sin petición): la persona debe leer un solo mensaje, el del envío que acaba de hacer.
const CON_ERROR_LOCAL = [
  ["invitar maestro", [["Correo", "no-es-un-correo"]]],
  ["generar enlace", [["Vigencia en días", "0"]]],
  ["corregir el correo", [["Correo correcto", "no-es-un-correo"]]],
  ["invitación masiva", [["Lista de maestros", "   "]]],
  ["buscar una cuenta", [["Correo exacto de la cuenta", "no-es-un-correo"]]],
] as const satisfies readonly (readonly [NombreDeControl, readonly (readonly [string, string])[]])[]

describe("ataque CHORE-03 03c r1 · el MensajeError de un envío anterior y el error local del siguiente", () => {
  it.each(CON_ERROR_LOCAL)(
    "%s: tras un VALIDACION del servidor, un envío que la validación local rechaza deja un solo mensaje (el ErrorDeCampo nuevo), no también el MensajeError viejo",
    async (nombre, campos) => {
      const { control, cliente } = await ejecutar(
        nombre,
        validacion(ENTRADAS_DE_FORMULARIO["campo-no-pintable"].mensaje),
      )
      await unSoloMensaje(M)
      await salioDeLaEspera(control, cliente)

      escribir(campos)
      fireEvent.click(screen.getByRole("button", { name: control.boton }))
      await reposar()

      expect(peticionesA(control.metodo, control.ruta)).toBe(1)
      expect(document.querySelectorAll('[aria-invalid="true"]')).toHaveLength(1)
      expect(screen.queryAllByRole("alert")).toHaveLength(0)
      expect(textoDeLaPantalla()).not.toContain(M)
    },
  )
})
