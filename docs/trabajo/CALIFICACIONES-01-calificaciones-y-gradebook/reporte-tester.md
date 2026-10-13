# Reporte del Tester — CALIFICACIONES-01 · calificar con rúbrica, devolver con comentario, gradebook y calificaciones del alumno

## Ronda 0 de 01a
Base: árbol de código en `<R>` = `d998282` (sin código de 01a). `plan.md` en estado LISTO, aprobado por escrito el 2026-10-13; P-03 en (c′). La ronda 0 no cuenta en el tope de 3 rondas. Solo reescribí las cinco C-n de 01a que autoriza A-5; no toqué código de producción, `shared/`, pruebas normales ni ningún archivo de "No se toca".

### V-01
- **Base:** "Tabla de SHA-256 de las 175 `*.ataque` al cierre de la ronda 2 de 01e" de `docs/trabajo/ENTREGAS-01-entregas-e-hilo-privado/reporte-tester.md` (línea 4189).
- **Método:** `git ls-files -co --exclude-standard | grep '\.ataque\.test\.tsx\?$'` (175 archivos, rastreados y sin rastrear) y `sha256sum` de cada uno; `diff` contra la tabla, con los hashes en minúsculas y ordenada por ruta.
- **Resultado, antes de tocar nada:** 175 de 175 iguales, ningún archivo de más ni de menos. **V-01 en verde.**
- **Después de las reescrituras:** siguen siendo 175 archivos; cambiaron exactamente los 8 de C-1, C-2, C-3, C-5 y C-6, y ningún otro.

### Reescrituras C-n de 01a (A-5)
Cada archivo lleva un comentario de una línea con el motivo ("C-n de CALIFICACIONES-01a (§D-R0, A-5): …"). Las aserciones no cambian, salvo las listas exactas que §D-R0 manda ampliar.

| C-n | Archivo | Cambio (diff resumido) | Motivo |
|---|---|---|---|
| C-1 | `backend/test/sesiones-y-cadena.ataque.test.ts` (caso de `:544`) | + comentario en `:543`. El título pasa de "…, ENTREGAS-01b y ENTREGAS-01c: ninguna crea admins…" a "…, ENTREGAS-01b, ENTREGAS-01c y CALIFICACIONES-01a: ninguna crea admins…". La lista ordenada suma, entre `"PUT /api/clases/:claseId/tareas/:tareaId"` y `"PUT /api/clases/:claseId/temas/:temaId"`, exactamente `"PUT /api/clases/:claseId/tareas/:tareaId/entregas/:alumnoId/calificacion"` (un `PUT` no genera `HEAD`). Las entradas de 01b no se agregan. | El `PUT` de calificar (§D-3). No crea cuentas ni es pública. |
| C-2 | `backend/test/entregas-01b-r1.ataque.test.ts` (caso "anular mientras la entrega pasa a calificado…", `:627`) | + comentario en `:649`. `UPDATE entregas SET estado = 'calificado' WHERE …` pasa a `UPDATE entregas SET estado = 'calificado', calificacion = 1, fecha_calificacion = now() WHERE …` (`:650`). | Sin las dos columnas, la fila violaría `entregas_calificacion_segun_estado` (§D-1). |
| C-3 | `backend/test/lecturas-fx-r2.ataque.test.ts` (caso O-4, `:967`) | + comentario en `:966`. El título pasa de "…temas, categorías y criterios de rúbrica; nada borra…" a "…temas, categorías, criterios de rúbrica y puntajes de rúbrica; nada borra…". La lista ordenada suma `"puntajeRubrica"` entre `"publicacion"` y `"tema"`. Lo demás (nada borra `enlaces_registro` ni `usuarios`, ningún `DELETE FROM` ni `TRUNCATE` crudo) no cambia. | Calificar reemplaza el desglose con `puntajeRubrica.deleteMany` (§D-3). |
| C-5 | `frontend/src/features/tareas/entregas-01d-r1.ataque.test.tsx`, `entregas-01d-r2.ataque.test.tsx` y `entregas-01d-r3.ataque.test.tsx` | En cada uno: + comentario antes de `const entregaAsignada`; `entregaAsignada` y `entregaRealizada` suman `calificacion: null,` antes de `...extra,` (r1: `:71` y `:83`; r2: `:68` y `:80`; r3: `:66` y `:78`). Nada más. | `miEntregaSchema` suma `calificacion` obligatoria y anulable (§D-11, S-16). |
| C-6 | `frontend/src/features/tareas/entregas-01e-r1.ataque.test.tsx` y `entregas-01e-r2.ataque.test.tsx` | En cada uno: + comentario antes de `const entregaDeAlumno`; `entregaDeAlumno` suma `calificacion: null,` después de `version: 1,` (r1 `:90`, r2 `:78`); el doble de `MiEntrega` en línea suma `calificacion: null,` después de `puedeAnular` (r1 `:704`, en "estudiante: sin panel ni enlace a las entregas de la clase"; r2 `:267`, en `miEntrega`). Nada más. | `entregaDeAlumnoSchema` y `miEntregaSchema` suman `calificacion` (§D-11, S-16). |

Los cinco archivos de C-5 y C-6 no tienen otro doble de `MiEntrega` ni de `EntregaDeAlumno`: los únicos objetos con `conRetraso` fuera de los constructores son el `fila` de `entregas-01e-r1:64` (`FilaDeEntrega`, que no cambia) y los dos dobles en línea ya reescritos. Todos los archivos son LF y las líneas nuevas también.

### Inventario (listas cerradas e inventarios estáticos de las `*.ataque`)
Recorrí las 34 `*.ataque` que leen código (`readdirSync`, `readFileSync`, `import.meta.glob` o `printRoutes`). También busqué con grep los dobles de `MiEntrega` y `EntregaDeAlumno`, las filas `calificado` fabricadas y las respuestas de entrega validadas con los esquemas. Lo contrasté con lo que 01a cambia según "Cambios por capa":
- `shared/src/entregas.ts` y `shared/src/calificaciones.ts` (nuevo);
- `core/calificaciones/` (nuevo) y `core/eventos/avisos-de-clase.ts`;
- `adapters/queue/colas.ts`, `adapters/db/entregas.ts`, `adapters/db/tareas.ts` (solo `editarTarea`) y `adapters/db/index.ts`;
- `handlers/calificaciones.ts` y `handlers/respuestas-de-entrega.ts` (nuevos, fuera de `handlers/tareas/`), la importación de `handlers/tareas/entregas.ts` y `app.ts`;
- la migración y `schema.prisma`.

En 01a no cambia código de producción del frontend.

**Rompen en 01a (todas están en §D-R0):**
- **Rutas:** `sesiones-y-cadena.ataque.test.ts:544` (C-1). Ninguna otra prueba guarda una lista de rutas: `guarda-ch-r1`, `guarda-ch-r3` y `guarda-clase-r1` usan apps sintéticas. `RUTAS_PUBLICAS` (10) no cambia, porque el `PUT` no es público.
- **Filas `calificado` hechas a mano:** la única con SQL propio es `entregas-01b-r1.ataque.test.ts:650` (C-2).
  - Las demás pasan por `crearEntregaDePrueba` (A-3): `entregas-01b-r1:749` y `:894`, y `hilo-01c-r1:373`.
  - `migracion-01a-r1:162` y `:232-235` insertan en un esquema aparte que solo tiene las migraciones hasta ENTREGAS-01 (`:89-95`, `slice(0, indice)`).
- **Modelos que se borran:** `lecturas-fx-r2.ataque.test.ts:967` (C-3).
- **Dobles de `MiEntrega` y `EntregaDeAlumno` en el frontend:**
  - Los únicos archivos `*.ataque` con `puedeAnular`/`puedeEntregar` son los cinco de C-5 y C-6.
  - Los únicos con `alumno: {` y `version` son los dos de C-6. Los `alumno: {` de `alumnos-b-r2` a `alumnos-b-r5` y de `ventana-02c-r2` son de otros esquemas (alta de alumnos).
  - Ninguna `*.ataque` usa esos tipos con `: MiEntrega`, `: EntregaDeAlumno`, `satisfies` ni `as`, así que `tsc` no rompe por tipos.

**Revisadas y sin efecto en 01a** (archivo:línea del caso, y por qué):
- **`instantaneaUnica`:**
  - `lecturas-fx-r1:758`: `entregas.ts:4` y `tareas.ts:2`; las lecturas nuevas de 01b irán en `calificaciones.ts` (C-4 de 01b).
  - `hilo-01c-r1:718`: 4 en el texto crudo de `entregas.ts`, con sus comentarios (N-01).
  - `instantanea-01b-r1:525`: `editarTarea` no debe nombrarla.
  - `lecturas-fx-r1:1112` (`clases.ts`) y `lecturas-fx-r2:1071` (`publicaciones.ts`): esos archivos no cambian.
- **`FOR KEY SHARE`:** `entregas-01b-r1:1002` (una vez en `entregas.ts`, dentro de `bloquearTareaParaEntregar`), `hilo-01c-r1:718` y `temas-01a-r1:985` (solo en `entregas.ts` y `referencias.ts`). `FOR SHARE` y `FOR NO KEY UPDATE` de §D-3 no casan con `/FOR\s+KEY\s+SHARE/`.
- **Ciclos y SQL de `entregas.ts`, y el handler de entregas:**
  - `entregas-01b-r1:1016`: `entregas.ts` sin `Unsafe`, sin `await` dentro de `for`/`while` y sin `forEach(async`; `handlers/tareas/entregas.ts` sin relación, rol, SQL ni Prisma.
  - `adapters/db` no importa `adapters/queue` (`entregas-01b-r1:1016` y `hilo-01c-r1:735`): encolar `CALIFICACION_PUBLICADA` tiene que ir por el mismo mecanismo de callback que `ENTREGA_REALIZADA`.
- **Esquemas de `shared/src/entregas.ts`:**
  - `entregas-01b-r1:1032`: 7 casan con `^(miEntrega|entregaDeAlumno|filaDeEntrega|listaEntregas|alumnoDeEntrega)(Respuesta)?Schema$`.
  - `hilo-01c-r1:735`: 3 casan con `omentario`.
  - Los nombres nuevos (`puntajeDeCriterioSchema`, `calificacionDeEntregaSchema`) no casan con ninguno de los dos.
- **Nombres de cola:**
  - `muro-c-r1:628`: solo `core/eventos`, `colas.ts`, `muro.ts` e `hilo-privado.ts` nombran `PUBLICACION_CREADA`, `MATERIAL_CREADO`, `COMENTARIO_CREADO` o `AVISO_FALLIDO`. `CALIFICACION_PUBLICADA` no está en el patrón.
  - Ni `handlers/calificaciones.ts` ni `adapters/db/entregas.ts` pueden nombrar `COMENTARIO_CREADO` ni `AVISO_FALLIDO`. El `deadLetter` de la cola nueva va en `colas.ts`, que ya está en la lista.
  - `tareas-01b-r1:773` busca colas por el `tareaId` de los datos, pero solo tras crear, editar y borrar una tarea, sin calificar.
- **Archivos de `handlers/tareas/`:** `temas-01a-r1:999` y `temas-01a-r3:451` (listas cerradas). Los archivos nuevos van en `handlers/`, fuera de `handlers/tareas/`.
- **`editarTarea` (P-04):**
  - `tareas-01a-r1:748` fija el orden: bloqueo, autoría, versión, fecha y escritura, sin `await` en ciclos. Su regex de escritura solo casa con `update`, `create` y `delete` de `tarea`, `publicacion`, `criterioRubrica` y `archivo`. Por eso el `entrega.count` y el `criterioRubrica.findMany` de §D-4 no la mueven si van entre `exigirVersion` y `validarFechaLimite`.
  - `tareas-01a-r1:343-410` compara los criterios antes y después de un `409 TAREA_MODIFICADA`, que va antes del de calificaciones.
  - Ninguna `*.ataque` exige ids nuevos con la misma rúbrica (N-02).
- **Otros:**
  - `alumnos-b-r1:1149`: `inscripciones.ts` y `handlers/clases/alumnos.ts`, sin cambio.
  - `lecturas-fx-r2:918`: quién llama a `listarPublicaciones` y `listarComentarios`.
  - `muro-c-r1:1122` y `muro-c-r2:321`: las copias de la regla de texto visible. `handlers/calificaciones.ts` debe usar `textoConContenidoSchema` de `shared/`.
  - `arquitectura-cuentas-r1`: pg-boss, resend, notifier, `$queryRawUnsafe` y `obtenerDb` en `handlers/`.
  - `temas-01a-r3:426`: `$queryRawUnsafe` solo en `cliente.ts`.
  - `sexto-paso-02a-r1:164`: solo la migración `_clases_administradas`.
  - `tareas-01a-r1:674`: las llaves de la respuesta de la tarea, que no cambia.
- **Frontend (`enEspera=`, vidrio, valores arbitrarios, `perspectivaDeRuta`, secciones de la clase):**
  - Estas leen código de producción del frontend, que no cambia en 01a: `clases-r1:153` y `:312`, `estatico-r1:138`, `estatico-02c-r1:99`, `heredados-02d-r1:217-238`, `clases-admin-02c-r1:360-364`, `refactor-01c-r1:417` y `ver-mas-01e-r3:311`. C-7 a C-12 son de 01c y 01d.
  - Las reglas de `entregas-01d-r1:882` y `entregas-01e-r1:741` (`/\b(estadoPago|accesoRestringido|rol|calificacion)\s*(\?\?|\|\|)/`) leen archivos de producción, y `calificacion: null,` no casa con ellas de todos modos.

**Ninguna `*.ataque` fuera de §D-R0 rompe por 01a. Sin PARADA.**

**Observaciones de inventario (no son PARADA ni C-n; las anoto para el programador y la ronda 1):**
- **O-r0-1: rojos de paso, del paso 1 al paso 5 de 01a.**
  - `entregas-01b-r1` (`:257`, `:280`, `:284`, `:700`) y `entregas-01b-r2` (`:153`, `:222`, `:242`, `:246`) validan respuestas reales de la API con `miEntregaRespuestaSchema` y `entregaDeAlumnoRespuestaSchema`. `handlers/tareas/entregas.ts` usa los mismos esquemas en 6 lugares.
  - Desde que `shared/` exige `calificacion` (paso 1) hasta que las lecturas la devuelven (paso 5), esas pruebas estarán en rojo, aunque no figuren en la tabla de "Rojos esperados".
  - No necesitan C-n: pasan solas cuando el backend responde `calificacion`. Si el programador corre la suite completa entre esos pasos, verá esos rojos, y no son una regresión.
- **O-r0-2: un caso que hoy pasa por el motivo equivocado.**
  - `entregas-01d-r1.ataque.test.tsx:692` espera que `miEntregaRespuestaSchema.safeParse(respuesta).success` sea `false` por un enlace inválido.
  - Con C-5 hecho y `shared/` todavía sin `calificacion`, el `false` sale de la llave de más, no del enlace. El caso vuelve a probar el enlace en cuanto el paso 1 suma `calificacion`.
  - No es un rojo. Lo anoto para que nadie lo tome por cubierto en la ronda 0.

### Reservado para la ronda 1 de 01a
- **Que la migración aplique sobre una base con datos de ENTREGAS-01** (entregas `asignado` y `entregado` con archivos y enlaces, e hilos; "Puntos de ataque", Ronda 0). No aplica en la ronda 0 porque la migración todavía no existe: la crea el programador en el paso 3 de 01a. Lo compruebo en la ronda 1 de 01a.

### Corridas (una suite a la vez, nunca dos juntas)
Docker Desktop encendido (motor 28.5.1), red de confianza (PA-01 no aplica). Corrí primero el backend y lo esperé hasta el final; después el frontend; después el control de C-5 y C-6; después `lint` de cada paquete, uno por uno.

**Backend:**
- **Comando:** `cd backend; npm test > <scratchpad>/r0-test-back.txt 2>&1`, de 13:26:50Z a 13:30:41Z, código 1.
- **Resumen:** `Test Files  3 failed | 189 passed (192)` · `Tests  3 failed | 2419 passed (2422)` · `Duration  189.92s (transform 20.31s, setup 6.08s, import 272.95s, tests 1193.79s, environment 43ms)`.
- **Última línea:** `npm error command C:\WINDOWS\system32\cmd.exe /d /s /c vitest run`.
- **Los 3 rojos son exactamente C-1, C-2 y C-3,** cada uno por la causa de §D-R0:
  - **C-1:** `test/sesiones-y-cadena.ataque.test.ts > ataque: superficie de rutas > bajo /api solo existen las rutas de … ENTREGAS-01c y CALIFICACIONES-01a: …`. `expected [ …(96) ] to deeply equal [ …(97) ]`; la única diferencia es `- "PUT /api/clases/:claseId/tareas/:tareaId/entregas/:alumnoId/calificacion"`: falta la ruta.
  - **C-2:** `test/entregas-01b-r1.ataque.test.ts > ataque ENTREGAS-01b r1: carreras > anular mientras la entrega pasa a calificado …`. `Raw query failed. Code: 42703. Message: column "calificacion" of relation "entregas" does not exist`, en `alRetener` (`:650`): las columnas no existen.
  - **C-3:** `test/lecturas-fx-r2.ataque.test.ts > … > O-4: en backend/src solo se borran …, criterios de rúbrica y puntajes de rúbrica; …`. La única diferencia es `- "puntajeRubrica"`: nadie la borra todavía.
- Ningún otro rojo, ningún tiempo límite (`Test timed out`: 0) ni intermitencia: PA-12 no aplica.

**Frontend:**
- **Comando:** `cd frontend; npm test > <scratchpad>/r0-test-front.txt 2>&1`, de 13:31:09Z a 13:33:54Z, código 1.
- **Resumen:** `Test Files  5 failed | 161 passed (166)` · `Tests  73 failed | 2463 passed (2536)` · `Duration  159.70s (transform 42.69s, setup 121.24s, import 363.12s, tests 653.35s, environment 540.11s)`.
- **Última línea:** `npm error command C:\WINDOWS\system32\cmd.exe /d /s /c vitest run`.
- **Los 5 archivos rojos son exactamente los de C-5 y C-6:**

| Archivo | Casos rojos / total | C-n |
|---|---|---|
| `src/features/tareas/entregas-01d-r1.ataque.test.tsx` | 21 / 37 | C-5 |
| `src/features/tareas/entregas-01d-r2.ataque.test.tsx` | 16 / 23 | C-5 |
| `src/features/tareas/entregas-01d-r3.ataque.test.tsx` | 7 / 17 | C-5 |
| `src/features/tareas/entregas-01e-r1.ataque.test.tsx` | 10 / 29 | C-6 |
| `src/features/tareas/entregas-01e-r2.ataque.test.tsx` | 19 / 31 | C-6 |
| **Total** | **73 / 137** | |

- **Causa: el esquema estricto de hoy rechaza `calificacion`.** Lo comprobé de tres formas:
  1. Los 73 fallan con `TestingLibraryElementError` (no encuentran "Enlace", "Descargar … trabajo.pdf", "Anular entrega", "Marcar como completada", "Ana Ruiz", "Calificado", "Comentario privado", etc.). En el DOM volcado, "Tu trabajo" pinta "Error · Algo salió mal. Inténtalo de nuevo." en lugar de la entrega, y en la vista del maestro el error reemplaza la vista.
  2. **Sonda del esquema** (`<scratchpad>/scripts/sonda-esquema.mjs`, contra `shared/dist`, de solo lectura): `miEntregaRespuestaSchema` y `entregaDeAlumnoRespuestaSchema` aceptan el doble sin `calificacion` (`ok`) y lo rechazan con `calificacion: null` (`unrecognized_keys:calificacion`).
  3. **Control:** devolví temporalmente los cinco archivos a su versión de `d998282` y corrí solo esos cinco (`npx vitest run <los cinco>`): `Test Files  5 passed (5)` · `Tests  137 passed (137)`. Después los restauré desde la copia del scratchpad, con los mismos SHA-256 de la tabla final.
- Ningún otro rojo, ningún tiempo límite ni intermitencia: PA-12 no aplica.
- **El total de casos sube de 2529 (cierre de ENTREGAS-01) a 2536.** Los 166 archivos son los mismos; los 7 casos de más son los 7 `it(` que el commit de cierre `7296476` sumó a `editar-tarea-view.test.tsx` (lectura fresca al abrir Editar tarea), que ya está en `d998282`. No es cambio mío.

**`lint`** (verificación propia de que las reescrituras respetan Prettier y `tsc`):
- `cd backend; npm run lint > <scratchpad>/r0-lint-back.txt 2>&1`, código 0. Dice "All matched files use Prettier code style!" y su última línea es `> tsc -p tsconfig.json --noEmit && tsc -p tsconfig.test.json`.
- `cd frontend; npm run lint > <scratchpad>/r0-lint-front.txt 2>&1`, código 0. Dice "All matched files use Prettier code style!" y su última línea es `> tsc -b`.

### Rojos esperados tras la ronda 0 de 01a (base para el programador)
Coinciden exactamente con la tabla "Rojos esperados" de §D-R0. Ningún otro rojo.

| C-n | Prueba | Causa observada | Pasa a verde en (plan) |
|---|---|---|---|
| C-1 | `backend/test/sesiones-y-cadena.ataque.test.ts`, el caso de las rutas (1 caso) | falta `PUT …/entregas/:alumnoId/calificacion` | paso 7 (handler) |
| C-2 | `backend/test/entregas-01b-r1.ataque.test.ts`, "anular mientras la entrega pasa a calificado…" (1 caso) | `42703`: no existe `entregas.calificacion` | paso 3 (migración) |
| C-3 | `backend/test/lecturas-fx-r2.ataque.test.ts`, "O-4: …" (1 caso) | falta `"puntajeRubrica"` en los borrados | paso 6 (calificar) |
| C-5 | `entregas-01d-r1`, `-r2` y `-r3` (21 + 16 + 7 casos) | `unrecognized_keys: calificacion` en `miEntregaRespuestaSchema` | paso 1 (`shared/`) |
| C-6 | `entregas-01e-r1` y `-r2` (10 + 19 casos) | `unrecognized_keys: calificacion` en `miEntregaRespuestaSchema` y `entregaDeAlumnoRespuestaSchema` | paso 1 (`shared/`) |

Ojo con O-r0-1: entre el paso 1 y el paso 5 también estarán en rojo las `*.ataque` del backend que validan respuestas reales con esos esquemas. No hace falta reescribirlas.

### PA-07 de la corrida final del backend
**Fuente:** `<scratchpad>/r0-test-back.txt`. Conté y atribuí con `<scratchpad>/scripts/pa07.mjs`: cuenta por término sobre el texto completo y empareja cada línea con el último "incoming request" del mismo `pid` y el mismo `reqId`, por app; los `reqId` se repiten entre apps del mismo proceso.

| Término | Cuenta |
|---|---|
| `40P01` | 0 |
| `deadlock detected` | 0 |
| `could not serialize` | 0 |
| `too many clients` | 0 |
| `"Error no controlado"` | 10, exactamente el inventario I-1 de abajo |
| `"code":"P2028"` | 5, todos permitidos |
| (aparte) `Unable to start a transaction` (`maxWait`) | 0 |

- **Control positivo: completo.** Los tres `P2028` deterministas de `servicio-ocupado.integracion.test.ts` salen en el mismo proceso (`pid` 2816), con nivel 40:
  - `POST /api/auth/cambiar-contrasena` › `tx.sesion.findFirst()`;
  - `POST /api/auth/refrescar` › `tx.sesion.updateMany()`;
  - `POST /api/clases/:claseId/publicaciones/:publicacionId/comentarios` › `prisma.$queryRawUnsafe()` ("A query cannot be executed on an expired transaction").
- **Los dos de `cuentas-r3.ataque.test.ts`,** en el `pid` 11072, nivel 40: `POST /api/auth/login` › `tx.sesion.create()` y `POST /api/auth/restablecer` › `tx.tokenCuenta.updateMany()`.
- **Ningún `P2028` fuera de la lista de permitidos.**
- **PA-07: limpia.**

### Inventario cerrado de "Error no controlado" (I-1 de CALIFICACIONES-01, base de PA-07 b para 01a a 01d)
Sale de esta corrida final de la ronda 0 de 01a y es una lista cerrada. Es igual al I-1 de ENTREGAS-01 y de TAREAS-01.

| # | Ruta | Llamada que lo provoca a propósito | Prueba | `pid` |
|---|---|---|---|---|
| 1 a 5 | `POST /api/auth/login` | "fallo simulado de la base en la búsqueda" (`vi.mock` de `adapters/db/index.js`) | `intentos-r2.ataque.test.ts` | 14992 |
| 6 | `POST /api/auth/login` | "fallo simulado de la base al crear la sesión" | `intentos-r2.ataque.test.ts` | 14992 |
| 7 | `POST /api/clases/:claseId/archivos` | `ZodError` "La URL del almacén debe ser http o https" (`subida.url`) | `archivos-d-r2.ataque.test.ts` (T-39) | 13468 |
| 8 | `POST /api/clases/:claseId/archivos/:archivoId/descarga` | `ZodError`, la misma regla (`url`) | `archivos-d-r2.ataque.test.ts` (T-39) | 13468 |
| 9 | `GET /api/clases/:claseId/publicaciones` | `ZodError`, la misma regla (`publicaciones.0.adjuntos.0.vistaPrevia.url`) | `archivos-d-r2.ataque.test.ts` (T-39) | 13468 |
| 10 | `GET /api/prueba/error-comun` | `Error("boom")` de la ruta de prueba | `salud.integracion.test.ts` (el envoltorio de errores) | 20116 |

### Lista de `P2028` observados (base de PA-07 c)
| # | Ruta | Llamada | Prueba | Estado |
|---|---|---|---|---|
| 1 | `POST /api/auth/cambiar-contrasena` | `tx.sesion.findFirst()` | `servicio-ocupado.integracion.test.ts` | permitido, control positivo |
| 2 | `POST /api/auth/refrescar` | `tx.sesion.updateMany()` | `servicio-ocupado.integracion.test.ts` | permitido, control positivo |
| 3 | `POST /api/clases/:claseId/publicaciones/:publicacionId/comentarios` | `prisma.$queryRawUnsafe()` | `servicio-ocupado.integracion.test.ts` | permitido, control positivo |
| 4 | `POST /api/auth/login` | `tx.sesion.create()` | `cuentas-r3.ataque.test.ts` | permitido |
| 5 | `POST /api/auth/restablecer` | `tx.tokenCuenta.updateMany()` | `cuentas-r3.ataque.test.ts` | permitido |

El `503 SERVICIO_OCUPADO` de `entregas-01b-r1` (T-r1-1, "P2028 por HTTP") no sale como línea `"code":"P2028"` en esta corrida, igual que en ENTREGAS-01.

### Veredicto de la ronda 0 de 01a
**RONDA 0 CERRADA.**
- V-01 en verde (175 de 175).
- Reescritas solo las cinco C-n de 01a (8 archivos).
- El inventario no encuentra ninguna otra `*.ataque` que rompa por 01a.
- Solo quedan los rojos esperados: 3 del backend (C-1, C-2 y C-3) y 73 casos del frontend en los 5 archivos de C-5 y C-6, cada uno por su causa.
- PA-07 limpia, con el control positivo completo.
- Ninguna PARADA.

## Tabla de SHA-256 de las 175 `*.ataque` al cierre de la ronda 0 de 01a (base de V-01 del programador y de la ronda 1 de 01a)
Calculada con `sha256sum` sobre `git ls-files -co --exclude-standard | grep '\.ataque\.test\.tsx\?$'`, después de restaurar los cinco archivos del control. Cambian respecto de la tabla de la ronda 2 de 01e de ENTREGAS-01 solo las 8 marcadas.

| SHA-256 | Archivo | Nota |
|---|---|---|
| `BCCE2CAE771F97957D8691BEF7FFF4EC42412DAAEABF726AEB0AFC59F6F25671` | `backend/src/config/correo.ataque.test.ts` |  |
| `DCB78D222544E8DC4FBECE59468F555B04ABE971B70016E9BB17FCAE3E958580` | `backend/src/config/env.ataque.test.ts` |  |
| `71E7F049447D2D1ECEDD897C55EA0B6D31221753F0A7E7473C7AC6E8667F0A95` | `backend/src/config/logger.ataque.test.ts` |  |
| `91F620C1A27778EEBC2BED5EEC1BC9B0E3FE1199B32ED00F9DD910011D6A1805` | `backend/src/core/clases/codigo-r1.ataque.test.ts` |  |
| `262691F5786AD63B2393D0BA5FF97538F6DACF43343BED019AD23C12A07D8686` | `backend/src/core/clases/codigo-r2.ataque.test.ts` |  |
| `E769CBFCC3A83A64B51C6437F80684640A7C928AD6B8C5C1671FDFF005D7B734` | `backend/src/workers/ritmo-03c-r1.ataque.test.ts` |  |
| `294BE1AF0BF69D6C05F54E2F0D8E587C78A5527D0B64D1A224C058E31CE013D0` | `backend/test/admin-muro-02b-r1.ataque.test.ts` |  |
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
| `6E3C92C13F146A01C8DCFDC7DD04BEA59F0E2562051F6AC65F95F924EF73E4DB` | `backend/test/categorias-01a-r1.ataque.test.ts` |  |
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
| `6F72C7CC1D0F95D60C057D7406A8955C47E834C963ED53D15DF64C83049F5431` | `backend/test/entregas-01b-r1.ataque.test.ts` | Reescrita (C-2, ronda 0 de 01a) |
| `5BAAF6F8FB76320620ED4A84EFACA2B2D473460F62360E0D48738B97A0AC584A` | `backend/test/entregas-01b-r2.ataque.test.ts` |  |
| `BA1AC9B17CC9BF747522BD4EC8B87DF436008482E643B18EEA8E9A8C041C59B3` | `backend/test/formada-ch-r1.ataque.test.ts` |  |
| `EC9602D5F109B45A6D428E708D9B6CDD37A7509A6FF9031FA6FD8A2DA0E25E9B` | `backend/test/gestion-02a-r1.ataque.test.ts` |  |
| `5F4133F949D2F337A8F63B75CF82CB77114DB7812D67C1960105F5000C31A326` | `backend/test/guarda-ch-r1.ataque.test.ts` |  |
| `7A7DAC6D87EDF81059FCFF9C07471AAF49D690EC159BE4B9FD4AA32B0909A215` | `backend/test/guarda-ch-r2.ataque.test.ts` |  |
| `610EE44E5D0BCEA46EB4E3645F9ADF1998A76947A25AF7E3F8248EA3A633DF79` | `backend/test/guarda-ch-r3.ataque.test.ts` |  |
| `E5D149F3AC52B726E1FE08908249706341330F88EAA6674B9A9AC67B98B1E864` | `backend/test/guarda-clase-r1.ataque.test.ts` |  |
| `C979D2C9C420A2177FA6EBDDB78EB2CE84D5F043B94270F690916A6FC75D6F8F` | `backend/test/guarda-clase-r2.ataque.test.ts` |  |
| `20982E2B98F1B162146A211923F3D5EC19D4E170C4AA3A5BFC6F82C3B6173AAD` | `backend/test/guarda-r2.ataque.test.ts` |  |
| `2649F3D357DCB806361AC101C57FCB504B9C798B631048F0B3E200F63DA7DC30` | `backend/test/hilo-01c-r1.ataque.test.ts` |  |
| `2D2216EE9DB290B318825A6F73C346D4767CACC12D95F5CA76457A78B63FEDC3` | `backend/test/instantanea-01b-r1.ataque.test.ts` |  |
| `A8B79D5AD98270BE3747F493865708A78BB73ADD08D832584DB4464C3582777A` | `backend/test/intentos-r2.ataque.test.ts` |  |
| `2619B44EEA3370494C95AC128FCFD9E3FFC20D1581A19F549BF371F603A11D7D` | `backend/test/invitacion-flujo-03a-r2.ataque.test.ts` |  |
| `704155928183AEC193AE7E157B86B3E9361D2B63C7A47BE1ED859605FAB4FFA6` | `backend/test/invitacion-masiva-03c-r1.ataque.test.ts` |  |
| `DD9B7454E8786BF0B833D265900CCAECF595808CEBC8E9A77C9AEF15298A1038` | `backend/test/invitacion-masiva-03c-r2.ataque.test.ts` |  |
| `47663E2ADCCD34564AD9B1CAE6E99E06863A7D31FEA779793C9A805C9BD7FE0B` | `backend/test/lecturas-fx-r1.ataque.test.ts` |  |
| `3790777831A1FACB053D0719D85AB404593954416B1443A1A59530E09E2C81DC` | `backend/test/lecturas-fx-r2.ataque.test.ts` | Reescrita (C-3, ronda 0 de 01a) |
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
| `D6B9ADAF1C14A61FE369F510774EF702CFA20F28F3CB19B0EB7357440DCB0783` | `backend/test/migracion-01a-r1.ataque.test.ts` |  |
| `D95AB72A3FD3D70CE3A9027A50DB660426976C3DF1A46E92DF75066BEAC78A0C` | `backend/test/muro-c-r1.ataque.test.ts` |  |
| `7825CFC9B484DF740FA0E9562A195D1BBCAF4CAF72EA55FA847B5394AB96C125` | `backend/test/muro-c-r2.ataque.test.ts` |  |
| `8B733B86FC6D54ECE008389A59793FAE4EC4A65146EB37215E900E50A5337D46` | `backend/test/nombres-guarda-r3.ataque.test.ts` |  |
| `3FD2583A4DE7CD432B2E09A5130C23D6A59FA475E5E0AA69F23739351ACBF9CF` | `backend/test/nombres-ids-01a-r2.ataque.test.ts` |  |
| `00A6EB6F7CCD7D8790C356BEFCC96DDFDA6EACCE0BE53DE255CFE3626D8F2ADB` | `backend/test/nombres-tokens-r2.ataque.test.ts` |  |
| `80B5A848F69B429E7DADEC86C07BEC1D3E3EED8A042EFBA41CE912DED39E7BAB` | `backend/test/nowait-ch-r1.ataque.test.ts` |  |
| `AD0DAB1952E509237ACAC12BB1F6774FA9C5DE8B44D1E6928EDC65CC67A78C21` | `backend/test/referencias-01b-r1.ataque.test.ts` |  |
| `6F2ABC2CEFD77D74CD1E3ABBDCE9C41BB53D00BD4D8E5BA7E496C4441C2697E5` | `backend/test/servicio-ocupado-ch-r1.ataque.test.ts` |  |
| `A4207FC5519D72D48F9AF4AEC8A67AB0FCB369071018708B67E57151F6A43088` | `backend/test/sesiones-y-cadena.ataque.test.ts` | Reescrita (C-1, ronda 0 de 01a) |
| `70AC720F2E7FCADEE5BBCB6414887AB08129DEA7CD91DF012046953B1584E8B6` | `backend/test/sexto-paso-02a-r1.ataque.test.ts` |  |
| `C89C30851E6B409CD045017181147BF674DF947762A8DEA3F3FB981BD9B36E09` | `backend/test/tareas-01a-r1.ataque.test.ts` |  |
| `79BC7AAFC11676D36129610A4B5CD5FE5D8234D0D748487FD2F3E48C5F772C79` | `backend/test/tareas-01b-r1.ataque.test.ts` |  |
| `AE60C11CFF5C82DF4954DB48582DF4BD5A64957FF9AFAF9712AA43A038F8E189` | `backend/test/temas-01a-r1.ataque.test.ts` |  |
| `DC7B86A621062ED671C1E7174A745019133FBD410C7A2E78114B2A2C50AFFE95` | `backend/test/temas-01a-r3.ataque.test.ts` |  |
| `F09E9A0038C47D1A2223376A0AF260BAF573F0C45BF770201C48C9E30296F04B` | `backend/test/worker-03c-r1.ataque.test.ts` |  |
| `9F60F9D65D52D2021A1EB04E9F01D3CC68F22744C845BF93D6621AA4FE9713A8` | `backend/test/worker-r1.ataque.test.ts` |  |
| `77D11BD85F202A9EEC92A363DF82E63FB9A784CA9D368D49F62E61C1A2AA967B` | `backend/test/worker-r2.ataque.test.ts` |  |
| `0DE083DF355129E800D130F33D228835479C25F49ED82B6C2BCF9CF5F6E944CB` | `frontend/src/app/barra-02d-r1.ataque.test.tsx` |  |
| `B89EDE0F6AED45DFCB5E64C8909A822156CE43FD80948E72419CDCE9D4541A87` | `frontend/src/app/cache-03a-r1.ataque.test.tsx` |  |
| `E85743C0FBB8E476874A2C67334342D8D69D14153579FC1E4CCE0AE6E2B29616` | `frontend/src/app/contexto-r1.ataque.test.tsx` |  |
| `BC2BE5541006887E2A5A4A89B33046180F607D54474B0F96A73D615AFBCAC385` | `frontend/src/app/contrasena-r1.ataque.test.tsx` |  |
| `F38BCACB716D8A39ACDB3535A95603CD0D8AB02572CA57A7DF5268B01CEB6EAC` | `frontend/src/app/contrasena-r2.ataque.test.tsx` |  |
| `68FB5D092C0C8ECFCF282477EF023AAAE26F6B869656E05109DC3EFA276D842A` | `frontend/src/app/cuentas-r1.ataque.test.tsx` |  |
| `41930017715D3D6869DC7ACEFD75DE8EC3684F1F035B845ABDF8EC0F6B734DEE` | `frontend/src/app/cuentas-r2.ataque.test.tsx` |  |
| `1506C27E5F7418B5E087FD30F8809645A2FC3E2761C7249DE78F02E24AA6C7A5` | `frontend/src/app/en-espera-r1.ataque.test.tsx` |  |
| `DB48DAD405C27062621A44D3744C84CC5903892A51E5A8DF18F41383CB9C88A3` | `frontend/src/app/errores-r1.ataque.test.tsx` |  |
| `0E1D93E4DD3CBC7B5E9475A17B5CA66F0DF056BA25CB117249F4C2E2F5887A51` | `frontend/src/app/foco-barra-02d-r2.ataque.test.tsx` |  |
| `2154B5C15F696A0C7F884BFF774CF4E2A4208A5281DB9076653F8253E2385AB9` | `frontend/src/app/foco-pestana-02d-r3.ataque.test.tsx` |  |
| `F95321E604E20B533EBF2DB3C1C6C66BA2F2D87A48F075415B766551F6EE30F4` | `frontend/src/app/fondo-r1.ataque.test.tsx` |  |
| `57CB54AFD3B79464F0DF01B88FC388CEBBEAC5657D936C4C204CBAE6034B0834` | `frontend/src/app/marco-r1.ataque.test.tsx` |  |
| `446CE2CC8A4F254F94FF6313EB13837421F98749C2473AA0B8979388E7CE674A` | `frontend/src/app/muro-recuperar-c-r3.ataque.test.tsx` |  |
| `DC0365EDB436B3F2EE256882EF13F2295CDFCB83A63F9BA3939381983E43FDFC` | `frontend/src/app/muro-recuperar-c-r4.ataque.test.tsx` |  |
| `2F8056A770397C1601647277944555A48AFC4B9A2BABEB75E5898F0CC92562BB` | `frontend/src/app/muro-rutas-c-r1.ataque.test.tsx` |  |
| `0EEFED2C05D76B0790A437E9465A898A9076083B1F046F8785145CFAAD0DA379` | `frontend/src/app/registro-maestro-03b-r1.ataque.test.tsx` |  |
| `053E867A904AFA3C09EEF92CA2E03E929D9F9C93F714040856F40C7418721BBE` | `frontend/src/app/router.ataque.test.tsx` |  |
| `F0657FB91F7B3ACCF64726292F9324C6742C1AC537C6C4A1985EC4E32AE09C83` | `frontend/src/app/rutas-02c-r1.ataque.test.tsx` |  |
| `C7946F5F5D5D16D36B395ADC2AD9928ACC7FD9839875FB64532B51489756730B` | `frontend/src/app/rutas-clases-r1.ataque.test.tsx` |  |
| `F090CBD8E8C9B0AF52D4FC19547B07E9B6413F5414CC4B10862F01E29818DDDC` | `frontend/src/app/sesion-r2.ataque.test.tsx` |  |
| `7CF085827D8FA981E56822431B8A5C6B7AB08B44477D43F739EBC269D2B8F899` | `frontend/src/components/layout/estatico-r1.ataque.test.ts` |  |
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
| `932E76314E0447DA1790C3C86CA48545EEA834FEAF6F706C4D405B7EA62BE872` | `frontend/src/features/clases/alumnos-b-r1.ataque.test.tsx` |  |
| `55DC274ECA96DA4360848B88F9F2A839AC815031490AB57FF38DE074512D632C` | `frontend/src/features/clases/alumnos-b-r2.ataque.test.tsx` |  |
| `371518E4309F14201A92D29F9436A97A19801B506D45114964FBCFE3F5CD4183` | `frontend/src/features/clases/alumnos-b-r3.ataque.test.tsx` |  |
| `266D088DD727F18AF8C8A106B8D9C4DBED75753E4B1B4ABB12F3A4DF870ECB7F` | `frontend/src/features/clases/alumnos-b-r4.ataque.test.tsx` |  |
| `856CFFBD9C743F9815DAF731487E29DC5F5272545DC15820A70BAF86ECFA6527` | `frontend/src/features/clases/alumnos-b-r5.ataque.test.tsx` |  |
| `CC2FDD28CEB3DE642EE01D07773271D7154811B1F3756333F1DFB285A386E6CC` | `frontend/src/features/clases/archivos-d-r1.ataque.test.tsx` |  |
| `36C32BAD5F632CAD5D76BCA14C74779DDD7CF9B9465A69522886DB770A508B22` | `frontend/src/features/clases/archivos-d-r2.ataque.test.tsx` |  |
| `14CB04B6B56BF2F83DE04DAB863E7843FACA3A585E70FEBC93EE3588F06AB144` | `frontend/src/features/clases/archivos-d-r3.ataque.test.tsx` |  |
| `71148A960F7EF6995904B3DB6DFD0B0E3BA6AF697C45399669EC1DD81CC7D1AA` | `frontend/src/features/clases/cargar-mas-02c-r2.ataque.test.tsx` |  |
| `A3880B67FFAA0D15763D1C761CEF1FF8472029C77BFB2211AB079EADB1685325` | `frontend/src/features/clases/categorias-01e-r1.ataque.test.tsx` |  |
| `66C0B873BC8B9D8E9E01AC871BD6AAAB4328508BEB5EC9371D69463D7C12430D` | `frontend/src/features/clases/categorias-01e-r2.ataque.test.tsx` |  |
| `DD4B9C07F940B55085B7EF8113994E3DB60FAD6A2FF3B5809E0DCB8F2568E336` | `frontend/src/features/clases/clases-admin-02c-r1.ataque.test.tsx` |  |
| `5F0679D8CFACC8BCE01989C04A415DC5B546625EB7DEC92F03959DE5A0F89815` | `frontend/src/features/clases/clases-r1.ataque.test.tsx` |  |
| `C7AD5EDC733E374117A9277F1C2987E84CC2930C77EB4C720CCF15CC9F5FAB45` | `frontend/src/features/clases/clases-r2.ataque.test.tsx` |  |
| `A835A11D29AEDB8F77F91E826A22C2B7CF5322FCED3F6BED0C1ACBF7C75A4E61` | `frontend/src/features/clases/clases-r3.ataque.test.tsx` |  |
| `86B04D234527ECEEFCA35B07CE89E6B7CE0B6AFE5CCDEE2F005E6A4219F0495A` | `frontend/src/features/clases/clases-r4.ataque.test.tsx` |  |
| `AF15BD75457BB2560E1D60BA3EB369786FE869BC3DCAE5FCE144C52049D7E4E8` | `frontend/src/features/clases/estatico-02c-r1.ataque.test.ts` |  |
| `CDD1ED8890859AE3E884822FC7074852A2173105114745D83FE9A15C1C47C626` | `frontend/src/features/clases/estatico-r1.ataque.test.ts` |  |
| `DE23D395DFE7A6F3D6D15EB48CB574599DC9D8204E5A90B255C0C10D25A186FA` | `frontend/src/features/clases/fila-01d-r1.ataque.test.tsx` |  |
| `54A5DAA368528F1B64BD809C79964E30C42C3A71F76E2013643695FAAFA6C73E` | `frontend/src/features/clases/foco-02c-r3.ataque.test.tsx` |  |
| `80EFD85B74264C125683DFB6D631A10DB40887C5E7315D5EF6FF7B49357EAAD7` | `frontend/src/features/clases/foco-02c-r4.ataque.test.tsx` |  |
| `32C1F6A48BA3241963CF6864BD2236A0675425241D4389B524CBE805C358A5CC` | `frontend/src/features/clases/foco-02c-r5.ataque.test.tsx` |  |
| `FDC9F0D1D5BDF7D8C6E9E7F15CCFA2D909F717E9465A8279F5540FB704958BB9` | `frontend/src/features/clases/foco-pestana-02d-r3.ataque.test.tsx` |  |
| `0F3F8173AD209418B1B3106C755EC83808581389D65A8549B93C69B29B22F013` | `frontend/src/features/clases/heredados-02d-r1.ataque.test.tsx` |  |
| `0F60F1582FCE6E5EFAF9BF6856133DC30F1DC4EB9C3B7FEA19F90A330F8335B3` | `frontend/src/features/clases/inicio-sin-datos-02c-r1.ataque.test.tsx` |  |
| `7C434A0E54E70B12D4B2A3DE22FFB4DBF5F28A1CFBD2290C22E8A2B59EDF0E16` | `frontend/src/features/clases/inicio-sin-datos-r2.ataque.test.tsx` |  |
| `A4DE3A7DC35DAEDFF86FD41349EA09140213E918613603D0985C698FF41D29F7` | `frontend/src/features/clases/maestros-02c-r1.ataque.test.tsx` |  |
| `B487B8C8C95BADC6BC78F3BE72B7B5F809381E8C69127D6600254B872DE62EBC` | `frontend/src/features/clases/muro-02c-r1.ataque.test.tsx` |  |
| `9D35E0DA961248750C2948E3F69305856BCDD25E78E01C64AA50DCDFEEE93F8D` | `frontend/src/features/clases/muro-c-r1.ataque.test.tsx` |  |
| `C50A5D53AD16EAFF69ABEC6F531B6C0EDD74CE4ECDA02380EDFBF66F7E5BA89B` | `frontend/src/features/clases/muro-c-r2.ataque.test.tsx` |  |
| `1AC0F4A0474E7F334BC57D4F2BA23954E8C280FA0C3573A26350D0ADE431FF75` | `frontend/src/features/clases/muro-c-r3.ataque.test.tsx` |  |
| `67B60A9A5363F88E6CEBA210C27452B8D639F6DF798AA4E506DC54BB2312249A` | `frontend/src/features/clases/personas-02d-r1.ataque.test.tsx` |  |
| `2911195DC97BF9B25E7E874E0A0B6C9C0D25A9A878C2E821A752D340D219A740` | `frontend/src/features/clases/refactor-01c-r1.ataque.test.tsx` |  |
| `4303EAC77B98E8978495D9E68FD7725AC436F9DB757DBC0C02C59051436908FA` | `frontend/src/features/clases/reloj-01e-r4.ataque.test.tsx` |  |
| `A4AA15CEF1A377EED688DAB1B92E5CA4A3943490144CEC861CF7B482845B0362` | `frontend/src/features/clases/segmentado-02d-r1.ataque.test.tsx` |  |
| `D899C19BA982FBDE2208BBC7FA009869556C84BD4650586DBD9EE90B22234E47` | `frontend/src/features/clases/tarjeta-01d-r1.ataque.test.tsx` |  |
| `97AF503E763F7DFF9FCFBDC72862CD21DE6AF8E51D3EC41134F8475D98AE2DF6` | `frontend/src/features/clases/tarjeta-01d-r2.ataque.test.tsx` |  |
| `7F9D22E5904192DCC00465FADCABF36AA5DE3CD16D6A319A41A66340BB9BD6A8` | `frontend/src/features/clases/trabajo-01e-r1.ataque.test.tsx` |  |
| `F6924BC272A5240CF97D35729C797CC10960ED7CF94FE1BE1B69CA2DF6C1CF8F` | `frontend/src/features/clases/trabajo-01e-r2.ataque.test.tsx` |  |
| `9866EF34167061E2715B65A352C55D08C7E9268033E879AE633C7FD568E4D49F` | `frontend/src/features/clases/ventana-02c-r2.ataque.test.tsx` |  |
| `008E5C606F249D15E3816E27E3E97FD7D7FBA0F8697751A156665A76694B3A18` | `frontend/src/features/clases/ver-mas-01e-r3.ataque.test.tsx` |  |
| `4F486CA37D2A2BB6CC26754281D2ADCE086A9D8D4485A069DE7AE5D54E360ACF` | `frontend/src/features/tareas/entregas-01d-r1.ataque.test.tsx` | Reescrita (C-5, ronda 0 de 01a) |
| `93A5A0A648669E9C96494A62B2B16082B07296F279E2892BF2C8D47834EE2FC1` | `frontend/src/features/tareas/entregas-01d-r2.ataque.test.tsx` | Reescrita (C-5, ronda 0 de 01a) |
| `432DCDDF119DD0E32E49ADC42D5F51D197698C8896E1058C505AB31F4A8EE838` | `frontend/src/features/tareas/entregas-01d-r3.ataque.test.tsx` | Reescrita (C-5, ronda 0 de 01a) |
| `FD66C82D400E0F0A9709960934B555568642D9E4B5E41F31AD6606A620836982` | `frontend/src/features/tareas/entregas-01e-r1.ataque.test.tsx` | Reescrita (C-6, ronda 0 de 01a) |
| `496652BC59817166F53E00CB828F2119C857C2834063A31764D7876DC150C930` | `frontend/src/features/tareas/entregas-01e-r2.ataque.test.tsx` | Reescrita (C-6, ronda 0 de 01a) |
| `BFDED7507BC684EA9858CD76517EF0E4C23CBC69E5A19F381E6EC522FD6156E6` | `frontend/src/features/tareas/tareas-01a-r1.ataque.test.tsx` |  |
| `B778FC2E6BB0A8F8715A56877B3B781439CA214C8A9C8AE126F610C95229882A` | `frontend/src/features/tareas/tareas-01d-r1.ataque.test.tsx` |  |
| `BF3C999033195CAC778A82A579E44729FB07A405F5CDB41D8E7DC932CB71F942` | `frontend/src/features/tareas/tareas-01d-r2.ataque.test.tsx` |  |
| `3567D7C23D2CF6A2FD538CD6822EF60AC3CFFEAC036394ED1E3559DEBE492C57` | `frontend/src/features/tareas/tareas-01d-r3.ataque.test.tsx` |  |
| `6BBE2BD85E2B5500FBAB4D0F51630C0C8E9D65B1A63045AD1FA906298A92A435` | `frontend/src/features/tareas/tareas-01d-r4.ataque.test.tsx` |  |
| `C71CBA65DD284D7AF11CBC812B6BCF75BAA373939EDB8318E731858D9C50173F` | `frontend/src/lib/format-d-r1.ataque.test.ts` |  |
| `89DBBB70D5DC404C3D74DB5391D10855C8CB1D6B4C643B6147B3CE6FFB2637AF` | `frontend/src/lib/format-d-r2.ataque.test.ts` |  |
| `BFA7DED62F7A1402590D438A1CC51060A63FA019AD47D3EB5740E43383064A2A` | `frontend/src/lib/format-d-r3.ataque.test.ts` |  |
| `10C730348D18FF8DAE7B3623751D31122AA58560B564AD191717FA1938A6F8CE` | `frontend/src/services/apiClient.ataque.test.ts` |  |
| `CED32202A8DEB611027E965FB5EBD56A9848A1EE3467474BFBAED64374D3BF5B` | `frontend/src/styles/clases-r1.ataque.test.ts` |  |
| `B8085BCBBC7F4B6276BF3A87FB7BA0BC887953A8C6CE372354A7F3F1B5037582` | `frontend/src/styles/tokens-r1.ataque.test.ts` |  |

## Ronda 1 de 01a
Veredicto: **ROTO** (1 hallazgo: T-01, media).
Verificación propia: lint del backend en verde (código 0) · test del backend `1 failed | 2544 passed (2545)`: el único rojo es T-01, mío y por un defecto real.

Base: el árbol de trabajo tras "## 01a — implementación" de `resumen-programador.md`, aceptado por el manager ("## Verificación del resumen — CALIFICACIONES-01a"). Solo escribí tres archivos `*.ataque` nuevos en `backend/test/` y esta sección. No toqué código de producción, `shared/`, pruebas normales, `*.ataque` existentes ni nada de "No se toca". El único formateador que corrí fue `npx prettier --write` sobre mis tres archivos, desde `backend/`.

### V-01
- **Base:** la tabla de 175 `*.ataque` de la ronda 0 de 01a (arriba).
- **Método:** `git ls-files -co --exclude-standard | grep -E '\.ataque\.test\.tsx?$' | sort | xargs sha256sum` y `diff` contra la tabla.
- **Antes de escribir nada:** 175 de 175 iguales, ni uno de más ni de menos. La única línea del `diff` era el nombre `apiClient.ataque.test.ts`, que mi `tr` pasó a minúsculas; el hash es el mismo. **V-01 en verde.**
- **Al cerrar la ronda:** hay 178 archivos. Los 175 de la tabla siguen iguales y se suman mis 3 nuevos (tabla al final).

### Archivos nuevos y casos
Comando: `cd backend; npx vitest list test/calificaciones-01a-r1.ataque.test.ts test/calificaciones-carreras-01a-r1.ataque.test.ts test/calificaciones-estatico-01a-r1.ataque.test.ts`. Da 22 casos, 15 + 5 + 2, y el total del backend pasa de 2523 a 2545.

**`backend/test/calificaciones-01a-r1.ataque.test.ts` (15 casos, por HTTP).** Cada respuesta pasa por `sinFuga` en el mismo caso que la pide (no depende del orden, a diferencia de N-17). Los cuerpos con -0, 1e400 o 2^53 van como JSON crudo, porque `JSON.stringify` los altera.
- CAL-T-01: calificar en cero a quien no entregó no lo cuenta entre quienes entregaron: en la lista de entregas, entregadas cuenta solo a la alumna que sí entregó. **ROJO (T-01).**
- CAL-T-02: la versión como texto, decimal, negativa, 1e400, 2^53 y 2^31 no escriben ni encolan y nunca son 500; la misma versión en dos pestañas del mismo maestro da un 200 y un 409.
- CAL-T-03: en texto crudo, la versión 1.0 vale como 1 y -0 como 0 (sin fila, tarea cerrada).
- CAL-T-04: un cuerpo que no es objeto (null, texto, número, vacío o JSON roto) responde 400 con el formato de error, sin escribir.
- CAL-T-05: -0 y 1e-2 se guardan como 0 y 0.01 (sin -0 en la respuesta); 0.1 + 0.2, 7.785, 0.001, texto, 1000.01 y 21 puntajes responden 400 sin escribir.
- CAL-T-06: los criterios de otra tarea de la misma clase, con la misma forma, responden 409 RUBRICA_MODIFICADA sin escribir ni encolar.
- CAL-T-07: con máximos que no dividen los puntos de la tarea, la calificación guardada y la respondida son la centésima más cercana, con las mitades hacia arriba.
- CAL-T-08: la fila asignado que creó un comentario de la alumna en el hilo se califica con la versión que da la lectura del maestro, y el hilo se conserva.
- CAL-T-09: tras calificar sin entrega, reabrir la tarea (fecha futura y acepta tardías) se guarda, la alumna sigue sin poder entregar (409 ENTREGA_CALIFICADA) y recalificar funciona.
- CAL-T-10: con calificaciones, la misma rúbrica con espacios de más en los extremos es idéntica (200 y los mismos ids); con otra capitalización no lo es (409 sin escribir).
- CAL-T-11: con calificaciones, cambiar solo si acepta tardías o cómo se entrega se guarda; cambiar solo los puntos es 409 (y el admin recibe 403 por autoría, sin revelar nada); omitir la rúbrica en el cuerpo es vaciarla (409).
- CAL-T-12: el comentario de devolución no cambia el muro, no se lista por la ruta de comentarios de la publicación de la tarea y no se borra por las rutas del muro.
- CAL-T-13: un comentario de 1000 caracteres visibles pasa; 1001, solo invisibles o null responden 400 sin escribir ni encolar.
- CAL-T-14: con la alumna deudora (sin restricción), su lectura trae la calificación sin version; las lecturas y el hilo del maestro y del admin no traen correo, estado de pago ni rol.
- CAL-T-22: con los ids de la ruta en mayúsculas, la calificación cae en la entrega correcta y el aviso lleva los ids en minúsculas, iguales a los de la base.

**`backend/test/calificaciones-carreras-01a-r1.ataque.test.ts` (5 casos).** La retención es propia: una fila de `entregas` o de `publicaciones` con `FOR UPDATE`, con `timeout` de 30 s y `maxWait` de 5 s. Cada operación se da por formada con `formadasDetrasDe`, que solo cuenta esperas de fila. Ninguna `LOCK TABLE`.
- CAL-T-15: con una calificación a medias (tarea FOR SHARE, comprobación de la FK pendiente), el borrado confirmado del admin y vaciar la rúbrica esperan: 200, 204 y 404, sin 23503, sin deadlock y sin puntajes huérfanos.
- CAL-T-16: con el borrado confirmado del admin a medias (tarea FOR UPDATE), recalificar y vaciar la rúbrica esperan y reciben 404 TAREA_NO_ENCONTRADA, sin 23503 ni puntajes huérfanos.
- CAL-T-17: con la primera calificación de la tarea a medias, cambiar la rúbrica espera y recibe 409 TAREA_CON_CALIFICACIONES; los criterios y los puntajes quedan intactos.
- CAL-T-18: con una calificación a medias, mover la tarea de tema espera y después se guarda; calificar a otra alumna de la misma tarea no espera.
- CAL-T-19: calificar, recalificar, comentar, anular, cambiar el título y mover de tema a la vez, en tres rondas, nunca da 500 ni deadlock, y nunca deja puntajes de una entrega que no está calificada.

**`backend/test/calificaciones-estatico-01a-r1.ataque.test.ts` (2 casos, estáticos).**
- CAL-T-20: en adapters/queue/colas.ts ningún comentario nombra el borrado crudo, los niveles de aislamiento ni la opción de instantánea (§D-0.9, sin la excepción de los nombres de cola).
- CAL-T-21: miEntregaParaResponder no nombra version, alumno, correo, estado de pago ni restricción; ninguna respuesta de handlers/respuestas-de-entrega.ts los nombra salvo la version del maestro.

### Hallazgos
#### T-01 — Una calificada sin entrega cuenta como "entregó" en la lista de entregas
- **Severidad:** media.
- **Prueba:** `backend/test/calificaciones-01a-r1.ataque.test.ts`, "CAL-T-01: calificar en cero a quien no entregó no lo cuenta entre quienes entregaron: en la lista de entregas, entregadas cuenta solo a la alumna que sí entregó".
- **Escenario:**
  - Una tarea cerrada (vencida hace 2 h y sin entregas tardías) con dos alumnas.
  - Una entregó y se califica con 9.
  - La otra no entregó y se califica en 0, como permite P-03 (c′).
  - Después, `GET /api/clases/:claseId/tareas/:tareaId/entregas` como maestra.
- **Esperado:**
  - `entregadas: 1` y `total: 2`.
  - La fila de la que no entregó viene en `calificado`, con `fechaEntrega: null`. Esto sí lo hace bien.
- **Obtenido:** `entregadas: 2` (`una calificada sin entrega se cuenta como entregada: expected 2 to be 1`). La vista "Entregas" de ENTREGAS-01e pintaría "Entregaron 2 de 2 alumnos." aunque una alumna no entregó nada.
- **Causa probable:**
  - `listarEntregasCon` (`backend/src/adapters/db/entregas.ts`, el `count` de `entregadas`) filtra por `ESTADOS_ENTREGADOS = ["entregado", "calificado"]` (`entregas.ts:119`, con el comentario "Las que cuentan como entregas (S-06 y RF-35)").
  - Esa regla daba por hecho que `calificado` implica que hubo entrega, y P-03 (c′) la rompe: ahora una fila puede estar `calificado` con `fecha_entrega` nula (`entregas_fecha_segun_estado` relajado en §D-1).
  - El plan no lo recoge: §D-R0 y la lista "Revisadas y sin cambio" no mencionan `listarEntregas`.
- **Requisito violado:** RF-35 ("Ver por tarea quiénes entregaron y quiénes no"), con P-03 (c′) (§D-1, §D-3).
- **Hermanos, para quien corrija (no son hallazgos aparte):**
  - **`borrarTarea`** (`adapters/db/tareas.ts:529`, `ESTADOS_QUE_CUENTAN`):
    - Que una calificada sin entrega impida el borrado del maestro es lo que dice el plan (§D-3 carreras (e): "la calificada cuenta"; CAL-1A12 (e) lo fija).
    - Pero el mensaje de `TAREA_CON_ENTREGAS` diría "Esta tarea tiene 1 entrega…" de una tarea donde nadie entregó.
    - Si el texto debe cambiar, lo decide el manager. Lo anoto como O-r1-2.
  - **01b, el gradebook y "Mis calificaciones":** el plan ya distingue "calificada sin entrega" (CAL-1B01, CAL-1B05; el filtro `entregadas` usa solo `estado: "entregado"`, §D-7). Lo vigilo en la ronda de 01b.

### Atacado sin hallazgos (una línea por ataque)
**N-16, la FK diferida de `puntajes_rubrica.criterio_id`:**
- Con una calificación a medias (tarea `FOR SHARE`, la comprobación de la FK pendiente para el `COMMIT`), el borrado confirmado del admin y vaciar la rúbrica esperan. Responden 200, 204 y 404, sin 500, `23503`, `40P01` ni `P2003`, y no quedan tarea, criterios, entregas ni puntajes (CAL-T-15).
- Con el borrado del admin a medias (tarea `FOR UPDATE`, detenido al borrar la publicación), recalificar y vaciar la rúbrica reciben 404, sin restos (CAL-T-16).
- La primera calificación a medias contra un cambio de rúbrica: 200 y 409 `TAREA_CON_CALIFICACIONES`, con los criterios y los puntajes intactos (CAL-T-17).
- El borrado de un criterio con puntajes por SQL ya lo cubre CAL-1A01, que falla al confirmar sin borrar nada.
- **Resiste.** El único que borra criterios (`editarTarea`) y las cascadas (`borrarTarea`, que filtra `tipo: "tarea"`; el borrado del muro solo admite anuncio y material) esperan antes en la fila de `tareas`. Busqué con grep en `src/` otro `criterioRubrica.delete`, `entrega.delete` o `tarea.delete`, y no hay.

**N-17, el caso "sin fuga" de CAL-1A17:**
- Aislado (`npx vitest run test/calificaciones-autorizacion.integracion.test.ts -t "sin fuga"`) falla con `expected 0 to be greater than or equal to 18`.
- Con `--sequence.shuffle`:
  - Semilla 1: falla (`expected 3 …`).
  - Semilla 2: pasa con las 18 respuestas, porque corrió al final.
  - Semilla 3: falla (`expected 3 …`).
- **Nunca pasa en vacío:** el umbral de 18 es exactamente el total de respuestas de los otros seis casos. No es hallazgo. Anoto su fragilidad como O-r1-1.

**Versión:**
- La versión como texto, decimal, negativa, 1e400, `null`, 2^53 y 2^31 responde 400 o 409, nunca 500, y sin escribir.
- La misma versión en dos pestañas del mismo maestro da 200 y luego 409 `ENTREGA_MODIFICADA`, con un solo aviso.
- En texto crudo, 1.0 vale como 1 y -0 como 0 (CAL-T-02, CAL-T-03).

**Nada a medias tras un 409 o un 400:**
- La foto de entrega, puntajes, comentarios y trabajos es igual antes y después en CAL-T-02, CAL-T-04, CAL-T-05, CAL-T-06, CAL-T-10 y CAL-T-13.
- Las carreras no dejan puntajes sin calificación (CAL-T-19).

**Carreras:**
- Calificar contra mover de tema (en serie, 200 y 200) y contra calificar a otra alumna de la misma tarea (no espera) en CAL-T-18.
- Una ráfaga de tres rondas que mezcla calificar y recalificar (dos maestros), la misma versión dos veces, comentar en el hilo, anular, cambiar el título y mover de tema: ningún 500, `deadlock`, `23503` ni `P2028`. Al final, cada entrega tiene puntajes si y solo si está calificada (CAL-T-19).

**Forma del cuerpo:**
- `null`, texto, número, vacío, JSON roto y arreglo responden 400 con el formato `{ error }` (CAL-T-04).
- Con la misma forma, los criterios de otra tarea de la clase responden 409 `RUBRICA_MODIFICADA` (CAL-T-06).
- 21 puntajes responden 400 (CAL-T-05).
- El criterio repetido en mayúsculas ya lo cubre CAL-1A14.

**Escala y redondeo por la API:**
- 3/9 de 10 da 3.33, 1/9 da 1.11 y 5/9 da 5.56.
- 0.01 de 2 sobre 1 da 0.01 (la mitad sube) y 0.01 de 8 sobre 1 da 0.
- 2.99 de 3 sobre 100 da 99.67 y 999.99 de 1000 sobre 1000 da 999.99.
- 20 criterios de 50 sobre una tarea de 1: completos dan 1, y uno en 44.99 da 0.99.
- La base y la respuesta coinciden en todos (CAL-T-07).
- -0 se guarda 0 y nunca sale -0; 1e-2 se guarda 0.01. 0.1 + 0.2, 7.785, 0.001, "8", 1000.01 y 10.001 responden 400 `VALIDACION` (CAL-T-05).

**Calificar sin entrega (P-03 c′):**
- Una fila `asignado` que solo tiene hilo, en una tarea cerrada, se califica con la versión 0 de la lectura del maestro y conserva el hilo (CAL-T-08).
- Reabrir después la tarea no le devuelve la entrega a la alumna, y recalificar funciona (CAL-T-09).
- Antes de vencer, después de vencer y sin fila ya lo cubren CAL-1A04 y CAL-1A13. El milisegundo exacto no se puede fijar por la API (la hora la pone el handler); lo cubre la matriz unitaria de CAL-1A04.

**Rúbrica congelada (P-04):**
- Con calificaciones:
  - Espacios, CR/LF o tabuladores en los extremos se normalizan y la rúbrica es idéntica (200, mismos ids).
  - Otra capitalización responde 409 sin escribir (CAL-T-10).
  - Cambiar solo `aceptaTardias` o `requiereAdjuntos` se guarda; cambiar solo los puntos responde 409; omitir `rubrica` equivale a vaciarla y responde 409.
  - El admin recibe 403 `EDICION_NO_PERMITIDA` por autoría antes del conteo (CAL-T-11).
- Otro orden, la rúbrica vaciada, otro máximo y mover de tema ya los cubre CAL-1A16.

**Fugas:**
- Ninguna de las respuestas de mis tres archivos contiene `estadoPago`, `accesoRestringido`, `motivoRestriccion`, `email`, `"rol"`, `deudor` ni `@`. Se revisa caso por caso, también con la alumna deudora y en los hilos.
- La alumna no recibe `version` (CAL-T-14, CAL-T-21).
- El admin no califica por ningún camino: `PUT` 403 (CAL-1A17). No edita los puntos de la tarea de otra autora: 403 (CAL-T-11).

**Hilo:**
- El comentario de devolución:
  - Queda con `publicacionId` nulo y la maestra como autora.
  - No cambia ni un byte del muro del maestro y no aparece en el de la alumna.
  - No se lista por `GET …/publicaciones/:tareaId/comentarios`.
  - `DELETE …/publicaciones/:tareaId/comentarios/:id` y `DELETE …/mis-comentarios/:id` responden 404 y el comentario sigue ahí (CAL-T-12).
- 1000 caracteres visibles pasan. 1001, solo invisibles, solo espacios, `null` y un número responden 400 sin escribir (CAL-T-13).
- Que no encola `COMENTARIO_CREADO` ya lo cubre CAL-1A09.

**Ids en la ruta:** en mayúsculas, la calificación cae en la fila correcta y el trabajo `CALIFICACION_PUBLICADA` lleva `{ entregaId, tareaId, claseId, version }` en minúsculas, iguales a la base (CAL-T-22).

**Migración sobre datos de ENTREGAS-01** (lo que reservé en la ronda 0):
- Lo cubre CAL-1A01: en un esquema aparte, la migración se aplica sobre una asignada (versión 2, con hilo) y una entregada con retraso, enlaces y archivo, que quedan iguales y sin calificación. Los cinco `CHECK` quedan validados y la FK, diferida.
- Leí el caso y lo corrí en la suite completa. No le sumé otro.

**Revisión estática:**
- En los archivos nuevos y cambiados de `backend/src` no hay `$queryRawUnsafe`, `console.`, `notificacion`, `resend` ni `LOCK TABLE`.
- El SQL nuevo (`bloquearTareaParaCalificar`) va etiquetado y con parámetros.
- No hay consultas dentro de ciclos (`deleteMany` y `createMany` de una sentencia).
- `colas.ts` está limpio de las tres categorías de §D-0.9 que CAL-1A18 le deja sin vigilar (CAL-T-20, por N-13).

### No atacado y por qué
- **Frontend:** 01a no cambia código de producción del frontend y mis pruebas no lo tocan. Por la instrucción de la ronda no corrí su suite. Su `lint` y su `test` en verde los reportan el programador y el manager.
- **El milisegundo exacto de la fecha límite por la API:** el handler toma `new Date()` y la API no expone un reloj. Lo cubre la matriz unitaria CAL-1A04, con el reloj explícito.
- **Navegador:** no aplica (sin interfaz en 01a); ningún agente abre navegadores.
- **N-14 y N-15** (valores por defecto en ramas inalcanzables de `decidirCalificacion` y el `if` anidado de `calificacionDe`): son de estilo. Comprobé que las ramas son inalcanzables (`formaCorresponde` exige el mismo conjunto de ids, sin repetidos, y el `CHECK` según estado impide la otra) y no escribí una prueba roja para un detalle que ya está anotado.

### Observaciones (no son hallazgos)
- **O-r1-1 (N-17):** el caso "sin fuga" de CAL-1A17 no pasa en vacío, pero depende del orden: falla aislado y falla con `--sequence.shuffle` salvo cuando le toca correr al final. Si alguien parte el archivo o activa el orden aleatorio, se pone rojo sin que haya defecto. Lo decide el manager.
- **O-r1-2 (hermano de T-01):** el `409 TAREA_CON_ENTREGAS` de `borrarTarea` cuenta como "entrega" una calificada sin entrega, como manda el plan, y su mensaje dice "Esta tarea tiene N entregas" aunque nadie haya entregado. Lo decide el manager.

### PA-07 de la corrida final del backend
**Fuente:** `cd backend; npm test > <scratchpad>/r1/r1-test-back.txt 2>&1`, de 15:01:31Z a 15:03:50Z.
- **Método:** conté con `grep -o … | wc -l`. Para atribuir, `<scratchpad>/r1/pa07.mjs` empareja cada línea con el último "incoming request" del mismo `pid` y el mismo `requestId`, por app.

| Término | Cuenta |
|---|---|
| `40P01` | 0 |
| `deadlock detected` | 0 |
| `could not serialize` | 0 |
| `too many clients` | 0 |
| `"Error no controlado"` | 10, exactamente el inventario I-1 de la ronda 0 |
| `"code":"P2028"` | 5, todos permitidos |
| (aparte) `Unable to start a transaction` (`maxWait`) | 0 |

- **Control positivo: completo.** Los tres `P2028` deterministas de `servicio-ocupado.integracion.test.ts` salen en el mismo proceso (`pid` 26384), con nivel 40:
  - `POST /api/auth/cambiar-contrasena` › `tx.sesion.findFirst()`;
  - `POST /api/auth/refrescar` › `tx.sesion.updateMany()`;
  - `POST /api/clases/:claseId/publicaciones/:publicacionId/comentarios` › `prisma.$queryRawUnsafe()`.
- **Los dos de `cuentas-r3.ataque.test.ts`,** en el `pid` 25740, nivel 40: `POST /api/auth/login` › `tx.sesion.create()` y `POST /api/auth/restablecer` › `tx.tokenCuenta.updateMany()`.
- **Los diez `"Error no controlado"`:**
  - 1 a 6: `POST /api/auth/login`, cinco "fallo simulado de la base en la búsqueda" y uno "… al crear la sesión", de `intentos-r2.ataque`, `pid` 28284.
  - 7 a 9: `POST /api/clases/:claseId/archivos`, `POST …/archivos/:archivoId/descarga` y `GET …/publicaciones`, el `ZodError` de la URL del almacén, de `archivos-d-r2.ataque` T-39, `pid` 2704.
  - 10: `GET /api/prueba/error-comun` › `Error("boom")`, de `salud.integracion`, `pid` 26796.
- Mis pruebas no provocan a propósito ningún `"Error no controlado"` ni ningún `P2028`. En las dos corridas aisladas de mis archivos de HTTP, los siete términos dan 0.
- Ningún `Test timed out` ni intermitencia (PA-12 no aplica). **PA-07: limpia.**

### Comandos y última línea
| Comando (uno a la vez, nunca dos suites juntas) | Código | Última línea / resumen |
|---|---|---|
| `cd backend; npx vitest run test/calificaciones-autorizacion.integracion.test.ts -t "sin fuga"` (N-17) | 1 | `Tests  1 failed \| 6 skipped (7)` |
| `cd backend; npx vitest run test/calificaciones-autorizacion.integracion.test.ts --sequence.shuffle --sequence.seed=1` / `=2` / `=3` | 1 / 0 / 1 | `Tests  1 failed \| 6 passed (7)` / `Tests  7 passed (7)` / `Tests  1 failed \| 6 passed (7)` |
| `cd backend; npx vitest run test/calificaciones-01a-r1.ataque.test.ts` (antes del arreglo de mi prueba CAL-T-11) | 1 | `Tests  2 failed \| 12 passed (14)`: T-01 y un error mío en CAL-T-11 (esperaba 409 del admin; es 403 por autoría), corregido |
| `cd backend; npx vitest run test/calificaciones-carreras-01a-r1.ataque.test.ts` | 0 | `Tests  5 passed (5)` |
| `cd backend; npx vitest run test/calificaciones-estatico-01a-r1.ataque.test.ts` | 0 | `Tests  2 passed (2)` |
| `cd backend; npx prettier --write <mis tres archivos>` | 0 | `test/calificaciones-estatico-01a-r1.ataque.test.ts 5ms (unchanged)` |
| `cd backend; npm run lint` | 0 | `> tsc -p tsconfig.json --noEmit && tsc -p tsconfig.test.json` (antes: `All matched files use Prettier code style!`) |
| `cd backend; npm test` (corrida final) | 1 | `npm error command C:\WINDOWS\system32\cmd.exe /d /s /c vitest run`; resumen: `Test Files  1 failed \| 205 passed (206)` · `Tests  1 failed \| 2544 passed (2545)` · `Duration  133.85s` |
| `cd backend; npx vitest list <mis tres archivos>` | 0 | 22 líneas (15 + 5 + 2) |

El único rojo de la corrida final es `test/calificaciones-01a-r1.ataque.test.ts > … > CAL-T-01`, con `una calificada sin entrega se cuenta como entregada: expected 2 to be 1`. Es T-01: se queda en rojo.

### Veredicto de la ronda 1 de 01a
**ROTO.** Hallazgos: crítica 0, alta 0, media 1 (T-01), baja 0.
- V-01 en verde: 175 de 175 iguales y 3 archivos nuevos.
- PA-07 limpia, con el control positivo completo.
- N-16 resiste en los dos órdenes.
- N-17 no pasa en vacío (O-r1-1).
- Ninguna PARADA.

## Tabla de SHA-256 de las 178 `*.ataque` al cierre de la ronda 1 de 01a (base de V-01 de la ronda siguiente)
Calculada con `sha256sum` sobre `git ls-files -co --exclude-standard | grep -E '\.ataque\.test\.tsx?$'`. Los 175 de la ronda 0 no cambian; las 3 nuevas van marcadas.

| SHA-256 | Archivo | Nota |
|---|---|---|
| `BCCE2CAE771F97957D8691BEF7FFF4EC42412DAAEABF726AEB0AFC59F6F25671` | `backend/src/config/correo.ataque.test.ts` |  |
| `DCB78D222544E8DC4FBECE59468F555B04ABE971B70016E9BB17FCAE3E958580` | `backend/src/config/env.ataque.test.ts` |  |
| `71E7F049447D2D1ECEDD897C55EA0B6D31221753F0A7E7473C7AC6E8667F0A95` | `backend/src/config/logger.ataque.test.ts` |  |
| `91F620C1A27778EEBC2BED5EEC1BC9B0E3FE1199B32ED00F9DD910011D6A1805` | `backend/src/core/clases/codigo-r1.ataque.test.ts` |  |
| `262691F5786AD63B2393D0BA5FF97538F6DACF43343BED019AD23C12A07D8686` | `backend/src/core/clases/codigo-r2.ataque.test.ts` |  |
| `E769CBFCC3A83A64B51C6437F80684640A7C928AD6B8C5C1671FDFF005D7B734` | `backend/src/workers/ritmo-03c-r1.ataque.test.ts` |  |
| `294BE1AF0BF69D6C05F54E2F0D8E587C78A5527D0B64D1A224C058E31CE013D0` | `backend/test/admin-muro-02b-r1.ataque.test.ts` |  |
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
| `252752F4277717369FA1D0BFBB3B5624F6AEDDDD09673699ADF3E31F41E0C042` | `backend/test/calificaciones-01a-r1.ataque.test.ts` | Nueva (ronda 1 de 01a) |
| `DD919EBD74A2C6AC60C244A1563B46895821B0D25E5051CDA25FFFB72B653416` | `backend/test/calificaciones-carreras-01a-r1.ataque.test.ts` | Nueva (ronda 1 de 01a) |
| `B09BAAEC53455CEA1A0674890EBD9353007E6F2628001446E873B09279FFBA07` | `backend/test/calificaciones-estatico-01a-r1.ataque.test.ts` | Nueva (ronda 1 de 01a) |
| `6E3C92C13F146A01C8DCFDC7DD04BEA59F0E2562051F6AC65F95F924EF73E4DB` | `backend/test/categorias-01a-r1.ataque.test.ts` |  |
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
| `6F72C7CC1D0F95D60C057D7406A8955C47E834C963ED53D15DF64C83049F5431` | `backend/test/entregas-01b-r1.ataque.test.ts` | Reescrita (ronda 0 de 01a), sin cambio |
| `5BAAF6F8FB76320620ED4A84EFACA2B2D473460F62360E0D48738B97A0AC584A` | `backend/test/entregas-01b-r2.ataque.test.ts` |  |
| `BA1AC9B17CC9BF747522BD4EC8B87DF436008482E643B18EEA8E9A8C041C59B3` | `backend/test/formada-ch-r1.ataque.test.ts` |  |
| `EC9602D5F109B45A6D428E708D9B6CDD37A7509A6FF9031FA6FD8A2DA0E25E9B` | `backend/test/gestion-02a-r1.ataque.test.ts` |  |
| `5F4133F949D2F337A8F63B75CF82CB77114DB7812D67C1960105F5000C31A326` | `backend/test/guarda-ch-r1.ataque.test.ts` |  |
| `7A7DAC6D87EDF81059FCFF9C07471AAF49D690EC159BE4B9FD4AA32B0909A215` | `backend/test/guarda-ch-r2.ataque.test.ts` |  |
| `610EE44E5D0BCEA46EB4E3645F9ADF1998A76947A25AF7E3F8248EA3A633DF79` | `backend/test/guarda-ch-r3.ataque.test.ts` |  |
| `E5D149F3AC52B726E1FE08908249706341330F88EAA6674B9A9AC67B98B1E864` | `backend/test/guarda-clase-r1.ataque.test.ts` |  |
| `C979D2C9C420A2177FA6EBDDB78EB2CE84D5F043B94270F690916A6FC75D6F8F` | `backend/test/guarda-clase-r2.ataque.test.ts` |  |
| `20982E2B98F1B162146A211923F3D5EC19D4E170C4AA3A5BFC6F82C3B6173AAD` | `backend/test/guarda-r2.ataque.test.ts` |  |
| `2649F3D357DCB806361AC101C57FCB504B9C798B631048F0B3E200F63DA7DC30` | `backend/test/hilo-01c-r1.ataque.test.ts` |  |
| `2D2216EE9DB290B318825A6F73C346D4767CACC12D95F5CA76457A78B63FEDC3` | `backend/test/instantanea-01b-r1.ataque.test.ts` |  |
| `A8B79D5AD98270BE3747F493865708A78BB73ADD08D832584DB4464C3582777A` | `backend/test/intentos-r2.ataque.test.ts` |  |
| `2619B44EEA3370494C95AC128FCFD9E3FFC20D1581A19F549BF371F603A11D7D` | `backend/test/invitacion-flujo-03a-r2.ataque.test.ts` |  |
| `704155928183AEC193AE7E157B86B3E9361D2B63C7A47BE1ED859605FAB4FFA6` | `backend/test/invitacion-masiva-03c-r1.ataque.test.ts` |  |
| `DD9B7454E8786BF0B833D265900CCAECF595808CEBC8E9A77C9AEF15298A1038` | `backend/test/invitacion-masiva-03c-r2.ataque.test.ts` |  |
| `47663E2ADCCD34564AD9B1CAE6E99E06863A7D31FEA779793C9A805C9BD7FE0B` | `backend/test/lecturas-fx-r1.ataque.test.ts` |  |
| `3790777831A1FACB053D0719D85AB404593954416B1443A1A59530E09E2C81DC` | `backend/test/lecturas-fx-r2.ataque.test.ts` | Reescrita (ronda 0 de 01a), sin cambio |
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
| `D6B9ADAF1C14A61FE369F510774EF702CFA20F28F3CB19B0EB7357440DCB0783` | `backend/test/migracion-01a-r1.ataque.test.ts` |  |
| `D95AB72A3FD3D70CE3A9027A50DB660426976C3DF1A46E92DF75066BEAC78A0C` | `backend/test/muro-c-r1.ataque.test.ts` |  |
| `7825CFC9B484DF740FA0E9562A195D1BBCAF4CAF72EA55FA847B5394AB96C125` | `backend/test/muro-c-r2.ataque.test.ts` |  |
| `8B733B86FC6D54ECE008389A59793FAE4EC4A65146EB37215E900E50A5337D46` | `backend/test/nombres-guarda-r3.ataque.test.ts` |  |
| `3FD2583A4DE7CD432B2E09A5130C23D6A59FA475E5E0AA69F23739351ACBF9CF` | `backend/test/nombres-ids-01a-r2.ataque.test.ts` |  |
| `00A6EB6F7CCD7D8790C356BEFCC96DDFDA6EACCE0BE53DE255CFE3626D8F2ADB` | `backend/test/nombres-tokens-r2.ataque.test.ts` |  |
| `80B5A848F69B429E7DADEC86C07BEC1D3E3EED8A042EFBA41CE912DED39E7BAB` | `backend/test/nowait-ch-r1.ataque.test.ts` |  |
| `AD0DAB1952E509237ACAC12BB1F6774FA9C5DE8B44D1E6928EDC65CC67A78C21` | `backend/test/referencias-01b-r1.ataque.test.ts` |  |
| `6F2ABC2CEFD77D74CD1E3ABBDCE9C41BB53D00BD4D8E5BA7E496C4441C2697E5` | `backend/test/servicio-ocupado-ch-r1.ataque.test.ts` |  |
| `A4207FC5519D72D48F9AF4AEC8A67AB0FCB369071018708B67E57151F6A43088` | `backend/test/sesiones-y-cadena.ataque.test.ts` | Reescrita (ronda 0 de 01a), sin cambio |
| `70AC720F2E7FCADEE5BBCB6414887AB08129DEA7CD91DF012046953B1584E8B6` | `backend/test/sexto-paso-02a-r1.ataque.test.ts` |  |
| `C89C30851E6B409CD045017181147BF674DF947762A8DEA3F3FB981BD9B36E09` | `backend/test/tareas-01a-r1.ataque.test.ts` |  |
| `79BC7AAFC11676D36129610A4B5CD5FE5D8234D0D748487FD2F3E48C5F772C79` | `backend/test/tareas-01b-r1.ataque.test.ts` |  |
| `AE60C11CFF5C82DF4954DB48582DF4BD5A64957FF9AFAF9712AA43A038F8E189` | `backend/test/temas-01a-r1.ataque.test.ts` |  |
| `DC7B86A621062ED671C1E7174A745019133FBD410C7A2E78114B2A2C50AFFE95` | `backend/test/temas-01a-r3.ataque.test.ts` |  |
| `F09E9A0038C47D1A2223376A0AF260BAF573F0C45BF770201C48C9E30296F04B` | `backend/test/worker-03c-r1.ataque.test.ts` |  |
| `9F60F9D65D52D2021A1EB04E9F01D3CC68F22744C845BF93D6621AA4FE9713A8` | `backend/test/worker-r1.ataque.test.ts` |  |
| `77D11BD85F202A9EEC92A363DF82E63FB9A784CA9D368D49F62E61C1A2AA967B` | `backend/test/worker-r2.ataque.test.ts` |  |
| `0DE083DF355129E800D130F33D228835479C25F49ED82B6C2BCF9CF5F6E944CB` | `frontend/src/app/barra-02d-r1.ataque.test.tsx` |  |
| `B89EDE0F6AED45DFCB5E64C8909A822156CE43FD80948E72419CDCE9D4541A87` | `frontend/src/app/cache-03a-r1.ataque.test.tsx` |  |
| `E85743C0FBB8E476874A2C67334342D8D69D14153579FC1E4CCE0AE6E2B29616` | `frontend/src/app/contexto-r1.ataque.test.tsx` |  |
| `BC2BE5541006887E2A5A4A89B33046180F607D54474B0F96A73D615AFBCAC385` | `frontend/src/app/contrasena-r1.ataque.test.tsx` |  |
| `F38BCACB716D8A39ACDB3535A95603CD0D8AB02572CA57A7DF5268B01CEB6EAC` | `frontend/src/app/contrasena-r2.ataque.test.tsx` |  |
| `68FB5D092C0C8ECFCF282477EF023AAAE26F6B869656E05109DC3EFA276D842A` | `frontend/src/app/cuentas-r1.ataque.test.tsx` |  |
| `41930017715D3D6869DC7ACEFD75DE8EC3684F1F035B845ABDF8EC0F6B734DEE` | `frontend/src/app/cuentas-r2.ataque.test.tsx` |  |
| `1506C27E5F7418B5E087FD30F8809645A2FC3E2761C7249DE78F02E24AA6C7A5` | `frontend/src/app/en-espera-r1.ataque.test.tsx` |  |
| `DB48DAD405C27062621A44D3744C84CC5903892A51E5A8DF18F41383CB9C88A3` | `frontend/src/app/errores-r1.ataque.test.tsx` |  |
| `0E1D93E4DD3CBC7B5E9475A17B5CA66F0DF056BA25CB117249F4C2E2F5887A51` | `frontend/src/app/foco-barra-02d-r2.ataque.test.tsx` |  |
| `2154B5C15F696A0C7F884BFF774CF4E2A4208A5281DB9076653F8253E2385AB9` | `frontend/src/app/foco-pestana-02d-r3.ataque.test.tsx` |  |
| `F95321E604E20B533EBF2DB3C1C6C66BA2F2D87A48F075415B766551F6EE30F4` | `frontend/src/app/fondo-r1.ataque.test.tsx` |  |
| `57CB54AFD3B79464F0DF01B88FC388CEBBEAC5657D936C4C204CBAE6034B0834` | `frontend/src/app/marco-r1.ataque.test.tsx` |  |
| `446CE2CC8A4F254F94FF6313EB13837421F98749C2473AA0B8979388E7CE674A` | `frontend/src/app/muro-recuperar-c-r3.ataque.test.tsx` |  |
| `DC0365EDB436B3F2EE256882EF13F2295CDFCB83A63F9BA3939381983E43FDFC` | `frontend/src/app/muro-recuperar-c-r4.ataque.test.tsx` |  |
| `2F8056A770397C1601647277944555A48AFC4B9A2BABEB75E5898F0CC92562BB` | `frontend/src/app/muro-rutas-c-r1.ataque.test.tsx` |  |
| `0EEFED2C05D76B0790A437E9465A898A9076083B1F046F8785145CFAAD0DA379` | `frontend/src/app/registro-maestro-03b-r1.ataque.test.tsx` |  |
| `053E867A904AFA3C09EEF92CA2E03E929D9F9C93F714040856F40C7418721BBE` | `frontend/src/app/router.ataque.test.tsx` |  |
| `F0657FB91F7B3ACCF64726292F9324C6742C1AC537C6C4A1985EC4E32AE09C83` | `frontend/src/app/rutas-02c-r1.ataque.test.tsx` |  |
| `C7946F5F5D5D16D36B395ADC2AD9928ACC7FD9839875FB64532B51489756730B` | `frontend/src/app/rutas-clases-r1.ataque.test.tsx` |  |
| `F090CBD8E8C9B0AF52D4FC19547B07E9B6413F5414CC4B10862F01E29818DDDC` | `frontend/src/app/sesion-r2.ataque.test.tsx` |  |
| `7CF085827D8FA981E56822431B8A5C6B7AB08B44477D43F739EBC269D2B8F899` | `frontend/src/components/layout/estatico-r1.ataque.test.ts` |  |
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
| `932E76314E0447DA1790C3C86CA48545EEA834FEAF6F706C4D405B7EA62BE872` | `frontend/src/features/clases/alumnos-b-r1.ataque.test.tsx` |  |
| `55DC274ECA96DA4360848B88F9F2A839AC815031490AB57FF38DE074512D632C` | `frontend/src/features/clases/alumnos-b-r2.ataque.test.tsx` |  |
| `371518E4309F14201A92D29F9436A97A19801B506D45114964FBCFE3F5CD4183` | `frontend/src/features/clases/alumnos-b-r3.ataque.test.tsx` |  |
| `266D088DD727F18AF8C8A106B8D9C4DBED75753E4B1B4ABB12F3A4DF870ECB7F` | `frontend/src/features/clases/alumnos-b-r4.ataque.test.tsx` |  |
| `856CFFBD9C743F9815DAF731487E29DC5F5272545DC15820A70BAF86ECFA6527` | `frontend/src/features/clases/alumnos-b-r5.ataque.test.tsx` |  |
| `CC2FDD28CEB3DE642EE01D07773271D7154811B1F3756333F1DFB285A386E6CC` | `frontend/src/features/clases/archivos-d-r1.ataque.test.tsx` |  |
| `36C32BAD5F632CAD5D76BCA14C74779DDD7CF9B9465A69522886DB770A508B22` | `frontend/src/features/clases/archivos-d-r2.ataque.test.tsx` |  |
| `14CB04B6B56BF2F83DE04DAB863E7843FACA3A585E70FEBC93EE3588F06AB144` | `frontend/src/features/clases/archivos-d-r3.ataque.test.tsx` |  |
| `71148A960F7EF6995904B3DB6DFD0B0E3BA6AF697C45399669EC1DD81CC7D1AA` | `frontend/src/features/clases/cargar-mas-02c-r2.ataque.test.tsx` |  |
| `A3880B67FFAA0D15763D1C761CEF1FF8472029C77BFB2211AB079EADB1685325` | `frontend/src/features/clases/categorias-01e-r1.ataque.test.tsx` |  |
| `66C0B873BC8B9D8E9E01AC871BD6AAAB4328508BEB5EC9371D69463D7C12430D` | `frontend/src/features/clases/categorias-01e-r2.ataque.test.tsx` |  |
| `DD4B9C07F940B55085B7EF8113994E3DB60FAD6A2FF3B5809E0DCB8F2568E336` | `frontend/src/features/clases/clases-admin-02c-r1.ataque.test.tsx` |  |
| `5F0679D8CFACC8BCE01989C04A415DC5B546625EB7DEC92F03959DE5A0F89815` | `frontend/src/features/clases/clases-r1.ataque.test.tsx` |  |
| `C7AD5EDC733E374117A9277F1C2987E84CC2930C77EB4C720CCF15CC9F5FAB45` | `frontend/src/features/clases/clases-r2.ataque.test.tsx` |  |
| `A835A11D29AEDB8F77F91E826A22C2B7CF5322FCED3F6BED0C1ACBF7C75A4E61` | `frontend/src/features/clases/clases-r3.ataque.test.tsx` |  |
| `86B04D234527ECEEFCA35B07CE89E6B7CE0B6AFE5CCDEE2F005E6A4219F0495A` | `frontend/src/features/clases/clases-r4.ataque.test.tsx` |  |
| `AF15BD75457BB2560E1D60BA3EB369786FE869BC3DCAE5FCE144C52049D7E4E8` | `frontend/src/features/clases/estatico-02c-r1.ataque.test.ts` |  |
| `CDD1ED8890859AE3E884822FC7074852A2173105114745D83FE9A15C1C47C626` | `frontend/src/features/clases/estatico-r1.ataque.test.ts` |  |
| `DE23D395DFE7A6F3D6D15EB48CB574599DC9D8204E5A90B255C0C10D25A186FA` | `frontend/src/features/clases/fila-01d-r1.ataque.test.tsx` |  |
| `54A5DAA368528F1B64BD809C79964E30C42C3A71F76E2013643695FAAFA6C73E` | `frontend/src/features/clases/foco-02c-r3.ataque.test.tsx` |  |
| `80EFD85B74264C125683DFB6D631A10DB40887C5E7315D5EF6FF7B49357EAAD7` | `frontend/src/features/clases/foco-02c-r4.ataque.test.tsx` |  |
| `32C1F6A48BA3241963CF6864BD2236A0675425241D4389B524CBE805C358A5CC` | `frontend/src/features/clases/foco-02c-r5.ataque.test.tsx` |  |
| `FDC9F0D1D5BDF7D8C6E9E7F15CCFA2D909F717E9465A8279F5540FB704958BB9` | `frontend/src/features/clases/foco-pestana-02d-r3.ataque.test.tsx` |  |
| `0F3F8173AD209418B1B3106C755EC83808581389D65A8549B93C69B29B22F013` | `frontend/src/features/clases/heredados-02d-r1.ataque.test.tsx` |  |
| `0F60F1582FCE6E5EFAF9BF6856133DC30F1DC4EB9C3B7FEA19F90A330F8335B3` | `frontend/src/features/clases/inicio-sin-datos-02c-r1.ataque.test.tsx` |  |
| `7C434A0E54E70B12D4B2A3DE22FFB4DBF5F28A1CFBD2290C22E8A2B59EDF0E16` | `frontend/src/features/clases/inicio-sin-datos-r2.ataque.test.tsx` |  |
| `A4DE3A7DC35DAEDFF86FD41349EA09140213E918613603D0985C698FF41D29F7` | `frontend/src/features/clases/maestros-02c-r1.ataque.test.tsx` |  |
| `B487B8C8C95BADC6BC78F3BE72B7B5F809381E8C69127D6600254B872DE62EBC` | `frontend/src/features/clases/muro-02c-r1.ataque.test.tsx` |  |
| `9D35E0DA961248750C2948E3F69305856BCDD25E78E01C64AA50DCDFEEE93F8D` | `frontend/src/features/clases/muro-c-r1.ataque.test.tsx` |  |
| `C50A5D53AD16EAFF69ABEC6F531B6C0EDD74CE4ECDA02380EDFBF66F7E5BA89B` | `frontend/src/features/clases/muro-c-r2.ataque.test.tsx` |  |
| `1AC0F4A0474E7F334BC57D4F2BA23954E8C280FA0C3573A26350D0ADE431FF75` | `frontend/src/features/clases/muro-c-r3.ataque.test.tsx` |  |
| `67B60A9A5363F88E6CEBA210C27452B8D639F6DF798AA4E506DC54BB2312249A` | `frontend/src/features/clases/personas-02d-r1.ataque.test.tsx` |  |
| `2911195DC97BF9B25E7E874E0A0B6C9C0D25A9A878C2E821A752D340D219A740` | `frontend/src/features/clases/refactor-01c-r1.ataque.test.tsx` |  |
| `4303EAC77B98E8978495D9E68FD7725AC436F9DB757DBC0C02C59051436908FA` | `frontend/src/features/clases/reloj-01e-r4.ataque.test.tsx` |  |
| `A4AA15CEF1A377EED688DAB1B92E5CA4A3943490144CEC861CF7B482845B0362` | `frontend/src/features/clases/segmentado-02d-r1.ataque.test.tsx` |  |
| `D899C19BA982FBDE2208BBC7FA009869556C84BD4650586DBD9EE90B22234E47` | `frontend/src/features/clases/tarjeta-01d-r1.ataque.test.tsx` |  |
| `97AF503E763F7DFF9FCFBDC72862CD21DE6AF8E51D3EC41134F8475D98AE2DF6` | `frontend/src/features/clases/tarjeta-01d-r2.ataque.test.tsx` |  |
| `7F9D22E5904192DCC00465FADCABF36AA5DE3CD16D6A319A41A66340BB9BD6A8` | `frontend/src/features/clases/trabajo-01e-r1.ataque.test.tsx` |  |
| `F6924BC272A5240CF97D35729C797CC10960ED7CF94FE1BE1B69CA2DF6C1CF8F` | `frontend/src/features/clases/trabajo-01e-r2.ataque.test.tsx` |  |
| `9866EF34167061E2715B65A352C55D08C7E9268033E879AE633C7FD568E4D49F` | `frontend/src/features/clases/ventana-02c-r2.ataque.test.tsx` |  |
| `008E5C606F249D15E3816E27E3E97FD7D7FBA0F8697751A156665A76694B3A18` | `frontend/src/features/clases/ver-mas-01e-r3.ataque.test.tsx` |  |
| `4F486CA37D2A2BB6CC26754281D2ADCE086A9D8D4485A069DE7AE5D54E360ACF` | `frontend/src/features/tareas/entregas-01d-r1.ataque.test.tsx` | Reescrita (ronda 0 de 01a), sin cambio |
| `93A5A0A648669E9C96494A62B2B16082B07296F279E2892BF2C8D47834EE2FC1` | `frontend/src/features/tareas/entregas-01d-r2.ataque.test.tsx` | Reescrita (ronda 0 de 01a), sin cambio |
| `432DCDDF119DD0E32E49ADC42D5F51D197698C8896E1058C505AB31F4A8EE838` | `frontend/src/features/tareas/entregas-01d-r3.ataque.test.tsx` | Reescrita (ronda 0 de 01a), sin cambio |
| `FD66C82D400E0F0A9709960934B555568642D9E4B5E41F31AD6606A620836982` | `frontend/src/features/tareas/entregas-01e-r1.ataque.test.tsx` | Reescrita (ronda 0 de 01a), sin cambio |
| `496652BC59817166F53E00CB828F2119C857C2834063A31764D7876DC150C930` | `frontend/src/features/tareas/entregas-01e-r2.ataque.test.tsx` | Reescrita (ronda 0 de 01a), sin cambio |
| `BFDED7507BC684EA9858CD76517EF0E4C23CBC69E5A19F381E6EC522FD6156E6` | `frontend/src/features/tareas/tareas-01a-r1.ataque.test.tsx` |  |
| `B778FC2E6BB0A8F8715A56877B3B781439CA214C8A9C8AE126F610C95229882A` | `frontend/src/features/tareas/tareas-01d-r1.ataque.test.tsx` |  |
| `BF3C999033195CAC778A82A579E44729FB07A405F5CDB41D8E7DC932CB71F942` | `frontend/src/features/tareas/tareas-01d-r2.ataque.test.tsx` |  |
| `3567D7C23D2CF6A2FD538CD6822EF60AC3CFFEAC036394ED1E3559DEBE492C57` | `frontend/src/features/tareas/tareas-01d-r3.ataque.test.tsx` |  |
| `6BBE2BD85E2B5500FBAB4D0F51630C0C8E9D65B1A63045AD1FA906298A92A435` | `frontend/src/features/tareas/tareas-01d-r4.ataque.test.tsx` |  |
| `C71CBA65DD284D7AF11CBC812B6BCF75BAA373939EDB8318E731858D9C50173F` | `frontend/src/lib/format-d-r1.ataque.test.ts` |  |
| `89DBBB70D5DC404C3D74DB5391D10855C8CB1D6B4C643B6147B3CE6FFB2637AF` | `frontend/src/lib/format-d-r2.ataque.test.ts` |  |
| `BFA7DED62F7A1402590D438A1CC51060A63FA019AD47D3EB5740E43383064A2A` | `frontend/src/lib/format-d-r3.ataque.test.ts` |  |
| `10C730348D18FF8DAE7B3623751D31122AA58560B564AD191717FA1938A6F8CE` | `frontend/src/services/apiClient.ataque.test.ts` |  |
| `CED32202A8DEB611027E965FB5EBD56A9848A1EE3467474BFBAED64374D3BF5B` | `frontend/src/styles/clases-r1.ataque.test.ts` |  |
| `B8085BCBBC7F4B6276BF3A87FB7BA0BC887953A8C6CE372354A7F3F1B5037582` | `frontend/src/styles/tokens-r1.ataque.test.ts` |  |

## Ronda 2 de 01a
Veredicto: **RESISTE** (0 hallazgos).
Verificación propia: lint del backend en verde (código 0) · test del backend `Tests  2553 passed (2553)` en `207` archivos, código 0.

Base: el árbol de trabajo tras "## 01a — corrección de la ronda 1 (T-01)" de `resumen-programador.md`, con la verificación del manager ("## Verificación de la corrección de la ronda 1 — CALIFICACIONES-01a", RESUMEN ACEPTADO). Solo escribí un archivo `*.ataque` nuevo en `backend/test/` y esta sección. No toqué código de producción, `shared/`, pruebas normales, `*.ataque` existentes ni nada de "No se toca". El único formateador que corrí fue `npx prettier --write test/calificaciones-01a-r2.ataque.test.ts`, desde `backend/`. O-r1-2 (N-19, el texto del `409 TAREA_CON_ENTREGAS`) no lo volví a atacar: CAL-T-29 solo fija que la cuenta y que no da `500`.

### V-01
- **Base:** la tabla de 178 `*.ataque` al cierre de la ronda 1 de 01a (arriba).
- **Método:** `git ls-files -co --exclude-standard | grep -E '\.ataque\.test\.tsx?$' | sort | xargs sha256sum`, con el asterisco del modo binario quitado y los hashes en minúsculas, y `diff` contra la tabla.
- **Antes de escribir nada:** 178 de 178 iguales, ni uno de más ni de menos. **V-01 en verde.**
- **Al cerrar la ronda:** 179 archivos. Los 178 siguen iguales y se suma el nuevo (el `diff` da una sola línea añadida: `backend/test/calificaciones-01a-r2.ataque.test.ts`).

### CAL-T-01 con el código corregido
- `cd backend; npx vitest run test/calificaciones-01a-r1.ataque.test.ts -t "CAL-T-01"` → `Tests  1 passed | 14 skipped (15)`, código 0. Mi prueba no cambió (su SHA-256 es el de la tabla de la ronda 1). También pasa en la corrida completa.

### Archivo nuevo y casos
Comando: `cd backend; npx vitest list test/calificaciones-01a-r2.ataque.test.ts`. Da 7 casos, y el total del backend pasa de 2546 a 2553 (`npx vitest list | wc -l`).

**`backend/test/calificaciones-01a-r2.ataque.test.ts` (7 casos, por HTTP, con el reloj fijo).** Cada caso fija `Date` con `vi.useFakeTimers({ toFake: ["Date"] })` y `vi.setSystemTime`, crea su escenario y firma sus tokens con ese instante (los temporizadores del pool y de Prisma siguen con el reloj real); `afterEach` devuelve el reloj real. Cada respuesta pasa por `sinFuga` en el mismo caso. Sin `LOCK TABLE` y sin retenciones (las carreras de CAL-T-30 son una ráfaga sin retener filas).
- CAL-T-24: con el reloj fijo, entregadas cuenta la entregada, la entregada con retraso, la calificada con fecha y la vuelta a entregar; no cuenta la calificada sin entrega, la anulada (ni anulada y calificada), la fila del hilo, la desactivada, la dada de baja ni la alumna de otra clase; igual en cada página.
- CAL-T-25: el borde exacto con el reloj fijo: en el milisegundo de la fecha límite se entrega a tiempo y calificar sin entrega es 409 ENTREGA_NO_CALIFICABLE; un milisegundo después se califica sin entrega, entregar es 409 ENTREGA_CERRADA y entregadas cuenta solo a la que entregó.
- CAL-T-26: recalificar una calificada sin entrega con rúbrica: sigue sin fecha, sin retraso ni enlaces, la versión sube, los puntajes se reemplazan, la versión vieja es 409 sin escribir, y en las lecturas del maestro, de la alumna y de Trabajo de clase sigue siendo calificado sin fecha.
- CAL-T-27: con una calificada sin entrega, la alumna recibe 409 ENTREGA_CALIFICADA al entregar, anular y pedir subir un archivo, con la tarea cerrada y reabierta, sin escribir, sin archivo pendiente y sin encolar ENTREGA_REALIZADA.
- CAL-T-28: con solo una calificada sin entrega, cambiar los puntos o la rúbrica de la tarea es 409 TAREA_CON_CALIFICACIONES sin escribir.
- CAL-T-29: borrar una tarea con solo calificadas sin entrega: la maestra recibe 409 TAREA_CON_ENTREGAS (sin 500, también con una alumna dada de baja), el admin sin confirmar también, y con la confirmación se borran la tarea, los criterios, las entregas, sus puntajes y el hilo con la devolución.
- CAL-T-30: calificar sin entrega, reabrir la tarea y entregar a la vez, en cinco rondas: nunca 500, entregadas es 1 si y solo si la fila tiene fecha (y solo si entregar respondió 200), y la fila es calificada si y solo si calificar respondió 200.

### Hallazgos
Ninguno.

### Atacado sin hallazgos (por categoría)
**El remedio de T-01, `entregadas` por estado vecino (CAL-T-24, por HTTP, nada fabricado salvo la alumna ajena):**
- Una clase con nueve alumnas y la del escenario, y una tarea que vence a T0 + 10 min y acepta tardías. A T0: entregan Ana y Bea; Dora entrega, anula y vuelve a entregar; Elena y Olga entregan y anulan; Fer solo escribe en el hilo (fila `asignado`); Gina y Hilda entregan. A la fecha límite + 1 s, Jose entrega con retraso. Después la maestra cierra la tarea (`aceptaTardias: false`, un `PUT` que se guarda), Gina queda desactivada e Hilda dada de baja por `DELETE …/alumnos/:id`.
- Se califican Bea y Jose (con fecha), la del escenario (sin fila) y Elena (anulada, versión 2), cada una con la versión que da `GET …/entregas/:alumnoId`. Gina y Hilda responden 404 `ALUMNO_NO_ENCONTRADO`.
- En base: Elena queda `calificado` sin fecha, sin retraso y con `enlaces: []`; Bea conserva su fecha; Jose conserva la suya y `conRetraso: true`.
- `total: 8` y `entregadas: 4` (Ana, Bea, Dora y Jose) en **cada** página con `limite` 100, 3 y 1. Las 8 filas salen una sola vez, cada una con su estado, su fecha y su retraso: la del escenario y Elena `calificado` con `fechaEntrega: null` y `conRetraso: false`; Fer y Olga `asignado`; Jose `calificado` con su fecha y `conRetraso: true`.
- Alumna de otra clase con una fila en esta tarea (fabricada por SQL; no debería existir): no sale en las filas ni en los conteos. La tarea de otra clase por la ruta de esta: 404 `TAREA_NO_ENCONTRADA`.

**Tiempo (CAL-T-25, con el reloj fijo al milisegundo):**
- En el milisegundo exacto de la fecha límite: entregar es 200, a tiempo (`conRetraso: false`, `fechaEntrega` igual a la fecha límite); calificar sin entrega es 409 `ENTREGA_NO_CALIFICABLE` sin escribir.
- Un milisegundo después: entregar es 409 `ENTREGA_CERRADA`; calificar sin entrega (sin fila y con fila) es 200; `entregadas: 1` de `total: 3`.
- Esto cubre por la API lo que en la ronda 1 dejé solo a la matriz unitaria CAL-1A04.

**Recalificar una calificada sin entrega (CAL-T-26):**
- Con rúbrica, de [1, 2] a [4, 5] con la versión 1: 200, `version: 2`, `calificacion: { puntos: 9, sobre: 10 }`, `fechaEntrega: null`, `conRetraso: false`, `enlaces: []`, `adjuntos: []`. En base, los dos puntajes se reemplazan (4 y 5), y hay dos trabajos de `CALIFICACION_PUBLICADA`.
- La versión vieja (1) responde 409 `ENTREGA_MODIFICADA` sin cambiar ni la fila, ni los puntajes, ni los comentarios, ni los trabajos.
- `entregadas: 0`; su fila sigue `calificado` sin fecha. La lectura de la alumna da `puedeEntregar: false` y `puedeAnular: false`; "Trabajo de clase" de la alumna trae `entrega: { estado: "calificado", conRetraso: false }`.

**Lo que la alumna puede hacer con una calificada sin entrega (CAL-T-27):**
- Entregar, anular y pedir la subida de un archivo responden 409 `ENTREGA_CALIFICADA`, con la tarea cerrada y con la tarea reabierta (fecha futura y tardías aceptadas). No cambia la fila, no se registra ningún archivo pendiente y no se encola `ENTREGA_REALIZADA`.

**Rúbrica congelada con solo una calificada sin entrega (CAL-T-28):** cambiar los puntos o la rúbrica es 409 `TAREA_CON_CALIFICACIONES`; la versión, los puntos y los dos criterios quedan igual.

**Borrado (CAL-T-29):**
- Con dos calificadas sin entrega (con rúbrica y una con devolución en el hilo): la maestra recibe 409 `TAREA_CON_ENTREGAS` ("2 entregas"), nunca 500. Con una de ellas dada de baja, la maestra y el admin sin confirmar siguen recibiendo 409 (la regla del plan cuenta las de cualquier alumno).
- El admin con `?confirmar=entregas`: 204. No quedan tarea, criterios, entregas, puntajes (ni por entrega ni por criterio) ni comentarios del hilo; la lista de entregas responde 404.

**Carreras del mismo mecanismo (CAL-T-30):** calificar sin entrega, reabrir la tarea y entregar, a la vez, en cinco rondas con escenarios nuevos: ningún 500, `deadlock` ni `P2028`. En cada ronda, la fila tiene fecha si y solo si entregar respondió 200, está calificada si y solo si calificar respondió 200, y `entregadas` coincide con la fecha.

**Revisión estática del remedio y sus hermanos (grep en `backend/src`, sin pruebas):**
- `grep -rn "entrega\.\(count\|findMany\|groupBy\|aggregate\)\|FROM entregas\|\"entregado\"\|\"calificado\""`: los únicos conteos de `entregas` son `entregadas` de `listarEntregasCon` (ahora por `fechaEntrega: { not: null }`), `calificadas` de `editarTarea` (`estado: "calificado"`, que sí debe contar la calificada sin entrega: P-04) y `ESTADOS_QUE_CUENTAN` de `borrarTarea` (decisión del plan, O-r1-2/N-19). Las demás lecturas deciden por estado (`exigirEntregaAbierta`, `decidirAnulacion`, `accionesDeEntrega`, `exigirEntregaCalificable`) o devuelven `fechaEntrega` tal cual.
- `ESTADOS_ENTREGADOS` ya no existe en `src/`. El `count` filtra por `tareaId` (prefijo del único `(tarea_id, alumno_id)`) y por las mismas condiciones de alumnado que `total` y la página (`activo` e inscrito en la clase). Por los `CHECK` de la migración, `fecha_entrega` no nula implica `entregado` o `calificado`.
- No hay un worker de `CALIFICACION_PUBLICADA` en 01a (`grep -rln "CALIFICACION\|calificacion" src/workers` vacío): nada que atacar ahí todavía.

**Pasada corta sobre lo no cubierto en la ronda 1 (una línea por categoría):**
- Autorización: la cubren los siete casos de CAL-1A17 (sin token, rol, admin, maestro ajeno, restringido, cambio de contraseña, tarea de otra clase y alumno inválido); no le sumé nada.
- Tiempo: el milisegundo exacto por la API, que en la ronda 1 no había atacado, ahora lo fija CAL-T-25.
- Datos y estado: recalificar, entregar dos veces, anular y volver a entregar, y el borrado con calificadas, en CAL-T-24, CAL-T-26, CAL-T-27 y CAL-T-29.
- Fugas: las 7 pruebas pasan por `sinFuga`, también con la lista paginada y "Trabajo de clase".

### No atacado y por qué
- **Frontend:** 01a no cambia código de producción del frontend y esta corrección tampoco. Por la instrucción de la ronda no corrí su suite.
- **El texto del `409 TAREA_CON_ENTREGAS` con calificadas sin entrega:** es O-r1-2, que queda como N-19 para el humano al cierre; no lo volví a atacar.
- **01b (gradebook, "Mis calificaciones", riesgo) y 01c/01d (interfaz):** los hermanos 8, 9, 12 y 13 del resumen del programador son de esas subentregas; los vigilo en sus rondas.
- **Navegador:** no aplica; ningún agente abre navegadores.

### PA-07 de la corrida final del backend
**Fuente:** `cd backend; npm test > <scratchpad>/r2/r2-test-back.txt 2>&1`, de 15:36:30Z a 15:38:49Z, código 0.
- **Método:** `grep -o … | wc -l` por término. Para atribuir, `<scratchpad>/r1/pa07.mjs` (el mismo de la ronda 1) empareja cada línea con el último "incoming request" del mismo `pid` y el mismo `requestId`, por app.

| Término | Cuenta |
|---|---|
| `40P01` | 0 |
| `deadlock detected` | 0 |
| `could not serialize` | 0 |
| `too many clients` | 0 |
| `"Error no controlado"` | 10, exactamente el inventario I-1 de la ronda 0 |
| `"code":"P2028"` | 5, todos permitidos |
| (aparte) `Unable to start a transaction` (`maxWait`) | 0 |
| (aparte) `Test timed out` | 0 |

- **Control positivo: completo.** Los tres `P2028` deterministas de `servicio-ocupado.integracion.test.ts` salen en el mismo proceso (`pid` 13476), con nivel 40:
  - `POST /api/auth/cambiar-contrasena` › `tx.sesion.findFirst()`;
  - `POST /api/auth/refrescar` › `tx.sesion.updateMany()`;
  - `POST /api/clases/:claseId/publicaciones/:publicacionId/comentarios` › `prisma.$queryRawUnsafe()`.
- **Los dos de `cuentas-r3.ataque.test.ts`,** en el `pid` 21236, nivel 40: `POST /api/auth/login` › `tx.sesion.create()` y `POST /api/auth/restablecer` › `tx.tokenCuenta.updateMany()`.
- **Los diez `"Error no controlado"`:**
  - 1 a 6: `POST /api/auth/login`, cinco "fallo simulado de la base en la búsqueda" y uno "… al crear la sesión", de `intentos-r2.ataque`, `pid` 11612.
  - 7 a 9: `POST /api/clases/:claseId/archivos`, `POST …/archivos/:archivoId/descarga` y `GET …/publicaciones`, el `ZodError` de la URL del almacén, de `archivos-d-r2.ataque` T-39, `pid` 19088.
  - 10: `GET /api/prueba/error-comun` › `Error("boom")`, de `salud.integracion`, `pid` 14824.
- Mi prueba no provoca a propósito ningún `"Error no controlado"` ni ningún `P2028`. En su corrida aislada, los siete términos dan 0.
- Ningún rojo, `Test timed out` ni intermitencia (PA-12 no aplica). **PA-07: limpia.**

### Comandos y última línea
| Comando (uno a la vez, nunca dos suites juntas) | Código | Última línea / resumen |
|---|---|---|
| V-01: `git ls-files -co --exclude-standard \| grep -E '\.ataque\.test\.tsx?$' \| sort \| xargs sha256sum` + `diff` | 0 | `IGUALES 178` |
| `cd backend; npx vitest run test/calificaciones-01a-r1.ataque.test.ts -t "CAL-T-01"` | 0 | `Tests  1 passed \| 14 skipped (15)` |
| `cd backend; npx prettier --write test/calificaciones-01a-r2.ataque.test.ts` | 0 | `test/calificaciones-01a-r2.ataque.test.ts 130ms` |
| `cd backend; npx vitest run test/calificaciones-01a-r2.ataque.test.ts` | 0 | `Tests  7 passed (7)` |
| `cd backend; npm test` (corrida final) | 0 | `Duration  134.26s (transform 14.46s, setup 5.86s, import 234.23s, tests 1044.79s, environment 61ms)`; resumen: `Test Files  207 passed (207)` · `Tests  2553 passed (2553)` |
| `cd backend; npm run lint` | 0 | `> tsc -p tsconfig.json --noEmit && tsc -p tsconfig.test.json` (antes: `All matched files use Prettier code style!`) |
| `cd backend; npx vitest list test/calificaciones-01a-r2.ataque.test.ts` | 0 | 7 líneas |
| `cd backend; npx vitest list \| wc -l` | 0 | `2553` |

### Veredicto de la ronda 2 de 01a
**RESISTE.** Hallazgos: crítica 0, alta 0, media 0, baja 0.
- V-01 en verde: 178 de 178 iguales y 1 archivo nuevo.
- CAL-T-01 pasa sin cambios en la prueba.
- El remedio resiste en los estados vecinos (CAL-T-24 a CAL-T-30) y en el grep de hermanos.
- PA-07 limpia, con el control positivo completo.
- Ninguna PARADA.

## Tabla de SHA-256 de las 179 `*.ataque` al cierre de la ronda 2 de 01a (base de V-01 de la ronda o subentrega siguiente)
Calculada con `sha256sum` sobre `git ls-files -co --exclude-standard | grep -E '\.ataque\.test\.tsx?$'`. Los 178 de la ronda 1 no cambian; las tres de la ronda 1 y la nueva van marcadas.

| SHA-256 | Archivo | Nota |
|---|---|---|
| `BCCE2CAE771F97957D8691BEF7FFF4EC42412DAAEABF726AEB0AFC59F6F25671` | `backend/src/config/correo.ataque.test.ts` |  |
| `DCB78D222544E8DC4FBECE59468F555B04ABE971B70016E9BB17FCAE3E958580` | `backend/src/config/env.ataque.test.ts` |  |
| `71E7F049447D2D1ECEDD897C55EA0B6D31221753F0A7E7473C7AC6E8667F0A95` | `backend/src/config/logger.ataque.test.ts` |  |
| `91F620C1A27778EEBC2BED5EEC1BC9B0E3FE1199B32ED00F9DD910011D6A1805` | `backend/src/core/clases/codigo-r1.ataque.test.ts` |  |
| `262691F5786AD63B2393D0BA5FF97538F6DACF43343BED019AD23C12A07D8686` | `backend/src/core/clases/codigo-r2.ataque.test.ts` |  |
| `E769CBFCC3A83A64B51C6437F80684640A7C928AD6B8C5C1671FDFF005D7B734` | `backend/src/workers/ritmo-03c-r1.ataque.test.ts` |  |
| `294BE1AF0BF69D6C05F54E2F0D8E587C78A5527D0B64D1A224C058E31CE013D0` | `backend/test/admin-muro-02b-r1.ataque.test.ts` |  |
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
| `252752F4277717369FA1D0BFBB3B5624F6AEDDDD09673699ADF3E31F41E0C042` | `backend/test/calificaciones-01a-r1.ataque.test.ts` | Nueva (ronda 1 de 01a) |
| `B00C2C10D8D862F6576CB69173F07D190A08A18A25439C296D10B74E9772A454` | `backend/test/calificaciones-01a-r2.ataque.test.ts` | Nueva (ronda 2 de 01a) |
| `DD919EBD74A2C6AC60C244A1563B46895821B0D25E5051CDA25FFFB72B653416` | `backend/test/calificaciones-carreras-01a-r1.ataque.test.ts` | Nueva (ronda 1 de 01a) |
| `B09BAAEC53455CEA1A0674890EBD9353007E6F2628001446E873B09279FFBA07` | `backend/test/calificaciones-estatico-01a-r1.ataque.test.ts` | Nueva (ronda 1 de 01a) |
| `6E3C92C13F146A01C8DCFDC7DD04BEA59F0E2562051F6AC65F95F924EF73E4DB` | `backend/test/categorias-01a-r1.ataque.test.ts` |  |
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
| `6F72C7CC1D0F95D60C057D7406A8955C47E834C963ED53D15DF64C83049F5431` | `backend/test/entregas-01b-r1.ataque.test.ts` |  |
| `5BAAF6F8FB76320620ED4A84EFACA2B2D473460F62360E0D48738B97A0AC584A` | `backend/test/entregas-01b-r2.ataque.test.ts` |  |
| `BA1AC9B17CC9BF747522BD4EC8B87DF436008482E643B18EEA8E9A8C041C59B3` | `backend/test/formada-ch-r1.ataque.test.ts` |  |
| `EC9602D5F109B45A6D428E708D9B6CDD37A7509A6FF9031FA6FD8A2DA0E25E9B` | `backend/test/gestion-02a-r1.ataque.test.ts` |  |
| `5F4133F949D2F337A8F63B75CF82CB77114DB7812D67C1960105F5000C31A326` | `backend/test/guarda-ch-r1.ataque.test.ts` |  |
| `7A7DAC6D87EDF81059FCFF9C07471AAF49D690EC159BE4B9FD4AA32B0909A215` | `backend/test/guarda-ch-r2.ataque.test.ts` |  |
| `610EE44E5D0BCEA46EB4E3645F9ADF1998A76947A25AF7E3F8248EA3A633DF79` | `backend/test/guarda-ch-r3.ataque.test.ts` |  |
| `E5D149F3AC52B726E1FE08908249706341330F88EAA6674B9A9AC67B98B1E864` | `backend/test/guarda-clase-r1.ataque.test.ts` |  |
| `C979D2C9C420A2177FA6EBDDB78EB2CE84D5F043B94270F690916A6FC75D6F8F` | `backend/test/guarda-clase-r2.ataque.test.ts` |  |
| `20982E2B98F1B162146A211923F3D5EC19D4E170C4AA3A5BFC6F82C3B6173AAD` | `backend/test/guarda-r2.ataque.test.ts` |  |
| `2649F3D357DCB806361AC101C57FCB504B9C798B631048F0B3E200F63DA7DC30` | `backend/test/hilo-01c-r1.ataque.test.ts` |  |
| `2D2216EE9DB290B318825A6F73C346D4767CACC12D95F5CA76457A78B63FEDC3` | `backend/test/instantanea-01b-r1.ataque.test.ts` |  |
| `A8B79D5AD98270BE3747F493865708A78BB73ADD08D832584DB4464C3582777A` | `backend/test/intentos-r2.ataque.test.ts` |  |
| `2619B44EEA3370494C95AC128FCFD9E3FFC20D1581A19F549BF371F603A11D7D` | `backend/test/invitacion-flujo-03a-r2.ataque.test.ts` |  |
| `704155928183AEC193AE7E157B86B3E9361D2B63C7A47BE1ED859605FAB4FFA6` | `backend/test/invitacion-masiva-03c-r1.ataque.test.ts` |  |
| `DD9B7454E8786BF0B833D265900CCAECF595808CEBC8E9A77C9AEF15298A1038` | `backend/test/invitacion-masiva-03c-r2.ataque.test.ts` |  |
| `47663E2ADCCD34564AD9B1CAE6E99E06863A7D31FEA779793C9A805C9BD7FE0B` | `backend/test/lecturas-fx-r1.ataque.test.ts` |  |
| `3790777831A1FACB053D0719D85AB404593954416B1443A1A59530E09E2C81DC` | `backend/test/lecturas-fx-r2.ataque.test.ts` |  |
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
| `D6B9ADAF1C14A61FE369F510774EF702CFA20F28F3CB19B0EB7357440DCB0783` | `backend/test/migracion-01a-r1.ataque.test.ts` |  |
| `D95AB72A3FD3D70CE3A9027A50DB660426976C3DF1A46E92DF75066BEAC78A0C` | `backend/test/muro-c-r1.ataque.test.ts` |  |
| `7825CFC9B484DF740FA0E9562A195D1BBCAF4CAF72EA55FA847B5394AB96C125` | `backend/test/muro-c-r2.ataque.test.ts` |  |
| `8B733B86FC6D54ECE008389A59793FAE4EC4A65146EB37215E900E50A5337D46` | `backend/test/nombres-guarda-r3.ataque.test.ts` |  |
| `3FD2583A4DE7CD432B2E09A5130C23D6A59FA475E5E0AA69F23739351ACBF9CF` | `backend/test/nombres-ids-01a-r2.ataque.test.ts` |  |
| `00A6EB6F7CCD7D8790C356BEFCC96DDFDA6EACCE0BE53DE255CFE3626D8F2ADB` | `backend/test/nombres-tokens-r2.ataque.test.ts` |  |
| `80B5A848F69B429E7DADEC86C07BEC1D3E3EED8A042EFBA41CE912DED39E7BAB` | `backend/test/nowait-ch-r1.ataque.test.ts` |  |
| `AD0DAB1952E509237ACAC12BB1F6774FA9C5DE8B44D1E6928EDC65CC67A78C21` | `backend/test/referencias-01b-r1.ataque.test.ts` |  |
| `6F2ABC2CEFD77D74CD1E3ABBDCE9C41BB53D00BD4D8E5BA7E496C4441C2697E5` | `backend/test/servicio-ocupado-ch-r1.ataque.test.ts` |  |
| `A4207FC5519D72D48F9AF4AEC8A67AB0FCB369071018708B67E57151F6A43088` | `backend/test/sesiones-y-cadena.ataque.test.ts` |  |
| `70AC720F2E7FCADEE5BBCB6414887AB08129DEA7CD91DF012046953B1584E8B6` | `backend/test/sexto-paso-02a-r1.ataque.test.ts` |  |
| `C89C30851E6B409CD045017181147BF674DF947762A8DEA3F3FB981BD9B36E09` | `backend/test/tareas-01a-r1.ataque.test.ts` |  |
| `79BC7AAFC11676D36129610A4B5CD5FE5D8234D0D748487FD2F3E48C5F772C79` | `backend/test/tareas-01b-r1.ataque.test.ts` |  |
| `AE60C11CFF5C82DF4954DB48582DF4BD5A64957FF9AFAF9712AA43A038F8E189` | `backend/test/temas-01a-r1.ataque.test.ts` |  |
| `DC7B86A621062ED671C1E7174A745019133FBD410C7A2E78114B2A2C50AFFE95` | `backend/test/temas-01a-r3.ataque.test.ts` |  |
| `F09E9A0038C47D1A2223376A0AF260BAF573F0C45BF770201C48C9E30296F04B` | `backend/test/worker-03c-r1.ataque.test.ts` |  |
| `9F60F9D65D52D2021A1EB04E9F01D3CC68F22744C845BF93D6621AA4FE9713A8` | `backend/test/worker-r1.ataque.test.ts` |  |
| `77D11BD85F202A9EEC92A363DF82E63FB9A784CA9D368D49F62E61C1A2AA967B` | `backend/test/worker-r2.ataque.test.ts` |  |
| `0DE083DF355129E800D130F33D228835479C25F49ED82B6C2BCF9CF5F6E944CB` | `frontend/src/app/barra-02d-r1.ataque.test.tsx` |  |
| `B89EDE0F6AED45DFCB5E64C8909A822156CE43FD80948E72419CDCE9D4541A87` | `frontend/src/app/cache-03a-r1.ataque.test.tsx` |  |
| `E85743C0FBB8E476874A2C67334342D8D69D14153579FC1E4CCE0AE6E2B29616` | `frontend/src/app/contexto-r1.ataque.test.tsx` |  |
| `BC2BE5541006887E2A5A4A89B33046180F607D54474B0F96A73D615AFBCAC385` | `frontend/src/app/contrasena-r1.ataque.test.tsx` |  |
| `F38BCACB716D8A39ACDB3535A95603CD0D8AB02572CA57A7DF5268B01CEB6EAC` | `frontend/src/app/contrasena-r2.ataque.test.tsx` |  |
| `68FB5D092C0C8ECFCF282477EF023AAAE26F6B869656E05109DC3EFA276D842A` | `frontend/src/app/cuentas-r1.ataque.test.tsx` |  |
| `41930017715D3D6869DC7ACEFD75DE8EC3684F1F035B845ABDF8EC0F6B734DEE` | `frontend/src/app/cuentas-r2.ataque.test.tsx` |  |
| `1506C27E5F7418B5E087FD30F8809645A2FC3E2761C7249DE78F02E24AA6C7A5` | `frontend/src/app/en-espera-r1.ataque.test.tsx` |  |
| `DB48DAD405C27062621A44D3744C84CC5903892A51E5A8DF18F41383CB9C88A3` | `frontend/src/app/errores-r1.ataque.test.tsx` |  |
| `0E1D93E4DD3CBC7B5E9475A17B5CA66F0DF056BA25CB117249F4C2E2F5887A51` | `frontend/src/app/foco-barra-02d-r2.ataque.test.tsx` |  |
| `2154B5C15F696A0C7F884BFF774CF4E2A4208A5281DB9076653F8253E2385AB9` | `frontend/src/app/foco-pestana-02d-r3.ataque.test.tsx` |  |
| `F95321E604E20B533EBF2DB3C1C6C66BA2F2D87A48F075415B766551F6EE30F4` | `frontend/src/app/fondo-r1.ataque.test.tsx` |  |
| `57CB54AFD3B79464F0DF01B88FC388CEBBEAC5657D936C4C204CBAE6034B0834` | `frontend/src/app/marco-r1.ataque.test.tsx` |  |
| `446CE2CC8A4F254F94FF6313EB13837421F98749C2473AA0B8979388E7CE674A` | `frontend/src/app/muro-recuperar-c-r3.ataque.test.tsx` |  |
| `DC0365EDB436B3F2EE256882EF13F2295CDFCB83A63F9BA3939381983E43FDFC` | `frontend/src/app/muro-recuperar-c-r4.ataque.test.tsx` |  |
| `2F8056A770397C1601647277944555A48AFC4B9A2BABEB75E5898F0CC92562BB` | `frontend/src/app/muro-rutas-c-r1.ataque.test.tsx` |  |
| `0EEFED2C05D76B0790A437E9465A898A9076083B1F046F8785145CFAAD0DA379` | `frontend/src/app/registro-maestro-03b-r1.ataque.test.tsx` |  |
| `053E867A904AFA3C09EEF92CA2E03E929D9F9C93F714040856F40C7418721BBE` | `frontend/src/app/router.ataque.test.tsx` |  |
| `F0657FB91F7B3ACCF64726292F9324C6742C1AC537C6C4A1985EC4E32AE09C83` | `frontend/src/app/rutas-02c-r1.ataque.test.tsx` |  |
| `C7946F5F5D5D16D36B395ADC2AD9928ACC7FD9839875FB64532B51489756730B` | `frontend/src/app/rutas-clases-r1.ataque.test.tsx` |  |
| `F090CBD8E8C9B0AF52D4FC19547B07E9B6413F5414CC4B10862F01E29818DDDC` | `frontend/src/app/sesion-r2.ataque.test.tsx` |  |
| `7CF085827D8FA981E56822431B8A5C6B7AB08B44477D43F739EBC269D2B8F899` | `frontend/src/components/layout/estatico-r1.ataque.test.ts` |  |
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
| `932E76314E0447DA1790C3C86CA48545EEA834FEAF6F706C4D405B7EA62BE872` | `frontend/src/features/clases/alumnos-b-r1.ataque.test.tsx` |  |
| `55DC274ECA96DA4360848B88F9F2A839AC815031490AB57FF38DE074512D632C` | `frontend/src/features/clases/alumnos-b-r2.ataque.test.tsx` |  |
| `371518E4309F14201A92D29F9436A97A19801B506D45114964FBCFE3F5CD4183` | `frontend/src/features/clases/alumnos-b-r3.ataque.test.tsx` |  |
| `266D088DD727F18AF8C8A106B8D9C4DBED75753E4B1B4ABB12F3A4DF870ECB7F` | `frontend/src/features/clases/alumnos-b-r4.ataque.test.tsx` |  |
| `856CFFBD9C743F9815DAF731487E29DC5F5272545DC15820A70BAF86ECFA6527` | `frontend/src/features/clases/alumnos-b-r5.ataque.test.tsx` |  |
| `CC2FDD28CEB3DE642EE01D07773271D7154811B1F3756333F1DFB285A386E6CC` | `frontend/src/features/clases/archivos-d-r1.ataque.test.tsx` |  |
| `36C32BAD5F632CAD5D76BCA14C74779DDD7CF9B9465A69522886DB770A508B22` | `frontend/src/features/clases/archivos-d-r2.ataque.test.tsx` |  |
| `14CB04B6B56BF2F83DE04DAB863E7843FACA3A585E70FEBC93EE3588F06AB144` | `frontend/src/features/clases/archivos-d-r3.ataque.test.tsx` |  |
| `71148A960F7EF6995904B3DB6DFD0B0E3BA6AF697C45399669EC1DD81CC7D1AA` | `frontend/src/features/clases/cargar-mas-02c-r2.ataque.test.tsx` |  |
| `A3880B67FFAA0D15763D1C761CEF1FF8472029C77BFB2211AB079EADB1685325` | `frontend/src/features/clases/categorias-01e-r1.ataque.test.tsx` |  |
| `66C0B873BC8B9D8E9E01AC871BD6AAAB4328508BEB5EC9371D69463D7C12430D` | `frontend/src/features/clases/categorias-01e-r2.ataque.test.tsx` |  |
| `DD4B9C07F940B55085B7EF8113994E3DB60FAD6A2FF3B5809E0DCB8F2568E336` | `frontend/src/features/clases/clases-admin-02c-r1.ataque.test.tsx` |  |
| `5F0679D8CFACC8BCE01989C04A415DC5B546625EB7DEC92F03959DE5A0F89815` | `frontend/src/features/clases/clases-r1.ataque.test.tsx` |  |
| `C7AD5EDC733E374117A9277F1C2987E84CC2930C77EB4C720CCF15CC9F5FAB45` | `frontend/src/features/clases/clases-r2.ataque.test.tsx` |  |
| `A835A11D29AEDB8F77F91E826A22C2B7CF5322FCED3F6BED0C1ACBF7C75A4E61` | `frontend/src/features/clases/clases-r3.ataque.test.tsx` |  |
| `86B04D234527ECEEFCA35B07CE89E6B7CE0B6AFE5CCDEE2F005E6A4219F0495A` | `frontend/src/features/clases/clases-r4.ataque.test.tsx` |  |
| `AF15BD75457BB2560E1D60BA3EB369786FE869BC3DCAE5FCE144C52049D7E4E8` | `frontend/src/features/clases/estatico-02c-r1.ataque.test.ts` |  |
| `CDD1ED8890859AE3E884822FC7074852A2173105114745D83FE9A15C1C47C626` | `frontend/src/features/clases/estatico-r1.ataque.test.ts` |  |
| `DE23D395DFE7A6F3D6D15EB48CB574599DC9D8204E5A90B255C0C10D25A186FA` | `frontend/src/features/clases/fila-01d-r1.ataque.test.tsx` |  |
| `54A5DAA368528F1B64BD809C79964E30C42C3A71F76E2013643695FAAFA6C73E` | `frontend/src/features/clases/foco-02c-r3.ataque.test.tsx` |  |
| `80EFD85B74264C125683DFB6D631A10DB40887C5E7315D5EF6FF7B49357EAAD7` | `frontend/src/features/clases/foco-02c-r4.ataque.test.tsx` |  |
| `32C1F6A48BA3241963CF6864BD2236A0675425241D4389B524CBE805C358A5CC` | `frontend/src/features/clases/foco-02c-r5.ataque.test.tsx` |  |
| `FDC9F0D1D5BDF7D8C6E9E7F15CCFA2D909F717E9465A8279F5540FB704958BB9` | `frontend/src/features/clases/foco-pestana-02d-r3.ataque.test.tsx` |  |
| `0F3F8173AD209418B1B3106C755EC83808581389D65A8549B93C69B29B22F013` | `frontend/src/features/clases/heredados-02d-r1.ataque.test.tsx` |  |
| `0F60F1582FCE6E5EFAF9BF6856133DC30F1DC4EB9C3B7FEA19F90A330F8335B3` | `frontend/src/features/clases/inicio-sin-datos-02c-r1.ataque.test.tsx` |  |
| `7C434A0E54E70B12D4B2A3DE22FFB4DBF5F28A1CFBD2290C22E8A2B59EDF0E16` | `frontend/src/features/clases/inicio-sin-datos-r2.ataque.test.tsx` |  |
| `A4DE3A7DC35DAEDFF86FD41349EA09140213E918613603D0985C698FF41D29F7` | `frontend/src/features/clases/maestros-02c-r1.ataque.test.tsx` |  |
| `B487B8C8C95BADC6BC78F3BE72B7B5F809381E8C69127D6600254B872DE62EBC` | `frontend/src/features/clases/muro-02c-r1.ataque.test.tsx` |  |
| `9D35E0DA961248750C2948E3F69305856BCDD25E78E01C64AA50DCDFEEE93F8D` | `frontend/src/features/clases/muro-c-r1.ataque.test.tsx` |  |
| `C50A5D53AD16EAFF69ABEC6F531B6C0EDD74CE4ECDA02380EDFBF66F7E5BA89B` | `frontend/src/features/clases/muro-c-r2.ataque.test.tsx` |  |
| `1AC0F4A0474E7F334BC57D4F2BA23954E8C280FA0C3573A26350D0ADE431FF75` | `frontend/src/features/clases/muro-c-r3.ataque.test.tsx` |  |
| `67B60A9A5363F88E6CEBA210C27452B8D639F6DF798AA4E506DC54BB2312249A` | `frontend/src/features/clases/personas-02d-r1.ataque.test.tsx` |  |
| `2911195DC97BF9B25E7E874E0A0B6C9C0D25A9A878C2E821A752D340D219A740` | `frontend/src/features/clases/refactor-01c-r1.ataque.test.tsx` |  |
| `4303EAC77B98E8978495D9E68FD7725AC436F9DB757DBC0C02C59051436908FA` | `frontend/src/features/clases/reloj-01e-r4.ataque.test.tsx` |  |
| `A4AA15CEF1A377EED688DAB1B92E5CA4A3943490144CEC861CF7B482845B0362` | `frontend/src/features/clases/segmentado-02d-r1.ataque.test.tsx` |  |
| `D899C19BA982FBDE2208BBC7FA009869556C84BD4650586DBD9EE90B22234E47` | `frontend/src/features/clases/tarjeta-01d-r1.ataque.test.tsx` |  |
| `97AF503E763F7DFF9FCFBDC72862CD21DE6AF8E51D3EC41134F8475D98AE2DF6` | `frontend/src/features/clases/tarjeta-01d-r2.ataque.test.tsx` |  |
| `7F9D22E5904192DCC00465FADCABF36AA5DE3CD16D6A319A41A66340BB9BD6A8` | `frontend/src/features/clases/trabajo-01e-r1.ataque.test.tsx` |  |
| `F6924BC272A5240CF97D35729C797CC10960ED7CF94FE1BE1B69CA2DF6C1CF8F` | `frontend/src/features/clases/trabajo-01e-r2.ataque.test.tsx` |  |
| `9866EF34167061E2715B65A352C55D08C7E9268033E879AE633C7FD568E4D49F` | `frontend/src/features/clases/ventana-02c-r2.ataque.test.tsx` |  |
| `008E5C606F249D15E3816E27E3E97FD7D7FBA0F8697751A156665A76694B3A18` | `frontend/src/features/clases/ver-mas-01e-r3.ataque.test.tsx` |  |
| `4F486CA37D2A2BB6CC26754281D2ADCE086A9D8D4485A069DE7AE5D54E360ACF` | `frontend/src/features/tareas/entregas-01d-r1.ataque.test.tsx` |  |
| `93A5A0A648669E9C96494A62B2B16082B07296F279E2892BF2C8D47834EE2FC1` | `frontend/src/features/tareas/entregas-01d-r2.ataque.test.tsx` |  |
| `432DCDDF119DD0E32E49ADC42D5F51D197698C8896E1058C505AB31F4A8EE838` | `frontend/src/features/tareas/entregas-01d-r3.ataque.test.tsx` |  |
| `FD66C82D400E0F0A9709960934B555568642D9E4B5E41F31AD6606A620836982` | `frontend/src/features/tareas/entregas-01e-r1.ataque.test.tsx` |  |
| `496652BC59817166F53E00CB828F2119C857C2834063A31764D7876DC150C930` | `frontend/src/features/tareas/entregas-01e-r2.ataque.test.tsx` |  |
| `BFDED7507BC684EA9858CD76517EF0E4C23CBC69E5A19F381E6EC522FD6156E6` | `frontend/src/features/tareas/tareas-01a-r1.ataque.test.tsx` |  |
| `B778FC2E6BB0A8F8715A56877B3B781439CA214C8A9C8AE126F610C95229882A` | `frontend/src/features/tareas/tareas-01d-r1.ataque.test.tsx` |  |
| `BF3C999033195CAC778A82A579E44729FB07A405F5CDB41D8E7DC932CB71F942` | `frontend/src/features/tareas/tareas-01d-r2.ataque.test.tsx` |  |
| `3567D7C23D2CF6A2FD538CD6822EF60AC3CFFEAC036394ED1E3559DEBE492C57` | `frontend/src/features/tareas/tareas-01d-r3.ataque.test.tsx` |  |
| `6BBE2BD85E2B5500FBAB4D0F51630C0C8E9D65B1A63045AD1FA906298A92A435` | `frontend/src/features/tareas/tareas-01d-r4.ataque.test.tsx` |  |
| `C71CBA65DD284D7AF11CBC812B6BCF75BAA373939EDB8318E731858D9C50173F` | `frontend/src/lib/format-d-r1.ataque.test.ts` |  |
| `89DBBB70D5DC404C3D74DB5391D10855C8CB1D6B4C643B6147B3CE6FFB2637AF` | `frontend/src/lib/format-d-r2.ataque.test.ts` |  |
| `BFA7DED62F7A1402590D438A1CC51060A63FA019AD47D3EB5740E43383064A2A` | `frontend/src/lib/format-d-r3.ataque.test.ts` |  |
| `10C730348D18FF8DAE7B3623751D31122AA58560B564AD191717FA1938A6F8CE` | `frontend/src/services/apiClient.ataque.test.ts` |  |
| `CED32202A8DEB611027E965FB5EBD56A9848A1EE3467474BFBAED64374D3BF5B` | `frontend/src/styles/clases-r1.ataque.test.ts` |  |
| `B8085BCBBC7F4B6276BF3A87FB7BA0BC887953A8C6CE372354A7F3F1B5037582` | `frontend/src/styles/tokens-r1.ataque.test.ts` |  |

## Corrección de M-04 (01a)
Hallazgo de la revisión final del manager (`revision.md`, "Revisión final — CALIFICACIONES-01a", M-04): CAL-T-13 contaba en toda la base los comentarios con `"é".repeat(1000)`, y `hilo-privado.integracion.test.ts:360-363` escribe el mismo texto en paralelo sobre la misma base. Defecto de aislamiento de mi prueba, no de producción. Ningún archivo de producción, de `shared/`, prueba normal ni de "No se toca" cambió.

### Diff (único cambio: `backend/test/calificaciones-01a-r1.ataque.test.ts`, CAL-T-13)
```diff
-    expect(await obtenerDb().comentario.count({ where: { texto: mil } })).toBe(1)
+    // M-04: solo los de la tarea del escenario; hilo-privado.integracion escribe el mismo texto.
+    expect(
+      await obtenerDb().comentario.count({
+        where: { texto: mil, entrega: { tareaId: e.tareaId } },
+      }),
+    ).toBe(1)
```
- Lo que demuestra no cambia: el comentario de 1000 caracteres visibles se guarda una sola vez en el hilo de la entrega del escenario. Los cinco 400 previos siguen comprobados con `fotoDeCalificar` (fila, puntajes, comentarios de esa entrega y trabajos de esa tarea), que ya estaba acotada.
- El formato lo dejó Prettier (`npx prettier --write test/calificaciones-01a-r1.ataque.test.ts`, desde `backend/`, solo ese archivo).

### Hermanos (mismo patrón: conteo, `findMany` o aserción sobre `pgboss.job`, `comentarios`, `entregas`, `puntajes_rubrica`, `archivos` o `notificaciones` sin acotar al escenario)
Grep de `count(`, `findMany(`, `findFirst(`, `findUnique(`, `$queryRaw`, `$executeRaw`, `pgboss` y `FROM ` en los cuatro archivos de 01a, más los ayudantes que usan (`fotoDeCalificar`, `trabajosDeCalificacion` → `trabajosDeTarea`, `trabajosDeEntregaDeTarea`, `idsDeCriterios`) y las reescrituras C-n de la ronda 0.

| # | Lugar | Filtro | ¿Aplica? | ¿Corregido? |
|---|---|---|---|---|
| 1 | `calificaciones-01a-r1:569` CAL-T-13, `comentario.count` | solo `texto` literal | **Sí (M-04)** | **Sí** |
| 2 | `calificaciones-01a-r1:126` `calificacionEnDb`, `entrega.findUnique` | `tareaId_alumnoId` del escenario | No | — |
| 3 | `calificaciones-01a-r1:142`, `:458`, `:473`, `:513`, `tarea.findUnique` | `id: e.tareaId` | No | — |
| 4 | `calificaciones-01a-r1:210` y demás usos de `trabajosDeCalificacion(e.tareaId)` | `name` + `data->>'tareaId'` | No | — |
| 5 | `calificaciones-01a-r1:322` CAL-T-06, `puntajeRubrica.count` | `criterioId in` los criterios de la otra tarea creada en el mismo caso | No | — |
| 6 | `calificaciones-01a-r1:531` CAL-T-12, `comentario.findFirst` | `texto` con `randomUUID()` (único por prueba) | No | — |
| 7 | `calificaciones-01a-r1:554` CAL-T-12, `comentario.count` | `id` del comentario | No | — |
| 8 | `calificaciones-01a-r1:614` CAL-T-22, `pgboss.job` | `name` + `data->>'entregaId'` de su entrega | No | — |
| 9 | `fotoDeCalificar` (`ayudas-calificaciones.ts:178`), usada en r1 y r2 | entrega por `tareaId_alumnoId`; puntajes y comentarios por `entregaId`; trabajos por `tareaId` | No | — |
| 10 | `calificaciones-carreras-01a-r1:112` y `:118`, `SELECT … FOR UPDATE` | `id` de la fila del escenario | No | — |
| 11 | `calificaciones-carreras-01a-r1:146`, `tarea.findUnique` | `id: tareaId` | No | — |
| 12 | `calificaciones-carreras-01a-r1:176-182` (foto del borrado) | `id`/`tareaId`, y puntajes por `entregaId in` o `criterioId in` del escenario | No | — |
| 13 | `calificaciones-carreras-01a-r1:185` `idsDeEntregas`, `entrega.findMany` | `tareaId` | No | — |
| 14 | `calificaciones-carreras-01a-r1:281` y `:363`, `trabajosDeCalificacion` | `tareaId` | No | — |
| 15 | `calificaciones-carreras-01a-r1:310`, `puntajeRubrica.count` | `criterioId in e.criterios` | No | — |
| 16 | `calificaciones-carreras-01a-r1:425`, `entrega.findMany` | `tareaId: e.tareaId` | No | — |
| 17 | `calificaciones-estatico-01a-r1` (CAL-T-20 y CAL-T-21) | lee archivos de `src/`, sin base | No | — |
| 18 | `calificaciones-01a-r2:154`, `:198`, `:545`, `:660`, `findUnique` | `id` o `tareaId_alumnoId` del escenario | No | — |
| 19 | `calificaciones-01a-r2:438`, `puntajeRubrica.findMany` | `entregaId: fila.id` | No | — |
| 20 | `calificaciones-01a-r2:445`, `trabajosDeCalificacion` | `tareaId` | No | — |
| 21 | `calificaciones-01a-r2:512`, `archivo.count` | `claseId: e.claseId` + `subidoPor: e.alumno.id` (clase propia) | No | — |
| 22 | `calificaciones-01a-r2:515`, `trabajosDeEntregaDeTarea` | `name` + `data->>'tareaId'` | No | — |
| 23 | `calificaciones-01a-r2:571` y `:624`, `criterioRubrica.count` | `tareaId` | No | — |
| 24 | `calificaciones-01a-r2:597-601` y `:620-630`, `entrega`, `puntajeRubrica`, `comentario` y `tarea` | `tareaId`, `id`, `entregaId in ids` o `criterioId in e.criterios` del escenario | No | — |
| 25 | C-1 (`sesiones-y-cadena.ataque:544`) | lista de rutas de la app, sin base | No | — |
| 26 | C-2 (`entregas-01b-r1.ataque:650`), `UPDATE entregas` | `id = fila.id` | No | — |
| 27 | C-3 (`lecturas-fx-r2.ataque:967`) | lectura estática de `src/`, sin base | No | — |
| 28 | C-5 y C-6 (cinco `*.ataque` del frontend) | dobles en memoria, sin base | No | — |

- Ninguno de los cuatro archivos lee `notificaciones`.
- El único filtro por un literal que otra prueba puede repetir era el de M-04. Los demás textos por los que se busca llevan `randomUUID()`.

### Comandos y última línea (desde `backend/`, uno a la vez, Docker Desktop encendido, motor 28.5.1)
| Comando | Código | Última línea / resumen |
|---|---|---|
| `npx prettier --write test/calificaciones-01a-r1.ataque.test.ts` | 0 | (solo ese archivo) |
| `npm run lint` | 0 | `> tsc -p tsconfig.json --noEmit && tsc -p tsconfig.test.json` (antes: `All matched files use Prettier code style!`) |
| `npx vitest run test/calificaciones-01a-r1.ataque.test.ts` | 0 | `Duration  11.96s (…)`; `Test Files  1 passed (1)` · `Tests  15 passed (15)` |
| `npm run test` (1.ª, 10:14:07) | 0 | `Duration  131.27s (transform 14.57s, setup 5.97s, import 231.19s, tests 1049.59s, environment 50ms)`; `Test Files  207 passed (207)` · `Tests  2553 passed (2553)` |
| `npm run test` (2.ª, 10:16:53, después de terminar la 1.ª) | 0 | `Duration  131.94s (transform 14.73s, setup 5.94s, import 232.90s, tests 1054.82s, environment 48ms)`; `Test Files  207 passed (207)` · `Tests  2553 passed (2553)` |

### PA-07 de las dos corridas completas
Salida de cada una a `<scratchpad>/m04-full1.log` y `<scratchpad>/m04-full2.log`; conteo con `grep -o … | wc -l` por término; atribución con `<scratchpad>/r1/pa07.mjs` (el de la ronda 1: último "incoming request" del mismo `pid` y `requestId`, por app).

| Término | 1.ª | 2.ª |
|---|---|---|
| `40P01` | 0 | 0 |
| `deadlock detected` | 0 | 0 |
| `could not serialize` | 0 | 0 |
| `too many clients` | 0 | 0 |
| `"Error no controlado"` | 10 | 10 |
| `"code":"P2028"` | 5 | 5 |
| (aparte) `Unable to start a transaction` | 0 | 0 |
| (aparte) `Test timed out` | 0 | 0 |

- **Control positivo, completo en las dos:** los tres de `servicio-ocupado.integracion`, nivel 40, en un mismo `pid` (1.ª 20100, 2.ª 29604): `POST /api/auth/cambiar-contrasena` › `tx.sesion.findFirst()`; `POST /api/auth/refrescar` › `tx.sesion.updateMany()`; `POST /api/clases/:claseId/publicaciones/:publicacionId/comentarios` › `prisma.$queryRawUnsafe()`.
- **Los dos de `cuentas-r3.ataque`** (1.ª `pid` 5688, 2.ª 20760): `POST /api/auth/login` › `tx.sesion.create()` y `POST /api/auth/restablecer` › `tx.tokenCuenta.updateMany()`. Ningún `P2028` fuera de la lista.
- **Los diez `"Error no controlado"`, iguales al inventario I-1:** 1 a 6, `POST /api/auth/login` (cinco "fallo simulado de la base en la búsqueda" y uno "… al crear la sesión", `intentos-r2.ataque`); 7 a 9, `POST /api/clases/:claseId/archivos`, `POST …/archivos/:archivoId/descarga` y `GET …/publicaciones` (`ZodError` de la URL del almacén, `archivos-d-r2.ataque` T-39); 10, `GET /api/prueba/error-comun` › `boom` (`salud.integracion`).
- Ningún rojo ni intermitencia en las dos corridas (PA-12 no aplica). **PA-07: limpia en las dos.**

### Tabla de SHA-256 de las 179 `*.ataque` tras la corrección de M-04 (base de V-01 de la subentrega siguiente)
Calculada con `sha256sum` sobre `git ls-files -co --exclude-standard | grep -E '\.ataque\.test\.tsx?$' | sort`. Contra la tabla de la ronda 2, `diff` da una sola diferencia: `backend/test/calificaciones-01a-r1.ataque.test.ts`. Las otras 178 no cambian. Ningún hermano necesitó corrección, así que no hay filas "Corregida (hermano de M-04)".

| SHA-256 | Archivo | Nota |
|---|---|---|
| `BCCE2CAE771F97957D8691BEF7FFF4EC42412DAAEABF726AEB0AFC59F6F25671` | `backend/src/config/correo.ataque.test.ts` |  |
| `DCB78D222544E8DC4FBECE59468F555B04ABE971B70016E9BB17FCAE3E958580` | `backend/src/config/env.ataque.test.ts` |  |
| `71E7F049447D2D1ECEDD897C55EA0B6D31221753F0A7E7473C7AC6E8667F0A95` | `backend/src/config/logger.ataque.test.ts` |  |
| `91F620C1A27778EEBC2BED5EEC1BC9B0E3FE1199B32ED00F9DD910011D6A1805` | `backend/src/core/clases/codigo-r1.ataque.test.ts` |  |
| `262691F5786AD63B2393D0BA5FF97538F6DACF43343BED019AD23C12A07D8686` | `backend/src/core/clases/codigo-r2.ataque.test.ts` |  |
| `E769CBFCC3A83A64B51C6437F80684640A7C928AD6B8C5C1671FDFF005D7B734` | `backend/src/workers/ritmo-03c-r1.ataque.test.ts` |  |
| `294BE1AF0BF69D6C05F54E2F0D8E587C78A5527D0B64D1A224C058E31CE013D0` | `backend/test/admin-muro-02b-r1.ataque.test.ts` |  |
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
| `5E02A27716D63E8CE0FE6B6171BFF089EB3EE2548260349B16950D7E65A1BCF9` | `backend/test/calificaciones-01a-r1.ataque.test.ts` | Corregida (M-04) |
| `B00C2C10D8D862F6576CB69173F07D190A08A18A25439C296D10B74E9772A454` | `backend/test/calificaciones-01a-r2.ataque.test.ts` |  |
| `DD919EBD74A2C6AC60C244A1563B46895821B0D25E5051CDA25FFFB72B653416` | `backend/test/calificaciones-carreras-01a-r1.ataque.test.ts` |  |
| `B09BAAEC53455CEA1A0674890EBD9353007E6F2628001446E873B09279FFBA07` | `backend/test/calificaciones-estatico-01a-r1.ataque.test.ts` |  |
| `6E3C92C13F146A01C8DCFDC7DD04BEA59F0E2562051F6AC65F95F924EF73E4DB` | `backend/test/categorias-01a-r1.ataque.test.ts` |  |
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
| `6F72C7CC1D0F95D60C057D7406A8955C47E834C963ED53D15DF64C83049F5431` | `backend/test/entregas-01b-r1.ataque.test.ts` |  |
| `5BAAF6F8FB76320620ED4A84EFACA2B2D473460F62360E0D48738B97A0AC584A` | `backend/test/entregas-01b-r2.ataque.test.ts` |  |
| `BA1AC9B17CC9BF747522BD4EC8B87DF436008482E643B18EEA8E9A8C041C59B3` | `backend/test/formada-ch-r1.ataque.test.ts` |  |
| `EC9602D5F109B45A6D428E708D9B6CDD37A7509A6FF9031FA6FD8A2DA0E25E9B` | `backend/test/gestion-02a-r1.ataque.test.ts` |  |
| `5F4133F949D2F337A8F63B75CF82CB77114DB7812D67C1960105F5000C31A326` | `backend/test/guarda-ch-r1.ataque.test.ts` |  |
| `7A7DAC6D87EDF81059FCFF9C07471AAF49D690EC159BE4B9FD4AA32B0909A215` | `backend/test/guarda-ch-r2.ataque.test.ts` |  |
| `610EE44E5D0BCEA46EB4E3645F9ADF1998A76947A25AF7E3F8248EA3A633DF79` | `backend/test/guarda-ch-r3.ataque.test.ts` |  |
| `E5D149F3AC52B726E1FE08908249706341330F88EAA6674B9A9AC67B98B1E864` | `backend/test/guarda-clase-r1.ataque.test.ts` |  |
| `C979D2C9C420A2177FA6EBDDB78EB2CE84D5F043B94270F690916A6FC75D6F8F` | `backend/test/guarda-clase-r2.ataque.test.ts` |  |
| `20982E2B98F1B162146A211923F3D5EC19D4E170C4AA3A5BFC6F82C3B6173AAD` | `backend/test/guarda-r2.ataque.test.ts` |  |
| `2649F3D357DCB806361AC101C57FCB504B9C798B631048F0B3E200F63DA7DC30` | `backend/test/hilo-01c-r1.ataque.test.ts` |  |
| `2D2216EE9DB290B318825A6F73C346D4767CACC12D95F5CA76457A78B63FEDC3` | `backend/test/instantanea-01b-r1.ataque.test.ts` |  |
| `A8B79D5AD98270BE3747F493865708A78BB73ADD08D832584DB4464C3582777A` | `backend/test/intentos-r2.ataque.test.ts` |  |
| `2619B44EEA3370494C95AC128FCFD9E3FFC20D1581A19F549BF371F603A11D7D` | `backend/test/invitacion-flujo-03a-r2.ataque.test.ts` |  |
| `704155928183AEC193AE7E157B86B3E9361D2B63C7A47BE1ED859605FAB4FFA6` | `backend/test/invitacion-masiva-03c-r1.ataque.test.ts` |  |
| `DD9B7454E8786BF0B833D265900CCAECF595808CEBC8E9A77C9AEF15298A1038` | `backend/test/invitacion-masiva-03c-r2.ataque.test.ts` |  |
| `47663E2ADCCD34564AD9B1CAE6E99E06863A7D31FEA779793C9A805C9BD7FE0B` | `backend/test/lecturas-fx-r1.ataque.test.ts` |  |
| `3790777831A1FACB053D0719D85AB404593954416B1443A1A59530E09E2C81DC` | `backend/test/lecturas-fx-r2.ataque.test.ts` |  |
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
| `D6B9ADAF1C14A61FE369F510774EF702CFA20F28F3CB19B0EB7357440DCB0783` | `backend/test/migracion-01a-r1.ataque.test.ts` |  |
| `D95AB72A3FD3D70CE3A9027A50DB660426976C3DF1A46E92DF75066BEAC78A0C` | `backend/test/muro-c-r1.ataque.test.ts` |  |
| `7825CFC9B484DF740FA0E9562A195D1BBCAF4CAF72EA55FA847B5394AB96C125` | `backend/test/muro-c-r2.ataque.test.ts` |  |
| `8B733B86FC6D54ECE008389A59793FAE4EC4A65146EB37215E900E50A5337D46` | `backend/test/nombres-guarda-r3.ataque.test.ts` |  |
| `3FD2583A4DE7CD432B2E09A5130C23D6A59FA475E5E0AA69F23739351ACBF9CF` | `backend/test/nombres-ids-01a-r2.ataque.test.ts` |  |
| `00A6EB6F7CCD7D8790C356BEFCC96DDFDA6EACCE0BE53DE255CFE3626D8F2ADB` | `backend/test/nombres-tokens-r2.ataque.test.ts` |  |
| `80B5A848F69B429E7DADEC86C07BEC1D3E3EED8A042EFBA41CE912DED39E7BAB` | `backend/test/nowait-ch-r1.ataque.test.ts` |  |
| `AD0DAB1952E509237ACAC12BB1F6774FA9C5DE8B44D1E6928EDC65CC67A78C21` | `backend/test/referencias-01b-r1.ataque.test.ts` |  |
| `6F2ABC2CEFD77D74CD1E3ABBDCE9C41BB53D00BD4D8E5BA7E496C4441C2697E5` | `backend/test/servicio-ocupado-ch-r1.ataque.test.ts` |  |
| `A4207FC5519D72D48F9AF4AEC8A67AB0FCB369071018708B67E57151F6A43088` | `backend/test/sesiones-y-cadena.ataque.test.ts` |  |
| `70AC720F2E7FCADEE5BBCB6414887AB08129DEA7CD91DF012046953B1584E8B6` | `backend/test/sexto-paso-02a-r1.ataque.test.ts` |  |
| `C89C30851E6B409CD045017181147BF674DF947762A8DEA3F3FB981BD9B36E09` | `backend/test/tareas-01a-r1.ataque.test.ts` |  |
| `79BC7AAFC11676D36129610A4B5CD5FE5D8234D0D748487FD2F3E48C5F772C79` | `backend/test/tareas-01b-r1.ataque.test.ts` |  |
| `AE60C11CFF5C82DF4954DB48582DF4BD5A64957FF9AFAF9712AA43A038F8E189` | `backend/test/temas-01a-r1.ataque.test.ts` |  |
| `DC7B86A621062ED671C1E7174A745019133FBD410C7A2E78114B2A2C50AFFE95` | `backend/test/temas-01a-r3.ataque.test.ts` |  |
| `F09E9A0038C47D1A2223376A0AF260BAF573F0C45BF770201C48C9E30296F04B` | `backend/test/worker-03c-r1.ataque.test.ts` |  |
| `9F60F9D65D52D2021A1EB04E9F01D3CC68F22744C845BF93D6621AA4FE9713A8` | `backend/test/worker-r1.ataque.test.ts` |  |
| `77D11BD85F202A9EEC92A363DF82E63FB9A784CA9D368D49F62E61C1A2AA967B` | `backend/test/worker-r2.ataque.test.ts` |  |
| `0DE083DF355129E800D130F33D228835479C25F49ED82B6C2BCF9CF5F6E944CB` | `frontend/src/app/barra-02d-r1.ataque.test.tsx` |  |
| `B89EDE0F6AED45DFCB5E64C8909A822156CE43FD80948E72419CDCE9D4541A87` | `frontend/src/app/cache-03a-r1.ataque.test.tsx` |  |
| `E85743C0FBB8E476874A2C67334342D8D69D14153579FC1E4CCE0AE6E2B29616` | `frontend/src/app/contexto-r1.ataque.test.tsx` |  |
| `BC2BE5541006887E2A5A4A89B33046180F607D54474B0F96A73D615AFBCAC385` | `frontend/src/app/contrasena-r1.ataque.test.tsx` |  |
| `F38BCACB716D8A39ACDB3535A95603CD0D8AB02572CA57A7DF5268B01CEB6EAC` | `frontend/src/app/contrasena-r2.ataque.test.tsx` |  |
| `68FB5D092C0C8ECFCF282477EF023AAAE26F6B869656E05109DC3EFA276D842A` | `frontend/src/app/cuentas-r1.ataque.test.tsx` |  |
| `41930017715D3D6869DC7ACEFD75DE8EC3684F1F035B845ABDF8EC0F6B734DEE` | `frontend/src/app/cuentas-r2.ataque.test.tsx` |  |
| `1506C27E5F7418B5E087FD30F8809645A2FC3E2761C7249DE78F02E24AA6C7A5` | `frontend/src/app/en-espera-r1.ataque.test.tsx` |  |
| `DB48DAD405C27062621A44D3744C84CC5903892A51E5A8DF18F41383CB9C88A3` | `frontend/src/app/errores-r1.ataque.test.tsx` |  |
| `0E1D93E4DD3CBC7B5E9475A17B5CA66F0DF056BA25CB117249F4C2E2F5887A51` | `frontend/src/app/foco-barra-02d-r2.ataque.test.tsx` |  |
| `2154B5C15F696A0C7F884BFF774CF4E2A4208A5281DB9076653F8253E2385AB9` | `frontend/src/app/foco-pestana-02d-r3.ataque.test.tsx` |  |
| `F95321E604E20B533EBF2DB3C1C6C66BA2F2D87A48F075415B766551F6EE30F4` | `frontend/src/app/fondo-r1.ataque.test.tsx` |  |
| `57CB54AFD3B79464F0DF01B88FC388CEBBEAC5657D936C4C204CBAE6034B0834` | `frontend/src/app/marco-r1.ataque.test.tsx` |  |
| `446CE2CC8A4F254F94FF6313EB13837421F98749C2473AA0B8979388E7CE674A` | `frontend/src/app/muro-recuperar-c-r3.ataque.test.tsx` |  |
| `DC0365EDB436B3F2EE256882EF13F2295CDFCB83A63F9BA3939381983E43FDFC` | `frontend/src/app/muro-recuperar-c-r4.ataque.test.tsx` |  |
| `2F8056A770397C1601647277944555A48AFC4B9A2BABEB75E5898F0CC92562BB` | `frontend/src/app/muro-rutas-c-r1.ataque.test.tsx` |  |
| `0EEFED2C05D76B0790A437E9465A898A9076083B1F046F8785145CFAAD0DA379` | `frontend/src/app/registro-maestro-03b-r1.ataque.test.tsx` |  |
| `053E867A904AFA3C09EEF92CA2E03E929D9F9C93F714040856F40C7418721BBE` | `frontend/src/app/router.ataque.test.tsx` |  |
| `F0657FB91F7B3ACCF64726292F9324C6742C1AC537C6C4A1985EC4E32AE09C83` | `frontend/src/app/rutas-02c-r1.ataque.test.tsx` |  |
| `C7946F5F5D5D16D36B395ADC2AD9928ACC7FD9839875FB64532B51489756730B` | `frontend/src/app/rutas-clases-r1.ataque.test.tsx` |  |
| `F090CBD8E8C9B0AF52D4FC19547B07E9B6413F5414CC4B10862F01E29818DDDC` | `frontend/src/app/sesion-r2.ataque.test.tsx` |  |
| `7CF085827D8FA981E56822431B8A5C6B7AB08B44477D43F739EBC269D2B8F899` | `frontend/src/components/layout/estatico-r1.ataque.test.ts` |  |
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
| `932E76314E0447DA1790C3C86CA48545EEA834FEAF6F706C4D405B7EA62BE872` | `frontend/src/features/clases/alumnos-b-r1.ataque.test.tsx` |  |
| `55DC274ECA96DA4360848B88F9F2A839AC815031490AB57FF38DE074512D632C` | `frontend/src/features/clases/alumnos-b-r2.ataque.test.tsx` |  |
| `371518E4309F14201A92D29F9436A97A19801B506D45114964FBCFE3F5CD4183` | `frontend/src/features/clases/alumnos-b-r3.ataque.test.tsx` |  |
| `266D088DD727F18AF8C8A106B8D9C4DBED75753E4B1B4ABB12F3A4DF870ECB7F` | `frontend/src/features/clases/alumnos-b-r4.ataque.test.tsx` |  |
| `856CFFBD9C743F9815DAF731487E29DC5F5272545DC15820A70BAF86ECFA6527` | `frontend/src/features/clases/alumnos-b-r5.ataque.test.tsx` |  |
| `CC2FDD28CEB3DE642EE01D07773271D7154811B1F3756333F1DFB285A386E6CC` | `frontend/src/features/clases/archivos-d-r1.ataque.test.tsx` |  |
| `36C32BAD5F632CAD5D76BCA14C74779DDD7CF9B9465A69522886DB770A508B22` | `frontend/src/features/clases/archivos-d-r2.ataque.test.tsx` |  |
| `14CB04B6B56BF2F83DE04DAB863E7843FACA3A585E70FEBC93EE3588F06AB144` | `frontend/src/features/clases/archivos-d-r3.ataque.test.tsx` |  |
| `71148A960F7EF6995904B3DB6DFD0B0E3BA6AF697C45399669EC1DD81CC7D1AA` | `frontend/src/features/clases/cargar-mas-02c-r2.ataque.test.tsx` |  |
| `A3880B67FFAA0D15763D1C761CEF1FF8472029C77BFB2211AB079EADB1685325` | `frontend/src/features/clases/categorias-01e-r1.ataque.test.tsx` |  |
| `66C0B873BC8B9D8E9E01AC871BD6AAAB4328508BEB5EC9371D69463D7C12430D` | `frontend/src/features/clases/categorias-01e-r2.ataque.test.tsx` |  |
| `DD4B9C07F940B55085B7EF8113994E3DB60FAD6A2FF3B5809E0DCB8F2568E336` | `frontend/src/features/clases/clases-admin-02c-r1.ataque.test.tsx` |  |
| `5F0679D8CFACC8BCE01989C04A415DC5B546625EB7DEC92F03959DE5A0F89815` | `frontend/src/features/clases/clases-r1.ataque.test.tsx` |  |
| `C7AD5EDC733E374117A9277F1C2987E84CC2930C77EB4C720CCF15CC9F5FAB45` | `frontend/src/features/clases/clases-r2.ataque.test.tsx` |  |
| `A835A11D29AEDB8F77F91E826A22C2B7CF5322FCED3F6BED0C1ACBF7C75A4E61` | `frontend/src/features/clases/clases-r3.ataque.test.tsx` |  |
| `86B04D234527ECEEFCA35B07CE89E6B7CE0B6AFE5CCDEE2F005E6A4219F0495A` | `frontend/src/features/clases/clases-r4.ataque.test.tsx` |  |
| `AF15BD75457BB2560E1D60BA3EB369786FE869BC3DCAE5FCE144C52049D7E4E8` | `frontend/src/features/clases/estatico-02c-r1.ataque.test.ts` |  |
| `CDD1ED8890859AE3E884822FC7074852A2173105114745D83FE9A15C1C47C626` | `frontend/src/features/clases/estatico-r1.ataque.test.ts` |  |
| `DE23D395DFE7A6F3D6D15EB48CB574599DC9D8204E5A90B255C0C10D25A186FA` | `frontend/src/features/clases/fila-01d-r1.ataque.test.tsx` |  |
| `54A5DAA368528F1B64BD809C79964E30C42C3A71F76E2013643695FAAFA6C73E` | `frontend/src/features/clases/foco-02c-r3.ataque.test.tsx` |  |
| `80EFD85B74264C125683DFB6D631A10DB40887C5E7315D5EF6FF7B49357EAAD7` | `frontend/src/features/clases/foco-02c-r4.ataque.test.tsx` |  |
| `32C1F6A48BA3241963CF6864BD2236A0675425241D4389B524CBE805C358A5CC` | `frontend/src/features/clases/foco-02c-r5.ataque.test.tsx` |  |
| `FDC9F0D1D5BDF7D8C6E9E7F15CCFA2D909F717E9465A8279F5540FB704958BB9` | `frontend/src/features/clases/foco-pestana-02d-r3.ataque.test.tsx` |  |
| `0F3F8173AD209418B1B3106C755EC83808581389D65A8549B93C69B29B22F013` | `frontend/src/features/clases/heredados-02d-r1.ataque.test.tsx` |  |
| `0F60F1582FCE6E5EFAF9BF6856133DC30F1DC4EB9C3B7FEA19F90A330F8335B3` | `frontend/src/features/clases/inicio-sin-datos-02c-r1.ataque.test.tsx` |  |
| `7C434A0E54E70B12D4B2A3DE22FFB4DBF5F28A1CFBD2290C22E8A2B59EDF0E16` | `frontend/src/features/clases/inicio-sin-datos-r2.ataque.test.tsx` |  |
| `A4DE3A7DC35DAEDFF86FD41349EA09140213E918613603D0985C698FF41D29F7` | `frontend/src/features/clases/maestros-02c-r1.ataque.test.tsx` |  |
| `B487B8C8C95BADC6BC78F3BE72B7B5F809381E8C69127D6600254B872DE62EBC` | `frontend/src/features/clases/muro-02c-r1.ataque.test.tsx` |  |
| `9D35E0DA961248750C2948E3F69305856BCDD25E78E01C64AA50DCDFEEE93F8D` | `frontend/src/features/clases/muro-c-r1.ataque.test.tsx` |  |
| `C50A5D53AD16EAFF69ABEC6F531B6C0EDD74CE4ECDA02380EDFBF66F7E5BA89B` | `frontend/src/features/clases/muro-c-r2.ataque.test.tsx` |  |
| `1AC0F4A0474E7F334BC57D4F2BA23954E8C280FA0C3573A26350D0ADE431FF75` | `frontend/src/features/clases/muro-c-r3.ataque.test.tsx` |  |
| `67B60A9A5363F88E6CEBA210C27452B8D639F6DF798AA4E506DC54BB2312249A` | `frontend/src/features/clases/personas-02d-r1.ataque.test.tsx` |  |
| `2911195DC97BF9B25E7E874E0A0B6C9C0D25A9A878C2E821A752D340D219A740` | `frontend/src/features/clases/refactor-01c-r1.ataque.test.tsx` |  |
| `4303EAC77B98E8978495D9E68FD7725AC436F9DB757DBC0C02C59051436908FA` | `frontend/src/features/clases/reloj-01e-r4.ataque.test.tsx` |  |
| `A4AA15CEF1A377EED688DAB1B92E5CA4A3943490144CEC861CF7B482845B0362` | `frontend/src/features/clases/segmentado-02d-r1.ataque.test.tsx` |  |
| `D899C19BA982FBDE2208BBC7FA009869556C84BD4650586DBD9EE90B22234E47` | `frontend/src/features/clases/tarjeta-01d-r1.ataque.test.tsx` |  |
| `97AF503E763F7DFF9FCFBDC72862CD21DE6AF8E51D3EC41134F8475D98AE2DF6` | `frontend/src/features/clases/tarjeta-01d-r2.ataque.test.tsx` |  |
| `7F9D22E5904192DCC00465FADCABF36AA5DE3CD16D6A319A41A66340BB9BD6A8` | `frontend/src/features/clases/trabajo-01e-r1.ataque.test.tsx` |  |
| `F6924BC272A5240CF97D35729C797CC10960ED7CF94FE1BE1B69CA2DF6C1CF8F` | `frontend/src/features/clases/trabajo-01e-r2.ataque.test.tsx` |  |
| `9866EF34167061E2715B65A352C55D08C7E9268033E879AE633C7FD568E4D49F` | `frontend/src/features/clases/ventana-02c-r2.ataque.test.tsx` |  |
| `008E5C606F249D15E3816E27E3E97FD7D7FBA0F8697751A156665A76694B3A18` | `frontend/src/features/clases/ver-mas-01e-r3.ataque.test.tsx` |  |
| `4F486CA37D2A2BB6CC26754281D2ADCE086A9D8D4485A069DE7AE5D54E360ACF` | `frontend/src/features/tareas/entregas-01d-r1.ataque.test.tsx` |  |
| `93A5A0A648669E9C96494A62B2B16082B07296F279E2892BF2C8D47834EE2FC1` | `frontend/src/features/tareas/entregas-01d-r2.ataque.test.tsx` |  |
| `432DCDDF119DD0E32E49ADC42D5F51D197698C8896E1058C505AB31F4A8EE838` | `frontend/src/features/tareas/entregas-01d-r3.ataque.test.tsx` |  |
| `FD66C82D400E0F0A9709960934B555568642D9E4B5E41F31AD6606A620836982` | `frontend/src/features/tareas/entregas-01e-r1.ataque.test.tsx` |  |
| `496652BC59817166F53E00CB828F2119C857C2834063A31764D7876DC150C930` | `frontend/src/features/tareas/entregas-01e-r2.ataque.test.tsx` |  |
| `BFDED7507BC684EA9858CD76517EF0E4C23CBC69E5A19F381E6EC522FD6156E6` | `frontend/src/features/tareas/tareas-01a-r1.ataque.test.tsx` |  |
| `B778FC2E6BB0A8F8715A56877B3B781439CA214C8A9C8AE126F610C95229882A` | `frontend/src/features/tareas/tareas-01d-r1.ataque.test.tsx` |  |
| `BF3C999033195CAC778A82A579E44729FB07A405F5CDB41D8E7DC932CB71F942` | `frontend/src/features/tareas/tareas-01d-r2.ataque.test.tsx` |  |
| `3567D7C23D2CF6A2FD538CD6822EF60AC3CFFEAC036394ED1E3559DEBE492C57` | `frontend/src/features/tareas/tareas-01d-r3.ataque.test.tsx` |  |
| `6BBE2BD85E2B5500FBAB4D0F51630C0C8E9D65B1A63045AD1FA906298A92A435` | `frontend/src/features/tareas/tareas-01d-r4.ataque.test.tsx` |  |
| `C71CBA65DD284D7AF11CBC812B6BCF75BAA373939EDB8318E731858D9C50173F` | `frontend/src/lib/format-d-r1.ataque.test.ts` |  |
| `89DBBB70D5DC404C3D74DB5391D10855C8CB1D6B4C643B6147B3CE6FFB2637AF` | `frontend/src/lib/format-d-r2.ataque.test.ts` |  |
| `BFA7DED62F7A1402590D438A1CC51060A63FA019AD47D3EB5740E43383064A2A` | `frontend/src/lib/format-d-r3.ataque.test.ts` |  |
| `10C730348D18FF8DAE7B3623751D31122AA58560B564AD191717FA1938A6F8CE` | `frontend/src/services/apiClient.ataque.test.ts` |  |
| `CED32202A8DEB611027E965FB5EBD56A9848A1EE3467474BFBAED64374D3BF5B` | `frontend/src/styles/clases-r1.ataque.test.ts` |  |
| `B8085BCBBC7F4B6276BF3A87FB7BA0BC887953A8C6CE372354A7F3F1B5037582` | `frontend/src/styles/tokens-r1.ataque.test.ts` |  |

## Ronda 0 de 01b
Base: árbol de código en `<K1a>` = `216c1b5` (01a cerrada y confirmada; sin código de 01b). La ronda 0 no cuenta en el tope de 3 rondas. Solo reescribí las dos C-n de 01b que autoriza A-5 (C-1 y C-4); no toqué código de producción, `shared/`, pruebas normales (E6 de `bloqueo-usuario.integracion` es del programador) ni ningún archivo de "No se toca". No toqué nada del frontend, así que no corrí su suite.

### V-01
- **Base:** "Tabla de SHA-256 de las 179 `*.ataque` tras la corrección de M-04 (base de V-01 de la subentrega siguiente)" de este reporte.
- **Método:** `git ls-files -co --exclude-standard | grep -E '\.ataque\.test\.tsx?$' | sort | xargs sha256sum`, ordenada por ruta, contra la tabla con los hashes en minúsculas; `diff`.
- **Antes de tocar nada:** 179 de 179 iguales, ningún archivo de más ni de menos. **V-01 en verde.**
- **Después de las reescrituras:** siguen siendo 179; `diff` da exactamente dos diferencias, `backend/test/lecturas-fx-r1.ataque.test.ts` y `backend/test/sesiones-y-cadena.ataque.test.ts`.

### Reescrituras C-n de 01b (A-5)
Cada una con un comentario de una línea "C-n de CALIFICACIONES-01b (§D-R0, A-5): …". Las aserciones no cambian, salvo las listas exactas que §D-R0 manda ampliar. Archivos LF; `npx prettier --check` de los dos, desde `backend/`: "All matched files use Prettier code style!".

| C-n | Archivo | Cambio (diff resumido) | Motivo |
|---|---|---|---|
| C-1 | `backend/test/sesiones-y-cadena.ataque.test.ts` (caso de `:545`) | + comentario en `:544` ("se agregan exactamente GET y HEAD de …/gradebook y de …/mis-calificaciones"). El título pasa de "…, ENTREGAS-01c y CALIFICACIONES-01a: ninguna crea admins…" a "…, ENTREGAS-01c, CALIFICACIONES-01a y CALIFICACIONES-01b: ninguna crea admins…". La lista ordenada suma cuatro entradas, en el lugar que da el orden (`codigo` < `gradebook` < `mis-calificaciones` < `personas`): `"GET /api/clases/:claseId/gradebook"` y `"GET /api/clases/:claseId/mis-calificaciones"` después de `"GET /api/clases/:claseId/codigo"` (`:588-589`), y `"HEAD /api/clases/:claseId/gradebook"` y `"HEAD /api/clases/:claseId/mis-calificaciones"` después de `"HEAD /api/clases/:claseId/codigo"` (`:614-615`). De 97 a 101 entradas. | Los dos `GET` de §D-6 y §D-7 (Fastify agrega el `HEAD` de cada `GET`). Ninguna crea cuentas ni es pública. |
| C-4 | `backend/test/lecturas-fx-r1.ataque.test.ts` (caso de `:758`) | El título pasa de "…la opción solo se pide en las doce lecturas (cuatro de clases, dos del muro, dos de tareas y cuatro de entregas)" a "…en las catorce lecturas (cuatro de clases, dos del muro, dos de tareas, cuatro de entregas y dos de calificaciones)". + comentario en `:806`; la lista ordenada suma `"adapters/db/calificaciones.ts:2"` como primera entrada (`:807`, antes de `"adapters/db/clases.ts:4"`). Lo demás del caso (nadie fuera de `adapters/db` nombra la opción, `index.ts` no reexporta `enTransaccion`, los niveles solo en `cliente.ts`, los dos usos de `tareas.ts` en código) no cambia. | `leerGradebook` y `leerMisCalificaciones` corren en la instantánea única (§D-6, §D-7, §D-9). El conteo es del texto crudo, con comentarios (N-01): `calificaciones.ts` debe nombrar `instantaneaUnica: true` exactamente 2 veces, también contando comentarios (CAL-1B08 y §D-0.9). |

### Inventario (listas cerradas e inventarios estáticos que toca 01b)
Lo que 01b cambia según "Cambios por capa" y "Pasos" de 01b: `shared/src/calificaciones.ts` e `index.ts` (esquemas del gradebook y de "Mis calificaciones"); `adapters/db/calificaciones.ts` (nuevo, solo lecturas, con SQL etiquetado) y `adapters/db/index.ts`; los dos `GET` en `handlers/calificaciones.ts` (ya registrado en `app.ts` desde 01a); README. Sin migración, sin cola nueva, sin cambio en `workers/`, en `handlers/tareas/` ni en el frontend. Recorrí las 17 `*.ataque` del backend que leen código o rutas (`readdirSync`, `readFileSync` o `printRoutes`) y, con grep, las del frontend y las que leen `shared/src`.

**Rompen en 01b (las dos están en §D-R0):**
- **Rutas:** `sesiones-y-cadena.ataque.test.ts:545` (C-1). Ninguna otra `*.ataque` guarda una lista de rutas: `guarda-ch-r1`, `guarda-ch-r3` y `guarda-clase-r1` usan apps sintéticas (`onRoute`); ninguna usa `hasRoute`.
- **`instantaneaUnica`:** `lecturas-fx-r1.ataque.test.ts:758`, la lista de `:805` (C-4).

**Revisadas y sin efecto en 01b** (archivo:línea y por qué):
- **`instantaneaUnica`, otros:** `lecturas-fx-r1:769-776` (nadie fuera de `adapters/db` la nombra: `handlers/calificaciones.ts` no puede nombrarla; niveles solo en `cliente.ts`); `lecturas-fx-r1:778` (`index.ts` no reexporta `enTransaccion`); `hilo-01c-r1:731` (4 en el texto de `entregas.ts`, que 01b no toca); `instantanea-01b-r1:526` (`tareas.ts`), `lecturas-fx-r1:1115` (`clases.ts`) y `lecturas-fx-r2:1072` (`publicaciones.ts`): archivos que 01b no toca. Hoy, por grep, la opción está en `clases.ts` (4), `entregas.ts` (4), `publicaciones.ts` (2) y `tareas.ts` (2), más `cliente.ts`, que la define.
- **SQL etiquetado en `adapters/db`:** la única lista cerrada es E6 de `bloqueo-usuario.integracion.test.ts:687` (prueba normal; la cambia el programador en el paso 2 de 01b; hoy en verde porque `calificaciones.ts` no existe). Ninguna `*.ataque` guarda la lista de archivos de `adapters/db` con `$queryRaw`.
- **SQL crudo inseguro:** `temas-01a-r3:428` y `arquitectura-cuentas-r1:69` (`$queryRawUnsafe` solo en `cliente.ts`, ningún `$executeRawUnsafe`): el SQL de §D-6.5, §D-6.6 y §D-7.4 es etiquetado. `entregas-01b-r1:1016` mira `Unsafe` y ciclos solo en `entregas.ts`.
- **`FOR KEY SHARE`:** `entregas-01b-r1:1002`, `hilo-01c-r1:718` y `temas-01a-r1:978` (solo en `entregas.ts` y `referencias.ts`, en código sin comentarios). Las lecturas de 01b no bloquean filas; un `FOR KEY SHARE` en `calificaciones.ts` sería un defecto del programador, no un C-n. Hoy, en código, solo `entregas.ts:306` y `referencias.ts:18` y `:29`.
- **Modelos que se borran:** `lecturas-fx-r2:966` (C-3 de 01a): `calificaciones.ts` no escribe (§D-6, CAL-1B08); el conjunto no cambia. Ningún `DELETE FROM` ni `TRUNCATE` (también en comentarios, §D-0.9).
- **Escritores de `notificaciones`:** `tareas-01b-r1:789`: 01b no escribe.
- **Nombres de cola:** `muro-c-r1:628`: 01b no encola ni nombra colas; `handlers/calificaciones.ts` ya nombra solo `CALIFICACION_PUBLICADA`, fuera del patrón.
- **`adapters/db` no importa `adapters/queue`:** `entregas-01b-r1:1016` (lista fija de cuatro archivos) y `hilo-01c-r1:735` (todo `adapters/db/`): `calificaciones.ts` no encola.
- **Archivos de `handlers/tareas/`:** `temas-01a-r1:978` y `temas-01a-r3:440`: los `GET` van en `handlers/calificaciones.ts`, fuera de `handlers/tareas/`. `temas-01a-r3:440` filtra por prefijos que no incluyen `adapters/db/calificaciones.ts` ni `handlers/calificaciones.ts`.
- **Handlers sin Prisma, sin cliente ni política propia:** `arquitectura-cuentas-r1:82` (nada de `handlers/` usa `obtenerDb(` ni `adapters/db/cliente`) y `:92` (`PoliticaIntentos`): aplican a `handlers/calificaciones.ts` como a cualquier handler; no rompen si el programador sigue el plan.
- **Esquemas de `shared/`:** `entregas-01b-r1:1033` (7) y `hilo-01c-r1:754` (3) solo leen `shared/src/entregas.ts`, que 01b no toca; `temas-01a-r3:482` lee `shared/src/tareas.ts`. Ninguna `*.ataque` lee `shared/src/calificaciones.ts` ni `index.ts`, ni importa `@campus/shared` como espacio de nombres (`import * as`) para contar exportaciones.
- **`adapters/db/index.ts` en las `*.ataque`:** `intentos-r2:17` lo simula con `importOriginal` y conserva lo demás; sumar exportaciones no lo rompe. Las demás importan funciones por nombre.
- **Migraciones:** `sexto-paso-02a-r1:164` y `migracion-01a-r1:89`: 01b no tiene migración.
- **Otros sin cambio:** `alumnos-b-r1:1149` (`inscripciones.ts`, que 01b solo usa: `condicionesDePaginaDeAlumnos` sin cambios, "No se toca"); `tareas-01a-r1:726` (`temas.ts` y `editarTarea`); `lecturas-fx-r2:918` (quién llama a `listarPublicaciones`); `muro-c-r1:1122` y `muro-c-r2:321` (copias de la regla de texto visible); `calificaciones-estatico-01a-r1` (CAL-T-20 sobre `colas.ts` y CAL-T-21 sobre `respuestas-de-entrega.ts`, que 01b no toca).
- **Frontend:** 01b no cambia código del frontend; las `*.ataque` del frontend que leen código (`enEspera=`, vidrio, valores arbitrarios, `perspectivaDeRuta`, secciones de la clase) no cambian de resultado. Ninguna lee `shared/src`.

**Ninguna `*.ataque` fuera de §D-R0 rompe por 01b. Sin PARADA.**

**Observación de inventario (no es PARADA ni C-n):**
- **O-r0b-1:** C-4 cuenta en el texto crudo, con comentarios. Si `calificaciones.ts` menciona `instantaneaUnica: true` en un comentario, el conteo sube a 3 y C-4 sigue en rojo; lo mismo con `DELETE FROM`, `TRUNCATE`, `REPEATABLE READ`, `RepeatableRead`, `Serializable` o `isolationLevel` en sus comentarios (`lecturas-fx-r1:774`, `lecturas-fx-r2:977`). Es la regla de §D-0.9; lo anoto para que el programador no lo tome por un rojo de la prueba.

### Corridas (una suite a la vez)
Docker Desktop encendido, red de confianza (PA-01 no aplica). Corrí `lint` del backend, esperé a que terminara y después la suite completa del backend. No corrí la del frontend: no toqué nada del frontend.

| Comando (desde `backend/`) | Código | Última línea / resumen |
|---|---|---|
| `npx prettier --check test/sesiones-y-cadena.ataque.test.ts test/lecturas-fx-r1.ataque.test.ts` | 0 | `All matched files use Prettier code style!` |
| `npm run lint > <scratchpad>/r0b/lint-back.txt 2>&1` | 0 | `> tsc -p tsconfig.json --noEmit && tsc -p tsconfig.test.json` (antes: `All matched files use Prettier code style!`) |
| `npm test > <scratchpad>/r0b/test-back.txt 2>&1` (16:56:28Z a 16:59:26Z) | 1 | `npm error command C:\WINDOWS\system32\cmd.exe /d /s /c vitest run`; resumen: `Test Files  2 failed \| 205 passed (207)` · `Tests  2 failed \| 2551 passed (2553)` · `Duration  172.53s (transform 27.66s, setup 6.81s, import 260.45s, tests 1452.90s, environment 60ms)` |

- Mismos 207 archivos y 2553 casos que al cierre de M-04: las reescrituras no suman ni quitan casos.
- Ningún tiempo límite (`Test timed out`: 0) ni intermitencia: PA-12 no aplica.

### Rojos esperados tras la ronda 0 de 01b (base para el programador)
Coinciden exactamente con la fila de 01b de "Rojos esperados" de §D-R0. Ningún otro rojo.

| C-n | Prueba | Causa observada | Pasa a verde en (plan) |
|---|---|---|---|
| C-1 | `test/sesiones-y-cadena.ataque.test.ts > ataque: superficie de rutas > bajo /api solo existen las rutas de … CALIFICACIONES-01a y CALIFICACIONES-01b: …` (1 caso) | `expected [ …(97) ] to deeply equal [ …(101) ]`; las únicas diferencias son las cuatro que faltan (`- "GET /api/clases/:claseId/gradebook"`, `- "GET /api/clases/:claseId/mis-calificaciones"` y sus `HEAD`), ninguna de más | paso 3 de 01b (los dos `GET`) |
| C-4 | `test/lecturas-fx-r1.ataque.test.ts > ataque FIX-CLASES r1 (punto 3): aislamiento > la opción solo se puede activar dentro de adapters/db: … catorce lecturas (…, cuatro de entregas y dos de calificaciones)` (1 caso) | `expected [ 'adapters/db/clases.ts:4', …(3) ] to deeply equal [ …(5) ]`; la única diferencia es `- "adapters/db/calificaciones.ts:2"`: no existe `calificaciones.ts` | paso 2 de 01b (`adapters/db/calificaciones.ts`) |

Además, al crear `adapters/db/calificaciones.ts` con SQL etiquetado (paso 2), E6 de `bloqueo-usuario.integracion.test.ts` pasará a rojo hasta que el programador sume `"calificaciones.ts"` a su lista (lista cerrada normal de 01b); hoy está en verde.

### PA-07 de la corrida final del backend
**Fuente:** `<scratchpad>/r0b/test-back.txt`. Conteo con `grep -o … | wc -l` por término; atribución con `<scratchpad>/r1/pa07.mjs` (último "incoming request" del mismo `pid` y `requestId`, por app).

| Término | Cuenta |
|---|---|
| `40P01` | 0 |
| `deadlock detected` | 0 |
| `could not serialize` | 0 |
| `too many clients` | 0 |
| `"Error no controlado"` | 10, exactamente el inventario I-1 |
| `"code":"P2028"` | 5, todos permitidos |
| (aparte) `Unable to start a transaction` (`maxWait`) | 0 |
| (aparte) `Test timed out` | 0 |

- **Control positivo: completo.** Los tres `P2028` deterministas de `servicio-ocupado.integracion.test.ts`, nivel 40, en un mismo `pid` (13840): `POST /api/auth/cambiar-contrasena` › `tx.sesion.findFirst()`; `POST /api/auth/refrescar` › `tx.sesion.updateMany()`; `POST /api/clases/:claseId/publicaciones/:publicacionId/comentarios` › `prisma.$queryRawUnsafe()`.
- **Los dos de `cuentas-r3.ataque.test.ts`** (`pid` 20136, nivel 40): `POST /api/auth/login` › `tx.sesion.create()` y `POST /api/auth/restablecer` › `tx.tokenCuenta.updateMany()`. Ningún `P2028` fuera de la lista.
- **Los diez `"Error no controlado"`, iguales a I-1:** 1 a 6, `POST /api/auth/login` (cinco "fallo simulado de la base en la búsqueda" y uno "… al crear la sesión", `intentos-r2.ataque`, `pid` 12604); 7 a 9, `POST /api/clases/:claseId/archivos` (`subida.url`), `POST …/archivos/:archivoId/descarga` (`url`) y `GET …/publicaciones` (`ZodError` "La URL del almacén debe ser http o https", `archivos-d-r2.ataque` T-39, `pid` 17836); 10, `GET /api/prueba/error-comun` › `boom` (`salud.integracion`, `pid` 27956).
- **PA-07: limpia.**

### Veredicto de la ronda 0 de 01b
**RONDA 0 CERRADA.**
- V-01 en verde (179 de 179).
- Reescritas solo C-1 y C-4 (2 archivos), con el cambio mínimo de §D-R0.
- El inventario no encuentra ninguna otra `*.ataque` que rompa por 01b.
- Solo quedan los dos rojos esperados (C-1 y C-4), cada uno por su causa.
- PA-07 limpia, con el control positivo completo. Ninguna PARADA.

### Tabla de SHA-256 de las 179 `*.ataque` al cierre de la ronda 0 de 01b (base de V-01 del programador y de la ronda 1 de 01b)
Calculada con `sha256sum` sobre `git ls-files -co --exclude-standard | grep -E '\.ataque\.test\.tsx?$' | sort`. Contra la tabla de la corrección de M-04, cambian solo las dos reescritas.

| SHA-256 | Archivo | Nota |
|---|---|---|
| `BCCE2CAE771F97957D8691BEF7FFF4EC42412DAAEABF726AEB0AFC59F6F25671` | `backend/src/config/correo.ataque.test.ts` |  |
| `DCB78D222544E8DC4FBECE59468F555B04ABE971B70016E9BB17FCAE3E958580` | `backend/src/config/env.ataque.test.ts` |  |
| `71E7F049447D2D1ECEDD897C55EA0B6D31221753F0A7E7473C7AC6E8667F0A95` | `backend/src/config/logger.ataque.test.ts` |  |
| `91F620C1A27778EEBC2BED5EEC1BC9B0E3FE1199B32ED00F9DD910011D6A1805` | `backend/src/core/clases/codigo-r1.ataque.test.ts` |  |
| `262691F5786AD63B2393D0BA5FF97538F6DACF43343BED019AD23C12A07D8686` | `backend/src/core/clases/codigo-r2.ataque.test.ts` |  |
| `E769CBFCC3A83A64B51C6437F80684640A7C928AD6B8C5C1671FDFF005D7B734` | `backend/src/workers/ritmo-03c-r1.ataque.test.ts` |  |
| `294BE1AF0BF69D6C05F54E2F0D8E587C78A5527D0B64D1A224C058E31CE013D0` | `backend/test/admin-muro-02b-r1.ataque.test.ts` |  |
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
| `5E02A27716D63E8CE0FE6B6171BFF089EB3EE2548260349B16950D7E65A1BCF9` | `backend/test/calificaciones-01a-r1.ataque.test.ts` |  |
| `B00C2C10D8D862F6576CB69173F07D190A08A18A25439C296D10B74E9772A454` | `backend/test/calificaciones-01a-r2.ataque.test.ts` |  |
| `DD919EBD74A2C6AC60C244A1563B46895821B0D25E5051CDA25FFFB72B653416` | `backend/test/calificaciones-carreras-01a-r1.ataque.test.ts` |  |
| `B09BAAEC53455CEA1A0674890EBD9353007E6F2628001446E873B09279FFBA07` | `backend/test/calificaciones-estatico-01a-r1.ataque.test.ts` |  |
| `6E3C92C13F146A01C8DCFDC7DD04BEA59F0E2562051F6AC65F95F924EF73E4DB` | `backend/test/categorias-01a-r1.ataque.test.ts` |  |
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
| `6F72C7CC1D0F95D60C057D7406A8955C47E834C963ED53D15DF64C83049F5431` | `backend/test/entregas-01b-r1.ataque.test.ts` |  |
| `5BAAF6F8FB76320620ED4A84EFACA2B2D473460F62360E0D48738B97A0AC584A` | `backend/test/entregas-01b-r2.ataque.test.ts` |  |
| `BA1AC9B17CC9BF747522BD4EC8B87DF436008482E643B18EEA8E9A8C041C59B3` | `backend/test/formada-ch-r1.ataque.test.ts` |  |
| `EC9602D5F109B45A6D428E708D9B6CDD37A7509A6FF9031FA6FD8A2DA0E25E9B` | `backend/test/gestion-02a-r1.ataque.test.ts` |  |
| `5F4133F949D2F337A8F63B75CF82CB77114DB7812D67C1960105F5000C31A326` | `backend/test/guarda-ch-r1.ataque.test.ts` |  |
| `7A7DAC6D87EDF81059FCFF9C07471AAF49D690EC159BE4B9FD4AA32B0909A215` | `backend/test/guarda-ch-r2.ataque.test.ts` |  |
| `610EE44E5D0BCEA46EB4E3645F9ADF1998A76947A25AF7E3F8248EA3A633DF79` | `backend/test/guarda-ch-r3.ataque.test.ts` |  |
| `E5D149F3AC52B726E1FE08908249706341330F88EAA6674B9A9AC67B98B1E864` | `backend/test/guarda-clase-r1.ataque.test.ts` |  |
| `C979D2C9C420A2177FA6EBDDB78EB2CE84D5F043B94270F690916A6FC75D6F8F` | `backend/test/guarda-clase-r2.ataque.test.ts` |  |
| `20982E2B98F1B162146A211923F3D5EC19D4E170C4AA3A5BFC6F82C3B6173AAD` | `backend/test/guarda-r2.ataque.test.ts` |  |
| `2649F3D357DCB806361AC101C57FCB504B9C798B631048F0B3E200F63DA7DC30` | `backend/test/hilo-01c-r1.ataque.test.ts` |  |
| `2D2216EE9DB290B318825A6F73C346D4767CACC12D95F5CA76457A78B63FEDC3` | `backend/test/instantanea-01b-r1.ataque.test.ts` |  |
| `A8B79D5AD98270BE3747F493865708A78BB73ADD08D832584DB4464C3582777A` | `backend/test/intentos-r2.ataque.test.ts` |  |
| `2619B44EEA3370494C95AC128FCFD9E3FFC20D1581A19F549BF371F603A11D7D` | `backend/test/invitacion-flujo-03a-r2.ataque.test.ts` |  |
| `704155928183AEC193AE7E157B86B3E9361D2B63C7A47BE1ED859605FAB4FFA6` | `backend/test/invitacion-masiva-03c-r1.ataque.test.ts` |  |
| `DD9B7454E8786BF0B833D265900CCAECF595808CEBC8E9A77C9AEF15298A1038` | `backend/test/invitacion-masiva-03c-r2.ataque.test.ts` |  |
| `2684916C88B9405706F82DA3F9B2FFD0B3626A11AF79E20EA146FDFD1D52C319` | `backend/test/lecturas-fx-r1.ataque.test.ts` | Reescrita (C-4, ronda 0 de 01b) |
| `3790777831A1FACB053D0719D85AB404593954416B1443A1A59530E09E2C81DC` | `backend/test/lecturas-fx-r2.ataque.test.ts` |  |
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
| `D6B9ADAF1C14A61FE369F510774EF702CFA20F28F3CB19B0EB7357440DCB0783` | `backend/test/migracion-01a-r1.ataque.test.ts` |  |
| `D95AB72A3FD3D70CE3A9027A50DB660426976C3DF1A46E92DF75066BEAC78A0C` | `backend/test/muro-c-r1.ataque.test.ts` |  |
| `7825CFC9B484DF740FA0E9562A195D1BBCAF4CAF72EA55FA847B5394AB96C125` | `backend/test/muro-c-r2.ataque.test.ts` |  |
| `8B733B86FC6D54ECE008389A59793FAE4EC4A65146EB37215E900E50A5337D46` | `backend/test/nombres-guarda-r3.ataque.test.ts` |  |
| `3FD2583A4DE7CD432B2E09A5130C23D6A59FA475E5E0AA69F23739351ACBF9CF` | `backend/test/nombres-ids-01a-r2.ataque.test.ts` |  |
| `00A6EB6F7CCD7D8790C356BEFCC96DDFDA6EACCE0BE53DE255CFE3626D8F2ADB` | `backend/test/nombres-tokens-r2.ataque.test.ts` |  |
| `80B5A848F69B429E7DADEC86C07BEC1D3E3EED8A042EFBA41CE912DED39E7BAB` | `backend/test/nowait-ch-r1.ataque.test.ts` |  |
| `AD0DAB1952E509237ACAC12BB1F6774FA9C5DE8B44D1E6928EDC65CC67A78C21` | `backend/test/referencias-01b-r1.ataque.test.ts` |  |
| `6F2ABC2CEFD77D74CD1E3ABBDCE9C41BB53D00BD4D8E5BA7E496C4441C2697E5` | `backend/test/servicio-ocupado-ch-r1.ataque.test.ts` |  |
| `CCEA34C962FC8F14A49C64EAFA8119DAE5030E1302ED94FE369299EC49182BB8` | `backend/test/sesiones-y-cadena.ataque.test.ts` | Reescrita (C-1, ronda 0 de 01b) |
| `70AC720F2E7FCADEE5BBCB6414887AB08129DEA7CD91DF012046953B1584E8B6` | `backend/test/sexto-paso-02a-r1.ataque.test.ts` |  |
| `C89C30851E6B409CD045017181147BF674DF947762A8DEA3F3FB981BD9B36E09` | `backend/test/tareas-01a-r1.ataque.test.ts` |  |
| `79BC7AAFC11676D36129610A4B5CD5FE5D8234D0D748487FD2F3E48C5F772C79` | `backend/test/tareas-01b-r1.ataque.test.ts` |  |
| `AE60C11CFF5C82DF4954DB48582DF4BD5A64957FF9AFAF9712AA43A038F8E189` | `backend/test/temas-01a-r1.ataque.test.ts` |  |
| `DC7B86A621062ED671C1E7174A745019133FBD410C7A2E78114B2A2C50AFFE95` | `backend/test/temas-01a-r3.ataque.test.ts` |  |
| `F09E9A0038C47D1A2223376A0AF260BAF573F0C45BF770201C48C9E30296F04B` | `backend/test/worker-03c-r1.ataque.test.ts` |  |
| `9F60F9D65D52D2021A1EB04E9F01D3CC68F22744C845BF93D6621AA4FE9713A8` | `backend/test/worker-r1.ataque.test.ts` |  |
| `77D11BD85F202A9EEC92A363DF82E63FB9A784CA9D368D49F62E61C1A2AA967B` | `backend/test/worker-r2.ataque.test.ts` |  |
| `0DE083DF355129E800D130F33D228835479C25F49ED82B6C2BCF9CF5F6E944CB` | `frontend/src/app/barra-02d-r1.ataque.test.tsx` |  |
| `B89EDE0F6AED45DFCB5E64C8909A822156CE43FD80948E72419CDCE9D4541A87` | `frontend/src/app/cache-03a-r1.ataque.test.tsx` |  |
| `E85743C0FBB8E476874A2C67334342D8D69D14153579FC1E4CCE0AE6E2B29616` | `frontend/src/app/contexto-r1.ataque.test.tsx` |  |
| `BC2BE5541006887E2A5A4A89B33046180F607D54474B0F96A73D615AFBCAC385` | `frontend/src/app/contrasena-r1.ataque.test.tsx` |  |
| `F38BCACB716D8A39ACDB3535A95603CD0D8AB02572CA57A7DF5268B01CEB6EAC` | `frontend/src/app/contrasena-r2.ataque.test.tsx` |  |
| `68FB5D092C0C8ECFCF282477EF023AAAE26F6B869656E05109DC3EFA276D842A` | `frontend/src/app/cuentas-r1.ataque.test.tsx` |  |
| `41930017715D3D6869DC7ACEFD75DE8EC3684F1F035B845ABDF8EC0F6B734DEE` | `frontend/src/app/cuentas-r2.ataque.test.tsx` |  |
| `1506C27E5F7418B5E087FD30F8809645A2FC3E2761C7249DE78F02E24AA6C7A5` | `frontend/src/app/en-espera-r1.ataque.test.tsx` |  |
| `DB48DAD405C27062621A44D3744C84CC5903892A51E5A8DF18F41383CB9C88A3` | `frontend/src/app/errores-r1.ataque.test.tsx` |  |
| `0E1D93E4DD3CBC7B5E9475A17B5CA66F0DF056BA25CB117249F4C2E2F5887A51` | `frontend/src/app/foco-barra-02d-r2.ataque.test.tsx` |  |
| `2154B5C15F696A0C7F884BFF774CF4E2A4208A5281DB9076653F8253E2385AB9` | `frontend/src/app/foco-pestana-02d-r3.ataque.test.tsx` |  |
| `F95321E604E20B533EBF2DB3C1C6C66BA2F2D87A48F075415B766551F6EE30F4` | `frontend/src/app/fondo-r1.ataque.test.tsx` |  |
| `57CB54AFD3B79464F0DF01B88FC388CEBBEAC5657D936C4C204CBAE6034B0834` | `frontend/src/app/marco-r1.ataque.test.tsx` |  |
| `446CE2CC8A4F254F94FF6313EB13837421F98749C2473AA0B8979388E7CE674A` | `frontend/src/app/muro-recuperar-c-r3.ataque.test.tsx` |  |
| `DC0365EDB436B3F2EE256882EF13F2295CDFCB83A63F9BA3939381983E43FDFC` | `frontend/src/app/muro-recuperar-c-r4.ataque.test.tsx` |  |
| `2F8056A770397C1601647277944555A48AFC4B9A2BABEB75E5898F0CC92562BB` | `frontend/src/app/muro-rutas-c-r1.ataque.test.tsx` |  |
| `0EEFED2C05D76B0790A437E9465A898A9076083B1F046F8785145CFAAD0DA379` | `frontend/src/app/registro-maestro-03b-r1.ataque.test.tsx` |  |
| `053E867A904AFA3C09EEF92CA2E03E929D9F9C93F714040856F40C7418721BBE` | `frontend/src/app/router.ataque.test.tsx` |  |
| `F0657FB91F7B3ACCF64726292F9324C6742C1AC537C6C4A1985EC4E32AE09C83` | `frontend/src/app/rutas-02c-r1.ataque.test.tsx` |  |
| `C7946F5F5D5D16D36B395ADC2AD9928ACC7FD9839875FB64532B51489756730B` | `frontend/src/app/rutas-clases-r1.ataque.test.tsx` |  |
| `F090CBD8E8C9B0AF52D4FC19547B07E9B6413F5414CC4B10862F01E29818DDDC` | `frontend/src/app/sesion-r2.ataque.test.tsx` |  |
| `7CF085827D8FA981E56822431B8A5C6B7AB08B44477D43F739EBC269D2B8F899` | `frontend/src/components/layout/estatico-r1.ataque.test.ts` |  |
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
| `932E76314E0447DA1790C3C86CA48545EEA834FEAF6F706C4D405B7EA62BE872` | `frontend/src/features/clases/alumnos-b-r1.ataque.test.tsx` |  |
| `55DC274ECA96DA4360848B88F9F2A839AC815031490AB57FF38DE074512D632C` | `frontend/src/features/clases/alumnos-b-r2.ataque.test.tsx` |  |
| `371518E4309F14201A92D29F9436A97A19801B506D45114964FBCFE3F5CD4183` | `frontend/src/features/clases/alumnos-b-r3.ataque.test.tsx` |  |
| `266D088DD727F18AF8C8A106B8D9C4DBED75753E4B1B4ABB12F3A4DF870ECB7F` | `frontend/src/features/clases/alumnos-b-r4.ataque.test.tsx` |  |
| `856CFFBD9C743F9815DAF731487E29DC5F5272545DC15820A70BAF86ECFA6527` | `frontend/src/features/clases/alumnos-b-r5.ataque.test.tsx` |  |
| `CC2FDD28CEB3DE642EE01D07773271D7154811B1F3756333F1DFB285A386E6CC` | `frontend/src/features/clases/archivos-d-r1.ataque.test.tsx` |  |
| `36C32BAD5F632CAD5D76BCA14C74779DDD7CF9B9465A69522886DB770A508B22` | `frontend/src/features/clases/archivos-d-r2.ataque.test.tsx` |  |
| `14CB04B6B56BF2F83DE04DAB863E7843FACA3A585E70FEBC93EE3588F06AB144` | `frontend/src/features/clases/archivos-d-r3.ataque.test.tsx` |  |
| `71148A960F7EF6995904B3DB6DFD0B0E3BA6AF697C45399669EC1DD81CC7D1AA` | `frontend/src/features/clases/cargar-mas-02c-r2.ataque.test.tsx` |  |
| `A3880B67FFAA0D15763D1C761CEF1FF8472029C77BFB2211AB079EADB1685325` | `frontend/src/features/clases/categorias-01e-r1.ataque.test.tsx` |  |
| `66C0B873BC8B9D8E9E01AC871BD6AAAB4328508BEB5EC9371D69463D7C12430D` | `frontend/src/features/clases/categorias-01e-r2.ataque.test.tsx` |  |
| `DD4B9C07F940B55085B7EF8113994E3DB60FAD6A2FF3B5809E0DCB8F2568E336` | `frontend/src/features/clases/clases-admin-02c-r1.ataque.test.tsx` |  |
| `5F0679D8CFACC8BCE01989C04A415DC5B546625EB7DEC92F03959DE5A0F89815` | `frontend/src/features/clases/clases-r1.ataque.test.tsx` |  |
| `C7AD5EDC733E374117A9277F1C2987E84CC2930C77EB4C720CCF15CC9F5FAB45` | `frontend/src/features/clases/clases-r2.ataque.test.tsx` |  |
| `A835A11D29AEDB8F77F91E826A22C2B7CF5322FCED3F6BED0C1ACBF7C75A4E61` | `frontend/src/features/clases/clases-r3.ataque.test.tsx` |  |
| `86B04D234527ECEEFCA35B07CE89E6B7CE0B6AFE5CCDEE2F005E6A4219F0495A` | `frontend/src/features/clases/clases-r4.ataque.test.tsx` |  |
| `AF15BD75457BB2560E1D60BA3EB369786FE869BC3DCAE5FCE144C52049D7E4E8` | `frontend/src/features/clases/estatico-02c-r1.ataque.test.ts` |  |
| `CDD1ED8890859AE3E884822FC7074852A2173105114745D83FE9A15C1C47C626` | `frontend/src/features/clases/estatico-r1.ataque.test.ts` |  |
| `DE23D395DFE7A6F3D6D15EB48CB574599DC9D8204E5A90B255C0C10D25A186FA` | `frontend/src/features/clases/fila-01d-r1.ataque.test.tsx` |  |
| `54A5DAA368528F1B64BD809C79964E30C42C3A71F76E2013643695FAAFA6C73E` | `frontend/src/features/clases/foco-02c-r3.ataque.test.tsx` |  |
| `80EFD85B74264C125683DFB6D631A10DB40887C5E7315D5EF6FF7B49357EAAD7` | `frontend/src/features/clases/foco-02c-r4.ataque.test.tsx` |  |
| `32C1F6A48BA3241963CF6864BD2236A0675425241D4389B524CBE805C358A5CC` | `frontend/src/features/clases/foco-02c-r5.ataque.test.tsx` |  |
| `FDC9F0D1D5BDF7D8C6E9E7F15CCFA2D909F717E9465A8279F5540FB704958BB9` | `frontend/src/features/clases/foco-pestana-02d-r3.ataque.test.tsx` |  |
| `0F3F8173AD209418B1B3106C755EC83808581389D65A8549B93C69B29B22F013` | `frontend/src/features/clases/heredados-02d-r1.ataque.test.tsx` |  |
| `0F60F1582FCE6E5EFAF9BF6856133DC30F1DC4EB9C3B7FEA19F90A330F8335B3` | `frontend/src/features/clases/inicio-sin-datos-02c-r1.ataque.test.tsx` |  |
| `7C434A0E54E70B12D4B2A3DE22FFB4DBF5F28A1CFBD2290C22E8A2B59EDF0E16` | `frontend/src/features/clases/inicio-sin-datos-r2.ataque.test.tsx` |  |
| `A4DE3A7DC35DAEDFF86FD41349EA09140213E918613603D0985C698FF41D29F7` | `frontend/src/features/clases/maestros-02c-r1.ataque.test.tsx` |  |
| `B487B8C8C95BADC6BC78F3BE72B7B5F809381E8C69127D6600254B872DE62EBC` | `frontend/src/features/clases/muro-02c-r1.ataque.test.tsx` |  |
| `9D35E0DA961248750C2948E3F69305856BCDD25E78E01C64AA50DCDFEEE93F8D` | `frontend/src/features/clases/muro-c-r1.ataque.test.tsx` |  |
| `C50A5D53AD16EAFF69ABEC6F531B6C0EDD74CE4ECDA02380EDFBF66F7E5BA89B` | `frontend/src/features/clases/muro-c-r2.ataque.test.tsx` |  |
| `1AC0F4A0474E7F334BC57D4F2BA23954E8C280FA0C3573A26350D0ADE431FF75` | `frontend/src/features/clases/muro-c-r3.ataque.test.tsx` |  |
| `67B60A9A5363F88E6CEBA210C27452B8D639F6DF798AA4E506DC54BB2312249A` | `frontend/src/features/clases/personas-02d-r1.ataque.test.tsx` |  |
| `2911195DC97BF9B25E7E874E0A0B6C9C0D25A9A878C2E821A752D340D219A740` | `frontend/src/features/clases/refactor-01c-r1.ataque.test.tsx` |  |
| `4303EAC77B98E8978495D9E68FD7725AC436F9DB757DBC0C02C59051436908FA` | `frontend/src/features/clases/reloj-01e-r4.ataque.test.tsx` |  |
| `A4AA15CEF1A377EED688DAB1B92E5CA4A3943490144CEC861CF7B482845B0362` | `frontend/src/features/clases/segmentado-02d-r1.ataque.test.tsx` |  |
| `D899C19BA982FBDE2208BBC7FA009869556C84BD4650586DBD9EE90B22234E47` | `frontend/src/features/clases/tarjeta-01d-r1.ataque.test.tsx` |  |
| `97AF503E763F7DFF9FCFBDC72862CD21DE6AF8E51D3EC41134F8475D98AE2DF6` | `frontend/src/features/clases/tarjeta-01d-r2.ataque.test.tsx` |  |
| `7F9D22E5904192DCC00465FADCABF36AA5DE3CD16D6A319A41A66340BB9BD6A8` | `frontend/src/features/clases/trabajo-01e-r1.ataque.test.tsx` |  |
| `F6924BC272A5240CF97D35729C797CC10960ED7CF94FE1BE1B69CA2DF6C1CF8F` | `frontend/src/features/clases/trabajo-01e-r2.ataque.test.tsx` |  |
| `9866EF34167061E2715B65A352C55D08C7E9268033E879AE633C7FD568E4D49F` | `frontend/src/features/clases/ventana-02c-r2.ataque.test.tsx` |  |
| `008E5C606F249D15E3816E27E3E97FD7D7FBA0F8697751A156665A76694B3A18` | `frontend/src/features/clases/ver-mas-01e-r3.ataque.test.tsx` |  |
| `4F486CA37D2A2BB6CC26754281D2ADCE086A9D8D4485A069DE7AE5D54E360ACF` | `frontend/src/features/tareas/entregas-01d-r1.ataque.test.tsx` |  |
| `93A5A0A648669E9C96494A62B2B16082B07296F279E2892BF2C8D47834EE2FC1` | `frontend/src/features/tareas/entregas-01d-r2.ataque.test.tsx` |  |
| `432DCDDF119DD0E32E49ADC42D5F51D197698C8896E1058C505AB31F4A8EE838` | `frontend/src/features/tareas/entregas-01d-r3.ataque.test.tsx` |  |
| `FD66C82D400E0F0A9709960934B555568642D9E4B5E41F31AD6606A620836982` | `frontend/src/features/tareas/entregas-01e-r1.ataque.test.tsx` |  |
| `496652BC59817166F53E00CB828F2119C857C2834063A31764D7876DC150C930` | `frontend/src/features/tareas/entregas-01e-r2.ataque.test.tsx` |  |
| `BFDED7507BC684EA9858CD76517EF0E4C23CBC69E5A19F381E6EC522FD6156E6` | `frontend/src/features/tareas/tareas-01a-r1.ataque.test.tsx` |  |
| `B778FC2E6BB0A8F8715A56877B3B781439CA214C8A9C8AE126F610C95229882A` | `frontend/src/features/tareas/tareas-01d-r1.ataque.test.tsx` |  |
| `BF3C999033195CAC778A82A579E44729FB07A405F5CDB41D8E7DC932CB71F942` | `frontend/src/features/tareas/tareas-01d-r2.ataque.test.tsx` |  |
| `3567D7C23D2CF6A2FD538CD6822EF60AC3CFFEAC036394ED1E3559DEBE492C57` | `frontend/src/features/tareas/tareas-01d-r3.ataque.test.tsx` |  |
| `6BBE2BD85E2B5500FBAB4D0F51630C0C8E9D65B1A63045AD1FA906298A92A435` | `frontend/src/features/tareas/tareas-01d-r4.ataque.test.tsx` |  |
| `C71CBA65DD284D7AF11CBC812B6BCF75BAA373939EDB8318E731858D9C50173F` | `frontend/src/lib/format-d-r1.ataque.test.ts` |  |
| `89DBBB70D5DC404C3D74DB5391D10855C8CB1D6B4C643B6147B3CE6FFB2637AF` | `frontend/src/lib/format-d-r2.ataque.test.ts` |  |
| `BFA7DED62F7A1402590D438A1CC51060A63FA019AD47D3EB5740E43383064A2A` | `frontend/src/lib/format-d-r3.ataque.test.ts` |  |
| `10C730348D18FF8DAE7B3623751D31122AA58560B564AD191717FA1938A6F8CE` | `frontend/src/services/apiClient.ataque.test.ts` |  |
| `CED32202A8DEB611027E965FB5EBD56A9848A1EE3467474BFBAED64374D3BF5B` | `frontend/src/styles/clases-r1.ataque.test.ts` |  |
| `B8085BCBBC7F4B6276BF3A87FB7BA0BC887953A8C6CE372354A7F3F1B5037582` | `frontend/src/styles/tokens-r1.ataque.test.ts` |  |

## Ronda 1 de 01b
Reporte del Tester — CALIFICACIONES-01b (gradebook y "Mis calificaciones", backend) — Ronda 1
Veredicto: **RESISTE**
Verificación propia: lint `0` (`tsc -p tsconfig.json --noEmit && tsc -p tsconfig.test.json`) · test `Test Files  216 passed (216)` · `Tests  2617 passed (2617)`

Base: el árbol de 01b del programador sobre `<K1a>` = `216c1b5`, con el resumen aceptado por el manager ("Verificación del resumen — CALIFICACIONES-01b"). Solo agregué cuatro archivos `*-01b-r1.ataque.test.ts` en `backend/test/` y esta sección. No toqué código de producción, `shared/`, pruebas normales, `*.ataque` existentes ni nada de "No se toca". No corrí la suite del frontend: 01b no tiene frontend.

### V-01
- **Base:** "Tabla de SHA-256 de las 179 `*.ataque` al cierre de la ronda 0 de 01b" de este reporte.
- **Método:** `git ls-files -co --exclude-standard | grep -E '\.ataque\.test\.tsx?$' | sort | xargs sha256sum`, contra la tabla (hashes en minúsculas, rutas tal cual), con `diff`.
- **Antes de escribir nada:** 179 de 179 iguales, ninguno de más ni de menos. **V-01 en verde.**
- **Al cierre:** 183 archivos; las 179 previas siguen idénticas (`diff` vacío) y las 4 nuevas son las de esta ronda.

### Archivos nuevos y casos
Comando: `npx vitest list test/calificaciones-instantanea-01b-r1.ataque.test.ts test/gradebook-01b-r1.ataque.test.ts test/mis-calificaciones-01b-r1.ataque.test.ts test/calificaciones-estatico-01b-r1.ataque.test.ts` (desde `backend/`): **38 casos en 4 archivos** (11 + 18 + 7 + 2). La suite completa pasa de 212 archivos y 2579 casos a 216 y 2617.

| Archivo | Casos (id y lo que ataca) |
|---|---|
| `backend/test/calificaciones-instantanea-01b-r1.ataque.test.ts` (11) | CAL-T-32 tarea de la ventana borrada después de comprobar `cursorTareas`; CAL-T-33 tarea borrada después de leer las columnas (su celda y su porcentaje); CAL-T-34 alumno de la página dado de baja después de comprobar el cursor de alumnos; CAL-T-35 alumno de la página desactivado después de leer la página; CAL-T-36 tarea vencida creada después de leer las columnas; CAL-T-37 entrega que llega entre el agregado y las vencidas; CAL-T-38 tarea calificada movida a una categoría nueva entre categorías y agregado (gradebook); CAL-T-39 tarea de la página de "Mis calificaciones" borrada después de leerla; CAL-T-40 calificación entre categorías y agregado en "Mis calificaciones"; CAL-T-41 tarea movida a una categoría nueva en "Mis calificaciones"; CAL-T-42 control negativo en READ COMMITTED |
| `backend/test/gradebook-01b-r1.ataque.test.ts` (18) | CAL-T-43 empates de fecha límite al milisegundo y vecinas a 1 ms, ventanas de 1 a 4; CAL-T-44 alumnos con el mismo nombre de búsqueda (acentos, mayúsculas, doble espacio), páginas de 1 a 3; CAL-T-45 cursor de alumnos de un maestro, de otra clase, dado de baja, desactivado, en mayúsculas; tarea o id inexistente → 400; CAL-T-46 `cursorTareas` de otra clase, inexistente, de un material, de un usuario, no uuid y vacío → 400; en mayúsculas sirve; CAL-T-47 límites 0, 51, -1, 1.5, texto, vacío, `Infinity`, `1e400`, espacio y repetidos → 400; 1 y 50, solos y combinados; CAL-T-48 redistribución 50/30/20, "Sin categoría", calificada sin entrega, entregada con retraso calificada y resumen; CAL-T-49 resumen y filas iguales con páginas 1, 2, 50 por ventanas 1, 50; CAL-T-50 baja y desactivación con calificaciones y su vuelta; CAL-T-51 inscrito tarde (S-04); CAL-T-52 de categorías a puntos; CAL-T-53 redondeo en el umbral (69.99, 70, 69.995) y del promedio de la clase; CAL-T-54 fronteras del milisegundo con `ahora` explícito (gradebook y filtros); CAL-T-55 llamadas a la base con 1, 2 y 30 alumnos, 1, 2 y 30 tareas, 1 y 10 categorías, con y sin cursores, y los cinco filtros; CAL-T-56 `HEAD`; CAL-T-57 maestro ajeno con cursor de un alumno suyo y consultas inválidas, clase inexistente; CAL-T-58 `:claseId` no uuid y en mayúsculas; CAL-T-59 llaves exactas para maestro, comaestro y admin con deudora restringida; CAL-T-67 valores por defecto (25 y 20) y ventanas vacías por cursor de la última fila o tarea |
| `backend/test/mis-calificaciones-01b-r1.ataque.test.ts` (7) | CAL-T-60 nada del compañero por filtro, por parámetros con su id ni por cursor de otra clase, de un usuario o de la clase; CAL-T-61 llaves exactas (sin `version`, promedio de la clase ni resumen); CAL-T-62 los cuatro filtros de estado como partición de "todas"; CAL-T-63 recorrido de cada filtro de una en una con `general` igual en cada página; CAL-T-64 límites y filtros inválidos; CAL-T-65 restringida (GET, HEAD y consulta inválida) y deudora; CAL-T-66 maestro, admin y maestro ajeno con consulta inválida, `HEAD`, `:claseId` no uuid y en mayúsculas, alumno dado de baja con calificaciones, alumno desactivado |
| `backend/test/calificaciones-estatico-01b-r1.ataque.test.ts` (2) | CAL-T-68 el adaptador no nombra en código campos que no deben salir ni usa `Promise.all`; CAL-T-69 las rutas de 01b no deciden el acceso a mano |

Reglas que siguen todas: reloj explícito (`AHORA` fijo de 2031 o `ahora` = fecha límite ± 1 ms en las llamadas al adaptador; por la API, fechas límite con 24 horas o más de margen, o fechas fijas de 2031 donde solo importa el orden); cada caso con al menos una aserción y ninguna precondición resuelta con `return`; ninguna `LOCK TABLE` ni retención de filas (los ganchos escriben y confirman desde otra conexión entre dos sentencias de la lectura, con el doble `ejecutorEspiado` de `ayudas-gradebook.ts`, sin bloquear nada); nada contra Resend ni el almacén real (`crearAlmacenEnMemoria`).

### Hallazgos
Ninguno. Ninguna de las 38 pruebas nuevas falla contra el código de 01b, y ninguna prueba previa cambió de resultado.

### Atacado sin hallazgos (por categoría)
**Instantánea única (N-24).** Los casos de cursor borrado de CAL-1B03 no distinguían la instantánea; estos sí:
- **Gradebook:** con el gancho entre dos sentencias, la respuesta es la de su primera sentencia:
  - Una tarea de la ventana borrada después de comprobar el cursor sigue en las columnas, con su título y su celda calificada (CAL-T-32).
  - Una tarea borrada después de leer las columnas conserva su celda, su porcentaje, el riesgo y el promedio (CAL-T-33).
  - Un alumno de la página dado de baja después de comprobar el cursor (CAL-T-34) o desactivado después de leer la página (CAL-T-35) sigue en la página con su porcentaje, y cuenta en `totalAlumnos`, en el promedio y en `alumnosEnRiesgo`.
  - Una tarea vencida creada después de leer las columnas no suma vencidas ni riesgo (CAL-T-36).
  - Una entrega que llega entre el agregado y las vencidas no quita la vencida de una celda que sigue `asignado` (CAL-T-37).
  - Una tarea calificada movida a una categoría nueva entre la lectura de categorías y el agregado no da `ERROR_INTERNO` y cuenta en la categoría de su columna (CAL-T-38).
- **"Mis calificaciones":** una tarea borrada después de leer la página conserva su calificación y su peso en `general` (CAL-T-39); una calificación que llega entre categorías y agregado no entra en `general` mientras la tarea siga `entregado` (CAL-T-40); la tarea movida de categoría no rompe la lectura (CAL-T-41).
- **Control negativo (CAL-T-42):** los mismos ganchos, con la transacción abierta sin opciones (READ COMMITTED), sí mezclan dos momentos: la tarea vencida nueva suma una vencida que no está en las columnas (3 en vez de 2), y la tarea movida de categoría hace que `leerGradebook` rechace con `ERROR_INTERNO`. Es la prueba de que los casos de arriba distinguen la instantánea, y de que sin ella el segundo sería un `500` real (regla 4 de §D-2.3).
- **Control de cada caso:** cada uno comprueba `disparado()` y, después, una lectura nueva que sí ve la escritura.

**Paginación de dos dimensiones.**
- **Empates al milisegundo (CAL-T-43):** siete tareas (una a f + 1 ms, cuatro en f, dos a f − 1 ms) se recorren con ventanas de 1, 2, 3 y 4 en `(fecha_limite DESC, id DESC)`, sin repetir ni saltar. En cada ventana, las celdas de cada fila van en el orden de sus columnas.
- **Alumnos con el mismo `nombre_busqueda` (CAL-T-44):** cuatro variantes de "José Pérez" (acentos, mayúsculas, doble espacio), más "Ñandú", se recorren con páginas de 1, 2 y 3 en el orden `(nombre_busqueda, usuario_id)` del roster.
- **Cursor de alumnos (CAL-T-45):** sirve mientras exista la cuenta (N-04): un maestro, un alumno de otra clase, uno dado de baja, uno desactivado y en mayúsculas. Un id de tarea o uno inexistente dan `400 VALIDACION`.
- **`cursorTareas` (CAL-T-46):** de otra clase, inexistente, de un material de la misma clase, de un usuario, no uuid o vacío → `400 VALIDACION`. En mayúsculas sirve igual.
- **Límites (CAL-T-47):** 0, 51, -1, 1.5, texto, vacío, `Infinity`, `1e400`, un espacio y el parámetro repetido → `400` en `limite` y en `limiteTareas`. 1 y 50, solos o combinados (50 filas por 1 columna), respetan el tope y el cursor.
- **Valores por defecto (CAL-T-67):** 25 filas y 20 columnas. Con el cursor de la última fila o de la última tarea, esa dimensión queda vacía (`[]`, cursor `null`), la otra no cambia y el resumen tampoco.

**Agregados.**
- **Pesos y "Sin categoría" (CAL-T-48):** pesos 50/30/20 con la tercera sin calificadas. El alumno de 80 % y 50 % queda en 68.75, con pesos efectivos 62.5 y 37.5, y su "Sin categoría" calificada no lo sube. El que solo tiene "Sin categoría" queda en `null`, pero su celda aparece.
- **Calificada sin entrega y entregada con retraso (CAL-T-48):** la calificada sin entrega (0/10) cuenta en el promedio y no como vencida (2 en vez de 3). La entregada con retraso y calificada cuenta igual y su celda dice `conRetraso: true`.
- **Resumen (CAL-T-48):** `promedioDeLaClase` 56.25 sin el alumno `null`, y `alumnosEnRiesgo` 3. El modal de "Mis calificaciones" trae el mismo 68.75.
- **No depende de la página (CAL-T-49):** el resumen y cada fila (porcentaje, vencidas y motivos) son iguales con páginas de 1, 2 y 50 alumnos por ventanas de 1 y 50 tareas, en cada página recorrida.
- **Baja y desactivación (CAL-T-50):** un alumno dado de baja o desactivado con calificaciones no aparece ni cuenta. Al volver, el resumen es el de antes.
- **Inscrito tarde (CAL-T-51):** cuenta las cuatro vencidas anteriores a su alta y entra "En riesgo" por vencidas, como aceptó el humano en S-04/R-13.
- **De categorías a puntos (CAL-T-52):** el modo pasa a `puntos` y la tarea antes "Sin categoría" empieza a contar: (8 + 5 + 10) / 30 = 76.67.
- **Redondeo (CAL-T-53):** 69.99 está en riesgo, 70 no, y 139.99 de 200 (69.995) se redondea a 70 y no está en riesgo. El promedio de 69.99, 70 y 70 es 70, y el de 69.99 y 70 también (mitades hacia arriba).
- **Milisegundo (CAL-T-54), con `ahora` explícito:** la tarea es vencida 1 ms después de su fecha límite, y no lo es en el milisegundo exacto ni 1 ms antes. En "Mis calificaciones", en el milisegundo exacto está en `asignadas`, y 1 ms después en `sin-entregar`.

**N+1 (CAL-T-55).** Las llamadas a la base se cuentan con `ejecutorEspiado`, en seis tamaños: (1, 1, 1), (2, 2, 1), (30, 30, 1), (2, 30, 10), (30, 2, 10) y (30, 30, 10) (alumnos, tareas y categorías).
- **`leerGradebook`:** las mismas llamadas en los seis tamaños. Con cursores, las mismas en los cinco tamaños que dejan fila y columna.
- **`leerMisCalificaciones`:** las mismas con cada uno de los cinco filtros, comparando entre las páginas no vacías (con la página vacía no se consultan las entregas), y nunca más de cuatro.

**"Mis calificaciones".**
- **Nada del compañero (CAL-T-60):**
  - Donde solo el compañero tiene una entrega o una calificación, la alumna ve `asignado`, y sus filtros `calificadas` y `entregadas` solo traen lo suyo.
  - `?alumnoId=`, `?usuarioId=` y `?alumno=` con el id del compañero no cambian nada.
  - Un cursor de una tarea de otra clase (donde el compañero está calificado), del id del compañero, de la clase o inexistente da `400`.
  - El compañero tampoco ve nada de la alumna.
- **Forma exacta (CAL-T-61):** llaves `general`, `siguienteCursor` y `tareas`. Ni `version`, ni promedio de la clase, ni resumen, ni datos de pago.
- **Filtros (CAL-T-62):** los cuatro de estado son una partición de "todas", sin repetidas:
  - La calificada sin entrega y la calificada con retraso solo están en `calificadas`.
  - La entregada con retraso está en `entregadas`.
  - La fila `asignado` (solo hilo) está en `sin-entregar` si venció y en `asignadas` si no.
- **Páginas (CAL-T-63):** con una tarea por página, cada filtro se recorre completo y en orden, y todas las páginas traen el mismo `general`. Es el de `core/`: 80 %, con la "Sin categoría" fuera.
- **Límites y filtros (CAL-T-64):** 0, 101, -1, 1.5, texto, vacío e `Infinity` → `400`; 1 y 100 → `200`. `Calificadas`, `sin_entregar`, vacío, repetido o desconocido → `400`.

**Autorización y fugas.**
- **`HEAD` del gradebook (CAL-T-56):** sigue la misma cadena: 401 sin token; 403 para estudiante, restringida y maestro ajeno; 200 sin cuerpo para maestro, comaestro y admin.
- **Maestro ajeno (CAL-T-57):** recibe el mismo `403 SIN_ACCESO_A_LA_CLASE` con un cursor de un alumno suyo, con `limite=0`, con `limiteTareas=abc` y con `cursorTareas` inexistente o de la clase, y lo mismo en una clase inexistente: la autorización va antes que la validación y no hay oráculo. El estudiante, con consulta inválida, recibe `ROL_NO_PERMITIDO`.
- **`:claseId` (CAL-T-58, CAL-T-66):** si no es uuid → `400`; en mayúsculas, el mismo cuerpo que en minúsculas (gradebook y "Mis calificaciones").
- **Toda la tabla (CAL-T-59):** para el maestro, el comaestro y el admin, con una alumna deudora y restringida y un deudor:
  - Solo las llaves del contrato: `alumno` es `{ id, nombre }`.
  - Ni estado de pago, restricción, correo, rol, `version` ni `@`.
  - La restringida aparece en su fila.
- **"Mis calificaciones", restringida y deudora (CAL-T-65):** la restringida recibe `403 ACCESO_RESTRINGIDO` por GET (también con consultas inválidas) y por `HEAD`, sin datos. La deudora recibe `200` sin su estado de pago.
- **"Mis calificaciones", otros roles y bajas (CAL-T-66):**
  - Maestro de la clase, admin y maestro ajeno: `403 ROL_NO_PERMITIDO`, también con consulta inválida y por `HEAD`.
  - Alumno dado de baja con calificaciones: `403 SIN_ACCESO_A_LA_CLASE`, sin datos.
  - Alumno desactivado: `401`.

**Arquitectura (revisión estática; CAL-T-68 y CAL-T-69, más `grep`):**
- **`adapters/db/calificaciones.ts`:** no nombra en código `email`, `estadoPago`, `accesoRestringido`, `motivoRestriccion`, `rol`, `version` ni `hash`, y no usa `Promise.all` dentro de la instantánea.
- **Las dos rutas de 01b en `handlers/calificaciones.ts`:**
  - No comparan el rol ni leen inscripciones, maestros o propiedad: todo va en `protegido()`.
  - El alumno sale de `perfilDe(request).id`.
  - No llevan `try/catch` ni leen `request.query` sin validar.
- **El resto del cambio:** sin `$queryRawUnsafe`, sin SQL concatenado (los tres `$queryRaw` son plantillas etiquetadas) y sin consultas en ciclos (el único ciclo agrupa en memoria). Por `git status`, ninguna librería de infraestructura nueva ni fuera de `adapters/`.

### No atacado y por qué
- **Conteo de sentencias SQL reales (no de llamadas a Prisma):** el ESLint del repositorio prohíbe importar `pg` fuera de `adapters/` (también en `backend/test/`), y el cliente de Prisma se construye sin eventos de consulta. Conté llamadas con `ejecutorEspiado`. Las relaciones anidadas (`categoria`, `publicacion`) las resuelve Prisma por lotes, no por fila, así que el conteo de llamadas detecta un N+1 del adaptador. Un N+1 interno de Prisma quedaría fuera.
- **`EXPLAIN` con datos grandes y tiempos con 50 × 50 sobre una clase real:** lo hizo el manager (sin `Seq Scan` sobre `entregas` ni `tareas`). No lo repetí.
- **La ventana entre el middleware (`claseDe`) y la transacción de la lectura** (la clase o la asignación del maestro borradas en medio): es el patrón de todas las rutas con sexto paso, no algo de 01b.
- **Frontend:** 01b no tiene interfaz (llega en 01d).

### PA-07 de la corrida final del backend
**Fuente:** `<scratchpad>/r1b/test-back.txt`, la salida completa de `npm test` (desde `backend/`, de 18:37:19Z a 18:40:03Z). El conteo es `grep -o … | wc -l` por término. Para atribuir cada línea usé `<scratchpad>/r1b/pa07.mjs`: el último "incoming request" del mismo `pid` y `reqId` antes de la línea, por app y no con un mapa global.

| Término | Cuenta |
|---|---|
| `40P01` | 0 |
| `deadlock detected` | 0 |
| `could not serialize` | 0 |
| `too many clients` | 0 |
| `"Error no controlado"` | 10, exactamente el inventario I-1 |
| `"code":"P2028"` | 5, todos permitidos |
| (aparte) `Unable to start a transaction` (`maxWait`) | 0 |
| (aparte) `Test timed out` | 0 |

- **Control positivo, completo:** los tres `P2028` deterministas de `servicio-ocupado.integracion.test.ts`, nivel 40, en un mismo `pid` (27656):
  - `POST /api/auth/cambiar-contrasena` › `tx.sesion.findFirst()`
  - `POST /api/auth/refrescar` › `tx.sesion.updateMany()`
  - `POST /api/clases/:claseId/publicaciones/:publicacionId/comentarios` › `prisma.$queryRawUnsafe()`
- **Los dos de `cuentas-r3.ataque.test.ts`** (`pid` 18512, nivel 40): `POST /api/auth/login` › `tx.sesion.create()` y `POST /api/auth/restablecer` › `tx.tokenCuenta.updateMany()`. Ningún `P2028` fuera de la lista.
- **Los diez `"Error no controlado"`, iguales a I-1:**
  - 1 a 6: `POST /api/auth/login`, de `intentos-r2.ataque` (`pid` 13988): cinco "fallo simulado de la base en la búsqueda" y uno "… al crear la sesión".
  - 7 a 9: `POST …/archivos`, `POST …/archivos/:archivoId/descarga` y `GET …/publicaciones`, de `archivos-d-r2.ataque` T-39 (`pid` 16808): `ZodError` de URL inválida del almacén.
  - 10: `GET /api/prueba/error-comun` › `boom`, de `salud.integracion` (`pid` 14992).
- **Lo que provoqué a propósito:** nada. Mis pruebas no generan ningún `"Error no controlado"` ni `P2028`. El `ERROR_INTERNO` de CAL-T-42 es un rechazo de `leerGradebook` llamado directamente, sin pasar por la API, y no escribe en el log.
- **`DeprecationWarning` de `pg`:** 18, uno por proceso de trabajo, como en 01a (N-23). No bloquea.
- **PA-07: limpia.**
- **PA-12:** ningún tiempo límite ni rojo intermitente; no repetí ninguna corrida.

### Comandos y última línea
Desde `backend/`, uno a la vez, con Docker Desktop encendido y en una red de confianza (PA-01 no aplica).

| Comando | Código | Última línea / resumen |
|---|---|---|
| `npx vitest run test/calificaciones-instantanea-01b-r1.ataque.test.ts` (y cada archivo nuevo por separado, mientras los escribía) | 0 | `Tests  11 passed (11)` |
| `npx prettier --write` sobre los 4 archivos nuevos (solo los míos, dentro de `backend/`) y `npx eslint --config ../eslint.config.mjs test/*-01b-r1.ataque.test.ts` | 0 | sin salida de ESLint |
| `npm run lint > <scratchpad>/r1b/lint-back.txt 2>&1` | 0 | `> tsc -p tsconfig.json --noEmit && tsc -p tsconfig.test.json` (antes: `All matched files use Prettier code style!`) |
| `npm test > <scratchpad>/r1b/test-back.txt 2>&1` | 0 | `Test Files  216 passed (216)` · `Tests  2617 passed (2617)` · `Duration  158.26s (transform 19.29s, setup 6.67s, import 257.95s, tests 1301.02s, environment 55ms)` |
| `npx vitest list` de los 4 archivos nuevos | 0 | 38 líneas, una por caso |

### Veredicto de la ronda 1 de 01b
**RESISTE.**
- **Hallazgos:** 0 (0 críticos, 0 altos, 0 medios y 0 bajos).
- **V-01:** en verde, 179 de 179, y siguen intactas al cierre.
- **N-24:** los casos que sí distinguen la instantánea (CAL-T-32 a CAL-T-41) pasan, y el control negativo en READ COMMITTED (CAL-T-42) confirma que sin ella fallarían, uno con un `500`.
- **Corrida:** lint y la suite completa del backend en verde. PA-07 limpia, con el control positivo completo. Ninguna PARADA.
- **Pendientes:** sin acción para el programador. N-21 (README) sigue pendiente de su corrección, según la revisión.

### Tabla de SHA-256 de las 183 `*.ataque` al cierre de la ronda 1 de 01b (base de V-01 de la ronda o subentrega siguiente)
Calculada con `sha256sum` sobre `git ls-files -co --exclude-standard | grep -E '\.ataque\.test\.tsx?$' | sort`. Contra la tabla de la ronda 0 de 01b, las 179 previas no cambian y se suman las 4 nuevas.

| SHA-256 | Archivo | Nota |
|---|---|---|
| `BCCE2CAE771F97957D8691BEF7FFF4EC42412DAAEABF726AEB0AFC59F6F25671` | `backend/src/config/correo.ataque.test.ts` |  |
| `DCB78D222544E8DC4FBECE59468F555B04ABE971B70016E9BB17FCAE3E958580` | `backend/src/config/env.ataque.test.ts` |  |
| `71E7F049447D2D1ECEDD897C55EA0B6D31221753F0A7E7473C7AC6E8667F0A95` | `backend/src/config/logger.ataque.test.ts` |  |
| `91F620C1A27778EEBC2BED5EEC1BC9B0E3FE1199B32ED00F9DD910011D6A1805` | `backend/src/core/clases/codigo-r1.ataque.test.ts` |  |
| `262691F5786AD63B2393D0BA5FF97538F6DACF43343BED019AD23C12A07D8686` | `backend/src/core/clases/codigo-r2.ataque.test.ts` |  |
| `E769CBFCC3A83A64B51C6437F80684640A7C928AD6B8C5C1671FDFF005D7B734` | `backend/src/workers/ritmo-03c-r1.ataque.test.ts` |  |
| `294BE1AF0BF69D6C05F54E2F0D8E587C78A5527D0B64D1A224C058E31CE013D0` | `backend/test/admin-muro-02b-r1.ataque.test.ts` |  |
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
| `5E02A27716D63E8CE0FE6B6171BFF089EB3EE2548260349B16950D7E65A1BCF9` | `backend/test/calificaciones-01a-r1.ataque.test.ts` |  |
| `B00C2C10D8D862F6576CB69173F07D190A08A18A25439C296D10B74E9772A454` | `backend/test/calificaciones-01a-r2.ataque.test.ts` |  |
| `DD919EBD74A2C6AC60C244A1563B46895821B0D25E5051CDA25FFFB72B653416` | `backend/test/calificaciones-carreras-01a-r1.ataque.test.ts` |  |
| `B09BAAEC53455CEA1A0674890EBD9353007E6F2628001446E873B09279FFBA07` | `backend/test/calificaciones-estatico-01a-r1.ataque.test.ts` |  |
| `29EED2E93AF2775A4605160EA533BD462FD03CB1CFE4C47154898358A7255869` | `backend/test/calificaciones-estatico-01b-r1.ataque.test.ts` | Nueva (ronda 1 de 01b) |
| `6E4C0EB47FF8020B0A539E5B70B24C8C1D05F7773EA092CD513E39C68CF4534E` | `backend/test/calificaciones-instantanea-01b-r1.ataque.test.ts` | Nueva (ronda 1 de 01b) |
| `6E3C92C13F146A01C8DCFDC7DD04BEA59F0E2562051F6AC65F95F924EF73E4DB` | `backend/test/categorias-01a-r1.ataque.test.ts` |  |
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
| `6F72C7CC1D0F95D60C057D7406A8955C47E834C963ED53D15DF64C83049F5431` | `backend/test/entregas-01b-r1.ataque.test.ts` |  |
| `5BAAF6F8FB76320620ED4A84EFACA2B2D473460F62360E0D48738B97A0AC584A` | `backend/test/entregas-01b-r2.ataque.test.ts` |  |
| `BA1AC9B17CC9BF747522BD4EC8B87DF436008482E643B18EEA8E9A8C041C59B3` | `backend/test/formada-ch-r1.ataque.test.ts` |  |
| `EC9602D5F109B45A6D428E708D9B6CDD37A7509A6FF9031FA6FD8A2DA0E25E9B` | `backend/test/gestion-02a-r1.ataque.test.ts` |  |
| `E4E9365EA010F3F670B6C1194D1A592E95DB43BFF0496D4EA1646FC5225CA8B4` | `backend/test/gradebook-01b-r1.ataque.test.ts` | Nueva (ronda 1 de 01b) |
| `5F4133F949D2F337A8F63B75CF82CB77114DB7812D67C1960105F5000C31A326` | `backend/test/guarda-ch-r1.ataque.test.ts` |  |
| `7A7DAC6D87EDF81059FCFF9C07471AAF49D690EC159BE4B9FD4AA32B0909A215` | `backend/test/guarda-ch-r2.ataque.test.ts` |  |
| `610EE44E5D0BCEA46EB4E3645F9ADF1998A76947A25AF7E3F8248EA3A633DF79` | `backend/test/guarda-ch-r3.ataque.test.ts` |  |
| `E5D149F3AC52B726E1FE08908249706341330F88EAA6674B9A9AC67B98B1E864` | `backend/test/guarda-clase-r1.ataque.test.ts` |  |
| `C979D2C9C420A2177FA6EBDDB78EB2CE84D5F043B94270F690916A6FC75D6F8F` | `backend/test/guarda-clase-r2.ataque.test.ts` |  |
| `20982E2B98F1B162146A211923F3D5EC19D4E170C4AA3A5BFC6F82C3B6173AAD` | `backend/test/guarda-r2.ataque.test.ts` |  |
| `2649F3D357DCB806361AC101C57FCB504B9C798B631048F0B3E200F63DA7DC30` | `backend/test/hilo-01c-r1.ataque.test.ts` |  |
| `2D2216EE9DB290B318825A6F73C346D4767CACC12D95F5CA76457A78B63FEDC3` | `backend/test/instantanea-01b-r1.ataque.test.ts` |  |
| `A8B79D5AD98270BE3747F493865708A78BB73ADD08D832584DB4464C3582777A` | `backend/test/intentos-r2.ataque.test.ts` |  |
| `2619B44EEA3370494C95AC128FCFD9E3FFC20D1581A19F549BF371F603A11D7D` | `backend/test/invitacion-flujo-03a-r2.ataque.test.ts` |  |
| `704155928183AEC193AE7E157B86B3E9361D2B63C7A47BE1ED859605FAB4FFA6` | `backend/test/invitacion-masiva-03c-r1.ataque.test.ts` |  |
| `DD9B7454E8786BF0B833D265900CCAECF595808CEBC8E9A77C9AEF15298A1038` | `backend/test/invitacion-masiva-03c-r2.ataque.test.ts` |  |
| `2684916C88B9405706F82DA3F9B2FFD0B3626A11AF79E20EA146FDFD1D52C319` | `backend/test/lecturas-fx-r1.ataque.test.ts` |  |
| `3790777831A1FACB053D0719D85AB404593954416B1443A1A59530E09E2C81DC` | `backend/test/lecturas-fx-r2.ataque.test.ts` |  |
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
| `D6B9ADAF1C14A61FE369F510774EF702CFA20F28F3CB19B0EB7357440DCB0783` | `backend/test/migracion-01a-r1.ataque.test.ts` |  |
| `BC6D49F9FC1F5EB20E305945FEF57CAEEBEB108BFF5D5CF4BA10B8040687D69C` | `backend/test/mis-calificaciones-01b-r1.ataque.test.ts` | Nueva (ronda 1 de 01b) |
| `D95AB72A3FD3D70CE3A9027A50DB660426976C3DF1A46E92DF75066BEAC78A0C` | `backend/test/muro-c-r1.ataque.test.ts` |  |
| `7825CFC9B484DF740FA0E9562A195D1BBCAF4CAF72EA55FA847B5394AB96C125` | `backend/test/muro-c-r2.ataque.test.ts` |  |
| `8B733B86FC6D54ECE008389A59793FAE4EC4A65146EB37215E900E50A5337D46` | `backend/test/nombres-guarda-r3.ataque.test.ts` |  |
| `3FD2583A4DE7CD432B2E09A5130C23D6A59FA475E5E0AA69F23739351ACBF9CF` | `backend/test/nombres-ids-01a-r2.ataque.test.ts` |  |
| `00A6EB6F7CCD7D8790C356BEFCC96DDFDA6EACCE0BE53DE255CFE3626D8F2ADB` | `backend/test/nombres-tokens-r2.ataque.test.ts` |  |
| `80B5A848F69B429E7DADEC86C07BEC1D3E3EED8A042EFBA41CE912DED39E7BAB` | `backend/test/nowait-ch-r1.ataque.test.ts` |  |
| `AD0DAB1952E509237ACAC12BB1F6774FA9C5DE8B44D1E6928EDC65CC67A78C21` | `backend/test/referencias-01b-r1.ataque.test.ts` |  |
| `6F2ABC2CEFD77D74CD1E3ABBDCE9C41BB53D00BD4D8E5BA7E496C4441C2697E5` | `backend/test/servicio-ocupado-ch-r1.ataque.test.ts` |  |
| `CCEA34C962FC8F14A49C64EAFA8119DAE5030E1302ED94FE369299EC49182BB8` | `backend/test/sesiones-y-cadena.ataque.test.ts` |  |
| `70AC720F2E7FCADEE5BBCB6414887AB08129DEA7CD91DF012046953B1584E8B6` | `backend/test/sexto-paso-02a-r1.ataque.test.ts` |  |
| `C89C30851E6B409CD045017181147BF674DF947762A8DEA3F3FB981BD9B36E09` | `backend/test/tareas-01a-r1.ataque.test.ts` |  |
| `79BC7AAFC11676D36129610A4B5CD5FE5D8234D0D748487FD2F3E48C5F772C79` | `backend/test/tareas-01b-r1.ataque.test.ts` |  |
| `AE60C11CFF5C82DF4954DB48582DF4BD5A64957FF9AFAF9712AA43A038F8E189` | `backend/test/temas-01a-r1.ataque.test.ts` |  |
| `DC7B86A621062ED671C1E7174A745019133FBD410C7A2E78114B2A2C50AFFE95` | `backend/test/temas-01a-r3.ataque.test.ts` |  |
| `F09E9A0038C47D1A2223376A0AF260BAF573F0C45BF770201C48C9E30296F04B` | `backend/test/worker-03c-r1.ataque.test.ts` |  |
| `9F60F9D65D52D2021A1EB04E9F01D3CC68F22744C845BF93D6621AA4FE9713A8` | `backend/test/worker-r1.ataque.test.ts` |  |
| `77D11BD85F202A9EEC92A363DF82E63FB9A784CA9D368D49F62E61C1A2AA967B` | `backend/test/worker-r2.ataque.test.ts` |  |
| `0DE083DF355129E800D130F33D228835479C25F49ED82B6C2BCF9CF5F6E944CB` | `frontend/src/app/barra-02d-r1.ataque.test.tsx` |  |
| `B89EDE0F6AED45DFCB5E64C8909A822156CE43FD80948E72419CDCE9D4541A87` | `frontend/src/app/cache-03a-r1.ataque.test.tsx` |  |
| `E85743C0FBB8E476874A2C67334342D8D69D14153579FC1E4CCE0AE6E2B29616` | `frontend/src/app/contexto-r1.ataque.test.tsx` |  |
| `BC2BE5541006887E2A5A4A89B33046180F607D54474B0F96A73D615AFBCAC385` | `frontend/src/app/contrasena-r1.ataque.test.tsx` |  |
| `F38BCACB716D8A39ACDB3535A95603CD0D8AB02572CA57A7DF5268B01CEB6EAC` | `frontend/src/app/contrasena-r2.ataque.test.tsx` |  |
| `68FB5D092C0C8ECFCF282477EF023AAAE26F6B869656E05109DC3EFA276D842A` | `frontend/src/app/cuentas-r1.ataque.test.tsx` |  |
| `41930017715D3D6869DC7ACEFD75DE8EC3684F1F035B845ABDF8EC0F6B734DEE` | `frontend/src/app/cuentas-r2.ataque.test.tsx` |  |
| `1506C27E5F7418B5E087FD30F8809645A2FC3E2761C7249DE78F02E24AA6C7A5` | `frontend/src/app/en-espera-r1.ataque.test.tsx` |  |
| `DB48DAD405C27062621A44D3744C84CC5903892A51E5A8DF18F41383CB9C88A3` | `frontend/src/app/errores-r1.ataque.test.tsx` |  |
| `0E1D93E4DD3CBC7B5E9475A17B5CA66F0DF056BA25CB117249F4C2E2F5887A51` | `frontend/src/app/foco-barra-02d-r2.ataque.test.tsx` |  |
| `2154B5C15F696A0C7F884BFF774CF4E2A4208A5281DB9076653F8253E2385AB9` | `frontend/src/app/foco-pestana-02d-r3.ataque.test.tsx` |  |
| `F95321E604E20B533EBF2DB3C1C6C66BA2F2D87A48F075415B766551F6EE30F4` | `frontend/src/app/fondo-r1.ataque.test.tsx` |  |
| `57CB54AFD3B79464F0DF01B88FC388CEBBEAC5657D936C4C204CBAE6034B0834` | `frontend/src/app/marco-r1.ataque.test.tsx` |  |
| `446CE2CC8A4F254F94FF6313EB13837421F98749C2473AA0B8979388E7CE674A` | `frontend/src/app/muro-recuperar-c-r3.ataque.test.tsx` |  |
| `DC0365EDB436B3F2EE256882EF13F2295CDFCB83A63F9BA3939381983E43FDFC` | `frontend/src/app/muro-recuperar-c-r4.ataque.test.tsx` |  |
| `2F8056A770397C1601647277944555A48AFC4B9A2BABEB75E5898F0CC92562BB` | `frontend/src/app/muro-rutas-c-r1.ataque.test.tsx` |  |
| `0EEFED2C05D76B0790A437E9465A898A9076083B1F046F8785145CFAAD0DA379` | `frontend/src/app/registro-maestro-03b-r1.ataque.test.tsx` |  |
| `053E867A904AFA3C09EEF92CA2E03E929D9F9C93F714040856F40C7418721BBE` | `frontend/src/app/router.ataque.test.tsx` |  |
| `F0657FB91F7B3ACCF64726292F9324C6742C1AC537C6C4A1985EC4E32AE09C83` | `frontend/src/app/rutas-02c-r1.ataque.test.tsx` |  |
| `C7946F5F5D5D16D36B395ADC2AD9928ACC7FD9839875FB64532B51489756730B` | `frontend/src/app/rutas-clases-r1.ataque.test.tsx` |  |
| `F090CBD8E8C9B0AF52D4FC19547B07E9B6413F5414CC4B10862F01E29818DDDC` | `frontend/src/app/sesion-r2.ataque.test.tsx` |  |
| `7CF085827D8FA981E56822431B8A5C6B7AB08B44477D43F739EBC269D2B8F899` | `frontend/src/components/layout/estatico-r1.ataque.test.ts` |  |
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
| `932E76314E0447DA1790C3C86CA48545EEA834FEAF6F706C4D405B7EA62BE872` | `frontend/src/features/clases/alumnos-b-r1.ataque.test.tsx` |  |
| `55DC274ECA96DA4360848B88F9F2A839AC815031490AB57FF38DE074512D632C` | `frontend/src/features/clases/alumnos-b-r2.ataque.test.tsx` |  |
| `371518E4309F14201A92D29F9436A97A19801B506D45114964FBCFE3F5CD4183` | `frontend/src/features/clases/alumnos-b-r3.ataque.test.tsx` |  |
| `266D088DD727F18AF8C8A106B8D9C4DBED75753E4B1B4ABB12F3A4DF870ECB7F` | `frontend/src/features/clases/alumnos-b-r4.ataque.test.tsx` |  |
| `856CFFBD9C743F9815DAF731487E29DC5F5272545DC15820A70BAF86ECFA6527` | `frontend/src/features/clases/alumnos-b-r5.ataque.test.tsx` |  |
| `CC2FDD28CEB3DE642EE01D07773271D7154811B1F3756333F1DFB285A386E6CC` | `frontend/src/features/clases/archivos-d-r1.ataque.test.tsx` |  |
| `36C32BAD5F632CAD5D76BCA14C74779DDD7CF9B9465A69522886DB770A508B22` | `frontend/src/features/clases/archivos-d-r2.ataque.test.tsx` |  |
| `14CB04B6B56BF2F83DE04DAB863E7843FACA3A585E70FEBC93EE3588F06AB144` | `frontend/src/features/clases/archivos-d-r3.ataque.test.tsx` |  |
| `71148A960F7EF6995904B3DB6DFD0B0E3BA6AF697C45399669EC1DD81CC7D1AA` | `frontend/src/features/clases/cargar-mas-02c-r2.ataque.test.tsx` |  |
| `A3880B67FFAA0D15763D1C761CEF1FF8472029C77BFB2211AB079EADB1685325` | `frontend/src/features/clases/categorias-01e-r1.ataque.test.tsx` |  |
| `66C0B873BC8B9D8E9E01AC871BD6AAAB4328508BEB5EC9371D69463D7C12430D` | `frontend/src/features/clases/categorias-01e-r2.ataque.test.tsx` |  |
| `DD4B9C07F940B55085B7EF8113994E3DB60FAD6A2FF3B5809E0DCB8F2568E336` | `frontend/src/features/clases/clases-admin-02c-r1.ataque.test.tsx` |  |
| `5F0679D8CFACC8BCE01989C04A415DC5B546625EB7DEC92F03959DE5A0F89815` | `frontend/src/features/clases/clases-r1.ataque.test.tsx` |  |
| `C7AD5EDC733E374117A9277F1C2987E84CC2930C77EB4C720CCF15CC9F5FAB45` | `frontend/src/features/clases/clases-r2.ataque.test.tsx` |  |
| `A835A11D29AEDB8F77F91E826A22C2B7CF5322FCED3F6BED0C1ACBF7C75A4E61` | `frontend/src/features/clases/clases-r3.ataque.test.tsx` |  |
| `86B04D234527ECEEFCA35B07CE89E6B7CE0B6AFE5CCDEE2F005E6A4219F0495A` | `frontend/src/features/clases/clases-r4.ataque.test.tsx` |  |
| `AF15BD75457BB2560E1D60BA3EB369786FE869BC3DCAE5FCE144C52049D7E4E8` | `frontend/src/features/clases/estatico-02c-r1.ataque.test.ts` |  |
| `CDD1ED8890859AE3E884822FC7074852A2173105114745D83FE9A15C1C47C626` | `frontend/src/features/clases/estatico-r1.ataque.test.ts` |  |
| `DE23D395DFE7A6F3D6D15EB48CB574599DC9D8204E5A90B255C0C10D25A186FA` | `frontend/src/features/clases/fila-01d-r1.ataque.test.tsx` |  |
| `54A5DAA368528F1B64BD809C79964E30C42C3A71F76E2013643695FAAFA6C73E` | `frontend/src/features/clases/foco-02c-r3.ataque.test.tsx` |  |
| `80EFD85B74264C125683DFB6D631A10DB40887C5E7315D5EF6FF7B49357EAAD7` | `frontend/src/features/clases/foco-02c-r4.ataque.test.tsx` |  |
| `32C1F6A48BA3241963CF6864BD2236A0675425241D4389B524CBE805C358A5CC` | `frontend/src/features/clases/foco-02c-r5.ataque.test.tsx` |  |
| `FDC9F0D1D5BDF7D8C6E9E7F15CCFA2D909F717E9465A8279F5540FB704958BB9` | `frontend/src/features/clases/foco-pestana-02d-r3.ataque.test.tsx` |  |
| `0F3F8173AD209418B1B3106C755EC83808581389D65A8549B93C69B29B22F013` | `frontend/src/features/clases/heredados-02d-r1.ataque.test.tsx` |  |
| `0F60F1582FCE6E5EFAF9BF6856133DC30F1DC4EB9C3B7FEA19F90A330F8335B3` | `frontend/src/features/clases/inicio-sin-datos-02c-r1.ataque.test.tsx` |  |
| `7C434A0E54E70B12D4B2A3DE22FFB4DBF5F28A1CFBD2290C22E8A2B59EDF0E16` | `frontend/src/features/clases/inicio-sin-datos-r2.ataque.test.tsx` |  |
| `A4DE3A7DC35DAEDFF86FD41349EA09140213E918613603D0985C698FF41D29F7` | `frontend/src/features/clases/maestros-02c-r1.ataque.test.tsx` |  |
| `B487B8C8C95BADC6BC78F3BE72B7B5F809381E8C69127D6600254B872DE62EBC` | `frontend/src/features/clases/muro-02c-r1.ataque.test.tsx` |  |
| `9D35E0DA961248750C2948E3F69305856BCDD25E78E01C64AA50DCDFEEE93F8D` | `frontend/src/features/clases/muro-c-r1.ataque.test.tsx` |  |
| `C50A5D53AD16EAFF69ABEC6F531B6C0EDD74CE4ECDA02380EDFBF66F7E5BA89B` | `frontend/src/features/clases/muro-c-r2.ataque.test.tsx` |  |
| `1AC0F4A0474E7F334BC57D4F2BA23954E8C280FA0C3573A26350D0ADE431FF75` | `frontend/src/features/clases/muro-c-r3.ataque.test.tsx` |  |
| `67B60A9A5363F88E6CEBA210C27452B8D639F6DF798AA4E506DC54BB2312249A` | `frontend/src/features/clases/personas-02d-r1.ataque.test.tsx` |  |
| `2911195DC97BF9B25E7E874E0A0B6C9C0D25A9A878C2E821A752D340D219A740` | `frontend/src/features/clases/refactor-01c-r1.ataque.test.tsx` |  |
| `4303EAC77B98E8978495D9E68FD7725AC436F9DB757DBC0C02C59051436908FA` | `frontend/src/features/clases/reloj-01e-r4.ataque.test.tsx` |  |
| `A4AA15CEF1A377EED688DAB1B92E5CA4A3943490144CEC861CF7B482845B0362` | `frontend/src/features/clases/segmentado-02d-r1.ataque.test.tsx` |  |
| `D899C19BA982FBDE2208BBC7FA009869556C84BD4650586DBD9EE90B22234E47` | `frontend/src/features/clases/tarjeta-01d-r1.ataque.test.tsx` |  |
| `97AF503E763F7DFF9FCFBDC72862CD21DE6AF8E51D3EC41134F8475D98AE2DF6` | `frontend/src/features/clases/tarjeta-01d-r2.ataque.test.tsx` |  |
| `7F9D22E5904192DCC00465FADCABF36AA5DE3CD16D6A319A41A66340BB9BD6A8` | `frontend/src/features/clases/trabajo-01e-r1.ataque.test.tsx` |  |
| `F6924BC272A5240CF97D35729C797CC10960ED7CF94FE1BE1B69CA2DF6C1CF8F` | `frontend/src/features/clases/trabajo-01e-r2.ataque.test.tsx` |  |
| `9866EF34167061E2715B65A352C55D08C7E9268033E879AE633C7FD568E4D49F` | `frontend/src/features/clases/ventana-02c-r2.ataque.test.tsx` |  |
| `008E5C606F249D15E3816E27E3E97FD7D7FBA0F8697751A156665A76694B3A18` | `frontend/src/features/clases/ver-mas-01e-r3.ataque.test.tsx` |  |
| `4F486CA37D2A2BB6CC26754281D2ADCE086A9D8D4485A069DE7AE5D54E360ACF` | `frontend/src/features/tareas/entregas-01d-r1.ataque.test.tsx` |  |
| `93A5A0A648669E9C96494A62B2B16082B07296F279E2892BF2C8D47834EE2FC1` | `frontend/src/features/tareas/entregas-01d-r2.ataque.test.tsx` |  |
| `432DCDDF119DD0E32E49ADC42D5F51D197698C8896E1058C505AB31F4A8EE838` | `frontend/src/features/tareas/entregas-01d-r3.ataque.test.tsx` |  |
| `FD66C82D400E0F0A9709960934B555568642D9E4B5E41F31AD6606A620836982` | `frontend/src/features/tareas/entregas-01e-r1.ataque.test.tsx` |  |
| `496652BC59817166F53E00CB828F2119C857C2834063A31764D7876DC150C930` | `frontend/src/features/tareas/entregas-01e-r2.ataque.test.tsx` |  |
| `BFDED7507BC684EA9858CD76517EF0E4C23CBC69E5A19F381E6EC522FD6156E6` | `frontend/src/features/tareas/tareas-01a-r1.ataque.test.tsx` |  |
| `B778FC2E6BB0A8F8715A56877B3B781439CA214C8A9C8AE126F610C95229882A` | `frontend/src/features/tareas/tareas-01d-r1.ataque.test.tsx` |  |
| `BF3C999033195CAC778A82A579E44729FB07A405F5CDB41D8E7DC932CB71F942` | `frontend/src/features/tareas/tareas-01d-r2.ataque.test.tsx` |  |
| `3567D7C23D2CF6A2FD538CD6822EF60AC3CFFEAC036394ED1E3559DEBE492C57` | `frontend/src/features/tareas/tareas-01d-r3.ataque.test.tsx` |  |
| `6BBE2BD85E2B5500FBAB4D0F51630C0C8E9D65B1A63045AD1FA906298A92A435` | `frontend/src/features/tareas/tareas-01d-r4.ataque.test.tsx` |  |
| `C71CBA65DD284D7AF11CBC812B6BCF75BAA373939EDB8318E731858D9C50173F` | `frontend/src/lib/format-d-r1.ataque.test.ts` |  |
| `89DBBB70D5DC404C3D74DB5391D10855C8CB1D6B4C643B6147B3CE6FFB2637AF` | `frontend/src/lib/format-d-r2.ataque.test.ts` |  |
| `BFA7DED62F7A1402590D438A1CC51060A63FA019AD47D3EB5740E43383064A2A` | `frontend/src/lib/format-d-r3.ataque.test.ts` |  |
| `10C730348D18FF8DAE7B3623751D31122AA58560B564AD191717FA1938A6F8CE` | `frontend/src/services/apiClient.ataque.test.ts` |  |
| `CED32202A8DEB611027E965FB5EBD56A9848A1EE3467474BFBAED64374D3BF5B` | `frontend/src/styles/clases-r1.ataque.test.ts` |  |
| `B8085BCBBC7F4B6276BF3A87FB7BA0BC887953A8C6CE372354A7F3F1B5037582` | `frontend/src/styles/tokens-r1.ataque.test.ts` |  |
