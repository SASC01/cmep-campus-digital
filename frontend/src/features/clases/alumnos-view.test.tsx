import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { MemoryRouter, Route, Routes } from "react-router"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { establecerToken, limpiarToken } from "@/services/tokenAcceso"

import { AlumnosView } from "./alumnos-view"

const aviso = vi.hoisted(() => Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }))
vi.mock("sonner", () => ({ toast: aviso }))

const respuestaJson = (estado: number, cuerpo: unknown) =>
  new Response(JSON.stringify(cuerpo), {
    status: estado,
    headers: { "Content-Type": "application/json" },
  })

const errorJson = (estado: number, codigo: string) =>
  respuestaJson(estado, { error: { codigo, mensaje: "mensaje del servidor" } })

const CLASE_ID = "2a2b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d01"

const idDe = (n: number) => `4a4b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d${String(10 + n)}`

const alumnoDeClase = (n: number, extra: Record<string, unknown> = {}) => ({
  id: idDe(n),
  nombre: `Alumno ${String(n)}`,
  email: `alumno${String(n)}@ejemplo.mx`,
  estadoPago: "al_corriente",
  accesoRestringido: false,
  origen: "codigo",
  inscritoEn: "2026-09-29T15:30:00.000Z",
  ...extra,
})

const roster = (
  alumnos: ReturnType<typeof alumnoDeClase>[],
  siguienteCursor: string | null = null,
) => ({ alumnos, total: alumnos.length, siguienteCursor })

const candidato = (n: number, extra: Record<string, unknown> = {}) => ({
  id: idDe(n),
  nombre: `Candidato ${String(n)}`,
  correoEnmascarado: `ca***@ejemplo.mx`,
  yaInscrito: false,
  ...extra,
})

interface Api {
  roster?: (ruta: string) => Response
  candidatos?: (ruta: string) => Response
  agregar?: () => Response
  quitar?: () => Response | Promise<Response>
}

const stubApi = (api: Api = {}) => {
  const fetchMock = vi.fn<typeof fetch>((entrada, init) => {
    const ruta = String(entrada)
    const metodo = init?.method ?? "GET"
    const base = `/api/clases/${CLASE_ID}/alumnos`
    if (ruta.startsWith(`${base}/candidatos`)) {
      return Promise.resolve(
        api.candidatos?.(ruta) ?? respuestaJson(200, { candidatos: [], hayMas: false }),
      )
    }
    if (ruta === base && metodo === "POST") {
      return Promise.resolve(
        api.agregar?.() ??
          respuestaJson(200, { alumno: { id: idDe(1), nombre: "Candidato 1" }, yaEstaba: false }),
      )
    }
    if (ruta.startsWith(`${base}/`) && metodo === "DELETE") {
      return Promise.resolve(api.quitar?.() ?? new Response(null, { status: 204 }))
    }
    if (ruta.startsWith(base) && metodo === "GET") {
      return Promise.resolve(api.roster?.(ruta) ?? respuestaJson(200, roster([])))
    }
    return Promise.resolve(errorJson(500, "ERROR_INTERNO"))
  })
  vi.stubGlobal("fetch", fetchMock)
  return fetchMock
}

const llamadasA = (fetchMock: ReturnType<typeof stubApi>, parteDeLaRuta: string, metodo = "GET") =>
  fetchMock.mock.calls.filter(
    ([entrada, init]) =>
      String(entrada).includes(parteDeLaRuta) && (init?.method ?? "GET") === metodo,
  )

const renderVista = () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const invalidar = vi.spyOn(queryClient, "invalidateQueries")
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[`/maestro/clases/${CLASE_ID}/alumnos`]}>
        <Routes>
          <Route path="/maestro/clases/:claseId/alumnos" element={<AlumnosView />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
  return { queryClient, invalidar }
}

const escribir = (texto: string) =>
  fireEvent.change(screen.getByLabelText("Buscar alumno por nombre"), { target: { value: texto } })

beforeEach(() => {
  establecerToken("token-de-prueba")
})

afterEach(() => {
  vi.useRealTimers()
  limpiarToken()
  vi.unstubAllGlobals()
  aviso.mockClear()
  aviso.success.mockClear()
  aviso.error.mockClear()
})

describe("BuscadorAlumnos", () => {
  it("PR-B10a: con menos de 3 caracteres no pide nada", async () => {
    const fetchMock = stubApi()
    renderVista()
    await screen.findByText("Aún no hay alumnos. Comparte el código de la clase o búscalos arriba.")

    vi.useFakeTimers()
    escribir("ab")
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000)
    })
    escribir("  ab  ")
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000)
    })

    expect(llamadasA(fetchMock, "/candidatos")).toHaveLength(0)
    expect(screen.getByText("Escribe al menos 3 letras.")).toBeInTheDocument()
  })

  it("PR-B10b: con temporizadores falsos, una sola petición 300 ms después de la última tecla", async () => {
    const fetchMock = stubApi({
      candidatos: () => respuestaJson(200, { candidatos: [candidato(1)], hayMas: false }),
    })
    renderVista()
    await screen.findByText("Aún no hay alumnos. Comparte el código de la clase o búscalos arriba.")

    vi.useFakeTimers()
    escribir("can")
    await act(async () => {
      await vi.advanceTimersByTimeAsync(200)
    })
    escribir("cand")
    await act(async () => {
      await vi.advanceTimersByTimeAsync(200)
    })
    escribir("candi")
    await act(async () => {
      await vi.advanceTimersByTimeAsync(299)
    })
    expect(llamadasA(fetchMock, "/candidatos")).toHaveLength(0)

    await act(async () => {
      await vi.advanceTimersByTimeAsync(100)
    })

    const peticiones = llamadasA(fetchMock, "/candidatos")
    expect(peticiones).toHaveLength(1)
    expect(String(peticiones[0]?.[0])).toBe(
      `/api/clases/${CLASE_ID}/alumnos/candidatos?q=candi&limite=20`,
    )
  })

  it("PR-B10c: un candidato inscrito muestra 'Ya está en la clase' en lugar del botón", async () => {
    stubApi({
      candidatos: () =>
        respuestaJson(200, {
          candidatos: [candidato(1, { yaInscrito: true }), candidato(2)],
          hayMas: false,
        }),
    })
    renderVista()

    escribir("candidato")

    const lista = await screen.findByRole("list", { name: "Resultados de la búsqueda" })
    const filas = within(lista).getAllByRole("listitem")
    expect(within(filas[0] as HTMLElement).getByText("Ya está en la clase")).toBeInTheDocument()
    expect(within(filas[0] as HTMLElement).queryByRole("button")).not.toBeInTheDocument()
    expect(within(filas[1] as HTMLElement).getByRole("button")).toBeInTheDocument()
    expect(
      within(filas[1] as HTMLElement).queryByText("Ya está en la clase"),
    ).not.toBeInTheDocument()
  })

  it("PR-B10d: agregar invalida el roster y muestra el toast", async () => {
    let agregado = false
    const fetchMock = stubApi({
      roster: () =>
        respuestaJson(200, roster(agregado ? [alumnoDeClase(1, { origen: "manual" })] : [])),
      candidatos: () =>
        respuestaJson(200, {
          candidatos: [candidato(1, { yaInscrito: agregado })],
          hayMas: false,
        }),
      agregar: () => {
        agregado = true
        return respuestaJson(200, {
          alumno: { id: idDe(1), nombre: "Candidato 1" },
          yaEstaba: false,
        })
      },
    })
    const { invalidar } = renderVista()
    await screen.findByText("Aún no hay alumnos. Comparte el código de la clase o búscalos arriba.")

    escribir("candidato")
    fireEvent.click(await screen.findByRole("button", { name: "Agregar a la clase Candidato 1" }))

    await waitFor(() => expect(aviso.success).toHaveBeenCalledWith("Agregaste a Candidato 1"))
    const cuerpo = llamadasA(fetchMock, `/api/clases/${CLASE_ID}/alumnos`, "POST")
    expect(JSON.parse(String(cuerpo[0]?.[1]?.body))).toEqual({ alumnoId: idDe(1) })
    const clavesInvalidadas = invalidar.mock.calls.map(([filtro]) => filtro?.queryKey)
    expect(clavesInvalidadas).toContainEqual(["clases", CLASE_ID, "alumnos"])
    expect(clavesInvalidadas).toContainEqual(["clases", CLASE_ID, "candidatos"])
    expect(clavesInvalidadas).toContainEqual(["clases", "impartidas"])
    // El roster se vuelve a pedir y ahora trae al alumno agregado; el buscador, "Ya está".
    expect(await screen.findByText("alumno1@ejemplo.mx")).toBeInTheDocument()
    expect(await screen.findByText("Ya está en la clase")).toBeInTheDocument()
  })

  it("D-4: agregar con yaEstaba: true avisa con un toast neutro, sin éxito ni error", async () => {
    stubApi({
      candidatos: () => respuestaJson(200, { candidatos: [candidato(1)], hayMas: false }),
      agregar: () =>
        respuestaJson(200, { alumno: { id: idDe(1), nombre: "Candidato 1" }, yaEstaba: true }),
    })
    renderVista()

    escribir("candidato")
    fireEvent.click(await screen.findByRole("button", { name: "Agregar a la clase Candidato 1" }))

    await waitFor(() => expect(aviso).toHaveBeenCalledWith("Candidato 1 ya estaba en la clase"))
    expect(aviso.success).not.toHaveBeenCalled()
    expect(aviso.error).not.toHaveBeenCalled()
  })

  it("T-25 (ronda 4): al agregar con teclado, el foco va al siguiente «Agregar a la clase», al anterior si era el último y al campo si no queda ninguno", async () => {
    const agregados = new Set<number>()
    let aAgregar = 1
    stubApi({
      candidatos: () =>
        respuestaJson(200, {
          candidatos: [1, 2, 3].map((n) => candidato(n, { yaInscrito: agregados.has(n) })),
          hayMas: false,
        }),
      agregar: () => {
        agregados.add(aAgregar)
        return respuestaJson(200, {
          alumno: { id: idDe(aAgregar), nombre: `Candidato ${String(aAgregar)}` },
          yaEstaba: false,
        })
      },
    })
    renderVista()
    escribir("candidato")
    const agregar = async (n: number) => {
      aAgregar = n
      const boton = await screen.findByRole("button", {
        name: `Agregar a la clase Candidato ${String(n)}`,
      })
      boton.focus()
      fireEvent.click(boton)
      await waitFor(() =>
        expect(
          screen.queryByRole("button", { name: `Agregar a la clase Candidato ${String(n)}` }),
        ).toBeNull(),
      )
    }

    await agregar(2)
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Agregar a la clase Candidato 3" })).toHaveFocus(),
    )
    await agregar(3)
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Agregar a la clase Candidato 1" })).toHaveFocus(),
    )
    await agregar(1)
    await waitFor(() => expect(screen.getByLabelText("Buscar alumno por nombre")).toHaveFocus())
  })

  it("PR-B10e: el buscador lleva autoComplete='off'", async () => {
    stubApi()
    renderVista()

    expect(await screen.findByLabelText("Buscar alumno por nombre")).toHaveAttribute(
      "autocomplete",
      "off",
    )
  })

  it("PR-B10f: el botón de cada fila lleva el nombre del alumno en su nombre accesible", async () => {
    stubApi({
      candidatos: () =>
        respuestaJson(200, { candidatos: [candidato(1), candidato(2)], hayMas: false }),
    })
    renderVista()

    escribir("candidato")

    expect(
      await screen.findByRole("button", { name: "Agregar a la clase Candidato 1" }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: "Agregar a la clase Candidato 2" }),
    ).toBeInTheDocument()
    expect(screen.getAllByRole("button", { name: /^Agregar a la clase / })).toHaveLength(2)
  })

  it("PR-B10g: cada resultado muestra el correoEnmascarado tal como llega, y el buscador no muestra ningún correo completo", async () => {
    stubApi({
      candidatos: () =>
        respuestaJson(200, {
          // La API nunca manda `email`; si lo mandara, el esquema de shared/ lo descarta.
          candidatos: [
            {
              ...candidato(1, { correoEnmascarado: "an***@colegio.mx" }),
              email: "ana.lopez@colegio.mx",
            },
            { ...candidato(2, { correoEnmascarado: "***@x.mx" }), email: "a@x.mx" },
          ],
          hayMas: false,
        }),
    })
    renderVista()

    escribir("candidato")

    const lista = await screen.findByRole("list", { name: "Resultados de la búsqueda" })
    expect(within(lista).getByText("an***@colegio.mx")).toBeInTheDocument()
    expect(within(lista).getByText("***@x.mx")).toBeInTheDocument()
    expect(lista.textContent).not.toContain("ana.lopez@colegio.mx")
    expect(lista.textContent).not.toContain("a@x.mx")
    const correosVisibles = (lista.textContent ?? "").match(/\S*@\S*/g) ?? []
    for (const correo of correosVisibles) expect(correo).toContain("***")
  })

  it("muestra los mensajes de sin resultados y de 'hay más', y el error de la búsqueda", async () => {
    stubApi({ candidatos: () => respuestaJson(200, { candidatos: [], hayMas: false }) })
    renderVista()
    escribir("zzz")
    expect(
      await screen.findByText(
        "No encontramos alumnos con ese nombre. Solo aparecen alumnos con cuenta.",
      ),
    ).toBeInTheDocument()

    escribir("candidatos")
    stubApi({ candidatos: () => respuestaJson(200, { candidatos: [candidato(1)], hayMas: true }) })
    expect(
      await screen.findByText("Hay más resultados: escribe más del nombre."),
    ).toBeInTheDocument()

    stubApi({ candidatos: () => errorJson(500, "ERROR_INTERNO") })
    escribir("otro término")
    expect(await screen.findByRole("alert")).toBeInTheDocument()
  })
})

describe("TablaAlumnos", () => {
  it("PR-B11a: la tabla muestra 'Al corriente' y 'Deudor' como texto", async () => {
    stubApi({
      roster: () =>
        respuestaJson(200, roster([alumnoDeClase(1), alumnoDeClase(2, { estadoPago: "deudor" })])),
    })
    renderVista()

    const tabla = await screen.findByRole("table")
    expect(within(tabla).getByText("Al corriente")).toBeInTheDocument()
    expect(within(tabla).getByText("Deudor")).toBeInTheDocument()
    expect(within(tabla).getByText("alumno1@ejemplo.mx")).toBeInTheDocument()
    expect(within(tabla).getByRole("columnheader", { name: "Estado de pago" })).toBeInTheDocument()
  })

  it("PR-B11b: la tabla muestra 'Acceso restringido' como texto", async () => {
    stubApi({
      roster: () =>
        respuestaJson(
          200,
          roster([alumnoDeClase(1, { accesoRestringido: true }), alumnoDeClase(2)]),
        ),
    })
    renderVista()

    const tabla = await screen.findByRole("table")
    expect(within(tabla).getAllByText("Acceso restringido")).toHaveLength(1)
    const filas = within(tabla).getAllByRole("row")
    expect(within(filas[1] as HTMLElement).getByText("Acceso restringido")).toBeInTheDocument()
    expect(
      within(filas[2] as HTMLElement).queryByText("Acceso restringido"),
    ).not.toBeInTheDocument()
    expect(within(filas[2] as HTMLElement).getByText("—")).toBeInTheDocument()
  })

  it("PR-B11c: quitar pide confirmación en línea, con el manejo de foco", async () => {
    let quitado = false
    const fetchMock = stubApi({
      roster: () => respuestaJson(200, roster(quitado ? [] : [alumnoDeClase(1)])),
      quitar: () => {
        quitado = true
        return new Response(null, { status: 204 })
      },
    })
    renderVista()

    const quitar = await screen.findByRole("button", { name: "Quitar Alumno 1" })
    fireEvent.click(quitar)

    expect(screen.getByText("Dejará de ver la clase. Sus datos no se borran.")).toBeInTheDocument()
    const cancelar = screen.getByRole("button", { name: "Cancelar Alumno 1" })
    expect(document.activeElement).toBe(cancelar)
    expect(screen.queryByRole("button", { name: "Quitar Alumno 1" })).not.toBeInTheDocument()
    expect(llamadasA(fetchMock, "/alumnos/", "DELETE")).toHaveLength(0)

    fireEvent.click(cancelar)

    expect(
      screen.queryByText("Dejará de ver la clase. Sus datos no se borran."),
    ).not.toBeInTheDocument()
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Quitar Alumno 1" }))

    fireEvent.click(screen.getByRole("button", { name: "Quitar Alumno 1" }))
    fireEvent.click(screen.getByRole("button", { name: "Sí, quitar Alumno 1" }))

    await waitFor(() =>
      expect(aviso.success).toHaveBeenCalledWith("Quitaste a Alumno 1 de la clase"),
    )
    expect(
      llamadasA(fetchMock, `/api/clases/${CLASE_ID}/alumnos/${idDe(1)}`, "DELETE"),
    ).toHaveLength(1)
    expect(
      await screen.findByText(
        "Aún no hay alumnos. Comparte el código de la clase o búscalos arriba.",
      ),
    ).toBeInTheDocument()
  })

  it("PR-B11c2: tras 'Sí, quitar' el foco va a la fila que ocupa su lugar (la del medio y la última) o al encabezado si era la única (T-21)", async () => {
    const quitarYEsperar = async (inicial: number[], quitado: number) => {
      let vigentes = inicial
      stubApi({
        roster: () => respuestaJson(200, roster(vigentes.map((n) => alumnoDeClase(n)))),
        quitar: () => {
          vigentes = vigentes.filter((n) => n !== quitado)
          return new Response(null, { status: 204 })
        },
      })
      renderVista()
      fireEvent.click(
        await screen.findByRole("button", { name: `Quitar Alumno ${String(quitado)}` }),
      )
      fireEvent.click(screen.getByRole("button", { name: `Sí, quitar Alumno ${String(quitado)}` }))
      await waitFor(() =>
        expect(screen.queryByRole("cell", { name: `Alumno ${String(quitado)}` })).toBeNull(),
      )
    }

    await quitarYEsperar([1, 2, 3], 2)
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Quitar Alumno 3" })).toHaveFocus(),
    )
    cleanup()

    await quitarYEsperar([1, 2, 3], 3)
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Quitar Alumno 2" })).toHaveFocus(),
    )
    cleanup()

    await quitarYEsperar([1], 1)
    await waitFor(() => expect(screen.getByRole("heading", { name: "Alumnos" })).toHaveFocus())
    expect(document.activeElement).not.toBe(document.body)
  })

  it("T-22 (ronda 2): si la consulta nueva del roster falla después de quitar, el foco va al encabezado del panel", async () => {
    let quitado = false
    stubApi({
      roster: () =>
        quitado
          ? errorJson(500, "ERROR_INTERNO")
          : respuestaJson(200, roster([alumnoDeClase(1), alumnoDeClase(2)])),
      quitar: () => {
        quitado = true
        return new Response(null, { status: 204 })
      },
    })
    renderVista()
    fireEvent.click(await screen.findByRole("button", { name: "Quitar Alumno 1" }))
    fireEvent.click(screen.getByRole("button", { name: "Sí, quitar Alumno 1" }))

    await waitFor(() =>
      expect(screen.queryByRole("button", { name: "Sí, quitar Alumno 1" })).toBeNull(),
    )
    await waitFor(() => expect(screen.getByRole("heading", { name: "Alumnos" })).toHaveFocus())
  })

  it("T-23 (ronda 2): si la fila sale de los datos antes del onSuccess, el foco no queda en <body> y va a la fila vecina", async () => {
    let vigentes = [1, 2, 3]
    let soltar: () => void = () => undefined
    stubApi({
      roster: () => respuestaJson(200, roster(vigentes.map((n) => alumnoDeClase(n)))),
      quitar: () =>
        new Promise<Response>((resolver) => {
          soltar = () => resolver(new Response(null, { status: 204 }))
        }),
    })
    const { queryClient } = renderVista()
    fireEvent.click(await screen.findByRole("button", { name: "Quitar Alumno 2" }))
    fireEvent.click(screen.getByRole("button", { name: "Sí, quitar Alumno 2" }))
    // Otra pestaña ya la quitó y el roster se vuelve a pedir antes de que llegue el 204.
    vigentes = [1, 3]
    await act(async () => {
      await queryClient.invalidateQueries({ queryKey: ["clases", CLASE_ID, "alumnos"] })
    })
    await waitFor(() => expect(screen.queryByRole("cell", { name: "Alumno 2" })).toBeNull())

    expect(document.activeElement).not.toBe(document.body)
    expect(screen.getByRole("button", { name: "Quitar Alumno 3" })).toHaveFocus()
    soltar()
  })

  it("T-24 (ronda 2): un término que cabe en el campo pero pasa de 120 normalizados no se pide y muestra el aviso de longitud", async () => {
    const fetchMock = stubApi()
    renderVista()
    await screen.findByText("Aún no hay alumnos. Comparte el código de la clase o búscalos arriba.")

    escribir("각".repeat(41))
    expect(screen.getByText("La búsqueda no puede tener más de 120 caracteres")).toBeInTheDocument()
    await act(async () => {
      await new Promise((resolver) => setTimeout(resolver, 450))
    })
    expect(llamadasA(fetchMock, "/candidatos")).toHaveLength(0)

    escribir("각".repeat(40))
    expect(screen.queryByText("La búsqueda no puede tener más de 120 caracteres")).toBeNull()
    await waitFor(() => expect(llamadasA(fetchMock, "/candidatos")).toHaveLength(1))
  })

  it("T-26 (ronda 4): al cargar la última página, «Ver más alumnos» desaparece y el foco va al primer control nuevo o, si no llegó nada, al encabezado", async () => {
    const conPaginas = (segunda: ReturnType<typeof alumnoDeClase>[]) =>
      stubApi({
        roster: (ruta) => {
          if (ruta.includes(`cursor=${idDe(1)}`)) return respuestaJson(200, roster(segunda))
          return respuestaJson(200, roster([alumnoDeClase(1)], idDe(1)))
        },
      })
    const cargarMas = async () => {
      const boton = await screen.findByRole("button", { name: "Ver más alumnos" })
      boton.focus()
      fireEvent.click(boton)
      await waitFor(() =>
        expect(screen.queryByRole("button", { name: "Ver más alumnos" })).toBeNull(),
      )
    }

    conPaginas([alumnoDeClase(2)])
    renderVista()
    await cargarMas()
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Quitar Alumno 2" })).toHaveFocus(),
    )
    cleanup()

    conPaginas([])
    renderVista()
    await cargarMas()
    await waitFor(() => expect(screen.getByRole("heading", { name: "Alumnos" })).toHaveFocus())
  })

  it("T-28 (ronda 5): con ratón en «Ver más alumnos» y después un clic fuera, un render sin desmontaje no mueve el foco", async () => {
    let vigentes = [1, 2]
    stubApi({
      roster: () =>
        respuestaJson(
          200,
          roster(
            vigentes.map((n) => alumnoDeClase(n)),
            idDe(2),
          ),
        ),
    })
    const { queryClient } = renderVista()
    const boton = await screen.findByRole("button", { name: "Ver más alumnos" })
    boton.focus()
    boton.blur()
    await act(async () => {
      await new Promise((resolver) => setTimeout(resolver, 20))
    })
    expect(document.activeElement).toBe(document.body)

    vigentes = [1]
    await act(async () => {
      await queryClient.invalidateQueries({ queryKey: ["clases", CLASE_ID, "alumnos"] })
    })
    await waitFor(() => expect(screen.queryByRole("cell", { name: "Alumno 2" })).toBeNull())

    expect(screen.getByRole("button", { name: "Ver más alumnos" })).toBeInTheDocument()
    expect(document.activeElement).toBe(document.body)
  })

  it("PR-B11d: 'Ver más alumnos' aparece solo con cursor", async () => {
    stubApi({
      roster: (ruta) => {
        if (ruta.includes(`cursor=${idDe(1)}`))
          return respuestaJson(200, roster([alumnoDeClase(2)]))
        return respuestaJson(200, roster([alumnoDeClase(1)], idDe(1)))
      },
    })
    renderVista()

    fireEvent.click(await screen.findByRole("button", { name: "Ver más alumnos" }))

    expect(await screen.findByText("alumno2@ejemplo.mx")).toBeInTheDocument()
    await waitFor(() =>
      expect(screen.queryByRole("button", { name: "Ver más alumnos" })).not.toBeInTheDocument(),
    )
  })

  it("estados en orden: error, cargando y vacío", async () => {
    stubApi({ roster: () => errorJson(403, "SIN_ACCESO_A_LA_CLASE") })
    renderVista()

    expect(await screen.findByRole("alert")).toHaveTextContent("No tienes acceso a esta clase.")
    expect(screen.queryByRole("table")).not.toBeInTheDocument()
  })
})
