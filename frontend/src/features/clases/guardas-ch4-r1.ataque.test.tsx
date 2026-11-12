import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { createMemoryRouter, RouterProvider } from "react-router"
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"

import { ApiError } from "@/services/apiClient"
import { establecerToken, limpiarToken } from "@/services/tokenAcceso"

import {
  claveCodigoDeClase,
  TEXTOS_BUSCADOR_ALUMNOS,
  TEXTOS_BUSCADOR_MAESTROS,
  TEXTOS_CLASES_ADMIN,
  TEXTOS_CLASES_ANTERIORES,
  TEXTOS_CODIGO,
  TEXTOS_COMENTARIOS,
  TEXTOS_MAESTROS_DE_CLASE,
  TEXTOS_PUBLICACION,
  TEXTOS_TABLA_ALUMNOS,
  TEXTOS_UNIRSE,
} from "./data"
import { mensajeDeErrorClases } from "./lib"

// Tester, ronda 1 de CHORE-04 (puntos 4, 5 y 6 del manager). El andamiaje (doble del servidor, montaje
// con `rutas` de app/router y las defaultOptions de app/providers.tsx, los ocho controles) es copia del
// de features/clases/guardas-ch4.test.tsx, para atacar con los mismos caminos; los casos ATQ-CH4-1x son
// del tester. "El mismo render" es dos eventos dentro de un solo act.

const aviso = vi.hoisted(() => Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }))
vi.mock("sonner", () => ({ toast: aviso, Toaster: () => null }))
vi.mock("@/services/navegacion", () => ({ irA: vi.fn(), rutaActual: vi.fn(() => "/") }))

type Rol = "estudiante" | "maestro" | "admin"
type Respuesta = () => Response | Promise<Response>

const ESPERA = { timeout: 5000 }
const uuid = (prefijo: string, n: number) =>
  `${prefijo}-1c1f-4b8e-9a1e-${String(n).padStart(12, "0")}`
const A = uuid("2a2b3c4d", 1)
const B = uuid("2a2b3c4d", 2)
const PUBLICACION = uuid("5a5b3c4d", 1)
const COMENTARIO = uuid("7a7b3c4d", 1)
const ALUMNO = uuid("6a6b3c4d", 1)
const CANDIDATO = uuid("9a9b3c4d", 1)
const MAESTRO_1 = { id: uuid("3a3b3c4d", 1), nombre: "Luis Pérez" }
const MAESTRO_2 = { id: uuid("3a3b3c4d", 2), nombre: "Marta Ruiz" }
const CANDIDATO_MAESTRO = { id: uuid("3a3b3c4d", 3), nombre: "Raúl Soto" }
const FIRMA = { ...MAESTRO_1, administracion: false }
const CREADO_EN = "2026-10-01T15:30:00.000Z"
const ARCHIVADA_EN = "2026-10-05T12:00:00.000Z"
const NOMBRES: Record<string, string> = { [A]: "Historia", [B]: "Geografía" }

const respuestaJson = (estado: number, cuerpo: unknown) =>
  new Response(JSON.stringify(cuerpo), {
    status: estado,
    headers: { "Content-Type": "application/json" },
  })
const sinContenido = () => new Response(null, { status: 204 })
const errorApi = (estado: number, codigo: string, mensaje = "mensaje del servidor") =>
  respuestaJson(estado, { error: { codigo, mensaje } })
const error500 = () => errorApi(500, "ERROR_INTERNO")

interface Servidor {
  rol: Rol
  maestros: Record<string, (typeof MAESTRO_1)[]>
  archivadas: Set<string>
  codigos: Record<string, string>
  regenerados: Record<string, string>
  refrescoFalla: boolean
}

let servidor: Servidor
let colas = new Map<string, Respuesta[]>()
let llamadas: string[] = []

const preparar = (clave: string, ...respuestas: Respuesta[]) => {
  const cola = colas.get(clave)
  if (cola === undefined) {
    colas.set(clave, [...respuestas])
    return
  }
  cola.push(...respuestas)
}

const peticiones = (clave: string) => llamadas.filter((llamada) => llamada === clave).length

const retenida = () => {
  const pendientes: ((respuesta: Response | Promise<Response>) => void)[] = []
  const respuesta: Respuesta = () =>
    new Promise<Response>((resolver) => {
      pendientes.push(resolver)
    })
  const soltar = async (valor: Respuesta) => {
    const resolver = pendientes.shift()
    if (resolver === undefined) throw new Error("Precondición: la petición retenida ya salió")
    await act(async () => {
      resolver(Promise.resolve().then(valor))
      await new Promise((r) => setTimeout(r, 0))
    })
  }
  return { respuesta, soltar }
}

const detalle = (claseId: string) => ({
  clase: {
    id: claseId,
    nombre: NOMBRES[claseId] ?? "Clase",
    descripcion: null,
    maestro: servidor.maestros[claseId]?.[0] ?? MAESTRO_1,
    maestros: servidor.maestros[claseId] ?? [MAESTRO_1],
    archivadaEn: servidor.archivadas.has(claseId) ? ARCHIVADA_EN : null,
  },
})

const listaVacia = { clases: [], total: 0, siguienteCursor: null }

const responder = (metodo: string, url: URL): Response | Promise<Response> => {
  const ruta = url.pathname
  if (ruta === "/api/auth/refrescar") {
    if (servidor.refrescoFalla) return errorApi(401, "NO_AUTENTICADO")
    return respuestaJson(200, { tokenAcceso: "token-de-prueba" })
  }
  if (ruta === "/api/me") {
    return respuestaJson(200, {
      id: uuid("4a4b3c4d", 1),
      nombre: "Ana López",
      email: "ana@ejemplo.mx",
      rol: servidor.rol,
      debeCambiarContrasena: false,
      accesoRestringido: false,
    })
  }
  if (ruta === "/api/clases/inscritas") {
    return respuestaJson(200, {
      clases: [
        {
          id: A,
          nombre: "Historia",
          maestro: { nombre: MAESTRO_1.nombre },
          maestros: [{ nombre: MAESTRO_1.nombre }],
        },
      ],
      total: 1,
      siguienteCursor: null,
    })
  }
  if (ruta === "/api/clases/impartidas") {
    return respuestaJson(200, {
      clases: [
        { id: A, nombre: "Historia", alumnos: 1 },
        { id: B, nombre: "Geografía", alumnos: 1 },
      ],
      total: 2,
      siguienteCursor: null,
    })
  }
  if (ruta === "/api/clases/anteriores") {
    return respuestaJson(200, { ...listaVacia, siguienteCursorArchivadaEn: null })
  }
  if (ruta === "/api/clases/unirse" && metodo === "POST") {
    return respuestaJson(200, { clase: { id: A, nombre: "Historia" }, yaEstabas: false })
  }
  if (ruta === "/api/admin/maestros/candidatos") {
    return respuestaJson(200, {
      candidatos: [{ ...CANDIDATO_MAESTRO, email: "raul@ejemplo.mx" }],
      hayMas: false,
    })
  }
  if (ruta.startsWith("/api/admin/clases/")) {
    const [, , , , claseId, accion] = ruta.split("/")
    if (claseId === undefined) return error500()
    if (accion === "restaurar" && metodo === "POST") {
      servidor.archivadas.delete(claseId)
      return respuestaJson(200, detalle(claseId))
    }
    if (accion === "maestros" && metodo === "POST") {
      return respuestaJson(200, { maestros: [MAESTRO_1, CANDIDATO_MAESTRO] })
    }
    if (accion === "maestros" && metodo === "DELETE") {
      return respuestaJson(200, { maestros: [MAESTRO_1] })
    }
    return error500()
  }
  const claseId = ruta.split("/")[3]
  if (claseId === undefined) return error500()
  const base = `/api/clases/${claseId}`
  if (ruta === base) return respuestaJson(200, detalle(claseId))
  if (ruta === `${base}/codigo` && metodo === "GET") {
    return respuestaJson(200, { codigo: servidor.codigos[claseId] ?? "ABCDEFG" })
  }
  if (ruta === `${base}/codigo` && metodo === "POST") {
    const nuevo = servidor.regenerados[claseId] ?? "QRSTUVW"
    servidor.codigos[claseId] = nuevo
    return respuestaJson(200, { codigo: nuevo })
  }
  if (ruta === `${base}/publicaciones` && metodo === "GET") {
    return respuestaJson(200, {
      publicaciones: [
        {
          id: PUBLICACION,
          tipo: "anuncio",
          titulo: null,
          texto: "Primer aviso",
          autor: FIRMA,
          creadoEn: CREADO_EN,
          comentarios: 1,
          adjuntos: [],
          puedeBorrar: true,
          tarea: null,
        },
      ],
      siguienteCursor: null,
    })
  }
  if (ruta === `${base}/publicaciones/${PUBLICACION}` && metodo === "DELETE") return sinContenido()
  if (ruta === `${base}/publicaciones/${PUBLICACION}/comentarios` && metodo === "GET") {
    return respuestaJson(200, {
      comentarios: [
        {
          id: COMENTARIO,
          texto: "Gracias",
          autor: FIRMA,
          creadoEn: CREADO_EN,
          propio: true,
          puedeBorrar: true,
        },
      ],
      siguienteCursor: null,
    })
  }
  if (ruta === `${base}/publicaciones/${PUBLICACION}/comentarios/${COMENTARIO}`) {
    return sinContenido()
  }
  if (ruta === `${base}/alumnos/candidatos`) {
    return respuestaJson(200, {
      candidatos: [
        { id: CANDIDATO, nombre: "Ana Uno", correoEnmascarado: "a***@x.mx", yaInscrito: false },
      ],
      hayMas: false,
    })
  }
  if (ruta === `${base}/alumnos` && metodo === "POST") {
    return respuestaJson(201, { alumno: { id: CANDIDATO, nombre: "Ana Uno" }, yaEstaba: false })
  }
  if (ruta === `${base}/alumnos/${ALUMNO}` && metodo === "DELETE") return sinContenido()
  if (ruta === `${base}/alumnos`) {
    return respuestaJson(200, {
      alumnos: [
        {
          id: ALUMNO,
          nombre: "Pedro Paz",
          email: "pedro@ejemplo.mx",
          estadoPago: "al_corriente",
          accesoRestringido: false,
          origen: "codigo",
          inscritoEn: CREADO_EN,
        },
      ],
      total: 1,
      siguienteCursor: null,
    })
  }
  if (ruta === `${base}/temas`) return respuestaJson(200, { temas: [], sinTema: 0 })
  return error500()
}

beforeAll(async () => {
  await import("@/app/router")
}, 60_000)

beforeEach(() => {
  establecerToken("token-de-prueba")
  servidor = {
    rol: "maestro",
    maestros: { [A]: [MAESTRO_1], [B]: [MAESTRO_1] },
    archivadas: new Set(),
    codigos: { [A]: "ABCDEFG", [B]: "HJKLMNP" },
    regenerados: { [A]: "QRSTUVW", [B]: "XYZ2345" },
    refrescoFalla: false,
  }
  colas = new Map()
  llamadas = []
  vi.stubGlobal(
    "fetch",
    vi.fn<typeof fetch>((entrada, init) => {
      const url = new URL(String(entrada), "http://x")
      const metodo = init?.method ?? "GET"
      const clave = `${metodo} ${url.pathname}`
      llamadas.push(clave)
      const siguiente = colas.get(clave)?.shift()
      if (siguiente !== undefined) return Promise.resolve().then(siguiente)
      return Promise.resolve().then(() => responder(metodo, url))
    }),
  )
})

afterEach(() => {
  cleanup()
  limpiarToken()
  vi.unstubAllGlobals()
  aviso.mockClear()
  aviso.success.mockClear()
  aviso.error.mockClear()
})

const montar = async (entradas: string[]) => {
  const { rutas } = await import("@/app/router")
  const router = createMemoryRouter(rutas, { initialEntries: entradas })
  const cliente = new QueryClient({
    defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false, staleTime: 30_000 } },
  })
  render(
    <QueryClientProvider client={cliente}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
  return { router, cliente }
}

const navegar = async (
  router: Awaited<ReturnType<typeof montar>>["router"],
  destino: string | number,
) => {
  await act(async () => {
    if (typeof destino === "number") await router.navigate(destino)
    else await router.navigate(destino)
  })
}

const enLasSecciones = (nombre: string) =>
  within(screen.getByRole("list", { name: "Secciones de la clase" })).getByRole("link", {
    name: nombre,
  })

const pulsarSeccion = async (nombre: string) => {
  const enlace = await waitFor(() => enLasSecciones(nombre), ESPERA)
  fireEvent.click(enlace)
}

const dosClicsEnElMismoRender = (boton: HTMLElement) => {
  act(() => {
    fireEvent.click(boton)
    fireEvent.click(boton)
  })
}

const esperarUnMomento = (ms = 30) => act(() => new Promise((resolver) => setTimeout(resolver, ms)))

const enEspera = async (boton: HTMLElement) => {
  await waitFor(() => expect(boton).toHaveAttribute("aria-busy", "true"), ESPERA)
}

const fueraDeEspera = async (boton: HTMLElement) => {
  await waitFor(() => expect(boton).not.toHaveAttribute("aria-busy", "true"), ESPERA)
  expect(boton).not.toHaveAttribute("aria-disabled", "true")
}

const boton = (nombre: string) => screen.queryByRole("button", { name: nombre })
const pulsar = async (nombre: string) => {
  fireEvent.click(await screen.findByRole("button", { name: nombre }, ESPERA))
}
const escribirEn = async (etiqueta: string, valor: string) => {
  const campo = await screen.findByLabelText(etiqueta, {}, ESPERA)
  fireEvent.change(campo, { target: { value: valor } })
}

interface Control {
  nombre: string
  rol: Rol
  ruta: string
  // Para CH4-22: el enlace que se pulsa estando ya en él.
  pulsarActiva: () => Promise<void>
  // Para CH4-23: ir a otra sección o ruta y volver.
  irYVolver: (router: Awaited<ReturnType<typeof montar>>["router"]) => Promise<void>
  clave: string
  // Deja visible el control final (abre la confirmación, busca o escribe el código).
  abrir: () => Promise<void>
  siempreAbrir: boolean
  control: () => HTMLElement | null
  // El aviso de error que da hoy el control ante ese error (null: ninguno).
  avisoDeError: (error: ApiError) => string | null
  conDosMaestros: boolean
}

const avisoDeClases = (error: ApiError) => mensajeDeErrorClases(error)
const REDIRIGEN = ["ACCESO_RESTRINGIDO", "CAMBIO_DE_CONTRASENA_REQUERIDO", "NO_AUTENTICADO"]

const secciones = (otra: string, vuelta: string) => async () => {
  await pulsarSeccion(otra)
  await pulsarSeccion(vuelta)
}

const BASE_MAESTRO = `/maestro/clases/${A}`
const BASE_ADMIN = `/admin/clases/${A}`

const CONTROLES: readonly Control[] = [
  {
    nombre: "«Sí, regenerar»",
    rol: "maestro",
    ruta: BASE_MAESTRO,
    pulsarActiva: () => pulsarSeccion("Avisos"),
    irYVolver: secciones("Personas", "Avisos"),
    clave: `POST /api/clases/${A}/codigo`,
    abrir: () => pulsar(TEXTOS_CODIGO.regenerar),
    siempreAbrir: false,
    control: () => boton(TEXTOS_CODIGO.siRegenerar),
    avisoDeError: (error) =>
      REDIRIGEN.includes(error.codigo) ? null : TEXTOS_CODIGO.avisoErrorRegenerar,
    conDosMaestros: false,
  },
  {
    nombre: "«Unirme a la clase»",
    rol: "estudiante",
    ruta: "/estudiante",
    pulsarActiva: async () => {
      const navegacion = screen.getByRole("navigation", { name: "Navegación principal" })
      fireEvent.click(within(navegacion).getByRole("link", { name: "Inicio" }))
    },
    irYVolver: async (router) => {
      fireEvent.click(
        await screen.findByRole("link", { name: TEXTOS_CLASES_ANTERIORES.anteriores.titulo }),
      )
      await waitFor(() =>
        expect(router.state.location.pathname).toBe("/estudiante/clases-anteriores"),
      )
      await navegar(router, -1)
      await waitFor(() => expect(router.state.location.pathname).toBe("/estudiante"))
    },
    clave: "POST /api/clases/unirse",
    abrir: () => escribirEn(TEXTOS_UNIRSE.campoCodigo, "ABCDEFG"),
    siempreAbrir: true,
    control: () => boton(TEXTOS_UNIRSE.boton),
    avisoDeError: avisoDeClases,
    conDosMaestros: false,
  },
  {
    nombre: "«Agregar a la clase»",
    rol: "maestro",
    ruta: `${BASE_MAESTRO}/personas`,
    pulsarActiva: () => pulsarSeccion("Personas"),
    irYVolver: secciones("Avisos", "Personas"),
    clave: `POST /api/clases/${A}/alumnos`,
    abrir: () => escribirEn(TEXTOS_BUSCADOR_ALUMNOS.campo, "Ana"),
    siempreAbrir: false,
    control: () => boton(`${TEXTOS_BUSCADOR_ALUMNOS.agregar} Ana Uno`),
    avisoDeError: avisoDeClases,
    conDosMaestros: false,
  },
  {
    nombre: "«Asignar a la clase»",
    rol: "admin",
    ruta: `${BASE_ADMIN}/personas`,
    pulsarActiva: () => pulsarSeccion("Personas"),
    irYVolver: secciones("Avisos", "Personas"),
    clave: `POST /api/admin/clases/${A}/maestros`,
    abrir: () => escribirEn(TEXTOS_BUSCADOR_MAESTROS.campo, "Raúl"),
    siempreAbrir: false,
    control: () => boton(`${TEXTOS_BUSCADOR_MAESTROS.asignar} ${CANDIDATO_MAESTRO.nombre}`),
    avisoDeError: avisoDeClases,
    conDosMaestros: false,
  },
  {
    nombre: "«Sí, quitar» de un maestro",
    rol: "admin",
    ruta: `${BASE_ADMIN}/personas`,
    pulsarActiva: () => pulsarSeccion("Personas"),
    irYVolver: secciones("Avisos", "Personas"),
    clave: `DELETE /api/admin/clases/${A}/maestros/${MAESTRO_2.id}`,
    abrir: () => pulsar(`${TEXTOS_MAESTROS_DE_CLASE.quitar} ${MAESTRO_2.nombre}`),
    siempreAbrir: false,
    control: () => boton(`${TEXTOS_MAESTROS_DE_CLASE.siQuitar} ${MAESTRO_2.nombre}`),
    avisoDeError: avisoDeClases,
    conDosMaestros: true,
  },
  {
    nombre: "«Sí, borrar comentario»",
    rol: "maestro",
    ruta: BASE_MAESTRO,
    pulsarActiva: () => pulsarSeccion("Avisos"),
    irYVolver: secciones("Personas", "Avisos"),
    clave: `DELETE /api/clases/${A}/publicaciones/${PUBLICACION}/comentarios/${COMENTARIO}`,
    abrir: async () => {
      if (boton(TEXTOS_COMENTARIOS.borrar) === null) {
        await pulsar(TEXTOS_PUBLICACION.verComentarios(1))
      }
      await pulsar(TEXTOS_COMENTARIOS.borrar)
    },
    siempreAbrir: false,
    control: () => boton(TEXTOS_COMENTARIOS.siBorrarComentario),
    avisoDeError: avisoDeClases,
    conDosMaestros: false,
  },
  {
    nombre: "«Sí, borrar» de una publicación",
    rol: "maestro",
    ruta: BASE_MAESTRO,
    pulsarActiva: () => pulsarSeccion("Avisos"),
    irYVolver: secciones("Personas", "Avisos"),
    clave: `DELETE /api/clases/${A}/publicaciones/${PUBLICACION}`,
    abrir: () => pulsar(TEXTOS_PUBLICACION.borrarPublicacion),
    siempreAbrir: false,
    control: () => boton(TEXTOS_PUBLICACION.siBorrar),
    avisoDeError: avisoDeClases,
    conDosMaestros: false,
  },
  {
    nombre: "«Sí, quitar» de un alumno",
    rol: "maestro",
    ruta: `${BASE_MAESTRO}/personas`,
    pulsarActiva: () => pulsarSeccion("Personas"),
    irYVolver: secciones("Avisos", "Personas"),
    clave: `DELETE /api/clases/${A}/alumnos/${ALUMNO}`,
    abrir: () => pulsar(`${TEXTOS_TABLA_ALUMNOS.quitar} Pedro Paz`),
    siempreAbrir: false,
    control: () => boton(`${TEXTOS_TABLA_ALUMNOS.siQuitar} Pedro Paz`),
    avisoDeError: avisoDeClases,
    conDosMaestros: false,
  },
]

const obtenerControl = async (control: Control): Promise<HTMLElement> => {
  if (control.siempreAbrir || control.control() === null) await control.abrir()
  return await waitFor(() => {
    const elemento = control.control()
    if (elemento === null) throw new Error(`Precondición: ${control.nombre} está a la vista`)
    return elemento
  }, ESPERA)
}

const montarControl = async (control: Control) => {
  servidor.rol = control.rol
  if (control.conDosMaestros) servidor.maestros[A] = [MAESTRO_1, MAESTRO_2]
  const montado = await montar([control.ruta])
  return { ...montado, elemento: await obtenerControl(control) }
}

// ---- Ataque CHORE-04 r1 (casos propios del tester) ----

const unAvisoDeError = async (texto: string) => {
  await waitFor(() => expect(aviso.error).toHaveBeenCalledTimes(1), ESPERA)
  expect(aviso.error.mock.calls[0]?.[0]).toBe(texto)
}

const errorDe = (estado: number, codigo: string) =>
  new ApiError(codigo, "mensaje del servidor", estado)

// Punto 6 del manager: las clases de error de la matriz de §D-6 sin caso propio. Tras el error, el
// aviso de hoy (uno o ninguno), y la ref libre y guardando: dos clics en el mismo render, una petición.
const ERRORES_SIN_CASO: readonly (readonly [string, Respuesta, ApiError])[] = [
  [
    "503 SERVICIO_OCUPADO",
    () => errorApi(503, "SERVICIO_OCUPADO"),
    errorDe(503, "SERVICIO_OCUPADO"),
  ],
  [
    "403 CAMBIO_DE_CONTRASENA_REQUERIDO",
    () => errorApi(403, "CAMBIO_DE_CONTRASENA_REQUERIDO"),
    errorDe(403, "CAMBIO_DE_CONTRASENA_REQUERIDO"),
  ],
  ["409 CONFLICTO", () => errorApi(409, "CONFLICTO"), errorDe(409, "CONFLICTO")],
]

describe("ataque CHORE-04 r1 · la ref de los controles de clases tras 503, 403 CAMBIO_DE_CONTRASENA_REQUERIDO y 409", () => {
  it.each(
    CONTROLES.flatMap((control) =>
      ERRORES_SIN_CASO.map(
        ([clase, respuesta, error]) => [control.nombre, clase, control, respuesta, error] as const,
      ),
    ),
  )(
    "ATQ-CH4-10: %s con %s: el aviso de hoy (uno o ninguno), el control sale de la espera y después dos clics en el mismo render mandan una sola petición más",
    async (nombre, _clase, control, respuesta, error) => {
      preparar(control.clave, respuesta)
      const { elemento } = await montarControl(control)

      fireEvent.click(elemento)
      await waitFor(() => expect(peticiones(control.clave)).toBe(1), ESPERA)
      await esperarUnMomento(50)

      const esperado = control.avisoDeError(error)
      if (esperado === null) {
        expect(aviso.error, nombre).not.toHaveBeenCalled()
      } else {
        await unAvisoDeError(esperado)
      }

      const pendiente = retenida()
      preparar(control.clave, pendiente.respuesta)
      const otraVez = await obtenerControl(control)
      await fueraDeEspera(otraVez)
      dosClicsEnElMismoRender(otraVez)
      await esperarUnMomento()

      expect(peticiones(control.clave)).toBe(2)
      await enEspera(otraVez)
      await pendiente.soltar(error500)
      await esperarUnMomento(50)
      expect(peticiones(control.clave)).toBe(2)
      expect(aviso.error.mock.calls.length).toBe(esperado === null ? 1 : 2)
    },
  )

  it.each(ERRORES_SIN_CASO)(
    "ATQ-CH4-11: «Restaurar» del aviso de clase archivada con %s: a lo más un aviso, sale de la espera y después dos clics en el mismo render mandan una sola petición más",
    async (_clase, respuesta, error) => {
      servidor.rol = "admin"
      servidor.archivadas = new Set([A])
      const clave = `POST /api/admin/clases/${A}/restaurar`
      preparar(clave, respuesta)
      await montar([BASE_ADMIN])
      const restaurar = await screen.findByRole(
        "button",
        { name: TEXTOS_CLASES_ADMIN.restaurar },
        ESPERA,
      )

      fireEvent.click(restaurar)
      await waitFor(() => expect(peticiones(clave)).toBe(1), ESPERA)
      await fueraDeEspera(restaurar)
      await esperarUnMomento(50)
      expect(aviso.error).toHaveBeenCalledTimes(REDIRIGEN.includes(error.codigo) ? 0 : 1)

      const pendiente = retenida()
      preparar(clave, pendiente.respuesta)
      dosClicsEnElMismoRender(restaurar)
      await esperarUnMomento()
      expect(peticiones(clave)).toBe(2)
      await enEspera(restaurar)
      await pendiente.soltar(error500)
      await fueraDeEspera(restaurar)
      expect(peticiones(clave)).toBe(2)
    },
  )
})

describe("ataque CHORE-04 r1 · cambio de clase con la petición en vuelo (punto 4 del manager)", () => {
  const claveRegenerar = (claseId: string) => `POST /api/clases/${claseId}/codigo`
  const BASE_B = `/maestro/clases/${B}`
  const titulo = (nombre: string) =>
    screen.findByRole("heading", { level: 1, name: nombre }, ESPERA)

  // Ningún código nuevo de una clase aparece en la otra, ni en pantalla ni en la caché.
  const sinCruces = (cliente: QueryClient) => {
    expect(cliente.getQueryData(claveCodigoDeClase(B))).not.toEqual({ codigo: "QRSTUVW" })
    expect(cliente.getQueryData(claveCodigoDeClase(A))).not.toEqual({ codigo: "XYZ2345" })
  }

  it("ATQ-CH4-12: «Sí, regenerar» A → B → A → B con el POST de A retenido: en B la confirmación está cerrada y no espera; el POST de B sale; cada respuesta escribe solo su clase y al final nada espera", async () => {
    const deA = retenida()
    const deB = retenida()
    preparar(claveRegenerar(A), deA.respuesta)
    preparar(claveRegenerar(B), deB.respuesta)
    const { router, cliente } = await montar([BASE_B])
    await screen.findByText("HJKLMNP", {}, ESPERA)
    await navegar(router, BASE_MAESTRO)
    await screen.findByText("ABCDEFG", {}, ESPERA)
    await pulsar(TEXTOS_CODIGO.regenerar)
    await pulsar(TEXTOS_CODIGO.siRegenerar)
    await waitFor(() => expect(peticiones(claveRegenerar(A))).toBe(1))

    // A → B → A → B por el historial, sin soltar A.
    await navegar(router, -1)
    await titulo("Geografía")
    await navegar(router, 1)
    await titulo("Historia")
    expect(boton(TEXTOS_CODIGO.siRegenerar)).toBeNull()
    await navegar(router, -1)
    await titulo("Geografía")
    await screen.findByText("HJKLMNP", {}, ESPERA)
    expect(boton(TEXTOS_CODIGO.siRegenerar)).toBeNull()
    sinCruces(cliente)

    // En B: abrir y confirmar manda el POST de B, sin esperar por A.
    await pulsar(TEXTOS_CODIGO.regenerar)
    const siB = await screen.findByRole("button", { name: TEXTOS_CODIGO.siRegenerar }, ESPERA)
    await fueraDeEspera(siB)
    dosClicsEnElMismoRender(siB)
    await esperarUnMomento()
    expect(peticiones(claveRegenerar(B))).toBe(1)
    await enEspera(siB)

    // A responde estando en B: B sigue en espera por lo suyo y conserva su código.
    await deA.soltar(() => {
      servidor.codigos[A] = "QRSTUVW"
      return respuestaJson(200, { codigo: "QRSTUVW" })
    })
    await waitFor(() => expect(aviso.success).toHaveBeenCalledTimes(1), ESPERA)
    expect(screen.getByText("HJKLMNP")).toBeInTheDocument()
    expect(screen.queryByText("QRSTUVW")).toBeNull()
    await enEspera(screen.getByRole("button", { name: TEXTOS_CODIGO.siRegenerar }))
    expect(cliente.getQueryData(claveCodigoDeClase(A))).toEqual({ codigo: "QRSTUVW" })
    sinCruces(cliente)

    // B responde: su código nuevo, su confirmación cerrada y nada en espera.
    await deB.soltar(() => {
      servidor.codigos[B] = "XYZ2345"
      return respuestaJson(200, { codigo: "XYZ2345" })
    })
    expect(await screen.findByText("XYZ2345", {}, ESPERA)).toBeInTheDocument()
    await waitFor(() => expect(boton(TEXTOS_CODIGO.siRegenerar)).toBeNull(), ESPERA)
    expect(screen.queryAllByRole("button", { busy: true })).toHaveLength(0)
    sinCruces(cliente)

    // De vuelta en A: su código nuevo y nada en espera; regenerar en A manda otro POST de A.
    await navegar(router, 1)
    await titulo("Historia")
    expect(await screen.findByText("QRSTUVW", {}, ESPERA)).toBeInTheDocument()
    expect(screen.queryAllByRole("button", { busy: true })).toHaveLength(0)
    await pulsar(TEXTOS_CODIGO.regenerar)
    await pulsar(TEXTOS_CODIGO.siRegenerar)
    await waitFor(() => expect(peticiones(claveRegenerar(A))).toBe(2), ESPERA)
    expect(peticiones(claveRegenerar(B))).toBe(1)
    expect(aviso.error).not.toHaveBeenCalled()
  })

  it("ATQ-CH4-13: «Sí, regenerar» con la confirmación de B abierta mientras A vuela: al responder A, la de B sigue abierta y sin espera; al volver a A con B abierta, la de B se cierra y no reaparece al regresar a B", async () => {
    const deA = retenida()
    preparar(claveRegenerar(A), deA.respuesta)
    const { router, cliente } = await montar([BASE_B])
    await screen.findByText("HJKLMNP", {}, ESPERA)
    await navegar(router, BASE_MAESTRO)
    await screen.findByText("ABCDEFG", {}, ESPERA)
    await pulsar(TEXTOS_CODIGO.regenerar)
    await pulsar(TEXTOS_CODIGO.siRegenerar)
    await waitFor(() => expect(peticiones(claveRegenerar(A))).toBe(1))
    await navegar(router, -1)
    await titulo("Geografía")

    await pulsar(TEXTOS_CODIGO.regenerar)
    const siB = await screen.findByRole("button", { name: TEXTOS_CODIGO.siRegenerar }, ESPERA)
    await fueraDeEspera(siB)

    // Ir a A con la confirmación de B abierta: A muestra la suya cerrada (y en espera si se abre).
    await navegar(router, 1)
    await titulo("Historia")
    expect(boton(TEXTOS_CODIGO.siRegenerar)).toBeNull()
    expect(boton(TEXTOS_CODIGO.cancelar)).toBeNull()
    await navegar(router, -1)
    await titulo("Geografía")
    expect(boton(TEXTOS_CODIGO.siRegenerar)).toBeNull()

    // Abrir otra vez en B y soltar A: la de B sigue abierta y sin espera.
    await pulsar(TEXTOS_CODIGO.regenerar)
    await deA.soltar(() => respuestaJson(200, { codigo: "QRSTUVW" }))
    await waitFor(() => expect(aviso.success).toHaveBeenCalledTimes(1), ESPERA)
    const siBOtraVez = await screen.findByRole(
      "button",
      { name: TEXTOS_CODIGO.siRegenerar },
      ESPERA,
    )
    await fueraDeEspera(siBOtraVez)
    expect(screen.getByText("HJKLMNP")).toBeInTheDocument()
    sinCruces(cliente)
    fireEvent.click(siBOtraVez)
    await waitFor(() => expect(peticiones(claveRegenerar(B))).toBe(1), ESPERA)
    expect(await screen.findByText("XYZ2345", {}, ESPERA)).toBeInTheDocument()
    sinCruces(cliente)
  })

  it("ATQ-CH4-14: «Restaurar» entre dos clases archivadas, A → B → A con las dos en vuelo: A espera por la caché y no manda otra; las respuestas en cualquier orden no dejan nada en espera", async () => {
    servidor.rol = "admin"
    servidor.archivadas = new Set([A, B])
    const claveRestaurar = (claseId: string) => `POST /api/admin/clases/${claseId}/restaurar`
    const deA = retenida()
    const deB = retenida()
    preparar(claveRestaurar(A), deA.respuesta)
    preparar(claveRestaurar(B), deB.respuesta)
    const restaurarDe = () =>
      screen.findByRole("button", { name: TEXTOS_CLASES_ADMIN.restaurar }, ESPERA)
    const { router } = await montar([`/admin/clases/${B}`])
    await restaurarDe()
    await navegar(router, BASE_ADMIN)
    await titulo("Historia")
    fireEvent.click(await restaurarDe())
    await waitFor(() => expect(peticiones(claveRestaurar(A))).toBe(1))

    await navegar(router, -1)
    await titulo("Geografía")
    const restaurarB = await restaurarDe()
    await fueraDeEspera(restaurarB)
    dosClicsEnElMismoRender(restaurarB)
    await esperarUnMomento()
    expect(peticiones(claveRestaurar(B))).toBe(1)

    await navegar(router, 1)
    await titulo("Historia")
    const restaurarA = await restaurarDe()
    await enEspera(restaurarA)
    dosClicsEnElMismoRender(restaurarA)
    await esperarUnMomento()
    expect(peticiones(claveRestaurar(A))).toBe(1)

    // B responde primero, estando en A: A sigue esperando por lo suyo.
    await deB.soltar(() => {
      servidor.archivadas.delete(B)
      return respuestaJson(200, detalle(B))
    })
    await waitFor(() => expect(aviso.success).toHaveBeenCalledTimes(1), ESPERA)
    await enEspera(await restaurarDe())

    await deA.soltar(() => {
      servidor.archivadas.delete(A)
      return respuestaJson(200, detalle(A))
    })
    await waitFor(() => expect(aviso.success).toHaveBeenCalledTimes(2), ESPERA)
    await waitFor(
      () => expect(screen.queryAllByRole("button", { busy: true })).toHaveLength(0),
      ESPERA,
    )
    expect(peticiones(claveRestaurar(A))).toBe(1)
    expect(peticiones(claveRestaurar(B))).toBe(1)
    expect(aviso.error).not.toHaveBeenCalled()
  })
})

// Punto 5 del manager (y su hermano de alumnos): una fila con key por id sobrevive al cambio de clase si
// la misma persona está en las dos clases. Lo que fija la prueba es que nada quede tomado; lo que se ve
// en B mientras A vuela es H-3 / O-E3-1 (observación del reporte).
describe("ataque CHORE-04 r1 · «Sí, quitar» de una persona que está en las dos clases (punto 5 del manager)", () => {
  it("ATQ-CH4-15: maestro en A y en B, con el retiro de A retenido, saltar a B y soltar: nada queda en espera y «Sí, quitar» de B manda la petición de B", async () => {
    servidor.rol = "admin"
    servidor.maestros[A] = [MAESTRO_1, MAESTRO_2]
    servidor.maestros[B] = [MAESTRO_1, MAESTRO_2]
    const claveDe = (claseId: string) =>
      `DELETE /api/admin/clases/${claseId}/maestros/${MAESTRO_2.id}`
    const pendiente = retenida()
    preparar(claveDe(A), pendiente.respuesta)
    const { router } = await montar([`/admin/clases/${B}/personas`])
    await screen.findByRole("heading", { level: 1, name: "Geografía" }, ESPERA)
    await navegar(router, `${BASE_ADMIN}/personas`)
    await screen.findByRole("heading", { level: 1, name: "Historia" }, ESPERA)
    await pulsar(`${TEXTOS_MAESTROS_DE_CLASE.quitar} ${MAESTRO_2.nombre}`)
    await pulsar(`${TEXTOS_MAESTROS_DE_CLASE.siQuitar} ${MAESTRO_2.nombre}`)
    await waitFor(() => expect(peticiones(claveDe(A))).toBe(1))

    await navegar(router, -1)
    await screen.findByRole("heading", { level: 1, name: "Geografía" }, ESPERA)
    await pendiente.soltar(() => respuestaJson(200, { maestros: [MAESTRO_1] }))
    await esperarUnMomento(50)
    expect(screen.queryAllByRole("button", { busy: true })).toHaveLength(0)

    // La confirmación de B puede llegar abierta desde A (observación del punto 5); se abre si no.
    if (boton(`${TEXTOS_MAESTROS_DE_CLASE.siQuitar} ${MAESTRO_2.nombre}`) === null) {
      await pulsar(`${TEXTOS_MAESTROS_DE_CLASE.quitar} ${MAESTRO_2.nombre}`)
    }
    const siB = await screen.findByRole(
      "button",
      { name: `${TEXTOS_MAESTROS_DE_CLASE.siQuitar} ${MAESTRO_2.nombre}` },
      ESPERA,
    )
    await fueraDeEspera(siB)
    dosClicsEnElMismoRender(siB)
    await esperarUnMomento()
    expect(peticiones(claveDe(B))).toBe(1)
    expect(peticiones(claveDe(A))).toBe(1)
  })

  it("ATQ-CH4-16: alumno en A y en B, con el retiro de A retenido, saltar a B y soltar: nada queda en espera y «Sí, quitar» de B manda la petición de B", async () => {
    const claveDe = (claseId: string) => `DELETE /api/clases/${claseId}/alumnos/${ALUMNO}`
    const pendiente = retenida()
    preparar(claveDe(A), pendiente.respuesta)
    const { router } = await montar([`/maestro/clases/${B}/personas`])
    await screen.findByRole("heading", { level: 1, name: "Geografía" }, ESPERA)
    await navegar(router, `${BASE_MAESTRO}/personas`)
    await screen.findByRole("heading", { level: 1, name: "Historia" }, ESPERA)
    await pulsar(`${TEXTOS_TABLA_ALUMNOS.quitar} Pedro Paz`)
    await pulsar(`${TEXTOS_TABLA_ALUMNOS.siQuitar} Pedro Paz`)
    await waitFor(() => expect(peticiones(claveDe(A))).toBe(1))

    await navegar(router, -1)
    await screen.findByRole("heading", { level: 1, name: "Geografía" }, ESPERA)
    await pendiente.soltar(sinContenido)
    await esperarUnMomento(50)
    expect(screen.queryAllByRole("button", { busy: true })).toHaveLength(0)

    // La confirmación de B puede llegar abierta desde A (observación del punto 5); se abre si no.
    if (boton(`${TEXTOS_TABLA_ALUMNOS.siQuitar} Pedro Paz`) === null) {
      await pulsar(`${TEXTOS_TABLA_ALUMNOS.quitar} Pedro Paz`)
    }
    const siB = await screen.findByRole(
      "button",
      { name: `${TEXTOS_TABLA_ALUMNOS.siQuitar} Pedro Paz` },
      ESPERA,
    )
    await fueraDeEspera(siB)
    dosClicsEnElMismoRender(siB)
    await esperarUnMomento()
    expect(peticiones(claveDe(B))).toBe(1)
    expect(peticiones(claveDe(A))).toBe(1)
  })
})
