# Resumen del programador — CALIFICACIONES-01

## 01a — implementación

Plan: `docs/trabajo/CALIFICACIONES-01-calificaciones-y-gradebook/plan.md` (LISTO, aprobado el 2026-10-13; P-03 en (c′), S-01). Base de "No se toca" `<R>` = `d998282`. Pasos completados: 10 de 10 (más el 8 bis). Ninguna PARADA.

### Verificación (comando exacto y última línea de salida)
| Paquete | Comando | Última línea |
|---|---|---|
| shared | `cd shared; npm run lint` | `All matched files use Prettier code style!` (código 0) |
| shared | `cd shared; npm run build` | `> tsc -p tsconfig.json` (código 0) |
| shared | `cd shared; npm run test` | n/a: `shared` no tiene script `test` (`npm error Missing script: "test"`); sus esquemas se prueban en `backend/test/esquemas-*.test.ts` |
| backend | `cd backend; npm run lint` | `> tsc -p tsconfig.json --noEmit && tsc -p tsconfig.test.json` (código 0; antes: `All matched files use Prettier code style!`) |
| backend | `cd backend; npm run test` | `Tests  2523 passed (2523)` (`Test Files  203 passed (203)`; código 0) |
| backend | `cd backend; npm run build` | `> tsc -p tsconfig.json` (código 0) |
| backend | `cd backend; npx prisma validate` | `The schema at prisma\schema.prisma is valid 🚀` |
| frontend | `cd frontend; npm run lint` | `> tsc -b` (código 0) |
| frontend | `cd frontend; npm run test` | `Tests  2536 passed (2536)` (`Test Files  166 passed (166)`; código 0) |
| frontend | `cd frontend; npm run build` | `✓ built in 1.48s` (código 0) |

Las suites se corrieron una a la vez (backend, luego frontend), con Docker Desktop encendido. En la salida completa del backend: `40P01` 0, `deadlock detected` 0, `"Error no controlado"` 10 y `"code":"P2028"` 5 (`grep -o … | wc -l`), los mismos que el inventario I-1 y la lista de `P2028` de la ronda 0.

### Conteos
- Backend: `cd backend; npx vitest list | wc -l` → 2523 casos; `npx vitest list --filesOnly | wc -l` → 203 archivos (ronda 0: 2422 casos en 192 archivos; +101 casos en 11 archivos nuevos).
- Casos por archivo nuevo (`npx vitest list <los 11> | sed -E 's/ > .*//' | sort | uniq -c`): `core/calificaciones/calificar.test.ts` 18, `general.test.ts` 14, `riesgo.test.ts` 6, `test/esquemas-calificaciones.test.ts` 9, `calificaciones-migracion.integracion` 13, `calificaciones-lecturas.integracion` 3, `calificaciones.integracion` 13, `calificaciones-concurrencia.integracion` 8, `calificaciones-autorizacion.integracion` 7, `calificaciones-editar-tarea.integracion` 5, `calificaciones-estatico` 5.
- Frontend: 2536 casos en 166 archivos (la corrida de `npm run test`); sin archivos nuevos en 01a.

### Pruebas requeridas → archivo y título exacto
- **CAL-1A01** → `backend/test/calificaciones-migracion.integracion.test.ts`: "CAL-1A01: entregas_calificacion_segun_estado rechaza calificado sin calificación, entregado con calificación, calificación sin fecha de calificación y al revés"; "CAL-1A01: entregas_calificacion_en_rango y puntajes_rubrica_puntos_en_rango rechazan −0.01 y 1000.01; 0 y 1000 pasan"; "CAL-1A01: con P-03, entregas_fecha_segun_estado acepta calificado sin fecha de entrega y sigue rechazando asignado con fecha y entregado sin fecha"; "CAL-1A01: entregas_sin_fecha_sin_retraso_ni_enlaces rechaza calificado sin fecha de entrega con retraso o con enlaces"; "CAL-1A01: puntajes_rubrica_criterio_id_fkey existe con condeferrable y condeferred verdaderos, NO ACTION al borrar; la de entrega_id es CASCADE"; "CAL-1A01: borrar un criterio con puntajes falla al confirmar la transacción y no deja nada borrado"; "CAL-1A01: borrar la publicación de una tarea con criterios, entregas y puntajes no falla y se lleva todo"; "CAL-1A01: la migración aplica sobre entregas asignadas y entregadas con archivos, enlaces e hilos, que quedan igual y sin calificación"; "CAL-1A01: los CHECK nuevos y el reemplazado existen validados en el esquema migrado, y la FK de criterio_id es diferida"; "CAL-1A01: en el esquema migrado, una entrega asignada de antes puede pasar a calificada sin fecha de entrega".
- **CAL-1A02** → `backend/src/core/calificaciones/calificar.test.ts`: "CAL-1A02: con la suma de máximos igual a los puntos de la tarea es la identidad"; "… con una suma distinta escala y redondea a la centésima (7/9 de 10 = 7.78)"; "… rúbrica parcial con puntos parciales por criterio (2.5 de 5 y 4 de 5)"; "… todo en 0 da 0 y todo al máximo da los puntos de la tarea"; "… una mitad exacta en la centésima redondea hacia arriba"; "… decimales en los puntos de los criterios se suman sin error de float"; "… puntos de la tarea en los extremos, 1 y 1000" (todos con el prefijo "CAL-1A02: ").
- **CAL-1A03** → `calificar.test.ts`: "CAL-1A03: puntosVistos distintos de los puntos de la tarea es RUBRICA_MODIFICADA, con y sin rúbrica, antes que cualquier otro error"; "CAL-1A03: con rúbrica, una calificación directa no nula, un criterio de menos, de más o de otra tarea es RUBRICA_MODIFICADA"; "CAL-1A03: sin rúbrica, puntajes no vacíos o calificación nula es RUBRICA_MODIFICADA"; "CAL-1A03: un criterio por encima de su máximo es VALIDACION con la posición del cuerpo, no la de la rúbrica"; "CAL-1A03: una calificación directa mayor que los puntos de la tarea es VALIDACION en calificacion"; "CAL-1A03: la forma va antes que el rango (§D-2.2): un criterio de otra tarea fuera de rango es 409, no 400"; "CAL-1A03: los puntajes salen en el orden de la rúbrica aunque lleguen en otro, con la calificación escalada".
- **CAL-1A04** → `calificar.test.ts`: "CAL-1A04: entregado y calificado son calificables siempre; asignado solo vencida y en una tarea que no acepta tardías" (matriz 3 estados × 3 fechas × 2 `aceptaTardias`, regla (c′)).
- **CAL-1A05** → `backend/src/core/calificaciones/general.test.ts`: "CAL-1A05 (a): una categoría sin tareas calificadas no cuenta: pesoEfectivo y porcentaje nulos"; "CAL-1A05 (b): pesos redistribuidos: 40/40/20 con la de 20 vacía cuenta 50/50 y el general es el ponderado"; "CAL-1A05 (b): con 40/40/20 completas, los pesos efectivos son los mismos y pesan distinto"; "CAL-1A05 (c): tareas sin calificar no entran: una categoría con tareas sin calificar es una categoría sin tareas calificadas"; "CAL-1A05 (d): rúbrica parcial: agregados con centésimas (7.78 de 10 y 2.5 de 5)"; "CAL-1A05 (e): entregas tardías: el agregado no distingue el retraso y el resultado es el mismo (S-03)"; "CAL-1A05 (f): una clase sin categorías califica por puntos"; "CAL-1A05 (g): con categorías, las tareas «Sin categoría» no cuentan y sinCategoria las dice"; "CAL-1A05 (h): si nada cuenta, el porcentaje es null (con categorías y sin ellas)"; "CAL-1A05 (i): un categoriaId que no es de la clase es ERROR_INTERNO, con categorías y sin ellas"; "CAL-1A05 (j): se redondea al final, no se suman porcentajes ya redondeados"; "CAL-1A05 (j): los pesos efectivos de tres categorías iguales redondean cada uno a 33.33"; "CAL-1A05 (k): con P-05 (a), dentro de una categoría una tarea de 100 puntos pesa más que una de 10"; "CAL-1A05: varios agregados de la misma categoría se suman".
- **CAL-1A06** → `backend/src/core/calificaciones/riesgo.test.ts`: "CAL-1A06: los umbrales son 70 % y 3 vencidas"; "CAL-1A06: 69.99 está en riesgo por promedio; 70 no; sin porcentaje, tampoco"; "CAL-1A06: 2 vencidas sin entregar no están en riesgo; 3 sí"; "CAL-1A06: los dos motivos, en ese orden"; "CAL-1A06: la media ignora los nulos y se redondea a 2 decimales"; "CAL-1A06: sin ningún porcentaje es null".
- **CAL-1A07** → `calificar.test.ts`: "CAL-1A07: una rúbrica idéntica no se reemplaza, con y sin calificaciones (también si solo cambian los puntos sin calificaciones)"; "CAL-1A07: una rúbrica distinta sin calificaciones se reemplaza"; "CAL-1A07: con calificaciones, otros puntos, un criterio de más o de menos, otro texto, otro máximo u otro orden es TAREA_CON_CALIFICACIONES".
- **CAL-1A08** → `backend/test/esquemas-calificaciones.test.ts`: "CAL-1A08: es estricto y exige version, puntosDeLaTarea, puntajes y calificacion (que puede ser null)"; "CAL-1A08: version es un entero no negativo y puntosDeLaTarea un entero de 1 a 1000"; "CAL-1A08: los puntos negativos, NaN, Infinity, texto, con 3 decimales o de 1000.01 se rechazan; 0, 1000 y 2 decimales pasan"; "CAL-1A08: un criterioId repetido (también en mayúsculas) se rechaza y los ids pasan a minúsculas"; "CAL-1A08: más de 20 puntajes se rechazan"; "CAL-1A08: el comentario es opcional; vacío, solo invisibles o de 1001 caracteres se rechaza"; "CAL-1A08: 0.1 y 0.29 tienen hasta dos decimales; 1.005 y 7.785 no; NaN e Infinity tampoco"; "CAL-1A08: miEntregaSchema y entregaDeAlumnoSchema exigen calificacion (null o la calificación)".
- **CAL-1A09** → `backend/test/calificaciones.integracion.test.ts`: "CAL-1A09: PUT con rúbrica responde 200 con la calificación escalada y su desglose, sube la versión, guarda los puntajes, encola un CALIFICACION_PUBLICADA y no toca la fecha, el retraso ni los enlaces"; "CAL-1A09: con comentario, el comentario del maestro entra al hilo de esa entrega (lo ven el maestro y el alumno) y no se encola ningún COMENTARIO_CREADO".
- **CAL-1A10** → `calificaciones.integracion.test.ts`: "CAL-1A10: sin rúbrica, la calificación directa se guarda tal cual; recalificar reemplaza calificación y fecha, sube la versión otra vez y encola otro aviso con otro id"; "CAL-1A10: recalificar con rúbrica reemplaza los puntajes".
- **CAL-1A11** → `calificaciones.integracion.test.ts`: "CAL-1A11: con una versión vieja responde 409 ENTREGA_MODIFICADA sin escribir nada: entrega, puntajes, comentarios y trabajos iguales".
- **CAL-1A12** → `backend/test/calificaciones-concurrencia.integracion.test.ts`: (a) "CAL-1A12 (a): los dos maestros de la clase con la misma versión, con la fila de la entrega retenida: un 200 y un 409 ENTREGA_MODIFICADA, una sola calificación y un solo aviso"; (b) "CAL-1A12 (b): anular antes que calificar deja 409 ENTREGA_MODIFICADA; calificar antes que anular deja la anulación en 409 ENTREGA_CALIFICADA"; (c) "CAL-1A12 (c): anular y volver a entregar antes que calificar con la versión que vio el maestro deja 409 ENTREGA_MODIFICADA"; (d) "CAL-1A12 (d): editar la rúbrica (sin calificaciones) antes que calificar deja 409 RUBRICA_MODIFICADA; calificar antes deja la edición en 409 TAREA_CON_CALIFICACIONES", "CAL-1A12 (d, Enmienda 1, M-02): editar solo los puntos de una tarea sin rúbrica antes que calificar deja 409 RUBRICA_MODIFICADA y nada escrito", "CAL-1A12 (d, N-02): editar solo el título (rúbrica idéntica) antes que calificar deja la calificación en 200 y los criterios con sus ids"; (e) "CAL-1A12 (e): borrar antes que calificar deja 404 TAREA_NO_ENCONTRADA; calificar antes que el borrado del maestro lo deja en 409 TAREA_CON_ENTREGAS"; (f) sin caso propio: `respuestaDe` exige en cada operación de (a) a (e) un estado < 500 y un cuerpo sin `deadlock`, `P2003` ni `40P01`; (g) "CAL-1A12 (g): con la fila de la entrega retenida más que el timeout de la transacción, calificar rechaza con 503 SERVICIO_OCUPADO y no escribe ni encola nada".
- **CAL-1A13** → `calificaciones.integracion.test.ts`: "CAL-1A13: una asignada sin vencer, sin fila y con fila, responde 409 ENTREGA_NO_CALIFICABLE sin crear fila ni escribir"; "CAL-1A13: con (c′), una vencida en una tarea que acepta tardías responde 409 ENTREGA_NO_CALIFICABLE sin crear fila"; "CAL-1A13: sin fila, vencida en una tarea que no acepta tardías, responde 200 y deja la fila calificada sin fecha de entrega; después el alumno recibe 409 ENTREGA_CALIFICADA al entregar, anular y subir, y ve su calificación"; "CAL-1A13: una entregada y una calificada son calificables aunque la tarea no haya vencido".
- **CAL-1A14** → `calificaciones.integracion.test.ts`: "CAL-1A14: un criterio fuera de su rango y una calificación directa mayor que los puntos responden 400 con el prefijo del campo, sin escribir ni encolar"; "CAL-1A14: la forma que no corresponde y los puntos vistos distintos responden 409 RUBRICA_MODIFICADA, sin escribir ni encolar"; "CAL-1A14: un cuerpo con llaves de más, sin version o sin puntosDeLaTarea, con version negativa o decimal, o con puntajes repetidos responde 400 sin escribir ni encolar".
- **CAL-1A15** → `backend/test/calificaciones-lecturas.integracion.test.ts`: "CAL-1A15: con rúbrica, el alumno ve la calificación con el desglose en el orden de la rúbrica y sin version; el maestro y el admin, con version"; "CAL-1A15: sin rúbrica, la calificación directa trae puntajes []; sin calificar (con y sin fila), calificacion es null"; "CAL-1A15: una tarea de otra clase sigue siendo 404 TAREA_NO_ENCONTRADA en las dos lecturas".
- **CAL-1A16** → `backend/test/calificaciones-editar-tarea.integracion.test.ts`: "CAL-1A16: cambiar el título, las instrucciones, la fecha o el tema responde 200 y conserva los ids de los criterios y los puntajes"; "CAL-1A16: cambiar los puntos o la rúbrica responde 409 TAREA_CON_CALIFICACIONES sin escribir nada (tarea, publicación, criterios, puntajes, archivos, trabajo_id y trabajos)"; "CAL-1A16: el orden de errores de §D-4.4: una versión vieja con la rúbrica distinta responde 409 TAREA_MODIFICADA"; "CAL-1A16: una tarea sin calificaciones (también con una entrega entregada) se edita como hoy: la rúbrica distinta se reemplaza y la idéntica conserva sus ids (N-02)"; "CAL-1A16: mover de tema una tarea calificada sigue funcionando (no mira calificaciones)".
- **CAL-1A17** → `backend/test/calificaciones-autorizacion.integracion.test.ts`: "CAL-1A17: sin token 401; estudiante 403; admin 403 (S-01); ninguno escribe ni encola"; "CAL-1A17: un maestro ajeno y una clase inexistente responden igual, 403 SIN_ACCESO_A_LA_CLASE, sin escribir"; "CAL-1A17: un llamador restringido responde 403 ACCESO_RESTRINGIDO y uno con cambio de contraseña pendiente 403 CAMBIO_DE_CONTRASENA_REQUERIDO, sin escribir"; "CAL-1A17: una tarea de otra clase responde 404 TAREA_NO_ENCONTRADA, sin escribir en ninguna de las dos"; "CAL-1A17: un :alumnoId inexistente, de otra clase, dado de baja, desactivado o que es maestro responde 404 ALUMNO_NO_ENCONTRADO, sin crear fila ni encolar"; "CAL-1A17: el maestro de la clase califica a la alumna deudora y restringida (S-20), y el segundo maestro también"; "CAL-1A17: sin fuga: ninguna respuesta de este archivo (de éxito o de error, del maestro, del admin y de la alumna) contiene estadoPago, accesoRestringido, email, \"rol\", deudor ni @".
- **CAL-1A18** → `backend/test/calificaciones-estatico.test.ts`: "CAL-1A18: handlers/calificaciones.ts no compara relación ni rol, no toca Prisma ni SQL y solo encola COLA_CALIFICACION_PUBLICADA"; "CAL-1A18: el bloqueo compartido de la tarea (sin KEY) aparece una vez en adapters/db/entregas.ts, dentro de bloquearTareaParaCalificar, y lo usa calificarEntrega"; "CAL-1A18: adapters/db no importa adapters/queue"; "CAL-1A18: los esquemas nuevos de shared/ son z.strictObject"; "CAL-1A18 (N-01): ningún comentario de los archivos nuevos o cambiados de backend/src nombra las palabras de §D-0.9"; y en `esquemas-calificaciones.test.ts`, "CAL-1A18: calificacionDeEntregaSchema y puntajeDeCriterioSchema son estrictos".
- **CAL-1A19** → con puntajes por SQL (paso 3): `calificaciones-migracion.integracion.test.ts`, "CAL-1A19: el admin borra por la API, con ?confirmar=entregas, una tarea con rúbrica y puntajes (escritos por SQL): 204, sin 500 ni 23503, y no queda nada"; con calificaciones por la API (paso 7): `calificaciones.integracion.test.ts`, "CAL-1A19: el admin borra con ?confirmar=entregas una tarea con rúbrica, dos entregas calificadas por la API (con puntajes y un comentario de devolución), una entregada y archivos de entrega: 204 y no queda nada".
- **CAL-1A20** → `calificaciones-migracion.integracion.test.ts`: "CAL-1A20: borrar con SQL la clase de una tarea calificada con rúbrica no falla y no deja tareas, criterios, entregas ni puntajes de esa clase"; "CAL-1A20: la limpieza normal de las pruebas (borrarMovimientosYClasesDePrueba) con puntajes no falla".

CAL-1A01, CAL-1A19 (por SQL) y CAL-1A20 se corrieron y quedaron en verde en el paso 3, antes de seguir al paso 4 (`npx vitest run test/calificaciones-migracion.integracion.test.ts` → `Tests  13 passed (13)`, tras corregir solo la expresión del error esperado: Prisma reporta la violación diferida como `ForeignKeyConstraintViolation`).

### Archivos nuevos y cambiados, por capa
- **shared/**: `src/entregas.ts` (`puntajeDeCriterioSchema`, `calificacionDeEntregaSchema`, `calificacion` en `miEntregaSchema` y `entregaDeAlumnoSchema`, tipos); `src/calificaciones.ts` (nuevo: `tieneHastaDosDecimales`, `puntosDeCalificacionSchema`, `calificarEntregaSchema`, `CODIGOS_CALIFICACIONES`, tipos); `src/index.ts`.
- **backend/core/**: `calificaciones/calificar.ts`, `general.ts`, `riesgo.ts` (nuevos, con `calificar.test.ts`, `general.test.ts`, `riesgo.test.ts`); `eventos/avisos-de-clase.ts` (`COLA_CALIFICACION_PUBLICADA`, `datosCalificacionPublicadaSchema`).
- **backend/prisma/**: `schema.prisma` (`Entrega.calificacion`, `fechaCalificacion`, `puntajes`; `CriterioRubrica.puntajes`; `model PuntajeRubrica`); `migrations/20261013135122_calificaciones/migration.sql` (nueva).
- **backend/adapters/**: `db/entregas.ts` (`CalificacionDb`, `PuntajeDeCriterioDb`, `calificacionDe`, la calificación en las dos lecturas, `bloquearTareaParaCalificar`, `calificarEntrega`); `db/tareas.ts` (solo `editarTarea`, §D-4 con N-02); `db/index.ts`; `queue/colas.ts`; `README.md`.
- **backend/handlers/**: `calificaciones.ts` y `respuestas-de-entrega.ts` (nuevos); `tareas/entregas.ts` (importa `miEntregaParaResponder` y `entregaDeAlumnoParaResponder`; `GET …/entregas/:alumnoId` usa la segunda); `app.ts` (registra `calificacionesHandler` después de `hiloPrivadoHandler`); `README.md`.
- **backend/test/** (nuevos): `ayudas-calificaciones.ts`, `esquemas-calificaciones.test.ts`, `calificaciones-migracion.integracion.test.ts`, `calificaciones-lecturas.integracion.test.ts`, `calificaciones.integracion.test.ts`, `calificaciones-concurrencia.integracion.test.ts`, `calificaciones-autorizacion.integracion.test.ts`, `calificaciones-editar-tarea.integracion.test.ts`, `calificaciones-estatico.test.ts`.
- **A-3**: `backend/test/ayudas-entregas.ts`, solo `crearEntregaDePrueba` (parámetro opcional `calificacion`, por defecto 1; escribe `calificacion` y `fecha_calificacion` solo en `calificado`).
- **Pruebas normales de la lista cerrada de 01a, con el cambio descrito y nada más:**
  - `backend/test/esquemas-entregas.test.ts`, "PR-1B04: la respuesta vuelve a exigir http o https…": `base` suma `calificacion: null`.
  - `backend/test/entregas.integracion.test.ts`: los dos `toEqual` de la entrega del alumno (`:226-235` y `:581-591`) suman `calificacion: null`.
  - `frontend/src/features/tareas/entregas-01d.test.tsx`: `entregaAsignada` y `entregaRealizada` suman `calificacion: null`.
  - `frontend/src/features/tareas/entregas-01e.test.tsx`: `entregaDeAlumno` y los dos dobles de `MiEntrega` en línea suman `calificacion: null` (el "doble de `EntregaDeAlumno` en línea cerca de `:496-504`" es una llamada a `entregaDeAlumno(...)`, que hereda el campo del constructor: no necesitó cambio propio).
  - `frontend/src/features/tareas/detalle-tarea-view.test.tsx`: `MI_ENTREGA` suma `calificacion: null`.
  - `frontend/src/app/router-01e.test.tsx`: el doble de `EntregaDeAlumno` suma `calificacion: null`.
- Ninguna `*.ataque` tocada. V-01: `sha256sum` de las 175 `*.ataque` (`git ls-files -co --exclude-standard | grep '\.ataque\.test\.tsx\?$'`) contra la tabla al final de la ronda 0 de 01a: 175 de 175 iguales.

### "No se toca"
`git diff --stat d998282 -- AGENTS.md CLAUDE.md 'docs/ARCHITECTURE*.md' docs/PRD.md .claude/agents infra backend/.env.example frontend/.env.example package.json package-lock.json shared/package.json backend/package.json frontend/package.json backend/src/middleware backend/src/adapters/auth backend/src/adapters/notifier backend/src/adapters/storage backend/src/adapters/live backend/src/config backend/src/workers backend/src/worker.ts backend/src/server.ts backend/src/adapters/db/cliente.ts backend/src/adapters/db/errores.ts backend/src/adapters/db/referencias.ts backend/src/adapters/db/bloqueo-clase.ts backend/src/adapters/db/inscripciones.ts backend/src/adapters/db/publicaciones.ts backend/src/adapters/db/archivos.ts backend/src/adapters/db/temas.ts backend/src/adapters/db/categorias.ts backend/src/core/autoria.ts backend/src/core/concurrencia.ts backend/src/core/entregas backend/src/core/tareas backend/src/core/clases backend/src/handlers/clases backend/src/handlers/tareas/categorias.ts backend/src/handlers/tareas/hilo-privado.ts backend/src/handlers/tareas/tareas.ts backend/src/handlers/tareas/temas.ts backend/src/handlers/adjuntos.ts backend/src/handlers/validacion.ts backend/src/handlers/errores.ts backend/test/setup.ts backend/test/global-setup.ts backend/test/ayudas-auth.ts backend/test/ayudas-clases.ts backend/test/ayudas-concurrencia.ts backend/test/ayudas-cuentas.ts backend/test/ayudas-tareas.ts backend/test/almacen-en-memoria.ts backend/test/notifier-en-memoria.ts backend/test/entorno-de-pruebas.ts backend/test/preparar-cola.ts frontend/src/services frontend/src/app/providers.tsx frontend/src/styles frontend/src/components frontend/src/lib frontend/vitest.config.ts frontend/src/features/auth frontend/src/features/admin frontend/src/features/diagnostico frontend/src/features/clases` → salida vacía. En `frontend/src/features/tareas` solo cambiaron archivos de prueba (`git diff --name-only d998282 -- frontend/src/features/tareas | grep -v '\.test\.tsx\?$'` → vacío).

### Migración y R-14 / PA-06
- `npx prisma migrate status` antes: `Database schema is up to date!` (13 migraciones, `campus_dev` en `127.0.0.1:5433`).
- `npx prisma validate` y `npx prisma format` sobre el esquema nuevo; `npx prisma migrate dev --create-only --name calificaciones` (carpeta `20261013135122_calificaciones`, con exactamente las sentencias de Prisma de §D-1); a mano: la FK de `criterio_id` reemplazada por la diferida con el mismo nombre y los `CHECK` al final; después `npx prisma migrate dev` → `Applying migration 20261013135122_calificaciones … Your database is now in sync with your schema.` y `npx prisma generate`.
- `npx prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --exit-code` → código 0, `No difference detected.`
- Segundo `npx prisma migrate dev` → `Already in sync, no schema change or pending migration was found.`
- **R-14 / PA-06 no ocurrió:** Prisma no propuso recrear la FK diferida; queda `NO ACTION DEFERRABLE INITIALLY DEFERRED` (no se aplicó `CASCADE`).

### Grep de §D-0.9 (paso 8 bis)
```
P='COMENTARIO_CREADO|AVISO_FALLIDO|PUBLICACION_CREADA|MATERIAL_CREADO|colaDePublicacion|enTransaccion|instantaneaUnica|isolationLevel|REPEATABLE READ|RepeatableRead|Serializable|DELETE FROM|TRUNCATE'
git diff -U0 d998282 -- 'backend/src/*.ts' | grep -E '^\+' | grep -vE '^\+\+\+' | grep -E '^\+\s*(//|/\*|\*)' | grep -E "$P"
for f in $(git ls-files -o --exclude-standard backend/src | grep '\.ts$' | grep -v '\.test\.ts$'); do grep -nE '^\s*(//|/\*|\*)' "$f" | grep -E "$P"; done
```
Salida: vacía en los dos. (La lista se aplicó entera en todos los archivos, sin la excepción de `adapters/db` para `enTransaccion` e `instantaneaUnica`.) Nota: `adapters/queue/colas.ts:60` conserva un comentario anterior a este encargo que nombra la cola de fallidos; no lo escribí ni lo cambié (`colas.ts` está en la lista que admite `muro-c-r1.ataque`), y CAL-1A18 (N-01) lo deja fuera con ese motivo.

### Decisiones de implementación fuera de lo literal del plan (para que el manager las juzgue)
1. **Migración en dos invocaciones** (`migrate dev --create-only` y después `migrate dev`), con el precedente de AUTH-01: los `CHECK` y la FK diferida se escribieron antes de aplicar, para no editar una migración ya aplicada (eso sí habría hecho que `migrate dev` pidiera un `reset`).
2. **`exigirEntregaCalificable`** usa `esTarde` de `core/entregas` con `!aceptaTardias`, que es exactamente el cuerpo de `entregaCerrada`: `entregaCerrada` pide `TareaParaEntregar`, con `requiereAdjuntos`, y la firma de §D-2.1 recibe solo `{ fechaLimite, aceptaTardias }` (`core/entregas/` no se toca). CAL-1A04 recorre la matriz completa.
3. **`editarTarea` lee los criterios siempre** (§D-4.2 con N-02), aunque la tabla de "Acceso a datos" dice "solo con calificadas": lo exige que la rúbrica idéntica nunca se reemplace.
4. El esquema del puntaje enviado (`puntajeEnviadoSchema`) queda interno de `shared/src/calificaciones.ts` (no exportado): el plan no lo nombra.
5. `ayudas-calificaciones.ts` es una ayuda nueva en un archivo nuevo ("se pueden sumar ayudas nuevas en archivos nuevos").

### Hermanos y estados vecinos
No hubo hallazgos que corregir (es la implementación). Para el único remedio con hermanos, A-3 (`crearEntregaDePrueba` escribe la calificación en `calificado`): los otros caminos que fabrican filas `calificado` con SQL propio son C-2 (`entregas-01b-r1.ataque:650`, ya reescrita por el tester), `migracion-01a-r1.ataque` (esquema aparte sin la migración nueva: no aplica) y `entregas-migracion.integracion` (no inserta `calificado`: no aplica). Las filas `calificado` fabricadas con `crearEntregaDePrueba` en las pruebas revisadas del plan pasan sin cambio (la suite completa en verde). Estados vecinos de la fila perezosa al calificar: sin fila y no calificable (se revierte, CAL-1A13), sin fila y calificable (nace y queda calificada, CAL-1A13), con fila `asignado` (CAL-1A13), con fila y versión vieja (CAL-1A11), con fila retenida (CAL-1A12 a, b, c, g).

### Matriz de avisos y recargas
No aplica a 01a (no hay interfaz).

### Pendiente o fuera de alcance detectado
- Para el orquestador (A-6, al cerrar 01a): los textos de "Documentos a actualizar" y N-12 (mencionar `puntosDeLaTarea` en "Edición concurrente" de ESSENTIALS y en `ARCHITECTURE.md` §7); S-15 en `docs/ESTADO.md` §3.
- Observación: un comentario anterior de `adapters/queue/colas.ts:60` nombra la cola de fallidos (ver el grep); fuera de alcance.
- La comprobación de la migración sobre una base con datos de ENTREGAS-01 que el tester reservó para su ronda 1 también la cubre CAL-1A01 (esquema aparte); además se aplicó sin error sobre `campus_dev`.

## 01a — corrección de la ronda 1 (T-01)

### T-01 — corregido
Remedio del orquestador (dentro de A-2): "entregó" es tener `fecha_entrega`. Diff resumido, solo en `backend/src/adapters/db/entregas.ts`:
- Se elimina `ESTADOS_ENTREGADOS` (`["entregado", "calificado"]`, con el comentario "Las que cuentan como entregas (S-06 y RF-35)"): quedó sin uso.
- En `listarEntregasCon`, el `count` de `entregadas` cambia `estado: { in: ESTADOS_ENTREGADOS }` por `fechaEntrega: { not: null }`, con un comentario del porqué (con P-03 (c′) una calificada puede no tener fecha; por los `CHECK` solo `entregado` y `calificado` la tienen). Sigue filtrando por `tareaId` (prefijo del único `(tarea_id, alumno_id)`) y por alumnado activo e inscrito, como antes.
- Nada más cambia en producción. `ESTADOS_QUE_CUENTAN` de `adapters/db/tareas.ts` no se toca (decisión del plan).

### Prueba nueva
- `backend/test/calificaciones-lecturas.integracion.test.ts`, describe "quiénes entregaron en la lista de entregas (CAL-1A15b)", caso "CAL-1A15b: en la lista de entregas, entregadas cuenta la entregada y la calificada con fecha de entrega, y no la calificada sin entrega". Cuatro alumnas: una `entregado`, una `calificado` con fecha, una `calificado` sin `fecha_entrega` (SQL parametrizado) y una sin fila → `total: 4`, `entregadas: 2`; la fila sin entrega viene `calificado` con `fechaEntrega: null`, y la calificada con fecha, con fecha.
- Pruebas normales cambiadas: ninguna. Las que ya prueban `entregadas` (`entregas.integracion.test.ts` "PR-1B19: cada fila con su estado (asignado sin fila, entregado, con retraso, calificado), total y entregadas sin contar a quien salió de la clase ni a un desactivado; las filas traen exactamente las llaves del esquema" y `entregas-lecturas.integracion.test.ts:165-176`) fabrican la calificada con `crearEntregaDePrueba`, que le pone fecha de entrega, y siguen en verde sin cambio.
- `*.ataque`: ninguna tocada. CAL-T-01 pasa a verde sin modificarla.

### Verificación (de uno en uno, en `backend/`)
| Comando | Código | Última línea |
|---|---|---|
| `npx vitest run test/calificaciones-lecturas.integracion.test.ts test/calificaciones-01a-r1.ataque.test.ts` | 0 | `Tests  19 passed (19)` |
| `npm run lint` | 0 | `> tsc -p tsconfig.json --noEmit && tsc -p tsconfig.test.json` |
| `npm run test` | 0 | `Duration  170.01s (…)`; resumen: `Test Files  206 passed (206)` · `Tests  2546 passed (2546)` |
| `npm run build` | 0 | `> tsc -p tsconfig.json` |

- `prisma validate`: n/a (sin cambio de esquema). `shared/` y `frontend/` no se tocaron: sin corrida.
- Formateador: `npx prettier --write test/calificaciones-lecturas.integracion.test.ts src/adapters/db/entregas.ts`, desde `backend/`.
- Inventarios de la corrida completa (`grep -o … | wc -l` sobre su salida): `"Error no controlado"` 10, `"code":"P2028"` 5, `40P01` 0. Iguales a los de la ronda 1.

### Conteos
- `cd backend; npx vitest list | wc -l` → 2546 (2545 de la ronda 1 + CAL-1A15b).
- `cd backend; npx vitest list --filesOnly | wc -l` → 206 (sin archivos nuevos).
- `cd backend; npx vitest list test/calificaciones-lecturas.integracion.test.ts` → 4 casos (3 de CAL-1A15 + CAL-1A15b).

### "No se toca"
`git diff --stat d998282 -- <todas las rutas de "No se toca" del plan, salvo handlers/tareas>` → vacío. `git diff --stat d998282 -- backend/src/handlers/tareas` → solo `entregas.ts` (la importación de A-2, de la implementación de 01a; esta corrección no lo toca). Esta corrección solo cambió `backend/src/adapters/db/entregas.ts` y `backend/test/calificaciones-lecturas.integracion.test.ts`.

### Hermanos y estados vecinos ("entregado o calificado" usado como "entregó")
Grep: `"entregado", "calificado"`, `estado (===|!==) "calificado"`, `=== "asignado"`, `!== "asignado"`, `ESTADOS_QUE_CUENTAN`, `Entregó`, `Entregaron` en `backend/src`, `shared/src` y `frontend/src` (sin pruebas).
1. **`listarEntregasCon`, `entregadas`** (`adapters/db/entregas.ts`): el hallazgo. Aplicado.
2. **Las filas de esa misma lista** (`estado` y `fechaEntrega` por alumno): ya traen `calificado` con `fechaEntrega: null` (CAL-T-01 y CAL-1A15b lo fijan). No aplica.
3. **`borrarTarea`, `ESTADOS_QUE_CUENTAN`** (`adapters/db/tareas.ts:529`): cuenta `entregado` y `calificado` (también la calificada sin entrega), por decisión del plan (§D-3 carreras (e), CAL-1A12 (e)). No cambia. Su texto de `409 TAREA_CON_ENTREGAS` ("Esta tarea tiene N entregas…", armado en `core/tareas/tareas.ts` junto a la línea 55) contaría como "entrega" una calificada sin entrega: es O-r1-2, lo juzga el manager. No cambiado.
4. **`core/tareas/tareas.ts:60`** (comentario "Una tarea con entregas (entregado o calificado)…" de `exigirBorradoConEntregasPermitido`): describe la misma regla del borrado y recibe un número; `core/tareas/` es "No se toca". No aplica.
5. **`core/entregas/entregas.ts:66-67, 101-102, 119-120`** (entregar, anular, `puedeEntregar` y `puedeAnular`): deciden por estado, no por "entregó"; una calificada (con o sin fecha) da `ENTREGA_CALIFICADA` y no se entrega ni se anula, como pide §D-3. No aplica.
6. **`core/calificaciones/calificar.ts:174`** (`exigirEntregaCalificable`): `asignado` solo con la entrega cerrada (c′). No es "entregó". No aplica.
7. **Lecturas de una entrega** (`leerMiEntregaCon`, `leerEntregaDeAlumnoCon`, `calificacionDe`): devuelven `fechaEntrega` tal cual (null en la calificada sin entrega). No aplica.
8. **Frontend, `lib/estado-de-entrega.ts:31`** (`estadoDeEntregaVisible`): una `calificado` es "Calificado" con o sin fecha. Lo usan la fila de "Trabajo de clase" del alumno (`features/clases/lib.ts:498`) y `EstadoEntregaBadge`: la calificada sin entrega se verá "Calificado", no "Sin entregar". Es de 01c y 01d (§D-12; §D-13, `textoDeCelda` usa esta función) y `lib/` es "No se toca"; no lo cambié. Queda para 01c y el manager.
9. **Frontend, "Tu trabajo"** (`features/tareas/components/tu-trabajo.tsx:71` y `entrega-realizada.tsx:88`): una calificada sin entrega no es `asignado` ni `puedeEntregar`, así que hoy cae en `EntregaRealizada` (la vista de la entrega, sin archivos ni enlaces). CAL-1C09 pide "No entregaste esta tarea y ya está calificada.": lo aplica 01c (§D-12). No cambiado.
10. **Frontend, "Entregaron N de M alumnos."** (`features/tareas/data.ts:240-241`, `conteoDeEntregas` de `features/tareas/lib.ts:453`): pinta `entregadas` del servidor; con el remedio dice la verdad sin cambio en el frontend. Aplica por el servidor; nada que cambiar.
11. **Frontend, "Entregó el …" y "Todavía no entrega."** (`fraseDeEntregaDeAlumno`, `features/tareas/lib.ts:437-450`): decide por `fechaEntrega === null`, no por estado; la calificada sin entrega dice "Todavía no entrega.". Ya correcto. No aplica.
12. **01b, gradebook** (§D-6.6, "vencidas sin entregar"): según la cabecera (RN-05) y §D-7, cuenta las vencidas sin entrega `entregado` ni `calificado`, así que una calificada sin entrega no sería "vencida sin entregar" para el riesgo; el plan lo pone como punto de ataque de 01b ("una tarea calificada sin entrega contada como vencida sin entregar"). La celda de una calificada sin entrega muestra la calificación (CAL-1B01). Para 01b y el manager; no es de 01a.
13. **01b, "Mis calificaciones"** (§D-7.2): el filtro `entregadas` usa solo `estado: "entregado"` (la calificada, con o sin fecha, va a `calificadas`); `asignadas` y `sin-entregar` usan `none` de `entregado` o `calificado`, así que la calificada sin entrega no aparece en "Sin entregar". Para 01b y el manager; no es de 01a.
14. **`shared/`**: `estadoEntregaSchema` solo enumera estados; ningún esquema deriva "entregó" del estado. No aplica.

No encontré otros.

Estados vecinos del conteo: sin fila (no cuenta), `asignado` con fila (no cuenta), `entregado` a tiempo y con retraso (cuentan), `calificado` con fecha (cuenta), `calificado` sin fecha (no cuenta), alumno dado de baja o desactivado (no cuenta, filtro sin cambio), recalificar (no cambia `fecha_entrega`: el conteo no cambia), tarea reabierta tras calificar sin entrega (CAL-T-09: sigue sin fecha, no cuenta). Todos quedan con la misma condición.

## 01a — corrección de la revisión final (M-05, N-13, N-16)

Sin código de producción: solo pruebas normales de 01a y `backend/src/adapters/README.md`. Ninguna `*.ataque` tocada (M-04 es del tester). Prettier se corrió solo sobre los cuatro archivos cambiados (`npx prettier --write <4 rutas>` desde `backend/`).

### Diff resumido por archivo
- **`backend/test/calificaciones-autorizacion.integracion.test.ts` (M-05).** Desaparece el arreglo de módulo `respuestas` y el `push` del `pedir`. Nuevas: `CLAVES_DE_FUGA` (la misma regex de antes) y `sinFuga(respuesta)`, que hace `expect(body).not.toMatch(...)`. `pedir` llama a `sinFuga` en cada respuesta, así que cada caso comprueba la fuga de lo que él mismo produce. El caso "sin fuga" conserva su título y su lista de claves, pero ya no lee el estado acumulado: crea su propio escenario (alumna deudora y restringida con entrega) y produce 8 respuestas propias, cada una con su código esperado (PUT sin token 401, alumna 403, admin 403, maestro 200, segundo maestro con versión vieja 409, GET del maestro 200, GET del admin 200, GET de la alumna 403). Asserta los 8 códigos (no puede pasar en vacío) y pasa cada respuesta por `sinFuga`. Cambia 1 caso de 7; los otros 6 no cambian de texto, pero ahora cada respuesta suya pasa por `sinFuga`.
- **`backend/test/calificaciones-migracion.integracion.test.ts` (hermano de M-05).** El caso "una entrega asignada de antes puede pasar a calificada sin fecha de entrega" dejaba `ids.asignada` en `calificado`, y el caso "la migración aplica sobre entregas asignadas…" del mismo `describe` exige que siga `asignado`, así que dependía del orden. Ahora el `UPDATE` corre dentro de `enElEsquema` y lanza `Revertir(actualizadas)`: la transacción se revierte, se asserta `actualizadas === 1` y después que la fila sigue `asignado`. Se agrega la clase `Revertir` (solo de prueba). Cambia 1 caso de 13.
- **`backend/test/calificaciones-estatico.test.ts` (N-13).** `adapters/queue/colas.ts` vuelve a la lista de CAL-1A18 (N-01), con la constante `SIN_NOMBRES_DE_COLA`. Solo para ese archivo se omite la primera categoría (los nombres de cola). Las otras cuatro (`DELETE FROM|TRUNCATE`, aislamiento, `instantaneaUnica: true` y `enTransaccion|instantaneaUnica|isolationLevel`, porque no está en `adapters/db/`) sí se revisan. El comentario explica por qué. Ningún caso nuevo.
- **`backend/src/adapters/README.md` (N-16).** En la tabla de calificar, «la FK toma `FOR KEY SHARE` de los criterios» pasa a «la FK diferida comprueba los criterios, y toma su `FOR KEY SHARE`, al confirmar, no al insertar». Al párrafo de la FK diferida se agrega: la comprobación de `criterio_id` y su `FOR KEY SHARE` corren al confirmar, no al insertar ni al borrar, y tampoco ahí hay ciclo, porque quien borra criterios espera antes en la fila de `tareas`, que calificar retiene `FOR SHARE` hasta confirmar. Prettier realineó la tabla. El comentario de la migración (`migration.sql:22-25`) y el de `schema.prisma:454-459` ya decían «corre al confirmar», así que no se tocan (además, cambiar la migración cambiaría su checksum). `entregas.ts` no describe esa comprobación.

Grep de N-13, con el que confirmo que `colas.ts` pasa hoy las categorías 2 a 5 (en todo el archivo, no solo en los comentarios, y sin distinguir mayúsculas):
`grep -niE "DELETE\s+FROM|TRUNCATE|REPEATABLE READ|RepeatableRead|Serializable|instantaneaUnica|enTransaccion|isolationLevel" src/adapters/queue/colas.ts` → sin salida, `exit=1`. La categoría 1 sí aparece (`colas.ts:60`, «AVISO_FALLIDO va antes…»), y por eso queda omitida.

### Hermanos de M-05: estado acumulado entre casos, archivo por archivo
Busqué acumuladores de módulo (`.push` y `let`/`const` de módulo que no sean constantes), fixtures compartidos en `beforeAll` y casos que escriben sobre datos que otro caso lee. Además corrí cada archivo con `--sequence.shuffle`.
1. `calificaciones-autorizacion.integracion`: **corregido** (arriba). Corridas: sola `Tests  7 passed (7)`; `-t "sin fuga"` `Tests  1 passed | 6 skipped (7)` (antes fallaba con `expected 0 to be ≥ 18`); `--sequence.shuffle --sequence.seed=1` y `=3` `Tests  7 passed (7)`, y en las dos "sin fuga" corre en 2.º lugar (lo comprobé con `--reporter=verbose`); seed 7 también `7 passed (7)`.
2. `calificaciones-migracion.integracion`: **había uno y está corregido** (arriba). Los demás `describe` crean su escenario por caso; `ids` y `ESQUEMA` son constantes del fixture del `beforeAll` y solo el caso corregido escribía en él. Los `push` de `:318` y `:336` son locales de `conPuntajes`. Corridas: sola, seed 1 y seed 3 `Tests  13 passed (13)`; `-t "puede pasar a calificada"` `Tests  1 passed | 12 skipped (13)`.
3. `calificaciones.integracion`: **no aplica**. El `beforeAll` solo construye la app, cada caso crea su escenario y el `push` de `:528` es local del caso.
4. `calificaciones-concurrencia.integracion`: **no aplica**. El `beforeAll` solo construye la app, sin acumuladores y con escenario por caso.
5. `calificaciones-lecturas.integracion`: **no aplica**. El `beforeAll` solo construye la app; las constantes `LLAVES_*` son literales y el escenario va por caso.
6. `calificaciones-editar-tarea.integracion`: **no aplica**. El `beforeAll` solo construye la app, con escenario por caso.
Los archivos 3 a 6 corridos juntos con `--sequence.shuffle --sequence.seed=1` y `=3`: `Test Files  4 passed (4)` · `Tests  30 passed (30)` en las dos.

Estados vecinos del mecanismo ("una prueba depende de otra"): orden normal, orden aleatorio (dos semillas), caso aislado con `-t` (el resto saltado), archivo solo y dentro de la suite completa. Los dos archivos corregidos dan el mismo resultado en los cinco. Un archivo partido equivale al caso aislado.

### Verificación (desde `backend/`, una corrida a la vez, Docker Desktop encendido)
- `npm run lint`: exit 0. Última línea: `> tsc -p tsconfig.json --noEmit && tsc -p tsconfig.test.json`.
- `npm run test`: exit 0. `Test Files  207 passed (207)` · `Tests  2553 passed (2553)` · última línea con texto `Duration  132.40s (transform 13.43s, setup 5.89s, import 227.33s, tests 1055.19s, environment 50ms)`. Inventarios con `grep -c` sobre la salida: `"Error no controlado"` 10, `"code":"P2028"` 5, `40P01` 0.
- `npm run build`: exit 0. Última línea: `> tsc -p tsconfig.json`.
- `npx vitest run test/calificaciones-autorizacion.integracion.test.ts`: `Tests  7 passed (7)`. Con `--sequence.shuffle --sequence.seed=1`: `Tests  7 passed (7)`. Con `--sequence.seed=3`: `Tests  7 passed (7)`. El flag de semilla existe en esta versión.
- `prisma validate`: n/a (no toqué el esquema).

### Conteos
- `npx vitest list | grep -c ""` → 2553 casos. `npx vitest list --filesOnly | grep -c ""` → 207 archivos. Sin cambio frente a la ronda 2: ningún caso nuevo ni borrado.
- `npx vitest list test/calificaciones-autorizacion.integracion.test.ts | grep -c ""` → 7 casos; cambia 1 (el "sin fuga").
- En `calificaciones-migracion.integracion` cambia 1 caso de 13; en `calificaciones-estatico`, 1 de 5 (el de N-01), solo en su lista y en sus categorías.

### "No se toca"
`git diff --stat d998282 -- <toda la lista del plan: AGENTS.md, CLAUDE.md, docs/ARCHITECTURE*.md, docs/PRD.md, .claude/agents, infra, los .env.example, los package.json y package-lock.json, middleware, adapters/auth, notifier, storage, live, config, workers, worker.ts, server.ts, los adapters/db listados, core/autoria.ts, core/concurrencia.ts, core/entregas, core/tareas, core/clases, handlers/clases, handlers/adjuntos.ts, validacion.ts, errores.ts, test/setup.ts, test/global-setup.ts, y en frontend services, providers.tsx, styles, components/ui, layout, adjuntos, lib, vitest.config.ts, features/auth, admin y diagnostico>` → **vacío**. En `handlers/tareas/` solo cambia `entregas.ts` (A-2, de la implementación de 01a; no lo toqué en esta vuelta). No toqué ninguna `*.ataque` ni ayuda compartida.

## 01b — implementación

Plan: `docs/trabajo/CALIFICACIONES-01-calificaciones-y-gradebook/plan.md` (LISTO; P-03 en (c′), S-01, S-04 como está). Base de "No se toca": `<K1a>` = `216c1b599e1e63e77ad01f1283f504478eb64796` dentro de los paquetes y `<R>` = `d998282` fuera. Pasos completados: paso 0 y 4 de 4. Ninguna PARADA. Ninguna `*.ataque` tocada (V-01: 179 de 179 iguales a la tabla "al cierre de la ronda 0 de 01b", `sha256sum` sobre `git ls-files -co --exclude-standard | grep -E '\.ataque\.test\.tsx?$'`, `diff` vacío).

### Paso 0 (N-14 y N-15/N-20), cambio mínimo
- `backend/src/core/calificaciones/calificar.ts`: una privada nueva `formaInalcanzable()` = `AppError("ERROR_INTERNO", "La calificación no corresponde a la rúbrica de la tarea.", 500)`, que reemplaza los tres valores inventados de `decidirCalificacion`: `calificacionDirecta ?? Number.NaN` → `if (calificacionDirecta === null) throw formaInalcanzable()`; `maximoDe.get(...) ?? 0` → `if (maximo === undefined) throw formaInalcanzable()`; `puntosDe.get(...) ?? 0` → el `map` lanza si es `undefined`. Las tres son inalcanzables después de `formaCorresponde`.
- `backend/src/adapters/db/entregas.ts`, `calificacionDe`: el `if` anidado pasa a `const conCalificacion = …`, `if (no calificado && conCalificacion) throw errorEntregaMalFormada()`, `if (no calificado) return null`. Misma lógica.
- Pruebas de 01a: ninguna cambió. `npx vitest run src/core/calificaciones test/calificaciones-estatico.test.ts test/calificaciones-lecturas-estatico.test.ts test/lecturas-fx-r1.ataque.test.ts test/bloqueo-usuario.integracion.test.ts test/sesiones-y-cadena.ataque.test.ts` → `Tests  129 passed (129)` (8 archivos), y la suite completa en verde (abajo).

### Pruebas requeridas → archivo y título exacto
- **CAL-1B01** → `backend/test/gradebook.integracion.test.ts`: «CAL-1B01: columnas en orden (fecha_limite DESC, id DESC), celdas en el orden de las columnas, porcentaje por categorías, vencidas, motivos y el resumen de toda la clase sin dados de baja ni desactivados»; «CAL-1B01: el resumen y los datos de cada fila no dependen de la página que se pide»; «CAL-1B01: una clase sin categorías califica por puntos (modo puntos) y la tarea vencida hace una hora cuenta como vencida sin entregar». La calificada sin entrega es `calificado`, `conRetraso: false`, con su calificación, y no cuenta como vencida sin entregar (Ana: 0 vencidas).
- **CAL-1B02** → mismo archivo: «CAL-1B02: las filas siguen el cursor del roster y un cursor inexistente responde 400»; «CAL-1B02: las ventanas de tareas resuelven los empates de fecha límite por id sin repetir ni saltar tareas; un cursorTareas de otra clase o inexistente responde 400»; «CAL-1B02: límites fuera de rango o que no son números responden 400 (filas de 1 a 50, tareas de 1 a 50)».
- **CAL-1B03** → `backend/test/calificaciones-lecturas-consistentes.integracion.test.ts`: «CAL-1B03: gradebook con la tarea de cursorTareas borrada entre su comprobación y la ventana devuelve las tareas que siguen»; «CAL-1B03: gradebook con el alumno del cursor borrado entre su comprobación y la página devuelve los alumnos que siguen»; «CAL-1B03: «Mis calificaciones» con la tarea del cursor borrada entre su comprobación y la página devuelve las tareas que siguen»; «CAL-1B03: una calificación que llega después de leer las celdas no cambia el porcentaje, el riesgo ni el resumen de esa misma respuesta»; «CAL-1B03: en «Mis calificaciones», una calificación que llega después de leer las entregas no cambia la calificación general de esa respuesta».
- **CAL-1B04** → mismo archivo: «CAL-1B04: leerGradebook y leerMisCalificaciones hacen las mismas sentencias con 2 y con 30 alumnos y con 2 y con 30 tareas» (cuatro tamaños: 2×2, 30×2, 2×30 y 30×30; la lista exacta de llamadas: 7 del gradebook, 9 con los dos cursores, 4 de "Mis calificaciones").
- **CAL-1B05** → `backend/test/mis-calificaciones.integracion.test.ts`: «CAL-1B05: general es el cálculo de core/ sobre lo calificado de la alumna (con la calificada sin entrega y sin lo del compañero)»; «CAL-1B05: los cinco filtros, con tareas vencidas y por vencer, entregadas a tiempo y con retraso, y calificadas con y sin entrega»; «CAL-1B05: el cursor recorre cada filtro sin repetir ni saltar, sirve aunque su tarea no pase el filtro, y uno de otra clase o inexistente responde 400»; «CAL-1B05: límites (1 a 100) y filtros desconocidos responden 400»; «CAL-1B05: el compañero ve solo lo suyo: sus calificaciones y su general, nunca las de la alumna». Cada respuesta se comprueba sin `version`.
- **CAL-1B06** → `backend/test/calificaciones-lecturas-autorizacion.integracion.test.ts`: «CAL-1B06: gradebook: sin token 401, estudiante 403, maestro ajeno y clase inexistente 403 SIN_ACCESO_A_LA_CLASE, cambio pendiente 403, maestro y admin 200, todo sin fuga»; «CAL-1B06: «Mis calificaciones»: sin token 401, maestro y admin 403 (rol), no inscrito 403 SIN_ACCESO_A_LA_CLASE, restringido 403 ACCESO_RESTRINGIDO, cambio pendiente 403; el inscrito 200, todo sin fuga».
- **CAL-1B07** → `backend/test/gradebook.integracion.test.ts`: «CAL-1B07: el porcentaje de cada alumno en «Mis calificaciones» es el de su fila del gradebook».
- **CAL-1B08** → `backend/test/calificaciones-lecturas-estatico.test.ts`: «CAL-1B08: adapters/db/calificaciones.ts no escribe ni bloquea filas (ni create, update, delete, upsert ni SQL de escritura)»; «CAL-1B08: su SQL es etiquetado y sin Unsafe (tres consultas: los dos agregados y las vencidas), y no hay consultas dentro de ciclos»; «CAL-1B08: nombra «instantaneaUnica: true» exactamente 2 veces, en código (leerGradebook y leerMisCalificaciones)»; «CAL-1B08: handlers/calificaciones.ts registra las dos lecturas con su cadena exacta»; «CAL-1B08: las respuestas nuevas de shared/ son z.strictObject»; «CAL-1B08 (§D-0.9): ningún comentario de los archivos nuevos o cambiados de backend/src en 01b nombra las palabras que leen en crudo las listas estáticas».
- **C-1** (`sesiones-y-cadena.ataque`) y **C-4** (`lecturas-fx-r1.ataque`) pasan a verde (en la corrida completa).

### Conteos
- Backend: `npx vitest list --json` (longitud del arreglo) → 2579 casos; `npx vitest list | grep -c ""` → 2579; `npx vitest list --filesOnly | grep -c ""` → 212 archivos. Antes (cierre de 01a y ronda 0 de 01b): 2553 en 207. **+26 casos en 5 archivos nuevos** (`npx vitest list <archivo> | grep -c ""`): `gradebook.integracion` 7, `mis-calificaciones.integracion` 5, `calificaciones-lecturas-consistentes.integracion` 6, `calificaciones-lecturas-autorizacion.integracion` 2, `calificaciones-lecturas-estatico` 6. Más un archivo de ayudas nuevo sin casos (`test/ayudas-gradebook.ts`).
- Frontend: `npx vitest list --json` → 2536 casos; `--filesOnly` → 166 archivos (sin cambio; `npx vitest list | grep -c ""` da 2539 líneas porque hay títulos que ocupan más de una línea).

### Verificación (comando exacto y última línea; una suite a la vez, Docker Desktop encendido)
| Paquete | Comando | Última línea |
|---|---|---|
| shared | `cd shared; npm run lint` | `All matched files use Prettier code style!` |
| shared | `cd shared; npm run build` | `> tsc -p tsconfig.json` (código 0) |
| backend | `cd backend; npm run lint` | `> tsc -p tsconfig.json --noEmit && tsc -p tsconfig.test.json` (código 0; antes, `All matched files use Prettier code style!`) |
| backend | `cd backend; npm run test` | `Duration  181.27s (…)`; resumen `Test Files  212 passed (212)` · `Tests  2579 passed (2579)` (código 0) |
| backend | `cd backend; npm run build` | `> tsc -p tsconfig.json` (código 0) |
| backend | `cd backend; npx prisma validate` | `The schema at prisma\schema.prisma is valid 🚀` |
| frontend | `cd frontend; npm run lint` | `> tsc -b` (código 0) |
| frontend | `cd frontend; npm run test` (3.ª corrida) | `Duration  126.10s (…)`; resumen `Test Files  166 passed (166)` · `Tests  2536 passed (2536)` (código 0) |
| frontend | `cd frontend; npm run build` | `✓ built in 1.47s` (código 0) |

- **Inventarios del backend** (`grep -o … | wc -l` sobre la salida completa): `"Error no controlado"` 10, `"code":"P2028"` 5, `40P01` 0 (además `deadlock detected` 0 y `Test timed out` 0). Son los 10 / 5 / 0 de I-1.
- **Frontend, corridas 1 y 2 en rojo por carga, no por el cambio:** la 1.ª tardó 634.77 s (`Test Files  27 failed | 139 passed (166)`, `Tests  37 failed | 2499 passed (2536)`) y la 2.ª 310.60 s (`15 failed | 151 passed`, `21 failed | 2515 passed`). Todos los rojos son `findBy…` que no encuentran el elemento o `Test timed out in 15000ms`, y los 15 archivos de la 2.ª estaban entre los 27 de la 1.ª. Los 27 archivos juntos, sin nada más: `Test Files  27 passed (27)` · `Tests  348 passed (348)` en 22.49 s. La 3.ª corrida completa sale en verde (tabla). Ningún archivo de `frontend/` cambió y `shared/` solo suma exportaciones que el frontend no importa. Durante esas corridas no corría ninguna otra suite mía; en el equipo había procesos `node` ajenos, que no toqué.
- **Observación sin verificar contra la base:** la salida del backend trae 19 `DeprecationWarning: Calling client.query() when the client is already executing a query` de `pg`. Mis cinco archivos nuevos, corridos solos, no emiten ninguno; no lo comparé contra una corrida de `<K1a>`.

### Archivos nuevos y cambiados, por capa
- `shared/`: `src/calificaciones.ts` (los esquemas de 01b de §D-11: `motivoDeRiesgoSchema`, `desgloseDeCategoriaSchema`, `calificacionGeneralSchema`, `columnaDelGradebookSchema`, `celdaDelGradebookSchema`, `filaDelGradebookSchema`, `resumenDelGradebookSchema`, `gradebookRespuestaSchema`, `gradebookQuerySchema`, `filtroDeMisCalificacionesSchema`, `misCalificacionesQuerySchema`, `tareaDeMisCalificacionesSchema`, `misCalificacionesRespuestaSchema` y sus tipos; las respuestas son `z.strictObject`; importa además de `enlaces-registro.ts` y `entregas.ts`, sin ciclo); `src/index.ts` (reexporta por nombre).
- `core/`: `calificaciones/calificar.ts` (paso 0).
- `adapters/`: `db/calificaciones.ts` (nuevo: `leerGradebook`, `leerMisCalificaciones` y sus tipos `…Db`; tres `$queryRaw` etiquetados y parametrizados, los de §D-6.5, §D-6.6 y §D-7.4); `db/index.ts` (reexporta); `db/entregas.ts` (paso 0); `README.md` (sección nueva de 01b).
- `handlers/`: `calificaciones.ts` (los dos `GET`, con `protegido({ roles: ["maestro", "admin"], pertenencia: "propiedad" })` y `protegido({ roles: ["estudiante"], pertenencia: "inscripcion" })`; la fecha límite a ISO 8601; el alumno es `perfilDe(request).id`); `README.md`. `app.ts` no cambia (el plugin ya estaba registrado desde 01a).
- Pruebas: los 5 archivos nuevos de arriba y `test/ayudas-gradebook.ts` (nuevo; las ayudas compartidas no se tocan).
- **E6** (`backend/test/bloqueo-usuario.integracion.test.ts`, lista cerrada de 01b): el bloque de comentario de `:677-686` suma la línea «CALIFICACIONES-01b: calificaciones.ts (los agregados del gradebook y de "Mis calificaciones").»; el título pasa a «E6: solo salud.ts, bloqueo-usuario.ts, enlaces-registro.ts, invitaciones.ts, publicaciones.ts, referencias.ts, temas.ts, categorias.ts, tareas.ts, entregas.ts y calificaciones.ts usan SQL etiquetado en adapters/db»; la lista ordenada suma `"calificaciones.ts"` después de `"bloqueo-usuario.ts"`. Nada más.

### "No se toca"
- Dentro de los paquetes: `git diff --stat 216c1b599e1e63e77ad01f1283f504478eb64796 -- backend/src/middleware backend/src/adapters/auth backend/src/adapters/notifier backend/src/adapters/storage backend/src/adapters/live backend/src/config backend/src/workers backend/src/worker.ts backend/src/server.ts backend/src/adapters/db/cliente.ts backend/src/adapters/db/errores.ts backend/src/adapters/db/referencias.ts backend/src/adapters/db/bloqueo-clase.ts backend/src/adapters/db/inscripciones.ts backend/src/adapters/db/publicaciones.ts backend/src/adapters/db/archivos.ts backend/src/adapters/db/temas.ts backend/src/adapters/db/categorias.ts backend/src/adapters/db/tareas.ts backend/src/core/autoria.ts backend/src/core/concurrencia.ts backend/src/core/entregas backend/src/core/tareas backend/src/core/clases backend/src/handlers/clases backend/src/handlers/tareas backend/src/handlers/adjuntos.ts backend/src/handlers/validacion.ts backend/src/handlers/errores.ts backend/src/app.ts backend/prisma backend/test/setup.ts backend/test/global-setup.ts backend/test/ayudas-auth.ts backend/test/ayudas-clases.ts backend/test/ayudas-tareas.ts backend/test/ayudas-entregas.ts backend/test/ayudas-concurrencia.ts backend/test/ayudas-calificaciones.ts frontend/src frontend/vitest.config.ts backend/package.json frontend/package.json shared/package.json backend/.env.example frontend/.env.example` → vacío.
- Fuera: `git diff --stat d998282 -- AGENTS.md CLAUDE.md docs/ARCHITECTURE.md docs/PRD.md .claude/agents infra package.json package-lock.json` → solo `docs/ARCHITECTURE.md | 12 ++++++------`, que es el A-6 del orquestador confirmado en `<K1a>`: `git diff --stat 216c1b5 -- docs/ARCHITECTURE.md docs/ARCHITECTURE-ESSENTIALS.md` está vacío y sus SHA-256 (`f868938f…2cb3` y `f47574dd…d47f`) son los que anota `aprobacion.md`. `docs/PRD.md`, `AGENTS.md`, `CLAUDE.md`, `.claude/agents`, `infra/` y los `package*.json`, sin cambio.

### §D-0.9 y `instantaneaUnica: true`
- `for f in backend/src/adapters/db/calificaciones.ts backend/src/adapters/db/index.ts backend/src/adapters/db/entregas.ts backend/src/core/calificaciones/calificar.ts backend/src/handlers/calificaciones.ts; do grep -nE '^\s*//.*(COMENTARIO_CREADO|AVISO_FALLIDO|PUBLICACION_CREADA|MATERIAL_CREADO|colaDePublicacion|DELETE FROM|TRUNCATE|REPEATABLE READ|RepeatableRead|Serializable|instantaneaUnica: true)' $f; done; grep -nE '^\s*//.*(enTransaccion|instantaneaUnica|isolationLevel)' backend/src/core/calificaciones/calificar.ts backend/src/handlers/calificaciones.ts` → salida vacía. Lo mismo comprueba el último caso de CAL-1B08.
- `grep -c "instantaneaUnica: true" backend/src/adapters/db/calificaciones.ts` → `2` (en código, en `leerGradebook` y `leerMisCalificaciones`; ninguna en comentarios).

### EXPLAIN (PA-04 no aplica)
Corrido una vez contra la base desechable de Testcontainers, con un archivo y una configuración de Vitest en el scratchpad (fuera del repositorio): 200 clases, 4000 alumnos, 5000 tareas, 79 823 entregas y 4000 inscripciones, con `ANALYZE`. **Ningún `Seq Scan` sobre `entregas` ni `tareas`.**
- §D-6.5 (agregado de la clase): `Index Only Scan using inscripciones_pkey` → `Index Scan using entregas_alumno_id_idx` (filtro `estado`) → `Bitmap Index Scan on tareas_clase_id_fecha_limite_idx` → `Index Scan using usuarios_pkey`.
- §D-6.6 (vencidas): `inscripciones_pkey` → `Bitmap Index Scan on tareas_clase_id_fecha_limite_idx` (`clase_id` y `fecha_limite < ahora`) → `Index Scan using entregas_tarea_id_alumno_id_key` (anti-join) → `usuarios_pkey`.
- §D-7.4 (agregado del alumno): `Bitmap Index Scan on tareas_clase_id_fecha_limite_idx` e `Index Scan using entregas_alumno_id_idx`.
- Página de tareas con cursor (SQL equivalente al que arma Prisma: `(fecha_limite < f) OR (fecha_limite = f AND id < c)`, `ORDER BY fecha_limite DESC, id DESC LIMIT 21`): `BitmapOr` de dos `Bitmap Index Scan on tareas_clase_id_fecha_limite_idx`, con `Sort` de las filas de la clase.
- Filtros de "Mis calificaciones" (`NOT EXISTS` y `EXISTS`): `tareas_clase_id_fecha_limite_idx` y `entregas_alumno_id_idx`. Celdas: `inscripciones_pkey`, `entregas_alumno_id_idx` y `tareas_clase_id_fecha_limite_idx`.
- Es el plan de esos datos sintéticos (cada alumno en una sola clase), no el de producción; las sentencias de Prisma se aproximaron con SQL equivalente.

### Desviaciones del plan y decisiones fuera de lo literal
- Ninguna desviación. Decisiones menores, para que el manager las juzgue: (1) el filtro de "Mis calificaciones" combina el cursor y el filtro con `AND: [keyset, filtro]`, porque los dos pueden traer `fechaLimite`; (2) una celda o una entrega `calificado` sin calificación (o al revés) lanza `ERROR_INTERNO` (inalcanzable por `entregas_calificacion_segun_estado`), igual que una tarea sin título; (3) las celdas y las entregas de la página no se consultan si la página o la ventana están vacías (como `listarEntregasCon`); (4) el `modo` del resumen sale de `calificacionGeneral` con las categorías de la clase, para no repetir la regla; (5) los mensajes de cursor son `"cursorTareas: no es válido"` y `"cursor: no es válido"` (`400 VALIDACION`, §D-6.1 y §D-7.1).
- En la primera versión de CAL-1B06 puse mal el código del rol (`PERMISO_DENEGADO`; el middleware responde `ROL_NO_PERMITIDO`) y usé "Alumno Deudor" como nombre, que la propia regla de fuga detectó (`deudor`). Corregí la prueba (el código real y el nombre "Alumno Saldo"), sin tocar la regla.

### Hermanos del paso 0 y estados vecinos
- **N-14, valores inventados en ramas inalcanzables:** los tres de `decidirCalificacion`, corregidos. Revisados y **sin aplicar**, porque no son ramas inalcanzables sino ausencias legítimas: `general.ts:118, 124, 131` (`?? VACIA`: una categoría sin agregados suma cero) y, en el archivo nuevo, `agregados.get(id) ?? SIN_AGREGADOS` (alumno sin calificaciones), `vencidas.get(id) ?? 0` (sin vencidas: el SQL solo trae alumnos con al menos una) y `entregaDe.get(…) ?? SIN_ENTREGA` (sin fila es `asignado`, §D-6.3 y §D-7.3). `escalarALaTarea` ya lanzaba `ERROR_INTERNO`.
- **N-15, `if` anidado:** `calificacionDe`, corregido. Hermano con el mismo patrón, **no aplicado** porque es código de ENTREGAS-01 fuera de lo que pide N-15 (cambio mínimo): `adapters/db/entregas.ts:844-847`, en la lectura del hilo privado (`if (entrega === null) { if (cursor !== undefined) throw …; return … }`). Lo decide el manager. `calificar.ts:132-138` (`if (criterios.length === 0) { guarda; return }`) no es un `if/else` anidado: es una rama con su guarda y su retorno, con la misma estructura de 01a.
- **Estados de `calificacionDe` tras el cambio:** sin calificar y sin calificación → `null`; sin calificar con calificación o con fecha → `500`; calificada con las dos → la calificación; calificada sin una de las dos → `500`. Son los mismos cuatro de antes.

### Pendiente o fuera de alcance detectado
- `adapters/README.md` (cerca de la línea 165) enumera quién usa la instantánea única y está desactualizado desde ENTREGAS-01 (no nombra `tareas.ts` ni `entregas.ts`, ni ahora `calificaciones.ts`). No lo toqué; la sección nueva lo dice para 01b.
- El hermano de N-15 en `entregas.ts:844-847` (arriba).
- Los 19 `DeprecationWarning` de `pg` en la salida del backend, sin comparar contra `<K1a>`.
- La matriz de avisos no aplica (sin interfaz).

## 01b — N-21
Solo texto y comentarios: ningún cambio de código, de pruebas ni de `*.ataque`.

### Diff resumido
- `backend/src/adapters/README.md` (sección de `enTransaccion`, la frase final de `{ instantaneaUnica: true }`): «Hoy la usan `listarClasesAdmin`, `listarClasesInscritas`, `listarClasesImpartidas`, `leerClase`, `listarPublicaciones` y `listarComentarios`.» pasa a nombrar las catorce, agrupadas por archivo: `leerClase`, `listarClasesImpartidas`, `listarClasesInscritas` y `listarClasesAdmin` (`db/clases.ts`); `listarPublicaciones` y `listarComentarios` (`db/publicaciones.ts`); `leerTarea` y `listarTrabajo` (`db/tareas.ts`); `leerMiEntrega`, `listarEntregas`, `leerEntregaDeAlumno` y `listarHiloPrivado` (`db/entregas.ts`), y `leerGradebook` y `leerMisCalificaciones` (`db/calificaciones.ts`). Los nombres salen de la función exportada que contiene cada aparición del grep de abajo.
- `backend/src/handlers/calificaciones.ts:45-46`: la línea que cortaba en «(S-01: el» se reacomoda a mano (sin formateador): «… (S-01: el admin lee la calificación en la» / «entrega de un alumno y no califica). Ningún handler verifica rol,». El texto no cambia.
- El README está fuera de `adapters/db/` y no es `.ts`: C-4 (`lecturas-fx-r1.ataque.test.ts:758`) solo lee archivos `\.(ts|mts|cts|js|mjs)$` de `src` y cuenta `instantaneaUnica: true` solo en `adapters/db/`. No agregué esa cadena en ningún comentario de `adapters/db/`.

### `instantaneaUnica: true` por archivo de `adapters/db`
`grep -rn "instantaneaUnica: true" backend/src/adapters/db/` (todas en código, ninguna en comentarios):
- `calificaciones.ts`: 2 (349 `leerGradebook`, 441 `leerMisCalificaciones`)
- `clases.ts`: 4 (206 `leerClase`, 296 `listarClasesImpartidas`, 358 `listarClasesInscritas`, 422 `listarClasesAdmin`)
- `entregas.ts`: 4 (281 `leerMiEntrega`, 718 `listarEntregas`, 765 `leerEntregaDeAlumno`, 883 `listarHiloPrivado`)
- `publicaciones.ts`: 2 (254 `listarPublicaciones`, 339 `listarComentarios`)
- `tareas.ts`: 2 (197 `leerTarea`, 707 `listarTrabajo`)
Total 14 en 5 archivos, lo que espera C-4.

### §D-0.9
El mismo grep de la sección de 01b (los cinco archivos cambiados de `backend/src` y el de `enTransaccion|instantaneaUnica|isolationLevel` en `calificar.ts` y `handlers/calificaciones.ts`) → salida vacía.

### Verificación (en `backend/`, una a la vez, Docker Desktop encendido)
- `npm run lint` → código 0; última línea `> tsc -p tsconfig.json --noEmit && tsc -p tsconfig.test.json`.
- `npm run test` → código 0; `Test Files  216 passed (216)` · `Tests  2617 passed (2617)`. Inventarios sobre la salida: `grep -c "Error no controlado"` 10, `grep -c P2028` 5, `grep -c 40P01` 0.
- `npm run build` → código 0; última línea `> tsc -p tsconfig.json`.
- `npx vitest list` → 2617 líneas (casos), 216 archivos distintos (`sed 's/ >.*//' | sort -u | wc -l`).

### "No se toca"
- `git diff --stat 216c1b599e1e63e77ad01f1283f504478eb64796 -- <las mismas rutas de la sección "No se toca" de 01b>` → vacío.
- `git diff --stat 216c1b5… -- '*.ataque.test.ts'` → los mismos 2 archivos de la corrección C-n del tester ya registrada (`lecturas-fx-r1` y `sesiones-y-cadena`); este cambio no tocó ninguna.

### Hermanos
- Otras enumeraciones de quién usa una opción de `enTransaccion` en el mismo README: la de `{ maxWait }` («Hoy solo la usan `registrarMaestroConEnlace` y `revocarEnlaceRegistro`») la verifiqué con `grep -rn "maxWait" backend/src --include=*.ts` (fuera de `cliente.ts` y `generated/`): solo `enlaces-registro.ts:128` (`revocarEnlaceRegistro`) y `:204` (`registrarMaestroConEnlace`), así que está al día y el remedio no le aplica. No encontré otras enumeraciones de usuarios de `enTransaccion`.

## 01c — implementación

Plan: `docs/trabajo/CALIFICACIONES-01-calificaciones-y-gradebook/plan.md`, "Pasos de implementación → 01c" (pasos 1 a 7, todos). Base dentro de los paquetes: `<K1b>` = `10e5a023dc1fc215112dbf7828ab4b32cfa036e1`; fuera, `<R>` = `d998282`. Precisiones aplicadas: (c′), N-11 (registrada en `aprobacion.md`), M-02/N-03, T-01, O-r0c-1, O-r0c-2. No arranqué Vite ni la API; ningún navegador; ningún commit; ninguna `*.ataque` tocada; ninguna prueba normal cambiada (la lista cerrada de 01c no tiene ninguna y ninguna cayó: sin PA-02).

### (1) Pruebas requeridas → archivo y título exacto

Archivos: `frontend/src/features/tareas/calificar-01c.test.tsx` (A), `frontend/src/features/tareas/calificacion-01c.test.tsx` (B), `frontend/src/features/tareas/estatico-01c.test.ts` (C), `frontend/src/lib/format-01c.test.ts` (D). Reloj fijo (`vi.useFakeTimers({ toFake: ["Date"] })` y `setSystemTime`) en A y B; C y D no usan fechas.

- **CAL-1C01** → A, "panel con rúbrica (CAL-1C01)":
  - "CAL-1C01: un campo por criterio con su etiqueta, la suma y la calificación escalada en el texto, con punto o coma decimal"
  - "CAL-1C01: validación local (vacío): no pide nada, marca el campo con ErrorDeCampo y lleva el foco al primer error", y los mismos con "(mayor que el máximo)", "(negativo)", "(con 3 decimales)" y "(con letras)" (5 casos de `it.each`)
  - "CAL-1C01: aNumeroDePuntos acepta punto o coma decimal con hasta 2 decimales y rechaza lo demás sin coaccionar" ("8,5", " 8.5 " y "08.50" valen 8.5; "8.", ".5", "1e1", "Infinity", "-1", "", "8.123", "8,5,1" y "0x10" son NaN)
  - "CAL-1C01: el cuerpo es exactamente { version, puntosDeLaTarea, puntajes en orden, calificacion: null, comentario } con la versión, los puntos y la rúbrica de apertura aunque una recarga de fondo traiga otros, y las etiquetas siguen con los de apertura"
- **CAL-1C02** → A, "panel sin rúbrica (CAL-1C02)": "CAL-1C02: un campo «Calificación (de 80 puntos)» y el cuerpo lleva puntajes: [] y la calificación directa, sin comentario si quedó vacío"; "CAL-1C02: sin rúbrica, vacío o fuera de rango no pide nada y el error va bajo «Calificación»"
- **CAL-1C03** → A, "éxito (CAL-1C03)": "CAL-1C03: un aviso «Calificación publicada», la entrega en caché es la respuesta, se marcan viejas la lista de entregas, el prefijo de calificaciones y el hilo (con comentario); el panel se reinicia con lo guardado, «Actualizar calificación» y el foco en el h3"; "CAL-1C03: sin comentario el hilo no se marca viejo; recalificar avisa «Calificación actualizada» y envía la versión nueva"
- **CAL-1C04** → A, "409 ENTREGA_MODIFICADA y sus estados vecinos (CAL-1C04)":
  - "CAL-1C04: un aviso con el mensaje del servidor, exactamente un GET de la entrega, en espera sin disabled durante la recarga y ningún PUT más con clics o Enter; al llegar, lo escrito se descartó, el panel muestra lo guardado, el foco está en el h3 y el siguiente guardado envía la versión nueva"
  - "CAL-1C04 (vecino): un segundo 409 seguido vuelve a avisar, recarga una vez más, reinicia con la versión siguiente y el foco vuelve al h3"
  - "CAL-1C04 (vecino): si la recarga falla con 5xx, dos avisos en total, lo escrito y la versión se conservan, el botón sale de la espera y el foco no está en <body>"
  - "CAL-1C04 (vecino): si la recarga trae un 404 del alumno, la vista se reemplaza por su mensaje, solo hay el aviso del 409 y el foco va a la raíz"
  - "CAL-1C04 (vecino): «Volver a las entregas» durante la recarga navega sin errores en la consola ni avisos de más"
- **CAL-1C05** → A, "409 RUBRICA_MODIFICADA (CAL-1C05)": "CAL-1C05: un GET de la tarea y uno de la entrega; el panel se reinicia con los criterios nuevos"; "CAL-1C05: en una tarea sin rúbrica cuyos puntos subieron de 10 a 100, el panel se reinicia con «Calificación (de 100 puntos)» y el cuerpo siguiente lleva puntosDeLaTarea: 100"; además, "CAL-1C05 (vecino): si la recarga de la tarea falla con 5xx, el aviso es el de la recarga fallida de la tarea (uno), nada se reinicia y lo escrito y los puntos de apertura se conservan"
- **CAL-1C06** → A, "ENTREGA_NO_CALIFICABLE, errores de campo y del servidor (CAL-1C06)":
  - "CAL-1C06: 409 ENTREGA_NO_CALIFICABLE pide la tarea y la entrega a la vez (N-11); el panel se reinicia con la frase y el foco queda en el h3" (exige un `GET` de la tarea y uno de la entrega, como precisa N-11, no solo el de la entrega)
  - "CAL-1C06: un 400 de un campo pinta ErrorDeCampo en ese criterio, sin aviso, con el foco en ese campo"
  - "CAL-1C06: 503 SERVICIO_OCUPADO da un aviso, lo escrito se conserva y el botón vuelve a estar disponible"; "CAL-1C06: sin conexión da un aviso, lo escrito se conserva y el botón vuelve a estar disponible"
  - "CAL-1C06: un 404 del alumno da un aviso y la vista se reemplaza"
  - además: "CAL-1C06 (vecino): un 404 de la tarea al calificar da un aviso y la vista dice «Esa tarea ya no existe.»"; "CAL-1C06 (vecino): con un error con que apiClient redirige (403 ACCESO_RESTRINGIDO) no hay aviso ni recarga"
- **CAL-1C07** → A, "guarda síncrona (CAL-1C07)": "CAL-1C07: un doble clic y un Enter repetido hacen un solo PUT; el botón usa enEspera, nunca disabled"
- **CAL-1C08** → A, "perspectivas y estados (CAL-1C08)": "CAL-1C08: el admin ve la calificación en solo lectura, sin ningún textbox ni botón de calificar"; "CAL-1C08: el admin sin calificación lee «Sin calificar todavía.»"; "CAL-1C08: una entrega asignada sin vencer muestra «Podrás calificar…» sin formulario"; "CAL-1C08 (c′): una vencida sin entrega en una tarea que no acepta tardías muestra la nota y el formulario"; "CAL-1C08 (c′): una vencida sin entrega en una tarea que acepta tardías muestra la frase sin formulario"
- **CAL-1C09** → B, "la calificación en «Tu trabajo» (CAL-1C09)": "CAL-1C09: calificada con entrega: la frase de hoy, «Calificación: 8.5 de 10», la fecha y el desglose por criterio"; "CAL-1C09: calificada sin entrega: «No entregaste esta tarea y ya está calificada.», sin la frase de la entrega hecha, y la calificación sin desglose si la tarea no tiene rúbrica"; "CAL-1C09: sin calificación no aparece nada nuevo"
- **CAL-1C10** → B, "editar una tarea calificada (CAL-1C10)": "CAL-1C10: 409 TAREA_CON_CALIFICACIONES da un aviso con el mensaje del servidor, lo escrito se conserva y no hay GET de la tarea"
- **CAL-1C11** → D, "formatearPuntos y formatearPorcentaje (CAL-1C11)": "CAL-1C11: formatearPuntos(%s) es «%s»" (7 casos: 10, 0, 8.5, 7.78, 3.25, 1000, 12.3); "CAL-1C11: formatearPuntos no rellena con ceros ni redondea a más de 2 decimales"; "CAL-1C11: formatearPorcentaje(%s) es «%s», con el espacio de no separación antes del signo" (5 casos: 87.5, 100, 0, 69.99, 1000)
- **CAL-1C12** → C, "«Sin categoría» se escribe una sola vez (CAL-1C12)": "CAL-1C12: el literal «Sin categoría» vive solo en components/clase/data.ts (sin contar comentarios)" (quita los comentarios antes de buscar, O-r0c-2); "CAL-1C12: las llaves sinCategoria de features/tareas son el valor de components/clase/data.ts" (`toBe`)
- **CAL-1C13** → C, "regla estática de lo nuevo y lo cambiado de 01c (CAL-1C13)": "CAL-1C13: sin disabled, ?? [], fetch(, console., valor por defecto en calificacion, vidrio ni importaciones de otro módulo de features"; "CAL-1C13: renovarTrasErrorDeLaEntrega( sigue en 3 en hooks.ts y el gancho nuevo no la llama"; "CAL-1C13: los tipos viven en types.ts; los componentes solo declaran interfaces de Props"; "CAL-1C13: la vista de la entrega de un alumno no nombra el correo, el estado de pago ni perspectivaDeRuta("; "CAL-1C13: ningún comentario de lo nuevo y lo cambiado de 01c tiene las palabras de §D-0.9" (exime, con el motivo escrito en la prueba, el único comentario anterior a 01c que nombra una: el de ENTREGAS-01a con "Sin tema" en `components/clase/data.ts`, que 01c no toca)
- **CAL-1C14** → A, "la versión de apertura cuando el formulario aparece o desaparece (CAL-1C14)": "CAL-1C14: con la frase a la vista (asignado sin vencer, versión 0), una recarga de fondo trae la entrega entregada con versión 1; el formulario aparece y el primer guardado envía version: 1 sin 409"; "CAL-1C14: con el formulario a la vista y el foco en un campo, una recarga que trae la entrega no calificable lo quita y el foco no queda en <body>"

Todas las viñetas CAL-1C01 a CAL-1C14 tienen al menos un caso. Ninguna queda sin cubrir.

### (2) Matriz de avisos, recargas y foco de 01c (§D-14), contrastada con el código

Código: `useCalificarEntrega` (`features/tareas/hooks.ts`), `FormularioDeCalificacion` y `PanelDeCalificacion` (`components/panel-de-calificacion.tsx`), `recargarTrasConflicto` y el `key={reinicios}` del panel (`entrega-de-alumno-view.tsx`), `useFocoAlPerderseElControl` y `useAvisoDeRecargaFallida` (sin cambios). "Gancho" = `onSuccess`/`onError` de la mutación (corren con la vista montada o no). "Vista" = `recargarTrasConflicto` (no hace nada si la vista ya no está montada: `montadoRef`, comprobado al empezar y al volver de las recargas). 24 filas.

**A · Mutación de calificar ("Calificar y devolver" / "Actualizar calificación")**

| # | Clase de respuesta | Qué se renueva | Aviso (uno) | Foco | En vuelo a la vez | Con la vista desmontada |
|---|---|---|---|---|---|---|
| A1 | `200` | Gancho: `setQueryData` de la entrega con la respuesta; invalida `claveListaDeEntregas`, `clavePrefijoDeCalificaciones` y, solo si el cuerpo llevó `comentario`, `claveHilo` de ese alumno (el hilo montado se vuelve a pedir: el comentario aparece). Vista: `onCalificada` → `reinicios + 1` → el panel se monta otra vez con la versión y los valores guardados | "Calificación publicada" (sin calificación al abrir) o "Calificación actualizada" | `h3` "Calificación" (efecto de montaje del panel, con `enfocarAlMontar`) | Doble clic o Enter repetido = un `PUT` (`enviandoRef`); el botón en `enEspera` | El aviso, la caché y las invalidaciones salen (gancho); no hay reinicio visible |
| A2 | `409 ENTREGA_MODIFICADA` | Gancho: nada. Vista: un `GET` de la entrega; si responde, reinicio con la versión nueva (lo escrito se descarta) | El mensaje del servidor (gancho) | `h3` "Calificación" | Durante la recarga el botón sigue en `enEspera` y la guarda sigue tomada: ningún `PUT` con clics ni Enter. Un segundo `409` seguido: el mismo camino otra vez | Aviso sí (gancho); recarga no (la vista sale antes de pedir) |
| A3 | `409 RUBRICA_MODIFICADA` | Vista: un `GET` de la tarea y uno de la entrega, a la vez (`Promise.all`); si responden, reinicio con la rúbrica y los puntos nuevos | El mensaje del servidor | `h3` "Calificación" | Igual que A2 | Aviso sí; recarga no |
| A4 | `409 ENTREGA_NO_CALIFICABLE` (N-04 y **N-11**) | Vista: un `GET` de la tarea y uno de la entrega, a la vez (`recargaLaTareaTrasConflicto`); si responden, reinicio: con la tarea y la entrega actuales `sePuedeCalificar` decide (frase "Podrás calificar…" o formulario de nuevo) | El mensaje del servidor | `h3` "Calificación" (el `Card` sigue montado) | Igual que A2 | Aviso sí; recarga no |
| A5 | La recarga de la **entrega** tras un `409` falla (red o 5xx) | Nada: sin reinicio; lo escrito y la versión de apertura se conservan | "No pudimos cargar la entrega actual. Revisa tu conexión e inténtalo de nuevo." (además del del `409`: dos en total) | Se queda donde estaba (el botón o el campo desde el que se envió con Enter) | Un guardado nuevo vuelve a enviar la versión de apertura (vuelve a dar `409` y a intentar) | — (si la vista se desmontó durante la recarga: nada) |
| A6 | La recarga de la **tarea** tras `RUBRICA_MODIFICADA` o `ENTREGA_NO_CALIFICABLE` falla (red o 5xx) | Nada: sin reinicio; lo escrito y los puntos y la rúbrica de apertura se conservan | El de `useAvisoDeRecargaFallida` del detalle: "No pudimos actualizar la tarea. Mostramos la última versión que tenemos." (dos en total; la vista no suma el suyo para no dar tres) | Se queda | Igual que A5 | — |
| A7 | La recarga tras un `409` trae `404 TAREA_NO_ENCONTRADA`, `404 ALUMNO_NO_ENCONTRADO` o `403 SIN_ACCESO_A_LA_CLASE` | La vista se reemplaza por su mensaje (regla de §7.26) | Solo el del `409` | La raíz (`useFocoAlPerderseElControl`) | — | — |
| A8 | La recarga tras un `409` trae un error con que `apiClient` redirige | `apiClient` redirige | Solo el del `409` | — | — | — |
| A9 | `400 VALIDACION` de un campo (`puntajes.<i>.puntos`, `calificacion`, `comentario`) | Nada | Ninguno: `ErrorDeCampo` bajo el campo (la posición `i` pasa al id del criterio de esa posición del envío) | El primer campo con error | — | Ninguno (el gancho no avisa errores de campo) |
| A10 | `404 TAREA_NO_ENCONTRADA`, `404 ALUMNO_NO_ENCONTRADO`, `403 SIN_ACCESO_A_LA_CLASE` | Gancho: `pedirDeNuevoLaTarea` (T-11, sin cambios): la tarea (con un `404` de la tarea, también el muro, el trabajo, los temas y las categorías) o el prefijo de entregas (con `ALUMNO_NO_ENCONTRADO`) se vuelven a pedir y la vista se reemplaza | Uno por tarea perdida (`avisarDelErrorDeLaEntrega`) | La raíz | Calificar y "Enviar comentario" con el mismo `404` a la vez: un aviso (la misma deduplicación por consulta de la tarea) | El aviso sale una vez |
| A11 | Redirige `apiClient` (`ACCESO_RESTRINGIDO`, `CAMBIO_DE_CONTRASENA_REQUERIDO`, sesión perdida) | — | Ninguno (`errorQueRedirigeElCliente`) | — | — | Ninguno |
| A12 | `503 SERVICIO_OCUPADO`, otro 5xx o sin conexión | Nada | Uno, el de `mensajeDeErrorTareas` (con `SERVICIO_OCUPADO`, el mensaje del servidor; sin conexión o 5xx sin cuerpo, "Algo salió mal. Inténtalo de nuevo.") | Se queda en el botón | — | El aviso sale |
| A13 | `400 VALIDACION` de `claseId`, `tareaId` o `alumnoId` (inalcanzable desde la vista: esas lecturas ya habrían fallado antes con el mismo `400` y reemplazado la vista) | Nada (`pedirDeNuevoLaTarea` solo mira códigos) | Uno, el de `mensajeDeErrorTareas` ("No tienes acceso a esta clase.", "Esa tarea ya no existe." o "No encontramos a ese alumno en esta clase.") | Se queda | — | El aviso sale |

**B · Consulta de la entrega (`useEntregaDeAlumno`), recargas de fondo**

| # | Disparador y respuesta | Qué se renueva | Aviso | Foco | En vuelo / desmontada |
|---|---|---|---|---|---|
| B1 | Recarga con otra versión, sin guardar | La consulta se actualiza; el panel **no** se reinicia (la versión, los puntos, la rúbrica y lo escrito nacieron en los inicializadores perezosos del formulario) | Ninguno | Sin cambio | Si coincide con un guardado: el `PUT` lleva la versión de apertura y recibe `409` (A2) |
| B2 | Recarga que vuelve calificable una entrega que mostraba la frase (N-03) | El formulario se monta en ese momento con la versión y los puntos de la tarea de ese momento | Ninguno | Sin cambio (la frase no tenía foco; si el foco estaba en el `h3`, se queda: el `Card` no se desmonta) | — |
| B3 | Recarga que vuelve no calificable la entrega con el formulario a la vista (el alumno anuló antes de la fecha) | El formulario desaparece (lo escrito se pierde) | Ninguno | Si el control con el foco desaparece, la raíz | — |
| B4 | Recarga con un error que reemplaza la vista (`404 ALUMNO_NO_ENCONTRADO`, `VALIDACION` de un id) | La vista se reemplaza (ENTREGAS-01e, sin cambios) | Ninguno | La raíz | — |
| B5 | Recarga con 5xx o sin conexión, con la entrega en caché | Se sigue mostrando la última (ENTREGAS-01e, sin cambios); el panel no cambia | Ninguno | Sin cambio | — |

**C · Consulta de la tarea (`useTarea`), recargas de fondo**

| # | Disparador y respuesta | Qué se renueva | Aviso | Foco | En vuelo / desmontada |
|---|---|---|---|---|---|
| C1 | Recarga con otros puntos o rúbrica (M-02) | La consulta se actualiza; el formulario **no** cambia: etiquetas, total y cuerpo siguen con los de apertura | Ninguno | Sin cambio | El guardado siguiente recibe `409 RUBRICA_MODIFICADA` (A3) |
| C2 | Recarga con otra fecha límite o `aceptaTardias` que cambia si se puede calificar (sin guardar) | `sePuedeCalificar` se recalcula: el formulario aparece (B2) o desaparece (B3) | Ninguno | Como B2 y B3 | — |
| C3 | Recarga con 5xx o red, con la tarea en caché | Sin cambio en el panel | El de `useAvisoDeRecargaFallida` (sin cambios) | Sin cambio | — |
| C4 | Recarga con `404` o `403` | La vista se reemplaza | Ninguno (sin cambios) | La raíz | — |

**D · El hilo tras calificar con comentario**

| # | Disparador y respuesta | Qué se renueva | Aviso | Foco | En vuelo / desmontada |
|---|---|---|---|---|---|
| D1 | Invalidación de `claveHilo` tras A1 con comentario: `200` | El hilo montado se vuelve a pedir y muestra el comentario de la devolución | Ninguno | `h3` "Calificación" (A1); el hilo no mueve el foco | Desmontada: la invalidación solo marca vieja la consulta |
| D2 | La misma recarga falla (5xx o red) con comentarios en caché | El hilo conserva lo que tenía (`useHiloPrivado`, sin cambios) | Ninguno | Sin cambio | — |
| D3 | La misma recarga trae `404` de la tarea o del alumno, o `403` de la clase | `pedirDeNuevoLaTarea` desde la consulta del hilo (sin cambios): la vista se reemplaza | Ninguno desde el hilo | La raíz | — |

**E · Editar una tarea calificada (`useEditarTarea`, sin código nuevo salvo el código en `CODIGOS_CON_MENSAJE_DEL_SERVIDOR`)**

| # | Clase de respuesta | Qué se renueva | Aviso (uno) | Foco | En vuelo a la vez | Con la vista desmontada |
|---|---|---|---|---|---|---|
| E1 | `409 TAREA_CON_CALIFICACIONES` | Nada: no está en `CODIGOS_QUE_RENUEVAN_LA_TAREA` ni es `TAREA_MODIFICADA`; lo escrito se conserva; ningún `GET` de la tarea (CAL-1C10) | El mensaje del servidor | Se queda en "Guardar cambios" | Doble clic = un `PUT` (la guarda de `FormularioTarea`, sin cambio) | El aviso sale (gancho) |
| E2 | `409 TAREA_MODIFICADA` (vecino, sin cambio desde ENTREGAS-01a) | Un `GET` de la tarea y reinicio del formulario | El mensaje del servidor | "Título" | Igual | El aviso sale |
| E3 | Los dos seguidos | El servidor responde primero `TAREA_MODIFICADA` (orden de §D-4.4): reinicio; el guardado siguiente, si sigue cambiando puntos o rúbrica, `TAREA_CON_CALIFICACIONES` | Uno por respuesta | Según la fila | — | — |

"Tu trabajo" del alumno no gana mutaciones: la calificación es de solo lectura y sigue las recargas que ya tenía.

### (3) Conteos (de `npx vitest list` y de la corrida, desde `frontend/`)

- `npx vitest list` (salida a un archivo; líneas con " > "): **2595 casos** en **170 archivos** (`awk -F' > ' 'NF>1{print $1}' | sort -u | wc -l`). La corrida de `npm run test` dice lo mismo: `Test Files  170 passed (170)` y `Tests  2595 passed (2595)`.
- Base al cierre de la ronda 0 de 01c (reporte del tester): 2536 casos en 166 archivos. **Nuevos: 59 casos en 4 archivos**, ninguno en archivos existentes:
  - `src/features/tareas/calificar-01c.test.tsx`: 35 (`grep -c "calificar-01c.test.tsx >"`)
  - `src/features/tareas/calificacion-01c.test.tsx`: 4
  - `src/features/tareas/estatico-01c.test.ts`: 7
  - `src/lib/format-01c.test.ts`: 13
  - 35 + 4 + 7 + 13 = 59; 2536 + 59 = 2595.
- Backend (`npm run test` desde `backend/`): `Test Files  216 passed (216)`, `Tests  2617 passed (2617)`, igual que al cierre de 01b (01c no toca el backend).
- `*.ataque`: 183 (`git ls-files -co --exclude-standard | grep -E '\.ataque\.test\.tsx?$' | wc -l`); sus SHA-256 son iguales a la tabla "al cierre de la ronda 0 de 01c" del reporte del tester (diff de las 183 filas sin diferencias de hash).

### (4) Verificación (comando exacto y última línea de salida no vacía), una suite a la vez

| Comando | Código | Última línea |
|---|---|---|
| `npm run lint` (desde `frontend/`) | 0 | `> tsc -b` (antes: `All matched files use Prettier code style!`) |
| `npm run test` (desde `frontend/`) | 0 | `Duration  107.31s (transform 27.05s, setup 72.94s, import 240.88s, tests 455.23s, environment 335.34s)`; resumen: `Test Files  170 passed (170)` · `Tests  2595 passed (2595)` |
| `npm run build` (desde `frontend/`) | 0 | `✓ built in 722ms` |
| `npm run test` (desde `backend/`, O-r0c-1; Docker Desktop 28.5.1 encendido; después de la del frontend) | 0 | `Duration  133.01s (transform 15.20s, setup 6.38s, import 254.82s, tests 1047.24s, environment 55ms)`; resumen: `Test Files  216 passed (216)` · `Tests  2617 passed (2617)` |

`build` de `shared/` y `prisma validate`: n/a (01c no toca `shared/` ni el esquema). Formateador: `npx prettier --write` solo sobre archivos de `frontend/src` de este encargo, desde `frontend/`.

### (5) Archivos

Nuevos (7): `frontend/src/services/calificacionesService.ts`; `frontend/src/features/tareas/components/panel-de-calificacion.tsx`; `frontend/src/features/tareas/components/calificacion-de-la-entrega.tsx`; las pruebas `frontend/src/features/tareas/calificar-01c.test.tsx`, `frontend/src/features/tareas/calificacion-01c.test.tsx`, `frontend/src/features/tareas/estatico-01c.test.ts` y `frontend/src/lib/format-01c.test.ts`.

Cambiados (9): `frontend/src/lib/format.ts` (`formatearPuntos`, `formatearPorcentaje`); `frontend/src/components/clase/data.ts` (`sinCategoria`); `frontend/src/features/tareas/types.ts`, `data.ts`, `lib.ts`, `hooks.ts`, `components/entrega-realizada.tsx`, `entrega-de-alumno-view.tsx`; `docs/DESIGN.md` (§7.24, §7.26 y §7.27 nueva, con la marca "propuesta (CALIFICACIONES-01c)").

### (6) "No se toca"

- Dentro de los paquetes, contra `<K1b>`: `git diff --stat 10e5a023dc1fc215112dbf7828ab4b32cfa036e1 -- frontend/src/services frontend/src/app frontend/src/styles frontend/src/components/ui frontend/src/components/layout frontend/src/components/adjuntos frontend/src/components/mensaje-error.tsx frontend/src/components/cargando.tsx frontend/src/components/estado-vacio.tsx frontend/src/components/estado-entrega-badge.tsx frontend/src/lib frontend/vitest.config.ts frontend/src/features/auth frontend/src/features/admin frontend/src/features/diagnostico frontend/src/features/clases backend shared` → solo `frontend/src/lib/format.ts` (A-4) y `frontend/src/styles/clases-r1.ataque.test.ts` (C-7 del tester en la ronda 0, A-5). Los archivos nuevos (`services/calificacionesService.ts`, A-4, y `lib/format-01c.test.ts`, la prueba de CAL-1C11 junto a su función) no salen en `git diff` porque no están rastreados; los declaro aquí. En `features/tareas` solo cambió lo que lista §D-12 (más las pruebas nuevas). `lib/estado-de-entrega.ts` sin cambio.
- Fuera de los paquetes, contra `<R>`: `git diff --stat d998282 -- AGENTS.md CLAUDE.md docs/ARCHITECTURE.md docs/ARCHITECTURE-ESSENTIALS.md docs/PRD.md .claude/agents infra backend/.env.example frontend/.env.example package.json package-lock.json frontend/package.json backend/package.json shared/package.json` → solo `docs/ARCHITECTURE-ESSENTIALS.md`, `docs/ARCHITECTURE.md` y `docs/PRD.md`, los documentos de A-6 que el orquestador aplicó y quedaron confirmados en `<K1a>` y `<K1b>`. Contra `<K1b>` los tres salen vacíos, y sus SHA-256 son los de `aprobacion.md`: ESSENTIALS `2ce262f4…0c98`, ARCHITECTURE `1092813b…5e93`, PRD `ee54d6fa…38e5`. `AGENTS.md`, `CLAUDE.md`, `.claude/agents`, `infra/`, `.env.example` y todos los `package.json`/`package-lock.json`: sin cambio.
- `docs/DESIGN.md` cambia por el paso 6 (A-6: lo escribe el programador en su subentrega).

### (7) §D-0.9 y las reglas R-1 a R-24 del reporte del tester

**Grep de §D-0.9** sobre los 11 archivos de producción nuevos o cambiados (`grep -nE "vidrio|data-material|data-densidad|disabled|\?\? *\[\]|fetch\(|console\.|_blank|perspectivaDeRuta\(|correo|estadoPago"`, texto crudo con comentarios): solo `features/tareas/hooks.ts:76` (`perspectivaDeRuta(pathname)`, código anterior de `useRutaDeLaClase`, el único llamador permitido en el módulo por R-20) y dos `refetch(` de `entrega-de-alumno-view.tsx` (no casan con `\bfetch\(`). En comentarios: vacío (lo fija CAL-1C13, con la única excepción anterior a 01c ya dicha).

| # | Cumplimiento | Lo confirma |
|---|---|---|
| R-1 | 56 `enEspera=`: 1 en `panel-de-calificacion.tsx` (el botón del formulario interno), 0 en `calificacion-de-la-entrega.tsx` y en la vista, 1 en `entrega-realizada.tsx` (sin cambio); ningún `disabled` en JSX; `aria-busy`/`aria-disabled` solo en `button.tsx` | V-06 (C-7) en verde |
| R-2 | Ninguna clase de vidrio ni `data-material`/`data-densidad` (el panel es un `Card`) | V-07 en verde |
| R-3 | Solo clases con tokens (`text-small`, `text-h3`, `text-body`, `font-bold`, `text-muted-foreground`, `text-foreground`, `gap-*`, `pt-1`, `wrap-anywhere`); sin colores sueltos, `focus:`, `ring-` ni `outline-*` | V-02 a V-05 en verde |
| R-4 | Sin `text-danger`/`text-destructive` en los `.tsx` nuevos (errores con `ErrorDeCampo`); sin `Toaster` ni `components/ui/sonner` | V-13 y la del `Toaster` en verde |
| R-5 | Ningún valor arbitrario con corchetes | `estatico-r1:138` en verde |
| R-6 | Sin `bg-background`, `fixed`, `animate-`, `href` escrito a mano ni `password` | `estatico-r1` en verde |
| R-7 | Vista, `hooks.ts`, `lib.ts`, `data.ts`, `types.ts`: sin `disabled`, `?? []`, `fetch(`, `console.`, `calificacion ??`/`||`, vidrio, `fixed`, `animate-`; importaciones relativas dentro del módulo | `entregas-01e-r1:741` en verde |
| R-8 | La vista sin `estadoPago`, `accesoRestringido`, `email`, `correo` ni `perspectivaDeRuta(` | `entregas-01e-r1:760` y CAL-1C13 |
| R-9 | `renovarTrasErrorDeLaEntrega(` sigue en 3; el gancho nuevo usa `pedirDeNuevoLaTarea` y `avisarDelErrorDeLaEntrega` | `entregas-01e-r1:766`, `-01e-r2:542`, `-01d-r2:784` y CAL-1C13 |
| R-10 | `useCalificarEntrega` no casa con `/MiEntrega|Hilo|Comentar|Entregar|Anular/` | `entregas-01d-r3:715` en verde |
| R-11 | `CODIGOS_QUE_REDIRIGE_EL_CLIENTE` sin cambio | `entregas-01d-r3:675` en verde |
| R-12 | Sin importaciones de `@/features/` ni relativas a otro módulo | `entregas-01e-r2:530`, `-01d-r2:770` en verde |
| R-13 | `entrega-realizada.tsx` solo declara `EntregaRealizadaProps`; sin almacenamiento del navegador | `entregas-01d-r1:882`, `:910` en verde |
| R-14 | `fetch(` solo en `apiClient.ts` y `almacenService.ts`; `_blank` solo en `lista-de-enlaces.tsx` | `entregas-01d-r1:896` en verde |
| R-15 | Sin `dangerouslySetInnerHTML` ni pictogramas en `features/tareas` | `tareas-01d-r1:504` en verde |
| R-16 | Sin escalas anuladas ni valores con corchetes | `tareas-01d-r2:524` en verde |
| R-17 | Tipos nuevos en `types.ts` (`EstadoDelPanel`, `TareaDeApertura`, `ResultadoDeCalificacion`, `TotalDelPanel`, `VariablesDeCalificar`); los componentes solo `…Props` (`FormularioDeCalificacionProps`, `PanelDeCalificacionProps`, `CalificacionDeLaEntregaProps`) | `tareas-01d-r3:398` y CAL-1C13 |
| R-18 | "Sin tema" solo en `components/clase/data.ts`; "Elige la categoría de la tarea." una vez | `tareas-01a-r1:316`, `:320` en verde |
| R-19 | `components/clase/data.ts`, `lib/format.ts` y el servicio nuevo no importan de `features/`; `TEXTOS_DE_LA_CLASE` se define una vez | `refactor-01c-r1:405`, `:417`, `:425` en verde |
| R-20 | Ningún llamador nuevo de `perspectivaDeRuta(`; la vista decide por la `perspectiva` de `useRutaDeLaClase`; sin "Administración" entre comillas | `estatico-02c-r1` en verde |
| R-21 | Mis pruebas no escriben "Vence…"; tienen el reloj fijo | `reloj-01e-r4:38` en verde |
| R-22 | El panel nunca escribe "Calificado" ni "Entregó el …"; el admin no tiene ningún `textbox` | `entregas-01e-r1:585`, `:605` en verde y CAL-1C08 |
| R-23 | "Tu entrega ya está calificada." sigue como texto completo de su `<p>` cuando hay `fechaEntrega` (no depende de `calificacion`) | `entregas-01d-r1:518`, `:587`, `-r2:364`, `:473` en verde y CAL-1C09 |
| R-24 | Sin las definiciones ni los caracteres que vigila el backend; el espacio de no separación de `formatearPorcentaje` va escrito como escape | `muro-c-r1:1122` y `muro-c-r2:321` en verde (suite del backend) |

### (8) Hermanos y estados vecinos de cada mecanismo nuevo

**Foco del panel** (efecto de montaje con `enfocarAlMontar`; `key={reinicios}`; `useFocoAlPerderseElControl` sin cambios):
- Primer montaje: `reinicios = 0`, no mueve el foco. Aplicado.
- Reinicio tras éxito: foco al `h3`. Aplicado y probado (CAL-1C03).
- Tras cada `409` (`ENTREGA_MODIFICADA`, `RUBRICA_MODIFICADA`, `ENTREGA_NO_CALIFICABLE`): foco al `h3`; con `ENTREGA_NO_CALIFICABLE` también, aunque el panel pase a la frase. Aplicado y probado (CAL-1C04, CAL-1C05, CAL-1C06).
- Dos `409` seguidos: el mismo camino. Probado (CAL-1C04, vecino).
- Recarga fallida (entrega o tarea): sin reinicio; el foco se queda donde estaba, nunca en `<body>`. Probado (CAL-1C04 y CAL-1C05, vecinos).
- Vista reemplazada (por la recarga o por el error del `PUT`): foco a la raíz. Probado (CAL-1C04 vecino, CAL-1C06 con `ALUMNO_NO_ENCONTRADO` y `TAREA_NO_ENCONTRADA`).
- "Volver a las entregas" durante la recarga: sin reinicio, sin aviso, sin errores en la consola. Probado (CAL-1C04, vecino).
- Recarga de fondo que quita el formulario con el foco dentro: foco a la raíz. Probado (CAL-1C14).

**Versión de apertura** (inicializadores perezosos de `FormularioDeCalificacion`):
- Formulario montado desde el principio y recarga de fondo de la entrega y de la tarea: el cuerpo lleva la versión, los puntos y la rúbrica de apertura y las etiquetas no cambian. Probado (CAL-1C01, cuerpo).
- Panel montado con la frase y recarga que vuelve calificable la entrega: el formulario nace con la versión de ese momento (N-03). Probado (CAL-1C14).
- Segundo `409` seguido: cada reinicio toma la versión de la recarga. Probado (CAL-1C04, vecino: cuerpos con 2 y 3, y después 4).
- Recarga fallida tras un `409`: la versión de apertura se conserva y el siguiente `PUT` la reenvía. Probado (CAL-1C04, vecino).
- Puntos que cambian sin rúbrica: el reinicio toma los nuevos y el cuerpo los lleva. Probado (CAL-1C05).

**Recarga tras un `409`** (N-11 es un hermano): la tarea se pide junto con la entrega con `RUBRICA_MODIFICADA` y con `ENTREGA_NO_CALIFICABLE` (`CODIGOS_QUE_RECARGAN_LA_TAREA_AL_CALIFICAR`). Con `ENTREGA_MODIFICADA`, solo la entrega: la tarea no decide ese conflicto. Aplicado.

**Aviso de recarga fallida**: aplica a la entrega. Con la tarea, el hermano ya tiene su aviso (`useAvisoDeRecargaFallida` de la vista), así que la vista no agrega el suyo (habría tres avisos). Con un error que reemplaza la vista o con que `apiClient` redirige, ninguno. Aplicado.

**Números** (`aNumeroDePuntos` y los rangos): punto y coma, espacios alrededor y ceros a la izquierda, en los tres campos de puntos (criterio, calificación directa y el total en vivo, que usa la misma función). Los dos formateadores (`formatearPuntos` y `formatearPorcentaje`) comparten `Intl.NumberFormat`. El singular "de 1 punto" se aplica a la etiqueta del criterio, a la de la calificación y al mensaje de rango. Aplicado.

**"Entregó" es tener `fechaEntrega`** (T-01): aplicado en "Tu trabajo" (`EntregaRealizada`) y en la entrega de un alumno (la frase "Todavía no entrega." de `fraseDeEntregaDeAlumno` ya dependía de la fecha). Hermanos que no toco (archivos de "No se toca"): `lib/estado-de-entrega.ts`, la insignia y la fila de "Trabajo de clase" muestran "Calificado" en una calificada sin entrega. Eso es correcto: el estado es `calificado` y la frase de "Tu trabajo" ya dice que no entregó. **No lo reporto como PA-03.**

### (9) Desviaciones del plan

1. **N-11 (precisión registrada):** `recargaLaTareaTrasConflicto` reemplaza a `esRubricaModificada` de §D-12.2, porque con N-11 la tarea se pide también con `ENTREGA_NO_CALIFICABLE`. Los códigos viven en `data.ts` (`CODIGOS_DE_CONFLICTO_DE_CALIFICACION` y `CODIGOS_QUE_RECARGAN_LA_TAREA_AL_CALIFICAR`).
2. **Aviso de la recarga fallida de la tarea (A6):** la fila de §D-14 dice "No pudimos cargar la entrega actual…". Si lo que falla es la tarea, el aviso que sale es el de `useAvisoDeRecargaFallida`, que ya existía en la vista. La vista no suma el suyo, para no dar tres avisos. Queda escrito en `DESIGN.md` §7.27 y lo cubre "CAL-1C05 (vecino)". Si el manager prefiere el texto de la entrega en ese caso, harían falta dos avisos de la tarea: lo dejo a su juicio.
3. **Ayudas de `lib.ts` no nombradas en §D-12.2:** `esErrorDeCampoDeCalificacion` (el gancho sabe que no debe avisar un error de campo) y `fraseDePuntaje` (el texto "Claridad: 4 de 5"). Son internas al módulo.
4. **Singular "de 1 punto":** en las etiquetas y en el mensaje de rango, con el mismo criterio de `puntosDeLaFila`. El plan solo da la forma plural.
5. **Foco al primer error:** se busca por el `name` del campo (`form.elements.namedItem`), no con un mapa de refs. ESLint (`react-hooks/refs`) rechazaba leer refs al registrar en el render.
6. **`claveGradebook(claseId, ventana)`:** la ventana es `{ cursor, cursorTareas }` (`string | null`), con la forma de `gradebookQuerySchema`. Si 01d la necesita de otra forma, ajusta solo esta clave.

### Pendientes y fuera de alcance detectados

- Ninguna PARADA (PA-02, PA-03 y PA-08 no aplicaron).
- 01d: `claveMisCalificaciones` y `claveGradebook` ya existen, sin usuarios todavía.
- N-26 / A-6 (del orquestador): la fila `tareas` y "Ubicaciones compartidas" de `CLAUDE.md` (`services/calificacionesService.ts`, `formatearPuntos`/`formatearPorcentaje` en `lib/format.ts`, `TEXTOS_DE_LA_CLASE.sinCategoria`). No los toqué.

## 01c — corrección de la verificación (M-06, N-28, N-29)

Atiende "## Verificación del resumen — CALIFICACIONES-01c" de `revision.md`. Solo cambia el frontend: un componente de §D-12 (`panel-de-calificacion.tsx`) y mi prueba de 01c (`calificar-01c.test.tsx`, dos casos nuevos; ningún caso existente cambió). No toqué ninguna `*.ataque`. `DESIGN.md` no cambia: §7.27 ("antes del formulario va la nota…"; "Una recarga de fondo no cambia lo escrito") ya describe lo que el código hace tras la corrección.

### Hallazgos
- **M-06 — corregido.** `PanelDeCalificacion` ya no tiene `contenido()`, que devolvía un fragmento `<>nota + formulario</>` en un caso y el formulario solo en otro. Ahora el `CardContent` tiene siempre los mismos cuatro hijos en el mismo orden:
  - el `h3`;
  - `{conNota && <p>nota</p>}`;
  - `{!calificable && <p>frase</p>}`;
  - `{calificable && <FormularioDeCalificacion …/>}`.

  `calificable` es `sePuedeCalificar(entrega, tarea, new Date())` y `conNota` es `calificable && entrega.estado === "asignado"`. El formulario ocupa siempre la cuarta posición, sin `key` propia y con el mismo padre. Así, la nota aparece o desaparece sin que el formulario se vuelva a montar. Mientras `calificable` sea verdadero, cualquier recarga de fondo conserva lo escrito y la versión, los puntos y la rúbrica de apertura, y el guardado siguiente recibe el `409` (A2).

  Lo que el manager dejó a mi criterio: la nota sigue el estado actual de la entrega. Desaparece si la entrega pasa a `calificado` y aparece si pasa a `asignado` cerrada. Tras el reinicio por `409`, el panel muestra lo que corresponde al estado nuevo.

  Quité el import `ReactNode`, que ya no se usaba, y agregué un comentario JSX con el porqué. No tiene palabras de §D-0.9, y CAL-1C13 sigue en verde.
- **N-28 — corregido aquí.** El encabezado de la sección (2) de "01c — implementación" dice "24 filas", pero la matriz tenía **28** (A1–A13, B1–B5, C1–C4, D1–D3, E1–E3). Con la fila B6 de abajo tiene **29**. No reescribo la sección anterior.
- **N-29 — precisado.** Solo cambia el texto: no encontré un defecto real. Así queda la fila A8: "La recarga tras un `409` trae un error con el que `apiClient` redirige. Si es la **entrega**, la vista no avisa (`errorQueRedirigeElCliente`). Si es la **tarea** (tras `RUBRICA_MODIFICADA` o `ENTREGA_NO_CALIFICABLE`), `useAvisoDeRecargaFallida` (de ENTREGAS-01e, sin cambios) sí llama a su aviso, porque no excluye los códigos que redirigen. Ese aviso no se llega a ver, porque `irA` es `window.location.assign` y la página se recarga. Lo que se ve es solo el aviso del `409`. Si algún día `irA` navega dentro de la SPA, hay que excluir esos códigos en el gancho." Lo comprobé en `entrega-de-alumno-view.tsx`. La condición del gancho es `tarea.isError && hayTarea && !errorQueReemplazaLaVista(hayTarea, tarea.error)`, y ningún código de redirección reemplaza la vista, así que el gancho está activo. Como la página se recarga, eso no tiene efecto visible.

### Diff resumido
- `frontend/src/features/tareas/components/panel-de-calificacion.tsx`: `contenido()` se reemplaza por `calificable`, `conNota` y los tres hijos condicionales, cada uno en una posición fija del `CardContent`. Se agrega el comentario de M-06 y se quita `type ReactNode` del import. `FormularioDeCalificacion` no cambia.
- `frontend/src/features/tareas/calificar-01c.test.tsx`: dos casos nuevos al final del `describe` de CAL-1C14.

### Pruebas nuevas (archivo y título exacto)
- `frontend/src/features/tareas/calificar-01c.test.tsx` › "la versión de apertura cuando el formulario aparece o desaparece (CAL-1C14)" › **"CAL-1C14b: con la nota y el formulario a la vista (asignado cerrada, versión 0) y lo escrito, una recarga de fondo trae la entrega calificada con versión 1; el formulario no se vuelve a montar, lo escrito, el foco y las etiquetas siguen, y el guardado envía version: 0, recibe 409 ENTREGA_MODIFICADA, recarga una vez y el foco va al h3"**.
  - Precondición: hubo dos `GET` de la entrega, así que la recarga llegó.
  - Tras la recarga: la nota desaparece y el campo "Claridad" y el `<form>` son **el mismo nodo** (`toBe`) que antes. El foco sigue en "Claridad" y los tres valores se conservan ("4", "3", "Lo que escribí"). Las etiquetas no cambian ("Claridad (de 5 puntos)", "Ortografía (de 4 puntos)"), el botón sigue siendo "Calificar y devolver" y no sale ningún aviso.
  - Tras el guardado: el cuerpo lleva `version: 0` y sale un solo aviso, el de `ENTREGA_MODIFICADA`. Hay exactamente un `GET` más de la entrega y ninguno de la tarea. Aparece "Actualizar calificación", el foco va al `h3` y el comentario queda vacío (reinicio).
- Mismo archivo y `describe` › **"CAL-1C14b (vecino): con el formulario a la vista (entregada, versión 2) y lo escrito, una recarga de fondo trae la entrega asignada y cerrada con versión 3; la nota aparece, el formulario no se vuelve a montar y el guardado envía version: 2"**. Es el camino inverso: la nota aparece.
- **Los dos casos distinguen el defecto.** En una copia de trabajo volví a poner el remontaje: el formulario en dos posiciones distintas según `conNota`. Con eso, los dos casos fallaron (`Tests  2 failed | 35 passed (37)`). Después restauré el archivo, y `git diff --no-index` contra la copia guardada en el scratchpad no mostró diferencias.

### Fila nueva de la matriz de §D-14 (B · consulta de la entrega, recargas de fondo)

| # | Disparador y respuesta | Qué se renueva | Aviso | Foco | En vuelo / desmontada |
|---|---|---|---|---|---|
| B6 | Recarga de fondo que deja la entrega calificable pero cambia si lleva la nota de entrega cerrada, con el formulario a la vista (M-06). Puede ser de `asignado` cerrada a `calificado` (otro maestro, u otra pestaña, calificó a quien no entregó) o de `entregado` a `asignado` cerrada | La consulta se actualiza y la nota aparece o desaparece. El formulario **no** se vuelve a montar: ocupa la misma posición entre los hijos del `CardContent`. Lo escrito, la versión, los puntos, la rúbrica y el texto del botón siguen siendo los de apertura | Ninguno | Sin cambio: el campo que tenía el foco lo conserva | El guardado siguiente envía la versión de apertura y recibe `409 ENTREGA_MODIFICADA` (A2): un aviso, un `GET` de la entrega, reinicio y foco al `h3` (CAL-1C14b y su vecino) |

Con B6, la matriz tiene 29 filas (A1–A13, B1–B6, C1–C4, D1–D3, E1–E3).

### Hermanos y estados vecinos: los cambios de forma del árbol del panel con el formulario a la vista
El mecanismo es la suma de dos cosas: los inicializadores perezosos de `FormularioDeCalificacion` (`apertura`, `estado`) y su identidad en el árbol (tipo, posición entre los hijos y `key`).

| # | Estado o camino | ¿Remontaba antes? | ¿Remonta ahora? | ¿Debe? | Prueba |
|---|---|---|---|---|---|
| 1 | `asignado` cerrada → `calificado` (otro maestro u otra pestaña) | **Sí (M-06)** | No | No | CAL-1C14b |
| 2 | `entregado` → `asignado` cerrada (el alumno anula su entrega) | **Sí**: el mismo defecto al revés (aparecía el fragmento) | No | No | CAL-1C14b (vecino) |
| 3 | `calificado` → `asignado` por una anulación de la calificación | — | — | No aplica: el producto no permite anular una calificación. Si llegara a `asignado` cerrada, sería el caso 2; si llegara abierta, el caso 7 | Sin caso (no se puede alcanzar) |
| 4 | `entregado` → `calificado` por otra persona | No: el formulario era el único hijo y lo sigue siendo | No | No | Mismo camino que CAL-1C01 (recarga con otra versión y la misma rama). Sin caso propio, porque el árbol no cambia de forma |
| 5 | `entregado` con retraso → sin retraso (o al revés) por un cambio de la fecha límite | No: el panel no lee `conRetraso`, y con `entregado` `sePuedeCalificar` es verdadero sea cual sea la fecha | No | No | CAL-1C01: la tarea cambia en una recarga de fondo y el formulario sigue. Sin caso propio |
| 6 | Cambian los puntos o la rúbrica de la tarea con el formulario abierto (M-02) | No | No | No: las etiquetas y el cuerpo siguen siendo los de apertura, y el guardado da `RUBRICA_MODIFICADA` | CAL-1C01 (etiquetas y cuerpo de apertura) y CAL-1C05 (el `409` reinicia con los nuevos) |
| 7 | Formulario → frase: la entrega deja de ser calificable (se anula antes de la fecha, o la tarea pasa a aceptar tardías o mueve la fecha a futuro) | Se desmonta | Se desmonta | **Sí**: ya no es calificable. Si el foco estaba dentro, va a la raíz | CAL-1C14 (2.º caso) y CAL-1C06 (N-11, tras el `409`) |
| 8 | Frase → formulario (N-03) | Se monta | Se monta | **Sí**: el formulario no estaba y nace con la versión de ese momento | CAL-1C14 (1.er caso) |
| 9 | Reinicio por la vista (`key={reinicios}` tras un `200`, o tras un `409` con recarga) | Sí | Sí | **Sí**: es el reinicio buscado | CAL-1C03, CAL-1C04, CAL-1C05 y CAL-1C06 |
| 10 | Recarga que reemplaza la vista (`404`/`403`) | Se desmonta todo | Igual | **Sí** (B4 y C4) | CAL-1C04 (vecino) y CAL-1C06 |
| 11 | Recarga con 5xx o sin red, con datos en caché (B5, C3) | No: `Cargando` solo sale cuando no hay datos | No | No | CAL-1C04 y CAL-1C05 (vecinos: lo escrito se conserva) |
| 12 | Pasa la fecha límite con la vista abierta (`new Date()` en el render) | Solo cuando se vuelve a pintar; con `asignado`, es frase → formulario (caso 8) | Igual | **Sí** (caso 8) | Sin caso propio: es el mismo camino que el caso 8 |

También revisé los envoltorios condicionales de `entrega-de-alumno-view.tsx`:
- **Raíz y `contenido()`:** la raíz `<div ref={raizRef}>` es fija. En `contenido()`, el error y la carga reemplazan la vista entera (B4, C4), y la carga solo sale cuando no hay datos.
- **El `div` de datos:** sus hijos son fijos: el `Card` de la entrega, `calificacion(…)` y el hilo. `{entrega.enlaces.length > 0 && …}` vive dentro del primer `Card` y no mueve al panel.
- **`calificacion()`:** su rama depende solo de `perspectiva`, que no cambia con una recarga. La única `key` del panel es `reinicios`.
- **Dentro de `FormularioDeCalificacion`:** lo que cambia la forma (los criterios y `conRubrica`) sale de `apertura.tarea`, que no cambia con una recarga.

No encontré otro lugar de 01c donde algo que vive en un inicializador perezoso cambie de lugar en el árbol.

**Agregado a la lista de hermanos de "Versión de apertura" (sección (8) de 01c):** "Formulario montado con la nota (`asignado` cerrada) y recarga de fondo que trae `calificado`, o al revés. La nota aparece o desaparece y el formulario conserva su identidad, con lo escrito y la versión de apertura; el guardado siguiente recibe un `409`. Aplicado y probado (CAL-1C14b y su vecino)."

### Verificación (en `frontend/`, una a la vez; el backend no cambia y no lo corrí)
| Comando | Código | Última línea |
|---|---|---|
| `npm run lint` | 0 | `> tsc -b` (antes: `All matched files use Prettier code style!`) |
| `npm run test` | 0 | `Duration  105.85s (transform 24.19s, setup 71.18s, import 235.07s, tests 449.64s, environment 331.42s)`; `Test Files  170 passed (170)` · `Tests  2597 passed (2597)`; `grep -c "Test timed out"` = 0 |
| `npm run build` | 0 | `✓ built in 704ms` |

### Conteos (desde `frontend/`)
- `npx vitest list > list.txt; grep -c " > " list.txt` → **2597** casos (2595 + 2).
- `awk -F' > ' 'NF>1{print $1}' list.txt | sort -u | wc -l` → **170** archivos (ninguno nuevo).
- `grep -c "calificar-01c.test.tsx >" list.txt` → **37** (35 + 2). Los otros tres archivos nuevos de 01c no cambian (4, 7 y 13).

### "No se toca"
- `git diff --stat 10e5a023dc1fc215112dbf7828ab4b32cfa036e1 -- frontend backend shared` → `9 files changed, 485 insertions(+), 9 deletions(-)`. Son los mismos nueve archivos rastreados de la implementación: `components/clase/data.ts`, `lib/format.ts`, los seis de `features/tareas` y `styles/clases-r1.ataque.test.ts` (este último de C-7 del tester). `git diff --stat 10e5a02… -- backend shared` sale vacío.
- `git status --short frontend backend shared` muestra los mismos 7 archivos no rastreados de la implementación. Esta corrección solo cambió dos: `panel-de-calificacion.tsx` y `calificar-01c.test.tsx`.
- `*.ataque`: no toqué ninguna. La única que difiere de `<K1b>` sigue siendo `styles/clases-r1.ataque.test.ts` (C-7), igual que en la implementación.

### Desviaciones del plan
Ninguna. El caso nuevo lleva el id que sugirió el manager (`CAL-1C14b`), y su vecino, el mismo id con "(vecino)".

## 01c — corrección de la ronda 1 (T-02, T-03, N-31)
Base: "## Ronda 1 de 01c" de `reporte-tester.md` (T-02 y T-03, los dos de severidad baja) y N-31 de `revision.md`. No toqué ninguna `*.ataque`, `shared/`, el backend, `lib/errores-de-api.ts` ni pruebas normales ajenas a 01c. No abrí navegadores ni hice commit.

### Hallazgos
- **T-02 — corregido.** La regla vive en el gancho, que ahora calla solo si el panel **sí** puede pintar el error: aplica `erroresDeCalificacionDeApi` con los criterios del envío (los `criterioId` de `cuerpo.puntajes`, en su orden, que son los de la rúbrica de apertura del panel). Si el panel no tiene ese campo, el gancho da **un** aviso con el mensaje del servidor sin el prefijo de campo. El panel no cambia de lógica: con `null` sale sin pintar nada (sin reinicio, lo escrito se conserva) y el `finally` saca el botón de la espera. Como el gancho y el panel deciden con la misma función y los mismos criterios, nunca hay dos avisos ni cero. `erroresDeCalificacionDeApi` ahora devuelve `null` para `calificacion:` en una tarea con rúbrica (antes devolvía una llave sin campo).
- **T-03 — corregido.** En `entrega-de-alumno-view.tsx`, la condición que se pasa a `useAvisoDeRecargaFallida` suma dos guardas: `!consulta.isFetching` (mientras la entrega se vuelve a pedir, el aviso de la tarea espera a saber si la entrega reemplaza la vista; tras un `409` las dos van a la vez y llegan en cualquier orden) y `!entregaReemplazaLaVista` (la misma regla con que `contenido()` reemplaza la vista por la entrega). El gancho `useAvisoDeRecargaFallida` no cambia, y TAREAS ("Tu trabajo" y el detalle) no cambian. Las pruebas de TAREAS y ENTREGAS siguen en verde sin cambiar de resultado (corrida completa abajo); PA-02 no aplica.
- **N-31 — corregido (solo texto).** `docs/DESIGN.md` §7.27, "Nota de entrega cerrada": ahora dice que la nota va "mientras la entrega de quien no entregó sigue sin calificar (estado `asignado`, con la entrega cerrada)" y que, una vez calificada (al actualizar su calificación), ya no sale. La marca "propuesta (CALIFICACIONES-01c)" del encabezado de §7.27 se conserva. Sin cambio de código.

### Diff resumido por archivo
- `frontend/src/features/tareas/lib.ts`: nueva `mensajeDelCampoDeCalificacion(error): string | null` (el mensaje sin el prefijo `puntajes.<i>.puntos:`, `calificacion:` o `comentario:`, o el genérico si queda vacío; `null` si no es un error de campo de calificar). En `erroresDeCalificacionDeApi`, una línea: `calificacion:` con criterios enviados da `null`. Comentarios actualizados.
- `frontend/src/features/tareas/hooks.ts` (`useCalificarEntrega`, `onError`): recibe `{ cuerpo }`. Tras `pedirDeNuevoLaTarea`: si redirige, nada; si `erroresDeCalificacionDeApi(error, criteriosDelCuerpo) !== null`, nada (lo pinta el panel); si `mensajeDelCampoDeCalificacion(error) !== null`, `toast.error` con ese mensaje; si no, `avisarDelErrorDeLaEntrega` como antes. Importa `erroresDeCalificacionDeApi` y `mensajeDelCampoDeCalificacion` en lugar de `esErrorDeCampoDeCalificacion`, que sigue en `lib.ts` y la usa `mensajeDelCampoDeCalificacion`. Comentario de cabecera actualizado.
- `frontend/src/features/tareas/entrega-de-alumno-view.tsx`: `entregaReemplazaLaVista` y las dos guardas en `activo` de `useAvisoDeRecargaFallida`; comentario de `recargarTrasConflicto` actualizado.
- `frontend/src/features/tareas/components/panel-de-calificacion.tsx`: solo el comentario del `catch`.
- `frontend/src/features/tareas/calificar-01c.test.tsx` (mío de 01c): dos `describe` nuevos (12 casos) entre el de CAL-1C06 y el de CAL-1C07. No cambié ningún caso existente.
- `docs/DESIGN.md`: N-31.
- Sin textos nuevos en `data.ts`: el aviso de T-02 es el mensaje del servidor (o `MENSAJES_ERROR_TAREAS.generico`, que ya existía).

### Pruebas nuevas (archivo y título exacto)
Todas en `frontend/src/features/tareas/calificar-01c.test.tsx`.

`describe` "400 VALIDACION de un campo que el panel no tiene (CAL-1C06b)" (T-02):
- "CAL-1C06b: puntajes.<i>.puntos fuera de la rúbrica enviada da un solo aviso con el mensaje del servidor, ningún ErrorDeCampo, lo escrito se conserva sin reinicio y el botón vuelve a estar disponible con el foco"
- "CAL-1C06b: calificacion en una tarea con rúbrica da un solo aviso con el mensaje del servidor, ningún ErrorDeCampo, lo escrito se conserva sin reinicio y el botón vuelve a estar disponible con el foco"
- "CAL-1C06b: un VALIDACION sin prefijo de un campo del panel da un solo aviso con el mensaje del servidor, ningún ErrorDeCampo, lo escrito se conserva sin reinicio y el botón vuelve a estar disponible con el foco"
- "CAL-1C06b (vecino): un 400 «comentario: …» sin comentario escrito se pinta bajo el comentario, sin aviso"
- "CAL-1C06b (vecino): un 400 «calificacion: …» en una tarea sin rúbrica se pinta bajo «Calificación», sin aviso"

`describe` "recargas con la tarea y la entrega fallidas a la vez (CAL-1C06c)" (T-03):
- "CAL-1C06c: tras un 409 RUBRICA_MODIFICADA, con la tarea en 500 ERROR_INTERNO y la entrega en 403 SIN_ACCESO_A_LA_CLASE, la vista se reemplaza, el foco va a la raíz y el único aviso es el del 409"
- "CAL-1C06c: tras un 409 ENTREGA_NO_CALIFICABLE, con la tarea en 500 ERROR_INTERNO y la entrega en 403 SIN_ACCESO_A_LA_CLASE, la vista se reemplaza, el foco va a la raíz y el único aviso es el del 409"
- "CAL-1C06c: tras un 409 RUBRICA_MODIFICADA, con la tarea en 404 TAREA_NO_ENCONTRADA y la entrega en 500 ERROR_INTERNO, la vista se reemplaza, el foco va a la raíz y el único aviso es el del 409"
- "CAL-1C06c: tras un 409 ENTREGA_NO_CALIFICABLE, con la tarea en 404 TAREA_NO_ENCONTRADA y la entrega en 500 ERROR_INTERNO, la vista se reemplaza, el foco va a la raíz y el único aviso es el del 409"
- "CAL-1C06c: tras un 409 RUBRICA_MODIFICADA, con la tarea en 404 TAREA_NO_ENCONTRADA y la entrega en 404 ALUMNO_NO_ENCONTRADO, la vista se reemplaza, el foco va a la raíz y el único aviso es el del 409"
- "CAL-1C06c (vecino): una recarga de fondo con la tarea en 5xx y la entrega en 404 reemplaza la vista sin ningún aviso"
- "CAL-1C06c (vecino): una recarga de fondo con la tarea en 5xx y la entrega buena sigue dando un solo aviso de la tarea y deja ver la última versión"

El caso tarea 5xx + entrega 404 tras el `409` lo cubre CAL-T-91 del tester (2 códigos), que no toqué y ahora pasa.

**Los casos distinguen el defecto.** En una copia de trabajo devolví el gancho a callar con cualquier error con prefijo de campo y quité las dos guardas de la vista. Con eso fallaron 5 de los 12 (`Tests  5 failed | 44 passed (49)`): los dos primeros de CAL-1C06b, los dos de `403` de CAL-1C06c y el vecino de fondo con `404`. Los otros 7 fijan estados vecinos que ya funcionaban y deben seguir así. Restauré los dos archivos desde la copia del scratchpad y volví a correr el archivo (`Tests  49 passed (49)`).

### Filas de la matriz de §D-14 nuevas o cambiadas
**Cambiadas:**
| # | Clase de respuesta | Qué se renueva | Aviso (uno) | Foco | En vuelo a la vez | Con la vista desmontada |
|---|---|---|---|---|---|---|
| A6 | La recarga de la **tarea** tras `RUBRICA_MODIFICADA` o `ENTREGA_NO_CALIFICABLE` falla (red o 5xx) **y la entrega no reemplaza la vista** (responde, o falla con red o 5xx) | Nada: sin reinicio; lo escrito y los puntos y la rúbrica de apertura se conservan | El de `useAvisoDeRecargaFallida`: "No pudimos actualizar la tarea. Mostramos la última versión que tenemos." (dos en total con el del `409`). Sale cuando la entrega termina de responder (`!consulta.isFetching`) | Se queda | Igual que A5 | — |
| A7 | La recarga tras un `409` trae `404 TAREA_NO_ENCONTRADA`, `404 ALUMNO_NO_ENCONTRADO` o `403 SIN_ACCESO_A_LA_CLASE` en la tarea o en la entrega, **sea cual sea la respuesta de la otra lectura** (buena, 5xx o red, u otro `404`/`403`) (T-03) | La vista se reemplaza por su mensaje (la tarea manda si las dos lo reemplazan) | Solo el del `409`: ni el de la entrega (`errorQueReemplazaLaVista`) ni el de la recarga fallida de la tarea (`!entregaReemplazaLaVista`) | La raíz (`useFocoAlPerderseElControl`) | — | — |
| A9 | `400 VALIDACION` de un campo **que el panel tiene** (`puntajes.<i>.puntos` con `i` dentro del envío, `calificacion` sin rúbrica, `comentario` siempre) | Nada | Ninguno: `ErrorDeCampo` bajo el campo | El primer campo con error | — | Ninguno |
| C3 | Recarga de la tarea con 5xx o red, con la tarea en caché | Sin cambio en el panel | El de `useAvisoDeRecargaFallida`, **cuando la entrega no está recargándose y no reemplaza la vista** (si coincide con una recarga de la entrega, espera a que termine) | Sin cambio | — | — |

**Nuevas:**
| # | Clase de respuesta | Qué se renueva | Aviso (uno) | Foco | En vuelo a la vez | Con la vista desmontada |
|---|---|---|---|---|---|---|
| A14 | `400 VALIDACION` de un campo **que el panel no tiene** (`puntajes.<i>.puntos` con `i` fuera del envío, `calificacion` con rúbrica) (T-02) | Nada: sin reinicio; lo escrito y la versión de apertura se conservan | Uno, del gancho, con el mensaje del servidor sin el prefijo de campo | Se queda en el botón, que sale de la espera | Doble clic = un `PUT` (sin cambio) | El aviso sale (gancho) |

| # | Disparador y respuesta | Qué se renueva | Aviso | Foco | En vuelo / desmontada |
|---|---|---|---|---|---|
| C5 | Recarga de fondo de la tarea con 5xx o red **mientras la entrega reemplaza la vista** (`404 ALUMNO_NO_ENCONTRADO` o `403`) (hermano de T-03 que señaló el tester, de ENTREGAS-01e) | La vista se reemplaza por el mensaje de la entrega | Ninguno | La raíz | — |

Con A14 y C5, la matriz tiene **31 filas** (A1–A14, B1–B6, C1–C5, D1–D3, E1–E3). A8 no cambia (N-29: un código que redirige en la tarea sigue llamando al aviso, que no se llega a ver porque `irA` recarga la página).

### Hermanos y estados vecinos
**T-02 (`400 VALIDACION` de calificar):**
| Hermano o estado | ¿Aplica el remedio? | ¿Aplicado? | Caso |
|---|---|---|---|
| `puntajes.<i>.puntos` con `i` fuera del envío | Sí | Sí: un aviso | CAL-T-77; CAL-1C06b (puntajes) |
| `calificacion:` en una tarea con rúbrica | Sí | Sí: `erroresDeCalificacionDeApi` da `null` y el gancho avisa | CAL-T-78; CAL-1C06b (calificacion) |
| `calificacion:` en una tarea sin rúbrica | No (sí se pinta) | Sigue sin aviso, bajo "Calificación" | CAL-1C06b (vecino) sin rúbrica |
| `comentario:` sin comentario escrito | No: el `Textarea` del comentario siempre está en el panel, así que se pinta | Sigue sin aviso, bajo el comentario | CAL-1C06b (vecino) comentario; CAL-T-76 con comentario |
| `puntajes.<i>.puntos` con `i` dentro del envío | No (se pinta) | Sin cambio | CAL-1C06; CAL-T-75 |
| `VALIDACION` sin prefijo de un campo del panel (`version:`, `puntosDeLaTarea:`, `puntajes.<i>.criterioId:`, sin prefijo) | Ya avisaba (`avisarDelErrorDeLaEntrega`, con `mensajeDeErrorTareas`) | Sin cambio | CAL-1C06b (sin prefijo, con `version:`) |
| `VALIDACION` con dos campos, uno pintable y otro no | No se puede dar: el servidor manda solo la primera incidencia (`backend/src/handlers/validacion.ts`, `issues[0]`, un solo prefijo `campo: mensaje`). Si llegara un texto con dos, decide el primer prefijo: si es pintable se pinta todo el resto como mensaje; si no, un aviso | No hace falta código | Sin caso (inalcanzable) |
| `VALIDACION` de `claseId`/`tareaId`/`alumnoId` (A13) | No: no es un campo de calificar; sigue con `mensajeDeErrorTareas` | Sin cambio | — |
| Con la vista desmontada | Sí: la regla está en el gancho, así que el aviso de un campo sin lugar sale aunque el panel ya no esté | Sí | — (A14) |
| Formulario de tarea (`erroresDeLaTareaDeApi`) | No aplica: el gancho (`useCrearTarea`/`useEditarTarea`) y el formulario usan la misma función; un campo fuera de `CAMPOS_DEL_FORMULARIO` da `null` en los dos y el gancho avisa; una fila de la rúbrica fuera del envío pasa a error de la rúbrica entera (`erroresConLlavesDeFila`, T-06/T-10). Todos los campos de la lista se pintan siempre (los selectores de categoría y tema se muestran aunque la clase no tenga) | No hace falta | — |
| Formulario de entrega (`errorDeEnlacesDeApi`) y hilo (`errorDeTextoDeApi`) | No aplica: el gancho y el formulario usan la misma función, y el grupo de enlaces y el campo del texto siempre están (`enlaces.<i>` se pinta en el grupo, no por posición) | No hace falta | — |
| `erroresPorCampo` de `lib/errores-de-api.ts` ("No se toca") | No aplica: traduce incidencias de `safeParse` del cliente, no un `VALIDACION` del servidor, y en `features/tareas` no se usa (grep sin resultados fuera de pruebas). Nada que registrar como pendiente | — | — |

**T-03 (recarga fallida de la tarea cuando la entrega reemplaza la vista):**
| Estado o camino | ¿Aplica? | ¿Aplicado? | Avisos | Caso |
|---|---|---|---|---|
| Tras `409`: tarea 5xx + entrega 404 | Sí | Sí | Solo el del `409` | CAL-T-91 (2 códigos) |
| Tras `409`: tarea 5xx + entrega `403 SIN_ACCESO_A_LA_CLASE` | Sí | Sí | Solo el del `409` | CAL-1C06c (`403`, 2 códigos) |
| Tras `409`: tarea 404 + entrega 5xx | No hacía falta: la tarea reemplaza la vista, así que el aviso de recarga de la tarea no se activaba, y `recargarTrasConflicto` sale callada | Sin cambio | Solo el del `409` | CAL-1C06c (2 códigos); CAL-T-84 |
| Tras `409`: las dos 404 | No hacía falta (la tarea reemplaza) | Sin cambio | Solo el del `409` | CAL-1C06c (las dos `404`) |
| Tras `409`: las dos 5xx | No: ninguna reemplaza la vista | Sin cambio | Dos: el del `409` y el de la recarga de la tarea | CAL-1C04 (vecino) de 5xx en la entrega; CAL-T-82 |
| Tras `409`: tarea 5xx + entrega buena | No | Sin cambio (el aviso espera a que la entrega responda) | Dos | CAL-1C05 (vecino) |
| Tras `409`: tarea buena + entrega 5xx | No | Sin cambio | Dos (el de la entrega) | CAL-T-83 |
| Tras `409`: tarea con un código que redirige (N-29) | No: sigue A8 sin cambio; el aviso no se llega a ver porque la página se recarga | No | — | — |
| Tras `409`: entrega con un código que redirige y tarea 5xx | El mismo caso que N-29, del lado de la entrega: un código que redirige no reemplaza la vista, así que el aviso de la tarea se activaría y tampoco se llega a ver (recarga de página). No lo cambié para no salir del alcance; mismo destino que N-29 si `irA` deja de recargar | No | — | — |
| `ENTREGA_MODIFICADA` | No aplica: solo pide la entrega; la tarea no se recarga, así que su aviso no se activa por este camino. Si la entrega trae 404/403, la vista se reemplaza con un solo aviso | Sin cambio | Solo el del `409` | CAL-1C04 (vecino) 404 del alumno |
| Recarga de fondo: tarea 5xx + entrega 404 (hermano de ENTREGAS-01e que señaló el tester) | Sí: es la misma condición del gancho en esta vista | Sí (C5) | Ninguno | CAL-1C06c (vecino) de fondo con `404` |
| Recarga de fondo: tarea 5xx + entrega buena | No | Sin cambio | Uno, el de la tarea | CAL-1C06c (vecino) de fondo con la entrega buena |
| Error de la tarea ya avisado y en caché, nueva recarga de la entrega | No cambia: la marca `errorUpdateCount:errorUpdatedAt` del gancho evita repetir el aviso cuando `activo` vuelve a ser verdadero | Sin cambio | — | — |
| Descarga de un adjunto (`alFallarLaDescarga`) | No aplica: es la función que devuelve el mismo gancho y no depende de `activo` | Sin cambio | — | — |
| "Tu trabajo" y el detalle de la tarea (otras vistas con `useAvisoDeRecargaFallida`) | No aplica: no cambié el gancho ni su llamada en esas vistas | Sin cambio | — | Las pruebas de TAREAS y ENTREGAS siguen en verde |

### Verificación (en `frontend/`, una a la vez; el backend no cambia y no lo corrí)
| Comando | Código | Última línea |
|---|---|---|
| `npm run lint` | 0 | `> tsc -b` (antes: `All matched files use Prettier code style!`) |
| `npm run test` | 0 | `Duration  107.90s (transform 29.46s, setup 71.79s, import 247.21s, tests 453.40s, environment 333.99s)`; `Test Files  174 passed (174)` · `Tests  2699 passed (2699)`; `grep -c "Test timed out"` = 0 |
| `npm run build` | 0 | `✓ built in 1.48s` |

Los 4 rojos del tester (CAL-T-77, CAL-T-78 y los 2 de CAL-T-91) pasaron a verde. Nada más cambió de resultado: antes eran `Tests  4 failed | 2683 passed (2687)`; ahora son 2687 + 12 nuevos = 2699 en verde. Formateé con `npx prettier --write` solo los 5 archivos que toqué de `frontend/`.

### Conteos (desde `frontend/`)
- `npx vitest list > list.txt; grep -c " > " list.txt` → **2699** casos (2687 + 12).
- `cut -d'>' -f1 list.txt | sort -u | grep -c test` → **174** archivos (ninguno nuevo).
- `grep -c "calificar-01c.test.tsx >" list.txt` → **49** (37 + 12); `grep -c "1C06[bc]" list.txt` → **12**.

### "No se toca"
- `git diff --stat 10e5a023dc1fc215112dbf7828ab4b32cfa036e1 -- frontend backend shared` → `9 files changed, 520 insertions(+), 10 deletions(-)`. Son los mismos nueve archivos rastreados de la implementación. Esta corrección cambió tres de ellos (`entrega-de-alumno-view.tsx`, `hooks.ts` y `lib.ts`). Nada en `backend/` ni en `shared/`.
- `git status --short frontend backend shared`: 11 no rastreados (los 7 de la implementación y las 4 `*.ataque` de la ronda 1 del tester). Esta corrección cambió dos: `panel-de-calificacion.tsx` (solo el comentario) y `calificar-01c.test.tsx`.
- `*.ataque`: no toqué ninguna. `sha256sum` de las 187 contra la tabla "al cierre de la ronda 1 de 01c" de `reporte-tester.md`: los 187 hashes son iguales. La única diferencia de `diff` es la ruta `apiClient` en minúsculas de la tabla.
- `lib/errores-de-api.ts`: sin cambios.

### Desviaciones del plan
Ninguna.

### Pendientes y fuera de alcance detectados
- **`DESIGN.md` §7.27, "Otros errores":** dice "un error de un campo se marca bajo ese campo, sin aviso". Con T-02, un error de un campo que el panel no tiene da un aviso. No lo cambié porque el encargo limitaba el cambio de `DESIGN.md` a N-31. Propongo que el manager decida si se precisa ahí ("…de un campo del panel…; si el panel no lo tiene, un aviso con el mensaje del servidor").
- **Entrega con un código que redirige y tarea en 5xx tras un `409`:** es el mismo caso que N-29, del lado de la entrega. No tiene efecto visible mientras `irA` recargue la página.

## 01c — corrección de la verificación (M-07, N-34)
Base: "## Verificación de la corrección de la ronda 1 — CALIFICACIONES-01c" de `revision.md` (M-07 bloquea, N-34 por el carril trivial). No toqué ninguna `*.ataque`, `shared/`, el backend ni pruebas normales existentes (solo agregué casos nuevos a mi archivo de 01c). No abrí navegadores, no terminé procesos ni hice commit.

### Hallazgos
- **M-07 — corregido.** `useAvisoDeRecargaFallida` (`features/tareas/hooks.ts`, §D-12.4) gana un sexto parámetro opcional `callado = false`: "hay un fallo de la tarea a la vista que esta vista no anuncia". Si la vista se desmonta (o cambia de tarea) con el fallo callado, el gancho lo marca en `ultimoFalloAvisado` sin aviso (consumido): la siguiente vista de la tarea no lo repite y solo anuncia los fallos de sus propias recargas. Si con la vista montada deja de estar callado (la entrega vuelve bien), `activo` pasa a verdadero y se anuncia una vez, como siempre. La marca sale de una ref que se actualiza en un efecto tras cada render, así que la limpieza usa la última marca, y la tarea anterior si cambian los ids. Las otras llamadas al gancho de `features/tareas` (detalle, editar, entregas) no pasan el parámetro: su comportamiento no cambia y sus pruebas no cambian de resultado (PA-02 no aplica). Las dos de `features/clases` usan otro gancho homónimo, que no cambió.
- **`!consulta.isFetching` — se queda.** Tras un `409` la tarea y la entrega se piden a la vez y la tarea puede responder antes; sin la guarda, el aviso de la tarea saldría antes de saber si la entrega reemplaza la vista (el doble aviso de T-03). Su vecino (salir mientras la entrega se recarga) ahora es "callado" y queda consumido al desmontar; si la entrega termina bien con la vista montada, el aviso sale una vez, solo retrasado hasta esa respuesta.
- **N-34 — corregido (solo texto).** `docs/DESIGN.md` §7.27, "Otros errores": "un error de un campo que el panel tiene se marca bajo ese campo, sin aviso; si el panel no tiene ese campo, un solo aviso con el mensaje del servidor, sin marcar ningún campo; …". La marca "propuesta (CALIFICACIONES-01c)" del encabezado de §7.27 se conserva.

### Diff resumido
- `frontend/src/features/tareas/hooks.ts`: parámetro `callado = false`; `alSalirRef` (`{ callado, marca }`, actualizada en un efecto sin dependencias); un efecto con dependencias `[queryClient, claseId, tareaId]` cuya limpieza, si `callado`, hace `ultimoFalloAvisado.set(consulta, marca)` sin aviso. Comentario del porqué junto a `ultimoFalloAvisado`. El efecto que avisa no cambia.
- `frontend/src/features/tareas/entrega-de-alumno-view.tsx`: `falloDeLaTarea` (la condición de antes sin las guardas de la entrega) y `callaElFallo = consulta.isFetching || entregaReemplazaLaVista`; el gancho recibe `activo = falloDeLaTarea && !callaElFallo` (el mismo `activo` de la ronda 1) y `callado = falloDeLaTarea && callaElFallo`. Comentario de T-03 ampliado.
- `frontend/src/features/tareas/calificar-01c.test.tsx` (mío de 01c): importa `EntregasView` y agrega un `describe` (6 casos) entre el de CAL-1C06c y el de CAL-1C07, con `renderEn` e `irAOtraVista` (misma `QueryClient`, 60 s después).
- `docs/DESIGN.md`: N-34.

### Caso nuevo (`frontend/src/features/tareas/calificar-01c.test.tsx`)
`describe` "el fallo de la tarea callado por la entrega no se repite en la siguiente vista (CAL-1C06d)", adaptado de la reproducción del manager (`mgr-vecino.test.tsx.txt`):
- "CAL-1C06d: tras una recarga de fondo con la tarea en 5xx y la entrega en 404 (sin aviso), la lista de entregas con la tarea en 500 da exactamente [["No pudimos actualizar la tarea. Mostramos la última versión que tenemos."]]"
- "CAL-1C06d: tras una recarga de fondo con la tarea en 5xx y la entrega en 404 (sin aviso), la lista de entregas con la tarea en 200 da exactamente []"
- "CAL-1C06d (vecino): si se sale mientras la entrega se vuelve a pedir y la tarea ya falló, la lista de entregas con la tarea en 500 da exactamente [["No pudimos actualizar la tarea. Mostramos la última versión que tenemos."]]"
- "CAL-1C06d (vecino): si se sale mientras la entrega se vuelve a pedir y la tarea ya falló, la lista de entregas con la tarea en 200 da exactamente []"
- "CAL-1C06d (vecino): al volver a entrar a la misma entrega con la tarea y la entrega aún fallidas, ningún aviso"
- "CAL-1C06d (vecino): con la entrega reemplazando la vista, la entrega que vuelve bien deja ver la última versión con un solo aviso de la tarea"

**Fallan con el código anterior.** En una copia de `frontend/` en el scratchpad (`m07/`, con uniones a los `node_modules`; sin `git stash`), devolví `hooks.ts` y `entrega-de-alumno-view.tsx` a la versión de la ronda 1 (sin `callado`) y conservé la prueba nueva: `npx vitest run src/features/tareas/calificar-01c.test.tsx` → `Tests  4 failed | 51 passed (55)`. Fallan los cuatro de la lista de entregas (500 y 200, de fondo y saliendo durante la recarga de la entrega); los dos vecinos restantes (remontar y la entrega que vuelve bien) fijan estados que ya funcionaban y deben seguir así. `git status --short` del árbol, tomado antes y después de la copia, es idéntico, y `git diff --stat` también (la edición de N-34, hecha después, cambia una línea por otra y no altera la cifra de `DESIGN.md`).

### Filas de la matriz cambiadas (columna "Con la vista desmontada")
| # | Antes | Ahora |
|---|---|---|
| A6 | — | Si se sale antes de que la entrega responda, el fallo de la tarea queda atendido sin aviso; la siguiente vista de la tarea solo avisa de su propia recarga: uno si la tarea sigue fallando, ninguno si ya responde (CAL-1C06d vecino, 500 y 200) |
| A7 | — | El fallo de la tarea que esta vista calló queda atendido al salir; la siguiente vista no lo repite (CAL-1C06d) |
| C3 | — | Si se sale mientras la entrega se recarga, el fallo queda atendido sin aviso (CAL-1C06d vecino) |
| C5 ("En vuelo / desmontada") | — | Al salir, atendido sin aviso; la siguiente vista avisa una vez si la tarea sigue fallando y ninguna si responde (CAL-1C06d, 500 y 200); al volver a la misma entrega, ninguno (CAL-1C06d vecino) |

Cuatro filas cambiadas, ninguna nueva: la matriz sigue con **31 filas** (A1–A14, B1–B6, C1–C5, D1–D3, E1–E3).

### Hermanos y estados vecinos (M-07)
| Estado o camino | ¿Aplica el remedio? | ¿Aplicado? | Avisos | Caso |
|---|---|---|---|---|
| Siguiente vista con la tarea aún en 500 | Sí | Sí: el fallo callado está consumido; la lista avisa solo el de su propia recarga | 1 (antes de la ronda 1: 1; con la ronda 1: 2) | CAL-1C06d (500) |
| Siguiente vista con la tarea ya en 200 | Sí | Sí | 0 (con la ronda 1: 1 falso) | CAL-1C06d (200) |
| Siguiente vista con la tarea en 404 | Sí, por el mismo consumo: la lista monta con el 5xx en caché ya marcado y no avisa al montar; su recarga trae 404 y la vista se reemplaza (`errorQueReemplazaLaVista`, `activo` falso) | Sí | 0 de recarga (con la ronda 1 salía 1 falso al montar) | Sin caso propio: misma marca que CAL-1C06d |
| La misma vista remontada (volver a entrar a la entrega) | Sí | Sí: el fallo está marcado; al remontar, la entrega se vuelve a pedir (callado) y vuelve a reemplazar la vista; el nuevo fallo de la tarea queda callado y se consume al salir | 0 | CAL-1C06d (vecino) al volver a entrar |
| Dos recargas fallidas seguidas de la tarea, con la entrega bien | No cambia | Sin cambio: dos marcas, dos avisos (regla de TAREAS) | 2 | `editar-tarea-view.test.tsx`, "PR-1D04: dos fallos seguidos avisan dos veces y el formulario sigue intacto", sin cambio de resultado |
| Dos recargas fallidas seguidas de la tarea, con la entrega reemplazando la vista | Sí | Sí: `alSalirRef` lleva la última marca; al salir se consume la última y la siguiente vista no repite ninguna | 0 | Por código (misma ruta que CAL-1C06d) |
| Recarga de fondo de la tarea (no la del `409`) con la entrega en 404 | Sí | Sí | 0 en la vista; la siguiente, solo la suya | CAL-1C06c (vecino) de fondo con `404`; CAL-1C06d |
| Recarga de la tarea fallida con la entrega bien | No (debe avisar) | Sin cambio: `callado` falso, `activo` verdadero | 1 | CAL-1C06c (vecino) de fondo con la entrega buena; CAL-1C05 (vecino) |
| La entrega vuelve bien con la vista montada después de reemplazarla | Sí | Se consume al salir, no al callar: si la entrega vuelve y la vista muestra la tarea en caché, el aviso es cierto y sale una vez | 1 | CAL-1C06d (vecino) la entrega que vuelve bien |
| Salir mientras la entrega se recarga (`!consulta.isFetching`) | Sí | Sí: callado y consumido al desmontar | Siguiente vista: 1 con 500, 0 con 200 | CAL-1C06d (vecino), 500 y 200 |
| El detalle de la tarea (maestro y admin) como siguiente vista | Sí; refuto mi fila "No aplica" de la ronda 1: `detalle-tarea-view.tsx` llama al mismo gancho con la misma `claveTarea` y comparte `ultimoFalloAvisado` (por consulta de la caché), así que habría anunciado el fallo callado igual que la lista. `editar-tarea-view.tsx`, igual | Sí: el consumo está en la marca compartida, no en la vista siguiente | Igual que la lista | Cubierto por el mismo mecanismo; el caso usa la lista de entregas |
| "Tu trabajo" y el detalle del alumno | No aplica: "Tu trabajo" no llama al gancho (lo da el detalle, `tu-trabajo.tsx` líneas 19-20), y el alumno nunca monta `EntregaDeAlumnoView` (ruta de maestro y admin), así que en su caché ningún fallo queda callado | No hace falta | Sin cambio | Pruebas de TAREAS y ENTREGAS sin cambio de resultado |
| Las otras llamadas al gancho (detalle, editar, entregas) | No: su `activo` es falso solo sin fallo o cuando la tarea reemplaza la vista (y entonces la siguiente también se reemplaza); no pasan `callado` | Sin cambio | Sin cambio | Suite completa: solo +6 casos |
| `ENTREGA_MODIFICADA` (solo pide la entrega) | Sí, por la misma regla: mientras la entrega se recarga, un fallo previo de la tarea (ya avisado) queda callado; al salir se vuelve a escribir la misma marca, sin efecto. Si la entrega trae 404, la vista se reemplaza sin nuevo fallo de la tarea | Sí (sin cambio de avisos) | Solo el del `409` | CAL-1C04 (vecino) 404 del alumno |
| Cambio de `claseId`/`tareaId` sin desmontar | Sí | Sí: la limpieza corre con los ids y la marca anteriores (la ref se actualiza en un efecto y React corre las limpiezas antes que los efectos nuevos) | — | Por código |
| StrictMode en desarrollo | Riesgo residual | La limpieza simulada del primer montaje consumiría un fallo callado en ese instante; exige un fallo de la tarea sin marcar en la caché al entrar, que ya ninguna vista deja. Solo en desarrollo | — | — |

### Verificación (en `frontend/`, una a la vez; el backend no cambia y no lo corrí)
| Comando | Código | Última línea |
|---|---|---|
| `npm run lint` | 0 | `> tsc -b` (antes: `All matched files use Prettier code style!`) |
| `npm run test` | 0 | `Duration  114.55s (transform 30.89s, setup 78.98s, import 260.21s, tests 482.84s, environment 358.68s)`; `Test Files  174 passed (174)` · `Tests  2705 passed (2705)`; `grep -c "Test timed out"` = 0 |
| `npm run build` | 0 | `✓ built in 734ms` |

No usé formateadores con `--write`: lint pasó tal cual.

### Conteos (desde `frontend/`)
- `npx vitest list > m07-list.txt; grep -c " > " m07-list.txt` → **2705** casos (2699 + 6).
- `cut -d'>' -f1 m07-list.txt | sort -u | grep -c test` → **174** archivos (ninguno nuevo).
- `grep -c "calificar-01c.test.tsx" m07-list.txt` → **55** (49 + 6); `grep -c "CAL-1C06d" m07-list.txt` → **6**.

### "No se toca"
- `git diff --stat 10e5a023dc1fc215112dbf7828ab4b32cfa036e1 -- frontend backend shared` → `9 files changed, 541 insertions(+), 10 deletions(-)` (antes 520): los mismos nueve archivos rastreados; esta corrección cambió dos (`entrega-de-alumno-view.tsx` y `hooks.ts`). Nada en `backend/` ni en `shared/`.
- No rastreados: los mismos 11 de antes; esta corrección cambió `calificar-01c.test.tsx`.
- `*.ataque`: no toqué ninguna. `sha256sum` de las 187 contra la tabla de la ronda 1 (normalizando mayúsculas y el `*`): `diff` vacío.

## 01c — corrección de la ronda 2 (T-04)
Base: "## Ronda 2 de 01c" de `reporte-tester.md` (T-04, baja; 6 rojos en `campos-01c-r2.ataque.test.tsx`: tres de CAL-T-113 y los tres de CAL-T-114). No toqué ninguna `*.ataque` (el SHA-256 de `campos-01c-r2.ataque.test.tsx` sigue `EF86C467…AB39E75`, el de la tabla del tester), `shared/`, el backend, `lib/errores-de-api.ts` ni pruebas normales existentes (solo agregué un `describe` al final de mi `calificar-01c.test.tsx` de 01c). No abrí navegadores, no terminé procesos, no leí `.env` ni hice commit.

### Hallazgo
- **T-04 — corregido.** El aviso de un `400 VALIDACION` de calificar que el panel no pinta sale ahora de `mensajeDelAvisoDeCalificar` (`features/tareas/lib.ts`, §D-12.2): toma el mensaje de `mensajeDeErrorTareas` (así se conservan los textos fijos de `claseId:`, `tareaId:` y `alumnoId:`) y, si el error es un `VALIDACION`, le quita cualquier prefijo de ruta `^[A-Za-z0-9_.-]+:\s*` (puntos, índices, signos); si no queda mensaje, el genérico `MENSAJES_ERROR_TAREAS.generico` ("Algo salió mal. Inténtalo de nuevo."), nunca un aviso vacío. `lib/errores-de-api.ts` no cambia.

### Diff resumido
- `frontend/src/features/tareas/lib.ts`: `PREFIJO_DE_RUTA` y `mensajeDelAvisoDeCalificar` (exportada), justo después de `mensajeDelCampoDeCalificacion`, con el comentario del porqué. `mensajeDelCampoDeCalificacion` no cambia (ya quitaba todo `PREFIJO_DE_CALIFICACION`).
- `frontend/src/features/tareas/hooks.ts`: `avisarDelErrorDeLaEntrega` gana un quinto parámetro opcional `mensajeDe = mensajeDeErrorTareas` (las otras cinco llamadas no lo pasan y no cambian); en `useCalificarEntrega.onError`, la última llamada pasa `mensajeDelAvisoDeCalificar`. La deduplicación por tarea perdida (`tareaPerdidaAvisada`) sigue igual.
- `frontend/src/features/tareas/calificar-01c.test.tsx` (mío de 01c): un `describe` nuevo al final (7 casos).

### Casos nuevos (`frontend/src/features/tareas/calificar-01c.test.tsx`)
`describe` "el aviso de un 400 sin lugar en el panel no lleva el prefijo de ruta (CAL-1C06e)":
- "CAL-1C06e: «puntajes.0.criterioId: Revisa este valor.» da un solo aviso «Revisa este valor.», ningún ErrorDeCampo y lo escrito se conserva"
- "CAL-1C06e: «puntajes.0: Revisa este valor.» da un solo aviso «Revisa este valor.», ningún ErrorDeCampo y lo escrito se conserva"
- "CAL-1C06e: «puntajes.-1.puntos: Revisa este valor.» da un solo aviso «Revisa este valor.», ningún ErrorDeCampo y lo escrito se conserva"
- "CAL-1C06e: «puntajes.x.puntos: Revisa este valor.» da un solo aviso «Revisa este valor.», ningún ErrorDeCampo y lo escrito se conserva"
- "CAL-1C06e: «puntajes.1.5.puntos: Revisa este valor.» da un solo aviso «Revisa este valor.», ningún ErrorDeCampo y lo escrito se conserva"
- "CAL-1C06e: «Revisa este valor.» da un solo aviso «Revisa este valor.», ningún ErrorDeCampo y lo escrito se conserva" (sin prefijo; control)
- "CAL-1C06e (vecino): «puntajes.0.criterioId:» sin mensaje da el aviso genérico, nunca uno vacío"

**Fallan con el código anterior.** Guardé `lib.ts` y `hooks.ts` de antes de la corrección en el scratchpad (`t04/`), los devolví a su lugar con la prueba nueva y corrí `npx vitest run src/features/tareas/calificar-01c.test.tsx -t "CAL-1C06e"` → `Tests  6 failed | 1 passed | 55 skipped (62)`. Fallan los cinco prefijos y el vecino vacío; el caso sin prefijo pasa con los dos códigos (es el control: ese camino ya estaba bien). Restauré la versión nueva (`diff -q` sin diferencias). Sin `git stash`: `git diff --stat` antes y después solo difiere en las cifras de `lib.ts` (220 → 234) y `hooks.ts` (89 → 94), las dos de esta corrección.

### Fila A14 de la matriz (cambiada)
| # | Clase de respuesta | Qué se renueva | Aviso (uno) | Foco | En vuelo a la vez | Con la vista desmontada |
|---|---|---|---|---|---|---|
| A14 | `400 VALIDACION` de calificar **que el panel no pinta**: `puntajes.<i>.puntos` con `i` fuera del envío, `calificacion` con rúbrica (T-02), y cualquier otro prefijo (`version:`, `puntosDeLaTarea:`, `puntajes:`, `cuerpo:`, rutas con puntos o índices como `puntajes.<i>.criterioId:`, `puntajes.<i>:`, o posiciones imposibles `puntajes.-1.puntos:`, `puntajes.x.puntos:`, `puntajes.1.5.puntos:`) o ninguno (T-04) | Nada: sin reinicio; lo escrito y la versión de apertura se conservan | Uno, del gancho, con el mensaje del servidor sin ningún prefijo de campo ni de ruta; si no queda mensaje, "Algo salió mal. Inténtalo de nuevo." | Se queda en el botón, que sale de la espera | Doble clic = un `PUT` (sin cambio) | El aviso sale (gancho) |

La matriz sigue con **31 filas** (A1–A14, B1–B6, C1–C5, D1–D3, E1–E3).

### Hermanos y estados vecinos (T-04)
El servidor forma el prefijo con `incidencia.path.map(String).join(".")` (`backend/src/handlers/validacion.ts:16`), así que todo esquema con arreglos u objetos anidados puede dar una ruta con puntos. `quitarPrefijoDeCampo` (`frontend/src/lib/errores-de-api.ts:21`, `/^([a-zA-Z_]+):\s*/`) no la quita. El cliente de hoy no provoca ninguna de estas rutas (manda ids de archivo válidos, enlaces que su esquema valida y filas de rúbrica con forma de objeto): como T-04, solo aparecen si el contrato se desvía.

| Aviso o camino | ¿El servidor puede mandar un prefijo con puntos? | ¿Llega hoy a la persona? | Decisión |
|---|---|---|---|
| Calificar: campo que el panel no pinta (`useCalificarEntrega.onError` → `avisarDelErrorDeLaEntrega`, `hooks.ts:572`) | Sí: `puntajes.<i>.criterioId`, `puntajes.<i>` (`calificarEntregaSchema`, `shared/src/calificaciones.ts:36`) | Ya no | **Corregido** (T-04): es el mecanismo nuevo de 01c y está en §D-12 |
| Calificar: campo de `PREFIJO_DE_CALIFICACION` sin lugar en el panel (`mensajeDelCampoDeCalificacion`, `hooks.ts:566`) | `puntajes.<i>.puntos` | No: el prefijo entero sale con la propia regex | Sin cambio (CAL-1C06b, CAL-T-112) |
| Calificar: campo que el panel pinta (`erroresDeCalificacionDeApi`) | `puntajes.<i>.puntos` | No: se pinta sin prefijo | Sin cambio (CAL-1C06, CAL-T-111) |
| Calificar: los tres `409` (`hooks.ts:557`) | No: textos fijos por código | No | Sin cambio |
| Calificar: un `VALIDACION` con `claseId:`, `tareaId:` o `alumnoId:` (vista reemplazada) | No (prefijo sin puntos) | No: texto fijo de `mensajeDeErrorTareas`, que `mensajeDelAvisoDeCalificar` no altera (ningún texto fijo empieza con `palabra:`) | Sin cambio |
| Crear tarea (`useCrearTarea.onError`, `hooks.ts:166`) | Sí: `archivoIds.<i>` ("Un archivo adjunto no es válido", `archivoIdsSchema`, `shared/src/clases.ts:397`) y `rubrica.<i>` (una fila que no es objeto); `rubrica.<i>.criterio` y `.puntosMax` ya los quita `PREFIJO_DE_FILA` | Sí: "archivoIds.0: Un archivo adjunto no es válido" | **No corregido, pendiente para el manager** (destino: el `chore` posterior): mecanismo de TAREAS-01 (`mensajeDeErrorTareas`, `features/tareas/lib.ts:154`, que delega en `quitarPrefijoDeCampo`), no el nuevo de 01c. El remedio natural es ampliar `PREFIJO_DE_CAMPO` en `lib/errores-de-api.ts:21` (No se toca), que también arreglaría `features/clases` |
| Editar tarea (`useEditarTarea.onError`, `hooks.ts:189`) | Igual que crear (`editarTareaSchema` extiende `crearTareaSchema`) | Sí, igual | **Pendiente**, mismo destino y motivo |
| Entregar (`useEntregar.onError` → `avisarDelErrorDeLaEntrega`, `hooks.ts:432`) | Sí: `archivoIds.<i>` (`entregarSchema`, `shared/src/entregas.ts:53`); `enlaces.<i>` no llega al aviso porque `errorDeEnlacesDeApi` (`lib.ts:387`, `/^enlaces(\.\d+)?:\s*/`) lo pinta bajo el grupo | `archivoIds.<i>`: sí, "archivoIds.0: Un archivo adjunto no es válido". `enlaces.<i>`: no | **Pendiente** para `archivoIds.<i>` (mecanismo de ENTREGAS-01d; el hermano que el tester anotó). `enlaces.<i>`: sin cambio |
| Anular entrega (`hooks.ts:452`) | No: `anularEntregaSchema` es `strictObject({})`; una llave de más da prefijo vacío → `cuerpo:` | No | Sin cambio |
| Comentar en el hilo privado (`useComentarEnHilo.onError`, `hooks.ts:493`) | No: `comentarioPrivadoSchema` solo tiene `texto` (lo pinta `errorDeTextoDeApi`); una llave de más → `cuerpo:` | No | Sin cambio |
| Descarga de un adjunto (`hooks.ts:281`) | No: parámetros simples (`archivoId:`) | No | Sin cambio |
| Borrar tarea (`useBorrarTarea.onError`, `hooks.ts:218`) | No: `borrarTareaQuerySchema` es plano (`confirmar:`) | No | Sin cambio |
| Temas y categorías | Sí: `orden.<i>` (`ordenTemasSchema`, `shared/src/tareas.ts:58`) y `categorias.<i>.nombre` / `.peso` / `.id` (`reemplazarCategoriasSchema`, `shared/src/tareas.ts:124`) | Fuera de `features/tareas`: sus avisos están en `features/clases` (`mensajeDeErrorClases`, `features/clases/lib.ts:155` → `quitarPrefijoDeCampo`). No lo reproduje | **Pendiente** fuera de §D-12, mismo destino |
| Subida de archivos en el formulario de tarea y de entrega (`avisoDeFalloAlSubir(..., mensajeDeErrorTareas)`, `formulario-tarea.tsx:224`, `formulario-de-entrega.tsx:135`) | Los cuerpos de solicitar subida son planos (nombre, tipo, tamaño) | No | Sin cambio |

**Estados vecinos del mismo mecanismo (el aviso de un `400` de calificar sin lugar):** primer intento (CAL-1C06e, CAL-T-113/114); dos intentos iguales seguidos, dos avisos limpios (CAL-T-112 sigue en verde, misma ruta); una marca vieja seguida de un `400` sin lugar con prefijo de ruta: la marca se quita en el panel antes del aviso y el aviso sale limpio (misma ruta que CAL-T-115, sin cambio en el panel); `400` sin lugar seguido de `500`: el `500` no es `VALIDACION` y conserva su texto genérico (CAL-T-116); mensaje vacío tras el prefijo: aviso genérico (CAL-1C06e vecino); con la vista desmontada: el aviso sale del gancho igual; un `VALIDACION` de `tareaId:`/`alumnoId:`: sigue pasando por la deduplicación de `tareaPerdidaAvisada` con su texto fijo.

### Verificación (en `frontend/`, una a la vez; el backend no cambia y no lo corrí)
| Comando | Código | Última línea |
|---|---|---|
| `npm run lint` | 0 | `> tsc -b` (antes: `All matched files use Prettier code style!`) |
| `npm run test` | 0 | `Duration  117.14s (transform 26.97s, setup 79.17s, import 258.61s, tests 502.95s, environment 363.16s)`; `Test Files  177 passed (177)` · `Tests  2789 passed (2789)`; `grep -c "Test timed out"` = 0 |
| `npm run build` | 0 | `✓ built in 768ms` |

Formateo: `npx prettier --write` solo sobre `lib.ts`, `hooks.ts` y `calificar-01c.test.tsx`, desde `frontend/`.

### Conteos (desde `frontend/`)
- `npx vitest list > list.txt; grep -c " > " list.txt` → **2789** casos (2782 de la ronda 2 del tester + 7).
- `cut -d'>' -f1 list.txt | sort -u | grep -c test` → **177** archivos (ninguno nuevo).
- `grep -c "calificar-01c.test.tsx" list.txt` → **62** (55 + 7); `grep -c "CAL-1C06e" list.txt` → **7**; `grep -c "CAL-T-11[34]" list.txt` → **11** (8 + 3, todos en verde en la corrida).

### "No se toca"
- `git diff --stat 10e5a023dc1fc215112dbf7828ab4b32cfa036e1 -- frontend backend shared` → `9 files changed, 559 insertions(+), 11 deletions(-)`: los mismos nueve archivos rastreados de antes; esta corrección cambió dos (`features/tareas/lib.ts` y `features/tareas/hooks.ts`), dentro de §D-12. Nada en `backend/`, `shared/` ni `lib/errores-de-api.ts`.
- No rastreados: los mismos 14 de antes; esta corrección cambió `calificar-01c.test.tsx`.

## 01c — corrección de la ronda 3 (T-05, ronda 4 cerrada)
Base: "## Ronda 3 de 01c" de `reporte-tester.md` (T-05, baja; 3 rojos de CAL-T-135 en `aviso-calificar-01c-r3.ataque.test.tsx`). Es la ronda 4 cerrada a T-05 y su hermano que autorizó el humano (`aprobacion.md`). No toqué ninguna `*.ataque`: el SHA-256 de `aviso-calificar-01c-r3.ataque.test.tsx` sigue `2EF258E9…EAF711BF`, el de la tabla del tester. Tampoco toqué `shared/`, el backend, `lib/errores-de-api.ts` ni las pruebas normales existentes: solo agregué un `describe` al final de mi `calificar-01c.test.tsx` de 01c. No abrí navegadores, no terminé procesos, no leí `.env` ni hice commit.

### Hallazgo
- **T-05 — corregido.** En `erroresDeCalificacionDeApi` (`features/tareas/lib.ts`, §D-12.2), si no queda mensaje tras quitar el prefijo, se usa el genérico `MENSAJES_ERROR_TAREAS.generico` ("Algo salió mal. Inténtalo de nuevo."). Pasa igual con un mensaje de solo espacios, porque el `\s*` de `PREFIJO_DE_CALIFICACION` ya se los lleva. Es la misma comparación (`=== ""`) que usan `mensajeDelCampoDeCalificacion` y `mensajeDelAvisoDeCalificar`. El resultado sigue sin ser `null`: el campo queda marcado y con el foco, y el gancho no avisa. Nunca queda un `ErrorDeCampo` vacío.

### Diff resumido
- `frontend/src/features/tareas/lib.ts` (+3 líneas): `const recortado = error.message.slice(…)` y `const mensaje = recortado === "" ? MENSAJES_ERROR_TAREAS.generico : recortado`, con el comentario del porqué. No cambia nada más.
- `frontend/src/features/tareas/calificar-01c.test.tsx` (mío de 01c): un `describe` nuevo al final, con 8 casos.

### Casos nuevos (`frontend/src/features/tareas/calificar-01c.test.tsx`)
`describe` "un 400 pintable sin mensaje marca el campo con el genérico, nunca vacío (CAL-1C06f)":
- `CAL-1C06f: "puntajes.0.puntos:" marca «Claridad (de 5 puntos)» con «Algo salió mal. Inténtalo de nuevo.» en su ErrorDeCampo, con el foco, sin aviso y con lo escrito (comentario "")`
- `CAL-1C06f: "puntajes.1.puntos:   " marca «Ortografía (de 4 puntos)» con «Algo salió mal. Inténtalo de nuevo.» en su ErrorDeCampo, con el foco, sin aviso y con lo escrito (comentario "")`
- `CAL-1C06f: "puntajes.0.puntos:\t\n" marca «Claridad (de 5 puntos)» con «Algo salió mal. Inténtalo de nuevo.» en su ErrorDeCampo, con el foco, sin aviso y con lo escrito (comentario "")`
- `CAL-1C06f: "comentario:" marca «Comentario para el alumno (opcional)» con «Algo salió mal. Inténtalo de nuevo.» en su ErrorDeCampo, con el foco, sin aviso y con lo escrito (comentario "")`
- `CAL-1C06f: "comentario:  " marca «Comentario para el alumno (opcional)» con «Algo salió mal. Inténtalo de nuevo.» en su ErrorDeCampo, con el foco, sin aviso y con lo escrito (comentario "Bien")`
- `CAL-1C06f (hermano): "calificacion:" en una tarea sin rúbrica marca «Calificación» con «Algo salió mal. Inténtalo de nuevo.», con el foco y sin aviso`
- `CAL-1C06f (hermano): "calificacion:   " en una tarea sin rúbrica marca «Calificación» con «Algo salió mal. Inténtalo de nuevo.», con el foco y sin aviso`
- `CAL-1C06f (vecino): «calificacion:» sin mensaje en una tarea con rúbrica da un solo aviso genérico y ningún campo marcado` (control: ese camino ya estaba bien con `mensajeDelCampoDeCalificacion`)

La descripción accesible del comentario lleva también su ayuda ("Se publica en los comentarios privados de esta entrega."). Por eso esos casos comprueban `toHaveAccessibleDescription(expect.stringContaining(genérico))`.

**Fallan con el código anterior.** Guardé `lib.ts` antes de la corrección en el scratchpad (`t05/lib.antes.ts`) y lo devolví a su lugar con la prueba nueva:
- `npx vitest run src/features/tareas/calificar-01c.test.tsx -t "CAL-1C06f"` → `Tests  7 failed | 1 passed | 62 skipped (70)`. Fallan los 7 casos del campo pintado y pasa el vecino de control.
- `npx vitest run src/features/tareas/aviso-calificar-01c-r3.ataque.test.tsx -t "CAL-T-135"` → `Tests  3 failed | 86 skipped (89)`.

Después restauré la versión nueva (`diff -q` sin diferencias), y CAL-T-135 dio `Tests  3 passed | 86 skipped (89)`. No usé `git stash`.

### Fila A9 de la matriz (cambiada)
| # | Clase de respuesta | Qué se renueva | Aviso (uno) | Foco | En vuelo a la vez | Con la vista desmontada |
|---|---|---|---|---|---|---|
| A9 | `400 VALIDACION` de un campo **que el panel tiene** (`puntajes.<i>.puntos` con `i` dentro del envío, `calificacion` sin rúbrica, `comentario` siempre) | Nada | Ninguno: `ErrorDeCampo` bajo el campo con el mensaje del servidor sin el prefijo; si no queda mensaje (prefijo solo o seguido de espacios), "Algo salió mal. Inténtalo de nuevo." (T-05), nunca vacío | El primer campo con error | — | Ninguno |

A14 no cambia. La matriz sigue con **31 filas** (A1–A14, B1–B6, C1–C5, D1–D3, E1–E3).

### Hermanos y estados vecinos (T-05)
**Del mismo mecanismo (el texto de un `400` de calificar que llega a la interfaz):**

| Estado o camino | ¿Podía quedar vacío antes? | ¿El remedio aplica? | Cubierto por |
|---|---|---|---|
| `puntajes.<i>.puntos:` sin mensaje, pintable | Sí | **Sí, aplicado** | CAL-T-135 (2 entradas), CAL-1C06f |
| `puntajes.<i>.puntos:` con espacios, tabulador o salto de línea, pintable | Sí (`\s*` los consume) | **Sí, aplicado** | CAL-T-135 `"puntajes.1.puntos:   "`, CAL-1C06f (`"   "` y `"\t\n"`) |
| `comentario:` sin mensaje, sin comentario escrito | Sí | **Sí, aplicado** | CAL-T-135 `"comentario:"`, CAL-1C06f |
| `comentario:` sin mensaje, con comentario escrito | Sí | **Sí, aplicado**: lo escrito se conserva | CAL-1C06f (`"comentario:  "` con "Bien") |
| `calificacion:` sin mensaje, en una tarea sin rúbrica (el hermano del tester) | Sí | **Sí, aplicado** | CAL-1C06f (hermano, con y sin espacios) |
| `calificacion:` sin mensaje, en una tarea con rúbrica (sin lugar) | No: `mensajeDelCampoDeCalificacion` ya daba el genérico | Sin cambio | CAL-1C06f (vecino), CAL-1C06b |
| `puntajes.<i>.puntos:` sin mensaje con `i` fuera del envío (sin lugar) | No: el mismo camino de `mensajeDelCampoDeCalificacion` | Sin cambio | CAL-1C06b (misma rama) |
| Cualquier otro prefijo sin mensaje (rutas con puntos, `version:`, `cuerpo:`) | No: `mensajeDelAvisoDeCalificar` ya daba el genérico | Sin cambio | CAL-1C06e (vecino), CAL-T-120 |
| Mensaje de espacios Unicode que `\s` reconoce (NBSP `U+00A0`, BOM `U+FEFF`, `U+2028`) | Sí | **Sí, aplicado**: el prefijo se los lleva y queda `""`. Comprobado con `node -e` sobre la regex, sin caso de vista: el título con esos caracteres sería invisible | — |
| Mensaje de caracteres de ancho cero (`U+200B`, `U+200C`, `U+200D`, `U+2060`), que `\s` no reconoce | Sí, y también en los otros dos caminos (`mensajeDelCampoDeCalificacion` y `mensajeDelAvisoDeCalificar` comparan igual con `""`) | **No aplicado**, por la ronda cerrada y el cambio mínimo. Arreglarlo exige otra comparación en los tres caminos. Inalcanzable: el servidor manda textos fijos o mensajes de zod | Pendiente para el `chore` de los hermanos |
| Un `VALIDACION` con dos prefijos pintables, uno vacío y otro no | No puede llegar como dos errores: `validarCuerpo` (`backend/src/handlers/validacion.ts`) manda solo la primera incidencia. Si llega como texto (`"puntajes.0.puntos: comentario:"`), solo se quita el primero y el resto (`"comentario:"`) se pinta tal cual: no queda vacío | No aplica | — |
| Dos intentos seguidos con el mismo `400` vacío | El panel reemplaza sus errores con `setErrores(deCampo)`: el genérico otra vez, sin aviso | Sí (misma función) | Misma ruta que CAL-1C06f |
| Con la vista desmontada | El gancho calla porque `erroresDeCalificacionDeApi` no da `null`, y el panel ya no está: no sale aviso, igual que con un mensaje no vacío (A9) | Sin cambio de comportamiento | — |
| Un `400` vacío pintado y después un `409` que reinicia | El reinicio borra las marcas (sin cambio) | Sin cambio | CAL-T-129 (misma ruta) |

**Otros lugares de los archivos de §D-12 donde un texto del servidor podría quedar vacío** (ninguno es el mecanismo nuevo de 01c):

| Lugar | ¿Puede quedar vacío? | ¿Alcanzable hoy? | Decisión |
|---|---|---|---|
| `mensajeDeErrorTareas` (`lib.ts:154`), en `VALIDACION` → `quitarPrefijoDeCampo`, con `"x:"` sin mensaje. Llega a los avisos de crear, editar y borrar tarea (`hooks.ts:166`, `:189`, `:218`), a `avisarDelErrorDeLaEntrega` de entregar, anular, comentar y descarga, y a `MensajeError` de `entrega-de-alumno-view.tsx:169`/`:173` | Sí (aviso vacío o `MensajeError` vacío) | No: el servidor siempre manda mensaje tras el prefijo, y los parámetros de las lecturas (`claseId:`, `tareaId:`, `alumnoId:`) tienen texto fijo | **No aplicado** (mecanismo de TAREAS-01; ronda cerrada). Pendiente para el `chore` de los hermanos. Calificar ya está cubierto por `mensajeDelAvisoDeCalificar` |
| `erroresDeFormularioDeApi` del formulario de tarea (`lib.ts:168`, con `mensajeDeErrorTareas`), con `"titulo:"` sin mensaje | Sí (`ErrorDeCampo` vacío) | No | **No aplicado**, mismo destino |
| `errorDeEnlacesDeApi` y `errorDeTextoDeApi` (`errorDelCampoDeApi`, `lib.ts:379-384`), con `"enlaces:"`, `"enlaces.0:"` o `"texto:"` sin mensaje: el mismo patrón exacto que T-05, en entregar y en el hilo privado | Sí (`ErrorDeCampo` vacío) | No | **No aplicado** (mecanismo de ENTREGAS-01d, ronda cerrada a T-05). Pendiente para el `chore` de los hermanos. Es el hermano más cercano fuera de calificar |
| Códigos de `CODIGOS_CON_MENSAJE_DEL_SERVIDOR` (`lib.ts:149`), que pasan `error.message` tal cual, también en `mensajeDelAvisoDeCalificar` para lo que no es `VALIDACION` | Vacío, no: `errorApiSchema` (`shared/src/errores.ts:6`) exige `mensaje` con `min(1)` y `apiClient` descarta lo que no cumple. Un mensaje de un solo espacio sí pasaría | No: el servidor manda textos fijos | Observación, sin cambio |
| Los tres `409` de calificar y los avisos de recarga (`TEXTOS_CALIFICAR.avisoRecargaFallida`) | No: textos fijos del cliente | — | Sin cambio |

### Verificación (en `frontend/`, una a la vez; el backend no cambia y no lo corrí)
| Comando | Código | Última línea |
|---|---|---|
| `npm run lint` | 0 | `> tsc -b` (antes: `All matched files use Prettier code style!`) |
| `npm run test` | 0 | `Duration  122.65s (transform 29.39s, setup 78.76s, import 263.23s, tests 536.47s, environment 354.21s)`; `Test Files  179 passed (179)` · `Tests  2902 passed (2902)`; `grep -c "Test timed out"` = 0. Los 3 rojos de CAL-T-135 pasan a verde y no cambia nada más (2894 de la ronda 3 del tester + 8 nuevos) |
| `npm run build` | 0 | `✓ built in 800ms` |

Formateo: `npx prettier --write` solo sobre `lib.ts` y `calificar-01c.test.tsx`, desde `frontend/`.

### Conteos (desde `frontend/`)
- `npx vitest list > list.txt; grep -c " > " list.txt` → **2902** casos (2894 + 8).
- `cut -d'>' -f1 list.txt | sort -u | grep -c test` → **179** archivos (ninguno nuevo).
- `grep -c "calificar-01c.test.tsx" list.txt` → **70** (62 + 8). `grep -c "CAL-1C06f" list.txt` → **8**. `grep -c "CAL-T-135" list.txt` → **3** (en verde en la corrida).

### "No se toca"
- `git diff --stat 10e5a023dc1fc215112dbf7828ab4b32cfa036e1 -- frontend backend shared` → `9 files changed, 562 insertions(+), 11 deletions(-)`. Son los mismos nueve archivos rastreados de antes. Lo único que cambió es `features/tareas/lib.ts`, de 234 a 237, dentro de §D-12. En `hooks.ts` solo cambió el ancho de la barra del `--stat`: sigue en 94. Nada en `backend/`, `shared/` ni `lib/errores-de-api.ts`.
- No rastreados: 16, que son los 14 de antes más las 2 `*.ataque` de la ronda 3 del tester. Esta corrección cambió `calificar-01c.test.tsx`.

### Desviaciones del plan
Ninguna.

### Pendientes y fuera de alcance detectados
- Para el `chore` de los hermanos (no se aplicaron por la ronda cerrada):
  - el mismo "prefijo sin mensaje" en `errorDeEnlacesDeApi` y `errorDeTextoDeApi` (ENTREGAS-01d), en `mensajeDeErrorTareas` y en `erroresDeFormularioDeApi` (TAREAS-01);
  - los caracteres de ancho cero en los tres caminos de calificar.
  
  Ninguno es alcanzable con el servidor de hoy.
