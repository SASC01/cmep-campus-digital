import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import { CuentasView } from "./cuentas-view"

const respuestaJson = (estado: number, cuerpo: unknown) =>
  new Response(JSON.stringify(cuerpo), {
    status: estado,
    headers: { "Content-Type": "application/json" },
  })

const errorJson = (estado: number, codigo: string) =>
  respuestaJson(estado, { error: { codigo, mensaje: "mensaje del servidor" } })

const usuario = {
  id: "b7e6a1a0-1111-4b8e-9a1e-0f2a3b4c5d6e",
  nombre: "Carla Ruiz",
  email: "carla@ejemplo.mx",
  rol: "maestro",
  activo: true,
}

const stubFetch = (manejador: (ruta: string, init?: RequestInit) => Response) => {
  const fetchMock = vi.fn<typeof fetch>((entrada, init) =>
    Promise.resolve(manejador(String(entrada), init)),
  )
  vi.stubGlobal("fetch", fetchMock)
  return fetchMock
}

const renderVista = () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={queryClient}>
      <CuentasView />
    </QueryClientProvider>,
  )
}

const buscarCuenta = async () => {
  fireEvent.change(screen.getByLabelText("Correo exacto de la cuenta"), {
    target: { value: "carla@ejemplo.mx" },
  })
  fireEvent.click(screen.getByRole("button", { name: "Buscar" }))
  await screen.findByText("Carla Ruiz")
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("CuentasView", () => {
  it("invita a un maestro y muestra el mensaje de éxito", async () => {
    stubFetch(() => respuestaJson(201, usuario))
    renderVista()

    fireEvent.change(screen.getByLabelText("Nombre completo"), { target: { value: "Carla Ruiz" } })
    fireEvent.change(screen.getByLabelText("Correo"), { target: { value: "carla@ejemplo.mx" } })
    fireEvent.click(screen.getByRole("button", { name: "Enviar invitación" }))

    expect(
      await screen.findByText(
        "Invitación creada. Carla Ruiz recibirá un correo para elegir su contraseña; el enlace vence en 72 horas.",
      ),
    ).toBeInTheDocument()
  })

  it("el formulario de invitación no autocompleta con los datos de quien lo llena", async () => {
    stubFetch(() => respuestaJson(201, usuario))
    renderVista()

    expect(screen.getByLabelText("Nombre completo")).toHaveAttribute("autocomplete", "off")
    expect(screen.getByLabelText("Correo")).toHaveAttribute("autocomplete", "off")
  })

  it("con 409 muestra que ya existe una cuenta con ese correo", async () => {
    stubFetch(() => errorJson(409, "CORREO_EN_USO"))
    renderVista()

    fireEvent.change(screen.getByLabelText("Nombre completo"), { target: { value: "Carla Ruiz" } })
    fireEvent.change(screen.getByLabelText("Correo"), { target: { value: "carla@ejemplo.mx" } })
    fireEvent.click(screen.getByRole("button", { name: "Enviar invitación" }))

    expect(await screen.findByText("Ya existe una cuenta con ese correo.")).toBeInTheDocument()
  })

  it("busca una cuenta y muestra su ficha", async () => {
    stubFetch(() => respuestaJson(200, { usuario }))
    renderVista()

    await buscarCuenta()

    expect(screen.getByText("carla@ejemplo.mx")).toBeInTheDocument()
    expect(screen.getByText("Maestro")).toBeInTheDocument()
  })

  it("restablecer pide confirmación en línea y muestra la temporal una sola vez", async () => {
    stubFetch((ruta) => {
      if (ruta.endsWith("/restablecer-contrasena")) {
        return respuestaJson(200, { contrasenaTemporal: "abcd-efgh-jkmn" })
      }
      return respuestaJson(200, { usuario })
    })
    renderVista()

    await buscarCuenta()
    fireEvent.click(screen.getByRole("button", { name: "Restablecer contraseña" }))
    expect(
      screen.getByText(
        "Se cerrarán todas sus sesiones y tendrá que cambiar la contraseña al entrar.",
      ),
    ).toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: "Sí, restablecer" }))

    expect(await screen.findByText("abcd-efgh-jkmn")).toBeInTheDocument()
    expect(
      screen.getByText("Cópiala ahora y entrégasela en persona: no se volverá a mostrar."),
    ).toBeInTheDocument()
  })

  it("buscar otra cuenta hace desaparecer la temporal", async () => {
    const otroUsuario = {
      ...usuario,
      id: "c7e6a1a0-2222-4b8e-9a1e-0f2a3b4c5d6f",
      nombre: "Otro Maestro",
      email: "otro@ejemplo.mx",
    }
    let cuentaBuscada = usuario
    stubFetch((ruta) => {
      if (ruta.endsWith("/restablecer-contrasena")) {
        return respuestaJson(200, { contrasenaTemporal: "abcd-efgh-jkmn" })
      }
      return respuestaJson(200, { usuario: cuentaBuscada })
    })
    renderVista()

    await buscarCuenta()
    fireEvent.click(screen.getByRole("button", { name: "Restablecer contraseña" }))
    fireEvent.click(screen.getByRole("button", { name: "Sí, restablecer" }))
    await screen.findByText("abcd-efgh-jkmn")

    cuentaBuscada = otroUsuario
    fireEvent.change(screen.getByLabelText("Correo exacto de la cuenta"), {
      target: { value: "otro@ejemplo.mx" },
    })
    fireEvent.click(screen.getByRole("button", { name: "Buscar" }))

    await screen.findByText("Otro Maestro")
    expect(screen.queryByText("abcd-efgh-jkmn")).not.toBeInTheDocument()
  })

  it("corrige el correo y muestra el mensaje de éxito", async () => {
    stubFetch((ruta, init) => {
      if (init?.method === "PUT")
        return respuestaJson(200, { ...usuario, email: "nueva@ejemplo.mx" })
      return respuestaJson(200, { usuario })
    })
    renderVista()

    await buscarCuenta()
    fireEvent.change(screen.getByLabelText("Correo correcto"), {
      target: { value: "nueva@ejemplo.mx" },
    })
    fireEvent.click(screen.getByRole("button", { name: "Guardar correo" }))

    expect(
      await screen.findByText(
        "Correo actualizado. Los enlaces enviados al correo anterior ya no funcionan.",
      ),
    ).toBeInTheDocument()
  })
})
