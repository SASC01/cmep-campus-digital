import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import { MaestrosView } from "./maestros-view"

// Ataques del Tester (AUTH-03c, ronda 1) contra el panel "Invitar a varios maestros" de
// /admin/maestros (§D-C6, §D-C7; DESIGN.md §7.3 y §7.15; plan, "Puntos de ataque" AUTH-03c,
// punto 3): contador con CRLF, límites en cliente, resultado sin grupos vacíos, mensaje del cupo,
// un solo primary, un único role="status" y el doble envío. API simulada con fetch; se localiza por
// rol, etiqueta y texto accesible (nunca por clases).

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

const enlace = (n: number) => ({
  id: `0b5d7a3e-1c1f-4b8e-9a1e-0f2a3b4c5d${String(n).padStart(2, "0")}`,
  creadoEn: `2026-09-2${n}T15:00:00.000Z`,
  expiraEn: `2026-10-0${n}T15:00:00.000Z`,
  revocadoEn: null,
  estado: "vigente",
  registrados: 0,
})

const RESULTADO_VACIO = { enviadas: [], yaExistentes: [], invalidas: [] }

interface Api {
  lista?: () => Response | Promise<Response>
  lote?: () => Response | Promise<Response>
  generar?: () => Response | Promise<Response>
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
    if (ruta === "/api/admin/maestros/lote" && metodo === "POST") {
      return Promise.resolve(api.lote?.() ?? respuestaJson(200, RESULTADO_VACIO))
    }
    if (ruta === "/api/admin/enlaces-registro" && metodo === "POST") {
      return Promise.resolve(
        api.generar?.() ?? respuestaJson(201, { enlace: enlace(9), token: `T${"k".repeat(42)}` }),
      )
    }
    return Promise.resolve(errorJson(500, "ERROR_INTERNO"))
  })
  vi.stubGlobal("fetch", fetchMock)
  return fetchMock
}

const llamadasAlLote = (fetchMock: ReturnType<typeof stubApi>) =>
  fetchMock.mock.calls.filter(([entrada]) => String(entrada) === "/api/admin/maestros/lote")

const renderVista = () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MaestrosView />
    </QueryClientProvider>,
  )
}

const esperarUnMomento = () => act(() => new Promise((resolver) => setTimeout(resolver, 30)))

const campoLista = () => screen.getByLabelText("Lista de maestros")
const escribirLista = (valor: string) =>
  fireEvent.change(campoLista(), { target: { value: valor } })
const enviar = () => screen.getByRole("button", { name: "Enviar invitaciones" })
const listaCargada = () => screen.findByRole("button", { name: /^Revocar( |$)/ })

const primarios = () =>
  screen.getAllByRole("button").filter((boton) => boton.getAttribute("data-variant") === "primary")

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("ataque (AUTH-03c r1): contador y límites en el cliente", () => {
  it("el contador cuenta solo líneas con contenido, con CRLF, CR sueltos y líneas en blanco", async () => {
    stubApi({})
    renderVista()
    await listaCargada()
    escribirLista("a@x.mx\r\n\r\n   \r\nb@x.mx\rc@x.mx\n\t\n")
    expect(screen.getByText("3 de 100 líneas")).toBeVisible()
  })

  it("101 líneas con contenido y 50 en blanco: el contador dice 101, ErrorDeCampo descrito por el campo y ninguna petición", async () => {
    const fetchMock = stubApi({})
    renderVista()
    await listaCargada()
    const lineas = Array.from(
      { length: 101 },
      (_, i) => `m${String(i)}@x.mx${i < 50 ? "\r\n" : ""}`,
    )
    escribirLista(lineas.join("\r\n"))
    expect(screen.getByText("101 de 100 líneas")).toBeVisible()
    fireEvent.click(enviar())
    await esperarUnMomento()
    expect(campoLista()).toHaveAttribute("aria-invalid", "true")
    const descrito = campoLista().getAttribute("aria-describedby") ?? ""
    const error = descrito
      .split(" ")
      .map((id) => document.getElementById(id)?.textContent ?? "")
      .join(" ")
    expect(error).toMatch(/100 líneas/)
    expect(llamadasAlLote(fetchMock)).toHaveLength(0)
  })

  it("40,001 caracteres en una línea → error en el campo y ninguna petición; 40,000 → una petición con la lista tal cual", async () => {
    const fetchMock = stubApi({})
    renderVista()
    await listaCargada()
    const correo = "ana@x.mx"
    escribirLista(`${correo}${" ".repeat(40_001 - correo.length)}`)
    fireEvent.click(enviar())
    await esperarUnMomento()
    expect(campoLista()).toHaveAttribute("aria-invalid", "true")
    expect(llamadasAlLote(fetchMock)).toHaveLength(0)

    const justa = `${correo}${" ".repeat(40_000 - correo.length)}`
    escribirLista(justa)
    fireEvent.click(enviar())
    await waitFor(() => expect(llamadasAlLote(fetchMock)).toHaveLength(1))
    const [, init] = llamadasAlLote(fetchMock)[0] ?? []
    expect(JSON.parse(String(init?.body))).toEqual({ lista: justa })
  })

  it("la ayuda del formato es la descripción accesible del campo (como la ayuda de los demás campos del proyecto)", async () => {
    stubApi({})
    renderVista()
    await listaCargada()
    expect(campoLista()).toHaveAccessibleDescription(/Un maestro por línea/)
  })
})

describe("ataque (AUTH-03c r1): el resultado (§7.15)", () => {
  const encabezados = () =>
    screen.queryAllByRole("heading", { level: 3 }).map((h) => h.textContent ?? "")

  it("solo inválidas: el resumen en role=status y un único grupo, sin grupos vacíos", async () => {
    stubApi({
      lote: () =>
        respuestaJson(200, {
          ...RESULTADO_VACIO,
          invalidas: [{ linea: 2, texto: "no-es-correo", motivo: "correo_invalido" }],
        }),
    })
    renderVista()
    await listaCargada()
    escribirLista("\nno-es-correo")
    fireEvent.click(enviar())
    expect(await screen.findByRole("status")).toHaveTextContent(
      "Invitaciones enviadas: 0 · Ya tenían cuenta: 0 · No válidas: 1",
    )
    expect(encabezados()).toEqual(["No válidas (1)"])
  })

  it("solo enviadas: un único grupo, con 'Sin nombre' para la que no trajo nombre", async () => {
    stubApi({
      lote: () =>
        respuestaJson(200, {
          ...RESULTADO_VACIO,
          enviadas: [
            { email: "ana@x.mx", nombre: "Ana López" },
            { email: "beto@x.mx", nombre: null },
          ],
        }),
    })
    renderVista()
    await listaCargada()
    escribirLista("ana@x.mx, Ana López\nbeto@x.mx")
    fireEvent.click(enviar())
    await screen.findByRole("status")
    expect(encabezados()).toEqual(["Invitaciones enviadas (2)"])
    expect(
      screen.getByText(/beto@x\.mx.*Sin nombre: podrá escribirlo al activar su cuenta\./),
    ).toBeVisible()
  })

  it("un nombre con <script> se pinta como texto y no crea ningún elemento", async () => {
    const script = "<script>window.__atacado = true</script><img src=x onerror=alert(1)>"
    stubApi({
      lote: () =>
        respuestaJson(200, {
          ...RESULTADO_VACIO,
          enviadas: [{ email: "ana@x.mx", nombre: script }],
          invalidas: [{ linea: 2, texto: script, motivo: "correo_invalido" }],
        }),
    })
    const { container } = renderVista()
    await listaCargada()
    escribirLista("ana@x.mx, x")
    fireEvent.click(enviar())
    await screen.findByRole("status")
    expect(container.querySelectorAll("script, img")).toHaveLength(0)
    expect(screen.getAllByText((texto) => texto.includes(script)).length).toBeGreaterThanOrEqual(2)
    expect((window as unknown as { __atacado?: boolean }).__atacado).toBeUndefined()
  })

  it("cada línea inválida se lee como 'Línea N · texto · motivo' (§D-C6)", async () => {
    stubApi({
      lote: () =>
        respuestaJson(200, {
          ...RESULTADO_VACIO,
          invalidas: [{ linea: 7, texto: "no-es-correo", motivo: "correo_invalido" }],
        }),
    })
    renderVista()
    await listaCargada()
    escribirLista("no-es-correo")
    fireEvent.click(enviar())
    await screen.findByRole("status")
    const lista = screen.getByRole("heading", { level: 3, name: "No válidas (1)" }).parentElement
    if (!lista) throw new Error("el grupo de no válidas no tiene contenedor")
    const [linea] = within(lista).getAllByRole("listitem")
    expect(linea?.textContent).toBe("Línea 7 · no-es-correo · Correo no válido")
  })

  it("CUPO_DIARIO_INSUFICIENTE: una alerta con el mensaje del servidor, sin resumen, y el cuadro conserva lo escrito; al reenviar con éxito, la alerta se va", async () => {
    const mensaje =
      "Hoy solo puedes enviar 3 invitaciones más. Quita líneas de la lista o inténtalo mañana."
    let cupo = true
    stubApi({
      lote: () =>
        cupo
          ? errorJson(409, "CUPO_DIARIO_INSUFICIENTE", mensaje)
          : respuestaJson(200, RESULTADO_VACIO),
    })
    renderVista()
    await listaCargada()
    const escrito = "a@x.mx\nb@x.mx\nc@x.mx\nd@x.mx"
    escribirLista(escrito)
    fireEvent.click(enviar())
    expect(await screen.findByRole("alert")).toHaveTextContent(mensaje)
    expect(screen.queryByRole("status")).toBeNull()
    expect(campoLista()).toHaveValue(escrito)

    cupo = false
    fireEvent.click(enviar())
    await screen.findByRole("status")
    expect(screen.queryByRole("alert")).toBeNull()
    expect(campoLista()).toHaveValue(escrito)
  })
})

describe("ataque (AUTH-03c r1): una sola acción principal y un único status", () => {
  it("un solo primary ('Enviar invitaciones') con la lista, con el vacío, con un enlace nuevo, con la confirmación abierta y con un resultado; 'Generar enlace' en outline", async () => {
    let vacia = true
    stubApi({
      lista: () => respuestaJson(200, { enlaces: vacia ? [] : [enlace(1)], siguienteCursor: null }),
      lote: () =>
        respuestaJson(200, { ...RESULTADO_VACIO, enviadas: [{ email: "a@x.mx", nombre: null }] }),
    })
    const unSoloPrimario = (momento: string) => {
      expect(
        primarios().map((b) => b.textContent),
        momento,
      ).toEqual(["Enviar invitaciones"])
      expect(screen.getByRole("button", { name: "Generar enlace" }), momento).toHaveAttribute(
        "data-variant",
        "outline",
      )
    }
    const { unmount } = renderVista()
    await screen.findByRole("button", { name: "Generar el primer enlace" })
    unSoloPrimario("con el vacío")
    unmount()

    vacia = false
    renderVista()
    const revocar = await listaCargada()
    unSoloPrimario("con la lista")
    fireEvent.click(screen.getByRole("button", { name: "Generar enlace" }))
    await screen.findByRole("button", { name: "Copiar enlace" })
    unSoloPrimario("con un enlace nuevo")
    fireEvent.click(revocar)
    await screen.findByRole("button", { name: /^Sí, revocar( |$)/ })
    unSoloPrimario("con la confirmación abierta")
    escribirLista("a@x.mx")
    fireEvent.click(enviar())
    await screen.findByRole("status")
    unSoloPrimario("con un resultado")
  })

  it("un único role=status en cada momento: Cargando mientras llega la lista; ninguno con la lista cargada (el contador es aria-live, no status); el resumen tras enviar", async () => {
    const pendiente = diferida()
    stubApi({
      lista: () => pendiente.promesa,
      lote: () => respuestaJson(200, RESULTADO_VACIO),
    })
    renderVista()
    const cargando = await screen.findAllByRole("status")
    expect(cargando).toHaveLength(1)
    expect(cargando[0]).toHaveTextContent(/Cargando/)

    await act(async () => {
      pendiente.resolver(respuestaJson(200, { enlaces: [enlace(1)], siguienteCursor: null }))
      await pendiente.promesa
    })
    await listaCargada()
    expect(screen.queryAllByRole("status")).toHaveLength(0)
    const contador = screen.getByText("0 de 100 líneas")
    expect(contador).toHaveAttribute("aria-live", "polite")
    expect(contador.tagName).not.toBe("OUTPUT")

    escribirLista("a@x.mx")
    fireEvent.click(enviar())
    await waitFor(() => expect(screen.getAllByRole("status")).toHaveLength(1))
  })

  it("clic triple y los dos envíos del formulario con la petición en vuelo: una sola petición, en espera y con el foco", async () => {
    const pendiente = diferida()
    const fetchMock = stubApi({ lote: () => pendiente.promesa })
    renderVista()
    await listaCargada()
    escribirLista("a@x.mx")
    const boton = enviar()
    act(() => boton.focus())
    fireEvent.click(boton)
    fireEvent.click(boton)
    fireEvent.click(boton)
    const formulario = boton.closest("form")
    if (!formulario) throw new Error("'Enviar invitaciones' no está dentro de un formulario")
    fireEvent.submit(formulario)
    act(() => formulario.requestSubmit())
    await esperarUnMomento()
    expect(llamadasAlLote(fetchMock)).toHaveLength(1)
    expect(enviar()).toHaveAttribute("aria-busy", "true")
    expect(enviar()).not.toHaveAttribute("disabled")
    expect(document.activeElement).toBe(enviar())
    await act(async () => {
      pendiente.resolver(respuestaJson(200, RESULTADO_VACIO))
      await pendiente.promesa
    })
  })
})
