import { accesoSchema, cambiarActivoSchema, estadoPagoLoteSchema } from "@campus/shared"
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { StrictMode } from "react"
import { createMemoryRouter, RouterProvider } from "react-router"
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"

import { Providers } from "@/app/providers"
import { MENSAJE_DE_PRUEBA } from "@/lib/errores-de-api-fuera-de-contrato"
import { establecerToken, limpiarToken } from "@/services/tokenAcceso"

// ADMIN-01f: la ficha de una cuenta (/admin/usuarios/:usuarioId) y "Invitar maestro" en /admin/maestros,
// con el router real (rutas de app/router) y Providers (la configuración de app/providers.tsx). El
// servidor es un doble en memoria: cada caso pone la respuesta de la acción que prueba; lo que nadie
// responde es un 500 "no esperada". Los mensajes "reales" de zod se arman con el esquema de shared/,
// como validarCuerpo del backend (`${ruta}: ${mensaje}`). El carácter nulo, con su código.

vi.mock("@/services/navegacion", () => ({ irA: vi.fn(), rutaActual: vi.fn(() => "/admin") }))
const aviso = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }))
vi.mock("sonner", () => ({ toast: aviso, Toaster: () => null }))

const NULO = String.fromCharCode(0)
const GENERICO = "No pudimos completar la operación. Inténtalo de nuevo."
const TEMPORAL = "Kp7mWq4Rt9Xz"
const TEMPORAL_2 = "Hn3vBc8Lq2Ps"

const CARLA = {
  id: "b7e6a1a0-1111-4b8e-9a1e-0f2a3b4c5d6e",
  nombre: "Carla Ruiz",
  email: "carla@ejemplo.mx",
  rol: "maestro",
  activo: true,
  creadoEn: "2026-09-01T15:00:00.000Z",
}

const BETO = {
  id: "c8f7b2b1-2222-4c9f-8b2f-1a3b4c5d6e7f",
  nombre: "Beto Díaz",
  email: "beto@ejemplo.mx",
  rol: "estudiante",
  activo: true,
  creadoEn: "2026-09-02T15:00:00.000Z",
  estadoPago: "al_corriente",
  fechaEstadoPago: null,
  accesoRestringido: false,
  motivoRestriccion: null,
  fechaRestriccion: null,
}

const ADMIN = {
  id: "d9a8c3c2-3333-4da0-9c3a-2b4c5d6e7f80",
  nombre: "Administración",
  email: "admin@ejemplo.mx",
  rol: "admin",
  activo: true,
  creadoEn: "2026-08-01T15:00:00.000Z",
}

type Cuenta = typeof CARLA | typeof BETO | typeof ADMIN

const respuestaJson = (estado: number, cuerpo: unknown) =>
  new Response(JSON.stringify(cuerpo), {
    status: estado,
    headers: { "Content-Type": "application/json" },
  })

const errorJson = (estado: number, codigo: string, mensaje = "mensaje del servidor") =>
  respuestaJson(estado, { error: { codigo, mensaje } })

const validacion = (mensaje: string) => errorJson(400, "VALIDACION", mensaje)

interface Llamada {
  metodo: string
  ruta: string
  cuerpo: unknown
}

type Manejador = (metodo: string, ruta: string) => Response | Promise<Response> | null

let llamadas: Llamada[] = []
let cuentas: Cuenta[] = []
let manejador: Manejador = () => null

beforeAll(async () => {
  await import("@/app/router")
}, 60_000)

beforeEach(() => {
  establecerToken("token-de-prueba")
  llamadas = []
  cuentas = [CARLA, BETO, ADMIN]
  manejador = () => null
  vi.stubGlobal(
    "fetch",
    vi.fn<typeof fetch>((entrada, init) => {
      const url = new URL(String(entrada), "http://local")
      const metodo = init?.method ?? "GET"
      const ruta = url.pathname
      llamadas.push({
        metodo,
        ruta,
        cuerpo: init?.body === undefined ? undefined : JSON.parse(String(init.body)),
      })
      if (ruta === "/api/auth/refrescar") {
        return Promise.resolve(respuestaJson(200, { tokenAcceso: "t" }))
      }
      if (ruta === "/api/me") {
        return Promise.resolve(
          respuestaJson(200, { ...ADMIN, debeCambiarContrasena: false, accesoRestringido: false }),
        )
      }
      const propia = manejador(metodo, ruta)
      if (propia !== null) return Promise.resolve(propia)
      if (metodo === "GET" && ruta === "/api/admin/usuarios") {
        return Promise.resolve(
          respuestaJson(200, {
            usuarios: cuentas,
            siguienteCursor: null,
            siguienteCursorNombre: null,
          }),
        )
      }
      const ficha = /^\/api\/admin\/usuarios\/([^/]+)$/.exec(ruta)
      if (metodo === "GET" && ficha) {
        const cuenta = cuentas.find((c) => c.id === ficha[1])
        if (cuenta) return Promise.resolve(respuestaJson(200, cuenta))
        if (ficha[1] === "abc") {
          return Promise.resolve(validacion("id: id: debe ser un identificador válido"))
        }
        return Promise.resolve(errorJson(404, "USUARIO_NO_ENCONTRADO"))
      }
      if (metodo === "GET" && ruta === "/api/admin/enlaces-registro") {
        return Promise.resolve(respuestaJson(200, { enlaces: [], siguienteCursor: null }))
      }
      return Promise.resolve(errorJson(500, "ERROR_INTERNO", "no esperada"))
    }),
  )
})

afterEach(() => {
  cleanup()
  limpiarToken()
  vi.unstubAllGlobals()
  aviso.success.mockClear()
  aviso.error.mockClear()
})

const montar = async (ruta: string, estricto = false) => {
  const { rutas } = await import("@/app/router")
  const router = createMemoryRouter(rutas, { initialEntries: [ruta] })
  const app = (
    <Providers>
      <RouterProvider router={router} />
    </Providers>
  )
  render(estricto ? <StrictMode>{app}</StrictMode> : app)
  return router
}

const abrirFicha = async (cuenta: Cuenta) => {
  const router = await montar(`/admin/usuarios/${cuenta.id}`)
  const ficha = await screen.findByRole("region", { name: cuenta.nombre })
  return { router, ficha }
}

const irA = async (router: Awaited<ReturnType<typeof montar>>, ruta: string) => {
  await act(async () => {
    await router.navigate(ruta)
  })
}

const reposar = async () => {
  await act(async () => {
    for (let i = 0; i < 6; i += 1) await new Promise((r) => setTimeout(r, 0))
  })
}

const peticiones = (metodo: string, ruta: string) =>
  llamadas.filter((l) => l.metodo === metodo && l.ruta === ruta)

const boton = (nombre: string) => screen.getByRole("button", { name: nombre })

// Un solo mensaje legible: exactamente un MensajeError con `texto`, sin aviso ni campo marcado.
const unSoloMensaje = async (texto: string) => {
  await waitFor(() => expect(screen.getAllByRole("alert")).toHaveLength(1))
  expect(screen.getByRole("alert")).toHaveTextContent(texto)
  expect(aviso.error).not.toHaveBeenCalled()
  expect(document.querySelectorAll('[aria-invalid="true"]')).toHaveLength(0)
}

const fueraDeEspera = async (nombre: string) => {
  await waitFor(() => expect(boton(nombre)).not.toHaveAttribute("aria-busy", "true"))
}

const mensajeReal = (
  resultado: { success: boolean; error?: { issues: { path: PropertyKey[]; message: string }[] } },
  campo: string,
): string => {
  const incidencia = resultado.error?.issues.find((i) => i.path[0] === campo)
  if (incidencia === undefined) throw new Error(`Precondición: el esquema rechaza ${campo}`)
  return `${incidencia.path.join(".")}: ${incidencia.message}`
}

const INGLES_ACTIVO = mensajeReal(cambiarActivoSchema.safeParse({ activo: "si" }), "activo")
const INGLES_RESTRINGIDO = mensajeReal(accesoSchema.safeParse({ restringido: "si" }), "restringido")
const INGLES_ESTADO_PAGO = mensajeReal(
  estadoPagoLoteSchema.safeParse({ alumnoIds: [BETO.id], estadoPago: "x" }),
  "estadoPago",
)

describe("ADMIN-01f · la ficha de una cuenta", () => {
  it("ADM-1F04: la ficha es una región con el nombre de la cuenta; el h1 es «Usuarios»; acciones según el rol", async () => {
    const { router, ficha } = await abrirFicha(BETO)
    expect(screen.getByRole("heading", { level: 1, name: "Usuarios" })).toBeInTheDocument()
    expect(within(ficha).getByRole("button", { name: "Dar de baja" })).toBeInTheDocument()
    expect(within(ficha).getByRole("button", { name: "Restringir acceso" })).toBeInTheDocument()
    expect(within(ficha).getByRole("button", { name: "Guardar" })).toBeInTheDocument()
    expect(
      within(ficha).getByRole("button", { name: "Restablecer contraseña" }),
    ).toBeInTheDocument()

    await irA(router, `/admin/usuarios/${CARLA.id}`)
    const deCarla = await screen.findByRole("region", { name: CARLA.nombre })
    expect(within(deCarla).getByRole("button", { name: "Dar de baja" })).toBeInTheDocument()
    expect(within(deCarla).queryByRole("button", { name: "Restringir acceso" })).toBeNull()
    expect(within(deCarla).queryByRole("button", { name: "Guardar" })).toBeNull()

    await irA(router, `/admin/usuarios/${ADMIN.id}`)
    const delAdmin = await screen.findByRole("region", { name: ADMIN.nombre })
    expect(within(delAdmin).queryByRole("button", { name: "Dar de baja" })).toBeNull()
    expect(within(delAdmin).queryByRole("button", { name: "Restablecer contraseña" })).toBeNull()
    expect(within(delAdmin).getByRole("button", { name: "Editar nombre" })).toBeInTheDocument()
  })

  it("ADM-1F13: «Restablecer contraseña» en alumno y maestro; restablecer dos veces muestra la segunda temporal y la primera ya no está ni en la pantalla ni en la caché; en la ficha del admin no está", async () => {
    let n = 0
    manejador = (metodo, ruta) => {
      if (metodo !== "POST" || !ruta.endsWith("/restablecer-contrasena")) return null
      n += 1
      return respuestaJson(200, { contrasenaTemporal: n === 1 ? TEMPORAL : TEMPORAL_2 })
    }
    const { router } = await abrirFicha(BETO)
    fireEvent.click(boton("Restablecer contraseña"))
    fireEvent.click(boton("Sí, restablecer"))
    expect(await screen.findByText(TEMPORAL)).toBeInTheDocument()

    await irA(router, "/admin/usuarios")
    await irA(router, `/admin/usuarios/${BETO.id}`)
    await screen.findByRole("region", { name: BETO.nombre })
    expect(screen.queryByText(TEMPORAL)).toBeNull()
    fireEvent.click(boton("Restablecer contraseña"))
    fireEvent.click(boton("Sí, restablecer"))
    expect(await screen.findByText(TEMPORAL_2)).toBeInTheDocument()
    expect(screen.queryByText(TEMPORAL)).toBeNull()
    expect(document.body.innerHTML).not.toContain(TEMPORAL)

    await irA(router, `/admin/usuarios/${CARLA.id}`)
    await screen.findByRole("region", { name: CARLA.nombre })
    expect(boton("Restablecer contraseña")).toBeInTheDocument()
    expect(document.body.innerHTML).not.toContain(TEMPORAL_2)
  })

  it("E-27: el role=status de la temporal no envuelve «Copiar»", async () => {
    manejador = (metodo, ruta) =>
      metodo === "POST" && ruta.endsWith("/restablecer-contrasena")
        ? respuestaJson(200, { contrasenaTemporal: TEMPORAL })
        : null
    await abrirFicha(CARLA)
    fireEvent.click(boton("Restablecer contraseña"))
    fireEvent.click(boton("Sí, restablecer"))
    const temporal = await screen.findByText(TEMPORAL)
    const estado = temporal.closest('[role="status"]')
    expect(estado).not.toBeNull()
    expect(within(estado as HTMLElement).queryByRole("button", { name: "Copiar" })).toBeNull()
    expect(boton("Copiar")).toBeInTheDocument()
  })

  it("una cuenta dada de baja muestra «Desactivada» una sola vez y ningún «Activa»", async () => {
    cuentas = [{ ...CARLA, activo: false }, BETO, ADMIN]
    const { ficha } = await abrirFicha(CARLA)
    expect(within(ficha).getAllByText("Desactivada")).toHaveLength(1)
    expect(within(ficha).queryByText("Activa")).toBeNull()
    expect(within(ficha).getByRole("button", { name: "Reactivar" })).toBeInTheDocument()
  })
})

describe("ADMIN-01f · «Editar nombre» (ADM-1F05, ADM-1F22, ADM-1F25)", () => {
  const abrirEditar = async () => {
    await abrirFicha(CARLA)
    fireEvent.click(boton("Editar nombre"))
    const campo = screen.getByLabelText("Nombre completo")
    expect(campo).toHaveAttribute("autocomplete", "off")
    return campo
  }

  it.each([
    ["(a) email: (pintado solo en el alta)", `email: ${MENSAJE_DE_PRUEBA}`, MENSAJE_DE_PRUEBA],
    ["(b) vacío", "", GENERICO],
    ["(b) solo espacios", "   ", GENERICO],
    ["(c) nombre.0:", `nombre.0: ${MENSAJE_DE_PRUEBA}`, MENSAJE_DE_PRUEBA],
  ])(
    "ADM-1F05 %s: un solo mensaje legible, lo escrito se conserva y el botón sale de la espera",
    async (_caso, mensaje, esperado) => {
      manejador = (metodo, ruta) =>
        metodo === "PUT" && ruta.endsWith("/nombre") ? validacion(mensaje) : null
      const campo = await abrirEditar()
      fireEvent.change(campo, { target: { value: "Carla Ruiz Pérez" } })
      fireEvent.click(boton("Guardar nombre"))

      await unSoloMensaje(esperado)
      expect(screen.getByLabelText("Nombre completo")).toHaveValue("Carla Ruiz Pérez")
      await fueraDeEspera("Guardar nombre")
    },
  )

  it("ADM-1F05 (d): un rechazo del servidor y después el nombre vacío dejan un solo mensaje, el ErrorDeCampo nuevo", async () => {
    manejador = (metodo, ruta) =>
      metodo === "PUT" && ruta.endsWith("/nombre")
        ? validacion(`email: ${MENSAJE_DE_PRUEBA}`)
        : null
    const campo = await abrirEditar()
    fireEvent.change(campo, { target: { value: "Carla Ruiz Pérez" } })
    fireEvent.click(boton("Guardar nombre"))
    await screen.findByRole("alert")

    fireEvent.change(campo, { target: { value: "" } })
    fireEvent.click(boton("Guardar nombre"))

    await waitFor(() => expect(screen.queryAllByRole("alert")).toHaveLength(0))
    expect(campo).toHaveAttribute("aria-invalid", "true")
    expect(campo).toHaveAccessibleDescription("Escribe el nombre completo")
    expect(peticiones("PUT", `/api/admin/usuarios/${CARLA.id}/nombre`)).toHaveLength(1)
  })

  it("ADM-1F05: dos clics en «Guardar nombre», una petición; con éxito, la ficha muestra el nombre nuevo y avisa", async () => {
    manejador = (metodo, ruta) =>
      metodo === "PUT" && ruta.endsWith("/nombre")
        ? respuestaJson(200, { ...CARLA, nombre: "Carla Ruiz Pérez" })
        : null
    const campo = await abrirEditar()
    fireEvent.change(campo, { target: { value: "Carla Ruiz Pérez" } })
    fireEvent.click(boton("Guardar nombre"))
    fireEvent.click(boton("Guardar nombre"))

    expect(await screen.findByRole("region", { name: "Carla Ruiz Pérez" })).toBeInTheDocument()
    expect(peticiones("PUT", `/api/admin/usuarios/${CARLA.id}/nombre`)).toHaveLength(1)
    expect(aviso.success).toHaveBeenCalledWith("Nombre actualizado")
  })

  it("ADM-1F22: el nombre de solo espacios no se envía y dice «Escribe el nombre completo»; el 400 «nombre: Escribe tu nombre completo» da un solo MensajeError con «Escribe el nombre completo»; «caracteres no permitidos» da su resto", async () => {
    let mensaje = "nombre: Escribe tu nombre completo"
    manejador = (metodo, ruta) =>
      metodo === "PUT" && ruta.endsWith("/nombre") ? validacion(mensaje) : null
    const campo = await abrirEditar()
    fireEvent.change(campo, { target: { value: "   " } })
    fireEvent.click(boton("Guardar nombre"))
    expect(campo).toHaveAccessibleDescription("Escribe el nombre completo")
    expect(screen.queryByText("Escribe tu nombre completo")).toBeNull()
    expect(peticiones("PUT", `/api/admin/usuarios/${CARLA.id}/nombre`)).toHaveLength(0)

    fireEvent.change(campo, { target: { value: "Carla Ruiz" } })
    fireEvent.click(boton("Guardar nombre"))
    await unSoloMensaje("Escribe el nombre completo")
    expect(screen.queryByText("Escribe tu nombre completo")).toBeNull()

    mensaje = "nombre: El nombre tiene caracteres no permitidos"
    fireEvent.click(boton("Guardar nombre"))
    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent(
        "El nombre tiene caracteres no permitidos",
      ),
    )
    expect(screen.getAllByRole("alert")).toHaveLength(1)
  })

  it("ADM-1F25: el nombre con el carácter nulo no se envía y muestra el texto de shared/; si el servidor responde su 400, un solo mensaje", async () => {
    manejador = (metodo, ruta) =>
      metodo === "PUT" && ruta.endsWith("/nombre")
        ? validacion("nombre: El nombre tiene caracteres no permitidos")
        : null
    const campo = await abrirEditar()
    fireEvent.change(campo, { target: { value: `Carla${NULO}Ruiz` } })
    fireEvent.click(boton("Guardar nombre"))
    expect(campo).toHaveAccessibleDescription("El nombre tiene caracteres no permitidos")
    expect(peticiones("PUT", `/api/admin/usuarios/${CARLA.id}/nombre`)).toHaveLength(0)

    fireEvent.change(campo, { target: { value: "Carla Ruiz" } })
    fireEvent.click(boton("Guardar nombre"))
    await unSoloMensaje("El nombre tiene caracteres no permitidos")
    expect(campo).toHaveValue("Carla Ruiz")
    await fueraDeEspera("Guardar nombre")
  })
})

describe("ADMIN-01f · dar de baja y reactivar (ADM-1F07, ADM-1F07b)", () => {
  const abrirBaja = async (cuenta: Cuenta = CARLA) => {
    await abrirFicha(cuenta)
    fireEvent.click(boton("Dar de baja"))
    return screen.findByRole("dialog")
  }

  it("ADM-1F07: el diálogo enfoca «Cancelar» y lleva el contexto opaco y denso; confirmar hace una petición y deja «Reactivar» con el foco", async () => {
    manejador = (metodo, ruta) =>
      metodo === "PUT" && ruta.endsWith("/activo")
        ? respuestaJson(200, { ...CARLA, activo: false })
        : null
    const dialogo = await abrirBaja()
    expect(dialogo).toHaveAttribute("data-material", "opaco")
    expect(dialogo).toHaveAttribute("data-densidad", "densa")
    expect(dialogo).toHaveAccessibleName("Dar de baja a Carla Ruiz")
    await waitFor(() =>
      expect(document.activeElement).toBe(
        within(dialogo).getByRole("button", { name: "Cancelar" }),
      ),
    )

    const confirmar = within(dialogo).getByRole("button", { name: "Sí, dar de baja" })
    fireEvent.click(confirmar)
    fireEvent.click(confirmar)

    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull())
    const peticion = peticiones("PUT", `/api/admin/usuarios/${CARLA.id}/activo`)
    expect(peticion).toHaveLength(1)
    expect(peticion[0]?.cuerpo).toEqual({ activo: false })
    expect(aviso.success).toHaveBeenCalledWith("Cuenta dada de baja")
    await waitFor(() => expect(document.activeElement).toBe(boton("Reactivar")))
  })

  it("ADM-1F07: un 409 MAESTRO_CON_CLASES da un solo mensaje en el diálogo, que sigue abierto, y el botón sale de la espera", async () => {
    const texto = "Este maestro tiene 2 clases activas asignadas."
    manejador = (metodo, ruta) =>
      metodo === "PUT" && ruta.endsWith("/activo")
        ? errorJson(409, "MAESTRO_CON_CLASES", texto)
        : null
    const dialogo = await abrirBaja()
    fireEvent.click(within(dialogo).getByRole("button", { name: "Sí, dar de baja" }))
    await unSoloMensaje(texto)
    expect(screen.getByRole("dialog")).toBeInTheDocument()
    await fueraDeEspera("Sí, dar de baja")
  })

  it("ADM-1F07: «Cancelar» cierra sin petición y devuelve el foco a «Dar de baja»", async () => {
    const dialogo = await abrirBaja()
    fireEvent.click(within(dialogo).getByRole("button", { name: "Cancelar" }))
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull())
    expect(peticiones("PUT", `/api/admin/usuarios/${CARLA.id}/activo`)).toHaveLength(0)
    await waitFor(() => expect(document.activeElement).toBe(boton("Dar de baja")))
  })

  it("ADM-1F07: «Reactivar» no abre diálogo; dos clics, una petición", async () => {
    cuentas = [{ ...CARLA, activo: false }, BETO, ADMIN]
    manejador = (metodo, ruta) =>
      metodo === "PUT" && ruta.endsWith("/activo")
        ? respuestaJson(200, { ...CARLA, activo: true })
        : null
    await abrirFicha(CARLA)
    fireEvent.click(boton("Reactivar"))
    fireEvent.click(boton("Reactivar"))
    expect(screen.queryByRole("dialog")).toBeNull()
    expect(await screen.findByRole("button", { name: "Dar de baja" })).toBeInTheDocument()
    expect(peticiones("PUT", `/api/admin/usuarios/${CARLA.id}/activo`)).toHaveLength(1)
    expect(aviso.success).toHaveBeenCalledWith("Cuenta reactivada")
  })

  it.each([
    ["(a) activo: de prueba", `activo: ${MENSAJE_DE_PRUEBA}`, GENERICO],
    ["(a) activo: real en inglés", INGLES_ACTIVO, GENERICO],
    ["(b) vacío", "", GENERICO],
    ["(b) espacios", "   ", GENERICO],
    ["(c) id.0:", `id.0: ${MENSAJE_DE_PRUEBA}`, MENSAJE_DE_PRUEBA],
    ["(d) nombre: (pintado en «Editar nombre»)", `nombre: ${MENSAJE_DE_PRUEBA}`, MENSAJE_DE_PRUEBA],
  ])(
    "ADM-1F07b, diálogo de baja %s: un solo mensaje, sin inglés, el diálogo sigue abierto y el botón sale de la espera",
    async (_caso, mensaje, esperado) => {
      manejador = (metodo, ruta) =>
        metodo === "PUT" && ruta.endsWith("/activo") ? validacion(mensaje) : null
      const dialogo = await abrirBaja()
      fireEvent.click(within(dialogo).getByRole("button", { name: "Sí, dar de baja" }))
      await unSoloMensaje(esperado)
      expect(document.body.textContent).not.toMatch(/Invalid|expected/)
      expect(screen.getByRole("dialog")).toBeInTheDocument()
      await fueraDeEspera("Sí, dar de baja")
    },
  )

  it("ADM-1F07b (e): un 400 y después cerrar y reabrir el diálogo: al reabrir no queda el mensaje viejo", async () => {
    manejador = (metodo, ruta) =>
      metodo === "PUT" && ruta.endsWith("/activo") ? validacion(INGLES_ACTIVO) : null
    const dialogo = await abrirBaja()
    fireEvent.click(within(dialogo).getByRole("button", { name: "Sí, dar de baja" }))
    await screen.findByRole("alert")
    fireEvent.click(within(dialogo).getByRole("button", { name: "Cancelar" }))
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull())

    fireEvent.click(boton("Dar de baja"))
    await screen.findByRole("dialog")
    expect(screen.queryAllByRole("alert")).toHaveLength(0)
  })

  it.each([
    ["(a) activo: real en inglés", INGLES_ACTIVO, GENERICO],
    ["(b) vacío", "", GENERICO],
    ["(c) id.0:", `id.0: ${MENSAJE_DE_PRUEBA}`, MENSAJE_DE_PRUEBA],
    ["(d) nombre:", `nombre: ${MENSAJE_DE_PRUEBA}`, MENSAJE_DE_PRUEBA],
  ])(
    "ADM-1F07b, «Reactivar» %s: un solo mensaje, sin inglés, y el botón sale de la espera",
    async (_caso, mensaje, esperado) => {
      cuentas = [{ ...CARLA, activo: false }, BETO, ADMIN]
      manejador = (metodo, ruta) =>
        metodo === "PUT" && ruta.endsWith("/activo") ? validacion(mensaje) : null
      await abrirFicha(CARLA)
      fireEvent.click(boton("Reactivar"))
      await unSoloMensaje(esperado)
      expect(document.body.textContent).not.toMatch(/Invalid|expected/)
      await fueraDeEspera("Reactivar")
    },
  )
})

describe("ADMIN-01f · restringir y restablecer el acceso (ADM-1F08, ADM-1F07b, ADM-1F25)", () => {
  const abrirRestringir = async () => {
    await abrirFicha(BETO)
    fireEvent.click(boton("Restringir acceso"))
    return screen.findByRole("dialog")
  }

  const motivo = () => screen.getByLabelText("Motivo (opcional)")

  it("ADM-1F08: el diálogo enfoca «Cancelar», lleva el contexto opaco y denso, y manda el motivo; dos clics, una petición", async () => {
    manejador = (metodo, ruta) =>
      metodo === "PUT" && ruta.endsWith("/acceso")
        ? respuestaJson(200, { ...BETO, accesoRestringido: true })
        : null
    const dialogo = await abrirRestringir()
    expect(dialogo).toHaveAttribute("data-material", "opaco")
    expect(dialogo).toHaveAttribute("data-densidad", "densa")
    await waitFor(() =>
      expect(document.activeElement).toBe(
        within(dialogo).getByRole("button", { name: "Cancelar" }),
      ),
    )
    fireEvent.change(motivo(), { target: { value: "  Adeudo de octubre  " } })
    fireEvent.click(boton("Sí, restringir"))
    fireEvent.click(boton("Sí, restringir"))

    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull())
    const peticion = peticiones("PUT", `/api/admin/alumnos/${BETO.id}/acceso`)
    expect(peticion).toHaveLength(1)
    expect(peticion[0]?.cuerpo).toEqual({ restringido: true, motivo: "Adeudo de octubre" })
    expect(aviso.success).toHaveBeenCalledWith("Acceso restringido")
    await waitFor(() => expect(document.activeElement).toBe(boton("Restablecer acceso")))
  })

  it.each([
    ["(a) restringido: de prueba", `restringido: ${MENSAJE_DE_PRUEBA}`, GENERICO],
    ["(a) restringido: real en inglés", INGLES_RESTRINGIDO, GENERICO],
    ["(b) vacío", "", GENERICO],
    ["(b) espacios", "   ", GENERICO],
    ["(c) motivo.0:", `motivo.0: ${MENSAJE_DE_PRUEBA}`, MENSAJE_DE_PRUEBA],
  ])(
    "ADM-1F08 %s: un solo mensaje, sin inglés, el diálogo sigue abierto con el motivo escrito y el botón sale de la espera",
    async (_caso, mensaje, esperado) => {
      manejador = (metodo, ruta) =>
        metodo === "PUT" && ruta.endsWith("/acceso") ? validacion(mensaje) : null
      await abrirRestringir()
      fireEvent.change(motivo(), { target: { value: "Adeudo" } })
      fireEvent.click(boton("Sí, restringir"))
      await unSoloMensaje(esperado)
      expect(document.body.textContent).not.toMatch(/Invalid|expected/)
      expect(screen.getByRole("dialog")).toBeInTheDocument()
      expect(motivo()).toHaveValue("Adeudo")
      await fueraDeEspera("Sí, restringir")
    },
  )

  it("ADM-1F08 (d): un rechazo del servidor y después un motivo de más de 300 dejan un solo mensaje, el ErrorDeCampo", async () => {
    manejador = (metodo, ruta) =>
      metodo === "PUT" && ruta.endsWith("/acceso") ? validacion(INGLES_RESTRINGIDO) : null
    await abrirRestringir()
    fireEvent.click(boton("Sí, restringir"))
    await screen.findByRole("alert")

    fireEvent.change(motivo(), { target: { value: "a".repeat(301) } })
    fireEvent.click(boton("Sí, restringir"))

    await waitFor(() => expect(screen.queryAllByRole("alert")).toHaveLength(0))
    expect(motivo()).toHaveAttribute("aria-invalid", "true")
    expect(motivo()).toHaveAccessibleDescription(
      expect.stringContaining("El motivo no puede tener más de 300 caracteres"),
    )
    expect(peticiones("PUT", `/api/admin/alumnos/${BETO.id}/acceso`)).toHaveLength(1)
  })

  it("ADM-1F25: el motivo con el carácter nulo no se envía y muestra el texto de shared/; si el servidor responde su 400, un solo mensaje", async () => {
    manejador = (metodo, ruta) =>
      metodo === "PUT" && ruta.endsWith("/acceso")
        ? validacion("motivo: El texto tiene caracteres no permitidos")
        : null
    await abrirRestringir()
    fireEvent.change(motivo(), { target: { value: `Adeudo${NULO}` } })
    fireEvent.click(boton("Sí, restringir"))
    expect(motivo()).toHaveAccessibleDescription(
      expect.stringContaining("El texto tiene caracteres no permitidos"),
    )
    expect(peticiones("PUT", `/api/admin/alumnos/${BETO.id}/acceso`)).toHaveLength(0)

    fireEvent.change(motivo(), { target: { value: "Adeudo" } })
    fireEvent.click(boton("Sí, restringir"))
    await unSoloMensaje("El texto tiene caracteres no permitidos")
    expect(motivo()).toHaveValue("Adeudo")
  })

  it("ADM-1F08: «Restablecer acceso» va sin diálogo y con una sola petición", async () => {
    cuentas = [CARLA, { ...BETO, accesoRestringido: true }, ADMIN]
    manejador = (metodo, ruta) =>
      metodo === "PUT" && ruta.endsWith("/acceso")
        ? respuestaJson(200, { ...BETO, accesoRestringido: false })
        : null
    await abrirFicha(BETO)
    fireEvent.click(boton("Restablecer acceso"))
    fireEvent.click(boton("Restablecer acceso"))
    expect(screen.queryByRole("dialog")).toBeNull()
    expect(await screen.findByRole("button", { name: "Restringir acceso" })).toBeInTheDocument()
    const peticion = peticiones("PUT", `/api/admin/alumnos/${BETO.id}/acceso`)
    expect(peticion).toHaveLength(1)
    expect(peticion[0]?.cuerpo).toEqual({ restringido: false })
    expect(aviso.success).toHaveBeenCalledWith("Acceso restablecido")
  })

  it.each([
    ["(a) restringido: real en inglés", INGLES_RESTRINGIDO, GENERICO],
    ["(b) vacío", "", GENERICO],
    ["(c) id.0:", `id.0: ${MENSAJE_DE_PRUEBA}`, MENSAJE_DE_PRUEBA],
    ["(d) nombre:", `nombre: ${MENSAJE_DE_PRUEBA}`, MENSAJE_DE_PRUEBA],
  ])(
    "ADM-1F07b, «Restablecer acceso» %s: un solo mensaje, sin inglés, y el botón sale de la espera",
    async (_caso, mensaje, esperado) => {
      cuentas = [CARLA, { ...BETO, accesoRestringido: true }, ADMIN]
      manejador = (metodo, ruta) =>
        metodo === "PUT" && ruta.endsWith("/acceso") ? validacion(mensaje) : null
      await abrirFicha(BETO)
      fireEvent.click(boton("Restablecer acceso"))
      await unSoloMensaje(esperado)
      expect(document.body.textContent).not.toMatch(/Invalid|expected/)
      await fueraDeEspera("Restablecer acceso")
    },
  )
})

describe("ADMIN-01f · el estado de pago desde la ficha (ADM-1F09, ADM-1F09b)", () => {
  const RUTA = "/api/admin/alumnos/estado-pago"

  it("ADM-1F09: elegir «Deudor» y «Guardar» con doble clic hace una petición con un solo id y avisa", async () => {
    manejador = (metodo, ruta) =>
      metodo === "PUT" && ruta === RUTA ? respuestaJson(200, { actualizados: 1 }) : null
    await abrirFicha(BETO)
    const grupo = screen.getByRole("group", { name: "Estado de pago" })
    expect(within(grupo).getByRole("button", { name: "Al corriente" })).toHaveAttribute(
      "aria-pressed",
      "true",
    )
    fireEvent.click(within(grupo).getByRole("button", { name: "Deudor" }))
    fireEvent.click(boton("Guardar"))
    fireEvent.click(boton("Guardar"))

    await waitFor(() => expect(aviso.success).toHaveBeenCalledWith("Estado de pago actualizado"))
    const peticion = peticiones("PUT", RUTA)
    expect(peticion).toHaveLength(1)
    expect(peticion[0]?.cuerpo).toEqual({ alumnoIds: [BETO.id], estadoPago: "deudor" })
  })

  it.each([
    ["(a) alumnoIds:", `alumnoIds: ${MENSAJE_DE_PRUEBA}`, MENSAJE_DE_PRUEBA],
    ["(b) vacío", "", GENERICO],
    ["(b) espacios", "   ", GENERICO],
    ["(c) alumnoIds.0:", `alumnoIds.0: ${MENSAJE_DE_PRUEBA}`, MENSAJE_DE_PRUEBA],
    [
      "(d) motivo: (pintado en el diálogo de restringir)",
      `motivo: ${MENSAJE_DE_PRUEBA}`,
      MENSAJE_DE_PRUEBA,
    ],
    ["(f) estadoPago: real en inglés", INGLES_ESTADO_PAGO, GENERICO],
  ])(
    "ADM-1F09b %s: un solo mensaje, sin inglés, la opción elegida se conserva y «Guardar» sale de la espera",
    async (_caso, mensaje, esperado) => {
      manejador = (metodo, ruta) => (metodo === "PUT" && ruta === RUTA ? validacion(mensaje) : null)
      await abrirFicha(BETO)
      const grupo = screen.getByRole("group", { name: "Estado de pago" })
      fireEvent.click(within(grupo).getByRole("button", { name: "Deudor" }))
      fireEvent.click(boton("Guardar"))
      await unSoloMensaje(esperado)
      expect(document.body.textContent).not.toMatch(/Invalid|expected/)
      expect(within(grupo).getByRole("button", { name: "Deudor" })).toHaveAttribute(
        "aria-pressed",
        "true",
      )
      await fueraDeEspera("Guardar")
    },
  )
})

describe("ADMIN-01f · restablecer y corregir el correo (ADM-1F10, ADM-1F12)", () => {
  it("ADM-1F10: el error de «Sí, restablecer» no reaparece al reabrir la confirmación", async () => {
    manejador = (metodo, ruta) =>
      metodo === "POST" && ruta.endsWith("/restablecer-contrasena")
        ? errorJson(404, "USUARIO_NO_ENCONTRADO")
        : null
    await abrirFicha(CARLA)
    fireEvent.click(boton("Restablecer contraseña"))
    fireEvent.click(boton("Sí, restablecer"))
    await screen.findByRole("alert")
    fireEvent.click(boton("Cancelar"))
    expect(screen.queryAllByRole("alert")).toHaveLength(0)
    fireEvent.click(boton("Restablecer contraseña"))
    expect(screen.queryAllByRole("alert")).toHaveLength(0)
  })

  it("ADM-1F10: con un error de restablecer a la vista, corregir el correo con error deja un solo mensaje", async () => {
    manejador = (metodo, ruta) => {
      if (metodo === "POST" && ruta.endsWith("/restablecer-contrasena")) {
        return errorJson(404, "USUARIO_NO_ENCONTRADO")
      }
      if (metodo === "PUT" && ruta.endsWith("/correo")) return errorJson(409, "CORREO_EN_USO")
      return null
    }
    await abrirFicha(CARLA)
    fireEvent.click(boton("Restablecer contraseña"))
    fireEvent.click(boton("Sí, restablecer"))
    await screen.findByRole("alert")

    fireEvent.change(screen.getByLabelText("Correo correcto"), {
      target: { value: "beto@ejemplo.mx" },
    })
    fireEvent.click(boton("Guardar correo"))

    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent("Ya existe una cuenta con ese correo."),
    )
    expect(screen.getAllByRole("alert")).toHaveLength(1)
  })

  it("ADM-1F10: ir a otra cuenta con el restablecimiento en vuelo descarta la temporal y no la muestra en la otra ficha", async () => {
    let resolver: (respuesta: Response) => void = () => undefined
    manejador = (metodo, ruta) =>
      metodo === "POST" && ruta.endsWith("/restablecer-contrasena")
        ? new Promise<Response>((r) => {
            resolver = r
          })
        : null
    const { router } = await abrirFicha(CARLA)
    fireEvent.click(boton("Restablecer contraseña"))
    fireEvent.click(boton("Sí, restablecer"))
    await irA(router, `/admin/usuarios/${BETO.id}`)
    await screen.findByRole("region", { name: BETO.nombre })
    await act(async () => {
      resolver(respuestaJson(200, { contrasenaTemporal: TEMPORAL }))
    })
    await reposar()
    expect(screen.queryByText(TEMPORAL)).toBeNull()
  })

  it("ADM-1F10: un fallo de red al restablecer da el texto de red del módulo (el genérico)", async () => {
    manejador = (metodo, ruta) => {
      if (metodo === "POST" && ruta.endsWith("/restablecer-contrasena")) {
        throw new TypeError("Failed to fetch")
      }
      return null
    }
    await abrirFicha(CARLA)
    fireEvent.click(boton("Restablecer contraseña"))
    fireEvent.click(boton("Sí, restablecer"))
    await unSoloMensaje(GENERICO)
  })

  it("ADM-1F12: dos envíos de «Guardar correo» hacen una sola corrección", async () => {
    manejador = (metodo, ruta) =>
      metodo === "PUT" && ruta.endsWith("/correo")
        ? respuestaJson(200, { ...CARLA, email: "carla.ruiz@ejemplo.mx" })
        : null
    await abrirFicha(CARLA)
    fireEvent.change(screen.getByLabelText("Correo correcto"), {
      target: { value: "carla.ruiz@ejemplo.mx" },
    })
    fireEvent.click(boton("Guardar correo"))
    fireEvent.click(boton("Guardar correo"))
    await screen.findByText(/^Correo actualizado/)
    expect(peticiones("PUT", `/api/admin/usuarios/${CARLA.id}/correo`)).toHaveLength(1)
  })
})

describe("ADMIN-01f · errores de carga de la ficha (ADM-1F26, ADM-1F17 c)", () => {
  it("ADM-1F26: /admin/usuarios/abc con el 400 VALIDACION dice «Esa cuenta ya no existe.» con «Volver a Usuarios», sin aviso ni texto del servidor, y el enlace lleva a la tabla", async () => {
    const router = await montar("/admin/usuarios/abc")
    await unSoloMensaje("Esa cuenta ya no existe.")
    expect(screen.queryByText(/Revisa tu conexión/)).toBeNull()
    expect(screen.queryByText(/identificador/)).toBeNull()
    fireEvent.click(screen.getByRole("link", { name: "Volver a Usuarios" }))
    await waitFor(() => expect(router.state.location.pathname).toBe("/admin/usuarios"))
    expect(await screen.findByRole("table")).toBeInTheDocument()
  })

  it("ADM-1F26: el 404 USUARIO_NO_ENCONTRADO da lo mismo", async () => {
    await montar("/admin/usuarios/e1a2b3c4-4444-4eb1-8d4b-3c5d6e7f8091")
    await unSoloMensaje("Esa cuenta ya no existe.")
    expect(screen.getByRole("link", { name: "Volver a Usuarios" })).toBeInTheDocument()
  })

  it("ADM-1F26 (control) y ADM-1F17 (c): un 5xx da el texto de carga; volver a la tabla y abrir otra vez la misma cuenta la vuelve a pedir y el texto desaparece", async () => {
    let fallos = 2
    manejador = (metodo, ruta) => {
      if (metodo !== "GET" || ruta !== `/api/admin/usuarios/${CARLA.id}` || fallos === 0)
        return null
      fallos -= 1
      return errorJson(500, "ERROR_INTERNO")
    }
    const router = await montar(`/admin/usuarios/${CARLA.id}`)
    expect(
      await screen.findByText(
        "No pudimos cargar la cuenta. Revisa tu conexión e inténtalo de nuevo.",
        {},
        { timeout: 4000 },
      ),
    ).toBeInTheDocument()

    await irA(router, "/admin/usuarios")
    await irA(router, `/admin/usuarios/${CARLA.id}`)

    expect(await screen.findByRole("region", { name: CARLA.nombre })).toBeInTheDocument()
    expect(screen.queryByText(/No pudimos cargar la cuenta/)).toBeNull()
    expect(peticiones("GET", `/api/admin/usuarios/${CARLA.id}`)).toHaveLength(3)
  })
})

describe("ADMIN-01f · «Invitar maestro» en /admin/maestros (ADM-1F15, ADM-1F22)", () => {
  it("ADM-1F15: vive en /admin/maestros con su botón en outline; la vista sigue con un solo primary, «Enviar invitaciones»; dos clics, una invitación", async () => {
    manejador = (metodo, ruta) =>
      metodo === "POST" && ruta === "/api/admin/maestros" ? respuestaJson(201, CARLA) : null
    await montar("/admin/maestros")
    const enviar = await screen.findByRole("button", { name: "Enviar invitación" })
    expect(enviar).toHaveAttribute("data-variant", "outline")
    expect(
      screen
        .getAllByRole("button")
        .filter((b) => b.getAttribute("data-variant") === "primary")
        .map((b) => b.textContent),
    ).toEqual(["Enviar invitaciones"])

    fireEvent.change(screen.getByLabelText("Nombre completo"), { target: { value: "Carla Ruiz" } })
    fireEvent.change(screen.getByLabelText("Correo"), { target: { value: CARLA.email } })
    fireEvent.click(enviar)
    fireEvent.click(enviar)
    await screen.findByText(/^Invitación creada\./)
    expect(peticiones("POST", "/api/admin/maestros")).toHaveLength(1)
  })

  it("ADM-1F22: el nombre vacío dice «Escribe el nombre completo»; el 400 «nombre: Escribe tu nombre completo» da un solo MensajeError con «Escribe el nombre completo»", async () => {
    manejador = (metodo, ruta) =>
      metodo === "POST" && ruta === "/api/admin/maestros"
        ? validacion("nombre: Escribe tu nombre completo")
        : null
    await montar("/admin/maestros")
    await screen.findByRole("button", { name: "Enviar invitación" })
    fireEvent.change(screen.getByLabelText("Correo"), { target: { value: CARLA.email } })
    fireEvent.click(boton("Enviar invitación"))
    expect(screen.getByLabelText("Nombre completo")).toHaveAccessibleDescription(
      "Escribe el nombre completo",
    )
    expect(peticiones("POST", "/api/admin/maestros")).toHaveLength(0)

    fireEvent.change(screen.getByLabelText("Nombre completo"), { target: { value: "Carla Ruiz" } })
    fireEvent.click(boton("Enviar invitación"))
    await unSoloMensaje("Escribe el nombre completo")
    expect(screen.queryByText("Escribe tu nombre completo")).toBeNull()
  })
})

// Corrección M-22 (arbitraje de P-01f-1, opción 2): el control siempre tiene una opción elegida, así que
// el vecino de ADM-1F09b (e) es la secuencia de rechazos del servidor; ejercita la línea de T-05.
describe("ADMIN-01f · ADM-1F09b (e), el vecino que sí ocurre (corrección M-22)", () => {
  it("ADM-1F09b (e): un 400, elegir la otra opción y guardar con un 5xx, y luego 200: un solo mensaje en cada paso, la opción se conserva y «Guardar» sale de la espera", async () => {
    const RUTA = "/api/admin/alumnos/estado-pago"
    const respuestas = [
      () => validacion(`alumnoIds: ${MENSAJE_DE_PRUEBA}`),
      () => errorJson(500, "ERROR_INTERNO"),
      () => respuestaJson(200, { actualizados: 1 }),
    ]
    manejador = (metodo, ruta) => {
      if (metodo !== "PUT" || ruta !== RUTA) return null
      const siguiente = respuestas.shift()
      if (siguiente === undefined) throw new Error("Precondición: tres respuestas")
      return siguiente()
    }
    await abrirFicha(BETO)
    const grupo = screen.getByRole("group", { name: "Estado de pago" })

    fireEvent.click(within(grupo).getByRole("button", { name: "Deudor" }))
    fireEvent.click(boton("Guardar"))
    await unSoloMensaje(MENSAJE_DE_PRUEBA)
    await fueraDeEspera("Guardar")

    fireEvent.click(within(grupo).getByRole("button", { name: "Al corriente" }))
    fireEvent.click(boton("Guardar"))
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent(GENERICO))
    await unSoloMensaje(GENERICO)
    expect(screen.queryByText(MENSAJE_DE_PRUEBA)).toBeNull()
    expect(within(grupo).getByRole("button", { name: "Al corriente" })).toHaveAttribute(
      "aria-pressed",
      "true",
    )
    await fueraDeEspera("Guardar")

    fireEvent.click(boton("Guardar"))
    await waitFor(() => expect(aviso.success).toHaveBeenCalledWith("Estado de pago actualizado"))
    await waitFor(() => expect(screen.queryAllByRole("alert")).toHaveLength(0))
    expect(peticiones("PUT", RUTA).map((l) => l.cuerpo)).toEqual([
      { alumnoIds: [BETO.id], estadoPago: "deudor" },
      { alumnoIds: [BETO.id], estadoPago: "al_corriente" },
      { alumnoIds: [BETO.id], estadoPago: "al_corriente" },
    ])
  })
})

// Corrección M-20 (matriz de 01f, "Ficha (GET) … Raíz de la vista"): la raíz que recibe el foco queda
// montada entre cuentas. Con el foco dentro de la ficha que se va (aquí, «Cancelar» de la confirmación de
// restablecer), cambiar de cuenta, a un id mal formado, a un 404 o a un error de carga lleva el foco a la
// raíz de la vista, nunca a <body>. Con el foco en la barra, no se mueve (A-4).
describe("ADMIN-01f · el foco al cambiar de ficha (corrección M-20)", () => {
  const raiz = () => {
    const encabezado = screen.getByRole("heading", { level: 1, name: "Usuarios" })
    const contenedor = encabezado.closest('[tabindex="-1"]')
    if (contenedor === null) throw new Error("Precondición: la vista tiene su raíz enfocable")
    return contenedor
  }

  const conElFocoEnCancelar = async (envolver = false) => {
    const router = await montar(`/admin/usuarios/${CARLA.id}`, envolver)
    await screen.findByRole("region", { name: CARLA.nombre })
    fireEvent.click(boton("Restablecer contraseña"))
    expect(document.activeElement).toBe(boton("Cancelar"))
    return router
  }

  const ID_404 = "e1a2b3c4-4444-4eb1-8d4b-3c5d6e7f8091"

  it.each([
    [
      "otra cuenta",
      `/admin/usuarios/${BETO.id}`,
      () => screen.findByRole("region", { name: BETO.nombre }),
    ],
    [
      "el id mal formado (400)",
      "/admin/usuarios/abc",
      () => screen.findByText("Esa cuenta ya no existe."),
    ],
    [
      "una cuenta que no existe (404)",
      `/admin/usuarios/${ID_404}`,
      () => screen.findByText("Esa cuenta ya no existe."),
    ],
  ])(
    "M-20: con el foco dentro de la ficha, ir a %s lleva el foco a la raíz de la vista, nunca a <body>",
    async (_destino, ruta, llegar) => {
      const router = await conElFocoEnCancelar()
      await irA(router, ruta)
      await llegar()
      await reposar()
      expect(document.activeElement).not.toBe(document.body)
      expect(document.activeElement).toBe(raiz())
    },
  )

  it("M-20: con el foco dentro de la ficha, ir a una cuenta cuya carga falla (5xx) lleva el foco a la raíz", async () => {
    manejador = (metodo, ruta) =>
      metodo === "GET" && ruta === `/api/admin/usuarios/${BETO.id}`
        ? errorJson(500, "ERROR_INTERNO")
        : null
    const router = await conElFocoEnCancelar()
    await irA(router, `/admin/usuarios/${BETO.id}`)
    await screen.findByText(
      "No pudimos cargar la cuenta. Revisa tu conexión e inténtalo de nuevo.",
      {},
      { timeout: 4000 },
    )
    expect(document.activeElement).toBe(raiz())
  })

  it("M-20: atrás y adelante del historial entre dos fichas con el foco dentro llevan el foco a la raíz cada vez", async () => {
    const router = await conElFocoEnCancelar()
    await irA(router, `/admin/usuarios/${BETO.id}`)
    await screen.findByRole("region", { name: BETO.nombre })
    expect(document.activeElement).toBe(raiz())

    fireEvent.click(boton("Restablecer contraseña"))
    expect(document.activeElement).toBe(boton("Cancelar"))
    await act(async () => {
      await router.navigate(-1)
    })
    await screen.findByRole("region", { name: CARLA.nombre })
    await reposar()
    expect(document.activeElement).toBe(raiz())

    fireEvent.click(boton("Restablecer contraseña"))
    await act(async () => {
      await router.navigate(1)
    })
    await screen.findByRole("region", { name: BETO.nombre })
    await reposar()
    expect(document.activeElement).toBe(raiz())
  })

  it("M-20 con <StrictMode>: ir a otra cuenta con el foco dentro lo lleva a la raíz", async () => {
    const router = await conElFocoEnCancelar(true)
    await irA(router, `/admin/usuarios/${BETO.id}`)
    await screen.findByRole("region", { name: BETO.nombre })
    await reposar()
    expect(document.activeElement).toBe(raiz())
  })

  it("M-20 (control, A-4): con el foco en el enlace «Usuarios» de la barra, ir a otra cuenta, a abc o a un 404 no lo mueve", async () => {
    const router = await montar(`/admin/usuarios/${CARLA.id}`)
    await screen.findByRole("region", { name: CARLA.nombre })
    const enlace = within(
      screen.getByRole("navigation", { name: "Navegación principal" }),
    ).getByRole("link", { name: "Usuarios" })
    act(() => enlace.focus())
    for (const ruta of [
      `/admin/usuarios/${BETO.id}`,
      "/admin/usuarios/abc",
      `/admin/usuarios/${ID_404}`,
    ]) {
      await irA(router, ruta)
      await reposar()
      expect(document.activeElement).toBe(enlace)
    }
  })

  it("M-20 (control): abrir la primera ficha sin foco en ella no mueve el foco", async () => {
    await montar(`/admin/usuarios/${CARLA.id}`)
    await screen.findByRole("region", { name: CARLA.nombre })
    await reposar()
    expect(document.activeElement).toBe(document.body)
  })
})

// Corrección T-01 (ronda 1): el control de estado de pago sigue al estado del servidor; una elección de
// la persona distinta del estado de la ficha se conserva hasta que la guarda o el servidor trae ese mismo
// estado.
describe("ADMIN-01f · el estado de pago sigue a la ficha (corrección T-01)", () => {
  const RUTA = "/api/admin/alumnos/estado-pago"
  const opcion = (nombre: string) =>
    within(screen.getByRole("group", { name: "Estado de pago" })).getByRole("button", {
      name: nombre,
    })

  it("T-01: si la ficha trae otro estado (la respuesta de «Restringir acceso»), el control lo muestra sin que nadie lo elija", async () => {
    manejador = (metodo, ruta) =>
      metodo === "PUT" && ruta.endsWith("/acceso")
        ? respuestaJson(200, { ...BETO, accesoRestringido: true, estadoPago: "deudor" })
        : null
    await abrirFicha(BETO)
    expect(opcion("Al corriente")).toHaveAttribute("aria-pressed", "true")
    fireEvent.click(boton("Restringir acceso"))
    await screen.findByRole("dialog")
    fireEvent.click(boton("Sí, restringir"))
    await waitFor(() => expect(opcion("Deudor")).toHaveAttribute("aria-pressed", "true"))
    expect(opcion("Al corriente")).toHaveAttribute("aria-pressed", "false")
  })

  it("T-01: con «Guardar» bien respondido, el control queda en lo guardado aunque la recarga tarde, y después sigue al servidor", async () => {
    let estadoDelServidor: string = "al_corriente"
    cuentas = [CARLA, BETO, ADMIN]
    manejador = (metodo, ruta) => {
      if (metodo === "PUT" && ruta === RUTA) {
        estadoDelServidor = "deudor"
        return respuestaJson(200, { actualizados: 1 })
      }
      if (metodo === "GET" && ruta === `/api/admin/usuarios/${BETO.id}`) {
        return respuestaJson(200, { ...BETO, estadoPago: estadoDelServidor })
      }
      return null
    }
    await abrirFicha(BETO)
    fireEvent.click(opcion("Deudor"))
    fireEvent.click(boton("Guardar"))
    await waitFor(() => expect(aviso.success).toHaveBeenCalledWith("Estado de pago actualizado"))
    await reposar()
    expect(opcion("Deudor")).toHaveAttribute("aria-pressed", "true")
    expect(peticiones("GET", `/api/admin/usuarios/${BETO.id}`).length).toBeGreaterThan(1)
  })

  it("T-01: una elección sin guardar distinta de la ficha se conserva mientras la ficha no cambia; si la ficha trae ese mismo estado, la elección deja de contar", async () => {
    manejador = (metodo, ruta) =>
      metodo === "PUT" && ruta.endsWith("/acceso")
        ? respuestaJson(200, { ...BETO, accesoRestringido: true, estadoPago: "deudor" })
        : null
    await abrirFicha(BETO)
    fireEvent.click(opcion("Deudor"))
    expect(opcion("Deudor")).toHaveAttribute("aria-pressed", "true")
    fireEvent.click(boton("Restringir acceso"))
    await screen.findByRole("dialog")
    fireEvent.click(boton("Sí, restringir"))
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull())
    expect(opcion("Deudor")).toHaveAttribute("aria-pressed", "true")
    expect(peticiones("PUT", RUTA)).toHaveLength(0)
  })
})

// Corrección T-02 (ronda 1), estado vecino de M-20: con el foco dentro de un diálogo de la ficha (en un
// portal, fuera de la raíz), cambiar de cuenta lo cierra y el foco va a la raíz de la vista, nunca a <body>.
describe("ADMIN-01f · el foco con un diálogo abierto al cambiar de ficha (corrección T-02)", () => {
  const raiz = () => {
    const contenedor = screen
      .getByRole("heading", { level: 1, name: "Usuarios" })
      .closest('[tabindex="-1"]')
    if (contenedor === null) throw new Error("Precondición: la vista tiene su raíz enfocable")
    return contenedor
  }

  const ID_404 = "e1a2b3c4-4444-4eb1-8d4b-3c5d6e7f8091"

  // Cada diálogo de 01f y cada control suyo con el foco.
  const DIALOGOS = [
    ["baja", "Dar de baja", "Cancelar"],
    ["baja", "Dar de baja", "Sí, dar de baja"],
    ["restringir", "Restringir acceso", "Cancelar"],
    ["restringir", "Restringir acceso", "Sí, restringir"],
    ["restringir", "Restringir acceso", "Motivo (opcional)"],
  ] as const

  const DESTINOS = [
    ["otra cuenta", `/admin/usuarios/${CARLA.id}`],
    ["el id mal formado", "/admin/usuarios/abc"],
    ["el 404", `/admin/usuarios/${ID_404}`],
  ] as const

  const conElDialogo = async (abrir: string, control: string, estricto = false) => {
    const router = await montar(`/admin/usuarios/${BETO.id}`, estricto)
    await screen.findByRole("region", { name: BETO.nombre })
    fireEvent.click(boton(abrir))
    const dialogo = await screen.findByRole("dialog")
    const elemento =
      control === "Motivo (opcional)"
        ? within(dialogo).getByLabelText(control)
        : within(dialogo).getByRole("button", { name: control })
    act(() => elemento.focus())
    if (control === "Motivo (opcional)") fireEvent.change(elemento, { target: { value: "Adeu" } })
    expect(document.activeElement).toBe(elemento)
    return router
  }

  const casos = DIALOGOS.flatMap(([dialogo, abrir, control]) =>
    DESTINOS.map(([destino, ruta]) => [dialogo, control, destino, abrir, ruta] as const),
  )

  it.each(casos)(
    "T-02: diálogo de %s con el foco en «%s», ir a %s: el diálogo se cierra y el foco va a la raíz",
    async (_dialogo, control, _destino, abrir, ruta) => {
      const router = await conElDialogo(abrir, control)
      await irA(router, ruta)
      await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull())
      await reposar()
      expect(document.activeElement).not.toBe(document.body)
      expect(document.activeElement).toBe(raiz())
    },
  )

  it("T-02: atrás y adelante del historial con un diálogo abierto cada vez llevan el foco a la raíz", async () => {
    const router = await montar(`/admin/usuarios/${CARLA.id}`)
    await screen.findByRole("region", { name: CARLA.nombre })
    await irA(router, `/admin/usuarios/${BETO.id}`)
    await screen.findByRole("region", { name: BETO.nombre })
    fireEvent.click(boton("Restringir acceso"))
    await screen.findByRole("dialog")
    await act(async () => {
      await router.navigate(-1)
    })
    await screen.findByRole("region", { name: CARLA.nombre })
    await reposar()
    expect(document.activeElement).toBe(raiz())

    fireEvent.click(boton("Dar de baja"))
    await screen.findByRole("dialog")
    await act(async () => {
      await router.navigate(1)
    })
    await screen.findByRole("region", { name: BETO.nombre })
    await reposar()
    expect(screen.queryByRole("dialog")).toBeNull()
    expect(document.activeElement).toBe(raiz())
  })

  it("T-02: con el diálogo abierto, ir a una cuenta cuya carga falla (5xx) lleva el foco a la raíz", async () => {
    manejador = (metodo, ruta) =>
      metodo === "GET" && ruta === `/api/admin/usuarios/${CARLA.id}`
        ? errorJson(500, "ERROR_INTERNO")
        : null
    const router = await conElDialogo("Dar de baja", "Cancelar")
    await irA(router, `/admin/usuarios/${CARLA.id}`)
    await screen.findByText(
      "No pudimos cargar la cuenta. Revisa tu conexión e inténtalo de nuevo.",
      {},
      { timeout: 4000 },
    )
    expect(document.activeElement).toBe(raiz())
  })

  it("T-02 con <StrictMode>: con el diálogo abierto, ir a otra cuenta lleva el foco a la raíz", async () => {
    const router = await conElDialogo("Restringir acceso", "Motivo (opcional)", true)
    await irA(router, `/admin/usuarios/${CARLA.id}`)
    await screen.findByRole("region", { name: CARLA.nombre })
    await reposar()
    expect(document.activeElement).toBe(raiz())
  })

  it("T-02 (control): cerrar el diálogo con «Cancelar» sin cambiar de cuenta devuelve el foco a su botón, no a la raíz", async () => {
    await conElDialogo("Dar de baja", "Cancelar")
    fireEvent.click(boton("Cancelar"))
    await waitFor(() => expect(document.activeElement).toBe(boton("Dar de baja")))
  })
})
