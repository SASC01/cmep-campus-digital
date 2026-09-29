import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { StrictMode } from "react"
import { createMemoryRouter, RouterProvider } from "react-router"
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"

// Ataques del Tester (DESIGN-01b-2, ronda 2) contra la corrección de T-01 (CC-3 con CC-6): la
// selección guardada por el ojo se consume una sola vez y, al ocultarse por el envío, se restaura
// la selección de ese instante. Todo en <StrictMode>, con el router completo y la API simulada.
// Se localiza por rol, etiqueta y texto accesible, nunca por clases de estilo (tester.md).
// AUTH-03a ronda 0 (C-5): /cambiar-contrasena queda con 2 campos. Donde un caso usaba la temporal
// como campo, ahora usa la nueva; donde usaba la temporal y la nueva, usa la nueva y la
// confirmación. Lo que protege cada caso de la selección y del foco no cambia.

vi.mock("@/services/navegacion", () => ({ irA: vi.fn(), rutaActual: vi.fn(() => "/login") }))

const respuestaJson = (estado: number, cuerpo: unknown) =>
  new Response(cuerpo === undefined ? null : JSON.stringify(cuerpo), {
    status: estado,
    headers: cuerpo === undefined ? {} : { "Content-Type": "application/json" },
  })

const errorJson = (estado: number, codigo: string) =>
  respuestaJson(estado, { error: { codigo, mensaje: "mensaje del servidor" } })

const diferida = () => {
  let resolver: (respuesta: Response) => void = () => {
    throw new Error("la respuesta diferida se resolvió antes de crearse")
  }
  const promesa = new Promise<Response>((r) => {
    resolver = r
  })
  return { promesa, resolver: (respuesta: Response) => resolver(respuesta) }
}

// /cambiar-contrasena (2 campos) con su endpoint en vuelo o respondiendo lo que se pida.
const stubCambio = (respuesta: () => Promise<Response>) => {
  const fetchMock = vi.fn<typeof fetch>((entrada) => {
    const ruta = String(entrada)
    if (ruta === "/api/auth/cambiar-contrasena") return respuesta()
    if (ruta === "/api/auth/refrescar")
      return Promise.resolve(respuestaJson(200, { tokenAcceso: "t" }))
    return Promise.resolve(errorJson(403, "CAMBIO_DE_CONTRASENA_REQUERIDO"))
  })
  vi.stubGlobal("fetch", fetchMock)
  return fetchMock
}

const renderEn = async (ruta: string) => {
  const { rutas } = await import("./router")
  const router = createMemoryRouter(rutas, { initialEntries: [ruta] })
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const vista = render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </StrictMode>,
  )
  return { router, vista }
}

const esperarUnMomento = () => act(() => new Promise((resolver) => setTimeout(resolver, 30)))

const NUEVA = "Contraseña nueva"
const CONFIRMACION = "Confirma la contraseña nueva"
const BOTON: Record<string, string> = {
  [NUEVA]: "Mostrar contraseña nueva",
  [CONFIRMACION]: "Mostrar confirmación de contraseña",
}

const campo = (etiqueta: string) => {
  const elemento = screen.getByLabelText(etiqueta)
  if (!(elemento instanceof HTMLInputElement)) throw new Error(`"${etiqueta}" no es un input`)
  return elemento
}

const ojo = (etiqueta: string) => {
  const nombre = BOTON[etiqueta]
  if (!nombre) throw new Error(`sin botón para "${etiqueta}"`)
  return screen.getByRole("button", { name: nombre })
}

const pulsar = (etiqueta: string) => {
  const boton = ojo(etiqueta)
  fireEvent.mouseDown(boton)
  fireEvent.click(boton)
}

const escribir = (etiqueta: string, valor: string) =>
  fireEvent.change(campo(etiqueta), { target: { value: valor } })

const seleccion = (input: HTMLInputElement) => [input.selectionStart, input.selectionEnd]

const enfocarEn = (input: HTMLInputElement, inicio: number, fin: number) => {
  act(() => input.focus())
  input.setSelectionRange(inicio, fin)
}

const formulario = () => {
  const envio = screen.getByRole("button", { name: "Guardar y continuar" })
  const form = envio.closest("form")
  if (!form) throw new Error("sin formulario")
  return form
}

// Enter en un campo: envío implícito. Con "corta" en los campos, la validación en cliente falla y
// el formulario se queda en pantalla con el foco donde estaba.
const enviar = () => act(() => formulario().requestSubmit())

const preparar = async () => {
  const fetchMock = stubCambio(() => new Promise<Response>(() => undefined))
  const montaje = await renderEn("/cambiar-contrasena")
  await screen.findByRole("button", { name: "Guardar y continuar" })
  escribir(NUEVA, "abcdefgh")
  escribir(CONFIRMACION, "ijklmnop")
  return { fetchMock, ...montaje }
}

beforeAll(async () => {
  await import("./router")
}, 60_000)

beforeEach(() => {
  vi.resetModules()
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe("ataque (DESIGN-01b-2 r2): la selección al ocultarse por el envío es la de ese instante", () => {
  it("varias pulsaciones del ojo con selecciones distintas y después el envío: queda la última de la persona", async () => {
    await preparar()
    const input = campo(NUEVA)
    enfocarEn(input, 1, 1)
    pulsar(NUEVA)
    input.setSelectionRange(3, 5)
    pulsar(NUEVA)
    input.setSelectionRange(0, 2)
    pulsar(NUEVA)
    expect(input.type).toBe("text")
    expect(seleccion(input)).toEqual([0, 2])
    input.setSelectionRange(7, 7)
    enviar()
    expect(input.type).toBe("password")
    expect(document.activeElement).toBe(input)
    expect(seleccion(input)).toEqual([7, 7])
  }, 15_000)

  it("número par de pulsaciones (ya oculta) y envío: la selección no cambia", async () => {
    await preparar()
    const input = campo(NUEVA)
    enfocarEn(input, 2, 2)
    pulsar(NUEVA)
    pulsar(NUEVA)
    expect(input.type).toBe("password")
    input.setSelectionRange(4, 6)
    enviar()
    expect(seleccion(input)).toEqual([4, 6])
    expect(document.activeElement).toBe(input)
  }, 15_000)

  it("envío sin haber pulsado nunca el ojo: ni el foco ni la selección cambian, y el ojo después no trae la del envío", async () => {
    await preparar()
    const input = campo(NUEVA)
    enfocarEn(input, 3, 3)
    enviar()
    expect(input.type).toBe("password")
    expect(document.activeElement).toBe(input)
    expect(seleccion(input)).toEqual([3, 3])
    input.setSelectionRange(6, 8)
    pulsar(NUEVA)
    expect(input.type).toBe("text")
    expect(seleccion(input)).toEqual([6, 8])
  }, 15_000)

  it("selección de rango con la contraseña a la vista: se conserva el rango tras el envío", async () => {
    await preparar()
    const input = campo(CONFIRMACION)
    enfocarEn(input, 0, 0)
    pulsar(CONFIRMACION)
    input.setSelectionRange(2, 6)
    enviar()
    expect(input.type).toBe("password")
    expect(seleccion(input)).toEqual([2, 6])
  }, 15_000)

  it("foco fuera del campo visible: el envío no le devuelve el foco ni le toca la selección", async () => {
    await preparar()
    const oculto = campo(NUEVA)
    const otro = campo(CONFIRMACION)
    enfocarEn(oculto, 1, 1)
    pulsar(NUEVA)
    expect(oculto.type).toBe("text")
    enfocarEn(otro, 2, 5)
    const tocar = vi.spyOn(oculto, "setSelectionRange")
    enviar()
    expect(oculto.type).toBe("password")
    expect(tocar).not.toHaveBeenCalled()
    expect(document.activeElement).toBe(otro)
    expect(seleccion(otro)).toEqual([2, 5])
  }, 15_000)

  it("dos campos visibles del mismo formulario: cada uno conserva la suya y solo el enfocado se restaura", async () => {
    await preparar()
    const primero = campo(NUEVA)
    const segundo = campo(CONFIRMACION)
    enfocarEn(primero, 2, 5)
    pulsar(NUEVA)
    enfocarEn(segundo, 0, 0)
    pulsar(CONFIRMACION)
    segundo.setSelectionRange(1, 3)
    expect([primero.type, segundo.type]).toEqual(["text", "text"])
    const tocarPrimero = vi.spyOn(primero, "setSelectionRange")
    enviar()
    expect([primero.type, segundo.type]).toEqual(["password", "password"])
    expect(document.activeElement).toBe(segundo)
    expect(seleccion(segundo)).toEqual([1, 3])
    expect(tocarPrimero).not.toHaveBeenCalled()
    expect(seleccion(primero)).toEqual([2, 5])
  }, 15_000)

  it("ocultada por el envío y vuelta a mostrar con el ojo: no reaparece ninguna selección vieja", async () => {
    await preparar()
    const input = campo(NUEVA)
    enfocarEn(input, 2, 2)
    pulsar(NUEVA)
    input.setSelectionRange(5, 5)
    enviar()
    expect(seleccion(input)).toEqual([5, 5])
    input.setSelectionRange(4, 4)
    pulsar(NUEVA)
    expect(input.type).toBe("text")
    expect(seleccion(input)).toEqual([4, 4])
    input.setSelectionRange(1, 6)
    pulsar(NUEVA)
    expect(input.type).toBe("password")
    expect(seleccion(input)).toEqual([1, 6])
    // Otro envío ya oculta: nada que restaurar, nada se mueve.
    input.setSelectionRange(3, 3)
    enviar()
    expect(seleccion(input)).toEqual([3, 3])
    input.setSelectionRange(8, 8)
    pulsar(NUEVA)
    expect(seleccion(input)).toEqual([8, 8])
  }, 15_000)

  it("dos envíos seguidos con la contraseña a la vista entre ellos: cada vez la selección de ese instante", async () => {
    await preparar()
    const input = campo(NUEVA)
    enfocarEn(input, 1, 1)
    pulsar(NUEVA)
    input.setSelectionRange(2, 4)
    enviar()
    expect(seleccion(input)).toEqual([2, 4])
    pulsar(NUEVA)
    input.setSelectionRange(6, 6)
    enviar()
    expect(input.type).toBe("password")
    expect(seleccion(input)).toEqual([6, 6])
  }, 15_000)
})

describe("ataque (DESIGN-01b-2 r2): desmontaje durante el envío", () => {
  it("se navega fuera con la petición en vuelo y después llega la respuesta: sin errores ni avisos de React", async () => {
    const pendiente = diferida()
    const consola = vi.spyOn(console, "error")
    stubCambio(() => pendiente.promesa)
    const { router } = await renderEn("/cambiar-contrasena")
    await screen.findByRole("button", { name: "Guardar y continuar" })
    escribir(NUEVA, "clave-nueva-1234")
    escribir(CONFIRMACION, "clave-nueva-1234")
    pulsar(NUEVA)
    pulsar(CONFIRMACION)
    const form = formulario()
    const input = campo(NUEVA)
    act(() => input.focus())
    enviar()
    expect(input.type).toBe("password")

    await act(() => router.navigate("/login"))
    await screen.findByRole("button", { name: "Iniciar sesión" })
    expect(form.isConnected).toBe(false)
    // El formulario viejo, ya desmontado, recibe otro envío: nadie escucha ni toca el campo.
    const tocar = vi.spyOn(input, "setSelectionRange")
    act(() => {
      form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }))
    })
    expect(tocar).not.toHaveBeenCalled()

    await act(async () => {
      pendiente.resolver(respuestaJson(204, undefined))
      await pendiente.promesa
    })
    await esperarUnMomento()
    expect(consola).not.toHaveBeenCalled()
  }, 15_000)

  it("el envío con éxito desmonta el formulario: la contraseña quedó oculta antes y no hay errores", async () => {
    let cambiada = false
    const consola = vi.spyOn(console, "error")
    const enLaPeticion: string[] = []
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>((entrada) => {
        const ruta = String(entrada)
        if (ruta === "/api/auth/refrescar")
          return Promise.resolve(respuestaJson(200, { tokenAcceso: "t" }))
        if (ruta === "/api/auth/cambiar-contrasena") {
          enLaPeticion.push(
            [NUEVA, CONFIRMACION]
              .map((e) => (document.getElementById(campo(e).id) as HTMLInputElement).type)
              .join(","),
          )
          cambiada = true
          return Promise.resolve(respuestaJson(204, undefined))
        }
        if (!cambiada) return Promise.resolve(errorJson(403, "CAMBIO_DE_CONTRASENA_REQUERIDO"))
        return Promise.resolve(
          respuestaJson(200, {
            id: "5a5d7a3e-1c1f-4b8e-9a1e-0f2a3b4c5d6e",
            nombre: "Ana López",
            email: "ana@ejemplo.mx",
            rol: "estudiante",
            debeCambiarContrasena: false,
            accesoRestringido: false,
          }),
        )
      }),
    )
    const { router } = await renderEn("/cambiar-contrasena")
    await screen.findByRole("button", { name: "Guardar y continuar" })
    escribir(NUEVA, "clave-nueva-1234")
    escribir(CONFIRMACION, "clave-nueva-1234")
    for (const etiqueta of [NUEVA, CONFIRMACION]) pulsar(etiqueta)
    act(() => campo(CONFIRMACION).focus())
    enviar()
    await waitFor(() => expect(router.state.location.pathname).toBe("/estudiante"))
    await esperarUnMomento()
    expect(enLaPeticion).toEqual(["password,password"])
    expect(screen.queryByLabelText(NUEVA)).toBeNull()
    expect(consola).not.toHaveBeenCalled()
  }, 15_000)
})
