> Registrado por el orquestador el 2026-09-24: el entorno impidió al `tester` crear este archivo ("Subagents should return findings as text"). El texto de abajo es su entrega, transcrita sin cambios.

# Reporte del Tester — AUTH-02a — Ronda 1

Veredicto: **ROTO**

Verificación propia: lint `verde` (raíz, los tres workspaces) · test `backend 594/601, frontend 69/69` (las 7 en rojo son las pruebas de los hallazgos; ninguna prueba del Programador falla)

## Verificación propia

- **Precondición de red (antes de cualquier corrida del backend):** `Get-NetFirewallRule -DisplayName "Campus: bloquear entrada a Docker en redes publicas"` → `True` / `Inbound` / `Block` / `Public`. `Get-NetConnectionProfile` → `IZZI-F281` / `Public` (declarada de confianza por el humano). Docker `28.5.1`.
- **Hashes de entrada:** las 14 `*.ataque` de la tabla V-02 del plan coincidían exactamente antes de tocar nada.
- **Línea base (sin cambios míos):** `npm test` en `backend/` → 54 archivos, **508/509**; el único rojo era FE-01, con la lista de rutas esperada. Coincide con lo que reportó el Programador.
- **Con mis cambios, tres corridas completas de `npm test` desde la raíz** (salida a archivo, sin tubería):

| Corrida | Backend | Frontend | Duración backend |
|---|---|---|---|
| 1 | 61 archivos · 601 pruebas · 594 ✓ · 7 ✗ | 11 · 69/69 | 23,3 s |
| 2 | ídem, las mismas 7 | 11 · 69/69 | 22,9 s |
| 3 | ídem, las mismas 7 | 11 · 69/69 | 24,0 s |

  Las 7 en rojo son exactamente las pruebas de T-01 a T-06, las mismas en las tres corridas: no hay intermitencia. `FSTDEP` = 0 y `too many clients` = 0 en las tres. Después de la tercera, `docker ps -a --filter "label=org.testcontainers=true"` → vacío.
- `npm run lint` desde la raíz → código 0 (ESLint, Prettier y `tsc` en `shared`, `backend` y `frontend`).
- Formateé solo mis archivos con `npx prettier --write <archivos>` desde `backend/`.
- No toqué código de producción ni pruebas del Programador. No arranqué la API ni el worker contra `campus_dev`. Los procesos que arrancan mis pruebas los arranca y los detiene la propia prueba.

## Tareas heredadas

### 1. FE-01 (`backend/test/sesiones-y-cadena.ataque.test.ts`)
- El caso "bajo /api solo existen las 6 rutas de AUTH-01…" pasa a "bajo /api solo existen las rutas de AUTH-01 y AUTH-02a: ninguna crea admins; solo /admin/maestros crea maestros". La lista **exacta** tiene ahora 16 entradas: las 8 de AUTH-01 y las 8 de AUTH-02a. Cualquier ruta nueva la vuelve a romper.
- Lo que protege se conserva y se refuerza con dos casos nuevos:
  - `POST /api/admin/maestros` exige admin: sin token responde `401`; estudiante y maestro reciben `403 ROL_NO_PERMITIDO` y no se crea ninguna fila.
  - Invitar con `rol: "admin"` en el cuerpo crea un **maestro** y sigue habiendo **un solo** admin.
- Hash nuevo: `6e4b4677d73bde3d7c7845c729637186249e704f2aa803fb5efa25e76126b445`.

### 2. Pendiente de CHORE-01: precondiciones en lugar de `return` temprano
- `sesiones-y-cadena.ataque` ("rama positiva de requireRole(['admin'])"), `auth-registro.ataque` ("no se puede registrar el correo del administrador real") y `api-real.ataque` ("seed:admin con un admin ya creado…"): el `if (!admin) return` pasa a ser `expect(…, "la base desechable debe tener el admin que crea seed:admin")` seguido de un `throw`. Si falta el admin, la prueba falla con un mensaje. Las aserciones que siguen no cambian.
- `admin-unico.ataque`: **retiré la transacción revertida y la creación condicional de un admin propio.** Desde CHORE-01, `global-setup` garantiza exactamente un admin. La prueba ahora:
  - exige como precondición que el admin exista y que el conteo sea 1;
  - crea un estudiante propio e intenta el `UPDATE rol = 'admin'`;
  - exige que el rechazo sea una **violación de unicidad `P2002`** (antes valía cualquier error);
  - comprueba que siga habiendo 1 admin y que el alumno siga siendo `estudiante`;
  - borra al alumno en un `finally`.

  Las aserciones son más estrictas que antes, no más débiles.
- Hashes nuevos: `auth-registro` `73d3a2ae…`, `api-real` `441a766a…`, `admin-unico` `388ad0e5…` (completos en la tabla del final).

### 3. Tabla de hashes vigente
Al final del reporte. Sustituye a la de V-02 desde la ronda 2 de AUTH-02a y en AUTH-02b.

## Hallazgos

### T-01 — Usar a la vez dos enlaces vivos de la misma cuenta produce un deadlock y un `500`
Severidad: **media**

Prueba: `backend/test/cuentas-r1.ataque.test.ts` › "ataque: tokens de enlace" › "invitación y recuperación vivas de un maestro pendiente usadas a la vez: un 204 y un 400, nunca un 500" (línea 341)

Esperado / Obtenido:
- Esperado: una petición responde `204`, la otra `400 ENLACE_INVALIDO`, y no queda ningún enlace vivo.
- Obtenido: `[204, 500]`. El log de la API registra `PrismaClientKnownRequestError … tx.usuario.update() … Transaction failed due to a write conflict or a deadlock` y el cliente recibe `500 ERROR_INTERNO`.

Por qué pasa: `usarTokenYCambiarContrasena` bloquea en este orden:
1. su fila de `tokens_cuenta`;
2. la fila de `usuarios`;
3. los **demás** tokens vivos del usuario.

Dos consumos simultáneos de tokens distintos del mismo usuario se cruzan: A tiene su token y el usuario, y espera el token de B; B tiene su token y espera el usuario. PostgreSQL aborta una de las dos. Los datos quedan consistentes, pero la respuesta no es un error tipado.

El caso es real: S-09 permite que un maestro con la invitación pendiente pida recuperación, así que sus dos enlaces conviven vivos. La misma inversión de orden existe entre `restablecer` y `restablecerConTemporal` o `cambiarContrasenaPropia`: esas dos bloquean primero el usuario y al final los tokens. Esas combinaciones no las probé por separado.

Reproducción: `cd backend; npx vitest run test/cuentas-r1.ataque.test.ts -t "maestro pendiente"`. Para que el cruce sea determinista, la prueba retiene 1,5 s la fila del usuario con `SELECT … FOR UPDATE` mientras lanza `POST /api/auth/establecer-contrasena` con el token de invitación y `POST /api/auth/restablecer` con el de recuperación.

Requisito o regla violada: DEC-08 ("un solo uso resistente a carreras", la respuesta siempre es `400 ENLACE_INVALIDO`); `CLAUDE.md` "Manejo de errores en el backend" (los errores de `adapters/` salen tipados como `AppError`); ESSENTIALS "Errores de API".

### T-02 — El log de la cola de fallidos no identifica el trabajo que falló
Severidad: **media**

Prueba: `backend/test/worker-r1.ataque.test.ts` › "ataque: cola de fallidos" › "el log correo_de_cuenta_fallido identifica el trabajo original…" (línea 134)

Esperado / Obtenido:
- Esperado: `correo_de_cuenta_fallido` lleva `trabajoId` igual al id del trabajo original. Ese id es el `eventId` y también el id de la fila de `tokens_cuenta` (DEC-06), y es el `trabajoId` que ya llevan `recuperacion_omitida`, `correo_rechazado` y `correo_de_cuenta_enviado`.
- Obtenido: `trabajoId` es el id nuevo de la **copia** en la cola de fallidos. La prueba comprueba que el token de ese intento existe con el id original, y el log no lo contiene.

El Programador lo descubrió (desviación 5), pero solo ajustó su ayuda de prueba y dejó igual el consumidor de producción (`workers/index.ts`). Su prueba (`worker-consumidor.integracion`) solo comprueba que exista **algún** `correo_de_cuenta_fallido`, sin mirar el id. Consecuencia: la única señal de un correo de cuenta perdido (RNF-09; DEPLOY la convierte en alerta) no permite saber qué cuenta ni qué enlace fallaron. Con la retención de 1 día (N-02), la copia desaparece pronto. pg-boss 12 expone el id original como `sourceId` cuando se trabaja con `includeMetadata: true` (`dist/plans.js`, `JOB_COLUMNS_ALL`).

Reproducción: `cd backend; npx vitest run test/worker-r1.ataque.test.ts -t "cola de fallidos"`. La prueba usa colas propias con `retryLimit: 0` y un notifier que siempre lanza.

Requisito o regla violada: DEC-15 (el consumidor de fallidos registra `trabajoId`); DEC-06 y C-02 (el id del trabajo es el `eventId`); ESSENTIALS "Asíncrono" (cola de fallidos vigilada).

### T-03 — Un handler obtiene el cliente de Prisma completo
Severidad: **media**

Prueba: `backend/test/arquitectura-cuentas-r1.ataque.test.ts` › "handlers/, middleware/ y workers/ no obtienen el cliente de Prisma (obtenerDb ni adapters/db/cliente)" (línea 89)

Esperado / Obtenido:
- Esperado: `[]`.
- Obtenido: `["handlers/auth/cuentas.ts"]`.

`POST /auth/recuperar` importa `ejecutorSqlDe`, `enTransaccion` y `obtenerDb` directamente de `../../adapters/db/cliente.js` y abre una transacción interactiva desde el handler (`cuentas.ts:90`).

`adapters/db/index.ts` no reexporta `obtenerDb` "a propósito; solo las pruebas lo importan directamente desde ./cliente.js". Esa es la garantía de AUTH-01 (DEC-10; su V-17 busca `obtenerDb` fuera de `adapters/db` y espera cero resultados). El plan tampoco lo pide: DEC-04 y "Flujo de las peticiones" dicen `encolar(CORREO_DE_CUENTA, …, { id: randomUUID() })`, sin transacción.

El resumen del Programador no lo declara como desviación. Ningún bloque de ESLint lo detecta, porque `no-restricted-imports` solo prohíbe `adapters/db/generated` y las librerías.

Reproducción: `cd backend; npx vitest run test/arquitectura-cuentas-r1.ataque.test.ts`.

Requisito o regla violada: `AGENTS.md` regla 1 ("Los handlers son delgados"; Prisma solo en `adapters/db`); AUTH-01 DEC-10; plan DEC-04.

### T-04 — El `redact` no censura `token`, `contrasenaTemporal` ni `enlace` en la raíz del objeto de log
Severidad: **media**

Prueba: `backend/src/config/logger.ataque.test.ts` › "token, contrasenaTemporal y enlace en la raíz del objeto de log se censuran" (línea 39)

Esperado / Obtenido:
- Esperado: `log.info({ token, contrasenaTemporal, enlace })` sale con `[oculto]`.
- Obtenido: los tres valores salen en claro.

La tabla `backend/config/` del plan fija nueve rutas: `req.body.contrasenaActual`, `req.body.contrasenaNueva`, `req.body.token`, **`contrasenaTemporal`, `token`, `enlace`**, `*.contrasenaTemporal`, `*.token` y `*.enlace`. `config/logger.ts` omite las tres de la raíz. En pino, `*.token` solo alcanza un nivel de anidación.

Hoy ningún `log.*` de producción pasa esas claves en la raíz. Aun así, es la defensa de la regla 13 y no hace lo que el plan especifica. La omisión no está declarada. Las variantes anidadas y las de `req.body.*` sí funcionan (dos casos en verde del mismo archivo).

Reproducción: `cd backend; npx vitest run src/config/logger.ataque.test.ts`.

Requisito o regla violada: `AGENTS.md` regla 13 ("nada de esto aparece en logs"); plan, fila `config/logger.ts`.

### T-05 — Un `:id` demasiado largo o mal codificado responde fuera del formato de error y repite la URL
Severidad: **baja**

Prueba: `backend/test/cuentas-r1.ataque.test.ts` › "ataque: rutas del admin" › "un :id 5 KB → 4xx con el formato de error de la API y sin eco del valor" y "un :id codificación rota → …" (línea 568)

Esperado / Obtenido:
- Esperado: un 4xx con `{ "error": { "codigo", "mensaje" } }`, sin repetir lo recibido.
- Obtenido, con un `:id` de 5 KB: `414 {"error":"Bad Request","code":"FST_ERR_MAX_PARAM_LENGTH","message":"'/api/admin/usuarios/aaaa…' is exceeding the max param length","statusCode":414}`.
- Obtenido, con `%E0%A4%A`: `400 {"error":"Bad Request","code":"FST_ERR_BAD_URL","message":"'/api/admin/usuarios/%E0%A4%A/restablecer-contrasena' is not a valid url component"}`.

Las rutas con `:id` de AUTH-02a son las primeras paramétricas bajo `/api`. El enrutador de Fastify corta estas peticiones antes del handler y de `manejoDeErrores`. El `apiClient` del frontend (AUTH-02b) espera el formato del proyecto. El eco solo devuelve la entrada del propio solicitante, en JSON.

Reproducción: `cd backend; npx vitest run test/cuentas-r1.ataque.test.ts -t ":id"`.

Requisito o regla violada: ESSENTIALS "Operación" ("Errores de API: `{ "error": { "codigo", "mensaje" } }`"); `handlers/validacion.ts` y el plan (validación "sin el valor").

### T-06 — La política de 3 solicitudes por hora está duplicada en el handler
Severidad: **baja**

Prueba: `backend/test/arquitectura-cuentas-r1.ataque.test.ts` › "los handlers no declaran políticas de límite propias: la política vive en core/" (línea 97)

Esperado / Obtenido:
- Esperado: `[]`.
- Obtenido: `["handlers/auth/cuentas.ts"]`.

`cuentas.ts` declara su propia `POLITICA_SOLICITUDES_RECUPERACION: PoliticaIntentos = { maximo: 3, ventanaMs: 3_600_000 }`. `core/auth/recuperacion.ts` ya exporta una constante con el mismo nombre, que usa el tope durable del worker. El plan (DEC-05 y tabla `core/`) pone la política en `core/`. Con dos fuentes, el límite de la API y el del worker pueden divergir sin que ninguna prueba lo note.

Reproducción: `cd backend; npx vitest run test/arquitectura-cuentas-r1.ataque.test.ts`.

Requisito o regla violada: plan DEC-05 y tabla `backend/core/`; `CLAUDE.md` ("No dupliques datos entre módulos"; las reglas de negocio van en `core/`).

## Atacado sin hallazgos

Todas estas pruebas quedan en verde.

- **Enumeración por `/auth/recuperar`** (`cuentas-r1`):
  - Cuentas existente, inexistente, inactiva, admin y maestro pendiente: mismo estado, cuerpo vacío y **mismos encabezados** (sin contar `date`).
  - Con `usuarios` bloqueada por `LOCK TABLE … ACCESS EXCLUSIVE`, `recuperar` responde `204` sin esperar: no depende de `usuarios`.
  - El `429` es idéntico para un correo existente y uno inexistente, y no repite el correo.
  - Un email como arreglo, de 10 KB, `null`, objeto `$ne` o inyección responde `400 VALIDACION` sin eco.
- **Tokens de enlace:**
  - El token de A con el id y el correo de B en el cuerpo solo cambia a A.
  - Token vacío, de 10 KB, fuera de base64url, número, `null`, arreglo u objeto → `400` sin `500`.
  - Un token con espacios alrededor no vale y no consume el token.
  - Vencido por 1 ms → `400`; uno que vence en 5 s → `204`.
  - Revocado de punta a punta por una corrección de correo y por un restablecimiento del admin.
  - Ni `tokens_cuenta` ni `pgboss.job` contienen el token.
  - El token no se obtiene del id con `JWT_SECRET` directo ni con SHA-256: hace falta la clave HKDF.
  - La base guarda solo el SHA-256.
- **Cambio obligatorio:**
  - Con la cookie de **otro** usuario, la sesión ajena no se conserva ni se revoca, y todas las del que cambia quedan revocadas.
  - Un restringido con la bandera cambia la contraseña; después `/me` → `200`, las rutas de admin → `403 ACCESO_RESTRINGIDO` y un segundo cambio → `409`.
  - Un restringido sin la bandera → `409`, sin tocar la contraseña ni las sesiones.
  - Tras 5 temporales incorrectas, la 6.ª **con la temporal correcta** también es `429` y la bandera sigue activa.
  - Con la bandera, `GET /me` y las 4 rutas de admin → `403 CAMBIO_DE_CONTRASENA_REQUERIDO`.
- **Admin:**
  - Restablecer al admin, con el id en mayúsculas → `403 OPERACION_NO_PERMITIDA`; su hash, su bandera y su rol no cambian.
  - Restablecer a un estudiante con `rol: "admin"` en el cuerpo no lo promueve (sigue 1 admin).
  - Ids manipulados (inyección, `;DROP`, uuid entre llaves, sin guiones, 90 caracteres) → `400 VALIDACION` sin eco en las dos rutas con `:id`.
  - Corregir a un correo usado con mayúsculas y espacios, o al del admin → `409`, sin cambios.
  - `buscar` a un alumno deudor y restringido devuelve exactamente `activo`, `email`, `id`, `nombre` y `rol`.
  - Invitar con banderas en el cuerpo (`rol`, `activo`, `estadoPago`, `accesoRestringido`, `debeCambiarContrasena`, `hashContrasena`) las ignora.
  - Doble invitación concurrente → un `201` y un `409`, con un usuario y un token.
- **Encolado transaccional y ejecutor SQL:**
  - Encolar la invitación en una cola inexistente (pg-boss falla dentro de la transacción) no deja usuario ni token.
  - `executeSql` con dos sentencias **y parámetros** falla, y la segunda no se ejecuta (la tabla no existe).
  - Un valor malicioso como parámetro viaja como dato.
- **Worker** (`worker-r1`, `cuentas-r1`):
  - Datos basura (`null`, cadena, arreglo, tipo desconocido, correo numérico o de 10 KB, `__proto__`) → `omitido`, sin lanzar ni enviar.
  - Un trabajo de recuperación con el id de una invitación viva no envía nada.
  - Cuatro solicitudes desde cuatro IPs para la misma cuenta: la API acepta las 4 y el worker envía solo 3, con un único enlace vivo.
  - El correo del admin, con mayúsculas y espacios, nunca produce enlace ni correo.
  - Una invitación cuyo correo corrigió el admin antes de procesarse no sale a ninguna dirección.
- **El log serializado del worker** (pino real con `opcionesDeLogger`, canal `registro` real en un directorio temporal) no contiene en ningún camino (enviado, rechazado, omitido, invitación) direcciones, nombres, `#token=`, tokens ni rutas de enlace.
- **Logs de la API real** (`logs-cuentas-r1`, proceso con `tsx`, `LOG_LEVEL=trace`, log completo verificado con centinela): recorrí las 8 rutas nuevas. En el log no aparecen la contraseña inicial, la temporal, la temporal incorrecta, las dos contraseñas nuevas, el token de enlace válido, el token basura, la contraseña del admin, los dos JWT ni las dos cookies.
- **Configuración del correo** (`correo.ataque`):
  - En `production` se rechazan cinco variantes del remitente de ejemplo (mayúsculas, espacios, con y sin `<…>`, espacios dentro de `<…>`, nombre entre comillas), y también el remitente ausente (su valor por defecto es el de ejemplo).
  - Una llave hecha solo de espacios cuenta como ausente.
  - Ningún mensaje repite valores.
  - Las URL `javascript:`, `file:` y `ftp:` se rechazan también en `development`.
  - En `development` y `test`, con llave y remitente propios, el canal es `registro`.
  - `crearNotifier` con `resend` fuera de `production`, o sin llave, lanza sin tocar el cliente; `crearCanalResend` con una llave de espacios y tabuladores, también.
  - Un `422` no deja en el motivo la dirección, el enlace ni el `message` del proveedor.
- **Arranque** (`arranque-r1`):
  - La API con la base caída sale sola con código distinto de 0, sin `Server listening` y sin la contraseña de la URL (N-03).
  - El worker en `production` sin llave y con el remitente de ejemplo sale con código 1 y no imprime valores.
  - `test/preparar-cola.ts` contra `campus_dev` se niega antes de conectarse y no imprime la URL.
- **Revisión estática** (`arquitectura-cuentas-r1`, sin comentarios):
  - `pg-boss` solo en `adapters/queue/index.ts`, incluido `import()` dinámico.
  - `resend` y `new Resend(` solo en `adapters/notifier/resend.ts`.
  - `adapters/notifier` solo en `adapters/` y `worker.ts`. Esta búsqueda también detecta un `import()` dinámico, que la regla `no-restricted-imports` de ESLint 10 no revisa.
  - Exactamente un `$queryRawUnsafe` (`adapters/db/cliente.ts`) y ningún `$executeRawUnsafe`.
  - `executeSql` solo dentro de `adapters/`, incluidos los accesos con corchetes y la desestructuración.
  - Sin `console.` ni `estadoPago` en los archivos nuevos.
  - Sin AWS ni otras librerías de correo o de cola en los cuatro `package.json`.
- **FE-01 y un solo admin** (sección de tareas heredadas).

## No atacado y por qué

- **Frontend (AUTH-02b):** todavía no existe.
- **Resend real y entregabilidad:** prohibido llamar a Resend. El canal `resend` se probó solo con clientes dobles.
- **Parada ordenada ante `SIGTERM` en Windows:** `ChildProcess.kill()` termina a la fuerza. Es la misma limitación que declaró el Programador.
- **Humo V-17 en `campus_dev`:** no está autorizado para el Tester y no hace falta: los logs de la API real se probaron contra la base desechable. No arranqué el worker como proceso real, porque competiría por la cola `CORREO_DE_CUENTA` compartida con otros archivos de prueba. Su log se probó en proceso, con el mismo pino.
- **Las otras combinaciones de T-01** (`restablecer` frente al restablecimiento del admin, y `restablecer` frente a `cambiar-contrasena`): tienen la misma causa (orden de bloqueo) y no las probé por separado.
- **Evasión deliberada del bloque `no-restricted-syntax` con una llave calculada** (`sql["execute" + "Sql"]`): ni ESLint ni una búsqueda de texto pueden detectarla. Exige mala fe y queda como riesgo residual aceptado por el diseño de N-01.
- **`executeSql` con varias sentencias y sin parámetros:** con `values` vacío, `pg` usa el protocolo simple, que sí admite varias sentencias. pg-boss siempre manda `$1`, así que hoy no hay camino. No lo probé: el plan acota la defensa al caso con parámetros.
- **Remitente `…@campus.local.`, con punto final:** según `dominioDelRemitente` no se rechaza. Es el mismo FQDN, pero está fuera de las variantes que fija N-05 (mayúsculas, espacios, `<…>`). Solo lo observé leyendo el código, sin prueba.
- **Tiempos de respuesta estadísticos de `recuperar`:** por construcción, el camino es idéntico. Lo comprobé con la tabla bloqueada en lugar de medir distribuciones.
- **Límites en memoria tras reiniciar el proceso:** están aceptados por escrito (S-12).

## Tabla de hashes vigente (SHA-256) de todas las `*.ataque`

Vigente desde la ronda 2 de AUTH-02a y en AUTH-02b. "Nuevo" significa que el archivo se creó en esta ronda; "cambió", que su hash cambió en esta ronda.

| Archivo | SHA-256 | Estado |
|---|---|---|
| `backend/test/auth-login.ataque.test.ts` | `2c83d82d10bdd9b7a969768774d75b18b7a71a594bbaac5fae36a0e134d2336c` | sin cambios |
| `backend/test/auth-registro.ataque.test.ts` | `73d3a2ae708a0ef676547a8094115b1419423057378387269bc3eadb34c7724e` | cambió (tarea 2) |
| `backend/test/sesiones-y-cadena.ataque.test.ts` | `6e4b4677d73bde3d7c7845c729637186249e704f2aa803fb5efa25e76126b445` | cambió (FE-01 y tarea 2) |
| `backend/test/api-real.ataque.test.ts` | `441a766a94e7d9b26807790402e06ed94d4cc378d8f6ecf0bccc3259c7ff55fb` | cambió (tarea 2) |
| `backend/test/admin-unico.ataque.test.ts` | `388ad0e585639b8c3e0e0a6657fb42c1b9cb83db721c4863c4fa19e0be42ec85` | cambió (tarea 2) |
| `backend/src/config/env.ataque.test.ts` | `4fce3cedf662ba3a188f21a2277db417747d342c115efd4746d3cff58499289b` | sin cambios |
| `frontend/src/services/apiClient.ataque.test.ts` | `10c730348d18ff8dae7b3623751d31122aa58560b564ad191717fa1938a6f8ce` | sin cambios |
| `frontend/src/app/router.ataque.test.tsx` | `e58293532633dc5cfe21561e2609d170638c81886b9c31129f03864c73a34f45` | sin cambios |
| `backend/test/intentos-r2.ataque.test.ts` | `a8b79d5ad98270be3747f493865708a78bb73add08d832584db4464c3582777a` | sin cambios |
| `backend/test/guarda-r2.ataque.test.ts` | `ea078f41cc98c947d9b3966ee8eccec2bd5d06eacbaf7ee8cd85f38e6a697c15` | sin cambios |
| `backend/test/nombres-tokens-r2.ataque.test.ts` | `00a6eb6f7ccd7d8790c356befcc96ddfda6eacce0be53de255cfe3626d8f2adb` | sin cambios |
| `backend/test/logs-r2.ataque.test.ts` | `5af3909e4b7ca485e78979567872ea78bf41e6d679b9ec2c761eaa0b250df689` | sin cambios |
| `frontend/src/app/sesion-r2.ataque.test.tsx` | `06f35be8ae68f0abae775268e4e64f3df880ff137a9b54aa3c135941ddb93dcf` | sin cambios |
| `backend/test/nombres-guarda-r3.ataque.test.ts` | `97b8d6f6c6b26b9b651eb0b46a48ed27b594a8ef659937eb600fde793f07e873` | sin cambios |
| `backend/test/cuentas-r1.ataque.test.ts` | `994a38f476d55f0b8826dc4b80e07dfb013f9034c7f7aee3cdc29dd74338b793` | nuevo (46 pruebas) |
| `backend/test/worker-r1.ataque.test.ts` | `f4ea0bd908d8ec538aa479f9b09bf6fc6f86df6f93bb7abaaccd7001de876395` | nuevo (10) |
| `backend/test/logs-cuentas-r1.ataque.test.ts` | `a47af988453adcbc0e7ca710e670b5e2b9906e995ae6aa71e43fa8555764014c` | nuevo (2) |
| `backend/test/arquitectura-cuentas-r1.ataque.test.ts` | `42bb7bf3086230c6edc65ab73976ac8a801956336561aadbee65cc3b40eb8612` | nuevo (10) |
| `backend/test/arranque-r1.ataque.test.ts` | `aae65c95cf34db814d650af5f7fa08d09bff3e6fc6863d4252383058499aa10e` | nuevo (3) |
| `backend/src/config/logger.ataque.test.ts` | `43f1754c8c33f7de285ab77dbabb0f493422e858529432c9b2be26ff9423b01b` | nuevo (3) |
| `backend/src/config/correo.ataque.test.ts` | `bcce2cae771f97957d8691bef7fff4ec42412daaeabf726aeb0afc59f6f25671` | nuevo (16) |

Conteos: las `*.ataque` pasan de 14 a 21 archivos. El backend pasa de 54 archivos y 509 pruebas a **61 archivos y 601 pruebas** (+92 del Tester: 90 en los 7 archivos nuevos y +2 en `sesiones-y-cadena`). El frontend sigue en 11 archivos y 69 pruebas.

**Nota para la ronda 2 (PA-11):** la excepción de FE-01 expiró. Las 7 pruebas en rojo de T-01 a T-06 se corrigen en el código de producción, no en las pruebas. Si el Programador considera incorrecta alguna, lo argumenta y decide el Manager.

## Archivos que escribió o modificó el Tester (solo pruebas; nada de producción)
- Nuevos: `backend/test/cuentas-r1.ataque.test.ts`, `backend/test/worker-r1.ataque.test.ts`, `backend/test/logs-cuentas-r1.ataque.test.ts`, `backend/test/arquitectura-cuentas-r1.ataque.test.ts`, `backend/test/arranque-r1.ataque.test.ts`, `backend/src/config/logger.ataque.test.ts`, `backend/src/config/correo.ataque.test.ts`.
- Modificados (tareas heredadas): `backend/test/sesiones-y-cadena.ataque.test.ts`, `backend/test/auth-registro.ataque.test.ts`, `backend/test/api-real.ataque.test.ts`, `backend/test/admin-unico.ataque.test.ts`.

---

> Registrado por el orquestador el 2026-09-24: el entorno impidió de nuevo al `tester` escribir este archivo. El texto de abajo es su entrega de la ronda 2, transcrita sin cambios.

# Reporte del Tester — AUTH-02a — Ronda 2

Veredicto: **ROTO**

Verificación propia: lint `verde` (raíz, los tres workspaces) · test `backend 612/616, frontend 69/69`. Las 4 pruebas en rojo son las de T-07 a T-09. Ninguna prueba del Programador ni de la ronda 1 falla.

## Verificación propia

- **Precondición de red, antes de correr nada:**
  - Regla del firewall "Campus: bloquear entrada a Docker en redes publicas": `True` / `Inbound` / `Block` / `Public`.
  - Red: `IZZI-F281` / `Public` (el humano la declara de confianza).
  - Docker `28.5.1`, sin contenedores de Testcontainers al empezar.
- **Hashes de entrada:** los 21 de la tabla de la ronda 1 coincidían antes de tocar nada, y siguen coincidiendo al terminar.
- **Tres corridas completas de `npm test` desde la raíz** (salida a archivo, sin tubería):

| Corrida | Backend | Frontend | Duración backend (Vitest) |
|---|---|---|---|
| 1 | 63 archivos · 616 pruebas · 612 ✓ · 4 ✗ | 11 · 69/69 | 25,9 s |
| 2 | ídem, las mismas 4 | 11 · 69/69 | 25,9 s |
| 3 | ídem, las mismas 4 | 11 · 69/69 | 26,2 s |

  - Las 4 en rojo son las mismas en las tres corridas: no hay intermitencia.
  - `FSTDEP` = 0 y `too many clients` = 0 en las tres.
  - Tras la tercera, `docker ps -a --filter "label=org.testcontainers=true"` → vacío.
- `npm run lint` desde la raíz → código 0.
- Formateé solo mis dos archivos, con `npx prettier --write <archivo>` desde `backend/`.
- **Aviso de método:** en un primer intento, la prueba de T-07 usaba esperas fijas de 300 ms. Fallaba aislada y pasaba dentro de la suite, porque bajo carga el argon2 de `restablecer` tarda más y cambia el orden de llegada. La reescribí para que cada petición espere a que la anterior esté en cola de bloqueo (`pg_blocking_pids`, consultado fuera de la transacción que retiene la fila). Ahora falla igual aislada (3/3) y en la suite (3/3).

## Estado de los hallazgos de la ronda 1

- **T-01 — parcialmente resuelto.**
  - Los consumos concurrentes de dos enlaces del mismo usuario ya no chocan. También resisten `restablecer` frente al restablecimiento del admin y `restablecer` frente a `cambiar-contrasena`. Pasan mi prueba de la ronda 1 y las dos pruebas nuevas del Programador.
  - Orden de bloqueo que revisé en las seis transacciones del encargo:
    - `usarTokenYCambiarContrasena` y `prepararTokenDeRecuperacion` toman `FOR UPDATE` sobre el usuario como primer paso.
    - `restablecerConTemporal` y `cambiarContrasenaPropia` empiezan con un `UPDATE usuarios`. Es un bloqueo `FOR NO KEY UPDATE`, que choca con `FOR UPDATE`, así que quedan en serie.
    - `corregirCorreo` cambia `email`, que tiene un índice único. PostgreSQL toma entonces el modo `FOR UPDATE`, así que también queda en serie.
    - `crearMaestroInvitado` trabaja sobre una fila nueva.
  - El `SELECT … FOR UPDATE` usa `$queryRaw` etiquetado, con `${usuarioId}::uuid` como parámetro.
  - **El orden no es único en todo el sistema.** `rotarSesion` (AUTH-01) bloquea primero la sesión, y después su `INSERT` pide `KEY SHARE` sobre el usuario por la FK. Frente al nuevo `FOR UPDATE`, eso produce un deadlock nuevo: T-07.
- **T-02 — resuelto.**
  - En pg-boss, `source_id` se rellena en los tres caminos hacia la cola de fallidos:
    - `manager.js:1742` (fallo por id);
    - la CTE `dlq_jobs` de `plans.js` (vencimiento y latido).
  - Lo ataqué con 2 reintentos: `trabajoId` es el id original y aparece una sola vez.
  - Un trabajo encolado directamente en la cola de fallidos se registra con su propio id.
- **T-03 — resuelto.** Ninguna importación de `adapters/db/cliente`, `obtenerDb`, `enTransaccion` ni `ejecutorSqlDe` fuera de `adapters/` en `backend/src`. `recuperar` encola sin transacción, como pide DEC-04.
- **T-04 — resuelto.** Están las nueve rutas del plan. Revisé todos los `log.*` de producción y ninguno pasa claves sensibles. El `500` de T-07 registra el error de Prisma solo con el extracto de código (nombres de variables): en el log de mis corridas no hay `$argon2`, hashes de token ni cookies.
- **T-05 — resuelto, sin regresiones.** `frameworkErrors` cubre `FST_ERR_BAD_URL` y `FST_ERR_MAX_PARAM_LENGTH` sin eco. Siguen respondiendo con el formato de la API:
  - el `404` de ruta inexistente;
  - JSON mal formado (`400`);
  - cuerpo de más de 1 MB (`413`);
  - `415` o `401` según el caso.

  Observación sin severidad: `FST_ERR_ASYNC_CONSTRAINT` respondería `400` en lugar de `500`. Hoy no hay restricciones asíncronas, así que no se puede alcanzar.
- **T-06 — resuelto.** Los handlers no declaran ninguna política propia, e importan la de `core/auth/recuperacion.ts`.

## Hallazgos

### T-07 — `/auth/restablecer` y `/auth/refrescar` del mismo usuario a la vez: deadlock y `500` (regresión de la corrección de T-01)
Severidad: **media**

Prueba: `backend/test/cuentas-r2.ataque.test.ts` › "ataque: orden de bloqueo de T-01 frente a las transacciones de sesión de AUTH-01" › "/auth/restablecer y /auth/refrescar del mismo usuario a la vez: nunca un 500"

Esperado / Obtenido:
- Esperado: ninguna de las dos responde `5xx`.
- Obtenido: `{"restablecer":204,"refrescar":500}`. En el log aparece `40P01 deadlock detected` en `tx.sesion.create()` (`sesiones.ts:59`).

Por qué pasa:
- `usarTokenYCambiarContrasena` toma `FOR UPDATE` sobre el usuario y después actualiza sus sesiones.
- `rotarSesion` actualiza la sesión y después inserta la nueva, lo que exige `KEY SHARE` sobre el usuario.
- Los órdenes quedan cruzados. `KEY SHARE` choca con `FOR UPDATE`. En la ronda 1 no chocaba, porque `UPDATE usuarios` sin cambiar claves toma `FOR NO KEY UPDATE`.
- PostgreSQL aborta una de las dos transacciones:
  - si cae el refresco, el usuario pierde la sesión de ese dispositivo con un `500`;
  - si cae `restablecer`, el enlace no se consume y el usuario ve un `500`.
- Es un caso real: el frontend refresca en silencio mientras el usuario usa el enlace en otra pestaña.

Reproducción: `cd backend; npx vitest run test/cuentas-r2.ataque.test.ts -t "nunca un 500"`.
1. Una transacción de la prueba retiene la fila del usuario con `FOR UPDATE`.
2. Lanza `restablecer` y espera a que quede en cola.
3. Lanza `refrescar` y espera a que quede en cola detrás.
4. Suelta la fila.

Requisito o regla violada: DEC-08 (la única salida del perdedor es `400 ENLACE_INVALIDO`); `CLAUDE.md` "Manejo de errores en el backend"; ESSENTIALS "Errores de API".

### T-08 — Un refresco concurrente deja viva una sesión que el restablecimiento del admin o el cambio de contraseña debían revocar
Severidad: **alta**

Pruebas: `backend/test/cuentas-r2.ataque.test.ts` › "ataque: revocación de sesiones frente a un refresco concurrente":
- "el restablecimiento del admin no deja viva la sesión que un refresco concurrente acaba de crear";
- "el cambio obligatorio de contraseña no deja viva la sesión ajena que un refresco concurrente acaba de rotar".

Esperado / Obtenido:
- Esperado: después del `200` del admin, o del `204` de `cambiar-contrasena` (sin cookie que conservar), el usuario tiene 0 sesiones vivas y la cookie rotada no refresca.
- Obtenido en los dos casos: `{ vivas: 1, laSesion…SigueRefrescando: true }`.
- En el caso de `cambiar-contrasena`, la bandera ya está apagada, así que la sesión que sobrevive tiene **acceso completo**.

Por qué pasa:
- `restablecerConTemporal` y `cambiarContrasenaPropia` toman `FOR NO KEY UPDATE` sobre el usuario. Ese bloqueo es compatible con el `KEY SHARE` que pide el `INSERT` de `rotarSesion`.
- Si la revocación `UPDATE sesiones … WHERE revocada_en IS NULL` empieza mientras un `rotarSesion` tiene la sesión S bloqueada, espera a S.
- Cuando `rotarSesion` confirma, la revocación vuelve a evaluar S (ya revocada) y la salta.
- La sesión nueva S' no está en la instantánea de esa sentencia (READ COMMITTED), así que no se revoca.
- La ventana es el tramo de cada refresco entre su `UPDATE` y su `COMMIT`. Quien tenga una cookie robada y refresque en bucle la agranda, justo en el escenario que la revocación debe cortar (la persona cambia la contraseña para expulsar a alguien).
- `usarTokenYCambiarContrasena` ya no tiene este defecto desde la ronda 2, porque su `FOR UPDATE` choca con el `KEY SHARE`. A cambio, produce T-07.

Reproducción: `cd backend; npx vitest run test/cuentas-r2.ataque.test.ts -t "refresco concurrente"`.
1. La prueba retiene con `FOR UPDATE` la fila de la sesión. Eso simula la ventana propia de `rotarSesion`.
2. Lanza `refrescar` con esa cookie y espera a que quede en cola.
3. Lanza la operación (admin o `cambiar-contrasena`) y espera a que quede en cola detrás.
4. Suelta la fila.
5. Cuenta las sesiones vivas y vuelve a refrescar con la cookie nueva.

Requisito o regla violada: ESSENTIALS "Autenticación" (el respaldo por el admin "revoca sesiones"); plan DEC-10 (revoca todas las sesiones); DEC-09 (el cambio revoca las demás sesiones); `AGENTS.md` regla 13.

### T-09 — Un login con la contraseña vieja que termina después de `/auth/restablecer` deja una sesión viva
Severidad: **media**

Prueba: `backend/test/cuentas-r2.ataque.test.ts` › "ataque: revocación de sesiones frente a un refresco concurrente" › "un login con la contraseña vieja que termina después de /auth/restablecer no deja una sesión viva"

Esperado / Obtenido:
- Esperado: tras el `204` de `restablecer`, 0 sesiones vivas.
- Obtenido: el login con la contraseña **anterior** responde `200` y queda 1 sesión viva, con acceso completo.

Por qué pasa:
- El login lee el hash y lo verifica con argon2 sin bloqueo. Después inserta la sesión en otra sentencia.
- Si `restablecer` confirma entre la verificación y el `INSERT`, la sesión nace después de la revocación, autenticada con una contraseña que ya no existe.
- En producción la ventana dura lo que tarda argon2 (decenas de ms). La amenaza es justo quien conoce la contraseña vieja, que es el motivo de la recuperación.
- El código del login es de AUTH-01, pero la garantía rota ("al usarlo se revocan las sesiones") es de AUTH-02a.
- Por construcción, el mismo mecanismo aplica al restablecimiento del admin y a `cambiar-contrasena`. No los probé por separado.

Reproducción: `cd backend; npx vitest run test/cuentas-r2.ataque.test.ts -t "contraseña vieja"`.
1. La prueba retiene la fila del usuario.
2. Lanza `restablecer` y espera a que quede en cola.
3. Lanza el login con la contraseña vieja y espera a que su `INSERT` quede en cola.
4. Suelta la fila.

Requisito o regla violada: ESSENTIALS "Recuperación por correo" ("al usarlo se revocan las sesiones"); `AGENTS.md` regla 13.

## Atacado sin hallazgos

Todo en verde:
- **Regresión de la ronda 1:** los 21 archivos `*.ataque` siguen en verde, incluida mi prueba de T-01. Las dos pruebas de carrera nuevas del Programador también pasan.
- **T-02 con reintentos** (`worker-r2`):
  - Con `retryLimit: 2` hay al menos 3 intentos, y después una sola línea `correo_de_cuenta_fallido` con el id original. El token conserva ese id.
  - Un trabajo encolado directo en la cola de fallidos se registra con su propio id, sin la dirección en el log.
- **T-05, regresiones** (`cuentas-r2`):
  - `404 NO_ENCONTRADO` en `/api/admin/usuarios/<uuid>/borrar` con token de admin.
  - Una ruta estática con codificación rota responde `4xx` con el formato de la API y sin eco.
  - `PUT …/usuarios/<5 KB>/correo` → `414` sin eco.
  - JSON mal formado en `restablecer` → `400` sin eco.
  - Cuerpo de más de 1 MB en `establecer-contrasena` → `413`.
  - `application/xml` en `cambiar-contrasena` → `401`/`415` con el formato de la API.
  - Un `:id` mal codificado con una cookie válida no toca la sesión.
- **Revisión estática:**
  - T-03: sin cliente de Prisma fuera de `adapters/`.
  - T-06: sin políticas propias en `handlers/`.
  - Solo hay dos `$queryRaw` etiquetados (`salud.ts` y `tokens-cuenta.ts`) y ningún SQL concatenado nuevo.
- **Logs del `500` de T-07:** sin hashes de contraseña, hashes de token ni cookies. Solo aparece la URL de la petición en el registro de entrada, como en cualquier petición.

## No atacado y por qué

- **Frontend (AUTH-02b):** todavía no existe.
- **Reproducción probabilística de T-08 sin la fila retenida artificialmente:** no la intenté. La retención solo alarga la ventana que `rotarSesion` ya abre por sí mismo entre su `UPDATE` y su `COMMIT`. Medir la probabilidad real con un bucle de refrescos sería una prueba intermitente.
- **`npm run reset:admin`** (`actualizarContrasenaYRevocarSesiones`, AUTH-01): leyendo el código, tiene el mismo patrón que T-08. No lo probé: es un script y está fuera del diff de AUTH-02a.
- **T-09 con el restablecimiento del admin y con `cambiar-contrasena`:** mismo mecanismo, no probados por separado.
- **Humo V-17 en `campus_dev`:** no está autorizado para el Tester.
- **Parada ordenada ante `SIGTERM` en Windows y Resend real:** mismas limitaciones que en la ronda 1.

## Mis pruebas de la ronda 1

Ninguna me parece incorrecta ahora. No cambié ninguna.

## Tabla de hashes vigente (SHA-256) de todas las `*.ataque`

"Nuevo" significa que el archivo se creó en esta ronda.

| Archivo | SHA-256 | Estado |
|---|---|---|
| `backend/test/auth-login.ataque.test.ts` | `2c83d82d10bdd9b7a969768774d75b18b7a71a594bbaac5fae36a0e134d2336c` | sin cambios |
| `backend/test/auth-registro.ataque.test.ts` | `73d3a2ae708a0ef676547a8094115b1419423057378387269bc3eadb34c7724e` | sin cambios |
| `backend/test/sesiones-y-cadena.ataque.test.ts` | `6e4b4677d73bde3d7c7845c729637186249e704f2aa803fb5efa25e76126b445` | sin cambios |
| `backend/test/api-real.ataque.test.ts` | `441a766a94e7d9b26807790402e06ed94d4cc378d8f6ecf0bccc3259c7ff55fb` | sin cambios |
| `backend/test/admin-unico.ataque.test.ts` | `388ad0e585639b8c3e0e0a6657fb42c1b9cb83db721c4863c4fa19e0be42ec85` | sin cambios |
| `backend/src/config/env.ataque.test.ts` | `4fce3cedf662ba3a188f21a2277db417747d342c115efd4746d3cff58499289b` | sin cambios |
| `frontend/src/services/apiClient.ataque.test.ts` | `10c730348d18ff8dae7b3623751d31122aa58560b564ad191717fa1938a6f8ce` | sin cambios |
| `frontend/src/app/router.ataque.test.tsx` | `e58293532633dc5cfe21561e2609d170638c81886b9c31129f03864c73a34f45` | sin cambios |
| `backend/test/intentos-r2.ataque.test.ts` | `a8b79d5ad98270be3747f493865708a78bb73add08d832584db4464c3582777a` | sin cambios |
| `backend/test/guarda-r2.ataque.test.ts` | `ea078f41cc98c947d9b3966ee8eccec2bd5d06eacbaf7ee8cd85f38e6a697c15` | sin cambios |
| `backend/test/nombres-tokens-r2.ataque.test.ts` | `00a6eb6f7ccd7d8790c356befcc96ddfda6eacce0be53de255cfe3626d8f2adb` | sin cambios |
| `backend/test/logs-r2.ataque.test.ts` | `5af3909e4b7ca485e78979567872ea78bf41e6d679b9ec2c761eaa0b250df689` | sin cambios |
| `frontend/src/app/sesion-r2.ataque.test.tsx` | `06f35be8ae68f0abae775268e4e64f3df880ff137a9b54aa3c135941ddb93dcf` | sin cambios |
| `backend/test/nombres-guarda-r3.ataque.test.ts` | `97b8d6f6c6b26b9b651eb0b46a48ed27b594a8ef659937eb600fde793f07e873` | sin cambios |
| `backend/test/cuentas-r1.ataque.test.ts` | `994a38f476d55f0b8826dc4b80e07dfb013f9034c7f7aee3cdc29dd74338b793` | sin cambios |
| `backend/test/worker-r1.ataque.test.ts` | `f4ea0bd908d8ec538aa479f9b09bf6fc6f86df6f93bb7abaaccd7001de876395` | sin cambios |
| `backend/test/logs-cuentas-r1.ataque.test.ts` | `a47af988453adcbc0e7ca710e670b5e2b9906e995ae6aa71e43fa8555764014c` | sin cambios |
| `backend/test/arquitectura-cuentas-r1.ataque.test.ts` | `42bb7bf3086230c6edc65ab73976ac8a801956336561aadbee65cc3b40eb8612` | sin cambios |
| `backend/test/arranque-r1.ataque.test.ts` | `aae65c95cf34db814d650af5f7fa08d09bff3e6fc6863d4252383058499aa10e` | sin cambios |
| `backend/src/config/logger.ataque.test.ts` | `43f1754c8c33f7de285ab77dbabb0f493422e858529432c9b2be26ff9423b01b` | sin cambios |
| `backend/src/config/correo.ataque.test.ts` | `bcce2cae771f97957d8691bef7fff4ec42412daaeabf726aeb0afc59f6f25671` | sin cambios |
| `backend/test/cuentas-r2.ataque.test.ts` | `736ae5fc909b5f53b6768010047378324e808c5bbe0434c0b0d140b58d0e598b` | nuevo (11 pruebas) |
| `backend/test/worker-r2.ataque.test.ts` | `64aa76974c7ae3e89b2f1ed3d7efc7864d4323310932a9f46f02c798c363a6d2` | nuevo (2) |

Conteos:
- Las `*.ataque` pasan de 21 a 23 archivos.
- El backend pasa de 61 archivos y 603 pruebas a **63 archivos y 616 pruebas** (+13 del Tester).
- El frontend sigue en 11 archivos y 69 pruebas.

## Archivos que escribió el Tester en esta ronda (solo pruebas; nada de producción)

Nuevos: `backend/test/cuentas-r2.ataque.test.ts` y `backend/test/worker-r2.ataque.test.ts`.

---

> Registrado por el orquestador el 2026-09-25: el entorno impidió al `tester` escribir este archivo. El texto de abajo es su entrega de la ronda 3, transcrita sin cambios.

# Reporte del Tester — AUTH-02a — Ronda 3

Veredicto: **RESISTE**

Verificación propia: lint `verde` (raíz, los tres workspaces) · test `backend 657/657, frontend 69/69` en tres corridas completas desde la raíz.

## Verificación propia

- **Precondición de red, antes de correr nada:**
  - Regla del firewall "Campus: bloquear entrada a Docker en redes publicas": `True` / `Inbound` / `Block` / `Public`.
  - Red `IZZI-F281` / `Public`, declarada de confianza por el humano.
  - Docker `28.5.1`. Al empezar no había contenedores de Testcontainers.
- **Hashes de entrada:** los 23 de la tabla de la ronda 2 coincidían antes de tocar nada. Siguen coincidiendo al terminar (`sha256sum -c`: 23/23 OK).
- **Tres corridas completas de `npm test` desde la raíz**, con la salida a un archivo y sin tubería. Las hice con la versión final de mi archivo:

| Corrida | Backend | Frontend | Duración backend (Vitest) |
|---|---|---|---|
| 1 | 65 archivos · 657 pruebas · 657 ✓ · 0 ✗ | 11 · 69/69 | 32,3 s |
| 2 | ídem | 11 · 69/69 | 32,1 s |
| 3 | ídem | 11 · 69/69 | 32,1 s |

  - Antes hice otras tres corridas con una versión anterior del archivo. Solo cambiaban una importación y las aserciones de los dos casos P2028. Las tres dieron 657/657.
  - En las seis corridas no aparecen `FSTDEP`, `too many clients`, `40P01`, `deadlock detected` ni `could not serialize` (0 coincidencias).
  - Al terminar, `docker ps -a --filter "label=org.testcontainers=true"` quedó vacío, después de que Ryuk salió solo.
- **Lint:** `npm run lint` desde la raíz terminó con código 0.
  - Un primer intento falló por una importación sin usar (`corregirCorreo`) en mi propio archivo. La quité y volví a correr.
  - Formateé solo mi archivo, con `npx prettier --write test/cuentas-r3.ataque.test.ts` desde `backend/`.
- **Método de concurrencia:** determinista, el mismo de la ronda 2, reescrito dentro del archivo.
  - Una transacción de la prueba retiene una fila con `FOR UPDATE`. Antes de lanzar la siguiente operación, la prueba sondea `pg_blocking_pids` fuera de esa transacción, hasta ver que la anterior quedó en cola detrás de la fila.
  - Añadí dos ganchos dentro de la transacción que retiene:
    - `alRetener`: escribe antes de lanzar las operaciones;
    - `antesDeSoltar`: escribe antes de soltar la fila.
  - Así se simulan una desactivación, una baja o una escritura en curso.
  - No importa nada de otros archivos de prueba. No uso esperas fijas, salvo los márgenes de 100 ms y la retención de más de 5 s que buscan provocar P2028 a propósito.
- No toqué código de producción ni pruebas del Programador, y no cambié ninguna de mis pruebas anteriores. No arranqué la API ni el worker contra `campus_dev`. Git, solo de lectura.

## Estado de los hallazgos anteriores

Verifiqué el código, no solo que las pruebas pasen. Un `grep` de `.sesion.`, `.tokenCuenta.` y `.usuario.update/create` en `backend/src`, sin `generated/`, muestra estas escrituras de sesiones, tokens y credenciales:

| Transacción | Primera sentencia | Modo |
|---|---|---|
| `crearSesion` (login) | `bloquearUsuarioParaSesion`, y decide bajo el bloqueo con `activo` y `hashVerificado` | `FOR SHARE` |
| `rotarSesion` | `bloquearUsuarioParaSesion` | `FOR SHARE` |
| `revocarTodasLasSesiones` | `bloquearUsuarioParaEscribir` | `FOR NO KEY UPDATE` |
| `usarTokenYCambiarContrasena` | `bloquearUsuarioParaEscribir` | `FOR NO KEY UPDATE` |
| `prepararTokenDeRecuperacion` | `bloquearUsuarioParaEscribir` | `FOR NO KEY UPDATE` |
| `restablecerConTemporal` | `bloquearUsuarioParaEscribir`; si es `null`, devuelve `null` | `FOR NO KEY UPDATE` |
| `cambiarContrasenaPropia` | `bloquearUsuarioParaEscribir`, y compara `hashVerificado` | `FOR NO KEY UPDATE` |
| `actualizarContrasenaYRevocarSesiones` (`reset:admin`) | `bloquearUsuarioParaEscribir` | `FOR NO KEY UPDATE` |
| `corregirCorreo` | `UPDATE usuarios SET email` (PB-2, excepción) | `FOR UPDATE` implícito |

Quedan fuera del protocolo, como dice PB-7:
- `revocarSesion` y `revocarSesionPorHash`: una sentencia, una fila.
- `crearUsuarioConSesion` y `crearMaestroInvitado`: el usuario es nuevo.

Otras comprobaciones del código:
- No queda ningún `FOR UPDATE` explícito ni función de bloqueo privada.
- En `adapters/db` solo hay `$queryRaw` etiquetado en `salud.ts` y `bloqueo-usuario.ts`, y el único `$queryRawUnsafe` sigue siendo el de `cliente.ts`.
- `adapters/db/index.ts` no reexporta `bloqueo-usuario`.
- Nada fija `isolationLevel` ni `default_transaction_isolation` en `src/` ni en `infra/` (PB-5).
- `git diff` de `handlers/auth/index.ts` tiene un solo bloque, dentro de `POST /login`: `const creada =`, `hashVerificado` y `if (!creada) throw credencialesInvalidas()` con su comentario. `intentos.delete(llave)` sigue antes de `crearSesion`. `registro`, `refrescar` y `logout` no cambiaron.

Estado de cada hallazgo:
- **T-07 — resuelto.**
  - `cuentas-r2` "…nunca un 500" pasa en las tres corridas.
  - Además, ninguna combinación nueva de mi ronda produjo un `5xx` por un deadlock. Las probé con la fila retenida y en una ráfaga mixta de 22 operaciones sobre el mismo usuario, repetida 3 veces por corrida.
- **T-08 — resuelto.**
  - Las dos pruebas de `cuentas-r2` pasan.
  - Probé también `reset:admin` frente a `refrescar` con el usuario retenido, en los dos órdenes, y la reutilización frente al restablecimiento del admin y frente a `cambiar-contrasena`. En todos los casos quedan 0 sesiones vivas.
- **T-09 — resuelto.**
  - La prueba de `cuentas-r2` pasa.
  - Probé también el orden inverso frente al admin y frente a `cambiar-contrasena`: el login responde `200` y su sesión queda revocada.
  - Y una cuenta desactivada entre la verificación y la sesión: `401` con un cuerpo idéntico al de una contraseña incorrecta, sin cookie y con 0 sesiones.
- **T-01 — resuelto; sigue resuelto.** `cuentas-r1` "maestro pendiente" sigue en `[204, 400]`.

## Hallazgos

Ninguno.

## E2-03 (riesgo aceptado)

No lo reproduje: no intenté una reproducción determinista.
- Para el cruce hace falta que las dos actualizaciones de `usuarios` hayan escrito su tupla antes de que cada una compruebe la unicidad de la otra. Esas dos cosas ocurren dentro de la misma sentencia, así que no se puede intercalar una retención de fila.
- Sí probé la variante que no es cruzada: corregir A al correo de B mientras otra transacción escribe en la fila de B (`alRetener`). `corregirCorreo` espera a esa transacción y después responde `409 CORREO_EN_USO`, sin `500`.

## Atacado sin hallazgos

Todo en verde, en `backend/test/cuentas-r3.ataque.test.ts`:

- **Login frente a una desactivación y frente a los escritores:**
  - Cuenta desactivada con el login ya en cola en `crearSesion`: `401` idéntico a credenciales inválidas, 0 sesiones y sin cookie. Después caben 5 fallos más desde la misma IP y el 6.º es `429`: ese `401` no suma un fallo (Q-E2-4).
  - Login con la contraseña vieja frente a `restablecer`: `204` y `401`, 0 sesiones. La misma comprobación del límite da `[401×5, 429]`.
  - Login que termina antes del restablecimiento del admin: `200` y `200`; después, 0 sesiones vivas y la cookie del login no refresca.
  - Login con la temporal que termina antes de `cambiar-contrasena` sin cookie: `200` y `204`; después, 0 sesiones vivas.
- **`rotarSesion` frente a `reset:admin` con el usuario retenido:**
  - `reset:admin` primero: `refrescar` responde `401` y quedan 0 sesiones.
  - `refrescar` primero: quedan 0 sesiones y la cookie rotada no refresca.
- **Refrescos, logout y reutilización:**
  - Dos refrescos simultáneos de la misma sesión: `{200, 401}`, sin `5xx`. La cookie ganadora no refresca y quedan 0 sesiones, como fija DEC-04 de AUTH-01.
  - Tres refrescos simultáneos con el usuario retenido: ningún `5xx`, a lo más un `200` y 0 sesiones.
  - `refrescar` y después `logout` de la misma cookie: `200` y `204`, y queda 1 sesión viva, la rotada. Es el mismo resultado que en serie: AUTH-01 ya fija que un logout con un token rotado no revoca la sesión nueva (`sesiones-y-cadena.ataque`).
  - `logout` y después `refrescar`: `204` y `401`, 0 sesiones.
  - Reutilización frente al restablecimiento del admin: `401` y `200`, 0 sesiones.
  - Reutilización frente a `cambiar-contrasena` con la cookie vigente: `401` y `204`, 0 sesiones.
  - Login, reutilización y login, en ese orden: `200`, `401` y `200`, y 1 sesión viva. La del login que llegó antes cae con la reutilización.
- **Decisiones que se toman antes del bloqueo (PB-4):**
  - `cambiar-contrasena` con la cookie S mientras la misma S se refresca: `200` y `204`, y 0 sesiones. Es lo que da DEC-09 evaluado al confirmar: S ya estaba reemplazada, así que no se conserva nada.
  - Una baja que cumple PB-8 (bloqueo, `activo = false`, revoca sesiones y enlaces) frente a `restablecer`, `refrescar` y login ya en cola: `400`, `401` y `401`, con 0 sesiones y 0 enlaces vivos.
- **Worker frente a un enlace:** `prepararTokenDeRecuperacion` en cola antes de `restablecer` con el enlace viejo. El worker revoca el enlace viejo, `restablecer` responde `400 ENLACE_INVALIDO` y el único enlace vivo es el nuevo.
- **`corregirCorreo` (`FOR UPDATE`):**
  - Frente a un refresco del mismo usuario: `200` y `200`, y la sesión rotada sigue viva (S-06).
  - Frente a un login del mismo usuario: `200` y `200`.
  - Contra una escritura en curso sobre la fila de B: `409 CORREO_EN_USO`, nunca `500`.
- **Transacciones que Prisma cierra por tiempo (P2028):**
  - Con el usuario retenido más de 5 s, el login y `restablecer` en cola responden `500 ERROR_INTERNO` con el formato de la API. El log trae `P2028` y el extracto de código, sin hashes, contraseñas ni tokens.
  - Es atómico: el login no deja sesión; `restablecer` no marca el enlace como usado ni cambia la contraseña, y la contraseña vieja sigue entrando.
  - El pool sigue sano. Doce logins en paralelo, lanzados cuando la transacción ya venció y con la consulta todavía bloqueada, responden `200` y dejan 12 sesiones. Después, un login normal del usuario afectado responde `200`.
- **Ráfaga mixta sin fila retenida** sobre un mismo usuario, 3 rondas por corrida:
  - las operaciones: 9 refrescos o logouts, 8 logins, 2 restablecimientos del admin, `reset:admin`, una corrección de correo, `prepararTokenDeRecuperacion` y `restablecer`;
  - el resultado: ningún `5xx` ni error de adaptador en 18 rondas (3 por corrida en 6 corridas completas, más las corridas aisladas).
- **Regresiones:**
  - Las 23 `*.ataque` anteriores siguen en verde en las tres corridas. Incluye `intentos-r2` (el doble que sustituye `crearSesion` por nombre y el borrado de la llave antes de `crearSesion`), `sesiones-y-cadena`, `cuentas-r1` (T-01) y `cuentas-r2` (T-07 a T-09).
  - Las 19 de `bloqueo-usuario.integracion` también pasan.

## Observaciones sin severidad (no son hallazgos)

- **P2028 → `500`.** Solo se alcanza si alguien retiene la fila del usuario más de 5 s, que es el límite de las transacciones interactivas de Prisma. Ninguna transacción del sistema lo hace: todas son cortas y argon2 va fuera. El estado queda consistente. Sirve de dato para E2-01.
- **Lecturas de "cuenta activa" que se hacen antes del bloqueo:**
  - En `refrescar` (`buscarSesionPorHash`), el propio plan fija que `rotarSesion` ignore el resultado del bloqueo.
  - En `restablecer` y `establecer-contrasena` (`decidirUsoDeToken`), `usarTokenYCambiarContrasena` no vuelve a comprobar `activo`.

  Hoy ninguna ruta desactiva cuentas. Una baja que cumpla PB-8 cierra las dos ventanas, como muestra la prueba de la baja, porque revoca sesiones y enlaces bajo el bloqueo. Un encargo futuro que desactive sin revocar sí las abriría.
- **Tope durable del worker:** `contarRecuperacionesRecientes` se lee fuera del bloqueo. Con un solo consumidor y `batchSize: 1` no hay dos trabajos a la vez; con varios workers, el tope por cuenta podría excederse.

## No atacado y por qué

- **Frontend (AUTH-02b):** todavía no existe.
- **Reproducción determinista de E2-03:** es riesgo aceptado y no se puede intercalar (arriba).
- **Inanición de un escritor por una corriente continua de `FOR SHARE`** (logins o refrescos del mismo usuario durante más de 5 s): exige una carga sostenida que argon2 y el límite de intentos hacen impráctica. Una prueba así sería intermitente.
- **Varias instancias del worker:** están fuera del diseño (una instancia).
- **`npm run reset:admin` como script real:** ataqué `actualizarContrasenaYRevocarSesiones` directamente, que es lo que llama el script. `scripts/` no cambió.
- **Humo en `campus_dev`, Resend real y `SIGTERM` en Windows:** las mismas limitaciones que en las rondas 1 y 2.

## Mis pruebas de las rondas 1 y 2

Ninguna me parece incorrecta. No cambié ninguna.

## Tabla de hashes vigente (SHA-256) de todas las `*.ataque`

| Archivo | SHA-256 | Estado |
|---|---|---|
| `backend/test/auth-login.ataque.test.ts` | `2c83d82d10bdd9b7a969768774d75b18b7a71a594bbaac5fae36a0e134d2336c` | sin cambios |
| `backend/test/auth-registro.ataque.test.ts` | `73d3a2ae708a0ef676547a8094115b1419423057378387269bc3eadb34c7724e` | sin cambios |
| `backend/test/sesiones-y-cadena.ataque.test.ts` | `6e4b4677d73bde3d7c7845c729637186249e704f2aa803fb5efa25e76126b445` | sin cambios |
| `backend/test/api-real.ataque.test.ts` | `441a766a94e7d9b26807790402e06ed94d4cc378d8f6ecf0bccc3259c7ff55fb` | sin cambios |
| `backend/test/admin-unico.ataque.test.ts` | `388ad0e585639b8c3e0e0a6657fb42c1b9cb83db721c4863c4fa19e0be42ec85` | sin cambios |
| `backend/src/config/env.ataque.test.ts` | `4fce3cedf662ba3a188f21a2277db417747d342c115efd4746d3cff58499289b` | sin cambios |
| `frontend/src/services/apiClient.ataque.test.ts` | `10c730348d18ff8dae7b3623751d31122aa58560b564ad191717fa1938a6f8ce` | sin cambios |
| `frontend/src/app/router.ataque.test.tsx` | `e58293532633dc5cfe21561e2609d170638c81886b9c31129f03864c73a34f45` | sin cambios |
| `backend/test/intentos-r2.ataque.test.ts` | `a8b79d5ad98270be3747f493865708a78bb73add08d832584db4464c3582777a` | sin cambios |
| `backend/test/guarda-r2.ataque.test.ts` | `ea078f41cc98c947d9b3966ee8eccec2bd5d06eacbaf7ee8cd85f38e6a697c15` | sin cambios |
| `backend/test/nombres-tokens-r2.ataque.test.ts` | `00a6eb6f7ccd7d8790c356befcc96ddfda6eacce0be53de255cfe3626d8f2adb` | sin cambios |
| `backend/test/logs-r2.ataque.test.ts` | `5af3909e4b7ca485e78979567872ea78bf41e6d679b9ec2c761eaa0b250df689` | sin cambios |
| `frontend/src/app/sesion-r2.ataque.test.tsx` | `06f35be8ae68f0abae775268e4e64f3df880ff137a9b54aa3c135941ddb93dcf` | sin cambios |
| `backend/test/nombres-guarda-r3.ataque.test.ts` | `97b8d6f6c6b26b9b651eb0b46a48ed27b594a8ef659937eb600fde793f07e873` | sin cambios |
| `backend/test/cuentas-r1.ataque.test.ts` | `994a38f476d55f0b8826dc4b80e07dfb013f9034c7f7aee3cdc29dd74338b793` | sin cambios |
| `backend/test/worker-r1.ataque.test.ts` | `f4ea0bd908d8ec538aa479f9b09bf6fc6f86df6f93bb7abaaccd7001de876395` | sin cambios |
| `backend/test/logs-cuentas-r1.ataque.test.ts` | `a47af988453adcbc0e7ca710e670b5e2b9906e995ae6aa71e43fa8555764014c` | sin cambios |
| `backend/test/arquitectura-cuentas-r1.ataque.test.ts` | `42bb7bf3086230c6edc65ab73976ac8a801956336561aadbee65cc3b40eb8612` | sin cambios |
| `backend/test/arranque-r1.ataque.test.ts` | `aae65c95cf34db814d650af5f7fa08d09bff3e6fc6863d4252383058499aa10e` | sin cambios |
| `backend/src/config/logger.ataque.test.ts` | `43f1754c8c33f7de285ab77dbabb0f493422e858529432c9b2be26ff9423b01b` | sin cambios |
| `backend/src/config/correo.ataque.test.ts` | `bcce2cae771f97957d8691bef7fff4ec42412daaeabf726aeb0afc59f6f25671` | sin cambios |
| `backend/test/cuentas-r2.ataque.test.ts` | `736ae5fc909b5f53b6768010047378324e808c5bbe0434c0b0d140b58d0e598b` | sin cambios |
| `backend/test/worker-r2.ataque.test.ts` | `64aa76974c7ae3e89b2f1ed3d7efc7864d4323310932a9f46f02c798c363a6d2` | sin cambios |
| `backend/test/cuentas-r3.ataque.test.ts` | `a352625e291810251f41f53c3da37de82b662a20a82a66127f4d210ba6041b34` | nuevo (22 pruebas) |

Conteos:
- Las `*.ataque` pasan de 23 a 24 archivos.
- El backend pasa de 64 archivos y 635 pruebas (tras la ronda 3 del Programador) a **65 archivos y 657 pruebas**.
- El frontend sigue en 11 archivos y 69 pruebas.

## Archivos que escribió el Tester en esta ronda (solo pruebas; nada de producción)

Nuevo: `backend/test/cuentas-r3.ataque.test.ts`.

---

# Reporte del Tester — AUTH-02b — Ronda 1

Veredicto: **ROTO**

Verificación propia: lint `verde` (raíz, los tres workspaces, código 0) · test backend `657/657` y frontend `189` verdes + `12` en rojo (todas mías), idéntico en tres corridas completas desde la raíz.

Hallazgos: 0 críticos · 0 altos · 3 medios · 5 bajos.

## Verificación propia

- **Precondición de red, antes de la primera corrida del backend:**
  - Regla del firewall "Campus: bloquear entrada a Docker en redes publicas": `True` / `Inbound` / `Block` / `Public`.
  - Red `IZZI-F281` / `Public`, declarada de confianza por el humano.
  - Docker `28.5.1`. Al empezar no había contenedores de Testcontainers.
- **Hashes de entrada:** los 24 de la tabla de la ronda 3 de AUTH-02a coincidían antes de tocar nada y siguen coincidiendo al terminar (`sha256sum -c`: 24/24 OK). El Programador no tocó ninguna `*.ataque`.
- **Tres corridas completas de `npm test` desde la raíz**, con la salida a un archivo y sin tubería, ya con mis tres archivos en su versión final:

| Corrida | Backend | Frontend | Duración backend / frontend (Vitest) |
|---|---|---|---|
| 1 | 65 archivos · 657/657 | 20 archivos · 201 pruebas · 189 ✓ · 12 ✗ | 32,4 s / 10,4 s |
| 2 | ídem | ídem | 31,2 s / 10,3 s |
| 3 | ídem | ídem | 31,9 s / 10,4 s |

  - Las 12 en rojo son exactamente las mismas en las tres corridas (comparadas con `diff`) y todas son de mis archivos nuevos. Ninguna prueba del Programador ni ninguna `*.ataque` anterior falla.
  - En las tres corridas no aparecen `FSTDEP`, `too many clients`, `40P01`, `deadlock detected` ni `could not serialize` (0 coincidencias).
  - Al terminar, `docker ps -a --filter "label=org.testcontainers=true"` quedó vacío.
- **Lint:** `npm run lint` desde la raíz → código 0. `npm run lint` en `frontend/` (ESLint, `prettier --check`, `tsc -b`) → código 0, con mis archivos incluidos.
  - Un primer intento del lint falló en mi propio archivo de admin: usaba `node:fs`, y el frontend no tiene tipos de Node. Lo reescribí con `import.meta.glob(..., { query: "?raw" })` de Vite.
  - Formateé solo mis tres archivos, con `npx prettier --write <archivo>` desde `frontend/`.
- Mis archivos quedan con finales de línea `lf` (`git ls-files --eol`).
- No toqué código de producción ni pruebas del Programador. No arranqué Vite, la API ni el worker. Git, solo de lectura. No leí ningún `.env`.

## Hallazgos

### T-01 — El token del enlace y las contraseñas quedan en la caché de mutaciones de TanStack Query al salir de la pantalla
Severidad: media

Prueba:
- `frontend/src/features/auth/enlace-r1.ataque.test.tsx` › "DEC-18: tras salir de /restablecer, ni el token ni la contraseña quedan en la caché de TanStack Query"
- ídem › "DEC-18: tras un fallo de red (el token sigue vigente) y salir de la pantalla, el token no queda en la caché"
- `frontend/src/app/cuentas-r1.ataque.test.tsx` › "tras cambiarla y llegar al dashboard, ni la temporal ni la nueva quedan en la caché de mutaciones"

Esperado / Obtenido:
- Esperado (DEC-18): "El token vive solo en el estado de React: nunca en `localStorage`, `sessionStorage`, la caché de TanStack Query ni la URL después de leerlo."
- Obtenido: `useNuevaContrasena` y `useCambiarContrasena` (`features/auth/hooks.ts`) usan el `gcTime` por defecto (5 minutos). Al salir de la pantalla, la mutación sigue en `queryClient.getMutationCache()` con `variables` en claro:
  - en `/restablecer`: `{"token":"Zq3_…9a","contrasena":"clave-nueva-de-ataque-1"}`, tanto con `status: "success"` como con `status: "error"`;
  - en `/cambiar-contrasena`: la temporal y la contraseña nueva (`contrasenaActual`, `contrasenaNueva`).
- El caso de fallo de red es el que importa: el token **sigue vigente** y queda 5 minutos en la caché después de salir de la pantalla.
- La pantalla de admin ya aplica `gcTime: 0` a la temporal (DEC-19). Las mutaciones del lado del usuario no lo hacen.

Reproducción:
1. Abrir `/restablecer#token=<43>`, llenar las dos contraseñas y enviar. Con éxito, la vista navega a `/login`.
2. Inspeccionar `queryClient.getMutationCache().getAll()` (por ejemplo, con las React Query Devtools o desde cualquier código de la página). El token y la contraseña siguen ahí.

Requisito o regla violada: DEC-18 (plan), AGENTS.md regla 13 en su intención (tokens y temporales solo como hash; la temporal "se muestra una única vez") y "Puntos de ataque › Frontend" del plan.

### T-02 — Con `409 CAMBIO_NO_REQUERIDO`, el usuario queda atrapado en `/cambiar-contrasena` con un error genérico que invita a reintentar
Severidad: media

Prueba:
- `frontend/src/app/cuentas-r1.ataque.test.tsx` › "409 CAMBIO_NO_REQUERIDO (ya se cambió, por ejemplo en otra pestaña): sale del formulario hacia su dashboard"
- ídem › "el 409 CAMBIO_NO_REQUERIDO no se presenta como un error genérico que invita a reintentar"

Esperado / Obtenido:
- Esperado: un `409 CAMBIO_NO_REQUERIDO` significa que ya no hay cambio pendiente. La pantalla debería revalidar `/me` y llevar al dashboard del rol, que es lo mismo que hace `RequireCambioDeContrasena` al cargar con `/me` en `200`. Como mínimo, no debería mostrar un mensaje que invita a reintentar algo que ya no puede funcionar.
- Obtenido:
  - `MENSAJES_ERROR_AUTH` no tiene `CAMBIO_NO_REQUERIDO`, aunque el código existe en `CODIGOS_CUENTAS` de `shared/`. Se muestra "No pudimos completar la operación. Inténtalo de nuevo."
  - La ruta se queda en `/cambiar-contrasena`. Cada reintento vuelve a dar `409`.
  - La única salida es recargar la página o pulsar "Cerrar sesión".

Reproducción (dos caminos):
1. Dos pestañas en `/cambiar-contrasena` con la misma sesión: cambiar la contraseña en la A y después enviar el formulario en la B.
2. Una sola pestaña, cambio correcto (`204`) pero la petición a `/me` en `onSuccess` falla (red intermitente). En TanStack Query v5, un `onSuccess` que lanza deja la mutación en `error`, así que la vista muestra "No pudimos conectar…" aunque la contraseña ya cambió. El usuario reintenta con la temporal y entra en el caso 1: `409` y el mensaje genérico, para siempre.

Requisito o regla violada: RF-04d (el cambio obligatorio no debe dejar a quien ya cumplió atrapado en la pantalla) y DEC-17 (la salida tras el cambio es `/me` → `rutaTrasLogin`).

### T-03 — Dos clics en "Sí, restablecer" crean dos contraseñas temporales, y la que se muestra puede no ser la vigente
Severidad: media

Prueba: `frontend/src/features/admin/cuentas-r1.ataque.test.tsx` › "dos clics en 'Sí, restablecer' en el mismo instante hacen una sola petición"

Esperado / Obtenido:
- Esperado: 1 `POST /api/admin/usuarios/:id/restablecer-contrasena`.
- Obtenido: 2.

Por qué:
- El `onClick` de `AccionRestablecer` (`ficha-de-cuenta.tsx`) llama a `restablecer.mutate` sin guarda. Solo lo protege `disabled={restablecer.isPending}`.
- Ese valor cambia cuando TanStack Query notifica a React, en la siguiente tarea (`setTimeout(0)`).
- Los formularios de la misma pantalla sí resisten, pero solo de rebote: su `setErrores({})` fuerza un render síncrono que ya lee `isPending`. Lo comprobé con las pruebas de doble envío de invitar, recuperar, restablecer y cambiar, que pasan.

Consecuencia:
- El backend genera dos temporales, y cada una sustituye el hash de la otra.
- La vista muestra la de la **segunda** mutación, pero la vigente es la del último `commit`, que depende de cuál termine antes (argon2 va en paralelo).
- Si la primera petición termina después, el admin entrega en persona una temporal que no sirve y tiene que repetir el proceso.

Alcance real: hacen falta dos clics despachados antes de esa notificación, por ejemplo con el hilo principal ocupado o con una ráfaga de teclado sobre el botón. Con un doble clic humano normal la ventana es estrecha, pero existe y no depende del backend.

Requisito o regla violada: "Formularios: doble clic y envíos concurrentes" (Puntos de ataque › Frontend) y DEC-19 (la temporal que se muestra una sola vez debe ser la que funciona).

### T-04 — Tras corregir el correo, la ficha sigue mostrando el correo anterior
Severidad: baja

Prueba: `frontend/src/features/admin/cuentas-r1.ataque.test.tsx` › "tras corregir el correo, la ficha muestra el correo nuevo y no el anterior"

Esperado / Obtenido:
- Esperado: la ficha refleja el `usuarioAdmin` que devuelve `PUT /correo`.
- Obtenido: aparece "Correo actualizado…", pero la ficha sigue mostrando `carla@ejemplo.mx`. Sus datos vienen de `buscar.data` y nunca se actualizan con la respuesta de `useCorregirCorreo`.
- El admin ve a la vez el mensaje de éxito y el correo viejo. Si vuelve a buscar por el correo anterior, obtiene un `404`.

Requisito o regla violada: RF-04a (corregir el correo) y DEC-19 (ficha con nombre, correo, rol…).

### T-05 — Una búsqueda rechazada en el cliente deja visible la temporal de la cuenta anterior
Severidad: baja

Prueba: `frontend/src/features/admin/cuentas-r1.ataque.test.tsx` › "buscar otra cuenta con un correo mal escrito (rechazado en el cliente) hace desaparecer la temporal"

Esperado / Obtenido:
- Esperado (DEC-19): "Al buscar otra cuenta o salir de la pantalla, la temporal desaparece."
- Obtenido: con un correo mal escrito (`beto@ejemplo`), `BuscadorDeCuenta` valida en el cliente y no llama a `mutate`. `buscar` conserva el éxito anterior, así que la ficha de Carla y su temporal siguen en pantalla debajo del error "Escribe un correo válido".
- Con un `404` o con una búsqueda válida, la temporal sí desaparece (pruebas en verde).

Requisito o regla violada: DEC-19.

### T-06 — "Cuenta inactiva" se muestra sin icono
Severidad: baja

Prueba: `frontend/src/features/admin/cuentas-r1.ataque.test.tsx` › "'Cuenta inactiva' se muestra con icono y texto (plan, DEC-19)"

Esperado / Obtenido:
- Esperado: el plan dice "Ficha: 'Cuenta inactiva' con icono y texto".
- Obtenido: `<p className="text-sm text-warning">Cuenta inactiva</p>`, sin icono.
- Tampoco llevan icono los mensajes de éxito de "Invitación creada…" y "Correo actualizado…". El aviso del login sí lo lleva (`CircleCheck`).

Requisito o regla violada: plan, "Textos de interfaz › Admin", y "Diseño según `CLAUDE.md`" ("estado con icono y texto").

### T-07 — Accesibilidad: el foco se pierde al pedir la confirmación, y la temporal aparece sin anunciarse
Severidad: baja

Prueba:
- `frontend/src/features/admin/cuentas-r1.ataque.test.tsx` › "al pedir la confirmación, el foco no se pierde en el documento"
- ídem › "la temporal se anuncia a los lectores de pantalla (role=status o aria-live)"

Esperado / Obtenido:
- Al activar "Restablecer contraseña", el botón con el foco se desmonta y el foco cae en `<body>`. Lo mismo ocurre con "Sí, restablecer", que se sustituye por la temporal.
- La temporal se muestra sin `role="status"` ni `aria-live`. Un lector de pantalla no anuncia ni la temporal ni su aviso "Cópiala ahora…".
- Quien usa teclado tiene que volver a recorrer la página desde el principio para llegar a "Copiar".

Requisito o regla violada: "Accesibilidad básica: … `role="status"` y el foco" (encargo del orquestador); plan, "Funciona a 360 px, con foco visible"; WCAG 2.4.3 y 4.1.3.

### T-08 — `features/admin/hooks.ts` declara un tipo
Severidad: baja

Prueba: `frontend/src/features/admin/cuentas-r1.ataque.test.tsx` › "hooks.ts no declara tipos: van en types.ts (CLAUDE.md, reglas 1 y 4; 'Lo que no se hace')"

Esperado / Obtenido:
- Esperado: ninguna declaración de tipo en `hooks.ts`.
- Obtenido: `interface CorregirCorreoVariables { id: string; datos: CorregirCorreo }` en `features/admin/hooks.ts:43`.

Requisito o regla violada: `CLAUDE.md`, regla 1 ("Los tipos van en `types.ts`") y "Lo que no se hace" ("No pongas tipos en archivos de hooks").

## Atacado sin hallazgos

Todo en verde, en mis tres archivos.

- **Token del enlace (DEC-18)**, en `enlace-r1.ataque`:
  - 13 fragmentos con otra forma muestran el estado de enlace inválido, **sin ninguna petición**, y el fragmento sale de la URL:
    - 42 y 44 caracteres;
    - parámetro extra detrás o delante;
    - `#token=` repetido y `token=` repetido por `&`;
    - `#TOKEN=`;
    - base64 estándar con `+` y `/`;
    - codificado en porcentaje, o con `%20` al final;
    - vacío, solo `#`, y `#/token=`.
  - `?token=` en la query no se acepta.
  - Tras leerlo, el token sale de la URL **y del historial**: la entrada se reemplaza (`REPLACE`), y al volver atrás y adelante la ruta regresa sin fragmento.
  - El token no aparece en `location` ni en `location.state`. No queda en `localStorage` ni en `sessionStorage`, ni antes ni después de enviar.
  - El formulario sigue enviando exactamente `{ token, contrasena }` aunque la URL ya no tenga el token.
  - Con una sesión abierta en la pestaña, `/restablecer` no consulta `/me` ni refresca, ni siquiera ante un `401`.
  - `leerTokenDelFragmento` devuelve `null` con 10 KB y con saltos de línea.
- **Redirecciones (DEC-17)**, en `app/cuentas-r1.ataque`, con el router completo:
  - En `/cambiar-contrasena`, el `403 CAMBIO…` de `/me` no llama a `irA`, muestra el formulario y hace una sola petición a `/me` y una a `/refrescar`.
  - `/estudiante`, `/maestro`, `/admin` y `/acceso-restringido` con cambio pendiente terminan en el formulario, sin bucle.
  - Un restringido sin cambio pendiente que entra a `/cambiar-contrasena` termina en `/acceso-restringido` y se queda ahí (una sola petición a `/me`).
  - Un admin sin cambio pendiente termina en `/admin`.
  - Sin conexión, termina en `/login` sin bucle.
  - Login con la temporal: un solo `irA("/cambiar-contrasena")`, y el login no muestra "Correo o contraseña incorrectos."
  - Un restringido con cambio pendiente cambia la contraseña y termina en `/acceso-restringido`, sin pedir ninguna ruta fuera de `/api/auth/*` y `/api/me`.
  - "Cerrar sesión" desde `/cambiar-contrasena` llega a `/login` sin volver a pedir `/me` ni `/refrescar`.
- **Refresco ante `401`:**
  - En `/api/auth/cambiar-contrasena`: refresca una vez, reintenta con el token nuevo y llega al dashboard. Si el refresco falla, un solo `irA("/login")`.
  - Un `401` con token en `/api/auth/recuperar`, `/restablecer` y `/establecer-contrasena` no refresca.
- **Errores del servidor:**
  - En `cambiar-contrasena`: `429 DEMASIADOS_INTENTOS` (el texto coincide con `Retry-After: 900`), `CONTRASENA_ACTUAL_INCORRECTA`, `CONTRASENA_REPETIDA` y `VALIDACION` con el mensaje del servidor.
  - En el enlace: `ENLACE_INVALIDO` de la invitación con su texto propio y sin formulario; `400 VALIDACION`; y un `500` con el formato de la API no se confunde con un enlace inválido.
  - En `/recuperar`: `429 DEMASIADAS_SOLICITUDES` (coincide con `Retry-After: 3600`), y sin conexión no se muestra la confirmación.
  - En admin: `403 OPERACION_NO_PERMITIDA` y `404` al restablecer, sin temporal ni navegación; `409` al corregir; `400 VALIDACION` al invitar.
- **`/recuperar`:**
  - La confirmación es idéntica (`role="status"`) y nunca repite el correo.
  - El cuerpo es solo `{ email }`, recortado por el esquema.
  - Un correo inválido no se envía y queda marcado y descrito.
- **Doble envío** (dos clics en el mismo instante → 1 petición): `/restablecer`, `/cambiar-contrasena`, `/recuperar` e "Invitar a un maestro". Ver T-03 para la excepción.
- **Confirmación distinta y contraseña corta:** no envían, y el campo queda con `aria-invalid="true"` y con `aria-describedby` que apunta a la ayuda y al error.
- **Admin:**
  - La vista no hace ninguna petición al montar.
  - La ficha de una cuenta admin no ofrece "Restablecer" y muestra la explicación; 0 peticiones.
  - La confirmación es en línea, sin `role="dialog"` ni `alertdialog`, y "Cancelar" no hace ninguna petición.
  - Tras restablecer ya no queda "Sí, restablecer": una segunda temporal exige una confirmación nueva.
  - Volver a buscar la **misma** cuenta hace desaparecer la temporal, y también una búsqueda que da `404`.
  - Al desmontar la vista y al buscar otra cuenta, la temporal no queda en la caché (`gcTime: 0` funciona).
  - La corrección usa el `id` de la ficha, con `PUT` y solo `{ email }`.
- **"Copiar":**
  - Sin `navigator.clipboard` (contexto no seguro), toast de error, la temporal sigue visible y el botón se rehabilita.
  - Si `writeText` rechaza, toast de error sin rechazo sin manejar.
  - Con éxito, copia exactamente la temporal y avisa una vez.
- **Aviso del login:** `avisoDeLogin` con `toString`, `__proto__`, `constructor`, `hasOwnProperty`, mayúsculas, un arreglo, `__proto__` en JSON, una cadena o `null` no muestra nada, y el login con un aviso desconocido no pinta `role="status"`. `requiereCambioDeContrasena` no se deja engañar por un objeto que imita el código.
- **Revisión estática:**
  - `fetch(` solo en `services/apiClient.ts`.
  - `localStorage` y `sessionStorage` solo en comentarios.
  - `features/admin` no importa de `features/auth`, ni `auth` de `admin`.
  - Sin `components/ui/dialog` en admin.
  - Sin `?? []` en producción (el único está en `apiClient.test.ts`, del Programador).
  - Sin ternarios anidados: los tres ternarios de los archivos nuevos son simples.
  - Sin emojis, sin palabras prohibidas, sin colores, tamaños en píxeles, sombras ni `font-mono` sueltos en los archivos nuevos. Los radios `rounded-*` están mapeados a `--radius` en `tokens.css`.
  - Una sola acción `primary` por vista: `/admin` tiene "Enviar invitación", y "Buscar" y "Guardar correo" son `outline`.
  - Tipos de la API reexportados de `@campus/shared`.
- **Regresiones:** `apiClient.ataque`, `router.ataque` y `sesion-r2.ataque` siguen en verde en las tres corridas, igual que las 21 `*.ataque` del backend y las 106 pruebas del Programador.

## Observaciones sin severidad (no son hallazgos)

- `useLogin` (AUTH-01, fuera de 02b) deja la contraseña del login en la caché de mutaciones, igual que T-01. Lo anoto porque la corrección de T-01 probablemente sea la misma.
- La protección contra el doble envío de los formularios depende de un efecto lateral: el `setErrores({})` fuerza el render. Si alguien quita esa línea, el `if (x.isPending) return` deja de proteger (T-03 muestra qué pasa sin ella). Mis pruebas de doble envío lo vigilan.
- `RequireCambioDeContrasena` comprueba `isPending` antes que `isError`. `CLAUDE.md` pide el orden error → cargando; con TanStack Query los dos estados son excluyentes, así que no cambia el comportamiento.
- `components/ui/input.tsx` (preexistente, no de 02b) conserva clases de shadcn por defecto (`shadow-xs`, `ring-ring/50`, `border-input`).
- A 360 px, un correo largo sin espacios en la ficha (`text-sm`, sin `break-all`) podría desbordar el contenedor. No lo verifiqué (ver abajo).

## No atacado y por qué

- **La vista a 360 px:** jsdom no calcula el diseño. No arranqué Vite con un navegador porque el repositorio no tiene Playwright ni una herramienta equivalente, e instalarla exige autorización. Solo revisé las clases: no hay anchos fijos en píxeles.
- **El flujo real en el navegador** (API + worker + Vite, con los correos en `backend/tmp/correos/`): exige arrancar la API y el worker contra `campus_dev`, y el encargo no lo autoriza. `window.location.assign`, `history.replaceState` real y la recarga completa de `irA` quedaron probados con el router en memoria y `irA` simulado.
- **Doble clic con ratón real:** solo lo reproduje con dos eventos síncronos (T-03). Medir la ventana en un navegador real exige lo mismo que el punto anterior.
- **El texto de "Frontend en local" §3 del README:** no ejecuté sus comandos (arrancan procesos de larga vida).

## Tabla de hashes vigente (SHA-256) de todas las `*.ataque`

| Archivo | SHA-256 | Estado |
|---|---|---|
| `backend/test/auth-login.ataque.test.ts` | `2c83d82d10bdd9b7a969768774d75b18b7a71a594bbaac5fae36a0e134d2336c` | sin cambios |
| `backend/test/auth-registro.ataque.test.ts` | `73d3a2ae708a0ef676547a8094115b1419423057378387269bc3eadb34c7724e` | sin cambios |
| `backend/test/sesiones-y-cadena.ataque.test.ts` | `6e4b4677d73bde3d7c7845c729637186249e704f2aa803fb5efa25e76126b445` | sin cambios |
| `backend/test/api-real.ataque.test.ts` | `441a766a94e7d9b26807790402e06ed94d4cc378d8f6ecf0bccc3259c7ff55fb` | sin cambios |
| `backend/test/admin-unico.ataque.test.ts` | `388ad0e585639b8c3e0e0a6657fb42c1b9cb83db721c4863c4fa19e0be42ec85` | sin cambios |
| `backend/src/config/env.ataque.test.ts` | `4fce3cedf662ba3a188f21a2277db417747d342c115efd4746d3cff58499289b` | sin cambios |
| `frontend/src/services/apiClient.ataque.test.ts` | `10c730348d18ff8dae7b3623751d31122aa58560b564ad191717fa1938a6f8ce` | sin cambios |
| `frontend/src/app/router.ataque.test.tsx` | `e58293532633dc5cfe21561e2609d170638c81886b9c31129f03864c73a34f45` | sin cambios |
| `backend/test/intentos-r2.ataque.test.ts` | `a8b79d5ad98270be3747f493865708a78bb73add08d832584db4464c3582777a` | sin cambios |
| `backend/test/guarda-r2.ataque.test.ts` | `ea078f41cc98c947d9b3966ee8eccec2bd5d06eacbaf7ee8cd85f38e6a697c15` | sin cambios |
| `backend/test/nombres-tokens-r2.ataque.test.ts` | `00a6eb6f7ccd7d8790c356befcc96ddfda6eacce0be53de255cfe3626d8f2adb` | sin cambios |
| `backend/test/logs-r2.ataque.test.ts` | `5af3909e4b7ca485e78979567872ea78bf41e6d679b9ec2c761eaa0b250df689` | sin cambios |
| `frontend/src/app/sesion-r2.ataque.test.tsx` | `06f35be8ae68f0abae775268e4e64f3df880ff137a9b54aa3c135941ddb93dcf` | sin cambios |
| `backend/test/nombres-guarda-r3.ataque.test.ts` | `97b8d6f6c6b26b9b651eb0b46a48ed27b594a8ef659937eb600fde793f07e873` | sin cambios |
| `backend/test/cuentas-r1.ataque.test.ts` | `994a38f476d55f0b8826dc4b80e07dfb013f9034c7f7aee3cdc29dd74338b793` | sin cambios |
| `backend/test/worker-r1.ataque.test.ts` | `f4ea0bd908d8ec538aa479f9b09bf6fc6f86df6f93bb7abaaccd7001de876395` | sin cambios |
| `backend/test/logs-cuentas-r1.ataque.test.ts` | `a47af988453adcbc0e7ca710e670b5e2b9906e995ae6aa71e43fa8555764014c` | sin cambios |
| `backend/test/arquitectura-cuentas-r1.ataque.test.ts` | `42bb7bf3086230c6edc65ab73976ac8a801956336561aadbee65cc3b40eb8612` | sin cambios |
| `backend/test/arranque-r1.ataque.test.ts` | `aae65c95cf34db814d650af5f7fa08d09bff3e6fc6863d4252383058499aa10e` | sin cambios |
| `backend/src/config/logger.ataque.test.ts` | `43f1754c8c33f7de285ab77dbabb0f493422e858529432c9b2be26ff9423b01b` | sin cambios |
| `backend/src/config/correo.ataque.test.ts` | `bcce2cae771f97957d8691bef7fff4ec42412daaeabf726aeb0afc59f6f25671` | sin cambios |
| `backend/test/cuentas-r2.ataque.test.ts` | `736ae5fc909b5f53b6768010047378324e808c5bbe0434c0b0d140b58d0e598b` | sin cambios |
| `backend/test/worker-r2.ataque.test.ts` | `64aa76974c7ae3e89b2f1ed3d7efc7864d4323310932a9f46f02c798c363a6d2` | sin cambios |
| `backend/test/cuentas-r3.ataque.test.ts` | `a352625e291810251f41f53c3da37de82b662a20a82a66127f4d210ba6041b34` | sin cambios |
| `frontend/src/features/auth/enlace-r1.ataque.test.tsx` | `2584bd412e2d70e22a97cefeeb6278597d2e67ddf55f749bc739411ba432590a` | nuevo (42 pruebas) |
| `frontend/src/app/cuentas-r1.ataque.test.tsx` | `a66120ed3c04a5c02dc64b33ad008be420739fa24eb67ac42d546429e74d7a4a` | nuevo (24 pruebas) |
| `frontend/src/features/admin/cuentas-r1.ataque.test.tsx` | `fc4b41d188dde4b48daf6fe5a52efc7862678d81931ad9e09546807e34afaf3a` | nuevo (29 pruebas) |

Conteos:
- Las `*.ataque` pasan de 24 a 27 archivos.
- El frontend pasa de 17 archivos y 106 pruebas (tras la ronda 1 del Programador) a **20 archivos y 201 pruebas**: 189 en verde y 12 en rojo, las de T-01 a T-08.
- El backend sigue en **65 archivos y 657 pruebas**.

Pruebas en rojo por hallazgo:
- T-01: 3.
- T-02: 2.
- T-03: 1.
- T-04, T-05, T-06 y T-08: 1 cada uno.
- T-07: 2.

## Archivos que escribió el Tester en esta ronda (solo pruebas; nada de producción)

Nuevos:
- `frontend/src/features/auth/enlace-r1.ataque.test.tsx`
- `frontend/src/app/cuentas-r1.ataque.test.tsx`
- `frontend/src/features/admin/cuentas-r1.ataque.test.tsx`

Modificado: `docs/trabajo/AUTH-02-cuentas-y-correo/reporte-tester.md`. Añadí esta sección al final; las secciones de AUTH-02a quedan íntegras.

# Reporte del Tester — AUTH-02b — Ronda 2

Veredicto: **ROTO**

Verificación propia: lint `verde` (raíz, los tres workspaces, código 0) · test backend `657/657` y frontend `223` verdes + `3` en rojo (todas mías, de hallazgos nuevos), idéntico en tres corridas completas desde la raíz.

Hallazgos nuevos: 0 críticos · 0 altos · 1 medio · 2 bajos. T-01 a T-08: corregidos. Los tres hallazgos nuevos salen de la corrección de T-07.

## Verificación propia

- **Precondición de red, antes de la primera corrida del backend:**
  - Regla del firewall "Campus: bloquear entrada a Docker en redes publicas": `True` / `Inbound` / `Block` / `Public`.
  - Red `IZZI-F281` / `Public`, declarada de confianza por el humano.
  - Docker `28.5.1`. Al empezar no había contenedores de Testcontainers.
- **Hashes de entrada:** los 27 de la tabla de la ronda 1 de AUTH-02b coincidían antes de tocar nada y siguen coincidiendo al terminar (`sha256sum -c`: 27/27 OK). El Programador no tocó ninguna `*.ataque`.
- **Tres corridas completas de `npm test` desde la raíz**, con la salida a un archivo y sin tubería, ya con mis tres archivos en su versión final:

| Corrida | Backend | Frontend | Duración backend / frontend (Vitest) |
|---|---|---|---|
| 1 | 65 archivos · 657/657 | 23 archivos · 226 pruebas · 223 ✓ · 3 ✗ | 51,3 s / 25,2 s |
| 2 | ídem | ídem | 49,8 s / 24,2 s |
| 3 | ídem | ídem | 51,5 s / 26,2 s |

  - Las 3 en rojo son exactamente las mismas en las tres corridas (comparadas con `diff`) y todas son de `features/admin/cuentas-r2.ataque.test.tsx`. Ninguna prueba del Programador ni ninguna `*.ataque` anterior falla: las 12 que estaban en rojo en la ronda 1 pasan.
  - En las tres corridas no aparecen `FSTDEP`, `too many clients`, `40P01`, `deadlock detected` ni `could not serialize` (0 coincidencias).
  - Al terminar, `docker ps -a --filter "label=org.testcontainers=true"` quedó vacío.
- **Lint:** `npm run lint` desde la raíz → código 0 (ESLint, `prettier --check` y `tsc -b` en `frontend/`), con mis archivos incluidos.
  - Formateé solo mis tres archivos, con `npx prettier --write <archivo>` desde `frontend/`.
- Mis archivos quedan con finales de línea `lf` (`git ls-files --eol`).
- No toqué código de producción, pruebas del Programador ni mis pruebas anteriores. No arranqué Vite, la API ni el worker. Git, solo de lectura. No leí ningún `.env`. `git status` sobre `backend/` y `shared/` sigue vacío.

## Estado de los hallazgos de la ronda 1

Revisé cada corrección en el código, no solo en mis pruebas.

| Hallazgo | Estado | Lo que comprobé además de la prueba original |
|---|---|---|
| T-01 | **Corregido** | En TanStack Query 5.103.2, el `onSettled` del hook corre desde `Mutation.execute` aunque el componente ya no exista, tanto en el éxito como en el error, y antes de notificar a los observadores. Quedan en verde, en `enlace-r2.ataque` y `app/cuentas-r2.ataque`: el error sin salir de la pantalla; el reintento tras un fallo de red; `ENLACE_INVALIDO` en `/restablecer` y `/establecer-contrasena`; salir con la petición en vuelo y que después se resuelva o falle; y los caminos del `409`. En la caché de consultas nunca entra el token. Sigue habiendo `variables` en el observador de `useMutation` mientras el formulario está montado: es estado de React y DEC-18 lo permite. |
| T-02 | **Corregido** | No hay bucle. Con un `409` y `/me` sin conexión, el usuario se queda en el formulario con "Ya no tienes un cambio de contraseña pendiente.": `RequireCambioDeContrasena` no rebota a `/login`, no hay `irA`, `/me` se pide 2 veces y `/refrescar` 1. Con un `409` y `/me` insistiendo en `403 CAMBIO…`, `apiClient` no navega porque ya está en `/cambiar-contrasena`. El camino 2 de la ronda 1 (`204` con `/me` caído y después el reintento con `409`) llega al dashboard. Un restringido con `409` termina en `/acceso-restringido`. Mientras se resuelve el `/me` del `409`, un segundo envío no sale (`isPending` sigue en `true` durante el `onError`). Si la sesión se pierde en ese `/me`, hay un solo `irA("/login")`. |
| T-03 | **Corregido** | La guarda con `useRef` se libera en el `onSettled` de la llamada: tras un `500` o un fallo de red, "Sí, restablecer" vuelve a enviar y muestra la temporal (2 peticiones en total). Con la primera en vuelo, "Cancelar" → "Restablecer contraseña" → "Sí, restablecer" no manda una segunda petición. |
| T-04 | **Corregido** | Sin estados cruzados. Si una corrección de Carla termina después de buscar a Beto, no cambia la ficha de Beto: el callback por llamada no corre sin observador. Tras corregir a Carla y buscar a Beto, se ven los datos de Beto, sin "Correo actualizado". Una temporal ya visible se queda en la ficha de Carla al corregir su correo, y la ficha muestra el correo nuevo. |
| T-05 | **Corregido** | Tras corregir, una búsqueda rechazada en el cliente quita también la ficha corregida, sin hacer ninguna petición. Si la temporal de Carla llega cuando ya se buscó a Beto, no aparece en la ficha de Beto. |
| T-06 | **Corregido** | `CircleAlert` con `aria-hidden` y el texto, con `text-warning`. |
| T-07 | **Corregido en lo que pedían sus dos pruebas, pero la corrección abre T-09 y T-11, y T-10 sigue abierto** | El `role="status"` está bien puesto. El foco se resolvió con `autoFocus` en "Sí, restablecer" y en "Copiar"; ver abajo. |
| T-08 | **Corregido** | `hooks.ts` de admin ya no declara tipos. `CorregirCorreoVariables` está en `types.ts`. |

## Hallazgos

### T-09 — Con dos Enter sobre "Restablecer contraseña" se restablece sin confirmar
Severidad: media

Prueba: `frontend/src/features/admin/cuentas-r2.ataque.test.tsx` › "Enter dos veces sobre 'Restablecer contraseña' no restablece sin que el admin confirme"

Esperado / Obtenido:
- Esperado: la confirmación en línea (DEC-19: "Restablecer contraseña" → "Se cerrarán todas sus sesiones…" → "Sí, restablecer") exige un gesto deliberado sobre la acción destructiva. Un segundo Enter no debería confirmarla.
- Obtenido: `1` `POST /restablecer-contrasena` (se esperaba `0`). El mensaje de la prueba lo explica: "tras el primero el foco estaba en 'Sí, restablecer'".
- La causa es la corrección de T-07: "Sí, restablecer" (`variant="destructive"`) lleva `autoFocus`. El primer Enter abre la confirmación y deja el foco en la acción destructiva. El segundo Enter, o la repetición automática de la tecla si se deja apretada, la ejecuta.
- La consecuencia es inmediata e irreversible: se cierran todas las sesiones del usuario y su contraseña se sustituye por una temporal. En la ronda 1 esto no pasaba, porque el foco caía en `<body>`.
- La práctica aceptada (WAI-ARIA APG, patrón de diálogo de alerta) es llevar el foco a la acción menos destructiva ("Cancelar").

Reproducción:
1. Como admin, buscar una cuenta de maestro o de estudiante.
2. Tabular hasta "Restablecer contraseña" y pulsar Enter dos veces seguidas, o mantenerlo apretado.
3. Aparece la temporal: la cuenta ya se restableció.

La prueba emula Enter con un `click` sobre `document.activeElement`: jsdom no ejecuta la acción por defecto de la tecla, pero en un navegador Enter sobre un botón con el foco dispara su activación.

Requisito o regla violada: DEC-19 (confirmación en línea de una acción sensible) y `CLAUDE.md` (confirmación de las acciones destructivas o sensibles). Es una regresión de la ronda 2.

### T-10 — "Cancelar" sigue dejando el foco en `<body>`
Severidad: baja

Prueba: `frontend/src/features/admin/cuentas-r2.ataque.test.tsx` › "'Cancelar' no deja el foco en <body>"

Esperado / Obtenido:
- Esperado: al cancelar, el foco vuelve a un control, normalmente "Restablecer contraseña".
- Obtenido: "Cancelar" se desmonta y `document.activeElement` es `<body>`. Es el mismo defecto de T-07, en el camino de vuelta: el `autoFocus` solo cubre la ida.

Requisito o regla violada: la misma de T-07 (accesibilidad básica: el foco; plan, "con foco visible"; WCAG 2.4.3).

### T-11 — La temporal le roba el foco al admin si está escribiendo en otro campo
Severidad: baja

Prueba: `frontend/src/features/admin/cuentas-r2.ataque.test.tsx` › "la temporal que llega mientras el admin escribe en otro campo no le roba el foco"

Esperado / Obtenido:
- Esperado: si el admin movió el foco a otro campo mientras la petición estaba en vuelo (por ejemplo, "Nombre completo" de "Invitar a un maestro"), el foco se queda donde él lo puso.
- Obtenido: al llegar la respuesta, el `autoFocus` de "Copiar" (`contrasena-temporal.tsx`) se lleva el foco. Lo que el admin siga tecleando ya no llega al campo, y Espacio o Enter activan "Copiar".
- El `autoFocus` está bien cuando el foco sigue en la confirmación. La prueba "cuando el admin sigue en la confirmación, el foco llega a 'Copiar'" pasa.

Reproducción:
1. Buscar una cuenta y pulsar "Restablecer contraseña" → "Sí, restablecer".
2. Antes de que responda la API (argon2 tarda unos cientos de milisegundos; más con una red lenta), hacer clic en "Nombre completo" y empezar a escribir.
3. Al aparecer la temporal, el foco salta a "Copiar".

Requisito o regla violada: WCAG 3.2.2 (un cambio de contexto que el usuario no pidió) y la intención de T-07 (no perder el foco). Este defecto lo introdujo la ronda 2; el Programador lo declaró como desviación 2.

## Atacado sin hallazgos

Todo en verde, en mis tres archivos nuevos (22 de 25 pruebas en verde; las 3 en rojo son T-09, T-10 y T-11):

- **T-01 a fondo:** 7 pruebas en `enlace-r2.ataque`, más 2 aserciones de caché en `app/cuentas-r2.ataque`, en los casos que resume la tabla. Además, en `/establecer-contrasena`, `location.state` al llegar a `/login` es exactamente `{ aviso: "cuenta-activada" }`.
- **T-02 sin bucles:** 6 pruebas en `app/cuentas-r2.ataque`, en los casos que resume la tabla.
- **T-03, T-04 y T-05:** 3 pruebas de la guarda y 5 de estados cruzados en `admin/cuentas-r2.ataque`, en los casos que resume la tabla.
- **Revisión estática de los archivos que cambiaron en la ronda 2:**
  - sin `?? []`;
  - sin tipos declarados en `hooks.ts`;
  - sin colores, píxeles ni sombras sueltos;
  - sin `console.` ni `any`;
  - `fetch(` solo en `services/apiClient.ts`;
  - `localStorage` y `sessionStorage` solo en comentarios;
  - sin `useMutationState`, `useIsMutating` ni Devtools que lean la caché de mutaciones.
- **Regresiones:** las 27 `*.ataque` anteriores (21 del backend y 6 del frontend) y las pruebas del Programador siguen en verde en las tres corridas, incluidas las 95 pruebas de mis tres archivos de la ronda 1.

## Observaciones sin severidad (no son hallazgos)

- **Archivo modificado sin declarar:** `frontend/src/features/auth/components/formulario-cambiar-contrasena.tsx` tiene fecha de modificación 09:34, posterior a mis pruebas de la ronda 1 (08:59), pero no aparece en "Archivos creados o modificados en esta ronda" del resumen del Programador. Como el archivo no está en git, no puedo compararlo con su versión de la ronda 1. Su contenido actual se comporta como en la ronda 1: guarda `isPending`, el `setErrores({})` antes de `mutate` y la validación con el esquema de `shared/`. Todas las pruebas que lo ejercitan pasan. Conviene que el Manager lo mire en la revisión del diff.
- `useLogin` (AUTH-01) sigue dejando la contraseña del login 5 minutos en la caché de mutaciones: ya lo anoté en la ronda 1. El flujo de 02b termina ahí: tras `/restablecer` o `/establecer-contrasena`, el usuario entra en `/login` con su contraseña nueva, que se queda en la caché. El remedio sería el mismo de T-01. Queda fuera del alcance de 02b, y lo dejo para que decida el Manager.
- Si el admin pulsa "Sí, restablecer" y, con la petición en vuelo, busca otra cuenta (o la misma), la cuenta se restablece en el servidor, pero la temporal no se muestra nunca. El usuario pierde sus sesiones y hay que restablecerla otra vez. Es coherente con DEC-19 ("al buscar otra cuenta… la temporal desaparece"), pero el admin no recibe ninguna señal de que el restablecimiento ocurrió.
- Ante un fallo de red, la pantalla de admin muestra "No pudimos completar la operación. Inténtalo de nuevo.": `MENSAJES_ERROR_ADMIN` no tiene `SIN_CONEXION`. Las pantallas de auth muestran en ese caso "No pudimos conectar…". El plan no fija este texto.
- `role="status"` envuelve también el botón "Copiar". Un lector de pantalla puede anunciar la etiqueta del botón junto con la temporal. No lo verifiqué con NVDA ni VoiceOver.

## No atacado y por qué

- **La vista a 360 px y el foco en un navegador real:** jsdom no calcula el diseño, y el repositorio no tiene Playwright ni una herramienta equivalente (instalarla exige autorización). T-09 emula Enter como se explica en su reproducción. Con una herramienta de navegador, el siguiente paso sería confirmarlo con teclado real.
- **El flujo real con API, worker y Vite:** exige arrancar procesos contra `campus_dev`, y el encargo no lo autoriza.
- **Lectores de pantalla reales**, por la misma razón que el Programador: solo se verificó lo que expone jsdom (`role`, `document.activeElement`).

## Tabla de hashes vigente (SHA-256) de todas las `*.ataque`

| Archivo | SHA-256 | Estado |
|---|---|---|
| `backend/test/auth-login.ataque.test.ts` | `2c83d82d10bdd9b7a969768774d75b18b7a71a594bbaac5fae36a0e134d2336c` | sin cambios |
| `backend/test/auth-registro.ataque.test.ts` | `73d3a2ae708a0ef676547a8094115b1419423057378387269bc3eadb34c7724e` | sin cambios |
| `backend/test/sesiones-y-cadena.ataque.test.ts` | `6e4b4677d73bde3d7c7845c729637186249e704f2aa803fb5efa25e76126b445` | sin cambios |
| `backend/test/api-real.ataque.test.ts` | `441a766a94e7d9b26807790402e06ed94d4cc378d8f6ecf0bccc3259c7ff55fb` | sin cambios |
| `backend/test/admin-unico.ataque.test.ts` | `388ad0e585639b8c3e0e0a6657fb42c1b9cb83db721c4863c4fa19e0be42ec85` | sin cambios |
| `backend/src/config/env.ataque.test.ts` | `4fce3cedf662ba3a188f21a2277db417747d342c115efd4746d3cff58499289b` | sin cambios |
| `frontend/src/services/apiClient.ataque.test.ts` | `10c730348d18ff8dae7b3623751d31122aa58560b564ad191717fa1938a6f8ce` | sin cambios |
| `frontend/src/app/router.ataque.test.tsx` | `e58293532633dc5cfe21561e2609d170638c81886b9c31129f03864c73a34f45` | sin cambios |
| `backend/test/intentos-r2.ataque.test.ts` | `a8b79d5ad98270be3747f493865708a78bb73add08d832584db4464c3582777a` | sin cambios |
| `backend/test/guarda-r2.ataque.test.ts` | `ea078f41cc98c947d9b3966ee8eccec2bd5d06eacbaf7ee8cd85f38e6a697c15` | sin cambios |
| `backend/test/nombres-tokens-r2.ataque.test.ts` | `00a6eb6f7ccd7d8790c356befcc96ddfda6eacce0be53de255cfe3626d8f2adb` | sin cambios |
| `backend/test/logs-r2.ataque.test.ts` | `5af3909e4b7ca485e78979567872ea78bf41e6d679b9ec2c761eaa0b250df689` | sin cambios |
| `frontend/src/app/sesion-r2.ataque.test.tsx` | `06f35be8ae68f0abae775268e4e64f3df880ff137a9b54aa3c135941ddb93dcf` | sin cambios |
| `backend/test/nombres-guarda-r3.ataque.test.ts` | `97b8d6f6c6b26b9b651eb0b46a48ed27b594a8ef659937eb600fde793f07e873` | sin cambios |
| `backend/test/cuentas-r1.ataque.test.ts` | `994a38f476d55f0b8826dc4b80e07dfb013f9034c7f7aee3cdc29dd74338b793` | sin cambios |
| `backend/test/worker-r1.ataque.test.ts` | `f4ea0bd908d8ec538aa479f9b09bf6fc6f86df6f93bb7abaaccd7001de876395` | sin cambios |
| `backend/test/logs-cuentas-r1.ataque.test.ts` | `a47af988453adcbc0e7ca710e670b5e2b9906e995ae6aa71e43fa8555764014c` | sin cambios |
| `backend/test/arquitectura-cuentas-r1.ataque.test.ts` | `42bb7bf3086230c6edc65ab73976ac8a801956336561aadbee65cc3b40eb8612` | sin cambios |
| `backend/test/arranque-r1.ataque.test.ts` | `aae65c95cf34db814d650af5f7fa08d09bff3e6fc6863d4252383058499aa10e` | sin cambios |
| `backend/src/config/logger.ataque.test.ts` | `43f1754c8c33f7de285ab77dbabb0f493422e858529432c9b2be26ff9423b01b` | sin cambios |
| `backend/src/config/correo.ataque.test.ts` | `bcce2cae771f97957d8691bef7fff4ec42412daaeabf726aeb0afc59f6f25671` | sin cambios |
| `backend/test/cuentas-r2.ataque.test.ts` | `736ae5fc909b5f53b6768010047378324e808c5bbe0434c0b0d140b58d0e598b` | sin cambios |
| `backend/test/worker-r2.ataque.test.ts` | `64aa76974c7ae3e89b2f1ed3d7efc7864d4323310932a9f46f02c798c363a6d2` | sin cambios |
| `backend/test/cuentas-r3.ataque.test.ts` | `a352625e291810251f41f53c3da37de82b662a20a82a66127f4d210ba6041b34` | sin cambios |
| `frontend/src/features/auth/enlace-r1.ataque.test.tsx` | `2584bd412e2d70e22a97cefeeb6278597d2e67ddf55f749bc739411ba432590a` | sin cambios |
| `frontend/src/app/cuentas-r1.ataque.test.tsx` | `a66120ed3c04a5c02dc64b33ad008be420739fa24eb67ac42d546429e74d7a4a` | sin cambios |
| `frontend/src/features/admin/cuentas-r1.ataque.test.tsx` | `fc4b41d188dde4b48daf6fe5a52efc7862678d81931ad9e09546807e34afaf3a` | sin cambios |
| `frontend/src/features/auth/enlace-r2.ataque.test.tsx` | `5fda63b653dbc0db6b1d16c3f26506f5fae630fdfd4a9921a9ef5db98e39d438` | nuevo (7 pruebas) |
| `frontend/src/app/cuentas-r2.ataque.test.tsx` | `b61346baf0c3789fdc15eea548623afb4bf3dc8c230f1944df4336de3a27f9eb` | nuevo (6 pruebas) |
| `frontend/src/features/admin/cuentas-r2.ataque.test.tsx` | `5365955297066f2e0c1bc8bb9fc9aaf6f6f8d7736886ecde8829d339f7241cf1` | nuevo (12 pruebas) |

Conteos:
- Las `*.ataque` pasan de 27 a 30 archivos.
- El frontend pasa de 20 archivos y 201 pruebas a **23 archivos y 226 pruebas**: 223 en verde y 3 en rojo (T-09, T-10 y T-11, una cada uno).
- El backend sigue en **65 archivos y 657 pruebas**.

## Archivos que escribió el Tester en esta ronda (solo pruebas; nada de producción)

Nuevos:
- `frontend/src/features/auth/enlace-r2.ataque.test.tsx`
- `frontend/src/app/cuentas-r2.ataque.test.tsx`
- `frontend/src/features/admin/cuentas-r2.ataque.test.tsx`

Modificado: `docs/trabajo/AUTH-02-cuentas-y-correo/reporte-tester.md`. Añadí esta sección al final; las anteriores quedan íntegras.

# Reporte del Tester — AUTH-02b — Ronda 3

Veredicto: **ROTO**

Verificación propia: lint `verde` (raíz, los tres workspaces, código 0) · test backend `657/657` y frontend `241` verdes + `3` en rojo (todas mías, de hallazgos nuevos), idéntico en tres corridas completas desde la raíz.

Hallazgos nuevos: 0 críticos · 0 altos · 0 medios · 2 bajos (T-12 y T-13). T-09, T-10 y T-11 están corregidos en el código. T-07 se cumple en jsdom, pero en un navegador Chromium su segunda mitad vuelve a fallar (T-12).

## Verificación propia

- **Precondición de red, antes de la primera corrida del backend:**
  - Regla del firewall "Campus: bloquear entrada a Docker en redes publicas": `True` / `Inbound` / `Block` / `Public`.
  - Red `IZZI-F281` / `Public`, declarada de confianza por el humano.
  - Docker `28.5.1`. Al empezar no había contenedores de Testcontainers.
- **Hashes de entrada:** los 30 de la tabla de la ronda 2 coincidían antes de tocar nada y siguen coincidiendo al terminar (`sha256sum -c`: 30/30 OK). El Programador no tocó ninguna `*.ataque`.
- **Alcance real de la ronda 3 del Programador:** tras mis pruebas de la ronda 2, solo cambiaron `features/admin/components/ficha-de-cuenta.tsx` y `contrasena-temporal.tsx` (lo comprobé con `find -newer`). Coincide con lo que declaró. `git status` sobre `backend/`, `shared/` y `eslint.config.mjs` sigue vacío. Los archivos de `backend/src/adapters/db/generated/` los regenera Prisma en cada corrida y no aparecen en `git status`.
- **Tres corridas completas de `npm test` desde la raíz**, con la salida a un archivo y sin tubería, ya con mi archivo en su versión final:

| Corrida | Backend | Frontend | Duración backend / frontend (Vitest) |
|---|---|---|---|
| 1 | 65 archivos · 657/657 | 24 archivos · 244 pruebas · 241 ✓ · 3 ✗ | 51,9 s / 26,8 s |
| 2 | ídem | ídem | 50,4 s / 26,4 s |
| 3 | ídem | ídem | 51,2 s / 27,4 s |

  - Las 3 en rojo son exactamente las mismas en las tres corridas (comparadas con `diff`) y todas son de `features/admin/cuentas-r3.ataque.test.tsx`. Ninguna prueba del Programador ni ninguna de las 30 `*.ataque` anteriores falla.
  - En las tres corridas no aparecen `FSTDEP`, `too many clients`, `40P01`, `deadlock detected` ni `could not serialize` (0 coincidencias).
  - Al terminar, `docker ps -a --filter "label=org.testcontainers=true"` quedó vacío.
- **Lint:** `npm run lint` desde la raíz → código 0 (ESLint, `prettier --check` y `tsc -b` en `frontend/`), con mi archivo incluido. Formateé solo mi archivo, con `npx prettier --write src/features/admin/cuentas-r3.ataque.test.tsx` desde `frontend/`. Mi archivo queda con finales de línea `lf`.
- **Sonda en un navegador real, para T-12:** jsdom no implementa la "corrección del foco" del HTML, así que la medí en Chrome `153.0.8010.53` sin interfaz (`--headless=new --dump-dom`, con un perfil desechable en el scratchpad). La sonda es una página HTML suelta, sin React ni código del proyecto, y se quedó en el scratchpad. El resultado:

  ```
  hasFocus=false active tras focus(A)=a
  sync tras disabled(A): active=a
  blur(capture) a
  focusout a
  100ms tras disabled(A): active=BODY
  active tras focus(B)=b
  blur(capture) b
  focusout b
  sync tras remove(B): active=BODY
  ```

  - Un botón con el foco que pasa a `disabled` lo pierde en la siguiente actualización de la página: Chrome dispara `blur` y `focusout` y deja el foco en `<body>`.
  - Un botón con el foco que se quita del DOM dispara `blur` y `focusout` de forma síncrona.
  - **Incidencia:** intenté repetir la sonda con Edge `154.0.4258.37`, pero respondió "Se está abriendo en una sesión de navegador existente" y no produjo salida. Es posible que haya abierto una pestaña con la página local de la sonda en la sesión de Edge que ya estaba abierta. No volví a intentarlo. Comprobé que no quedó vivo ningún proceso de navegador lanzado por mí.
- No toqué código de producción, pruebas del Programador ni mis pruebas anteriores. No arranqué Vite, la API ni el worker. Git, solo de lectura. No leí ningún `.env` ni toqué `campus_dev`.

## Estado de T-07, T-09, T-10 y T-11

Revisé cada corrección en el código, no solo en mis pruebas.

| Hallazgo | Estado | Lo que comprobé en el código y con pruebas nuevas |
|---|---|---|
| T-09 | **Corregido** | Ya no hay ningún `autoFocus`. El `useEffect` sobre `confirmando` lleva el foco a "Cancelar" al abrir, nunca a "Sí, restablecer". Nueve activaciones seguidas de Enter sobre lo que tenga el foco alternan entre "Cancelar" y "Restablecer contraseña", con 0 peticiones y sin pasar nunca por `<body>`. El foco pasa de "Cancelar" a "Sí, restablecer" solo con Shift+Tab: "Sí, restablecer" va antes en el DOM, y Tab desde "Cancelar" sale de la confirmación. Ahí Enter sí restablece, con 1 petición: es el gesto deliberado. En Chromium el camino también se sostiene: el botón que se quita dispara `blur`, y el efecto enfoca "Cancelar" después. |
| T-10 | **Corregido** | La rama `confirmando === false` del mismo efecto devuelve el foco a "Restablecer contraseña". Lo comprobé con cinco vueltas seguidas de abrir y cancelar, y también tras un `500`. |
| T-11 | **Corregido** | `onBlurCapture` apaga `tieneFocoRef` de forma síncrona. Una temporal que llega mientras el admin escribe en "Nombre completo" (ronda 2) o en "Correo correcto" de la misma ficha (ronda 3) no le quita el foco. El ref se lee solo en el `onSuccess` por llamada, nunca en el render. |
| T-07 | **Se cumple en jsdom; en Chromium la segunda mitad vuelve a fallar** | Siguen el `role="status"` de la temporal y el foco en "Cancelar" al pedir la confirmación. En jsdom, "Copiar" recibe el foco cuando el admin no se movió. En Chromium, "Sí, restablecer" se deshabilita con `isPending` mientras tiene el foco, el navegador lo saca con un `blur`, `tieneFocoRef` queda en `false` antes de la respuesta, y "Copiar" no lo recibe nunca: el foco queda en `<body>`. Ver T-12. |

## `formulario-cambiar-contrasena.tsx` (el archivo sin declarar de la ronda 2)

Lo leí completo (141 líneas) y lo contrasté con el plan (DEC-09, DEC-17, "Cambios por capa › frontend" y los textos de `/cambiar-contrasena`), con la corrección de T-02 y con su gemelo `formulario-nueva-contrasena.tsx`. **No encontré nada que no debería estar.**

- Su fecha, 09:34:17, es un minuto anterior a la de `features/auth/hooks.ts` (09:35:28), donde vive la corrección de T-01 y T-02. Parece un guardado o un formateo del editor durante ese arreglo. Como el archivo nunca estuvo en git, no hay forma de probar qué cambió.
- Todos los textos salen de `TEXTOS_CAMBIAR` y coinciden con el plan: "Contraseña temporal", "Contraseña nueva" con la ayuda "Mínimo 10 caracteres", "Confirma la contraseña nueva", "Guardar y continuar" (`primary`) y "Cerrar sesión" (`outline`).
- Valida con `cambiarContrasenaSchema` de `shared/`. La confirmación se valida aparte con `contrasenasCoinciden` y no viaja al servidor: el cuerpo es solo `{ contrasenaActual, contrasenaNueva }`.
- Guarda `isPending` antes de enviar y llama a `setErrores({})` y `setErrorConfirmacion(false)` antes de `mutate`. Es la misma defensa contra el doble envío de la ronda 1, que mis pruebas de doble envío siguen vigilando.
- Tiene `label htmlFor`, `aria-invalid` y `aria-describedby` con la ayuda y el error, y `autoComplete` es `current-password` o `new-password`.
- No trata el `409` en el componente. Lo trata `useCambiarContrasena`, con el texto de `MENSAJES_ERROR_AUTH.CAMBIO_NO_REQUERIDO`, como pide la corrección de T-02. No hay destino fijado desde el cliente: lo sigue decidiendo `/me` (DEC-17).
- No tiene `value` ni `defaultValue`, ni almacenamiento, `console`, `any`, `?? []` o valores por defecto sobre `rol` o banderas. Su estructura es idéntica, línea por línea, a la de `formulario-nueva-contrasena.tsx` (fechado 08:33), salvo el campo extra de la temporal.
- Un detalle que no es un hallazgo: "Cerrar sesión" no se deshabilita mientras el cambio está en vuelo. Salir a mitad no rompe nada, porque `useCerrarSesion` navega a `/login` y vacía la caché.

## Hallazgos

### T-12 — En Chromium, "Copiar" nunca recibe el foco tras confirmar, y tras un error el foco queda en `<body>`
Severidad: baja

Prueba:
- `frontend/src/features/admin/cuentas-r3.ataque.test.tsx` › "el admin confirma y no se mueve: al llegar la temporal, el foco llega a 'Copiar'"
- ídem › "el admin confirma y el servidor responde 500: el foco no queda en <body>"

Esperado / Obtenido:
- Esperado: el admin confirma y no mueve el foco a ningún lado. Al llegar la temporal, el foco llega a "Copiar". Así lo afirma el resumen de la ronda 3 ("Cuando el admin sigue en la confirmación… 'Copiar' recibe el foco, como ya exigía T-07"). Tras un error, el foco no queda en `<body>`.
- Obtenido: `document.activeElement` es `<body>` en los dos casos.

Por qué:
1. "Sí, restablecer" lleva `disabled={restablecer.isPending}`, y el admin lo acaba de activar, así que tiene el foco: Chrome enfoca el botón con el clic, y con el teclado ya lo tenía.
2. En Chromium, un botón con el foco que pasa a `disabled` lo pierde en la siguiente actualización de la página: el navegador dispara `blur` y `focusout` y deja el foco en `<body>` (sonda de "Verificación propia").
3. React recibe ese `focusout` como `onBlurCapture` del contenedor, y `manejarDesenfoque` pone `tieneFocoRef` en `false` mucho antes de la respuesta (argon2 tarda cientos de milisegundos).
4. El `onSuccess` lee ese `false`, así que `enfocarTemporal` queda en `false` y `ContrasenaTemporal` no mueve el foco. Con un error pasa lo mismo: nada devuelve el foco a la confirmación, aunque "Sí, restablecer" se vuelva a habilitar.

Consecuencias:
- El mecanismo de T-11 no distingue entre "el admin se fue a otro campo" y "el navegador quitó el foco del botón deshabilitado". En Chromium, la condición para enfocar "Copiar" casi nunca se cumple.
- En la ronda 2, el `autoFocus` de "Copiar" sí funcionaba en Chromium. Frente a esa ronda, es una regresión de la segunda mitad de T-07 ("Lo mismo ocurre con 'Sí, restablecer', que se sustituye por la temporal").
- Mi prueba de la ronda 2 "cuando el admin sigue en la confirmación, el foco llega a 'Copiar'" no es incorrecta, pero no basta: pasa porque jsdom no implementa la corrección del foco. La complementan las dos pruebas de T-12.

Cómo lo emula la prueba: espera a que "Sí, restablecer" esté deshabilitado con el foco puesto, y reproduce lo que hace Chromium: `blur` y `focusout` sobre el botón, y el foco en `<body>`. Como el `blur()` de jsdom no hace nada sobre un control deshabilitado, la prueba quita `disabled` un instante, llama a `blur()` y lo vuelve a poner. El DOM queda igual que como lo dejó React.

Reproducción en Chrome o Edge:
1. Como admin, buscar una cuenta de maestro o de estudiante.
2. Pulsar "Restablecer contraseña" y luego "Sí, restablecer", con el ratón o con Shift+Tab y Enter, y no tocar nada más.
3. Al aparecer la temporal, `document.activeElement` es `<body>` (se ve en la consola de DevTools, o porque Tab vuelve a empezar desde el principio de la página), no "Copiar".
4. Con la API respondiendo `500`, lo mismo tras la alerta.

Requisito o regla violada: el mismo que T-07 (encargo, "Accesibilidad básica: … el foco"; plan, "con foco visible"; WCAG 2.4.3) y lo que afirma el resumen de la ronda 3 sobre T-11.

### T-13 — En desarrollo (`<StrictMode>`), la ficha le quita el foco al buscador en cuanto aparece
Severidad: baja

Prueba: `frontend/src/features/admin/cuentas-r3.ataque.test.tsx` › "con <StrictMode> (como en main.tsx), la ficha que aparece no le quita el foco al campo de búsqueda"

Esperado / Obtenido:
- Esperado: el primer render de `AccionRestablecer` no mueve el foco. Es la intención declarada de `esPrimerRenderRef`: "El primer render no debe mover el foco". El admin que buscó con Enter sigue en el campo de búsqueda.
- Obtenido: "con <StrictMode>, el primer render de la ficha movió el foco a button 'Restablecer contraseña'". La misma prueba sin `<StrictMode>` pasa.

Por qué:
- `main.tsx` monta la aplicación dentro de `<StrictMode>`. En desarrollo, React 19 simula desmontar y volver a montar cada componente nuevo, y vuelve a ejecutar sus efectos conservando los refs.
- La primera ejecución del efecto pone `esPrimerRenderRef` en `false` y sale. La segunda ya no lo considera primer render, y con `confirmando === false` enfoca "Restablecer contraseña".
- Pasa en cada búsqueda exitosa, porque la ficha se remonta por `key` y porque se desmonta mientras la búsqueda está en vuelo.
- React documenta que los efectos deben resistir ese segundo montaje. Un "saltar el primer render con un ref" no lo resiste.

Alcance real: solo en desarrollo (`npm run dev`). En el build de producción, `<StrictMode>` no vuelve a ejecutar efectos, así que no afecta a `prod` mientras nada vuelva a montar la ficha, por ejemplo un `<Activity>` de React. Lo reporto porque es el entorno donde se prueba la pantalla. Si alguien encadena Enter tras la búsqueda, abre la confirmación: el foco va a "Cancelar", así que no restablece.

Reproducción:
1. `npm run dev` en `frontend/`, con la API local, y entrar como admin a `/admin`.
2. Escribir un correo existente en "Correo exacto de la cuenta" y pulsar Enter.
3. Al aparecer la ficha, el foco salta del campo a "Restablecer contraseña".

Requisito o regla violada: la intención declarada del propio rediseño ("el primer render sin robar el foco", encargo de esta ronda) y WCAG 3.2.2 (un cambio de contexto que el usuario no pidió).

## Atacado sin hallazgos

15 de las 18 pruebas de `features/admin/cuentas-r3.ataque.test.tsx` en verde:

- **Confirmación y teclado:**
  - Cinco vueltas seguidas de abrir y cancelar: el foco alterna entre "Cancelar" y "Restablecer contraseña" y no sale ninguna petición.
  - Enter mantenido (nueve activaciones): 0 peticiones y el foco nunca pasa por `<body>`.
  - Shift+Tab desde "Cancelar" y Enter en "Sí, restablecer": 1 petición, la temporal y el foco en "Copiar" (en jsdom).
  - Tab desde "Cancelar" sale de la confirmación.
- **Primer render sin `<StrictMode>`:** la ficha que aparece, y la que se remonta al buscar otra cuenta, dejan el foco en el campo de búsqueda.
- **Respuesta tardía:**
  - La temporal de Carla que llega con Beto en pantalla no aparece ni mueve el foco del buscador.
  - Tras una búsqueda rechazada en el cliente (ficha desmontada): sin temporal y sin mover el foco.
  - Con la vista desmontada: no lanza y no escribe nada en `console.error`.
  - Con el admin escribiendo en "Correo correcto" de la misma ficha: no le quita el foco.
  - "Cancelar" con la petición en vuelo: la temporal aparece igual (el restablecimiento ya ocurrió), el foco pasa de "Restablecer contraseña" a "Copiar", y sale 1 sola petición.
- **Error del servidor, en jsdom:** tras un `500`, aparece la alerta, "Sí, restablecer" se rehabilita y el foco no queda en `<body>`. "Cancelar" lo devuelve a "Restablecer contraseña", y reabrir lo lleva a "Cancelar".
- **Sin fugas entre cuentas:**
  - Con la confirmación abierta en Carla, la ficha de Beto empieza cerrada y el foco no salta a ella.
  - El error de Carla no aparece en la ficha de Beto.
  - Tras la temporal de Carla, con el foco en "Copiar", la ficha de Beto no muestra temporal ni "Copiar", y su confirmación enfoca su propio "Cancelar".
- **Revisión estática de los dos archivos de la ronda 3:**
  - Solo declaran interfaces de Props.
  - No tienen `?? []`, `any`, `console.`, colores ni tamaños sueltos.
  - El ref no se lee en el render.
  - `role="status"` sigue en la temporal.
  - `gcTime: 0` sigue en `useRestablecerContrasena`.
- **Regresiones:** las 30 `*.ataque` anteriores (21 del backend y 9 del frontend, incluidas las 95 pruebas de la ronda 1 y las 25 de la ronda 2 de AUTH-02b) y todas las pruebas del Programador siguen en verde en las tres corridas.

## Observaciones sin severidad (no son hallazgos)

- **El mismo mecanismo de T-12 en el resto de los formularios.** "Buscar", "Enviar invitación", "Guardar correo" y los botones de envío de `/recuperar`, `/restablecer`, `/establecer-contrasena` y `/cambiar-contrasena` llevan `disabled={isPending}`. En Chromium, quien los activa con el teclado pierde el foco a `<body>` mientras la petición está en vuelo. Viene de la ronda 1 y ningún requisito lo cubre fuera del flujo de T-07. Lo dejo para que decida el Manager.
- **Error viejo:** tras un error al restablecer, "Cancelar" deja la alerta visible junto a "Restablecer contraseña", y al reabrir la confirmación el error anterior sigue ahí antes de reintentar. Viene de la ronda 1.
- **Siguen vigentes las observaciones de la ronda 2:**
  - la contraseña del login de AUTH-01 en la caché de mutaciones;
  - la temporal que no se muestra si el admin busca otra cuenta con el restablecimiento en vuelo, aunque la cuenta sí se restableció;
  - el texto genérico ante un fallo de red en la pantalla de admin;
  - `role="status"` que envuelve también el botón "Copiar".

## No atacado y por qué

- **La aplicación completa en un navegador real:** exige arrancar Vite y la API contra `campus_dev`, y el encargo no lo autoriza. En Chrome medí el comportamiento con una página suelta, sin React ni código del proyecto, y lo emulé en jsdom (T-12). El paso siguiente sería confirmarlo con la pantalla real.
- **Firefox y Safari:** no están instalados. Safari no enfoca los botones al hacer clic, así que ahí `tieneFocoRef` también quedaría en `false` al confirmar con el ratón, pero no lo verifiqué.
- **Lectores de pantalla reales (NVDA, VoiceOver), y la vista a 360 px:** mismas razones que en las rondas anteriores.
- **Una ventana que pierde el foco (Alt+Tab) con la petición en vuelo:** el navegador dispara `blur` y `tieneFocoRef` queda en `false`, así que "Copiar" no recibe el foco al volver. Es coherente con T-11 y no lo considero un defecto.

## Tabla de hashes vigente (SHA-256) de todas las `*.ataque`

| Archivo | SHA-256 | Estado |
|---|---|---|
| `backend/test/auth-login.ataque.test.ts` | `2c83d82d10bdd9b7a969768774d75b18b7a71a594bbaac5fae36a0e134d2336c` | sin cambios |
| `backend/test/auth-registro.ataque.test.ts` | `73d3a2ae708a0ef676547a8094115b1419423057378387269bc3eadb34c7724e` | sin cambios |
| `backend/test/sesiones-y-cadena.ataque.test.ts` | `6e4b4677d73bde3d7c7845c729637186249e704f2aa803fb5efa25e76126b445` | sin cambios |
| `backend/test/api-real.ataque.test.ts` | `441a766a94e7d9b26807790402e06ed94d4cc378d8f6ecf0bccc3259c7ff55fb` | sin cambios |
| `backend/test/admin-unico.ataque.test.ts` | `388ad0e585639b8c3e0e0a6657fb42c1b9cb83db721c4863c4fa19e0be42ec85` | sin cambios |
| `backend/src/config/env.ataque.test.ts` | `4fce3cedf662ba3a188f21a2277db417747d342c115efd4746d3cff58499289b` | sin cambios |
| `frontend/src/services/apiClient.ataque.test.ts` | `10c730348d18ff8dae7b3623751d31122aa58560b564ad191717fa1938a6f8ce` | sin cambios |
| `frontend/src/app/router.ataque.test.tsx` | `e58293532633dc5cfe21561e2609d170638c81886b9c31129f03864c73a34f45` | sin cambios |
| `backend/test/intentos-r2.ataque.test.ts` | `a8b79d5ad98270be3747f493865708a78bb73add08d832584db4464c3582777a` | sin cambios |
| `backend/test/guarda-r2.ataque.test.ts` | `ea078f41cc98c947d9b3966ee8eccec2bd5d06eacbaf7ee8cd85f38e6a697c15` | sin cambios |
| `backend/test/nombres-tokens-r2.ataque.test.ts` | `00a6eb6f7ccd7d8790c356befcc96ddfda6eacce0be53de255cfe3626d8f2adb` | sin cambios |
| `backend/test/logs-r2.ataque.test.ts` | `5af3909e4b7ca485e78979567872ea78bf41e6d679b9ec2c761eaa0b250df689` | sin cambios |
| `frontend/src/app/sesion-r2.ataque.test.tsx` | `06f35be8ae68f0abae775268e4e64f3df880ff137a9b54aa3c135941ddb93dcf` | sin cambios |
| `backend/test/nombres-guarda-r3.ataque.test.ts` | `97b8d6f6c6b26b9b651eb0b46a48ed27b594a8ef659937eb600fde793f07e873` | sin cambios |
| `backend/test/cuentas-r1.ataque.test.ts` | `994a38f476d55f0b8826dc4b80e07dfb013f9034c7f7aee3cdc29dd74338b793` | sin cambios |
| `backend/test/worker-r1.ataque.test.ts` | `f4ea0bd908d8ec538aa479f9b09bf6fc6f86df6f93bb7abaaccd7001de876395` | sin cambios |
| `backend/test/logs-cuentas-r1.ataque.test.ts` | `a47af988453adcbc0e7ca710e670b5e2b9906e995ae6aa71e43fa8555764014c` | sin cambios |
| `backend/test/arquitectura-cuentas-r1.ataque.test.ts` | `42bb7bf3086230c6edc65ab73976ac8a801956336561aadbee65cc3b40eb8612` | sin cambios |
| `backend/test/arranque-r1.ataque.test.ts` | `aae65c95cf34db814d650af5f7fa08d09bff3e6fc6863d4252383058499aa10e` | sin cambios |
| `backend/src/config/logger.ataque.test.ts` | `43f1754c8c33f7de285ab77dbabb0f493422e858529432c9b2be26ff9423b01b` | sin cambios |
| `backend/src/config/correo.ataque.test.ts` | `bcce2cae771f97957d8691bef7fff4ec42412daaeabf726aeb0afc59f6f25671` | sin cambios |
| `backend/test/cuentas-r2.ataque.test.ts` | `736ae5fc909b5f53b6768010047378324e808c5bbe0434c0b0d140b58d0e598b` | sin cambios |
| `backend/test/worker-r2.ataque.test.ts` | `64aa76974c7ae3e89b2f1ed3d7efc7864d4323310932a9f46f02c798c363a6d2` | sin cambios |
| `backend/test/cuentas-r3.ataque.test.ts` | `a352625e291810251f41f53c3da37de82b662a20a82a66127f4d210ba6041b34` | sin cambios |
| `frontend/src/features/auth/enlace-r1.ataque.test.tsx` | `2584bd412e2d70e22a97cefeeb6278597d2e67ddf55f749bc739411ba432590a` | sin cambios |
| `frontend/src/app/cuentas-r1.ataque.test.tsx` | `a66120ed3c04a5c02dc64b33ad008be420739fa24eb67ac42d546429e74d7a4a` | sin cambios |
| `frontend/src/features/admin/cuentas-r1.ataque.test.tsx` | `fc4b41d188dde4b48daf6fe5a52efc7862678d81931ad9e09546807e34afaf3a` | sin cambios |
| `frontend/src/features/auth/enlace-r2.ataque.test.tsx` | `5fda63b653dbc0db6b1d16c3f26506f5fae630fdfd4a9921a9ef5db98e39d438` | sin cambios |
| `frontend/src/app/cuentas-r2.ataque.test.tsx` | `b61346baf0c3789fdc15eea548623afb4bf3dc8c230f1944df4336de3a27f9eb` | sin cambios |
| `frontend/src/features/admin/cuentas-r2.ataque.test.tsx` | `5365955297066f2e0c1bc8bb9fc9aaf6f6f8d7736886ecde8829d339f7241cf1` | sin cambios |
| `frontend/src/features/admin/cuentas-r3.ataque.test.tsx` | `8defb25fc0d2d13633d58302f7538ae969306b68538acb251eac369a557c3532` | nuevo (18 pruebas) |

Conteos:
- Las `*.ataque` pasan de 30 a 31 archivos.
- El frontend pasa de 23 archivos y 226 pruebas a **24 archivos y 244 pruebas**: 241 en verde y 3 en rojo (2 de T-12 y 1 de T-13).
- El backend sigue en **65 archivos y 657 pruebas**.

## Archivos que escribió el Tester en esta ronda (solo pruebas; nada de producción)

Nuevo: `frontend/src/features/admin/cuentas-r3.ataque.test.tsx`.

Modificado: `docs/trabajo/AUTH-02-cuentas-y-correo/reporte-tester.md`. Añadí esta sección al final; las anteriores quedan íntegras.

Temporales fuera del repositorio, en el scratchpad de la sesión: la sonda HTML, los perfiles desechables de Chrome y Edge, y los registros de las corridas.

# Reporte del Tester — AUTH-02b — Ronda 4

Veredicto: **ROTO**

Verificación propia: lint `verde` (raíz, los tres workspaces, código 0) · test backend `657/657` y frontend `253` verdes + `4` en rojo (todas mías, de un hallazgo nuevo), idéntico en tres corridas completas desde la raíz.

Resumen:
- **T-12 y T-13: corregidos.** Sus 3 pruebas de `cuentas-r3.ataque.test.tsx` pasan en las tres corridas. **No apliqué la opción B**: esas pruebas no se tocaron.
- T-07, T-09 y T-10 se siguen cumpliendo.
- **T-11 vuelve a romperse en Chromium, y en cualquier navegador tras un clic en una zona no enfocable (T-14, nuevo).** Es la otra cara del arreglo de T-12. La reporto con sus pruebas en rojo y **sin `it.fails`**: el humano solo autorizó eso para T-12 y T-13.
- Hallazgos nuevos: 0 críticos · 0 altos · 0 medios · 1 bajo (T-14).
- Ronda única autorizada fuera del máximo de 3 y sin ronda 5 del programador: T-14 queda para que el orquestador lo escale al humano.

## Verificación propia

- **Precondición de red, antes de la primera corrida del backend:**
  - Regla del firewall "Campus: bloquear entrada a Docker en redes publicas": `True` / `Inbound` / `Block` / `Public`.
  - Red `IZZI-F281` / `Public`.
  - Docker `28.5.1`. Al empezar no había contenedores de Testcontainers.
- **Hashes de entrada:** los 31 de la tabla de la ronda 3 coincidían antes de tocar nada y siguen coincidiendo al terminar (`sha256sum -c`: 31/31 OK). El Programador no tocó ninguna `*.ataque`, y yo tampoco modifiqué ninguna anterior.
- **Alcance real de la ronda 4 del Programador:** con `find -newer` sobre mi archivo de la ronda 3, en `frontend/src`, `backend/src` y `shared/` solo cambió `frontend/src/features/admin/components/ficha-de-cuenta.tsx`, además de `shared/dist/`, que es salida de `build` y la regenera el lint. `contrasena-temporal.tsx` conserva su fecha de la ronda 3. Coincide con lo declarado. `git status` sobre `backend/`, `shared/` y `eslint.config.mjs` sigue vacío.
- **Tres corridas completas de `npm test` desde la raíz**, con la salida a un archivo en el scratchpad y sin tubería, ya con mi archivo en su versión final:

| Corrida | Backend | Frontend | Duración backend / frontend (Vitest) |
|---|---|---|---|
| 1 | 65 archivos · 657/657 | 25 archivos · 257 pruebas · 253 ✓ · 4 ✗ | 33,6 s / 14,2 s |
| 2 | ídem | ídem | 33,7 s / 13,8 s |
| 3 | ídem | ídem | 33,9 s / 13,8 s |

  - Las 4 en rojo son exactamente las mismas en las tres corridas (comparadas con `diff`) y todas son de `features/admin/cuentas-r4.ataque.test.tsx`. Ninguna prueba del Programador ni ninguna de las 31 `*.ataque` anteriores falla.
  - Una corrida adicional de `cuentas-r3.ataque.test.tsx` con `--reporter=verbose` muestra por nombre en verde las 3 pruebas de T-12 y T-13 (18/18).
  - En las tres corridas no aparecen `FSTDEP`, `too many clients`, `40P01`, `deadlock detected` ni `could not serialize` (0 coincidencias).
  - Al terminar, `docker ps -a --filter "label=org.testcontainers=true"` quedó vacío.
- **Lint:** `npm run lint` desde la raíz → código 0 (ESLint, `prettier --check` y `tsc -b`), con mi archivo incluido. Formateé solo mi archivo, con `npx prettier --write src/features/admin/cuentas-r4.ataque.test.tsx` desde `frontend/`. Queda con finales de línea `lf`.
- **Sin navegadores.** No abrí ningún navegador ni aplicación gráfica, ni arranqué Vite, la API o el worker. La corrección del foco de Chromium se emula en jsdom con la misma función de la ronda 3, basada en la sonda de esa ronda. Git, solo de lectura. No leí ningún `.env` ni toqué `campus_dev`. No toqué código de producción ni pruebas del Programador.

## Estado de T-12, T-13, T-07, T-09, T-10 y T-11

Revisé cada corrección en el código, no solo en las pruebas.

| Hallazgo | Estado | Lo que comprobé |
|---|---|---|
| T-12 | **Corregido** | `manejarDesenfoque` ignora un `blur` con `relatedTarget` nulo, que es el de la corrección del foco. Así `tieneFocoRef` sigue en `true` y el `onSuccess` enfoca "Copiar". El `onError` devuelve el foco a "Cancelar" solo si `tieneFocoRef` sigue en `true`, y lo hace después de la respuesta, no durante el `blur`. Sus 2 pruebas pasan. En esta ronda pasan además tres casos: un `500`, el foco a "Cancelar", Shift+Tab y Enter para reintentar, otra corrección de Chromium y la temporal, con el foco en "Copiar" y 2 peticiones; volver a "Cancelar" tras la corrección y que el foco llegue a "Copiar"; y el camino de T-12 dentro de `<StrictMode>`. |
| T-13 | **Corregido** | `confirmandoAnteriorRef` se inicializa con `useRef(confirmando)`, que siempre vale `false` al montar, y el efecto sale si el valor no cambió. En `<StrictMode>` las dos ejecuciones del montaje ven el mismo valor y no mueven el foco. Su prueba pasa. En esta ronda pasan además, con `<StrictMode>`: tres vueltas de abrir y cancelar; Enter mantenido, con 0 peticiones y sin pasar por `<body>`; buscar a Beto con la confirmación abierta en Carla sin mover el foco del buscador, y que la confirmación de Beto enfoque su propio "Cancelar"; y desmontar y volver a montar la vista entera. El ref vive por instancia: cada ficha nueva (por `key`) empieza en `false`. |
| T-07 | **Se cumple, también en la emulación de Chromium** | Sigue el `role="status"` de la temporal. Al pedir la confirmación, el foco va a "Cancelar". La segunda mitad, el foco en "Copiar" al llegar la temporal, ahora también se cumple con la corrección del foco (T-12). |
| T-09 | **Corregido** | Sigue sin `autoFocus`. Al abrir, el foco va a "Cancelar", nunca a "Sí, restablecer". Con Enter mantenido hay 0 peticiones, con y sin `<StrictMode>`. |
| T-10 | **Corregido** | "Cancelar" devuelve el foco a "Restablecer contraseña", con y sin `<StrictMode>`. Si se cancela con la petición en vuelo y luego llega un `500`, el `onError` no mueve el foco (la referencia a "Cancelar" ya es nula): se queda en "Restablecer contraseña", junto a la alerta. |
| T-11 | **Se cumple en jsdom; en Chromium vuelve a romperse (T-14)** | Las pruebas de T-11 de las rondas 2 y 3 siguen en verde porque jsdom no hace la corrección del foco, y el `blur` de "Sí, restablecer" hacia el campo trae `relatedTarget`. En Chromium, "Sí, restablecer" ya perdió el foco hacia `<body>` antes de que el admin se mueva. Ver T-14. |

## Opción B

**No la apliqué.** Las 3 pruebas de T-12 y T-13 pasan en las tres corridas, así que no las toqué: su hash sigue siendo el de la ronda 3.

## Hallazgos

### T-14 — En Chromium, la temporal (o el error) vuelve a quitarle el foco al admin que se fue a otro campo
Severidad: baja

Prueba: `frontend/src/features/admin/cuentas-r4.ataque.test.tsx`
- › "en Chromium, el admin se va a otro campo con la petición en vuelo" › "la temporal que llega mientras escribe en 'Nombre completo' no le roba el foco"
- ídem › "la temporal que llega mientras escribe en 'Correo correcto' de la misma ficha no le roba el foco"
- ídem › "un 500 que llega mientras escribe en 'Nombre completo' no le lleva el foco a 'Cancelar'"
- › "un clic en una zona no enfocable y después otro campo" › "'Cancelar' con la petición en vuelo, clic fuera y a escribir en 'Nombre completo': la temporal no le roba el foco"

Esperado / Obtenido:
- Esperado (T-11): si el admin se mueve a otro campo con la petición en vuelo y empieza a escribir, el foco se queda donde él lo puso cuando llega la respuesta, sea la temporal o un error.
- Obtenido:
  - Con la temporal: "el admin escribía en "Nombre completo" y la temporal le llevó el foco a button "Copiar"". Lo mismo con "Correo correcto".
  - Con un `500`: "el admin escribía en "Nombre completo" y el error le llevó el foco a button "Cancelar"".

Por qué:
1. `tieneFocoRef` solo se apaga con un `blur` que **sale** de uno de los contenedores de `AccionRestablecer` hacia un destino real (`relatedTarget` no nulo).
2. En Chromium, al confirmar, "Sí, restablecer" se deshabilita con el foco puesto, y el navegador lo manda a `<body>` con un `blur` sin destino. Desde la ronda 4, ese `blur` ya no apaga `tieneFocoRef`, a propósito, para arreglar T-12.
3. A partir de ahí el foco está en `<body>`, fuera del contenedor. Cuando el admin hace clic en "Nombre completo" o en "Correo correcto", no sale ningún `blur` del contenedor, porque el foco ya no estaba dentro. `tieneFocoRef` se queda en `true`.
4. Al llegar la respuesta, el `onSuccess` fija `enfocarTemporal` en `true` y "Copiar" se lleva el foco. Con un error, el `onError` enfoca "Cancelar".

Es el mismo camino de la reproducción de T-11 (confirmar con el ratón, hacer clic en otro campo y escribir), pero en el navegador real. En la ronda 3, T-11 se cumplía en Chromium a costa de T-12; en la ronda 4 se cumple T-12 a costa de T-11. En jsdom no se ve, porque ahí el botón deshabilitado conserva el foco: por eso las pruebas de T-11 de las rondas 2 y 3 siguen en verde.

La cuarta prueba muestra que no depende de Chromium: basta un `blur` sin destino, que cualquier navegador produce con un clic en una zona no enfocable (texto o fondo de la página). La secuencia es:
1. "Cancelar" con la petición en vuelo: el foco queda en "Restablecer contraseña".
2. Un clic en el texto de la página.
3. Un clic en "Nombre completo", y el admin empieza a escribir.
4. Llega la temporal y el foco salta a "Copiar".

En la ronda 3 esto no pasaba, porque todo `blur` apagaba `tieneFocoRef`.

Consecuencias: lo que el admin siga tecleando ya no llega a su campo. Espacio o Enter activan "Copiar", que copia la temporal al portapapeles, o "Cancelar", que cierra la confirmación con la alerta visible. No se restablece nada de más ni se pierde ningún dato.

Cómo lo emula la prueba: aplica `emularCorreccionDelFocoDeChromium` de la ronda 3 (o, para el clic fuera, un `blur()` sobre un botón habilitado). Después enfoca el campo, escribe en él y resuelve la petición diferida.

Reproducción en Chrome o Edge (no verificada: no abrí navegadores):
1. Como admin, buscar una cuenta de maestro o de estudiante.
2. Pulsar "Restablecer contraseña" y luego "Sí, restablecer" con el ratón.
3. Antes de que responda la API, hacer clic en "Nombre completo" de "Invitar a un maestro" y escribir.
4. Al aparecer la temporal, el foco salta a "Copiar". Con la API respondiendo `500`, salta a "Cancelar".

Requisito o regla violada: el mismo que T-11 (WCAG 3.2.2, un cambio de contexto que el usuario no pidió). Contradice además lo que afirma el resumen de la ronda 4 sobre T-11 ("`onBlurCapture` sigue apagando `tieneFocoRef` cuando el admin se mueve a un control real fuera de la confirmación"). Es una regresión de la ronda 4.

## Atacado sin hallazgos

9 de las 13 pruebas de `features/admin/cuentas-r4.ataque.test.tsx` en verde:

- **`onError`:**
  - En jsdom, el admin pasa directo de "Sí, restablecer" a "Nombre completo" (el `blur` trae destino) y un `500` no le quita el foco.
  - "Cancelar" con la petición en vuelo y después un `500`: el foco se queda en "Restablecer contraseña" y "Cancelar" ya no existe. El `?.focus()` sobre la referencia nula no hace nada.
  - En Chromium: un `500`, el foco a "Cancelar", Shift+Tab y Enter para reintentar, una segunda corrección del foco y la temporal. El foco llega a "Copiar" y salen 2 peticiones, sin duplicados.
- **`relatedTarget`:**
  - Tras la corrección, volver a "Cancelar" (Tab) reactiva `tieneFocoRef` por `onFocusCapture`, y la temporal lleva el foco a "Copiar".
  - Un cambio de foco dentro del mismo contenedor ("Sí, restablecer" → "Cancelar") apaga y vuelve a encender el ref en el orden correcto: primero `blur`, luego `focus`.
- **`confirmandoAnteriorRef` con `<StrictMode>`:** los cinco casos de la fila de T-13.
- **Preguntas del encargo:**
  - **¿`relatedTarget` es nulo en otros abandonos legítimos?**
    - *Clic en una zona no enfocable:* sí es nulo. Si el admin se queda ahí, "Copiar" toma el foco desde `<body>`: no le quita nada, y es lo que pide T-07. Si después se va a otro campo, es T-14.
    - *Cambiar de pestaña o de ventana:* el `blur` de la ventana también llega sin destino. El navegador conserva el elemento activo y lo restaura al volver, así que enfocar "Copiar" mientras tanto no roba nada. No es un defecto (en la ronda 3 ni siquiera ocurría).
    - *Iframe:* `frontend/src` no tiene ningún `iframe` (`grep -i iframe`: 0 coincidencias).
  - **¿El `onError` devuelve el foco a "Cancelar" cuando el admin ya se fue a otro campo?** En jsdom, donde el `blur` trae destino, no le quita el foco. En Chromium, o tras un clic fuera, sí: es T-14.
  - **¿`confirmandoAnteriorRef` falla al desmontar, remontar o cambiar de cuenta?** No (ver la fila de T-13).
- **Revisión estática de `ficha-de-cuenta.tsx`:**
  - Solo declara interfaces de Props.
  - No tiene `any`, `?? []`, `console.`, colores ni tamaños sueltos.
  - Los refs se leen solo en el efecto y en los manejadores (`onSuccess`, `onError`, `manejarDesenfoque`), nunca en el render.
  - `type FocusEvent` se importa de `react`.
  - La comparación `destino === document.body` no se cumple en la práctica, porque un `blur` no trae `<body>` como destino, pero es inofensiva.
- **Regresiones:** las 31 `*.ataque` anteriores (21 del backend y 10 del frontend) y todas las pruebas del Programador siguen en verde en las tres corridas.

## Observaciones sin severidad (no son hallazgos)

- Siguen vigentes las de la ronda 3, con sus destinos ya fijados en `aprobacion.md`:
  - el mismo mecanismo de T-12 en el resto de los botones con `disabled={isPending}` (sistema de diseño);
  - la alerta vieja al reabrir la confirmación;
  - la contraseña del login en la caché de mutaciones;
  - la temporal perdida al buscar otra cuenta con el restablecimiento en vuelo;
  - el texto genérico ante un fallo de red;
  - `role="status"`, que envuelve también a "Copiar".

## No atacado y por qué

- **La aplicación en un navegador real, con teclado y ratón (T-12, T-14 y 360 px):** la regla nueva prohíbe que un agente abra navegadores, y el humano hará ese recorrido al final. T-12 y T-14 se verificaron solo con la emulación en jsdom de la corrección del foco que midió la sonda de Chrome de la ronda 3. **T-14 queda sin verificar en un navegador real.**
- **Firefox y Safari:** mismas razones que en la ronda 3. Safari no enfoca los botones con un clic, así que ahí el `blur` de "Cancelar" al hacer clic en "Sí, restablecer" también llegaría sin destino y dejaría `tieneFocoRef` en `true`. Es el mismo mecanismo de T-14; no lo verifiqué.
- **Lectores de pantalla reales:** mismas razones que en las rondas anteriores.
- **`contrasena-temporal.tsx`:** no cambió en esta ronda (conserva su fecha de la ronda 3), así que no lo ataqué más allá de las regresiones.

## Tabla de hashes vigente (SHA-256) de todas las `*.ataque`

| Archivo | SHA-256 | Estado |
|---|---|---|
| `backend/test/auth-login.ataque.test.ts` | `2c83d82d10bdd9b7a969768774d75b18b7a71a594bbaac5fae36a0e134d2336c` | sin cambios |
| `backend/test/auth-registro.ataque.test.ts` | `73d3a2ae708a0ef676547a8094115b1419423057378387269bc3eadb34c7724e` | sin cambios |
| `backend/test/sesiones-y-cadena.ataque.test.ts` | `6e4b4677d73bde3d7c7845c729637186249e704f2aa803fb5efa25e76126b445` | sin cambios |
| `backend/test/api-real.ataque.test.ts` | `441a766a94e7d9b26807790402e06ed94d4cc378d8f6ecf0bccc3259c7ff55fb` | sin cambios |
| `backend/test/admin-unico.ataque.test.ts` | `388ad0e585639b8c3e0e0a6657fb42c1b9cb83db721c4863c4fa19e0be42ec85` | sin cambios |
| `backend/src/config/env.ataque.test.ts` | `4fce3cedf662ba3a188f21a2277db417747d342c115efd4746d3cff58499289b` | sin cambios |
| `frontend/src/services/apiClient.ataque.test.ts` | `10c730348d18ff8dae7b3623751d31122aa58560b564ad191717fa1938a6f8ce` | sin cambios |
| `frontend/src/app/router.ataque.test.tsx` | `e58293532633dc5cfe21561e2609d170638c81886b9c31129f03864c73a34f45` | sin cambios |
| `backend/test/intentos-r2.ataque.test.ts` | `a8b79d5ad98270be3747f493865708a78bb73add08d832584db4464c3582777a` | sin cambios |
| `backend/test/guarda-r2.ataque.test.ts` | `ea078f41cc98c947d9b3966ee8eccec2bd5d06eacbaf7ee8cd85f38e6a697c15` | sin cambios |
| `backend/test/nombres-tokens-r2.ataque.test.ts` | `00a6eb6f7ccd7d8790c356befcc96ddfda6eacce0be53de255cfe3626d8f2adb` | sin cambios |
| `backend/test/logs-r2.ataque.test.ts` | `5af3909e4b7ca485e78979567872ea78bf41e6d679b9ec2c761eaa0b250df689` | sin cambios |
| `frontend/src/app/sesion-r2.ataque.test.tsx` | `06f35be8ae68f0abae775268e4e64f3df880ff137a9b54aa3c135941ddb93dcf` | sin cambios |
| `backend/test/nombres-guarda-r3.ataque.test.ts` | `97b8d6f6c6b26b9b651eb0b46a48ed27b594a8ef659937eb600fde793f07e873` | sin cambios |
| `backend/test/cuentas-r1.ataque.test.ts` | `994a38f476d55f0b8826dc4b80e07dfb013f9034c7f7aee3cdc29dd74338b793` | sin cambios |
| `backend/test/worker-r1.ataque.test.ts` | `f4ea0bd908d8ec538aa479f9b09bf6fc6f86df6f93bb7abaaccd7001de876395` | sin cambios |
| `backend/test/logs-cuentas-r1.ataque.test.ts` | `a47af988453adcbc0e7ca710e670b5e2b9906e995ae6aa71e43fa8555764014c` | sin cambios |
| `backend/test/arquitectura-cuentas-r1.ataque.test.ts` | `42bb7bf3086230c6edc65ab73976ac8a801956336561aadbee65cc3b40eb8612` | sin cambios |
| `backend/test/arranque-r1.ataque.test.ts` | `aae65c95cf34db814d650af5f7fa08d09bff3e6fc6863d4252383058499aa10e` | sin cambios |
| `backend/src/config/logger.ataque.test.ts` | `43f1754c8c33f7de285ab77dbabb0f493422e858529432c9b2be26ff9423b01b` | sin cambios |
| `backend/src/config/correo.ataque.test.ts` | `bcce2cae771f97957d8691bef7fff4ec42412daaeabf726aeb0afc59f6f25671` | sin cambios |
| `backend/test/cuentas-r2.ataque.test.ts` | `736ae5fc909b5f53b6768010047378324e808c5bbe0434c0b0d140b58d0e598b` | sin cambios |
| `backend/test/worker-r2.ataque.test.ts` | `64aa76974c7ae3e89b2f1ed3d7efc7864d4323310932a9f46f02c798c363a6d2` | sin cambios |
| `backend/test/cuentas-r3.ataque.test.ts` | `a352625e291810251f41f53c3da37de82b662a20a82a66127f4d210ba6041b34` | sin cambios |
| `frontend/src/features/auth/enlace-r1.ataque.test.tsx` | `2584bd412e2d70e22a97cefeeb6278597d2e67ddf55f749bc739411ba432590a` | sin cambios |
| `frontend/src/app/cuentas-r1.ataque.test.tsx` | `a66120ed3c04a5c02dc64b33ad008be420739fa24eb67ac42d546429e74d7a4a` | sin cambios |
| `frontend/src/features/admin/cuentas-r1.ataque.test.tsx` | `fc4b41d188dde4b48daf6fe5a52efc7862678d81931ad9e09546807e34afaf3a` | sin cambios |
| `frontend/src/features/auth/enlace-r2.ataque.test.tsx` | `5fda63b653dbc0db6b1d16c3f26506f5fae630fdfd4a9921a9ef5db98e39d438` | sin cambios |
| `frontend/src/app/cuentas-r2.ataque.test.tsx` | `b61346baf0c3789fdc15eea548623afb4bf3dc8c230f1944df4336de3a27f9eb` | sin cambios |
| `frontend/src/features/admin/cuentas-r2.ataque.test.tsx` | `5365955297066f2e0c1bc8bb9fc9aaf6f6f8d7736886ecde8829d339f7241cf1` | sin cambios |
| `frontend/src/features/admin/cuentas-r3.ataque.test.tsx` | `8defb25fc0d2d13633d58302f7538ae969306b68538acb251eac369a557c3532` | sin cambios |
| `frontend/src/features/admin/cuentas-r4.ataque.test.tsx` | `0de25798c050bdc7b71ae525d0bd98d287c33d8c87822097b625a38aafdc57db` | nuevo (13 pruebas) |

Conteos:
- Las `*.ataque` pasan de 31 a 32 archivos.
- El frontend pasa de 24 archivos y 244 pruebas a **25 archivos y 257 pruebas**: 253 en verde y 4 en rojo (las 4 de T-14).
- El backend sigue en **65 archivos y 657 pruebas**.
- Ninguna prueba lleva `it.fails`.

## Archivos que escribió el Tester en esta ronda (solo pruebas; nada de producción)

Nuevo: `frontend/src/features/admin/cuentas-r4.ataque.test.tsx`.

Modificado: `docs/trabajo/AUTH-02-cuentas-y-correo/reporte-tester.md`. Añadí esta sección al final; las anteriores quedan íntegras.

Temporales fuera del repositorio, en el scratchpad de la sesión: los registros de las tres corridas y del lint, y la lista de hashes.

## Aplicación de la opción B a T-14 (decisión del humano)

El humano aceptó T-14 como riesgo y extendió la opción B a sus pruebas. Está registrado en `aprobacion.md`, "Resultado de la ronda 4 y decisión del humano sobre T-14". T-14 pasa como riesgo al encargo del sistema de diseño, junto al foco de los botones que se deshabilitan con su petición en vuelo, que es la misma causa de fondo.

**Pruebas marcadas como `it.fails`:** solo las 4 de T-14, en `frontend/src/features/admin/cuentas-r4.ataque.test.tsx`. Cada una lleva encima el comentario "Riesgo aceptado por el humano el 2026-09-26 (T-14): pasa al encargo del sistema de diseño".
- "en Chromium, el admin se va a otro campo con la petición en vuelo" › "la temporal que llega mientras escribe en 'Nombre completo' no le roba el foco"
- ídem › "la temporal que llega mientras escribe en 'Correo correcto' de la misma ficha no le roba el foco"
- ídem › "un 500 que llega mientras escribe en 'Nombre completo' no le lleva el foco a 'Cancelar'"
- "un clic en una zona no enfocable y después otro campo" › "'Cancelar' con la petición en vuelo, clic fuera y a escribir en 'Nombre completo': la temporal no le roba el foco"

Qué cambió y qué no:
- Ninguna aserción cambió. Lo único nuevo es `it(` → `it.fails(` y el comentario.
- Al formatear con `npx prettier --write src/features/admin/cuentas-r4.ataque.test.tsx` desde `frontend/`, Prettier partió en varias líneas la cabecera de esas 4 llamadas y aumentó un nivel la sangría de su cuerpo. El contenido es el mismo.
- Las otras 9 pruebas del archivo, las 31 `*.ataque` restantes y las 3 pruebas de T-12 y T-13 quedan intactas.

**Advertencia sobre `it.fails`:** una prueba así pasa si falla **cualquier** aserción, también una de precondición, como las de `emularCorreccionDelFocoDeChromium` o `escribirEn`.
- Antes de marcarlas, en las tres corridas de esta ronda, las 4 fallaban en la aserción final del foco, con los mensajes citados en T-14.
- Si alguien corrige T-14, las 4 pasarán a rojo: esa es la señal para quitar el `it.fails`.
- Si en cambio se rompiera una precondición, seguirían en verde sin avisar.

**Verificación:**
- **Precondición de red, antes de correr nada:**
  - Regla del firewall: `True` / `Inbound` / `Block` / `Public`.
  - Red `IZZI-F281` / `Public`.
  - Sin contenedores de Testcontainers al empezar.
- **Lint:** `npm run lint` desde la raíz → código 0.
- **Tres corridas completas de `npm test` desde la raíz**, con la salida a un archivo en el scratchpad y sin tubería:

| Corrida | Código | Backend | Frontend | Duración backend / frontend (Vitest) |
|---|---|---|---|---|
| 1 | 0 | 65 archivos · 657/657 | 25 archivos · 257 pruebas · 253 ✓ · 4 fallos esperados | 33,2 s / 14,3 s |
| 2 | 0 | ídem | ídem | 33,8 s / 13,9 s |
| 3 | 0 | ídem | ídem | 33,3 s / 14,4 s |

  - Vitest cuenta las 4 `it.fails` como "expected fail", dentro de los archivos que pasan.
  - En las tres corridas no aparecen `FSTDEP`, `too many clients`, `40P01`, `deadlock detected` ni `could not serialize` (0 coincidencias).
  - Al terminar, `docker ps -a --filter "label=org.testcontainers=true"` quedó vacío.
- **Hashes:** `sha256sum -c` sobre los 32 archivos de la tabla de abajo → 32/32 OK. `find` encuentra exactamente 32 `*.ataque`. El archivo queda con finales de línea `lf`.
- **Límites:** no abrí navegadores ni toqué código de producción u otras pruebas. Git, solo de lectura. No leí ningún `.env`. `git status` sobre `backend/` y `shared/` sigue vacío.

**Veredicto tras la opción B:** ninguna prueba queda en rojo. T-12 y T-13 están corregidos. T-14 se acepta como riesgo residual, con destino al encargo del sistema de diseño.

### Tabla de hashes vigente (SHA-256) de todas las `*.ataque`

Sustituye a la tabla anterior de esta ronda.

| Archivo | SHA-256 | Estado |
|---|---|---|
| `backend/test/auth-login.ataque.test.ts` | `2c83d82d10bdd9b7a969768774d75b18b7a71a594bbaac5fae36a0e134d2336c` | sin cambios |
| `backend/test/auth-registro.ataque.test.ts` | `73d3a2ae708a0ef676547a8094115b1419423057378387269bc3eadb34c7724e` | sin cambios |
| `backend/test/sesiones-y-cadena.ataque.test.ts` | `6e4b4677d73bde3d7c7845c729637186249e704f2aa803fb5efa25e76126b445` | sin cambios |
| `backend/test/api-real.ataque.test.ts` | `441a766a94e7d9b26807790402e06ed94d4cc378d8f6ecf0bccc3259c7ff55fb` | sin cambios |
| `backend/test/admin-unico.ataque.test.ts` | `388ad0e585639b8c3e0e0a6657fb42c1b9cb83db721c4863c4fa19e0be42ec85` | sin cambios |
| `backend/src/config/env.ataque.test.ts` | `4fce3cedf662ba3a188f21a2277db417747d342c115efd4746d3cff58499289b` | sin cambios |
| `frontend/src/services/apiClient.ataque.test.ts` | `10c730348d18ff8dae7b3623751d31122aa58560b564ad191717fa1938a6f8ce` | sin cambios |
| `frontend/src/app/router.ataque.test.tsx` | `e58293532633dc5cfe21561e2609d170638c81886b9c31129f03864c73a34f45` | sin cambios |
| `backend/test/intentos-r2.ataque.test.ts` | `a8b79d5ad98270be3747f493865708a78bb73add08d832584db4464c3582777a` | sin cambios |
| `backend/test/guarda-r2.ataque.test.ts` | `ea078f41cc98c947d9b3966ee8eccec2bd5d06eacbaf7ee8cd85f38e6a697c15` | sin cambios |
| `backend/test/nombres-tokens-r2.ataque.test.ts` | `00a6eb6f7ccd7d8790c356befcc96ddfda6eacce0be53de255cfe3626d8f2adb` | sin cambios |
| `backend/test/logs-r2.ataque.test.ts` | `5af3909e4b7ca485e78979567872ea78bf41e6d679b9ec2c761eaa0b250df689` | sin cambios |
| `frontend/src/app/sesion-r2.ataque.test.tsx` | `06f35be8ae68f0abae775268e4e64f3df880ff137a9b54aa3c135941ddb93dcf` | sin cambios |
| `backend/test/nombres-guarda-r3.ataque.test.ts` | `97b8d6f6c6b26b9b651eb0b46a48ed27b594a8ef659937eb600fde793f07e873` | sin cambios |
| `backend/test/cuentas-r1.ataque.test.ts` | `994a38f476d55f0b8826dc4b80e07dfb013f9034c7f7aee3cdc29dd74338b793` | sin cambios |
| `backend/test/worker-r1.ataque.test.ts` | `f4ea0bd908d8ec538aa479f9b09bf6fc6f86df6f93bb7abaaccd7001de876395` | sin cambios |
| `backend/test/logs-cuentas-r1.ataque.test.ts` | `a47af988453adcbc0e7ca710e670b5e2b9906e995ae6aa71e43fa8555764014c` | sin cambios |
| `backend/test/arquitectura-cuentas-r1.ataque.test.ts` | `42bb7bf3086230c6edc65ab73976ac8a801956336561aadbee65cc3b40eb8612` | sin cambios |
| `backend/test/arranque-r1.ataque.test.ts` | `aae65c95cf34db814d650af5f7fa08d09bff3e6fc6863d4252383058499aa10e` | sin cambios |
| `backend/src/config/logger.ataque.test.ts` | `43f1754c8c33f7de285ab77dbabb0f493422e858529432c9b2be26ff9423b01b` | sin cambios |
| `backend/src/config/correo.ataque.test.ts` | `bcce2cae771f97957d8691bef7fff4ec42412daaeabf726aeb0afc59f6f25671` | sin cambios |
| `backend/test/cuentas-r2.ataque.test.ts` | `736ae5fc909b5f53b6768010047378324e808c5bbe0434c0b0d140b58d0e598b` | sin cambios |
| `backend/test/worker-r2.ataque.test.ts` | `64aa76974c7ae3e89b2f1ed3d7efc7864d4323310932a9f46f02c798c363a6d2` | sin cambios |
| `backend/test/cuentas-r3.ataque.test.ts` | `a352625e291810251f41f53c3da37de82b662a20a82a66127f4d210ba6041b34` | sin cambios |
| `frontend/src/features/auth/enlace-r1.ataque.test.tsx` | `2584bd412e2d70e22a97cefeeb6278597d2e67ddf55f749bc739411ba432590a` | sin cambios |
| `frontend/src/app/cuentas-r1.ataque.test.tsx` | `a66120ed3c04a5c02dc64b33ad008be420739fa24eb67ac42d546429e74d7a4a` | sin cambios |
| `frontend/src/features/admin/cuentas-r1.ataque.test.tsx` | `fc4b41d188dde4b48daf6fe5a52efc7862678d81931ad9e09546807e34afaf3a` | sin cambios |
| `frontend/src/features/auth/enlace-r2.ataque.test.tsx` | `5fda63b653dbc0db6b1d16c3f26506f5fae630fdfd4a9921a9ef5db98e39d438` | sin cambios |
| `frontend/src/app/cuentas-r2.ataque.test.tsx` | `b61346baf0c3789fdc15eea548623afb4bf3dc8c230f1944df4336de3a27f9eb` | sin cambios |
| `frontend/src/features/admin/cuentas-r2.ataque.test.tsx` | `5365955297066f2e0c1bc8bb9fc9aaf6f6f8d7736886ecde8829d339f7241cf1` | sin cambios |
| `frontend/src/features/admin/cuentas-r3.ataque.test.tsx` | `8defb25fc0d2d13633d58302f7538ae969306b68538acb251eac369a557c3532` | sin cambios |
| `frontend/src/features/admin/cuentas-r4.ataque.test.tsx` | `97b5c0796860736d9fb8d32b96de1feb97ecc074af74fa70d8b4a51ec001ee1a` | modificado: 4 pruebas de T-14 como `it.fails` |

Conteos:
- Hay 32 `*.ataque`.
- El frontend tiene 25 archivos y 257 pruebas: 253 en verde y 4 fallos esperados (`it.fails`, las 4 de T-14).
- El backend sigue en 65 archivos y 657 pruebas.
