import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import type { ReactNode } from "react"
import { MemoryRouter, Route, Routes } from "react-router"
import { afterEach, describe, expect, it, vi } from "vitest"

import { AlumnosView } from "./alumnos-view"
import { PersonasView } from "./personas-view"

// Tester, CLASES-02d, ronda 3. La corrección de T-08 en useFilaEnFoco y useFocoAlCargarMas con las
// vistas reales (roster del maestro y «Personas»): cambio de pestaña o de aplicación con una fila
// enfocada o con «Ver más alumnos» en vuelo, mientras la respuesta acierta o falla; volver antes o
// después; visibilitychange sin blur y tarde; el clic en blanco que sigue olvidando; las dos vistas
// a la vez; y desmontar con el turno pendiente sin avisos de React. Un navegador real, al perder la
// ventana, dispara blur y focusout sin relatedTarget sobre el control (que sigue enfocado y
// montado), el blur de window, y document.hasFocus() pasa a falso: así se simula.

vi.mock("sonner", () => ({ toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }) }))
vi.mock("@/services/navegacion", () => ({ irA: vi.fn(), rutaActual: vi.fn(() => "/") }))

const CLASE_ID = "2a2b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d01"
const idDe = (n: number) => `6a6b3c4d-1c1f-4b8e-9a1e-${String(n).padStart(12, "0")}`

const respuestaJson = (estado: number, cuerpo: unknown) =>
  new Response(estado === 204 ? null : JSON.stringify(cuerpo), {
    status: estado,
    headers: estado === 204 ? {} : { "Content-Type": "application/json" },
  })
const error500 = () => respuestaJson(500, { error: { codigo: "ERROR_INTERNO", mensaje: "x" } })

const esperar = (ms: number) => act(() => new Promise((r) => setTimeout(r, ms)))

interface Retenida {
  promesa: Promise<void>
  soltar: () => void
}

const retenida = (): Retenida => {
  let soltar: () => void = () => undefined
  const promesa = new Promise<void>((r) => {
    soltar = r
  })
  return { promesa, soltar }
}

// Servidor del roster y de «Personas»: 50 + 5 alumnos; la página siguiente y el DELETE se retienen
// y responden lo que diga `control`.
const crearServidor = () => {
  const control = {
    inscritos: Array.from({ length: 55 }, (_, i) => idDe(i + 1)),
    pagina: null as Retenida | null,
    paginaFalla: false,
    borrado: null as Retenida | null,
    borradoFalla: false,
  }
  const alumno = (id: string) => ({
    id,
    nombre: `Alumno ${id.slice(-3)}`,
    email: `a${id.slice(-3)}@x.mx`,
    estadoPago: "al_corriente",
    accesoRestringido: false,
    origen: "manual",
    inscritoEn: "2026-09-29T15:30:00.000Z",
  })
  const fetchMock = vi.fn<typeof fetch>(async (entrada, init) => {
    const url = new URL(String(entrada), "http://x")
    const metodo = init?.method ?? "GET"
    if (url.pathname.endsWith("/candidatos")) {
      return respuestaJson(200, { candidatos: [], hayMas: false })
    }
    if (metodo === "DELETE") {
      if (control.borrado) await control.borrado.promesa
      if (control.borradoFalla) return error500()
      const id = url.pathname.split("/").at(-1) ?? ""
      control.inscritos = control.inscritos.filter((x) => x !== id)
      return respuestaJson(204, undefined)
    }
    const cursor = url.searchParams.get("cursor")
    if (cursor !== null) {
      if (control.pagina) await control.pagina.promesa
      if (control.paginaFalla) return error500()
    }
    const lista = control.inscritos
    const desde = cursor === null ? 0 : lista.indexOf(cursor) + 1
    const ids = lista.slice(desde, desde + 50)
    const siguienteCursor = lista.length > desde + 50 ? (ids.at(-1) ?? null) : null
    if (url.pathname.endsWith("/personas")) {
      const maestro = { id: idDe(900), nombre: "Luis Pérez", email: "luis@x.mx" }
      return respuestaJson(200, {
        maestro,
        maestros: [maestro],
        alumnos: ids.map((id) => {
          const { nombre, email } = alumno(id)
          return { id, nombre, email }
        }),
        totalAlumnos: lista.length,
        siguienteCursor,
      })
    }
    return respuestaJson(200, { alumnos: ids.map(alumno), total: lista.length, siguienteCursor })
  })
  vi.stubGlobal("fetch", fetchMock)
  return control
}

const montar = (ruta: string, patron: string, vista: ReactNode) =>
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <MemoryRouter initialEntries={[ruta]}>
        <Routes>
          <Route path={patron} element={vista} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )

const roster = () =>
  montar(`/maestro/clases/${CLASE_ID}/alumnos`, "/maestro/clases/:claseId/alumnos", <AlumnosView />)
const personas = () =>
  montar(
    `/estudiante/clases/${CLASE_ID}/personas`,
    "/estudiante/clases/:claseId/personas",
    <PersonasView />,
  )

interface Salida {
  blurDeLaVentana?: boolean
  visibilidad?: boolean
}

const espiarVentana = () => ({
  foco: vi.spyOn(document, "hasFocus"),
  oculta: vi.spyOn(document, "hidden", "get"),
})

// Se va a otra pestaña o aplicación con `control` enfocado.
const salir = async (control: HTMLElement, opciones: Salida = { blurDeLaVentana: true }) => {
  const ventana = espiarVentana()
  ventana.foco.mockReturnValue(false)
  ventana.oculta.mockReturnValue(opciones.visibilidad === true)
  act(() => {
    fireEvent.blur(control, { relatedTarget: null })
    fireEvent.focusOut(control, { relatedTarget: null })
    if (opciones.blurDeLaVentana === true) window.dispatchEvent(new FocusEvent("blur"))
    if (opciones.visibilidad === true) document.dispatchEvent(new Event("visibilitychange"))
  })
  await esperar(20)
  return ventana
}

// Vuelve: la ventana recupera el foco y el navegador devuelve el foco al control, si sigue montado.
const volver = async (ventana: ReturnType<typeof espiarVentana>, control?: HTMLElement) => {
  ventana.foco.mockReturnValue(true)
  ventana.oculta.mockReturnValue(false)
  act(() => {
    document.dispatchEvent(new Event("visibilitychange"))
    window.dispatchEvent(new FocusEvent("focus"))
    if (control?.isConnected === true) {
      fireEvent.focus(control)
      fireEvent.focusIn(control)
    }
  })
  await esperar(20)
}

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe("ataque CLASES-02d r3: «Sí, quitar» del roster con cambio de pestaña (useFilaEnFoco)", () => {
  it("el borrado y la recarga llegan con la pestaña fuera: al volver, el foco está en «Quitar» de la fila que ocupa su lugar", async () => {
    const control = crearServidor()
    control.inscritos = control.inscritos.slice(0, 3)
    roster()
    fireEvent.click(await screen.findByRole("button", { name: "Quitar Alumno 002" }))
    const si = screen.getByRole("button", { name: "Sí, quitar Alumno 002" })
    control.borrado = retenida()
    act(() => si.focus())
    fireEvent.click(si)
    const ventana = await salir(si)
    control.borrado.soltar()
    await waitFor(() => expect(si.isConnected).toBe(false))
    await esperar(30)
    await volver(ventana)
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Quitar Alumno 003" }))
  })

  it("el borrado falla con la pestaña fuera: la fila se queda y, al volver, el foco sigue en su control", async () => {
    const control = crearServidor()
    control.inscritos = control.inscritos.slice(0, 3)
    roster()
    fireEvent.click(await screen.findByRole("button", { name: "Quitar Alumno 002" }))
    const si = screen.getByRole("button", { name: "Sí, quitar Alumno 002" })
    control.borrado = retenida()
    control.borradoFalla = true
    act(() => si.focus())
    fireEvent.click(si)
    const ventana = await salir(si)
    control.borrado.soltar()
    await waitFor(() => expect(si).not.toHaveAttribute("aria-busy", "true"))
    await volver(ventana, si)
    expect(si.isConnected).toBe(true)
    expect(document.activeElement).toBe(si)
  })

  it("con la ventana de vuelta antes del 204, el foco también llega a la fila vecina", async () => {
    const control = crearServidor()
    control.inscritos = control.inscritos.slice(0, 3)
    roster()
    fireEvent.click(await screen.findByRole("button", { name: "Quitar Alumno 003" }))
    const si = screen.getByRole("button", { name: "Sí, quitar Alumno 003" })
    control.borrado = retenida()
    act(() => si.focus())
    fireEvent.click(si)
    const ventana = await salir(si, { blurDeLaVentana: false, visibilidad: true })
    await volver(ventana, si)
    control.borrado.soltar()
    await waitFor(() => expect(si.isConnected).toBe(false))
    await esperar(30)
    // Era la última fila: el foco va a la anterior.
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Quitar Alumno 002" }))
  })
})

describe("ataque CLASES-02d r3: «Ver más alumnos» con cambio de pestaña (useFocoAlCargarMas)", () => {
  it.each([
    ["roster", roster, () => screen.getByRole("button", { name: "Quitar Alumno 051" })],
    [
      "«Personas»",
      personas,
      () =>
        within(screen.getByRole("list", { name: "Alumnos" }))
          .getAllByRole("listitem")
          .find((li) => li.textContent?.includes("Alumno 051")) ?? null,
    ],
  ] as const)(
    "%s: la última página llega con la pestaña fuera (blur de la ventana): al volver, el foco está en la primera fila nueva",
    async (_n, render, primeraNueva) => {
      const control = crearServidor()
      render()
      const boton = await screen.findByRole("button", { name: "Ver más alumnos" })
      control.pagina = retenida()
      act(() => boton.focus())
      fireEvent.click(boton)
      const ventana = await salir(boton)
      control.pagina.soltar()
      await waitFor(() => expect(boton.isConnected).toBe(false))
      await esperar(30)
      await volver(ventana)
      expect(document.activeElement).toBe(primeraNueva())
    },
  )

  it("«Personas»: la página siguiente falla con la pestaña oculta (visibilitychange sin blur): el foco va al encabezado «Alumnos», no a <body>", async () => {
    const control = crearServidor()
    personas()
    const boton = await screen.findByRole("button", { name: "Ver más alumnos" })
    control.pagina = retenida()
    control.paginaFalla = true
    act(() => boton.focus())
    fireEvent.click(boton)
    const ventana = await salir(boton, { blurDeLaVentana: false, visibilidad: true })
    control.pagina.soltar()
    await screen.findByRole("alert")
    await esperar(30)
    await volver(ventana)
    expect(document.activeElement).toBe(screen.getByRole("heading", { name: "Alumnos" }))
  })

  it("«Personas»: visibilitychange que llega después del turno pendiente (hasFocus ya falso): conserva la memoria", async () => {
    const control = crearServidor()
    personas()
    const boton = await screen.findByRole("button", { name: "Ver más alumnos" })
    control.pagina = retenida()
    act(() => boton.focus())
    fireEvent.click(boton)
    const ventana = await salir(boton, { blurDeLaVentana: false })
    await esperar(30)
    ventana.oculta.mockReturnValue(true)
    act(() => {
      document.dispatchEvent(new Event("visibilitychange"))
    })
    control.pagina.soltar()
    await waitFor(() => expect(boton.isConnected).toBe(false))
    await esperar(30)
    await volver(ventana)
    expect(document.activeElement).not.toBe(document.body)
    expect(document.activeElement?.textContent).toContain("Alumno 051")
  })

  it("«Personas»: un clic en blanco con la ventana enfocada sigue olvidando: al llegar la última página el foco no se mueve", async () => {
    const control = crearServidor()
    personas()
    const boton = await screen.findByRole("button", { name: "Ver más alumnos" })
    control.pagina = retenida()
    act(() => boton.focus())
    fireEvent.click(boton)
    act(() => boton.blur())
    await esperar(20)
    control.pagina.soltar()
    await waitFor(() => expect(boton.isConnected).toBe(false))
    await esperar(30)
    expect(document.activeElement).toBe(document.body)
  })
})

describe("ataque CLASES-02d r3: dos instancias a la vez y desmontar con el turno pendiente", () => {
  it("roster y «Personas» montados juntos: el foco de «Ver más» de «Personas» va a su fila nueva y el roster no lo toca", async () => {
    const control = crearServidor()
    montar(
      `/maestro/clases/${CLASE_ID}/alumnos`,
      "/maestro/clases/:claseId/alumnos",
      <>
        <AlumnosView />
        <PersonasView />
      </>,
    )
    await waitFor(() =>
      expect(screen.getAllByRole("button", { name: "Ver más alumnos" })).toHaveLength(2),
    )
    const [delRoster, dePersonas] = screen.getAllByRole("button", { name: "Ver más alumnos" })
    if (!delRoster || !dePersonas) throw new Error("Precondición: faltan los dos «Ver más»")
    control.pagina = retenida()
    act(() => dePersonas.focus())
    fireEvent.click(dePersonas)
    const ventana = await salir(dePersonas)
    control.pagina.soltar()
    await waitFor(() => expect(dePersonas.isConnected).toBe(false))
    await esperar(30)
    await volver(ventana)
    expect(delRoster.isConnected).toBe(true)
    const activo = document.activeElement
    expect(
      activo?.closest("[data-persona-id]"),
      "el foco no está en una fila de «Personas»",
    ).not.toBeNull()
    expect(activo?.textContent).toContain("Alumno 051")
  })

  it("desmontar con un focusout sin destino recién disparado (turno pendiente) no da errores ni avisos de React", async () => {
    crearServidor()
    const consola = { error: vi.spyOn(console, "error"), warn: vi.spyOn(console, "warn") }
    const vista = roster()
    const quitar = await screen.findByRole("button", { name: "Quitar Alumno 001" })
    const verMas = screen.getByRole("button", { name: "Ver más alumnos" })
    act(() => quitar.focus())
    act(() => {
      fireEvent.focusOut(quitar, { relatedTarget: null })
      fireEvent.focusOut(verMas, { relatedTarget: null })
      vista.unmount()
    })
    await esperar(50)
    expect(consola.error).not.toHaveBeenCalled()
    expect(consola.warn).not.toHaveBeenCalled()
  })
})
