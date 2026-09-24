# Plan — CHORE-01: pruebas de integración del backend con Testcontainers y `fastify-plugin ^6`
Estado: LISTO
Carril: normal, con aprobación escrita del humano (instrucción del humano para este encargo)
Requisitos: ninguno del PRD (chore de infraestructura de pruebas). Reglas: `AGENTS.md` 1 (capas), 9 (secretos), 10 (esquema solo por migraciones), 11 (proveedores), "Pruebas", "Reglas del equipo"; ESSENTIALS "Stack › Pruebas".
Antecedentes: `docs/trabajo/AUTH-01-autenticacion-basica/aprobacion.md` (M-05, D-01, "Encargos siguientes: CHORE-01"), `revision.md` (M-05, M-16, D-01, cierre), `reporte-tester.md` ("Cierre (M-13)", hashes); `docs/trabajo/DOCS-01-pendientes/resumen.md` (punto 21: CI y Testcontainers); `docs/trabajo/BACK-02-prisma-7/` (V-20: `env()` ansioso de `prisma.config.ts`).

## Flujo (fijado por el humano)
arquitecto → **aprobación escrita del humano** → `programador` → `manager` (modo final) → el humano revisa y decide el commit.
- **Sin ronda de Tester.** Única excepción: si una prueba `*.ataque.test.ts(x)` necesita un cambio para funcionar con el contenedor (PA-12), el orquestador invoca al Tester solo para ese ajuste, sin debilitar ninguna aserción.
- El Programador **nunca** modifica un `*.ataque.test.ts(x)`.
- Ningún agente ejecuta `git add`, `commit`, `push`, `restore` ni `stash`.

Según el análisis de este plan, **ninguna prueba del Tester necesita cambios** (tabla de DEC-06).

### Qué autoriza la aprobación de este plan (lista cerrada)

**Crear:**
- `backend/test/entorno-de-pruebas.ts`
- `backend/test/global-setup.ts`
- `docs/trabajo/CHORE-01-testcontainers/resumen-programador.md`
- Temporales propios en `backend/tmp/` (la carpeta está en `.gitignore`):
  - `vitest.guarda-campus-dev.config.ts`, `vitest.guarda-sin-base.config.ts` y `vitest.aserciones.config.ts`, que se **borran** al terminar su verificación y antes de cualquier `lint`;
  - `huella-*.txt`, `*.log` y `*.pid`, que pueden quedarse y se listan en el resumen.

**Modificar (solo esto):**

| Archivo | Alcance del cambio |
|---|---|
| `backend/package.json` | Dos cambios: `fastify-plugin` `^5.1.0` → `^6.0.0` en `dependencies`; `@testcontainers/postgresql` `^12.1.0` en `devDependencies` |
| `package-lock.json` | Lo regenera `npm install` |
| `backend/vitest.config.ts` | `globalSetup` |
| `backend/test/setup.ts` | Reescrito |
| `backend/test/admin-unico.integracion.test.ts` | Reescrito (sigue con 2 casos) |
| `backend/test/ayudas-auth.ts` | Solo el comentario de las líneas 14-16 |
| `backend/test/salud.integracion.test.ts` | Comentario de la línea 9 y mensaje de la línea 32 |
| `backend/test/auth-login.integracion.test.ts` | Comentario de la línea 14 |
| `backend/test/auth-registro.integracion.test.ts` | Comentario de la línea 20 |
| `README.md` | Solo "Backend en local": §1 (una frase) y §7 |

**Instalar:**
- Solo `@testcontainers/postgresql ^12.1.0` (devDependency) y `fastify-plugin ^6.0.0` (dependency), editando `backend/package.json` y con **un único** `npm install` desde la raíz.
- Se repite solo si ese `package.json` cambia otra vez durante el encargo.
- Prohibido:
  - `--legacy-peer-deps`, `--force`, `npm audit fix`, `npm update`, `npm dedupe` y `-g`;
  - `testcontainers` como dependencia directa (P-03) y cualquier otro paquete.

**Ejecutar (lista cerrada):**
- Desde la raíz:
  - `npm install`, `npm run lint`, `npm run build` y `npm test`;
  - `npm ls <paquetes>`, `npm ls --all`, `npm explain <paquete>` y `npm view <paquete>[@versión] <campos>`.
- Desde `backend/`:
  - `npm run build`, `npm run lint` y `npm test`;
  - `npx vitest run [archivos]`, `npx vitest run --config tmp/<config temporal>.ts [archivos]` y `npx vitest list`;
  - `npx eslint --config ../eslint.config.mjs test vitest.config.ts`, `npx prettier --check .`;
  - `npx prettier --write test vitest.config.ts`: la **única** forma de `--write` autorizada. Nunca `npm run format`, ni `--write .` desde la raíz, ni sobre otras rutas.
- Docker, solo lectura:
  - `docker version`, `docker ps`, `docker ps -a --filter "label=org.testcontainers=true" ...`, `docker image ls` y `docker inspect <id>`, este último solo sobre contenedores de Testcontainers.
- En `infra/`:
  - `docker compose ps`;
  - `docker compose up -d`, solo si `postgres` no está en marcha en V-01;
  - `docker compose exec -T postgres psql -U campus -d campus_dev -At -c "<consulta>"`, solo con las dos consultas `SELECT` de V-02 y V-17. Ninguna otra.
- Procesos:
  - `Start-Process` con `-RedirectStandardOutput`, `-RedirectStandardError` y `-PassThru`, solo en V-15;
  - `taskkill /PID <pid propio> /T /F`, `Get-NetTCPConnection` y `Get-Process -Id`.
- Variable de entorno temporal `DOCKER_HOST`, solo en V-16 y con la forma `try/finally` indicada.
- `Get-FileHash -Algorithm SHA256` o `sha256sum`.
- Lectura de archivos del repositorio y de `node_modules/`, con `Get-Content`, `Select-String`, `cat` o `grep`.
- git de solo lectura: `status`, `diff`, `log` y `ls-files`.

**No autoriza:**
- Tocar:
  - `backend/src/**`, `backend/prisma/**`, `backend/prisma.config.ts`, `backend/.env*`;
  - `backend/tsconfig.json`, `tsconfig.base.json`, `eslint.config.mjs`;
  - `.prettierrc.json`, `.prettierignore`, `.gitignore`, `.gitattributes`;
  - `shared/**`, `frontend/**`, `infra/**`;
  - `AGENTS.md`, `CLAUDE.md`, `.claude/**`, `docs/ARCHITECTURE*.md`, `docs/PRD.md`;
  - cualquier `*.ataque.test.ts(x)` y otras carpetas de `docs/trabajo/`.
- Cualquier comando `prisma` escrito a mano (los únicos son el `prisma generate` de los hooks `pre*` y el `migrate deploy` que ejecuta `global-setup.ts` contra el contenedor).
- En Docker:
  - `docker rm`, `docker stop`, `docker kill`, `docker compose down`, `docker system prune`;
  - `docker pull` a mano (Testcontainers descarga Ryuk solo);
  - apagar o reiniciar Docker Desktop.
- `TESTCONTAINERS_RYUK_DISABLED` o cualquier otra configuración de Testcontainers.
- Escrituras por `psql`.
- **Leer o imprimir `backend/.env` o `infra/.env`.**
- Terminar procesos que no arrancaste.
- Arrancar procesos de larga vida con una tubería (`|`): la salida va a un archivo de `backend/tmp/` y se guarda el PID.

**Orden obligatorio:**
- **No se ejecuta ninguna prueba del backend** (`npm test`, `npx vitest`, `npm test` desde la raíz) **antes de terminar el paso 9.**
- Motivo: hasta que `setup.ts` y `global-setup.ts` nuevos existan, cualquier corrida usaría la `DATABASE_URL` de `backend/.env` y escribiría en `campus_dev`.
- `npm run build` y `npm run lint` sí están permitidos antes, porque no ejecutan pruebas.

### PARADAS
Regla de `AGENTS.md`: "Cuando el plan dice detenerse ante una condición, te detienes aunque la alternativa parezca obvia o inofensiva. Resolverlo por tu cuenta es una desviación, aunque salga bien."
- El resumen del Programador responde **cada una** con "no se activó" o "se activó y me detuve", con la evidencia.
- Detenerse significa:
  - no seguir con el paso siguiente;
  - no intentar remedios fuera de este plan;
  - no borrar nada;
  - reportar al orquestador el comando, la salida y la hipótesis.

| # | Condición |
|---|---|
| PA-01 | V-01: `git status` muestra cambios fuera de `docs/trabajo/CHORE-01-testcontainers/`; Docker Desktop no responde; o los hashes de V-03 no coinciden con la tabla de V-03 |
| PA-02 | V-04: la última 12.x estable de `@testcontainers/postgresql` o de `testcontainers` no es `12.1.0`, o su `engines.node` no admite Node 24.11.1 |
| PA-03 | V-04: `fastify-plugin@6.0.0` declara `peerDependencies` o `engines` que Fastify 5.12.5 o Node 24.11.1 no cumplen. También si, ya instalado, `npm run build` o `npm run lint` del backend fallan en `backend/src/**` (corregirlo exigiría tocar `src/`) |
| PA-04 | `npm install` termina con código distinto de 0, pide `--legacy-peer-deps` o `--force`, o intenta compilar un módulo nativo **no opcional**. Los avisos de compilación de opcionales (por ejemplo `cpu-features` de `ssh2`) con código 0 se reportan y se sigue |
| PA-05 | Después de instalar, `npm ls fastify-plugin` muestra más de una copia |
| PA-06 | En el árbol (`npm ls --all`) aparece cualquier paquete cuyo nombre contenga `aws`, `firebase`, `supabase` o `vercel` |
| PA-07 | V-06: a `@testcontainers/postgresql` le falta la capacidad de fijar base, usuario o contraseña. Si solo cambia el **nombre** de un método, se ajusta esa llamada en `global-setup.ts` y se reporta como desviación |
| PA-08 | Testcontainers no arranca en Windows con su configuración por defecto (Ryuk incluido), o arrancarlo exige `TESTCONTAINERS_RYUK_DISABLED`, `~/.testcontainers.properties`, `DOCKER_HOST` u otra configuración |
| PA-09 | `inject("entornoDePruebas")` devuelve `undefined` en `setup.ts` aunque el `globalSetup` terminó bien. No se sustituye por herencia de `process.env` ni por `backend/.env` |
| PA-10 | La huella de `campus_dev` cambia en cualquier verificación (V-08, V-09, V-10, V-13, V-15, V-16, V-17), salvo el caso acotado de V-17b. No se limpia nada |
| PA-11 | V-08: la corrida forzada contra `campus_dev` no falla con el mensaje de la guarda, o llega a ejecutar alguna prueba |
| PA-12 | Una prueba `*.ataque.test.ts(x)` falla en una corrida con el contenedor. No se toca; se reportan el caso, el mensaje y la hipótesis (la excepción del humano: la ajusta el Tester) |
| PA-13 | `prisma migrate deploy` falla en el contenedor, aplica un número de migraciones distinto de 2, o pide crear o editar migraciones |
| PA-14 | `seed:admin` falla dentro del `globalSetup`, o hacer pasar la suite exigiría tocar un archivo fuera de "Modificar" |
| PA-15 | Una prueba del Programador falla de forma intermitente (el mismo código pasa y falla), o cualquier prueba falla en alguna de las tres corridas de V-13 |
| PA-16 | Algún contenedor con la etiqueta de Testcontainers sigue existiendo 120 s después de terminar o interrumpir una corrida. No se borra a mano |
| PA-17 | Aparece `too many clients already` o cualquier otro error de conexiones agotadas |
| PA-18 | El contenedor de infra (`postgres` de `docker compose ps`) aparece detenido o reiniciado sin que nadie lo pidiera, o cambia el estado de infra respecto de V-01 |
| PA-19 | V-11: una de las cinco pruebas que dependen del administrador (lista en V-11) termina **sin aserciones** |

## Preguntas bloqueantes
Ninguna. Toda decisión tiene un valor por defecto razonable. Las variantes de P-01 y P-02 están descritas para que el humano pueda elegirlas en la aprobación sin replanear.

## Preguntas no bloqueantes (con valor por defecto)
| # | Pregunta | Valor por defecto | Si el humano elige lo contrario |
|---|---|---|---|
| P-01 | ¿Quieres una salida explícita (`PRUEBAS_CONTRA_INFRA=1`) para correr las pruebas contra `campus_dev` al depurar? | **No.** Motivos en DEC-05: la salida reintroduciría justo lo que el encargo retira (escrituras en `campus_dev`, limpieza manual del README), y no resuelve ningún caso que la base desechable no cubra. Sin salida, la guarda es absoluta | Se aplica la "Variante P-01 = sí" (al final): una bandera leída en `global-setup.ts`, una excepción acotada en la guarda y una subsección del README con la limpieza manual. Se prueba sin escribir (V-22) |
| P-02 | ¿Agregar pruebas unitarias de la guarda (`test/entorno-de-pruebas.test.ts`, 4 casos: `campus_dev`, host no local, otra base, URL de la corrida)? | **No**, para respetar el criterio literal del humano: 395 pruebas, 326 en el backend. La guarda se demuestra de extremo a extremo en V-08 | Nuevo archivo con 4 casos; el criterio de cierre pasa a **399** (backend 31 archivos / 330) |
| P-03 | El encargo sugiere `testcontainers` y `@testcontainers/postgresql` como devDependencies directas. ¿Se declaran las dos? | **Solo `@testcontainers/postgresql`**: es el único que nuestro código importa. `testcontainers ^12.1.0` llega como su dependencia, y declararlo sin importarlo sería una dependencia muerta | Se añade también `"testcontainers": "^12.1.0"` en `devDependencies`. Nada más cambia |

## Suposiciones
- **S-01.** Node 24.11.1, npm 11.6.2 y Docker Desktop 28.5.1 en marcha. `postgres:17.11-trixie` ya está en la caché. Infra levantado (`campus_dev` en `127.0.0.1:5433`) y se sigue usando para el desarrollo; en este encargo solo sirve para medir la huella (V-02, V-17). Datos verificados por el orquestador el 2026-09-24.
- **S-02.** Vitest 4.1.11 (API leída en `node_modules/vitest/dist`):
  - Un archivo `globalSetup` con `export default` recibe el `TestProject` y puede devolver la función de cierre (`cli-api.CnMVyzaz.js:9346-9363` y `10809-10826`).
  - `TestProject.provide(clave, valor)` existe (`reporters.d.DtoKVV2s.d.ts:1971`).
  - `inject(clave)` lee `getWorkerState().providedContext[clave]` (`test.DNmyFkvJ.js:4164`), así que sirve en `setupFiles`.
  - `test.provide` existe como opción de configuración (`reporters.d:3188`), igual que `test.expect.requireAssertions` (`reporters.d:3196`).
  - Los procesos de prueba reciben `NODE_ENV = process.env.NODE_ENV || "test"` (`cli-api:3808`).
  - V-09 confirma todo esto en ejecución; si `inject` falla, se activa PA-09.
- **S-03.** `prisma@7.10.0` exporta `./build/index.js` en su `exports` (leído en `node_modules/prisma/package.json:100-106`), así que `createRequire(...).resolve("prisma/build/index.js")` resuelve el CLI sin shell.
- **S-04.** `process.loadEnvFile` no pisa variables ya definidas, así que la `DATABASE_URL` del contenedor prevalece sobre la de `backend/.env` dentro de `migrate deploy`. Es un hecho dado por el orquestador y coincide con el comentario de `prisma.config.ts`.
- **S-05.** `env("DATABASE_URL")` de `prisma.config.ts` es ansioso: `prisma generate` falla sin esa variable (V-20 de BACK-02).
  - Por eso el `pretest` (`prisma generate`) sigue necesitando `backend/.env`, aunque las pruebas **no** usen su `DATABASE_URL`.
  - No se cambia aquí: `prisma.config.ts` queda fuera de alcance, y la `DATABASE_URL` de relleno para CI y la imagen es un pendiente de DEPLOY.
- **S-06.** Ningún proceso hijo lanzado por las pruebas lee `.env` por su cuenta:
  - `api-real.ataque` (`:89` y `:125`) y `logs-r2.ataque` (`:159`) usan `spawn(process.execPath, ["--import", "tsx", ...], { env: { ...process.env, ... } })`, sin `--env-file`;
  - `server.ts` y `src/scripts/*` no llaman a `loadEnvFile`: `grep` lo encuentra solo en `prisma.config.ts` y `test/setup.ts`;
  - `--env-file-if-exists` solo aparece en los scripts de `backend/package.json`.

  Heredan el `process.env` del proceso de prueba.
- **S-07.** Las 11 pruebas del Tester en el backend obtienen la base con `cargarEnv().DATABASE_URL`, que lee `process.env`, y ninguna arma su propia URL. V-21 lo comprueba con `grep`.
- **S-08.** Hoy tres pruebas del Tester tienen una rama que **pasa sin aserciones** si no existe un administrador:
  - `sesiones-y-cadena.ataque:268-277` "rama positiva de requireRole(['admin'])...";
  - `auth-registro.ataque:163-176` "no se puede registrar el correo del administrador real...";
  - `api-real.ataque:301-314` "seed:admin con un admin ya creado...".

  En `campus_dev` siempre había admin. En una base vacía pasarían en falso. DEC-04 lo resuelve sin tocarlas.
- **S-09.** El humano no usa la API de desarrollo mientras el Programador verifica. Si la usa, V-17b acota el efecto: el refresco de sesión escribe en `sesiones`, nunca en `usuarios`.
- **S-10.** Comandos escritos para PowerShell 5.1, la terminal del proyecto. Si el Programador usa Git Bash, los equivalentes son directos, salvo `Start-Process` en V-15, que va en PowerShell.

## Contradicciones entre documentos (reportadas; no bloquean)
- **C-01.** `.claude/agents/tester.md:16` ya dice "PostgreSQL desechable con Testcontainers para handlers y repositorios", mientras que `AGENTS.md` "Pruebas", ESSENTIALS "Stack › Pruebas" y `ARCHITECTURE.md` §2 dicen "PostgreSQL de infra; Testcontainers pendiente". Este encargo alinea los tres con `tester.md`, con los textos propuestos al final.
- **C-02.** `README.md` "Backend en local" §1 pone "el entorno de infra levantado" como requisito general. Tras este encargo sigue siendo cierto para la API y el worker, pero no para las pruebas, que solo necesitan Docker. Lo ajusta el Programador en §1 y §7.
- **C-03.** DOCS-01, punto 21: CI necesitaba un PostgreSQL para `test`. Con este encargo, CI solo necesita Docker (los runners de GitHub lo traen) y una `DATABASE_URL` de relleno para `prisma generate` (S-05). Queda anotado para el encargo de CI o DEPLOY; aquí no se toca.
- **C-04 (desviaciones del encargo, decididas aquí).** El encargo sugería una salida hacia infra y `testcontainers` como dependencia directa. Este plan decide lo contrario en ambos casos (DEC-05 y DEC-10), con P-01 y P-03 para que el humano los revierta si quiere.

## Alcance
**Entra:**
- `globalSetup` de Vitest que:
  - levanta **un** PostgreSQL por corrida con Testcontainers, con la imagen de `infra/docker-compose.yml` (`postgres:17.11-trixie`);
  - aplica las migraciones con `prisma migrate deploy`;
  - siembra el administrador único con `seed:admin`;
  - entrega el entorno a los procesos de prueba con `provide`/`inject`.
- `setup.ts` sin `backend/.env`, con una guarda que detiene la suite si la base no es la desechable.
- `admin-unico.integracion.test.ts` sin transacción revertida.
- Comentarios y mensajes de pruebas del Programador que citan infra o `campus_dev`.
- `README.md` §1 y §7.
- `fastify-plugin ^6.0.0` en el backend, para que quede una sola copia.
- Textos literales para `AGENTS.md`, ESSENTIALS y `ARCHITECTURE.md`, que aplica el orquestador.

**No entra:**
- Cambios en `backend/src/**`: `enTransaccion` se queda porque lo usan `adapters/db/usuarios.ts:73,114` y `sesiones.ts:52`.
- `prisma.config.ts` (su `env()` ansioso es de DEPLOY).
- Migraciones.
- Frontend: no usa base y no cambia; sigue con 11 archivos y 69 pruebas.
- CI.
- Separar la configuración de Vitest en proyectos "unitarias" e "integración" (R-01).
- Retirar las limpiezas en `afterAll` (DEC-08).
- Cambiar pruebas del Tester (DEC-06).
- Una salida hacia `campus_dev` (P-01).
- Pruebas nuevas (P-02).
- ESLint contra importar `@testcontainers/*` desde `src/` (R-11).

## Diseño

### Decisiones
- **DEC-01. Un contenedor por corrida (`globalSetup`), no uno por archivo.**
  - **Tiempo.** Levantar PostgreSQL, migrar y sembrar cuesta unos 8-15 s en Docker Desktop. Por archivo serían unos 20 archivos con base, lo que suma minutos en serie o unos 20 PostgreSQL simultáneos en paralelo en un portátil con Windows (inestable).
  - **Aislamiento.** Ya existe por diseño: correos `@pruebas.local` únicos por caso, borrado por id o correo propio, y límite de intentos en memoria por proceso (cada archivo corre en su propio proceso). AUTH-01 lo demostró con 3 corridas de 395/395 en paralelo contra una base compartida (`campus_dev`). El contenedor solo tiene que **sustituir** a `campus_dev`, no añadir aislamiento.
  - **Determinismo.** Todos los archivos parten del mismo estado conocido: 2 migraciones y 1 administrador.
  - **Alternativa descartada:** una base por proceso con `CREATE DATABASE … TEMPLATE`. Es más código sin un problema que resolver.
- **DEC-02. Se conserva el paralelismo por archivos** (pool `forks` por defecto de Vitest 4, sin cambiar `maxWorkers`).
  - En secuencial, la suite pasaría de unos 12 s a más de 40: `api-real` y `logs-r2` arrancan procesos con `tsx`, y argon2 usa los parámetros de `prod`.
  - La estabilidad en paralelo ya está probada (DEC-01).
  - Las conexiones simultáneas son las mismas que hoy contra `campus_dev` (PA-17 si no).
- **DEC-03. La URL y el resto del entorno llegan por `provide`/`inject`, no por herencia de `process.env` desde el `globalSetup`.**
  - Es la API documentada de Vitest para pasar datos del proceso principal a los de prueba (S-02) y no depende de cuándo se crean los procesos del pool.
  - `setup.ts` escribe esos valores en `process.env`, pisando lo que venga de la terminal. Así:
    - `config/env.ts` (`cargarEnv()`), también en los archivos que lo evalúan al importarse (`sesiones-y-cadena`, `nombres-tokens-r2`, `logs-r2`), lee la base desechable;
    - los procesos hijos (`api-real`, `logs-r2`, `seed:admin`) la heredan con `{ ...process.env }`.
- **DEC-04. La base desechable trae un administrador de pruebas, sembrado con el `seed:admin` real.**
  - Datos del administrador:
    - correo `admin@contenedor-de-pruebas.local`: a propósito **no** termina en `@pruebas.local`, así que ninguna ayuda de limpieza (`borrarUsuariosDePruebaPorCorreo` filtra por ese dominio) puede borrarlo;
    - nombre "Admin de la base de pruebas";
    - contraseña aleatoria por corrida.
  - Por qué:
    - reproduce el estado real de `campus_dev` (un único admin), del que dependen las tres ramas de S-08 y las dos pruebas del admin único;
    - sin él, esas tres pruebas del Tester pasarían **sin aserciones**, una pérdida de cobertura silenciosa;
    - usar el script real ejercita `seed:admin` en cada corrida.
  - V-11 comprueba con `requireAssertions` que esas ramas sí afirman.
- **DEC-05. Sin salida hacia `campus_dev` (P-01 = no por defecto).** El humano la permitió "si hace falta". No hace falta:
  - El único caso en que "correr contra infra" ayudaría es sin Docker, pero infra también es Docker.
  - Para depurar basta con correr un solo archivo (`npx vitest run test/<archivo>`), que levanta su base en segundos.
  - Una salida hacia `campus_dev` obligaría a conservar lo que el humano pide retirar: la limpieza manual del README, la dependencia del admin de desarrollo y el riesgo de filas residuales. Además, debilitaría la guarda con una excepción.
  - Sin salida, la guarda no tiene excepciones.
- **DEC-06. Ninguna prueba del Tester cambia.** Análisis por archivo que usa la base o lanza procesos:

  | Archivo (Tester) | Cómo obtiene la base | Procesos hijos | Con este plan | ¿Cambio? |
  |---|---|---|---|---|
  | `api-real.ataque` (logs) | `cargarEnv()` en `afterAll` | `spawn … src/server.ts`, `env: { ...process.env, HOST, PORT, LOG_LEVEL, NODE_ENV }` | Hereda la URL del contenedor; escribe y borra solo ahí | Ninguno |
  | `api-real.ataque` (production) | — | `ejecutar("src/server.ts", { NODE_ENV, JWT_SECRET, PORT })` | Sale en la validación de `env`, antes de conectar | Ninguno |
  | `api-real.ataque` (seed:admin con admin) | `cargarEnv()` + `existeAdmin()` | `ejecutar("src/scripts/seed-admin.ts", {})` | Con la fixture hay admin: el script sale con 1 sin escribir. `process.env.ADMIN_PASSWORD` (≥ 10) la fija `setup.ts` | Ninguno |
  | `api-real.ataque` (seed:admin contraseña corta) | — | `ejecutar(..., { ADMIN_PASSWORD })` | Falla la validación antes de conectar | Ninguno |
  | `logs-r2.ataque` | `cargarEnv()` al importar | `spawn … src/server.ts` con `{ ...process.env }` | Hereda la URL y el `JWT_SECRET` de la corrida: el padre firma y el hijo verifica con el mismo secreto | Ninguno |
  | `admin-unico.ataque` | `cargarEnv()` | — | Con la fixture, `existeAdmin(tx)` es verdadero: crea el estudiante, el `UPDATE` a admin choca con el índice y la transacción se revierte. `existeAdmin()` sigue igual a `habiaAdmin` | Ninguno |
  | `sesiones-y-cadena`, `auth-registro`, `auth-login`, `intentos-r2`, `nombres-tokens-r2`, `nombres-guarda-r3`, `guarda-r2`, `env.ataque` | `cargarEnv()` o nada | — | Mismo comportamiento; las ramas de S-08 dejan de pasar en falso | Ninguno |

  - Si aun así una falla, se activa PA-12.
  - **Recomendación para una futura ronda del Tester (no en este encargo):**
    - cambiar los `if (!admin) return` por una aserción de precondición;
    - retirar la transacción revertida de `admin-unico.ataque`, que ya no hace falta pero no estorba.
- **DEC-07. `admin-unico.integracion.test.ts` (del Programador) sin transacción revertida.**
  - Con la fixture, el segundo admin falla contra el primero y no escribe nada.
  - Hay una precondición que falla cerrada: si no hubiera admin previo, la prueba falla **antes** del `insert`, así que nunca crea un primer administrador.
  - Siguen siendo 2 casos, así que el conteo no cambia.
- **DEC-08. Se conservan `borrarUsuariosDePrueba`, `borrarUsuariosDePruebaPorCorreo`, los `afterAll` de limpieza y el dominio `@pruebas.local`.**
  - Las pruebas del Tester los usan (`auth-login.ataque`, `api-real`, `logs-r2` y `auth-registro.ataque`).
  - Entre los archivos de **una** corrida siguen siendo buena higiene, y quitarlos de las pruebas del Programador sería cambio sin beneficio.
  - Solo se actualiza el comentario de `ayudas-auth.ts`.
- **DEC-09. Secretos de prueba generados por corrida, nunca escritos en el repositorio.**
  - `JWT_SECRET` (48 bytes en base64url), la contraseña del administrador y la de PostgreSQL (24 bytes cada una) salen de `randomBytes` en `global-setup.ts`.
  - `setup.ts` ya **no** lee `backend/.env`. El resto de variables toma los valores por defecto de `config/env.ts` (`HOST`, `PORT`, `LOG_LEVEL`), y `NODE_ENV` lo pone Vitest (`test`).
  - Así un `.env` o una terminal con otra configuración no cambian lo que prueban las pruebas.
- **DEC-10. Solo `@testcontainers/postgresql ^12.1.0` como devDependency directa (P-03).** `testcontainers ^12.1.0` llega como dependencia suya.
- **DEC-11. Guarda en dos puntos, con la misma función pura `validarUrlDePruebas`.**
  - Dónde se aplica:
    - en `global-setup.ts`, antes de `migrate deploy` y de `seed:admin`;
    - en `setup.ts`, antes de importar cada archivo de prueba.
  - Qué exige:
    - protocolo `postgres:` o `postgresql:`;
    - host de loopback: `127.0.0.1`, `localhost` o `[::1]`;
    - base **exactamente** `campus_pruebas`.

    Esto rechaza `campus_dev`, cualquier otra base y cualquier host remoto.
  - Sin excepciones.
  - El mensaje nunca incluye la URL ni la contraseña: solo el host y el nombre de la base.
  - Si falla `inject` (no hubo `globalSetup`), la suite se detiene con "Falta la base de pruebas…".
- **DEC-12. `fastify-plugin ^6.0.0`.**
  - Comparé los tipos de las dos copias instaladas:
    - 6.0.0 (`@fastify/cookie/node_modules/fastify-plugin/types/index.d.ts`) solo retira el alias obsoleto `PluginOptions` y la línea `/// <reference types="fastify" />` respecto de 5.1.0 (`types/plugin.d.ts`);
    - la firma de `fastifyPlugin(fn, options?: PluginMetadata | string)` es idéntica;
    - 6.0.0 no declara `peerDependencies` ni `engines` en su `package.json`.
  - El Manager ya comprobó en AUTH-01 que el código es idéntico.
  - El único uso del backend es `fp(async (app) => …, { name: "manejo-de-errores" })` en `handlers/errores.ts`, que no usa `PluginOptions`.
  - Se espera `tsc` limpio sin tocar `src/`; si no, se activa PA-03.

### Flujo de una corrida
1. `npm test` (raíz o `backend/`) ejecuta el `pretest`:
   - `shared:build`;
   - `prisma generate`, que evalúa `prisma.config.ts` y por eso necesita `backend/.env`, pero **no se conecta** a ninguna base.
2. `vitest run` (proceso principal) ejecuta `test/global-setup.ts`:
   1. Lee la imagen `postgres:<etiqueta>` de `infra/docker-compose.yml` (debe haber exactamente una).
   2. Arranca `PostgreSqlContainer(imagen)` con la base `campus_pruebas`, el usuario `campus_pruebas` y una contraseña aleatoria. Testcontainers arranca Ryuk si hace falta, publica el 5432 en un puerto aleatorio del anfitrión y espera a que PostgreSQL acepte conexiones. Si Docker no responde, lanza "No se pudo levantar PostgreSQL de pruebas con Testcontainers. Enciende Docker Desktop y vuelve a correr las pruebas." y la corrida termina con código 1.
   3. Arma `postgresql://campus_pruebas:<contraseña>@127.0.0.1:<puerto>/campus_pruebas` (usa `127.0.0.1` si `getHost()` devuelve `localhost`) y la valida con `validarUrlDePruebas`.
   4. Genera `JWT_SECRET` y `ADMIN_PASSWORD` aleatorios.
   5. `node <prisma/build/index.js> migrate deploy`, con `cwd` en `backend/` y `env = { ...process.env, DATABASE_URL, JWT_SECRET, ADMIN_* }`. Aplica `extensiones_iniciales` y `usuarios_y_sesiones`. `prisma.config.ts` carga `backend/.env` si existe, pero no pisa la `DATABASE_URL` recibida (S-04).
   6. `node --import tsx src/scripts/seed-admin.ts` con el mismo `env`: crea el único administrador en el contenedor.
   7. `project.provide("entornoDePruebas", entorno)`.
   8. Si cualquiera de los pasos 3 a 7 falla, detiene el contenedor y relanza el error. Si falla el paso 2, no queda contenedor.
3. Procesos de prueba (en paralelo, uno por archivo): `test/setup.ts` hace `inject`, aplica la guarda, ejecuta `Object.assign(process.env, variablesDeEntorno(entorno))` y deja paso al archivo de prueba.
4. Al terminar, la función que devolvió el `globalSetup` ejecuta `contenedor.stop()`. Si la corrida se interrumpe, **Ryuk** borra el contenedor cuando se cierra la conexión del proceso de Vitest.

**Datos:**
- Se escribe solo en `campus_pruebas` del contenedor: extensiones, tipos, tablas, `_prisma_migrations`, 1 administrador y lo que escriban las pruebas.
- En `campus_dev`, **nada**.
- Se leen como texto `infra/docker-compose.yml` y, a través del CLI de Prisma, `backend/prisma/migrations/**`.

**Eventos:** ninguno.

### Contenido exacto de los archivos nuevos o reescritos

**`backend/test/entorno-de-pruebas.ts`** (nuevo):
```ts
// Tipos, constantes y guarda de la base de pruebas (CHORE-01). Lo usan test/global-setup.ts (proceso
// principal de Vitest) y test/setup.ts (cada proceso de prueba).
export const NOMBRE_BASE_DE_PRUEBAS = "campus_pruebas"
export const USUARIO_BASE_DE_PRUEBAS = "campus_pruebas"

// El único administrador de la base desechable. El correo NO termina en @pruebas.local: ninguna
// ayuda de limpieza (borrarUsuariosDePruebaPorCorreo) puede borrarlo.
export const ADMIN_DE_PRUEBAS = {
  email: "admin@contenedor-de-pruebas.local",
  nombre: "Admin de la base de pruebas",
} as const

export interface EntornoDePruebas {
  databaseUrl: string
  jwtSecret: string
  adminEmail: string
  adminPassword: string
  adminNombre: string
}

declare module "vitest" {
  export interface ProvidedContext {
    entornoDePruebas: EntornoDePruebas
  }
}

const HOSTS_LOCALES = new Set(["127.0.0.1", "localhost", "[::1]"])

// Pura. null si la URL apunta a la base desechable; si no, el motivo, sin la URL ni la contraseña.
export const validarUrlDePruebas = (url: string): string | null => {
  if (!URL.canParse(url)) return "la URL de la base no es válida"
  const destino = new URL(url)
  if (destino.protocol !== "postgresql:" && destino.protocol !== "postgres:") {
    return "la URL no es de PostgreSQL"
  }
  if (!HOSTS_LOCALES.has(destino.hostname)) return `el host "${destino.hostname}" no es local`
  if (destino.pathname !== `/${NOMBRE_BASE_DE_PRUEBAS}`) {
    return `la base es "${destino.pathname.slice(1)}" y las pruebas solo aceptan "${NOMBRE_BASE_DE_PRUEBAS}"`
  }
  return null
}

export const variablesDeEntorno = (entorno: EntornoDePruebas): Record<string, string> => ({
  DATABASE_URL: entorno.databaseUrl,
  JWT_SECRET: entorno.jwtSecret,
  ADMIN_EMAIL: entorno.adminEmail,
  ADMIN_PASSWORD: entorno.adminPassword,
  ADMIN_NOMBRE: entorno.adminNombre,
})
```

**`backend/test/global-setup.ts`** (nuevo). **[verificar en V-06]** los nombres de los métodos de `PostgreSqlContainer` y `StartedPostgreSqlContainer`, y `getPort()` como puerto publicado del 5432.
```ts
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
    throw new Error("infra/docker-compose.yml debe declarar exactamente una imagen postgres:<etiqueta>")
  }
  return imagen
}

const iniciarContenedor = async (
  imagen: string,
  contrasena: string,
): Promise<StartedPostgreSqlContainer> => {
  try {
    return await new PostgreSqlContainer(imagen)
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
```
Notas para el Programador:
- **Sin `console`:** la regla `no-console` aplica a `test/`.
- **Salida de los pasos:** `spawnSync` captura la salida de `migrate deploy` y de `seed:admin`; solo se muestra si fallan. `seed:admin` nunca imprime la contraseña.
- **Nombres de la API:** si difiere un nombre de método de Testcontainers, ajusta solo esa llamada y repórtalo (PA-07 si falta la capacidad).
- **Formato:** el formato final lo decide Prettier.

**`backend/test/setup.ts`** (reescrito completo):
```ts
import { inject } from "vitest"

import { validarUrlDePruebas, variablesDeEntorno } from "./entorno-de-pruebas.js"

// Corre en cada proceso de prueba antes de cada archivo. Toma el entorno de test/global-setup.ts y lo
// escribe en process.env por encima de lo que venga de la terminal: config/env.ts y los procesos hijos
// (api-real, logs-r2, seed:admin) usan así la base desechable. backend/.env ya no se lee (CHORE-01).
const entorno = inject("entornoDePruebas")

if (!entorno) {
  throw new Error(
    "Falta la base de pruebas: corre las pruebas con npm test o npx vitest desde backend/, que la levantan con Testcontainers (test/global-setup.ts).",
  )
}

const problema = validarUrlDePruebas(entorno.databaseUrl)

if (problema !== null) {
  throw new Error(`Guarda de la base de pruebas: ${problema}. No se ejecutó ninguna prueba.`)
}

Object.assign(process.env, variablesDeEntorno(entorno))
```

**`backend/vitest.config.ts`** (completo):
```ts
import { defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    environment: "node",
    // Un PostgreSQL desechable por corrida (Testcontainers): lo levanta y lo destruye
    // test/global-setup.ts; test/setup.ts lo entrega a cada archivo (CHORE-01).
    globalSetup: ["./test/global-setup.ts"],
    setupFiles: ["./test/setup.ts"],
    include: ["src/**/*.test.ts", "test/**/*.test.ts"],
    testTimeout: 15000,
  },
})
```

**`backend/test/admin-unico.integracion.test.ts`** (reescrito completo; 2 casos, como hoy):
```ts
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { hashContrasena, inicializarAuth } from "../src/adapters/auth/index.js"
import { cerrarConexion, inicializarDb, obtenerDb } from "../src/adapters/db/cliente.js"
import { buscarAdmin, crearUsuario, type NuevoUsuario } from "../src/adapters/db/index.js"
import { opcionesDeAuth } from "../src/config/auth.js"
import { cargarEnv } from "../src/config/env.js"
import { correoDePrueba } from "./ayudas-auth.js"

// Índice único parcial de un solo admin (DEC-01 de AUTH-01). La base desechable de la corrida ya trae
// su único administrador (test/global-setup.ts lo crea con seed:admin), así que el segundo falla
// contra él y no hace falta la transacción revertida de AUTH-01 (CHORE-01, DEC-07).
let segundoAdmin: NuevoUsuario | undefined
let adminPrevio: { id: string; email: string } | null = null

beforeAll(async () => {
  const env = cargarEnv()
  inicializarDb({ connectionString: env.DATABASE_URL })
  await inicializarAuth(opcionesDeAuth(env))
  segundoAdmin = {
    nombre: "Admin de prueba",
    nombreBusqueda: "admin de prueba",
    email: correoDePrueba("admin"),
    hashContrasena: await hashContrasena("clave-de-prueba-1234"),
    rol: "admin",
  }
  adminPrevio = await buscarAdmin()
})

afterAll(async () => {
  await cerrarConexion()
})

describe("un solo administrador (usuarios_un_solo_admin_idx)", () => {
  it("con el administrador de la base ya creado, un segundo admin falla con 409 ADMIN_YA_EXISTE", async () => {
    if (!segundoAdmin) throw new Error("beforeAll no preparó los datos")
    // Precondición antes de insertar: sin un admin previo, el insert crearía el primero.
    expect(adminPrevio).not.toBeNull()
    await expect(crearUsuario(segundoAdmin)).rejects.toMatchObject({
      codigo: "ADMIN_YA_EXISTE",
      estado: 409,
    })
  })

  it("el intento no deja filas: sigue habiendo un solo admin y es el mismo", async () => {
    if (!segundoAdmin) throw new Error("beforeAll no preparó los datos")
    expect(await obtenerDb().usuario.count({ where: { rol: "admin" } })).toBe(1)
    expect(await buscarAdmin()).toEqual(adminPrevio)
    expect(await obtenerDb().usuario.count({ where: { email: segundoAdmin.email } })).toBe(0)
  })
})
```

**Comentarios y mensajes (texto literal):**
- `backend/test/ayudas-auth.ts:14-16`:
  ```ts
  // Ayudas compartidas por las pruebas de autenticación. Aislamiento dentro de la base desechable que
  // comparten los archivos de una corrida (test/global-setup.ts): correos únicos @pruebas.local, ids o
  // correos registrados por quien los crea y borrado en afterAll.
  // obtenerDb() se usa aquí, y solo aquí fuera de adapters/db, para preparar y limpiar datos.
  ```
  Conserva la última frase tal cual.
- `backend/test/salud.integracion.test.ts`:
  - línea 9: `// Precondición: la base desechable de test/global-setup.ts (Testcontainers).`;
  - mensaje de la línea 32: `"La base de pruebas no responde en DATABASE_URL (test/global-setup.ts). Revisa que Docker Desktop siga encendido."`.
- `backend/test/auth-login.integracion.test.ts:14`: `// Precondición: la base desechable de test/global-setup.ts. Cada caso usa su`. El resto de la frase de la línea 15 no cambia.
- `backend/test/auth-registro.integracion.test.ts:20`: `// Precondición: la base desechable de test/global-setup.ts.`

### Qué se retira por obsoleto
| Qué | Dónde | Destino |
|---|---|---|
| Carga de `backend/.env` y el error "Falta backend/.env" | `test/setup.ts` | Se retira (DEC-09) |
| Transacción siempre revertida, `RollbackDePrueba` y `habiaAdmin` | `admin-unico.integracion.test.ts` | Se retiran (DEC-07) |
| "Escriben en tu `campus_dev`", la consulta y el `DELETE` de `@pruebas.local`, "El `DELETE` solo toca…" y los dos "Mensajes si falta algo" de `.env` e infra | `README.md` §7 | Se retiran; los sustituye el texto de §7 de abajo |
| "PostgreSQL de infra", "infra levantado" y "campus_dev" en comentarios de pruebas | 4 archivos del Programador (arriba) | Se actualizan |
| `enTransaccion` | `adapters/db/cliente.ts` | **Se queda**: lo usa el código de producción (`usuarios.ts:73,114`, `sesiones.ts:52`); ninguna prueba del Tester lo importa |
| `borrarUsuariosDePrueba*`, limpiezas en `afterAll` y `DOMINIO_DE_PRUEBA` | `ayudas-auth.ts` y pruebas | **Se quedan** (DEC-08) |
| Transacción revertida y `if (!admin) return` en pruebas del Tester | `admin-unico.ataque`, S-08 | **Se quedan**; recomendación futura en DEC-06 |

## Cambios por capa

### shared/
Ninguno.

### backend/core/
Ninguno.

### backend/adapters/
Ninguno. `enTransaccion` se queda.

### backend/handlers/
Ninguno. `handlers/errores.ts` sigue con `import fp from "fastify-plugin"`, que ahora resuelve a 6.0.0 (DEC-12).

### backend/workers/
Ninguno.

### backend/prisma/
Ninguna migración. `migrate deploy` aplica las 2 existentes **solo** en el contenedor. La migración `extensiones_iniciales` ya declara las extensiones "para la base sombra, Testcontainers y prod".

### infra/ y .env.example
Ninguno. `infra/docker-compose.yml` solo se **lee**, para tomar la etiqueta de la imagen. `backend/.env.example` no cambia: las pruebas no leen `.env`, y el `pretest` sigue necesitando que exista (S-05).

### frontend/features/
Ninguno.

### backend/test/ y backend/vitest.config.ts
Ver "Contenido exacto". Archivos: `entorno-de-pruebas.ts` (nuevo), `global-setup.ts` (nuevo), `setup.ts`, `vitest.config.ts` y `admin-unico.integracion.test.ts` (reescritos), y los comentarios de 4 archivos.

### Dependencias (`backend/package.json`)
| Paquete | Sección | Antes | Después | Para qué |
|---|---|---|---|---|
| `fastify-plugin` | `dependencies` | `^5.1.0` | `^6.0.0` | Una sola copia: `@fastify/cookie@11.1.2` ya exige `^6.0.0` (D-01 de AUTH-01) |
| `@testcontainers/postgresql` | `devDependencies` | — | `^12.1.0` | Contenedor PostgreSQL de pruebas. Trae `testcontainers ^12.1.0` y sus dependencias (`dockerode`, `tar-fs`, `undici`, `archiver`, `docker-compose`, `ssh-remote-port-forward`, `proper-lockfile`, `get-port`…). Es una herramienta de desarrollo: sus dependencias transitivas se reportan y no bloquean (regla 11). PA-06 si aparece algo de AWS |

- Orden alfabético en `devDependencies`: `@testcontainers/postgresql` va antes de `@types/node`.
- No se instalan `testcontainers` directo (P-03), `dotenv`, `pg` en `test/` ni nada más.
- **Imagen extra:** Testcontainers descarga en la primera corrida la imagen de Ryuk de Docker Hub (`testcontainers/ryuk:<etiqueta>`, **[verificar]** la etiqueta en V-06). Es una herramienta local, como `postgres` de Docker Hub en infra o MinIO de `quay.io` (D-23); no es un proveedor del proyecto. Se propone registrarla en D-25.

### README.md ("Backend en local"; lo escribe el Programador)
- **§1**, tras la primera frase: "Para correr las pruebas (paso 7) basta con Docker Desktop encendido; no necesitan el entorno de infra."
- **§7**, texto propuesto. El Programador sustituye las cifras entre `<>` por las medidas en V-13 y ajusta la redacción solo si algo medido difiere:

  ````markdown
  ### 7. Pruebas

  Desde la raíz (corre las de todos los workspaces) o desde `backend`:

  ```powershell
  npm test
  ```

  Precondiciones: Docker Desktop encendido y `backend/.env` presente (paso 3). Las pruebas del backend **no usan tu `campus_dev`** ni el PostgreSQL de infra: al empezar, levantan con Testcontainers un PostgreSQL desechable con la misma imagen que `infra/docker-compose.yml`, le aplican las migraciones con `prisma migrate deploy`, crean su único administrador con `seed:admin` y lo destruyen al terminar. `backend/.env` solo hace falta porque `prisma generate`, que corre antes de las pruebas, lo lee; su `DATABASE_URL` no se usa para probar, y `JWT_SECRET` y `ADMIN_*` de las pruebas se generan en cada corrida. No hay forma de dirigir las pruebas a `campus_dev`: una guarda detiene la suite si la base no es la desechable.

  La primera corrida descarga de Docker Hub la imagen `testcontainers/ryuk` (necesita red). Ryuk borra el contenedor de pruebas aunque la corrida se interrumpa; tarda hasta un minuto en hacerlo. Para comprobar que no quedó ninguno:

  ```powershell
  docker ps -a --filter "label=org.testcontainers=true"
  ```

  Debe responder solo la línea de encabezados.

  El backend tiene 30 archivos con 326 pruebas: unitarias de `core/`, `config/` y `middleware/`; de integración que levantan la API en memoria contra la base desechable; y adversarias (`*.ataque.test.ts`, 192 de ellas), algunas de las cuales arrancan la API real con `tsx` en un puerto libre al azar y la detienen al terminar. El frontend tiene 11 archivos con 69 pruebas (32 adversarias). La suite del backend tarda entre <X> y <Y> segundos: unos <Z> para levantar y preparar la base, y el resto porque las contraseñas se procesan con argon2id con los mismos parámetros que en `prod`. Toda corrida del backend levanta la base, aunque filtres solo pruebas unitarias.

  Mensajes si falta algo:

  - `No se pudo levantar PostgreSQL de pruebas con Testcontainers. Enciende Docker Desktop y vuelve a correr las pruebas.`: Docker Desktop está apagado o no responde.
  - `PrismaConfigEnvError: Cannot resolve environment variable: DATABASE_URL` antes de empezar: falta `backend/.env` (paso 3).
  - `Falta la base de pruebas: ...`: corriste las pruebas sin la configuración de Vitest del backend (por ejemplo, con otra `--config`). Usa `npm test` o `npx vitest` desde `backend`.
  - `Guarda de la base de pruebas: ...`: algo intentó dirigir las pruebas a una base que no es la desechable, y no se ejecutó ninguna prueba. Repórtalo.
  ````

## Acceso a datos
Ninguna consulta de producción cambia (`backend/src/**` sin diff). Consultas nuevas o distintas, **todas en la base desechable**:

| Dónde | Consulta | Índice | Paginación / transacción |
|---|---|---|---|
| `seed:admin` en el `globalSetup` | `existeAdmin()`: `findFirst where rol = 'admin'` | `usuarios_rol_idx` | Una fila; sin transacción (código existente) |
| `seed:admin` en el `globalSetup` | `crearUsuario`: `INSERT` | `usuarios_email_key`, `usuarios_un_solo_admin_idx` | Una fila |
| `admin-unico.integracion` | `buscarAdmin()` (2 veces) | `usuarios_rol_idx` | Una fila |
| `admin-unico.integracion` | `crearUsuario(segundo)` → 409 | Índice parcial | Sin escritura efectiva |
| `admin-unico.integracion` | `count where rol = 'admin'` | `usuarios_rol_idx` | `COUNT`, sin lista |
| `admin-unico.integracion` | `count where email = ?` | `usuarios_email_key` | `COUNT` |

- Ninguna consulta dentro de un ciclo y ningún SQL crudo.
- Las huellas de V-02 y V-17 son `SELECT` de solo lectura sobre `campus_dev`, ejecutados a mano por el Programador y no por las pruebas. Leen `COUNT`/`MAX` sobre tablas con pocas filas y `pg_stat_user_tables`.

## Autorización
- No cambia ningún endpoint, middleware, rol ni campo de respuesta; `backend/src/**` queda sin diff (V-19).
- El estado de pago no se toca.
- La guarda de DEC-11 no es autorización de la API: impide que el código de pruebas se conecte a una base que no sea la desechable.

## Pruebas requeridas
- **Nuevas:** ninguna (P-02 = no).
- **Reescrita:** `admin-unico.integracion.test.ts`, con 2 casos (DEC-07).
- **Conteos esperados:**
  - backend: **30 archivos / 326 pruebas**, 192 del Tester en 11 archivos;
  - frontend: **11 / 69**, 32 del Tester;
  - **total 395**.
  - Si P-02 = sí: backend 31 / 330, total 399.
- **Criterio de cierre (del humano):**
  - 395 en verde en **tres corridas completas** de `npm test` desde la raíz (V-13);
  - la huella de `campus_dev` idéntica antes y después (V-02 = V-17);
  - además, las verificaciones V-01 a V-21.

## Puntos de ataque para el Tester
No hay ronda de Tester. Esta lista sirve al Manager en modo final y a una ronda futura, si el humano la pide.
- **Base de destino:**
  - forzar `campus_dev`, otra base en loopback, un host remoto o una URL mal formada (V-08 cubre la primera y la de sin base);
  - una terminal con `DATABASE_URL` o `JWT_SECRET` definidos: `setup.ts` debe pisarlos.
- **`backend/.env`:** ausente (`pretest` falla con `PrismaConfigEnvError`, mensaje documentado) o con otra `DATABASE_URL`, que no debe influir.
- **Docker:** apagado o no disponible (V-16); interrupción a media corrida (V-15); contenedores huérfanos (V-14).
- **Paralelismo:** dos archivos que compiten por el administrador (`admin-unico` y `admin-unico.ataque` a la vez), y límite de conexiones.
- **La fixture:**
  - que ninguna ayuda de limpieza pueda borrar al administrador de la base (dominio distinto de `@pruebas.local`);
  - que las ramas de S-08 afirmen algo (V-11).
- **Procesos hijos:** que hereden la base desechable y el mismo `JWT_SECRET` (`logs-r2` firma en el padre y verifica en el hijo).
- **`migrate deploy` apuntado a otra base:** si `loadEnvFile` pisara la `DATABASE_URL` (S-04), el `deploy` iría a `campus_dev`. Allí no escribiría nada, porque ya está al día, pero la suite fallaría por falta de tablas en el contenedor. Vigilar la huella de `_prisma_migrations`.

## Riesgos y desacuerdos
- **R-01. Toda corrida del backend necesita Docker**, incluso `npx vitest run src/core`: el `globalSetup` corre siempre y cuesta unos 8-15 s.
  - Aceptable para el piloto.
  - Si molesta, un encargo posterior separa `test.projects` en "unitarias" (sin `globalSetup`) e "integración".
- **R-02. Primera corrida con red:** descarga `testcontainers/ryuk` de Docker Hub; el límite anónimo de Docker Hub no es un problema a este volumen. Si faltara la imagen `postgres:17.11-trixie`, también se descargaría.
- **R-03. Puerto publicado.**
  - Testcontainers publica el 5432 en un puerto aleatorio, probablemente en todas las interfaces del anfitrión (**[verificar]** en V-06 si fija `HostIp`).
  - Mitigación: contraseña aleatoria de 48 caracteres hexadecimales, la base solo vive lo que dura la corrida y los datos son sintéticos.
  - No se añade configuración para atarlo a `127.0.0.1` (sería configuración de Testcontainers, PA-08). Se reporta.
- **R-04. `pretest` sigue necesitando `backend/.env`** (S-05). Documentado en el README. La `DATABASE_URL` de relleno para CI y la imagen queda para DEPLOY/CI (C-03).
- **R-05. Duración:** la suite del backend pasa de unos 12 s a unos 20-35 s (estimación). Se mide en V-13; si supera 90 s, se reporta y no se detiene.
- **R-06. Ryuk en Windows** monta el socket de Docker de Docker Desktop. Debería funcionar sin configuración; si no, PA-08 (no se desactiva Ryuk).
- **R-07. Compilación opcional en `npm install`:** `ssh2`, que viene de `dockerode`, tiene dependencias nativas opcionales (`cpu-features`). En Windows puede haber avisos de `node-gyp` con código 0; se reportan (PA-04 solo si el código no es 0).
- **R-08. Las ramas de S-08 dependen de la fixture.** Si alguien la quitara, tres pruebas del Tester volverían a pasar sin aserciones. V-11 lo detecta hoy; la solución duradera es la recomendación de DEC-06 para una futura ronda del Tester.
- **R-09. Imagen leída de `infra/docker-compose.yml` con una expresión regular.** Si el compose pasa a usar una variable (`image: ${…}`), el `globalSetup` falla con un mensaje claro en vez de desalinearse en silencio.
- **R-10. `teardownTimeout` de Vitest (10 s por defecto)** podría cortar `contenedor.stop()` si Docker va lento. Ryuk lo cubre; V-14 lo comprueba.
- **R-11. Nada impide por lint que `backend/src/**` importe `@testcontainers/*`.** Añadirlo exigiría fusionar los bloques de `no-restricted-imports` de `eslint.config.mjs`, que se pisan por archivo. Queda fuera de alcance: la revisión lo vigila, y un import así rompería el arranque en `prod`, donde no hay devDependencies.
- **R-12. Actividad del humano durante la verificación** (S-09). V-17b separa `sesiones`, que puede cambiar por el uso de la aplicación, de `usuarios`, `_prisma_migrations` y `@pruebas.local`, que solo cambiarían por las pruebas.
- **Desacuerdos con ESSENTIALS:** ninguno de fondo.
  - ESSENTIALS "Stack › Pruebas" dice hoy "integración contra el PostgreSQL de `infra/` (`DATABASE_URL` de `backend/.env`)… Testcontainers pendiente". Este encargo cumple ese pendiente y **cambia** esa frase.
  - La aprobación escrita del humano autoriza el cambio, y el texto lo aplica el orquestador.
- **Desviaciones del encargo:** P-01 (sin salida hacia infra) y P-03 (una sola dependencia directa), ambas con valor por defecto y reversibles en la aprobación.

## Verificaciones (el Programador las ejecuta y reporta con la salida real)
| # | Verificación | Resultado esperado |
|---|---|---|
| V-01 | `node --version`; `npm --version`; `git status --short`; `docker version --format "{{.Server.Version}}"`; en `infra/`, `docker compose ps`; `docker image ls postgres:17.11-trixie`; `docker ps -a --filter "label=org.testcontainers=true"`; `Get-NetTCPConnection -LocalPort 3000 -State Listen` (anotar el PID y el proceso si lo hay: no es tuyo, no lo toques) | `v24.11.1`, `11.6.2`; árbol limpio (salvo los archivos de `docs/trabajo/CHORE-01-testcontainers/`); servidor `28.x`; `postgres` en marcha y `healthy`; la imagen presente; ningún contenedor de Testcontainers. Si algo no se cumple: PA-01 o PA-18 |
| V-02 | Huella de `campus_dev` (antes), desde `infra/`, guardada en `backend/tmp/huella-antes.txt`. Comando literal más abajo | Una línea `usuarios=… \| pruebas_local=0 \| max_usuarios=… \| sesiones=… \| max_sesiones=… \| migraciones=2 \| stats=_prisma_migrations:…,sesiones:…,usuarios:…`. Referencia del orquestador del 2026-09-24: `usuarios=2`, `sesiones=7`, `pruebas_local=0`, `max_usuarios=2026-09-24 16:09:30.85+00`. Si hoy difiere por actividad del humano, vale la de hoy |
| V-03 | SHA-256 de los 14 archivos del Tester (lista más abajo) | Los 14 coinciden con la tabla. Si no: PA-01 |
| V-04 | `npm view @testcontainers/postgresql versions --json`, `npm view @testcontainers/postgresql@12.1.0 dependencies engines`, `npm view testcontainers versions --json`, `npm view testcontainers@12.1.0 engines`, `npm view fastify-plugin@6.0.0 version peerDependencies engines dependencies` | Última 12.x estable de ambos = `12.1.0`; `engines.node` admite 24.11.1; `@testcontainers/postgresql@12.1.0` depende de `testcontainers ^12.1.0`; `fastify-plugin@6.0.0` sin `peerDependencies` ni `engines` que no se cumplan. Si no: PA-02 o PA-03 |
| V-05 | Editar `backend/package.json`; `npm install` desde la raíz (código de salida y líneas `added/removed/changed`); `npm ls fastify-plugin @testcontainers/postgresql testcontainers`; `npm explain fastify-plugin`; `npm ls --all 2>$null \| Select-String -Pattern "aws\|firebase\|supabase\|vercel"` | Código 0; **una** copia de `fastify-plugin@6.0.0` (la de `@fastify/cookie` aparece como `deduped`); `@testcontainers/postgresql@12.1.0` con `testcontainers@12.1.0`; la búsqueda no devuelve nada. Si no: PA-04, PA-05 o PA-06 |
| V-06 | Lectura en `node_modules/` (sin ejecutar nada), reportando cada **[verificar]** con archivo y línea. Ver la lista debajo de la tabla | Lo encontrado, reportado. PA-07 si falta una capacidad |
| V-07 | Desde `backend/`: `npm run build` y `npm run lint` (sin `npm test`) | Código 0 en ambos: `tsc` acepta `fastify-plugin` 6 sin tocar `src/`. Si no: PA-03 |
| V-08 | **Guarda forzada** (tras el paso 9; configuraciones temporales más abajo). Desde `backend/`: (a) `npx vitest run --config tmp/vitest.guarda-campus-dev.config.ts; "codigo=$LASTEXITCODE"`; (b) `npx vitest run --config tmp/vitest.guarda-sin-base.config.ts; "codigo=$LASTEXITCODE"`; `docker ps -a --filter "label=org.testcontainers=true"`; huella de `campus_dev`; borrar las dos configuraciones | (a) `codigo=1` con `Guarda de la base de pruebas: la base es "campus_dev" y las pruebas solo aceptan "campus_pruebas". No se ejecutó ninguna prueba.` y **0 pruebas ejecutadas**; (b) `codigo=1` con `Falta la base de pruebas: …` y 0 ejecutadas; ningún contenedor; **huella = V-02**. Si no: PA-10 o PA-11 |
| V-09 | Primera corrida real acotada, desde `backend/`: `npx vitest run test/salud.integracion.test.ts` (salida a `tmp/v09.log`); anotar la duración; a los 90 s, `docker ps -a --filter "label=org.testcontainers=true"`; huella | 1 archivo / 4 pruebas en verde (el `inject` funciona: si no, PA-09); sin contenedores a los 90 s (si quedan a los 120 s: PA-16); **huella = V-02** |
| V-10 | Tras el paso 12, desde `backend/`: `npm test` (salida a `tmp/v10.log`); `Select-String -Path tmp\v10.log -Pattern FSTDEP` (conteo); duración; huella | **30 archivos / 326 pruebas** en verde; `FSTDEP` = 0; huella = V-02. Si falla un `*.ataque`: PA-12 |
| V-11 | Diagnóstico de aserciones (configuración temporal más abajo). Desde `backend/`: `npx vitest run --config tmp/vitest.aserciones.config.ts test/sesiones-y-cadena.ataque.test.ts test/auth-registro.ataque.test.ts test/api-real.ataque.test.ts test/admin-unico.ataque.test.ts test/admin-unico.integracion.test.ts`; borrar la configuración | Los 5 archivos en verde con `requireAssertions`. En particular, estas 5 pruebas afirman algo: "rama positiva de requireRole(['admin']) con el admin real…", "no se puede registrar el correo del administrador real…", "seed:admin con un admin ya creado…", el caso de `admin-unico.ataque` y el primer caso de `admin-unico.integracion`. Si alguna termina sin aserciones: PA-19. Si falla por falta de aserciones una prueba **distinta** de esas 5, se reporta sin detenerse |
| V-12 | `npx prettier --write test vitest.config.ts` desde `backend/`; `npm run lint` y `npm run build` desde la raíz | Código 0 en los dos (el aviso de chunk > 500 kB del frontend viene de FRONT-01) |
| V-13 | **Tres corridas completas** de `npm test` desde la raíz, cada una con la salida en `backend/tmp/corrida-<n>.log` (redirección a archivo, sin tubería); por corrida: conteos del backend y del frontend, duración de cada uno, `FSTDEP` y huella | Las tres con código 0: **backend 30/326 + frontend 11/69 = 395**; `FSTDEP` = 0; huella = V-02 tras cada corrida. Si no: PA-10, PA-12 o PA-15 |
| V-14 | 90 s después de la tercera corrida: `docker ps -a --filter "label=org.testcontainers=true" --format "{{.ID}} {{.Image}} {{.Status}}"` | Vacío. Si queda algo a los 120 s: PA-16 |
| V-15 | **Interrupción con PID propio** (comandos más abajo) | Tras matar el árbol propio, en ≤ 120 s no queda ningún contenedor con la etiqueta; huella = V-02. Si no: PA-16 o PA-10 |
| V-16 | **Docker no disponible, simulado sin apagar nada** (comando más abajo) | Esperado: `codigo=1` y el log con `No se pudo levantar PostgreSQL de pruebas con Testcontainers. Enciende Docker Desktop…`. Si Testcontainers ignora `DOCKER_HOST` y usa otra estrategia (la corrida pasa), se reporta como **"no verificado sin apagar Docker Desktop"**. No se apaga Docker Desktop ni se intenta otra simulación |
| V-17 | Huella de `campus_dev` después, guardada en `backend/tmp/huella-despues.txt`, y `Compare-Object (Get-Content backend\tmp\huella-antes.txt) (Get-Content backend\tmp\huella-despues.txt)` | **Idéntica** (`Compare-Object` sin salida). **V-17b**, único caso tolerado: si difieren **solo** `sesiones=`, `max_sesiones=` y el tramo `sesiones:` de `stats=`, **y** V-01 registró un proceso ajeno escuchando en 3000, se reporta como actividad del humano (S-09) con esa evidencia. Cualquier otra diferencia: PA-10 |
| V-18 | Hashes de los 14 archivos del Tester (igual que V-03); `Select-String -Path backend\test\*.ts,backend\src\**\*.test.ts -Pattern "\.skip\|\.only\|\.todo\|\.fails\|skipIf\|runIf\|\bxit\b\|xdescribe"` | Los 14 idénticos a la tabla; sin coincidencias nuevas |
| V-19 | `git diff --quiet -- backend/src backend/prisma backend/prisma.config.ts backend/.env.example backend/tsconfig.json shared frontend infra tsconfig.base.json eslint.config.mjs .prettierrc.json .prettierignore .gitignore .gitattributes AGENTS.md CLAUDE.md .claude docs/ARCHITECTURE.md docs/ARCHITECTURE-ESSENTIALS.md docs/PRD.md; "codigo=$LASTEXITCODE"`; `git status --short --untracked-files=all` | `codigo=0`. Si el orquestador ya aplicó los textos propuestos a `AGENTS.md`, ESSENTIALS o `ARCHITECTURE.md`, se quitan esos archivos del comando y se reporta. El estado muestra **solo**: `M README.md`, `M backend/package.json`, `M package-lock.json`, `M backend/vitest.config.ts`, `M` en `backend/test/setup.ts`, `admin-unico.integracion.test.ts`, `ayudas-auth.ts`, `salud.integracion.test.ts`, `auth-login.integracion.test.ts` y `auth-registro.integracion.test.ts`, y `??` en `backend/test/entorno-de-pruebas.ts`, `backend/test/global-setup.ts` y los archivos de `docs/trabajo/CHORE-01-testcontainers/` (`plan.md`, `aprobacion.md` si ya existe, y el resumen). `backend/tmp/` no aparece porque está en `.gitignore` |
| V-20 | Ejecutar tal cual, en `powershell.exe -NoProfile`, los comandos nuevos del README (`docker ps -a --filter "label=org.testcontainers=true"`) | Solo la línea de encabezados |
| V-21 | `Select-String -Path backend\test\*.ts -Pattern "loadEnvFile\|env-file"`; `Select-String -Path backend\test\*.ts,backend\src\**\*.test.ts -Pattern "postgres(ql)?://"` | La primera sin coincidencias. La segunda solo en `global-setup.ts` (la plantilla de la URL), `src/config/env.test.ts` y `src/config/env.ataque.test.ts` (literales de validación pura que nunca se conectan). Cualquier otra coincidencia se reporta y se explica |

**Lista de V-06:**
1. En `@testcontainers/postgresql/build/*.d.ts`:
   - `new PostgreSqlContainer(image: string)`, `withDatabase`, `withUsername`, `withPassword` y `start()`;
   - en `StartedPostgreSqlContainer`: `getHost`, `getPort` (puerto publicado del 5432) y `stop`.
2. La imagen y la etiqueta de Ryuk: buscar `ryuk` en `node_modules/testcontainers/build`.
3. Las etiquetas que pone Testcontainers, para confirmar `org.testcontainers=true`: buscar `org.testcontainers` en `node_modules/testcontainers/build`.
4. Si la publicación de puertos fija `HostIp`: buscar `HostIp` y `PortBindings` (R-03).
5. El orden de las estrategias de conexión y si `DOCKER_HOST` inalcanzable cae a otra estrategia; anticipa V-16.
6. `engines` de los dos paquetes instalados.

**Comando de la huella (V-02, V-17), desde `infra/`, en una sola línea:**
```powershell
docker compose exec -T postgres psql -U campus -d campus_dev -At -c "SELECT concat_ws(' | ', 'usuarios=' || (SELECT count(*) FROM usuarios), 'pruebas_local=' || (SELECT count(*) FROM usuarios WHERE email LIKE '%@pruebas.local'), 'max_usuarios=' || coalesce((SELECT max(creado_en)::text FROM usuarios), '-'), 'sesiones=' || (SELECT count(*) FROM sesiones), 'max_sesiones=' || coalesce((SELECT max(creado_en)::text FROM sesiones), '-'), 'migraciones=' || (SELECT count(*) FROM _prisma_migrations), 'stats=' || (SELECT string_agg(relname || ':' || n_tup_ins || '/' || n_tup_upd || '/' || n_tup_del, ',' ORDER BY relname) FROM pg_stat_user_tables WHERE relname IN ('_prisma_migrations', 'sesiones', 'usuarios')));" > ..\backend\tmp\huella-antes.txt
```
- Para V-17 se usa el mismo comando con `huella-despues.txt`. Crea `backend\tmp` si no existe (`New-Item -ItemType Directory -Force ..\backend\tmp`).
- **Por qué `pg_stat_user_tables`:** `n_tup_ins`, `n_tup_upd` y `n_tup_del` son contadores acumulados, así que delatan también un `INSERT` seguido de un `DELETE`, que los conteos y los `MAX` no verían. Es la única forma de demostrar "sin ninguna fila nueva" frente a pruebas que crean y borran.

**Los 14 archivos del Tester y su SHA-256** ("Cierre (M-13)" de `docs/trabajo/AUTH-01-autenticacion-basica/reporte-tester.md`; `Get-FileHash` los muestra en mayúsculas, así que compara sin distinguir mayúsculas):

| Archivo | SHA-256 |
|---|---|
| `backend/test/auth-login.ataque.test.ts` | `b28792465e598a7ffbd223f541e136dd7b7a86cafc6c478865f33656a0334a48` |
| `backend/test/auth-registro.ataque.test.ts` | `7fbb3d41788427586b62b026ad91bbf33ce338fb9bd4dbe7acd54be19d4d5710` |
| `backend/test/sesiones-y-cadena.ataque.test.ts` | `7b979360c3773e316a641a7521795ffe7f99d9e625dc18ab3992868cfb8db249` |
| `backend/test/api-real.ataque.test.ts` | `d9553a09f5a52fb27fdddf77c4d28e3d9d3af34797436a7b02bdb7c2eb08cc17` |
| `backend/test/admin-unico.ataque.test.ts` | `dfa214f4ec49a2662b0e6069b45bac162f9bb5f5f1ec5262511919c3b530f6c1` |
| `backend/src/config/env.ataque.test.ts` | `4fce3cedf662ba3a188f21a2277db417747d342c115efd4746d3cff58499289b` |
| `frontend/src/services/apiClient.ataque.test.ts` | `10c730348d18ff8dae7b3623751d31122aa58560b564ad191717fa1938a6f8ce` |
| `frontend/src/app/router.ataque.test.tsx` | `e58293532633dc5cfe21561e2609d170638c81886b9c31129f03864c73a34f45` |
| `backend/test/intentos-r2.ataque.test.ts` | `a8b79d5ad98270be3747f493865708a78bb73add08d832584db4464c3582777a` |
| `backend/test/guarda-r2.ataque.test.ts` | `ea078f41cc98c947d9b3966ee8eccec2bd5d06eacbaf7ee8cd85f38e6a697c15` |
| `backend/test/nombres-tokens-r2.ataque.test.ts` | `00a6eb6f7ccd7d8790c356befcc96ddfda6eacce0be53de255cfe3626d8f2adb` |
| `backend/test/logs-r2.ataque.test.ts` | `5af3909e4b7ca485e78979567872ea78bf41e6d679b9ec2c761eaa0b250df689` |
| `frontend/src/app/sesion-r2.ataque.test.tsx` | `06f35be8ae68f0abae775268e4e64f3df880ff137a9b54aa3c135941ddb93dcf` |
| `backend/test/nombres-guarda-r3.ataque.test.ts` | `97b8d6f6c6b26b9b651eb0b46a48ed27b594a8ef659937eb600fde793f07e873` |

Se esperan **los 14 sin cambios**. Si la excepción de PA-12 llevara al Tester a ajustar uno, el Tester publica el hash nuevo en `docs/trabajo/CHORE-01-testcontainers/reporte-tester.md` y los demás siguen iguales.

**Configuraciones temporales** (en `backend/tmp/`; se borran al terminar su verificación):

`vitest.guarda-campus-dev.config.ts` (V-08 a). La contraseña es falsa a propósito: aunque la guarda fallara, la conexión no se autenticaría.
```ts
import { fileURLToPath } from "node:url"
import { defineConfig } from "vitest/config"

// Temporal (CHORE-01, V-08 a). Sin globalSetup: entrega a setup.ts una URL de campus_dev con una
// contraseña falsa. La guarda debe detener el archivo antes de importarlo.
export default defineConfig({
  test: {
    root: fileURLToPath(new URL("..", import.meta.url)),
    environment: "node",
    setupFiles: ["./test/setup.ts"],
    include: ["test/salud.integracion.test.ts"],
    provide: {
      entornoDePruebas: {
        databaseUrl: "postgresql://campus:no-es-la-real@127.0.0.1:5433/campus_dev?schema=public",
        jwtSecret: "secreto-de-v08-que-no-se-usa-0123456789",
        adminEmail: "nadie@v08.local",
        adminPassword: "no-se-usa-0123",
        adminNombre: "Nadie",
      },
    },
  },
})
```
`vitest.guarda-sin-base.config.ts` (V-08 b): igual, **sin** la clave `provide`.

`vitest.aserciones.config.ts` (V-11):
```ts
import { fileURLToPath } from "node:url"
import { defineConfig } from "vitest/config"

// Temporal (CHORE-01, V-11). Misma configuración que vitest.config.ts, más requireAssertions.
export default defineConfig({
  test: {
    root: fileURLToPath(new URL("..", import.meta.url)),
    environment: "node",
    globalSetup: ["./test/global-setup.ts"],
    setupFiles: ["./test/setup.ts"],
    include: ["src/**/*.test.ts", "test/**/*.test.ts"],
    testTimeout: 15000,
    expect: { requireAssertions: true },
  },
})
```

**V-15, interrupción (PowerShell, desde `backend/`):**
```powershell
$p = Start-Process -FilePath "npx.cmd" -ArgumentList "vitest","run" -WorkingDirectory (Get-Location) -RedirectStandardOutput "tmp\v15.out.log" -RedirectStandardError "tmp\v15.err.log" -PassThru -NoNewWindow
$p.Id | Set-Content "tmp\v15.pid"
```
- Espera, sondeando cada 2 s durante 60 s como máximo, a que `docker ps --filter "label=org.testcontainers=true" --format "{{.Image}}"` muestre `postgres:17.11-trixie`. Anota las imágenes que aparezcan, incluida la de Ryuk.
- Espera 10 s más y ejecuta `taskkill /PID <$p.Id> /T /F`. Es un PID propio: nunca otro.
- Sondea `docker ps -a --filter "label=org.testcontainers=true"` cada 10 s durante 120 s como máximo y anota cuándo queda vacío.
- Toma la huella.

**V-16, Docker no disponible (PowerShell, desde `backend/`):**
```powershell
$env:DOCKER_HOST = "tcp://127.0.0.1:1"
try { npx vitest run test/salud.integracion.test.ts *> tmp\v16.log; "codigo=$LASTEXITCODE" } finally { Remove-Item Env:DOCKER_HOST }
```

## Pasos de implementación
1. **V-01, V-02, V-03.** Sin huella ni hashes no se edita nada (PA-01, PA-18).
2. **V-04** (PA-02, PA-03).
3. Editar `backend/package.json`: `fastify-plugin` → `^6.0.0`; `@testcontainers/postgresql` `^12.1.0` en `devDependencies`. `npm install` desde la raíz. **V-05** (PA-04, PA-05, PA-06).
4. **V-06**, solo lectura de `node_modules/` (PA-07).
5. **V-07**: `npm run build` y `npm run lint` en `backend/`. **Sin pruebas** (PA-03).
6. Crear `backend/test/entorno-de-pruebas.ts`.
7. Crear `backend/test/global-setup.ts`, ajustando solo los nombres de métodos que V-06 haya mostrado distintos.
8. Reescribir `backend/test/setup.ts`.
9. Editar `backend/vitest.config.ts`. **A partir de aquí se permiten las pruebas.**
10. **V-08**, la guarda forzada: crear las dos configuraciones, ejecutar, comprobar la huella y borrar las configuraciones (PA-10, PA-11).
11. **V-09**, la primera corrida real acotada (PA-08, PA-09, PA-13, PA-14, PA-16).
12. Reescribir `admin-unico.integracion.test.ts`. Actualizar los comentarios y el mensaje de `ayudas-auth.ts`, `salud.integracion.test.ts`, `auth-login.integracion.test.ts` y `auth-registro.integracion.test.ts`.
13. **V-10**, el backend completo (PA-12, PA-15, PA-17).
14. **V-11**, el diagnóstico de aserciones; borrar la configuración (PA-19).
15. `README.md`: §1 y §7.
16. **V-12**: Prettier acotado, y `lint` y `build` desde la raíz. Antes, confirma que no quedan configuraciones temporales en `backend/tmp/`.
17. **V-13**, las tres corridas completas desde la raíz.
18. **V-14, V-15 y V-16.**
19. **V-17, V-18, V-19, V-20 y V-21.**
20. Entregar `docs/trabajo/CHORE-01-testcontainers/resumen-programador.md` con:
   - la salida real de cada V-xx;
   - **cada PARADA respondida** ("no se activó" / "se activó y me detuve");
   - cada **[verificar]** con lo encontrado (archivo y línea), incluidas la etiqueta de Ryuk y la clave de las etiquetas de Testcontainers;
   - las duraciones (V-09, V-10 y V-13, con el tiempo del `globalSetup` si Vitest lo separa);
   - los paquetes añadidos por `npm install`;
   - las desviaciones y lo no verificado (V-16 si aplica);
   - la lista de archivos por paso.

## Puntos de revisión para el Manager (modo final)
- `backend/src/**` sin diff (V-19) y los 14 hashes del Tester iguales (V-18).
- **La guarda:**
  - que no exista ningún camino por el que la `DATABASE_URL` de `backend/.env` llegue a una prueba o a un proceso hijo (leer `setup.ts`, `global-setup.ts` y V-21);
  - que V-08 muestre 0 pruebas ejecutadas.
- **La huella:** V-02 = V-17, incluidos los contadores de `pg_stat_user_tables`. Si se aplicó V-17b, revisar la evidencia.
- **La fixture del administrador (DEC-04):**
  - correo fuera de `@pruebas.local`;
  - V-11 demuestra que las ramas de S-08 afirman;
  - `admin-unico.integracion` falla cerrada sin admin.
- **Ryuk:** etiqueta de imagen y de contenedor; sin huérfanos tras terminar (V-14) ni tras interrumpir (V-15).
- **V-16:** verificado o declarado "no verificado".
- Una sola copia de `fastify-plugin` y `tsc` limpio sin tocar `src/`.
- Las dependencias transitivas nuevas, sin nada de AWS (V-05).
- Duración de la suite frente a los 12 s de AUTH-01 (R-05).
- El README frente al comportamiento medido (mensajes literales y conteos).
- Cada PARADA respondida (M-16 de AUTH-01).
- Los textos para `AGENTS.md`, ESSENTIALS y `ARCHITECTURE.md`, que aplica el orquestador.

## Propuestas de texto literal (las aplica el orquestador; no el Programador)

**`AGENTS.md`, "Comandos", bloque del backend.** Sustituir la línea de `npm run test` por:
```
npm run test             # Vitest: unitarias e integración contra un PostgreSQL desechable por corrida (Testcontainers; necesita Docker Desktop, no infra)
```

**`AGENTS.md`, "Pruebas".** Sustituir la tercera viñeta ("Las pruebas unitarias de `core/` usan dobles en memoria. Las de integración… queda pendiente para un encargo posterior.") por:
> - Las pruebas unitarias de `core/` usan dobles en memoria. Las de integración (handlers y repositorios) corren con Vitest contra un PostgreSQL desechable que Testcontainers levanta en cada corrida (`backend/test/global-setup.ts`): la misma imagen que `infra/`, las migraciones aplicadas con `prisma migrate deploy` y un único administrador creado con `seed:admin`. Ninguna prueba se conecta a `campus_dev`, a una base compartida ni a `prod`: una guarda en `backend/test/setup.ts` detiene la suite si la base no es la desechable. Toda corrida del backend necesita Docker Desktop encendido.

**`docs/ARCHITECTURE-ESSENTIALS.md`, "Stack", viñeta "Pruebas".** Sustituir por:
> - **Pruebas:** Vitest. Backend: unitarias de `core/` y `config/`, e integración contra un PostgreSQL desechable por corrida con Testcontainers (imagen de `infra/`, `prisma migrate deploy` al iniciar); nunca `campus_dev`, una base compartida ni `prod`. Frontend: jsdom + Testing Library, sin API ni infra

**`docs/ARCHITECTURE.md` §2, fila "Pruebas".** Sustituir por:
```
| Pruebas | Vitest. Backend: unitarias e integración contra un PostgreSQL desechable por corrida con Testcontainers (misma imagen que `infra/`, migraciones con `prisma migrate deploy`; nunca `campus_dev`, una base compartida ni `prod`). Frontend: jsdom + Testing Library · Playwright (hito 3) | — |
```

**`docs/ARCHITECTURE.md` §5 (opcional, coherencia).** En la línea `│   ├── test/               configuración de Vitest y pruebas de integración`, sustituir por:
```
│   ├── test/               configuración de Vitest (base desechable con Testcontainers) y pruebas de integración
```

**`docs/ARCHITECTURE.md` §20 (opcional, recomendado por el precedente de D-23).** Nueva fila:
```
| D-25 | Pruebas de integración contra un PostgreSQL desechable por corrida con Testcontainers (imagen fijada de `infra/`, `migrate deploy` al iniciar, un administrador sembrado con `seed:admin`); la imagen `testcontainers/ryuk` de Docker Hub es una herramienta local y no cuenta como proveedor | PostgreSQL de `infra/` (`campus_dev`) · un contenedor por archivo | Las pruebas escribían en la base de desarrollo; un contenedor por corrida aísla los datos sin multiplicar el tiempo de la suite. Acordado en M-05 de AUTH-01 y aplicado en CHORE-01 |
```

**Sin cambios:**
- `.claude/agents/tester.md`, que ya describe Testcontainers (C-01);
- `CLAUDE.md`, que no menciona dónde corren las pruebas de integración.

**Pendientes para encargos siguientes (anotar en `aprobacion.md`):**
- **CI / DEPLOY:** `prisma generate` necesita una `DATABASE_URL` de relleno (S-05, C-03); CI necesita Docker para Testcontainers.
- **Futura ronda del Tester:**
  - cambiar los `if (!admin) return` de S-08 por aserciones de precondición;
  - retirar la transacción revertida de `admin-unico.ataque` (DEC-06).
- **Opcional:**
  - separar las unitarias del backend en un proyecto de Vitest sin `globalSetup` (R-01);
  - una regla de ESLint que impida importar `@testcontainers/*` desde `backend/src/**` (R-11).

## Variante P-01 = sí (solo si el humano la elige en la aprobación)
Sustituye DEC-05. Todo lo demás del plan se mantiene.
1. **`entorno-de-pruebas.ts`:**
   - `EntornoDePruebas` gana `modo: "contenedor" | "infra"`;
   - `validarUrlDePruebas(url, modo)` acepta `campus_dev` **solo** con `modo === "infra"` y host de loopback. En modo contenedor sigue exigiendo `campus_pruebas`.
2. **`global-setup.ts`:** si `process.env.PRUEBAS_CONTRA_INFRA === "1"`:
   - no arranca contenedor ni ejecuta `migrate deploy` ni `seed:admin`;
   - toma **solo** `DATABASE_URL` de `backend/.env` con `util.parseEnv(readFileSync(...))`, sin cargarlo en `process.env` (lo lee el código; el agente no lo lee ni lo imprime);
   - genera `JWT_SECRET` y `ADMIN_*` aleatorios como en el modo normal;
   - provee `modo: "infra"`;
   - el cierre no hace nada.
3. **`setup.ts`:** pasa `entorno.modo` a la guarda.
4. **`admin-unico.integracion`:** no cambia. Con el admin de desarrollo, el segundo falla con 409; sin admin, la precondición falla antes de insertar.
5. **README §7:** subsección "Solo para depurar: contra `campus_dev`", con:
   - `$env:PRUEBAS_CONTRA_INFRA = "1"; try { npx vitest run <archivo> } finally { Remove-Item Env:PRUEBAS_CONTRA_INFRA }`;
   - la advertencia de que escribe y borra filas `@pruebas.local` en `campus_dev`;
   - las dos consultas actuales para revisar y borrar residuos si la corrida se interrumpe (se conservan **solo** en esa subsección).
6. **Textos para el orquestador:** `AGENTS.md` "Pruebas" y ESSENTIALS añaden ", salvo con `PRUEBAS_CONTRA_INFRA=1`, explícita y solo para depurar".
7. **V-22:** desde `backend/`, `$env:PRUEBAS_CONTRA_INFRA = "1"; try { npx vitest run src/core test/salud.integracion.test.ts } finally { Remove-Item Env:PRUEBAS_CONTRA_INFRA }` (solo lectura: `core` no toca la base y `salud` hace `SELECT 1`).
   - Esperado: en verde, sin contenedor de Testcontainers y con **huella = V-02**.
   - La salida queda **probada sin escrituras**.
8. **"Qué autoriza"** añade: ejecutar V-22 tal cual y nada más contra `campus_dev`.
