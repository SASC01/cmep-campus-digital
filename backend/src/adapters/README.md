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
  (`crearUsuarioConSesion`, `crearMaestroInvitado`); las lecturas sin bloqueo (`buscar*`, `contar*`).
- **Encargos futuros:** todo encargo que revoque sesiones o cambie credenciales (baja, restricción
  que cierre sesiones, cambio voluntario) cumple estas reglas.

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
