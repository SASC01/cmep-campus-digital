import { describe, expect, it } from "vitest"

// Ataques del Tester (DESIGN-01a, ronda 1): revisión estática del código de src/ (sin pruebas) con
// las búsquedas V-02 a V-07 y V-13 del plan, para que una clase por defecto de Tailwind, un color
// suelto, un vidrio fabricado a mano, un `disabled` en vuelo o un rojo sobre vidrio se pongan en
// rojo aquí (Tailwind ignora sin avisar una clase que no genera CSS: R-02).

const fuentes = import.meta.glob<string>("/src/**/*.{ts,tsx}", {
  query: "?raw",
  import: "default",
  eager: true,
})

const codigo = Object.entries(fuentes).filter(([ruta]) => !/\.test\.tsx?$/.test(ruta))

const coincidencias = (patron: RegExp, archivos = codigo) =>
  archivos.flatMap(([ruta, texto]) =>
    texto
      .split("\n")
      .map((linea, indice) => ({ ruta, linea: indice + 1, texto: linea }))
      .filter(({ texto: linea }) =>
        new RegExp(patron.source, patron.flags.replace("g", "")).test(linea),
      )
      .map(({ ruta: r, linea, texto: t }) => `${r}:${linea}: ${t.trim()}`),
  )

const soloTsx = codigo.filter(([ruta]) => ruta.endsWith(".tsx"))
const rutasDe = (lista: string[]) => [...new Set(lista.map((l) => l.split(":")[0]))].sort()

describe("ataque (DESIGN-01a r1): clases anuladas y valores sueltos (V-02 a V-04)", () => {
  it("se leyó el código fuente", () => {
    expect(codigo.length).toBeGreaterThan(40)
  })

  it("V-02: ningún color de la paleta por defecto ni dark:", () => {
    const colores =
      /\b(bg|text|border|ring|outline|fill|stroke|from|via|to|shadow|decoration|accent|caret|divide|placeholder)-(slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|white|black)\b|\bdark:/
    expect(coincidencias(colores)).toEqual([])
  })

  it("V-03: ninguna clase de las escalas anuladas (tamaños, pesos, sombras, radios, interletraje, desenfoque)", () => {
    const escalas =
      /\btext-(xs|sm|base|lg|xl|[2-9]xl)\b|\bfont-(thin|extralight|light|semibold|extrabold|black)\b|\bshadow-(2xs|xs|sm|md|lg|xl|2xl)\b|\brounded-(xs|sm|md|lg|xl|2xl|3xl|4xl)\b|\brounded(["'\s]|$)|\btracking-(tighter|tight)\b|\bleading-none\b|\bbackdrop-(blur|saturate)|\bblur-(xs|sm|md|lg|xl)\b/
    expect(coincidencias(escalas)).toEqual([])
  })

  it("V-04: ningún color suelto ni valor arbitrario de tipografía, radio, sombra, fondo o borde", () => {
    expect(coincidencias(/#[0-9A-Fa-f]{3,8}\b|rgba?\(|hsla?\(|oklch\(/)).toEqual([])
    expect(
      coincidencias(/\b(text|rounded|shadow|leading|tracking|font|bg|border|outline)-\[/),
    ).toEqual([])
  })

  it("ningún fondo blanco o de superficie translúcido fabricado a mano", () => {
    expect(coincidencias(/\bbg-(surface|background|muted|card|popover)\/\d+/)).toEqual([])
  })
})

describe("ataque (DESIGN-01a r1): foco, espera y materiales (V-05 a V-07)", () => {
  it("V-05: outline-none solo en DialogContent; ningún ring- ni focus:", () => {
    expect(rutasDe(coincidencias(/outline-none|outline-hidden/))).toEqual([
      "/src/components/ui/dialog.tsx",
    ])
    expect(coincidencias(/outline-none|outline-hidden/)).toHaveLength(1)
    expect(coincidencias(/\bring-|\bfocus:/)).toEqual([])
  })

  it("V-06: ningún control con `disabled` en JSX; aria-busy y aria-disabled solo en Button; 13 enEspera", () => {
    expect(coincidencias(/\sdisabled(=|\s|\/?>|$)/, soloTsx)).toEqual([])
    // Atributos JSX, no la variante `aria-busy:` de las clases (button-variants.ts, §D-5).
    expect(rutasDe(coincidencias(/aria-(busy|disabled)=/, soloTsx))).toEqual([
      "/src/components/ui/button.tsx",
    ])
    expect(coincidencias(/enEspera=/, soloTsx)).toHaveLength(13)
  })

  it("V-07: vidrio y vidrio fuerte solo en la lista final del plan (igualdad exacta), sin vidrio azul", () => {
    // DESIGN-01b-1, ronda 1 (plan-01b.md, §D-9, texto de referencia de la ronda 1): igualdad
    // exacta con la lista final. toEqual acepta el (string | undefined)[] de rutasDe; una ruta
    // undefined haría fallar la igualdad.
    const vidrio = rutasDe(coincidencias(/"[^"\n]*(?<![\w-])vidrio(?![\w-])[^"\n]*"/))
    expect(vidrio).toContain("/src/components/ui/card.tsx")
    expect(vidrio).toEqual([
      "/src/components/layout/barra-navegacion.tsx",
      "/src/components/layout/barra-superior.tsx",
      "/src/components/layout/pie-de-pagina.tsx",
      "/src/components/ui/card.tsx",
    ])
    const vidrioFuerte = rutasDe(coincidencias(/\bvidrio-fuerte\b/))
    expect(vidrioFuerte).toContain("/src/components/ui/button-variants.ts")
    expect(vidrioFuerte).toEqual([
      "/src/components/cargando.tsx",
      "/src/components/layout/barra-navegacion.tsx",
      "/src/components/ui/button-variants.ts",
      "/src/features/auth/components/panel-anuncios.tsx",
    ])
    expect(coincidencias(/\bvidrio-azul\b/)).toEqual([])
    expect(rutasDe(coincidencias(/data-material|data-densidad/))).toEqual([
      "/src/components/layout/contenedor-rol.tsx",
    ])
  })
})

describe("ataque (DESIGN-01a r1): rojo sobre vidrio (V-13) y Toaster único", () => {
  it("V-13: texto rojo solo donde el plan lo permite (sólido, --danger-soft o iconos)", () => {
    expect(rutasDe(coincidencias(/\btext-(destructive|danger)([^-\w]|$)/, soloTsx))).toEqual([
      "/src/components/error-de-campo.tsx",
      "/src/components/mensaje-error.tsx",
      "/src/components/ui/sonner.tsx",
      "/src/features/auth/acceso-restringido-view.tsx",
    ])
  })

  it("en acceso restringido, el rojo solo va en los dos iconos (aria-hidden), nunca en texto", () => {
    const lineas = coincidencias(/\btext-danger\b/).filter((l) => l.includes("acceso-restringido"))
    expect(lineas).toHaveLength(2)
    for (const linea of lineas) expect(linea).toContain('aria-hidden="true"')
  })

  it("solo app/providers.tsx importa el Toaster de components/ui/sonner", () => {
    expect(rutasDe(coincidencias(/components\/ui\/sonner/))).toEqual(["/src/app/providers.tsx"])
    expect(rutasDe(coincidencias(/\bToaster\b/))).toEqual([
      "/src/app/providers.tsx",
      "/src/components/ui/sonner.tsx",
    ])
  })
})
