import { MAXIMO_CATEGORIAS_POR_CLASE, claveDeNombre, normalizarTextoLargo } from "@campus/shared"

import { AppError } from "../errores.js"

// Puras (§D-3, TAREAS-01a): reglas de las categorías ponderadas. Se guardan en bloque (S-06): el
// adaptador lee las actuales con la fila de la clase bloqueada y aplica el plan que decide esta
// función.

export interface CategoriaNueva {
  id?: string | undefined
  nombre: string
  peso: number
}

export interface CategoriaActual {
  id: string
}

export interface PlanDeCategorias {
  crear: { nombre: string; peso: number }[]
  actualizar: { id: string; nombre: string; peso: number }[]
  quitar: string[]
}

const validacion = (mensaje: string): AppError => new AppError("VALIDACION", mensaje, 400)

// Una lista vacía es válida ("esta clase no tiene categorías"); con al menos una, cada peso es un
// entero de 1 a 100 y suman exactamente 100.
export const validarPesos = (pesos: readonly number[]): void => {
  if (pesos.length === 0) return
  if (pesos.some((peso) => !Number.isInteger(peso) || peso < 1 || peso > 100)) {
    throw validacion("categorias: El peso debe ser un número entero de 1 a 100")
  }
  if (pesos.reduce((total, peso) => total + peso, 0) !== 100) {
    throw validacion("categorias: Los pesos deben sumar 100 %")
  }
}

const hayRepetidos = (valores: readonly string[]): boolean =>
  new Set(valores).size !== valores.length

export const planearReemplazoDeCategorias = (
  actuales: readonly CategoriaActual[],
  nuevas: readonly CategoriaNueva[],
): PlanDeCategorias => {
  if (nuevas.length > MAXIMO_CATEGORIAS_POR_CLASE) {
    throw validacion(
      `categorias: Una clase puede tener hasta ${MAXIMO_CATEGORIAS_POR_CLASE} categorías`,
    )
  }
  const idsRecibidos = nuevas.flatMap(({ id }) => (id === undefined ? [] : [id.toLowerCase()]))
  if (hayRepetidos(idsRecibidos)) throw validacion("categorias: No repitas una categoría")
  if (hayRepetidos(nuevas.map(({ nombre }) => claveDeNombre(nombre)))) {
    throw validacion("categorias: No repitas el nombre de una categoría")
  }
  validarPesos(nuevas.map(({ peso }) => peso))

  const idsActuales = new Map(actuales.map(({ id }) => [id.toLowerCase(), id]))
  const crear: PlanDeCategorias["crear"] = []
  const actualizar: PlanDeCategorias["actualizar"] = []
  for (const { id, nombre, peso } of nuevas) {
    if (id === undefined) {
      crear.push({ nombre, peso })
      continue
    }
    const idActual = idsActuales.get(id.toLowerCase())
    if (idActual === undefined) {
      throw new AppError("CATEGORIA_NO_ENCONTRADA", "Esa categoría ya no existe. Elige otra.", 404)
    }
    actualizar.push({ id: idActual, nombre, peso })
  }
  const conservadas = new Set(idsRecibidos)
  const quitar = actuales.filter(({ id }) => !conservadas.has(id.toLowerCase())).map(({ id }) => id)
  return { crear, actualizar, quitar }
}

// Como conTextosNormalizados (core/clases/texto.ts) para el nombre de cada categoría del cuerpo:
// CRLF y CR pasan a LF y se recorta en los extremos ANTES de validar. Solo toca el `nombre` que sea
// texto; cualquier otra forma se deja intacta para que el esquema la rechace. No muta lo recibido.
export const conNombresDeCategoriaNormalizados = (cuerpo: unknown): unknown => {
  if (typeof cuerpo !== "object" || cuerpo === null || Array.isArray(cuerpo)) return cuerpo
  const objeto = cuerpo as Record<string, unknown>
  const { categorias } = objeto
  if (!Array.isArray(categorias)) return cuerpo
  return {
    ...objeto,
    categorias: categorias.map((categoria: unknown) => {
      if (typeof categoria !== "object" || categoria === null || Array.isArray(categoria)) {
        return categoria
      }
      const entrada = categoria as Record<string, unknown>
      if (typeof entrada.nombre !== "string") return categoria
      return { ...entrada, nombre: normalizarTextoLargo(entrada.nombre) }
    }),
  }
}
