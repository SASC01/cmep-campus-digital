# Resumen del Programador — CHORE-01

```
Plan: docs/trabajo/CHORE-01-testcontainers/plan.md (con aprobacion.md: P-01 = no, P-02 = sí, P-03 = solo @testcontainers/postgresql)
Pasos completados: 20 de 20. Hubo una parada en PA-06 (paso 3); el orquestador la resolvió y continué desde el paso 4
Archivos creados / modificados: ver "Archivos por paso"
Verificación: lint ok · test 399 pasan, 0 fallan (backend 31/330 + frontend 11/69), en tres corridas completas desde la raíz · build ok · prisma validate n/a (no se tocó el esquema)
Hallazgos atendidos: n/a (primera implementación). Parada PA-06 resuelta por el orquestador (aprobacion.md, "Parada PA-06 durante la implementación")
Desviaciones del plan: menores, ver "Desviaciones"
Pendiente o fuera de alcance detectado: ver "Observaciones y pendientes"
```

## Parada PA-06 (primera parte del encargo)
- **Condición:** en V-05 (paso 3), `npm ls --all | grep -iE "aws|firebase|supabase|vercel"` devolvió `aws-ssl-profiles@1.1.2`.
- **Qué hice:** me detuve y reporté. No hice nada más.
- **Evidencia:**
  - `npm explain aws-ssl-profiles` muestra la cadena `aws-ssl-profiles@"^1.1.1" from mysql2@3.15.3 ← mysql2@"3.15.3" from prisma@7.10.0 ← dev prisma@"^7.10.0" from @campus/backend`;
  - `git diff package-lock.json | grep aws` no encuentra nada, así que el paquete ya estaba antes del encargo;
  - `firebase`, `supabase` y `vercel` no aparecen.
- **Resolución del orquestador:** está registrada en `aprobacion.md`. El humano ya había aceptado `aws-ssl-profiles` en BACK-02 (M-01) y la regla 11 de `AGENTS.md` lo cubre. Desde ese momento, PA-06 significa "un paquete de AWS, Firebase, Supabase o Vercel que no estaba en el lock anterior a CHORE-01".
- **Qué pasó después:** continué desde el paso 4 sin repetir `npm install`. Con esa definición, PA-06 no se volvió a activar: el lock nuevo no añade ningún paquete así.
- **`4 high severity vulnerabilities` de `npm install`:** no ejecuté `npm audit`, porque no está autorizado. Según el orquestador, que sí lo ejecutó, son las 4 ya conocidas y aceptadas del CLI de Prisma (M-04 de BACK-02: `@prisma/config`, `deepmerge-ts`, `mysql2` y `prisma`), y Testcontainers no añade ninguna.

## Tabla de versiones
| Paquete | Declarado | Instalado | Notas |
|---|---|---|---|
| `fastify-plugin` | `^6.0.0` (antes `^5.1.0`) | 6.0.0, una sola copia; la de `@fastify/cookie@11.1.2` aparece como `deduped` | Sin `peerDependencies`, `engines` ni `dependencies` |
| `@testcontainers/postgresql` | `^12.1.0` (devDependency) | 12.1.0 | Sin `engines`. Depende de `testcontainers ^12.1.0` |
| `testcontainers` | transitivo (P-03) | 12.1.0 | `engines.node >= 22.22`, que Node 24.11.1 cumple |
| `testcontainers/ryuk` (imagen de Docker Hub) | la fija `testcontainers` | `0.14.0`, id `7c1a8a9a47c7`, 4.83 MB | Se descargó sola en V-09 |
| `postgres` (imagen) | `infra/docker-compose.yml` | `17.11-trixie`, id `f4c66b820c6f`, ya estaba en caché | |
| Vitest | sin cambio | 4.1.11 | |
| Node / npm / Docker | — | v24.11.1 / 11.6.2 / 28.5.1 | |

- **Qué cambió `npm install`:** `added 147 packages, removed 1 package, changed 1 package, audited 907 packages in 35s`, con código 0.
- **Paquetes nuevos en el lock (149 entradas `node_modules/…`):**
  - de Testcontainers: `@testcontainers/postgresql`, `testcontainers`, `dockerode`, `docker-modem`, `docker-compose`, `ssh2`, `ssh-remote-port-forward`, `archiver`, `tar-fs`, `tar-stream`, `@grpc/grpc-js`, `protobufjs`, `properties-reader`, `get-port`, `async-lock`, `byline`, `tmp`, `yaml`, `yargs` y `glob@10.5.0`, que npm marca como obsoleto;
  - `cpu-features` y `nan`: opcionales, no se instalaron (`node_modules/cpu-features` no existe) y no se compiló nada;
  - dependencias menores: `bare-*`, `streamx`, `readable-stream`, etc.
- **Paquete quitado:** `@fastify/cookie/node_modules/fastify-plugin`.
- **Avisos `EBADENGINE`:** `jsdom@30.1.1`, `@asamuzakjp/*` y `w3c-xmlserializer@6.0.0` piden Node `^24.15.0`. Son del frontend y ya estaban: no aparecen en el diff del lock.

## Cada [verificar] del plan (V-06, lectura de `node_modules/`, sin ejecutar nada)
| Qué | Hallazgo | Dónde |
|---|---|---|
| API de `PostgreSqlContainer` | `constructor(image: string)`, `withDatabase`, `withUsername`, `withPassword` y `start(): Promise<StartedPostgreSqlContainer>`. Coinciden con el plan; no hubo que ajustar nombres | `@testcontainers/postgresql/build/postgresql-container.d.ts:2-13` |
| API de `StartedPostgreSqlContainer` | `getPort()` devuelve `super.getMappedPort(5432)`, el puerto publicado del 5432. `getHost()` y `stop()` vienen de `AbstractStartedContainer` | `postgresql-container.js:134-135`; `testcontainers/build/generic-container/abstract-started-container.d.ts:8,12` |
| Espera de arranque | `Wait.forAll([forHealthCheck(), forListeningPorts()])` con `pg_isready`, y `withStartupTimeout(120_000)` | `postgresql-container.js:38-40,109-112` |
| Imagen y etiqueta de Ryuk | `testcontainers/ryuk:0.14.0` (se cambia con `RYUK_CONTAINER_IMAGE`, que no usé) | `testcontainers/build/reaper/reaper.js:20-22` |
| Etiquetas de los contenedores | `org.testcontainers=true`, `org.testcontainers.lang=node`, `org.testcontainers.version` y `org.testcontainers.session-id`. Confirmado: el filtro `label=org.testcontainers=true` los encuentra (V-09, V-10 y V-15) | `testcontainers/build/utils/labels.js:6-18`; `generic-container.js:78,84` |
| Ryuk se autoborra | `AutoRemove: true` solo para la imagen de Ryuk | `generic-container.js:53` |
| Publicación de puertos (R-03) | `PortBindings` con `{ HostPort: "0" }` **sin `HostIp`**, así que Docker publica en todas las interfaces del anfitrión. Lo confirma la lectura; no lo comprobé con `docker inspect`. Mitigación del plan: contraseña aleatoria de 48 caracteres hex, datos sintéticos y vida de la corrida | `generic-container.js:290-305` |
| Orden de estrategias de conexión | `TestcontainersHostStrategy` → `ConfigurationStrategy` (`DOCKER_HOST` o `~/.testcontainers.properties`) → `UnixSocket` → `RootlessUnixSocket` → `NpipeSocket` (Windows). Si una falla, pasa a la siguiente | `testcontainers/build/container-runtime/clients/client.js:43-67` |
| Host en Windows | Con `npipe:` devuelve `"localhost"`; `global-setup.ts` lo cambia por `127.0.0.1` | `container-runtime/utils/resolve-host.js:21-33` |
| `engines` instalados | `@testcontainers/postgresql`: ninguno; `testcontainers`: `>= 22.22`; `fastify-plugin`: ninguno | `package.json` de cada paquete |
| Configuración local de Testcontainers | No existe `~/.testcontainers.properties`, no hay `DOCKER_HOST` ni variables `TESTCONTAINERS_*` en el entorno. Todo funcionó con la configuración por defecto | comprobación de existencia, sin leer contenido |
| `provide`/`inject` (Vitest 4.1.11) | `TestProject.provide` es una propiedad que valida con `structuredClone`. `inject` lee `getWorkerState().providedContext[key]`. `ProvidedContext` se exporta desde `vitest` y admite ampliación de módulo. `requireAssertions` existe. Funcionan en ejecución: V-09 (desde el `globalSetup`) y V-08 a (desde `test.provide` de la configuración) | `vitest/dist/chunks/cli-api.CnMVyzaz.js:10723-10731`; `dist/index.d.ts:105,641`; `dist/chunks/test.DNmyFkvJ.js:4165`; `reporters.d.DtoKVV2s.d.ts:3196` |
| Tiempos de arranque | Primera corrida (V-09), con descarga de Ryuk: 55 s desde "Start at" hasta el primer log de prueba. Con imágenes en caché: **7,5-7,8 s** desde "Start at" hasta el primer log de prueba, incluida la importación del primer archivo (V-10 y V-13). Vitest no separa el `globalSetup` en su resumen de "Duration" | `backend/tmp/v09.log`, `v10.log`, `corrida-*.log` |
| Limpieza de Ryuk | Tras terminar una corrida, el contenedor de pruebas se detiene en el cierre y Ryuk se borra solo en unos 10-20 s. Tras una interrupción, Ryuk borra los dos en ≤ 20 s (V-15) | V-09, V-10 y V-15 |

## Verificaciones V-01 a V-21 (salida real)

### V-01
- `v24.11.1`, `11.6.2` y Docker `28.5.1`.
- **Infra:** `docker compose ps` muestra `campus-dev-postgres-1` con `postgres:17.11-trixie`, `Up 2 hours (healthy)` en `127.0.0.1:5433->5432/tcp`; `livekit` y `minio`, `healthy`. Contenedor postgres: id `b37f9fd29203`, creado `2026-09-24 09:31:04 -0600`.
- **Imagen:** `postgres:17.11-trixie` presente (`f4c66b820c6f`).
- **Testcontainers:** `docker ps -a --filter "label=org.testcontainers=true"` muestra solo encabezados.
- **Puertos:** nada escucha en 3000 ni en 5173, así que no hay proceso ajeno.
- **`git status`:** además de la carpeta del encargo, solo los cambios del orquestador en `AGENTS.md` y `.claude/agents/tester.md`, con una línea añadida en cada uno (la regla de aserciones). Están autorizados y el orquestador confirmó mi lectura: PA-01 no se activó.

### V-02: huella de `campus_dev` antes (`backend/tmp/huella-antes.txt`)
```
usuarios=2 | pruebas_local=0 | max_usuarios=2026-09-24 16:09:30.85+00 | sesiones=7 | max_sesiones=2026-09-24 16:11:11.19+00 | migraciones=2 | stats=_prisma_migrations:2/4/0,sesiones:3235/1055/3228,usuarios:4825/488/4458
```
Coincide con la referencia del orquestador.

### V-03
`sha256sum -c` da los 14/14 OK frente a la tabla del plan, que es igual a "Cierre (M-13)" de AUTH-01.

### V-04
| Consulta | Resultado |
|---|---|
| `@testcontainers/postgresql`, versiones 12.x | 12.0.0-12.0.4 y 12.1.0; `latest` = `12.1.0`. Depende de `testcontainers ^12.1.0`; sin `engines` |
| `testcontainers`, versiones 12.x | 12.0.0-12.0.4 y 12.1.0; `latest` = `12.1.0`. `engines.node >= 22.22` |
| `fastify-plugin@6.0.0` | `peerDependencies`, `engines` y `dependencies` vacíos |

PA-02 y PA-03 no se activaron.

### V-05
- `npm install` desde la raíz terminó con código 0; el detalle está arriba.
- `npm ls fastify-plugin @testcontainers/postgresql testcontainers`:
  ```
  `-- @campus/backend@0.0.0 -> .\backend
    +-- @fastify/cookie@11.1.2
    | `-- fastify-plugin@6.0.0 deduped
    +-- @testcontainers/postgresql@12.1.0
    | `-- testcontainers@12.1.0
    `-- fastify-plugin@6.0.0
  ```
- `npm explain fastify-plugin`: 6.0.0, pedido por `@fastify/cookie` y por `@campus/backend`.
- La búsqueda `aws|firebase|supabase|vercel` solo encontró `aws-ssl-profiles@1.1.2`, que ya estaba y viene de Prisma. Eso activó PA-06; ver la sección de arriba.

### V-06
Ver la tabla de [verificar]. PA-07 no se activó: la API permite fijar base, usuario y contraseña con los nombres del plan.

### V-07
Desde `backend/`, `npm run build` y `npm run lint` terminaron con código 0: `tsc` acepta `fastify-plugin` 6 sin tocar `src/`. PA-03 no se activó.

### V-08: guarda forzada (tras el paso 9)
- **(a) `npx vitest run --config tmp/vitest.guarda-campus-dev.config.ts`:** `codigo=1`.
  ```
   ❯ test/salud.integracion.test.ts (0 test)
  Error: Guarda de la base de pruebas: la base es "campus_dev" y las pruebas solo aceptan "campus_pruebas". No se ejecutó ninguna prueba.
   ❯ test/setup.ts:19:9
   Test Files  1 failed (1)
        Tests  no tests
  ```
- **(b) `npx vitest run --config tmp/vitest.guarda-sin-base.config.ts`:** `codigo=1`.
  ```
   ❯ test/salud.integracion.test.ts (0 test)
  Error: Falta la base de pruebas: corre las pruebas con npm test o npx vitest desde backend/, que la levantan con Testcontainers (test/global-setup.ts).
   Test Files  1 failed (1)
        Tests  no tests
  ```
- **Contenedores de Testcontainers:** ninguno.
- **Huella:** igual a V-02 (`cmp`, en `huella-v08.txt`).
- **Limpieza:** borré las dos configuraciones.
- PA-10 y PA-11 no se activaron.

### V-09: primera corrida real (`npx vitest run test/salud.integracion.test.ts` → `tmp/v09.log`)
- `codigo=0`: `Test Files 1 passed (1)`, `Tests 4 passed (4)`.
- **Duración:** `55.42s`, con `import 4.04s` y `tests 7.29s`. Fue la primera corrida y descargó Ryuk.
- **Contenedores:** al terminar solo quedaba `testcontainers/ryuk:0.14.0 Up 25 seconds`; a los +13 s ya no había ninguno. Lo comprobé otra vez a los +21 s y a los +87 s: vacío.
- **Huella:** igual a V-02 (`huella-v09.txt`).
- PA-08, PA-09, PA-13, PA-14 y PA-16 no se activaron.

### V-10: backend completo (`npm test` en `backend/` → `tmp/v10.log`)
- `codigo=0`: `Test Files 31 passed (31)`, `Tests 330 passed (330)`.
- **Duración:** Vitest `18.31s`; 23 s en total con el `pretest`.
- `FSTDEP` = 0.
- **Contenedores:** Ryuk se borró solo entre 11:15:11 y 11:15:21.
- **Huella:** igual a V-02.
- PA-12, PA-15 y PA-17 no se activaron.

### V-11: `requireAssertions` (`tmp/vitest.aserciones.config.ts`, `--reporter=verbose` → `tmp/v11.log`)
- `codigo=0`: `Test Files 5 passed (5)`, `Tests 71 passed (71)`.
- Las 5 pruebas señaladas pasan con aserciones:
  ```
  ✓ test/admin-unico.ataque.test.ts > ... > promover un estudiante a admin con UPDATE choca con usuarios_un_solo_admin_idx
  ✓ test/admin-unico.integracion.test.ts > ... > con el administrador de la base ya creado, un segundo admin falla con 409 ADMIN_YA_EXISTE
  ✓ test/auth-registro.ataque.test.ts > ... > no se puede registrar el correo del administrador real (ni en mayúsculas)
  ✓ test/sesiones-y-cadena.ataque.test.ts > ... > rama positiva de requireRole(['admin']) con el admin real (solo lectura, sin sesiones)
  ✓ test/api-real.ataque.test.ts > ... > seed:admin con un admin ya creado sale con código 1 y no imprime ADMIN_PASSWORD
  ```
- Ninguna otra prueba de esos archivos falló por falta de aserciones.
- **Limpieza:** borré la configuración.
- **Huella:** igual a V-02.
- PA-19 no se activó.

### V-12
- **Antes:** no quedaba ninguna configuración temporal (`ls tmp/*.config.ts` no encuentra nada).
- **`npx prettier --check test vitest.config.ts`** (lectura previa): solo `test/entorno-de-pruebas.test.ts` y `test/global-setup.ts` necesitaban formato.
- **`npx prettier --write test vitest.config.ts`:** reformateó solo esos 2 archivos; los otros 24, incluidos todos los `*.ataque`, quedaron `(unchanged)`. Los 14 hashes siguieron OK.
- **Desde la raíz:** `npm run lint` terminó con código 0 y `npm run build` también. El aviso `Some chunks are larger than 500 kB` es del frontend y viene de FRONT-01.

### V-13: tres corridas completas de `npm test` desde la raíz (`backend/tmp/corrida-<n>.log`)
| Corrida | Código | Backend | Duración backend (Vitest) | Frontend | Duración frontend | Total `npm test` | `FSTDEP` | Huella |
|---|---|---|---|---|---|---|---|---|
| 1 | 0 | 31/330 | 17,48 s | 11/69 | 48,66 s (caché fría de jsdom) | 74 s | 0 | = V-02 |
| 2 | 0 | 31/330 | 17,25 s | 11/69 | 7,35 s | 32 s | 0 | = V-02 |
| 3 | 0 | 31/330 | 17,60 s | 11/69 | 8,45 s | 34 s | 0 | = V-02 |

**Resultado: 399/399 en las tres corridas.**
- La suite del backend pasa de unos 12 s en AUTH-01 a unos 17-18 s con Vitest. Aproximadamente 7,5 s son el `globalSetup` más el arranque del primer proceso.
- Queda muy por debajo del umbral de 90 s de R-05.
- PA-10, PA-12 y PA-15 no se activaron.

### V-14
A las 11:21:52 (91 s después del fin de la tercera corrida, a las 11:20:21), `docker ps -a --filter "label=org.testcontainers=true" --format ...` volvió vacío. PA-16 no se activó.

### V-15: interrupción con PID propio (script de PowerShell con los comandos del plan)
```
11:22:17 arranque PID propio=22956
11:22:21 postgres visto=True imagenes=postgres:17.11-trixie, testcontainers/ryuk:0.14.0
11:22:31 contenedores antes de matar:
5da8b7017c06 postgres:17.11-trixie Up 11 seconds (healthy)
b2777c2312c2 testcontainers/ryuk:0.14.0 Up 12 seconds
11:22:32 taskkill /PID 22956 /T /F      -> 16 procesos terminados, todos descendientes de 22956 (22956 → 2208 → 24664 → 8840 → hijos)
11:22:32 proceso raiz terminado=True
11:22:32 +0s quedan: postgres (healthy) ; ryuk
11:22:42 +10s quedan: postgres (healthy) ; ryuk
11:22:53 +20s vacio
```
- **Procesos:** no toqué ningún proceso ajeno; 6760 y 15016 no aparecen en el árbol.
- **Después:** los PID 22956, 2208, 24664 y 8840 ya no existen, y 3000 y 5173 están libres.
- **Huella:** igual a V-02 (`huella-v15.txt`).
- **Archivos:** `tmp/v15.pid` contiene `22956`; `tmp/v15.err.log` está vacío.
- PA-16 y PA-10 no se activaron.

### V-16: Docker no disponible (`DOCKER_HOST=tcp://127.0.0.1:1`, con `try/finally`)
- **Resultado:** `codigo=1`, y después `DOCKER_HOST despues=[]`. El log (`tmp/v16.log`) muestra:
  ```
  Error: No se pudo levantar PostgreSQL de pruebas con Testcontainers. Enciende Docker Desktop y vuelve a correr las pruebas.
   ❯ iniciarContenedor test/global-setup.ts:51:11
  Caused by: Error: Could not find a working container runtime strategy
  ```
- **Queda VERIFICADO sin apagar Docker Desktop.** Mi lectura de V-06 preveía que la estrategia `npipe` rescataría la conexión, pero no lo hizo.
  - **Hipótesis, sin confirmar:** `docker-modem` toma sus valores por defecto de `process.env.DOCKER_HOST` (`docker-modem/lib/modem.js:15-75`) y los mezcla con las opciones de cada estrategia, así que también la de `npipe` apunta al host inalcanzable.
- **Mensaje extra:** Vitest imprime además `No test files found, exiting with code 1`. Es cosmético y aparece cuando falla el `globalSetup`.
- **Contenedores después:** ninguno.

### V-17: huella de `campus_dev` después (`backend/tmp/huella-despues.txt`)
```
usuarios=2 | pruebas_local=0 | max_usuarios=2026-09-24 16:09:30.85+00 | sesiones=7 | max_sesiones=2026-09-24 16:11:11.19+00 | migraciones=2 | stats=_prisma_migrations:2/4/0,sesiones:3235/1055/3228,usuarios:4825/488/4458
```
- `Compare-Object (Get-Content backend\tmp\huella-antes.txt) (Get-Content backend\tmp\huella-despues.txt)` no da salida: la huella es **idéntica**, incluidos los contadores de `pg_stat_user_tables`.
- No hizo falta V-17b.

### V-18
- **Hashes:** los 14 `*.ataque.test.ts(x)` dan OK frente a la tabla ("Cierre (M-13)"):

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

- **Marcadores de salto:** el `Select-String` del plan no encontró nada. En PowerShell 5.1, `**` de `-Path` no recorre subcarpetas, así que repetí la búsqueda con `grep -rnE "\.skip|\.only|\.todo|\.fails|skipIf|runIf|\bxit\b|xdescribe" backend/test backend/src` sobre los 31 archivos `*.test.ts`: tampoco hay coincidencias (código 1).

### V-19
- `git diff --quiet -- backend/src backend/prisma backend/prisma.config.ts backend/.env.example backend/tsconfig.json shared frontend infra tsconfig.base.json eslint.config.mjs .prettierrc.json .prettierignore .gitignore .gitattributes CLAUDE.md docs/ARCHITECTURE.md docs/ARCHITECTURE-ESSENTIALS.md docs/PRD.md` da `codigo=0`.
- Quité `AGENTS.md` y `.claude` del comando, como prevé el plan: llevan los cambios del orquestador. `git diff --numstat` muestra `1 0` en cada uno, sin cambios míos.
- `git status --short --untracked-files=all`:
  ```
   M .claude/agents/tester.md                      (orquestador)
   M AGENTS.md                                     (orquestador)
   M README.md
   M backend/package.json
   M backend/test/admin-unico.integracion.test.ts
   M backend/test/auth-login.integracion.test.ts
   M backend/test/auth-registro.integracion.test.ts
   M backend/test/ayudas-auth.ts
   M backend/test/salud.integracion.test.ts
   M backend/test/setup.ts
   M backend/vitest.config.ts
   M package-lock.json
  ?? backend/test/entorno-de-pruebas.test.ts       (P-02)
  ?? backend/test/entorno-de-pruebas.ts
  ?? backend/test/global-setup.ts
  ?? docs/trabajo/CHORE-01-testcontainers/aprobacion.md
  ?? docs/trabajo/CHORE-01-testcontainers/plan.md
  ?? docs/trabajo/CHORE-01-testcontainers/resumen-programador.md
  ```
- `backend/tmp/` no aparece: `.gitignore:8`.

### V-20
`powershell.exe -NoProfile -Command 'docker ps -a --filter "label=org.testcontainers=true"'` muestra solo la línea de encabezados.

### V-21
- **(a)** `Select-String -Path backend\test\*.ts -Pattern "loadEnvFile|env-file"`: sin coincidencias.
- **(b)** `postgres(ql)?://` en las pruebas aparece solo en:
  - `backend/test/global-setup.ts:80`: la plantilla de la URL;
  - `backend/src/config/env.test.ts:5,33,53` y `backend/src/config/env.ataque.test.ts:7`: literales de validación pura;
  - `backend/test/entorno-de-pruebas.test.ts:14,23,30,35`: los literales de las 4 pruebas de la guarda (P-02). Solo pasan por `validarUrlDePruebas`, una función pura, y nunca se conectan.

## Paradas
| # | Estado y evidencia |
|---|---|
| PA-01 | No se activó: Docker responde y los 14 hashes coinciden. Los cambios de `AGENTS.md` y `tester.md` son del orquestador, están autorizados y él lo confirmó |
| PA-02 | No se activó (V-04) |
| PA-03 | No se activó (V-04 y V-07) |
| PA-04 | No se activó: código 0, sin compilación nativa |
| PA-05 | No se activó: una sola copia de `fastify-plugin@6.0.0` |
| **PA-06** | **Se activó y me detuve** (V-05, `aws-ssl-profiles` previo, de Prisma). El orquestador la resolvió en `aprobacion.md`. Con la definición vigente no se volvió a activar |
| PA-07 | No se activó (V-06) |
| PA-08 | No se activó: Testcontainers y Ryuk arrancaron con la configuración por defecto, sin `.testcontainers.properties`, `DOCKER_HOST` ni `TESTCONTAINERS_*` |
| PA-09 | No se activó: `inject` devolvió el entorno (V-09 y siguientes) |
| PA-10 | No se activó: la huella fue igual a V-02 en V-08, V-09, V-10, V-11, en cada corrida de V-13, en V-15 y en V-17 |
| PA-11 | No se activó: V-08 a falla con el mensaje de la guarda y 0 pruebas |
| PA-12 | No se activó: ningún `*.ataque` falló en ninguna corrida |
| PA-13 | No se activó. `migrate deploy` terminó con código 0 en todas las corridas; si hubiera fallado, el `globalSetup` habría lanzado su error. La carpeta `backend/prisma/migrations` tiene exactamente 2 migraciones (`extensiones_iniciales` y `usuarios_y_sesiones`) y el CLI no pidió crear ni editar ninguna. No vi directamente el recuento de la salida: `global-setup.ts` solo la muestra si falla, como dice el plan. Es una verificación indirecta |
| PA-14 | No se activó: `seed:admin` terminó con código 0 y V-11 confirma que existe el admin. No hizo falta tocar nada fuera de "Modificar" |
| PA-15 | No se activó: ninguna prueba intermitente; 399/399 en las tres corridas, además de V-10 y V-11 |
| PA-16 | No se activó: ningún contenedor con la etiqueta sobrevivió más de unos 20 s, ni al terminar ni al interrumpir |
| PA-17 | No se activó: `grep` de `too many clients|remaining connection slots|connection pool timeout|P2024` en todos los logs de corrida no encuentra nada |
| PA-18 | No se activó: el `postgres` de infra sigue con el mismo id `b37f9fd29203`, creado a las 09:31:04, `Up 2 hours (healthy)`; `livekit` y `minio` siguen `healthy` |
| PA-19 | No se activó (V-11) |

## Archivos por paso
| Paso | Archivos |
|---|---|
| 3 | `backend/package.json` (`fastify-plugin` `^6.0.0`; `@testcontainers/postgresql` `^12.1.0` en devDependencies) y `package-lock.json` (lo regeneró `npm install`) |
| 6 | `backend/test/entorno-de-pruebas.ts` (nuevo, literal del plan) |
| 7 | `backend/test/global-setup.ts` (nuevo, literal del plan; luego Prettier partió dos líneas largas) |
| 8 | `backend/test/setup.ts` (reescrito, literal del plan) |
| 9 | `backend/vitest.config.ts` (`globalSetup`) |
| 12 | `backend/test/admin-unico.integracion.test.ts` (reescrito, 2 casos); comentarios y mensaje literales en `ayudas-auth.ts`, `salud.integracion.test.ts`, `auth-login.integracion.test.ts` y `auth-registro.integracion.test.ts`; `backend/test/entorno-de-pruebas.test.ts` (nuevo, 4 casos, P-02) |
| 15 | `README.md`, "Backend en local": §1 (una frase) y §7 |
| 20 | `docs/trabajo/CHORE-01-testcontainers/resumen-programador.md` |

**Temporales propios en `backend/tmp/`** (ignorados por git; se quedan):
- huellas: `huella-antes.txt`, `huella-despues.txt`, `huella-v08.txt`, `huella-v09.txt`, `huella-v10.txt`, `huella-v11.txt`, `huella-v15.txt` y `huella-corrida-{1,2,3}.txt`;
- logs: `npm-install.log`, `v07-build.log`, `v07-lint.log`, `v08a.log`, `v08b.log`, `v09.log`, `v10.log`, `v11.log`, `v12-lint.log`, `v12-build.log`, `corrida-{1,2,3}.log`, `v15.out.log`, `v15.err.log` y `v16.log`;
- PID: `v15.pid`;
- análisis del diff del lock: `paquetes-lock.txt`, `lock-mas.txt` y `lock-menos.txt`.

Borré las tres configuraciones temporales de Vitest. No toqué `api-manager.log`, `vite-manager.log` ni `worker.err`, que no son míos. Fuera del repositorio, en el scratchpad de la sesión, quedan `hashes-esperados.txt` y `v15.ps1`.

## Desviaciones
Todas son menores. Ninguna cambia el comportamiento previsto por el plan.
1. **`admin-unico.integracion.test.ts`:** a la aserción de precondición del plan (`expect(adminPrevio).not.toBeNull()`) le añadí un mensaje, `"La base de pruebas no trae su administrador (test/global-setup.ts lo crea con seed:admin)"`. Así aplico la regla nueva de `AGENTS.md` "Pruebas" que pidió el orquestador: si falta la precondición, la prueba falla con un mensaje que lo explica. El resto es literal.
2. **`entorno-de-pruebas.test.ts` (P-02):** el plan no traía su contenido porque su valor por defecto era "no", así que lo escribí yo. Tiene 4 casos: `campus_dev` (con una comprobación de que el motivo no incluye la contraseña), host no local, otra base en loopback y "la URL de la corrida". Este último afirma sobre una URL con la plantilla de `global-setup.ts` y sobre la URL real inyectada con `inject("entornoDePruebas")`.
3. **README §7:**
   - los conteos son 31/330, no 30/326, por P-02;
   - añadí ", y de la guarda de la base de pruebas" a la lista de pruebas unitarias;
   - las cifras medidas son "entre 17 y 25 segundos: unos 7 para levantar y preparar la base". El 17 es el mínimo de Vitest en V-13; el 25 cubre los 23 s de `npm test` en `backend/` con el `pretest`.
   - Mantuve "tarda hasta un minuto" para Ryuk (medido: ≤ 20 s), por prudencia.
   - Esas cifras las ajusté después de V-13. Solo cambió texto del README, que ningún `lint` revisa.
4. **Comandos:**
   - Usé Git Bash en la mayoría, como admite S-10. La huella la escribí con la redirección de bash (UTF-8) antes y después, de forma consistente; la comparación final la hice con `Compare-Object` en PowerShell, como pide el plan.
   - Antes del `--write` ejecuté `npx prettier --check test vitest.config.ts`, de solo lectura y más acotado que el `--check .` autorizado.
   - Para V-18 añadí un `grep -r`, por la limitación de `**` en PowerShell 5.1.
   - Comprobé que existiera `~/.testcontainers.properties`, sin leerlo.
5. **Temporales:** `paquetes-lock.txt`, `lock-mas.txt` y `lock-menos.txt` no encajan en los patrones `huella-*.txt`, `*.log` y `*.pid` del plan. Los generé para listar los paquetes nuevos del lock en la parada PA-06.

## Observaciones y pendientes (fuera de alcance)
- **Los archivos de `backend/test/` no pasan por `tsc`.** `backend/tsconfig.json` solo incluye `src`, y Vitest transpila sin comprobar tipos. El tipado de `global-setup.ts`, de la ampliación de `ProvidedContext` y de `inject` solo quedó validado por la ejecución y por ESLint, que no es de tipos. Es anterior a este encargo; propondría un `tsconfig` de pruebas en un encargo aparte.
- **R-03 confirmado por lectura:** el PostgreSQL de pruebas se publica en todas las interfaces del anfitrión, porque no lleva `HostIp`. Queda mitigado como indica el plan.
- **V-16:** además del mensaje propio, Vitest imprime `No test files found, exiting with code 1`. Podría confundir, pero el mensaje correcto aparece justo debajo.
- **Siguen vigentes** los pendientes de `aprobacion.md`:
  - ronda del Tester para convertir los `if (!admin) return` en aserciones y retirar la transacción de `admin-unico.ataque`;
  - `DATABASE_URL` de relleno y Docker en CI/DEPLOY;
  - proyecto de Vitest para unitarias sin `globalSetup`;
  - regla de ESLint contra `@testcontainers/*` en `src/`.

## No verificado
- **Recuento de migraciones:** no leí directamente la salida de `migrate deploy` que dijera "2 migraciones aplicadas" (ver PA-13). La evidencia es indirecta.
- **Publicación de puertos:** no inspeccioné con `docker inspect` el `HostIp` real de un contenedor de pruebas; R-03 se basa en la lectura del código.
- **Hipótesis de V-16:** no la confirmé línea por línea. El resultado, en cambio, sí quedó verificado.
- **`npm audit`:** no lo ejecuté yo; el dato de las 4 vulnerabilidades altas es del orquestador.

## Ajuste M-01: PostgreSQL de pruebas en 127.0.0.1
Origen: M-01 de `revision.md` y "Decisiones del humano tras la revisión final", punto 1, de `aprobacion.md`. Ryuk queda fuera: su mitigación la aplica el humano en su equipo (`mitigacion-ryuk.md`).

```
Plan: M-01 (revision.md) + decisión 1 del humano (aprobacion.md)
Pasos completados: 1 de 1 (código). La verificación en ejecución queda pendiente por la parada de red pública
Archivos creados / modificados: backend/test/global-setup.ts (M-01, líneas 40-55 y 63)
Verificación: lint ok · build ok · tsc --noEmit de backend/src + backend/test + vitest.config.ts ok · test NO ejecutado (parada obligatoria) · prisma validate n/a
Hallazgos atendidos: M-01 corregido en la parte de PostgreSQL. La parte de Ryuk no se corrige en código, por decisión del humano (mitigación en el equipo)
Desviaciones: ninguna
Pendiente: verificación en ejecución (abajo)
```

### Qué cambié (`backend/test/global-setup.ts`)
- **Líneas 40-55, subclase nueva `PostgreSqlSoloEnLoopback extends PostgreSqlContainer`:**
  - redefine el gancho protegido `beforeContainerCreated()`;
  - primero llama al del padre, si existe (`await super.beforeContainerCreated?.()`), para no pisar un gancho futuro de la librería;
  - después reescribe `this.hostConfig.PortBindings`: cada enlace de cada puerto conserva su `HostPort` (`"0"`, puerto aleatorio) y recibe `HostIp: "127.0.0.1"`;
  - el comentario de las líneas 40-42 explica el porqué (M-01) y remite a `mitigacion-ryuk.md` para Ryuk.
- **Línea 63:** `iniciarContenedor` usa `new PostgreSqlSoloEnLoopback(imagen)` en lugar de `new PostgreSqlContainer(imagen)`. El resto de la cadena (`withDatabase`, `withUsername`, `withPassword` y `start`) no cambia.
- **Sin `any`:** `@types/dockerode` declara `PortBindings?: any`. Lo leo en una constante tipada con su forma real, `Record<string, { HostIp?: string; HostPort?: string }[]>`, la misma que `PortMap`/`PortBinding` de `@types/dockerode/index.d.ts:1157-1164`. No importo `dockerode`, que no es dependencia directa.
- No toqué nada más: ni Ryuk, ni `*.ataque`, ni docs, ni `AGENTS.md`.

### Firma confirmada en `node_modules`
| Qué | Dónde |
|---|---|
| `protected hostConfig: HostConfig` | `testcontainers/build/generic-container/generic-container.d.ts:14` |
| `protected beforeContainerCreated?(): Promise<void>` (método opcional protegido) | `generic-container.d.ts:36` |
| El gancho se llama en `start()`: después de descargar la imagen y antes de las etiquetas, de Ryuk y de crear el contenedor | `generic-container.js:61-69` |
| El contenedor se crea con `HostConfig: this.hostConfig`, es decir, con los enlaces ya reescritos | `generic-container.js:130` |
| `withExposedPorts` construye `PortBindings` con `[{ HostPort: "0" }]`, sin `HostIp` | `generic-container.js:290-305` (línea 299) |
| `PostgreSqlContainer` expone el 5432 en su constructor | `@testcontainers/postgresql/build/postgresql-container.js:38` |
| `PostgreSqlContainer.start()` no define el gancho y delega en `super.start()` | `postgresql-container.js:87-119`; `grep beforeContainerCreated` solo aparece en `generic-container.js:67-68` |
| `PortBindings?: any` en los tipos de dockerode | `@types/dockerode/index.d.ts:857` |
| `noImplicitOverride: true`, por eso el método lleva `override` | `tsconfig.base.json` |

### Comprobaciones hechas, sin arrancar contenedores
- **`tsc --noEmit` estricto:**
  - con `tsconfig.base.json`, más `typeRoots` hacia `node_modules/@types`, en `…/scratchpad/tsconfig.test.json`;
  - sobre `backend/src/**/*.ts`, `backend/test/**/*.ts` (25 archivos) y `backend/vitest.config.ts`;
  - resultado: **código 0**.
- **Prettier:** `npx prettier --check test/global-setup.ts` desde `backend/` pasa, así que no hizo falta `--write`.
- **Desde la raíz:**
  - `npm run lint`: **código 0**;
  - `npm run build`: **código 0**, con el mismo aviso de chunk > 500 kB del frontend que ya existía.
- **Contenedores de Testcontainers:** 0 antes y 0 después de lint y build.
- **Hashes:** los 14 `*.ataque` siguen iguales a "Cierre (M-13)".
- **Parada obligatoria (red Pública, sin la mitigación de Ryuk):** no se activó, porque no necesité arrancar nada. No ejecuté `npm test`, `vitest` ni ningún script que importe `global-setup.ts`.

### Pendiente de verificar en ejecución (cuando el humano confirme la mitigación)
1. **Enlace real del puerto.** Durante una corrida, `docker port <id del postgres>` (o `docker ps --filter "label=org.testcontainers=true"`) debe mostrar solo `127.0.0.1:<puerto>->5432/tcp`, sin `0.0.0.0` ni `[::]`. Ryuk seguirá en todas las interfaces mientras no esté aplicada la mitigación del equipo.
2. **`getPort()` con un enlace solo IPv4.**
   - `resolveHostPortBinding` recorre las familias que devuelve `lookupHostIps("localhost")` y elige el enlace de esa familia (`testcontainers/build/utils/bound-ports.js:77-88`; `container-runtime/utils/lookup-host-ips.js:9-15`).
   - Si en este equipo `localhost` resuelve también a `127.0.0.1` (familia 4), funciona.
   - Si solo resolviera a `::1`, `start()` fallaría con `No host port found for host IP` y el `globalSetup` mostraría "No se pudo levantar PostgreSQL de pruebas…".
   - No lo comprobé: ejecutar la consulta DNS no estaba en la lista de lo permitido.
3. **Espera `forListeningPorts`.** Se conecta a `localhost:<puerto>` desde el anfitrión (`wait-strategies/utils/port-check.js:29`). Con Node 24, `net.Socket.connect` prueba las dos familias, así que debería alcanzar `127.0.0.1`. Queda por confirmar.
4. **La suite completa:** tres corridas de 399, huella de `campus_dev` igual, 14 hashes, 0 contenedores huérfanos y V-15 (interrupción), que debe seguir limpiando igual.
