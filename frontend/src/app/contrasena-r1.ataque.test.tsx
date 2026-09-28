import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { StrictMode } from "react"
import { createMemoryRouter, RouterProvider } from "react-router"
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"

// Ataques del Tester (DESIGN-01b-2, ronda 1) contra el botón para mostrar u ocultar la contraseña
// (plan-01b.md, §D-7, CC-1 a CC-7, P-04 A, P-05 B y "Puntos de ataque › 01b-2", 1 a 7), en los 7
// campos de los 5 formularios, con el router completo y la API simulada con fetch. Se localiza por
// rol, etiqueta y texto accesible, nunca por clases de estilo (tester.md).

vi.mock("@/services/navegacion", () => ({ irA: vi.fn(), rutaActual: vi.fn(() => "/login") }))

const TOKEN_ENLACE = "a".repeat(43)

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

interface Campo {
  id: string
  etiqueta: string
  boton: string
  autocompletado: string
}

interface Caso {
  nombre: string
  ruta: string
  endpoint: string
  envio: string
  me: () => Response
  campos: Campo[]
  // Deja el formulario válido (la contraseña, con el valor dado).
  llenar: (contrasena: string) => void
  error: () => Response
}

const escribir = (etiqueta: string, valor: string) =>
  fireEvent.change(screen.getByLabelText(etiqueta), { target: { value: valor } })

const sinSesion = () => errorJson(401, "NO_AUTENTICADO")

const NUEVA: Campo = {
  id: "contrasenaNueva",
  etiqueta: "Contraseña nueva",
  boton: "Mostrar contraseña nueva",
  autocompletado: "new-password",
}
const CONFIRMACION: Campo = {
  id: "confirmacion",
  etiqueta: "Confirma la contraseña nueva",
  boton: "Mostrar confirmación de contraseña",
  autocompletado: "new-password",
}

const CASOS: Caso[] = [
  {
    nombre: "login",
    ruta: "/login",
    endpoint: "/api/auth/login",
    envio: "Iniciar sesión",
    me: sinSesion,
    campos: [
      {
        id: "contrasena",
        etiqueta: "Contraseña",
        boton: "Mostrar contraseña",
        autocompletado: "current-password",
      },
    ],
    llenar: (contrasena) => {
      escribir("Correo", "ana@ejemplo.mx")
      escribir("Contraseña", contrasena)
    },
    error: () => errorJson(401, "CREDENCIALES_INVALIDAS"),
  },
  {
    nombre: "registro",
    ruta: "/registro",
    endpoint: "/api/auth/registro",
    envio: "Crear cuenta",
    me: sinSesion,
    campos: [
      {
        id: "contrasena",
        etiqueta: "Contraseña",
        boton: "Mostrar contraseña",
        autocompletado: "new-password",
      },
    ],
    llenar: (contrasena) => {
      escribir("Nombre completo", "Ana López")
      escribir("Correo", "ana@ejemplo.mx")
      escribir("Contraseña", contrasena)
    },
    error: () => errorJson(409, "CORREO_EN_USO"),
  },
  {
    nombre: "restablecer",
    ruta: `/restablecer#token=${TOKEN_ENLACE}`,
    endpoint: "/api/auth/restablecer",
    envio: "Guardar contraseña",
    me: sinSesion,
    campos: [NUEVA, CONFIRMACION],
    llenar: (contrasena) => {
      escribir("Contraseña nueva", contrasena)
      escribir("Confirma la contraseña nueva", contrasena)
    },
    error: () => errorJson(500, "ERROR_INTERNO"),
  },
  {
    nombre: "establecer contraseña",
    ruta: `/establecer-contrasena#token=${TOKEN_ENLACE}`,
    endpoint: "/api/auth/establecer-contrasena",
    envio: "Activar mi cuenta",
    me: sinSesion,
    campos: [NUEVA, CONFIRMACION],
    llenar: (contrasena) => {
      escribir("Contraseña nueva", contrasena)
      escribir("Confirma la contraseña nueva", contrasena)
    },
    error: () => errorJson(500, "ERROR_INTERNO"),
  },
  {
    nombre: "cambio obligatorio",
    ruta: "/cambiar-contrasena",
    endpoint: "/api/auth/cambiar-contrasena",
    envio: "Guardar y continuar",
    me: () => errorJson(403, "CAMBIO_DE_CONTRASENA_REQUERIDO"),
    campos: [
      {
        id: "contrasenaActual",
        etiqueta: "Contraseña temporal",
        boton: "Mostrar contraseña temporal",
        autocompletado: "current-password",
      },
      NUEVA,
      CONFIRMACION,
    ],
    llenar: (contrasena) => {
      escribir("Contraseña temporal", "Kp7mWq4Rt9Xz")
      escribir("Contraseña nueva", contrasena)
      escribir("Confirma la contraseña nueva", contrasena)
    },
    error: () => errorJson(400, "CONTRASENA_ACTUAL_INCORRECTA"),
  },
]

const CONTRASENA = "Clave-Visible-9876"

const stubApi = (caso: Caso, respuesta: () => Promise<Response>) => {
  const fetchMock = vi.fn<typeof fetch>((entrada) => {
    const ruta = String(entrada)
    if (ruta === caso.endpoint) return respuesta()
    if (ruta === "/api/auth/refrescar") {
      return Promise.resolve(
        caso.nombre === "cambio obligatorio"
          ? respuestaJson(200, { tokenAcceso: "t" })
          : errorJson(401, "SESION_INVALIDA"),
      )
    }
    if (ruta === "/api/me") return Promise.resolve(caso.me())
    return Promise.resolve(errorJson(500, "ERROR_INTERNO"))
  })
  vi.stubGlobal("fetch", fetchMock)
  return fetchMock
}

const llamadasA = (fetchMock: ReturnType<typeof stubApi>, ruta: string) =>
  fetchMock.mock.calls.filter(([entrada]) => String(entrada) === ruta).length

const renderEn = async (ruta: string, estricto = false) => {
  const { rutas } = await import("./router")
  const router = createMemoryRouter(rutas, { initialEntries: [ruta] })
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const arbol = (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  )
  render(estricto ? <StrictMode>{arbol}</StrictMode> : arbol)
  return { router, queryClient }
}

const esperarUnMomento = () => act(() => new Promise((resolver) => setTimeout(resolver, 30)))

const campoDe = (campo: Campo) => {
  const elemento = screen.getByLabelText(campo.etiqueta)
  if (!(elemento instanceof HTMLInputElement)) {
    throw new Error(`"${campo.etiqueta}" no devolvió un input sino <${elemento.tagName}>`)
  }
  return elemento
}

const botonDe = (campo: Campo) => screen.getByRole("button", { name: campo.boton })

// Pulsar el ojo como lo haría un ratón: mousedown (con la acción por defecto cancelada) y click.
const pulsar = (boton: HTMLElement) => {
  fireEvent.mouseDown(boton)
  fireEvent.click(boton)
}

const estadoDe = (campo: Campo) => ({
  tipo: campoDe(campo).type,
  presionado: botonDe(campo).getAttribute("aria-pressed"),
})

const ATRIBUTOS_ESTABLES = [
  "autocomplete",
  "name",
  "id",
  "required",
  "aria-invalid",
  "aria-describedby",
  "spellcheck",
  "autocapitalize",
  "autocorrect",
]

const atributos = (campo: HTMLInputElement) =>
  Object.fromEntries(ATRIBUTOS_ESTABLES.map((a) => [a, campo.getAttribute(a)]))

const enfocables = () =>
  Array.from(
    document.querySelectorAll<HTMLElement>("a[href], button, input, select, textarea, [tabindex]"),
  ).filter((el) => el.tabIndex >= 0 && !el.hasAttribute("disabled"))

beforeAll(async () => {
  await import("./router")
}, 60_000)

beforeEach(() => {
  vi.resetModules()
  localStorage.clear()
  sessionStorage.clear()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("ataque (DESIGN-01b-2 r1): nombre, estado y accesibilidad (P-05 B, CC-2)", () => {
  it.each(CASOS)(
    "$nombre: cada campo tiene su botón con nombre fijo, sin aria-label, en orden de Tab",
    async (caso) => {
      stubApi(caso, () => new Promise<Response>(() => undefined))
      await renderEn(caso.ruta)
      await screen.findByRole("button", { name: caso.envio })

      for (const campo of caso.campos) {
        const input = campoDe(campo)
        expect(input.id).toBe(campo.id)
        expect(
          screen.queryAllByLabelText(campo.boton),
          "el botón se encuentra por etiqueta",
        ).toEqual([])
        const boton = botonDe(campo)
        expect(screen.getAllByRole("button", { name: campo.boton })).toHaveLength(1)
        expect(boton).not.toHaveAttribute("aria-label")
        expect(boton).not.toHaveAttribute("aria-labelledby")
        expect(boton).toHaveAttribute("type", "button")
        expect(boton.textContent).toBe(campo.boton)
        expect(within(boton).getByText(campo.boton, { exact: true })).toBeInTheDocument()
        for (const icono of boton.querySelectorAll("svg")) {
          expect(icono).toHaveAttribute("aria-hidden", "true")
        }
        const controlado = boton.getAttribute("aria-controls")
        expect(controlado).toBe(campo.id)
        expect(document.getElementById(controlado ?? "")).toBe(input)
        expect(document.querySelectorAll(`[id="${campo.id}"]`)).toHaveLength(1)
        const orden = enfocables()
        expect(orden.indexOf(boton), "el botón no va justo después de su campo").toBe(
          orden.indexOf(input) + 1,
        )
      }

      // Una búsqueda por etiqueta que mencione la contraseña nunca devuelve un botón: solo los
      // campos y, en /restablecer, el formulario ("Guardar contraseña" es su aria-label).
      const porEtiqueta = screen.getAllByLabelText(/contrase|confirm/i)
      expect(porEtiqueta.filter((el) => el.tagName === "BUTTON")).toEqual([])
      expect(porEtiqueta.every((el) => el.tagName === "INPUT" || el.tagName === "FORM")).toBe(true)
      for (const campo of caso.campos) expect(porEtiqueta).toContain(campoDe(campo))
      // Ningún nombre de botón repetido en la pantalla.
      const nombres = screen.getAllByRole("button").map((b) => b.textContent)
      expect(new Set(nombres).size).toBe(nombres.length)
    },
    15_000,
  )

  it.each(CASOS)(
    "$nombre: 5 activaciones: el nombre no cambia, solo aria-pressed y el type; nada más del campo cambia; ni un envío",
    async (caso) => {
      const fetchMock = stubApi(caso, () => new Promise<Response>(() => undefined))
      await renderEn(caso.ruta)
      const envio = await screen.findByRole("button", { name: caso.envio })
      const envios = vi.fn()
      const formulario = envio.closest("form")
      if (!formulario) throw new Error("el botón de envío no está en un formulario")
      formulario.addEventListener("submit", envios)

      for (const campo of caso.campos) {
        const input = campoDe(campo)
        const antes = atributos(input)
        expect(antes).toMatchObject({
          autocomplete: campo.autocompletado,
          spellcheck: "false",
          autocapitalize: "none",
          autocorrect: "off",
        })
        expect(estadoDe(campo)).toEqual({ tipo: "password", presionado: "false" })
        for (let vez = 1; vez <= 5; vez += 1) {
          pulsar(botonDe(campo))
          const visible = vez % 2 === 1
          expect(estadoDe(campo)).toEqual({
            tipo: visible ? "text" : "password",
            presionado: visible ? "true" : "false",
          })
          expect(screen.getAllByRole("button", { name: campo.boton })).toHaveLength(1)
          expect(atributos(campoDe(campo))).toEqual(antes)
          expect(campoDe(campo)).toBe(input)
        }
        // El click nativo (lo que hace el navegador con Enter y Espacio) tampoco envía.
        act(() => botonDe(campo).click())
        expect(estadoDe(campo).presionado).toBe("false")
      }
      // Cada campo, independiente: al terminar, el primero visible no cambia a los demás.
      const [primero, ...resto] = caso.campos
      if (!primero) throw new Error("sin campos")
      pulsar(botonDe(primero))
      expect(estadoDe(primero)).toEqual({ tipo: "text", presionado: "true" })
      for (const otro of resto)
        expect(estadoDe(otro)).toEqual({ tipo: "password", presionado: "false" })

      await esperarUnMomento()
      expect(envios).not.toHaveBeenCalled()
      expect(llamadasA(fetchMock, caso.endpoint)).toBe(0)
      expect(screen.queryByRole("alert")).toBeNull()
    },
    15_000,
  )
})

describe("ataque (DESIGN-01b-2 r1): al enviar con la contraseña a la vista (P-04 A, CC-6, CC-1)", () => {
  it.each(CASOS)(
    "$nombre: envío válido con Enter: todo oculto antes de la mutación, una sola petición, el ojo no reenvía",
    async (caso) => {
      const pendiente = diferida()
      const enLaPeticion: ReturnType<typeof estadoDe>[][] = []
      const fetchMock = stubApi(caso, () => {
        enLaPeticion.push(caso.campos.map(estadoDe))
        return pendiente.promesa
      })
      await renderEn(caso.ruta)
      const envio = await screen.findByRole("button", { name: caso.envio })
      caso.llenar(CONTRASENA)
      for (const campo of caso.campos) pulsar(botonDe(campo))
      for (const campo of caso.campos) expect(estadoDe(campo).tipo).toBe("text")

      // Lo que ve el formulario después de la fase de captura y antes del onSubmit de React.
      const formulario = envio.closest("form")
      if (!formulario) throw new Error("sin formulario")
      const alEnviar: ReturnType<typeof estadoDe>[][] = []
      formulario.addEventListener("submit", () => alEnviar.push(caso.campos.map(estadoDe)))

      const ultimo = caso.campos.at(-1)
      if (!ultimo) throw new Error("sin campos")
      act(() => campoDe(ultimo).focus())
      // Enter en un campo: el navegador hace un envío implícito (requestSubmit).
      act(() => formulario.requestSubmit())
      const oculto = caso.campos.map(() => ({ tipo: "password", presionado: "false" }))
      expect(alEnviar).toEqual([oculto])
      await waitFor(() => expect(llamadasA(fetchMock, caso.endpoint)).toBe(1))
      expect(enLaPeticion).toEqual([oculto])
      await waitFor(() => expect(envio).toHaveAttribute("aria-busy", "true"))
      expect(envio).toHaveAttribute("aria-disabled", "true")
      for (const campo of caso.campos) {
        expect(screen.getAllByRole("button", { name: campo.boton })).toHaveLength(1)
      }

      // En vuelo: el ojo se puede volver a pulsar sin reenviar; otro Enter tampoco reenvía.
      for (const campo of caso.campos) {
        pulsar(botonDe(campo))
        act(() => botonDe(campo).click())
      }
      act(() => formulario.requestSubmit())
      fireEvent.submit(formulario)
      await esperarUnMomento()
      expect(llamadasA(fetchMock, caso.endpoint)).toBe(1)
      expect(envio).toHaveAttribute("aria-busy", "true")

      await act(async () => {
        pendiente.resolver(caso.error())
        await pendiente.promesa
      })
      expect(await screen.findByRole("alert")).toBeVisible()
      for (const campo of caso.campos) {
        expect(estadoDe(campo)).toEqual({ tipo: "password", presionado: "false" })
        expect(screen.getAllByRole("button", { name: campo.boton })).toHaveLength(1)
      }
      expect(llamadasA(fetchMock, caso.endpoint)).toBe(1)
    },
    15_000,
  )

  it.each(CASOS)(
    "$nombre: error del servidor: tras volver a mostrarla y reenviar, vuelve a ocultarse antes de la segunda petición",
    async (caso) => {
      const enLaPeticion: ReturnType<typeof estadoDe>[][] = []
      const fetchMock = stubApi(caso, () => {
        enLaPeticion.push(caso.campos.map(estadoDe))
        return Promise.resolve(caso.error())
      })
      await renderEn(caso.ruta)
      const envio = await screen.findByRole("button", { name: caso.envio })
      caso.llenar(CONTRASENA)
      for (let intento = 0; intento < 2; intento += 1) {
        for (const campo of caso.campos) pulsar(botonDe(campo))
        fireEvent.click(envio)
        await waitFor(() => expect(llamadasA(fetchMock, caso.endpoint)).toBe(intento + 1))
        await screen.findByRole("alert")
        await waitFor(() => expect(envio).not.toHaveAttribute("aria-busy"))
      }
      const oculto = caso.campos.map(() => ({ tipo: "password", presionado: "false" }))
      expect(enLaPeticion).toEqual([oculto, oculto])
      for (const campo of caso.campos) expect(estadoDe(campo)).toEqual(oculto[0])
    },
    15_000,
  )

  it.each(CASOS)(
    "$nombre: error de validación en cliente: se oculta igual y no sale ninguna petición",
    async (caso) => {
      const fetchMock = stubApi(caso, () => new Promise<Response>(() => undefined))
      await renderEn(caso.ruta)
      const envio = await screen.findByRole("button", { name: caso.envio })
      // Contraseña demasiado corta (y, donde hay confirmación, distinta): el cliente la rechaza.
      for (const campo of caso.campos) escribir(campo.etiqueta, "corta")
      for (const campo of caso.campos) pulsar(botonDe(campo))
      fireEvent.click(envio)
      await esperarUnMomento()
      expect(llamadasA(fetchMock, caso.endpoint)).toBe(0)
      for (const campo of caso.campos) {
        expect(estadoDe(campo)).toEqual({ tipo: "password", presionado: "false" })
      }
    },
    15_000,
  )
})

describe("ataque (DESIGN-01b-2 r1): cursor y foco (CC-3)", () => {
  const caso = CASOS.find((c) => c.nombre === "cambio obligatorio")
  if (!caso) throw new Error("sin el caso de cambio obligatorio")
  const [temporal, nueva] = caso.campos
  if (!temporal || !nueva) throw new Error("sin campos")

  it.each([
    ["en medio", 2, 4],
    ["al principio", 0, 0],
    ["al final", 6, 6],
    ["todo seleccionado", 0, 6],
  ])(
    "selección %s: el ojo no la mueve ni quita el foco, en los dos sentidos, en StrictMode",
    async (_n, inicio, fin) => {
      stubApi(caso, () => new Promise<Response>(() => undefined))
      await renderEn(caso.ruta, true)
      await screen.findByRole("button", { name: caso.envio })
      escribir(temporal.etiqueta, "abcdef")
      const input = campoDe(temporal)
      act(() => input.focus())
      input.setSelectionRange(inicio, fin)
      for (let vez = 0; vez < 2; vez += 1) {
        pulsar(botonDe(temporal))
        expect(document.activeElement).toBe(input)
        expect([input.selectionStart, input.selectionEnd]).toEqual([inicio, fin])
      }
    },
    15_000,
  )

  it("campo vacío: el ojo funciona y el foco se queda en el campo", async () => {
    stubApi(caso, () => new Promise<Response>(() => undefined))
    await renderEn(caso.ruta, true)
    await screen.findByRole("button", { name: caso.envio })
    const input = campoDe(temporal)
    act(() => input.focus())
    pulsar(botonDe(temporal))
    expect(estadoDe(temporal)).toEqual({ tipo: "text", presionado: "true" })
    expect(document.activeElement).toBe(input)
    expect(input.value).toBe("")
  }, 15_000)

  it("con el foco en otro campo, el ojo no se lo lleva ni se lo devuelve a su campo", async () => {
    stubApi(caso, () => new Promise<Response>(() => undefined))
    await renderEn(caso.ruta, true)
    await screen.findByRole("button", { name: caso.envio })
    escribir(temporal.etiqueta, "abcdef")
    escribir(nueva.etiqueta, "ghijkl")
    const otro = campoDe(nueva)
    act(() => otro.focus())
    otro.setSelectionRange(1, 3)
    pulsar(botonDe(temporal))
    expect(estadoDe(temporal).tipo).toBe("text")
    expect(document.activeElement).toBe(otro)
    expect([otro.selectionStart, otro.selectionEnd]).toEqual([1, 3])
  }, 15_000)

  it("con el teclado (foco en el botón), el foco se queda en el botón", async () => {
    stubApi(caso, () => new Promise<Response>(() => undefined))
    await renderEn(caso.ruta, true)
    await screen.findByRole("button", { name: caso.envio })
    const boton = botonDe(temporal)
    act(() => boton.focus())
    act(() => boton.click())
    expect(estadoDe(temporal).tipo).toBe("text")
    expect(document.activeElement).toBe(boton)
  }, 15_000)

  it("al ocultarse por el envío, el cursor se queda donde lo dejó la persona (no vuelve a una selección vieja)", async () => {
    stubApi(caso, () => new Promise<Response>(() => undefined))
    await renderEn(caso.ruta, true)
    const envio = await screen.findByRole("button", { name: caso.envio })
    escribir(temporal.etiqueta, "abcdef")
    const input = campoDe(temporal)
    act(() => input.focus())
    input.setSelectionRange(2, 2)
    pulsar(botonDe(temporal))
    expect(estadoDe(temporal).tipo).toBe("text")
    // La persona lleva el cursor al final y pulsa Enter (envío implícito; la validación falla).
    input.setSelectionRange(6, 6)
    const formulario = envio.closest("form")
    if (!formulario) throw new Error("sin formulario")
    act(() => formulario.requestSubmit())
    expect(estadoDe(temporal).tipo).toBe("password")
    expect(document.activeElement).toBe(input)
    expect(
      [input.selectionStart, input.selectionEnd],
      "el cursor volvió a la selección que había al pulsar el ojo",
    ).toEqual([6, 6])
  }, 15_000)
})

describe("ataque (DESIGN-01b-2 r1): la contraseña a la vista no se guarda en ningún lado", () => {
  it.each(CASOS)(
    "$nombre: ni en localStorage ni en sessionStorage, ni con éxito ni con error",
    async (caso) => {
      stubApi(caso, () => Promise.resolve(caso.error()))
      await renderEn(caso.ruta)
      const envio = await screen.findByRole("button", { name: caso.envio })
      caso.llenar(CONTRASENA)
      for (const campo of caso.campos) pulsar(botonDe(campo))
      fireEvent.click(envio)
      await screen.findByRole("alert")
      for (const campo of caso.campos) pulsar(botonDe(campo))
      await esperarUnMomento()
      for (const almacen of [localStorage, sessionStorage]) {
        const volcado = JSON.stringify(
          Array.from({ length: almacen.length }, (_, i) => {
            const clave = almacen.key(i) ?? ""
            return [clave, almacen.getItem(clave)]
          }),
        )
        expect(volcado).not.toContain(CONTRASENA)
        expect(volcado).not.toContain("Kp7mWq4Rt9Xz")
      }
    },
    15_000,
  )

  it("cambio obligatorio con las contraseñas a la vista: tras el éxito, ni la temporal ni la nueva quedan en la caché de mutaciones (MF-05)", async () => {
    let cambiada = false
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>((entrada) => {
        const ruta = String(entrada)
        if (ruta === "/api/auth/refrescar")
          return Promise.resolve(respuestaJson(200, { tokenAcceso: "t" }))
        if (ruta === "/api/auth/cambiar-contrasena") {
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
    const cambio = CASOS.find((c) => c.nombre === "cambio obligatorio")
    if (!cambio) throw new Error("sin caso")
    const { router, queryClient } = await renderEn(cambio.ruta)
    const envio = await screen.findByRole("button", { name: cambio.envio })
    cambio.llenar(CONTRASENA)
    for (const campo of cambio.campos) pulsar(botonDe(campo))
    fireEvent.click(envio)
    await waitFor(() => expect(router.state.location.pathname).toBe("/estudiante"))
    await esperarUnMomento()
    const mutaciones = JSON.stringify(
      queryClient
        .getMutationCache()
        .getAll()
        .map((m) => m.state),
    )
    expect(mutaciones).not.toContain("Kp7mWq4Rt9Xz")
    expect(mutaciones).not.toContain(CONTRASENA)
  }, 15_000)
})
