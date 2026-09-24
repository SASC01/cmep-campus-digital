import { meRespuestaSchema, saludRespuestaSchema, tokenAccesoRespuestaSchema } from "@campus/shared"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { api, esApiError } from "./apiClient"
import { login, logout, refrescar, registro } from "./authService"
import { irA, rutaActual } from "./navegacion"
import { establecerToken, haySesion, limpiarToken, obtenerToken } from "./tokenAcceso"

// Ataques del Tester (AUTH-01, ronda 1) contra apiClient y authService: refresco single-flight con
// muchas peticiones, un solo reintento, navegación ante 401/403, SIN_CONEXION y almacenamiento.

vi.mock("./navegacion", () => ({ irA: vi.fn(), rutaActual: vi.fn(() => "/estudiante") }))

const respuestaJson = (estado: number, cuerpo: unknown) =>
  new Response(JSON.stringify(cuerpo), {
    status: estado,
    headers: { "Content-Type": "application/json" },
  })

const errorJson = (estado: number, codigo: string) =>
  respuestaJson(estado, { error: { codigo, mensaje: "mensaje del servidor" } })

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

const llamadasA = (fetchMock: ReturnType<typeof vi.fn<typeof fetch>>, ruta: string) =>
  fetchMock.mock.calls.filter(([entrada]) => String(entrada) === ruta).length

const capturar = <T>(promesa: Promise<T>) => promesa.catch((error: unknown) => error)

let escrituras: string[] = []

beforeEach(() => {
  escrituras = []
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(function (this: Storage, llave) {
    escrituras.push(String(llave))
  })
})

afterEach(() => {
  limpiarToken()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  vi.mocked(irA).mockClear()
  vi.mocked(rutaActual).mockReturnValue("/estudiante")
})

describe("ataque: refresco silencioso", () => {
  it("cinco peticiones concurrentes con 401 disparan un solo /refrescar y cada una reintenta una vez", async () => {
    const fetchMock = vi.fn<typeof fetch>((entrada, init) => {
      if (String(entrada) === "/api/auth/refrescar") {
        return new Promise((resolver) =>
          setTimeout(() => resolver(respuestaJson(200, { tokenAcceso: "nuevo" })), 15),
        )
      }
      if (autorizacionDe(init) === "Bearer nuevo") return Promise.resolve(respuestaJson(200, me))
      return Promise.resolve(errorJson(401, "NO_AUTENTICADO"))
    })
    vi.stubGlobal("fetch", fetchMock)
    establecerToken("viejo")

    const resultados = await Promise.all(
      Array.from({ length: 5 }, () => api("/api/me", { schema: meRespuestaSchema })),
    )

    expect(resultados.every((dato) => dato.id === me.id)).toBe(true)
    expect(llamadasA(fetchMock, "/api/auth/refrescar")).toBe(1)
    expect(llamadasA(fetchMock, "/api/me")).toBe(10)
  })

  it("si el reintento vuelve a dar 401 no hay un segundo refresco ni un ciclo", async () => {
    const fetchMock = vi.fn<typeof fetch>((entrada) => {
      if (String(entrada) === "/api/auth/refrescar") {
        return Promise.resolve(respuestaJson(200, { tokenAcceso: "nuevo" }))
      }
      return Promise.resolve(errorJson(401, "NO_AUTENTICADO"))
    })
    vi.stubGlobal("fetch", fetchMock)
    establecerToken("viejo")

    const error = await capturar(api("/api/me", { schema: meRespuestaSchema }))

    expect(esApiError(error) && error.estado).toBe(401)
    expect(llamadasA(fetchMock, "/api/auth/refrescar")).toBe(1)
    expect(fetchMock).toHaveBeenCalledTimes(3)
  })

  it("un /refrescar 200 con cuerpo que no es JSON cuenta como fallo: token limpio e irA('/login')", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>((entrada) => {
        if (String(entrada) === "/api/auth/refrescar") {
          return Promise.resolve(new Response("<html>ok</html>", { status: 200 }))
        }
        return Promise.resolve(errorJson(401, "NO_AUTENTICADO"))
      }),
    )
    establecerToken("viejo")

    const error = await capturar(api("/api/me", { schema: meRespuestaSchema }))

    expect(esApiError(error) && error.codigo).toBe("NO_AUTENTICADO")
    expect(haySesion()).toBe(false)
    expect(irA).toHaveBeenCalledWith("/login")
  })

  it("si /refrescar falla por red: NO_AUTENTICADO y token limpio (no queda un token viejo)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>((entrada) => {
        if (String(entrada) === "/api/auth/refrescar") {
          return Promise.reject(new TypeError("Failed to fetch"))
        }
        return Promise.resolve(errorJson(401, "NO_AUTENTICADO"))
      }),
    )
    establecerToken("viejo")

    const error = await capturar(api("/api/me", { schema: meRespuestaSchema }))

    expect(esApiError(error) && error.codigo).toBe("NO_AUTENTICADO")
    expect(obtenerToken()).toBeUndefined()
  })

  it("pérdida de sesión estando en /registro: limpia el token pero no navega", async () => {
    vi.mocked(rutaActual).mockReturnValue("/registro")
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>((entrada) => {
        if (String(entrada) === "/api/auth/refrescar") {
          return Promise.resolve(errorJson(401, "SESION_INVALIDA"))
        }
        return Promise.resolve(errorJson(401, "NO_AUTENTICADO"))
      }),
    )
    establecerToken("viejo")

    await capturar(api("/api/me", { schema: meRespuestaSchema }))

    expect(haySesion()).toBe(false)
    expect(irA).not.toHaveBeenCalled()
  })

  it("un 401 de /api/auth/login con token en memoria no dispara el refresco", async () => {
    const fetchMock = vi.fn<typeof fetch>(() =>
      Promise.resolve(errorJson(401, "CREDENCIALES_INVALIDAS")),
    )
    vi.stubGlobal("fetch", fetchMock)
    establecerToken("de-otra-sesion")

    const error = await capturar(
      api("/api/auth/login", {
        method: "POST",
        body: { email: "a@b.mx", contrasena: "x" },
        schema: tokenAccesoRespuestaSchema,
      }),
    )

    expect(esApiError(error) && error.codigo).toBe("CREDENCIALES_INVALIDAS")
    expect(llamadasA(fetchMock, "/api/auth/refrescar")).toBe(0)
    expect(irA).not.toHaveBeenCalled()
  })
})

describe("ataque: 403 y errores del servidor", () => {
  it("403 ACCESO_RESTRINGIDO estando ya en /acceso-restringido no vuelve a navegar", async () => {
    vi.mocked(rutaActual).mockReturnValue("/acceso-restringido")
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.resolve(errorJson(403, "ACCESO_RESTRINGIDO"))),
    )
    establecerToken("vigente")

    const error = await capturar(api("/api/clases", { schema: saludRespuestaSchema }))

    expect(esApiError(error) && error.codigo).toBe("ACCESO_RESTRINGIDO")
    expect(irA).not.toHaveBeenCalled()
  })

  it("otro 403 (ROL_NO_PERMITIDO) no navega ni borra el token", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.resolve(errorJson(403, "ROL_NO_PERMITIDO"))),
    )
    establecerToken("vigente")

    const error = await capturar(api("/api/admin", { schema: saludRespuestaSchema }))

    expect(esApiError(error) && error.codigo).toBe("ROL_NO_PERMITIDO")
    expect(irA).not.toHaveBeenCalled()
    expect(obtenerToken()).toBe("vigente")
  })

  it.each([500, 502, 503, 504])("un %i sin JSON es SIN_CONEXION", async (estado) => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.resolve(new Response("", { status: estado }))),
    )
    const error = await capturar(api("/api/salud", { schema: saludRespuestaSchema }))
    expect(esApiError(error) && error.codigo).toBe("SIN_CONEXION")
  })

  it("un 503 con el JSON del proyecto conserva su código", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.resolve(errorJson(503, "BASE_DE_DATOS_NO_DISPONIBLE"))),
    )
    const error = await capturar(api("/api/salud", { schema: saludRespuestaSchema }))
    expect(esApiError(error) && error.codigo).toBe("BASE_DE_DATOS_NO_DISPONIBLE")
  })

  it("un fallo de red es SIN_CONEXION con estado 0", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.reject(new TypeError("Failed to fetch"))),
    )
    const error = await capturar(api("/api/salud", { schema: saludRespuestaSchema }))
    expect(esApiError(error) && [error.codigo, error.estado]).toEqual(["SIN_CONEXION", 0])
  })
})

describe("ataque: el token nunca toca el almacenamiento del navegador", () => {
  it("login, registro, refresco y logout no escriben en localStorage, sessionStorage ni document.cookie", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>((entrada) => {
        const ruta = String(entrada)
        if (ruta === "/api/auth/logout") return Promise.resolve(new Response(null, { status: 204 }))
        return Promise.resolve(respuestaJson(200, { tokenAcceso: `token-${ruta}` }))
      }),
    )
    const cookiesAntes = document.cookie

    await login({ email: "ana@ejemplo.mx", contrasena: "clave-de-prueba-1234" })
    expect(obtenerToken()).toBe("token-/api/auth/login")
    await registro({ nombre: "Ana", email: "ana@ejemplo.mx", contrasena: "clave-de-prueba-1234" })
    await refrescar()
    expect(obtenerToken()).toBe("token-/api/auth/refrescar")
    await logout()

    expect(escrituras).toEqual([])
    expect(localStorage.length).toBe(0)
    expect(sessionStorage.length).toBe(0)
    expect(document.cookie).toBe(cookiesAntes)
    expect(haySesion()).toBe(false)
  })
})
