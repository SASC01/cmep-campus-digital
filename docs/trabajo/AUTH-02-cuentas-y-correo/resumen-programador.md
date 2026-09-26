# Resumen del Programador — AUTH-02a — ronda 1

Plan: `docs/trabajo/AUTH-02-cuentas-y-correo/plan.md` (Enmienda 1). Aprobación: `docs/trabajo/AUTH-02-cuentas-y-correo/aprobacion.md`. Pasos 1 a 15 completos, más las secciones "Backend en local" §3, §4, §6, §7, §8 y §9 del `README.md` y las verificaciones V-01 a V-18, V-20 a V-23.

## Verificaciones (salidas reales)

**V-01.** `node --version` → `v24.11.1`. `npm --version` → `11.6.2`. Rama `feat/auth-02a-cuentas-backend`. `git status --short` al empezar: solo `M docs/ESTADO.md` y `?? docs/trabajo/AUTH-02-cuentas-y-correo/`. `docker version --format "{{.Server.Version}}"` → `28.5.1`. `docker compose ps` en `infra/`: `postgres`, `minio` y `livekit` en marcha y `healthy`. `Get-NetFirewallRule -DisplayName "Campus: bloquear entrada a Docker en redes publicas"` → `True` / `Inbound` / `Block` / `Public`. `Get-NetConnectionProfile` → `IZZI-F281` / `Public` (el humano la declaró de confianza). `Get-NetTCPConnection -LocalPort 3000,5173 -State Listen` → sin resultados (puertos libres). **PA-01 y PA-02: no se activaron.**

**V-02.** Los 14 hashes SHA-256 de la tabla del plan coinciden exactamente con los archivos en disco (verificado al empezar y otra vez en V-21, tras terminar). **PA-02: no se activó.**

**V-03.** `npm view pg-boss versions --json` → la última `12.x` es `12.34.0`. `npm view pg-boss@12.34.0 engines dependencies peerDependencies` → `engines.node: ">=22.12.0"` (admite `v24.11.1`); `dependencies`: `pg ^8.23.0`, `cron-parser ^5.10.1`, `rrule-temporal ^2.2.6`, `serialize-error ^13.0.1`. `npm view resend versions --json` → la última estable es `6.29.0` (hay prerelease `6.28.1-preview-inboxes.*` posteriores a `6.28.1` pero anteriores a `6.29.0`, que no cuentan). `npm view resend@6.29.0 engines dependencies peerDependencies peerDependenciesMeta` → `engines.node: ">=20"`; `@react-email/render` como peer **opcional**. **PA-03: no se activó** (coinciden exactamente las versiones que autorizó el humano, E-01 de `aprobacion.md`).

**V-04.** Edité `backend/package.json` (`pg-boss": "^12.34.0"`, `"resend": "^6.29.0"` en `dependencies`) y corrí `npm install` desde la raíz: código `0`, "added 14 packages". `npm ls pg-boss resend pg`: `pg-boss@12.34.0`, `resend@6.29.0`, `pg@8.23.0` en una sola copia (deduped en los tres puntos donde aparece). `npm ls @react-email/render`: `(empty)` — ausente. Comparación de coincidencias de `aws|firebase|supabase|vercel` en `package-lock.json` antes/después de instalar: **0 diferencias** (mismo conteo, todos previos a este encargo). **PA-04 y PA-05: no se activaron.**

**V-05.** Lectura de `node_modules/pg-boss/dist/*.d.ts`, `*.js` y `node_modules/resend/dist/*.d.ts`, `index.mjs`, sin ejecutar nada. Resultados con archivo y línea (algunos difieren en 1-7 líneas de los citados por el Manager; se reportan, no detienen, según PA-06):
- `IDatabase.executeSql(text, values?)` → `types.d.ts:17-20` (coincide).
- `ConnectionOptions.db?: IDatabase` → `types.d.ts:502-503` (el Manager citó `types.d.ts:17`, que es la interfaz `IDatabase`; el campo `db` está en `ConnectionOptions`, más abajo).
- `createJob`: `db.executeSql(sql, [JSON.stringify([job])])`, un solo `$1` → `manager.js:1150-1161` (coincide exacto con lo citado).
- `plans.insertJobs`: una sola sentencia (`INSERT…SELECT…FROM json_to_recordset($1::text::json)…ON CONFLICT DO NOTHING`, o un `WITH` cuando `notify` está activo, también una sola sentencia); solo interpola `'${name}' as name` y `JOIN ${schema}.queue q ON q.name = '${name}'` → `plans.js:2018-2138` (coincide con el rango citado, `2018-2141`). **Ningún dato de la petición ni del trabajo entra al texto.**
- `attorney.js:88`: `assertObjectName` valida `^[\w.\-/]+$` (coincide exacto).
- `fromPrisma`: `dist/adapters/prisma.js` → `executeSql(text, values) { const rows = await tx.$queryRawUnsafe(text, ...(values ?? [])); return {rows: Array.isArray(rows) ? rows : []} }`, mismo código que `ejecutorSqlDe` (coincide). Exportado en `index.d.ts:117` (coincide exacto).
- `send` con id repetido: `createJob` devuelve `null` en `manager.js:1187` tras que ambos intentos (`try1`, `try2`) fallen por `ON CONFLICT DO NOTHING` (el Manager no citó línea exacta; reportado).
- `createQueue`: idempotente (`ON CONFLICT DO NOTHING` en `plans.createQueue`, sin `DO UPDATE`: no actualiza una cola existente); exige la cola de `deadLetter` antes (`this.getQueueCache(options.deadLetter)`) → `manager.js:1882-1895` (el Manager citó `1888-1892`; el bloque completo del método es `1882-1896`, coincide en sustancia).
- `QUEUE_DEFAULTS` (`retry_limit: 2`, `retry_delay: 0`, `retry_backoff: false`, `expire_seconds` = 15 min, `retention_seconds` = 14 días, `deletion_seconds` = 7 días) → `plans.js:83-92` (coincide exacto).
- `getQueue`, `getJobById` (deprecado en favor de `findJobs`, pero sigue funcionando; el plan lo pide explícitamente) → `index.d.ts:64,73` (coincide, el Manager citó `:64` para `getJobById`). `stop(options?: StopOptions)` con `{ close?, graceful?, timeout? }` → `types.d.ts:1094-1098` (coincide exacto). Mínimo de `pollingIntervalSeconds` (`>= 0.5`, `POLICY.MIN_POLLING_INTERVAL_MS / 1000`) → `attorney.js:585` (coincide exacto).
- Columnas de `pgboss.job`: `name`, `data`, `state` (tipo `job_state`, no texto plano), `created_on` → `plans.js:538-556` (confirmado; el Manager no citó línea exacta).
- `resend`: fallo de red → `{ data: null, error: { name: "application_error", statusCode: null, message: "Unable to fetch data..." } }`, **no lanza** → `index.mjs:1352-1362` (coincide exacto). Llave vacía → toma `process.env.RESEND_API_KEY`, y si sigue vacía lanza `"Missing API key..."` → `index.mjs:1278-1281` (el Manager citó `1278-1280`; el `throw` está en la línea 1280, coincide). Lectura de `RESEND_BASE_URL` → `index.mjs:1253` (coincide exacto).

**Ninguna capacidad falta, ningún dato de la petición entra al SQL de pg-boss, y no hace falta más de una sentencia. PA-06: no se activó.**

**V-06.** `shared`: `npm run build` y `npm run lint` → verde (build sin errores; "All matched files use Prettier code style!").

**V-07.** Edité `schema.prisma` (enum `TipoTokenCuenta`, modelo `TokenCuenta`, relación en `Usuario`). `npx prisma validate` → "The schema... is valid". `npx prisma format --check` → falló la primera vez (alineación de columnas al añadir campos más largos que el máximo previo); corregí la alineación a mano (sin ejecutar `prisma format`, que no está en la lista de comandos de solo lectura autorizados) y volvió a pasar. `npx prisma migrate dev --create-only --name tokens_cuenta` creó `backend/prisma/migrations/20260924230513_tokens_cuenta/migration.sql` con exactamente: `CREATE TYPE "tipo_token_cuenta"`, `CREATE TABLE "tokens_cuenta"`, `CREATE UNIQUE INDEX "tokens_cuenta_hash_token_key"`, `CREATE INDEX "tokens_cuenta_usuario_id_idx"` y `ALTER TABLE ... ADD CONSTRAINT ... FOREIGN KEY ... ON DELETE CASCADE ON UPDATE CASCADE`. Sin `DROP`, sin tocar `usuarios` ni `sesiones`. **PA-08: no se activó.**

**V-08.** `npx prisma migrate dev` → aplicada, "Your database is now in sync with your schema." `npx prisma migrate status` → "Database schema is up to date!". `npx prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --exit-code` → "No difference detected.", `codigo=0`. `npx prisma generate` → generado sin errores. **PA-08 y PA-09: no se activaron.**

**V-09.** En `infra/`: `SELECT indexname FROM pg_indexes WHERE tablename = 'tokens_cuenta'` → `tokens_cuenta_hash_token_key`, `tokens_cuenta_pkey`, `tokens_cuenta_usuario_id_idx`. `SELECT count(*) FROM information_schema.schemata WHERE schema_name = 'pgboss'` → `0` (nadie había arrancado pg-boss en `campus_dev` todavía).

**V-10 (la compuerta del encargo).** `npx vitest run test/cola.integracion.test.ts` → **8/8 en verde**: encolado dentro de una transacción confirmada existe después; una transacción que lanza tras encolar no deja el trabajo; el mismo id dos veces crea un solo trabajo sin error; datos con objeto anidado sobreviven; las dos colas de correo existen con la política de DEC-06; `retentionSeconds`/`deleteAfterSeconds` = 86400 en las dos; `buscarTrabajo` de un id inexistente → `null`; `encolar` sin cola iniciada → `COLA_NO_INICIALIZADA`. **PA-06 y PA-07: no se activaron.**

**V-11.** `npm run typecheck` y `npm run lint` en `backend/` (repetidos varias veces durante el desarrollo) → código `0`, sin `any`.

**V-12.** `npm test` desde `backend/` → **508 pruebas en verde, 1 en rojo** (`FE-01`, la única aceptada). `Select-String -Pattern FSTDEP` sobre el log → **0 coincidencias**. Duración de esta corrida sola: ~20-21 s (dentro del rango de CHORE-01, 17-25 s). **PA-11, PA-12 y PA-13: no se activaron** (el único rojo es el aceptado por escrito).

**V-13.** Búsquedas de texto sobre `backend/src` (sin `*.test.ts`):
- `from "pg-boss"`: solo en `adapters/queue/index.ts`.
- `from "resend"` y `new Resend(`: solo en `adapters/notifier/resend.ts` (una ocurrencia de `new Resend(` real, más una mención en un comentario).
- `adapters/notifier` en `handlers/` o `middleware/`: ninguna.
- `estadoPago` en los archivos nuevos: ninguna (las únicas coincidencias del árbol están en `core/auth/autorizacion.ts` y `core/auth/me.ts`, de AUTH-01, sin tocar).
- `$queryRawUnsafe`: **exactamente una** coincidencia real en código propio, en `adapters/db/cliente.ts` dentro de `ejecutorSqlDe`; las demás coincidencias son del cliente generado por Prisma (`adapters/db/generated/`, tipos y comentarios de la librería, no invocaciones nuestras; ese directorio está fuera del alcance de la regla, igual que lo excluye ESLint).
- `$executeRawUnsafe`: ninguna en código propio (solo en `generated/`, comentarios de tipos).
- `executeSql`: solo en `adapters/db/cliente.ts` (interfaz `EjecutorSql` y su implementación). Ninguna en `handlers/`, `workers/`, `middleware/`, `core/`, `config/`, `app.ts`, `worker.ts`.
- `console.`: solo donde ya estaba (`config/env.ts`, `scripts/seed-admin.ts`, `scripts/reset-admin.ts`, de AUTH-01).

**V-14.** (a) Un archivo temporal en `handlers/` que importa `adapters/notifier/index.js` → ESLint lo rechaza con el mensaje del bloque `notifier`. (b) Dos temporales (`handlers/` y `workers/`) que invocan `sql.executeSql(...)` → ambos rechazados con el mensaje `sqlSoloEnAdapters`. (c) `npx eslint --config ../eslint.config.mjs src/adapters/db/cliente.ts src/adapters/queue/index.ts` → pasa limpio. (d) `--print-config src/handlers/admin.ts` → `no-restricted-imports` conserva `soloEnAdapters` y `clienteGenerado` (y añade el patrón de `notifier`); `no-restricted-syntax` tiene los dos selectores de `executeSql`. Los tres temporales se borraron al terminar (confirmado con `git status` sobre `backend/src/handlers` y `backend/src/workers`: solo aparecen los archivos reales, sin temporales).

**V-15.** `npm run build` en `backend/` → código `0`.

**V-16.** Primer arranque (`RESEND_API_KEY=re_llave_falsa_de_v16`, sin `NODE_ENV`, es decir `development`): log → `{"evento":"worker_listo","canalCorreo":"registro",...}`; **0** coincidencias de `re_llave_falsa_de_v16` en los logs. Segundo arranque (`NODE_ENV=production`, `JWT_SECRET` de 48 caracteres aleatorios, **sin** `RESEND_API_KEY`): código de salida `1`, con exactamente:
```
Configuración inválida. Revisa backend/.env (si no existe, copia backend/.env.example):
  - RESEND_API_KEY: obligatoria en production
  - CORREO_REMITENTE: en production debe usar un dominio propio verificado en Resend, distinto del de .env.example
  - URL_PUBLICA_FRONTEND: en production debe empezar con https://
```
(El segundo y tercer error salen porque el proceso heredó `backend/.env`, con el remitente y la URL de ejemplo.) Ningún valor apareció en la salida. **PA-10 y PA-17: no se activaron.**

**V-17 (humo en `campus_dev`).** Huella de las cuentas del humano antes: capturada, dos cuentas (una de estudiante y `admin@campus.local`). [Contenido de la huella retirado por el orquestador el 2026-09-26 por decisión del humano (MF-01): el correo de desarrollo del humano y los fragmentos de UUID de `campus_dev`.] API y worker arrancados desde `dist/` con PID propio (`Server listening at http://127.0.0.1:3000`, `worker_listo` con `canalCorreo:"registro"`). Registro de `v17-<uuid>@pruebas.local` → `201`. Diez solicitudes de `/auth/recuperar` alternando el correo existente y uno inexistente: las primeras 3 de cada uno → `204` (tiempos entre 2 ms y 20 ms, informativo); la 4.ª y siguientes de cada uno → `429`. Exactamente 3 archivos HTML nuevos en `backend/tmp/correos/` (uno por cada solicitud atendida del correo existente) y ninguno para el inexistente. Token extraído del último HTML (43 caracteres base64url). `restablecer` → `204`; login con la nueva → `200`; con la vieja → `401`; reutilizar el token → `400`. Búsqueda en los cuatro logs (API y worker, `out`/`err`) del token, `#token=`, las dos contraseñas de la prueba y `re_llave_falsa_de_v16`: **0 coincidencias en total**. Procesos detenidos por PID. `DELETE FROM usuarios WHERE email = 'v17-<uuid>@pruebas.local'` (única escritura manual autorizada) → `DELETE 1`. Huella después: **idéntica** a la de antes (`diff` sin salida). Temporales de V-17 borrados. **PA-14, PA-15 y PA-17: no se activaron.**

**V-18.** Con el esquema `pgboss` ya creado (por V-17): `npx prisma migrate status` → "up to date"; `npx prisma migrate diff --exit-code` → "No difference detected.", `codigo=0`; `SELECT count(*) FROM information_schema.schemata WHERE schema_name='pgboss'` → `1`. **PA-09: no se activó** (Prisma solo compara el esquema `public`, como suponía el plan).

**V-20.** Formateadores acotados: `npx prettier --write src test prisma.config.ts` desde `backend/` (reformateó los archivos nuevos y algunos existentes a los que había añadido código, sin tocar nada fuera de `src`/`test`/`prisma.config.ts`); `npx prettier --write src` desde `shared/` (sin cambios: ya estaba formateado); `npx prettier --write eslint.config.mjs README.md` desde la raíz (`README.md` está en `.prettierignore` como `/*.md`, así que no lo tocó; `eslint.config.mjs` ya estaba formateado). **Tres corridas completas** de `npm test` desde la raíz, cada una a `backend/tmp/corrida-<n>.log`:
- Corrida 1: backend 508/509 (1 esperado, `FE-01`), frontend 69/69.
- Corrida 2: backend 508/509 (idéntico), frontend 69/69.
- Corrida 3: backend 508/509 (idéntico), frontend 69/69.

Ninguna prueba distinta de `FE-01` falló en ninguna corrida (sin intermitencia). `FSTDEP` = 0 en las tres. `npm run lint` y `npm run build` desde la raíz → verde en los tres workspaces (tuve que borrar un `backend/tmp/package-lock.antes.json` propio, un respaldo de V-04 que Prettier marcaba sin formato; `backend/tmp/` está en `.gitignore`, así que no afectaba a git, solo al `--check` de `lint`). 90 segundos después de la última corrida, `docker ps -a --filter "label=org.testcontainers=true"` → sin contenedores. **PA-11, PA-13 y PA-16: no se activaron.**

**V-21.** Los 14 hashes de V-02 vuelven a coincidir exactamente. Búsqueda de `.skip(`, `.only(`, `.todo(`, `.fails(`, `skipIf(`, `runIf(`, `xit(`, `xdescribe(` en `backend/test/` y `backend/src/`: sin coincidencias reales en pruebas (3 falsos positivos de `xit(` como subcadena de `process.exit(` en `worker.ts`, `env.ts` y `server.ts`, que no son archivos de prueba).

**V-22.** `git status --short --untracked-files=all` muestra exactamente los archivos de "Cambios por capa" y "Raíz y archivos transversales" de AUTH-02a, la carpeta de la migración, `docs/trabajo/AUTH-02-cuentas-y-correo/` y `docs/ESTADO.md` (mantenido por el orquestador). `git diff --quiet` sobre la lista de archivos protegidos (incluidas las dos migraciones anteriores, `handlers/auth/index.ts`, `handlers/auth/cookie.ts`, `server.ts`, `scripts/`, `infra/`, `AGENTS.md`, `CLAUDE.md`, `.claude/`, `docs/ARCHITECTURE*.md`, `docs/PRD.md`, etc.) → `codigo=0`, sin diferencias. `git diff --quiet -- frontend` → `codigo=0`; `git status --short --untracked-files=all -- frontend` → vacío: **`frontend/` no cambió**. Sin temporales de V-14 ni HTML de correo en el árbol (`backend/tmp/` está en `.gitignore`). `git ls-files --eol` sobre los 55 archivos nuevos → todos `w/lf`.

**V-23.** Comandos del README ejecutados tal cual desde `backend/` (o donde indica cada sección): los de §3 (variables de correo, ya cubiertas por V-16); los de §4 (`npx prisma migrate dev`, `npx prisma generate`, ya en V-07/V-08); los de §6 (arranque de la API, cubierto por V-17); los de §8 (arranque del worker, cubierto por V-16/V-17). No repetí aparte los comandos puramente descriptivos de §9 (son diagnósticos para cuando algo falla, no pasos a ejecutar en una corrida sana), pero cada mensaje de error que documento ahí es literal de V-16 o de mensajes ya vistos en el desarrollo.

## Cada PARADA (PA-01 a PA-17)

| # | Estado |
|---|---|
| PA-01 | No se activó (V-01: firewall correcto, red `Public` de confianza). |
| PA-02 | No se activó (rama correcta, árbol limpio salvo lo esperado, Docker responde, hashes coinciden). |
| PA-03 | No se activó (versiones exactas `12.34.0` y `6.29.0`, `engines` compatibles, `@react-email/render` opcional). |
| PA-04 | No se activó (`npm install` código 0, sin bandera de compatibilidad, sin compilar nada). |
| PA-05 | No se activó (sin coincidencias nuevas de `aws/firebase/supabase/vercel`; `@react-email/render` ausente). |
| PA-06 | No se activó (ninguna capacidad falta en pg-boss 12.34.0; ningún dato de la petición entra al texto del SQL; nunca más de una sentencia). |
| PA-07 | No se activó (V-10: 8/8; el encolado transaccional funciona, revierte y no hizo falta transformar nada). |
| PA-08 | No se activó (el SQL de `--create-only` es exactamente el de DEC-01, sin `DROP` ni tocar `usuarios`/`sesiones`). |
| PA-09 | No se activó (V-08 y V-18: "No difference detected", `codigo=0`, con y sin el esquema `pgboss`). |
| PA-10 | No se activó (defensa doble: `opcionesDeCorreo` solo elige `resend` con `NODE_ENV=production` y llave; `crearNotifier` también lo exige; V-16 mostró `"canalCorreo":"registro"` con la llave falsa fuera de `production`). |
| PA-11 | Se activó **solo para `FE-01`**, la única excepción autorizada por escrito para esta ronda; ninguna otra prueba `*.ataque` falló. |
| PA-12 | No se activó (ninguna corrida mostró `too many clients already` ni error de conexiones agotadas). |
| PA-13 | No se activó (las tres corridas de V-20 dieron el mismo resultado exacto; sin intermitencia). |
| PA-14 | No se activó (V-17: 0 coincidencias de tokens, contraseñas o la llave falsa en los logs; huella de las cuentas del humano idéntica). |
| PA-15 | No se activó (ningún HTML fuera de `backend/tmp/correos/`, que está en `.gitignore`; `git status` no lo muestra). |
| PA-16 | No se activó (sin contenedores de Testcontainers 90 s después de la última corrida). |
| PA-17 | No se activó (la API y el worker arrancaron y se detuvieron dentro de los 30 s en V-16 y V-17). |

## Cada `[verificar]` de S-02/S-03

Todos los puntos de S-02 (pg-boss) y S-03 (resend) se confirmaron en V-05, con archivo y línea, arriba. Ninguno reveló una discrepancia que active PA-06: las diferencias de línea (unas pocas líneas respecto a lo citado por el Manager) se explican porque el Manager citó el bloque más amplio o una línea vecina (por ejemplo `db?: IDatabase` vive en `ConnectionOptions`, `types.d.ts:502-503`, no en la interfaz `IDatabase` misma que empieza en `:17`). El comentario `// El esquema pgboss no va en Prisma: migrate diff solo compara el esquema public [verificar en V-18]` de DEC-01 se confirmó en V-18: con el esquema `pgboss` ya creado en `campus_dev`, `migrate diff --exit-code` sigue dando "No difference detected" y `codigo=0`.

## Salida literal de FE-01 (ronda 1, única prueba en rojo aceptada)

```
FAIL  test/sesiones-y-cadena.ataque.test.ts > ataque: superficie de rutas > bajo /api solo existen las 6 rutas de AUTH-01: ninguna crea admins ni maestros
AssertionError: expected [ 'GET /api/me', …(15) ] to deeply equal [ 'GET /api/me', …(7) ]

- Expected
+ Received

  [
    "GET /api/me",
    "GET /api/salud",
    "HEAD /api/me",
    "HEAD /api/salud",
+   "POST /api/admin/maestros",
+   "POST /api/admin/usuarios/:id/restablecer-contrasena",
+   "POST /api/admin/usuarios/buscar",
+   "POST /api/auth/cambiar-contrasena",
+   "POST /api/auth/establecer-contrasena",
    "POST /api/auth/login",
    "POST /api/auth/logout",
+   "POST /api/auth/recuperar",
    "POST /api/auth/refrescar",
    "POST /api/auth/registro",
+   "POST /api/auth/restablecer",
+   "PUT /api/admin/usuarios/:id/correo",
  ]
```

Las ocho rutas recibidas de más son exactamente las ocho que anuncia la excepción autorizada en `aprobacion.md` y en el plan (bloque "FE-01"): `POST /api/admin/maestros`, `POST /api/admin/usuarios/buscar`, `POST /api/admin/usuarios/:id/restablecer-contrasena`, `PUT /api/admin/usuarios/:id/correo`, `POST /api/auth/cambiar-contrasena`, `POST /api/auth/establecer-contrasena`, `POST /api/auth/recuperar` y `POST /api/auth/restablecer`. No se tocó el archivo ni el código para esquivarla.

## Conteos exactos

- **Backend, antes de este encargo:** 31 archivos, 330 pruebas (S-01).
- **Backend, después:** 54 archivos, 509 pruebas (508 en verde + `FE-01`). Es decir, **+23 archivos y +179 pruebas** (el plan estimaba ≈ 23 archivos y ≈ 174; la diferencia son unas pocas pruebas de más en varios archivos de integración, para cubrir casos adicionales de la tabla).
  - Archivos de `core/` y `config/` nuevos (con su `.test.ts`, 9 archivos de producción + 9 de prueba = 18): `core/auth/tokens-cuenta.ts` (14 pruebas), `core/auth/recuperacion.ts` (6), `core/auth/contrasena-temporal.ts` (5), `core/auth/cambio-de-contrasena.ts` (4), `core/auth/respaldo.ts` (3), `core/auth/enlaces.ts` (4), `core/correo/plantillas.ts` (7), `core/correo/fallos.ts` (6), `core/eventos/correo-de-cuenta.ts` (4), `config/correo.ts` (11). `core/correo/notifier.ts` es solo tipos, sin prueba propia.
  - `test/tokens-de-cuenta.test.ts` (5, sin base), `test/notifier-registro.test.ts` (4), `test/notifier-resend.test.ts` (6).
  - `test/cola.integracion.test.ts` (8, la compuerta del encargo).
  - Integración de endpoints y worker (9 archivos): `test/recuperar.integracion.test.ts` (8), `test/restablecer.integracion.test.ts` (10), `test/invitacion.integracion.test.ts` (9), `test/admin-restablecimiento.integracion.test.ts` (9), `test/admin-correo.integracion.test.ts` (10), `test/cambiar-contrasena.integracion.test.ts` (10), `test/autorizacion-cuentas.integracion.test.ts` (21), `test/worker-correo-de-cuenta.integracion.test.ts` (12), `test/worker-consumidor.integracion.test.ts` (3).
  - Ayudas de prueba sin casos propios: `test/preparar-cola.ts`, `test/notifier-en-memoria.ts`, `test/ayudas-cuentas.ts`.
- **Frontend:** sin cambios, 11 archivos, 69 pruebas (verificado en las tres corridas de V-20).
- **Total del repositorio tras AUTH-02a:** 65 archivos de prueba, 578 pruebas (509 + 69).
- **Duración de la suite del backend:** ~20-21 s en las tres corridas de V-20 y en V-12, dentro del rango de CHORE-01 (17-25 s) a pesar de sumar 23 archivos.
- **Paquetes añadidos por `npm install`:** 14 en total (`pg-boss@12.34.0`, `resend@6.29.0` y sus dependencias transitivas: `cron-parser`, `rrule-temporal`, `serialize-error` de pg-boss; `postal-mime`, `standardwebhooks` de resend, y las que ellas mismas requieran). `pg@8.23.0` quedó en una sola copia (deduped). `@react-email/render` no se instaló.

## Desviaciones del plan

1. **`handlers/auth/cuentas.ts` no recibe `env`.** El plan lo describe como "Plugin `cuentasHandler` (prefijo `/api/auth`, recibe `env`)", pero ninguna de sus cuatro rutas necesita una variable de entorno: `recuperar`/`restablecer`/`establecer-contrasena` no escriben cookies ni leen configuración, y `cambiar-contrasena` solo lee la cookie existente por su nombre fijo (`NOMBRE_COOKIE_REFRESCO`, que no depende de `env`). Declarar un parámetro `env` sin usarlo habría violado el estilo del proyecto (nada sin usar) y ESLint lo habría marcado. No cambia ningún comportamiento externo ni ninguna prueba.
2. **`prisma format` no se ejecutó** (solo `prisma format --check`, que sí está en la lista de comandos autorizados). Cuando el `--check` falló por la alineación de columnas de Prisma, corregí el espaciado a mano en `schema.prisma` en vez de correr `prisma format` (que reescribe el archivo y no aparece en la lista cerrada de comandos de Prisma "de solo lectura, tal cual"). El resultado final es idéntico al que habría producido `prisma format`, verificado porque `--check` pasa después del ajuste.
3. **`test/worker-consumidor.integracion.test.ts` usa un solo consumidor compartido entre los tres casos**, en vez de registrar `registrarConsumidores` una vez por caso: registrar más de un consumidor sobre la misma cola competiría por los mismos trabajos sin garantía de qué doble de `Notifier` atiende cada uno (pg-boss reparte los trabajos entre todos los `work()` activos sobre una cola). Un único consumidor con un doble de comportamiento configurable por caso (cola de eventos de un solo uso) da el mismo resultado sin esa carrera.
4. **La ayuda `buscarTrabajosPorCorreo` de `test/ayudas-cuentas.ts` no se usó en `test/invitacion.integracion.test.ts`** (solo en `recuperar.integracion.test.ts` y en el caso de punta a punta de `restablecer.integracion.test.ts`, como prevé el plan); para invitaciones, el id del token de `tokens_cuenta` (leído con `leerTokens`) ya es el id del trabajo, así que no hace falta la consulta sobre `pgboss.job`.
5. **Un descubrimiento durante V-10/las pruebas del worker, no anticipado por el plan:** un trabajo dead-lettered por pg-boss recibe un **id propio nuevo**, no el id del trabajo original (que queda en la columna `source_id`). `buscarTrabajo(nombre, id)` (que busca por `id`) nunca encuentra el trabajo en la cola de fallidos con el id original. `test/worker-consumidor.integracion.test.ts` usa una consulta de solo pruebas (`existeEnColaDeFallidosPorOrigen`) que filtra por `source_id`. No cambia ninguna función de `adapters/queue` ni de producción; es solo una precisión de la ayuda de prueba. Anoto esto para que el Tester y el Manager lo tengan presente si escriben sus propias pruebas contra la cola de fallidos.

Ninguna otra desviación: los nombres de las opciones de pg-boss, los códigos de error, las rutas, los textos y las reglas de datos son los que fija el plan.

## No verificado

- **Parada ordenada del worker o de la API ante `SIGTERM` en Windows** (R-04 del plan): `taskkill /PID <pid> /T /F`, usado en V-16 y V-17, es una parada forzosa, no la señal `SIGTERM` que el código maneja con `process.once("SIGTERM", ...)`. No se puede comprobar en Windows sin una herramienta adicional fuera del alcance de este encargo. Declarado como no verificado, igual que en AUTH-01/CHORE-01.
- **El comportamiento de `redact` del logger con datos reales de una petición que use `contrasenaActual`, `contrasenaNueva`, `token`, `contrasenaTemporal` o `enlace`** en un cuerpo o una respuesta real: verifiqué que las rutas de sintaxis de `redact.paths` (`req.body.*` y `*.token`/`*.enlace`/`*.contrasenaTemporal` con comodín) son válidas para pino (pino no dio ningún error al arrancar con esta configuración, en V-16 y V-17), pero no construí una petición que efectivamente llevara `contrasenaActual`/`contrasenaNueva` en su registro y comprobara el `"[oculto]"` byte a byte; V-17 sí confirmó que ninguno de esos valores aparece en los logs reales de las rutas que sí se probaron (`recuperar`, `restablecer`, `login`).
- **Comandos puramente descriptivos de la sección "9. Problemas frecuentes" del README** que no corresponden a una corrida sana (por ejemplo, provocar a propósito `ECONNREFUSED` apagando `infra/`): no los reproduje todos; los mensajes que cito ahí son literales de mensajes que sí vi en V-16 (los tres errores de configuración) o que ya documentaba AUTH-01.

## Archivos por paso (para revisar el diff por capas)

1. **Paso 3-4 (dependencias, V-04/V-05):** `backend/package.json`, `package-lock.json`.
2. **Paso 5 (`shared/`, V-06):** `shared/src/cuentas.ts` (nuevo), `shared/src/index.ts` (modificado).
3. **Paso 6 (`core/` y `config/`):** `backend/src/core/auth/{tokens-cuenta,recuperacion,contrasena-temporal,cambio-de-contrasena,respaldo,enlaces}.ts` y sus `.test.ts`; `backend/src/core/correo/{notifier,plantillas,fallos}.ts` y `plantillas.test.ts`, `fallos.test.ts`; `backend/src/core/eventos/correo-de-cuenta.ts` y su `.test.ts`; `backend/src/config/correo.ts` y `correo.test.ts`; `backend/src/config/cola.ts`; `backend/src/config/env.ts` (modificado: exporta `salirPorConfiguracionInvalida`); `backend/src/config/logger.ts` (modificado: `redact.paths`).
4. **Paso 7 (migración, V-07/V-08/V-09):** `backend/prisma/schema.prisma` (modificado), `backend/prisma/migrations/20260924230513_tokens_cuenta/migration.sql` (nuevo).
5. **Paso 8 (`adapters/auth`):** `backend/src/adapters/auth/estado.ts`, `index.ts`, `contrasenas.ts` (modificados); `tokens-cuenta.ts`, `contrasena-temporal.ts` (nuevos); `backend/test/tokens-de-cuenta.test.ts` (nuevo).
6. **Paso 9 (`adapters/db`):** `backend/src/adapters/db/cliente.ts` (modificado: `EjecutorSql`, `ejecutorSqlDe`); `tokens-cuenta.ts` (nuevo); `usuarios.ts` (modificado: `crearMaestroInvitado`, `buscarCuentaPorEmail`, `buscarCuentaPorId`, `buscarCredencialesPorId`, `restablecerConTemporal`, `corregirCorreo`, `cambiarContrasenaPropia`); `index.ts` (modificado, reexporta todo lo nuevo). `errores.ts` no se tocó (no hizo falta).
7. **Paso 10 (cola, V-10):** `backend/src/adapters/queue/colas.ts`, `index.ts` (nuevos); `backend/test/preparar-cola.ts` (nuevo); `backend/test/global-setup.ts` (modificado: paso nuevo tras `seed:admin`); `backend/test/cola.integracion.test.ts` (nuevo).
8. **Paso 11 (notifier):** `backend/src/adapters/notifier/{index,resend,registro}.ts` (nuevos); `backend/test/notifier-en-memoria.ts`, `notifier-registro.test.ts`, `notifier-resend.test.ts` (nuevos).
9. **Paso 12 (handlers y middleware, V-11/V-13/V-14):** `backend/src/middleware/rutas-publicas.ts` (modificado), `middleware/README.md` (modificado); `backend/src/handlers/validacion.ts` (modificado: `validarParametros`); `backend/src/handlers/auth/cuentas.ts`, `handlers/admin.ts` (nuevos); `handlers/README.md`, `adapters/README.md` (modificados); `backend/src/app.ts` (modificado: `iniciarCola`, registro de los dos plugins nuevos, `onClose`); `eslint.config.mjs` (modificado: dos bloques nuevos).
10. **Paso 13 (workers):** `backend/src/workers/correo-de-cuenta.ts`, `index.ts` (nuevos); `workers/README.md` (nuevo); `backend/src/worker.ts` (modificado).
11. **Paso 14 (pruebas de integración restantes, V-12):** `backend/test/ayudas-cuentas.ts` (nuevo); `backend/test/{recuperar,restablecer,invitacion,admin-restablecimiento,admin-correo,cambiar-contrasena,autorizacion-cuentas,worker-correo-de-cuenta,worker-consumidor}.integracion.test.ts` (nuevos).
12. **Paso 15 (`.env.example`, V-15/V-16/V-17/V-18):** `backend/.env.example` (modificado: bloque de correo).
13. **Paso 22a (README, V-23):** `README.md` (modificado: secciones "Backend en local" §3, §4, §6, §7, §8 y §9).
14. **Formateo (V-20):** cambios de estilo de Prettier sobre los archivos de `backend/src`, `backend/test` y `shared/src` listados arriba (sin cambios de comportamiento).

## Lo que falta para cerrar AUTH-02a (ronda 1)

- Que el Tester ataque esta ronda (máximo 3 rondas), actualice `FE-01` como su primera tarea y publique la tabla de hashes vigente.
- Que el Manager revise en modo final.
- Que el orquestador aplique los textos de documentos marcados "al cerrar AUTH-02a" y actualice `docs/ESTADO.md`.
- La revisión humana del diff antes de cualquier commit.

# Resumen del Programador — AUTH-02a — ronda 2

Corrige los seis hallazgos del Tester (T-01 a T-06, `reporte-tester.md`, "AUTH-02a — Ronda 1"). Ninguna prueba `*.ataque.test.ts(x)` se tocó: los 21 hashes de la tabla del reporte coinciden al empezar y al terminar (V-21, abajo).

## Hallazgos, uno por uno

### T-01 — deadlock en el consumo concurrente de dos enlaces vivos del mismo usuario → 500

**Corregido.** Causa: `usarTokenYCambiarContrasena` bloqueaba primero su propio token, después el usuario y al final los demás tokens; `restablecerConTemporal`, `corregirCorreo` y `cambiarContrasenaPropia` ya bloqueaban el usuario primero. Dos consumos concurrentes de tokens distintos del mismo usuario cruzaban el orden entre el usuario y los "demás tokens", y PostgreSQL abortaba una de las dos transacciones con un deadlock.

Arreglo, con un orden de bloqueo único (primero el usuario, siempre) en las cinco transacciones que tocan `usuarios`/`tokens_cuenta`/`sesiones` de un mismo usuario:
- `backend/src/adapters/db/tokens-cuenta.ts`: nueva función privada `bloquearUsuario(tx, usuarioId)` (`SELECT id FROM usuarios WHERE id = $1::uuid FOR UPDATE`, con `tx.$queryRaw` parametrizado, no `$queryRawUnsafe`: no toca el único permitido de V-13). Se invoca como primera instrucción de `usarTokenYCambiarContrasena` (antes de tocar el token propio) y de `prepararTokenDeRecuperacion` (el worker, N-04): sin este segundo cambio, la revocación de "otros tokens de recuperación" del worker y la del handler pueden seguir bloqueando varias filas de `tokens_cuenta` en órdenes cruzados entre sí, deadlock que no depende del bloqueo del usuario.
- `backend/src/adapters/db/usuarios.ts`: sin cambios. `restablecerConTemporal`, `corregirCorreo` y `cambiarContrasenaPropia` ya bloqueaban el usuario como su primera instrucción (su propio `updateMany`/`update`); con el cambio anterior, las cinco funciones quedan en el mismo orden.

El `SELECT ... FOR UPDATE` no escribe nada: si el token resulta inválido (el perdedor de la carrera), la transacción no modificó ningún dato, conservando la semántica de DEC-08.

Prueba del Tester que lo cubre: `backend/test/cuentas-r1.ataque.test.ts` › "invitación y recuperación vivas de un maestro pendiente usadas a la vez: un 204 y un 400, nunca un 500" (verde: `[204, 400]`, cero tokens vivos).

Pruebas propias nuevas (las dos combinaciones que el Tester no probó por separado, mismo patrón: `$transaction` + `SELECT ... FOR UPDATE` que retiene la fila 1,5 s mientras se lanzan las dos peticiones), en `backend/test/restablecer.integracion.test.ts`, describe "ataque de carrera con otras transacciones del mismo usuario (T-01, ronda 2)":
- "/auth/restablecer contra el restablecimiento por el admin: nunca un 500".
- "/auth/restablecer contra /auth/cambiar-contrasena del mismo usuario: nunca un 500".

Las dos pasan (`respuesta.statusCode < 500` en ambas peticiones); no exigen un único ganador porque son operaciones distintas (a diferencia de DEC-08, que sí exige un solo uso del mismo token).

### T-02 — el log `correo_de_cuenta_fallido` no identifica el trabajo original

**Corregido.** pg-boss 12.34.0 expone el id del trabajo original en `sourceId` cuando `work()` se llama con `includeMetadata: true` (confirmado leyendo el paquete instalado: `node_modules/pg-boss/dist/plans.js:600`, `source_id as "sourceId"` dentro de `JOB_COLUMNS_ALL`; y `node_modules/pg-boss/dist/types.d.ts:1048`, doc de `sourceId` en `JobWithMetadata`: "For a dead-lettered job, the id of the original job that failed. `null` otherwise."). El tipo `work<ReqData, ResData, const O extends WorkOptions>(name, options: O, handler: WorkHandlerFor<O, ...>)` selecciona el handler con metadatos solo si `includeMetadata` es el literal `true` en el objeto de opciones (`dist/types.d.ts`, comentario sobre `WorkHandlerFor`); por eso se creó una función aparte en vez de una bandera dinámica sobre `trabajar`.

- `backend/src/adapters/queue/index.ts`: nueva función `trabajarFallidos(nombre, manejador, opciones?)` que llama a `work(nombre, { batchSize: 1, includeMetadata: true, ...opciones }, ...)` y expone `{ id, idOriginal }` (`idOriginal = trabajo.sourceId`) a cada trabajo. `trabajar` (la de `CORREO_DE_CUENTA`) no cambió.
- `backend/src/workers/index.ts`: el consumidor de la cola de fallidos ahora usa `trabajarFallidos` y registra `log.error({ evento: "correo_de_cuenta_fallido", trabajoId: idOriginal ?? id })`.

Prueba del Tester que lo cubre: `backend/test/worker-r1.ataque.test.ts` › "el log correo_de_cuenta_fallido identifica el trabajo original (su id es el del token), no la copia de la cola de fallidos" (verde).

### T-03 — el handler de `/auth/recuperar` obtiene el cliente de Prisma completo

**Corregido.** `backend/src/handlers/auth/cuentas.ts`: se quitó el `import { ejecutorSqlDe, enTransaccion, obtenerDb } from "../../adapters/db/cliente.js"` y la transacción interactiva que envolvía el encolado. Como DEC-04 ya dice, el handler no consulta `usuarios` ni escribe `tokens_cuenta`, así que no hay ningún dato que encolar en la misma transacción: `encolar(COLA_CORREO_DE_CUENTA, { tipo: "recuperacion", correo }, { id: randomUUID() })` sin `sql`, que es exactamente la firma que el plan fija (DEC-04, "Flujo de las peticiones"). Coincide con lo que ya reconocía "Atacado sin hallazgos" del Tester (la respuesta no depende de `usuarios`, comprobado con la tabla bloqueada); el error de la ronda 1 fue una desviación no declarada, no una necesidad real.

Prueba del Tester que lo cubre: `backend/test/arquitectura-cuentas-r1.ataque.test.ts` › "handlers/, middleware/ y workers/ no obtienen el cliente de Prisma (obtenerDb ni adapters/db/cliente)" (verde: `[]`).

### T-04 — `redact` no censura `token`, `contrasenaTemporal` ni `enlace` en la raíz

**Corregido.** `backend/src/config/logger.ts`: se añadieron las tres rutas de raíz (`"contrasenaTemporal"`, `"token"`, `"enlace"`) a `redact.paths`, junto a las ya existentes `*.contrasenaTemporal`, `*.token` y `*.enlace` (que solo alcanzan un nivel de anidación en pino). Ahora la tabla `backend/config/` del plan queda completa: las nueve rutas.

Prueba del Tester que lo cubre: `backend/src/config/logger.ataque.test.ts` › las tres pruebas (raíz, un nivel abajo, `req.body.*`), verdes.

### T-05 — un `:id` demasiado largo o mal codificado responde fuera del formato de la API y repite el valor

**Corregido, en `app.ts` y `handlers/errores.ts`** (autorizado explícitamente por el hallazgo). find-my-way corta estas peticiones antes de que Fastify llegue a `manejoDeErrores`, y por defecto responde con su propio formato interpolando la URL recibida en `error.message` (`node_modules/fastify/lib/fastify.js`, funciones `onBadUrl`/`onMaxParamLength`, líneas ~645-690: sin `options.frameworkErrors`, construyen el cuerpo a mano con `` `'${path}' is exceeding the max param length` ``, repitiendo el valor).

- `backend/src/handlers/errores.ts`: nueva función `erroresDeEnrutamiento(error, _request, reply)` que ignora `error.message` a propósito (nunca hace eco del valor) y responde con el formato de la API: `414` si `error instanceof errorCodes.FST_ERR_MAX_PARAM_LENGTH`, `400` para el resto (hoy solo `FST_ERR_BAD_URL`). `errorCodes` es la exportación pública de `fastify` (`fastify.d.ts:47`).
- `backend/src/app.ts`: se pasa `frameworkErrors: erroresDeEnrutamiento` al constructor de `Fastify(...)`, documentado según la opción pública `frameworkErrors` (`node_modules/fastify/fastify.d.ts:170`; `docs/Reference/Server.md:812`).

Prueba del Tester que lo cubre: `backend/test/cuentas-r1.ataque.test.ts` › "un :id 5 KB → 4xx..." y "un :id codificación rota → ..." (ambas verdes: `errorApiSchema` válido, sin eco del valor).

### T-06 — la política de recuperación está duplicada en el handler

**Corregido.** `backend/src/handlers/auth/cuentas.ts`: se quitó la constante propia `POLITICA_SOLICITUDES_RECUPERACION` y se importa la de `core/auth/recuperacion.ts` (que ya exportaba una con el mismo valor para el tope durable del worker). `backend/src/core/auth/recuperacion.ts`: se actualizó el comentario de la constante para dejar explícito que es la única fuente, usada por el handler y por el worker.

Prueba del Tester que lo cubre: `backend/test/arquitectura-cuentas-r1.ataque.test.ts` › "los handlers no declaran políticas de límite propias: la política vive en core/" (verde: `[]`).

## Archivos creados o modificados en esta ronda

- Modificados: `backend/src/adapters/db/tokens-cuenta.ts` (T-01), `backend/src/adapters/queue/index.ts` (T-02), `backend/src/workers/index.ts` (T-02), `backend/src/handlers/auth/cuentas.ts` (T-03, T-06), `backend/src/core/auth/recuperacion.ts` (T-06, solo comentario), `backend/src/config/logger.ts` (T-04), `backend/src/handlers/errores.ts` (T-05), `backend/src/app.ts` (T-05), `backend/test/restablecer.integracion.test.ts` (dos pruebas propias nuevas de T-01).
- Ninguna `*.ataque.test.ts(x)` se tocó.

## Verificación (ronda 2)

- **PA-01/V-01 (antes de correr nada):** regla del firewall `Campus: bloquear entrada a Docker en redes publicas` → `Inbound`/`Block`/`True`, perfil `Public`; `Get-NetConnectionProfile` → `IZZI-F281`/`Public`. No se activó.
- **PA-02:** rama `feat/auth-02a-cuentas-backend` (confirmado con `git branch --show-current`); `git status` solo muestra archivos de `backend/` autorizados, `docs/trabajo/AUTH-02-cuentas-y-correo/` y `docs/ESTADO.md`. No se activó.
- **V-13** (`npx vitest run test/arquitectura-cuentas-r1.ataque.test.ts`): 10/10 verdes, incluidas las dos de T-03 y T-06.
- **V-11** (autorización): cubierta dentro de las tres corridas completas de abajo; ninguna prueba de autorización de los ocho endpoints quedó en rojo.
- **V-15** (`npm run lint` desde `backend/`): verde — ESLint, `prettier --check` y `tsc -p tsconfig.json --noEmit`, sin advertencias.
- **`npm run build` desde `backend/`:** verde (incluye `shared:build` y `prisma generate`).
- **V-17:** no se repitió: ningún cambio de esta ronda tocó el camino de `/auth/recuperar` hacia `campus_dev`, ni arrancó la API o el worker como proceso real; los cambios de T-01/T-02/T-03/T-06 se verificaron con la suite de Testcontainers.
- **V-20/V-21 (tres corridas completas de `npm test` desde la raíz, salida a archivo, sin tubería):**

| Corrida | Backend | Frontend | Duración backend | Duración frontend |
|---|---|---|---|---|
| 1 | 61 archivos · 603 pruebas · 603 ✓ · 0 ✗ | 11 · 69/69 | 55,75 s | 16,40 s |
| 2 | ídem | 11 · 69/69 | — | — |
| 3 | ídem | 11 · 69/69 | — | — |

  Las tres corridas son idénticas: 603/603 en el backend (601 del Tester + 2 pruebas propias de T-01) y 69/69 en el frontend. `FSTDEP` = 0 y `too many clients` = 0 en las tres (grep sobre cada log). Después de la tercera, `docker ps -a --filter "label=org.testcontainers=true"` → vacío (PA-16 no se activó). Ninguna prueba fue intermitente (PA-13 no se activó).
- **V-21 (hashes):** las 21 `*.ataque` de la tabla del reporte del Tester se comprobaron con `Get-FileHash -Algorithm SHA256` antes de tocar nada y otra vez después de las tres corridas: los 21 valores coinciden exactamente con la tabla de `reporte-tester.md` en los dos momentos.
- **V-22:** `git status --short` sin nada bajo `frontend/`.
- **Formateadores:** `npx prettier --write test/restablecer.integracion.test.ts` y `npx prettier --write src/adapters/db/tokens-cuenta.ts src/handlers/auth/cuentas.ts src/core/auth/recuperacion.ts src/config/logger.ts src/handlers/errores.ts src/app.ts src/adapters/queue/index.ts src/workers/index.ts`, ambos desde `backend/` (nunca `--write .` desde la raíz).

## PARADAS

Ninguna se activó. No hizo falta un remedio fuera del plan para ningún hallazgo.

## Desviaciones del plan

- **DEC-08 (orden del consumo de tokens).** DEC-08 fija el orden: (1) `updateMany` condicional sobre el propio token, (2) `usuario.update`, (3) revocaciones de sesiones y de los demás tokens. La corrección de T-01 antepone un paso 0: bloquear la fila de `usuarios` con `SELECT ... FOR UPDATE` antes del `updateMany` del token. Es una desviación de la letra de DEC-08, aunque conserva su semántica: el paso 0 no escribe nada (solo toma el bloqueo de fila), así que el perdedor de la carrera sigue sin tocar ningún dato, y los pasos 1 a 3 quedan exactamente como DEC-08 los describe. La misma anteposición se aplicó en `prepararTokenDeRecuperacion` (el worker, N-04), que DEC-08 no menciona porque no toca `usuarios`. Justificación: sin un orden de bloqueo único no hay forma de eliminar el deadlock de T-01 sin abandonar la semántica de "un solo uso resistente a carreras" o sin traducir el deadlock a otro código además de `400 ENLACE_INVALIDO` (que DEC-08 exige como única salida). Prueba que la cubre: `backend/test/cuentas-r1.ataque.test.ts` › "invitación y recuperación vivas de un maestro pendiente usadas a la vez..." (verde, sin tocarla) y las dos pruebas propias nuevas en `backend/test/restablecer.integracion.test.ts` (sección "ataque de carrera con otras transacciones del mismo usuario").
- T-05 se resolvió en `app.ts` y `handlers/errores.ts`, como el propio hallazgo autoriza explícitamente ("Resuélvelo en `app.ts` o en `handlers/errores.ts`, sin tocar archivos que el plan no autoriza"); no es una desviación porque el hallazgo la autoriza por escrito, pero se deja anotada para que quede completo el registro de cambios de comportamiento de esta ronda.

## No verificado o pendiente

- Queda pendiente lo mismo que la ronda 1 señaló como fuera de alcance (S-05, ADMIN: si la contraseña temporal debe caducar).

## V-17 (humo en `campus_dev`), a pedido del orquestador tras el primer envío de esta ronda

Se repitió completo porque los dos cambios de T-01 y T-03 sí tocan el camino de `recuperar` (T-03: ya no abre transacción, encola con el pool propio de pg-boss) y de `restablecer` (T-01: `SELECT ... FOR UPDATE` nuevo en `usarTokenYCambiarContrasena`). `npm run build` se corrió antes desde `backend/` para que `dist/` tuviera los cambios de la ronda 2.

- **Precondición de puerto:** `Get-NetTCPConnection -LocalPort 3000` sin resultados antes de arrancar: el puerto estaba libre (no fue necesario detenerse a preguntar).
- **Huella antes:** capturada en `tmp/huella-cuentas-antes.txt` (201 bytes; no se imprimió el contenido).
- **API y worker desde `dist/`:** `Start-Process -FilePath node -ArgumentList "--env-file-if-exists=.env","dist/server.js"` (y `dist/worker.js`), cada uno con su PID guardado en `tmp/v17-*.pid`. `Server listening at http://127.0.0.1:3000` y `{"evento":"worker_listo","canalCorreo":"registro"}` aparecieron antes de 5 s (muy por debajo del máximo de 30 s de PA-17; no se activó).
- **Registro:** `POST /auth/registro` con `v17-<uuid>@pruebas.local` → `201`.
- **Recuperación, 10 alternadas por correo:** las 3 primeras de cada correo (existente e inexistente) → `204` (tiempos entre 0,003 s y 0,04 s); de la 4.ª a la 10.ª → `429` en ambos, por el límite de 3 por hora por IP + correo (DEC-05). Igual para el correo existente que para el inexistente: mismo patrón, sin filtrar si la cuenta existe.
- **Correos:** exactamente 3 archivos HTML nuevos en `tmp/correos/` (uno por cada solicitud atendida de la cuenta existente) y ninguno de la cuenta inexistente.
- **Token:** extraído del HTML más reciente con `Select-String -Pattern "#token=([A-Za-z0-9_-]{43})"` (43 caracteres), escrito en `tmp/v17-restablecer.json` sin imprimirlo en la consola ni en este resumen.
- **Flujo de restablecimiento:** `POST /auth/restablecer` → `204`; login con la contraseña nueva → `200`; login con la vieja → `401`; reutilizar el mismo token → `400`.
- **Logs (`Select-String -SimpleMatch` sobre `tmp/v17-*.log`)** contra el token, la cadena `#token=`, las dos contraseñas de la prueba y `re_llave_falsa_de_v16`: **0 coincidencias** en total (PA-14 no se activó). Solo se reporta el conteo, nunca los valores.
- **Cierre:** `taskkill /PID <api> /T /F` y `taskkill /PID <worker> /T /F` sobre los PID propios (`21808` y `15912`); confirmado con `Get-Process -Id` que ambos ya no existen.
- **`DELETE` del usuario propio** (`v17-<uuid>@pruebas.local`) desde `infra/`, única escritura manual autorizada: `DELETE 1`.
- **Huella después:** capturada en `tmp/huella-cuentas-despues.txt`; `Compare-Object` contra la de antes → **sin salida, idéntica**. Las cuentas del administrador y del humano no se tocaron.
- **Limpieza:** se borraron los HTML propios de `tmp/correos/`, los `tmp/v17-*.json`, los `tmp/v17-*.pid`, `tmp/v17-uuid.txt` y las dos huellas. Se dejaron `tmp/v17-*.log` (evidencia de esta corrida, `tmp/` está en `.gitignore`), igual que los logs de verificaciones anteriores que ya vivían en esa carpeta.
- **Temporal huérfano señalado por el orquestador:** `backend/tmp/v15.pid` apuntaba al PID `22956`, que ya no existe (`Get-Process -Id 22956` sin resultado); era un residuo de la ronda 1. Se borró. No quedó ningún otro `.pid` en `backend/tmp/`.
- **Procesos en segundo plano:** ningún proceso propio quedó corriendo al terminar esta verificación (`Get-Process -Id` sobre los dos PID de la API y el worker, sin resultado); los dos procesos `node` que siguen activos en la máquina pertenecen al runtime de OpenAI Codex (`Get-CimInstance Win32_Process`, `CommandLine` con `cua_node`/`cua-repl`), no a este trabajo.

# Resumen del Programador — AUTH-02a — ronda 3 (Enmienda 2; la última)

Plan: `docs/trabajo/AUTH-02-cuentas-y-correo/plan.md` (Enmienda 2). Aprobación: `docs/trabajo/AUTH-02-cuentas-y-correo/aprobacion.md` ("Enmienda 2 — decisiones del humano"). Precondición confirmada por el orquestador: la verificación acotada del Manager de la Enmienda 2 está hecha (E2-01 a E2-03). Corrige T-07, T-08 y T-09 de la ronda 2 con el protocolo de bloqueo por usuario (PB-1 a PB-8).

## T-07, T-08 y T-09, uno por uno

### T-07 — deadlock entre `/auth/restablecer` (o `/auth/establecer-contrasena`) y `/auth/refrescar` del mismo usuario
Causa (ronda 2): `usarTokenYCambiarContrasena` y `prepararTokenDeRecuperacion` tomaban `FOR UPDATE` sobre el usuario; `rotarSesion` pide `KEY SHARE` sobre el usuario al insertar la sesión nueva (por la FK). `FOR UPDATE` choca con `KEY SHARE`, y los órdenes cruzados producían `40P01`.

Corrección: se bajó el bloqueo de escritura del protocolo de `FOR UPDATE` a `FOR NO KEY UPDATE` (`bloquearUsuarioParaEscribir`, `backend/src/adapters/db/bloqueo-usuario.ts`), que **no choca** con `KEY SHARE`. Se usa en `usarTokenYCambiarContrasena` y `prepararTokenDeRecuperacion` (`backend/src/adapters/db/tokens-cuenta.ts`, sustituyendo la función privada `bloquearUsuario` de la ronda 2), en `restablecerConTemporal`, `cambiarContrasenaPropia` y `actualizarContrasenaYRevocarSesiones` (`backend/src/adapters/db/usuarios.ts`), y en `revocarTodasLasSesiones` (`backend/src/adapters/db/sesiones.ts`). Además, crear o rotar una sesión ahora toma primero `FOR SHARE` sobre el usuario (`bloquearUsuarioParaSesion`, en `crearSesion` y `rotarSesion` de `backend/src/adapters/db/sesiones.ts`), compatible con el `KEY SHARE` de su propio `INSERT`. Con eso ningún camino pide dos modos incompatibles en órdenes cruzados: no puede haber espera circular (razonamiento completo en `backend/src/adapters/README.md`, sección "Protocolo de bloqueo por usuario").

Prueba: `backend/test/cuentas-r2.ataque.test.ts` › "ataque: orden de bloqueo de T-01 frente a las transacciones de sesión de AUTH-01" › "/auth/restablecer y /auth/refrescar del mismo usuario a la vez: nunca un 500" (verde, sin tocarla) y `backend/test/bloqueo-usuario.integracion.test.ts` › A1 y A4 (combinaciones nuevas con `establecer-contrasena` y con una cookie reutilizada).

### T-08 — un refresco concurrente deja viva una sesión que una revocación en bloque debía cerrar
Causa (ronda 2): `restablecerConTemporal` y `cambiarContrasenaPropia` tomaban `FOR NO KEY UPDATE` sobre el usuario, compatible con el `KEY SHARE` que pide el `INSERT` de `rotarSesion`. La revocación en bloque y la rotación podían avanzar en paralelo; si la revocación evaluaba `sesiones` antes de que la rotación insertara la sesión nueva, esta última quedaba viva.

Corrección: `rotarSesion` ahora bloquea primero al usuario con `FOR SHARE` (`bloquearUsuarioParaSesion`), y las revocaciones en bloque (`restablecerConTemporal`, `cambiarContrasenaPropia`, `actualizarContrasenaYRevocarSesiones`, `revocarTodasLasSesiones`) bloquean primero con `FOR NO KEY UPDATE`. Los dos modos chocan entre sí, así que las dos transacciones quedan en serie: si la rotación va primero, la revocación ve la sesión nueva con una instantánea posterior a su `COMMIT`; si la revocación va primero, la rotación ve la sesión vieja ya revocada (`count = 0`) y no inserta la nueva.

Pruebas: `backend/test/cuentas-r2.ataque.test.ts` › "ataque: revocación de sesiones frente a un refresco concurrente" › las dos pruebas de T-08 (verdes, sin tocarlas) y `backend/test/bloqueo-usuario.integracion.test.ts` › B1, B2 y B3 (revocación del admin, `actualizarContrasenaYRevocarSesiones` directo, y reutilización de una cookie ya rotada, respectivamente).

### T-09 — un login con la contraseña vieja crea una sesión después de que un cambio de contraseña ya confirmó
Causa (ronda 2): el login verificaba la contraseña con argon2 fuera de cualquier bloqueo y después insertaba la sesión en otra sentencia; si un cambio de contraseña confirmaba en medio, la sesión nacía autenticada con una contraseña que ya no existía.

Corrección: `crearSesion` (`backend/src/adapters/db/sesiones.ts`) ahora es una transacción que primero bloquea al usuario con `FOR SHARE` y **decide bajo el bloqueo**: lee `hash_contrasena` y `activo` con esa misma sentencia y compara contra `hashVerificado` (el hash que el handler ya verificó con argon2 antes de la transacción); si no coincide o la cuenta está inactiva, devuelve `null`. El bloque de `POST /login` (`backend/src/handlers/auth/index.ts`, único cambio autorizado de ese archivo) pasa `hashVerificado: credenciales.hashContrasena` y, si `crearSesion` devuelve `null`, responde `401 CREDENCIALES_INVALIDAS` igual que una contraseña incorrecta, **sin sumar un fallo al límite de intentos** (Q-E2-4): `intentos.delete(llave)` se queda antes de la llamada, como ya lo exigía la Enmienda 2 y como necesita `intentos-r2.ataque`.

Pruebas: `backend/test/cuentas-r2.ataque.test.ts` › "un login con la contraseña vieja que termina después de /auth/restablecer no deja una sesión viva" (verde, sin tocarla) y `backend/test/bloqueo-usuario.integracion.test.ts` › C1, C2, C3 y C4 (restablecimiento del admin, `cambiar-contrasena`, `actualizarContrasenaYRevocarSesiones` directo, y el orden inverso login-antes-que-restablecer).

## La desviación DEC-08 de la ronda 2, formalizada

La ronda 2 anteponía a `usarTokenYCambiarContrasena` y `prepararTokenDeRecuperacion` un paso 0 con `SELECT ... FOR UPDATE` sobre el usuario, fuera de la letra de DEC-08 (que no menciona ese paso), documentado como desviación en el resumen de esa ronda. La Enmienda 2 conserva ese paso 0 pero **cambia el modo de `FOR UPDATE` a `FOR NO KEY UPDATE`** (`bloquearUsuarioParaEscribir`), por la razón de T-07 arriba. El paso 0 sigue sin escribir nada: si el token resulta inválido (el perdedor de la carrera), la transacción no modifica ningún dato, y los pasos 1 a 3 siguen exactamente como DEC-08 los describe. No es una desviación nueva: es la corrección que la propia Enmienda 2 pide en su punto 4 ("DEC-08 gana el paso 0, que formaliza la desviación de la ronda 2").

## Pasos completados (AUTH-02a, ronda 3)

1. V-01 y V-02 con la tabla de hashes de la ronda 2 del Tester (23 archivos): coinciden exactamente, antes y después. PA-01 y PA-02 no se activaron (ver "Verificación" abajo).
2. Creado `backend/src/adapters/db/bloqueo-usuario.ts` con `bloquearUsuarioParaEscribir` (`FOR NO KEY UPDATE`) y `bloquearUsuarioParaSesion` (`FOR SHARE`), código idéntico al del plan. No se reexporta en `adapters/db/index.ts` (PB-8).
3. `backend/src/adapters/db/tokens-cuenta.ts`: se retiró la función privada `bloquearUsuario` (`FOR UPDATE`) y `usarTokenYCambiarContrasena`/`prepararTokenDeRecuperacion` usan `bloquearUsuarioParaEscribir`.
4. `backend/src/adapters/db/usuarios.ts`: `restablecerConTemporal`, `cambiarContrasenaPropia` (ahora recibe `hashVerificado` y devuelve `boolean`) y `actualizarContrasenaYRevocarSesiones` bloquean primero al usuario. `corregirCorreo` no cambió (excepción de PB-2: su propio `UPDATE usuarios SET email` ya toma `FOR UPDATE` por el índice único).
5. `backend/src/adapters/db/sesiones.ts`: `crearSesion` (nueva interfaz `DatosDeSesionConCredencial`, ahora devuelve `{ id: string } | null` y corre dentro de una transacción), `rotarSesion` (bloqueo de sesión del protocolo antes del resto, firma sin cambios) y `revocarTodasLasSesiones` (ahora una transacción que bloquea primero, mismo retorno `number`).
6. `backend/src/handlers/auth/cuentas.ts`: `cambiar-contrasena` pasa a retornos tempranos (`credenciales === null` y `!coincide` con la misma función `contrasenaActualIncorrecta()`, definida una vez en el ámbito del módulo) y pasa `hashVerificado: credenciales.hashContrasena` a `cambiarContrasenaPropia`; si devuelve `false`, responde `400 CONTRASENA_ACTUAL_INCORRECTA` (mismo código y mensaje que un fallo de verificación).
7. `backend/src/handlers/auth/index.ts`: **solo el bloque de `POST /login`**, entre `intentos.delete(llave)` y `responderConSesion`. Nada más de ese archivo se tocó (confirmado en V-22 abajo).
8. Sección "Protocolo de bloqueo por usuario (AUTH-02, Enmienda 2)" añadida a `backend/src/adapters/README.md`: alcance, las dos funciones, la tabla de modos de PostgreSQL y por qué no hay deadlock y por qué se cierran T-08 y T-09.
9. Creados `backend/test/ayudas-concurrencia.ts` (`conFilaRetenida`, reescrita aquí a partir del método de `cuentas-r2.ataque`; nunca se importó de un `*.ataque`) y `backend/test/bloqueo-usuario.integracion.test.ts` (19 pruebas: A1-A4, B1-B3, C1-C4, D1, E1-E7).
10. `npx vitest run test/cuentas-r2.ataque.test.ts test/cuentas-r1.ataque.test.ts test/intentos-r2.ataque.test.ts test/sesiones-y-cadena.ataque.test.ts test/bloqueo-usuario.integracion.test.ts` desde `backend/`: **5 archivos, 117 pruebas, todas verdes**. Sin `40P01`, `deadlock detected` ni `could not serialize` en la salida (PA-18 y PA-21 no se activaron).
11. Formateo acotado, desde `backend/`: `npx prettier --write src/adapters/db/bloqueo-usuario.ts src/adapters/db/sesiones.ts src/adapters/db/tokens-cuenta.ts src/adapters/db/usuarios.ts src/handlers/auth/cuentas.ts src/handlers/auth/index.ts src/adapters/README.md test/ayudas-concurrencia.ts test/bloqueo-usuario.integracion.test.ts`. Prettier reformateó `src/adapters/README.md` y `test/bloqueo-usuario.integracion.test.ts` (envoltura de línea); el resto, sin cambios. Nunca `--write .` desde la raíz.
12. V-11, V-13 y V-15 (detalle abajo).
13. V-17 repetida completa, porque el login y `restablecer` cambiaron (detalle abajo).
14. V-20, V-21 y V-22 (detalle abajo). PA-19 no se activó.
15. Esta sección.

## Verificación (ronda 3)

- **PA-01/V-01 (antes de correr nada):** regla del firewall `Campus: bloquear entrada a Docker en redes publicas` → `True`/`Inbound`/`Block`, perfil `Public`; `Get-NetConnectionProfile` → `IZZI-F281`/`Public`. Docker `28.5.1`; `docker ps -a --filter "label=org.testcontainers=true"` vacío antes de empezar. **No se activó.**
- **PA-02/V-02:** rama `feat/auth-02a-cuentas-backend` (`git branch --show-current`). `git status --short` antes de tocar nada: solo archivos de `backend/` ya autorizados de rondas anteriores, `docs/trabajo/AUTH-02-cuentas-y-correo/` y `docs/ESTADO.md`; nada bajo `frontend/`. Los 23 hashes SHA-256 de la tabla de la ronda 2 del Tester coinciden exactamente con los archivos en disco, verificado antes de tocar nada y otra vez después de las tres corridas de V-20 (mismos valores en los dos momentos; ver tabla abajo, V-21). **No se activó.**
- **V-11 (autorización):** cubierta dentro de las tres corridas completas de V-20; ninguna prueba de autorización de los ocho endpoints quedó en rojo.
- **V-13:** `npx vitest run test/arquitectura-cuentas-r1.ataque.test.ts` → 10/10 verdes. Comprobado además con `grep` acotado a `backend/src/adapters/db/*.ts` (excluyendo `generated/` y `README.md`, E2-02): el único `$queryRawUnsafe` sigue siendo el de `cliente.ts` (`ejecutorSqlDe`), y el único `$queryRaw` etiquetado (sin `Unsafe`) aparece en `salud.ts` y en el nuevo `bloqueo-usuario.ts` — exactamente lo que exige V-13 desde la ronda 3 y lo que comprueba `bloqueo-usuario.integracion.test.ts` › E6.
- **V-15** (`npm run lint` desde `backend/`): verde — ESLint, `prettier --check` y `tsc -p tsconfig.json --noEmit`, sin advertencias. `npm run build` desde `backend/`: verde (incluye `shared:build` y `prisma generate`).
- **V-17 (humo en `campus_dev`), repetida completa** porque el login y `restablecer` cambiaron de comportamiento (T-09 y el modo de bloqueo de T-07):
  - **Precondición de puerto:** `Get-NetTCPConnection -LocalPort 3000` sin resultados antes de arrancar (puerto libre).
  - `docker compose ps` en `infra/`: `postgres`, `minio` y `livekit` ya estaban `healthy`; no hizo falta `docker compose up -d`.
  - **Huella antes:** capturada en `tmp/huella-cuentas-antes-r3.txt` (no impresa).
  - **API y worker desde `dist/`:** `Start-Process -FilePath node -ArgumentList "--env-file-if-exists=.env","dist/server.js"` (y `dist/worker.js`), cada uno con su PID guardado en `tmp/v17r3-*.pid`. `Server listening at http://127.0.0.1:3000` y `{"evento":"worker_listo","canalCorreo":"registro"}` aparecieron en menos de 5 s (muy por debajo del máximo de 30 s de PA-17; no se activó).
  - **Registro:** `POST /auth/registro` con `v17r3-<uuid>@pruebas.local` → `201`.
  - **Recuperación:** `POST /auth/recuperar` → `204`; apareció un HTML nuevo en `tmp/correos/` y de él se extrajo el token con `Select-String -Pattern "#token=([A-Za-z0-9_-]{43})"`, sin imprimirlo.
  - **Flujo T-09 en condiciones reales (no concurrente, solo de humo):** login con la contraseña original → `200` (guarda la cookie); `POST /auth/restablecer` con el token y una contraseña nueva → `204`; login con la contraseña vieja → `401`; login con la contraseña nueva → `200`; reutilizar el mismo token de recuperación → `400`; `POST /auth/refrescar` con la cookie del login anterior al restablecimiento → `401` (la sesión quedó revocada por `restablecer`, confirmando en el entorno real el mismo efecto que prueba C1/C4 de forma concurrente).
  - **Logs** (`grep -c` sobre `tmp/v17r3-*.log`) contra el token, la cadena `#token=`, las dos contraseñas de la prueba y `re_llave_falsa_de_v16`: **0 coincidencias** en total en los cuatro archivos (PA-14 no se activó). Solo se reporta el conteo.
  - **Cierre:** `taskkill /PID <api> /T /F` y `taskkill /PID <worker> /T /F` sobre los PID propios; confirmado con `Get-Process -Id` que ninguno de los dos (ni sus procesos secundarios) sigue vivo.
  - **`DELETE` del usuario propio** (`v17r3-<uuid>@pruebas.local`) desde `infra/`, única escritura manual autorizada: `DELETE 1`.
  - **Huella después:** capturada en `tmp/huella-cuentas-despues-r3.txt`; comparada por hash contra la de antes → **idéntica**. Las cuentas del administrador y del humano no se tocaron.
  - **Limpieza:** se borraron los JSON, el `.pid`, el UUID, el correo y las dos huellas de esta corrida, y el HTML propio de `tmp/correos/`. Se dejaron `tmp/v17r3-*.log` como evidencia (igual que los de rondas anteriores, `tmp/` está en `.gitignore`).
- **V-20 (tres corridas completas de `npm test` desde la raíz, salida a archivo, sin tubería):**

| Corrida | Backend | Frontend | Duración backend (Vitest) | Duración frontend |
|---|---|---|---|---|
| 1 | 64 archivos · 635 pruebas · 635 ✓ · 0 ✗ | 11 · 69/69 | 25,41 s | 36,11 s |
| 2 | ídem | 11 · 69/69 | 24,69 s | 6,72 s |
| 3 | ídem | 11 · 69/69 | 24,79 s | 6,67 s |

  Las tres corridas son idénticas: 635/635 en el backend y 69/69 en el frontend. `grep -i` sobre los tres logs completos para `FSTDEP`, `too many clients`, `40P01`, `deadlock detected` y `could not serialize`: **0 coincidencias en las tres** (PA-12 y PA-19 no se activaron). Ninguna prueba fue intermitente entre las tres corridas (PA-13 no se activó). Después de la tercera, `docker ps -a --filter "label=org.testcontainers=true"` → vacío (PA-16 no se activó).
- **V-21 (hashes):** los 23 `*.ataque` de la tabla de la ronda 2 del Tester se comprobaron con `Get-FileHash -Algorithm SHA256` antes de tocar nada y otra vez después de las tres corridas de V-20: los 23 valores coinciden exactamente con la tabla de `reporte-tester.md` ("AUTH-02a — Ronda 2") en los dos momentos. Ninguna `*.ataque.test.ts(x)` se modificó, desactivó ni borró.
- **V-22:** `git diff -U0 -- backend/src/handlers/auth/index.ts` muestra solo tres fragmentos, los tres dentro del manejador de `POST /login`, entre `intentos.delete(llave)` y `responderConSesion`: capturar el resultado de `crearSesion` en `creada`, agregar `hashVerificado: credenciales.hashContrasena` a los datos que recibe, y el `if (!creada) throw credencialesInvalidas()` con su comentario. `git status --short` sin nada bajo `frontend/`; los únicos archivos nuevos o modificados están en `backend/` y en `docs/trabajo/AUTH-02-cuentas-y-correo/`.

## PARADAS (PA-01 a PA-21)

- **PA-01 a PA-17:** las mismas condiciones de las rondas 1 y 2 (sin cambios en esta ronda); no se activaron, con la evidencia repetida arriba donde aplica (V-01, V-16/V-17 no repetidos salvo lo que esta ronda exige).
- **PA-18** (alguna de las 4 pruebas de `cuentas-r2.ataque` que fallaron en la ronda 2 sigue en rojo, o alguna de `bloqueo-usuario.integracion` falla): **no se activó.** Las 4 pruebas de `cuentas-r2.ataque` (T-07, las dos de T-08 y T-09) pasan a verde, y las 19 de `bloqueo-usuario.integracion` pasan verdes, en la corrida aislada del paso 10 y en las tres corridas completas de V-20. No se aplicó ningún remedio fuera del plan: ni reintentos ante `40P01`, ni cambios de aislamiento, ni `lock_timeout`, ni `NOWAIT`/`SKIP LOCKED`.
- **PA-19** (`40P01`, `deadlock detected` o `could not serialize` en alguno de los tres logs de V-20): **no se activó.** `grep -i` sobre los tres logs completos de V-20: 0 coincidencias, reportado arriba.
- **PA-20** (la corrección exige tocar un archivo o un bloque fuera de lo autorizado, o cambiar la firma de `rotarSesion` o `revocarTodasLasSesiones`): **no se activó.** Solo se tocó el bloque de `POST /login` en `handlers/auth/index.ts` (V-22 lo confirma); `refrescar`, `registro` y `logout` no cambiaron; `cookie.ts`, `scripts/` y `middleware/` no se tocaron; las firmas de `rotarSesion` (`{ sesionId, ahora, nueva }` → `{ id: string } | null`) y `revocarTodasLasSesiones` (`usuarioId` → `number`) son las mismas que en AUTH-01.
- **PA-21** (falla la precondición de `conFilaRetenida`, "no llegó a la fila retenida"): **no se activó** en ninguna de las 15 pruebas de `bloqueo-usuario.integracion` que usan la ayuda (A1-A4, B1-B3, C1-C4, D1), ni en las 4 de `cuentas-r2.ataque` que la usan (con su propia copia del método), en ninguna de las corridas.

## Desviaciones del plan

- Ninguna nueva. La única desviación de la letra de DEC-08 (el paso 0 de bloqueo antes del `updateMany` del token) ya estaba anotada en la ronda 2 y esta ronda la conserva, cambiando el modo de `FOR UPDATE` a `FOR NO KEY UPDATE` exactamente como pide la Enmienda 2 (ver sección dedicada arriba). No es una desviación nueva de esta ronda: la propia Enmienda 2 la exige.

## No verificado o pendiente

- Lo mismo que las rondas 1 y 2 dejaron pendiente: S-05 (ADMIN, si la contraseña temporal debe caducar).
- **E2-03 (riesgo residual aceptado por el humano):** dos correcciones de correo cruzadas y simultáneas del admin (`corregirCorreo`) pueden producir un deadlock y un `500` (los datos quedan correctos). No se corrigió ni se tocó `corregirCorreo` más allá de documentar en `adapters/README.md` que es la excepción de PB-2 (su propio `UPDATE usuarios SET email` ya toma `FOR UPDATE` por el índice único de `email`). Queda registrado en `aprobacion.md` como pendiente de ADMIN; no se intentó ningún remedio.
- No se probó `reset:admin` como script real (`scripts/reset-admin.ts` no cambió, per Q-E2-3); se probó `actualizarContrasenaYRevocarSesiones` directamente en `bloqueo-usuario.integracion.test.ts` (B2, C3) y con el mismo mecanismo que usa el script.
- El flujo del navegador (AUTH-02b) sigue sin existir; no aplica a esta ronda.

## Conteos exactos (ronda 3)

- Backend: **64 archivos y 635 pruebas** (antes: 63 archivos y 616 pruebas tras la ronda 2 del Tester). Se sumaron `backend/test/bloqueo-usuario.integracion.test.ts` (19 pruebas). `backend/test/ayudas-concurrencia.ts` no es un archivo de pruebas (no se cuenta como archivo de la suite).
- Frontend: sin cambios, 11 archivos y 69 pruebas.
- Total: **75 archivos y 704 pruebas** entre los dos workspaces.

## Archivos creados o modificados en esta ronda

- **Creados:** `backend/src/adapters/db/bloqueo-usuario.ts`, `backend/test/ayudas-concurrencia.ts`, `backend/test/bloqueo-usuario.integracion.test.ts`.
- **Modificados:** `backend/src/adapters/db/tokens-cuenta.ts` (bloqueo de escritura del protocolo), `backend/src/adapters/db/usuarios.ts` (`restablecerConTemporal`, `cambiarContrasenaPropia`, `actualizarContrasenaYRevocarSesiones`), `backend/src/adapters/db/sesiones.ts` (`crearSesion`, `rotarSesion`, `revocarTodasLasSesiones`), `backend/src/handlers/auth/cuentas.ts` (`cambiar-contrasena`), `backend/src/handlers/auth/index.ts` (**solo el bloque de `POST /login`**), `backend/src/adapters/README.md` (sección nueva del protocolo).
- **Ninguna `*.ataque.test.ts(x)` se tocó.** Los 23 hashes coinciden exactamente con la tabla de la ronda 2 del Tester, antes y después de esta ronda.
- **Nada bajo `frontend/`, `shared/`, `scripts/`, `middleware/`, `core/`, `app.ts`, `server.ts`, `worker.ts` ni `workers/`.**

## Para la revisión humana del diff (por capas)

1. `backend/src/adapters/db/bloqueo-usuario.ts` (nuevo): las dos funciones del protocolo.
2. `backend/src/adapters/db/tokens-cuenta.ts`: reemplazo de la función privada por `bloquearUsuarioParaEscribir`.
3. `backend/src/adapters/db/usuarios.ts`: bloqueo primero en `restablecerConTemporal`, `cambiarContrasenaPropia` (con `hashVerificado`) y `actualizarContrasenaYRevocarSesiones`.
4. `backend/src/adapters/db/sesiones.ts`: `crearSesion` ahora transaccional con `hashVerificado`; `rotarSesion` con el bloqueo de sesión antes; `revocarTodasLasSesiones` ahora transaccional con bloqueo antes.
5. `backend/src/handlers/auth/cuentas.ts`: retornos tempranos y `hashVerificado` en `cambiar-contrasena`.
6. `backend/src/handlers/auth/index.ts`: **diff de tres líneas**, todo dentro del bloque de `POST /login` (reproducido en V-22 arriba, para que el humano lo revise sin tener que abrir el archivo completo).
7. `backend/src/adapters/README.md`: sección nueva, solo documentación.
8. `backend/test/ayudas-concurrencia.ts` y `backend/test/bloqueo-usuario.integracion.test.ts` (nuevos): la ayuda de concurrencia y las 19 pruebas.

# Resumen del Programador — AUTH-02b — ronda 1

Plan: `docs/trabajo/AUTH-02-cuentas-y-correo/plan.md` (Enmienda 1, sección "AUTH-02b"). Aprobación: `docs/trabajo/AUTH-02-cuentas-y-correo/aprobacion.md` ("Inicio de AUTH-02b — 2026-09-26"). AUTH-02a ya está fusionada en `main` (PR #10, `b55897a`); rama de trabajo `feat/auth-02b-cuentas-frontend`, creada por el orquestador desde ese `main`. Pasos 16 a 21, 22 (sección "Frontend en local" §3 del README), 23b y 24b del plan.

## Pasos completados

16. `frontend/src/services/apiClient.ts`: `procesar` ahora trata `403 CAMBIO_DE_CONTRASENA_REQUERIDO` de forma simétrica a `403 ACCESO_RESTRINGIDO` (`irA("/cambiar-contrasena")`, salvo estando ya ahí); `api` deja de excluir `POST /api/auth/cambiar-contrasena` del refresco ante `401` (única excepción bajo `/api/auth/`); `RUTAS_SIN_SESION` suma `/recuperar`, `/restablecer` y `/establecer-contrasena`. `apiClient.test.ts`: +4 casos (403 CAMBIO… navega; ya en `/cambiar-contrasena` no navega otra vez; 401 con token en `/api/auth/cambiar-contrasena` refresca y reintenta; 401 con token en `/api/auth/login` sigue sin refrescar). `services/navegacion.ts`: comentario ampliado con el nuevo caso.
17. `features/auth/types.ts`: reexporta `Recuperar`, `NuevaContrasenaConToken`, `CambiarContrasena`; `CampoFormularioAuth` suma `contrasenaActual` / `contrasenaNueva` / `confirmacion`; nuevos `TipoEnlace`, `AvisoDeLogin`, `EstadoDeNavegacionLogin` e interfaz `TextosNuevaContrasena` (para tipar `TEXTOS_NUEVA_CONTRASENA` por tipo de enlace; no estaba en la lista literal del plan pero es necesaria para no declarar el objeto sin tipo — ver "Desviaciones"). `features/auth/data.ts`: `TEXTOS_RECUPERAR`, `TEXTOS_NUEVA_CONTRASENA` (por `recuperacion` / `invitacion`), `TEXTOS_CAMBIAR`, `AVISOS_LOGIN`, `RUTA_CAMBIAR_CONTRASENA`, `MENSAJE_CONFIRMACION_NO_COINCIDE`; `MENSAJES_ERROR_AUTH` suma `ENLACE_INVALIDO`, `DEMASIADAS_SOLICITUDES`, `CONTRASENA_ACTUAL_INCORRECTA`, `CONTRASENA_REPETIDA`, `CAMBIO_DE_CONTRASENA_REQUERIDO`; `CAMPOS_FORMULARIO_AUTH` con los tres campos nuevos. `features/auth/lib.ts`: `leerTokenDelFragmento`, `requiereCambioDeContrasena`, `avisoDeLogin`, `contrasenasCoinciden`. `lib.test.ts`: +5 casos (los tres de `leerTokenDelFragmento`, `requiereCambioDeContrasena`, `avisoDeLogin`) más 2 adicionales de refuerzo (`contrasenasCoinciden`) — ver "Desviaciones".
18. `features/auth/hooks.ts`: `useRecuperar`, `useNuevaContrasena(tipo)` (ruta por tipo; `onSuccess` navega a `/login` con `state: { aviso }`), `useCambiarContrasena` (`removeQueries(["me"])` → `fetchQuery(consultaMe)` → `navigate(rutaTrasLogin(me))`), `useTokenDelEnlace` (token leído una sola vez con `useState`, efecto que limpia el fragmento con `replace: true`). Componentes nuevos: `components/tarjeta-de-cuenta.tsx`, `components/formulario-recuperar.tsx`, `components/formulario-nueva-contrasena.tsx` (con el subcomponente `EnlaceInvalido`, reutilizado sin token en la URL y cuando el servidor rechaza el token al enviarlo), `components/formulario-cambiar-contrasena.tsx`. Vistas nuevas: `recuperar-view.tsx`, `restablecer-view.tsx`, `establecer-contrasena-view.tsx`, `cambiar-contrasena-view.tsx`, cada una con su `.test.tsx`. `login-view.tsx`: aviso de éxito (`role="status"`, icono `CircleCheck`, `text-success`) a partir de `avisoDeLogin(location.state)`; `login-view.test.tsx` +1 caso.
19. `app/require-cambio-de-contrasena.tsx` (nuevo): fuera de `RequireSesion`; con `CAMBIO_DE_CONTRASENA_REQUERIDO` → `<Outlet />`; con otro error → `/login`; cargando → `<Cargando />`; con `/me` en `200` → `<Navigate to={rutaTrasLogin(me)} />`. `app/require-sesion.tsx` y `app/require-rol.tsx`: el error `CAMBIO…` navega a `/cambiar-contrasena` en vez de a `/login` (con `requiereCambioDeContrasena(error)`). `app/router.tsx`: `LayoutPublico` suma `/recuperar`, `/restablecer`, `/establecer-contrasena`; ruta `/cambiar-contrasena` con `RequireCambioDeContrasena` (fuera de `RequireSesion`) e índice `CambiarContrasenaView`; índice de `/admin` pasa de `BienvenidaView` a `CuentasView`. `app/router.test.tsx`: +3 casos.
20. `features/admin/{types,data,lib,hooks}.ts` y `lib.test.ts` (2 casos, exactos del plan); `erroresPorCampoAdmin` en `lib.ts` no está en la lista literal del plan pero era necesaria para la validación en cliente con `aria-invalid`/`aria-describedby` por campo (ver "Desviaciones"). Componentes: `formulario-invitar-maestro.tsx`, `buscador-de-cuenta.tsx`, `ficha-de-cuenta.tsx` (con el subcomponente interno `AccionRestablecer`, para evitar un ternario anidado en JSX), `contrasena-temporal.tsx`, `formulario-corregir-correo.tsx`. `cuentas-view.tsx` (índice de `/admin`, sin ninguna consulta al montar) y `cuentas-view.test.tsx` (6 casos).
21. Pruebas del frontend de la tabla: `apiClient.test.ts` (+4), `lib.test.ts` de auth (+5, con 2 de refuerzo), `recuperar-view.test.tsx` (3), `restablecer-view.test.tsx` (5), `establecer-contrasena-view.test.tsx` (3), `cambiar-contrasena-view.test.tsx` (4), `login-view.test.tsx` (+1), `router.test.tsx` (+3), `features/admin/lib.test.ts` (2), `cuentas-view.test.tsx` (6). **V-19** en verde (detalle abajo).
22. `README.md`, solo "Frontend en local" §3: se amplió el párrafo de "Para recorrer el flujo completo" (la bienvenida ya no aplica al admin, que ahora ve la pantalla de cuentas) y se añadieron los tres flujos de correo (recuperación, invitación, restablecimiento por el admin), con la nota de que el worker escribe los HTML en `backend/tmp/correos/` fuera de `prod`. Ninguna otra sección de `README.md` se tocó.
23b. **V-20** (detalle abajo): Prettier acotado a `frontend/` y `README.md`, tres corridas completas de `npm test` desde la raíz, `npm run lint` y `npm run build` desde la raíz. **V-21** y **V-22** (versión 02b), detalle abajo.
24b. Esta sección.

## Verificación

- **V-01:** `node --version` → `v24.21.0`; `npm --version` → `11.19.0` (el humano actualizó Node desde AUTH-02a; ya no se esperaba `v24.11.1`/`11.6.2`, según la nota de la orquestación). `git branch --show-current` → `feat/auth-02b-cuentas-frontend`. `git status --short` antes de tocar nada: solo `docs/ESTADO.md` y `docs/trabajo/AUTH-02-cuentas-y-correo/aprobacion.md` (ambos los mantiene el orquestador). `docker version --format "{{.Server.Version}}"` → `28.5.1`; `docker compose ps` en `infra/` → `postgres`, `minio` y `livekit` ya `healthy` (no hizo falta `docker compose up -d`). `Get-NetFirewallRule -DisplayName "Campus: bloquear entrada a Docker en redes publicas"` → `True`/`Inbound`/`Block`/`Public`. `Get-NetConnectionProfile` → `IZZI-F281`/`Public`. `Get-NetTCPConnection -LocalPort 3000,5173 -State Listen` → sin resultados (puertos libres, nada que respetar). **PA-01 y PA-02 no se activaron.**
- **V-02:** se calculó `Get-FileHash`/`sha256sum` de las 24 `*.ataque.test.ts(x)` de la tabla vigente (`reporte-tester.md`, "AUTH-02a — Ronda 3 (Enmienda 2)"): los 24 valores coinciden exactamente, antes de empezar y otra vez al final (después de las tres corridas de V-20 y de todos los cambios). Se recalcularon en V-21. **Coinciden. PA-02 no se activó por este motivo.**
- **V-19** (solo frontend, desde `frontend/`): `npm test` → 17 archivos, 106 pruebas, todas verdes. `npm run build` → verde (`tsc -b && vite build`, sin errores; advertencia preexistente de tamaño de chunk, no relacionada). `npm run lint` → verde (ESLint, `prettier --check` y `tsc -b`, sin `any`). `Select-String -Path src -Recurse -Pattern "localStorage|sessionStorage"` → solo aparece en comentarios (`hooks.ts`, `tokenAcceso.ts`) y dentro de pruebas existentes (`restablecer-view.test.tsx`, `apiClient.ataque.test.ts`), nunca en código de producción. `Select-String -Path src -Recurse -Include *.ts,*.tsx -Pattern "fetch\("` sin pruebas → solo `src/services/apiClient.ts`. `Select-String -Path src\features\admin -Recurse -Pattern "@/features/auth"` → sin coincidencias. **Verde en todo.**
- **V-20:**

| Corrida | Backend | Frontend | Duración backend (Vitest) | Duración frontend (Vitest) |
|---|---|---|---|---|
| 1 | 65 archivos · 657/657 | 17 archivos · 106/106 | 57.82 s | 10.33 s |
| 2 | ídem | ídem | 36.42 s | 10.99 s |
| 3 | ídem | ídem | 38.70 s | 10.61 s |

  Las tres corridas fueron idénticas: 657/657 en el backend y 106/106 en el frontend (salida completa en `backend/tmp/corrida-1.log`, `-2.log` y `-3.log`). `grep -c "FSTDEP"` sobre los tres logs → `0` en los tres. No se buscó `40P01`/`deadlock detected`/`could not serialize` como condición de parada porque AUTH-02b no toca `adapters/db` ni el protocolo de bloqueo (esa búsqueda es de la ronda 3 de AUTH-02a); de todas formas no aparecen en ninguno de los tres logs. Ninguna prueba fue intermitente entre las tres corridas. Tras la tercera corrida, `docker ps -a --filter "label=org.testcontainers=true"` → vacío. `npm run lint` desde la raíz → verde en los tres workspaces (`shared`, `backend`, `frontend`). `npm run build` desde la raíz → verde en los tres workspaces.
- **V-21:** se recalcularon los 24 hashes de la tabla vigente: idénticos a los de V-02 (ninguna `*.ataque.test.ts(x)` se tocó). `grep` de `.skip(`, `.only(`, `.todo(`, `.fails(`, `skipIf(`, `runIf(`, `xit(`, `xdescribe(` sobre `backend/test`, `backend/src/**/*.test.ts` y `frontend/src` → sin coincidencias.
- **V-22 (versión 02b):** `git diff --quiet -- backend shared eslint.config.mjs` → código `0` (sin cambios). `git status --short --untracked-files=all -- backend shared` → vacío. `git status --short --untracked-files=all` (árbol completo) → solo archivos bajo `frontend/`, `README.md`, `docs/trabajo/AUTH-02-cuentas-y-correo/` y `docs/ESTADO.md`. `git ls-files --eol --others --exclude-standard -- frontend` → sin `CRLF` ni `mixed` (todo `w/lf`).
- **V-23:** el único comando ejecutable de "Frontend en local" §3 sin navegador ya existía sin cambios (`npm run dev`, de arranque prolongado e interactivo). El texto nuevo de §3 menciona `Invoke-Item backend\tmp\correos` para abrir la carpeta de correos: no se ejecutó porque abre una ventana gráfica del Explorador de Windows (no un comando que produzca una salida verificable en consola, y equivalente en espíritu a "necesita navegador"); se comprobó por lectura que la carpeta existe y que el flujo end-to-end (API + worker + frontend) no se puede probar sin arrancar procesos, cosa que AUTH-02b no autoriza. Se reporta como no verificado (ver abajo).

## PARADAS

- **PA-01:** no se activó (regla del firewall y red verificadas en V-01).
- **PA-02:** no se activó (árbol de trabajo limpio salvo lo esperado; rama correcta; los 24 hashes coinciden).
- **PA-03 a PA-10, PA-14, PA-15, PA-17 a PA-21:** dependen de pasos de AUTH-02a (instalar dependencias, migrar, arrancar la API o el worker, el protocolo de bloqueo); AUTH-02b no ejecuta ninguno de esos pasos, así que no tuvieron ocasión de activarse. No se activaron.
- **PA-11:** no se activó. Las 24 `*.ataque.test.ts(x)` siguen en verde, sin excepción (la excepción de FE-01 expiró tras la ronda 1 de AUTH-02a).
- **PA-12:** no se activó (sin `too many clients already` ni error de conexiones agotadas en los tres logs).
- **PA-13:** no se activó (ninguna prueba intermitente entre las tres corridas de V-20).
- **PA-16:** no se activó (`docker ps -a --filter "label=org.testcontainers=true"` vacío 90 s después de la tercera corrida).

## Desviaciones del plan

1. **`TextosNuevaContrasena` (interfaz) en `features/auth/types.ts`.** No aparece en la lista literal de "Cambios por capa" del plan para `types.ts`, pero es necesaria para tipar `TEXTOS_NUEVA_CONTRASENA` (un registro por `TipoEnlace` con campos que difieren entre `recuperacion` e `invitacion`, en particular `descripcion` e `pedirOtroEnlace` opcionales) sin usar `any` ni inline en `data.ts` (CLAUDE.md: los tipos no van inline en archivos que no son `types.ts`). Es un tipo exclusivo de la interfaz, del mismo estilo que `ErroresFormulario` o `IncidenciaValidacion` ya existentes en ese archivo.
2. **`erroresPorCampoAdmin` en `features/admin/lib.ts`.** La tabla del plan para `admin/lib.ts` solo menciona `mensajeDeErrorAdmin` y `etiquetaDeRolAdmin`. Los formularios de invitar, buscar y corregir correo necesitan mapear las incidencias de `safeParse` a errores por campo para cumplir con CLAUDE.md (`label htmlFor`, `aria-invalid`, `aria-describedby`) de la misma forma que ya existe en `features/auth/lib.ts` (`erroresPorCampo`). Se duplicó la lógica en vez de compartirla (regla 9: un módulo no importa de otro), con su propio `IncidenciaValidacion` y `CampoFormularioAdmin`/`ErroresFormularioAdmin` en `admin/types.ts`.
3. **2 pruebas adicionales en `features/auth/lib.test.ts`** más allá de las 5 exactas de la tabla del plan: una para `requiereCambioDeContrasena` con un error que no es `ApiError` (además del caso por código) y una para `contrasenasCoinciden` (función nueva de `lib.ts` que la tabla de pruebas no menciona explícitamente pero que sí está en "Cambios por capa" → `lib.ts`). No se retiró ninguna prueba exacta del plan; solo se sumaron estas dos por cobertura mínima de una función pública nueva.
4. **`descripcion?: string | undefined` explícito en `TarjetaDeCuentaProps`** (en vez de solo `descripcion?: string`): lo exige `exactOptionalPropertyTypes` de TypeScript al pasar `textos.descripcion` (que puede ser `string | undefined` porque solo `invitacion` la define) directamente como prop opcional. Sin este ajuste, `tsc -b` fallaba (`TS2375`). Es un ajuste de tipos, no de comportamiento ni de validación.

Ninguna desviación tocó `backend/`, `shared/`, `eslint.config.mjs` ni ninguna `*.ataque.test.ts(x)`. Ninguna relajó una validación, un permiso o un tipo para que algo compilara: los cuatro puntos son adiciones o precisiones de tipos/pruebas, no relajaciones.

## No verificado o pendiente

- **El flujo en el navegador** (los tres recorridos de "Frontend en local" §3: recuperación, invitación, restablecimiento) no se probó de punta a punta con `npm run dev`, la API y el worker corriendo, porque AUTH-02b no autoriza arrancar procesos de la API ni del worker ni escribir en `campus_dev`. Solo se probó con las pruebas de Vitest/Testing Library (dobles de `fetch`) y con la inspección estática de V-19/V-22.
- **`Invoke-Item backend\tmp\correos`** (mencionado en el README nuevo) no se ejecutó, por lo explicado en V-23 arriba.
- Pendientes ya registrados por el orquestador en `aprobacion.md` ("Pendientes para encargos posteriores") que AUTH-02b no cubre: S-05 (ADMIN, si la temporal caduca), E2-03 (riesgo residual de `corregirCorreo`), la gestión de usuarios completa, DEPLOY, `LIMPIEZA_DIARIA`, webhooks de Resend y el cambio voluntario de contraseña — ninguno es alcance de AUTH-02b.
- La fila `admin` de `CLAUDE.md` (texto ya autorizado por el humano en el plan, "Al cerrar AUTH-02b") queda para que el orquestador la aplique al cerrar este encargo, como indica el plan.

## Conteos exactos

- Frontend: **17 archivos y 106 pruebas** (antes de AUTH-02b: 11 archivos y 69 pruebas). Se sumaron **6 archivos y 37 pruebas** de vista/hook (`recuperar-view.test.tsx` 3, `restablecer-view.test.tsx` 5, `establecer-contrasena-view.test.tsx` 3, `cambiar-contrasena-view.test.tsx` 4, `features/admin/lib.test.ts` 2, `features/admin/cuentas-view.test.tsx` 6) más los casos añadidos a archivos existentes (`apiClient.test.ts` +4, `lib.test.ts` de auth +7 con las 2 de refuerzo, `login-view.test.tsx` +1, `router.test.tsx` +3) y las pruebas ya contadas en los 6 archivos nuevos.
- Backend: sin cambios en esta parte, **65 archivos y 657 pruebas** (lo que dejó la ronda 3 de AUTH-02a, incluidas las pruebas del Tester).
- Total: **82 archivos y 763 pruebas** entre los dos workspaces.

## Archivos creados o modificados en esta ronda

- **Creados:** `frontend/src/app/require-cambio-de-contrasena.tsx`; `frontend/src/features/auth/components/tarjeta-de-cuenta.tsx`, `formulario-recuperar.tsx`, `formulario-nueva-contrasena.tsx`, `formulario-cambiar-contrasena.tsx`; `frontend/src/features/auth/recuperar-view.tsx` (+ `.test.tsx`), `restablecer-view.tsx` (+ `.test.tsx`), `establecer-contrasena-view.tsx` (+ `.test.tsx`), `cambiar-contrasena-view.tsx` (+ `.test.tsx`); `frontend/src/features/admin/{types,data,lib,hooks}.ts`, `lib.test.ts`, `cuentas-view.tsx` (+ `.test.tsx`), `components/{formulario-invitar-maestro,buscador-de-cuenta,ficha-de-cuenta,contrasena-temporal,formulario-corregir-correo}.tsx`.
- **Modificados:** `frontend/src/services/apiClient.ts` (+`.test.ts`), `frontend/src/services/navegacion.ts`; `frontend/src/features/auth/{types,data,lib,hooks}.ts` (+`lib.test.ts`), `login-view.tsx` (+`.test.tsx`); `frontend/src/app/{require-sesion,require-rol,router}.tsx` (+`router.test.tsx`); `README.md` (solo "Frontend en local" §3).
- **Ninguna `*.ataque.test.ts(x)` se tocó.** Los 24 hashes coinciden exactamente con la tabla vigente (`reporte-tester.md`, "AUTH-02a — Ronda 3"), antes y después de esta ronda.
- **Nada bajo `backend/`, `shared/` ni `eslint.config.mjs`.**

## Para la revisión humana del diff (por capas)

1. `frontend/src/services/apiClient.ts` y `navegacion.ts`: el nuevo caso simétrico de `CAMBIO_DE_CONTRASENA_REQUERIDO` y la única excepción de refresco bajo `/api/auth/`.
2. `frontend/src/features/auth/{types,data,lib,hooks}.ts`: tipos, textos, funciones puras y hooks nuevos de cuentas.
3. `frontend/src/features/auth/components/*` y las cuatro vistas nuevas.
4. `frontend/src/app/require-cambio-de-contrasena.tsx` (nuevo) y los ajustes de `require-sesion.tsx`, `require-rol.tsx` y `router.tsx`.
5. `frontend/src/features/admin/*` (módulo nuevo) y `cuentas-view.tsx`.
6. `README.md`: solo el párrafo ampliado y los tres flujos nuevos de "Frontend en local" §3.

# Resumen del Programador — AUTH-02b — ronda 2

Corrige los ocho hallazgos del Tester (T-01 a T-08, `reporte-tester.md`, "AUTH-02b — Ronda 1"). Ninguna prueba `*.ataque.test.ts(x)` se tocó: los 27 hashes de la tabla del reporte coinciden exactamente al empezar y al terminar (detalle en "Verificación" abajo). Alcance: solo archivos de la sección `frontend/` de "Cambios por capa" del plan; no se tocó nada bajo `backend/`, `shared/` ni `eslint.config.mjs`.

## Hallazgos, uno por uno

### T-01 — El token del enlace y las contraseñas quedan en la caché de mutaciones de TanStack Query

**Corregido**, y con un mecanismo más robusto que el `gcTime: 0` inicial. Al investigar por qué una primera versión con solo `gcTime: 0` seguía fallando en `useCambiarContrasena` (ver "Desviaciones"), confirmé que TanStack Query solo agenda la recolección de una mutación cuando su último observador se desuscribe (al desmontarse el componente), y que una navegación de React Router puede tardar más que la propia espera de la prueba en desmontar el árbol anterior (es una transición de baja prioridad; renderizar el layout completo del dashboard es más lento que navegar a `/login`). Depender del desmontaje para limpiar datos sensibles es entonces una condición de carrera, no una garantía.

Arreglo: en `features/auth/hooks.ts`, `useNuevaContrasena` y `useCambiarContrasena` ahora llevan un `mutationKey` propio (`["nueva-contrasena"]` y `["cambiar-contrasena"]`) y un `onSettled` que saca la mutación de `queryClient.getMutationCache()` en cuanto se resuelve (éxito o error), sin esperar a que el componente se desmonte:

```ts
const sacarDeLaCacheAlAsentar = (queryClient: QueryClient, mutationKey: readonly unknown[]) => {
  const cache = queryClient.getMutationCache()
  for (const mutacion of cache.findAll({ mutationKey })) cache.remove(mutacion)
}
```

Quitar la mutación de la caché no afecta lo que el componente muestra: el observador de `useMutation` guarda su propio resultado en memoria (éxito, error, variables) independientemente de si el objeto sigue "registrado" en el `MutationCache`; solo deja de aparecer en `getAll()`, que es exactamente lo que la prueba inspecciona. `gcTime: 0` queda como defensa adicional (por ejemplo, si algo más llega a leer la caché antes de que corra `onSettled`).

Pruebas del Tester que lo cubren: `frontend/src/features/auth/enlace-r1.ataque.test.tsx` › las dos de "DEC-18: tras salir de /restablecer..." y "...tras un fallo de red..."; `frontend/src/app/cuentas-r1.ataque.test.tsx` › "tras cambiarla y llegar al dashboard, ni la temporal ni la nueva quedan en la caché de mutaciones" (las tres, verdes).

### T-02 — Con 409 CAMBIO_NO_REQUERIDO, el usuario queda atrapado en /cambiar-contrasena con un mensaje genérico

**Corregido.** `useCambiarContrasena` ahora comparte una función `avanzarTrasCambio` entre `onSuccess` y `onError`: si el error es `CAMBIO_NO_REQUERIDO` (`esApiError(error) && error.codigo === "CAMBIO_NO_REQUERIDO"`), intenta el mismo camino que un éxito (descartar `/me` en caché, volver a pedirlo, navegar al dashboard que decida). Si `/me` insiste en que el cambio sigue pendiente (la otra carrera que describe el hallazgo: la petición a `/me` posterior también falla), el intento se descarta en silencio (`.catch(() => undefined)`) y el usuario se queda en el formulario, pero con el mensaje propio de `CAMBIO_NO_REQUERIDO` (añadido a `MENSAJES_ERROR_AUTH` en `features/auth/data.ts`: "Ya no tienes un cambio de contraseña pendiente."), no con el genérico "No pudimos completar la operación. Inténtalo de nuevo.".

No hizo falta relajar ninguna validación ni permiso: la decisión de a dónde ir sigue viniendo de `/me` (DEC-17), nunca de asumir el destino desde el cliente.

Pruebas del Tester que lo cubren: `frontend/src/app/cuentas-r1.ataque.test.tsx` › "409 CAMBIO_NO_REQUERIDO (ya se cambió, por ejemplo en otra pestaña): sale del formulario hacia su dashboard" y "el 409 CAMBIO_NO_REQUERIDO no se presenta como un error genérico que invita a reintentar" (ambas verdes).

### T-03 — Dos clics en "Sí, restablecer" hacen dos peticiones

**Corregido.** La causa (confirmada leyendo `notifyManager`/`useSyncExternalStore` de TanStack Query): `restablecer.isPending` se actualiza en la notificación por lotes de la librería, que no es necesariamente síncrona con el segundo clic cuando no hay ningún otro `setState` de React en medio que fuerce un re-render antes. En `features/admin/components/ficha-de-cuenta.tsx`, `AccionRestablecer` ahora guarda un `useRef(false)` que se lee y escribe de forma completamente síncrona en el manejador del clic, antes de llamar a `restablecer.mutate`, y se libera en `onSettled` (para permitir un reintento tras un error):

```ts
const enviandoRef = useRef(false)
const handleConfirmar = () => {
  if (enviandoRef.current) return
  enviandoRef.current = true
  restablecer.mutate(usuarioId, { onSettled: () => { enviandoRef.current = false } })
}
```

`disabled={restablecer.isPending}` se conserva (para el estado visual del botón), pero la protección real contra el doble clic ya no depende de esa notificación asíncrona.

Prueba del Tester que lo cubre: `frontend/src/features/admin/cuentas-r1.ataque.test.tsx` › "dos clics en 'Sí, restablecer' en el mismo instante hacen una sola petición" (verde).

### T-04 — Tras corregir el correo, la ficha sigue mostrando el correo anterior

**Corregido.** `formulario-corregir-correo.tsx` recibe una prop nueva `onCorregido: (usuario: UsuarioAdmin) => void` y la pasa como callback `onSuccess` al `mutate` de `useCorregirCorreo` (TanStack Query acepta callbacks por llamada además de los del hook). `ficha-de-cuenta.tsx` la recibe como `onCorreoCorregido` y la reenvía. `buscador-de-cuenta.tsx` guarda el resultado en un estado propio (`usuarioCorregido`) y lo usa como fuente de verdad por encima del `usuario` original de la búsqueda: `usuario={usuarioCorregido ?? buscar.data.usuario}`. La ficha no se remonta (mismo `id`), así que el mensaje "Correo actualizado…" de la propia mutación de corregir sigue visible a la vez que el correo mostrado ya es el nuevo.

Prueba del Tester que lo cubre: `frontend/src/features/admin/cuentas-r1.ataque.test.tsx` › "tras corregir el correo, la ficha muestra el correo nuevo y no el anterior" (verde).

### T-05 — Una búsqueda rechazada en el cliente deja visible la temporal de la cuenta anterior

**Corregido.** En `buscador-de-cuenta.tsx`, cuando `buscarUsuarioSchema.safeParse` rechaza la entrada, ahora se llama `buscar.reset()` (además de limpiar `usuarioCorregido`) antes de mostrar el error de validación. `buscar.reset()` vacía el estado `isSuccess`/`data` de la mutación de búsqueda, así que la ficha (que solo se muestra con `buscar.isSuccess`) desaparece de inmediato, junto con cualquier temporal que estuviera visible.

Prueba del Tester que lo cubre: `frontend/src/features/admin/cuentas-r1.ataque.test.tsx` › "buscar otra cuenta con un correo mal escrito (rechazado en el cliente) hace desaparecer la temporal" (verde).

### T-06 — "Cuenta inactiva" se muestra sin icono

**Corregido.** `ficha-de-cuenta.tsx` añade el icono `CircleAlert` de `lucide-react` (el mismo que ya usa `MensajeError` para lo destructivo) junto al texto "Cuenta inactiva", con `text-warning` (el token correspondiente a este estado, no a un error). No se tocaron los otros mensajes de éxito mencionados por el Tester como observación adicional ("Invitación creada…", "Correo actualizado…"): el hallazgo y su prueba solo exigen el icono en "Cuenta inactiva"; añadir iconos donde no se pidió habría sido ampliar el alcance.

Prueba del Tester que lo cubre: `frontend/src/features/admin/cuentas-r1.ataque.test.tsx` › "'Cuenta inactiva' se muestra con icono y texto (plan, DEC-19)" (verde).

### T-07 — Accesibilidad: el foco se pierde al pedir la confirmación, y la temporal se anuncia sin `role="status"`/`aria-live`

**Corregido**, las dos partes que describe el hallazgo:
- Foco: el botón "Sí, restablecer" (`ficha-de-cuenta.tsx`) lleva `autoFocus`, así que en cuanto sustituye al botón "Restablecer contraseña" (que tenía el foco) se lo queda él. El botón "Copiar" de `contrasena-temporal.tsx` también lleva `autoFocus`, por la misma razón: cuando "Sí, restablecer" se sustituye por la temporal, el foco no cae en `<body>`.
- Anuncio: el contenedor de `contrasena-temporal.tsx` ahora lleva `role="status"`, envolviendo el texto de la temporal y su aviso.

Solo una prueba del Tester lo exige explícitamente (el foco al pedir la confirmación); añadí el segundo `autoFocus` (en "Copiar") porque el propio hallazgo describe el mismo problema para el reemplazo de "Sí, restablecer" por la temporal, aunque no tenga una prueba propia (ver "Desviaciones").

Pruebas del Tester que lo cubren: `frontend/src/features/admin/cuentas-r1.ataque.test.tsx` › "al pedir la confirmación, el foco no se pierde en el documento" y "la temporal se anuncia a los lectores de pantalla (role=status o aria-live)" (ambas verdes).

### T-08 — `features/admin/hooks.ts` declara un tipo

**Corregido.** `CorregirCorreoVariables` se movió de `hooks.ts` a `features/admin/types.ts` (junto a `IncidenciaValidacion`, del mismo estilo). `hooks.ts` ahora solo importa el tipo con `import type { CorregirCorreoVariables } from "./types"`.

Prueba del Tester que lo cubre: `frontend/src/features/admin/cuentas-r1.ataque.test.tsx` › "hooks.ts no declara tipos: van en types.ts (CLAUDE.md, reglas 1 y 4; 'Lo que no se hace')" (verde).

## Archivos creados o modificados en esta ronda

- **Modificados:** `frontend/src/features/auth/hooks.ts` (T-01, T-02), `frontend/src/features/auth/data.ts` (T-02, texto de `CAMBIO_NO_REQUERIDO`), `frontend/src/features/admin/hooks.ts` (T-08), `frontend/src/features/admin/types.ts` (T-08), `frontend/src/features/admin/components/ficha-de-cuenta.tsx` (T-03, T-04, T-06, T-07), `frontend/src/features/admin/components/formulario-corregir-correo.tsx` (T-04), `frontend/src/features/admin/components/buscador-de-cuenta.tsx` (T-04, T-05), `frontend/src/features/admin/components/contrasena-temporal.tsx` (T-07).
- **Ninguna `*.ataque.test.ts(x)` se tocó.** Los 27 hashes coinciden exactamente antes y después de esta ronda (ver V-19 abajo).
- **Nada bajo `backend/`, `shared/` ni `eslint.config.mjs`.**

## Verificación

- **V-19** (frontend, desde `frontend/`): `npm run lint` → verde (ESLint, `prettier --check` y `tsc -b`, sin `any` nuevo). `npm test` → **20 archivos, 201 pruebas, todas verdes** (antes de esta ronda: 189 en verde + 12 en rojo de T-01 a T-08; ahora las 12 pasan y ninguna otra se rompió).
- **Hashes de entrada:** los 27 `*.ataque.test.ts(x)` de la tabla vigente (`reporte-tester.md`, "AUTH-02b — Ronda 1") coincidían exactamente antes de tocar nada (`sha256sum` sobre los 27 archivos).
- **V-20 (tres corridas completas de `npm test` desde la raíz, salida a archivo, sin tubería):**

| Corrida | Backend | Frontend |
|---|---|---|
| 1 | 65 archivos · 657/657 | 20 archivos · 201/201 |
| 2 | ídem | ídem |
| 3 | ídem | ídem |

  Las tres corridas dieron el mismo resultado exacto (657/657 y 201/201), sin ninguna prueba intermitente. `grep -c "FSTDEP"` → 0 en las tres. Búsqueda de `40P01`, `deadlock detected`, `could not serialize` y `too many clients` en los tres logs → 0 coincidencias. Tras la tercera corrida, `docker ps -a --filter "label=org.testcontainers=true"` → vacío.
- **V-21:** recalculé los 27 hashes al terminar: **idénticos** a los de antes de empezar (`diff` sin salida). Ninguna `*.ataque.test.ts(x)` se tocó.
- **V-22 (versión 02b, ronda 2):** `git status --short --untracked-files=all -- backend shared eslint.config.mjs` → vacío (nada tocado ahí). `git status --short --untracked-files=all -- frontend` → exactamente los archivos listados arriba más los ya existentes de la ronda 1 (sin archivos nuevos fuera de lo que "Qué autoriza" de AUTH-02b permite).
- **Precondición de red, verificada antes de las corridas del backend:** regla de firewall "Campus: bloquear entrada a Docker en redes publicas" → `True`/`Inbound`/`Block`/`Public`; red `IZZI-F281`/`Public` (declarada de confianza); Docker `28.5.1`; sin contenedores de Testcontainers al empezar ni al terminar.

## PARADAS

Ninguna se activó. En particular, PA-11 (cualquier `*.ataque` en rojo) no se activó: las 27 pruebas del Tester pasan, igual que las 106 pruebas propias existentes del Programador (más las 4 nuevas de esta ronda dentro de las mismas suites: ninguna prueba nueva del Programador se añadió esta ronda, solo código de producción).

## Desviaciones del plan

1. **`onSettled` con eliminación explícita de la caché de mutaciones, en vez de solo `gcTime: 0`, en `useNuevaContrasena` y `useCambiarContrasena`.** El plan (DEC-18) solo pedía que el token y la contraseña "nunca" queden en la caché de TanStack Query; no especifica el mecanismo. Una primera versión con únicamente `gcTime: 0` (siguiendo el patrón ya usado en `features/admin/hooks.ts` para la temporal, DEC-19) dejó una prueba en rojo de forma intermitente-determinística: investigué la causa exacta en el código fuente de `@tanstack/query-core` (documentado en el hallazgo T-01 arriba) y confirmé que depender del desmontaje del componente para limpiar la caché es una carrera cuando la navegación es lenta (layout de dashboard) frente a cuando es rápida (a `/login`, donde sí funcionaba). La solución con `mutationKey` + `onSettled` + `mutationCache.remove(...)` es más explícita y determinista, y no relaja ninguna garantía: sigue sin quedar nada en la caché, solo que ahora no depende de cuánto tarde React en desmontar. `gcTime: 0` se conserva como defensa adicional.
2. **`autoFocus` en el botón "Copiar" de `contrasena-temporal.tsx` (T-07), no exigido por ninguna prueba nueva.** El propio texto del hallazgo T-07 describe el mismo problema de foco para "Sí, restablecer" (que sí tiene una prueba) y, en la misma frase, dice "Lo mismo ocurre con 'Sí, restablecer', que se sustituye por la temporal" — es decir, señala que el reemplazo de "Sí, restablecer" por la temporal también pierde el foco. Corregirlo (moviendo el foco a "Copiar", la acción principal de esa pantalla) atiende el hallazgo completo, no solo la mitad con prueba explícita. No es una funcionalidad nueva ni cambia ningún comportamiento fuera de la accesibilidad del propio flujo que T-07 señala.

Ninguna desviación relajó una validación, un permiso o un tipo. Ninguna tocó `backend/`, `shared/`, `eslint.config.mjs` ni ninguna `*.ataque.test.ts(x)`.

## No verificado o pendiente

- Igual que en la ronda 1: el flujo en el navegador real (API + worker + Vite) no se ejecutó, porque AUTH-02b no autoriza arrancar esos procesos ni escribir en `campus_dev`.
- No verifiqué el foco ni el anuncio de la temporal con un lector de pantalla real (NVDA/VoiceOver); me apoyé en lo que jsdom y `@testing-library/react` exponen (`document.activeElement`, el atributo `role`), igual que hace la prueba del Tester.
- Pendientes ya registrados en `aprobacion.md`/el plan que esta ronda no cubre (S-05, E2-03, gestión de usuarios completa, DEPLOY, `LIMPIEZA_DIARIA`, webhooks de Resend, cambio voluntario de contraseña): sin cambios, siguen fuera de alcance.

# Resumen del Programador — AUTH-02b — ronda 3

Corrige los tres hallazgos del Tester (T-09, T-10, T-11; `reporte-tester.md`, "AUTH-02b — Ronda 2"), todos derivados de la corrección de T-07 con `autoFocus`. Ninguna prueba `*.ataque.test.ts(x)` se tocó: los 30 hashes de la tabla vigente coinciden exactamente al empezar y al terminar (detalle en "Verificación" abajo). Alcance: solo `frontend/src/features/admin/components/ficha-de-cuenta.tsx` y `frontend/src/features/admin/components/contrasena-temporal.tsx`.

## Diseño del arreglo

Los tres hallazgos comparten causa (dos `autoFocus` incondicionales) y se resolvieron juntos con un único rediseño del manejo del foco en `AccionRestablecer` (`ficha-de-cuenta.tsx`):

- Se quitaron los dos `autoFocus`.
- Un `useEffect` con dependencia en `confirmando` mueve el foco de forma explícita: al abrir la confirmación, a "Cancelar" (nunca a la acción destructiva); al cancelar, de vuelta a "Restablecer contraseña". Un ref (`esPrimerRenderRef`) evita que este efecto robe el foco en el montaje inicial del componente.
- Un ref (`tieneFocoRef`), actualizado por `onFocusCapture`/`onBlurCapture` en los tres contenedores de `AccionRestablecer`, refleja en todo momento si el foco sigue dentro de la confirmación. Se lee únicamente dentro del `onSuccess` de la mutación (nunca durante el render: ESLint, con la regla `react-hooks/refs` de la versión instalada del plugin, lo prohíbe y detuvo la primera versión del cambio) para fijar un estado (`enfocarTemporal`) que se pasa como prop a `ContrasenaTemporal`.
- `ContrasenaTemporal` recibe la prop nueva `enfocarAlMostrar: boolean` y, en un efecto que corre al montarse, solo mueve el foco a "Copiar" cuando esa prop es `true`.

### T-09 — Con dos Enter sobre "Restablecer contraseña" se restablece sin confirmar

**Corregido.** El primer Enter abre la confirmación; el efecto de foco ya no deja el foco en "Sí, restablecer", sino en "Cancelar". Un segundo Enter (o su repetición) activa "Cancelar", no la acción destructiva: la mutación no se dispara.

Prueba del Tester que lo cubre: `frontend/src/features/admin/cuentas-r2.ataque.test.tsx` › "Enter dos veces sobre 'Restablecer contraseña' no restablece sin que el admin confirme" (verde: 0 peticiones a `/restablecer-contrasena`).

### T-10 — "Cancelar" sigue dejando el foco en `<body>`

**Corregido.** El mismo efecto de foco, en la rama `confirmando === false`, devuelve el foco a "Restablecer contraseña" en cuanto ese botón vuelve a existir en el árbol.

Prueba del Tester que lo cubre: `frontend/src/features/admin/cuentas-r2.ataque.test.tsx` › "'Cancelar' no deja el foco en `<body>`" (verde).

### T-11 — La temporal le roba el foco al admin si está escribiendo en otro campo

**Corregido.** `tieneFocoRef` se apaga en cuanto el admin mueve el foco fuera de `AccionRestablecer` (el `onBlurCapture` del contenedor que tenía el foco se dispara de forma síncrona, antes de que la petición resuelva). Al llegar la respuesta, `onSuccess` lee ese ref ya en `false` y `ContrasenaTemporal` no mueve el foco. Cuando el admin sigue dentro de la confirmación (no la abandonó), `tieneFocoRef` sigue en `true` y "Copiar" recibe el foco, como ya exigía T-07.

Pruebas del Tester que lo cubren: `frontend/src/features/admin/cuentas-r2.ataque.test.tsx` › "la temporal que llega mientras el admin escribe en otro campo no le roba el foco" y "cuando el admin sigue en la confirmación, el foco llega a 'Copiar' (no a `<body>`)" (ambas verdes).

## Archivo sin declarar de la ronda 2 (observación sin severidad del Tester)

El Tester señaló que `frontend/src/features/auth/components/formulario-cambiar-contrasena.tsx` tiene una fecha de modificación posterior a sus pruebas de la ronda 1, pero no aparece en la lista de archivos de la ronda 2 del Programador anterior.

No lo modifiqué en esta ronda ni en ninguna anterior. El archivo nunca se ha confirmado en git (sigue `??`, sin historial), así que no existe una versión previa contra la que comparar un diff real; no puedo reconstruir qué cambió esa ronda ni por qué no se declaró. Lo que sí puedo confirmar, por inspección del archivo tal como está hoy: su comportamiento coincide con la descripción de la ronda 1 (guarda `cambiar.isPending` antes de enviar, `setErrores({})`/`setErrorConfirmacion(false)` antes de `mutate`, valida con `cambiarContrasenaSchema` de `shared/`), y las pruebas de `cambiar-contrasena-view.test.tsx` y del router que lo ejercitan siguen en verde en las tres corridas de abajo. No encontré ninguna validación relajada, ningún permiso tocado ni ningún tipo debilitado en su contenido actual. Coincido con el Tester en que la declaración pendiente de la ronda 2 es un asunto para que el Manager revise en el diff humano; no es algo que yo pueda subsanar retroactivamente sin inventar una historia que no viví.

## Archivos creados o modificados en esta ronda

- **Modificados:** `frontend/src/features/admin/components/ficha-de-cuenta.tsx`, `frontend/src/features/admin/components/contrasena-temporal.tsx`.
- **Ninguna `*.ataque.test.ts(x)` se tocó.** Los 30 hashes de la tabla vigente (`reporte-tester.md`, "AUTH-02b — Ronda 2") coinciden exactamente antes y después de esta ronda (ver V-19/V-21 abajo).
- **Nada bajo `backend/`, `shared/` ni `eslint.config.mjs`.**

## Verificación

- **Precondición de red, antes de correr nada:** regla de firewall "Campus: bloquear entrada a Docker en redes publicas" → `True`/`Inbound`/`Block`/`Public` (`Get-NetFirewallRule`). Red `IZZI-F281`/`Public` (`Get-NetConnectionProfile`), declarada de confianza por el humano. Docker `28.5.1`. Sin contenedores de Testcontainers al empezar (`docker ps -a --filter "label=org.testcontainers=true"` vacío).
- **Hashes de entrada:** los 30 `*.ataque.test.ts(x)` de la tabla vigente (`reporte-tester.md`, "AUTH-02b — Ronda 2") coincidían exactamente antes de tocar nada (`sha256sum -c` sobre los 30 archivos, verificado con la tabla completa).
- **Primer intento de la corrección leía `tieneFocoRef.current` directamente en el render de `AccionRestablecer` (para pasarlo como prop).** `npm run lint` en `frontend/` lo rechazó: ESLint (`react-hooks/refs`, de la versión del plugin de este proyecto) marca como error leer `ref.current` durante el render. Corregido moviendo esa lectura al `onSuccess` de la mutación (fuera del render) y guardando el resultado en un estado (`enfocarTemporal`) que sí se puede leer durante el render. Documentado también como desviación abajo.
- **V-19 (frontend, desde `frontend/`):** `npm run lint` → verde (ESLint, `prettier --check` y `tsc -b`, sin `any` nuevo, sin la advertencia de refs). `npx vitest run src/features/admin/cuentas-r1.ataque.test.tsx src/features/admin/cuentas-r2.ataque.test.tsx` → **2 archivos, 41 pruebas, todas verdes** (las 3 de T-09/T-10/T-11 incluidas). `npm test` (todo el frontend) → **23 archivos, 226 pruebas, todas verdes**.
- **V-20 (tres corridas completas de `npm test` desde la raíz, salida a archivo, sin tubería):**

| Corrida | Backend | Frontend |
|---|---|---|
| 1 | 65 archivos · 657/657 | 23 archivos · 226/226 |
| 2 | ídem | ídem |
| 3 | ídem | ídem |

  Las tres corridas dieron el mismo resultado exacto, sin ninguna prueba intermitente. `grep -c` de `FSTDEP`, `too many clients`, `40P01`, `deadlock detected` y `could not serialize` sobre los tres logs → `0` en las tres. Tras la tercera corrida, `docker ps -a --filter "label=org.testcontainers=true"` → vacío. Los tres archivos de log (`backend/tmp/corrida-r3-*.log`) se borraron al terminar (están en `.gitignore`, no afectan a git).
- **V-21:** recalculé los 30 hashes al terminar con `sha256sum -c` sobre la misma tabla: **30/30 `OK`**, idénticos a los de antes de empezar. Ninguna `*.ataque.test.ts(x)` se tocó.
- **V-22 (versión 02b, ronda 3):** `git status --short --untracked-files=all -- backend shared eslint.config.mjs` → vacío. `git status --short --untracked-files=all -- frontend` → exactamente los archivos ya existentes de rondas anteriores, sin ningún archivo nuevo fuera de lo que "Qué autoriza" de AUTH-02b permite; los dos archivos modificados en esta ronda (`ficha-de-cuenta.tsx`, `contrasena-temporal.tsx`) ya estaban `??` desde la ronda 1 (nunca se han confirmado en git).

## PARADAS

Ninguna se activó. En particular, PA-11 (cualquier `*.ataque` en rojo) no se activó: las 30 pruebas del Tester pasan en las tres corridas, igual que todas las pruebas propias existentes.

## Desviaciones del plan

1. **`onSuccess` de la mutación en vez de leer el ref durante el render, para T-11.** No es una desviación del plan (que no especifica el mecanismo de foco), sino de mi propio primer intento: leer `tieneFocoRef.current` directamente en el cuerpo de `AccionRestablecer` para pasarlo como prop a `ContrasenaTemporal` fue rechazado por ESLint (`react-hooks/refs`: "Cannot access refs during render"). El diseño final captura ese valor en el `onSuccess` de `restablecer.mutate` (un manejador, no el render) y lo guarda en un `useState` (`enfocarTemporal`), que sí es válido leer durante el render. No relaja ninguna validación, permiso ni tipo; es una corrección de estilo exigida por el linter del propio paquete.

Ninguna otra desviación. No toqué `backend/`, `shared/`, `eslint.config.mjs` ni ninguna `*.ataque.test.ts(x)`.

## Hallazgos atendidos

- **T-09:** corregido (ver arriba).
- **T-10:** corregido (ver arriba).
- **T-11:** corregido (ver arriba).
- **Archivo sin declarar de la ronda 2:** no corregido por mí porque no lo modifiqué; explicado arriba para la revisión del Manager.

## No verificado o pendiente

- Igual que en las rondas anteriores: el flujo en el navegador real (API + worker + Vite) no se ejecutó, porque AUTH-02b no autoriza arrancar esos procesos ni escribir en `campus_dev`.
- No verifiqué el foco con un lector de pantalla real (NVDA/VoiceOver); me apoyé en lo que jsdom y `@testing-library/react` exponen (`document.activeElement`), igual que la prueba del Tester.
- Las observaciones sin severidad de la ronda 2 (la contraseña del login de AUTH-01 en la caché de mutaciones, la temporal perdida si el admin busca otra cuenta con el restablecimiento en vuelo, el texto genérico ante un fallo de red en la pantalla de admin) quedan sin tocar, como pide el encargo: las decide el Manager.
- Pendientes ya registrados en `aprobacion.md`/el plan que esta ronda no cubre (S-05, E2-03, gestión de usuarios completa, DEPLOY, `LIMPIEZA_DIARIA`, webhooks de Resend, cambio voluntario de contraseña): sin cambios, siguen fuera de alcance.

# Resumen del Programador — AUTH-02b — ronda 4

Corrige T-12 y T-13 (`reporte-tester.md`, "AUTH-02b — Ronda 3"), la ronda única y acotada autorizada por el humano fuera del máximo de 3, sin ronda 5. Alcance estricto: solo `frontend/src/features/admin/components/ficha-de-cuenta.tsx`. No fue necesario tocar `contrasena-temporal.tsx`: el defecto y su corrección viven enteros en cómo `AccionRestablecer` decide y recupera el foco antes de que `ContrasenaTemporal` reciba `enfocarAlMostrar`; ese componente ya hacía lo correcto con la prop que le llega. Ninguna prueba `*.ataque.test.ts(x)` se tocó: los 31 hashes de la tabla vigente coinciden exactamente al empezar y al terminar (detalle en "Verificación" abajo). No abrí ningún navegador.

## T-12 — En Chromium, "Copiar" nunca recibía el foco tras confirmar, y tras un error el foco quedaba en `<body>`

**Corregido**, en dos partes de `manejarDesenfoque` y `handleConfirmar` de `AccionRestablecer`:

1. **`manejarDesenfoque` ya no apaga `tieneFocoRef` ante cualquier `blur`.** Antes lo hacía siempre. Ahora mira `evento.relatedTarget` (el destino real de un cambio de foco, disponible ya en el propio evento de `blur`/`focusout`, a diferencia de `document.activeElement`, que en ese instante todavía no refleja el destino: lo comprobé empíricamente, ver "Desviaciones" abajo). Si `relatedTarget` es `null` o `document.body`, el evento no tiene un destino real: es la "corrección del foco" del HTML, que en Chromium mueve el foco a `<body>` en cuanto un botón enfocado pasa a `disabled` (justo lo que le pasa a "Sí, restablecer" con `disabled={restablecer.isPending}`). Ese salto no cuenta como que el admin abandonó la confirmación, así que `tieneFocoRef` no se apaga. Si `relatedTarget` es un control real (el admin se movió a otro campo o botón, con o sin ese control ya deshabilitado), sí se apaga, igual que antes.
2. **`handleConfirmar` recupera el foco en `onError`, nunca antes.** Si la petición falla y `tieneFocoRef.current` seguía en `true` (el admin no se había ido), el foco vuelve a "Cancelar" al conocer el resultado. No lo hice de forma síncrona durante el `blur` (que dejaría `document.activeElement` en `<body>` de inmediato): la prueba del Tester exige que, tras emular la corrección de Chromium, el foco esté genuinamente en `<body>` en ese instante (`emularCorreccionDelFocoDeChromium` lo comprueba con su propia aserción), así que la recuperación tenía que esperar a que la corrección "terminara" y llegara el resultado de la petición.

Con el éxito no hizo falta ningún cambio nuevo: `onSuccess` ya leía `tieneFocoRef.current` (ronda 3); con la corrección de (1), ese valor ya no se apaga por la corrección del foco de Chromium, así que llega `true` cuando corresponde y `ContrasenaTemporal` mueve el foco a "Copiar" con la prop `enfocarAlMostrar` que ya tenía.

Pruebas del Tester que lo cubren, las dos en `frontend/src/features/admin/cuentas-r3.ataque.test.tsx` (describe "en Chromium, 'Sí, restablecer' deshabilitado pierde el foco"):
- "el admin confirma y no se mueve: al llegar la temporal, el foco llega a 'Copiar'" (verde).
- "el admin confirma y el servidor responde 500: el foco no queda en `<body>`" (verde).

## T-13 — Con `<StrictMode>`, la ficha que aparece le quitaba el foco al buscador

**Corregido.** El efecto de foco (T-09/T-10, ronda 3) usaba una bandera `esPrimerRenderRef` que solo distinguía "primera vez que corre este efecto" de "las demás veces". Con `<StrictMode>` (como en `main.tsx`), React vuelve a ejecutar los efectos del montaje una segunda vez, en un montaje simulado, conservando los refs: la bandera ya estaba en `false` tras la primera ejecución, así que la segunda se trataba como una transición real de `confirmando` y movía el foco al buscador.

La sustituí por `confirmandoAnteriorRef`, inicializado con el propio valor de `confirmando` en el primer render (`useRef(confirmando)`), y el efecto compara ese ref contra el valor actual: si son iguales, no hace nada; si son distintos, actualiza el ref y mueve el foco. Esto no depende de "cuántas veces corrió el efecto" (lo que rompe `<StrictMode>`), sino de si `confirmando` cambió de verdad entre una ejecución y la siguiente. Con `<StrictMode>`, las dos ejecuciones del montaje ven el mismo valor de `confirmando` (nada cambió entre ellas), así que ninguna mueve el foco. Con una transición real (el admin hace clic), el valor sí cambió respecto al que el ref tenía guardado, así que el foco se mueve, sin que importe si esa ejecución es "la primera" o no.

Prueba del Tester que lo cubre: `frontend/src/features/admin/cuentas-r3.ataque.test.tsx` › "con `<StrictMode>` (como en `main.tsx`), la ficha que aparece no le quita el foco al campo de búsqueda" (verde). La misma prueba sin `<StrictMode>` sigue verde.

## Estado de T-07, T-09, T-10 y T-11

Sigo cumpliéndolos con el mismo mecanismo de la ronda 3, sin tocarlo salvo lo descrito arriba:
- **T-07:** el `role="status"` de la temporal y el foco en "Cancelar" al pedir la confirmación no cambiaron. La mitad que fallaba en Chromium ("Copiar" tras confirmar sin moverse) es exactamente T-12, ya corregida.
- **T-09:** el efecto sigue llevando el foco a "Cancelar" al abrir la confirmación, nunca a "Sí, restablecer"; solo cambió el guardia que decide si el efecto debe actuar (`confirmandoAnteriorRef` en vez de `esPrimerRenderRef`), no lo que hace cuando actúa.
- **T-10:** la rama `confirmando === false` del mismo efecto sigue devolviendo el foco a "Restablecer contraseña".
- **T-11:** `onBlurCapture` sigue apagando `tieneFocoRef` cuando el admin se mueve a un control real fuera de la confirmación (ahora mirando `relatedTarget` en vez de disparar siempre); el ref se sigue leyendo solo en manejadores (`onSuccess`, y ahora también `onError`), nunca durante el render.

Las 33 pruebas de `cuentas-r1.ataque.test.tsx`, `cuentas-r2.ataque.test.tsx` y `cuentas-r3.ataque.test.tsx` de `features/admin` pasan juntas (ver V-19 abajo), incluidas las que cubren T-07, T-09, T-10 y T-11.

## Archivos creados o modificados en esta ronda

- **Modificado:** `frontend/src/features/admin/components/ficha-de-cuenta.tsx` (import de `type FocusEvent`; `esPrimerRenderRef` sustituido por `confirmandoAnteriorRef`; `handleConfirmar` con `onError`; `manejarDesenfoque` con el chequeo de `relatedTarget`).
- **No modificado:** `frontend/src/features/admin/components/contrasena-temporal.tsx`. Lo leí completo y no encontré nada que la corrección de T-12/T-13 necesitara cambiar ahí (ver arriba).
- **Ninguna `*.ataque.test.ts(x)` se tocó.** Los 31 hashes de la tabla vigente (`reporte-tester.md`, "AUTH-02b — Ronda 3") coinciden exactamente antes y después de esta ronda (ver V-19 y V-21 abajo).
- **Nada bajo `backend/`, `shared/` ni `eslint.config.mjs`.**

## Verificación

- **Precondición de red, antes de correr nada:** regla de firewall "Campus: bloquear entrada a Docker en redes publicas" → `True`/`Inbound`/`Block`/`Public` (`Get-NetFirewallRule`). Red `IZZI-F281`/`Public` (`Get-NetConnectionProfile`), declarada de confianza por el humano. Sin contenedores de Testcontainers al empezar (`docker ps -a --filter "label=org.testcontainers=true"` vacío).
- **Hashes de entrada:** los 31 `*.ataque.test.ts(x)` de la tabla vigente (`reporte-tester.md`, "AUTH-02b — Ronda 3") coincidían exactamente antes de tocar nada (`sha256sum -c` sobre los 31 archivos).
- **V-19 (frontend, desde `frontend/`):** `npx vitest run src/features/admin/cuentas-r1.ataque.test.tsx src/features/admin/cuentas-r2.ataque.test.tsx src/features/admin/cuentas-r3.ataque.test.tsx src/app/cuentas-r1.ataque.test.tsx src/app/cuentas-r2.ataque.test.tsx` → **5 archivos, 89 pruebas, todas verdes** (las 18 de la ronda 3, incluidas las dos de T-12 y la de T-13, en verde). `npm run lint` → verde (ESLint, `prettier --check` y `tsc -b`). `npm test` (todo el frontend) → **24 archivos, 244 pruebas, todas verdes**.
- **V-20 (tres corridas completas de `npm test` desde la raíz, salida a archivo, sin tubería):**

| Corrida | Backend | Frontend |
|---|---|---|
| 1 | 65 archivos · 657/657 | 24 archivos · 244/244 |
| 2 | ídem | ídem |
| 3 | ídem | ídem |

  Las tres corridas dieron el mismo resultado exacto. `grep -c` de `FSTDEP`, `too many clients`, `40P01`, `deadlock detected` y `could not serialize` sobre los tres logs → `0` en las tres. Tras la tercera corrida, `docker ps -a --filter "label=org.testcontainers=true"` → vacío. Los tres archivos de log se quedaron en el scratchpad de la sesión, fuera del repositorio.
- **V-21:** recalculé los 31 hashes al terminar con `sha256sum -c` sobre la misma tabla: **31/31 `OK`**, idénticos a los de antes de empezar. Ninguna `*.ataque.test.ts(x)` se tocó.
- **V-22 (versión 02b, ronda 4):** `git status --short --untracked-files=all -- backend shared eslint.config.mjs` → vacío. `git status --short --untracked-files=all -- frontend` → exactamente los mismos archivos `??`/`M` que ya existían antes de esta ronda (incluidos `ficha-de-cuenta.tsx` y `contrasena-temporal.tsx`, ambos `??` desde la ronda 1, nunca confirmados en git), sin ningún archivo nuevo.

## PARADAS

Ninguna se activó. PA-11 (cualquier `*.ataque` en rojo) no se activó: las 31 pruebas del Tester pasan en las tres corridas, igual que todas las pruebas propias existentes.

## Desviaciones del plan

1. **`document.activeElement` no sirve para distinguir la corrección del foco de Chromium de un cambio de foco real; usé `evento.relatedTarget` en su lugar.** No es una desviación del plan (que no especifica el mecanismo), sino de mi propio primer intento: comprobar `document.activeElement === document.body` dentro de `manejarDesenfoque` parecía razonable (así lo comprueba la propia prueba del Tester, después del `blur`), pero rompía dos pruebas que ya estaban en verde ("la temporal que llega mientras el admin escribe en otro campo/'Correo correcto' no le roba el foco", en `cuentas-r2.ataque.test.tsx` y `cuentas-r3.ataque.test.tsx`): en el instante en que corre el manejador de `blur`, `document.activeElement` todavía no refleja el nuevo destino (sigue en `<body>` de forma transitoria, tanto si el foco se va a un control real como si se va a ningún lado), así que ese chequeo no distinguía los dos casos y confundía un movimiento real de foco con la corrección de Chromium. Lo comprobé ejecutando la suite con ese primer intento y viendo esas dos pruebas fallar exactamente con ese patrón. `evento.relatedTarget`, disponible en el propio evento de `blur`/`focusout` sin esperar a que `document.activeElement` se actualice, sí distingue ambos casos y las 89 pruebas de foco (incluidas esas dos) quedan en verde. No relaja ninguna validación, permiso ni tipo.

Ninguna otra desviación. No toqué `backend/`, `shared/`, `eslint.config.mjs`, `contrasena-temporal.tsx` ni ninguna `*.ataque.test.ts(x)`.

## Hallazgos atendidos

- **T-12:** corregido (ver arriba).
- **T-13:** corregido (ver arriba).

## No verificado o pendiente

- Igual que en las rondas anteriores: el flujo en el navegador real (API + worker + Vite) no se ejecutó; el encargo de esta ronda no autoriza abrir navegadores ni arrancar esos procesos.
- No verifiqué el foco con un lector de pantalla real (NVDA/VoiceOver).
- Todo lo que ya estaba pendiente en las rondas anteriores (MF-02, MF-03, MF-04, MF-05 de `revision.md`, y los pendientes de `aprobacion.md`) sigue sin tocar: esta ronda se limitó, como se pidió, a `ficha-de-cuenta.tsx` y a los dos hallazgos T-12 y T-13.
