import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import type { ReactNode } from "react"
import { createMemoryRouter, RouterProvider } from "react-router"
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"

import { Providers } from "@/app/providers"
import { establecerToken, limpiarToken } from "@/services/tokenAcceso"

import { FormularioClase } from "./components/formulario-clase"
import { FormularioPublicacion } from "./components/formulario-publicacion"
import {
  TEXTOS_BUSCADOR_MAESTROS,
  TEXTOS_CLASE,
  TEXTOS_FORMULARIO_CLASE,
  TEXTOS_FORMULARIO_PUBLICACION,
} from "./data"

// Tester, ronda 2 de CHORE-03 03b (remedio de T-03 y T-04, Enmienda 4). El servidor es un doble en
// memoria y el reloj está fijo (solo Date). Cuatro frentes:
// 1. Secuencias de envíos en un mismo formulario (O-18 del manager): cada envío da exactamente un
//    mensaje legible (un aviso o un ErrorDeCampo), nunca el del envío anterior acumulado ni ninguno;
//    también cuando el envío siguiente responde bien o cuando se cambia de tipo entre envíos. Incluye
//    rutas dobles y restos sin texto visible de los campos que dependen del modo.
// 2. Cambiar de tipo con la publicación en vuelo y justo al asentarse: la decisión no cambia.
// 3. O-19: atrás y adelante del historial en «Editar clase», con `rutas` y `Providers`.
// 4. Repetir el control con `rutas` y `Providers` (editar clase y anuncio).

vi.mock("@/services/navegacion", () => ({ irA: vi.fn(), rutaActual: vi.fn(() => "/") }))
const aviso = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }))
vi.mock("sonner", () => ({ toast: aviso, Toaster: () => null }))

const AHORA = new Date("2030-01-10T12:00:00.000Z")
const GENERICO = "Algo salió mal. Inténtalo de nuevo."
const M1 = "Primer motivo del servidor."
const M2 = "Segundo motivo del servidor."
const M3 = "Tercer motivo del servidor."
const CLASE_ID = "2a2b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d01"
const PUBLICACION_ID = "5a5b3c4d-1c1f-4b8e-9a1e-000000000001"
const MAESTRO = { id: "3a3b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d09", nombre: "Luis Pérez" }
const RUTA_CLASE = `/api/clases/${CLASE_ID}`
const RUTA_EDITAR = `/admin/clases/${CLASE_ID}/editar`
const RUTA_DE_LA_CLASE = `/admin/clases/${CLASE_ID}`

const respuestaJson = (estado: number, cuerpo: unknown) =>
  new Response(JSON.stringify(cuerpo), {
    status: estado,
    headers: { "Content-Type": "application/json" },
  })

const validacion = (mensaje: string) => () =>
  respuestaJson(400, { error: { codigo: "VALIDACION", mensaje } })

const claseDoble = {
  clase: {
    id: CLASE_ID,
    nombre: "Álgebra I",
    descripcion: null,
    maestro: MAESTRO,
    maestros: [MAESTRO],
  },
}

const publicacionDoble = (tipo: "anuncio" | "material") => ({
  publicacion: {
    id: PUBLICACION_ID,
    tipo,
    titulo: tipo === "material" ? "Lectura" : null,
    texto: "Mañana hay examen",
    autor: { ...MAESTRO, administracion: false },
    creadoEn: AHORA.toISOString(),
    comentarios: 0,
    tarea: null,
    adjuntos: [],
    puedeBorrar: true,
  },
})

interface Llamada {
  metodo: string
  url: string
  cuerpo: string | null
}

type Respuesta = () => Response | Promise<Response>

let esElEnvio: (llamada: Llamada) => boolean = () => false
let respuestas: Respuesta[] = []
let llamadas: Llamada[] = []
let inesperadas: string[] = []
let rolDeSesion: "maestro" | "admin" = "admin"

const respuestaNormal = ({ metodo, url }: Llamada): Response | null => {
  const { pathname } = new URL(url, "http://local")
  if (pathname === "/api/auth/refrescar") return respuestaJson(200, { tokenAcceso: "restaurado" })
  if (pathname === "/api/me") {
    return respuestaJson(200, {
      id: "5a5d7a3e-1c1f-4b8e-9a1e-0f2a3b4c5d6e",
      nombre: "Luis Pérez",
      email: "luis@ejemplo.mx",
      rol: rolDeSesion,
      debeCambiarContrasena: false,
      accesoRestringido: false,
    })
  }
  if (metodo !== "GET") return null
  if (pathname === "/api/clases/impartidas") {
    return respuestaJson(200, {
      clases: [{ id: CLASE_ID, nombre: "Álgebra I", alumnos: 3 }],
      total: 1,
      siguienteCursor: null,
    })
  }
  if (pathname === RUTA_CLASE) return respuestaJson(200, claseDoble)
  if (pathname === `${RUTA_CLASE}/codigo`) return respuestaJson(200, { codigo: "ABCD234" })
  if (pathname === `${RUTA_CLASE}/temas`) return respuestaJson(200, { temas: [], sinTema: 0 })
  if (pathname === `${RUTA_CLASE}/trabajo`) {
    return respuestaJson(200, { elementos: [], siguienteCursor: null })
  }
  if (pathname === `${RUTA_CLASE}/publicaciones`) {
    return respuestaJson(200, { publicaciones: [], siguienteCursor: null })
  }
  if (pathname === "/api/admin/maestros/candidatos") {
    return respuestaJson(200, {
      candidatos: [{ id: MAESTRO.id, nombre: MAESTRO.nombre, email: "luis@x.mx" }],
      hayMas: false,
    })
  }
  return null
}

beforeAll(async () => {
  await import("@/app/router")
}, 30_000)

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] })
  vi.setSystemTime(AHORA)
  establecerToken("token-de-prueba")
  esElEnvio = () => false
  respuestas = []
  llamadas = []
  inesperadas = []
  rolDeSesion = "admin"
  vi.stubGlobal(
    "fetch",
    vi.fn<typeof fetch>((entrada, init) => {
      const llamada = {
        metodo: init?.method ?? "GET",
        url: String(entrada),
        cuerpo: typeof init?.body === "string" ? init.body : null,
      }
      llamadas.push(llamada)
      if (esElEnvio(llamada)) {
        const siguiente = respuestas.shift()
        if (siguiente !== undefined) return Promise.resolve(siguiente())
        inesperadas.push(`envío sin respuesta preparada: ${llamada.metodo} ${llamada.url}`)
      }
      const normal = respuestaNormal(llamada)
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

const escribir = (etiqueta: string, valor: string): void => {
  fireEvent.change(screen.getByLabelText(etiqueta), { target: { value: valor } })
}

const avisos = () => aviso.error.mock.calls.map((llamada) => String(llamada[0]))
const exitos = () => aviso.success.mock.calls.map((llamada) => String(llamada[0]))

const es = (metodo: string, ruta: string) => (llamada: Llamada) =>
  llamada.metodo === metodo && new URL(llamada.url, "http://local").pathname === ruta

// Lo que marca un campo con error: un control con aria-invalid="true" o el grupo de maestros con su
// descripción (el ErrorDeCampo del selector usa useId(), sin "-error" en el id).
const portadoresDeError = () => [
  ...Array.from(document.querySelectorAll('[aria-invalid="true"]')),
  ...Array.from(document.querySelectorAll("fieldset[aria-describedby]")),
]

const RUTAS_TECNICAS = [
  "titulo:",
  "texto:",
  "maestroIds",
  "maestroId:",
  "nombre:",
  "descripcion:",
  "temaId",
  "\u{200B}",
  "\u{2060}",
  "\u0085",
]

const sinRutasNiInvisibles = () => {
  const visible = document.body.textContent ?? ""
  for (const fragmento of RUTAS_TECNICAS) expect(visible).not.toContain(fragmento)
  for (const texto of avisos()) {
    for (const fragmento of RUTAS_TECNICAS) expect(texto).not.toContain(fragmento)
  }
}

// ---------------------------------------------------------------------------------------------------
// 1. Secuencias de envíos (O-18), rutas dobles y restos de los campos que dependen del modo.

type Donde = "aviso" | "campo" | "exito"

interface Formulario {
  nombre: string
  rol: "maestro" | "admin"
  ruta: string
  elemento: () => ReactNode
  llenar: () => Promise<void>
  boton: () => HTMLElement
  envio: (llamada: Llamada) => boolean
  bien: () => Response
  exito: string
  // Lo escrito sigue en el formulario (no se llama tras un éxito).
  conservado: () => void
}

interface Paso {
  antes?: () => Promise<void>
  respuesta: Respuesta
  esperado: string
  donde: Donde
  // El control cuya descripción accesible debe ser el error, si el error va en un campo.
  control?: () => HTMLElement
}

const campoAnuncio = () => screen.getByLabelText(TEXTOS_FORMULARIO_PUBLICACION.campoAnuncio)
const campoTitulo = () => screen.getByLabelText(TEXTOS_FORMULARIO_PUBLICACION.campoTitulo)
const campoDescripcionMaterial = () =>
  screen.getByLabelText(TEXTOS_FORMULARIO_PUBLICACION.campoDescripcion)
const campoNombreClase = () => screen.getByLabelText(TEXTOS_FORMULARIO_CLASE.campoNombre)
const campoDescripcionClase = () => screen.getByLabelText(TEXTOS_FORMULARIO_CLASE.campoDescripcion)
const grupoDeMaestros = () => screen.getByRole("group", { name: TEXTOS_BUSCADOR_MAESTROS.grupo })
// El botón principal y el campo de texto de la publicación cambian de nombre con el tipo elegido.
const botonDePublicar = () => {
  const botones = [
    TEXTOS_FORMULARIO_PUBLICACION.publicarAnuncio,
    TEXTOS_FORMULARIO_PUBLICACION.publicarMaterial,
  ].flatMap((nombre) => screen.queryAllByRole("button", { name: nombre }))
  expect(botones, "un solo botón principal de publicar").toHaveLength(1)
  const [boton] = botones
  if (boton === undefined) throw new Error("falta el botón de publicar")
  return boton
}
const textoDeLaPublicacion = () => {
  const campos = [
    TEXTOS_FORMULARIO_PUBLICACION.campoAnuncio,
    TEXTOS_FORMULARIO_PUBLICACION.campoDescripcion,
  ].flatMap((nombre) => screen.queryAllByRole("textbox", { name: nombre }))
  expect(campos, "un solo campo de texto de la publicación").toHaveLength(1)
  const [campo] = campos
  if (campo === undefined) throw new Error("falta el campo de texto de la publicación")
  return campo
}
const pulsarTipo = (nombre: string) => {
  const botones = screen
    .getAllByRole("button", { name: nombre })
    .filter((boton) => boton.hasAttribute("aria-pressed"))
  expect(botones, `un solo botón de tipo «${nombre}»`).toHaveLength(1)
  const [boton] = botones
  if (boton === undefined) throw new Error(`falta el botón de tipo «${nombre}»`)
  fireEvent.click(boton)
}
const tipoPresionado = () =>
  screen.getAllByRole("button", { pressed: true }).map((boton) => (boton.textContent ?? "").trim())

const ANUNCIO: Formulario = {
  nombre: "el anuncio",
  rol: "maestro",
  ruta: `/maestro/clases/${CLASE_ID}`,
  elemento: () => <FormularioPublicacion claseId={CLASE_ID} />,
  llenar: async () => {
    escribir(TEXTOS_FORMULARIO_PUBLICACION.campoAnuncio, "Mañana hay examen")
    await Promise.resolve()
  },
  boton: () => botonDePublicar(),
  envio: es("POST", `${RUTA_CLASE}/publicaciones`),
  bien: () => respuestaJson(201, publicacionDoble("anuncio")),
  exito: TEXTOS_FORMULARIO_PUBLICACION.avisoPublicado,
  conservado: () => expect(textoDeLaPublicacion()).toHaveValue("Mañana hay examen"),
}

const MATERIAL: Formulario = {
  nombre: "el material",
  rol: "maestro",
  ruta: `/maestro/clases/${CLASE_ID}`,
  elemento: () => <FormularioPublicacion claseId={CLASE_ID} />,
  llenar: async () => {
    pulsarTipo(TEXTOS_FORMULARIO_PUBLICACION.material)
    escribir(TEXTOS_FORMULARIO_PUBLICACION.campoTitulo, "Lectura")
    escribir(TEXTOS_FORMULARIO_PUBLICACION.campoDescripcion, "Capítulo 3")
    await waitFor(() => expect(llamadas.some(es("GET", `${RUTA_CLASE}/temas`))).toBe(true))
  },
  boton: () => botonDePublicar(),
  envio: es("POST", `${RUTA_CLASE}/publicaciones`),
  bien: () => respuestaJson(201, publicacionDoble("material")),
  exito: TEXTOS_FORMULARIO_PUBLICACION.avisoPublicado,
  conservado: () => expect(textoDeLaPublicacion()).toHaveValue("Capítulo 3"),
}

const EDITAR_CLASE: Formulario = {
  nombre: "editar clase",
  rol: "admin",
  ruta: RUTA_EDITAR,
  elemento: () => (
    <FormularioClase
      modo="editar"
      claseId={CLASE_ID}
      valoresIniciales={{ nombre: "Álgebra I", descripcion: null }}
    />
  ),
  llenar: async () => {
    escribir(TEXTOS_FORMULARIO_CLASE.campoNombre, "Álgebra II")
    await Promise.resolve()
  },
  boton: () => screen.getByRole("button", { name: TEXTOS_FORMULARIO_CLASE.botonGuardar }),
  envio: es("PUT", `/api/admin/clases/${CLASE_ID}`),
  bien: () => respuestaJson(200, claseDoble),
  exito: TEXTOS_FORMULARIO_CLASE.avisoGuardada,
  conservado: () => expect(campoNombreClase()).toHaveValue("Álgebra II"),
}

const CREAR_CLASE: Formulario = {
  nombre: "crear clase",
  rol: "admin",
  ruta: "/admin/clases/nueva",
  elemento: () => <FormularioClase modo="crear" />,
  llenar: async () => {
    escribir(TEXTOS_FORMULARIO_CLASE.campoNombre, "Álgebra")
    escribir(TEXTOS_BUSCADOR_MAESTROS.campo, "Luis")
    fireEvent.click(await screen.findByRole("button", { name: "Elegir Luis Pérez" }))
  },
  boton: () => screen.getByRole("button", { name: TEXTOS_FORMULARIO_CLASE.botonCrear }),
  envio: es("POST", "/api/admin/clases"),
  bien: () => respuestaJson(201, claseDoble),
  exito: TEXTOS_FORMULARIO_CLASE.avisoCreada,
  conservado: () => expect(campoNombreClase()).toHaveValue("Álgebra"),
}

const pasoDeAviso = (mensaje: string, esperado: string, antes?: () => Promise<void>): Paso => ({
  respuesta: validacion(mensaje),
  esperado,
  donde: "aviso",
  ...(antes === undefined ? {} : { antes }),
})

const pasoDeCampo = (
  mensaje: string,
  esperado: string,
  control: () => HTMLElement,
  antes?: () => Promise<void>,
): Paso => ({
  respuesta: validacion(mensaje),
  esperado,
  donde: "campo",
  control,
  ...(antes === undefined ? {} : { antes }),
})

const aMaterial = async () => {
  pulsarTipo(TEXTOS_FORMULARIO_PUBLICACION.material)
  escribir(TEXTOS_FORMULARIO_PUBLICACION.campoTitulo, "Lectura")
  await Promise.resolve()
}
const aAnuncio = async () => {
  pulsarTipo(TEXTOS_FORMULARIO_PUBLICACION.anuncio)
  await Promise.resolve()
}

interface Secuencia {
  titulo: string
  formulario: Formulario
  pasos: readonly Paso[]
}

const SECUENCIAS: readonly Secuencia[] = [
  // O-18, las dos secuencias del manager.
  {
    titulo: "anuncio: «titulo:» → «texto:» → «titulo:»",
    formulario: ANUNCIO,
    pasos: [
      pasoDeAviso(`titulo: ${M1}`, M1),
      pasoDeCampo(`texto: ${M2}`, M2, campoAnuncio),
      pasoDeAviso(`titulo: ${M3}`, M3),
    ],
  },
  {
    titulo: "editar clase: «maestroIds:» → «nombre:» → «maestroIds:»",
    formulario: EDITAR_CLASE,
    pasos: [
      pasoDeAviso(`maestroIds: ${M1}`, M1),
      pasoDeCampo(`nombre: ${M2}`, M2, campoNombreClase),
      pasoDeAviso(`maestroIds: ${M3}`, M3),
    ],
  },
  // Variantes con restos sin texto visible y rutas dobles entre los pasos.
  {
    titulo: "anuncio: «texto:» → «titulo:» invisible → «texto: titulo:»",
    formulario: ANUNCIO,
    pasos: [
      pasoDeCampo(`texto: ${M1}`, M1, campoAnuncio),
      pasoDeAviso("titulo:\u{200B}", GENERICO),
      pasoDeCampo(`texto: titulo: ${M3}`, M3, campoAnuncio),
    ],
  },
  {
    titulo: "editar clase: «nombre:» → «maestroIds.0: maestroId:» invisible → «descripcion:»",
    formulario: EDITAR_CLASE,
    pasos: [
      pasoDeCampo(`nombre: ${M1}`, M1, campoNombreClase),
      pasoDeAviso("maestroIds.0: maestroId:\u{200B}", GENERICO),
      pasoDeCampo(`descripcion: ${M3}`, M3, campoDescripcionClase),
    ],
  },
  {
    titulo: "editar clase: «maestroIds:» vacío → «maestroIds: maestroIds:» → «nombre: maestroIds:»",
    formulario: EDITAR_CLASE,
    pasos: [
      pasoDeAviso("maestroIds:", GENERICO),
      pasoDeAviso(`maestroIds: maestroIds: ${M2}`, M2),
      pasoDeCampo(`nombre: maestroIds: ${M3}`, M3, campoNombreClase),
    ],
  },
  {
    titulo: "material: «titulo:» → «temaId: temaId:» → «titulo:titulo:» con U+0085",
    formulario: MATERIAL,
    pasos: [
      pasoDeCampo(`titulo: ${M1}`, M1, campoTitulo),
      pasoDeAviso(`temaId: temaId: ${M2}`, M2),
      pasoDeCampo("titulo:titulo:\u0085", GENERICO, campoTitulo),
    ],
  },
  {
    titulo: "crear clase: «maestroIds:» → «maestroIds.0: maestroId:» → «nombre:»",
    formulario: CREAR_CLASE,
    pasos: [
      pasoDeCampo(`maestroIds: ${M1}`, M1, grupoDeMaestros),
      pasoDeAviso(`maestroIds.0: maestroId: ${M2}`, M2),
      pasoDeCampo(`nombre: ${M3}`, M3, campoNombreClase),
    ],
  },
  // Cambiar de tipo entre envíos: el error de un envío anterior no reaparece.
  {
    titulo:
      "anuncio «titulo:» → «Material» con «titulo:» → «Anuncio» con «titulo:» → «Material» sin envío",
    formulario: ANUNCIO,
    pasos: [
      pasoDeAviso(`titulo: ${M1}`, M1),
      pasoDeCampo(`titulo: ${M2}`, M2, campoTitulo, aMaterial),
      pasoDeAviso(`titulo: ${M3}`, M3, aAnuncio),
    ],
  },
  {
    titulo: "material «texto:» → «Anuncio» con «titulo:» invisible",
    formulario: MATERIAL,
    pasos: [
      pasoDeCampo(`texto: ${M1}`, M1, campoDescripcionMaterial),
      pasoDeAviso("titulo:\u{3000}\u{2060}", GENERICO, aAnuncio),
    ],
  },
  // El envío siguiente responde bien: no queda el error del anterior.
  {
    titulo: "anuncio «texto:» → éxito",
    formulario: ANUNCIO,
    pasos: [
      pasoDeCampo(`texto: ${M1}`, M1, campoAnuncio),
      { respuesta: ANUNCIO.bien, esperado: ANUNCIO.exito, donde: "exito" },
    ],
  },
  {
    titulo: "material «titulo:» → éxito",
    formulario: MATERIAL,
    pasos: [
      pasoDeCampo(`titulo: ${M1}`, M1, campoTitulo),
      { respuesta: MATERIAL.bien, esperado: MATERIAL.exito, donde: "exito" },
    ],
  },
  {
    titulo: "editar clase «nombre:» → «maestroIds:» → éxito",
    formulario: EDITAR_CLASE,
    pasos: [
      pasoDeCampo(`nombre: ${M1}`, M1, campoNombreClase),
      pasoDeAviso(`maestroIds: ${M2}`, M2),
      { respuesta: EDITAR_CLASE.bien, esperado: EDITAR_CLASE.exito, donde: "exito" },
    ],
  },
  // Un solo envío: rutas dobles y restos de los campos que dependen del modo.
  ...(
    [
      ["titulo: titulo: ", M1, "aviso"],
      ["titulo:titulo:\u{200B}", GENERICO, "aviso"],
      ["titulo: texto: ", M1, "aviso"],
      ["titulo:", GENERICO, "aviso"],
      ["titulo:\u0085", GENERICO, "aviso"],
      ["Titulo: ", M1, "aviso"],
      ["titulo.0: ", M1, "aviso"],
    ] as const
  ).map(([mensaje, esperado, donde]) => ({
    titulo: `anuncio con «${mensaje}»`,
    formulario: ANUNCIO,
    pasos: [
      {
        respuesta: validacion(esperado === M1 ? `${mensaje}${M1}` : mensaje),
        esperado,
        donde,
      },
    ],
  })),
  ...(
    [
      ["titulo: titulo: ", M1, campoTitulo],
      ["titulo: texto: ", M1, campoTitulo],
      ["texto: titulo: ", M1, campoDescripcionMaterial],
      ["titulo:", GENERICO, campoTitulo],
    ] as const
  ).map(([mensaje, esperado, control]) => ({
    titulo: `material con «${mensaje}»`,
    formulario: MATERIAL,
    pasos: [pasoDeCampo(esperado === M1 ? `${mensaje}${M1}` : mensaje, esperado, control)],
  })),
  ...(
    [
      ["maestroIds: maestroIds: ", M1],
      ["maestroIds: maestroId: ", M1],
      ["maestroIds: nombre: ", M1],
      ["maestroIds:\u0085", GENERICO],
      ["maestroIds:\u{00A0}\u{200B}\n", GENERICO],
    ] as const
  ).map(([mensaje, esperado]) => ({
    titulo: `editar clase con «${mensaje}»`,
    formulario: EDITAR_CLASE,
    pasos: [pasoDeAviso(esperado === M1 ? `${mensaje}${M1}` : mensaje, esperado)],
  })),
  ...(
    [
      ["maestroIds: maestroIds: ", M1, "campo"],
      ["maestroIds: nombre: ", M1, "campo"],
      ["maestroIds:", GENERICO, "campo"],
      ["maestroIds.0: maestroId:", GENERICO, "aviso"],
    ] as const
  ).map(([mensaje, esperado, donde]) => ({
    titulo: `crear clase con «${mensaje}»`,
    formulario: CREAR_CLASE,
    pasos: [
      donde === "campo"
        ? pasoDeCampo(esperado === M1 ? `${mensaje}${M1}` : mensaje, esperado, grupoDeMaestros)
        : pasoDeAviso(mensaje, esperado),
    ],
  })),
]

const casosDeSecuencia = SECUENCIAS.map((secuencia) => ({
  ...secuencia,
  nombre: secuencia.titulo.replace(/[^\x20-\x7EÀ-ſ«»→]/gu, "·"),
}))

const montarEnRouter = async (formulario: Formulario) => {
  rolDeSesion = formulario.rol
  const cliente = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  const router = createMemoryRouter(
    [
      { path: formulario.ruta, element: formulario.elemento() },
      { path: "/admin/clases/:claseId", element: <p>La clase</p> },
    ],
    { initialEntries: [formulario.ruta] },
  )
  render(
    <QueryClientProvider client={cliente}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
  await reposar()
  return { cliente, router }
}

const asentar = async (cliente: QueryClient) => {
  await waitFor(() => expect(cliente.isFetching() + cliente.isMutating()).toBe(0))
  await reposar()
}

describe("ataque CHORE-03 03b r2 · un mensaje legible por envío en los formularios de clases (O-18)", () => {
  it.each(casosDeSecuencia.map((caso) => [caso.nombre, caso] as const))(
    "%s: cada envío da exactamente su mensaje, sin el del envío anterior ni ninguno de más",
    async (_nombre, { formulario, pasos }) => {
      esElEnvio = formulario.envio
      const { cliente } = await montarEnRouter(formulario)
      await formulario.llenar()
      await asentar(cliente)
      expect(pasos.length, "la secuencia tiene al menos un paso").toBeGreaterThan(0)

      const anteriores: string[] = []
      for (const [indice, paso] of pasos.entries()) {
        if (paso.antes) await paso.antes()
        const avisosAntes = avisos().length
        const exitosAntes = exitos().length
        respuestas.push(paso.respuesta)
        fireEvent.click(formulario.boton())
        await waitFor(() => expect(llamadas.filter(formulario.envio)).toHaveLength(indice + 1))
        await asentar(cliente)

        const nuevos = avisos().slice(avisosAntes)
        const contexto = `paso ${String(indice + 1)}: avisos nuevos ${JSON.stringify(nuevos)}`
        for (const previo of anteriores.filter((texto) => texto !== paso.esperado)) {
          expect(screen.queryAllByText(previo), `${contexto}; sigue «${previo}»`).toHaveLength(0)
        }
        if (paso.donde === "exito") {
          expect(nuevos, contexto).toEqual([])
          expect(exitos().slice(exitosAntes)).toEqual([paso.esperado])
          expect(portadoresDeError(), contexto).toHaveLength(0)
        }
        if (paso.donde === "aviso") {
          expect(nuevos, contexto).toEqual([paso.esperado])
          expect(screen.queryAllByText(paso.esperado), contexto).toHaveLength(0)
          expect(portadoresDeError(), contexto).toHaveLength(0)
        }
        if (paso.donde === "campo") {
          expect(nuevos, contexto).toEqual([])
          expect(screen.queryAllByText(paso.esperado), contexto).toHaveLength(1)
          expect(portadoresDeError(), contexto).toHaveLength(1)
          const control = paso.control
          if (control === undefined) throw new Error("un paso de campo necesita su control")
          expect(control()).toHaveAccessibleDescription(paso.esperado)
        }
        if (paso.donde !== "exito") {
          formulario.conservado()
          expect(formulario.boton()).not.toHaveAttribute("aria-busy", "true")
          expect(formulario.boton()).not.toHaveAttribute("aria-disabled", "true")
        }
        sinRutasNiInvisibles()
        anteriores.push(paso.esperado)
      }

      // Tras un cambio de tipo, volver al material no trae ningún error de un envío anterior.
      if (formulario === ANUNCIO && pasos.some((paso) => paso.antes === aAnuncio)) {
        pulsarTipo(TEXTOS_FORMULARIO_PUBLICACION.material)
        await reposar()
        expect(campoTitulo()).not.toHaveAttribute("aria-invalid", "true")
        expect(campoTitulo()).not.toHaveAccessibleDescription()
        for (const previo of anteriores) expect(screen.queryAllByText(previo)).toHaveLength(0)
      }
      expect(respuestas, "se usaron todas las respuestas preparadas").toEqual([])
      expect(inesperadas).toEqual([])
    },
  )
})

// ---------------------------------------------------------------------------------------------------
// 2. Cambiar de tipo con la publicación en vuelo y justo al asentarse.

interface Retenida {
  soltar: (respuesta: Response) => void
}

const retener = (): { respuesta: Respuesta; retenida: Retenida } => {
  let soltar: (respuesta: Response) => void = () => {
    throw new Error("la respuesta retenida no se creó")
  }
  const promesa = new Promise<Response>((resolver) => {
    soltar = resolver
  })
  return { respuesta: () => promesa, retenida: { soltar: (r) => soltar(r) } }
}

interface CambioDeTipo {
  nombre: string
  formulario: Formulario
  mensaje: string
  // El tipo que se intenta pulsar mientras la publicación está en vuelo o se asienta.
  otroTipo: string
  // El tipo enviado, que debe seguir presionado.
  tipoEnviado: string
  donde: "aviso" | "campo"
  momento: "en vuelo" | "al asentarse"
}

const CAMBIOS_DE_TIPO: readonly CambioDeTipo[] = (["en vuelo", "al asentarse"] as const).flatMap(
  (momento) => [
    {
      nombre: `anuncio con «titulo:», «Material» ${momento}`,
      formulario: ANUNCIO,
      mensaje: `titulo: ${M1}`,
      otroTipo: TEXTOS_FORMULARIO_PUBLICACION.material,
      tipoEnviado: TEXTOS_FORMULARIO_PUBLICACION.anuncio,
      donde: "aviso" as const,
      momento,
    },
    {
      nombre: `material con «titulo:», «Anuncio» ${momento}`,
      formulario: MATERIAL,
      mensaje: `titulo: ${M1}`,
      otroTipo: TEXTOS_FORMULARIO_PUBLICACION.anuncio,
      tipoEnviado: TEXTOS_FORMULARIO_PUBLICACION.material,
      donde: "campo" as const,
      momento,
    },
  ],
)

describe("ataque CHORE-03 03b r2 · cambiar de tipo con la publicación en vuelo o al asentarse", () => {
  it.each(CAMBIOS_DE_TIPO.map((caso) => [caso.nombre, caso] as const))(
    "%s: el tipo no cambia y la decisión es la del tipo enviado (exactamente un mensaje)",
    async (_nombre, { formulario, mensaje, otroTipo, tipoEnviado, donde, momento }) => {
      esElEnvio = formulario.envio
      const { cliente } = await montarEnRouter(formulario)
      await formulario.llenar()
      await asentar(cliente)
      const { respuesta, retenida } = retener()
      respuestas.push(respuesta)
      fireEvent.click(formulario.boton())
      await waitFor(() => expect(llamadas.filter(formulario.envio)).toHaveLength(1))
      await reposar()
      expect(formulario.boton()).toHaveAttribute("aria-busy", "true")

      if (momento === "en vuelo") {
        pulsarTipo(otroTipo)
        await reposar()
        expect(tipoPresionado()).toEqual([tipoEnviado])
        await act(async () => {
          retenida.soltar(validacion(mensaje)())
          await Promise.resolve()
        })
      }
      if (momento === "al asentarse") {
        // Se pulsa el otro tipo en cada microtarea mientras la respuesta se procesa.
        await act(async () => {
          retenida.soltar(validacion(mensaje)())
          for (let i = 0; i < 40; i += 1) {
            await Promise.resolve()
            pulsarTipo(otroTipo)
          }
        })
      }
      await asentar(cliente)

      expect(tipoPresionado()).toEqual([tipoEnviado])
      if (donde === "aviso") {
        expect(avisos()).toEqual([M1])
        expect(screen.queryAllByText(M1)).toHaveLength(0)
        expect(portadoresDeError()).toHaveLength(0)
        // Al pasar ahora al material, ningún error bajo el título.
        pulsarTipo(TEXTOS_FORMULARIO_PUBLICACION.material)
        await reposar()
        expect(campoTitulo()).not.toHaveAttribute("aria-invalid", "true")
        expect(screen.queryAllByText(M1)).toHaveLength(0)
      }
      if (donde === "campo") {
        expect(avisos()).toEqual([])
        expect(screen.queryAllByText(M1)).toHaveLength(1)
        expect(campoTitulo()).toHaveAccessibleDescription(M1)
      }
      expect(formulario.boton()).not.toHaveAttribute("aria-busy", "true")
      expect(llamadas.filter(formulario.envio)).toHaveLength(1)
      expect(inesperadas).toEqual([])
    },
  )
})

// ---------------------------------------------------------------------------------------------------
// 3 y 4. O-19 y repetir el control, con el router real (`rutas`) y `Providers`.

interface CaminoReal {
  nombre: string
  rol: "maestro" | "admin"
  entradas: string[]
  indice: number
  envio: (llamada: Llamada) => boolean
  mensaje: string
  recorrer: (router: ReturnType<typeof createMemoryRouter>) => Promise<void>
}

const irYEsperar = async (
  router: ReturnType<typeof createMemoryRouter>,
  delta: number,
  destino: string,
) => {
  await act(async () => {
    await router.navigate(delta)
  })
  await waitFor(() => expect(router.state.location.pathname).toBe(destino))
  await reposar()
}

const enLaClase = async () => {
  expect(await screen.findByRole("link", { name: TEXTOS_CLASE.editar })).toBeInTheDocument()
  expect(screen.queryByText(GENERICO)).not.toBeInTheDocument()
}

const formularioLimpio = async () => {
  expect(await screen.findByLabelText(TEXTOS_FORMULARIO_CLASE.campoNombre)).toHaveValue("Álgebra I")
  await reposar()
  expect(portadoresDeError()).toHaveLength(0)
  expect(screen.queryByText(GENERICO)).not.toBeInTheDocument()
}

const cancelar = async (router: ReturnType<typeof createMemoryRouter>) => {
  fireEvent.click(screen.getByRole("link", { name: TEXTOS_FORMULARIO_CLASE.cancelar }))
  await waitFor(() => expect(router.state.location.pathname).toBe(RUTA_DE_LA_CLASE))
  await reposar()
  await enLaClase()
}

const esGuardar = es("PUT", `/api/admin/clases/${CLASE_ID}`)

const CAMINOS_REALES: readonly CaminoReal[] = [
  {
    nombre: "editar clase: «Cancelar» y «atrás» del historial",
    rol: "admin",
    entradas: [RUTA_EDITAR],
    indice: 0,
    envio: esGuardar,
    mensaje: "maestroIds:\u{200B}",
    recorrer: async (router) => {
      await cancelar(router)
      vi.setSystemTime(new Date(AHORA.getTime() + 10_000))
      await irYEsperar(router, -1, RUTA_EDITAR)
      await formularioLimpio()
    },
  },
  {
    nombre: "editar clase: «Cancelar», «atrás», «adelante» y «atrás» otra vez",
    rol: "admin",
    entradas: [RUTA_EDITAR],
    indice: 0,
    envio: esGuardar,
    mensaje: "maestroIds:\u{200B}",
    recorrer: async (router) => {
      await cancelar(router)
      vi.setSystemTime(new Date(AHORA.getTime() + 5_000))
      await irYEsperar(router, -1, RUTA_EDITAR)
      await formularioLimpio()
      vi.setSystemTime(new Date(AHORA.getTime() + 10_000))
      await irYEsperar(router, 1, RUTA_DE_LA_CLASE)
      await enLaClase()
      vi.setSystemTime(new Date(AHORA.getTime() + 15_000))
      await irYEsperar(router, -1, RUTA_EDITAR)
      await formularioLimpio()
    },
  },
  {
    nombre: "editar clase abierta desde la clase: «atrás» a la clase y «adelante» al formulario",
    rol: "admin",
    entradas: [RUTA_DE_LA_CLASE, RUTA_EDITAR],
    indice: 1,
    envio: esGuardar,
    mensaje: "maestroIds:\u{00A0}",
    recorrer: async (router) => {
      vi.setSystemTime(new Date(AHORA.getTime() + 5_000))
      await irYEsperar(router, -1, RUTA_DE_LA_CLASE)
      await enLaClase()
      vi.setSystemTime(new Date(AHORA.getTime() + 10_000))
      await irYEsperar(router, 1, RUTA_EDITAR)
      await formularioLimpio()
    },
  },
  {
    nombre: "editar clase: repetir «Guardar cambios» sin salir",
    rol: "admin",
    entradas: [RUTA_EDITAR],
    indice: 0,
    envio: esGuardar,
    mensaje: "maestroIds:\u{200B}",
    recorrer: async () => {
      expect(campoNombreClase()).toHaveValue("Álgebra II")
      expect(portadoresDeError()).toHaveLength(0)
    },
  },
  {
    nombre: "anuncio en el muro: repetir «Publicar anuncio» sin salir",
    rol: "maestro",
    entradas: [`/maestro/clases/${CLASE_ID}`],
    indice: 0,
    envio: es("POST", `${RUTA_CLASE}/publicaciones`),
    mensaje: "titulo:\u{200B}",
    recorrer: async () => {
      expect(campoAnuncio()).toHaveValue("Mañana hay examen")
      expect(portadoresDeError()).toHaveLength(0)
    },
  },
]

describe("ataque CHORE-03 03b r2 · el aviso genérico del campo que el modo no pinta, con rutas y Providers (O-19)", () => {
  it.each(CAMINOS_REALES.map((caso) => [caso.nombre, caso] as const))(
    "%s: el formulario no trae error y el envío siguiente es una petición nueva que responde bien",
    async (_nombre, { rol, entradas, indice, envio, mensaje, recorrer }) => {
      const { rutas } = await import("@/app/router")
      rolDeSesion = rol
      esElEnvio = envio
      const esAnuncio = rol === "maestro"
      respuestas = [
        validacion(mensaje),
        esAnuncio
          ? () => respuestaJson(201, publicacionDoble("anuncio"))
          : () => respuestaJson(200, claseDoble),
      ]
      const router = createMemoryRouter(rutas, { initialEntries: entradas, initialIndex: indice })
      render(
        <Providers>
          <RouterProvider router={router} />
        </Providers>,
      )
      if (esAnuncio) {
        const campo = await screen.findByLabelText(TEXTOS_FORMULARIO_PUBLICACION.campoAnuncio)
        fireEvent.change(campo, { target: { value: "Mañana hay examen" } })
      }
      if (!esAnuncio) {
        expect(await screen.findByLabelText(TEXTOS_FORMULARIO_CLASE.campoNombre)).toHaveValue(
          "Álgebra I",
        )
        escribir(TEXTOS_FORMULARIO_CLASE.campoNombre, "Álgebra II")
      }
      const boton = () =>
        screen.getByRole("button", {
          name: esAnuncio
            ? TEXTOS_FORMULARIO_PUBLICACION.publicarAnuncio
            : TEXTOS_FORMULARIO_CLASE.botonGuardar,
        })
      fireEvent.click(boton())
      await waitFor(() => expect(avisos()).toEqual([GENERICO]))
      await reposar()
      expect(portadoresDeError()).toHaveLength(0)
      expect(llamadas.filter(envio)).toHaveLength(1)

      await recorrer(router)

      fireEvent.click(boton())
      await waitFor(() => expect(llamadas.filter(envio)).toHaveLength(2))
      const segundo = llamadas.filter(envio)[1]?.cuerpo ?? ""
      expect(segundo).toContain(esAnuncio ? "Mañana hay examen" : "Álgebra")
      const exito = esAnuncio
        ? TEXTOS_FORMULARIO_PUBLICACION.avisoPublicado
        : TEXTOS_FORMULARIO_CLASE.avisoGuardada
      await waitFor(() => expect(exitos()).toEqual([exito]))
      await reposar()
      if (!esAnuncio) {
        await waitFor(() => expect(router.state.location.pathname).toBe(RUTA_DE_LA_CLASE))
      }
      if (esAnuncio) expect(campoAnuncio()).toHaveValue("")
      expect(avisos()).toEqual([GENERICO])
      expect(portadoresDeError()).toHaveLength(0)
      expect(respuestas).toEqual([])
      expect(inesperadas).toEqual([])
    },
  )
})
