import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query"
import { act, renderHook, waitFor } from "@testing-library/react"
import type { ReactNode } from "react"
import { describe, expect, it } from "vitest"

import { useVolverAPedirSiFallo } from "./hooks"

// ADMIN-01g, ronda 3 (T-07): useVolverAPedirSiFallo, compartido por todas las vistas del módulo, no
// vuelve a pedir una consulta en error que ya se está recargando; en error y quieta, sí.
const CLAVE = ["admin", "prueba-volver-a-pedir"] as const

interface Pendiente {
  resolver: (valor: string) => void
  rechazar: (error: Error) => void
}

const montar = () => {
  const pendientes: Pendiente[] = []
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: 30_000, refetchOnWindowFocus: false } },
  })
  const queryFn = () =>
    new Promise<string>((resolver, rechazar) => {
      pendientes.push({ resolver, rechazar })
    })
  const envoltorio = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
  const vista = renderHook(
    () => ({
      consulta: useQuery({ queryKey: CLAVE, queryFn }),
      volverAPedir: useVolverAPedirSiFallo(CLAVE),
    }),
    { wrapper: envoltorio },
  )
  return { pendientes, queryClient, vista }
}

const fallarLaUltima = async (
  pendientes: Pendiente[],
  vista: ReturnType<typeof montar>["vista"],
) => {
  const ultima = pendientes.at(-1)
  if (!ultima) throw new Error("no había ninguna petición en vuelo que hacer fallar")
  await act(async () => ultima.rechazar(new Error("5xx")))
  await waitFor(() => expect(vista.result.current.consulta.isError).toBe(true))
  await waitFor(() => expect(vista.result.current.consulta.fetchStatus).toBe("idle"))
}

// Como en las vistas: la lista tenía datos y una recarga (la página siguiente o una invalidación)
// falló. Con datos, una recarga en vuelo deja status en "error"; sin datos pasaría a "pending".
const llevarAError = async (montaje: ReturnType<typeof montar>) => {
  const { pendientes, queryClient, vista } = montaje
  await waitFor(() => expect(pendientes).toHaveLength(1))
  const primera = pendientes[0]
  if (!primera) throw new Error("faltó la primera petición")
  await act(async () => primera.resolver("datos"))
  await waitFor(() => expect(vista.result.current.consulta.isSuccess).toBe(true))
  act(() => {
    void queryClient.invalidateQueries({ queryKey: CLAVE, exact: true })
  })
  await waitFor(() => expect(pendientes).toHaveLength(2))
  await fallarLaUltima(pendientes, vista)
}

describe("ADMIN-01g, ronda 3 · useVolverAPedirSiFallo con una recarga en vuelo (T-07)", () => {
  it("T-07 (estado vecino): en error y sin recarga en vuelo, pulsar vuelve a pedir una vez", async () => {
    const montaje = montar()
    const { pendientes, vista } = montaje
    await llevarAError(montaje)

    act(() => vista.result.current.volverAPedir())

    await waitFor(() => expect(pendientes).toHaveLength(3))
  })

  it("T-07: en error y con una recarga en vuelo por otra causa, pulsar no lanza otra petición ni descarta la que corre", async () => {
    const montaje = montar()
    const { pendientes, queryClient, vista } = montaje
    await llevarAError(montaje)

    act(() => {
      void queryClient.invalidateQueries({ queryKey: CLAVE, exact: true })
    })
    await waitFor(() => expect(pendientes).toHaveLength(3))
    expect(vista.result.current.consulta.status).toBe("error")
    expect(vista.result.current.consulta.fetchStatus).toBe("fetching")

    act(() => vista.result.current.volverAPedir())
    act(() => vista.result.current.volverAPedir())

    expect(pendientes).toHaveLength(3)
    const enVuelo = pendientes[2]
    if (!enVuelo) throw new Error("faltó la recarga en vuelo")
    await act(async () => enVuelo.resolver("datos de la recarga"))
    await waitFor(() => expect(vista.result.current.consulta.data).toBe("datos de la recarga"))
    expect(pendientes).toHaveLength(3)
  })

  it("T-07 (estado vecino): tras la recarga en vuelo que vuelve a fallar, pulsar sí vuelve a pedir", async () => {
    const montaje = montar()
    const { pendientes, queryClient, vista } = montaje
    await llevarAError(montaje)

    act(() => {
      void queryClient.invalidateQueries({ queryKey: CLAVE, exact: true })
    })
    await waitFor(() => expect(pendientes).toHaveLength(3))
    act(() => vista.result.current.volverAPedir())
    expect(pendientes).toHaveLength(3)

    await fallarLaUltima(pendientes, vista)
    act(() => vista.result.current.volverAPedir())

    await waitFor(() => expect(pendientes).toHaveLength(4))
  })

  it("T-07 (control): con la consulta sana, pulsar no pide nada", async () => {
    const { pendientes, vista } = montar()
    await waitFor(() => expect(pendientes).toHaveLength(1))
    const primera = pendientes[0]
    if (!primera) throw new Error("faltó la primera petición")
    await act(async () => primera.resolver("datos"))
    await waitFor(() => expect(vista.result.current.consulta.isSuccess).toBe(true))

    act(() => vista.result.current.volverAPedir())

    expect(pendientes).toHaveLength(1)
  })
})
