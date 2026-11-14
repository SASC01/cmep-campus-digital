import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { createMemoryRouter, RouterProvider } from "react-router"
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"

import { ApiError } from "@/services/apiClient"
import { establecerToken, limpiarToken } from "@/services/tokenAcceso"

import {
  claveClaseDetalle,
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

// CHORE-04 (§D-1 a §D-4 ter; filas 3 a 6 y 19 a 22, «Restaurar» del aviso y «Sí, regenerar» con cambio
// de clase): las guardas de doble clic de los ocho controles de features/clases, con el router real
// (`rutas` de app/router) y la caché con las defaultOptions de app/providers.tsx. "El mismo render" es
// dos eventos dentro de un solo act. La red es un doble de fetch que cuenta por método y ruta; las
// respuestas que la prueba necesita sostener se retienen con una promesa que la prueba suelta.

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
const errorDeRed = () => Promise.reject(new TypeError("Failed to fetch"))

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

const avisoDeClases = (error: ApiError) =>
  REDIRIGEN.includes(error.codigo) ? null : mensajeDeErrorClases(error)
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

const POR_NOMBRE = CONTROLES.map((control) => [control.nombre, control] as const)

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

const errorDe500 = new ApiError("ERROR_INTERNO", "mensaje del servidor", 500)
const errorDeRedEsperado = new ApiError("SIN_CONEXION", "No pudimos conectar con el servidor.", 0)

const unAvisoDeError = async (texto: string) => {
  await waitFor(() => expect(aviso.error).toHaveBeenCalledTimes(1), ESPERA)
  expect(aviso.error.mock.calls[0]?.[0]).toBe(texto)
}

const avisoEsperado = (control: Control, error: ApiError) => {
  const texto = control.avisoDeError(error)
  if (texto === null) throw new Error(`Precondición: ${control.nombre} avisa ante ${error.codigo}`)
  return texto
}

describe("CHORE-04 · controles de features/clases: una sola petición", () => {
  it.each(POR_NOMBRE)(
    "CH4-20: %s, dos clics en el mismo render mandan una sola petición y el control espera hasta la respuesta",
    async (_nombre, control) => {
      const pendiente = retenida()
      preparar(control.clave, pendiente.respuesta)
      const { elemento } = await montarControl(control)

      dosClicsEnElMismoRender(elemento)
      await esperarUnMomento()

      expect(peticiones(control.clave), control.clave).toBe(1)
      await enEspera(elemento)
      await pendiente.soltar(error500)
      expect(peticiones(control.clave)).toBe(1)
    },
  )

  it("CH4-20: «Unirme a la clase», dos submit en el mismo render mandan una sola petición, el segundo con defaultPrevented", async () => {
    const control = CONTROLES[1]
    if (control === undefined) throw new Error("Precondición: existe «Unirme a la clase»")
    const pendiente = retenida()
    preparar(control.clave, pendiente.respuesta)
    const { elemento } = await montarControl(control)
    const formulario = elemento.closest("form")
    if (formulario === null) throw new Error("Precondición: el botón está en un formulario")

    const resultados: boolean[] = []
    act(() => {
      resultados.push(fireEvent.submit(formulario))
      resultados.push(fireEvent.submit(formulario))
    })
    await esperarUnMomento()

    expect(resultados[1]).toBe(false)
    expect(peticiones(control.clave)).toBe(1)
    await enEspera(elemento)
    await pendiente.soltar(error500)
  })
})

const ERRORES_DE_REINTENTO: readonly (readonly [string, Respuesta, ApiError])[] = [
  ["500", error500, errorDe500],
  ["red", errorDeRed, errorDeRedEsperado],
]

describe("CHORE-04 · «Inténtalo de nuevo» en features/clases", () => {
  it.each(
    CONTROLES.flatMap((control) =>
      ERRORES_DE_REINTENTO.map(
        ([clase, respuesta, error]) => [control.nombre, clase, control, respuesta, error] as const,
      ),
    ),
  )(
    "CH4-21: %s con %s, un solo aviso, el control sale de la espera y repetirlo manda la segunda petición",
    async (_nombre, _clase, control, respuesta, error) => {
      preparar(control.clave, respuesta)
      const { elemento } = await montarControl(control)

      fireEvent.click(elemento)

      await unAvisoDeError(avisoEsperado(control, error))
      await waitFor(() => {
        const actual = control.control()
        if (actual !== null) expect(actual).not.toHaveAttribute("aria-busy", "true")
      }, ESPERA)
      const otraVez = await obtenerControl(control)
      await fueraDeEspera(otraVez)
      fireEvent.click(otraVez)
      await waitFor(() => expect(peticiones(control.clave)).toBe(2), ESPERA)
      expect(aviso.error).toHaveBeenCalledTimes(1)
    },
  )

  it.each(POR_NOMBRE)(
    "CH4-22: %s, tras el 500, pulsar la sección activa (otra location.key en la misma ruta) y repetir el control manda la segunda petición sin repetir el aviso viejo",
    async (_nombre, control) => {
      preparar(control.clave, error500)
      const { router, elemento } = await montarControl(control)
      fireEvent.click(elemento)
      await unAvisoDeError(avisoEsperado(control, errorDe500))
      const ruta = router.state.location.pathname
      const clave = router.state.location.key

      await control.pulsarActiva()

      await waitFor(() => expect(router.state.location.key).not.toBe(clave))
      expect(router.state.location.pathname).toBe(ruta)
      const otraVez = await obtenerControl(control)
      await fueraDeEspera(otraVez)
      fireEvent.click(otraVez)
      await waitFor(() => expect(peticiones(control.clave)).toBe(2), ESPERA)
      await esperarUnMomento()
      expect(aviso.error).toHaveBeenCalledTimes(1)
    },
  )

  it.each(POR_NOMBRE)(
    "CH4-23: %s, tras el 500, ir a otra sección y volver antes de que venza el staleTime y repetir el control manda la segunda petición",
    async (_nombre, control) => {
      preparar(control.clave, error500)
      const { router, elemento } = await montarControl(control)
      fireEvent.click(elemento)
      await unAvisoDeError(avisoEsperado(control, errorDe500))

      await control.irYVolver(router)

      const otraVez = await obtenerControl(control)
      await fueraDeEspera(otraVez)
      fireEvent.click(otraVez)
      await waitFor(() => expect(peticiones(control.clave)).toBe(2), ESPERA)
    },
  )
})

const CON_CONFIRMACION = CONTROLES.filter((control) =>
  [
    "«Sí, regenerar»",
    "«Sí, quitar» de un maestro",
    "«Sí, borrar comentario»",
    "«Sí, borrar» de una publicación",
    "«Sí, quitar» de un alumno",
  ].includes(control.nombre),
)

const CANCELAR: Record<string, string> = {
  "«Sí, regenerar»": TEXTOS_CODIGO.cancelar,
  "«Sí, quitar» de un maestro": `${TEXTOS_MAESTROS_DE_CLASE.cancelar} ${MAESTRO_2.nombre}`,
  "«Sí, borrar comentario»": TEXTOS_COMENTARIOS.cancelar,
  "«Sí, borrar» de una publicación": TEXTOS_PUBLICACION.cancelar,
  "«Sí, quitar» de un alumno": `${TEXTOS_TABLA_ALUMNOS.cancelar} Pedro Paz`,
}

describe("CHORE-04 · confirmación cancelada y vuelta a abrir con la petición en vuelo (S-05)", () => {
  it.each(CON_CONFIRMACION.map((control) => [control.nombre, control] as const))(
    "CH4-24: %s, «Cancelar», volver a pedir la acción y pulsar «Sí, …»: el botón está en espera y no sale otra petición; al responder, un solo aviso",
    async (nombre, control) => {
      const pendiente = retenida()
      preparar(control.clave, pendiente.respuesta)
      const { elemento } = await montarControl(control)
      fireEvent.click(elemento)
      await waitFor(() => expect(peticiones(control.clave)).toBe(1))

      await pulsar(CANCELAR[nombre] ?? "Cancelar")
      const otraVez = await obtenerControl(control)

      await enEspera(otraVez)
      fireEvent.click(otraVez)
      await esperarUnMomento()
      expect(peticiones(control.clave)).toBe(1)
      await pendiente.soltar(error500)
      await unAvisoDeError(avisoEsperado(control, errorDe500))
    },
  )
})

const ERRORES_QUE_REDIRIGEN: readonly (readonly [string, Respuesta, ApiError])[] = [
  [
    "403 ACCESO_RESTRINGIDO",
    () => errorApi(403, "ACCESO_RESTRINGIDO"),
    new ApiError("ACCESO_RESTRINGIDO", "mensaje del servidor", 403),
  ],
  [
    "401 sin refresco",
    () => errorApi(401, "NO_AUTENTICADO"),
    new ApiError("NO_AUTENTICADO", "Tu sesión terminó. Vuelve a iniciar sesión.", 401),
  ],
]

describe("CHORE-04 · errores con que apiClient redirige (Enmienda 1, M-01)", () => {
  it.each(
    CONTROLES.flatMap((control) =>
      ERRORES_QUE_REDIRIGEN.map(
        ([clase, respuesta, error]) => [control.nombre, clase, control, respuesta, error] as const,
      ),
    ),
  )(
    "CH4-25: %s con %s, ningún aviso (apiClient redirige; CHORE-06a) y, con el control montado, otro clic manda la petición",
    async (nombre, clase, control, respuesta, error) => {
      preparar(control.clave, respuesta)
      const { elemento } = await montarControl(control)
      if (clase.startsWith("401")) servidor.refrescoFalla = true

      fireEvent.click(elemento)

      const esperado = control.avisoDeError(error)
      await waitFor(() => {
        const actual = control.control()
        if (actual !== null) expect(actual).not.toHaveAttribute("aria-busy", "true")
      }, ESPERA)
      await esperarUnMomento(50)
      if (esperado === null) {
        expect(aviso.error, nombre).not.toHaveBeenCalled()
      } else {
        await unAvisoDeError(esperado)
      }
      if (nombre === "«Unirme a la clase»") {
        expect(screen.getByLabelText(TEXTOS_UNIRSE.campoCodigo)).not.toHaveAttribute(
          "aria-invalid",
          "true",
        )
      }
      const otraVez = await obtenerControl(control)
      fireEvent.click(otraVez)
      await waitFor(() => expect(peticiones(control.clave)).toBe(2), ESPERA)
    },
  )
})

describe("CHORE-04 · una guarda para la lista de maestros", () => {
  it("CH4-26: con dos maestros y el retiro del primero en vuelo, «Sí, quitar» del segundo está en espera y su clic no manda nada", async () => {
    servidor.rol = "admin"
    servidor.maestros[A] = [MAESTRO_1, MAESTRO_2]
    const clavePrimero = `DELETE /api/admin/clases/${A}/maestros/${MAESTRO_1.id}`
    const claveSegundo = `DELETE /api/admin/clases/${A}/maestros/${MAESTRO_2.id}`
    const pendiente = retenida()
    preparar(clavePrimero, pendiente.respuesta)
    await montar([`${BASE_ADMIN}/personas`])
    await pulsar(`${TEXTOS_MAESTROS_DE_CLASE.quitar} ${MAESTRO_1.nombre}`)
    await pulsar(`${TEXTOS_MAESTROS_DE_CLASE.siQuitar} ${MAESTRO_1.nombre}`)
    await waitFor(() => expect(peticiones(clavePrimero)).toBe(1))

    await pulsar(`${TEXTOS_MAESTROS_DE_CLASE.quitar} ${MAESTRO_2.nombre}`)
    const segundo = await screen.findByRole(
      "button",
      { name: `${TEXTOS_MAESTROS_DE_CLASE.siQuitar} ${MAESTRO_2.nombre}` },
      ESPERA,
    )

    await enEspera(segundo)
    fireEvent.click(segundo)
    await esperarUnMomento()
    expect(peticiones(claveSegundo)).toBe(0)
    await pendiente.soltar(() => respuestaJson(200, { maestros: [MAESTRO_2] }))
  })
})

const ENTRADAS_DE_VALIDACION: readonly (readonly [string, string])[] = [
  ["un campo que el formulario no pinta", "campoFueraDeContrato: Revisa este valor."],
  ["un mensaje de solo espacios", "   "],
  ["un mensaje vacío", ""],
  ["un prefijo con ruta", "codigo.0.x: Revisa este valor."],
]

const mensajesVisibles = () =>
  aviso.error.mock.calls.length + document.querySelectorAll('[aria-invalid="true"]').length

describe("CHORE-04 · «Unirme a la clase» ante un VALIDACION fuera de contrato", () => {
  it.each(ENTRADAS_DE_VALIDACION)(
    "CH4-27: con %s, un solo mensaje legible, lo escrito se conserva, el botón sale de la espera y un envío válido después manda otra petición",
    async (_entrada, mensaje) => {
      servidor.rol = "estudiante"
      preparar("POST /api/clases/unirse", () => errorApi(400, "VALIDACION", mensaje))
      await montar(["/estudiante"])
      await escribirEn(TEXTOS_UNIRSE.campoCodigo, "ABCDEFG")
      fireEvent.click(await screen.findByRole("button", { name: TEXTOS_UNIRSE.boton }))

      await waitFor(() => expect(mensajesVisibles()).toBe(1), ESPERA)
      const enAviso = aviso.error.mock.calls[0]?.[0]
      const enCampo = document.getElementById("codigo-clase-error")?.textContent
      const texto = String(enAviso ?? enCampo ?? "")
      expect(texto.trim().length).toBeGreaterThan(0)
      expect(screen.getByLabelText(TEXTOS_UNIRSE.campoCodigo)).toHaveValue("ABCDEFG")
      const botonUnirse = screen.getByRole("button", { name: TEXTOS_UNIRSE.boton })
      await fueraDeEspera(botonUnirse)

      fireEvent.click(botonUnirse)
      await waitFor(() => expect(peticiones("POST /api/clases/unirse")).toBe(2), ESPERA)
    },
  )

  it("CH4-27: rechazo del servidor y después un envío que la validación local rechaza: un solo mensaje, el local, y ninguna petición nueva", async () => {
    servidor.rol = "estudiante"
    preparar("POST /api/clases/unirse", () => errorApi(500, "ERROR_INTERNO"))
    await montar(["/estudiante"])
    await escribirEn(TEXTOS_UNIRSE.campoCodigo, "ABCDEFG")
    fireEvent.click(await screen.findByRole("button", { name: TEXTOS_UNIRSE.boton }))
    await waitFor(() => expect(aviso.error).toHaveBeenCalledTimes(1), ESPERA)
    await fueraDeEspera(screen.getByRole("button", { name: TEXTOS_UNIRSE.boton }))

    await escribirEn(TEXTOS_UNIRSE.campoCodigo, "x")
    fireEvent.click(screen.getByRole("button", { name: TEXTOS_UNIRSE.boton }))

    await waitFor(() => expect(document.querySelectorAll('[aria-invalid="true"]')).toHaveLength(1))
    expect(document.getElementById("codigo-clase-error")?.textContent?.trim()).not.toBe("")
    expect(aviso.error).toHaveBeenCalledTimes(1)
    expect(peticiones("POST /api/clases/unirse")).toBe(1)
  })
})

describe("CHORE-04 · «Restaurar» del aviso de clase archivada (Enmienda 1, M-02)", () => {
  const claveRestaurar = (claseId: string) => `POST /api/admin/clases/${claseId}/restaurar`
  const restaurarDe = () =>
    screen.findByRole("button", { name: TEXTOS_CLASES_ADMIN.restaurar }, ESPERA)

  beforeEach(() => {
    servidor.rol = "admin"
    servidor.archivadas = new Set([A, B])
  })

  it("CH4-28 (a): dos clics en el mismo render mandan una sola petición y el botón espera hasta la respuesta", async () => {
    const pendiente = retenida()
    preparar(claveRestaurar(A), pendiente.respuesta)
    await montar([BASE_ADMIN])
    const restaurar = await restaurarDe()

    dosClicsEnElMismoRender(restaurar)
    await esperarUnMomento()

    expect(peticiones(claveRestaurar(A))).toBe(1)
    await enEspera(restaurar)
    await pendiente.soltar(() => {
      servidor.archivadas.delete(A)
      return respuestaJson(200, detalle(A))
    })
    await waitFor(() => expect(aviso.success).toHaveBeenCalledTimes(1), ESPERA)
    expect(peticiones(claveRestaurar(A))).toBe(1)
  })

  it("CH4-28 (b): tras un 500, un solo aviso y otro clic manda la segunda petición", async () => {
    preparar(claveRestaurar(A), error500)
    await montar([BASE_ADMIN])
    const restaurar = await restaurarDe()

    fireEvent.click(restaurar)
    await unAvisoDeError(mensajeDeErrorClases(errorDe500))
    await fueraDeEspera(restaurar)

    fireEvent.click(restaurar)
    await waitFor(() => expect(peticiones(claveRestaurar(A))).toBe(2), ESPERA)
  })

  it("CH4-28 (c): misma instancia, otra clase: B no espera por A, la respuesta de A solo renueva A y nada de B queda en espera", async () => {
    const pendiente = retenida()
    preparar(claveRestaurar(A), pendiente.respuesta)
    const { router, cliente } = await montar([`/admin/clases/${B}`])
    await restaurarDe()
    await navegar(router, BASE_ADMIN)
    await screen.findByRole("heading", { level: 1, name: "Historia" }, ESPERA)
    const restaurar = await restaurarDe()
    fireEvent.click(restaurar)
    await waitFor(() => expect(peticiones(claveRestaurar(A))).toBe(1))
    await enEspera(restaurar)

    await navegar(router, -1)
    await screen.findByRole("heading", { level: 1, name: "Geografía" }, ESPERA)
    const restaurarB = await restaurarDe()
    await fueraDeEspera(restaurarB)
    fireEvent.click(restaurarB)
    await waitFor(() => expect(peticiones(claveRestaurar(B))).toBe(1), ESPERA)
    await waitFor(() => expect(aviso.success).toHaveBeenCalledTimes(1), ESPERA)
    expect(cliente.getQueryState(claveClaseDetalle(A))?.isInvalidated).toBe(false)

    await pendiente.soltar(() => {
      servidor.archivadas.delete(A)
      return respuestaJson(200, detalle(A))
    })

    // La respuesta de A renueva A: su detalle (que nadie observa en B) queda marcado viejo.
    await waitFor(() => expect(aviso.success).toHaveBeenCalledTimes(2), ESPERA)
    await waitFor(() =>
      expect(cliente.getQueryState(claveClaseDetalle(A))?.isInvalidated).toBe(true),
    )
    expect(screen.queryAllByRole("button", { busy: true })).toHaveLength(0)
  })

  it("CH4-28 (c): volver a A por el historial con su restauración retenida: «Restaurar» de A espera y sale de la espera al soltarla", async () => {
    const pendiente = retenida()
    preparar(claveRestaurar(A), pendiente.respuesta)
    const { router } = await montar([`/admin/clases/${B}`])
    await restaurarDe()
    await navegar(router, BASE_ADMIN)
    await screen.findByRole("heading", { level: 1, name: "Historia" }, ESPERA)
    fireEvent.click(await restaurarDe())
    await waitFor(() => expect(peticiones(claveRestaurar(A))).toBe(1))
    await navegar(router, -1)
    await screen.findByRole("heading", { level: 1, name: "Geografía" }, ESPERA)

    await navegar(router, 1)
    await screen.findByRole("heading", { level: 1, name: "Historia" }, ESPERA)
    const restaurarA = await restaurarDe()
    await enEspera(restaurarA)
    fireEvent.click(restaurarA)
    await esperarUnMomento()
    expect(peticiones(claveRestaurar(A))).toBe(1)

    await pendiente.soltar(() => respuestaJson(200, detalle(A)))
    await waitFor(
      () => expect(screen.queryAllByRole("button", { busy: true })).toHaveLength(0),
      ESPERA,
    )
  })
})

describe("CHORE-04 · «Sí, regenerar» con cambio de clase (Enmienda 2, S-07 opción b)", () => {
  const claveRegenerar = (claseId: string) => `POST /api/clases/${claseId}/codigo`
  const BASE_B = `/maestro/clases/${B}`

  const codigoVisible = (codigo: string) => screen.queryByText(codigo)

  // B nunca muestra el código nuevo de A, ni en el texto ni en la caché.
  const bConservaSuCodigo = (cliente: QueryClient) => {
    expect(cliente.getQueryData(claveCodigoDeClase(B))).not.toEqual({ codigo: "QRSTUVW" })
  }

  // Monta en B, pasa a A (las dos en caché) y regenera en A con el POST retenido.
  const regenerarEnAConBEnCache = async (focoEn: "si" | "cancelar") => {
    const pendiente = retenida()
    preparar(claveRegenerar(A), pendiente.respuesta)
    const montado = await montar([BASE_B])
    await screen.findByText("HJKLMNP", {}, ESPERA)
    await navegar(montado.router, BASE_MAESTRO)
    await screen.findByText("ABCDEFG", {}, ESPERA)
    await pulsar(TEXTOS_CODIGO.regenerar)
    const si = await screen.findByRole("button", { name: TEXTOS_CODIGO.siRegenerar })
    fireEvent.click(si)
    await waitFor(() => expect(peticiones(claveRegenerar(A))).toBe(1))
    await enEspera(si)
    const destino =
      focoEn === "si" ? si : screen.getByRole("button", { name: TEXTOS_CODIGO.cancelar })
    act(() => destino.focus())
    expect(document.activeElement).toBe(destino)
    return { ...montado, pendiente }
  }

  const irAB = async (router: Awaited<ReturnType<typeof montar>>["router"]) => {
    await navegar(router, -1)
    await screen.findByRole("heading", { level: 1, name: "Geografía" }, ESPERA)
    await screen.findByText("HJKLMNP", {}, ESPERA)
  }

  it("CH4-40 (a): dos clics en «Sí, regenerar» en el mismo render mandan una sola petición y el botón espera hasta la respuesta", async () => {
    const pendiente = retenida()
    preparar(claveRegenerar(A), pendiente.respuesta)
    const { cliente } = await montar([BASE_MAESTRO])
    await pulsar(TEXTOS_CODIGO.regenerar)
    const si = await screen.findByRole("button", { name: TEXTOS_CODIGO.siRegenerar })

    dosClicsEnElMismoRender(si)
    await esperarUnMomento()

    expect(peticiones(claveRegenerar(A))).toBe(1)
    await enEspera(si)
    await pendiente.soltar(() => respuestaJson(200, { codigo: "QRSTUVW" }))
    expect(await screen.findByText("QRSTUVW", {}, ESPERA)).toBeInTheDocument()
    bConservaSuCodigo(cliente)
    expect(peticiones(claveRegenerar(A))).toBe(1)
  })

  it("CH4-40 (b): la respuesta de A llega estando en B: B no tiene la confirmación abierta ni espera, conserva su código y regenerar en B manda el POST de B", async () => {
    const { router, cliente, pendiente } = await regenerarEnAConBEnCache("si")

    await irAB(router)

    expect(boton(TEXTOS_CODIGO.siRegenerar)).toBeNull()
    const regenerarB = await screen.findByRole("button", { name: TEXTOS_CODIGO.regenerar })
    expect(regenerarB).not.toHaveAttribute("aria-busy", "true")
    bConservaSuCodigo(cliente)

    await pendiente.soltar(() => respuestaJson(200, { codigo: "QRSTUVW" }))

    await waitFor(() => expect(aviso.success).toHaveBeenCalledTimes(1), ESPERA)
    expect(aviso.success.mock.calls[0]?.[0]).toBe(TEXTOS_CODIGO.avisoRegenerado)
    expect(screen.getByText("HJKLMNP")).toBeInTheDocument()
    expect(codigoVisible("QRSTUVW")).toBeNull()
    expect(cliente.getQueryData(claveCodigoDeClase(A))).toEqual({ codigo: "QRSTUVW" })
    bConservaSuCodigo(cliente)

    await pulsar(TEXTOS_CODIGO.regenerar)
    await pulsar(TEXTOS_CODIGO.siRegenerar)
    await waitFor(() => expect(peticiones(claveRegenerar(B))).toBe(1), ESPERA)
    expect(await screen.findByText("XYZ2345", {}, ESPERA)).toBeInTheDocument()
  })

  it.each([
    ["«Sí, regenerar»", "si"],
    ["«Cancelar»", "cancelar"],
  ] as const)(
    "CH4-40 (b′) y (c): con el foco en %s antes del salto, en B el foco queda en el título de B; al volver a A la confirmación no reaparece, el foco sigue en el título y «Sí, regenerar» reabierto espera sin mandar otro POST",
    async (_lugar, focoEn) => {
      const { router, cliente, pendiente } = await regenerarEnAConBEnCache(focoEn)

      await irAB(router)

      const tituloB = screen.getByRole("heading", { level: 1, name: "Geografía" })
      await waitFor(() => expect(document.activeElement).toBe(tituloB), ESPERA)
      expect(boton(TEXTOS_CODIGO.cancelar)).toBeNull()

      await navegar(router, 1)
      const tituloA = await screen.findByRole("heading", { level: 1, name: "Historia" }, ESPERA)
      await screen.findByText("ABCDEFG", {}, ESPERA)
      expect(boton(TEXTOS_CODIGO.siRegenerar)).toBeNull()
      expect(boton(TEXTOS_CODIGO.cancelar)).toBeNull()
      expect(screen.getByRole("button", { name: TEXTOS_CODIGO.regenerar })).toBeInTheDocument()
      await esperarUnMomento()
      expect(document.activeElement).toBe(tituloA)
      expect(document.activeElement).not.toBe(document.body)

      await pulsar(TEXTOS_CODIGO.regenerar)
      const si = await screen.findByRole("button", { name: TEXTOS_CODIGO.siRegenerar })
      await enEspera(si)
      fireEvent.click(si)
      await esperarUnMomento()
      expect(peticiones(claveRegenerar(A))).toBe(1)

      await pendiente.soltar(() => respuestaJson(200, { codigo: "QRSTUVW" }))
      expect(await screen.findByText("QRSTUVW", {}, ESPERA)).toBeInTheDocument()
      await waitFor(() => expect(boton(TEXTOS_CODIGO.siRegenerar)).toBeNull(), ESPERA)
      expect(screen.queryAllByRole("button", { busy: true })).toHaveLength(0)
      bConservaSuCodigo(cliente)
    },
  )

  it("CH4-40 (d): el POST de A falla estando en B: un solo aviso, nada en espera en B, B conserva su código; al volver a A la confirmación está cerrada y repetir manda el POST de A", async () => {
    const { router, cliente, pendiente } = await regenerarEnAConBEnCache("si")
    await irAB(router)

    await pendiente.soltar(error500)

    await unAvisoDeError(TEXTOS_CODIGO.avisoErrorRegenerar)
    expect(screen.queryAllByRole("button", { busy: true })).toHaveLength(0)
    expect(screen.getByText("HJKLMNP")).toBeInTheDocument()
    bConservaSuCodigo(cliente)

    await navegar(router, 1)
    await screen.findByRole("heading", { level: 1, name: "Historia" }, ESPERA)
    expect(boton(TEXTOS_CODIGO.siRegenerar)).toBeNull()
    await pulsar(TEXTOS_CODIGO.regenerar)
    await pulsar(TEXTOS_CODIGO.siRegenerar)
    await waitFor(() => expect(peticiones(claveRegenerar(A))).toBe(2), ESPERA)
    expect(aviso.error).toHaveBeenCalledTimes(1)
  })

  it("CH4-40 (e): con el POST de A retenido, ir al inicio y soltar: un solo aviso, sin excepciones; al volver a A se ve el código nuevo y nada espera", async () => {
    const { router, cliente, pendiente } = await regenerarEnAConBEnCache("si")
    await navegar(router, "/maestro")
    await waitFor(() => expect(screen.queryByText("ABCDEFG")).toBeNull(), ESPERA)

    await pendiente.soltar(() => respuestaJson(200, { codigo: "QRSTUVW" }))

    await waitFor(() => expect(aviso.success).toHaveBeenCalledTimes(1), ESPERA)
    expect(aviso.error).not.toHaveBeenCalled()
    await navegar(router, BASE_MAESTRO)
    expect(await screen.findByText("QRSTUVW", {}, ESPERA)).toBeInTheDocument()
    expect(boton(TEXTOS_CODIGO.siRegenerar)).toBeNull()
    expect(screen.queryAllByRole("button", { busy: true })).toHaveLength(0)
    bConservaSuCodigo(cliente)
  })
})

describe("CHORE-04 · cambio de clase sin desmontar, control sin mutationKey (Enmienda 1, hermanos de M-02)", () => {
  it("CH4-29: «Sí, quitar» de un maestro, con el retiro de A retenido, saltar a B y soltar: nada queda en espera en B y su «Sí, quitar» manda la petición de B", async () => {
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
    if (boton(`${TEXTOS_MAESTROS_DE_CLASE.siQuitar} ${MAESTRO_2.nombre}`) === null) {
      await pulsar(`${TEXTOS_MAESTROS_DE_CLASE.quitar} ${MAESTRO_2.nombre}`)
    }
    const siB = await screen.findByRole(
      "button",
      { name: `${TEXTOS_MAESTROS_DE_CLASE.siQuitar} ${MAESTRO_2.nombre}` },
      ESPERA,
    )
    await fueraDeEspera(siB)
    fireEvent.click(siB)
    await waitFor(() => expect(peticiones(claveDe(B))).toBe(1), ESPERA)
  })
})
