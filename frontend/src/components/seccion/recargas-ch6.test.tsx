import {
  QueryClient,
  QueryClientProvider,
  useInfiniteQuery,
  useQuery,
  type QueryKey,
} from "@tanstack/react-query"
import { act, cleanup, render, renderHook, screen, waitFor } from "@testing-library/react"
import type { ReactNode } from "react"
import { createMemoryRouter, RouterProvider } from "react-router"
import { afterEach, describe, expect, it, vi } from "vitest"

import { useMarcarViejaSiQuedoEnError, useRecargarAlPulsarLaSeccion } from "./hooks"

// CHORE-06b (§D-4; CH6-B01 y CH6-B02): la política única de recarga. Router real de memoria (una
// pulsación es otra location.key en la misma ruta) y un QueryClient con las defaultOptions de
// app/providers.tsx (retry: 1, refetchOnWindowFocus: false, staleTime: 30 s).

const ESPERA = { timeout: 6000 }
const CLAVE_UNO = ["lista", "uno"] as const
const CLAVE_DOS = ["lista", "dos"] as const
const CLAVE_PAGINAS = ["lista", "paginas"] as const

interface Pagina {
  filas: string[]
  siguiente: string | null
}

// Lo que responde cada consulta en cada petición; `pedidas` cuenta las peticiones por clave.
let respuestaUno: () => Promise<string>
let respuestaDos: () => Promise<string>
let respuestaPagina: (cursor: string | undefined) => Promise<Pagina>
let pedidas: { clave: string; cursor: string | undefined }[] = []
let refetchEnElMontaje = true

const pedir = (clave: string, cursor?: string) => {
  pedidas.push({ clave, cursor })
}
const cuantas = (clave: string) => pedidas.filter((p) => p.clave === clave).length

interface VistaProps {
  conDos: boolean
  conPaginas: boolean
}

function Vista({ conDos, conPaginas }: VistaProps) {
  const uno = useQuery({
    queryKey: CLAVE_UNO,
    queryFn: () => {
      pedir("uno")
      return respuestaUno()
    },
    refetchOnMount: refetchEnElMontaje,
  })
  const dos = useQuery({
    queryKey: CLAVE_DOS,
    queryFn: () => {
      pedir("dos")
      return respuestaDos()
    },
    enabled: conDos,
  })
  const paginas = useInfiniteQuery({
    queryKey: CLAVE_PAGINAS,
    queryFn: ({ pageParam }: { pageParam: string | undefined }) => {
      pedir("paginas", pageParam)
      return respuestaPagina(pageParam)
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (ultima) => ultima.siguiente ?? undefined,
    enabled: conPaginas,
  })
  const consultas = [uno, ...(conDos ? [dos] : []), ...(conPaginas ? [paginas] : [])]
  useRecargarAlPulsarLaSeccion(...consultas)
  return (
    <div>
      <p>uno: {uno.data ?? (uno.isError ? "error" : "cargando")}</p>
      {conDos && <p>dos: {dos.data ?? (dos.isError ? "error" : "cargando")}</p>}
      {conPaginas && (
        <p>
          paginas: {paginas.data?.pages.flatMap((p) => p.filas).join(",") ?? "nada"}
          {paginas.isError ? " (error)" : ""}
        </p>
      )}
      <button type="button" onClick={() => void paginas.fetchNextPage({ cancelRefetch: false })}>
        Ver más
      </button>
    </div>
  )
}

const nuevoCliente = () =>
  new QueryClient({
    defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false, staleTime: 30_000 } },
  })

const montar = (opciones: Partial<VistaProps> & { cliente?: QueryClient } = {}) => {
  const cliente = opciones.cliente ?? nuevoCliente()
  const router = createMemoryRouter(
    [
      {
        path: "/lista",
        element: (
          <Vista conDos={opciones.conDos ?? false} conPaginas={opciones.conPaginas ?? false} />
        ),
      },
    ],
    { initialEntries: ["/lista"] },
  )
  render(
    <QueryClientProvider client={cliente}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
  return { router, cliente }
}

type Enrutador = ReturnType<typeof montar>["router"]

const pulsar = async (router: Enrutador) => {
  await act(async () => {
    await router.navigate("/lista")
  })
}

const reposar = (ms = 50) => act(() => new Promise((resolver) => setTimeout(resolver, ms)))

const retenida = <T,>() => {
  const pendientes: ((valor: T) => void)[] = []
  const respuesta = () =>
    new Promise<T>((resolver) => {
      pendientes.push(resolver)
    })
  const soltar = async (valor: T) => {
    const resolver = pendientes.shift()
    if (resolver === undefined) throw new Error("Precondición: la petición retenida ya salió")
    await act(async () => {
      resolver(valor)
      await new Promise((r) => setTimeout(r, 0))
    })
  }
  return { respuesta, soltar }
}

afterEach(() => {
  cleanup()
  vi.useRealTimers()
  pedidas = []
  refetchEnElMontaje = true
})

const sana = () => {
  respuestaUno = () => Promise.resolve("sana")
  respuestaDos = () => Promise.resolve("dos sana")
  respuestaPagina = (cursor) =>
    Promise.resolve(
      cursor === undefined
        ? { filas: ["f1", "f2"], siguiente: "f2" }
        : { filas: ["f3"], siguiente: null },
    )
}

describe("CH6-B01 · useRecargarAlPulsarLaSeccion", () => {
  it("CH6-B01 (a): sana y fresca, pulsar la sección no pide nada", async () => {
    sana()
    const { router } = montar()
    await screen.findByText("uno: sana", {}, ESPERA)
    expect(cuantas("uno")).toBe(1)
    await pulsar(router)
    await reposar(100)
    expect(cuantas("uno")).toBe(1)
  })

  it("CH6-B01 (b): sana y marcada vieja (invalidateQueries con refetchType none), pulsar pide una vez", async () => {
    sana()
    const { router, cliente } = montar()
    await screen.findByText("uno: sana", {}, ESPERA)
    await act(async () => {
      await cliente.invalidateQueries({ queryKey: CLAVE_UNO, refetchType: "none" })
    })
    expect(cuantas("uno")).toBe(1)
    await pulsar(router)
    await waitFor(() => expect(cuantas("uno")).toBe(2), ESPERA)
    await reposar(100)
    expect(cuantas("uno")).toBe(2)
  })

  it("CH6-B01 (c): sana con más de 30 s, pulsar pide una vez", async () => {
    vi.useFakeTimers({ toFake: ["Date"] })
    sana()
    const { router } = montar()
    await screen.findByText("uno: sana", {}, ESPERA)
    vi.setSystemTime(Date.now() + 31_000)
    await pulsar(router)
    await waitFor(() => expect(cuantas("uno")).toBe(2), ESPERA)
    await reposar(100)
    expect(cuantas("uno")).toBe(2)
  })

  it("CH6-B01 (d): en error sin datos, pulsar pide una vez", async () => {
    respuestaUno = () => Promise.reject(new Error("falla"))
    const { router } = montar()
    await screen.findByText("uno: error", {}, ESPERA)
    expect(cuantas("uno")).toBe(2)
    respuestaUno = () => Promise.resolve("recuperada")
    await pulsar(router)
    await screen.findByText("uno: recuperada", {}, ESPERA)
    expect(cuantas("uno")).toBe(3)
  })

  it("CH6-B01 (e): en error con datos (página siguiente fallida), pulsar pide una vez, desde la primera página", async () => {
    sana()
    const { router } = montar({ conPaginas: true })
    await screen.findByText("paginas: f1,f2", {}, ESPERA)
    respuestaPagina = (cursor) =>
      cursor === undefined
        ? Promise.resolve({ filas: ["f1", "f2"], siguiente: "f2" })
        : Promise.reject(new Error("falla la página"))
    act(() => screen.getByRole("button", { name: "Ver más" }).click())
    await screen.findByText("paginas: f1,f2 (error)", {}, ESPERA)
    const antes = pedidas.length
    await pulsar(router)
    await screen.findByText("paginas: f1,f2", {}, ESPERA)
    const despues = pedidas.slice(antes)
    expect(despues).toEqual([{ clave: "paginas", cursor: undefined }])
  })

  it("CH6-B01 (f): en error y pidiendo (la petición retenida), pulsar no pide nada y la petición en vuelo no se cancela: su respuesta se aplica", async () => {
    respuestaUno = () => Promise.reject(new Error("falla"))
    const { router, cliente } = montar()
    await screen.findByText("uno: error", {}, ESPERA)
    const pendiente = retenida<string>()
    respuestaUno = pendiente.respuesta
    act(() => {
      void cliente.refetchQueries({ queryKey: CLAVE_UNO })
    })
    await waitFor(() => expect(cuantas("uno")).toBe(3), ESPERA)
    await pulsar(router)
    await reposar(100)
    expect(cuantas("uno")).toBe(3)
    await pendiente.soltar("de la retenida")
    expect(await screen.findByText("uno: de la retenida", {}, ESPERA)).toBeInTheDocument()
    expect(cuantas("uno")).toBe(3)
  })

  it("CH6-B01 (g): dos pulsaciones en el mismo act con la consulta en error piden una vez", async () => {
    respuestaUno = () => Promise.reject(new Error("falla"))
    const { router } = montar()
    await screen.findByText("uno: error", {}, ESPERA)
    const pendiente = retenida<string>()
    respuestaUno = pendiente.respuesta
    await act(async () => {
      await router.navigate("/lista")
      await router.navigate("/lista")
    })
    await reposar(100)
    expect(cuantas("uno")).toBe(3)
    await pendiente.soltar("una")
    expect(await screen.findByText("uno: una", {}, ESPERA)).toBeInTheDocument()
    expect(cuantas("uno")).toBe(3)
  })

  it("CH6-B01 (h): el primer render no cuenta como pulsación (la consulta vieja no se pide al montar sin refetchOnMount)", async () => {
    sana()
    refetchEnElMontaje = false
    const cliente = nuevoCliente()
    cliente.setQueryData(CLAVE_UNO, "de la caché", { updatedAt: Date.now() - 60_000 })
    const { router } = montar({ cliente })
    await screen.findByText("uno: de la caché", {}, ESPERA)
    await reposar(100)
    expect(cuantas("uno")).toBe(0)
    await pulsar(router)
    await screen.findByText("uno: sana", {}, ESPERA)
    expect(cuantas("uno")).toBe(1)
  })

  it("CH6-B01 (i): con dos consultas en la misma llamada, cada una según su estado (la fresca no se pide; la marcada vieja, sí)", async () => {
    sana()
    const { router, cliente } = montar({ conDos: true })
    await screen.findByText("uno: sana", {}, ESPERA)
    await screen.findByText("dos: dos sana", {}, ESPERA)
    await act(async () => {
      await cliente.invalidateQueries({ queryKey: CLAVE_DOS, refetchType: "none" })
    })
    await pulsar(router)
    await waitFor(() => expect(cuantas("dos")).toBe(2), ESPERA)
    await reposar(100)
    expect(cuantas("uno")).toBe(1)
    expect(cuantas("dos")).toBe(2)
  })
})

// CH6-B02: el gancho movido desde features/admin. Un error de verdad ya deja la consulta inválida
// (query.js:450-462 de @tanstack/query-core 5.103.2), así que estos casos arman a mano un error SIN
// isInvalidated: es la garantía escrita de PR-2 para el día en que cambie la librería (la persona no
// ve hoy ninguna diferencia).
describe("CH6-B02 · useMarcarViejaSiQuedoEnError movido", () => {
  const conCliente = (cliente: QueryClient) =>
    function Envoltorio({ children }: { children: ReactNode }) {
      return <QueryClientProvider client={cliente}>{children}</QueryClientProvider>
    }

  const enErrorSinMarca = (cliente: QueryClient, clave: QueryKey) => {
    cliente.setQueryData(clave, "datos")
    const consulta = cliente.getQueryCache().find({ queryKey: clave, exact: true })
    if (consulta === undefined) throw new Error("Precondición: la consulta está en la caché")
    consulta.setState({
      status: "error",
      error: new Error("falla"),
      isInvalidated: false,
      fetchStatus: "idle",
    })
    expect(cliente.getQueryState(clave)?.isInvalidated).toBe(false)
  }

  it("CH6-B02 (a): en error al desmontarse, la consulta queda isInvalidated y no se pide", async () => {
    const cliente = nuevoCliente()
    const queryFn = vi.fn(() => Promise.resolve("nunca"))
    cliente.setQueryDefaults(CLAVE_UNO, { queryFn })
    enErrorSinMarca(cliente, CLAVE_UNO)
    const { unmount } = renderHook(() => useMarcarViejaSiQuedoEnError(CLAVE_UNO), {
      wrapper: conCliente(cliente),
    })
    expect(cliente.getQueryState(CLAVE_UNO)?.isInvalidated).toBe(false)
    unmount()
    await reposar(50)
    expect(cliente.getQueryState(CLAVE_UNO)?.isInvalidated).toBe(true)
    expect(queryFn).not.toHaveBeenCalled()
  })

  it("CH6-B02 (b): al cambiar de clave en error, la anterior queda isInvalidated y la nueva no", async () => {
    const cliente = nuevoCliente()
    enErrorSinMarca(cliente, CLAVE_UNO)
    enErrorSinMarca(cliente, CLAVE_DOS)
    const { rerender } = renderHook(
      ({ clave }: { clave: QueryKey }) => useMarcarViejaSiQuedoEnError(clave),
      { wrapper: conCliente(cliente), initialProps: { clave: CLAVE_UNO as QueryKey } },
    )
    rerender({ clave: CLAVE_DOS })
    await reposar(50)
    expect(cliente.getQueryState(CLAVE_UNO)?.isInvalidated).toBe(true)
    expect(cliente.getQueryState(CLAVE_DOS)?.isInvalidated).toBe(false)
  })

  it("CH6-B02 (c): sana, no se toca al desmontarse", async () => {
    const cliente = nuevoCliente()
    cliente.setQueryData(CLAVE_UNO, "sana")
    const { unmount } = renderHook(() => useMarcarViejaSiQuedoEnError(CLAVE_UNO), {
      wrapper: conCliente(cliente),
    })
    unmount()
    await reposar(50)
    expect(cliente.getQueryState(CLAVE_UNO)?.isInvalidated).toBe(false)
    expect(cliente.getQueryState(CLAVE_UNO)?.status).toBe("success")
  })
})
