import { AppError } from "../errores.js"

// CALIFICACIONES-01a (§D-2.3). La calificación general de un alumno en una clase (RN-05, P-01 de
// TAREAS-01, P-05 a). La entrada son agregados ya sumados por la consulta (solo entregas calificadas:
// las tareas sin calificar no entran y las entregas con retraso cuentan igual, S-03). Todo se calcula
// con enteros (centésimas, y BigInt para el ponderado) y se redondea una sola vez, al final, con las
// mitades hacia arriba (§D-0.8).

export interface CategoriaDeLaClase {
  id: string
  nombre: string
  peso: number
}

export interface AgregadoPorCategoria {
  // null: tareas "Sin categoría".
  categoriaId: string | null
  // Σ calificacion × 100 de las tareas calificadas.
  obtenidoCentesimas: number
  // Σ puntos de esas tareas.
  posible: number
  tareas: number
}

export interface DesgloseDeCategoria {
  id: string
  nombre: string
  peso: number
  // Su peso repartido entre las categorías con tareas calificadas (2 decimales); null si no tiene.
  pesoEfectivo: number | null
  // obtenido / posible × 100 (2 decimales); null sin tareas calificadas.
  porcentaje: number | null
  obtenido: number
  posible: number
  tareas: number
}

export interface CalificacionGeneral {
  modo: "puntos" | "categorias"
  // 2 decimales; null si nada cuenta.
  porcentaje: number | null
  // Lo que cuenta en la general.
  puntos: { obtenido: number; posible: number; tareas: number }
  // [] en modo puntos; en el orden de la clase.
  categorias: DesgloseDeCategoria[]
  // Calificadas sin categoría (no cuentan con categorías).
  sinCategoria: { tareas: number }
}

// numerador / denominador (enteros no negativos) redondeado a centésimas, con las mitades hacia arriba.
const centesimasDe = (numerador: bigint, denominador: bigint): number =>
  Number((2n * numerador * 100n + denominador) / (2n * denominador)) / 100

const categoriaDesconocida = (): AppError =>
  new AppError("ERROR_INTERNO", "La calificación tiene una categoría que no es de la clase.", 500)

interface Suma {
  obtenidoCentesimas: number
  posible: number
  tareas: number
}

const VACIA: Suma = { obtenidoCentesimas: 0, posible: 0, tareas: 0 }

const sumar = (a: Suma, b: Suma): Suma => ({
  obtenidoCentesimas: a.obtenidoCentesimas + b.obtenidoCentesimas,
  posible: a.posible + b.posible,
  tareas: a.tareas + b.tareas,
})

// Porcentaje por puntos (P-05 a): obtenido / posible × 100. En centésimas de punto, obtenido / posible
// ya es el porcentaje.
const porcentajeDe = (suma: Suma): number | null =>
  suma.tareas === 0 || suma.posible === 0
    ? null
    : centesimasDe(BigInt(suma.obtenidoCentesimas), BigInt(suma.posible))

const puntosDe = (suma: Suma) => ({
  obtenido: suma.obtenidoCentesimas / 100,
  posible: suma.posible,
  tareas: suma.tareas,
})

export const calificacionGeneral = ({
  categorias,
  agregados,
}: {
  categorias: readonly CategoriaDeLaClase[]
  agregados: readonly AgregadoPorCategoria[]
}): CalificacionGeneral => {
  const deLaClase = new Set(categorias.map((categoria) => categoria.id))
  if (agregados.some((a) => a.categoriaId !== null && !deLaClase.has(a.categoriaId))) {
    throw categoriaDesconocida()
  }

  // 1. Sin categorías en la clase: modo puntos sobre todas las tareas calificadas.
  if (categorias.length === 0) {
    const total = agregados.reduce<Suma>(sumar, VACIA)
    return {
      modo: "puntos",
      porcentaje: porcentajeDe(total),
      puntos: puntosDe(total),
      categorias: [],
      sinCategoria: { tareas: 0 },
    }
  }

  // 2. Con categorías: cada categoría por puntos; las que no tienen tareas calificadas no cuentan y su
  // peso se reparte entre las demás; "Sin categoría" no cuenta.
  const porCategoria = new Map<string, Suma>()
  let sinCategoria = 0
  for (const agregado of agregados) {
    if (agregado.categoriaId === null) {
      sinCategoria += agregado.tareas
    } else {
      porCategoria.set(
        agregado.categoriaId,
        sumar(porCategoria.get(agregado.categoriaId) ?? VACIA, agregado),
      )
    }
  }

  const cuentan = categorias
    .map((categoria) => ({ categoria, suma: porCategoria.get(categoria.id) ?? VACIA }))
    .filter(({ suma }) => suma.tareas > 0 && suma.posible > 0)
  const sumaDePesos = cuentan.reduce((suma, { categoria }) => suma + categoria.peso, 0)
  const pesoEfectivoDe = (peso: number): number =>
    centesimasDe(BigInt(peso) * 100n, BigInt(sumaDePesos))

  const desglose = categorias.map((categoria): DesgloseDeCategoria => {
    const suma = porCategoria.get(categoria.id) ?? VACIA
    const porcentaje = porcentajeDe(suma)
    return {
      id: categoria.id,
      nombre: categoria.nombre,
      peso: categoria.peso,
      pesoEfectivo: porcentaje === null ? null : pesoEfectivoDe(categoria.peso),
      porcentaje,
      ...puntosDe(suma),
    }
  })

  const loQueCuenta = cuentan.reduce<Suma>((total, { suma }) => sumar(total, suma), VACIA)
  if (cuentan.length === 0) {
    return {
      modo: "categorias",
      porcentaje: null,
      puntos: puntosDe(loQueCuenta),
      categorias: desglose,
      sinCategoria: { tareas: sinCategoria },
    }
  }

  // Σ (porcentaje_i × peso_i) / Σ pesos, con porcentaje_i = obtenido_i / posible_i (sin redondear).
  // Como fracción exacta: Σ (obtenido_i × peso_i × D / posible_i) / (D × Σ pesos), D = Π posible_i.
  const denominadorComun = cuentan.reduce((d, { suma }) => d * BigInt(suma.posible), 1n)
  const numerador = cuentan.reduce(
    (n, { categoria, suma }) =>
      n +
      (BigInt(suma.obtenidoCentesimas) * BigInt(categoria.peso) * denominadorComun) /
        BigInt(suma.posible),
    0n,
  )
  return {
    modo: "categorias",
    porcentaje: centesimasDe(numerador, denominadorComun * BigInt(sumaDePesos)),
    puntos: puntosDe(loQueCuenta),
    categorias: desglose,
    sinCategoria: { tareas: sinCategoria },
  }
}

// S-08: la media de los porcentajes no nulos, redondeada a 2 decimales; null si no hay ninguno.
export const promedioDeLaClase = (porcentajes: readonly (number | null)[]): number | null => {
  const presentes = porcentajes.filter((p): p is number => p !== null)
  if (presentes.length === 0) return null
  const suma = presentes.reduce((total, p) => total + Math.round(p * 100), 0)
  return centesimasDe(BigInt(suma), BigInt(presentes.length) * 100n)
}
