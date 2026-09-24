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

| Opción                                       | Efecto                                                                                                                    |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `roles?: readonly Rol[]`                     | `requireRole` exige uno de esos roles; sin roles deja pasar a cualquiera autenticado y activo                             |
| `permitirRestringido?: boolean`              | `withAccess` deja pasar a un alumno con `acceso_restringido` (solo `GET /me` y, con `pagos`, `GET /me/estado-pago`)       |
| `permitirCambioPendiente?: boolean`          | `withPasswordGate` deja pasar con `debe_cambiar_contrasena` (solo `POST /auth/cambiar-contrasena`, AUTH-02)               |
| `pertenencia?: "inscripcion" \| "propiedad"` | añade `requireMembership` o `requireOwnership` como sexto paso (hoy responden `501 NO_IMPLEMENTADO`; llegan con `clases`) |

Cada paso es una `function` con nombre. Las decisiones (`evaluarPasswordGate`, `evaluarAcceso`,
`evaluarRol`) son funciones puras de `core/auth/autorizacion.ts`; el middleware solo las evalúa y
lanza el `AppError`. `withProfile` lee el perfil de la base en **cada** petición (rol y banderas
nunca van en el token) y **no** lee `estado_pago`. Los handlers obtienen el perfil con
`perfilDe(request)`; si la ruta no pasó por la cadena, responde `500 PERFIL_AUSENTE`.

## Rutas públicas (única lista: `rutas-publicas.ts`)

`GET /api/salud`, `POST /api/auth/registro`, `POST /api/auth/login`, `POST /api/auth/refrescar`,
`POST /api/auth/logout`. `refrescar` y `logout` se autentican con la cookie `campus_refresco`
(`Path=/api/auth`), credencial exclusiva de esas dos rutas. Para añadir una excepción (por ejemplo
`OPTIONS` del encargo de CORS o `/api/publico/*`) se amplía **esa** lista, no se rodea la guarda.

## Guarda `onRoute` (`guarda-de-rutas.ts`)

`registrarMiddleware(app)` (llamada en `app.ts` **antes** de registrar cualquier handler) decora la
petición con `usuarioId` y `perfil` y registra un hook `onRoute` en el ámbito raíz. Toda ruta que
pueda atender `/api/*` (su `url` empieza por `/api`, o su primer segmento es un parámetro como
`/:seccion/...` o un comodín) y no esté en `RUTAS_PUBLICAS` debe empezar por la **cadena completa**
de `protegido()`, en orden: `authenticate`, `withProfile`, `withPasswordGate`, `withAccess`,
`requireRole`. Los pasos se reconocen por identidad (un registro que solo rellena `protegido()`),
así que una cadena compuesta a mano o una función ajena con el mismo nombre no pasan. Esas rutas
tampoco pueden declarar hooks de ruta que Fastify ejecuta antes que `preHandler` (`onRequest`,
`preParsing`, `preValidation`), porque podrían responder sin pasar por la cadena; los hooks
posteriores (`preSerialization`, `onSend`, `onResponse`) sí se permiten. Si no se cumple, el
arranque de la API falla con `La ruta <METODO> <url> no pasa por protegido() (AGENTS.md, regla 2)`
o `La ruta <METODO> <url> declara <hooks>, que se ejecuta antes de protegido() (AGENTS.md, regla 2)`:
Fastify ejecuta `onRoute` al
registrar la ruta, así que el error sale del `register` y la API no llega a escuchar. `HEAD` se
evalúa como su `GET` porque Fastify lo genera automáticamente copiando los `preHandler`.

### Ampliación de DEC-16 (aceptada por el humano; T-06 y T-12)

DEC-16 pedía solo que `authenticate` fuera el primer `preHandler`. La guarda exige más:

- los cinco pasos de `protegido()`, en orden y por identidad;
- también en las rutas cuyo primer segmento es un parámetro o un comodín, porque pueden atender
  `/api/*`;
- ningún hook de ruta anterior a `preHandler` (`onRequest`, `preParsing`, `preValidation`).

### Límite: hooks de plugin

La guarda solo ve las opciones de la ruta en el momento en que corre su `onRoute`. Los hooks que un
plugin añade con `addHook` (`onRequest`, `preParsing`, `preValidation` e incluso `preHandler`)
corren antes de `protegido()` y la guarda no los ve. Quedan a la revisión de código: ningún plugin
de dominio (`handlers/`) añade hooks que respondan o que decidan permisos.

### Orden de los plugins transversales

La guarda depende del orden en que se registran los plugins que añaden hooks a cada ruta desde su
propio `onRoute`: según ese orden, o la API no arranca, o la guarda no ve el hook. Por eso, en los
encargos de despliegue y CORS:

- `@fastify/rate-limit` se registra con `hook: "preHandler"`, no con su `onRequest` por defecto;
- `@fastify/cors` registra `OPTIONS *`, que la guarda trata como ruta que puede atender `/api/*`:
  hay que añadir `OPTIONS *` a `rutas-publicas.ts`.

Al registrarlos, comprueba que la API arranca y que las rutas protegidas siguen respondiendo 401 sin
token.
