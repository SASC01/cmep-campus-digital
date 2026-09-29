import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { formatearFechaHora } from "@/lib/format"

import { MaestrosView } from "./maestros-view"

// AUTH-03b: pruebas normales de /admin/maestros (§D-B6, "Pruebas requeridas" 03b). Las pruebas de
// ataque (maestros-03b-r1.ataque.test.tsx) cubren los casos límite y de carrera; estas cubren el
// camino esperado.

const aviso = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }))
vi.mock("sonner", () => ({ toast: aviso }))

const TOKEN = `MvNorm${"a".repeat(37)}`

// Respuesta que se resuelve a mano, para comprobar el estado "en espera" de un botón mientras su
// petición sigue en vuelo (mismo patrón que maestros-03b-r1.ataque.test.tsx).
const diferida = () => {
  let resolver: (respuesta: Response) => void = () => {
    throw new Error("la respuesta diferida se resolvió antes de crearse")
  }
  const promesa = new Promise<Response>((r) => {
    resolver = r
  })
  return { promesa, resolver: (respuesta: Response) => resolver(respuesta) }
}

const respuestaJson = (estado: number, cuerpo: unknown) =>
  new Response(JSON.stringify(cuerpo), {
    status: estado,
    headers: { "Content-Type": "application/json" },
  })

const errorJson = (estado: number, codigo: string) =>
  respuestaJson(estado, { error: { codigo, mensaje: "mensaje del servidor" } })

const enlace = (n: number, extra: Record<string, unknown> = {}) => ({
  id: `1a2b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d${String(n).padStart(2, "0")}`,
  creadoEn: `2026-09-2${n}T15:00:00.000Z`,
  expiraEn: `2026-10-0${n}T15:00:00.000Z`,
  revocadoEn: null,
  estado: "vigente",
  registrados: 0,
  ...extra,
})

interface Api {
  lista?: () => Response | Promise<Response>
  generar?: () => Response | Promise<Response>
  revocar?: () => Response
  registrados?: () => Response | Promise<Response>
  lote?: () => Response | Promise<Response>
}

const stubApi = (api: Api) => {
  const fetchMock = vi.fn<typeof fetch>((entrada, init) => {
    const ruta = String(entrada)
    const metodo = init?.method ?? "GET"
    if (ruta.startsWith("/api/admin/enlaces-registro?") && metodo === "GET") {
      return Promise.resolve(
        api.lista?.() ?? respuestaJson(200, { enlaces: [enlace(1)], siguienteCursor: null }),
      )
    }
    if (ruta === "/api/admin/enlaces-registro" && metodo === "POST") {
      return Promise.resolve(
        api.generar?.() ?? respuestaJson(201, { enlace: enlace(9), token: TOKEN }),
      )
    }
    if (ruta.endsWith("/revocar")) {
      return Promise.resolve(
        api.revocar?.() ??
          respuestaJson(200, {
            enlace: enlace(1, { estado: "revocado", revocadoEn: "2026-09-28T16:00:00.000Z" }),
          }),
      )
    }
    if (ruta.includes("/registrados")) {
      return Promise.resolve(
        api.registrados?.() ?? respuestaJson(200, { registrados: [], siguienteCursor: null }),
      )
    }
    if (ruta === "/api/admin/maestros/lote" && metodo === "POST") {
      return Promise.resolve(
        api.lote?.() ?? respuestaJson(200, { enviadas: [], yaExistentes: [], invalidas: [] }),
      )
    }
    return Promise.resolve(errorJson(500, "ERROR_INTERNO"))
  })
  vi.stubGlobal("fetch", fetchMock)
  return fetchMock
}

const renderVista = () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const resultado = render(
    <QueryClientProvider client={queryClient}>
      <MaestrosView />
    </QueryClientProvider>,
  )
  return { queryClient, unmount: resultado.unmount }
}

const volcadoDeConsultas = (queryClient: QueryClient): string =>
  JSON.stringify(
    queryClient
      .getQueryCache()
      .getAll()
      .map((consulta) => ({ clave: consulta.queryKey, estado: consulta.state })),
  )

// useGenerarEnlace sale de la caché de mutaciones al asentarse (gcTime 0): el token no debe
// quedar ahí, no solo fuera de la caché de consultas.
const volcadoDeMutaciones = (queryClient: QueryClient): string =>
  JSON.stringify(
    queryClient
      .getMutationCache()
      .getAll()
      .map((mutacion) => ({ clave: mutacion.options.mutationKey, estado: mutacion.state })),
  )

beforeEach(() => {
  Object.defineProperty(navigator, "clipboard", {
    value: { writeText: vi.fn(() => Promise.resolve()) },
    configurable: true,
  })
})

afterEach(() => {
  vi.unstubAllGlobals()
  aviso.success.mockClear()
  aviso.error.mockClear()
})

describe("MaestrosView", () => {
  it("muestra el título y la nota provisional", async () => {
    stubApi({})
    renderVista()
    expect(await screen.findByRole("heading", { name: "Maestros" })).toBeInTheDocument()
    expect(
      screen.getByText("Pantalla provisional: la gestión completa de usuarios llega después."),
    ).toBeInTheDocument()
  })

  it("genera un enlace con la vigencia por defecto y lo muestra con el origen y #token=", async () => {
    stubApi({})
    renderVista()
    await screen.findByRole("button", { name: /^Revocar\b/ })

    fireEvent.click(screen.getByRole("button", { name: "Generar enlace" }))

    expect(
      await screen.findByText(`${window.location.origin}/registro-maestro#token=${TOKEN}`),
    ).toBeInTheDocument()
  })

  it("'Generar enlace' en espera: aria-busy y conserva el foco mientras la petición está en vuelo", async () => {
    const pendiente = diferida()
    stubApi({ generar: () => pendiente.promesa })
    renderVista()
    await screen.findByRole("button", { name: /^Revocar\b/ })
    const generar = screen.getByRole("button", { name: "Generar enlace" })
    act(() => generar.focus())

    fireEvent.click(generar)

    await waitFor(() => expect(generar).toHaveAttribute("aria-busy", "true"))
    expect(document.activeElement).toBe(generar)

    pendiente.resolver(respuestaJson(201, { enlace: enlace(9), token: TOKEN }))
    await screen.findByRole("button", { name: "Copiar enlace" })
  })

  it("vigencia fuera de rango: ErrorDeCampo y ninguna petición", async () => {
    const fetchMock = stubApi({})
    renderVista()
    await screen.findByRole("button", { name: /^Revocar\b/ })

    fireEvent.change(screen.getByLabelText("Vigencia en días"), { target: { value: "0" } })
    fireEvent.click(screen.getByRole("button", { name: "Generar enlace" }))

    expect(screen.getByLabelText("Vigencia en días")).toHaveAttribute("aria-invalid", "true")
    expect(
      fetchMock.mock.calls.some(
        ([entrada, init]) =>
          String(entrada) === "/api/admin/enlaces-registro" && init?.method === "POST",
      ),
    ).toBe(false)
  })

  it("el campo de vigencia usa autoComplete=off", async () => {
    stubApi({})
    renderVista()
    await screen.findByRole("button", { name: /^Revocar\b/ })
    expect(screen.getByLabelText("Vigencia en días")).toHaveAttribute("autocomplete", "off")
  })

  it("'Copiar enlace' copia la URL y avisa del éxito", async () => {
    stubApi({})
    renderVista()
    await screen.findByRole("button", { name: /^Revocar\b/ })
    fireEvent.click(screen.getByRole("button", { name: "Generar enlace" }))
    const copiar = await screen.findByRole("button", { name: "Copiar enlace" })

    fireEvent.click(copiar)

    await waitFor(() =>
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
        `${window.location.origin}/registro-maestro#token=${TOKEN}`,
      ),
    )
    await waitFor(() => expect(aviso.success).toHaveBeenCalledTimes(1))
    expect(aviso.error).not.toHaveBeenCalled()
  })

  it("'Copiar enlace' avisa del fallo si el portapapeles lo rechaza", async () => {
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: vi.fn(() => Promise.reject(new Error("denegado"))) },
      configurable: true,
    })
    stubApi({})
    renderVista()
    await screen.findByRole("button", { name: /^Revocar\b/ })
    fireEvent.click(screen.getByRole("button", { name: "Generar enlace" }))
    const copiar = await screen.findByRole("button", { name: "Copiar enlace" })

    fireEvent.click(copiar)

    await waitFor(() => expect(aviso.error).toHaveBeenCalledTimes(1))
    expect(aviso.success).not.toHaveBeenCalled()
    expect(copiar).not.toHaveAttribute("aria-busy", "true")
  })

  it("el token generado no queda en la caché de consultas ni en la de mutaciones", async () => {
    stubApi({})
    const { queryClient } = renderVista()
    await screen.findByRole("button", { name: /^Revocar\b/ })
    fireEvent.click(screen.getByRole("button", { name: "Generar enlace" }))
    await screen.findByRole("button", { name: "Copiar enlace" })

    expect(volcadoDeConsultas(queryClient)).not.toContain(TOKEN)
    await waitFor(() => expect(volcadoDeMutaciones(queryClient)).not.toContain(TOKEN))
  })

  it("la tabla muestra las tres insignias de estado con texto", async () => {
    stubApi({
      lista: () =>
        respuestaJson(200, {
          enlaces: [
            enlace(1),
            enlace(2, { estado: "vencido" }),
            enlace(3, { estado: "revocado", revocadoEn: "2026-09-27T10:00:00.000Z" }),
          ],
          siguienteCursor: null,
        }),
    })
    renderVista()

    expect(await screen.findByText("Vigente")).toBeInTheDocument()
    expect(screen.getByText("Vencido")).toBeInTheDocument()
    expect(screen.getByText("Revocado")).toBeInTheDocument()
  })

  it("ver registrados abre la tabla y 'Cargar más' pide la siguiente página", async () => {
    let pagina = 0
    stubApi({
      registrados: () => {
        pagina += 1
        const idAna = "2a2b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d01"
        if (pagina === 1) {
          return respuestaJson(200, {
            registrados: [
              {
                id: idAna,
                nombre: "Ana",
                email: "ana@ejemplo.mx",
                creadoEn: "2026-09-21T10:00:00.000Z",
              },
            ],
            siguienteCursor: idAna,
          })
        }
        return respuestaJson(200, {
          registrados: [
            {
              id: "2a2b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d02",
              nombre: "Beto",
              email: "beto@ejemplo.mx",
              creadoEn: "2026-09-22T10:00:00.000Z",
            },
          ],
          siguienteCursor: null,
        })
      },
    })
    renderVista()

    fireEvent.click(await screen.findByRole("button", { name: /^Ver registrados\b/ }))
    expect(await screen.findByText("Ana")).toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: /^Cargar más\b/ }))
    expect(await screen.findByText("Beto")).toBeInTheDocument()
  })

  it("'Cargar más' de los registrados queda en espera mientras llega la página", async () => {
    const idAna = "2a2b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d01"
    const pendiente = diferida()
    let pagina = 0
    stubApi({
      registrados: () => {
        pagina += 1
        if (pagina === 1) {
          return respuestaJson(200, {
            registrados: [
              {
                id: idAna,
                nombre: "Ana",
                email: "ana@ejemplo.mx",
                creadoEn: "2026-09-21T10:00:00.000Z",
              },
            ],
            siguienteCursor: idAna,
          })
        }
        return pendiente.promesa
      },
    })
    renderVista()

    fireEvent.click(await screen.findByRole("button", { name: /^Ver registrados\b/ }))
    await screen.findByText("Ana")
    const cargarMas = screen.getByRole("button", { name: /^Cargar más\b/ })
    act(() => cargarMas.focus())

    fireEvent.click(cargarMas)

    await waitFor(() => expect(cargarMas).toHaveAttribute("aria-busy", "true"))
    expect(document.activeElement).toBe(cargarMas)

    pendiente.resolver(
      respuestaJson(200, {
        registrados: [
          {
            id: "2a2b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d02",
            nombre: "Beto",
            email: "beto@ejemplo.mx",
            creadoEn: "2026-09-22T10:00:00.000Z",
          },
        ],
        siguienteCursor: null,
      }),
    )
    await screen.findByText("Beto")
  })

  it("los cuatro botones de fila llevan en su nombre accesible la fecha de creación del enlace (Enmienda 6)", async () => {
    stubApi({})
    renderVista()
    const fecha = formatearFechaHora(enlace(1).creadoEn)

    await screen.findByRole("button", { name: `Revocar el enlace creado el ${fecha}` })
    expect(
      screen.getByRole("button", { name: `Ver registrados del enlace creado el ${fecha}` }),
    ).toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: `Revocar el enlace creado el ${fecha}` }))

    expect(
      await screen.findByRole("button", { name: `Sí, revocar el enlace creado el ${fecha}` }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: `Cancelar la revocación del enlace creado el ${fecha}` }),
    ).toBeInTheDocument()
  })

  it("el vacío de registrados muestra el título, sin acción", async () => {
    stubApi({ registrados: () => respuestaJson(200, { registrados: [], siguienteCursor: null }) })
    renderVista()

    fireEvent.click(await screen.findByRole("button", { name: /^Ver registrados\b/ }))
    const vacio = await screen.findByText("Nadie se ha registrado con este enlace")
    const celda = vacio.closest("td")
    if (!celda) throw new Error("el vacío no está dentro de la fila expandida")
    expect(within(celda).queryAllByRole("button")).toHaveLength(0)
  })

  it("revoca un enlace con la confirmación en línea", async () => {
    const fetchMock = stubApi({})
    renderVista()

    fireEvent.click(await screen.findByRole("button", { name: /^Revocar\b/ }))
    expect(
      screen.getByText(
        "Quien tenga este enlace ya no podrá registrarse. Las cuentas ya creadas no cambian.",
      ),
    ).toBeInTheDocument()
    fireEvent.click(await screen.findByRole("button", { name: /^Sí, revocar\b/ }))

    await waitFor(() =>
      expect(
        fetchMock.mock.calls.some(
          ([entrada, init]) => String(entrada).endsWith("/revocar") && init?.method === "POST",
        ),
      ).toBe(true),
    )
    await waitFor(() =>
      expect(screen.queryByRole("button", { name: /^Sí, revocar\b/ })).not.toBeInTheDocument(),
    )
  })

  it("el vacío de la lista muestra 'Generar el primer enlace' en outline, lleva el foco a la vigencia y ningún nombre de botón se repite", async () => {
    stubApi({ lista: () => respuestaJson(200, { enlaces: [], siguienteCursor: null }) })
    renderVista()

    const accion = await screen.findByRole("button", { name: "Generar el primer enlace" })
    expect(screen.getByText("Aún no has generado enlaces de registro")).toBeInTheDocument()
    expect(accion).toHaveAttribute("data-variant", "outline")

    const nombres = screen.getAllByRole("button").map((boton) => boton.textContent)
    expect(new Set(nombres).size, nombres.join(" | ")).toBe(nombres.length)

    fireEvent.click(accion)

    expect(document.activeElement).toBe(screen.getByLabelText("Vigencia en días"))
  })

  it("estados en el orden error → carga → vacío → datos", async () => {
    // Error: MensajeError, sin tabla ni vacío.
    stubApi({ lista: () => errorJson(500, "ERROR_INTERNO") })
    const primero = renderVista()
    expect(await screen.findByRole("alert")).toBeInTheDocument()
    expect(screen.queryByRole("table")).not.toBeInTheDocument()
    expect(screen.queryByText("Aún no has generado enlaces de registro")).not.toBeInTheDocument()
    primero.unmount()

    // Carga: Cargando, sin tabla ni vacío.
    const pendiente = diferida()
    stubApi({ lista: () => pendiente.promesa })
    const segundo = renderVista()
    expect(await screen.findByRole("status")).toHaveTextContent(/Cargando/)
    expect(screen.queryByRole("table")).not.toBeInTheDocument()
    expect(screen.queryByText("Aún no has generado enlaces de registro")).not.toBeInTheDocument()
    pendiente.resolver(respuestaJson(200, { enlaces: [enlace(1)], siguienteCursor: null }))
    await screen.findByRole("table")
    segundo.unmount()

    // Vacío: el título del vacío, sin tabla.
    stubApi({ lista: () => respuestaJson(200, { enlaces: [], siguienteCursor: null }) })
    const tercero = renderVista()
    expect(await screen.findByText("Aún no has generado enlaces de registro")).toBeInTheDocument()
    expect(screen.queryByRole("table")).not.toBeInTheDocument()
    expect(screen.queryByRole("alert")).not.toBeInTheDocument()
    tercero.unmount()

    // Datos: la tabla, sin vacío ni error.
    stubApi({})
    const cuarto = renderVista()
    expect(await screen.findByRole("table")).toBeInTheDocument()
    expect(screen.queryByText("Aún no has generado enlaces de registro")).not.toBeInTheDocument()
    expect(screen.queryByRole("alert")).not.toBeInTheDocument()
    cuarto.unmount()
  })

  // AUTH-03c, §D-C6: invitación masiva ("Pruebas requeridas" 03c).
  describe("invitación masiva", () => {
    const escribirLista = (texto: string) =>
      fireEvent.change(screen.getByLabelText("Lista de maestros"), { target: { value: texto } })

    it("el contador de líneas cambia al escribir", async () => {
      stubApi({})
      renderVista()
      await screen.findByRole("button", { name: /^Revocar\b/ })
      expect(screen.getByText("0 de 100 líneas")).toBeInTheDocument()

      escribirLista("ana@colegio.mx\nluis@colegio.mx")

      expect(await screen.findByText("2 de 100 líneas")).toBeInTheDocument()
    })

    it("más de 100 líneas: ErrorDeCampo y ninguna petición", async () => {
      const fetchMock = stubApi({})
      renderVista()
      await screen.findByRole("button", { name: /^Revocar\b/ })

      const lista = Array.from({ length: 101 }, (_, i) => `maestro${String(i)}@colegio.mx`).join(
        "\n",
      )
      escribirLista(lista)
      fireEvent.click(screen.getByRole("button", { name: "Enviar invitaciones" }))

      expect(await screen.findByLabelText("Lista de maestros")).toHaveAttribute(
        "aria-invalid",
        "true",
      )
      expect(
        fetchMock.mock.calls.some(
          ([entrada, init]) =>
            String(entrada) === "/api/admin/maestros/lote" && init?.method === "POST",
        ),
      ).toBe(false)
    })

    it("el campo de la lista usa autoComplete=off", async () => {
      stubApi({})
      renderVista()
      await screen.findByRole("button", { name: /^Revocar\b/ })
      expect(screen.getByLabelText("Lista de maestros")).toHaveAttribute("autocomplete", "off")
    })

    it("'Enviar invitaciones' en espera mientras la petición está en vuelo", async () => {
      const pendiente = diferida()
      stubApi({ lote: () => pendiente.promesa })
      renderVista()
      await screen.findByRole("button", { name: /^Revocar\b/ })
      escribirLista("ana@colegio.mx")
      const enviar = screen.getByRole("button", { name: "Enviar invitaciones" })

      fireEvent.click(enviar)

      await waitFor(() => expect(enviar).toHaveAttribute("aria-busy", "true"))

      pendiente.resolver(
        respuestaJson(200, {
          enviadas: [{ email: "ana@colegio.mx", nombre: null }],
          yaExistentes: [],
          invalidas: [],
        }),
      )
      await waitFor(() => expect(enviar).not.toHaveAttribute("aria-busy", "true"))
    })

    it("el resultado muestra los tres grupos y ninguno vacío", async () => {
      stubApi({
        lote: () =>
          respuestaJson(200, {
            enviadas: [{ email: "ana@colegio.mx", nombre: "Ana López" }],
            yaExistentes: [{ linea: 2, email: "existente@colegio.mx" }],
            invalidas: [{ linea: 3, texto: "no-es-un-correo", motivo: "correo_invalido" }],
          }),
      })
      renderVista()
      await screen.findByRole("button", { name: /^Revocar\b/ })
      escribirLista("ana@colegio.mx, Ana López\nexistente@colegio.mx\nno-es-un-correo")

      fireEvent.click(screen.getByRole("button", { name: "Enviar invitaciones" }))

      expect(
        await screen.findByText("Invitaciones enviadas: 1 · Ya tenían cuenta: 1 · No válidas: 1"),
      ).toBeInTheDocument()
      expect(screen.getByText(/Invitaciones enviadas \(1\)/)).toBeInTheDocument()
      expect(screen.getByText(/Ya tenían cuenta \(1\)/)).toBeInTheDocument()
      expect(screen.getByText(/No válidas \(1\)/)).toBeInTheDocument()
      expect(screen.getByText("ana@colegio.mx — Ana López")).toBeInTheDocument()
      expect(screen.getByText("Línea 2 · existente@colegio.mx")).toBeInTheDocument()
      // T-15 (ronda 1, AUTH-03c): el separador va antes del motivo, así se lee "Línea N · texto ·
      // motivo" (§D-C6) y no "textoMotivo" pegados.
      const invalida = screen.getByText("Correo no válido").closest("li")
      if (!invalida) throw new Error("la línea inválida no tiene contenedor")
      expect(invalida).toHaveTextContent("Línea 3 · no-es-un-correo · Correo no válido")
    })

    it("un grupo vacío no se muestra", async () => {
      stubApi({
        lote: () =>
          respuestaJson(200, {
            enviadas: [{ email: "ana@colegio.mx", nombre: null }],
            yaExistentes: [],
            invalidas: [],
          }),
      })
      renderVista()
      await screen.findByRole("button", { name: /^Revocar\b/ })
      escribirLista("ana@colegio.mx")

      fireEvent.click(screen.getByRole("button", { name: "Enviar invitaciones" }))

      expect(
        await screen.findByText(
          "ana@colegio.mx — Sin nombre: podrá escribirlo al activar su cuenta.",
        ),
      ).toBeInTheDocument()
      expect(screen.queryByRole("heading", { name: /Ya tenían cuenta/ })).not.toBeInTheDocument()
      expect(screen.queryByRole("heading", { name: /No válidas/ })).not.toBeInTheDocument()
    })

    it("CUPO_DIARIO_INSUFICIENTE muestra el mensaje del servidor", async () => {
      stubApi({
        lote: () =>
          respuestaJson(409, {
            error: {
              codigo: "CUPO_DIARIO_INSUFICIENTE",
              mensaje:
                "Hoy solo puedes enviar 3 invitaciones más. Quita líneas de la lista o inténtalo mañana.",
            },
          }),
      })
      renderVista()
      await screen.findByRole("button", { name: /^Revocar\b/ })
      escribirLista("ana@colegio.mx")

      fireEvent.click(screen.getByRole("button", { name: "Enviar invitaciones" }))

      expect(
        await screen.findByText(
          "Hoy solo puedes enviar 3 invitaciones más. Quita líneas de la lista o inténtalo mañana.",
        ),
      ).toBeInTheDocument()
    })

    it("un solo botón primary en la vista", async () => {
      stubApi({})
      renderVista()
      await screen.findByRole("button", { name: /^Revocar\b/ })

      const primarios = screen
        .getAllByRole("button")
        .filter((boton) => boton.getAttribute("data-variant") === "primary")
      expect(primarios.map((boton) => boton.textContent)).toEqual(["Enviar invitaciones"])
    })
  })
})
