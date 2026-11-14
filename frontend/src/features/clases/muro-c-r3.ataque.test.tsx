import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { MemoryRouter, Route, Routes } from "react-router"
import { toast } from "sonner"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { ApiError } from "@/services/apiClient"
import { establecerToken, limpiarToken } from "@/services/tokenAcceso"

import { mensajeDeConsultaClases, mensajeDeErrorClases } from "./lib"
import { MuroView } from "./muro-view"

// Ataque del Tester (CLASES-c, ronda 3, punto 2 de la lista del manager): T-34 por la razón
// correcta. El texto "…cambió mientras lo veías…" sale solo con el 400 VALIDACION del campo cursor
// en "Ver más avisos" y "Ver más comentarios"; un 400 de otro campo (con y sin la palabra
// cursor en el mensaje), un 400 que no es VALIDACION, un 500, un 403 o la falta de conexión siguen
// mostrando lo de siempre (mensajeDeConsultaClases).

vi.mock("sonner", () => ({ toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }) }))
const navegacion = vi.hoisted(() => ({ irA: vi.fn(), rutaActual: vi.fn(() => "/estudiante") }))
vi.mock("@/services/navegacion", () => navegacion)

const CLASE_ID = "2a2b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d01"
// CLASES-02b ronda 0 (C-10, §D-2B1 y §D-2B2): el autor del muro suma administracion (obligatorio;
// un maestro firma con su nombre y false) y la publicación y el comentario suman puedeBorrar (la
// vista es la del estudiante: no borra lo del maestro). Ninguna aserción cambia.
const AUTOR = {
  id: "3a3b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d09",
  nombre: "Luis Pérez",
  administracion: false,
}
const ID_PUBLICACION = "5a5b3c4d-1c1f-4b8e-9a1e-000000000001"
const ID_COMENTARIO = "6a6b3c4d-1c1f-4b8e-9a1e-000000000001"
const TEXTO_MURO =
  "Los avisos cambiaron mientras los veías. Vuelve a abrir Avisos para verlos completos."
const TEXTO_COMENTARIOS =
  "Los comentarios cambiaron mientras los veías. Vuelve a abrirlos para verlos completos."

const respuestaJson = (estado: number, cuerpo: unknown) =>
  new Response(JSON.stringify(cuerpo), {
    status: estado,
    headers: { "Content-Type": "application/json" },
  })
const errorJson = (estado: number, codigo: string, mensaje: string) =>
  respuestaJson(estado, { error: { codigo, mensaje } })

interface CasoDeError {
  nombre: string
  respuesta: () => Promise<Response>
  // Lo que mensajeDeErrorClases da para el mismo error: "lo de siempre".
  deSiempre: string
  esCursor: boolean
  // CHORE-06b (C-18 de la ronda 0, §D-5, DH-02 a): la red y el 5xx conservan la lista con un aviso;
  // cualquier 4xx la sigue reemplazando con su texto.
  conserva: boolean
}

const CASOS: CasoDeError[] = [
  {
    nombre: "400 VALIDACION de cursor",
    respuesta: () => Promise.resolve(errorJson(400, "VALIDACION", "cursor: no es válido")),
    deSiempre: "",
    esCursor: true,
    conserva: false,
  },
  {
    nombre: "400 VALIDACION de limite",
    respuesta: () =>
      Promise.resolve(errorJson(400, "VALIDACION", "limite: Too big: expected number")),
    deSiempre: mensajeDeConsultaClases(
      new ApiError("VALIDACION", "limite: Too big: expected number", 400),
    ),
    esCursor: false,
    conserva: false,
  },
  {
    nombre: "400 VALIDACION de otro campo que menciona el cursor",
    respuesta: () =>
      Promise.resolve(errorJson(400, "VALIDACION", "parámetro: el cursor no es válido")),
    deSiempre: mensajeDeConsultaClases(
      new ApiError("VALIDACION", "parámetro: el cursor no es válido", 400),
    ),
    esCursor: false,
    conserva: false,
  },
  {
    nombre: "400 que no es VALIDACION con el prefijo cursor",
    respuesta: () => Promise.resolve(errorJson(400, "OTRO_CODIGO", "cursor: no es válido")),
    deSiempre: mensajeDeErrorClases(new ApiError("OTRO_CODIGO", "cursor: no es válido", 400)),
    esCursor: false,
    conserva: false,
  },
  {
    nombre: "500",
    respuesta: () => Promise.resolve(errorJson(500, "ERROR_INTERNO", "x")),
    deSiempre: mensajeDeErrorClases(new ApiError("SIN_CONEXION", "x", 500)),
    esCursor: false,
    conserva: true,
  },
  {
    nombre: "403 SIN_ACCESO_A_LA_CLASE",
    respuesta: () => Promise.resolve(errorJson(403, "SIN_ACCESO_A_LA_CLASE", "No.")),
    deSiempre: "No tienes acceso a esta clase.",
    esCursor: false,
    conserva: false,
  },
  {
    nombre: "sin conexión (fetch rechaza)",
    respuesta: () => Promise.reject(new TypeError("Failed to fetch")),
    deSiempre: mensajeDeErrorClases(new ApiError("SIN_CONEXION", "x", 0)),
    esCursor: false,
    conserva: true,
  },
]

const stub = (tipo: "publicaciones" | "comentarios", segunda: () => Promise<Response>) => {
  vi.stubGlobal(
    "fetch",
    vi.fn<typeof fetch>((entrada) => {
      const ruta = String(entrada)
      const esComentarios = ruta.includes("/comentarios")
      if (esComentarios && tipo === "comentarios" && ruta.includes(`cursor=${ID_COMENTARIO}`))
        return segunda()
      if (esComentarios) {
        return Promise.resolve(
          respuestaJson(200, {
            comentarios: [
              {
                id: ID_COMENTARIO,
                texto: "Comentario 1",
                autor: AUTOR,
                creadoEn: "2026-09-29T16:30:00.000Z",
                propio: false,
                puedeBorrar: false,
              },
            ],
            siguienteCursor: tipo === "comentarios" ? ID_COMENTARIO : null,
          }),
        )
      }
      if (tipo === "publicaciones" && ruta.includes(`cursor=${ID_PUBLICACION}`)) return segunda()
      return Promise.resolve(
        respuestaJson(200, {
          publicaciones: [
            {
              id: ID_PUBLICACION,
              tipo: "anuncio",
              titulo: null,
              texto: "Publicación 1",
              autor: AUTOR,
              creadoEn: "2026-09-29T15:30:00.000Z",
              comentarios: 2,
              // CLASES-d ronda 0, complemento (C-21, §D-R0; §D-D5 y Enmienda 10): adjuntos es
              // obligatorio en publicacionSchema; ninguna aserción cambia.
              // TAREAS-01b ronda 0 (C-5, §D-R0): publicacionSchema gana la clave obligatoria tarea, null en anuncios y materiales.
              tarea: null,
              adjuntos: [],
              puedeBorrar: false,
            },
          ],
          siguienteCursor: tipo === "publicaciones" ? ID_PUBLICACION : null,
        }),
      )
    }),
  )
}

const renderMuro = () =>
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <MemoryRouter initialEntries={[`/estudiante/clases/${CLASE_ID}`]}>
        <Routes>
          <Route path="/estudiante/clases/:claseId" element={<MuroView />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )

beforeEach(() => {
  establecerToken("token-de-prueba")
})

// CHORE-06b (C-18 de la ronda 0, §D-5): con la red o un 5xx, la lista se queda, sale un solo aviso con lo
// de siempre (contado desde el inicio de cada caso: el doble de sonner no se limpia entre casos; N-03 de
// la Enmienda 3b), no hay ningún role="alert" y el «Ver más …» sigue a la vista.
const comprobarQueSeConserva = async (caso: CasoDeError, nombreDelBoton: string) => {
  await waitFor(() => expect(vi.mocked(toast.error)).toHaveBeenCalledTimes(1))
  expect(vi.mocked(toast.error).mock.calls[0]?.[0]).toBe(caso.deSiempre)
  expect(screen.queryByRole("alert")).toBeNull()
  expect(screen.getByRole("button", { name: nombreDelBoton })).toBeInTheDocument()
}

// Con un 4xx, el error reemplaza la lista con su texto, como antes de CHORE-06b.
const comprobarQueSeReemplaza = async (caso: CasoDeError, textoDelCursor: string) => {
  const alerta = await screen.findByRole("alert")
  const esperado = caso.esCursor ? textoDelCursor : caso.deSiempre
  expect(within(alerta).getByText(esperado)).toBeInTheDocument()
  expect(within(alerta).queryByText(caso.esCursor ? "no es válido" : textoDelCursor)).toBeNull()
}

afterEach(() => {
  cleanup()
  limpiarToken()
  vi.unstubAllGlobals()
})

// CLASES-03c1 ronda 0 (C-16, §D-R0; §D-7.1 y §D-13): «Ver más publicaciones» pasa a «Ver más avisos» y la frase del cursor a R1. Sigue protegiendo lo mismo.
describe("ataque CLASES-c r3: T-34 solo con el 400 del cursor", () => {
  it("los casos de «lo de siempre» no son el texto nuevo (precondición del cotejo)", () => {
    for (const caso of CASOS.filter((c) => !c.esCursor)) {
      expect(caso.deSiempre.length, caso.nombre).toBeGreaterThan(0)
      expect([TEXTO_MURO, TEXTO_COMENTARIOS], caso.nombre).not.toContain(caso.deSiempre)
    }
  })

  it.each(CASOS.map((caso) => [caso.nombre, caso] as const))(
    "«Ver más avisos» con %s",
    async (_nombre, caso) => {
      vi.mocked(toast.error).mockClear()
      stub("publicaciones", caso.respuesta)
      renderMuro()
      fireEvent.click(await screen.findByRole("button", { name: "Ver más avisos" }))
      await (caso.conserva
        ? comprobarQueSeConserva(caso, "Ver más avisos")
        : comprobarQueSeReemplaza(caso, TEXTO_MURO))
    },
  )

  it.each(CASOS.map((caso) => [caso.nombre, caso] as const))(
    "«Ver más comentarios» con %s",
    async (_nombre, caso) => {
      vi.mocked(toast.error).mockClear()
      stub("comentarios", caso.respuesta)
      renderMuro()
      fireEvent.click(await screen.findByRole("button", { name: "Ver comentarios (2)" }))
      fireEvent.click(await screen.findByRole("button", { name: "Ver más comentarios" }))
      await (caso.conserva
        ? comprobarQueSeConserva(caso, "Ver más comentarios")
        : comprobarQueSeReemplaza(caso, TEXTO_COMENTARIOS))
    },
  )
})
