import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen } from "@testing-library/react"
import type { ReactElement } from "react"
import { createMemoryRouter, RouterProvider } from "react-router"
import { afterEach, describe, expect, it, vi } from "vitest"

import { CambiarContrasenaView } from "./cambiar-contrasena-view"
import { EstablecerContrasenaView } from "./establecer-contrasena-view"
import { LoginView } from "./login-view"
import { RegistroMaestroView } from "./registro-maestro-view"
import { RegistroView } from "./registro-view"
import { RestablecerView } from "./restablecer-view"

const TOKEN = "A".repeat(43)

const respuestaJson = (estado: number, cuerpo: unknown) =>
  new Response(cuerpo === undefined ? null : JSON.stringify(cuerpo), {
    status: estado,
    headers: cuerpo === undefined ? {} : { "Content-Type": "application/json" },
  })

const stubFetch = () =>
  vi.stubGlobal(
    "fetch",
    vi.fn((entrada: RequestInfo | URL) => {
      if (String(entrada) === "/api/auth/invitacion") {
        return Promise.resolve(respuestaJson(200, { nombre: "Ana López" }))
      }
      return Promise.resolve(respuestaJson(204, undefined))
    }),
  )

const renderConRuta = (path: string, element: ReactElement, hash = "") => {
  const router = createMemoryRouter(
    [
      { path, element },
      { path: "/login", element: <p>Pantalla de login</p> },
      { path: "/estudiante", element: <p>Dashboard del estudiante</p> },
    ],
    { initialEntries: [{ pathname: path, hash }] },
  )
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
}

interface CasoDePantalla {
  nombre: string
  renderizar: () => void
  // [id del campo, nombre exacto del botón, etiqueta del campo]
  campos: [string, string, string][]
}

const CASOS: CasoDePantalla[] = [
  {
    nombre: "/login",
    renderizar: () => renderConRuta("/login", <LoginView />),
    campos: [["contrasena", "Mostrar contraseña", "Contraseña"]],
  },
  {
    nombre: "/registro",
    renderizar: () => renderConRuta("/registro", <RegistroView />),
    campos: [["contrasena", "Mostrar contraseña", "Contraseña"]],
  },
  {
    nombre: "/restablecer (con token)",
    renderizar: () => renderConRuta("/restablecer", <RestablecerView />, `#token=${TOKEN}`),
    campos: [
      ["contrasenaNueva", "Mostrar contraseña nueva", "Contraseña nueva"],
      ["confirmacion", "Mostrar confirmación de contraseña", "Confirma la contraseña nueva"],
    ],
  },
  {
    nombre: "/establecer-contrasena (con token)",
    renderizar: () =>
      renderConRuta("/establecer-contrasena", <EstablecerContrasenaView />, `#token=${TOKEN}`),
    campos: [
      ["contrasenaNueva", "Mostrar contraseña nueva", "Contraseña nueva"],
      ["confirmacion", "Mostrar confirmación de contraseña", "Confirma la contraseña nueva"],
    ],
  },
  {
    nombre: "/cambiar-contrasena",
    renderizar: () => renderConRuta("/cambiar-contrasena", <CambiarContrasenaView />),
    campos: [
      ["contrasenaNueva", "Mostrar contraseña nueva", "Contraseña nueva"],
      ["confirmacion", "Mostrar confirmación de contraseña", "Confirma la contraseña nueva"],
    ],
  },
  {
    // AUTH-03b: sexto formulario con un campo de contraseña (C-14, §D-B7).
    nombre: "/registro-maestro (con token)",
    renderizar: () =>
      renderConRuta("/registro-maestro", <RegistroMaestroView />, `#token=${TOKEN}`),
    campos: [["contrasena", "Mostrar contraseña", "Contraseña"]],
  },
]

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("contraseña visible: nombre exacto por campo en los 6 formularios (§D-7)", () => {
  it.each(CASOS)("$nombre", async ({ renderizar, campos }) => {
    stubFetch()
    renderizar()

    const [primerCampo] = campos
    if (primerCampo) await screen.findByRole("button", { name: primerCampo[1] })

    for (const [id, nombreBoton] of campos) {
      const boton = screen.getByRole("button", { name: nombreBoton })
      expect(boton).toHaveAttribute("aria-controls", id)
      expect(boton).not.toHaveAttribute("aria-label")
    }

    const nombresDeBoton = campos.map(([, nombreBoton]) => nombreBoton)
    expect(new Set(nombresDeBoton).size).toBe(nombresDeBoton.length)
    for (const nombreBoton of nombresDeBoton) {
      expect(screen.getAllByRole("button", { name: nombreBoton })).toHaveLength(1)
    }

    for (const [, , etiqueta] of campos) {
      const campo = screen.getByLabelText(etiqueta)
      expect(campo.tagName).toBe("INPUT")
    }
  })
})
