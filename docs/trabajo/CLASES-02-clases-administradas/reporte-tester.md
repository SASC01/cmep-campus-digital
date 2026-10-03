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
