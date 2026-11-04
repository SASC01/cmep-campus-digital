/// <reference types="node" />
import { crc32 } from "node:zlib"

import { describe, expect, it } from "vitest"

import {
  armarLibroXlsx,
  crc32DeBytes,
  MAXIMO_DE_COLUMNAS_XLSX,
  MAXIMO_DE_FILAS_XLSX,
  TIPO_MIME_XLSX,
  type CeldaXlsx,
  type HojaXlsx,
} from "./xlsx"

// CALIFICACIONES-02b (CAL2-B01 a CAL2-B03). El escritor del .xlsx contra los literales de §D-5.1,
// byte a byte, sin el lector de prueba: el archivo esperado se arma aquí con los textos copiados del
// plan y el CRC de node:zlib, una implementación independiente de la del escritor.

const DECLARACION = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n'

const CONTENT_TYPES =
  DECLARACION +
  '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>'

const RELS =
  DECLARACION +
  '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>'

const WORKBOOK =
  DECLARACION +
  '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Calificaciones" sheetId="1" r:id="rId1"/></sheets></workbook>'

const WORKBOOK_RELS =
  DECLARACION +
  '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>'

const STYLES =
  DECLARACION +
  '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Calibri"/><family val="2"/></font><font><b/><sz val="11"/><name val="Calibri"/><family val="2"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>'

const INICIO_DE_LA_HOJA =
  DECLARACION +
  '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'

const vistaDe = (columnas: number, filas: number, esquina: string): string =>
  `<sheetViews><sheetView workbookViewId="0"><pane xSplit="${String(columnas)}" ySplit="${String(filas)}" topLeftCell="${esquina}" activePane="bottomRight" state="frozen"/><selection pane="bottomRight" activeCell="${esquina}" sqref="${esquina}"/></sheetView></sheetViews>`

// El sheet1.xml completo de una hoja inmovilizada en 1 × 1 (esquina B2), sin anchos.
const hojaUnoPorUno = (sheetData: string): string =>
  `${INICIO_DE_LA_HOJA}${vistaDe(1, 1, "B2")}<sheetData>${sheetData}</sheetData></worksheet>`

const codificar = (texto: string): Uint8Array => new TextEncoder().encode(texto)

// El ZIP esperado según "Contenedor ZIP" de §D-5.1, con el CRC de node:zlib.
const zipEsperado = (partes: readonly [string, string][]): Uint8Array => {
  const entradas = partes.map(([nombre, texto]) => {
    const datos = codificar(texto)
    return { nombre: codificar(nombre), datos, crc: crc32(datos) }
  })
  const trozos: number[] = []
  const u16 = (n: number) => trozos.push(n & 0xff, (n >>> 8) & 0xff)
  const u32 = (n: number) =>
    trozos.push(n & 0xff, (n >>> 8) & 0xff, (n >>> 16) & 0xff, (n >>> 24) & 0xff)
  const bytes = (b: Uint8Array) => trozos.push(...b)
  const desplazamientos: number[] = []
  for (const e of entradas) {
    desplazamientos.push(trozos.length)
    u32(0x04034b50)
    u16(20)
    u16(0)
    u16(0)
    u16(0x0000)
    u16(0x0021)
    u32(e.crc)
    u32(e.datos.length)
    u32(e.datos.length)
    u16(e.nombre.length)
    u16(0)
    bytes(e.nombre)
    bytes(e.datos)
  }
  const inicioCentral = trozos.length
  for (const [i, e] of entradas.entries()) {
    u32(0x02014b50)
    u16(20)
    u16(20)
    u16(0)
    u16(0)
    u16(0)
    u16(0x0021)
    u32(e.crc)
    u32(e.datos.length)
    u32(e.datos.length)
    u16(e.nombre.length)
    u16(0)
    u16(0)
    u16(0)
    u16(0)
    u32(0)
    u32(desplazamientos[i] ?? -1)
    bytes(e.nombre)
  }
  const largoCentral = trozos.length - inicioCentral
  u32(0x06054b50)
  u16(0)
  u16(0)
  u16(entradas.length)
  u16(entradas.length)
  u32(largoCentral)
  u32(inicioCentral)
  u16(0)
  return Uint8Array.from(trozos)
}

// Recorre las cabeceras locales en orden (los valores de §D-5.1) y devuelve el texto de una parte.
const parteDe = (zip: Uint8Array, nombre: string): string => {
  const vista = new DataView(zip.buffer, zip.byteOffset, zip.byteLength)
  const decodificador = new TextDecoder()
  let pos = 0
  while (vista.getUint32(pos, true) === 0x04034b50) {
    const tamano = vista.getUint32(pos + 18, true)
    const largoNombre = vista.getUint16(pos + 26, true)
    const actual = decodificador.decode(zip.subarray(pos + 30, pos + 30 + largoNombre))
    const inicio = pos + 30 + largoNombre
    if (actual === nombre) return decodificador.decode(zip.subarray(inicio, inicio + tamano))
    pos = inicio + tamano
  }
  throw new Error(`El ZIP no tiene la parte ${nombre}`)
}

const hojaDeUnaFila = (fila: readonly CeldaXlsx[]): HojaXlsx => ({
  nombre: "Calificaciones",
  filas: [fila],
  anchos: [],
  inmovilizar: { filas: 1, columnas: 1 },
})

const sheetDe = (hoja: HojaXlsx): string =>
  parteDe(armarLibroXlsx(hoja), "xl/worksheets/sheet1.xml")

const texto = (valor: string, negrita?: boolean): CeldaXlsx =>
  negrita === undefined ? { tipo: "texto", valor } : { tipo: "texto", valor, negrita }
const numero = (valor: number, negrita?: boolean): CeldaXlsx =>
  negrita === undefined ? { tipo: "numero", valor } : { tipo: "numero", valor, negrita }

const celdaDeTexto = (ref: string, contenido: string): string =>
  `<c r="${ref}" t="inlineStr"><is><t xml:space="preserve">${contenido}</t></is></c>`

describe("estructura del libro, byte a byte (CAL2-B01)", () => {
  const hoja: HojaXlsx = {
    nombre: "Calificaciones",
    filas: [
      [texto("Alumno", true), texto("Promedio (%)", true), { tipo: "vacia" }],
      [texto("Ana"), numero(82.4)],
    ],
    anchos: [32, 14],
    inmovilizar: { filas: 3, columnas: 2 },
  }
  const SHEET1 =
    INICIO_DE_LA_HOJA +
    vistaDe(2, 3, "C4") +
    '<cols><col min="1" max="1" width="32" customWidth="1"/><col min="2" max="2" width="14" customWidth="1"/></cols>' +
    '<sheetData><row r="1"><c r="A1" s="1" t="inlineStr"><is><t xml:space="preserve">Alumno</t></is></c><c r="B1" s="1" t="inlineStr"><is><t xml:space="preserve">Promedio (%)</t></is></c></row><row r="2"><c r="A2" t="inlineStr"><is><t xml:space="preserve">Ana</t></is></c><c r="B2"><v>82.4</v></c></row></sheetData></worksheet>'
  const PARTES: [string, string][] = [
    ["[Content_Types].xml", CONTENT_TYPES],
    ["_rels/.rels", RELS],
    ["xl/workbook.xml", WORKBOOK],
    ["xl/_rels/workbook.xml.rels", WORKBOOK_RELS],
    ["xl/styles.xml", STYLES],
    ["xl/worksheets/sheet1.xml", SHEET1],
  ]

  it("CAL2-B01: la salida de armarLibroXlsx es igual, byte a byte, al ZIP armado con los seis literales de §D-5.1 y los valores literales del contenedor", () => {
    expect(TIPO_MIME_XLSX).toBe("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
    const salida = armarLibroXlsx(hoja)
    expect(salida).toEqual(zipEsperado(PARTES))
  })

  it("CAL2-B01: el CRC del escritor da 0xCBF43926 para «123456789» y coincide con crc32 de node:zlib sobre cada parte", () => {
    expect(crc32DeBytes(codificar("123456789"))).toBe(0xcbf43926)
    expect(crc32DeBytes(new Uint8Array())).toBe(0)
    for (const [nombre, contenido] of PARTES) {
      const datos = codificar(contenido)
      expect(crc32DeBytes(datos), nombre).toBe(crc32(datos))
    }
  })

  it("CAL2-B01: dos llamadas con la misma hoja dan los mismos bytes y cada parte es XML bien formado para DOMParser", () => {
    expect(armarLibroXlsx(hoja)).toEqual(armarLibroXlsx(hoja))
    const salida = armarLibroXlsx(hoja)
    for (const [nombre] of PARTES) {
      const documento = new DOMParser().parseFromString(parteDe(salida, nombre), "application/xml")
      expect(documento.getElementsByTagName("parsererror"), nombre).toHaveLength(0)
    }
  })
})

describe("texto de las celdas (CAL2-B02)", () => {
  it('CAL2-B02: & < > " \' se escapan, ]]>, saltos, tabuladores, retornos, espacios en los extremos, acentos, ñ y un emoji se conservan con xml:space="preserve"', () => {
    const casos: [string, string][] = [
      [`& < > " '`, "&amp; &lt; &gt; &quot; &apos;"],
      ["]]>", "]]&gt;"],
      ["uno\ndos", "uno\ndos"],
      ["uno\tdos", "uno\tdos"],
      ["uno\rdos", "uno\rdos"],
      ["  con espacios  ", "  con espacios  "],
      ["Matemáticas Ñandú ü", "Matemáticas Ñandú ü"],
      ["Bien \u{1F600}", "Bien \u{1F600}"],
    ]
    for (const [entrada, escrito] of casos) {
      expect(sheetDe(hojaDeUnaFila([texto(entrada)])), entrada).toBe(
        hojaUnoPorUno(`<row r="1">${celdaDeTexto("A1", escrito)}</row>`),
      )
    }
  })

  it("CAL2-B02: U+0000 a U+0008, U+000B, U+000C, U+000E a U+001F, U+FFFE, U+FFFF y los sustitutos sueltos desaparecen; un texto que queda vacío no se escribe", () => {
    const invalidos = [
      ...Array.from({ length: 9 }, (_, i) => i),
      0x0b,
      0x0c,
      ...Array.from({ length: 18 }, (_, i) => 0x0e + i),
      0xfffe,
      0xffff,
    ].map((punto) => String.fromCharCode(punto))
    const sueltos = ["\uD83D", "\uDE00"]
    const sucio = `a${invalidos.join("")}b${sueltos.join("x")}c`
    expect(sheetDe(hojaDeUnaFila([texto(sucio)]))).toBe(
      hojaUnoPorUno(`<row r="1">${celdaDeTexto("A1", "abxc")}</row>`),
    )
    // Solo caracteres inválidos: la celda no se escribe y la fila tampoco.
    expect(sheetDe(hojaDeUnaFila([texto(invalidos.join("") + sueltos[0]), texto("")]))).toBe(
      hojaUnoPorUno(""),
    )
  })

  it("CAL2-B02: el escape de OOXML: Tarea_x0041_ y _x00e9_ ganan _x005F_; _x41_ y x0041_ quedan igual", () => {
    const casos: [string, string][] = [
      ["Tarea_x0041_", "Tarea_x005F_x0041_"],
      ["_x00e9_", "_x005F_x00e9_"],
      ["_x41_", "_x41_"],
      ["x0041_", "x0041_"],
      ["_X0041_", "_X0041_"],
      ["_x0041__x0042_", "_x005F_x0041__x005F_x0042_"],
    ]
    for (const [entrada, escrito] of casos) {
      expect(sheetDe(hojaDeUnaFila([texto(entrada)])), entrada).toBe(
        hojaUnoPorUno(`<row r="1">${celdaDeTexto("A1", escrito)}</row>`),
      )
    }
  })

  it("CAL2-B02: un texto que empieza con =, +, - o @ es una celda inlineStr sin <f>", () => {
    for (const entrada of ["=SUMA(1;2)", "+1", "-1", "@a", '=HYPERLINK("x")']) {
      const sheet = sheetDe(hojaDeUnaFila([texto(entrada)]))
      expect(sheet, entrada).not.toContain("<f>")
      expect(sheet, entrada).toBe(
        hojaUnoPorUno(`<row r="1">${celdaDeTexto("A1", entrada.replace(/"/g, "&quot;"))}</row>`),
      )
    }
  })

  it("CAL2-B02: el nombre de la hoja lleva el mismo escape en workbook.xml", () => {
    const libro = armarLibroXlsx({ ...hojaDeUnaFila([]), nombre: "A&B_x0041_" })
    expect(parteDe(libro, "xl/workbook.xml")).toBe(
      WORKBOOK.replace('name="Calificaciones"', 'name="A&amp;B_x005F_x0041_"'),
    )
  })
})

describe("números y forma de la hoja (CAL2-B03)", () => {
  it("CAL2-B03: 0, -0, 10, 8.5, 7.78, 1000 y 82.4 se escriben con punto decimal; NaN, Infinity y -Infinity lanzan", () => {
    const casos: [number, string][] = [
      [0, "0"],
      [-0, "0"],
      [10, "10"],
      [8.5, "8.5"],
      [7.78, "7.78"],
      [1000, "1000"],
      [82.4, "82.4"],
    ]
    for (const [valor, escrito] of casos) {
      expect(sheetDe(hojaDeUnaFila([numero(valor)])), String(valor)).toBe(
        hojaUnoPorUno(`<row r="1"><c r="A1"><v>${escrito}</v></c></row>`),
      )
    }
    for (const malo of [Number.NaN, Infinity, -Infinity]) {
      expect(() => armarLibroXlsx(hojaDeUnaFila([numero(malo)])), String(malo)).toThrow(Error)
    }
  })

  it("CAL2-B03: un texto de 32,768 unidades lanza y uno de 32,767 no", () => {
    expect(() => armarLibroXlsx(hojaDeUnaFila([texto("a".repeat(32768))]))).toThrow(Error)
    expect(sheetDe(hojaDeUnaFila([texto("a".repeat(32767))]))).toContain("a".repeat(32767))
  })

  it("CAL2-B03: un nombre de hoja vacío, de 32 caracteres o con [ ] : * ? / \\ lanza; uno de 31 no", () => {
    for (const nombre of ["", "a".repeat(32), ..."[]:*?/\\".split("").map((c) => `Hoja${c}`)]) {
      expect(() => armarLibroXlsx({ ...hojaDeUnaFila([]), nombre }), nombre).toThrow(Error)
    }
    expect(() => armarLibroXlsx({ ...hojaDeUnaFila([]), nombre: "a".repeat(31) })).not.toThrow()
  })

  it("CAL2-B03: inmovilizar con 0 filas o 0 columnas lanza", () => {
    for (const inmovilizar of [
      { filas: 0, columnas: 2 },
      { filas: 3, columnas: 0 },
    ]) {
      expect(() => armarLibroXlsx({ ...hojaDeUnaFila([]), inmovilizar })).toThrow(Error)
    }
  })

  it("CAL2-B03: las columnas 1, 26, 27, 52, 53, 702 y 703 son A, Z, AA, AZ, BA, ZZ y AAA", () => {
    const fila: CeldaXlsx[] = Array.from({ length: 703 }, () => ({ tipo: "vacia" }))
    for (const columna of [1, 26, 27, 52, 53, 702, 703]) fila[columna - 1] = numero(columna)
    const sheet = sheetDe(hojaDeUnaFila(fila))
    const refs = [...sheet.matchAll(/<c r="([A-Z]+)1"/g)].map((m) => m[1])
    expect(refs).toEqual(["A", "Z", "AA", "AZ", "BA", "ZZ", "AAA"])
  })

  it('CAL2-B03: una fila sin celdas escritas no tiene <row> y la siguiente conserva su número; la negrita usa s="1" en el orden r, s, t', () => {
    const sheet = sheetDe({
      ...hojaDeUnaFila([]),
      filas: [[texto("uno", true)], [{ tipo: "vacia" }, texto("")], [numero(5, true), texto("x")]],
    })
    expect(sheet).toBe(
      hojaUnoPorUno(
        '<row r="1"><c r="A1" s="1" t="inlineStr"><is><t xml:space="preserve">uno</t></is></c></row>' +
          `<row r="3"><c r="A3" s="1"><v>5</v></c>${celdaDeTexto("B3", "x")}</row>`,
      ),
    )
  })

  it("CAL2-B03: con 3 filas y 2 columnas inmovilizadas el pane es el literal y la selección C4; sin anchos no hay <cols>", () => {
    const sheet = sheetDe({ ...hojaDeUnaFila([]), inmovilizar: { filas: 3, columnas: 2 } })
    expect(sheet).toContain(
      '<pane xSplit="2" ySplit="3" topLeftCell="C4" activePane="bottomRight" state="frozen"/>',
    )
    expect(sheet).toContain('<selection pane="bottomRight" activeCell="C4" sqref="C4"/>')
    expect(sheet).not.toContain("<cols>")
    expect(sheet).toBe(
      `${INICIO_DE_LA_HOJA}${vistaDe(2, 3, "C4")}<sheetData></sheetData></worksheet>`,
    )
  })

  it("CAL2-B03: (T-02) 16,384 columnas llegan a XFD sin lanzar; 16,385 columnas o 16,385 anchos lanzan; más de 1,048,576 filas lanzan", () => {
    expect(MAXIMO_DE_COLUMNAS_XLSX).toBe(16_384)
    expect(MAXIMO_DE_FILAS_XLSX).toBe(1_048_576)
    const llena: CeldaXlsx[] = Array.from({ length: 16_384 }, () => numero(1))
    const sheet = sheetDe(hojaDeUnaFila(llena))
    const refs = [...sheet.matchAll(/<c r="([A-Z]+)1"/g)].map((m) => m[1])
    expect(refs).toHaveLength(16_384)
    expect(refs.at(-1)).toBe("XFD")
    expect(() => armarLibroXlsx(hojaDeUnaFila([...llena, numero(1)]))).toThrow(Error)
    expect(() =>
      armarLibroXlsx({ ...hojaDeUnaFila([]), anchos: Array.from({ length: 16_385 }, () => 10) }),
    ).toThrow(Error)
    expect(() =>
      armarLibroXlsx({ ...hojaDeUnaFila([]), anchos: Array.from({ length: 16_384 }, () => 10) }),
    ).not.toThrow()
    const demasiadas: (readonly CeldaXlsx[])[] = new Array<readonly CeldaXlsx[]>(1_048_577).fill([])
    expect(() => armarLibroXlsx({ ...hojaDeUnaFila([]), filas: demasiadas })).toThrow(Error)
  })
})
