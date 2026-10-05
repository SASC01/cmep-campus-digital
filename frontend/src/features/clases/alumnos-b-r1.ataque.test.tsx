import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { MemoryRouter, Route, Routes } from "react-router"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { establecerToken, limpiarToken } from "@/services/tokenAcceso"

import { AlumnosView } from "./alumnos-view"
import { FormularioUnirseClase } from "./components/formulario-unirse-clase"
import { terminoDeBusquedaValido } from "./lib"
import { PersonasView } from "./personas-view"

// Ataque del Tester (CLASES-b, ronda 1): una petición por término y sin carreras en el buscador,
// carreras entre el buscador y el roster, doble clic, foco después de "Sí, quitar", vistas que no
// pintan datos de pago aunque la API los mandara, y N-04 con ACCESO_RESTRINGIDO (plan de CLASES-01,
// "Puntos de ataque" b, §D-B4, §D-B4 bis, DESIGN.md §7.14 y §7.17). Sin selectores de clase.

const aviso = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }))
// CLASES-b corrección ronda 1 (C-17): el doble de sonner pasa a ser invocable por D-4 (aviso neutro
// con yaEstaba); el caso sigue protegiendo lo mismo. success y error son las mismas referencias.
vi.mock("sonner", () => ({ toast: Object.assign(vi.fn(), aviso) }))

const navegacion = vi.hoisted(() => ({ irA: vi.fn(), rutaActual: vi.fn(() => "/estudiante") }))
vi.mock("@/services/navegacion", () => navegacion)

const CLASE_ID = "2a2b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d01"
const idDe = (n: number) => `6a6b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d${String(10 + n)}`

const respuestaJson = (estado: number, cuerpo: unknown) =>
  new Response(JSON.stringify(cuerpo), {
    status: estado,
    headers: { "Content-Type": "application/json" },
  })

interface Persona {
  id: string
  nombre: string
}

// Servidor en memoria: las inscripciones cambian con POST y DELETE, y el roster y el buscador se
// calculan a partir de ellas en cada petición (como la API real).
const crearServidor = (personas: Persona[], inscritos: string[]) => {
  const estado = { inscritos: new Set(inscritos) }
  const demoras = new Map<string, Promise<void>>()
  const fetchMock = vi.fn<typeof fetch>(async (entrada, init) => {
    const ruta = String(entrada)
    const metodo = init?.method ?? "GET"
    const base = `/api/clases/${CLASE_ID}/alumnos`
    if (ruta.startsWith(`${base}/candidatos`)) {
      const q = new URL(ruta, "http://x").searchParams.get("q") ?? ""
      const demora = demoras.get(q)
      if (demora) await demora
      const candidatos = personas
        .filter((p) => p.nombre.toLowerCase().includes(q.toLowerCase()))
        .map((p) => ({
          id: p.id,
          nombre: p.nombre,
          correoEnmascarado: "ab***@ejemplo.mx",
          yaInscrito: estado.inscritos.has(p.id),
        }))
      return respuestaJson(200, { candidatos, hayMas: false })
    }
    if (ruta === base && metodo === "POST") {
      const demoraPost = demoras.get("POST")
      if (demoraPost) await demoraPost
      const { alumnoId } = JSON.parse(String(init?.body)) as { alumnoId: string }
      const yaEstaba = estado.inscritos.has(alumnoId)
      estado.inscritos.add(alumnoId)
      const persona = personas.find((p) => p.id === alumnoId)
      return respuestaJson(200, { alumno: persona, yaEstaba })
    }
    if (ruta.startsWith(`${base}/`) && metodo === "DELETE") {
      const demoraDelete = demoras.get("DELETE")
      if (demoraDelete) await demoraDelete
      estado.inscritos.delete(ruta.slice(base.length + 1))
      return new Response(null, { status: 204 })
    }
    if (ruta.startsWith(base) && metodo === "GET") {
      const alumnos = personas
        .filter((p) => estado.inscritos.has(p.id))
        .map((p) => ({
          ...p,
          email: `${p.nombre.split(" ")[0]?.toLowerCase() ?? "x"}@ejemplo.mx`,
          estadoPago: "al_corriente",
          accesoRestringido: false,
          origen: "manual",
          inscritoEn: "2026-09-29T15:30:00.000Z",
        }))
      return respuestaJson(200, { alumnos, total: alumnos.length, siguienteCursor: null })
    }
    return respuestaJson(500, { error: { codigo: "ERROR_INTERNO", mensaje: "x" } })
  })
  vi.stubGlobal("fetch", fetchMock)
  return { estado, demoras, fetchMock }
}

const llamadas = (
  fetchMock: ReturnType<typeof vi.fn<typeof fetch>>,
  parte: string,
  metodo = "GET",
) =>
  fetchMock.mock.calls.filter(
    ([entrada, init]) => String(entrada).includes(parte) && (init?.method ?? "GET") === metodo,
  )

const renderAlumnos = () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[`/maestro/clases/${CLASE_ID}/alumnos`]}>
        <Routes>
          <Route path="/maestro/clases/:claseId/alumnos" element={<AlumnosView />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

const escribir = (texto: string) =>
  fireEvent.change(screen.getByLabelText("Buscar alumno por nombre"), { target: { value: texto } })

const resultados = () => screen.getByRole("list", { name: "Resultados de la búsqueda" })
const resultadosListos = () => screen.findByRole("list", { name: "Resultados de la búsqueda" })

beforeEach(() => {
  establecerToken("token-de-prueba")
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
  limpiarToken()
  vi.unstubAllGlobals()
  aviso.success.mockClear()
  aviso.error.mockClear()
  navegacion.irA.mockClear()
})

describe("ataque CLASES-b r1: buscador", () => {
  it("una sola petición por término: teclear rápido, borrar hasta menos de 3 y volver al mismo término no pide de más", async () => {
    const { fetchMock } = crearServidor([{ id: idDe(1), nombre: "José Pérez" }], [])
    renderAlumnos()
    await screen.findByText("Aún no hay alumnos. Comparte el código de la clase o búscalos arriba.")

    vi.useFakeTimers()
    for (const parcial of ["j", "jo", "jos", "jose", "josé"]) {
      escribir(parcial)
      await act(async () => {
        await vi.advanceTimersByTimeAsync(100)
      })
    }
    expect(llamadas(fetchMock, "/candidatos")).toHaveLength(0)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(200)
    })
    expect(llamadas(fetchMock, "/candidatos")).toHaveLength(1)
    expect(String(llamadas(fetchMock, "/candidatos")[0]?.[0])).toContain(
      `q=${encodeURIComponent("josé")}`,
    )

    // Ida y vuelta dentro de los 300 ms: el término diferido no cambia y no hay petición nueva.
    escribir("josé p")
    await act(async () => {
      await vi.advanceTimersByTimeAsync(150)
    })
    escribir("josé")
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000)
    })
    // Menos de 3: ninguna petición y sin resultados viejos a la vista.
    escribir("jo")
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000)
    })
    expect(llamadas(fetchMock, "/candidatos")).toHaveLength(1)
    expect(screen.queryByRole("list", { name: "Resultados de la búsqueda" })).toBeNull()
  })

  it("sin carreras: la respuesta tardía de un término anterior no reemplaza los resultados del término actual", async () => {
    const servidor = crearServidor(
      [
        { id: idDe(1), nombre: "Mar Uno" },
        { id: idDe(2), nombre: "Marta Dos" },
      ],
      [],
    )
    let soltar: () => void = () => undefined
    servidor.demoras.set(
      "mar",
      new Promise<void>((resolver) => {
        soltar = resolver
      }),
    )
    renderAlumnos()
    await screen.findByText("Aún no hay alumnos. Comparte el código de la clase o búscalos arriba.")

    escribir("mar")
    await waitFor(() => expect(llamadas(servidor.fetchMock, "q=mar&")).toHaveLength(1))
    escribir("mart")
    await waitFor(() =>
      expect(
        within(resultados()).getByRole("button", { name: "Agregar a la clase Marta Dos" }),
      ).toBeInTheDocument(),
    )
    await act(async () => {
      soltar()
      await new Promise((resolver) => setTimeout(resolver, 50))
    })
    expect(
      within(resultados()).queryByRole("button", { name: "Agregar a la clase Mar Uno" }),
    ).toBeNull()
    expect(
      within(resultados()).getByRole("button", { name: "Agregar a la clase Marta Dos" }),
    ).toBeInTheDocument()
  })

  it("coherencia con el backend: el frontend da por válido «각» (3 caracteres después de normalizar) y sí pregunta", async () => {
    // Lado frontend de T-20: la prueba que falla está en backend/test/alumnos-b-r1.ataque.test.ts.
    expect(terminoDeBusquedaValido("각")).toBe(true)
    expect(terminoDeBusquedaValido("가나")).toBe(true)
    const { fetchMock } = crearServidor([], [])
    renderAlumnos()
    await screen.findByText("Aún no hay alumnos. Comparte el código de la clase o búscalos arriba.")
    escribir("각")
    await waitFor(() => expect(llamadas(fetchMock, "/candidatos")).toHaveLength(1))
  })
})

describe("ataque CLASES-b r1: carreras entre el buscador y el roster", () => {
  it("quitar desde el roster a quien el buscador muestra como «Ya está en la clase»: la fila del buscador pasa a «Agregar a la clase»", async () => {
    crearServidor([{ id: idDe(1), nombre: "Lucía Ramos" }], [idDe(1)])
    renderAlumnos()
    const fila = (await screen.findByRole("cell", { name: "Lucía Ramos" })).closest("tr")
    if (fila === null) throw new Error("La fila del roster no existe")

    escribir("luc")
    expect(
      await within(await resultadosListos()).findByText("Ya está en la clase"),
    ).toBeInTheDocument()

    fireEvent.click(within(fila).getByRole("button", { name: "Quitar Lucía Ramos" }))
    fireEvent.click(within(fila).getByRole("button", { name: "Sí, quitar Lucía Ramos" }))

    expect(
      await within(await resultadosListos()).findByRole("button", {
        name: "Agregar a la clase Lucía Ramos",
      }),
    ).toBeInTheDocument()
    await waitFor(() => expect(screen.queryByRole("cell", { name: "Lucía Ramos" })).toBeNull())
  })

  it("agregar a quien otra pestaña acaba de quitar (o de agregar): el roster y el buscador quedan al día", async () => {
    const servidor = crearServidor([{ id: idDe(2), nombre: "Pablo Ortiz" }], [])
    renderAlumnos()
    escribir("pab")
    const boton = await within(await resultadosListos()).findByRole("button", {
      name: "Agregar a la clase Pablo Ortiz",
    })
    // Otra pestaña lo agrega antes de este clic.
    servidor.estado.inscritos.add(idDe(2))
    fireEvent.click(boton)
    expect(await screen.findByRole("cell", { name: "Pablo Ortiz" })).toBeInTheDocument()
    expect(
      await within(await resultadosListos()).findByText("Ya está en la clase"),
    ).toBeInTheDocument()
    expect(llamadas(servidor.fetchMock, "/alumnos", "POST")).toHaveLength(1)
  })
})

describe("ataque CLASES-b r1: doble clic", () => {
  it("doble clic en «Agregar a la clase» envía un solo POST", async () => {
    const servidor = crearServidor([{ id: idDe(3), nombre: "Irene Paz" }], [])
    let soltar: () => void = () => undefined
    servidor.demoras.set(
      "POST",
      new Promise<void>((resolver) => {
        soltar = resolver
      }),
    )
    renderAlumnos()
    escribir("ire")
    const boton = await within(await resultadosListos()).findByRole("button", {
      name: "Agregar a la clase Irene Paz",
    })
    fireEvent.click(boton)
    // Un doble clic humano deja decenas de milisegundos entre clics (aquí, 30 ms).
    await act(async () => {
      await new Promise((resolver) => setTimeout(resolver, 30))
    })
    // El primer POST sigue en vuelo: el segundo clic no debe enviar otro.
    fireEvent.click(boton)
    await act(async () => {
      soltar()
      await Promise.resolve()
    })
    await screen.findByRole("cell", { name: "Irene Paz" })
    expect(llamadas(servidor.fetchMock, "/alumnos", "POST")).toHaveLength(1)
  })

  it("doble clic en «Sí, quitar» envía un solo DELETE", async () => {
    const servidor = crearServidor([{ id: idDe(4), nombre: "Raúl Soto" }], [idDe(4)])
    let soltar: () => void = () => undefined
    servidor.demoras.set(
      "DELETE",
      new Promise<void>((resolver) => {
        soltar = resolver
      }),
    )
    renderAlumnos()
    const fila = (await screen.findByRole("cell", { name: "Raúl Soto" })).closest("tr")
    if (fila === null) throw new Error("La fila del roster no existe")
    fireEvent.click(within(fila).getByRole("button", { name: "Quitar Raúl Soto" }))
    const si = within(fila).getByRole("button", { name: "Sí, quitar Raúl Soto" })
    fireEvent.click(si)
    // Un doble clic humano deja decenas de milisegundos entre clics (aquí, 30 ms).
    await act(async () => {
      await new Promise((resolver) => setTimeout(resolver, 30))
    })
    fireEvent.click(si)
    await act(async () => {
      soltar()
      await Promise.resolve()
    })
    await waitFor(() => expect(screen.queryByRole("cell", { name: "Raúl Soto" })).toBeNull())
    expect(llamadas(servidor.fetchMock, "/alumnos/", "DELETE")).toHaveLength(1)
  })
})

describe("ataque CLASES-b r1: foco del roster", () => {
  it("T-21: después de «Sí, quitar», cuando la fila desaparece, el foco no se pierde en <body>", async () => {
    crearServidor(
      [
        { id: idDe(5), nombre: "Ana Uno" },
        { id: idDe(6), nombre: "Beto Dos" },
      ],
      [idDe(5), idDe(6)],
    )
    renderAlumnos()
    const fila = (await screen.findByRole("cell", { name: "Ana Uno" })).closest("tr")
    if (fila === null) throw new Error("La fila del roster no existe")

    // Teclado: "Quitar" → el foco va a "Cancelar" (§7.14) → Mayús+Tab a "Sí, quitar" → Enter.
    const quitar = within(fila).getByRole("button", { name: "Quitar Ana Uno" })
    quitar.focus()
    fireEvent.click(quitar)
    const cancelar = within(fila).getByRole("button", { name: "Cancelar Ana Uno" })
    await waitFor(() => expect(cancelar).toHaveFocus())
    const si = within(fila).getByRole("button", { name: "Sí, quitar Ana Uno" })
    si.focus()
    fireEvent.click(si)

    await waitFor(() => expect(screen.queryByRole("cell", { name: "Ana Uno" })).toBeNull())
    await waitFor(() => expect(aviso.success).toHaveBeenCalledTimes(1))
    expect(document.activeElement, "el foco quedó en <body>").not.toBe(document.body)
    expect(document.activeElement?.isConnected).toBe(true)
  })
})

describe("ataque CLASES-b r1: las vistas no pintan datos de pago aunque la API los mandara", () => {
  it("PersonasView descarta estadoPago, accesoRestringido y correos que lleguen de más", async () => {
    const extra = {
      email: "fuga@ejemplo.mx",
      estadoPago: "deudor",
      accesoRestringido: true,
      correoEnmascarado: "fu***@ejemplo.mx",
    }
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>(() =>
        Promise.resolve(
          respuestaJson(200, {
            maestro: { id: idDe(7), nombre: "Profe Luna", ...extra },
            // CLASES-02b ronda 0 (C-11, §D-2B4): personasRespuestaSchema exige maestros (1 o 2) y el
            // correo de cada persona (ya viene en extra). Con 02b la vista todavía no muestra
            // correos, así que ninguna aserción cambia; el «@» lo revisa C-17 (02d).
            maestros: [{ id: idDe(7), nombre: "Profe Luna", ...extra }],
            alumnos: [{ id: idDe(8), nombre: "Compañera Sol", ...extra }],
            totalAlumnos: 1,
            siguienteCursor: null,
            estadoPago: "deudor",
          }),
        ),
      ),
    )
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[`/estudiante/clases/${CLASE_ID}/personas`]}>
          <Routes>
            <Route path="/estudiante/clases/:claseId/personas" element={<PersonasView />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    )
    expect(await screen.findByText("Compañera Sol")).toBeInTheDocument()
    const texto = document.body.textContent ?? ""
    for (const prohibido of ["Deudor", "deudor", "Acceso restringido", "@", "Al corriente"]) {
      expect(texto, prohibido).not.toContain(prohibido)
    }
  })
})

describe("ataque CLASES-b r1: N-04 con ACCESO_RESTRINGIDO al unirse", () => {
  it("redirige con apiClient, avisa una sola vez y no marca el campo", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>(() =>
        Promise.resolve(
          respuestaJson(403, {
            error: { codigo: "ACCESO_RESTRINGIDO", mensaje: "Tu acceso está restringido." },
          }),
        ),
      ),
    )
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <FormularioUnirseClase />
        </MemoryRouter>
      </QueryClientProvider>,
    )
    const campo = screen.getByLabelText("Código de la clase")
    fireEvent.change(campo, { target: { value: "ABCDEFG" } })
    fireEvent.click(screen.getByRole("button", { name: "Unirme a la clase" }))

    await waitFor(() => expect(navegacion.irA).toHaveBeenCalledWith("/acceso-restringido"))
    await waitFor(() => expect(aviso.error).toHaveBeenCalledTimes(1))
    expect(navegacion.irA).toHaveBeenCalledTimes(1)
    expect(campo).not.toHaveAttribute("aria-invalid", "true")
    expect(aviso.success).not.toHaveBeenCalled()
  })
})
