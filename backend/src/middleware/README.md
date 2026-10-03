# middleware/

Cadena fija, siempre en este orden:
`authenticate` → `withProfile` → `withPasswordGate` → `withAccess` → `requireRole` →
`requireMembership` / `requireOwnership` → handler.

Ninguna verificación de rol, propiedad o inscripción se escribe dentro de un handler. Cualquier
cambio en esta carpeta es carril sensible.

## Uso: `protegido()`

Ningún handler compone la cadena a mano. Se pasa `protegido(opciones)` como opciones de la ruta y
el orden queda fijado por construcción (`index.ts`):

```ts
app.get("/me", protegido({ permitirRestringido: true }), async (request, reply) => {
  const perfil = perfilDe(request)
  ...
})
```

| Opción                                        | Efecto                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `roles?: readonly Rol[]`                      | `requireRole` exige uno de esos roles; sin roles deja pasar a cualquiera autenticado y activo                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `permitirRestringido?: boolean`               | `withAccess` deja pasar a un alumno con `acceso_restringido` (solo `GET /me` y, con `pagos`, `GET /me/estado-pago`)                                                                                                                                                                                                                                                                                                                                                                                                                              |
| `permitirCambioPendiente?: boolean`           | `withPasswordGate` deja pasar con `debe_cambiar_contrasena` (solo `POST /auth/cambiar-contrasena`, AUTH-02)                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `permitirRestringido` en `cambiar-contrasena` | `POST /auth/cambiar-contrasena` es la única ruta que admite `permitirCambioPendiente: true` **y** `permitirRestringido: true` juntos (C-01, AUTH-02): un alumno restringido con un cambio pendiente puede cambiarla; después vuelve a ver solo su pantalla. Un restringido **sin** la bandera no queda bloqueado por `withAccess` en esta ruta, pero el handler evalúa primero si tiene un cambio pendiente y responde `409 CAMBIO_NO_REQUERIDO`, no `403 ACCESO_RESTRINGIDO`: la ruta no le abre nada más                                       |
| `pertenencia?: "inscripcion" \| "propiedad"`  | añade `requireMembership` o `requireOwnership` como sexto paso (CLASES-a): resuelve la clase de `:claseId` y la relación del perfil con ella, y la deja en `request.clase` (`claseDe(request)`). `"inscripcion"` deja pasar al estudiante inscrito y al maestro dueño; `"propiedad"`, solo al maestro dueño. Una clase inexistente y una ajena responden lo mismo: `403 SIN_ACCESO_A_LA_CLASE`. El administrador no pasa por ninguna de las dos (sus rutas de clases viven bajo `/admin`, con una excepción de la guarda que agrega ADMIN, R-08) |

Cada paso es una `function` con nombre. Las decisiones (`evaluarPasswordGate`, `evaluarAcceso`,
`evaluarRol`) son funciones puras de `core/auth/autorizacion.ts`; el middleware solo las evalúa y
lanza el `AppError`. `withProfile` lee el perfil de la base en **cada** petición (rol y banderas
nunca van en el token) y **no** lee `estado_pago`. Los handlers obtienen el perfil con
`perfilDe(request)`; si la ruta no pasó por la cadena, responde `500 PERFIL_AUSENTE`.

## Rutas públicas (única lista: `rutas-publicas.ts`)

`GET /api/salud`, `POST /api/auth/registro`, `POST /api/auth/login`, `POST /api/auth/refrescar`,
`POST /api/auth/logout`, `POST /api/auth/recuperar`, `POST /api/auth/restablecer`,
`POST /api/auth/establecer-contrasena`, `POST /api/auth/invitacion` (AUTH-03a),
`POST /api/auth/registro-maestro` (AUTH-03b). `refrescar` y
`logout` se autentican con la cookie `campus_refresco` (`Path=/api/auth`), credencial exclusiva de
esas dos rutas. `recuperar` no revela nada (encola siempre, sin consultar la cuenta); `restablecer`,
`establecer-contrasena` e `invitacion` se autentican con el token de 256 bits del enlace, de un solo
uso (AUTH-02); `invitacion` solo devuelve el nombre de la cuenta con el token de una invitación
viva, sin escribir ni encolar nada. `registro-maestro` se autentica con el token de un enlace de
registro vivo que genera el admin (`POST /api/admin/enlaces-registro`); crea la cuenta como
maestro, deja la sesión iniciada y descarta cualquier `rol` o `enlaceRegistroId` del cuerpo.
`cambiar-contrasena` **no** es pública: pasa por `protegido()`
con `permitirCambioPendiente` y `permitirRestringido` (ver arriba); desde AUTH-03a pide solo la
contraseña nueva y exige además una sesión viva del mismo usuario (cookie de refresco). Para añadir
una excepción (por ejemplo `OPTIONS` del encargo de CORS o `/api/publico/*`) se amplía **esa**
lista, no se rodea la guarda.

## Guarda `onRoute` (`guarda-de-rutas.ts`)

`registrarMiddleware(app)` (llamada en `app.ts` **antes** de registrar cualquier handler) decora la
petición con `usuarioId` y `perfil` y registra un hook `onRoute` en el ámbito raíz. Toda ruta, con
cualquier URL y no solo bajo `/api` (M-15, CHORE-02), que no esté en `RUTAS_PUBLICAS` debe empezar por la **cadena completa**
de `protegido()`, en orden: `authenticate`, `withProfile`, `withPasswordGate`, `withAccess`,
`requireRole`. Los pasos se reconocen por identidad (un registro que solo rellena `protegido()`),
así que una cadena compuesta a mano o una función ajena con el mismo nombre no pasan. Esas rutas
tampoco pueden declarar las opciones de ruta que pueden responder o rehacer la respuesta fuera de
la cadena, o que corren con la petición antes que ella (lista cerrada en "Opciones de ruta",
abajo); solo se permiten `onResponse`, `onTimeout` y `onRequestAbort`, que corren cuando la
respuesta ya salió o ya no puede salir (CHORE-02, T-02). Si no se cumple, el
arranque de la API falla con `La ruta <METODO> <url> no pasa por protegido() (AGENTS.md, regla 2)`
o `La ruta <METODO> <url> declara <hooks>, que se ejecuta antes de protegido() (AGENTS.md, regla 2)`:
Fastify ejecuta `onRoute` al
registrar la ruta, así que el error sale del `register` y la API no llega a escuchar. `HEAD` se
evalúa como su `GET` porque Fastify lo genera automáticamente copiando los `preHandler`.

### Ampliación de DEC-16 (aceptada por el humano; T-06 y T-12)

DEC-16 pedía solo que `authenticate` fuera el primer `preHandler`. La guarda exige más:

- los cinco pasos de `protegido()`, en orden y por identidad;
- en toda ruta, con cualquier URL, no solo en las que pueden atender `/api/*` (M-15, CHORE-02);
- ningún hook de ruta anterior a `preHandler` (`onRequest`, `preParsing`, `preValidation`).

### Regla de `:claseId` (CLASES-a, §D-0.3)

Toda ruta no pública debe llevar el sexto paso
(`requireMembership` o `requireOwnership`) en la posición 5 de `preHandler` si su URL declara un
parámetro llamado `claseId` en **cualquier posición** (no solo al principio de un segmento):
`:claseId` seguido de un carácter que no pueda formar parte de un nombre de parámetro, o del fin de
la URL (por ejemplo, `:parte-:claseId`, `pre-:claseId`, `:claseId.:ext` cuentan igual que
`/x/:claseId`). Un comodín bajo `/clases` también exige el sexto paso, a cualquier profundidad y
tanto pegado (`/clases*`) como con barra (`/clases/*`, `/clases/x/*`). Si falta, el arranque falla
con `... tiene :claseId y no pasa por requireMembership ni requireOwnership`. Bajo `/clases/`, el
único parámetro permitido en el segmento siguiente es `:claseId` (nada combinado, como
`:claseId-:parte`, ni otro nombre): cualquier otra forma se rechaza siempre, con
`... nombra el parámetro de clase distinto de :claseId`, aunque tenga pertenencia (enmienda de
§D-0.3 aceptada durante CLASES-a, rondas 1 y 2 del tester: T-02 y T-13). Una ruta **con** pertenencia
y **sin** `:claseId` sigue arrancando (no la toca esta regla); en una petición responde
`500 CLASE_AUSENTE` (`claseDe`/`resolverClaseDeLaRuta`, `middleware/pertenencia.ts`).

**Nota para ADMIN (N-01, R-08):** con esta regla, `/api/admin/clases/:claseId` exigiría un sexto
paso que el admin nunca pasa (no pasa por `requireMembership` ni `requireOwnership`), y
`/api/admin/clases/:id` se rechaza por el nombre del parámetro. El encargo ADMIN agrega una
excepción a esta regla, en carril sensible; **no se construye en CLASES**.

### Parámetros y comodines en los dos primeros segmentos (CHORE-02)

Ninguna ruta no pública puede tener un parámetro (`:`) o un comodín (`*`) en sus dos primeros
segmentos (`/api/*`, `/api/:seccion/*`, `/:seccion/*`, `*`, `/api*`): con `protegido()` y sin
una ruta más específica, atendería `/api/clases/<id>/…` sin la regla de `:claseId`. Es la última
regla de la guarda; si falta la cadena o el sexto paso, gana ese motivo. El arranque falla con
`La ruta <METODO> <url> tiene un parámetro o un comodín en sus dos primeros segmentos (AGENTS.md, regla 2)`.

### Manejadores de 404 y de errores (CHORE-02, T-01)

`setNotFoundHandler` y `setErrorHandler` no disparan `onRoute`: un plugin con prefijo `/api` podría
atender `/api/clases/<id>/…`, o rehacer la respuesta de la cadena, sin que la guarda lo viera.
`registrarMiddleware` reemplaza los dos métodos de la instancia raíz por uno que lanza; todos los
contextos lo heredan. Los únicos manejadores son los de `handlers/errores.ts`, que `app.ts`
registra **antes** de `registrarMiddleware`. Un plugin transversal que necesite cualquiera de los
dos se registra también antes; si no, la API no arranca con
`La instancia llama a <método> después de registrarMiddleware: el único es el de handlers/errores.ts, registrado antes (AGENTS.md, regla 2)`.

### Opciones de ruta (CHORE-02, T-02)

Prohibidas, con su motivo:

- `onRequest`, `preParsing`, `preValidation`: corren antes de `protegido()` y podrían responder
  (T-12).
- `errorHandler`, `onSend` (salvo el que Fastify agrega a la ruta `HEAD` automática para vaciar el
  cuerpo), `preSerialization`, `onError`: corren después de la cadena y pueden cambiar el estado,
  el cuerpo o los encabezados de su `401`/`403`.
- `schema`, `validatorCompiler`, `serializerCompiler`, `schemaErrorFormatter`: validan antes de
  `preHandler` o serializan la respuesta fuera de la cadena (los handlers validan con zod).
- `childLoggerFactory`, `logSerializers`: corren con la petición antes de la cadena.

Permitidas: `method`, `url`, `handler`, `preHandler` (la cadena primero), `config`,
`constraints`, `bodyLimit`, `handlerTimeout`, `logLevel`, `exposeHeadRoute`,
`prefixTrailingSlash`, `attachValidation` (sin `schema` no hace nada), `onResponse`,
`onTimeout` y `onRequestAbort`. La guarda reemplaza las listas de hooks de la ruta declaradas como
arreglo por una copia congelada, así que mutar después el arreglo de `protegido()` no cambia la
ruta; un hook declarado como función suelta es inmutable por identidad, y el autor no conserva
ninguna referencia al objeto de opciones que Fastify lee en `preReady`, porque `route()` lo copia.
Las rutas públicas están exentas, como con T-12.

### Hooks y métodos de la instancia (CHORE-02, T-01 y T-03)

`registrarMiddleware` reemplaza en la instancia raíz, y todos los contextos lo heredan:

- `addHook` de `onRequest`, `preParsing`, `preValidation`, `preHandler`, `preSerialization`,
  `onSend`, `onError` (pueden responder o rehacer la respuesta) y `onRoute` (podría cambiar una
  ruta después de que la guarda la revisó). Se siguen permitiendo `onResponse`, `onTimeout`,
  `onRequestAbort`, `onReady`, `onListen`, `preClose`, `onClose` y `onRegister`.
- `setNotFoundHandler` y `setErrorHandler` (T-01), `setReplySerializer`, `setValidatorCompiler`,
  `setSerializerCompiler`, `setSchemaController`, `setSchemaErrorFormatter`, `setGenReqId`,
  `setChildLoggerFactory`, `addContentTypeParser` y `addConstraintStrategy`; y `register` con
  la opción `logSerializers`.

Cualquiera de ellos, llamado después, impide el arranque. Un plugin transversal que los necesite
(`@fastify/cookie` hoy; `@fastify/cors`, `@fastify/rate-limit` o compresión después) se registra
**antes** de `registrarMiddleware`, como `manejoDeErrores`. Lo que eso significa de verdad (M-09):
sus hooks de instancia corren en todas las rutas, también antes de la cadena, y la guarda no los
ve, así que quedan a la revisión de código al instalarlo; la guarda solo revisa las opciones de
ruta que ese plugin modifique con un `onRoute` propio; y las rutas que el plugin registra en su
propio cuerpo nacen antes del `onRoute` de la guarda, así que tampoco las revisa.

### Límite (riesgo aceptado)

La guarda solo ve la API de Fastify. Quedan a la revisión de código: escribir directo en el
servidor HTTP de Node (`app.server.on("request" …)`, `"checkContinue"`, `"upgrade"`) o en el
socket de una petición, y usar los símbolos privados de Fastify. La regla estática que impide obtener
la fábrica de Fastify fuera de `app.ts` (`higiene-de-pruebas.integracion.test.ts`, PR-CH-12g) es de
texto: no cubre un especificador armado en ejecución (concatenación, plantilla con expresión o una
variable); queda a la revisión de código (O-12, CHORE-02).

### Orden de los plugins transversales

La guarda depende del orden en que se registran los plugins que añaden hooks a cada ruta desde su
propio `onRoute`: según ese orden, o la API no arranca, o la guarda no ve el hook. Por eso, en los
encargos de despliegue y CORS:

- `@fastify/rate-limit` se registra antes de `registrarMiddleware` y con `hook: "preHandler"`, no con su `onRequest` por defecto (no está instalado: el encargo que lo agregue comprueba cómo añade su hook a las rutas y que la guarda lo acepta);
- `@fastify/cors` registra `OPTIONS *` dentro de su propio plugin; registrado antes de
  `registrarMiddleware`, esa ruta nace antes del `onRoute` de la guarda y la guarda no la revisa
  (M-09). El encargo que lo agregue verifica qué pasa con `OPTIONS *` y si hace falta en
  `rutas-publicas.ts`.

Al registrarlos, comprueba que la API arranca y que las rutas protegidas siguen respondiendo 401 sin
token.
