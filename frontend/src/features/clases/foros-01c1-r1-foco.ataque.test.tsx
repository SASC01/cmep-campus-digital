// Ataque FORO-01c1, ronda 1 (tester). Puntos 4, 5, 8, 9 y 10 de la verificación del manager: el foco del
// efecto de N-28 (foros-view.tsx), que mueve el foco al h2 con solo perderse; «Ver más foros» con la
// página siguiente vacía; el foco en «Crear foro» y en «Ver más foros» cuando cambia la lista o la clase
// entra en solo lectura; las filas con el reloj fijo, títulos largos y conteos grandes; y las reglas
// estáticas sobre foros-view.tsx. Router real (`rutas`) con un QueryClient como el de app/providers.tsx
// a la vista de la prueba, para provocar renders sin red.
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { createMemoryRouter, RouterProvider } from "react-router"
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"

import { claveClaseDetalle } from "@/services/clasesService"
import { establecerToken, limpiarToken } from "@/services/tokenAcceso"
import { claveListaDeForos } from "@/services/trabajoService"

const aviso = vi.hoisted(() =>
  Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn(), dismiss: vi.fn() }),
)
vi.mock("sonner", () => ({ toast: aviso, Toaster: () => null }))
vi.mock("@/services/navegacion", () => ({ irA: vi.fn(), rutaActual: vi.fn(() => "/") }))

type Rol = "estudiante" | "maestro"

const uuid = (prefijo: string, n: number) =>
  `${prefijo}-1c1f-4b8e-9a1e-${String(n).padStart(12, "0")}`
const CLASE_A = uuid("2a2b3c4d", 1)
const CLASE_B = uuid("2a2b3c4d", 2)
const MAESTRO = { id: uuid("3a3b3c4d", 1), nombre: "Luis Pérez" }
const ESPERA = { timeout: 6000 }
const FORO = (rol: Rol, clase = CLASE_A) => `/${rol}/clases/${clase}/foro`

const respuestaJson = (estado: number, cuerpo: unknown) =>
  new Response(JSON.stringify(cuerpo), {
    status: estado,
    headers: { "Content-Type": "application/json" },
  })
const errorApi = (estado: number, codigo: string, mensaje = "mensaje del servidor") =>
  respuestaJson(estado, { error: { codigo, mensaje } })

interface ForoDoble {
  id: string
  titulo: string
  autor: { id: string; nombre: string; administracion: boolean }
  creadoEn: string
  fechaLimite: string
  puntos: number
  tema: null
  participaciones: number
  entrega: { estado: "asignado" | "entregado" | "calificado"; conRetraso: boolean } | null
}

const idForo = (n: number) => uuid("5a5b3c4d", n)
const foro = (n: number, extra: Partial<ForoDoble> = {}): ForoDoble => ({
  id: idForo(n),
  titulo: `Foro ${String(n)}`,
  autor: { ...MAESTRO, administracion: false },
  creadoEn: "2026-10-01T15:30:00.000Z",
  fechaLimite: new Date(Date.now() + 5 * 86_400_000).toISOString(),
  puntos: 10,
  tema: null,
  participaciones: 0,
  entrega: null,
  ...extra,
})

let rol: Rol
let archivada: boolean
let foros: Record<string, ForoDoble[]>
// La página siguiente que responde el servidor (undefined: la de siempre).
let paginaSiguiente: ((cursor: string) => Response) | undefined

const responder = (metodo: string, url: URL): Response => {
  const ruta = url.pathname
  if (ruta === "/api/me") {
    return respuestaJson(200, {
      id: uuid("4f4f3c4d", 1),
      nombre: "Ana López",
      email: "ana@ejemplo.mx",
      rol,
      debeCambiarContrasena: false,
      accesoRestringido: false,
    })
  }
  if (ruta === "/api/clases/inscritas" || ruta === "/api/clases/impartidas") {
    return respuestaJson(200, { clases: [], total: 0, siguienteCursor: null })
  }
  const deClase = /^\/api\/clases\/([^/]+)(\/.*)?$/.exec(ruta)
  const claseId = deClase?.[1] ?? ""
  const resto = deClase?.[2] ?? ""
  if (resto === "" && metodo === "GET") {
    return respuestaJson(200, {
      clase: {
        id: claseId,
        nombre: claseId === CLASE_A ? "Historia" : "Química",
        descripcion: null,
        maestro: MAESTRO,
        maestros: [MAESTRO],
        archivadaEn: archivada ? "2026-10-20T10:00:00.000Z" : null,
      },
    })
  }
  if (resto === "/codigo") return respuestaJson(200, { codigo: "ABCDEFG" })
  if (resto === "/publicaciones") {
    return respuestaJson(200, { publicaciones: [], siguienteCursor: null })
  }
  if (resto === "/foros" && metodo === "GET") {
    const filas = foros[claseId] ?? []
    const cursor = url.searchParams.get("cursor")
    if (cursor !== null && paginaSiguiente !== undefined) return paginaSiguiente(cursor)
    const limite = Number(url.searchParams.get("limite") ?? "20")
    let inicio = 0
    if (cursor !== null) {
      const indice = filas.findIndex((fila) => fila.id === cursor)
      if (indice === -1) return errorApi(400, "VALIDACION", "cursor: no es válido")
      inicio = indice + 1
    }
    const pagina = filas.slice(inicio, inicio + limite)
    const siguiente = filas.length > inicio + limite ? (pagina.at(-1)?.id ?? null) : null
    return respuestaJson(200, { foros: pagina, siguienteCursor: siguiente })
  }
  return errorApi(500, "ERROR_INTERNO", `no esperada: ${metodo} ${ruta}`)
}

let cliente: QueryClient

const montar = async (entradas: string[]) => {
  const { rutas } = await import("@/app/router")
  const router = createMemoryRouter(rutas, { initialEntries: entradas })
  render(
    <QueryClientProvider client={cliente}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
  return router
}

const reposar = (ms = 150) => act(() => new Promise((resolver) => setTimeout(resolver, ms)))
const nombreDeLaFila = (titulo: string) => new RegExp(`^Foro: ${titulo}(?!\\d)`)
const esperarFila = (titulo: string) =>
  screen.findByRole("link", { name: nombreDeLaFila(titulo) }, ESPERA)
const esperarH2 = () => screen.findByRole("heading", { level: 2, name: "Foro" }, ESPERA)

// Un render más, sin red y sin quitar ninguna fila: sube el conteo de participaciones del primer foro de
// la primera página (otra fila que la enfocada). Con los mismos datos no habría render: TanStack
// conserva la referencia de lo que no cambió.
interface DatosDeLaLista {
  pages: { foros: ForoDoble[]; siguienteCursor: string | null }[]
  pageParams: unknown[]
}
const renderSinCambios = (clase = CLASE_A) => {
  cliente.setQueryData<DatosDeLaLista>(claveListaDeForos(clase), (datos) => {
    if (datos === undefined) throw new Error("Precondición: la lista está en la caché")
    const [primera, ...resto] = datos.pages
    if (primera === undefined) throw new Error("Precondición: hay una primera página")
    const [arriba, ...demas] = primera.foros
    if (arriba === undefined) throw new Error("Precondición: hay un foro arriba")
    return {
      ...datos,
      pages: [
        {
          ...primera,
          foros: [{ ...arriba, participaciones: arriba.participaciones + 1 }, ...demas],
        },
        ...resto,
      ],
    }
  })
}

beforeAll(async () => {
  await import("@/app/router")
}, 60_000)

beforeEach(() => {
  establecerToken("token-de-prueba")
  rol = "maestro"
  archivada = false
  paginaSiguiente = undefined
  foros = {
    [CLASE_A]: Array.from({ length: 25 }, (_, i) => foro(25 - i)),
    [CLASE_B]: [foro(90, { titulo: "Debate 1" })],
  }
  cliente = new QueryClient({
    defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false, staleTime: 30_000 } },
  })
  aviso.error.mockClear()
  // En un navegador, la página conserva el foco de la ventana aunque un elemento lo suelte; jsdom
  // devuelve false en cuanto nada tiene el foco.
  vi.spyOn(document, "hasFocus").mockReturnValue(true)
  vi.stubGlobal(
    "fetch",
    vi.fn<typeof fetch>((entrada, init) => {
      const url = new URL(String(entrada), "http://x")
      return Promise.resolve().then(() => responder(init?.method ?? "GET", url))
    }),
  )
})

afterEach(() => {
  cleanup()
  limpiarToken()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  vi.useRealTimers()
})

describe("ataque FORO-01c1 r1 · punto 4: el foco del efecto de N-28", () => {
  it("ATQ-FORO-101 (control): con una fila enfocada, soltar el foco (a <body>) y dejar pasar el instante de useFilaEnFoco; un render después no mueve el foco", async () => {
    await montar([FORO("maestro")])
    await esperarH2()
    const enlace = await esperarFila("Foro 20")
    act(() => enlace.focus())
    expect(document.activeElement).toBe(enlace)
    act(() => enlace.blur())
    await reposar(50)
    act(() => renderSinCambios())
    await reposar(100)
    // Precondición: hubo render (el conteo del primer foro cambió en pantalla).
    expect(screen.getByRole("link", { name: nombreDeLaFila("Foro 25") })).toHaveTextContent(
      "1 participación",
    )
    expect(document.activeElement).toBe(document.body)
    expect(screen.getByRole("link", { name: nombreDeLaFila("Foro 20") })).toBeInTheDocument()
  })

  it("ATQ-FORO-102: con una fila enfocada, soltar el foco y un render en el mismo instante (una consulta que llega) no mueve el foco al h2: la fila sigue en la lista (DESIGN.md §7.14: un render sin desmontaje no mueve el foco)", async () => {
    await montar([FORO("maestro")])
    const h2 = await esperarH2()
    const enlace = await esperarFila("Foro 20")
    act(() => enlace.focus())
    act(() => {
      enlace.blur()
      renderSinCambios()
    })
    await reposar(100)
    expect(screen.getByRole("link", { name: nombreDeLaFila("Foro 25") })).toHaveTextContent(
      "1 participación",
    )
    expect(screen.getByRole("link", { name: nombreDeLaFila("Foro 20") })).toBeInTheDocument()
    expect(document.activeElement, "el foco se movió al h2 sin que la fila saliera").not.toBe(h2)
  })

  it("ATQ-FORO-103: si la lista pasa por «Cargando» (resetQueries) con una fila enfocada, el foco va al h2, nunca a <body>, y se queda ahí cuando vuelven las filas", async () => {
    await montar([FORO("maestro")])
    const h2 = await esperarH2()
    const enlace = await esperarFila("Foro 20")
    act(() => enlace.focus())
    // La recarga queda en vuelo para que la lista se vea en «Cargando» con la fila fuera.
    let soltar: () => void = () => undefined
    const retenida = new Promise<void>((resolver) => {
      soltar = resolver
    })
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>((entrada, init) => {
        const url = new URL(String(entrada), "http://x")
        return retenida.then(() => responder(init?.method ?? "GET", url))
      }),
    )
    act(() => {
      void cliente.resetQueries({ queryKey: claveListaDeForos(CLASE_A) })
    })
    expect(await screen.findByText("Cargando los foros…", undefined, ESPERA)).toBeInTheDocument()
    await reposar(100)
    expect(document.activeElement, `foco en: ${document.activeElement?.textContent ?? ""}`).toBe(h2)
    act(() => soltar())
    await esperarFila("Foro 20")
    await reposar(100)
    expect(document.activeElement, `foco en: ${document.activeElement?.textContent ?? ""}`).toBe(h2)
  })

  it("ATQ-FORO-104: con el foco en «Crear foro», una recarga que cambia la lista no lo mueve; con el foco en «Ver más foros», una recarga que deja una sola página lo lleva a un lugar enfocable, nunca a <body>", async () => {
    await montar([FORO("maestro")])
    await esperarH2()
    await esperarFila("Foro 20")
    const crear = screen.getByRole("link", { name: "Crear foro" })
    act(() => crear.focus())
    foros[CLASE_A] = [foro(30, { titulo: "Foro nuevo" }), ...(foros[CLASE_A] ?? [])]
    await act(async () => {
      await cliente.invalidateQueries({ queryKey: claveListaDeForos(CLASE_A) })
    })
    await esperarFila("Foro nuevo")
    await reposar(100)
    expect(document.activeElement).toBe(crear)

    const verMas = screen.getByRole("button", { name: "Ver más foros" })
    act(() => verMas.focus())
    foros[CLASE_A] = (foros[CLASE_A] ?? []).slice(0, 5)
    await act(async () => {
      await cliente.invalidateQueries({ queryKey: claveListaDeForos(CLASE_A) })
    })
    await waitFor(
      () => expect(screen.queryByRole("button", { name: "Ver más foros" })).toBeNull(),
      ESPERA,
    )
    await reposar(100)
    expect(document.activeElement).not.toBe(document.body)
    expect(document.activeElement?.isConnected).toBe(true)
  })

  it("ATQ-FORO-105: con una fila enfocada en «Foro» de A, volver con el historial a «Foro» de B (ya visitada) deja el foco en el título de la clase o en el encabezado, nunca en <body>", async () => {
    const router = await montar([FORO("maestro", CLASE_B)])
    await esperarFila("Debate 1")
    await act(() => router.navigate(FORO("maestro")))
    await esperarH2()
    const enlace = await esperarFila("Foro 20")
    act(() => enlace.focus())
    await act(() => router.navigate(-1))
    await esperarFila("Debate 1")
    await reposar(200)
    const activo = document.activeElement
    expect(activo).not.toBe(document.body)
    expect(activo?.tagName).toMatch(/^H[12]$/)
  })

  it("ATQ-FORO-106: con el foco en «Crear foro», si la clase entra en solo lectura (el detalle llega archivado), «Crear foro» sale y el foco va al título de la clase, nunca a <body>", async () => {
    await montar([FORO("maestro")])
    await esperarH2()
    await esperarFila("Foro 20")
    const crear = screen.getByRole("link", { name: "Crear foro" })
    act(() => crear.focus())
    archivada = true
    await act(async () => {
      await cliente.invalidateQueries({ queryKey: claveClaseDetalle(CLASE_A) })
    })
    await waitFor(
      () => expect(screen.queryByRole("link", { name: "Crear foro" })).toBeNull(),
      ESPERA,
    )
    await reposar(200)
    expect(document.activeElement).toBe(screen.getByRole("heading", { level: 1, name: "Historia" }))
  })
})

describe("ataque FORO-01c1 r1 · punto 5: la página siguiente vacía", () => {
  it("ATQ-FORO-107: si la página siguiente llega vacía, «Ver más foros» sale y el foco va al h2; no se repite ninguna fila", async () => {
    foros[CLASE_A] = Array.from({ length: 20 }, (_, i) => foro(20 - i))
    // El servidor anuncia una página más y la entrega vacía (un foro borrado entre las dos lecturas).
    paginaSiguiente = () => respuestaJson(200, { foros: [], siguienteCursor: null })
    const deSiempre = foros[CLASE_A] ?? []
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>((entrada, init) => {
        const url = new URL(String(entrada), "http://x")
        if (url.pathname === `/api/clases/${CLASE_A}/foros` && !url.searchParams.has("cursor")) {
          return Promise.resolve(
            respuestaJson(200, { foros: deSiempre, siguienteCursor: deSiempre.at(-1)?.id ?? null }),
          )
        }
        return Promise.resolve().then(() => responder(init?.method ?? "GET", url))
      }),
    )
    await montar([FORO("maestro")])
    const h2 = await esperarH2()
    await esperarFila("Foro 1")
    const verMas = screen.getByRole("button", { name: "Ver más foros" })
    act(() => verMas.focus())
    fireEvent.click(verMas)
    await waitFor(
      () => expect(screen.queryByRole("button", { name: "Ver más foros" })).toBeNull(),
      ESPERA,
    )
    await reposar(100)
    expect(document.activeElement).toBe(h2)
    expect(screen.getAllByRole("link", { name: /^Foro: Foro \d+/ })).toHaveLength(20)
  })
})

describe("ataque FORO-01c1 r1 · punto 8: las filas", () => {
  it("ATQ-FORO-108: con el reloj fijo, en el milisegundo de la fecha límite la fila dice «Venció» y la insignia «Sin entregar»; un milisegundo antes, «Vence hoy» y «Asignado»; las dos formas de la entrega sin participar se ven igual", async () => {
    rol = "estudiante"
    const ahora = new Date("2026-11-16T18:00:00.000Z")
    vi.useFakeTimers({ toFake: ["Date"] })
    vi.setSystemTime(ahora)
    foros[CLASE_A] = [
      foro(1, { fechaLimite: ahora.toISOString(), entrega: null }),
      foro(2, {
        fechaLimite: ahora.toISOString(),
        entrega: { estado: "asignado", conRetraso: false },
      }),
      foro(3, { fechaLimite: new Date(ahora.getTime() + 1).toISOString(), entrega: null }),
      foro(4, {
        fechaLimite: new Date(ahora.getTime() + 1).toISOString(),
        entrega: { estado: "asignado", conRetraso: false },
      }),
    ]
    await montar([FORO("estudiante")])
    await esperarH2()
    const texto = async (n: number) => (await esperarFila(`Foro ${String(n)}`)).textContent ?? ""
    for (const n of [1, 2]) {
      const t = await texto(n)
      expect(t).toMatch(/Venció/)
      expect(t).toMatch(/Sin entregar/)
      expect(t).not.toMatch(/Asignado/)
    }
    for (const n of [3, 4]) {
      const t = await texto(n)
      expect(t).toMatch(/Vence hoy/)
      expect(t).toMatch(/Asignado/)
    }
    expect(await texto(1)).toBe((await texto(2)).replace("Foro 2", "Foro 1"))
  })

  it("ATQ-FORO-109: un título de 300 caracteres sin espacios y un conteo de 1 234 567 se ven enteros, con el conteo en palabras, y cada fila sigue siendo un solo enlace con «Foro:»", async () => {
    const largo = "x".repeat(300)
    foros[CLASE_A] = [foro(1, { titulo: largo, participaciones: 1_234_567 })]
    await montar([FORO("maestro")])
    await esperarH2()
    const enlace = await screen.findByRole("link", { name: new RegExp(`^Foro: ${largo}`) }, ESPERA)
    expect(enlace.textContent).toContain(largo)
    expect(within(enlace).getByText("1234567 participaciones")).toBeInTheDocument()
  })
})

describe("ataque FORO-01c1 r1 · punto 10: las reglas estáticas sobre foros-view.tsx", () => {
  const fuentes = import.meta.glob<string>("/src/features/clases/foros-view.tsx", {
    query: "?raw",
    import: "default",
    eager: true,
  })
  const texto = Object.values(fuentes)[0] ?? ""
  const codigo = texto
    .split("\n")
    .filter((linea) => !/^\s*(\/\/|\/?\*)/.test(linea))
    .join("\n")

  it("ATQ-FORO-110: sin isFetchingNextPage, ?? [], disabled, fetch(, console., vidrio, valores arbitrarios ni importaciones de otro módulo; los únicos tipos son …Props; la key de la clase va en el render prop; un solo enEspera=", () => {
    expect(texto.length, "Precondición: se leyó foros-view.tsx").toBeGreaterThan(1000)
    expect(codigo).not.toMatch(/isFetchingNextPage/)
    expect(codigo).not.toMatch(/\?\?\s*\[\]/)
    expect(codigo).not.toMatch(/\sdisabled(=|\s|\/?>)/)
    expect(codigo).not.toMatch(/\bfetch\(|console\./)
    expect(codigo).not.toMatch(/vidrio|backdrop-blur|data-material/)
    expect(codigo).not.toMatch(/-\[[^\]]+\]/)
    expect(codigo).not.toMatch(/from "@\/features\//)
    const tipos = [...codigo.matchAll(/^\s*(?:export\s+)?(?:interface|type)\s+(\w+)/gm)].map(
      ([, nombre]) => nombre,
    )
    expect(tipos.filter((nombre) => !(nombre ?? "").endsWith("Props"))).toEqual([])
    expect(codigo).toMatch(
      /\{\(claseId\) => <ForosDeLaClase key=\{claseId\} claseId=\{claseId\} \/>\}/,
    )
    expect(codigo.match(/enEspera=/g)).toHaveLength(1)
  })
})
