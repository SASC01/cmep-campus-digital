import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { MemoryRouter, Route, Routes } from "react-router"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import tokensCss from "@/styles/tokens.css?raw"
import { establecerToken, limpiarToken } from "@/services/tokenAcceso"

import { ClaseLayout } from "./clase-layout"
import { BloqueDestacado } from "./components/bloque-destacado"
import { FormularioClase } from "./components/formulario-clase"
import bloqueDestacadoFuente from "./components/bloque-destacado.tsx?raw"

// Tester, CLASES-a, ronda 4 (regresión final). T-19 en crear y editar, M-06 (texto sobre el vidrio
// azul del bloque destacado) y N-03 (los mensajes movidos a data.ts no cambian).

const aviso = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }))
vi.mock("sonner", () => ({ toast: aviso }))

const navegar = vi.hoisted(() => vi.fn())
vi.mock("react-router", async (importarOriginal) => {
  const real = await importarOriginal<typeof import("react-router")>()
  return { ...real, useNavigate: () => navegar }
})

const respuestaJson = (estado: number, cuerpo: unknown) =>
  new Response(JSON.stringify(cuerpo), {
    status: estado,
    headers: { "Content-Type": "application/json" },
  })

const errorJson = (estado: number, codigo: string, mensaje = "mensaje del servidor") =>
  respuestaJson(estado, { error: { codigo, mensaje } })

const CLASE_ID = "2a2b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d01"

const stubFetch = (manejador: (ruta: string, metodo: string) => Response | Promise<Response>) => {
  const fetchMock = vi.fn<typeof fetch>((entrada, init) =>
    Promise.resolve(manejador(String(entrada), init?.method ?? "GET")),
  )
  vi.stubGlobal("fetch", fetchMock)
  return fetchMock
}

const nuevoCliente = () => new QueryClient({ defaultOptions: { queries: { retry: false } } })

beforeEach(() => {
  establecerToken("token-de-prueba")
})

afterEach(() => {
  limpiarToken()
  vi.unstubAllGlobals()
  Reflect.deleteProperty(window.navigator, "clipboard")
  aviso.success.mockClear()
  aviso.error.mockClear()
  navegar.mockClear()
})

describe("ataque CLASES-a r4: T-19 en crear y editar", () => {
  const renderFormulario = (modo: "crear" | "editar") =>
    render(
      <QueryClientProvider client={nuevoCliente()}>
        <MemoryRouter>
          <FormularioClase
            modo={modo}
            {...(modo === "editar"
              ? {
                  claseId: CLASE_ID,
                  valoresIniciales: { nombre: "Álgebra I", descripcion: "Curso" },
                }
              : {})}
          />
        </MemoryRouter>
      </QueryClientProvider>,
    )

  const enviar = (modo: "crear" | "editar") => {
    if (modo === "crear") {
      fireEvent.change(screen.getByLabelText("Nombre de la clase"), {
        target: { value: "Historia" },
      })
    }
    fireEvent.click(
      screen.getByRole("button", { name: modo === "crear" ? "Crear clase" : "Guardar cambios" }),
    )
  }

  const rutaYMetodo = (modo: "crear" | "editar") =>
    modo === "crear" ? ["/api/clases", "POST"] : [`/api/clases/${CLASE_ID}`, "PUT"]

  for (const modo of ["crear", "editar"] as const) {
    for (const [caso, respuesta] of [
      ["500 ERROR_INTERNO", () => errorJson(500, "ERROR_INTERNO")],
      ["sin conexión", () => Promise.reject(new TypeError("Failed to fetch"))],
      ["403 SIN_ACCESO_A_LA_CLASE", () => errorJson(403, "SIN_ACCESO_A_LA_CLASE")],
      [
        "VALIDACION de un campo ajeno",
        () => errorJson(400, "VALIDACION", "maestroId: no permitido"),
      ],
      [
        "VALIDACION de claseId",
        () => errorJson(400, "VALIDACION", "claseId: debe ser un identificador válido"),
      ],
      [
        "VALIDACION sin campo",
        () => errorJson(400, "VALIDACION", "Los datos enviados tienen caracteres no permitidos."),
      ],
    ] as const) {
      it(`${modo}: ${caso} da un toast y ningún campo queda inválido`, async () => {
        const [ruta, metodo] = rutaYMetodo(modo)
        stubFetch((r, m) =>
          r === ruta && m === metodo ? respuesta() : errorJson(500, "ERROR_INTERNO"),
        )
        renderFormulario(modo)
        enviar(modo)

        await waitFor(() => expect(aviso.error).toHaveBeenCalledTimes(1))
        const texto = String(aviso.error.mock.calls[0]?.[0])
        expect(texto).not.toMatch(/^[a-zA-Z_]+:/)
        expect(texto).not.toContain("mensaje del servidor")
        expect(screen.getByLabelText("Nombre de la clase")).not.toHaveAttribute(
          "aria-invalid",
          "true",
        )
        expect(screen.getByLabelText("Descripción (opcional)")).not.toHaveAttribute(
          "aria-invalid",
          "true",
        )
      })
    }

    for (const campo of ["nombre", "descripcion"] as const) {
      it(`${modo}: un VALIDACION de ${campo} sigue bajo su campo, sin prefijo y sin toast`, async () => {
        const [ruta, metodo] = rutaYMetodo(modo)
        stubFetch((r, m) =>
          r === ruta && m === metodo
            ? errorJson(400, "VALIDACION", `${campo}: Texto de prueba del servidor`)
            : errorJson(500, "ERROR_INTERNO"),
        )
        renderFormulario(modo)
        enviar(modo)
        const etiqueta = campo === "nombre" ? "Nombre de la clase" : "Descripción (opcional)"
        const otra = campo === "nombre" ? "Descripción (opcional)" : "Nombre de la clase"

        await waitFor(() =>
          expect(screen.getByLabelText(etiqueta)).toHaveAttribute("aria-invalid", "true"),
        )
        expect(screen.getByLabelText(etiqueta)).toHaveAccessibleDescription(
          "Texto de prueba del servidor",
        )
        expect(screen.getByLabelText(otra)).not.toHaveAttribute("aria-invalid", "true")
        expect(aviso.error).not.toHaveBeenCalled()
      })
    }
  }
})

describe("ataque CLASES-a r4: M-06, texto sobre el vidrio azul", () => {
  // Nombres de color de los tokens (--color-*), para distinguir text-<color> de text-<tamaño>.
  const colores = new Set([...tokensCss.matchAll(/--color-([\w-]+)\s*:/g)].map((m) => m[1]))
  const colorDe = (elemento: Element): string | null => {
    const clases = (elemento.getAttribute("class") ?? "").split(/\s+/)
    const color = clases.find((c) => c.startsWith("text-") && colores.has(c.slice(5)))
    return color ?? null
  }
  const PERMITIDOS = new Set(["text-accent-foreground", "text-accent-soft-glass"])

  const textosFuera = (seccion: HTMLElement, tarjeta: HTMLElement): string[] => {
    const malos: string[] = []
    const recorrido = document.createTreeWalker(seccion, NodeFilter.SHOW_TEXT)
    for (let nodo = recorrido.nextNode(); nodo !== null; nodo = recorrido.nextNode()) {
      const padre = nodo.parentElement
      if (!padre || (nodo.textContent ?? "").trim() === "") continue
      if (tarjeta.contains(padre) || padre.closest("[role='status']")) continue
      let actual: Element | null = padre
      let color: string | null = null
      while (actual && color === null) {
        color = colorDe(actual)
        if (actual === seccion) break
        actual = actual.parentElement
      }
      if (color === null || !PERMITIDOS.has(color)) malos.push(`"${nodo.textContent}" → ${color}`)
    }
    return malos
  }

  it("precondición: los tokens de color se leyeron", () => {
    expect(colores.has("accent-foreground")).toBe(true)
    expect(colores.has("accent-soft-glass")).toBe(true)
  })

  for (const [caso, props] of [
    ["con dato", { total: 3, cargando: false, esError: false }],
    ["sin clases", { total: 0, cargando: false, esError: false }],
    ["con error", { total: undefined, cargando: false, esError: true }],
    ["cargando", { total: undefined, cargando: true, esError: false }],
  ] as const) {
    it(`${caso}: fuera de la tarjeta interna todo texto es text-accent-foreground o text-accent-soft-glass`, () => {
      render(
        <BloqueDestacado
          rol="estudiante"
          nombre="Ana López"
          errorTitular="No pudimos cargar tus clases"
          insignia="Código de clase"
          tituloTarjeta="Únete a una clase"
          {...props}
        >
          <button type="button">Acción</button>
        </BloqueDestacado>,
      )
      const tarjeta = screen.getByText("Código de clase").parentElement
      const seccion = screen.getByText("Hola, Ana López").closest("section")
      if (!tarjeta || !seccion)
        throw new Error("Precondición: no se encontró el bloque o su tarjeta")
      expect(within(tarjeta).getByRole("button", { name: "Acción" })).toBeInTheDocument()
      expect(textosFuera(seccion, tarjeta)).toEqual([])
    })
  }

  it("bloque-destacado.tsx no usa bg-accent-soft-glass en ninguna clase", () => {
    const sinComentarios = bloqueDestacadoFuente
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/\/\/.*$/gm, "")
    expect(sinComentarios).not.toMatch(/bg-accent-soft-glass/)
  })
})

describe("ataque CLASES-a r4: N-03, los mensajes no cambian", () => {
  // CLASES-02a ronda 0 (C-7): claseDetalleSchema suma maestros (1 o 2) y conserva maestro.
  const CLASE = {
    id: CLASE_ID,
    nombre: "Álgebra I",
    descripcion: "Curso",
    maestro: { id: "3a3b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d09", nombre: "Luis Pérez" },
    maestros: [{ id: "3a3b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d09", nombre: "Luis Pérez" }],
  }

  const renderClase = (ruta: string) =>
    render(
      <QueryClientProvider client={nuevoCliente()}>
        <MemoryRouter initialEntries={[ruta]}>
          <Routes>
            <Route path="/estudiante/clases/:claseId" element={<ClaseLayout />} />
            <Route path="/maestro/clases/:claseId" element={<ClaseLayout />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    )

  it("SIN_ACCESO_A_LA_CLASE y un error genérico muestran los mismos textos de siempre", async () => {
    stubFetch(() => errorJson(403, "SIN_ACCESO_A_LA_CLASE"))
    const { unmount } = renderClase(`/estudiante/clases/${CLASE_ID}`)
    expect((await screen.findByRole("alert")).textContent).toContain(
      "No tienes acceso a esta clase.",
    )
    unmount()

    stubFetch(() => errorJson(500, "ERROR_INTERNO"))
    renderClase(`/estudiante/clases/${CLASE_ID}`)
    expect((await screen.findByRole("alert")).textContent).toContain(
      "Algo salió mal. Inténtalo de nuevo.",
    )
  })

  it("un fallo del portapapeles da el mismo aviso de siempre", async () => {
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: vi.fn(() => Promise.reject(new Error("denegado"))) },
      configurable: true,
    })
    stubFetch((ruta) => {
      if (ruta === `/api/clases/${CLASE_ID}/codigo`)
        return respuestaJson(200, { codigo: "ABCDEFG" })
      if (ruta === `/api/clases/${CLASE_ID}`) return respuestaJson(200, { clase: CLASE })
      return errorJson(500, "ERROR_INTERNO")
    })
    renderClase(`/maestro/clases/${CLASE_ID}`)
    await screen.findByText("ABCDEFG")
    fireEvent.click(screen.getByRole("button", { name: "Copiar código" }))

    await waitFor(() =>
      expect(aviso.error).toHaveBeenCalledWith("No pudimos copiar el código. Cópialo a mano."),
    )
  })
})
