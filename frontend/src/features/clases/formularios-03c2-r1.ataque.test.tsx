import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { StrictMode } from "react"
import { createMemoryRouter, RouterProvider } from "react-router"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { establecerToken, limpiarToken } from "@/services/tokenAcceso"

import { FormularioClase } from "./components/formulario-clase"
import { FormularioComentario } from "./components/formulario-comentario"
import { TrabajoView } from "./trabajo-view"

// Ataque del Tester (CLASES-03c2, ronda 1): O-16 (§D-11) y las guardas de §D-12 por los estados que
// pidió el manager. Tema: TEMA_REPETIDO con la renovación que falla (montado y desmontado), desmontar
// en el mismo turno en que termina la renovación y dos envíos tras volver a montar. Clase: desmontar en
// el mismo turno de la respuesta y StrictMode. Guardas: un clic durante el asentamiento y el envío por
// submit (Enter). Comentario desmontado con VALIDACION de texto y con otros códigos. Sin reloj. Sin
// selectores de clase.

const aviso = vi.hoisted(() => Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }))
vi.mock("sonner", () => ({ toast: aviso }))

const CLASE_ID = "2a2b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d01"
const PUB_ID = "6a6b3c4d-1c1f-4b8e-9a1e-000000000001"
const BASE = `/api/clases/${CLASE_ID}`
const idTema = (n: number) => `7a7b3c4d-1c1f-4b8e-9a1e-${String(n).padStart(12, "0")}`
const MAESTRO = { id: "3a3b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d09", nombre: "Luis Pérez" }
const RECARGA_FALLIDA =
  "No pudimos actualizar Actividades de aprendizaje. Mostramos la última versión que tenemos."
const REPETIDO = "Ya hay un tema con ese nombre."
const GENERICO = "Algo salió mal. Inténtalo de nuevo."

const respuestaJson = (estado: number, cuerpo: unknown) =>
  new Response(JSON.stringify(cuerpo), {
    status: estado,
    headers: { "Content-Type": "application/json" },
  })
const errorDeApi = (estado: number, codigo: string, mensaje: string) =>
  respuestaJson(estado, { error: { codigo, mensaje } })

interface Diferido {
  promesa: Promise<Response>
  soltar: (respuesta: Response) => void
}
const diferido = (): Diferido => {
  let soltar: (respuesta: Response) => void = () => undefined
  const promesa = new Promise<Response>((resolver) => {
    soltar = resolver
  })
  return { promesa, soltar }
}

type Manejo = () => Response | Promise<Response>

const listaDeTemas = () => ({
  temas: [
    { id: idTema(1), nombre: "Unidad 1", orden: 0, elementos: 0 },
    { id: idTema(2), nombre: "Unidad 2", orden: 1, elementos: 0 },
  ],
  sinTema: 0,
})

const claseDetalle = () => ({
  clase: {
    id: CLASE_ID,
    nombre: "Álgebra II",
    descripcion: null,
    maestro: MAESTRO,
    maestros: [MAESTRO],
  },
})

// Un doble con filas de respuestas propias por clave ("GET seccion", "GET total", "POST temas",
// "PUT tema", "PUT clase", "POST comentario"); sin respuesta propia, la de siempre.
const crearServidor = () => {
  const filas = new Map<string, Manejo[]>()
  const llamadas: { clave: string; url: URL }[] = []
  const preparar = (clave: string, ...manejos: Manejo[]) => {
    filas.set(clave, [...(filas.get(clave) ?? []), ...manejos])
  }
  const responder = (clave: string, deSiempre: () => Response) => {
    const propia = filas.get(clave)?.shift()
    return Promise.resolve(propia === undefined ? deSiempre() : propia())
  }
  const fetchMock = vi.fn<typeof fetch>((entrada, init) => {
    const url = new URL(String(entrada), "http://local")
    const metodo = init?.method ?? "GET"
    const clave = (() => {
      if (metodo === "GET" && url.pathname === `${BASE}/temas`) {
        return url.searchParams.get("seccion") === null ? "GET total" : "GET seccion"
      }
      if (metodo === "POST" && url.pathname === `${BASE}/temas`) return "POST temas"
      if (metodo === "PUT" && url.pathname.startsWith(`${BASE}/temas/`)) return "PUT tema"
      if (metodo === "PUT" && url.pathname === `/api/admin/clases/${CLASE_ID}`) return "PUT clase"
      if (metodo === "POST" && url.pathname.endsWith("/comentarios")) return "POST comentario"
      if (metodo === "GET" && url.pathname === `${BASE}/trabajo`) return "GET trabajo"
      return `${metodo} ${url.pathname}`
    })()
    llamadas.push({ clave, url })
    if (clave === "GET seccion" || clave === "GET total") {
      return responder(clave, () => respuestaJson(200, listaDeTemas()))
    }
    if (clave === "GET trabajo") {
      return responder(clave, () => respuestaJson(200, { elementos: [], siguienteCursor: null }))
    }
    if (clave === "PUT clase") return responder(clave, () => respuestaJson(200, claseDetalle()))
    return responder(clave, () => errorDeApi(500, "ERROR_INTERNO", "sin manejador"))
  })
  vi.stubGlobal("fetch", fetchMock)
  const cuantas = (clave: string) => llamadas.filter((l) => l.clave === clave).length
  return { preparar, cuantas }
}

const montar = (ruta: string, estricto = false) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false, staleTime: 30_000 } },
  })
  const router = createMemoryRouter(
    [
      { path: "/maestro/clases/:claseId/trabajo", element: <TrabajoView /> },
      {
        path: "/admin/clases/:claseId/editar",
        element: (
          <FormularioClase
            modo="editar"
            claseId={CLASE_ID}
            valoresIniciales={{ nombre: "Álgebra I", descripcion: null }}
          />
        ),
      },
      { path: "/admin/clases/:claseId", element: <p>La clase</p> },
      {
        path: "/comentar",
        element: <FormularioComentario claseId={CLASE_ID} publicacionId={PUB_ID} />,
      },
      { path: "/otra", element: <p>Otra pantalla</p> },
    ],
    { initialEntries: [ruta] },
  )
  const arbol = (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  )
  const vista = render(estricto ? <StrictMode>{arbol}</StrictMode> : arbol)
  return { router, vista }
}

const TRABAJO = `/maestro/clases/${CLASE_ID}/trabajo`
const EDITAR = `/admin/clases/${CLASE_ID}/editar`

const reposar = (ms = 50) => act(() => new Promise((resolver) => setTimeout(resolver, ms)))
const errores = () => aviso.error.mock.calls.map((llamada) => String(llamada[0]))
const exitos = () => aviso.success.mock.calls.map((llamada) => String(llamada[0]))

const abrirRenombrar = async () => {
  fireEvent.click(await screen.findByRole("button", { name: "Renombrar tema Unidad 1" }))
  fireEvent.change(screen.getByLabelText("Nombre del tema"), { target: { value: "Unidad 2" } })
}

const abrirNuevoTema = async () => {
  fireEvent.click(await screen.findByRole("button", { name: "Nuevo tema" }))
  fireEvent.change(screen.getByLabelText("Nombre del tema"), { target: { value: "Unidad 2" } })
}

beforeEach(() => {
  establecerToken("token-de-prueba")
})

afterEach(() => {
  cleanup()
  limpiarToken()
  vi.unstubAllGlobals()
  aviso.mockClear()
  aviso.success.mockClear()
  aviso.error.mockClear()
})

describe("ataque CLASES-03c2 r1 · O-16 en tema: TEMA_REPETIDO y la renovación", () => {
  it("CL3-2R1-09: renombrar montado, TEMA_REPETIDO y la renovación por sección falla: el ErrorDeCampo y solo el aviso de recarga fallida", async () => {
    const servidor = crearServidor()
    montar(TRABAJO)
    await abrirRenombrar()
    servidor.preparar("PUT tema", () => errorDeApi(409, "TEMA_REPETIDO", REPETIDO))
    servidor.preparar("GET seccion", () => errorDeApi(500, "ERROR_INTERNO", "caído"))
    fireEvent.click(screen.getByRole("button", { name: "Guardar nombre" }))
    await waitFor(() =>
      expect(screen.getByLabelText("Nombre del tema")).toHaveAccessibleDescription(REPETIDO),
    )
    await waitFor(() => expect(errores()).toEqual([RECARGA_FALLIDA]))
    await reposar()
    expect(errores()).toEqual([RECARGA_FALLIDA])
    expect(screen.getAllByText(REPETIDO)).toHaveLength(1)
    expect(screen.getByRole("button", { name: "Guardar nombre" })).not.toHaveAttribute(
      "aria-busy",
      "true",
    )
  })

  it.each([["renombrar"], ["crear"]] as const)(
    "CL3-2R1-10 (%s): desmontado antes de la respuesta, TEMA_REPETIDO y la renovación falla: un solo aviso, el del nombre",
    async (accion) => {
      const servidor = crearServidor()
      const { router } = montar(TRABAJO)
      if (accion === "renombrar") await abrirRenombrar()
      else await abrirNuevoTema()
      const respuesta = diferido()
      servidor.preparar(accion === "renombrar" ? "PUT tema" : "POST temas", () => respuesta.promesa)
      servidor.preparar("GET seccion", () => errorDeApi(500, "ERROR_INTERNO", "caído"))
      servidor.preparar("GET total", () => errorDeApi(500, "ERROR_INTERNO", "caído"))
      fireEvent.click(
        screen.getByRole("button", {
          name: accion === "renombrar" ? "Guardar nombre" : "Crear tema",
        }),
      )
      await act(async () => {
        await router.navigate("/otra")
      })
      await screen.findByText("Otra pantalla")
      await act(async () => {
        respuesta.soltar(errorDeApi(409, "TEMA_REPETIDO", REPETIDO))
        await Promise.resolve()
      })
      await waitFor(() => expect(errores()).toEqual([REPETIDO]))
      await reposar()
      expect(errores()).toEqual([REPETIDO])
    },
  )

  it.each([["renombrar"], ["crear"]] as const)(
    "CL3-2R1-11 (%s): desmontar en el mismo turno en que termina la renovación tras TEMA_REPETIDO: un solo aviso",
    async (accion) => {
      const servidor = crearServidor()
      const { vista } = montar(TRABAJO)
      if (accion === "renombrar") await abrirRenombrar()
      else await abrirNuevoTema()
      await waitFor(() => expect(servidor.cuantas("GET seccion")).toBe(1))
      const renovacion = diferido()
      servidor.preparar(accion === "renombrar" ? "PUT tema" : "POST temas", () =>
        errorDeApi(409, "TEMA_REPETIDO", REPETIDO),
      )
      servidor.preparar("GET seccion", () => renovacion.promesa)
      fireEvent.click(
        screen.getByRole("button", {
          name: accion === "renombrar" ? "Guardar nombre" : "Crear tema",
        }),
      )
      await waitFor(() => expect(servidor.cuantas("GET seccion")).toBe(2))
      expect(errores()).toEqual([])
      act(() => {
        renovacion.soltar(respuestaJson(200, listaDeTemas()))
        vista.unmount()
      })
      await waitFor(() => expect(errores()).toEqual([REPETIDO]))
      await reposar()
      expect(errores()).toEqual([REPETIDO])
    },
  )

  it("CL3-2R1-12: crear con TEMA_REPETIDO desmontado, volver, y otro TEMA_REPETIDO montado: un aviso del primero y el ErrorDeCampo del segundo, nada más", async () => {
    const servidor = crearServidor()
    const { router } = montar(TRABAJO)
    await abrirNuevoTema()
    const primera = diferido()
    servidor.preparar("POST temas", () => primera.promesa)
    fireEvent.click(screen.getByRole("button", { name: "Crear tema" }))
    await act(async () => {
      await router.navigate("/otra")
    })
    await act(async () => {
      primera.soltar(errorDeApi(409, "TEMA_REPETIDO", REPETIDO))
      await Promise.resolve()
    })
    await waitFor(() => expect(errores()).toEqual([REPETIDO]))
    await act(async () => {
      await router.navigate(-1)
    })
    await abrirNuevoTema()
    servidor.preparar("POST temas", () => errorDeApi(409, "TEMA_REPETIDO", REPETIDO))
    fireEvent.click(screen.getByRole("button", { name: "Crear tema" }))
    await waitFor(() =>
      expect(screen.getByLabelText("Nombre del tema")).toHaveAccessibleDescription(REPETIDO),
    )
    await reposar()
    expect(errores()).toEqual([REPETIDO])
    expect(screen.getAllByText(REPETIDO)).toHaveLength(1)
    // Un tercer envío igual sale (la guarda se liberó) y sigue siendo un solo mensaje.
    servidor.preparar("POST temas", () => errorDeApi(409, "TEMA_REPETIDO", REPETIDO))
    fireEvent.click(screen.getByRole("button", { name: "Crear tema" }))
    await waitFor(() => expect(servidor.cuantas("POST temas")).toBe(3))
    await reposar()
    expect(errores()).toEqual([REPETIDO])
    expect(screen.getAllByText(REPETIDO)).toHaveLength(1)
  })
})

describe("ataque CLASES-03c2 r1 · O-16 en editar clase: el mismo turno y StrictMode", () => {
  it.each([
    ["200", () => respuestaJson(200, claseDetalle()), "success", "Cambios guardados"],
    ["500", () => errorDeApi(500, "ERROR_INTERNO", "Error interno"), "error", GENERICO],
  ] as const)(
    "CL3-2R1-13: desmontar en el mismo turno en que llega el %s: un solo aviso y ninguna navegación",
    async (_caso, respuesta, tipo, texto) => {
      const servidor = crearServidor()
      const { router, vista } = montar(EDITAR)
      const enVuelo = diferido()
      servidor.preparar("PUT clase", () => enVuelo.promesa)
      fireEvent.click(await screen.findByRole("button", { name: "Guardar cambios" }))
      await waitFor(() => expect(servidor.cuantas("PUT clase")).toBe(1))
      act(() => {
        enVuelo.soltar(respuesta())
        vista.unmount()
      })
      await waitFor(() => expect(aviso[tipo]).toHaveBeenCalledWith(texto))
      await reposar()
      expect(aviso.success.mock.calls.length + aviso.error.mock.calls.length).toBe(1)
      expect(router.state.location.pathname).toBe(EDITAR)
    },
  )

  it.each([
    [
      "montado, 200",
      false,
      () => respuestaJson(200, claseDetalle()),
      ["Cambios guardados"],
      [],
      `/admin/clases/${CLASE_ID}`,
    ],
    ["montado, 500", false, () => errorDeApi(500, "ERROR_INTERNO", "x"), [], [GENERICO], EDITAR],
    [
      "desmontado, 200",
      true,
      () => respuestaJson(200, claseDetalle()),
      ["Cambios guardados"],
      [],
      "/otra",
    ],
    [
      "desmontado, 503",
      true,
      () => errorDeApi(503, "SERVICIO_OCUPADO", "El servicio está ocupado. Intenta en un momento."),
      [],
      ["El servicio está ocupado. Intenta en un momento."],
      "/otra",
    ],
  ] as const)(
    "CL3-2R1-14: StrictMode, %s: un solo aviso y la navegación de siempre",
    async (_caso, salir, respuesta, esperadosExito, esperadosError, destino) => {
      const servidor = crearServidor()
      const { router } = montar(EDITAR, true)
      const enVuelo = diferido()
      servidor.preparar("PUT clase", () => enVuelo.promesa)
      fireEvent.click(await screen.findByRole("button", { name: "Guardar cambios" }))
      await waitFor(() => expect(servidor.cuantas("PUT clase")).toBe(1))
      if (salir) {
        await act(async () => {
          await router.navigate("/otra")
        })
      }
      await act(async () => {
        enVuelo.soltar(respuesta())
        await Promise.resolve()
      })
      await waitFor(() =>
        expect(exitos().length + errores().length).toBe(
          esperadosExito.length + esperadosError.length,
        ),
      )
      await reposar()
      expect(exitos()).toEqual(esperadosExito)
      expect(errores()).toEqual(esperadosError)
      expect(router.state.location.pathname).toBe(destino)
    },
  )
})

describe("ataque CLASES-03c2 r1 · guardas de §D-12 (CHORE-04 filas 1 y 2)", () => {
  it("CL3-2R1-15: editar clase: un clic en el mismo turno en que llega el error no sale; el siguiente sí, y dos más seguidos mandan uno", async () => {
    const servidor = crearServidor()
    montar(EDITAR)
    const primera = diferido()
    servidor.preparar("PUT clase", () => primera.promesa)
    const guardar = await screen.findByRole("button", { name: "Guardar cambios" })
    fireEvent.click(guardar)
    fireEvent.click(guardar)
    await waitFor(() => expect(servidor.cuantas("PUT clase")).toBe(1))
    act(() => {
      primera.soltar(errorDeApi(500, "ERROR_INTERNO", "x"))
      fireEvent.click(guardar)
    })
    await waitFor(() => expect(errores()).toEqual([GENERICO]))
    await reposar()
    expect(servidor.cuantas("PUT clase")).toBe(1)
    const segunda = diferido()
    servidor.preparar("PUT clase", () => segunda.promesa)
    fireEvent.click(guardar)
    fireEvent.click(guardar)
    fireEvent.click(guardar)
    await waitFor(() => expect(servidor.cuantas("PUT clase")).toBe(2))
    await reposar()
    expect(servidor.cuantas("PUT clase")).toBe(2)
    await act(async () => {
      segunda.soltar(errorDeApi(500, "ERROR_INTERNO", "x"))
      await Promise.resolve()
    })
    await waitFor(() => expect(errores()).toEqual([GENERICO, GENERICO]))
  })

  it("CL3-2R1-16: editar clase: Enter (submit del formulario) dos veces y un clic en el mismo render mandan una sola petición", async () => {
    const servidor = crearServidor()
    montar(EDITAR)
    const enVuelo = diferido()
    servidor.preparar("PUT clase", () => enVuelo.promesa)
    const guardar = await screen.findByRole("button", { name: "Guardar cambios" })
    const formulario = guardar.closest("form")
    if (formulario === null) throw new Error("Precondición: el botón está en un formulario")
    fireEvent.submit(formulario)
    fireEvent.submit(formulario)
    fireEvent.click(guardar)
    await reposar()
    expect(servidor.cuantas("PUT clase")).toBe(1)
    await act(async () => {
      enVuelo.soltar(respuestaJson(200, claseDetalle()))
      await Promise.resolve()
    })
    await waitFor(() => expect(exitos()).toEqual(["Cambios guardados"]))
  })

  it("CL3-2R1-17: comentario: submit dos veces y un clic en el mismo render mandan un solo POST; tras un 500, el siguiente sale", async () => {
    const servidor = crearServidor()
    montar("/comentar")
    fireEvent.change(await screen.findByLabelText("Escribe un comentario"), {
      target: { value: "Hola" },
    })
    const comentar = screen.getByRole("button", { name: "Comentar" })
    const formulario = comentar.closest("form")
    if (formulario === null) throw new Error("Precondición: el botón está en un formulario")
    const primera = diferido()
    servidor.preparar("POST comentario", () => primera.promesa)
    fireEvent.submit(formulario)
    fireEvent.submit(formulario)
    fireEvent.click(comentar)
    await reposar()
    expect(servidor.cuantas("POST comentario")).toBe(1)
    await act(async () => {
      primera.soltar(errorDeApi(500, "ERROR_INTERNO", "x"))
      await Promise.resolve()
    })
    await waitFor(() => expect(errores()).toEqual([GENERICO]))
    fireEvent.click(comentar)
    await waitFor(() => expect(servidor.cuantas("POST comentario")).toBe(2))
  })
})

describe("ataque CLASES-03c2 r1 · comentario desmontado (O-16)", () => {
  it.each([
    [
      "VALIDACION de texto",
      () => errorDeApi(400, "VALIDACION", "texto: texto: El comentario es demasiado largo"),
      "El comentario es demasiado largo",
    ],
    [
      "VALIDACION de texto sin texto visible",
      () => errorDeApi(400, "VALIDACION", "texto:\u{200B} "),
      GENERICO,
    ],
    [
      "404 PUBLICACION_NO_ENCONTRADA",
      () => errorDeApi(404, "PUBLICACION_NO_ENCONTRADA", "Esa publicación ya no existe."),
      "Esa publicación ya no existe.",
    ],
    ["500", () => errorDeApi(500, "ERROR_INTERNO", "Error interno"), GENERICO],
  ] as const)(
    "CL3-2R1-18: %s con el formulario desmontado: un solo aviso legible, sin la ruta",
    async (_caso, respuesta, esperado) => {
      const servidor = crearServidor()
      const { router } = montar("/comentar")
      fireEvent.change(await screen.findByLabelText("Escribe un comentario"), {
        target: { value: "Hola" },
      })
      const enVuelo = diferido()
      servidor.preparar("POST comentario", () => enVuelo.promesa)
      fireEvent.click(screen.getByRole("button", { name: "Comentar" }))
      await waitFor(() => expect(servidor.cuantas("POST comentario")).toBe(1))
      await act(async () => {
        await router.navigate("/otra")
      })
      await act(async () => {
        enVuelo.soltar(respuesta())
        await Promise.resolve()
      })
      await waitFor(() => expect(errores()).toHaveLength(1))
      await reposar()
      expect(errores()).toEqual([esperado])
      expect(errores()[0]).not.toMatch(/texto:/)
    },
  )
})
