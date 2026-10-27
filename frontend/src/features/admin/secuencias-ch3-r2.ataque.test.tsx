import { contarCaracteresVisibles } from "@campus/shared"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { StrictMode, type ReactNode } from "react"
import { MemoryRouter } from "react-router"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { ENTRADAS_DE_FORMULARIO, MENSAJE_DE_PRUEBA } from "@/lib/errores-de-api-fuera-de-contrato"
import { irA } from "@/services/navegacion"
import { establecerToken, limpiarToken } from "@/services/tokenAcceso"

import { BuscadorDeCuenta } from "./components/buscador-de-cuenta"
import { FormularioCorregirCorreo } from "./components/formulario-corregir-correo"
import { FormularioGenerarEnlace } from "./components/formulario-generar-enlace"
import { FormularioInvitacionMasiva } from "./components/formulario-invitacion-masiva"
import { FormularioInvitarMaestro } from "./components/formulario-invitar-maestro"
import { MENSAJE_ERROR_ADMIN_GENERICO, MENSAJES_ERROR_ADMIN, TEXTOS_CUENTAS } from "./data"

// Tester, ronda 2 de CHORE-03 03c. El remedio de T-05 en features/admin (`if (<m>.isError) <m>.reset()`
// después de la guarda isPending) ante secuencias que el programador no recorre: servidor → local →
// servidor → otro local → servidor alternados; local → servidor → local → otro local; éxito → local →
// servidor (el texto de éxito o el resultado no sobreviven a un error del servidor posterior);
// CUPO_DIARIO_INSUFICIENTE (409, lo que responde el servidor, O-26) como primer rechazo; un rechazo
// local enviado con la petición en vuelo; un código que apiClient redirige seguido de un reenvío (estado
// 11); y BuscadorDeCuenta, que sigue con buscar.reset() sin condición: la ficha y sus errores
// desaparecen con un rechazo local. En cada paso, un solo mensaje: el del envío recién hecho. Servidor en
// memoria; reloj fijo (solo Date).

vi.mock("@/services/navegacion", () => ({ irA: vi.fn(), rutaActual: vi.fn(() => "/admin") }))
const aviso = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }))
vi.mock("sonner", () => ({ toast: aviso, Toaster: () => null }))

const AHORA = new Date("2030-01-10T12:00:00.000Z")
const GENERICO = MENSAJE_ERROR_ADMIN_GENERICO
const TITULO = "Error"
const M = MENSAJE_DE_PRUEBA

const USUARIO = {
  id: "1a1b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d01",
  nombre: "Carla Ruiz",
  email: "carla@colegio.mx",
  rol: "maestro",
  activo: true,
} as const

const ENLACE = {
  id: "2a2b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d02",
  creadoEn: "2030-01-02T15:00:00.000Z",
  expiraEn: "2030-01-09T15:00:00.000Z",
  revocadoEn: null,
  estado: "vigente",
  registrados: 0,
} as const

const RUTA_CORREGIR = `/api/admin/usuarios/${USUARIO.id}/correo`
const RUTA_BUSCAR = "/api/admin/usuarios/buscar"

const respuestaJson = (estado: number, cuerpo: unknown) =>
  new Response(JSON.stringify(cuerpo), {
    status: estado,
    headers: { "Content-Type": "application/json" },
  })

const errorApi = (estado: number, codigo: string, mensaje: string) =>
  respuestaJson(estado, { error: { codigo, mensaje } })

type Respuesta = () => Response | Promise<Response>

interface Llamada {
  metodo: string
  ruta: string
}

let preparadas: { metodo: string; ruta: string; respuesta: Respuesta }[] = []
let llamadas: Llamada[] = []
let inesperadas: string[] = []

const preparar = (metodo: string, ruta: string, ...respuestas: Respuesta[]) => {
  for (const respuesta of respuestas) preparadas.push({ metodo, ruta, respuesta })
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] })
  vi.setSystemTime(AHORA)
  establecerToken("token-de-prueba")
  preparadas = []
  llamadas = []
  inesperadas = []
  vi.mocked(irA).mockClear()
  vi.stubGlobal(
    "fetch",
    vi.fn<typeof fetch>((entrada, init) => {
      const url = new URL(String(entrada), "http://local")
      const llamada = { metodo: init?.method ?? "GET", ruta: url.pathname }
      llamadas.push(llamada)
      const indice = preparadas.findIndex(
        (p) => p.metodo === llamada.metodo && p.ruta === llamada.ruta,
      )
      if (indice >= 0) {
        const [preparada] = preparadas.splice(indice, 1)
        if (preparada === undefined) throw new Error("Precondición: la respuesta preparada existe")
        return Promise.resolve(preparada.respuesta())
      }
      if (llamada.metodo === "GET" && llamada.ruta === "/api/admin/enlaces-registro") {
        return Promise.resolve(respuestaJson(200, { enlaces: [ENLACE], siguienteCursor: null }))
      }
      inesperadas.push(`${llamada.metodo} ${llamada.ruta}`)
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

const montar = (elemento: ReactNode) => {
  const cliente = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  render(
    <QueryClientProvider client={cliente}>
      <MemoryRouter>{elemento}</MemoryRouter>
    </QueryClientProvider>,
  )
  return cliente
}

const reposar = async () => {
  await act(async () => {
    for (let i = 0; i < 6; i += 1) await new Promise((r) => setTimeout(r, 0))
  })
}

type Campos = readonly (readonly [string, string])[]

interface Formulario {
  elemento: () => ReactNode
  metodo: string
  ruta: string
  boton: string
  campos: Campos
  locales: readonly (readonly [string, Campos])[]
  exito: Respuesta
  // El código con texto que el servidor de verdad manda para este formulario.
  codigo: readonly [string, Respuesta, string]
}

const CORREO_EN_USO = [
  "CORREO_EN_USO (409)",
  () => errorApi(409, "CORREO_EN_USO", "email: texto del servidor"),
  MENSAJES_ERROR_ADMIN.CORREO_EN_USO,
] as const

const TEXTO_DEL_CUPO = "Hoy solo puedes enviar 2 invitaciones más."
const CUPO = [
  "CUPO_DIARIO_INSUFICIENTE (409)",
  () => errorApi(409, "CUPO_DIARIO_INSUFICIENTE", TEXTO_DEL_CUPO),
  TEXTO_DEL_CUPO,
] as const

const MAS_DE_CIEN = Array.from({ length: 101 }, (_, i) => `m${String(i)}@colegio.mx`).join("\n")

const FORMULARIOS = {
  "invitar maestro": {
    elemento: () => <FormularioInvitarMaestro />,
    metodo: "POST",
    ruta: "/api/admin/maestros",
    boton: "Enviar invitación",
    campos: [
      ["Nombre completo", "Carla Ruiz"],
      ["Correo", "carla@colegio.mx"],
    ],
    locales: [
      ["correo sin arroba", [["Correo", "carla-sin-arroba"]]],
      ["nombre solo de espacios", [["Nombre completo", "   "]]],
      ["nombre de una letra", [["Nombre completo", "C"]]],
    ],
    exito: () => respuestaJson(201, { ...USUARIO, activo: false }),
    codigo: CORREO_EN_USO,
  },
  "invitación masiva": {
    elemento: () => <FormularioInvitacionMasiva />,
    metodo: "POST",
    ruta: "/api/admin/maestros/lote",
    boton: "Enviar invitaciones",
    campos: [["Lista de maestros", "ana@colegio.mx, Ana López"]],
    locales: [
      ["lista solo de espacios", [["Lista de maestros", "  \n \t "]]],
      ["más de 100 líneas", [["Lista de maestros", MAS_DE_CIEN]]],
      ["lista vacía", [["Lista de maestros", ""]]],
    ],
    exito: () =>
      respuestaJson(200, {
        enviadas: [{ email: "ana@colegio.mx", nombre: "Ana López" }],
        yaExistentes: [],
        invalidas: [],
      }),
    codigo: CUPO,
  },
  "generar enlace": {
    elemento: () => <FormularioGenerarEnlace />,
    metodo: "POST",
    ruta: "/api/admin/enlaces-registro",
    boton: "Generar enlace",
    campos: [["Vigencia en días", "10"]],
    locales: [
      ["vigencia 0", [["Vigencia en días", "0"]]],
      ["vigencia 31", [["Vigencia en días", "31"]]],
      ["vigencia decimal", [["Vigencia en días", "1.5"]]],
    ],
    exito: () => respuestaJson(201, { enlace: ENLACE, token: "token-nuevo" }),
    codigo: CORREO_EN_USO,
  },
  "corregir el correo": {
    elemento: () => <FormularioCorregirCorreo usuario={USUARIO} onCorregido={vi.fn()} />,
    metodo: "PUT",
    ruta: RUTA_CORREGIR,
    boton: "Guardar correo",
    campos: [["Correo correcto", "carla.ruiz@colegio.mx"]],
    locales: [
      ["correo sin arroba", [["Correo correcto", "carla-sin-arroba"]]],
      ["correo vacío", [["Correo correcto", ""]]],
      ["correo sin dominio", [["Correo correcto", "carla@"]]],
    ],
    exito: () => respuestaJson(200, { ...USUARIO, email: "carla.ruiz@colegio.mx" }),
    codigo: CORREO_EN_USO,
  },
} as const satisfies Readonly<Record<string, Formulario>>

type NombreDeFormulario = keyof typeof FORMULARIOS
const NOMBRES = Object.keys(FORMULARIOS) as NombreDeFormulario[]

type RechazoDelServidor = readonly [string, Respuesta, string]

const F1: RechazoDelServidor = [
  "F1",
  () => errorApi(400, "VALIDACION", ENTRADAS_DE_FORMULARIO["campo-no-pintable"].mensaje),
  M,
]
const F3: RechazoDelServidor = [
  "F3",
  () => errorApi(400, "VALIDACION", ENTRADAS_DE_FORMULARIO["sin-texto-visible"].mensaje),
  GENERICO,
]

const formularioDe = (nombre: NombreDeFormulario): Formulario => FORMULARIOS[nombre]

const escribir = (campos: Campos) => {
  for (const [etiqueta, valor] of campos) {
    fireEvent.change(screen.getByLabelText(etiqueta), { target: { value: valor } })
  }
}

const peticionesA = (formulario: Formulario) =>
  llamadas.filter(
    (llamada) => llamada.metodo === formulario.metodo && llamada.ruta === formulario.ruta,
  ).length

const botonDe = (formulario: Formulario) => screen.getByRole("button", { name: formulario.boton })

const soloElMensajeError = async (esperado: string) => {
  await waitFor(() => {
    expect(screen.getAllByRole("alert")).toHaveLength(1)
    expect(screen.getByRole("alert").textContent).toBe(`${TITULO}${esperado}`)
  })
  expect(contarCaracteresVisibles(esperado)).toBeGreaterThan(0)
  expect(document.querySelectorAll('[aria-invalid="true"]')).toHaveLength(0)
  expect(aviso.error).not.toHaveBeenCalled()
}

const soloElErrorDeCampo = async () => {
  const comprobar = () => {
    expect(screen.queryAllByRole("alert")).toHaveLength(0)
    const invalidos = document.querySelectorAll('[aria-invalid="true"]')
    expect(invalidos).toHaveLength(1)
    const ids = (invalidos[0]?.getAttribute("aria-describedby") ?? "").split(" ")
    const idDelError = ids.find((id) => id.endsWith("-error"))
    expect(idDelError, "el campo inválido apunta a su ErrorDeCampo").toBeDefined()
    const texto = document.getElementById(idDelError ?? "")?.textContent ?? ""
    expect(contarCaracteresVisibles(texto)).toBeGreaterThan(0)
  }
  comprobar()
  await reposar()
  comprobar()
  expect(aviso.error).not.toHaveBeenCalled()
}

const enReposo = async (formulario: Formulario, cliente: QueryClient) => {
  await waitFor(() => expect(cliente.isMutating()).toBe(0))
  await waitFor(() => expect(botonDe(formulario)).not.toHaveAttribute("aria-busy", "true"))
  expect(botonDe(formulario)).not.toHaveAttribute("aria-disabled", "true")
}

const conservaLoEscrito = (campos: Campos) => {
  for (const [etiqueta, valor] of campos) {
    expect(screen.getByLabelText(etiqueta)).toHaveProperty("value", valor)
  }
}

const pasoDelServidor = async (
  formulario: Formulario,
  cliente: QueryClient,
  rechazo: RechazoDelServidor,
  peticionesEsperadas: number,
) => {
  preparar(formulario.metodo, formulario.ruta, rechazo[1])
  escribir(formulario.campos)
  fireEvent.click(botonDe(formulario))
  await waitFor(() => expect(peticionesA(formulario)).toBe(peticionesEsperadas))
  await soloElMensajeError(rechazo[2])
  await enReposo(formulario, cliente)
  conservaLoEscrito(formulario.campos)
}

const pasoLocal = async (
  formulario: Formulario,
  campos: Campos,
  peticionesEsperadas: number,
  textosQueNoQuedan: readonly string[],
) => {
  escribir(formulario.campos)
  escribir(campos)
  fireEvent.click(botonDe(formulario))
  await soloElErrorDeCampo()
  expect(peticionesA(formulario)).toBe(peticionesEsperadas)
  for (const texto of textosQueNoQuedan) expect(document.body.textContent).not.toContain(texto)
  conservaLoEscrito(campos)
  expect(botonDe(formulario)).not.toHaveAttribute("aria-busy", "true")
}

const localDe = (formulario: Formulario, indice: number): Campos => {
  const local = formulario.locales[indice % formulario.locales.length]
  if (local === undefined) throw new Error("Precondición: el formulario tiene un rechazo local")
  return local[1]
}

const iniciar = async (nombre: NombreDeFormulario) => {
  const formulario = formularioDe(nombre)
  const cliente = montar(formulario.elemento())
  await screen.findByRole("button", { name: formulario.boton })
  return { formulario, cliente }
}

describe("ataque CHORE-03 03c r2 · features/admin: secuencias largas con el remedio de T-05", () => {
  it("precondición: los cuatro formularios de T-05 tienen tres caminos de rechazo local", () => {
    expect(NOMBRES).toHaveLength(4)
    for (const nombre of NOMBRES) {
      expect(formularioDe(nombre).locales, nombre).toHaveLength(3)
    }
  })

  it.each(NOMBRES.map((nombre) => [nombre] as const))(
    "%s: servidor (F1) → local → servidor (su código con texto) → otro local → servidor (F3) → tercer local: en cada paso un solo mensaje y solo los envíos válidos llegan al servidor",
    async (nombre) => {
      const { formulario, cliente } = await iniciar(nombre)

      await pasoDelServidor(formulario, cliente, F1, 1)
      await pasoLocal(formulario, localDe(formulario, 0), 1, [M])
      await pasoDelServidor(formulario, cliente, formulario.codigo, 2)
      await pasoLocal(formulario, localDe(formulario, 1), 2, [formulario.codigo[2]])
      await pasoDelServidor(formulario, cliente, F3, 3)
      await pasoLocal(formulario, localDe(formulario, 2), 3, [GENERICO])

      expect(inesperadas).toEqual([])
    },
  )

  it.each(NOMBRES.map((nombre) => [nombre] as const))(
    "%s: local → servidor (F1) → local → otro local seguido → éxito: el segundo rechazo local tampoco trae el MensajeError, y el éxito llega sin alerta",
    async (nombre) => {
      const { formulario, cliente } = await iniciar(nombre)

      await pasoLocal(formulario, localDe(formulario, 0), 0, [])
      await pasoDelServidor(formulario, cliente, F1, 1)
      await pasoLocal(formulario, localDe(formulario, 1), 1, [M])
      await pasoLocal(formulario, localDe(formulario, 2), 1, [M])

      preparar(formulario.metodo, formulario.ruta, formulario.exito)
      escribir(formulario.campos)
      fireEvent.click(botonDe(formulario))
      await waitFor(() => expect(peticionesA(formulario)).toBe(2))
      await waitFor(() => expect(screen.getAllByRole("status").length).toBeGreaterThan(0))
      await enReposo(formulario, cliente)
      expect(screen.queryAllByRole("alert")).toHaveLength(0)
      expect(document.querySelectorAll('[aria-invalid="true"]')).toHaveLength(0)
      expect(inesperadas).toEqual([])
    },
  )

  it.each(
    NOMBRES.flatMap((nombre) =>
      [F1, F3, formularioDe(nombre).codigo].map(
        (rechazo) => [nombre, rechazo[0], rechazo] as const,
      ),
    ),
  )(
    "%s: éxito → local (el resultado del éxito sigue junto al ErrorDeCampo, §D-2) → servidor (%s): el error del servidor reemplaza al éxito y al ErrorDeCampo, sin role=status ni campo inválido; el local siguiente deja solo su ErrorDeCampo",
    async (nombre, _rechazo, rechazo) => {
      const { formulario, cliente } = await iniciar(nombre)
      preparar(formulario.metodo, formulario.ruta, formulario.exito)
      escribir(formulario.campos)
      fireEvent.click(botonDe(formulario))
      await waitFor(() => expect(screen.getAllByRole("status").length).toBeGreaterThan(0))
      await enReposo(formulario, cliente)

      await pasoLocal(formulario, localDe(formulario, 0), 1, [])
      expect(screen.getAllByRole("status").length).toBeGreaterThan(0)
      await pasoDelServidor(formulario, cliente, rechazo, 2)
      expect(screen.queryAllByRole("status")).toHaveLength(0)
      await pasoLocal(formulario, localDe(formulario, 1), 2, [rechazo[2]])
      expect(inesperadas).toEqual([])
    },
  )

  it.each(
    NOMBRES.flatMap((nombre) =>
      [F1, F3, formularioDe(nombre).codigo].map(
        (rechazo) => [nombre, rechazo[0], rechazo] as const,
      ),
    ),
  )(
    "%s: tras %s, un rechazo local enviado con la petición siguiente en vuelo (submit del formulario) no pide ni pinta nada; al soltarla con F1 queda un solo MensajeError y el rechazo local siguiente deja solo el ErrorDeCampo",
    async (nombre, _rechazo, rechazo) => {
      const { formulario, cliente } = await iniciar(nombre)
      await pasoDelServidor(formulario, cliente, rechazo, 1)

      const soltar: ((respuesta: Response) => void)[] = []
      preparar(
        formulario.metodo,
        formulario.ruta,
        () =>
          new Promise<Response>((resolver) => {
            soltar.push(resolver)
          }),
      )
      escribir(formulario.campos)
      fireEvent.click(botonDe(formulario))
      await waitFor(() => expect(peticionesA(formulario)).toBe(2))
      await waitFor(() => expect(botonDe(formulario)).toHaveAttribute("aria-busy", "true"))
      expect(screen.queryAllByRole("alert")).toHaveLength(0)

      escribir(localDe(formulario, 0))
      const elFormulario = botonDe(formulario).closest("form")
      if (elFormulario === null) throw new Error("Precondición: el botón está en un formulario")
      fireEvent.submit(elFormulario)
      await reposar()
      expect(peticionesA(formulario)).toBe(2)
      expect(document.querySelectorAll('[aria-invalid="true"]')).toHaveLength(0)
      expect(screen.queryAllByRole("alert")).toHaveLength(0)

      const liberar = soltar[0]
      if (liberar === undefined) throw new Error("Precondición: la petición retenida salió")
      liberar(errorApi(400, "VALIDACION", ENTRADAS_DE_FORMULARIO["campo-no-pintable"].mensaje))
      await soloElMensajeError(M)
      await enReposo(formulario, cliente)

      fireEvent.click(botonDe(formulario))
      await soloElErrorDeCampo()
      expect(peticionesA(formulario)).toBe(2)
      expect(document.body.textContent).not.toContain(M)
      expect(inesperadas).toEqual([])
    },
  )

  it.each(
    FORMULARIOS["invitación masiva"].locales.map(([camino], indice) => [camino, indice] as const),
  )(
    "invitación masiva: CUPO_DIARIO_INSUFICIENTE (409) como primer rechazo y después «%s»: solo el ErrorDeCampo, sin el texto del cupo; repetir el control válido manda otra petición",
    async (_camino, indice) => {
      const { formulario, cliente } = await iniciar("invitación masiva")
      await pasoDelServidor(formulario, cliente, CUPO, 1)
      await pasoLocal(formulario, localDe(formulario, indice), 1, [TEXTO_DEL_CUPO])
      await pasoDelServidor(formulario, cliente, CUPO, 2)
      expect(inesperadas).toEqual([])
    },
  )
})

describe("ataque CHORE-03 03c r2 · estado 11 en features/admin: un código que apiClient redirige y un reenvío antes de que irA recargue", () => {
  it.each(
    NOMBRES.flatMap((nombre) =>
      [
        ["403 ACCESO_RESTRINGIDO", "ACCESO_RESTRINGIDO", "/acceso-restringido"],
        [
          "403 CAMBIO_DE_CONTRASENA_REQUERIDO",
          "CAMBIO_DE_CONTRASENA_REQUERIDO",
          "/cambiar-contrasena",
        ],
      ].map(([titulo, codigo, destino]) => [nombre, titulo, codigo, destino] as const),
    ),
  )(
    "%s con %s: irA; el rechazo local siguiente deja solo el ErrorDeCampo y el reenvío válido manda otra petición con un solo MensajeError",
    async (nombre, _titulo, codigo, destino) => {
      const { formulario, cliente } = await iniciar(nombre)
      preparar(formulario.metodo, formulario.ruta, () =>
        errorApi(403, codigo ?? "ACCESO_RESTRINGIDO", "x: texto del servidor"),
      )
      escribir(formulario.campos)
      fireEvent.click(botonDe(formulario))
      await waitFor(() => expect(irA).toHaveBeenCalledWith(destino))
      await enReposo(formulario, cliente)
      expect(screen.queryAllByRole("alert").length).toBeLessThanOrEqual(1)

      await pasoLocal(formulario, localDe(formulario, 0), 1, ["texto del servidor", GENERICO])
      await pasoDelServidor(formulario, cliente, F1, 2)
      expect(inesperadas).toEqual([])
    },
  )
})

describe("ataque CHORE-03 03c r2 · BuscadorDeCuenta sigue con buscar.reset() sin condición", () => {
  const BUSCAR: Formulario = {
    elemento: () => <BuscadorDeCuenta />,
    metodo: "POST",
    ruta: RUTA_BUSCAR,
    boton: "Buscar",
    campos: [["Correo exacto de la cuenta", "carla@colegio.mx"]],
    locales: [
      ["correo sin arroba", [["Correo exacto de la cuenta", "carla-sin-arroba"]]],
      ["correo vacío", [["Correo exacto de la cuenta", ""]]],
    ],
    exito: () => respuestaJson(200, { usuario: USUARIO }),
    codigo: [
      "USUARIO_NO_ENCONTRADO",
      () => errorApi(404, "USUARIO_NO_ENCONTRADO", "email: texto del servidor"),
      MENSAJES_ERROR_ADMIN.USUARIO_NO_ENCONTRADO,
    ],
  }

  const montarBuscador = async () => {
    const cliente = montar(BUSCAR.elemento())
    await screen.findByRole("button", { name: BUSCAR.boton })
    return cliente
  }

  const encontrar = async (cliente: QueryClient, peticiones: number) => {
    preparar(BUSCAR.metodo, BUSCAR.ruta, BUSCAR.exito)
    escribir(BUSCAR.campos)
    fireEvent.click(botonDe(BUSCAR))
    await waitFor(() => expect(peticionesA(BUSCAR)).toBe(peticiones))
    expect(await screen.findByText(USUARIO.nombre)).toBeInTheDocument()
    await enReposo(BUSCAR, cliente)
  }

  it.each(BUSCAR.locales.map(([camino], indice) => [camino, indice] as const))(
    "la ficha encontrada desaparece con un rechazo local (%s): solo el ErrorDeCampo, sin la cuenta anterior; buscarla otra vez la trae",
    async (_camino, indice) => {
      const cliente = await montarBuscador()
      await encontrar(cliente, 1)

      await pasoLocal(BUSCAR, localDe(BUSCAR, indice), 1, [USUARIO.nombre, USUARIO.email])
      expect(screen.queryByRole("button", { name: "Restablecer contraseña" })).toBeNull()

      await encontrar(cliente, 2)
      expect(screen.queryAllByRole("alert")).toHaveLength(0)
      expect(document.querySelectorAll('[aria-invalid="true"]')).toHaveLength(0)
      expect(inesperadas).toEqual([])
    },
  )

  it("servidor → local → servidor → local alternados: un solo mensaje en cada paso", async () => {
    const cliente = await montarBuscador()
    await pasoDelServidor(BUSCAR, cliente, F1, 1)
    await pasoLocal(BUSCAR, localDe(BUSCAR, 0), 1, [M])
    await pasoDelServidor(BUSCAR, cliente, BUSCAR.codigo, 2)
    await pasoLocal(BUSCAR, localDe(BUSCAR, 1), 2, [BUSCAR.codigo[2]])
    expect(inesperadas).toEqual([])
  })

  it("el error de corregir el correo dentro de la ficha desaparece con la ficha cuando la búsqueda siguiente la rechaza la validación local", async () => {
    const cliente = await montarBuscador()
    await encontrar(cliente, 1)

    preparar("PUT", RUTA_CORREGIR, F1[1])
    escribir([["Correo correcto", "carla.ruiz@colegio.mx"]])
    fireEvent.click(screen.getByRole("button", { name: TEXTOS_CUENTAS.ficha.guardarCorreo }))
    await soloElMensajeError(M)

    await pasoLocal(BUSCAR, localDe(BUSCAR, 0), 1, [M, USUARIO.nombre])
    expect(screen.queryByLabelText("Correo correcto")).toBeNull()
    expect(inesperadas).toEqual([])
  })
})

describe("ataque CHORE-03 03c r2 · features/admin: el envío válido tras un error y StrictMode", () => {
  it.each([
    ["invitar maestro", "el formulario se vacía (onSuccess de la llamada)"],
    ["corregir el correo", "onCorregido recibe la cuenta corregida"],
  ] as const)(
    "%s: servidor (F1) → envío válido aceptado: %s aunque reset() corrió en el mismo manejador, una sola petición y sin alerta",
    async (nombre, efecto) => {
      const onCorregido = vi.fn()
      const formulario: Formulario =
        nombre === "corregir el correo"
          ? {
              ...FORMULARIOS["corregir el correo"],
              elemento: () => (
                <FormularioCorregirCorreo usuario={USUARIO} onCorregido={onCorregido} />
              ),
            }
          : FORMULARIOS["invitar maestro"]
      const cliente = montar(formulario.elemento())
      await screen.findByRole("button", { name: formulario.boton })
      await pasoDelServidor(formulario, cliente, F1, 1)

      preparar(formulario.metodo, formulario.ruta, formulario.exito)
      escribir(formulario.campos)
      fireEvent.click(botonDe(formulario))
      await waitFor(() => expect(screen.getAllByRole("status").length).toBeGreaterThan(0))
      await enReposo(formulario, cliente)
      expect(peticionesA(formulario)).toBe(2)
      expect(screen.queryAllByRole("alert")).toHaveLength(0)
      if (nombre === "corregir el correo") {
        expect(onCorregido, efecto).toHaveBeenCalledTimes(1)
        expect(onCorregido.mock.calls[0]?.[0]).toMatchObject({ email: "carla.ruiz@colegio.mx" })
      } else {
        for (const [etiqueta] of formulario.campos) {
          expect(screen.getByLabelText(etiqueta), efecto).toHaveProperty("value", "")
        }
      }
      expect(inesperadas).toEqual([])
    },
  )

  it.each(NOMBRES.map((nombre) => [nombre] as const))(
    "%s dentro de StrictMode (como main.tsx): servidor (F1) → local → servidor (F3) → local: un solo mensaje en cada paso y una petición por envío válido",
    async (nombre) => {
      const formulario = formularioDe(nombre)
      const cliente = montar(<StrictMode>{formulario.elemento()}</StrictMode>)
      await screen.findByRole("button", { name: formulario.boton })

      await pasoDelServidor(formulario, cliente, F1, 1)
      await pasoLocal(formulario, localDe(formulario, 0), 1, [M])
      await pasoDelServidor(formulario, cliente, F3, 2)
      await pasoLocal(formulario, localDe(formulario, 1), 2, [GENERICO])
      expect(inesperadas).toEqual([])
    },
  )
})
