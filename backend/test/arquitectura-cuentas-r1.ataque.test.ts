import { readdirSync, readFileSync, statSync } from "node:fs"
import { join, relative, sep } from "node:path"
import { fileURLToPath } from "node:url"

import { describe, expect, it } from "vitest"

// Ataque del Tester (AUTH-02a, ronda 1): revisión estática automatizada de las capas (AGENTS.md,
// reglas 1, 2, 4, 11 y 12) sobre el código de producción de backend/src (sin pruebas ni el cliente
// generado de Prisma). Convierte en prueba las búsquedas de V-13 para que no dependan de una
// verificación manual.

const RAIZ_BACKEND = fileURLToPath(new URL("..", import.meta.url))
const SRC = join(RAIZ_BACKEND, "src")
const RAIZ_REPO = join(RAIZ_BACKEND, "..")

const listar = (directorio: string): string[] => {
  const archivos: string[] = []
  for (const nombre of readdirSync(directorio)) {
    const ruta = join(directorio, nombre)
    if (statSync(ruta).isDirectory()) {
      if (nombre === "generated" || nombre === "node_modules") continue
      archivos.push(...listar(ruta))
    } else if (/\.(ts|mts|cts|js|mjs)$/.test(nombre) && !/\.test\.ts$/.test(nombre)) {
      archivos.push(ruta)
    }
  }
  return archivos
}

// Ruta relativa a backend/src con "/" (independiente de Windows).
const rel = (ruta: string): string => relative(SRC, ruta).split(sep).join("/")

// Quita comentarios de línea y de bloque para no contar menciones en la documentación del código.
const sinComentarios = (texto: string): string =>
  texto.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`])\/\/.*$/gm, "$1")

const fuentes = listar(SRC).map((ruta) => ({
  ruta: rel(ruta),
  codigo: sinComentarios(readFileSync(ruta, "utf8")),
}))

const donde = (patron: RegExp): string[] =>
  fuentes.filter(({ codigo }) => patron.test(codigo)).map(({ ruta }) => ruta)

describe("ataque: capas y proveedores (revisión estática)", () => {
  it("hay código que revisar (precondición)", () => {
    expect(fuentes.length).toBeGreaterThan(20)
  })

  it("pg-boss solo se importa en adapters/queue/index.ts", () => {
    expect(donde(/from\s+["']pg-boss["']|import\(\s*["']pg-boss["']\s*\)/)).toEqual([
      "adapters/queue/index.ts",
    ])
  })

  it("resend solo se importa y se construye en adapters/notifier/resend.ts", () => {
    expect(donde(/from\s+["']resend["']|import\(\s*["']resend["']\s*\)|new\s+Resend\s*\(/)).toEqual(
      ["adapters/notifier/resend.ts"],
    )
  })

  it("nadie fuera de adapters/ y del arranque del worker toca adapters/notifier", () => {
    const usos = donde(/adapters\/notifier|\.\.?\/notifier\//).filter(
      (ruta) => !ruta.startsWith("adapters/"),
    )
    expect(usos).toEqual(["worker.ts"])
  })

  it("exactamente un $queryRawUnsafe (en ejecutorSqlDe) y ningún $executeRawUnsafe", () => {
    const inseguros = fuentes.flatMap(({ ruta, codigo }) =>
      [...codigo.matchAll(/\$queryRawUnsafe/g)].map(() => ruta),
    )
    expect(inseguros).toEqual(["adapters/db/cliente.ts"])
    expect(donde(/\$executeRawUnsafe/)).toEqual([])
  })

  it("executeSql solo aparece dentro de adapters/ (incluidos corchetes y desestructuración)", () => {
    const fuera = donde(/executeSql/).filter((ruta) => !ruta.startsWith("adapters/"))
    expect(fuera).toEqual([])
  })

  it("handlers/, middleware/ y workers/ no obtienen el cliente de Prisma (obtenerDb ni adapters/db/cliente)", () => {
    // adapters/db/index.ts no reexporta obtenerDb "a propósito; solo las pruebas lo importan
    // directamente desde ./cliente.js" (AUTH-01, DEC-10 y V-17).
    const capas = fuentes.filter(({ ruta }) => /^(handlers|middleware|workers)\//.test(ruta))
    const conCliente = capas
      .filter(({ codigo }) => /adapters\/db\/cliente|obtenerDb\s*\(/.test(codigo))
      .map(({ ruta }) => ruta)
    expect(conCliente).toEqual([])
  })

  it("los handlers no declaran políticas de límite propias: la política vive en core/", () => {
    const conPolitica = fuentes
      .filter(({ ruta }) => ruta.startsWith("handlers/"))
      .filter(({ codigo }) => /:\s*PoliticaIntentos\s*=/.test(codigo))
      .map(({ ruta }) => ruta)
    expect(conPolitica).toEqual([])
  })

  it("ningún archivo nuevo de AUTH-02a usa console. ni menciona estadoPago", () => {
    const nuevos = fuentes.filter(({ ruta }) =>
      [
        "adapters/queue/",
        "adapters/notifier/",
        "adapters/db/tokens-cuenta.ts",
        "adapters/auth/tokens-cuenta.ts",
        "adapters/auth/contrasena-temporal.ts",
        "handlers/admin.ts",
        "handlers/auth/cuentas.ts",
        "workers/",
        "worker.ts",
        "core/correo/",
        "core/eventos/",
        "config/correo.ts",
        "config/cola.ts",
      ].some((prefijo) => ruta.startsWith(prefijo)),
    )
    expect(nuevos.length).toBeGreaterThan(10)
    expect(nuevos.filter(({ codigo }) => /console\./.test(codigo)).map(({ ruta }) => ruta)).toEqual(
      [],
    )
    expect(
      nuevos.filter(({ codigo }) => /estadoPago/.test(codigo)).map(({ ruta }) => ruta),
    ).toEqual([])
  })

  it("ninguna dependencia de AWS ni otra librería de correo o de cola en los package.json", () => {
    const prohibidas =
      /^(aws-|@aws-sdk\/|aws-sdk$|nodemailer|@sendgrid\/|mailgun|postmark|@react-email\/|bullmq$|ioredis$|firebase|@supabase\/|@vercel\/)/
    const encontradas: string[] = []
    for (const paquete of [
      "package.json",
      "backend/package.json",
      "shared/package.json",
      "frontend/package.json",
    ]) {
      const json = JSON.parse(readFileSync(join(RAIZ_REPO, paquete), "utf8")) as Record<
        string,
        Record<string, string> | undefined
      >
      for (const campo of [
        "dependencies",
        "devDependencies",
        "optionalDependencies",
        "peerDependencies",
      ]) {
        for (const nombre of Object.keys(json[campo] ?? {})) {
          if (prohibidas.test(nombre)) encontradas.push(`${paquete}: ${nombre}`)
        }
      }
    }
    expect(encontradas).toEqual([])
  })
})
