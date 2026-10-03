import { createRequire } from "node:module"

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

// CHORE-02: un parámetro o un comodín en los dos primeros segmentos podría atender
// /api/clases/<id>/… sin la regla de :claseId (/api/*, /api/:seccion/*, /:seccion/*, *).
// Los segmentos vacíos (//api, /api//) se descartan antes de tomar los dos primeros (O-2): si un día
// se normalizan las barras dobles, no deben ocupar un lugar.
const comodinEnLosPrimerosSegmentos = (url: string): boolean =>
  url
    .split("/")
    .filter((segmento) => segmento !== "")
    .slice(0, 2)
    .some((segmento) => segmento.includes(":") || segmento.includes("*"))

// CHORE-02, T-02 (§E4-1): clasificación cerrada de las opciones de ruta que Fastify lee
// (lib/route.js, lib/hooks.js de Fastify 5.12.5). Las prohibidas, por grupo y con el motivo que
// sale en el mensaje. Permitidas: preHandler (con la cadena primero), onResponse, onTimeout,
// onRequestAbort, method, url, path, handler, config, constraints, bodyLimit, handlerTimeout,
// logLevel, exposeHeadRoute, prefixTrailingSlash y attachValidation. Cualquier otra clave, Fastify
// la ignora.
interface GrupoDeOpciones {
  motivo: string
  nombres: readonly string[]
}

const OPCIONES_QUE_REHACEN = ["errorHandler", "onSend", "preSerialization", "onError"] as const
const OPCIONES_QUE_VALIDAN = [
  "schema",
  "validatorCompiler",
  "serializerCompiler",
  "schemaErrorFormatter",
] as const
const OPCIONES_CON_LA_PETICION = ["childLoggerFactory", "logSerializers"] as const

// Los diez hooks del ciclo de vida que Fastify lee de las opciones de la ruta en preReady
// (opts[hook]): la guarda deja una copia congelada de cada uno, para que mutar después el arreglo
// que devolvió protegido() no cambie la ruta (H-3).
const HOOKS_DE_RUTA = [
  "onTimeout",
  "onRequest",
  "preParsing",
  "preValidation",
  "preSerialization",
  "preHandler",
  "onSend",
  "onResponse",
  "onError",
  "onRequestAbort",
] as const

// El onSend interno de la ruta HEAD que Fastify genera para todo GET (lib/head-route.js): vacía el
// cuerpo y es el único onSend que se admite. lib/ de Fastify no publica tipos, de ahí el tipo local;
// es la única importación de una ruta interna de Fastify en backend/src. Si una versión nueva la
// mueve, la API no arranca y todas las pruebas lo muestran.
interface ModuloDeLaRutaHead {
  parseHeadOnSendHandlers?: (onSend: null) => unknown
}

const sondearOnSendDeHead = (): unknown => {
  const modulo = createRequire(import.meta.url)("fastify/lib/head-route.js") as ModuloDeLaRutaHead
  const onSend = modulo.parseHeadOnSendHandlers?.(null)
  if (typeof onSend !== "function") {
    throw new Error("No se encontró el onSend interno de las rutas HEAD de Fastify")
  }
  return onSend
}

// Motivo por el que una ruta no pública no puede registrarse, o null si pasa la guarda.
const motivoDeRechazo = ({
  url,
  preHandler,
  hooksAnteriores,
  opcionesProhibidas,
}: {
  url: string
  preHandler: readonly unknown[]
  hooksAnteriores: readonly (readonly [string, readonly unknown[]])[]
  opcionesProhibidas: readonly GrupoDeOpciones[]
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
  if (declarados.length > 0) {
    return `declara ${declarados.join(", ")}, que se ejecuta antes de protegido()`
  }
  // T-02 (CHORE-02): opciones de ruta que rehacen, validan o serializan la respuesta de la cadena.
  const grupo = opcionesProhibidas.find(({ nombres }) => nombres.length > 0)
  if (grupo) return `declara ${grupo.nombres.join(", ")}, que ${grupo.motivo}`
  if (comodinEnLosPrimerosSegmentos(url)) {
    return "tiene un parámetro o un comodín en sus dos primeros segmentos"
  }
  return null
}

// CHORE-02, T-01: setNotFoundHandler y setErrorHandler no disparan onRoute, así que un plugin
// podría atender /api/… o rehacer la respuesta de la cadena sin que la guarda lo vea. Los dos
// únicos manejadores son los de handlers/errores.ts, que app.ts registra ANTES de
// registrarMiddleware. Desde aquí, cualquier instancia (la raíz, un plugin con fastify-plugin o un
// hijo encapsulado, que Fastify crea con Object.create del padre) hereda esta propiedad.
const MANEJADORES_DE_LA_RAIZ = ["setNotFoundHandler", "setErrorHandler"] as const

const bloquearManejadoresPropios = (app: FastifyInstance): void => {
  for (const metodo of MANEJADORES_DE_LA_RAIZ) {
    Object.defineProperty(app, metodo, {
      value: (): never => {
        throw new Error(
          `La instancia llama a ${metodo} después de registrarMiddleware: el único es el de handlers/errores.ts, registrado antes (AGENTS.md, regla 2)`,
        )
      },
      writable: false,
      configurable: false,
      enumerable: true,
    })
  }
}

// CHORE-02, T-03 (§E4-2): los hooks de la instancia corren en cada ruta del contexto (los de
// petición, incluso antes que preHandler) y pueden responder o rehacer la respuesta de la cadena;
// un onRoute posterior podría cambiar una ruta ya revisada. Después de registrarMiddleware solo se
// admiten los que no tocan la respuesta. Los plugins que necesiten los demás se registran antes,
// como manejoDeErrores y @fastify/cookie (app.ts).
const MOTIVO_REHACE = "puede responder o rehacer la respuesta fuera de protegido()"
const HOOKS_DE_LA_RAIZ = new Map<string, string>([
  ["onRequest", MOTIVO_REHACE],
  ["preParsing", MOTIVO_REHACE],
  ["preValidation", MOTIVO_REHACE],
  ["preHandler", MOTIVO_REHACE],
  ["preSerialization", MOTIVO_REHACE],
  ["onSend", MOTIVO_REHACE],
  ["onError", MOTIVO_REHACE],
  ["onRoute", "podría cambiar una ruta después de que la guarda la revisó"],
])

// Métodos de la instancia que pueden rehacer la respuesta, validar o correr con la petición antes
// de la cadena (fastify.js:180-290). El resto (rutas, register, decorate*, consultas) se permite:
// ver la tabla de la Enmienda 4 del plan.
const MOTIVO_CUERPO = "puede rehacer el cuerpo de la respuesta de protegido()"
const MOTIVO_VALIDA = "valida fuera de protegido()"
const MOTIVO_PETICION = "corre con la petición antes de protegido()"
const METODOS_BLOQUEADOS = new Map<string, string>([
  ["setReplySerializer", MOTIVO_CUERPO],
  ["setSerializerCompiler", MOTIVO_CUERPO],
  ["setValidatorCompiler", MOTIVO_VALIDA],
  ["setSchemaController", MOTIVO_VALIDA],
  ["setSchemaErrorFormatter", MOTIVO_VALIDA],
  ["setGenReqId", MOTIVO_PETICION],
  ["setChildLoggerFactory", MOTIVO_PETICION],
  ["addContentTypeParser", MOTIVO_PETICION],
  ["addConstraintStrategy", MOTIVO_PETICION],
])

const definirFija = (app: FastifyInstance, nombre: string, valor: unknown): void => {
  Object.defineProperty(app, nombre, {
    value: valor,
    writable: false,
    configurable: false,
    enumerable: true,
  })
}

const bloquearHooksYMetodosDeLaInstancia = (
  app: FastifyInstance,
  addHookOriginal: FastifyInstance["addHook"],
): void => {
  definirFija(app, "addHook", function (this: unknown, ...argumentos: unknown[]): unknown {
    const [nombre] = argumentos
    const motivo = typeof nombre === "string" ? HOOKS_DE_LA_RAIZ.get(nombre) : undefined
    if (motivo !== undefined) {
      throw new Error(
        `La instancia agrega el hook ${nombre as string} después de registrarMiddleware: ${motivo}; un plugin que lo necesite se registra antes (AGENTS.md, regla 2)`,
      )
    }
    return (addHookOriginal as (...a: unknown[]) => unknown).apply(this, argumentos)
  })
  for (const [metodo, motivo] of METODOS_BLOQUEADOS) {
    definirFija(app, metodo, (): never => {
      throw new Error(
        `La instancia llama a ${metodo} después de registrarMiddleware: ${motivo}; un plugin que lo necesite se registra antes (AGENTS.md, regla 2)`,
      )
    })
  }
}

// Guarda estructural (DEC-16, M-09, ampliada por T-06, T-12, M-15 y CHORE-02): hace cumplir la regla 2 de
// AGENTS.md por construcción. Se registra en el ámbito raíz antes que cualquier handler, así que
// observa también las rutas de los plugins hijos con prefijo; como Fastify ejecuta onRoute al
// registrar la ruta, el error aborta el register y la API no arranca. Toda ruta, con cualquier URL (no
// solo las que empiezan por /api: M-15, CHORE-02), que no esté en la lista pública debe empezar por
// la cadena completa de protegido(), en orden, no puede tener un parámetro ni un comodín en sus dos
// primeros segmentos (CHORE-02) y no puede declarar hooks de ruta que Fastify ejecuta antes que preHandler (onRequest, preParsing,
// preValidation): podrían responder sin pasar por la cadena (T-12). HEAD se trata como su GET porque
// Fastify lo genera automáticamente (exposeHeadRoutes) con las mismas opciones.
export const registrarGuardaDeRutas = (app: FastifyInstance): void => {
  const onSendDeHead = sondearOnSendDeHead()
  const addHookOriginal = app.addHook

  app.addHook("onRoute", (ruta) => {
    // Las opciones de la ruta se leen por nombre: RouteOptions no declara todas con el mismo tipo.
    const opciones = ruta as unknown as Record<string, unknown>
    // Copiar, revisar y asignar (H-3): se revisa la misma copia que queda en la ruta.
    const copias = new Map<string, readonly unknown[]>()
    for (const hook of HOOKS_DE_RUTA) {
      if (opciones[hook] === undefined) continue
      copias.set(hook, Object.freeze([...comoLista<unknown>(opciones[hook])]))
    }
    const hooksDe = (nombre: string): readonly unknown[] => copias.get(nombre) ?? []
    const declaradas = (nombres: readonly string[]): string[] =>
      nombres.filter((nombre) => {
        if (nombre === "onSend") {
          return hooksDe("onSend").some((hook) => hook !== onSendDeHead)
        }
        if (copias.has(nombre)) return hooksDe(nombre).length > 0
        return opciones[nombre] !== undefined
      })

    const motivo = motivoDeRechazo({
      url: ruta.url,
      preHandler: hooksDe("preHandler"),
      hooksAnteriores: [
        ["onRequest", hooksDe("onRequest")],
        ["preParsing", hooksDe("preParsing")],
        ["preValidation", hooksDe("preValidation")],
      ],
      opcionesProhibidas: [
        {
          motivo: "puede rehacer la respuesta de protegido()",
          nombres: declaradas(OPCIONES_QUE_REHACEN),
        },
        {
          motivo: "valida o serializa fuera de protegido()",
          nombres: declaradas(OPCIONES_QUE_VALIDAN),
        },
        {
          motivo: "corre con la petición antes de protegido()",
          nombres: declaradas(OPCIONES_CON_LA_PETICION),
        },
      ],
    })

    if (motivo !== null) {
      for (const metodo of comoLista(ruta.method)) {
        const metodoEfectivo = metodo === "HEAD" ? "GET" : metodo
        if (RUTAS_PUBLICAS.has(`${metodoEfectivo} ${ruta.url}`)) continue
        throw new Error(`La ruta ${metodo} ${ruta.url} ${motivo} (AGENTS.md, regla 2)`)
      }
      return
    }
    // Solo se sustituyen los arreglos (los únicos mutables): una función suelta no cambia, y Fastify
    // valida distinto un arreglo de una función (onRequestAbort asíncrono), así que no se normaliza.
    for (const [hook, copia] of copias) {
      if (Array.isArray(opciones[hook])) opciones[hook] = copia
    }
  })

  // T-03 (§E4-2): un plugin registrado con logSerializers corre con la petición antes de la cadena.
  app.addHook("onRegister", (_instancia, opcionesDelPlugin) => {
    if (opcionesDelPlugin.logSerializers === undefined) return
    throw new Error(
      "Un plugin se registra con logSerializers después de registrarMiddleware: corre con la petición antes de protegido() (AGENTS.md, regla 2)",
    )
  })

  bloquearManejadoresPropios(app)
  bloquearHooksYMetodosDeLaInstancia(app, addHookOriginal)
}
