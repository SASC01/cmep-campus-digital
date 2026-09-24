import { spawnSync } from "node:child_process"
import { randomBytes } from "node:crypto"
import { readFileSync } from "node:fs"
import { createRequire } from "node:module"
import { fileURLToPath } from "node:url"

import { PostgreSqlContainer, type StartedPostgreSqlContainer } from "@testcontainers/postgresql"
import type { TestProject } from "vitest/node"

import {
  ADMIN_DE_PRUEBAS,
  NOMBRE_BASE_DE_PRUEBAS,
  USUARIO_BASE_DE_PRUEBAS,
  validarUrlDePruebas,
  variablesDeEntorno,
  type EntornoDePruebas,
} from "./entorno-de-pruebas.js"

// Base desechable por corrida (CHORE-01). Corre una vez en el proceso principal de Vitest: levanta
// PostgreSQL con Testcontainers y la misma imagen que infra, aplica las migraciones con prisma
// migrate deploy, crea el único administrador con seed:admin y entrega el entorno a las pruebas con
// provide/inject. Ni backend/.env ni campus_dev intervienen. Si la corrida se interrumpe, Ryuk (el
// contenedor vigilante de Testcontainers) borra la base.
const DIRECTORIO_BACKEND = fileURLToPath(new URL("..", import.meta.url))
const COMPOSE_DE_INFRA = new URL("../../infra/docker-compose.yml", import.meta.url)

// Única fuente de la imagen: infra/docker-compose.yml. Si infra cambia de versión, las pruebas también.
const imagenDePostgres = (): string => {
  const texto = readFileSync(COMPOSE_DE_INFRA, "utf8")
  const imagenes = [...texto.matchAll(/^\s*image:\s*(postgres:\S+)\s*$/gm)]
  const imagen = imagenes[0]?.[1]
  if (imagenes.length !== 1 || imagen === undefined) {
    throw new Error(
      "infra/docker-compose.yml debe declarar exactamente una imagen postgres:<etiqueta>",
    )
  }
  return imagen
}

// M-01 (CHORE-01): Testcontainers 12.1 publica los puertos sin HostIp, es decir, en todas las
// interfaces del anfitrión, y no ofrece una opción pública para fijarla. Justo antes de crear el
// contenedor se ata cada enlace a 127.0.0.1, como infra. Ryuk no pasa por aquí (mitigacion-ryuk.md).
class PostgreSqlSoloEnLoopback extends PostgreSqlContainer {
  protected override async beforeContainerCreated(): Promise<void> {
    await super.beforeContainerCreated?.()
    // @types/dockerode tipa PortBindings como any; se lee con la forma que le da withExposedPorts.
    const enlaces: Record<string, { HostIp?: string; HostPort?: string }[]> =
      this.hostConfig.PortBindings ?? {}
    this.hostConfig.PortBindings = Object.fromEntries(
      Object.entries(enlaces).map(([puerto, lista]) => [
        puerto,
        lista.map((enlace) => ({ ...enlace, HostIp: "127.0.0.1" })),
      ]),
    )
  }
}

const iniciarContenedor = async (
  imagen: string,
  contrasena: string,
): Promise<StartedPostgreSqlContainer> => {
  try {
    return await new PostgreSqlSoloEnLoopback(imagen)
      .withDatabase(NOMBRE_BASE_DE_PRUEBAS)
      .withUsername(USUARIO_BASE_DE_PRUEBAS)
      .withPassword(contrasena)
      .start()
  } catch (error) {
    throw new Error(
      "No se pudo levantar PostgreSQL de pruebas con Testcontainers. Enciende Docker Desktop y vuelve a correr las pruebas.",
      { cause: error },
    )
  }
}

// Con node directo y sin shell: en Windows, lanzar npx (un .cmd) sin shell falla.
const ejecutarConNode = (argumentos: string[], env: NodeJS.ProcessEnv, paso: string): void => {
  const resultado = spawnSync(process.execPath, argumentos, {
    cwd: DIRECTORIO_BACKEND,
    env,
    encoding: "utf8",
  })
  if (resultado.status === 0) return
  throw new Error(
    `${paso} falló contra la base de pruebas (código ${String(resultado.status)}): ${resultado.error?.message ?? ""}\n${resultado.stderr}${resultado.stdout}`,
  )
}

const prepararBaseDePruebas = async (project: TestProject): Promise<() => Promise<void>> => {
  const imagen = imagenDePostgres()
  const contrasena = randomBytes(24).toString("hex")
  const contenedor = await iniciarContenedor(imagen, contrasena)

  try {
    // En Windows "localhost" puede resolver primero a ::1 (misma nota que backend/.env.example).
    const host = contenedor.getHost() === "localhost" ? "127.0.0.1" : contenedor.getHost()
    const entorno: EntornoDePruebas = {
      databaseUrl: `postgresql://${USUARIO_BASE_DE_PRUEBAS}:${contrasena}@${host}:${contenedor.getPort()}/${NOMBRE_BASE_DE_PRUEBAS}`,
      jwtSecret: randomBytes(48).toString("base64url"),
      adminEmail: ADMIN_DE_PRUEBAS.email,
      adminNombre: ADMIN_DE_PRUEBAS.nombre,
      adminPassword: randomBytes(24).toString("base64url"),
    }
    const problema = validarUrlDePruebas(entorno.databaseUrl)
    if (problema !== null) throw new Error(`Guarda de la base de pruebas: ${problema}`)

    const envDeLosPasos = { ...process.env, ...variablesDeEntorno(entorno) }
    const cliDePrisma = createRequire(import.meta.url).resolve("prisma/build/index.js")
    ejecutarConNode([cliDePrisma, "migrate", "deploy"], envDeLosPasos, "prisma migrate deploy")
    ejecutarConNode(["--import", "tsx", "src/scripts/seed-admin.ts"], envDeLosPasos, "seed:admin")

    project.provide("entornoDePruebas", entorno)
  } catch (error) {
    await contenedor.stop()
    throw error
  }

  return async () => {
    await contenedor.stop()
  }
}

export default prepararBaseDePruebas
