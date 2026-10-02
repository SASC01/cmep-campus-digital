import type { Almacen } from "../src/core/archivos/almacen.js"

// Doble en memoria del almacén (CLASES-d, §D-D2). Ninguna prueba toca MinIO, R2 ni la red: el doble
// guarda los "objetos" que la prueba declara subidos y registra las URL que se habrían firmado.
export interface ObjetoEnMemoria {
  tamano: number
  tipo: string
}

export interface DescargaFirmada {
  clave: string
  tipo: string
  disposicion: string
}

export interface AlmacenEnMemoria extends Almacen {
  readonly objetos: Map<string, ObjetoEnMemoria>
  readonly subidasFirmadas: { clave: string; tipo: string }[]
  readonly descargasFirmadas: DescargaFirmada[]
  // Simula que el navegador ya subió el objeto con la URL prefirmada.
  subir(clave: string, objeto: ObjetoEnMemoria): void
}

const ORIGEN = "https://almacen-en-memoria.test"

export const crearAlmacenEnMemoria = (): AlmacenEnMemoria => {
  const objetos = new Map<string, ObjetoEnMemoria>()
  const subidasFirmadas: { clave: string; tipo: string }[] = []
  const descargasFirmadas: DescargaFirmada[] = []

  return {
    objetos,
    subidasFirmadas,
    descargasFirmadas,
    subir: (clave, objeto) => {
      objetos.set(clave, objeto)
    },
    urlDeSubida: ({ clave, tipo }) => {
      subidasFirmadas.push({ clave, tipo })
      return Promise.resolve(`${ORIGEN}/subida/${clave}?expira=300`)
    },
    urlDeDescarga: ({ clave, tipo, disposicion }) => {
      descargasFirmadas.push({ clave, tipo, disposicion })
      return Promise.resolve(`${ORIGEN}/descarga/${clave}?expira=300`)
    },
    metadatosDe: (clave) => Promise.resolve(objetos.get(clave) ?? null),
  }
}
