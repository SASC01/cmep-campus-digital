> **Nota de transcripción (orquestador, 2026-10-03).** La herramienta de escritura rechazó al tester crear este archivo ("Subagents should return findings as text"). El tester entregó el reporte como texto en su respuesta final y el orquestador lo transcribió aquí tal cual, sin cambiar contenido (regla de respaldo de `AGENTS.md`, "Transcripción con cotejo"). Cotejo mecánico del orquestador: `git diff --stat -- backend shared frontend` da los mismos 14 archivos y cifras (302 inserciones, 88 borrados) que el reporte; la tabla de SHA-256 se tomó del archivo `tabla-02a-r0.md` que dejó el tester en el scratchpad y sus 115 hashes coinciden uno por uno con los calculados sobre los `*.ataque` rastreados, con 14 filas marcadas "cambia". Registro en `aprobacion.md`.

# Reporte del Tester — CLASES-02 · clases administradas, maestros por clase, autoría y barra lateral

## CLASES-02a — Ronda 0

**Datos de partida.**
- Fecha: 2026-10-03. Rama `feat/clases-02`, base `<R>` = `e4396a0`.
- Plan con SHA-256 `8fe2c9ca42eccceda228afb275e46e54ac75094e742466655e53106d52a29599`, el que aprobó el humano según `aprobacion.md`.
- Trabajo bajo la autorización A-3. La ronda 0 no cuenta en el tope de 3 y no lleva veredicto ROTO o RESISTE. Su fin es alinear las `*.ataque` existentes con el comportamiento nuevo de 02a, para que el programador implemente contra ellas.

**Estado:** ronda 0 completa; no se activó ninguna PARADA.

**Verificación propia.**
- Lint del backend: rojo esperado. Son 10 errores de `tsc -p tsconfig.test.json`, todos por nombres que 02a aún no crea; ESLint y Prettier pasan.
- Test del backend: `Tests  26 failed | 1597 passed (1623)`. Los 26 rojos son exactamente los casos reescritos que esperan al programador.
- Frontend: no se corrió, por instrucción del orquestador. Solo pasé `prettier --check` sobre los archivos que toqué.

### Precondiciones
- **PA-02 (no se activó):**
  - La rama es `feat/clases-02`, y `git cat-file -e 'e4396a0^{commit}'` termina con código 0.
  - Antes de tocar nada, `git status --porcelain -- backend shared frontend` y `git diff --stat e4396a0 -- backend shared frontend` salieron vacíos.
  - Fuera de los paquetes solo había cambios en `docs/ESTADO.md`, en `docs/trabajo/CHORE-02-…/aprobacion.md` y en esta carpeta, que están excluidos de la verificación.
  - El SHA-256 de `plan.md` coincide con el aprobado.
- **V-01:** comparé por programa con `diff` las 115 `*.ataque` de `git ls-files` contra la tabla de la ronda 6 de CHORE-02 (`docs/trabajo/CHORE-02-pruebas-y-espera-en-cadena/reporte-tester.md`, línea 1624). Resultado: **115 de 115 iguales**, y ninguna `*.ataque` sin rastrear.
- **PA-01 (no se activó):**
  - La regla "Campus: bloquear entrada a Docker en redes publicas" está `Enabled True`, `Inbound`, `Block`, `Public`.
  - La red es `IZZI-F281-5G`, categoría `Public`: la misma de CHORE-02, cubierta por la regla.
- **Docker:** respondió (servidor 28.5.1).
- **Procesos ajenos:** estaban corriendo `npm run dev` de la API, el worker con `tsx` y Vite, todos del humano.
  - No los arranqué ni los toqué. No ocupan ningún puerto que la suite necesite.
  - No había otra corrida de Vitest. Su posible efecto en los tiempos está en O-02.

### Cambios C-n (backend)
Cada caso reescrito lleva un comentario `CLASES-02a ronda 0 (C-n)`. Las líneas son las del archivo nuevo.

| Archivo | Líneas | C-n | Antes | Después |
|---|---|---|---|---|
| `backend/test/clases-r1.ataque.test.ts` | 7, 91-102 | C-1, A-5 | Importaba `crearClase` | Importa `crearClaseAdministrada`. Ayudas nuevas: `tokenAdmin()` y `maestrosDeLaClase(claseId)`, que lee `maestros_de_clase` con `$queryRaw` parametrizado, en el orden de S-05 |
| `clases-r1` | 116-145 | C-1, C-2 | El dueño mandaba CRLF a `POST /api/clases` y a `PUT /api/clases/:claseId` | El admin manda lo mismo a `POST /api/admin/clases` (con `maestroIds: [dueno.id]`) y a `PUT /api/admin/clases/:claseId`. Mismas aserciones de LF |
| `clases-r1` | 149-189 | C-1, C-2 | El dueño creaba y editaba | El admin crea con el dueño asignado y edita. Las cuatro respuestas (crear, detalle, editar e `impartidas`) siguen sin claves prohibidas ni el valor del código |
| `clases-r1` | 214-215 | C-2 | `PUT /api/clases/:claseId` con token de estudiante | `PUT /api/admin/clases/:claseId` con token de estudiante. Solo entra al recorrido de fugas y su estado no se afirma; el caso sigue en verde |
| `clases-r1` | 269-275 | C-3 | HEAD y GET del detalle como admin: `403 ROL_NO_PERMITIDO` | `200`, y HEAD sigue sin cuerpo |
| `clases-r1` | 428-475 | C-1, C-2 | Campos extra en `POST /api/clases` y `PUT /api/clases/:claseId` | Los mismos campos extra en las rutas del admin, más un `maestroIds` extra al editar. `clases.maestro_id` y `maestros_de_clase` quedan exactamente en `[dueno.id]` |
| `clases-r1` | 513-534 | C-2 | El maestro ajeno recibía `403 SIN_ACCESO_A_LA_CLASE` también al editar | Regenerar y ver el código: igual que antes. Editar va a `PUT /api/admin/clases/:id` y responde `403 ROL_NO_PERMITIDO` (paso 5). La fila no cambia |
| `clases-r1` | 588-621 | C-1, A-5 | `crearClase` con un maestro inexistente: P2003, sin reintento (`llamadas = 1`) y nunca `<500` | `crearClaseAdministrada({ maestroIds: [fantasma], nombre })` devuelve `null` sin lanzar, sin pedir código (`llamadas = 0`) y sin escribir fila (§D-2A4, punto 5) |
| `clases-r1` | 623-645 | C-1, A-5 | `crearClase` con `\u0000`: `400 VALIDACION`, `llamadas = 1`, sin fila | `crearClaseAdministrada` con el mismo texto da lo mismo, y además deja 0 filas en `maestros_de_clase` para ese maestro |
| `clases-r1` | 646-666 | C-3 (§D-2A6, A-10) | `regenerarCodigo({ claseId, maestroId }, gen)` | `regenerarCodigo(claseId, gen)`, como en "Cambios por capa". El reintento que se protege no cambia |
| `clases-r1` | 671-704 | C-1 | 1,000 `POST /api/clases` del maestro; los códigos se leían por `clases.maestro_id` | 1,000 `POST /api/admin/clases` del admin con `maestroIds: [dueno.id]`. Los códigos se leen con un `JOIN` a `maestros_de_clase`, así que las 1,000 deben tener su asignación |
| `backend/test/clases-r2.ataque.test.ts` | 7, 77-95 | C-1, A-5 | Importaba `crearClase` | Importa `crearClaseAdministrada`. Ayudas nuevas: `tokenAdmin()` y `clasesAsignadasA(maestroId)` |
| `clases-r2` | 107-191 | C-1, C-2 | Los 5 casos de T-01 iban contra las rutas del dueño | Van contra `POST /api/admin/clases` (con `maestroIds`) y `PUT /api/admin/clases/:id`, con token del admin. "No crea fila" se comprueba también en `maestros_de_clase`. No toqué las líneas con U+2028, U+2029 y U+202E: hay 5 invisibles antes y 5 después |
| `clases-r2` | 194-228 | C-1, A-5 | `crearClase` con P2003 y con 22021 | `crearClaseAdministrada`: el maestro inexistente da `null` con `llamadas = 0`; el 22021 da `400` con `llamadas = 1` |
| `clases-r2` | 232-247 | C-1 | El dueño creaba con campos extra | El admin crea con `maestroIds: [dueno.id]` y los mismos campos extra |
| `backend/test/clases-r3.ataque.test.ts` | 156-198 | C-2 | Edición concurrente: el ajeno editaba por `PUT /api/clases/:id` (403 SIN_ACCESO) mientras el dueño editaba | Ahora edita el admin mientras el dueño regenera. El ajeno edita por `PUT /api/admin/clases/:id`, también con el id en mayúsculas, y recibe `403 ROL_NO_PERMITIDO`; al regenerar recibe `403 SIN_ACCESO_A_LA_CLASE`. Quedan el último nombre y el último código legítimos, y el `maestro_id` del dueño |
| `clases-r3` | 255-319 | C-1, C-2, C-3 | Recorrido de fugas con las rutas retiradas; el código salía solo al dueño (2 respuestas) | Las rutas retiradas se cambian por las del admin. El código sale al dueño **y al admin** en `/codigo`, con `no-store` (4 respuestas, P-04 a), y a nadie más |
| `backend/test/muro-c-r1.ataque.test.ts` | 115-124, 726-761 | C-1, C-2 | Nombre sin caracteres visibles contra `POST /api/clases` y `PUT` con token del maestro | Contra las rutas del admin, con token del admin (ayuda `tokenDelAdmin()`) y `maestroIds: [e.maestro.id]`. Se exige el mismo mensaje |
| `muro-c-r1` | 769-803 | C-1 | Emojis y otros alfabetos en el nombre, creados por `POST /api/clases` | Creados por `POST /api/admin/clases` del admin, con `maestroIds` |
| `backend/test/alumnos-b-r1.ataque.test.ts` | 243-253, 276-281, 311-329 | C-3, C-6 | El admin recibía `403 ROL_NO_PERMITIDO` en las 8 rutas de b | En `personas` (GET y HEAD) sigue `403 ROL_NO_PERMITIDO`; en el roster y el buscador (GET y HEAD) recibe el mismo código que el dueño. Su alta y su baja salen del recorrido de "lo negado no escribe nada" y se prueban después del dueño: `200` y `204`, con los movimientos `[alta dueño, baja dueño, alta admin, baja admin]` por `actorId` (P-08 a) |
| `alumnos-b-r1` | 1073-1097 | C-6 | `f.maestroId` | `f.actorId` |
| `backend/test/alumnos-b-r2.ataque.test.ts` | 209-210 | C-6 | `fila.maestroId` | `fila.actorId` |
| `backend/test/sesiones-y-cadena.ataque.test.ts` | 492-593 | C-4 | Lista cerrada de 56 rutas | 62 rutas: salen `POST /api/clases` y `PUT /api/clases/:claseId`, y entran las 8 de V-06. Comprobé el orden con `sort()`. La protección no se debilita y el título suma CLASES-02a |

**Lo que no se tocó o no requirió cambio:**
- `alumnos-b-r1:1106` y `:1110-1111` quedan idénticos, ahora en las líneas 1134 y 1138-1139, como manda A-3.
- **C-5:** ninguna `*.ataque` crea clases directamente en la base; todas usan `crearClaseDePrueba`, que cambia en PR-2A09. Sin cambios.
- **C-3 en `clases-r4:194`:** son `inscritas` e `impartidas`, que no se abren al admin. Sin cambio.
- **C-7 en el backend:** ninguna `*.ataque` del backend compara la forma completa de una clase. Sin cambio.

### Cambios C-7 (frontend, 02a)
Cada doble suma `maestros: [<el mismo maestro>]`, con su comentario de C-7.
- **Por qué es seguro hoy:** con el esquema actual, zod descarta la clave nueva; ningún doble está tipado y ninguna prueba compara el objeto completo.
- **Archivos:**
  - `frontend/src/app/muro-recuperar-c-r3.ataque.test.tsx:96-103`
  - `frontend/src/app/muro-recuperar-c-r4.ataque.test.tsx:93-100`
  - `frontend/src/app/muro-rutas-c-r1.ataque.test.tsx:48-49`
  - `frontend/src/features/clases/clases-r1.ataque.test.tsx:45,51`
  - `clases-r2.ataque.test.tsx:33,39,119-122`: en el caso del nombre largo se sustituyen `maestro` y `maestros` con el mismo valor.
  - `clases-r3.ataque.test.tsx:43,49,136-144`: el detalle y un elemento de `inscritas`.
  - `clases-r4.ataque.test.tsx:230,236`
- **No tocados:** los dobles de "Personas" (`alumnos-b-r1:372`, `alumnos-b-r4:114`, `alumnos-b-r5:113` y la rama `/personas` de `muro-recuperar-c-r3/r4`) son de C-11, que llega en 02b.
- **Sin verificar en ejecución:** solo `npx prettier --check` desde `frontend/`. Quedan para la corrida del frontend del paso 10 y para el manager.

### `git diff --stat` (paquetes)
```
 backend/test/alumnos-b-r1.ataque.test.ts           |  34 +++++-
 backend/test/alumnos-b-r2.ataque.test.ts           |   3 +-
 backend/test/clases-r1.ataque.test.ts              | 126 ++++++++++++++-------
 backend/test/clases-r2.ataque.test.ts              |  85 ++++++++++----
 backend/test/clases-r3.ataque.test.ts              |  45 ++++++--
 backend/test/muro-c-r1.ataque.test.ts              |  29 ++++-
 backend/test/sesiones-y-cadena.ataque.test.ts      |  25 +++-
 .../src/app/muro-recuperar-c-r3.ataque.test.tsx    |   9 +-
 .../src/app/muro-recuperar-c-r4.ataque.test.tsx    |   9 +-
 frontend/src/app/muro-rutas-c-r1.ataque.test.tsx   |   2 +
 .../src/features/clases/clases-r1.ataque.test.tsx  |   2 +
 .../src/features/clases/clases-r2.ataque.test.tsx  |   7 +-
 .../src/features/clases/clases-r3.ataque.test.tsx  |  12 +-
 .../src/features/clases/clases-r4.ataque.test.tsx  |   2 +
 14 files changed, 302 insertions(+), 88 deletions(-)
```
- `git status --porcelain -- backend shared frontend` lista exactamente estos 14 archivos.
- No hay archivos nuevos, ni código de producción, ni pruebas normales.
- Revisé por programa las líneas `+` del diff: no agregué ningún carácter invisible.
- Prettier corrió solo sobre estos 14 archivos y desde su paquete, en modo `--check`.

### Inventario de C-n por subentrega
- **02a (aplicados ahora):** C-1, C-2, C-3, C-4 y C-6 en el backend; C-7 en el frontend. C-5 no hizo falta.
- **02b (backend):**
  - C-8 y C-10: `muro-c-r1`, `muro-c-r2`, `logs-muro-c-r1`, `logs-muro-c-r2`.
  - C-9: `archivos-d-r1:878`, donde el admin solicita y descarga con `403`, y `muro-c-r*`.
  - C-11: `alumnos-b-r*`, en los casos de "personas sin correo", y `logs-*`.
  - En el frontend, en 02b: dobles de "Personas" de C-11 (`alumnos-b-r1`, `alumnos-b-r4`, `alumnos-b-r5`, `muro-recuperar-c-r3`, `muro-recuperar-c-r4`) y dobles de publicación y comentario de C-10.
- **02c (frontend), candidatos según la búsqueda:**
  - C-12: `rutas-clases-r1`, `clases-r1`, `clases-r3`, `clases-r4` (incluida la línea 90, `POST /api/clases` y `PUT`), `muro-c-r1`, `styles/clases-r1`, `inicio-sin-datos-r2`.
  - C-13: `muro-c-r1`, `muro-c-r2`, `muro-c-r3`, `muro-rutas-c-r1`, `archivos-d-r*`, `styles/clases-r1`.
  - C-14: `marco-r1`, `components/layout/estatico-r1`.
  - C-15: `inicio-sin-datos-r2`; `pie-r1` a `pie-r3` tienen `vi.mock` de `data` y hay que revisarlos.
  - C-19: `components/ui/badge-03b-r1:44-45`.
  - C-20: `styles/clases-r1:126-212`, con 39 en total.
  - C-22: `components/layout/estatico-r1:131-147`.
- **02d (frontend):**
  - C-16: `marco-r1`, `router.ataque`, `contexto-r1`, `sesion-r2`, `cache-03a-r1`, `registro-maestro-03b-r1`, y cualquier doble que responda `/me` a cualquier ruta.
  - C-17: `alumnos-b-r*`.
  - C-18: `muro-c-r*`, `archivos-d-r*`, `muro-rutas-c-r1`.
  - C-20: total 40, más `lista-de-clases.tsx`.
  - C-21: `styles/clases-r1:233-242`.

### I-1 (PA-07 b), lista cerrada de esta corrida
La atribución se hizo por la última "incoming request" con el mismo `pid` y `requestId`, más el mensaje y la pila del error.

| # | Ruta | Llamada | Origen |
|---|---|---|---|
| 1-5 | `POST /api/auth/login` | "fallo simulado de la base en la búsqueda" (doble, `control.fallarBusqueda`) | `backend/test/intentos-r2.ataque.test.ts` |
| 6 | `POST /api/auth/login` | "fallo simulado de la base al crear la sesión" (`control.fallarSesion`) | `intentos-r2.ataque.test.ts` |
| 7 | `POST /api/clases/:claseId/archivos` | `ZodError` `subida.url` en `handlers/archivos.ts:61` | `backend/test/archivos-d-r2.ataque.test.ts` › T-39 (almacén malicioso) |
| 8 | `POST /api/clases/:claseId/archivos/:archivoId/descarga` | `ZodError` `url` en `handlers/archivos.ts:90` | `archivos-d-r2` › T-39 |
| 9 | `GET /api/clases/:claseId/publicaciones` | `ZodError` `publicaciones.0.adjuntos.0.vistaPrevia.url` en `handlers/clases/muro.ts:140` | `archivos-d-r2` › T-39 |
| 10 | `GET /api/prueba/error-comun` | `Error: boom` en `test/salud.integracion.test.ts:29` | `backend/test/salud.integracion.test.ts` |

Coincide con el I-1 de la ronda 6 de CHORE-02. Corrección de atribución: los 3 `ZodError` salen de `archivos-d-r2`, porque `logs-archivos-d-r3` captura sus logs en memoria y no los escribe en la salida.

### I-2
**Ninguna.** Busqué en las pruebas normales `printRoutes`, `"/api/clases"`, `crearClase(`, `movimientoInscripcion`, `maestroId`, `relacionConClase`, `DatosDePertenencia`, `pg_indexes`, `pg_constraint`, `migrations`, `regenerarCodigo`, `leerCodigo`, `editarClase`, `requireMembership`, `requireOwnership`, `evaluarPertenencia` y `clase.create(`.
- **Las afectadas ya están en la lista de PA-16 para 02a:** `core/clases/pertenencia.test.ts`, `middleware/index.test.ts`, `alumnos.integracion`, `alumnos-autorizacion`, `clases.integracion`, `clases-autorizacion`, `movimientos-inscripcion`, `guarda-todas-las-rutas`, `middleware-orden` y `ayudas-clases.ts`.
- **Las demás no cambian en 02a:**
  - `muro-autorizacion`, `archivos-autorizacion`, `muro.integracion`, `archivos.integracion` y `servicio-ocupado.integracion` solo usan `crearClaseDePrueba` con `maestroId`. Su `403` del admin es del muro y los archivos, que son de 02b.
  - `guarda-clase.integracion` solo cita el texto de la guarda.
  - Las listas de `higiene-de-pruebas` no cambian si se sigue el plan (`enTransaccion`, sin `addHook`).

### Conteos
- `cd backend; npx vitest list > <scratchpad>/list-02a-r0.txt`, con código 0: **1623 casos**.
- `npx vitest list --filesOnly`: **132 archivos**, de los cuales **59** son `*.ataque` del backend, con 745 casos.
- La ronda 0 no agrega casos: solo reescribe.
- Hay 115 `*.ataque` en total, 56 de ellas en el frontend.

### Corrida final completa del backend
**Comando:**
```
cd backend; npm test -- --reporter=default --reporter=json --outputFile.json=<scratchpad>/clases02a-r0-1.json > <scratchpad>/clases02a-r0-1.txt 2>&1
```
Una sola corrida, de 18:49:04Z a 18:52:14Z, con código 1.

**Últimas líneas de Vitest:**
```
 Test Files  7 failed | 125 passed (132)
      Tests  26 failed | 1597 passed (1623)
   Start at  12:49:51
   Duration  142.43s (transform 11.36s, setup 4.93s, import 170.07s, tests 698.02s, environment 40ms)
```
La última línea del archivo es el pie de error de npm (`npm error command C:\WINDOWS\system32\cmd.exe /d /s /c vitest run …`). Hubo 0 `timed out` y 0 `maxWait` ("Unable to start a transaction"); PA-12 no se activó.

**Rojos esperados (26), todos casos reescritos que esperan a 02a.** Fuera de esta lista no hay ningún otro rojo, ni de `*.ataque` ni de pruebas normales.
- **`clases-r1` (11):**
  - "POST /admin/clases con CRLF…" y "PUT /admin/clases/:claseId con CRLF…": 404.
  - "el dueño recibe 200…": 404.
  - "HEAD sigue la misma cadena…": detalle del admin con 403.
  - "POST /admin/clases ignora maestroId…" y "PUT /admin/clases/:claseId ignora…": 404.
  - "un maestro no regenera ni edita…": 404 en lugar de 403.
  - "un maestro inexistente devuelve null…" y "un texto que PostgreSQL rechaza (22021)…": `crearClaseAdministrada` no es una función.
  - "regenerarCodigo: si los dos intentos chocan…": firma vieja.
  - "1,000 POST /admin/clases…": 404.
- **`clases-r2` (7):** los 5 de "T-01, límites de la normalización", "reintento: maestro inexistente…" y "HEAD, paginación, campos extra y fugas…".
- **`clases-r3` (2):** "con edición del admin y regeneración del dueño concurrentes…" y "dueño, estudiante, restringido y admin…" (el admin recibe 403 en `/codigo`).
- **`muro-c-r1` (2):** "nombre de clase en POST y PUT: sin visibles…" y "emojis compuestos y otros alfabetos…".
- **`alumnos-b-r1` (2):** "cada ruta y método responde exactamente lo de la tabla…" (4 discrepancias: el admin recibe 403 en el roster y el buscador) y "el mismo alumno agregado a la vez a dos clases…" (`actorId` indefinido).
- **`alumnos-b-r2` (1):** "altas y bajas cruzadas de tres alumnos…".
- **`sesiones-y-cadena` (1):** "bajo /api solo existen las rutas de … CLASES-d y CLASES-02a…": 56 en lugar de 62.

**Lint del backend.** Comando: `cd backend; npm run lint > <scratchpad>/lint-02a-r0.txt`, con código 2.
- ESLint pasa, Prettier dice "All matched files use Prettier code style!" y el `tsc` de `src` pasa.
- `tsc -p tsconfig.test.json` da 10 errores, todos esperados:
  - TS2339 `actorId`: 3 en `alumnos-b-r1` y 1 en `alumnos-b-r2`.
  - TS2305 `crearClaseAdministrada`: 1 en `clases-r1` y 1 en `clases-r2`.
  - TS7006 `valor`: 1 en `clases-r1` y 1 en `clases-r2`, consecuencia del anterior.
  - TS2345 por la firma de `regenerarCodigo`: 2 en `clases-r1`.

### PA-07
Contado en `clases02a-r0-1.txt`:

| Término | Cuenta |
|---|---|
| `40P01` | 0 |
| `deadlock detected` | 0 |
| `could not serialize` | 0 |
| `too many clients` | 0 |
| `"Error no controlado"` | 10, exactamente I-1 |
| `"code":"P2028"` | 5 |

Los 5 `P2028` son de `timeout`, nivel 40, `SERVICIO_OCUPADO`:
- `POST /api/auth/cambiar-contrasena` › `tx.sesion.findFirst()` (`adapters/db/usuarios.ts:293`): `servicio-ocupado.integracion`.
- `POST /api/auth/refrescar` › `tx.sesion.updateMany()` (`sesiones.ts:72`): `servicio-ocupado.integracion`.
- `POST /api/clases/:claseId/publicaciones/:publicacionId/comentarios` › `prisma.$queryRawUnsafe()`: `servicio-ocupado.integracion`.
- `POST /api/auth/login` › `tx.sesion.create()` (`sesiones.ts:39`): `cuentas-r3`.
- `POST /api/auth/restablecer` › `tx.tokenCuenta.updateMany()` (`tokens-cuenta.ts:116`): `cuentas-r3`.

Son exactamente los permitidos. El **control positivo** está presente: aparecen los tres de `servicio-ocupado`, cada uno con su ruta, y también los dos de `cuentas-r3`. **PA-07 limpia.**

### Observaciones (no son hallazgos; los decide el manager)
- **O-01 (caso fuera del inventario explícito):** `clases-r1` › "regenerarCodigo: si los dos intentos chocan…" llama al adaptador con la firma vieja. Ningún C-n lo nombra en "Dónde buscar", pero lo contradicen §D-2A6, A-10 y la firma `regenerarCodigo(claseId, generarCodigo)` de "Cambios por capa". Lo reescribí citando C-3. Si el manager prefiere otro C-n, el cambio es el mismo.
- **O-02 (tiempos):** `guarda-clase-r1` › "control: app.addHook(...) se rechaza" tardó 47,890 ms, y `guarda-clase-r2` › "control: app.addHook, app['addHook'] y app?.addHook se rechazan" tardó 47,749 ms. En la ronda 6 de CHORE-02 eran unos 4,370 ms; el límite es de 60 s.
  - Ninguno cayó, así que PA-12 no aplica.
  - Están al 80 % de su límite. Una causa probable es la carga de los procesos de desarrollo del humano, que seguían encendidos.
  - Si el programador ve un tiempo límite ahí, es PA-12 y no un rojo nuevo de 02a.
- **O-03 (contratos que fijan las pruebas reescritas):**
  - `crearClaseAdministrada({ maestroIds, nombre }, generarCodigo)`: `descripcion` opcional (las pruebas no la pasan, como `crearClase`). Devuelve `null` sin llamar a `generarCodigo` si algún maestro no es válido.
  - `regenerarCodigo(claseId, generarCodigo)`.
  - `MovimientoInscripcion.actorId`.
  - La tabla `maestros_de_clase(clase_id, maestro_id, creado_en)`.
  - Todo sale de §D-2A1, §D-2A4 y "Cambios por capa". Si la implementación difiere, el rojo es del programador (PA-05).

### Archivos
- **En el repositorio:** las 14 `*.ataque` de la tabla, marcadas con "cambia".
- **En el scratchpad** (`C:/Users/Carlos/AppData/Local/Temp/claude/c--Users-Carlos-Documents-Proyecto-PlataformaEducativa/0674b697-54d2-4eb4-ad9a-7234f1426d63/scratchpad/`):
  - `tabla-02a-r0.md` (la tabla)
  - `clases02a-r0-1.txt` y `clases02a-r0-1.json` (la corrida)
  - `lint-02a-r0.txt`
  - `list-02a-r0.txt` y `list-02a-r0-files.txt`
  - `base.txt` (la tabla de la ronda 6 de CHORE-02 extraída para V-01)

### Tabla de SHA-256 de las 115 `*.ataque` después de la ronda 0 de 02a (base de V-01 del programador; cambian 14, marcadas)
| SHA-256 | Archivo | Cambio |
|---|---|---|
| `BCCE2CAE771F97957D8691BEF7FFF4EC42412DAAEABF726AEB0AFC59F6F25671` | `backend/src/config/correo.ataque.test.ts` |  |
| `DCB78D222544E8DC4FBECE59468F555B04ABE971B70016E9BB17FCAE3E958580` | `backend/src/config/env.ataque.test.ts` |  |
| `71E7F049447D2D1ECEDD897C55EA0B6D31221753F0A7E7473C7AC6E8667F0A95` | `backend/src/config/logger.ataque.test.ts` |  |
| `91F620C1A27778EEBC2BED5EEC1BC9B0E3FE1199B32ED00F9DD910011D6A1805` | `backend/src/core/clases/codigo-r1.ataque.test.ts` |  |
| `262691F5786AD63B2393D0BA5FF97538F6DACF43343BED019AD23C12A07D8686` | `backend/src/core/clases/codigo-r2.ataque.test.ts` |  |
| `E769CBFCC3A83A64B51C6437F80684640A7C928AD6B8C5C1671FDFF005D7B734` | `backend/src/workers/ritmo-03c-r1.ataque.test.ts` |  |
| `388AD0E585639B8C3E0E0A6657FB42C1B9CB83DB721C4863C4FA19E0BE42EC85` | `backend/test/admin-unico.ataque.test.ts` |  |
| `D971CEB589BBD94E337D0B3A533EDD81DFE49C3E63AA5D1539875D8990955F16` | `backend/test/alumnos-b-r1.ataque.test.ts` | cambia: ronda 0 de 02a |
| `00346D471355ABC7971B921649E7192B8987FE27912C00CB7E41AEF2065369E9` | `backend/test/alumnos-b-r2.ataque.test.ts` | cambia: ronda 0 de 02a |
| `FC11AB4B914D4A88612953F82DB354E2B9CEA9BEF86E24321EF7E031F3AC3837` | `backend/test/alumnos-b-r3.ataque.test.ts` |  |
| `441A766A94E7D9B26807790402E06ED94D4CC378D8F6ECF0BCCC3259C7FF55FB` | `backend/test/api-real.ataque.test.ts` |  |
| `79BB87AE390140BD5F5E5BA00E1A32A8E41937DE2A98D59E83335C34A8FB94BB` | `backend/test/archivos-d-r1.ataque.test.ts` |  |
| `1637EB447CD12AC5BDDDC7634980DBC10A25CBAD5DE01BF6C09F40ED930FF1A9` | `backend/test/archivos-d-r2.ataque.test.ts` |  |
| `42BB7BF3086230C6EDC65AB73976AC8A801956336561AADBEE65CC3B40EB8612` | `backend/test/arquitectura-cuentas-r1.ataque.test.ts` |  |
| `38ADB0984744A0810287711F57BA0498287D0BC96344B8948BA1C490CA807716` | `backend/test/arranque-r1.ataque.test.ts` |  |
| `2C83D82D10BDD9B7A969768774D75B18B7A71A594BBAAC5FAE36A0E134D2336C` | `backend/test/auth-login.ataque.test.ts` |  |
| `73D3A2AE708A0EF676547A8094115B1419423057378387269BC3EADB34C7724E` | `backend/test/auth-registro.ataque.test.ts` |  |
| `95BBA9BAC44366AD5A361E93DD2F278CB0A1CC889FA479049ACC7B45A9A5E71B` | `backend/test/clases-r1.ataque.test.ts` | cambia: ronda 0 de 02a |
| `A87817D56C236C0BA3597214CAC23B10483BBC28AE44800C592ED5CE2EF97F38` | `backend/test/clases-r2.ataque.test.ts` | cambia: ronda 0 de 02a |
| `72DE7D8AF3D3F772ABC19DB065F6E418F6EB76CE78D87FE6EBB51335FC99825A` | `backend/test/clases-r3.ataque.test.ts` | cambia: ronda 0 de 02a |
| `BE97C4E48AC9551BED1D01552E90AB8CDF085CF928AE6C8C3D81809E35F7CE62` | `backend/test/clases-r4.ataque.test.ts` |  |
| `530546B4D70A2B9AD36F98F37E2AF45480E81A1101EE3516D15426F78350BF82` | `backend/test/cuentas-03a-r1.ataque.test.ts` |  |
| `6303DDC170545F616C66773C3F5475CB3BE1FEA9347D8059354D6ADE8D676C16` | `backend/test/cuentas-r1.ataque.test.ts` |  |
| `3A4E81C111B8EEB7DF065804AA85062FA3FC607F0147149B71AC21C14E7818D9` | `backend/test/cuentas-r2.ataque.test.ts` |  |
| `F54F79F7B2A83E95FE440053CCAF15CB3EBB01CE5DFD4C6655E22159A5FD7E6B` | `backend/test/cuentas-r3.ataque.test.ts` |  |
| `D7A9DA854CE8AB8AD8D2437DB2E8C2A642A777EA3261A6B038DA28BE022DF848` | `backend/test/enlaces-03b-r1.ataque.test.ts` |  |
| `DC1B7EE7EA58966F5DB33CCB4581885A9669DEA2263954AE46D17A83E1EF6EAF` | `backend/test/enlaces-03b-r2.ataque.test.ts` |  |
| `B051B1986496E35E3E306C4C6BC306A763542BCA4B350574D0C02E2C484DEB35` | `backend/test/enlaces-ch-r2.ataque.test.ts` |  |
| `D28CC4DE621A680E6B54B2BFF889700300D558EC7849717584518D2F03EC8CAE` | `backend/test/entorno-ch-r1.ataque.test.ts` |  |
| `BA1AC9B17CC9BF747522BD4EC8B87DF436008482E643B18EEA8E9A8C041C59B3` | `backend/test/formada-ch-r1.ataque.test.ts` |  |
| `5F4133F949D2F337A8F63B75CF82CB77114DB7812D67C1960105F5000C31A326` | `backend/test/guarda-ch-r1.ataque.test.ts` |  |
| `7A7DAC6D87EDF81059FCFF9C07471AAF49D690EC159BE4B9FD4AA32B0909A215` | `backend/test/guarda-ch-r2.ataque.test.ts` |  |
| `610EE44E5D0BCEA46EB4E3645F9ADF1998A76947A25AF7E3F8248EA3A633DF79` | `backend/test/guarda-ch-r3.ataque.test.ts` |  |
| `E5D149F3AC52B726E1FE08908249706341330F88EAA6674B9A9AC67B98B1E864` | `backend/test/guarda-clase-r1.ataque.test.ts` |  |
| `C979D2C9C420A2177FA6EBDDB78EB2CE84D5F043B94270F690916A6FC75D6F8F` | `backend/test/guarda-clase-r2.ataque.test.ts` |  |
| `20982E2B98F1B162146A211923F3D5EC19D4E170C4AA3A5BFC6F82C3B6173AAD` | `backend/test/guarda-r2.ataque.test.ts` |  |
| `A8B79D5AD98270BE3747F493865708A78BB73ADD08D832584DB4464C3582777A` | `backend/test/intentos-r2.ataque.test.ts` |  |
| `2619B44EEA3370494C95AC128FCFD9E3FFC20D1581A19F549BF371F603A11D7D` | `backend/test/invitacion-flujo-03a-r2.ataque.test.ts` |  |
| `704155928183AEC193AE7E157B86B3E9361D2B63C7A47BE1ED859605FAB4FFA6` | `backend/test/invitacion-masiva-03c-r1.ataque.test.ts` |  |
| `DD9B7454E8786BF0B833D265900CCAECF595808CEBC8E9A77C9AEF15298A1038` | `backend/test/invitacion-masiva-03c-r2.ataque.test.ts` |  |
| `BD8B303C434EFEC0785E0691D31D6F6E87DBF3305F50FA27CCE0F78CBB251E3A` | `backend/test/logs-03a-r1.ataque.test.ts` |  |
| `B58D5D013658433FE5839634E2DB5A31B8D2B8F69587BC36958752D3CD33BBF7` | `backend/test/logs-03b-r1.ataque.test.ts` |  |
| `0E4ABF3BC5D92FA0C380805453190703862567930DD74B9E7FCC1809564D181F` | `backend/test/logs-03c-r1.ataque.test.ts` |  |
| `1E775A19682F3A5995D7C035BCC810A36BF50C22045B6FFBFC5A98B821255DB0` | `backend/test/logs-archivos-d-r1.ataque.test.ts` |  |
| `E9CE866D511E3EE6029015B74E20B4D342A60BE99B3AAC97E86F00283A3C77F1` | `backend/test/logs-archivos-d-r3.ataque.test.ts` |  |
| `E008935B107752D203F6423B2F1C9E0F5A4339F0A77154746BF262CECB90351A` | `backend/test/logs-cuentas-r1.ataque.test.ts` |  |
| `690E30ED39111C0A074FC159015967CD9F0FDC24D9A340E6A0D7BE4B980A9D45` | `backend/test/logs-muro-c-r1.ataque.test.ts` |  |
| `0809C60700E26183E7771B4B1A40B05CBF554C2ED7929190CF4D89A52722E551` | `backend/test/logs-muro-c-r2.ataque.test.ts` |  |
| `5AF3909E4B7CA485E78979567872EA78BF41E6D679B9EC2C761EAA0B250DF689` | `backend/test/logs-r2.ataque.test.ts` |  |
| `595912F6A0F94C3C8F555C83B13B9A2197067D689C16118C4214363D79822D9E` | `backend/test/muro-c-r1.ataque.test.ts` | cambia: ronda 0 de 02a |
| `7825CFC9B484DF740FA0E9562A195D1BBCAF4CAF72EA55FA847B5394AB96C125` | `backend/test/muro-c-r2.ataque.test.ts` |  |
| `8B733B86FC6D54ECE008389A59793FAE4EC4A65146EB37215E900E50A5337D46` | `backend/test/nombres-guarda-r3.ataque.test.ts` |  |
| `00A6EB6F7CCD7D8790C356BEFCC96DDFDA6EACCE0BE53DE255CFE3626D8F2ADB` | `backend/test/nombres-tokens-r2.ataque.test.ts` |  |
| `80B5A848F69B429E7DADEC86C07BEC1D3E3EED8A042EFBA41CE912DED39E7BAB` | `backend/test/nowait-ch-r1.ataque.test.ts` |  |
| `6F2ABC2CEFD77D74CD1E3ABBDCE9C41BB53D00BD4D8E5BA7E496C4441C2697E5` | `backend/test/servicio-ocupado-ch-r1.ataque.test.ts` |  |
| `3B2D94ABCCBEDD6FB53CF666AAD06ADF431A0DB9A09264F05D8ADF6963CBD0AE` | `backend/test/sesiones-y-cadena.ataque.test.ts` | cambia: ronda 0 de 02a |
| `F09E9A0038C47D1A2223376A0AF260BAF573F0C45BF770201C48C9E30296F04B` | `backend/test/worker-03c-r1.ataque.test.ts` |  |
| `9F60F9D65D52D2021A1EB04E9F01D3CC68F22744C845BF93D6621AA4FE9713A8` | `backend/test/worker-r1.ataque.test.ts` |  |
| `77D11BD85F202A9EEC92A363DF82E63FB9A784CA9D368D49F62E61C1A2AA967B` | `backend/test/worker-r2.ataque.test.ts` |  |
| `B89EDE0F6AED45DFCB5E64C8909A822156CE43FD80948E72419CDCE9D4541A87` | `frontend/src/app/cache-03a-r1.ataque.test.tsx` |  |
| `E85743C0FBB8E476874A2C67334342D8D69D14153579FC1E4CCE0AE6E2B29616` | `frontend/src/app/contexto-r1.ataque.test.tsx` |  |
| `BC2BE5541006887E2A5A4A89B33046180F607D54474B0F96A73D615AFBCAC385` | `frontend/src/app/contrasena-r1.ataque.test.tsx` |  |
| `F38BCACB716D8A39ACDB3535A95603CD0D8AB02572CA57A7DF5268B01CEB6EAC` | `frontend/src/app/contrasena-r2.ataque.test.tsx` |  |
| `68FB5D092C0C8ECFCF282477EF023AAAE26F6B869656E05109DC3EFA276D842A` | `frontend/src/app/cuentas-r1.ataque.test.tsx` |  |
| `41930017715D3D6869DC7ACEFD75DE8EC3684F1F035B845ABDF8EC0F6B734DEE` | `frontend/src/app/cuentas-r2.ataque.test.tsx` |  |
| `1506C27E5F7418B5E087FD30F8809645A2FC3E2761C7249DE78F02E24AA6C7A5` | `frontend/src/app/en-espera-r1.ataque.test.tsx` |  |
| `DB48DAD405C27062621A44D3744C84CC5903892A51E5A8DF18F41383CB9C88A3` | `frontend/src/app/errores-r1.ataque.test.tsx` |  |
| `F95321E604E20B533EBF2DB3C1C6C66BA2F2D87A48F075415B766551F6EE30F4` | `frontend/src/app/fondo-r1.ataque.test.tsx` |  |
| `76B256114128377B6A793CAB882D031FB10785076728F8058E0FF1D93A7E9F64` | `frontend/src/app/marco-r1.ataque.test.tsx` |  |
| `6598E82FA02328D90C02D9720366C3FFC635FDA652972ABA137A000867083780` | `frontend/src/app/muro-recuperar-c-r3.ataque.test.tsx` | cambia: ronda 0 de 02a |
| `653159DF824AB98C758A96B89CE460BE9E3A674BB88EFFC0E9F10F62E6A218C2` | `frontend/src/app/muro-recuperar-c-r4.ataque.test.tsx` | cambia: ronda 0 de 02a |
| `2F8056A770397C1601647277944555A48AFC4B9A2BABEB75E5898F0CC92562BB` | `frontend/src/app/muro-rutas-c-r1.ataque.test.tsx` | cambia: ronda 0 de 02a |
| `3267D093574AA792529D8E9311DEBFC651F519EB33F8EF9C369EB2C4C6180389` | `frontend/src/app/registro-maestro-03b-r1.ataque.test.tsx` |  |
| `053E867A904AFA3C09EEF92CA2E03E929D9F9C93F714040856F40C7418721BBE` | `frontend/src/app/router.ataque.test.tsx` |  |
| `ADF9E1CFD151E030C6B275A47A5C41F68F46BAEDF880A989676151DCACE5A1B3` | `frontend/src/app/rutas-clases-r1.ataque.test.tsx` |  |
| `F090CBD8E8C9B0AF52D4FC19547B07E9B6413F5414CC4B10862F01E29818DDDC` | `frontend/src/app/sesion-r2.ataque.test.tsx` |  |
| `B16D9B4376FA719F6DA04745FF701F24FA20159B1AA7904C6C9424D2475EA871` | `frontend/src/components/layout/estatico-r1.ataque.test.ts` |  |
| `0AAA18CD70465293B6FCA6CC051B8E4AC360A838D02FEDE848C35376C3D0066C` | `frontend/src/components/layout/pie-r1.ataque.test.tsx` |  |
| `00A707429AF6B5326F9A96DEF6382823CF4A6A092AAC7E7BD7CBCB8DC9AA1D21` | `frontend/src/components/layout/pie-r2.ataque.test.tsx` |  |
| `472E1F46D0C899496AA334909B02988962AAB07B9BD29A8D7B8AF3987FAC6C76` | `frontend/src/components/layout/pie-r3.ataque.test.tsx` |  |
| `385123D69F8C6411027C5B7DB2E52E62146C0DB54CFFDA3C27BD6B450FE2AF27` | `frontend/src/components/ui/badge-03b-r1.ataque.test.ts` |  |
| `86ADAA9A093A987DAFD97E279E600211CBDF6CEF97879D16FA2D8A9D2846F8B5` | `frontend/src/features/admin/cuentas-r1.ataque.test.tsx` |  |
| `B948E9359FD3981E08B850540027F536F345A3F48D7C0749BA0C16C2C1DF1184` | `frontend/src/features/admin/cuentas-r2.ataque.test.tsx` |  |
| `72BF9AF4CE8F52A114897E038CEFB0947841A37F74074F4C5F8DEC68A71B654A` | `frontend/src/features/admin/cuentas-r3.ataque.test.tsx` |  |
| `942DF3015424AED56E83661993BA015E871CD6BE8E797920D47E8CBF0C56EAC4` | `frontend/src/features/admin/cuentas-r4.ataque.test.tsx` |  |
| `3BD26E7E3BF019D462DB4837861ED22017BBB9E9A6276720BF0DEA6C2B5B0998` | `frontend/src/features/admin/en-espera-r1.ataque.test.tsx` |  |
| `8219C864E7BDC1315E6A0F0FF1CD6F54E4710CEBDCEB8E316F4E53AACC0CFF35` | `frontend/src/features/admin/foco-r1.ataque.test.tsx` |  |
| `30F45BBA30D9348EC1587B42E84CA370274E1BF0AF0F310B8A6BBD79FA982669` | `frontend/src/features/admin/maestros-03b-r1.ataque.test.tsx` |  |
| `D477A809E55E603D3EF6C02CA43B21372B75D0947FA303F1539D48BDF32841F8` | `frontend/src/features/admin/maestros-03c-r1.ataque.test.tsx` |  |
| `3CEDA51DB8F67F40C26615FBC4CD7D082035B00F38713C6CA4C7DB58E47926C8` | `frontend/src/features/auth/enlace-r1.ataque.test.tsx` |  |
| `1F5D1147637C09DAA6FDF1384E4395EDD69DFDAB84AAE5D602A362DABD3295BD` | `frontend/src/features/auth/enlace-r2.ataque.test.tsx` |  |
| `991B115524D8DADE8D6EA2C51FB753DC8832EE410DB2161A0CE761D011CFCA4A` | `frontend/src/features/auth/invitacion-r1.ataque.test.tsx` |  |
| `C3692E9EC300696E9EB10470BE5239055CF3326D0FCD1607BD82663210AF1B1F` | `frontend/src/features/clases/alumnos-b-r1.ataque.test.tsx` |  |
| `55DC274ECA96DA4360848B88F9F2A839AC815031490AB57FF38DE074512D632C` | `frontend/src/features/clases/alumnos-b-r2.ataque.test.tsx` |  |
| `371518E4309F14201A92D29F9436A97A19801B506D45114964FBCFE3F5CD4183` | `frontend/src/features/clases/alumnos-b-r3.ataque.test.tsx` |  |
| `BE0E7656BA70C2F73B3096885BCE5B2B73EEDF1B05BCE120216DE5E3EA3A8B09` | `frontend/src/features/clases/alumnos-b-r4.ataque.test.tsx` |  |
| `309B9877D03AF86CD6748E033C3E0137CF4C67A1C08E3873E54DD465CAC4F2D6` | `frontend/src/features/clases/alumnos-b-r5.ataque.test.tsx` |  |
| `10FB06D3B60E38071FC06D16E3D6341EC0C42AC37CC84812406B207EED994F54` | `frontend/src/features/clases/archivos-d-r1.ataque.test.tsx` |  |
| `729DCB70477DEC084EA4C9CB9D7C2CAA5DA42BC425753480EAA3E5BC1E6D71FB` | `frontend/src/features/clases/archivos-d-r2.ataque.test.tsx` |  |
| `D16FB15D963CAC9AA335381691C851259AFD85035DDD90D1AE1E510F9BE8D1D2` | `frontend/src/features/clases/archivos-d-r3.ataque.test.tsx` |  |
| `89C9522AB1947038E66F398E8E5C40A1A9BF4E872A16C34877C6432AC38402E5` | `frontend/src/features/clases/clases-r1.ataque.test.tsx` | cambia: ronda 0 de 02a |
| `4ED2A5582C3DF7A29C62F9E1D458141AB104DD13A16B3C496634EB092948AA71` | `frontend/src/features/clases/clases-r2.ataque.test.tsx` | cambia: ronda 0 de 02a |
| `146C9B3080709DAEA23B0500B0014C64DF1D5C2412510014CF79AA05E8CD84FC` | `frontend/src/features/clases/clases-r3.ataque.test.tsx` | cambia: ronda 0 de 02a |
| `50BF79FE51B26A896008E6D39B39DA7510EBEB82EAA5EA8BEF76748E11FDCC96` | `frontend/src/features/clases/clases-r4.ataque.test.tsx` | cambia: ronda 0 de 02a |
| `CDD1ED8890859AE3E884822FC7074852A2173105114745D83FE9A15C1C47C626` | `frontend/src/features/clases/estatico-r1.ataque.test.ts` |  |
| `7C434A0E54E70B12D4B2A3DE22FFB4DBF5F28A1CFBD2290C22E8A2B59EDF0E16` | `frontend/src/features/clases/inicio-sin-datos-r2.ataque.test.tsx` |  |
| `72A2CD4AB876FFA94D01FB45B2A555C32B2E40336FB65A12A87DEAC82CFAEB1B` | `frontend/src/features/clases/muro-c-r1.ataque.test.tsx` |  |
| `4E842F547E0156AFC753295CCC6F50A326939FC12B8537969818D3FB01569659` | `frontend/src/features/clases/muro-c-r2.ataque.test.tsx` |  |
| `2035462B2659CEB37646C85A4EA35CCFA7A7C31E7013104704018620262BE297` | `frontend/src/features/clases/muro-c-r3.ataque.test.tsx` |  |
| `C71CBA65DD284D7AF11CBC812B6BCF75BAA373939EDB8318E731858D9C50173F` | `frontend/src/lib/format-d-r1.ataque.test.ts` |  |
| `89DBBB70D5DC404C3D74DB5391D10855C8CB1D6B4C643B6147B3CE6FFB2637AF` | `frontend/src/lib/format-d-r2.ataque.test.ts` |  |
| `BFA7DED62F7A1402590D438A1CC51060A63FA019AD47D3EB5740E43383064A2A` | `frontend/src/lib/format-d-r3.ataque.test.ts` |  |
| `10C730348D18FF8DAE7B3623751D31122AA58560B564AD191717FA1938A6F8CE` | `frontend/src/services/apiClient.ataque.test.ts` |  |
| `C1F4B160D3BE549340F771F3E225721E3776F7A53EA2A653A5A91A2E297BEE93` | `frontend/src/styles/clases-r1.ataque.test.ts` |  |
| `B8085BCBBC7F4B6276BF3A87FB7BA0BC887953A8C6CE372354A7F3F1B5037582` | `frontend/src/styles/tokens-r1.ataque.test.ts` |  |

## CLASES-02a — Ronda 1

# Reporte del Tester — CLASES-02a · clases administradas (backend) — Ronda 1
Veredicto: **ROTO** (un hallazgo de severidad baja)
Verificación propia: lint `cd backend; npm run lint`, código 0 (última línea `tsc -p tsconfig.json --noEmit && tsc -p tsconfig.test.json`) · test: 3 corridas completas seguidas, las tres `Tests  1 failed | 1697 passed (1698)`; el único rojo es T-01

Fecha: 2026-10-03. Rama `feat/clases-02`. Plan con las Enmiendas 1 y 2 (`2a4cf22f…`). Lo atacado es la implementación de 02a de `resumen-programador.md`, aceptada por el manager en `revision.md`.

### Precondiciones
- **V-01:** las 115 `*.ataque` rastreadas coinciden con la tabla de la ronda 0 de 02a (`tabla-02a-r0.md`, comparada con `diff`): 115 de 115 (`V01-OK`). Ninguna `*.ataque` sin rastrear salvo mis 4 nuevas.
- **PA-01:** sin cambios respecto de la ronda 0: regla del firewall habilitada (Inbound/Block/Public) y red `IZZI-F281-5G` en Public.
- **Docker:** respondió.
- **Procesos ajenos:** los procesos de desarrollo del humano (`npm run dev` de la API, el worker con `tsx` y Vite) seguían encendidos durante toda la ronda. No los toqué. Nadie más corrió pruebas.
- **Archivos:** solo creé estos 4 y no modifiqué ningún otro:
  - `backend/test/gestion-02a-r1.ataque.test.ts` (13 casos)
  - `backend/test/concurrencia-02a-r1.ataque.test.ts` (7)
  - `backend/test/logs-02a-r1.ataque.test.ts` (2)
  - `backend/test/sexto-paso-02a-r1.ataque.test.ts` (3)
  Prettier solo corrió sobre ellos, desde `backend/`.

### Hallazgos

#### T-01 — `POST /api/admin/clases/:claseId/maestros` responde en inglés a un cuerpo que es un arreglo
Severidad: baja
Prueba: `backend/test/gestion-02a-r1.ataque.test.ts` › "ataque CLASES-02a r1: crear con maestroIds manipulados (punto 6)" › "un cuerpo que no es objeto o con tipos incorrectos en crear y editar responde 400 en español, nunca 500" (unos 310 ms en cada corrida).

**Reproducción:** con el token del admin, `POST /api/admin/clases/<claseId>/maestros` con el cuerpo JSON crudo `[]` o `["x"]`.

**Esperado:** `400 VALIDACION` con un mensaje en español, como responden los mismos cuerpos en `POST /api/admin/clases` y como exige la regla de mensajes en español de las rondas de CLASES (N-C3, `muro-c-r2` "un cuerpo que no es un objeto…").

**Obtenido:** `400` con el mensaje literal `cuerpo: Invalid input: expected object, received array` en los dos casos. Los cuerpos cadena, número, `null`, `true` y JSON roto sí responden en español.

**Causa:** `validarCuerpo` (`handlers/validacion.ts`) solo rechaza en español lo que no es `typeof "object"`, y un arreglo sí lo es. `POST /api/admin/clases` no lo sufre porque `conTextosNormalizados` convierte el arreglo en objeto; `asignar` pasa `request.body` tal cual.

**Requisito o regla:** textos de la API en español (tono de `DESIGN.md` §9 y N-C3 de CLASES-01). Por lo mismo, PR-2A10 pide "mensaje en español".

**Hermanos (para el programador):**
- Mismo patrón, ruta nueva de 02a: solo `POST …/maestros`. Las otras dos rutas de gestión con cuerpo (`POST /api/admin/clases` y `PUT /api/admin/clases/:claseId`) pasan por `conTextosNormalizados` y responden bien.
- Mismo patrón, preexistentes y fuera de 02a: todas las que llaman `validarCuerpo` sin normalizar antes:
  - `POST /api/clases/:claseId/alumnos`, que en 02a se abrió al admin;
  - `POST /api/clases/unirse`;
  - las de `handlers/auth/**`;
  - `handlers/admin.ts`;
  - `POST /api/clases/:claseId/archivos`.
  Mi prueba no las afirma. La corrección general vive en `handlers/validacion.ts`, que está en "No se toca"; lo decide el manager.

### Observaciones (no son hallazgos)
- **O-03 (punto 2 del plan, redacción):** el plan pide "que `/api/admin/:x/…` siga rechazándose por los dos primeros segmentos". Con la regla de CHORE-02, `/api/admin/:x/clases` **arranca**: su parámetro va en el tercer segmento, y la regla solo cubre los dos primeros. La guarda no cambió en 02a, así que no es una regresión. Mi prueba afirma lo que la regla sí cubre (`/:api/…`, `/api/:admin/…` y `/api/*`).
  Riesgo teórico para el manager: una ruta futura `/api/admin/:seccion/:id` con `protegido({ roles: ["admin"] })` atendería, en un método que no tenga ruta propia, `/api/admin/clases/<id>` sin sexto paso. Solo para el admin.
- **O-04 (PA-10, entrada del admin):** el log de cada petición incluye `req.url` con la consulta. Si el admin escribe un correo completo en el buscador de maestros (que busca por nombre), ese correo queda en el log. Es su propia entrada, no un dato que la API saque de la base, y el buscador de alumnos de CLASES-b ya se comporta igual. Con búsquedas por nombre, ningún correo de candidato aparece en el log (prueba de `logs-02a-r1`).
- **O-02 de la ronda 0, cerrada:** en las tres corridas los casos de control de ESLint duraron entre 4.3 y 5.1 s (abajo), contra los 47.8 s de la ronda 0. Aquella lentitud no se repitió con los mismos procesos ajenos encendidos.
- **Orden S-05 y reloj:** `crearClaseAdministrada` escribe `creado_en` con el reloj de la aplicación (desviación 2, aceptada) y las asignaciones posteriores usan el `now()` de la base. Ataqué ese cruce (crear y asignar enseguida, 5 vueltas por corrida): el maestro de la creación siguió primero en las 3 corridas. El riesgo de R-13 no se materializó en este equipo.

### Atacado sin hallazgos
- **Autorización de las 6 rutas de gestión:**
  - Identidades probadas: sin token (401); estudiante inscrito, maestro de la clase y maestro ajeno (403 `ROL_NO_PERMITIDO`); restringido (403 `ACCESO_RESTRINGIDO`); maestro con cambio pendiente (403 `CAMBIO_DE_CONTRASENA_REQUERIDO`); maestro inactivo (401).
  - Rutas: GET, HEAD y POST de la lista, editar, asignar, retirar, y GET y HEAD del buscador.
  - HEAD nunca lleva cuerpo, ninguna respuesta negada trae correos y nada de lo negado escribe.
  - El admin sí puede todo, y retirar al de `maestro_id` lo pasa al que queda.
- **El admin en las rutas que no se le abren:** `personas`, `inscritas` e `impartidas` (GET y HEAD), `unirse` con un código real, las 7 del muro y las 2 de archivos responden 403 `ROL_NO_PERMITIDO`, sin inscripción del admin y sin publicaciones, comentarios ni archivos nuevos o borrados. Tampoco puede inscribirse como alumno, asignarse como maestro ni crear una clase consigo mismo (404).
- **`claseId` manipulado en las 10 rutas con `:claseId` que admiten al admin:**
  - Clase inexistente: el mismo `403 SIN_ACCESO_A_LA_CLASE` en las 10, con un solo cuerpo.
  - Variantes con espacios, `%00`, llaves, sin guiones, comilla, sufijo y UUID nulo: siempre 4xx, nunca 2xx ni 5xx, y nada escrito.
  - En mayúsculas es la misma clase: edita, asigna y retira, y `maestro_id` se reescribe bien.
- **Crear con `maestroIds` manipulados** (ausente, `[]`, `null`, texto, texto con comas, objeto, números, 3, 100, repetido, repetido en mayúsculas, no UUID, con `null`, anidado, con espacios, con llaves): 400 en español.
  - Estudiante, admin, inactivo o inexistente, solos o junto a uno válido: 404 `MAESTRO_NO_ENCONTRADO`.
  - Nada escrito, ni clase ni asignación.
  - Un id en mayúsculas se guarda en minúsculas. Dos ids en orden inverso quedan en el orden S-05, con `maestro`, `maestros[0]` y `clases.maestro_id` iguales, y el detalle coincide con la respuesta de crear.
- **Tipos incorrectos en crear, editar, asignar y retirar** (nombre número, descripción número, `null` u objeto, cuerpo vacío, `maestroId` `null`, número, arreglo o ausente, `maestroIds` en asignar, `:maestroId` no UUID): 400 en español. Solo falla el arreglo de T-01.
- **Idempotencia:** retirar al único da 409 `CLASE_SIN_MAESTRO`, también en mayúsculas, con el texto exacto del plan. Asignar dos veces (la segunda en mayúsculas) devuelve la misma lista. Un tercero da 409 `TOPE_DE_MAESTROS` con su texto. Retirar a quien no está (maestro, estudiante, inexistente o el admin) devuelve 200 con la misma lista, sin escribir, y `maestro_id` sin cambio.
- **Concurrencia (punto 3):**
  - 6 asignaciones simultáneas de 6 maestros distintos: exactamente una 200 y cinco 409.
  - El mismo maestro 6 veces a la vez (mitad en mayúsculas): seis 200 y una fila, nunca un 500 por la PK.
  - Retirar a los dos a la vez (4 vueltas): una 200 y una 409, queda uno y `maestro_id` es ese.
  - Asignar y retirar al mismo maestro, y reasignar en paralelo (6 vueltas de 6 operaciones): nunca 0 ni 3 maestros, nunca 5xx.
  - Secuencia al azar (5 rondas de 8 en paralelo, 4 maestros): el invariante se sostiene después de cada ronda y el detalle coincide con `maestros_de_clase`.
  - 0 `P2028` en las rutas de CLASES-02.
- **Escritura doble (punto 4):** con `clases.maestro_id` cambiado a mano a un maestro **no** asignado, nada cambia.
  - El intruso recibe 403 en el detalle, el código (ver y regenerar), el roster, `personas` y el muro; el asignado sigue entrando.
  - `impartidas` del intruso no trae la clase.
  - El detalle (alumno y admin), `personas` e `inscritas` siguen mostrando al asignado. Nada lee la columna.
- **Respuestas al alumno:** en el detalle e `inscritas`, cada maestro trae solo `id` y `nombre` (o solo `nombre`). Nunca correo, rol, estado de pago, restricción, `activo`, hash, código ni fechas, aunque un maestro sea deudor, esté restringido o inactivo.
- **Lista del admin (punto 9):**
  - Cursor de usuario, de publicación, de clase borrada, inventado, `abc`, inyectado o con sufijo: 400 `VALIDACION`. `limite` 0, -1, 101, 1.5, `abc`, vacío, `1e3` o `Infinity`: 400.
  - Con una centinela en 1901: el orden por `(creado_en DESC, id DESC)`, `maestros` en orden S-05 y `alumnos` (cuentas activas, restringidas incluidas; las inactivas no) son correctos. `creadoEn` va en ISO.
  - El cursor en mayúsculas da la misma página.
  - `total` queda entre dos `COUNT(*)` tomados antes y después (es la forma que pide M-08).
- **Buscador de maestros (punto 7):**
  - Solo maestros activos con su correo completo: ni estudiantes, ni inactivos, ni el admin.
  - Acentos y mayúsculas ("JOSE NUNEZ" encuentra a "José Núñez").
  - `%`, `_` y `\` literales; inyección `' OR 1=1 --` sin resultados.
  - `limite=1` con `hayMas`; `limite` 0, 51, -1, `abc` o 1.5: 400.
  - `q` repetido, ausente, de 2 letras, con nulo o de 121: 400 en español.
  - El buscador de alumnos sigue enmascarado para el admin (P-05 a): sin correo completo ni estado de pago.
- **Movimientos (punto 8):** altas y bajas cruzadas del admin y del maestro sobre 3 alumnos, en paralelo y en 3 rondas, sin errores:
  - la `secuencia` es creciente y cada alumno alterna alta y baja;
  - el último movimiento coincide con si el alumno está inscrito;
  - todo `actorId` es uno de los dos;
  - una alta del admin queda con `actorId` = el admin.
- **Logs (PA-10)** a nivel trace, sobre 15 peticiones del admin (buscador de maestros, roster, buscador de alumnos, crear, crear con estudiante, crear y asignar con un correo como id, asignar, tope, retirar, retirar al único, alta, baja, lista y editar):
  - ningún correo completo (de maestros, alumnas o el mandado como id);
  - ni el token, ni "Bearer", ni el hash, ni el estado de pago.
- **Sexto paso con `roles` que los tipos no permiten (punto 1):** con `undefined` explícito, `[]`, `["Admin"]`, `["ADMIN", "maestro"]`, `[" admin"]` o `["admin\u0000"]`, el admin recibe 403 en `inscripcion` y en `propiedad`. Con un arreglo congelado con `"admin"`, pasa. Con `roles` vacíos, el maestro de la clase pasa (control).
- **La guarda (punto 2):** `/api/admin/clases/:claseId/extra` sin sexto paso no arranca, ni con `:claseId` en el prefijo del plugin; con `pertenencia`, sí. Un parámetro o comodín en los dos primeros segmentos no arranca (ver O-03).
- **Migración (punto 5):** la sentencia de datos, tal cual del `migration.sql`, sobre tablas temporales que se revierten:
  - una clase cuyo maestro ya tenía fila con otra fecha la conserva;
  - una clase con dos maestros no gana un tercero;
  - las demás reciben la fila con la fecha de la clase;
  - repetirla no cambia nada;
  - el orden de `impartidas` es el de las clases;
  - nada llega a `public`.

### No atacado y por qué
- **Admin con cambio de contraseña pendiente o inactivo:** el admin es único por base, y cambiar su fila en la base compartida tumbaría en paralelo las pruebas de otros archivos que usan su token. La cadena es la misma que ya pasan PR-2A22 (maestro y estudiante con cambio pendiente o inactivos) y las pruebas de AUTH.
- **Frontend:** 02a solo cambia sus dobles (C-7). No corrí el frontend; el manager lo corrió en verde (104 archivos y 1396 casos).
- **Borrar una clase entre el sexto paso y la transacción de asignar** (el `count = 0` de §D-2A4): ninguna ruta borra clases (S-09), y forzarlo pide un doble del adaptador. PR-2A15 y mis pruebas de concurrencia cubren el candado.
- **Desactivar un maestro entre la validación y el `create` de crear clase (R-06):** ninguna ruta desactiva cuentas hoy. Va con ADMIN.
- **Un cuerpo enorme** (`maestroIds` de 10⁶ elementos): Fastify lo corta a 1 MiB antes del handler, y el `max(2)` de zod rechaza cualquier arreglo mayor (probado con 100).

### Corridas
**Comando**, tres veces seguidas, una a la vez:
```
cd backend; npm test -- --reporter=default --reporter=json --outputFile.json=<scratchpad>/clases02a-r1-N.json > <scratchpad>/clases02a-r1-N.txt 2>&1
```
Antes de cada una corrí cada archivo nuevo por separado.

| Corrida | Inicio (UTC) | Código | Resumen | Duración |
|---|---|---|---|---|
| 1 | 20:08:58 | 1 | `Test Files  1 failed \| 139 passed (140)` · `Tests  1 failed \| 1697 passed (1698)` | 96.54 s |
| 2 | 20:10:42 | 1 | ídem | 96.04 s |
| 3 | 20:12:42 | 1 | ídem | 96.29 s |

- **Última línea literal de cada archivo:** el pie de error de npm (`npm error command C:\WINDOWS\system32\cmd.exe /d /s /c vitest run --reporter=default --reporter=json --outputFile.json=…/clases02a-r1-N.json`).
- **Resumen de Vitest de la corrida 3:**
  ```
   Test Files  1 failed | 139 passed (140)
        Tests  1 failed | 1697 passed (1698)
     Duration  96.29s (transform 11.62s, setup 5.21s, import 184.96s, tests 710.46s, environment 79ms)
  ```
- **Rojo (el mismo en las tres):** el caso de T-01, de unos 310 ms (327, 309 y 308). Valor obtenido: los dos mensajes `cuerpo: Invalid input: expected object, received array`.
- **PA-12 no se activó:** ningún otro rojo, 0 `timed out` y 0 `Unable to start a transaction` en las tres.

**PA-07**, igual en las tres corridas:

| Término | Cuenta |
|---|---|
| `40P01` | 0 |
| `deadlock detected` | 0 |
| `could not serialize` | 0 |
| `too many clients` | 0 |
| `"Error no controlado"` | 10, exactamente I-1 |
| `"code":"P2028"` | 5, los permitidos |

- **"Error no controlado" (I-1):** 5 de `POST /api/auth/login` con "fallo simulado de la base en la búsqueda" y 1 con "…al crear la sesión" (`intentos-r2`); 3 `ZodError` de archivos y del muro (`POST …/archivos`, `POST …/descarga` y `GET …/publicaciones`, de `archivos-d-r2`); y `GET /api/prueba/error-comun` "boom" (`salud.integracion`).
- **`P2028`** (por `pid` y `requestId`):
  - de `servicio-ocupado.integracion`: `POST /api/auth/cambiar-contrasena` › `tx.sesion.findFirst()`, `POST /api/auth/refrescar` › `tx.sesion.updateMany()` y `POST /api/clases/:claseId/publicaciones/:publicacionId/comentarios` › `prisma.$queryRawUnsafe()`;
  - de `cuentas-r3`: `POST /api/auth/login` › `tx.sesion.create()` y `POST /api/auth/restablecer` › `tx.tokenCuenta.updateMany()`.
- **Control positivo** presente en las tres. **PA-07 limpia en las tres.** Ningún `P2028` de una ruta de CLASES-02.

**Casos de control de ESLint (O-02; límite de 60 s):**

| Caso | Corrida 1 | Corrida 2 | Corrida 3 |
|---|---|---|---|
| `guarda-clase-r1` › "control: app.addHook(...) se rechaza" | 4305 ms | 4756 ms | 4783 ms |
| `guarda-clase-r2` › "control: app.addHook, app['addHook'] y app?.addHook se rechazan" | 4416 ms | 5141 ms | 4400 ms |

### Conteos
- `cd backend; npx vitest list` → **1698** casos; `npx vitest list --filesOnly` → **140** archivos.
- Diferencia con lo aceptado por el manager (1673 y 136): +25 casos y +4 archivos, todos míos: `gestion-02a-r1` 13, `concurrencia-02a-r1` 7, `logs-02a-r1` 2 y `sexto-paso-02a-r1` 3.
- `*.ataque`: 119 (115 + 4).

### Tabla de SHA-256 de las 119 `*.ataque` al cierre de la ronda 1 de 02a (base de V-01 de la siguiente ronda; 4 nuevas, ninguna existente cambia)
La tabla completa está en el scratchpad (`tabla-02a-r1.md`). Es la de la ronda 0 de 02a (arriba), sin cambios en sus 115 filas, más estas 4:

| SHA-256 | Archivo | Cambio |
|---|---|---|
| `000EC9008C73D25121C82A46F5EA0F67E6C8C387CB04E361EF82812B57956098` | `backend/test/concurrencia-02a-r1.ataque.test.ts` | nueva: ronda 1 de 02a |
| `E0821A93ABA8FC077E0AE35928AFEB8C88EEE39AF913A25A351D154E7BD13AED` | `backend/test/gestion-02a-r1.ataque.test.ts` | nueva: ronda 1 de 02a |
| `F9F9EC59EC8D1A5CCB180522798140C45604440F48EDCD68A3E02863D90AE347` | `backend/test/logs-02a-r1.ataque.test.ts` | nueva: ronda 1 de 02a |
| `70AC720F2E7FCADEE5BBCB6414887AB08129DEA7CD91DF012046953B1584E8B6` | `backend/test/sexto-paso-02a-r1.ataque.test.ts` | nueva: ronda 1 de 02a |

## CLASES-02a — Ronda 2

# Reporte del Tester — CLASES-02a · clases administradas (backend) — Ronda 2
Veredicto: **RESISTE**
Verificación propia: lint `cd backend; npm run lint`, código 0 (última línea `tsc -p tsconfig.json --noEmit && tsc -p tsconfig.test.json`) · test: 3 corridas completas seguidas, las tres `Test Files  142 passed (142)` · `Tests  1703 passed (1703)`

Fecha: 2026-10-03. Se ataca la corrección de la ronda 1: T-01 corregido en general en `handlers/validacion.ts` (`Array.isArray`, A-12) y M-08 (PR-2A12 con `total` acotado entre dos conteos), con el resumen ya aceptado por el manager.

### Precondiciones
- **V-01:** las 119 `*.ataque` contra la tabla de la ronda 1 de 02a (`tabla-02a-r1.md`, comparada con `diff`): **119 de 119 iguales** (`V01-OK`). El programador no tocó ninguna.
- **PA-01:** sin cambios: regla del firewall habilitada (Inbound/Block/Public) y red `IZZI-F281-5G` en Public.
- **Docker:** respondió.
- **Procesos ajenos:** los procesos de desarrollo del humano (`npm run dev` de la API, el worker con `tsx` y Vite) seguían encendidos. No los toqué. Nadie más corrió pruebas.
- **Archivo nuevo:** solo uno, `backend/test/cuerpos-02a-r2.ataque.test.ts`, con 3 casos. No modifiqué ningún otro. Prettier corrió solo sobre él, desde `backend/`.

### Regresión
- **T-01:** el caso de la ronda 1 (`gestion-02a-r1` › "un cuerpo que no es objeto o con tipos incorrectos en crear y editar responde 400 en español, nunca 500") está en verde en las tres corridas.
- Mis otros 24 casos de la ronda 1 y los 26 reescritos en la ronda 0 siguen en verde.

### Hallazgos
Ninguno.

### Atacado sin hallazgos
- **T-01 en sus hermanos: las 21 llamadas a `validarCuerpo`** de `handlers/`, con 22 combinaciones de ruta y token (el alta de alumnos con el maestro y con el admin):
  - gestión: crear, editar y asignar;
  - alta de alumnos, `unirse`, publicar, comentar y solicitar subida;
  - auth: `registro`, `login`, `recuperar`, `restablecer`, `invitacion`, `establecer-contrasena`, `cambiar-contrasena` y `registro-maestro`;
  - admin: invitar maestro, invitación masiva, buscar cuenta, corregir correo y crear enlace de registro.

  Cada una recibió seis cuerpos crudos: `[]`, `[[]]`, `[{}]`, `["x"]`, `[<objeto válido>]` y `[<válido>, <válido>]`. Las 132 respuestas fueron `400 VALIDACION` en español; ninguna 5xx, ningún mensaje en inglés y ninguno repite el valor recibido. Nada se escribió: ni clase, ni nombre editado, ni asignación, ni inscripción, ni publicación, comentario, archivo, cuenta o correo cambiado.

  `cambiar-contrasena` se atacó con una cuenta con cambio pendiente: sin él, responde `409 CAMBIO_NO_REQUERIDO` antes de validar, como documenta `middleware/README.md`. Las rutas que normalizan antes de validar (crear, editar, publicar, comentar) convierten el arreglo en objeto y responden con el mensaje del primer campo, también en español.
- **El objeto válido sigue pasando:** asignar 200, editar 200, alta del admin 200, `unirse` 200, publicar 201 y comentar 201.
- **Pendiente de la ronda 1, la clase que desaparece entre el sexto paso y la transacción (§D-2A4, paso 1):** `asignarMaestro` y `retirarMaestro` llamados directamente sobre una clase inexistente lanzan `AppError` 403 `SIN_ACCESO_A_LA_CLASE` (el `count = 0` del candado) y no escriben ninguna asignación.

### Observaciones
- **O-02, sigue cerrada:** los casos de control de ESLint duraron entre 4.2 y 5.7 s (abajo); el límite es de 60 s.
- **O-03 y O-04:** quedaron arbitradas por el manager (O-03, redacción del plan corregida; O-04, pendiente con destino DEPLOY). No las reabro.

### No atacado y por qué
- **Admin con cambio de contraseña pendiente o inactivo:** sigue sin atacarse, por lo mismo que en la ronda 1. El admin es único en la base compartida y alterarlo tumbaría las pruebas paralelas que usan su token. La cadena es la misma que cubren PR-2A22 y AUTH.
- **Desactivar un maestro entre la validación y el `create` (R-06):** ninguna ruta desactiva cuentas, así que no hay forma de abrir la ventana sin un doble del adaptador. Va con ADMIN.
- **Frontend:** 02a solo cambió sus dobles (C-7) y no lo corrí, por instrucción. Lo corrió el manager.

### Corridas
**Comando**, tres veces seguidas, una a la vez:
```
cd backend; npm test -- --reporter=default --reporter=json --outputFile.json=<scratchpad>/clases02a-r2-N.json > <scratchpad>/clases02a-r2-N.txt 2>&1
```
Antes corrí `npm run lint` (código 0) y el archivo nuevo por separado (3 de 3).

| Corrida | Inicio (UTC) | Código | Resumen | Duración |
|---|---|---|---|---|
| 1 | 20:35:21 | 0 | `Test Files  142 passed (142)` · `Tests  1703 passed (1703)` | 97.30 s |
| 2 | 20:37:06 | 0 | ídem | 101.96 s |
| 3 | 20:38:55 | 0 | ídem | 108.58 s |

- **Última línea literal de cada archivo:** `JSON report written to C:/Users/Carlos/AppData/Local/Temp/claude/c--Users-Carlos-Documents-Proyecto-PlataformaEducativa/0674b697-54d2-4eb4-ad9a-7234f1426d63/scratchpad/clases02a-r2-N.json`.
- **Resumen de Vitest de la corrida 3:** `Test Files  142 passed (142)` / `Tests  1703 passed (1703)` / `Duration  108.58s (transform 12.40s, setup 5.66s, import 210.71s, tests 809.23s, environment 53ms)`.
- **Ningún rojo.** 0 `timed out` y 0 `Unable to start a transaction` en las tres. PA-12 no se activó.

**PA-07**, igual en las tres corridas:

| Término | Cuenta |
|---|---|
| `40P01` | 0 |
| `deadlock detected` | 0 |
| `could not serialize` | 0 |
| `too many clients` | 0 |
| `"Error no controlado"` | 10, exactamente I-1 |
| `"code":"P2028"` | 5, los permitidos |

- **"Error no controlado" (I-1):** 5 de `POST /api/auth/login` con "fallo simulado de la base en la búsqueda" y 1 con "…al crear la sesión" (`intentos-r2`); 3 `ZodError` de `POST …/archivos`, `POST …/descarga` y `GET …/publicaciones` (`archivos-d-r2`); y `GET /api/prueba/error-comun` "boom" (`salud.integracion`).
- **`P2028`:**
  - de `servicio-ocupado.integracion`: `POST /api/auth/cambiar-contrasena` › `tx.sesion.findFirst()`, `POST /api/auth/refrescar` › `tx.sesion.updateMany()` y `POST /api/clases/:claseId/publicaciones/:publicacionId/comentarios` › `prisma.$queryRawUnsafe()`;
  - de `cuentas-r3`: `POST /api/auth/login` › `tx.sesion.create()` y `POST /api/auth/restablecer` › `tx.tokenCuenta.updateMany()`.
- **Control positivo** presente en las tres. **PA-07 limpia en las tres.**

**Casos de control de ESLint (límite de 60 s):**

| Caso | Corrida 1 | Corrida 2 | Corrida 3 |
|---|---|---|---|
| `guarda-clase-r1` › "control: app.addHook(...) se rechaza" | 4173 ms | 4812 ms | 4879 ms |
| `guarda-clase-r2` › "control: app.addHook, app['addHook'] y app?.addHook se rechazan" | 4854 ms | 5054 ms | 5728 ms |

### Conteos
- `cd backend; npx vitest list` → **1703** casos; `npx vitest list --filesOnly` → **142** archivos.
- Diferencia con lo aceptado por el manager (1700 y 141): +3 casos y +1 archivo, los de `cuerpos-02a-r2`.
- `*.ataque`: 120.

### Tabla de SHA-256 de las 120 `*.ataque` al cierre de la ronda 2 de 02a (base de V-01 del cierre de 02a; 1 nueva, ninguna existente cambia)
| SHA-256 | Archivo | Cambio |
|---|---|---|
| `BCCE2CAE771F97957D8691BEF7FFF4EC42412DAAEABF726AEB0AFC59F6F25671` | `backend/src/config/correo.ataque.test.ts` |  |
| `DCB78D222544E8DC4FBECE59468F555B04ABE971B70016E9BB17FCAE3E958580` | `backend/src/config/env.ataque.test.ts` |  |
| `71E7F049447D2D1ECEDD897C55EA0B6D31221753F0A7E7473C7AC6E8667F0A95` | `backend/src/config/logger.ataque.test.ts` |  |
| `91F620C1A27778EEBC2BED5EEC1BC9B0E3FE1199B32ED00F9DD910011D6A1805` | `backend/src/core/clases/codigo-r1.ataque.test.ts` |  |
| `262691F5786AD63B2393D0BA5FF97538F6DACF43343BED019AD23C12A07D8686` | `backend/src/core/clases/codigo-r2.ataque.test.ts` |  |
| `E769CBFCC3A83A64B51C6437F80684640A7C928AD6B8C5C1671FDFF005D7B734` | `backend/src/workers/ritmo-03c-r1.ataque.test.ts` |  |
| `388AD0E585639B8C3E0E0A6657FB42C1B9CB83DB721C4863C4FA19E0BE42EC85` | `backend/test/admin-unico.ataque.test.ts` |  |
| `D971CEB589BBD94E337D0B3A533EDD81DFE49C3E63AA5D1539875D8990955F16` | `backend/test/alumnos-b-r1.ataque.test.ts` |  |
| `00346D471355ABC7971B921649E7192B8987FE27912C00CB7E41AEF2065369E9` | `backend/test/alumnos-b-r2.ataque.test.ts` |  |
| `FC11AB4B914D4A88612953F82DB354E2B9CEA9BEF86E24321EF7E031F3AC3837` | `backend/test/alumnos-b-r3.ataque.test.ts` |  |
| `441A766A94E7D9B26807790402E06ED94D4CC378D8F6ECF0BCCC3259C7FF55FB` | `backend/test/api-real.ataque.test.ts` |  |
| `79BB87AE390140BD5F5E5BA00E1A32A8E41937DE2A98D59E83335C34A8FB94BB` | `backend/test/archivos-d-r1.ataque.test.ts` |  |
| `1637EB447CD12AC5BDDDC7634980DBC10A25CBAD5DE01BF6C09F40ED930FF1A9` | `backend/test/archivos-d-r2.ataque.test.ts` |  |
| `42BB7BF3086230C6EDC65AB73976AC8A801956336561AADBEE65CC3B40EB8612` | `backend/test/arquitectura-cuentas-r1.ataque.test.ts` |  |
| `38ADB0984744A0810287711F57BA0498287D0BC96344B8948BA1C490CA807716` | `backend/test/arranque-r1.ataque.test.ts` |  |
| `2C83D82D10BDD9B7A969768774D75B18B7A71A594BBAAC5FAE36A0E134D2336C` | `backend/test/auth-login.ataque.test.ts` |  |
| `73D3A2AE708A0EF676547A8094115B1419423057378387269BC3EADB34C7724E` | `backend/test/auth-registro.ataque.test.ts` |  |
| `95BBA9BAC44366AD5A361E93DD2F278CB0A1CC889FA479049ACC7B45A9A5E71B` | `backend/test/clases-r1.ataque.test.ts` |  |
| `A87817D56C236C0BA3597214CAC23B10483BBC28AE44800C592ED5CE2EF97F38` | `backend/test/clases-r2.ataque.test.ts` |  |
| `72DE7D8AF3D3F772ABC19DB065F6E418F6EB76CE78D87FE6EBB51335FC99825A` | `backend/test/clases-r3.ataque.test.ts` |  |
| `BE97C4E48AC9551BED1D01552E90AB8CDF085CF928AE6C8C3D81809E35F7CE62` | `backend/test/clases-r4.ataque.test.ts` |  |
| `000EC9008C73D25121C82A46F5EA0F67E6C8C387CB04E361EF82812B57956098` | `backend/test/concurrencia-02a-r1.ataque.test.ts` |  |
| `530546B4D70A2B9AD36F98F37E2AF45480E81A1101EE3516D15426F78350BF82` | `backend/test/cuentas-03a-r1.ataque.test.ts` |  |
| `6303DDC170545F616C66773C3F5475CB3BE1FEA9347D8059354D6ADE8D676C16` | `backend/test/cuentas-r1.ataque.test.ts` |  |
| `3A4E81C111B8EEB7DF065804AA85062FA3FC607F0147149B71AC21C14E7818D9` | `backend/test/cuentas-r2.ataque.test.ts` |  |
| `F54F79F7B2A83E95FE440053CCAF15CB3EBB01CE5DFD4C6655E22159A5FD7E6B` | `backend/test/cuentas-r3.ataque.test.ts` |  |
| `A2F9BFF596330A7D55D1CA9D47197FC831EB132F52C759610E2D667895C3332F` | `backend/test/cuerpos-02a-r2.ataque.test.ts` | nueva: ronda 2 de 02a |
| `D7A9DA854CE8AB8AD8D2437DB2E8C2A642A777EA3261A6B038DA28BE022DF848` | `backend/test/enlaces-03b-r1.ataque.test.ts` |  |
| `DC1B7EE7EA58966F5DB33CCB4581885A9669DEA2263954AE46D17A83E1EF6EAF` | `backend/test/enlaces-03b-r2.ataque.test.ts` |  |
| `B051B1986496E35E3E306C4C6BC306A763542BCA4B350574D0C02E2C484DEB35` | `backend/test/enlaces-ch-r2.ataque.test.ts` |  |
| `D28CC4DE621A680E6B54B2BFF889700300D558EC7849717584518D2F03EC8CAE` | `backend/test/entorno-ch-r1.ataque.test.ts` |  |
| `BA1AC9B17CC9BF747522BD4EC8B87DF436008482E643B18EEA8E9A8C041C59B3` | `backend/test/formada-ch-r1.ataque.test.ts` |  |
| `E0821A93ABA8FC077E0AE35928AFEB8C88EEE39AF913A25A351D154E7BD13AED` | `backend/test/gestion-02a-r1.ataque.test.ts` |  |
| `5F4133F949D2F337A8F63B75CF82CB77114DB7812D67C1960105F5000C31A326` | `backend/test/guarda-ch-r1.ataque.test.ts` |  |
| `7A7DAC6D87EDF81059FCFF9C07471AAF49D690EC159BE4B9FD4AA32B0909A215` | `backend/test/guarda-ch-r2.ataque.test.ts` |  |
| `610EE44E5D0BCEA46EB4E3645F9ADF1998A76947A25AF7E3F8248EA3A633DF79` | `backend/test/guarda-ch-r3.ataque.test.ts` |  |
| `E5D149F3AC52B726E1FE08908249706341330F88EAA6674B9A9AC67B98B1E864` | `backend/test/guarda-clase-r1.ataque.test.ts` |  |
| `C979D2C9C420A2177FA6EBDDB78EB2CE84D5F043B94270F690916A6FC75D6F8F` | `backend/test/guarda-clase-r2.ataque.test.ts` |  |
| `20982E2B98F1B162146A211923F3D5EC19D4E170C4AA3A5BFC6F82C3B6173AAD` | `backend/test/guarda-r2.ataque.test.ts` |  |
| `A8B79D5AD98270BE3747F493865708A78BB73ADD08D832584DB4464C3582777A` | `backend/test/intentos-r2.ataque.test.ts` |  |
| `2619B44EEA3370494C95AC128FCFD9E3FFC20D1581A19F549BF371F603A11D7D` | `backend/test/invitacion-flujo-03a-r2.ataque.test.ts` |  |
| `704155928183AEC193AE7E157B86B3E9361D2B63C7A47BE1ED859605FAB4FFA6` | `backend/test/invitacion-masiva-03c-r1.ataque.test.ts` |  |
| `DD9B7454E8786BF0B833D265900CCAECF595808CEBC8E9A77C9AEF15298A1038` | `backend/test/invitacion-masiva-03c-r2.ataque.test.ts` |  |
| `F9F9EC59EC8D1A5CCB180522798140C45604440F48EDCD68A3E02863D90AE347` | `backend/test/logs-02a-r1.ataque.test.ts` |  |
| `BD8B303C434EFEC0785E0691D31D6F6E87DBF3305F50FA27CCE0F78CBB251E3A` | `backend/test/logs-03a-r1.ataque.test.ts` |  |
| `B58D5D013658433FE5839634E2DB5A31B8D2B8F69587BC36958752D3CD33BBF7` | `backend/test/logs-03b-r1.ataque.test.ts` |  |
| `0E4ABF3BC5D92FA0C380805453190703862567930DD74B9E7FCC1809564D181F` | `backend/test/logs-03c-r1.ataque.test.ts` |  |
| `1E775A19682F3A5995D7C035BCC810A36BF50C22045B6FFBFC5A98B821255DB0` | `backend/test/logs-archivos-d-r1.ataque.test.ts` |  |
| `E9CE866D511E3EE6029015B74E20B4D342A60BE99B3AAC97E86F00283A3C77F1` | `backend/test/logs-archivos-d-r3.ataque.test.ts` |  |
| `E008935B107752D203F6423B2F1C9E0F5A4339F0A77154746BF262CECB90351A` | `backend/test/logs-cuentas-r1.ataque.test.ts` |  |
| `690E30ED39111C0A074FC159015967CD9F0FDC24D9A340E6A0D7BE4B980A9D45` | `backend/test/logs-muro-c-r1.ataque.test.ts` |  |
| `0809C60700E26183E7771B4B1A40B05CBF554C2ED7929190CF4D89A52722E551` | `backend/test/logs-muro-c-r2.ataque.test.ts` |  |
| `5AF3909E4B7CA485E78979567872EA78BF41E6D679B9EC2C761EAA0B250DF689` | `backend/test/logs-r2.ataque.test.ts` |  |
| `595912F6A0F94C3C8F555C83B13B9A2197067D689C16118C4214363D79822D9E` | `backend/test/muro-c-r1.ataque.test.ts` |  |
| `7825CFC9B484DF740FA0E9562A195D1BBCAF4CAF72EA55FA847B5394AB96C125` | `backend/test/muro-c-r2.ataque.test.ts` |  |
| `8B733B86FC6D54ECE008389A59793FAE4EC4A65146EB37215E900E50A5337D46` | `backend/test/nombres-guarda-r3.ataque.test.ts` |  |
| `00A6EB6F7CCD7D8790C356BEFCC96DDFDA6EACCE0BE53DE255CFE3626D8F2ADB` | `backend/test/nombres-tokens-r2.ataque.test.ts` |  |
| `80B5A848F69B429E7DADEC86C07BEC1D3E3EED8A042EFBA41CE912DED39E7BAB` | `backend/test/nowait-ch-r1.ataque.test.ts` |  |
| `6F2ABC2CEFD77D74CD1E3ABBDCE9C41BB53D00BD4D8E5BA7E496C4441C2697E5` | `backend/test/servicio-ocupado-ch-r1.ataque.test.ts` |  |
| `3B2D94ABCCBEDD6FB53CF666AAD06ADF431A0DB9A09264F05D8ADF6963CBD0AE` | `backend/test/sesiones-y-cadena.ataque.test.ts` |  |
| `70AC720F2E7FCADEE5BBCB6414887AB08129DEA7CD91DF012046953B1584E8B6` | `backend/test/sexto-paso-02a-r1.ataque.test.ts` |  |
| `F09E9A0038C47D1A2223376A0AF260BAF573F0C45BF770201C48C9E30296F04B` | `backend/test/worker-03c-r1.ataque.test.ts` |  |
| `9F60F9D65D52D2021A1EB04E9F01D3CC68F22744C845BF93D6621AA4FE9713A8` | `backend/test/worker-r1.ataque.test.ts` |  |
| `77D11BD85F202A9EEC92A363DF82E63FB9A784CA9D368D49F62E61C1A2AA967B` | `backend/test/worker-r2.ataque.test.ts` |  |
| `B89EDE0F6AED45DFCB5E64C8909A822156CE43FD80948E72419CDCE9D4541A87` | `frontend/src/app/cache-03a-r1.ataque.test.tsx` |  |
| `E85743C0FBB8E476874A2C67334342D8D69D14153579FC1E4CCE0AE6E2B29616` | `frontend/src/app/contexto-r1.ataque.test.tsx` |  |
| `BC2BE5541006887E2A5A4A89B33046180F607D54474B0F96A73D615AFBCAC385` | `frontend/src/app/contrasena-r1.ataque.test.tsx` |  |
| `F38BCACB716D8A39ACDB3535A95603CD0D8AB02572CA57A7DF5268B01CEB6EAC` | `frontend/src/app/contrasena-r2.ataque.test.tsx` |  |
| `68FB5D092C0C8ECFCF282477EF023AAAE26F6B869656E05109DC3EFA276D842A` | `frontend/src/app/cuentas-r1.ataque.test.tsx` |  |
| `41930017715D3D6869DC7ACEFD75DE8EC3684F1F035B845ABDF8EC0F6B734DEE` | `frontend/src/app/cuentas-r2.ataque.test.tsx` |  |
| `1506C27E5F7418B5E087FD30F8809645A2FC3E2761C7249DE78F02E24AA6C7A5` | `frontend/src/app/en-espera-r1.ataque.test.tsx` |  |
| `DB48DAD405C27062621A44D3744C84CC5903892A51E5A8DF18F41383CB9C88A3` | `frontend/src/app/errores-r1.ataque.test.tsx` |  |
| `F95321E604E20B533EBF2DB3C1C6C66BA2F2D87A48F075415B766551F6EE30F4` | `frontend/src/app/fondo-r1.ataque.test.tsx` |  |
| `76B256114128377B6A793CAB882D031FB10785076728F8058E0FF1D93A7E9F64` | `frontend/src/app/marco-r1.ataque.test.tsx` |  |
| `6598E82FA02328D90C02D9720366C3FFC635FDA652972ABA137A000867083780` | `frontend/src/app/muro-recuperar-c-r3.ataque.test.tsx` |  |
| `653159DF824AB98C758A96B89CE460BE9E3A674BB88EFFC0E9F10F62E6A218C2` | `frontend/src/app/muro-recuperar-c-r4.ataque.test.tsx` |  |
| `2F8056A770397C1601647277944555A48AFC4B9A2BABEB75E5898F0CC92562BB` | `frontend/src/app/muro-rutas-c-r1.ataque.test.tsx` |  |
| `3267D093574AA792529D8E9311DEBFC651F519EB33F8EF9C369EB2C4C6180389` | `frontend/src/app/registro-maestro-03b-r1.ataque.test.tsx` |  |
| `053E867A904AFA3C09EEF92CA2E03E929D9F9C93F714040856F40C7418721BBE` | `frontend/src/app/router.ataque.test.tsx` |  |
| `ADF9E1CFD151E030C6B275A47A5C41F68F46BAEDF880A989676151DCACE5A1B3` | `frontend/src/app/rutas-clases-r1.ataque.test.tsx` |  |
| `F090CBD8E8C9B0AF52D4FC19547B07E9B6413F5414CC4B10862F01E29818DDDC` | `frontend/src/app/sesion-r2.ataque.test.tsx` |  |
| `B16D9B4376FA719F6DA04745FF701F24FA20159B1AA7904C6C9424D2475EA871` | `frontend/src/components/layout/estatico-r1.ataque.test.ts` |  |
| `0AAA18CD70465293B6FCA6CC051B8E4AC360A838D02FEDE848C35376C3D0066C` | `frontend/src/components/layout/pie-r1.ataque.test.tsx` |  |
| `00A707429AF6B5326F9A96DEF6382823CF4A6A092AAC7E7BD7CBCB8DC9AA1D21` | `frontend/src/components/layout/pie-r2.ataque.test.tsx` |  |
| `472E1F46D0C899496AA334909B02988962AAB07B9BD29A8D7B8AF3987FAC6C76` | `frontend/src/components/layout/pie-r3.ataque.test.tsx` |  |
| `385123D69F8C6411027C5B7DB2E52E62146C0DB54CFFDA3C27BD6B450FE2AF27` | `frontend/src/components/ui/badge-03b-r1.ataque.test.ts` |  |
| `86ADAA9A093A987DAFD97E279E600211CBDF6CEF97879D16FA2D8A9D2846F8B5` | `frontend/src/features/admin/cuentas-r1.ataque.test.tsx` |  |
| `B948E9359FD3981E08B850540027F536F345A3F48D7C0749BA0C16C2C1DF1184` | `frontend/src/features/admin/cuentas-r2.ataque.test.tsx` |  |
| `72BF9AF4CE8F52A114897E038CEFB0947841A37F74074F4C5F8DEC68A71B654A` | `frontend/src/features/admin/cuentas-r3.ataque.test.tsx` |  |
| `942DF3015424AED56E83661993BA015E871CD6BE8E797920D47E8CBF0C56EAC4` | `frontend/src/features/admin/cuentas-r4.ataque.test.tsx` |  |
| `3BD26E7E3BF019D462DB4837861ED22017BBB9E9A6276720BF0DEA6C2B5B0998` | `frontend/src/features/admin/en-espera-r1.ataque.test.tsx` |  |
| `8219C864E7BDC1315E6A0F0FF1CD6F54E4710CEBDCEB8E316F4E53AACC0CFF35` | `frontend/src/features/admin/foco-r1.ataque.test.tsx` |  |
| `30F45BBA30D9348EC1587B42E84CA370274E1BF0AF0F310B8A6BBD79FA982669` | `frontend/src/features/admin/maestros-03b-r1.ataque.test.tsx` |  |
| `D477A809E55E603D3EF6C02CA43B21372B75D0947FA303F1539D48BDF32841F8` | `frontend/src/features/admin/maestros-03c-r1.ataque.test.tsx` |  |
| `3CEDA51DB8F67F40C26615FBC4CD7D082035B00F38713C6CA4C7DB58E47926C8` | `frontend/src/features/auth/enlace-r1.ataque.test.tsx` |  |
| `1F5D1147637C09DAA6FDF1384E4395EDD69DFDAB84AAE5D602A362DABD3295BD` | `frontend/src/features/auth/enlace-r2.ataque.test.tsx` |  |
| `991B115524D8DADE8D6EA2C51FB753DC8832EE410DB2161A0CE761D011CFCA4A` | `frontend/src/features/auth/invitacion-r1.ataque.test.tsx` |  |
| `C3692E9EC300696E9EB10470BE5239055CF3326D0FCD1607BD82663210AF1B1F` | `frontend/src/features/clases/alumnos-b-r1.ataque.test.tsx` |  |
| `55DC274ECA96DA4360848B88F9F2A839AC815031490AB57FF38DE074512D632C` | `frontend/src/features/clases/alumnos-b-r2.ataque.test.tsx` |  |
| `371518E4309F14201A92D29F9436A97A19801B506D45114964FBCFE3F5CD4183` | `frontend/src/features/clases/alumnos-b-r3.ataque.test.tsx` |  |
| `BE0E7656BA70C2F73B3096885BCE5B2B73EEDF1B05BCE120216DE5E3EA3A8B09` | `frontend/src/features/clases/alumnos-b-r4.ataque.test.tsx` |  |
| `309B9877D03AF86CD6748E033C3E0137CF4C67A1C08E3873E54DD465CAC4F2D6` | `frontend/src/features/clases/alumnos-b-r5.ataque.test.tsx` |  |
| `10FB06D3B60E38071FC06D16E3D6341EC0C42AC37CC84812406B207EED994F54` | `frontend/src/features/clases/archivos-d-r1.ataque.test.tsx` |  |
| `729DCB70477DEC084EA4C9CB9D7C2CAA5DA42BC425753480EAA3E5BC1E6D71FB` | `frontend/src/features/clases/archivos-d-r2.ataque.test.tsx` |  |
| `D16FB15D963CAC9AA335381691C851259AFD85035DDD90D1AE1E510F9BE8D1D2` | `frontend/src/features/clases/archivos-d-r3.ataque.test.tsx` |  |
| `89C9522AB1947038E66F398E8E5C40A1A9BF4E872A16C34877C6432AC38402E5` | `frontend/src/features/clases/clases-r1.ataque.test.tsx` |  |
| `4ED2A5582C3DF7A29C62F9E1D458141AB104DD13A16B3C496634EB092948AA71` | `frontend/src/features/clases/clases-r2.ataque.test.tsx` |  |
| `146C9B3080709DAEA23B0500B0014C64DF1D5C2412510014CF79AA05E8CD84FC` | `frontend/src/features/clases/clases-r3.ataque.test.tsx` |  |
| `50BF79FE51B26A896008E6D39B39DA7510EBEB82EAA5EA8BEF76748E11FDCC96` | `frontend/src/features/clases/clases-r4.ataque.test.tsx` |  |
| `CDD1ED8890859AE3E884822FC7074852A2173105114745D83FE9A15C1C47C626` | `frontend/src/features/clases/estatico-r1.ataque.test.ts` |  |
| `7C434A0E54E70B12D4B2A3DE22FFB4DBF5F28A1CFBD2290C22E8A2B59EDF0E16` | `frontend/src/features/clases/inicio-sin-datos-r2.ataque.test.tsx` |  |
| `72A2CD4AB876FFA94D01FB45B2A555C32B2E40336FB65A12A87DEAC82CFAEB1B` | `frontend/src/features/clases/muro-c-r1.ataque.test.tsx` |  |
| `4E842F547E0156AFC753295CCC6F50A326939FC12B8537969818D3FB01569659` | `frontend/src/features/clases/muro-c-r2.ataque.test.tsx` |  |
| `2035462B2659CEB37646C85A4EA35CCFA7A7C31E7013104704018620262BE297` | `frontend/src/features/clases/muro-c-r3.ataque.test.tsx` |  |
| `C71CBA65DD284D7AF11CBC812B6BCF75BAA373939EDB8318E731858D9C50173F` | `frontend/src/lib/format-d-r1.ataque.test.ts` |  |
| `89DBBB70D5DC404C3D74DB5391D10855C8CB1D6B4C643B6147B3CE6FFB2637AF` | `frontend/src/lib/format-d-r2.ataque.test.ts` |  |
| `BFA7DED62F7A1402590D438A1CC51060A63FA019AD47D3EB5740E43383064A2A` | `frontend/src/lib/format-d-r3.ataque.test.ts` |  |
| `10C730348D18FF8DAE7B3623751D31122AA58560B564AD191717FA1938A6F8CE` | `frontend/src/services/apiClient.ataque.test.ts` |  |
| `C1F4B160D3BE549340F771F3E225721E3776F7A53EA2A653A5A91A2E297BEE93` | `frontend/src/styles/clases-r1.ataque.test.ts` |  |
| `B8085BCBBC7F4B6276BF3A87FB7BA0BC887953A8C6CE372354A7F3F1B5037582` | `frontend/src/styles/tokens-r1.ataque.test.ts` |  |

## CLASES-02b — Ronda 0

**Datos de partida.**
- Fecha: 2026-10-05. Rama `feat/clases-02`; base dentro de los paquetes `<K2a>` = `07c992f`; fuera, `<R>` = `e4396a0`.
- Trabajo bajo A-3 con el procedimiento de "Ronda 0" del plan. La ronda 0 no cuenta en el tope de 3 y no lleva veredicto ROTO o RESISTE: alinea las `*.ataque` existentes con 02b para que el programador implemente contra ellas.

**Estado:** ronda 0 completa. PA-01 se activó al primer intento y la resolvió el humano (abajo); ninguna otra PARADA.

**Verificación propia.**
- lint del backend: código 0. Las reescrituras solo usan rutas y campos, sin nombres nuevos de TypeScript.
- test del backend: `Tests  5 failed | 1698 passed (1703)`. Los 5 rojos son exactamente los casos reescritos que esperan a 02b.
- test del frontend: `Tests  1396 passed (1396)`. Los dobles solo ganan campos que el esquema actual descarta.
- lint del frontend: rojo esperado. ESLint y Prettier pasan; `tsc -b` da 1 error (TS2353, `puedeBorrar` en un literal tipado como `PaginaDelMuro`), que desaparece cuando `shared/` gane los campos de 02b (paso 13).

### Precondiciones
- **PA-01 (se activó y se resolvió):**
  - Primer intento: red `uacam5 2`, categoría Public. El humano la había declarado no confiable en `mitigacion-ryuk.md`, y `ESTADO.md` §5 solo aceptaba las redes IZZI. Además, Docker Desktop estaba apagado. Me detuve sin tocar nada y lo reporté.
  - Decisión del humano (literal, registrada por el orquestador en `aprobacion.md` y `ESTADO.md` §5): "Declaro `uacam5 2` de confianza para hoy; Docker encendido".
  - Al retomar: la red sigue siendo `uacam5 2` (Public). La regla "Campus: bloquear entrada a Docker en redes publicas" está `Enabled True`, `Inbound`, `Block`, `Public`. Docker respondió (servidor 28.5.1).
- **PA-02 (no se activó):**
  - La rama es `feat/clases-02` y `git cat-file -e '07c992f^{commit}'` termina con código 0.
  - Antes de tocar nada, `git status --porcelain -- backend shared frontend` y `git diff --stat 07c992f -- backend shared frontend` salieron vacíos.
  - Fuera de los paquetes solo cambian `docs/ESTADO.md` y `aprobacion.md`, que quedan excluidos de la verificación. Contra `e4396a0` no cambia nada en `infra/`, `AGENTS.md`, `.claude/`, `README.md` ni los `package*.json`.
  - Los SHA-256 de ESSENTIALS (`f23b3ca8…`), `ARCHITECTURE.md` (`00e34e89…`) y `CLAUDE.md` (`59c1fd57…`) coinciden con los de `aprobacion.md`.
- **V-01:** comparé con `diff` las 120 `*.ataque` contra la tabla de la ronda 2 de 02a: **120 de 120 iguales**, y ninguna `*.ataque` sin rastrear.
- **Procesos ajenos:** ningún proceso `node` estaba corriendo (los de desarrollo del humano estaban apagados). Los contenedores de `campus-dev` (postgres, minio y livekit) no los toqué. Nadie más corrió pruebas.

### Cambios C-n (backend)
Cada caso reescrito lleva un comentario `CLASES-02b ronda 0 (C-n, …)`. Las líneas son las del archivo nuevo.

| Archivo | Líneas | C-n | Antes | Después |
|---|---|---|---|---|
| `backend/test/muro-c-r1.ataque.test.ts` | 1344-1349, 1374-1378 | C-8 (§D-2B3; ver O-01) | "rol por la API": el estudiante inscrito recibía `403 ROL_NO_PERMITIDO` al publicar, al borrar una publicación y al borrar el comentario de otro alumno por la ruta general | Publicar y borrar la publicación siguen en `403 ROL_NO_PERMITIDO`. El comentario de otro pasa a `403 BORRADO_NO_PERMITIDO`: la ruta general admite al estudiante con `inscripcion` y decide la autoría. Siguen las aserciones de que nada se borra (1 publicación y el comentario intacto) |
| `backend/test/archivos-d-r1.ataque.test.ts` | 878-882, 941 (borradas 17 líneas), 1017-1042 | C-9 | "admin no entra a ninguna": el admin solicitaba la subida y descargaba con `403 ROL_NO_PERMITIDO` dentro del recorrido de lo negado | El admin sale del recorrido de lo negado, que sigue sin escribir ni firmar nada para el estudiante, el maestro ajeno, el que tiene cambio pendiente, el dado de baja y el que no tiene token. Después, el admin solicita (`201`, fila `pendiente` con `claseId` = la clase, `subidoPor` = el admin y `publicacionId: null`) y descarga (`200`, firma SigV4 válida para `GET`). Cada petición firma exactamente una URL y en `archivos` queda exactamente 1 fila más |
| `backend/test/gestion-02a-r1.ataque.test.ts` | 276-282, 304-306, 324-348 | C-9 (P-03 a) | "las 7 del muro y las 2 de archivos" en `403 ROL_NO_PERMITIDO` para el admin | Siguen cerradas para el admin, con `403 ROL_NO_PERMITIDO` y sin escribir ni borrar nada: `personas` (GET y HEAD), `inscritas` y `impartidas` (GET y HEAD), `unirse`, comentar (P-03 a) y `mis-comentarios`. Las que se abren se comprueban después: GET del muro `200`, GET de comentarios `200`, publicar `201`, borrar el comentario de la alumna `204` y borrar la publicación del maestro `204`, y las dos filas desaparecen. Los archivos se quedan en `archivos-d-r1`, con un almacén en memoria, porque aquí el almacén depende de `STORAGE_*` |
| `gestion-02a-r1` | 675-683 | C-11 | Escritura doble: `personas.maestro` igual a `{ id, nombre }` del asignado | `personas.maestro` igual a `{ id, nombre, email }` del asignado y `personas.maestros` igual a `[ese mismo]`. Además, el cuerpo de "Personas" no contiene ni el id ni el correo del intruso de `clases.maestro_id` (se refuerza lo que se protegía: nada lee `maestro_id`) |
| `backend/test/alumnos-b-r1.ataque.test.ts` | 422-426, 445-466, 477-485 | C-11 | En "Personas", `email`, `@` y el correo del dueño estaban prohibidos; tampoco podían aparecer los correos de los compañeros en las respuestas de "Personas" con `limite=1` | Siguen prohibidos en "Personas", en cualquier profundidad: `estadoPago`, `accesoRestringido`, `correoEnmascarado`, "deudor", "al_corriente" y "restringid". Ahora se exige el correo completo: `maestro` y `maestros` iguales a `{ id, nombre, email }` del dueño, y el compañero restringido igual a `{ id, nombre, email }` (sin más claves), además del correo del deudor. En las otras cuatro peticiones del estudiante (roster, buscador, alta y baja) siguen prohibidos los correos de los compañeros; las dos de "Personas" (las dos últimas) solo se revisan por estado de pago y restricción |

**Lo que no se tocó o no requirió cambio:**
- **C-8:**
  - En `muro-c-r1` y `muro-c-r2`, cada publicación que borra un maestro es suya, y cada comentario que borra un maestro es de una alumna (P-01 b). La carrera de borrar un comentario y su publicación, "borrar no encola" y el alcance con ids de otra clase (`404`) siguen iguales.
  - En `logs-muro-c-r1` y `logs-muro-c-r2`, la maestra borra su propia publicación (`204`) y la alumna borra su comentario por `mis-comentarios`.
- **C-10 en el backend:** ninguna `*.ataque` del backend compara la forma completa de una publicación o de un comentario. El caso de "ninguna respuesta del muro" de `muro-c-r1` prohíbe `rol`, `email` y correos, y eso sigue valiendo con la firma (§D-2B1: el rol nunca sale).
- **C-11 en `logs-*`:** ningún log de los `logs-*` pide "Personas"; los logs no escriben cuerpos.
- **`alumnos-b-r1:1134` y `:1138-1139`** (antes `:1106` y `:1110-1111`) quedan idénticos, como manda A-3.
- `muro-c-r2` › "un cuerpo que no es un objeto…" solo exige `400` en español sin el patrón en inglés, así que es compatible con M-09 ("cuerpo: debe ser un objeto JSON"). `cuerpos-02a-r2` no fija el mensaje de las rutas que normalizan.

### Cambios C-10 y C-11 (dobles del frontend, 02b)
Cada doble suma los campos obligatorios de 02b con su comentario `CLASES-02b ronda 0 (C-n, …)`. Con el esquema actual, zod descarta las claves nuevas, y ninguna aserción cambia.
- **C-10, publicaciones y comentarios:** `autor.administracion: false` (los autores son un maestro y una alumna) y `puedeBorrar`, con el valor de la perspectiva de la prueba:
  - `frontend/src/app/muro-recuperar-c-r3.ataque.test.tsx` y `muro-recuperar-c-r4.ataque.test.tsx`: `FIRMA` nueva (el autor con `administracion: false`); `puedeBorrar: false` en la publicación y en el comentario (vista del estudiante).
  - `frontend/src/features/clases/muro-c-r1.ataque.test.tsx` y `muro-c-r2.ataque.test.tsx`: `AUTOR` y `ALUMNA` con `administracion: false`; las interfaces `PublicacionFalsa` y `ComentarioFalso` suman los dos campos. Las fábricas usan `puedeBorrar: true`, la perspectiva del maestro de la clase: es la que muestra «Borrar» desde CLASES-01, y los dobles se comparten entre las dos perspectivas. Ninguna prueba exige que falte «Borrar» para el estudiante (lo comprobé con `grep`). En `muro-c-r1`, los dos autores en línea del caso "HTML… como texto" suman `administracion: false`. C-13 (02c) ajusta la perspectiva del estudiante cuando el botón salga de `puedeBorrar`.
  - `muro-c-r3.ataque.test.tsx`: vista del estudiante, `puedeBorrar: false`.
  - `archivos-d-r1`, `archivos-d-r2` y `archivos-d-r3.ataque.test.tsx`: `puedeBorrar: true` en la publicación que el maestro acaba de crear (§D-2B3) y `false` en el muro del estudiante. Incluye el doble de "otro protocolo" de `archivos-d-r2`, que sigue fallando solo por la `vistaPrevia`.
- **C-11, "Personas":** `maestros` (1) y `email` en cada persona.
  - `muro-recuperar-c-r3` y `muro-recuperar-c-r4`: `MAESTRO_CON_CORREO`.
  - `features/clases/alumnos-b-r4` y `alumnos-b-r5`: el maestro con `luna@x.mx`, y cada alumno con el mismo correo que su fila del roster.
  - `features/clases/alumnos-b-r1` ("PersonasView descarta…"): suma `maestros`; el correo ya venía en `extra`. El «@» prohibido en la vista lo revisa C-17 en 02d.
- **No hizo falta tocar:**
  - `app/muro-rutas-c-r1`: su muro está vacío.
  - `styles/clases-r1`: no tiene dobles.
  - Ningún otro `*.ataque` del frontend tiene dobles de publicación, comentario o "Personas" (lo comprobé con `grep` de `autor`, `publicaciones`, `comentarios:`, `personas` y `totalAlumnos`).

### `git diff --stat` (paquetes, contra `07c992f`)
```
 backend/test/alumnos-b-r1.ataque.test.ts           | 29 ++++++++++--
 backend/test/archivos-d-r1.ataque.test.ts          | 49 ++++++++++++--------
 backend/test/gestion-02a-r1.ataque.test.ts         | 53 +++++++++++++++++-----
 backend/test/muro-c-r1.ataque.test.ts              |  9 +++-
 .../src/app/muro-recuperar-c-r3.ataque.test.tsx    | 15 ++++--
 .../src/app/muro-recuperar-c-r4.ataque.test.tsx    | 15 ++++--
 .../features/clases/alumnos-b-r1.ataque.test.tsx   |  4 ++
 .../features/clases/alumnos-b-r4.ataque.test.tsx   | 12 ++++-
 .../features/clases/alumnos-b-r5.ataque.test.tsx   | 12 ++++-
 .../features/clases/archivos-d-r1.ataque.test.tsx  | 11 ++++-
 .../features/clases/archivos-d-r2.ataque.test.tsx  | 13 +++++-
 .../features/clases/archivos-d-r3.ataque.test.tsx  | 11 ++++-
 .../src/features/clases/muro-c-r1.ataque.test.tsx  | 40 +++++++++++++---
 .../src/features/clases/muro-c-r2.ataque.test.tsx  | 25 ++++++++--
 .../src/features/clases/muro-c-r3.ataque.test.tsx  | 11 ++++-
 15 files changed, 250 insertions(+), 59 deletions(-)
```
- `git status --porcelain -- backend shared frontend` lista exactamente estos 15 archivos.
- No hay archivos nuevos, ni código de producción, ni pruebas normales.
- Ningún carácter invisible en las líneas `+` (lo revisé por programa).
- Prettier corrió solo sobre estos 15 archivos, desde su paquete: `--write` y después `--check`, "All matched files use Prettier code style!".

### I-1 (PA-07 b), lista cerrada de la corrida final de la ronda 0 de 02b (vale también para 02c y 02d)
Atribución por la última "incoming request" con el mismo `pid` y `reqId`, más el mensaje y la pila del error.

| # | Ruta | Llamada | Origen |
|---|---|---|---|
| 1-5 | `POST /api/auth/login` | "fallo simulado de la base en la búsqueda" (`buscarCredencialesPorEmail` del doble) | `backend/test/intentos-r2.ataque.test.ts` |
| 6 | `POST /api/auth/login` | "fallo simulado de la base al crear la sesión" (`crearSesion` del doble) | `intentos-r2.ataque.test.ts` |
| 7 | `POST /api/clases/:claseId/archivos` | `ZodError` (`invalid_format` de `subida.url`) al armar la respuesta en `handlers/archivos.ts` | `backend/test/archivos-d-r2.ataque.test.ts` › T-39 (almacén malicioso) |
| 8 | `POST /api/clases/:claseId/archivos/:archivoId/descarga` | `ZodError` (`invalid_format` de `url`) al armar la respuesta en `handlers/archivos.ts` | `archivos-d-r2` › T-39 |
| 9 | `GET /api/clases/:claseId/publicaciones` | `ZodError` (`invalid_format` de `vistaPrevia.url`) al armar la respuesta en `handlers/clases/muro.ts` | `archivos-d-r2` › T-39 |
| 10 | `GET /api/prueba/error-comun` | `Error: boom` (`test/salud.integracion.test.ts:29`) | `backend/test/salud.integracion.test.ts` |

- Es igual al I-1 de 02a (10 líneas, mismas rutas y llamadas).
- Las líneas de hoy (`archivos.ts:61`, `:90` y `muro.ts:140`) cambiarán con 02b. Por eso los tres `ZodError` se identifican por ruta y por la respuesta que se arma, no por línea.

### I-2 (pruebas normales fuera de la lista de PA-16 de 02b que contradicen 02b)
1. **`backend/test/gestion-clases-autorizacion.integracion.test.ts`** › "PR-2A23: personas, inscritas, impartidas, unirse y todas las rutas del muro y de los archivos siguen en 403 ROL_NO_PERMITIDO para el admin" (`:369-396`).
   - La contradice C-9: con 02b, el admin pasa en el GET del muro y de los comentarios, en publicar, en los dos DELETE con autoría y en las dos rutas de archivos.
   - Siguen en `403 ROL_NO_PERMITIDO`: `personas`, `inscritas`, `impartidas`, `unirse`, comentar (P-03 a) y `mis-comentarios`.
   - No está en la columna "Cambiar" de 02b: el programador la necesita con la autorización "las de I-2".
2. **`backend/src/core/clases/texto.test.ts`** (PR-2A05). No la contradice ningún C-n, pero M-09 (revisión final de 02a, destino 02b) pide agregarle el caso del arreglo. La revisión dice "ya en PA-16", pero el archivo solo está en la columna "Cambiar" de **02a**, no en la de 02b. Lo dejo aquí para que la autorización no dependa de una lectura.

Busqué además, en las pruebas normales del backend:
- **Términos:** `publicaciones`, `comentarios`, `/archivos`, `personas`, `listarPersonas`, `borrarPublicacion`, `borrarComentario`, `autorDelMuro`, `conTextosNormalizados`, `SELECT_AUTOR` y lecturas de fuentes (`readFileSync`).
- **Resultado:** las demás están en la lista de 02b (`muro.integracion`, `muro-autorizacion`, `archivos.integracion`, `archivos-autorizacion`, `alumnos.integracion`) o no cambian:
  - `alumnos-autorizacion`: el admin sigue en `403` en "Personas", y su búsqueda de "deudor" no choca con los correos `…@pruebas.local`.
  - `movimientos-inscripcion`: solo busca la palabra "movimiento" y los ids.
  - `bloqueo-usuario` E6: `publicaciones.ts` ya está en la lista y no se agrega SQL crudo (V-04).
  - `servicio-ocupado`, `gestion-clases` y `higiene-de-pruebas`: no cambian.
- **Frontend:** no hay I-2. En 02b solo cambian sus dobles (regla de "Dobles del frontend") y su código de producción no cambia.

### Conteos
- `cd backend; npx vitest list > <scratchpad>/list-02b-r0.txt`, código 0: **1703 casos**.
- `npx vitest list --filesOnly`: **142 archivos**, de los cuales **64** son `*.ataque` del backend, con 776 casos.
- Frontend (de la corrida): **104 archivos** y **1396 casos**.
- `*.ataque`: **120** (64 del backend y 56 del frontend). La ronda 0 no agrega casos ni archivos: solo reescribe.

### Corrida final completa del backend (una sola)
**Comando:**
```
cd backend; npm test -- --reporter=default --reporter=json --outputFile.json=<scratchpad>/clases02b-r0-1.json > <scratchpad>/clases02b-r0-1.txt 2>&1
```
Corrió de 16:55:04Z a 16:57:24Z y terminó con código 1. Antes corrí `npm run lint` (código 0) y `vitest list`; nunca hubo otra suite en paralelo.

**Resumen de Vitest:**
```
 Test Files  4 failed | 138 passed (142)
      Tests  5 failed | 1698 passed (1703)
   Start at  10:55:16
   Duration  127.37s (transform 18.17s, setup 8.82s, import 261.56s, tests 866.64s, environment 81ms)
```
- **Última línea literal del archivo:** el pie de error de npm, `npm error command C:\WINDOWS\system32\cmd.exe /d /s /c vitest run --reporter=default --reporter=json --outputFile.json=C:/Users/Carlos/AppData/Local/Temp/claude/…/scratchpad/clases02b-r0-1.json`.
- Hubo 0 `timed out` y 0 "Unable to start a transaction", así que PA-12 no se activó.
- El caso más lento fue `cuentas-r1` › "con la tabla usuarios bloqueada…", con 13.0 s, como en otras corridas.

**Rojos esperados (5), todos casos reescritos que esperan a 02b.** Fuera de esta lista no hay ningún otro rojo, ni de `*.ataque` ni de pruebas normales.
1. `muro-c-r1` › "rol y autoría por la API…": el tercero responde `403 ROL_NO_PERMITIDO` en lugar de `403 BORRADO_NO_PERMITIDO` (`:1371`).
2. `archivos-d-r1` › "…el admin solicita y descarga (C-9)": el admin solicita y recibe `403 ROL_NO_PERMITIDO` en lugar de `201` (`:1025`). Lo negado antes de eso pasó.
3. `gestion-02a-r1` › "personas, inscritas, impartidas, unirse, comentar y mis-comentarios…; el muro ya se le abre (C-9)" (`:345`).
   - La parte cerrada pasó.
   - Las 5 abiertas responden `403 ROL_NO_PERMITIDO`: GET del muro, GET de comentarios, publicar, borrar el comentario y borrar la publicación.
4. `gestion-02a-r1` › "con clases.maestro_id cambiado a mano…": a `personas.maestro` le falta `email` (`:680`).
5. `alumnos-b-r1` › "…en personas con su correo (C-11)…": a `maestro` le falta `email` (`:459`).

### Frontend (después de la del backend)
- **`cd frontend; npm test > <scratchpad>/front-02b-r0.txt`, código 0:** `Test Files  104 passed (104)` · `Tests  1396 passed (1396)`. La última línea literal es `   Duration  171.69s (transform 39.22s, setup 173.84s, import 306.08s, tests 509.00s, environment 788.28s)`.
  - **Rojos esperados:** ninguno en las pruebas. El esquema actual descarta los campos nuevos.
  - Cuando `shared/` gane los campos obligatorios de 02b, los dobles de estas 11 `*.ataque` ya los traen. Las pruebas normales con dobles se completan según "Dobles del frontend" (PA-16).
- **`cd frontend; npm run lint`, código 2.** ESLint pasa, Prettier dice "All matched files use Prettier code style!", y `tsc -b` da **1 error esperado**:
  - `src/features/clases/archivos-d-r2.ataque.test.tsx(491,7): error TS2353: Object literal may only specify known properties, and 'puedeBorrar' does not exist in type …`.
  - **Causa:** es el único doble tipado con un tipo de la API (`PaginaDelMuro`), así que la propiedad de más se rechaza hasta que `publicacionSchema` gane `puedeBorrar` en el paso 13 (PA-05 del programador si sigue en rojo al terminar).
- **`npx prettier --check`** sobre los 11 archivos del frontend: "All matched files use Prettier code style!".

### PA-07
Contado en `clases02b-r0-1.txt`:

| Término | Cuenta |
|---|---|
| `40P01` | 0 |
| `deadlock detected` | 0 |
| `could not serialize` | 0 |
| `too many clients` | 0 |
| `"Error no controlado"` | 10, exactamente I-1 |
| `"code":"P2028"` | 5 |
| (aparte) `Unable to start a transaction` | 0 |

Los 5 `P2028` son de `timeout` (5000 ms), nivel 40, `SERVICIO_OCUPADO`:
- **De `servicio-ocupado.integracion`:**
  - `POST /api/auth/cambiar-contrasena` › `tx.sesion.findFirst()` (`adapters/db/usuarios.ts:293`).
  - `POST /api/auth/refrescar` › `tx.sesion.updateMany()` (`sesiones.ts:72`).
  - `POST /api/clases/:claseId/publicaciones/:publicacionId/comentarios` › `prisma.$queryRawUnsafe()`.
- **De `cuentas-r3`:**
  - `POST /api/auth/login` › `tx.sesion.create()` (`sesiones.ts:39`).
  - `POST /api/auth/restablecer` › `tx.tokenCuenta.updateMany()` (`tokens-cuenta.ts:116`).

Son exactamente los permitidos. El **control positivo** está presente: aparecen los tres de `servicio-ocupado`, cada uno con su ruta, y también los dos de `cuentas-r3`. **PA-07 limpia.**

### Observaciones (no son hallazgos; las decide el manager)
- **O-01 (caso fuera del texto del inventario):** `muro-c-r1` › "rol por la API" afirmaba que el estudiante recibe `403 ROL_NO_PERMITIDO` al borrar el comentario de otro por la ruta general.
  - Ningún C-n describe que el **estudiante** entra a esa ruta. C-8 habla del maestro y C-9 del admin.
  - Lo contradicen la tabla de §D-2B3 ("estudiante, maestro, admin · inscripcion, con `puedeBorrar`") y la matriz de "Autorización" ("Solo los suyos").
  - Lo reescribí citando C-8, que es el cambio de autoría del mismo borrado. Si el manager prefiere otro C-n, el cambio es el mismo.
- **O-02 (perspectiva de `puedeBorrar` en los dobles compartidos del frontend):** en `muro-c-r1` y `muro-c-r2` (frontend), las fábricas sirven a las dos perspectivas y llevan `puedeBorrar: true` (la del maestro).
  - En 02b no cambia nada, porque la vista todavía decide por el rol.
  - En la ronda 0 de 02c (C-13), los casos con `renderMuro("estudiante")` deberán recibir `false` donde corresponda.
- **O-03 (contratos que fijan las pruebas reescritas; salen de §D-2B3, §D-2B4 y la matriz; si la implementación difiere, el rojo es del programador, PA-05):**
  - **Borrado de comentarios por la ruta general:** si un estudiante inscrito intenta borrar el comentario de otro, la respuesta es `403` con código `BORRADO_NO_PERMITIDO` y no se borra nada.
  - **Archivos del admin:**
    - `POST /api/clases/:claseId/archivos` del admin responde `201` y deja una fila `pendiente` con `subidoPor` = el id del admin.
    - `POST …/archivos/:archivoId/descarga` del admin responde `200` con una URL firmada para `GET`.
  - **El admin en el muro:**
    - GET del muro y de los comentarios: `200`.
    - Publicar un anuncio sin adjuntos: `201`.
    - DELETE del comentario de una alumna: `204`. DELETE de la publicación de un maestro: `204`.
    - Comentar: `403 ROL_NO_PERMITIDO`. `mis-comentarios`: `403 ROL_NO_PERMITIDO`. "Personas": `403 ROL_NO_PERMITIDO`.
  - **"Personas" para un alumno:**
    - `maestro` y cada elemento de `maestros` son exactamente `{ id, nombre, email }`, con el correo completo del maestro asignado (nunca el de `clases.maestro_id`).
    - Cada alumno es exactamente `{ id, nombre, email }`.
    - Ni `estadoPago`, ni `accesoRestringido`, ni `correoEnmascarado` en ninguna profundidad.
- **O-04 (I-2 de `texto.test.ts`):** ver I-2, punto 2. Solo es una duda de autorización, no un cambio de comportamiento.

### Archivos
- **En el repositorio:** las 15 `*.ataque` de la tabla, marcadas "cambia: ronda 0 de 02b".
- **En el scratchpad** (`C:/Users/Carlos/AppData/Local/Temp/claude/c--Users-Carlos-Documents-Proyecto-PlataformaEducativa/0674b697-54d2-4eb4-ad9a-7234f1426d63/scratchpad/`):
  - `tabla-02b-r0.md` (la tabla)
  - `clases02b-r0-1.txt` y `clases02b-r0-1.json` (la corrida del backend)
  - `front-02b-r0.txt` y `front-lint-02b-r0.txt` (frontend)
  - `lint-02b-r0.txt`
  - `list-02b-r0.txt` y `list-02b-r0-files.txt`
  - `base-02b.txt` y `actual-02b-pre.txt` (V-01)
  - `actual-02b-r0.txt`
  - `pares/` y `reemplazar.mjs` (los reemplazos aplicados, cada uno con su ancla literal y su número exacto de apariciones)
  - `pa07.mjs` (la atribución de PA-07)

### Tabla de SHA-256 de las 120 `*.ataque` después de la ronda 0 de 02b (base de V-01 del programador; cambian 15, marcadas)
| SHA-256 | Archivo | Cambio |
|---|---|---|
| `BCCE2CAE771F97957D8691BEF7FFF4EC42412DAAEABF726AEB0AFC59F6F25671` | `backend/src/config/correo.ataque.test.ts` |  |
| `DCB78D222544E8DC4FBECE59468F555B04ABE971B70016E9BB17FCAE3E958580` | `backend/src/config/env.ataque.test.ts` |  |
| `71E7F049447D2D1ECEDD897C55EA0B6D31221753F0A7E7473C7AC6E8667F0A95` | `backend/src/config/logger.ataque.test.ts` |  |
| `91F620C1A27778EEBC2BED5EEC1BC9B0E3FE1199B32ED00F9DD910011D6A1805` | `backend/src/core/clases/codigo-r1.ataque.test.ts` |  |
| `262691F5786AD63B2393D0BA5FF97538F6DACF43343BED019AD23C12A07D8686` | `backend/src/core/clases/codigo-r2.ataque.test.ts` |  |
| `E769CBFCC3A83A64B51C6437F80684640A7C928AD6B8C5C1671FDFF005D7B734` | `backend/src/workers/ritmo-03c-r1.ataque.test.ts` |  |
| `388AD0E585639B8C3E0E0A6657FB42C1B9CB83DB721C4863C4FA19E0BE42EC85` | `backend/test/admin-unico.ataque.test.ts` |  |
| `D2CC28B62BF988AE14BA975A9BC8D534AEC0EEBCE30DA93D7DED9A26026B0857` | `backend/test/alumnos-b-r1.ataque.test.ts` | cambia: ronda 0 de 02b |
| `00346D471355ABC7971B921649E7192B8987FE27912C00CB7E41AEF2065369E9` | `backend/test/alumnos-b-r2.ataque.test.ts` |  |
| `FC11AB4B914D4A88612953F82DB354E2B9CEA9BEF86E24321EF7E031F3AC3837` | `backend/test/alumnos-b-r3.ataque.test.ts` |  |
| `441A766A94E7D9B26807790402E06ED94D4CC378D8F6ECF0BCCC3259C7FF55FB` | `backend/test/api-real.ataque.test.ts` |  |
| `D9E1DE5B1BD43F54CF3A4DCF153D1EEABDC36B4DEC02FBEB9D8A0239F298DFE9` | `backend/test/archivos-d-r1.ataque.test.ts` | cambia: ronda 0 de 02b |
| `1637EB447CD12AC5BDDDC7634980DBC10A25CBAD5DE01BF6C09F40ED930FF1A9` | `backend/test/archivos-d-r2.ataque.test.ts` |  |
| `42BB7BF3086230C6EDC65AB73976AC8A801956336561AADBEE65CC3B40EB8612` | `backend/test/arquitectura-cuentas-r1.ataque.test.ts` |  |
| `38ADB0984744A0810287711F57BA0498287D0BC96344B8948BA1C490CA807716` | `backend/test/arranque-r1.ataque.test.ts` |  |
| `2C83D82D10BDD9B7A969768774D75B18B7A71A594BBAAC5FAE36A0E134D2336C` | `backend/test/auth-login.ataque.test.ts` |  |
| `73D3A2AE708A0EF676547A8094115B1419423057378387269BC3EADB34C7724E` | `backend/test/auth-registro.ataque.test.ts` |  |
| `95BBA9BAC44366AD5A361E93DD2F278CB0A1CC889FA479049ACC7B45A9A5E71B` | `backend/test/clases-r1.ataque.test.ts` |  |
| `A87817D56C236C0BA3597214CAC23B10483BBC28AE44800C592ED5CE2EF97F38` | `backend/test/clases-r2.ataque.test.ts` |  |
| `72DE7D8AF3D3F772ABC19DB065F6E418F6EB76CE78D87FE6EBB51335FC99825A` | `backend/test/clases-r3.ataque.test.ts` |  |
| `BE97C4E48AC9551BED1D01552E90AB8CDF085CF928AE6C8C3D81809E35F7CE62` | `backend/test/clases-r4.ataque.test.ts` |  |
| `000EC9008C73D25121C82A46F5EA0F67E6C8C387CB04E361EF82812B57956098` | `backend/test/concurrencia-02a-r1.ataque.test.ts` |  |
| `530546B4D70A2B9AD36F98F37E2AF45480E81A1101EE3516D15426F78350BF82` | `backend/test/cuentas-03a-r1.ataque.test.ts` |  |
| `6303DDC170545F616C66773C3F5475CB3BE1FEA9347D8059354D6ADE8D676C16` | `backend/test/cuentas-r1.ataque.test.ts` |  |
| `3A4E81C111B8EEB7DF065804AA85062FA3FC607F0147149B71AC21C14E7818D9` | `backend/test/cuentas-r2.ataque.test.ts` |  |
| `F54F79F7B2A83E95FE440053CCAF15CB3EBB01CE5DFD4C6655E22159A5FD7E6B` | `backend/test/cuentas-r3.ataque.test.ts` |  |
| `A2F9BFF596330A7D55D1CA9D47197FC831EB132F52C759610E2D667895C3332F` | `backend/test/cuerpos-02a-r2.ataque.test.ts` |  |
| `D7A9DA854CE8AB8AD8D2437DB2E8C2A642A777EA3261A6B038DA28BE022DF848` | `backend/test/enlaces-03b-r1.ataque.test.ts` |  |
| `DC1B7EE7EA58966F5DB33CCB4581885A9669DEA2263954AE46D17A83E1EF6EAF` | `backend/test/enlaces-03b-r2.ataque.test.ts` |  |
| `B051B1986496E35E3E306C4C6BC306A763542BCA4B350574D0C02E2C484DEB35` | `backend/test/enlaces-ch-r2.ataque.test.ts` |  |
| `D28CC4DE621A680E6B54B2BFF889700300D558EC7849717584518D2F03EC8CAE` | `backend/test/entorno-ch-r1.ataque.test.ts` |  |
| `BA1AC9B17CC9BF747522BD4EC8B87DF436008482E643B18EEA8E9A8C041C59B3` | `backend/test/formada-ch-r1.ataque.test.ts` |  |
| `EC9602D5F109B45A6D428E708D9B6CDD37A7509A6FF9031FA6FD8A2DA0E25E9B` | `backend/test/gestion-02a-r1.ataque.test.ts` | cambia: ronda 0 de 02b |
| `5F4133F949D2F337A8F63B75CF82CB77114DB7812D67C1960105F5000C31A326` | `backend/test/guarda-ch-r1.ataque.test.ts` |  |
| `7A7DAC6D87EDF81059FCFF9C07471AAF49D690EC159BE4B9FD4AA32B0909A215` | `backend/test/guarda-ch-r2.ataque.test.ts` |  |
| `610EE44E5D0BCEA46EB4E3645F9ADF1998A76947A25AF7E3F8248EA3A633DF79` | `backend/test/guarda-ch-r3.ataque.test.ts` |  |
| `E5D149F3AC52B726E1FE08908249706341330F88EAA6674B9A9AC67B98B1E864` | `backend/test/guarda-clase-r1.ataque.test.ts` |  |
| `C979D2C9C420A2177FA6EBDDB78EB2CE84D5F043B94270F690916A6FC75D6F8F` | `backend/test/guarda-clase-r2.ataque.test.ts` |  |
| `20982E2B98F1B162146A211923F3D5EC19D4E170C4AA3A5BFC6F82C3B6173AAD` | `backend/test/guarda-r2.ataque.test.ts` |  |
| `A8B79D5AD98270BE3747F493865708A78BB73ADD08D832584DB4464C3582777A` | `backend/test/intentos-r2.ataque.test.ts` |  |
| `2619B44EEA3370494C95AC128FCFD9E3FFC20D1581A19F549BF371F603A11D7D` | `backend/test/invitacion-flujo-03a-r2.ataque.test.ts` |  |
| `704155928183AEC193AE7E157B86B3E9361D2B63C7A47BE1ED859605FAB4FFA6` | `backend/test/invitacion-masiva-03c-r1.ataque.test.ts` |  |
| `DD9B7454E8786BF0B833D265900CCAECF595808CEBC8E9A77C9AEF15298A1038` | `backend/test/invitacion-masiva-03c-r2.ataque.test.ts` |  |
| `F9F9EC59EC8D1A5CCB180522798140C45604440F48EDCD68A3E02863D90AE347` | `backend/test/logs-02a-r1.ataque.test.ts` |  |
| `BD8B303C434EFEC0785E0691D31D6F6E87DBF3305F50FA27CCE0F78CBB251E3A` | `backend/test/logs-03a-r1.ataque.test.ts` |  |
| `B58D5D013658433FE5839634E2DB5A31B8D2B8F69587BC36958752D3CD33BBF7` | `backend/test/logs-03b-r1.ataque.test.ts` |  |
| `0E4ABF3BC5D92FA0C380805453190703862567930DD74B9E7FCC1809564D181F` | `backend/test/logs-03c-r1.ataque.test.ts` |  |
| `1E775A19682F3A5995D7C035BCC810A36BF50C22045B6FFBFC5A98B821255DB0` | `backend/test/logs-archivos-d-r1.ataque.test.ts` |  |
| `E9CE866D511E3EE6029015B74E20B4D342A60BE99B3AAC97E86F00283A3C77F1` | `backend/test/logs-archivos-d-r3.ataque.test.ts` |  |
| `E008935B107752D203F6423B2F1C9E0F5A4339F0A77154746BF262CECB90351A` | `backend/test/logs-cuentas-r1.ataque.test.ts` |  |
| `690E30ED39111C0A074FC159015967CD9F0FDC24D9A340E6A0D7BE4B980A9D45` | `backend/test/logs-muro-c-r1.ataque.test.ts` |  |
| `0809C60700E26183E7771B4B1A40B05CBF554C2ED7929190CF4D89A52722E551` | `backend/test/logs-muro-c-r2.ataque.test.ts` |  |
| `5AF3909E4B7CA485E78979567872EA78BF41E6D679B9EC2C761EAA0B250DF689` | `backend/test/logs-r2.ataque.test.ts` |  |
| `AE66FBCF60E8F66336E77C1055893E60CB85A01BC746B89C68A4D2C70C807AF1` | `backend/test/muro-c-r1.ataque.test.ts` | cambia: ronda 0 de 02b |
| `7825CFC9B484DF740FA0E9562A195D1BBCAF4CAF72EA55FA847B5394AB96C125` | `backend/test/muro-c-r2.ataque.test.ts` |  |
| `8B733B86FC6D54ECE008389A59793FAE4EC4A65146EB37215E900E50A5337D46` | `backend/test/nombres-guarda-r3.ataque.test.ts` |  |
| `00A6EB6F7CCD7D8790C356BEFCC96DDFDA6EACCE0BE53DE255CFE3626D8F2ADB` | `backend/test/nombres-tokens-r2.ataque.test.ts` |  |
| `80B5A848F69B429E7DADEC86C07BEC1D3E3EED8A042EFBA41CE912DED39E7BAB` | `backend/test/nowait-ch-r1.ataque.test.ts` |  |
| `6F2ABC2CEFD77D74CD1E3ABBDCE9C41BB53D00BD4D8E5BA7E496C4441C2697E5` | `backend/test/servicio-ocupado-ch-r1.ataque.test.ts` |  |
| `3B2D94ABCCBEDD6FB53CF666AAD06ADF431A0DB9A09264F05D8ADF6963CBD0AE` | `backend/test/sesiones-y-cadena.ataque.test.ts` |  |
| `70AC720F2E7FCADEE5BBCB6414887AB08129DEA7CD91DF012046953B1584E8B6` | `backend/test/sexto-paso-02a-r1.ataque.test.ts` |  |
| `F09E9A0038C47D1A2223376A0AF260BAF573F0C45BF770201C48C9E30296F04B` | `backend/test/worker-03c-r1.ataque.test.ts` |  |
| `9F60F9D65D52D2021A1EB04E9F01D3CC68F22744C845BF93D6621AA4FE9713A8` | `backend/test/worker-r1.ataque.test.ts` |  |
| `77D11BD85F202A9EEC92A363DF82E63FB9A784CA9D368D49F62E61C1A2AA967B` | `backend/test/worker-r2.ataque.test.ts` |  |
| `B89EDE0F6AED45DFCB5E64C8909A822156CE43FD80948E72419CDCE9D4541A87` | `frontend/src/app/cache-03a-r1.ataque.test.tsx` |  |
| `E85743C0FBB8E476874A2C67334342D8D69D14153579FC1E4CCE0AE6E2B29616` | `frontend/src/app/contexto-r1.ataque.test.tsx` |  |
| `BC2BE5541006887E2A5A4A89B33046180F607D54474B0F96A73D615AFBCAC385` | `frontend/src/app/contrasena-r1.ataque.test.tsx` |  |
| `F38BCACB716D8A39ACDB3535A95603CD0D8AB02572CA57A7DF5268B01CEB6EAC` | `frontend/src/app/contrasena-r2.ataque.test.tsx` |  |
| `68FB5D092C0C8ECFCF282477EF023AAAE26F6B869656E05109DC3EFA276D842A` | `frontend/src/app/cuentas-r1.ataque.test.tsx` |  |
| `41930017715D3D6869DC7ACEFD75DE8EC3684F1F035B845ABDF8EC0F6B734DEE` | `frontend/src/app/cuentas-r2.ataque.test.tsx` |  |
| `1506C27E5F7418B5E087FD30F8809645A2FC3E2761C7249DE78F02E24AA6C7A5` | `frontend/src/app/en-espera-r1.ataque.test.tsx` |  |
| `DB48DAD405C27062621A44D3744C84CC5903892A51E5A8DF18F41383CB9C88A3` | `frontend/src/app/errores-r1.ataque.test.tsx` |  |
| `F95321E604E20B533EBF2DB3C1C6C66BA2F2D87A48F075415B766551F6EE30F4` | `frontend/src/app/fondo-r1.ataque.test.tsx` |  |
| `76B256114128377B6A793CAB882D031FB10785076728F8058E0FF1D93A7E9F64` | `frontend/src/app/marco-r1.ataque.test.tsx` |  |
| `D32E1C5B5629C37D2521446D7E578CDB081DD71F5B5026E73E13C58E16D92801` | `frontend/src/app/muro-recuperar-c-r3.ataque.test.tsx` | cambia: ronda 0 de 02b |
| `BEC7B7B49E056AFE514F654FCA9C562D77A090F7421057B8B03D57D4E862140A` | `frontend/src/app/muro-recuperar-c-r4.ataque.test.tsx` | cambia: ronda 0 de 02b |
| `2F8056A770397C1601647277944555A48AFC4B9A2BABEB75E5898F0CC92562BB` | `frontend/src/app/muro-rutas-c-r1.ataque.test.tsx` |  |
| `3267D093574AA792529D8E9311DEBFC651F519EB33F8EF9C369EB2C4C6180389` | `frontend/src/app/registro-maestro-03b-r1.ataque.test.tsx` |  |
| `053E867A904AFA3C09EEF92CA2E03E929D9F9C93F714040856F40C7418721BBE` | `frontend/src/app/router.ataque.test.tsx` |  |
| `ADF9E1CFD151E030C6B275A47A5C41F68F46BAEDF880A989676151DCACE5A1B3` | `frontend/src/app/rutas-clases-r1.ataque.test.tsx` |  |
| `F090CBD8E8C9B0AF52D4FC19547B07E9B6413F5414CC4B10862F01E29818DDDC` | `frontend/src/app/sesion-r2.ataque.test.tsx` |  |
| `B16D9B4376FA719F6DA04745FF701F24FA20159B1AA7904C6C9424D2475EA871` | `frontend/src/components/layout/estatico-r1.ataque.test.ts` |  |
| `0AAA18CD70465293B6FCA6CC051B8E4AC360A838D02FEDE848C35376C3D0066C` | `frontend/src/components/layout/pie-r1.ataque.test.tsx` |  |
| `00A707429AF6B5326F9A96DEF6382823CF4A6A092AAC7E7BD7CBCB8DC9AA1D21` | `frontend/src/components/layout/pie-r2.ataque.test.tsx` |  |
| `472E1F46D0C899496AA334909B02988962AAB07B9BD29A8D7B8AF3987FAC6C76` | `frontend/src/components/layout/pie-r3.ataque.test.tsx` |  |
| `385123D69F8C6411027C5B7DB2E52E62146C0DB54CFFDA3C27BD6B450FE2AF27` | `frontend/src/components/ui/badge-03b-r1.ataque.test.ts` |  |
| `86ADAA9A093A987DAFD97E279E600211CBDF6CEF97879D16FA2D8A9D2846F8B5` | `frontend/src/features/admin/cuentas-r1.ataque.test.tsx` |  |
| `B948E9359FD3981E08B850540027F536F345A3F48D7C0749BA0C16C2C1DF1184` | `frontend/src/features/admin/cuentas-r2.ataque.test.tsx` |  |
| `72BF9AF4CE8F52A114897E038CEFB0947841A37F74074F4C5F8DEC68A71B654A` | `frontend/src/features/admin/cuentas-r3.ataque.test.tsx` |  |
| `942DF3015424AED56E83661993BA015E871CD6BE8E797920D47E8CBF0C56EAC4` | `frontend/src/features/admin/cuentas-r4.ataque.test.tsx` |  |
| `3BD26E7E3BF019D462DB4837861ED22017BBB9E9A6276720BF0DEA6C2B5B0998` | `frontend/src/features/admin/en-espera-r1.ataque.test.tsx` |  |
| `8219C864E7BDC1315E6A0F0FF1CD6F54E4710CEBDCEB8E316F4E53AACC0CFF35` | `frontend/src/features/admin/foco-r1.ataque.test.tsx` |  |
| `30F45BBA30D9348EC1587B42E84CA370274E1BF0AF0F310B8A6BBD79FA982669` | `frontend/src/features/admin/maestros-03b-r1.ataque.test.tsx` |  |
| `D477A809E55E603D3EF6C02CA43B21372B75D0947FA303F1539D48BDF32841F8` | `frontend/src/features/admin/maestros-03c-r1.ataque.test.tsx` |  |
| `3CEDA51DB8F67F40C26615FBC4CD7D082035B00F38713C6CA4C7DB58E47926C8` | `frontend/src/features/auth/enlace-r1.ataque.test.tsx` |  |
| `1F5D1147637C09DAA6FDF1384E4395EDD69DFDAB84AAE5D602A362DABD3295BD` | `frontend/src/features/auth/enlace-r2.ataque.test.tsx` |  |
| `991B115524D8DADE8D6EA2C51FB753DC8832EE410DB2161A0CE761D011CFCA4A` | `frontend/src/features/auth/invitacion-r1.ataque.test.tsx` |  |
| `25375E6678BA9B5331D53B78031BD315A8651F16CD32571E9FCEE539D07C5BA8` | `frontend/src/features/clases/alumnos-b-r1.ataque.test.tsx` | cambia: ronda 0 de 02b |
| `55DC274ECA96DA4360848B88F9F2A839AC815031490AB57FF38DE074512D632C` | `frontend/src/features/clases/alumnos-b-r2.ataque.test.tsx` |  |
| `371518E4309F14201A92D29F9436A97A19801B506D45114964FBCFE3F5CD4183` | `frontend/src/features/clases/alumnos-b-r3.ataque.test.tsx` |  |
| `266D088DD727F18AF8C8A106B8D9C4DBED75753E4B1B4ABB12F3A4DF870ECB7F` | `frontend/src/features/clases/alumnos-b-r4.ataque.test.tsx` | cambia: ronda 0 de 02b |
| `856CFFBD9C743F9815DAF731487E29DC5F5272545DC15820A70BAF86ECFA6527` | `frontend/src/features/clases/alumnos-b-r5.ataque.test.tsx` | cambia: ronda 0 de 02b |
| `1E9A26ED86EE637E1A2E065DC05DA79CBB5048E18A020285D6B479FD290BCC9C` | `frontend/src/features/clases/archivos-d-r1.ataque.test.tsx` | cambia: ronda 0 de 02b |
| `EFC07CC006E16E03BEEC69A17E08AED83657095555107B28FB1AB3EF1400E687` | `frontend/src/features/clases/archivos-d-r2.ataque.test.tsx` | cambia: ronda 0 de 02b |
| `E01A46173F2820F0AF15824C88AA81805412B70248062F419DD40236C9EED7E3` | `frontend/src/features/clases/archivos-d-r3.ataque.test.tsx` | cambia: ronda 0 de 02b |
| `89C9522AB1947038E66F398E8E5C40A1A9BF4E872A16C34877C6432AC38402E5` | `frontend/src/features/clases/clases-r1.ataque.test.tsx` |  |
| `4ED2A5582C3DF7A29C62F9E1D458141AB104DD13A16B3C496634EB092948AA71` | `frontend/src/features/clases/clases-r2.ataque.test.tsx` |  |
| `146C9B3080709DAEA23B0500B0014C64DF1D5C2412510014CF79AA05E8CD84FC` | `frontend/src/features/clases/clases-r3.ataque.test.tsx` |  |
| `50BF79FE51B26A896008E6D39B39DA7510EBEB82EAA5EA8BEF76748E11FDCC96` | `frontend/src/features/clases/clases-r4.ataque.test.tsx` |  |
| `CDD1ED8890859AE3E884822FC7074852A2173105114745D83FE9A15C1C47C626` | `frontend/src/features/clases/estatico-r1.ataque.test.ts` |  |
| `7C434A0E54E70B12D4B2A3DE22FFB4DBF5F28A1CFBD2290C22E8A2B59EDF0E16` | `frontend/src/features/clases/inicio-sin-datos-r2.ataque.test.tsx` |  |
| `CA9841009613CF24BA8934EF37CC0B46BF1926F8E354BC4444AB1B2C86E1525B` | `frontend/src/features/clases/muro-c-r1.ataque.test.tsx` | cambia: ronda 0 de 02b |
| `5549F40CACD53F06847CA01C9439991BDD50024ED646086D67C1F2DB59A4C36C` | `frontend/src/features/clases/muro-c-r2.ataque.test.tsx` | cambia: ronda 0 de 02b |
| `73523416AE3F04A4AE4DB25685E2C9A5BA8EB3DB015225DFEDC76EDF5D75958F` | `frontend/src/features/clases/muro-c-r3.ataque.test.tsx` | cambia: ronda 0 de 02b |
| `C71CBA65DD284D7AF11CBC812B6BCF75BAA373939EDB8318E731858D9C50173F` | `frontend/src/lib/format-d-r1.ataque.test.ts` |  |
| `89DBBB70D5DC404C3D74DB5391D10855C8CB1D6B4C643B6147B3CE6FFB2637AF` | `frontend/src/lib/format-d-r2.ataque.test.ts` |  |
| `BFA7DED62F7A1402590D438A1CC51060A63FA019AD47D3EB5740E43383064A2A` | `frontend/src/lib/format-d-r3.ataque.test.ts` |  |
| `10C730348D18FF8DAE7B3623751D31122AA58560B564AD191717FA1938A6F8CE` | `frontend/src/services/apiClient.ataque.test.ts` |  |
| `C1F4B160D3BE549340F771F3E225721E3776F7A53EA2A653A5A91A2E297BEE93` | `frontend/src/styles/clases-r1.ataque.test.ts` |  |
| `B8085BCBBC7F4B6276BF3A87FB7BA0BC887953A8C6CE372354A7F3F1B5037582` | `frontend/src/styles/tokens-r1.ataque.test.ts` |  |

## CLASES-02b — Ronda 1

# Reporte del Tester — CLASES-02b · muro del admin, autoría, archivos y "Personas" — Ronda 1
Veredicto: **RESISTE**
Verificación propia: lint `cd backend; npm run lint`, código 0 (última línea `> tsc -p tsconfig.json --noEmit && tsc -p tsconfig.test.json`) · test: 3 corridas completas seguidas, las tres `Test Files  147 passed (147)` · `Tests  1746 passed (1746)`

Fecha: 2026-10-05. Ataco la implementación de 02b (`resumen-programador.md`, "CLASES-02b — Implementación"), con el resumen ya aceptado por el manager (`revision.md`, línea 516).

### Precondiciones
- **V-01:** las 120 `*.ataque` contra mi tabla de la ronda 0 de 02b: **120 de 120 iguales**. El programador no tocó ninguna y no hay ninguna sin rastrear.
- **PA-01:** la red es `uacam5 2`, aceptada por el humano solo para hoy. La regla del firewall está habilitada y Docker respondió (28.5.1).
- **Procesos ajenos:** no había ningún proceso `node` corriendo. Nadie más corrió pruebas.
- **Archivos nuevos (solo míos):** `backend/test/autoria-02b-r1.ataque.test.ts` (12 casos), `backend/test/admin-muro-02b-r1.ataque.test.ts` (10) y `backend/test/logs-02b-r1.ataque.test.ts` (2), 26 casos en total contando los `it.each`.
  - No modifiqué ningún otro archivo.
  - Prettier, ESLint y `tsc -p tsconfig.test.json` pasan sobre los tres.
  - No hay caracteres invisibles: los de las pruebas van como escapes.
- **PA-09:** los tres archivos pasaron aislados (después de corregir dos supuestos míos, abajo) y en las tres corridas completas.

### Hallazgos
Ninguno.

### Atacado sin hallazgos
- **Autoría, actor por autor y por tipo, contra un oráculo propio escrito desde la matriz del plan y §D-2B3** (`autoria-02b-r1` › `it.each` con 8 actores).
  - **Clase y autores:** una clase con dos maestros, M1 y M2. Un tercer maestro, MR, estuvo asignado, publicó y comentó, y fue **retirado por la API** antes de que entrara M2. Hay publicaciones de M1, M2, MR y el admin, y comentarios de dos alumnas y de M1, M2 y MR, incluidos comentarios de alumnas bajo la publicación del admin.
  - **Actores:** las dos alumnas, M1, M2, el admin, un maestro de otra clase, MR y una alumna no inscrita.
  - **Lo negado:** cada `DELETE` respondió lo del oráculo (`403 ROL_NO_PERMITIDO`, `403 SIN_ACCESO_A_LA_CLASE` o `403 BORRADO_NO_PERMITIDO`, este con el cuerpo exacto). Lo negado no cambió la huella de la clase (publicaciones, comentarios con texto y archivos con estado).
  - **Lo permitido:** respondió `204`. Al borrar la publicación de M2, su archivo pasó a `descartado` con `publicacionId: null`.
  - **`puedeBorrar` de las listas** coincide con el resultado real del `DELETE`, elemento por elemento, en los 12 elementos y para los 5 actores con acceso.
  - Los de fuera reciben `403 SIN_ACCESO_A_LA_CLASE` también en las listas.
- **Quien sale y vuelve:**
  - El alumno dado de baja no borra su comentario: `403 SIN_ACCESO_A_LA_CLASE`, por la ruta general y por `mis-comentarios`. El comentario sigue, con su nombre, y el maestro lo ve con `puedeBorrar: true`. Dado de alta otra vez (por el admin), lo ve con `propio` y `puedeBorrar` en `true` y lo borra.
  - El maestro retirado no borra lo suyo (`403 SIN_ACCESO_A_LA_CLASE`). El que se queda tampoco: `403 BORRADO_NO_PERMITIDO` y `puedeBorrar: false`. El admin sí. Asignado otra vez, lo borra él.
- **Sin oráculo fuera de la clase:** un comentario o una publicación de otra clase, aunque la alumna esté en las dos y aunque el actor sea el admin, responde idéntico a un id inexistente (`404`), nunca `403 BORRADO_NO_PERMITIDO`, y no se borra nada.
- **Carreras:**
  - Borrar su publicación mientras el admin lo retira, en 8 rondas: solo hubo `204` con la publicación borrada, o `403 SIN_ACCESO_A_LA_CLASE` con la publicación intacta. Nunca `500` ni un estado mixto, y el retiro siempre dio `200`.
  - Alumno y maestro borran el mismo comentario a la vez, en 6 rondas: siempre `204` y `404 COMENTARIO_NO_ENCONTRADO`.
  - El admin borra la publicación mientras una alumna la comenta, en 8 rondas: el borrado siempre dio `204`, el comentario `201` o `404`, y nunca quedó un comentario huérfano.
- **Firma "Administración"** (`admin-muro-02b-r1`):
  - **Dónde:** anuncio en una clase y material con adjunto (subido por el admin) en otra. La revisé en la respuesta de crear, en las listas de la alumna, del maestro de cada clase y del admin, en los comentarios y en los `403 BORRADO_NO_PERMITIDO` de los maestros.
  - **Firma:** siempre `{ id: <id real del admin>, nombre: "Administración", administracion: true }`. `puedeBorrar` es `true` solo para el admin.
  - **Lo que nunca aparece:** el nombre real del admin, su correo, una clave `rol`, `email`, `subidoPor`, `claveObjeto` o `estadoPago`, ni el valor `"admin"`.
- **Nadie finge la firma:**
  - Un maestro y una alumna que mandan `autor`, `administracion`, `autorId: <id del admin>`, `rol: "admin"` y `puedeBorrar` en el cuerpo publican y comentan a su nombre, con `administracion: false`.
  - Un maestro y una alumna llamados "Administración" salen con ese nombre y `administracion: false`, como acepta el plan.
  - No queda ninguna fila con el admin como autor.
- **El admin no comenta:**
  - `POST …/comentarios`, también con el `claseId` en mayúsculas y sobre su propia publicación, responde `403 ROL_NO_PERMITIDO`. `PUT` y `PATCH` no dan ningún 2xx, y `mis-comentarios` responde `403 ROL_NO_PERMITIDO`.
  - El GET y el HEAD de los comentarios sí le responden (`200`, HEAD sin cuerpo).
  - No se escribió ningún comentario suyo.
- **El admin y una clase inexistente:** leer, publicar, borrar, leer comentarios, borrar comentario, solicitar y descargar responden `403 SIN_ACCESO_A_LA_CLASE`, y comentar `403 ROL_NO_PERMITIDO`. No se escribe ni se firma nada.
- **Archivos del admin:**
  - Rechazo con `400` y sin escribir fila ni firmar: tamaño 0 o de 25 MB + 1, tipo no permitido, extensión que no corresponde, `../`, U+202E, nombre de 256 caracteres y `constructor`. 25 MB exactos dan `201`.
  - No publica con el archivo de un maestro, con uno suyo de otra clase, con uno suyo vencido (25 h) ni con uno sin subir: responde `400`, sin publicación, y los cuatro siguen `pendiente`.
  - La descarga cruzada entre clases responde `404 ARCHIVO_NO_ENCONTRADO`; la propia, `200`.
- **Contenido visible y máximos en lo que publica el admin:**
  - Sin visibles, `U+202E` o `U+0000`: `400` con el mensaje del campo.
  - Los límites: 5,000 / 5,001 caracteres, 5,000 emojis / 5,000 emojis + 1, título de 200 / 201 emojis.
  - Un texto con CRLF se guarda recortado, con LF y con `autorId` = el admin.
- **Encolado:** el anuncio y el material del admin dejan un trabajo cada uno en su cola, con exactamente `{ publicacionId, claseId }`, sin el id, el nombre ni el correo del admin, sin el texto y sin la firma.
- **M-09 en las cinco rutas que normalizan:**
  - **Rutas:** publicar (como maestro y como admin), comentar, crear clase y editar clase.
  - **Cuerpos:** `[]`, `[válido]`, `[válido, válido]` y `[["texto"]]`.
  - **Arreglos:** todos responden `400 VALIDACION` con "cuerpo: debe ser un objeto JSON".
  - **Objeto anidado en cada campo de texto:** `400` en español.
  - **Escritura:** nada se escribe.
- **"Personas":**
  - **Escenario:** dos maestros; un alumno al corriente, uno deudor, uno restringido y deudor, uno inactivo y uno quitado; un alumno y un maestro de otra clase.
  - **Desde la alumna y desde un maestro de la clase:**
    - `maestros` trae exactamente `{ id, nombre, email }` en el orden de S-05, y `maestro` es el primero.
    - `alumnos` trae exactamente los tres de la clase con su correo completo, y `totalAlumnos` vale 3.
    - Nada de `estadoPago`, `accesoRestringido`, `correoEnmascarado`, `activo`, `rol`, `origen` ni `inscritoEn`, ni los valores "deudor" o "al_corriente".
    - Nunca aparecen el inactivo, el quitado, los de otra clase ni el correo del admin.
    - El recorrido con `limite=1` trae los dos maestros en cada página y los tres alumnos sin repetir.
  - **A quién se le niega** (ninguna respuesta trae un correo):

    | Quién | Respuesta |
    |---|---|
    | El admin | `403 ROL_NO_PERMITIDO` |
    | Maestro ajeno | `403 SIN_ACCESO_A_LA_CLASE` |
    | Alumno de otra clase | `403 SIN_ACCESO_A_LA_CLASE` |
    | Alumno quitado | `403 SIN_ACCESO_A_LA_CLASE` |
    | Alumno restringido | `403 ACCESO_RESTRINGIDO` |
    | Alumno inactivo | `401 NO_AUTENTICADO` |

  - **El maestro retirado:** recibe `403 SIN_ACCESO_A_LA_CLASE` y deja de aparecer en "Personas", con su correo.
- **Logs con `trace` (PA-10)** (`logs-02b-r1`):
  - **Recorrido:**
    - El admin publica, sube, publica un material, descarga y borra.
    - La alumna comenta y lee el muro, los comentarios y "Personas".
    - Una maestra intenta borrar lo del admin y lo del otro maestro (`403`).
    - El admin intenta comentar (`403`).
  - **Lo que no aparece en el log:**
    - Ni el nombre real del admin, ni su correo, ni su token.
    - Ni los correos de "Personas" (de los dos maestros y de la alumna), ni los textos, ni `@pruebas.local`, `@contenedor-de-pruebas.local`, "Administración", `puedeBorrar`, `authorization` o `Bearer`.
  - **Completitud:** hay un cierre `request completed` por cada una de las 12 peticiones.
- **Supuestos míos que corregí (no son hallazgos):**
  - Una ruta con barra final (`…/comentarios/`) no existe y responde `404 NO_ENCONTRADO`: la API no ignora la barra final, como en las demás rutas.
  - Con dos maestros asignados al crear la clase, el orden lo desempata `maestro_id` (S-05), así que `maestro` es el de id menor y no el de `clases.maestro_id`. Coincide con 02a, que tampoco lee `maestro_id`.

### Observaciones (no son hallazgos; las decide el manager)
- **O-05 (posible conflicto entre RN-07 o P-01 b y la cascada):** al borrar su propia publicación, un maestro borra en cascada los comentarios que escribió el **otro maestro** de la clase debajo de ella. P-01 b dice "nunca lo del otro maestro", y RN-07 dice "cada autor borra solo lo suyo".
  - **Lo que dice el plan:** §D-2B3 conserva la cascada ("descarta los archivos y borra (como hoy)"), y la interfaz avisa "Se borrará con sus comentarios.". Por eso no lo reporto como hallazgo ni escribí una prueba roja contra el plan.
  - **Reproducción:**
    1. Una clase con M1 y M2.
    2. M1 publica.
    3. M2 comenta en esa publicación.
    4. `DELETE /api/clases/:claseId/publicaciones/<de M1>` con el token de M1 responde `204`, y el comentario de M2 desaparece. M2 no recibe ningún aviso.
  - **Alcance:** pasa lo mismo con los comentarios de los alumnos (eso sí lo permite P-01 b). Al admin no le pasa, porque no comenta (P-03 a).
  - **Si se decide cambiarlo**, los hermanos son los dos borrados con cascada: `borrarPublicacion` para los comentarios, y el descarte de archivos, que son del autor de la publicación.
- **O-06 (trivial):** el comentario de `shared/src/clases.ts:291`, sobre `alumnoDeClaseSchema`, sigue diciendo "Roster del dueño (S-10)". Es el hermano del pendiente "roster del dueño" de `handlers/README.md`, que el programador ya corrigió en 02b.
- **O-07 (aceptado por el plan, solo para registro):** como "Administración" es un nombre libre, un maestro o una alumna que se registren así se ven con ese nombre, y solo la insignia (`administracion: true`) los distingue. La interfaz de 02c debe mostrar la insignia siempre que `administracion` sea `true` y nunca deducirla del nombre.

### No atacado y por qué
- **Frontend:** 02b no cambia código de producción del frontend y no ataqué dobles nuevos, así que no corrí la suite del frontend. La corrieron el programador y el manager: 104 / 1396.
- **Que el admin o un autor cambien de rol:** ninguna ruta cambia un rol, así que la autoría y su rol no pueden cambiar entre la lectura y el borrado. Va con ADMIN (R-06).
- **Un maestro asignado e inactivo en "Personas":** ninguna ruta desactiva cuentas (R-06, destino ADMIN). Hoy saldría con su correo, igual que en el detalle desde 02a.
- **Admin con cambio de contraseña pendiente o inactivo:** el admin es único en la base compartida y alterarlo tumbaría las pruebas paralelas. La cadena es la misma que cubren PR-2A22 y AUTH.
- **La API real con su propio proceso:** PA-10 se cubrió con captura en memoria de los descriptores 1 y 2 con `trace`, como en `logs-archivos-d-r3`.

### Corridas
**Comando**, tres veces seguidas, una a la vez:
```
cd backend; npm test -- --reporter=default --reporter=json --outputFile.json=<scratchpad>/clases02b-r1-N.json > <scratchpad>/clases02b-r1-N.txt 2>&1
```
Antes corrí `npm run lint` (código 0), `vitest list` y los tres archivos nuevos por separado.

| Corrida | Inicio (UTC) | Código | Resumen | Duración |
|---|---|---|---|---|
| 1 | 17:57:47 | 0 | `Test Files  147 passed (147)` · `Tests  1746 passed (1746)` | 102.06 s |
| 2 | 17:59:42 | 0 | ídem | 98.24 s |
| 3 | 18:01:26 | 0 | ídem | 79.20 s |

- **Última línea literal de cada archivo:** `JSON report written to C:/Users/Carlos/AppData/Local/Temp/claude/c--Users-Carlos-Documents-Proyecto-PlataformaEducativa/0674b697-54d2-4eb4-ad9a-7234f1426d63/scratchpad/clases02b-r1-N.json`.
- **Ningún rojo.** 0 `timed out` y 0 "Unable to start a transaction" en las tres corridas, así que PA-12 no se activó.
- **Mis 26 casos:** sumaron 16.9 s, 16.8 s y 13.4 s; el más lento tardó 2.1 s ("M1: cada DELETE…", corrida 2).

**PA-07**, igual en las tres corridas:

| Término | Cuenta |
|---|---|
| `40P01` | 0 |
| `deadlock detected` | 0 |
| `could not serialize` | 0 |
| `too many clients` | 0 |
| `"Error no controlado"` | 10, exactamente I-1 |
| `"code":"P2028"` | 5, los permitidos |

- **"Error no controlado":**
  - 5 de `POST /api/auth/login` con "fallo simulado de la base en la búsqueda" y 1 "al crear la sesión", de `intentos-r2`.
  - Los 3 `ZodError` de T-39, de `archivos-d-r2`: `POST …/archivos`, `POST …/descarga` y `GET …/publicaciones`.
  - `GET /api/prueba/error-comun` "boom", de `salud.integracion`.
- **`P2028`, todos de `timeout` y nivel 40:**
  - De `servicio-ocupado.integracion`: `POST /api/auth/cambiar-contrasena` › `tx.sesion.findFirst()`, `POST /api/auth/refrescar` › `tx.sesion.updateMany()` y `POST /api/clases/:claseId/publicaciones/:publicacionId/comentarios` › `prisma.$queryRawUnsafe()`.
  - De `cuentas-r3`: `POST /api/auth/login` › `tx.sesion.create()` y `POST /api/auth/restablecer` › `tx.tokenCuenta.updateMany()`.
- **Control positivo** presente en las tres corridas. **PA-07 limpia en las tres.**

**Casos de control de ESLint (límite de 60 s):**

| Caso | Corrida 1 | Corrida 2 | Corrida 3 |
|---|---|---|---|
| `guarda-clase-r1` › "control: app.addHook(...) se rechaza" | 3608 ms | 7925 ms | 2716 ms |
| `guarda-clase-r2` › "control: app.addHook, app['addHook'] y app?.addHook se rechazan" | 3896 ms | 6886 ms | 3738 ms |

### Conteos
- `cd backend; npx vitest list > <scratchpad>/list-02b-r1.txt` → **1746** casos; `npx vitest list --filesOnly` → **147** archivos.
- Diferencia con lo que aceptó el manager (1720 y 144): +26 casos y +3 archivos, los de esta ronda.
- `*.ataque`: **123** (67 del backend y 56 del frontend).

### Tabla de SHA-256 de las 123 `*.ataque` al cierre de la ronda 1 de 02b (base de V-01 de la siguiente ronda o del cierre; 3 nuevas, ninguna existente cambia)
| SHA-256 | Archivo | Cambio |
|---|---|---|
| `BCCE2CAE771F97957D8691BEF7FFF4EC42412DAAEABF726AEB0AFC59F6F25671` | `backend/src/config/correo.ataque.test.ts` |  |
| `DCB78D222544E8DC4FBECE59468F555B04ABE971B70016E9BB17FCAE3E958580` | `backend/src/config/env.ataque.test.ts` |  |
| `71E7F049447D2D1ECEDD897C55EA0B6D31221753F0A7E7473C7AC6E8667F0A95` | `backend/src/config/logger.ataque.test.ts` |  |
| `91F620C1A27778EEBC2BED5EEC1BC9B0E3FE1199B32ED00F9DD910011D6A1805` | `backend/src/core/clases/codigo-r1.ataque.test.ts` |  |
| `262691F5786AD63B2393D0BA5FF97538F6DACF43343BED019AD23C12A07D8686` | `backend/src/core/clases/codigo-r2.ataque.test.ts` |  |
| `E769CBFCC3A83A64B51C6437F80684640A7C928AD6B8C5C1671FDFF005D7B734` | `backend/src/workers/ritmo-03c-r1.ataque.test.ts` |  |
| `36C23511D5BFD24F2BB999BA34B00C193C8DD0FD0782F29F4E0BB00631E2FBCA` | `backend/test/admin-muro-02b-r1.ataque.test.ts` | nueva: ronda 1 de 02b |
| `388AD0E585639B8C3E0E0A6657FB42C1B9CB83DB721C4863C4FA19E0BE42EC85` | `backend/test/admin-unico.ataque.test.ts` |  |
| `D2CC28B62BF988AE14BA975A9BC8D534AEC0EEBCE30DA93D7DED9A26026B0857` | `backend/test/alumnos-b-r1.ataque.test.ts` |  |
| `00346D471355ABC7971B921649E7192B8987FE27912C00CB7E41AEF2065369E9` | `backend/test/alumnos-b-r2.ataque.test.ts` |  |
| `FC11AB4B914D4A88612953F82DB354E2B9CEA9BEF86E24321EF7E031F3AC3837` | `backend/test/alumnos-b-r3.ataque.test.ts` |  |
| `441A766A94E7D9B26807790402E06ED94D4CC378D8F6ECF0BCCC3259C7FF55FB` | `backend/test/api-real.ataque.test.ts` |  |
| `D9E1DE5B1BD43F54CF3A4DCF153D1EEABDC36B4DEC02FBEB9D8A0239F298DFE9` | `backend/test/archivos-d-r1.ataque.test.ts` |  |
| `1637EB447CD12AC5BDDDC7634980DBC10A25CBAD5DE01BF6C09F40ED930FF1A9` | `backend/test/archivos-d-r2.ataque.test.ts` |  |
| `42BB7BF3086230C6EDC65AB73976AC8A801956336561AADBEE65CC3B40EB8612` | `backend/test/arquitectura-cuentas-r1.ataque.test.ts` |  |
| `38ADB0984744A0810287711F57BA0498287D0BC96344B8948BA1C490CA807716` | `backend/test/arranque-r1.ataque.test.ts` |  |
| `2C83D82D10BDD9B7A969768774D75B18B7A71A594BBAAC5FAE36A0E134D2336C` | `backend/test/auth-login.ataque.test.ts` |  |
| `73D3A2AE708A0EF676547A8094115B1419423057378387269BC3EADB34C7724E` | `backend/test/auth-registro.ataque.test.ts` |  |
| `6F557E8E860BCE6374671E90086E9C14B1861A308B6FBB434564612647892713` | `backend/test/autoria-02b-r1.ataque.test.ts` | nueva: ronda 1 de 02b |
| `95BBA9BAC44366AD5A361E93DD2F278CB0A1CC889FA479049ACC7B45A9A5E71B` | `backend/test/clases-r1.ataque.test.ts` |  |
| `A87817D56C236C0BA3597214CAC23B10483BBC28AE44800C592ED5CE2EF97F38` | `backend/test/clases-r2.ataque.test.ts` |  |
| `72DE7D8AF3D3F772ABC19DB065F6E418F6EB76CE78D87FE6EBB51335FC99825A` | `backend/test/clases-r3.ataque.test.ts` |  |
| `BE97C4E48AC9551BED1D01552E90AB8CDF085CF928AE6C8C3D81809E35F7CE62` | `backend/test/clases-r4.ataque.test.ts` |  |
| `000EC9008C73D25121C82A46F5EA0F67E6C8C387CB04E361EF82812B57956098` | `backend/test/concurrencia-02a-r1.ataque.test.ts` |  |
| `530546B4D70A2B9AD36F98F37E2AF45480E81A1101EE3516D15426F78350BF82` | `backend/test/cuentas-03a-r1.ataque.test.ts` |  |
| `6303DDC170545F616C66773C3F5475CB3BE1FEA9347D8059354D6ADE8D676C16` | `backend/test/cuentas-r1.ataque.test.ts` |  |
| `3A4E81C111B8EEB7DF065804AA85062FA3FC607F0147149B71AC21C14E7818D9` | `backend/test/cuentas-r2.ataque.test.ts` |  |
| `F54F79F7B2A83E95FE440053CCAF15CB3EBB01CE5DFD4C6655E22159A5FD7E6B` | `backend/test/cuentas-r3.ataque.test.ts` |  |
| `A2F9BFF596330A7D55D1CA9D47197FC831EB132F52C759610E2D667895C3332F` | `backend/test/cuerpos-02a-r2.ataque.test.ts` |  |
| `D7A9DA854CE8AB8AD8D2437DB2E8C2A642A777EA3261A6B038DA28BE022DF848` | `backend/test/enlaces-03b-r1.ataque.test.ts` |  |
| `DC1B7EE7EA58966F5DB33CCB4581885A9669DEA2263954AE46D17A83E1EF6EAF` | `backend/test/enlaces-03b-r2.ataque.test.ts` |  |
| `B051B1986496E35E3E306C4C6BC306A763542BCA4B350574D0C02E2C484DEB35` | `backend/test/enlaces-ch-r2.ataque.test.ts` |  |
| `D28CC4DE621A680E6B54B2BFF889700300D558EC7849717584518D2F03EC8CAE` | `backend/test/entorno-ch-r1.ataque.test.ts` |  |
| `BA1AC9B17CC9BF747522BD4EC8B87DF436008482E643B18EEA8E9A8C041C59B3` | `backend/test/formada-ch-r1.ataque.test.ts` |  |
| `EC9602D5F109B45A6D428E708D9B6CDD37A7509A6FF9031FA6FD8A2DA0E25E9B` | `backend/test/gestion-02a-r1.ataque.test.ts` |  |
| `5F4133F949D2F337A8F63B75CF82CB77114DB7812D67C1960105F5000C31A326` | `backend/test/guarda-ch-r1.ataque.test.ts` |  |
| `7A7DAC6D87EDF81059FCFF9C07471AAF49D690EC159BE4B9FD4AA32B0909A215` | `backend/test/guarda-ch-r2.ataque.test.ts` |  |
| `610EE44E5D0BCEA46EB4E3645F9ADF1998A76947A25AF7E3F8248EA3A633DF79` | `backend/test/guarda-ch-r3.ataque.test.ts` |  |
| `E5D149F3AC52B726E1FE08908249706341330F88EAA6674B9A9AC67B98B1E864` | `backend/test/guarda-clase-r1.ataque.test.ts` |  |
| `C979D2C9C420A2177FA6EBDDB78EB2CE84D5F043B94270F690916A6FC75D6F8F` | `backend/test/guarda-clase-r2.ataque.test.ts` |  |
| `20982E2B98F1B162146A211923F3D5EC19D4E170C4AA3A5BFC6F82C3B6173AAD` | `backend/test/guarda-r2.ataque.test.ts` |  |
| `A8B79D5AD98270BE3747F493865708A78BB73ADD08D832584DB4464C3582777A` | `backend/test/intentos-r2.ataque.test.ts` |  |
| `2619B44EEA3370494C95AC128FCFD9E3FFC20D1581A19F549BF371F603A11D7D` | `backend/test/invitacion-flujo-03a-r2.ataque.test.ts` |  |
| `704155928183AEC193AE7E157B86B3E9361D2B63C7A47BE1ED859605FAB4FFA6` | `backend/test/invitacion-masiva-03c-r1.ataque.test.ts` |  |
| `DD9B7454E8786BF0B833D265900CCAECF595808CEBC8E9A77C9AEF15298A1038` | `backend/test/invitacion-masiva-03c-r2.ataque.test.ts` |  |
| `F9F9EC59EC8D1A5CCB180522798140C45604440F48EDCD68A3E02863D90AE347` | `backend/test/logs-02a-r1.ataque.test.ts` |  |
| `A2006C163D9E6CD3E4A2A773D1501826DAF3C8E7BB184D205BFC6442318FB59C` | `backend/test/logs-02b-r1.ataque.test.ts` | nueva: ronda 1 de 02b |
| `BD8B303C434EFEC0785E0691D31D6F6E87DBF3305F50FA27CCE0F78CBB251E3A` | `backend/test/logs-03a-r1.ataque.test.ts` |  |
| `B58D5D013658433FE5839634E2DB5A31B8D2B8F69587BC36958752D3CD33BBF7` | `backend/test/logs-03b-r1.ataque.test.ts` |  |
| `0E4ABF3BC5D92FA0C380805453190703862567930DD74B9E7FCC1809564D181F` | `backend/test/logs-03c-r1.ataque.test.ts` |  |
| `1E775A19682F3A5995D7C035BCC810A36BF50C22045B6FFBFC5A98B821255DB0` | `backend/test/logs-archivos-d-r1.ataque.test.ts` |  |
| `E9CE866D511E3EE6029015B74E20B4D342A60BE99B3AAC97E86F00283A3C77F1` | `backend/test/logs-archivos-d-r3.ataque.test.ts` |  |
| `E008935B107752D203F6423B2F1C9E0F5A4339F0A77154746BF262CECB90351A` | `backend/test/logs-cuentas-r1.ataque.test.ts` |  |
| `690E30ED39111C0A074FC159015967CD9F0FDC24D9A340E6A0D7BE4B980A9D45` | `backend/test/logs-muro-c-r1.ataque.test.ts` |  |
| `0809C60700E26183E7771B4B1A40B05CBF554C2ED7929190CF4D89A52722E551` | `backend/test/logs-muro-c-r2.ataque.test.ts` |  |
| `5AF3909E4B7CA485E78979567872EA78BF41E6D679B9EC2C761EAA0B250DF689` | `backend/test/logs-r2.ataque.test.ts` |  |
| `AE66FBCF60E8F66336E77C1055893E60CB85A01BC746B89C68A4D2C70C807AF1` | `backend/test/muro-c-r1.ataque.test.ts` |  |
| `7825CFC9B484DF740FA0E9562A195D1BBCAF4CAF72EA55FA847B5394AB96C125` | `backend/test/muro-c-r2.ataque.test.ts` |  |
| `8B733B86FC6D54ECE008389A59793FAE4EC4A65146EB37215E900E50A5337D46` | `backend/test/nombres-guarda-r3.ataque.test.ts` |  |
| `00A6EB6F7CCD7D8790C356BEFCC96DDFDA6EACCE0BE53DE255CFE3626D8F2ADB` | `backend/test/nombres-tokens-r2.ataque.test.ts` |  |
| `80B5A848F69B429E7DADEC86C07BEC1D3E3EED8A042EFBA41CE912DED39E7BAB` | `backend/test/nowait-ch-r1.ataque.test.ts` |  |
| `6F2ABC2CEFD77D74CD1E3ABBDCE9C41BB53D00BD4D8E5BA7E496C4441C2697E5` | `backend/test/servicio-ocupado-ch-r1.ataque.test.ts` |  |
| `3B2D94ABCCBEDD6FB53CF666AAD06ADF431A0DB9A09264F05D8ADF6963CBD0AE` | `backend/test/sesiones-y-cadena.ataque.test.ts` |  |
| `70AC720F2E7FCADEE5BBCB6414887AB08129DEA7CD91DF012046953B1584E8B6` | `backend/test/sexto-paso-02a-r1.ataque.test.ts` |  |
| `F09E9A0038C47D1A2223376A0AF260BAF573F0C45BF770201C48C9E30296F04B` | `backend/test/worker-03c-r1.ataque.test.ts` |  |
| `9F60F9D65D52D2021A1EB04E9F01D3CC68F22744C845BF93D6621AA4FE9713A8` | `backend/test/worker-r1.ataque.test.ts` |  |
| `77D11BD85F202A9EEC92A363DF82E63FB9A784CA9D368D49F62E61C1A2AA967B` | `backend/test/worker-r2.ataque.test.ts` |  |
| `B89EDE0F6AED45DFCB5E64C8909A822156CE43FD80948E72419CDCE9D4541A87` | `frontend/src/app/cache-03a-r1.ataque.test.tsx` |  |
| `E85743C0FBB8E476874A2C67334342D8D69D14153579FC1E4CCE0AE6E2B29616` | `frontend/src/app/contexto-r1.ataque.test.tsx` |  |
| `BC2BE5541006887E2A5A4A89B33046180F607D54474B0F96A73D615AFBCAC385` | `frontend/src/app/contrasena-r1.ataque.test.tsx` |  |
| `F38BCACB716D8A39ACDB3535A95603CD0D8AB02572CA57A7DF5268B01CEB6EAC` | `frontend/src/app/contrasena-r2.ataque.test.tsx` |  |
| `68FB5D092C0C8ECFCF282477EF023AAAE26F6B869656E05109DC3EFA276D842A` | `frontend/src/app/cuentas-r1.ataque.test.tsx` |  |
| `41930017715D3D6869DC7ACEFD75DE8EC3684F1F035B845ABDF8EC0F6B734DEE` | `frontend/src/app/cuentas-r2.ataque.test.tsx` |  |
| `1506C27E5F7418B5E087FD30F8809645A2FC3E2761C7249DE78F02E24AA6C7A5` | `frontend/src/app/en-espera-r1.ataque.test.tsx` |  |
| `DB48DAD405C27062621A44D3744C84CC5903892A51E5A8DF18F41383CB9C88A3` | `frontend/src/app/errores-r1.ataque.test.tsx` |  |
| `F95321E604E20B533EBF2DB3C1C6C66BA2F2D87A48F075415B766551F6EE30F4` | `frontend/src/app/fondo-r1.ataque.test.tsx` |  |
| `76B256114128377B6A793CAB882D031FB10785076728F8058E0FF1D93A7E9F64` | `frontend/src/app/marco-r1.ataque.test.tsx` |  |
| `D32E1C5B5629C37D2521446D7E578CDB081DD71F5B5026E73E13C58E16D92801` | `frontend/src/app/muro-recuperar-c-r3.ataque.test.tsx` |  |
| `BEC7B7B49E056AFE514F654FCA9C562D77A090F7421057B8B03D57D4E862140A` | `frontend/src/app/muro-recuperar-c-r4.ataque.test.tsx` |  |
| `2F8056A770397C1601647277944555A48AFC4B9A2BABEB75E5898F0CC92562BB` | `frontend/src/app/muro-rutas-c-r1.ataque.test.tsx` |  |
| `3267D093574AA792529D8E9311DEBFC651F519EB33F8EF9C369EB2C4C6180389` | `frontend/src/app/registro-maestro-03b-r1.ataque.test.tsx` |  |
| `053E867A904AFA3C09EEF92CA2E03E929D9F9C93F714040856F40C7418721BBE` | `frontend/src/app/router.ataque.test.tsx` |  |
| `ADF9E1CFD151E030C6B275A47A5C41F68F46BAEDF880A989676151DCACE5A1B3` | `frontend/src/app/rutas-clases-r1.ataque.test.tsx` |  |
| `F090CBD8E8C9B0AF52D4FC19547B07E9B6413F5414CC4B10862F01E29818DDDC` | `frontend/src/app/sesion-r2.ataque.test.tsx` |  |
| `B16D9B4376FA719F6DA04745FF701F24FA20159B1AA7904C6C9424D2475EA871` | `frontend/src/components/layout/estatico-r1.ataque.test.ts` |  |
| `0AAA18CD70465293B6FCA6CC051B8E4AC360A838D02FEDE848C35376C3D0066C` | `frontend/src/components/layout/pie-r1.ataque.test.tsx` |  |
| `00A707429AF6B5326F9A96DEF6382823CF4A6A092AAC7E7BD7CBCB8DC9AA1D21` | `frontend/src/components/layout/pie-r2.ataque.test.tsx` |  |
| `472E1F46D0C899496AA334909B02988962AAB07B9BD29A8D7B8AF3987FAC6C76` | `frontend/src/components/layout/pie-r3.ataque.test.tsx` |  |
| `385123D69F8C6411027C5B7DB2E52E62146C0DB54CFFDA3C27BD6B450FE2AF27` | `frontend/src/components/ui/badge-03b-r1.ataque.test.ts` |  |
| `86ADAA9A093A987DAFD97E279E600211CBDF6CEF97879D16FA2D8A9D2846F8B5` | `frontend/src/features/admin/cuentas-r1.ataque.test.tsx` |  |
| `B948E9359FD3981E08B850540027F536F345A3F48D7C0749BA0C16C2C1DF1184` | `frontend/src/features/admin/cuentas-r2.ataque.test.tsx` |  |
| `72BF9AF4CE8F52A114897E038CEFB0947841A37F74074F4C5F8DEC68A71B654A` | `frontend/src/features/admin/cuentas-r3.ataque.test.tsx` |  |
| `942DF3015424AED56E83661993BA015E871CD6BE8E797920D47E8CBF0C56EAC4` | `frontend/src/features/admin/cuentas-r4.ataque.test.tsx` |  |
| `3BD26E7E3BF019D462DB4837861ED22017BBB9E9A6276720BF0DEA6C2B5B0998` | `frontend/src/features/admin/en-espera-r1.ataque.test.tsx` |  |
| `8219C864E7BDC1315E6A0F0FF1CD6F54E4710CEBDCEB8E316F4E53AACC0CFF35` | `frontend/src/features/admin/foco-r1.ataque.test.tsx` |  |
| `30F45BBA30D9348EC1587B42E84CA370274E1BF0AF0F310B8A6BBD79FA982669` | `frontend/src/features/admin/maestros-03b-r1.ataque.test.tsx` |  |
| `D477A809E55E603D3EF6C02CA43B21372B75D0947FA303F1539D48BDF32841F8` | `frontend/src/features/admin/maestros-03c-r1.ataque.test.tsx` |  |
| `3CEDA51DB8F67F40C26615FBC4CD7D082035B00F38713C6CA4C7DB58E47926C8` | `frontend/src/features/auth/enlace-r1.ataque.test.tsx` |  |
| `1F5D1147637C09DAA6FDF1384E4395EDD69DFDAB84AAE5D602A362DABD3295BD` | `frontend/src/features/auth/enlace-r2.ataque.test.tsx` |  |
| `991B115524D8DADE8D6EA2C51FB753DC8832EE410DB2161A0CE761D011CFCA4A` | `frontend/src/features/auth/invitacion-r1.ataque.test.tsx` |  |
| `25375E6678BA9B5331D53B78031BD315A8651F16CD32571E9FCEE539D07C5BA8` | `frontend/src/features/clases/alumnos-b-r1.ataque.test.tsx` |  |
| `55DC274ECA96DA4360848B88F9F2A839AC815031490AB57FF38DE074512D632C` | `frontend/src/features/clases/alumnos-b-r2.ataque.test.tsx` |  |
| `371518E4309F14201A92D29F9436A97A19801B506D45114964FBCFE3F5CD4183` | `frontend/src/features/clases/alumnos-b-r3.ataque.test.tsx` |  |
| `266D088DD727F18AF8C8A106B8D9C4DBED75753E4B1B4ABB12F3A4DF870ECB7F` | `frontend/src/features/clases/alumnos-b-r4.ataque.test.tsx` |  |
| `856CFFBD9C743F9815DAF731487E29DC5F5272545DC15820A70BAF86ECFA6527` | `frontend/src/features/clases/alumnos-b-r5.ataque.test.tsx` |  |
| `1E9A26ED86EE637E1A2E065DC05DA79CBB5048E18A020285D6B479FD290BCC9C` | `frontend/src/features/clases/archivos-d-r1.ataque.test.tsx` |  |
| `EFC07CC006E16E03BEEC69A17E08AED83657095555107B28FB1AB3EF1400E687` | `frontend/src/features/clases/archivos-d-r2.ataque.test.tsx` |  |
| `E01A46173F2820F0AF15824C88AA81805412B70248062F419DD40236C9EED7E3` | `frontend/src/features/clases/archivos-d-r3.ataque.test.tsx` |  |
| `89C9522AB1947038E66F398E8E5C40A1A9BF4E872A16C34877C6432AC38402E5` | `frontend/src/features/clases/clases-r1.ataque.test.tsx` |  |
| `4ED2A5582C3DF7A29C62F9E1D458141AB104DD13A16B3C496634EB092948AA71` | `frontend/src/features/clases/clases-r2.ataque.test.tsx` |  |
| `146C9B3080709DAEA23B0500B0014C64DF1D5C2412510014CF79AA05E8CD84FC` | `frontend/src/features/clases/clases-r3.ataque.test.tsx` |  |
| `50BF79FE51B26A896008E6D39B39DA7510EBEB82EAA5EA8BEF76748E11FDCC96` | `frontend/src/features/clases/clases-r4.ataque.test.tsx` |  |
| `CDD1ED8890859AE3E884822FC7074852A2173105114745D83FE9A15C1C47C626` | `frontend/src/features/clases/estatico-r1.ataque.test.ts` |  |
| `7C434A0E54E70B12D4B2A3DE22FFB4DBF5F28A1CFBD2290C22E8A2B59EDF0E16` | `frontend/src/features/clases/inicio-sin-datos-r2.ataque.test.tsx` |  |
| `CA9841009613CF24BA8934EF37CC0B46BF1926F8E354BC4444AB1B2C86E1525B` | `frontend/src/features/clases/muro-c-r1.ataque.test.tsx` |  |
| `5549F40CACD53F06847CA01C9439991BDD50024ED646086D67C1F2DB59A4C36C` | `frontend/src/features/clases/muro-c-r2.ataque.test.tsx` |  |
| `73523416AE3F04A4AE4DB25685E2C9A5BA8EB3DB015225DFEDC76EDF5D75958F` | `frontend/src/features/clases/muro-c-r3.ataque.test.tsx` |  |
| `C71CBA65DD284D7AF11CBC812B6BCF75BAA373939EDB8318E731858D9C50173F` | `frontend/src/lib/format-d-r1.ataque.test.ts` |  |
| `89DBBB70D5DC404C3D74DB5391D10855C8CB1D6B4C643B6147B3CE6FFB2637AF` | `frontend/src/lib/format-d-r2.ataque.test.ts` |  |
| `BFA7DED62F7A1402590D438A1CC51060A63FA019AD47D3EB5740E43383064A2A` | `frontend/src/lib/format-d-r3.ataque.test.ts` |  |
| `10C730348D18FF8DAE7B3623751D31122AA58560B564AD191717FA1938A6F8CE` | `frontend/src/services/apiClient.ataque.test.ts` |  |
| `C1F4B160D3BE549340F771F3E225721E3776F7A53EA2A653A5A91A2E297BEE93` | `frontend/src/styles/clases-r1.ataque.test.ts` |  |
| `B8085BCBBC7F4B6276BF3A87FB7BA0BC887953A8C6CE372354A7F3F1B5037582` | `frontend/src/styles/tokens-r1.ataque.test.ts` |  |

## CLASES-02c — Ronda 0

**Datos de partida.**
- Fecha: 2026-10-05. Rama `feat/clases-02`; base dentro de los paquetes `<K2b>` = `7544fb9`; fuera, `<R>` = `e4396a0`.
- Trabajo bajo A-3 (ampliada en la Enmienda 1 con C-19, C-20 y C-22) con el procedimiento de "Ronda 0" del plan. La ronda 0 no cuenta en el tope de 3 y no lleva veredicto ROTO o RESISTE: alinea las `*.ataque` existentes con 02c para que el programador implemente contra ellas.
- Solo frontend: ningún C-n de 02c toca el backend, así que no corrí la suite del backend (PA-07 no aplica a esta ronda). Los C-n de 02d (C-16, C-17, C-18, C-21 y el total 40 de C-20) no se tocaron.

**Estado:** ronda 0 completa; no se activó ninguna PARADA.

**Verificación propia.**
- `cd frontend; npm run lint`: código 0 (ESLint, Prettier "All matched files use Prettier code style!" y `tsc -b` sin errores). Las reescrituras solo usan componentes que ya existen (`CrearClaseView`, `EditarClaseView`, `ClaseLayout`, `MuroView`) y el router de la aplicación; ninguna importa un nombre que 02c todavía no crea.
- `cd frontend; npm test`: `Tests  21 failed | 1378 passed (1399)`. Los 21 rojos son exactamente los casos reescritos que esperan a 02c (lista abajo).

### Precondiciones
- **PA-02 (no se activó):**
  - La rama es `feat/clases-02` y `git cat-file -e '7544fb9^{commit}'` termina con código 0.
  - Antes de tocar nada, `git status --porcelain -- backend shared frontend` y `git diff --stat 7544fb9 -- backend shared frontend` salieron vacíos.
  - Fuera de los paquetes solo cambian `docs/ESTADO.md` y `aprobacion.md` (excluidos). Contra `e4396a0` no cambia nada en `infra/`, `AGENTS.md`, `.claude/`, `README.md` ni los `package*.json`.
  - Los SHA-256 de ESSENTIALS (`5d84dc8c…`), `PRD.md` (`40ce8841…`), `ARCHITECTURE.md` (`15a218b8…`) y `CLAUDE.md` (`59c1fd57…`) coinciden con los últimos de `aprobacion.md`.
- **V-01:** comparé con `diff` las 123 `*.ataque` de `git ls-files` contra la tabla de la ronda 1 de 02b: **123 de 123 iguales**, y ninguna `*.ataque` sin rastrear.
- **PA-01:** no aplica (no corrí pruebas del backend). La red `uacam5 2` está aceptada por el humano solo para hoy.
- **Procesos ajenos:** había tres procesos `node` del humano que no son pruebas (`cua-repl.mjs` y dos `server.mjs`); no los arranqué ni los toqué. No había otra corrida de Vitest, y nadie más corrió pruebas mientras corría la mía.

### Cambios C-n (frontend)
Cada caso reescrito lleva un comentario `CLASES-02 ronda 0 de 02c (C-n, …)`. Las líneas son las del archivo nuevo.

| Archivo | Líneas | C-n | Antes | Después |
|---|---|---|---|---|
| `frontend/src/app/rutas-clases-r1.ataque.test.tsx` | 84-107 | C-12 (§D-2C3) | Un estudiante en `/maestro/clases/:claseId/editar` terminaba en `/estudiante` sin pedir la clase ni su código | Se parte en dos y protege lo mismo: un estudiante en `/maestro/clases/:claseId/alumnos` (subpágina que sigue existiendo) termina en `/estudiante` sin pedir nada de la clase; y, para el estudiante y para el maestro (`it.each`), la ruta retirada `/maestro/clases/:claseId/editar` termina en `/login` (el `*`, R-07) sin pedir la clase ni su código |
| `frontend/src/app/marco-r1.ataque.test.tsx` | 301-305, 328-329 | C-14 (M-04) | Destinos del admin: `["/admin", "/admin/maestros"]`, textos `["Cuentas", "Maestros"]` | `["/admin", "/admin/maestros", "/admin/clases"]` y `["Cuentas", "Maestros", "Clases"]`; en `/admin` solo "Cuentas" lleva `aria-current` (lo exige la aserción de siempre), y cada `href` debe ser una ruta existente y enfocable |
| `frontend/src/app/registro-maestro-03b-r1.ataque.test.tsx` | 232-238 | C-14 (caso fuera del inventario; cita C-14) | En `/admin/maestros`, la `nav` del admin era exactamente `[["Cuentas", null], ["Maestros", "page"]]` | Suma `["Clases", null]`: "Clases" no queda activo en `/admin/maestros` |
| `frontend/src/components/ui/badge-03b-r1.ataque.test.ts` | 44-64 | C-19 | "Se leyeron las cuatro variantes": `["danger", "muted", "success", "warning"]` | Cinco variantes con `institucional`; `institucional` es exactamente `{ fondo: "accent-soft", texto: "link" }`; el rojo (`danger` o `destructive`, en el fondo o en el texto) solo está en `danger`. El caso del contraste (≥ 4.5:1) no cambia y ya mide las cinco |
| `frontend/src/components/layout/estatico-r1.ataque.test.ts` | 131-134, 149 | C-22 | Lista exacta de valores arbitrarios de maquetación, 7 valores | Suma `translate-x-[200%]` (indicador de la tercera sección) |
| `frontend/src/styles/clases-r1.ataque.test.ts` | 126-137, 144, 195-201 | C-20 (cifras fijas de la Enmienda 1) | V-06 con 36 `enEspera=` y su tabla `fijos` | 39 `enEspera=`; `fijos` suma `features/clases/clases-admin-view.tsx`: 1, `components/lista-maestros-de-clase.tsx`: 1, `components/buscador-de-maestros.tsx`: 1, `components/tabla-clases-admin.tsx`: 0 y `components/firma-del-autor.tsx`: 0; `formulario-clase.tsx` sigue en 1 y el resto de `features/clases/components/` sigue en 3. El título del caso pasa de "36 enEspera" a "39 enEspera" |
| `frontend/src/features/clases/clases-r1.ataque.test.tsx` | 8-10 (imports), 256-301 | C-12 (§D-2C2) | «'Crear clase' en espera no manda un segundo POST /clases», con `FormularioClase modo="crear"` y `POST /api/clases` | «… no manda un segundo POST /admin/clases»: monta `CrearClaseView` en `/admin/clases/nueva`, escribe el nombre, busca "Luis" en "Buscar maestro por nombre", pulsa "Elegir Luis Pérez" y activa "Crear clase" de todas las formas: exactamente 1 `POST /api/admin/clases` y 0 `POST /api/clases`. El import de `FormularioClase` pasa a `CrearClaseView` |
| `frontend/src/features/clases/clases-r2.ataque.test.tsx` | 206-211 | C-12 (caso fuera del inventario; cita C-12) | El VALIDACION de la descripción al editar llegaba por `PUT /api/clases/:claseId` | Por `PUT /api/admin/clases/:claseId`; las aserciones no cambian |
| `frontend/src/features/clases/clases-r3.ataque.test.tsx` | 3-4, 34, 94-99, 133-159, 196-253 | C-12 (§D-2C2, §D-2C3) | (a) El error del formulario de editar llegaba por `PUT /api/clases/:claseId`. (b) "Una sola acción principal": el control se apoyaba en el enlace "Crear clase" del inicio del maestro, y la tabla recorría `/maestro/clases/nueva` y `/maestro/clases/:claseId/editar` | (a) `PUT /api/admin/clases/:claseId`. (b) El control monta el router de la aplicación en `/admin/clases` (admin, con una clase) y exige que el enlace "Crear clase" tenga exactamente la clase de `buttonVariants({ variant: "primary" })`. La tabla queda con `/estudiante` (con y sin clases), `/maestro` (con y sin clases), `/maestro/clases/:claseId`, `/admin/clases/nueva` ("Nombre de la clase"), `/admin/clases/:claseId` (el código "ABCDEFG") y `/admin/clases/:claseId/editar` ("Guardar cambios"): a lo sumo una acción principal en cada una. El doble responde `/api/auth/refrescar` y la lista `GET /api/admin/clases` con la forma de `claseAdminSchema` |
| `frontend/src/features/clases/clases-r4.ataque.test.tsx` | 13 (import), 61-108, 132-137, 157-164 | C-12 (§D-2C2; la línea 90 del inventario) | T-19 en crear y editar: crear con `FormularioClase modo="crear"` y `POST /api/clases`; editar con `PUT /api/clases/:claseId` | Crear monta `CrearClaseView` en `/admin/clases/nueva` y elige a "Luis Pérez" antes de enviar (`enviar` pasa a `async`); `POST /api/admin/clases` y `PUT /api/admin/clases/:claseId`; el doble responde los candidatos (`GET /api/admin/maestros/candidatos…`). Las aserciones de T-19 no cambian (toast sin prefijo y ningún campo inválido; un VALIDACION bajo su campo, sin toast) |
| `frontend/src/features/clases/muro-c-r1.ataque.test.tsx` | 106-112, 232-234, 363-365, 439, 451, 535-549, 676-679, 687, 698-701 | C-13 (O-02 de la ronda 0 de 02b) y C-12 | (a) Los dobles de las vistas del estudiante llevaban `puedeBorrar: true` (el de la perspectiva del maestro). (b) "Las cinco vistas con ConClaseDeLaRuta": `EditarClaseView` se montaba bajo `/maestro/clases` | (a) `COMO_ESTUDIANTE = { puedeBorrar: false }` en la publicación del maestro y en el comentario de otra persona de cada caso con `renderMuro("estudiante")` (y en `conPaginas`); los comentarios propios que crea el estudiante siguen en `true`. (b) `EditarClaseView` se monta bajo `/admin/clases`; las otras cuatro siguen bajo `/maestro/clases`. Ninguna aserción cambia |
| `frontend/src/features/clases/muro-c-r2.ataque.test.tsx` | 89-95, 205, 224, 270, 286, 304, 378 | C-13 (O-02 de la ronda 0 de 02b) | Las publicaciones de los casos del estudiante llevaban `puedeBorrar: true` | `deEstudiante(…)` las pone en `false` en los 6 casos con `renderMuro("estudiante")`; el comentario propio que crea el estudiante sigue en `true`. Ninguna aserción cambia |

**Lo que no se tocó o no requirió cambio (candidatos del inventario de 02a):**
- **C-12 y C-15 en `inicio-sin-datos-r2`:** su fábrica cerrada de `./hooks` ya trae los cinco hooks que usan los inicios; 02c no agrega ninguno a `InicioMaestroView` ni a `PanelMisClases` (§D-2C3 quita el enlace y la tarjeta interna, y `accionVacio` pasa a opcional), y el caso no menciona "Crear clase" ni la insignia. Ninguna aserción cambia (ver O-03).
- **C-15 en `pie-r1` a `pie-r3`:** sus `vi.mock("./data")` son abiertos (`...original`), así que `TEXTOS_INICIO_MAESTRO` no les afecta. No hay otro `vi.mock` de `data.ts` o `hooks.ts` con fábrica cerrada en las `*.ataque` del frontend.
- **C-13 en `muro-c-r3`, `muro-rutas-c-r1`, `muro-recuperar-c-r3` y `-r4`, y `archivos-d-r1` a `-r3`:** sus dobles ya llevan `puedeBorrar` según la perspectiva (`false` en el muro del estudiante, `true` en la publicación que crea el maestro) y ninguno borra un comentario. `AdjuntosDePublicacion` ya no recibe `esMaestro`, y ninguna `*.ataque` monta `PublicacionDelMuro` ni `ComentariosDePublicacion` con `esMaestro`.
- **C-14 en `components/layout/estatico-r1`:** no tiene destinos ni dobles de `Destino`; solo cambió por C-22. Ninguna `*.ataque` arma un `Destino` en TypeScript. Además de `marco-r1`, la única lista cerrada de la `nav` del admin estaba en `registro-maestro-03b-r1` (reescrita arriba).
- **`app/router.ataque`, `contexto-r1`, `en-espera-r1`, `errores-r1` y `fondo-r1`:** montan `/admin`, `/estudiante` o `/maestro` sin contar los destinos del admin ni usar "Crear clase"; `contexto-r1` exige más de 5 controles en `/admin` (un enlace más no lo cambia). Los dobles de `fetch` que responden `/me` a cualquier ruta son de C-16 (02d).
- **O-07 (la firma del admin):** ninguna reescritura toca la firma, y ningún doble del muro lleva `administracion: true` ni un autor llamado "Administración". Los "Administración" de `marco-r1`, `contexto-r1`, `en-espera-r1`, `errores-r1`, `registro-maestro-03b-r1` y `features/admin/cuentas-r1` son el **nombre de la cuenta** del admin en `/me` (la barra superior), no un autor del muro; ninguna aserción deduce de ellos la insignia.

### I-2 (pruebas normales del frontend fuera de la lista de PA-16 de 02c que contradicen 02c)
**Ninguna.** Busqué en las 48 pruebas normales del frontend (`git ls-files '*.test.ts' '*.test.tsx'` sin `ataque`) los términos `Crear clase`, `clases/nueva`, `/editar`, `Editar clase`, `esMaestro`, `esDueno`, `mis-comentarios`, `DESTINOS_POR_ROL`, `Nueva clase`, `accionMaestro`, `crearClase`, `TEXTOS_INICIO_MAESTRO`, `"/api/clases"`, `Destino`, `coincidencia`, `Cuentas`, `"Maestros"`, `getAllByRole("link")`, `puedeBorrar`, `administracion` y `Borrar`:
- Todas las que contradicen 02c ya están en la columna "Cambiar" de 02c: `app/router.test.tsx` (`/maestro/clases/nueva`, `:106-114` y `:170`), `components/layout/contenedor-rol.test.tsx` (dos enlaces del admin, `:71-78`), `features/clases/clase-layout.test.tsx` (`/maestro/clases/:id/editar`, `:228`), `components/formulario-clase.test.tsx` (`POST /api/clases`, `:55-162`), `inicio-maestro-view.test.tsx` ("Crear clase" hacia `/maestro/clases/nueva`, `:81-87`), `publicacion-del-muro.test.tsx` (`esMaestro` y `mis-comentarios`, `:80-316`), `adjuntos-de-publicacion.test.tsx` (`esMaestro`, `:211` y `:224`) y `muro-view.test.tsx`.
- Las cuatro de `features/auth` que montan el router (`login-view`, `registro-view`, `registro-maestro-view` y `cambio-de-identidad`) llegan a `/maestro` o `/estudiante` sin contar enlaces ni usar "Crear clase"; su doble de `fetch` es de 02d (C-16).
- `formulario-publicacion.test.tsx` y `lib.test.ts` solo traen los campos de 02b en sus dobles; `services/apiClient.test.ts` usa `/api/clases` como ruta cualquiera (`:235-266`), no como la de crear; `features/admin/*.test.tsx` no tocan la `nav`; `components/layout/lib.test.ts` (orbes) no cambia porque las pantallas nuevas son quietas.
- No hay `barra-navegacion.test.tsx`; `badge.test.tsx` está en la lista de 02c.

### `git diff --stat` (paquetes, contra `7544fb9`)
```
 frontend/src/app/marco-r1.ataque.test.tsx          |  9 ++-
 .../app/registro-maestro-03b-r1.ataque.test.tsx    |  4 ++
 frontend/src/app/rutas-clases-r1.ataque.test.tsx   | 20 ++++++-
 .../components/layout/estatico-r1.ataque.test.ts   |  5 ++
 .../src/components/ui/badge-03b-r1.ataque.test.ts  | 23 +++++++-
 .../src/features/clases/clases-r1.ataque.test.tsx  | 33 +++++++++--
 .../src/features/clases/clases-r2.ataque.test.tsx  |  5 +-
 .../src/features/clases/clases-r3.ataque.test.tsx  | 69 ++++++++++++++++++----
 .../src/features/clases/clases-r4.ataque.test.tsx  | 64 +++++++++++++-------
 .../src/features/clases/muro-c-r1.ataque.test.tsx  | 48 +++++++++++----
 .../src/features/clases/muro-c-r2.ataque.test.tsx  | 19 ++++--
 frontend/src/styles/clases-r1.ataque.test.ts       | 22 ++++++-
 12 files changed, 254 insertions(+), 67 deletions(-)
```
- `git status --porcelain -- backend shared frontend` lista exactamente estos 12 archivos. Nada en `backend/` ni en `shared/`.
- No hay archivos nuevos, ni código de producción, ni pruebas normales.
- Ningún carácter invisible en las 254 líneas `+` (lo revisé por programa).
- Prettier corrió solo sobre estos 12 archivos, desde `frontend/`: `--write` y después `--check`, "All matched files use Prettier code style!".
- Ningún título de `describe` ni de `it` existente cambió salvo los de C-n (la V-06 de `styles/clases-r1`, "36 enEspera" a "39 enEspera"; el de `clases-r1`, "POST /clases" a "POST /admin/clases"; el del control de `clases-r3`; los de la tabla de `clases-r3`, que salen de sus rutas; los de C-19 y los dos nuevos de `rutas-clases-r1`).

### Conteos
- `cd frontend; npx vitest list > <scratchpad>/front-list-02c-r0.txt`, código 0: **1399 casos** (líneas `src/… > …`; el archivo trae además dos avisos de Vite).
- `npx vitest list --filesOnly > <scratchpad>/front-list-02c-r0-files.txt`, código 0: **104 archivos**, de los cuales **56** son `*.ataque` del frontend, con **861** casos.
- Diferencia con el cierre de 02b (104 / 1396): +3 casos, todos de la ronda 0: `rutas-clases-r1` pasa de 1 caso a 3 (+2) y la tabla de `clases-r3` pasa de 7 filas a 8 (+1). Ningún archivo nuevo.
- `*.ataque`: **123** (67 del backend y 56 del frontend), sin cambio de número.

### Corrida final completa del frontend (una sola)
**Comando:**
```
cd frontend; npm test -- --reporter=default --reporter=json --outputFile.json=<scratchpad>/front-02c-r0.json > <scratchpad>/front-02c-r0.txt 2>&1
```
Corrió de 18:35:53Z a 18:37:05Z y terminó con código 1. Antes corrí `npm run lint` (código 0) y `vitest list`; nunca hubo otra suite en paralelo y no corrí el backend.

**Resumen de Vitest:**
```
 Test Files  10 failed | 94 passed (104)
      Tests  21 failed | 1378 passed (1399)
   Start at  12:35:56
   Duration  68.62s (transform 24.08s, setup 42.66s, import 168.95s, tests 296.39s, environment 195.97s)
```
- **Última línea literal del archivo:** el pie de error de npm, `npm error command C:\WINDOWS\system32\cmd.exe /d /s /c vitest run --reporter=default --reporter=json --outputFile.json=C:/Users/Carlos/AppData/Local/Temp/claude/c--Users-Carlos-Documents-Proyecto-PlataformaEducativa/***/scratchpad/front-02c-r0.json`.
- **PA-09:** los 12 archivos tocados, corridos aislados (`npx vitest run <los 12>`), dan `Tests  21 failed | 142 passed (163)` y exactamente los mismos 21 rojos (comparados con `diff` sobre el JSON de las dos corridas).

**Rojos esperados (21), todos casos reescritos que esperan a 02c.** Fuera de esta lista no hay ningún otro rojo, ni de `*.ataque` ni de pruebas normales. Al terminar 02c deben estar todos en verde (PA-05).
1. `app/marco-r1` › «marco de cada rol» › `admin`: la `nav` tiene `["/admin", "/admin/maestros"]` y falta `/admin/clases`.
2. `app/registro-maestro-03b-r1` › «'Maestros' activo y 'Cuentas' no…»: falta `["Clases", null]`.
3. `app/rutas-clases-r1` › «un estudiante en la ruta retirada /maestro/clases/:claseId/editar termina en /login…»: hoy termina en `/estudiante`.
4. `app/rutas-clases-r1` › «un maestro en la ruta retirada …/editar termina en /login…»: hoy se queda en `/maestro/clases/:claseId/editar`.
5. `styles/clases-r1` › V-06 «… 39 enEspera»: hay 36.
6. `components/layout/estatico-r1` › «los únicos valores arbitrarios…»: falta `translate-x-[200%]`.
7. `components/ui/badge-03b-r1` › «se leyeron las cinco variantes…»: hay cuatro.
8. `features/clases/clases-r1` › «… no manda un segundo POST /admin/clases»: no existe el campo "Buscar maestro por nombre".
9. `features/clases/clases-r2` › «al editar, un VALIDACION de la descripción…»: el `PUT` todavía va a `/api/clases/:claseId`.
10. `features/clases/clases-r3` › «control: la clase primaria de los enlaces se reconoce (la lista de clases del admin tiene …)»: `/admin/clases` no existe (cae en `/login`).
11. `features/clases/clases-r3` › «`/admin/clases/:claseId` (con clases): a lo sumo una acción principal»: hoy la perspectiva admin no muestra el código ("ABCDEFG").
12. a 19. `features/clases/clases-r4` › «crear: …» (los 6 errores sin campo y los 2 VALIDACION de campo): no existe el campo "Buscar maestro por nombre".
20. y 21. `features/clases/clases-r4` › «editar: un VALIDACION de nombre / descripcion sigue bajo su campo…»: el `PUT` todavía va a `/api/clases/:claseId`.

Pasan hoy y deben seguir pasando (no son rojos esperados): las filas `/admin/clases/nueva` y `/admin/clases/:claseId/editar` de la tabla de `clases-r3` (las vistas ya existen); los 3 casos de editar de `clases-r3` y los 6 de editar sin campo de `clases-r4` (500, sin conexión, 403 y los VALIDACION que no son de un campo), que hoy pasan porque el doble responde también un error en la ruta vieja y con 02c recibirán la respuesta en la ruta nueva; y los casos del muro de `muro-c-r1` y `muro-c-r2` con `puedeBorrar: false` (la vista de hoy decide por el rol).

### Observaciones (no son hallazgos; los decide el manager)
- **O-01 (`/maestro/clases/nueva` no cae en el `*`):** §D-2C3 dice que `/maestro/clases/nueva` y `/maestro/clases/:claseId/editar` "caen en el `*` → `/login`". Eso vale para `…/editar`, pero no para `…/nueva`: con las rutas de hoy, `/maestro/clases/nueva` coincide con `clases/:claseId` (con `claseId = "nueva"`). Así, el maestro vería `ClaseLayout` y la app pediría `GET /api/clases/nueva`, que el backend rechaza con `400 VALIDACION`. PR-2C08 pide que las dos rutas "no existan". No reescribí ningún caso por esto (ninguna `*.ataque` monta hoy `/maestro/clases/nueva` con el router de la aplicación). Queda para el programador (PR-2C08) y para mi ronda 1. Hermanos: cualquier segmento literal retirado bajo una ruta con `:claseId`. `/admin/clases/nueva` frente a `/admin/clases/:claseId` sí se resuelve bien, porque el segmento literal gana.
- **O-02 (contratos que fijan las pruebas reescritas; salen del plan; si la implementación difiere, el rojo es del programador, PA-05):**
  - **Rutas del frontend:** `/admin/clases` (la lista, dentro del marco del admin), `/admin/clases/nueva` (`CrearClaseView`), `/admin/clases/:claseId` (`ClaseLayout` con `MuroView` como índice) y `/admin/clases/:claseId/editar` (`EditarClaseView`). `/maestro/clases/:claseId/editar` ya no existe y termina en `/login` sin pedir la clase ni su código, para el estudiante y para el maestro; `/maestro/clases/:claseId/alumnos` sigue existiendo (el estudiante vuelve a `/estudiante`).
  - **Rutas de la API que llama el frontend:** `POST /api/admin/clases` (crear) y `PUT /api/admin/clases/:claseId` (editar); nunca `POST /api/clases` ni `PUT /api/clases/:claseId`. Los candidatos, por `GET /api/admin/maestros/candidatos…` (el doble acepta cualquier consulta). La lista, por `GET /api/admin/clases` o `GET /api/admin/clases?…`.
  - **Nombres accesibles:** el campo del selector se llama "Buscar maestro por nombre"; el botón de cada resultado, "Elegir" seguido del nombre como texto `sr-only` con un espacio ("Elegir Luis Pérez", como "Agregar a la clase Candidato 1" del buscador de alumnos); "Crear clase" (el botón del formulario) y "Guardar cambios"; los campos "Nombre de la clase" y "Descripción (opcional)" no cambian. En crear, después de elegir al maestro, un error sin campo da un solo toast sin prefijo técnico y no marca "Nombre de la clase" ni "Descripción (opcional)"; un `VALIDACION` de `nombre` o `descripcion` queda bajo su campo, sin toast.
  - **Una sola acción principal:** el enlace "Crear clase" de `/admin/clases` lleva exactamente la cadena de `buttonVariants({ variant: "primary" })`, sin `size` ni clases extra (si lleva otra, el control de `clases-r3` falla y hay que decidir si es un cambio del plan). `/admin/clases/nueva`, `/admin/clases/:claseId` y `/admin/clases/:claseId/editar` tienen a lo sumo una acción `primary`. En `/admin/clases/:claseId` el admin ve el código de la clase (P-04 a).
  - **Barra del admin:** "Cuentas" (`/admin`), "Maestros" (`/admin/maestros`) y "Clases" (`/admin/clases`), en ese orden y como únicos enlaces de la `nav`; en `/admin` solo "Cuentas" lleva `aria-current="page"`, y en `/admin/maestros` solo "Maestros". Que "Clases" quede activo en sus subrutas es PR-2C11 del programador; la ronda 0 no lo fija.
  - **Insignia:** `badge.tsx` declara la variante como `institucional: "bg-accent-soft text-link"` (dos clases, en ese orden, en una cadena como las demás, porque `badge-03b-r1` las lee con la expresión `(\w+):\s*"bg-X text-Y"`); el rojo sigue solo en `danger`.
  - **`enEspera`:** 39 en total, con los fijos de C-20 (incluidos los ceros de `tabla-clases-admin.tsx` y `firma-del-autor.tsx`); un `enEspera=` en `maestros-de-clase-view.tsx` o en `crear-clase-view.tsx` cae fuera de la lista y pone V-06 en rojo.
  - **Maquetación:** el único valor arbitrario nuevo es `translate-x-[200%]`, escrito así (sin prefijo de variante). `data-material` y `data-densidad` siguen solo en `contenedor-rol.tsx` (V-07 no cambia en 02c).
  - **Muro:** los dobles del estudiante llevan `puedeBorrar: false` en lo ajeno y `true` en lo propio; ninguna prueba reescrita depende del rol para mostrar "Borrar".
- **O-03 (`inicio-sin-datos-r2`, para la ronda 1):** el caso protege que un inicio sin datos no afirme vacío ni total. El texto nuevo del maestro sin clases ("La administración te asigna tus clases. Cuando lo haga, aparecerán aquí.", §D-2C3) también afirma que no hay clases, pero no está en la lista `TEXTOS_QUE_AFIRMAN_DATOS`; hoy tampoco lo está su equivalente ("Crea tu primera clase…"). No lo agregué porque ningún C-n contradice el caso; lo atacaré en la ronda 1.
- **O-04 (`muro-c-r2`, rama muerta del doble):** el servidor en memoria de `muro-c-r2` sigue respondiendo `204` a `DELETE …/mis-comentarios/…`. Con 02c esa ruta deja de usarse (C-13); no es una aserción, así que no la toqué. Que el borrado del comentario propio del estudiante vaya a la ruta general lo cubre PR-2C09, y lo atacaré en la ronda 1.

### Archivos
- **En el repositorio:** las 12 `*.ataque` de la tabla, marcadas "cambia: ronda 0 de 02c".
- **En el scratchpad** (`C:/Users/Carlos/AppData/Local/Temp/claude/c--Users-Carlos-Documents-Proyecto-PlataformaEducativa/0674b697-54d2-4eb4-ad9a-7234f1426d63/scratchpad/`):
  - `tabla-02c-r0.md` (la tabla)
  - `front-02c-r0.txt` y `front-02c-r0.json` (la corrida completa); `front-02c-r0-aislados.txt` y `.json` (PA-09); `rojos-completa.txt` y `rojos-aislados.txt`
  - `front-lint-02c-r0.txt`, `front-list-02c-r0.txt` y `front-list-02c-r0-files.txt`
  - `base-02c.txt`, `actual-02c-pre.txt` y `actual-02c-r0.txt` (V-01); `cambian-02c.txt`
  - `diff-02c-r0.txt` (el `git diff -U0`)
  - `pares-02c/` y `rep.py` (los reemplazos aplicados, cada uno con su ancla literal y su número exacto de apariciones)

### Tabla de SHA-256 de las 123 `*.ataque` después de la ronda 0 de 02c (base de V-01 del programador; cambian 12, marcadas)
| SHA-256 | Archivo | Cambio |
|---|---|---|
| `BCCE2CAE771F97957D8691BEF7FFF4EC42412DAAEABF726AEB0AFC59F6F25671` | `backend/src/config/correo.ataque.test.ts` |  |
| `DCB78D222544E8DC4FBECE59468F555B04ABE971B70016E9BB17FCAE3E958580` | `backend/src/config/env.ataque.test.ts` |  |
| `71E7F049447D2D1ECEDD897C55EA0B6D31221753F0A7E7473C7AC6E8667F0A95` | `backend/src/config/logger.ataque.test.ts` |  |
| `91F620C1A27778EEBC2BED5EEC1BC9B0E3FE1199B32ED00F9DD910011D6A1805` | `backend/src/core/clases/codigo-r1.ataque.test.ts` |  |
| `262691F5786AD63B2393D0BA5FF97538F6DACF43343BED019AD23C12A07D8686` | `backend/src/core/clases/codigo-r2.ataque.test.ts` |  |
| `E769CBFCC3A83A64B51C6437F80684640A7C928AD6B8C5C1671FDFF005D7B734` | `backend/src/workers/ritmo-03c-r1.ataque.test.ts` |  |
| `36C23511D5BFD24F2BB999BA34B00C193C8DD0FD0782F29F4E0BB00631E2FBCA` | `backend/test/admin-muro-02b-r1.ataque.test.ts` |  |
| `388AD0E585639B8C3E0E0A6657FB42C1B9CB83DB721C4863C4FA19E0BE42EC85` | `backend/test/admin-unico.ataque.test.ts` |  |
| `D2CC28B62BF988AE14BA975A9BC8D534AEC0EEBCE30DA93D7DED9A26026B0857` | `backend/test/alumnos-b-r1.ataque.test.ts` |  |
| `00346D471355ABC7971B921649E7192B8987FE27912C00CB7E41AEF2065369E9` | `backend/test/alumnos-b-r2.ataque.test.ts` |  |
| `FC11AB4B914D4A88612953F82DB354E2B9CEA9BEF86E24321EF7E031F3AC3837` | `backend/test/alumnos-b-r3.ataque.test.ts` |  |
| `441A766A94E7D9B26807790402E06ED94D4CC378D8F6ECF0BCCC3259C7FF55FB` | `backend/test/api-real.ataque.test.ts` |  |
| `D9E1DE5B1BD43F54CF3A4DCF153D1EEABDC36B4DEC02FBEB9D8A0239F298DFE9` | `backend/test/archivos-d-r1.ataque.test.ts` |  |
| `1637EB447CD12AC5BDDDC7634980DBC10A25CBAD5DE01BF6C09F40ED930FF1A9` | `backend/test/archivos-d-r2.ataque.test.ts` |  |
| `42BB7BF3086230C6EDC65AB73976AC8A801956336561AADBEE65CC3B40EB8612` | `backend/test/arquitectura-cuentas-r1.ataque.test.ts` |  |
| `38ADB0984744A0810287711F57BA0498287D0BC96344B8948BA1C490CA807716` | `backend/test/arranque-r1.ataque.test.ts` |  |
| `2C83D82D10BDD9B7A969768774D75B18B7A71A594BBAAC5FAE36A0E134D2336C` | `backend/test/auth-login.ataque.test.ts` |  |
| `73D3A2AE708A0EF676547A8094115B1419423057378387269BC3EADB34C7724E` | `backend/test/auth-registro.ataque.test.ts` |  |
| `6F557E8E860BCE6374671E90086E9C14B1861A308B6FBB434564612647892713` | `backend/test/autoria-02b-r1.ataque.test.ts` |  |
| `95BBA9BAC44366AD5A361E93DD2F278CB0A1CC889FA479049ACC7B45A9A5E71B` | `backend/test/clases-r1.ataque.test.ts` |  |
| `A87817D56C236C0BA3597214CAC23B10483BBC28AE44800C592ED5CE2EF97F38` | `backend/test/clases-r2.ataque.test.ts` |  |
| `72DE7D8AF3D3F772ABC19DB065F6E418F6EB76CE78D87FE6EBB51335FC99825A` | `backend/test/clases-r3.ataque.test.ts` |  |
| `BE97C4E48AC9551BED1D01552E90AB8CDF085CF928AE6C8C3D81809E35F7CE62` | `backend/test/clases-r4.ataque.test.ts` |  |
| `000EC9008C73D25121C82A46F5EA0F67E6C8C387CB04E361EF82812B57956098` | `backend/test/concurrencia-02a-r1.ataque.test.ts` |  |
| `530546B4D70A2B9AD36F98F37E2AF45480E81A1101EE3516D15426F78350BF82` | `backend/test/cuentas-03a-r1.ataque.test.ts` |  |
| `6303DDC170545F616C66773C3F5475CB3BE1FEA9347D8059354D6ADE8D676C16` | `backend/test/cuentas-r1.ataque.test.ts` |  |
| `3A4E81C111B8EEB7DF065804AA85062FA3FC607F0147149B71AC21C14E7818D9` | `backend/test/cuentas-r2.ataque.test.ts` |  |
| `F54F79F7B2A83E95FE440053CCAF15CB3EBB01CE5DFD4C6655E22159A5FD7E6B` | `backend/test/cuentas-r3.ataque.test.ts` |  |
| `A2F9BFF596330A7D55D1CA9D47197FC831EB132F52C759610E2D667895C3332F` | `backend/test/cuerpos-02a-r2.ataque.test.ts` |  |
| `D7A9DA854CE8AB8AD8D2437DB2E8C2A642A777EA3261A6B038DA28BE022DF848` | `backend/test/enlaces-03b-r1.ataque.test.ts` |  |
| `DC1B7EE7EA58966F5DB33CCB4581885A9669DEA2263954AE46D17A83E1EF6EAF` | `backend/test/enlaces-03b-r2.ataque.test.ts` |  |
| `B051B1986496E35E3E306C4C6BC306A763542BCA4B350574D0C02E2C484DEB35` | `backend/test/enlaces-ch-r2.ataque.test.ts` |  |
| `D28CC4DE621A680E6B54B2BFF889700300D558EC7849717584518D2F03EC8CAE` | `backend/test/entorno-ch-r1.ataque.test.ts` |  |
| `BA1AC9B17CC9BF747522BD4EC8B87DF436008482E643B18EEA8E9A8C041C59B3` | `backend/test/formada-ch-r1.ataque.test.ts` |  |
| `EC9602D5F109B45A6D428E708D9B6CDD37A7509A6FF9031FA6FD8A2DA0E25E9B` | `backend/test/gestion-02a-r1.ataque.test.ts` |  |
| `5F4133F949D2F337A8F63B75CF82CB77114DB7812D67C1960105F5000C31A326` | `backend/test/guarda-ch-r1.ataque.test.ts` |  |
| `7A7DAC6D87EDF81059FCFF9C07471AAF49D690EC159BE4B9FD4AA32B0909A215` | `backend/test/guarda-ch-r2.ataque.test.ts` |  |
| `610EE44E5D0BCEA46EB4E3645F9ADF1998A76947A25AF7E3F8248EA3A633DF79` | `backend/test/guarda-ch-r3.ataque.test.ts` |  |
| `E5D149F3AC52B726E1FE08908249706341330F88EAA6674B9A9AC67B98B1E864` | `backend/test/guarda-clase-r1.ataque.test.ts` |  |
| `C979D2C9C420A2177FA6EBDDB78EB2CE84D5F043B94270F690916A6FC75D6F8F` | `backend/test/guarda-clase-r2.ataque.test.ts` |  |
| `20982E2B98F1B162146A211923F3D5EC19D4E170C4AA3A5BFC6F82C3B6173AAD` | `backend/test/guarda-r2.ataque.test.ts` |  |
| `A8B79D5AD98270BE3747F493865708A78BB73ADD08D832584DB4464C3582777A` | `backend/test/intentos-r2.ataque.test.ts` |  |
| `2619B44EEA3370494C95AC128FCFD9E3FFC20D1581A19F549BF371F603A11D7D` | `backend/test/invitacion-flujo-03a-r2.ataque.test.ts` |  |
| `704155928183AEC193AE7E157B86B3E9361D2B63C7A47BE1ED859605FAB4FFA6` | `backend/test/invitacion-masiva-03c-r1.ataque.test.ts` |  |
| `DD9B7454E8786BF0B833D265900CCAECF595808CEBC8E9A77C9AEF15298A1038` | `backend/test/invitacion-masiva-03c-r2.ataque.test.ts` |  |
| `F9F9EC59EC8D1A5CCB180522798140C45604440F48EDCD68A3E02863D90AE347` | `backend/test/logs-02a-r1.ataque.test.ts` |  |
| `A2006C163D9E6CD3E4A2A773D1501826DAF3C8E7BB184D205BFC6442318FB59C` | `backend/test/logs-02b-r1.ataque.test.ts` |  |
| `BD8B303C434EFEC0785E0691D31D6F6E87DBF3305F50FA27CCE0F78CBB251E3A` | `backend/test/logs-03a-r1.ataque.test.ts` |  |
| `B58D5D013658433FE5839634E2DB5A31B8D2B8F69587BC36958752D3CD33BBF7` | `backend/test/logs-03b-r1.ataque.test.ts` |  |
| `0E4ABF3BC5D92FA0C380805453190703862567930DD74B9E7FCC1809564D181F` | `backend/test/logs-03c-r1.ataque.test.ts` |  |
| `1E775A19682F3A5995D7C035BCC810A36BF50C22045B6FFBFC5A98B821255DB0` | `backend/test/logs-archivos-d-r1.ataque.test.ts` |  |
| `E9CE866D511E3EE6029015B74E20B4D342A60BE99B3AAC97E86F00283A3C77F1` | `backend/test/logs-archivos-d-r3.ataque.test.ts` |  |
| `E008935B107752D203F6423B2F1C9E0F5A4339F0A77154746BF262CECB90351A` | `backend/test/logs-cuentas-r1.ataque.test.ts` |  |
| `690E30ED39111C0A074FC159015967CD9F0FDC24D9A340E6A0D7BE4B980A9D45` | `backend/test/logs-muro-c-r1.ataque.test.ts` |  |
| `0809C60700E26183E7771B4B1A40B05CBF554C2ED7929190CF4D89A52722E551` | `backend/test/logs-muro-c-r2.ataque.test.ts` |  |
| `5AF3909E4B7CA485E78979567872EA78BF41E6D679B9EC2C761EAA0B250DF689` | `backend/test/logs-r2.ataque.test.ts` |  |
| `AE66FBCF60E8F66336E77C1055893E60CB85A01BC746B89C68A4D2C70C807AF1` | `backend/test/muro-c-r1.ataque.test.ts` |  |
| `7825CFC9B484DF740FA0E9562A195D1BBCAF4CAF72EA55FA847B5394AB96C125` | `backend/test/muro-c-r2.ataque.test.ts` |  |
| `8B733B86FC6D54ECE008389A59793FAE4EC4A65146EB37215E900E50A5337D46` | `backend/test/nombres-guarda-r3.ataque.test.ts` |  |
| `00A6EB6F7CCD7D8790C356BEFCC96DDFDA6EACCE0BE53DE255CFE3626D8F2ADB` | `backend/test/nombres-tokens-r2.ataque.test.ts` |  |
| `80B5A848F69B429E7DADEC86C07BEC1D3E3EED8A042EFBA41CE912DED39E7BAB` | `backend/test/nowait-ch-r1.ataque.test.ts` |  |
| `6F2ABC2CEFD77D74CD1E3ABBDCE9C41BB53D00BD4D8E5BA7E496C4441C2697E5` | `backend/test/servicio-ocupado-ch-r1.ataque.test.ts` |  |
| `3B2D94ABCCBEDD6FB53CF666AAD06ADF431A0DB9A09264F05D8ADF6963CBD0AE` | `backend/test/sesiones-y-cadena.ataque.test.ts` |  |
| `70AC720F2E7FCADEE5BBCB6414887AB08129DEA7CD91DF012046953B1584E8B6` | `backend/test/sexto-paso-02a-r1.ataque.test.ts` |  |
| `F09E9A0038C47D1A2223376A0AF260BAF573F0C45BF770201C48C9E30296F04B` | `backend/test/worker-03c-r1.ataque.test.ts` |  |
| `9F60F9D65D52D2021A1EB04E9F01D3CC68F22744C845BF93D6621AA4FE9713A8` | `backend/test/worker-r1.ataque.test.ts` |  |
| `77D11BD85F202A9EEC92A363DF82E63FB9A784CA9D368D49F62E61C1A2AA967B` | `backend/test/worker-r2.ataque.test.ts` |  |
| `B89EDE0F6AED45DFCB5E64C8909A822156CE43FD80948E72419CDCE9D4541A87` | `frontend/src/app/cache-03a-r1.ataque.test.tsx` |  |
| `E85743C0FBB8E476874A2C67334342D8D69D14153579FC1E4CCE0AE6E2B29616` | `frontend/src/app/contexto-r1.ataque.test.tsx` |  |
| `BC2BE5541006887E2A5A4A89B33046180F607D54474B0F96A73D615AFBCAC385` | `frontend/src/app/contrasena-r1.ataque.test.tsx` |  |
| `F38BCACB716D8A39ACDB3535A95603CD0D8AB02572CA57A7DF5268B01CEB6EAC` | `frontend/src/app/contrasena-r2.ataque.test.tsx` |  |
| `68FB5D092C0C8ECFCF282477EF023AAAE26F6B869656E05109DC3EFA276D842A` | `frontend/src/app/cuentas-r1.ataque.test.tsx` |  |
| `41930017715D3D6869DC7ACEFD75DE8EC3684F1F035B845ABDF8EC0F6B734DEE` | `frontend/src/app/cuentas-r2.ataque.test.tsx` |  |
| `1506C27E5F7418B5E087FD30F8809645A2FC3E2761C7249DE78F02E24AA6C7A5` | `frontend/src/app/en-espera-r1.ataque.test.tsx` |  |
| `DB48DAD405C27062621A44D3744C84CC5903892A51E5A8DF18F41383CB9C88A3` | `frontend/src/app/errores-r1.ataque.test.tsx` |  |
| `F95321E604E20B533EBF2DB3C1C6C66BA2F2D87A48F075415B766551F6EE30F4` | `frontend/src/app/fondo-r1.ataque.test.tsx` |  |
| `57CB54AFD3B79464F0DF01B88FC388CEBBEAC5657D936C4C204CBAE6034B0834` | `frontend/src/app/marco-r1.ataque.test.tsx` | cambia: ronda 0 de 02c |
| `D32E1C5B5629C37D2521446D7E578CDB081DD71F5B5026E73E13C58E16D92801` | `frontend/src/app/muro-recuperar-c-r3.ataque.test.tsx` |  |
| `BEC7B7B49E056AFE514F654FCA9C562D77A090F7421057B8B03D57D4E862140A` | `frontend/src/app/muro-recuperar-c-r4.ataque.test.tsx` |  |
| `2F8056A770397C1601647277944555A48AFC4B9A2BABEB75E5898F0CC92562BB` | `frontend/src/app/muro-rutas-c-r1.ataque.test.tsx` |  |
| `0EEFED2C05D76B0790A437E9465A898A9076083B1F046F8785145CFAAD0DA379` | `frontend/src/app/registro-maestro-03b-r1.ataque.test.tsx` | cambia: ronda 0 de 02c |
| `053E867A904AFA3C09EEF92CA2E03E929D9F9C93F714040856F40C7418721BBE` | `frontend/src/app/router.ataque.test.tsx` |  |
| `C7946F5F5D5D16D36B395ADC2AD9928ACC7FD9839875FB64532B51489756730B` | `frontend/src/app/rutas-clases-r1.ataque.test.tsx` | cambia: ronda 0 de 02c |
| `F090CBD8E8C9B0AF52D4FC19547B07E9B6413F5414CC4B10862F01E29818DDDC` | `frontend/src/app/sesion-r2.ataque.test.tsx` |  |
| `FA229C216651693AFFDAC0FDDD148EC5AC26FDFB3A15ABB827F21CCBCEF4C3E1` | `frontend/src/components/layout/estatico-r1.ataque.test.ts` | cambia: ronda 0 de 02c |
| `0AAA18CD70465293B6FCA6CC051B8E4AC360A838D02FEDE848C35376C3D0066C` | `frontend/src/components/layout/pie-r1.ataque.test.tsx` |  |
| `00A707429AF6B5326F9A96DEF6382823CF4A6A092AAC7E7BD7CBCB8DC9AA1D21` | `frontend/src/components/layout/pie-r2.ataque.test.tsx` |  |
| `472E1F46D0C899496AA334909B02988962AAB07B9BD29A8D7B8AF3987FAC6C76` | `frontend/src/components/layout/pie-r3.ataque.test.tsx` |  |
| `A1814D281DAFD8243989C9F9A462A4F33A86B1FB70EEEBF29E99BCB0F340D82A` | `frontend/src/components/ui/badge-03b-r1.ataque.test.ts` | cambia: ronda 0 de 02c |
| `86ADAA9A093A987DAFD97E279E600211CBDF6CEF97879D16FA2D8A9D2846F8B5` | `frontend/src/features/admin/cuentas-r1.ataque.test.tsx` |  |
| `B948E9359FD3981E08B850540027F536F345A3F48D7C0749BA0C16C2C1DF1184` | `frontend/src/features/admin/cuentas-r2.ataque.test.tsx` |  |
| `72BF9AF4CE8F52A114897E038CEFB0947841A37F74074F4C5F8DEC68A71B654A` | `frontend/src/features/admin/cuentas-r3.ataque.test.tsx` |  |
| `942DF3015424AED56E83661993BA015E871CD6BE8E797920D47E8CBF0C56EAC4` | `frontend/src/features/admin/cuentas-r4.ataque.test.tsx` |  |
| `3BD26E7E3BF019D462DB4837861ED22017BBB9E9A6276720BF0DEA6C2B5B0998` | `frontend/src/features/admin/en-espera-r1.ataque.test.tsx` |  |
| `8219C864E7BDC1315E6A0F0FF1CD6F54E4710CEBDCEB8E316F4E53AACC0CFF35` | `frontend/src/features/admin/foco-r1.ataque.test.tsx` |  |
| `30F45BBA30D9348EC1587B42E84CA370274E1BF0AF0F310B8A6BBD79FA982669` | `frontend/src/features/admin/maestros-03b-r1.ataque.test.tsx` |  |
| `D477A809E55E603D3EF6C02CA43B21372B75D0947FA303F1539D48BDF32841F8` | `frontend/src/features/admin/maestros-03c-r1.ataque.test.tsx` |  |
| `3CEDA51DB8F67F40C26615FBC4CD7D082035B00F38713C6CA4C7DB58E47926C8` | `frontend/src/features/auth/enlace-r1.ataque.test.tsx` |  |
| `1F5D1147637C09DAA6FDF1384E4395EDD69DFDAB84AAE5D602A362DABD3295BD` | `frontend/src/features/auth/enlace-r2.ataque.test.tsx` |  |
| `991B115524D8DADE8D6EA2C51FB753DC8832EE410DB2161A0CE761D011CFCA4A` | `frontend/src/features/auth/invitacion-r1.ataque.test.tsx` |  |
| `25375E6678BA9B5331D53B78031BD315A8651F16CD32571E9FCEE539D07C5BA8` | `frontend/src/features/clases/alumnos-b-r1.ataque.test.tsx` |  |
| `55DC274ECA96DA4360848B88F9F2A839AC815031490AB57FF38DE074512D632C` | `frontend/src/features/clases/alumnos-b-r2.ataque.test.tsx` |  |
| `371518E4309F14201A92D29F9436A97A19801B506D45114964FBCFE3F5CD4183` | `frontend/src/features/clases/alumnos-b-r3.ataque.test.tsx` |  |
| `266D088DD727F18AF8C8A106B8D9C4DBED75753E4B1B4ABB12F3A4DF870ECB7F` | `frontend/src/features/clases/alumnos-b-r4.ataque.test.tsx` |  |
| `856CFFBD9C743F9815DAF731487E29DC5F5272545DC15820A70BAF86ECFA6527` | `frontend/src/features/clases/alumnos-b-r5.ataque.test.tsx` |  |
| `1E9A26ED86EE637E1A2E065DC05DA79CBB5048E18A020285D6B479FD290BCC9C` | `frontend/src/features/clases/archivos-d-r1.ataque.test.tsx` |  |
| `EFC07CC006E16E03BEEC69A17E08AED83657095555107B28FB1AB3EF1400E687` | `frontend/src/features/clases/archivos-d-r2.ataque.test.tsx` |  |
| `E01A46173F2820F0AF15824C88AA81805412B70248062F419DD40236C9EED7E3` | `frontend/src/features/clases/archivos-d-r3.ataque.test.tsx` |  |
| `5F0679D8CFACC8BCE01989C04A415DC5B546625EB7DEC92F03959DE5A0F89815` | `frontend/src/features/clases/clases-r1.ataque.test.tsx` | cambia: ronda 0 de 02c |
| `C7AD5EDC733E374117A9277F1C2987E84CC2930C77EB4C720CCF15CC9F5FAB45` | `frontend/src/features/clases/clases-r2.ataque.test.tsx` | cambia: ronda 0 de 02c |
| `A835A11D29AEDB8F77F91E826A22C2B7CF5322FCED3F6BED0C1ACBF7C75A4E61` | `frontend/src/features/clases/clases-r3.ataque.test.tsx` | cambia: ronda 0 de 02c |
| `86B04D234527ECEEFCA35B07CE89E6B7CE0B6AFE5CCDEE2F005E6A4219F0495A` | `frontend/src/features/clases/clases-r4.ataque.test.tsx` | cambia: ronda 0 de 02c |
| `CDD1ED8890859AE3E884822FC7074852A2173105114745D83FE9A15C1C47C626` | `frontend/src/features/clases/estatico-r1.ataque.test.ts` |  |
| `7C434A0E54E70B12D4B2A3DE22FFB4DBF5F28A1CFBD2290C22E8A2B59EDF0E16` | `frontend/src/features/clases/inicio-sin-datos-r2.ataque.test.tsx` |  |
| `BF0CAB9760A82DB5761777542827F89E4DE9F3712D06E44916F698ABDA1ABBAA` | `frontend/src/features/clases/muro-c-r1.ataque.test.tsx` | cambia: ronda 0 de 02c |
| `D91FCE8DFB93139D9F7941E33BA8904D92C4560B37A61737688194C9504B093E` | `frontend/src/features/clases/muro-c-r2.ataque.test.tsx` | cambia: ronda 0 de 02c |
| `73523416AE3F04A4AE4DB25685E2C9A5BA8EB3DB015225DFEDC76EDF5D75958F` | `frontend/src/features/clases/muro-c-r3.ataque.test.tsx` |  |
| `C71CBA65DD284D7AF11CBC812B6BCF75BAA373939EDB8318E731858D9C50173F` | `frontend/src/lib/format-d-r1.ataque.test.ts` |  |
| `89DBBB70D5DC404C3D74DB5391D10855C8CB1D6B4C643B6147B3CE6FFB2637AF` | `frontend/src/lib/format-d-r2.ataque.test.ts` |  |
| `BFA7DED62F7A1402590D438A1CC51060A63FA019AD47D3EB5740E43383064A2A` | `frontend/src/lib/format-d-r3.ataque.test.ts` |  |
| `10C730348D18FF8DAE7B3623751D31122AA58560B564AD191717FA1938A6F8CE` | `frontend/src/services/apiClient.ataque.test.ts` |  |
| `7986CE1FE3EBF76714AA064FADE5BBEB855037A02EF66F6532632E8720ABC68B` | `frontend/src/styles/clases-r1.ataque.test.ts` | cambia: ronda 0 de 02c |
| `B8085BCBBC7F4B6276BF3A87FB7BA0BC887953A8C6CE372354A7F3F1B5037582` | `frontend/src/styles/tokens-r1.ataque.test.ts` |  |

## CLASES-02c — Ronda 1

# Reporte del Tester — CLASES-02c · el admin en las clases, el maestro sin crear ni editar, autoría en el muro (frontend) — Ronda 1
Veredicto: **ROTO** (1 hallazgo, media: T-02)
Verificación propia: lint `cd frontend; npm run lint` código 0 (última línea `> tsc -b`) · test `cd frontend; npm test`, tres corridas completas seguidas: `Tests  2 failed | 1618 passed (1620)` en las tres, con los mismos 2 rojos (los de T-02)

### Precondiciones
- **Fecha y base:** 2026-10-05; rama `feat/clases-02`; base dentro de los paquetes `<K2b>` = `7544fb9`. Red aceptada por el humano para hoy. Solo frontend: `git status --porcelain -- backend shared` vacío y `git diff --stat 7544fb9 -- backend shared` vacío; no corrí el backend (02c no lo toca) y PA-07 no aplica.
- **V-01:** las 123 `*.ataque` contra la tabla de la ronda 0 de 02c: **123 de 123 iguales**, ninguna sin rastrear antes de empezar. El programador no tocó ninguna `*.ataque`.
- **Procesos ajenos:** no arranqué ni toqué ningún proceso del humano; nadie más corrió pruebas mientras corrían las mías; nunca dos suites a la vez.
- **Archivos nuevos (6, solo míos):** `frontend/src/app/rutas-02c-r1.ataque.test.tsx`, `frontend/src/features/clases/muro-02c-r1.ataque.test.tsx`, `clases-admin-02c-r1.ataque.test.tsx`, `maestros-02c-r1.ataque.test.tsx`, `inicio-sin-datos-02c-r1.ataque.test.tsx` y `estatico-02c-r1.ataque.test.ts`. Ninguna `*.ataque` existente, prueba normal ni archivo de producción cambió. Prettier solo sobre esos 6, desde `frontend/`.

### Hallazgos

#### T-02 — «Asignar a la clase» y «Sí, quitar» siguen activos después del éxito: un segundo clic manda otra petición y repite el aviso
Severidad: media
Prueba: `frontend/src/features/clases/maestros-02c-r1.ataque.test.tsx` › «ataque CLASES-02c r1: «Maestros de la clase»» › «asignar: con el POST ya respondido y la clase sin recargar, un segundo clic en «Asignar a la clase» del mismo maestro no manda otro POST ni otro aviso» y «quitar: con el DELETE ya respondido y la clase sin recargar, un segundo clic en «Sí, quitar» no manda otro DELETE ni otro aviso».
Reproducción:
1. `/admin/clases/:claseId/maestros` con un maestro (Luis); se busca «Mari» y se pulsa «Asignar a la clase María Gómez».
2. El `POST /api/admin/clases/:claseId/maestros` responde `200` (como el servidor real: asignar es idempotente, `decidirAsignacion` devuelve `ya_asignado` sin escribir). Sale «Asignaste a María Gómez».
3. Mientras llega la recarga de la clase (`GET /api/clases/:claseId`, que `invalidarMaestrosDeLaClase` dispara), el botón «Asignar a la clase María Gómez» sigue en pantalla y ya no está en espera (`asignar.isPending` es `false` y `yaElegidos` sale de la clase todavía sin recargar). Un segundo clic manda otro POST.
4. Lo mismo con «Sí, quitar Luis Pérez» en una clase con dos maestros: tras el `200` del `DELETE` (retirar también es idempotente), la fila sigue confirmando con «Sí, quitar» activo hasta que llega la recarga.
Esperado / Obtenido: esperado `{ posts: 1, avisosDeExito: 1 }` y `{ deletes: 1, avisosDeExito: 1 }`; obtenido `{ posts: 2, avisosDeExito: 2 }` y `{ deletes: 2, avisosDeExito: 2 }` en las tres corridas. Con la petición **en vuelo**, `enEspera` sí protege: el doble clic humano a 30 ms manda una sola petición (casos «asignar: doble clic humano (30 ms) con el POST en vuelo…» y «quitar: … doble clic humano (30 ms) en «Sí, quitar» con el DELETE en vuelo manda uno solo», en verde). La ventana es la de una ida y vuelta de red: en una red rápida, un doble clic lento la alcanza.
Efecto: no se dañan datos (el servidor no escribe la segunda vez), pero la persona ve dos avisos «Asignaste a …» o «Quitaste a … de la clase» por una sola acción, y la interfaz ofrece de nuevo una acción que ya se hizo. Si el admin pulsa «Asignar» a otro maestro en esa ventana, el servidor responde `409 TOPE_DE_MAESTROS` con su mensaje, que sí es correcto.
Requisito o regla violada: lista de ataque del tester, «Datos y estado: doble envío del mismo formulario»; `CLAUDE.md` («Un botón cuya petición está en vuelo usa `enEspera`…»: aquí la acción sigue ofrecida cuando ya terminó y el dato que la esconde todavía no llegó); `DESIGN.md` §7.14 y §7.17 (la insignia «Ya da esta clase» debería sustituir al botón en cuanto la asignación termina).
Hermanos (para que el programador diga uno por uno si el remedio aplica):
- «Asignar a la clase» (`buscador-de-maestros.tsx`, `FilaParaAsignar`) y «Sí, quitar» de la lista de maestros (`lista-maestros-de-clase.tsx`, con `confirmar`): los dos de este hallazgo.
- «Agregar a la clase» del buscador de alumnos (`buscador-alumnos.tsx`, CLASES-b): misma ventana (el botón sigue hasta que llegan los candidatos recargados); allí el servidor responde `yaEstaba` y el aviso dice «ya estaba», así que el efecto es menor. No lo reescribí ni lo ataqué en esta ronda (no es de 02c).
- «Sí, quitar» del roster (`tabla-alumnos.tsx`, CLASES-b): misma forma (la fila sigue confirmando hasta la recarga). No verificado en ejecución.
- «Elegir» del selector al crear (`FilaParaElegir`) **no** es hermano: solo cambia el estado local y el botón se vuelve «Ya elegido» en el mismo render (caso «dos clics seguidos en «Elegir» del mismo maestro no lo eligen dos veces», en verde).

### Atacado sin hallazgos
- **Rutas retiradas del maestro (O-01, desviación 1 del programador)**, `app/rutas-02c-r1` (33 casos, router de la aplicación): `/maestro/clases/nueva` y sus variantes (`/nueva/`, `/NUEVA`, `/MAESTRO/clases/nueva`, `?origen=inicio`, `#crear`) y `/maestro/clases/:id/editar` y las suyas (`/editar/`, `/EDITAR`, `?x=1`, `#datos`), con maestro, estudiante y admin. Con «nueva», el maestro termina en `/login` y los otros dos en su inicio (la guarda del rol va antes); con «…/editar», los tres en `/login` (el `*`). En ningún caso se pide `GET /api/clases/nueva` (en cualquier capitalización), ni nada de la clase, ni nada de `/api/admin/`, ni aparece el formulario.
- **Rutas del admin abiertas por otro rol:** `/admin/clases`, `/nueva`, `/:id`, `/:id/alumnos`, `/:id/maestros`, `/:id/editar` y `/ADMIN/Clases/NUEVA`, con maestro y estudiante (14 casos): vuelven a su inicio sin pedir nada del admin ni de la clase.
- **Barra del admin:** «Clases» con `aria-current="page"` (y solo él) en `/admin/clases`, `/admin/clases/`, `/admin/clases/nueva`, `/:id`, `/:id/alumnos`, `/:id/maestros` y `/:id/editar`; «Cuentas» solo en `/admin`; «Maestros» solo en `/admin/maestros`; siempre exactamente los tres enlaces con sus `href`. «Inicio» del maestro y del estudiante no queda activo dentro de una clase.
- **El maestro sin crear ni editar:** inicio sin clases (la frase «La administración te asigna tus clases.» y ninguna acción), inicio con clases, la tarjeta, el encabezado de la clase y «Alumnos»: ningún enlace ni botón con «crear», «editar» o «nueva clase», ningún `href` a `/clases/nueva` ni a `/editar`, y ningún texto «Crea tu primera clase» ni «Nueva clase». Estático (`estatico-02c-r1`): ningún código escribe `/maestro/clases/nueva` ni `/maestro/clases/<id>/editar`; el único `path: "clases/nueva"` del maestro es la redirección; los enlaces a `/clases/nueva` solo están en `clases-admin-view.tsx`; «Crear clase» y «Editar clase» solo en `data.ts` (5 textos); `TEXTOS_INICIO_MAESTRO.insignia`, `.crearClase` y `accionMaestro` no existen.
- **O-03:** `inicio-sin-datos-02c-r1`: con la consulta sin error, sin carga y sin datos, el inicio del maestro no muestra «Aún no tienes clases», ningún total, ni «La administración te asigna tus clases» (las dos frases), ni «Comparte el código…», ni una acción de crear.
- **Firma «Administración» (O-07)**, `muro-02c-r1`: un autor llamado «Administración», «administración», «ADMINISTRACIÓN», « Administración » o «Administracion» con `administracion: false` firma con su nombre y sin la insignia, en la publicación y en el comentario; con `administracion: true` y el nombre «Luis Pérez», la insignia `Badge` «Administración» con su icono `aria-hidden` y sin el nombre real, en las tres perspectivas. Estático: `.administracion` solo se lee en `firma-del-autor.tsx`; ningún código compara un texto con la firma (igualdad, `includes`, `startsWith`, `endsWith`, `test` o `localeCompare`); `FIRMA_ADMINISTRACION` solo en `data.ts` y la firma.
- **`puedeBorrar` en todas las combinaciones**, 24 casos: 3 perspectivas × publicación con `puedeBorrar` verdadero o falso × comentario con verdadero o falso × `propio` verdadero o falso. «Borrar publicación» y «Borrar» existen si y solo si el servidor lo dice; ni el rol ni `propio` deciden. El borrado de un comentario va, en las tres perspectivas (con el propio del estudiante incluido), exactamente a `DELETE /api/clases/:id/publicaciones/:pid/comentarios/:cid`, nunca a `mis-comentarios`. Con eso queda cubierta la O-04: el doble de esta prueba respondería 204 a cualquier DELETE, así que lo que cuenta es la aserción sobre la URL exacta. Estático: sin `mis-comentarios`, `useBorrarMiComentario`, `esMaestro`, `esDueno` ni `.propio` en producción; `.puedeBorrar` solo en `publicacion-del-muro.tsx` y `comentarios-de-publicacion.tsx`, sin definirse por otra vía. El admin: con formulario de publicar, sin formulario de comentar y con el vacío «Aún no hay publicaciones en esta clase.».
- **Perspectiva desde un solo lugar:** ningún `startsWith` con `/maestro`, `/estudiante` o `/admin` en producción; la única lectura del prefijo es `perspectivaDeRuta` (`lib.ts`), y solo la llaman `clase-layout.tsx` y `muro-view.tsx`.
- **Tabla de `/admin/clases`**, `clases-admin-02c-r1`, router de la aplicación:
  - «Cargar más clases»: doble clic humano (30 ms) con la página en vuelo da una sola petición con `cursor=<id 50>`; el botón conserva el foco en espera; al llegar la última página, el foco va al «Abrir Clase 51» (51 «Abrir» en total). Dos clics en el mismo instante pueden pedir la página dos veces (TanStack Query cancela la primera), pero la tabla no duplica filas (51, «Abrir Clase 51» una vez). El proyecto exige el caso «mismo instante» solo a login y registro (comentario de `marco-r1`), así que no es hallazgo.
  - Última página vacía: el foco va al `h1` «Clases». Con el `400` del cursor: «La lista cambió mientras la veías. Vuelve a abrirla para verla completa.», sin «no es válido» ni «cursor», y el foco no cae en `<body>`.
  - `500`, `503 SERVICIO_OCUPADO`, sin conexión y una respuesta con otra forma: un error en español, sin tabla ni vacío, y «Crear clase» sigue (una vez).
  - XSS: el HTML en el nombre de la clase y de los maestros se pinta como texto (ni `img` ni `script`); «Abrir» lleva el nombre como `sr-only` y su `href`; un nombre de 120 letras sin espacios lleva regla de corte en su celda. En el encabezado de la clase del admin, el HTML en el nombre, la descripción y los dos maestros («Maestros: <i>Uno</i> y <u>Dos</u>») se pinta como texto.
  - Contexto: en `/admin/clases`, `/nueva`, `/:id`, `/:id/alumnos`, `/:id/maestros` y `/:id/editar`, cada botón, enlace, campo y encabezado cuelga de un único `[data-material="opaco"]` y `[data-densidad="densa"]`.
  - Cambio de sección: Muro → Alumnos → Maestros mueve `aria-current` y el foco queda en el enlace pulsado; en «Editar clase» ninguna sección está activa; «Volver a la lista de clases» va a `/admin/clases`.
- **Selector de maestros al crear**, `maestros-02c-r1`:
  - Con «L», «Lu» o «  Lu  » no se pide nada.
  - Con dos elegidos, el buscador se oculta con su nota y el foco va a un «Quitar»; al quitar uno vuelve el buscador, y al quitar al último el foco va al campo de búsqueda. El elegido aparece como «Ya elegido», sin «Elegir».
  - Dos clics seguidos en «Elegir» lo eligen una vez, y el cuerpo lleva `maestroIds: [id]`. Sin elegidos: «Elige al menos un maestro» y nada se pide; el error se va al elegir.
  - Errores al crear (`404 MAESTRO_NO_ENCONTRADO` y `409 TOPE_DE_MAESTROS` con su mensaje; `503 SERVICIO_OCUPADO` y sin conexión): un solo aviso en español, el botón se libera y se conservan el nombre y los elegidos. Un `VALIDACION` de `maestroIds` queda bajo el selector, sin prefijo ni aviso.
  - Doble clic en «Crear clase» (mismo instante y a 30 ms): un solo POST.
- **Contenido visible y máximos, al crear y al editar:** 121 letras, solo invisibles, solo espacios y una separación de línea U+2028 dan su error, el campo inválido y ninguna petición; 120 letras y 60 emojis se envían; una descripción de 2001 da error; 2000 entre CRLF se envía normalizada. Editar: `PUT /api/admin/clases/:id` (nunca `/api/clases/`), `503` con aviso en español y el botón libre, doble clic con una sola petición, «Cancelar» hacia `/admin/clases/:id`.
- **«Maestros de la clase»:**
  - Con uno, sin «Quitar» y con la nota; el que ya da la clase sale como «Ya da esta clase», sin «Asignar»; la búsqueda corta no pide nada.
  - Doble clic humano en vuelo: un solo POST o DELETE (cuerpo `{ maestroId }`). Confirmación en línea con el foco a «Cancelar» y de vuelta a «Quitar».
  - Al recargar con dos maestros, el buscador se oculta con su nota y el foco no cae en `<body>`; al recargar con uno, ya no hay «Quitar» y el foco va al `h2` «Maestros de la clase».
  - Errores al asignar (`409 TOPE_DE_MAESTROS`, `404 MAESTRO_NO_ENCONTRADO` y `503`) y al quitar (`409 CLASE_SIN_MAESTRO`, `503` y sin conexión): un solo aviso en español (el del servidor cuando el error es de dominio) y el botón se libera.
- **Pruebas estáticas frente a los archivos nuevos:** `styles/clases-r1` V-06 (39 `enEspera=` con los fijos de C-20) y V-07, `components/layout/estatico-r1` (`translate-x-[200%]`), `badge-03b-r1` (cinco variantes, `institucional` igual a `accent-soft` con `link`) y `features/clases/estatico-r1` (sin el operador de arreglo vacío por defecto ni ternarios anidados): en verde en las tres corridas, sin tocarlas.

### Observaciones (no son hallazgos; las decide el manager)
- **O-05 (`/admin/` con barra final):** en `/admin/`, «Cuentas» no lleva `aria-current`. Ya pasaba antes de 02c (el `end` fijo de `BarraNavegacion` en `7544fb9` hacía lo mismo), así que no es de este encargo; saqué esa fila de la tabla de `rutas-02c-r1`. En cambio, «Clases» (prefijo) sí queda activo en `/admin/clases/`.
- **O-06 (mayúsculas en la ruta frente a la perspectiva):** el router compara rutas sin distinguir mayúsculas (lo confirma `rutas-02c-r1`: `/MAESTRO/clases/nueva` entra al árbol del maestro), pero `perspectivaDeRuta` compara el prefijo exacto (PR-2C01 lo fija así, con `/Admin` como «estudiante»). Por eso un maestro en `/MAESTRO/clases/:id` (o el admin en `/ADMIN/clases/:id`) pasa la guarda de su rol y ve la clase en la perspectiva del estudiante: «Personas» en lugar de «Alumnos» (su enlace lo regresa a su inicio), sin el código y sin el formulario de publicar. No abre nada (es la perspectiva que menos muestra y el backend decide), pero la página no corresponde a la ruta que la sirvió. No lo verifiqué en ejecución para la clase (solo para «nueva»): se deduce del router y de `lib.ts`. Hermanos: las tres perspectivas.
- **O-07 (`503 SERVICIO_OCUPADO` en los formularios del admin):** el aviso es el genérico «Algo salió mal. Inténtalo de nuevo.» (`MENSAJES_ERROR_CLASES` no tiene `SERVICIO_OCUPADO`), no el del servidor («El servicio está ocupado en este momento…»). Está en español y el plan no pide otro texto; si se quiere el del servidor, sería sumar el código a `CODIGOS_CON_MENSAJE_DEL_SERVIDOR` (decisión del manager, junto con R-3 de CHORE-02).
- **O-08 (dos clics en el mismo instante en «Cargar más clases»):** pueden salir dos peticiones de la misma página (`fetchNextPage` cancela la primera); la tabla no duplica filas. Es el mismo criterio de «Ver más clases» de CLASES-a (solo se exige con el botón ya en espera).
- **O-09 (términos de búsqueda de 3 puntos de código):** «a b» o tres U+200B sí piden candidatos: es la regla compartida de `shared/` (T-20 de CLASES-b) y el servidor la aplica igual. No es de 02c; lo dejo anotado porque al principio lo esperaba sin petición.
- **O-03 y O-04 de la ronda 0:** cerradas por `inicio-sin-datos-02c-r1` (el texto nuevo del maestro sin clases no aparece sin datos) y por `muro-02c-r1` (el borrado del comentario propio del estudiante va a la ruta general; la rama muerta de `muro-c-r2` ya no puede ocultar una regresión).

### No atacado y por qué
- **360 px y la presentación real:** jsdom no aplica medios ni calcula anchos. Comprobé las reglas de corte de los nombres largos en la tabla y el encabezado sobre el elemento ya localizado; lo demás queda para la comprobación humana (H-2 y H-4, al final de 02d). Ningún navegador.
- **Contraste de `institucional`:** lo mide `badge-03b-r1` con los valores de `tokens.css` (en verde); no hay otro par nuevo.
- **Backend:** 02c no lo toca (sin cambios en `backend/` ni `shared/`); no corrí su suite.
- **Lo de 02d:** la lista de clases en la barra lateral, el correo en «Personas» y el control segmentado del tipo de publicación.
- **Hermanos de T-02 en CLASES-b** (`buscador-alumnos.tsx` y `tabla-alumnos.tsx`): solo los leí; no escribí pruebas sobre código fuera de 02c.

### Corridas
Una suite a la vez; antes, `cd frontend; npm run lint` (código 0) y `npx vitest list`.

**Comando (n = 1, 2 y 3, una tras otra):**
```
cd frontend; npm test -- --reporter=default --reporter=json --outputFile.json=<scratchpad>/front-02c-r1-<n>.json > <scratchpad>/front-02c-r1-<n>.txt 2>&1
```

| Corrida | Horario (UTC) | Código | Test Files | Tests | Duration |
|---|---|---|---|---|---|
| 1 | 19:39:26 a 19:40:44 | 1 | `1 failed / 112 passed (113)` | `2 failed / 1618 passed (1620)` | 75.03s |
| 2 | 19:40:44 a 19:42:01 | 1 | `1 failed / 112 passed (113)` | `2 failed / 1618 passed (1620)` | 73.86s |
| 3 | 19:42:01 a 19:43:14 | 1 | `1 failed / 112 passed (113)` | `2 failed / 1618 passed (1620)` | 70.07s |

- **Última línea literal** (la misma en las tres, con su número de corrida): `npm error command C:\WINDOWS\system32\cmd.exe /d /s /c vitest run --reporter=default --reporter=json --outputFile.json=C:/Users/Carlos/AppData/Local/Temp/claude/c--Users-Carlos-Documents-Proyecto-PlataformaEducativa/***/scratchpad/front-02c-r1-1.json` (`-2.json` y `-3.json` en las otras dos).
- **Rojos (los mismos en las tres, comparados con `diff` sobre el JSON):**
  1. `src/features/clases/maestros-02c-r1.ataque.test.tsx` › «asignar: con el POST ya respondido y la clase sin recargar…»: `expected { posts: 2, avisosDeExito: 2 } to deeply equal { posts: 1, avisosDeExito: 1 }` (T-02).
  2. `src/features/clases/maestros-02c-r1.ataque.test.tsx` › «quitar: con el DELETE ya respondido y la clase sin recargar…»: `expected { deletes: 2, avisosDeExito: 2 } to deeply equal { deletes: 1, avisosDeExito: 1 }` (T-02).
  Ningún rojo intermitente; ninguna `*.ataque` anterior ni prueba normal en rojo.
- **Casos lentos (umbral de 5 s del frontend, M-02 de DESIGN-01b):** ninguno llega a 5 s en las tres corridas. Los cinco más lentos de la corrida 1: `alumnos-b-r2` «quitar la última fila de todas lleva el foco a la anterior» 3352 ms, `alumnos-b-r2` «quitar la última fila de la página 1 con la página 2 cargada…» 3074 ms, `alumnos-b-r2` «quitar la primera fila de la página 2…» 2975 ms, `alumnos-b-r4` «alumnos: con más páginas el botón sigue montado…» 2333 ms y `alumnos-b-r5` «alumnos, teclado: «Ver más»…» 2227 ms (todos de CLASES-b, ninguno nuevo).
- **Aislado** (PA-09), mientras escribía cada archivo nuevo: los mismos 2 rojos en `maestros-02c-r1` y verde en los otros cinco.

### Conteos
- `cd frontend; npx vitest list > <scratchpad>/front-list-02c-r1.txt`, código 0: **1620 casos** (líneas `src/… > …`).
- `npx vitest list --filesOnly > <scratchpad>/front-list-02c-r1-files.txt`: **113 archivos**, de ellos **62** `*.ataque` del frontend con **1023** casos.
- Diferencia con lo que aceptó el manager (107 / 1458): **+6 archivos y +162 casos**, todos de los 6 archivos nuevos de esta ronda (`grep -c "02c-r1.ataque"` en la lista: 162).
- `*.ataque`: **129** (67 del backend, sin cambios, y 62 del frontend).

### Tabla de SHA-256 de las 129 `*.ataque` al cierre de la ronda 1 de 02c (base de V-01 de la siguiente ronda; 6 nuevas, ninguna existente cambia)
| SHA-256 | Archivo | Cambio |
|---|---|---|
| `BCCE2CAE771F97957D8691BEF7FFF4EC42412DAAEABF726AEB0AFC59F6F25671` | `backend/src/config/correo.ataque.test.ts` |  |
| `DCB78D222544E8DC4FBECE59468F555B04ABE971B70016E9BB17FCAE3E958580` | `backend/src/config/env.ataque.test.ts` |  |
| `71E7F049447D2D1ECEDD897C55EA0B6D31221753F0A7E7473C7AC6E8667F0A95` | `backend/src/config/logger.ataque.test.ts` |  |
| `91F620C1A27778EEBC2BED5EEC1BC9B0E3FE1199B32ED00F9DD910011D6A1805` | `backend/src/core/clases/codigo-r1.ataque.test.ts` |  |
| `262691F5786AD63B2393D0BA5FF97538F6DACF43343BED019AD23C12A07D8686` | `backend/src/core/clases/codigo-r2.ataque.test.ts` |  |
| `E769CBFCC3A83A64B51C6437F80684640A7C928AD6B8C5C1671FDFF005D7B734` | `backend/src/workers/ritmo-03c-r1.ataque.test.ts` |  |
| `36C23511D5BFD24F2BB999BA34B00C193C8DD0FD0782F29F4E0BB00631E2FBCA` | `backend/test/admin-muro-02b-r1.ataque.test.ts` |  |
| `388AD0E585639B8C3E0E0A6657FB42C1B9CB83DB721C4863C4FA19E0BE42EC85` | `backend/test/admin-unico.ataque.test.ts` |  |
| `D2CC28B62BF988AE14BA975A9BC8D534AEC0EEBCE30DA93D7DED9A26026B0857` | `backend/test/alumnos-b-r1.ataque.test.ts` |  |
| `00346D471355ABC7971B921649E7192B8987FE27912C00CB7E41AEF2065369E9` | `backend/test/alumnos-b-r2.ataque.test.ts` |  |
| `FC11AB4B914D4A88612953F82DB354E2B9CEA9BEF86E24321EF7E031F3AC3837` | `backend/test/alumnos-b-r3.ataque.test.ts` |  |
| `441A766A94E7D9B26807790402E06ED94D4CC378D8F6ECF0BCCC3259C7FF55FB` | `backend/test/api-real.ataque.test.ts` |  |
| `D9E1DE5B1BD43F54CF3A4DCF153D1EEABDC36B4DEC02FBEB9D8A0239F298DFE9` | `backend/test/archivos-d-r1.ataque.test.ts` |  |
| `1637EB447CD12AC5BDDDC7634980DBC10A25CBAD5DE01BF6C09F40ED930FF1A9` | `backend/test/archivos-d-r2.ataque.test.ts` |  |
| `42BB7BF3086230C6EDC65AB73976AC8A801956336561AADBEE65CC3B40EB8612` | `backend/test/arquitectura-cuentas-r1.ataque.test.ts` |  |
| `38ADB0984744A0810287711F57BA0498287D0BC96344B8948BA1C490CA807716` | `backend/test/arranque-r1.ataque.test.ts` |  |
| `2C83D82D10BDD9B7A969768774D75B18B7A71A594BBAAC5FAE36A0E134D2336C` | `backend/test/auth-login.ataque.test.ts` |  |
| `73D3A2AE708A0EF676547A8094115B1419423057378387269BC3EADB34C7724E` | `backend/test/auth-registro.ataque.test.ts` |  |
| `6F557E8E860BCE6374671E90086E9C14B1861A308B6FBB434564612647892713` | `backend/test/autoria-02b-r1.ataque.test.ts` |  |
| `95BBA9BAC44366AD5A361E93DD2F278CB0A1CC889FA479049ACC7B45A9A5E71B` | `backend/test/clases-r1.ataque.test.ts` |  |
| `A87817D56C236C0BA3597214CAC23B10483BBC28AE44800C592ED5CE2EF97F38` | `backend/test/clases-r2.ataque.test.ts` |  |
| `72DE7D8AF3D3F772ABC19DB065F6E418F6EB76CE78D87FE6EBB51335FC99825A` | `backend/test/clases-r3.ataque.test.ts` |  |
| `BE97C4E48AC9551BED1D01552E90AB8CDF085CF928AE6C8C3D81809E35F7CE62` | `backend/test/clases-r4.ataque.test.ts` |  |
| `000EC9008C73D25121C82A46F5EA0F67E6C8C387CB04E361EF82812B57956098` | `backend/test/concurrencia-02a-r1.ataque.test.ts` |  |
| `530546B4D70A2B9AD36F98F37E2AF45480E81A1101EE3516D15426F78350BF82` | `backend/test/cuentas-03a-r1.ataque.test.ts` |  |
| `6303DDC170545F616C66773C3F5475CB3BE1FEA9347D8059354D6ADE8D676C16` | `backend/test/cuentas-r1.ataque.test.ts` |  |
| `3A4E81C111B8EEB7DF065804AA85062FA3FC607F0147149B71AC21C14E7818D9` | `backend/test/cuentas-r2.ataque.test.ts` |  |
| `F54F79F7B2A83E95FE440053CCAF15CB3EBB01CE5DFD4C6655E22159A5FD7E6B` | `backend/test/cuentas-r3.ataque.test.ts` |  |
| `A2F9BFF596330A7D55D1CA9D47197FC831EB132F52C759610E2D667895C3332F` | `backend/test/cuerpos-02a-r2.ataque.test.ts` |  |
| `D7A9DA854CE8AB8AD8D2437DB2E8C2A642A777EA3261A6B038DA28BE022DF848` | `backend/test/enlaces-03b-r1.ataque.test.ts` |  |
| `DC1B7EE7EA58966F5DB33CCB4581885A9669DEA2263954AE46D17A83E1EF6EAF` | `backend/test/enlaces-03b-r2.ataque.test.ts` |  |
| `B051B1986496E35E3E306C4C6BC306A763542BCA4B350574D0C02E2C484DEB35` | `backend/test/enlaces-ch-r2.ataque.test.ts` |  |
| `D28CC4DE621A680E6B54B2BFF889700300D558EC7849717584518D2F03EC8CAE` | `backend/test/entorno-ch-r1.ataque.test.ts` |  |
| `BA1AC9B17CC9BF747522BD4EC8B87DF436008482E643B18EEA8E9A8C041C59B3` | `backend/test/formada-ch-r1.ataque.test.ts` |  |
| `EC9602D5F109B45A6D428E708D9B6CDD37A7509A6FF9031FA6FD8A2DA0E25E9B` | `backend/test/gestion-02a-r1.ataque.test.ts` |  |
| `5F4133F949D2F337A8F63B75CF82CB77114DB7812D67C1960105F5000C31A326` | `backend/test/guarda-ch-r1.ataque.test.ts` |  |
| `7A7DAC6D87EDF81059FCFF9C07471AAF49D690EC159BE4B9FD4AA32B0909A215` | `backend/test/guarda-ch-r2.ataque.test.ts` |  |
| `610EE44E5D0BCEA46EB4E3645F9ADF1998A76947A25AF7E3F8248EA3A633DF79` | `backend/test/guarda-ch-r3.ataque.test.ts` |  |
| `E5D149F3AC52B726E1FE08908249706341330F88EAA6674B9A9AC67B98B1E864` | `backend/test/guarda-clase-r1.ataque.test.ts` |  |
| `C979D2C9C420A2177FA6EBDDB78EB2CE84D5F043B94270F690916A6FC75D6F8F` | `backend/test/guarda-clase-r2.ataque.test.ts` |  |
| `20982E2B98F1B162146A211923F3D5EC19D4E170C4AA3A5BFC6F82C3B6173AAD` | `backend/test/guarda-r2.ataque.test.ts` |  |
| `A8B79D5AD98270BE3747F493865708A78BB73ADD08D832584DB4464C3582777A` | `backend/test/intentos-r2.ataque.test.ts` |  |
| `2619B44EEA3370494C95AC128FCFD9E3FFC20D1581A19F549BF371F603A11D7D` | `backend/test/invitacion-flujo-03a-r2.ataque.test.ts` |  |
| `704155928183AEC193AE7E157B86B3E9361D2B63C7A47BE1ED859605FAB4FFA6` | `backend/test/invitacion-masiva-03c-r1.ataque.test.ts` |  |
| `DD9B7454E8786BF0B833D265900CCAECF595808CEBC8E9A77C9AEF15298A1038` | `backend/test/invitacion-masiva-03c-r2.ataque.test.ts` |  |
| `F9F9EC59EC8D1A5CCB180522798140C45604440F48EDCD68A3E02863D90AE347` | `backend/test/logs-02a-r1.ataque.test.ts` |  |
| `A2006C163D9E6CD3E4A2A773D1501826DAF3C8E7BB184D205BFC6442318FB59C` | `backend/test/logs-02b-r1.ataque.test.ts` |  |
| `BD8B303C434EFEC0785E0691D31D6F6E87DBF3305F50FA27CCE0F78CBB251E3A` | `backend/test/logs-03a-r1.ataque.test.ts` |  |
| `B58D5D013658433FE5839634E2DB5A31B8D2B8F69587BC36958752D3CD33BBF7` | `backend/test/logs-03b-r1.ataque.test.ts` |  |
| `0E4ABF3BC5D92FA0C380805453190703862567930DD74B9E7FCC1809564D181F` | `backend/test/logs-03c-r1.ataque.test.ts` |  |
| `1E775A19682F3A5995D7C035BCC810A36BF50C22045B6FFBFC5A98B821255DB0` | `backend/test/logs-archivos-d-r1.ataque.test.ts` |  |
| `E9CE866D511E3EE6029015B74E20B4D342A60BE99B3AAC97E86F00283A3C77F1` | `backend/test/logs-archivos-d-r3.ataque.test.ts` |  |
| `E008935B107752D203F6423B2F1C9E0F5A4339F0A77154746BF262CECB90351A` | `backend/test/logs-cuentas-r1.ataque.test.ts` |  |
| `690E30ED39111C0A074FC159015967CD9F0FDC24D9A340E6A0D7BE4B980A9D45` | `backend/test/logs-muro-c-r1.ataque.test.ts` |  |
| `0809C60700E26183E7771B4B1A40B05CBF554C2ED7929190CF4D89A52722E551` | `backend/test/logs-muro-c-r2.ataque.test.ts` |  |
| `5AF3909E4B7CA485E78979567872EA78BF41E6D679B9EC2C761EAA0B250DF689` | `backend/test/logs-r2.ataque.test.ts` |  |
| `AE66FBCF60E8F66336E77C1055893E60CB85A01BC746B89C68A4D2C70C807AF1` | `backend/test/muro-c-r1.ataque.test.ts` |  |
| `7825CFC9B484DF740FA0E9562A195D1BBCAF4CAF72EA55FA847B5394AB96C125` | `backend/test/muro-c-r2.ataque.test.ts` |  |
| `8B733B86FC6D54ECE008389A59793FAE4EC4A65146EB37215E900E50A5337D46` | `backend/test/nombres-guarda-r3.ataque.test.ts` |  |
| `00A6EB6F7CCD7D8790C356BEFCC96DDFDA6EACCE0BE53DE255CFE3626D8F2ADB` | `backend/test/nombres-tokens-r2.ataque.test.ts` |  |
| `80B5A848F69B429E7DADEC86C07BEC1D3E3EED8A042EFBA41CE912DED39E7BAB` | `backend/test/nowait-ch-r1.ataque.test.ts` |  |
| `6F2ABC2CEFD77D74CD1E3ABBDCE9C41BB53D00BD4D8E5BA7E496C4441C2697E5` | `backend/test/servicio-ocupado-ch-r1.ataque.test.ts` |  |
| `3B2D94ABCCBEDD6FB53CF666AAD06ADF431A0DB9A09264F05D8ADF6963CBD0AE` | `backend/test/sesiones-y-cadena.ataque.test.ts` |  |
| `70AC720F2E7FCADEE5BBCB6414887AB08129DEA7CD91DF012046953B1584E8B6` | `backend/test/sexto-paso-02a-r1.ataque.test.ts` |  |
| `F09E9A0038C47D1A2223376A0AF260BAF573F0C45BF770201C48C9E30296F04B` | `backend/test/worker-03c-r1.ataque.test.ts` |  |
| `9F60F9D65D52D2021A1EB04E9F01D3CC68F22744C845BF93D6621AA4FE9713A8` | `backend/test/worker-r1.ataque.test.ts` |  |
| `77D11BD85F202A9EEC92A363DF82E63FB9A784CA9D368D49F62E61C1A2AA967B` | `backend/test/worker-r2.ataque.test.ts` |  |
| `B89EDE0F6AED45DFCB5E64C8909A822156CE43FD80948E72419CDCE9D4541A87` | `frontend/src/app/cache-03a-r1.ataque.test.tsx` |  |
| `E85743C0FBB8E476874A2C67334342D8D69D14153579FC1E4CCE0AE6E2B29616` | `frontend/src/app/contexto-r1.ataque.test.tsx` |  |
| `BC2BE5541006887E2A5A4A89B33046180F607D54474B0F96A73D615AFBCAC385` | `frontend/src/app/contrasena-r1.ataque.test.tsx` |  |
| `F38BCACB716D8A39ACDB3535A95603CD0D8AB02572CA57A7DF5268B01CEB6EAC` | `frontend/src/app/contrasena-r2.ataque.test.tsx` |  |
| `68FB5D092C0C8ECFCF282477EF023AAAE26F6B869656E05109DC3EFA276D842A` | `frontend/src/app/cuentas-r1.ataque.test.tsx` |  |
| `41930017715D3D6869DC7ACEFD75DE8EC3684F1F035B845ABDF8EC0F6B734DEE` | `frontend/src/app/cuentas-r2.ataque.test.tsx` |  |
| `1506C27E5F7418B5E087FD30F8809645A2FC3E2761C7249DE78F02E24AA6C7A5` | `frontend/src/app/en-espera-r1.ataque.test.tsx` |  |
| `DB48DAD405C27062621A44D3744C84CC5903892A51E5A8DF18F41383CB9C88A3` | `frontend/src/app/errores-r1.ataque.test.tsx` |  |
| `F95321E604E20B533EBF2DB3C1C6C66BA2F2D87A48F075415B766551F6EE30F4` | `frontend/src/app/fondo-r1.ataque.test.tsx` |  |
| `57CB54AFD3B79464F0DF01B88FC388CEBBEAC5657D936C4C204CBAE6034B0834` | `frontend/src/app/marco-r1.ataque.test.tsx` |  |
| `D32E1C5B5629C37D2521446D7E578CDB081DD71F5B5026E73E13C58E16D92801` | `frontend/src/app/muro-recuperar-c-r3.ataque.test.tsx` |  |
| `BEC7B7B49E056AFE514F654FCA9C562D77A090F7421057B8B03D57D4E862140A` | `frontend/src/app/muro-recuperar-c-r4.ataque.test.tsx` |  |
| `2F8056A770397C1601647277944555A48AFC4B9A2BABEB75E5898F0CC92562BB` | `frontend/src/app/muro-rutas-c-r1.ataque.test.tsx` |  |
| `0EEFED2C05D76B0790A437E9465A898A9076083B1F046F8785145CFAAD0DA379` | `frontend/src/app/registro-maestro-03b-r1.ataque.test.tsx` |  |
| `053E867A904AFA3C09EEF92CA2E03E929D9F9C93F714040856F40C7418721BBE` | `frontend/src/app/router.ataque.test.tsx` |  |
| `28B4046CB3DB0BA03338767FA614BA6F4B53650327F4E6CC3CDE4123F6F3F233` | `frontend/src/app/rutas-02c-r1.ataque.test.tsx` | nueva: ronda 1 de 02c |
| `C7946F5F5D5D16D36B395ADC2AD9928ACC7FD9839875FB64532B51489756730B` | `frontend/src/app/rutas-clases-r1.ataque.test.tsx` |  |
| `F090CBD8E8C9B0AF52D4FC19547B07E9B6413F5414CC4B10862F01E29818DDDC` | `frontend/src/app/sesion-r2.ataque.test.tsx` |  |
| `FA229C216651693AFFDAC0FDDD148EC5AC26FDFB3A15ABB827F21CCBCEF4C3E1` | `frontend/src/components/layout/estatico-r1.ataque.test.ts` |  |
| `0AAA18CD70465293B6FCA6CC051B8E4AC360A838D02FEDE848C35376C3D0066C` | `frontend/src/components/layout/pie-r1.ataque.test.tsx` |  |
| `00A707429AF6B5326F9A96DEF6382823CF4A6A092AAC7E7BD7CBCB8DC9AA1D21` | `frontend/src/components/layout/pie-r2.ataque.test.tsx` |  |
| `472E1F46D0C899496AA334909B02988962AAB07B9BD29A8D7B8AF3987FAC6C76` | `frontend/src/components/layout/pie-r3.ataque.test.tsx` |  |
| `A1814D281DAFD8243989C9F9A462A4F33A86B1FB70EEEBF29E99BCB0F340D82A` | `frontend/src/components/ui/badge-03b-r1.ataque.test.ts` |  |
| `86ADAA9A093A987DAFD97E279E600211CBDF6CEF97879D16FA2D8A9D2846F8B5` | `frontend/src/features/admin/cuentas-r1.ataque.test.tsx` |  |
| `B948E9359FD3981E08B850540027F536F345A3F48D7C0749BA0C16C2C1DF1184` | `frontend/src/features/admin/cuentas-r2.ataque.test.tsx` |  |
| `72BF9AF4CE8F52A114897E038CEFB0947841A37F74074F4C5F8DEC68A71B654A` | `frontend/src/features/admin/cuentas-r3.ataque.test.tsx` |  |
| `942DF3015424AED56E83661993BA015E871CD6BE8E797920D47E8CBF0C56EAC4` | `frontend/src/features/admin/cuentas-r4.ataque.test.tsx` |  |
| `3BD26E7E3BF019D462DB4837861ED22017BBB9E9A6276720BF0DEA6C2B5B0998` | `frontend/src/features/admin/en-espera-r1.ataque.test.tsx` |  |
| `8219C864E7BDC1315E6A0F0FF1CD6F54E4710CEBDCEB8E316F4E53AACC0CFF35` | `frontend/src/features/admin/foco-r1.ataque.test.tsx` |  |
| `30F45BBA30D9348EC1587B42E84CA370274E1BF0AF0F310B8A6BBD79FA982669` | `frontend/src/features/admin/maestros-03b-r1.ataque.test.tsx` |  |
| `D477A809E55E603D3EF6C02CA43B21372B75D0947FA303F1539D48BDF32841F8` | `frontend/src/features/admin/maestros-03c-r1.ataque.test.tsx` |  |
| `3CEDA51DB8F67F40C26615FBC4CD7D082035B00F38713C6CA4C7DB58E47926C8` | `frontend/src/features/auth/enlace-r1.ataque.test.tsx` |  |
| `1F5D1147637C09DAA6FDF1384E4395EDD69DFDAB84AAE5D602A362DABD3295BD` | `frontend/src/features/auth/enlace-r2.ataque.test.tsx` |  |
| `991B115524D8DADE8D6EA2C51FB753DC8832EE410DB2161A0CE761D011CFCA4A` | `frontend/src/features/auth/invitacion-r1.ataque.test.tsx` |  |
| `25375E6678BA9B5331D53B78031BD315A8651F16CD32571E9FCEE539D07C5BA8` | `frontend/src/features/clases/alumnos-b-r1.ataque.test.tsx` |  |
| `55DC274ECA96DA4360848B88F9F2A839AC815031490AB57FF38DE074512D632C` | `frontend/src/features/clases/alumnos-b-r2.ataque.test.tsx` |  |
| `371518E4309F14201A92D29F9436A97A19801B506D45114964FBCFE3F5CD4183` | `frontend/src/features/clases/alumnos-b-r3.ataque.test.tsx` |  |
| `266D088DD727F18AF8C8A106B8D9C4DBED75753E4B1B4ABB12F3A4DF870ECB7F` | `frontend/src/features/clases/alumnos-b-r4.ataque.test.tsx` |  |
| `856CFFBD9C743F9815DAF731487E29DC5F5272545DC15820A70BAF86ECFA6527` | `frontend/src/features/clases/alumnos-b-r5.ataque.test.tsx` |  |
| `1E9A26ED86EE637E1A2E065DC05DA79CBB5048E18A020285D6B479FD290BCC9C` | `frontend/src/features/clases/archivos-d-r1.ataque.test.tsx` |  |
| `EFC07CC006E16E03BEEC69A17E08AED83657095555107B28FB1AB3EF1400E687` | `frontend/src/features/clases/archivos-d-r2.ataque.test.tsx` |  |
| `E01A46173F2820F0AF15824C88AA81805412B70248062F419DD40236C9EED7E3` | `frontend/src/features/clases/archivos-d-r3.ataque.test.tsx` |  |
| `D2C0EA65FCCF53F7DFECA318920922B82924A1EE3A1E257B5F31AF1F8FDD63E3` | `frontend/src/features/clases/clases-admin-02c-r1.ataque.test.tsx` | nueva: ronda 1 de 02c |
| `5F0679D8CFACC8BCE01989C04A415DC5B546625EB7DEC92F03959DE5A0F89815` | `frontend/src/features/clases/clases-r1.ataque.test.tsx` |  |
| `C7AD5EDC733E374117A9277F1C2987E84CC2930C77EB4C720CCF15CC9F5FAB45` | `frontend/src/features/clases/clases-r2.ataque.test.tsx` |  |
| `A835A11D29AEDB8F77F91E826A22C2B7CF5322FCED3F6BED0C1ACBF7C75A4E61` | `frontend/src/features/clases/clases-r3.ataque.test.tsx` |  |
| `86B04D234527ECEEFCA35B07CE89E6B7CE0B6AFE5CCDEE2F005E6A4219F0495A` | `frontend/src/features/clases/clases-r4.ataque.test.tsx` |  |
| `E76A0B75591B6D0032AEAA870441EE093C05FC13408CC47A8CB5B5883AF7A14F` | `frontend/src/features/clases/estatico-02c-r1.ataque.test.ts` | nueva: ronda 1 de 02c |
| `CDD1ED8890859AE3E884822FC7074852A2173105114745D83FE9A15C1C47C626` | `frontend/src/features/clases/estatico-r1.ataque.test.ts` |  |
| `0F60F1582FCE6E5EFAF9BF6856133DC30F1DC4EB9C3B7FEA19F90A330F8335B3` | `frontend/src/features/clases/inicio-sin-datos-02c-r1.ataque.test.tsx` | nueva: ronda 1 de 02c |
| `7C434A0E54E70B12D4B2A3DE22FFB4DBF5F28A1CFBD2290C22E8A2B59EDF0E16` | `frontend/src/features/clases/inicio-sin-datos-r2.ataque.test.tsx` |  |
| `A4DE3A7DC35DAEDFF86FD41349EA09140213E918613603D0985C698FF41D29F7` | `frontend/src/features/clases/maestros-02c-r1.ataque.test.tsx` | nueva: ronda 1 de 02c |
| `41D27CD07466255EDA02B898F474EFE036C91EA77E53061076514DECFE90E1FD` | `frontend/src/features/clases/muro-02c-r1.ataque.test.tsx` | nueva: ronda 1 de 02c |
| `BF0CAB9760A82DB5761777542827F89E4DE9F3712D06E44916F698ABDA1ABBAA` | `frontend/src/features/clases/muro-c-r1.ataque.test.tsx` |  |
| `D91FCE8DFB93139D9F7941E33BA8904D92C4560B37A61737688194C9504B093E` | `frontend/src/features/clases/muro-c-r2.ataque.test.tsx` |  |
| `73523416AE3F04A4AE4DB25685E2C9A5BA8EB3DB015225DFEDC76EDF5D75958F` | `frontend/src/features/clases/muro-c-r3.ataque.test.tsx` |  |
| `C71CBA65DD284D7AF11CBC812B6BCF75BAA373939EDB8318E731858D9C50173F` | `frontend/src/lib/format-d-r1.ataque.test.ts` |  |
| `89DBBB70D5DC404C3D74DB5391D10855C8CB1D6B4C643B6147B3CE6FFB2637AF` | `frontend/src/lib/format-d-r2.ataque.test.ts` |  |
| `BFA7DED62F7A1402590D438A1CC51060A63FA019AD47D3EB5740E43383064A2A` | `frontend/src/lib/format-d-r3.ataque.test.ts` |  |
| `10C730348D18FF8DAE7B3623751D31122AA58560B564AD191717FA1938A6F8CE` | `frontend/src/services/apiClient.ataque.test.ts` |  |
| `7986CE1FE3EBF76714AA064FADE5BBEB855037A02EF66F6532632E8720ABC68B` | `frontend/src/styles/clases-r1.ataque.test.ts` |  |
| `B8085BCBBC7F4B6276BF3A87FB7BA0BC887953A8C6CE372354A7F3F1B5037582` | `frontend/src/styles/tokens-r1.ataque.test.ts` |  |

## CLASES-02c — Ronda 2

# Reporte del Tester — CLASES-02c · corrección de T-02 (frontend) — Ronda 2
Veredicto: **ROTO** (2 hallazgos: T-03 baja y T-04 media). La corrección de T-02 resiste en lo que T-02 pedía: con el segundo clic a 30 ms o después del `200`, los seis hermanos mandan una sola petición y dan un solo aviso, y el botón sigue en espera hasta la recarga.
Verificación propia: lint `cd frontend; npm run lint` código 0 (última línea `> tsc -b`) · test `cd frontend; npm test`, tres corridas completas seguidas: `Tests  9 failed | 1647 passed (1656)` en las tres, con los mismos 9 rojos (los de T-03 y T-04).

### Precondiciones
- **Fecha y base:** 2026-10-05; rama `feat/clases-02`; base dentro de los paquetes `<K2b>` = `7544fb9`. Red aceptada por el humano para hoy. Sin cambios en `backend/` ni `shared/`; no corrí el backend (PA-07 no aplica).
- **V-01:** las 129 `*.ataque` contra la tabla de la ronda 1 de 02c: **129 de 129 iguales**, ninguna sin rastrear antes de empezar.
- **Procesos y suites:** no toqué ningún proceso del humano; una suite a la vez; nadie más corrió pruebas.
- **Archivos nuevos (2, solo míos):** `frontend/src/features/clases/ventana-02c-r2.ataque.test.tsx` (26 casos) y `frontend/src/features/clases/cargar-mas-02c-r2.ataque.test.tsx` (10 casos). Ninguna `*.ataque` existente, prueba normal ni archivo de producción cambió. Prettier solo sobre esos 2, desde `frontend/`.

### Regresión
Las 129 `*.ataque` anteriores pasan en las tres corridas, incluidas las de T-02 de la ronda 1 (`maestros-02c-r1`, ahora en verde). Ningún rojo fuera de los 9 de `ventana-02c-r2`.

### Hallazgos

#### T-03 — Dos clics en el mismo instante (sin repintado entre ellos) mandan dos peticiones y dan dos avisos en los seis hermanos
Severidad: baja
Prueba: `frontend/src/features/clases/ventana-02c-r2.ataque.test.tsx` › «la ventana entre el 200 y la recarga, en los hermanos de T-02» › «<hermano>, segundo clic a 0 ms: …», para «Asignar a la clase» (maestros), «Sí, quitar» (maestros), «Agregar a la clase» (roster), «Sí, quitar» (roster), «Sí, borrar» (publicación) y «Sí, borrar comentario» (6 casos).
Reproducción: con la acción en vuelo detrás de una compuerta, `fireEvent.click(boton)` dos veces seguidas, sin esperar entre ellas. El segundo clic llega antes del repintado: el botón todavía no está en `enEspera`, porque TanStack Query avisa del `isPending` en una tarea posterior, y la mutación arranca otra vez.
Esperado / Obtenido: se esperaba `{ peticiones: 1, avisos: 1, errores: 0 }` y salió `{ peticiones: 2, avisos: 2, errores: 0 }` en cinco hermanos. En «Sí, quitar» del roster salió `{ peticiones: 2, avisos: 1, errores: 0 }`: allí el aviso está en el `onSuccess` de `mutate`, que solo corre para la última llamada. Con 30 ms entre los clics, y con un clic después del `200`, los seis dan una sola petición y un solo aviso (12 casos en verde).
Por qué baja: en un navegador, dos clics físicos son tareas separadas y el repintado ocurre entre ellas. Este proyecto solo exige el caso «mismo instante» a login y registro desde DESIGN-01a (`en-espera-r1`, y el comentario de `marco-r1` sobre «Cerrar sesión»). El orquestador lo pidió de forma expresa en esta ronda; **lo decide el manager**: aceptarlo con ese criterio, o pedir el remedio que ya existe en `features/admin` (`enviandoRef` de `ficha-de-cuenta.tsx` y `tabla-enlaces.tsx`), una guarda síncrona antes de `mutate`.
Requisito o regla violada: lista de ataque del tester, «Doble envío del mismo formulario»; `CLAUDE.md` (`enEspera` no dispara su acción), solo en el caso sin repintado.
Hermanos: los seis de la prueba. «Unirme a la clase» ya se guarda con `if (unirse.isPending) return`, pero con la misma lectura retrasada; no lo ataqué a 0 ms. «Crear clase» resistió el caso «mismo instante» en la ronda 1. «Elegir» no pide nada.

#### T-04 — Si la recarga falla después del 200, el foco cae en <body> en «Asignar a la clase», «Sí, quitar» de maestros y «Sí, borrar» de una publicación
Severidad: media
Prueba: `frontend/src/features/clases/ventana-02c-r2.ataque.test.tsx` › «la recarga falla después del 200», en tres casos: ««Asignar a la clase» (maestros): …», ««Sí, quitar» (maestros): …» y ««Sí, borrar» (publicación): …».
Reproducción:
1. Con el foco en el botón de la acción («Asignar a la clase María Gómez», «Sí, quitar Luis Pérez» o «Sí, borrar»), la acción responde `200`.
2. La recarga que espera el `onSuccess` responde `500`. Es `GET /api/clases/:claseId` para los dos de maestros y la lista del muro para la publicación.
3. La consulta recargada pasa a `isError` y su vista se sustituye por `MensajeError` («Algo salió mal. Inténtalo de nuevo.»). En los de maestros, `ClaseLayout` también, porque comparte la clave del detalle. El botón que tenía el foco desaparece y nada recibe el foco.
Esperado / Obtenido: se esperaba el foco en un elemento de la página (el error, su encabezado o «Volver a la lista de clases») y lo obtenido es `document.activeElement === document.body` en las tres corridas.
Lo demás de la recarga fallida resiste en los seis hermanos: la mutación termina y no queda colgada en espera, sale un solo aviso de éxito y ningún aviso de error, y el error se ve en la consulta recargada. En «Agregar a la clase», «Sí, quitar» del roster y «Sí, borrar comentario» el foco no cae en `<body>`.
Requisito o regla violada: `DESIGN.md` §7.14 (el foco nunca queda en `<body>` cuando el control enfocado desaparece) y el precedente T-29 de CLASES-c (tras el error de una lista, el foco no cae en `<body>`).
Hermanos:
- Los tres de la prueba.
- Cualquier vista que sustituya su contenido por `MensajeError` cuando una recarga falla con el foco dentro: `MaestrosDeLaClase`, `ClaseLayout` y la lista del muro.
- Por lectura del código, el caso de la publicación ya existía antes de T-02: el borrado no esperaba la recarga, pero la recarga fallida igual sustituía la lista. Los de maestros son de 02c.
- No ataqué editar ni crear clase, porque navegan sin esperar la recarga.

### Observaciones (no son hallazgos; las decide el manager)
- **O-10 (el aviso de «Sí, quitar» del roster llega al terminar la recarga):** en los otros cinco hermanos, el aviso de éxito sale en el `onSuccess` del hook, antes de esperar la recarga. En `tabla-alumnos.tsx` está en el `onSuccess` de `mutate`, que corre cuando la recarga termina: con una recarga lenta, la persona ve el botón en espera sin aviso hasta el final. El aviso sale una vez, también si la recarga falla. Es coherente con la regla del aviso único, pero no con sus hermanos; lo dejo para el manager. Mi prueba lo trata como comportamiento esperado (`avisoAlTerminarLaRecarga`).
- **O-11 (duración cerca del umbral):** `alumnos-b-r2` › «quitar la primera fila de la página 2 lleva el foco al «Quitar» de la que ocupa su lugar» subió a 4516 ms en la corrida 1 (3352 ms en la ronda 1). Es la espera de la recarga de T-02 sumada a su propio flujo. No llega a 5 s, pero es el caso más cerca del umbral (M-02 de DESIGN-01b).
- **«Unirme a la clase»:** con la recarga de `inscritas` lenta o fallida, navega una sola vez y solo al terminar. Con la acción respondida, el botón sigue en espera (`aria-busy`, sin `disabled`) y un clic más no manda otro POST. Sale un solo aviso «Te uniste a Álgebra I». Coincide con M-11 del manager (ahora sí espera).

### Atacado sin hallazgos
- **La ventana entre el `200` y la recarga, con el segundo clic a 30 ms o después del `200`** (12 casos, en los seis hermanos): una sola petición, un solo aviso y ningún error. Después del `200`, el botón sigue conectado y en espera, con `aria-busy="true"` y sin `disabled`, hasta que la recarga deja de ofrecer la acción («La clase ya tiene 2 maestros…», la nota del mínimo, «Ya está en la clase», el roster vacío, la publicación o el comentario fuera). Al terminar, el foco no queda en `<body>`.
- **La recarga que falla:** la mutación termina, sale un solo aviso de éxito y ninguno de error, y la consulta recargada muestra «Algo salió mal. Inténtalo de nuevo.» en los seis hermanos; el foco cae en `<body>` solo en los tres de T-04.
- **«Unirme a la clase»** con la recarga lenta y con la recarga fallida (2 casos; ver arriba).
- **Los cinco «Cargar más»** (`cargar-mas-02c-r2`, 10 casos), con dos clics en el mismo instante y a 30 ms con la página en vuelo: «Cargar más clases» de `/admin/clases`, «Ver más clases» de los dos inicios, «Ver más publicaciones» y «Ver más comentarios». En los cinco, una sola petición de la página siguiente (`cancelRefetch: false`), ninguna fila duplicada al llegar, el botón desaparece en la última página y el foco no cae en `<body>`. O-08 queda cerrada.
- **Regresión de la ronda 1:** las 6 `*.ataque` de 02c r1 en verde, incluidos los dos casos de T-02.

### No atacado y por qué
- **360 px y la presentación real:** jsdom no aplica medios; queda para la comprobación humana (H-2 y H-4, al final de 02d). Ningún navegador.
- **Backend:** 02c no lo toca.
- **«Cargar más» de `tabla-alumnos.tsx`, `personas-view.tsx` y `features/admin`:** el manager los mandó a 02d y a ADMIN.
- **«Unirme a la clase» a 0 ms:** fuera de los hermanos de T-02 que pidió el orquestador; queda nombrado como hermano de T-03.
- **Lo de 02d:** la barra lateral, el correo en «Personas» y el control segmentado.

### Corridas
**Comando (n = 1, 2 y 3, una tras otra):**
```
cd frontend; npm test -- --reporter=default --reporter=json --outputFile.json=<scratchpad>/front-02c-r2-<n>.json > <scratchpad>/front-02c-r2-<n>.txt 2>&1
```

| Corrida | Horario (UTC) | Código | Test Files | Tests | Duration |
|---|---|---|---|---|---|
| 1 | 20:06:41 a 20:08:06 | 1 | `1 failed / 114 passed (115)` | `9 failed / 1647 passed (1656)` | 81.75s |
| 2 | 20:08:06 a 20:09:30 | 1 | `1 failed / 114 passed (115)` | `9 failed / 1647 passed (1656)` | 80.73s |
| 3 | 20:09:30 a 20:10:53 | 1 | `1 failed / 114 passed (115)` | `9 failed / 1647 passed (1656)` | 80.10s |

- **Última línea literal** (la misma en las tres, con su número): `npm error command C:\WINDOWS\system32\cmd.exe /d /s /c vitest run --reporter=default --reporter=json --outputFile.json=C:/Users/Carlos/AppData/Local/Temp/claude/c--Users-Carlos-Documents-Proyecto-PlataformaEducativa/***/scratchpad/front-02c-r2-1.json` (`-2.json` y `-3.json` en las otras dos).
- **Rojos** (los mismos 9 en las tres corridas, comparados con `diff` sobre el JSON), todos en `src/features/clases/ventana-02c-r2.ataque.test.tsx`:
  - T-03, con «segundo clic a 0 ms», 6 casos: «Asignar a la clase» (maestros), «Sí, quitar» (maestros), «Agregar a la clase» (roster) y «Sí, borrar» (publicación) y «Sí, borrar comentario» dan `{ peticiones: 2, avisos: 2, … }`; «Sí, quitar» (roster) da `{ peticiones: 2, avisos: 1, … }`.
  - T-04, con «la recarga falla después del 200», 3 casos: «Asignar a la clase» (maestros), «Sí, quitar» (maestros) y «Sí, borrar» (publicación). En los tres: `el foco quedó en <body>: expected <body>… not to be <body>…`.
- **Casos lentos (umbral de 5 s):** ninguno llega a 5 s. Los cinco más lentos de la corrida 1: `alumnos-b-r2` «quitar la primera fila de la página 2…» 4516 ms, `alumnos-b-r2` «quitar la última fila de todas…» 3917 ms, `alumnos-b-r5` «alumnos, teclado: «Ver más»…» 3742 ms, `alumnos-b-r2` «quitar la última fila de la página 1…» 3665 ms y `alumnos-b-r4` «alumnos: con más páginas…» 2507 ms (ver O-11).

### Conteos
- `cd frontend; npx vitest list > <scratchpad>/front-list-02c-r2.txt`: **1656 casos**; `--filesOnly`: **115 archivos**, de ellos **64** `*.ataque` del frontend con **1059** casos.
- Diferencia con lo que aceptó el manager (113 / 1620): **+2 archivos y +36 casos**, los de esta ronda (`grep -c "02c-r2.ataque"`: 36).
- `*.ataque`: **131** (67 del backend y 64 del frontend).

### Tabla de SHA-256 de las 131 `*.ataque` al cierre de la ronda 2 de 02c (base de V-01 de la siguiente ronda o del cierre de 02c; 2 nuevas, ninguna existente cambia)
| SHA-256 | Archivo | Cambio |
|---|---|---|
| `BCCE2CAE771F97957D8691BEF7FFF4EC42412DAAEABF726AEB0AFC59F6F25671` | `backend/src/config/correo.ataque.test.ts` |  |
| `DCB78D222544E8DC4FBECE59468F555B04ABE971B70016E9BB17FCAE3E958580` | `backend/src/config/env.ataque.test.ts` |  |
| `71E7F049447D2D1ECEDD897C55EA0B6D31221753F0A7E7473C7AC6E8667F0A95` | `backend/src/config/logger.ataque.test.ts` |  |
| `91F620C1A27778EEBC2BED5EEC1BC9B0E3FE1199B32ED00F9DD910011D6A1805` | `backend/src/core/clases/codigo-r1.ataque.test.ts` |  |
| `262691F5786AD63B2393D0BA5FF97538F6DACF43343BED019AD23C12A07D8686` | `backend/src/core/clases/codigo-r2.ataque.test.ts` |  |
| `E769CBFCC3A83A64B51C6437F80684640A7C928AD6B8C5C1671FDFF005D7B734` | `backend/src/workers/ritmo-03c-r1.ataque.test.ts` |  |
| `36C23511D5BFD24F2BB999BA34B00C193C8DD0FD0782F29F4E0BB00631E2FBCA` | `backend/test/admin-muro-02b-r1.ataque.test.ts` |  |
| `388AD0E585639B8C3E0E0A6657FB42C1B9CB83DB721C4863C4FA19E0BE42EC85` | `backend/test/admin-unico.ataque.test.ts` |  |
| `D2CC28B62BF988AE14BA975A9BC8D534AEC0EEBCE30DA93D7DED9A26026B0857` | `backend/test/alumnos-b-r1.ataque.test.ts` |  |
| `00346D471355ABC7971B921649E7192B8987FE27912C00CB7E41AEF2065369E9` | `backend/test/alumnos-b-r2.ataque.test.ts` |  |
| `FC11AB4B914D4A88612953F82DB354E2B9CEA9BEF86E24321EF7E031F3AC3837` | `backend/test/alumnos-b-r3.ataque.test.ts` |  |
| `441A766A94E7D9B26807790402E06ED94D4CC378D8F6ECF0BCCC3259C7FF55FB` | `backend/test/api-real.ataque.test.ts` |  |
| `D9E1DE5B1BD43F54CF3A4DCF153D1EEABDC36B4DEC02FBEB9D8A0239F298DFE9` | `backend/test/archivos-d-r1.ataque.test.ts` |  |
| `1637EB447CD12AC5BDDDC7634980DBC10A25CBAD5DE01BF6C09F40ED930FF1A9` | `backend/test/archivos-d-r2.ataque.test.ts` |  |
| `42BB7BF3086230C6EDC65AB73976AC8A801956336561AADBEE65CC3B40EB8612` | `backend/test/arquitectura-cuentas-r1.ataque.test.ts` |  |
| `38ADB0984744A0810287711F57BA0498287D0BC96344B8948BA1C490CA807716` | `backend/test/arranque-r1.ataque.test.ts` |  |
| `2C83D82D10BDD9B7A969768774D75B18B7A71A594BBAAC5FAE36A0E134D2336C` | `backend/test/auth-login.ataque.test.ts` |  |
| `73D3A2AE708A0EF676547A8094115B1419423057378387269BC3EADB34C7724E` | `backend/test/auth-registro.ataque.test.ts` |  |
| `6F557E8E860BCE6374671E90086E9C14B1861A308B6FBB434564612647892713` | `backend/test/autoria-02b-r1.ataque.test.ts` |  |
| `95BBA9BAC44366AD5A361E93DD2F278CB0A1CC889FA479049ACC7B45A9A5E71B` | `backend/test/clases-r1.ataque.test.ts` |  |
| `A87817D56C236C0BA3597214CAC23B10483BBC28AE44800C592ED5CE2EF97F38` | `backend/test/clases-r2.ataque.test.ts` |  |
| `72DE7D8AF3D3F772ABC19DB065F6E418F6EB76CE78D87FE6EBB51335FC99825A` | `backend/test/clases-r3.ataque.test.ts` |  |
| `BE97C4E48AC9551BED1D01552E90AB8CDF085CF928AE6C8C3D81809E35F7CE62` | `backend/test/clases-r4.ataque.test.ts` |  |
| `000EC9008C73D25121C82A46F5EA0F67E6C8C387CB04E361EF82812B57956098` | `backend/test/concurrencia-02a-r1.ataque.test.ts` |  |
| `530546B4D70A2B9AD36F98F37E2AF45480E81A1101EE3516D15426F78350BF82` | `backend/test/cuentas-03a-r1.ataque.test.ts` |  |
| `6303DDC170545F616C66773C3F5475CB3BE1FEA9347D8059354D6ADE8D676C16` | `backend/test/cuentas-r1.ataque.test.ts` |  |
| `3A4E81C111B8EEB7DF065804AA85062FA3FC607F0147149B71AC21C14E7818D9` | `backend/test/cuentas-r2.ataque.test.ts` |  |
| `F54F79F7B2A83E95FE440053CCAF15CB3EBB01CE5DFD4C6655E22159A5FD7E6B` | `backend/test/cuentas-r3.ataque.test.ts` |  |
| `A2F9BFF596330A7D55D1CA9D47197FC831EB132F52C759610E2D667895C3332F` | `backend/test/cuerpos-02a-r2.ataque.test.ts` |  |
| `D7A9DA854CE8AB8AD8D2437DB2E8C2A642A777EA3261A6B038DA28BE022DF848` | `backend/test/enlaces-03b-r1.ataque.test.ts` |  |
| `DC1B7EE7EA58966F5DB33CCB4581885A9669DEA2263954AE46D17A83E1EF6EAF` | `backend/test/enlaces-03b-r2.ataque.test.ts` |  |
| `B051B1986496E35E3E306C4C6BC306A763542BCA4B350574D0C02E2C484DEB35` | `backend/test/enlaces-ch-r2.ataque.test.ts` |  |
| `D28CC4DE621A680E6B54B2BFF889700300D558EC7849717584518D2F03EC8CAE` | `backend/test/entorno-ch-r1.ataque.test.ts` |  |
| `BA1AC9B17CC9BF747522BD4EC8B87DF436008482E643B18EEA8E9A8C041C59B3` | `backend/test/formada-ch-r1.ataque.test.ts` |  |
| `EC9602D5F109B45A6D428E708D9B6CDD37A7509A6FF9031FA6FD8A2DA0E25E9B` | `backend/test/gestion-02a-r1.ataque.test.ts` |  |
| `5F4133F949D2F337A8F63B75CF82CB77114DB7812D67C1960105F5000C31A326` | `backend/test/guarda-ch-r1.ataque.test.ts` |  |
| `7A7DAC6D87EDF81059FCFF9C07471AAF49D690EC159BE4B9FD4AA32B0909A215` | `backend/test/guarda-ch-r2.ataque.test.ts` |  |
| `610EE44E5D0BCEA46EB4E3645F9ADF1998A76947A25AF7E3F8248EA3A633DF79` | `backend/test/guarda-ch-r3.ataque.test.ts` |  |
| `E5D149F3AC52B726E1FE08908249706341330F88EAA6674B9A9AC67B98B1E864` | `backend/test/guarda-clase-r1.ataque.test.ts` |  |
| `C979D2C9C420A2177FA6EBDDB78EB2CE84D5F043B94270F690916A6FC75D6F8F` | `backend/test/guarda-clase-r2.ataque.test.ts` |  |
| `20982E2B98F1B162146A211923F3D5EC19D4E170C4AA3A5BFC6F82C3B6173AAD` | `backend/test/guarda-r2.ataque.test.ts` |  |
| `A8B79D5AD98270BE3747F493865708A78BB73ADD08D832584DB4464C3582777A` | `backend/test/intentos-r2.ataque.test.ts` |  |
| `2619B44EEA3370494C95AC128FCFD9E3FFC20D1581A19F549BF371F603A11D7D` | `backend/test/invitacion-flujo-03a-r2.ataque.test.ts` |  |
| `704155928183AEC193AE7E157B86B3E9361D2B63C7A47BE1ED859605FAB4FFA6` | `backend/test/invitacion-masiva-03c-r1.ataque.test.ts` |  |
| `DD9B7454E8786BF0B833D265900CCAECF595808CEBC8E9A77C9AEF15298A1038` | `backend/test/invitacion-masiva-03c-r2.ataque.test.ts` |  |
| `F9F9EC59EC8D1A5CCB180522798140C45604440F48EDCD68A3E02863D90AE347` | `backend/test/logs-02a-r1.ataque.test.ts` |  |
| `A2006C163D9E6CD3E4A2A773D1501826DAF3C8E7BB184D205BFC6442318FB59C` | `backend/test/logs-02b-r1.ataque.test.ts` |  |
| `BD8B303C434EFEC0785E0691D31D6F6E87DBF3305F50FA27CCE0F78CBB251E3A` | `backend/test/logs-03a-r1.ataque.test.ts` |  |
| `B58D5D013658433FE5839634E2DB5A31B8D2B8F69587BC36958752D3CD33BBF7` | `backend/test/logs-03b-r1.ataque.test.ts` |  |
| `0E4ABF3BC5D92FA0C380805453190703862567930DD74B9E7FCC1809564D181F` | `backend/test/logs-03c-r1.ataque.test.ts` |  |
| `1E775A19682F3A5995D7C035BCC810A36BF50C22045B6FFBFC5A98B821255DB0` | `backend/test/logs-archivos-d-r1.ataque.test.ts` |  |
| `E9CE866D511E3EE6029015B74E20B4D342A60BE99B3AAC97E86F00283A3C77F1` | `backend/test/logs-archivos-d-r3.ataque.test.ts` |  |
| `E008935B107752D203F6423B2F1C9E0F5A4339F0A77154746BF262CECB90351A` | `backend/test/logs-cuentas-r1.ataque.test.ts` |  |
| `690E30ED39111C0A074FC159015967CD9F0FDC24D9A340E6A0D7BE4B980A9D45` | `backend/test/logs-muro-c-r1.ataque.test.ts` |  |
| `0809C60700E26183E7771B4B1A40B05CBF554C2ED7929190CF4D89A52722E551` | `backend/test/logs-muro-c-r2.ataque.test.ts` |  |
| `5AF3909E4B7CA485E78979567872EA78BF41E6D679B9EC2C761EAA0B250DF689` | `backend/test/logs-r2.ataque.test.ts` |  |
| `AE66FBCF60E8F66336E77C1055893E60CB85A01BC746B89C68A4D2C70C807AF1` | `backend/test/muro-c-r1.ataque.test.ts` |  |
| `7825CFC9B484DF740FA0E9562A195D1BBCAF4CAF72EA55FA847B5394AB96C125` | `backend/test/muro-c-r2.ataque.test.ts` |  |
| `8B733B86FC6D54ECE008389A59793FAE4EC4A65146EB37215E900E50A5337D46` | `backend/test/nombres-guarda-r3.ataque.test.ts` |  |
| `00A6EB6F7CCD7D8790C356BEFCC96DDFDA6EACCE0BE53DE255CFE3626D8F2ADB` | `backend/test/nombres-tokens-r2.ataque.test.ts` |  |
| `80B5A848F69B429E7DADEC86C07BEC1D3E3EED8A042EFBA41CE912DED39E7BAB` | `backend/test/nowait-ch-r1.ataque.test.ts` |  |
| `6F2ABC2CEFD77D74CD1E3ABBDCE9C41BB53D00BD4D8E5BA7E496C4441C2697E5` | `backend/test/servicio-ocupado-ch-r1.ataque.test.ts` |  |
| `3B2D94ABCCBEDD6FB53CF666AAD06ADF431A0DB9A09264F05D8ADF6963CBD0AE` | `backend/test/sesiones-y-cadena.ataque.test.ts` |  |
| `70AC720F2E7FCADEE5BBCB6414887AB08129DEA7CD91DF012046953B1584E8B6` | `backend/test/sexto-paso-02a-r1.ataque.test.ts` |  |
| `F09E9A0038C47D1A2223376A0AF260BAF573F0C45BF770201C48C9E30296F04B` | `backend/test/worker-03c-r1.ataque.test.ts` |  |
| `9F60F9D65D52D2021A1EB04E9F01D3CC68F22744C845BF93D6621AA4FE9713A8` | `backend/test/worker-r1.ataque.test.ts` |  |
| `77D11BD85F202A9EEC92A363DF82E63FB9A784CA9D368D49F62E61C1A2AA967B` | `backend/test/worker-r2.ataque.test.ts` |  |
| `B89EDE0F6AED45DFCB5E64C8909A822156CE43FD80948E72419CDCE9D4541A87` | `frontend/src/app/cache-03a-r1.ataque.test.tsx` |  |
| `E85743C0FBB8E476874A2C67334342D8D69D14153579FC1E4CCE0AE6E2B29616` | `frontend/src/app/contexto-r1.ataque.test.tsx` |  |
| `BC2BE5541006887E2A5A4A89B33046180F607D54474B0F96A73D615AFBCAC385` | `frontend/src/app/contrasena-r1.ataque.test.tsx` |  |
| `F38BCACB716D8A39ACDB3535A95603CD0D8AB02572CA57A7DF5268B01CEB6EAC` | `frontend/src/app/contrasena-r2.ataque.test.tsx` |  |
| `68FB5D092C0C8ECFCF282477EF023AAAE26F6B869656E05109DC3EFA276D842A` | `frontend/src/app/cuentas-r1.ataque.test.tsx` |  |
| `41930017715D3D6869DC7ACEFD75DE8EC3684F1F035B845ABDF8EC0F6B734DEE` | `frontend/src/app/cuentas-r2.ataque.test.tsx` |  |
| `1506C27E5F7418B5E087FD30F8809645A2FC3E2761C7249DE78F02E24AA6C7A5` | `frontend/src/app/en-espera-r1.ataque.test.tsx` |  |
| `DB48DAD405C27062621A44D3744C84CC5903892A51E5A8DF18F41383CB9C88A3` | `frontend/src/app/errores-r1.ataque.test.tsx` |  |
| `F95321E604E20B533EBF2DB3C1C6C66BA2F2D87A48F075415B766551F6EE30F4` | `frontend/src/app/fondo-r1.ataque.test.tsx` |  |
| `57CB54AFD3B79464F0DF01B88FC388CEBBEAC5657D936C4C204CBAE6034B0834` | `frontend/src/app/marco-r1.ataque.test.tsx` |  |
| `D32E1C5B5629C37D2521446D7E578CDB081DD71F5B5026E73E13C58E16D92801` | `frontend/src/app/muro-recuperar-c-r3.ataque.test.tsx` |  |
| `BEC7B7B49E056AFE514F654FCA9C562D77A090F7421057B8B03D57D4E862140A` | `frontend/src/app/muro-recuperar-c-r4.ataque.test.tsx` |  |
| `2F8056A770397C1601647277944555A48AFC4B9A2BABEB75E5898F0CC92562BB` | `frontend/src/app/muro-rutas-c-r1.ataque.test.tsx` |  |
| `0EEFED2C05D76B0790A437E9465A898A9076083B1F046F8785145CFAAD0DA379` | `frontend/src/app/registro-maestro-03b-r1.ataque.test.tsx` |  |
| `053E867A904AFA3C09EEF92CA2E03E929D9F9C93F714040856F40C7418721BBE` | `frontend/src/app/router.ataque.test.tsx` |  |
| `28B4046CB3DB0BA03338767FA614BA6F4B53650327F4E6CC3CDE4123F6F3F233` | `frontend/src/app/rutas-02c-r1.ataque.test.tsx` |  |
| `C7946F5F5D5D16D36B395ADC2AD9928ACC7FD9839875FB64532B51489756730B` | `frontend/src/app/rutas-clases-r1.ataque.test.tsx` |  |
| `F090CBD8E8C9B0AF52D4FC19547B07E9B6413F5414CC4B10862F01E29818DDDC` | `frontend/src/app/sesion-r2.ataque.test.tsx` |  |
| `FA229C216651693AFFDAC0FDDD148EC5AC26FDFB3A15ABB827F21CCBCEF4C3E1` | `frontend/src/components/layout/estatico-r1.ataque.test.ts` |  |
| `0AAA18CD70465293B6FCA6CC051B8E4AC360A838D02FEDE848C35376C3D0066C` | `frontend/src/components/layout/pie-r1.ataque.test.tsx` |  |
| `00A707429AF6B5326F9A96DEF6382823CF4A6A092AAC7E7BD7CBCB8DC9AA1D21` | `frontend/src/components/layout/pie-r2.ataque.test.tsx` |  |
| `472E1F46D0C899496AA334909B02988962AAB07B9BD29A8D7B8AF3987FAC6C76` | `frontend/src/components/layout/pie-r3.ataque.test.tsx` |  |
| `A1814D281DAFD8243989C9F9A462A4F33A86B1FB70EEEBF29E99BCB0F340D82A` | `frontend/src/components/ui/badge-03b-r1.ataque.test.ts` |  |
| `86ADAA9A093A987DAFD97E279E600211CBDF6CEF97879D16FA2D8A9D2846F8B5` | `frontend/src/features/admin/cuentas-r1.ataque.test.tsx` |  |
| `B948E9359FD3981E08B850540027F536F345A3F48D7C0749BA0C16C2C1DF1184` | `frontend/src/features/admin/cuentas-r2.ataque.test.tsx` |  |
| `72BF9AF4CE8F52A114897E038CEFB0947841A37F74074F4C5F8DEC68A71B654A` | `frontend/src/features/admin/cuentas-r3.ataque.test.tsx` |  |
| `942DF3015424AED56E83661993BA015E871CD6BE8E797920D47E8CBF0C56EAC4` | `frontend/src/features/admin/cuentas-r4.ataque.test.tsx` |  |
| `3BD26E7E3BF019D462DB4837861ED22017BBB9E9A6276720BF0DEA6C2B5B0998` | `frontend/src/features/admin/en-espera-r1.ataque.test.tsx` |  |
| `8219C864E7BDC1315E6A0F0FF1CD6F54E4710CEBDCEB8E316F4E53AACC0CFF35` | `frontend/src/features/admin/foco-r1.ataque.test.tsx` |  |
| `30F45BBA30D9348EC1587B42E84CA370274E1BF0AF0F310B8A6BBD79FA982669` | `frontend/src/features/admin/maestros-03b-r1.ataque.test.tsx` |  |
| `D477A809E55E603D3EF6C02CA43B21372B75D0947FA303F1539D48BDF32841F8` | `frontend/src/features/admin/maestros-03c-r1.ataque.test.tsx` |  |
| `3CEDA51DB8F67F40C26615FBC4CD7D082035B00F38713C6CA4C7DB58E47926C8` | `frontend/src/features/auth/enlace-r1.ataque.test.tsx` |  |
| `1F5D1147637C09DAA6FDF1384E4395EDD69DFDAB84AAE5D602A362DABD3295BD` | `frontend/src/features/auth/enlace-r2.ataque.test.tsx` |  |
| `991B115524D8DADE8D6EA2C51FB753DC8832EE410DB2161A0CE761D011CFCA4A` | `frontend/src/features/auth/invitacion-r1.ataque.test.tsx` |  |
| `25375E6678BA9B5331D53B78031BD315A8651F16CD32571E9FCEE539D07C5BA8` | `frontend/src/features/clases/alumnos-b-r1.ataque.test.tsx` |  |
| `55DC274ECA96DA4360848B88F9F2A839AC815031490AB57FF38DE074512D632C` | `frontend/src/features/clases/alumnos-b-r2.ataque.test.tsx` |  |
| `371518E4309F14201A92D29F9436A97A19801B506D45114964FBCFE3F5CD4183` | `frontend/src/features/clases/alumnos-b-r3.ataque.test.tsx` |  |
| `266D088DD727F18AF8C8A106B8D9C4DBED75753E4B1B4ABB12F3A4DF870ECB7F` | `frontend/src/features/clases/alumnos-b-r4.ataque.test.tsx` |  |
| `856CFFBD9C743F9815DAF731487E29DC5F5272545DC15820A70BAF86ECFA6527` | `frontend/src/features/clases/alumnos-b-r5.ataque.test.tsx` |  |
| `1E9A26ED86EE637E1A2E065DC05DA79CBB5048E18A020285D6B479FD290BCC9C` | `frontend/src/features/clases/archivos-d-r1.ataque.test.tsx` |  |
| `EFC07CC006E16E03BEEC69A17E08AED83657095555107B28FB1AB3EF1400E687` | `frontend/src/features/clases/archivos-d-r2.ataque.test.tsx` |  |
| `E01A46173F2820F0AF15824C88AA81805412B70248062F419DD40236C9EED7E3` | `frontend/src/features/clases/archivos-d-r3.ataque.test.tsx` |  |
| `A043F6264BF1487C4488EB3273148E905005D0DE847F388E7EFF954B089BFCB9` | `frontend/src/features/clases/cargar-mas-02c-r2.ataque.test.tsx` | nueva: ronda 2 de 02c |
| `D2C0EA65FCCF53F7DFECA318920922B82924A1EE3A1E257B5F31AF1F8FDD63E3` | `frontend/src/features/clases/clases-admin-02c-r1.ataque.test.tsx` |  |
| `5F0679D8CFACC8BCE01989C04A415DC5B546625EB7DEC92F03959DE5A0F89815` | `frontend/src/features/clases/clases-r1.ataque.test.tsx` |  |
| `C7AD5EDC733E374117A9277F1C2987E84CC2930C77EB4C720CCF15CC9F5FAB45` | `frontend/src/features/clases/clases-r2.ataque.test.tsx` |  |
| `A835A11D29AEDB8F77F91E826A22C2B7CF5322FCED3F6BED0C1ACBF7C75A4E61` | `frontend/src/features/clases/clases-r3.ataque.test.tsx` |  |
| `86B04D234527ECEEFCA35B07CE89E6B7CE0B6AFE5CCDEE2F005E6A4219F0495A` | `frontend/src/features/clases/clases-r4.ataque.test.tsx` |  |
| `E76A0B75591B6D0032AEAA870441EE093C05FC13408CC47A8CB5B5883AF7A14F` | `frontend/src/features/clases/estatico-02c-r1.ataque.test.ts` |  |
| `CDD1ED8890859AE3E884822FC7074852A2173105114745D83FE9A15C1C47C626` | `frontend/src/features/clases/estatico-r1.ataque.test.ts` |  |
| `0F60F1582FCE6E5EFAF9BF6856133DC30F1DC4EB9C3B7FEA19F90A330F8335B3` | `frontend/src/features/clases/inicio-sin-datos-02c-r1.ataque.test.tsx` |  |
| `7C434A0E54E70B12D4B2A3DE22FFB4DBF5F28A1CFBD2290C22E8A2B59EDF0E16` | `frontend/src/features/clases/inicio-sin-datos-r2.ataque.test.tsx` |  |
| `A4DE3A7DC35DAEDFF86FD41349EA09140213E918613603D0985C698FF41D29F7` | `frontend/src/features/clases/maestros-02c-r1.ataque.test.tsx` |  |
| `41D27CD07466255EDA02B898F474EFE036C91EA77E53061076514DECFE90E1FD` | `frontend/src/features/clases/muro-02c-r1.ataque.test.tsx` |  |
| `BF0CAB9760A82DB5761777542827F89E4DE9F3712D06E44916F698ABDA1ABBAA` | `frontend/src/features/clases/muro-c-r1.ataque.test.tsx` |  |
| `D91FCE8DFB93139D9F7941E33BA8904D92C4560B37A61737688194C9504B093E` | `frontend/src/features/clases/muro-c-r2.ataque.test.tsx` |  |
| `73523416AE3F04A4AE4DB25685E2C9A5BA8EB3DB015225DFEDC76EDF5D75958F` | `frontend/src/features/clases/muro-c-r3.ataque.test.tsx` |  |
| `611FAB9EEFF3126A0F15C83772875E1461CF4B477DBB0A8ADEDAE16886C9E4CB` | `frontend/src/features/clases/ventana-02c-r2.ataque.test.tsx` | nueva: ronda 2 de 02c |
| `C71CBA65DD284D7AF11CBC812B6BCF75BAA373939EDB8318E731858D9C50173F` | `frontend/src/lib/format-d-r1.ataque.test.ts` |  |
| `89DBBB70D5DC404C3D74DB5391D10855C8CB1D6B4C643B6147B3CE6FFB2637AF` | `frontend/src/lib/format-d-r2.ataque.test.ts` |  |
| `BFA7DED62F7A1402590D438A1CC51060A63FA019AD47D3EB5740E43383064A2A` | `frontend/src/lib/format-d-r3.ataque.test.ts` |  |
| `10C730348D18FF8DAE7B3623751D31122AA58560B564AD191717FA1938A6F8CE` | `frontend/src/services/apiClient.ataque.test.ts` |  |
| `7986CE1FE3EBF76714AA064FADE5BBEB855037A02EF66F6532632E8720ABC68B` | `frontend/src/styles/clases-r1.ataque.test.ts` |  |
| `B8085BCBBC7F4B6276BF3A87FB7BA0BC887953A8C6CE372354A7F3F1B5037582` | `frontend/src/styles/tokens-r1.ataque.test.ts` |  |

## CLASES-02c — Ronda 3

# Reporte del Tester — CLASES-02c · corrección de T-04 y ajuste de T-03 (frontend) — Ronda 3 (la última antes de escalar)
Veredicto: **ROTO** por un solo hallazgo, **T-05 (baja)**. La corrección de T-04 resiste en todo lo que T-04 pedía: tras una recarga fallida con el foco perdido, el foco va a la rama de error y no cae en `<body>`. Si el foco ya estaba en otro lado, no se mueve; una segunda recarga fallida no lo roba; el destino no es un tope de Tab; y `MensajeError` conserva `role="alert"` y su texto. Lo que rompe es más estrecho: una vista cuya **primera carga** falla también lleva el foco a su error cuando estaba en `<body>`. Lo decide el manager.
Verificación propia: lint `cd frontend; npm run lint` código 0 (última línea `> tsc -b`) · test `cd frontend; npm test`, tres corridas completas seguidas: `Tests  3 failed | 1669 passed (1672)` en las tres, con los mismos 3 rojos (los de T-05).

### Precondiciones
- **Fecha y base:** 2026-10-05; rama `feat/clases-02`; base `<K2b>` = `7544fb9`. Sin cambios en `backend/` ni `shared/`; no corrí el backend (PA-07 no aplica).
- **V-01:** las 131 `*.ataque` contra la tabla de la ronda 2 de 02c: **131 de 131 iguales**, ninguna sin rastrear antes de empezar.
- **Procesos y suites:** no toqué ningún proceso del humano; una suite a la vez; nadie más corrió pruebas.
- **Archivos:** 1 nuevo, `frontend/src/features/clases/foco-02c-r3.ataque.test.tsx` (16 casos), y 1 cambiado, `ventana-02c-r2.ataque.test.tsx` (mío, de esta subentrega, sin commit; ajuste de T-03 por el arbitraje). Ningún archivo de producción, prueba normal ni `*.ataque` ajena cambió. Prettier solo sobre esos 2, desde `frontend/`.

### Ajuste de T-03 (arbitraje del manager de la ronda 2, decisión (b): observación, no hallazgo)
- **Archivo:** `frontend/src/features/clases/ventana-02c-r2.ataque.test.tsx`, `describe` «la ventana entre el 200 y la recarga, en los hermanos de T-02». Los 6 casos se reescriben, no se retiran ni se desactivan (sin `skip`).
- **Antes:** el patrón «0 ms» hacía `fireEvent.click(boton)` dos veces seguidas, sin repintado entre ellas, y esperaba `{ peticiones: 1, avisos: 1, errores: 0 }`. Los 6 casos tenían el título «<hermano>, segundo clic a 0 ms: …».
- **Después:** el patrón es «0 ms tras el repintado (botón ya en espera)». El segundo clic va inmediatamente después de que el botón queda en espera (`waitFor` de `aria-busy="true"`, y además se comprueba que no tiene `disabled`). La prueba sigue exigiendo `{ peticiones: 1, avisos: 1, errores: 0 }` y el foco fuera de `<body>`. El título pasa a «<hermano>, segundo clic a 0 ms tras el repintado (botón ya en espera): …». Un comentario cita el arbitraje (`DESIGN.md` §6, punto 4: el candado síncrono es para efectos que no se repiten sin daño; las seis acciones son idempotentes).
- **Resultado:** los 26 casos del archivo, en verde en las tres corridas. Los patrones «30 ms» y «después del 200», y los casos de recarga fallida y de «Unirme a la clase», no cambian.
- **SHA-256:** de `611FAB9EEFF3126A0F15C83772875E1461CF4B477DBB0A8ADEDAE16886C9E4CB` (ronda 2) a `216611C095304561A1A70454ED50F1443FDF76D7BE1436DC47DD9FD0FE57FD74`.

### Regresión
Las 131 `*.ataque` anteriores pasan en las tres corridas, incluidos los 3 casos de T-04 de la ronda 2 (en verde sin tocarlos) y los de T-02 de la ronda 1.

### Hallazgos

#### T-05 — Una vista cuya primera carga falla lleva el foco desde <body> a su error («nace en error»)
Severidad: baja
Prueba: `frontend/src/features/clases/foco-02c-r3.ataque.test.tsx`, 3 casos:
- «ClaseLayout y «Maestros de la clase» cuando la recarga falla» › «una vista que ya nace en error (error en la caché al montar) no mueve el foco desde <body>»;
- «la lista del muro cuando la recarga o «Ver más publicaciones» fallan» › «un muro que nace en error (su primera carga falla) no mueve el foco desde <body>»;
- «/admin/clases cuando «Cargar más clases» o una recarga fallan» › «una lista que nace en error (su primera carga falla) no mueve el foco desde <body>».
Reproducción:
1. Se monta la vista con el foco en `<body>`, que es como queda tras navegar con un enlace que se desmonta, por ejemplo «Abrir» de `/admin/clases`. La consulta responde `500`. En el caso de `ClaseLayout`, la consulta ya está en error en la caché antes de montar (`prefetchQuery` que falla, `status: "error"`).
2. Al montar, TanStack Query vuelve a pedir la consulta y la presenta como pendiente porque no tiene datos, así que `isError` es `false` en el primer render. Cuando falla, `useFocoAlPasarAError` ve un paso «sin error → error» con el foco perdido y mueve el foco.
Esperado / Obtenido: se esperaba `document.activeElement === document.body`, sin moverlo. Lo obtenido es el contenedor del error de `ClaseLayout` (`<div tabindex="-1">`), el `h2` «Publicaciones» del muro y el `h1` «Clases» de `/admin/clases`, en las tres corridas.
Por qué baja: no roba un foco que la persona eligió. Con el foco puesto en otro lado, los tres casos hermanos «… cuya primera carga falla con el foco puesto fuera de la vista …» pasan: no se mueve. Llevar al lector de pantalla al error de una página que no cargó puede verse incluso como útil. Pero contradice el contrato que declara el propio gancho («una vista que ya nace en error, o un foco que la persona eligió, no se tocan») y el alcance del arbitraje de T-04 («cuando la consulta **recargada** pasa a `isError`»). El orquestador lo pidió como punto de ataque («ni en una vista que nace en error»). **Lo decide el manager:**
- (a) aceptar el comportamiento, porque mover el foco al error de una página que no cargó es razonable, y corregir el comentario del gancho y el alcance escrito; o
- (b) restringir el gancho a cuando la consulta ya tuvo datos, por ejemplo con `isError && data !== undefined` o un ref de «ya hubo datos». No lo pruebo como remedio.
Requisito o regla violada: el contrato del gancho (`features/clases/hooks.ts`, comentario de `useFocoAlPasarAError`) y el alcance del arbitraje de T-04 (`revision.md`, «## Arbitraje — ronda 2 de 02c»); `DESIGN.md` §7.14 no pide mover el foco en una carga inicial.
Hermanos: los cuatro usos del gancho, `ClaseLayout`, `MaestrosDeClaseView` (que comparte la consulta con `ClaseLayout`), la lista del muro (`MuroView`) y `ClasesAdminView`. Los tres que se prueban fallan igual; `MaestrosDeClaseView` sola sigue el mismo código y no la probé en la carga inicial.

### Atacado sin hallazgos
Archivo `foco-02c-r3.ataque.test.tsx`; 13 casos en verde.
- **`ClaseLayout` (los dos casos de maestros):** asignar responde `200` y la recarga `500` con el foco perdido. El foco va al contenedor del error (`tabindex="-1"`, `tabIndex` −1, sin `role="alert"` propio), que contiene el `MensajeError` con `role="alert"` y «Algo salió mal. Inténtalo de nuevo.». El único elemento tabulable de la rama es «Volver a la lista de clases».
  - Si la persona puso el foco fuera de la vista mientras la recarga estaba en vuelo, el foco se queda ahí.
  - Una segunda recarga fallida (`invalidateQueries` con el error ya mostrado) no roba el foco puesto en «Volver a la lista de clases».
  - Si la primera carga falla con el foco fuera de la vista, no se mueve.
- **`MaestrosDeClaseView` montada sola:** con el foco perdido tras la recarga fallida, el foco va a su contenedor (`tabindex="-1"`, con el alerta dentro y ningún elemento tabulable).
- **Lista del muro:**
  - Tras «Sí, borrar», con la recarga en `500`, el foco va al `h2` «Publicaciones» (`tabindex="-1"`) y el alerta conserva su texto.
  - Si la persona ya está en el campo «Anuncio», el foco se queda ahí, también ante una segunda recarga fallida.
  - Si la primera carga falla con el foco fuera, no se mueve.
  - «Ver más publicaciones» que falla: con el foco en el botón, va al encabezado; si la persona se fue al campo «Anuncio», se queda ahí.
- **`/admin/clases`:**
  - «Cargar más clases» que falla: con el foco en el botón, va al `h1` «Clases» (`tabindex="-1"`), con el alerta «No pudimos cargar las clases. Revisa tu conexión e inténtalo de nuevo.».
  - Si la persona pasó a «Crear clase» antes del fallo, el foco se queda ahí.
  - Una lista cuya primera carga falla con el foco fuera no lo mueve, y una segunda recarga fallida no roba el foco de «Crear clase».
- **`ComentariosDePublicacion`:** sin cambio, como dijo el programador; el caso de «Sí, borrar comentario» con la recarga fallida de la ronda 2 sigue en verde, con el foco fuera de `<body>`.
- **El ajuste de T-03** (6 casos reescritos) y el resto de `ventana-02c-r2` y `cargar-mas-02c-r2`: en verde.

### Observaciones (no son hallazgos; las decide el manager)
- **O-12 (O-11 de la ronda 2, duraciones):** `alumnos-b-r2` › «quitar la primera fila de la página 2…» bajó a 3027 ms en la corrida 1 (4516 ms en la ronda 2). Ningún caso llega a 5 s; PA-12 no se activó.
- **Tabulación del contenedor del error:** `tabIndex={-1}` deja el contenedor fuera del orden de Tab, pero en Safari con VoiceOver un `div` enfocable sin rol ni nombre puede anunciarse como «grupo». No es verificable en jsdom; queda para la comprobación humana, si el manager quiere incluirlo.

### No atacado y por qué
- **360 px, lectores de pantalla reales y la presentación:** jsdom no aplica medios ni anuncia; queda para la comprobación humana (H-2 y H-4, al final de 02d). Ningún navegador.
- **Backend:** 02c no lo toca.
- **`MaestrosDeClaseView` sola en su carga inicial:** usa el mismo gancho; lo cubre por analogía T-05.
- **O-10, M-10 y los dos «Cargar más» pendientes:** el manager los mandó a 02d.

### Corridas
**Comando (n = 1, 2 y 3, una tras otra):**
```
cd frontend; npm test -- --reporter=default --reporter=json --outputFile.json=<scratchpad>/front-02c-r3-<n>.json > <scratchpad>/front-02c-r3-<n>.txt 2>&1
```

| Corrida | Horario (UTC) | Código | Test Files | Tests | Duration |
|---|---|---|---|---|---|
| 1 | 21:32:44 a 21:33:57 | 1 | `1 failed / 115 passed (116)` | `3 failed / 1669 passed (1672)` | 70.16s |
| 2 | 21:33:57 a 21:35:11 | 1 | `1 failed / 115 passed (116)` | `3 failed / 1669 passed (1672)` | 70.93s |
| 3 | 21:35:11 a 21:36:26 | 1 | `1 failed / 115 passed (116)` | `3 failed / 1669 passed (1672)` | 70.99s |

- **Última línea literal** (la misma en las tres, con su número): `npm error command C:\WINDOWS\system32\cmd.exe /d /s /c vitest run --reporter=default --reporter=json --outputFile.json=C:/Users/Carlos/AppData/Local/Temp/claude/c--Users-Carlos-Documents-Proyecto-PlataformaEducativa/***/scratchpad/front-02c-r3-1.json` (`-2.json` y `-3.json` en las otras dos).
- **Rojos:** los mismos 3 en las tres corridas, comparados con `diff` sobre el JSON. Todos son de T-05 y están en `src/features/clases/foco-02c-r3.ataque.test.tsx`:
  - «una vista que ya nace en error (error en la caché al montar) no mueve el foco desde <body>»: `expected <div tabindex="-1" …> to be <body>…`.
  - «un muro que nace en error (su primera carga falla) no mueve el foco desde <body>»: `expected <h2 tabindex="-1" class="sr-only"> to be <body>…`.
  - «una lista que nace en error (su primera carga falla) no mueve el foco desde <body>»: `expected <h1 tabindex="-1" class="text-h1"> to be <body>…`.
- **Casos lentos (umbral de 5 s):** ninguno llega. Los cinco más lentos de la corrida 1:

  | Caso | Duración |
  |---|---|
  | `alumnos-b-r2` «quitar la primera fila de la página 2…» | 3027 ms |
  | `alumnos-b-r2` «quitar la última fila de todas…» | 2485 ms |
  | `alumnos-b-r5` «alumnos, teclado: «Ver más»…» | 2429 ms |
  | `muro-recuperar-c-r4` «primer render…» | 2154 ms |
  | `alumnos-b-r2` «quitar la última fila de la página 1…» | 1892 ms |

### Conteos
- `cd frontend; npx vitest list > <scratchpad>/front-list-02c-r3.txt`: **1672 casos**; `--filesOnly`: **116 archivos**, de ellos **65** `*.ataque` del frontend, con **1075** casos.
- Diferencia con lo que aceptó el manager (115 / 1656): **+1 archivo y +16 casos**, los de `foco-02c-r3` (`grep -c "02c-r3.ataque"`: 16). El ajuste de T-03 no cambia el número de casos.
- `*.ataque`: **132** (67 del backend y 65 del frontend).

### Tabla de SHA-256 de las 132 `*.ataque` al cierre de la ronda 3 de 02c (base de V-01 del cierre de 02c y de 02d; 1 nueva y 1 cambiada, ambas del tester)
| SHA-256 | Archivo | Cambio |
|---|---|---|
| `BCCE2CAE771F97957D8691BEF7FFF4EC42412DAAEABF726AEB0AFC59F6F25671` | `backend/src/config/correo.ataque.test.ts` |  |
| `DCB78D222544E8DC4FBECE59468F555B04ABE971B70016E9BB17FCAE3E958580` | `backend/src/config/env.ataque.test.ts` |  |
| `71E7F049447D2D1ECEDD897C55EA0B6D31221753F0A7E7473C7AC6E8667F0A95` | `backend/src/config/logger.ataque.test.ts` |  |
| `91F620C1A27778EEBC2BED5EEC1BC9B0E3FE1199B32ED00F9DD910011D6A1805` | `backend/src/core/clases/codigo-r1.ataque.test.ts` |  |
| `262691F5786AD63B2393D0BA5FF97538F6DACF43343BED019AD23C12A07D8686` | `backend/src/core/clases/codigo-r2.ataque.test.ts` |  |
| `E769CBFCC3A83A64B51C6437F80684640A7C928AD6B8C5C1671FDFF005D7B734` | `backend/src/workers/ritmo-03c-r1.ataque.test.ts` |  |
| `36C23511D5BFD24F2BB999BA34B00C193C8DD0FD0782F29F4E0BB00631E2FBCA` | `backend/test/admin-muro-02b-r1.ataque.test.ts` |  |
| `388AD0E585639B8C3E0E0A6657FB42C1B9CB83DB721C4863C4FA19E0BE42EC85` | `backend/test/admin-unico.ataque.test.ts` |  |
| `D2CC28B62BF988AE14BA975A9BC8D534AEC0EEBCE30DA93D7DED9A26026B0857` | `backend/test/alumnos-b-r1.ataque.test.ts` |  |
| `00346D471355ABC7971B921649E7192B8987FE27912C00CB7E41AEF2065369E9` | `backend/test/alumnos-b-r2.ataque.test.ts` |  |
| `FC11AB4B914D4A88612953F82DB354E2B9CEA9BEF86E24321EF7E031F3AC3837` | `backend/test/alumnos-b-r3.ataque.test.ts` |  |
| `441A766A94E7D9B26807790402E06ED94D4CC378D8F6ECF0BCCC3259C7FF55FB` | `backend/test/api-real.ataque.test.ts` |  |
| `D9E1DE5B1BD43F54CF3A4DCF153D1EEABDC36B4DEC02FBEB9D8A0239F298DFE9` | `backend/test/archivos-d-r1.ataque.test.ts` |  |
| `1637EB447CD12AC5BDDDC7634980DBC10A25CBAD5DE01BF6C09F40ED930FF1A9` | `backend/test/archivos-d-r2.ataque.test.ts` |  |
| `42BB7BF3086230C6EDC65AB73976AC8A801956336561AADBEE65CC3B40EB8612` | `backend/test/arquitectura-cuentas-r1.ataque.test.ts` |  |
| `38ADB0984744A0810287711F57BA0498287D0BC96344B8948BA1C490CA807716` | `backend/test/arranque-r1.ataque.test.ts` |  |
| `2C83D82D10BDD9B7A969768774D75B18B7A71A594BBAAC5FAE36A0E134D2336C` | `backend/test/auth-login.ataque.test.ts` |  |
| `73D3A2AE708A0EF676547A8094115B1419423057378387269BC3EADB34C7724E` | `backend/test/auth-registro.ataque.test.ts` |  |
| `6F557E8E860BCE6374671E90086E9C14B1861A308B6FBB434564612647892713` | `backend/test/autoria-02b-r1.ataque.test.ts` |  |
| `95BBA9BAC44366AD5A361E93DD2F278CB0A1CC889FA479049ACC7B45A9A5E71B` | `backend/test/clases-r1.ataque.test.ts` |  |
| `A87817D56C236C0BA3597214CAC23B10483BBC28AE44800C592ED5CE2EF97F38` | `backend/test/clases-r2.ataque.test.ts` |  |
| `72DE7D8AF3D3F772ABC19DB065F6E418F6EB76CE78D87FE6EBB51335FC99825A` | `backend/test/clases-r3.ataque.test.ts` |  |
| `BE97C4E48AC9551BED1D01552E90AB8CDF085CF928AE6C8C3D81809E35F7CE62` | `backend/test/clases-r4.ataque.test.ts` |  |
| `000EC9008C73D25121C82A46F5EA0F67E6C8C387CB04E361EF82812B57956098` | `backend/test/concurrencia-02a-r1.ataque.test.ts` |  |
| `530546B4D70A2B9AD36F98F37E2AF45480E81A1101EE3516D15426F78350BF82` | `backend/test/cuentas-03a-r1.ataque.test.ts` |  |
| `6303DDC170545F616C66773C3F5475CB3BE1FEA9347D8059354D6ADE8D676C16` | `backend/test/cuentas-r1.ataque.test.ts` |  |
| `3A4E81C111B8EEB7DF065804AA85062FA3FC607F0147149B71AC21C14E7818D9` | `backend/test/cuentas-r2.ataque.test.ts` |  |
| `F54F79F7B2A83E95FE440053CCAF15CB3EBB01CE5DFD4C6655E22159A5FD7E6B` | `backend/test/cuentas-r3.ataque.test.ts` |  |
| `A2F9BFF596330A7D55D1CA9D47197FC831EB132F52C759610E2D667895C3332F` | `backend/test/cuerpos-02a-r2.ataque.test.ts` |  |
| `D7A9DA854CE8AB8AD8D2437DB2E8C2A642A777EA3261A6B038DA28BE022DF848` | `backend/test/enlaces-03b-r1.ataque.test.ts` |  |
| `DC1B7EE7EA58966F5DB33CCB4581885A9669DEA2263954AE46D17A83E1EF6EAF` | `backend/test/enlaces-03b-r2.ataque.test.ts` |  |
| `B051B1986496E35E3E306C4C6BC306A763542BCA4B350574D0C02E2C484DEB35` | `backend/test/enlaces-ch-r2.ataque.test.ts` |  |
| `D28CC4DE621A680E6B54B2BFF889700300D558EC7849717584518D2F03EC8CAE` | `backend/test/entorno-ch-r1.ataque.test.ts` |  |
| `BA1AC9B17CC9BF747522BD4EC8B87DF436008482E643B18EEA8E9A8C041C59B3` | `backend/test/formada-ch-r1.ataque.test.ts` |  |
| `EC9602D5F109B45A6D428E708D9B6CDD37A7509A6FF9031FA6FD8A2DA0E25E9B` | `backend/test/gestion-02a-r1.ataque.test.ts` |  |
| `5F4133F949D2F337A8F63B75CF82CB77114DB7812D67C1960105F5000C31A326` | `backend/test/guarda-ch-r1.ataque.test.ts` |  |
| `7A7DAC6D87EDF81059FCFF9C07471AAF49D690EC159BE4B9FD4AA32B0909A215` | `backend/test/guarda-ch-r2.ataque.test.ts` |  |
| `610EE44E5D0BCEA46EB4E3645F9ADF1998A76947A25AF7E3F8248EA3A633DF79` | `backend/test/guarda-ch-r3.ataque.test.ts` |  |
| `E5D149F3AC52B726E1FE08908249706341330F88EAA6674B9A9AC67B98B1E864` | `backend/test/guarda-clase-r1.ataque.test.ts` |  |
| `C979D2C9C420A2177FA6EBDDB78EB2CE84D5F043B94270F690916A6FC75D6F8F` | `backend/test/guarda-clase-r2.ataque.test.ts` |  |
| `20982E2B98F1B162146A211923F3D5EC19D4E170C4AA3A5BFC6F82C3B6173AAD` | `backend/test/guarda-r2.ataque.test.ts` |  |
| `A8B79D5AD98270BE3747F493865708A78BB73ADD08D832584DB4464C3582777A` | `backend/test/intentos-r2.ataque.test.ts` |  |
| `2619B44EEA3370494C95AC128FCFD9E3FFC20D1581A19F549BF371F603A11D7D` | `backend/test/invitacion-flujo-03a-r2.ataque.test.ts` |  |
| `704155928183AEC193AE7E157B86B3E9361D2B63C7A47BE1ED859605FAB4FFA6` | `backend/test/invitacion-masiva-03c-r1.ataque.test.ts` |  |
| `DD9B7454E8786BF0B833D265900CCAECF595808CEBC8E9A77C9AEF15298A1038` | `backend/test/invitacion-masiva-03c-r2.ataque.test.ts` |  |
| `F9F9EC59EC8D1A5CCB180522798140C45604440F48EDCD68A3E02863D90AE347` | `backend/test/logs-02a-r1.ataque.test.ts` |  |
| `A2006C163D9E6CD3E4A2A773D1501826DAF3C8E7BB184D205BFC6442318FB59C` | `backend/test/logs-02b-r1.ataque.test.ts` |  |
| `BD8B303C434EFEC0785E0691D31D6F6E87DBF3305F50FA27CCE0F78CBB251E3A` | `backend/test/logs-03a-r1.ataque.test.ts` |  |
| `B58D5D013658433FE5839634E2DB5A31B8D2B8F69587BC36958752D3CD33BBF7` | `backend/test/logs-03b-r1.ataque.test.ts` |  |
| `0E4ABF3BC5D92FA0C380805453190703862567930DD74B9E7FCC1809564D181F` | `backend/test/logs-03c-r1.ataque.test.ts` |  |
| `1E775A19682F3A5995D7C035BCC810A36BF50C22045B6FFBFC5A98B821255DB0` | `backend/test/logs-archivos-d-r1.ataque.test.ts` |  |
| `E9CE866D511E3EE6029015B74E20B4D342A60BE99B3AAC97E86F00283A3C77F1` | `backend/test/logs-archivos-d-r3.ataque.test.ts` |  |
| `E008935B107752D203F6423B2F1C9E0F5A4339F0A77154746BF262CECB90351A` | `backend/test/logs-cuentas-r1.ataque.test.ts` |  |
| `690E30ED39111C0A074FC159015967CD9F0FDC24D9A340E6A0D7BE4B980A9D45` | `backend/test/logs-muro-c-r1.ataque.test.ts` |  |
| `0809C60700E26183E7771B4B1A40B05CBF554C2ED7929190CF4D89A52722E551` | `backend/test/logs-muro-c-r2.ataque.test.ts` |  |
| `5AF3909E4B7CA485E78979567872EA78BF41E6D679B9EC2C761EAA0B250DF689` | `backend/test/logs-r2.ataque.test.ts` |  |
| `AE66FBCF60E8F66336E77C1055893E60CB85A01BC746B89C68A4D2C70C807AF1` | `backend/test/muro-c-r1.ataque.test.ts` |  |
| `7825CFC9B484DF740FA0E9562A195D1BBCAF4CAF72EA55FA847B5394AB96C125` | `backend/test/muro-c-r2.ataque.test.ts` |  |
| `8B733B86FC6D54ECE008389A59793FAE4EC4A65146EB37215E900E50A5337D46` | `backend/test/nombres-guarda-r3.ataque.test.ts` |  |
| `00A6EB6F7CCD7D8790C356BEFCC96DDFDA6EACCE0BE53DE255CFE3626D8F2ADB` | `backend/test/nombres-tokens-r2.ataque.test.ts` |  |
| `80B5A848F69B429E7DADEC86C07BEC1D3E3EED8A042EFBA41CE912DED39E7BAB` | `backend/test/nowait-ch-r1.ataque.test.ts` |  |
| `6F2ABC2CEFD77D74CD1E3ABBDCE9C41BB53D00BD4D8E5BA7E496C4441C2697E5` | `backend/test/servicio-ocupado-ch-r1.ataque.test.ts` |  |
| `3B2D94ABCCBEDD6FB53CF666AAD06ADF431A0DB9A09264F05D8ADF6963CBD0AE` | `backend/test/sesiones-y-cadena.ataque.test.ts` |  |
| `70AC720F2E7FCADEE5BBCB6414887AB08129DEA7CD91DF012046953B1584E8B6` | `backend/test/sexto-paso-02a-r1.ataque.test.ts` |  |
| `F09E9A0038C47D1A2223376A0AF260BAF573F0C45BF770201C48C9E30296F04B` | `backend/test/worker-03c-r1.ataque.test.ts` |  |
| `9F60F9D65D52D2021A1EB04E9F01D3CC68F22744C845BF93D6621AA4FE9713A8` | `backend/test/worker-r1.ataque.test.ts` |  |
| `77D11BD85F202A9EEC92A363DF82E63FB9A784CA9D368D49F62E61C1A2AA967B` | `backend/test/worker-r2.ataque.test.ts` |  |
| `B89EDE0F6AED45DFCB5E64C8909A822156CE43FD80948E72419CDCE9D4541A87` | `frontend/src/app/cache-03a-r1.ataque.test.tsx` |  |
| `E85743C0FBB8E476874A2C67334342D8D69D14153579FC1E4CCE0AE6E2B29616` | `frontend/src/app/contexto-r1.ataque.test.tsx` |  |
| `BC2BE5541006887E2A5A4A89B33046180F607D54474B0F96A73D615AFBCAC385` | `frontend/src/app/contrasena-r1.ataque.test.tsx` |  |
| `F38BCACB716D8A39ACDB3535A95603CD0D8AB02572CA57A7DF5268B01CEB6EAC` | `frontend/src/app/contrasena-r2.ataque.test.tsx` |  |
| `68FB5D092C0C8ECFCF282477EF023AAAE26F6B869656E05109DC3EFA276D842A` | `frontend/src/app/cuentas-r1.ataque.test.tsx` |  |
| `41930017715D3D6869DC7ACEFD75DE8EC3684F1F035B845ABDF8EC0F6B734DEE` | `frontend/src/app/cuentas-r2.ataque.test.tsx` |  |
| `1506C27E5F7418B5E087FD30F8809645A2FC3E2761C7249DE78F02E24AA6C7A5` | `frontend/src/app/en-espera-r1.ataque.test.tsx` |  |
| `DB48DAD405C27062621A44D3744C84CC5903892A51E5A8DF18F41383CB9C88A3` | `frontend/src/app/errores-r1.ataque.test.tsx` |  |
| `F95321E604E20B533EBF2DB3C1C6C66BA2F2D87A48F075415B766551F6EE30F4` | `frontend/src/app/fondo-r1.ataque.test.tsx` |  |
| `57CB54AFD3B79464F0DF01B88FC388CEBBEAC5657D936C4C204CBAE6034B0834` | `frontend/src/app/marco-r1.ataque.test.tsx` |  |
| `D32E1C5B5629C37D2521446D7E578CDB081DD71F5B5026E73E13C58E16D92801` | `frontend/src/app/muro-recuperar-c-r3.ataque.test.tsx` |  |
| `BEC7B7B49E056AFE514F654FCA9C562D77A090F7421057B8B03D57D4E862140A` | `frontend/src/app/muro-recuperar-c-r4.ataque.test.tsx` |  |
| `2F8056A770397C1601647277944555A48AFC4B9A2BABEB75E5898F0CC92562BB` | `frontend/src/app/muro-rutas-c-r1.ataque.test.tsx` |  |
| `0EEFED2C05D76B0790A437E9465A898A9076083B1F046F8785145CFAAD0DA379` | `frontend/src/app/registro-maestro-03b-r1.ataque.test.tsx` |  |
| `053E867A904AFA3C09EEF92CA2E03E929D9F9C93F714040856F40C7418721BBE` | `frontend/src/app/router.ataque.test.tsx` |  |
| `28B4046CB3DB0BA03338767FA614BA6F4B53650327F4E6CC3CDE4123F6F3F233` | `frontend/src/app/rutas-02c-r1.ataque.test.tsx` |  |
| `C7946F5F5D5D16D36B395ADC2AD9928ACC7FD9839875FB64532B51489756730B` | `frontend/src/app/rutas-clases-r1.ataque.test.tsx` |  |
| `F090CBD8E8C9B0AF52D4FC19547B07E9B6413F5414CC4B10862F01E29818DDDC` | `frontend/src/app/sesion-r2.ataque.test.tsx` |  |
| `FA229C216651693AFFDAC0FDDD148EC5AC26FDFB3A15ABB827F21CCBCEF4C3E1` | `frontend/src/components/layout/estatico-r1.ataque.test.ts` |  |
| `0AAA18CD70465293B6FCA6CC051B8E4AC360A838D02FEDE848C35376C3D0066C` | `frontend/src/components/layout/pie-r1.ataque.test.tsx` |  |
| `00A707429AF6B5326F9A96DEF6382823CF4A6A092AAC7E7BD7CBCB8DC9AA1D21` | `frontend/src/components/layout/pie-r2.ataque.test.tsx` |  |
| `472E1F46D0C899496AA334909B02988962AAB07B9BD29A8D7B8AF3987FAC6C76` | `frontend/src/components/layout/pie-r3.ataque.test.tsx` |  |
| `A1814D281DAFD8243989C9F9A462A4F33A86B1FB70EEEBF29E99BCB0F340D82A` | `frontend/src/components/ui/badge-03b-r1.ataque.test.ts` |  |
| `86ADAA9A093A987DAFD97E279E600211CBDF6CEF97879D16FA2D8A9D2846F8B5` | `frontend/src/features/admin/cuentas-r1.ataque.test.tsx` |  |
| `B948E9359FD3981E08B850540027F536F345A3F48D7C0749BA0C16C2C1DF1184` | `frontend/src/features/admin/cuentas-r2.ataque.test.tsx` |  |
| `72BF9AF4CE8F52A114897E038CEFB0947841A37F74074F4C5F8DEC68A71B654A` | `frontend/src/features/admin/cuentas-r3.ataque.test.tsx` |  |
| `942DF3015424AED56E83661993BA015E871CD6BE8E797920D47E8CBF0C56EAC4` | `frontend/src/features/admin/cuentas-r4.ataque.test.tsx` |  |
| `3BD26E7E3BF019D462DB4837861ED22017BBB9E9A6276720BF0DEA6C2B5B0998` | `frontend/src/features/admin/en-espera-r1.ataque.test.tsx` |  |
| `8219C864E7BDC1315E6A0F0FF1CD6F54E4710CEBDCEB8E316F4E53AACC0CFF35` | `frontend/src/features/admin/foco-r1.ataque.test.tsx` |  |
| `30F45BBA30D9348EC1587B42E84CA370274E1BF0AF0F310B8A6BBD79FA982669` | `frontend/src/features/admin/maestros-03b-r1.ataque.test.tsx` |  |
| `D477A809E55E603D3EF6C02CA43B21372B75D0947FA303F1539D48BDF32841F8` | `frontend/src/features/admin/maestros-03c-r1.ataque.test.tsx` |  |
| `3CEDA51DB8F67F40C26615FBC4CD7D082035B00F38713C6CA4C7DB58E47926C8` | `frontend/src/features/auth/enlace-r1.ataque.test.tsx` |  |
| `1F5D1147637C09DAA6FDF1384E4395EDD69DFDAB84AAE5D602A362DABD3295BD` | `frontend/src/features/auth/enlace-r2.ataque.test.tsx` |  |
| `991B115524D8DADE8D6EA2C51FB753DC8832EE410DB2161A0CE761D011CFCA4A` | `frontend/src/features/auth/invitacion-r1.ataque.test.tsx` |  |
| `25375E6678BA9B5331D53B78031BD315A8651F16CD32571E9FCEE539D07C5BA8` | `frontend/src/features/clases/alumnos-b-r1.ataque.test.tsx` |  |
| `55DC274ECA96DA4360848B88F9F2A839AC815031490AB57FF38DE074512D632C` | `frontend/src/features/clases/alumnos-b-r2.ataque.test.tsx` |  |
| `371518E4309F14201A92D29F9436A97A19801B506D45114964FBCFE3F5CD4183` | `frontend/src/features/clases/alumnos-b-r3.ataque.test.tsx` |  |
| `266D088DD727F18AF8C8A106B8D9C4DBED75753E4B1B4ABB12F3A4DF870ECB7F` | `frontend/src/features/clases/alumnos-b-r4.ataque.test.tsx` |  |
| `856CFFBD9C743F9815DAF731487E29DC5F5272545DC15820A70BAF86ECFA6527` | `frontend/src/features/clases/alumnos-b-r5.ataque.test.tsx` |  |
| `1E9A26ED86EE637E1A2E065DC05DA79CBB5048E18A020285D6B479FD290BCC9C` | `frontend/src/features/clases/archivos-d-r1.ataque.test.tsx` |  |
| `EFC07CC006E16E03BEEC69A17E08AED83657095555107B28FB1AB3EF1400E687` | `frontend/src/features/clases/archivos-d-r2.ataque.test.tsx` |  |
| `E01A46173F2820F0AF15824C88AA81805412B70248062F419DD40236C9EED7E3` | `frontend/src/features/clases/archivos-d-r3.ataque.test.tsx` |  |
| `A043F6264BF1487C4488EB3273148E905005D0DE847F388E7EFF954B089BFCB9` | `frontend/src/features/clases/cargar-mas-02c-r2.ataque.test.tsx` |  |
| `D2C0EA65FCCF53F7DFECA318920922B82924A1EE3A1E257B5F31AF1F8FDD63E3` | `frontend/src/features/clases/clases-admin-02c-r1.ataque.test.tsx` |  |
| `5F0679D8CFACC8BCE01989C04A415DC5B546625EB7DEC92F03959DE5A0F89815` | `frontend/src/features/clases/clases-r1.ataque.test.tsx` |  |
| `C7AD5EDC733E374117A9277F1C2987E84CC2930C77EB4C720CCF15CC9F5FAB45` | `frontend/src/features/clases/clases-r2.ataque.test.tsx` |  |
| `A835A11D29AEDB8F77F91E826A22C2B7CF5322FCED3F6BED0C1ACBF7C75A4E61` | `frontend/src/features/clases/clases-r3.ataque.test.tsx` |  |
| `86B04D234527ECEEFCA35B07CE89E6B7CE0B6AFE5CCDEE2F005E6A4219F0495A` | `frontend/src/features/clases/clases-r4.ataque.test.tsx` |  |
| `E76A0B75591B6D0032AEAA870441EE093C05FC13408CC47A8CB5B5883AF7A14F` | `frontend/src/features/clases/estatico-02c-r1.ataque.test.ts` |  |
| `CDD1ED8890859AE3E884822FC7074852A2173105114745D83FE9A15C1C47C626` | `frontend/src/features/clases/estatico-r1.ataque.test.ts` |  |
| `9461F0A14201BAE86A13F99003863162FCC467116FE38AC2768DCA7A747137EB` | `frontend/src/features/clases/foco-02c-r3.ataque.test.tsx` | nueva: ronda 3 de 02c |
| `0F60F1582FCE6E5EFAF9BF6856133DC30F1DC4EB9C3B7FEA19F90A330F8335B3` | `frontend/src/features/clases/inicio-sin-datos-02c-r1.ataque.test.tsx` |  |
| `7C434A0E54E70B12D4B2A3DE22FFB4DBF5F28A1CFBD2290C22E8A2B59EDF0E16` | `frontend/src/features/clases/inicio-sin-datos-r2.ataque.test.tsx` |  |
| `A4DE3A7DC35DAEDFF86FD41349EA09140213E918613603D0985C698FF41D29F7` | `frontend/src/features/clases/maestros-02c-r1.ataque.test.tsx` |  |
| `41D27CD07466255EDA02B898F474EFE036C91EA77E53061076514DECFE90E1FD` | `frontend/src/features/clases/muro-02c-r1.ataque.test.tsx` |  |
| `BF0CAB9760A82DB5761777542827F89E4DE9F3712D06E44916F698ABDA1ABBAA` | `frontend/src/features/clases/muro-c-r1.ataque.test.tsx` |  |
| `D91FCE8DFB93139D9F7941E33BA8904D92C4560B37A61737688194C9504B093E` | `frontend/src/features/clases/muro-c-r2.ataque.test.tsx` |  |
| `73523416AE3F04A4AE4DB25685E2C9A5BA8EB3DB015225DFEDC76EDF5D75958F` | `frontend/src/features/clases/muro-c-r3.ataque.test.tsx` |  |
| `216611C095304561A1A70454ED50F1443FDF76D7BE1436DC47DD9FD0FE57FD74` | `frontend/src/features/clases/ventana-02c-r2.ataque.test.tsx` | cambia: ronda 3 de 02c (T-03, arbitraje) |
| `C71CBA65DD284D7AF11CBC812B6BCF75BAA373939EDB8318E731858D9C50173F` | `frontend/src/lib/format-d-r1.ataque.test.ts` |  |
| `89DBBB70D5DC404C3D74DB5391D10855C8CB1D6B4C643B6147B3CE6FFB2637AF` | `frontend/src/lib/format-d-r2.ataque.test.ts` |  |
| `BFA7DED62F7A1402590D438A1CC51060A63FA019AD47D3EB5740E43383064A2A` | `frontend/src/lib/format-d-r3.ataque.test.ts` |  |
| `10C730348D18FF8DAE7B3623751D31122AA58560B564AD191717FA1938A6F8CE` | `frontend/src/services/apiClient.ataque.test.ts` |  |
| `7986CE1FE3EBF76714AA064FADE5BBEB855037A02EF66F6532632E8720ABC68B` | `frontend/src/styles/clases-r1.ataque.test.ts` |  |
| `B8085BCBBC7F4B6276BF3A87FB7BA0BC887953A8C6CE372354A7F3F1B5037582` | `frontend/src/styles/tokens-r1.ataque.test.ts` |  |

## CLASES-02c — Ronda 4 (cerrada, T-05)

# Reporte del Tester — CLASES-02c · corrección de T-05 (useFocoAlPasarAError) — Ronda 4, cerrada
Veredicto: **ROTO** por **T-06 (baja)**. Está dentro del alcance de T-05, así que se escala. La corrección de T-05 resiste en todo lo demás, en los cuatro usos del gancho: una primera carga que falla ya no mueve el foco, ni en una vista que nace en error.
Verificación propia: lint `cd frontend; npm run lint` código 0 (última línea `> tsc -b`) · test `cd frontend; npm test`, una corrida completa: `Tests  3 failed | 1699 passed (1702)`; los 3 rojos son los de T-06.

### Precondiciones
- **Fecha y base:** 2026-10-05; rama `feat/clases-02`; base `<K2b>` = `7544fb9`. Sin cambios en `backend/` ni `shared/`; no corrí el backend.
- **V-01:** las 132 `*.ataque` contra la tabla de la ronda 3 de 02c: **132 de 132 iguales**, ninguna sin rastrear antes de empezar.
- **Procesos y suites:** una sola suite; nadie más corrió pruebas; no toqué ningún proceso del humano.
- **Archivo nuevo (1, mío):** `frontend/src/features/clases/foco-02c-r4.ataque.test.tsx` (30 casos). Ninguna otra `*.ataque`, prueba normal ni archivo de producción cambió. Prettier solo sobre ese archivo, desde `frontend/`.

### Casos (contra `useFocoAlPasarAError(esError, tieneDatos, destino)`)
Seis casos por cada uno de los cuatro usos: `ClaseLayout`, `MaestrosDeClaseView` montada sola, la lista del muro (`MuroView`) y `/admin/clases` (`ClasesAdminView`). Son 24 casos, todos en verde:
1. Primera carga que falla, sin foco en la página: el foco se queda en `<body>`.
2. Primera carga que falla, con el foco fuera de la vista: no se mueve.
3. Error ya en la caché al montar, sin datos (`prefetchQuery` que falla): el foco se queda en `<body>`.
4. Recarga que falla tras tener datos:
   - con el foco en un control de la vista («Copiar código», «Quitar Luis Pérez», «Ver comentarios (0)» o «Abrir Clase 1»), el foco va al destino del error (el contenedor con `tabindex="-1"`, el `h2` «Publicaciones» o el `h1` «Clases»);
   - con el foco ya movido por la persona fuera de la vista, no se mueve.
5. Dos fallos seguidos: el segundo no mueve el foco, ni desde el destino ni desde `<body>`.
6. Éxito, error, éxito, error: en cada paso a error con el foco en un control de la vista, el foco va al destino.

Además, 6 casos de cambio de `claseId` con el gancho montado (3 usos × 2; `/admin/clases` no tiene `claseId`):
- con el foco fuera de la vista, 3 casos en verde;
- con el foco en `<body>`, 3 casos en rojo (T-06).

### Hallazgos

#### T-06 — Al cambiar de clase con el gancho montado, la primera carga fallida de la clase nueva mueve el foco desde <body>
Severidad: baja
Prueba: `frontend/src/features/clases/foco-02c-r4.ataque.test.tsx` › «cambio de claseId con el gancho montado (ClaseLayout | MaestrosDeClaseView sola | lista del muro)» › «A con datos, navegar a B que falla en su primera carga con el foco en <body>: el foco se queda en <body>» (3 casos).
Reproducción:
1. Se monta la clase A, que responde con datos.
2. El foco queda en `<body>`. Pasa, por ejemplo, si el control enfocado estaba en el contenido de A y desapareció con el «Cargando» de B.
3. `router.navigate` lleva a la clase B, que responde `500` en su primera carga.
4. `ConClaseDeLaRuta` pasa el `claseId` nuevo a la misma instancia, sin `key`, así que el `useRef` `huboDatos` del gancho sigue en `true` por la clase A. La consulta de B pasa de pendiente a error y el gancho mueve el foco.
Esperado / Obtenido: para B es una primera carga, que T-05 ya no deja mover. Se esperaba `document.activeElement === document.body` y lo obtenido es el contenedor del error de `ClaseLayout` (`<div tabindex="-1">`), el de `MaestrosDeClaseView` y el `h2` «Publicaciones» del muro.
Por qué baja: no roba un foco que la persona eligió (con el foco fuera de la vista, los 3 casos hermanos pasan). En 02c no hay un enlace de una clase a otra dentro de la clase: solo se llega así con el historial o con un `navigate` del código. La barra lateral de 02d sí enlazará una clase con otra.
Requisito o regla violada: el remedio de T-05 aceptado por el manager («solo mueve el foco si la consulta … tuvo datos alguna vez»: aquí, la consulta de B nunca los tuvo, y la memoria es la de A) y la decisión del humano, «mover el foco solo tras una recarga».
Hermanos: los tres usos con `claseId` (`ClaseLayout`, `MaestrosDeClaseView` y la lista del muro). En `ClasesAdminView` no aplica, porque no tiene `claseId`. Remedio posible, sin probar: reiniciar la memoria del gancho al cambiar la clave de la consulta, o dar a la vista una `key={claseId}`.

### Observaciones (con destino, fuera del alcance de esta ronda)
- **O-13 (destino: 02d, junto con la barra lateral):** la lista de clases de la barra lateral de 02d será el primer camino real de una clase a otra con `ClaseLayout` montado. Conviene que la ronda 0 de 02d la incluya entre los puntos de ataque de T-06 (o de su remedio).

### Corrida (una sola)
**Comando:**
```
cd frontend; npm test -- --reporter=default --reporter=json --outputFile.json=<scratchpad>/front-02c-r4-1.json > <scratchpad>/front-02c-r4-1.txt 2>&1
```
Corrió de 22:03:09Z a 22:04:24Z, con código 1: `Test Files  1 failed | 116 passed (117)` · `Tests  3 failed | 1699 passed (1702)` · `Duration  71.45s`.
- **Última línea literal:** `npm error command C:\WINDOWS\system32\cmd.exe /d /s /c vitest run --reporter=default --reporter=json --outputFile.json=C:/Users/Carlos/AppData/Local/Temp/claude/c--Users-Carlos-Documents-Proyecto-PlataformaEducativa/***/scratchpad/front-02c-r4-1.json`.
- **Rojos (3, todos de T-06):** en `src/features/clases/foco-02c-r4.ataque.test.tsx`, los tres «A con datos, navegar a B…» con el foco en `<body>`. Los valores son `expected <div tabindex="-1" …> to be <body>…` (ClaseLayout), `expected <div tabindex="-1">… to be <body>…` (MaestrosDeClaseView) y `expected <h2 tabindex="-1" class="sr-only"> to be <body>…` (muro). Las 132 `*.ataque` anteriores, en verde.
- **Casos lentos (umbral de 5 s):** ninguno llega. Los cinco más lentos:

  | Caso | Duración |
  |---|---|
  | `alumnos-b-r2` «quitar la primera fila de la página 2…» | 2909 ms |
  | `alumnos-b-r5` «alumnos, teclado: «Ver más»…» | 2235 ms |
  | `alumnos-b-r2` «quitar la última fila de todas…» | 2166 ms |
  | `muro-recuperar-c-r4` «primer render…» | 2118 ms |
  | `alumnos-b-r3` «con el foco en «Ver más alumnos»…» | 1971 ms |

### Conteos
- `cd frontend; npx vitest list > <scratchpad>/front-list-02c-r4.txt`: **1702 casos**; `--filesOnly`: **117 archivos**, de ellos **66** `*.ataque` del frontend, con **1105** casos.
- Diferencia con lo que aceptó el manager (116 / 1672): **+1 archivo y +30 casos**, los de `foco-02c-r4` (`grep -c "02c-r4.ataque"`: 30).
- `*.ataque`: **133** (67 del backend y 66 del frontend).

### Tabla de SHA-256 de las 133 `*.ataque` al cierre de la ronda 4 de 02c (base de V-01 del cierre de 02c y de 02d; 1 nueva, ninguna existente cambia)
| SHA-256 | Archivo | Cambio |
|---|---|---|
| `BCCE2CAE771F97957D8691BEF7FFF4EC42412DAAEABF726AEB0AFC59F6F25671` | `backend/src/config/correo.ataque.test.ts` |  |
| `DCB78D222544E8DC4FBECE59468F555B04ABE971B70016E9BB17FCAE3E958580` | `backend/src/config/env.ataque.test.ts` |  |
| `71E7F049447D2D1ECEDD897C55EA0B6D31221753F0A7E7473C7AC6E8667F0A95` | `backend/src/config/logger.ataque.test.ts` |  |
| `91F620C1A27778EEBC2BED5EEC1BC9B0E3FE1199B32ED00F9DD910011D6A1805` | `backend/src/core/clases/codigo-r1.ataque.test.ts` |  |
| `262691F5786AD63B2393D0BA5FF97538F6DACF43343BED019AD23C12A07D8686` | `backend/src/core/clases/codigo-r2.ataque.test.ts` |  |
| `E769CBFCC3A83A64B51C6437F80684640A7C928AD6B8C5C1671FDFF005D7B734` | `backend/src/workers/ritmo-03c-r1.ataque.test.ts` |  |
| `36C23511D5BFD24F2BB999BA34B00C193C8DD0FD0782F29F4E0BB00631E2FBCA` | `backend/test/admin-muro-02b-r1.ataque.test.ts` |  |
| `388AD0E585639B8C3E0E0A6657FB42C1B9CB83DB721C4863C4FA19E0BE42EC85` | `backend/test/admin-unico.ataque.test.ts` |  |
| `D2CC28B62BF988AE14BA975A9BC8D534AEC0EEBCE30DA93D7DED9A26026B0857` | `backend/test/alumnos-b-r1.ataque.test.ts` |  |
| `00346D471355ABC7971B921649E7192B8987FE27912C00CB7E41AEF2065369E9` | `backend/test/alumnos-b-r2.ataque.test.ts` |  |
| `FC11AB4B914D4A88612953F82DB354E2B9CEA9BEF86E24321EF7E031F3AC3837` | `backend/test/alumnos-b-r3.ataque.test.ts` |  |
| `441A766A94E7D9B26807790402E06ED94D4CC378D8F6ECF0BCCC3259C7FF55FB` | `backend/test/api-real.ataque.test.ts` |  |
| `D9E1DE5B1BD43F54CF3A4DCF153D1EEABDC36B4DEC02FBEB9D8A0239F298DFE9` | `backend/test/archivos-d-r1.ataque.test.ts` |  |
| `1637EB447CD12AC5BDDDC7634980DBC10A25CBAD5DE01BF6C09F40ED930FF1A9` | `backend/test/archivos-d-r2.ataque.test.ts` |  |
| `42BB7BF3086230C6EDC65AB73976AC8A801956336561AADBEE65CC3B40EB8612` | `backend/test/arquitectura-cuentas-r1.ataque.test.ts` |  |
| `38ADB0984744A0810287711F57BA0498287D0BC96344B8948BA1C490CA807716` | `backend/test/arranque-r1.ataque.test.ts` |  |
| `2C83D82D10BDD9B7A969768774D75B18B7A71A594BBAAC5FAE36A0E134D2336C` | `backend/test/auth-login.ataque.test.ts` |  |
| `73D3A2AE708A0EF676547A8094115B1419423057378387269BC3EADB34C7724E` | `backend/test/auth-registro.ataque.test.ts` |  |
| `6F557E8E860BCE6374671E90086E9C14B1861A308B6FBB434564612647892713` | `backend/test/autoria-02b-r1.ataque.test.ts` |  |
| `95BBA9BAC44366AD5A361E93DD2F278CB0A1CC889FA479049ACC7B45A9A5E71B` | `backend/test/clases-r1.ataque.test.ts` |  |
| `A87817D56C236C0BA3597214CAC23B10483BBC28AE44800C592ED5CE2EF97F38` | `backend/test/clases-r2.ataque.test.ts` |  |
| `72DE7D8AF3D3F772ABC19DB065F6E418F6EB76CE78D87FE6EBB51335FC99825A` | `backend/test/clases-r3.ataque.test.ts` |  |
| `BE97C4E48AC9551BED1D01552E90AB8CDF085CF928AE6C8C3D81809E35F7CE62` | `backend/test/clases-r4.ataque.test.ts` |  |
| `000EC9008C73D25121C82A46F5EA0F67E6C8C387CB04E361EF82812B57956098` | `backend/test/concurrencia-02a-r1.ataque.test.ts` |  |
| `530546B4D70A2B9AD36F98F37E2AF45480E81A1101EE3516D15426F78350BF82` | `backend/test/cuentas-03a-r1.ataque.test.ts` |  |
| `6303DDC170545F616C66773C3F5475CB3BE1FEA9347D8059354D6ADE8D676C16` | `backend/test/cuentas-r1.ataque.test.ts` |  |
| `3A4E81C111B8EEB7DF065804AA85062FA3FC607F0147149B71AC21C14E7818D9` | `backend/test/cuentas-r2.ataque.test.ts` |  |
| `F54F79F7B2A83E95FE440053CCAF15CB3EBB01CE5DFD4C6655E22159A5FD7E6B` | `backend/test/cuentas-r3.ataque.test.ts` |  |
| `A2F9BFF596330A7D55D1CA9D47197FC831EB132F52C759610E2D667895C3332F` | `backend/test/cuerpos-02a-r2.ataque.test.ts` |  |
| `D7A9DA854CE8AB8AD8D2437DB2E8C2A642A777EA3261A6B038DA28BE022DF848` | `backend/test/enlaces-03b-r1.ataque.test.ts` |  |
| `DC1B7EE7EA58966F5DB33CCB4581885A9669DEA2263954AE46D17A83E1EF6EAF` | `backend/test/enlaces-03b-r2.ataque.test.ts` |  |
| `B051B1986496E35E3E306C4C6BC306A763542BCA4B350574D0C02E2C484DEB35` | `backend/test/enlaces-ch-r2.ataque.test.ts` |  |
| `D28CC4DE621A680E6B54B2BFF889700300D558EC7849717584518D2F03EC8CAE` | `backend/test/entorno-ch-r1.ataque.test.ts` |  |
| `BA1AC9B17CC9BF747522BD4EC8B87DF436008482E643B18EEA8E9A8C041C59B3` | `backend/test/formada-ch-r1.ataque.test.ts` |  |
| `EC9602D5F109B45A6D428E708D9B6CDD37A7509A6FF9031FA6FD8A2DA0E25E9B` | `backend/test/gestion-02a-r1.ataque.test.ts` |  |
| `5F4133F949D2F337A8F63B75CF82CB77114DB7812D67C1960105F5000C31A326` | `backend/test/guarda-ch-r1.ataque.test.ts` |  |
| `7A7DAC6D87EDF81059FCFF9C07471AAF49D690EC159BE4B9FD4AA32B0909A215` | `backend/test/guarda-ch-r2.ataque.test.ts` |  |
| `610EE44E5D0BCEA46EB4E3645F9ADF1998A76947A25AF7E3F8248EA3A633DF79` | `backend/test/guarda-ch-r3.ataque.test.ts` |  |
| `E5D149F3AC52B726E1FE08908249706341330F88EAA6674B9A9AC67B98B1E864` | `backend/test/guarda-clase-r1.ataque.test.ts` |  |
| `C979D2C9C420A2177FA6EBDDB78EB2CE84D5F043B94270F690916A6FC75D6F8F` | `backend/test/guarda-clase-r2.ataque.test.ts` |  |
| `20982E2B98F1B162146A211923F3D5EC19D4E170C4AA3A5BFC6F82C3B6173AAD` | `backend/test/guarda-r2.ataque.test.ts` |  |
| `A8B79D5AD98270BE3747F493865708A78BB73ADD08D832584DB4464C3582777A` | `backend/test/intentos-r2.ataque.test.ts` |  |
| `2619B44EEA3370494C95AC128FCFD9E3FFC20D1581A19F549BF371F603A11D7D` | `backend/test/invitacion-flujo-03a-r2.ataque.test.ts` |  |
| `704155928183AEC193AE7E157B86B3E9361D2B63C7A47BE1ED859605FAB4FFA6` | `backend/test/invitacion-masiva-03c-r1.ataque.test.ts` |  |
| `DD9B7454E8786BF0B833D265900CCAECF595808CEBC8E9A77C9AEF15298A1038` | `backend/test/invitacion-masiva-03c-r2.ataque.test.ts` |  |
| `F9F9EC59EC8D1A5CCB180522798140C45604440F48EDCD68A3E02863D90AE347` | `backend/test/logs-02a-r1.ataque.test.ts` |  |
| `A2006C163D9E6CD3E4A2A773D1501826DAF3C8E7BB184D205BFC6442318FB59C` | `backend/test/logs-02b-r1.ataque.test.ts` |  |
| `BD8B303C434EFEC0785E0691D31D6F6E87DBF3305F50FA27CCE0F78CBB251E3A` | `backend/test/logs-03a-r1.ataque.test.ts` |  |
| `B58D5D013658433FE5839634E2DB5A31B8D2B8F69587BC36958752D3CD33BBF7` | `backend/test/logs-03b-r1.ataque.test.ts` |  |
| `0E4ABF3BC5D92FA0C380805453190703862567930DD74B9E7FCC1809564D181F` | `backend/test/logs-03c-r1.ataque.test.ts` |  |
| `1E775A19682F3A5995D7C035BCC810A36BF50C22045B6FFBFC5A98B821255DB0` | `backend/test/logs-archivos-d-r1.ataque.test.ts` |  |
| `E9CE866D511E3EE6029015B74E20B4D342A60BE99B3AAC97E86F00283A3C77F1` | `backend/test/logs-archivos-d-r3.ataque.test.ts` |  |
| `E008935B107752D203F6423B2F1C9E0F5A4339F0A77154746BF262CECB90351A` | `backend/test/logs-cuentas-r1.ataque.test.ts` |  |
| `690E30ED39111C0A074FC159015967CD9F0FDC24D9A340E6A0D7BE4B980A9D45` | `backend/test/logs-muro-c-r1.ataque.test.ts` |  |
| `0809C60700E26183E7771B4B1A40B05CBF554C2ED7929190CF4D89A52722E551` | `backend/test/logs-muro-c-r2.ataque.test.ts` |  |
| `5AF3909E4B7CA485E78979567872EA78BF41E6D679B9EC2C761EAA0B250DF689` | `backend/test/logs-r2.ataque.test.ts` |  |
| `AE66FBCF60E8F66336E77C1055893E60CB85A01BC746B89C68A4D2C70C807AF1` | `backend/test/muro-c-r1.ataque.test.ts` |  |
| `7825CFC9B484DF740FA0E9562A195D1BBCAF4CAF72EA55FA847B5394AB96C125` | `backend/test/muro-c-r2.ataque.test.ts` |  |
| `8B733B86FC6D54ECE008389A59793FAE4EC4A65146EB37215E900E50A5337D46` | `backend/test/nombres-guarda-r3.ataque.test.ts` |  |
| `00A6EB6F7CCD7D8790C356BEFCC96DDFDA6EACCE0BE53DE255CFE3626D8F2ADB` | `backend/test/nombres-tokens-r2.ataque.test.ts` |  |
| `80B5A848F69B429E7DADEC86C07BEC1D3E3EED8A042EFBA41CE912DED39E7BAB` | `backend/test/nowait-ch-r1.ataque.test.ts` |  |
| `6F2ABC2CEFD77D74CD1E3ABBDCE9C41BB53D00BD4D8E5BA7E496C4441C2697E5` | `backend/test/servicio-ocupado-ch-r1.ataque.test.ts` |  |
| `3B2D94ABCCBEDD6FB53CF666AAD06ADF431A0DB9A09264F05D8ADF6963CBD0AE` | `backend/test/sesiones-y-cadena.ataque.test.ts` |  |
| `70AC720F2E7FCADEE5BBCB6414887AB08129DEA7CD91DF012046953B1584E8B6` | `backend/test/sexto-paso-02a-r1.ataque.test.ts` |  |
| `F09E9A0038C47D1A2223376A0AF260BAF573F0C45BF770201C48C9E30296F04B` | `backend/test/worker-03c-r1.ataque.test.ts` |  |
| `9F60F9D65D52D2021A1EB04E9F01D3CC68F22744C845BF93D6621AA4FE9713A8` | `backend/test/worker-r1.ataque.test.ts` |  |
| `77D11BD85F202A9EEC92A363DF82E63FB9A784CA9D368D49F62E61C1A2AA967B` | `backend/test/worker-r2.ataque.test.ts` |  |
| `B89EDE0F6AED45DFCB5E64C8909A822156CE43FD80948E72419CDCE9D4541A87` | `frontend/src/app/cache-03a-r1.ataque.test.tsx` |  |
| `E85743C0FBB8E476874A2C67334342D8D69D14153579FC1E4CCE0AE6E2B29616` | `frontend/src/app/contexto-r1.ataque.test.tsx` |  |
| `BC2BE5541006887E2A5A4A89B33046180F607D54474B0F96A73D615AFBCAC385` | `frontend/src/app/contrasena-r1.ataque.test.tsx` |  |
| `F38BCACB716D8A39ACDB3535A95603CD0D8AB02572CA57A7DF5268B01CEB6EAC` | `frontend/src/app/contrasena-r2.ataque.test.tsx` |  |
| `68FB5D092C0C8ECFCF282477EF023AAAE26F6B869656E05109DC3EFA276D842A` | `frontend/src/app/cuentas-r1.ataque.test.tsx` |  |
| `41930017715D3D6869DC7ACEFD75DE8EC3684F1F035B845ABDF8EC0F6B734DEE` | `frontend/src/app/cuentas-r2.ataque.test.tsx` |  |
| `1506C27E5F7418B5E087FD30F8809645A2FC3E2761C7249DE78F02E24AA6C7A5` | `frontend/src/app/en-espera-r1.ataque.test.tsx` |  |
| `DB48DAD405C27062621A44D3744C84CC5903892A51E5A8DF18F41383CB9C88A3` | `frontend/src/app/errores-r1.ataque.test.tsx` |  |
| `F95321E604E20B533EBF2DB3C1C6C66BA2F2D87A48F075415B766551F6EE30F4` | `frontend/src/app/fondo-r1.ataque.test.tsx` |  |
| `57CB54AFD3B79464F0DF01B88FC388CEBBEAC5657D936C4C204CBAE6034B0834` | `frontend/src/app/marco-r1.ataque.test.tsx` |  |
| `D32E1C5B5629C37D2521446D7E578CDB081DD71F5B5026E73E13C58E16D92801` | `frontend/src/app/muro-recuperar-c-r3.ataque.test.tsx` |  |
| `BEC7B7B49E056AFE514F654FCA9C562D77A090F7421057B8B03D57D4E862140A` | `frontend/src/app/muro-recuperar-c-r4.ataque.test.tsx` |  |
| `2F8056A770397C1601647277944555A48AFC4B9A2BABEB75E5898F0CC92562BB` | `frontend/src/app/muro-rutas-c-r1.ataque.test.tsx` |  |
| `0EEFED2C05D76B0790A437E9465A898A9076083B1F046F8785145CFAAD0DA379` | `frontend/src/app/registro-maestro-03b-r1.ataque.test.tsx` |  |
| `053E867A904AFA3C09EEF92CA2E03E929D9F9C93F714040856F40C7418721BBE` | `frontend/src/app/router.ataque.test.tsx` |  |
| `28B4046CB3DB0BA03338767FA614BA6F4B53650327F4E6CC3CDE4123F6F3F233` | `frontend/src/app/rutas-02c-r1.ataque.test.tsx` |  |
| `C7946F5F5D5D16D36B395ADC2AD9928ACC7FD9839875FB64532B51489756730B` | `frontend/src/app/rutas-clases-r1.ataque.test.tsx` |  |
| `F090CBD8E8C9B0AF52D4FC19547B07E9B6413F5414CC4B10862F01E29818DDDC` | `frontend/src/app/sesion-r2.ataque.test.tsx` |  |
| `FA229C216651693AFFDAC0FDDD148EC5AC26FDFB3A15ABB827F21CCBCEF4C3E1` | `frontend/src/components/layout/estatico-r1.ataque.test.ts` |  |
| `0AAA18CD70465293B6FCA6CC051B8E4AC360A838D02FEDE848C35376C3D0066C` | `frontend/src/components/layout/pie-r1.ataque.test.tsx` |  |
| `00A707429AF6B5326F9A96DEF6382823CF4A6A092AAC7E7BD7CBCB8DC9AA1D21` | `frontend/src/components/layout/pie-r2.ataque.test.tsx` |  |
| `472E1F46D0C899496AA334909B02988962AAB07B9BD29A8D7B8AF3987FAC6C76` | `frontend/src/components/layout/pie-r3.ataque.test.tsx` |  |
| `A1814D281DAFD8243989C9F9A462A4F33A86B1FB70EEEBF29E99BCB0F340D82A` | `frontend/src/components/ui/badge-03b-r1.ataque.test.ts` |  |
| `86ADAA9A093A987DAFD97E279E600211CBDF6CEF97879D16FA2D8A9D2846F8B5` | `frontend/src/features/admin/cuentas-r1.ataque.test.tsx` |  |
| `B948E9359FD3981E08B850540027F536F345A3F48D7C0749BA0C16C2C1DF1184` | `frontend/src/features/admin/cuentas-r2.ataque.test.tsx` |  |
| `72BF9AF4CE8F52A114897E038CEFB0947841A37F74074F4C5F8DEC68A71B654A` | `frontend/src/features/admin/cuentas-r3.ataque.test.tsx` |  |
| `942DF3015424AED56E83661993BA015E871CD6BE8E797920D47E8CBF0C56EAC4` | `frontend/src/features/admin/cuentas-r4.ataque.test.tsx` |  |
| `3BD26E7E3BF019D462DB4837861ED22017BBB9E9A6276720BF0DEA6C2B5B0998` | `frontend/src/features/admin/en-espera-r1.ataque.test.tsx` |  |
| `8219C864E7BDC1315E6A0F0FF1CD6F54E4710CEBDCEB8E316F4E53AACC0CFF35` | `frontend/src/features/admin/foco-r1.ataque.test.tsx` |  |
| `30F45BBA30D9348EC1587B42E84CA370274E1BF0AF0F310B8A6BBD79FA982669` | `frontend/src/features/admin/maestros-03b-r1.ataque.test.tsx` |  |
| `D477A809E55E603D3EF6C02CA43B21372B75D0947FA303F1539D48BDF32841F8` | `frontend/src/features/admin/maestros-03c-r1.ataque.test.tsx` |  |
| `3CEDA51DB8F67F40C26615FBC4CD7D082035B00F38713C6CA4C7DB58E47926C8` | `frontend/src/features/auth/enlace-r1.ataque.test.tsx` |  |
| `1F5D1147637C09DAA6FDF1384E4395EDD69DFDAB84AAE5D602A362DABD3295BD` | `frontend/src/features/auth/enlace-r2.ataque.test.tsx` |  |
| `991B115524D8DADE8D6EA2C51FB753DC8832EE410DB2161A0CE761D011CFCA4A` | `frontend/src/features/auth/invitacion-r1.ataque.test.tsx` |  |
| `25375E6678BA9B5331D53B78031BD315A8651F16CD32571E9FCEE539D07C5BA8` | `frontend/src/features/clases/alumnos-b-r1.ataque.test.tsx` |  |
| `55DC274ECA96DA4360848B88F9F2A839AC815031490AB57FF38DE074512D632C` | `frontend/src/features/clases/alumnos-b-r2.ataque.test.tsx` |  |
| `371518E4309F14201A92D29F9436A97A19801B506D45114964FBCFE3F5CD4183` | `frontend/src/features/clases/alumnos-b-r3.ataque.test.tsx` |  |
| `266D088DD727F18AF8C8A106B8D9C4DBED75753E4B1B4ABB12F3A4DF870ECB7F` | `frontend/src/features/clases/alumnos-b-r4.ataque.test.tsx` |  |
| `856CFFBD9C743F9815DAF731487E29DC5F5272545DC15820A70BAF86ECFA6527` | `frontend/src/features/clases/alumnos-b-r5.ataque.test.tsx` |  |
| `1E9A26ED86EE637E1A2E065DC05DA79CBB5048E18A020285D6B479FD290BCC9C` | `frontend/src/features/clases/archivos-d-r1.ataque.test.tsx` |  |
| `EFC07CC006E16E03BEEC69A17E08AED83657095555107B28FB1AB3EF1400E687` | `frontend/src/features/clases/archivos-d-r2.ataque.test.tsx` |  |
| `E01A46173F2820F0AF15824C88AA81805412B70248062F419DD40236C9EED7E3` | `frontend/src/features/clases/archivos-d-r3.ataque.test.tsx` |  |
| `A043F6264BF1487C4488EB3273148E905005D0DE847F388E7EFF954B089BFCB9` | `frontend/src/features/clases/cargar-mas-02c-r2.ataque.test.tsx` |  |
| `D2C0EA65FCCF53F7DFECA318920922B82924A1EE3A1E257B5F31AF1F8FDD63E3` | `frontend/src/features/clases/clases-admin-02c-r1.ataque.test.tsx` |  |
| `5F0679D8CFACC8BCE01989C04A415DC5B546625EB7DEC92F03959DE5A0F89815` | `frontend/src/features/clases/clases-r1.ataque.test.tsx` |  |
| `C7AD5EDC733E374117A9277F1C2987E84CC2930C77EB4C720CCF15CC9F5FAB45` | `frontend/src/features/clases/clases-r2.ataque.test.tsx` |  |
| `A835A11D29AEDB8F77F91E826A22C2B7CF5322FCED3F6BED0C1ACBF7C75A4E61` | `frontend/src/features/clases/clases-r3.ataque.test.tsx` |  |
| `86B04D234527ECEEFCA35B07CE89E6B7CE0B6AFE5CCDEE2F005E6A4219F0495A` | `frontend/src/features/clases/clases-r4.ataque.test.tsx` |  |
| `E76A0B75591B6D0032AEAA870441EE093C05FC13408CC47A8CB5B5883AF7A14F` | `frontend/src/features/clases/estatico-02c-r1.ataque.test.ts` |  |
| `CDD1ED8890859AE3E884822FC7074852A2173105114745D83FE9A15C1C47C626` | `frontend/src/features/clases/estatico-r1.ataque.test.ts` |  |
| `9461F0A14201BAE86A13F99003863162FCC467116FE38AC2768DCA7A747137EB` | `frontend/src/features/clases/foco-02c-r3.ataque.test.tsx` |  |
| `36437C733C0908F871CF7E7CAD7689A56C77FED6B412572143A42BFE11C1E38F` | `frontend/src/features/clases/foco-02c-r4.ataque.test.tsx` | nueva: ronda 4 de 02c |
| `0F60F1582FCE6E5EFAF9BF6856133DC30F1DC4EB9C3B7FEA19F90A330F8335B3` | `frontend/src/features/clases/inicio-sin-datos-02c-r1.ataque.test.tsx` |  |
| `7C434A0E54E70B12D4B2A3DE22FFB4DBF5F28A1CFBD2290C22E8A2B59EDF0E16` | `frontend/src/features/clases/inicio-sin-datos-r2.ataque.test.tsx` |  |
| `A4DE3A7DC35DAEDFF86FD41349EA09140213E918613603D0985C698FF41D29F7` | `frontend/src/features/clases/maestros-02c-r1.ataque.test.tsx` |  |
| `41D27CD07466255EDA02B898F474EFE036C91EA77E53061076514DECFE90E1FD` | `frontend/src/features/clases/muro-02c-r1.ataque.test.tsx` |  |
| `BF0CAB9760A82DB5761777542827F89E4DE9F3712D06E44916F698ABDA1ABBAA` | `frontend/src/features/clases/muro-c-r1.ataque.test.tsx` |  |
| `D91FCE8DFB93139D9F7941E33BA8904D92C4560B37A61737688194C9504B093E` | `frontend/src/features/clases/muro-c-r2.ataque.test.tsx` |  |
| `73523416AE3F04A4AE4DB25685E2C9A5BA8EB3DB015225DFEDC76EDF5D75958F` | `frontend/src/features/clases/muro-c-r3.ataque.test.tsx` |  |
| `216611C095304561A1A70454ED50F1443FDF76D7BE1436DC47DD9FD0FE57FD74` | `frontend/src/features/clases/ventana-02c-r2.ataque.test.tsx` |  |
| `C71CBA65DD284D7AF11CBC812B6BCF75BAA373939EDB8318E731858D9C50173F` | `frontend/src/lib/format-d-r1.ataque.test.ts` |  |
| `89DBBB70D5DC404C3D74DB5391D10855C8CB1D6B4C643B6147B3CE6FFB2637AF` | `frontend/src/lib/format-d-r2.ataque.test.ts` |  |
| `BFA7DED62F7A1402590D438A1CC51060A63FA019AD47D3EB5740E43383064A2A` | `frontend/src/lib/format-d-r3.ataque.test.ts` |  |
| `10C730348D18FF8DAE7B3623751D31122AA58560B564AD191717FA1938A6F8CE` | `frontend/src/services/apiClient.ataque.test.ts` |  |
| `7986CE1FE3EBF76714AA064FADE5BBEB855037A02EF66F6532632E8720ABC68B` | `frontend/src/styles/clases-r1.ataque.test.ts` |  |
| `B8085BCBBC7F4B6276BF3A87FB7BA0BC887953A8C6CE372354A7F3F1B5037582` | `frontend/src/styles/tokens-r1.ataque.test.ts` |  |

## CLASES-02c — Ronda 5 (cerrada, T-06)

# Reporte del Tester — CLASES-02c · corrección de T-06 (reinicio por clave en useFocoAlPasarAError) — Ronda 5, cerrada
Veredicto: **RESISTE.** No hay hallazgos en el alcance de T-06.
Verificación propia: lint `cd frontend; npm run lint` código 0 (última línea `> tsc -b`) · test `cd frontend; npm test`, una corrida completa: `Test Files  118 passed (118)` · `Tests  1725 passed (1725)`.

### Precondiciones
- **Fecha y base:** 2026-10-05; rama `feat/clases-02`; base `<K2b>` = `7544fb9`. Sin cambios en `backend/` ni `shared/`; no corrí el backend.
- **V-01:** las 133 `*.ataque` contra la tabla de la ronda 4 de 02c: **133 de 133 iguales**, ninguna sin rastrear antes de empezar.
- **Procesos y suites:** una sola suite; nadie más corrió pruebas; no toqué ningún proceso del humano.
- **Archivo nuevo (1, mío):** `frontend/src/features/clases/foco-02c-r5.ataque.test.tsx` (23 casos). Ninguna otra `*.ataque`, prueba normal ni archivo de producción cambió. Prettier solo sobre ese archivo, desde `frontend/`.

### Casos (contra `useFocoAlPasarAError(esError, tieneDatos, clave, destino)`)
Siete casos por cada uno de los tres usos con `claseId` (`ClaseLayout`, `MaestrosDeClaseView` sola y la lista del muro): 21 casos, todos en verde.
1. De A con datos a B cuya primera carga falla, con el foco en `<body>`: no se mueve.
2. Lo mismo con el foco puesto fuera de la vista: no se mueve.
3. De A a B con datos en caché:
   - el cambio de clave no mueve el foco;
   - una recarga fallida de B, con el foco en un control de la vista, lo lleva al destino del error;
   - tras recuperarse B, una nueva recarga fallida con el foco puesto fuera no lo mueve.
4. De A en error a B en error:
   - si A falló en su primera carga, el foco se queda en `<body>`;
   - si A tuvo datos y su recarga falló (el foco fue al destino), el cambio a B, que falla, no vuelve a mover el foco.
5. A → B → A, con A en caché: la vuelta no mueve el foco, y la recarga fallida de A después lo lleva al destino si se perdió.
6. Cambios rápidos con peticiones en vuelo (A → B → C → A, con B y C retenidas y fallando al llegar): el foco no se mueve y A sigue con sus datos, sin error.
7. El render del cambio de clave no mueve el foco, aunque la clase nueva ya esté en la caché en error con datos viejos (`status: "error"` antes de montarla).

Además, en `ClaseLayout` y `MaestrosDeClaseView`, con el foco en un control de A que desaparece al cambiar, la primera carga fallida de B no lleva el foco al destino: queda en `<body>` (2 casos, en verde).

En `ClasesAdminView`, la clave constante `"clases-admin"` no altera T-04 ni T-05: los casos de `/admin/clases` de `foco-02c-r3` y `foco-02c-r4` siguen en verde (primera carga, error en caché, recarga fallida con y sin foco movido, dos fallos y éxito-error-éxito-error).

### Observaciones (con destino, fuera del alcance de T-06)
- **O-14 (destino: 02d, con la barra lateral):** en el muro, con el foco en un control de una publicación de A, el cambio a B lleva el foco al `h2` «Publicaciones». No lo hace el gancho: lo hace la regla de §7.14 de CLASES-c para la fila enfocada que desaparece (`useFilaEnFoco` y el efecto de `muro-view.tsx`), que trata el cambio de clase como si la publicación se hubiera borrado. El foco no cae en `<body>` y no es un error visible, pero en 02d, cuando la barra lateral enlace clases, conviene decidir si el cambio de clase debe tratarse así. Hermanos: las listas con `useFilaEnFoco` (comentarios, roster, buscadores).

### Corrida (una sola)
**Comando:**
```
cd frontend; npm test -- --reporter=default --reporter=json --outputFile.json=<scratchpad>/front-02c-r5-1.json > <scratchpad>/front-02c-r5-1.txt 2>&1
```
Corrió de 22:23:35Z a 22:24:55Z, con código 0: `Test Files  118 passed (118)` · `Tests  1725 passed (1725)` · `Duration  76.88s`.
- **Última línea literal:** `JSON report written to C:/Users/Carlos/AppData/Local/Temp/claude/c--Users-Carlos-Documents-Proyecto-PlataformaEducativa/0674b697-54d2-4eb4-ad9a-7234f1426d63/scratchpad/front-02c-r5-1.json`.
- **Rojos:** ninguno.
- **Casos lentos (umbral de 5 s):** ninguno llega. Los cinco más lentos:

  | Caso | Duración |
  |---|---|
  | `alumnos-b-r2` «quitar la primera fila de la página 2…» | 4100 ms |
  | `alumnos-b-r2` «quitar la última fila de todas…» | 3316 ms |
  | `alumnos-b-r2` «quitar la última fila de la página 1…» | 3037 ms |
  | `alumnos-b-r5` «alumnos, teclado: «Ver más»…» | 2913 ms |
  | `alumnos-b-r4` «alumnos: con más páginas…» | 2218 ms |

  El primero sigue siendo el más cerca del umbral, como en las rondas 2 a 4 (O-11, con destino en 02d).

### Conteos
- `cd frontend; npx vitest list > <scratchpad>/front-list-02c-r5.txt`: **1725 casos**; `--filesOnly`: **118 archivos**, de ellos **67** `*.ataque` del frontend, con **1128** casos.
- Diferencia con lo que aceptó el manager (117 / 1702): **+1 archivo y +23 casos**, los de `foco-02c-r5` (`grep -c "02c-r5.ataque"`: 23).
- `*.ataque`: **134** (67 del backend y 67 del frontend).

### Tabla de SHA-256 de las 134 `*.ataque` al cierre de la ronda 5 de 02c (base de V-01 del cierre de 02c y de 02d; 1 nueva, ninguna existente cambia)
| SHA-256 | Archivo | Cambio |
|---|---|---|
| `BCCE2CAE771F97957D8691BEF7FFF4EC42412DAAEABF726AEB0AFC59F6F25671` | `backend/src/config/correo.ataque.test.ts` |  |
| `DCB78D222544E8DC4FBECE59468F555B04ABE971B70016E9BB17FCAE3E958580` | `backend/src/config/env.ataque.test.ts` |  |
| `71E7F049447D2D1ECEDD897C55EA0B6D31221753F0A7E7473C7AC6E8667F0A95` | `backend/src/config/logger.ataque.test.ts` |  |
| `91F620C1A27778EEBC2BED5EEC1BC9B0E3FE1199B32ED00F9DD910011D6A1805` | `backend/src/core/clases/codigo-r1.ataque.test.ts` |  |
| `262691F5786AD63B2393D0BA5FF97538F6DACF43343BED019AD23C12A07D8686` | `backend/src/core/clases/codigo-r2.ataque.test.ts` |  |
| `E769CBFCC3A83A64B51C6437F80684640A7C928AD6B8C5C1671FDFF005D7B734` | `backend/src/workers/ritmo-03c-r1.ataque.test.ts` |  |
| `36C23511D5BFD24F2BB999BA34B00C193C8DD0FD0782F29F4E0BB00631E2FBCA` | `backend/test/admin-muro-02b-r1.ataque.test.ts` |  |
| `388AD0E585639B8C3E0E0A6657FB42C1B9CB83DB721C4863C4FA19E0BE42EC85` | `backend/test/admin-unico.ataque.test.ts` |  |
| `D2CC28B62BF988AE14BA975A9BC8D534AEC0EEBCE30DA93D7DED9A26026B0857` | `backend/test/alumnos-b-r1.ataque.test.ts` |  |
| `00346D471355ABC7971B921649E7192B8987FE27912C00CB7E41AEF2065369E9` | `backend/test/alumnos-b-r2.ataque.test.ts` |  |
| `FC11AB4B914D4A88612953F82DB354E2B9CEA9BEF86E24321EF7E031F3AC3837` | `backend/test/alumnos-b-r3.ataque.test.ts` |  |
| `441A766A94E7D9B26807790402E06ED94D4CC378D8F6ECF0BCCC3259C7FF55FB` | `backend/test/api-real.ataque.test.ts` |  |
| `D9E1DE5B1BD43F54CF3A4DCF153D1EEABDC36B4DEC02FBEB9D8A0239F298DFE9` | `backend/test/archivos-d-r1.ataque.test.ts` |  |
| `1637EB447CD12AC5BDDDC7634980DBC10A25CBAD5DE01BF6C09F40ED930FF1A9` | `backend/test/archivos-d-r2.ataque.test.ts` |  |
| `42BB7BF3086230C6EDC65AB73976AC8A801956336561AADBEE65CC3B40EB8612` | `backend/test/arquitectura-cuentas-r1.ataque.test.ts` |  |
| `38ADB0984744A0810287711F57BA0498287D0BC96344B8948BA1C490CA807716` | `backend/test/arranque-r1.ataque.test.ts` |  |
| `2C83D82D10BDD9B7A969768774D75B18B7A71A594BBAAC5FAE36A0E134D2336C` | `backend/test/auth-login.ataque.test.ts` |  |
| `73D3A2AE708A0EF676547A8094115B1419423057378387269BC3EADB34C7724E` | `backend/test/auth-registro.ataque.test.ts` |  |
| `6F557E8E860BCE6374671E90086E9C14B1861A308B6FBB434564612647892713` | `backend/test/autoria-02b-r1.ataque.test.ts` |  |
| `95BBA9BAC44366AD5A361E93DD2F278CB0A1CC889FA479049ACC7B45A9A5E71B` | `backend/test/clases-r1.ataque.test.ts` |  |
| `A87817D56C236C0BA3597214CAC23B10483BBC28AE44800C592ED5CE2EF97F38` | `backend/test/clases-r2.ataque.test.ts` |  |
| `72DE7D8AF3D3F772ABC19DB065F6E418F6EB76CE78D87FE6EBB51335FC99825A` | `backend/test/clases-r3.ataque.test.ts` |  |
| `BE97C4E48AC9551BED1D01552E90AB8CDF085CF928AE6C8C3D81809E35F7CE62` | `backend/test/clases-r4.ataque.test.ts` |  |
| `000EC9008C73D25121C82A46F5EA0F67E6C8C387CB04E361EF82812B57956098` | `backend/test/concurrencia-02a-r1.ataque.test.ts` |  |
| `530546B4D70A2B9AD36F98F37E2AF45480E81A1101EE3516D15426F78350BF82` | `backend/test/cuentas-03a-r1.ataque.test.ts` |  |
| `6303DDC170545F616C66773C3F5475CB3BE1FEA9347D8059354D6ADE8D676C16` | `backend/test/cuentas-r1.ataque.test.ts` |  |
| `3A4E81C111B8EEB7DF065804AA85062FA3FC607F0147149B71AC21C14E7818D9` | `backend/test/cuentas-r2.ataque.test.ts` |  |
| `F54F79F7B2A83E95FE440053CCAF15CB3EBB01CE5DFD4C6655E22159A5FD7E6B` | `backend/test/cuentas-r3.ataque.test.ts` |  |
| `A2F9BFF596330A7D55D1CA9D47197FC831EB132F52C759610E2D667895C3332F` | `backend/test/cuerpos-02a-r2.ataque.test.ts` |  |
| `D7A9DA854CE8AB8AD8D2437DB2E8C2A642A777EA3261A6B038DA28BE022DF848` | `backend/test/enlaces-03b-r1.ataque.test.ts` |  |
| `DC1B7EE7EA58966F5DB33CCB4581885A9669DEA2263954AE46D17A83E1EF6EAF` | `backend/test/enlaces-03b-r2.ataque.test.ts` |  |
| `B051B1986496E35E3E306C4C6BC306A763542BCA4B350574D0C02E2C484DEB35` | `backend/test/enlaces-ch-r2.ataque.test.ts` |  |
| `D28CC4DE621A680E6B54B2BFF889700300D558EC7849717584518D2F03EC8CAE` | `backend/test/entorno-ch-r1.ataque.test.ts` |  |
| `BA1AC9B17CC9BF747522BD4EC8B87DF436008482E643B18EEA8E9A8C041C59B3` | `backend/test/formada-ch-r1.ataque.test.ts` |  |
| `EC9602D5F109B45A6D428E708D9B6CDD37A7509A6FF9031FA6FD8A2DA0E25E9B` | `backend/test/gestion-02a-r1.ataque.test.ts` |  |
| `5F4133F949D2F337A8F63B75CF82CB77114DB7812D67C1960105F5000C31A326` | `backend/test/guarda-ch-r1.ataque.test.ts` |  |
| `7A7DAC6D87EDF81059FCFF9C07471AAF49D690EC159BE4B9FD4AA32B0909A215` | `backend/test/guarda-ch-r2.ataque.test.ts` |  |
| `610EE44E5D0BCEA46EB4E3645F9ADF1998A76947A25AF7E3F8248EA3A633DF79` | `backend/test/guarda-ch-r3.ataque.test.ts` |  |
| `E5D149F3AC52B726E1FE08908249706341330F88EAA6674B9A9AC67B98B1E864` | `backend/test/guarda-clase-r1.ataque.test.ts` |  |
| `C979D2C9C420A2177FA6EBDDB78EB2CE84D5F043B94270F690916A6FC75D6F8F` | `backend/test/guarda-clase-r2.ataque.test.ts` |  |
| `20982E2B98F1B162146A211923F3D5EC19D4E170C4AA3A5BFC6F82C3B6173AAD` | `backend/test/guarda-r2.ataque.test.ts` |  |
| `A8B79D5AD98270BE3747F493865708A78BB73ADD08D832584DB4464C3582777A` | `backend/test/intentos-r2.ataque.test.ts` |  |
| `2619B44EEA3370494C95AC128FCFD9E3FFC20D1581A19F549BF371F603A11D7D` | `backend/test/invitacion-flujo-03a-r2.ataque.test.ts` |  |
| `704155928183AEC193AE7E157B86B3E9361D2B63C7A47BE1ED859605FAB4FFA6` | `backend/test/invitacion-masiva-03c-r1.ataque.test.ts` |  |
| `DD9B7454E8786BF0B833D265900CCAECF595808CEBC8E9A77C9AEF15298A1038` | `backend/test/invitacion-masiva-03c-r2.ataque.test.ts` |  |
| `F9F9EC59EC8D1A5CCB180522798140C45604440F48EDCD68A3E02863D90AE347` | `backend/test/logs-02a-r1.ataque.test.ts` |  |
| `A2006C163D9E6CD3E4A2A773D1501826DAF3C8E7BB184D205BFC6442318FB59C` | `backend/test/logs-02b-r1.ataque.test.ts` |  |
| `BD8B303C434EFEC0785E0691D31D6F6E87DBF3305F50FA27CCE0F78CBB251E3A` | `backend/test/logs-03a-r1.ataque.test.ts` |  |
| `B58D5D013658433FE5839634E2DB5A31B8D2B8F69587BC36958752D3CD33BBF7` | `backend/test/logs-03b-r1.ataque.test.ts` |  |
| `0E4ABF3BC5D92FA0C380805453190703862567930DD74B9E7FCC1809564D181F` | `backend/test/logs-03c-r1.ataque.test.ts` |  |
| `1E775A19682F3A5995D7C035BCC810A36BF50C22045B6FFBFC5A98B821255DB0` | `backend/test/logs-archivos-d-r1.ataque.test.ts` |  |
| `E9CE866D511E3EE6029015B74E20B4D342A60BE99B3AAC97E86F00283A3C77F1` | `backend/test/logs-archivos-d-r3.ataque.test.ts` |  |
| `E008935B107752D203F6423B2F1C9E0F5A4339F0A77154746BF262CECB90351A` | `backend/test/logs-cuentas-r1.ataque.test.ts` |  |
| `690E30ED39111C0A074FC159015967CD9F0FDC24D9A340E6A0D7BE4B980A9D45` | `backend/test/logs-muro-c-r1.ataque.test.ts` |  |
| `0809C60700E26183E7771B4B1A40B05CBF554C2ED7929190CF4D89A52722E551` | `backend/test/logs-muro-c-r2.ataque.test.ts` |  |
| `5AF3909E4B7CA485E78979567872EA78BF41E6D679B9EC2C761EAA0B250DF689` | `backend/test/logs-r2.ataque.test.ts` |  |
| `AE66FBCF60E8F66336E77C1055893E60CB85A01BC746B89C68A4D2C70C807AF1` | `backend/test/muro-c-r1.ataque.test.ts` |  |
| `7825CFC9B484DF740FA0E9562A195D1BBCAF4CAF72EA55FA847B5394AB96C125` | `backend/test/muro-c-r2.ataque.test.ts` |  |
| `8B733B86FC6D54ECE008389A59793FAE4EC4A65146EB37215E900E50A5337D46` | `backend/test/nombres-guarda-r3.ataque.test.ts` |  |
| `00A6EB6F7CCD7D8790C356BEFCC96DDFDA6EACCE0BE53DE255CFE3626D8F2ADB` | `backend/test/nombres-tokens-r2.ataque.test.ts` |  |
| `80B5A848F69B429E7DADEC86C07BEC1D3E3EED8A042EFBA41CE912DED39E7BAB` | `backend/test/nowait-ch-r1.ataque.test.ts` |  |
| `6F2ABC2CEFD77D74CD1E3ABBDCE9C41BB53D00BD4D8E5BA7E496C4441C2697E5` | `backend/test/servicio-ocupado-ch-r1.ataque.test.ts` |  |
| `3B2D94ABCCBEDD6FB53CF666AAD06ADF431A0DB9A09264F05D8ADF6963CBD0AE` | `backend/test/sesiones-y-cadena.ataque.test.ts` |  |
| `70AC720F2E7FCADEE5BBCB6414887AB08129DEA7CD91DF012046953B1584E8B6` | `backend/test/sexto-paso-02a-r1.ataque.test.ts` |  |
| `F09E9A0038C47D1A2223376A0AF260BAF573F0C45BF770201C48C9E30296F04B` | `backend/test/worker-03c-r1.ataque.test.ts` |  |
| `9F60F9D65D52D2021A1EB04E9F01D3CC68F22744C845BF93D6621AA4FE9713A8` | `backend/test/worker-r1.ataque.test.ts` |  |
| `77D11BD85F202A9EEC92A363DF82E63FB9A784CA9D368D49F62E61C1A2AA967B` | `backend/test/worker-r2.ataque.test.ts` |  |
| `B89EDE0F6AED45DFCB5E64C8909A822156CE43FD80948E72419CDCE9D4541A87` | `frontend/src/app/cache-03a-r1.ataque.test.tsx` |  |
| `E85743C0FBB8E476874A2C67334342D8D69D14153579FC1E4CCE0AE6E2B29616` | `frontend/src/app/contexto-r1.ataque.test.tsx` |  |
| `BC2BE5541006887E2A5A4A89B33046180F607D54474B0F96A73D615AFBCAC385` | `frontend/src/app/contrasena-r1.ataque.test.tsx` |  |
| `F38BCACB716D8A39ACDB3535A95603CD0D8AB02572CA57A7DF5268B01CEB6EAC` | `frontend/src/app/contrasena-r2.ataque.test.tsx` |  |
| `68FB5D092C0C8ECFCF282477EF023AAAE26F6B869656E05109DC3EFA276D842A` | `frontend/src/app/cuentas-r1.ataque.test.tsx` |  |
| `41930017715D3D6869DC7ACEFD75DE8EC3684F1F035B845ABDF8EC0F6B734DEE` | `frontend/src/app/cuentas-r2.ataque.test.tsx` |  |
| `1506C27E5F7418B5E087FD30F8809645A2FC3E2761C7249DE78F02E24AA6C7A5` | `frontend/src/app/en-espera-r1.ataque.test.tsx` |  |
| `DB48DAD405C27062621A44D3744C84CC5903892A51E5A8DF18F41383CB9C88A3` | `frontend/src/app/errores-r1.ataque.test.tsx` |  |
| `F95321E604E20B533EBF2DB3C1C6C66BA2F2D87A48F075415B766551F6EE30F4` | `frontend/src/app/fondo-r1.ataque.test.tsx` |  |
| `57CB54AFD3B79464F0DF01B88FC388CEBBEAC5657D936C4C204CBAE6034B0834` | `frontend/src/app/marco-r1.ataque.test.tsx` |  |
| `D32E1C5B5629C37D2521446D7E578CDB081DD71F5B5026E73E13C58E16D92801` | `frontend/src/app/muro-recuperar-c-r3.ataque.test.tsx` |  |
| `BEC7B7B49E056AFE514F654FCA9C562D77A090F7421057B8B03D57D4E862140A` | `frontend/src/app/muro-recuperar-c-r4.ataque.test.tsx` |  |
| `2F8056A770397C1601647277944555A48AFC4B9A2BABEB75E5898F0CC92562BB` | `frontend/src/app/muro-rutas-c-r1.ataque.test.tsx` |  |
| `0EEFED2C05D76B0790A437E9465A898A9076083B1F046F8785145CFAAD0DA379` | `frontend/src/app/registro-maestro-03b-r1.ataque.test.tsx` |  |
| `053E867A904AFA3C09EEF92CA2E03E929D9F9C93F714040856F40C7418721BBE` | `frontend/src/app/router.ataque.test.tsx` |  |
| `28B4046CB3DB0BA03338767FA614BA6F4B53650327F4E6CC3CDE4123F6F3F233` | `frontend/src/app/rutas-02c-r1.ataque.test.tsx` |  |
| `C7946F5F5D5D16D36B395ADC2AD9928ACC7FD9839875FB64532B51489756730B` | `frontend/src/app/rutas-clases-r1.ataque.test.tsx` |  |
| `F090CBD8E8C9B0AF52D4FC19547B07E9B6413F5414CC4B10862F01E29818DDDC` | `frontend/src/app/sesion-r2.ataque.test.tsx` |  |
| `FA229C216651693AFFDAC0FDDD148EC5AC26FDFB3A15ABB827F21CCBCEF4C3E1` | `frontend/src/components/layout/estatico-r1.ataque.test.ts` |  |
| `0AAA18CD70465293B6FCA6CC051B8E4AC360A838D02FEDE848C35376C3D0066C` | `frontend/src/components/layout/pie-r1.ataque.test.tsx` |  |
| `00A707429AF6B5326F9A96DEF6382823CF4A6A092AAC7E7BD7CBCB8DC9AA1D21` | `frontend/src/components/layout/pie-r2.ataque.test.tsx` |  |
| `472E1F46D0C899496AA334909B02988962AAB07B9BD29A8D7B8AF3987FAC6C76` | `frontend/src/components/layout/pie-r3.ataque.test.tsx` |  |
| `A1814D281DAFD8243989C9F9A462A4F33A86B1FB70EEEBF29E99BCB0F340D82A` | `frontend/src/components/ui/badge-03b-r1.ataque.test.ts` |  |
| `86ADAA9A093A987DAFD97E279E600211CBDF6CEF97879D16FA2D8A9D2846F8B5` | `frontend/src/features/admin/cuentas-r1.ataque.test.tsx` |  |
| `B948E9359FD3981E08B850540027F536F345A3F48D7C0749BA0C16C2C1DF1184` | `frontend/src/features/admin/cuentas-r2.ataque.test.tsx` |  |
| `72BF9AF4CE8F52A114897E038CEFB0947841A37F74074F4C5F8DEC68A71B654A` | `frontend/src/features/admin/cuentas-r3.ataque.test.tsx` |  |
| `942DF3015424AED56E83661993BA015E871CD6BE8E797920D47E8CBF0C56EAC4` | `frontend/src/features/admin/cuentas-r4.ataque.test.tsx` |  |
| `3BD26E7E3BF019D462DB4837861ED22017BBB9E9A6276720BF0DEA6C2B5B0998` | `frontend/src/features/admin/en-espera-r1.ataque.test.tsx` |  |
| `8219C864E7BDC1315E6A0F0FF1CD6F54E4710CEBDCEB8E316F4E53AACC0CFF35` | `frontend/src/features/admin/foco-r1.ataque.test.tsx` |  |
| `30F45BBA30D9348EC1587B42E84CA370274E1BF0AF0F310B8A6BBD79FA982669` | `frontend/src/features/admin/maestros-03b-r1.ataque.test.tsx` |  |
| `D477A809E55E603D3EF6C02CA43B21372B75D0947FA303F1539D48BDF32841F8` | `frontend/src/features/admin/maestros-03c-r1.ataque.test.tsx` |  |
| `3CEDA51DB8F67F40C26615FBC4CD7D082035B00F38713C6CA4C7DB58E47926C8` | `frontend/src/features/auth/enlace-r1.ataque.test.tsx` |  |
| `1F5D1147637C09DAA6FDF1384E4395EDD69DFDAB84AAE5D602A362DABD3295BD` | `frontend/src/features/auth/enlace-r2.ataque.test.tsx` |  |
| `991B115524D8DADE8D6EA2C51FB753DC8832EE410DB2161A0CE761D011CFCA4A` | `frontend/src/features/auth/invitacion-r1.ataque.test.tsx` |  |
| `25375E6678BA9B5331D53B78031BD315A8651F16CD32571E9FCEE539D07C5BA8` | `frontend/src/features/clases/alumnos-b-r1.ataque.test.tsx` |  |
| `55DC274ECA96DA4360848B88F9F2A839AC815031490AB57FF38DE074512D632C` | `frontend/src/features/clases/alumnos-b-r2.ataque.test.tsx` |  |
| `371518E4309F14201A92D29F9436A97A19801B506D45114964FBCFE3F5CD4183` | `frontend/src/features/clases/alumnos-b-r3.ataque.test.tsx` |  |
| `266D088DD727F18AF8C8A106B8D9C4DBED75753E4B1B4ABB12F3A4DF870ECB7F` | `frontend/src/features/clases/alumnos-b-r4.ataque.test.tsx` |  |
| `856CFFBD9C743F9815DAF731487E29DC5F5272545DC15820A70BAF86ECFA6527` | `frontend/src/features/clases/alumnos-b-r5.ataque.test.tsx` |  |
| `1E9A26ED86EE637E1A2E065DC05DA79CBB5048E18A020285D6B479FD290BCC9C` | `frontend/src/features/clases/archivos-d-r1.ataque.test.tsx` |  |
| `EFC07CC006E16E03BEEC69A17E08AED83657095555107B28FB1AB3EF1400E687` | `frontend/src/features/clases/archivos-d-r2.ataque.test.tsx` |  |
| `E01A46173F2820F0AF15824C88AA81805412B70248062F419DD40236C9EED7E3` | `frontend/src/features/clases/archivos-d-r3.ataque.test.tsx` |  |
| `A043F6264BF1487C4488EB3273148E905005D0DE847F388E7EFF954B089BFCB9` | `frontend/src/features/clases/cargar-mas-02c-r2.ataque.test.tsx` |  |
| `D2C0EA65FCCF53F7DFECA318920922B82924A1EE3A1E257B5F31AF1F8FDD63E3` | `frontend/src/features/clases/clases-admin-02c-r1.ataque.test.tsx` |  |
| `5F0679D8CFACC8BCE01989C04A415DC5B546625EB7DEC92F03959DE5A0F89815` | `frontend/src/features/clases/clases-r1.ataque.test.tsx` |  |
| `C7AD5EDC733E374117A9277F1C2987E84CC2930C77EB4C720CCF15CC9F5FAB45` | `frontend/src/features/clases/clases-r2.ataque.test.tsx` |  |
| `A835A11D29AEDB8F77F91E826A22C2B7CF5322FCED3F6BED0C1ACBF7C75A4E61` | `frontend/src/features/clases/clases-r3.ataque.test.tsx` |  |
| `86B04D234527ECEEFCA35B07CE89E6B7CE0B6AFE5CCDEE2F005E6A4219F0495A` | `frontend/src/features/clases/clases-r4.ataque.test.tsx` |  |
| `E76A0B75591B6D0032AEAA870441EE093C05FC13408CC47A8CB5B5883AF7A14F` | `frontend/src/features/clases/estatico-02c-r1.ataque.test.ts` |  |
| `CDD1ED8890859AE3E884822FC7074852A2173105114745D83FE9A15C1C47C626` | `frontend/src/features/clases/estatico-r1.ataque.test.ts` |  |
| `9461F0A14201BAE86A13F99003863162FCC467116FE38AC2768DCA7A747137EB` | `frontend/src/features/clases/foco-02c-r3.ataque.test.tsx` |  |
| `36437C733C0908F871CF7E7CAD7689A56C77FED6B412572143A42BFE11C1E38F` | `frontend/src/features/clases/foco-02c-r4.ataque.test.tsx` |  |
| `F7D9053726B1DCA4E70F2CB401E8D0752D0F2007E90CE3B6678C019F4BDB8DE9` | `frontend/src/features/clases/foco-02c-r5.ataque.test.tsx` | nueva: ronda 5 de 02c |
| `0F60F1582FCE6E5EFAF9BF6856133DC30F1DC4EB9C3B7FEA19F90A330F8335B3` | `frontend/src/features/clases/inicio-sin-datos-02c-r1.ataque.test.tsx` |  |
| `7C434A0E54E70B12D4B2A3DE22FFB4DBF5F28A1CFBD2290C22E8A2B59EDF0E16` | `frontend/src/features/clases/inicio-sin-datos-r2.ataque.test.tsx` |  |
| `A4DE3A7DC35DAEDFF86FD41349EA09140213E918613603D0985C698FF41D29F7` | `frontend/src/features/clases/maestros-02c-r1.ataque.test.tsx` |  |
| `41D27CD07466255EDA02B898F474EFE036C91EA77E53061076514DECFE90E1FD` | `frontend/src/features/clases/muro-02c-r1.ataque.test.tsx` |  |
| `BF0CAB9760A82DB5761777542827F89E4DE9F3712D06E44916F698ABDA1ABBAA` | `frontend/src/features/clases/muro-c-r1.ataque.test.tsx` |  |
| `D91FCE8DFB93139D9F7941E33BA8904D92C4560B37A61737688194C9504B093E` | `frontend/src/features/clases/muro-c-r2.ataque.test.tsx` |  |
| `73523416AE3F04A4AE4DB25685E2C9A5BA8EB3DB015225DFEDC76EDF5D75958F` | `frontend/src/features/clases/muro-c-r3.ataque.test.tsx` |  |
| `216611C095304561A1A70454ED50F1443FDF76D7BE1436DC47DD9FD0FE57FD74` | `frontend/src/features/clases/ventana-02c-r2.ataque.test.tsx` |  |
| `C71CBA65DD284D7AF11CBC812B6BCF75BAA373939EDB8318E731858D9C50173F` | `frontend/src/lib/format-d-r1.ataque.test.ts` |  |
| `89DBBB70D5DC404C3D74DB5391D10855C8CB1D6B4C643B6147B3CE6FFB2637AF` | `frontend/src/lib/format-d-r2.ataque.test.ts` |  |
| `BFA7DED62F7A1402590D438A1CC51060A63FA019AD47D3EB5740E43383064A2A` | `frontend/src/lib/format-d-r3.ataque.test.ts` |  |
| `10C730348D18FF8DAE7B3623751D31122AA58560B564AD191717FA1938A6F8CE` | `frontend/src/services/apiClient.ataque.test.ts` |  |
| `7986CE1FE3EBF76714AA064FADE5BBEB855037A02EF66F6532632E8720ABC68B` | `frontend/src/styles/clases-r1.ataque.test.ts` |  |
| `B8085BCBBC7F4B6276BF3A87FB7BA0BC887953A8C6CE372354A7F3F1B5037582` | `frontend/src/styles/tokens-r1.ataque.test.ts` |  |
