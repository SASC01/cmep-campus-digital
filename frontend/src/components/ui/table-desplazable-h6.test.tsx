import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { cleanup, render, screen } from "@testing-library/react"
import { createMemoryRouter, RouterProvider } from "react-router"
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"

import { establecerToken, limpiarToken } from "@/services/tokenAcceso"

import { Badge } from "./badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./table"

// H6-1 (ADMIN-01, comprobación humana del 2026-11-10): a 360 px, /admin/estado-pago y /admin/usuarios
// ensanchaban el documento. Los textos sr-only (position: absolute) de las celdas tomaban como bloque
// contenedor un ancestro fuera del contenedor con desplazamiento de `Table`, que no estaba posicionado,
// así que el desplazamiento no los recortaba. jsdom no calcula diseño: la prueba es estructural. Para
// cada contenedor con desplazamiento de una tabla, el contenedor está posicionado, y todo sr-only o
// elemento absoluto de su interior tiene un ancestro posicionado entre él y el contenedor, contando el
// propio contenedor.

const POSICIONADAS = ["relative", "absolute", "fixed", "sticky"]

const estaPosicionado = (elemento: Element) =>
  POSICIONADAS.some((clase) => elemento.classList.contains(clase))

const describir = (elemento: Element) =>
  `<${elemento.tagName.toLowerCase()} class="${elemento.getAttribute("class") ?? ""}">${(
    elemento.textContent ?? ""
  ).slice(0, 60)}`

// Devuelve, por cada tabla, los elementos absolutos que escapan y si su contenedor está posicionado.
const revisarTablas = (raiz: ParentNode) => {
  const tablas = [...raiz.querySelectorAll('table[data-slot="table"]')]
  if (tablas.length === 0) throw new Error("Precondición: hay al menos una tabla montada")
  let absolutos = 0
  const escapan: string[] = []
  const contenedoresSinPosicion: string[] = []
  for (const tabla of tablas) {
    const contenedor = tabla.parentElement
    if (contenedor === null) throw new Error("Precondición: la tabla está en su contenedor")
    if (!contenedor.classList.contains("overflow-x-auto")) {
      throw new Error("Precondición: el contenedor de la tabla desplaza en horizontal")
    }
    if (!estaPosicionado(contenedor)) contenedoresSinPosicion.push(describir(contenedor))
    for (const elemento of contenedor.querySelectorAll(".sr-only, .absolute")) {
      absolutos += 1
      let actual = elemento.parentElement
      let contenido = false
      while (actual !== null) {
        if (estaPosicionado(actual)) {
          contenido = true
          break
        }
        if (actual === contenedor) break
        actual = actual.parentElement
      }
      if (!contenido) escapan.push(describir(elemento))
    }
  }
  return { tablas: tablas.length, absolutos, escapan, contenedoresSinPosicion }
}

const ESPERA = { timeout: 4000 }
const UUID = (n: number) => `5a5b3c4d-1c1f-4b8e-9a1e-${String(n).padStart(12, "0")}`

const respuestaJson = (estado: number, cuerpo: unknown) =>
  new Response(JSON.stringify(cuerpo), {
    status: estado,
    headers: { "Content-Type": "application/json" },
  })

const alumno = (n: number, estadoPago: "deudor" | "al_corriente", accesoRestringido = false) => ({
  id: UUID(n),
  nombre: `Alumno con un nombre muy largo ${String(n).padStart(3, "0")}`,
  email: `alumno.con.un.correo.muy.largo.${String(n)}@ejemplo.mx`,
  rol: "estudiante" as const,
  activo: true,
  creadoEn: "2026-09-01T15:00:00.000Z",
  estadoPago,
  fechaEstadoPago: null,
  accesoRestringido,
  motivoRestriccion: accesoRestringido ? "Adeudo" : null,
  fechaRestriccion: accesoRestringido ? "2026-09-02T15:00:00.000Z" : null,
})

const RESPUESTAS: Record<string, unknown> = {
  "/api/admin/usuarios": {
    usuarios: [alumno(1, "deudor", true), alumno(2, "al_corriente"), alumno(3, "deudor")],
    siguienteCursor: null,
    siguienteCursorNombre: null,
  },
  "/api/admin/clases": {
    clases: [
      {
        id: UUID(10),
        nombre: "Derecho civil",
        maestros: [
          { id: UUID(11), nombre: "Luis Pérez" },
          { id: UUID(12), nombre: "Ana Ruiz", cuentaDesactivada: true },
        ],
        alumnos: 3,
        creadoEn: "2026-09-01T15:00:00.000Z",
        archivadaEn: null,
      },
    ],
    total: 1,
    siguienteCursor: null,
    siguienteCursorArchivadaEn: null,
  },
  "/api/admin/movimientos-inscripcion": {
    movimientos: [
      {
        id: UUID(20),
        secuencia: "1",
        tipo: "alta",
        creadoEn: "2026-09-03T15:00:00.000Z",
        clase: { id: UUID(10), nombre: "Derecho civil" },
        alumno: { id: UUID(1), nombre: "Alumno 001", email: "a1@ejemplo.mx" },
        actor: { id: UUID(30), nombre: "Administración", administracion: true },
      },
    ],
    siguienteCursor: null,
  },
  "/api/admin/enlaces-registro": {
    enlaces: [
      {
        id: UUID(40),
        creadoEn: "2026-09-01T15:00:00.000Z",
        expiraEn: "2026-09-08T15:00:00.000Z",
        revocadoEn: null,
        estado: "vigente",
        registrados: 2,
      },
    ],
    siguienteCursor: null,
  },
  "/api/admin/resumen": { alumnos: 3, maestros: 2, clasesActivas: 1 },
}

beforeAll(async () => {
  await import("@/app/router")
}, 60_000)

beforeEach(() => {
  establecerToken("token-de-prueba")
  vi.stubGlobal(
    "fetch",
    vi.fn<typeof fetch>((entrada) => {
      const url = new URL(String(entrada), "http://local")
      if (url.pathname === "/api/auth/refrescar") {
        return Promise.resolve(respuestaJson(200, { tokenAcceso: "token-de-prueba" }))
      }
      if (url.pathname === "/api/me") {
        return Promise.resolve(
          respuestaJson(200, {
            id: UUID(30),
            nombre: "Administración",
            email: "admin@ejemplo.mx",
            rol: "admin",
            debeCambiarContrasena: false,
            accesoRestringido: false,
          }),
        )
      }
      const cuerpo = RESPUESTAS[url.pathname]
      if (cuerpo !== undefined) return Promise.resolve(respuestaJson(200, cuerpo))
      return Promise.resolve(
        respuestaJson(500, { error: { codigo: "ERROR_INTERNO", mensaje: "no esperada" } }),
      )
    }),
  )
})

afterEach(() => {
  cleanup()
  limpiarToken()
  vi.unstubAllGlobals()
})

const montar = async (ruta: string) => {
  const { rutas } = await import("@/app/router")
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false, staleTime: 30_000 } },
  })
  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={createMemoryRouter(rutas, { initialEntries: [ruta] })} />
    </QueryClientProvider>,
  )
  await screen.findByRole("table", {}, ESPERA)
}

describe("H6-1 · los sr-only y los absolutos de una tabla no escapan de su contenedor con desplazamiento", () => {
  it("Table: el contenedor con desplazamiento está posicionado y contiene el sr-only de una celda", () => {
    render(
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nombre</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell>
              Ver <span className="sr-only">Ver a Ana</span>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>,
    )
    const resultado = revisarTablas(document.body)
    expect(resultado.absolutos).toBe(1)
    expect(resultado.contenedoresSinPosicion).toEqual([])
    expect(resultado.escapan).toEqual([])
  })

  it.each([
    ["/admin/estado-pago"],
    ["/admin/usuarios"],
    ["/admin/clases"],
    ["/admin/movimientos"],
    ["/admin/maestros"],
  ])(
    "%s montada: ningún sr-only ni absoluto de sus tablas queda fuera de un ancestro posicionado",
    async (ruta) => {
      await montar(ruta)
      const resultado = revisarTablas(document.body)
      expect(resultado.contenedoresSinPosicion).toEqual([])
      expect(resultado.escapan).toEqual([])
    },
  )

  it("las vistas con sr-only en sus celdas los tienen de verdad (la revisión no es vacía)", async () => {
    await montar("/admin/estado-pago")
    expect(revisarTablas(document.body).absolutos).toBeGreaterThan(3)
    cleanup()
    await montar("/admin/usuarios")
    expect(revisarTablas(document.body).absolutos).toBeGreaterThan(2)
    cleanup()
    await montar("/admin/clases")
    expect(revisarTablas(document.body).absolutos).toBeGreaterThan(2)
  })
})

// H6-2 (ADMIN-01, arbitraje del manager): la tabla encoge una columna hasta su ancho mínimo y partía la
// insignia de la celda («Cuenta desactivada», una sílaba por línea). TableCell le fija whitespace-nowrap a
// toda insignia descendiente; fuera de las tablas, la insignia no cambia.
describe("H6-2 · una insignia dentro de una celda de tabla no se parte", () => {
  it("TableCell: una insignia dentro de una celda no se parte", () => {
    render(
      <>
        <Table>
          <TableBody>
            <TableRow>
              <TableCell className="wrap-anywhere">
                <Badge variant="muted">Cuenta desactivada</Badge>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
        <Badge variant="muted">Fuera de la tabla</Badge>
      </>,
    )
    const insignia = screen.getByText("Cuenta desactivada")
    expect(insignia).toHaveAttribute("data-slot", "badge")
    const celda = insignia.closest("td")
    if (celda === null) throw new Error("Precondición: la insignia está en una celda")
    expect(celda).toHaveAttribute("data-slot", "table-cell")
    // La clase de la vista (wrap-anywhere) no desplaza la regla al combinarse con cn.
    expect(celda).toHaveClass("wrap-anywhere", "[&_[data-slot=badge]]:whitespace-nowrap")
    // Fuera de una tabla, la insignia queda como estaba: sin nowrap propio.
    expect(screen.getByText("Fuera de la tabla").className).not.toMatch(/whitespace-nowrap/)
  })
})
