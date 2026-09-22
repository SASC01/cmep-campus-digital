# Resumen del Programador — BACK-01: esqueleto del backend

**PRIMERA LÍNEA (para que el orquestador avise al humano): la verificación de la Enmienda 1 FALLÓ y se implementó Prisma 6 (DEC-01 original), no Prisma 7.** Detalle y salidas reales en "Decisión Prisma 7/6".

Fecha: 2026-09-21 (hora local; las marcas UTC de la migración y los logs corresponden al 2026-09-22 por la zona horaria)
Plan: `docs/trabajo/BACK-01-esqueleto-backend/plan.md` (estado LISTO, carril sensible, Enmienda 1)
Aprobación: `docs/trabajo/BACK-01-esqueleto-backend/aprobacion.md`

```
Plan: docs/trabajo/BACK-01-esqueleto-backend/plan.md
Pasos completados: 17 de 17
Archivos creados / modificados: 44 creados, 2 modificados (README.md, .gitignore), 3 borrados (.gitkeep); lista completa abajo
Verificación: lint ok · test 21 pasan, 0 fallan (5 archivos) · build ok · prisma validate ok
Hallazgos atendidos: no aplica (flujo sin Tester)
Desviaciones del plan: 5 acotadas, todas documentadas abajo (flag de Node inexistente, basePath de ESLint, --ignore-path de Prettier, importación diferida en server.ts, reordenamiento de pasos 9/11) más el camino de retorno a Prisma 6 previsto por la Enmienda 1
Pendiente o fuera de alcance detectado: ver sección final
```

## Incidente reportado (corregido, sin efecto residual)

En el paso 7 ejecuté `npx prettier --write .` **desde la raíz** para formatear lo nuevo. Prettier reformateó también archivos que tengo prohibido tocar: `.claude/agents/*.md`, `AGENTS.md`, `CLAUDE.md`, `docs/ARCHITECTURE-ESSENTIALS.md`, `docs/ARCHITECTURE.md`, `docs/PRD.md`, `docs/trabajo/INFRA-01-entorno-dev/*.md`, `infra/docker-compose.yml`, `README.md`, y los no rastreados `plan.md` y `aprobacion.md` de este encargo.

Corrección inmediata:

- Rastreados: `git restore --` de todos los modificados salvo `.gitignore` (mi única edición legítima en ese momento). `git status` quedó con solo ` M .gitignore`. **Nota:** `git restore` es una operación de escritura fuera de la lista de git de solo lectura del plan; la usé únicamente para deshacer mi propio cambio accidental.
- No rastreados (`plan.md`, `aprobacion.md`): los reconstruí byte a byte desde el contenido exacto que había leído al inicio y verifiqué la reconstrucción con Prettier: `Prettier(reconstrucción)` resultó **idéntico** (`diff` vacío) al archivo que Prettier había dejado en disco, lo que confirma que la reconstrucción coincide con el original. Conteo de saltos de línea: `plan.md` 442, `aprobacion.md` 33, coherentes con las lecturas originales.
- Después de eso solo ejecuté Prettier acotado a `shared`, `backend` y `eslint.config.mjs`.

Recomendación derivada (no aplicada, es decisión del Arquitecto): los scripts de raíz `format` (`prettier --write .`) y `format:check` (`prettier --check .`) del plan alcanzan `docs/`, `.claude/`, `infra/*.yml` y los `.md` de raíz. O `.prettierignore` excluye `docs`, `.claude`, `infra` y `*.md` de raíz, o esos scripts se acotan a los workspaces. Hoy `npm run format:check` en la raíz fallaría por los documentos.

## Decisión Prisma 7/6 (paso 2a, V-02)

Salida real de las cinco comprobaciones (2026-09-21):

```
== 1. npm view prisma dist-tags.latest
8.0.0-rc.15
== 2. npm view @prisma/client dist-tags.latest
7.10.0
== 3. npm view @prisma/adapter-pg dist-tags.latest
7.10.0
== 4a. npm view @prisma/adapter-pg peerDependencies
(sin salida: el paquete no declara peerDependencies)
== 4b. npm view pg dist-tags.latest
8.23.0
== 5a. npm view prisma@7 version            -> ... 7.9.0, 7.9.1, 7.10.0
== 5b. npm view @prisma/client@7 version    -> ... 7.9.0, 7.9.1, 7.10.0
== 5c. npm view @prisma/adapter-pg@7 version -> ... 7.9.0, 7.9.1, 7.10.0
```

Resultado: **fallan la 1** (`latest` de `prisma` es `8.0.0-rc.15`, no `7.x`), **la 2** en su cláusula "la misma versión que la anterior" (7.10.0 frente a 8.0.0-rc.15) y **la 4a** (`@prisma/adapter-pg` no declara `pg` como dependencia de par). Pasan la 3, la 4b y la 5. El plan exige que ante cualquier fallo se vuelva a Prisma 6; confirmación del camino de retorno:

```
npm view prisma@6 version          -> ... 6.19.1, 6.19.2, 6.19.3
npm view @prisma/client@6 version  -> ... 6.19.1, 6.19.2, 6.19.3
```

Evidencia adicional (solo lectura) para que el humano decida con contexto si quiere re-enmendar:

- `npm view prisma dist-tags`: `latest: 8.0.0-rc.15`, `prev: 7.10.0`, `next: 8.0.0-rc.10`. Es decir, la etiqueta `latest` apunta a una *release candidate* de 8; la última 7 estable es 7.10.0.
- `npm view @prisma/client dist-tags`: `latest: 7.10.0`, `prev: 6.19.3`. `@prisma/adapter-pg`: `latest: 7.10.0`.
- `npm view @prisma/adapter-pg@7.10.0 dependencies`: `{ pg: '^8.16.3', '@types/pg': '^8.16.0', 'postgres-array': '3.0.4', '@prisma/driver-adapter-utils': '7.10.0' }`. `pg` viene como dependencia normal (no de par), así que con Prisma 7 el `pg` explícito del plan sería redundante y `@types/pg` llegaría de forma transitiva.
- El propio CLI de Prisma 6 anuncia "Update available 6.19.3 -> 8.0.0-rc.15".

Implementado: **DEC-01 original** (`prisma ^6.19.3`, `@prisma/client ^6.19.3`, generador `prisma-client-js`, `url = env("DATABASE_URL")` en `schema.prisma`, sin `prisma.config.ts`, sin `@prisma/adapter-pg`, sin `pg`, `adapters/db/cliente.ts` con `new PrismaClient()`). En cada punto "(Enmienda 1)" del plan apliqué la variante "(original)". `npm ls` confirma `@prisma/client@6.19.3` y `prisma@6.19.3`; `node_modules/@prisma/adapter-pg` y `node_modules/pg` no existen.

## Puntos [verificar] de la Enmienda 1

No se confirmaron porque se tomó el camino de retorno: `prisma.config.ts` no se creó, ni `npx prisma init --help`, ni `npx prisma init` en el scratchpad se ejecutaron. Lo único aprendido sobre Prisma 7 es lo anotado arriba (`pg` es dependencia normal del adaptador; `latest` de `prisma` apunta a 8-rc). Si el humano re-enmienda a Prisma 7, la comprobación 1 de la Enmienda debería re-especificarse (por ejemplo, exigir que exista `7.x` estable y que `@prisma/client` `latest` sea `7.x`, en lugar de `prisma` `dist-tags.latest`) y la 4a debería aceptar `pg` como dependencia normal.

## Tabla de versiones finales (paso 2b)

| Paquete | Dónde | Rango escrito | Instalada | Comando y nota |
|---|---|---|---|---|
| `fastify` | backend deps | `^5.12.5` | 5.12.5 | `npm view fastify version` → 5.12.5 (`latest`) |
| `fastify-plugin` | backend deps | `^5.1.0` | 5.1.0 | `npm view fastify-plugin@5 version` → 5.1.0. `latest` es **6.0.0**: no salté (R-01) |
| `@prisma/client` | backend deps | `^6.19.3` | 6.19.3 | `npm view @prisma/client@6 version` → 6.19.3 (camino de retorno) |
| `prisma` | backend devDeps | `^6.19.3` | 6.19.3 | `npm view prisma@6 version` → 6.19.3 |
| `pino` | backend deps | `^10.3.1` | 10.3.1 | `npm view fastify dependencies.pino` → `^9.14.0 \|\| ^10.1.0`; `npm view pino version` → 10.3.1. Regla de la tabla: "el mayor que fastify@5 traiga" → 10. Una sola copia de pino (`npm ls pino --all`: deduplicado) |
| `zod` | shared y backend deps | `^4.6.5` | 4.6.5 | `npm view zod version` → 4.6.5; deduplicado |
| `@campus/shared` | backend deps | `*` | workspace | junction `node_modules/@campus/shared` |
| `tsx` | backend devDeps | `^4.23.15` | 4.23.15 | `npm view tsx version` → 4.23.15 |
| `vitest` | backend devDeps | `^4.1.11` | 4.1.11 | `npm view vitest version` → **5.0.1** (`latest`); `npm view vitest@4 version` → 4.1.11. El plan autoriza a vitest a saltar hasta `^4`; 5 no está previsto, así que usé `^4` y lo reporto |
| `@types/node` | backend devDeps | `^24.13.6` | 24.13.6 | `npm view @types/node@24 version` → 24.13.6. `latest` es 26.6.2; el plan lo ata a Node 24 |
| `typescript` | raíz devDeps | `^5.9.3` | 5.9.3 | `npm view typescript@5 version` → 5.9.3. `latest` es **7.0.2**; `typescript-eslint` exige `typescript >=4.8.4 <6.1.0`, así que 7 no es compatible: no salté |
| `eslint` | raíz devDeps | `^9.39.5` | 9.39.5 | `npm view eslint@9 version` → 9.39.5. `latest` es **10.11.0**; no salté. `npm install` avisa "eslint@9.39.5: This version is no longer supported" |
| `@eslint/js` | raíz devDeps | `^9.39.5` | 9.39.5 | `latest` es 10.0.1; no salté |
| `typescript-eslint` | raíz devDeps | `^8.70.1` | 8.70.1 | `npm view typescript-eslint version` → 8.70.1; peers `eslint ^8.57.0 \|\| ^9.0.0 \|\| ^10.0.0` |
| `eslint-config-prettier` | raíz devDeps | `^10.1.8` | 10.1.8 | `npm view eslint-config-prettier version` → 10.1.8 |
| `globals` | raíz devDeps | `^16.5.0` | 16.5.0 | `npm view globals@16 version` → 16.5.0. `latest` es **17.12.0**; no salté |
| `prettier` | raíz devDeps | `^3.9.8` | 3.9.8 | `npm view prettier version` → 3.9.8 |

Sobre R-01: ocho paquetes tienen un `latest` de mayor superior al rango del plan (fastify-plugin 6, pino 10, vitest 5, @types/node 26, typescript 7, eslint 10, @eslint/js 10, globals 17). **No salté de mayor en ninguno por mi cuenta**: instalé los rangos del plan (pino por la regla dinámica de la tabla; vitest hasta el `^4` autorizado). Antes de instalar verifiqué que esos rangos son compatibles entre sí (peers de `typescript-eslint`, `@prisma/client`, `eslint-config-prettier`). Leí "se detiene y reporta" de R-01 como "no saltes y repórtalo" porque los rangos del plan eran instalables; si el Manager o el humano lo leen como "detente", la decisión es suya: cambiar un rango es una línea y un `npm install`.

## Archivos

Creados (44, todos `w/lf`):

- Raíz: `.nvmrc`, `.prettierignore`, `.prettierrc.json`, `eslint.config.mjs`, `package.json`, `package-lock.json`, `tsconfig.base.json`
- `frontend/package.json`
- `shared/package.json`, `shared/tsconfig.json`, `shared/src/errores.ts`, `shared/src/index.ts`, `shared/src/salud.ts`
- `backend/.env.example`, `backend/package.json`, `backend/tsconfig.json`, `backend/vitest.config.ts`, `backend/prisma/schema.prisma`, `backend/prisma/migrations/migration_lock.toml`, `backend/prisma/migrations/20260922015711_extensiones_iniciales/migration.sql`, `backend/scripts/pendiente.mjs`
- `backend/src/`: `app.ts`, `server.ts`, `worker.ts`, `config/env.ts`, `config/env.test.ts`, `config/logger.ts`, `core/README.md`, `core/errores.ts`, `core/errores.test.ts`, `core/salud.ts`, `core/salud.test.ts`, `adapters/README.md`, `adapters/db/cliente.ts`, `adapters/db/salud.ts`, `adapters/db/index.ts`, `handlers/README.md`, `handlers/errores.ts`, `handlers/salud.ts`, `middleware/README.md`, `workers/README.md`
- `backend/test/setup.ts`, `backend/test/salud.integracion.test.ts`, `backend/test/salud-sin-base.integracion.test.ts`

Modificados: `.gitignore` (+2 líneas: `*.tsbuildinfo`, `.eslintcache`; ya terminaba en salto de línea), `README.md` (+103 líneas, solo la sección nueva al final; `git diff` sin líneas eliminadas). Borrados con `rm`: `backend/.gitkeep`, `shared/.gitkeep`, `frontend/.gitkeep`. No versionados: `backend/.env` (copia de `.env.example`), `backend/tmp/*.log`. `docs/trabajo/BACK-01-esqueleto-backend/resumen-programador.md` (este archivo).

No creados por el camino de retorno: `backend/prisma.config.ts`, `backend/src/adapters/db/generated/`, línea `generated/` en `.gitignore`, `.prettierignore` y `eslint.config.mjs`.

## Desviaciones del plan

1. **`--env-file-if-missing` no existe en Node.** `node dist/server.js` falló con `node.exe: bad option: --env-file-if-missing=.env` (Node v24.11.1). `node --help` lista `--env-file=...` y `--env-file-if-exists=...`. La bandera con la semántica exacta de DEC-03 ("sin error si el archivo no existe") es **`--env-file-if-exists`**: probada, carga `.env` si existe y con un archivo inexistente imprime `no-existe.env not found. Continuing without it.` y sigue (código 0), mientras `--env-file` con inexistente termina con código 9. Cambié las cuatro apariciones en `backend/package.json` (`dev`, `dev:worker`, `start`, `start:worker`). DEC-04 (alternativa `--env-file=.env` para tsx) **no hizo falta**: `tsx` 4.23.15 reenvía `--env-file-if-exists` (probado con un script sin Prisma: `DATABASE_URL via tsx: CARGADA`).
2. **ESLint: `basePath: import.meta.dirname`** en los objetos de configuración con `files`/`ignores`. Con `--config ../eslint.config.mjs` desde `backend/`, ESLint 9.39.5 resolvió los patrones respecto al **cwd**, no al archivo de configuración (contrario a la suposición de DEC-08): `backend/scripts/**` y `backend/src/adapters/**` no coincidían, `no-console` disparó en `scripts/pendiente.mjs` y `config/env.ts`, y `no-restricted-imports` disparó dentro de `adapters/db/cliente.ts`. Con `basePath` anclado a la raíz, los patrones del plan quedan tal cual y V-15 comprueba que la regla funciona en ambos sentidos.
3. **Prettier: `--ignore-path ../.prettierignore`** en los scripts `lint` y `format` de `shared/` y `backend/`. Prettier solo lee `.prettierignore` del cwd, así que `prettier --check .` en `shared/` revisaba `dist/` ("Code style issues found in 6 files": `dist/*.js`, `dist/*.d.ts`). Es el mismo remedio que DEC-08 ya aplica a ESLint. El contenido de `.prettierignore` es el del plan (variante original).
4. **`server.ts` importa `./app.js` de forma diferida, después de `cargarEnv()`.** Comprobado empíricamente: importar `@prisma/client` 6.19.3 carga `backend/.env` en `process.env` (`antes de importar: ausente` → `tras importar @prisma/client: CARGADA`, desde cualquier cwd). Con una importación estática (izada), `cargarEnv()` habría visto `DATABASE_URL` aunque el entorno no la trajera y V-12 no habría podido fallar. La importación diferida preserva el orden que el plan documenta (validar, luego construir). En prod no cambia nada.
5. **Reordenamiento de pasos:** la copia de `backend/.env` (paso 9) y `test/setup.ts` (paso 11) se crearon antes de ejecutar `npx vitest run src/` del paso 7, porque `vitest.config.ts` exige `setupFiles: ["./test/setup.ts"]` y este exige `backend/.env`. Contenido idéntico al plan.

Detalles de implementación que no considero desviaciones pero anoto: `verificarConexion(log?)` tipa el logger de forma estructural (`{ warn(datos, mensaje) }`) para no importar `pino` en la firma; en el `warn` registra solo `nombre` y `codigo` del error (P1000/P1001…), nunca el mensaje completo del proveedor ni la URL; `errorApiSchema`/`saludRespuestaSchema` se usan en las pruebas de integración tal como pide el plan; `adapters/db/index.ts` no reexporta `prisma`; el comentario de `DATABASE_URL` en `.env.example` dice "El CLI de Prisma lee este archivo por su cuenta" (variante Prisma 6 de la nota de la Enmienda); el README no menciona `prisma.config.ts` ni `generated/` y su problema frecuente de Prisma es la variante 6 (`@prisma/client did not initialize yet` → `npx prisma generate`).

## Verificaciones V-01 a V-20

- **V-01 ok.** `node --version` → `v24.11.1`; `npm --version` → `11.6.2`; `node -p process.release.lts` → `Krypton`.
- **V-02 (a) falla → Prisma 6; (b) ok.** Salidas en "Decisión Prisma 7/6" y "Tabla de versiones".
- **V-03 ok.** `npm install` (raíz): `added 247 packages, and audited 251 packages in 1m`, código 0. `package-lock.json` creado (149 315 bytes). `cmd /c dir node_modules\@campus`: `backend`, `frontend`, `shared` como `<JUNCTION>` hacia los workspaces. `npm ls`: versiones de la tabla; `pino@10.3.1` y `zod@4.6.5` deduplicados. `node_modules/@prisma/engines/query_engine-windows.dll.node` y `schema-engine-windows.exe` descargados. Avisos: `npm warn deprecated eslint@9.39.5: This version is no longer supported`; `3 high severity vulnerabilities` (ver pendientes; no ejecuté `npm audit fix`).
- **V-04 ok (tras las desviaciones 2 y 3).** Primer intento: falló en `shared` (Prettier sobre `dist/`) y `backend` (5 errores de ESLint por la resolución de patrones). Final: `npm run lint` código 0 en `shared` y `backend` ("All matched files use Prettier code style!", ESLint sin errores, `tsc --noEmit` limpio).
- **V-05 ok.** `npm run build` código 0; existen `shared/dist/index.js`, `shared/dist/index.d.ts`, `backend/dist/server.js`, `backend/dist/worker.js` (y `app.js`).
- **V-06 ok.** `npx prisma validate` → `The schema at prisma\schema.prisma is valid`; `npx prisma format --check` → `All files are formatted correctly!` (ambos código 0; ambos con `Environment variables loaded from .env`, sin banderas).
- **V-07 ok.** `npx prisma migrate dev --create-only --name extensiones_iniciales` → código 0, sin pedir `reset`; creó `prisma/migrations/20260922015711_extensiones_iniciales/migration.sql` y `migration_lock.toml` (`provider = "postgresql"`, LF). SQL editado exactamente como el plan (verificado con `cat -A`). `npx prisma migrate dev` → `Applying migration 20260922015711_extensiones_iniciales` … `Your database is now in sync with your schema.` … `✔ Generated Prisma Client (v6.19.3)`, código 0. `ls prisma/migrations` → una carpeta + `migration_lock.toml`. Prisma 6 no imprime nada sobre la base sombra; evidencia indirecta en V-08.
- **V-08 ok.** `npx prisma migrate status` → `1 migration found in prisma/migrations` / `Database schema is up to date!`. `psql`: `_prisma_migrations` → `20260922015711_extensiones_iniciales | aplicada = t` (1 fila); `pg_extension` → `pg_trgm`, `plpgsql`, `unaccent`; `pg_database LIKE 'prisma_migrate_shadow%'` → 0 filas (la sombra se creó y se borró).
- **V-09 ok.** `npx prisma generate` → `✔ Generated Prisma Client (v6.19.3) to .\..\node_modules\@prisma\client in 41ms`; `npm run typecheck` código 0. (Variante original: no hay carpeta `generated/`.)
- **V-10 ok.** `npm test` (raíz): `pretest` (build de shared + generate) y `vitest run` → `Test Files 5 passed (5)`, `Tests 21 passed (21)`. Desglose: `core/errores.test.ts` 6, `core/salud.test.ts` 3, `config/env.test.ts` 7, `test/salud.integracion.test.ts` 4, `test/salud-sin-base.integracion.test.ts` 1. Repetido desde `backend/` en V-20 con el mismo resultado.
- **V-11 ok (con `--env-file-if-exists`).** Con el flag del plan el proceso murió (`bad option`); con el correcto: `GET /api/salud` → `HTTP/1.1 200 OK`, `content-type: application/json; charset=utf-8`, `{"estado":"ok","baseDeDatos":"ok","marcaDeTiempo":"2026-09-22T02:05:10.095Z"}`; `GET /api/no-existe` → `HTTP/1.1 404 Not Found`, `{"error":{"codigo":"NO_ENCONTRADO","mensaje":"La ruta no existe."}}`; petición con `Authorization: Bearer secreto` y `Cookie: a=b` → 200. `taskkill //PID 16316 //T //F` → terminado; 3000 libre después. Línea del log: `{"level":30,"time":1790042710062,"pid":16316,"hostname":"DESKTOP-V1UGQQH","requestId":"req-1","req":{"method":"GET","url":"/api/salud","host":"127.0.0.1:3000","remoteAddress":"127.0.0.1","remotePort":56129},"msg":"incoming request"}`. `grep -c "secreto\|a=b" tmp/api.log` → 0. **Matiz:** los encabezados no aparecen ni en claro ni como `[oculto]`, porque el serializador de peticiones por defecto de Fastify no incluye `headers`; el `redact` del plan queda como defensa por si algún log futuro serializa `req.headers`. También aparece en `stderr` la deprecación `FSTDEP024` (ver pendientes).
- **V-12 ok.** `env -u DATABASE_URL node dist/server.js` → `Configuración inválida. Revisa backend/.env (si no existe, copia backend/.env.example):` / `  - DATABASE_URL: obligatoria`, código 1. Variante con `PORT=abc`: añade `  - PORT: debe ser un entero entre 1 y 65535`; ningún valor impreso.
- **V-13 ok.** `Start-Process npm.cmd run dev` (PowerShell): `tmp/dev.log` con `"msg":"Server listening at http://127.0.0.1:3000"` y las dos peticiones del README; `taskkill /PID <pid> /T /F` terminó el árbol (7 procesos); `Get-NetTCPConnection -LocalPort 3000 -State Listen` vacío. `dev:worker`: `{"level":30,...,"evento":"worker_listo","msg":"Worker listo, sin trabajos registrados"}`; árbol terminado. Los únicos procesos `node` vivos al final son cuatro anteriores a este trabajo (iniciados a las 12:39 y 19:14; mi primer `node` fue después de las 19:40): no son míos y no los toqué.
- **V-14 ok.** `npm run seed:admin` y `npm run reset:admin` → `Pendiente: "seed:admin" se implementa en el encargo de autenticación (todavía no existe la tabla usuarios).` (y `reset:admin`) en stderr; código 1 en ambos (también invocando `node scripts/pendiente.mjs` directamente).
- **V-15 ok.** `grep -rn "@prisma/client\|@prisma/adapter-pg\|from \"pg\"\|adapters/db/generated" backend/src shared/src` → solo `backend/src/adapters/db/cliente.ts` (importación y comentario) y `backend/src/adapters/README.md` (texto). Archivo temporal `backend/src/core/prueba-capa.ts`: con `import "@prisma/client"` ESLint falla con `no-restricted-imports` (código 1); variantes adicionales `import "../adapters/db/index.js"` e `import "fastify"` también fallan con el patrón de `core/`; tras borrarlo ESLint vuelve a código 0. Las variantes de la Enmienda 1 (`@prisma/adapter-pg`, `pg`, `generated/`) no aplican.
- **V-16 ok.** `git status --short --untracked-files=all`: ` M .gitignore`, ` M README.md`, ` D` en los tres `.gitkeep`, y `??` en los 44 archivos nuevos (más `plan.md`, `aprobacion.md` y este resumen); sin `node_modules`, `dist`, `.env`, `tmp/`. `git check-ignore -v`: `backend/.env` (`.gitignore:4:.env`), `node_modules`, `shared/dist`, `backend/dist`, `backend/tmp/api.log` ignorados. `backend/.env.example` **no** ignorado (coincide con la negación `!.env.example`, y `git status` lo lista como `??`); `schema.prisma`, `migration_lock.toml`, `package-lock.json` no ignorados. `prisma.config.ts` no existe (variante original).
- **V-17 ok.** `git ls-files --eol --others --exclude-standard` → 46 archivos, todos `w/lf` (incluido `package-lock.json`); `README.md` y `.gitignore` → `i/lf w/lf attr/text=auto eol=lf`.
- **V-18 ok.** `backend/.env.example`: 5 variables (`NODE_ENV`, `HOST`, `PORT`, `LOG_LEVEL`, `DATABASE_URL`), los cuatro comentarios obligatorios, `DATABASE_URL` idéntica a la de `infra/.env.example` (`diff` de la línea → `IDENTICAS`), sin valores reales.
- **V-19 ok.** `ls frontend` → solo `package.json`, con el contenido literal del plan.
- **V-20 parcial (declarado).** Ejecutados tal cual en `powershell.exe -NoProfile`: `node --version` → `v24.11.1`; `npm --version` → `11.6.2`; `npm install` (raíz) → código 0, sin cambios; `Set-Location backend; if (-not (Test-Path .env)) { Copy-Item .env.example .env }` → `.env existe: True`; `npx prisma generate` → `✔ Generated Prisma Client (v6.19.3)`, código 0; `npm run dev` + `curl.exe http://127.0.0.1:3000/api/salud` → `{"estado":"ok",...}` y `curl.exe -i http://127.0.0.1:3000/api/no-existe` → `HTTP/1.1 404 Not Found` + `NO_ENCONTRADO` (en V-13); `npm test` → `5 passed`, `21 passed`, código 0; `npm run dev:worker` (en V-13); `Get-NetTCPConnection -LocalPort 3000 -State Listen` → vacío. **No ejecutados:** `npx prisma migrate dev` del paso 4 del README (sería una segunda aplicación, no autorizada; en su lugar `npx prisma migrate status` → `Database schema is up to date!`), `taskkill /PID <pid> /T /F` del paso 8 como comando del README (se usó el equivalente en V-11/V-13), y Ctrl+C (interactivo).

## No verificado

- La redacción de `authorization`/`cookie` como `[oculto]` no es observable con la configuración del plan (Fastify no serializa encabezados por defecto). Lo verificable, y verificado, es que los valores nunca aparecen en el log.
- Los puntos [verificar] de Prisma 7 (API de `prisma.config.ts`, opciones del generador `prisma-client`, ruta del cliente generado, firma de `PrismaPg`, R-06 sobre motores).
- La creación de la base sombra no aparece en la salida del CLI 6; la evidencia es indirecta (sin deriva, sin `reset`, fila en `_prisma_migrations`, `status` en verde, ninguna base `prisma_migrate_shadow*` residual).
- `npm run format` y `npm run format:check` de la raíz no se volvieron a ejecutar tras el incidente (alcanzan documentos protegidos).
- Comportamiento en `prod` sin archivo `.env`: solo probado localmente con un nombre de archivo inexistente (`--env-file-if-exists=no-existe.env`).

## Pendiente o fuera de alcance detectado (no aplicado)

1. **Fastify 5.12.5 deprecación `FSTDEP024`:** `requestIdLogLabel option is deprecated. Use the logController option with requestIdLogLabel instead. The requestIdLogLabel top-level option will be removed in fastify@6`. Conservé la opción literal del plan; conviene migrarla en un encargo posterior.
2. **`npm audit`: 3 vulnerabilidades altas**, todas transitivas de `prisma@6.19.3` → `@prisma/config` → `deepmerge-ts <8.0.0` (GHSA-ggr8-5vv4-36mx). La corrección propuesta por npm degradaría `prisma` a 6.12.0. No ejecuté `npm audit fix`.
3. **ESLint 9 fuera de soporte según npm** ("eslint@9.39.5: This version is no longer supported"); ESLint 10.11.0 es `latest` y `typescript-eslint` 8.70.1 ya lo admite. Decisión del Arquitecto.
4. **TypeScript 7.0.2 es `latest`**, pero `typescript-eslint` exige `<6.1.0`; con `^5` no hay conflicto. **Vitest 5.0.1** es `latest`; quedó `^4`. **globals 17**, **fastify-plugin 6**, **@types/node 26** también superan el rango del plan; no salté.
5. **Scripts `format`/`format:check` de la raíz** alcanzan `docs/`, `.claude/` e `infra/` (ver incidente). Propuesta: excluirlos en `.prettierignore` o acotar los scripts.
6. **Prisma 6 carga `backend/.env` al importar el cliente** (motivo de la desviación 4). Con Prisma 7 desaparece. Vale la pena tenerlo presente si se re-enmienda.
7. La comprobación 1 de la Enmienda 1 (`npm view prisma dist-tags.latest` = `7.x`) es frágil frente a etiquetas `latest` que apunten a *release candidates*; si el humano sigue queriendo Prisma 7, conviene reformularla.
8. `ARCHITECTURE.md` §6 y el Dockerfile futuro: con Prisma 6 no hace falta empaquetar `prisma.config.ts`; la nota de la Enmienda sobre la imagen de Docker no aplica hasta que se adopte Prisma 7.

## Propuesta literal para `AGENTS.md` (sin aplicar; la aplica el orquestador con autorización del humano)

1. Bloque "Backend (desde /backend)": la línea `npm run test             # Vitest (integración con Testcontainers)` pasa a `npm run test             # Vitest (unitarias de core e integración contra el PostgreSQL de infra)` (P-04).
2. Antes del bloque de frontend, bloque nuevo:
   ```bash
   # Raíz del repositorio (una sola vez tras clonar, y cuando cambie un package.json)
   npm install              # instala los tres workspaces: shared, backend, frontend
   npm run lint / test / build   # en todos los workspaces
   ```
3. Bloque "Backend": antes de `npm run dev`, la línea `cp .env.example .env     # solo la primera vez: crea tu configuración local`.

## Estado final del entorno

Ningún proceso de Node de este trabajo sigue vivo (3000 no escucha; solo quedan los cuatro procesos `node` previos a la sesión). Infra sigue levantado como estaba (`postgres`, `minio`, `livekit` healthy). `backend/.env` se conserva y no se versiona. Sin `git add`, `git commit` ni `git push`. Scratchpad limpio.

## Ronda 2 — ajustes por carril trivial

Fecha: 2026-09-21 (hora local). Carril trivial autorizado por el humano: solo programador, sin tester ni manager, sin commit. Autorización escrita: `aprobacion.md`, "Decisiones del humano tras la revisión final — 2026-09-22", puntos 2 (M-01) y 3 (M-03). Hallazgos en `revision.md`.

```
Plan: docs/trabajo/BACK-01-esqueleto-backend/aprobacion.md (decisiones 2 y 3) + revision.md (M-01, M-03)
Pasos completados: 2 de 2 (M-01 aplicado; M-03 intentado y revertido conforme a la decisión del humano)
Archivos creados / modificados: .prettierignore (+4 líneas); package.json y package-lock.json de la raíz quedaron byte a byte como estaban; este resumen (sección nueva)
Verificación: lint ok (código 0 en shared y backend) · test 21 pasan, 0 fallan (5 archivos) · build ok · prisma validate n/a (no se tocó el esquema)
Hallazgos atendidos: M-01 corregido · M-03 no corregido (lint falla con ESLint 10; revertido, queda para después por decisión del humano)
Desviaciones del plan: ninguna
Pendiente o fuera de alcance detectado: ver "Anotaciones" abajo
```

### M-01 — `.prettierignore` de la raíz (corregido)

Se anexaron al final, con `printf ... >>` (sin `sed -i`), las líneas `docs/`, `.claude/`, `infra/` y `/*.md`, en ese orden. El archivo queda con 9 líneas, LF y salto de línea final (`cat -A` y `od -c` comprobados; `git ls-files --eol` → `w/lf`).

Verificación, solo con `--check` y `--file-info`, nunca `--write`:

- Línea base antes del cambio: `npx prettier --check .` desde la raíz → `Code style issues found in 19 files` (los 18 del Manager más `docs/trabajo/BACK-01-esqueleto-backend/revision.md`), código 1.
- Después: `npx prettier --check .` desde la raíz → `All matched files use Prettier code style!`, código 0. `npx prettier --check backend/src` desde la raíz → igual, código 0.
- READMEs de capa **siguen revisados**. `npx prettier --file-info` desde la raíz para `backend/src/{core,adapters,handlers,middleware,workers}/README.md` → `{"ignored":false,"inferredParser":"markdown"}` los cinco. Lo mismo desde `backend/` con `--ignore-path ../.prettierignore` (la forma exacta del script `lint`): los cinco `ignored:false`. El patrón `/*.md` está anclado a la raíz del archivo de ignore y no alcanza subcarpetas; no hubo que cambiar el texto decidido por el humano.
- Protegidos **ignorados**: `AGENTS.md`, `CLAUDE.md`, `README.md`, `docs/PRD.md`, `docs/ARCHITECTURE-ESSENTIALS.md`, `docs/trabajo/BACK-01-esqueleto-backend/plan.md`, `.claude/agents/programador.md`, `infra/docker-compose.yml`, `infra/livekit/livekit.dev.yaml` → `{"ignored":true,"inferredParser":null}`. Desde `backend/` y `shared/` con `--ignore-path ../.prettierignore`, `../AGENTS.md`, `../README.md`, `../docs/PRD.md` y `../CLAUDE.md` también `ignored:true`: Prettier 3.9.8 resuelve los patrones respecto a la carpeta del archivo de ignore, no respecto al cwd.
- No ignorados que deben seguir revisándose: `eslint.config.mjs` (babel), `backend/src/app.ts` y `shared/src/index.ts` (typescript), `backend/package.json` y `shared/package.json` (json-stringify).
- `npm run lint` desde la raíz con el nuevo `.prettierignore` (todavía con ESLint 9): `shared` y `backend` en verde, `All matched files use Prettier code style!` en ambos, `tsc --noEmit` limpio, código 0.

### M-03 — ESLint `^10` (intentado y revertido)

**Resultado: revertido.** `npm run lint` no queda en verde con ESLint 10 por una regla nueva de `eslint:recommended`; por decisión del humano ("si `lint` no queda en verde con ese cambio, se revierte y queda para después") no toqué ni la configuración ni el código señalado. `package.json` y `package-lock.json` de la raíz son idénticos a los previos (`cmp` contra el respaldo, antes y después del `npm install` de retorno).

Comprobaciones previas (`npm view`, 2026-09-21):

```
npm view eslint version                                 -> 10.11.0
npm view @eslint/js version                             -> 10.0.1
npm view eslint dist-tags                               -> latest 10.11.0, maintenance 9.39.5, next 10.0.0-rc.2
npm view @eslint/js dist-tags                           -> latest 10.0.1, maintenance 9.39.5
npm view typescript-eslint@8.70.1 peerDependencies      -> eslint ^8.57.0 || ^9.0.0 || ^10.0.0 ; typescript >=4.8.4 <6.1.0
npm view eslint-config-prettier@10.1.8 peerDependencies -> eslint >=7.0.0
npm view @eslint/js@10.0.1 peerDependencies             -> eslint ^10.0.0
npm view eslint@10.11.0 engines                         -> node ^20.19.0 || ^22.13.0 || >=24   (@eslint/js@10.0.1 igual)
```

Los pares eran compatibles y TypeScript se quedó en `^5.9.3`. Cambio aplicado en `package.json`: `"@eslint/js": "^9.39.5"` → `"^10.0.1"` y `"eslint": "^9.39.5"` → `"^10.11.0"` (dos líneas, `diff` contra el respaldo lo confirmó; LF y salto final intactos). Respaldo previo de ambos archivos en el scratchpad de la sesión.

`npm install` (raíz): código 0, `added 10 packages, removed 22 packages, changed 16 packages, and audited 239 packages in 5s`; **sin** `ERESOLVE` ni `UNMET PEER` (0 coincidencias en la salida); desapareció el aviso `eslint@9.39.5: This version is no longer supported`; siguen las `3 high severity vulnerabilities` de M-04 (Prisma; no ejecuté `npm audit`). `npx eslint --version` → `v10.11.0`. `npm ls eslint` → una sola `eslint@10.11.0` (1 real + 8 `deduped`), `@eslint/js@10.0.1`, sin `invalid` ni `UNMET PEER`; las 71 líneas `UNMET OPTIONAL DEPENDENCY` son binarios opcionales por plataforma (`@esbuild/*`, etc.) y son exactamente las mismas 71 con ESLint 9. Diferencia del lock respecto al respaldo: 301 → 289 paquetes; quitados 22 (`@eslint/eslintrc`, `chalk`, `js-yaml`, `import-fresh`, `lodash.merge`, `strip-json-comments`, ...), agregados 10 (`cacheable`, `@cacheable/*`, `@keyv/*`, `hookified`, `qified`, `hashery`, `@types/esrecurse`), cambiados 17 (`eslint`, `@eslint/js`, `@eslint/core` 0.17→1.2.1, `@eslint/config-array`, `@eslint/config-helpers`, `@eslint/plugin-kit`, `@eslint/object-schema`, `espree` 10→11, `eslint-scope` 8→9, `eslint-visitor-keys` 4→5, `file-entry-cache` 8→11, `flat-cache` 4→6, `keyv` 4→5, `minimatch` 3→10, `brace-expansion`, `balanced-match`).

`npm run lint` (raíz) con ESLint 10: `shared` en verde; `backend` **falla** en el paso de ESLint (Prettier y `typecheck` no llegaron a ejecutarse). Salida literal:

```
> @campus/backend@0.0.0 lint
> eslint --config ../eslint.config.mjs . && prettier --check . --ignore-path ../.prettierignore && npm run typecheck


C:\Users\Carlos\Documents\Proyecto_PlataformaEducativa\backend\test\setup.ts
  6:5  error  There is no `cause` attached to the symptom error being thrown  preserve-caught-error

✖ 1 problem (1 error, 0 warnings)

npm error Lifecycle script `lint` failed with error:
npm error code 1
npm error path C:\Users\Carlos\Documents\Proyecto_PlataformaEducativa\backend
npm error workspace @campus/backend@0.0.0
```

Diagnóstico (solo lectura, sin cambios): `preserve-caught-error` entra en `js.configs.recommended` con ESLint 10 y marca `backend/test/setup.ts:6`, donde dentro de `catch (error)` se lanza `new Error("Falta backend/.env: ...")` sin `{ cause: error }`. ESLint 10 no emitió ningún aviso de deprecación sobre `eslint.config.mjs` ni sobre reglas (0 coincidencias de `deprecat`/`warn` fuera de la línea `0 warnings`). No hubo conflicto de pares: el único obstáculo es ese error de lint.

Retorno: copié de vuelta `package.json` y `package-lock.json` desde el respaldo (`cmp` → idénticos); `npm install` (raíz) → código 0, `added 22 packages, removed 10 packages, changed 16 packages, and audited 251 packages in 3s`, con el aviso `eslint@9.39.5: This version is no longer supported` de vuelta; el lock siguió idéntico al respaldo tras el install; `npm ls eslint @eslint/js` → `eslint@9.39.5` única y `@eslint/js@9.39.5`; `npx eslint --version` → `v9.39.5`; `npm run lint` → código 0 en `shared` y `backend`. Respaldos y logs del intento borrados del scratchpad.

### Verificación final (ejecutada desde la raíz, estado revertido)

- `npm run lint` → código 0: `shared` (ESLint + Prettier) y `backend` (ESLint + Prettier + `tsc --noEmit`) en verde.
- `docker compose ps` en `infra/` → `postgres`, `minio`, `livekit` `Up (healthy)`. `npm test` → `Test Files 5 passed (5)`, `Tests 21 passed (21)`, código 0. Sigue imprimiéndose `FSTDEP024` (M-02, BACK-02).
- `npm run build` → código 0; existen `shared/dist/index.js`, `backend/dist/server.js`, `backend/dist/worker.js`.
- `git status --short` → rastreados: ` M .claude/agents/programador.md`, ` M .gitignore`, ` M AGENTS.md`, ` M README.md`, ` D backend/.gitkeep`, ` D frontend/.gitkeep`, ` D shared/.gitkeep`; los archivos de raíz siguen `??`. `git diff --stat` → los mismos 7 archivos (`113 insertions(+), 1 deletion(-)`), nada nuevo. `git diff --quiet` sobre `.claude/agents/{arquitecto,manager,tester}.md`, `CLAUDE.md`, `docs/ARCHITECTURE*.md`, `docs/PRD.md`, `infra/`, `docs/trabajo/INFRA-01-entorno-dev/` → sin diff.
- `git ls-files --eol --others --exclude-standard .prettierignore package.json package-lock.json` → `w/lf` los tres.
- `Get-NetTCPConnection -LocalPort 3000 -State Listen` → vacío. Los cuatro procesos `node` vivos (inicio 12:39 y 19:14) son anteriores a esta ronda; no se arrancó API ni worker.
- No ejecuté ningún `--write`, `--fix`, `-i`, `npm audit fix`, `npm update`, `--legacy-peer-deps`, `--force`, `git add/rm/restore/commit/push`, `prisma migrate *` ni `docker compose down`. No leí ni imprimí `.env`.

### No verificado

- `npm run format` y `npm run format:check` de la raíz no se ejecutaron (`format` es `--write`, prohibido desde la raíz). Lo equivalente y verificado es `npx prettier --check .`, que es exactamente lo que ejecuta `format:check`.
- La cobertura de `.prettierignore` se comprobó por muestra representativa con `--file-info` (5 READMEs de capa, 9 protegidos, 5 no protegidos) y por el `--check` global, no archivo por archivo.

### Anotaciones (sin aplicar, fuera del alcance de esta ronda)

1. **M-03 queda para después.** Para retomarlo hace falta, además de las dos líneas de `package.json`, atender `preserve-caught-error`: en `backend/test/setup.ts:6` pasar `{ cause: error }` al `new Error(...)` (una línea) o decidir la regla en `eslint.config.mjs`. Nada más falló; los pares de `typescript-eslint` 8.70.1, `eslint-config-prettier` 10.1.8 y `@eslint/js` 10.0.1 son compatibles y `npm install` fue limpio.
2. El `.prettierignore` ampliado también deja de revisar `infra/livekit/livekit.dev.yaml` e `infra/docker-compose.yml` (estaban en la decisión del humano: `infra/` completo).
