# Resumen del Programador — CHORE-02 · pruebas y espera en cadena

## CHORE-02 — Implementación

Plan: `docs/trabajo/CHORE-02-pruebas-y-espera-en-cadena/plan.md` (con las Enmiendas 1 y 2). Rama `feat/chore-02`, base `ee21252`. Fecha: 2026-10-02.

**Estado: DETENIDO EN EL PASO 14 POR PA-12.** Pasos 2 a 13 completos; `lint` y `build` en verde; la primera corrida completa del backend (paso 14) dio **1 rojo intermitente** en `src/workers/ritmo-03c-r1.ataque.test.ts`. Como dice PA-12, no repetí la corrida para "limpiarla" y no hice las cinco corridas del paso 15 ni los pasos 16 (frontend y raíz). Lo reporto completo abajo y espero la decisión del manager.

Pasos completados: 2 a 13 de 17, más `lint` y `build` del paso 14; faltan la parte `test` del 14, el 15 (cinco corridas), el 16 y el cierre del 17 (este resumen está escrito con lo que hay).

## Verificación (comando exacto y última línea literal)
| Qué | Comando (desde `backend/`) | Última línea literal |
|---|---|---|
| lint | `npm run lint` | `> tsc -p tsconfig.json --noEmit && tsc -p tsconfig.test.json` (código de salida 0; antes: `All matched files use Prettier code style!`) |
| build | `npm run build` | `> tsc -p tsconfig.json` (código de salida 0) |
| tsc de pruebas (PR-CH-06b) | `npx tsc -p tsconfig.test.json` | sin salida, código 0 (antes de mi trabajo: 36 errores en 17 archivos; los 5 `*.ataque` ya venían corregidos por la ronda 0) |
| test (paso 14, una corrida) | `npm test -- --reporter=default --reporter=json --outputFile.json=<scratchpad>/chore02-p14.json > <scratchpad>/chore02-p14.txt 2>&1` | `Test Files  1 failed \| 123 passed (124)` · `Tests  1 failed \| 1368 passed (1369)` · `Duration  165.90s (transform 21.99s, setup 8.39s, import 320.96s, tests 1188.09s, environment 75ms)` |
| prisma validate | n/a (sin cambios de esquema) | n/a |

Nota: pasé `--reporter=default --reporter=json` para obtener las duraciones de PR-CH-02 sin cambiar el reporte por defecto de la consola.

## PA-12 activada — el rojo, completo
- **Archivo y caso:** `src/workers/ritmo-03c-r1.ataque.test.ts` › `ataque (AUTH-03c r1): ritmo del worker con reloj y espera reales` › `si ya pasaron más de 250 ms desde el último intento, el siguiente no espera`.
- **Error:** `AssertionError: expected 30 to be less than 30` en `ritmo-03c-r1.ataque.test.ts:170:55` (`expect((intentos[1]?.inicio ?? Infinity) - antes).toBeLessThan(30)`). Duración del caso: 416.3 ms (JSON de Vitest). El margen de 30 ms con reloj real quedó justo en el límite.
- **Contexto:** es el archivo que el plan dejó en "No entra" (mide milisegundos con reloj real); el plan dice que, si falla en una corrida de verificación, es un hallazgo de la ronda del tester (PA-12). No lo toco (es `*.ataque`), no cambié su margen y no repetí la corrida. Los demás casos del mismo archivo pasaron.
- **PA-07 sobre esa corrida** (`grep -c` por término sobre `chore02-p14.txt`): `40P01` 0 · `deadlock detected` 0 · `could not serialize` 0 · `too many clients` 0 · `"Error no controlado"` 10 · `"code":"P2028"` 5 · (y `Error controlado del servidor` 5).
  - (a) no se activa. (b) las 10 líneas de "Error no controlado" son exactamente el inventario I-1 (6 de `POST /api/auth/login` de `intentos-r2.ataque`, 3 `ZodError` de `archivos-d-r2.ataque` en `POST /api/clases/:id/archivos`, `POST /api/clases/:id/archivos/:id/descarga` y `GET /api/clases/:id/publicaciones`, y `GET /api/prueba/error-comun` de `salud.integracion`, ya con su ruta nueva). (c) los 5 `P2028` son exactamente los permitidos, identificados por ruta y llamada:
    | Ruta | Llamada | Origen |
    |---|---|---|
    | `POST /api/auth/cambiar-contrasena` | `tx.sesion.findFirst()` (`adapters/db/usuarios.ts:293`) | `servicio-ocupado` PR-CH-04d |
    | `POST /api/auth/refrescar` | `tx.sesion.updateMany()` (`adapters/db/sesiones.ts:72`) | `servicio-ocupado` PR-CH-04e |
    | `POST /api/clases/:id/publicaciones/:id/comentarios` | `prisma.$queryRawUnsafe()` (encolado, `ejecutorSqlDe`) | `servicio-ocupado` PR-CH-04f |
    | `POST /api/auth/login` | `tx.sesion.create()` | `cuentas-r3.ataque`, bloque P2028 |
    | `POST /api/auth/restablecer` | `tx.tokenCuenta.updateMany()` | `cuentas-r3.ataque`, bloque P2028 |
  - **Control positivo (§D-8):** presentes los tres de `servicio-ocupado` (04d, 04e, 04f), cada uno con su ruta; el conteo vale. Los dos de `cuentas-r3` también aparecen (ahora como `warn` "Error controlado del servidor").
  - Esto es **una sola corrida con un rojo**, así que no declaro PA-07 "limpia" para el protocolo de 5 corridas.
- **PR-CH-02 (duraciones de esa corrida, del JSON de Vitest):** PR-B05 en verde, **6701.8 ms**; caso de C-1 en verde, **12368.5 ms** (dentro de su presupuesto de 30 s y de su límite de 45 s, pero **por encima de los 10 s** que R-1 pide reportar: lo reporto para el tester/manager).
- Ninguna otra falla: A3 de `bloqueo-usuario.integracion` (PR-CH-03b) pasó en esa corrida; 0 `timed out`; el caso de C-1 no agotó su presupuesto.

## Conteos
- `cd backend; npx vitest list --filesOnly | grep -c .` → **124** archivos (cifra esperada del plan: 124). 
- `cd backend; npx vitest list | grep -c .` → **1369** casos (1300 de partida + 69 nuevos).
- `cd backend; npx tsc -p tsconfig.test.json --listFilesOnly` (sin `node_modules`): 96 archivos bajo `backend/test/` y 38 `src/**/*.test.ts` (cuenta con `grep -c`, incluye ayudas que no son pruebas).

## V-01
`git ls-files '*.ataque.test.ts' '*.ataque.test.tsx'`, hash de cada uno con `sha256sum`, ordenado por ruta, contra las 107 filas de la tabla del final de `reporte-tester.md` (ronda 0) → `diff` sin diferencias (`V01-IGUAL-final`), al inicio y al final de mi trabajo. No toqué ningún `*.ataque`.

## Pruebas requeridas → caso que las cubre
| ID | Archivo y título exacto |
|---|---|
| PR-CH-01a | `backend/test/cuentas-r1.ataque.test.ts` › "con la tabla usuarios bloqueada por otra transacción, recuperar responde igual y a tiempo" (del tester, ronda 0) |
| PR-CH-01b | Verificación: **no completada** (PA-12 en la corrida 14; no hice las 5 corridas) |
| PR-CH-01c | `backend/test/higiene-de-pruebas.integracion.test.ts` › "ningún archivo de backend/test ni de backend/src/**/*.test.ts pide un bloqueo de tabla sin NOWAIT"; controles de la regla: "el control de la regla rechaza las formas sin NOWAIT, incluso partidas en líneas", "el control de la regla acepta NOWAIT, también en otra línea, y no cuenta lo que no es un bloqueo de tabla", "el control de la regla informa la línea donde empieza la sentencia" |
| PR-CH-02 | Verificación parcial: duraciones de la corrida 14 (arriba); las de las otras 5 corridas no existen |
| PR-CH-03a | `higiene-de-pruebas.integracion.test.ts` › "cuenta la espera de una fila (transactionid) y no la de un bloqueo consultivo (advisory)" |
| PR-CH-03b | `bloqueo-usuario.integracion.test.ts` › "A3: …" sin cambios en sus aserciones; en verde en la corrida 14 (una sola) |
| PR-CH-04a | `backend/src/adapters/db/errores.test.ts` › "un P2028 se lanza como AppError SERVICIO_OCUPADO 503 con el error original como cause" y `it.each` "relanza el mismo objeto con %s" (un P2002, un error conocido de otro código, un Error común, un AppError a propósito) |
| PR-CH-04b | `backend/src/core/errores.test.ts` › "conserva la causa original en cause, sin cambiar codigo, estado ni message" y "sin opciones, cause es undefined y codigo, estado y message no cambian" |
| PR-CH-04c | `servicio-ocupado.integracion.test.ts` › "PR-CH-04c: una transacción que pasa su timeout rechaza con SERVICIO_OCUPADO 503 y no escribe nada" (S-1 comprobada contra la base: llega como `P2028`; PA-03 no se activó) |
| PR-CH-04d | `servicio-ocupado.integracion.test.ts` › "PR-CH-04d: responde 503 SERVICIO_OCUPADO sin escribir nada, y la misma petición sin retención responde 204" |
| PR-CH-04e | `servicio-ocupado.integracion.test.ts` › "PR-CH-04e: responde 503 SERVICIO_OCUPADO sin cookie nueva ni rotar la sesión, y un refresco posterior responde 200" |
| PR-CH-04f | `servicio-ocupado.integracion.test.ts` › "PR-CH-04f: responde 503 SERVICIO_OCUPADO sin comentario ni trabajo en la cola" |
| PR-CH-04g | `servicio-ocupado.integracion.test.ts` › "un AppError 503 con causa P2028 produce una línea warn con el código de Prisma y el codigo del error"; "un AppError 503 sin causa y un AppError 4xx con causa no producen ninguna línea warn"; "un Error común sigue produciendo Error no controlado y 500 ERROR_INTERNO" |
| PR-CH-04h | `higiene-de-pruebas.integracion.test.ts` › "solo adapters/db/cliente.ts tiene .$transaction( en una línea de código" |
| PR-CH-05a | `guarda-todas-las-rutas.integracion.test.ts` › `it.each` "%s sin protegido() → la API no arranca" (5 filas) y "GET /interno con protegido() arranca y sin token responde 401" |
| PR-CH-05b | mismo archivo › `describe.each` "con %s" › "GET %s → la API no arranca con el motivo del comodín" (3 cadenas × 8 URL) y, "solo con pertenencia": "GET %s sin pertenencia → no arranca por la pertenencia" y "GET %s con pertenencia → no arranca por el comodín" (3 URL) |
| PR-CH-05c | mismo archivo › "GET %s con pertenencia arranca" (`/api/clases/*`, `/api/x/:claseId`), "GET %s con protegido() arranca" (`/api/me/*`, `/prueba-ataque/x`), "las rutas públicas de la lista arrancan sin protegido(), con HEAD explícito de /api/salud" |
| PR-CH-05d | mismo archivo › "construirApp arranca y GET /api/me sin token responde 401" |
| PR-CH-05e | mismo archivo › "HEAD explícito de /api/* con protegido() no arranca por el comodín" y "HEAD explícito de /interno sin protegido() no arranca" |
| PR-CH-06a | `backend/test/entorno-de-pruebas.test.ts` › `it.each` "rechaza una URL de campus_pruebas con parámetros de consulta (%s), sin la contraseña ni el parámetro" (`?host=db.remota`, `?hostaddr=10.0.0.1`, `?port=5999`, `?options=-c%20search_path%3Dotra`, `?sslmode=disable`); los 4 casos de antes sin cambio |
| PR-CH-06b | `npx tsc -p tsconfig.test.json` sin errores (arriba); `npm run lint` en 0 con `tsc -p tsconfig.test.json` en la salida; `--listFilesOnly` con archivos de `backend/test/` y de `src/**/*.test.ts` (arriba) |
| PR-CH-07a | Diff de `invitacion-masiva.integracion.test.ts`: `{ timeout: 20_000, maxWait: 5_000 }` en la retenedora del caso "dos lotes lanzados a la vez quedan en serie: el segundo, formado detrás del bloqueo, ve el cupo que confirmó el primero (M-04)" |
| PR-CH-07b | mismo caso: tras el `finally` que borra el token de 2100, `expect(await obtenerDb().tokenCuenta.count({ where: { id: idDelTokenDeLaVentana } })).toBe(0)` |
| PR-CH-08 | `backend/test/enlaces-registro.integracion.test.ts` › "lista en orden creado_en DESC, id DESC y pagina con cursor" (ventana de 2000, ancla D, primera página `[C, B]`, segunda empieza con A y sin B, C ni D) |

Pruebas de autorización por endpoint: no hay endpoint nuevo (plan); la guarda la cubre PR-CH-05.

## Archivos tocados contra A-2 a A-5 y "Cambios por capa" (ninguno fuera)
- **A-2:** `backend/src/middleware/guarda-de-rutas.ts` (se elimina `puedeAtenderApi`; `comodinEnLosPrimerosSegmentos`; la regla va después de `declara …`, como pide el plan; cabeceras), y solo el comentario de `backend/src/middleware/rutas-publicas.ts`.
- **A-3:** `backend/src/core/errores.ts` (+ `errores.test.ts`), `backend/src/adapters/db/errores.ts` (+ `errores.test.ts` nuevo), `backend/src/adapters/db/cliente.ts`, `backend/src/handlers/errores.ts`.
- **A-4, con cambios:** `ayudas-concurrencia.ts`, `entorno-de-pruebas.ts`, `entorno-de-pruebas.test.ts`, `salud.integracion.test.ts`, `invitacion-masiva.integracion.test.ts`, `enlaces-registro.integracion.test.ts`, `core/errores.test.ts`.
- **A-4, solo tipos (17):** `alumnos-autorizacion`, `alumnos`, `archivos-autorizacion`, `archivos`, `bloqueo-usuario`, `cambiar-contrasena`, `clases-autorizacion`, `clases`, `cola`, `movimientos-inscripcion`, `muro-autorizacion`, `muro`, `restablecer`, `worker-consumidor`, `worker-correo-de-cuenta` (los 15) más `enlaces-registro` e `invitacion-masiva`.
- **A-4, solo un comentario:** `middleware-orden.integracion.test.ts` (líneas 36-37; nada más).
- **A-5:** `backend/package.json` (solo `typecheck`) y `backend/tsconfig.test.json` (nuevo, idéntico al de §D-6).
- **Nuevos:** `backend/test/servicio-ocupado.integracion.test.ts`, `guarda-todas-las-rutas.integracion.test.ts`, `higiene-de-pruebas.integracion.test.ts`, `backend/src/adapters/db/errores.test.ts`.
- **De la ronda 0 (no míos):** los 10 `*.ataque` de A-1. Los textos propuestos T-1 a T-6 (READMEs, ARCHITECTURE*, AGENTS) no los toqué: son del orquestador. `git status` muestra además `docs/ARCHITECTURE*.md`, `docs/PRD.md` y `docs/ESTADO.md` modificados: no los toqué yo.
- Prettier se corrió solo sobre archivos concretos de `backend/`; nunca desde la raíz.

## Hermanos
**C-4 (`deadLetter` en `asegurarCola`):** `worker-consumidor.integracion.test.ts` (aplica, **aplicado**: alias `PoliticaConFallidos` y constante anotada, sin `as`) y `worker-correo-de-cuenta.integracion.test.ts` (aplica, **aplicado**, mismo patrón). Los tres `*.ataque` ya traían el patrón de la ronda 0. No hay más llamadas con `deadLetter` en `backend/test` (revisé con `tsc`, que ya no reporta ninguna).

**Los 17 archivos de tipos, uno por uno (patrón corregido):**
| Archivo | Patrón | ¿Aplicado? |
|---|---|---|
| `alumnos-autorizacion`, `alumnos`, `archivos-autorizacion`, `archivos`, `clases-autorizacion`, `clases`, `movimientos-inscripcion`, `muro-autorizacion`, `muro` | `payload` de `inject` tipado `unknown`: `payload?: InjectOptions["payload"]` (import de `InjectOptions` desde `fastify`) y, por `exactOptionalPropertyTypes`, `...(x.payload === undefined ? {} : { payload: x.payload })` en cada `inject`. En `archivos` y `muro` también el parámetro `payload: unknown` de `publicar`/su helper | Sí, en los 9 (todos los sitios con ese patrón; `tsc` ya no reporta ninguno) |
| `cambiar-contrasena` | `cookie?: string \| undefined` en el parámetro de `cambiar` (11 errores de `exactOptionalPropertyTypes`) | Sí |
| `bloqueo-usuario` | `possibly null` de la línea 277: precondición `expect(respuesta, "Precondición: …").toBeTruthy()` + `if (!respuesta) throw`. La lista cerrada de E6 no se tocó | Sí |
| `cola` | `possibly undefined` de `capturados[0]`: variable `capturado` con precondición `expect` + `throw` | Sí |
| `enlaces-registro` | `cuerpo.enlace.id` `unknown`: genérico `{ id: string } & Record<string, unknown>` | Sí |
| `invitacion-masiva` | `...args: Parameters<typeof original>` en el espía de `findMany` | Sí |
| `restablecer` | `ReturnType<typeof app.inject>` elegía la sobrecarga `Chain`: `LightMyRequestResponse` (import de tipo) en los dos sitios | Sí |
| `worker-consumidor`, `worker-correo-de-cuenta` | `deadLetter` (ver arriba) | Sí |

Ningún cambio de aserciones, entradas, valores esperados u orden; ningún `!`, `as`, `@ts-ignore`; ningún caso borrado ni saltado. (Los únicos cambios que agregan un `expect` son las dos precondiciones de `bloqueo-usuario` y `cola`.)

**§D-3 (nueve sitios de "formada"):** `ayudas-concurrencia.ts` (aplica, **aplicado** con `formadasDetrasDe`); `cuentas-r2`, `cuentas-r3`, `cuentas-03a-r1` (aplica; lo aplicó el tester, C-3); `enlaces-03b-r1/r2`, `muro-c-r1`, `archivos-d-r1` y `invitacion-masiva.integracion:370-376` (no aplica, por las razones del plan; no aplicado).

**(e), `timeout` explícito:** solo aplica a `invitacion-masiva.integracion:344`; las demás retenedoras ya lo traían (lista del plan). Mis dos retenedoras nuevas (`higiene-de-pruebas` PR-CH-03a, con `timeout: 30_000` en T1, T2 y T3; `servicio-ocupado` usa `conFilaRetenida`, con 30 s) también lo llevan.

**P2028 → 503 en todas las transacciones:** aplica a todas; se hizo en el único `$transaction` de `backend/src` (`enTransaccion`) y PR-CH-04h impide otro. No hay prueba HTTP de `invitarMaestrosEnLote` (por el plan).

**Hermano del hallazgo de la regla de higiene (nuevo, mío):** `LOCK\s+…` también coincide con el texto "could not obtain lock on relation" (la regla de ESLint no aplica; el regex del plan sí). Ver Desviaciones.

## PARADAS
| ID | Resultado |
|---|---|
| PA-01 | No se activó (red `IZZI-F281-5G` perfil Public; regla "Campus: bloquear entrada a Docker en redes publicas" habilitada, entrada, Block, Public) |
| PA-02 | No se activó (`tsc -p tsconfig.test.json` en 0, sin errores en ningún `*.ataque`) |
| PA-03 | No se activó (PR-CH-04c: el error llega como `PrismaClientKnownRequestError` `P2028` y sale como `AppError` 503) |
| PA-04 | No se activó (`construirApp` real arranca con la guarda nueva) |
| PA-05 | No se activó (ningún archivo fuera de A-4 se rompió) |
| PA-06 | No se activó (no toqué archivos fuera de "Cambios por capa", ni `vitest.config.ts`, `global-setup.ts`, `setup.ts`; no cambié ningún `timeout` de una prueba existente para que pase; el único `timeout` que cambié es el de (e), que el plan pide) |
| PA-07 | Evaluada sobre la corrida 14: no se activa (arriba), pero solo una corrida |
| PA-08 | No se activó (una suite a la vez; no corrí el frontend) |
| PA-09 | No se activó: mis pruebas nuevas pasaron aisladas y en la corrida completa (aisladas: `servicio-ocupado` 7/7, `higiene` 6/6, `guarda-todas-las-rutas`, `errores`). Solo tengo una corrida completa |
| PA-10 | No se activó (la línea `warn` lleva el error de Prisma con el fragmento de la llamada, sin contraseñas, tokens ni valores del cuerpo; lo revisé en las tres líneas de `servicio-ocupado`) |
| PA-11 | No se activó |
| **PA-12** | **SE ACTIVÓ.** Rojo intermitente en `ritmo-03c-r1.ataque` (arriba). Me detuve: no repetí la corrida |

## Desviaciones del plan
1. **PR-CH-01c, el patrón del plan tiene un falso positivo.** El regex literal del plan (`\bLOCK\s+(?:TABLE\s+)?(?:ONLY\s+)?["\w.]`, sin distinguir mayúsculas) coincide con `lock on` en `/could not obtain lock on relation/i` de `cuentas-r1.ataque.test.ts:147` (la ronda 0, C-1, reconoce así el error `55P03`), que no puedo modificar. Agregué al patrón un `(?!on\s+relation\b)` justo después de `LOCK\s+`: "LOCK on relation" nunca es una sentencia válida (sería la tabla `on` y luego `relation`, sin coma). Dejé un caso de control que lo comprueba. Si el manager prefiere otra solución (por ejemplo, que C-1 arme la frase de otro modo), es del tester.
2. Pasé `--reporter=default --reporter=json` en la corrida 14 para obtener las duraciones de PR-CH-02 (el plan lo permite: "o el reporte JSON"); la salida por defecto es la misma.
3. Todo lo demás, según el plan.

## Pendiente o fuera de alcance detectado
- **PA-12 sin resolver:** `ritmo-03c-r1.ataque` ("si ya pasaron más de 250 ms…", margen de 30 ms con reloj real) falló una vez, con `expected 30 to be less than 30`. Falta la decisión: ¿lo atiende el tester en su ronda (es `*.ataque`, "No entra" del plan)? Mientras tanto, no puedo declarar las 5 corridas del paso 15.
- **R-1:** el caso de C-1 tardó 12.4 s en la corrida 14 (más de los 10 s que el plan pide reportar).
- Faltan: paso 15 (5 corridas, con conteo PA-07 y duraciones PR-B05 y C-1 por corrida), paso 16 (frontend 104 / 1396, `npm run lint` y `npm run build` desde la raíz).
- Las filas de `ESTADO.md` y los textos T-1 a T-6 son del orquestador.

## CHORE-02 — Corrección de la ronda 1 y cierre

Pasos 13a, 13b, 14, 15 y 16 completos (17 con esta sección). Sin PARADAS activadas. Sin commit.

### Qué se hizo
- **13a (T-01, §E3-1; A-2):** `backend/src/middleware/guarda-de-rutas.ts`: `bloquearManejadoresPropios(app)` al final de `registrarGuardaDeRutas` (`Object.defineProperty` no escribible ni configurable sobre `setNotFoundHandler` y `setErrorHandler`, con el mensaje exacto del plan). **O-2:** `comodinEnLosPrimerosSegmentos` descarta los segmentos vacíos (`.split("/").filter(...).slice(0, 2)`). No toqué `app.ts`, `eslint.config.mjs`, `handlers/errores.ts` ni `middleware/index.ts`. Los dos casos de T-01 de `guarda-ch-r1.ataque.test.ts` pasan a verde sin tocar el archivo.
- **13b (M-08, opción (i); A-3 y A-8 (i)):** `enTransaccion` (`adapters/db/cliente.ts`) acepta un tercer parámetro `{ maxWait?: number }`; solo si llega lo pasa a `$transaction(fn, { maxWait })` (el `timeout` y la traducción del `P2028` no cambian; un `enTransaccion` anidado lo ignora). `adapters/db/enlaces-registro.ts`: `ESPERA_DE_CONEXION_DEL_ENLACE_MS = 10_000`, que pasan `registrarMaestroConEnlace` y `revocarEnlaceRegistro`. Sin SQL nuevo. Prettier reindentó los dos cuerpos de las transacciones por el tercer argumento (el diff de ese archivo es mayor de lo que cambia en sustancia).

### Pruebas requeridas → caso que las cubre
| ID | Archivo y título exacto |
|---|---|
| PR-CH-05f | `backend/test/guarda-todas-las-rutas.integracion.test.ts` › "guarda: segmentos vacíos delante del comodín (PR-CH-05f, O-2)" › `it.each` "GET %s con protegido() → la API no arranca con el motivo del comodín" (`//api/*`, `//api/:seccion/*`, `/api//*`, `/api//:seccion/*`, `///*`) |
| PR-CH-09a | `backend/test/guarda-ch-r1.ataque.test.ts` (del tester, sin cambios) › "un plugin con prefijo /api/clases y setNotFoundHandler propio: o no arranca, o sin token responde 401" y "un plugin con prefijo /api y setNotFoundHandler propio: o no arranca, o sin token responde 401": verdes |
| PR-CH-09b | `guarda-todas-las-rutas.integracion.test.ts` › "un plugin con prefijo %s que llama a setNotFoundHandler → la API no arranca" (`/api/clases`, `/api`, `/otro`); "un plugin sin prefijo que llama a setNotFoundHandler → la API no arranca"; "un plugin anidado que llama a setNotFoundHandler → la API no arranca"; "un plugin envuelto con fastify-plugin (contexto de la raíz) → la API no arranca"; "asignar hijo.setNotFoundHandler dentro de un plugin tampoco arranca" |
| PR-CH-09c | mismo archivo › "un plugin con prefijo /api/clases con una ruta protegido() y un setErrorHandler propio → la API no arranca" y "un plugin envuelto con fastify-plugin que llama a setErrorHandler → la API no arranca" |
| PR-CH-09d | mismo archivo › "registrar manejoDeErrores después de registrarMiddleware impide el arranque"; "registrado antes (como app.ts), arranca"; "con construirApp real, GET /api/no-existe responde 404 NO_ENCONTRADO y GET /api/me sin token responde 401 con el formato de la API" |
| PR-CH-09e | `backend/test/higiene-de-pruebas.integracion.test.ts` › "solo handlers/errores.ts llama a setNotFoundHandler( o setErrorHandler( en una línea de código" |
| PR-CH-10a | `backend/test/servicio-ocupado.integracion.test.ts` › "PR-CH-10a: con maxWait de 8 s y el pool ocupado 3 s, no rechaza y resuelve después de soltarlo; sin la opción rechaza con 503" |
| PR-CH-10b | mismo archivo › "PR-CH-10b: registrarMaestroConEnlace y revocarEnlaceRegistro esperan la conexión y resuelven, sin 503" |
| PR-CH-10c | `backend/test/enlaces-03b-r2.ataque.test.ts` › "40 registros simultáneos con el mismo enlace: 40 × 201, 40 cuentas y ningún 5xx" (sin cambios): verde en las 6 corridas (duraciones abajo), sin ningún `P2028` de `maxWait`. Los dos casos de T-07 del archivo también en verde (el archivo pasó entero en las 6) |
| PR-CH-01b / 02 / 03b | Cumplidos en esta entrega: 6 corridas completas en verde, tabla abajo |

### Conteos
- `cd backend; npx vitest list --filesOnly | grep -c .` → **129** archivos.
- `cd backend; npx vitest list | grep -c .` → **1434** casos (1414 de la ronda 1 del tester + 20 míos: 5 de PR-CH-05f, 7 de 09b, 2 de 09c, 3 de 09d, 1 de 09e, 1 de 10a y 1 de 10b).
- Frontend (sin cambios): 104 archivos / 1396 pruebas.

### Verificación (comando exacto y última línea literal)
| Qué | Comando | Última línea |
|---|---|---|
| lint backend | `cd backend; npm run lint` | `> tsc -p tsconfig.json --noEmit && tsc -p tsconfig.test.json` (código 0; antes: `All matched files use Prettier code style!`) |
| tsc de pruebas | `cd backend; npx tsc -p tsconfig.test.json` | sin salida, código 0 |
| build backend | `cd backend; npm run build` | código 0 (`> tsc -p tsconfig.json`) |
| test backend, paso 14 y 5 corridas del paso 15 | `cd backend; npm test -- --reporter=default --reporter=json --outputFile.json=<scratchpad>/chore02-cN.json > <scratchpad>/chore02-cN.txt 2>&1`, una tras otra, sin otra suite en marcha | las seis: `Test Files  129 passed (129)` y `Tests  1434 passed (1434)` |
| frontend test | `cd frontend; npm test` | `Test Files  104 passed (104)` · `Tests  1396 passed (1396)` · `Duration  113.65s` |
| frontend lint | `cd frontend; npm run lint` | `> tsc -b` (código 0) |
| raíz lint | `npm run lint` | `> tsc -b` (código 0) |
| raíz build | `npm run build` | `✓ built in 1.59s` (código 0) |

### Las corridas (paso 14 = corrida "14"; paso 15 = corridas 1 a 5)
| Corrida | Duración | PR-B05 | Caso de C-1 | Caso de los 40 (M-08) | `40P01` / deadlock / serialize / too many clients | `"Error no controlado"` | `"code":"P2028"` |
|---|---|---|---|---|---|---|---|
| 14 | 86.53 s | 4997 ms | 4856 ms | 1833 ms | 0 / 0 / 0 / 0 | 10 | 5 |
| 1 | 86.46 s | 4380 ms | 8029 ms | 2163 ms | 0 / 0 / 0 / 0 | 10 | 5 |
| 2 | 86.48 s | 3658 ms | 4716 ms | 1988 ms | 0 / 0 / 0 / 0 | 10 | 5 |
| 3 | 88.37 s | 3065 ms | 4662 ms | 1982 ms | 0 / 0 / 0 / 0 | 10 | 5 |
| 4 | 95.31 s | 3654 ms | 12153 ms | 2206 ms | 0 / 0 / 0 / 0 | 10 | 5 |
| 5 | 95.33 s | 4499 ms | 4756 ms | 2163 ms | 0 / 0 / 0 / 0 | 10 | 5 |

- **PA-07 en las 6 corridas, idéntica** (asociación por `pid` + `requestId`):
  - (a) no se activa;
  - (b) las 10 líneas de "Error no controlado" son exactamente I-1 (6 × `POST /api/auth/login`, `POST /api/clases/:id/archivos`, `POST /api/clases/:id/archivos/:id/descarga`, `GET /api/clases/:id/publicaciones`, `GET /api/prueba/error-comun`);
  - (c) los 5 `P2028` son los permitidos, todos de `timeout`: `POST /api/auth/cambiar-contrasena`, `POST /api/auth/refrescar`, `POST /api/clases/:id/publicaciones/:id/comentarios` (los tres de `servicio-ocupado`), `POST /api/auth/login` y `POST /api/auth/restablecer` (`cuentas-r3`). **Control positivo cumplido** (los tres de `servicio-ocupado` presentes en las seis). **Regla transitoria de M-08:** 0 `P2028` de `maxWait` en `POST /api/auth/registro-maestro` en las 6 corridas (con la opción (i), cualquiera sería PA-07 (c)).
- Los `P2028` deliberados de `servicio-ocupado-ch-r1` no salen en el conteo (su app registra en nivel `error`); PR-CH-10a/10b llaman a `enTransaccion` y al adaptador directo, sin línea de log de petición.
- **R-1:** el caso de C-1 pasó de 10 s una vez (corrida 4: 12.2 s, con la suite a 95 s), dentro de su presupuesto de 30 s y por debajo de los 20 s que fijó el manager para revisarlo. PR-B05: de 3.1 a 5.0 s.
- Ninguna corrida cayó ni tuvo un rojo intermitente (incluidos `ritmo-03c-r1` con A-6 y `enlaces-03b-r2`): PA-12 no se activó.

### V-01 contra la tabla de la ronda 1
Comando: `git ls-files '*.ataque.test.ts' '*.ataque.test.tsx'` más los no rastreados, `sha256sum` de cada uno, ordenado por ruta, contra las 112 filas de la tabla de `reporte-tester.md` (sección "CHORE-02 — Ronda 1") → `diff` sin diferencias. No toqué ningún `*.ataque`.

### Archivos tocados en esta entrega, contra A-2 a A-5 y A-8 (i)
- `backend/src/middleware/guarda-de-rutas.ts` (A-2).
- `backend/src/adapters/db/cliente.ts` (A-3).
- `backend/src/adapters/db/enlaces-registro.ts` (A-8 (i), solo la constante y las dos llamadas).
- `backend/test/guarda-todas-las-rutas.integracion.test.ts`, `backend/test/higiene-de-pruebas.integracion.test.ts`, `backend/test/servicio-ocupado.integracion.test.ts` (los tres nuevos de "Cambios por capa").
- Ningún archivo fuera de esa lista; `package.json`, `vitest.config.ts`, `global-setup.ts` y `setup.ts` sin cambios nuevos.

### Hermanos
**T-01 (formas de esquivar `onRoute` desde una instancia o un plugin):**
| Hermano | ¿Aplica? | ¿Aplicado? |
|---|---|---|
| `setErrorHandler` (rehace el 401/403 de la cadena) | Sí | **Sí**, mismo bloqueo; PR-CH-09c |
| `setNotFoundHandler` anidado, con `fastify-plugin` o por asignación | Sí | **Sí**, cubierto por el bloqueo heredado (PR-CH-09b) |
| `app.route` / `app.all` / `HEAD`, método en arreglo | Ya cubiertos por `onRoute` | Sin cambio (PR-CH-05, `guarda-ch-r1`) |
| `addHook("onRequest" / "preParsing" / "preValidation")` global de un plugin | Podría responder antes de la cadena | **No aplicado**: es el "Límite: hooks de plugin" de `middleware/README.md` y la regla de ESLint M-14 lo prohíbe en `handlers/**` (ESLint está en "No se toca"); no hay hook global en `backend/src` |
| `setSchemaErrorFormatter`, `setReplySerializer`, `addHook("onSend")` | No saltan la autenticación; dan forma a una respuesta ya decidida | **No aplicado**; lo anoto como pendiente para la próxima ronda del tester |
| Símbolos privados de Fastify para recuperar la función original | Aceptado en "Pendientes" del plan | — |

**M-08 (otras transacciones que esperan una fila en cola):**
| Transacción | ¿Aplica `maxWait` de 10 s? | Motivo |
|---|---|---|
| `registrarMaestroConEnlace` | Sí, **aplicado** | ráfaga de registros del mismo enlace |
| `revocarEnlaceRegistro` | Sí, **aplicado** | misma fila y misma cola (FOR NO KEY UPDATE) |
| `crearComentario` (`FOR SHARE` / `FOR KEY SHARE`) | No | compatible entre comentarios: no se forma en cola |
| `invitarMaestrosEnLote` (bloqueo consultivo global) | No | solo el admin, sin ráfagas |
| Protocolo por usuario (`cambiarContrasenaPropia`, `rotarSesion`, `crearSesion`, `usarTokenYCambiarContrasena`) | No | una fila por cuenta, sin ráfagas de muchos clientes sobre la misma |
| Inscripciones, publicaciones, `tokens-cuenta`, `invitaciones` | No | ninguna serializa una ráfaga de muchos clientes sobre una misma fila |

### PARADAS evaluadas
PA-01 a PA-11: no se activaron (PA-01 sin cambios: misma red y regla de firewall; PA-05 y PA-06: ningún archivo fuera de lo autorizado; PA-07: limpia en las 6 corridas, con control positivo y regla transitoria). **PA-12: no se activó** (6 de 6 corridas en verde).

### Pendiente o fuera de alcance
- Textos T-1 a T-6, T-6 bis y T-5 bis, y `ESTADO.md`: del orquestador.
- Hooks globales `onSend` / `setReplySerializer` / `setSchemaErrorFormatter` en un plugin: sin bloqueo (arriba).
- DEPLOY: tamaño del pool y `connectionTimeoutMillis` (riesgo (b) de M-08), como dice el plan.

## CHORE-02 — Corrección de la ronda 2 (Enmienda 4)

Pasos 13d, 13e, 14, 15 y 16 completos (17 con esta sección). Fecha: 2026-10-03. Sin PARADAS activadas (PA-13 incluida). Sin commit. No toqué ningún `*.ataque`.

### Qué se hizo
- **13d (A-2, §E4-1 y §E4-2), `backend/src/middleware/guarda-de-rutas.ts`:**
  - **Sonda del `onSend` interno de `HEAD`:** `createRequire(import.meta.url)("fastify/lib/head-route.js").parseHeadOnSendHandlers(null)`, una vez por `registrarGuardaDeRutas`; si no devuelve una función, lanza "No se encontró el onSend interno de las rutas HEAD de Fastify". Devolvió una función (PA-13 no se activó).
  - **Clasificación cerrada de opciones de ruta** (tras la regla de `onRequest`/`preParsing`/`preValidation` y antes de la de los dos primeros segmentos): prohibidas con mensaje ``declara <opciones>, que <motivo> (AGENTS.md, regla 2)`` en tres grupos (rehacer la respuesta, validar o serializar, correr con la petición). El `onSend` interno de `HEAD` se descarta por identidad.
  - **Copia congelada:** si la ruta pasa, cada hook que el autor declaró como **arreglo** se sustituye por `Object.freeze([...copia])` y se revisa esa misma copia. Una función suelta no se sustituye (ver desviación 1).
  - **Bloqueo de la instancia:** después de registrar sus propios `onRoute` y `onRegister` (este último rechaza `register` con `logSerializers`), `addHook` se reemplaza por nombre (`onRequest`, `preParsing`, `preValidation`, `preHandler`, `preSerialization`, `onSend`, `onError`, `onRoute` lanzan; el resto llama al original con su `this`) y los nueve métodos de la tabla de §E4-2 se reemplazan por funciones que lanzan, todos con `Object.defineProperty` no escribible ni configurable. Mensajes exactos de la enmienda.
- **13e (A-10, §E4-3):** PR-CH-04c inserta un enlace de registro propio en `enlaces_registro` (PR-CH-13b); PR-B05 en `alumnos.integracion.test.ts` se reescribió con la comprobación del catálogo (`pg_indexes`) y el `EXPLAIN` sobre la tabla temporal `pr_b05_usuarios` con los dos índices y 20,000 estudiantes, sin `LIKE usuarios` ni inserciones en `usuarios` (PR-CH-14a).

### Pruebas requeridas → caso que las cubre
Archivo `G` = `backend/test/guarda-todas-las-rutas.integracion.test.ts`; `H` = `backend/test/higiene-de-pruebas.integracion.test.ts`.
| ID | Archivo y título exacto |
|---|---|
| PR-CH-11a | `G` › "guarda: opciones de ruta prohibidas (PR-CH-11a, T-02)" › `it.each` "la opción %s (%s) no arranca, con protegido() y con pertenencia, por route y por los atajos" (17 filas: `errorHandler`, `onSend` función y arreglo, `preSerialization` función y arreglo, `onError` función y arreglo, `schema` con `body`, `querystring`, `params`, `headers` y `response`, `validatorCompiler`, `serializerCompiler`, `schemaErrorFormatter`, `childLoggerFactory`, `logSerializers`; `body` solo con POST porque Fastify rechaza un `schema.body` en un GET antes de la guarda) y "onSend en un HEAD explícito tampoco arranca" |
| PR-CH-11b | `G` › "guarda: opciones de ruta permitidas (PR-CH-11b)" › `it.each` "%s arranca y sin token responde el 401 del envoltorio" (14 filas: `onResponse`, `onTimeout`, `onRequestAbort` función y arreglo, `config`, `constraints`, `bodyLimit`, `logLevel`, `exposeHeadRoute`, `prefixTrailingSlash`, `handlerTimeout`, `attachValidation`) |
| PR-CH-11c | `G` › "un GET protegido con exposeHeadRoute por defecto arranca y su HEAD sin token responde 401" |
| PR-CH-11d | `G` › "guarda: mutar después los arreglos que devolvió protegido() (PR-CH-11d, H-3)" › `it.each` "%s: sin token la ruta responde 401 sin ejecutar el handler" (vaciar `preHandler`; agregar un `preHandler` que responde; vaciar `preHandler` y agregar al arreglo de `onResponse`) |
| PR-CH-11e | `G` › "las rutas de la lista pública con onSend y errorHandler propios arrancan" |
| PR-CH-11f | `guarda-ch-r2.ataque.test.ts` (tres casos "…y %s propio: o no arranca, o sin token responde el 401 del envoltorio") y `nombres-guarda-r3.ataque.test.ts` (5 casos "una ruta protegida con %s como %s no arranca"): verdes sin cambiar los archivos |
| PR-CH-12a | `G` › "guarda: addHook bloqueado por nombre (PR-CH-12a, T-03)" › para cada uno de los 8 hooks: "en un plugin con prefijo /api → la API no arranca", "en un plugin sin prefijo → la API no arranca", "en un plugin anidado → la API no arranca", "en un plugin envuelto con fastify-plugin → la API no arranca" |
| PR-CH-12b | `G` › "guarda: los hooks que no tocan la respuesta siguen permitidos (PR-CH-12b)" › "addHook(%s) después de registrarMiddleware arranca y las rutas protegidas responden 401" (`onResponse`, `onTimeout`, `onRequestAbort`, `onReady`, `onListen`, `preClose`, `onClose`), "onReady, onRegister y onResponse corren de verdad" y "un nombre que Fastify no admite sigue dando el error de Fastify" |
| PR-CH-12c | `G` › "guarda: métodos de la instancia bloqueados (PR-CH-12c)" › "%s en un plugin con prefijo /api → la API no arranca" (los 9 métodos) y "register con logSerializers → la API no arranca" |
| PR-CH-12d | `G` › "guarda: lo permitido sigue funcionando (PR-CH-12d)" › "decorate, decorateRequest, decorateReply, addSchema, addHttpMethod, removeContentTypeParser, register con prefix y logLevel y rutas arrancan" y "con construirApp real arranca y GET /api/me sin token responde 401 con el formato de la API" (las pruebas de `auth-refresco.integracion` y la cookie de refresco, verdes en las 6 corridas) |
| PR-CH-12e | `H` › "PR-CH-12e: .addHook( y los métodos bloqueados en backend/src" › "solo app.ts y middleware/guarda-de-rutas.ts tienen .addHook( en una línea de código" y "ningún archivo de backend/src llama a los métodos de la instancia que la guarda bloquea" |
| PR-CH-12f | `guarda-ch-r2.ataque.test.ts` (los dos casos "setReplySerializer en un plugin…" y "addHook('onSend') en un plugin…"): verdes sin cambiar el archivo |
| PR-CH-12g | `H` › "PR-CH-12g: la fábrica de Fastify solo en app.ts" › "el control de la regla rechaza las formas que obtienen la fábrica", "el control de la regla acepta tipos, errorCodes y LogController, y no cuenta comentarios" y "solo app.ts obtiene la fábrica y solo la guarda importa rutas internas de Fastify" |
| PR-CH-13a | `cuentas-r1.ataque.test.ts` (del tester, paso 13c; presupuesto 60 s): verde en las 6 corridas |
| PR-CH-13b | `backend/test/servicio-ocupado.integracion.test.ts` › "PR-CH-04c: una transacción que pasa su timeout rechaza con SERVICIO_OCUPADO 503 y no escribe nada" (ahora sobre `enlaces_registro`) |
| PR-CH-13c | Verificación: duración del caso de C-1 en las 6 corridas (abajo): máximo 17.8 s, nunca más de 40 s |
| PR-CH-14a | `backend/test/alumnos.integracion.test.ts` › "PR-B05: con SET LOCAL enable_seqscan = off, EXPLAIN de la consulta con la forma de Prisma menciona usuarios_nombre_busqueda_idx" (mismo título; reescrito) |
| PR-CH-14b | Verificación: PR-B05 en verde en las 6 corridas y en 3 corridas aisladas; el diff no inserta en `usuarios` |

### Conteos
- `cd backend; npx vitest list --filesOnly | grep -c .` → **131** archivos.
- `cd backend; npx vitest list | grep -c .` → **1547** casos.
- Frontend (sin cambios): 104 archivos / 1396 pruebas.

### Verificación (comando exacto y última línea literal)
| Qué | Comando | Última línea |
|---|---|---|
| lint backend | `cd backend; npm run lint` | `> tsc -p tsconfig.json --noEmit && tsc -p tsconfig.test.json` (código 0) |
| tsc de pruebas | `cd backend; npx tsc -p tsconfig.test.json` | sin salida, código 0 |
| build backend | `cd backend; npm run build` | código 0 (`> tsc -p tsconfig.json`) |
| pasos 13d/13e | `cd backend; npx vitest run test/guarda-ch-r1.ataque.test.ts test/guarda-ch-r2.ataque.test.ts test/nombres-guarda-r3.ataque.test.ts test/guarda-todas-las-rutas.integracion.test.ts test/higiene-de-pruebas.integracion.test.ts` | `Test Files  5 passed (5)` |
| paso 13e, tres veces aisladas | `cd backend; npx vitest run test/servicio-ocupado.integracion.test.ts test/alumnos.integracion.test.ts` | las tres: `Test Files  2 passed (2)` · `Tests  38 passed (38)` (PR-B05: 249, 262 y 282 ms; PR-CH-04c: 5427, 5424 y 5428 ms) |
| test backend, paso 14 y 5 corridas del paso 15 | `cd backend; npm test -- --reporter=default --reporter=json --outputFile.json=<scratchpad>/e4-cN.json > <scratchpad>/e4-cN.txt 2>&1`, una tras otra, sin otra suite en marcha | las seis: `Test Files  131 passed (131)` y `Tests  1547 passed (1547)` |
| frontend test | `cd frontend; npm test` | `Test Files  104 passed (104)` · `Tests  1396 passed (1396)` · `Duration  138.38s` |
| frontend lint | `cd frontend; npm run lint` | `> tsc -b` (código 0) |
| raíz lint | `npm run lint` | código 0 (última línea de la salida, `> tsc -b`) |
| raíz build | `npm run build` | `✓ built in 1.78s` (código 0) |

### Las corridas (paso 14 = "14"; paso 15 = 1 a 5)
| Corrida | Duración | PR-B05 | Caso de C-1 | Caso de los 40 | `40P01` / deadlock / serialize / too many clients | `"Error no controlado"` | `"code":"P2028"` |
|---|---|---|---|---|---|---|---|
| 14 | 90.16 s | 1187 ms | 109 ms | 1344 ms | 0 / 0 / 0 / 0 | 10 | 5 |
| 1 | 93.15 s | 403 ms | 17771 ms | 2068 ms | 0 / 0 / 0 / 0 | 10 | 5 |
| 2 | 98.11 s | 1263 ms | 119 ms | 2118 ms | 0 / 0 / 0 / 0 | 10 | 5 |
| 3 | 97.90 s | 1154 ms | 274 ms | 2589 ms | 0 / 0 / 0 / 0 | 10 | 5 |
| 4 | 99.02 s | 1580 ms | 7991 ms | 1531 ms | 0 / 0 / 0 / 0 | 10 | 5 |
| 5 | 98.39 s | 631 ms | 103 ms | 2561 ms | 0 / 0 / 0 / 0 | 10 | 5 |

- **PA-07 en las 6 corridas, idéntica** (asociación por `pid` + `requestId`): (a) no se activa; (b) las 10 líneas de "Error no controlado" son exactamente I-1; (c) los 5 `P2028` son los permitidos, todos de `timeout` y todos en `warn`: `POST /api/auth/cambiar-contrasena`, `POST /api/auth/refrescar` y `POST /api/clases/:id/publicaciones/:id/comentarios` (los tres de `servicio-ocupado`), `POST /api/auth/login` y `POST /api/auth/restablecer` (`cuentas-r3`). **Control positivo cumplido** en las seis. **Regla transitoria de M-08:** 0 `P2028` de `maxWait` en `POST /api/auth/registro-maestro`.
- **PR-CH-13c:** el caso de C-1 pasó de 40 s en ninguna corrida (máximo 17.8 s en la corrida 1; mediana unos 0.1 a 8 s). PR-B05 ya no depende de la tabla `usuarios`: de 0.4 a 1.6 s.
- Ningún rojo ni intermitencia en ninguna corrida: PA-12 no se activó.

### V-01 contra la tabla del paso 13c (114)
Mismo comando que en las entregas anteriores (`git ls-files` más no rastreados, `sha256sum`, ordenado por ruta) contra las 114 filas de "CHORE-02 — Paso 13c" de `reporte-tester.md` → `diff` sin diferencias, al empezar y al terminar (`V01-13c-FINAL-IGUAL`). No toqué ningún `*.ataque`.

### Archivos tocados en esta entrega, contra A-2, A-3, A-8 (i), A-10 y "Cambios por capa"
- `backend/src/middleware/guarda-de-rutas.ts` (A-2).
- `backend/test/alumnos.integracion.test.ts` (A-10, solo PR-B05).
- `backend/test/servicio-ocupado.integracion.test.ts` (solo PR-CH-04c, "Cambios por capa").
- `backend/test/guarda-todas-las-rutas.integracion.test.ts` y `backend/test/higiene-de-pruebas.integracion.test.ts` (nuevos de "Cambios por capa": PR-CH-11 y 12).
- Ningún otro (en esta entrega no toqué `cliente.ts` ni `enlaces-registro.ts`: sus cambios son los de la entrega anterior).
- `git diff --stat -- backend/src/middleware/guarda-de-rutas.ts backend/test/alumnos.integracion.test.ts`: `2 files changed, 268 insertions(+), 41 deletions(-)` (guarda 253 líneas; alumnos 56). `git diff --stat` del repositorio completo (contra `HEAD`, acumulado del encargo, sin los archivos nuevos): `47 files changed, 878 insertions(+), 328 deletions(-)`.

### Hermanos
**§E4-1 (cada opción de ruta):**
| Opción | Qué hice |
|---|---|
| `errorHandler`, `onSend` (función y arreglo), `preSerialization`, `onError` | Prohibidas, grupo "puede rehacer la respuesta de protegido()"; 11a |
| `schema` (cualquier parte), `validatorCompiler`, `serializerCompiler`, `schemaErrorFormatter` | Prohibidas, grupo "valida o serializa fuera de protegido()"; 11a |
| `childLoggerFactory`, `logSerializers` | Prohibidas, grupo "corre con la petición antes de protegido()"; 11a |
| `onRequest`, `preParsing`, `preValidation` | Ya prohibidas (T-12), mensaje sin cambio |
| `preHandler` | Permitida con la cadena primero (regla vigente) |
| `onResponse`, `onTimeout`, `onRequestAbort` | Permitidas; 11b |
| `method`, `url`, `path`, `handler`, `config`, `constraints`, `bodyLimit`, `handlerTimeout`, `logLevel`, `exposeHeadRoute`, `prefixTrailingSlash`, `attachValidation` | Permitidas; 11b (excepto `method`, `url`, `path` y `handler`, que usan todas las pruebas) |
| `onSend` interno de `HEAD` automático | Único `onSend` aceptado, por identidad; 11c |
| Arreglos de hooks que el autor conserva | Copia congelada (solo arreglos); 11d |

**§E4-2 (tabla de la instancia):**
| Método o grupo | Qué hice |
|---|---|
| `setNotFoundHandler`, `setErrorHandler` | Bloqueados (ya, §E3-1; mensaje sin cambio) |
| `setReplySerializer`, `setSerializerCompiler` | Bloqueados: "puede rehacer el cuerpo de la respuesta de protegido()" |
| `setValidatorCompiler`, `setSchemaController`, `setSchemaErrorFormatter` | Bloqueados: "valida fuera de protegido()" |
| `setGenReqId`, `setChildLoggerFactory`, `addContentTypeParser`, `addConstraintStrategy` | Bloqueados: "corre con la petición antes de protegido()" |
| `addHook` | Por nombre: bloqueados `onRequest`, `preParsing`, `preValidation`, `preHandler`, `preSerialization`, `onSend`, `onError`, `onRoute`; permitidos `onResponse`, `onTimeout`, `onRequestAbort`, `onReady`, `onListen`, `preClose`, `onClose` y `onRegister` (los dos últimos usados por `app.ts` y la guarda) |
| `register` con `logSerializers` | Rechazado en el `onRegister` de la guarda; `register` con `prefix` y `logLevel`, permitido |
| `get`, `post`, `put`, `patch`, `delete`, `head`, `options`, `trace`, `query`, `all`, `route` | Permitidos: pasan por `onRoute` |
| `register`, `after`, `ready`, `listen`, `close`, `onClose`, `inject` | Permitidos (ciclo de vida) |
| `decorate`, `decorateRequest`, `decorateReply`, `getDecorator`, `has*Decorator` | Permitidos: Fastify rechaza reemplazar lo existente (H-9); 12d |
| `addSchema`, `getSchema`, `getSchemas`, `addHttpMethod`, `hasRoute`, `findRoute`, `print*`, `hasPlugin`, `hasContentTypeParser`, `getDefaultJsonParser`, `defaultTextParser`, `removeContentTypeParser`, `removeAllContentTypeParsers`, `hasConstraintStrategy`, `withTypeProvider`, `addresses`, `log`, `server`, `initialConfig` | Permitidos (consultas o configuración que no responde); probé con `addSchema`, `addHttpMethod` y `removeContentTypeParser` (12d). `server` es el límite H-10 (§E4-4) |
| Préstamo de métodos de otra instancia (H-8) | Estático (PR-CH-12g) |
| `app.ts` | Sin cambios: `manejoDeErrores` y `@fastify/cookie` se registran antes de la guarda; `onClose` después (permitido) |

### PARADAS evaluadas
PA-01 a PA-12: no se activaron (PA-01: misma red y regla de firewall). **PA-13: no se activó**: cada bloqueo hace fallar el arranque (PR-CH-11a y 12a a 12c, con el mensaje exacto); `construirApp` real arranca (PR-CH-12d y las 6 corridas); ninguna prueba fuera de las adaptadas por A-13 y A-14 se rompió; `parseHeadOnSendHandlers(null)` devuelve una función.

### Desviaciones
1. **Copia congelada solo para arreglos.** El plan dice sustituir cada hook presente por un arreglo congelado. Al hacerlo con una función suelta, Fastify (`lib/route.js:315`) la valida como arreglo y rechaza un `onRequestAbort` asíncrono sin argumento (`FST_ERR_HOOK_INVALID_ASYNC_HANDLER`), con lo que fallaba un caso de `nombres-guarda-r3.ataque` que antes pasaba. Una función suelta es inmutable por identidad, así que solo sustituyo los arreglos (los únicos mutables); H-3 queda igual de cubierto (PR-CH-11d).
2. Todo lo demás, según la Enmienda 4.

### Pendiente o fuera de alcance
- Los textos T-6 ter y los de `ESTADO.md` son del orquestador.
- Límite H-10 y símbolos privados de Fastify (§E4-4): sin bloqueo; a la revisión de código.

## CHORE-02 — Corrección de la ronda 3 (T-06)

Fecha: 2026-10-03. Cambia solo `backend/test/higiene-de-pruebas.integracion.test.ts` (PR-CH-12g). Ningún código de producción, ningún `*.ataque`, sin commit. Sin PARADAS.

### La regla nueva
Fuera de `backend/src/app.ts`, ninguna referencia textual al paquete `fastify` como módulo, por cualquier vía: el especificador `"fastify"` o `"fastify/…"` (el paquete no declara `exports`, así que cualquier subruta se resuelve), con comillas dobles, simples o invertidas, en `import`, `import()`, `export … from`, `import "fastify"`, `require(…)` y `createRequire(…)(…)`.
- **Qué se quita antes de buscar (formas permitidas, solo del especificador exacto `"fastify"`):**
  - `import type …` y `export type … from` (los tipos quedan **permitidos**: `middleware/` y `handlers/` los usan; no dan la fábrica, que es un valor);
  - `declare module "fastify"` (la ampliación de tipos de `middleware/tipos.ts`);
  - `import { … }` cuyos nombres sean todos `type …`, `errorCodes` o `LogController` (también con `as`).
- **Qué queda y cuenta:** todo lo demás con ese especificador, incluidos `import Fastify, { type X }`, `import { fastify }`, `import * as`, `export { default } from "fastify"`, `import type … from "fastify/fastify.js"` (los tipos solo se permiten del especificador exacto) y las cuatro formas de T-06.
- **No coinciden:** `@fastify/*`, `fastify-plugin`, `"../fastify-ayudas.js"` y comentarios (`//`).
- **Única referencia permitida fuera de `app.ts`:** la sonda de la guarda, `createRequire(...)("fastify/lib/head-route.js")`; el caso con los archivos reales exige exactamente esa.
- **Límite que sigue vigente:** una referencia construida en ejecución (`import(`${nombre}`)`) no se ve; es el límite de toda regla estática (§E4-4).

### Hallazgo mientras la endurecía (falso positivo de la propia regla, no un archivo con la fábrica)
La primera versión marcó `src/middleware/tipos.ts` por su `declare module "fastify"` (ampliación de tipos de la petición): no obtiene la fábrica. Lo traté como un falso positivo de la regla, que el encargo pide evitar, y lo agregué a las formas permitidas con un caso de control. No cambié ningún archivo de `backend/src`. Ningún otro archivo real de `backend/src` fue marcado: solo `app.ts` y la sonda de la guarda.

### Mapa PR-CH-12g → título exacto (todos en `backend/test/higiene-de-pruebas.integracion.test.ts`, `describe` "PR-CH-12g: la fábrica de Fastify solo en app.ts")
- "el control de la regla rechaza toda vía de obtener la fábrica o el paquete"
- "el control de la regla acepta tipos, errorCodes y LogController, y no cuenta comentarios ni otros paquetes"
- "solo app.ts obtiene la fábrica y la única otra referencia es la sonda de la guarda a fastify/lib/head-route.js"

### Casos de control
- **Rechazados (18, cada uno con su vía y especificador esperados):** `import Fastify from "fastify"` (comillas dobles y simples); `import Fastify, { type FastifyInstance } from "fastify"`; `import { fastify } from "fastify"`; `import { errorCodes, fastify as f } from "fastify"`; `import * as f from "fastify"`; `import Fastify from "fastify/fastify.js"` (T-06); `import type Fastify from "fastify/fastify.js"`; `export { default } from "fastify"` (T-06); `export * from "fastify"`; `import "fastify"`; `require("fastify")` y `require('fastify/fastify.js')`; `createRequire(import.meta.url)("fastify")` (T-06); `import("fastify")` con comillas dobles, simples e invertidas (T-06) y `import("fastify/fastify.js")`.
- **Aceptados (16):** `import type { FastifyInstance } from "fastify"` (dobles, simples y en varias líneas); `import type Fastify from "fastify"`; `export type { FastifyInstance } from "fastify"`; `declare module "fastify" {…}`; `import { errorCodes } from "fastify"`; `import { LogController, type FastifyInstance } from "fastify"`; `import { type FastifyInstance, errorCodes as codigos } from "fastify"`; dos comentarios con `import` y `require`; `@fastify/cookie` (import y require); `fastify-plugin` (import e `import()`); `"../fastify-ayudas.js"`.

### Verificación (comando exacto y última línea literal)
| Qué | Comando | Última línea |
|---|---|---|
| lint | `cd backend; npm run lint` | `> tsc -p tsconfig.json --noEmit && tsc -p tsconfig.test.json` (código 0) |
| tsc de pruebas | `cd backend; npx tsc -p tsconfig.test.json` | sin salida, código 0 |
| el archivo, tres veces | `cd backend; npx vitest run test/higiene-de-pruebas.integracion.test.ts` | las tres: `Test Files  1 passed (1)` · `Tests  12 passed (12)` |
| corrida completa (una) | `cd backend; npm test -- --reporter=default --reporter=json --outputFile.json=<scratchpad>/r3-c1.json > <scratchpad>/r3-c1.txt 2>&1` | `Test Files  132 passed (132)` · `Tests  1621 passed (1621)` · `Duration  167.02s` |
| conteos | `cd backend; npx vitest list --filesOnly \| grep -c .` y `npx vitest list \| grep -c .` | 132 archivos / 1621 casos |

- **PA-07 de esa corrida:** `40P01`, `deadlock detected`, `could not serialize` y `too many clients`: 0; `"Error no controlado"`: 10 (exactamente I-1); `"code":"P2028"`: 5, todos de `timeout` y los permitidos (`cambiar-contrasena`, `refrescar` y `comentarios` de `servicio-ocupado`; `login` y `restablecer` de `cuentas-r3`), con el control positivo cumplido; 0 `P2028` de `maxWait` en `registro-maestro`. Caso de C-1: 263 ms; PR-B05: 1493 ms; caso de los 40: 2696 ms. (La suite tardó 167 s: la máquina estaba más cargada que en las corridas anteriores; sin rojos.)
- **V-01:** las 115 `*.ataque` (las 114 del paso 13c más `guarda-ch-r3.ataque.test.ts`) coinciden con la tabla de "CHORE-02 — Ronda 3" de `reporte-tester.md` (`diff` sin diferencias).

### Diff del archivo
`git diff --no-index --stat <copia anterior> backend/test/higiene-de-pruebas.integracion.test.ts`: `1 file changed, 114 insertions(+), 60 deletions(-)`. Solo cambia el bloque de PR-CH-12g (desde su banner hasta el final del archivo): se reemplazan `IMPORTACIONES_DE_FASTIFY`, `usosDeLaFabricaDeFastify` y `RUTAS_INTERNAS_DE_FASTIFY` por `referenciasAFastify` y sus formas permitidas, y los tres casos del `describe`. PR-CH-12e, PR-CH-01c, 03a, 04h y 09e no cambian.

## CHORE-02 — Corrección de la ronda 4 (T-07)

Fecha: 2026-10-03. Cambia solo `backend/test/higiene-de-pruebas.integracion.test.ts` (PR-CH-12g). Ningún código de producción, ningún `*.ataque`, sin commit. Sin PARADAS: la regla endurecida solo marca `app.ts` y la sonda de la guarda en `backend/src`.

### La regla endurecida
- **(a) T-07 a, `import type from "fastify"`:** las importaciones de solo tipos permitidas exigen ahora una de estas formas, siempre del especificador exacto `"fastify"`: `import type { … }`, `import type * as X`, `import type X from` con `X` distinto de `type` y de `from`, `export type { … } from` y `export type * [as X] from`. `import type from "fastify"` y `import type, { … } from "fastify"` (importación por defecto con valor llamada `type`) ya no se descartan: se marcan.
- **(b) T-07 b, extensiones:** el recorrido (`archivosDeCodigoEn`) lee `.ts`, `.mts`, `.cts`, `.js`, `.mjs` y `.cjs` dentro de `backend/src`, sin las pruebas (`*.test.<ext>`) ni `adapters/db/generated/`.
- **(c) T-07 c, rutas al paquete:** además de `"fastify"` y `"fastify/…"`, se marca cualquier especificador que contenga `node_modules/fastify`, `/fastify/fastify.js` o `/fastify/lib/…`, rutas absolutas (también con `\`) y `file:` que apunten a un directorio `fastify`. `@fastify/*`, `fastify-plugin`, `../fastify-ayudas.js`, `./fastify/otro.js` y `../lib/fastify.js` no coinciden.
- **O-11, mayúsculas:** el especificador general se busca con la bandera `i` (`"FASTIFY"`, `NODE_MODULES/Fastify`). Las formas permitidas de tipos siguen exigiendo la grafía exacta `"fastify"`, así que un `import type … from "FASTIFY"` se marca (más estricto, a propósito).
- **O-12, límite documentado en el comentario de la regla:** un especificador del paquete armado en ejecución (concatenación, plantilla con expresión o una variable pasada a `import()`, `require()` o `createRequire(…)()`) no se puede cubrir con una regla de texto; queda a la revisión de código, junto con los símbolos privados de Fastify (§E4-4). **Para el texto T-6 ter:** "un especificador del paquete `fastify` armado en ejecución".
- Se mantiene: referencias permitidas fuera de `app.ts` solo la sonda `createRequire(...)("fastify/lib/head-route.js")` de `guarda-de-rutas.ts`; tipos permitidos (`middleware/` y `handlers/` los usan); `declare module "fastify"`; `import { … }` con solo `type …`, `errorCodes` o `LogController`.

### Mapa PR-CH-12g → título exacto (`describe` "PR-CH-12g: la fábrica de Fastify solo en app.ts", mismo archivo)
- "el control de la regla rechaza toda vía de obtener la fábrica o el paquete" (ahora 25 textos: los 18 anteriores más `import type from "fastify"` también con salto de línea, `import type, { type X } from`, `import type, { X } from`, `import type from from`, `import Fastify from "FASTIFY"` y `require("Fastify")`)
- "el control de la regla rechaza las rutas al archivo del paquete (T-07 c)" (13 textos: `../../node_modules/fastify/fastify.js`, `node_modules/fastify/fastify.js`, ruta absoluta con y sin `fastify.js`, `file:///…/node_modules/fastify/fastify.js` y con `/`, `../fastify/fastify.js`, `require` de `/abs/node_modules/fastify/lib/head-route.js` y de `/abs/x/fastify/lib/head-route.js`, `createRequire(…)("../node_modules/fastify/fastify.js")`, `../../NODE_MODULES/Fastify/fastify.js`, ruta de Windows con `\\`, y ``import(`/abs/node_modules/fastify/fastify.js`)``)
- "el control de la regla acepta tipos, errorCodes y LogController, y no cuenta comentarios ni otros paquetes" (nuevos: `import type FastifyDefecto from`, `import type * as Tipos from`, `export type * from`, `export type * as Tipos from`, `declare module "fastify"`, `../node_modules/@fastify/cookie/index.js`, `../node_modules/fastify-plugin/plugin.js`, `./fastify/otro.js`, `../lib/fastify.js`)
- "el recorrido lee .ts, .mts, .cts, .js, .mjs y .cjs, no las pruebas, y rechaza un .mts de ejemplo (T-07 b)" (directorio temporal con un archivo de cada extensión, una prueba, un `.md` y un `generated/`; los seis de código se leen y se marcan, y el `.mts` está entre ellos)
- "solo app.ts obtiene la fábrica y la única otra referencia es la sonda de la guarda a fastify/lib/head-route.js" (sobre los archivos reales; las rutas son relativas a `backend/src`)

### Verificación (comando exacto y última línea literal)
| Qué | Comando | Última línea |
|---|---|---|
| lint | `cd backend; npm run lint` | `> tsc -p tsconfig.json --noEmit && tsc -p tsconfig.test.json` (código 0) |
| el archivo, tres veces | `cd backend; npx vitest run test/higiene-de-pruebas.integracion.test.ts` | las tres: `Test Files  1 passed (1)` · `Tests  14 passed (14)` |
| corrida completa (una) | `cd backend; npm test -- --reporter=default --reporter=json --outputFile.json=<scratchpad>/r4-c1.json > <scratchpad>/r4-c1.txt 2>&1` | `Test Files  132 passed (132)` · `Tests  1623 passed (1623)` · `Duration  109.07s` |
| conteos | `cd backend; npx vitest list --filesOnly \| grep -c .` y `npx vitest list \| grep -c .` | 132 archivos / 1623 casos (dos casos más que antes: el de las rutas y el del recorrido) |

- **PA-07 de esa corrida:** `40P01`, `deadlock detected`, `could not serialize` y `too many clients`: 0; `"Error no controlado"`: 10 (exactamente I-1); `"code":"P2028"`: 5, todos de `timeout` y los permitidos (`cambiar-contrasena`, `refrescar` y `comentarios` de `servicio-ocupado`; `login` y `restablecer` de `cuentas-r3`), con el control positivo cumplido; 0 `P2028` de `maxWait` en `registro-maestro`. Caso de C-1: 1217 ms; PR-B05: 1083 ms; caso de los 40: 2443 ms.
- **V-01:** las 115 `*.ataque` coinciden con la tabla de "CHORE-02 — Ronda 3" de `reporte-tester.md` (`diff` sin diferencias).

### Diff del archivo
`git diff --no-index --stat <copia anterior> backend/test/higiene-de-pruebas.integracion.test.ts`: `1 file changed, 137 insertions(+), 27 deletions(-)`. Solo cambian los imports de `node:fs` (más `mkdirSync`, `mkdtempSync`, `rmSync`, `writeFileSync`) y `node:os` (`tmpdir`), y el bloque de PR-CH-12g (comentario, expresiones, `archivosDeCodigoEn`, `referenciasAFastify` y sus cinco casos). PR-CH-01c, 03a, 04h, 09e y 12e no cambian.
