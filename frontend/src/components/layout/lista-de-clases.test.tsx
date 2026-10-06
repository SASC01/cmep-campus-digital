import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { useRef } from "react"
import { MemoryRouter, Route, Routes } from "react-router"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { CLAVE_CLASES_IMPARTIDAS, CLAVE_CLASES_INSCRITAS } from "@/services/clasesService"
import { establecerToken, limpiarToken } from "@/services/tokenAcceso"

import { ListaDeClases } from "./lista-de-clases"
import type { RolConClases } from "./types"

const respuestaJson = (estado: number, cuerpo: unknown) =>
  new Response(JSON.stringify(cuerpo), {
    status: estado,
    headers: { "Content-Type": "application/json" },
  })

const errorJson = (estado: number, codigo: string) =>
  respuestaJson(estado, { error: { codigo, mensaje: "mensaje del servidor" } })

const ID_A = "2a2b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d01"
const ID_B = "2a2b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d02"
const ID_C = "2a2b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d03"

const inscrita = (id: string, nombre: string) => ({
  id,
  nombre,
  maestro: { nombre: "Dra. Márquez" },
  maestros: [{ nombre: "Dra. Márquez" }],
})

const impartida = (id: string, nombre: string) => ({ id, nombre, alumnos: 3 })

const pagina = (clases: unknown[], siguienteCursor: string | null = null) => ({
  clases,
  total: clases.length,
  siguienteCursor,
})

const stubApi = (responder: (ruta: string) => Promise<Response>) => {
  const fetchMock = vi.fn<typeof fetch>((entrada) => responder(String(entrada)))
  vi.stubGlobal("fetch", fetchMock)
  return fetchMock
}

const ok = (cuerpo: unknown) => Promise.resolve(respuestaJson(200, cuerpo))

const rutasPedidas = (fetchMock: ReturnType<typeof stubApi>) =>
  fetchMock.mock.calls.map(([entrada]) => String(entrada))

// La nav que da ListaDeClases como navRef, como BarraNavegacion (T-07).
function NavDePrueba({ rol }: { rol: RolConClases }) {
  const navRef = useRef<HTMLElement>(null)
  return (
    <nav ref={navRef} aria-label="Navegación principal">
      <a href={`/${rol}`}>Inicio</a>
      <ListaDeClases rol={rol} navRef={navRef} />
    </nav>
  )
}

const renderLista = (rol: RolConClases, ruta = `/${rol}`) => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[ruta]}>
        <Routes>
          <Route path="*" element={<NavDePrueba rol={rol} />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
  return { queryClient }
}

beforeEach(() => {
  establecerToken("token-de-prueba")
})

afterEach(() => {
  cleanup()
  limpiarToken()
  vi.unstubAllGlobals()
})

describe("ListaDeClases", () => {
  it("PR-2D01: cada clase es un enlace con el nombre completo como nombre accesible, su title y una insignia con iniciales aria-hidden", async () => {
    stubApi(() =>
      ok(pagina([inscrita(ID_A, "Derecho Penal I"), inscrita(ID_B, "Derecho Penal II")])),
    )
    renderLista("estudiante")

    const lista = await screen.findByRole("list", { name: "Mis clases" })
    const enlaceA = within(lista).getByRole("link", { name: "Derecho Penal I" })
    expect(enlaceA).toHaveAttribute("href", `/estudiante/clases/${ID_A}`)
    expect(enlaceA).toHaveAttribute("title", "Derecho Penal I")
    const insignia = enlaceA.querySelector('[aria-hidden="true"]')
    expect(insignia).not.toBeNull()
    expect(insignia?.textContent).toBe("DP")
    expect(within(lista).getByRole("link", { name: "Derecho Penal II" })).toHaveAttribute(
      "href",
      `/estudiante/clases/${ID_B}`,
    )
  })

  it("PR-2D01: un nombre de 120 caracteres sin espacios y uno con emojis conservan su nombre completo accesible", async () => {
    const largo = "A".repeat(120)
    const conEmoji = "\u{1F9EA}\u{1F9EA} Química"
    stubApi(() => ok(pagina([inscrita(ID_A, largo), inscrita(ID_B, conEmoji)])))
    renderLista("estudiante")

    const enlaceLargo = await screen.findByRole("link", { name: largo })
    expect(enlaceLargo).toHaveAttribute("title", largo)
    expect(screen.getByRole("link", { name: conEmoji })).toHaveAttribute("title", conEmoji)
  })

  it("PR-2D01: con una sola clase hay un solo enlace", async () => {
    stubApi(() => ok(pagina([inscrita(ID_A, "Álgebra I")])))
    renderLista("estudiante")

    const lista = await screen.findByRole("list", { name: "Mis clases" })
    expect(within(lista).getAllByRole("link")).toHaveLength(1)
  })

  it("PR-2D01: sin clases no hay ni título, ni lista, ni status (el inicio ya tiene su vacío)", async () => {
    stubApi(() => ok(pagina([])))
    const { queryClient } = renderLista("estudiante")

    await waitFor(() => expect(queryClient.isFetching()).toBe(0))
    expect(screen.queryByRole("list", { name: "Mis clases" })).toBeNull()
    expect(screen.queryByText("Mis clases")).toBeNull()
    expect(screen.queryByRole("status")).toBeNull()
    expect(screen.queryByRole("button")).toBeNull()
  })

  it("PR-2D01: con 15 clases las muestra todas, con desplazamiento propio en la lista", async () => {
    const quince = Array.from({ length: 15 }, (_, n) =>
      inscrita(`2a2b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5e${String(10 + n)}`, `Clase ${String(n + 1)}`),
    )
    stubApi(() => ok(pagina(quince)))
    renderLista("estudiante")

    const lista = await screen.findByRole("list", { name: "Mis clases" })
    expect(within(lista).getAllByRole("link")).toHaveLength(15)
    expect(lista.className).toContain("overflow-y-auto")
    expect(lista.className).toContain("min-h-0")
    expect(lista.className).toContain("sin-sombra-de-vidrio")
    expect(within(lista).queryByRole("link", { name: "Ver todas" })).toBeNull()
  })

  it("PR-2D01: aria-current=page solo en la clase abierta, también en sus subpáginas", async () => {
    stubApi(() => ok(pagina([inscrita(ID_A, "Álgebra I"), inscrita(ID_B, "Biología")])))
    renderLista("estudiante", `/estudiante/clases/${ID_B}/personas`)

    const lista = await screen.findByRole("list", { name: "Mis clases" })
    const enlaces = within(lista).getAllByRole("link")
    const activos = enlaces.filter((enlace) => enlace.getAttribute("aria-current") === "page")
    expect(activos.map((enlace) => enlace.getAttribute("title"))).toEqual(["Biología"])
  })

  it("PR-2D01: en el inicio ninguna clase queda activa", async () => {
    stubApi(() => ok(pagina([inscrita(ID_A, "Álgebra I")])))
    renderLista("estudiante", "/estudiante")

    const lista = await screen.findByRole("list", { name: "Mis clases" })
    expect(within(lista).getByRole("link", { name: "Álgebra I" })).not.toHaveAttribute(
      "aria-current",
    )
  })

  it("PR-2D01: el maestro ve sus clases impartidas con enlaces a /maestro/clases/:id", async () => {
    const fetchMock = stubApi(() => ok(pagina([impartida(ID_C, "Contratos")])))
    renderLista("maestro")

    const enlace = await screen.findByRole("link", { name: "Contratos" })
    expect(enlace).toHaveAttribute("href", `/maestro/clases/${ID_C}`)
    expect(rutasPedidas(fetchMock)).toEqual(["/api/clases/impartidas?limite=100"])
  })

  it("PR-2D01: con más de 100 clases, el último elemento es «Ver todas» hacia el inicio del rol", async () => {
    stubApi(() => ok(pagina([inscrita(ID_A, "Álgebra I")], ID_B)))
    renderLista("estudiante")

    const lista = await screen.findByRole("list", { name: "Mis clases" })
    const ultimo = within(lista).getAllByRole("link").at(-1)
    expect(ultimo).toHaveTextContent("Ver todas")
    expect(ultimo).toHaveAttribute("href", "/estudiante")
    expect(ultimo).not.toHaveAttribute("aria-current")
  })

  it("PR-2D01: mientras carga solo hay un status accesible «Cargando tus clases»", async () => {
    stubApi(() => new Promise<Response>(() => undefined))
    renderLista("estudiante")

    const estado = await screen.findByRole("status")
    expect(estado).toHaveTextContent("Cargando tus clases")
    expect(estado.className).toContain("sr-only")
    expect(screen.queryByRole("list", { name: "Mis clases" })).toBeNull()
  })

  it("PR-2D01: con error, «Reintentar» (con el aviso sr-only) vuelve a pedir la lista y queda en enEspera mientras pide", async () => {
    let intento = 0
    let liberar: (respuesta: Response) => void = () => undefined
    stubApi(() => {
      intento += 1
      if (intento === 1) return Promise.resolve(errorJson(500, "ERROR_INTERNO"))
      return new Promise<Response>((resolver) => {
        liberar = resolver
      })
    })
    renderLista("estudiante")

    const boton = await screen.findByRole("button", {
      name: "No pudimos cargar tus clases. Reintentar",
    })
    expect(boton).toHaveTextContent("Reintentar")
    boton.focus()
    fireEvent.click(boton)

    await waitFor(() =>
      expect(screen.getByRole("button", { name: /Reintentar/ })).toHaveAttribute(
        "aria-busy",
        "true",
      ),
    )
    expect(screen.getByRole("button", { name: /Reintentar/ })).not.toBeDisabled()
    // El botón sigue montado: el foco no cae en <body> (DESIGN.md §7.14).
    expect(screen.getByRole("button", { name: /Reintentar/ })).toHaveFocus()
    // Un segundo clic con la petición en vuelo no pide otra vez.
    fireEvent.click(screen.getByRole("button", { name: /Reintentar/ }))
    expect(intento).toBe(2)

    await act(async () => {
      liberar(respuestaJson(200, pagina([inscrita(ID_A, "Álgebra I")])))
      await Promise.resolve()
    })
    expect(await screen.findByRole("link", { name: "Álgebra I" })).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /Reintentar/ })).toBeNull()
  })

  it("PR-2D01: una recarga fallida con datos conserva la lista que ya se veía", async () => {
    let fallar = false
    stubApi(() => {
      if (fallar) return Promise.resolve(errorJson(500, "ERROR_INTERNO"))
      return ok(pagina([inscrita(ID_A, "Álgebra I")]))
    })
    const { queryClient } = renderLista("estudiante")
    await screen.findByRole("link", { name: "Álgebra I" })

    fallar = true
    await act(async () => {
      await queryClient.invalidateQueries({ queryKey: CLAVE_CLASES_INSCRITAS })
    })

    expect(screen.getByRole("link", { name: "Álgebra I" })).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /Reintentar/ })).toBeNull()
  })

  it("PR-2D02: pide limite=100 a inscritas, y una invalidación de CLAVE_CLASES_INSCRITAS la alcanza por prefijo", async () => {
    let clases = [inscrita(ID_A, "Álgebra I")]
    const fetchMock = stubApi(() => ok(pagina(clases)))
    const { queryClient } = renderLista("estudiante")
    await screen.findByRole("link", { name: "Álgebra I" })
    expect(rutasPedidas(fetchMock)).toEqual(["/api/clases/inscritas?limite=100"])

    clases = [inscrita(ID_A, "Álgebra I"), inscrita(ID_B, "Biología")]
    await act(async () => {
      await queryClient.invalidateQueries({ queryKey: CLAVE_CLASES_INSCRITAS })
    })

    expect(await screen.findByRole("link", { name: "Biología" })).toBeInTheDocument()
    expect(rutasPedidas(fetchMock)).toHaveLength(2)
  })

  it("PR-2D02: la del maestro cuelga de CLAVE_CLASES_IMPARTIDAS (alta y baja de alumnos la invalidan)", async () => {
    let clases = [impartida(ID_C, "Contratos")]
    stubApi(() => ok(pagina(clases)))
    const { queryClient } = renderLista("maestro")
    await screen.findByRole("link", { name: "Contratos" })

    clases = [impartida(ID_C, "Contratos II")]
    await act(async () => {
      await queryClient.invalidateQueries({ queryKey: CLAVE_CLASES_IMPARTIDAS })
    })

    expect(await screen.findByRole("link", { name: "Contratos II" })).toBeInTheDocument()
  })

  it("PR-2D02: la clave de la barra no pisa la de las listas infinitas del inicio", async () => {
    stubApi(() => ok(pagina([inscrita(ID_A, "Álgebra I")])))
    const { queryClient } = renderLista("estudiante")
    await screen.findByRole("link", { name: "Álgebra I" })

    expect(queryClient.getQueryData([...CLAVE_CLASES_INSCRITAS, "barra"])).toBeDefined()
    expect(queryClient.getQueryData(CLAVE_CLASES_INSCRITAS)).toBeUndefined()
  })

  it("PR-2D03: la lista y su contenedor llevan hidden md:flex, así que no están en la barra inferior de móvil", async () => {
    stubApi(() => ok(pagina([inscrita(ID_A, "Álgebra I")])))
    renderLista("estudiante")

    const lista = await screen.findByRole("list", { name: "Mis clases" })
    expect(lista.className).toContain("hidden")
    expect(lista.className).toContain("md:flex")
    expect(lista.parentElement?.className).toContain("hidden")
    expect(lista.parentElement?.className).toContain("md:flex")
  })
})

// CLASES-02d, T-07 (ronda 1, DESIGN.md §7.14): cuando el control de la lista que tiene el foco
// desaparece, el foco queda dentro de la nav y nunca en <body>.
describe("ListaDeClases: el foco cuando desaparece el control enfocado", () => {
  const esperar = (ms: number) =>
    act(async () => {
      await new Promise((resolver) => setTimeout(resolver, ms))
    })

  const conErrorInicial = () => {
    let respuesta: () => Promise<Response> = () => Promise.resolve(errorJson(500, "ERROR_INTERNO"))
    stubApi(() => respuesta())
    return {
      luego: (nueva: () => Promise<Response>) => {
        respuesta = nueva
      },
    }
  }

  const enfocarReintentar = async () => {
    const boton = await screen.findByRole("button", { name: /Reintentar/ })
    act(() => boton.focus())
    expect(boton).toHaveFocus()
    return boton
  }

  it("T-07: el reintento que trae clases deja el foco en el primer enlace de la lista", async () => {
    const { luego } = conErrorInicial()
    renderLista("estudiante")
    const boton = await enfocarReintentar()
    luego(() => ok(pagina([inscrita(ID_A, "Álgebra I"), inscrita(ID_B, "Biología")])))

    fireEvent.click(boton)

    const lista = await screen.findByRole("list", { name: "Mis clases" })
    await esperar(10)
    expect(within(lista).getByRole("link", { name: "Álgebra I" })).toHaveFocus()
  })

  it("T-07: el reintento que trae 0 clases deja el foco en «Inicio» de la nav", async () => {
    const { luego } = conErrorInicial()
    renderLista("estudiante")
    const boton = await enfocarReintentar()
    luego(() => ok(pagina([])))

    fireEvent.click(boton)

    await waitFor(() => expect(boton.isConnected).toBe(false))
    await esperar(10)
    expect(screen.getByRole("link", { name: "Inicio" })).toHaveFocus()
  })

  it("T-07: el reintento que trae más de 100 clases (con «Ver todas») deja el foco en el primer enlace de la lista", async () => {
    const { luego } = conErrorInicial()
    renderLista("maestro")
    const boton = await enfocarReintentar()
    luego(() => ok(pagina([impartida(ID_C, "Contratos")], ID_A)))

    fireEvent.click(boton)

    const lista = await screen.findByRole("list", { name: "Mis clases" })
    await esperar(10)
    expect(within(lista).getByRole("link", { name: "Contratos" })).toHaveFocus()
    expect(within(lista).getByRole("link", { name: "Ver todas" })).toBeInTheDocument()
  })

  it("T-07: el reintento que vuelve a fallar conserva el mismo botón, sin espera y con el foco", async () => {
    const { luego } = conErrorInicial()
    renderLista("estudiante")
    const boton = await enfocarReintentar()
    luego(() => Promise.resolve(errorJson(500, "ERROR_INTERNO")))

    fireEvent.click(boton)
    await waitFor(() => expect(boton).not.toHaveAttribute("aria-busy", "true"))

    expect(boton.isConnected).toBe(true)
    expect(boton).toHaveFocus()
  })

  it("T-07: si «Reintentar» desaparece porque la consulta se resolvió por otra vía (invalidación), el foco también queda dentro de la nav", async () => {
    const { luego } = conErrorInicial()
    const { queryClient } = renderLista("estudiante")
    await enfocarReintentar()
    luego(() => ok(pagina([inscrita(ID_A, "Álgebra I")])))

    await act(async () => {
      await queryClient.invalidateQueries({ queryKey: CLAVE_CLASES_INSCRITAS })
    })

    expect(await screen.findByRole("link", { name: "Álgebra I" })).toHaveFocus()
  })

  it("T-07: si la clase enfocada sale de la lista tras una recarga, el foco va al primer enlace que queda", async () => {
    let clases = [inscrita(ID_A, "Álgebra I"), inscrita(ID_B, "Biología")]
    stubApi(() => ok(pagina(clases)))
    const { queryClient } = renderLista("estudiante")
    const enlace = await screen.findByRole("link", { name: "Biología" })
    act(() => enlace.focus())

    clases = [inscrita(ID_A, "Álgebra I")]
    await act(async () => {
      await queryClient.invalidateQueries({ queryKey: CLAVE_CLASES_INSCRITAS })
    })

    await waitFor(() => expect(screen.queryByRole("link", { name: "Biología" })).toBeNull())
    expect(screen.getByRole("link", { name: "Álgebra I" })).toHaveFocus()
  })

  it("T-07: si «Ver todas» enfocado desaparece (ya caben todas), el foco va al primer enlace de la lista", async () => {
    let cursor: string | null = ID_B
    stubApi(() => ok(pagina([inscrita(ID_A, "Álgebra I")], cursor)))
    const { queryClient } = renderLista("estudiante")
    const verTodas = await screen.findByRole("link", { name: "Ver todas" })
    act(() => verTodas.focus())

    cursor = null
    await act(async () => {
      await queryClient.invalidateQueries({ queryKey: CLAVE_CLASES_INSCRITAS })
    })

    await waitFor(() => expect(screen.queryByRole("link", { name: "Ver todas" })).toBeNull())
    expect(screen.getByRole("link", { name: "Álgebra I" })).toHaveFocus()
  })

  it("T-07: si el foco estaba fuera de la lista, un cambio de la lista no lo mueve", async () => {
    let clases = [inscrita(ID_A, "Álgebra I")]
    stubApi(() => ok(pagina(clases)))
    const { queryClient } = renderLista("estudiante")
    await screen.findByRole("link", { name: "Álgebra I" })
    const inicio = screen.getByRole("link", { name: "Inicio" })
    act(() => inicio.focus())

    clases = [inscrita(ID_B, "Biología")]
    await act(async () => {
      await queryClient.invalidateQueries({ queryKey: CLAVE_CLASES_INSCRITAS })
    })

    expect(await screen.findByRole("link", { name: "Biología" })).toBeInTheDocument()
    expect(inicio).toHaveFocus()
  })

  it("T-07: si la persona sacó el foco a ningún elemento (clic en blanco), el cambio de la lista no se lo devuelve", async () => {
    let clases = [inscrita(ID_A, "Álgebra I"), inscrita(ID_B, "Biología")]
    stubApi(() => ok(pagina(clases)))
    const { queryClient } = renderLista("estudiante")
    const enlace = await screen.findByRole("link", { name: "Biología" })
    act(() => enlace.focus())
    act(() => enlace.blur())

    clases = [inscrita(ID_A, "Álgebra I")]
    await act(async () => {
      await queryClient.invalidateQueries({ queryKey: CLAVE_CLASES_INSCRITAS })
    })

    await waitFor(() => expect(screen.queryByRole("link", { name: "Biología" })).toBeNull())
    expect(document.body).toHaveFocus()
  })
})

// CLASES-02d, T-08 (ronda 2): al cambiar de pestaña o de aplicación, el navegador dispara focusout sin
// relatedTarget sobre el control (que sigue montado y enfocado) y la ventana pierde el foco justo
// después. No es un clic en blanco: la memoria del foco se conserva.
describe("ListaDeClases: cambio de pestaña con el foco en la lista", () => {
  const esperar = (ms: number) =>
    act(async () => {
      await new Promise((resolver) => setTimeout(resolver, ms))
    })

  const salirDeLaPestana = async (control: HTMLElement) => {
    act(() => {
      fireEvent.blur(control, { relatedTarget: null })
      fireEvent.focusOut(control, { relatedTarget: null })
      window.dispatchEvent(new FocusEvent("blur"))
    })
    await esperar(10)
  }

  const volverALaPestana = async () => {
    act(() => {
      window.dispatchEvent(new FocusEvent("focus"))
    })
    await esperar(10)
  }

  const conErrorInicial = () => {
    let respuesta: () => Promise<Response> = () => Promise.resolve(errorJson(500, "ERROR_INTERNO"))
    stubApi(() => respuesta())
    return {
      luego: (nueva: () => Promise<Response>) => {
        respuesta = nueva
      },
    }
  }

  it("T-08: con «Reintentar» en vuelo, un cambio de pestaña y la lista que llega mientras tanto: el foco va al primer enlace", async () => {
    const { luego } = conErrorInicial()
    renderLista("estudiante")
    const boton = await screen.findByRole("button", { name: /Reintentar/ })
    act(() => boton.focus())
    let liberar: (respuesta: Response) => void = () => undefined
    luego(
      () =>
        new Promise<Response>((resolver) => {
          liberar = resolver
        }),
    )
    fireEvent.click(boton)
    await waitFor(() => expect(boton).toHaveAttribute("aria-busy", "true"))

    await salirDeLaPestana(boton)
    expect(boton).toHaveFocus()
    await act(async () => {
      liberar(respuestaJson(200, pagina([inscrita(ID_A, "Álgebra I")])))
      await Promise.resolve()
    })
    await screen.findByRole("link", { name: "Álgebra I" })
    await volverALaPestana()

    expect(screen.getByRole("link", { name: "Álgebra I" })).toHaveFocus()
  })

  it("T-08: cambio de pestaña y regreso con el botón aún montado: el foco sigue en el botón", async () => {
    const { luego } = conErrorInicial()
    renderLista("estudiante")
    const boton = await screen.findByRole("button", { name: /Reintentar/ })
    act(() => boton.focus())
    luego(() => Promise.resolve(errorJson(500, "ERROR_INTERNO")))

    await salirDeLaPestana(boton)
    await volverALaPestana()

    expect(boton.isConnected).toBe(true)
    expect(boton).toHaveFocus()
  })

  it("T-08: dos cambios de pestaña seguidos conservan la memoria, y al llegar el reintento sin clases el foco va a «Inicio»", async () => {
    const { luego } = conErrorInicial()
    const { queryClient } = renderLista("estudiante")
    const boton = await screen.findByRole("button", { name: /Reintentar/ })
    act(() => boton.focus())

    await salirDeLaPestana(boton)
    await volverALaPestana()
    await salirDeLaPestana(boton)
    luego(() => ok(pagina([])))
    await act(async () => {
      await queryClient.invalidateQueries({ queryKey: CLAVE_CLASES_INSCRITAS })
    })
    await waitFor(() => expect(boton.isConnected).toBe(false))
    await volverALaPestana()

    expect(screen.getByRole("link", { name: "Inicio" })).toHaveFocus()
  })

  it("T-08: visibilitychange (pestaña oculta) también conserva la memoria", async () => {
    const { luego } = conErrorInicial()
    const { queryClient } = renderLista("estudiante")
    const boton = await screen.findByRole("button", { name: /Reintentar/ })
    act(() => boton.focus())
    const oculta = vi.spyOn(document, "hidden", "get").mockReturnValue(true)

    act(() => {
      fireEvent.focusOut(boton, { relatedTarget: null })
      document.dispatchEvent(new Event("visibilitychange"))
    })
    await esperar(10)
    luego(() => ok(pagina([inscrita(ID_A, "Álgebra I")])))
    await act(async () => {
      await queryClient.invalidateQueries({ queryKey: CLAVE_CLASES_INSCRITAS })
    })
    oculta.mockReturnValue(false)
    act(() => {
      document.dispatchEvent(new Event("visibilitychange"))
    })
    await esperar(10)

    expect(await screen.findByRole("link", { name: "Álgebra I" })).toHaveFocus()
    oculta.mockRestore()
  })

  it("T-08: cambio de pestaña con una clase enfocada que sale de la lista: el foco va al primer enlace que queda", async () => {
    let clases = [inscrita(ID_A, "Álgebra I"), inscrita(ID_B, "Biología")]
    stubApi(() => ok(pagina(clases)))
    const { queryClient } = renderLista("estudiante")
    const enlace = await screen.findByRole("link", { name: "Biología" })
    act(() => enlace.focus())

    await salirDeLaPestana(enlace)
    clases = [inscrita(ID_A, "Álgebra I")]
    await act(async () => {
      await queryClient.invalidateQueries({ queryKey: CLAVE_CLASES_INSCRITAS })
    })
    await volverALaPestana()

    expect(screen.getByRole("link", { name: "Álgebra I" })).toHaveFocus()
  })

  it("T-08: cambio de pestaña con «Ver todas» enfocado que desaparece: el foco va al primer enlace de la lista", async () => {
    let cursor: string | null = ID_B
    stubApi(() => ok(pagina([inscrita(ID_A, "Álgebra I")], cursor)))
    const { queryClient } = renderLista("estudiante")
    const verTodas = await screen.findByRole("link", { name: "Ver todas" })
    act(() => verTodas.focus())

    await salirDeLaPestana(verTodas)
    cursor = null
    await act(async () => {
      await queryClient.invalidateQueries({ queryKey: CLAVE_CLASES_INSCRITAS })
    })
    await volverALaPestana()

    expect(screen.getByRole("link", { name: "Álgebra I" })).toHaveFocus()
  })

  it("T-08: cambio de pestaña con la lista que pasa a 0 clases: el foco va a «Inicio»", async () => {
    let clases = [inscrita(ID_A, "Álgebra I")]
    stubApi(() => ok(pagina(clases)))
    const { queryClient } = renderLista("estudiante")
    const enlace = await screen.findByRole("link", { name: "Álgebra I" })
    act(() => enlace.focus())

    await salirDeLaPestana(enlace)
    clases = []
    await act(async () => {
      await queryClient.invalidateQueries({ queryKey: CLAVE_CLASES_INSCRITAS })
    })
    await volverALaPestana()

    expect(screen.getByRole("link", { name: "Inicio" })).toHaveFocus()
  })

  it("T-08: un clic en blanco real (la ventana conserva el foco) sigue olvidando la memoria", async () => {
    let clases = [inscrita(ID_A, "Álgebra I"), inscrita(ID_B, "Biología")]
    stubApi(() => ok(pagina(clases)))
    const { queryClient } = renderLista("estudiante")
    const enlace = await screen.findByRole("link", { name: "Biología" })
    act(() => enlace.focus())
    act(() => enlace.blur())
    await esperar(10)

    clases = [inscrita(ID_A, "Álgebra I")]
    await act(async () => {
      await queryClient.invalidateQueries({ queryKey: CLAVE_CLASES_INSCRITAS })
    })

    await waitFor(() => expect(screen.queryByRole("link", { name: "Biología" })).toBeNull())
    expect(document.body).toHaveFocus()
  })

  it("T-08: un focusout con relatedTarget fuera de la nav deja el foco donde la persona lo puso", async () => {
    let clases = [inscrita(ID_A, "Álgebra I"), inscrita(ID_B, "Biología")]
    stubApi(() => ok(pagina(clases)))
    const { queryClient } = renderLista("estudiante")
    const enlace = await screen.findByRole("link", { name: "Biología" })
    act(() => enlace.focus())
    const fuera = document.createElement("button")
    document.body.appendChild(fuera)
    act(() => fuera.focus())

    clases = [inscrita(ID_A, "Álgebra I")]
    await act(async () => {
      await queryClient.invalidateQueries({ queryKey: CLAVE_CLASES_INSCRITAS })
    })

    await waitFor(() => expect(screen.queryByRole("link", { name: "Biología" })).toBeNull())
    expect(fuera).toHaveFocus()
    fuera.remove()
  })
})
