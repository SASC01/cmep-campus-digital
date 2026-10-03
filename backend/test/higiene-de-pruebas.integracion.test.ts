import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join, sep } from "node:path"
import { fileURLToPath } from "node:url"

import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { inicializarAuth } from "../src/adapters/auth/index.js"
import { cerrarConexion, inicializarDb, obtenerDb } from "../src/adapters/db/cliente.js"
import { opcionesDeAuth } from "../src/config/auth.js"
import { cargarEnv } from "../src/config/env.js"
import { borrarUsuariosDePrueba, crearUsuarioDePrueba } from "./ayudas-auth.js"
import { formadasDetrasDe } from "./ayudas-concurrencia.js"

// Higiene de las pruebas y del código (CHORE-02): PR-CH-01c (ningún bloqueo de tabla que pueda
// esperar), PR-CH-03a (formadasDetrasDe solo cuenta esperas de fila) y PR-CH-04h (un único
// $transaction en backend/src).

const RAIZ_DEL_BACKEND = fileURLToPath(new URL("..", import.meta.url))

// Rutas relativas a la raíz del backend, con "/" como separador.
const archivosDe = (carpeta: string, aceptar: (ruta: string) => boolean): string[] =>
  readdirSync(join(RAIZ_DEL_BACKEND, carpeta), { recursive: true, encoding: "utf8" })
    .map((ruta) => `${carpeta}/${ruta.split(sep).join("/")}`)
    .filter((ruta) => ruta.endsWith(".ts") && aceptar(ruta))
    .sort()

const leer = (ruta: string): string => readFileSync(join(RAIZ_DEL_BACKEND, ruta), "utf8")

// Sustituye por una línea vacía las que son puro comentario (// al principio): conserva el número
// de línea de todas las demás.
const sinLineasDeComentario = (texto: string): string =>
  texto
    .split("\n")
    .map((linea) => (linea.trimStart().startsWith("//") ? "" : linea))
    .join("\n")

// ---------------------------------------------------------------------------------------------
// PR-CH-01c: toda sentencia de bloqueo de tabla lleva NOWAIT. Se analiza por sentencia (como un
// solo texto, con sus saltos de línea), no por línea.
// ---------------------------------------------------------------------------------------------
// "lock on relation" es el texto del error 55P03 de PostgreSQL ("could not obtain lock on relation"),
// que las pruebas reconocen para reintentar; nunca es una sentencia válida (lo que sigue a LOCK
// sería la tabla "on" y luego "relation", sin coma), así que no cuenta.
// La palabra clave se arma sin escribirla entera junta, para no depender solo de que este archivo
// se excluya de su propio recorrido.
const PALABRA_CLAVE = ["LO", "CK"].join("")
const INICIO_DE_BLOQUEO = new RegExp(
  `\\b${PALABRA_CLAVE}\\s+(?!on\\s+relation\\b)(?:TABLE\\s+)?(?:ONLY\\s+)?["\\w.]`,
  "gi",
)
const TERMINADORES = [";", "`", '"', "'"]

interface BloqueoSinNowait {
  linea: number
  sentencia: string
}

// Pura: las sentencias de bloqueo de tabla de un texto que no llevan NOWAIT, con la línea donde
// empiezan. La sentencia va desde la palabra clave hasta su primer terminador (; o el cierre de la
// cadena que la contiene).
const bloqueosSinNowait = (texto: string): BloqueoSinNowait[] => {
  const codigo = sinLineasDeComentario(texto)
  const encontrados: BloqueoSinNowait[] = []
  for (const coincidencia of codigo.matchAll(INICIO_DE_BLOQUEO)) {
    const inicio = coincidencia.index
    const desde = inicio + coincidencia[0].length
    const fines = TERMINADORES.map((terminador) => codigo.indexOf(terminador, desde)).filter(
      (posicion) => posicion >= 0,
    )
    const fin = fines.length === 0 ? codigo.length : Math.min(...fines)
    const sentencia = codigo.slice(inicio, fin)
    if (/\bNOWAIT\b/i.test(sentencia)) continue
    encontrados.push({ linea: codigo.slice(0, inicio).split("\n").length, sentencia })
  }
  return encontrados
}

const sentencia = (resto: string): string => `${PALABRA_CLAVE} ${resto}`

describe("PR-CH-01c: ningún bloqueo de tabla en las pruebas puede esperar", () => {
  it("el control de la regla rechaza las formas sin NOWAIT, incluso partidas en líneas", () => {
    expect(
      bloqueosSinNowait(`tx.$executeRaw\`${sentencia("usuarios IN ACCESS EXCLUSIVE MODE")}\``),
    ).toHaveLength(1)
    expect(
      bloqueosSinNowait(
        `tx.$executeRaw\`${sentencia("TABLE ONLY usuarios IN ACCESS EXCLUSIVE MODE")}\``,
      ),
    ).toHaveLength(1)
    expect(
      bloqueosSinNowait(
        `tx.$executeRaw\`\n  ${sentencia("TABLE usuarios")}\n  IN ACCESS EXCLUSIVE MODE\n\``,
      ),
    ).toHaveLength(1)
  })

  it("el control de la regla acepta NOWAIT, también en otra línea, y no cuenta lo que no es un bloqueo de tabla", () => {
    expect(
      bloqueosSinNowait(
        `tx.$executeRaw\`${sentencia("TABLE usuarios IN ACCESS EXCLUSIVE MODE NOWAIT")}\``,
      ),
    ).toHaveLength(0)
    expect(
      bloqueosSinNowait(
        `tx.$executeRaw\`\n  ${sentencia("TABLE usuarios IN ACCESS EXCLUSIVE MODE")}\n  nowait\n\``,
      ),
    ).toHaveLength(0)
    expect(bloqueosSinNowait("SELECT pg_advisory_xact_lock(1)")).toHaveLength(0)
    expect(bloqueosSinNowait("SET lock_timeout = 1000")).toHaveLength(0)
    expect(bloqueosSinNowait(`/could not obtain ${sentencia("on relation")}/i`)).toHaveLength(0)
    expect(
      bloqueosSinNowait(`// ${sentencia("TABLE usuarios IN ACCESS EXCLUSIVE MODE")}`),
    ).toHaveLength(0)
  })

  it("el control de la regla informa la línea donde empieza la sentencia", () => {
    const texto = `const a = 1\nconst b = \`\n${sentencia("TABLE usuarios")}\n\``
    expect(bloqueosSinNowait(texto).map((hallazgo) => hallazgo.linea)).toEqual([3])
  })

  it("ningún archivo de backend/test ni de backend/src/**/*.test.ts pide un bloqueo de tabla sin NOWAIT", () => {
    const propio = "test/higiene-de-pruebas.integracion.test.ts"
    const archivos = [
      ...archivosDe("test", () => true),
      ...archivosDe("src", (ruta) => ruta.endsWith(".test.ts")),
    ].filter((ruta) => ruta !== propio)
    expect(archivos.length, "Precondición: se recorrieron archivos de prueba").toBeGreaterThan(50)

    const hallazgos = archivos.flatMap((ruta) =>
      bloqueosSinNowait(leer(ruta)).map((hallazgo) => `${ruta}:${hallazgo.linea}`),
    )

    expect(
      hallazgos,
      "Una prueba no puede pedir un bloqueo de tabla que espere: solo con NOWAIT y un reintento acotado (CHORE-02, AGENTS.md, Pruebas)",
    ).toEqual([])
  })
})

// ---------------------------------------------------------------------------------------------
// PR-CH-03a: formadasDetrasDe solo cuenta esperas de fila.
// ---------------------------------------------------------------------------------------------
const esperar = (ms: number): Promise<void> => new Promise((resolver) => setTimeout(resolver, ms))

const idsUsuarios: string[] = []

beforeAll(async () => {
  const env = cargarEnv()
  inicializarDb({ connectionString: env.DATABASE_URL })
  await inicializarAuth(opcionesDeAuth(env))
})

afterAll(async () => {
  await borrarUsuariosDePrueba(idsUsuarios)
  await cerrarConexion()
})

describe("PR-CH-03a: formadasDetrasDe", () => {
  it("cuenta la espera de una fila (transactionid) y no la de un bloqueo consultivo (advisory)", async () => {
    // Paso 0: la fila existe y está confirmada antes de abrir T1 (en READ COMMITTED, una fila que
    // nace dentro de T1 no sería visible para T3, que no esperaría).
    const usuario = await crearUsuarioDePrueba(idsUsuarios)
    const llave = String(Math.floor(Math.random() * Number.MAX_SAFE_INTEGER))
    const db = obtenerDb()
    const opciones = { timeout: 30_000, maxWait: 5_000 }
    let t2: Promise<unknown> | undefined
    let t3: Promise<unknown> | undefined

    const medidas = await db.$transaction(async (tx1) => {
      // Paso 1: T1 toma el bloqueo consultivo propio del caso y la fila.
      await tx1.$executeRaw`SELECT pg_advisory_xact_lock(${llave}::bigint)`
      await tx1.$queryRaw`SELECT id FROM usuarios WHERE id = ${usuario.id}::uuid FOR UPDATE`
      const [propio] = await tx1.$queryRaw<{ pid: number }[]>`SELECT pg_backend_pid() AS pid`
      if (!propio) throw new Error("Precondición: no se obtuvo el pid de T1")

      // Paso 2: T2 espera el bloqueo consultivo. Paso 3: T3 espera la fila.
      t2 = db.$transaction(async (tx2) => {
        await tx2.$executeRaw`SELECT pg_advisory_xact_lock(${llave}::bigint)`
      }, opciones)
      t3 = db.$transaction(async (tx3) => {
        await tx3.$queryRaw`SELECT id FROM usuarios WHERE id = ${usuario.id}::uuid FOR UPDATE`
      }, opciones)

      const esperasDe = async (): Promise<string[]> => {
        const filas = await db.$queryRaw<{ wait_event: string | null }[]>`
          SELECT wait_event FROM pg_stat_activity
          WHERE ${propio.pid}::int = ANY(pg_blocking_pids(pid)) AND wait_event_type = 'Lock'`
        return filas.map((fila) => fila.wait_event ?? "")
      }

      // Paso 4: con las dos formadas (sondeo con límite de 10 s), se mide.
      const limite = Date.now() + 10_000
      let esperas: string[] = []
      while (Date.now() < limite) {
        esperas = await esperasDe()
        if (esperas.includes("advisory") && esperas.includes("transactionid")) break
        await esperar(25)
      }
      expect(
        [...esperas].sort(),
        "Precondición: T2 (advisory) y T3 (transactionid) no se formaron detrás de T1 en 10 s",
      ).toEqual(["advisory", "transactionid"])

      // El control: la consulta recursiva sin filtro, la de antes de CHORE-02.
      const [sinFiltro] = await db.$queryRaw<{ n: number }[]>`
        WITH RECURSIVE bloqueados(pid) AS (
          SELECT pid FROM pg_stat_activity WHERE ${propio.pid}::int = ANY(pg_blocking_pids(pid))
          UNION
          SELECT a.pid FROM pg_stat_activity a
          JOIN bloqueados b ON b.pid = ANY(pg_blocking_pids(a.pid))
        )
        SELECT count(*)::int AS n FROM bloqueados`
      return { filtrado: await formadasDetrasDe(propio.pid), sinFiltro: sinFiltro?.n }
    }, opciones)

    // Paso 5: T1 ya confirmó; T2 y T3 terminan.
    await Promise.all([t2, t3])

    expect(medidas.filtrado).toBe(1)
    expect(medidas.sinFiltro).toBe(2)
  }, 30_000)
})

// ---------------------------------------------------------------------------------------------
// PR-CH-04h: el único $transaction de backend/src es el de enTransaccion.
// ---------------------------------------------------------------------------------------------
describe("PR-CH-04h: un único $transaction en backend/src", () => {
  it("solo adapters/db/cliente.ts tiene .$transaction( en una línea de código", () => {
    const archivos = archivosDe(
      "src",
      (ruta) => !ruta.endsWith(".test.ts") && !ruta.includes("adapters/db/generated/"),
    )
    expect(archivos.length, "Precondición: se recorrieron archivos de src").toBeGreaterThan(50)

    const conTransaccion = archivos.filter((ruta) =>
      /\.\$transaction\(/.test(sinLineasDeComentario(leer(ruta))),
    )

    expect(
      conTransaccion,
      "Toda transacción se abre con enTransaccion (adapters/db/cliente.ts), que traduce el P2028 a 503",
    ).toEqual(["src/adapters/db/cliente.ts"])
  })
})

// ---------------------------------------------------------------------------------------------
// PR-CH-09e: los únicos manejadores de 404 y de errores son los de handlers/errores.ts.
// ---------------------------------------------------------------------------------------------
describe("PR-CH-09e: un único lugar con setNotFoundHandler y setErrorHandler en backend/src", () => {
  it("solo handlers/errores.ts llama a setNotFoundHandler( o setErrorHandler( en una línea de código", () => {
    const archivos = archivosDe(
      "src",
      (ruta) => !ruta.endsWith(".test.ts") && !ruta.includes("adapters/db/generated/"),
    )
    expect(archivos.length, "Precondición: se recorrieron archivos de src").toBeGreaterThan(50)

    const conManejador = archivos.filter((ruta) =>
      /\b(?:setNotFoundHandler|setErrorHandler)\(/.test(sinLineasDeComentario(leer(ruta))),
    )

    expect(
      conManejador,
      "setNotFoundHandler y setErrorHandler no disparan onRoute: solo los de handlers/errores.ts, registrados antes de la guarda",
    ).toEqual(["src/handlers/errores.ts"])
  })
})

// ---------------------------------------------------------------------------------------------
// PR-CH-12e: los únicos .addHook( de backend/src son app.ts (onClose) y la guarda.
// ---------------------------------------------------------------------------------------------
const METODOS_BLOQUEADOS_POR_LA_GUARDA = [
  "setReplySerializer",
  "setValidatorCompiler",
  "setSerializerCompiler",
  "setSchemaController",
  "setSchemaErrorFormatter",
  "setGenReqId",
  "setChildLoggerFactory",
  "addContentTypeParser",
  "addConstraintStrategy",
]

const archivosDeProduccion = (): string[] =>
  archivosDe(
    "src",
    (ruta) => !ruta.endsWith(".test.ts") && !ruta.includes("adapters/db/generated/"),
  )

describe("PR-CH-12e: .addHook( y los métodos bloqueados en backend/src", () => {
  it("solo app.ts y middleware/guarda-de-rutas.ts tienen .addHook( en una línea de código", () => {
    const archivos = archivosDeProduccion()
    expect(archivos.length, "Precondición: se recorrieron archivos de src").toBeGreaterThan(50)

    const conAddHook = archivos.filter((ruta) =>
      /\.addHook\(/.test(sinLineasDeComentario(leer(ruta))),
    )

    expect(
      conAddHook,
      "Después de registrarMiddleware la guarda bloquea addHook por nombre (CHORE-02, T-03)",
    ).toEqual(["src/app.ts", "src/middleware/guarda-de-rutas.ts"])
  })

  it("ningún archivo de backend/src llama a los métodos de la instancia que la guarda bloquea", () => {
    const patron = new RegExp(`\\.(?:${METODOS_BLOQUEADOS_POR_LA_GUARDA.join("|")})\\(`)

    const conMetodo = archivosDeProduccion().filter((ruta) =>
      patron.test(sinLineasDeComentario(leer(ruta))),
    )

    expect(conMetodo).toEqual([])
  })
})

// ---------------------------------------------------------------------------------------------
// PR-CH-12g (hermano H-8; endurecida por T-06 de la ronda 3 y por T-07 y O-11 de la ronda 4): la
// fábrica de Fastify solo en app.ts. Un método de otra instancia (Fastify().addHook.call(hijo, ...))
// funcionaría sobre la instancia de un plugin y la guarda no puede impedirlo en ejecución.
//
// Regla: fuera de app.ts, ninguna referencia textual al paquete "fastify" como módulo, sea cual
// sea la vía: el especificador "fastify" o "fastify/…" (el paquete no declara exports, así que
// cualquier subruta se resuelve) y también cualquier ruta que apunte al archivo del paquete
// (`node_modules/fastify`, `/fastify/fastify.js`, `/fastify/lib/…`, rutas absolutas y `file:`),
// con comillas dobles, simples o invertidas, sin distinguir mayúsculas (en Windows "FASTIFY"
// resuelve al mismo paquete), en import, import(), export … from, require(…) o createRequire(…)(…).
// Se revisan todos los archivos de código de backend/src (.ts, .mts, .cts, .js, .mjs, .cjs), no
// solo .ts.
//
// Quedan permitidos, y solo del especificador exacto "fastify" (con esa grafía), los imports que no
// traen la fábrica: `import type { … }`, `import type * as X`, `import type X from` (con X distinto
// de `type`: `import type from "fastify"` es una importación por defecto con valor llamada `type`),
// `export type { … } from` y `export type * from`, la ampliación de tipos `declare module "fastify"`
// (middleware/tipos.ts) y `import { … }` cuyos nombres sean todos `type …`, errorCodes o
// LogController (middleware/ y handlers/ importan tipos). `@fastify/*`, `fastify-plugin` y otros
// paquetes no coinciden. La única referencia permitida fuera de app.ts es la sonda de la guarda a
// fastify/lib/head-route.js.
//
// Límite (O-12, se documenta en T-6 ter): un especificador del paquete armado en ejecución
// (concatenación, plantilla con expresión o una variable pasada a import(), require() o
// createRequire(…)()) no se puede cubrir con una regla de texto razonable; queda a la revisión de
// código, igual que los símbolos privados de Fastify (§E4-4).
// ---------------------------------------------------------------------------------------------
const COMILLA = "[\"'`]"
const FIN_DE_SEGMENTO = "(?=[\\\\/\"'`])"
const CUERPO = "[^\"'`\\n]*"
const ESPECIFICADOR_DE_FASTIFY = [
  `${COMILLA}(?:`,
  `fastify${FIN_DE_SEGMENTO}`,
  `|${CUERPO}node_modules[\\\\/]+fastify${FIN_DE_SEGMENTO}`,
  `|${CUERPO}[\\\\/]fastify[\\\\/]+(?:fastify\\.js|lib[\\\\/])`,
  `|file:${CUERPO}[\\\\/]fastify${FIN_DE_SEGMENTO}`,
  `)${CUERPO}${COMILLA}`,
].join("")
const ESPECIFICADOR_EXACTO = "[\"'`]fastify[\"'`]"
const VALORES_PERMITIDOS_DE_FASTIFY = new Set(["errorCodes", "LogController"])

// Formas permitidas: se quitan del texto antes de buscar referencias. Las importaciones de solo
// tipos exigen una de las formas con llaves, con espacio de nombres o con un identificador que no
// sea `type` ni `from` seguido de `from`.
const IMPORTACION_DE_TIPOS = [
  `\\bimport\\s+type\\s*\\{[^}]*\\}\\s*from\\s*${ESPECIFICADOR_EXACTO}`,
  `\\bimport\\s+type\\s*\\*\\s*as\\s+[A-Za-z_$][\\w$]*\\s+from\\s*${ESPECIFICADOR_EXACTO}`,
  `\\bimport\\s+type\\s+(?!(?:type|from)\\b)[A-Za-z_$][\\w$]*\\s+from\\s*${ESPECIFICADOR_EXACTO}`,
  `\\bexport\\s+type\\s*\\{[^}]*\\}\\s*from\\s*${ESPECIFICADOR_EXACTO}`,
  `\\bexport\\s+type\\s*\\*(?:\\s*as\\s+[A-Za-z_$][\\w$]*)?\\s*from\\s*${ESPECIFICADOR_EXACTO}`,
].map((forma) => new RegExp(forma, "g"))
const AMPLIACION_DE_TIPOS = new RegExp(`\\bdeclare\\s+module\\s+${ESPECIFICADOR_EXACTO}`, "g")
const IMPORTACION_CON_NOMBRES = new RegExp(
  `\\bimport\\s*\\{([^}]*)\\}\\s*from\\s*${ESPECIFICADOR_EXACTO}`,
  "g",
)

const nombresSinValor = (especificadores: string): boolean =>
  especificadores
    .split(",")
    .map((especificador) => especificador.trim())
    .filter((especificador) => especificador !== "")
    .every((especificador) => {
      if (especificador.startsWith("type ")) return true
      const nombre = especificador.split(/\s+as\s+/)[0] ?? ""
      return VALORES_PERMITIDOS_DE_FASTIFY.has(nombre.trim())
    })

const formaDeLaReferencia = (antes: string): string => {
  if (/\bimport\s*\(\s*$/.test(antes)) return "import()"
  if (/\brequire\s*\(\s*$/.test(antes)) return "require"
  if (/\)\s*\(\s*$/.test(antes)) return "createRequire"
  if (/\bfrom\s*$/.test(antes)) return "import o export from"
  if (/\bimport\s*$/.test(antes)) return "import sin nombres"
  return "referencia"
}

// Pura: las referencias al paquete "fastify" de un texto que no son tipos ni errorCodes ni
// LogController, con la vía y el especificador, por ejemplo `import o export from fastify`.
const referenciasAFastify = (texto: string): string[] => {
  let codigo = sinLineasDeComentario(texto)
  for (const forma of IMPORTACION_DE_TIPOS) codigo = codigo.replace(forma, "")
  codigo = codigo
    .replace(AMPLIACION_DE_TIPOS, "")
    .replace(IMPORTACION_CON_NOMBRES, (completa, nombres: string) =>
      nombresSinValor(nombres) ? "" : completa,
    )
  const referencias: string[] = []
  for (const coincidencia of codigo.matchAll(new RegExp(ESPECIFICADOR_DE_FASTIFY, "gi"))) {
    const antes = codigo.slice(Math.max(0, coincidencia.index - 80), coincidencia.index)
    referencias.push(`${formaDeLaReferencia(antes)} ${coincidencia[0].slice(1, -1)}`)
  }
  return referencias
}

// Archivos de código de un directorio, con cualquier extensión que Node o tsc ejecuten, sin las
// pruebas ni el cliente generado de Prisma. Rutas relativas al directorio, con "/".
const EXTENSIONES_DE_CODIGO = /\.(?:ts|mts|cts|js|mjs|cjs)$/
const ES_PRUEBA = /\.test\.(?:ts|mts|cts|js|mjs|cjs)$/

const archivosDeCodigoEn = (directorio: string): string[] =>
  readdirSync(directorio, { recursive: true, encoding: "utf8" })
    .map((ruta) => ruta.split(sep).join("/"))
    .filter(
      (ruta) =>
        EXTENSIONES_DE_CODIGO.test(ruta) &&
        !ES_PRUEBA.test(ruta) &&
        !ruta.includes("adapters/db/generated/"),
    )
    .sort()

describe("PR-CH-12g: la fábrica de Fastify solo en app.ts", () => {
  it("el control de la regla rechaza toda vía de obtener la fábrica o el paquete", () => {
    const rechazadas: [string, string][] = [
      ['import Fastify from "fastify"', "import o export from fastify"],
      ["import Fastify from 'fastify'", "import o export from fastify"],
      ['import Fastify, { type FastifyInstance } from "fastify"', "import o export from fastify"],
      ['import { fastify } from "fastify"', "import o export from fastify"],
      ['import { errorCodes, fastify as f } from "fastify"', "import o export from fastify"],
      ['import * as f from "fastify"', "import o export from fastify"],
      ['import Fastify from "fastify/fastify.js"', "import o export from fastify/fastify.js"],
      ['import type Fastify from "fastify/fastify.js"', "import o export from fastify/fastify.js"],
      ['export { default } from "fastify"', "import o export from fastify"],
      ['export * from "fastify"', "import o export from fastify"],
      ['import "fastify"', "import sin nombres fastify"],
      ['const f = require("fastify")', "require fastify"],
      ["const f = require('fastify/fastify.js')", "require fastify/fastify.js"],
      ['const f = createRequire(import.meta.url)("fastify")', "createRequire fastify"],
      ['const f = await import("fastify")', "import() fastify"],
      ["const f = await import('fastify')", "import() fastify"],
      ["const f = await import(`fastify`)", "import() fastify"],
      ['const f = await import("fastify/fastify.js")', "import() fastify/fastify.js"],
      // T-07 (a): `import type from` es una importación por defecto con valor, llamada `type`.
      ['import type from "fastify"', "import o export from fastify"],
      ['import type\n  from "fastify"', "import o export from fastify"],
      ['import type, { type FastifyInstance } from "fastify"', "import o export from fastify"],
      ['import type, { FastifyInstance } from "fastify"', "import o export from fastify"],
      ['import type from from "fastify"', "import o export from fastify"],
      // O-11: mayúsculas (en Windows "FASTIFY" resuelve al mismo paquete).
      ['import Fastify from "FASTIFY"', "import o export from FASTIFY"],
      ['const f = require("Fastify")', "require Fastify"],
    ]
    for (const [texto, esperada] of rechazadas) {
      expect(referenciasAFastify(texto), texto).toEqual([esperada])
    }
  })

  it("el control de la regla rechaza las rutas al archivo del paquete (T-07 c)", () => {
    const rutas = [
      'import Fastify from "../../node_modules/fastify/fastify.js"',
      'import Fastify from "node_modules/fastify/fastify.js"',
      'import Fastify from "/home/app/node_modules/fastify/fastify.js"',
      'import Fastify from "/home/app/node_modules/fastify"',
      'import Fastify from "file:///C:/proyecto/node_modules/fastify/fastify.js"',
      'import Fastify from "file:///C:/proyecto/node_modules/fastify/"',
      'import Fastify from "../fastify/fastify.js"',
      'const f = require("/abs/node_modules/fastify/lib/head-route.js")',
      'const f = require("/abs/x/fastify/lib/head-route.js")',
      'const f = createRequire(import.meta.url)("../node_modules/fastify/fastify.js")',
      'const f = await import("../../NODE_MODULES/Fastify/fastify.js")',
      'const f = require("C:\\\\proyecto\\\\node_modules\\\\fastify\\\\fastify.js")',
      "const f = await import(`/abs/node_modules/fastify/fastify.js`)",
    ]
    for (const texto of rutas) {
      expect(referenciasAFastify(texto), texto).toHaveLength(1)
    }
  })

  it("el control de la regla acepta tipos, errorCodes y LogController, y no cuenta comentarios ni otros paquetes", () => {
    const aceptadas = [
      'import type { FastifyInstance } from "fastify"',
      'import type Fastify from "fastify"',
      'import type FastifyDefecto from "fastify"',
      'import type * as Tipos from "fastify"',
      "import type { FastifyInstance } from 'fastify'",
      'import type {\n  FastifyInstance,\n  FastifyReply,\n} from "fastify"',
      'export type { FastifyInstance } from "fastify"',
      'export type * from "fastify"',
      'export type * as Tipos from "fastify"',
      'declare module "fastify" {\n  interface FastifyRequest {\n    usuarioId: string | null\n  }\n}',
      'import { errorCodes } from "fastify"',
      'import { LogController, type FastifyInstance } from "fastify"',
      'import { type FastifyInstance, errorCodes as codigos } from "fastify"',
      '// import Fastify from "fastify"',
      '// const f = require("fastify")',
      'import cookie from "@fastify/cookie"',
      'import fp from "fastify-plugin"',
      'const f = require("@fastify/cookie")',
      'const f = await import("fastify-plugin")',
      'import { algo } from "../fastify-ayudas.js"',
      'import cookie from "../node_modules/@fastify/cookie/index.js"',
      'import fp from "../node_modules/fastify-plugin/plugin.js"',
      'import otro from "./fastify/otro.js"',
      'import { x } from "../lib/fastify.js"',
    ]
    for (const texto of aceptadas) {
      expect(referenciasAFastify(texto), texto).toEqual([])
    }
  })

  it("el recorrido lee .ts, .mts, .cts, .js, .mjs y .cjs, no las pruebas, y rechaza un .mts de ejemplo (T-07 b)", () => {
    const directorio = mkdtempSync(join(tmpdir(), "higiene-12g-"))
    try {
      mkdirSync(join(directorio, "adapters/db/generated"), { recursive: true })
      for (const nombre of ["a.ts", "b.mts", "c.cts", "d.js", "e.mjs", "f.cjs"]) {
        writeFileSync(join(directorio, nombre), 'import Fastify from "fastify"\n')
      }
      for (const nombre of ["g.test.ts", "h.md", "adapters/db/generated/i.ts"]) {
        writeFileSync(join(directorio, nombre), 'import Fastify from "fastify"\n')
      }

      const archivos = archivosDeCodigoEn(directorio)
      const marcados = archivos.filter(
        (ruta) => referenciasAFastify(readFileSync(join(directorio, ruta), "utf8")).length > 0,
      )

      expect(archivos).toEqual(["a.ts", "b.mts", "c.cts", "d.js", "e.mjs", "f.cjs"])
      expect(marcados).toContain("b.mts")
      expect(marcados).toEqual(archivos)
    } finally {
      rmSync(directorio, { recursive: true, force: true })
    }
  })

  it("solo app.ts obtiene la fábrica y la única otra referencia es la sonda de la guarda a fastify/lib/head-route.js", () => {
    const raiz = join(RAIZ_DEL_BACKEND, "src")
    const archivos = archivosDeCodigoEn(raiz)
    expect(archivos.length, "Precondición: se recorrieron archivos de src").toBeGreaterThan(50)

    const conReferencias = archivos
      .map((ruta) => [ruta, referenciasAFastify(readFileSync(join(raiz, ruta), "utf8"))] as const)
      .filter(([, referencias]) => referencias.length > 0)

    expect(conReferencias, "Un método prestado de otra instancia saltaría la guarda (H-8)").toEqual(
      [
        ["app.ts", expect.any(Array)],
        ["middleware/guarda-de-rutas.ts", ["createRequire fastify/lib/head-route.js"]],
      ],
    )
  })
})
