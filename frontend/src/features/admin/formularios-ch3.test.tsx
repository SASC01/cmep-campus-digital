import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import type { ReactNode } from "react"
import { MemoryRouter } from "react-router"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import {
  CAMPO_FUERA_DE_CONTRATO,
  ENTRADAS_DE_FORMULARIO,
  MENSAJE_DE_PRUEBA,
} from "@/lib/errores-de-api-fuera-de-contrato"
import { establecerToken, limpiarToken } from "@/services/tokenAcceso"

import { BuscadorDeCuenta } from "./components/buscador-de-cuenta"
import { FichaDeCuenta } from "./components/ficha-de-cuenta"
import { FormularioCorregirCorreo } from "./components/formulario-corregir-correo"
import { FormularioGenerarEnlace } from "./components/formulario-generar-enlace"
import { FormularioInvitacionMasiva } from "./components/formulario-invitacion-masiva"
import { FormularioInvitarMaestro } from "./components/formulario-invitar-maestro"
import { TablaEnlaces } from "./components/tabla-enlaces"
import { MENSAJES_ERROR_ADMIN, TEXTOS_CUENTAS, TEXTOS_INVITACION_MASIVA } from "./data"
import { construirUrlDeRegistro } from "./lib"

// CHORE-03 (03c): los formularios, los controles sin campos y las consultas de features/admin ante un
// 400 VALIDACION fuera de contrato (F1 campo no pintable, F3 sin texto visible y sin ruta, F4 ruta de
// tres niveles), ante un VALIDACION de un campo que el formulario pinta (admin nunca asocia un error
// del servidor a un campo) y ante la ruta doble del id del administrador (CH3-C08). En cada caso:
// exactamente un MensajeError legible, sin toast ni ErrorDeCampo, sin la ruta ni un texto invisible;
// lo escrito se conserva y el botón sale de la espera. Una sola función de montaje y una prueba
// parametrizada por grupo (indicación del humano, 2026-10-26). El servidor es un doble en memoria;
// las fechas son textos fijos que no se comparan con el reloj.

vi.mock("@/services/navegacion", () => ({ irA: vi.fn(), rutaActual: vi.fn(() => "/") }))
const aviso = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }))
vi.mock("sonner", () => ({ toast: aviso, Toaster: () => null }))

const GENERICO = "No pudimos completar la operación. Inténtalo de nuevo."
const TITULO = "Error"
const ID_INVALIDO = "debe ser un identificador válido"
const LIMITE_EN_INGLES = "limite: Too big: expected number"

// Enmienda 3 (M-04): el esquema local `parametrosIdSchema` de backend/src/handlers/admin.ts:60
// (`z.uuid("id: debe ser un identificador válido")`) no está en @campus/shared y no se puede importar.
// validarParametros (backend/src/handlers/validacion.ts) arma `${path.join(".")}: ${message}`, así que
// a restablecer, corregir el correo, revocar y los registrados de un enlace llega literal:
const RUTA_DOBLE_DEL_ID = "id: id: debe ser un identificador válido"

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

const RUTA_ENLACES = "/api/admin/enlaces-registro"

const respuestaJson = (estado: number, cuerpo: unknown) =>
  new Response(JSON.stringify(cuerpo), {
    status: estado,
    headers: { "Content-Type": "application/json" },
  })

const errorApi = (estado: number, codigo: string, mensaje: string) =>
  respuestaJson(estado, { error: { codigo, mensaje } })

const validacion = (mensaje: string) => () => errorApi(400, "VALIDACION", mensaje)

interface Llamada {
  metodo: string
  ruta: string
}

// La petición del caso se responde con `respuestas` (en orden); la lista de enlaces, con un enlace.
let esLaPeticion: (llamada: Llamada) => boolean = () => false
let respuestas: (() => Response | Promise<Response>)[] = []
let llamadas: Llamada[] = []
let inesperadas: string[] = []

const respuestaNormal = ({ metodo, ruta }: Llamada): Response | null => {
  if (metodo === "GET" && ruta === RUTA_ENLACES) {
    return respuestaJson(200, { enlaces: [ENLACE], siguienteCursor: null })
  }
  return null
}

beforeEach(() => {
  establecerToken("token-de-prueba")
  esLaPeticion = () => false
  respuestas = []
  llamadas = []
  inesperadas = []
  vi.stubGlobal(
    "fetch",
    vi.fn<typeof fetch>((entrada, init) => {
      const llamada = {
        metodo: init?.method ?? "GET",
        ruta: new URL(String(entrada), "http://local").pathname,
      }
      llamadas.push(llamada)
      if (esLaPeticion(llamada)) {
        const siguiente = respuestas.shift()
        if (siguiente !== undefined) return Promise.resolve(siguiente())
        inesperadas.push(`${llamada.metodo} ${llamada.ruta} sin respuesta preparada`)
        return Promise.resolve(errorApi(500, "ERROR_INTERNO", "no esperada"))
      }
      const normal = respuestaNormal(llamada)
      if (normal !== null) return Promise.resolve(normal)
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

interface Montaje {
  elemento: () => ReactNode
  metodo: string
  ruta: string
  // Lo que la persona hace hasta disparar la petición del caso.
  disparar: () => Promise<void>
  // El botón que la dispara (null en una consulta).
  boton: string | RegExp | null
  // Etiqueta del campo → lo que se escribe en él.
  campos: readonly (readonly [string, string])[]
}

const escribir = (campos: Montaje["campos"]) => {
  for (const [etiqueta, valor] of campos) {
    fireEvent.change(screen.getByLabelText(etiqueta), { target: { value: valor } })
  }
}

const pulsar = async (nombre: string | RegExp) => {
  fireEvent.click(await screen.findByRole("button", { name: nombre }))
}

const formulario = (
  elemento: () => ReactNode,
  metodo: string,
  ruta: string,
  boton: string,
  campos: Montaje["campos"],
): Montaje => ({
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

const RUTA_RESTABLECER = `/api/admin/usuarios/${USUARIO.id}/restablecer-contrasena`
const RUTA_CORREGIR = `/api/admin/usuarios/${USUARIO.id}/correo`
const RUTA_REVOCAR = `${RUTA_ENLACES}/${ENLACE.id}/revocar`
const RUTA_REGISTRADOS = `${RUTA_ENLACES}/${ENLACE.id}/registrados`

const MONTAJES = {
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
  "generar enlace de registro": formulario(
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
  "restablecer la contraseña desde la ficha": {
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
  "la tabla de enlaces": {
    elemento: () => <TablaEnlaces onGenerarPrimero={vi.fn()} />,
    metodo: "GET",
    ruta: RUTA_ENLACES,
    boton: null,
    campos: [],
    disparar: () => Promise.resolve(),
  },
  "los registrados de un enlace": {
    elemento: () => <TablaEnlaces onGenerarPrimero={vi.fn()} />,
    metodo: "GET",
    ruta: RUTA_REGISTRADOS,
    boton: null,
    campos: [],
    disparar: async () => {
      await pulsar(/^Ver registrados/)
    },
  },
} as const satisfies Readonly<Record<string, Montaje>>

type NombreDeMontaje = keyof typeof MONTAJES

const peticionesDe = (montaje: Montaje) =>
  llamadas.filter((llamada) => llamada.metodo === montaje.metodo && llamada.ruta === montaje.ruta)
    .length

// Monta, prepara la respuesta de la petición del caso y la dispara.
const ejecutar = async (
  nombre: NombreDeMontaje,
  siguientes: (() => Response | Promise<Response>)[],
) => {
  const montaje: Montaje = MONTAJES[nombre]
  esLaPeticion = (llamada) => llamada.metodo === montaje.metodo && llamada.ruta === montaje.ruta
  respuestas = siguientes
  const cliente = montar(montaje.elemento())
  await montaje.disparar()
  return { montaje, cliente }
}

// (a) exactamente un mensaje legible, el MensajeError; (b) sin ruta ni texto invisible; (c) lo escrito
// se conserva; (d) el botón sale de la espera.
const comprobarUnSoloMensaje = async (montaje: Montaje, esperado: string) => {
  const alerta = await screen.findByRole("alert")
  expect(screen.getAllByRole("alert")).toHaveLength(1)
  expect(alerta.textContent).toBe(`${TITULO}${esperado}`)
  expect(alerta).not.toHaveTextContent(CAMPO_FUERA_DE_CONTRATO)
  expect(alerta).not.toHaveTextContent("archivoIds")
  expect(alerta).not.toHaveTextContent("id:")
  expect(alerta).not.toHaveTextContent("Too big")
  expect(document.querySelectorAll('[aria-invalid="true"]')).toHaveLength(0)
  expect(aviso.error).not.toHaveBeenCalled()
  expect(aviso.success).not.toHaveBeenCalled()
  for (const [etiqueta, valor] of montaje.campos) {
    expect(screen.getByLabelText(etiqueta)).toHaveProperty("value", valor)
  }
  if (montaje.boton === null) return
  const boton = screen.getByRole("button", { name: montaje.boton })
  await waitFor(() => expect(boton).not.toHaveAttribute("aria-busy", "true"))
  expect(boton).not.toHaveAttribute("aria-disabled", "true")
}

// Las entradas de cada caso: [nombre de la entrada, mensaje del servidor, lo que la persona lee].
const ENTRADAS: readonly (readonly [string, string, string])[] = [
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
]

// Un campo que cada formulario pinta: el servidor lo nombra y aun así el error va al MensajeError.
const CAMPO_PINTADO: Readonly<Record<string, string>> = {
  "invitar maestro": "nombre",
  "invitación masiva": "lista",
  "generar enlace de registro": "vigenciaDias",
  "buscar una cuenta": "email",
  "corregir el correo": "email",
}

const EXITO: Readonly<Record<string, () => Response>> = {
  "invitar maestro": () => respuestaJson(201, { ...USUARIO, activo: false }),
  "invitación masiva": () =>
    respuestaJson(200, {
      enviadas: [{ email: "ana@colegio.mx", nombre: "Ana López" }],
      yaExistentes: [],
      invalidas: [],
    }),
  "generar enlace de registro": () => respuestaJson(201, { enlace: ENLACE, token: "token-nuevo" }),
  "buscar una cuenta": () => respuestaJson(200, { usuario: USUARIO }),
  "corregir el correo": () => respuestaJson(200, { ...USUARIO, email: "carla.ruiz@colegio.mx" }),
}

const FORMULARIOS = Object.keys(CAMPO_PINTADO) as NombreDeMontaje[]

const CASOS_DE_FORMULARIO = FORMULARIOS.flatMap((nombre) =>
  [
    ...ENTRADAS,
    [
      `campo pintado ${CAMPO_PINTADO[nombre] ?? ""}`,
      `${CAMPO_PINTADO[nombre] ?? ""}: ${MENSAJE_DE_PRUEBA}`,
      MENSAJE_DE_PRUEBA,
    ] as const,
  ].map(([entrada, mensaje, esperado]) => [nombre, entrada, mensaje, esperado] as const),
)

const CONTROLES: readonly NombreDeMontaje[] = [
  "restablecer la contraseña desde la ficha",
  "revocar un enlace",
]

const CASOS_DE_CONTROL = CONTROLES.flatMap((nombre) =>
  ENTRADAS.map(([entrada, mensaje, esperado]) => [nombre, entrada, mensaje, esperado] as const),
)

describe("CHORE-03 · formularios, controles y consultas de features/admin ante un VALIDACION fuera de contrato", () => {
  it("CH3-C04: precondición, cada formulario tiene su campo pintado y su respuesta buena", () => {
    expect(FORMULARIOS).toEqual([
      "invitar maestro",
      "invitación masiva",
      "generar enlace de registro",
      "buscar una cuenta",
      "corregir el correo",
    ])
    expect(Object.keys(EXITO)).toEqual(FORMULARIOS)
  })

  it.each(CASOS_DE_FORMULARIO)(
    "CH3-C04: %s con %s («%s») da un solo MensajeError legible, sin toast ni ErrorDeCampo; lo escrito se conserva y el botón sale de la espera",
    async (nombre, _entrada, mensaje, esperado) => {
      const { montaje, cliente } = await ejecutar(nombre, [validacion(mensaje)])

      await comprobarUnSoloMensaje(montaje, esperado)
      await waitFor(() => expect(cliente.isMutating()).toBe(0))
      expect(peticionesDe(montaje)).toBe(1)
      expect(inesperadas).toEqual([])
    },
  )

  it.each(FORMULARIOS.map((nombre) => [nombre] as const))(
    "CH3-C04: %s, tras F3, repetir el control con una respuesta buena manda una petición nueva y quita la alerta",
    async (nombre) => {
      const exito = EXITO[nombre]
      if (exito === undefined) throw new Error(`Precondición: ${nombre} tiene respuesta buena`)
      const { montaje, cliente } = await ejecutar(nombre, [
        validacion(ENTRADAS_DE_FORMULARIO["sin-texto-visible"].mensaje),
        exito,
      ])
      await comprobarUnSoloMensaje(montaje, GENERICO)
      if (montaje.boton === null) throw new Error(`Precondición: ${nombre} tiene botón`)

      fireEvent.click(screen.getByRole("button", { name: montaje.boton }))

      await waitFor(() => expect(peticionesDe(montaje)).toBe(2))
      await waitFor(() => expect(cliente.isMutating()).toBe(0))
      await waitFor(() => expect(screen.queryByRole("alert")).toBeNull())
      expect(respuestas).toHaveLength(0)
      expect(aviso.error).not.toHaveBeenCalled()
      expect(inesperadas).toEqual([])
    },
  )

  it.each(CASOS_DE_CONTROL)(
    "CH3-C05: %s con %s («%s») da un solo MensajeError legible y el botón sale de la espera",
    async (nombre, _entrada, mensaje, esperado) => {
      const { montaje, cliente } = await ejecutar(nombre, [validacion(mensaje)])

      await comprobarUnSoloMensaje(montaje, esperado)
      await waitFor(() => expect(cliente.isMutating()).toBe(0))
      expect(peticionesDe(montaje)).toBe(1)
      expect(inesperadas).toEqual([])
    },
  )

  it.each([["la tabla de enlaces"], ["los registrados de un enlace"]] as const)(
    "CH3-C06: «limite: Too big: expected number» en %s muestra el genérico de admin, nunca el texto en inglés",
    async (nombre) => {
      const { montaje } = await ejecutar(nombre, [validacion(LIMITE_EN_INGLES)])

      await comprobarUnSoloMensaje(montaje, GENERICO)
      expect(peticionesDe(montaje)).toBe(1)
      expect(inesperadas).toEqual([])
    },
  )

  it.each([
    ["restablecer la contraseña desde la ficha", ID_INVALIDO],
    ["corregir el correo", ID_INVALIDO],
    ["revocar un enlace", ID_INVALIDO],
    ["los registrados de un enlace", GENERICO],
  ] as const)(
    "CH3-C08: «id: id: debe ser un identificador válido» en %s da un solo MensajeError «%s», sin toast ni «id:»",
    async (nombre, esperado) => {
      const { montaje } = await ejecutar(nombre, [validacion(RUTA_DOBLE_DEL_ID)])

      await comprobarUnSoloMensaje(montaje, esperado)
      expect(peticionesDe(montaje)).toBe(1)
      expect(inesperadas).toEqual([])
    },
  )
})

// Enmienda 5 (T-05, 03c ronda 2): tras un rechazo del servidor, el envío siguiente que la validación
// local rechaza deja un solo mensaje, el ErrorDeCampo nuevo (§D-4: `if (<m>.isError) <m>.reset()`
// después de la guarda isPending). Lo contrario (local y después servidor) deja solo el MensajeError,
// y lo que no debía cambiar sigue igual: el texto de éxito, dos errores del servidor seguidos y la
// petición en vuelo.

type Campos = Montaje["campos"]
type RespuestaDelDoble = () => Response | Promise<Response>

// [nombre del rechazo, respuesta del servidor, lo que la persona lee].
type RechazoDelServidor = readonly [string, RespuestaDelDoble, string]

const F1: RechazoDelServidor = [
  "F1 campo no pintable",
  validacion(ENTRADAS_DE_FORMULARIO["campo-no-pintable"].mensaje),
  MENSAJE_DE_PRUEBA,
]
const F3: RechazoDelServidor = [
  "F3 sin texto visible",
  validacion(ENTRADAS_DE_FORMULARIO["sin-texto-visible"].mensaje),
  GENERICO,
]
const CODIGO_FIJO: RechazoDelServidor = [
  "CORREO_EN_USO con texto fijo",
  () => errorApi(409, "CORREO_EN_USO", "email: texto del servidor"),
  MENSAJES_ERROR_ADMIN.CORREO_EN_USO,
]
const TEXTO_DEL_CUPO = "Hoy solo puedes enviar 3 invitaciones más."
const CUPO: RechazoDelServidor = [
  "CUPO_DIARIO_INSUFICIENTE con texto",
  () => errorApi(429, "CUPO_DIARIO_INSUFICIENTE", TEXTO_DEL_CUPO),
  TEXTO_DEL_CUPO,
]

const MAS_DE_CIEN_LINEAS = Array.from(
  { length: 101 },
  (_, indice) => `maestro${String(indice)}@colegio.mx`,
).join("\n")

// [formulario, nombre del rechazo local, lo que se escribe para provocarlo].
type RechazoLocal = readonly [NombreDeMontaje, string, Campos]

const RECHAZOS_LOCALES: readonly RechazoLocal[] = [
  ["invitar maestro", "correo sin arroba", [["Correo", "carla-sin-arroba"]]],
  ["invitar maestro", "nombre solo de espacios", [["Nombre completo", "   "]]],
  ["invitación masiva", "lista solo de espacios", [["Lista de maestros", "   "]]],
  ["invitación masiva", "más de 100 líneas", [["Lista de maestros", MAS_DE_CIEN_LINEAS]]],
  ["generar enlace de registro", "vigencia 0", [["Vigencia en días", "0"]]],
  ["generar enlace de registro", "vigencia 31", [["Vigencia en días", "31"]]],
  ["corregir el correo", "correo sin arroba", [["Correo correcto", "carla-sin-arroba"]]],
]

const rechazosDelServidorDe = (nombre: NombreDeMontaje): readonly RechazoDelServidor[] =>
  nombre === "invitación masiva" ? [F1, F3, CODIGO_FIJO, CUPO] : [F1, F3, CODIGO_FIJO]

type CasoServidorYLocal = readonly [
  NombreDeMontaje,
  string,
  string,
  RespuestaDelDoble,
  string,
  Campos,
]

const CASOS_SERVIDOR_Y_LOCAL: readonly CasoServidorYLocal[] = [
  ...RECHAZOS_LOCALES.flatMap(([nombre, local, campos]) =>
    rechazosDelServidorDe(nombre).map(([rechazo, respuesta, texto]): CasoServidorYLocal => [
      nombre,
      rechazo,
      local,
      respuesta,
      texto,
      campos,
    ]),
  ),
  // Control: BuscadorDeCuenta ya lo resolvía (buscar.reset() sin condición) y no cambia.
  [
    "buscar una cuenta",
    F1[0],
    "correo sin arroba",
    F1[1],
    F1[2],
    [["Correo exacto de la cuenta", "carla-sin-arroba"]],
  ],
]

// Los cuatro formularios de admin de T-05 (CH3-C11 y CH3-C12).
const FORMULARIOS_DE_T05: readonly NombreDeMontaje[] = [
  "invitar maestro",
  "invitación masiva",
  "generar enlace de registro",
  "corregir el correo",
]

const primerRechazoLocalDe = (nombre: NombreDeMontaje): Campos => {
  const tupla = RECHAZOS_LOCALES.find(([formulario]) => formulario === nombre)
  if (tupla === undefined) throw new Error(`Precondición: ${nombre} tiene un rechazo local`)
  return tupla[2]
}

const exitoDe = (nombre: NombreDeMontaje): (() => Response) => {
  const exito = EXITO[nombre]
  if (exito === undefined) throw new Error(`Precondición: ${nombre} tiene respuesta buena`)
  return exito
}

// Lo que la persona ve cuando el servidor acepta el envío.
const EXITO_VISIBLE: Readonly<Record<string, () => Promise<void>>> = {
  "invitar maestro": async () => {
    expect(await screen.findByRole("status")).toHaveTextContent(
      TEXTOS_CUENTAS.invitar.exito(USUARIO.nombre),
    )
  },
  "invitación masiva": async () => {
    expect(await screen.findByText(TEXTOS_INVITACION_MASIVA.resumen(1, 0, 0))).toHaveAttribute(
      "role",
      "status",
    )
  },
  "generar enlace de registro": async () => {
    expect(await screen.findByRole("status")).toHaveTextContent(
      construirUrlDeRegistro(window.location.origin, "token-nuevo"),
    )
  },
  "buscar una cuenta": async () => {
    expect(await screen.findByText(USUARIO.nombre)).toBeInTheDocument()
  },
  "corregir el correo": async () => {
    expect(await screen.findByRole("status")).toHaveTextContent(
      TEXTOS_CUENTAS.ficha.correoActualizado,
    )
  },
}

const exitoVisibleDe = (nombre: NombreDeMontaje) => {
  const comprobar = EXITO_VISIBLE[nombre]
  if (comprobar === undefined) throw new Error(`Precondición: ${nombre} tiene su éxito visible`)
  return comprobar()
}

const botonDe = (montaje: Montaje): HTMLElement => {
  if (montaje.boton === null) throw new Error("Precondición: el formulario tiene botón")
  return screen.getByRole("button", { name: montaje.boton })
}

const pulsarElBoton = (montaje: Montaje) => {
  fireEvent.click(botonDe(montaje))
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

// Exactamente un MensajeError con el texto esperado y ningún ErrorDeCampo.
const soloElMensajeError = async (esperado: string) => {
  await waitFor(() => {
    expect(screen.getAllByRole("alert")).toHaveLength(1)
    expect(screen.getByRole("alert").textContent).toBe(`${TITULO}${esperado}`)
  })
  expect(document.querySelectorAll('[aria-invalid="true"]')).toHaveLength(0)
}

const reposada = async (montaje: Montaje, cliente: QueryClient) => {
  await waitFor(() => expect(cliente.isMutating()).toBe(0))
  await waitFor(() => expect(botonDe(montaje)).not.toHaveAttribute("aria-busy", "true"))
  expect(botonDe(montaje)).not.toHaveAttribute("aria-disabled", "true")
}

const conservaLoEscrito = (campos: Campos) => {
  for (const [etiqueta, valor] of campos) {
    expect(screen.getByLabelText(etiqueta)).toHaveProperty("value", valor)
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

describe("CHORE-03 · Enmienda 5 (T-05): el error del servidor y el error local de features/admin, nunca a la vez", () => {
  it("CH3-C09: precondición, cada formulario de T-05 tiene su rechazo local, su éxito y su éxito visible", () => {
    expect(FORMULARIOS_DE_T05.map((nombre) => primerRechazoLocalDe(nombre).length)).toEqual([
      1, 1, 1, 1,
    ])
    expect(Object.keys(EXITO_VISIBLE).sort()).toEqual(Object.keys(EXITO).sort())
    expect(CASOS_SERVIDOR_Y_LOCAL).toHaveLength(24)
  })

  it.each(CASOS_SERVIDOR_Y_LOCAL)(
    "CH3-C09: %s, rechazo del servidor %s y después rechazo local (%s): solo el ErrorDeCampo, sin petición; repetir el control corregido manda una petición nueva (F1 otra vez y luego la respuesta buena)",
    async (nombre, _rechazo, _local, respuesta, texto, camposLocales) => {
      const { montaje, cliente } = await ejecutar(nombre, [respuesta, F1[1], exitoDe(nombre)])
      await soloElMensajeError(texto)
      await reposada(montaje, cliente)

      escribir(camposLocales)
      pulsarElBoton(montaje)

      await soloElErrorDeCampo()
      expect(document.body.textContent).not.toContain(texto)
      expect(document.body.textContent).not.toContain(GENERICO)
      expect(peticionesDe(montaje)).toBe(1)
      conservaLoEscrito(camposLocales)
      expect(botonDe(montaje)).not.toHaveAttribute("aria-busy", "true")
      expect(botonDe(montaje)).not.toHaveAttribute("aria-disabled", "true")

      escribir(montaje.campos)
      pulsarElBoton(montaje)
      await waitFor(() => expect(peticionesDe(montaje)).toBe(2))
      await soloElMensajeError(MENSAJE_DE_PRUEBA)
      await reposada(montaje, cliente)
      conservaLoEscrito(montaje.campos)

      pulsarElBoton(montaje)
      await waitFor(() => expect(peticionesDe(montaje)).toBe(3))
      await exitoVisibleDe(nombre)
      await waitFor(() => expect(screen.queryAllByRole("alert")).toHaveLength(0))
      expect(document.querySelectorAll('[aria-invalid="true"]')).toHaveLength(0)
      expect(respuestas).toHaveLength(0)
      expect(aviso.error).not.toHaveBeenCalled()
      expect(inesperadas).toEqual([])
    },
  )

  it.each(FORMULARIOS_DE_T05.map((nombre) => [nombre] as const))(
    "CH3-C11: %s, rechazo local y después F1 del servidor: solo el MensajeError, sin ErrorDeCampo y con una petición; repetir el control con la respuesta buena quita la alerta",
    async (nombre) => {
      const montaje: Montaje = MONTAJES[nombre]
      esLaPeticion = (llamada) => llamada.metodo === montaje.metodo && llamada.ruta === montaje.ruta
      respuestas = [F1[1], exitoDe(nombre)]
      const cliente = montar(montaje.elemento())
      if (montaje.boton === null) throw new Error("Precondición: el formulario tiene botón")
      await screen.findByRole("button", { name: montaje.boton })
      escribir(montaje.campos)
      escribir(primerRechazoLocalDe(nombre))
      pulsarElBoton(montaje)
      await soloElErrorDeCampo()
      expect(peticionesDe(montaje)).toBe(0)

      escribir(montaje.campos)
      pulsarElBoton(montaje)

      await soloElMensajeError(MENSAJE_DE_PRUEBA)
      await reposada(montaje, cliente)
      expect(peticionesDe(montaje)).toBe(1)
      conservaLoEscrito(montaje.campos)

      pulsarElBoton(montaje)
      await waitFor(() => expect(peticionesDe(montaje)).toBe(2))
      await exitoVisibleDe(nombre)
      await waitFor(() => expect(screen.queryAllByRole("alert")).toHaveLength(0))
      expect(document.querySelectorAll('[aria-invalid="true"]')).toHaveLength(0)
      expect(inesperadas).toEqual([])
    },
  )

  it.each([
    ["invitar maestro", TEXTOS_CUENTAS.invitar.exito(USUARIO.nombre)],
    ["corregir el correo", TEXTOS_CUENTAS.ficha.correoActualizado],
  ] as const)(
    "CH3-C12: %s, tras un envío aceptado, un rechazo local deja el texto de éxito «%s» y el ErrorDeCampo, sin role=alert",
    async (nombre, textoDeExito) => {
      const { montaje, cliente } = await ejecutar(nombre, [exitoDe(nombre)])
      await exitoVisibleDe(nombre)
      await reposada(montaje, cliente)

      // Invitar maestro vacía el formulario al aceptarse: solo el campo del rechazo queda mal.
      escribir(montaje.campos)
      escribir(primerRechazoLocalDe(nombre))
      pulsarElBoton(montaje)

      await soloElErrorDeCampo()
      expect(screen.getByRole("status")).toHaveTextContent(textoDeExito)
      expect(peticionesDe(montaje)).toBe(1)
      expect(inesperadas).toEqual([])
    },
  )

  it.each(
    FORMULARIOS_DE_T05.map((nombre) => {
      const segundo = nombre === "invitación masiva" ? CUPO : CODIGO_FIJO
      return [nombre, segundo[0], segundo[1], segundo[2]] as const
    }),
  )(
    "CH3-C12: %s, dos envíos válidos que el servidor rechaza (F1 y después %s) dan un solo MensajeError, el del segundo, y dos peticiones",
    async (nombre, _segundo, respuesta, texto) => {
      const { montaje, cliente } = await ejecutar(nombre, [F1[1], respuesta])
      await soloElMensajeError(MENSAJE_DE_PRUEBA)
      await reposada(montaje, cliente)

      pulsarElBoton(montaje)

      await waitFor(() => expect(peticionesDe(montaje)).toBe(2))
      await soloElMensajeError(texto)
      await reposada(montaje, cliente)
      expect(document.body.textContent).not.toContain(MENSAJE_DE_PRUEBA)
      expect(inesperadas).toEqual([])
    },
  )

  it.each(FORMULARIOS_DE_T05.map((nombre) => [nombre] as const))(
    "CH3-C12: %s, un envío con la petición en vuelo (submit del formulario) no manda otra petición y, al soltarla con F1, queda un solo MensajeError",
    async (nombre) => {
      const retenida = respuestaRetenida()
      const { montaje, cliente } = await ejecutar(nombre, [retenida.respuesta])
      await waitFor(() => expect(peticionesDe(montaje)).toBe(1))
      await waitFor(() => expect(botonDe(montaje)).toHaveAttribute("aria-busy", "true"))
      const formularioDelBoton = botonDe(montaje).closest("form")
      if (formularioDelBoton === null) throw new Error("Precondición: el botón está en un form")

      // N-25: el clic sobre un Button en espera se cancela; el submit llega al manejador.
      fireEvent.submit(formularioDelBoton)
      expect(peticionesDe(montaje)).toBe(1)

      retenida.liberar(
        errorApi(400, "VALIDACION", ENTRADAS_DE_FORMULARIO["campo-no-pintable"].mensaje),
      )

      await soloElMensajeError(MENSAJE_DE_PRUEBA)
      await reposada(montaje, cliente)
      expect(peticionesDe(montaje)).toBe(1)
      conservaLoEscrito(montaje.campos)
      expect(inesperadas).toEqual([])
    },
  )
})
