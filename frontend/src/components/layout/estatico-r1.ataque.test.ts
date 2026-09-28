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

describe("ataque (DESIGN-01b-1 r1): nada de 01b-2 está implementado", () => {
  it("sin CampoContrasena, aria-pressed, nombreDelBoton ni textos del botón de contraseña", () => {
    expect(
      lineasCon(
        /CampoContrasena|aria-pressed|nombreDelBoton|TEXTOS_CAMPO_CONTRASENA|Mostrar contrase/,
      ),
    ).toEqual([])
    expect(rutasCon(/campo-contrasena/)).toEqual([])
    expect(Object.keys(fuentes).filter((ruta) => ruta.includes("campo-contrasena"))).toEqual([])
  })

  it('los 7 campos de contraseña siguen como Input con type="password" en los 4 formularios', () => {
    const formularios = soloTs.filter(([ruta]) =>
      /\/features\/auth\/components\/formulario-[\w-]+\.tsx$/.test(ruta),
    )
    const campos = lineasCon(/type="password"/, formularios).map((l) => l.split(":")[0])
    expect(campos.sort()).toEqual(
      [
        "/src/features/auth/components/formulario-cambiar-contrasena.tsx",
        "/src/features/auth/components/formulario-cambiar-contrasena.tsx",
        "/src/features/auth/components/formulario-cambiar-contrasena.tsx",
        "/src/features/auth/components/formulario-login.tsx",
        "/src/features/auth/components/formulario-nueva-contrasena.tsx",
        "/src/features/auth/components/formulario-nueva-contrasena.tsx",
        "/src/features/auth/components/formulario-registro.tsx",
      ].sort(),
    )
  })
})
