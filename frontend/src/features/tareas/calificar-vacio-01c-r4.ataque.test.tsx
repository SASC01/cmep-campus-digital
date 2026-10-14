import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { MemoryRouter, Route, Routes } from "react-router"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { establecerToken, limpiarToken } from "@/services/tokenAcceso"

import { EntregaDeAlumnoView } from "./entrega-de-alumno-view"

// Ataque (CALIFICACIONES-01c, ronda 4 cerrada): el remedio de T-05 (erroresDeCalificacionDeApi da el
// genérico cuando no queda mensaje) y su hermano «calificacion:». Pasada mínima sobre el mecanismo de
// mensajes vacíos de calificar: con y sin rúbrica, blancos (espacios, tabuladores, saltos de línea y
// blancos Unicode que \s reconoce), dos intentos seguidos, un 400 vacío pintable seguido de uno no
// pintable (y al revés) y el ErrorDeCampo con texto enlazado por aria-describedby. Reloj fijo (solo
// Date). El servidor es un doble en memoria.

const aviso = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }))
vi.mock("sonner", () => ({ toast: aviso }))

const AHORA = new Date("2030-01-10T12:00:00.000Z")
const FUTURA = "2030-01-15T16:00:00.000Z"
const CLASE_ID = "2a2b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d01"
const TAREA_ID = "7a7b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d77"
const ALUMNO_ID = "9a9b3c4d-1c1f-4b8e-9a1e-0f2a3b4c0301"
const CRITERIO_1 = "8a8b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d81"
const CRITERIO_2 = "8a8b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d82"
const RUTA_TAREA = `/api/clases/${CLASE_ID}/tareas/${TAREA_ID}`
const RUTA_ALUMNO = `${RUTA_TAREA}/entregas/${ALUMNO_ID}`
const RUTA_CALIFICACION = `${RUTA_ALUMNO}/calificacion`
const CLARIDAD = "Claridad (de 5 puntos)"
const ORTOGRAFIA = "Ortografía (de 4 puntos)"
const CALIFICACION = "Calificación (de 80 puntos)"
const COMENTARIO = "Comentario para el alumno (opcional)"
const MENSAJE = "Revisa este valor."
const GENERICO = "Algo salió mal. Inténtalo de nuevo."

let conRubrica = true

const tareaDoble = () => ({
  tarea: {
    id: TAREA_ID,
    titulo: "Ensayo final",
    instrucciones: "",
    fechaLimite: FUTURA,
    puntos: conRubrica ? 10 : 80,
    aceptaTardias: true,
    requiereAdjuntos: true,
    version: 0,
    categoria: null,
    tema: null,
    rubrica: conRubrica
      ? [
          { id: CRITERIO_1, criterio: "Claridad", puntosMax: 5 },
          { id: CRITERIO_2, criterio: "Ortografía", puntosMax: 4 },
        ]
      : [],
    adjuntos: [],
    autor: {
      id: "3a3b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d09",
      nombre: "Luis Pérez",
      administracion: false,
    },
    creadoEn: "2030-01-01T15:30:00.000Z",
    actualizadoEn: "2030-01-01T15:30:00.000Z",
    puedeEditar: true,
    puedeBorrar: true,
  },
})

const entregaDoble = () => ({
  alumno: { id: ALUMNO_ID, nombre: "Ana Ruiz" },
  estado: "entregado",
  fechaEntrega: "2030-01-09T15:30:00.000Z",
  conRetraso: false,
  enlaces: [],
  adjuntos: [],
  version: 2,
  calificacion: null,
})

const respuestaJson = (estado: number, cuerpo: unknown) =>
  new Response(JSON.stringify(cuerpo), {
    status: estado,
    headers: { "Content-Type": "application/json" },
  })

const errorApi = (estado: number, codigo: string, mensaje: string) =>
  respuestaJson(estado, { error: { codigo, mensaje } })

// Cada PUT de calificar toma la siguiente respuesta de la lista (un 400 VALIDACION con ese mensaje).
let respuestas: string[] = []
let puts = 0
let inesperadas: string[] = []

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] })
  vi.setSystemTime(AHORA)
  establecerToken("token-de-prueba")
  conRubrica = true
  respuestas = []
  puts = 0
  inesperadas = []
  vi.stubGlobal(
    "fetch",
    vi.fn<typeof fetch>((entrada, init) => {
      const url = String(entrada)
      const metodo = init?.method ?? "GET"
      if (metodo === "GET" && url === RUTA_TAREA) {
        return Promise.resolve(respuestaJson(200, tareaDoble()))
      }
      if (metodo === "GET" && url === RUTA_ALUMNO) {
        return Promise.resolve(respuestaJson(200, { entrega: entregaDoble() }))
      }
      if (metodo === "GET" && url.includes("/comentarios?")) {
        return Promise.resolve(respuestaJson(200, { comentarios: [], siguienteCursor: null }))
      }
      if (metodo === "PUT" && url === RUTA_CALIFICACION) {
        const mensaje = respuestas[puts]
        puts += 1
        if (mensaje === undefined) {
          inesperadas.push(`PUT sin respuesta preparada (${String(puts)})`)
          return Promise.resolve(errorApi(500, "ERROR_INTERNO", "no esperada"))
        }
        return Promise.resolve(errorApi(400, "VALIDACION", mensaje))
      }
      inesperadas.push(`${metodo} ${url}`)
      return Promise.resolve(errorApi(500, "ERROR_INTERNO", "no esperada"))
    }),
  )
})

afterEach(() => {
  cleanup()
  limpiarToken()
  vi.unstubAllGlobals()
  vi.useRealTimers()
  aviso.success.mockClear()
  aviso.error.mockClear()
})

const nuevoCliente = () =>
  new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })

const sinPeticionesEnVuelo = async (cliente: QueryClient) => {
  await waitFor(() => expect(cliente.isFetching() + cliente.isMutating()).toBe(0))
  await act(async () => {
    for (let i = 0; i < 5; i += 1) await new Promise((r) => setTimeout(r, 0))
  })
}

const escribir = (nombre: string, valor: string) =>
  fireEvent.change(screen.getByLabelText(nombre), { target: { value: valor } })

const boton = () => screen.getByRole("button", { name: "Calificar y devolver" })

const abrir = async () => {
  const cliente = nuevoCliente()
  const base = "/maestro/clases/:claseId/tareas/:tareaId/entregas"
  render(
    <QueryClientProvider client={cliente}>
      <MemoryRouter
        initialEntries={[`/maestro/clases/${CLASE_ID}/tareas/${TAREA_ID}/entregas/${ALUMNO_ID}`]}
      >
        <Routes>
          <Route path={`${base}/:alumnoId`} element={<EntregaDeAlumnoView />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
  await screen.findByLabelText(COMENTARIO)
  await sinPeticionesEnVuelo(cliente)
  if (conRubrica) {
    escribir(CLARIDAD, "4")
    escribir(ORTOGRAFIA, "3")
  } else {
    escribir(CALIFICACION, "72.5")
  }
  escribir(COMENTARIO, "Buen trabajo")
  return cliente
}

const enviar = async (cliente: QueryClient) => {
  const antes = puts
  vi.setSystemTime(new Date(Date.now() + 5_000))
  boton().focus()
  fireEvent.click(boton())
  await waitFor(() => expect(puts).toBe(antes + 1))
  await sinPeticionesEnVuelo(cliente)
}

const avisos = () => aviso.error.mock.calls.map((llamada) => llamada[0] as unknown)

const marcados = () =>
  Array.from(document.querySelectorAll('[aria-invalid="true"]')).map(
    (elemento) => elemento.getAttribute("name") ?? "",
  )

const conservado = () => {
  if (conRubrica) {
    expect(screen.getByLabelText(CLARIDAD)).toHaveValue("4")
    expect(screen.getByLabelText(ORTOGRAFIA)).toHaveValue("3")
  } else {
    expect(screen.getByLabelText(CALIFICACION)).toHaveValue("72.5")
  }
  expect(screen.getByLabelText(COMENTARIO)).toHaveValue("Buen trabajo")
  expect(boton()).not.toHaveAttribute("aria-busy", "true")
  expect(boton()).not.toHaveAttribute("aria-disabled", "true")
}

// El campo marcado (y solo él), con el foco, y su ErrorDeCampo con el genérico, enlazado por
// aria-describedby y presente una sola vez en la vista.
const marcadoConGenerico = (nombre: string) => {
  expect(marcados()).toEqual([nombre])
  const campo = document.querySelector(`[name="${nombre}"]`)
  if (!(campo instanceof HTMLElement)) throw new Error(`Precondición: existe el campo ${nombre}`)
  expect(campo).toHaveFocus()
  const idDelError = (campo.getAttribute("aria-describedby") ?? "")
    .split(" ")
    .find((id) => id.endsWith("-error"))
  if (idDelError === undefined) throw new Error(`Precondición: ${nombre} apunta a su error`)
  const error = document.getElementById(idDelError)
  if (error === null) throw new Error(`Precondición: existe el ErrorDeCampo de ${nombre}`)
  expect((error.textContent ?? "").trim()).toBe(GENERICO)
  expect(campo).toHaveAccessibleDescription(expect.stringContaining(GENERICO))
  expect(screen.getAllByText(GENERICO)).toHaveLength(1)
}

const nombreDe = (prefijo: "c1" | "c2" | "comentario" | "calificacion") => {
  if (prefijo === "c1") return `puntajes.${CRITERIO_1}`
  if (prefijo === "c2") return `puntajes.${CRITERIO_2}`
  return prefijo
}

describe("ataque 01c r4 · prefijo pintable sin mensaje, sin rúbrica (hermano «calificacion:»)", () => {
  it.each([
    ["calificacion:", "calificacion"],
    ["calificacion: ", "calificacion"],
    ["calificacion:\t", "calificacion"],
    ["calificacion:\n", "calificacion"],
    ["calificacion:\r\n", "calificacion"],
    ["calificacion: \t \n ", "calificacion"],
    ["calificacion: ", "calificacion"],
    ["calificacion: ", "calificacion"],
    ["calificacion:﻿", "calificacion"],
    ["comentario:\t\n", "comentario"],
  ] as const)(
    "CAL-T-136: %j marca su campo con el genérico enlazado por aria-describedby, con el foco, sin aviso y con lo escrito",
    async (mensaje, prefijo) => {
      conRubrica = false
      respuestas = [mensaje]
      const cliente = await abrir()

      await enviar(cliente)

      expect(avisos()).toEqual([])
      marcadoConGenerico(nombreDe(prefijo))
      conservado()
      expect(inesperadas).toEqual([])
    },
  )

  it("CAL-T-137: sin rúbrica, «puntajes.0.puntos:» sin mensaje (sin lugar) da un solo aviso genérico y ningún campo marcado", async () => {
    conRubrica = false
    respuestas = ["puntajes.0.puntos:"]
    const cliente = await abrir()

    await enviar(cliente)

    expect(avisos()).toEqual([GENERICO])
    expect(marcados()).toEqual([])
    expect(boton()).toHaveFocus()
    conservado()
    expect(inesperadas).toEqual([])
  })
})

describe("ataque 01c r4 · prefijo pintable sin mensaje, con rúbrica (blancos)", () => {
  it.each([
    ["puntajes.0.puntos:\r\n", "c1"],
    ["puntajes.1.puntos:\t\t", "c2"],
    ["puntajes.0.puntos:  ", "c1"],
    ["comentario:\n", "comentario"],
    ["comentario:\r\n\t ", "comentario"],
    ["comentario:﻿", "comentario"],
  ] as const)(
    "CAL-T-138: %j marca su campo con el genérico enlazado por aria-describedby, con el foco, sin aviso y con lo escrito",
    async (mensaje, prefijo) => {
      respuestas = [mensaje]
      const cliente = await abrir()

      await enviar(cliente)

      expect(avisos()).toEqual([])
      marcadoConGenerico(nombreDe(prefijo))
      conservado()
      expect(inesperadas).toEqual([])
    },
  )

  it.each(["calificacion:", "calificacion:\t\n", "puntajes.2.puntos:", "puntajes.2.puntos:   "])(
    "CAL-T-139: con rúbrica, %j (sin lugar y sin mensaje) da un solo aviso genérico, ningún campo marcado y el foco en el botón",
    async (mensaje) => {
      respuestas = [mensaje]
      const cliente = await abrir()

      await enviar(cliente)

      expect(avisos()).toEqual([GENERICO])
      expect(marcados()).toEqual([])
      expect(boton()).toHaveFocus()
      conservado()
      expect(inesperadas).toEqual([])
    },
  )
})

describe("ataque 01c r4 · intentos seguidos con mensajes vacíos", () => {
  it.each([
    [true, "puntajes.0.puntos:", "c1"],
    [true, "comentario:  ", "comentario"],
    [false, "calificacion:\n", "calificacion"],
  ] as const)(
    "CAL-T-140: (rúbrica %s) %j dos veces seguidas: cada intento deja un ErrorDeCampo con el genérico, el foco en el campo y ningún aviso",
    async (rubrica, mensaje, prefijo) => {
      conRubrica = rubrica
      respuestas = [mensaje, mensaje]
      const cliente = await abrir()

      await enviar(cliente)
      expect(avisos()).toEqual([])
      marcadoConGenerico(nombreDe(prefijo))

      await enviar(cliente)
      expect(avisos()).toEqual([])
      marcadoConGenerico(nombreDe(prefijo))
      conservado()
      expect(puts).toBe(2)
      expect(inesperadas).toEqual([])
    },
  )

  it.each([
    [true, "puntajes.0.puntos:", "c1", "puntajes.0.criterioId:", GENERICO],
    [true, "comentario:", "comentario", "calificacion: ", GENERICO],
    [true, "puntajes.1.puntos:\t", "c2", "version:", GENERICO],
    [true, "comentario:\n", "comentario", `puntajes.0.criterioId: ${MENSAJE}`, MENSAJE],
    [false, "calificacion:\t", "calificacion", "puntajes.0.puntos:", GENERICO],
  ] as const)(
    "CAL-T-141: (rúbrica %s) %j pintado y después %j no pintable: ningún aviso en el primero, uno solo en el segundo y la marca vieja se va",
    async (rubrica, primero, prefijo, segundo, esperado) => {
      conRubrica = rubrica
      respuestas = [primero, segundo]
      const cliente = await abrir()

      await enviar(cliente)
      expect(avisos()).toEqual([])
      marcadoConGenerico(nombreDe(prefijo))

      await enviar(cliente)
      expect(avisos()).toEqual([esperado])
      expect(marcados()).toEqual([])
      expect(screen.queryByText(GENERICO)).toBeNull()
      expect(boton()).toHaveFocus()
      conservado()
      expect(inesperadas).toEqual([])
    },
  )

  it.each([
    [true, "calificacion:", "puntajes.0.puntos: ", "c1"],
    [false, "puntajes.0.puntos:", "calificacion:", "calificacion"],
  ] as const)(
    "CAL-T-142: (rúbrica %s) %j no pintable y después %j pintable: un solo aviso en total (el primero) y el campo marcado con el genérico",
    async (rubrica, primero, segundo, prefijo) => {
      conRubrica = rubrica
      respuestas = [primero, segundo]
      const cliente = await abrir()

      await enviar(cliente)
      expect(avisos()).toEqual([GENERICO])
      expect(marcados()).toEqual([])

      await enviar(cliente)
      expect(avisos()).toEqual([GENERICO])
      marcadoConGenerico(nombreDe(prefijo))
      conservado()
      expect(inesperadas).toEqual([])
    },
  )
})
