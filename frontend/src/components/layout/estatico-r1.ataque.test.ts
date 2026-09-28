import { describe, expect, it } from "vitest"

// Ataques del Tester (DESIGN-01b-1, ronda 1): revisión estática de src/ (sin pruebas) para lo que
// una prueba de DOM no ve: enlaces del pie escritos fuera de su archivo, un href="#", lo fijo o el
// movimiento fuera de su sitio, el fondo montado más de una vez o dentro del router, un fondo
// sólido que tape los orbes, valores arbitrarios nuevos y cualquier rastro de 01b-2
// (plan-01b.md, V-15, V-16, §D-1, §D-2, §D-5 y "Alcance").

const fuentes = import.meta.glob<string>("/src/**/*.{ts,tsx,css}", {
  query: "?raw",
  import: "default",
  eager: true,
})

const codigo = Object.entries(fuentes).filter(([ruta]) => !/\.test\.tsx?$/.test(ruta))
const soloTs = codigo.filter(([ruta]) => /\.tsx?$/.test(ruta))

const lineasCon = (patron: RegExp, archivos = soloTs) =>
  archivos.flatMap(([ruta, texto]) =>
    texto
      .split("\n")
      .map((linea, indice) => ({ ruta, linea: indice + 1, texto: linea }))
      .filter(({ texto: linea }) => patron.test(linea))
      .map(({ ruta: r, linea, texto: t }) => `${r}:${linea}: ${t.trim()}`),
  )

const rutasCon = (patron: RegExp, archivos = soloTs) =>
  [...new Set(lineasCon(patron, archivos).map((l) => l.split(":")[0] ?? ""))].sort()

// Sin las líneas de comentario: un comentario que dice "nunca href=\"#\"" no es código.
const sinComentarios = (lineas: string[]) =>
  lineas.filter((l) => !/^\S+:\d+:\s*(\/\/|\/?\*)/.test(l))

const archivo = (ruta: string) => {
  const texto = fuentes[ruta]
  if (texto === undefined) throw new Error(`no se leyó ${ruta}`)
  return texto
}

describe("ataque (DESIGN-01b-1 r1): el pie sale de un solo archivo y nunca con '#'", () => {
  it("se leyó el código fuente", () => {
    expect(soloTs.length).toBeGreaterThan(40)
  })

  it("los textos de los enlaces del colegio y ENLACES_DEL_COLEGIO solo viven en components/layout/data.ts", () => {
    expect(rutasCon(/"(Sitio web|Facebook|Aviso de privacidad)"/)).toEqual([
      "/src/components/layout/data.ts",
    ])
    expect(rutasCon(/ENLACES_DEL_COLEGIO\s*[:=]/)).toEqual(["/src/components/layout/data.ts"])
    expect(rutasCon(/\bENLACES_DEL_COLEGIO\b/)).toEqual([
      "/src/components/layout/data.ts",
      "/src/components/layout/pie-de-pagina.tsx",
    ])
    expect(rutasCon(/NOMBRE_DEL_COLEGIO\s*=/)).toEqual(["/src/components/layout/data.ts"])
    expect(rutasCon(/Colegio Mexicano de Estudios/)).toEqual(["/src/components/layout/data.ts"])
  })

  it("ningún href con '#' ni javascript:, y ninguna URL escrita a mano en un componente", () => {
    expect(sinComentarios(lineasCon(/href\s*=\s*\{?\s*["'`]#|href\s*:\s*["'`]#/))).toEqual([])
    expect(sinComentarios(lineasCon(/javascript:/i))).toEqual([])
    expect(lineasCon(/<a\s[^>]*href\s*=\s*["'`]/)).toEqual([])
  })

  it("el año del pie se calcula: ningún año de cuatro cifras en el código del marco", () => {
    const marco = soloTs.filter(([ruta]) => ruta.startsWith("/src/components/layout/"))
    const conAnio = sinComentarios(lineasCon(/\b20\d\d\b/, marco))
    expect(conAnio).toEqual([])
  })
})

describe("ataque (DESIGN-01b-1 r1): fondo montado una sola vez, fuera del router", () => {
  it("FondoAnimado solo lo pinta FondoDeLaApp, y FondoDeLaApp solo main.tsx", () => {
    expect(rutasCon(/<FondoAnimado\b/)).toEqual(["/src/app/fondo-de-la-app.tsx"])
    expect(rutasCon(/<FondoDeLaApp\b/)).toEqual(["/src/main.tsx"])
    expect(lineasCon(/<FondoDeLaApp\b/)).toHaveLength(1)
  })

  it("en main.tsx, el fondo va dentro de Providers, antes de RouterProvider y fuera de él", () => {
    const main = archivo("/src/main.tsx")
    const providers = main.indexOf("<Providers>")
    const fondo = main.indexOf("<FondoDeLaApp router={router} />")
    const routerProvider = main.indexOf("<RouterProvider router={router} />")
    const cierre = main.indexOf("</Providers>")
    expect([providers, fondo, routerProvider, cierre].every((i) => i >= 0)).toBe(true)
    expect(providers).toBeLessThan(fondo)
    expect(fondo).toBeLessThan(routerProvider)
    expect(routerProvider).toBeLessThan(cierre)
    // RouterProvider se cierra solo: nada queda dentro de él.
    expect(main).not.toMatch(/<RouterProvider[^/]*>[\s\S]*<\/RouterProvider>/)
  })

  it("el router no conoce el fondo (ni una ruta de diseño)", () => {
    expect(archivo("/src/app/router.tsx")).not.toMatch(/Fondo|orbe/i)
  })

  it("ningún componente pinta un fondo sólido de página que tape los orbes", () => {
    expect(lineasCon(/\bbg-background\b/)).toEqual([])
  })
})

describe("ataque (DESIGN-01b-1 r1): lo fijo y el movimiento solo en su sitio (V-15 y V-16)", () => {
  it("V-16: `fixed` solo en la barra de navegación y en el diálogo; data-fondo solo en FondoAnimado", () => {
    const tsx = soloTs.filter(([ruta]) => ruta.endsWith(".tsx"))
    expect(rutasCon(/\bfixed\b/, tsx)).toEqual([
      "/src/components/layout/barra-navegacion.tsx",
      "/src/components/ui/dialog.tsx",
    ])
    expect(rutasCon(/data-fondo/, codigo)).toEqual([
      "/src/components/layout/fondo-animado.tsx",
      "/src/styles/tokens.css",
    ])
  })

  it("V-15: @keyframes y will-change solo en tokens.css; animate- solo el giro de los indicadores", () => {
    expect(lineasCon(/@keyframes/, codigo).map((l) => l.split(":")[0])).toEqual([
      "/src/styles/tokens.css",
      "/src/styles/tokens.css",
      "/src/styles/tokens.css",
    ])
    expect(rutasCon(/will-change/, codigo)).toEqual(["/src/styles/tokens.css"])
    const animaciones = lineasCon(/\banimate-[\w-]+/).flatMap(
      (l) => l.match(/(?:[\w-]+:)*animate-[\w-]+/g) ?? [],
    )
    expect([...new Set(animaciones)].sort()).toEqual(["animate-spin", "motion-reduce:animate-none"])
    expect(rutasCon(/\banimate-/)).toEqual([
      "/src/components/cargando.tsx",
      "/src/components/ui/button.tsx",
    ])
  })

  it("los únicos valores arbitrarios de maquetación nuevos son los que prescribe el plan", () => {
    const fueraDeUi = soloTs.filter(([ruta]) => !ruta.startsWith("/src/components/ui/"))
    const arbitrarios = lineasCon(/-\[[^\]"]*\]/, fueraDeUi).flatMap(
      (l) => l.match(/[\w:-]*-\[[^\]"]*\]/g) ?? [],
    )
    expect([...new Set(arbitrarios)].sort()).toEqual(
      [
        "in-data-[material=opaco]",
        "lg:grid-cols-[minmax(0,1fr)_minmax(0,28rem)]",
        "lg:max-h-[calc(100svh-6rem)]",
        "md:grid-cols-[6rem_minmax(0,1fr)]",
        "md:h-[calc(100svh-3rem)]",
        "md:min-h-[calc(100svh-3rem)]",
        "min-h-[calc(100svh-7rem)]",
      ].sort(),
    )
  })
})

describe("ataque (DESIGN-01b-2 r0): los 7 campos de contraseña usan CampoContrasena (§D-7, V-17)", () => {
  // DESIGN-01b-2, ronda 0: sustituye a la guarda de alcance de 01b-1 ("nada de 01b-2 está
  // implementado"). La tabla de §D-7: por formulario, en orden, el id del campo y la constante de
  // TEXTOS_CAMPO_CONTRASENA de su botón.
  const TABLA: Record<string, [string, string][]> = {
    "/src/features/auth/components/formulario-cambiar-contrasena.tsx": [
      ["contrasenaActual", "mostrarTemporal"],
      ["contrasenaNueva", "mostrarNueva"],
      ["confirmacion", "mostrarConfirmacion"],
    ],
    "/src/features/auth/components/formulario-login.tsx": [["contrasena", "mostrar"]],
    "/src/features/auth/components/formulario-nueva-contrasena.tsx": [
      ["contrasenaNueva", "mostrarNueva"],
      ["confirmacion", "mostrarConfirmacion"],
    ],
    "/src/features/auth/components/formulario-registro.tsx": [["contrasena", "mostrar"]],
  }
  const CAMPO = "/src/features/auth/components/campo-contrasena.tsx"
  const soloTsx = soloTs.filter(([ruta]) => ruta.endsWith(".tsx"))

  // Cada elemento <CampoContrasena … />, desde su apertura hasta el primer "/>".
  const elementos = (texto: string) => {
    const lista: string[] = []
    for (let desde = texto.indexOf("<CampoContrasena"); desde !== -1;) {
      const hasta = texto.indexOf("/>", desde)
      if (hasta === -1) throw new Error("un <CampoContrasena no cierra")
      lista.push(texto.slice(desde, hasta + 2))
      desde = texto.indexOf("<CampoContrasena", hasta)
    }
    return lista
  }

  it("exactamente 7 <CampoContrasena, solo en los 4 formularios: 1, 1, 2 y 3", () => {
    const usos = lineasCon(/<CampoContrasena\b/, soloTsx).map((l) => l.split(":")[0])
    expect(usos).toHaveLength(7)
    const porArchivo: Record<string, number> = {}
    for (const ruta of usos) if (ruta) porArchivo[ruta] = (porArchivo[ruta] ?? 0) + 1
    expect(porArchivo).toEqual({
      "/src/features/auth/components/formulario-cambiar-contrasena.tsx": 3,
      "/src/features/auth/components/formulario-login.tsx": 1,
      "/src/features/auth/components/formulario-nueva-contrasena.tsx": 2,
      "/src/features/auth/components/formulario-registro.tsx": 1,
    })
  })

  it("cada campo lleva, en orden, la constante de su fila de la tabla, sin type ni aria-label", () => {
    for (const [ruta, filas] of Object.entries(TABLA)) {
      const campos = elementos(archivo(ruta))
      const obtenido = campos.map((elemento) => [
        /\sid="([^"]+)"/.exec(elemento)?.[1] ?? "(sin id literal)",
        /nombreDelBoton=\{TEXTOS_CAMPO_CONTRASENA\.(\w+)\}/.exec(elemento)?.[1] ??
          "(sin constante)",
      ])
      expect(obtenido, ruta).toEqual(filas)
      for (const elemento of campos) {
        expect(elemento, `${ruta}: un campo fija su type`).not.toMatch(/\stype=/)
        expect(elemento, `${ruta}: un campo lleva aria-label`).not.toMatch(/aria-label/)
        expect(elemento.match(/nombreDelBoton=/g), ruta).toHaveLength(1)
      }
    }
  })

  it("TEXTOS_CAMPO_CONTRASENA tiene exactamente los 4 textos de §D-7 y vive solo en features/auth/data.ts", () => {
    const datos = archivo("/src/features/auth/data.ts")
    const inicio = datos.indexOf("export const TEXTOS_CAMPO_CONTRASENA = {")
    expect(inicio, "no existe TEXTOS_CAMPO_CONTRASENA").toBeGreaterThan(-1)
    const cuerpo = datos.slice(inicio, datos.indexOf("}", inicio))
    const entradas = Object.fromEntries(
      [...cuerpo.matchAll(/^\s*(\w+):\s*"([^"]*)",?\s*$/gm)].map(([, clave, valor]) => [
        clave,
        valor,
      ]),
    )
    expect(entradas).toEqual({
      mostrar: "Mostrar contraseña",
      mostrarNueva: "Mostrar contraseña nueva",
      mostrarConfirmacion: "Mostrar confirmación de contraseña",
      mostrarTemporal: "Mostrar contraseña temporal",
    })
    expect(rutasCon(/TEXTOS_CAMPO_CONTRASENA\s*=/)).toEqual(["/src/features/auth/data.ts"])
    // Ningún nombre del botón escrito a mano fuera de data.ts.
    expect(rutasCon(/"Mostrar (contraseña|confirmación)/)).toEqual(["/src/features/auth/data.ts"])
  })

  it('V-17: 0 type="password" literal; "password" solo en campo-contrasena.tsx; 0 "Ocultar"', () => {
    expect(lineasCon(/type="password"/, soloTsx)).toEqual([])
    expect(rutasCon(/"password"/)).toEqual([CAMPO])
    expect(lineasCon(/Ocultar/, soloTsx)).toEqual([])
  })

  it("V-17: en campo-contrasena.tsx, sin aria-label ni aria-labelledby; un sr-only y un aria-pressed en el código", () => {
    const campo: [string, string][] = [[CAMPO, archivo(CAMPO)]]
    // Las líneas de comentario del archivo nombran "aria-label", "sr-only" y "aria-pressed" para
    // explicar el diseño; lo que se cuenta es el código.
    expect(sinComentarios(lineasCon(/aria-label/, campo))).toEqual([])
    expect(sinComentarios(lineasCon(/\bsr-only\b/, campo))).toHaveLength(1)
    expect(sinComentarios(lineasCon(/aria-pressed/, campo))).toHaveLength(1)
    expect(rutasCon(/<CampoContrasena\b|from "\.\/campo-contrasena"/)).toEqual(Object.keys(TABLA))
  })
})
