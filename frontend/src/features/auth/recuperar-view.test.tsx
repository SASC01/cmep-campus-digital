import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { fireEvent, render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router"
import { afterEach, describe, expect, it, vi } from "vitest"

import { RecuperarView } from "./recuperar-view"

const respuestaJson = (estado: number, cuerpo: unknown) =>
  new Response(cuerpo === undefined ? null : JSON.stringify(cuerpo), {
    status: estado,
    headers: cuerpo === undefined ? {} : { "Content-Type": "application/json" },
  })

const errorJson = (estado: number, codigo: string) =>
  respuestaJson(estado, { error: { codigo, mensaje: "mensaje del servidor" } })

const stubFetch = (manejador: () => Response) => {
  const fetchMock = vi.fn<typeof fetch>(() => Promise.resolve(manejador()))
  vi.stubGlobal("fetch", fetchMock)
  return fetchMock
}

const renderVista = () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <RecuperarView />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("RecuperarView", () => {
  it("envía el correo y muestra la confirmación fija", async () => {
    const fetchMock = stubFetch(() => respuestaJson(204, undefined))
    renderVista()

    fireEvent.change(screen.getByLabelText("Correo"), { target: { value: "ana@ejemplo.mx" } })
    fireEvent.click(screen.getByRole("button", { name: "Enviar enlace" }))

    expect(
      await screen.findByText(
        "Si hay una cuenta con ese correo, te enviamos un enlace. Revisa tu bandeja de entrada y la carpeta de spam. El enlace vence en 30 minutos.",
      ),
    ).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it("con 429 muestra el mensaje de una hora", async () => {
    stubFetch(() => errorJson(429, "DEMASIADAS_SOLICITUDES"))
    renderVista()

    fireEvent.change(screen.getByLabelText("Correo"), { target: { value: "ana@ejemplo.mx" } })
    fireEvent.click(screen.getByRole("button", { name: "Enviar enlace" }))

    expect(
      await screen.findByText(
        "Ya pediste varios enlaces para este correo. Espera una hora e inténtalo de nuevo.",
      ),
    ).toBeInTheDocument()
  })

  it("con un correo inválido no envía nada", () => {
    const fetchMock = stubFetch(() => respuestaJson(204, undefined))
    renderVista()

    fireEvent.change(screen.getByLabelText("Correo"), { target: { value: "no-es-correo" } })
    fireEvent.click(screen.getByRole("button", { name: "Enviar enlace" }))

    expect(fetchMock).not.toHaveBeenCalled()
    expect(screen.getByText("Escribe un correo válido")).toBeInTheDocument()
  })
})
