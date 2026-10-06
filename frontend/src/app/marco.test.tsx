import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { createMemoryRouter, RouterProvider } from "react-router"
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"

import { useFilaEnFoco, useFocoAlCargarMas } from "@/features/clases/hooks"

// Pie en las 11 pantallas de rutas (§D-6, "Pruebas requeridas — 01b-1"). Se localiza por rol y por
// texto accesible, nunca por clase de estilo.

vi.mock("@/services/navegacion", () => ({ irA: vi.fn(), rutaActual: vi.fn(() => "/login") }))

const respuestaJson = (estado: number, cuerpo: unknown) =>
  new Response(cuerpo === undefined ? null : JSON.stringify(cuerpo), {
    status: estado,
    headers: cuerpo === undefined ? {} : { "Content-Type": "application/json" },
  })

const errorJson = (estado: number, codigo: string) =>
  respuestaJson(estado, { error: { codigo, mensaje: "mensaje del servidor" } })

const meDe = (extra: Record<string, unknown>) => ({
  id: "5a5d7a3e-1c1f-4b8e-9a1e-0f2a3b4c5d6e",
  nombre: "Ana López",
  email: "ana@ejemplo.mx",
  rol: "estudiante",
  debeCambiarContrasena: false,
  accesoRestringido: false,
  ...extra,
})

const stubApi = (me: () => Response) =>
  vi.stubGlobal(
    "fetch",
    vi.fn<typeof fetch>((entrada) => {
      const ruta = String(entrada)
      if (ruta === "/api/auth/refrescar") {
        return Promise.resolve(respuestaJson(200, { tokenAcceso: "token" }))
      }
      if (ruta === "/api/me") return Promise.resolve(me())
      if (ruta === "/api/auth/logout") return Promise.resolve(respuestaJson(204, undefined))
      if (ruta === "/api/salud") {
        return Promise.resolve(
          respuestaJson(200, {
            estado: "ok",
            baseDeDatos: "ok",
            marcaDeTiempo: "2026-09-27T18:00:00.000Z",
          }),
        )
      }
      return Promise.resolve(errorJson(500, "ERROR_INTERNO"))
    }),
  )

const renderEn = async (ruta: string) => {
  const { rutas } = await import("./router")
  const router = createMemoryRouter(rutas, { initialEntries: [ruta] })
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
  return router
}

beforeAll(async () => {
  await import("./router")
}, 60_000)

beforeEach(() => {
  vi.resetModules()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

const sinSesion = () => errorJson(401, "NO_AUTENTICADO")

const esperarPantalla = async (ruta: string) => {
  if (ruta === "/diagnostico") {
    await screen.findByRole("heading", { name: "Diagnóstico de conexión" })
    return
  }
  if (ruta === "/restablecer" || ruta === "/establecer-contrasena") {
    await screen.findByRole("alert")
    return
  }
  const espera: Record<string, string> = {
    "/login": "Iniciar sesión",
    "/registro": "Crear cuenta",
    "/recuperar": "Enviar enlace",
    "/cambiar-contrasena": "Guardar y continuar",
    "/acceso-restringido": "Cerrar sesión",
    "/estudiante": "Cerrar sesión",
    "/maestro": "Cerrar sesión",
    "/admin": "Cerrar sesión",
  }
  const nombre = espera[ruta]
  if (nombre === undefined) throw new Error(`sin espera configurada para ${ruta}`)
  await screen.findByRole("button", { name: nombre })
}

describe("marco: el pie aparece en las 11 pantallas, con exactamente un contentinfo", () => {
  it.each([
    { ruta: "/login", me: sinSesion },
    { ruta: "/registro", me: sinSesion },
    { ruta: "/recuperar", me: sinSesion },
    { ruta: "/restablecer", me: sinSesion },
    { ruta: "/establecer-contrasena", me: sinSesion },
    { ruta: "/diagnostico", me: sinSesion },
    { ruta: "/cambiar-contrasena", me: () => errorJson(403, "CAMBIO_DE_CONTRASENA_REQUERIDO") },
    {
      ruta: "/acceso-restringido",
      me: () => respuestaJson(200, meDe({ accesoRestringido: true })),
    },
    { ruta: "/estudiante", me: () => respuestaJson(200, meDe({})) },
    { ruta: "/maestro", me: () => respuestaJson(200, meDe({ rol: "maestro" })) },
    {
      ruta: "/admin",
      me: () => respuestaJson(200, meDe({ rol: "admin", nombre: "Administración" })),
    },
  ])("$ruta", async ({ ruta, me }) => {
    stubApi(me)
    await renderEn(ruta)
    await esperarPantalla(ruta)

    const pies = screen.getAllByRole("contentinfo")
    expect(pies).toHaveLength(1)
    expect(pies[0]).toHaveTextContent(`© ${new Date().getFullYear()} Colegio Mexicano`)
  })
})

describe("marco: composición del login", () => {
  it("un solo heading 'CMEP Campus Digital'; lista de anuncios enfocable con nombre; un h3 por anuncio", async () => {
    stubApi(sinSesion)
    await renderEn("/login")
    await screen.findByRole("button", { name: "Iniciar sesión" })

    expect(screen.getAllByRole("heading", { name: "CMEP Campus Digital" })).toHaveLength(1)

    const lista = screen.getByRole("list", { name: "Avisos del colegio" })
    expect(lista).toHaveAttribute("tabindex", "0")

    const anuncios = screen.getAllByRole("heading", { level: 3 })
    expect(anuncios.length).toBeGreaterThan(0)
  })
})

// CLASES-02d (PR-2D02): la lista de clases de la barra se refresca con lo que ya invalida
// features/clases; al unirse a una clase con el código, la clase nueva aparece en la barra.
describe("marco: lista de clases de la barra", () => {
  const ID_BIOLOGIA = "2a2b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d02"

  it("PR-2D02: al unirse a una clase con su código, la barra del estudiante muestra la clase nueva y la marca como activa", async () => {
    let clases: unknown[] = []
    const peticiones: string[] = []
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>((entrada, init) => {
        const ruta = String(entrada)
        peticiones.push(`${init?.method ?? "GET"} ${ruta}`)
        if (ruta === "/api/auth/refrescar") {
          return Promise.resolve(respuestaJson(200, { tokenAcceso: "token" }))
        }
        if (ruta === "/api/me") return Promise.resolve(respuestaJson(200, meDe({})))
        if (ruta.startsWith("/api/clases/inscritas")) {
          return Promise.resolve(
            respuestaJson(200, { clases, total: clases.length, siguienteCursor: null }),
          )
        }
        if (ruta === "/api/clases/unirse") {
          clases = [
            {
              id: ID_BIOLOGIA,
              nombre: "Biología",
              maestro: { nombre: "Dra. Márquez" },
              maestros: [{ nombre: "Dra. Márquez" }],
            },
          ]
          return Promise.resolve(
            respuestaJson(200, {
              clase: { id: ID_BIOLOGIA, nombre: "Biología" },
              yaEstabas: false,
            }),
          )
        }
        return Promise.resolve(errorJson(500, "ERROR_INTERNO"))
      }),
    )
    await renderEn("/estudiante")
    await esperarPantalla("/estudiante")
    const navegacion = screen.getByRole("navigation", { name: "Navegación principal" })
    expect(within(navegacion).queryByRole("list", { name: "Mis clases" })).toBeNull()

    fireEvent.change(await screen.findByLabelText("Código de la clase"), {
      target: { value: "ABCDEFG" },
    })
    fireEvent.click(screen.getByRole("button", { name: "Unirme a la clase" }))

    const enlace = await within(navegacion).findByRole("link", { name: "Biología" })
    expect(enlace).toHaveAttribute("href", `/estudiante/clases/${ID_BIOLOGIA}`)
    await waitFor(() => expect(enlace).toHaveAttribute("aria-current", "page"))
    // La barra pidió su lista con limite=100 y no la repitió al navegar a la clase nueva.
    const delaBarra = peticiones.filter((p) => p === "GET /api/clases/inscritas?limite=100")
    expect(delaBarra).toHaveLength(2)
  })
})

// CLASES-02d, O-14 (DESIGN.md §7.14): ConClaseDeLaRuta no usa key, así que el muro reutiliza su
// instancia al pasar de una clase a otra (por ejemplo, con «Atrás» del navegador). Si el foco estaba
// en una publicación de la clase anterior, va al encabezado de la lista de la nueva, nunca a <body>
// ni a una publicación al azar de la nueva.
describe("marco: el foco del muro al cambiar de clase", () => {
  const ID_A = "2a2b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d01"
  const ID_B = "2a2b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d02"
  const publicacionDe = (n: number) => ({
    id: `5a5b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d${String(10 + n)}`,
    tipo: "anuncio",
    titulo: null,
    texto: `Texto de la publicación ${String(n)}`,
    autor: {
      id: "3a3b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d09",
      nombre: "Luis Pérez",
      administracion: false,
    },
    creadoEn: "2026-09-29T15:30:00.000Z",
    comentarios: 0,
    adjuntos: [],
    puedeBorrar: false,
  })

  const stubDeDosClases = () =>
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>((entrada) => {
        const ruta = String(entrada)
        if (ruta === "/api/auth/refrescar") {
          return Promise.resolve(respuestaJson(200, { tokenAcceso: "token" }))
        }
        if (ruta === "/api/me") return Promise.resolve(respuestaJson(200, meDe({})))
        if (ruta.startsWith("/api/clases/inscritas")) {
          return Promise.resolve(
            respuestaJson(200, { clases: [], total: 0, siguienteCursor: null }),
          )
        }
        for (const [id, base] of [
          [ID_A, 1],
          [ID_B, 5],
        ] as const) {
          if (ruta.startsWith(`/api/clases/${id}/publicaciones`)) {
            return Promise.resolve(
              respuestaJson(200, {
                publicaciones: [base, base + 1, base + 2].map(publicacionDe),
                siguienteCursor: null,
              }),
            )
          }
          if (ruta === `/api/clases/${id}`) {
            const maestro = { id: "3a3b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d09", nombre: "Luis Pérez" }
            return Promise.resolve(
              respuestaJson(200, {
                clase: {
                  id,
                  nombre: id === ID_A ? "Álgebra I" : "Biología",
                  descripcion: "Curso",
                  maestro,
                  maestros: [maestro],
                },
              }),
            )
          }
        }
        return Promise.resolve(errorJson(500, "ERROR_INTERNO"))
      }),
    )

  // La clase nueva ya está en la caché (se visitó antes): el detalle no se vuelve a cargar, ClaseLayout
  // no desmonta el muro y la instancia de MuroDeLaClase se reutiliza. Con la clase nueva sin cargar,
  // ClaseLayout muestra «Cargando» y desmonta todo el muro: es un cambio de página, no una acción
  // en la lista, y queda fuera de este caso.
  const alCambiarDeClase = async () => {
    stubDeDosClases()
    const router = await renderEn(`/estudiante/clases/${ID_B}`)
    await screen.findByText("Texto de la publicación 5")
    await act(() => router.navigate(`/estudiante/clases/${ID_A}`))
    await screen.findByText("Texto de la publicación 1")
    const fila = document.querySelector<HTMLElement>(
      `[data-publicacion-id="5a5b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d11"]`,
    )
    expect(fila).not.toBeNull()
    fila?.focus()
    expect(fila).toHaveFocus()

    await act(() => router.navigate(`/estudiante/clases/${ID_B}`))
    await screen.findByText("Texto de la publicación 5")
  }

  it("O-14: con la clase nueva ya en la caché, el foco que estaba en una publicación de la anterior va al encabezado «Publicaciones» y no a una publicación de la nueva", async () => {
    await alCambiarDeClase()

    expect(screen.getByRole("heading", { name: "Publicaciones", level: 2 })).toHaveFocus()
    const enPublicacion = document.activeElement?.closest("[data-publicacion-id]") ?? null
    expect(enPublicacion).toBeNull()
  })
})

// CLASES-02d, O-19 (ronda 2, mismo criterio que T-08): useFilaEnFoco no olvida la fila enfocada cuando
// el navegador dispara focusout sin relatedTarget por un cambio de pestaña; sí cuando es un clic en
// blanco real.
describe("useFilaEnFoco: cambio de pestaña", () => {
  const esperar = (ms: number) =>
    act(async () => {
      await new Promise((resolver) => setTimeout(resolver, ms))
    })

  it("O-19: con la ventana sin foco, el focusout sin relatedTarget conserva la fila; un clic en blanco real la olvida", async () => {
    const leidos: (string | null)[] = []
    function Sonda() {
      const ref = useFilaEnFoco("data-fila")
      return (
        <div>
          <div data-fila="a" tabIndex={-1}>
            Fila A
          </div>
          <button type="button" onClick={() => leidos.push(ref.current)}>
            Leer
          </button>
        </div>
      )
    }
    render(<Sonda />)
    const fila = screen.getByText("Fila A")
    const leer = screen.getByRole("button", { name: "Leer" })

    // Cambio de pestaña: focusout sin relatedTarget y blur de la ventana.
    act(() => fila.focus())
    act(() => {
      fireEvent.focusOut(fila, { relatedTarget: null })
      window.dispatchEvent(new FocusEvent("blur"))
    })
    await esperar(10)
    fireEvent.click(leer)
    expect(leidos.at(-1)).toBe("a")

    // Regresa la ventana y la persona hace clic en blanco: la fila se olvida.
    act(() => {
      window.dispatchEvent(new FocusEvent("focus"))
    })
    act(() => fila.focus())
    act(() => fila.blur())
    await esperar(10)
    fireEvent.click(leer)
    expect(leidos.at(-1)).toBeNull()
  })
})

// CLASES-02d, hermano de T-08 (ronda 2): useFocoAlCargarMas con un cambio de pestaña mientras carga la
// última página.
describe("useFocoAlCargarMas: cambio de pestaña", () => {
  const esperar = (ms: number) =>
    act(async () => {
      await new Promise((resolver) => setTimeout(resolver, ms))
    })

  function ListaDePrueba({ ids, hayMas }: { ids: string[]; hayMas: boolean }) {
    const refVerMas = useFocoAlCargarMas(
      ids,
      (id) => {
        const fila = document.querySelector<HTMLElement>(`[data-id="${id}"]`)
        fila?.focus()
        return fila !== null
      },
      () => document.getElementById("encabezado")?.focus(),
    )
    return (
      <section>
        <h2 id="encabezado" tabIndex={-1}>
          Lista
        </h2>
        {ids.map((id) => (
          <div key={id} data-id={id} tabIndex={-1}>
            Fila {id}
          </div>
        ))}
        {hayMas && (
          <button ref={refVerMas} type="button">
            Cargar más
          </button>
        )}
      </section>
    )
  }

  const salirDeLaPestana = async (control: HTMLElement) => {
    act(() => {
      fireEvent.blur(control, { relatedTarget: null })
      fireEvent.focusOut(control, { relatedTarget: null })
      window.dispatchEvent(new FocusEvent("blur"))
    })
    await esperar(10)
  }

  it("«Cargar más» en vuelo, cambio de pestaña, regreso y última página cargada: el foco va a la primera fila nueva", async () => {
    const { rerender } = render(<ListaDePrueba ids={["1"]} hayMas />)
    const boton = screen.getByRole("button", { name: "Cargar más" })
    act(() => boton.focus())

    await salirDeLaPestana(boton)
    act(() => {
      window.dispatchEvent(new FocusEvent("focus"))
    })
    rerender(<ListaDePrueba ids={["1", "2"]} hayMas={false} />)
    await esperar(10)

    expect(screen.queryByRole("button", { name: "Cargar más" })).toBeNull()
    expect(screen.getByText("Fila 2")).toHaveFocus()
  })

  it("con la ventana sin foco cuando llega la última página: el foco también va a la primera fila nueva", async () => {
    const { rerender } = render(<ListaDePrueba ids={["1"]} hayMas />)
    const boton = screen.getByRole("button", { name: "Cargar más" })
    act(() => boton.focus())

    await salirDeLaPestana(boton)
    rerender(<ListaDePrueba ids={["1", "2"]} hayMas={false} />)
    await esperar(10)

    expect(screen.getByText("Fila 2")).toHaveFocus()
  })

  it("un clic en blanco real (la ventana conserva el foco) sigue olvidando la marca: el foco no se mueve", async () => {
    const { rerender } = render(<ListaDePrueba ids={["1"]} hayMas />)
    const boton = screen.getByRole("button", { name: "Cargar más" })
    act(() => boton.focus())
    act(() => boton.blur())
    await esperar(10)

    rerender(<ListaDePrueba ids={["1", "2"]} hayMas={false} />)
    await esperar(10)

    expect(document.body).toHaveFocus()
  })
})
