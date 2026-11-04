import { crc32DeBytes } from "./xlsx"

// CALIFICACIONES-02b (§D-5.1). Solo lo importan pruebas, como la tabla común de errores de
// lib/: lee el ZIP sin compresión que arma lib/xlsx.ts (por el fin de directorio, el directorio central y
// cada cabecera local, comprobando el CRC de cada entrada) y las celdas de su hoja con DOMParser.
// Lanza ante cualquier forma que no sea la esperada.

export interface EntradaDelZip {
  nombre: string
  contenido: string
}

export interface CeldaLeida {
  tipo: "texto" | "numero"
  valor: string
  negrita: boolean
}

const FIRMA_LOCAL = 0x04034b50
const FIRMA_CENTRAL = 0x02014b50
const FIRMA_FIN = 0x06054b50
const LARGO_DEL_FIN = 22

export const leerZip = (bytes: Uint8Array): EntradaDelZip[] => {
  const vista = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const fin = bytes.length - LARGO_DEL_FIN
  if (fin < 0 || vista.getUint32(fin, true) !== FIRMA_FIN) {
    throw new Error("El ZIP no termina con el fin de directorio")
  }
  const entradas = vista.getUint16(fin + 10, true)
  const decodificador = new TextDecoder("utf-8", { fatal: true })
  const leidas: EntradaDelZip[] = []
  let pos = vista.getUint32(fin + 16, true)
  for (let i = 0; i < entradas; i += 1) {
    if (vista.getUint32(pos, true) !== FIRMA_CENTRAL) {
      throw new Error("Una cabecera del directorio central no tiene su firma")
    }
    const crc = vista.getUint32(pos + 16, true)
    const tamano = vista.getUint32(pos + 24, true)
    const largoDelNombre = vista.getUint16(pos + 28, true)
    const largoDelResto = vista.getUint16(pos + 30, true) + vista.getUint16(pos + 32, true)
    const local = vista.getUint32(pos + 42, true)
    const nombre = decodificador.decode(bytes.subarray(pos + 46, pos + 46 + largoDelNombre))
    if (vista.getUint32(local, true) !== FIRMA_LOCAL) {
      throw new Error(`La cabecera local de ${nombre} no tiene su firma`)
    }
    if (vista.getUint16(local + 8, true) !== 0) {
      throw new Error(`${nombre} está comprimido`)
    }
    const inicio =
      local + 30 + vista.getUint16(local + 26, true) + vista.getUint16(local + 28, true)
    const datos = bytes.subarray(inicio, inicio + tamano)
    if (crc32DeBytes(datos) !== crc || vista.getUint32(local + 14, true) !== crc) {
      throw new Error(`El CRC de ${nombre} no cuadra`)
    }
    leidas.push({ nombre, contenido: decodificador.decode(datos) })
    pos += 46 + largoDelNombre + largoDelResto
  }
  return leidas
}

export const celdasDeLaHoja = (bytes: Uint8Array): Map<string, CeldaLeida> => {
  const hoja = leerZip(bytes).find((entrada) => entrada.nombre === "xl/worksheets/sheet1.xml")
  if (hoja === undefined) throw new Error("El libro no tiene la hoja sheet1.xml")
  const documento = new DOMParser().parseFromString(hoja.contenido, "application/xml")
  if (documento.getElementsByTagName("parsererror").length > 0) {
    throw new Error("La hoja no es XML bien formado")
  }
  const celdas = new Map<string, CeldaLeida>()
  for (const c of Array.from(documento.getElementsByTagName("c"))) {
    const ref = c.getAttribute("r")
    if (ref === null) throw new Error("Una celda no tiene referencia")
    const negrita = c.getAttribute("s") === "1"
    if (c.getAttribute("t") === "inlineStr") {
      const texto = c.getElementsByTagName("t")[0]
      if (texto === undefined) throw new Error(`La celda ${ref} no tiene texto`)
      celdas.set(ref, { tipo: "texto", valor: texto.textContent, negrita })
      continue
    }
    const valor = c.getElementsByTagName("v")[0]
    if (valor === undefined) throw new Error(`La celda ${ref} no tiene valor`)
    celdas.set(ref, { tipo: "numero", valor: valor.textContent, negrita })
  }
  return celdas
}
