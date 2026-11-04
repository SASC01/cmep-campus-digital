import { afterEach, describe, expect, it, vi } from "vitest"

import { descargarArchivo } from "./descargaService"

// CALIFICACIONES-02b (CAL2-B16). La descarga de un archivo armado en la página, con las funciones de
// URL sustituidas y el clic del enlace espiado.

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

describe("descargarArchivo (CAL2-B16)", () => {
  it("CAL2-B16: crea un Blob con el tipo y los bytes, un enlace con download y sin destino, un solo clic, quita el enlace y revoca la URL en el turno siguiente", async () => {
    vi.useFakeTimers()
    const blobs: Blob[] = []
    const crear = vi.fn((blob: Blob) => {
      blobs.push(blob)
      return "blob:prueba/1"
    })
    const revocar = vi.fn()
    vi.stubGlobal("URL", { createObjectURL: crear, revokeObjectURL: revocar })
    const enlaces: HTMLAnchorElement[] = []
    const clic = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      enlaces.push(this)
      expect(this.isConnected, "el enlace está en el documento al pulsarlo").toBe(true)
    })

    const bytes = new Uint8Array([80, 75, 3, 4, 255])
    descargarArchivo(bytes, "Calificaciones - Historia - 2030-01-10.xlsx", "application/x-prueba")

    expect(crear).toHaveBeenCalledTimes(1)
    const [blob] = blobs
    expect(blob?.type).toBe("application/x-prueba")
    expect(new Uint8Array(await (blob as Blob).arrayBuffer())).toEqual(bytes)
    expect(clic).toHaveBeenCalledTimes(1)
    const [enlace] = enlaces
    expect(enlace?.download).toBe("Calificaciones - Historia - 2030-01-10.xlsx")
    expect(enlace?.getAttribute("href")).toBe("blob:prueba/1")
    expect(enlace?.hasAttribute("target")).toBe(false)
    expect(enlace?.isConnected).toBe(false)
    expect(document.querySelectorAll("a")).toHaveLength(0)
    expect(revocar).not.toHaveBeenCalled()

    vi.advanceTimersByTime(0)
    expect(revocar).toHaveBeenCalledTimes(1)
    expect(revocar).toHaveBeenCalledWith("blob:prueba/1")
  })
})
