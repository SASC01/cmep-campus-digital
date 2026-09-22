# Resumen del Programador — BACK-02: migrar el backend a Prisma 7.10.0 y cerrar los pendientes de BACK-01

Fecha: 2026-09-22
Plan: `docs/trabajo/BACK-02-prisma-7/plan.md` (estado LISTO, carril sensible)
Aprobación: `docs/trabajo/BACK-02-prisma-7/aprobacion.md` (P-01 a P-04 con sus valores por defecto)

```
Plan: docs/trabajo/BACK-02-prisma-7/plan.md
Pasos completados: 17 de 17
Archivos creados / modificados: 3 creados (backend/prisma.config.ts, backend/test/db-cliente.test.ts, este resumen), 17 modificados; lista literal al final. Ningún archivo del repositorio borrado
Verificación: lint ok · test 24 pasan, 0 fallan (6 archivos) · build ok · prisma validate ok
Hallazgos atendidos: M-02 corregido (logController) · M-03 corregido (ESLint 10.11.0) · M-04 medido y aceptado (4 altas transitivas del CLI, sin fix)
Desviaciones del plan: 4 acotadas (regex de la función `ultima`, proceso preexistente en el puerto 3000, `--ignore-path` en el Prettier acotado, V-21 §7 no repetido); detalle abajo
Pendiente o fuera de alcance detectado: ver sección final
```

## Comprobación de versiones previa a la instalación (V-02)

La función `ultima` del plan devolvió `undefined` en mi Bash: la capa de shell de la sesión elimina las barras invertidas de `\\.\\d+` tanto en argumentos de `node -e` como dentro de heredocs entrecomillados (el regex llegaba a Node como `^7.d+.d+$`). Reproduje la misma lógica (filtrar `X.Y.Z` estables del mayor pedido y ordenar por semver) en un script del scratchpad con clases de caracteres en lugar de escapes:

```js
const v = JSON.parse(require("fs").readFileSync(0, "utf8"))
const re = new RegExp("^" + process.argv[2] + "[.][0-9]+[.][0-9]+$")
const n = (s) => s.split(".").map(Number)
const e = v.filter((x) => re.test(x)).sort((a, b) => { const A = n(a), B = n(b); return A[0] - B[0] || A[1] - B[1] || A[2] - B[2] })
console.log(e.at(-1))
```

Invocado como `npm view <paquete> versions --json | node ultima.cjs <mayor>`:

```
prisma 7 -> 7.10.0
@prisma/client 7 -> 7.10.0
@prisma/adapter-pg 7 -> 7.10.0
pg 8 -> 8.23.0
eslint 10 -> 10.11.0
@eslint/js 10 -> 10.0.1
```

Pares y dependencias (salida literal de `npm view`):

```
npm view prisma@7.10.0 peerDependencies peerDependenciesMeta
  peerDependencies = { typescript: '>=5.4.0', 'better-sqlite3': '>=9.0.0' }
  peerDependenciesMeta = { typescript: { optional: true }, 'better-sqlite3': { optional: true } }
npm view @prisma/client@7.10.0 peerDependencies peerDependenciesMeta
  peerDependencies = { prisma: '*', typescript: '>=5.4.0' }
  peerDependenciesMeta = { prisma: { optional: true }, typescript: { optional: true } }
npm view @prisma/adapter-pg@7.10.0 dependencies
  { pg: '^8.16.3', '@types/pg': '^8.16.0', 'postgres-array': '3.0.4', '@prisma/driver-adapter-utils': '7.10.0' }
npm view @prisma/adapter-pg@7.10.0 peerDependencies
  (sin salida: no declara peerDependencies)
npm view typescript-eslint@8.70.1 peerDependencies
  { eslint: '^8.57.0 || ^9.0.0 || ^10.0.0', typescript: '>=4.8.4 <6.1.0' }
npm view eslint-config-prettier@10.1.8 peerDependencies
  { eslint: '>=7.0.0' }
npm view @eslint/js@10.0.1 peerDependencies
  { eslint: '^10.0.0' }
npm view prisma dist-tags
  { ..., next: '8.0.0-rc.10', prev: '7.10.0', latest: '8.0.0-rc.15', dev: '8.0.0-rc.15-dev.114' }
npm view prisma@7.10.0 dependencies
  { mysql2: '3.15.3', postgres: '3.4.7', '@prisma/dev': '0.24.17', '@prisma/config': '7.10.0', '@prisma/engines': '7.10.0', '@prisma/studio-core': '0.33.0' }
```

Resultado: los cinco criterios se cumplen. `7.10.0` en los tres paquetes de Prisma (no aplica la parada de P-04 ni la de "difieren entre sí"), `better-sqlite3` opcional (no aplica R-14), `pg` 8.23.0 satisface `^8.16.3`, pares de ESLint compatibles. `latest` de `prisma` sigue siendo `8.0.0-rc.15`; no se usó.

## Tabla de versiones finales

| Paquete | Dónde | Rango en package.json | Instalada | Comando que lo confirma |
|---|---|---|---|---|
| `prisma` | backend devDeps | `^7.10.0` | 7.10.0 | `npm ls prisma` → `prisma@7.10.0`; `npx prisma -v` → `prisma : 7.10.0` |
| `@prisma/client` | backend deps | `^7.10.0` | 7.10.0 | `npm ls` → `@prisma/client@7.10.0`; `npx prisma -v` → `@prisma/client : 7.10.0` |
| `@prisma/adapter-pg` | backend deps | `^7.10.0` | 7.10.0 | `npm ls` → `@prisma/adapter-pg@7.10.0` con `pg@8.23.0 deduped` |
| `pg` | backend deps | `^8.23.0` | 8.23.0 (una sola copia; `pg-pool@3.14.0` la reutiliza `deduped`) | `npm ls pg` |
| `eslint` | raíz devDeps | `^10.11.0` | 10.11.0 | `npx eslint --version` → `v10.11.0`; `npm ls eslint` → una real, resto `deduped` |
| `@eslint/js` | raíz devDeps | `^10.0.1` | 10.0.1 | `npm ls @eslint/js` |

`npm ls prisma @prisma/client @prisma/adapter-pg pg eslint @eslint/js`: código 0, sin `invalid` ni `UNMET PEER`. Transitivas del CLI que entran al lock (R-16, no son dependencias directas): `mysql2@3.15.3`, `postgres@3.4.7`, `@prisma/dev@0.24.17`, `@prisma/studio-core@0.33.0`, `@types/pg@8.23.1`, `deepmerge-ts@7.1.5`. `grep` de `dotenv|@types/pg|better-sqlite3|"postgres"|mysql2|aws` en los cuatro `package.json`: sin coincidencias.

Nota para el Manager sobre el lock: `npm explain prisma` muestra `prisma@7.10.0 peer` porque, además de ser devDependency del backend, satisface el par opcional `prisma "*"` de `@prisma/client` (dependencia de producción). Por eso `prisma`, `mysql2`, `postgres`, `@prisma/dev` y `@prisma/studio-core` aparecen en `package-lock.json` sin la marca `dev: true`. Siguen siendo transitivas del CLI (`npm explain mysql2` → `mysql2@"3.15.3" from prisma@7.10.0`). Consecuencia práctica para el encargo de despliegue: un `npm ci --omit=dev` instalaría de todos modos el CLI y esas transitivas en la imagen (npm no omite los paquetes marcados `peer`); se anota en "Pendiente".

## Puntos [verificar] confirmados contra el paquete instalado

| Punto | Dónde lo confirmé | Resultado |
|---|---|---|
| `defineConfig` y `env` de `prisma/config` | `node_modules/@prisma/config/dist/index.d.ts:46,57` | `export declare function defineConfig(configInput: PrismaConfig): PrismaConfigInternal;` y `export declare function env(name: string): string;` |
| Campos de `PrismaConfig` | `index.d.ts:144-176`, `:122-126`, `:26-29` | `schema?: string`, `migrations?: { path?: string; initShadowDb?; seed? }`, `datasource?: { url?: string; shadowDatabaseUrl?: string }` |
| `schema` y `migrations.path` relativos al archivo de configuración | `node_modules/@prisma/config/dist/index.js:700` | `return path.resolve(path.dirname(resolvedPath), value)` — se resuelven respecto a `prisma.config.ts`, como suponía DEC-02 |
| `env()` ansiosa (R-13) | `index.js:515-521` | `const value = process.env[name]; if (!value) throw new PrismaConfigEnvError(name)` — se evalúa al cargar el config; V-20 lo confirma |
| Firma de `PrismaPg` | `node_modules/@prisma/adapter-pg/dist/index.d.ts:36,42,58-60` | `constructor(poolOrConfig: pg.Pool \| pg.PoolConfig \| string, options?: PrismaPgOptions)`; `PrismaPgOptions = { schema?: string; ... }`. `new PrismaPg({ connectionString })` es válido |
| `adapter` obligatorio en el cliente | `node_modules/@prisma/client/runtime/client.d.ts:2112,2151,2165` | "A driver adapter ... is **required**"; `adapter: SqlDriverAdapterFactory;` |
| `--config` en `prisma generate` | `npx prisma generate --help` | `--config   Custom path to your Prisma config file`. También existe `--require-models` ("Do not allow generating a client without models"): por defecto genera sin modelos (S-05 confirmada) |
| Las cuatro opciones del generador `prisma-client` | `npx prisma validate` y `npx prisma format --check` | Aceptadas tal cual; `format --check` → "All files are formatted correctly!" sin realinear |
| Nombre del archivo de entrada generado | `ls src/adapters/db/generated` | `client.ts` (además `browser.ts`, `commonInputTypes.ts`, `enums.ts`, `models.ts`, `internal/`, `models/`); `client.ts:40` `export const PrismaClient = $Class.getPrismaClientClass()`, `:41` `export type PrismaClient<...>`. La ruta `./generated/client.js` del plan no cambió |
| Preámbulo `@ts-nocheck` | `head -8 src/adapters/db/generated/client.ts` | Línea 5: `// @ts-nocheck ` (presente en los 8 archivos `.ts` generados). `tsc` estricto compila sin ajustes (V-08) |
| Texto de carga del config | `npx prisma validate` | `Loaded Prisma config from prisma.config.ts.` (exacto al esperado) |
| Contenido de `@prisma/engines` | `ls node_modules/@prisma/engines` | `schema-engine-windows.exe` (más `dist`, `scripts`, `package.json`...). No hay motor de consultas; `npx prisma -v` reporta `Query Compiler : enabled`. La frase del README §2 ("descarga el motor de esquema que usa el CLI de Prisma para las migraciones") es la correcta |
| Mensaje de variable ausente | V-20 | `PrismaConfigEnvError: Cannot resolve environment variable: DATABASE_URL.` — estable (mensaje de la clase); citado en README §8 |
| Cierre del pool (R-11) | V-10, V-12, V-15 | `npm test` termina solo (1.61 s); la API sale tras `taskkill` y el puerto queda libre; sin `process.exit` añadido |

`head -8 src/adapters/db/generated/client.ts` literal:

```

/* !!! This is code generated by Prisma. Do not edit directly. !!! */
/* eslint-disable */
// biome-ignore-all lint: generated file
// @ts-nocheck 
/*
 * This file should be your main import to use Prisma. Through it you get access to all the models, enums, and input types.
 * If you're looking for something you can import in the client-side of your application, please refer to the `browser.ts` file instead.
```

## Decisión DEC-05 (importación estática en `server.ts`) — V-14

Desde `backend/` con `.env` presente en el cwd y sin bandera de env:

```
$ env -u DATABASE_URL node dist/server.js; echo "codigo=$?"
Configuración inválida. Revisa backend/.env (si no existe, copia backend/.env.example):
  - DATABASE_URL: obligatoria
codigo=1
```

Falla como debe, sin valores y sin llegar a escuchar (puerto 3000 vacío después). **La importación estática de `./app.js` se queda.** Con Prisma 7 y el generador `prisma-client`, importar `app.js` (que carga `adapters/db` → `generated/client.js` → `@prisma/client/runtime/client`, `@prisma/adapter-pg` → `pg`) no carga `backend/.env` en `process.env`.

## Verificaciones V-01 a V-21

**V-01** — ok. `node --version` → `v24.11.1`; `npm --version` → `11.6.2`; `docker compose ps` → `campus-dev-postgres-1 ... Up 42 minutes (healthy)` (también `minio` y `livekit` healthy); `git status --short` → solo `?? docs/trabajo/BACK-02-prisma-7/`.

**V-02** — ok. Salidas en la primera sección. Sin parada.

**V-03** — ok. `npm install` desde la raíz: código 0, `added 123 packages, removed 27 packages, changed 32 packages, and audited 347 packages in 49s`; `grep -c "ERESOLVE\|UNMET PEER"` → 0. `npm ls ...` → una versión de cada uno, `pg@8.23.0 deduped` bajo `@prisma/adapter-pg` y `pg-pool`. `ls node_modules/@prisma/engines` → `LICENSE README.md dist node_modules package.json schema-engine-windows.exe scripts`. `npx prisma -v` (desde `backend/`):

```
Prisma schema loaded from prisma\schema.prisma.
prisma               : 7.10.0
@prisma/client       : 7.10.0
Operating System     : win32
Architecture         : x64
Node.js              : v24.11.1
TypeScript           : 5.9.3
Query Compiler       : enabled
PSL                  : @prisma/prisma-schema-wasm 7.10.0-4.0edf323efd1d98336f3f0a68684b56f689b900d3
Schema Engine        : schema-engine-cli 0edf323efd1d98336f3f0a68684b56f689b900d3 (at ..\node_modules\@prisma\engines\schema-engine-windows.exe)
Default Engines Hash : 0edf323efd1d98336f3f0a68684b56f689b900d3
Studio               : 0.33.0
Prisma CLI Path      : C:\Users\Carlos\Documents\Proyecto_PlataformaEducativa\node_modules\prisma
```

`npm audit` → 4 altas (sección M-04). `git status --short` tras instalar → `M backend/package.json`, `M package-lock.json`, `M package.json` (más la carpeta no rastreada del encargo). `node_modules/.prisma/client` (Prisma 6) sigue ahí, huérfano (R-17, no se borra).

**V-04** — ok. Puntos [verificar] en la tabla anterior. `npx prisma validate` → `Loaded Prisma config from prisma.config.ts.` / `Prisma schema loaded from prisma\schema.prisma.` / `The schema at prisma\schema.prisma is valid`, código 0. `npx prisma format --check` → `All files are formatted correctly!`, código 0 (imprime además el recuadro "Update available 7.10.0 -> 8.0.0-rc.15"). Ninguna salida imprime la URL.

**V-05** — ok. `npx prisma generate` → `✔ Generated Prisma Client (7.10.0) to .\src\adapters\db\generated in 15ms`, código 0. `ls` → `browser.ts client.ts commonInputTypes.ts enums.ts internal models models.ts` (44 KB). `grep` → `40:export const PrismaClient = $Class.getPrismaClientClass()` y `41:export type PrismaClient<...>`. `git check-ignore -v src/adapters/db/generated` → `.gitignore:9:backend/src/adapters/db/generated/`. `git status --short` no la muestra.

**V-06** — ok. `npx prisma migrate status`:

```
Loaded Prisma config from prisma.config.ts.
Prisma schema loaded from prisma\schema.prisma.
Datasource "db": PostgreSQL database "campus_dev", schema "public" at "127.0.0.1:5433"
1 migration found in prisma/migrations
Database schema is up to date!
```

(código 0; imprime host, puerto y nombre de la base, no credenciales). `ls prisma/migrations` → `20260922015711_extensiones_iniciales migration_lock.toml`; `migration_lock.toml` idéntico (`provider = "postgresql"` con las dos líneas de cabecera); `git diff --quiet -- prisma/migrations; echo $?` → `0`; `git status --short prisma` → solo `M prisma/schema.prisma`. Repetido al final del encargo (tras V-20 y V-21): sigue `0`.

**V-07** — ok. `_prisma_migrations` → una fila `20260922015711_extensiones_iniciales | t | t`; `pg_extension` → `pg_trgm`, `plpgsql`, `unaccent`; bases `prisma_migrate_shadow%` → `(0 rows)`.

**V-08** — ok. `npm run typecheck` en `backend/` → `tsc -p tsconfig.json --noEmit`, código 0, sin errores dentro ni fuera de `generated/**`. `tsconfig` sin tocar.

**V-09** — ok. `npx prettier --write prisma.config.ts src test --ignore-path ../.prettierignore` desde `backend/`: reescribió solo `src/adapters/db/cliente.ts` (el `throw new AppError(...)` a tres líneas) y `test/setup.ts` (el `new Error(..., { cause })` a tres líneas); el resto `(unchanged)`; ningún archivo de `generated/` en la lista. `npx prettier --write eslint.config.mjs` desde la raíz → `(unchanged)`. `npx eslint --version` → `v10.11.0`. `npm run lint` desde la raíz → código 0: `shared` ESLint sin salida y `All matched files use Prettier code style!`; `backend` `prelint` (`shared:build` + `✔ Generated Prisma Client (7.10.0) ... in 23ms`), ESLint sin salida, Prettier limpio, `typecheck` limpio. `grep -i "deprecat|warning"` sobre el log → sin coincidencias. `preserve-caught-error` no marcó nada tras el cambio en `setup.ts`; ninguna regla desactivada. Extra: `npx prettier --check .` desde la raíz → `All matched files use Prettier code style!`.

**V-10** — ok. `npm test` desde la raíz (salida en `backend/tmp/test.log`, borrado al final): código 0; `Test Files  6 passed (6)`; `Tests  24 passed (24)`; `Duration  1.61s`; terminó solo. `grep -c FSTDEP024` → 0; `grep -c DeprecationWarning` → 0. El log muestra `"requestId":"req-1"` en las líneas de Fastify (DEC-06). Repetido en V-21 §6 con el mismo resultado (`6 passed`, `24 passed`, 1.23 s).

**V-11** — ok. `npm run build` desde la raíz → código 0 (`prebuild` regeneró el cliente). Existen `shared/dist/index.js`, `backend/dist/server.js`, `backend/dist/worker.js`, `backend/dist/adapters/db/cliente.js`, `backend/dist/adapters/db/generated/client.js` (más `browser.js`, `commonInputTypes.js`, `enums.js`, `models.js`, `internal/` y sus `.map`).

**V-12** — ok (segundo intento; el primero lo invalidó un proceso ajeno, ver Desviaciones). API desde `dist/` con PID 16052 (confirmado como dueño del puerto durante la prueba):

```
HTTP/1.1 200 OK
content-type: application/json; charset=utf-8
{"estado":"ok","baseDeDatos":"ok","marcaDeTiempo":"2026-09-22T14:28:08.486Z"}

HTTP/1.1 404 Not Found
{"error":{"codigo":"NO_ENCONTRADO","mensaje":"La ruta no existe."}}
```

Petición con `Authorization: Bearer secreto` y `Cookie: a=b` → 200. `taskkill //PID 16052 //T //F` → terminado. `grep -c FSTDEP024` → 0; `grep -c '"reqId"'` → 0; `grep -c '"requestId":"req-'` → 6; `grep -c "secreto\|a=b"` → 0. Línea del log: `{"level":30,"time":1790087288431,"pid":16052,"hostname":"DESKTOP-V1UGQQH","requestId":"req-1","req":{"method":"GET","url":"/api/salud","host":"127.0.0.1:3000","remoteAddress":"127.0.0.1","remotePort":58058},"msg":"incoming request"}`. Primera línea: `"msg":"Server listening at http://127.0.0.1:3000"`. `Get-NetTCPConnection -LocalPort 3000 -State Listen` después → vacío.

**V-13** — ok. `node --env-file-if-exists=.env dist/worker.js` (PID 13912): `{"level":30,"time":1790087164231,"pid":13912,"hostname":"DESKTOP-V1UGQQH","evento":"worker_listo","msg":"Worker listo, sin trabajos registrados"}`; sin errores; `taskkill` → terminado.

**V-14** — ok. Salida en la sección DEC-05. Código 1, mensaje sin valores; la importación estática se conserva.

**V-15** — ok. `npm run dev` con `Start-Process npm.cmd` (PowerShell, 15 s de espera): `tmp/dev.log` → `> tsx watch --env-file-if-exists=.env src/server.ts`, `"msg":"Server listening at http://127.0.0.1:3000"`, y tras el `curl.exe` desde otra invocación `"requestId":"req-1" ... "url":"/api/salud"` y `"statusCode":200`; respuesta `{"estado":"ok","baseDeDatos":"ok","marcaDeTiempo":"2026-09-22T14:29:45.857Z"}`; `tmp/dev.err` solo `Loaded Prisma config from prisma.config.ts.` / `Prisma schema loaded from prisma\schema.prisma.` (`grep -c FSTDEP024` → 0 en ambos). `tsx watch` transpiló el cliente generado `.ts` sin quejas. `taskkill /PID <npm> /T /F` terminó el árbol (6 procesos). `npm run dev:worker` igual: `"evento":"worker_listo"`, `devw.err` solo con las dos líneas de Prisma, árbol terminado. Ningún `node.exe` del repositorio vivo y puerto libre después de cada uno.

**V-16** — ok. `grep -rn ... --exclude-dir=generated` → exactamente tres líneas: `backend/src/adapters/db/cliente.ts:1` (importación de `@prisma/adapter-pg`), `cliente.ts:6` (comentario) y `backend/src/adapters/README.md:3` (texto). Nota: `cliente.ts:4` importa `./generated/client.js`, ruta relativa que el patrón `adapters/db/generated` no alcanza por diseño.

**V-17** — ok. Con `src/core/prueba-capa.ts`: `import "@prisma/adapter-pg"` → `error '@prisma/adapter-pg' import is restricted from being used. "@prisma/adapter-pg" solo se importa dentro de backend/src/adapters/ (AGENTS.md, regla 1) no-restricted-imports`; `import "pg"` → ídem con `"pg"`; `import "../adapters/db/generated/client.js"` → `restricted from being used by a pattern. core/ es logica pura: no importa adapters, handlers, middleware, fastify ni pino`. Con `src/handlers/prueba-capa.ts` (`generated` + `pg`): `2 problems (2 errors)`: `El cliente generado de Prisma solo se importa dentro de backend/src/adapters/db/ (AGENTS.md, regla 1)` y el de `"pg"`. Código 1 en las cuatro corridas. Temporales borrados; `npx eslint --config ../eslint.config.mjs .` → código 0.

**V-18** — ok. `git status --short --untracked-files=all` → los 17 modificados y 2 nuevos de la lista final más `docs/trabajo/BACK-02-prisma-7/{aprobacion,plan}.md` (preexistentes, no rastreados). `git check-ignore -v` → `backend/.env` (`.gitignore:4:.env`), `backend/src/adapters/db/generated` (`:9`), `backend/dist` (`:2:dist/`), `backend/tmp` (`:8`). `git check-ignore backend/prisma.config.ts backend/.env.example; echo $?` → `1` (no ignorados). `git diff --quiet -- tsconfig.base.json backend/tsconfig.json backend/vitest.config.ts backend/src/worker.ts backend/src/config backend/src/core backend/src/handlers shared infra AGENTS.md CLAUDE.md docs/ARCHITECTURE.md docs/ARCHITECTURE-ESSENTIALS.md docs/PRD.md; echo $?` → `0`.

**V-19** — ok. `git ls-files --eol` de los 17 rastreados → todos `i/lf w/lf attr/text=auto eol=lf` (incluido `package-lock.json`). `git ls-files --eol --others --exclude-standard` → `backend/prisma.config.ts`, `backend/test/db-cliente.test.ts`, `aprobacion.md`, `plan.md`, todos `w/lf`. Este resumen se escribió con LF.

**V-20 (informativa)** — ejecutada. `backend/tmp/prisma.config.sin-env.ts` (ignorado por `.gitignore:8`) con `schema: "../prisma/schema.prisma"`, `migrations: { path: "../prisma/migrations" }`, `datasource: { url: env("DATABASE_URL") }` y sin `loadEnvFile`:

```
$ env -u DATABASE_URL npx prisma generate --config tmp/prisma.config.sin-env.ts
Failed to load config file "C:\...\backend\tmp\prisma.config.sin-env.ts" as a TypeScript/JavaScript module. Error: PrismaConfigEnvError: Cannot resolve environment variable: DATABASE_URL.
codigo=1

$ env -u DATABASE_URL npx prisma migrate status --config tmp/prisma.config.sin-env.ts
Failed to load config file "..." as a TypeScript/JavaScript module. Error: PrismaConfigEnvError: Cannot resolve environment variable: DATABASE_URL.
codigo=1
```

Conclusión para el encargo de despliegue: **`prisma generate` no funciona sin `DATABASE_URL`** con este `prisma.config.ts`, porque `env()` se evalúa al cargar el archivo (R-13 confirmado en `@prisma/config/dist/index.js:515`). En la etapa de build del Dockerfile hará falta una `DATABASE_URL` de relleno (sin secreto real) o un config alternativo que no llame a `env()` de forma ansiosa; lo decide ese encargo. `migrate status` falla con el mismo mensaje claro. Temporal borrado; `generated/` y las migraciones intactos (`git diff --quiet -- prisma/migrations` → 0).

**V-21** — ok. En `powershell.exe -NoProfile`: §3 `Set-Location backend; if (-not (Test-Path .env)) { Copy-Item .env.example .env }` → sin copia (`.env existe=True`), cwd `backend`. §4 `npx prisma generate` → `✔ Generated Prisma Client (7.10.0) ... in 29ms`, código 0 (`migrate dev` **no** ejecutado, como manda el plan). §5 `npm run dev` vía `Start-Process` y, durante la espera, `curl.exe http://127.0.0.1:3000/api/salud` → `{"estado":"ok","baseDeDatos":"ok","marcaDeTiempo":"2026-09-22T14:32:02.714Z"}` y `curl.exe -i http://127.0.0.1:3000/api/no-existe` → `HTTP/1.1 404 Not Found` + `{"error":{"codigo":"NO_ENCONTRADO","mensaje":"La ruta no existe."}}`; árbol terminado con `taskkill`. §6 `npm test` desde la raíz → `Test Files 6 passed (6)`, `Tests 24 passed (24)`, `codigo_npm_test=0`. §7 `npm run dev:worker`: no repetido; es el mismo comando ejecutado tal cual en V-15 (`worker_listo`). No ejecutados por interactivos: Ctrl+C (sustituido por `taskkill`), `npx prisma migrate dev` (prohibido por el plan).

## Desviaciones del plan

1. **Función `ultima` (V-02).** El one-liner del plan no funciona en el Bash de esta sesión (pierde las barras invertidas del regex). Misma lógica, mismo filtro y mismo orden en un script del scratchpad con `[.][0-9]+` en lugar de `\.\d+`. Mismo resultado esperado por el plan.
2. **Proceso preexistente en el puerto 3000 (V-12).** Al arrancar la API desde `dist/` obtuve `EADDRINUSE`: el puerto lo ocupaba un `npm run dev --workspace backend` (PID 15056, creado 07:38:33, **antes de mi primer comando**) con su `tsx watch src/server.ts` (22320) e hijo (23348, que se reinició a las 08:25:28 al cambiar `src/` por mis ediciones). Las respuestas 200/404 de ese primer intento venían de ese proceso, así que las descarté. El plan prevé "cambiar `PORT` solo en `backend/.env`", pero el orquestador exige `backend/.env` intacto y ningún proceso de Node vivo al terminar, y el watcher se reiniciaba con cada edición mía. Terminé ese árbol con `taskkill //PID 15056 //T //F` (remedio documentado en README §8 para un `tsx watch` huérfano; cuatro procesos, ninguno del runtime de Codex que también corre en la máquina) y repetí V-12 con mi propio proceso (PID 16052). No edité `backend/.env`. Quien lo hubiera arrancado debe saber que ya no está.
3. **Prettier acotado con `--ignore-path` (V-09).** Al `npx prettier --write prisma.config.ts src test` desde `backend/` le añadí `--ignore-path ../.prettierignore` (la misma bandera de los scripts `lint`/`format` del paquete) para que respetara la exclusión de `generated/`. La salida confirma que ningún archivo generado fue tocado. Alcance idéntico al del plan.
4. **V-21 §7 no repetido.** `npm run dev:worker` se ejecutó exactamente con ese comando en V-15; no lo volví a lanzar en V-21. §5 se ejecutó vía `Start-Process` (no interactivo) con los dos `curl.exe` del README.

Detalles que no considero desviaciones y anoto: V-14 llevó un `timeout 20` de guarda por si el proceso arrancaba (no hizo falta: salió al instante con código 1). En README §8 la viñeta nueva lleva el mensaje de Prisma citado entre paréntesis, como permitía el plan. Borré al final mis logs de `backend/tmp/` (`api.log`, `worker.log`, `dev*.log`, `dev*.err`, `devw.*`, `test.log`); dejé `backend/tmp/worker.err` (21 sep 20:07, de BACK-01, no es mío). Los archivos del scratchpad (`ultima.cjs`, `prisma-versions.json`, logs de `npm install`/`lint`/`build`) están fuera del repositorio.

## `npm audit` (M-04), solo lectura

Antes (`prisma@6.19.3`): `3 high severity vulnerabilities` — `deepmerge-ts <8.0.0` (GHSA-ggr8-5vv4-36mx) vía `prisma → @prisma/config → deepmerge-ts`; "fix" propuesto: degradar a `prisma@6.12.0`.

Después (`prisma@7.10.0`): `4 high severity vulnerabilities`:
- `deepmerge-ts <8.0.0` (la misma cadena; `@prisma/config 6.13.0-dev.1 - 8.1.0-dev.4`, `prisma 6.13.0-dev.1 - 8.1.0-dev.6`).
- **Nueva:** `mysql2 <=3.23.0` (GHSA-3f6p-5ww8-9rcr "Auth Plugin Downgrade to mysql_clear_password Leaks Plaintext Credentials" y GHSA-rgwj-5xj2-c3m3 "Unbounded zlib inflate ... decompression-bomb DoS"), dependencia directa del CLI `prisma@7.10.0` (`npm explain mysql2` → `from prisma@7.10.0`). Nadie la importa; el proyecto no usa MySQL.

"fix" propuesto por npm: `npm audit fix --force` → `prisma@6.19.3` (retroceso de mayor). **No ejecutado.** Se acepta y se anota, como M-04. Ambas viven bajo el CLI; `@prisma/client` no depende de ellas (ver la nota del lock sobre `--omit=dev`).

## No verificado

- Comportamiento en `prod`/Docker (Dockerfile no existe todavía); solo la inferencia de V-20.
- `prisma migrate dev` con Prisma 7 y `prisma.config.ts` (prohibido en este encargo; el README §4 lo sigue documentando como estaba).
- Ctrl+C en `npm run dev` / `dev:worker` (sustituido por `taskkill` del árbol).
- Efecto del parámetro `?schema=public` de la URL en `PrismaPg` (R-12): no medible con el esquema `public` por defecto.

## Archivos

Creados:
- `backend/prisma.config.ts`
- `backend/test/db-cliente.test.ts`
- `docs/trabajo/BACK-02-prisma-7/resumen-programador.md` (este archivo)

Modificados (17, `git diff --stat`: 1798 inserciones, 632 borrados, de las cuales 1701/600 son de `package-lock.json`):
- `package.json` (`@eslint/js ^10.0.1`, `eslint ^10.11.0`)
- `package-lock.json` (regenerado por `npm install`)
- `backend/package.json` (`@prisma/adapter-pg ^7.10.0`, `@prisma/client ^7.10.0`, `pg ^8.23.0`, `prisma ^7.10.0`, script `prelint`)
- `backend/prisma/schema.prisma` (generador `prisma-client` con `output`, `runtime`, `moduleFormat`, `importFileExtension`, `generatedFileExtension`; datasource sin `url`)
- `backend/src/adapters/db/cliente.ts` (`inicializarDb`, `obtenerDb`, `cerrarConexion` con `PrismaPg` y el cliente generado)
- `backend/src/adapters/db/salud.ts` (`obtenerDb()` fuera del `try`)
- `backend/src/adapters/db/index.ts` (reexporta `cerrarConexion`, `inicializarDb`, `verificarConexion`)
- `backend/src/adapters/README.md` (lista de librerías)
- `backend/src/app.ts` (`inicializarDb` con `env.DATABASE_URL`; `logController: new LogController({ requestIdLogLabel: "requestId" })`)
- `backend/src/server.ts` (importación estática de `./app.js`; comentario actualizado)
- `backend/test/setup.ts` (`{ cause: error }`)
- `backend/test/salud-sin-base.integracion.test.ts` (el doble expone `inicializarDb`)
- `eslint.config.mjs` (lista con `@prisma/adapter-pg` y `pg`; patrón `clienteGenerado`; `ignores` con `generated/**`; ninguna regla desactivada)
- `.prettierignore` (`backend/src/adapters/db/generated`)
- `.gitignore` (`backend/src/adapters/db/generated/`)
- `backend/.env.example` (solo el comentario de `DATABASE_URL`; mismas 5 variables, mismo valor)
- `README.md` (solo "Backend en local": §2 frase final, §3 última frase, §4 párrafo de `generate`, §8 viñeta sustituida y viñeta nueva)

No tocados (confirmado con `git diff --quiet`): `backend/prisma/migrations/**`, `backend/src/worker.ts`, `backend/src/config/*`, `backend/src/core/*`, `backend/src/handlers/*`, `backend/tsconfig.json`, `tsconfig.base.json`, `backend/vitest.config.ts`, `shared/**`, `frontend/**`, `infra/**`, `AGENTS.md`, `CLAUDE.md`, `.claude/`, `docs/ARCHITECTURE*.md`, `docs/PRD.md`, `.gitattributes`, `plan.md`, `aprobacion.md`. No versionado y generado por el CLI: `backend/src/adapters/db/generated/` (8 archivos `.ts`, 44 KB).

## Pendiente o fuera de alcance detectado (no aplicado)

1. **Lock y `--omit=dev` (para el encargo de despliegue).** `prisma`, `mysql2`, `postgres`, `@prisma/dev` y `@prisma/studio-core` quedan marcados `peer` (no `dev`) en `package-lock.json` por el par opcional `prisma "*"` de `@prisma/client`; un `npm ci --omit=dev` los instalaría en la imagen de `prod`. Si se quiere una imagen sin el CLI, hará falta `--omit=peer` o una etapa separada para migraciones (que de todos modos necesita el CLI, `prisma.config.ts`, `prisma/` y `DATABASE_URL`).
2. **`prisma generate` en el Dockerfile necesita `DATABASE_URL`** (V-20). Anotar en `ARCHITECTURE.md` §18 (pendiente 8 de la aprobación).
3. **`mysql2` con dos avisos altos** como dependencia del CLI (M-04 ampliado). Revisar cuando Prisma publique una 7.x/8.x con `mysql2 > 3.23.0` y `deepmerge-ts >= 8`.
4. **Regla de ESLint a `adapters/db/**`** cuando exista el segundo adaptador (DEC-10, ya anotado por el plan).
5. **`AGENTS.md` regla 1 y ESSENTIALS**: la línea ampliada la aplica el orquestador (C-01); no la toqué.
6. **Proceso `npm run dev` externo**: si el humano o el orquestador lo tenía arrancado a propósito, hay que volver a lanzarlo (desviación 2).
7. `node_modules/.prisma/client` (Prisma 6) sigue en disco, huérfano (R-17); desaparece con un `node_modules` limpio.

## Estado del entorno al terminar

Ningún `node.exe` con la ruta del repositorio en su línea de comandos; `Get-NetTCPConnection -LocalPort 3000 -State Listen` vacío; infra como estaba (`postgres`, `minio`, `livekit` `Up (healthy)`); `backend/.env` intacto (811 bytes, fecha 21 sep 19:47, ignorado por git) y nunca leído ni impreso; temporales de V-17 y V-20 y logs propios de `backend/tmp/` borrados; sin `git add`, `commit`, `push`, `restore`, `stash` ni `checkout`; sin `docker compose down`; sin comandos de Prisma fuera de `-v`, `--help`, `validate`, `format --check`, `generate` y `migrate status`.
