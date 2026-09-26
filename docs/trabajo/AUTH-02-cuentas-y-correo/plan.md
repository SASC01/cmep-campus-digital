# Plan — AUTH-02: cuentas y correo (recuperación, invitación de maestros, restablecimiento por el admin, cambio obligatorio, pg-boss, worker y notifier)
Estado: LISTO
Carril: sensible (sesiones y contraseñas, `adapters/auth`, `middleware/rutas-publicas.ts`, migración, cola y correo)
Enmiendas: Enmienda 1 (2026-09-24): partición en AUTH-02a/AUTH-02b y decisiones del humano tras la revisión del Manager · Enmienda 2 (2026-09-25, aprobada por el humano): protocolo de bloqueo por usuario para T-07, T-08 y T-09 de AUTH-02a (ronda 3)
Requisitos: RF-03, RF-04, RF-04a, RF-04b, RF-04d. RN-03 (interacción con el cambio obligatorio, C-01). Reglas: `AGENTS.md` 1, 2, 4, 5, 9, 10, 11, 12 y 13; ESSENTIALS "Autenticación", "Autorización", "Reglas de datos", "Asíncrono y notificaciones"; `ARCHITECTURE.md` §6, §7, §8, §9, §14, §16, §17 y §18.
Antecedentes: `docs/trabajo/AUTH-01-autenticacion-basica/` (`plan.md`, `aprobacion.md`, `revision.md` final y de cierre), `docs/trabajo/CHORE-01-testcontainers/` (`plan.md`, `aprobacion.md`, `revision.md`, `mitigacion-ryuk.md`) y, de este encargo, `revision.md` (Manager, modo plan: M-01, N-01..N-06) y `aprobacion.md` (texto literal del humano; manda sobre todo lo demás).

## Flujo (el completo de `AGENTS.md`, en dos partes)
arquitecto → `manager` (modo plan, hecho: CAMBIOS REQUERIDOS con M-01 y N-01..N-06) → **aprobación explícita y por escrito del humano** (hecha, `aprobacion.md`) → arquitecto registra la **Enmienda 1** → `manager` **solo verifica** que la enmienda cubra las decisiones del humano (sin revisión completa) → **AUTH-02a:** `programador` → `tester` (máximo 3 rondas) → `manager` (modo final) → el orquestador aplica los textos de documentos marcados "al cerrar AUTH-02a" y actualiza `docs/ESTADO.md` → **revisión humana del diff** antes del commit → **AUTH-02b:** `programador` → `tester` (máximo 3 rondas) → `manager` (modo final) → textos "al cerrar AUTH-02b" → revisión humana del diff. Ningún agente ejecuta `git add`, `commit`, `push`, `restore`, `stash`, despliegues ni `migrate reset`.

**Enmienda 2 (AUTH-02a):** tras el `ROTO` de la ronda 2 del Tester, el humano aprobó la Enmienda 2 (`aprobacion.md`). Antes de la ronda 3 del Programador, el `manager` la verifica de forma acotada, como la 1. La ronda 3 es la última de AUTH-02a: si el Tester vuelve a dar `ROTO`, se escala al humano.

### Partición (P-01 = partir; Enmienda 1)
| Parte | Pasos | Contenido | Rama |
|---|---|---|---|
| **AUTH-02a** | 1 a 15; del paso 22, solo las secciones "Backend en local" del README; 23 y 24 en su versión 02a; FE-01 | `shared/`, migración, `core/`, `config/`, `adapters/` (auth, db, queue, notifier), 8 endpoints, worker, pruebas del backend, `eslint.config.mjs`, `backend/.env.example`, `backend/package.json`, `package-lock.json`, README del backend | `feat/auth-02a-cuentas-backend` (ya creada por el orquestador; **el Programador no crea ramas**) |
| **AUTH-02b** | 16 a 21; del paso 22, la sección "Frontend en local" §3 del README; 23 y 24 en su versión 02b | Pantallas de cuenta, `apiClient`, guardas, pantalla provisional de admin y sus pruebas | La que indique el orquestador (por crear) |

- Mismo plan aprobado para las dos partes; cada una con su Tester (máximo 3 rondas) y su Manager en modo final.
- **AUTH-02a no se despliega sola:** una cuenta con cambio obligatorio no tendría pantalla hasta AUTH-02b (hoy no hay despliegue).
- **En AUTH-02a no se toca nada bajo `frontend/`** (V-22 lo comprueba). En AUTH-02b no se toca nada bajo `backend/`, `shared/` ni `eslint.config.mjs`.
- **Archivos de traspaso:** `resumen-programador.md`, `reporte-tester.md` y `revision.md` **acumulan secciones** cuyo título dice la parte y la ronda o el modo (por ejemplo "AUTH-02a — ronda 1", "AUTH-02a — modo final", "AUTH-02b — ronda 2"). No se crean archivos con sufijo. La sección existente de `revision.md` (modo plan) no se toca.

### Qué autoriza la aprobación de este plan (lista cerrada)

#### Común a las dos partes
**Ejecutar (lista cerrada):**
- Desde la raíz: `npm run lint`, `npm run build`, `npm test`; `npm view <paquete>[@versión] <campos>`, `npm ls <paquetes>`, `npm ls --all`, `npm explain <paquete>`.
- Desde `backend/`: `npm run build`, `npm run lint`, `npm run typecheck`, `npm test`, `npx vitest run [archivos]`, `npx vitest list`, `npx eslint --config ../eslint.config.mjs <rutas>`, `npx prettier --check .`.
- Desde `frontend/` y `shared/`: `npm run build`, `npm run lint`, `npm test`, `npx vitest run [archivos]`.
- Docker, solo lectura: `docker version`, `docker ps`, `docker ps -a --filter "label=org.testcontainers=true"`; en `infra/`, `docker compose ps` y `docker compose up -d` solo si `postgres` no está en marcha en V-01.
- Firewall y red, solo lectura: `Get-NetFirewallRule -DisplayName "Campus: bloquear entrada a Docker en redes publicas"`, `Get-NetConnectionProfile`.
- `Get-FileHash -Algorithm SHA256`; lectura de archivos del repositorio y de `node_modules/`; git de solo lectura (`status`, `diff`, `log`, `ls-files`, `branch --show-current`).
- **Formateadores, solo acotados al paquete de la parte en curso** (lista de cada parte abajo). Nunca `npm run format`, nunca `--write .` desde la raíz, nunca `eslint --fix` fuera de esas rutas.

**No autoriza (ninguna de las dos partes):**
- Tocar `infra/**`, `tsconfig*.json`, `backend/vitest.config.ts`, `frontend/vite.config.ts`, `backend/prisma.config.ts`, `.prettierrc.json`, `.prettierignore`, `.gitignore`, `.gitattributes`, `AGENTS.md`, `CLAUDE.md`, `.claude/**`, `docs/ARCHITECTURE*.md`, `docs/PRD.md`, `docs/ESTADO.md` (lo mantiene el orquestador), `backend/src/handlers/auth/index.ts` (salvo, en AUTH-02a, el bloque de `POST /login` que autoriza la Enmienda 2), `backend/src/handlers/auth/cookie.ts`, `backend/src/middleware/*.ts` salvo `rutas-publicas.ts`, `backend/src/server.ts`, `backend/src/scripts/**`, las dos migraciones existentes, y cualquier `*.ataque.test.ts(x)`.
- Leer o imprimir `backend/.env`, `infra/.env` o `frontend/.env`. **Tampoco editarlos:** las variables nuevas tienen valores por defecto fuera de `production` (DEC-12) precisamente para que el `backend/.env` del humano siga sirviendo sin cambios.
- Crear ramas, cambiar de rama o hacer commit.
- `localStorage`/`sessionStorage`; declarar a mano tipos que existan en `shared/`; SQL con concatenación de valores; `console.log` o logs de contraseñas, tokens, enlaces de cuenta, hashes o cookies.
- Terminar procesos que no arrancaste. Si el puerto 3000 o el 5173 está ocupado por un proceso ajeno: detenerse y preguntar.
- Correr cualquier prueba del backend sin la precondición del firewall de V-01.

#### AUTH-02a
**Crear:** exactamente los archivos marcados "Crear" en las secciones `shared/`, `backend/*` y "Raíz y archivos transversales" de "Cambios por capa"; la carpeta de migración `backend/prisma/migrations/<timestamp>_tokens_cuenta/`; la sección "AUTH-02a — ronda N" de `docs/trabajo/AUTH-02-cuentas-y-correo/resumen-programador.md` (crea el archivo en la ronda 1); los archivos temporales de V-14 (`backend/src/handlers/tmp-prueba-lint.ts`, `backend/src/handlers/tmp-prueba-executesql.ts`, `backend/src/workers/tmp-prueba-executesql.ts`), que se borran en la misma verificación; y temporales propios en `backend/tmp/` (JSON de las peticiones de V-17, `*.log`, `*.pid`, huellas y los HTML que escriba el canal `registro` en `backend/tmp/correos/`). `backend/tmp/` está en `.gitignore`.

**Crear en la ronda 3 (Enmienda 2), ya marcados "Crear" en sus tablas:** `backend/src/adapters/db/bloqueo-usuario.ts`, `backend/test/ayudas-concurrencia.ts` y `backend/test/bloqueo-usuario.integracion.test.ts`.

**Modificar:** exactamente los archivos marcados "Modificar" en las secciones `shared/` y `backend/*` de "Cambios por capa", más, de forma explícita:
- `eslint.config.mjs` (dos bloques nuevos, tabla `backend/config/`);
- `backend/package.json` (dos dependencias);
- `package-lock.json` (lo regenera `npm install`);
- `backend/.env.example` (bloque de correo);
- `backend/src/adapters/db/sesiones.ts` (de AUTH-01; Enmienda 2): solo `crearSesion`, `rotarSesion` y `revocarTodasLasSesiones`;
- `backend/src/handlers/auth/index.ts` (de AUTH-01; Enmienda 2): **solo el bloque de `POST /login`** (sección `backend/handlers/`); ni `registro`, ni `refrescar`, ni `logout`, ni el resto del archivo;
- `README.md`, **solo** las secciones "Backend en local" §3, §4, §6, §7, §8 y §9.

**Nada bajo `frontend/`.**

**Borrar:** solo los temporales de V-14 y los propios de `backend/tmp/` y del scratchpad.

**Instalar** (editando `backend/package.json` y con **un único** `npm install` desde la raíz; se repite solo si ese `package.json` vuelve a cambiar):
- `pg-boss` `^12.34.0` en `dependencies` del backend.
- `resend` `^6.29.0` en `dependencies` del backend.
- Nada más. Prohibido: `--legacy-peer-deps`, `--force`, `npm audit fix`, `npm update`, `npm dedupe`, `-g`, `@react-email/*`, `nodemailer` o cualquier otra librería de correo, `bullmq`, `ioredis`, `dotenv`, y cualquier paquete fuera de esta lista.

**Migración:** exactamente **una** creación con `npx prisma migrate dev --create-only --name tokens_cuenta` (desde `backend/`), revisión del SQL generado según DEC-01, y **una** aplicación con `npx prisma migrate dev`. Si la aplicación falla, se corrige el SQL de esa misma carpeta (aún no aplicada en ninguna otra base) y se repite `migrate dev`; nunca se crea una segunda carpeta para tapar la primera. De solo lectura, tal cual: `npx prisma validate`, `npx prisma format --check`, `npx prisma generate`, `npx prisma migrate status`, `npx prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --exit-code`. **Prohibido:** `migrate reset`, `migrate resolve`, `db push`, `db pull`, `db execute`, `migrate deploy` a mano, editar las migraciones `20260922015711_extensiones_iniciales` y `20260923143021_usuarios_y_sesiones`.

**Ejecutar, además de lo común:**
- Desde la raíz: `npm install` (una vez, V-04).
- Desde `backend/`: los comandos de Prisma de arriba.
- Formateadores: `npx prettier --write src test prisma.config.ts` desde `backend/`; `npx prettier --write src` desde `shared/`; desde la raíz, solo por ruta explícita: `npx prettier --write eslint.config.mjs README.md`.
- En `infra/`: `docker compose exec -T postgres psql -U campus -d campus_dev -At -c "<consulta>"` **solo** con las consultas `SELECT` de V-09, V-17 y V-18 y con el **único** `DELETE` de V-17 (filas propias `v17-<uuid>@pruebas.local`).
- Procesos de larga vida (V-16, V-17): `Start-Process` con `-RedirectStandardOutput`, `-RedirectStandardError` y `-PassThru`, guardando el PID en `backend/tmp/*.pid`; nunca con una tubería. `taskkill /PID <pid propio> /T /F`, `Get-NetTCPConnection`, `Get-Process -Id`.
- `curl.exe` solo contra `http://127.0.0.1:3000`, con los cuerpos en archivos `backend/tmp/v17-*.json`.

**Escrituras en `campus_dev` autorizadas (y ninguna otra):**
- la migración `tokens_cuenta`;
- el esquema `pgboss` y sus tablas, que pg-boss crea solo al arrancar la API o el worker (ESSENTIALS "Tablas": "esquema `pgboss`, que no se toca"; no es una migración y no se edita a mano);
- las filas que crea la prueba de humo V-17 a través de la API y del worker (un estudiante `v17-<uuid>@pruebas.local`, sus sesiones, su token y sus trabajos de pg-boss), y el `DELETE` final de ese usuario (las sesiones y los tokens caen en cascada). Los trabajos de pg-boss de V-17 se quedan: los borra la retención de la cola (1 día, N-02).
- **El administrador de desarrollo y la cuenta del humano no se tocan.** V-17 lo comprueba con una huella.

#### AUTH-02b
**Crear:** exactamente los archivos marcados "Crear" en la sección `frontend/` de "Cambios por capa" y la sección "AUTH-02b — ronda N" de `resumen-programador.md`.

**Modificar:** exactamente los archivos marcados "Modificar" en la sección `frontend/` (incluidas las pruebas existentes que ahí se nombran) y, en `README.md`, **solo** la sección "Frontend en local" §3.

**Borrar:** solo temporales propios del scratchpad.

**No autoriza:** instalar dependencias, migraciones, escrituras en `campus_dev`, arrancar la API o el worker, ni tocar `backend/`, `shared/` o `eslint.config.mjs`.

**Formateadores:** `npx prettier --write src` desde `frontend/`; desde la raíz, solo `npx prettier --write README.md`.

### PARADAS
Regla de `AGENTS.md`: "Cuando el plan dice detenerse ante una condición, te detienes aunque la alternativa parezca obvia o inofensiva. Resolverlo por tu cuenta es una desviación, aunque salga bien."
- Detenerse significa: no seguir con el paso siguiente, no intentar remedios fuera del plan, no borrar nada y reportar al orquestador el comando, la salida literal y la hipótesis.
- El resumen del Programador responde **cada una** con "no se activó" o "se activó y me detuve", con la evidencia (M-16 de AUTH-01).
- En AUTH-02b, las paradas que dependen de pasos de 02a (PA-03 a PA-10, PA-14, PA-15, PA-17 y PA-18 a PA-21) no tienen ocasión de activarse porque 02b no instala, no migra ni arranca procesos. Si alguna se activa, el Programador se detiene igual.

| # | Condición |
|---|---|
| PA-01 | V-01: la regla del firewall "Campus: bloquear entrada a Docker en redes publicas" no existe, está deshabilitada o no es `Inbound`/`Block`/`Public`; o la red activa no es de categoría `Public` y no consta como red de confianza. **No se corre ninguna prueba del backend** (riesgo residual de Ryuk, `AGENTS.md` "Pruebas") |
| PA-02 | V-01/V-02: `git status` muestra cambios fuera de `docs/trabajo/AUTH-02-cuentas-y-correo/` y de `docs/ESTADO.md` (este lo mantiene el orquestador; nada más se admite); la rama actual no es la de la parte en curso (`feat/auth-02a-cuentas-backend` en 02a; la que indique el orquestador en 02b); Docker Desktop no responde; algún hash de las pruebas del Tester no coincide con la tabla vigente de V-02 |
| PA-03 | V-03: la última `12.x` de `pg-boss` no es `12.34.0` o la última `6.x` de `resend` no es `6.29.0` (una versión mayor dentro del mismo mayor se usa y se reporta; un cambio de mayor detiene); o su `engines.node` no admite Node 24.11.1; o `resend` declara como obligatoria una dependencia de React |
| PA-04 | `npm install` termina con código distinto de 0, pide `--legacy-peer-deps` o `--force`, o intenta compilar un módulo nativo **no opcional** |
| PA-05 | En el `package-lock.json` aparece un paquete cuyo nombre contenga `aws`, `firebase`, `supabase` o `vercel` que **no** estuviera en el lock anterior a este encargo (criterio de CHORE-01, confirmado por el humano); o queda instalado `@react-email/render` |
| PA-06 | V-05: a pg-boss 12 le falta una **capacidad** del diseño: `send` con una conexión externa (`db`) para encolar dentro de la transacción de Prisma; `id` propio del trabajo con inserción idempotente; reintentos con espera exponencial; cola de fallidos (`deadLetter`); `getJobById`; retención por cola (N-02). **O** el SQL que `send` entrega a `db.executeSql`: (a) lleva en el **texto** algún dato de la petición o del trabajo (id, datos u opciones del trabajo) en lugar de llevarlo en los parámetros; o (b) contiene **más de una sentencia**. **No es parada, y se sigue,** si todos los datos viajan como parámetros y lo único interpolado en el texto son el esquema, la tabla y el nombre de la cola: salen de constantes nuestras (`COLA_CORREO_DE_CUENTA`, `COLA_CORREO_DE_CUENTA_FALLIDO` y el esquema por defecto de pg-boss) y pg-boss valida el nombre con `^[\w.\-/]+$` (`dist/attorney.js:88`). Si solo cambia el **nombre** de una opción o de un método, se ajusta esa llamada y se reporta como desviación |
| PA-07 | V-10: el encolado transaccional falla: una transacción revertida deja el trabajo en la cola, una confirmada no lo tiene; o hacerlo funcionar exigiría concatenar valores en el SQL, transformar el texto o los valores que pg-boss entrega a `executeSql`, o abrir una conexión `pg` fuera de `adapters/`. **No hay ninguna adaptación autorizada:** `ejecutorSqlDe` pasa el texto y los valores tal como los entrega pg-boss (pg-boss ya serializa el trabajo y manda texto, `dist/manager.js:1160`) |
| PA-08 | V-07: el SQL de `--create-only` contiene algo distinto de `CREATE TYPE "tipo_token_cuenta"`, `CREATE TABLE "tokens_cuenta"`, sus `CREATE INDEX`/`CREATE UNIQUE INDEX` y su `ALTER TABLE … ADD CONSTRAINT … FOREIGN KEY`; en particular cualquier `DROP`, cualquier cambio en `usuarios` o `sesiones`, o que `migrate dev` proponga `reset` o avise de deriva |
| PA-09 | `migrate diff --exit-code` no termina con código 0 ("No difference detected") en V-08 o en V-18 (después de que exista el esquema `pgboss` en `campus_dev`) |
| PA-10 | **Un correo real podría salir fuera de `prod`:** cualquier camino por el que `crearNotifier` construya el canal `resend` con `NODE_ENV` distinto de `production`; cualquier prueba que construya un cliente real de Resend; `resend` importado fuera de `backend/src/adapters/notifier/resend.ts`; o V-16 muestra `"canalCorreo":"resend"` con `NODE_ENV=development` |
| PA-11 | Falla cualquier prueba `*.ataque.test.ts(x)` **distinta** de FE-01, o FE-01 falla con una lista de rutas distinta de la esperada. **La excepción de FE-01 solo vale en la entrega de la ronda 1 del Programador de AUTH-02a.** Desde que el Tester la actualiza (ronda 1 de AUTH-02a), en las rondas siguientes de 02a y en todo AUTH-02b, PA-11 aplica **sin excepción**: cualquier `*.ataque` en rojo detiene. No se toca; se reporta el caso, el mensaje y la hipótesis |
| PA-12 | Aparece `too many clients already` o cualquier otro error de conexiones agotadas |
| PA-13 | Una prueba del Programador falla de forma intermitente (el mismo código pasa y falla), o falla cualquier prueba en alguna de las tres corridas de V-20 (salvo FE-01, y solo en la entrega de la ronda 1 de AUTH-02a) |
| PA-14 | V-17: algún log de la API o del worker contiene el token de un enlace, la cadena `#token=`, una contraseña de la prueba o el valor exacto de la llave de V-16 (`re_llave_falsa_de_v16`); o la huella de las cuentas del humano cambia |
| PA-15 | Un archivo HTML de correo aparece fuera de `backend/tmp/correos/` (o del directorio temporal de una prueba), o `git status` lo muestra |
| PA-16 | Algún contenedor con la etiqueta de Testcontainers sigue existiendo 120 s después de terminar o interrumpir una corrida. No se borra a mano |
| PA-17 | El arranque o el cierre de la API o del worker se cuelga más de 30 s por pg-boss (`start`/`stop`), en pruebas o en V-16/V-17 |
| PA-18 | **Ronda 3 (Enmienda 2):** después de aplicar el protocolo de bloqueo, alguna de las 4 pruebas de `cuentas-r2.ataque` que fallaron en la ronda 2 sigue en rojo, o alguna de `bloqueo-usuario.integracion` falla. No se aplica ningún remedio fuera del plan. En particular: nada de reintentos ante `40P01`, cambios de aislamiento, `lock_timeout` ni `NOWAIT`/`SKIP LOCKED` |
| PA-19 | **Ronda 3 (Enmienda 2):** `40P01`, `deadlock detected` o `could not serialize` aparece en alguno de los tres logs de V-20 |
| PA-20 | **Ronda 3 (Enmienda 2):** la corrección exige tocar un archivo o un bloque fuera de lo autorizado (por ejemplo `refrescar`, `registro` o `logout` en `handlers/auth/index.ts`, `cookie.ts`, `scripts/`, `middleware/` o `schema.prisma`), o cambiar la firma de `rotarSesion` o de `revocarTodasLasSesiones` |
| PA-21 | **Ronda 3 (Enmienda 2):** falla la precondición de `conFilaRetenida` ("no llegó a la fila retenida"). Se reporta qué operación falló y dónde esperaba: indica que una operación no espera donde dice el diseño |

**FE-01: falla esperada y única excepción a PA-11 (autorizada por escrito en `aprobacion.md`, solo en AUTH-02a y solo hasta la ronda 1 del Tester).** `backend/test/sesiones-y-cadena.ataque.test.ts`, caso "bajo /api solo existen las 6 rutas de AUTH-01: ninguna crea admins ni maestros" (línea 423), compara la lista **exacta** de rutas bajo `/api`. Este encargo añade ocho rutas a propósito (una de ellas crea maestros), así que el caso falla por diseño. Salida esperada: la lista recibida contiene, además de las 8 actuales, exactamente `POST /api/admin/maestros`, `POST /api/admin/usuarios/buscar`, `POST /api/admin/usuarios/:id/restablecer-contrasena`, `PUT /api/admin/usuarios/:id/correo`, `POST /api/auth/cambiar-contrasena`, `POST /api/auth/establecer-contrasena`, `POST /api/auth/recuperar` y `POST /api/auth/restablecer`.
- **El Programador no lo toca** ni adapta el código para esquivarlo, y lo reporta con la salida literal.
- El Tester lo actualiza como primera tarea de su ronda 1 de AUTH-02a, sin cambiar lo que protege ("ninguna ruta crea administradores; solo `POST /api/admin/maestros` crea maestros y exige admin"), y publica el hash nuevo (ver "Tareas heredadas para el Tester").
- Cualquier otra diferencia en esa lista activa PA-11. Después de la ronda 1 del Tester, la excepción **expira**: en las rondas siguientes del Programador y en todo AUTH-02b, la suite completa va en verde.

## Enmienda 1 — 2026-09-24
**Motivo:** el Manager (modo plan) pidió cambios con un hallazgo bloqueante de redacción (M-01) y seis no bloqueantes (N-01..N-06), más detalles menores. El humano aprobó el plan por escrito por el carril sensible, con decisiones sobre cada hallazgo, sobre P-01..P-05, C-01..C-06 y FE-01, y con la partición en AUTH-02a y AUTH-02b (`aprobacion.md`). Esta enmienda incorpora esas decisiones **dentro** de las secciones del plan para que exista una sola versión. Lo que se retira se marca "retirada" sin renumerar, para que las referencias de `revision.md` y `aprobacion.md` sigan valiendo.

**Qué cambia (aplicado en las secciones indicadas):**
1. **P-01 = partir.** Un solo plan con dos partes: AUTH-02a (pasos 1 a 15, secciones "Backend en local" del README y FE-01, rama `feat/auth-02a-cuentas-backend`, que ya existe) y AUTH-02b (pasos 16 a 21 y "Frontend en local" §3 del README). Cada parte tiene su Tester y su Manager final. Se convierten en dos partes estas secciones: "Flujo" ("Partición"), "Qué autoriza", "Cambios por capa" (sección "Raíz y archivos transversales" y la marca "todo AUTH-02b" en `frontend/`), "Conteos esperados", "Tareas heredadas para el Tester" (son de la ronda 1 de 02a), "Puntos de revisión para el Manager", "Verificaciones" (V-19 pasa a 02b; V-20 sigue corriendo la suite completa desde la raíz; V-22 comprueba que `frontend/` no cambió en 02a) y "Pasos de implementación" (entregable y convención de archivos acumulados por sección).
2. **Árbol limpio y rama (PA-02, V-01, V-22).** Además de `docs/trabajo/AUTH-02-cuentas-y-correo/`, se admite `docs/ESTADO.md`, que mantiene el orquestador; nada más. V-01 comprueba la rama de la parte en curso.
3. **Red.** El humano declaró de confianza la red actual. El orquestador verificó el 2026-09-24 la red `IZZI-F281` como `Public`, con la regla del firewall `True`/`Inbound`/`Block`/`Public`. PA-01 y V-01 no cambian ("Suposiciones", S-01).
4. **M-01, opción (a).** Se reescriben DEC-07, PA-06, PA-07, R-01 y V-05 con la redacción del Manager. PA-06 se sigue si ningún dato entra al texto y lo único interpolado son el esquema, la tabla y el nombre de la cola; se detiene si un dato llega al texto o si hace falta más de una sentencia. Se retira la contingencia de `JSON.stringify` de DEC-07 y PA-07. Se citan `fromPrisma` de pg-boss y la defensa del protocolo extendido.
5. **N-01.** V-13 busca `executeSql` en `backend/src` y comprueba que haya **exactamente un** `$queryRawUnsafe`, dentro de `ejecutorSqlDe` (arbitraje del Manager). Nuevo bloque de ESLint `no-restricted-syntax` fuera de `backend/src/adapters/**` (tabla `backend/config/`), con su comprobación en V-14. El bloque no sustituye ninguna regla existente: hoy nadie usa `no-restricted-syntax`. A propósito, no alcanza a `backend/test/`.
6. **N-02.** `OPCIONES_DE_COLAS` fija una retención de 1 día (`retentionSeconds` y `deleteAfterSeconds` = 86 400) en `CORREO_DE_CUENTA` y `CORREO_DE_CUENTA_FALLIDO` (DEC-06, tabla `backend/adapters/`), con una prueba nueva en `cola.integracion` y `describirCola` en `adapters/queue`. §18 dice que el límite de tasa de DEPLOY cubre `/auth/recuperar`. Se actualizan S-14 y R-12, y se añade R-17.
7. **N-03, opción (a), declarada.** La API no arranca sin base (DEC-16). `depends_on` con `healthcheck` queda como requisito de DEPLOY en §18; no es un cambio de `infra/` en este encargo. Nota en el README §6. `salud-sin-base.integracion` sigue en verde sin tocarse. Se añade R-16.
8. **N-04.** `prepararTokenDeRecuperacion` usa una transacción sin `try/catch` dentro: `updateMany` que revoca los tokens de recuperación vivos del usuario **con id distinto** del del trabajo, y después `createMany({ data: [fila], skipDuplicates: true })`. Regla general en `adapters/db`: **nunca se atrapa un error de Prisma dentro de una transacción para seguir** (tabla `backend/adapters/`, DEC-15 paso 3). Prueba nueva de concurrencia en `worker-correo-de-cuenta.integracion`.
9. **N-05.** `config/correo.ts` rechaza en `production` un `CORREO_REMITENTE` con dominio `campus.local`, con el mismo criterio que el `JWT_SECRET` de ejemplo (DEC-12). Suma 2 pruebas en `correo.test.ts`. Los archivos de entorno separados para la API y el worker van a §18.
10. **N-06.** (1) La ayuda `buscarTrabajosPorCorreo` en `test/ayudas-cuentas.ts` hace un `$queryRaw` etiquetado sobre `pgboss.job` y se declara solo de pruebas. (2) `iniciarCola` va después de crear `app` y antes de registrar los handlers (DEC-16 y la fila de `app.ts`). (3) `test/preparar-cola.ts` aplica `validarUrlDePruebas` antes de conectarse.
11. **P-02..P-05 resueltas** con el valor por defecto; P-04 con el respaldo del humano a `POST /admin/maestros` y `PUT /admin/usuarios/{id}/correo`. Se sustituyen las "Preguntas no bloqueantes" por "resueltas por el humano (Enmienda 1)".
12. **C-01 aprobada** (solución y texto para ESSENTIALS "Autorización"). Los textos de C-02 a C-06 quedan autorizados. C-04 añade que un `403` y un fallo de red se tratan como transitorios.
13. **FE-01.** La excepción se acota a AUTH-02a y a la entrega de la ronda 1 del Programador; después expira (PA-11, PA-13, bloque FE-01, V-12, V-20, "Criterio de cierre").
14. **Detalles menores del Manager, todos incorporados:**
    - `resend.ts` exige una llave no vacía antes de `new Resend(...)`, con prueba (DEC-13).
    - La librería lee `RESEND_BASE_URL`: nota en la sección `notifier` de `adapters/README.md`, porque no existe un README propio del notifier.
    - Un fallo de red de Resend devuelve `error` con `statusCode: null` y es transitorio (DEC-13).
    - Un `403` es transitorio, con un caso nuevo en `fallos.test.ts` (C-04).
    - `createQueue` no actualiza la política de una cola existente: nota en `adapters/README.md` y §8.
    - Comprobación en compilación entre `TipoTokenCuenta` y el enum generado (tabla `backend/adapters/`).
    - PA-14, V-16 y V-17 buscan el valor exacto `re_llave_falsa_de_v16`.
    - "Qué autoriza" marca como "Modificar" `backend/.env.example`, `README.md` y las pruebas existentes del frontend.
    - `cambiar-contrasena` de un restringido sin la bandera responde `409`, documentado en el README de `middleware/`.
15. **Conteos:** backend +23 archivos y ≈ 174 pruebas en AUTH-02a (antes ≈ 168): +2 en `correo.test`, +1 en `fallos.test`, +1 en `notifier-resend`, +1 en `cola.integracion`, +1 en `worker-correo-de-cuenta.integracion`.
16. **Tabla de hashes de V-02:** la de este plan vale para la ronda 1 de AUTH-02a. Desde la ronda 2, y en AUTH-02b, vale la que publique el Tester en `reporte-tester.md`.
17. **Documentos:** "Propuestas para `AGENTS.md`, `CLAUDE.md` y docs" incorpora las decisiones anteriores y los añadidos de `revision.md`: ESSENTIALS "Reglas de datos", §8, §18 y el motivo ampliado de D-27. Cada texto dice si se aplica al cerrar AUTH-02a o AUTH-02b; la fila `admin` de `CLAUDE.md` es de 02b.
18. **Pendientes:** ADMIN: la contraseña temporal no caduca (S-05).
19. **Precisión derivada de N-04 (N-04 bis):** un registro inexistente en `restablecerConTemporal`, `corregirCorreo` y `cambiarContrasenaPropia` se detecta con `updateMany` y su `count`, o atrapando `P2025` **fuera** de `enTransaccion`, nunca dentro. Con eso, `adapters/db/errores.ts` probablemente no hace falta tocarlo; la fila sigue como "solo si hace falta".

**Qué no cambia:**
- Dependencias y versiones.
- La migración `tokens_cuenta` (DEC-01).
- El token derivado (DEC-03), el encolado siempre en `recuperar` (DEC-04), los dos límites (DEC-05), el consumo de tokens en orden fijo (DEC-08), el cambio obligatorio (DEC-09), el restablecimiento y la corrección (DEC-10), la invitación (DEC-11), el canal según la configuración (DEC-12), las plantillas y los textos (DEC-14), el worker (DEC-15, salvo el mecanismo del paso 3) y el frontend (DEC-17 a DEC-19, ahora AUTH-02b).
- Las ocho rutas y sus cadenas de middleware, los campos que nunca salen, los textos de interfaz y de correo, y el resto de pruebas y casos.
- La tabla de las 14 pruebas del Tester para la ronda 1 y las reglas de proceso: formateadores solo acotados al paquete, ningún agente termina procesos que no arrancó, cuando el plan dice detenerse se detiene, y las pruebas llevan al menos una aserción y ningún `return` temprano.

## Enmienda 2 — 2026-09-25 (aprobada por el humano)
**Motivo:** la ronda 2 del Tester de AUTH-02a dio `ROTO` (`reporte-tester.md`, "AUTH-02a — Ronda 2") con tres hallazgos:
- T-07 (media): deadlock entre `restablecer` y `refrescar`.
- T-08 (alta): una revocación en bloque no ve la sesión que un `rotarSesion` concurrente acaba de crear.
- T-09 (media): un login verifica la contraseña vieja y crea la sesión después de que el cambio confirmó.

Causa común: no había un protocolo de bloqueo único entre las transacciones que crean, rotan o revocan sesiones y las que cambian la contraseña o revocan sesiones y enlaces de un usuario. La corrección de T-01 de la ronda 2 ordenó entre sí las transacciones de AUTH-02a, pero no frente a `crearSesion` y `rotarSesion` de AUTH-01. El arquitecto propuso la enmienda el 2026-09-24 y el humano la aprobó tal cual el 2026-09-25 (`aprobacion.md`, "Enmienda 2 — decisiones del humano"; las respuestas están en "Preguntas de la Enmienda 2: resueltas por el humano"). Como la Enmienda 1, esta enmienda incorpora las decisiones **dentro** de las secciones del plan, para que exista una sola versión.

**Qué cambia (aplicado en las secciones indicadas):**
1. **Flujo:** antes de la ronda 3 del Programador, el Manager verifica la Enmienda 2 de forma acotada, como la 1. La ronda 3 es la última de AUTH-02a y un `ROTO` en ella se escala al humano (Q-E2-1, opción a).
2. **Protocolo de bloqueo por usuario:** es una regla nueva de `adapters/db`, con PB-1 a PB-8. En "backend/adapters/" están los modos de PostgreSQL, por qué no hay deadlock, por qué se cierran T-08 y T-09, y la tabla de combinaciones.
3. **`adapters/db/bloqueo-usuario.ts` (nuevo):** contiene `bloquearUsuarioParaEscribir` (`FOR NO KEY UPDATE`) y `bloquearUsuarioParaSesion` (`FOR SHARE`). No se reexportan.
4. **`adapters/db/tokens-cuenta.ts`:** su bloqueo privado `FOR UPDATE` de la ronda 2 se sustituye por `bloquearUsuarioParaEscribir` en `usarTokenYCambiarContrasena` y en `prepararTokenDeRecuperacion`. DEC-08 gana el paso 0, que formaliza la desviación de la ronda 2.
5. **`adapters/db/usuarios.ts`:** empiezan con el bloqueo de escritura `restablecerConTemporal` (DEC-10), `cambiarContrasenaPropia` (DEC-09, que además recibe `hashVerificado` y devuelve `boolean`) y `actualizarContrasenaYRevocarSesiones`, la de `reset:admin` (Q-E2-3). `corregirCorreo` es la excepción de PB-2.
6. **`adapters/db/sesiones.ts` (AUTH-01, Q-E2-2):**
   - `crearSesion` recibe `hashVerificado` y devuelve `null` si la cuenta no existe, está inactiva o su contraseña cambió.
   - `rotarSesion` y `revocarTodasLasSesiones` bloquean primero al usuario, sin cambiar sus firmas.
7. **`handlers/auth/index.ts` (AUTH-01, Q-E2-2), solo el bloque de `POST /login`:** pasa `hashVerificado`. Si `crearSesion` devuelve `null`, responde `401 CREDENCIALES_INVALIDAS` sin sumar un fallo al límite (Q-E2-4).
8. **`handlers/auth/cuentas.ts`:** `cambiar-contrasena` pasa a retornos tempranos y a `hashVerificado` (DEC-09, pasos 5 y 8).
9. **"Qué autoriza":**
   - Añade los tres archivos nuevos y los dos de AUTH-01.
   - `handlers/auth/index.ts` sale de "No autoriza" solo para el bloque del login.
   - "Alcance" y DEC-02 reciben la misma precisión.
10. **PARADAS:** PA-18 a PA-21, para la ronda 3.
11. **"Acceso a datos":**
    - Filas nuevas: los bloqueos, `crearSesion`, `rotarSesion`, `revocarTodasLasSesiones` y `actualizarContrasenaYRevocarSesiones`.
    - Se marcan las transacciones que siguen el protocolo.
    - Se actualiza la nota sobre el SQL crudo.
12. **Pruebas:**
    - `test/ayudas-concurrencia.ts` y `test/bloqueo-usuario.integracion.test.ts`, con 19 pruebas.
    - Conteos de la ronda 3: 64 archivos y 635 pruebas en el backend.
    - El efecto sobre las `*.ataque`.
13. **Puntos de ataque para el Tester** y **puntos de revisión para el Manager:** las carreras de sesiones y la verificación acotada.
14. **Riesgos:** R-18 a R-23.
15. **Verificaciones:**
    - V-13: el `$queryRaw` etiquetado solo aparece en `salud.ts` y en `bloqueo-usuario.ts`.
    - V-20: ningún `40P01`, `deadlock detected` ni `could not serialize`.
    - V-22: sin `git diff --quiet` sobre `handlers/auth/index.ts`; su diff se limita al bloque del login.
16. **Pasos de implementación:** nueva sección "AUTH-02a — ronda 3 (Enmienda 2)".
17. **Propuestas de documentos:** textos para ESSENTIALS "Reglas de datos" y para §14, que se aplican al cerrar AUTH-02a (Q-E2-5).

**Qué no cambia:**
- Dependencias, migraciones y esquema: no hay migración, solo bloqueos de fila.
- Las ocho rutas y sus cadenas de middleware, respuestas y textos.
- `registro`, `refrescar` y `logout`.
- `scripts/`, `middleware/`, `core/`, `shared/`, `app.ts`, `server.ts`, `worker.ts` y `workers/`.
- Ninguna `*.ataque`: vale la tabla de hashes de la ronda 2 del Tester (23 archivos).
- AUTH-02b y el texto de la Enmienda 1.

## Preguntas bloqueantes
Ninguna.

## Preguntas no bloqueantes: resueltas por el humano (Enmienda 1)
| # | Pregunta | Decisión |
|---|---|---|
| P-01 | El encargo es grande (≈ 95 archivos en tres paquetes, carril sensible, programador a prueba). ¿Se parte? | **Se parte.** AUTH-02a = pasos 1 a 15, README del backend y FE-01; AUTH-02b = pasos 16 a 21 y README del frontend. Mismo plan; Tester y Manager final en cada parte. 02a no se despliega sola ("Partición") |
| P-02 | ¿Cómo viaja el token del enlace hasta el worker sin guardarse en claro? (DEC-03) | **Token derivado:** `token = HMAC-SHA256(clave, id del token)`, con la clave derivada de `JWT_SECRET` por HKDF. El trabajo de la cola solo lleva el `id`; la base guarda solo `SHA-256(token)` |
| P-03 | Límite de recuperación (DEC-05): ¿además del límite en memoria por IP + correo, un tope durable por cuenta? | **Los dos límites** (API: 3 por hora por IP + correo, en memoria, `429`; worker: tope de 3 por hora por cuenta sobre `tokens_cuenta`, en silencio) **más la retención corta de la cola** (N-02) |
| P-04 | ¿Se agrega una búsqueda para la pantalla provisional de admin? (DEC-10) | **Con búsqueda:** `POST /admin/usuarios/buscar` con `{ email }`, coincidencia exacta normalizada por el índice único. El humano respalda también `POST /admin/maestros` y `PUT /admin/usuarios/{id}/correo` |
| P-05 | `POST /auth/cambiar-contrasena`, ¿solo para el cambio obligatorio o también voluntario? (DEC-09) | **Solo el cambio obligatorio** (`409 CAMBIO_NO_REQUERIDO` sin la bandera) |

## Preguntas de la Enmienda 2: resueltas por el humano (2026-09-25)
| # | Pregunta | Decisión |
|---|---|---|
| Q-E2-1 | ¿Qué opción? (a) corregir T-07, T-08 y T-09 en la ronda 3 autorizando los archivos extra; (b) solo archivos ya autorizados, lo que deja abiertos T-08 y T-09 con pruebas en rojo; (c) un encargo aparte; (d) (a) con una 4.ª ronda preautorizada | **(a).** Antes, el Manager verifica la enmienda de forma acotada. Si el Tester vuelve a dar `ROTO`, se escala al humano |
| Q-E2-2 | ¿Se autoriza tocar dos archivos de AUTH-01? | **Sí, los dos:** `backend/src/adapters/db/sesiones.ts` (`crearSesion`, `rotarSesion`, `revocarTodasLasSesiones`) y **solo el bloque de `POST /login`** de `backend/src/handlers/auth/index.ts`. V-22 deja de exigir que `handlers/auth/index.ts` no cambie |
| Q-E2-3 | ¿Entra `reset:admin` (`actualizarContrasenaYRevocarSesiones`)? | **Entra:** el cambio va en `adapters/db/usuarios.ts`, con 2 pruebas; `scripts/` no cambia |
| Q-E2-4 | ¿Qué responde un login cuya contraseña cambió entre la verificación y la sesión? | **Aceptado:** responde `401 CREDENCIALES_INVALIDAS` y no suma un fallo al límite de intentos (se conserva `intentos-r2.ataque`) |
| Q-E2-5 | ¿Se aprueban los textos para ESSENTIALS "Reglas de datos" y §14? | **Aprobados**; el orquestador los aplica al cerrar AUTH-02a |

## Suposiciones
- **S-01.** Datos del orquestador (2026-09-24) tomados como hechos: `main` con AUTH-01, CHORE-01 y DOCS-02a; rama de trabajo `feat/auth-02a-cuentas-backend` creada por el orquestador; suite 399 (backend 31/330, frontend 11/69); Node 24.11.1, npm 11.6.2, Vitest 4.1.11, Fastify 5.12, Prisma 7.10.0, TypeScript 5.9; `pg-boss` 12.34.0 (`engines node >=22.12.0`; depende de `pg ^8.23.0`, `cron-parser`, `rrule-temporal`, `serialize-error`; tipos en `dist/index.d.ts`); `resend` 6.29.0 (`engines node >=20`; depende de `postal-mime` y `standardwebhooks`; `@react-email/render` como par **opcional**). Red: `IZZI-F281`, categoría `Public`, declarada de confianza por el humano; regla del firewall `True`/`Inbound`/`Block`/`Public` (verificado por el orquestador el 2026-09-24). Lo demás lleva **[verificar]**.
- **S-02.** API de pg-boss 12 que usa este plan. El Manager la verificó en el código publicado de 12.34.0 (`revision.md`, "Detalles menores") y el Programador la confirma en V-05 con archivo y línea. Clase `PgBoss`; opciones `connectionString`, `schema`, `max`, `supervise`, `schedule`, `migrate`; `start()`; `stop({ graceful, timeout, close })` (`types.d.ts:1094`); evento `error`. `createQueue(nombre, { retryLimit, retryDelay, retryBackoff, expireInSeconds, deadLetter, retentionSeconds, deleteAfterSeconds })`: es idempotente (`ON CONFLICT DO NOTHING`), **no actualiza** la política de una cola que ya existe y exige que la cola de fallidos exista antes (`manager.js:1888-1892`). `getQueue(nombre)`. `send(nombre, datos, { id, db })` con `db: IDatabase { executeSql(text, values?) → { rows } }` (`types.d.ts:17`): devuelve el id, o `null` si el id ya existe (`ON CONFLICT DO NOTHING`). `work(nombre, { batchSize, pollingIntervalSeconds }, manejador(trabajos[]))`, con `pollingIntervalSeconds` de al menos 0.5 s (`attorney.js:585`). `offWork(nombre)`. `getJobById(nombre, id)` con `state` (`index.d.ts:64`). Nombres de cola que cumplan `^[\w.\-/]+$` (`attorney.js:88`). Un trabajo fallido guarda el error serializado en `pgboss.job.output`.
- **S-03.** API de `resend` 6, verificada por el Manager y a confirmar en V-05: `new Resend(apiKey)`. Con una llave vacía, la librería toma `process.env.RESEND_API_KEY` (`index.mjs:1278-1280`), y lee `RESEND_BASE_URL` del entorno (`index.mjs:1253`). `emails.send({ from, to, subject, html, text, replyTo }, { idempotencyKey })` devuelve `{ data: { id } | null, error: { name, message, statusCode } | null }`. **Un fallo de red no lanza:** devuelve `error` con `name: "application_error"` y `statusCode: null` (`index.mjs:1352-1362`).
- **S-04.** `restablecer` y `establecer-contrasena` **no** inician sesión: responden `204` y el frontend lleva a `/login` con un aviso. Motivo: un enlace de correo no emite sesiones; el usuario entra con la contraseña que acaba de elegir. Se revocan todas sus sesiones.
- **S-05.** El restablecimiento por el admin no aplica a la cuenta de administrador (`403 OPERACION_NO_PERMITIDA`; ESSENTIALS: "La del admin: `npm run reset:admin`"). Aplica a cuentas inactivas y no las reactiva. La contraseña temporal tiene 12 caracteres del alfabeto `abcdefghjkmnpqrstuvwxyz23456789` (sin `i`, `l`, `o`, `0`, `1`), en grupos `xxxx-xxxx-xxxx` (14 caracteres, ≈ 59 bits). **No caduca por sí sola:** el PRD no lo pide, así que una temporal sin usar sirve indefinidamente. El humano lo conoce y queda pendiente para ADMIN (decidir si caduca).
- **S-06.** La corrección de correo aplica a cualquier cuenta, incluida la del admin; revoca los enlaces vivos del usuario (se enviaron a la dirección equivocada) y **no** revoca sesiones (el correo no es la credencial).
- **S-07.** Un maestro invitado que aún no eligió contraseña tiene en `hash_contrasena` un argon2id de 32 bytes aleatorios que se descartan (DEC-02): nadie puede adivinarla y el login recorre el mismo camino, con el mismo costo, que una contraseña incorrecta.
- **S-08.** Revocación de enlaces: al emitir uno de recuperación se revocan los de recuperación vivos del usuario, **salvo el que tiene el mismo id** (N-04); al **usar** cualquiera se revocan todos sus enlaces vivos; el restablecimiento por el admin y la corrección de correo revocan todos sus enlaces vivos.
- **S-09.** Un maestro con la invitación vencida, cuyo correo se corrigió o cuya invitación se perdió por la retención de la cola (R-17), pide un enlace nuevo con "¿Olvidaste tu contraseña?". La recuperación sí aplica a maestros activos, invitados o no. No hay reenvío de invitación: ni el PRD ni §7 lo piden.
- **S-10.** Textos de correo y de interfaz: los de DEC-14 y "frontend". La plantilla HTML va sin imágenes, con fuentes del sistema y dos colores fijos, marcados como provisionales hasta que se elija la dirección visual: los tokens de `CLAUDE.md` no se pueden usar dentro de un correo.
- **S-11.** `restablecer` y `establecer-contrasena` no llevan límite de intentos propio: el token tiene 256 bits (fuerza bruta inviable) y un token inválido cuesta una lectura por índice único, sin argon2. El límite de tasa de `/auth/*` es de DEPLOY (aceptado por escrito en AUTH-01).
- **S-12.** Los almacenes en memoria nuevos (solicitudes de recuperación por IP + correo e intentos de `cambiar-contrasena` por usuario) siguen la aceptación escrita de AUTH-01 (P-03): una sola instancia, se reinician con el proceso.
- **S-13.** La API no necesita ninguna variable de correo; el worker sí. Solo el proceso que envía correos tiene la llave de Resend (mínimo privilegio). En `prod` esto solo se cumple si la API y el worker reciben archivos de entorno distintos, porque son la misma imagen: queda anotado para §18 (N-05).
- **S-14.** El correo pedido en `/auth/recuperar` queda en los datos del trabajo de pg-boss mientras dura la retención de la cola: como máximo 1 día sin procesarse, más 1 día después de completarse o fallar (N-02). Es un dato personal, no un secreto. El token no queda nunca.

## Contradicciones y desalineaciones entre documentos (reportadas; no bloquean)
- **C-01. RN-03 y ESSENTIALS "Autorización" frente al cambio obligatorio de un alumno restringido. Aprobada por el humano (Enmienda 1).** "Alumno restringido: solo `GET /me` y `GET /me/estado-pago`" y "`debe_cambiar_contrasena`: solo pasa `POST /auth/cambiar-contrasena`". Si un restringido tiene una contraseña temporal, `GET /me` le responde `403 CAMBIO_DE_CONTRASENA_REQUERIDO` (la puerta va antes) y `POST /auth/cambiar-contrasena` le respondería `403 ACCESO_RESTRINGIDO`: **no podría salir nunca de esa situación**. Decisión: `cambiar-contrasena` se registra con `permitirRestringido: true` (DEC-09). Tras cambiarla, el restringido solo ve su pantalla. Un restringido **sin** la bandera recibe `409 CAMBIO_NO_REQUERIDO`, no `403 ACCESO_RESTRINGIDO`; no abre nada y se documenta en el README de `middleware/`. Texto aprobado para ESSENTIALS al final.
- **C-02. §8 "Idempotencia: `eventId` como `singletonKey`".** Este plan usa el `id` del trabajo de pg-boss (su llave primaria) como `eventId` (DEC-06): un segundo `send` con el mismo id no crea otro trabajo (`ON CONFLICT DO NOTHING`) y no depende de la semántica de `singletonKey` por política de cola. Además, el `eventId` va como `idempotencyKey` a Resend. Texto autorizado para §8.
- **C-03. §14 `tokens_cuenta`** lista `id, usuario_id, tipo, hash_token, expira_en, usado_en`. Este plan añade `revocado_en`, `creado_en` y `actualizado_en` (DEC-01). Texto autorizado para §14.
- **C-04. §9 "Un correo que Resend rechaza de forma permanente (dirección inexistente) no se reintenta".** La API de Resend solo rechaza en el acto las direcciones **mal formadas** (`422`); un buzón inexistente se conoce después, como rebote, por webhook. Este plan trata como permanentes los `400` y `422` (DEC-13) y deja los rebotes para un encargo con webhooks. **Un `403` (dominio no verificado o llave inválida) y un fallo de red (`statusCode: null`) se tratan como transitorios:** tres reintentos y después la cola de fallidos, donde queda el `log.error` `correo_de_cuenta_fallido`. Texto autorizado para §9.
- **C-05. §7 no fija rutas** para el alta de maestros, la corrección de correo ni la búsqueda. Este plan fija `POST /admin/maestros`, `PUT /admin/usuarios/{id}/correo` y `POST /admin/usuarios/buscar` (P-04, respaldadas por el humano). Texto autorizado para §7.
- **C-06. §6 "`POST /auth/recuperar` … tarda lo mismo".** No dice cómo. Este plan lo resuelve encolando siempre (DEC-04): la petición no consulta la base de usuarios. Texto autorizado para §6.

## Alcance
**Entra en AUTH-02a:**
- `shared/`: esquemas y códigos de cuentas.
- Migración `tokens_cuenta` (enum, tabla, índices, FK con cascada).
- `core/`: decisiones puras de tokens, recuperación, contraseña temporal, cambio obligatorio, objetivo del restablecimiento, enlaces, plantillas de correo, clasificación de fallos y contrato del evento `CORREO_DE_CUENTA`.
- `adapters/auth`: token de enlace derivado, contraseña temporal, hash inutilizable.
- `adapters/db`: repositorios de `tokens_cuenta` y de cuentas; ejecutor SQL de una transacción para pg-boss.
- Protocolo de bloqueo por usuario en `adapters/db` (Enmienda 2). Alcanza a `adapters/db/sesiones.ts` y al bloque de `POST /login` de `handlers/auth/index.ts`, ambos de AUTH-01, para cerrar T-07, T-08 y T-09.
- `adapters/queue` (pg-boss, con retención corta) y `adapters/notifier` (canales `resend` y `registro`).
- `config/correo.ts` y `config/cola.ts`; `redact` del logger.
- Endpoints: `POST /auth/recuperar`, `POST /auth/restablecer`, `POST /auth/establecer-contrasena`, `POST /auth/cambiar-contrasena`, `POST /admin/maestros`, `POST /admin/usuarios/buscar`, `POST /admin/usuarios/{id}/restablecer-contrasena`, `PUT /admin/usuarios/{id}/correo`.
- `worker.ts` real con el consumidor de `CORREO_DE_CUENTA` y el de su cola de fallidos.
- Pruebas del backend, README del backend, `backend/.env.example` y `eslint.config.mjs`: un bloque que impide importar `adapters/notifier` desde `handlers/` y `middleware/`, y otro que impide invocar `executeSql` fuera de `adapters/`.

**Entra en AUTH-02b:**
- Frontend: `/recuperar`, `/restablecer`, `/establecer-contrasena` y `/cambiar-contrasena`; `apiClient` ante `CAMBIO_DE_CONTRASENA_REQUERIDO`; guardas; aviso en el login; pantalla provisional de admin en `features/admin` (índice de `/admin`).
- Pruebas del frontend y la sección "Frontend en local" §3 del README.

**Fuera de este encargo:** los textos para `AGENTS.md`, `CLAUDE.md` y docs los aplica el orquestador con autorización del humano, al cerrar cada parte.

**No entra:**
- Avisos por correo de clases o tareas (`ENVIAR_CORREO`, `avisar`), la tabla `configuracion` y sus interruptores, y las notificaciones in-app.
- La gestión de usuarios completa (lista paginada, alta de alumnos, baja, restricción), el reenvío de invitaciones y el cambio voluntario de contraseña (P-05).
- Rebotes y webhooks de Resend; la verificación real de Resend y del dominio (DEPLOY).
- `LIMPIEZA_DIARIA` (purga de tokens vencidos).
- De DEPLOY: el límite de tasa global y de `/auth/*`, `trustProxy`, el servicio de la API en Compose con `depends_on` (N-03) y los archivos de entorno separados (N-05).
- Cambios en `handlers/auth/index.ts`, salvo el bloque de `POST /login` (Enmienda 2: la sesión solo nace si el hash verificado sigue vigente). Registro, refresco y logout quedan igual. Tampoco hay cambios en la cadena de middleware ni en `server.ts`.

## Diseño

### Decisiones
- **DEC-01. Migración `tokens_cuenta` (compatible hacia atrás: solo `CREATE`).**
  ```prisma
  enum TipoTokenCuenta {
    recuperacion
    invitacion

    @@map("tipo_token_cuenta")
  }

  // Enlaces de un solo uso (recuperación 30 min, invitación 72 h). Solo el SHA-256 del token; el
  // token se deriva del id con una clave del servidor (DEC-03). revocado_en: invalidado por otro
  // enlace más nuevo, por el admin o por una corrección de correo.
  model TokenCuenta {
    id            String          @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
    usuarioId     String          @map("usuario_id") @db.Uuid
    tipo          TipoTokenCuenta
    hashToken     String          @unique @map("hash_token")
    expiraEn      DateTime        @map("expira_en") @db.Timestamptz(3)
    usadoEn       DateTime?       @map("usado_en") @db.Timestamptz(3)
    revocadoEn    DateTime?       @map("revocado_en") @db.Timestamptz(3)
    creadoEn      DateTime        @default(now()) @map("creado_en") @db.Timestamptz(3)
    actualizadoEn DateTime        @default(now()) @updatedAt @map("actualizado_en") @db.Timestamptz(3)
    usuario       Usuario         @relation(fields: [usuarioId], references: [id], onDelete: Cascade)

    @@index([usuarioId])
    @@map("tokens_cuenta")
  }
  ```
  - En `model Usuario` se añade solo el campo de relación `tokensCuenta TokenCuenta[]` (sin columna). `actualizado_en` lleva `@default(now())` (M-02 de AUTH-01).
  - **`usuarios` no cambia:** el maestro invitado usa un hash inutilizable (S-07), no una columna nula ni un centinela verificable en poco tiempo. Motivo frente a `hash_contrasena` nulo: evita tocar `usuarios`, el tipo de `buscarCredencialesPorEmail` y la rama del login, y el costo de argon2 del login queda igual por construcción.
  - SQL esperado de `--create-only`: `CREATE TYPE "tipo_token_cuenta" AS ENUM ('recuperacion', 'invitacion')`, `CREATE TABLE "tokens_cuenta"` con `"actualizado_en" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP`, `CREATE UNIQUE INDEX "tokens_cuenta_hash_token_key"`, `CREATE INDEX "tokens_cuenta_usuario_id_idx"` y la FK `ON DELETE CASCADE ON UPDATE CASCADE`. **Sin** SQL manual.
  - Reversión documentada (sin archivo): `DROP TABLE tokens_cuenta; DROP TYPE tipo_token_cuenta;`.
  - El esquema `pgboss` no va en Prisma: `migrate diff` solo compara el esquema `public` **[verificar en V-18]**.
- **DEC-02. Maestro invitado sin contraseña utilizable.** `adapters/auth` expone `hashDeContrasenaInutilizable()` = `hashContrasena(randomBytes(32).toString("base64url"))`, y el valor en claro se descarta en la misma función. La rama del login no cambia por esto: la Enmienda 2 solo cambia cómo el login crea la sesión.
- **DEC-03. Token de enlace derivado (P-02).**
  - En `inicializarAuth`, además de lo actual, se calcula `claveTokensCuenta = hkdfSync("sha256", jwtSecret, "", "campus-tokens-cuenta", 32)` (de `node:crypto`) y se guarda en el estado del adaptador.
  - `derivarTokenDeCuenta(id)` devuelve `{ token, hash }`, con `token = HMAC-SHA256(claveTokensCuenta, id)` en base64url (43 caracteres) y `hash = SHA-256(token)` en hex. `hashTokenDeCuenta(token)` = SHA-256 hex.
  - Consecuencias: el handler guarda el hash sin conocer el token; el worker recalcula el token con el id que trae el trabajo; los reintentos producen **el mismo** enlace; rotar `JWT_SECRET` invalida los enlaces pendientes (aceptable: duran ≤ 72 h).
  - El trabajo solo lleva el `id`, que sin la clave no sirve: no es secreto (sale en los logs como `trabajoId`). La seguridad descansa en la clave; filtrar `JWT_SECRET` ya es un compromiso total.
- **DEC-04. `POST /auth/recuperar`: misma respuesta y mismo tiempo porque el handler no mira la cuenta.**
  - El handler valida el cuerpo, normaliza el correo, aplica el límite en memoria (P-03, antes de cualquier `await`) y **siempre** encola `CORREO_DE_CUENTA` con `{ tipo: "recuperacion", correo }` e `id = randomUUID()`; responde `204` sin cuerpo.
  - No consulta `usuarios` ni escribe `tokens_cuenta`: el camino es idéntico exista o no el correo.
  - El worker resuelve la cuenta, decide (`decidirEnvioDeRecuperacion`), crea el token con `id = id del trabajo` y envía.
  - Cuentas omitidas en silencio: inexistente, inactiva, **admin** (PRD §3: "Sin registro ni recuperación pública") y tope de 3 por hora por cuenta (P-03). Un maestro invitado pendiente sí recibe el enlace (S-09).
- **DEC-05. Límite de recuperación (P-03).**
  - API: `POLITICA_SOLICITUDES_RECUPERACION = { maximo: 3, ventanaMs: 3_600_000 }`, con la misma función pura `reservarIntento` de `core/auth/intentos.ts`. Cuenta **toda** solicitud, no solo los fallos. Llave `llaveDeIntento(request.ip, correoNormalizado)`; `Map` en el ámbito del plugin, con poda cada 500 escrituras (como el login).
  - La cuarta solicitud en la hora responde `429 DEMASIADAS_SOLICITUDES` "Ya pediste varios enlaces para este correo. Espera una hora e inténtalo de nuevo." con `Retry-After: 3600`; no revela si la cuenta existe.
  - Worker: `contarRecuperacionesRecientes(usuarioId, desde = ahora − 1 h)` sobre `tokens_cuenta` (`tipo = recuperacion`, cualquier estado); con 3 o más, no envía.
- **DEC-06. Cola: pg-boss en el mismo PostgreSQL, encolado transaccional, idempotencia y retención.**
  - `adapters/queue` es el único que importa `pg-boss` (regla 1; ya está en `libreriasDeInfraestructura` de `eslint.config.mjs`).
  - Colas: `CORREO_DE_CUENTA` y `CORREO_DE_CUENTA_FALLIDO`. Una cola propia para los correos de cuenta les da prioridad natural sobre los avisos futuros (ESSENTIALS).
  - Política de `CORREO_DE_CUENTA`: `retryLimit: 3`, `retryDelay: 30`, `retryBackoff: true` (≈ 30 s, 60 s y 120 s), `expireInSeconds: 300`, `deadLetter: "CORREO_DE_CUENTA_FALLIDO"`.
  - **Retención (N-02):** `retentionSeconds: 86_400` y `deleteAfterSeconds: 86_400` en `CORREO_DE_CUENTA` y en `CORREO_DE_CUENTA_FALLIDO`, frente a los 14 y 7 días por defecto (`QUEUE_DEFAULTS`, `dist/plans.js:83-92`). Constante `RETENCION_COLAS_DE_CORREO_S = 86_400`. Un trabajo que pasa 1 día sin procesarse se descarta (R-17) y uno completado o fallido se borra 1 día después. Así se acotan el crecimiento de `pgboss.job` ante un abuso de `recuperar` y el tiempo que el correo vive en la cola (S-14). Los nombres exactos se confirman en V-05; si pg-boss usa otro nombre, se ajusta y se reporta.
  - La cola de fallidos va sin reintentos ni `deadLetter`. `createQueue` exige que exista **antes** que `CORREO_DE_CUENTA`, así que va primero en `OPCIONES_DE_COLAS`.
  - `createQueue` es idempotente pero **no actualiza** la política de una cola que ya existe. En este encargo no importa: las colas nacen ya con esta política en la base desechable y en `campus_dev`, donde se crean por primera vez en V-16. Un cambio futuro de política exige `updateQueue` (nota en `adapters/README.md` y §8).
  - **Idempotencia:** el `id` del trabajo es el `eventId` (C-02). En las invitaciones es el `id` de la fila de `tokens_cuenta`; en las recuperaciones, el worker crea la fila con ese mismo `id`. `send` con un id existente devuelve `null` y `encolar` lo trata como éxito.
  - La API arranca pg-boss sin supervisión ni programación (`supervise: false`, `schedule: false`; el worker supervisa) y con `max: 3` conexiones; el worker, con `max: 4`. Ambos aseguran las dos colas al arrancar.
- **DEC-07. Encolado en la misma transacción que el dato, con Prisma 7 (reescrita por M-01).**
  - `adapters/db/cliente.ts` exporta `interface EjecutorSql { executeSql(texto: string, valores?: unknown[]): Promise<{ rows: unknown[] }> }` y `ejecutorSqlDe(tx: Prisma.TransactionClient): EjecutorSql`. Este ejecuta `tx.$queryRawUnsafe(texto, ...(valores ?? []))` **dentro** de la transacción interactiva y pasa texto y valores **tal como los entrega pg-boss**, sin transformarlos.
  - Es el **único** `$queryRawUnsafe` permitido en `backend/src` (arbitraje del Manager; V-13 lo comprueba).
  - **Qué SQL recibe** (pg-boss 12.34.0, verificado por el Manager y a confirmar en V-05):
    - `createJob` (`dist/manager.js:1150-1161`) llama a `db.executeSql(sql, [JSON.stringify([job])])`: un **solo parámetro**, `$1`, con todo el trabajo (id, datos y opciones) serializado por pg-boss.
    - `plans.insertJobs` (`dist/plans.js:2018-2141`) arma **una sola sentencia**: `INSERT … SELECT … FROM json_to_recordset($1::text::json) … ON CONFLICT DO NOTHING RETURNING id`, o un único `WITH …` si la cola tiene `notify`.
    - En el texto interpola **solo** el esquema, la tabla y el nombre de la cola (`'${name}' as name`, `JOIN ${schema}.queue q ON q.name = '${name}'`). Esos valores salen de constantes nuestras y pg-boss valida el nombre con `^[\w.\-/]+$` (`dist/attorney.js:88`). **Ningún dato de la petición ni del trabajo entra al texto.**
  - `encolar` recibe el nombre de la cola solo de las constantes de `core/eventos/`; en pruebas, de literales de la propia prueba. Nunca de la petición.
  - **Evidencia que baja el riesgo:** pg-boss publica su propio adaptador para Prisma, `fromPrisma` (`dist/adapters/prisma.js`, exportado en `dist/index.d.ts:117`), con el mismo código que `ejecutorSqlDe` (`executeSql(text, values) → tx.$queryRawUnsafe(text, ...values)`). pg-boss lo prueba contra `@prisma/client` y `@prisma/adapter-pg` 7.10, que tiene en sus `devDependencies`.
    - No se usa `fromPrisma` dentro de `adapters/queue`: obligaría a entregar la transacción de Prisma completa al callback del handler, que es peor para la regla 1 (arbitraje del Manager).
  - **Defensa:** con parámetros, `$queryRawUnsafe` usa el protocolo extendido de PostgreSQL, que rechaza varias sentencias en una sola llamada ("cannot insert multiple commands into a prepared statement"). Si una versión futura de pg-boss mandara varias, fallaría de forma visible y no en silencio.
  - **Contención (N-01):** `executeSql` solo se **invoca** dentro de `backend/src/adapters/`. `handlers/` y `workers/` reciben la capacidad en `alGuardar(sql)` y solo la pasan a `encolar`. Lo impiden un bloque de ESLint (`no-restricted-syntax`) y la búsqueda de V-13.
  - `adapters/queue` recibe el ejecutor por el parámetro `sql` de `encolar` y lo pasa como `db` a `send`.
  - Los repositorios compuestos reciben un callback `alGuardar(sql: EjecutorSql)` que ejecutan al final de su transacción. Así `adapters/db` no importa `adapters/queue` ni al revés: solo comparten el tipo `EjecutorSql`. Si el callback lanza, Prisma revierte todo.
  - ~~Contingencia de `JSON.stringify`~~: **retirada** por la Enmienda 1 (M-01), porque pg-boss ya serializa y manda texto.
  - Si pg-boss 12 no lo permite: PA-06/PA-07.
- **DEC-08. Tokens: decisión pura y un solo uso resistente a carreras.**
  - `core/auth/tokens-cuenta.ts` define:
    - `VIGENCIA_TOKEN_MS = { recuperacion: 30 * 60_000, invitacion: 72 * 3_600_000 }`, `calcularExpiracionToken(tipo, ahora)` y `estaVivo(token, ahora)` (`usadoEn === null && revocadoEn === null && expiraEn > ahora`).
    - `decidirUsoDeToken({ token, tipoEsperado, ahora })` → `{ valido: true }` o `{ valido: false, motivo }`, con los motivos `inexistente`, `tipo`, `usado`, `revocado`, `vencido` y `usuario_inactivo`. Son internos y nunca se exponen: la respuesta es siempre `400 ENLACE_INVALIDO` "El enlace no es válido o ya venció. Pide uno nuevo.".
  - Un token de invitación no sirve en `/restablecer`, y viceversa.
  - El consumo (`usarTokenYCambiarContrasena`) es una transacción con orden fijo:
    0. `bloquearUsuarioParaEscribir(tx, usuarioId)` bloquea la fila del usuario con `FOR NO KEY UPDATE` (protocolo de bloqueo por usuario, sección `backend/adapters/`; Enmienda 2).
       - No escribe nada: el perdedor de la carrera sigue sin tocar ningún dato.
       - Formaliza la desviación de la ronda 2 (corrección de T-01), que usaba `FOR UPDATE`.
    1. `updateMany where id AND usado_en IS NULL AND revocado_en IS NULL AND expira_en > ahora set usado_en = ahora`.
    2. Si `count === 0`, devuelve `false` sin tocar nada (otra petición ganó).
    3. Si `count === 1`, hace `usuario.update` (hash nuevo, `debe_cambiar_contrasena = false`), revoca **todas** las sesiones vivas y **todos** los demás tokens vivos del usuario, y devuelve `true`.
  - `prepararTokenDeRecuperacion` (N-04) también empieza con `bloquearUsuarioParaEscribir` (Enmienda 2).
  - El argon2id de la contraseña nueva se calcula **antes** de abrir la transacción.
- **DEC-09. Cambio obligatorio (RF-04d) y `withPasswordGate`.**
  - La puerta ya existe y ya bloquea todo con `403 CAMBIO_DE_CONTRASENA_REQUERIDO`, incluido `GET /me` (decisión de AUTH-01, se mantiene). Lo nuevo es la única ruta que la deja pasar: `POST /api/auth/cambiar-contrasena`, con `protegido({ permitirCambioPendiente: true, permitirRestringido: true })` (C-01). `refrescar` y `logout` ya son públicas.
  - Flujo del handler, en este orden:
    1. `evaluarCambioSolicitado(perfil)`: `409 CAMBIO_NO_REQUERIDO` si no tiene la bandera (P-05). También para un restringido sin la bandera.
    2. `validarCuerpo(cambiarContrasenaSchema)`.
    3. `evaluarContrasenaNueva({ actual, nueva })`: `400 CONTRASENA_REPETIDA` "La contraseña nueva debe ser distinta de la temporal.".
    4. Reserva en memoria por `usuarioId` con `POLITICA_INTENTOS` (5 en 15 min, antes de cualquier `await`): `429 DEMASIADOS_INTENTOS` con `Retry-After: 900`.
    5. `buscarCredencialesPorId` y `verificarContrasena`, con retornos tempranos: si las credenciales son `null` o la contraseña no coincide, `contrasenaActualIncorrecta()` (Enmienda 2).
       - Responde `400 CONTRASENA_ACTUAL_INCORRECTA` "La contraseña temporal no es correcta.".
       - Es **400, no 401**: un 401 dispararía el refresco del `apiClient` y cerraría la sesión.
    6. Borra la llave del límite y calcula `hashContrasena(nueva)`.
    7. Identifica la sesión actual por la cookie `campus_refresco`, que el navegador sí envía a `/api/auth/*`. Se conserva solo si existe, es del mismo usuario, no está revocada ni reemplazada y no venció.
    8. `cambiarContrasenaPropia` con `hashVerificado: credenciales.hashContrasena`, una transacción del protocolo de bloqueo (Enmienda 2):
       - Bloquea primero al usuario.
       - Si el hash vigente ya no es el verificado (por ejemplo, porque el admin generó otra temporal entretanto), devuelve `false` sin escribir nada, y el handler responde `400 CONTRASENA_ACTUAL_INCORRECTA`.
       - Si coincide, guarda el hash nuevo, pone la bandera en `false`, revoca las demás sesiones y todos los tokens vivos, y se responde `204`.
  - Sin una cookie válida, se revocan todas las sesiones y el usuario vuelve a entrar.
- **DEC-10. Restablecimiento y corrección por el admin (RF-04a).**
  - `POST /api/admin/usuarios/:id/restablecer-contrasena`:
    - Flujo: `validarParametros` (id uuid) → `buscarCuentaPorId` (`404 USUARIO_NO_ENCONTRADO` si no existe) → `evaluarObjetivoDeRestablecimiento` (`403 OPERACION_NO_PERMITIDA` "La contraseña del administrador se restablece desde el servidor con npm run reset:admin." si el objetivo es admin) → `generarContrasenaTemporal()` → `hashContrasena` → `restablecerConTemporal` → `200 { contrasenaTemporal }` con `Cache-Control: no-store`.
    - `restablecerConTemporal` es una transacción:
      - Primero bloquea la fila del usuario con `bloquearUsuarioParaEscribir` (Enmienda 2) y devuelve `null` si el usuario no existe; entonces se responde 404.
      - Después guarda el hash, pone `debe_cambiar_contrasena = true` y revoca todas las sesiones y todos los tokens vivos.
    - La temporal solo existe en esa respuesta: ni en logs, ni en la base (solo su argon2id), ni en la cola, ni en ninguna respuesta posterior.
    - Nada de esto crea un segundo admin: no cambia `rol`.
  - `PUT /api/admin/usuarios/:id/correo` con `{ email }`:
    - Normaliza con `normalizarCorreo` y llama a `corregirCorreo`: una transacción que actualiza el correo y revoca los tokens vivos. El `P2002` se traduce en `adapters/db` a `409 CORREO_EN_USO` y se **relanza**; `null` → 404.
    - Responde `200` con la cuenta (`usuarioAdminSchema`). No revoca sesiones (S-06).
  - `POST /api/admin/usuarios/buscar` con `{ email }` (P-04): `buscarCuentaPorEmail(normalizado)` → `200 { usuario }` o `404 USUARIO_NO_ENCONTRADO`.
  - La regla "el objetivo no puede ser admin" es de negocio sobre el **objetivo**, no autorización de quien pide (esa la hace `requireRole(["admin"])`): va en `core/auth/respaldo.ts` y el handler solo la evalúa.
- **DEC-11. Invitación de maestros (RF-04b).**
  - `POST /api/admin/maestros` con `{ nombre, email }`, en este orden: `validarCuerpo(invitarMaestroSchema)` → `prepararRegistro` (normaliza nombre, correo y `nombreBusqueda`) → `hashDeContrasenaInutilizable()` → `tokenId = randomUUID()` → `derivarTokenDeCuenta(tokenId).hash` → `crearMaestroInvitado(…)` → `201` con la cuenta.
  - La llamada al repositorio es `crearMaestroInvitado({ usuario: { …, rol: "maestro" }, token: { id: tokenId, hashToken, expiraEn: ahora + 72 h } }, (sql) => encolar(COLA_CORREO_DE_CUENTA, { tipo: "invitacion" }, { id: tokenId, sql }))`.
  - Con un correo duplicado responde `409 CORREO_EN_USO` y no crea ni usuario, ni token, ni trabajo.
  - El maestro queda `activo`, pero no puede entrar hasta establecer su contraseña: el login responde `401 CREDENCIALES_INVALIDAS`, igual que con una contraseña incorrecta.
- **DEC-12. Configuración del correo (solo el worker).** Vive en `config/correo.ts`, aparte de `config/env.ts`. Así no cambia lo que valida la API, y la prueba del Tester `env.ataque.test.ts:15` sigue aceptando una configuración de `production` sin variables de correo.
  - Variables: `RESEND_API_KEY` (texto; vacío = ausente), `CORREO_REMITENTE` (texto de 3 a 200; vacío = ausente), `CORREO_RESPONDER_A` (correo opcional; vacío = ausente), `URL_PUBLICA_FRONTEND` (URL `http`/`https`; vacío = ausente).
  - En `production`:
    - Son obligatorias `RESEND_API_KEY`, `CORREO_REMITENTE` y `URL_PUBLICA_FRONTEND` (no `CORREO_RESPONDER_A`), y `URL_PUBLICA_FRONTEND` debe empezar con `https://`.
    - **N-05:** se rechaza un `CORREO_REMITENTE` cuyo dominio sea `campus.local`, el de `.env.example` y el de `REMITENTE_DE_DESARROLLO`, con el mismo criterio que `JWT_SECRET_DE_EJEMPLO`.
      - La dirección es el texto entre `<` y `>` si existe; si no, el texto completo. El dominio es lo que sigue a la última `@`, recortado y en minúsculas.
      - Se rechaza si es igual a la constante `DOMINIO_REMITENTE_DE_EJEMPLO = "campus.local"`.
      - Mensaje: `CORREO_REMITENTE: en production debe usar un dominio propio verificado en Resend, distinto del de .env.example`.
    - Si falta algo o se rechaza, el worker no arranca. El mensaje lleva el nombre de la variable y el motivo, **nunca** el valor.
  - Fuera de `production`, los valores por defecto son `CORREO_REMITENTE = "CMEP Campus Digital <notificaciones@campus.local>"` (aceptado) y `URL_PUBLICA_FRONTEND = "http://127.0.0.1:5173"`.
  - **Canal:** `NODE_ENV === "production"` **y** llave presente → `resend`; cualquier otro caso → `registro`, **aunque exista la llave** (regla 12). Defensa doble: `crearNotifier` lanza si le piden `resend` con `nodeEnv !== "production"` (PA-10).
  - `DIRECTORIO_CORREOS = fileURLToPath(new URL("../../tmp/correos/", import.meta.url))`: desde `src/config/` y desde `dist/config/` resuelve a `backend/tmp/correos/`, que git ignora.
- **DEC-13. `adapters/notifier` (regla 12).** El puerto vive en `core/correo/notifier.ts`: `interface Notifier { correoDeCuenta(correo: CorreoDeCuenta): Promise<ResultadoEnvio> }`, con `CorreoDeCuenta = { para, nombre, tipo, enlace, idempotencia }` y `ResultadoEnvio = { estado: "enviado"; id: string } | { estado: "rechazado"; motivo: string }`. `crearNotifier(opciones, { log, nodeEnv, clienteResend? })` elige el canal:
  - **`resend`** (`adapters/notifier/resend.ts`, único importador de `resend`):
    - `crearCanalResend` **lanza** si `apiKey.trim() === ""`, **antes** de construir o usar cualquier cliente, incluido uno inyectado. Motivo: `new Resend("")` tomaría `process.env.RESEND_API_KEY` (`index.mjs:1278-1280`).
    - Renderiza con `plantillaCorreoDeCuenta` y llama a `emails.send({ from, to, subject, html, text, replyTo? }, { idempotencyKey: correo.idempotencia })`.
    - Éxito → `enviado`.
    - Error con estado `400` o `422` (`clasificarFalloDeCorreo` = permanente) → `rechazado`, con `log.warn({ evento: "correo_rechazado", motivo })`. El `motivo` es `"<statusCode> <name>"` de Resend: nunca su `message`, la dirección ni el enlace.
    - Cualquier otro caso lanza `AppError("CORREO_NO_ENVIADO", …, 502)` con un mensaje fijo que no incluye el `message` del proveedor, para que pg-boss reintente. Incluye `403`, `429`, `5xx` y el fallo de red, que Resend 6 **no lanza**: lo devuelve como `error` con `statusCode: null` (`index.mjs:1352-1362`).
    - Si `emails.send` llegara a lanzar, se traduce al mismo `AppError`: es el único `try/catch` permitido, para traducir el error del proveedor.
    - El cliente se inyecta en pruebas; ninguna prueba construye uno real.
  - **`registro`** (`adapters/notifier/registro.ts`): crea el directorio si falta (`mkdir` recursivo) y escribe `<fechaISO con ":" y "." cambiados por "-">-<idempotencia>.html` con el HTML completo, enlace incluido, porque es para que el desarrollador lo abra. Registra `log.info({ evento: "correo_registrado", tipo, archivo })` **sin** el enlace, el token ni la dirección.
  - El worker **nunca** llama a Resend directamente y **ningún handler importa `adapters/notifier`** (bloque nuevo de `eslint.config.mjs`).
- **DEC-14. Plantillas (RF-03).** `core/correo/plantillas.ts`, puras, sin `@react-email`: `plantillaCorreoDeCuenta({ tipo, nombre, enlace, urlRecuperar })` → `{ asunto, html, texto }`, con `escaparHtml` sobre el nombre y el enlace dentro del HTML. Textos (es-MX, tuteo):
  - **Recuperación.** Asunto: "Restablece tu contraseña de CMEP Campus Digital". Cuerpo: "Hola, {nombre}." / "Recibimos una solicitud para restablecer la contraseña de tu cuenta en CMEP Campus Digital." / botón y enlace "Elegir una contraseña nueva" / "El enlace vence en 30 minutos y solo funciona una vez." / "Si no pediste este cambio, ignora este correo: tu contraseña sigue igual."
  - **Invitación.** Asunto: "Activa tu cuenta de maestro en CMEP Campus Digital". Cuerpo: "Hola, {nombre}." / "Administración te dio de alta como maestro en CMEP Campus Digital." / botón y enlace "Elegir mi contraseña" / "El enlace vence en 72 horas y solo funciona una vez." / "Si vence, pide uno nuevo en {urlRecuperar} o acude a administración."
  - Los minutos y horas se derivan de `VIGENCIA_TOKEN_MS`. Firma: "CMEP Campus Digital". Sin emojis ni palabras prohibidas de `CLAUDE.md`.
  - Enlaces (`core/auth/enlaces.ts`, `construirEnlaceDeCuenta({ urlBase, tipo, token })`): `${urlBase}/restablecer#token=${token}` y `${urlBase}/establecer-contrasena#token=${token}`, con `urlBase` sin barra final.
  - **El token va en el fragmento (`#`):** el navegador no lo envía en ninguna petición HTTP ni en `Referer`, así que no llega a los logs de Cloudflare ni de la API. El frontend lo lee y lo quita de la barra de direcciones y del historial.
- **DEC-15. Worker (`workers/correo-de-cuenta.ts`).** `procesarCorreoDeCuenta({ id, datos }, deps)`, con `deps = { notifier, urlPublicaFrontend, reloj, log }`, devuelve `"enviado" | "rechazado" | "omitido"` (para pruebas) y lanza solo ante fallos transitorios:
  1. `datosCorreoDeCuentaSchema.safeParse(datos)`. Si los datos son inválidos: `log.error({ evento: "correo_de_cuenta_invalido", trabajoId: id })` y `omitido`. No se reintenta algo que nunca será válido.
  2. `ahora = reloj()`; `registro = buscarTokenParaEnvio(id)`.
  3. Recuperación sin registro:
     - `cuenta = buscarCuentaPorEmail(correo)`; `enviadas = cuenta ? contarRecuperacionesRecientes(cuenta.id, ahora − 1 h) : 0`.
     - `decidirEnvioDeRecuperacion`. Si no toca enviar: `log.info({ evento: "recuperacion_omitida", motivo, trabajoId })`, sin el correo, y `omitido`.
     - Si toca enviar: `prepararTokenDeRecuperacion({ id, usuarioId, hashToken: derivarTokenDeCuenta(id).hash, expiraEn: ahora + 30 min, ahora })` y vuelve a leer el registro.
     - **N-04:** `prepararTokenDeRecuperacion` es una transacción de dos sentencias, **sin `try/catch` dentro**:
       - (a) `updateMany` que revoca los tokens de recuperación vivos del usuario **cuyo `id` es distinto** del del trabajo. Así un reintento concurrente del mismo trabajo no revoca el token que otro intento acaba de insertar.
       - (b) `createMany({ data: [fila], skipDuplicates: true })` (`ON CONFLICT DO NOTHING`), que no aborta la transacción si otro intento ya insertó la fila.
       - No hace falta saber si insertó: la relectura por id devuelve la fila en los dos casos.
  4. Invitación sin registro → `log.error` y `omitido`. No debería ocurrir: la transacción los crea juntos.
  5. `registro.tipo !== datos.tipo`, `!estaVivo(registro, ahora)` o `!registro.usuario.activo` → `omitido`. Es el reintento de un enlace ya usado, revocado o vencido: no se reenvía.
  6. `enlace = construirEnlaceDeCuenta(...)` con `derivarTokenDeCuenta(id).token`; `notifier.correoDeCuenta({ para: registro.usuario.email, nombre, tipo, enlace, idempotencia: id })`.
  7. `rechazado` → `log.warn` y se completa; `enviado` → `log.info({ evento: "correo_de_cuenta_enviado", tipo, trabajoId, proveedorId })`.
  - `workers/index.ts`: `registrarConsumidores(deps, colas = { correoDeCuenta: COLA_CORREO_DE_CUENTA, fallidos: COLA_CORREO_DE_CUENTA_FALLIDO })`.
    - Registra `CORREO_DE_CUENTA` con `batchSize: 1`: un correo a la vez, a un ritmo muy por debajo del límite de Resend.
    - Registra la cola de fallidos con un consumidor que hace `log.error({ evento: "correo_de_cuenta_fallido", trabajoId })` y completa. Cumple RNF-09: el fallo queda registrado; la alerta sobre ese evento es de DEPLOY.
    - Las colas son un parámetro para que la prueba del consumidor real use colas propias y no consuma trabajos de otros archivos.
  - `worker.ts`: `cargarEnv()` → `cargarEnvCorreo(env.NODE_ENV)` → `pino(opcionesDeLogger(env))` → `inicializarDb` → `inicializarAuth(opcionesDeAuth(env))` (la clave de DEC-03) → `crearNotifier` → `iniciarCola({ ...opcionesDeCola(env, "worker"), log })` → `registrarConsumidores` → `log.info({ evento: "worker_listo", canalCorreo })`.
    - Ante `SIGINT`/`SIGTERM`: `detenerCola()` (espera ordenada, máximo 30 s) → `cerrarConexion()` → `process.exit(0)`. Un error al detener → `log.error` y `exit(1)`.
- **DEC-16. API y cola (N-03 y N-06).**
  - **Dónde va (N-06 punto 2).** En `construirApp`, `await iniciarCola({ ...opcionesDeCola(env, "api"), log: app.log })` va **inmediatamente después de crear `app` con `Fastify(...)`** (antes no existe `app.log`, e `inicializarAuth` corre antes de `Fastify()`) y **antes** de `app.register(manejoDeErrores)` y de registrar cualquier handler. Es idempotente, como `inicializarDb`. El `onClose` llama a `detenerCola()` y después a `cerrarConexion()`.
  - **Decisión declarada (N-03, opción a): la API no arranca sin base.**
    - Hoy `construirApp` no se conecta al arrancar. Con este cambio, `pg-boss.start()` falla si PostgreSQL no responde: `construirApp` lanza y `server.ts` termina con código distinto de 0, por el mismo camino que ya sigue la guarda de rutas de AUTH-01. `server.ts` no cambia.
    - Si la base cae con la API ya en marcha, `/api/salud` sigue respondiendo `503 BASE_DE_DATOS_NO_DISPONIBLE` como hoy.
    - En el servidor, el servicio de la API (y el del worker) llevará `depends_on: postgres: condition: service_healthy`; el `healthcheck` de `postgres` ya existe en `infra/docker-compose.yml`. Hoy ese archivo no tiene servicio de API, así que es un **requisito de DEPLOY (§18), no un cambio de `infra/` en este encargo** (no está autorizado). Nota en el README §6.
    - `test/salud-sin-base.integracion.test.ts` **no se toca y sigue en verde**: solo simula `adapters/db`, y pg-boss arranca contra la base desechable, que sí existe.
  - En pruebas, `global-setup.ts` ejecuta una vez `test/preparar-cola.ts`, en un proceso aparte como `seed:admin`, para instalar el esquema `pgboss` y crear las dos colas en la base desechable antes de que los archivos corran en paralelo.
    - **N-06 punto 3:** `preparar-cola.ts` aplica `validarUrlDePruebas(env.DATABASE_URL)` **antes** de conectarse y, si devuelve un motivo, lanza `Error("Guarda de la base de pruebas: <motivo>")` sin la URL. Así, correrlo a mano con el `backend/.env` del desarrollador nunca instala `pgboss` en `campus_dev`.
- **DEC-17. Frontend: `CAMBIO_DE_CONTRASENA_REQUERIDO` (AUTH-02b).**
  - `apiClient`:
    - `403 CAMBIO_DE_CONTRASENA_REQUERIDO` → `irA("/cambiar-contrasena")`, salvo que `rutaActual()` ya sea `/cambiar-contrasena` (sin bucles; el error se lanza igual). Es simétrico al manejo de `ACCESO_RESTRINGIDO`.
    - El refresco ante `401` con token deja de excluir `/api/auth/cambiar-contrasena`, la única ruta protegida bajo `/api/auth/`. El resto de `/api/auth/*` sigue excluido (lo exige `apiClient.ataque.test.ts:153`).
    - `RUTAS_SIN_SESION` añade `/recuperar`, `/restablecer` y `/establecer-contrasena`.
  - Guardas:
    - `RequireSesion` y `RequireRol`: si `useMe` falla con `CAMBIO_DE_CONTRASENA_REQUERIDO` → `<Navigate to="/cambiar-contrasena" replace />`. Es el camino suave: en el navegador, `apiClient` ya habrá recargado hacia ahí.
    - Guarda nueva `RequireCambioDeContrasena` para `/cambiar-contrasena`, fuera de `RequireSesion`: con el error `CAMBIO…` → `<Outlet />` (el formulario); con otro error → `/login`; mientras carga → `<Cargando />`; con `/me` en `200` (no hay cambio pendiente) → `<Navigate to={rutaTrasLogin(me)} />`.
  - Login con temporal:
    1. `useLogin`; `/me` responde 403 y `apiClient` hace `irA("/cambiar-contrasena")` (recarga completa).
    2. La sesión se restaura con la cookie (un `/refrescar`); `/me` vuelve a responder 403 y la guarda muestra el formulario.
    3. Tras cambiarla: `removeQueries(["me"])` → `fetchQuery(consultaMe)` → `navigate(rutaTrasLogin(me))`.
- **DEC-18. Frontend: token del enlace (AUTH-02b).**
  - `useTokenDelEnlace()` (en `hooks.ts`) lee el token **una vez** con `useState(() => leerTokenDelFragmento(location.hash))` y, en un efecto, hace `navigate({ pathname, search, hash: "" }, { replace: true })` para quitarlo de la barra y del historial.
  - El token vive solo en el estado de React: nunca en `localStorage`, `sessionStorage`, la caché de TanStack Query ni la URL después de leerlo.
  - `leerTokenDelFragmento` (pura, en `lib.ts`) acepta solo `#token=<43 caracteres base64url>` y devuelve `null` en cualquier otro caso. Entonces la vista muestra "El enlace no es válido" sin hacer ninguna petición.
- **DEC-19. Pantalla provisional de admin en `features/admin` (AUTH-02b).**
  - Va en `features/admin` y no en `features/auth`: la regla 9 impide que otro módulo la use, y el módulo `admin` ya figura en `CLAUDE.md`.
  - Ruta: índice de `/admin`. Sustituye a la bienvenida del admin hasta el dashboard institucional.
  - Contenido, en densidad de admin:
    - "Invitar a un maestro" (nombre y correo).
    - "Buscar una cuenta por correo" → ficha (nombre, correo, rol, "Cuenta inactiva" si aplica) con "Restablecer contraseña" (confirmación **en línea**, no modal) y "Corregir correo".
  - La temporal se muestra una sola vez, con el aviso "Cópiala ahora y entrégasela en persona: no se volverá a mostrar." y un botón "Copiar" (`navigator.clipboard` en un manejador con `try/catch` y toast).
  - La mutación usa `gcTime: 0` para que el resultado no se quede en la caché de mutaciones. Al buscar otra cuenta o salir de la pantalla, la temporal desaparece.
  - Para una cuenta admin, la ficha no ofrece "Restablecer" y explica "La contraseña del administrador se restablece desde el servidor." (el backend la niega igual).

### Flujo de las peticiones
1. **`POST /api/auth/recuperar`** `{ email }` → `validarCuerpo(recuperarSchema)` → `normalizarCorreo` → reserva en memoria (IP + correo; `429` si toca) → `encolar(CORREO_DE_CUENTA, { tipo: "recuperacion", correo }, { id: randomUUID() })` → `204`. Escribe un trabajo en `pgboss.job`. No lee nada de `public`.
2. **Worker `CORREO_DE_CUENTA` (recuperación)** → DEC-15 pasos 1 a 7. Lee `tokens_cuenta` (PK) y `usuarios` (email único), y cuenta en `tokens_cuenta` (`usuario_id`). Escribe en `tokens_cuenta`, en una transacción que revoca los vivos con id distinto e inserta sin duplicar.
3. **`POST /api/auth/restablecer`** y **`POST /api/auth/establecer-contrasena`** `{ token, contrasena }` → `validarCuerpo` → `buscarTokenPorHash(hashTokenDeCuenta(token))` → `decidirUsoDeToken` con `tipoEsperado` (`recuperacion` / `invitacion`) → `400 ENLACE_INVALIDO` si no vale → `hashContrasena` → `usarTokenYCambiarContrasena` (DEC-08) → `false` → `400 ENLACE_INVALIDO`; `true` → `204`.
4. **`POST /api/auth/cambiar-contrasena`** → DEC-09.
5. **`POST /api/admin/maestros`** → DEC-11. Una transacción: `usuarios` + `tokens_cuenta` + trabajo en `pgboss.job`.
6. **Worker `CORREO_DE_CUENTA` (invitación)** → DEC-15 pasos 2 y 4 a 7.
7. **`POST /api/admin/usuarios/buscar`**, **`POST /api/admin/usuarios/:id/restablecer-contrasena`**, **`PUT /api/admin/usuarios/:id/correo`** → DEC-10.
8. **Cola de fallidos** → `log.error` y completar.

### Tabla por endpoint
| Ruta | Cadena | Entrada (`shared/`) | Salida | Errores | Nunca sale |
|---|---|---|---|---|---|
| `POST /api/auth/recuperar` | pública (`rutas-publicas.ts`) + límite IP + correo | `recuperarSchema` | `204` | `400 VALIDACION`, `429 DEMASIADAS_SOLICITUDES` | si la cuenta existe; cualquier dato de cuenta |
| `POST /api/auth/restablecer` | pública; credencial = token del enlace | `nuevaContrasenaConTokenSchema` | `204` | `400 VALIDACION`, `400 ENLACE_INVALIDO` | motivo del rechazo; datos de la cuenta |
| `POST /api/auth/establecer-contrasena` | pública; credencial = token del enlace | `nuevaContrasenaConTokenSchema` | `204` | ídem | ídem |
| `POST /api/auth/cambiar-contrasena` | `authenticate → withProfile → withPasswordGate(permitirCambioPendiente) → withAccess(permitirRestringido) → requireRole()` → handler (+ límite por usuario) | `cambiarContrasenaSchema` | `204` | `401 NO_AUTENTICADO`, `409 CAMBIO_NO_REQUERIDO`, `400 VALIDACION`, `400 CONTRASENA_REPETIDA`, `400 CONTRASENA_ACTUAL_INCORRECTA`, `429 DEMASIADOS_INTENTOS` | hashes |
| `POST /api/admin/maestros` | `authenticate → withProfile → withPasswordGate → withAccess → requireRole(["admin"])` → handler | `invitarMaestroSchema` | `201 usuarioAdminSchema` | `401`, `403 CAMBIO_DE_CONTRASENA_REQUERIDO`, `403 ACCESO_RESTRINGIDO`, `403 ROL_NO_PERMITIDO`, `400 VALIDACION`, `409 CORREO_EN_USO` | `hashContrasena`, token, `estadoPago` |
| `POST /api/admin/usuarios/buscar` | ídem | `buscarUsuarioSchema` | `200 buscarUsuarioRespuestaSchema` | ídem + `404 USUARIO_NO_ENCONTRADO` | `hashContrasena`, `estadoPago`, `accesoRestringido`, `motivoRestriccion` |
| `POST /api/admin/usuarios/:id/restablecer-contrasena` | ídem | parámetro `id` (uuid) | `200 contrasenaTemporalRespuestaSchema` + `Cache-Control: no-store` | ídem + `404`, `403 OPERACION_NO_PERMITIDA` | el hash; la temporal en cualquier otra respuesta |
| `PUT /api/admin/usuarios/:id/correo` | ídem | `id` + `corregirCorreoSchema` | `200 usuarioAdminSchema` | ídem + `404`, `409 CORREO_EN_USO` | `hashContrasena`, `estadoPago` |

## Dependencias (AUTH-02a)
| Paquete | Dónde | Rango | Para qué |
|---|---|---|---|
| `pg-boss` | backend, `dependencies` | `^12.34.0` | Cola, reintentos, cola de fallidos, retención y encolado transaccional (D-07). Solo en `adapters/queue` |
| `resend` | backend, `dependencies` | `^6.29.0` | Canal de correo de `prod` (D-08). Solo en `adapters/notifier/resend.ts`. Sin `@react-email/render` |

El resto no cambia. `pg` debe quedar en una sola copia si el rango lo permite (`npm ls pg`); dos copias se reportan, no detienen.

## Cambios por capa
Todo lo de `shared/`, `backend/*` y "Raíz y archivos transversales" es de **AUTH-02a**, salvo la fila de "Frontend en local" del README. Todo lo de `frontend/` es de **AUTH-02b**.

### shared/ (AUTH-02a)
| Acción | Archivo | Contenido |
|---|---|---|
| Crear | `shared/src/cuentas.ts` | Esquemas y códigos (abajo) |
| Modificar | `shared/src/index.ts` | Reexporta `./cuentas.js` |

```ts
import { z } from "zod"
import { contrasenaSchema, correoSchema, nombreSchema, rolSchema } from "./auth.js"

// Token de un enlace de cuenta. La forma exacta (43 caracteres base64url) no se valida aquí: un token
// mal formado responde lo mismo que uno inexistente (400 ENLACE_INVALIDO), sin pistas.
export const tokenDeEnlaceSchema = z.string({ error: "El enlace no es válido" }).min(1, "El enlace no es válido").max(256, "El enlace no es válido")
export const recuperarSchema = z.object({ email: correoSchema })
export const nuevaContrasenaConTokenSchema = z.object({ token: tokenDeEnlaceSchema, contrasena: contrasenaSchema })
export const cambiarContrasenaSchema = z.object({
  contrasenaActual: z.string({ error: "Escribe tu contraseña temporal" }).min(1, "Escribe tu contraseña temporal").max(128, "La contraseña no puede tener más de 128 caracteres"),
  contrasenaNueva: contrasenaSchema,
})
export const invitarMaestroSchema = z.object({ nombre: nombreSchema, email: correoSchema })
export const buscarUsuarioSchema = z.object({ email: correoSchema })
export const corregirCorreoSchema = z.object({ email: correoSchema })
// Vista de una cuenta para el admin. Sin estadoPago ni datos de restricción: esta pantalla no los usa.
export const usuarioAdminSchema = z.object({ id: z.uuid(), nombre: z.string(), email: z.string(), rol: rolSchema, activo: z.boolean() })
export const buscarUsuarioRespuestaSchema = z.object({ usuario: usuarioAdminSchema })
export const contrasenaTemporalRespuestaSchema = z.object({ contrasenaTemporal: z.string().min(10) })
export const CODIGOS_CUENTAS = {
  ENLACE_INVALIDO: "ENLACE_INVALIDO",
  DEMASIADAS_SOLICITUDES: "DEMASIADAS_SOLICITUDES",
  CONTRASENA_ACTUAL_INCORRECTA: "CONTRASENA_ACTUAL_INCORRECTA",
  CONTRASENA_REPETIDA: "CONTRASENA_REPETIDA",
  CAMBIO_NO_REQUERIDO: "CAMBIO_NO_REQUERIDO",
  USUARIO_NO_ENCONTRADO: "USUARIO_NO_ENCONTRADO",
  OPERACION_NO_PERMITIDA: "OPERACION_NO_PERMITIDA",
} as const
// Tipos inferidos: Recuperar, NuevaContrasenaConToken, CambiarContrasena, InvitarMaestro, BuscarUsuario,
// CorregirCorreo, UsuarioAdmin, BuscarUsuarioRespuesta, ContrasenaTemporalRespuesta, CodigoCuentas.
```
Después, `npm run build` en `shared/`.

### backend/core/ (todo puro, `ahora` por parámetro; cada archivo con su `.test.ts`)
| Acción | Archivo | Firmas |
|---|---|---|
| Crear | `core/auth/tokens-cuenta.ts` | `type TipoTokenCuenta = "recuperacion" \| "invitacion"`; `VIGENCIA_TOKEN_MS: Record<TipoTokenCuenta, number>`; `calcularExpiracionToken(tipo, ahora): Date`; `interface EstadoDeTokenCuenta { tipo; expiraEn: Date; usadoEn: Date \| null; revocadoEn: Date \| null; usuario: { activo: boolean } }`; `estaVivo(token: Pick<EstadoDeTokenCuenta, "expiraEn" \| "usadoEn" \| "revocadoEn">, ahora): boolean`; `decidirUsoDeToken({ token: EstadoDeTokenCuenta \| null, tipoEsperado, ahora }): DecisionUsoDeToken` |
| Crear | `core/auth/recuperacion.ts` | `POLITICA_SOLICITUDES_RECUPERACION: PoliticaIntentos`; `interface CuentaParaRecuperacion { rol: Rol; activo: boolean }`; `decidirEnvioDeRecuperacion({ cuenta: CuentaParaRecuperacion \| null, enviadasEnLaVentana: number }): { enviar: true } \| { enviar: false; motivo: "inexistente" \| "inactiva" \| "administrador" \| "tope" }` |
| Crear | `core/auth/contrasena-temporal.ts` | `ALFABETO_CONTRASENA_TEMPORAL` (31 caracteres de S-05), `LONGITUD_CONTRASENA_TEMPORAL = 12`, `BYTES_PARA_CONTRASENA_TEMPORAL = 64`; `formatearContrasenaTemporal(bytes: Uint8Array): string` con muestreo por rechazo (solo bytes `< 248`, `248 = 31 × 8`, índice `byte % 31`), agrupada `xxxx-xxxx-xxxx`; si no alcanzan los bytes válidos, lanza `Error` (probabilidad despreciable) |
| Crear | `core/auth/cambio-de-contrasena.ts` | `evaluarCambioSolicitado(perfil: PerfilAutenticado): AppError \| null` (`409 CAMBIO_NO_REQUERIDO` "No tienes un cambio de contraseña pendiente."); `evaluarContrasenaNueva({ actual, nueva }): AppError \| null` (`400 CONTRASENA_REPETIDA` si son idénticas) |
| Crear | `core/auth/respaldo.ts` | `evaluarObjetivoDeRestablecimiento(objetivo: { rol: Rol }): AppError \| null` |
| Crear | `core/auth/enlaces.ts` | `RUTA_DE_ENLACE: Record<TipoTokenCuenta, string>` (`/restablecer`, `/establecer-contrasena`); `construirEnlaceDeCuenta({ urlBase, tipo, token }): string`; `construirUrlRecuperar(urlBase): string` |
| Crear | `core/correo/notifier.ts` | Puerto: `CorreoDeCuenta`, `ResultadoEnvio`, `Notifier` (DEC-13). Sin pruebas (solo tipos) |
| Crear | `core/correo/plantillas.ts` | `escaparHtml(texto): string`; `plantillaCorreoDeCuenta({ tipo, nombre, enlace, urlRecuperar }): { asunto; html; texto }` (DEC-14) |
| Crear | `core/correo/fallos.ts` | `clasificarFalloDeCorreo({ estado: number \| null }): "permanente" \| "transitorio"` (`400`, `422` → permanente; cualquier otro, incluidos `403` y `null`, → transitorio) |
| Crear | `core/eventos/correo-de-cuenta.ts` | `COLA_CORREO_DE_CUENTA = "CORREO_DE_CUENTA"`, `COLA_CORREO_DE_CUENTA_FALLIDO = "CORREO_DE_CUENTA_FALLIDO"`; `datosCorreoDeCuentaSchema = z.discriminatedUnion("tipo", [z.object({ tipo: z.literal("recuperacion"), correo: z.string().min(3).max(254) }), z.object({ tipo: z.literal("invitacion") })])`; `type DatosCorreoDeCuenta`. El id del trabajo es el id del token (DEC-06) |

### backend/config/ (AUTH-02a)
| Acción | Archivo | Contenido |
|---|---|---|
| Crear | `config/correo.ts` (+ `correo.test.ts`) | DEC-12: `validarEnvCorreo(fuente, nodeEnv)`, `cargarEnvCorreo(nodeEnv)`, `opcionesDeCorreo(nodeEnv, envCorreo): OpcionesCorreo` (`{ canal, remitente, responderA?, apiKey?, urlPublicaFrontend, directorioRegistro }`), `REMITENTE_DE_DESARROLLO`, `DOMINIO_REMITENTE_DE_EJEMPLO` (N-05), `URL_FRONTEND_DE_DESARROLLO`, `DIRECTORIO_CORREOS` |
| Crear | `config/cola.ts` | `opcionesDeCola(env, rol: "api" \| "worker")` → `{ connectionString: env.DATABASE_URL, rol, maxConexiones: rol === "api" ? 3 : 4 }` |
| Modificar | `config/env.ts` | Solo exportar `salirPorConfiguracionInvalida` (la usa `cargarEnvCorreo`). El esquema de la API **no cambia** |
| Modificar | `config/logger.ts` | `redact.paths` añade `req.body.contrasenaActual`, `req.body.contrasenaNueva`, `req.body.token`, `contrasenaTemporal`, `token`, `enlace`, `*.contrasenaTemporal`, `*.token`, `*.enlace` **[verificar sintaxis de rutas de pino]** |
| Modificar | `eslint.config.mjs` (raíz) | `"no-console": "off"` no cambia. **Dos bloques nuevos**, detallados debajo de esta tabla, entre el último bloque de backend (`backend/src/core/**`) y el primero de frontend |

**Bloque 1: `notifier` fuera de `handlers/` y `middleware/`.** Tiene `files: ["backend/src/handlers/**", "backend/src/middleware/**"]` y la regla `no-restricted-imports` con:
- `paths: soloEnAdapters`;
- `patterns: [clienteGenerado, { regex: "adapters/notifier", message: "Los handlers y el middleware no envían avisos ni correos: encolan el evento y el worker usa adapters/notifier (AGENTS.md, reglas 5 y 12)." }]`.

En flat config, el último bloque que coincide sustituye la regla entera. Por eso este bloque repite las dos primeras entradas del bloque general.

**Bloque 2 (N-01): `executeSql` solo se invoca dentro de `adapters/`.**
```js
{
  basePath: raiz,
  files: ["backend/src/**/*.{ts,mts,cts,js,mjs,cjs}"],
  ignores: ["backend/src/adapters/**"],
  rules: {
    "no-restricted-syntax": [
      "error",
      { selector: "MemberExpression[property.name='executeSql']", message: sqlSoloEnAdapters },
      { selector: "MemberExpression[property.value='executeSql']", message: sqlSoloEnAdapters },
    ],
  },
},
```
- `sqlSoloEnAdapters` es una constante del archivo: `"executeSql solo se invoca dentro de backend/src/adapters/: handlers/ y workers/ reciben la capacidad en alGuardar(sql) y solo la pasan a encolar (AGENTS.md, reglas 1 y 4)."`.
- El segundo selector cubre el acceso con corchetes (`sql["executeSql"]`). La desestructuración (`const { executeSql } = sql`) la detecta la búsqueda de texto de V-13.
- **No sustituye ninguna regla existente:** hoy ningún bloque de `eslint.config.mjs` ni de los que extiende (`js.configs.recommended`, `tseslint.configs.recommended`, `eslint-config-prettier`) configura `no-restricted-syntax`. El Programador lo confirma en V-14 con `npx eslint --print-config` sobre un archivo de `handlers/`. Si en el futuro otro bloque configura `no-restricted-syntax` para estos archivos, deberá repetir estos selectores.
- **No alcanza a `backend/test/`, a propósito.** Las pruebas del Programador y los ataques del Tester necesitan invocar el ejecutor directamente, por ejemplo para comprobar la defensa del protocolo extendido. La regla 4 y la búsqueda de V-13 se refieren al código de producción.

### backend/adapters/ (AUTH-02a)
**Regla de `adapters/db` (N-04): dentro de un callback de `enTransaccion`, ningún error de Prisma se atrapa para seguir.**
- Un `P2002` se traduce con `traducirErrorPrisma` y se **relanza**, y Prisma revierte (como `crearUsuario` y `corregirCorreo`); o se evita con la sentencia (`skipDuplicates`).
- Un registro inexistente se detecta con `updateMany` y su `count` (0 → `null` sin más escrituras), o atrapando `P2025` **fuera** de `enTransaccion`; nunca dentro.

**Regla de `adapters/db`: protocolo de bloqueo por usuario (Enmienda 2).** Cierra T-07, T-08 y T-09 de la ronda 2.
- **PB-1. Alcance.** Toda transacción que, sobre un usuario que **ya existe**: (a) inserte una sesión; (b) rote una sesión; (c) revoque sesiones en bloque (todas, o todas salvo una); (d) cambie `hash_contrasena` o `debe_cambiar_contrasena`; (e) escriba en `tokens_cuenta`.
- **PB-2. Primero el usuario.** La primera sentencia bloquea la fila de `usuarios` de ese usuario, antes de leer para decidir y antes de escribir en `sesiones` o `tokens_cuenta`. Se usa una de estas dos funciones:
  - `bloquearUsuarioParaSesion(tx, usuarioId)` → `FOR SHARE`. Solo en (a) y (b): crear o rotar una sesión propia.
  - `bloquearUsuarioParaEscribir(tx, usuarioId)` → `FOR NO KEY UPDATE`. En (c), (d) y (e).
  - **Única excepción: `corregirCorreo`.** Su primera sentencia, `UPDATE usuarios SET email`, ya toma `FOR UPDATE`: lo impone PostgreSQL porque `email` tiene un índice único. Cumple PB-2 con un modo más fuerte y no llama a ninguna de las dos funciones, porque eso sería una subida de modo (PB-3).
- **PB-3. Sin subidas de modo.** Después, la transacción no pide sobre esa fila un modo más fuerte que el primero.
  - El `UPDATE usuarios` de columnas que no son clave toma `FOR NO KEY UPDATE`, el mismo modo que el bloqueo de escritura.
  - El `FOR KEY SHARE` de la FK, al insertar una sesión o un token, es más débil que los dos. Lo cubre el bloqueo propio y no espera.
- **PB-4. Decidir después del bloqueo.** Toda lectura que decide (hash vigente, cuenta activa, token vivo, sesión viva) y toda revocación en bloque van en sentencias **posteriores** al bloqueo, dentro de la misma transacción.
- **PB-5. READ COMMITTED.** Es el aislamiento predeterminado de PostgreSQL y de Prisma, y no se cambia en estas transacciones. El protocolo depende de que cada sentencia tome su instantánea al empezar: en REPEATABLE READ la instantánea sería la de la primera sentencia y aparecerían errores de serialización en lugar de ver la sesión nueva.
- **PB-6. Nada lento dentro.** argon2 y cualquier I/O van antes de abrir la transacción, como ya se hace.
- **PB-7. Quedan fuera del protocolo:**
  - Las sentencias únicas que revocan **una** sesión por id o por hash (`revocarSesion`, `revocarSesionPorHash`). Retienen una sola fila y nunca esperan teniendo otra, así que no pueden cerrar un ciclo; y no revocan en bloque, así que no tienen la ventana de T-08.
  - Las transacciones que crean al usuario en ellas mismas (`crearUsuarioConSesion`, `crearMaestroInvitado`): nadie más ve esa fila hasta el `COMMIT`.
  - Las lecturas sin bloqueo (`buscar*`, `contar*`).
- **PB-8. Encargos futuros.** Todo encargo que revoque sesiones o cambie credenciales (baja, restricción que cierre sesiones, cambio voluntario) cumple de PB-1 a PB-6. Las dos funciones no salen de `adapters/db`: no se reexportan en `index.ts`.

**Modos de bloqueo de fila de PostgreSQL:**

| Modo | Choca con | Uso aquí | Por qué |
|---|---|---|---|
| `FOR KEY SHARE` | `FOR UPDATE` | Ninguno explícito; lo toma la FK al insertar | No choca con `FOR NO KEY UPDATE`: es justo lo que dejaba pasar la sesión de T-08. Se descarta para las sesiones |
| `FOR SHARE` | `FOR NO KEY UPDATE`, `FOR UPDATE` | Crear o rotar una sesión | Es el modo mínimo que queda en serie con cualquier escritura de credenciales. Es compatible consigo mismo y con `FOR KEY SHARE`, así que los logins y refrescos del mismo usuario no se esperan entre sí |
| `FOR NO KEY UPDATE` | `FOR SHARE`, `FOR NO KEY UPDATE`, `FOR UPDATE` | Escritores (PB-1 c, d, e) | Es el modo mínimo que queda en serie con las sesiones (T-08) y con los demás escritores (T-01). Es el que toma su propio `UPDATE usuarios`, así que no hay subida. No choca con el `FOR KEY SHARE` que piden las inserciones de otras tablas con FK al usuario (inscripciones, entregas o notificaciones futuras) |
| `FOR UPDATE` | Todos | Solo `corregirCorreo`, porque lo impone PostgreSQL | Se descarta como modo general. Choca con `FOR KEY SHARE`, que es el origen de T-07 frente a cualquier transacción que inserte una fila hija después de bloquear otra, y bloquearía inserciones ajenas. La ronda 2 lo usó en `usarTokenYCambiarContrasena` y `prepararTokenDeRecuperacion`; la Enmienda 2 lo baja a `FOR NO KEY UPDATE` |

**Por qué no hay deadlock en ninguna combinación (cierra T-07):**
1. Toda transacción del protocolo pide la fila del usuario antes que cualquier otra fila de ese usuario, y la retiene hasta el final. Mientras espera la fila del usuario, no retiene nada más de ese usuario.
2. Dos transacciones del protocolo solo pueden tener a la vez la fila del usuario si las dos usan `FOR SHARE`, el único de los modos usados que es compatible consigo mismo. Esas dos son creaciones o rotaciones de sesión:
   - solo compiten por la sesión vieja de una rotación;
   - la que espera no retiene nada que la otra necesite, porque el `FOR KEY SHARE` del `INSERT` de la otra lo cubre su propio `FOR SHARE`.
3. Las sentencias que quedan fuera del protocolo retienen como máximo una fila y nunca esperan teniendo otra.
4. Sin espera circular no puede haber deadlock.

**Por qué se cierra la ventana de T-08.** Las creaciones y rotaciones retienen `FOR SHARE` desde antes de tocar la sesión hasta su `COMMIT`. Las revocaciones en bloque retienen `FOR NO KEY UPDATE` desde antes de su `UPDATE sesiones`. Los dos modos chocan, así que las transacciones quedan en serie:
- **Si la rotación va primero,** confirma S' antes de que la revocación obtenga el bloqueo. El `UPDATE sesiones … WHERE revocada_en IS NULL` empieza después, con una instantánea nueva, y ve S'.
- **Si la revocación va primero,** la rotación obtiene el bloqueo después del `COMMIT`. Su `updateMany` sobre S es una sentencia nueva: ve S revocada, `count = 0` y no inserta S'. El handler, sin cambios, responde `401`.

**Por qué se cierra T-09.** `crearSesion` lee `hash_contrasena` y `activo` con `SELECT … FOR SHARE` dentro de su transacción, y compara el hash con el que el handler verificó con argon2. En READ COMMITTED, una lectura con bloqueo que tuvo que esperar devuelve la última versión confirmada de la fila.
- **Si un escritor cambió la contraseña antes,** el hash difiere y la sesión no nace. argon2id lleva una sal aleatoria: cualquier cambio produce otro hash, incluso si la contraseña nueva es igual a la anterior.
- **Si el login va primero,** su sesión ya existe cuando el escritor revoca, así que el escritor la revoca.

**`reset:admin` (Q-E2-3):**
- T-08 se cierra por el `FOR SHARE` de `rotarSesion`, y T-09 por el cambio del login.
- La llamada explícita a `bloquearUsuarioParaEscribir` en `actualizarContrasenaYRevocarSesiones` es por uniformidad y para poder auditarlo.
- `scripts/reset-admin.ts` no cambia.

**Combinaciones:**

| # | Combinación | Antes | Con el protocolo | Prueba |
|---|---|---|---|---|
| 1 | `restablecer` o `establecer-contrasena` × `refrescar` (T-07) | Deadlock y `500` | En serie: `{204, 401}`, o `{204, 200}` con S' revocada | `cuentas-r2` (Tester); A1 |
| 2 | Restablecimiento del admin × `refrescar` (T-08) | S' queda viva | En serie; 0 sesiones vivas | `cuentas-r2` |
| 3 | `cambiar-contrasena` × `refrescar` de otra sesión (T-08) | S' queda viva | Ídem | `cuentas-r2` |
| 4 | `restablecer` × `refrescar` con la sesión retenida | Lo cerraba el `FOR UPDATE`; al bajarlo, lo cierra el `FOR SHARE` de `rotarSesion` | En serie | B1 |
| 5 | `reset:admin` × `refrescar` | S' queda viva (lectura del código, no probado) | En serie | B2 |
| 6 | Reutilización (`revocarTodasLasSesiones`) × rotación de otra sesión del mismo usuario | S' queda viva (mismo patrón, no reportado) | En serie | B3 |
| 7 | Login con la contraseña vieja × `restablecer` (T-09) | Sesión viva | `401`; 0 sesiones vivas | `cuentas-r2` |
| 8 | Login con la contraseña vieja × admin, `cambiar-contrasena` o `reset:admin` (T-09) | Sesión viva | `401`; 0 sesiones vivas | C1, C2, C3 |
| 9 | Login que termina antes del cambio | — | `200` y después la sesión queda revocada | C4 |
| 10 | `cambiar-contrasena` verificada con una temporal × el admin genera otra temporal | Sobrescribe la temporal nueva con una contraseña verificada contra la vieja | `400 CONTRASENA_ACTUAL_INCORRECTA`; queda la temporal nueva | D1 |
| 11 | Escritores entre sí (T-01): dos enlaces; enlace × admin; enlace × `cambiar-contrasena`; worker × enlace; `cambiar-contrasena` × admin | Resuelto en la ronda 2 | Siguen en serie (`FOR NO KEY UPDATE` choca consigo mismo) | `cuentas-r1` (Tester); las 2 de `restablecer.integracion`; A2, A3 |
| 12 | Dos rotaciones de la misma sesión (DEC-04 de AUTH-01) | Gana una; la otra es reutilización | Igual, sin ciclo (punto 2) | `sesiones-y-cadena.ataque` |
| 13 | `logout` o `revocarSesion` × cualquiera | — | Fuera del protocolo (PB-7) | Suites existentes |
| 14 | `corregirCorreo` × cualquiera | En serie | En serie (`FOR UPDATE`) | `admin-correo.integracion` |

| Acción | Archivo | Contenido |
|---|---|---|
| Modificar | `adapters/auth/estado.ts` | `EstadoAuth` añade `claveTokensCuenta: Uint8Array` |
| Modificar | `adapters/auth/index.ts` | `inicializarAuth` calcula la clave (DEC-03); reexporta lo nuevo |
| Modificar | `adapters/auth/contrasenas.ts` | `hashDeContrasenaInutilizable(): Promise<string>` (DEC-02) |
| Crear | `adapters/auth/tokens-cuenta.ts` | `derivarTokenDeCuenta(id): { token; hash }`, `hashTokenDeCuenta(token): string` (DEC-03) |
| Crear | `adapters/auth/contrasena-temporal.ts` | `generarContrasenaTemporal(): string` = `formatearContrasenaTemporal(randomBytes(BYTES_PARA_CONTRASENA_TEMPORAL))` |
| Modificar | `adapters/db/cliente.ts` | `EjecutorSql`, `ejecutorSqlDe(tx)` (DEC-07): único `$queryRawUnsafe` de `backend/src` |
| Crear | `adapters/db/bloqueo-usuario.ts` | Enmienda 2: `bloquearUsuarioParaEscribir` y `bloquearUsuarioParaSesion` (código debajo de esta tabla). No se reexportan en `index.ts` |
| Crear | `adapters/db/tokens-cuenta.ts` | Comprobación en compilación de que `TipoTokenCuenta` de `core/` y el enum generado coinciden en ambos sentidos, como `rolesCoinciden` en `usuarios.ts` (se comparte o se define `Iguales` dentro de `adapters/db`, sin reexportarlo en `index.ts`). `buscarTokenPorHash(hash)` → `{ id, usuarioId, tipo, expiraEn, usadoEn, revocadoEn, usuario: { activo } } \| null`; `buscarTokenParaEnvio(id)` → ídem con `usuario: { email, nombre, activo }`; `usarTokenYCambiarContrasena({ tokenId, usuarioId, hashContrasena, ahora }): Promise<boolean>` (DEC-08); `prepararTokenDeRecuperacion({ id, usuarioId, hashToken, expiraEn, ahora }): Promise<void>` (N-04, detalle debajo de la tabla); `contarRecuperacionesRecientes(usuarioId, desde): Promise<number>`. Todas con `ejecutor?: Ejecutor` al final. **Enmienda 2:** `usarTokenYCambiarContrasena` y `prepararTokenDeRecuperacion` empiezan con `bloquearUsuarioParaEscribir`; no queda ninguna función de bloqueo privada |
| Modificar | `adapters/db/usuarios.ts` | `crearMaestroInvitado({ usuario, token }, alGuardar)` → `UsuarioAdmin` (transacción: `crearUsuario` con su traducción de `P2002`, `tokenCuenta.create` tipo `invitacion`, `await alGuardar(ejecutorSqlDe(tx))`); `buscarCuentaPorEmail(email)` y `buscarCuentaPorId(id)` → `{ id, nombre, email, rol, activo } \| null`; `buscarCredencialesPorId(id)` → `{ id, hashContrasena, activo } \| null`; `restablecerConTemporal({ id, hashContrasena, ahora })` → cuenta `\| null`; `corregirCorreo({ id, email, ahora })` → cuenta `\| null` (traduce y relanza `P2002` como `409 CORREO_EN_USO`); `cambiarContrasenaPropia({ usuarioId, hashContrasena, hashVerificado, conservarSesionId, ahora }): Promise<boolean>` (Enmienda 2). Tokens vivos y sesiones se revocan siempre por `usuario_id` (`updateMany where usuarioId AND … IS NULL`). Un id inexistente → `null`, según la regla de arriba. **Enmienda 2:** `restablecerConTemporal`, `cambiarContrasenaPropia` y `actualizarContrasenaYRevocarSesiones` (de AUTH-01, para `reset:admin`) empiezan con `bloquearUsuarioParaEscribir`; `corregirCorreo`, `crearUsuarioConSesion` y `crearMaestroInvitado` no (PB-2, PB-7) |
| Modificar | `adapters/db/sesiones.ts` (AUTH-01) | Enmienda 2: `crearSesion`, `rotarSesion` y `revocarTodasLasSesiones` (código debajo de esta tabla). `buscarSesionPorHash`, `revocarSesion` y `revocarSesionPorHash` no cambian (PB-7) |
| Modificar | `adapters/db/errores.ts` | Solo si hace falta reconocer `P2025` para lo anterior, sin tocar la traducción existente. Con `updateMany` + `count` no hace falta |
| Modificar | `adapters/db/index.ts` | Reexporta lo nuevo (sin `obtenerDb` ni las funciones de `bloqueo-usuario.ts`) |
| Crear | `adapters/queue/colas.ts` | `RETENCION_COLAS_DE_CORREO_S = 86_400`; `OPCIONES_DE_COLAS`: `CORREO_DE_CUENTA_FALLIDO` primero (sin reintentos ni `deadLetter`; `retentionSeconds` y `deleteAfterSeconds` = retención), luego `CORREO_DE_CUENTA` con DEC-06 y la misma retención |
| Crear | `adapters/queue/index.ts` | Único importador de `pg-boss`. Funciones y comportamiento en la lista de debajo de esta tabla |
| Crear | `adapters/notifier/index.ts` | `crearNotifier(opciones: OpcionesCorreo, { log, nodeEnv, clienteResend? }): Notifier` (DEC-13; lanza con `resend` fuera de `production`) |
| Crear | `adapters/notifier/resend.ts` | Único importador de `resend`. `interface ClienteResend` mínima (la forma de `emails.send`) para inyectar el doble; `crearCanalResend({ apiKey, remitente, responderA, cliente?, log })`: lanza con una llave vacía o en blanco antes de todo (DEC-13) |
| Crear | `adapters/notifier/registro.ts` | `crearCanalRegistro({ directorio, remitente, log, reloj? })` |
| Modificar | `adapters/README.md` | Contenido en la lista de debajo de esta tabla |

**`prepararTokenDeRecuperacion` (N-04).**
- Es idempotente por id: `enTransaccion` con dos sentencias y **ningún** `try/catch` dentro.
- (1) `tokenCuenta.updateMany({ where: { usuarioId, tipo: "recuperacion", id: { not: id }, usadoEn: null, revocadoEn: null, expiraEn: { gt: ahora } }, data: { revocadoEn: ahora } })`.
- (2) `tokenCuenta.createMany({ data: [{ id, usuarioId, tipo: "recuperacion", hashToken, expiraEn }], skipDuplicates: true })`. Genera `ON CONFLICT DO NOTHING`: si otro intento del mismo trabajo ya insertó la fila, no inserta ni aborta. Un conflicto sobre `hash_token` es el mismo caso, porque el hash se deriva del id.
- Enmienda 2: antes de (1) va `bloquearUsuarioParaEscribir(tx, usuarioId)` (DEC-08, paso 0).

**Protocolo de bloqueo en código (Enmienda 2).**

`adapters/db/bloqueo-usuario.ts`:
```ts
import type { Prisma } from "./generated/client.js"

// Protocolo de bloqueo por usuario (AUTH-02, Enmienda 2; reglas completas en adapters/README.md).
// Toda transacción que cree, rote o revoque sesiones, cambie la contraseña o escriba tokens_cuenta
// de un usuario existente bloquea primero su fila de usuarios con una de estas dos funciones.
export interface UsuarioBloqueado {
  hashContrasena: string
  activo: boolean
}

// Escritores: FOR NO KEY UPDATE.
export const bloquearUsuarioParaEscribir = async (
  tx: Prisma.TransactionClient,
  usuarioId: string,
): Promise<UsuarioBloqueado | null> => {
  const [fila] = await tx.$queryRaw<UsuarioBloqueado[]>`
    SELECT hash_contrasena AS "hashContrasena", activo
    FROM usuarios WHERE id = ${usuarioId}::uuid
    FOR NO KEY UPDATE`
  return fila ?? null
}

// Crear o rotar una sesión propia: FOR SHARE.
export const bloquearUsuarioParaSesion = async (
  tx: Prisma.TransactionClient,
  usuarioId: string,
): Promise<UsuarioBloqueado | null> => {
  const [fila] = await tx.$queryRaw<UsuarioBloqueado[]>`
    SELECT hash_contrasena AS "hashContrasena", activo
    FROM usuarios WHERE id = ${usuarioId}::uuid
    FOR SHARE`
  return fila ?? null
}
```
- Son `$queryRaw` etiquetados, con `${usuarioId}::uuid` como parámetro. No hay ningún `$queryRawUnsafe` nuevo: V-13 sigue contando 1.
- El parámetro es `Prisma.TransactionClient`, no `Ejecutor`: fuera de una transacción, el bloqueo se soltaría al terminar la sentencia.
- El hash solo circula dentro de `adapters/db` y nunca se registra en logs.

`adapters/db/tokens-cuenta.ts`:
- Se borra la función privada `bloquearUsuario`.
- La primera sentencia de `usarTokenYCambiarContrasena` y de `prepararTokenDeRecuperacion` es `await bloquearUsuarioParaEscribir(tx, usuarioId)`.
- Los comentarios dicen "bloqueo de escritura del protocolo" y no "FOR UPDATE". Firmas y resto del código, sin cambios.

`adapters/db/usuarios.ts`:
- `restablecerConTemporal`: la primera sentencia es `const usuario = await bloquearUsuarioParaEscribir(tx, id)`, seguida de `if (usuario === null) return null`. El resto sigue igual, incluido el `updateMany` y su `count`.
- `cambiarContrasenaPropia`:
  ```ts
  export const cambiarContrasenaPropia = (
    {
      usuarioId,
      hashContrasena,
      hashVerificado,
      conservarSesionId,
      ahora,
    }: {
      usuarioId: string
      hashContrasena: string
      hashVerificado: string
      conservarSesionId: string | null
      ahora: Date
    },
    ejecutor: Ejecutor = obtenerDb(),
  ): Promise<boolean>
  ```
  La primera sentencia es `const usuario = await bloquearUsuarioParaEscribir(tx, usuarioId)`. Con `if (usuario === null || usuario.hashContrasena !== hashVerificado) return false` devuelve `false` sin escribir nada. Después sigue lo de hoy, sin cambios, y al final `return true`.
- `actualizarContrasenaYRevocarSesiones`: la primera sentencia es `await bloquearUsuarioParaEscribir(tx, id)`. La firma y el resto no cambian; si el id no existe, el `update` sigue lanzando como en AUTH-01.

`adapters/db/sesiones.ts` (AUTH-01):
```ts
export interface DatosDeSesionConCredencial extends DatosDeSesion {
  // Hash que el handler verificó con argon2: la sesión solo nace si sigue siendo el vigente (T-09).
  hashVerificado: string
}

// Protocolo de bloqueo: FOR SHARE sobre el usuario y decisión bajo el bloqueo. null si la cuenta
// no existe, está inactiva o su contraseña cambió después de la verificación.
export const crearSesion = (
  { hashVerificado, ...datos }: DatosDeSesionConCredencial,
  ejecutor: Ejecutor = obtenerDb(),
): Promise<{ id: string } | null> =>
  enTransaccion(ejecutor, async (tx) => {
    const usuario = await bloquearUsuarioParaSesion(tx, datos.usuarioId)
    if (usuario === null || !usuario.activo) return null
    if (usuario.hashContrasena !== hashVerificado) return null
    return tx.sesion.create({ data: datos, select: { id: true } })
  })
```
- La comparación no necesita tiempo constante: ninguno de los dos valores viene del cliente.
- `rotarSesion`: la firma no cambia. Su primera sentencia es `await bloquearUsuarioParaSesion(tx, nueva.usuarioId)` y el resultado no se usa; el resto sigue igual. El comentario añade "(0) bloqueo de sesión del protocolo".
- `revocarTodasLasSesiones`: la firma y el retorno no cambian. Pasa a `enTransaccion(ejecutor, async (tx) => { await bloquearUsuarioParaEscribir(tx, usuarioId); const { count } = await tx.sesion.updateMany(<mismo where y data>); return count })`.
- `adapters/db/index.ts` no cambia por esto: ya exporta `crearSesion`, y ningún otro archivo necesita el tipo nuevo.

**Funciones de `adapters/queue/index.ts`:**
- `iniciarCola({ connectionString, rol, maxConexiones, sondeoSegundos?, log })`: idempotente; llama a `start`, asegura las colas de `OPCIONES_DE_COLAS` y registra `on("error")` → `log.error({ err })`.
- `encolar(nombre, datos, { id, sql? })`.
- `asegurarCola(nombre, opciones)`: la usan las pruebas del consumidor.
- `describirCola(nombre)` → `{ retryLimit, retryDelay, retryBackoff, expireInSeconds, deadLetter, retentionSeconds, deleteAfterSeconds } \| null`, sobre `getQueue`. La usa `cola.integracion` para comprobar la política.
- `trabajar(nombre, manejador, { sondeoSegundos? })`, con `batchSize: 1` y manejador `({ id, datos }) => Promise<void>`.
- `dejarDeTrabajar(nombre)`.
- `buscarTrabajo(nombre, id)` → `{ estado, datos } \| null`.
- `detenerCola()`: idempotente; `stop` ordenado con un máximo de 30 s y cierre del pool.
- Cualquier uso antes de iniciar lanza `COLA_NO_INICIALIZADA` (500).

**Contenido de `adapters/README.md`:**
- `queue` y `notifier`: qué hacen, quién los usa y que nadie más importa `pg-boss` ni `resend`.
- `ejecutorSqlDe`: es el único SQL no literal, equivale a `fromPrisma` de pg-boss, y `executeSql` no se invoca fuera de `adapters/`.
- **`createQueue` no actualiza la política de una cola que ya existe:** cambiar los reintentos o la retención de una cola ya creada en una base exige `updateQueue` en un encargo que lo planee.
- **Sección `notifier`:** la librería `resend` lee `RESEND_BASE_URL` del entorno (`index.mjs:1253`) y, si la llave llega vacía, `RESEND_API_KEY` (`index.mjs:1278-1280`). Por eso `resend.ts` exige una llave no vacía, y `RESEND_BASE_URL` no se define en ningún entorno: cambiaría el destino de las peticiones que llevan la llave.
- **Sección "Protocolo de bloqueo por usuario (AUTH-02, Enmienda 2)":** PB-1 a PB-8 y la tabla de modos.

### backend/handlers/ (AUTH-02a)
| Acción | Archivo | Rutas y cadena |
|---|---|---|
| Crear | `handlers/auth/cuentas.ts` | Plugin `cuentasHandler` (prefijo `/api/auth`, recibe `env`): `POST /recuperar` (pública), `POST /restablecer` (pública), `POST /establecer-contrasena` (pública), `POST /cambiar-contrasena` con `protegido({ permitirCambioPendiente: true, permitirRestringido: true })`. Dos `Map` en su ámbito: solicitudes de recuperación y fallos de cambio. Importa `NOMBRE_COOKIE_REFRESCO` de `./cookie.js`. **Enmienda 2:** `contrasenaActualIncorrecta()` en el ámbito del módulo y `hashVerificado` en `cambiar-contrasena` (DEC-09, pasos 5 y 8) |
| Crear | `handlers/admin.ts` | Plugin `adminHandler` (prefijo `/api/admin`): las cuatro rutas con `protegido({ roles: ["admin"] })` |
| Modificar | `handlers/auth/index.ts` (AUTH-01) | **Solo el bloque de `POST /login`** (Enmienda 2; código debajo de esta tabla) |
| Modificar | `handlers/validacion.ts` | `validarParametros(schema, params)`: igual que `validarCuerpo` (400 `VALIDACION`, "<campo>: <mensaje>", sin el valor) |
| Modificar | `handlers/README.md` | Plugins nuevos; que ningún handler llama a `notifier`; y que `alGuardar(sql)` solo pasa `sql` a `encolar`, sin invocar `executeSql` |
| Modificar | `app.ts` | `await iniciarCola({ ...opcionesDeCola(env, "api"), log: app.log })` **justo después de `Fastify(...)`** y antes de `app.register(manejoDeErrores)` (DEC-16, N-06); `register(cuentasHandler, { prefix: "/api/auth", env })` y `register(adminHandler, { prefix: "/api/admin" })` **después** de `registrarMiddleware`; `onClose`: `detenerCola()` y luego `cerrarConexion()` |
| **No se toca** | El resto de `handlers/auth/index.ts` (`registro`, `refrescar`, `logout`), `handlers/auth/cookie.ts`, `handlers/usuarios.ts`, `handlers/salud.ts`, `handlers/errores.ts`, `server.ts` | — |

Sin `try/catch` en handlers. Las respuestas pasan por `<schema>.parse(...)` de `shared/` antes de `send` (como en AUTH-01), así que ningún campo extra se filtra.

**`POST /login` (Enmienda 2).** Desde `intentos.delete(llave)` hasta antes de `return responderConSesion(...)`, el bloque queda así:
```ts
    intentos.delete(llave)
    const tokenRefresco = generarTokenRefresco()
    const creada = await crearSesion({
      usuarioId: credenciales.id,
      hashVerificado: credenciales.hashContrasena,
      hashToken: hashTokenRefresco(tokenRefresco),
      expiraEn: calcularExpiracionSesion(ahora),
      ip: request.ip,
      agente: agenteDe(request),
    })
    // null: la contraseña cambió o la cuenta se desactivó entre la verificación y este punto (T-09).
    // Se responde igual que una contraseña incorrecta.
    if (!creada) throw credencialesInvalidas()
```
- `intentos.delete(llave)` se queda **antes** de `crearSesion` (Q-E2-4).
- El nombre `crearSesion` se conserva, porque el doble de `intentos-r2.ataque` lo sustituye por nombre.
- `registro`, `refrescar` y `logout` no se tocan. `refrescar` recibe la corrección por dentro de `rotarSesion` y `revocarTodasLasSesiones`.

### backend/middleware/ (AUTH-02a)
| Acción | Archivo | Contenido |
|---|---|---|
| Modificar | `middleware/rutas-publicas.ts` | Añade `"POST /api/auth/recuperar"`, `"POST /api/auth/restablecer"`, `"POST /api/auth/establecer-contrasena"` y ajusta el comentario (la credencial de `restablecer` y `establecer-contrasena` es el token del enlace). `cambiar-contrasena` **no** es pública |
| Modificar | `middleware/README.md` | Lista pública actualizada; `cambiar-contrasena` como única ruta con `permitirCambioPendiente` y por qué lleva `permitirRestringido` (C-01); y que **un restringido sin la bandera recibe `409 CAMBIO_NO_REQUERIDO`, no `403 ACCESO_RESTRINGIDO`** (la ruta admite restringidos y el handler evalúa la bandera primero; no abre nada) |

`with-password-gate.ts` y el resto de la cadena **no cambian**: la puerta ya funciona; lo nuevo es la ruta que la deja pasar.

### backend/workers/ (AUTH-02a)
| Acción | Archivo | Contenido |
|---|---|---|
| Crear | `workers/correo-de-cuenta.ts` | `procesarCorreoDeCuenta` (DEC-15) |
| Crear | `workers/index.ts` | `registrarConsumidores(deps, colas?)` (DEC-15) |
| Modificar | `workers/README.md` | Consumidores, reintentos, retención de 1 día, cola de fallidos, canal `registro` |
| Modificar | `src/worker.ts` | DEC-15 |

### backend/prisma/ (AUTH-02a)
`schema.prisma` (DEC-01) y la migración `<timestamp>_tokens_cuenta`, generada por el CLI sin SQL manual. Compatible hacia atrás (solo `CREATE`).

### infra/ y .env.example (AUTH-02a)
`infra/` no cambia: pg-boss usa el PostgreSQL existente, y el servicio de la API con `depends_on` es de DEPLOY (N-03). `backend/.env.example` (**Modificar**) recibe, al final:
```
# Correo: solo lo lee el worker (la API no lo necesita). Fuera de NODE_ENV=production el worker NUNCA
# llama a Resend, aunque pongas una llave: escribe cada correo como HTML en backend/tmp/correos/
# (canal "registro"), para que abras el archivo y sigas el enlace. En production son obligatorias
# RESEND_API_KEY, CORREO_REMITENTE (con un dominio propio verificado: el de este ejemplo se rechaza)
# y URL_PUBLICA_FRONTEND (con https://); se definen solo en el .env del servidor. Vacías aquí toman
# los valores de desarrollo.
RESEND_API_KEY=
CORREO_REMITENTE=CMEP Campus Digital <notificaciones@campus.local>
# Opcional: dirección a la que llegan las respuestas a los correos.
CORREO_RESPONDER_A=
# Base de los enlaces de recuperación e invitación. En desarrollo, la SPA de Vite.
URL_PUBLICA_FRONTEND=http://127.0.0.1:5173
```
`frontend/.env.example` no cambia.

### Raíz y archivos transversales
| Acción | Archivo | Parte | Contenido |
|---|---|---|---|
| Modificar | `backend/package.json` | 02a | `pg-boss` y `resend` en `dependencies` |
| Modificar | `package-lock.json` | 02a | Lo regenera `npm install`; no se edita a mano |
| Modificar | `backend/.env.example` | 02a | Bloque de correo (sección anterior) |
| Modificar | `eslint.config.mjs` | 02a | Los dos bloques de la tabla `backend/config/` |
| Modificar | `README.md` | 02a: "Backend en local" §3, §4, §6, §7, §8 y §9 · 02b: "Frontend en local" §3 | Textos en "README.md (lo escribe el Programador)" |

### backend/test/ (del Programador, AUTH-02a)
| Acción | Archivo | Contenido |
|---|---|---|
| Crear | `test/preparar-cola.ts` | Proceso que `global-setup.ts` lanza una vez: `cargarEnv()` → **`validarUrlDePruebas(env.DATABASE_URL)`; si hay motivo, lanza sin la URL (N-06)** → `iniciarCola({ ...opcionesDeCola(env, "worker"), log: pino({ level: "silent" }) })` → `detenerCola()` |
| Modificar | `test/global-setup.ts` | Tras `seed:admin`: `ejecutarConNode(["--import", "tsx", "test/preparar-cola.ts"], envDeLosPasos, "preparar la cola")` |
| Crear | `test/notifier-en-memoria.ts` | Doble de `Notifier`: `enviados: CorreoDeCuenta[]`; `fallarProximo(error)` (transitorio: lanza) y `rechazarProximo(motivo)` (permanente) |
| Crear | `test/ayudas-cuentas.ts` | Ayudas de la lista de debajo de esta tabla |
| Crear | `test/ayudas-concurrencia.ts` | Enmienda 2: `conFilaRetenida` ("Pruebas requeridas > AUTH-02a, ronda 3") |
| Crear | pruebas | Tabla de "Pruebas requeridas" |
| **No se toca** | `test/setup.ts`, `test/entorno-de-pruebas.ts`, `test/ayudas-auth.ts` (se reutiliza tal cual), las `*.integracion` existentes (incluida `salud-sin-base`, DEC-16), todas las `*.ataque` | — |

**Ayudas de `test/ayudas-cuentas.ts`:**
- `crearTokenDePrueba({ usuarioId, tipo, expiraEn, usadoEn?, revocadoEn? })` → `{ id, token }`: usa `derivarTokenDeCuenta` e inserta con `obtenerDb()`.
- `leerTokens(usuarioId)`; `tokenDelEnlace(enlace)`; `crearAppConCola()`.
- `pedirComoAdmin(app, …)`: inicia sesión con el admin de la base desechable, con `ADMIN_EMAIL`/`ADMIN_PASSWORD` de `process.env`, que pone `setup.ts`.
- **`buscarTrabajosPorCorreo(correo)` (N-06 punto 1)** → `{ id, estado }[]`: hace `obtenerDb().$queryRaw` **etiquetado** sobre `pgboss.job`, filtrando por `name = ${COLA_CORREO_DE_CUENTA}` y `data->>'correo' = ${correo}` y ordenando por fecha de creación. Los nombres de columna (`name`, `data`, `state`, `created_on`) se confirman en V-05. Es **solo de pruebas**: no pasa por un índice propio y queda declarada como tal en un comentario. La usan `recuperar.integracion` y el caso de punta a punta de `restablecer.integracion` para conocer el id del trabajo, que el handler no devuelve.

### frontend/ (todo AUTH-02b)
| Acción | Archivo | Contenido |
|---|---|---|
| Modificar | `services/apiClient.ts` | DEC-17 |
| Modificar | `services/apiClient.test.ts` | +4 casos ("Pruebas requeridas") |
| Modificar | `services/navegacion.ts` | Comentario: también `403 CAMBIO_DE_CONTRASENA_REQUERIDO` |
| Crear | `app/require-cambio-de-contrasena.tsx` | DEC-17 |
| Modificar | `app/require-sesion.tsx`, `app/require-rol.tsx` | Error `CAMBIO…` → `<Navigate to="/cambiar-contrasena" replace />` (con `requiereCambioDeContrasena(error)` de `features/auth/lib`) |
| Modificar | `app/router.tsx` | `LayoutPublico` añade `/recuperar`, `/restablecer`, `/establecer-contrasena`; ruta `/cambiar-contrasena` con `RequireCambioDeContrasena` (fuera de `RequireSesion`) e índice `CambiarContrasenaView`; `/admin` índice = `CuentasView` (de `@/features/admin/cuentas-view`) |
| Modificar | `app/router.test.tsx` | +3 casos |
| Modificar | `features/auth/types.ts` | Reexporta `Recuperar`, `NuevaContrasenaConToken`, `CambiarContrasena` de `@campus/shared`; `CampoFormularioAuth` añade `"contrasenaActual" \| "contrasenaNueva" \| "confirmacion"`; `type AvisoDeLogin = "contrasena-actualizada" \| "cuenta-activada"`; `interface EstadoDeNavegacionLogin { aviso: AvisoDeLogin }`; `type TipoEnlace = "recuperacion" \| "invitacion"` |
| Modificar | `features/auth/data.ts` | `TEXTOS_RECUPERAR`, `TEXTOS_NUEVA_CONTRASENA` (por tipo de enlace), `TEXTOS_CAMBIAR`, `AVISOS_LOGIN`, `RUTA_CAMBIAR_CONTRASENA`; `MENSAJES_ERROR_AUTH` añade `ENLACE_INVALIDO`, `DEMASIADAS_SOLICITUDES`, `CONTRASENA_ACTUAL_INCORRECTA`, `CONTRASENA_REPETIDA`, `CAMBIO_DE_CONTRASENA_REQUERIDO`; `CAMPOS_FORMULARIO_AUTH` con los campos nuevos. Textos abajo |
| Modificar | `features/auth/lib.ts` | `leerTokenDelFragmento(hash): string \| null`; `requiereCambioDeContrasena(error: unknown): boolean`; `avisoDeLogin(estado: unknown): string \| null`; `contrasenasCoinciden(a, b): boolean` |
| Modificar | `features/auth/lib.test.ts` | +5 casos |
| Modificar | `features/auth/hooks.ts` | `useRecuperar`, `useNuevaContrasena(tipo)` (ruta por tipo; `onSuccess` → `/login` con `state: { aviso }`), `useCambiarContrasena` (DEC-17), `useTokenDelEnlace` (DEC-18) |
| Crear | `features/auth/components/tarjeta-de-cuenta.tsx` | Contenedor centrado de las pantallas de cuenta (título, descripción, contenido); solo lo usa `auth` |
| Crear | `features/auth/components/formulario-recuperar.tsx`, `formulario-nueva-contrasena.tsx` (props `tipo`, `token`), `formulario-cambiar-contrasena.tsx` | Formularios con `label htmlFor`, `aria-invalid`, `aria-describedby`, validación en cliente con los esquemas de `shared/` más la confirmación, botón deshabilitado con `isPending`, `MensajeError` |
| Crear | `features/auth/recuperar-view.tsx`, `restablecer-view.tsx`, `establecer-contrasena-view.tsx`, `cambiar-contrasena-view.tsx` y sus `.test.tsx` | Pantallas |
| Modificar | `features/auth/login-view.tsx` | Aviso de éxito (`role="status"`, icono `CircleCheck`, `text-success`) si `avisoDeLogin(location.state)` no es `null` |
| Modificar | `features/auth/login-view.test.tsx` | +1 caso |
| Crear | `features/admin/types.ts`, `data.ts`, `lib.ts`, `lib.test.ts`, `hooks.ts` | Tipos de `shared/` (`InvitarMaestro`, `UsuarioAdmin`, `ContrasenaTemporalRespuesta`, `CorregirCorreo`, `BuscarUsuario`); `TEXTOS_CUENTAS`, `MENSAJES_ERROR_ADMIN`; `mensajeDeErrorAdmin(error)`, `etiquetaDeRolAdmin(rol)`; `useInvitarMaestro`, `useBuscarCuenta`, `useRestablecerContrasena` (`gcTime: 0`), `useCorregirCorreo` |
| Crear | `features/admin/components/formulario-invitar-maestro.tsx`, `buscador-de-cuenta.tsx`, `ficha-de-cuenta.tsx`, `contrasena-temporal.tsx`, `formulario-corregir-correo.tsx` | DEC-19 |
| Crear | `features/admin/cuentas-view.tsx` y `cuentas-view.test.tsx` | DEC-19. Sin consultas al montar (solo mutaciones) |

**Textos de interfaz** (es-MX, tuteo; en el `data.ts` de cada módulo):
- `/recuperar`:
  - Título "Recupera tu contraseña"; descripción "Escribe el correo con el que entras a Campus Digital y te enviaremos un enlace para elegir una contraseña nueva."; campo "Correo"; botón principal "Enviar enlace".
  - Confirmación, siempre igual: "Si hay una cuenta con ese correo, te enviamos un enlace. Revisa tu bandeja de entrada y la carpeta de spam. El enlace vence en 30 minutos."
  - Nota "¿No te llega el correo? Acude a administración."; enlace "Volver a iniciar sesión".
  - `DEMASIADAS_SOLICITUDES` → "Ya pediste varios enlaces para este correo. Espera una hora e inténtalo de nuevo."
- `/restablecer`:
  - Título "Elige una contraseña nueva"; campos "Contraseña nueva" (ayuda "Mínimo 10 caracteres") y "Confirma la contraseña nueva"; botón "Guardar contraseña".
  - Sin token o con `ENLACE_INVALIDO`: "El enlace no es válido o ya venció. Pide uno nuevo." con el enlace "Pedir otro enlace" a `/recuperar`.
- `/establecer-contrasena`:
  - Título "Elige tu contraseña"; descripción "Con ella vas a entrar a Campus Digital con tu correo."; mismos campos; botón "Activar mi cuenta".
  - Enlace inválido: "El enlace no es válido o ya venció. Pide uno nuevo en ¿Olvidaste tu contraseña? o acude a administración."
- `/cambiar-contrasena`:
  - Título "Cambia tu contraseña"; descripción "Entraste con una contraseña temporal. Elige una propia para continuar."
  - Campos "Contraseña temporal", "Contraseña nueva" (ayuda "Mínimo 10 caracteres") y "Confirma la contraseña nueva".
  - Botón principal "Guardar y continuar"; secundario `outline` "Cerrar sesión".
- Confirmación distinta (solo en cliente): "Las contraseñas no coinciden."
- Avisos del login: `contrasena-actualizada` → "Tu contraseña se actualizó. Inicia sesión con la nueva."; `cuenta-activada` → "Tu contraseña quedó lista. Inicia sesión con tu correo."
- Mensajes: `ENLACE_INVALIDO` → "El enlace no es válido o ya venció. Pide uno nuevo."; `CONTRASENA_ACTUAL_INCORRECTA` → "La contraseña temporal no es correcta."; `CONTRASENA_REPETIDA` → "La contraseña nueva debe ser distinta de la temporal."; `CAMBIO_DE_CONTRASENA_REQUERIDO` → "Debes cambiar tu contraseña antes de continuar."
- Admin:
  - Título "Cuentas"; nota "Pantalla provisional: la gestión completa de usuarios llega después."
  - "Invitar a un maestro": campos "Nombre completo" y "Correo"; botón principal "Enviar invitación"; éxito "Invitación creada. {nombre} recibirá un correo para elegir su contraseña; el enlace vence en 72 horas."
  - "Buscar una cuenta por correo": campo "Correo exacto de la cuenta"; botón `outline` "Buscar"; `404` → "No hay ninguna cuenta con ese correo."
  - Ficha: "Cuenta inactiva" con icono y texto.
  - "Restablecer contraseña" (`destructive`) → confirmación en línea "Se cerrarán todas sus sesiones y tendrá que cambiar la contraseña al entrar." con "Sí, restablecer" (`destructive`) y "Cancelar" (`outline`).
  - "Contraseña temporal" + "Cópiala ahora y entrégasela en persona: no se volverá a mostrar." + "Copiar" (toast "Contraseña copiada" / "No pudimos copiarla. Cópiala a mano.").
  - "Corregir correo": campo "Correo correcto"; botón `outline` "Guardar correo"; éxito "Correo actualizado. Los enlaces enviados al correo anterior ya no funcionan."; nota "Si es un maestro que aún no eligió su contraseña, pídele que use ¿Olvidaste tu contraseña? con el correo corregido."
  - `CORREO_EN_USO` → "Ya existe una cuenta con ese correo."; `OPERACION_NO_PERMITIDA` → "La contraseña del administrador se restablece desde el servidor."
- La temporal se muestra con la fuente del texto, no monoespaciada: `CLAUDE.md` la reserva para códigos de clase, y el alfabeto ya evita caracteres ambiguos.

Diseño según `CLAUDE.md`:
- Solo tokens; `Button`, `Input` y `Card` de `components/ui/`; una acción principal por vista; estado con icono y texto.
- Retornos tempranos en el orden error → cargando → vacío → datos; sin ternarios anidados; sin `?? []`.
- Funciona a 360 px, con foco visible.

## Acceso a datos
| Consulta | Tabla(s) | Índice | Paginación | Transacción |
|---|---|---|---|---|
| Encolar recuperación | `pgboss.job` | los de pg-boss | — | no (una sentencia) |
| `buscarTokenPorHash` | `tokens_cuenta` ⋈ `usuarios` | único `hash_token` + PK | una fila | no |
| `usarTokenYCambiarContrasena` | `tokens_cuenta`, `usuarios`, `sesiones` | PK; `(usuario_id)` en las revocaciones | — | **sí**: primero el bloqueo de escritura del usuario, después el orden fijo (DEC-08) |
| `buscarTokenParaEnvio` | `tokens_cuenta` ⋈ `usuarios` | PK | una fila | no |
| `buscarCuentaPorEmail` | `usuarios` | único `email` | una fila | no |
| `buscarCuentaPorId`, `buscarCredencialesPorId` | `usuarios` | PK | una fila | no |
| `contarRecuperacionesRecientes` | `tokens_cuenta` | `(usuario_id)`; filtra `tipo` y `creado_en` sobre las pocas filas del usuario | `COUNT` | no |
| `prepararTokenDeRecuperacion` | `tokens_cuenta` | `(usuario_id)` en la revocación; PK y único `hash_token` en `ON CONFLICT DO NOTHING` | — | **sí** (bloqueo de escritura del usuario; revocar vivos con id distinto + insertar sin duplicar; sin `try/catch` dentro, N-04) |
| `crearMaestroInvitado` | `usuarios`, `tokens_cuenta`, `pgboss.job` | únicos `email`, `hash_token`; PK | — | **sí**, incluido el encolado (DEC-07) |
| `restablecerConTemporal` | `usuarios`, `sesiones`, `tokens_cuenta` | PK; `(usuario_id)` | — | **sí**, con el bloqueo de escritura del usuario primero |
| `corregirCorreo` | `usuarios`, `tokens_cuenta` | PK; único `email`; `(usuario_id)` | — | **sí** |
| `cambiarContrasenaPropia` | `usuarios`, `sesiones`, `tokens_cuenta` | PK; `(usuario_id)` | — | **sí**, con el bloqueo de escritura del usuario primero |
| `bloquearUsuarioParaEscribir`, `bloquearUsuarioParaSesion` (Enmienda 2) | `usuarios` | PK | una fila | dentro de la transacción que los llama |
| `crearSesion` (login; AUTH-01, Enmienda 2) | `usuarios`, `sesiones` | PK; único `hash_token` | — | **sí**: `FOR SHARE` sobre el usuario + `INSERT` |
| `rotarSesion` (AUTH-01, Enmienda 2) | `usuarios`, `sesiones` | PK; único `hash_token` | — | **sí**: `FOR SHARE` sobre el usuario primero |
| `revocarTodasLasSesiones` (AUTH-01, Enmienda 2) | `usuarios`, `sesiones` | PK; `(usuario_id)` | — | **sí**: bloqueo de escritura del usuario primero |
| `actualizarContrasenaYRevocarSesiones` (`reset:admin`; AUTH-01, Enmienda 2) | `usuarios`, `sesiones` | PK; `(usuario_id)` | — | **sí**: bloqueo de escritura del usuario primero |
| Sesión actual en `cambiar-contrasena` | `sesiones` | único `hash_token` (`buscarSesionPorHash` existente) | una fila | no |
| `buscarTrabajo` (pruebas) | `pgboss.job` | PK | una fila | no |
| `describirCola` (pruebas) | `pgboss.queue` | PK (`name`) | una fila | no |
| `buscarTrabajosPorCorreo` (solo pruebas, N-06) | `pgboss.job` | ninguno propio: filtra por `name` y por `data->>'correo'` | filas de la prueba | no |

- Ninguna consulta va dentro de un ciclo.
- Ninguna lista: la búsqueda del admin va por índice único y devuelve una fila.
- El único SQL crudo de producción con texto no literal es el de pg-boss, parametrizado y ejecutado por `ejecutorSqlDe` (DEC-07). Los `$queryRaw` etiquetados de producción son el de `salud.ts` (AUTH-01) y los dos de `bloqueo-usuario.ts` (Enmienda 2), parametrizados. El `$queryRaw` etiquetado de `buscarTrabajosPorCorreo` es solo de pruebas.
- Crecimiento de `tokens_cuenta`: una fila por solicitud atendida. La purga de vencidos llega con `LIMPIEZA_DIARIA` (encargo posterior), que pedirá un índice sobre `expira_en`.
- Crecimiento de `pgboss.job`: acotado por la retención de 1 día (N-02).

## Autorización
- **Públicas** (única lista en `rutas-publicas.ts`):
  - `recuperar`: no revela nada; recorre el mismo camino exista o no la cuenta.
  - `restablecer` y `establecer-contrasena`: la credencial es el token de 256 bits del enlace, de un solo uso y de un tipo concreto.
- **`cambiar-contrasena`**: cualquier rol autenticado y activo **con** `debe_cambiar_contrasena`; permitida con acceso restringido (C-01). Sin la bandera, `409`, también para un restringido.
- **Rutas de admin**: solo `rol = admin`, por `requireRole(["admin"])`.
  - Un estudiante o un maestro → `403 ROL_NO_PERMITIDO`.
  - Un restringido → `403 ACCESO_RESTRINGIDO` (la cadena lo corta antes del rol).
  - Cualquiera con cambio pendiente → `403 CAMBIO_DE_CONTRASENA_REQUERIDO`.
  - Sin token → `401`.
  - Ninguna comprobación de rol dentro de los handlers.
- **Sobre el objetivo**: el restablecimiento nunca aplica a una cuenta admin, y nada crea ni promueve administradores (el índice parcial sigue siendo la garantía última).
- **Estado de pago**: ninguna respuesta nueva lo contiene; `usuarioAdminSchema` no lo tiene y los repositorios nuevos no lo seleccionan.
- **Nunca salen**: `hashContrasena`, `hashToken`, el token de un enlace (solo viaja en el correo), la contraseña temporal fuera de su única respuesta y `RESEND_API_KEY`.
- **Logs**: `redact` ampliado. El worker no registra datos del trabajo, direcciones, enlaces ni tokens. El canal `registro` solo registra el nombre del archivo, y el `motivo` de un rechazo es solo el estado y el nombre del error.

## Pruebas requeridas
**Precondición de toda corrida del backend:** V-01 (firewall) en verde.

Criterios de todas las pruebas nuevas:
- Al menos una aserción. Si falta una precondición, la prueba falla con un mensaje; nunca termina con un `return` temprano.
- Correos `@pruebas.local` únicos e ids propios, con borrado en `afterAll`; las filas de `tokens_cuenta` caen en cascada.
- Ninguna prueba llama a Resend: el canal `resend` se prueba con un cliente doble inyectado.

### AUTH-02a (backend)
| Archivo | Casos (esperado) |
|---|---|
| `src/core/auth/tokens-cuenta.test.ts` | 11: vigencias (30 min y 72 h); `calcularExpiracionToken` por tipo (2); `decidirUsoDeToken`: válido; `null` → inexistente; tipo equivocado (invitación en recuperación y al revés); usado; revocado; `expiraEn === ahora` → vencido; usuario inactivo; `estaVivo` |
| `src/core/auth/recuperacion.test.ts` | 6: inexistente, inactiva, admin y 3 en la ventana → no envía; 2 en la ventana → sí; maestro activo → sí |
| `src/core/auth/contrasena-temporal.test.ts` | 5: formato `xxxx-xxxx-xxxx`; solo caracteres del alfabeto; cumple `contrasenaSchema`; bytes `≥ 248` se descartan (sin sesgo); bytes insuficientes → lanza |
| `src/core/auth/cambio-de-contrasena.test.ts` | 4: sin bandera → 409; con bandera → `null`; nueva idéntica → 400; distinta solo en mayúsculas → `null` |
| `src/core/auth/respaldo.test.ts` | 3: admin → 403; maestro y estudiante → `null` |
| `src/core/auth/enlaces.test.ts` | 3: recuperación con fragmento `#token=`; invitación; `urlBase` con barra final no duplica la barra |
| `src/core/correo/plantillas.test.ts` | 6: asunto y "30 minutos" en recuperación; "72 horas" y `urlRecuperar` en invitación; el enlace aparece en HTML y texto; nombre con `<script>` escapado en HTML; texto plano sin etiquetas; "CMEP Campus Digital" en ambos |
| `src/core/correo/fallos.test.ts` | 6: 400 y 422 permanentes; **403**, 429, 500 y `null` transitorios |
| `src/core/eventos/correo-de-cuenta.test.ts` | 4: recuperación válida; invitación válida; tipo desconocido; correo ausente |
| `src/config/correo.test.ts` | 11: dev sin llave → `registro`; **dev con llave → `registro`**; **test con llave → `registro`**; production con todo → `resend`; production sin llave, sin remitente o con URL `http` → error con el nombre de la variable; ningún mensaje repite un valor; vacíos = ausentes; **production con el remitente literal de `.env.example` → error `CORREO_REMITENTE: en production debe usar un dominio propio…` sin el valor (N-05)**; **production con variantes del dominio de ejemplo (`Notificaciones@CAMPUS.local`, con espacios alrededor, con y sin `<…>`) → rechazado (N-05)** |
| `test/tokens-de-cuenta.test.ts` (sin base) | 5: mismo id → mismo token; ids distintos → tokens distintos; otro `JWT_SECRET` → otro token; `hash === SHA-256(token)`; 43 caracteres base64url |
| `test/notifier-registro.test.ts` (directorio temporal) | 4: escribe `<fecha>-<id>.html` con el enlace; crea el directorio si falta; el log no contiene enlace, token ni dirección; `crearNotifier` con `canal: "resend"` y `nodeEnv: "development"` lanza |
| `test/notifier-resend.test.ts` (cliente doble) | 6: envía `from`, `to`, `subject`, `html`, `text`, `replyTo` e `idempotencyKey`; `data.id` → `enviado`; 422 → `rechazado` sin lanzar y con un `motivo` que no contiene la dirección; 429 → lanza; error de red **devuelto** por el doble como `{ data: null, error: { name: "application_error", statusCode: null } }` → lanza; **llave vacía o en blanco → lanza sin que el doble reciba ninguna llamada** |
| `test/cola.integracion.test.ts` | 8: encolar dentro de una transacción confirmada → el trabajo existe; transacción que lanza después de encolar → no existe; mismo id dos veces → un solo trabajo y sin error; datos con objeto sobreviven igual; las dos colas existen con la política de DEC-06 (`describirCola`); **las dos colas tienen `retentionSeconds` y `deleteAfterSeconds` = 86 400 (N-02)**; `buscarTrabajo` de un id inexistente → `null`; `encolar` sin cola iniciada → `COLA_NO_INICIALIZADA` |
| `test/recuperar.integracion.test.ts` | 8: correo existente y correo inexistente → `204` con el mismo cuerpo y los mismos encabezados relevantes; cada solicitud encola un trabajo con el correo normalizado (`buscarTrabajosPorCorreo`); el handler no escribe `tokens_cuenta`; 4.ª solicitud desde la misma IP y con el mismo correo → `429 DEMASIADAS_SOLICITUDES` + `Retry-After: 3600`; otro correo desde la misma IP no se bloquea; correo inválido → 400; cuerpo no JSON → 400; mayúsculas y espacios cuentan como el mismo correo |
| `test/restablecer.integracion.test.ts` | 10: de punta a punta (recuperar → id con `buscarTrabajosPorCorreo` → `procesarCorreoDeCuenta` con el doble → token del enlace → `204` → login con la nueva `200` y con la vieja `401`); sesiones previas revocadas; `debe_cambiar_contrasena` en `false`; segundo uso → 400; vencido → 400; token de invitación → 400; revocado por uno más nuevo → 400; contraseña de 9 caracteres → 400 `VALIDACION` **sin** consumir el token; usuario inactivo → 400; dos usos concurrentes (`Promise.all`) → exactamente un `204` |
| `test/invitacion.integracion.test.ts` | 9: `201` crea maestro activo sin `hash` en la respuesta; el login del invitado → `401 CREDENCIALES_INVALIDAS` con el mismo mensaje que una contraseña incorrecta; existe un trabajo con id = id del token; duplicado → `409` sin usuario, token ni trabajo nuevos; `establecer-contrasena` → `204` → login → `/me` con `rol: "maestro"`; token de recuperación en `establecer-contrasena` → 400; vencido (72 h) → 400; segundo uso → 400; **`crearMaestroInvitado` con un `alGuardar` que lanza → ni usuario ni token** |
| `test/admin-restablecimiento.integracion.test.ts` | 9: `200` con formato de temporal y `Cache-Control: no-store`; login con la temporal → `200` y `/me` → `403 CAMBIO…`; sesiones previas del usuario revocadas (refrescar → 401); enlaces vivos revocados; objetivo admin → `403 OPERACION_NO_PERMITIDA`; id inexistente → 404; id no uuid → 400; la base guarda un argon2id distinto de la temporal; ninguna respuesta posterior (buscar, corregir) contiene la temporal |
| `test/admin-correo.integracion.test.ts` | 10: buscar existente (sin `estadoPago` ni `hash`); buscar normaliza mayúsculas; buscar inexistente → 404; correo inválido → 400; corregir → `200` normalizado; login con el correo nuevo; duplicado → 409; id inexistente → 404; revoca enlaces vivos; no revoca sesiones |
| `test/cambiar-contrasena.integracion.test.ts` | 10: con bandera → `204`, bandera en `false`, `/me` → `200`; conserva la sesión de la cookie y revoca las demás; sin cookie revoca todas; temporal incorrecta → `400 CONTRASENA_ACTUAL_INCORRECTA` (no 401); nueva igual → 400; nueva corta → 400; 6.º intento con temporal incorrecta → `429`; sin token → 401; restringido con bandera → `204`; sin bandera → `409` |
| `test/autorizacion-cuentas.integracion.test.ts` | 21: las 4 rutas de admin × {sin token 401, estudiante 403 `ROL_NO_PERMITIDO`, maestro 403 `ROL_NO_PERMITIDO`, restringido 403 `ACCESO_RESTRINGIDO`, maestro con cambio pendiente 403 `CAMBIO…`} = 20; y ninguna respuesta de admin contiene `estadoPago`, `hashContrasena` ni `hash_token` |
| `test/worker-correo-de-cuenta.integracion.test.ts` | 12: recuperación de cuenta existente → un correo con `/restablecer#token=`, y ese token vale en `/restablecer`; inexistente → 0 correos y 0 tokens; admin → 0; inactiva → 0; cuarta en una hora → 0 (tope durable); reintento del mismo trabajo → mismo enlace y sin token nuevo; un trabajo viejo tras uno nuevo → no envía; invitación → correo con `/establecer-contrasena#token=`; invitación ya usada → no envía; fallo transitorio del notifier → lanza; rechazo permanente → no lanza y devuelve `rechazado`; **dos `prepararTokenDeRecuperacion` concurrentes con el mismo id (`Promise.all`) → ningún error, una sola fila y sigue viva, es decir, no se revocó a sí misma (N-04)** |
| `test/worker-consumidor.integracion.test.ts` | 3, con colas propias de la prueba (`asegurarCola` con `retryLimit: 1`, `retryDelay: 1`, `retryBackoff: false` y su propia cola de fallidos) y `registrarConsumidores(deps, colas)`: un trabajo se procesa y queda completado con el correo en el doble; un fallo transitorio agota los reintentos, pasa a la cola de fallidos y queda el `log.error` `correo_de_cuenta_fallido`; un rechazo permanente se completa sin reintento. Tiempo de espera de la prueba: 30 s |

### AUTH-02a, ronda 3 (Enmienda 2)
**`test/ayudas-concurrencia.ts`:**
```ts
export interface FilaRetenida {
  tabla: "usuarios" | "sesiones"
  id: string
}
// Las operaciones que llaman a un adaptador directamente devuelven null.
export type Operacion = () => Promise<LightMyRequestResponse | null>
export const conFilaRetenida = (
  fila: FilaRetenida,
  operaciones: readonly Operacion[],
): Promise<(LightMyRequestResponse | null)[]>
```
Usa el mismo método que `cuentas-r2.ataque`, reescrito aquí: nunca se importa de un `*.ataque`.
- Una transacción de la prueba retiene la fila con `SELECT … FOR UPDATE` (`$queryRaw` etiquetado) y obtiene su `pg_backend_pid()`.
- Lanza cada operación en orden. Antes de lanzar la siguiente, y antes de soltar la fila, sondea cada 25 ms, durante un máximo de 10 s, hasta que la operación `i` haya terminado o esté formada detrás de la fila.
  - "Formada" significa que el conteo recursivo con `pg_blocking_pids` desde el pid retenedor llega a `i + 1`.
  - El conteo se consulta **fuera** de la transacción retenedora.
- Si la operación no se forma ni termina en 10 s, la prueba falla con `expect(formada || terminada, "Precondición: la operación N no llegó a la fila retenida en 10 s").toBe(true)`.
- `$transaction` va con `{ timeout: 30_000, maxWait: 5_000 }`.
- Sin esperas fijas, salvo un margen final de 100 ms antes de soltar la fila.

**`test/bloqueo-usuario.integracion.test.ts`** (19 pruebas, cada una con un límite de 30 s).
- Una IP propia por cada login.
- Usuarios `@pruebas.local` que se borran en `afterAll`.
- Al menos una aserción por prueba y ningún `return` temprano.
- "Retenido: usuario" o "retenida: sesión" indica qué fila retiene `conFilaRetenida`. Las operaciones se lanzan en el orden escrito.

| Grupo | Caso | Esperado |
|---|---|---|
| A: sin deadlock | **A1** Retenido: usuario. `establecer-contrasena` (token de invitación) y luego `refrescar` | Ningún `5xx`; 0 sesiones vivas |
| | **A2** Retenido: usuario. `prepararTokenDeRecuperacion` (directo) y luego `refrescar` | Sin error; `refrescar` responde `200`; el usuario tiene 1 token vivo |
| | **A3** Retenido: usuario. `cambiar-contrasena` y luego el restablecimiento del admin | `204` y `200`; `debe_cambiar_contrasena = true` |
| | **A4** Retenido: usuario. `restablecer` y luego `refrescar` con una cookie ya rotada (reutilización) | `204` y `401`; 0 sesiones vivas |
| B: T-08 | **B1** Retenida: sesión. `refrescar` y luego `restablecer` | `204`; 0 sesiones vivas; la cookie rotada no refresca |
| | **B2** Retenida: sesión. `refrescar` y luego `actualizarContrasenaYRevocarSesiones(estudiante.id, hash)` (directo; el hash se calcula antes) | 0 sesiones vivas; la cookie rotada no refresca |
| | **B3** Fuera de la retención, S0 se refresca a S1. Retenida: S1. `refrescar(S1)` y luego `refrescar(S0)` (reutilización) | `200` y `401`; 0 sesiones vivas; S2 no refresca |
| C: T-09 | **C1** Retenido: usuario. Restablecimiento del admin y luego login con la contraseña vieja | `200` y `401`. El cuerpo del `401` es idéntico en código y mensaje al de un login con una contraseña incorrecta. 0 sesiones vivas |
| | **C2** Retenido: usuario (con la bandera; la vieja es la temporal). `cambiar-contrasena` sin cookie y luego login con la temporal | `204` y `401`; 0 sesiones vivas |
| | **C3** Retenido: usuario. `actualizarContrasenaYRevocarSesiones` (directo) y luego login con la vieja | `401`; 0 sesiones vivas |
| | **C4** Retenido: usuario. Login con la vieja y luego `restablecer` (orden inverso) | `200` y `204`; 0 sesiones vivas; la cookie del login no refresca |
| D | **D1** Retenido: usuario. El admin genera la temporal B y luego `cambiar-contrasena` se hace con la temporal anterior A | `200` y `400 CONTRASENA_ACTUAL_INCORRECTA`; el login con B responde `200`; `debe_cambiar_contrasena` sigue en `true` |
| E: adaptadores, sin concurrencia | **E1** `crearSesion` con otro `hashVerificado` | `null`; 0 sesiones |
| | **E2** `crearSesion` de un usuario inactivo | `null` |
| | **E3** `crearSesion` con un `usuarioId` inexistente | `null`, sin lanzar (antes, la FK respondía `500`) |
| | **E4** `cambiarContrasenaPropia` con otro `hashVerificado` | `false`; el hash, la bandera, las sesiones y los tokens no cambian |
| | **E5** `revocarTodasLasSesiones` con 2 sesiones vivas | Devuelve `2`, como antes |
| | **E6** Estática: en `backend/src/adapters/db/*.ts`, busca `$queryRaw` que no vaya seguido de `Unsafe` (expresión regular `\$queryRaw(?!Unsafe)`) | Aparece solo en `salud.ts` y `bloqueo-usuario.ts`, lo que prueba que no queda un segundo bloqueo privado |
| | **E7** Estática: `bloqueo-usuario` en `backend/src` | Solo se importa desde `adapters/db/` |

**Pruebas que ya existen:**
- Las dos de carrera de `restablecer.integracion` no se tocan y siguen valiendo, porque exigen `< 500`. Con D1, la de "`restablecer` contra `cambiar-contrasena`" puede responder `400` en `cambiar-contrasena`, y eso sigue siendo `< 500`.

**Efecto sobre las `*.ataque`:**
- Ninguna se modifica. Sus hashes son los de la tabla de la ronda 2 del Tester (23 archivos) y deben seguir en verde.
- **`cuentas-r2` (AUTH-02a):** las 4 que fallaron en la ronda 2 pasan a verde:
  - T-07 responde `{restablecer: 204, refrescar: 401}`;
  - T-08, en sus dos casos, deja 0 sesiones vivas y la cookie rotada no refresca;
  - T-09 deja 0 sesiones vivas y el login responde `401`.
- **`cuentas-r1` (T-01):** sigue en `[204, 400]`, porque `FOR NO KEY UPDATE` choca consigo mismo.
- **`intentos-r2` (AUTH-01):** sigue en verde. El doble sustituye `crearSesion` por nombre, y el nombre se conserva. Su caso "si falla la creación de la sesión…" necesita que la llave se borre antes de `crearSesion`, y eso también se conserva.
- **`sesiones-y-cadena`, `auth-login`, `api-real`, `admin-unico`, `logs-r2`, `guarda-r2`, `nombres-tokens-r2`, `nombres-guarda-r3` (AUTH-01) y las demás de AUTH-02a:** fuera de las carreras no cambia ningún comportamiento observable, así que siguen en verde.
- **`*.ataque` del frontend:** no se tocan.

### AUTH-02b (frontend)
| Archivo | Casos (esperado) |
|---|---|
| `services/apiClient.test.ts` | +4: `403 CAMBIO…` → `irA("/cambiar-contrasena")`; estando en `/cambiar-contrasena` no navega; `401` con token en `/api/auth/cambiar-contrasena` → refresca y reintenta; `401` en `/api/auth/login` sigue sin refrescar |
| `features/auth/lib.test.ts` | +5: `leerTokenDelFragmento` (válido, ausente, forma incorrecta); `requiereCambioDeContrasena`; `avisoDeLogin` con estado desconocido → `null` |
| `features/auth/recuperar-view.test.tsx` | 3: envía y muestra la confirmación fija; `429` → mensaje de una hora; correo inválido no envía |
| `features/auth/restablecer-view.test.tsx` | 5: lee el token del fragmento y lo quita de la URL (`location.hash === ""`) sin tocar `localStorage`/`sessionStorage`; envía `{ token, contrasena }` y llega a `/login` con el aviso; `ENLACE_INVALIDO` → mensaje y enlace a `/recuperar`; sin token → estado de enlace inválido sin ninguna petición; confirmación distinta → no envía |
| `features/auth/establecer-contrasena-view.test.tsx` | 3: éxito → `/login` con "Tu contraseña quedó lista…"; `ENLACE_INVALIDO`; llama a `/api/auth/establecer-contrasena` |
| `features/auth/cambiar-contrasena-view.test.tsx` | 4: éxito → `/me` → dashboard del rol; temporal incorrecta → alerta; confirmación distinta → no envía; "Cerrar sesión" → `/login` |
| `features/auth/login-view.test.tsx` | +1: con `state.aviso` muestra el aviso con `role="status"` |
| `app/router.test.tsx` | +3: `/estudiante` con `/me` `403 CAMBIO…` termina en `/cambiar-contrasena` y muestra el formulario; `/cambiar-contrasena` con `/me` `200` termina en el dashboard; `/cambiar-contrasena` sin sesión termina en `/login` |
| `features/admin/lib.test.ts` | 2: `mensajeDeErrorAdmin` por código y para un error que no es `ApiError` |
| `features/admin/cuentas-view.test.tsx` | 6: invitar → mensaje de éxito; `409` → "Ya existe…"; buscar → ficha; restablecer pide confirmación en línea y muestra la temporal una vez con el aviso; buscar otra cuenta hace desaparecer la temporal; corregir correo → éxito |

**Conteos esperados** (el Programador reporta los exactos):
- **AUTH-02a:**
  - Backend: 31 archivos y 330 pruebas hoy. Se suman **23 archivos y ≈ 174 pruebas**: 48 de `core/` en 9 archivos, 11 de `config/`, 15 de `tokens-de-cuenta` + `notifier-*`, 8 de `cola` y 92 de integración en 9 archivos. Total ≈ **54 archivos y ≈ 504 pruebas**.
  - Frontend: sin cambios, 11 archivos y 69 pruebas.
  - Total ≈ **573**, más lo que añada el Tester.
  - **Ronda 3 (Enmienda 2):** el backend pasa de 63 archivos y 616 pruebas (tras la ronda 2 del Tester) a **64 archivos y 635 pruebas**. `ayudas-concurrencia.ts` no es un archivo de pruebas. El frontend no cambia.
- **AUTH-02b:**
  - Frontend: 11 archivos y 69 pruebas. Se suman **6 archivos y ≈ 36 pruebas**. Total ≈ **17 archivos y ≈ 105 pruebas**.
  - Backend: lo que deje AUTH-02a, incluidas las pruebas del Tester.

**Criterio de cierre de cada parte:**
- Toda la suite en verde en **tres corridas completas** de `npm test` desde la raíz; en 02a, con FE-01 ya actualizada por el Tester.
- `lint` y `build` en verde.
- Las verificaciones V-xx de la parte, en verde.

**Pruebas en rojo aceptadas:** la única es FE-01, con la salida esperada, y solo en la entrega de la ronda 1 del Programador de AUTH-02a. En las rondas siguientes y en AUTH-02b, ninguna.

## Tareas heredadas para el Tester (ronda 1 de AUTH-02a)
1. **FE-01:** actualizar `sesiones-y-cadena.ataque.test.ts:423` a la superficie nueva de rutas, conservando la intención ("ninguna ruta crea administradores; solo `POST /api/admin/maestros` crea maestros y exige admin"), y publicar el hash nuevo.
2. **Pendiente de CHORE-01 (decisión escrita del humano):** convertir en aserciones de precondición los `if (!admin) return` de `sesiones-y-cadena.ataque:268-277`, `auth-registro.ataque:163-176` y `api-real.ataque:301-314`, y retirar la transacción revertida de `admin-unico.ataque` si ya no hace falta. Sin debilitar ninguna aserción.
3. **Tabla de hashes vigente:** publicar en `reporte-tester.md` (sección "AUTH-02a — ronda 1") la tabla completa de SHA-256 de todas las `*.ataque.test.ts(x)`: las 14 de V-02 con sus hashes nuevos donde cambien, más las que añada. Esa tabla sustituye a la de V-02 desde la ronda 2 de AUTH-02a y en AUTH-02b; cada ronda posterior del Tester la vuelve a publicar si cambia.

## Puntos de ataque para el Tester
- **Enumeración por recuperar:**
  - Mismo código, cuerpo y encabezados para correos existentes, inexistentes, inactivos y del admin.
  - Tiempos: la petición no debe depender de `usuarios`. Por ejemplo, con `usuarios` bloqueada por otra transacción, `recuperar` debe responder igual.
  - El `429` no distingue cuentas.
- **Tokens:**
  - Reutilización; uso concurrente; tipo cruzado (invitación ↔ recuperación); token de un usuario inactivo; token vencido por un milisegundo.
  - Token revocado tras una corrección de correo o un restablecimiento del admin.
  - Token mal formado, vacío, de 10 KB o con caracteres fuera de base64url.
  - Que un token de un usuario no cambie la contraseña de otro.
  - Que ni `tokens_cuenta` ni `pgboss.job` contengan nada con lo que se pueda reconstruir un token sin `JWT_SECRET`.
  - Reintentos concurrentes de `prepararTokenDeRecuperacion` que revoquen su propio token (N-04).
- **Encolado transaccional y ejecutor SQL:**
  - Forzar un fallo después de insertar el usuario → ni usuario ni trabajo. Forzar un fallo de pg-boss → ni usuario ni token.
  - Invocar `ejecutorSqlDe(tx).executeSql` con dos sentencias y parámetros → debe fallar (defensa del protocolo extendido, DEC-07).
  - Intentar colar un dato de la petición en el texto del SQL.
  - Burlar el bloque de ESLint o la búsqueda de V-13 (acceso con corchetes, desestructuración, alias).
- **Cola:**
  - Llenar la cola con `recuperar` usando correos distintos desde una misma IP (N-02: cada trabajo se omite barato y se borra al día).
  - Que la retención de las dos colas sea la de DEC-06.
- **Worker:**
  - Trabajo con datos basura; trabajo duplicado; reintentos que no generan enlaces distintos.
  - Tope por cuenta con varias IPs; el admin nunca recibe correo.
  - El log del worker sin direcciones, enlaces ni tokens (ni el `motivo` de un rechazo); cola de fallidos registrada.
- **Correo fuera de `prod`:**
  - `NODE_ENV=development` o `test` con `RESEND_API_KEY` presente → canal `registro`.
  - Cualquier forma de construir `resend` fuera de `production`, incluida una llave vacía que la librería completaría desde `process.env`.
  - `grep` de `resend` fuera de `adapters/notifier/resend.ts`.
  - HTML fuera de `backend/tmp/correos/` o versionado.
  - En `production`, el remitente de ejemplo o sus variantes de mayúsculas y espacios.
- **Cambio obligatorio:**
  - Todo endpoint, incluido `GET /me`, con la bandera → 403, salvo `cambiar-contrasena`, `refrescar` y `logout`.
  - El restringido con bandera puede cambiarla y después solo ve su pantalla; el restringido sin bandera → 409 y nada más.
  - Fuerza bruta sobre la temporal (429 al 6.º intento); un `401` por error de la temporal (no debe ocurrir).
  - Conservar la sesión actual con la cookie de **otro** usuario; sin la bandera → 409.
- **Admin:**
  - Cadena completa en las 4 rutas (rol, restringido, cambio pendiente, sin token).
  - Restablecer al admin; que restablecer promueva o cree admins (no debe).
  - La temporal en logs, en la base en claro o en respuestas posteriores.
  - Corrección a un correo ya usado, con mayúsculas o espacios; `id` con inyección o que no es uuid.
  - Que la búsqueda no devuelva `estadoPago`.
- **Arranque:** la API sin base no arranca y no deja procesos colgados (N-03); `test/preparar-cola.ts` contra una URL que no es la desechable se niega a conectarse.
- **Carreras de sesiones y contraseñas (Enmienda 2, ronda 3):**
  - Cualquier combinación de login, refresco, reutilización o logout con restablecimiento por enlace, restablecimiento del admin, `cambiar-contrasena`, `reset:admin`, corrección de correo o el worker de recuperación: nunca un `5xx` y nunca una sesión viva nacida antes de un cambio de contraseña confirmado.
  - Transacciones del alcance de PB-1 que no bloqueen primero al usuario.
  - Que el diff de `handlers/auth/index.ts` no salga del bloque del login.
- **Frontend (AUTH-02b):**
  - El token en `localStorage`, `sessionStorage` o el historial después de leerlo.
  - Doble clic en los formularios; bucle de redirección entre `/cambiar-contrasena` y el dashboard.
  - La temporal sigue visible tras buscar otra cuenta o en la caché de mutaciones.
  - La vista a 360 px.

## Puntos de revisión para el Manager
**Verificación de la Enmienda 1 (antes de programar):** solo que esta enmienda cubra las decisiones de `aprobacion.md`, sin revisión completa.

**Verificación de la Enmienda 2 (antes de la ronda 3 de AUTH-02a):** acotada, como la de la 1: que la enmienda cubra las decisiones de `aprobacion.md`, "Enmienda 2 — decisiones del humano" (Q-E2-1 a Q-E2-5).

**Modo final de AUTH-02a:**
- PA-06/PA-07: el mecanismo real de encolado transaccional (archivo y línea del SQL de `send` de pg-boss 12, con qué se interpola y qué va en parámetros) y la prueba de reversión de `cola.integracion`. También el único `$queryRawUnsafe` y el bloque `no-restricted-syntax` (V-13, V-14).
- DEC-03: la derivación del token (HKDF + HMAC), que el trabajo no contenga el token y que el hash de la base se calcule igual en el handler y en el worker.
- N-04: `prepararTokenDeRecuperacion` sin `try/catch` dentro de la transacción, la exclusión por id y la prueba concurrente.
- N-02: la retención de las dos colas y su prueba.
- N-03: `iniciarCola` en su lugar en `app.ts` y la nota del README.
- N-05: el rechazo del remitente de ejemplo y sus pruebas.
- PA-10: la doble defensa contra correos reales fuera de `prod` y la salida de V-16.
- DEC-08: el orden fijo del consumo del token y la prueba de carrera.
- DEC-09/C-01: `permitirRestringido` en `cambiar-contrasena`, que no abra nada más a los restringidos, y el `409` documentado.
- Enmienda 2: el protocolo de bloqueo (PB-1 a PB-8) en todas las transacciones de su alcance, el diff de `handlers/auth/index.ts` limitado al bloque del login, `bloqueo-usuario.integracion` y las 4 pruebas de `cuentas-r2` en verde.
- `redact` y la ausencia de tokens, enlaces, temporales y direcciones en los logs (V-17).
- FE-01, las tareas heredadas del Tester y la tabla de hashes que publique.
- Conexiones: los pools de pg-boss y Prisma en pruebas (PA-12), y el tiempo de la suite frente a los ≈ 17–25 s de CHORE-01.
- El esquema `pgboss` en `campus_dev` y `migrate diff` después (V-18).
- Que `frontend/` no cambió (V-22).
- Los textos de documentos marcados "al cerrar AUTH-02a".

**Modo final de AUTH-02b:**
- Módulos: `features/admin` no importa de `features/auth`.
- Un solo `fetch`; el token del enlace solo en memoria; confirmación en línea, sin modal.
- La suite completa en verde sin excepciones.
- Que `backend/` y `shared/` no cambiaron.
- La fila `admin` de `CLAUDE.md`.

## Riesgos y desacuerdos
- **R-01. Encolado transaccional con Prisma 7 + `@prisma/adapter-pg` (reescrito por M-01). Riesgo bajo, con evidencia.**
  - pg-boss 12.34.0 publica su propio adaptador `fromPrisma` (`dist/adapters/prisma.js`, exportado en `dist/index.d.ts:117`) con el mismo código que `ejecutorSqlDe` (`executeSql(text, values) → tx.$queryRawUnsafe(text, ...values)`), y lo prueba contra `@prisma/client` y `@prisma/adapter-pg` 7.10, que tiene en sus `devDependencies`.
  - `send` entrega una sola sentencia con un único parámetro `$1`, el trabajo serializado por pg-boss (`dist/manager.js:1150-1161`, `dist/plans.js:2018-2141`). En el texto solo interpola el esquema, la tabla y el nombre de la cola: constantes nuestras, que pg-boss valida con `^[\w.\-/]+$` (`dist/attorney.js:88`).
  - Si una versión futura mandara varias sentencias, el protocolo extendido de PostgreSQL (usado con parámetros) las rechaza ("cannot insert multiple commands into a prepared statement"): el fallo sería visible, no silencioso.
  - Aun así, se comprueba en V-10 antes de construir los handlers. Si falla, PA-06/PA-07 detienen en lugar de improvisar una tabla de salida u otra conexión.
- **R-02. pg-boss contra el mismo PostgreSQL.** Crea el esquema `pgboss` en `campus_dev` al arrancar la API o el worker. En `prod`, el usuario de la base necesita permiso para crear un esquema (anotado para DEPLOY). Suma conexiones: `max` 3 en la API y 4 en el worker.
- **R-03. Pruebas y conexiones.** Cada archivo que construye la app arranca pg-boss contra la base desechable (≈ 13 archivos en paralelo). Mitigación: el esquema y las colas se instalan una vez en `global-setup`, la API no supervisa y su pool es de 3. Si se agotan las conexiones, PA-12. La suite tardará más; se mide y se reporta.
- **R-04. Windows.** El worker y la API de V-17 se arrancan con `Start-Process` y un PID propio. La parada ordenada ante `SIGTERM` no se puede comprobar en Windows (`taskkill /F` es forzosa): queda declarada como no verificada en local.
- **R-05. Tiempo de argon2.** Invitaciones, restablecimientos y cambios añaden argon2id a la suite (≈ 50–150 ms cada uno).
- **R-06. Tamaño del encargo.** Mitigado con la partición (P-01).
- **R-07. Entregabilidad y rebotes.** Sin dominio ni SPF/DKIM/DMARC no hay entrega real, y los rebotes llegan por webhook (fuera de alcance, C-04). DEPLOY verifica un correo real en la bandeja (D-26). Un `403` por dominio no verificado agota los reintentos y queda en la cola de fallidos.
- **R-08. Almacenes en memoria** (S-12): se reinician con el proceso; con réplicas, pasarían a PostgreSQL.
- **R-09. Rotar `JWT_SECRET`** invalida los enlaces pendientes (DEC-03). Es aceptable y se documenta en el README.
- **R-10. Límite de login activo.** Si el alumno agotó sus 5 intentos, tampoco podrá entrar con la temporal hasta que venza la ventana de 15 min: el admin no puede limpiar un almacén en memoria de otro plugin. Se documenta.
- **R-11. FE-01** rompe a propósito una prueba del Tester. El flujo lo absorbe en la ronda 1 de AUTH-02a; después, la excepción expira.
- **R-12. Dato personal en la cola** (S-14): el correo pedido queda en `pgboss.job` como máximo ≈ 1 día sin procesarse más 1 día tras completarse (N-02).
- **R-13. Cuota de Resend** (3,000 al mes): la acotan los dos límites de DEC-05 y el límite de tasa de DEPLOY.
- **R-14. Futuras migraciones con el esquema `pgboss` presente:** `migrate dev` solo mira `public` **[verificar en V-18]**. Si Prisma lo viera como deriva, PA-09 y se replantea antes de la siguiente migración.
- **R-15. Estilo del correo provisional** hasta que se fijen los tokens visuales (S-10).
- **R-16. La API no arranca sin base (N-03, declarado).** Sin `depends_on` con `healthcheck` (DEPLOY), un Compose con `restart` entraría en ciclos de reinicio mientras PostgreSQL arranca. En local, el README pide levantar `infra/` antes que la API, como ya hace.
- **R-17. Retención de 1 día (N-02).** Si el worker está caído más de un día, los trabajos pendientes se descartan sin enviarse. En una recuperación, el enlace ya habría vencido (30 min). En una invitación, el maestro no recibe su enlace: usa "¿Olvidaste tu contraseña?" (S-09) o acude a administración. Es aceptable para un piloto y lo cubre la alerta sobre el worker de DEPLOY.
- **R-18. La ronda 3 es la última de AUTH-02a (Enmienda 2):** un `ROTO` se escala al humano.
- **R-19. Se toca código de AUTH-01 ya cerrado (Enmienda 2).** Mitigación: cambios mínimos, la suite de ataque de AUTH-01 intacta y en verde, y la revisión humana del diff de `sesiones.ts` y del bloque del login.
- **R-20. Costo del protocolo (Enmienda 2).**
  - El login pasa de una sentencia a una transacción de dos. El refresco suma una sentencia, y la reutilización pasa a ser una transacción.
  - Los bloqueos compartidos marcan la tupla del usuario (MultiXact), así que cada refresco escribe un poco más en `usuarios`.
  - Es despreciable para 2,000 simultáneos, y el autovacuum lo absorbe.
- **R-21. Escrituras futuras sobre la fila del usuario** (estado de pago, restricción) esperan milisegundos a los logins y refrescos en curso de ese usuario, y al revés. No hay ciclos si cumplen PB-8.
- **R-22. Inanición teórica de un escritor.** Varios `FOR SHARE` pueden adelantarse a un escritor que espera. Haría falta solapar sin pausa logins o refrescos del mismo usuario; con transacciones de milisegundos y argon2 fuera, no es práctico. Se acepta.
- **R-23. Falso positivo de reutilización** (AUTH-01, preexistente; no lo introduce la Enmienda 2):
  - Si `cambiar-contrasena` confirma mientras otro dispositivo, o la propia pestaña, refresca, `rotarSesion` devuelve `null` y `refrescar` revoca todas, incluida la conservada. El usuario tiene que volver a entrar.
  - Ya ocurría antes, porque la espera sobre la sesión daba el mismo resultado, y falla hacia el lado seguro.
  - Corregirlo exige distinguir en `refrescar` una sesión revocada de una reutilizada: es otro bloque de AUTH-01 y queda fuera.
- **Desacuerdos con ESSENTIALS:** ninguno de fondo.
  - C-01 es un hueco (bloqueo mutuo), resuelto de la forma más estrecha posible y **aprobado por el humano**.
  - C-02 cambia el *cómo* de la idempotencia, no la regla.
  - El único `$queryRawUnsafe` cumple "SQL crudo solo parametrizado" (M-01). Se propone dejarlo escrito en ESSENTIALS "Reglas de datos".

## Verificaciones (el Programador las ejecuta y reporta con la salida real)
**Qué verificaciones corresponden a cada parte:**
- **AUTH-02a:** V-01 a V-18, V-20 a V-23 (V-23, solo con los comandos de las secciones del backend).
- **AUTH-02a, ronda 3 (Enmienda 2):** las de "Pasos de implementación > AUTH-02a — ronda 3".
- **AUTH-02b:** V-01, V-02 (con la tabla vigente de hashes), V-19, V-20, V-21, V-22 (versión 02b) y V-23 (solo con los comandos de "Frontend en local").

| # | Verificación | Resultado esperado |
|---|---|---|
| V-01 | `node --version`; `npm --version`; `git branch --show-current`; `git status --short`; `docker version --format "{{.Server.Version}}"`; en `infra/`, `docker compose ps`; `Get-NetFirewallRule -DisplayName "Campus: bloquear entrada a Docker en redes publicas" \| Format-Table DisplayName, Enabled, Direction, Action, Profile -AutoSize`; `Get-NetConnectionProfile \| Format-Table Name, NetworkCategory`; `Get-NetTCPConnection -LocalPort 3000,5173 -State Listen` (si hay algo, anota PID y proceso: no es tuyo, no lo toques) | `v24.11.1`, `11.6.2`; rama `feat/auth-02a-cuentas-backend` en 02a (en 02b, la que indique el orquestador); árbol limpio salvo `docs/trabajo/AUTH-02-cuentas-y-correo/` y `docs/ESTADO.md`; Docker responde; `postgres` en marcha; la regla existe con `True`, `Inbound`, `Block`, `Public`; red `Public` (el 2026-09-24 era `IZZI-F281`, declarada de confianza). Si no: PA-01 o PA-02 |
| V-02 | SHA-256 de las pruebas del Tester. Ronda 1 de 02a: las 14 de la tabla de abajo. Desde la ronda 2 de 02a y en 02b: la tabla que publicó el Tester en `reporte-tester.md` (tarea heredada 3) | Coinciden. Si no: PA-02 |
| V-03 | `npm view pg-boss versions --json`; `npm view pg-boss@12.34.0 engines dependencies peerDependencies`; `npm view resend versions --json`; `npm view resend@6.29.0 engines dependencies peerDependencies peerDependenciesMeta` | Últimas `12.34.0` y `6.29.0` (o mayores del mismo mayor, reportadas); `engines` admite Node 24.11.1; `@react-email/render` opcional. Si no: PA-03 |
| V-04 | Guardar una copia del lock (`Copy-Item package-lock.json backend\tmp\package-lock.antes.json`); editar `backend/package.json`; `npm install` desde la raíz (código y líneas `added/changed`); `npm ls pg-boss resend pg`; `npm ls @react-email/render`; `Select-String -Path package-lock.json -Pattern "aws\|firebase\|supabase\|vercel"` comparado con la copia | Código 0; las dos dependencias en su versión; `pg` preferentemente en una copia (dos se reportan); `@react-email/render` ausente; ninguna coincidencia nueva. Si no: PA-04 o PA-05 |
| V-05 | Lectura, sin ejecutar nada, de `node_modules/pg-boss/dist/*.d.ts` y `*.js`, y de `node_modules/resend/dist/*.d.ts` e `index.mjs`. Reportar con archivo y línea cada punto de S-02 y S-03 (lista debajo de la tabla). Las líneas citadas son las que leyó el Manager en el paquete publicado: una línea distinta se reporta, no detiene | Lo encontrado. PA-06 si falta una capacidad, si un dato del trabajo o de la petición va en el texto o si hay más de una sentencia; un nombre distinto se ajusta y se reporta |
| V-06 | `shared/`: `npm run build`, `npm run lint` | Verde |
| V-07 | Editar `schema.prisma`; `npx prisma validate`; `npx prisma format --check`; `npx prisma migrate dev --create-only --name tokens_cuenta`; `Get-Content` del SQL | Carpeta `<timestamp>_tokens_cuenta` con exactamente lo de DEC-01. Si no: PA-08 |
| V-08 | `npx prisma migrate dev`; `npx prisma migrate status`; `npx prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --exit-code; "codigo=$LASTEXITCODE"`; `npx prisma generate` | Aplicada; "Database schema is up to date!"; "No difference detected" y `codigo=0` (salida literal al resumen). Si no: PA-08 o PA-09 |
| V-09 | En `infra/`: `docker compose exec -T postgres psql -U campus -d campus_dev -At -c "SELECT indexname FROM pg_indexes WHERE tablename = 'tokens_cuenta' ORDER BY 1;"` y `-c "SELECT count(*) FROM information_schema.schemata WHERE schema_name = 'pgboss';"` | `tokens_cuenta_hash_token_key`, `tokens_cuenta_pkey`, `tokens_cuenta_usuario_id_idx`; `pgboss` = `0` (todavía nadie arrancó pg-boss en `campus_dev`) |
| V-10 | Tras los pasos 8 a 10: `npx vitest run test/cola.integracion.test.ts` desde `backend/` | 8 en verde: el encolado transaccional funciona, se revierte y las colas tienen la retención de N-02. Si no: PA-06/PA-07 |
| V-11 | `npm run typecheck` y `npm run lint` en `backend/` tras los handlers | Código 0, sin `any` |
| V-12 | `npm test` desde `backend/` (salida a `tmp/v12.log`); duración; `Select-String -Path tmp\v12.log -Pattern FSTDEP` | Todo en verde, salvo FE-01 con la salida esperada y solo en la ronda 1 de 02a; `FSTDEP` = 0; duración reportada. Si no: PA-11, PA-12 o PA-13 |
| V-13 | `Select-String` sobre `backend/src`, sin `*.test.ts` (patrones debajo de la tabla) | Resultados esperados debajo de la tabla |
| V-14 | **(a)** `npx eslint --config ../eslint.config.mjs` sobre un archivo temporal `backend/src/handlers/tmp-prueba-lint.ts` con `import "../adapters/notifier/index.js"`. **(b), N-01:** sobre dos temporales, `backend/src/handlers/tmp-prueba-executesql.ts` y `backend/src/workers/tmp-prueba-executesql.ts`, cada uno con `export const probar = (sql: { executeSql: (texto: string) => Promise<unknown> }): Promise<unknown> => sql.executeSql("SELECT 1")`. **(c)** `npx eslint --config ../eslint.config.mjs src/adapters/db/cliente.ts src/adapters/queue/index.ts`. **(d)** `npx eslint --config ../eslint.config.mjs --print-config src/handlers/admin.ts` y comprobar en la salida que `no-restricted-imports` conserva `soloEnAdapters` y `clienteGenerado` y que `no-restricted-syntax` tiene los dos selectores. Borrar los tres temporales al terminar | (a) falla con el mensaje del bloque de `notifier`; (b) los dos fallan con el mensaje `sqlSoloEnAdapters`; (c) pasa; (d) ambas reglas completas. Temporales borrados (V-22) |
| V-15 | `npm run build` en `backend/` | Código 0 |
| V-16 | **Canal fuera de `prod`**, desde `backend/`, con PID propio (comandos debajo de la tabla) | Primer arranque: `"canalCorreo":"registro"` y `re_llave_falsa_de_v16` **no** aparece. Segundo: código 1 con `RESEND_API_KEY: obligatoria en production` y las demás que falten o se rechacen (por ejemplo, `CORREO_REMITENTE`), sin valores. Si no: PA-10 o PA-17 |
| V-17 | **Humo en `campus_dev`** (resumen debajo de la tabla; comandos detallados tras la tabla de hashes) | `201`; `204` en las solicitudes permitidas y `429` en las demás; tiempos reportados (informativo, no es un umbral); exactamente un HTML nuevo por solicitud atendida de la cuenta existente y ninguno de la inexistente; flujo completo como se describe; **0** coincidencias en los logs; huella idéntica. Si no: PA-14, PA-15 o PA-17 |
| V-18 | Con el esquema `pgboss` ya creado: `npx prisma migrate status`; `npx prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --exit-code; "codigo=$LASTEXITCODE"`; y la consulta de `pgboss` de V-09 | "up to date"; `codigo=0`; `pgboss` = `1`. Si no: PA-09 |
| V-19 | **Solo AUTH-02b.** Frontend desde `frontend/`: `npm test`, `npm run build`, `npm run lint`; `Select-String -Path src -Recurse -Pattern "localStorage\|sessionStorage"`; `Select-String -Path src -Recurse -Include *.ts,*.tsx -Pattern "fetch\("` sin pruebas; `Select-String -Path src\features\admin -Recurse -Pattern "@/features/auth"` | Verde; almacenamiento solo en comentarios existentes; `fetch(` solo en `apiClient.ts`; `features/admin` no importa de `features/auth` |
| V-20 | Prettier acotado (lista de "Qué autoriza" de la parte); **tres corridas completas** de `npm test` desde la raíz (backend y frontend, en las dos partes), cada una con salida a `backend/tmp/corrida-<n>.log` (redirección a archivo, sin tubería); `npm run lint` y `npm run build` desde la raíz; 90 s después, `docker ps -a --filter "label=org.testcontainers=true"`. Desde la ronda 3 de 02a (Enmienda 2), además: `Select-String -Path backend\tmp\corrida-*.log -SimpleMatch -Pattern "40P01","deadlock detected","could not serialize"` | Las tres en verde, salvo FE-01 solo en la entrega de la ronda 1 de 02a; conteos por corrida; `FSTDEP` = 0; lint y build en verde; ningún contenedor; desde la ronda 3, 0 coincidencias de la búsqueda de bloqueos. Si no: PA-11, PA-13, PA-16 o PA-19 |
| V-21 | Hashes de V-02 otra vez; `Select-String` de `.skip`, `.only`, `.todo`, `.fails`, `skipIf`, `runIf`, `xit`, `xdescribe` en las pruebas | Idénticos a la tabla vigente; sin coincidencias nuevas |
| V-22 | Árbol de trabajo y archivos protegidos (comandos y resultados esperados debajo de la tabla) | **02a:** solo los archivos de 02a, sin temporales de V-14 ni HTML de correo (PA-15). **02b:** solo los de 02b |
| V-23 | Comandos nuevos o cambiados del README, ejecutados tal cual en `powershell.exe -NoProfile` (los que no necesitan navegador). En 02a, los de "Backend en local"; en 02b, los de "Frontend en local" | Cada uno con su salida |

**V-05, puntos a reportar con archivo y línea:**
- pg-boss:
  - el tipo de la opción `db` de `send` (`types.d.ts:17`);
  - `createJob` (`manager.js:1150-1161`): ¿`executeSql(sql, [JSON.stringify([job])])` con un único `$1`?;
  - `plans.insertJobs` (`plans.js:2018-2141`): ¿una sola sentencia?, ¿qué se interpola en el texto?, ¿la validación del nombre (`attorney.js:88`)?;
  - `fromPrisma` (`dist/adapters/prisma.js`, `index.d.ts:117`): ¿mismo código que `ejecutorSqlDe`?;
  - qué devuelve `send` con un id repetido;
  - `createQueue`: si es idempotente, que no actualiza una cola existente y que exige la cola de fallidos antes (`manager.js:1888-1892`);
  - los nombres de las opciones de reintento, `deadLetter`, `retentionSeconds` y `deleteAfterSeconds` (`QUEUE_DEFAULTS`, `plans.js:83-92`);
  - `getQueue`, `getJobById` (`index.d.ts:64`), `stop` (`types.d.ts:1094`) y el mínimo de `pollingIntervalSeconds` (`attorney.js:585`);
  - los nombres de las columnas `name`, `data`, `state` y `created_on` de `pgboss.job`.
- resend:
  - si lanza o devuelve `error` ante un fallo de red (`index.mjs:1352-1362`);
  - qué hace con una llave vacía (`index.mjs:1278-1280`);
  - la lectura de `RESEND_BASE_URL` (`index.mjs:1253`).

**V-13, patrones:** `from "pg-boss"`, `from "resend"`, `new Resend(`, `adapters/notifier` en `handlers/` y `middleware/`, `estadoPago` en los archivos nuevos, `\$queryRawUnsafe`, `\$executeRawUnsafe`, `executeSql`, `console.` y, desde la ronda 3 (Enmienda 2), `\$queryRaw(?!Unsafe)`.

**V-13, resultados esperados:**
- `pg-boss` solo en `adapters/queue/index.ts`.
- `resend` y `new Resend(` solo en `adapters/notifier/resend.ts`.
- Ninguna importación de `notifier` en `handlers/` ni en `middleware/`.
- `estadoPago`: en ninguno de los archivos nuevos.
- **`$queryRawUnsafe`: exactamente una coincidencia**, en `adapters/db/cliente.ts`, dentro de `ejecutorSqlDe`.
- `$executeRawUnsafe`: ninguna.
- **`executeSql`** solo en `adapters/db/cliente.ts` (interfaz y `ejecutorSqlDe`) y, si aparece, en `adapters/queue/`. Ninguna en `handlers/`, `workers/`, `middleware/`, `core/`, `config/`, `app.ts`, `server.ts` ni `worker.ts`.
- `console.` solo donde ya estaba.
- **`$queryRaw` etiquetado (desde la ronda 3):** solo en `adapters/db/salud.ts` y `adapters/db/bloqueo-usuario.ts`.

**V-16, comandos (PowerShell, desde `backend/`):**
1. Primer arranque, con una llave falsa y fuera de `production`: `$env:RESEND_API_KEY = "re_llave_falsa_de_v16"; try { $p = Start-Process -FilePath node -ArgumentList "--env-file-if-exists=.env","dist/worker.js" -RedirectStandardOutput tmp\v16.out.log -RedirectStandardError tmp\v16.err.log -PassThru -NoNewWindow; $p.Id \| Set-Content tmp\v16.pid } finally { Remove-Item Env:RESEND_API_KEY }`.
2. Esperar hasta 20 s a `worker_listo` y detener el proceso con `taskkill /PID <pid> /T /F`.
3. `Select-String -Path tmp\v16.*.log -SimpleMatch -Pattern "canalCorreo","re_llave_falsa_de_v16"`.
4. Segundo arranque: `NODE_ENV=production` y un `JWT_SECRET` de 48 caracteres aleatorios en el entorno del mismo comando, **sin** `RESEND_API_KEY`.

**V-17, resumen:**
- Huella de las cuentas del humano antes de empezar.
- API y worker desde `dist/`, cada uno con su PID.
- Registro de `v17-<uuid>@pruebas.local`.
- `recuperar` para ese correo y para `v17-inexistente-<uuid>@pruebas.local`: 10 veces cada uno, alternando, con `-w "%{http_code} %{time_total}"` y respetando el límite (3 por correo; en el resto se espera `429`).
- Esperar hasta 15 s el HTML en `backend/tmp/correos/` y extraer el token con `#token=([A-Za-z0-9_-]{43})`.
- `restablecer` → `204`; login con la nueva → `200` y con la vieja → `401`; reutilizar el token → `400`.
- `Select-String` de los logs de la API y del worker contra el token, `#token=`, las contraseñas y `re_llave_falsa_de_v16`.
- Detener ambos por PID; `DELETE` del usuario propio; huella después.

**V-22, comandos:**
- `git status --short --untracked-files=all`.
- `git diff --quiet -- infra tsconfig.base.json backend/tsconfig.json backend/vitest.config.ts backend/prisma.config.ts frontend/vite.config.ts .prettierrc.json .prettierignore .gitignore .gitattributes AGENTS.md CLAUDE.md .claude docs/ARCHITECTURE.md docs/ARCHITECTURE-ESSENTIALS.md docs/PRD.md backend/src/handlers/auth/cookie.ts backend/src/server.ts backend/src/scripts backend/prisma/migrations/20260922015711_extensiones_iniciales backend/prisma/migrations/20260923143021_usuarios_y_sesiones; "codigo=$LASTEXITCODE"`. Desde la Enmienda 2, `backend/src/handlers/auth/index.ts` ya no está en esta lista.
- En 02a (Enmienda 2): `git diff -U0 -- backend/src/handlers/auth/index.ts`; todos sus fragmentos caen dentro del manejador de `POST /login`.
- En 02a, además: `git diff --quiet -- frontend; "codigo=$LASTEXITCODE"` y `git status --short --untracked-files=all -- frontend`, que debe salir vacío.
- En 02b, en su lugar: `git diff --quiet -- backend shared eslint.config.mjs; "codigo=$LASTEXITCODE"` y `git status --short --untracked-files=all -- backend shared`, que debe salir vacío.
- `git ls-files --eol` sobre lo nuevo.

**V-22, resultados esperados:**
- **02a:**
  - `git status` muestra solo los archivos de 02a en "Cambios por capa" y "Raíz y archivos transversales", la carpeta de migración, `docs/trabajo/AUTH-02-…` y `docs/ESTADO.md`.
  - `codigo=0` en las dos comprobaciones.
  - El diff de `backend/src/handlers/auth/index.ts` se limita al bloque de `POST /login` (Enmienda 2); el humano lo revisa aparte.
  - **`frontend/` sin ningún cambio ni archivo nuevo.**
  - Ningún temporal de V-14 y ningún HTML de correo (PA-15). Todo en `w/lf`.
- **02b:**
  - `git status` muestra solo los archivos de `frontend/`, `README.md`, `docs/trabajo/AUTH-02-…` y `docs/ESTADO.md`.
  - `codigo=0` en las dos comprobaciones; `backend/` y `shared/` sin cambios. Todo en `w/lf`.

**Las 14 pruebas del Tester y su SHA-256** (vigentes para la ronda 1 de AUTH-02a: las 13 de la tabla V-03 de CHORE-01 y `auth-login.ataque` con el hash nuevo de `CHORE-01/reporte-tester.md:91`; compara sin distinguir mayúsculas). Desde la ronda 2 de AUTH-02a y en AUTH-02b vale la tabla que publique el Tester (tarea heredada 3).

| Archivo | SHA-256 |
|---|---|
| `backend/test/auth-login.ataque.test.ts` | `2c83d82d10bdd9b7a969768774d75b18b7a71a594bbaac5fae36a0e134d2336c` |
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

Si un hash de V-02 no coincide pero el orquestador confirma que es el de la rama base, se actualiza esta tabla en el resumen y se sigue; si no, PA-02.

**V-17, comandos (PowerShell, desde `backend/`; los cuerpos JSON se escriben primero en `tmp\v17-*.json`):**
1. Huella de las cuentas del humano, desde `infra/`: `docker compose exec -T postgres psql -U campus -d campus_dev -At -c "SELECT string_agg(id || ':' || email || ':' || rol || ':' || debe_cambiar_contrasena || ':' || actualizado_en::text, '|' ORDER BY id) FROM usuarios WHERE email NOT LIKE '%@pruebas.local';" > ..\backend\tmp\huella-cuentas-antes.txt`.
2. API: `$api = Start-Process -FilePath node -ArgumentList "--env-file-if-exists=.env","dist/server.js" -RedirectStandardOutput tmp\v17-api.out.log -RedirectStandardError tmp\v17-api.err.log -PassThru -NoNewWindow; $api.Id | Set-Content tmp\v17-api.pid`. El worker, igual, con `dist/worker.js` y `tmp\v17-worker.*`. Esperar `Server listening` y `worker_listo`, como máximo 30 s cada uno; si no llegan, PA-17.
3. `curl.exe -s -o NUL -w "%{http_code}" -H "Content-Type: application/json" --data-binary "@tmp\v17-registro.json" http://127.0.0.1:3000/api/auth/registro` → `201`.
4. Solicitudes de recuperación, con `-w "%{http_code} %{time_total}"` y `--data-binary "@tmp\v17-recuperar-existe.json"` / `"@tmp\v17-recuperar-no-existe.json"`.
5. Token: `Get-ChildItem tmp\correos -Filter *.html | Sort-Object LastWriteTime | Select-Object -Last 1 | Select-String -Pattern "#token=([A-Za-z0-9_-]{43})"`. El token se escribe en `tmp\v17-restablecer.json` **sin imprimirlo en la consola ni en el resumen**.
6. `restablecer`, login con la nueva y con la vieja, y reutilización (códigos esperados en la tabla).
7. `Select-String -Path tmp\v17-*.log -SimpleMatch -Pattern "#token=", "<token>", "<contraseñas de la prueba>", "re_llave_falsa_de_v16"` → 0 coincidencias (reportar solo el conteo).
8. `taskkill /PID <api> /T /F` y `taskkill /PID <worker> /T /F`.
9. Desde `infra/`: `docker compose exec -T postgres psql -U campus -d campus_dev -c "DELETE FROM usuarios WHERE email = 'v17-<uuid>@pruebas.local';"` (única escritura manual autorizada). Después, la huella en `huella-cuentas-despues.txt`; `Compare-Object` no debe dar salida.
10. Borrar los HTML propios de `tmp\correos\`, `tmp\v17-*.json` y los `*.pid`.

## Pasos de implementación

### AUTH-02a (rama `feat/auth-02a-cuentas-backend`)
1. **V-01 y V-02.** Sin la regla del firewall, la rama correcta y los hashes no se hace nada más (PA-01, PA-02).
2. **V-03.** Sin las salidas de `npm view` no se edita nada (PA-03).
3. Editar `backend/package.json` (dos dependencias) y correr `npm install` desde la raíz. **V-04** (PA-04, PA-05).
4. **V-05**, solo lectura de `node_modules/` (PA-06). Anotar cada **[verificar]** con archivo y línea.
5. `shared/src/cuentas.ts` e `index.ts`. **V-06.**
6. `core/`: `auth/{tokens-cuenta,recuperacion,contrasena-temporal,cambio-de-contrasena,respaldo,enlaces}.ts`, `correo/{notifier,plantillas,fallos}.ts` y `eventos/correo-de-cuenta.ts`, con sus pruebas.
   - Configuración: `config/correo.ts` con su prueba, incluido N-05; `config/cola.ts`; exportar `salirPorConfiguracionInvalida` en `config/env.ts`; `redact` en `config/logger.ts`.
   - Correr `npx vitest run src/core src/config` desde `backend/`. Necesita la precondición de V-01: toda corrida levanta la base desechable.
7. `schema.prisma` (DEC-01). **V-07** (`--create-only`, PA-08), **V-08** (aplicar y comprobar la deriva, PA-09) y **V-09.** Todo esto va **antes** de que nada arranque pg-boss en `campus_dev`.
8. `adapters/auth`: `estado.ts`, `index.ts`, `contrasenas.ts`, `tokens-cuenta.ts`, `contrasena-temporal.ts`; y `test/tokens-de-cuenta.test.ts`.
9. `adapters/db`: `cliente.ts` (`EjecutorSql`, `ejecutorSqlDe`), `tokens-cuenta.ts` (con la comprobación de tipos y N-04), `usuarios.ts`, `errores.ts` solo si hace falta, e `index.ts`.
10. Cola:
    - `adapters/queue/{colas,index}.ts`, con la retención de N-02 y `describirCola`.
    - `test/preparar-cola.ts`, con `validarUrlDePruebas` (N-06), y el paso nuevo en `test/global-setup.ts`.
    - `test/cola.integracion.test.ts`.
    - **V-10: la compuerta del encargo** (PA-06, PA-07). Si falla, no se sigue.
11. `adapters/notifier/{index,resend,registro}.ts`, con la llave no vacía en `resend.ts`; `test/notifier-registro.test.ts`, `test/notifier-resend.test.ts` y `test/notifier-en-memoria.ts`.
12. Handlers:
    - `middleware/rutas-publicas.ts` y su README (con el `409` del restringido sin bandera).
    - `handlers/validacion.ts`, `handlers/auth/cuentas.ts` y `handlers/admin.ts`.
    - Los READMEs de `handlers/` y `adapters/`, con las notas de `createQueue` y `RESEND_BASE_URL`.
    - `app.ts`, con `iniciarCola` justo después de `Fastify(...)`.
    - Los dos bloques nuevos de `eslint.config.mjs`.
    - **V-11**, **V-13** y **V-14.**
13. `workers/{correo-de-cuenta,index}.ts`, su README y `src/worker.ts`.
14. `test/ayudas-cuentas.ts` (con `buscarTrabajosPorCorreo`) y las pruebas de integración restantes de la tabla. **V-12** (FE-01 esperada; PA-11, PA-12, PA-13).
15. `backend/.env.example`. **V-15**, **V-16**, **V-17** y **V-18.** Aquí el backend queda completo.
22a. `README.md`, secciones "Backend en local" §3, §4, §6, §7, §8 y §9 (textos debajo). **V-23** con los comandos del backend.
23a. **V-20** (Prettier acotado a `backend/`, `shared/` y a las rutas explícitas de la raíz; tres corridas; lint; build), **V-21** y **V-22** (versión 02a).
24a. Añadir a `docs/trabajo/AUTH-02-cuentas-y-correo/resumen-programador.md` la sección "AUTH-02a — ronda N" (en la ronda 1 crea el archivo). Debe llevar:
   - Las salidas de V-01 a V-18 y de V-20 a V-23.
   - **Cada PARADA respondida** ("no se activó" / "se activó y me detuve").
   - Cada **[verificar]** con archivo y línea. En especial: la opción `db`, el SQL de `send` (qué se interpola y qué va en parámetros), `fromPrisma`, la semántica del id repetido, `createQueue`, los nombres de reintentos, `deadLetter` y retención, `stop`, la forma de error de `resend` y la sintaxis de `redact`.
   - La salida literal de FE-01 (solo en la ronda 1); los conteos exactos por archivo; la duración de la suite frente a CHORE-01; los paquetes añadidos por `npm install`.
   - Las desviaciones y lo no verificado (parada ordenada en Windows).
   - La lista de archivos por paso, para que el humano revise el diff por capas.
   - En las rondas siguientes, cada hallazgo del Tester (`T-xx`) respondido uno por uno.

### AUTH-02a — ronda 3 (Enmienda 2; la última)
**Precondición:** la verificación acotada del Manager de la Enmienda 2 está hecha; la confirma el orquestador.
1. V-01 y V-02, con la tabla de hashes de la ronda 2 del Tester (23 archivos) (PA-01, PA-02).
2. Crear `adapters/db/bloqueo-usuario.ts`.
3. En `adapters/db/tokens-cuenta.ts`, usar `bloquearUsuarioParaEscribir` en lugar de la función privada.
4. En `adapters/db/usuarios.ts`, cambiar `restablecerConTemporal`, `cambiarContrasenaPropia` y `actualizarContrasenaYRevocarSesiones`.
5. En `adapters/db/sesiones.ts`, cambiar `crearSesion`, `rotarSesion` y `revocarTodasLasSesiones`.
6. En `handlers/auth/cuentas.ts`, cambiar `cambiar-contrasena` (DEC-09, pasos 5 y 8).
7. En `handlers/auth/index.ts`, cambiar solo el bloque del login (PA-20).
8. Añadir la sección del protocolo a `adapters/README.md`.
9. Crear `test/ayudas-concurrencia.ts` y `test/bloqueo-usuario.integracion.test.ts`.
10. Desde `backend/`: `npx vitest run test/cuentas-r2.ataque.test.ts test/cuentas-r1.ataque.test.ts test/intentos-r2.ataque.test.ts test/sesiones-y-cadena.ataque.test.ts test/bloqueo-usuario.integracion.test.ts` (PA-18, PA-21).
11. Formatear solo estos archivos, desde `backend/`: `npx prettier --write src/adapters/db/bloqueo-usuario.ts src/adapters/db/sesiones.ts src/adapters/db/tokens-cuenta.ts src/adapters/db/usuarios.ts src/handlers/auth/cuentas.ts src/handlers/auth/index.ts src/adapters/README.md test/ayudas-concurrencia.ts test/bloqueo-usuario.integracion.test.ts`.
12. V-11, V-13 y V-15.
13. V-17 otra vez, porque cambian el login y `restablecer`.
14. V-20 (PA-19), V-21 y V-22.
15. Escribir la sección "AUTH-02a — ronda 3" en `resumen-programador.md`:
    - T-07, T-08 y T-09, respondidos uno por uno;
    - la desviación DEC-08 de la ronda 2, que queda formalizada como el paso 0 del protocolo con `FOR NO KEY UPDATE`;
    - las PARADAS de PA-01 a PA-21;
    - los conteos exactos;
    - la lista de archivos, con el diff del bloque del login para la revisión humana.

### AUTH-02b (rama que indique el orquestador; solo después de cerrar AUTH-02a)
1b. **V-01 y V-02** con la tabla vigente de hashes (PA-01, PA-02).
16. Frontend: `services/apiClient.ts` y `apiClient.test.ts`, y el comentario de `services/navegacion.ts`.
17. `features/auth/{types,data,lib,hooks}.ts` y `lib.test.ts`.
18. `features/auth/components/*` nuevos, las cuatro vistas y el aviso en `login-view.tsx`.
19. `app/require-cambio-de-contrasena.tsx`, `require-sesion.tsx`, `require-rol.tsx` y `router.tsx`.
20. `features/admin/*` y `cuentas-view.tsx`.
21. Pruebas del frontend de la tabla. **V-19.**
22b. `README.md`, sección "Frontend en local" §3 (texto debajo). **V-23** con los comandos del frontend.
23b. **V-20** (Prettier acotado a `frontend/` y `README.md`; tres corridas; lint; build), **V-21** y **V-22** (versión 02b).
24b. Sección "AUTH-02b — ronda N" en `resumen-programador.md`, con el mismo contenido aplicable a 02b: las salidas de V-01, V-02 y V-19 a V-23, las PARADAS, las desviaciones, lo no verificado (el flujo en el navegador) y la lista de archivos por paso.

### README.md (lo escribe el Programador)
**AUTH-02a, "Backend en local":**
- **§3:**
  - Las variables de correo: solo las lee el worker, y fuera de `production` no hace falta tocarlas porque tienen valores por defecto.
  - **Aunque pongas una llave, fuera de `production` no sale ningún correo.**
  - En `production`, el remitente de ejemplo se rechaza.
- **§4:** la migración `tokens_cuenta`, y que la API y el worker crean al arrancar el esquema `pgboss` en `campus_dev` (lo gestiona pg-boss, no Prisma; no se toca a mano).
- **§6:**
  - Las rutas nuevas.
  - **La API necesita la base para arrancar (N-03):** si PostgreSQL no responde, la API no arranca y termina con un código distinto de 0, así que primero se levanta `infra/`.
  - En el servidor, Compose la levantará después de que PostgreSQL esté sano (`depends_on` con `healthcheck`, DEPLOY).
- **§7:** los conteos nuevos y el paso de preparar la cola en la base desechable (con su guarda).
- **§8 "Arrancar el worker":**
  - Qué consume (`CORREO_DE_CUENTA` y su cola de fallidos), los reintentos y la retención de 1 día.
  - En desarrollo, cada correo queda como HTML en `backend/tmp/correos/`; se abre con `Invoke-Item`.
  - El enlace apunta a `URL_PUBLICA_FRONTEND` (la SPA de Vite; la pantalla llega con AUTH-02b).
- **§9, problemas frecuentes:**
  - `RESEND_API_KEY: obligatoria en production`.
  - `URL_PUBLICA_FRONTEND: en production debe empezar con https://`.
  - `CORREO_REMITENTE: en production debe usar un dominio propio…`.
  - "No me llega el correo en desarrollo": ¿corre el worker? Mira en `backend/tmp/correos/`.
  - La API no arranca: ¿está en marcha `postgres`?
  - Rotar `JWT_SECRET` invalida los enlaces pendientes.
  - Con el login bloqueado por intentos, la temporal espera 15 min (R-10).

**AUTH-02b, "Frontend en local" §3:** recorrer tres flujos:
- Recuperación: API + worker + Vite; abrir el HTML del correo.
- Invitación: entrar como admin a `/admin`, invitar, abrir el HTML y elegir la contraseña.
- Restablecimiento: buscar la cuenta, restablecer, entrar con la temporal y cambiarla.

## Propuestas para `AGENTS.md`, `CLAUDE.md` y docs
Las aplica el orquestador con autorización del humano (`aprobacion.md`: C-01 a C-06 y los textos de §18 de N-02, N-03 y N-05); no el Programador. Cada texto dice cuándo se aplica.

**Al cerrar AUTH-02a:**
- **`AGENTS.md`, "Comandos", bloque del backend.** Sustituir la línea de `dev:worker` por:
  `npm run dev:worker       # worker de la cola (pg-boss): envía los correos de cuenta; fuera de production los escribe en backend/tmp/correos/ y nunca llama a Resend`
- **ESSENTIALS, "Autorización" (C-01, aprobado por el humano).** Sustituir la viñeta del alumno restringido por:
  "Alumno restringido: solo `GET /me` y `GET /me/estado-pago` (y `POST /auth/cambiar-contrasena` si tiene un cambio pendiente). Sin tokens de LiveKit, archivos ni grabaciones."
- **ESSENTIALS, "Autenticación" (C-06, DEC-03, DEC-05, DEC-14).** Añadir al final de la viñeta de recuperación:
  "La API encola siempre y el worker resuelve la cuenta (no hay recuperación para el admin); límite de 3 por hora por IP + correo en la API y por cuenta en el worker. El token del enlace se deriva de su id con una clave del servidor y viaja en el fragmento de la URL."
- **ESSENTIALS, "Reglas de datos" (M-01, N-01).** Sustituir "SQL crudo solo parametrizado." por:
  "SQL crudo solo parametrizado. El único SQL con texto no literal es el de pg-boss, ejecutado dentro de la transacción de Prisma por `ejecutorSqlDe` (`adapters/db`, único `$queryRawUnsafe`): todos sus datos viajan como parámetros y el texto solo interpola el esquema, la tabla y el nombre de la cola (constantes del código)."
- **ESSENTIALS, "Reglas de datos" (Enmienda 2, Q-E2-5, aprobado por el humano).** Añadir la viñeta:
  "Transacciones que crean, rotan o revocan sesiones, cambian la contraseña o escriben enlaces de un usuario existente: primero su fila de `usuarios` (`FOR SHARE` para crear o rotar su sesión; `FOR NO KEY UPDATE` para lo demás), en READ COMMITTED. Protocolo en `backend/src/adapters/README.md`."
- **`ARCHITECTURE.md` §14, "Reglas de acceso a datos".** Tras "**SQL crudo solo con parámetros.** Nunca se concatena entrada del usuario.", añadir:
  "La única excepción de texto no literal es el SQL de pg-boss que ejecuta `ejecutorSqlDe`; sus datos también viajan como parámetros."
- **`ARCHITECTURE.md` §14, "Reglas de acceso a datos" (Enmienda 2, Q-E2-5, aprobado por el humano).** Añadir:
  "**Protocolo de bloqueo por usuario.** Crear o rotar una sesión bloquea antes la fila del usuario con `FOR SHARE`. Revocar sesiones en bloque, cambiar la contraseña o escribir `tokens_cuenta` la bloquea antes con `FOR NO KEY UPDATE`. Así esas transacciones quedan en serie sin deadlocks, y una revocación siempre ve las sesiones creadas antes que ella. El login solo crea la sesión si el hash que verificó sigue vigente bajo el bloqueo (AUTH-02, Enmienda 2)."
- **§6, "Recuperación de contraseña" (C-01, C-06).** Añadir:
  "`POST /auth/recuperar` no consulta la cuenta: encola siempre `CORREO_DE_CUENTA` y responde 204; el worker decide si envía. `restablecer` y `establecer-contrasena` no inician sesión. `POST /auth/cambiar-contrasena` solo con `debe_cambiar_contrasena`, permitido también con acceso restringido; conserva la sesión actual y revoca las demás."
- **§7, fila `admin` (C-05).** Sustituir "usuarios (alta, baja, `POST /admin/usuarios/{id}/restablecer-contrasena`)" por:
  "usuarios (`POST /admin/maestros` (invitación), `POST /admin/usuarios/buscar`, `POST /admin/usuarios/{id}/restablecer-contrasena`, `PUT /admin/usuarios/{id}/correo`, baja)"
- **§8 (C-02, M-01, N-02).**
  - Sustituir "Idempotencia: `eventId` como `singletonKey`; restricción única `(usuario_id, evento_id)` en `notificaciones`." por:
    "Idempotencia: `eventId` como `id` del trabajo de pg-boss (un segundo envío con el mismo id no crea otro trabajo) y como `idempotencyKey` de Resend; restricción única `(usuario_id, evento_id)` en `notificaciones`."
  - Añadir:
    "El encolado transaccional pasa a pg-boss la conexión de la transacción de Prisma (`db` de `send`) mediante `ejecutorSqlDe` de `adapters/db`, equivalente al adaptador `fromPrisma` que publica pg-boss. `createQueue` no actualiza la política de una cola que ya existe: cambiarla exige `updateQueue`. Las colas de correos de cuenta retienen sus trabajos 1 día."
- **§9, "Reglas" (C-04).**
  - Sustituir "Un correo que Resend rechaza de forma permanente (dirección inexistente) no se reintenta y queda registrado." por:
    "Un correo que Resend rechaza de forma permanente (`400`/`422`, por ejemplo una dirección mal formada) no se reintenta y queda registrado. Un `403` (dominio no verificado o llave inválida) y un fallo de red se tratan como transitorios: tres reintentos y después la cola de fallidos. Los buzones inexistentes se conocen después, como rebote, por webhook (pendiente)."
  - Añadir:
    "El canal lo decide la configuración: Resend solo con `NODE_ENV=production` y llave; cualquier otro caso, `registro` (HTML en `backend/tmp/correos/`)."
- **§14, fila `tokens_cuenta` (C-03).** Sustituir por:
  "`id`, `usuario_id`, `tipo` (`recuperacion` / `invitacion`), `hash_token`, `expira_en`, `usado_en`, `revocado_en`, `creado_en`, `actualizado_en` | `hash_token` único · índice `(usuario_id)` · FK con `ON DELETE CASCADE`"
- **§18, "Requisitos previos a abrir la plataforma".** Añadir estas viñetas:
  - "Worker en `prod` con `RESEND_API_KEY`, `CORREO_REMITENTE` de un dominio verificado en Resend (el worker rechaza en `production` el remitente de ejemplo `@campus.local`) y `URL_PUBLICA_FRONTEND` con `https://` (AUTH-02)."
  - "Archivos de entorno separados para la API y el worker: son la misma imagen, y solo el worker debe recibir `RESEND_API_KEY` y las variables de correo (mínimo privilegio) (AUTH-02)."
  - "La API y el worker necesitan PostgreSQL para arrancar (pg-boss): sus servicios de Compose llevan `depends_on: postgres: condition: service_healthy` (el `healthcheck` de `postgres` ya existe en `infra/docker-compose.yml`) (AUTH-02)."
  - "El usuario de la base puede crear el esquema `pgboss` (AUTH-02)."
  - "Alerta sobre el evento de log `correo_de_cuenta_fallido` (AUTH-02)."
  - "El límite de tasa de `/auth/*` cubre también `POST /auth/recuperar`, que por petición es más barato que el login (sin argon2) y encola un trabajo por solicitud; con `trustProxy`, la llave de su límite propio (IP + correo) también deja de ser la IP de Caddy (AUTH-02)."
  - "Retención de las colas de correos de cuenta: 1 día (`retentionSeconds` y `deleteAfterSeconds` en `adapters/queue/colas.ts`); cambiar la política de una cola que ya existe en la base exige `updateQueue` (AUTH-02)."
- **§20, nueva fila:**
  "D-27 | Token de enlace de cuenta derivado de su id con HMAC (clave HKDF de `JWT_SECRET`); la cola solo lleva el id | Token aleatorio dentro de los datos del trabajo | El token no queda en claro en `pgboss.job` ni en los respaldos (regla 13) y los reintentos reenvían el mismo enlace. El id del token no es secreto (sale en los logs como `trabajoId`): la seguridad descansa en la clave, y filtrar `JWT_SECRET` ya es un compromiso total. Decidido en AUTH-02"

**Al cerrar AUTH-02b:**
- **`CLAUDE.md`, tabla de módulos, fila `admin`.** Añadir al contenido:
  "; provisional: invitar maestro, buscar una cuenta por correo, restablecer su contraseña y corregir su correo (índice de `/admin`), hasta la gestión de usuarios completa".

**Pendientes para encargos siguientes** (registrados en `aprobacion.md`; el orquestador los lleva a `docs/ESTADO.md`):
- **AUTH-02b:** pasos 16 a 21, la sección "Frontend en local" §3 del README y la fila `admin` de `CLAUDE.md`.
- **ADMIN:**
  - **La contraseña temporal no caduca (S-05):** una temporal sin usar sigue sirviendo indefinidamente. Decidir si caduca.
  - La gestión de usuarios completa: lista paginada con búsqueda, alta de alumnos, baja que revoca sesiones, restricción.
  - El reenvío de invitación, si se pide, y el estado "invitación pendiente".
- **DEPLOY:**
  - Los puntos de §18 de arriba: `depends_on` con `healthcheck`, archivos de entorno separados, retención, límite sobre `recuperar` y `trustProxy`.
  - La verificación real de Resend y del dominio (D-26).
- **LIMPIEZA_DIARIA:** purga de `tokens_cuenta` vencidos (con un índice sobre `expira_en`) y de `sesiones`.
- **Correo:** webhooks de rebotes de Resend (C-04); plantilla con los tokens visuales definitivos (S-10).
- **Opcional:** cambio voluntario de contraseña (P-05).
