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

// El sexto paso (pertenencia, §D-0.2) se marca con uno de estos dos nombres, además de los cinco
// obligatorios.
export type PasoDeLaCadena = PasoObligatorio | "requireMembership" | "requireOwnership"

// Registro por identidad de las funciones que produce protegido() (T-06). Una función ajena con el
// mismo nombre, o una cadena compuesta a mano, no está aquí y no pasa la guarda.
const pasosDeLaCadena = new WeakMap<object, PasoDeLaCadena>()

export const marcarPasoDeLaCadena = <T extends object>(paso: T, nombre: PasoDeLaCadena): T => {
  pasosDeLaCadena.set(paso, nombre)
  return paso
}

// Solo para pruebas (PR-A07d): la marca de un paso, o undefined si no está en el registro.
export const marcaDeLaCadena = (paso: unknown): PasoDeLaCadena | undefined =>
  typeof paso === "function" ? pasosDeLaCadena.get(paso) : undefined

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

// §D-0.3 (CLASES-a), texto de la enmienda pendiente (segunda pasada de la corrección de ronda 1,
// M-02 de `revision.md`): toda ruta bajo /api que declare un parámetro llamado claseId en
// cualquier posición de su URL (:claseId seguido de un carácter que no pueda formar parte del
// nombre, o del fin), y todo comodín bajo /clases/ a cualquier profundidad, lleva el sexto paso
// (pertenencia) marcado en la posición 5 del preHandler; bajo /clases/, el único parámetro
// permitido en el segmento siguiente es :claseId (nada más en ese segmento: ni otro nombre, ni
// :claseId combinado con otro parámetro).
//
// TIENE_CLASE_ID ya no exige que ":claseId" venga precedido de "/" o del inicio de la URL: el
// manager encontró con el find-my-way real del repositorio que find-my-way entrega
// request.params.claseId también cuando el parámetro va a la mitad de un segmento compuesto
// (":parte-:claseId", "pre-:claseId", ":parte.:claseId"), no solo al principio. La condición que sí
// importa es la que sigue al nombre: un carácter que no pueda ser parte de un nombre de parámetro
// (\w) o el fin de la URL. \w es una aproximación deliberadamente amplia (incluye "_" y dígitos,
// que find-my-way no usa como continuación de "claseId" en la práctica) para no dejar pasar una
// forma nueva sin haberla visto.
const TIENE_CLASE_ID = /:claseId(?!\w)/

// Bajo /clases/, el segmento inmediato solo puede ser exactamente ":claseId": ni otro nombre
// (":id"), ni una variante de mayúsculas o guion bajo (":claseid", ":clase_id", ":claseId2"), ni
// :claseId combinado con otro parámetro en el mismo segmento (":claseId-:parte"). Un segmento que
// no empieza con ":" (una ruta estática como "/clases/inscritas") no entra en este chequeo.
const segmentoDeClaseInvalido = (url: string): boolean => {
  const coincidencia = /\/clases\/(:[^/]*)/.exec(url)
  if (coincidencia === null) return false
  return coincidencia[1] !== ":claseId"
}

// Un comodín bajo /clases/, a cualquier profundidad (punto de ataque 2 del plan): aunque no nombra
// el parámetro "claseId", identifica una clase de la misma manera para toda esa familia de rutas.
// La comprobación de que "clases" no siga con otro carácter de nombre (T-13, ronda 2 del tester)
// evita dos falsos: que "/api/clases*" (el comodín pegado, sin "/") se cuele porque la expresión
// exigía una "/" justo después de "clases" (find-my-way sí lo usa para atender toda la familia
// /clases/…, igual que /clases/*), y que un recurso distinto que empiece con "clases" (por ejemplo,
// un futuro "/clasesInactivas/*") se tratara como si fuera esta familia.
const CLASES_COMODIN = /\/clases(?![A-Za-z0-9_]).*\*/

const tienePertenencia = (preHandler: readonly unknown[]): boolean => {
  const sexto = preHandler[PASOS_OBLIGATORIOS.length]
  if (typeof sexto !== "function") return false
  const marca = pasosDeLaCadena.get(sexto)
  return marca === "requireMembership" || marca === "requireOwnership"
}

// Motivo por el que una ruta no pública no puede registrarse, o null si pasa la guarda.
const motivoDeRechazo = ({
  url,
  preHandler,
  hooksAnteriores,
}: {
  url: string
  preHandler: readonly unknown[]
  hooksAnteriores: readonly (readonly [string, readonly unknown[]])[]
}): string | null => {
  if (!pasaPorLaCadenaCompleta(preHandler)) return "no pasa por protegido()"
  if (segmentoDeClaseInvalido(url)) {
    return "nombra el parámetro de clase distinto de :claseId"
  }
  if ((TIENE_CLASE_ID.test(url) || CLASES_COMODIN.test(url)) && !tienePertenencia(preHandler)) {
    return "tiene :claseId y no pasa por requireMembership ni requireOwnership"
  }
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
      url: ruta.url,
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
