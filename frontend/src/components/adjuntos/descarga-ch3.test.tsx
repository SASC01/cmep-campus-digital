import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import type { ReactNode } from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { mensajeDeErrorDeApi, type TraduccionDeErrores } from "@/lib/errores-de-api"
import { ENTRADAS_DE_FORMULARIO, MENSAJE_DE_PRUEBA } from "@/lib/errores-de-api-fuera-de-contrato"
import { establecerToken, limpiarToken } from "@/services/tokenAcceso"

import { AdjuntosDePublicacion } from "./adjuntos-de-publicacion"

// CHORE-03 (Enmienda 2, T-02; DH-6): la guarda síncrona con ref de «Descargar» en las dos fichas
// (sin y con `rutaDeArchivos`) y con las dos formas de avisar (el `mensajeDeError` de siempre y
// `alFallarLaDescarga`). La petición de la URL de descarga queda en vuelo hasta que la prueba la suelta.

const aviso = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }))
vi.mock("sonner", () => ({ toast: aviso }))

const CLASE_ID = "2a2b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d01"
const TAREA_ID = "7a7b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d77"
const ARCHIVO_ID = "8a8b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d02"
const URL_DE_DESCARGA = "https://almacen.ejemplo.mx/descarga/x?X-Amz-Expires=300"
const RUTA_DE_LA_ENTREGA = `/api/clases/${CLASE_ID}/tareas/${TAREA_ID}/entrega`

const TRADUCCION: TraduccionDeErrores = {
  generico: "Genérico de prueba.",
  mensajesPorCodigo: {},
  codigosConMensajeDelServidor: [],
  textosPorCampo: {},
}
const mensajeDeError = (error: unknown) => mensajeDeErrorDeApi(error, TRADUCCION)

const pdf = {
  id: ARCHIVO_ID,
  nombre: "trabajo.pdf",
  tipo: "application/pdf",
  tamano: 1000,
  vistaPrevia: null,
}

const respuestaJson = (estado: number, cuerpo: unknown) =>
  new Response(JSON.stringify(cuerpo), {
    status: estado,
    headers: { "Content-Type": "application/json" },
  })

const conUrl = () =>
  respuestaJson(200, { url: URL_DE_DESCARGA, expiraEn: "2030-01-01T00:00:00.000Z" })

// F4: un 400 VALIDACION con una ruta de tres niveles que nadie pinta.
const conValidacion = () =>
  respuestaJson(400, {
    error: { codigo: "VALIDACION", mensaje: ENTRADAS_DE_FORMULARIO.ruta.mensaje },
  })

const asignar = vi.fn()
const enVuelo: ((respuesta: Response) => void)[] = []
const pedidas: string[] = []
const avisosPropios: string[] = []

const soltarTodas = (respuesta: () => Response) => {
  for (const soltar of enVuelo.splice(0)) soltar(respuesta())
}

interface Ficha {
  ficha: string
  rutaDeArchivos: string | undefined
  urlEsperada: string
}

interface FormaDeAvisar {
  forma: string
  conAlFallar: boolean
}

const FICHAS: readonly Ficha[] = [
  {
    ficha: "ficha de la clase",
    rutaDeArchivos: undefined,
    urlEsperada: `/api/clases/${CLASE_ID}/archivos/${ARCHIVO_ID}/descarga`,
  },
  {
    ficha: "ficha en ruta",
    rutaDeArchivos: RUTA_DE_LA_ENTREGA,
    urlEsperada: `${RUTA_DE_LA_ENTREGA}/archivos/${ARCHIVO_ID}/descarga`,
  },
]

const FORMAS: readonly FormaDeAvisar[] = [
  { forma: "el mensajeDeError de siempre", conAlFallar: false },
  { forma: "alFallarLaDescarga", conAlFallar: true },
]

const CASOS = FICHAS.flatMap((ficha) => FORMAS.map((forma) => ({ ...ficha, ...forma })))

// Los avisos que vio la persona, por la forma que use la ficha.
const avisos = () => [
  ...aviso.error.mock.calls.map((llamada) => String(llamada[0])),
  ...avisosPropios,
]

const montar = (rutaDeArchivos: string | undefined, conAlFallar: boolean) => {
  const cliente = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  const alFallarLaDescarga = (error: unknown) => {
    avisosPropios.push(mensajeDeError(error))
  }
  function Envoltorio({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={cliente}>{children}</QueryClientProvider>
  }
  render(
    <AdjuntosDePublicacion
      claseId={CLASE_ID}
      adjuntos={[pdf]}
      mensajeDeError={mensajeDeError}
      {...(rutaDeArchivos === undefined ? {} : { rutaDeArchivos })}
      {...(conAlFallar ? { alFallarLaDescarga } : {})}
    />,
    { wrapper: Envoltorio },
  )
  return screen.getByRole("button", { name: /Descargar/ })
}

const esperarQueSalgaDeLaEspera = async (boton: HTMLElement) => {
  await waitFor(() => {
    expect(boton.getAttribute("aria-busy")).not.toBe("true")
    expect(boton.getAttribute("aria-disabled")).not.toBe("true")
  })
}

beforeEach(() => {
  establecerToken("token-de-prueba")
  enVuelo.length = 0
  pedidas.length = 0
  avisosPropios.length = 0
  vi.stubGlobal("location", { ...window.location, assign: asignar })
  vi.stubGlobal(
    "fetch",
    vi.fn<typeof fetch>((entrada) => {
      pedidas.push(String(entrada))
      return new Promise<Response>((resolver) => enVuelo.push(resolver))
    }),
  )
})

afterEach(() => {
  cleanup()
  limpiarToken()
  vi.unstubAllGlobals()
  asignar.mockReset()
  aviso.error.mockClear()
})

describe("CHORE-03 · guarda de «Descargar» (Enmienda 2, T-02)", () => {
  it.each(CASOS)(
    "CH3-A26: $ficha con $forma: dos clics seguidos que fallan mandan una petición y dan un aviso; al repetir el control se pide otra vez y descarga",
    async ({ rutaDeArchivos, urlEsperada, conAlFallar }) => {
      const boton = montar(rutaDeArchivos, conAlFallar)

      // (a) Dos clics seguidos, con la primera petición en vuelo.
      fireEvent.click(boton)
      fireEvent.click(boton)
      await waitFor(() => expect(enVuelo).toHaveLength(1))
      expect(pedidas).toEqual([urlEsperada])
      soltarTodas(conValidacion)
      await waitFor(() => expect(avisos()).toEqual([MENSAJE_DE_PRUEBA]))
      await esperarQueSalgaDeLaEspera(boton)
      expect(pedidas).toHaveLength(1)
      expect(aviso.error).toHaveBeenCalledTimes(conAlFallar ? 0 : 1)

      // (b) Repetir el control: un clic nuevo, ya asentada la primera, pide otra vez la URL.
      fireEvent.click(boton)
      await waitFor(() => expect(enVuelo).toHaveLength(1))
      expect(pedidas).toEqual([urlEsperada, urlEsperada])
      soltarTodas(conUrl)
      await waitFor(() => expect(asignar).toHaveBeenCalledTimes(1))
      expect(asignar).toHaveBeenCalledWith(URL_DE_DESCARGA)
      await esperarQueSalgaDeLaEspera(boton)
      expect(avisos()).toEqual([MENSAJE_DE_PRUEBA])
    },
  )

  it.each(CASOS)(
    "CH3-A26: $ficha con $forma: dos clics seguidos que salen bien navegan una sola vez",
    async ({ rutaDeArchivos, urlEsperada, conAlFallar }) => {
      const boton = montar(rutaDeArchivos, conAlFallar)

      // (c) Dos clics seguidos con una respuesta buena.
      fireEvent.click(boton)
      fireEvent.click(boton)
      await waitFor(() => expect(enVuelo).toHaveLength(1))
      soltarTodas(conUrl)
      await waitFor(() => expect(asignar).toHaveBeenCalledTimes(1))
      await esperarQueSalgaDeLaEspera(boton)
      expect(asignar).toHaveBeenCalledWith(URL_DE_DESCARGA)
      expect(pedidas).toEqual([urlEsperada])
      expect(avisos()).toEqual([])
    },
  )
})
