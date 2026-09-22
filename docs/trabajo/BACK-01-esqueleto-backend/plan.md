# Plan — BACK-01: esqueleto del backend (`backend/`, `shared/`, monorepo npm)
Estado: LISTO
Carril: sensible
Enmiendas: Enmienda 1 (2026-09-21) — Prisma 7
Requisitos: ninguno del PRD (andamiaje, sin `RF-xx`). Reglas aplicables: `AGENTS.md` reglas 1 (capas), 9 (secretos), 10 (esquema solo por migraciones), 11 (proveedores), 13 (nada sensible en logs); `ARCHITECTURE-ESSENTIALS.md` secciones Stack, Capas del backend, Reglas de datos y Operación; `CLAUDE.md` "Manejo de errores en el backend" y "Estilo de código".

## Flujo autorizado para este encargo
El humano autorizó, **solo para BACK-01**, el mismo flujo abreviado de INFRA-01:
1. `arquitecto` entrega este `plan.md`.
2. **El humano aprueba el plan de forma explícita y por escrito** (carril sensible).
3. `programador` implementa exactamente este plan y entrega `resumen-programador.md`.
4. `manager` (modo final) revisa y emite `revision.md`; ejecuta por su cuenta `lint`, `test` y `build`.
5. **El humano revisa el diff** y decide el commit. Ningún agente hace `git add`, `commit` ni `push`.

Sin `tester` (no hay comportamiento de negocio que atacar) y sin revisión del Manager en modo plan (la sustituye la aprobación escrita). La excepción no modifica `AGENTS.md` ni aplica a otros encargos.

**Por qué carril sensible:** crea la primera migración de Prisma (`AGENTS.md` lo marca sensible), instala dependencias (requiere confirmación), borra archivos (`.gitkeep`, requiere confirmación) y fija la base sobre la que se apoyará `middleware/` y `adapters/auth`. Ninguna de esas cosas cabe en "normal".

### Qué autoriza la aprobación de este plan (y nada más)
- **Crear** los archivos de la sección "Archivos"; **modificar** `README.md`, `.gitignore`; **borrar** `backend/.gitkeep`, `shared/.gitkeep` y `frontend/.gitkeep` (borrado con `rm`, sin `git rm`).
- **Instalar** solo las dependencias de la tabla "Dependencias" (rangos `^` por versión mayor), con un único `npm install` desde la raíz (repetible si cambia un `package.json` durante el encargo). `package-lock.json` se versiona. Antes: `npm view <paquete> version` y `npm view <paquete> dist-tags` para fijar la versión real. Prohibido: `npm install -g`, `npm publish`, paquetes fuera de la tabla, `npm audit fix`.
- **Ejecutar**: `npm run <script>` de los scripts de este plan; `npx prisma validate`, `npx prisma format`, `npx prisma generate`, `npx prisma migrate status`; **una sola** creación de migración: `npx prisma migrate dev --create-only --name extensiones_iniciales` seguida de **una sola** aplicación `npx prisma migrate dev` (contra `DATABASE_URL` de `backend/.env`, que apunta al PostgreSQL de infra en `127.0.0.1:5433`); `npx tsc`, `npx vitest`, `npx eslint`, `npx prettier`; arrancar y detener procesos locales de Node (`taskkill`, `Stop-Process`); `curl.exe` contra `127.0.0.1`; en `infra/`: `docker compose ps`, `docker compose up -d`, `docker compose exec -T postgres psql ... -c "SELECT ..."` (solo lectura); git de solo lectura (`status`, `diff`, `check-ignore`, `ls-files`); **diagnóstico de solo lectura** (`Get-NetTCPConnection`, `Get-Process`, `node --version`, `npm --version`, `od`, `wc`, `grep`, `tail`), cláusula que el Manager pidió en INFRA-01.
- Copiar `backend/.env.example` a `backend/.env` solo si no existe. Si el puerto 3000 está ocupado, cambiar `PORT` **solo en `backend/.env`** (no versionado) y reportarlo.
- **No autoriza:** `prisma migrate reset`, `prisma db push`, `prisma db execute`, `prisma migrate deploy`, `prisma migrate resolve`, una segunda migración, editar `infra/*` o `infra/.env`, `docker compose down -v`, tocar `AGENTS.md`, `CLAUDE.md`, `.claude/`, `docs/ARCHITECTURE*.md`, `docs/PRD.md`, `.gitattributes`, ni crear código en `frontend/` más allá de su `package.json`.

## Enmienda 1 — 2026-09-21 — Prisma 7
**Motivo.** El humano aprobó el plan por escrito (`aprobacion.md`, carril sensible) con una enmienda a P-01: **Prisma 7, no 6**. P-02 a P-05 quedan con su valor por defecto. Esta sección registra lo que la enmienda implica; el resto del plan se actualizó solo donde la enmienda lo toca (Dependencias, Archivos, DEC-01/DEC-01a, DEC-07, código mínimo de `adapters/db`, configuración de herramientas, Migración inicial, README, R-01/R-03/R-06, V-02/V-07/V-09/V-15/V-16, puntos del Manager y Pasos). Nada más cambia: ni las 5 variables de entorno, ni puertos, ni `shared/`, ni el diseño de `/api/salud`, ni el flujo.

### Condición de verificación y camino de retorno a Prisma 6 (exigida por el humano)
El programador, **antes de crear cualquier archivo** (paso 2), ejecuta y copia la salida real de:
1. `npm view prisma dist-tags.latest` → debe ser `7.x`.
2. `npm view @prisma/client dist-tags.latest` → debe ser `7.x` y **la misma versión** que la anterior.
3. `npm view @prisma/adapter-pg dist-tags.latest` → debe ser `7.x`, la misma versión que las anteriores.
4. `npm view @prisma/adapter-pg peerDependencies` → debe listar `pg` (rango esperado `^8`) **[verificar]**; y `npm view pg dist-tags.latest` → `8.x`.
5. `npm view prisma@7 version`, `npm view @prisma/client@7 version`, `npm view @prisma/adapter-pg@7 version` → devuelven al menos una versión cada uno.

**Criterio de éxito:** las cinco comprobaciones pasan. Entonces implementa **DEC-01a** (Prisma 7) tal como se describe abajo.

**Camino de retorno:** si **cualquiera** falla (por ejemplo `latest` no es `7.x`, `@prisma/adapter-pg` no existe en 7 o no declara `pg` como dependencia de par), el programador **se detiene ahí**, lo reporta con la salida del comando que falló, confirma `npm view prisma@6 version` y **vuelve a Prisma 6 tal como estaba en el plan original**: implementa **DEC-01 (original, Prisma 6)** sin más cambios (rangos `^6`, generador `prisma-client-js`, `url = env("DATABASE_URL")` en el schema, sin `prisma.config.ts`, sin `@prisma/adapter-pg`, sin `pg`, `adapters/db/cliente.ts` con `new PrismaClient()`), y el orquestador avisa al humano. En ese caso, en cada punto marcado "(Enmienda 1)" en este plan aplica la variante "(original)".

### Qué cambia con Prisma 7 (solo si la verificación pasa)
- **Paquetes:** `prisma ^7` (devDeps), `@prisma/client ^7`, `@prisma/adapter-pg ^7` (misma versión exacta que `@prisma/client`), `pg ^8` (dependencia de par del adaptador, se instala explícitamente). `@types/pg` **no** se instala: ningún archivo propio importa `pg` directamente (con `new PrismaPg({ connectionString })` no hace falta).
- **`backend/prisma.config.ts`** (nuevo, versionado, ESM, se lintea y formatea como el resto; no entra al `tsconfig` de build porque `include` es `["src"]`):
  ```ts
  import { defineConfig, env } from "prisma/config" // [verificar] que `env` se exporte desde "prisma/config"

  // El CLI de Prisma 7 no carga .env por su cuenta. Sin dotenv (DEC-03): en dev lee backend/.env;
  // en prod las variables vienen del entorno y el archivo no existe.
  try {
    process.loadEnvFile(new URL(".env", import.meta.url))
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error
  }

  export default defineConfig({
    schema: "prisma/schema.prisma",            // [verificar] nombre de la opción
    migrations: { path: "prisma/migrations" }, // [verificar] nombre de la opción
    datasource: { url: env("DATABASE_URL") },  // [verificar] forma; alternativa: process.env.DATABASE_URL
  })
  ```
  Es el **único** archivo del backend, junto con `config/env.ts` y `test/setup.ts`, que lee `process.env`/`.env`; no forma parte de `adapters/` ni de `core/`. Antes de escribirlo, el programador confirma la API real con `node_modules/prisma/README.md`, `npx prisma init --help` y, si hace falta, un `npx prisma init` en una carpeta temporal **fuera del repositorio** (el scratchpad de la sesión), que borra después; ambos comandos quedan autorizados por esta enmienda solo con ese fin.
- **`backend/prisma/schema.prisma`:**
  ```prisma
  generator client {
    provider               = "prisma-client"
    output                 = "../src/adapters/db/generated"
    runtime                = "nodejs"   // [verificar] opción y valor
    moduleFormat           = "esm"      // [verificar] opción y valor
    importFileExtension    = "js"       // [verificar] opción y valor; necesario con NodeNext + verbatimModuleSyntax
    generatedFileExtension = "ts"       // [verificar] si existe; si no existe, omitir
  }

  datasource db {
    provider = "postgresql"
    // sin url: la URL vive en prisma.config.ts
  }
  ```
  Sin modelos, sin `previewFeatures`. El `output` es relativo al archivo `schema.prisma` (`backend/prisma/`), por lo que apunta a `backend/src/adapters/db/generated/`.
- **Carpeta generada `backend/src/adapters/db/generated/`:** solo `adapters/db` la importa (regla de capas); **ignorada por git** (`backend/src/adapters/db/generated/` en `.gitignore`); regenerada por los hooks `pre*` que ya ejecutan `prisma generate`; excluida de ESLint (`ignores`) y de Prettier (`.prettierignore`). Queda dentro de `include ["src"]` de `backend/tsconfig.json` porque `cliente.ts` la importa; `skipLibCheck` ya está en la base. **Si el código generado no compila** bajo el `tsconfig` estricto del plan (`exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`, `verbatimModuleSyntax`), el programador ajusta **solo** la exclusión/inclusión del directorio generado (por ejemplo `exclude` en `backend/tsconfig.json` o la opción `generatedFileExtension` **[verificar]**) y lo reporta; **no relaja el `tsconfig` global** ni desactiva opciones estrictas.
- **`adapters/db/cliente.ts`** (Enmienda 1):
  ```ts
  import { PrismaPg } from "@prisma/adapter-pg"
  import { PrismaClient } from "./generated/client.js" // [verificar] ruta y nombre del archivo de entrada generado

  let cliente: PrismaClient | undefined

  export const inicializarDb = ({ connectionString }: { connectionString: string }): void => {
    if (cliente) return
    const adapter = new PrismaPg({ connectionString }) // [verificar] firma del constructor
    cliente = new PrismaClient({ adapter })
  }

  export const obtenerDb = (): PrismaClient => {
    if (!cliente) throw new AppError("BASE_DE_DATOS_NO_INICIALIZADA", "La base de datos no está inicializada.", 500)
    return cliente
  }

  export const cerrarConexion = async (): Promise<void> => {
    await cliente?.$disconnect()
    cliente = undefined
  }
  ```
  El `connectionString` llega desde `env.DATABASE_URL` **ya validada** por `config/env.ts`: `construirApp({ env })` llama a `inicializarDb({ connectionString: env.DATABASE_URL })` antes de registrar los plugins; `adapters/` **no** lee `process.env`. `adapters/db/salud.ts` usa `obtenerDb().$queryRaw\`SELECT 1\`` (igual que antes). `adapters/db/index.ts` reexporta `inicializarDb`, `verificarConexion` y `cerrarConexion`; ni `prisma` ni `obtenerDb` se reexportan. `AppError` viene de `core/errores.ts` (adapters sí puede importar core).
- **Regla de capas (DEC-07):** fuera de `backend/src/adapters/**` se prohíbe importar, además de `@prisma/client`, `@prisma/adapter-pg`, `pg` y cualquier ruta que contenga `adapters/db/generated`. V-15 lo comprueba.
- **Migración:** `npx prisma migrate dev --create-only --name extensiones_iniciales` y `npx prisma migrate dev` funcionan igual, leyendo la URL desde `prisma.config.ts` (que a su vez carga `backend/.env`). Sin `previewFeatures postgresqlExtensions`. Mismo SQL. Misma base sombra y misma tabla `_prisma_migrations`.
- **`prisma generate` en los hooks `pre*`, `prisma validate` y `prisma format`:** iguales; todos leen `prisma.config.ts` desde `backend/`. Ningún comando de `AGENTS.md` cambia.
- **Motores nativos (R-06):** el cliente de Prisma 7 no descarga ni carga motor de consultas nativo cuando corre con adaptador de driver **[verificar]**; el CLI puede seguir descargando el motor de esquema para `migrate` y `validate` (requiere red en `npm install`).

### Qué no cambia
Las 5 variables de entorno y sus reglas zod; `DATABASE_URL` sigue siendo la única fuente de la conexión (la leen `config/env.ts` para la API/worker y `prisma.config.ts` para el CLI). Puertos, `HOST`, `shared/`, el contrato y el flujo de `GET /api/salud`, el plugin de errores, los scripts de `package.json`, `worker.ts`, la migración `extensiones_iniciales` y su SQL, el flujo abreviado del encargo y la propuesta para `AGENTS.md`.

### Fuera del alcance de esta enmienda (se anota para el encargo que corresponda)
`ARCHITECTURE.md` §6 ejecuta `npx prisma migrate deploy` en el Droplet: con Prisma 7 la imagen de Docker deberá incluir `prisma.config.ts` y `prisma/` junto al `dist/`. BACK-01 no crea Dockerfile; queda para el encargo de despliegue.

### Nota sobre DOCS-01
Los pendientes 5 (alinear `AGENTS.md` "Pruebas", `ESSENTIALS` y `ARCHITECTURE.md` §2 con la decisión de C-01) y 6 (comentario cruzado de `DATABASE_URL` en `infra/.env.example`, P-05) quedaron anotados en `aprobacion.md` para DOCS-01. Esta enmienda no los modifica.

## Preguntas bloqueantes
Ninguna. Todas las decisiones tienen un valor por defecto razonable y reversible.

## Preguntas no bloqueantes (con valor por defecto)
| # | Pregunta | Valor por defecto | Si el humano elige lo contrario |
|---|---|---|---|
| P-01 | ¿Prisma 6 o Prisma 7? | ~~**Prisma 6** (`^6`). Ver DEC-01~~ **Respondida: Prisma 7 (Enmienda 1, DEC-01a), con verificación previa y camino de retorno a DEC-01 original** | Prisma 7: se agregan `prisma.config.ts`, `@prisma/adapter-pg` y `pg`; el generador pasa a `prisma-client` con `output`; `prisma.config.ts` debe llamar a `process.loadEnvFile()` porque el CLI 7 no carga `.env`. Requiere replanear DEC-01 y V-07 (hecho en la Enmienda 1) |
| P-02 | ¿Nombres de paquete `@campus/shared`, `@campus/backend`, `@campus/frontend`? ESSENTIALS no fija ninguno | **Sí** (confirmado) | Renombrar en los tres `package.json` y en las importaciones de `@campus/shared` |
| P-03 | `worker.ts`: ¿arranque mínimo sin pg-boss, o instalar pg-boss ya? | **Sin pg-boss.** Ver DEC-06 (confirmado) | Agregar `pg-boss ^10` a la tabla de dependencias, `adapters/queue/` con `start()`/`stop()` y una prueba de arranque; el esquema `pgboss` aparecería en la base de infra fuera de las migraciones de Prisma |
| P-04 | `AGENTS.md`: el comentario "Vitest (integración con Testcontainers)" y el bloque "Pruebas" ya no describen BACK-01. ¿Se ajusta ahora (una línea, la aplica el orquestador) o en DOCS-01? | **Ahora, solo el comentario del comando** (texto exacto en "AGENTS.md") (confirmado). El párrafo de "Pruebas" va a DOCS-01 | Todo a DOCS-01; queda registrado en C-01 |
| P-05 | `DATABASE_URL` queda duplicada en `infra/.env.example` y `backend/.env.example`. ¿Se acepta la duplicación con comentario cruzado? | **Sí** (confirmado). El CLI de Prisma 6 solo lee `backend/.env` (con Prisma 7, `prisma.config.ts` carga ese mismo `backend/.env`; la conclusión no cambia); apuntar a `../infra/.env` obligaría a banderas en cada comando de `AGENTS.md` | Alternativa: `dev`/`test` cargan además `--env-file-if-missing=../infra/.env`; el CLI de Prisma seguiría necesitando `backend/.env`, así que la deriva no desaparece |

## Contradicciones entre documentos (reportadas, no bloquean)
- **C-01.** `AGENTS.md` (Comandos y Pruebas), `ESSENTIALS` (Stack) y `ARCHITECTURE.md` §2 fijan Testcontainers para integración. El humano decidió que en BACK-01 la prueba de integración use el PostgreSQL de infra. No se cambia la decisión: Testcontainers llega en un encargo posterior (propuesto: el primer encargo con repositorios reales). Se anota para DOCS-01.
- **C-02.** `ARCHITECTURE.md` §7 lista `GET /salud`; ESSENTIALS dice `GET /api/salud`. No hay conflicto real: §7 declara "prefijo `/api`" y su tabla omite el prefijo. Se implementa `/api/salud`.
- **C-03.** `ARCHITECTURE.md` §5 muestra `backend/prisma/` fuera de `src/`; `CLAUDE.md` dice "`prisma/` schema.prisma y migraciones (en backend/prisma)". Coinciden: `backend/prisma/`. Sin acción.

## Suposiciones
- **S-01.** Node `v24.11.1` y npm `11.6.2` instalados (dato del encargo). El programador confirma con `node --version` y `npm --version`, y verifica que 24 siga siendo la LTS activa (`npm view node dist-tags` no aplica; basta la tabla de versiones de nodejs.org o `node -p process.release.lts`).
- **S-02.** No tengo red ni terminal: **ninguna versión de parche de este plan está verificada**. Solo se fijan versiones mayores y rangos `^`; el programador fija las reales con `npm view` y las reporta. Los detalles de la API de Prisma 7 marcados **[verificar]** en la Enmienda 1 se confirman contra el paquete instalado.
- **S-03.** El entorno de infra está levantado durante la implementación (`docker compose ps` en `infra/` muestra `postgres` `healthy` en `127.0.0.1:5433`). Si no, el programador lo levanta con `docker compose up -d` (autorizado).
- **S-04.** El programador ejecuta en Git Bash; los comandos del README se escriben para PowerShell 5.1 (sin `&&`, `curl.exe`). Los scripts de npm sí pueden usar `&&` (los ejecuta `cmd.exe`/`sh`, no PowerShell).
- **S-05.** El usuario `campus` es superusuario en el contenedor (imagen oficial), así que `prisma migrate dev` puede crear y borrar su base sombra sin `shadowDatabaseUrl`.
- **S-06.** `prisma generate` funciona con un esquema sin modelos (`PrismaClient` con `$queryRaw`). Si fallara, el programador se detiene y reporta; **no agrega un modelo de relleno**.

## Alcance
**Entra:** monorepo npm con workspaces `shared`, `backend`, `frontend` (este último solo `package.json`); `shared/` con dos esquemas zod (respuesta de `/api/salud` y formato de error); `backend/` con capas, `construirApp()`, `server.ts`, `worker.ts` mínimo, plugin de errores, `AppError`, `adapters/db` con Prisma y `verificarConexion()`, `GET /api/salud`, validación de env con zod, logger pino JSON con `redact`; **Prisma 7 (Enmienda 1; Prisma 6 si aplica el camino de retorno)** con `prisma.config.ts`, `schema.prisma` sin modelos y **una** migración con las dos extensiones; ESLint 9 flat + Prettier; Vitest con dos pruebas unitarias de `core/` y dos de integración; scripts de `AGENTS.md`; `.nvmrc`; `tsconfig.base.json`; `.gitignore`; README.

**No entra:** autenticación, `middleware/` con código, tablas de negocio, pg-boss, Testcontainers, `@fastify/cors|helmet|rate-limit` (no hay origen de frontend aún), Dockerfile y Compose de `prod`, CI, `frontend/src`, `docs/ARCHITECTURE*.md`, `docs/OPERACION.md`, linting con reglas de tipos (`recommendedTypeChecked`), `seed:admin`/`reset:admin` reales.

## Archivos
| Acción | Ruta | Contenido |
|---|---|---|
| Crear | `package.json` | Raíz, privado: `workspaces`, `engines`, scripts globales, devDependencies de herramientas |
| Crear | `package-lock.json` | Lo genera `npm install`; se versiona |
| Crear | `.nvmrc` | `24` |
| Crear | `tsconfig.base.json` | Opciones estrictas comunes |
| Crear | `eslint.config.mjs` | Flat config compartida, con `no-restricted-imports` por capa |
| Crear | `.prettierrc.json`, `.prettierignore` | Estilo de `CLAUDE.md` |
| Modificar | `.gitignore` | Agregar `*.tsbuildinfo`, `.eslintcache` y (Enmienda 1) `backend/src/adapters/db/generated/`; terminar en salto de línea |
| Crear | `frontend/package.json` | Workspace vacío y privado |
| Crear | `shared/package.json`, `shared/tsconfig.json` | Paquete `@campus/shared`, ESM, `exports` → `dist/` |
| Crear | `shared/src/index.ts`, `shared/src/salud.ts`, `shared/src/errores.ts` | Esquemas zod y tipos inferidos |
| Crear | `backend/package.json`, `backend/tsconfig.json`, `backend/vitest.config.ts` | Paquete `@campus/backend` |
| Crear (Enmienda 1) | `backend/prisma.config.ts` | `defineConfig` con schema, migraciones y `datasource.url`; carga `backend/.env` con `process.loadEnvFile()`. **No existe** en el camino de retorno a Prisma 6 |
| Crear | `backend/.env.example` | 5 variables |
| Crear | `backend/prisma/schema.prisma` | Generador y datasource, sin modelos (Enmienda 1: generador `prisma-client` con `output`, datasource sin `url`) |
| Crear (vía CLI) | `backend/prisma/migrations/<timestamp>_extensiones_iniciales/migration.sql`, `backend/prisma/migrations/migration_lock.toml` | Solo `CREATE EXTENSION IF NOT EXISTS` × 2 |
| Crear (vía CLI), **no versionado** (Enmienda 1) | `backend/src/adapters/db/generated/` | Cliente generado por `prisma generate`; ignorado por git, ESLint y Prettier |
| Crear | `backend/src/config/env.ts`, `backend/src/config/logger.ts` | Validación de env; opciones de pino |
| Crear | `backend/src/core/README.md`, `core/errores.ts`, `core/salud.ts`, `core/errores.test.ts`, `core/salud.test.ts` | Lógica pura y sus pruebas |
| Crear | `backend/src/adapters/README.md`, `adapters/db/cliente.ts`, `adapters/db/salud.ts`, `adapters/db/index.ts` | Única importación de `@prisma/client` (Enmienda 1: única importación de `@prisma/adapter-pg` y del cliente en `generated/`) |
| Crear | `backend/src/middleware/README.md` | Solo la regla; sin código |
| Crear | `backend/src/handlers/README.md`, `handlers/errores.ts`, `handlers/salud.ts` | Plugin de errores y ruta de salud |
| Crear | `backend/src/workers/README.md` | Solo la regla; sin código |
| Crear | `backend/src/app.ts`, `backend/src/server.ts`, `backend/src/worker.ts` | Construcción y arranques |
| Crear | `backend/test/setup.ts`, `backend/test/salud.integracion.test.ts`, `backend/test/salud-sin-base.integracion.test.ts` | Integración |
| Crear | `backend/scripts/pendiente.mjs` | Aviso de `seed:admin` / `reset:admin` |
| Crear, **no versionado** | `backend/.env` | Copia de `.env.example` |
| Borrar | `backend/.gitkeep`, `shared/.gitkeep`, `frontend/.gitkeep` | Redundantes al existir archivos |
| Modificar | `README.md` | Sección nueva "Backend en local (Windows + PowerShell)" |
| **Propuesto, lo aplica el orquestador** | `AGENTS.md` | Ver sección "AGENTS.md" |

## Dependencias (el programador fija la versión real con `npm view`)
| Paquete | Dónde | Rango | Para qué |
|---|---|---|---|
| `fastify` | backend, deps | `^5` | Servidor HTTP |
| `fastify-plugin` | backend, deps | `^5` | Que el plugin de errores aplique al ámbito raíz |
| `@prisma/client` | backend, deps | `^7` (Enmienda 1; `^6` en el camino de retorno) | Cliente de base de datos (solo en `adapters/db`) |
| `@prisma/adapter-pg` | backend, deps | `^7` (Enmienda 1; **misma versión exacta** que `@prisma/client`). **No se instala** en el camino de retorno | Adaptador de driver PostgreSQL para el cliente sin motor (solo en `adapters/db`) |
| `pg` | backend, deps | `^8` (Enmienda 1; dependencia de par de `@prisma/adapter-pg`, confirmar rango con `npm view @prisma/adapter-pg peerDependencies`). **No se instala** en el camino de retorno | Driver que usa el adaptador. Ningún archivo propio lo importa; `@types/pg` no se instala |
| `pino` | backend, deps | **el mayor que `fastify@5` traiga como dependencia** (esperado `^9`); confirmar con `npm view fastify@<versión> dependencies.pino` | Logger del worker con las mismas opciones que la API |
| `zod` | shared y backend, deps | `^4` | Esquemas y validación de env |
| `@campus/shared` | backend, deps | `*` (workspace) | Esquemas compartidos |
| `prisma` | backend, devDeps | `^7` (Enmienda 1; misma versión exacta que `@prisma/client`; `^6` en el camino de retorno) | CLI |
| `tsx` | backend, devDeps | `^4` | Ejecutar TS en desarrollo |
| `vitest` | backend, devDeps | `^3` (si `latest` es `4`, usar `^4` y reportar) | Pruebas |
| `@types/node` | backend, devDeps | `^24` | Tipos de Node 24 |
| `typescript` | raíz, devDeps | `^5` | Compilador (llega a los workspaces por `node_modules/.bin` de la raíz) |
| `eslint`, `@eslint/js` | raíz, devDeps | `^9` | Lint |
| `typescript-eslint` | raíz, devDeps | `^8` | Parser y reglas TS |
| `eslint-config-prettier` | raíz, devDeps | `^10` | Apaga reglas de formato en ESLint |
| `globals` | raíz, devDeps | `^16` | Globales de Node para ESLint |
| `prettier` | raíz, devDeps | `^3` | Formato |

Ninguna dependencia de AWS ni de proveedores no aprobados. `dotenv` **no** se instala (DEC-03; tampoco para `prisma.config.ts`). `pino-pretty` **no** se instala. `@types/pg` **no** se instala.

## Diseño

### Decisiones
- **DEC-01 (original, Prisma 6). Prisma 6, generador `prisma-client-js`, `url = env("DATABASE_URL")` en el schema.** Motivos: (a) el CLI 6 carga `backend/.env` solo, así `npx prisma migrate dev` y `npx prisma generate` de `AGENTS.md` funcionan tal cual; (b) no necesita adaptador de driver ni `pg`; (c) menos piezas para un esqueleto. Costo: Prisma 7 es la línea actual y la migración futura tocará `adapters/db/cliente.ts`, `schema.prisma` y un `prisma.config.ts`; queda acotada a `adapters/db` por la regla de capas. **Migración inicial sin `previewFeatures = ["postgresqlExtensions"]`:** con esa bandera Prisma incluiría las extensiones en la detección de deriva y, como la base de infra ya las tiene sin historial de migraciones, `migrate dev` podría exigir un `reset`. Se crea con `--create-only` y se edita el SQL a mano (ver "Migración"). **Vigente solo en el camino de retorno de la Enmienda 1.**
- **DEC-01a (Enmienda 1, Prisma 7). Prisma 7, generador `prisma-client` con `output` en `backend/src/adapters/db/generated/`, URL en `backend/prisma.config.ts`, cliente con `@prisma/adapter-pg` + `pg`.** Motivo: decisión del humano en `aprobacion.md` (P-01). Implicaciones y detalle en la sección "Enmienda 1". Se mantiene todo lo demás de DEC-01: migración sin `previewFeatures`, creada con `--create-only` y SQL editado a mano. **Vigente si la verificación con `npm view` pasa.**
- **DEC-02. ESM en todo el backend y en `shared`** (`"type": "module"`, `module`/`moduleResolution` `NodeNext`, importaciones relativas con extensión `.js`). `backend` consume `@campus/shared` como dependencia de workspace cuyos `exports` apuntan a `dist/` compilado. Motivo: es lo mismo que correrá en la imagen de Docker, sin alias de rutas ni cargadores especiales en Vitest o tsx. Costo: orden de build `shared` → `backend`, resuelto con hooks `pre*` (ver "Scripts").
- **DEC-03. Variables de entorno sin `dotenv`:** los scripts pasan `--env-file-if-missing=.env` a Node (Node 24 lo trae); en `prod` las variables llegan del entorno y el archivo no existe, sin error. La validación con zod vive en `backend/src/config/env.ts` (no es `core/`: lee `process.env`; no es `adapters/`: no es un proveedor). Vitest carga `backend/.env` en `test/setup.ts` con `process.loadEnvFile()`. (Enmienda 1: `prisma.config.ts` hace lo mismo para el CLI de Prisma, ignorando `ENOENT`.)
- **DEC-04. Recarga con `tsx watch`.** Es la herramienta documentada para ese fin y reenvía las banderas de Node al proceso hijo. Si `tsx` rechazara `--env-file-if-missing`, el programador usa `--env-file=.env` en `dev` y `dev:worker` (en desarrollo el archivo siempre existe) y lo reporta como desviación.
- **DEC-05. Formato de error único en un plugin con `fastify-plugin`** (`handlers/errores.ts`): `setErrorHandler` y `setNotFoundHandler` en el ámbito raíz. Ninguna otra ruta formatea errores.
- **DEC-06. `worker.ts` mínimo sin pg-boss** (P-03): valida env, crea el logger y registra que está listo sin trabajos. pg-boss crea su esquema `pgboss` fuera de Prisma; instalarlo hoy metería ese esquema en la base sin ningún consumidor. Llega con el primer trabajo real (`adapters/queue`).
- **DEC-07. Un `README.md` por carpeta de capa** (3 a 6 líneas citando la regla) en lugar de `index.ts` vacíos: un barril vacío invita a importar "de la carpeta" y a acumular reexportaciones. Además, **ESLint `no-restricted-imports`** vigila la regla 1 de `AGENTS.md`: fuera de `backend/src/adapters/**` se prohíbe importar `@prisma/client`, `pg-boss`, `minio`, `resend`, `argon2`, `jose`, `livekit-server-sdk` y, **con la Enmienda 1**, `@prisma/adapter-pg`, `pg` y cualquier ruta que contenga `adapters/db/generated` (patrón `**/adapters/db/generated/**`); dentro de `backend/src/core/**` se prohíbe además cualquier ruta que contenga `/adapters`, `/handlers`, `/middleware`, `fastify` o `pino`.
- **DEC-08. Configuración de ESLint y Prettier en la raíz**, compartida. `backend` y `shared` la invocan con `--config ../eslint.config.mjs` para no depender de la búsqueda ascendente del archivo. Prettier resuelve `.prettierrc.json` hacia arriba sin ayuda.
- **DEC-09. `seed:admin` y `reset:admin` terminan con código 1.** Un "pendiente" que devuelve 0 puede pasar por éxito en un script de despliegue encadenado; el código 1 lo impide. El mensaje explica que llegan con el encargo de autenticación.
- **DEC-10. Puerto de la API `3000`, host `127.0.0.1` por defecto.** Ningún documento fija el puerto; Caddy en `prod` hará proxy al puerto interno del contenedor y allí `HOST` será `0.0.0.0` (comentario en `.env.example`). `PORT` es configurable por la misma razón que `POSTGRES_PORT` en INFRA-01.

### Flujo de `GET /api/salud`
1. `server.ts`: `cargarEnv()` valida `process.env`; si falla, imprime el mensaje de DEC-03 y sale con código 1. Luego `construirApp({ env })` y `listen({ host, port })`.
2. `app.ts` → `construirApp({ env })`: (Enmienda 1) `inicializarDb({ connectionString: env.DATABASE_URL })`; `Fastify({ logger: opcionesDeLogger(env), requestIdLogLabel: "requestId" })`; registra `manejoDeErrores` (plugin raíz) y `saludHandler` con `{ prefix: "/api" }`; `onClose` → `cerrarConexion()`. **No** llama a `listen` (la prueba usa `inject`).
3. `handlers/salud.ts`: `GET /salud` → `const baseDeDatos = await verificarConexion()` → `const salud = evaluarSalud({ baseDeDatos, ahora: new Date() })` → `reply.send(saludRespuestaSchema.parse(salud))`.
4. `adapters/db/salud.ts` → `verificarConexion()`: `prisma.$queryRaw\`SELECT 1\`` (Enmienda 1: `obtenerDb().$queryRaw\`SELECT 1\``); cualquier excepción se registra con `warn` (sin la URL) y devuelve `false`. Es el único lugar que conoce el fallo de Prisma.
5. `core/salud.ts` → `evaluarSalud()`: si `baseDeDatos` es `false` lanza `AppError("BASE_DE_DATOS_NO_DISPONIBLE", "La base de datos no responde.", 503)`; si no, devuelve `{ estado: "ok", baseDeDatos: "ok", marcaDeTiempo: ahora.toISOString() }`.
6. `handlers/errores.ts`: `AppError` → `estado` y `{ error: { codigo, mensaje } }`; error de Fastify con `statusCode` 4xx (cuerpo mal formado, etc.) → ese estado con `codigo: "SOLICITUD_INVALIDA"` y mensaje genérico; cualquier otro → `request.log.error({ err })` y `500` `{ codigo: "ERROR_INTERNO", mensaje: "Ocurrió un error inesperado." }` sin detalles. `setNotFoundHandler` → `404` `{ codigo: "NO_ENCONTRADO", mensaje: "La ruta no existe." }`.

Contrato de respuesta `200`: `{ "estado": "ok", "baseDeDatos": "ok", "marcaDeTiempo": "<ISO 8601 UTC>" }`. Contrato `503`: `{ "error": { "codigo": "BASE_DE_DATOS_NO_DISPONIBLE", "mensaje": "La base de datos no responde." } }`.

### Variables de entorno (`backend/.env.example`)
| Variable | Valor de desarrollo | Regla zod |
|---|---|---|
| `NODE_ENV` | `development` | `enum(["development","test","production"])`, por defecto `development` |
| `HOST` | `127.0.0.1` | `string().min(1)`, por defecto `127.0.0.1` |
| `PORT` | `3000` | `coerce.number().int().min(1).max(65535)`, por defecto `3000` |
| `LOG_LEVEL` | `info` | `enum(["fatal","error","warn","info","debug","trace"])`, por defecto `info` |
| `DATABASE_URL` | `postgresql://campus:dev_postgres_no_usar_en_prod@127.0.0.1:5433/campus_dev?schema=public` | `string().url()` que empiece con `postgresql://` o `postgres://`; **obligatoria** |

Comentarios obligatorios del archivo: (1) copiar a `backend/.env`, no versionado, valores sin secretos y no aptos para `prod`; (2) `DATABASE_URL` **debe coincidir** con la de `infra/.env` (puerto `POSTGRES_PORT`, 5433 por defecto), y ambos ejemplos se editan juntos; (3) en Docker `HOST` debe ser `0.0.0.0`; (4) usar `127.0.0.1`, no `localhost`. Idéntico comentario cruzado se propone para `infra/.env.example` en DOCS-01 (este encargo no toca `infra/`).

`config/env.ts`: `validarEnv(fuente: Record<string, string | undefined>): { ok: true; env: Env } | { ok: false; errores: string[] }` (pura, probada) y `cargarEnv(): Env` que la aplica a `process.env` y, si falla, escribe en `stderr`:
```
Configuración inválida. Revisa backend/.env (si no existe, copia backend/.env.example):
  - DATABASE_URL: obligatoria
  - PORT: debe ser un entero entre 1 y 65535
```
y termina con `process.exit(1)`. **Nunca imprime valores**, solo nombres y motivo.

`config/logger.ts`: `opcionesDeLogger(env): LoggerOptions` → `{ level: env.LOG_LEVEL, redact: { paths: ["req.headers.authorization", "req.headers.cookie", "res.headers[\"set-cookie\"]"], censor: "[oculto]" } }`. Sin `transport` (JSON crudo). La API la pasa a `Fastify({ logger })`; el worker hace `pino(opcionesDeLogger(env))`.

### Migración inicial
1. `npx prisma migrate dev --create-only --name extensiones_iniciales` (desde `backend/`, con `backend/.env`; Enmienda 1: la URL la aporta `prisma.config.ts`, que carga ese `.env`). Crea `prisma/migrations/<timestamp>_extensiones_iniciales/migration.sql` (vacío, porque no hay modelos) y `migration_lock.toml`. Si Prisma respondiera "Already in sync" sin crear la carpeta, el programador la crea a mano con nombre `<YYYYMMDDHHMMSS>_extensiones_iniciales` (hora UTC actual) y lo reporta.
2. El programador deja el SQL **exactamente** así (comentarios ASCII, LF):
   ```sql
   -- Extensiones que usa la busqueda de alumnos (unaccent + trigramas).
   -- Idempotente: en dev ya las creo infra/postgres/init/01-extensiones.sql;
   -- aqui se declaran para la base sombra, Testcontainers y prod (DEC-02 de INFRA-01).
   CREATE EXTENSION IF NOT EXISTS pg_trgm;
   CREATE EXTENSION IF NOT EXISTS unaccent;
   ```
3. `npx prisma migrate dev` la aplica: crea la base sombra temporal (ahí sí crea las extensiones de verdad), la borra, aplica la migración a `campus_dev` (no-op con `NOTICE ... already exists`), crea la tabla `_prisma_migrations` (propia de Prisma, no de negocio) y ejecuta `prisma generate` (Enmienda 1: escribe en `src/adapters/db/generated/`).

Compatibilidad hacia atrás: trivial (solo agrega extensiones). Reversión: ninguna necesaria. El SQL es el mismo con Prisma 6 o 7.

### `shared/`
- `src/salud.ts`: `saludRespuestaSchema = z.object({ estado: z.literal("ok"), baseDeDatos: z.literal("ok"), marcaDeTiempo: z.iso.datetime() })`; `type SaludRespuesta = z.infer<...>`.
- `src/errores.ts`: `errorApiSchema = z.object({ error: z.object({ codigo: z.string().min(1), mensaje: z.string().min(1) }) })`; `type ErrorApi`.
- `src/index.ts`: reexporta ambos.
- `package.json`: `name @campus/shared`, `private`, `type: module`, `exports: { ".": { types: "./dist/index.d.ts", import: "./dist/index.js" } }`, `files: ["dist"]`, scripts `build: tsc -p tsconfig.json`, `lint`, `format`; deps `zod`.
- `tsconfig.json`: extiende la base; `rootDir src`, `outDir dist`, `declaration true`, `include ["src"]`.

### `backend/` — código mínimo
- `core/errores.ts`: `export class AppError extends Error { readonly codigo: string; readonly estado: number; constructor(codigo, mensaje, estado = 400) }` con `this.name = "AppError"`; `export const esAppError = (e: unknown): e is AppError`.
- `core/salud.ts`: `export const evaluarSalud = ({ baseDeDatos, ahora }: { baseDeDatos: boolean; ahora: Date }): SaludRespuesta` (tipo de `@campus/shared`).
- `adapters/db/cliente.ts`:
  - **Original (Prisma 6, camino de retorno):** `export const prisma = new PrismaClient()` (única línea del proyecto que importa `@prisma/client`, junto con el tipo en `salud.ts` si hace falta).
  - **Enmienda 1 (Prisma 7):** `inicializarDb({ connectionString })`, `obtenerDb()`, `cerrarConexion()` como se detalla en la sección "Enmienda 1"; únicas importaciones del proyecto de `@prisma/adapter-pg` y de `./generated/client.js` [verificar ruta].
  `adapters/db/salud.ts`: `verificarConexion(log?: Logger): Promise<boolean>`; `adapters/db/index.ts`: reexporta `verificarConexion` y `cerrarConexion = () => prisma.$disconnect()` (Enmienda 1: reexporta `inicializarDb`, `verificarConexion` y `cerrarConexion`). `prisma`/`obtenerDb` **no** se reexportan.
- `handlers/errores.ts`: `export const manejoDeErrores = fp(async (app) => { app.setErrorHandler(...); app.setNotFoundHandler(...) })`.
- `handlers/salud.ts`: `export const saludHandler: FastifyPluginAsync = async (app) => { app.get("/salud", ...) }`.
- `app.ts`: `export const construirApp = async ({ env }: { env: Env }): Promise<FastifyInstance>` (Enmienda 1: primero `inicializarDb({ connectionString: env.DATABASE_URL })`).
- `server.ts`: arranque, `listen`, cierre ordenado en `SIGINT`/`SIGTERM` (`app.close()` → salida 0); errores de arranque → `log.fatal` y salida 1.
- `worker.ts`: `cargarEnv()`, `pino(opcionesDeLogger(env))`, `log.info({ evento: "worker_listo" }, "Worker listo, sin trabajos registrados")`, se mantiene vivo hasta `SIGINT`/`SIGTERM` y sale con 0. No inicializa la base (no la usa).
- `scripts/pendiente.mjs`: recibe el nombre por argumento, escribe en `stderr` `Pendiente: "<nombre>" se implementa en el encargo de autenticación (todavía no existe la tabla usuarios).` y `process.exit(1)`.
- READMEs de capa (texto base; el programador puede ajustar la redacción, no el fondo): `core/` "Lógica pura. Sin I/O, sin Prisma, sin Fastify, sin pino. Recibe dependencias por parámetro. Lanza `AppError`. Toda función lleva prueba unitaria con dobles en memoria."; `adapters/` "Único lugar que importa `@prisma/client`, `@prisma/adapter-pg`, `pg`, el cliente generado en `db/generated/`, `pg-boss`, `minio`, `resend`, `argon2`, `jose`, `livekit-server-sdk`. Módulos: `db`, `auth`, `storage`, `notifier`, `queue`, `scheduler`, `live`. Traduce errores de proveedor a `AppError`; nadie más conoce códigos de Prisma."; `middleware/` "Cadena fija: authenticate → withProfile → withPasswordGate → withAccess → requireRole → requireMembership/requireOwnership → handler. Cambios aquí son carril sensible. Vacío hasta el encargo de auth."; `handlers/` "Un plugin de Fastify por dominio, delgado: validar entrada → llamar a core → responder. Sin verificaciones de permisos a mano, sin `try/catch` salvo traducir un error de proveedor. El formato de error lo aplica `errores.ts` para todos."; `workers/` "Consumidores de la cola (pg-boss). Un error se propaga para que pg-boss reintente; nunca se traga en silencio. Vacío hasta el primer trabajo real."

### Configuración de herramientas
- `tsconfig.base.json`: `target ES2022`, `module NodeNext`, `moduleResolution NodeNext`, `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noImplicitOverride`, `verbatimModuleSyntax`, `isolatedModules`, `esModuleInterop`, `skipLibCheck`, `forceConsistentCasingInFileNames`, `sourceMap`, `types ["node"]`.
- `backend/tsconfig.json`: extiende la base; `rootDir src`, `outDir dist`, `include ["src"]`, `exclude ["src/**/*.test.ts"]`. Las pruebas, `vitest.config.ts` y `prisma.config.ts` no entran al build; Vitest las transpila. (Enmienda 1: `src/adapters/db/generated/` sí entra, porque `cliente.ts` la importa; si no compila, ver la Enmienda 1.)
- `backend/vitest.config.ts`: `test: { environment: "node", setupFiles: ["./test/setup.ts"], include: ["src/**/*.test.ts", "test/**/*.test.ts"], testTimeout: 15000 }`.
- `test/setup.ts`: `process.loadEnvFile(new URL("../.env", import.meta.url))` dentro de `try/catch`; si el error es `ENOENT`, lanza `Error("Falta backend/.env: copia backend/.env.example a backend/.env")`; otro error se propaga. Solo carga; no valida.
- `eslint.config.mjs`: `@eslint/js` recommended, `typescript-eslint` recommended (sin tipos), `globals.node`, `eslint-config-prettier` al final; `ignores: ["**/dist/**", "**/node_modules/**", "**/coverage/**", "backend/prisma/migrations/**", "backend/src/adapters/db/generated/**"]` (el último por la Enmienda 1); bloques `no-restricted-imports` de DEC-07; permitir `console` solo en `backend/scripts/**` y `backend/src/config/env.ts` (`no-console` en el resto). `backend/prisma.config.ts` **sí** se lintea.
- `.prettierrc.json`: `{ "semi": false, "singleQuote": false, "trailingComma": "all", "printWidth": 100, "endOfLine": "lf" }`. `.prettierignore`: `node_modules`, `dist`, `coverage`, `package-lock.json`, `backend/prisma/migrations`, `backend/src/adapters/db/generated` (Enmienda 1).
- `.gitignore`: agregar `*.tsbuildinfo` y `.eslintcache` después de `coverage/`, y (Enmienda 1) `backend/src/adapters/db/generated/`; corregir el salto de línea final.

### Scripts
**Raíz** (`package.json`, `private: true`, `workspaces: ["shared", "backend", "frontend"]`, `engines: { node: ">=24 <25", npm: ">=11" }`):
`lint`: `npm run lint --workspaces --if-present` · `test`: `npm run test --workspaces --if-present` · `build`: `npm run build --workspaces --if-present` · `format`: `prettier --write .` · `format:check`: `prettier --check .`. El orden de `workspaces` garantiza `shared` antes que `backend`.

**`shared/`:** `build`: `tsc -p tsconfig.json` · `lint`: `eslint --config ../eslint.config.mjs . && prettier --check .` · `format`: `prettier --write .`.

**`backend/`:**
| Script | Comando |
|---|---|
| `shared:build` | `npm --prefix ../shared run build` |
| `predev`, `predev:worker`, `prebuild`, `pretest` | `npm run shared:build && prisma generate` |
| `dev` | `tsx watch --env-file-if-missing=.env src/server.ts` |
| `dev:worker` | `tsx watch --env-file-if-missing=.env src/worker.ts` |
| `build` | `tsc -p tsconfig.json` |
| `start` / `start:worker` | `node --env-file-if-missing=.env dist/server.js` / `dist/worker.js` |
| `typecheck` | `tsc -p tsconfig.json --noEmit` |
| `lint` | `eslint --config ../eslint.config.mjs . && prettier --check . && npm run typecheck` |
| `format` | `prettier --write .` |
| `test` / `test:watch` | `vitest run` / `vitest` |
| `seed:admin` / `reset:admin` | `node scripts/pendiente.mjs seed:admin` / `node scripts/pendiente.mjs reset:admin` |

`npx prisma migrate dev`, `npx prisma generate`, `npx prisma validate` funcionan desde `backend/` porque `prisma` es devDependency del workspace (Enmienda 1: y porque `prisma.config.ts` está en `backend/`). **Ningún comando de `AGENTS.md` cambia de nombre ni de carpeta.**

**`frontend/package.json`:** `{ "name": "@campus/frontend", "version": "0.0.0", "private": true, "description": "Pendiente: se crea en el primer encargo del frontend." }`, sin scripts ni dependencias.

### AGENTS.md (propuesta; **lo aplica el orquestador con autorización del humano**, no el programador — precedente de INFRA-01)
1. Bloque "Backend (desde /backend)": línea 32 pasa de `npm run test             # Vitest (integración con Testcontainers)` a `npm run test             # Vitest (unitarias de core e integración contra el PostgreSQL de infra)` (P-04).
2. Antes del bloque de frontend, bloque nuevo:
   ```bash
   # Raíz del repositorio (una sola vez tras clonar, y cuando cambie un package.json)
   npm install              # instala los tres workspaces: shared, backend, frontend
   npm run lint / test / build   # en todos los workspaces
   ```
3. Bloque "Backend": antes de `npm run dev`, la línea `cp .env.example .env     # solo la primera vez: crea tu configuración local`.

### README.md — sección nueva al final: `## Backend en local (Windows + PowerShell)`
Requisitos (Node 24 LTS y npm 11: `node --version`, `npm --version`; el entorno de infra levantado según la sección anterior). Pasos, cada uno con su bloque PowerShell, sin `&&` y con `curl.exe`: (1) `npm install` desde la raíz; (2) `Set-Location backend`, `if (-not (Test-Path .env)) { Copy-Item .env.example .env }`, nota de que `DATABASE_URL` debe coincidir con `infra/.env` (Enmienda 1: una frase de que el CLI de Prisma lee ese `.env` a través de `backend/prisma.config.ts`); (3) `npx prisma migrate dev` (solo la primera vez; explica `_prisma_migrations` y la base sombra) y `npx prisma generate` (Enmienda 1: nota de que genera `src/adapters/db/generated/`, no versionado, y que los scripts `dev`/`build`/`test` lo regeneran solos); (4) `npm run dev` y, en otra terminal, `curl.exe http://127.0.0.1:3000/api/salud` con la respuesta esperada; `curl.exe -i http://127.0.0.1:3000/api/no-existe` → `404` con el formato de error; (5) `npm test`, precondición infra levantado y mensaje si falta `.env`; (6) `npm run dev:worker`; (7) problemas frecuentes: puerto 3000 ocupado (`Get-NetTCPConnection -LocalPort 3000 -State Listen`, cambiar `PORT` en `backend/.env`), `ECONNREFUSED` en 5433 (infra apagado), "Configuración inválida" (falta `.env` o una variable), error `P1000`/`P1001` de Prisma (credenciales o puerto no coinciden con `infra/.env`), y (Enmienda 1) "Cannot find module './generated/client.js'" o similar → ejecutar `npx prisma generate`.

## Cambios por capa
### shared/
`salud.ts`, `errores.ts`, `index.ts` (ver "Diseño › shared/").
### backend/core/
`AppError`, `esAppError`, `evaluarSalud` (firmas arriba). Sin I/O.
### backend/adapters/
`db/cliente.ts`, `db/salud.ts`, `db/index.ts` (Enmienda 1: más la carpeta generada `db/generated/`, no versionada). Ningún otro adaptador todavía.
### backend/handlers/
`errores.ts` (plugin raíz) y `salud.ts`: `GET /api/salud`, **sin cadena de middleware**: es la ruta pública de monitoreo (`ESSENTIALS` › Operación). Es la única ruta del proyecto exenta, junto con las que ESSENTIALS marca "sin JWT".
### backend/workers/
Solo `README.md`. `worker.ts` en `src/` según DEC-06.
### backend/prisma/
`schema.prisma` sin modelos; una migración `extensiones_iniciales`. Compatible hacia atrás. (Enmienda 1: `backend/prisma.config.ts` junto a `prisma/`.)
### infra/ y .env.example
`infra/` **no cambia**. Nuevo `backend/.env.example` con 5 variables.
### frontend/features/<modulo>/
No aplica. Solo `frontend/package.json`.

## Acceso a datos
Una sola sentencia: `SELECT 1` vía `$queryRaw` con plantilla etiquetada (parametrizada por construcción). Sin tablas, sin paginación, sin transacción. La migración no toca datos.

## Autorización
No hay endpoints con datos de usuario. `GET /api/salud` es pública por diseño y no revela más que `ok`/`503`; no expone versión, nombre de host ni `DATABASE_URL`. El formato de error `500` no filtra mensajes internos ni pilas.

## Pruebas requeridas
| Archivo | Casos |
|---|---|
| `src/core/errores.test.ts` | `AppError` conserva `codigo`, `mensaje`, `estado`; `estado` por defecto 400; `instanceof Error` y `name === "AppError"`; `esAppError` distingue de `Error` común y de `null` |
| `src/core/salud.test.ts` | Con `baseDeDatos: true` devuelve `estado`/`baseDeDatos` `"ok"` y `marcaDeTiempo` igual a `ahora.toISOString()`, y el objeto pasa `saludRespuestaSchema`; con `false` lanza `AppError` con `estado 503` y `codigo BASE_DE_DATOS_NO_DISPONIBLE` |
| `src/config/env.test.ts` | `validarEnv` acepta el mínimo (`DATABASE_URL`) y aplica defaults; rechaza `DATABASE_URL` ausente y `PORT` no numérico listando el nombre de la variable sin su valor |
| `test/salud.integracion.test.ts` | `beforeAll`: `construirApp({ env: cargarEnv() })`; si `GET /api/salud` no responde 200 en el primer intento, falla con `"PostgreSQL de infra no responde en DATABASE_URL. Levanta infra: docker compose up -d en infra/"`. Casos: `GET /api/salud` → 200, `content-type` JSON, cuerpo válido según `saludRespuestaSchema`; `GET /api/no-existe` → 404 con `errorApiSchema` y `codigo NO_ENCONTRADO`; ruta agregada en la prueba que lanza `new AppError("PRUEBA", "mensaje", 418)` → 418 y ese código; ruta que lanza `Error("boom")` → 500, `codigo ERROR_INTERNO` y `mensaje` sin la palabra `boom`. `afterAll`: `app.close()` |
| `test/salud-sin-base.integracion.test.ts` | `vi.mock("../src/adapters/db/index.js")` con `verificarConexion` → `false` (Enmienda 1: el doble también expone `inicializarDb` y `cerrarConexion` como funciones vacías); `GET /api/salud` → 503 con `codigo BASE_DE_DATOS_NO_DISPONIBLE` y cuerpo válido según `errorApiSchema` |

Precondición documentada: infra levantado (`docker compose up -d` en `infra/`) y `backend/.env` presente.

## Puntos de ataque para el Tester
No aplica (flujo sin Tester). **Puntos de revisión para el Manager (modo final):** el Manager ejecuta `npm run lint`, `npm test` y `npm run build` desde la raíz, y además:
- **(Enmienda 1)** La versión instalada de `prisma`/`@prisma/client` (`npm ls prisma @prisma/client @prisma/adapter-pg pg`) corresponde a la decisión tomada en el paso 2: `7.x` con `@prisma/adapter-pg` y `pg` si la verificación pasó; `6.x` sin ellos si hubo retorno. Si hubo retorno a 6, el `resumen-programador.md` incluye la salida del `npm view` que falló **y** el orquestador confirma que avisó al humano; si falta cualquiera de las dos cosas, el Manager lo marca como hallazgo bloqueante.
- `grep -rn "@prisma/client\|@prisma/adapter-pg\|from \"pg\"\|adapters/db/generated" backend/src shared/src` solo devuelve archivos bajo `backend/src/adapters/db/` (excluyendo la carpeta `generated/`, que no se revisa).
- Exactamente **una** carpeta en `backend/prisma/migrations/` y su SQL contiene solo las dos sentencias del plan; `npx prisma migrate status` en verde; `_prisma_migrations` con una fila.
- `schema.prisma` sin modelos ni `previewFeatures` (Enmienda 1: datasource sin `url`, generador `prisma-client` con `output` a `../src/adapters/db/generated`).
- Ningún `dotenv`, `pino-pretty`, `@types/pg`, `express`, ni paquete fuera de la tabla en los tres `package.json` y en `package-lock.json` (dependencias directas). `pg` y `@prisma/adapter-pg` solo aparecen si se implementó Prisma 7.
- El error `500` no incluye `stack` ni el mensaje original; el `404` y el `503` respetan `{ error: { codigo, mensaje } }`.
- El logger no imprime `authorization` ni `cookie` (comprobar con una petición que envíe ambos encabezados y `LOG_LEVEL=info`).
- Mensaje de configuración inválida sin valores de variables.
- `backend/.env` no rastreado; `backend/.env.example` con las 5 variables y ningún valor real; `DATABASE_URL` idéntica a la de `infra/.env.example`.
- **(Enmienda 1)** `backend/src/adapters/db/generated/` no rastreado (`git check-ignore -v`), excluido de ESLint y Prettier; `backend/prisma.config.ts` versionado, sin `dotenv`, con `process.loadEnvFile()` en `try/catch` que solo ignora `ENOENT`, sin valores de conexión escritos en el archivo; el `tsconfig` global no se relajó.
- `frontend/` contiene solo `package.json`; los tres `.gitkeep` borrados; `git status` sin `node_modules/`, `dist/`, `.env`.
- Finales de línea LF en todo lo nuevo (`git ls-files --eol --others --exclude-standard`), incluido `package-lock.json`.
- Alcance de más: middleware con código, modelos, CORS/helmet, Testcontainers, pg-boss, Dockerfile, cambios en `infra/`, `AGENTS.md`, `CLAUDE.md` o `docs/ARCHITECTURE*.md` hechos por el programador.
- Versiones finales reportadas con el comando `npm view` que las respalda.

## Riesgos y desacuerdos
- **R-01. Versiones no verificadas.** Todos los rangos son propuestas (S-02). Si `latest` de algún paquete es una versión mayor superior a la propuesta (por ejemplo `vitest@4`, `pino@10`), el programador **no** salta de mayor por su cuenta salvo en los casos que la tabla autoriza (`vitest`); para Prisma aplica la Enmienda 1 (`^7` si la verificación pasa, `^6` si no, sin otra opción); para el resto se detiene y reporta.
- **R-02. La migración es un no-op sobre la base de infra** (las extensiones ya existen): solo la base sombra la ejercita de verdad. Evidencia de que funcionó: la creación de la base sombra sin error en la salida de `migrate dev`, la fila en `_prisma_migrations` y `migrate status` en verde. La prueba real en base limpia llegará con Testcontainers.
- **R-03. `prisma migrate dev` es interactivo si detecta deriva.** Sin `previewFeatures` no debería (DEC-01/DEC-01a). Si aun así pide `reset`, el programador **responde que no / cancela**, no ejecuta `migrate reset` y reporta. Con Prisma 7 el comportamiento es el mismo; la URL sale de `prisma.config.ts`.
- **R-04. Deriva entre `infra/.env.example` y `backend/.env.example`** (P-05). Mitigación: comentario cruzado en ambos; el de `infra/` se agrega en DOCS-01. Si un día divergen, el síntoma es `P1000`/`P1001` al arrancar, documentado en el README.
- **R-05. `_prisma_migrations` y el esquema `pgboss` futuro conviven en `public`/`pgboss` fuera del modelo de negocio.** Aceptado por ESSENTIALS ("esquema `pgboss`, que no se toca").
- **R-06. Windows.** Prisma 6 descarga motores nativos en `npm install` y `generate` (requiere red); con Prisma 7 el cliente con adaptador no descarga ni carga motor de consultas nativo **[verificar]**, pero el CLI puede seguir descargando el motor de esquema para `migrate`/`validate`, así que `npm install` sigue requiriendo red; `node_modules` de workspaces se enlazan con *junctions*; `tsx watch` deja procesos hijos si se mata solo el padre (usar `taskkill /T`); rutas con espacios en `npm --prefix ../shared` (ninguna en este repo); PowerShell 5.1: `curl` es alias, sin `&&`; `.gitattributes` normaliza LF y Prettier fuerza `endOfLine: lf`; el puerto 3000 puede estar ocupado (variable `PORT`).
- **R-07. `tsx` y `--env-file-if-missing`** (DEC-04): si no lo acepta, `--env-file=.env` como alternativa autorizada.
- **R-08. Sin CORS, helmet ni rate-limit** hasta que exista el frontend: `HOST=127.0.0.1` limita la exposición en `dev`.
- **R-09. Vitest transpila las pruebas sin comprobar tipos** (quedan fuera de `tsc`). Aceptado para el esqueleto; `typecheck` cubre `src/`.
- **R-10 (Enmienda 1). Detalles de la API de Prisma 7 no verificados** (nombres de opciones de `prisma.config.ts` y del generador, ruta del cliente generado, firma de `PrismaPg`). Están marcados **[verificar]**; el programador los confirma contra el paquete instalado antes de escribir y reporta cada diferencia con este plan. Si el código generado no compila con el `tsconfig` estricto, solo se ajusta el manejo del directorio generado (ver Enmienda 1).
- **Desacuerdos con ESSENTIALS:** ninguno. La ausencia de Testcontainers en BACK-01 es decisión del humano y no cambia la decisión de ESSENTIALS (C-01). La Enmienda 1 no contradice ESSENTIALS (que fija "Prisma" sin versión y "Prisma solo en `adapters/db`", regla que el `output` en `adapters/db/generated/` respeta).

## Verificaciones (el programador las ejecuta y reporta una por una, con salida real)
| # | Verificación | Resultado esperado |
|---|---|---|
| V-01 | `node --version`, `npm --version`, `node -p process.release.lts` | `v24.x`, `11.x`, un nombre de LTS (no `undefined`) |
| V-02 | **Primero (Enmienda 1):** las cinco comprobaciones de la sección "Condición de verificación": `npm view prisma dist-tags.latest`, `npm view @prisma/client dist-tags.latest`, `npm view @prisma/adapter-pg dist-tags.latest`, `npm view @prisma/adapter-pg peerDependencies`, `npm view pg dist-tags.latest`, `npm view prisma@7 version`. **Después:** `npm view <paquete> version` y `dist-tags` para cada paquete de la tabla | **Éxito de la enmienda:** los tres `latest` de Prisma son `7.x` e iguales entre sí, `peerDependencies` incluye `pg`, `pg` `latest` es `8.x` → se implementa Prisma 7. **Si falla una:** salida copiada al resumen, `npm view prisma@6 version` existe, se implementa Prisma 6 (DEC-01 original) y se reporta para que el orquestador avise al humano. Tabla de versiones finales en el resumen, indicando la decisión tomada |
| V-03 | `npm install` desde la raíz | Código 0; existe `package-lock.json`; `node_modules/@campus/shared` y `node_modules/@campus/backend` son enlaces a los workspaces |
| V-04 | `npm run lint` (raíz) | Código 0 en `shared` y `backend` (ESLint, Prettier y `typecheck`) |
| V-05 | `npm run build` (raíz) | `shared/dist/index.js` y `index.d.ts`; `backend/dist/server.js`, `worker.js` |
| V-06 | `npx prisma validate` y `npx prisma format --check` (o `format` y comprobar que no cambia nada) desde `backend/` | Código 0 (Enmienda 1: ambos encuentran `prisma.config.ts` sin banderas adicionales) |
| V-07 | `npx prisma migrate dev --create-only --name extensiones_iniciales`, editar el SQL, `npx prisma migrate dev` | Salida sin errores, base sombra creada y borrada; `ls backend/prisma/migrations` muestra **una** carpeta + `migration_lock.toml`; `cat` del SQL igual al del plan. (Enmienda 1: la salida del CLI menciona que cargó `prisma.config.ts` [verificar el texto]; no se pasó ninguna `--url` ni `.env` a mano) |
| V-08 | `npx prisma migrate status` y, en `infra/`, `docker compose exec -T postgres psql -U campus -d campus_dev -c "SELECT migration_name, finished_at IS NOT NULL AS aplicada FROM _prisma_migrations;"` y `-c "SELECT extname FROM pg_extension ORDER BY 1;"` | "Database schema is up to date!"; una fila `..._extensiones_iniciales` aplicada; `pg_trgm`, `plpgsql`, `unaccent` |
| V-09 | `npx prisma generate` | Código 0 (Enmienda 1: existe `backend/src/adapters/db/generated/` con el archivo de entrada que importa `cliente.ts` [verificar nombre]; `npm run typecheck` en `backend/` pasa con el código generado incluido) |
| V-10 | `npm test` desde la raíz con infra levantado | Todas las pruebas de los 5 archivos en verde; reportar el conteo |
| V-11 | Arranque en segundo plano desde `backend/` (Git Bash): `node --env-file-if-missing=.env dist/server.js > tmp/api.log 2>&1 & echo $!`; esperar 3 s; `curl.exe -s -i http://127.0.0.1:3000/api/salud`; `curl.exe -s -i http://127.0.0.1:3000/api/no-existe`; `curl.exe -s -o NUL -H "Authorization: Bearer secreto" -H "Cookie: a=b" http://127.0.0.1:3000/api/salud`; detener con `taskkill //PID <pid> //T //F` | `200` con el JSON del contrato; `404` con `NO_ENCONTRADO`; `tmp/api.log` en JSON de una línea por evento, con `requestId`, y con `authorization`/`cookie` como `[oculto]` (copiar una línea al resumen). `backend/tmp/` ya está ignorado por git |
| V-12 | `env -u DATABASE_URL node dist/server.js` (sin bandera de env) | Código 1 y el mensaje "Configuración inválida ... DATABASE_URL: obligatoria", sin valores |
| V-13 | `npm run dev` con PowerShell: `powershell.exe -NoProfile -Command "$p = Start-Process npm.cmd -ArgumentList 'run','dev' -PassThru -WindowStyle Hidden -RedirectStandardOutput tmp/dev.log -RedirectStandardError tmp/dev.err; Start-Sleep 12; Get-Content tmp/dev.log -Tail 5; taskkill /PID $p.Id /T /F"`; repetir con `dev:worker` | Log de la API con `"msg":"Server listening at http://127.0.0.1:3000"`; log del worker con `worker_listo`; ambos procesos detenidos (`Get-NetTCPConnection -LocalPort 3000 -State Listen` vacío después) |
| V-14 | `npm run seed:admin`; `npm run reset:admin` | Mensaje "Pendiente: ..." en stderr y código de salida 1 |
| V-15 | `grep -rn "@prisma/client\|@prisma/adapter-pg\|from \"pg\"\|adapters/db/generated" backend/src shared/src --exclude-dir=generated` y `npx eslint --config ../eslint.config.mjs .` tras crear temporalmente `backend/src/core/prueba-capa.ts` con `import "@prisma/client"`, y (Enmienda 1) repetir con `import "@prisma/adapter-pg"`, `import "pg"` e `import "../adapters/db/generated/client.js"` (borrarlo después) | Solo `adapters/db/*`; ESLint falla en el archivo temporal con `no-restricted-imports` en cada una de las cuatro variantes, y vuelve a pasar tras borrarlo |
| V-16 | `git status --short --untracked-files=all`, `git check-ignore -v backend/.env node_modules shared/dist backend/dist backend/src/adapters/db/generated`, `git check-ignore backend/.env.example backend/prisma.config.ts` | Sin `node_modules`, `dist`, `.env`, `tmp/`, `generated/`; `.env.example` y `prisma.config.ts` **no** ignorados; ` D` en los tres `.gitkeep` |
| V-17 | `git ls-files --eol --others --exclude-standard` sobre los archivos nuevos y `git ls-files --eol README.md .gitignore` | Todo `w/lf`, incluido `package-lock.json` |
| V-18 | Revisión manual de `backend/.env.example` | 5 variables, comentarios obligatorios, `DATABASE_URL` idéntica a `infra/.env.example` |
| V-19 | `cat frontend/package.json`; `ls frontend` | Solo `package.json` |
| V-20 | Comandos del README probados tal cual en PowerShell 5.1 (`powershell.exe -NoProfile`), salvo los interactivos | Cada uno reportado con su salida; los no ejecutados, declarados |

Al terminar: procesos de Node detenidos; infra se deja como estaba (levantado si lo estaba); `backend/.env` se conserva y no se versiona; sin commit.

## Pasos de implementación
1. V-01. Si Node no es 24.x, detenerse y reportar.
2. V-02 en dos partes. **(a) Enmienda 1:** ejecutar las cinco comprobaciones de `npm view` de la "Condición de verificación" y decidir: si todas pasan → Prisma 7 (DEC-01a); si alguna falla → detenerse, copiar la salida, confirmar `npm view prisma@6 version`, adoptar Prisma 6 (DEC-01 original) y anotarlo como primera línea del resumen para que el orquestador avise al humano. **(b)** Fijar el resto de versiones. Sin la decisión (a) registrada no se crea ningún archivo.
3. Crear `.nvmrc`, `tsconfig.base.json`, `.prettierrc.json`, `.prettierignore`, `eslint.config.mjs`, `package.json` raíz, `frontend/package.json`; editar `.gitignore` (incluida la línea `backend/src/adapters/db/generated/` si se eligió Prisma 7).
4. Crear `shared/` completo (package.json, tsconfig, tres archivos de `src/`).
5. Crear `backend/package.json`, `backend/tsconfig.json`, `backend/vitest.config.ts`, `backend/.env.example`, `backend/prisma/schema.prisma`, `backend/scripts/pendiente.mjs` y, **si se eligió Prisma 7**, `backend/prisma.config.ts`: antes de escribirlo, confirmar los puntos **[verificar]** de la Enmienda 1 con `node_modules/prisma/README.md`, `npx prisma init --help` o un `npx prisma init` en el scratchpad fuera del repositorio (borrarlo después); anotar cada diferencia con el plan.
6. V-03 (`npm install`). Si npm rechaza `engines` o falla la descarga de motores de Prisma, detenerse y reportar. (Prisma 7: comprobar que `@prisma/adapter-pg` y `pg` quedaron en la misma resolución que `@prisma/client`, con `npm ls`.)
7. Crear los cinco `README.md` de capa; `core/errores.ts`, `core/salud.ts` y sus pruebas; `config/env.ts`, `config/logger.ts`, `config/env.test.ts`. Ejecutar `npx vitest run src/` en `backend/` (con `shared` construido: `npm run shared:build`).
8. Crear `adapters/db/*` (variante según la decisión del paso 2), `handlers/errores.ts`, `handlers/salud.ts`, `app.ts`, `server.ts`, `worker.ts`.
9. Copiar `backend/.env.example` a `backend/.env` si no existe (sin imprimirlo). Comprobar que infra está arriba (`docker compose ps` en `infra/`); si no, `docker compose up -d`.
10. V-06, V-07 (crear y aplicar la migración), V-08, V-09. Si con Prisma 7 el código generado no compila bajo el `tsconfig` estricto, ajustar solo el manejo del directorio generado (Enmienda 1) y reportar.
11. Crear `test/setup.ts` y las dos pruebas de integración. V-10.
12. V-04, V-05.
13. V-11, V-12, V-13, V-14, V-15.
14. Borrar `backend/.gitkeep`, `shared/.gitkeep`, `frontend/.gitkeep` con `rm`.
15. Agregar la sección al final de `README.md` (sin tocar lo existente; conservar el salto de línea final). V-20.
16. V-16, V-17, V-18, V-19.
17. Entregar `resumen-programador.md` con el formato del Programador más: **decisión Prisma 7/6 con las salidas de `npm view` que la respaldan (primera línea del resumen)**, tabla de versiones finales (paquete, rango, versión instalada, comando), lista de los puntos **[verificar]** con lo que se encontró en cada uno, resultado de V-01 a V-20 uno por uno, desviaciones (por ejemplo DEC-04 alternativa, carpeta de migración creada a mano, `PORT` local distinto, ajuste del directorio generado), la propuesta literal para `AGENTS.md` (sin aplicarla) y lo que no se pudo verificar.
