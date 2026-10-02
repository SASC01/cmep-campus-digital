import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { subirArchivo } from "./almacenService"
import { establecerToken, limpiarToken } from "./tokenAcceso"

const URL_DEL_ALMACEN = "http://127.0.0.1:9000/campus-privado/materiales/c/a?X-Amz-Expires=300"

const subidaDe = (url: string) => ({
  url,
  metodo: "PUT" as const,
  cabeceras: { "Content-Type": "application/pdf" },
  expiraEn: "2026-10-02T15:00:00.000Z",
})

const archivo = () => new File(["contenido"], "guia.pdf", { type: "application/pdf" })

const stubFetch = (estado = 200) => {
  const fetchMock = vi.fn<typeof fetch>(() =>
    Promise.resolve(new Response(null, { status: estado })),
  )
  vi.stubGlobal("fetch", fetchMock)
  return fetchMock
}

beforeEach(() => {
  establecerToken("token-que-nunca-debe-salir")
})

afterEach(() => {
  limpiarToken()
  vi.unstubAllGlobals()
})

describe("subirArchivo", () => {
  it("PR-D10a: hace un PUT sin Authorization, con credentials omit y con el Content-Type", async () => {
    const fetchMock = stubFetch()
    const elegido = archivo()

    await subirArchivo(subidaDe(URL_DEL_ALMACEN), elegido)

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0] ?? []
    expect(url).toBe(URL_DEL_ALMACEN)
    expect(init?.method).toBe("PUT")
    expect(init?.credentials).toBe("omit")
    expect(init?.body).toBe(elegido)
    const cabeceras = new Headers(init?.headers)
    expect(cabeceras.get("Content-Type")).toBe("application/pdf")
    expect(cabeceras.has("Authorization")).toBe(false)
  })

  it("PR-D10b: rechaza una URL javascript:, una relativa y una del origen de la API, sin llamar a fetch", async () => {
    const fetchMock = stubFetch()

    for (const url of [
      "javascript:alert(1)",
      "/api/clases/x/archivos",
      "data:text/plain,hola",
      `${window.location.origin}/subida/x`,
    ]) {
      await expect(subirArchivo(subidaDe(url), archivo()), url).rejects.toThrow()
    }

    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("PR-D10c: una respuesta que no es ok lanza", async () => {
    stubFetch(403)

    await expect(subirArchivo(subidaDe(URL_DEL_ALMACEN), archivo())).rejects.toThrow()
  })

  it("una falla de red también lanza", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.reject(new TypeError("Failed to fetch"))),
    )

    await expect(subirArchivo(subidaDe(URL_DEL_ALMACEN), archivo())).rejects.toThrow()
  })
})
