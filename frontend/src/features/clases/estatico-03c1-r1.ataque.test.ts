import { describe, expect, it } from "vitest"

import * as datos from "./data"

// Tester, CLASES-03c1, ronda 1. Revisión estática de lo nuevo de 03c1: el indicador medido solo con
// sus dos variables CSS y sin valores arbitrarios ni la escala anulada de Tailwind (§D-7.2, A-01,
// CLAUDE.md › Tokens); "Personas" y el gancho compartido sin tipos fuera de lugar ni importaciones
// entre módulos (CLAUDE.md, reglas 1, 6 y 9); y los restos del indicador de rejilla fuera de data.ts.

const fuentes = import.meta.glob<string>("/src/**/*.{ts,tsx}", {
  query: "?raw",
  import: "default",
  eager: true,
})

const fuente = (ruta: string) => {
  const texto = fuentes[ruta]
  if (texto === undefined) throw new Error(`Precondición: no se leyó ${ruta}`)
  return texto
}

// Sin las líneas de comentario: un comentario que explica la regla no es código.
const lineasDeCodigo = (texto: string) =>
  texto.split("\n").filter((linea) => !/^\s*(\/\/|\/?\*|\{\/\*)/.test(linea))

const SECCIONES = "/src/features/clases/components/secciones-de-clase.tsx"
const PERSONAS = "/src/features/clases/personas-view.tsx"
const GANCHO = "/src/components/seccion/hooks.ts"
const HOOKS_CLASES = "/src/features/clases/hooks.ts"

// Clases de la escala por defecto de Tailwind que tokens.css anula (no generan CSS).
const ESCALA_ANULADA =
  /(?:^|[\s"'`:])(?:text-(?:xs|sm|base|lg|xl|[2-9]xl)|rounded(?:-(?:sm|md|lg|xl|[23]xl))?|shadow(?:-(?:sm|md|lg|xl|2xl))?|blur(?:-(?:sm|md|lg|xl))?|backdrop-blur(?:-\w+)?|bg-(?:white|black|gray-\d+|slate-\d+|neutral-\d+|zinc-\d+))(?=[\s"'`]|$)/

describe("ataque CLASES-03c1 r1: reglas estáticas de lo nuevo", () => {
  it("CL3-R1-30: el indicador lleva en `style` solo --indicador-x y --indicador-ancho", () => {
    const texto = fuente(SECCIONES)
    const claves = [...texto.matchAll(/"(--[\w-]+)"\s*:/g)].map((m) => m[1])
    expect(claves.sort()).toEqual(["--indicador-ancho", "--indicador-x"])
    // Un solo `style=` en el archivo, el del indicador.
    expect(texto.match(/\bstyle=/g)).toHaveLength(1)
  })

  it("CL3-R1-31: secciones-de-clase.tsx y personas-view.tsx no usan valores arbitrarios entre corchetes ni la escala anulada", () => {
    for (const ruta of [SECCIONES, PERSONAS]) {
      const lineas = lineasDeCodigo(fuente(ruta))
      // Un valor entre corchetes (`w-[…]`, `translate-x-[…]`); un variante de atributo con `=`
      // (`in-data-[material=opaco]:`) no es un valor.
      const arbitrarios = lineas.filter((l) => /-\[[^\]=]*\]/.test(l))
      expect({ ruta, arbitrarios }).toEqual({ ruta, arbitrarios: [] })
      const anuladas = lineas.filter((l) => /className|cn\(/.test(l) && ESCALA_ANULADA.test(l))
      expect({ ruta, anuladas }).toEqual({ ruta, anuladas: [] })
    }
  })

  it("CL3-R1-32: personas-view.tsx y secciones-de-clase.tsx solo declaran interfaces de Props y no importan de otro módulo", () => {
    for (const ruta of [PERSONAS, SECCIONES]) {
      const texto = fuente(ruta)
      const tipos = [...texto.matchAll(/^\s*(?:export\s+)?(?:interface|type)\s+(\w+)/gm)].map(
        (m) => m[1] ?? "",
      )
      expect(tipos.filter((nombre) => !nombre.endsWith("Props"))).toEqual([])
      expect(texto).not.toMatch(/from "@\/features\//)
    }
  })

  it("CL3-R1-33: el gancho compartido no importa de ningún módulo ni declara tipos; features/clases no lo copia", () => {
    const gancho = fuente(GANCHO)
    expect(gancho).not.toMatch(/from "@\/features\//)
    expect(gancho).not.toMatch(/^\s*(?:export\s+)?(?:interface|type)\s+\w+/m)
    const copias = Object.entries(fuentes)
      .filter(([ruta]) => ruta !== GANCHO && !/\.test\.tsx?$/.test(ruta))
      .filter(([, texto]) => /(?:const|function)\s+useAlPulsarLaSeccionActiva\b/.test(texto))
      .map(([ruta]) => ruta)
    expect(copias).toEqual([])
  })

  it("CL3-R1-34: el gancho del indicador vive en hooks.ts sin declarar sus tipos ahí", () => {
    const texto = fuente(HOOKS_CLASES)
    expect(texto).toMatch(/export const useIndicadorDeSecciones\b/)
    expect(texto).not.toMatch(/^\s*(?:export\s+)?(?:interface|type)\s+Medida\w*/m)
  })

  it("CL3-R1-35: salen las clases de la rejilla y CLASES_DE_POSICION_DEL_INDICADOR queda con sus dos valores", () => {
    const exportados = Object.keys(datos)
    expect(exportados).not.toContain("CLASES_DEL_INDICADOR_POR_SECCIONES")
    expect(exportados).not.toContain("CLASES_DE_LA_REJILLA_POR_SECCIONES")
    expect(datos.CLASES_DE_POSICION_DEL_INDICADOR).toEqual(["", "translate-x-full"])
    const restos = Object.entries(fuentes)
      .filter(([ruta]) => !/\.test\.tsx?$/.test(ruta))
      .filter(([, texto]) => /grid-cols-[45]\b|w-1\/[45]\b|translate-x-\[[234]00%\]/.test(texto))
      .map(([ruta]) => ruta)
    expect(restos).toEqual([])
  })
})
