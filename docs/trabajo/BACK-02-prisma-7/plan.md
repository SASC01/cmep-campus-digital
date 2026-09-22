# Plan — BACK-02: migrar el backend a Prisma 7.10.0 y cerrar los pendientes de BACK-01
Estado: LISTO
Carril: sensible (lo fijó el humano)
Requisitos: ninguno del PRD (andamiaje, sin `RF-xx`). Reglas aplicables: `AGENTS.md` reglas 1 (capas), 9 (secretos), 10 (esquema solo por migraciones), 11 (proveedores), 13 (nada sensible en logs) y "Reglas del equipo" (formateadores solo por paquete); `ARCHITECTURE-ESSENTIALS.md` secciones Stack, Capas del backend, Reglas de datos ("Prisma solo en `adapters/db`") y Operación; `CLAUDE.md` "Manejo de errores en el backend" y "Estilo de código".
Antecedentes: `docs/trabajo/BACK-01-esqueleto-backend/` — `plan.md` (Enmienda 1, DEC-01a), `aprobacion.md` ("Pendientes para BACK-02"), `resumen-programador.md` (D1–D5, intento de ESLint 10), `revision.md` (M-02, M-03, M-04).

## Flujo autorizado para este encargo
El humano autorizó el mismo flujo abreviado de BACK-01:
1. `arquitecto` entrega este `plan.md`.
2. **El humano aprueba el plan de forma explícita y por escrito** (carril sensible).
3. `programador` implementa exactamente este plan y entrega `docs/trabajo/BACK-02-prisma-7/resumen-programador.md`.
4. `manager` (modo final) revisa y emite `revision.md`; ejecuta por su cuenta `lint`, `test` y `build`.
5. **El humano revisa el diff** y decide el commit. Ningún agente hace `git add`, `commit` ni `push`.

Sin `tester` (no hay comportamiento de negocio que atacar) y sin revisión del Manager en modo plan (la sustituye la aprobación escrita). La excepción no modifica `AGENTS.md` ni aplica a otros encargos.

**Por qué carril sensible:** cambia la librería de acceso a datos y su inicialización (`adapters/db`), instala dependencias, toca la configuración del CLI que aplica migraciones (`prisma.config.ts`) y la única migración existente debe quedar intacta y aplicada. Nada de eso cabe en "normal".

### Qué autoriza la aprobación de este plan (y nada más)
- **Crear** `backend/prisma.config.ts`, `backend/test/db-cliente.test.ts` (P-03) y `docs/trabajo/BACK-02-prisma-7/resumen-programador.md`. **Modificar** solo los archivos de la tabla "Archivos". **No borrar** ningún archivo del repositorio. Sí borrar los archivos temporales propios que este plan indica (`backend/src/core/prueba-capa.ts`, `backend/src/handlers/prueba-capa.ts`, `backend/tmp/prisma.config.sin-env.ts`, logs en `backend/tmp/`).
- **Instalar** solo las dependencias de la tabla "Dependencias" (rangos `^` con la versión exacta indicada), con un único `npm install` desde la raíz (repetible si cambia un `package.json` durante el encargo). `package-lock.json` se versiona. Prohibido: `--legacy-peer-deps`, `--force`, `npm audit fix`, `npm update`, `npm dedupe`, `npm install -g`, paquetes fuera de la tabla.
- **Ejecutar**: los scripts `npm run <script>` del repositorio; `npm view`, `npm ls`, `npm explain`, `npm audit` (solo lectura, nunca `fix`); `npx prisma -v`, `npx prisma --help`, `npx prisma <comando> --help`, `npx prisma validate`, `npx prisma format --check`, `npx prisma generate` (incluida la variante `--config` de V-20), `npx prisma migrate status`; `npx tsc`, `npx vitest`, `npx eslint`, `npx prettier --check`; Prettier con `--write` **solo** acotado: desde `backend/` sobre rutas concretas (`prisma.config.ts`, `src`, `test`) y desde la raíz solo por ruta explícita (`npx prettier --write eslint.config.mjs`); arrancar y detener procesos locales de Node (`taskkill`, `Stop-Process`); `curl.exe` contra `127.0.0.1`; en `infra/`: `docker compose ps`, `docker compose up -d`, `docker compose exec -T postgres psql ... -c "SELECT ..."` (solo lectura); git de solo lectura (`status`, `diff`, `check-ignore`, `ls-files`, `log`); diagnóstico de solo lectura (`Get-NetTCPConnection`, `Get-Process`, `node --version`, `npm --version`, `od`, `wc`, `grep`, `head`, `tail`, `cat`, `ls`).
- Si el puerto 3000 está ocupado, cambiar `PORT` **solo en `backend/.env`** (no versionado) y reportarlo.
- Si hiciera falta ver la plantilla real de `prisma init` de 7.10.0, ejecutarlo **solo en el scratchpad de la sesión, fuera del repositorio, con el binario ya instalado en el repositorio** (`node <ruta-del-repo>/node_modules/prisma/build/index.js init --datasource-provider postgresql`), y borrar lo creado después. Nunca `npx prisma init` en el scratchpad (descargaría la 8.0.0-rc por `latest`) ni dentro del repositorio.
- **No autoriza:** `prisma migrate dev`, `prisma migrate reset`, `prisma migrate deploy`, `prisma migrate resolve`, `prisma migrate diff`, `prisma db push`, `prisma db pull`, `prisma db execute`, `prisma format` sin `--check`, `prisma studio`, `prisma dev`, crear o editar cualquier cosa en `backend/prisma/migrations/**`; editar `tsconfig.base.json`, `backend/tsconfig.json`, `backend/vitest.config.ts`, `shared/**`, `frontend/**`, `infra/*`, `AGENTS.md`, `CLAUDE.md`, `.claude/`, `docs/ARCHITECTURE*.md`, `docs/PRD.md`, `.gitattributes`; `git add`, `commit`, `push`, `restore`, `stash`; `docker compose down`; `npm run format` o `prettier --write .` desde la raíz; renombrar, leer o imprimir `backend/.env` o `infra/.env`.

## Preguntas bloqueantes
Ninguna. Todas las decisiones tienen un valor por defecto razonable y reversible, y el humano ya fijó el alcance.

## Preguntas no bloqueantes (con valor por defecto)
| # | Pregunta | Valor por defecto | Si el humano elige lo contrario |
|---|---|---|---|
| P-01 | `@prisma/adapter-pg@7.10.0` ya trae `pg ^8.16.3` como dependencia normal. ¿Se declara `pg` también como dependencia directa del backend? | **Sí, `pg ^8.23.0`** (lo pidió el humano en el alcance). Motivo: la versión del driver la fijamos nosotros y no el adaptador; un parche de seguridad de `pg` se toma sin esperar a Prisma; pg-boss también usa `pg` y así queda una sola copia. `npm ls pg` debe mostrar **una** versión (`^8.16.3` del adaptador se satisface con 8.23.0) | Quitar `pg` de `backend/package.json`; el resto del plan no cambia |
| P-02 | Con el generador `prisma-client`, `npm run typecheck` (parte de `lint`) necesita que exista `src/adapters/db/generated/`, que solo crea `prisma generate`. Hoy `lint` no tiene hook `pre*`. ¿Se agrega `prelint` como ya tienen `dev`, `build` y `test`? | **Sí:** `"prelint": "npm run shared:build && prisma generate"`. Es la misma línea que los otros tres hooks; `lint` deja de depender de haber corrido antes `build` o `test` (hoy ya dependía de `shared/dist`). Ningún comando de `AGENTS.md` cambia de nombre | No agregarlo y documentar en el README que `lint` requiere un `build` o `test` previo |
| P-03 | ¿Se agrega una prueba pequeña de `adapters/db/cliente.ts` (3 casos: `obtenerDb()` sin inicializar lanza `AppError` 500; `inicializarDb` es idempotente; `cerrarConexion` deja el módulo sin inicializar)? No necesita PostgreSQL | **Sí**, `backend/test/db-cliente.test.ts`. La suite pasa de 5 archivos / 21 pruebas a **6 / 24**. Cubre el único camino nuevo de fallo | No crearla; los conteos esperados vuelven a 5 / 21 en V-10 y en el resumen |
| P-04 | Los rangos `^7.10.0` instalarían automáticamente una 7.x estable **posterior** si ya existiera al ejecutar. ¿Qué hace el programador si V-02 muestra una 7.x estable mayor que 7.10.0? | **Se detiene antes de `npm install` y reporta** (el humano fijó 7.10.0 con datos de 2026-09-22; una versión nueva no está verificada). El humano decide: adoptar la nueva 7.x (mismo plan) o fijar `7.10.0` exacta sin `^` | Autorizar de antemano la última 7.x estable siempre que `prisma`, `@prisma/client` y `@prisma/adapter-pg` coincidan |

## Contradicciones entre documentos (reportadas, no bloquean)
- **C-01.** `AGENTS.md` regla 1, `ARCHITECTURE-ESSENTIALS.md` ("Capas del backend") y `backend/src/adapters/README.md` nombran `@prisma/client` como *la* librería de Prisma. Con el generador `prisma-client` el código propio ya no importa `@prisma/client` directamente: importa `@prisma/adapter-pg` y el cliente generado en `adapters/db/generated/` (que a su vez importa `@prisma/client/runtime/client`). El espíritu de la regla ("Prisma solo en `adapters/db`") no cambia; la lista literal sí queda corta. Este plan actualiza ESLint y el README de `adapters/`; la línea de `AGENTS.md`/ESSENTIALS queda propuesta al orquestador (sección "Propuesta para AGENTS.md") y anotada para DOCS-01.
- **C-02.** El pendiente de BACK-01 cita "`ARCHITECTURE.md` §6" para `npx prisma migrate deploy` en el Droplet; en el archivo actual esa línea está en la sección **18 "Despliegue"** (paso 3). Sin acción aquí; se anota con el número correcto para DOCS-01 y el encargo de despliegue.
- **C-03.** `README.md` §2 dice que `npm install` "descarga los motores de Prisma". Con Prisma 7 el cliente ya no usa motor nativo; el CLI sigue trayendo `@prisma/engines` (motor de esquema para `migrate`) **[verificar]**. El README se ajusta en este encargo (sección "Documentación").

## Suposiciones
- **S-01.** Node `v24.11.1`, npm `11.6.2`, entorno de infra levantado (`postgres` `healthy` en `127.0.0.1:5433`), `backend/.env` presente con la `DATABASE_URL` de desarrollo (no se lee ni se imprime). El programador confirma con V-01 y, si infra está apagado, lo levanta (`docker compose up -d`, autorizado).
- **S-02.** Los datos que el orquestador verificó con red el 2026-09-22 (versiones, `dependencies`, `peerDependencies`, firmas en los `.d.ts`) son correctos. Lo que no está en esa lista lleva **[verificar]** y el programador lo confirma contra el paquete instalado antes de escribir el archivo que dependa de ello.
- **S-03.** El programador trabaja en Git Bash sin terminal interactiva; los comandos del README se escriben para PowerShell 5.1. Los procesos se arrancan en segundo plano y se detienen con `taskkill //PID <pid> //T //F` (patrón de BACK-01).
- **S-04.** Ninguno de `prisma validate`, `prisma generate` ni `prisma migrate status` escribe en `backend/prisma/migrations/` (V-06 lo comprueba con `git diff`). Si alguno lo hiciera, el programador se detiene y reporta; no edita ni revierte.
- **S-05.** `prisma generate` de 7.10.0 funciona con un esquema **sin modelos** (en 6.19.3 funcionó). Si fallara por eso, el programador se detiene y reporta; **no agrega un modelo de relleno**.
- **S-06.** Vitest 4 aísla cada archivo de prueba en su propio proceso (`pool: forks` por defecto), así que el estado de módulo de `cliente.ts` no se comparte entre `db-cliente.test.ts` y `salud.integracion.test.ts`.

## Alcance
**Entra:** Prisma 7.10.0 (`prisma`, `@prisma/client`, `@prisma/adapter-pg`, `pg`); `backend/prisma.config.ts`; `schema.prisma` con generador `prisma-client` y datasource sin `url`; cliente generado en `backend/src/adapters/db/generated/` (no versionado); `adapters/db` con `inicializarDb` / `obtenerDb` / `cerrarConexion` y adaptador `PrismaPg`; `construirApp` inicializa la base con `env.DATABASE_URL`; `server.ts` con importación estática de `app.js` (condicionada a V-14); M-02 (`logController`); ESLint `^10` con `{ cause: error }` en `test/setup.ts`; regla de capas ampliada en ESLint; `.gitignore`, `.prettierignore`; `prelint` (P-02); prueba nueva de `cliente.ts` (P-03); ajustes de texto en `README.md` (sección "Backend en local"), `backend/.env.example` y `backend/src/adapters/README.md`. La migración `20260922015711_extensiones_iniciales` **no se toca** y sigue aplicada.

**No entra:** modelos, tablas, migraciones nuevas, `middleware/`, autenticación, pg-boss, Testcontainers, Dockerfile o Compose de `prod`, CI, `frontend/`, `shared/`, `infra/`, `docs/ARCHITECTURE*.md`, `AGENTS.md`, `CLAUDE.md`, `tsconfig.base.json`, `backend/tsconfig.json`, saltos de versión mayor distintos de Prisma y ESLint (TypeScript se queda en `^5.9.3`; vitest, globals, fastify-plugin, `@types/node` como están), `npm audit fix` (M-04 se acepta y se vuelve a medir), reglas de ESLint con información de tipos, silenciar los logs de las pruebas.

## Archivos
| Acción | Ruta | Contenido |
|---|---|---|
| Crear | `backend/prisma.config.ts` | `defineConfig` con `schema`, `migrations.path` y `datasource.url`; carga `backend/.env` con `process.loadEnvFile()` ignorando `ENOENT`; sin `dotenv` |
| Crear (P-03) | `backend/test/db-cliente.test.ts` | 3 casos sobre `inicializarDb` / `obtenerDb` / `cerrarConexion`; sin PostgreSQL |
| Crear | `docs/trabajo/BACK-02-prisma-7/resumen-programador.md` | Entregable del programador |
| Crear (vía CLI), **no versionado** | `backend/src/adapters/db/generated/` | Salida de `prisma generate`; ignorada por git, ESLint y Prettier; compilada por `tsc` a `dist/` |
| Modificar | `package.json` (raíz) | `eslint ^10.11.0`, `@eslint/js ^10.0.1` |
| Modificar | `package-lock.json` | Lo regenera `npm install` |
| Modificar | `backend/package.json` | deps `@prisma/adapter-pg ^7.10.0`, `@prisma/client ^7.10.0`, `pg ^8.23.0`; devDeps `prisma ^7.10.0`; script `prelint` (P-02) |
| Modificar | `backend/prisma/schema.prisma` | Generador `prisma-client` con `output`, `runtime`, `moduleFormat`, `importFileExtension`, `generatedFileExtension`; datasource sin `url` |
| Modificar | `backend/src/adapters/db/cliente.ts` | `inicializarDb`, `obtenerDb`, `cerrarConexion` con `PrismaPg` y el cliente generado |
| Modificar | `backend/src/adapters/db/salud.ts` | Usa `obtenerDb()` en lugar de `prisma` |
| Modificar | `backend/src/adapters/db/index.ts` | Reexporta `inicializarDb`, `cerrarConexion`, `verificarConexion` |
| Modificar | `backend/src/adapters/README.md` | Lista de librerías: `@prisma/adapter-pg`, `pg`, cliente generado |
| Modificar | `backend/src/app.ts` | `inicializarDb({ connectionString: env.DATABASE_URL })`; `logController: new LogController({ requestIdLogLabel: "requestId" })` |
| Modificar | `backend/src/server.ts` | Importación estática de `./app.js` (DEC-05, condicionada a V-14); comentario actualizado |
| Modificar | `backend/test/setup.ts` | `new Error("...", { cause: error })` |
| Modificar | `backend/test/salud-sin-base.integracion.test.ts` | El doble de `adapters/db` expone también `inicializarDb` |
| Modificar | `eslint.config.mjs` | `ignores` con `generated/**`; `no-restricted-imports` con `@prisma/adapter-pg`, `pg` y patrón `adapters/db/generated` |
| Modificar | `.prettierignore` | Línea `backend/src/adapters/db/generated` |
| Modificar | `.gitignore` | Línea `backend/src/adapters/db/generated/` |
| Modificar | `backend/.env.example` | Comentario de `DATABASE_URL`: el CLI la lee a través de `prisma.config.ts` |
| Modificar | `README.md` | Solo la sección "Backend en local": §2, §3, §4 y §8 |
| **No se toca** | `backend/prisma/migrations/**`, `backend/src/worker.ts`, `backend/src/config/*`, `backend/src/core/*`, `backend/src/handlers/*`, `backend/tsconfig.json`, `tsconfig.base.json`, `backend/vitest.config.ts`, `shared/**`, `frontend/**`, `infra/**`, `AGENTS.md`, `CLAUDE.md`, `docs/ARCHITECTURE*.md` | — |
| **Propuesto, lo aplica el orquestador** | `AGENTS.md` regla 1 | Ver "Propuesta para AGENTS.md" |

Sobrantes de Prisma 6: `node_modules/.prisma/client/` (cliente generado por 6.19.3) **no es del repositorio** y queda huérfano tras el cambio; nada lo importa. No se borra en este encargo (borrar requiere confirmación y no aporta nada); desaparece con un `node_modules` limpio. Ningún archivo versionado de Prisma 6 sobra: `schema.prisma` se edita, la migración se conserva.

## Dependencias
| Paquete | Dónde | Antes | Después | Para qué |
|---|---|---|---|---|
| `@prisma/client` | backend, deps | `^6.19.3` | `^7.10.0` | Runtime del cliente (`@prisma/client/runtime/client`, lo importa el código generado) |
| `@prisma/adapter-pg` | backend, deps | — | `^7.10.0` (misma versión exacta que `@prisma/client`) | Adaptador de driver PostgreSQL; obligatorio en Prisma 7 |
| `pg` | backend, deps | — | `^8.23.0` (P-01) | Driver que usa el adaptador. Ningún archivo propio lo importa; `@types/pg` llega transitivo y no se instala aparte |
| `prisma` | backend, devDeps | `^6.19.3` | `^7.10.0` (misma versión exacta que `@prisma/client`) | CLI (`validate`, `generate`, `migrate`) |
| `eslint` | raíz, devDeps | `^9.39.5` | `^10.11.0` | M-03 |
| `@eslint/js` | raíz, devDeps | `^9.39.5` | `^10.0.1` | M-03 |

Sin cambios: `fastify ^5.12.5`, `fastify-plugin ^5.1.0`, `pino ^10.3.1`, `zod ^4.6.5`, `tsx ^4.23.15`, `vitest ^4.1.11`, `@types/node ^24.13.6`, `typescript ^5.9.3`, `typescript-eslint ^8.70.1`, `eslint-config-prettier ^10.1.8`, `globals ^16.5.0`, `prettier ^3.9.8`. **No se instala:** `dotenv`, `@types/pg`, `better-sqlite3`, `postgres`, `mysql2`, `pino-pretty`. Ninguna dependencia de AWS ni de proveedores no aprobados. (`mysql2`, `postgres`, `@prisma/dev` y `@prisma/studio-core` aparecerán en el lock como dependencias **transitivas del CLI** `prisma@7.10.0`; son librerías, no servicios, viven bajo una devDependency y nadie las importa. Se reportan, no se instalan directamente.)

### Comprobación de versiones previa a la instalación (reformula la comprobación 1 de la Enmienda 1 de BACK-01)
`dist-tags.latest` de `prisma` apunta a `8.0.0-rc.15`, así que **no se usa `latest`**. Se busca la última 7.x **estable** (sin sufijo) en la lista completa de versiones, ordenada por semver (no por orden de publicación). Comando reproducible (Git Bash, desde cualquier carpeta):
```bash
ultima() { npm view "$1" versions --json | node -e "const v=JSON.parse(require('fs').readFileSync(0,'utf8'));const re=new RegExp('^'+process.argv[1]+'\\\\.\\\\d+\\\\.\\\\d+\$');const n=(s)=>s.split('.').map(Number);const e=v.filter(x=>re.test(x)).sort((a,b)=>{const A=n(a),B=n(b);return A[0]-B[0]||A[1]-B[1]||A[2]-B[2]});console.log(e.at(-1))" "$2"; }
ultima prisma 7; ultima @prisma/client 7; ultima @prisma/adapter-pg 7; ultima pg 8; ultima eslint 10; ultima @eslint/js 10
```
Criterios (todos con salida copiada al resumen):
1. `prisma`, `@prisma/client` y `@prisma/adapter-pg`: la última 7.x estable es **`7.10.0` en los tres**. Si es mayor en alguno → P-04 (detenerse y reportar). Si difieren entre sí → detenerse y reportar.
2. `npm view prisma@7.10.0 peerDependencies peerDependenciesMeta` → `better-sqlite3` debe figurar como **opcional** en `peerDependenciesMeta`; `typescript >=5.4.0` se cumple con 5.9.3. Si `better-sqlite3` no fuera opcional → detenerse y reportar (npm intentaría instalar un módulo nativo que no queremos).
3. `npm view @prisma/client@7.10.0 peerDependencies peerDependenciesMeta` → `prisma *` y `typescript >=5.4.0`, ambos opcionales.
4. `npm view @prisma/adapter-pg@7.10.0 dependencies` → incluye `pg ^8.16.3` (sin `peerDependencies`; es normal). `pg`: última 8.x estable = `8.23.0`; si es mayor, usarla en `backend/package.json` y reportar (debe satisfacer `^8.16.3`).
5. `eslint`: última 10.x estable = `10.11.0` (si es mayor, usarla y reportar); `@eslint/js` = `10.0.1` (ídem); `npm view typescript-eslint@8.70.1 peerDependencies` admite `eslint ^10.0.0`; `npm view eslint-config-prettier@10.1.8 peerDependencies` → `eslint >=7.0.0`; `npm view @eslint/js@<versión> peerDependencies` → `eslint ^10.0.0`.

## Diseño

### Decisiones
- **DEC-01. Prisma 7.10.0 con generador `prisma-client`, salida en `backend/src/adapters/db/generated/`, cliente con `@prisma/adapter-pg` + `pg`.** Hereda DEC-01a de BACK-01 (decisión del humano en `aprobacion.md`). En Prisma 7 el adaptador es obligatorio (no hay motor de consultas nativo) y la URL sale del esquema hacia `prisma.config.ts`. El `output` dentro de `adapters/db/` respeta "Prisma solo en `adapters/db`" de ESSENTIALS.
- **DEC-02. `backend/prisma.config.ts` junto al `package.json` del backend.** Es el cwd de todos los comandos de `AGENTS.md` y de los hooks `pre*` (`npm run` fija el cwd en el workspace), así que el CLI lo encuentra sin banderas. Carga `backend/.env` con `process.loadEnvFile()` dentro de `try/catch` que solo ignora `ENOENT` (mismo patrón que `test/setup.ts`; DEC-03 de BACK-01: sin `dotenv`). `loadEnvFile` **no pisa** variables ya definidas: en `prod` y CI el entorno gana y el archivo no existe. `datasource.url` usa `env("DATABASE_URL")` de `prisma/config`. No se agrega al `tsconfig` de build (`include: ["src"]`), igual que `vitest.config.ts`: lo lintea ESLint, lo formatea Prettier, lo carga el CLI; `tsc --noEmit` no lo ve, así que ni `import.meta` ni los tipos de Node le afectan al build. **El `tsconfig` global no se toca.**
- **DEC-03. La carpeta generada se compila con el resto de `src/` y no se versiona.** `cliente.ts` la importa, así que `tsc` la comprueba y la emite a `dist/adapters/db/generated/` (necesario en runtime: `dist/adapters/db/cliente.js` importa `./generated/client.js`). Se espera que compile bajo el `tsconfig` estricto porque el generador emite un preámbulo con `// @ts-nocheck` **[verificar en V-05]** y está diseñado para `isolatedModules`/`verbatimModuleSyntax`. `exclude` en `tsconfig` **no** serviría de respaldo: `tsc` comprueba igual los archivos alcanzados por importación. Por eso, si V-08 falla con errores **dentro de `generated/**`**, el programador **se detiene y reporta** (primeras 20 líneas de error + las 8 primeras líneas de `generated/client.ts`); nunca relaja el `tsconfig` ni desactiva opciones estrictas (R-01). Git, ESLint y Prettier la ignoran; los hooks `pre*` la regeneran.
- **DEC-04. Inicialización explícita de `adapters/db`.** `inicializarDb({ connectionString })` crea `new PrismaClient({ adapter: new PrismaPg({ connectionString }) })` una sola vez (idempotente: `construirApp` puede ejecutarse más de una vez en el mismo proceso, en pruebas); `obtenerDb()` devuelve el cliente o lanza `AppError("BASE_DE_DATOS_NO_INICIALIZADA", "La base de datos no está inicializada.", 500)`; `cerrarConexion()` hace `$disconnect()` y deja el módulo sin cliente. `construirApp({ env })` llama a `inicializarDb` con `env.DATABASE_URL` **ya validada** por `config/env.ts`; `adapters/` no lee `process.env`. `verificarConexion` llama a `obtenerDb()` **fuera** del `try`: una base no inicializada es un error de programación (500), no una base caída (503). `obtenerDb` no se reexporta desde `index.ts` (misma superficie que hoy).
- **DEC-05. `server.ts` vuelve a la importación estática de `./app.js`, condicionada a V-14.** La importación diferida (D4 de BACK-01) existía porque `@prisma/client` 6 cargaba `backend/.env` al importarse. Con el generador `prisma-client` y adaptador, el cliente no lee `.env` **[verificar en V-14]**. Criterio: con importación estática, `env -u DATABASE_URL node dist/server.js` (sin `--env-file`, cwd `backend/` con `.env` presente) debe terminar con código 1 y "Configuración inválida … DATABASE_URL: obligatoria". Si pasa, se queda la estática; si no, se conserva la diferida con el comentario actualizado a Prisma 7 y se reporta como desviación.
- **DEC-06. M-02: `logController: new LogController({ requestIdLogLabel: "requestId" })`.** Verificado en `node_modules/fastify` 5.12.5: `fastify.js:1024` exporta `module.exports.LogController` (importable como `import Fastify, { LogController } from "fastify"`); `types/logger.d.ts` declara `LogControllerOptions { disableRequestLogging?, requestIdLogLabel? }` y `constructor(options?)`; `lib/logger-factory.js:31` usa `server[kLogController].requestIdLogLabel` como etiqueta del `reqId` en el logger hijo; `createLogController(options)` (`logger-factory.js:132`) devuelve **tal cual** la instancia pasada en `options.logController`, sin mezclarla con la opción de nivel superior. `FSTDEP024` solo se emite si `options.requestIdLogLabel !== undefined` (`fastify.js:884`), comprobación que ocurre **antes** de que el validador aplique el default `"reqId"` (`getSecuredInitialConfig`, `fastify.js:921`); basta con no pasar la opción de nivel superior. Criterio: el aviso desaparece al arrancar y en `npm test`, y el log sigue mostrando `"requestId":"req-1"` (no `reqId`).
- **DEC-07. ESLint 10 sin desactivar reglas.** `js.configs.recommended` de 10 activa `preserve-caught-error`; la única falla conocida (empírica, BACK-01) es `backend/test/setup.ts:6`, que pasa a `throw new Error("...", { cause: error })`. Los archivos nuevos cumplen la regla (`prisma.config.ts` relanza el mismo `error`; `salud.ts` no lanza dentro del `catch`). Si `recommended` marcara algo más: corrección trivial reportada, o detenerse si implica decisión; nunca desactivar la regla en `eslint.config.mjs` sin reportarlo como desviación.
- **DEC-08. `prelint`** (P-02): `"prelint": "npm run shared:build && prisma generate"`, idéntico a `predev`/`prebuild`/`pretest`.
- **DEC-09. `pg` como dependencia directa** (P-01).
- **DEC-10. Regla de capas ampliada en ESLint.** Fuera de `backend/src/adapters/**` se prohíbe importar, además de `@prisma/client`, `@prisma/adapter-pg`, `pg` y cualquier ruta que contenga `adapters/db/generated`. `core/` conserva su patrón (`/adapters` ya cubre la carpeta generada). Afinar a "solo `adapters/db/**`" (para que `adapters/auth` tampoco importe el cliente) queda para el encargo que cree el segundo adaptador; se anota.
- **DEC-11. Migración intacta.** Solo `validate`, `generate` y `migrate status` (lectura). `migrate status` compara los checksums de los archivos locales con `_prisma_migrations`; el SQL no cambia, así que debe responder "up to date". Ningún comando del plan reescribe `migration_lock.toml` (solo `migrate dev` lo hace); si `git status` lo mostrara modificado, el programador se detiene y reporta (no lo edita ni lo revierte). `_prisma_migrations` no se toca: misma tabla, misma fila, mismo checksum.

### Flujo de arranque después del cambio
1. `server.ts`: importaciones estáticas de `./app.js` y `./config/env.js` (evaluar `app.js` carga `adapters/db` → `generated/client.js` → `@prisma/client/runtime/client`, `@prisma/adapter-pg` → `pg`; ninguno lee `.env` [V-14]). `cargarEnv()` valida `process.env`; si falla, mensaje de DEC-03 y código 1.
2. `construirApp({ env })`: `inicializarDb({ connectionString: env.DATABASE_URL })` (no abre conexión: el cliente y el pool de `pg` son perezosos); `Fastify({ logger: opcionesDeLogger(env), logController: new LogController({ requestIdLogLabel: "requestId" }) })`; registra `manejoDeErrores` y `saludHandler` con `{ prefix: "/api" }`; `onClose` → `cerrarConexion()`.
3. `GET /api/salud`: `verificarConexion(request.log)` → `obtenerDb().$queryRaw\`SELECT 1\`` (primera consulta abre el pool) → `evaluarSalud` → contrato sin cambios: `200 { estado, baseDeDatos, marcaDeTiempo }` o `503 BASE_DE_DATOS_NO_DISPONIBLE`.
4. Cierre: `SIGINT`/`SIGTERM` → `app.close()` → `cerrarConexion()` → `$disconnect()` cierra el pool del adaptador **[verificar: el proceso y `npm test` terminan solos]**.
5. `worker.ts` no cambia: no toca la base.

### Contenido exacto de los archivos

**`backend/prisma.config.ts`** (nuevo):
```ts
import { defineConfig, env } from "prisma/config"

// El CLI de Prisma 7 no carga .env por su cuenta y este proyecto no usa dotenv (DEC-03 de BACK-01).
// En desarrollo lee backend/.env; en prod las variables llegan del entorno y el archivo no existe.
// loadEnvFile no pisa variables ya definidas: el entorno siempre gana sobre el archivo.
try {
  process.loadEnvFile(new URL(".env", import.meta.url))
} catch (error) {
  if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  datasource: { url: env("DATABASE_URL") },
})
```
`schema` y `migrations.path` se resuelven respecto al archivo de configuración **[verificar]**; como el archivo está en `backend/` y el cwd también, ambas lecturas coinciden. Sin valores de conexión escritos. Antes de escribirlo, el programador confirma en `node_modules/@prisma/config/dist/index.d.ts` que `defineConfig` y `env` existen con esas firmas y que `PrismaConfig` admite `schema`, `migrations.path` y `datasource.url` (datos del orquestador, S-02).

**`backend/prisma/schema.prisma`:**
```prisma
generator client {
  provider               = "prisma-client"
  output                 = "../src/adapters/db/generated"
  runtime                = "nodejs"
  moduleFormat           = "esm"
  importFileExtension    = "js"
  generatedFileExtension = "ts"
}

datasource db {
  provider = "postgresql"
}
```
Sin modelos, sin `previewFeatures`, sin `url`. Las cuatro opciones del generador se fijan de forma explícita para no depender de la inferencia del generador (que mira `package.json` y `tsconfig.json`); son las que exige NodeNext + `verbatimModuleSyntax` (importaciones relativas con `.js`, archivos `.ts` que `tsc` emite). `npx prisma format --check` confirma la alineación; si `format --check` pide realinear, el programador ajusta los espacios a mano (no ejecuta `prisma format` sin `--check`). **[verificar]** que las cuatro opciones se aceptan tal cual en 7.10.0 (`npx prisma validate`) y el nombre del archivo de entrada generado (esperado `client.ts`, con `export const PrismaClient` y `export type PrismaClient`); si el nombre difiere, se ajusta **solo** la ruta de importación en `cliente.ts` y se reporta.

**`backend/src/adapters/db/cliente.ts`:**
```ts
import { PrismaPg } from "@prisma/adapter-pg"

import { AppError } from "../../core/errores.js"
import { PrismaClient } from "./generated/client.js"

// Única instancia del cliente y únicas importaciones del proyecto de @prisma/adapter-pg y del
// cliente generado (regla 1). Sin motor nativo: el adaptador habla con PostgreSQL a través de pg.
let cliente: PrismaClient | undefined

// Idempotente: construirApp puede ejecutarse más de una vez en el mismo proceso (pruebas).
// connectionString llega ya validada por config/env.ts; adapters/ no lee process.env.
export const inicializarDb = ({ connectionString }: { connectionString: string }): void => {
  if (cliente) return
  const adapter = new PrismaPg({ connectionString })
  cliente = new PrismaClient({ adapter })
}

export const obtenerDb = (): PrismaClient => {
  if (!cliente) {
    throw new AppError("BASE_DE_DATOS_NO_INICIALIZADA", "La base de datos no está inicializada.", 500)
  }
  return cliente
}

export const cerrarConexion = async (): Promise<void> => {
  if (!cliente) return
  await cliente.$disconnect()
  cliente = undefined
}
```
**[verificar]** la firma de `PrismaPg` en `node_modules/@prisma/adapter-pg/dist/index.d.ts` (esperado: primer argumento `pg.PoolConfig`, con `connectionString`; segundo argumento opcional `{ schema?: string }`). Nota: `PrismaPg` ignora el parámetro `?schema=public` de la URL (lo honra el CLI); como el esquema es `public`, no hay efecto (R-12).

**`backend/src/adapters/db/salud.ts`:** cambia la importación (`import { obtenerDb } from "./cliente.js"`) y el cuerpo de `verificarConexion`:
```ts
export const verificarConexion = async (log?: LogDeAdvertencias): Promise<boolean> => {
  // Fuera del try: una base no inicializada es un error de programación (500), no una caída (503).
  const db = obtenerDb()
  try {
    await db.$queryRaw`SELECT 1`
    return true
  } catch (error) {
    log?.warn(
      { error: { nombre: nombreDe(error), codigo: codigoDe(error) } },
      "La base de datos no respondió a SELECT 1",
    )
    return false
  }
}
```
`nombreDe`, `codigoDe` y el tipo `LogDeAdvertencias` no cambian.

**`backend/src/adapters/db/index.ts`:**
```ts
// Superficie pública de adapters/db. El cliente (obtenerDb) no se reexporta a propósito.
export { cerrarConexion, inicializarDb } from "./cliente.js"
export { verificarConexion } from "./salud.js"
```

**`backend/src/app.ts`:**
```ts
import Fastify, { LogController, type FastifyInstance } from "fastify"

import { cerrarConexion, inicializarDb } from "./adapters/db/index.js"
import type { Env } from "./config/env.js"
import { opcionesDeLogger } from "./config/logger.js"
import { manejoDeErrores } from "./handlers/errores.js"
import { saludHandler } from "./handlers/salud.js"

// Construye la aplicación sin escuchar: server.ts llama a listen y las pruebas usan inject.
export const construirApp = async ({ env }: { env: Env }): Promise<FastifyInstance> => {
  inicializarDb({ connectionString: env.DATABASE_URL })

  const app = Fastify({
    logger: opcionesDeLogger(env),
    // Sustituye a la opción de nivel superior requestIdLogLabel, deprecada en Fastify 5 (FSTDEP024).
    logController: new LogController({ requestIdLogLabel: "requestId" }),
  })

  await app.register(manejoDeErrores)
  await app.register(saludHandler, { prefix: "/api" })

  app.addHook("onClose", async () => {
    await cerrarConexion()
  })

  return app
}
```

**`backend/src/server.ts`** (solo cambian las primeras líneas; el resto igual):
```ts
import { construirApp } from "./app.js"
import { cargarEnv } from "./config/env.js"

// Con Prisma 7 el cliente ya no carga backend/.env al importarse, así que la importación puede ser
// estática: cargarEnv() sigue siendo la única fuente de verdad de la configuración.
const env = cargarEnv()
const app = await construirApp({ env })
```
Si V-14 falla, se conserva `const { construirApp } = await import("./app.js")` con el comentario actual reescrito para Prisma 7 y se reporta.

**`backend/test/setup.ts`** (línea 6):
```ts
    throw new Error("Falta backend/.env: copia backend/.env.example a backend/.env", { cause: error })
```
(Prettier decidirá el corte de línea; el programador formatea con `--write` acotado a `backend/`.)

**`backend/test/salud-sin-base.integracion.test.ts`** (solo el doble):
```ts
vi.mock("../src/adapters/db/index.js", () => ({
  inicializarDb: () => undefined,
  verificarConexion: async () => false,
  cerrarConexion: async () => undefined,
}))
```

**`backend/test/db-cliente.test.ts`** (nuevo, P-03):
```ts
import { afterAll, describe, expect, it } from "vitest"

import { cerrarConexion, inicializarDb, obtenerDb } from "../src/adapters/db/cliente.js"
import { cargarEnv } from "../src/config/env.js"
import { esAppError } from "../src/core/errores.js"

// No consulta PostgreSQL: el cliente y el pool son perezosos. Vitest aísla este archivo en su propio
// proceso, así que el módulo empieza sin inicializar.
afterAll(async () => {
  await cerrarConexion()
})

describe("adapters/db/cliente", () => {
  it("obtenerDb lanza BASE_DE_DATOS_NO_INICIALIZADA antes de inicializarDb", () => {
    try {
      obtenerDb()
    } catch (error) {
      expect(esAppError(error)).toBe(true)
      if (!esAppError(error)) return
      expect(error.codigo).toBe("BASE_DE_DATOS_NO_INICIALIZADA")
      expect(error.estado).toBe(500)
      return
    }
    expect.unreachable("obtenerDb no lanzó")
  })

  it("inicializarDb es idempotente y obtenerDb devuelve la misma instancia", () => {
    const env = cargarEnv()
    inicializarDb({ connectionString: env.DATABASE_URL })
    const primera = obtenerDb()
    inicializarDb({ connectionString: env.DATABASE_URL })
    expect(obtenerDb()).toBe(primera)
  })

  it("cerrarConexion deja el módulo sin inicializar", async () => {
    await cerrarConexion()
    expect(() => obtenerDb()).toThrowError("La base de datos no está inicializada.")
  })
})
```
(El `try/catch` del primer caso no lanza dentro del `catch`, así que `preserve-caught-error` no aplica. Si el programador prefiere `expect(() => obtenerDb()).toThrowError(AppError)` más una comprobación de `codigo` con `toThrowError(expect.objectContaining(...))`, es equivalente; lo que importa son los tres casos.)

**`eslint.config.mjs`** (tres cambios):
```js
const libreriasDeInfraestructura = [
  "@prisma/client",
  "@prisma/adapter-pg",
  "pg",
  "pg-boss",
  "minio",
  "resend",
  "argon2",
  "jose",
  "livekit-server-sdk",
]
```
```js
// El cliente generado por Prisma vive en adapters/db/generated y solo adapters/db lo importa.
const clienteGenerado = {
  regex: "adapters/db/generated",
  message:
    "El cliente generado de Prisma solo se importa dentro de backend/src/adapters/db/ (AGENTS.md, regla 1).",
}
```
```js
    ignores: [
      "**/dist/**",
      "**/node_modules/**",
      "**/coverage/**",
      "backend/prisma/migrations/**",
      "backend/src/adapters/db/generated/**",
    ],
```
```js
  {
    basePath: raiz,
    files: ["**/*.{ts,mts,cts,js,mjs,cjs}"],
    ignores: ["backend/src/adapters/**"],
    rules: {
      "no-restricted-imports": ["error", { paths: soloEnAdapters, patterns: [clienteGenerado] }],
    },
  },
```
El bloque de `core/` no cambia (su regex `/adapters` ya cubre `../adapters/db/generated/...`). `basePath`, `defineConfig` de `eslint/config` y `globals` siguen válidos en ESLint 10 (BACK-01 lo comprobó con 10.11.0 sin avisos).

**`.prettierignore`:** agregar la línea `backend/src/adapters/db/generated` al final (Prettier resuelve los patrones respecto al archivo de ignore, comprobado en BACK-01 M-01).

**`.gitignore`:** agregar `backend/src/adapters/db/generated/` después de `backend/tmp/`.

**`backend/package.json`:**
```json
  "scripts": {
    ...
    "prelint": "npm run shared:build && prisma generate",
    "lint": "eslint --config ../eslint.config.mjs . && prettier --check . --ignore-path ../.prettierignore && npm run typecheck",
    ...
  },
  "dependencies": {
    "@campus/shared": "*",
    "@prisma/adapter-pg": "^7.10.0",
    "@prisma/client": "^7.10.0",
    "fastify": "^5.12.5",
    "fastify-plugin": "^5.1.0",
    "pg": "^8.23.0",
    "pino": "^10.3.1",
    "zod": "^4.6.5"
  },
  "devDependencies": {
    "@types/node": "^24.13.6",
    "prisma": "^7.10.0",
    "tsx": "^4.23.15",
    "vitest": "^4.1.11"
  }
```
**`package.json` (raíz):** `"@eslint/js": "^10.0.1"`, `"eslint": "^10.11.0"`. Nada más.

**`backend/src/adapters/README.md`** (primer párrafo):
> Único lugar del backend que importa `@prisma/client`, `@prisma/adapter-pg`, `pg`, el cliente generado por Prisma (`db/generated/`, no versionado; lo crea `prisma generate`), `pg-boss`, `minio`, `resend`, `argon2`, `jose` y `livekit-server-sdk` (AGENTS.md, regla 1; ESLint lo vigila con `no-restricted-imports`).

El segundo párrafo no cambia.

**`backend/.env.example`** (línea 15, ASCII como el resto del archivo): `# .env.example se editan juntos. El CLI de Prisma lo lee a traves de backend/prisma.config.ts.`

### Documentación: `README.md`, sección "Backend en local" (solo estas frases)
- **§2**, frase final: `Necesita red: además de los paquetes, descarga el motor de esquema que usa el CLI de Prisma para las migraciones.` **[verificar]** que `node_modules/@prisma/engines/` contiene `schema-engine-*` tras `npm install`; si con 7.10.0 no se descarga ningún binario, la frase queda: `Necesita red para descargar los paquetes.`
- **§3**, última frase: `El CLI de Prisma lo lee a través de \`backend/prisma.config.ts\`, sin banderas: ese archivo le indica la URL de conexión y dónde están el esquema y las migraciones.`
- **§4**, párrafo de `generate`: `` `generate` escribe el cliente de Prisma en `backend/src/adapters/db/generated/` (ignorado por git; no se edita a mano). Los scripts `dev`, `dev:worker`, `build`, `lint` y `test` lo regeneran solos, así que solo hace falta a mano después de un `npm install` limpio. `` (sin `lint` si P-02 = no). El bloque `npx prisma migrate dev` / `npx prisma generate` y la explicación de `_prisma_migrations` y la base sombra no cambian.
- **§8**, sustituir la viñeta de `@prisma/client did not initialize yet` por: `- **\`Cannot find module '.../adapters/db/generated/client.js'\` (\`ERR_MODULE_NOT_FOUND\`) o errores de \`tsc\` en \`adapters/db/cliente.ts\` sobre \`./generated/client.js\`.** Falta generar el cliente: ejecuta \`npx prisma generate\` desde \`backend\`.` Y agregar después: `- **Un comando \`npx prisma ...\` se queja de que falta \`DATABASE_URL\`.** No existe \`backend/.env\` (repite el paso 3): \`prisma.config.ts\` lo carga si existe.` **[verificar]** el texto exacto del error de Prisma 7 en V-20 y citarlo entre comillas si es estable.

Nada más del README cambia. Conservar el salto de línea final.

## Cambios por capa
### shared/
Sin cambios.
### backend/core/
Sin cambios (`AppError` se reutiliza desde `adapters/db/cliente.ts`; `adapters → core` está permitido).
### backend/adapters/
`db/cliente.ts`, `db/salud.ts`, `db/index.ts` como arriba; `README.md` de la capa; carpeta `db/generated/` generada y no versionada.
### backend/handlers/
Sin cambios. `GET /api/salud` sigue siendo la única ruta, pública por diseño, sin cadena de middleware.
### backend/workers/
Sin cambios (`worker.ts` no usa la base).
### backend/prisma/
`schema.prisma` (generador y datasource). **Ninguna migración nueva; la existente no se edita.** `backend/prisma.config.ts` nuevo junto a `prisma/`.
### infra/ y .env.example
`infra/` **no cambia**. `backend/.env.example`: solo el comentario de `DATABASE_URL`. Sin variables nuevas.
### frontend/features/<modulo>/
No aplica.

## Acceso a datos
Una sola sentencia, sin cambios: `SELECT 1` vía `$queryRaw` con plantilla etiquetada (parametrizada por construcción), ahora a través del adaptador `pg`. Sin tablas de negocio, sin paginación, sin transacción. Lectura de solo consulta a `_prisma_migrations`, `pg_extension` y `pg_database` en las verificaciones (por `psql`, no por la aplicación).

## Autorización
No hay endpoints con datos de usuario. `GET /api/salud` no revela versión, host ni `DATABASE_URL`; el `500` de `BASE_DE_DATOS_NO_INICIALIZADA` responde con el formato `{ error: { codigo, mensaje } }` sin detalles internos.

## Pruebas requeridas
| Archivo | Cambio | Casos |
|---|---|---|
| `src/core/errores.test.ts`, `src/core/salud.test.ts`, `src/config/env.test.ts` | Ninguno | 6 + 3 + 7, sin cambios |
| `test/salud.integracion.test.ts` | Ninguno | 4 casos; siguen pasando con el adaptador `pg` (200 con contrato, 404, 418, 500 sin `boom`) |
| `test/salud-sin-base.integracion.test.ts` | Doble con `inicializarDb` | 1 caso: 503 `BASE_DE_DATOS_NO_DISPONIBLE` |
| `test/db-cliente.test.ts` (P-03) | Nuevo | 3 casos: `obtenerDb` sin inicializar lanza `AppError` 500 `BASE_DE_DATOS_NO_INICIALIZADA`; `inicializarDb` idempotente (misma instancia); tras `cerrarConexion`, `obtenerDb` vuelve a lanzar |
| `test/setup.ts` | `{ cause: error }` | Comportamiento igual |

Total esperado: **6 archivos, 24 pruebas** (5 / 21 si P-03 = no). Precondición: infra levantado y `backend/.env` presente. Criterios adicionales de `npm test`: termina solo (sin quedarse colgado por un pool abierto), y la salida no contiene `FSTDEP024`.

## Puntos de ataque para el Tester
No aplica (flujo sin Tester). **Puntos de revisión para el Manager (modo final):** el Manager ejecuta `npm run lint`, `npm test` y `npm run build` desde la raíz, y además:
- `npm ls prisma @prisma/client @prisma/adapter-pg pg eslint @eslint/js` → una sola versión de cada uno (`7.10.0` × 3, `pg 8.23.0` deduplicado, `eslint 10.11.0`, `@eslint/js 10.0.1`), sin `invalid` ni `UNMET PEER` (los `UNMET OPTIONAL DEPENDENCY` de binarios por plataforma son normales). Versiones respaldadas por la salida de `npm view` del resumen; si la última 7.x estable ya no era 7.10.0, consta la parada de P-04.
- `backend/prisma/migrations/`: **una** carpeta (`20260922015711_extensiones_iniciales`) y `migration_lock.toml`, `git diff --quiet -- backend/prisma/migrations` sin cambios; `npx prisma migrate status` "1 migration found … Database schema is up to date!"; `_prisma_migrations` con una fila (misma `migration_name`); ninguna base `prisma_migrate_shadow*`.
- `schema.prisma`: generador `prisma-client` con las cuatro opciones y `output = "../src/adapters/db/generated"`; datasource sin `url`; sin modelos ni `previewFeatures`.
- `backend/prisma.config.ts` versionado, sin `dotenv`, `loadEnvFile` en `try/catch` que solo ignora `ENOENT`, sin valores de conexión; `tsconfig.base.json` y `backend/tsconfig.json` **sin cambios** (`git diff --quiet` sobre ambos).
- `backend/src/adapters/db/generated/` no rastreado (`git check-ignore -v`), excluido de ESLint y Prettier; `dist/adapters/db/generated/client.js` existe tras `build`.
- `grep -rn "@prisma/client\|@prisma/adapter-pg\|from \"pg\"\|adapters/db/generated" backend/src shared/src backend/test --exclude-dir=generated` → solo `backend/src/adapters/db/cliente.ts` (importaciones y comentario) y `backend/src/adapters/README.md` (texto). ESLint bloquea las tres importaciones nuevas fuera de `adapters/` (V-17).
- `app.ts` sin `requestIdLogLabel` de nivel superior; API arrancada por el Manager: cero ocurrencias de `FSTDEP024` y de `"reqId"` en el log, `"requestId":"req-1"` presente; `GET /api/salud` 200 con el mismo contrato; `GET /api/no-existe` 404.
- Arranque sin `DATABASE_URL` con la importación estática: código 1 y "Configuración inválida … DATABASE_URL: obligatoria" sin valores (si el programador conservó la diferida, el resumen lo justifica con la salida de V-14).
- `test/setup.ts` con `{ cause: error }`; ninguna regla de ESLint desactivada o rebajada en `eslint.config.mjs` (el diff del archivo solo agrega la lista, el patrón y la línea de `ignores`).
- Sin `dotenv`, `@types/pg`, `better-sqlite3`, `postgres`, `mysql2` como dependencias **directas** en los tres `package.json`; nada de AWS.
- `backend/.env` no rastreado; `backend/.env.example` con las mismas 5 variables y `DATABASE_URL` idéntica a `infra/.env.example`; el único cambio es el comentario.
- Alcance de más: modelos, migraciones nuevas, cambios en `tsconfig*`, `vitest.config.ts`, `shared/`, `infra/`, `AGENTS.md`, `CLAUDE.md`, `docs/ARCHITECTURE*.md` hechos por el programador; `worker.ts`, `config/*`, `core/*`, `handlers/*` deben estar sin diff.
- LF en todo lo nuevo y modificado (`git ls-files --eol`), incluido `package-lock.json`.
- Resultado de V-20 (informativa) reportado: si `prisma generate` funciona sin `.env`/`DATABASE_URL`, para que el encargo de despliegue lo sepa.
- `npm audit` medido de nuevo (M-04) y reportado sin `fix`.

## Riesgos y desacuerdos
- **R-01. Código generado frente al `tsconfig` estricto** (`exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`, `verbatimModuleSyntax`). Mitigación: el preámbulo `// @ts-nocheck` del generador **[verificar en V-05]**. Si V-08 falla dentro de `generated/**`: detenerse y reportar (DEC-03); el humano/arquitecto decide una enmienda (candidatas, no autorizadas aquí: `generatedFileExtension = "js"` con salida fuera de `src/` y mapa `imports` en `package.json`; nunca relajar el `tsconfig`).
- **R-02. `verbatimModuleSyntax` y el generado en runtime.** Si el generado reexportara un tipo sin `type`, `tsc` lo callaría por `@ts-nocheck` pero Node fallaría al importar (`does not provide an export named`). Prueba real: `npm test` (esbuild/Vitest) y la API en vivo desde `dist/` (V-12).
- **R-03. Motor de esquema del CLI.** `prisma@7.10.0` depende de `@prisma/engines`: `npm install` descarga el motor de esquema (red). Si la descarga falla, detenerse y reportar; sin `PRISMA_*` de espejos ni binarios manuales. El cliente con adaptador no descarga ni carga motor de consultas **[verificar: `ls node_modules/@prisma/engines` y `npx prisma -v`]**.
- **R-04. `prisma.config.ts` con `import.meta` bajo el cargador del CLI.** V-04 lo demuestra (`prisma validate` carga la configuración y encuentra el esquema). Si el CLI no aceptara `import.meta.url`, alternativa autorizada: `process.loadEnvFile(".env")` con ruta relativa al cwd (siempre `backend/`), reportada como desviación.
- **R-05. Prettier y ESLint sobre `prisma.config.ts` desde `backend/`.** Está en el cwd, es `.ts`, no está ignorado: ambos lo alcanzan (precedente `vitest.config.ts`). `tsc --noEmit` no lo comprueba (fuera de `include`); aceptado para un archivo de configuración.
- **R-06. Formato de `migration_lock.toml`.** Prisma 7 podría usar otro texto de cabecera; solo `migrate dev` lo reescribe y este plan no lo ejecuta. Si aun así `git status` lo mostrara modificado tras `validate`/`generate`/`migrate status`, detenerse y reportar. Se acepta un cambio de formato **solo** si lo aprueba el humano tras el reporte y `provider = "postgresql"` no cambia.
- **R-07. `npm audit` (M-04).** Con 6.19.3 había 3 altas transitivas (`@prisma/config` → `deepmerge-ts`); con `@prisma/config@7.10.0` puede persistir **[verificar con `npm audit`, solo lectura]**. Se acepta y se anota; sin `npm audit fix`.
- **R-08. Windows.** `taskkill //PID <pid> //T //F` desde Git Bash; `tsx watch` deja hijos si se mata solo el padre; junctions de workspaces; PowerShell 5.1 sin `&&`; rutas con `\` en la salida de Prisma. Sin efecto en el diseño.
- **R-09. La importación estática rompe V-14.** Cubierto por DEC-05: se conserva la diferida y se reporta.
- **R-10. Formateadores.** `AGENTS.md` prohíbe `--write`/`--fix` desde la raíz. Solo `npx prettier --write prisma.config.ts src test` desde `backend/` y `npx prettier --write eslint.config.mjs` desde la raíz por ruta explícita. Nunca `npm run format` en la raíz.
- **R-11. Cierre del pool de `pg`.** `$disconnect()` debe cerrar el pool creado por `PrismaPg`; síntoma de que no lo hace: `npm test` no termina o la API no sale tras `app.close()`. Se reporta con la salida; no se añade `process.exit` para taparlo.
- **R-12. `?schema=public` en `DATABASE_URL`.** `PrismaPg` no lo interpreta (usa el `search_path` por defecto, `public`); el CLI sí. Sin efecto hoy. Cuando haga falta otro esquema, se pasa `{ schema }` como segundo argumento de `PrismaPg`; se anota en el README de `adapters/` si el programador lo ve necesario (no obligatorio).
- **R-13. `env("DATABASE_URL")` de `prisma/config` puede evaluarse de forma ansiosa.** Entonces `prisma generate` fallaría sin `.env` ni variable (afecta al futuro Dockerfile, no a este encargo, donde `.env` existe). V-20 (informativa) mide el comportamiento real para el encargo de despliegue.
- **R-14. `better-sqlite3` como par de `prisma@7.10.0`.** Debe ser opcional (V-02); si npm lo exigiera, detenerse. Sin `--legacy-peer-deps`.
- **R-15. Reglas nuevas de ESLint 10 sobre código nuevo.** Solo se conoce `preserve-caught-error`; el resto del código pasó con 10.11.0 en BACK-01. DEC-07.
- **R-16. Dependencias transitivas del CLI 7** (`mysql2`, `postgres`, `@prisma/dev`, `@prisma/studio-core`) entran al lock bajo una devDependency. No se importan ni se usan; el Manager revisa que no aparezcan como dependencias directas.
- **R-17. `node_modules/.prisma/client` huérfano** (Prisma 6). Fuera del repositorio; sin efecto; desaparece con un `node_modules` limpio.
- **R-18. Versión 7.x posterior a 7.10.0 publicada después del 2026-09-22.** P-04: detenerse antes de instalar.
- **Desacuerdos con ESSENTIALS:** ninguno. ESSENTIALS fija "Prisma" sin versión y "Prisma solo en `adapters/db`"; el `output` dentro de `adapters/db/generated/` y la regla de ESLint ampliada lo respetan. La lista literal de librerías de la regla 1 se propone ampliar (C-01), no cambiar de sentido.

## Verificaciones (el programador las ejecuta y reporta una por una, con salida real)
| # | Verificación | Resultado esperado |
|---|---|---|
| V-01 | `node --version`; `npm --version`; en `infra/`: `docker compose ps`; en la raíz: `git status --short` | `v24.x`, `11.x`; `postgres` `Up (healthy)`; árbol limpio antes de empezar |
| V-02 | Comprobación de versiones de la sección "Comprobación de versiones previa" (función `ultima` y los `npm view` de pares) | `7.10.0` en `prisma`, `@prisma/client`, `@prisma/adapter-pg`; `pg` `8.23.0`; `eslint` `10.11.0`; `@eslint/js` `10.0.1`; `better-sqlite3` opcional; pares compatibles. Cualquier desviación → parada según P-04 / R-14 |
| V-03 | Editar los dos `package.json`; `npm install` desde la raíz; `npm ls prisma @prisma/client @prisma/adapter-pg pg eslint @eslint/js`; `ls node_modules/@prisma/engines`; `npx prisma -v` (desde `backend/`); `npm audit` (solo lectura); `git status --short` | Código 0, sin `ERESOLVE`/`UNMET PEER`; una versión de cada paquete, `pg` deduplicado; `npx prisma -v` muestra `prisma 7.10.0` y `@prisma/client 7.10.0` (copiar la salida completa: informa qué motores existen); conteo de `npm audit` reportado; solo `package.json`, `backend/package.json` y `package-lock.json` modificados |
| V-04 | Confirmar la API instalada (solo lectura): `node_modules/@prisma/config/dist/index.d.ts` (`defineConfig`, `env`, campos de `PrismaConfig`), `node_modules/@prisma/adapter-pg/dist/index.d.ts` (constructor de `PrismaPg`), `node_modules/@prisma/client/runtime/client.d.ts` (`adapter` obligatorio), `npx prisma generate --help` (existencia de `--config`). Crear `backend/prisma.config.ts`, editar `schema.prisma`. Desde `backend/`: `npx prisma validate`; `npx prisma format --check` | Cada punto [verificar] anotado con lo encontrado; `validate` reporta que cargó `prisma.config.ts` **[verificar texto, esperado "Loaded Prisma config from prisma.config.ts"]** y "The schema … is valid"; `format --check` en verde; la salida no imprime la URL |
| V-05 | `npx prisma generate` desde `backend/`; `ls src/adapters/db/generated`; `head -8 src/adapters/db/generated/client.ts`; `grep -n "export const PrismaClient\|export type PrismaClient\|export class PrismaClient" src/adapters/db/generated/client.ts`; `git check-ignore -v src/adapters/db/generated`; `git status --short` | Código 0; existe `generated/client.ts` (o el nombre real, reportado) que exporta `PrismaClient`; preámbulo copiado al resumen (con o sin `// @ts-nocheck`); carpeta ignorada por `.gitignore`; no aparece en `git status` |
| V-06 | `npx prisma migrate status` desde `backend/`; `ls backend/prisma/migrations`; `cat backend/prisma/migrations/migration_lock.toml`; `git diff --quiet -- backend/prisma/migrations; echo $?`; `git status --short backend/prisma` | "1 migration found in prisma/migrations" y "Database schema is up to date!", sin pendientes ni deriva; una carpeta `20260922015711_extensiones_iniciales` + `migration_lock.toml` idéntico al versionado; `0`; solo `schema.prisma` modificado |
| V-07 | En `infra/`: `docker compose exec -T postgres psql -U campus -d campus_dev -c "SELECT migration_name, finished_at IS NOT NULL AS aplicada, rolled_back_at IS NULL AS vigente FROM _prisma_migrations;"`; `-c "SELECT extname FROM pg_extension ORDER BY 1;"`; `-c "SELECT datname FROM pg_database WHERE datname LIKE 'prisma_migrate_shadow%';"` | Una fila `20260922015711_extensiones_iniciales`, `t`, `t`; `pg_trgm`, `plpgsql`, `unaccent`; 0 filas |
| V-08 | Tras editar `adapters/db/*`, `app.ts`, `server.ts` y las pruebas: `npm run typecheck` en `backend/` | Código 0 con el código generado incluido. Si falla **solo** dentro de `generated/**`: detenerse y reportar (DEC-03, R-01). Si falla en código propio: corregir el código propio |
| V-09 | Prettier acotado (`npx prettier --write prisma.config.ts src test` en `backend/`; `npx prettier --write eslint.config.mjs` en la raíz); luego `npm run lint` desde la raíz; `npx eslint --version` | `v10.11.0`; código 0 en `shared` y `backend` (ESLint sin errores, "All matched files use Prettier code style!", `tsc --noEmit` limpio); `prelint` regeneró el cliente; sin avisos de deprecación de configuración |
| V-10 | `npm test` desde la raíz, salida capturada a `backend/tmp/test.log`; `grep -c FSTDEP024 backend/tmp/test.log`; `grep -c DeprecationWarning backend/tmp/test.log` | `Test Files 6 passed (6)`, `Tests 24 passed (24)` (5 / 21 si P-03 = no); código 0; el proceso termina solo; `0` y `0` |
| V-11 | `npm run build` desde la raíz; `ls backend/dist/adapters/db backend/dist/adapters/db/generated` | Código 0; existen `shared/dist/index.js`, `backend/dist/server.js`, `backend/dist/worker.js`, `backend/dist/adapters/db/cliente.js`, `backend/dist/adapters/db/generated/client.js` |
| V-12 | Desde `backend/` (Git Bash): `node --env-file-if-exists=.env dist/server.js > tmp/api.log 2>&1 & echo $!`; `sleep 3`; `curl.exe -s -i http://127.0.0.1:3000/api/salud`; `curl.exe -s -i http://127.0.0.1:3000/api/no-existe`; `curl.exe -s -o NUL -H "Authorization: Bearer secreto" -H "Cookie: a=b" http://127.0.0.1:3000/api/salud`; `taskkill //PID <pid> //T //F` (el PID de Windows también aparece en la primera línea del log como `"pid":…`; si `$!` no coincide, usar ese); `grep -c FSTDEP024 tmp/api.log`; `grep -c '"reqId"' tmp/api.log`; `grep -c '"requestId":"req-' tmp/api.log`; `grep -c "secreto\|a=b" tmp/api.log`; `powershell.exe -NoProfile -Command "Get-NetTCPConnection -LocalPort 3000 -State Listen"` | `200` con `{"estado":"ok","baseDeDatos":"ok","marcaDeTiempo":"…Z"}`; `404` `NO_ENCONTRADO`; `0`, `0`, `≥ 1` (copiar una línea del log al resumen), `0`; puerto libre después |
| V-13 | Desde `backend/`: `node --env-file-if-exists=.env dist/worker.js > tmp/worker.log 2>&1 & echo $!`; `sleep 2`; `taskkill //PID <pid> //T //F`; `cat tmp/worker.log` | `"evento":"worker_listo"`; sin errores |
| V-14 | Desde `backend/` (con `backend/.env` presente en el cwd y **sin** bandera de env): `env -u DATABASE_URL node dist/server.js; echo "codigo=$?"` | Código 1 y `Configuración inválida. Revisa backend/.env …` / `  - DATABASE_URL: obligatoria`, sin valores. Decide DEC-05: si pasa, la importación estática se queda; si el proceso arranca, restaurar la importación diferida, reconstruir (`npm run build`) y repetir V-14 y V-12, y reportar la desviación |
| V-15 | `npm run dev` y `npm run dev:worker` con PowerShell, patrón de BACK-01: `powershell.exe -NoProfile -Command "$p = Start-Process npm.cmd -ArgumentList 'run','dev' -PassThru -WindowStyle Hidden -RedirectStandardOutput tmp/dev.log -RedirectStandardError tmp/dev.err; Start-Sleep 15; Get-Content tmp/dev.log -Tail 5; taskkill /PID $p.Id /T /F"`; durante la espera, `curl.exe http://127.0.0.1:3000/api/salud` desde otra invocación; repetir con `dev:worker` | `tsx watch` transpila también el cliente generado `.ts`; log con `"msg":"Server listening at http://127.0.0.1:3000"` y `requestId`; `tmp/dev.err` sin `FSTDEP024`; worker con `worker_listo`; árboles terminados; puerto libre |
| V-16 | `grep -rn "@prisma/client\|@prisma/adapter-pg\|from \"pg\"\|adapters/db/generated" backend/src shared/src backend/test --exclude-dir=generated` | Solo `backend/src/adapters/db/cliente.ts` (importaciones y comentario) y `backend/src/adapters/README.md` (texto) |
| V-17 | Crear temporalmente `backend/src/core/prueba-capa.ts` con `import "@prisma/adapter-pg"`; ejecutar `npx eslint --config ../eslint.config.mjs .` desde `backend/`; repetir con `import "pg"`, con `import "../adapters/db/generated/client.js"`; después crear `backend/src/handlers/prueba-capa.ts` con `import "../adapters/db/generated/client.js"` y `import "pg"`; borrar los dos archivos temporales; volver a ejecutar ESLint | Falla con `no-restricted-imports` en cada variante (en `core/` con el mensaje del patrón de core o el de la lista; en `handlers/` con el mensaje de `clienteGenerado` y el de `pg`); ESLint vuelve a código 0 tras borrar los archivos |
| V-18 | `git status --short --untracked-files=all`; `git check-ignore -v backend/.env backend/src/adapters/db/generated backend/dist backend/tmp`; `git check-ignore backend/prisma.config.ts backend/.env.example; echo $?`; `git diff --quiet -- tsconfig.base.json backend/tsconfig.json backend/vitest.config.ts backend/src/worker.ts backend/src/config backend/src/core backend/src/handlers shared infra AGENTS.md CLAUDE.md docs/ARCHITECTURE.md docs/ARCHITECTURE-ESSENTIALS.md docs/PRD.md; echo $?` | Modificados y nuevos exactamente los de la tabla "Archivos"; `generated/`, `dist`, `.env`, `tmp/` ignorados; `prisma.config.ts` y `.env.example` **no** ignorados (código 1 de `check-ignore`); `0` en el `git diff --quiet` de las rutas que no deben cambiar |
| V-19 | `git ls-files --eol -- package.json package-lock.json backend/package.json backend/prisma/schema.prisma backend/src/adapters/db/cliente.ts backend/src/adapters/db/salud.ts backend/src/adapters/db/index.ts backend/src/adapters/README.md backend/src/app.ts backend/src/server.ts backend/test/setup.ts backend/test/salud-sin-base.integracion.test.ts eslint.config.mjs .prettierignore .gitignore backend/.env.example README.md`; `git ls-files --eol --others --exclude-standard` | Todo `w/lf` (incluido `package-lock.json`) |
| V-20 | **Informativa** (para el encargo de despliegue; no bloquea). Crear `backend/tmp/prisma.config.sin-env.ts` (carpeta ignorada por git) con el mismo contenido que `prisma.config.ts` **sin** el bloque `loadEnvFile` y con `schema: "../prisma/schema.prisma"`, `migrations: { path: "../prisma/migrations" }`. Desde `backend/`: `env -u DATABASE_URL npx prisma generate --config tmp/prisma.config.sin-env.ts; echo "codigo=$?"`; `env -u DATABASE_URL npx prisma migrate status --config tmp/prisma.config.sin-env.ts; echo "codigo=$?"`; borrar `tmp/prisma.config.sin-env.ts` | Reportar ambos códigos y mensajes (sin valores): si `generate` funciona sin `DATABASE_URL`, el Dockerfile podrá generar sin secretos; si no, el encargo de despliegue lo sabe. `migrate status` debe fallar con un mensaje claro de variable ausente **[verificar texto para el README §8]**. Si `--config` no existiera en 7.10.0, omitir V-20 y reportarlo |
| V-21 | Comandos del README §3, §4 (`npx prisma generate` solamente; **no** `migrate dev`), §5, §6 y §7 ejecutados en `powershell.exe -NoProfile` tal cual, salvo los interactivos | Cada uno con su salida; los no ejecutados declarados (Ctrl+C, `migrate dev`) |

Al terminar: procesos de Node detenidos (`Get-NetTCPConnection -LocalPort 3000 -State Listen` vacío); infra como estaba; `backend/.env` intacto y no versionado; archivos temporales borrados; sin commit.

## Pasos de implementación
1. V-01. Si Node no es 24.x o el árbol no está limpio, detenerse y reportar.
2. V-02. Sin las salidas de `npm view` registradas no se edita ningún archivo. Parada según P-04 / R-14 si aplica.
3. Editar `package.json` (raíz) y `backend/package.json` (dependencias, `prelint`). V-03 (`npm install`). Si falla por pares o por la descarga del motor, detenerse y reportar.
4. V-04: confirmar la API instalada (puntos [verificar]), crear `backend/prisma.config.ts`, editar `backend/prisma/schema.prisma`, `npx prisma validate`, `npx prisma format --check`.
5. Editar `.gitignore`, `.prettierignore`, `eslint.config.mjs`. V-05 (`prisma generate`): anotar nombre de entrada y preámbulo.
6. Editar `backend/src/adapters/db/cliente.ts`, `salud.ts`, `index.ts`, `backend/src/adapters/README.md`, `backend/src/app.ts`, `backend/src/server.ts`.
7. Editar `backend/test/setup.ts`, `backend/test/salud-sin-base.integracion.test.ts`; crear `backend/test/db-cliente.test.ts` (P-03).
8. V-08 (`typecheck`). Si falla dentro de `generated/**`, detenerse y reportar (no seguir con los pasos siguientes hasta la decisión).
9. V-09 (Prettier acotado y `npm run lint`). Si ESLint 10 marca algo distinto de lo previsto, DEC-07.
10. V-06, V-07 (migración intacta y base sin cambios).
11. V-10 (`npm test`), V-11 (`build`).
12. V-12, V-13, V-14 (decide DEC-05), V-15.
13. V-16, V-17 (capas).
14. Editar `backend/.env.example` y `README.md` (solo las frases indicadas). V-21.
15. V-20 (informativa).
16. V-18, V-19.
17. Entregar `docs/trabajo/BACK-02-prisma-7/resumen-programador.md` con el formato del Programador más: salidas de V-02 (primera sección); tabla de versiones finales (paquete, rango, instalada, comando); lista de los puntos **[verificar]** con lo encontrado en cada uno (firma de `PrismaPg`, campos de `PrismaConfig`, nombre del archivo de entrada, preámbulo `@ts-nocheck`, texto de "Loaded Prisma config", contenido de `@prisma/engines`, `--config`, mensaje de variable ausente); decisión DEC-05 con la salida de V-14; resultado de V-01 a V-21 uno por uno; desviaciones; conteo de `npm audit`; lo que no se pudo verificar; y la lista literal de archivos creados/modificados.

## Propuesta para AGENTS.md (opcional; **la aplica el orquestador con autorización del humano**, no el programador)
Regla 1 ("Capas"), una línea: `Solo adapters/ importa @prisma/client, @prisma/adapter-pg, pg, el cliente generado por Prisma (adapters/db/generated/), pg-boss, minio, resend, argon2, jose o livekit-server-sdk.` Ningún comando de la sección "Comandos" cambia (`npx prisma migrate dev`, `npx prisma generate`, `npm run lint / test / build` siguen igual y desde las mismas carpetas).

## Notas para DOCS-01 y el encargo de despliegue (no se aplican aquí)
1. `ARCHITECTURE.md` sección 18 "Despliegue", paso 3 (`npx prisma migrate deploy` en el Droplet): con Prisma 7 la imagen (o un contenedor de migración) debe incluir `backend/prisma.config.ts`, `backend/prisma/schema.prisma`, `backend/prisma/migrations/` y el CLI `prisma` (hoy devDependency), y `DATABASE_URL` debe venir del entorno (el config solo carga `.env` si existe). El resultado de V-20 dice si `prisma generate` en la etapa de build necesita o no una `DATABASE_URL` de relleno.
2. `ARCHITECTURE-ESSENTIALS.md` "Capas del backend" y `AGENTS.md` regla 1: ampliar la lista de librerías (C-01).
3. Afinar la regla de ESLint a `adapters/db/**` cuando exista un segundo adaptador (DEC-10).
4. Pendientes 1–6 de INFRA-01 y BACK-01 siguen vigentes (Testcontainers, comentario cruzado en `infra/.env.example`).
