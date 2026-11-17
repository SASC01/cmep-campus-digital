// FORO-01c2 (§D-8.3, §D-9): FORO-1C04 en su parte de componente: FormularioTarea con tipo="foro" y sin
// tipo (el de la tarea, igual que hoy).
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { MemoryRouter } from "react-router"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { establecerToken, limpiarToken } from "@/services/tokenAcceso"

import { FormularioTarea } from "./components/formulario-tarea"
import { cuerpoDeForo } from "./lib"
import type { CrearTarea, ForoDetalle, TipoDeActividad } from "./types"

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

const CLASE = "2a2b3c4d-1c2f-4b8e-9a1e-000000000001"

const FORO: ForoDetalle = {
  id: "5a5b3c4d-1c2f-4b8e-9a1e-000000000001",
  titulo: "Debate de la unidad",
  instrucciones: "Opina sobre la lectura.",
  fechaLimite: "2030-01-15T16:00:00.000Z",
  puntos: 20,
  aceptaTardias: false,
  version: 4,
  categoria: null,
  tema: null,
  rubrica: [],
  adjuntos: [],
  autor: {
    id: "3a3b3c4d-1c2f-4b8e-9a1e-000000000001",
    nombre: "Luis Pérez",
    administracion: false,
  },
  creadoEn: "2026-10-06T15:30:00.000Z",
  actualizadoEn: "2026-10-06T15:30:00.000Z",
  puedeEditar: true,
  puedeBorrar: true,
}

let llamadas: string[]

beforeEach(() => {
  establecerToken("token-de-prueba")
  llamadas = []
  vi.stubGlobal(
    "fetch",
    vi.fn<typeof fetch>((entrada) => {
      const url = String(entrada)
      llamadas.push(url)
      const cuerpo = url.endsWith("/temas") ? { temas: [], sinTema: 0 } : { categorias: [] }
      return Promise.resolve(
        new Response(JSON.stringify(cuerpo), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      )
    }),
  )
})

afterEach(() => {
  cleanup()
  limpiarToken()
  vi.unstubAllGlobals()
})

const montar = (
  tipo: TipoDeActividad | undefined,
  onGuardar: (datos: CrearTarea) => Promise<void> = () => Promise.resolve(),
  foro: ForoDetalle | null = null,
) => {
  const cliente = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const formulario =
    foro === null ? (
      <FormularioTarea
        claseId={CLASE}
        tarea={null}
        {...(tipo === undefined ? {} : { tipo })}
        cancelarA="/volver"
        pendiente={false}
        onGuardar={onGuardar}
        version={null}
      />
    ) : (
      <FormularioTarea
        claseId={CLASE}
        tarea={foro}
        {...(tipo === undefined ? {} : { tipo })}
        cancelarA="/volver"
        pendiente={false}
        onGuardar={onGuardar}
        version={foro.version}
      />
    )
  render(
    <QueryClientProvider client={cliente}>
      <MemoryRouter>{formulario}</MemoryRouter>
    </QueryClientProvider>,
  )
}

describe("FORO-1C04 · FormularioTarea con tipo «foro» y sin tipo", () => {
  it("FORO-1C04: con tipo «foro» al crear, los rótulos del foro, «Planteamiento» y «Participaciones después de la fecha límite», sin «Cómo se entrega», y «Publicar foro»", async () => {
    montar("foro")
    expect(await screen.findByRole("heading", { name: "Nuevo foro" })).toBeInTheDocument()
    expect(screen.getByLabelText("Planteamiento")).toBeInTheDocument()
    expect(screen.queryByLabelText("Instrucciones (opcional)")).toBeNull()
    expect(screen.queryByText("Cómo se entrega")).toBeNull()
    expect(screen.queryByRole("button", { name: "Con archivos o enlaces" })).toBeNull()
    const tardias = screen.getByRole("group", {
      name: "Participaciones después de la fecha límite",
    })
    expect(within(tardias).getByRole("button", { name: "Aceptar con retraso" })).toBeInTheDocument()
    expect(within(tardias).getByRole("button", { name: "No aceptar" })).toBeInTheDocument()
    expect(screen.queryByText("Entregas después de la fecha límite")).toBeNull()
    expect(screen.getByRole("button", { name: "Publicar foro" })).toBeInTheDocument()
  })

  it("FORO-1C04: el planteamiento es obligatorio: sin él dice «Escribe el planteamiento del foro» y no pide nada; sin título, «Escribe el título del foro»", async () => {
    const onGuardar = vi.fn(() => Promise.resolve())
    montar("foro", onGuardar)
    await screen.findByRole("heading", { name: "Nuevo foro" })
    const antes = llamadas.length
    fireEvent.change(screen.getByLabelText("Fecha límite"), {
      target: { value: "2030-01-15T10:00" },
    })
    fireEvent.change(screen.getByLabelText("Planteamiento"), { target: { value: "   " } })
    fireEvent.click(screen.getByRole("button", { name: "Publicar foro" }))
    expect(await screen.findByText("Escribe el planteamiento del foro")).toBeInTheDocument()
    expect(screen.getByText("Escribe el título del foro")).toBeInTheDocument()
    expect(onGuardar).not.toHaveBeenCalled()
    expect(llamadas).toHaveLength(antes)
  })

  it("FORO-1C04: con tipo «foro», un envío válido entrega los datos, y su cuerpo de foro no lleva requiereAdjuntos", async () => {
    const onGuardar = vi.fn<(datos: CrearTarea) => Promise<void>>(() => Promise.resolve())
    montar("foro", onGuardar)
    await screen.findByRole("heading", { name: "Nuevo foro" })
    fireEvent.change(screen.getByLabelText("Título"), { target: { value: "Debate" } })
    fireEvent.change(screen.getByLabelText("Planteamiento"), { target: { value: "¿Qué opinas?" } })
    fireEvent.change(screen.getByLabelText("Fecha límite"), {
      target: { value: "2030-01-15T10:00" },
    })
    fireEvent.click(screen.getByRole("button", { name: "No aceptar" }))
    fireEvent.click(screen.getByRole("button", { name: "Publicar foro" }))
    await waitFor(() => expect(onGuardar).toHaveBeenCalledTimes(1))
    const datos = onGuardar.mock.calls[0]?.[0]
    if (datos === undefined) throw new Error("Precondición: onGuardar recibió los datos")
    const cuerpo = cuerpoDeForo(datos)
    expect(cuerpo).toMatchObject({
      titulo: "Debate",
      instrucciones: "¿Qué opinas?",
      aceptaTardias: false,
      puntos: 100,
      categoriaId: null,
      temaId: null,
      archivoIds: [],
    })
    expect(cuerpo).not.toHaveProperty("requiereAdjuntos")
  })

  it("FORO-1C04: con tipo «foro» al editar, «Editar foro», los valores del foro y «Guardar cambios»", async () => {
    montar("foro", undefined, FORO)
    expect(await screen.findByRole("heading", { name: "Editar foro" })).toBeInTheDocument()
    expect(screen.getByLabelText("Título")).toHaveValue("Debate de la unidad")
    expect(screen.getByLabelText("Planteamiento")).toHaveValue("Opina sobre la lectura.")
    expect(screen.getByRole("button", { name: "No aceptar" })).toHaveAttribute(
      "aria-pressed",
      "true",
    )
    expect(screen.getByRole("button", { name: "Guardar cambios" })).toBeInTheDocument()
    expect(screen.queryByText("Cómo se entrega")).toBeNull()
  })

  it("FORO-1C04: sin tipo, el formulario de la tarea, igual que hoy", async () => {
    montar(undefined)
    expect(await screen.findByRole("heading", { name: "Nueva tarea" })).toBeInTheDocument()
    expect(screen.getByLabelText("Instrucciones (opcional)")).toBeInTheDocument()
    expect(screen.queryByLabelText("Planteamiento")).toBeNull()
    expect(screen.getByRole("group", { name: "Cómo se entrega" })).toBeInTheDocument()
    expect(
      screen.getByRole("group", { name: "Entregas después de la fecha límite" }),
    ).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Publicar tarea" })).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "Publicar tarea" }))
    expect(await screen.findByText("Escribe el título de la tarea")).toBeInTheDocument()
  })
})
