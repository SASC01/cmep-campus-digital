import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { createMemoryRouter, RouterProvider } from "react-router"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { establecerToken, limpiarToken } from "@/services/tokenAcceso"

import { FormularioClase } from "./components/formulario-clase"
import { MuroView } from "./muro-view"
import { TrabajoView } from "./trabajo-view"

// CLASES-03c2 (§D-11, O-16, y §D-12, CHORE-04 filas 1 y 2; CL3-C14 y CL3-C15). Con el envío en
// vuelo, el formulario se desmonta (se navega a otra pantalla): un VALIDACION de su campo pintado da un
// aviso con el mensaje sin la ruta; con el formulario montado sigue siendo su ErrorDeCampo, sin aviso.
// Crear y editar clase avisan además, desmontados, cualquier error y el éxito (sin navegar), salvo un
// error con que apiClient redirige. Las guardas síncronas mandan una sola petición por doble clic.

const aviso = vi.hoisted(() => Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }))
vi.mock("sonner", () => ({ toast: aviso }))
vi.mock("@/services/navegacion", () => ({ irA: vi.fn(), rutaActual: vi.fn(() => "/") }))

const CLASE_ID = "2a2b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d01"
const BASE = `/api/clases/${CLASE_ID}`
const PUBLICACION_ID = "6a6b3c4d-1c1f-4b8e-9a1e-000000000001"
const TEMA_ID = "7a7b3c4d-1c1f-4b8e-9a1e-000000000001"
const MAESTRO = { id: "3a3b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d09", nombre: "Luis Pérez" }
// En features/clases, un 500 y la red caída se traducen al genérico del módulo (mensajeDeErrorClases);
// un 503 SERVICIO_OCUPADO conserva el texto del servidor. Con el formulario montado o desmontado, el
// aviso es el mismo.
const GENERICO = "Algo salió mal. Inténtalo de nuevo."
const OCUPADO = "El servidor está ocupado. Inténtalo de nuevo en unos segundos."

const respuestaJson = (estado: number, cuerpo: unknown) =>
  new Response(JSON.stringify(cuerpo), {
    status: estado,
    headers: { "Content-Type": "application/json" },
  })

const errorDeApi = (estado: number, codigo: string, mensaje: string) =>
  respuestaJson(estado, { error: { codigo, mensaje } })

const validacion = (mensaje: string) => errorDeApi(400, "VALIDACION", mensaje)

const claseRespuesta = (estado: number) =>
  respuestaJson(estado, {
    clase: {
      id: CLASE_ID,
      nombre: "Historia",
      descripcion: null,
      maestro: MAESTRO,
      maestros: [MAESTRO],
    },
  })

const diferido = () => {
  let resolver: (respuesta: Response) => void = () => undefined
  const promesa = new Promise<Response>((r) => {
    resolver = r
  })
  return { promesa, resolver }
}

type Respuesta = () => Response | Promise<Response>

interface Enviada {
  metodo: string
  ruta: string
}

// Las lecturas responden siempre; cada petición que no es GET toma la siguiente respuesta de la fila.
const crearServidor = () => {
  const fila: Respuesta[] = []
  const enviadas: Enviada[] = []
  // M-01 (verificación de 03c2): con una promesa aquí, cada GET …/temas espera a que se cumpla (la
  // renovación de temas y trabajo que hace el gancho de tema con TEMA_REPETIDO).
  const temas = { retener: null as Promise<void> | null, pedidas: 0 }
  const fetchMock = vi.fn<typeof fetch>((entrada, init) => {
    const url = new URL(String(entrada), "http://local")
    const metodo = init?.method ?? "GET"
    if (metodo !== "GET") {
      enviadas.push({ metodo, ruta: url.pathname })
      const siguiente = fila.shift()
      if (siguiente === undefined) {
        return Promise.resolve(errorDeApi(500, "ERROR_INTERNO", "sin respuesta en la fila"))
      }
      return Promise.resolve().then(siguiente)
    }
    if (url.pathname === `${BASE}/publicaciones`) {
      return Promise.resolve(
        respuestaJson(200, {
          publicaciones: [
            {
              id: PUBLICACION_ID,
              tipo: "anuncio",
              titulo: null,
              texto: "Aviso 1",
              autor: { ...MAESTRO, administracion: false },
              creadoEn: "2026-10-01T15:30:00.000Z",
              comentarios: 0,
              tarea: null,
              adjuntos: [],
              puedeBorrar: false,
            },
          ],
          siguienteCursor: null,
        }),
      )
    }
    if (url.pathname === `${BASE}/publicaciones/${PUBLICACION_ID}/comentarios`) {
      return Promise.resolve(respuestaJson(200, { comentarios: [], siguienteCursor: null }))
    }
    if (url.pathname === `${BASE}/temas`) {
      temas.pedidas += 1
      return Promise.resolve(temas.retener).then(() =>
        respuestaJson(200, {
          temas: [{ id: TEMA_ID, nombre: "Unidad 1", orden: 0, elementos: 0 }],
          sinTema: 0,
        }),
      )
    }
    if (url.pathname === "/api/admin/maestros/candidatos") {
      return Promise.resolve(
        respuestaJson(200, {
          candidatos: [{ ...MAESTRO, email: "luis@x.mx" }],
          hayMas: false,
        }),
      )
    }
    return Promise.resolve(errorDeApi(500, "ERROR_INTERNO", "sin manejador en el doble"))
  })
  vi.stubGlobal("fetch", fetchMock)
  const cuantas = (metodo: string, ruta: string) =>
    enviadas.filter((enviada) => enviada.metodo === metodo && enviada.ruta === ruta).length
  return { fila, cuantas, temas }
}

const montar = (ruta: string) => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const router = createMemoryRouter(
    [
      { path: "/estudiante/clases/:claseId", element: <MuroView /> },
      { path: "/maestro/clases/:claseId/trabajo", element: <TrabajoView /> },
      { path: "/admin/clases/nueva", element: <FormularioClase modo="crear" /> },
      {
        path: "/admin/clases/:claseId/editar",
        element: (
          <FormularioClase
            modo="editar"
            claseId={CLASE_ID}
            valoresIniciales={{ nombre: "Historia", descripcion: null }}
          />
        ),
      },
      { path: "/admin/clases/:claseId", element: <p>Pantalla de la clase</p> },
      { path: "/otra", element: <p>Otra pantalla</p> },
    ],
    { initialEntries: [ruta] },
  )
  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
  return router
}

const irAOtraPantalla = async (router: ReturnType<typeof montar>) => {
  await act(async () => {
    await router.navigate("/otra")
  })
  await screen.findByText("Otra pantalla")
}

const reposar = () => act(() => new Promise((resolver) => setTimeout(resolver, 50)))

// El texto del ErrorDeCampo que describe el campo, o null si no tiene.
const errorDelCampo = (campo: HTMLElement): string | null => {
  const id = campo.getAttribute("aria-describedby")
  if (id === null) return null
  return document.getElementById(id)?.textContent ?? null
}

// --- Cada formulario: cómo se abre, cómo se llena y cómo se envía. ---

interface Formulario {
  nombre: string
  ruta: string
  campo: string
  boton: string
  valido: string
  invalido: string
  mensajeLocal: string
  prefijo: string
  abrir: () => Promise<void>
}

const COMENTARIO: Formulario = {
  nombre: "comentario",
  ruta: `/estudiante/clases/${CLASE_ID}`,
  campo: "Escribe un comentario",
  boton: "Comentar",
  valido: "Hola",
  invalido: "   ",
  mensajeLocal: "Escribe tu comentario",
  prefijo: "texto",
  abrir: async () => {
    fireEvent.click(await screen.findByRole("button", { name: "Ver comentarios (0)" }))
    await screen.findByLabelText("Escribe un comentario")
  },
}

const CREAR_TEMA: Formulario = {
  nombre: "crear tema",
  ruta: `/maestro/clases/${CLASE_ID}/trabajo`,
  campo: "Nombre del tema",
  boton: "Crear tema",
  valido: "Unidad 2",
  invalido: "   ",
  mensajeLocal: "",
  prefijo: "nombre",
  abrir: async () => {
    fireEvent.click(await screen.findByRole("button", { name: "Nuevo tema" }))
    await screen.findByLabelText("Nombre del tema")
  },
}

const RENOMBRAR_TEMA: Formulario = {
  ...CREAR_TEMA,
  nombre: "renombrar tema",
  boton: "Guardar nombre",
  abrir: async () => {
    fireEvent.click(await screen.findByRole("button", { name: "Renombrar tema Unidad 1" }))
    await screen.findByLabelText("Nombre del tema")
  },
}

const CREAR_CLASE: Formulario = {
  nombre: "crear clase",
  ruta: "/admin/clases/nueva",
  campo: "Nombre de la clase",
  boton: "Crear clase",
  valido: "Álgebra",
  invalido: "A",
  mensajeLocal: "El nombre debe tener al menos 2 caracteres",
  prefijo: "nombre",
  abrir: async () => {
    fireEvent.change(await screen.findByLabelText("Buscar maestro por nombre"), {
      target: { value: "Luis" },
    })
    fireEvent.click(await screen.findByRole("button", { name: "Elegir Luis Pérez" }))
  },
}

const EDITAR_CLASE: Formulario = {
  ...CREAR_CLASE,
  nombre: "editar clase",
  ruta: `/admin/clases/${CLASE_ID}/editar`,
  boton: "Guardar cambios",
  abrir: async () => {
    await screen.findByLabelText("Nombre de la clase")
  },
}

const escribir = (formulario: Formulario, valor: string) => {
  fireEvent.change(screen.getByLabelText(formulario.campo), { target: { value: valor } })
}

const enviar = (formulario: Formulario) => {
  fireEvent.click(screen.getByRole("button", { name: formulario.boton }))
}

const abrirYEscribir = async (formulario: Formulario) => {
  await formulario.abrir()
  escribir(formulario, formulario.valido)
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

describe("O-16: un VALIDACION de un campo pintado con el formulario desmontado (CL3-C14)", () => {
  it.each([COMENTARIO, CREAR_TEMA, RENOMBRAR_TEMA, CREAR_CLASE, EDITAR_CLASE])(
    "CL3-C14: $nombre desmontado con el envío en vuelo y un 400 VALIDACION de su campo: un aviso con el mensaje sin la ruta",
    async (formulario) => {
      const { fila } = crearServidor()
      const router = montar(formulario.ruta)
      await abrirYEscribir(formulario)
      const enVuelo = diferido()
      fila.push(() => enVuelo.promesa)
      enviar(formulario)
      await irAOtraPantalla(router)

      enVuelo.resolver(validacion(`${formulario.prefijo}: El servidor rechazó el valor`))
      await waitFor(() => expect(aviso.error).toHaveBeenCalledWith("El servidor rechazó el valor"))
      await reposar()
      expect(aviso.error).toHaveBeenCalledTimes(1)
      expect(aviso.success).not.toHaveBeenCalled()
    },
  )

  it.each([COMENTARIO, CREAR_TEMA, RENOMBRAR_TEMA, CREAR_CLASE, EDITAR_CLASE])(
    "CL3-C14: $nombre montado con un 400 VALIDACION de su campo: su ErrorDeCampo, sin aviso",
    async (formulario) => {
      const { fila } = crearServidor()
      montar(formulario.ruta)
      await abrirYEscribir(formulario)
      fila.push(() => validacion(`${formulario.prefijo}: El servidor rechazó el valor`))
      enviar(formulario)
      const campo = screen.getByLabelText(formulario.campo)
      await waitFor(() => expect(errorDelCampo(campo)).toBe("El servidor rechazó el valor"))
      expect(campo).toHaveAttribute("aria-invalid", "true")
      await reposar()
      expect(aviso.error).not.toHaveBeenCalled()
      expect(aviso.success).not.toHaveBeenCalled()
    },
  )

  it.each([COMENTARIO, CREAR_TEMA, RENOMBRAR_TEMA, CREAR_CLASE, EDITAR_CLASE])(
    "CL3-C14: $nombre desmontado con un VALIDACION de su campo sin texto visible: un aviso con el genérico",
    async (formulario) => {
      const { fila } = crearServidor()
      const router = montar(formulario.ruta)
      await abrirYEscribir(formulario)
      const enVuelo = diferido()
      fila.push(() => enVuelo.promesa)
      enviar(formulario)
      await irAOtraPantalla(router)

      enVuelo.resolver(validacion(`${formulario.prefijo}:   `))
      await waitFor(() => expect(aviso.error).toHaveBeenCalledWith(GENERICO))
      await reposar()
      expect(aviso.error).toHaveBeenCalledTimes(1)
    },
  )
})

describe("Crear y editar clase con el formulario desmontado o montado (CL3-C14, variante M-01)", () => {
  it.each([
    { formulario: CREAR_CLASE, estado: 500, codigo: "ERROR_INTERNO", esperado: GENERICO },
    { formulario: EDITAR_CLASE, estado: 500, codigo: "ERROR_INTERNO", esperado: GENERICO },
    { formulario: CREAR_CLASE, estado: 503, codigo: "SERVICIO_OCUPADO", esperado: OCUPADO },
    { formulario: EDITAR_CLASE, estado: 503, codigo: "SERVICIO_OCUPADO", esperado: OCUPADO },
  ])(
    "CL3-C14: $formulario.nombre desmontado con un $estado $codigo: un aviso con el mensaje del módulo (el genérico o el del servidor)",
    async ({ formulario, estado, codigo, esperado }) => {
      const mensaje = estado === 503 ? OCUPADO : "El servidor falló al guardar."
      const { fila } = crearServidor()
      const router = montar(formulario.ruta)
      await abrirYEscribir(formulario)
      const enVuelo = diferido()
      fila.push(() => enVuelo.promesa)
      enviar(formulario)
      await irAOtraPantalla(router)
      enVuelo.resolver(errorDeApi(estado, codigo, mensaje))
      await waitFor(() => expect(aviso.error).toHaveBeenCalledWith(esperado))
      await reposar()
      expect(aviso.error).toHaveBeenCalledTimes(1)
    },
  )

  it.each([CREAR_CLASE, EDITAR_CLASE])(
    "CL3-C14: $nombre desmontado con la red caída: un aviso (el genérico del módulo)",
    async (formulario) => {
      const { fila } = crearServidor()
      const router = montar(formulario.ruta)
      await abrirYEscribir(formulario)
      let fallar: () => void = () => undefined
      const enVuelo = new Promise<Response>((_resolver, rechazar) => {
        fallar = () => rechazar(new TypeError("Failed to fetch"))
      })
      fila.push(() => enVuelo)
      enviar(formulario)
      await irAOtraPantalla(router)
      fallar()
      await waitFor(() => expect(aviso.error).toHaveBeenCalledWith(GENERICO))
      await reposar()
      expect(aviso.error).toHaveBeenCalledTimes(1)
    },
  )

  it.each([
    { formulario: CREAR_CLASE, estado: 201, texto: "Clase creada" },
    { formulario: EDITAR_CLASE, estado: 200, texto: "Cambios guardados" },
  ])(
    "CL3-C14: $formulario.nombre desmontado con un $estado: un aviso de éxito y ninguna navegación",
    async ({ formulario, estado, texto }) => {
      const { fila } = crearServidor()
      const router = montar(formulario.ruta)
      await abrirYEscribir(formulario)
      const enVuelo = diferido()
      fila.push(() => enVuelo.promesa)
      enviar(formulario)
      await irAOtraPantalla(router)
      enVuelo.resolver(claseRespuesta(estado))
      await waitFor(() => expect(aviso.success).toHaveBeenCalledWith(texto))
      await reposar()
      expect(aviso.success).toHaveBeenCalledTimes(1)
      expect(aviso.error).not.toHaveBeenCalled()
      expect(router.state.location.pathname).toBe("/otra")
    },
  )

  it.each([CREAR_CLASE, EDITAR_CLASE])(
    "CL3-C14: $nombre desmontado con 403 ACCESO_RESTRINGIDO: ningún aviso",
    async (formulario) => {
      const { fila } = crearServidor()
      const router = montar(formulario.ruta)
      await abrirYEscribir(formulario)
      const enVuelo = diferido()
      fila.push(() => enVuelo.promesa)
      enviar(formulario)
      await irAOtraPantalla(router)
      enVuelo.resolver(errorDeApi(403, "ACCESO_RESTRINGIDO", "Tu acceso está restringido."))
      await reposar()
      await reposar()
      expect(aviso.error).not.toHaveBeenCalled()
      expect(aviso.success).not.toHaveBeenCalled()
    },
  )

  it.each([
    { formulario: CREAR_CLASE, estado: 201, texto: "Clase creada" },
    { formulario: EDITAR_CLASE, estado: 200, texto: "Cambios guardados" },
  ])(
    "CL3-C14: $formulario.nombre montado con un $estado: un solo aviso de éxito y la navegación a la clase",
    async ({ formulario, estado, texto }) => {
      const { fila } = crearServidor()
      const router = montar(formulario.ruta)
      await abrirYEscribir(formulario)
      fila.push(() => claseRespuesta(estado))
      enviar(formulario)
      expect(await screen.findByText("Pantalla de la clase")).toBeInTheDocument()
      expect(router.state.location.pathname).toBe(`/admin/clases/${CLASE_ID}`)
      await reposar()
      expect(aviso.success).toHaveBeenCalledTimes(1)
      expect(aviso.success).toHaveBeenCalledWith(texto)
      expect(aviso.error).not.toHaveBeenCalled()
    },
  )

  it.each([CREAR_CLASE, EDITAR_CLASE])(
    "CL3-C14: $nombre montado con un 500, un 503 y la red caída: un solo aviso en cada caso, como antes",
    async (formulario) => {
      const { fila } = crearServidor()
      montar(formulario.ruta)
      await abrirYEscribir(formulario)
      fila.push(() => errorDeApi(500, "ERROR_INTERNO", "El servidor falló al guardar."))
      enviar(formulario)
      await waitFor(() => expect(aviso.error).toHaveBeenCalledWith(GENERICO))
      await reposar()
      expect(aviso.error).toHaveBeenCalledTimes(1)

      fila.push(() => errorDeApi(503, "SERVICIO_OCUPADO", OCUPADO))
      enviar(formulario)
      await waitFor(() => expect(aviso.error).toHaveBeenCalledWith(OCUPADO))
      await reposar()
      expect(aviso.error).toHaveBeenCalledTimes(2)

      fila.push(() => Promise.reject(new TypeError("Failed to fetch")))
      enviar(formulario)
      await waitFor(() => expect(aviso.error).toHaveBeenCalledTimes(3))
      expect(aviso.error).toHaveBeenLastCalledWith(GENERICO)
      await reposar()
      expect(aviso.error).toHaveBeenCalledTimes(3)
      expect(aviso.success).not.toHaveBeenCalled()
    },
  )
})

describe("Guardas de doble clic de CHORE-04 (CL3-C15)", () => {
  const RUTAS: Record<string, (formulario: Formulario) => [string, string]> = {
    comentario: () => ["POST", `${BASE}/publicaciones/${PUBLICACION_ID}/comentarios`],
    "crear clase": () => ["POST", "/api/admin/clases"],
    "editar clase": () => ["PUT", `/api/admin/clases/${CLASE_ID}`],
  }
  const peticion = (formulario: Formulario): [string, string] => {
    const ruta = RUTAS[formulario.nombre]
    if (ruta === undefined) throw new Error(`Precondición: la ruta de ${formulario.nombre}`)
    return ruta(formulario)
  }

  it.each([COMENTARIO, CREAR_CLASE, EDITAR_CLASE])(
    "CL3-C15: dos clics en el mismo render en «$boton» mandan una sola petición",
    async (formulario) => {
      const { fila, cuantas } = crearServidor()
      montar(formulario.ruta)
      await abrirYEscribir(formulario)
      const enVuelo = diferido()
      fila.push(() => enVuelo.promesa)
      const boton = screen.getByRole("button", { name: formulario.boton })
      act(() => {
        fireEvent.click(boton)
        fireEvent.click(boton)
      })
      await reposar()
      expect(cuantas(...peticion(formulario))).toBe(1)
      enVuelo.resolver(errorDeApi(500, "ERROR_INTERNO", "El servidor falló."))
      await waitFor(() => expect(aviso.error).toHaveBeenCalledTimes(1))
    },
  )

  it.each([COMENTARIO, CREAR_CLASE, EDITAR_CLASE])(
    "CL3-C15: tras un error del servidor en «$boton», el siguiente envío vuelve a salir",
    async (formulario) => {
      const { fila, cuantas } = crearServidor()
      montar(formulario.ruta)
      await abrirYEscribir(formulario)
      fila.push(() => errorDeApi(500, "ERROR_INTERNO", "El servidor falló."))
      enviar(formulario)
      await waitFor(() => expect(aviso.error).toHaveBeenCalledTimes(1))
      const boton = screen.getByRole("button", { name: formulario.boton })
      await waitFor(() => expect(boton).not.toHaveAttribute("aria-busy", "true"))

      const enVuelo = diferido()
      fila.push(() => enVuelo.promesa)
      enviar(formulario)
      await waitFor(() => expect(cuantas(...peticion(formulario))).toBe(2))
      enVuelo.resolver(errorDeApi(500, "ERROR_INTERNO", "El servidor falló."))
      await waitFor(() => expect(aviso.error).toHaveBeenCalledTimes(2))
    },
  )

  it.each([COMENTARIO, CREAR_CLASE, EDITAR_CLASE])(
    "CL3-C15: tras el ErrorDeCampo del servidor en «$boton», un envío válido lo quita antes de la respuesta nueva",
    async (formulario) => {
      const { fila } = crearServidor()
      montar(formulario.ruta)
      await abrirYEscribir(formulario)
      fila.push(() => validacion(`${formulario.prefijo}: El servidor rechazó el valor`))
      enviar(formulario)
      const campo = screen.getByLabelText(formulario.campo)
      await waitFor(() => expect(errorDelCampo(campo)).toBe("El servidor rechazó el valor"))

      const enVuelo = diferido()
      fila.push(() => enVuelo.promesa)
      enviar(formulario)
      await waitFor(() => expect(errorDelCampo(campo)).toBeNull())
      expect(screen.queryByText("El servidor rechazó el valor")).toBeNull()
      expect(campo).not.toHaveAttribute("aria-invalid", "true")
      enVuelo.resolver(errorDeApi(500, "ERROR_INTERNO", "El servidor falló."))
      await waitFor(() => expect(aviso.error).toHaveBeenCalledTimes(1))
    },
  )

  it.each([COMENTARIO, CREAR_CLASE, EDITAR_CLASE])(
    "CL3-C15: tras el ErrorDeCampo del servidor en «$boton», un envío que la validación local rechaza muestra un solo ErrorDeCampo, el local, sin aviso; y el siguiente envío sale",
    async (formulario) => {
      const { fila, cuantas } = crearServidor()
      montar(formulario.ruta)
      await abrirYEscribir(formulario)
      fila.push(() => validacion(`${formulario.prefijo}: El servidor rechazó el valor`))
      enviar(formulario)
      const campo = screen.getByLabelText(formulario.campo)
      await waitFor(() => expect(errorDelCampo(campo)).toBe("El servidor rechazó el valor"))

      escribir(formulario, formulario.invalido)
      enviar(formulario)
      expect(errorDelCampo(campo)).toBe(formulario.mensajeLocal)
      expect(screen.queryByText("El servidor rechazó el valor")).toBeNull()
      expect(screen.getAllByText(formulario.mensajeLocal)).toHaveLength(1)
      await reposar()
      expect(aviso.error).not.toHaveBeenCalled()
      expect(cuantas(...peticion(formulario))).toBe(1)

      escribir(formulario, formulario.valido)
      const enVuelo = diferido()
      fila.push(() => enVuelo.promesa)
      enviar(formulario)
      await waitFor(() => expect(cuantas(...peticion(formulario))).toBe(2))
      enVuelo.resolver(errorDeApi(500, "ERROR_INTERNO", "El servidor falló."))
      await waitFor(() => expect(aviso.error).toHaveBeenCalledTimes(1))
    },
  )
})

describe("O-16 en crear y renombrar tema con TEMA_REPETIDO: el aviso se decide después de renovar (CL3-C14, M-01 de la verificación de 03c2)", () => {
  const REPETIDO = "Ya hay un tema con ese nombre."
  const repetido = () => errorDeApi(409, "TEMA_REPETIDO", REPETIDO)

  // Retiene las lecturas de temas desde ahora; `soltar` las deja responder.
  const retenerTemas = (temas: ReturnType<typeof crearServidor>["temas"]) => {
    let soltar: () => void = () => undefined
    temas.retener = new Promise<void>((resolver) => {
      soltar = resolver
    })
    return () => {
      temas.retener = null
      soltar()
    }
  }

  it.each([CREAR_TEMA, RENOMBRAR_TEMA])(
    "CL3-C14 (M-01): $nombre desmontado antes de la respuesta TEMA_REPETIDO: un solo aviso con el mensaje",
    async (formulario) => {
      const { fila } = crearServidor()
      const router = montar(formulario.ruta)
      await abrirYEscribir(formulario)
      const enVuelo = diferido()
      fila.push(() => enVuelo.promesa)
      enviar(formulario)
      await irAOtraPantalla(router)
      enVuelo.resolver(repetido())
      await waitFor(() => expect(aviso.error).toHaveBeenCalledWith(REPETIDO))
      await reposar()
      expect(aviso.error).toHaveBeenCalledTimes(1)
    },
  )

  it.each([CREAR_TEMA, RENOMBRAR_TEMA])(
    "CL3-C14 (M-01): $nombre desmontado durante la renovación de temas tras TEMA_REPETIDO: un solo aviso al terminar",
    async (formulario) => {
      const { fila, temas } = crearServidor()
      const router = montar(formulario.ruta)
      await abrirYEscribir(formulario)
      const soltar = retenerTemas(temas)
      const antes = temas.pedidas
      fila.push(repetido)
      enviar(formulario)
      // La respuesta llegó y el gancho ya está renovando (pidió temas otra vez).
      await waitFor(() => expect(temas.pedidas).toBeGreaterThan(antes))
      await reposar()
      expect(aviso.error).not.toHaveBeenCalled()
      await irAOtraPantalla(router)
      await act(async () => {
        soltar()
        await Promise.resolve()
      })
      await waitFor(() => expect(aviso.error).toHaveBeenCalledWith(REPETIDO))
      await reposar()
      expect(aviso.error).toHaveBeenCalledTimes(1)
    },
  )

  it.each([CREAR_TEMA, RENOMBRAR_TEMA])(
    "CL3-C14 (M-01): $nombre montado al terminar la renovación tras TEMA_REPETIDO: su ErrorDeCampo, sin aviso",
    async (formulario) => {
      const { fila, temas } = crearServidor()
      montar(formulario.ruta)
      await abrirYEscribir(formulario)
      const soltar = retenerTemas(temas)
      const antes = temas.pedidas
      fila.push(repetido)
      enviar(formulario)
      await waitFor(() => expect(temas.pedidas).toBeGreaterThan(antes))
      await act(async () => {
        soltar()
        await Promise.resolve()
      })
      const campo = screen.getByLabelText(formulario.campo)
      await waitFor(() => expect(errorDelCampo(campo)).toBe(REPETIDO))
      await reposar()
      expect(aviso.error).not.toHaveBeenCalled()
    },
  )

  it.each([CREAR_TEMA, RENOMBRAR_TEMA])(
    "CL3-C14 (M-01): $nombre desmontado después de mostrar su ErrorDeCampo por TEMA_REPETIDO: ningún aviso",
    async (formulario) => {
      const { fila } = crearServidor()
      const router = montar(formulario.ruta)
      await abrirYEscribir(formulario)
      fila.push(repetido)
      enviar(formulario)
      const campo = screen.getByLabelText(formulario.campo)
      await waitFor(() => expect(errorDelCampo(campo)).toBe(REPETIDO))
      await irAOtraPantalla(router)
      await reposar()
      expect(aviso.error).not.toHaveBeenCalled()
    },
  )

  it.each([CREAR_TEMA, RENOMBRAR_TEMA])(
    "CL3-C14 (M-01): $nombre desmontado y vuelto a montar durante la renovación tras TEMA_REPETIDO: un solo aviso y el formulario nuevo sin error",
    async (formulario) => {
      const { fila, temas } = crearServidor()
      const router = montar(formulario.ruta)
      await abrirYEscribir(formulario)
      const soltar = retenerTemas(temas)
      const antes = temas.pedidas
      fila.push(repetido)
      enviar(formulario)
      await waitFor(() => expect(temas.pedidas).toBeGreaterThan(antes))
      await irAOtraPantalla(router)
      await act(async () => {
        await router.navigate(formulario.ruta)
      })
      await act(async () => {
        soltar()
        await Promise.resolve()
      })
      await waitFor(() => expect(aviso.error).toHaveBeenCalledWith(REPETIDO))
      await formulario.abrir()
      expect(errorDelCampo(screen.getByLabelText(formulario.campo))).toBeNull()
      await reposar()
      expect(aviso.error).toHaveBeenCalledTimes(1)
    },
  )
})
