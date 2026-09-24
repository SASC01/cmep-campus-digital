import type { FastifyInstance } from "fastify"

import { RUTAS_PUBLICAS } from "./rutas-publicas.js"

// Los cinco pasos obligatorios de la cadena, en su orden (ESSENTIALS > Autorización). El sexto
// (pertenencia) es opcional y va después.
const PASOS_OBLIGATORIOS = [
  "authenticate",
  "withProfile",
  "withPasswordGate",
  "withAccess",
  "requireRole",
] as const

export type PasoObligatorio = (typeof PASOS_OBLIGATORIOS)[number]

// Registro por identidad de las funciones que produce protegido() (T-06). Una función ajena con el
// mismo nombre, o una cadena compuesta a mano, no está aquí y no pasa la guarda.
const pasosDeLaCadena = new WeakMap<object, PasoObligatorio>()

export const marcarPasoDeLaCadena = <T extends object>(paso: T, nombre: PasoObligatorio): T => {
  pasosDeLaCadena.set(paso, nombre)
  return paso
}

const comoLista = <T>(valor: T | readonly T[] | undefined): readonly T[] => {
  if (valor === undefined) return []
  if (Array.isArray(valor)) return valor as readonly T[]
  return [valor as T]
}

const pasaPorLaCadenaCompleta = (preHandler: readonly unknown[]): boolean =>
  PASOS_OBLIGATORIOS.every((nombre, posicion) => {
    const paso = preHandler[posicion]
    if (typeof paso !== "function") return false
    return pasosDeLaCadena.get(paso) === nombre
  })

// Motivo por el que una ruta no pública no puede registrarse, o null si pasa la guarda.
const motivoDeRechazo = ({
  preHandler,
  hooksAnteriores,
}: {
  preHandler: readonly unknown[]
  hooksAnteriores: readonly (readonly [string, readonly unknown[]])[]
}): string | null => {
  if (!pasaPorLaCadenaCompleta(preHandler)) return "no pasa por protegido()"
  const declarados = hooksAnteriores
    .filter(([, hooks]) => hooks.length > 0)
    .map(([nombre]) => nombre)
  if (declarados.length === 0) return null
  return `declara ${declarados.join(", ")}, que se ejecuta antes de protegido()`
}

// Una ruta puede atender peticiones a /api/* si su URL empieza por /api o si su primer segmento es
// un parámetro (/:seccion/...) o un comodín (/*): find-my-way la usaría para /api/loquesea (T-06).
const puedeAtenderApi = (url: string): boolean => {
  if (url.startsWith("/api")) return true
  const primerSegmento = url.replace(/^\//, "").split("/")[0] ?? ""
  return primerSegmento.includes(":") || primerSegmento.includes("*")
}

// Guarda estructural (DEC-16, M-09, ampliada por T-06 y T-12): hace cumplir la regla 2 de
// AGENTS.md por construcción. Se registra en el ámbito raíz antes que cualquier handler, así que
// observa también las rutas de los plugins hijos con prefijo; como Fastify ejecuta onRoute al
// registrar la ruta, el error aborta el register y la API no arranca. Toda ruta que pueda atender
// /api/* y no esté en la lista pública debe empezar por la cadena completa de protegido(), en orden,
// y no puede declarar hooks de ruta que Fastify ejecuta antes que preHandler (onRequest, preParsing,
// preValidation): podrían responder sin pasar por la cadena (T-12). HEAD se trata como su GET porque
// Fastify lo genera automáticamente (exposeHeadRoutes) con las mismas opciones.
export const registrarGuardaDeRutas = (app: FastifyInstance): void => {
  app.addHook("onRoute", (ruta) => {
    if (!puedeAtenderApi(ruta.url)) return

    const motivo = motivoDeRechazo({
      preHandler: comoLista<unknown>(ruta.preHandler),
      hooksAnteriores: [
        ["onRequest", comoLista<unknown>(ruta.onRequest)],
        ["preParsing", comoLista<unknown>(ruta.preParsing)],
        ["preValidation", comoLista<unknown>(ruta.preValidation)],
      ],
    })
    if (motivo === null) return

    for (const metodo of comoLista(ruta.method)) {
      const metodoEfectivo = metodo === "HEAD" ? "GET" : metodo
      if (RUTAS_PUBLICAS.has(`${metodoEfectivo} ${ruta.url}`)) continue
      throw new Error(`La ruta ${metodo} ${ruta.url} ${motivo} (AGENTS.md, regla 2)`)
    }
  })
}
