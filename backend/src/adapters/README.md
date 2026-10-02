# adapters/

Único lugar del backend que importa `@prisma/client`, `@prisma/adapter-pg`, `pg`, el cliente
generado por Prisma (`db/generated/`, no versionado; lo crea `prisma generate`), `pg-boss`, `minio`,
`resend`, `argon2`, `jose` y `livekit-server-sdk` (AGENTS.md, regla 1; ESLint lo vigila con
`no-restricted-imports`).

Módulos: `db`, `auth`, `storage`, `notifier`, `queue`, `scheduler`, `live`. Cada uno traduce los
errores de su proveedor a `AppError`; nadie fuera de `adapters/db` conoce los códigos de Prisma.

## `queue` (AUTH-02)

Único importador de `pg-boss`. `iniciarCola`/`detenerCola` son idempotentes, como `inicializarDb`.
El encolado transaccional (`encolar(nombre, datos, { id, sql })`) pasa `sql` (un `EjecutorSql` de
`adapters/db/cliente.ts`, construido con `ejecutorSqlDe(tx)`) como opción `db` de `send`: equivale al
adaptador `fromPrisma` que pg-boss publica (`pg-boss/dist/adapters/prisma.js`). `adapters/queue` no
importa `adapters/db`; solo comparten el tipo `EjecutorSql`.

**`createQueue` es idempotente pero no actualiza la política de una cola que ya existe.** Cambiar
los reintentos, la retención o el `deadLetter` de una cola ya creada en una base exige `updateQueue`,
en un encargo que lo planee explícitamente.

## `notifier` (AUTH-02, regla 12)

Puerto en `core/correo/notifier.ts`. Dos canales: `resend` (único importador de la librería
`resend`, solo con `NODE_ENV=production` y llave presente) y `registro` (HTML en
`backend/tmp/correos/`, para desarrollo y pruebas). Nadie más llama a Resend ni escribe en
`notificaciones`. La librería `resend` lee `RESEND_BASE_URL` del entorno y, si la llave llega vacía,
`process.env.RESEND_API_KEY`; por eso `resend.ts` exige una llave no vacía **antes** de construir el
cliente, y `RESEND_BASE_URL` no se define en ningún entorno del proyecto.

## `db/cliente.ts`: `ejecutorSqlDe` (AUTH-02)

Es el único `$queryRawUnsafe` de `backend/src` (V-13 lo comprueba con una búsqueda de texto).
Ejecuta el SQL que pg-boss entrega a `send`/`createQueue` dentro de la transacción de Prisma en
curso, sin transformar ni el texto ni los valores. `executeSql` solo se invoca dentro de
`adapters/`; `handlers/` y `workers/` reciben la capacidad envuelta en `alGuardar(sql)` y solo la
pasan a `encolar`, nunca la invocan (ESLint, `no-restricted-syntax`).

## Protocolo de bloqueo por usuario (AUTH-02, Enmienda 2)

Cierra T-07, T-08 y T-09 de la ronda 2 del Tester: un deadlock entre `restablecer`/
`establecer-contrasena` y `refrescar`, una revocación en bloque que no veía una sesión rotada
concurrentemente, y un login que creaba una sesión con una contraseña que ya había cambiado.

- **Alcance.** Toda transacción que, sobre un usuario que **ya existe**: (a) inserte una sesión;
  (b) rote una sesión; (c) revoque sesiones en bloque (todas, o todas salvo una); (d) cambie
  `hash_contrasena` o `debe_cambiar_contrasena`; (e) escriba en `tokens_cuenta`.
- **Primero el usuario.** La primera sentencia bloquea la fila de `usuarios` de ese usuario, antes
  de leer para decidir y antes de escribir en `sesiones` o `tokens_cuenta`, con una de estas dos
  funciones de `adapters/db/bloqueo-usuario.ts` (no se reexportan en `index.ts`):
  - `bloquearUsuarioParaSesion(tx, usuarioId)` → `FOR SHARE`. Solo para crear o rotar una sesión
    propia.
  - `bloquearUsuarioParaEscribir(tx, usuarioId)` → `FOR NO KEY UPDATE`. Para revocar en bloque,
    cambiar la contraseña o escribir `tokens_cuenta`.
  - **Única excepción: `corregirCorreo`.** Su primera sentencia, `UPDATE usuarios SET email`, ya
    toma `FOR UPDATE`, porque `email` tiene un índice único. Cumple la regla con un modo más fuerte
    y no llama a ninguna de las dos funciones, porque eso sería una subida de modo.
- **Sin subidas de modo.** Después, la transacción no pide sobre esa fila un modo más fuerte que
  el primero. El `FOR KEY SHARE` que toma la FK al insertar una sesión o un token es más débil que
  los dos bloqueos y no espera; lo cubre el bloqueo propio.
- **Decidir después del bloqueo.** Toda lectura que decide (hash vigente, cuenta activa, token
  vivo, sesión viva) y toda revocación en bloque van en sentencias **posteriores** al bloqueo,
  dentro de la misma transacción.
- **READ COMMITTED**, el aislamiento predeterminado de PostgreSQL y de Prisma, no se cambia en
  estas transacciones: el protocolo depende de que cada sentencia tome su instantánea al empezar.
- **Nada lento dentro:** argon2 y cualquier I/O van antes de abrir la transacción.
- **Quedan fuera del protocolo:** las sentencias que revocan una sola sesión por id o por hash
  (`revocarSesion`, `revocarSesionPorHash`); las transacciones que crean al usuario en ellas mismas
  (`crearUsuarioConSesion`, `crearMaestroInvitado`, `registrarMaestroConEnlace`,
  `invitarMaestrosEnLote`); las lecturas sin bloqueo (`buscar*`, `contar*`).
- **Encargos futuros:** todo encargo que revoque sesiones o cambie credenciales (baja, restricción
  que cierre sesiones, cambio voluntario) cumple estas reglas.
- **AUTH-03b, enlace de registro frente a la revocación (fuera del protocolo por usuario, porque no
  hay ningún usuario existente que bloquear; Enmienda 6, arbitraje T-07):** tanto
  `registrarMaestroConEnlace` como `revocarEnlaceRegistro` toman `FOR NO KEY UPDATE` explícito
  (`$queryRaw` etiquetado) sobre la fila de `enlaces_registro`, antes de crear al usuario o de
  escribir `revocado_en` respectivamente. `revocarEnlaceRegistro` fija `revocado_en` con
  `new Date()` **después** de obtener el bloqueo, nunca antes: así ninguna cuenta puede quedar con
  `creado_en` posterior al `revocado_en` que se fije ahí.
  - **Por qué el mismo modo en los dos (no `FOR SHARE` para el registro):** `FOR NO KEY UPDATE`
    choca consigo mismo. Un registro nuevo que encuentra la fila tomada tiene que dormir, y para
    dormir se forma en la cola de esa tupla, **detrás** de cualquier revocación que ya esperaba: la
    cola es justa entre peticiones del mismo modo. Con `FOR SHARE` (la forma anterior a esta
    enmienda) una petición nueva se concedía de inmediato porque era compatible con el titular
    actual, sin formarse detrás de un `FOR NO KEY UPDATE` en espera; con registros que se
    encadenaban, la revocación podía no obtener nunca el bloqueo. Con el mismo modo en los dos, esa
    ventana se cierra: la revocación entra en la cola en su turno y los registros posteriores a ella
    esperan detrás.
  - **Costo aceptado:** los registros del mismo enlace quedan en serie (uno a la vez, no en
    paralelo). Es aceptable porque argon2 y la generación del token van fuera de la transacción, que
    solo hace dos `INSERT` (usuario y sesión); veinte registros simultáneos esperan en conjunto muy
    por debajo del límite de 5 s de la transacción interactiva, sin riesgo de `P2028`.
  - **Sin subida de modo ni deadlock:** el `FOR KEY SHARE` que toma la FK de
    `usuarios.enlace_registro_id` al insertar es más débil que `FOR NO KEY UPDATE` y no choca con
    él. No hay deadlock: el registro toma solo la fila del enlace y después inserta; la revocación
    solo toma esa misma fila.
  - **La invariante de §D-B5 se mantiene y se refuerza:** un registro que ya tenía la fila confirma
    antes de que la revocación obtenga el bloqueo; uno que llega después vuelve a evaluar
    `revocado_en IS NULL` sobre la versión ya confirmada, no obtiene la fila y responde 400; ningún
    registro confirma después de que la revocación respondió; y ningún `creado_en` es posterior al
    `revocado_en`.

- **AUTH-03c, bloqueo consultivo de la invitación masiva (fuera del protocolo por usuario, porque
  no bloquea ninguna fila de `usuarios`; §D-C3, M-04):** `invitarMaestrosEnLote` toma
  `pg_advisory_xact_lock(CLAVE_BLOQUEO_INVITACIONES_EN_LOTE)` (`$executeRaw` etiquetado; la función
  devuelve `void`, así que `$queryRaw` fallaría al intentar leer una columna) como primera sentencia
  de su transacción. Es una constante `bigint` de uso único en el proyecto. Dos lotes simultáneos
  quedan en serie: el segundo espera hasta que el primero confirme o revierta, así el conteo del
  cupo diario que lee después nunca se calcula sobre datos que el otro lote todavía no confirmó.
  El bloqueo se libera solo al terminar la transacción (`pg_advisory_xact_lock`, no `_lock` a secas),
  así que una excepción (por ejemplo, el cupo insuficiente) lo libera igual al revertir.
  `encolarVarios` (`adapters/queue/index.ts`) hace, dentro de esa misma transacción, un solo
  `insert` de pg-boss con los trabajos como un único parámetro JSON: heredan `retry_limit`,
  `retry_backoff`, `dead_letter` y la retención de la política de la cola (`COALESCE` en
  `pg-boss/dist/plans.js`, función `insertJobs`), igual que si cada uno se hubiera encolado por
  separado con `encolar`.

**Modos de bloqueo de fila de PostgreSQL usados aquí:**

| Modo                | Choca con                                      | Uso                                                                | Por qué                                                                                                                                                                                     |
| ------------------- | ---------------------------------------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `FOR KEY SHARE`     | `FOR UPDATE`                                   | Ninguno explícito; lo toma la FK al insertar una sesión o un token | No choca con `FOR NO KEY UPDATE`, así que no espera al escritor                                                                                                                             |
| `FOR SHARE`         | `FOR NO KEY UPDATE`, `FOR UPDATE`              | Crear o rotar una sesión                                           | Modo mínimo que queda en serie con cualquier escritura de credenciales; compatible consigo mismo y con `FOR KEY SHARE`, así que logins y refrescos del mismo usuario no se esperan entre sí |
| `FOR NO KEY UPDATE` | `FOR SHARE`, `FOR NO KEY UPDATE`, `FOR UPDATE` | Revocar en bloque, cambiar contraseña, escribir `tokens_cuenta`    | Modo mínimo que queda en serie con las sesiones (T-08) y con los demás escritores; no choca con el `FOR KEY SHARE` de otras tablas con FK al usuario                                        |
| `FOR UPDATE`        | Todos                                          | Solo `corregirCorreo`, porque lo impone PostgreSQL                 | Se descarta como modo general: choca con `FOR KEY SHARE`, el origen de T-07 frente a cualquier transacción que inserte una fila hija después de bloquear otra                               |

**Por qué no hay deadlock en ninguna combinación (cierra T-07):** toda transacción del protocolo
pide la fila del usuario antes que cualquier otra fila de ese usuario y la retiene hasta el final;
mientras espera, no retiene nada más de ese usuario. Dos transacciones del protocolo solo coexisten
con la fila del usuario si las dos usan `FOR SHARE` (crear o rotar sesión), y esas dos nunca esperan
teniendo algo que la otra necesite. Las sentencias fuera del protocolo retienen como máximo una fila
y nunca esperan teniendo otra. Sin espera circular no puede haber deadlock.

**Por qué se cierra T-08:** las creaciones y rotaciones retienen `FOR SHARE` desde antes de tocar la
sesión hasta su `COMMIT`; las revocaciones en bloque retienen `FOR NO KEY UPDATE` desde antes de su
`UPDATE sesiones`. Los dos modos chocan, así que quedan en serie: si la rotación va primero, la
revocación ve la sesión nueva con una instantánea posterior a su `COMMIT`; si la revocación va
primero, la rotación ve la sesión vieja ya revocada (`count = 0`, no inserta la nueva) y el handler
responde `401`.

**Por qué se cierra T-09:** `crearSesion` lee `hash_contrasena` y `activo` con `SELECT … FOR SHARE`
dentro de su transacción y compara el hash con el que el handler ya verificó con argon2; si un
escritor cambió la contraseña antes, el hash difiere y la sesión no nace.

## `db/clases.ts` (CLASES-a, §D-0.1 y §D-A2)

`buscarDatosDePertenencia` es la única consulta del sexto paso de la cadena
(`middleware/pertenencia.ts`): `clases` por PK con `inscripciones` filtradas por el `usuarioId` de
la petición, en una sola llamada. `crearClase` y `regenerarCodigo` reciben un generador de código
(`() => string`, `node:crypto.randomBytes` + `codigoDesdeBytes` en el handler) y reintentan **una
sola vez** si el primero choca con el índice único de `codigo_invitacion`, detectado con
`traducirErrorPrisma` y su `alDuplicar` (§D-A2), sin tocar `adapters/db/errores.ts`: `alDuplicar`
siempre traduce a `CODIGO_NO_DISPONIBLE` (aparte de la llave primaria, un choque de
`gen_random_uuid()` inviable en la práctica, el único índice único de `clases` es
`codigo_invitacion`, así que no hay otro P2002 posible en esta tabla); si el traducido no es ese código, se relanza sin
reintentar (por ejemplo, el `22021` que `traducirErrorPrisma` ya traduce a `400 VALIDACION`). Si el
segundo intento también choca, `500 CODIGO_NO_DISPONIBLE`. `editarClase` y
`regenerarCodigo` filtran por `id` **y** `maestro_id` (defensa extra, M-01): si no actualizan
ninguna fila, devuelven `null` y el handler responde `403 SIN_ACCESO_A_LA_CLASE`, aunque
`requireOwnership` ya lo hubiera negado antes. `inscribir` (unirse con código) es un `createMany`
con `skipDuplicates`, idempotente, y **no** escribe en `movimientos_inscripcion` (esa tabla llega en
CLASES-b y solo registra altas manuales y bajas, S-23). `listarClasesImpartidas` y
`listarClasesInscritas` usan `paginar` (`core/paginacion.ts`, §D-A4) para el corte de página y el
cursor siguiente, en vez de repetir esa lógica a mano.

## `db/inscripciones.ts` (CLASES-b, §D-B1 a §D-B3 bis y §D-B8)

`listarPersonas` y `listarAlumnosDeClase` paginan por conjunto de claves (`nombre_busqueda`,
`usuario_id`) con un `where`, sin el `cursor` de Prisma. Con cursor, una lectura de `usuarios` por PK
trae el `nombre_busqueda` del cursor y solo se rechaza (`400 VALIDACION`) si ese usuario no existe: un
alumno quitado de la clase o desactivado sigue sirviendo, porque su clave de orden sobrevive.
`listarAlumnosDeClase` es la **única** función que selecciona el correo completo, el estado de pago y
la restricción de acceso de un alumno (RN-02); `listarPersonas` solo trae id y nombre.
`buscarCandidatos` escapa los comodines de `LIKE` (Prisma no los escapa en `contains`) y selecciona
el correo solo para que el handler lo enmascare con `enmascararCorreo` antes de responder.

`agregarAlumnoManual` y `quitarAlumno` corren en **una transacción** y escriben en
`movimientos_inscripcion` (P-05 g, S-23) solo cuando la inscripción cambia de verdad (un alta con
`yaEstaba` o una baja de alguien no inscrito no escriben nada). El `INSERT` del movimiento es siempre
el **último** paso de la transacción: su `secuencia` (`BIGSERIAL`) se toma después de cualquier espera
por otra transacción, y por eso el orden del registro es `secuencia`, nunca `creado_en` (la hora de
inicio de la transacción). **Ninguna función exportada lee `movimientos_inscripcion`** (el modelo
solo aparece en `.create(`); su pantalla de consulta es de ADMIN.

## `db/publicaciones.ts` y las colas de avisos (CLASES-c, §D-C2 y §D-C3)

`crearPublicacion` y `crearComentario` abren una transacción, insertan y llaman a
`alGuardar(ejecutorSqlDe(tx))`: el handler pasa `(sql) => encolar(cola, datos, { id, sql })`, así
que el aviso nace con el dato o no nace (si `encolar` lanza, todo se revierte). El `id` lo genera el
handler con `randomUUID()` **antes** de llamar al adaptador y es también el id del trabajo (el
`eventId` idempotente). Los datos del trabajo llevan solo ids, nunca texto, nombres ni correos.
`PUBLICACION_CREADA`, `MATERIAL_CREADO` y `COMENTARIO_CREADO` (con `AVISO_FALLIDO` como cola de
fallidos, creada primero) las crean la API y el worker al arrancar (`adapters/queue/colas.ts`:
3 reintentos, espera de 30 s con retroceso, 300 s de expiración, retención de 7 días) y **no tienen
consumidor** hasta NOTIFICACIONES: los trabajos esperan en la cola.

`crearComentario` lee primero la publicación con
`SELECT id FROM publicaciones WHERE id = … AND clase_id = … FOR SHARE` (`$queryRaw` etiquetado y
parametrizado; la única consulta cruda nueva de c). Sin fila responde `null` (el handler, `404`) y no
inserta. Un borrado simultáneo de la publicación espera a que el comentario confirme y lo borra en
cascada; si el borrado confirma antes, el `FOR SHARE` ya no ve la fila. Toda consulta por
`publicacionId` o `comentarioId` filtra además por la clase de la ruta, y «mis comentarios» pone
`autor_id` dentro de la condición del `deleteMany`. `listarPublicaciones` cuenta los comentarios de
toda la página con una sola consulta agrupada, fuera de cualquier ciclo.
