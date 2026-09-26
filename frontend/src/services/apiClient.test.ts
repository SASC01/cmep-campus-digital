import {
  meRespuestaSchema,
  saludRespuestaSchema,
  sinContenidoSchema,
  tokenAccesoRespuestaSchema,
} from "@campus/shared"
import { afterEach, describe, expect, it, vi } from "vitest"

import { ApiError, api, esApiError } from "./apiClient"
import { establecerToken, haySesion, limpiarToken, obtenerToken } from "./authService"
import { irA, rutaActual } from "./navegacion"

vi.mock("./navegacion", () => ({ irA: vi.fn(), rutaActual: vi.fn(() => "/estudiante") }))

const respuestaJson = (estado: number, cuerpo: unknown) =>
  new Response(JSON.stringify(cuerpo), {
    status: estado,
    headers: { "Content-Type": "application/json" },
  })

const errorJson = (estado: number, codigo: string, mensaje = "mensaje") =>
  respuestaJson(estado, { error: { codigo, mensaje } })

const me = {
  id: "5a5d7a3e-1c1f-4b8e-9a1e-0f2a3b4c5d6e",
  nombre: "Ana López",
  email: "ana@ejemplo.mx",
  rol: "estudiante",
  debeCambiarContrasena: false,
  accesoRestringido: false,
}

const autorizacionDe = (init: RequestInit | undefined) =>
  new Headers(init?.headers).get("Authorization")

// Doble de fetch por ruta: /api/auth/refrescar responde con `refresco`; /api/me responde 200 solo
// al token "nuevo" y 401 a cualquier otro.
const stubConRefresco = (refresco: () => Promise<Response>) => {
  const fetchMock = vi.fn<typeof fetch>((entrada, init) => {
    if (String(entrada) === "/api/auth/refrescar") return refresco()
    if (autorizacionDe(init) === "Bearer nuevo") return Promise.resolve(respuestaJson(200, me))
    return Promise.resolve(errorJson(401, "NO_AUTENTICADO"))
  })
  vi.stubGlobal("fetch", fetchMock)
  return fetchMock
}

const llamadasA = (fetchMock: ReturnType<typeof vi.fn<typeof fetch>>, ruta: string) =>
  fetchMock.mock.calls.filter(([entrada]) => String(entrada) === ruta).length

afterEach(() => {
  limpiarToken()
  vi.unstubAllGlobals()
  vi.mocked(irA).mockClear()
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

describe("api: refresco silencioso y casos especiales", () => {
  it("un 401 sin token se lanza tal cual, sin llamar a /refrescar ni a irA", async () => {
    const fetchMock = stubConRefresco(() => Promise.resolve(errorJson(401, "SESION_INVALIDA")))

    const error = await api("/api/me", { schema: meRespuestaSchema }).catch((e: unknown) => e)

    expect(esApiError(error) && error.codigo).toBe("NO_AUTENTICADO")
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(llamadasA(fetchMock, "/api/auth/refrescar")).toBe(0)
    expect(irA).not.toHaveBeenCalled()
  })

  it("un 401 con token refresca y reintenta una vez con el token nuevo", async () => {
    const fetchMock = stubConRefresco(() =>
      Promise.resolve(respuestaJson(200, { tokenAcceso: "nuevo" })),
    )
    establecerToken("viejo")

    const datos = await api("/api/me", { schema: meRespuestaSchema })

    expect(datos.nombre).toBe("Ana López")
    expect(fetchMock).toHaveBeenCalledTimes(3)
    const [primera, refresco, reintento] = fetchMock.mock.calls
    expect(autorizacionDe(primera?.[1])).toBe("Bearer viejo")
    expect(String(refresco?.[0])).toBe("/api/auth/refrescar")
    expect(refresco?.[1]?.credentials).toBe("include")
    expect(autorizacionDe(reintento?.[1])).toBe("Bearer nuevo")
    expect(obtenerToken()).toBe("nuevo")
  })

  it("dos llamadas concurrentes con 401 comparten una sola petición a /refrescar", async () => {
    const fetchMock = stubConRefresco(
      () =>
        new Promise((resolver) => {
          setTimeout(() => resolver(respuestaJson(200, { tokenAcceso: "nuevo" })), 20)
        }),
    )
    establecerToken("viejo")

    const [a, b] = await Promise.all([
      api("/api/me", { schema: meRespuestaSchema }),
      api("/api/me", { schema: meRespuestaSchema }),
    ])

    expect(a.id).toBe(me.id)
    expect(b.id).toBe(me.id)
    expect(llamadasA(fetchMock, "/api/auth/refrescar")).toBe(1)
  })

  it("si el refresco falla: NO_AUTENTICADO, token limpio e irA('/login')", async () => {
    stubConRefresco(() => Promise.resolve(errorJson(401, "SESION_INVALIDA")))
    establecerToken("viejo")

    const error = await api("/api/me", { schema: meRespuestaSchema }).catch((e: unknown) => e)

    expect(esApiError(error)).toBe(true)
    if (!esApiError(error)) return
    expect(error.codigo).toBe("NO_AUTENTICADO")
    expect(error.estado).toBe(401)
    expect(haySesion()).toBe(false)
    expect(irA).toHaveBeenCalledWith("/login")
  })

  it("un 502 sin JSON (proxy o API caída) es SIN_CONEXION", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.resolve(new Response("Bad Gateway", { status: 502 }))),
    )

    const error = await api("/api/salud", { schema: saludRespuestaSchema }).catch((e: unknown) => e)

    expect(esApiError(error)).toBe(true)
    if (!esApiError(error)) return
    expect(error.codigo).toBe("SIN_CONEXION")
    expect(error.estado).toBe(502)
  })

  it("un 500 con JSON del proyecto conserva su código (ERROR_INTERNO)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.resolve(errorJson(500, "ERROR_INTERNO", "Ocurrió un error inesperado."))),
    )

    const error = await api("/api/salud", { schema: saludRespuestaSchema }).catch((e: unknown) => e)

    expect(esApiError(error)).toBe(true)
    if (!esApiError(error)) return
    expect(error.codigo).toBe("ERROR_INTERNO")
    expect(error.estado).toBe(500)
  })

  it("un 403 ACCESO_RESTRINGIDO lleva a /acceso-restringido y el error se lanza igual", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.resolve(errorJson(403, "ACCESO_RESTRINGIDO"))),
    )
    establecerToken("vigente")

    const error = await api("/api/clases", { schema: saludRespuestaSchema }).catch(
      (e: unknown) => e,
    )

    expect(esApiError(error) && error.codigo).toBe("ACCESO_RESTRINGIDO")
    expect(irA).toHaveBeenCalledWith("/acceso-restringido")
  })

  it("un 403 CAMBIO_DE_CONTRASENA_REQUERIDO lleva a /cambiar-contrasena y el error se lanza igual", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.resolve(errorJson(403, "CAMBIO_DE_CONTRASENA_REQUERIDO"))),
    )
    establecerToken("vigente")

    const error = await api("/api/clases", { schema: saludRespuestaSchema }).catch(
      (e: unknown) => e,
    )

    expect(esApiError(error) && error.codigo).toBe("CAMBIO_DE_CONTRASENA_REQUERIDO")
    expect(irA).toHaveBeenCalledWith("/cambiar-contrasena")
  })

  it("estando ya en /cambiar-contrasena, un 403 CAMBIO_DE_CONTRASENA_REQUERIDO no navega otra vez", async () => {
    vi.mocked(rutaActual).mockReturnValueOnce("/cambiar-contrasena")
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.resolve(errorJson(403, "CAMBIO_DE_CONTRASENA_REQUERIDO"))),
    )
    establecerToken("vigente")

    const error = await api("/api/clases", { schema: saludRespuestaSchema }).catch(
      (e: unknown) => e,
    )

    expect(esApiError(error) && error.codigo).toBe("CAMBIO_DE_CONTRASENA_REQUERIDO")
    expect(irA).not.toHaveBeenCalled()
  })

  it("un 401 con token en /api/auth/cambiar-contrasena refresca y reintenta (única excepción bajo /api/auth/)", async () => {
    const fetchMock = vi.fn<typeof fetch>((entrada, init) => {
      if (String(entrada) === "/api/auth/refrescar") {
        return Promise.resolve(respuestaJson(200, { tokenAcceso: "nuevo" }))
      }
      if (autorizacionDe(init) === "Bearer nuevo")
        return Promise.resolve(new Response(null, { status: 204 }))
      return Promise.resolve(errorJson(401, "NO_AUTENTICADO"))
    })
    vi.stubGlobal("fetch", fetchMock)
    establecerToken("viejo")

    await api("/api/auth/cambiar-contrasena", {
      method: "POST",
      body: { contrasenaActual: "x", contrasenaNueva: "clave-nueva-1234" },
      schema: sinContenidoSchema,
    })

    expect(fetchMock).toHaveBeenCalledTimes(3)
    expect(llamadasA(fetchMock, "/api/auth/refrescar")).toBe(1)
    expect(obtenerToken()).toBe("nuevo")
  })

  it("un 401 con token en /api/auth/login sigue sin refrescar", async () => {
    const fetchMock = stubConRefresco(() => Promise.resolve(errorJson(401, "SESION_INVALIDA")))
    establecerToken("viejo")

    const error = await api("/api/auth/login", {
      method: "POST",
      body: {},
      schema: tokenAccesoRespuestaSchema,
    }).catch((e: unknown) => e)

    expect(esApiError(error) && error.codigo).toBe("NO_AUTENTICADO")
    expect(llamadasA(fetchMock, "/api/auth/refrescar")).toBe(0)
  })
})
