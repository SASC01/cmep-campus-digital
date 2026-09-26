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
