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


---

# Resumen del programador — CALIFICACIONES-02b (frontend)

Plan: `docs/trabajo/CALIFICACIONES-02-exportar-a-excel/plan.md` (SHA-256 `a25ccc63…`). Base de 02b dentro de los paquetes: `<K2a>` = `57192e2`. Sin commit.

Pasos completados: 9 de 9 (pasos 2 a 10 de "02b"). El paso 2 se detuvo en la PARADA de control H-0. El humano respondió "H-0 bien" y la muestra (`a56f9a56…`) abrió limpia en Excel y en LibreOffice, así que DH-01 (a) se mantiene sin corrección. Después seguí con los pasos 3 a 10.

## Archivos creados / modificados
Nuevos de producción:
- `frontend/src/lib/xlsx.ts` (§D-5.1)
- `frontend/src/lib/lector-xlsx-de-prueba.ts` (solo lo importan pruebas)
- `frontend/src/services/descargaService.ts` (§D-5.3)
- `frontend/src/features/calificaciones/components/exportar-a-excel.tsx` (§D-7)

Cambiados de producción:
- `frontend/src/features/calificaciones/types.ts`: reexporta `AlumnoDeExportacion`, `ExportacionDeCalificacionesRespuesta` y `FilaDeExportacion`, y suma los tipos de la interfaz de §D-4 y §D-7.
- `frontend/src/features/calificaciones/data.ts`: §D-8 y las constantes de la hoja y del nombre del archivo.
- `frontend/src/features/calificaciones/lib.ts`: `rutaDeExportacion`, `ventanasDeLaExportacion`, `mismoAlumnoDeExportacion`, `combinarVentanasDeExportacion`, `filasDeLaHojaDeExportacion`, `hojaDeExportacion`, `nombreDelArchivoDeExportacion`, `mensajeDeErrorDeExportacion` y `avisoDelResultadoDeExportacion`.
- `frontend/src/features/calificaciones/hooks.ts`: `useExportarCalificaciones` y las privadas `recorrerLaExportacion` y `exportarCalificaciones`.
- `frontend/src/features/calificaciones/gradebook-view.tsx`: solo el `import` y la inserción `<ExportarAExcel claseId={claseId} pidiendoLaVentana={consulta.isFetching} />` entre `ResumenDelGradebook` y `NavegacionDelGradebook`.

Pruebas nuevas:
- `frontend/src/lib/xlsx.test.ts` (B01 a B03)
- `frontend/src/lib/xlsx-muestra.test.ts` (B17)
- `frontend/src/services/descargaService.test.ts` (B16)
- `frontend/src/features/calificaciones/exportacion-02b.test.ts` (B04 a B07)
- `frontend/src/features/calificaciones/exportar-02b.test.tsx` (B08 a B12 y B14)
- `frontend/src/features/calificaciones/recuperar-exportacion-02b.test.tsx` (B13)
- `frontend/src/features/calificaciones/estatico-02b.test.ts` (B15)

Prueba normal cambiada (lista cerrada): `frontend/src/features/calificaciones/estatico-01d.test.ts`.
- `ESPERADOS` suma `components/exportar-a-excel.tsx`.
- El título dice "doce archivos".
- La regla del correo se aplica después de quitar las tres declaraciones de la lista única, con la precondición de que existen y lo nombran.
- `toBe(15)` pasa a `toBe(16)`.
- Nada más del archivo.

No toqué ninguna `*.ataque`. Con `find frontend/src -name "*.ataque.test.ts*" | sort | xargs sha256sum | sha256sum` sale `81e3fa122248aaf926d249c8084ba3a9eb5c5adde7ebb3d66f3d636c75508378`, el mismo valor que registró el tester después de C-3 y C-4. C-3 (CAL-T-182) y C-4 (V-06) están en verde.

`git diff --quiet 57192e2 -- shared backend` sale limpio: 02b no toca `shared/` ni `backend/`. No cambian `package.json`, `package-lock.json`, `tsconfig*.json` ni la configuración de Vite o Vitest. Las dos pruebas de `lib/` llevan `/// <reference types="node" />` (N-05, autorizada).

## Verificación (comando exacto y última línea)
- `cd frontend; npm run lint`: código 0; termina con `> tsc -b` sin errores (ESLint limpio y "All matched files use Prettier code style!").
- `cd frontend; npm run test`: `Tests  6034 passed (6034)`, con `Test Files  279 passed (279)` y `Duration  361.69s`.
- `cd frontend; npm run build`: `✓ built in 1.10s` (código 0; solo el aviso de siempre sobre el tamaño de los chunks).
- Paso 2 (antes de H-0): `cd frontend; npx vitest run src/lib/` dio `Tests  270 passed (270)`.
- backend y `shared/`: no se corrieron, porque 02b no los toca (diff limpio contra `57192e2`).

**Carga del equipo.** Antes de la suite completa medí 9, 42 y 48 %, y después 43, 40 y 40 %. Unity y Docker Desktop estaban activos, y no son procesos míos. Esperé a que bajara: un bucle de lecturas dio 45/38, 40/39, 35/24, 39/37, 33/41, 39/32 y por fin **14/12**. Con esas dos lecturas seguidas en 25 % o menos lancé la suite. Corrí una sola suite cada vez; las corridas acotadas de los archivos nuevos fueron antes de la completa, nunca en paralelo.

## Pruebas requeridas (02b): archivo y título exacto
- **CAL2-B01** → `src/lib/xlsx.test.ts`, tres casos:
  - «CAL2-B01: la salida de armarLibroXlsx es igual, byte a byte, al ZIP armado con los seis literales de §D-5.1 y los valores literales del contenedor»
  - «CAL2-B01: el CRC del escritor da 0xCBF43926 para «123456789» y coincide con crc32 de node:zlib sobre cada parte»
  - «CAL2-B01: dos llamadas con la misma hoja dan los mismos bytes y cada parte es XML bien formado para DOMParser»
- **CAL2-B02** → mismo archivo, cinco casos:
  - «CAL2-B02: & < > " ' se escapan, ]]>, saltos, tabuladores, retornos, espacios en los extremos, acentos, ñ y un emoji se conservan con xml:space="preserve"»
  - «CAL2-B02: U+0000 a U+0008, U+000B, U+000C, U+000E a U+001F, U+FFFE, U+FFFF y los sustitutos sueltos desaparecen; un texto que queda vacío no se escribe»
  - «CAL2-B02: el escape de OOXML: Tarea_x0041_ y _x00e9_ ganan _x005F_; _x41_ y x0041_ quedan igual»
  - «CAL2-B02: un texto que empieza con =, +, - o @ es una celda inlineStr sin <f>»
  - «CAL2-B02: el nombre de la hoja lleva el mismo escape en workbook.xml»
- **CAL2-B03** → mismo archivo, siete casos:
  - «CAL2-B03: 0, -0, 10, 8.5, 7.78, 1000 y 82.4 se escriben con punto decimal; NaN, Infinity y -Infinity lanzan»
  - «CAL2-B03: un texto de 32,768 unidades lanza y uno de 32,767 no»
  - «CAL2-B03: un nombre de hoja vacío, de 32 caracteres o con [ ] : * ? / \ lanza; uno de 31 no»
  - «CAL2-B03: inmovilizar con 0 filas o 0 columnas lanza»
  - «CAL2-B03: las columnas 1, 26, 27, 52, 53, 702 y 703 son A, Z, AA, AZ, BA, ZZ y AAA»
  - «CAL2-B03: una fila sin celdas escritas no tiene <row> y la siguiente conserva su número; la negrita usa s="1" en el orden r, s, t»
  - «CAL2-B03: con 3 filas y 2 columnas inmovilizadas el pane es el literal y la selección C4; sin anchos no hay <cols>»
- **CAL2-B04** → `src/features/calificaciones/exportacion-02b.test.ts`, cinco casos:
  - «CAL2-B04: una sola respuesta da la matriz, con las columnas de la más antigua a la más reciente y las celdas en ese orden; 2 × 2 ventanas dan la misma matriz»
  - «CAL2-B04: cada regla de §D-4 da cambio con su propio caso» (14 casos con nombre: reglas 1 a 6)
  - «CAL2-B04: sin alumnos o sin tareas da vacio»
  - «CAL2-B04: mismoAlumnoDeExportacion da false con id, nombre, dirección o porcentaje distinto (incluido null frente a un número) y true con los cuatro iguales»
  - «CAL2-B04: ventanasDeLaExportacion da 1 con 0 × 0, 1 × 1 y 100 × 100; 2 con 101 × 100; 4 con 101 × 101 y 201 con 20,100 × 100»
- **CAL2-B05** → mismo archivo, cuatro casos:
  - «CAL2-B05: las tres filas de encabezado en negrita, Sin categoría, los puntos como número, las calificaciones como número, los estados según ahora y el promedio como número o —»
  - «CAL2-B05: una fila con campos de más (estado de pago y restricción forzados) no los lleva a ninguna celda»
  - «CAL2-B05: hojaDeExportacion: nombre, anchos y panel inmovilizado de §D-5.2»
  - «CAL2-B05: una celda calificada sin calificación y una entregada con calificación lanzan»
- **CAL2-B06** → mismo archivo, cuatro casos:
  - «CAL2-B06: la forma de §D-6 con la fecha local»
  - «CAL2-B06: los reservados, los de control y los de dirección pasan a espacio y los espacios se colapsan; puntos y espacios finales fuera»
  - «CAL2-B06: una clase de 120 caracteres se recorta a 80 sin partir un emoji del borde»
  - «CAL2-B06: una clase que queda vacía da el nombre sin clase; siempre termina en .xlsx y nunca lleva U+202E»
- **CAL2-B07** → mismo archivo, dos casos:
  - «CAL2-B07: las entradas fuera de contrato dan el genérico; los restos sin texto visible dan el genérico tras un campo cualquiera y el de sin acceso tras claseId»
  - «CAL2-B07: el 400 de cursor o de cursorTareas da el de cambio; SIN_ACCESO_A_LA_CLASE el de sin acceso; 500, 503, sin conexión, respuesta inválida y un código desconocido el genérico, nunca el texto del servidor»
- **CAL2-B08** → `src/features/calificaciones/exportar-02b.test.tsx`, cuatro casos:
  - «CAL2-B08: maestro ve «Exportar a Excel» (outline, sm) con la tabla, dentro de la raíz opaca, entre el resumen y los botones de las ventanas, sin disabled» y el mismo título con «admin» (`it.each`)
  - «CAL2-B08: con el texto del cursor a la vista también está; no está en la carga, en los dos vacíos ni con un error que reemplaza la vista»
  - «CAL2-B08: lleva aria-busy mientras exporta y mientras se pide una ventana del gradebook; dos clics seguidos hacen un solo recorrido y un clic con la ventana pidiéndose no exporta»
- **CAL2-B09** → mismo archivo: «CAL2-B09: con 2 × 2 ventanas pide en el orden de §D-4, descarga una vez con el nombre y el tipo, y el archivo trae encabezados, celdas, promedios y direcciones, sin estado de pago ni restricción; un solo aviso y el foco en el botón»
- **CAL2-B10** → mismo archivo, 16 casos:
  - «CAL2-B10: %s da su aviso, uno solo, sin descarga, con el botón fuera de la espera y el foco en él» (`it.each` con 403 SIN_ACCESO_A_LA_CLASE, 400 de cursor en la segunda ventana, 400 de cursorTareas en la segunda ventana, una combinación con cambio, un cursor que se repite, vacio, 500, 503, sin conexión y RESPUESTA_INVALIDA)
  - «CAL2-B10: un 500 no se reintenta: una sola petición de esa ventana»
  - «CAL2-B10: %s no da aviso ni descarga (apiClient redirige)» (`it.each` con 401 con refresco fallido, 403 ACCESO_RESTRINGIDO y 403 CAMBIO_DE_CONTRASENA_REQUERIDO)
  - «CAL2-B10: con 201 ventanas necesarias según la primera respuesta, una sola petición y el aviso de demasiadas, sin promesa de reintento»
  - «CAL2-B10: con totales de una ventana pero cursores nuevos en cada respuesta, el recorrido para en la petición 200 con el aviso de demasiadas»
- **CAL2-B11** → mismo archivo, cuatro casos:
  - «CAL2-B11: %s da un solo aviso, el genérico, nunca el texto del servidor, y el botón sale de la espera» (`it.each` con campo-no-pintable, sin-texto-visible y ruta, de `ENTRADAS_DE_FORMULARIO`)
  - «CAL2-B11: un rechazo seguido de otro intento: el aviso del rechazo se va al empezar y solo se lee el del intento nuevo»
- **CAL2-B12** → mismo archivo, cuatro casos:
  - «CAL2-B12: ir a otra sección con la exportación en vuelo aborta la petición; no hay aviso ni descarga aunque la respuesta llegue después, y al volver exportar funciona»
  - «CAL2-B12: desmontar entre la última respuesta y la descarga no descarga ni avisa»
  - «CAL2-B12: con la exportación en vuelo, una recarga del gradebook que trae %s quita el botón: la exportación se aborta sin aviso ni descarga y el foco queda en la raíz» (`it.each` con «403 SIN_ACCESO_A_LA_CLASE» y «la primera ventana sin alumnos»)
- **CAL2-B13** → `src/features/calificaciones/recuperar-exportacion-02b.test.tsx`, 13 casos. Cada frase («Las calificaciones cambiaron…» y «No pudimos preparar…») tiene su `describe.each` con seis casos; cada título termina con la frase entre paréntesis:
  - «CAL2-B13 (1): repetir el control: pulsar otra vez «Exportar a Excel» vuelve a pedir desde la primera ventana y descarga (…)»
  - «CAL2-B13 (2): ir a Personas y volver a Calificaciones antes del staleTime, y exportar (…)»
  - «CAL2-B13 (3): pulsar «Calificaciones» estando en ella no exporta por sí solo; después «Exportar a Excel» sí (…)»
  - «CAL2-B13 (4): atrás y adelante del historial, y exportar (…)»
  - «CAL2-B13 (5): con el gradebook en otra ventana (Alumnos siguientes) y al regresar (Alumnos anteriores), la exportación pide desde su primera ventana (…)» y el mismo título con «Tareas más antiguas» y «Tareas más recientes»
  - Y un caso aparte: «CAL2-B13 (6): un intento con cambio, otro con el genérico y el tercero con éxito: solo se ve el aviso del intento que acaba de terminar»
- **CAL2-B14** → `exportar-02b.test.tsx`: «CAL2-B14: exportar no pide ni invalida el gradebook, y una ventana del gradebook pedida mientras se exporta no cancela la exportación»
- **CAL2-B15** → `src/features/calificaciones/estatico-02b.test.ts`, seis casos:
  - «CAL2-B15: exportar-a-excel.tsx usa outline, enEspera y no disabled, y sus textos vienen de data.ts»
  - «CAL2-B15: toast y sonner solo en el botón dentro del módulo; hooks.ts no tiene onError»
  - «CAL2-B15: lib/xlsx.ts no importa nada; descargaService no importa de features/ ni tiene target; nadie en producción importa el lector de prueba»
  - «CAL2-B15: en el módulo, la dirección de los alumnos solo en la lista única de §D-5.2, y las tres la nombran»
  - «CAL2-B15: lib/xlsx.ts contiene los cinco literales fijos de §D-5.1 tal cual»
  - «CAL2-B15: ningún comentario de lo nuevo o lo cambiado en 02b tiene las palabras de §D-0.6»
- **CAL2-B16** → `src/services/descargaService.test.ts`: «CAL2-B16: crea un Blob con el tipo y los bytes, un enlace con download y sin destino, un solo clic, quita el enlace y revoca la URL en el turno siguiente»
- **CAL2-B17** → `src/lib/xlsx-muestra.test.ts`: «CAL2-B17: escribe cmep-calificaciones-muestra.xlsx en la carpeta temporal con 3 filas de encabezado en negrita, 4 alumnos y 30 tareas (de A a AG), y el archivo tiene los bytes de la salida»

Todas las viñetas de 02b tienen al menos un caso que las cubre. Hay una salvedad sobre el estado vecino del foco en un vacío; está en "Decisiones", punto 9.

## Conteos
- `cd frontend; npx vitest list > f-list.txt`, contado con `grep -a`:
  - `grep -a -o "^[^ ]*\.test\.tsx\?" f-list.txt | sort -u | wc -l` → **279 archivos**, igual que la corrida.
  - `grep -a -o "^[^ ]*\.ataque\.test\.tsx\?" f-list.txt | sort -u | wc -l` → **153 `*.ataque`**.
  - `grep -a -c "CAL2-B" f-list.txt` → **81 casos `CAL2-B`**. Por archivo (`grep -a "CAL2-B" f-list.txt | sed 's/ > .*//' | sort | uniq -c`): `lib/xlsx.test.ts` 15, `lib/xlsx-muestra.test.ts` 1, `services/descargaService.test.ts` 1, `exportacion-02b.test.ts` 15, `exportar-02b.test.tsx` 30, `recuperar-exportacion-02b.test.tsx` 13 y `estatico-02b.test.ts` 6.
- Casos totales: **6034**, de la corrida (`Tests  6034 passed (6034)`). Antes de 02b eran 5953 (resumen de 02a); la diferencia de 81 son los `CAL2-B`.

## Matriz de avisos, recargas y foco de §D-7, contrastada con el código
Cómo funciona en el código:
- **El aviso.** El manejador de `components/exportar-a-excel.tsx` quita el aviso anterior (`toast.dismiss(ID_DEL_AVISO_DE_EXPORTACION)`) antes de cada intento. Después da un solo `toast.success` o `toast.error` con el `id` fijo `"exportar-calificaciones"`. El texto sale de `avisoDelResultadoDeExportacion` (resultados) o de `mensajeDeErrorDeExportacion` (errores lanzados).
- **La espera.** La espera visible es `enEspera={exportar.isPending || pidiendoLaVentana}`. La guarda síncrona es `if (exportandoRef.current || pidiendoLaVentana) return`, y `exportandoRef` se libera en el `finally`.
- **La cancelación.** Cada intento crea un `AbortController` nuevo, guardado en `controladorRef`. El `useEffect` de limpieza lo aborta al desmontarse. `exportarCalificaciones` comprueba `signal.aborted` antes de `descargarArchivo` y, si está abortada, devuelve `cancelado`. El manejador no avisa si la señal está abortada, ni en el `try` ni en el `catch`.
- **El foco.** El botón no mueve el foco. Si la vista lo quita, actúa `useFocoAlPerderseElControl` de `gradebook-view.tsx` (sin cambio).
- **Ninguna recarga del gradebook.** La exportación es una mutación sin `onSuccess` ni `invalidateQueries`.

**Disparador «Exportar a Excel»**, con la vista montada:

| Caso | Qué se renueva | Aviso (uno solo, `id` fijo) | Foco | Prueba |
|---|---|---|---|---|
| Éxito | Nada; el gradebook no se pide ni se invalida | `toast.success` «Se descargó «<archivo>».» | Se queda en el botón | B09, B14 |
| `400 VALIDACION` de `cursor` o `cursorTareas` | Nada | `toast.error` con el texto de cambio («Las calificaciones cambiaron…»), vía `mensajeDeErrorDeExportacion` → `esErrorDeCursorDeCalificaciones` | El botón | B10, B07 |
| La combinación da `cambio` (reglas 1 a 6) o un cursor se repite en el recorrido | Nada | `toast.error` con el texto de cambio, vía `avisoDelResultadoDeExportacion` | El botón | B10, B04 |
| `vacio` | Nada | `toast.error` «No hay calificaciones que exportar…» | El botón | B10 |
| `demasiado`: más de 200 ventanas según los totales de la primera respuesta, o 200 peticiones sin terminar | Nada | `toast.error` «Esta clase tiene demasiadas calificaciones…», sin «Inténtalo de nuevo» | El botón | B10 |
| `403 SIN_ACCESO_A_LA_CLASE` o `400` de `claseId` | Nada; el gradebook lo dirá en su próxima lectura | `toast.error` «No tienes acceso a esta clase.», vía `mensajeDeErrorCalificaciones` | El botón | B10, B07 |
| `401` con refresco fallido, `403 ACCESO_RESTRINGIDO`, `403 CAMBIO_DE_CONTRASENA_REQUERIDO` | `apiClient` redirige (`irA`) | Ninguno: `errorQueRedirigeElCliente` → `return` | — | B10 |
| `5xx`, `503`, sin conexión, `RESPUESTA_INVALIDA`, otro `400` (fuera de contrato, vacío o con ruta), una celda mal formada que lanza en `filasDeLaHojaDeExportacion` | Nada; la mutación no reintenta | `toast.error` genérico «No pudimos preparar el archivo…», nunca el texto del servidor | El botón | B10, B11, B07, B05 |
| Un rechazo y después otro intento | Nada | El aviso anterior se quita al empezar (`toast.dismiss`); queda solo el del intento nuevo | El botón | B11, B13 (6) |

**En vuelo a la vez:**

| Caso | Qué se renueva | Aviso | Foco | Prueba |
|---|---|---|---|---|
| Una ventana del gradebook o una recarga mientras se exporta, y la tabla o el texto del cursor siguen a la vista | La consulta del gradebook, como hoy; la exportación sigue (su `signal` no se aborta) | Los del gradebook, como hoy (ninguno); al terminar, el de la exportación | Como hoy | B14, B08 |
| Una recarga del gradebook que reemplaza la vista (`403`) o la deja en un vacío | La del gradebook, como hoy; `ExportarAExcel` se desmonta y el `useEffect` aborta el controlador | Ninguno de la exportación, tampoco si su respuesta llega después; la vista muestra solo su `MensajeError` o su vacío | La raíz de la vista, por `useFocoAlPerderseElControl`, si el botón tenía el foco | B12 |
| Pulsar otra vez, o pulsar con la ventana del gradebook pidiéndose | Nada: la guarda con ref y `enEspera` (que hace `preventDefault`) lo ignoran | Ninguno | El botón | B08 |

**Con la vista desmontada:**
- **En cualquier punto del recorrido** (ir a otra sección, atrás en el historial, o la vista reemplazada): la petición en curso se aborta, porque el `signal` llega abortado al `fetch` y `apiClient` lanza `SIN_CONEXION`. El `catch` ve `signal.aborted` y no avisa. Si en cambio la respuesta llega igual (el doble no rechaza al abortar), el `try` ve la señal abortada y tampoco avisa ni descarga. Lo cubre B12, primer caso.
- **Entre la última respuesta y la descarga:** `exportarCalificaciones` devuelve `cancelado` y no llama a `descargarArchivo`; el manejador no avisa. Lo cubre B12, segundo caso.
- **Al volver a la vista:** el componente nuevo tiene sus propias refs y su propio controlador, y exportar funciona. Lo cubre B12, primer caso.
- Las frases «Inténtalo de nuevo» se cumplen por cada camino (B13): repetir el control, ir a otra sección y volver antes del `staleTime`, pulsar la sección activa, atrás y adelante, y otra ventana del gradebook de ida y de vuelta. En todos, la exportación vuelve a pedir a la red desde la primera ventana, porque es una mutación y nunca sirve de la caché.

## Decisiones donde el plan calla
1. **Tipos de interfaz de más en `types.ts`.** Además de los del plan, agregué `FilaDeLaMatriz` (la fila de `MatrizDeExportacion`), `RecorridoDeExportacion` (lo que devuelve `recorrerLaExportacion`: `ventanas`, `cambio` o `demasiado`) y `AvisoDeLaExportacion`. Los ganchos y los componentes no pueden declarar tipos (CAL-1D09).
2. **`avisoDelResultadoDeExportacion`** (`lib.ts`, pura). Hace la correspondencia de resultado a aviso del punto 4 del manejador. El componente solo decide entre `success` y `error`; `cancelado` no avisa.
3. **Constantes en `data.ts`.** `ANCHOS_DE_LA_EXPORTACION`, `INMOVILIZADO_DE_LA_EXPORTACION`, `RESERVADOS_DEL_NOMBRE_DE_ARCHIVO` (`/[\\/:*?"<>|]/g`) y `LARGO_MAXIMO_DE_LA_CLASE_EN_EL_ARCHIVO` (80). Las claves de los anchos son `primeraColumna` y `segundaColumna`, para no nombrar el correo fuera de `TEXTOS_EXPORTACION`.
4. **El recorrido.** Antes de cada petición, si ya se hicieron 200, devuelve `demasiado`: así se hacen exactamente 200 (B10). La comprobación de los totales corre solo tras la primera respuesta. Los cursores de alumnos se recuerdan por ventana de tareas, porque entre ventanas de tareas se repiten de forma legítima; los de tareas, en todo el recorrido. Para la ventana siguiente se usa el `siguienteCursorTareas` de la última página de alumnos.
5. **`combinarVentanasDeExportacion` con una lista vacía** devuelve `vacio`. Es inalcanzable, porque el recorrido siempre trae al menos una respuesta. Si una ventana no tiene la fila del alumno al armar la matriz (inalcanzable tras la regla 4), lanza.
6. **`celdaDeLaHoja`.** Lanza en los dos casos de la Enmienda 1: `calificado` sin calificación, y otro estado con calificación.
7. **`descargarArchivo`** copia los bytes (`new Uint8Array(contenido)`) para el `Blob`: así el tipo es `Uint8Array<ArrayBuffer>`, que `BlobPart` exige en la versión de TypeScript del proyecto. El botón lleva `className="self-start"` para no ocupar todo el ancho del panel (columna flexible).
8. **Pruebas con `sonner` real.** `exportar-02b.test.tsx` monta el `Toaster` de `sonner` y espía `toast.success`, `toast.error` y `toast.dismiss` para contar "un solo aviso". B13 monta el de `components/ui/sonner`, como pide el plan. La regla "solo `providers.tsx` importa ese Toaster" lee solo producción, y sigue en verde.
9. **Reloj en el segundo caso de B12 (el vacío).** `useFocoAlPerderseElControl` vuelve a evaluar el foco cuando cambia la clave de `claveDeFocoDeLaConsulta`, que lee `dataUpdatedAt`. Con `Date` quieto (CAL-T-191), una respuesta nueva en el mismo milisegundo no cambia la clave y el foco quedaba en `<body>`. En la prueba adelanté el reloj un segundo antes de la recarga, como pasa en el navegador. **Observación para el manager:** es un límite del gancho compartido (`components/foco/`, en "No se toca"), no de 02b. Dos respuestas con datos en el mismo milisegundo que quitan el control no moverían el foco. En el navegador es prácticamente inalcanzable y no lo corregí; si se quiere cerrar, el destino natural es el `chore` de foco y navegación del marco (con N-52 y N-54).
10. **B10, «401 con refresco fallido».** El doble responde `401` a `/api/auth/refrescar`, y `apiClient` llama a `irA` (sustituido).
11. **B12, «desmontar entre la última respuesta y la descarga».** Lo simulo con una respuesta cuyo `json()` espera a una promesa: el `fetch` ya resolvió y la vista se desmonta antes de que llegue el cuerpo.
12. **El orden de las tareas en la matriz** usa `Date.parse(fechaLimite)` y, en un empate, el id ascendente (DH-04 a).

## Hallazgos atendidos
Ninguno: es la implementación inicial de 02b (H-0 sin corrección).

## Desviaciones del plan
Ninguna en el código, las pruebas ni los documentos. La única observación es la del punto 9 de "Decisiones": el reloj adelantado dentro de una prueba propia, por un límite de un gancho de "No se toca".

## Pendiente o fuera de alcance detectado
- El límite de `claveDeFocoDeLaConsulta` con dos respuestas en el mismo milisegundo (punto 9), con destino el `chore` de foco y navegación del marco.
- Al cerrar 02b le tocan al orquestador A-01, A-05, A-06, A-07, A-08 (`DESIGN.md` §7.28) y A-09 (`CLAUDE.md`, con DH-12 a), y después la comprobación humana H-1 a H-7.


---

# Corrección de la ronda 1 — 02b

Fuentes: `reporte-tester.md` ("## Ronda 1 — 02b" y "### Reescritura de CAL2-T-20 (arbitraje)") y `revision.md` ("## Arbitraje de la ronda 1 — 02b"). Es la primera ronda de corrección. Sin commit.

**Archivos que toqué**, todos dentro de la lista del arbitraje:
- Producción:
  - `frontend/src/features/calificaciones/lib.ts`
  - `frontend/src/features/calificaciones/hooks.ts` (solo la comprobación de la primera respuesta)
  - `frontend/src/features/calificaciones/data.ts` (`COLUMNAS_FIJAS_DE_LA_HOJA = 3`)
  - `frontend/src/lib/xlsx.ts`
- Pruebas:
  - `frontend/src/features/calificaciones/exportacion-02b.test.ts`
  - `frontend/src/features/calificaciones/exportar-02b.test.tsx`
  - `frontend/src/lib/xlsx.test.ts`

No toqué ninguna `*.ataque`. Son 154 contando la de la ronda 1; `exportacion-02b-r1.ataque.test.tsx` sigue en `bef8aa53…`, el SHA-256 que dejó el tester. Tampoco toqué nada de "No se toca".

**H-0.** Los bytes de una hoja válida no cambian. CAL2-B01 sigue en verde, y la muestra de CAL2-B17 tras la corrida es `C:\Users\Carlos\AppData\Local\Temp\cmep-calificaciones-muestra.xlsx`, de 18628 bytes, con SHA-256 **`a56f9a569d73d66d147e85a5461c5899d060968fe75e269e11c6d245d0b290e3`**: el mismo de H-0.

## T-01 (CAL2-T-18): el nombre parte un grafema en el borde de 80 — corregido
**Remedio.** Está en `nombreDelArchivoDeExportacion` (`lib.ts`), con la función privada nueva `recortarSinPartirGrafemas`.
- Después de la limpieza de siempre, el texto se divide en grafemas con `Intl.Segmenter` (`granularity: "grapheme"`).
- Se toman grafemas enteros mientras la suma de sus puntos de código no pase de 80. El primero que no cabe se descarta entero, con todo lo que sigue.
- Después se quitan otra vez los puntos y espacios del final. Si no queda nada, el nombre va sin clase.
- Sin `Intl.Segmenter` (se lee de `Intl` y puede faltar), recorta por puntos de código, que no parte un par sustituto. Un comentario explica por qué: un detalle del nombre nunca hace fallar la exportación.
- Sin `new RegExp(`, `\p{L}`, `.split(":")` ni `.indexOf(":")`, y sin invisibles literales.

**Pruebas nuevas** (`src/features/calificaciones/exportacion-02b.test.ts`, en el `describe` «el nombre del archivo sin partir grafemas (CAL2-B06, T-01)»). Los emojis, el ZWJ y los modificadores se arman con `String.fromCodePoint(…)`, nunca literales:
- «CAL2-B06: una bandera, una familia con ZWJ, una tecla con número y un tono de piel que cruzan el punto de código 80 se quitan enteros»
- «CAL2-B06: el mismo grafema que termina justo en el punto de código 80 se conserva entero»
- «CAL2-B06: un punto o un espacio que queda al final tras el recorte se quita; una clase que es un solo grafema de más de 80 puntos de código da el nombre sin clase»
- «CAL2-B06: sin Intl.Segmenter recorta por puntos de código, sin partir un par sustituto y sin lanzar». Sustituye `Intl.Segmenter` por `undefined` dentro de un `try/finally` y comprueba que queda restaurado.

CAL2-T-18 (del tester) está en verde.

**Hermanos y estados vecinos de T-01:**

| Hermano o estado | ¿Le aplica el remedio? | ¿Se aplicó? / Prueba |
|---|---|---|
| Otro recorte de texto en 02b | No hay otro: la hoja no recorta y su nombre es fijo («Calificaciones») | No aplica |
| El grafema que cabe exacto (termina en el punto de código 80) | Sí: se conserva entero | Sí · «…termina justo en el punto de código 80 se conserva entero» (bandera, familia, tecla, tono de piel y U+1F600) |
| El grafema que cruza el 80 | Sí: se descarta entero | Sí · «…cruzan el punto de código 80 se quitan enteros» y CAL2-T-18 |
| La clase que queda vacía tras el recorte (un solo grafema de más de 80 puntos de código) | Sí: el nombre sin clase | Sí · «…un solo grafema de más de 80 puntos de código da el nombre sin clase» |
| Un punto o un espacio que queda al final tras el recorte | Sí: se quita | Sí · el mismo caso («a»×77 + «. » + una bandera) |
| El navegador sin `Intl.Segmenter` | Sí: recorte por puntos de código, sin lanzar | Sí · «sin Intl.Segmenter…» |
| Un emoji de un solo punto de código en el borde (la prueba de antes) | Sí | Sigue en verde · «CAL2-B06: una clase de 120 caracteres se recorta a 80 sin partir un emoji del borde» |

## T-02 (CAL2-T-20 a y b): más de 16,381 tareas dan columnas después de XFD — corregido
**Remedio en dos capas, más una tercera del mismo criterio:**
1. **Recorrido** (`hooks.ts`, la comprobación de la primera respuesta). Además de `necesarias > 200`, devuelve `{ tipo: "demasiado" }` si `!cabeEnUnaHoja(totalAlumnos, totalTareas)`, sin más peticiones. El aviso es el de M-03, sin texto nuevo.
2. **Función pura `cabeEnUnaHoja`** (`lib.ts`). Comprueba que `totalTareas + COLUMNAS_FIJAS_DE_LA_HOJA` (3, en `data.ts`, sin nombrar el correo) quepa en `MAXIMO_DE_COLUMNAS_XLSX`, y que `totalAlumnos` + las 3 filas de encabezado quepan en `MAXIMO_DE_FILAS_XLSX`.
3. **Escritor** (`lib/xlsx.ts`). Exporta `MAXIMO_DE_COLUMNAS_XLSX = 16_384` y `MAXIMO_DE_FILAS_XLSX = 1_048_576`. Una función privada nueva, `validarTamano`, lanza antes de armar nada si hay más de 1,048,576 filas, más de 16,384 anchos o una fila de más de 16,384 celdas.
4. **(Hermano, aplicado.)** `hojaDeExportacion` (`lib.ts`) también lanza antes de armar las filas si la matriz no cabe, con `cabeEnUnaHoja(filas, columnas)`. Lo agregué porque la primera corrida acotada (con la carga en 59 % y 46 %) dio CAL2-T-20 (a) por tiempo límite (15 s). Esa prueba arma 16,382 celdas «Asignado», y cada una pasa por `estadoDeEntregaVisible` → `vencimientoDe`, que da formato a una fecha con `Intl`. Lanzar antes de recorrer las filas es el mismo criterio de «antes de armar nada» del arbitraje. Está en `lib.ts`, que el arbitraje me deja tocar, pero `hojaDeExportacion` no estaba nombrada en él: **el manager decide si lo acepta.**

**Pruebas nuevas:**
- `src/lib/xlsx.test.ts`: «CAL2-B03: (T-02) 16,384 columnas llegan a XFD sin lanzar; 16,385 columnas o 16,385 anchos lanzan; más de 1,048,576 filas lanzan». Lo de las filas se prueba con un arreglo de ese largo, sin armarlas.
- `src/features/calificaciones/exportacion-02b.test.ts`:
  - «CAL2-B04: cabeEnUnaHoja: 16,381 tareas caben y 16,382 no, con 1 alumno y con 0». También comprueba el borde de filas: 1,048,573 alumnos caben y 1,048,574 no.
  - «CAL2-B05: (T-02) hojaDeExportacion lanza antes de armar las filas si la matriz no cabe: 16,382 columnas lanzan y 16,381 no».
- `src/features/calificaciones/exportar-02b.test.tsx`: «CAL2-B10: (T-02) con 1 alumno y 16,382 tareas en la primera respuesta, la hoja no cabe: una sola petición, el aviso de demasiadas, ninguna descarga y el botón fuera de la espera». Son 164 ventanas, menos de 200: solo lo detiene la hoja.

CAL2-T-20 (a) y (b), reescritas por el tester, están en verde.

**Hermanos (los demás límites de Excel):**

| Límite | ¿Le aplica? | Cómo queda |
|---|---|---|
| Columnas (16,384) | Sí | Recorrido (`cabeEnUnaHoja`), `hojaDeExportacion` y escritor. Aplicado y probado (B04, B05, B03, B10, CAL2-T-20) |
| Filas (1,048,576) | Sí | El escritor lanza (B03). `cabeEnUnaHoja` también cuenta las filas (B04), así que el recorrido y `hojaDeExportacion` lo cubren. En el recorrido es inalcanzable: con el tope de 200 ventanas no pasan de 20,000 alumnos |
| Texto de una celda (32,767) | Ya cubierto | El escritor ya lanzaba (B03); sin cambio |
| Nombre de la hoja (31, sin `[ ] : * ? / \`) | Ya cubierto | Es fijo («Calificaciones») y el escritor lo valida (B03); sin cambio |
| Ancho de columna (máximo 255) | No | Los anchos son fijos, de 14 a 36. El escritor no valida el tope de 255; no lo agregué porque el arbitraje no lo pide y ningún ancho del encargo se acerca. Queda como observación |

**Estados vecinos de la comprobación del recorrido:**

| Estado | Resultado | Prueba |
|---|---|---|
| Primera respuesta con 201 ventanas necesarias | `demasiado`, 1 petición | Sin cambio · «CAL2-B10: con 201 ventanas necesarias…» |
| Primera respuesta con 16,382 tareas (164 ventanas) | `demasiado`, 1 petición | Nuevo · «CAL2-B10: (T-02) con 1 alumno y 16,382 tareas…» y CAL2-T-20 (b) |
| Las dos condiciones a la vez | `demasiado`, 1 petición: la condición es un `||` en la misma comprobación | Sin caso propio: cualquiera de las dos lo detiene, y cada una está probada |
| La clase crece a mitad del recorrido | Regla 1 de §D-4 → `cambio` (los totales difieren de la primera respuesta), así que las columnas nunca pasan de las de la primera | Sin cambio · «CAL2-B04: cada regla de §D-4 da cambio…» (casos de la regla 1) y «CAL2-B10: una combinación con cambio…» |
| Llegar a 200 peticiones sin terminar | `demasiado` en la petición 200 | Sin cambio · «CAL2-B10: con totales de una ventana pero cursores nuevos…» |

## N-07: los respaldos silenciosos de `combinarVentanasDeExportacion` — corregido
**Remedio.** Los tres casos, que son inalcanzables, ahora lanzan:
- La celda que falta en la regla 8 lanza `Error("Una fila no tiene la celda de una columna")`, como ya lanzaba la fila. Antes, `celda === undefined ? [] : [celda]` la omitía en silencio.
- `respuestas[0]?.tareas ?? primera.tareas` → cada grupo toma su primera respuesta y, si no la tiene, lanza `Error("Una ventana de tareas no tiene respuestas")`.
- `porVentana[0]?.filas ?? primera.alumnos` → se toma la ventana de referencia y, si no existe, lanza `Error("La exportación no tiene ventanas")`.

Si se alcanzaran, un `throw` dentro de la mutación da el aviso genérico, nunca una matriz mezclada.

No escribí una prueba propia: los tres casos son inalcanzables por la API pública, porque las reglas 3 a 5 los impiden. CAL2-T-21 del tester (3,000 combinaciones) confirma que toda matriz aceptada tiene una celda por columna, y sigue en verde.

**Hermanos (los demás `??` del código nuevo de 02b):**

| `??` | Archivo | ¿Oculta un dato? | Qué hice |
|---|---|---|---|
| `respuestas[0]?.tareas ?? primera.tareas` | `features/calificaciones/lib.ts` | Sí, inalcanzable | Lo quité: lanza (N-07) |
| `porVentana[0]?.filas ?? primera.alumnos` | `features/calificaciones/lib.ts` | Sí, inalcanzable | Lo quité: lanza (N-07) |
| `columna.categoria?.nombre ?? TEXTOS_EXPORTACION.sinCategoria` | `features/calificaciones/lib.ts` | No: una tarea sin categoría (`null`) es un dato válido y se escribe «Sin categoría» (§D-5.2) | Se queda |
| `ENTIDADES[c] ?? c` | `lib/xlsx.ts` | No: la expresión `/[&<>"']/g` solo encuentra las cinco llaves del mapa; el índice está en rango por construcción | Se queda, con un comentario del porqué |
| `tabla[(crc ^ byte) & 0xff] ?? 0` | `lib/xlsx.ts` | No: la máscara da un índice de 0 a 255 y la tabla tiene 256 entradas | Se queda, con un comentario |
| `desplazamientos[i] ?? 0` | `lib/xlsx.ts` | No: el primer ciclo guarda un desplazamiento por parte, en el mismo orden | Se queda, con un comentario |

En `lector-xlsx-de-prueba.ts`, `descargaService.ts`, `exportar-a-excel.tsx`, `hooks.ts`, `types.ts` y `data.ts` el código nuevo no tiene `??`.

## Matriz de avisos, recargas y foco: lo que cambia
Solo cambian dos filas del disparador «Exportar a Excel». Lo demás queda igual (en vuelo a la vez, con la vista desmontada y el foco):

| Caso | Qué se renueva | Aviso (uno, `id` fijo) | Foco |
|---|---|---|---|
| `demasiado`: más de 200 ventanas **o la hoja no cabe** (`totalTareas + 3 > 16,384` o `totalAlumnos + 3 > 1,048,576`) con los totales de la primera respuesta, o 200 peticiones sin terminar | Nada; una sola petición en los dos primeros casos | «Esta clase tiene demasiadas calificaciones para exportarlas en un solo archivo.» (sin promesa de reintento) | El botón |
| Genérico, que ahora también cubre una matriz que no cabe (`hojaDeExportacion` o `armarLibroXlsx` lanzan) y los respaldos de N-07 que ahora lanzan (inalcanzables) | Nada | «No pudimos preparar el archivo…» | El botón |

## Verificación (comando exacto y última línea)
- `cd frontend; npm run lint`: código 0; termina en `> tsc -b` sin errores.
- `cd frontend; npm run test`: `Tests  6054 passed (6054)`, con `Test Files  280 passed (280)` y `Duration  385.90s`.
- `cd frontend; npm run build`: `✓ built in 2.32s` (código 0).
- 02b no toca `shared/` ni `backend/`.

**Carga del equipo:**
- Antes de la primera corrida acotada medí 59 y 46 %, y la lancé sin esperar. Dio tres rojos: CAL-1D09 (un `type` en línea dentro de un `import` de `lib.ts`, que corregí separando el `import type`), CAL2-T-20 (a) por tiempo límite y CAL-T-159 por tiempo (23 s de render; es una `*.ataque` de 01d que no toqué y que mide duración).
- Con 14 y 22 % repetí la corrida acotada (`npx vitest run src/lib src/features/calificaciones src/services`): `Tests  783 passed (783)`.
- Antes de la suite completa esperé a dos lecturas seguidas en 25 % o menos (17 y 22). Nada corrió en paralelo.

## Conteos
De `cd frontend; npx vitest list > r1-list.txt`, contado con `grep -a`:

| Qué | Comando | Cifra |
|---|---|---|
| Archivos | `grep -a -o "^[^ ]*\.test\.tsx\?" r1-list.txt \| sort -u \| wc -l` | **280** |
| `*.ataque` | `grep -a -o "^[^ ]*\.ataque\.test\.tsx\?" r1-list.txt \| sort -u \| wc -l` | **154** |
| Casos `CAL2-B` | `grep -a -c "CAL2-B" r1-list.txt` | **89** (antes 81; 8 nuevos) |
| Casos `CAL2-T` | `grep -a -c "CAL2-T" r1-list.txt` | **12** |

Los `CAL2-B` por archivo (`… \| sed 's/ > .*//' \| sort \| uniq -c`):

| Archivo | Casos |
|---|---|
| `lib/xlsx.test.ts` | 16 |
| `lib/xlsx-muestra.test.ts` | 1 |
| `services/descargaService.test.ts` | 1 |
| `exportacion-02b.test.ts` | 21 |
| `exportar-02b.test.tsx` | 31 |
| `recuperar-exportacion-02b.test.tsx` | 13 |
| `estatico-02b.test.ts` | 6 |

**La cuenta cuadra:** los 6045 casos de la ronda 1 del tester, más uno por la reescritura de CAL2-T-20 (de 11 a 12 casos en su archivo), más mis 8 nuevos, dan 6054, lo mismo que la corrida.

## Decisiones donde el arbitraje calla
1. **`cabeEnUnaHoja` también cuenta las filas** (alumnos + 3 de encabezado), no solo las columnas. Su firma recibe `totalAlumnos` y el escritor ya lanza por filas; así las tres capas usan el mismo criterio.
2. **`hojaDeExportacion` lanza si la matriz no cabe** (la capa 4 de T-02). Va con su prueba B05, y la decisión de aceptarla es del manager.
3. **Los caracteres especiales de las pruebas nuevas** se arman con `String.fromCodePoint(…)`. Al escribir la primera versión de 02b, la herramienta de escritura había convertido los escapes `\u202E` y `\u2066` de `exportacion-02b.test.ts` en caracteres literales. Los devolví a escape (`\u202E` y `\u2066`) con un script, sin cambiar lo que prueban. Ningún otro archivo de 02b tenía invisibles literales: lo comprobé con un recorrido de puntos de código.

## Desviaciones
Ninguna fuera de la lista del arbitraje. La única extensión es la capa 4 de T-02 (`hojaDeExportacion`), dentro de `lib.ts`.

## Pendiente u observaciones
- El tope de ancho de columna (255) no lo valida el escritor. Es inalcanzable con los anchos fijos del encargo.
- O-r1b-1 (R-02 más ancho) sigue con el humano, como dice el arbitraje.
