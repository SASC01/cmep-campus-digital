# Revisión del Manager — BACK-01: esqueleto del backend — final

Veredicto: APROBADO
Verificación propia: lint ok (shared y backend: ESLint, Prettier, `tsc --noEmit`) · test 5 archivos, 21 pruebas, 0 fallan · build ok · `prisma validate` ok · `migrate status` "up to date" (1 migración)

Fecha: 2026-09-21. Carril sensible. Flujo abreviado autorizado (sin tester, sin revisión de plan). Sin commit.

**Condición de este veredicto (no es cambio de código).** El plan exige que, si hubo retorno a Prisma 6, el resumen incluya la salida del `npm view` que falló **y** el orquestador confirme que avisó al humano; si falta una de las dos, el Manager lo marca bloqueante. La primera está; la segunda no consta en lo que recibí. Como el aviso se produce precisamente al transmitir esta revisión, y un hallazgo "bloqueante" no generaría ningún cambio de código, lo trato como condición: el veredicto vale solo si el orquestador transmite al humano, antes de que decida el commit, la primera línea del resumen del programador y la sección "Para el humano" de este documento.

## Resumen en tres líneas

- Se implementó la variante Prisma 6 del plan (camino de retorno de la Enmienda 1) porque la verificación con `npm view` falló; lo reproduje contra el registro y la salida reportada es exacta.
- Está todo lo planeado y solo lo planeado; las cinco desviaciones son mínimas, declaradas y justificadas (una corrige un error del plan: la bandera `--env-file-if-missing` no existe en Node).
- El incidente de Prettier no dejó rastro en archivos rastreados (verificado); su causa raíz sigue en el repositorio (M-01) y conviene cerrarla en este mismo commit con autorización del humano.

## Problemas que bloquean

Ninguno.

## Problemas que no bloquean

### M-01 — El script `format` de la raíz reescribe documentos protegidos (causa del incidente)

Dónde: `package.json` raíz (`format: prettier --write .`, `format:check: prettier --check .`) y `.prettierignore` (5 líneas, tal como lo fijó el plan).
Por qué importa: `npx prettier --check .` desde la raíz (ejecutado por mí, solo lectura) marca 18 archivos: `.claude/agents/*.md`, `AGENTS.md`, `CLAUDE.md`, `docs/ARCHITECTURE*.md`, `docs/PRD.md`, `docs/trabajo/**`, `infra/docker-compose.yml`, `README.md`. Cualquier `npm run format` desde la raíz vuelve a producir el incidente, y `npm run format:check` falla hoy, así que el script no sirve como está. El programador lo hizo como decía el plan; el defecto es del plan.
Qué se espera: que ningún comando del repositorio pueda reformatear `docs/`, `.claude/`, `infra/` ni los `.md` de la raíz. La opción con menos piezas es ampliar `.prettierignore` (`docs/`, `.claude/`, `infra/`, `/*.md`), que protege también a quien ejecute `npx prettier --write .` a mano; la alternativa es acotar los dos scripts a `shared backend eslint.config.mjs`. Es cambio de un archivo fijado por el plan: lo decide el humano ("Para el humano" 3). Recomiendo incluirlo en este commit.

### M-02 — `requestIdLogLabel` está deprecado en Fastify 5.12.5 (`FSTDEP024`)

Dónde: `backend/src/app.ts:11` (`Fastify({ ..., requestIdLogLabel: "requestId" })`), opción literal del plan.
Por qué importa: verificado por mí: cada arranque de la API y cada corrida de pruebas imprime en stderr `[FSTDEP024] FastifyDeprecation: requestIdLogLabel option is deprecated. Use the logController option with requestIdLogLabel instead. The requestIdLogLabel top-level option will be removed in fastify@6`. Funciona (el log lleva `requestId`), pero ensucia stderr y dejará de funcionar en Fastify 6.
Qué se espera: sustituir la opción por `logController` (clase `LogController` exportada por `fastify`; API en `node_modules/fastify/docs/Reference/Server.md` § `logController`) conservando `requestId` en el log. Cabe en el siguiente encargo de backend; si el humano lo quiere ahora, es un cambio acotado a `app.ts` más una aserción sobre la etiqueta.

### M-03 — Versiones mayores disponibles por encima del plan (R-01)

Dónde: `package.json` raíz y `backend/package.json`.
Por qué importa: el programador instaló los rangos del plan y no saltó ninguna mayor: correcto. Pero las últimas 9.x de ESLint (9.39.3 a 9.39.5) están marcadas en npm como "no longer supported" (`dist-tags`: `latest 10.11.0`, `maintenance 9.39.5`); `typescript-eslint` 8.70.1 admite `eslint ^10` y `eslint-config-prettier` admite `>=7`, así que el salto es viable. TypeScript se queda en 5 (`typescript-eslint` exige `<6.1.0`); `@types/node` 24 por Node 24; vitest 4, globals 16 y fastify-plugin 5 son válidos.
Qué se espera: decisión del humano sobre `eslint`/`@eslint/js` `^10` (una línea cada uno, `npm install` autorizado, volver a correr `lint`). Lo demás se queda. No bloquea: es herramienta de desarrollo, sin efecto en runtime.

### M-04 — `npm audit`: 3 altas transitivas, sin corrección razonable disponible

Dónde: `prisma@6.19.3` → `@prisma/config@6.19.3` → `deepmerge-ts@7.1.5` (GHSA-ggr8-5vv4-36mx).
Por qué importa: verificado por mí con `npm ls`: la cadena vive solo bajo `prisma` (CLI, devDependency); `@prisma/client` no depende de `@prisma/config`, así que no llega al runtime de la API ni del worker. El rango afectado (`6.13.0-dev.1 – 8.1.0-dev.4`) incluye a 7.10.0: pasar a Prisma 7 no lo resuelve. La "corrección" de npm degradaría a `prisma@6.12.0`.
Qué se espera: aceptar y anotar; no ejecutar `npm audit fix`. Revisar cuando Prisma publique una versión con `deepmerge-ts >= 8`.

## Detalles menores

- Propuesta de `AGENTS.md`, punto 3: `cp .env.example .env` funciona en PowerShell (alias de `Copy-Item`) pero sobrescribe un `.env` existente; el bloque de infra del mismo archivo usa la forma protegida `if (-not (Test-Path .env)) { Copy-Item .env.example .env }`. Sugiero al orquestador la misma forma por coherencia; si el humano prefiere el texto literal, el comentario "solo la primera vez" lo mitiga.
- Las pruebas de integración imprimen los logs JSON de cada petición (nivel `info`) en la salida de Vitest: ruido, no error. El `enum` de `LOG_LEVEL` no admite `silent`; se puede resolver más adelante con un logger silencioso solo en pruebas.
- El plan cita en cinco lugares (DEC-03, DEC-04, R-07, tabla de scripts, V-11) la bandera `--env-file-if-missing`, que no existe; la real y usada es `--env-file-if-exists`. El plan es registro histórico y no se edita; queda constancia aquí y en el resumen para que los próximos planes usen el nombre correcto.
- `verificarConexion` tipa el logger de forma estructural para no importar `pino` en la firma: bien, evita acoplar el adaptador sin necesidad.
- `handlers/errores.ts` registra el `err` completo (con pila) en el log del servidor para los 500 y responde sin detalles: es lo correcto; lo anoto para que nadie lo lea como fuga.

## Diff contra el plan (variante Prisma 6)

| Verificación | Resultado |
|---|---|
| Rastreados modificados | Solo `.gitignore` (+2: `*.tsbuildinfo`, `.eslintcache`), `README.md` (+103, 0 borradas, sección nueva al final) y ` D` en los tres `.gitkeep` |
| Rutas protegidas | `git diff --quiet` sobre `.claude/`, `AGENTS.md`, `CLAUDE.md`, `docs/ARCHITECTURE*.md`, `docs/PRD.md`, `infra/`, `docs/trabajo/INFRA-01-entorno-dev/`: sin diff |
| Nuevos | 47 no rastreados (44 del plan + `plan.md`, `aprobacion.md`, `resumen-programador.md`), todos `w/lf`; `README.md` y `.gitignore` `i/lf w/lf` |
| Archivos del plan | Todos presentes; los exclusivos de la Enmienda 1 (`prisma.config.ts`, `generated/`) ausentes, como corresponde al retorno |
| Alcance de más | Ninguno: sin código en `middleware/`, sin modelos, sin CORS/helmet, sin Testcontainers, sin pg-boss, sin Dockerfile; `frontend/` solo `package.json` |
| Dependencias directas (lock) | Exactamente las de la tabla del plan; sin `dotenv`, `pino-pretty`, `@types/pg`, `express`, `@prisma/adapter-pg`, `pg`; nada de AWS |
| `plan.md` / `aprobacion.md` reconstruidos | 442 / 33 líneas; Enmienda 1 completa con sus referencias cruzadas (DEC-01/DEC-01a, DEC-07, R-06/R-10, V-02 a V-16, pasos 2/5/6/10); tablas sin alinear y `prettier --check` los marca como no formateados, coherente con una reconstrucción del original y no con la salida de Prettier. La identidad de `aprobacion.md` con el original la comprobó el orquestador; yo no tengo el original |

## Puntos de revisión del plan para el Manager

| Punto | Resultado |
|---|---|
| Versión instalada acorde a la decisión | `npm ls`: `@prisma/client@6.19.3`, `prisma@6.19.3`; `@prisma/adapter-pg` y `pg` ausentes. Coincide con el retorno a 6 |
| Evidencia del retorno | El resumen incluye la salida de las cinco comprobaciones. Reproducido por mí: `prisma` `latest: 8.0.0-rc.15`, `prev: 7.10.0`; `@prisma/client` `latest: 7.10.0`; `@prisma/adapter-pg` `latest: 7.10.0` sin `peerDependencies` (`pg ^8.16.3` como dependencia normal). Fallan la 1, la cláusula "misma versión" de la 2 y la 4a, tal como se reportó. Aviso al humano: pendiente del orquestador (condición arriba) |
| Prisma solo en `adapters/db` | `grep` → `backend/src/adapters/db/cliente.ts` (importación) y `adapters/README.md` (texto). ESLint `--print-config`: `no-restricted-imports` activo en `core/`, `handlers/`, `config/` y ausente en `adapters/db/cliente.ts`; el patrón de `core/` (adapters/handlers/middleware/fastify/pino) presente. D2 funciona |
| Una migración, SQL exacto | `20260922015711_extensiones_iniciales/migration.sql`: las 5 líneas del plan, LF, sin BOM (`cat -A`). `migrate status`: "1 migration found … Database schema is up to date!". `_prisma_migrations`: 1 fila, `aplicada = t`. `pg_extension`: `pg_trgm`, `plpgsql`, `unaccent`. Sin bases `prisma_migrate_shadow*` |
| `schema.prisma` | `prisma-client-js`, `url = env("DATABASE_URL")`, sin modelos ni `previewFeatures` (variante original); `prisma format --check` ok |
| Paquetes prohibidos | Ninguno en los tres `package.json` ni en las dependencias directas del lock |
| 500 sin pila ni mensaje; 404/503 con formato | Cubierto por la prueba de integración y leído en el handler: `ERROR_INTERNO` con mensaje fijo, `err` solo al log |
| Logger sin `authorization`/`cookie` | API arrancada por mí con `LOG_LEVEL=info`; petición con `Authorization: Bearer secreto-manager` y `Cookie: galleta=valor-manager` → 0 ocurrencias en el log. Fastify no serializa cabeceras; `redact` queda como defensa. Línea real: `{"level":30,...,"requestId":"req-1","req":{"method":"GET","url":"/api/salud","host":"127.0.0.1:3000",...},"msg":"incoming request"}` |
| Configuración inválida sin valores | `env -u DATABASE_URL node dist/server.js` → "Configuración inválida. Revisa backend/.env …" / "- DATABASE_URL: obligatoria", código 1, sin valores. Confirma además que la importación diferida (D4) cumple su fin |
| `.env` y `.env.example` | `backend/.env` ignorado (`.gitignore:4`); `.env.example` no ignorado, 5 variables, 4 comentarios obligatorios, `DATABASE_URL` idéntica a `infra/.env.example` |
| Puntos de la Enmienda 1 (`generated/`, `prisma.config.ts`) | No aplican (retorno) |
| `frontend/` | Solo `package.json`, contenido literal del plan |
| LF | 47/47 `w/lf`, incluido `package-lock.json` |
| Versiones respaldadas por `npm view` | Tabla completa en el resumen |
| API en vivo | `GET /api/salud` → 200 `{"estado":"ok","baseDeDatos":"ok","marcaDeTiempo":"2026-09-22T02:22:40.661Z"}`; `GET /api/no-existe` → 404 `{"error":{"codigo":"NO_ENCONTRADO","mensaje":"La ruta no existe."}}`; worker → `"evento":"worker_listo"`; `seed:admin` → mensaje "Pendiente…" y código 1 |

## Definición de terminado (`AGENTS.md`)

| Punto | Estado |
|---|---|
| Cumple el `RF-xx`/`RN-xx` | No aplica (andamiaje). Cumple el plan aprobado en su variante Prisma 6 |
| Respeta capas y pasa por middleware | Capas: sí (grep y ESLint). Middleware: no aplica; `GET /api/salud` es pública por diseño (plan y ESSENTIALS › Operación) y no expone datos |
| `lint`, `build`, `test` en verde | Sí, ejecutados por mí desde la raíz: lint 0, build 0, test 5/5 archivos, 21/21 pruebas |
| Pruebas de autorización si hay endpoint nuevo | No aplica: ruta pública sin datos de usuario ni estado de pago; queda registrado que es la única exenta junto con las "sin JWT" de ESSENTIALS |
| Migración incluida y compatible hacia atrás | Sí; solo `CREATE EXTENSION IF NOT EXISTS`; reversible sin acción |
| `infra/` y `.env.example` actualizados | `infra/` sin cambios (correcto); `backend/.env.example` nuevo. Comentario cruzado en `infra/.env.example` pendiente de DOCS-01 (6) |
| Documentos actualizados | `README.md` sí. `AGENTS.md`: tres cambios pendientes del orquestador (texto vigente, ver abajo). Resto en DOCS-01 |

## Reglas que no se rompen

- **1 Capas:** solo `adapters/db/cliente.ts` importa `@prisma/client`; `core/` importa solo `@campus/shared` y sus propios archivos; `config/` (zod, tipos de pino) no es `core/` ni `adapters/`, como fijó DEC-03.
- **9 Secretos:** `.env.example` sin valores reales (contraseña de desarrollo, la misma de `infra/.env.example`); `backend/.env` ignorado; no leí ni imprimí ningún `.env`.
- **10 Esquema solo por migraciones:** una migración; sin `db push`; `_prisma_migrations` presente.
- **11 Proveedores:** ninguna dependencia de AWS ni de proveedores no aprobados.
- **13 Nada sensible en logs:** cabeceras ausentes del log; `verificarConexion` registra solo `nombre` y `codigo` del error de Prisma; mensajes de configuración sin valores.

Las reglas 2 a 8 y 12 no aplican todavía (sin endpoints con datos, sin colas, archivos ni avisos).

## Estilo (`CLAUDE.md`)

TypeScript estricto sin `any` (grep vacío); retornos tempranos en todo el código; `AppError` en `core/` con `codigo` y `estado`; un solo envoltorio de errores (`handlers/errores.ts`, `fastify-plugin`, `name: "manejo-de-errores"`); `handlers/salud.ts` sin `try/catch`; el único `try/catch` de producción está en `adapters/db/salud.ts` (traduce el fallo del proveedor); dominio en español y técnica en inglés (`verificarConexion`, `construirApp`, `saludHandler`); valores por defecto explícitos y documentados en el plan (env); comentarios que explican el porqué. Sin cambios en `frontend/`: la lista de diseño no aplica.

## Desacuerdos arbitrados

1. **Retorno a Prisma 6.** El plan decía "si cualquiera falla … vuelve a Prisma 6 tal como estaba en el plan original". Fallaron tres comprobaciones y el programador aplicó el camino de retorno completo, sin mezclar piezas de la Enmienda 1. **Correcto según el plan.** Matiz para el humano: la comprobación 1 falló por un estado anómalo del registro (`prisma` `latest` apunta a una RC de 8 mientras `@prisma/client` y `@prisma/adapter-pg` apuntan a 7.10.0); 7.10.0 es hoy la última versión estable de los tres paquetes. El espíritu de la condición del humano ("que la 7 es la línea estable") podría considerarse cumplido aunque la letra no. Lo decide el humano ("Para el humano" 2).
2. **Incidente de Prettier y `git restore`.** Error de alcance (formatear desde la raíz con un `.prettierignore` que el plan dejó corto). Verifiqué que no queda efecto: rutas protegidas sin diff, `README.md` solo con adiciones, `plan.md` y `aprobacion.md` coherentes. `git restore` está fuera de la lista de git de solo lectura; lo estrictamente previsto era detenerse y reportar antes de escribir. Como se usó únicamente para deshacer su propio cambio, el resultado se verificó y el programador lo declaró de inmediato y sin rodeos, **no es bloqueante**. La lección va a la causa raíz (M-01) y a una regla explícita si el humano la quiere ("Para el humano" 5).
3. **Lectura de R-01 ("se detiene y reporta").** El programador instaló los rangos del plan y reportó las mayores nuevas sin detenerse. **Aceptable:** el plan autorizaba exactamente esos rangos; detenerse solo habría aplazado la misma decisión sin información nueva, y nada fuera del plan entró. Para los próximos planes, R-01 debe decir sin ambigüedad "instala el rango del plan y repórtalo" o "detente".
4. **Desviaciones D1 a D5.** D1 (`--env-file-if-exists`): corrige un error del plan; misma semántica que DEC-03; correcta. D2 (`basePath` en ESLint): necesaria para que los patrones del plan funcionen con `--config ../…`; verificada por mí con `--print-config` en cuatro archivos. D3 (`--ignore-path`): necesaria para que `prettier --check .` en un workspace no revise `dist/`. D4 (importación diferida en `server.ts`): necesaria para que V-12 pueda fallar; la comprobé. D5 (orden de pasos): sin efecto en el contenido. Ninguna exigía detenerse; todas están declaradas.

## Documentos a actualizar

**Ya anotado para DOCS-01** (no se repite aquí): pendientes 1 a 4 de INFRA-01 y 5 a 6 de BACK-01 (Testcontainers frente al PostgreSQL de infra en `AGENTS.md` "Pruebas", ESSENTIALS y `ARCHITECTURE.md` §2; comentario cruzado de `DATABASE_URL` en `infra/.env.example`).

**`AGENTS.md` (lo aplica el orquestador, autorizado por el humano):** el texto literal del plan y del resumen sigue siendo correcto tras la implementación: `npm install` en la raíz; `npm run lint / test / build` existen; `npm run test` corre unitarias de `core/` y `config/` e integración contra el PostgreSQL de infra; ningún script cambió de nombre. Único matiz: el punto 3 (`cp`), ver "Detalles menores".

**Nuevo, derivado de esta implementación:**

- Si el humano mantiene Prisma 6: nada más en `docs/` (ESSENTIALS no fija versión); el registro queda en `docs/trabajo/BACK-01`. Si reabre Prisma 7: Enmienda 2 al plan con la comprobación 1 reformulada (`@prisma/client` `latest` = `7.x` estable en lugar de `prisma dist-tags.latest`) y la 4a aceptando `pg` como dependencia normal; y la nota de `ARCHITECTURE.md` §6 sobre empaquetar `prisma.config.ts` en la imagen.
- `.prettierignore` o scripts de formato (M-01): si se cambia, `README.md` no necesita ajuste y `AGENTS.md` no menciona `format`.
- `docs/trabajo/BACK-01/plan.md` no se edita (registro histórico); esta revisión y el resumen dejan constancia de `--env-file-if-exists` y de `FSTDEP024`.

## Para el humano

1. **Retorno a Prisma 6 (aviso que exige el plan).** Se implementó Prisma 6.19.3 porque la verificación de la Enmienda 1 falló. Salida real, reproducida por mí: `npm view prisma dist-tags` → `latest: 8.0.0-rc.15`, `prev: 7.10.0`; `npm view @prisma/client dist-tags` → `latest: 7.10.0`; `@prisma/adapter-pg` sin `peerDependencies` (`pg` viene como dependencia normal).
2. **¿Reabrir Prisma 7 (7.10.0) ahora o quedarse en 6.19.3?** Datos: 7.10.0 es la última estable de los tres paquetes (2026-08-25); 8 solo existe como RC (desde septiembre de 2026); 6.19.3 es la última 6.x y salió el 2026-04-01 (sin novedades en casi seis meses). Costo de pasar a 7 después: `adapters/db/cliente.ts`, `schema.prisma`, `prisma.config.ts` nuevo, tres líneas de ignorados (`.gitignore`, `.prettierignore`, `eslint.config.mjs`), quitar la importación diferida de `server.ts`, y `npm install`; acotado por la regla de capas. Costo de hacerlo ahora: Enmienda 2 con los puntos [verificar] confirmados contra el paquete (R-10) y una ronda programador → manager. `npm audit` no cambia con 7 (M-04). Mi recomendación: aprobar este commit con Prisma 6 tal como está (plan cumplido, todo verificado) y abrir Prisma 7 como encargo propio antes de que existan modelos, mientras el cambio siga siendo barato.
3. **Remedio del incidente de Prettier (M-01).** Autorizar, antes del commit, que el programador amplíe `.prettierignore` con `docs/`, `.claude/`, `infra/` y `/*.md` (o acote los scripts `format`/`format:check` de la raíz a `shared backend eslint.config.mjs`). Un archivo y una verificación: `npx prettier --check .` desde la raíz debe quedar en verde. Sin esto, `npm run format` desde la raíz reformatea los documentos protegidos.
4. **Versiones mayores (M-03).** Las últimas 9.x de ESLint aparecen "no longer supported" en npm; `eslint`/`@eslint/js` `^10` es viable con las dependencias actuales. Decidir si se cambia ahora (una línea cada uno, `npm install` autorizado, `lint`) o en un `chore/` posterior. TypeScript, `@types/node`, vitest, globals y fastify-plugin se quedan como están.
5. **Regla de proceso (opcional).** Añadir a `AGENTS.md` o a `.claude/agents/programador.md`: "Formateadores y `--fix` solo acotados al workspace que se está editando; nunca `prettier --write .` ni `eslint --fix .` desde la raíz; ante un cambio accidental fuera del alcance, detenerse y reportar antes de revertir". Evita repetir el incidente sin depender de `.prettierignore`.
6. **`FSTDEP024` (M-02) y `npm audit` (M-04).** El primero se corrige en el siguiente encargo de backend salvo que lo quieras ahora; el segundo se acepta y se anota.
7. **Commit.** `main` está protegido por `AGENTS.md`: rama `chore/back-01-esqueleto-backend` (o similar) y commit convencional, por ejemplo `chore(backend): esqueleto del backend, shared y monorepo npm`. Al revisar el diff, atención a `backend/.env.example` (sin secretos), la migración (5 líneas) y `package-lock.json` (LF). `backend/.env`, `node_modules/`, `dist/` y `backend/tmp/` no entran (verificado con `git check-ignore`).

## Estado del entorno al terminar

API y worker arrancados por mí y detenidos (`taskkill //T //F`); puerto 3000 libre; infra levantado como estaba (`postgres`, `minio`, `livekit` healthy); logs de mi verificación en el scratchpad de la sesión, fuera del repositorio; `git status` idéntico al previo a la revisión (52 entradas). Sin `git add`, `commit`, `restore`, `npm install` ni escritura fuera de este archivo.
