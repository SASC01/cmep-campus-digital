import { listaUsuariosConsultaSchema } from "@campus/shared"
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { createMemoryRouter, RouterProvider } from "react-router"
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"

import { Providers } from "@/app/providers"
import { MENSAJE_DE_PRUEBA } from "@/lib/errores-de-api-fuera-de-contrato"
import { establecerToken, limpiarToken } from "@/services/tokenAcceso"

// ADMIN-01f: la tabla de /admin/usuarios (buscador, filtro, "Cargar más usuarios", frases de error y de
// lista cambiada por cada camino) y el alta de un alumno, con el router real (rutas de app/router) y
// Providers (staleTime de 30 s y un reintento salvo ante un 4xx). El servidor es un doble en memoria;
// lo que nadie responde es un 500 "no esperada". El carácter nulo se escribe con su código.

vi.mock("@/services/navegacion", () => ({ irA: vi.fn(), rutaActual: vi.fn(() => "/admin") }))
const aviso = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }))
vi.mock("sonner", () => ({ toast: aviso, Toaster: () => null }))

const NULO = String.fromCharCode(0)
const GENERICO = "No pudimos completar la operación. Inténtalo de nuevo."
const ERROR_TABLA = "No pudimos cargar los usuarios. Revisa tu conexión e inténtalo de nuevo."
const LISTA_CAMBIADA = "La lista cambió mientras la veías. Vuelve a abrirla para verla completa."
const TEMPORAL = "Kp7mWq4Rt9Xz"
const ESPERA = { timeout: 4000 }

const fila = (n: number, nombre = `Usuario ${String(n).padStart(3, "0")}`) => ({
  id: `5a5b3c4d-1c1f-4b8e-9a1e-${String(n).padStart(12, "0")}`,
  nombre,
  email: `u${String(n)}@ejemplo.mx`,
  rol: "maestro",
  activo: true,
  creadoEn: "2026-09-01T15:00:00.000Z",
})

const respuestaJson = (estado: number, cuerpo: unknown) =>
  new Response(JSON.stringify(cuerpo), {
    status: estado,
    headers: { "Content-Type": "application/json" },
  })

const errorJson = (estado: number, codigo: string, mensaje = "mensaje del servidor") =>
  respuestaJson(estado, { error: { codigo, mensaje } })

const pagina = (
  usuarios: ReturnType<typeof fila>[],
  siguiente: { cursor: string; nombre: string } | null = null,
) =>
  respuestaJson(200, {
    usuarios,
    siguienteCursor: siguiente?.cursor ?? null,
    siguienteCursorNombre: siguiente?.nombre ?? null,
  })

interface Llamada {
  metodo: string
  url: URL
  cuerpo: unknown
}

let llamadas: Llamada[] = []
let tabla: (url: URL) => Response | Promise<Response> = () => pagina([fila(1)])
let alta: () => Response = () => errorJson(500, "ERROR_INTERNO")

beforeAll(async () => {
  await import("@/app/router")
}, 60_000)

beforeEach(() => {
  establecerToken("token-de-prueba")
  llamadas = []
  tabla = () => pagina([fila(1)])
  alta = () => errorJson(500, "ERROR_INTERNO")
  vi.stubGlobal(
    "fetch",
    vi.fn<typeof fetch>((entrada, init) => {
      const url = new URL(String(entrada), "http://local")
      const metodo = init?.method ?? "GET"
      llamadas.push({
        metodo,
        url,
        cuerpo: init?.body === undefined ? undefined : JSON.parse(String(init.body)),
      })
      if (url.pathname === "/api/auth/refrescar") {
        return Promise.resolve(respuestaJson(200, { tokenAcceso: "t" }))
      }
      if (url.pathname === "/api/me") {
        return Promise.resolve(
          respuestaJson(200, {
            id: "d9a8c3c2-3333-4da0-9c3a-2b4c5d6e7f80",
            nombre: "Administración",
            email: "admin@ejemplo.mx",
            rol: "admin",
            debeCambiarContrasena: false,
            accesoRestringido: false,
          }),
        )
      }
      if (metodo === "GET" && url.pathname === "/api/admin/usuarios") {
        return Promise.resolve(tabla(url))
      }
      if (metodo === "POST" && url.pathname === "/api/admin/alumnos") return Promise.resolve(alta())
      if (metodo === "GET" && url.pathname === "/api/admin/resumen") {
        return Promise.resolve(respuestaJson(200, { alumnos: 1, maestros: 1, clasesActivas: 1 }))
      }
      if (metodo === "GET" && url.pathname === "/api/admin/enlaces-registro") {
        return Promise.resolve(respuestaJson(200, { enlaces: [], siguienteCursor: null }))
      }
      return Promise.resolve(errorJson(500, "ERROR_INTERNO", "no esperada"))
    }),
  )
})

afterEach(() => {
  cleanup()
  limpiarToken()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  aviso.success.mockClear()
  aviso.error.mockClear()
})

const montar = async (ruta = "/admin/usuarios") => {
  const { rutas } = await import("@/app/router")
  const router = createMemoryRouter(rutas, { initialEntries: [ruta] })
  render(
    <Providers>
      <RouterProvider router={router} />
    </Providers>,
  )
  await screen.findByRole("navigation", { name: "Navegación principal" })
  return router
}

const reposar = async () => {
  await act(async () => {
    for (let i = 0; i < 6; i += 1) await new Promise((r) => setTimeout(r, 0))
  })
}

const esperarLaBusqueda = () => act(() => new Promise((r) => setTimeout(r, 450)))

const pedidasDeLaTabla = () =>
  llamadas.filter((l) => l.metodo === "GET" && l.url.pathname === "/api/admin/usuarios")

const conQ = () => pedidasDeLaTabla().filter((l) => l.url.searchParams.has("q"))

const buscar = async (texto: string) => {
  fireEvent.change(screen.getByLabelText("Buscar por nombre o correo"), {
    target: { value: texto },
  })
  await esperarLaBusqueda()
}

const elegirRol = async (valor: string) => {
  fireEvent.change(screen.getByLabelText("Rol"), { target: { value: valor } })
  await reposar()
}

const enLaBarra = async (seccion: string) => {
  const nav = screen.getByRole("navigation", { name: "Navegación principal" })
  fireEvent.click(within(nav).getByRole("link", { name: seccion }))
  await reposar()
}

// Los 400 fuera de contrato de la consulta de la tabla (ADM-1F21 e).
const ROL_EN_INGLES = (() => {
  const resultado = listaUsuariosConsultaSchema.safeParse({ rol: "x" })
  const incidencia = resultado.error?.issues.find((i) => i.path[0] === "rol")
  if (incidencia === undefined) throw new Error("Precondición: el esquema rechaza el rol")
  return `rol: ${incidencia.message}`
})()

const FUERA_DE_CONTRATO: readonly (readonly [string, () => Response])[] = [
  ["5xx", () => errorJson(500, "ERROR_INTERNO")],
  [
    "q con el carácter nulo",
    () => errorJson(400, "VALIDACION", "q: Los datos enviados tienen caracteres no permitidos."),
  ],
  [
    "q largo",
    () => errorJson(400, "VALIDACION", "q: La búsqueda no puede tener más de 120 caracteres"),
  ],
  [
    "BUSQUEDA_MUY_CORTA",
    () => errorJson(400, "BUSQUEDA_MUY_CORTA", "Escribe al menos 3 letras para buscar."),
  ],
  ["rol en inglés", () => errorJson(400, "VALIDACION", ROL_EN_INGLES)],
  ["limite", () => errorJson(400, "VALIDACION", "limite: Too big: expected number to be <=100")],
]

describe("ADMIN-01f · el buscador y el filtro (ADM-1F02, ADM-1F21)", () => {
  it("ADM-1F21 (a, f): la primera carga no lleva q ni rol; «Maestro» manda rol=maestro y nunca estadoPago; «Todos», ni rol ni estadoPago", async () => {
    await montar()
    await screen.findByRole("table")
    expect(pedidasDeLaTabla()[0]?.url.search).toBe("")

    await elegirRol("maestro")
    await waitFor(() => expect(pedidasDeLaTabla().length).toBe(2))
    const conMaestro = pedidasDeLaTabla()[1]?.url
    expect(conMaestro?.searchParams.get("rol")).toBe("maestro")
    expect(conMaestro?.searchParams.has("estadoPago")).toBe(false)

    await elegirRol("todos")
    for (const llamada of pedidasDeLaTabla()) {
      expect(llamada.url.searchParams.has("estadoPago")).toBe(false)
    }
    expect(pedidasDeLaTabla().filter((l) => !l.url.searchParams.has("rol")).length).toBeGreaterThan(
      0,
    )
  })

  it("ADM-1F02 y ADM-1F21 (b): espera 300 ms; con «», «   », «a» o «ab» no pide nada con q, la ayuda sigue visible, y volver a vaciar el campo no pide otra vez la lista", async () => {
    await montar()
    await screen.findByRole("table")
    const antes = pedidasDeLaTabla().length
    expect(screen.getByText("Escribe al menos 3 letras.")).toBeInTheDocument()

    for (const texto of ["a", "ab", "   ", ""]) await buscar(texto)

    expect(conQ()).toEqual([])
    expect(pedidasDeLaTabla().length).toBe(antes)
    expect(screen.getByText("Escribe al menos 3 letras.")).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText("Buscar por nombre o correo"), {
      target: { value: "ana" },
    })
    expect(conQ()).toEqual([])
    await esperarLaBusqueda()
    await waitFor(() => expect(conQ().map((l) => l.url.searchParams.get("q"))).toEqual(["ana"]))
  })

  it("ADM-1F21 (c): 121 normalizados y 1001 en crudo no se mandan y marcan el campo con su tope; 120 normalizados sí", async () => {
    await montar()
    await screen.findByRole("table")
    const campo = screen.getByLabelText("Buscar por nombre o correo")

    for (const texto of ["a".repeat(121), `ana${" ".repeat(998)}`]) {
      await buscar(texto)
      expect(campo).toHaveAttribute("aria-invalid", "true")
      expect(campo).toHaveAccessibleDescription(
        expect.stringContaining("La búsqueda no puede tener más de 120 caracteres"),
      )
    }
    expect(conQ()).toEqual([])

    await buscar("a".repeat(120))
    await waitFor(() => expect(conQ()).toHaveLength(1))
    expect(campo).toHaveAttribute("aria-invalid", "false")
  })

  it.each([`ana${NULO}`, `${NULO}ana`, `an${NULO}a`, `ana${NULO}${NULO}${NULO}`])(
    "ADM-1F21 (d): un término con el carácter nulo no pide nada y muestra el vacío de búsqueda, sin alerta",
    async (texto) => {
      await montar()
      await screen.findByRole("table")
      const antes = pedidasDeLaTabla().length
      await buscar(texto)
      expect(
        await screen.findByText("No encontramos usuarios con esa búsqueda"),
      ).toBeInTheDocument()
      expect(pedidasDeLaTabla().length).toBe(antes)
      expect(screen.queryAllByRole("alert")).toHaveLength(0)
    },
  )

  it("ADM-1F02: con una búsqueda sin resultados, el vacío de búsqueda", async () => {
    tabla = (url) => (url.searchParams.has("q") ? pagina([]) : pagina([fila(1)]))
    await montar()
    await screen.findByRole("table")
    await buscar("zzz")
    expect(await screen.findByText("No encontramos usuarios con esa búsqueda")).toBeInTheDocument()
  })
})

describe("ADMIN-01f · «Cargar más usuarios» (ADM-1F02, ADM-1F18, ADM-1F19, ADM-1F03)", () => {
  const PRIMERA = Array.from({ length: 3 }, (_, i) => fila(i + 1))
  const NOMBRE_DEL_CURSOR = "Ña & Ó+% Pérez"
  const CURSOR = PRIMERA[2]?.id ?? ""

  it("ADM-1F18 (a, b, d): la primera página sale sin cursor; la siguiente lleva q, rol, cursor y cursorNombre codificado, con una sola petición por dos clics; al cargar la última, el foco va a la primera fila nueva", async () => {
    tabla = (url) =>
      url.searchParams.has("cursor")
        ? pagina([fila(4)])
        : pagina(PRIMERA, { cursor: CURSOR, nombre: NOMBRE_DEL_CURSOR })
    await montar()
    await elegirRol("maestro")
    await buscar("usuario")
    const cargarMas = await screen.findByRole("button", { name: "Cargar más usuarios" }, ESPERA)
    expect(pedidasDeLaTabla().every((l) => !l.url.searchParams.has("cursor"))).toBe(true)

    act(() => cargarMas.focus())
    fireEvent.click(cargarMas)
    fireEvent.click(cargarMas)

    expect(await screen.findByText(fila(4).nombre)).toBeInTheDocument()
    const siguientes = pedidasDeLaTabla().filter((l) => l.url.searchParams.has("cursor"))
    expect(siguientes).toHaveLength(1)
    const url = siguientes[0]?.url
    expect([...(url?.searchParams.keys() ?? [])]).toEqual(["q", "rol", "cursor", "cursorNombre"])
    expect(url?.searchParams.get("cursor")).toBe(CURSOR)
    expect(url?.searchParams.get("cursorNombre")).toBe(NOMBRE_DEL_CURSOR)
    await waitFor(() =>
      expect(document.activeElement).toBe(
        screen.getByRole("link", { name: `Ver ${fila(4).nombre}` }),
      ),
    )
  })

  it("ADM-1F19: una cuenta repetida en la segunda página se pinta una vez, sin aviso de claves de React, y la tercera página lleva el cursor de la segunda respuesta", async () => {
    const errorDeConsola = vi.spyOn(console, "error")
    const repetida = PRIMERA[0]
    if (repetida === undefined) throw new Error("Precondición: hay primera página")
    tabla = (url) => {
      const cursor = url.searchParams.get("cursor")
      if (cursor === null) return pagina(PRIMERA, { cursor: CURSOR, nombre: "C" })
      if (cursor === CURSOR) return pagina([fila(4), repetida], { cursor: fila(4).id, nombre: "D" })
      return pagina([fila(5)])
    }
    await montar()
    fireEvent.click(await screen.findByRole("button", { name: "Cargar más usuarios" }))
    expect(await screen.findByText(fila(4).nombre)).toBeInTheDocument()
    expect(screen.getAllByText(repetida.nombre)).toHaveLength(1)

    fireEvent.click(screen.getByRole("button", { name: "Cargar más usuarios" }))
    expect(await screen.findByText(fila(5).nombre)).toBeInTheDocument()
    const tercera = pedidasDeLaTabla().at(-1)?.url
    expect(tercera?.searchParams.get("cursor")).toBe(fila(4).id)
    expect(tercera?.searchParams.get("cursorNombre")).toBe("D")
    expect(
      errorDeConsola.mock.calls.filter((args) => String(args[0]).includes("same key")),
    ).toEqual([])
  })

  const conCursorVencido = async () => {
    let vencido = true
    tabla = (url) => {
      if (url.searchParams.has("cursor") && vencido) {
        vencido = false
        return errorJson(400, "VALIDACION", "cursor: no es válido")
      }
      if (url.searchParams.has("cursor")) return pagina([fila(4)])
      return pagina(PRIMERA, { cursor: CURSOR, nombre: "C" })
    }
    const router = await montar()
    fireEvent.click(await screen.findByRole("button", { name: "Cargar más usuarios" }))
    expect(await screen.findByText(LISTA_CAMBIADA)).toBeInTheDocument()
    expect(screen.getAllByRole("alert")).toHaveLength(1)
    expect(aviso.error).not.toHaveBeenCalled()
    return router
  }

  const primerasPaginas = () => pedidasDeLaTabla().filter((l) => !l.url.searchParams.has("cursor"))

  it("ADM-1F03 y ADM-1F18 (c), camino (a): pulsar «Usuarios» estando en la tabla pide la primera página sin cursor y el texto desaparece", async () => {
    const router = await conCursorVencido()
    const antes = primerasPaginas().length
    const clave = router.state.location.key
    await enLaBarra("Usuarios")
    expect(router.state.location.key).not.toBe(clave)
    await waitFor(() => expect(primerasPaginas().length).toBe(antes + 1))
    await waitFor(() => expect(screen.queryByText(LISTA_CAMBIADA)).toBeNull())
    expect(await screen.findByRole("table")).toBeInTheDocument()
  })

  it("ADM-1F03, camino (b): ir a «Maestros» y regresar antes del staleTime pide la primera página y el texto desaparece", async () => {
    const router = await conCursorVencido()
    const antes = primerasPaginas().length
    await enLaBarra("Maestros")
    await waitFor(() => expect(router.state.location.pathname).toBe("/admin/maestros"))
    await enLaBarra("Usuarios")
    await waitFor(() => expect(primerasPaginas().length).toBeGreaterThan(antes))
    await waitFor(() => expect(screen.queryByText(LISTA_CAMBIADA)).toBeNull())
  })

  it("ADM-1F03, camino del historial: atrás y adelante y atrás otra vez dejan la tabla sin el texto", async () => {
    const router = await conCursorVencido()
    await enLaBarra("Maestros")
    await waitFor(() => expect(router.state.location.pathname).toBe("/admin/maestros"))
    for (const [paso, destino] of [
      [-1, "/admin/usuarios"],
      [1, "/admin/maestros"],
      [-1, "/admin/usuarios"],
    ] as const) {
      await act(async () => {
        await router.navigate(paso)
      })
      await waitFor(() => expect(router.state.location.pathname).toBe(destino))
      await reposar()
    }
    await waitFor(() => expect(screen.queryByText(LISTA_CAMBIADA)).toBeNull())
    expect(await screen.findByRole("table")).toBeInTheDocument()
  })
})

describe("ADMIN-01f · la frase de error de carga de la tabla por cada camino (ADM-1F17, ADM-1F21 e)", () => {
  it.each(FUERA_DE_CONTRATO)(
    "ADM-1F21 (e) con %s: un solo MensajeError con el texto fijo, sin aviso ni texto del servidor; lo escrito y el filtro se conservan; editar la búsqueda vuelve a pedir y, con 200, el texto desaparece",
    async (_caso, respuesta) => {
      let falla = true
      tabla = (url) => {
        if (url.searchParams.get("q") === "ana" && falla) return respuesta()
        return pagina([fila(1)])
      }
      await montar()
      await screen.findByRole("table")
      await elegirRol("maestro")
      falla = true
      await buscar("ana")
      expect(await screen.findByText(ERROR_TABLA, {}, ESPERA)).toBeInTheDocument()
      expect(screen.getAllByRole("alert")).toHaveLength(1)
      expect(aviso.error).not.toHaveBeenCalled()
      expect(document.body.textContent).not.toMatch(/q:|Invalid|Too big|para buscar|permitidos/)
      expect(screen.getByLabelText("Buscar por nombre o correo")).toHaveValue("ana")
      expect(screen.getByLabelText("Rol")).toHaveValue("maestro")

      falla = false
      await buscar("anab")
      expect(await screen.findByRole("table")).toBeInTheDocument()
      expect(screen.queryByText(ERROR_TABLA)).toBeNull()
    },
  )

  it("ADM-1F17 (d): cambiar el rol y volver al de antes, con la clave de antes en error en su primera carga, la vuelve a pedir y el texto desaparece", async () => {
    let fallos = 2
    tabla = (url) => {
      if (url.searchParams.get("rol") === "maestro" && fallos > 0) {
        fallos -= 1
        return errorJson(500, "ERROR_INTERNO")
      }
      return pagina([fila(1)])
    }
    await montar()
    await screen.findByRole("table")
    await elegirRol("maestro")
    expect(await screen.findByText(ERROR_TABLA, {}, ESPERA)).toBeInTheDocument()
    await elegirRol("estudiante")
    await screen.findByRole("table")
    const antes = pedidasDeLaTabla().filter(
      (l) => l.url.searchParams.get("rol") === "maestro",
    ).length

    await elegirRol("maestro")

    await waitFor(() =>
      expect(
        pedidasDeLaTabla().filter((l) => l.url.searchParams.get("rol") === "maestro").length,
      ).toBe(antes + 1),
    )
    expect(await screen.findByRole("table")).toBeInTheDocument()
    expect(screen.queryByText(ERROR_TABLA)).toBeNull()
  })

  it("ADM-1F17 (d): lo mismo con la clave de antes en error en una recarga con datos (la página siguiente que falla)", async () => {
    let fallar = true
    tabla = (url) => {
      if (url.searchParams.get("rol") === "maestro" && url.searchParams.has("cursor") && fallar) {
        fallar = false
        return errorJson(400, "VALIDACION", "limite: Too big")
      }
      if (url.searchParams.get("rol") === "maestro" && !url.searchParams.has("cursor")) {
        return pagina([fila(1)], { cursor: fila(1).id, nombre: "U" })
      }
      return pagina([fila(2)])
    }
    await montar()
    await screen.findByRole("table")
    await elegirRol("maestro")
    fireEvent.click(await screen.findByRole("button", { name: "Cargar más usuarios" }))
    expect(await screen.findByText(ERROR_TABLA)).toBeInTheDocument()
    await elegirRol("todos")
    await screen.findByRole("table")

    await elegirRol("maestro")

    expect(await screen.findByRole("table")).toBeInTheDocument()
    expect(screen.queryByText(ERROR_TABLA)).toBeNull()
  })

  const conLaTablaEnError = async () => {
    let fallos = 2
    tabla = () => {
      if (fallos > 0) {
        fallos -= 1
        return errorJson(500, "ERROR_INTERNO")
      }
      return pagina([fila(1)])
    }
    const router = await montar()
    expect(await screen.findByText(ERROR_TABLA, {}, ESPERA)).toBeInTheDocument()
    return router
  }

  it("ADM-1F17 (a): pulsar «Usuarios» estando en la tabla vuelve a pedir y quita el error", async () => {
    await conLaTablaEnError()
    await enLaBarra("Usuarios")
    expect(await screen.findByRole("table")).toBeInTheDocument()
    expect(screen.queryByText(ERROR_TABLA)).toBeNull()
  })

  it("ADM-1F17 (b): ir a «Inicio» y regresar antes del staleTime vuelve a pedir y quita el error", async () => {
    const router = await conLaTablaEnError()
    await enLaBarra("Inicio")
    await waitFor(() => expect(router.state.location.pathname).toBe("/admin"))
    await enLaBarra("Usuarios")
    expect(await screen.findByRole("table")).toBeInTheDocument()
    expect(screen.queryByText(ERROR_TABLA)).toBeNull()
  })

  it("ADM-1F17 (e): ir a otra sección y volver con «atrás», «adelante» y «atrás» otra vez deja la tabla sin el error, con el término y el rol de nuevo vacíos", async () => {
    const router = await conLaTablaEnError()
    await enLaBarra("Maestros")
    for (const [paso, destino] of [
      [-1, "/admin/usuarios"],
      [1, "/admin/maestros"],
      [-1, "/admin/usuarios"],
    ] as const) {
      await act(async () => {
        await router.navigate(paso)
      })
      await waitFor(() => expect(router.state.location.pathname).toBe(destino))
      await reposar()
    }
    expect(await screen.findByRole("table")).toBeInTheDocument()
    expect(screen.queryByText(ERROR_TABLA)).toBeNull()
    expect(screen.getByLabelText("Buscar por nombre o correo")).toHaveValue("")
    expect(screen.getByLabelText("Rol")).toHaveValue("todos")
  })
})

describe("ADMIN-01f · el alta de un alumno (ADM-1F06, ADM-1F22, ADM-1F25)", () => {
  const abrirAlta = async () => {
    await montar()
    fireEvent.click(await screen.findByRole("button", { name: "Dar de alta un alumno" }))
    const formulario = await screen.findByRole("form", { name: "Dar de alta un alumno" })
    return formulario
  }

  const llenar = (nombre: string, correo: string) => {
    fireEvent.change(screen.getByLabelText("Nombre completo"), { target: { value: nombre } })
    fireEvent.change(screen.getByLabelText("Correo"), { target: { value: correo } })
  }

  const crear = () => fireEvent.click(screen.getByRole("button", { name: "Crear cuenta" }))

  const unSoloMensaje = async (texto: string) => {
    await waitFor(() => expect(screen.getAllByRole("alert")).toHaveLength(1))
    expect(screen.getByRole("alert")).toHaveTextContent(texto)
    expect(aviso.error).not.toHaveBeenCalled()
    expect(document.querySelectorAll('[aria-invalid="true"]')).toHaveLength(0)
  }

  it("ADM-1F06: con éxito, una petición por dos clics; la temporal se muestra una vez, no queda en la caché y su role=status no envuelve «Copiar»", async () => {
    alta = () =>
      respuestaJson(201, {
        usuario: {
          ...fila(9, "Dora Luna"),
          rol: "estudiante",
          estadoPago: "al_corriente",
          fechaEstadoPago: null,
          accesoRestringido: false,
          motivoRestriccion: null,
          fechaRestriccion: null,
        },
        contrasenaTemporal: TEMPORAL,
      })
    await abrirAlta()
    expect(screen.getByLabelText("Nombre completo")).toHaveAttribute("autocomplete", "off")
    expect(screen.getByLabelText("Correo")).toHaveAttribute("autocomplete", "off")
    llenar("Dora Luna", "dora@ejemplo.mx")
    crear()
    crear()

    const temporal = await screen.findByText(TEMPORAL)
    expect(screen.getByText("Cuenta creada para Dora Luna.")).toBeInTheDocument()
    const estado = temporal.closest('[role="status"]')
    expect(estado).not.toBeNull()
    expect(within(estado as HTMLElement).queryByRole("button", { name: "Copiar" })).toBeNull()
    expect(llamadas.filter((l) => l.metodo === "POST")).toHaveLength(1)
    expect(llamadas.find((l) => l.metodo === "POST")?.cuerpo).toEqual({
      nombre: "Dora Luna",
      email: "dora@ejemplo.mx",
    })

    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }))
    await reposar()
    expect(screen.queryByText(TEMPORAL)).toBeNull()
    expect(document.body.innerHTML).not.toContain(TEMPORAL)
  })

  it("ADM-1F06: 409 CORREO_EN_USO va en un ErrorDeCampo de «Correo», sin MensajeError; lo escrito se conserva", async () => {
    alta = () => errorJson(409, "CORREO_EN_USO")
    await abrirAlta()
    llenar("Dora Luna", "dora@ejemplo.mx")
    crear()
    const correo = screen.getByLabelText("Correo")
    await waitFor(() => expect(correo).toHaveAttribute("aria-invalid", "true"))
    expect(correo).toHaveAccessibleDescription("Ya existe una cuenta con ese correo.")
    expect(screen.queryAllByRole("alert")).toHaveLength(0)
    expect(correo).toHaveValue("dora@ejemplo.mx")
    expect(screen.getByLabelText("Nombre completo")).toHaveValue("Dora Luna")
  })

  it.each([
    ["(a) rol: (no se pinta)", `rol: ${MENSAJE_DE_PRUEBA}`, MENSAJE_DE_PRUEBA],
    ["(b) vacío", "", GENERICO],
    ["(b) espacios", "   ", GENERICO],
    ["(c) nombre.0:", `nombre.0: ${MENSAJE_DE_PRUEBA}`, MENSAJE_DE_PRUEBA],
  ])(
    "ADM-1F06 %s: un solo mensaje legible, lo escrito se conserva y el botón sale de la espera",
    async (_caso, mensaje, esperado) => {
      alta = () => errorJson(400, "VALIDACION", mensaje)
      await abrirAlta()
      llenar("Dora Luna", "dora@ejemplo.mx")
      crear()
      await unSoloMensaje(esperado)
      expect(screen.getByLabelText("Nombre completo")).toHaveValue("Dora Luna")
      await waitFor(() =>
        expect(screen.getByRole("button", { name: "Crear cuenta" })).not.toHaveAttribute(
          "aria-busy",
          "true",
        ),
      )
    },
  )

  it("ADM-1F06 (d) y ADM-1F22: un rechazo del servidor y después el nombre vacío dejan un solo mensaje, «Escribe el nombre completo»", async () => {
    alta = () => errorJson(400, "VALIDACION", `rol: ${MENSAJE_DE_PRUEBA}`)
    await abrirAlta()
    llenar("Dora Luna", "dora@ejemplo.mx")
    crear()
    await screen.findByRole("alert")

    llenar("   ", "dora@ejemplo.mx")
    crear()
    await waitFor(() => expect(screen.queryAllByRole("alert")).toHaveLength(0))
    expect(screen.getByLabelText("Nombre completo")).toHaveAccessibleDescription(
      "Escribe el nombre completo",
    )
    expect(llamadas.filter((l) => l.metodo === "POST")).toHaveLength(1)
  })

  it("ADM-1F22: el 400 «nombre: Escribe tu nombre completo» da un solo MensajeError con «Escribe el nombre completo»", async () => {
    alta = () => errorJson(400, "VALIDACION", "nombre: Escribe tu nombre completo")
    await abrirAlta()
    llenar("Dora Luna", "dora@ejemplo.mx")
    crear()
    await unSoloMensaje("Escribe el nombre completo")
    expect(screen.queryByText("Escribe tu nombre completo")).toBeNull()
  })

  it("ADM-1F25: el nombre o el correo con el carácter nulo no se envían y muestran el texto de shared/; si el servidor responde su 400, un solo mensaje", async () => {
    alta = () => errorJson(400, "VALIDACION", "nombre: El nombre tiene caracteres no permitidos")
    await abrirAlta()
    llenar(`Dora${NULO}Luna`, "dora@ejemplo.mx")
    crear()
    expect(screen.getByLabelText("Nombre completo")).toHaveAccessibleDescription(
      "El nombre tiene caracteres no permitidos",
    )
    llenar("Dora Luna", `dora${NULO}@ejemplo.mx`)
    crear()
    expect(screen.getByLabelText("Correo")).toHaveAttribute("aria-invalid", "true")
    expect(llamadas.filter((l) => l.metodo === "POST")).toHaveLength(0)

    llenar("Dora Luna", "dora@ejemplo.mx")
    crear()
    await unSoloMensaje("El nombre tiene caracteres no permitidos")
    expect(screen.getByLabelText("Nombre completo")).toHaveValue("Dora Luna")
  })
})

// Corrección M-20, hermano en la tabla: si otra clave (el rol) o un error quitan el «Ver» que tenía el
// foco, el foco va a la raíz de la vista, nunca a <body>; con el foco en el buscador, no se mueve.
describe("ADMIN-01f · el foco en la tabla al cambiar de clave (hermano de M-20)", () => {
  const raiz = () => {
    const encabezado = screen.getByRole("heading", { level: 1, name: "Usuarios" })
    const contenedor = encabezado.parentElement?.closest('[tabindex="-1"]')
    if (contenedor === null || contenedor === undefined) {
      throw new Error("Precondición: la vista tiene su raíz enfocable")
    }
    return contenedor
  }

  const conElFocoEnVer = async () => {
    await montar()
    const ver = await screen.findByRole("link", { name: `Ver ${fila(1).nombre}` })
    act(() => ver.focus())
    expect(document.activeElement).toBe(ver)
  }

  it("con el foco en «Ver», cambiar el rol (la tabla se vuelve a cargar) lleva el foco a la raíz", async () => {
    await conElFocoEnVer()
    await elegirRol("maestro")
    await screen.findByRole("table")
    await reposar()
    expect(document.activeElement).toBe(raiz())
  })

  it("con el foco en «Ver», un error de la clave nueva lleva el foco a la raíz", async () => {
    tabla = (url) =>
      url.searchParams.get("rol") === "estudiante"
        ? errorJson(400, "VALIDACION", "rol: x")
        : pagina([fila(1)])
    await conElFocoEnVer()
    await elegirRol("estudiante")
    expect(await screen.findByText(ERROR_TABLA)).toBeInTheDocument()
    await reposar()
    expect(document.activeElement).toBe(raiz())
  })

  it("(control) con el foco en el buscador, escribir un término no lo mueve aunque la tabla se recargue", async () => {
    await montar()
    await screen.findByRole("table")
    const campo = screen.getByLabelText("Buscar por nombre o correo")
    act(() => campo.focus())
    await buscar("usuario")
    await screen.findByRole("table")
    await reposar()
    expect(document.activeElement).toBe(campo)
  })
})
