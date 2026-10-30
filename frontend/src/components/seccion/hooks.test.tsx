import { act, fireEvent, render, screen } from "@testing-library/react"
import { createMemoryRouter, Link, RouterProvider } from "react-router"
import { describe, expect, it, vi } from "vitest"

import { useAlPulsarLaSeccionActiva as reexportadoPorCalificaciones } from "@/features/calificaciones/hooks"

import { useAlPulsarLaSeccionActiva } from "./hooks"

// CLASES-03 (CL3-C16, DH-06): el gancho compartido de "pulsar la sección activa".

interface VistaProps {
  alPulsar: () => void
}

function Vista({ alPulsar }: VistaProps) {
  useAlPulsarLaSeccionActiva(alPulsar)
  return (
    <>
      <Link to="/clase">Misma sección</Link>
      <Link to="/otra">Otra sección</Link>
    </>
  )
}

const montar = (alPulsar: () => void) => {
  const router = createMemoryRouter(
    [
      { path: "/clase", element: <Vista alPulsar={alPulsar} /> },
      { path: "/otra", element: <p>Otra</p> },
    ],
    { initialEntries: ["/clase"] },
  )
  render(<RouterProvider router={router} />)
  return router
}

describe("useAlPulsarLaSeccionActiva (CL3-C16)", () => {
  it("CL3-C16: no llama a su función al montar ni en otro render con la misma location.key", async () => {
    const alPulsar = vi.fn()
    const router = montar(alPulsar)
    await screen.findByRole("link", { name: "Misma sección" })
    const clave = router.state.location.key
    // Cada render pasa una función nueva; con la misma clave no cuenta como pulsar.
    await act(() => new Promise((resolver) => setTimeout(resolver, 50)))
    expect(router.state.location.key).toBe(clave)
    expect(alPulsar).not.toHaveBeenCalled()
  })

  it("CL3-C16: llama a su función una vez por cada location.key nueva en la misma ruta", async () => {
    const alPulsar = vi.fn()
    const router = montar(alPulsar)
    const enlace = await screen.findByRole("link", { name: "Misma sección" })
    const primera = router.state.location.key

    fireEvent.click(enlace)
    expect(router.state.location.key).not.toBe(primera)
    expect(router.state.location.pathname).toBe("/clase")
    expect(alPulsar).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByRole("link", { name: "Misma sección" }))
    expect(alPulsar).toHaveBeenCalledTimes(2)
  })

  it("CL3-C16: al ir a otra ruta la vista se desmonta y no llama a su función; al volver, montar tampoco cuenta", async () => {
    const alPulsar = vi.fn()
    const router = montar(alPulsar)
    fireEvent.click(await screen.findByRole("link", { name: "Otra sección" }))
    expect(await screen.findByText("Otra")).toBeInTheDocument()
    await act(async () => {
      await router.navigate("/clase")
    })
    expect(await screen.findByRole("link", { name: "Misma sección" })).toBeInTheDocument()
    expect(alPulsar).not.toHaveBeenCalled()
  })

  it("CL3-C16: features/calificaciones lo reexporta: es la misma función", () => {
    expect(reexportadoPorCalificaciones).toBe(useAlPulsarLaSeccionActiva)
  })
})
