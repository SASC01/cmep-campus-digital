import { saludRespuestaSchema } from "@campus/shared"
import { afterEach, describe, expect, it, vi } from "vitest"

import { ApiError, api, esApiError } from "./apiClient"
import { establecerToken, limpiarToken } from "./authService"

const respuestaJson = (estado: number, cuerpo: unknown) =>
  new Response(JSON.stringify(cuerpo), {
    status: estado,
    headers: { "Content-Type": "application/json" },
  })

afterEach(() => {
  limpiarToken()
  vi.unstubAllGlobals()
})

describe("api", () => {
  it("traduce un error de la API a ApiError con código y estado", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve(
          respuestaJson(503, {
            error: {
              codigo: "BASE_DE_DATOS_NO_DISPONIBLE",
              mensaje: "La base de datos no responde.",
            },
          }),
        ),
      ),
    )

    const error = await api("/api/salud", { schema: saludRespuestaSchema }).catch((e: unknown) => e)

    expect(esApiError(error)).toBe(true)
    expect(error).toBeInstanceOf(ApiError)
    if (!esApiError(error)) return
    expect(error.codigo).toBe("BASE_DE_DATOS_NO_DISPONIBLE")
    expect(error.estado).toBe(503)
    expect(error.message).toBe("La base de datos no responde.")
  })

  it("marca como RESPUESTA_INVALIDA un 200 cuyo cuerpo no cumple el esquema", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.resolve(respuestaJson(200, { estado: "raro" }))),
    )

    const error = await api("/api/salud", { schema: saludRespuestaSchema }).catch((e: unknown) => e)

    expect(esApiError(error)).toBe(true)
    if (!esApiError(error)) return
    expect(error.codigo).toBe("RESPUESTA_INVALIDA")
    expect(error.estado).toBe(200)
  })

  it("envía el token en Authorization y las credenciales", async () => {
    const fetchMock = vi.fn<typeof fetch>(() =>
      Promise.resolve(
        respuestaJson(200, {
          estado: "ok",
          baseDeDatos: "ok",
          marcaDeTiempo: "2026-09-22T14:42:06.290Z",
        }),
      ),
    )
    vi.stubGlobal("fetch", fetchMock)
    establecerToken("abc")

    const datos = await api("/api/salud", { schema: saludRespuestaSchema })

    expect(datos.estado).toBe("ok")
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const llamada = fetchMock.mock.calls[0]
    expect(llamada).toBeDefined()
    const [url, init] = llamada ?? []
    expect(url).toBe("/api/salud")
    expect(init?.credentials).toBe("include")
    const headers = new Headers(init?.headers)
    expect(headers.get("Authorization")).toBe("Bearer abc")
  })
})
