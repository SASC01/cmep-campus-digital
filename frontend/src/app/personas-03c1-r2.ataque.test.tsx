import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { createMemoryRouter, RouterProvider } from "react-router"
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"

import { Providers } from "./providers"

// CLASES-03c1, ronda 2 del tester: «Ver más alumnos» del roster (maestro y admin en «Personas») con la
// página siguiente y la recarga en vuelo a la vez (revision.md, "Para la ronda 2 del tester (03c1)",
// punto 4). Con el router real (`rutas`) y el QueryClient de app/providers.tsx. Lo que se fija: solo
// se aplica una respuesta (la lista es siempre un prefijo sin repetidos de la del servidor) y el foco
// nunca cae en <body>.
// La recarga sale de agregar a un alumno (el POST invalida el roster). El alumno nuevo se ordena antes
// que todos: una página siguiente pedida con el cursor viejo que se aplicara encima de la recarga
// dejaría un hueco o un repetido.

vi.mock("@/services/navegacion", () => ({ irA: vi.fn(), rutaActual: vi.fn(() => "/") }))
vi.mock("sonner", () => ({
  toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }),
  Toaster: () => null,
}))

type Rol = "maestro" | "admin"

const CLASE_ID = "2a2b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d01"
const MAESTRO = { id: "3a3b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d09", nombre: "Luis Pérez" }
const OTRO_MAESTRO = { id: "3a3b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d10", nombre: "Marta Ruiz" }
const BASES: Record<Rol, string> = { maestro: "/maestro/clases", admin: "/admin/clases" }
const ESPERA = { timeout: 8000 }
const ROSTER = `/api/clases/${CLASE_ID}/alumnos`

const id = (prefijo: string, n: number) =>
  `${prefijo}-1c1f-4b8e-9a1e-${String(n).padStart(12, "0")}`
const idCandidato = (n: number) => id("9a9b3c4d", n)
const idAlumno = (n: number) => id("7a7b3c4d", n)

const respuestaJson = (estado: number, cuerpo: unknown) =>
  new Response(JSON.stringify(cuerpo), {
    status: estado,
    headers: { "Content-Type": "application/json" },
  })
const errorInterno = () =>
  respuestaJson(500, { error: { codigo: "ERROR_INTERNO", mensaje: "Falló." } })
const cursorInvalido = () =>
  respuestaJson(400, { error: { codigo: "VALIDACION", mensaje: "cursor: no es válido" } })

interface Alumno {
  id: string
  nombre: string
  email: string
  estadoPago: "al_corriente" | "deudor"
  accesoRestringido: boolean
  origen: "codigo" | "manual"
  inscritoEn: string
}

const alumno = (n: number): Alumno => ({
  id: idAlumno(n),
  nombre: `Alumno ${String(n).padStart(2, "0")}`,
  email: `alumno${String(n)}@ejemplo.mx`,
  estadoPago: n % 2 === 0 ? "deudor" : "al_corriente",
  accesoRestringido: false,
  origen: "codigo",
  inscritoEn: "2026-09-01T15:30:00.000Z",
})

const paginar = <T extends { id: string }>(filas: readonly T[], url: URL, porDefecto = 50) => {
  const limite = Number(url.searchParams.get("limite") ?? String(porDefecto))
  const cursor = url.searchParams.get("cursor")
  let inicio = 0
  if (cursor !== null) {
    const indice = filas.findIndex((fila) => fila.id === cursor)
    if (indice === -1) return null
    inicio = indice + 1
  }
  const pagina = filas.slice(inicio, inicio + limite)
  const siguiente = filas.length > inicio + limite ? (pagina.at(-1)?.id ?? null) : null
  return { pagina, siguiente }
}

// Una compuerta retiene las peticiones de su tipo hasta que se suelta.
interface Compuerta {
  espera: Promise<void>
  soltar: () => void
}
const compuerta = (): Compuerta => {
  let soltar: () => void = () => undefined
  const espera = new Promise<void>((resolver) => (soltar = resolver))
  return { espera, soltar }
}

interface Estado {
  alumnos: Alumno[]
  candidatos: { id: string; nombre: string; correoEnmascarado: string; yaInscrito: boolean }[]
  post: Compuerta | null
  primera: Compuerta | null
  siguiente: Compuerta | null
  // Cuántas primeras páginas del roster responden 500 (Providers reintenta una vez).
  primeraFalla: number
}

const crearServidor = (rol: Rol) => {
  const estado: Estado = {
    alumnos: Array.from({ length: 51 }, (_, i) => alumno(i + 1)),
    candidatos: [
      { id: idCandidato(1), nombre: "Ana Uno", correoEnmascarado: "a***@x.mx", yaInscrito: false },
    ],
    post: null,
    primera: null,
    siguiente: null,
    primeraFalla: 0,
  }
  const fetchMock = vi.fn<typeof fetch>(async (entrada, init) => {
    const ruta = String(entrada)
    const url = new URL(ruta, "http://x")
    const metodo = init?.method ?? "GET"
    const base = `/api/clases/${CLASE_ID}`
    if (ruta === "/api/auth/refrescar") return respuestaJson(200, { tokenAcceso: "restaurado" })
    if (ruta === "/api/me") {
      return respuestaJson(200, {
        id: "4a4b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d09",
        nombre: "Ana López",
        email: "ana@ejemplo.mx",
        rol,
        debeCambiarContrasena: false,
        accesoRestringido: false,
      })
    }
    if (url.pathname === "/api/clases/impartidas") {
      return respuestaJson(200, {
        clases: [{ id: CLASE_ID, nombre: "Historia", alumnos: estado.alumnos.length }],
        total: 1,
        siguienteCursor: null,
      })
    }
    if (url.pathname === base) {
      return respuestaJson(200, {
        clase: {
          id: CLASE_ID,
          nombre: "Historia",
          descripcion: null,
          maestro: MAESTRO,
          maestros: [MAESTRO],
        },
      })
    }
    if (url.pathname === `${base}/codigo`) return respuestaJson(200, { codigo: "ABCDEFG" })
    if (url.pathname === `${base}/alumnos/candidatos`) {
      return respuestaJson(200, { candidatos: estado.candidatos, hayMas: false })
    }
    if (url.pathname === ROSTER && metodo === "POST") {
      if (estado.post !== null) await estado.post.espera
      const { alumnoId } = JSON.parse(String(init?.body)) as { alumnoId: string }
      estado.candidatos = estado.candidatos.map((c) =>
        c.id === alumnoId ? { ...c, yaInscrito: true } : c,
      )
      // "Aarón" se ordena antes que todos los "Alumno nn".
      estado.alumnos = [
        { ...alumno(99), id: alumnoId, nombre: "Aarón Nuevo", origen: "manual" },
        ...estado.alumnos,
      ]
      return respuestaJson(201, {
        alumno: { id: alumnoId, nombre: "Aarón Nuevo" },
        yaEstaba: false,
      })
    }
    if (url.pathname === ROSTER) {
      const conCursor = url.searchParams.has("cursor")
      const retenida = conCursor ? estado.siguiente : estado.primera
      if (retenida !== null) await retenida.espera
      if (!conCursor && estado.primeraFalla > 0) {
        estado.primeraFalla -= 1
        return errorInterno()
      }
      const r = paginar(estado.alumnos, url)
      if (r === null) return cursorInvalido()
      return respuestaJson(200, {
        alumnos: r.pagina,
        total: estado.alumnos.length,
        siguienteCursor: r.siguiente,
      })
    }
    if (url.pathname === "/api/admin/maestros/candidatos") {
      return respuestaJson(200, {
        candidatos: [{ ...OTRO_MAESTRO, email: "marta@ejemplo.mx" }],
        hayMas: false,
      })
    }
    return respuestaJson(500, { error: { codigo: "ERROR_INTERNO", mensaje: "no esperada" } })
  })
  vi.stubGlobal("fetch", fetchMock)
  return { estado, fetchMock }
}

type FetchMock = ReturnType<typeof crearServidor>["fetchMock"]

const montar = async (entradas: string[]) => {
  const { rutas } = await import("./router")
  const router = createMemoryRouter(rutas, { initialEntries: entradas })
  render(
    <Providers>
      <RouterProvider router={router} />
    </Providers>,
  )
  return router
}

const delRoster = (fetchMock: FetchMock) =>
  fetchMock.mock.calls
    .filter(([, init]) => (init?.method ?? "GET") === "GET")
    .map(([entrada]) => new URL(String(entrada), "http://x"))
    .filter((url) => url.pathname === ROSTER)
const conCursor = (fetchMock: FetchMock) =>
  delRoster(fetchMock).filter((url) => url.searchParams.has("cursor")).length
const sinCursor = (fetchMock: FetchMock) =>
  delRoster(fetchMock).filter((url) => !url.searchParams.has("cursor")).length

const reposar = (ms = 200) => act(() => new Promise((resolver) => setTimeout(resolver, ms)))
const buscar = (campo: string, texto: string) =>
  fireEvent.change(screen.getByRole("textbox", { name: campo }), { target: { value: texto } })

// Los nombres de las filas del roster, en orden, por el texto accesible de su "Quitar".
const filasDelRoster = () =>
  screen
    .queryAllByRole("button", { name: /^Quitar / })
    .map((boton) => (boton.textContent ?? "").replace(/^Quitar\s*/, "").trim())

// Una sola respuesta aplicada: las filas son, en orden y sin repetidos, el principio de la lista
// del servidor en su estado final.
const esPrefijoSinRepetidos = (filas: string[], servidor: readonly Alumno[]) => ({
  repetidos: filas.filter((nombre, i) => filas.indexOf(nombre) !== i),
  fueraDeOrden: filas.filter((nombre, i) => servidor[i]?.nombre !== nombre),
})

// Agrega a "Ana Uno" con el POST retenido y deja todo listo para soltarlo.
const prepararAgregar = async (estado: Estado) => {
  estado.post = compuerta()
  buscar("Buscar alumno por nombre", "Ana")
  fireEvent.click(await screen.findByRole("button", { name: "Agregar a la clase Ana Uno" }, ESPERA))
  const post = estado.post
  return post
}

beforeAll(async () => {
  await import("./router")
}, 60_000)

beforeEach(() => {
  vi.resetModules()
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe("«Ver más alumnos» con la página siguiente y la recarga en vuelo a la vez (CL3-R2-09 a CL3-R2-12)", () => {
  it.each([
    ["admin", "la página siguiente primero"],
    ["admin", "la recarga primero"],
    ["maestro", "la página siguiente primero"],
    ["maestro", "la recarga primero"],
  ] as const)(
    "CL3-R2-09: %s; se pide la página siguiente, el alta recarga el roster y se responde %s: solo se aplica una respuesta y el foco no cae en <body>",
    async (rol, orden) => {
      const { estado, fetchMock } = crearServidor(rol)
      await montar([`${BASES[rol]}/${CLASE_ID}/personas`])
      const verMas = await screen.findByRole("button", { name: "Ver más alumnos" }, ESPERA)
      expect(filasDelRoster()).toHaveLength(50)
      const post = await prepararAgregar(estado)

      // Con el POST en vuelo, la persona pide la página siguiente desde el botón.
      estado.siguiente = compuerta()
      estado.primera = compuerta()
      const siguiente = estado.siguiente
      const primera = estado.primera
      const antesDeLaRecarga = sinCursor(fetchMock)
      act(() => verMas.focus())
      fireEvent.click(verMas)
      await waitFor(() => expect(conCursor(fetchMock)).toBe(1), ESPERA)

      // El alta termina e invalida el roster: la recarga sale con la página siguiente aún en vuelo.
      post.soltar()
      await waitFor(() => expect(sinCursor(fetchMock)).toBeGreaterThan(antesDeLaRecarga), ESPERA)
      expect(screen.getByRole("button", { name: "Ver más alumnos" })).toHaveAttribute(
        "aria-busy",
        "true",
      )

      if (orden === "la página siguiente primero") {
        siguiente.soltar()
        await reposar(50)
        primera.soltar()
      } else {
        primera.soltar()
        await reposar(50)
        siguiente.soltar()
      }
      await waitFor(
        () =>
          expect(screen.queryByRole("button", { name: "Ver más alumnos" })).not.toHaveAttribute(
            "aria-busy",
          ),
        ESPERA,
      )
      await reposar()

      const filas = filasDelRoster()
      expect(filas[0]).toBe("Aarón Nuevo")
      expect(esPrefijoSinRepetidos(filas, estado.alumnos)).toEqual({
        repetidos: [],
        fueraDeOrden: [],
      })
      expect(document.activeElement).not.toBe(document.body)
      expect(document.activeElement).not.toBeNull()
    },
  )

  it("CL3-R2-10: admin; con la recarga en vuelo, pulsar «Ver más alumnos» no pide la página siguiente, el foco se queda en el botón y, al terminar la recarga, sí la pide con el cursor nuevo", async () => {
    const { estado, fetchMock } = crearServidor("admin")
    await montar([`${BASES.admin}/${CLASE_ID}/personas`])
    const verMas = await screen.findByRole("button", { name: "Ver más alumnos" }, ESPERA)
    const post = await prepararAgregar(estado)
    estado.primera = compuerta()
    const primera = estado.primera
    const antes = sinCursor(fetchMock)
    post.soltar()
    await waitFor(() => expect(sinCursor(fetchMock)).toBeGreaterThan(antes), ESPERA)
    const enEspera = screen.getByRole("button", { name: "Ver más alumnos" })
    expect(enEspera).toBe(verMas)
    act(() => verMas.focus())
    fireEvent.click(verMas)
    fireEvent.click(verMas)
    await reposar(50)
    expect(conCursor(fetchMock)).toBe(0)
    expect(document.activeElement).toBe(verMas)

    primera.soltar()
    await waitFor(() => expect(verMas).not.toHaveAttribute("aria-busy"), ESPERA)
    expect(document.activeElement).toBe(verMas)
    fireEvent.click(verMas)
    await waitFor(() => expect(filasDelRoster()).toHaveLength(52), ESPERA)
    const cursores = delRoster(fetchMock)
      .map((url) => url.searchParams.get("cursor"))
      .filter((cursor) => cursor !== null)
    // El cursor es el de la última fila de la página recargada (Alumno 49), no el de antes (Alumno 50).
    expect(cursores).toEqual([idAlumno(49)])
    expect(esPrefijoSinRepetidos(filasDelRoster(), estado.alumnos)).toEqual({
      repetidos: [],
      fueraDeOrden: [],
    })
    // El botón se desmontó con el foco: T-26 lo lleva a la primera fila nueva, nunca a <body>.
    await reposar()
    expect(screen.queryByRole("button", { name: "Ver más alumnos" })).toBeNull()
    expect(document.activeElement).not.toBe(document.body)
  })

  it("CL3-R2-11: admin; la página siguiente en vuelo y la recarga del alta fallan las dos: un solo error en el bloque y el foco va al encabezado «Alumnos», no a <body>", async () => {
    const { estado } = crearServidor("admin")
    await montar([`${BASES.admin}/${CLASE_ID}/personas`])
    const verMas = await screen.findByRole("button", { name: "Ver más alumnos" }, ESPERA)
    const post = await prepararAgregar(estado)
    estado.siguiente = compuerta()
    const siguiente = estado.siguiente
    act(() => verMas.focus())
    fireEvent.click(verMas)
    await reposar(50)
    // La recarga falla (con su reintento); la página siguiente queda retenida hasta después.
    estado.primeraFalla = 2
    post.soltar()
    const titulo = await screen.findByRole("heading", { name: "Alumnos" }, ESPERA)
    const bloque = titulo.closest<HTMLElement>('[data-slot="card"]')
    if (bloque === null) throw new Error("Precondición: el panel del roster")
    expect(
      await within(bloque).findByRole("alert", undefined, { timeout: 8000 }),
    ).toBeInTheDocument()
    siguiente.soltar()
    await reposar()
    expect(within(bloque).getAllByRole("alert")).toHaveLength(1)
    expect(screen.queryByRole("button", { name: "Ver más alumnos" })).toBeNull()
    expect(document.activeElement).not.toBe(document.body)
    expect(document.activeElement).toBe(titulo)
  })

  it("CL3-R2-12: admin; la página siguiente es la última y llega antes que la recarga: el foco va a la primera fila nueva y la recarga deja el roster sin repetidos", async () => {
    const { estado, fetchMock } = crearServidor("admin")
    await montar([`${BASES.admin}/${CLASE_ID}/personas`])
    const verMas = await screen.findByRole("button", { name: "Ver más alumnos" }, ESPERA)
    const post = await prepararAgregar(estado)
    estado.primera = compuerta()
    const primera = estado.primera
    act(() => verMas.focus())
    fireEvent.click(verMas)
    // La página siguiente (Alumno 51) llega con el POST todavía en vuelo.
    await waitFor(() => expect(filasDelRoster()).toHaveLength(51), ESPERA)
    await reposar()
    expect(screen.queryByRole("button", { name: "Ver más alumnos" })).toBeNull()
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Quitar Alumno 51" }))
    const antes = sinCursor(fetchMock)
    post.soltar()
    await waitFor(() => expect(sinCursor(fetchMock)).toBeGreaterThan(antes), ESPERA)
    primera.soltar()
    await waitFor(() => expect(filasDelRoster()).toHaveLength(52), ESPERA)
    await reposar()
    expect(esPrefijoSinRepetidos(filasDelRoster(), estado.alumnos)).toEqual({
      repetidos: [],
      fueraDeOrden: [],
    })
    expect(document.activeElement).not.toBe(document.body)
  })
})
