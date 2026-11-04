import { describe, expect, it } from "vitest"

// CALIFICACIONES-02b (CAL2-B15): revisión estática por texto fuente de lo que agrega 02b. Las reglas de
// código se aplican sin comentarios; la de los comentarios, solo a ellos. No depende del reloj.

const fuentes = import.meta.glob<string>("/src/**/*.{ts,tsx}", {
  query: "?raw",
  import: "default",
  eager: true,
})

const esPrueba = (ruta: string) => /\.test\.tsx?$/.test(ruta)

const sinComentarios = (texto: string): string =>
  texto
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:"'`])\/\/.*$/gm, "$1")

const soloComentarios = (texto: string): string[] => [
  ...[...texto.matchAll(/\/\*[\s\S]*?\*\//g)].map((m) => m[0]),
  ...[...texto.matchAll(/(?:^|[^:"'`])(\/\/.*)$/gm)].map((m) => m[1] ?? ""),
]

const fuente = (ruta: string): string => {
  const texto = fuentes[ruta]
  if (texto === undefined) throw new Error(`Precondición: existe ${ruta}`)
  return texto
}

const MODULO = "/src/features/calificaciones/"
const BOTON = `${MODULO}components/exportar-a-excel.tsx`
const XLSX = "/src/lib/xlsx.ts"
const LECTOR = "/src/lib/lector-xlsx-de-prueba.ts"
const DESCARGA = "/src/services/descargaService.ts"

// Desde la declaración de nivel superior que empieza en `inicio` hasta la siguiente.
const declaracion = (codigo: string, inicio: string): string => {
  const desde = codigo.indexOf(inicio)
  expect(desde, `Precondición: existe ${inicio}`).toBeGreaterThanOrEqual(0)
  const siguiente = codigo.slice(desde + 1).search(/\n(export )?(const|function|type|interface) /)
  return siguiente < 0 ? codigo.slice(desde) : codigo.slice(desde, desde + 1 + siguiente)
}

// La lista única de §D-5.2 (Enmienda 1, M-01).
const LISTA_UNICA: readonly [string, string, RegExp][] = [
  [`${MODULO}lib.ts`, "export const filasDeLaHojaDeExportacion =", /\bemail\b/],
  [`${MODULO}lib.ts`, "export const mismoAlumnoDeExportacion =", /\bemail\b/],
  [`${MODULO}data.ts`, "export const TEXTOS_EXPORTACION =", /"Correo"/],
]

// Los cinco literales fijos de §D-5.1, tal cual.
const LITERALES = [
  '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>',
  '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>',
  '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="${nombre}" sheetId="1" r:id="rId1"/></sheets></workbook>',
  '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>',
  '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Calibri"/><family val="2"/></font><font><b/><sz val="11"/><name val="Calibri"/><family val="2"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>',
]

describe("estática de 02b (CAL2-B15)", () => {
  it("CAL2-B15: exportar-a-excel.tsx usa outline, enEspera y no disabled, y sus textos vienen de data.ts", () => {
    const boton = sinComentarios(fuente(BOTON))
    expect(boton).toMatch(/variant="outline"/)
    expect(boton).toMatch(/enEspera=\{/)
    expect(boton).not.toMatch(/\bdisabled\b/)
    expect(boton).toMatch(/TEXTOS_EXPORTACION\.boton/)
    expect(boton).not.toMatch(/>[^<>{}()=;]*[A-Za-zÁÉÍÓÚÑáéíóúñ]{2,}[^<>{}()=;]*<\//)
  })

  it("CAL2-B15: toast y sonner solo en el botón dentro del módulo; hooks.ts no tiene onError", () => {
    const conAvisos = Object.entries(fuentes)
      .filter(([ruta]) => ruta.startsWith(MODULO) && !esPrueba(ruta))
      .filter(([, texto]) => /\btoast\b|sonner/.test(sinComentarios(texto)))
      .map(([ruta]) => ruta)
    expect(conAvisos).toContain(BOTON)
    expect(conAvisos).not.toContain(`${MODULO}gradebook-view.tsx`)
    expect(conAvisos).not.toContain(`${MODULO}hooks.ts`)
    expect(sinComentarios(fuente(`${MODULO}hooks.ts`))).not.toMatch(/onError/)
  })

  it("CAL2-B15: lib/xlsx.ts no importa nada; descargaService no importa de features/ ni tiene target; nadie en producción importa el lector de prueba", () => {
    expect(fuente(XLSX)).not.toMatch(/^\s*import\b/m)
    expect(fuente(XLSX)).not.toMatch(/from\s+["']/)
    const descarga = fuente(DESCARGA)
    expect(descarga).not.toMatch(/from\s+["'](@\/features\/|(\.\.\/)+features\/)/)
    expect(descarga).not.toMatch(/\btarget\b/)
    const importanElLector = Object.entries(fuentes)
      .filter(([ruta]) => !esPrueba(ruta) && ruta !== LECTOR)
      .filter(([, texto]) => texto.includes("lector-xlsx-de-prueba"))
      .map(([ruta]) => ruta)
    expect(importanElLector).toEqual([])
  })

  it("CAL2-B15: en el módulo, la dirección de los alumnos solo en la lista única de §D-5.2, y las tres la nombran", () => {
    const archivos = Object.entries(fuentes).filter(
      ([ruta]) => ruta.startsWith(MODULO) && !esPrueba(ruta),
    )
    expect(archivos.length).toBe(12)
    const fallas = archivos.flatMap(([ruta, texto]) => {
      const codigo = LISTA_UNICA.filter(([archivo]) => archivo === ruta).reduce(
        (resto, [, inicio, nombra]) => {
          const cuerpo = declaracion(resto, inicio)
          expect(cuerpo, `Precondición: ${inicio} la nombra`).toMatch(nombra)
          return resto.replace(cuerpo, "")
        },
        sinComentarios(texto),
      )
      return /\bcorreo\b|\bemail\b/i.test(codigo) ? [ruta] : []
    })
    expect(fallas).toEqual([])
  })

  it("CAL2-B15: lib/xlsx.ts contiene los cinco literales fijos de §D-5.1 tal cual", () => {
    const xlsx = fuente(XLSX)
    for (const literal of LITERALES) expect(xlsx).toContain(literal)
    expect(xlsx).toContain(`'<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\\n'`)
  })

  it("CAL2-B15: ningún comentario de lo nuevo o lo cambiado en 02b tiene las palabras de §D-0.6", () => {
    const prohibidas = [
      "vidrio",
      "data-material",
      "disabled",
      "?? []",
      "console.",
      "perspectivaDeRuta(",
      "correo",
      "estadoPago",
      '"Sin tema"',
      '"Sin categoría"',
      "fixed",
      "fetch(",
      "_blank",
    ]
    const archivos = [
      `${MODULO}types.ts`,
      `${MODULO}data.ts`,
      `${MODULO}lib.ts`,
      `${MODULO}hooks.ts`,
      `${MODULO}gradebook-view.tsx`,
      BOTON,
      XLSX,
      LECTOR,
      DESCARGA,
    ]
    const violaciones = archivos.flatMap((ruta) =>
      soloComentarios(fuente(ruta)).flatMap((comentario) =>
        prohibidas.filter((p) => comentario.includes(p)).map((p) => `${ruta}: ${p}`),
      ),
    )
    expect(violaciones).toEqual([])
    for (const ruta of [XLSX, LECTOR, DESCARGA]) {
      expect(fuente(ruta), ruta).not.toMatch(/fetch\(|_blank|-\[/)
    }
  })
})
