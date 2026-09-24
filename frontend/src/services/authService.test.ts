import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const respuestaJson = (estado: number, cuerpo: unknown) =>
  new Response(JSON.stringify(cuerpo), {
    status: estado,
    headers: { "Content-Type": "application/json" },
  })

// Módulos frescos en cada prueba: restaurarSesion memoiza su resultado por carga de la aplicación.
beforeEach(() => {
  vi.resetModules()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("authService", () => {
  it("restaurarSesion hace una sola petición a /refrescar aunque se llame dos veces", async () => {
    const fetchMock = vi.fn<typeof fetch>(() =>
      Promise.resolve(respuestaJson(200, { tokenAcceso: "restaurado" })),
    )
    vi.stubGlobal("fetch", fetchMock)
    const { obtenerToken, restaurarSesion } = await import("./authService")

    const [primera, segunda] = await Promise.all([restaurarSesion(), restaurarSesion()])
    const tercera = await restaurarSesion()

    expect([primera, segunda, tercera]).toEqual([true, true, true])
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(String(fetchMock.mock.calls[0]?.[0])).toBe("/api/auth/refrescar")
    expect(obtenerToken()).toBe("restaurado")
  })

  it("tras logout no se vuelve a restaurar la sesión: ninguna petición a /refrescar (T-07)", async () => {
    const fetchMock = vi.fn<typeof fetch>((entrada) =>
      Promise.resolve(
        String(entrada) === "/api/auth/logout"
          ? new Response(null, { status: 204 })
          : respuestaJson(200, { tokenAcceso: "restaurado" }),
      ),
    )
    vi.stubGlobal("fetch", fetchMock)
    const { establecerToken, haySesion, logout, restaurarSesion } = await import("./authService")
    establecerToken("vigente")

    await logout()

    expect(await restaurarSesion()).toBe(false)
    expect(haySesion()).toBe(false)
    expect(fetchMock.mock.calls.map(([entrada]) => String(entrada))).toEqual(["/api/auth/logout"])
  })

  it("logout limpia el token aunque la red falle", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.reject(new TypeError("Failed to fetch"))),
    )
    const { establecerToken, haySesion, logout } = await import("./authService")
    establecerToken("vigente")

    await expect(logout()).resolves.toBeUndefined()

    expect(haySesion()).toBe(false)
  })
})
