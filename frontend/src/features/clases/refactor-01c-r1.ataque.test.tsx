import { FIRMA_ADMINISTRACION, TIPOS_DE_ARCHIVO_PERMITIDOS, type Adjunto } from "@campus/shared"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import type { ReactNode } from "react"
import { afterEach, describe, expect, it, vi } from "vitest"

import { AdjuntosDePublicacion as AdjuntosCompartidos } from "@/components/adjuntos/adjuntos-de-publicacion"
import { TEXTOS_DE_LA_CLASE } from "@/components/clase/data"
import { ApiError } from "@/services/apiClient"

import { AdjuntosDePublicacion } from "./components/adjuntos-de-publicacion"
import { FirmaDelAutor } from "./components/firma-del-autor"
import {
  ACCEPT_DE_ADJUNTOS,
  clavePublicaciones,
  MARGEN_DE_VISTA_PREVIA_MS,
  MENSAJES_ERROR_CLASES_GENERALES,
  TEXTOS_ADJUNTOS,
  TEXTOS_CLASE,
  TIEMPO_FRESCO_DEL_MURO_MS,
} from "./data"
import {
  avisoDeFalloAlSubir,
  baseDeClase,
  erroresDeFormularioClases,
  erroresPorCampo,
  errorDeArchivoElegido,
  esErrorDeCursor,
  mensajeDeErrorClases,
  perspectivaDeRuta,
  tiempoFrescoDelMuro,
  tipoDeArchivo,
} from "./lib"
import type { IncidenciaValidacion, PaginaDelMuro, Perspectiva } from "./types"

// Ataque del Tester, TAREAS-01c, ronda 1 ("Puntos de ataque" → 01c: sin cambio de comportamiento).
// Las copias "de ebfe126" de abajo son el código de antes del refactor, tal cual (git show
// ebfe126:frontend/src/features/clases/lib.ts y data.ts): lo nuevo debe dar lo mismo para cada
// entrada, incluidas las raras. Los ganchos de adjuntos se simulan en su lugar real
// (components/adjuntos/hooks); el envoltorio de features/clases debe reaccionar igual que antes.

const aviso = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }))
vi.mock("sonner", () => ({ toast: aviso }))

const descarga = vi.hoisted(() => ({ mutateAsync: vi.fn(), isPending: false }))
vi.mock("@/components/adjuntos/hooks", () => ({
  useUrlDeDescarga: () => descarga,
  useSolicitarSubida: () => ({ mutateAsync: vi.fn(), isPending: false }),
}))

afterEach(() => {
  cleanup()
  aviso.error.mockReset()
  descarga.mutateAsync.mockReset()
  vi.unstubAllGlobals()
})

// ---------------------------------------------------------------------------------------------
// Copias de ebfe126 (las funciones movidas o envueltas, sin cambios).

const BASES_DE_EBFE126: Record<Perspectiva, string> = {
  estudiante: "/estudiante/clases",
  maestro: "/maestro/clases",
  admin: "/admin/clases",
}
const perspectivaDeEbfe126 = (pathname: string): Perspectiva => {
  const ruta = pathname.toLowerCase()
  for (const perspectiva of ["maestro", "admin"] as const) {
    const base = `/${perspectiva}`
    if (ruta === base || ruta.startsWith(`${base}/`)) return perspectiva
  }
  return "estudiante"
}
const baseDeEbfe126 = (perspectiva: Perspectiva, claseId: string): string =>
  `${BASES_DE_EBFE126[perspectiva]}/${claseId}`
const PREFIJO_DE_EBFE126 = /^([a-zA-Z_]+):\s*/
const campoDeEbfe126 = (error: unknown): string | null => {
  if (!(error instanceof ApiError) || error.codigo !== "VALIDACION") return null
  const coincidencia = PREFIJO_DE_EBFE126.exec(error.message)
  return coincidencia ? (coincidencia[1] ?? null) : null
}
const erroresPorCampoDeEbfe126 = (incidencias: readonly IncidenciaValidacion[]) => {
  const errores: Partial<Record<string, string>> = {}
  for (const incidencia of incidencias) {
    const campo = incidencia.path[0]
    if (typeof campo !== "string" || errores[campo] !== undefined) continue
    errores[campo] = incidencia.message
  }
  return errores
}
const tiempoFrescoDeEbfe126 = (paginas: readonly PaginaDelMuro[], dataUpdatedAt: number) => {
  const vencimientos = paginas
    .flatMap((pagina) => pagina.publicaciones)
    .flatMap((publicacion) => publicacion.adjuntos)
    .flatMap((adjunto) =>
      adjunto.vistaPrevia === null ? [] : [Date.parse(adjunto.vistaPrevia.expiraEn)],
    )
    .filter((vencimiento) => !Number.isNaN(vencimiento))
  if (vencimientos.length === 0) return TIEMPO_FRESCO_DEL_MURO_MS
  const primero = Math.min(...vencimientos)
  return Math.max(0, primero - 60_000 - dataUpdatedAt)
}

// Los textos de ebfe126:frontend/src/features/clases/data.ts, literales.
const TEXTOS_DE_EBFE126 = {
  adjuntar: "Adjuntar archivos",
  ayuda: "Hasta 5 archivos de 25 MB: PDF, imágenes, Word, Excel, PowerPoint o texto.",
  elegidos: "Archivos elegidos",
  adjuntos: "Archivos adjuntos",
  quitar: "Quitar",
  descargar: "Descargar",
  errorCantidad: "Puedes adjuntar hasta 5 archivos.",
  listaFija: "Mientras se publica no puedes cambiar los archivos.",
}
const ARCHIVO_NO_SUBIDO = "Uno de los archivos no terminó de subir. Inténtalo de nuevo."
const ARCHIVO_INVALIDO = "Uno de los archivos no coincide con lo que elegiste. Vuelve a adjuntarlo."
const ALMACEN_NO_DISPONIBLE =
  "Los archivos no están disponibles en este momento. Inténtalo más tarde."

describe("ataque TAREAS-01c r1: mismas salidas que en ebfe126 (tablas con entradas raras)", () => {
  it("perspectivaDeRuta y baseDeClase dan lo mismo para rutas raras, con mayúsculas, sufijos, query, hash y sin barra", () => {
    const rutas = [
      "",
      "/",
      "/maestro",
      "/maestro/",
      "/MAESTRO/clases/x",
      "/maestros",
      "/maestro-clases",
      "/admin",
      "/Admin/clases/abc/muro",
      "/administrador",
      "/estudiante/clases",
      "/maestro?x=1",
      "/maestro#a",
      "maestro/clases",
      "//maestro",
      "/admin/../maestro",
      "/ADMIN",
      "/admin\u00A0/x",
    ]
    expect(rutas.map(perspectivaDeRuta)).toEqual(rutas.map(perspectivaDeEbfe126))
    for (const perspectiva of ["estudiante", "maestro", "admin"] as const) {
      for (const id of ["", "abc", "a/b", "ID%20X", "../x"]) {
        expect(baseDeClase(perspectiva, id)).toBe(baseDeEbfe126(perspectiva, id))
      }
    }
  })

  it("erroresPorCampo y esErrorDeCursor dan lo mismo con incidencias sin campo, repetidas o con llaves que no son texto, y con errores que no son de cursor", () => {
    const incidencias: IncidenciaValidacion[][] = [
      [],
      [{ path: [], message: "sin campo" }],
      [{ path: [0], message: "índice" }],
      [{ path: [Symbol("s")], message: "símbolo" }],
      [
        { path: ["nombre", "x"], message: "primero" },
        { path: ["nombre"], message: "segundo" },
        { path: ["descripcion"], message: "otro" },
      ],
    ]
    for (const lista of incidencias) {
      expect(erroresPorCampo(lista)).toEqual(erroresPorCampoDeEbfe126(lista))
    }
    const errores: unknown[] = [
      new ApiError("VALIDACION", "cursor: no es válido", 400),
      new ApiError("VALIDACION", "Cursor: no es válido", 400),
      new ApiError("VALIDACION", "cursor:no es válido", 400),
      new ApiError("VALIDACION", " cursor: no es válido", 400),
      new ApiError("VALIDACION", "claseId: debe ser un identificador válido", 400),
      new ApiError("VALIDACION", "sin prefijo", 400),
      new ApiError("SIN_ACCESO_A_LA_CLASE", "cursor: no es válido", 403),
      new Error("cursor: no es válido"),
      "cursor: no es válido",
      null,
      undefined,
    ]
    expect(errores.map((e) => esErrorDeCursor(e))).toEqual(
      errores.map((e) => campoDeEbfe126(e) === "cursor"),
    )
    expect(erroresDeFormularioClases(errores[0], ["cursor"])).toEqual({ cursor: "no es válido" })
    expect(erroresDeFormularioClases(errores[4], ["nombre"])).toBeNull()
    expect(erroresDeFormularioClases(errores[6], ["cursor"])).toBeNull()
    expect(
      erroresDeFormularioClases(new ApiError("VALIDACION", "nombre: muy corto", 400), ["nombre"]),
    ).toEqual({ nombre: "muy corto" })
  })

  it("tiempoFrescoDelMuro da lo mismo que en ebfe126 sin adjuntos, con fechas inválidas, vencidas y varias páginas", () => {
    const adjunto = (expiraEn: string | null): Adjunto => ({
      id: crypto.randomUUID(),
      nombre: "a.png",
      tipo: "image/png",
      tamano: 1,
      vistaPrevia: expiraEn === null ? null : { url: "https://almacen.ejemplo.mx/a", expiraEn },
    })
    const pagina = (adjuntos: Adjunto[]) =>
      ({
        publicaciones: [{ adjuntos }],
        siguienteCursor: null,
      }) as unknown as PaginaDelMuro
    const ahora = Date.parse("2026-10-07T12:00:00.000Z")
    const casos: PaginaDelMuro[][] = [
      [],
      [pagina([])],
      [pagina([adjunto(null)])],
      [pagina([adjunto("no es fecha")])],
      [pagina([adjunto("2026-10-07T11:00:00.000Z")])],
      [pagina([adjunto("2026-10-07T12:05:00.000Z"), adjunto("2026-10-07T12:03:00.000Z")])],
      [
        pagina([adjunto("2026-10-07T12:30:00.000Z")]),
        pagina([adjunto("2026-10-07T12:02:00.000Z")]),
      ],
    ]
    expect(casos.map((c) => tiempoFrescoDelMuro(c, ahora))).toEqual(
      casos.map((c) => tiempoFrescoDeEbfe126(c, ahora)),
    )
    expect(MARGEN_DE_VISTA_PREVIA_MS).toBe(60_000)
  })

  it("los textos de adjuntos, el accept, la clave del muro, los mensajes de archivos y los de la clase son los de ebfe126", () => {
    expect(TEXTOS_ADJUNTOS).toMatchObject(TEXTOS_DE_EBFE126)
    expect([
      TEXTOS_ADJUNTOS.imagenAdjunta("x.png"),
      TEXTOS_ADJUNTOS.errorPesaMucho("x"),
      TEXTOS_ADJUNTOS.errorTipo("x"),
      TEXTOS_ADJUNTOS.errorSubida("x"),
      TEXTOS_ADJUNTOS.errorRechazado("x", "porque sí"),
    ]).toEqual([
      "Imagen adjunta: x.png",
      "«x» pesa más de 25 MB.",
      "«x» no es de un tipo permitido.",
      "No pudimos subir «x». Inténtalo de nuevo.",
      "No pudimos subir «x»: porque sí",
    ])
    expect(ACCEPT_DE_ADJUNTOS).toBe(
      Object.entries(TIPOS_DE_ARCHIVO_PERMITIDOS)
        .flatMap(([tipo, extensiones]) => [tipo, ...extensiones.map((e) => `.${e}`)])
        .join(","),
    )
    expect(clavePublicaciones("abc")).toEqual(["clases", "abc", "publicaciones"])
    expect([
      MENSAJES_ERROR_CLASES_GENERALES.archivoNoSubido,
      MENSAJES_ERROR_CLASES_GENERALES.archivoInvalido,
      MENSAJES_ERROR_CLASES_GENERALES.almacenNoDisponible,
    ]).toEqual([ARCHIVO_NO_SUBIDO, ARCHIVO_INVALIDO, ALMACEN_NO_DISPONIBLE])
    const porCodigo = (codigo: string) =>
      mensajeDeErrorClases(new ApiError(codigo, "del servidor", 400))
    expect(
      [
        "ARCHIVO_NO_SUBIDO",
        "ARCHIVO_INVALIDO",
        "ALMACEN_NO_CONFIGURADO",
        "ALMACEN_NO_DISPONIBLE",
      ].map(porCodigo),
    ).toEqual([ARCHIVO_NO_SUBIDO, ARCHIVO_INVALIDO, ALMACEN_NO_DISPONIBLE, ALMACEN_NO_DISPONIBLE])
    expect(TEXTOS_CLASE.sinAcceso).toBe("No tienes acceso a esta clase.")
    expect(TEXTOS_DE_LA_CLASE.sinAcceso).toBe("No tienes acceso a esta clase.")
    expect(TEXTOS_DE_LA_CLASE.firmaAdministracion).toBe(FIRMA_ADMINISTRACION)
    expect(FIRMA_ADMINISTRACION).toBe("Administración")
  })

  it("avisoDeFalloAlSubir, errorDeArchivoElegido y tipoDeArchivo dan los textos de antes en cada camino", () => {
    expect(avisoDeFalloAlSubir(new TypeError("Failed to fetch"), "guia.pdf")).toBe(
      "No pudimos subir «guia.pdf». Inténtalo de nuevo.",
    )
    expect(
      avisoDeFalloAlSubir(
        new ApiError("ARCHIVO_INVALIDO", "El archivo pesa más de 25 MB.", 400),
        "g.pdf",
      ),
    ).toBe("No pudimos subir «g.pdf»: El archivo pesa más de 25 MB.")
    expect(avisoDeFalloAlSubir(new ApiError("ALMACEN_NO_DISPONIBLE", "x", 503), "g.pdf")).toBe(
      `No pudimos subir «g.pdf»: ${ALMACEN_NO_DISPONIBLE}`,
    )
    expect(avisoDeFalloAlSubir(new ApiError("SIN_ACCESO_A_LA_CLASE", "x", 403), "g.pdf")).toBe(
      `No pudimos subir «g.pdf»: ${mensajeDeErrorClases(new ApiError("SIN_ACCESO_A_LA_CLASE", "x", 403))}`,
    )
    const archivo = (name: string, type: string, size = 10) => ({ name, type, size })
    expect([
      errorDeArchivoElegido(archivo("enorme.pdf", "application/pdf", 26 * 1024 * 1024), 0),
      errorDeArchivoElegido(archivo("dibujo.svg", "image/svg+xml"), 0),
      errorDeArchivoElegido(archivo("sin-extension", "application/pdf"), 0),
      errorDeArchivoElegido(archivo("guia.pdf", "application/pdf"), 5),
      errorDeArchivoElegido(archivo("guia.PDF", ""), 0),
    ]).toEqual([
      "«enorme.pdf» pesa más de 25 MB.",
      "«dibujo.svg» no es de un tipo permitido.",
      "«sin-extension» no es de un tipo permitido.",
      "Puedes adjuntar hasta 5 archivos.",
      null,
    ])
    expect([tipoDeArchivo(archivo("a.PDF", "")), tipoDeArchivo(archivo("a.xyz", ""))]).toEqual([
      "application/pdf",
      "",
    ])
  })
})

const conCliente = (hijo: ReactNode) => {
  const cliente = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={cliente}>{hijo}</QueryClientProvider>)
}

const PDF: Adjunto = {
  id: "8a8b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d02",
  nombre: "Guía del tema 3.pdf",
  tipo: "application/pdf",
  tamano: 839_680,
  vistaPrevia: null,
}
const CLASE_ID = "2a2b3c4d-1c1f-4b8e-9a1e-0f2a3b4c5d01"

describe("ataque TAREAS-01c r1: comportamiento con los ganchos simulados en components/adjuntos/hooks", () => {
  it("el envoltorio de features/clases: un fallo de descarga ALMACEN_NO_DISPONIBLE avisa con el texto de CLASES; un SIN_ACCESO, con el suyo; una descarga buena navega", async () => {
    const asignar = vi.fn()
    vi.stubGlobal("location", { ...window.location, assign: asignar })
    conCliente(<AdjuntosDePublicacion claseId={CLASE_ID} adjuntos={[PDF]} />)
    const boton = screen.getByRole("button", { name: /Descargar\s+Guía del tema 3\.pdf/ })

    descarga.mutateAsync.mockRejectedValueOnce(new ApiError("ALMACEN_NO_DISPONIBLE", "x", 503))
    fireEvent.click(boton)
    await waitFor(() => expect(aviso.error).toHaveBeenCalledTimes(1))
    expect(aviso.error).toHaveBeenLastCalledWith(ALMACEN_NO_DISPONIBLE)

    descarga.mutateAsync.mockRejectedValueOnce(new ApiError("SIN_ACCESO_A_LA_CLASE", "x", 403))
    fireEvent.click(boton)
    await waitFor(() => expect(aviso.error).toHaveBeenCalledTimes(2))
    expect(aviso.error).toHaveBeenLastCalledWith(
      mensajeDeErrorClases(new ApiError("SIN_ACCESO_A_LA_CLASE", "x", 403)),
    )

    descarga.mutateAsync.mockResolvedValueOnce({ url: "https://almacen.ejemplo.mx/descarga" })
    fireEvent.click(boton)
    await waitFor(() => expect(asignar).toHaveBeenCalledWith("https://almacen.ejemplo.mx/descarga"))
    expect(descarga.mutateAsync).toHaveBeenLastCalledWith(PDF.id)
    expect(screen.getByRole("list", { name: "Archivos adjuntos" })).toBeInTheDocument()
  })

  it("el compartido usa el mensajeDeError que recibe (no uno fijo de CLASES), y sin adjuntos no pinta nada", async () => {
    const propio = vi.fn(() => "Mensaje propio del módulo")
    conCliente(<AdjuntosCompartidos claseId={CLASE_ID} adjuntos={[PDF]} mensajeDeError={propio} />)
    descarga.mutateAsync.mockRejectedValueOnce(new ApiError("ALMACEN_NO_DISPONIBLE", "x", 503))
    fireEvent.click(screen.getByRole("button", { name: /Descargar/ }))
    await waitFor(() => expect(aviso.error).toHaveBeenCalledWith("Mensaje propio del módulo"))
    cleanup()
    const { container } = conCliente(
      <AdjuntosCompartidos claseId={CLASE_ID} adjuntos={[]} mensajeDeError={propio} />,
    )
    expect(container).toBeEmptyDOMElement()
  })

  it("la firma: el admin sale como «Administración» con su icono; una persona llamada «Administración» sale como nombre, sin icono", () => {
    const { container } = render(
      <div>
        <p data-testid="admin">
          <FirmaDelAutor autor={{ id: "a", nombre: "Ana", administracion: true }} />
        </p>
        <p data-testid="persona">
          <FirmaDelAutor autor={{ id: "b", nombre: "Administración", administracion: false }} />
        </p>
      </div>,
    )
    const admin = screen.getByTestId("admin")
    const persona = screen.getByTestId("persona")
    expect(admin).toHaveTextContent(/^Administración$/)
    expect(admin.querySelector("svg")).not.toBeNull()
    expect(admin).not.toHaveTextContent("Ana")
    expect(persona).toHaveTextContent(/^Administración$/)
    expect(persona.querySelector("svg")).toBeNull()
    expect(container.textContent).toBe("AdministraciónAdministración")
  })
})

// ---------------------------------------------------------------------------------------------
// Revisión estática de lo movido (código de src/, sin pruebas).

const fuentes = import.meta.glob<string>("/src/**/*.{ts,tsx}", {
  query: "?raw",
  import: "default",
  eager: true,
})
const codigo = Object.entries(fuentes).filter(([ruta]) => !/\.test\.tsx?$/.test(ruta))
const sinComentarios = (texto: string): string =>
  texto
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split("\n")
    .filter((linea) => !/^\s*\/\//.test(linea))
    .join("\n")

const MOVIDOS = [
  "/src/components/adjuntos/adjuntos-de-publicacion.tsx",
  "/src/components/adjuntos/data.ts",
  "/src/components/adjuntos/hooks.ts",
  "/src/components/adjuntos/lib.ts",
  "/src/components/adjuntos/lista-de-adjuntos-elegidos.tsx",
  "/src/components/adjuntos/types.ts",
  "/src/components/clase/con-clase-de-la-ruta.tsx",
  "/src/components/clase/data.ts",
  "/src/components/clase/firma-del-autor.tsx",
  "/src/lib/errores-de-api.ts",
  "/src/lib/ruta-de-clase.ts",
  "/src/services/clasesService.ts",
]

describe("ataque TAREAS-01c r1: revisión estática de lo movido", () => {
  it("los doce archivos de destino existen; ninguno usa ?? [], fetch(, console., dangerouslySetInnerHTML ni target=_blank, ni importa de features/", () => {
    const presentes = codigo.map(([ruta]) => ruta)
    expect(MOVIDOS.filter((ruta) => !presentes.includes(ruta))).toEqual([])
    const prohibido =
      /\?\?\s*\[\s*\]|\bfetch\(|console\.|dangerouslySetInnerHTML|target=["']_blank|from\s+["'](@\/features\/|\.\.?\/.*features\/)/
    const fallas = codigo
      .filter(([ruta]) => MOVIDOS.includes(ruta))
      .filter(([, texto]) => prohibido.test(sinComentarios(texto)))
      .map(([ruta]) => ruta)
    expect(fallas).toEqual([])
  })

  it("ningún archivo de components/, lib/ ni services/ importa de features/", () => {
    const fallas = codigo
      .filter(([ruta]) => /^\/src\/(components|lib|services)\//.test(ruta))
      .filter(([, texto]) => /from\s+["'](@\/features\/|(\.\.\/)+features\/)/.test(texto))
      .map(([ruta]) => ruta)
    expect(fallas).toEqual([])
  })

  it("cada símbolo movido se define una sola vez, en su destino (AdjuntosDePublicacion dos: el compartido y el envoltorio), y los orígenes de una línea son una sola reexportación", () => {
    const destino: Record<string, string[]> = {
      perspectivaDeRuta: ["/src/lib/ruta-de-clase.ts"],
      baseDeClase: ["/src/lib/ruta-de-clase.ts"],
      BASES_POR_PERSPECTIVA: ["/src/lib/ruta-de-clase.ts"],
      Perspectiva: ["/src/lib/ruta-de-clase.ts"],
      erroresPorCampo: ["/src/lib/errores-de-api.ts"],
      esErrorDeCursor: ["/src/lib/errores-de-api.ts"],
      ErroresFormulario: ["/src/lib/errores-de-api.ts"],
      IncidenciaValidacion: ["/src/lib/errores-de-api.ts"],
      clavePublicaciones: ["/src/services/clasesService.ts"],
      tipoDeArchivo: ["/src/components/adjuntos/lib.ts"],
      errorDeArchivoElegido: ["/src/components/adjuntos/lib.ts"],
      useSolicitarSubida: ["/src/components/adjuntos/hooks.ts"],
      useUrlDeDescarga: ["/src/components/adjuntos/hooks.ts"],
      TEXTOS_ADJUNTOS: ["/src/components/adjuntos/data.ts"],
      ACCEPT_DE_ADJUNTOS: ["/src/components/adjuntos/data.ts"],
      MARGEN_DE_VISTA_PREVIA_MS: ["/src/components/adjuntos/data.ts"],
      MENSAJES_ERROR_DE_ARCHIVOS: ["/src/components/adjuntos/data.ts"],
      ArchivoCandidato: ["/src/components/adjuntos/types.ts"],
      ConClaseDeLaRuta: ["/src/components/clase/con-clase-de-la-ruta.tsx"],
      FirmaDelAutor: ["/src/components/clase/firma-del-autor.tsx"],
      ListaDeAdjuntosElegidos: ["/src/components/adjuntos/lista-de-adjuntos-elegidos.tsx"],
      TEXTOS_DE_LA_CLASE: ["/src/components/clase/data.ts"],
      AdjuntosDePublicacion: [
        "/src/components/adjuntos/adjuntos-de-publicacion.tsx",
        "/src/features/clases/components/adjuntos-de-publicacion.tsx",
      ],
    }
    // features/auth y features/admin tienen homónimos propios desde antes de 01c (ErroresFormulario,
    // IncidenciaValidacion, erroresPorCampo): cada módulo los suyos, regla 9 de CLAUDE.md, y no son
    // parte de §D-9 ("No se toca" desde 01c). La revisión es sobre lo que movió §D-9.
    const alcance = codigo.filter(([ruta]) => !/^\/src\/features\/(auth|admin)\//.test(ruta))
    const obtenido: Record<string, string[]> = {}
    for (const nombre of Object.keys(destino)) {
      const definicion = new RegExp(
        `^\\s*(export\\s+)?(const|function|interface|type)\\s+${nombre}\\b`,
        "m",
      )
      obtenido[nombre] = alcance
        .filter(([, texto]) => definicion.test(sinComentarios(texto)))
        .map(([ruta]) => ruta)
        .sort()
    }
    expect(obtenido).toEqual(destino)
    for (const [origen, simbolo, ruta] of [
      ["con-clase-de-la-ruta", "ConClaseDeLaRuta", "@/components/clase/con-clase-de-la-ruta"],
      ["firma-del-autor", "FirmaDelAutor", "@/components/clase/firma-del-autor"],
      [
        "lista-de-adjuntos-elegidos",
        "ListaDeAdjuntosElegidos",
        "@/components/adjuntos/lista-de-adjuntos-elegidos",
      ],
    ] as const) {
      const texto = fuentes[`/src/features/clases/components/${origen}.tsx`]
      expect(texto, `Precondición: existe el origen ${origen}`).toBeDefined()
      expect(sinComentarios(texto ?? "").trim()).toBe(`export { ${simbolo} } from "${ruta}"`)
    }
  })
})
