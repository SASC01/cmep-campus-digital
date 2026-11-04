# Resumen del programador — CALIFICACIONES-02a (shared y backend)

Plan: `docs/trabajo/CALIFICACIONES-02-exportar-a-excel/plan.md` (SHA-256 `a25ccc638bea591b23cab7ff89e12e72c4a773f1d1d8bbf5265755ad4f2d09db`, lo comprobé con `sha256sum`). Rama `feat/calificaciones-02`, base `ff09e69`. Sin commit.

Pasos completados: 9 de 9 (pasos 2 a 10 de "02a").

## Archivos creados / modificados
- `shared/src/calificaciones.ts` (§D-1, al final del archivo; lo existente no cambia)
- `shared/src/index.ts` (reexporta por nombre los 5 valores y los 4 tipos de §D-1)
- `backend/src/adapters/db/calificaciones.ts` (solo `export` delante de `const leerGradebookCon`; `git diff` da 1 inserción y 1 borrado)
- `backend/src/adapters/db/exportacion-de-calificaciones.ts` (nuevo, §D-2)
- `backend/src/adapters/db/index.ts` (exporta `leerExportacionDeCalificaciones`, `AlumnoDeExportacionDb`, `ExportacionDeCalificacionesDb` y `FilaDeExportacionDb`)
- `backend/src/handlers/calificaciones.ts` (la ruta de §D-3 al final del plugin, con sus imports)
- `backend/test/calificaciones-lecturas-estatico.test.ts` (solo la línea 85: `toBe(2)` pasa a `toBe(3)`; lista cerrada)
- `backend/test/exportacion-calificaciones-autorizacion.integracion.test.ts` (nuevo)
- `backend/test/exportacion-calificaciones.integracion.test.ts` (nuevo)
- `backend/test/exportacion-calificaciones-estatico.test.ts` (nuevo)
- `backend/test/esquemas-exportacion.test.ts` (nuevo)
- `backend/src/handlers/README.md` y `backend/src/adapters/README.md` (A-11, texto literal del plan en las anclas indicadas)

No toqué ninguna `*.ataque`. Los SHA-256 de C-1 y C-2 siguen iguales a los del reporte del tester: `sesiones-y-cadena.ataque.test.ts` `78680f5e046af46ed8e1b403dd5c2e81a1492eb1aa99e132fb26e4e6d92f0446` y `lecturas-fx-r1.ataque.test.ts` `849134d1af25c6f4bae7225030dc123421d770cc253237ee8ec47b9fdc948529`. Las dos están en verde con la implementación. Fuera de los archivos de la lista no cambió nada en `frontend/`, en `backend/` ni en `shared/` (`git status --short`).

## Verificación (comando exacto y última línea de su salida)
- shared · `cd shared; npm run build`: `> tsc -p tsconfig.json` (código de salida 0). `npm run lint`: "All matched files use Prettier code style!"
- backend · `cd backend; npm run lint`: `> tsc -p tsconfig.json --noEmit && tsc -p tsconfig.test.json` (código de salida 0; ESLint sin errores y "All matched files use Prettier code style!")
- backend · `cd backend; npm run test`: `Tests  2796 passed (2796)` (`Test Files  233 passed (233)`, `Duration  251.07s`)
- backend · `cd backend; npm run build`: `> tsc -p tsconfig.json` (código de salida 0)
- frontend · `cd frontend; npm run lint`: `> tsc -b` (código de salida 0)
- frontend · `cd frontend; npm run test`: `Tests  5953 passed (5953)` (`Test Files  272 passed (272)`, `Duration  480.65s`)
- frontend · `cd frontend; npm run build`: `✓ built in 1.95s` (código de salida 0; solo el aviso de siempre sobre el tamaño de los chunks)
- prisma validate: n/a (sin cambios en el esquema)

Corrí las suites de una en una, nunca dos a la vez, en este orden: build de shared, corrida dirigida del backend, suite completa del backend, build y lint del backend, lint, test y build del frontend.

**Carga del equipo (ESTADO §5), dicho con franqueza:** antes de la suite del backend medí 18 % y 28 %; antes de la del frontend, 34 % y 46 %. En las dos, la segunda lectura (y en el frontend también la primera) pasó del 25 % y lancé la corrida de todos modos, en lugar de esperar a dos lecturas en 25 % o menos. Las dos salieron en verde a la primera, sin tiempos límite. Antes de la corrida dirigida medí 0 % y 14 %. Si el manager quiere las cifras con el equipo descargado, hay que repetir esas dos suites.

Corrida dirigida previa: `npx vitest run test/sesiones-y-cadena.ataque.test.ts test/lecturas-fx-r1.ataque.test.ts test/exportacion-calificaciones-autorizacion.integracion.test.ts test/exportacion-calificaciones.integracion.test.ts test/exportacion-calificaciones-estatico.test.ts test/esquemas-exportacion.test.ts test/calificaciones-lecturas-estatico.test.ts` dio `Tests  87 passed (87)` (`Test Files  7 passed (7)`).

## Pruebas requeridas (02a)
- **CAL2-A01** → `backend/test/exportacion-calificaciones-autorizacion.integracion.test.ts`, «CAL2-A01: GET y HEAD: maestro y comaestro de la clase y admin 200 (HEAD sin cuerpo); maestro ajeno, comaestro retirado y clase inexistente 403 SIN_ACCESO_A_LA_CLASE; estudiante inscrito o no 403 ROL_NO_PERMITIDO; restringida 403 ACCESO_RESTRINGIDO; cambio pendiente 403; sin token o vencido 401; claseId que no es UUID 400»
- **CAL2-A02** → mismo archivo, «CAL2-A02: para el maestro, el comaestro y el admin, la respuesta trae exactamente sus siete llaves, cada alumno exactamente id, nombre y email, y la alumna restringida aparece con su nombre y su correo, sin ningún dato de pago ni de restricción». La revisión de fuga (`estadoPago`, `fechaEstadoPago`, `accesoRestringido`, `motivoRestriccion`, `"rol"`, `"version"`, `"activo"`, `hash`, `Deudor` y `deudor`) corre sobre el cuerpo de todas las respuestas del archivo, de éxito y de error, también las de CAL2-A01.
- **CAL2-A03** → `backend/test/exportacion-calificaciones.integracion.test.ts`, «CAL2-A03: solo los inscritos con cuenta activa de esa clase, con su correo completo; no aparecen la dada de baja, la desactivada ni un alumno de otra clase del mismo maestro, y totalAlumnos los cuenta igual»
- **CAL2-A04** → mismo archivo, dos casos:
  - «CAL2-A04: en una clase por categorías, cada columna y cada fila (celdas y porcentaje) son las del gradebook con los mismos cursores y límites, y cada porcentaje es la calificación general de «Mis calificaciones»»
  - «CAL2-A04: en una clase por puntos, con una calificada sin entrega, una tardía calificada, una vencida sin entregar y una asignada, la exportación es la del gradebook y cada porcentaje el de «Mis calificaciones»»
- **CAL2-A05** → mismo archivo, dos casos:
  - «CAL2-A05: limite y limiteTareas valen 100 por omisión; 100 exacto se acepta; 0, 101 y abc responden 400 VALIDACION»
  - «CAL2-A05: con 3 alumnos y 3 actividades en ventanas de 2 × 2, las cuatro combinaciones dan cada celda una vez, con totalAlumnos y totalTareas 3 en las cuatro y el orden del gradebook (los empates de fecha límite por id); cursores ajenos responden 400 y un cursorTareas en mayúsculas funciona igual»
- **CAL2-A06** → mismo archivo, «CAL2-A06: clase.nombre es el de la clase; sin alumnos, alumnos [] y totalAlumnos 0 con las columnas igual; sin actividades, tareas [] y totalTareas 0 con cada fila sin celdas»
- **CAL2-A07** → mismo archivo, tres casos:
  - «CAL2-A07: una calificación confirmada por otra conexión después de leer las celdas no cambia la celda ni el porcentaje de esa respuesta; la siguiente lectura la ve»
  - «CAL2-A07: una inscripción nueva después de leer la página no cambia los alumnos ni totalAlumnos de esa respuesta; la siguiente lectura la ve»
  - «CAL2-A07: una actividad nueva después de leer la ventana o después del conteo no cambia las columnas ni totalTareas de esa respuesta; la siguiente lectura la ve»
- **CAL2-A08** → `backend/test/exportacion-calificaciones-estatico.test.ts`, seis casos:
  - «CAL2-A08: el adaptador de la exportación no escribe ni bloquea, no usa SQL crudo ni Promise.all»
  - «CAL2-A08: nombra «instantaneaUnica: true» exactamente una vez, en el texto crudo y en código, dentro de leerExportacionDeCalificaciones, y llama a leerGradebookCon(tx»
  - «CAL2-A08: en código no nombra el estado de pago, la restricción, el rol, la versión ni el hash, y el correo solo en su tipo y en la consulta de correos»
  - «CAL2-A08: adapters/db/calificaciones.ts sigue sin nombrar el correo y exporta leerGradebookCon»
  - «CAL2-A08: handlers/calificaciones.ts registra la exportación con la cadena exacta y no compara rol ni relación ni toca la base»
  - «CAL2-A08 (§D-0.6): ningún comentario de los archivos nuevos o cambiados de backend/src en 02a nombra las palabras que leen en crudo las listas estáticas»
- **CAL2-A09** → `backend/test/esquemas-exportacion.test.ts`, cuatro casos:
  - «CAL2-A09: limite y limiteTareas valen 100 por omisión y aceptan de 1 a 100 enteros»
  - «CAL2-A09: cursor y cursorTareas son UUID; cursorTareas se pasa a minúsculas»
  - «CAL2-A09: exportacionDeCalificacionesRespuestaSchema, filaDeExportacionSchema y alumnoDeExportacionSchema son z.strictObject en shared/src/calificaciones.ts»
  - «CAL2-A09: una respuesta válida pasa; con estadoPago, accesoRestringido o rol de más en el alumno, en la fila o en la respuesta, se rechaza»
- **CAL2-A10** → `backend/test/exportacion-calificaciones.integracion.test.ts`, «CAL2-A10: leerExportacionDeCalificaciones hace las mismas sentencias con 1, 2 y 30 alumnos y con 1, 2 y 30 actividades, con y sin cursores»

Todas las viñetas tienen al menos un caso que las cubre.

## Conteos
- Backend, `cd backend; npx vitest list > backend-list.txt`:
  - `grep -a -c "" backend-list.txt` → 2796 casos, igual que la corrida (`Tests  2796 passed`)
  - `grep -a -o "^[^ ]*\.test\.ts" backend-list.txt | sort -u | wc -l` → 233 archivos
  - `grep -a "CAL2-" backend-list.txt | wc -l` → 22 casos `CAL2-`: 2 en `exportacion-calificaciones-autorizacion.integracion.test.ts`, 10 en `exportacion-calificaciones.integracion.test.ts`, 6 en `exportacion-calificaciones-estatico.test.ts` y 4 en `esquemas-exportacion.test.ts` (`grep -a "CAL2-" … | sed 's/ > .*//' | sort | uniq -c`)
  - `*.ataque` del backend: `grep -a -o "^[^ ]*\.ataque\.test\.ts" backend-list.txt | sort -u | wc -l` → 93 archivos
- Frontend, `cd frontend; npx vitest list > frontend-list.txt`:
  - `grep -a -o "^[^ ]*\.test\.tsx\?" frontend-list.txt | sort -u | wc -l` → 272 archivos
  - `grep -a -c "CAL2-"` → 0 (02a no toca el frontend)
  - `grep -a -c ""` da 5974 líneas, contra 5953 casos de la corrida (`Tests  5953 passed (5953)`): hay títulos que ocupan más de una línea. La cifra de casos es la de la corrida.

## Decisiones donde el plan calla
1. **El correo en el adaptador (CAL2-A08).** El plan pide que `email` aparezca "solo en el `select` de los correos y en sus tipos". El adaptador también tiene que llevar el valor leído a cada fila: el `Map` de correos y `alumno: { …, email }`. La prueba permite `email` en el tipo `AlumnoDeExportacionDb` y en el tramo que va de `const cuentas =` al `return {` de la función, que incluye el único `select` con `email: true`, y exige que no aparezca en ninguna otra parte del código.
2. **CAL2-A10 con cursores.** Con cursores, la página excluye al alumno y la actividad del cursor. Para que las dos variantes tengan las mismas sentencias en todos los tamaños, cada clase lleva un alumno centinela (el primero por nombre) y una actividad centinela (la más reciente). Con cursores (`cursor` = centinela y `cursorTareas` = centinela), la ventana trae exactamente 1, 2 o 30 alumnos y 1, 2 o 30 actividades. Sin cursores, trae una fila y una columna más. Los tamaños son 1×1, 2×2, 30×30, 1×30 y 30×1. Las secuencias esperadas: 10 sentencias sin cursores y 12 con cursores. Coinciden con "de 9 a 12" de §D-2.
3. **CAL2-A05, límite por omisión.** Para ver el 100 por omisión en las dos dimensiones, la prueba siembra en bloque (`createMany`) 101 alumnos y 101 actividades: sin argon2 ni la API, con correos `@pruebas.local` y limpieza por `idsUsuarios` e `idsClases` como en las demás pruebas.
4. **CAL2-A07, "una actividad nueva después del conteo".** Lo cubrí literalmente (después de `tarea.count`) y además después de `tarea.findMany` (antes del conteo), que es el caso en que la instantánea protege la coherencia entre la ventana y `totalTareas`.
5. **Comentarios de los archivos nuevos.** En los comentarios de `exportacion-de-calificaciones.ts` escribí "el tipo de cuenta" en lugar de "rol" para no tener la palabra en el texto crudo; en el código no aparece.
6. **CAL2-A01.** Para la clase inexistente probé con el maestro ajeno, el maestro de la clase y el admin; los tres dan `403 SIN_ACCESO_A_LA_CLASE`, la misma respuesta que una clase ajena. El "token vencido" es un token del maestro firmado hace dos horas.

## Hallazgos atendidos
Ninguno: es la implementación inicial de 02a. No aplica la lista de hermanos.

## Desviaciones del plan
- Ninguna en el código, las pruebas ni los documentos.
- En el proceso: lancé las suites completas del backend y del frontend con lecturas de carga por encima del 25 % (ver "Verificación").

## Pendiente o fuera de alcance detectado
- A-02, A-03, A-04 y A-10 los aplica el orquestador al cerrar 02a (paso 11).
- 02a no tiene interfaz, así que no lleva matriz de avisos.
- Las pruebas de 02a no cubren `P2028` → `503` en la ruta nueva: el plan no lo pide como prueba requerida (es un punto de ataque del tester), y el camino es el mismo `enTransaccion` del gradebook.
