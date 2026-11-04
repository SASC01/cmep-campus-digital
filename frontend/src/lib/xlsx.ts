// CALIFICACIONES-02b (§D-5.1, DH-01 a). Un escritor de .xlsx de una sola hoja, sin dependencias:
// texto en línea, números, negrita, anchos y paneles inmovilizados. El paquete es un ZIP sin
// compresión (método 0) con seis partes XML fijas en su forma literal; la salida es determinista
// (fecha y hora fijas). El texto nunca se escribe como fórmula y los caracteres que XML 1.0 no admite
// se quitan. Genérico y puro: no conoce las calificaciones.

export const TIPO_MIME_XLSX = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"

export type CeldaXlsx =
  | { tipo: "texto"; valor: string; negrita?: boolean }
  | { tipo: "numero"; valor: number; negrita?: boolean }
  | { tipo: "vacia" }

export interface HojaXlsx {
  // De 1 a 31 caracteres, sin [ ] : * ? / \
  nombre: string
  filas: readonly (readonly CeldaXlsx[])[]
  // Por columna, en caracteres.
  anchos: readonly number[]
  inmovilizar: { filas: number; columnas: number }
}

// El tope de una celda de Excel, en unidades UTF-16.
const LARGO_MAXIMO_DEL_TEXTO = 32767
const LARGO_MAXIMO_DEL_NOMBRE = 31

// Los topes de una hoja de Excel y de LibreOffice: la última columna es XFD y la última fila, la
// 1,048,576. Una referencia fuera de la hoja hace que el archivo no abra o pida repararlo.
export const MAXIMO_DE_COLUMNAS_XLSX = 16_384
export const MAXIMO_DE_FILAS_XLSX = 1_048_576

const DECLARACION = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n'

const CONTENT_TYPES =
  DECLARACION +
  '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>'

const RELS =
  DECLARACION +
  '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>'

const workbookDe = (nombre: string): string =>
  DECLARACION +
  `<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="${nombre}" sheetId="1" r:id="rId1"/></sheets></workbook>`

const WORKBOOK_RELS =
  DECLARACION +
  '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>'

const STYLES =
  DECLARACION +
  '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Calibri"/><family val="2"/></font><font><b/><sz val="11"/><name val="Calibri"/><family val="2"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>'

const INICIO_DE_LA_HOJA =
  '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'

// Lo que XML 1.0 no admite: los controles salvo el tabulador, el salto de línea y el retorno de
// carro, U+FFFE, U+FFFF y los sustitutos sueltos (un par completo llega como un solo punto de código).
const esPuntoDeCodigoInvalido = (punto: number): boolean => {
  if (punto === 0x09 || punto === 0x0a || punto === 0x0d) return false
  if (punto <= 0x1f) return true
  if (punto === 0xfffe || punto === 0xffff) return true
  return punto >= 0xd800 && punto <= 0xdfff
}

const sinCaracteresInvalidos = (texto: string): string => {
  let limpio = ""
  for (const caracter of texto) {
    const punto = caracter.codePointAt(0)
    if (punto === undefined || esPuntoDeCodigoInvalido(punto)) continue
    limpio += caracter
  }
  return limpio
}

// El escape de OOXML: un "_" seguido de la forma _xHHHH_ se escribe _x005F_, para que Excel lo
// muestre tal cual en lugar de leerlo como un carácter codificado.
const ESCAPE_OOXML = /_(?=x[0-9A-Fa-f]{4}_)/g

const ENTIDADES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&apos;",
}

const escaparXml = (texto: string): string =>
  // La expresión solo encuentra las cinco llaves de ENTIDADES: el respaldo nunca se usa.
  texto.replace(ESCAPE_OOXML, "_x005F_").replace(/[&<>"']/g, (c) => ENTIDADES[c] ?? c)

const NOMBRE_DE_HOJA_INVALIDO = /[[\]:*?/\\]/

const validarNombre = (nombre: string): string => {
  if (nombre.length === 0 || nombre.length > LARGO_MAXIMO_DEL_NOMBRE) {
    throw new Error("El nombre de la hoja debe tener de 1 a 31 caracteres")
  }
  if (NOMBRE_DE_HOJA_INVALIDO.test(nombre)) {
    throw new Error("El nombre de la hoja tiene un carácter que Excel no admite")
  }
  const limpio = sinCaracteresInvalidos(nombre)
  if (limpio.length === 0) throw new Error("El nombre de la hoja quedó vacío")
  return limpio
}

const numeroValido = (n: number): string => {
  if (!Number.isFinite(n)) throw new Error("Un número de la hoja no es finito")
  return String(n)
}

// 1 → A, 26 → Z, 27 → AA, 703 → AAA.
const letrasDeColumna = (columna: number): string => {
  let letras = ""
  let resto = columna
  while (resto > 0) {
    const indice = (resto - 1) % 26
    letras = String.fromCharCode(65 + indice) + letras
    resto = Math.floor((resto - 1) / 26)
  }
  return letras
}

const referencia = (columna: number, fila: number): string =>
  `${letrasDeColumna(columna)}${String(fila)}`

const celdaXml = (celda: CeldaXlsx, ref: string): string => {
  if (celda.tipo === "vacia") return ""
  const estilo = celda.negrita === true ? ' s="1"' : ""
  if (celda.tipo === "numero") {
    return `<c r="${ref}"${estilo}><v>${numeroValido(celda.valor)}</v></c>`
  }
  const limpio = sinCaracteresInvalidos(celda.valor)
  if (limpio.length > LARGO_MAXIMO_DEL_TEXTO) {
    throw new Error("Un texto de la hoja pasa del tope de una celda de Excel")
  }
  if (limpio.length === 0) return ""
  return `<c r="${ref}"${estilo} t="inlineStr"><is><t xml:space="preserve">${escaparXml(limpio)}</t></is></c>`
}

const filasXml = (filas: HojaXlsx["filas"]): string =>
  filas
    .map((fila, i) => {
      const celdas = fila.map((celda, j) => celdaXml(celda, referencia(j + 1, i + 1))).join("")
      if (celdas.length === 0) return ""
      return `<row r="${String(i + 1)}">${celdas}</row>`
    })
    .join("")

const columnasXml = (anchos: HojaXlsx["anchos"]): string => {
  if (anchos.length === 0) return ""
  const columnas = anchos
    .map((ancho, i) => {
      const n = String(i + 1)
      return `<col min="${n}" max="${n}" width="${numeroValido(ancho)}" customWidth="1"/>`
    })
    .join("")
  return `<cols>${columnas}</cols>`
}

const hojaXml = (hoja: HojaXlsx): string => {
  const { filas, columnas } = hoja.inmovilizar
  if (!Number.isInteger(filas) || !Number.isInteger(columnas) || filas < 1 || columnas < 1) {
    throw new Error("La hoja inmoviliza al menos una fila y una columna")
  }
  const esquina = referencia(columnas + 1, filas + 1)
  const vista = `<sheetViews><sheetView workbookViewId="0"><pane xSplit="${String(columnas)}" ySplit="${String(filas)}" topLeftCell="${esquina}" activePane="bottomRight" state="frozen"/><selection pane="bottomRight" activeCell="${esquina}" sqref="${esquina}"/></sheetView></sheetViews>`
  return (
    DECLARACION +
    INICIO_DE_LA_HOJA +
    vista +
    columnasXml(hoja.anchos) +
    `<sheetData>${filasXml(hoja.filas)}</sheetData></worksheet>`
  )
}

// CRC-32 IEEE (polinomio 0xEDB88320), con la tabla calculada una sola vez.
let tablaCrc: Uint32Array | null = null

const tablaDelCrc = (): Uint32Array => {
  if (tablaCrc !== null) return tablaCrc
  const tabla = new Uint32Array(256)
  for (let n = 0; n < 256; n += 1) {
    let c = n
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    tabla[n] = c >>> 0
  }
  tablaCrc = tabla
  return tabla
}

export const crc32DeBytes = (bytes: Uint8Array): number => {
  const tabla = tablaDelCrc()
  let crc = 0xffffffff
  // El índice va de 0 a 255 por la máscara y la tabla tiene 256 entradas: el respaldo nunca se usa.
  for (const byte of bytes) crc = (tabla[(crc ^ byte) & 0xff] ?? 0) ^ (crc >>> 8)
  return (crc ^ 0xffffffff) >>> 0
}

// El 1980-01-01 a las 00:00 en formato DOS: la salida no depende del reloj.
const HORA_DOS = 0x0000
const FECHA_DOS = 0x0021
const VERSION_ZIP = 20

interface ParteDelZip {
  nombre: Uint8Array
  datos: Uint8Array
  crc: number
}

const empaquetar = (partes: readonly ParteDelZip[]): Uint8Array => {
  const largoLocal = partes.reduce((suma, p) => suma + 30 + p.nombre.length + p.datos.length, 0)
  const largoCentral = partes.reduce((suma, p) => suma + 46 + p.nombre.length, 0)
  const salida = new Uint8Array(largoLocal + largoCentral + 22)
  const vista = new DataView(salida.buffer)
  const desplazamientos: number[] = []
  let pos = 0

  for (const parte of partes) {
    desplazamientos.push(pos)
    vista.setUint32(pos, 0x04034b50, true)
    vista.setUint16(pos + 4, VERSION_ZIP, true)
    vista.setUint16(pos + 6, 0, true)
    vista.setUint16(pos + 8, 0, true)
    vista.setUint16(pos + 10, HORA_DOS, true)
    vista.setUint16(pos + 12, FECHA_DOS, true)
    vista.setUint32(pos + 14, parte.crc, true)
    vista.setUint32(pos + 18, parte.datos.length, true)
    vista.setUint32(pos + 22, parte.datos.length, true)
    vista.setUint16(pos + 26, parte.nombre.length, true)
    vista.setUint16(pos + 28, 0, true)
    salida.set(parte.nombre, pos + 30)
    salida.set(parte.datos, pos + 30 + parte.nombre.length)
    pos += 30 + parte.nombre.length + parte.datos.length
  }

  const inicioCentral = pos
  for (const [i, parte] of partes.entries()) {
    vista.setUint32(pos, 0x02014b50, true)
    vista.setUint16(pos + 4, VERSION_ZIP, true)
    vista.setUint16(pos + 6, VERSION_ZIP, true)
    vista.setUint16(pos + 8, 0, true)
    vista.setUint16(pos + 10, 0, true)
    vista.setUint16(pos + 12, HORA_DOS, true)
    vista.setUint16(pos + 14, FECHA_DOS, true)
    vista.setUint32(pos + 16, parte.crc, true)
    vista.setUint32(pos + 20, parte.datos.length, true)
    vista.setUint32(pos + 24, parte.datos.length, true)
    vista.setUint16(pos + 28, parte.nombre.length, true)
    vista.setUint16(pos + 30, 0, true)
    vista.setUint16(pos + 32, 0, true)
    vista.setUint16(pos + 34, 0, true)
    vista.setUint16(pos + 36, 0, true)
    vista.setUint32(pos + 38, 0, true)
    // El primer ciclo guardó un desplazamiento por parte: el respaldo nunca se usa.
    vista.setUint32(pos + 42, desplazamientos[i] ?? 0, true)
    salida.set(parte.nombre, pos + 46)
    pos += 46 + parte.nombre.length
  }

  vista.setUint32(pos, 0x06054b50, true)
  vista.setUint16(pos + 4, 0, true)
  vista.setUint16(pos + 6, 0, true)
  vista.setUint16(pos + 8, partes.length, true)
  vista.setUint16(pos + 10, partes.length, true)
  vista.setUint32(pos + 12, pos - inicioCentral, true)
  vista.setUint32(pos + 16, inicioCentral, true)
  vista.setUint16(pos + 20, 0, true)
  return salida
}

// Antes de armar nada: la hoja cabe en los topes de filas y columnas.
const validarTamano = (hoja: HojaXlsx): void => {
  if (hoja.filas.length > MAXIMO_DE_FILAS_XLSX) {
    throw new Error("La hoja pasa del tope de filas de Excel")
  }
  if (hoja.anchos.length > MAXIMO_DE_COLUMNAS_XLSX) {
    throw new Error("La hoja tiene más anchos que columnas en Excel")
  }
  if (hoja.filas.some((fila) => fila.length > MAXIMO_DE_COLUMNAS_XLSX)) {
    throw new Error("Una fila pasa del tope de columnas de Excel")
  }
}

export const armarLibroXlsx = (hoja: HojaXlsx): Uint8Array => {
  validarTamano(hoja)
  const nombre = escaparXml(validarNombre(hoja.nombre))
  const codificador = new TextEncoder()
  const contenidos: [string, string][] = [
    ["[Content_Types].xml", CONTENT_TYPES],
    ["_rels/.rels", RELS],
    ["xl/workbook.xml", workbookDe(nombre)],
    ["xl/_rels/workbook.xml.rels", WORKBOOK_RELS],
    ["xl/styles.xml", STYLES],
    ["xl/worksheets/sheet1.xml", hojaXml(hoja)],
  ]
  return empaquetar(
    contenidos.map(([ruta, texto]) => {
      const datos = codificador.encode(texto)
      return { nombre: codificador.encode(ruta), datos, crc: crc32DeBytes(datos) }
    }),
  )
}
