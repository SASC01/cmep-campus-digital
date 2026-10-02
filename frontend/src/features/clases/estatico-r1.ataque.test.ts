import ts from "typescript"
import { describe, expect, it } from "vitest"

// Tester, CLASES-a, ronda 1. Revisión estática del módulo features/clases contra "Lo que no se
// hace" de CLAUDE.md: "No uses `?? []` para ocultar datos faltantes" y "No anides ternarios en
// JSX: extrae a retornos tempranos o variables".

const fuentes = import.meta.glob<string>(["./**/*.{ts,tsx}", "!./**/*.test.{ts,tsx}"], {
  query: "?raw",
  import: "default",
  eager: true,
})

describe("ataque CLASES-a r1: reglas de estilo de CLAUDE.md en features/clases", () => {
  it("precondición: se leyeron las fuentes del módulo", () => {
    expect(Object.keys(fuentes).length).toBeGreaterThan(10)
  })

  it("ningún `?? []` en features/clases", () => {
    const usos = Object.entries(fuentes).flatMap(([ruta, texto]) =>
      texto
        .split("\n")
        .map((linea, i) => ({ linea, n: i + 1 }))
        .filter(({ linea }) => /\?\?\s*\[\s*\]/.test(linea))
        .map(({ linea, n }) => `${ruta}:${n}: ${linea.trim()}`),
    )
    expect(usos).toEqual([])
  })

  it("ningún ternario anidado dentro de JSX en features/clases", () => {
    const anidados: string[] = []
    for (const [ruta, texto] of Object.entries(fuentes)) {
      if (!ruta.endsWith(".tsx")) continue
      const archivo = ts.createSourceFile(
        ruta,
        texto,
        ts.ScriptTarget.Latest,
        true,
        ts.ScriptKind.TSX,
      )
      const sinParentesis = (nodo: ts.Node): ts.Node => {
        let actual = nodo
        while (ts.isParenthesizedExpression(actual)) actual = actual.expression
        return actual
      }
      const visitar = (nodo: ts.Node, dentroDeJsx: boolean) => {
        const enJsx = dentroDeJsx || ts.isJsxExpression(nodo)
        if (enJsx && ts.isConditionalExpression(nodo)) {
          const ramas = [sinParentesis(nodo.whenTrue), sinParentesis(nodo.whenFalse)]
          if (ramas.some((rama) => ts.isConditionalExpression(rama))) {
            const { line } = archivo.getLineAndCharacterOfPosition(nodo.getStart())
            anidados.push(`${ruta}:${line + 1}`)
          }
        }
        ts.forEachChild(nodo, (hijo) => visitar(hijo, enJsx))
      }
      visitar(archivo, false)
    }
    expect(anidados).toEqual([])
  })
})
