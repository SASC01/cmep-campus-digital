import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { formatearFechaHora } from "@/lib/format"

import { MaestrosView } from "./maestros-view"

// Ataques del Tester (AUTH-03b, ronda 1) contra /admin/maestros (§D-B6, DESIGN.md §7.8, §7.10,
// §7.13 y §7.14; plan, "Puntos de ataque" AUTH-03b, punto 3): el enlace nuevo fuera de toda caché
// y desmontado; el foco de "Copiar enlace" (T-14); la confirmación en línea; EstadoVacio; los
// estados de error, carga, vacío y datos; los nombres de botón repetidos; las insignias. API
// simulada con fetch; se localiza por rol, etiqueta y texto accesible (nunca por clases).

const aviso = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }))
vi.mock("sonner", () => ({ toast: aviso }))

const TOKEN = `Tk03bR1${"q".repeat(36)}`

const respuestaJson = (estado: number, cuerpo: unknown) =>
  new Response(JSON.stringify(cuerpo), {
    status: estado,
    headers: { "Content-Type": "application/json" },
  })

const errorJson = (estado: number, codigo: string, mensaje = "mensaje del servidor") =>
  respuestaJson(estado, { error: { codigo, mensaje } })

const diferida = () => {
  let resolver: (respuesta: Response) => void = () => {
    throw new Error("la respuesta diferida se resolvió antes de crearse")
  }
  const promesa = new Promise<Response>((r) => {
    resolver = r
  })
  return { promesa, resolver: (respuesta: Response) => resolver(respuesta) }
}

type Diferida = ReturnType<typeof diferida>

const enlace = (n: number, extra: Record<string, unknown> = {}) => ({
  id: `0b5d7a3e-1c1f-4b8e-9a1e-0f2a3b4c5d${String(n).padStart(2, "0")}`,
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
  revocar?: () => Response | Promise<Response>
  registrados?: () => Response | Promise<Response>
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
        api.generar?.() ??
          respuestaJson(201, {
            enlace: enlace(9),
            token: TOKEN,
          }),
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
    return Promise.resolve(errorJson(500, "ERROR_INTERNO"))
  })
  vi.stubGlobal("fetch", fetchMock)
  return fetchMock
}

const llamadas = (fetchMock: ReturnType<typeof stubApi>, fragmento: string, metodo: string) =>
  fetchMock.mock.calls.filter(
    ([entrada, init]) => String(entrada).includes(fragmento) && (init?.method ?? "GET") === metodo,
  ).length

const renderVista = () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const resultado = render(
    <QueryClientProvider client={queryClient}>
      <MaestrosView />
    </QueryClientProvider>,
  )
  return { queryClient, ...resultado }
}

const volcadoDeLaCache = (queryClient: QueryClient): string =>
  JSON.stringify({
    consultas: queryClient
      .getQueryCache()
      .getAll()
      .map((consulta) => ({ clave: consulta.queryKey, estado: consulta.state })),
    mutaciones: queryClient
      .getMutationCache()
      .getAll()
      .map((mutacion) => ({ clave: mutacion.options.mutationKey, estado: mutacion.state })),
  })

const esperarUnMomento = () => act(() => new Promise((resolver) => setTimeout(resolver, 30)))

const resolverCon = async (pendiente: Diferida, respuesta: Response) => {
  await act(async () => {
    pendiente.resolver(respuesta)
    await pendiente.promesa
  })
}

const describirFoco = () => {
  const conFoco = document.activeElement
  if (!conFoco || conFoco === document.body) return "<body>"
  return `${conFoco.tagName.toLowerCase()} "${conFoco.textContent || conFoco.id}"`
}

const campoVigencia = () => screen.getByLabelText("Vigencia en días")
// AUTH-03b ronda 2 (arbitraje de T-10, Enmienda 6): el nombre accesible de los botones de fila suma,
// después del texto visible, "… el enlace creado el <fecha>". Sus localizadores pasan de nombre
// exacto a una expresión anclada al inicio del texto visible; lo que comprueba cada caso no cambia.
const REVOCAR = /^Revocar( |$)/
const SI_REVOCAR = /^Sí, revocar( |$)/
const CANCELAR = /^Cancelar( |$)/
const VER_REGISTRADOS = /^Ver registrados( |$)/
const OCULTAR_REGISTRADOS = /^Ocultar registrados( |$)/
const CARGAR_MAS = /^Cargar más( |$)/

const boton = (nombre: string | RegExp) => screen.getByRole("button", { name: nombre })

beforeEach(() => {
  aviso.success.mockClear()
  aviso.error.mockClear()
  Object.defineProperty(navigator, "clipboard", {
    value: { writeText: vi.fn(() => Promise.resolve()) },
    configurable: true,
  })
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("ataque (AUTH-03b r1): el enlace nuevo (§7.13)", () => {
  it("se muestra con el origen y #token=, no queda en ninguna caché y desaparece al desmontar", async () => {
    stubApi({})
    const { queryClient, unmount } = renderVista()
    await screen.findByRole("button", { name: REVOCAR })
    fireEvent.click(boton("Generar enlace"))
    await screen.findByRole("button", { name: "Copiar enlace" })
    await esperarUnMomento()

    expect(
      screen.getByText(`${window.location.origin}/registro-maestro#token=${TOKEN}`),
    ).toBeVisible()
    expect(volcadoDeLaCache(queryClient)).not.toContain(TOKEN)
    expect(window.localStorage.length + window.sessionStorage.length).toBe(0)
    unmount()
    expect(document.body.innerHTML).not.toContain(TOKEN)
    expect(volcadoDeLaCache(queryClient)).not.toContain(TOKEN)
  })

  it("T-14: si el admin toma el campo 'Vigencia en días' con la petición en vuelo, 'Copiar enlace' no le roba el foco", async () => {
    const pendiente = diferida()
    stubApi({ generar: () => pendiente.promesa })
    renderVista()
    await screen.findByRole("button", { name: REVOCAR })
    const generar = boton("Generar enlace")
    act(() => generar.focus())
    fireEvent.click(generar)
    await waitFor(() => expect(boton("Generar enlace")).toHaveAttribute("aria-busy", "true"))

    const campo = campoVigencia()
    act(() => campo.focus())
    await resolverCon(pendiente, respuestaJson(201, { enlace: enlace(9), token: TOKEN }))
    await screen.findByRole("button", { name: "Copiar enlace" })
    await esperarUnMomento()

    expect(document.activeElement, `el foco quedó en ${describirFoco()}`).toBe(campo)
  })

  it("T-14: si el admin se fue a 'Ver registrados' con la petición en vuelo, el foco se queda ahí", async () => {
    const pendiente = diferida()
    stubApi({ generar: () => pendiente.promesa })
    renderVista()
    const ver = await screen.findByRole("button", { name: VER_REGISTRADOS })
    fireEvent.click(boton("Generar enlace"))
    act(() => ver.focus())
    await resolverCon(pendiente, respuestaJson(201, { enlace: enlace(9), token: TOKEN }))
    await screen.findByRole("button", { name: "Copiar enlace" })
    await esperarUnMomento()

    expect(document.activeElement, `el foco quedó en ${describirFoco()}`).toBe(ver)
  })

  it("clic triple y los dos envíos del formulario: una sola petición, en espera y con el foco", async () => {
    const pendiente = diferida()
    const fetchMock = stubApi({ generar: () => pendiente.promesa })
    renderVista()
    await screen.findByRole("button", { name: REVOCAR })
    const generar = boton("Generar enlace")
    act(() => generar.focus())
    fireEvent.click(generar)
    fireEvent.click(generar)
    fireEvent.click(generar)
    const formulario = generar.closest("form")
    if (!formulario) throw new Error("'Generar enlace' no está dentro de un formulario")
    fireEvent.submit(formulario)
    act(() => formulario.requestSubmit())
    await esperarUnMomento()
    expect(llamadas(fetchMock, "/api/admin/enlaces-registro", "POST")).toBe(1)
    expect(boton("Generar enlace")).toHaveAttribute("aria-busy", "true")
    expect(document.activeElement).toBe(boton("Generar enlace"))
    await resolverCon(pendiente, respuestaJson(201, { enlace: enlace(9), token: TOKEN }))
  })

  it.each(["0", "31", "1.5", "-3"])(
    "vigencia %s: ErrorDeCampo descrito por el campo y ninguna petición",
    async (valor) => {
      const fetchMock = stubApi({})
      renderVista()
      await screen.findByRole("button", { name: REVOCAR })
      fireEvent.change(campoVigencia(), { target: { value: valor } })
      fireEvent.click(boton("Generar enlace"))
      await esperarUnMomento()

      expect(campoVigencia()).toHaveAttribute("aria-invalid", "true")
      const descrito = campoVigencia().getAttribute("aria-describedby") ?? ""
      expect(descrito).not.toBe("")
      expect(document.getElementById(descrito)?.textContent ?? "").not.toBe("")
      expect(llamadas(fetchMock, "/api/admin/enlaces-registro", "POST")).toBe(0)
      expect(campoVigencia()).toHaveAttribute("autocomplete", "off")
    },
  )

  it("'Copiar enlace' copia exactamente la URL y avisa; si el portapapeles falla, avisa del error", async () => {
    stubApi({})
    renderVista()
    await screen.findByRole("button", { name: REVOCAR })
    fireEvent.click(boton("Generar enlace"))
    const copiar = await screen.findByRole("button", { name: "Copiar enlace" })
    fireEvent.click(copiar)
    await waitFor(() => expect(aviso.success).toHaveBeenCalledTimes(1))
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      `${window.location.origin}/registro-maestro#token=${TOKEN}`,
    )

    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: vi.fn(() => Promise.reject(new Error("denegado"))) },
      configurable: true,
    })
    fireEvent.click(boton("Copiar enlace"))
    await waitFor(() => expect(aviso.error).toHaveBeenCalledTimes(1))
    expect(boton("Copiar enlace")).not.toHaveAttribute("aria-busy", "true")
  })
})

describe("ataque (AUTH-03b r1): la confirmación en línea de 'Revocar' (§7.14)", () => {
  it("al pedir la confirmación, el foco va a 'Cancelar' (nunca a <body> ni a 'Sí, revocar')", async () => {
    stubApi({})
    renderVista()
    const revocar = await screen.findByRole("button", { name: REVOCAR })
    act(() => revocar.focus())
    fireEvent.click(revocar)
    await screen.findByRole("button", { name: SI_REVOCAR })
    await esperarUnMomento()

    expect(document.activeElement, `el foco quedó en ${describirFoco()}`).toBe(boton(CANCELAR))
  })

  it("al cancelar, el foco vuelve a 'Revocar' (nunca a <body>)", async () => {
    stubApi({})
    renderVista()
    const revocar = await screen.findByRole("button", { name: REVOCAR })
    fireEvent.click(revocar)
    const cancelar = await screen.findByRole("button", { name: CANCELAR })
    act(() => cancelar.focus())
    fireEvent.click(cancelar)
    await screen.findByRole("button", { name: REVOCAR })
    await esperarUnMomento()

    expect(document.activeElement, `el foco quedó en ${describirFoco()}`).toBe(boton(REVOCAR))
  })

  it("la frase de consecuencia va antes de 'Sí, revocar' en el orden de lectura", async () => {
    stubApi({})
    renderVista()
    fireEvent.click(await screen.findByRole("button", { name: REVOCAR }))
    const frase = await screen.findByText(
      "Quien tenga este enlace ya no podrá registrarse. Las cuentas ya creadas no cambian.",
    )
    const si = boton(SI_REVOCAR)
    expect(
      frase.compareDocumentPosition(si) & Node.DOCUMENT_POSITION_FOLLOWING,
      "'Sí, revocar' se lee antes que la frase que explica la consecuencia",
    ).toBeTruthy()
  })

  it("doble clic y Enter repetido sobre 'Sí, revocar': una sola petición, en espera y sin disabled", async () => {
    const pendiente = diferida()
    const fetchMock = stubApi({ revocar: () => pendiente.promesa })
    renderVista()
    fireEvent.click(await screen.findByRole("button", { name: REVOCAR }))
    const si = await screen.findByRole("button", { name: SI_REVOCAR })
    fireEvent.click(si)
    fireEvent.click(si)
    fireEvent.keyDown(si, { key: "Enter" })
    await waitFor(() => expect(boton(SI_REVOCAR)).toHaveAttribute("aria-busy", "true"))
    fireEvent.click(boton(SI_REVOCAR))
    await esperarUnMomento()

    expect(llamadas(fetchMock, "/revocar", "POST")).toBe(1)
    expect(boton(SI_REVOCAR)).not.toHaveAttribute("disabled")
    await resolverCon(
      pendiente,
      respuestaJson(200, {
        enlace: enlace(1, { estado: "revocado", revocadoEn: "2026-09-28T16:00:00.000Z" }),
      }),
    )
  })
})

describe("ataque (AUTH-03b r1): estados de la lista y nombres de botón", () => {
  it("error de la lista: MensajeError, sin tabla ni acción de vacío; el formulario de generar sigue", async () => {
    stubApi({ lista: () => errorJson(500, "ERROR_INTERNO") })
    renderVista()
    expect(await screen.findByRole("alert")).toBeVisible()
    expect(screen.queryByRole("table")).toBeNull()
    expect(screen.queryByRole("button", { name: "Generar el primer enlace" })).toBeNull()
    expect(boton("Generar enlace")).toBeVisible()
  })

  it("mientras carga: Cargando, sin tabla ni vacío", async () => {
    const pendiente = diferida()
    stubApi({ lista: () => pendiente.promesa })
    renderVista()
    expect(await screen.findByRole("status")).toHaveTextContent(/Cargando/)
    expect(screen.queryByRole("table")).toBeNull()
    expect(screen.queryByText("Aún no has generado enlaces de registro")).toBeNull()
    await resolverCon(pendiente, respuestaJson(200, { enlaces: [], siguienteCursor: null }))
  })

  it("vacío: título, frase y 'Generar el primer enlace', que lleva el foco a la vigencia; ningún nombre de botón repetido", async () => {
    stubApi({ lista: () => respuestaJson(200, { enlaces: [], siguienteCursor: null }) })
    renderVista()
    const accion = await screen.findByRole("button", { name: "Generar el primer enlace" })
    expect(screen.getByText("Aún no has generado enlaces de registro")).toBeVisible()
    expect(
      screen.getByText("Genera uno y compártelo con los maestros que quieras dar de alta."),
    ).toBeVisible()
    fireEvent.click(accion)
    expect(document.activeElement).toBe(campoVigencia())
    const nombres = screen.getAllByRole("button").map((b) => b.textContent)
    expect(new Set(nombres).size, nombres.join(" | ")).toBe(nombres.length)
  })

  // AUTH-03b ronda 2 (arbitraje de T-10, Enmienda 6 y R-18): antes comparaba `aria-label ??
  // textContent`, que un texto oculto a los lectores de pantalla (aria-hidden) satisfacía. Ahora
  // compara el nombre accesible calculado (el que usa getByRole), en tres momentos: con las dos filas
  // cerradas, con las dos confirmaciones abiertas y con las dos filas expandidas con más de 20
  // registrados ("Cargar más", R-18). Exige además el nombre exacto de la Enmienda 6 para cada botón
  // de fila y que el dato de la fila no llegue por aria-label, aria-labelledby ni aria-hidden.
  it("con dos enlaces vigentes, ningún nombre accesible de botón se repite: cerradas, con las dos confirmaciones abiertas y con las dos filas expandidas con más de 20 registrados", async () => {
    const registrados = Array.from({ length: 20 }, (_, i) => ({
      id: `0c5d7a3e-1c1f-4b8e-9a1e-0f2a3b4c5d${i.toString(16).padStart(2, "0")}`,
      nombre: `Registrado ${i}`,
      email: `registrado${i}@ejemplo.mx`,
      creadoEn: "2026-09-25T12:00:00.000Z",
    }))
    stubApi({
      lista: () => respuestaJson(200, { enlaces: [enlace(1), enlace(2)], siguienteCursor: null }),
      registrados: () =>
        respuestaJson(200, {
          registrados,
          siguienteCursor: "0c5d7a3e-1c1f-4b8e-9a1e-0f2a3b4c5dff",
        }),
    })
    renderVista()

    // Nombre accesible calculado de cada botón, tal como lo resuelve Testing Library.
    const nombresCalculados = (): Map<HTMLElement, string> => {
      const nombres = new Map<HTMLElement, string>()
      screen.getAllByRole("button", {
        name: (nombre, elemento) => {
          if (elemento instanceof HTMLElement) nombres.set(elemento, nombre)
          return true
        },
      })
      return nombres
    }
    const sinRepetidos = (momento: string) => {
      const nombres = nombresCalculados()
      expect(nombres.size, momento).toBe(screen.getAllByRole("button").length)
      const lista = [...nombres.values()]
      const repetidos = lista.filter((n, i) => lista.indexOf(n) !== i)
      expect(repetidos, `${momento}: botones con el mismo nombre accesible`).toEqual([])
      for (const nombre of lista) {
        expect(
          screen.getAllByRole("button", { name: nombre }),
          `${momento}: "${nombre}"`,
        ).toHaveLength(1)
      }
      return nombres
    }
    const fechas = [enlace(1), enlace(2)].map((e) => formatearFechaHora(e.creadoEn))
    const exigirNombres = (plantillas: ((fecha: string) => string)[]) => {
      for (const fecha of fechas) {
        for (const plantilla of plantillas) {
          expect(
            screen.getAllByRole("button", { name: plantilla(fecha) }),
            plantilla(fecha),
          ).toHaveLength(1)
        }
      }
    }

    const revocar = await screen.findAllByRole("button", { name: REVOCAR })
    expect(revocar).toHaveLength(2)
    sinRepetidos("con las dos filas cerradas")
    exigirNombres([
      (fecha) => `Ver registrados del enlace creado el ${fecha}`,
      (fecha) => `Revocar el enlace creado el ${fecha}`,
    ])

    for (const control of revocar) fireEvent.click(control)
    expect(await screen.findAllByRole("button", { name: SI_REVOCAR })).toHaveLength(2)
    sinRepetidos("con las dos confirmaciones abiertas")
    exigirNombres([
      (fecha) => `Sí, revocar el enlace creado el ${fecha}`,
      (fecha) => `Cancelar la revocación del enlace creado el ${fecha}`,
    ])

    for (const control of screen.getAllByRole("button", { name: VER_REGISTRADOS })) {
      fireEvent.click(control)
    }
    // Cada fila pide sus registrados por separado: se espera a que estén los dos "Cargar más".
    await waitFor(() => expect(screen.getAllByRole("button", { name: CARGAR_MAS })).toHaveLength(2))
    const nombres = sinRepetidos("con las dos filas expandidas y más de 20 registrados")
    exigirNombres([
      (fecha) => `Ocultar registrados del enlace creado el ${fecha}`,
      (fecha) => `Cargar más registrados del enlace creado el ${fecha}`,
    ])

    // El dato de la fila vive en un elemento propio dentro del botón, después del texto visible,
    // y no llega por aria-label ni aria-labelledby; nada con texto dentro del botón es aria-hidden.
    const deFila = [...nombres].filter(([, nombre]) => / enlace creado el /.test(nombre))
    expect(deFila).toHaveLength(8)
    for (const [elemento, nombre] of deFila) {
      expect(elemento, nombre).not.toHaveAttribute("aria-label")
      expect(elemento, nombre).not.toHaveAttribute("aria-labelledby")
      expect(elemento.closest("[aria-hidden]"), nombre).toBeNull()
      const ocultosConTexto = Array.from(elemento.querySelectorAll("[aria-hidden]")).filter(
        (hijo) => (hijo.textContent ?? "").trim() !== "",
      )
      expect(ocultosConTexto, nombre).toEqual([])
      const dato = nombre.slice(nombre.indexOf(" enlace creado el ") + 1)
      const contenedores = Array.from(elemento.querySelectorAll("*")).filter((hijo) =>
        (hijo.textContent ?? "").includes(dato),
      )
      expect(
        contenedores.length,
        `${nombre}: el dato de la fila no está en un elemento propio`,
      ).toBeGreaterThan(0)
    }
  })

  it("las tres insignias llevan texto y un icono oculto; solo el vigente ofrece 'Revocar'", async () => {
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
    await screen.findByText("Vigente")
    const filas = screen.getAllByRole("row").slice(1)
    expect(filas).toHaveLength(3)
    for (const [fila, texto] of [
      [filas[0], "Vigente"],
      [filas[1], "Vencido"],
      [filas[2], "Revocado"],
    ] as const) {
      if (!fila) throw new Error("falta una fila")
      const etiqueta = within(fila).getByText(texto)
      const icono = etiqueta.querySelector("svg")
      expect(icono, `${texto} sin icono`).not.toBeNull()
      expect(icono).toHaveAttribute("aria-hidden", "true")
      const conRevocar = within(fila).queryByRole("button", { name: REVOCAR }) !== null
      expect(conRevocar, texto).toBe(texto === "Vigente")
    }
  })

  it("registrados vacío dentro de la fila: el título y ningún botón; con error, MensajeError", async () => {
    let fallar = false
    stubApi({
      registrados: () =>
        fallar
          ? errorJson(500, "ERROR_INTERNO")
          : respuestaJson(200, { registrados: [], siguienteCursor: null }),
    })
    renderVista()
    fireEvent.click(await screen.findByRole("button", { name: VER_REGISTRADOS }))
    const vacio = await screen.findByText("Nadie se ha registrado con este enlace")
    const celda = vacio.closest("td")
    if (!celda) throw new Error("el vacío no está dentro de la fila expandida")
    expect(within(celda).queryAllByRole("button")).toHaveLength(0)
    expect(boton(OCULTAR_REGISTRADOS)).toHaveAttribute("aria-expanded", "true")

    fallar = true
    fireEvent.click(boton(OCULTAR_REGISTRADOS))
    fireEvent.click(boton(VER_REGISTRADOS))
    expect(await screen.findByRole("alert")).toBeVisible()
  })
})

describe("ataque (AUTH-03b r1): valores por defecto que ocultan datos (CLAUDE.md)", () => {
  const fuentes = import.meta.glob<string>("./components/*.tsx", {
    query: "?raw",
    import: "default",
    eager: true,
  })

  it("tabla-enlaces y registrados-del-enlace no usan `?? []` para ocultar datos faltantes", () => {
    const archivos = ["./components/tabla-enlaces.tsx", "./components/registrados-del-enlace.tsx"]
    for (const archivo of archivos) {
      expect(fuentes[archivo], `no se leyó ${archivo}`).toBeDefined()
    }
    const infractores = archivos.filter((archivo) => /\?\?\s*\[\]/.test(fuentes[archivo] ?? ""))
    expect(infractores).toEqual([])
  })
})
