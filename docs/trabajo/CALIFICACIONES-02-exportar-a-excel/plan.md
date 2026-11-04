# Plan — CALIFICACIONES-02 · exportar las calificaciones de una clase a Excel
Estado: LISTO (Enmienda 1 aplicada; las DH-01 a DH-12 se deciden al aprobar; el plan está escrito con la opción recomendada de cada una)
Carril: normal (confirmado; argumento abajo)
Requisitos: RF-65, con RF-37 y RN-05 (mismo cálculo que el gradebook), RN-02 y P-13 (sin estado de pago ni restricción), RN-06 y RN-10 / P-08 (clases archivadas), R-01 de DOCS-04 (el navegador arma el archivo)

**Carril normal, confirmado.** No toca `middleware/`, `adapters/auth`, sesiones ni contraseñas, no hay migración ni cambio en `infra/`, y no cambia el estado de pago ni la restricción: solo garantiza que no salgan (P-13), con un esquema estricto y pruebas de fuga, como el gradebook. La ruta nueva es una lectura con la cadena que ya existe (`protegido({ roles: ["maestro", "admin"], pertenencia: "propiedad" })`). Lo que sí lo acerca a sensible es que la respuesta lleva el correo completo de los alumnos y que el archivo sale de la plataforma: eso se cubre con CAL2-A02, CAL2-A03 y CAL2-B09, no con el carril. Si el humano elige una librería en DH-01, la dependencia nueva requiere su confirmación por escrito, sin cambiar el carril.

**Base.** Rama `feat/calificaciones-02` desde `main` = `ff09e69`. Dos subentregas, porque el backend se puede probar y cerrar solo y el frontend es la mayor parte del riesgo (el escritor del .xlsx y las frases de recuperación): **02a** (shared y backend, base `ff09e69`) y **02b** (frontend, base `<K2a>`, el commit de 02a). Ids de las pruebas requeridas: `CAL2-A..` (02a) y `CAL2-B..` (02b); `npx vitest list` no da ningún `CAL2-` hoy.

## Preguntas bloqueantes

Ninguna. Lo que cambiaría el diseño está fijado por el humano (R-01, P-08, P-13 y la hoja de ruta) o va como decisión con recomendación (DH-01 a DH-09). Con la recomendación de cada DH el plan se ejecuta tal cual; otra opción cambia solo los puntos que cada DH nombra.

## Decisiones para el humano (DH)

Cada una con mi recomendación primero. Las decisiones ya tomadas (R-01, P-08, P-13, alumnos × actividades con categoría y promedio, maestros de la clase y admin, desde las consultas del gradebook) no se reabren.

### DH-01 · Con qué se arma el .xlsx en el navegador

**Por qué no basta lo que hay:** el frontend no tiene nada que escriba .xlsx ni ZIP (`frontend/package.json`: React, TanStack Query, Radix, sonner, lucide, Tailwind y fuentes; en `node_modules` no hay `fflate`, `jszip`, `exceljs` ni `xlsx`). Un .xlsx es un ZIP con cinco o seis archivos XML (ECMA-376, Open Packaging Conventions), así que hay dos caminos: escribir ese formato (con o sin librería de ZIP) o usar una librería de hojas de cálculo.

| Opción | Qué es | Licencia | Tamaño en el paquete | Mantenimiento y versión | Riesgo |
|---|---|---|---|---|---|
| **(a) Escritor propio, sin dependencia (recomendada)** | `frontend/src/lib/xlsx.ts`: ~200 líneas. ZIP sin compresión (método 0, "stored", que OPC admite) con CRC-32 propio, y el XML mínimo de una hoja: texto en línea (`inlineStr`), números, negrita, anchos y paneles inmovilizados | Código propio | ~5 KB minificado, en el chunk del gradebook | No aplica: el formato es estable desde 2006 | Compatibilidad con Excel, LibreOffice y Numbers: la verifica la comprobación humana (H-1 a H-3); si falla, se cambia a (b) dentro del mismo archivo, sin tocar nada más |
| (b) `write-excel-file` | Librería de solo escritura, por objetos de celda; en el navegador devuelve un `Blob` | MIT | Por medir con `vite build` (carga diferida con `import()`) | Un solo mantenedor (catamphetamine), con versiones frecuentes. **Versión exacta, fecha y dependencias: a confirmar con `npm view write-excel-file version time dependencies license` (no tengo red)** | Dependencias transitivas por confirmar; las pruebas necesitan descomprimir DEFLATE para leer el archivo (`DecompressionStream`, a comprobar en jsdom) |
| (c) `exceljs` | Lectura y escritura completas | MIT | Del orden de 1 MB minificado (con carga diferida) | Última versión que conozco, 4.4.0 (octubre de 2023, ~2 años sin versión); a confirmar con `npm view` | Muchas dependencias transitivas para usar el 5 % de la librería |
| (d) SheetJS (`xlsx`) | Lectura y escritura | Apache-2.0 | Grande | En npm se quedó en 0.18.5 (2022), con avisos de seguridad conocidos (contaminación de prototipo al leer, ReDoS); las versiones nuevas solo se instalan desde el CDN del autor, fuera de npm | **Descartada:** versión de npm vulnerable o instalación desde un origen fuera del registro |
| (e) `fflate` + escritor propio del XML | La librería de ZIP con DEFLATE y el XML propio de (a) | MIT | ~8 KB comprimido (solo `zipSync`) | 0.8.x; a confirmar con `npm view fflate version time` | Una dependencia nueva solo para comprimir un archivo que ya pesa poco |

Por qué (a): ninguna dependencia ni proveedor nuevo (regla 11 de `AGENTS.md`; sin cadena de suministro que vigilar), el tamaño más chico, y el control completo de lo que importa aquí: el texto nunca se escribe como fórmula (un nombre que empieza con `=` sigue siendo texto), los caracteres que XML 1.0 no admite se quitan en lugar de producir un archivo que Excel "repara", y las pruebas pueden abrir el archivo entero sin otra dependencia (ZIP sin compresión + `DOMParser` de jsdom). El costo es escribir y probar ~200 líneas de un formato estable.

**Lo que cambia con (b), (c) o (e):** solo el interior de `lib/xlsx.ts` (la firma de §D-5 pasa a `Promise<Uint8Array>` con `import()` diferido) y sus pruebas de bytes; antes de instalar, el orquestador corre `npm view` (versión, fecha, licencia, dependencias), el humano autoriza por escrito la instalación y se anota en `aprobacion.md`. El resto del plan no cambia.

**Desacuerdo que registro (Riesgos, R-06):** ESSENTIALS ("Capas del backend") dice que la librería del .xlsx "es una dependencia nueva del frontend, con confirmación del humano". Con (a) no hay dependencia: no contradice una regla (no hay librería que confirmar), pero el texto cambia en el cierre (§"Documentos a actualizar").

### DH-02 · El endpoint y la paginación

| Opción | Qué es | Regla "toda lista se pagina (máx. 100)" |
|---|---|---|
| **(a) Ruta nueva por ventanas de hasta 100 × 100 (recomendada)** | `GET /clases/:claseId/calificaciones/exportacion?cursor=&limite=&cursorTareas=&limiteTareas=`, que reutiliza la lectura del gradebook (`leerGradebookCon`, la misma función) con hasta 100 alumnos y 100 actividades por respuesta, cada respuesta en una sola instantánea, y suma el nombre de la clase, el correo de cada alumno y los dos totales. El navegador recorre las ventanas (por tareas y, dentro, por alumnos) y comprueba que la clase no cambió entre ellas; si cambió, no arma el archivo y lo dice | Se cumple: cada respuesta es una página de máximo 100 en cada dimensión |
| (b) Una sola respuesta sin paginar, con un tope duro | Toda la matriz en una instantánea (el archivo siempre es coherente), con `409` por encima de, por ejemplo, 300 alumnos o 300 actividades | **Excepción a ESSENTIALS**: requiere la decisión del humano y cambiar "Reglas de datos" |
| (c) Reutilizar `GET …/gradebook` (50 × 50) y `GET …/alumnos` para los correos | Sin backend nuevo | Se cumple, pero son dos listas distintas leídas en momentos distintos, más peticiones, y la respuesta del roster trae al navegador el estado de pago y la restricción (aunque no lleguen al archivo, P-13 pide que no salgan; mejor que ni viajen) |

Por qué (a): respeta la regla sin excepción, sale literalmente del mismo cálculo que el gradebook (RF-65: "Su contenido sale del mismo cálculo que el gradebook") y, con clases de hasta 100 alumnos y 100 actividades, es **una sola petición y una sola instantánea**. Solo una clase más grande hace varias peticiones; ahí, cada respuesta es coherente por sí misma y el navegador rechaza la combinación si entre dos ventanas cambió algo que se ve (alumnos, actividades, totales o promedios; §D-4). El gradebook no cambia de contrato: sigue sin correo, y su prueba de ataque CAL-T-68 (el adaptador del gradebook no nombra `email`) sigue en pie porque el correo se lee en un archivo aparte.

### DH-03 · Nombre del archivo

**(a) Recomendada:** `Calificaciones - <nombre de la clase> - AAAA-MM-DD.xlsx`, con la fecha local del navegador al pulsar. El nombre de la clase se limpia (§D-6): sin `\ / : * ? " < > |`, sin caracteres de control ni de dirección (U+202E y familia, que podrían disfrazar la extensión), espacios colapsados, sin puntos ni espacios al final, y hasta 80 caracteres (sin partir un emoji). Si no queda nada, `Calificaciones - AAAA-MM-DD.xlsx`.
(b) `<nombre de la clase> - calificaciones.xlsx`, sin fecha (dos descargas del mismo día o de días distintos se llaman igual y el navegador agrega "(1)").
(c) Con hora: `… - AAAA-MM-DD HHmm.xlsx`.

### DH-04 · Contenido y formato de la hoja

**(a) Recomendada.** Una hoja, "Calificaciones":
- Fila 1: "Alumno", "Correo", el título de cada actividad y "Promedio (%)".
- Fila 2: en A, "Categoría"; bajo cada actividad, su categoría o "Sin categoría".
- Fila 3: en A, "Puntos"; bajo cada actividad, sus puntos (número).
- Desde la fila 4, un alumno por fila, en el orden del gradebook (por nombre): nombre, correo, una celda por actividad y su promedio.
- **Orden de las actividades:** por fecha límite, de la más antigua a la más reciente (izquierda a derecha), que es como se lee una hoja de calificaciones. El gradebook muestra la más reciente primero porque abre en la ventana actual; en el archivo se ve todo a la vez. Alternativa: el mismo orden del gradebook.
- **Calificada:** el número (puntos, hasta 2 decimales), también si se entregó tarde o si se calificó sin entrega: con número, Excel suma y promedia. Una calificada con retraso **no** se marca, porque la tardía cuenta igual (RN-05) y marcarla en la misma celda la volvería texto.
- **Sin calificar:** el estado en palabras, el de `estadoDeEntregaVisible` con el reloj del navegador al pulsar: "Asignado", "Entregado", "Entregado con retraso" o "Sin entregar" (en el gradebook la asignada se ve "—"; en el archivo se escribe la palabra, que no depende de un lector de pantalla).
- **Promedio:** el porcentaje del alumno como número (82.4, no "82.4 %"; el "%" va en el encabezado, así no depende del formato regional); sin nada que cuente, "—".
- Las tres primeras filas en negrita; las dos primeras columnas y las tres primeras filas inmovilizadas (como la columna fija del gradebook); anchos fijos legibles.

(b) Celdas sin calificar vacías (solo números) y una segunda hoja con los estados. (c) Marcar la tardía calificada como texto ("8.5 (con retraso)"): deja de ser número. Cualquiera de las dos cambia §D-5.2 y sus pruebas.

### DH-05 · ¿Algo más que lo que pide RF-65?

**(a) Recomendada: nada más.** RF-65 pide alumnos × actividades, la categoría de cada actividad y el promedio de cada alumno. Sin la columna de riesgo, sin el promedio de la clase, sin fechas límite y sin una hoja de pesos de las categorías.
(b) Sumar la columna "Riesgo" con el motivo (como el gradebook): la respuesta gana `motivosDeRiesgo` por fila.
(c) Sumar una segunda hoja "Categorías" con nombre y peso (ayuda a explicar un promedio ponderado): la respuesta gana las categorías de la clase.
Cada una agrega un campo al esquema, una columna o una hoja, y sus pruebas.

### DH-06 · Textos de la interfaz (tono de `DESIGN.md` §9)

**(a) Recomendados** (viven en `features/calificaciones/data.ts`):

| Lugar | Texto |
|---|---|
| Botón | "Exportar a Excel" (el de PRD §6), con el icono `FileSpreadsheet` |
| Aviso de éxito | "Se descargó «Calificaciones - Matemáticas I - 2026-11-03.xlsx»." (el nombre real) |
| La clase cambió entre dos ventanas (o un `400` del cursor) | "Las calificaciones cambiaron mientras preparábamos el archivo. Inténtalo de nuevo." |
| Sin alumnos o sin tareas al exportar | "No hay calificaciones que exportar: la clase no tiene alumnos o tareas." (Enmienda 1: "tareas", como los textos del gradebook, "Aún no hay tareas en esta clase.") |
| La clase necesitaría más de 200 peticiones (Enmienda 1, M-03) | "Esta clase tiene demasiadas calificaciones para exportarlas en un solo archivo." (sin "Inténtalo de nuevo": repetir no lo resuelve) |
| Sin acceso | "No tienes acceso a esta clase." (`TEXTOS_DE_LA_CLASE.sinAcceso`) |
| Cualquier otro error | "No pudimos preparar el archivo de calificaciones. Inténtalo de nuevo." |
| Hoja | "Calificaciones"; encabezados "Alumno", "Correo", "Categoría", "Puntos", "Promedio (%)"; "Sin categoría" (`TEXTOS_DE_LA_CLASE.sinCategoria`); sin dato, "—" |

(b) Sin aviso de éxito (la descarga del navegador basta). Lo recomiendo con aviso: un lector de pantalla no anuncia la descarga.

### DH-07 · Clases archivadas (P-08)

Hoy no se puede archivar: `clases.activa` existe sin uso y archivar llega con ADMIN-01, que resuelve la clase archivada en el sexto paso (ESSENTIALS, "Autorización", viñeta "Previsto"). **(a) Recomendada:** CALIFICACIONES-02 no implementa nada de archivadas. La ruta nueva es una lectura y el botón vive en el gradebook, así que cuando ADMIN-01 deje al maestro y al admin abrir el gradebook de una archivada en solo lectura (P-08), la exportación llega con él. Queda una fila en `docs/ESTADO.md` §3 con destino ADMIN-01: el sexto paso deja pasar `GET …/calificaciones/exportacion` en una archivada a los maestros de la clase y al admin, con su prueba de autorización (también "un alumno no exporta una archivada"). (b) Adelantar ahora una prueba que fije ese comportamiento: no se puede sin la columna de ADMIN-01.

### DH-08 · Si la persona sale de Calificaciones con la exportación en vuelo

**(a) Recomendada:** se cancela (la petición en curso se aborta), sin archivo ni aviso. Una descarga que aparece cuando la persona ya está en otra sección sorprende, y no hay trabajo que conservar: volver y pulsar otra vez cuesta una petición. (b) Termina y descarga aunque la vista ya no esté, con su aviso.

### DH-09 · N-52 (la ventana vacía del gradebook que no se marca vieja)

La fila N-52 de `docs/ESTADO.md` §3 tiene destino "el `chore` de foco y navegación del marco (con N-54) o el próximo encargo que toque el gradebook". Este encargo toca `gradebook-view.tsx` solo para poner el botón. **(a) Recomendada:** no absorberla; sigue en el `chore` (cambia el sentido de CAL-T-248, una `*.ataque`, y es otra frase de recuperación, con sus caminos). La fila se actualiza para decir que CALIFICACIONES-02 no la absorbió por decisión del humano. (b) Absorberla en 02b: suma su remedio, la reescritura de CAL-T-248 por el tester y los casos de la frase "Vuelve a abrir Calificaciones…".

### DH-10 · Punto de control adelantado del archivo (Enmienda 1, M-02; propuesta del manager)
**(a) Recomendada:** al terminar `lib/xlsx.ts` (paso 2 de 02b), la prueba CAL2-B17 deja un .xlsx de muestra en la carpeta temporal del sistema (`cmep-calificaciones-muestra.xlsx`) y el orquestador **se detiene** para que el humano lo abra en Excel (escritorio o web) y en LibreOffice Calc (**H-0**, unos 2 minutos), antes de que el programador siga con la vista. **Punto de corte:** si alguno de los dos muestra el aviso de reparar, un error o un contenido distinto del esperado, el programador tiene **una** corrección, dentro de los literales de §D-5.1 (si el defecto está en un literal, el arquitecto lo corrige en una enmienda corta); si la muestra corregida tampoco abre limpia en los dos, se cambia a DH-01 (b) en ese momento (`npm view`, autorización escrita de la dependencia y enmienda de §D-5.1 y CAL2-B01 a B03 y B17), sin rehacer nada de la vista. (b) Sin punto de control: la compatibilidad se ve en H-2 y H-3, al final de 02b.

### DH-11 · Techo de cada ventana de la exportación (Enmienda 1, N-02)
**(a) Recomendada: 100 alumnos × 100 tareas por respuesta.** Una ventana llena son hasta 10,000 celdas, del orden de 1 MB de JSON (cifra en "Acceso a datos"), cuatro veces el máximo del gradebook (50 × 50, unos 0.25 MB); a cambio, toda clase de hasta 100 × 100 sale en una sola respuesta y una sola instantánea, sin el riesgo R-02. Una clase real del piloto (unos 30 alumnos y 40 tareas) son unos 115 KB. (b) El mismo techo que el gradebook, 50 × 50 (o 50 alumnos × 100 tareas): respuestas más chicas; las clases de más de 50 alumnos o tareas hacen varias peticiones y caen en R-02. Cambia solo `LIMITE_DE_LA_EXPORTACION` (o dos constantes) y los números de CAL2-A05, CAL2-B10 (tope) y "Acceso a datos".

### DH-12 · La excepción de `CLAUDE.md` sobre el texto del servidor, extendida a la exportación (Enmienda 1; A-09)
Hoy `CLAUDE.md` exceptúa del contrato de `lib/errores-de-api.ts` a `features/calificaciones` solo en sus **consultas** (nunca muestran texto del servidor). La exportación es una **acción** que tampoco lo muestra (§D-7: sin acceso, cambio, demasiado o el genérico). **(a) Recomendada:** extender la excepción a la exportación con el texto de A-09: es una lectura sin campos, cuyos mensajes del servidor serían de forma de zod. (b) Traducirla con `mensajeDeErrorDeApi` y una `TraduccionDeErrores` del módulo: mostraría el texto del servidor de un `VALIDACION` sin ruta, que aquí nunca es para la persona.

## Suposiciones

- **S-01. Toda la clase, no la ventana.** El archivo trae todos los alumnos y todas las actividades, sin importar la ventana del gradebook a la vista.
- **S-02. La misma población que el gradebook:** alumnos inscritos con cuenta activa, incluido un alumno restringido (está inscrito; P-13 solo excluye el dato de la restricción, no a la persona; el gradebook ya lo muestra, CAL-T-59). Un alumno dado de baja o con la cuenta desactivada no aparece.
- **S-03. Actividades = tareas hoy.** Si FORO-01 guarda el foro en `tareas` y `entregas` (lo previsto en DOCS-04), el foro entra solo en el gradebook y en la exportación; si elige una tabla aparte, lo tiene que sumar a `leerGradebookCon` (fila en ESTADO §3, destino FORO-01).
- **S-04. El botón solo vive en el gradebook** (`/maestro/clases/:id/calificaciones` y `/admin/clases/:id/calificaciones`, la misma vista). El admin llega desde "Gestión de clases" → la clase → Calificaciones; no hay botón en la lista de clases.
- **S-05. "Sin entregar" con el reloj del navegador** al pulsar, como el gradebook (`estadoDeEntregaVisible`).
- **S-06. Sin caché.** La exportación es una mutación de TanStack Query: cada vez pide a la red desde la primera ventana, nunca sirve de la caché, y no reintenta (las mutaciones no reintentan por omisión; las consultas sí, `retry: 1`).
- **S-07. Sin registro ni límite de exportaciones.** No hay tabla de auditoría ni límite de ritmo; es una lectura como el gradebook.
- **S-08. El nombre de la clase sale de la respuesta** (misma instantánea), no de otra consulta de la página.
- **S-09. Sin la exportación del alumno.** El alumno no exporta "Mis calificaciones" (RF-65 es de maestros y admin).

## Alcance

### Entra
- **02a (shared y backend):** los esquemas de la consulta y la respuesta en `shared/src/calificaciones.ts`; `leerExportacionDeCalificaciones` en un archivo nuevo de `adapters/db/` que llama a `leerGradebookCon` (que pasa a exportarse de `adapters/db/calificaciones.ts`, sin otro cambio) y suma el nombre de la clase, los correos y el total de actividades, todo en una instantánea; la ruta `GET /clases/:claseId/calificaciones/exportacion` en `handlers/calificaciones.ts`; pruebas de autorización, de fuga, de cálculo, de ventanas, de instantánea y estáticas; los README de `handlers/` y `adapters/`.
- **02b (frontend):** `lib/xlsx.ts` (DH-01), `services/descargaService.ts`, el recorrido de las ventanas y su combinación, la hoja, el nombre del archivo, la traducción de los errores, el botón "Exportar a Excel" (`components/exportar-a-excel.tsx`) en el gradebook y sus pruebas; `DESIGN.md` §7.28.

### No entra (con destino)
- Archivar, restaurar y el acceso a una clase archivada (P-08): **ADMIN-01** (DH-07).
- El foro en la exportación: llega solo si FORO-01 usa `tareas`; si no, **FORO-01** (S-03).
- Riesgo, promedio de la clase, fechas límite y pesos en el archivo: no, salvo DH-05 (b) o (c).
- Exportar "Mis calificaciones" del alumno, exportar varias clases a la vez, CSV o PDF: no pedidos.
- N-52: el `chore` de foco y navegación del marco (DH-09).
- El editor de categorías (hermano pendiente de la fila 339 de ESTADO §3): no se rehace aquí; sigue en el `chore` de foco y navegación del marco.
- `key={claseId}` de las vistas de calificaciones (fila 357 de ESTADO §3): este encargo no agrega enlaces a las calificaciones de otra clase; no aplica.

## Diseño

### §D-0 · Decisiones transversales
1. **Flujo.** El maestro o el admin pulsa "Exportar a Excel" en el gradebook → el navegador pide `GET /api/clases/:claseId/calificaciones/exportacion?limite=100&limiteTareas=100` y sigue los cursores (§D-4) → combina las ventanas y comprueba que la clase no cambió entre ellas → arma la hoja (§D-5.2) y el .xlsx (§D-5.1) → `descargarArchivo` lo entrega al navegador (§D-5.3) → un aviso. Nada se escribe en la base, en la cola ni en el almacén; ningún archivo pasa por Node (R-01; regla 6 de `AGENTS.md`).
2. **Una sola ruta nueva**, en el plugin que ya existe (`handlers/calificaciones.ts`), con `protegido({ roles: ["maestro", "admin"], pertenencia: "propiedad" })`, la misma cadena que el gradebook. La guarda `onRoute` la acepta tal cual (empieza por la cadena completa y `:claseId` está en el tercer segmento). **No se toca `middleware/`.**
3. **Mismo cálculo que el gradebook, literalmente:** la exportación llama a `leerGradebookCon` (hoy privada en `adapters/db/calificaciones.ts`; el único cambio en ese archivo es la palabra `export`), dentro de su propia instantánea única. Celdas, porcentaje y orden salen de las mismas sentencias y de `calificacionGeneral` (CAL2-A04).
4. **El correo vive fuera del adaptador del gradebook.** `adapters/db/calificaciones.ts` no nombra `email` (CAL-T-68, `*.ataque`): la lectura de los correos va en el archivo nuevo `adapters/db/exportacion-de-calificaciones.ts`. El esquema de la respuesta del gradebook no cambia.
5. **P-13 por construcción:** ninguna función nueva selecciona `estado_pago`, `fecha_estado_pago`, `acceso_restringido`, `motivo_restriccion`, `rol` ni `version`; la respuesta es `z.strictObject` (un campo de más rompe el `parse` en el servidor: un `500` en pruebas, nunca una fuga); el frontend arma la hoja desde un tipo que no tiene esos campos, y una prueba lee el archivo armado (CAL2-B09).
6. **Palabras que no se escriben (herencia de §D-0.9 de CALIFICACIONES-01; varias `*.ataque` leen el texto crudo, comentarios incluidos).** En los archivos nuevos o cambiados:
   - `backend/src`: ningún comentario con `COMENTARIO_CREADO`, `AVISO_FALLIDO`, `PUBLICACION_CREADA`, `MATERIAL_CREADO`, `colaDePublicacion`, `DELETE FROM`, `TRUNCATE`, `REPEATABLE READ`, `RepeatableRead`, `Serializable` ni `instantaneaUnica: true`; fuera de `adapters/db/`, ni `enTransaccion`, `instantaneaUnica` o `isolationLevel` en ningún lado. En `adapters/db/exportacion-de-calificaciones.ts`, `instantaneaUnica: true` aparece **exactamente una vez en el texto crudo** (lo cuenta `lecturas-fx-r1.ataque`). En `handlers/calificaciones.ts`, desde la ruta del gradebook hasta el final del archivo, el código no contiene `inscripcion`, `maestros`, `maestroId`, `esDueno`, `propietario`, `accesoRestringido`, `request.query.<algo>`, `request.params as` ni `try {` (CAL-T-69, `*.ataque`): nombres como `leerExportacionDeCalificaciones` y `exportacionQuerySchema` no chocan.
   - `frontend/src`: en ningún archivo nuevo o cambiado, ni en comentarios, `fetch(` ni `_blank` (los cuenta en crudo `entregas-01d-r1.ataque`: `fetch(` solo en `apiClient.ts` y `almacenService.ts`); ningún comentario con `vidrio`, `data-material`, `disabled`, `?? []`, `console.`, `perspectivaDeRuta(`, `correo`, `estadoPago`, `fixed` ni los literales "Sin tema" o "Sin categoría" (CAL-1D09). En `features/calificaciones/`, ninguna palabra `fixed`, ningún valor arbitrario `-[…]`, `text-danger` ni `text-destructive`, ni en código (CAL-T-188).
   - **(Enmienda 1, N-04)** En los archivos de producción de `features/calificaciones/`, en el texto crudo (comentarios incluidos), nada de lo que prohíbe O-05 de `features/clases/errores-ch3-r1.ataque.test.ts:418-447`: ninguna expresión literal que empiece con `/^` seguida de una clase de caracteres, `\w`, `\S`, `[^:]` o `.` y un `:` (por ejemplo, `/^[…]+:`), ni `\p{L}`, ni `new RegExp(`, ni `.split(":")`, ni `.indexOf(":")`/`.lastIndexOf(":")`. El limpiador del nombre del archivo (§D-6) y el resto de `lib.ts` usan expresiones literales sin ancla `^` seguida de clase y `:` (por ejemplo, `/[\\/:*?"<>|]/g`), o comparan puntos de código. En **todas** las pruebas de la carpeta del módulo, ningún emoji literal (CAL-T-185, `estatico-01d-r1.ataque.test.ts:59-63`): se escriben con escapes `\u{…}` (CAL2-B06); lo mismo, por coherencia, en `lib/xlsx.test.ts` y `lib/xlsx-muestra.test.ts`. `lib/lector-xlsx-de-prueba.ts` entra en los recorridos estáticos de producción: sin `.message`, `fetch(` ni emojis literales.
7. **Sin cambios en `core/`.** No hay regla de negocio nueva: el cálculo es el del gradebook y lo que se arma (combinar, hoja, nombre) es del navegador. Por eso no hay pruebas unitarias nuevas de `core/`.

### §D-1 · `shared/src/calificaciones.ts` (02a)
Se agrega, al final del bloque de 01b, sin tocar lo existente:
```ts
// Ventanas de hasta 100 alumnos y 100 actividades (la regla de paginación de ESSENTIALS).
export const LIMITE_DE_LA_EXPORTACION = 100

export const exportacionQuerySchema = paginacionSchema.extend({
  limite: z.coerce.number().int().min(1).max(LIMITE_DE_LA_EXPORTACION).optional().default(LIMITE_DE_LA_EXPORTACION),
  cursorTareas: z.uuid().transform(enMinusculas).optional(),
  limiteTareas: z.coerce.number().int().min(1).max(LIMITE_DE_LA_EXPORTACION).optional().default(LIMITE_DE_LA_EXPORTACION),
})

// P-13: el alumno con su nombre y su correo, nada más.
export const alumnoDeExportacionSchema = z.strictObject({ id: z.uuid(), nombre: z.string(), email: z.string() })

export const filaDeExportacionSchema = z.strictObject({
  alumno: alumnoDeExportacionSchema,
  celdas: z.array(celdaDelGradebookSchema),          // en el orden de las columnas
  porcentaje: z.number().min(0).max(100).nullable(),
})

export const exportacionDeCalificacionesRespuestaSchema = z.strictObject({
  clase: z.strictObject({ nombre: z.string() }),
  tareas: z.array(columnaDelGradebookSchema),
  siguienteCursorTareas: z.uuid().nullable(),
  totalTareas: z.number().int().min(0),
  alumnos: z.array(filaDeExportacionSchema),
  siguienteCursor: z.uuid().nullable(),
  totalAlumnos: z.number().int().min(0),
})
```
Y sus tipos inferidos: `ExportacionQuery`, `AlumnoDeExportacion`, `FilaDeExportacion`, `ExportacionDeCalificacionesRespuesta`. `shared/src/index.ts` los reexporta por nombre (regla de A-11 de CLASES-02), con `LIMITE_DE_LA_EXPORTACION`. El campo es `email`, como `personaConCorreoSchema` (`shared/src/clases.ts`). Con DH-05 (b), `filaDeExportacionSchema` suma `motivosDeRiesgo: z.array(motivoDeRiesgoSchema)`; con (c), la respuesta suma `categorias: z.array(z.strictObject({ id, nombre, peso }))`.

### §D-2 · `adapters/db/exportacion-de-calificaciones.ts` (02a, archivo nuevo)
```ts
export interface AlumnoDeExportacionDb { id: string; nombre: string; email: string }
export interface FilaDeExportacionDb {
  alumno: AlumnoDeExportacionDb
  celdas: CeldaDelGradebookDb[]
  porcentaje: number | null
}
export interface ExportacionDeCalificacionesDb {
  clase: { nombre: string }
  tareas: ColumnaDelGradebookDb[]
  siguienteCursorTareas: string | null
  totalTareas: number
  alumnos: FilaDeExportacionDb[]
  siguienteCursor: string | null
  totalAlumnos: number
}
export const leerExportacionDeCalificaciones = (
  params: { claseId: string; cursor: string | undefined; limite: number;
            cursorTareas: string | undefined; limiteTareas: number; ahora: Date },
  ejecutor: Ejecutor = obtenerDb(),
): Promise<ExportacionDeCalificacionesDb> =>
  enTransaccion(ejecutor, (tx) => leerExportacionCon(tx, params), { instantaneaUnica: true })
```
`leerExportacionCon(tx, params)`, privada, con las sentencias **en serie** (nunca `Promise.all` dentro de la instantánea):
1. **La clase:** `tx.clase.findUnique({ where: { id: claseId }, select: { nombre: true } })` (PK). Sin fila (inalcanzable hoy: nadie borra clases antes de ADMIN-01, y el sexto paso ya la encontró) → `AppError("SIN_ACCESO_A_LA_CLASE", "No tienes acceso a esta clase.", 403)`, la misma respuesta que el sexto paso da a una clase inexistente.
2. **El gradebook de la ventana:** `const gradebook = await leerGradebookCon(tx, { claseId, cursor, limite, cursorTareas, limiteTareas, ahora })`. Son sus 7 sentencias (9 con los dos cursores), sin cambio: los cursores se comprueban dentro de la misma instantánea (`400 VALIDACION` "cursor: no es válido" o "cursorTareas: no es válido").
3. **El total de actividades:** `tx.tarea.count({ where: { claseId } })` (índice `tareas(clase_id, fecha_limite)`, por su prefijo).
4. **Los correos de la página:** solo si la página tiene alumnos, `tx.usuario.findMany({ where: { id: { in: ids } }, select: { id: true, email: true } })` (PK de `usuarios`), con `ids` = los alumnos de `gradebook.alumnos`. Un id sin fila (inalcanzable: la misma instantánea los leyó de `inscripciones` con cuenta activa) → `AppError("ERROR_INTERNO", "Un alumno de la clase no tiene cuenta.", 500)`, nunca un correo vacío inventado.

Devuelve `{ clase, tareas: gradebook.tareas, siguienteCursorTareas: gradebook.siguienteCursorTareas, totalTareas, alumnos: gradebook.alumnos.map((fila) => ({ alumno: { ...fila.alumno, email }, celdas: fila.celdas, porcentaje: fila.porcentaje })), siguienteCursor: gradebook.siguienteCursor, totalAlumnos: gradebook.resumen.totalAlumnos }`. El resumen, las vencidas y los motivos del gradebook se calculan y no salen (DH-05 a). Sin `$queryRaw` (así la lista E6 de `bloqueo-usuario.integracion` no cambia), sin escrituras ni bloqueos de fila. `adapters/db/index.ts` exporta `leerExportacionDeCalificaciones` y sus tres tipos.

**Número de sentencias fijo:** de 9 a 12 (clase, las 7 a 9 del gradebook, el conteo y, con alumnos, los correos), sin importar cuántos alumnos o actividades haya (CAL2-A10).

### §D-3 · La ruta (02a, `handlers/calificaciones.ts`, al final del plugin)
```ts
// CALIFICACIONES-02 (§D-3). La exportación a Excel: los maestros de la clase y el admin. Una ventana
// de hasta 100 alumnos y 100 actividades con el nombre de la clase y el correo de cada alumno; el
// navegador recorre las ventanas y arma el archivo. Nunca el estado de pago ni la restricción (P-13).
app.get(
  "/clases/:claseId/calificaciones/exportacion",
  protegido({ roles: ["maestro", "admin"], pertenencia: "propiedad" }),
  async (request, reply) => {
    const claseId = claseDe(request).id.toLowerCase()
    const { cursor, limite, cursorTareas, limiteTareas } = validarParametros(exportacionQuerySchema, request.query)
    const exportacion = await leerExportacionDeCalificaciones({ claseId, cursor, limite, cursorTareas, limiteTareas, ahora: new Date() })
    return reply.send(
      exportacionDeCalificacionesRespuestaSchema.parse({
        ...exportacion,
        tareas: exportacion.tareas.map(columnaParaResponder),
      }),
    )
  },
)
```
Errores: los de la cadena (`401`, `403 CAMBIO_DE_CONTRASENA_REQUERIDO`, `403 ACCESO_RESTRINGIDO`, `403 ROL_NO_PERMITIDO`, `403 SIN_ACCESO_A_LA_CLASE`, `400` de `claseId`), `400 VALIDACION` de la consulta y de los cursores, `503 SERVICIO_OCUPADO` (`P2028`). Ningún código nuevo. El `HEAD` lo agrega Fastify como en las demás rutas `GET`.

### §D-4 · El recorrido y la combinación de las ventanas (02b)
**Recorrido** (`hooks.ts`, función privada `recorrerLaExportacion(claseId, signal)`, que solo usa `api()`): por fuera, las ventanas de actividades; por dentro, las de alumnos. Empieza sin cursores; en cada ventana de actividades pide todas las páginas de alumnos (siguiendo `siguienteCursor`) con el mismo `cursorTareas`, y pasa a la siguiente ventana de actividades con el `siguienteCursorTareas` de la última respuesta. Cada petición lleva `limite=100&limiteTareas=100` (`LIMITE_DE_LA_EXPORTACION` de shared) y el `signal`. Guarda cada respuesta con el índice de su ventana de actividades. Se detiene:
- con un cursor que se repite en su dimensión (el orden por claves siempre avanza; repetir es que la clase cambió) → `"cambio"`;
- **(Enmienda 1, M-03)** antes de la segunda petición, con los totales de la primera respuesta: si `ventanasNecesarias = ceil(totalAlumnos / 100) × ceil(totalTareas / 100)` es mayor que `MAXIMO_DE_PETICIONES_DE_EXPORTACION` (= 200, en `data.ts`) → `"demasiado"`, sin pedir nada más. Además, si durante el recorrido se llega a 200 peticiones sin terminar (la clase creció en medio) → `"demasiado"`. **No es inalcanzable** (no hay tope de tareas por clase: 2,000 alumnos, el diseño de toda la plataforma, y más de 1,000 tareas, o más de 20,000 alumnos con hasta 100 tareas), pero reintentar no lo resuelve; por eso tiene **texto propio sin "Inténtalo de nuevo"** (§D-8), en lugar del genérico. La función que calcula `ventanasNecesarias` es pura (`lib.ts`, `ventanasDeLaExportacion(totalAlumnos, totalTareas, limite)`);
- con cualquier error de `api()` → lo lanza (la mutación lo pasa al manejador).

**Combinación** (`lib.ts`, pura): `combinarVentanasDeExportacion(ventanas)` devuelve `{ tipo: "matriz", matriz } | { tipo: "cambio" } | { tipo: "vacio" }` (el `"demasiado"` lo decide el recorrido, antes; Enmienda 1), con estas reglas, en orden:
1. Todas las respuestas tienen el mismo `clase.nombre`, `totalAlumnos` y `totalTareas` que la primera; si no, `cambio`.
2. Dentro de cada ventana de actividades, todas sus respuestas traen las mismas actividades (ids, en el mismo orden); si no, `cambio`.
3. En cada fila, `celdas.length` es el número de actividades de su ventana y `celdas[i].tareaId` es el id de la actividad `i`; si no, `cambio`.
4. La lista de alumnos de la primera ventana de actividades (la concatenación de sus páginas) es la referencia; cada otra ventana trae los mismos alumnos en el mismo orden, con el mismo nombre, correo y porcentaje; si no, `cambio` (un porcentaje distinto entre dos ventanas es una calificación que cambió en medio). **(Enmienda 1, M-01)** La comparación de dos filas la hace una sola función pura, `mismoAlumnoDeExportacion(a: FilaDeExportacion, b: FilaDeExportacion): boolean` (`lib.ts`: `id`, `nombre`, `email` y `porcentaje` iguales), que `combinarVentanasDeExportacion` llama; así `combinarVentanasDeExportacion` no nombra el correo. Es una de las dos únicas declaraciones de `lib.ts` que lo nombran (la lista completa, en §D-5.2).
5. Ninguna actividad se repite entre ventanas; si no, `cambio`.
6. Las actividades suman `totalTareas` y los alumnos `totalAlumnos`; si no, `cambio` (una actividad o un alumno que entró en una ventana ya recorrida).
7. Sin alumnos o sin actividades → `vacio`.
8. La matriz: el nombre de la clase, las columnas en **orden de fecha límite de la más antigua a la más reciente** (`(fechaLimite, id)` ascendente, el inverso del de la API; DH-04 a) y, por alumno, su nombre, correo, porcentaje y sus celdas de todas las ventanas reordenadas igual que las columnas.

Con una clase de hasta 100 alumnos y 100 actividades hay una sola respuesta: las reglas 2 a 5 se cumplen solas y la 6 compara los totales de la misma instantánea.

**Riesgo residual (R-02):** entre dos ventanas, un cambio que no mueve ningún total, alumno ni porcentaje (por ejemplo, una entrega nueva sin calificar en una actividad de una ventana ya recorrida) no se detecta: el archivo dice "Asignado" donde ya dice "Entregado". Solo pasa en clases de más de 100 alumnos o actividades.

### §D-5 · El archivo (02b)
#### §D-5.1 · `frontend/src/lib/xlsx.ts` (DH-01 a; genérico, puro, sin importar nada de `features/` ni de `services/`)
```ts
export const TIPO_MIME_XLSX = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
export type CeldaXlsx =
  | { tipo: "texto"; valor: string; negrita?: boolean }
  | { tipo: "numero"; valor: number; negrita?: boolean }
  | { tipo: "vacia" }
export interface HojaXlsx {
  nombre: string                                   // de 1 a 31 caracteres, sin [ ] : * ? / \
  filas: readonly (readonly CeldaXlsx[])[]
  anchos: readonly number[]                        // por columna, en caracteres
  inmovilizar: { filas: number; columnas: number }
}
export const armarLibroXlsx = (hoja: HojaXlsx): Uint8Array
```
(Los tipos de `lib/` viven en su archivo, como en `lib/errores-de-api.ts`; la regla 1 de tipos es de `features/`.)
- **Partes del ZIP**, en este orden: `[Content_Types].xml` (Default `rels` → `application/vnd.openxmlformats-package.relationships+xml` y `xml` → `application/xml`; Override de `/xl/workbook.xml`, `/xl/worksheets/sheet1.xml` y `/xl/styles.xml` con sus tipos `…spreadsheetml.sheet.main+xml`, `…worksheet+xml` y `…styles+xml`), `_rels/.rels` (`officeDocument` → `xl/workbook.xml`), `xl/workbook.xml` (una hoja `sheetId="1"`, `r:id="rId1"`), `xl/_rels/workbook.xml.rels` (`rId1` la hoja, `rId2` los estilos), `xl/styles.xml` (dos fuentes, normal y negrita; los dos rellenos obligatorios `none` y `gray125`; un borde; un `cellStyleXfs`; dos `cellXfs`, 0 normal y 1 negrita; un `cellStyles`), `xl/worksheets/sheet1.xml` (`sheetViews` con el panel inmovilizado `state="frozen"` y `topLeftCell`, `cols` con los anchos, `sheetData`). Todo con la declaración `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` y en UTF-8 (`TextEncoder`).
- **Celdas:** referencia `A1` (columnas `A`…`Z`, `AA`…`AZ`, `BA`…, `ZZ`, `AAA`); una vacía no se escribe (tampoco un texto que queda vacío tras limpiarlo); la forma exacta de cada celda está en los literales de abajo (Enmienda 1; el orden de atributos es `r`, `s`, `t`). Nunca `<f>`: un texto que empieza con `=`, `+`, `-` o `@` sigue siendo texto. Un número va con `String(n)` (punto decimal, nunca el formato regional). La negrita es `s="1"`.
- **Texto (Enmienda 1, M-02):** en este orden: (1) se **quitan** los caracteres que XML 1.0 no admite (U+0000 a U+0008, U+000B, U+000C, U+000E a U+001F, U+FFFE, U+FFFF y los sustitutos sueltos, recorriendo por puntos de código); se quitan y no se codifican como `_xHHHH_` porque Excel los mostraría como caracteres de control invisibles en la celda, y en este archivo nunca son contenido; (2) **el escape de OOXML:** cada `_` que va seguido de `x`, cuatro dígitos hexadecimales (mayúsculas o minúsculas) y `_` se escribe `_x005F_` (expresión `/_(?=x[0-9A-Fa-f]{4}_)/g`), así "Tarea_x0041_" se guarda `Tarea_x005F_x0041_` y Excel la muestra igual, no "TareaA"; (3) se escapan `&` → `&amp;`, `<` → `&lt;`, `>` → `&gt;`, `"` → `&quot;` y `'` → `&apos;`. Se conservan los saltos de línea, los tabuladores, los retornos de carro, los acentos y los emojis (pares sustitutos completos). Lo mismo para el nombre de la hoja en `workbook.xml`.
- **Lanza** (`Error`, error de programación, nunca dato de la persona) con un número que no es finito, un texto de más de 32,767 unidades UTF-16 tras el paso (1) (el tope de una celda de Excel), un nombre de hoja inválido, o `inmovilizar` con `filas` o `columnas` menor que 1 (Enmienda 1: el único caso que este encargo usa es 3 × 2, y el `pane` literal de abajo es el de las dos direcciones; los otros dos casos no se implementan).
- **ZIP:** método 0 (sin compresión), sin descriptores de datos (CRC y tamaños en la cabecera local), fecha y hora DOS fijas (1980-01-01 00:00) para que la salida sea determinista, nombres ASCII; cabeceras locales (`0x04034b50`), directorio central (`0x02014b50`) y fin de directorio (`0x06054b50`), todo en *little-endian*; CRC-32 IEEE (polinomio `0xEDB88320`, tabla calculada una vez).

**Literales (Enmienda 1, M-02).** El programador escribe estos textos tal cual, en constantes de `lib/xlsx.ts`; CAL2-B01 a B03 los comparan byte a byte. Cada parte es UTF-8, empieza con la declaración seguida de un salto de línea `\n` (U+000A) y no tiene ningún otro espacio ni salto fuera de los textos de las celdas. Los saltos de línea de abajo son solo de presentación; en el archivo cada parte es la declaración, `\n` y el elemento raíz en una sola línea.

`[Content_Types].xml`:
```xml
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>
```
`_rels/.rels`:
```xml
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>
```
`xl/workbook.xml` (`{NOMBRE}` es el nombre de la hoja con el escape de "Texto"):
```xml
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="{NOMBRE}" sheetId="1" r:id="rId1"/></sheets></workbook>
```
`xl/_rels/workbook.xml.rels`:
```xml
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>
```
`xl/styles.xml` (sin colores: no choca con V-02 a V-04 de `styles/clases-r1.ataque`):
```xml
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Calibri"/><family val="2"/></font><font><b/><sz val="11"/><name val="Calibri"/><family val="2"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>
```
`xl/worksheets/sheet1.xml`, esqueleto (el orden de los hijos de `worksheet` es el del esquema: `sheetViews`, después `cols`, después `sheetData`):
```xml
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheetViews><sheetView workbookViewId="0"><pane xSplit="{C}" ySplit="{F}" topLeftCell="{P}" activePane="bottomRight" state="frozen"/><selection pane="bottomRight" activeCell="{P}" sqref="{P}"/></sheetView></sheetViews><cols>{COLS}</cols><sheetData>{FILAS}</sheetData></worksheet>
```
- `{C}` y `{F}`: `inmovilizar.columnas` e `inmovilizar.filas`; `{P}`: la referencia de la columna `C + 1` y la fila `F + 1` (con 2 y 3, `C4`).
- `{COLS}`: por cada ancho `i` (desde 1), `<col min="{i}" max="{i}" width="{ancho}" customWidth="1"/>`, con `String(ancho)`. Sin anchos, el elemento `<cols>…</cols>` entero no se escribe.
- `{FILAS}`: por cada fila con al menos una celda escrita, `<row r="{n}">{CELDAS}</row>` (`n` desde 1, contando también las filas que no se escriben); sin filas, `<sheetData></sheetData>` queda vacío.
- `{CELDAS}`, en orden de columna: texto `<c r="{ref}" t="inlineStr"><is><t xml:space="preserve">{texto}</t></is></c>`; texto en negrita `<c r="{ref}" s="1" t="inlineStr"><is><t xml:space="preserve">{texto}</t></is></c>`; número `<c r="{ref}"><v>{n}</v></c>`; número en negrita `<c r="{ref}" s="1"><v>{n}</v></c>`.

**Contenedor ZIP (APPNOTE de PKWARE), valores literales.** Las seis entradas en el orden de "Partes del ZIP"; cada una, una cabecera local y sus bytes; después, el directorio central (una cabecera por entrada, mismo orden) y el fin de directorio. Enteros sin signo, *little-endian*.
- Cabecera local (30 bytes + nombre): firma `0x04034b50` (4), versión necesaria `20` (2), banderas `0` (2), método `0` (2), hora `0x0000` (2), fecha `0x0021` (2, el 1980-01-01), CRC-32 (4), tamaño comprimido = tamaño (4), tamaño (4), largo del nombre (2), largo del extra `0` (2), nombre en ASCII; enseguida, los bytes de la parte.
- Cabecera del directorio central (46 bytes + nombre): firma `0x02014b50` (4), versión que lo hizo `20` (2), versión necesaria `20` (2), banderas `0` (2), método `0` (2), hora `0` (2), fecha `0x0021` (2), CRC-32 (4), tamaño comprimido (4), tamaño (4), largo del nombre (2), extra `0` (2), comentario `0` (2), disco `0` (2), atributos internos `0` (2), atributos externos `0` (4), desplazamiento de su cabecera local (4), nombre.
- Fin de directorio (22 bytes): firma `0x06054b50` (4), disco `0` (2), disco del directorio `0` (2), entradas en el disco `6` (2), entradas `6` (2), tamaño del directorio central (4), desplazamiento del directorio central (4), comentario `0` (2).

#### §D-5.2 · La hoja (`features/calificaciones/lib.ts`, pura)
`hojaDeExportacion(matriz, ahora): HojaXlsx` con `nombre: TEXTOS_EXPORTACION.hoja`, `anchos` (Alumno 32, Correo 36, cada actividad 16, Promedio 14), `inmovilizar: { filas: 3, columnas: 2 }` y `filas: filasDeLaHojaDeExportacion(matriz, ahora)`, que arma las filas de DH-04 (a):
- Fila 1 (negrita): "Alumno", "Correo", el título de cada columna y "Promedio (%)".
- Fila 2 (negrita): "Categoría", vacía, la categoría de cada columna o `TEXTOS_EXPORTACION.sinCategoria`, vacía.
- Fila 3 (negrita): "Puntos", vacía, los puntos de cada columna (número), vacía.
- Una fila por alumno, en el orden de la matriz: nombre (texto), correo (texto), una celda por columna y el porcentaje (número) o "—" (texto). La celda: si `estado === "calificado"` y hay calificación, el número; si no, `TEXTOS_ESTADO_DE_ENTREGA[estadoDeEntregaVisible(celda, columna.fechaLimite, ahora)]` ("Asignado", "Entregado", "Entregado con retraso" o "Sin entregar"; `lib/estado-de-entrega.ts`, que ya es compartido).
- **(Enmienda 1, detalle menor)** Una celda `calificado` sin `calificacion`, o con `calificacion` y otro estado (inalcanzable: los `CHECK` de la base y el `errorDatoMalFormado` del adaptador), **lanza** `Error` en lugar de caer en "Calificado" o en un estado inventado; corre dentro de la función de la mutación (`exportarCalificaciones`), así que TanStack Query la captura y el manejador da el aviso genérico (CLAUDE.md: `throw` dentro de un gancho de TanStack Query es correcto; ningún valor por defecto para `calificacion`).
- **(Enmienda 1, M-01) Lista única de las declaraciones del módulo que nombran el correo** (`email` o "correo", en código): en `lib.ts`, `filasDeLaHojaDeExportacion` (escribe la columna "Correo") y `mismoAlumnoDeExportacion` (compara dos filas, §D-4 regla 4); en `data.ts`, `TEXTOS_EXPORTACION` (el encabezado "Correo"). Ninguna otra: ni `combinarVentanasDeExportacion` (llama a `mismoAlumnoDeExportacion`), ni `hojaDeExportacion`, ni las vistas, los componentes, `hooks.ts` o `types.ts` (que reexporta `AlumnoDeExportacion` sin nombrar el campo). Esta misma lista es la de la enmienda de `estatico-01d.test.ts:83` (lista cerrada), la de CAL2-B15 y la de R-08.

#### §D-5.3 · `frontend/src/services/descargaService.ts` (nuevo)
`descargarArchivo(contenido: Uint8Array, nombre: string, tipo: string): void`: crea la URL de un `Blob` con ese tipo, un `<a>` con `href` y `download = nombre`, lo agrega al `body`, le hace `click()` una vez, lo quita y revoca la URL en el siguiente turno (`setTimeout(…, 0)`). Sin `target`, sin red y sin importar de `features/`. Es DOM, no puro: por eso no va en `lib/`.

### §D-6 · El nombre del archivo (DH-03 a; `lib.ts`, puro)
`nombreDelArchivoDeExportacion(clase: string, ahora: Date): string`:
1. Fecha local `AAAA-MM-DD` con `getFullYear`, `getMonth` y `getDate` de `ahora` (la zona del navegador).
2. La clase: cada carácter de `\ / : * ? " < > |`, de control (U+0000 a U+001F, U+007F a U+009F) o de formato de dirección (U+061C, U+200E, U+200F, U+202A a U+202E, U+2066 a U+2069) pasa a espacio; los espacios seguidos se colapsan en uno; se quitan espacios al inicio y al final y los puntos y espacios del final; se recorta a 80 puntos de código (con `Array.from`, sin partir un par sustituto) y se vuelven a quitar los espacios y puntos finales.
3. `Calificaciones - <clase> - <fecha>.xlsx` o, si la clase quedó vacía, `Calificaciones - <fecha>.xlsx`.
4. (Enmienda 1, N-04) Sin `new RegExp(`, `\p{L}`, `.split(":")`, `.indexOf(":")` ni una expresión que empiece con `/^` seguida de una clase y `:` (O-05 de `features/clases/errores-ch3-r1.ataque`): por ejemplo, `/[\\/:*?"<>|]/g` para los reservados y una comparación de puntos de código (`codePointAt`) para los de control y de dirección.

### §D-7 · El botón, los avisos y el foco (02b)
**`ExportarAExcel`** (`features/calificaciones/components/exportar-a-excel.tsx`), con `Props { claseId: string; pidiendoLaVentana: boolean }`. `GradebookDeLaClase` lo pinta dentro de `cuerpo(...)`, **entre `ResumenDelGradebook` y `NavegacionDelGradebook`**, así que solo existe con la tabla o el texto del cursor a la vista (nunca en los vacíos, en la carga ni en un error que reemplaza la vista) y cuelga del contexto opaco de la raíz. `pidiendoLaVentana = consulta.isFetching`.
- `Button` `variant="outline"` `size="sm"`, icono `FileSpreadsheet` (`aria-hidden`) y el texto de `TEXTOS_EXPORTACION.boton`. **Nunca `primary`** (CAL-T-186: la vista no tiene acción principal).
- `enEspera={exportar.isPending || pidiendoLaVentana}`: en espera mientras exporta y mientras el gradebook pide una ventana o recarga. Así siguen en pie CAL-T-149 y CAL-1D02 ("todos los botones de la vista en espera mientras llega una ventana"), y no se exporta sobre una ventana que se reemplaza.
- **Guarda síncrona** con `exportandoRef` (`if (exportandoRef.current || pidiendoLaVentana) return` antes de `mutateAsync`; CLAUDE.md, "Componentes").
- **Manejador** (try/catch/finally, CLAUDE.md "Manejo de errores en el frontend"):
  1. `toast.dismiss(ID_DEL_AVISO_DE_EXPORTACION)` (el aviso del intento anterior se va).
  2. `const controlador = new AbortController()`, guardado en `controladorRef`; `mutateAsync({ signal: controlador.signal, ahora: new Date() })`.
  3. Si `controlador.signal.aborted` (la vista se desmontó, DH-08 a): nada (ni aviso ni descarga).
  4. Resultado `descargado` → `toast.success(TEXTOS_EXPORTACION.listo(nombre), { id })`; `cambio` → `toast.error(MENSAJES_ERROR_EXPORTACION.cambio, { id })`; `vacio` → `toast.error(MENSAJES_ERROR_EXPORTACION.vacio, { id })`; (Enmienda 1, M-03) `demasiado` → `toast.error(MENSAJES_ERROR_EXPORTACION.demasiado, { id })`.
  5. `catch`: si el signal se abortó o `errorQueRedirigeElCliente(error)` → nada; si no, `toast.error(mensajeDeErrorDeExportacion(error), { id })`.
  6. `finally`: `exportandoRef.current = false`.
- `useEffect(() => () => controladorRef.current?.abort(), [])`: al desmontarse, la petición en vuelo se aborta.
- Los avisos viven en este componente: `gradebook-view.tsx` y `hooks.ts` siguen sin `toast`, `sonner` ni `onError` (CAL-T-189).
- **Foco:** se queda en el botón en todos los casos. Si una recarga del gradebook reemplaza la vista con el botón enfocado, el foco va a la raíz por `useFocoAlPerderseElControl`, que ya existe (sin cambio).

**Gancho** (`hooks.ts`): `useExportarCalificaciones(claseId)` = `useMutation({ mutationFn: ({ signal, ahora }: PeticionDeExportacion) => exportarCalificaciones(claseId, signal, ahora) })`, sin `onError` ni avisos. `exportarCalificaciones` (privada en `hooks.ts`): `recorrerLaExportacion` → `"cambio"`, `"demasiado"` (Enmienda 1) o `combinarVentanasDeExportacion` → si `matriz`, `armarLibroXlsx(hojaDeExportacion(matriz, ahora))` y `nombreDelArchivoDeExportacion(matriz.clase, ahora)`; si el signal ya se abortó, devuelve `{ tipo: "cancelado" }` sin descargar; si no, `descargarArchivo(bytes, nombre, TIPO_MIME_XLSX)` y devuelve `{ tipo: "descargado", nombre }`. El resultado de la mutación no guarda los bytes ni la matriz (solo el nombre): en la caché de mutaciones no quedan correos ni calificaciones.

**Traducción de errores** (`lib.ts`): `mensajeDeErrorDeExportacion(error)`: con `esErrorDeCursorDeCalificaciones(error, CAMPOS_DE_CURSOR_DEL_GRADEBOOK)` → `MENSAJES_ERROR_EXPORTACION.cambio`; si no, `mensajeDeErrorCalificaciones(error, MENSAJES_ERROR_EXPORTACION.generico)`, la función que el módulo ya tiene: da `TEXTOS_DE_LA_CLASE.sinAcceso` ante `SIN_ACCESO_A_LA_CLASE` o un `400` de `claseId`, y el respaldo ante todo lo demás (un `400 VALIDACION` de cualquier otro campo, con o sin ruta, con mensaje vacío o de solo espacios, `5xx`, `503`, `SIN_CONEXION`, `RESPUESTA_INVALIDA` o un código desconocido). **Nunca muestra el texto del servidor**, como las consultas del módulo (excepción de `features/calificaciones` en CLAUDE.md, que se amplía a su exportación).

**Matriz esperada de avisos, recargas y foco** (el programador la entrega en su primer resumen de 02b, contrastada con el código; `AGENTS.md`):

| Disparador | Caso | Se renueva | Aviso (uno, `id` fijo) | Foco | Con la vista desmontada |
|---|---|---|---|---|---|
| "Exportar a Excel" | Éxito | Nada (no usa la caché) | "Se descargó «…»." | El botón | Abortada: sin descarga ni aviso |
| | `400` de `cursor` o `cursorTareas`, o la combinación dice `cambio` | Nada | "Las calificaciones cambiaron…" | El botón | Ídem |
| | `vacio` | Nada | "No hay calificaciones que exportar…" | El botón | Ídem |
| | `403 SIN_ACCESO_A_LA_CLASE` o `400` de `claseId` | Nada (el gradebook lo dirá en su próxima lectura) | "No tienes acceso a esta clase." | El botón | Ídem |
| | `401` con refresco fallido, `403 ACCESO_RESTRINGIDO`, `403 CAMBIO_DE_CONTRASENA_REQUERIDO` | `apiClient` redirige | Ninguno | — | Ídem |
| | `5xx`, `503`, sin conexión, respuesta inválida, otro `400`, una celda mal formada (§D-5.2) | Nada | "No pudimos preparar el archivo…" | El botón | Ídem |
| | (Enmienda 1, M-03) Más de 200 ventanas necesarias (con los totales de la primera respuesta) o 200 peticiones sin terminar | Nada | "Esta clase tiene demasiadas calificaciones…" (sin promesa de reintento) | El botón | Ídem |
| En vuelo a la vez | Una ventana del gradebook o una recarga mientras se exporta, que deja la tabla o el texto del cursor a la vista | La del gradebook, como hoy | Los del gradebook, como hoy (ninguno) | Como hoy | — |
| | (Enmienda 1, N-01) Una recarga del gradebook que **reemplaza la vista** (`403`, o un error sin tabla) o la deja en uno de sus **vacíos** (la clase se quedó sin alumnos o sin tareas) mientras se exporta | La del gradebook, como hoy; `ExportarAExcel` se desmonta y la exportación se aborta (DH-08 a) | Ninguno de la exportación (ni aviso ni descarga, ni si la respuesta llega después); el de la vista es su `MensajeError` o su vacío, como hoy | La raíz de la vista, por `useFocoAlPerderseElControl`, si el botón tenía el foco | — |
| | Pulsar otra vez (o con la ventana pidiéndose) | Nada: la guarda y `enEspera` lo ignoran | Ninguno | El botón | — |

### §D-8 · Textos (`features/calificaciones/data.ts`; DH-06 a)
```ts
export const TEXTOS_EXPORTACION = {
  boton: "Exportar a Excel",
  listo: (archivo: string) => `Se descargó «${archivo}».`,
  hoja: "Calificaciones",
  alumno: "Alumno",
  correo: "Correo",
  categoria: "Categoría",
  puntos: "Puntos",
  promedio: "Promedio (%)",
  sinCategoria: TEXTOS_DE_LA_CLASE.sinCategoria,
  sinDato: SIN_DATO,
  prefijoDelArchivo: "Calificaciones",
} as const
export const MENSAJES_ERROR_EXPORTACION = {
  generico: "No pudimos preparar el archivo de calificaciones. Inténtalo de nuevo.",
  cambio: "Las calificaciones cambiaron mientras preparábamos el archivo. Inténtalo de nuevo.",
  vacio: "No hay calificaciones que exportar: la clase no tiene alumnos o tareas.",       // Enmienda 1: "tareas"
  demasiado: "Esta clase tiene demasiadas calificaciones para exportarlas en un solo archivo.", // Enmienda 1, M-03
} as const
export const ID_DEL_AVISO_DE_EXPORTACION = "exportar-calificaciones"
export const MAXIMO_DE_PETICIONES_DE_EXPORTACION = 200
```
`TEXTOS_EXPORTACION` es la **única** declaración de `data.ts` que nombra "correo" (CAL-1D09 enmendada). Las frases "Inténtalo de nuevo" son frases de recuperación: sus caminos están en CAL2-B13.

### §D-R0 · Pruebas `*.ataque` que el cambio rompe (el tester las reescribe en la ronda 0 de cada subentrega, antes del programador)
**02a:**
- **C-1.** `backend/test/sesiones-y-cadena.ataque.test.ts` (lista de rutas bajo `/api`, líneas ~529 a 650): se agregan exactamente `"GET /api/clases/:claseId/calificaciones/exportacion"` y `"HEAD /api/clases/:claseId/calificaciones/exportacion"`, el comentario "C-1 de CALIFICACIONES-02a (§D-R0): se agregan exactamente GET y HEAD de …/calificaciones/exportacion. No crea cuentas ni cambia roles y no es pública." y "CALIFICACIONES-02a" en el título del caso. Nada más cambia.
- **C-2.** `backend/test/lecturas-fx-r1.ataque.test.ts:758-823`: la lista `usos` suma `"adapters/db/exportacion-de-calificaciones.ts:1"` con el comentario "CALIFICACIONES-02a, C-2 (§D-R0; §D-2): leerExportacionDeCalificaciones corre en la instantánea única." y el título pasa de "dieciocho lecturas (… dos de dudas)" a "diecinueve lecturas (… dos de dudas y una de la exportación)". Lo demás que protege el caso no cambia.

**02b:**
- **C-3.** `frontend/src/features/calificaciones/estatico-01d-r1.ataque.test.ts:47` (CAL-T-182): `expect(MODULO.length).toBe(11)` pasa a `12` (el componente nuevo). Nada más.
- **C-4.** `frontend/src/styles/clases-r1.ataque.test.ts:170-177` (V-06): el título y `expect(usos).toHaveLength(71)` pasan de 71 a 72, y `fijos` suma `"/src/features/calificaciones/components/exportar-a-excel.tsx": 1` con el comentario "C-4 de CALIFICACIONES-02b (§D-R0; §D-7): de 71 a 72, «Exportar a Excel». Sigue protegiendo que el número y el lugar de los botones con espera cambien solo con el plan." Nada más.

Ninguna otra `*.ataque` debe romperse con este diseño; lo verifiqué contra: V-02 a V-05 y V-07 de `styles/clases-r1.ataque` (en `lib/xlsx.ts`, los textos del XML no llevan `#` con hexadecimal, `rgb(`, ni nombres como `fill-gray`: los estilos no declaran colores), CAL-T-68 (el correo vive fuera de `calificaciones.ts`), CAL-T-69 (§D-0.6), E6 de `bloqueo-usuario.integracion` (el adaptador nuevo no usa SQL crudo), CAL-T-149 y CAL-1D02 (el botón está en espera mientras llega una ventana), CAL-T-186 (`outline`), CAL-T-187 (textos en `data.ts`), CAL-T-188, CAL-T-189 (avisos en el componente), CAL-T-191 (reloj fijo en las pruebas nuevas del módulo) y la regla de `fetch(` y `_blank` de `entregas-01d-r1.ataque`. (Enmienda 1, N-04) Tampoco rompen, si se cumple §D-0.6: O-05 de `features/clases/errores-ch3-r1.ataque.test.ts:418-447`, que recorre la producción de `features/calificaciones/` y prohíbe `new RegExp(`, `\p{L}`, `.split(":")`, `.indexOf(":")` y las expresiones `/^…:` (el limpiador de §D-6 usa `/[\\/:*?"<>|]/g` y puntos de código), y CAL-T-185 (`estatico-01d-r1.ataque.test.ts:59-63`), que prohíbe emojis literales en todas las pruebas del módulo (CAL2-B06 y las demás los escriben con `\u{…}`). La ronda 0 de 02b las revisa contra el código entregado. **La ronda 0 recorre igual todas las `*.ataque` del paquete contra el diseño**; una que rompa fuera de C-1 a C-4 es PARADA y va en una enmienda.

## Cambios por capa

### shared/ (02a)
- `shared/src/calificaciones.ts`: lo de §D-1, al final del archivo, sin tocar lo existente.
- `shared/src/index.ts`: reexporta por nombre `LIMITE_DE_LA_EXPORTACION`, `exportacionQuerySchema`, `alumnoDeExportacionSchema`, `filaDeExportacionSchema`, `exportacionDeCalificacionesRespuestaSchema` y los tipos `ExportacionQuery`, `AlumnoDeExportacion`, `FilaDeExportacion`, `ExportacionDeCalificacionesRespuesta`.
- `npm run build` de `shared` antes de correr el backend (R-17 de TAREAS-01).

### backend/core/
Sin cambios (§D-0.7).

### backend/adapters/ (02a)
- `adapters/db/calificaciones.ts`: **solo** `const leerGradebookCon` pasa a `export const leerGradebookCon`. Ni una línea más (ni comentarios).
- `adapters/db/exportacion-de-calificaciones.ts` (nuevo): §D-2.
- `adapters/db/index.ts`: exporta `leerExportacionDeCalificaciones` y los tipos `AlumnoDeExportacionDb`, `FilaDeExportacionDb` y `ExportacionDeCalificacionesDb`. No reexporta `leerGradebookCon` (solo la usa el adaptador nuevo).
- `adapters/README.md`: la sección de §"Documentos a actualizar".

### backend/handlers/ (02a)
- `handlers/calificaciones.ts`: la ruta de §D-3 al final del plugin, después de "Mis calificaciones"; importa `exportacionQuerySchema` y `exportacionDeCalificacionesRespuestaSchema` de `@campus/shared` y `leerExportacionDeCalificaciones` de `../adapters/db/index.js`. Reutiliza `columnaParaResponder`. Cadena exacta: `protegido({ roles: ["maestro", "admin"], pertenencia: "propiedad" })`.
- `handlers/README.md`: el párrafo de §"Documentos a actualizar".

### backend/workers/
Sin cambios. No hay evento ni cola: R-01.

### backend/prisma/
Sin migración. Índices que usa (todos existen): PK de `clases`, `tareas(clase_id, fecha_limite)`, PK de `inscripciones`, PK de `usuarios`, el único `entregas(tarea_id, alumno_id)` y `categorias(clase_id, creado_en, id)`.

### infra/ y .env.example
Sin cambios.

### frontend/ (02b)
- `lib/xlsx.ts` (nuevo): §D-5.1.
- `lib/lector-xlsx-de-prueba.ts` (nuevo; **solo lo importan pruebas**, como `lib/errores-de-api-fuera-de-contrato.ts`): `leerZip(bytes): { nombre: string; contenido: string }[]` (lee un ZIP sin compresión: cabeceras locales, directorio central y fin de directorio; comprueba el CRC de cada entrada y lanza si no cuadra) y `celdasDeLaHoja(bytes): Map<string, { tipo: "texto" | "numero"; valor: string; negrita: boolean }>` (parsea `sheet1.xml` con `DOMParser` y falla si hay `parsererror`). Lo usan CAL2-B09 y B13 para leer el contenido de la hoja; desde la Enmienda 1 (M-02), CAL2-B01 a B03 **no** lo usan para validar el formato: comparan byte a byte con los literales de §D-5.1.
- `lib/xlsx-muestra.test.ts` (nuevo; Enmienda 1, DH-10): CAL2-B17.
- `services/descargaService.ts` (nuevo): §D-5.3.
- `features/calificaciones/types.ts`: reexporta de `@campus/shared` `ExportacionDeCalificacionesRespuesta`, `FilaDeExportacion` y `AlumnoDeExportacion`; tipos de la interfaz: `VentanaDeExportacion { ventanaDeTareas: number; respuesta: ExportacionDeCalificacionesRespuesta }`, `MatrizDeExportacion { clase: string; columnas: ColumnaDelGradebook[]; filas: { alumno: AlumnoDeExportacion; celdas: CeldaDelGradebook[]; porcentaje: number | null }[] }`, `CombinacionDeExportacion` (`matriz` | `cambio` | `vacio`), `PeticionDeExportacion { signal: AbortSignal; ahora: Date }` y `ResultadoDeLaExportacion` (`descargado` con `nombre` | `cambio` | `vacio` | `demasiado` (Enmienda 1) | `cancelado`).
- `features/calificaciones/data.ts`: §D-8.
- `features/calificaciones/lib.ts`: `rutaDeExportacion(claseId, ventana, limites)` (como `rutaDelGradebook`, con la ruta `…/calificaciones/exportacion`), `ventanasDeLaExportacion` y `mismoAlumnoDeExportacion` (Enmienda 1, §D-4), `combinarVentanasDeExportacion` (§D-4), `hojaDeExportacion` y `filasDeLaHojaDeExportacion` (§D-5.2), `nombreDelArchivoDeExportacion` (§D-6) y `mensajeDeErrorDeExportacion` (§D-7).
- `features/calificaciones/hooks.ts`: `useExportarCalificaciones` y las privadas `recorrerLaExportacion` y `exportarCalificaciones` (§D-4 y §D-7); sin `toast`, `sonner` ni `onError`.
- `features/calificaciones/components/exportar-a-excel.tsx` (nuevo): §D-7.
- `features/calificaciones/gradebook-view.tsx`: una sola inserción en `cuerpo`, `<ExportarAExcel claseId={claseId} pidiendoLaVentana={consulta.isFetching} />` entre `ResumenDelGradebook` y `NavegacionDelGradebook`, y su `import`. Nada más.
- Sin dependencias nuevas con DH-01 (a). `package.json` y `package-lock.json` no cambian.

## Acceso a datos

| Consulta (por respuesta) | Tablas | Índice | Paginación | Transacción |
|---|---|---|---|---|
| Nombre de la clase | `clases` | PK | Una fila | La instantánea única de `leerExportacionDeCalificaciones` |
| Cursor de actividades (si viene) y ventana de actividades | `tareas` + `publicaciones` (título) | `(id, clase_id)` por PK; `tareas(clase_id, fecha_limite)` | Conjunto de claves `(fecha_limite DESC, id DESC)`, hasta 100 | Ídem |
| Cursor de alumnos (si viene) y página de alumnos | `usuarios`, `inscripciones` | PK de `usuarios`; PK de `inscripciones` + orden `nombre_busqueda, usuario_id` (el del roster, sin cambio) | Hasta 100 | Ídem |
| Celdas | `entregas` | Único `(tarea_id, alumno_id)` | Las de la ventana: una consulta con `IN` | Ídem |
| Categorías, agregado por alumno y categoría, vencidas, total de alumnos | Las del gradebook (§D-6 de CALIFICACIONES-01) | Los mismos | Agregados de la clase (no son listas que se respondan) | Ídem |
| Total de actividades | `tareas` | `tareas(clase_id, fecha_limite)` (prefijo) | `COUNT` | Ídem |
| Correos de la página | `usuarios` | PK | Los de la página (hasta 100): una consulta con `IN` | Ídem |

Ninguna consulta dentro de un ciclo; de 9 a 12 sentencias por respuesta, sin importar el tamaño (CAL2-A10). Solo lecturas: sin `FOR UPDATE`/`SHARE`, sin escrituras, sin SQL crudo nuevo. Del lado del navegador, el recorrido hace una petición por ventana, en serie; una clase de hasta 100 alumnos y 100 actividades es una sola.

**Tamaño de la respuesta (Enmienda 1, N-02).** Una celda de `celdaDelGradebookSchema` ocupa unos 95 bytes de JSON (`{"tareaId":"<uuid>","estado":"calificado","conRetraso":false,"calificacion":8.5}`); una columna, unos 200; una fila sin sus celdas, unos 150. Una ventana llena de 100 × 100 son 10,000 celdas: **unos 0.95 MB de celdas y cerca de 1 MB en total**, con el `parse` estricto en el servidor y en el navegador. El máximo del gradebook (50 × 50, 2,500 celdas) son **unos 0.25 MB**: la exportación es hasta cuatro veces más grande por respuesta. Una clase real del piloto (unos 30 alumnos × 40 tareas, 1,200 celdas) son **unos 115 KB**. La compresión del proxy reduce mucho la repetición de llaves y de ids de tarea. Cumple "máx. 100" por dimensión; si el humano prefiere el techo del gradebook, es DH-11 (b).

## Autorización

| Quién | `GET`/`HEAD …/calificaciones/exportacion` |
|---|---|
| Maestro de la clase (cualquiera de los dos) | `200` |
| Administrador, en cualquier clase que exista | `200` |
| Maestro de otra clase, o que ya no da la clase (fila de `maestros_de_clase` borrada) | `403 SIN_ACCESO_A_LA_CLASE` |
| Clase inexistente (maestro o admin) | `403 SIN_ACCESO_A_LA_CLASE` (la misma respuesta que una ajena) |
| Estudiante, inscrito o no | `403 ROL_NO_PERMITIDO` |
| Estudiante restringido | `403 ACCESO_RESTRINGIDO` (paso 4, antes del rol) |
| Con cambio de contraseña pendiente | `403 CAMBIO_DE_CONTRASENA_REQUERIDO` |
| Sin sesión o con token vencido sin refresco | `401` |
| `claseId` que no es UUID | `400 VALIDACION` "claseId: …" |

**Campos que se omiten (P-13 y RN-02):** la respuesta nunca trae `estadoPago`, `fechaEstadoPago`, `accesoRestringido`, `motivoRestriccion`, `rol`, `version`, `activo` ni el hash; el alumno es `{ id, nombre, email }` y nada más. Un alumno restringido o deudor aparece como cualquier otro, sin ese dato. Lo garantizan el esquema estricto, la lista de `select` del adaptador y CAL2-A02/CAL2-A08; en el navegador, el tipo de la hoja y CAL2-B09.

## Pruebas requeridas

Toda prueba ejecuta al menos una aserción y ninguna termina con un `return` temprano; una precondición que falta hace fallar la prueba con su mensaje. En `features/calificaciones/`, toda prueba que construye fechas o compara textos de tiempo fija el reloj (`vi.useFakeTimers` + `vi.setSystemTime`; CAL-T-191) y no lleva emojis (CAL-T-185).

### 02a (backend; Testcontainers)
`backend/test/exportacion-calificaciones-autorizacion.integracion.test.ts`:
- **CAL2-A01** Autorización: cada fila de la tabla de "Autorización", con `GET` y con `HEAD` (`HEAD`: `200` sin cuerpo para el maestro de la clase; `403` para el estudiante inscrito y para el restringido).
- **CAL2-A02** Sin fuga (P-13): en una clase con una alumna deudora y restringida y otra al corriente, para el maestro, el comaestro y el admin, el cuerpo de éxito y de cada error de este archivo no contiene `estadoPago`, `fechaEstadoPago`, `accesoRestringido`, `motivoRestriccion`, `"rol"`, `"version"`, `"activo"`, `hash`, `Deudor` ni `deudor`; cada `alumnos[i].alumno` tiene exactamente las llaves `id`, `nombre` y `email`, y la respuesta exactamente las siete de §D-1; la alumna restringida aparece con su nombre y su correo.

`backend/test/exportacion-calificaciones.integracion.test.ts`:
- **CAL2-A03** Quién aparece: solo los inscritos con cuenta activa de esa clase, con su correo completo (sin enmascarar); no aparecen un alumno dado de baja, uno con la cuenta desactivada ni uno de otra clase del mismo maestro; `totalAlumnos` los cuenta igual.
- **CAL2-A04** Mismo cálculo que el gradebook (RF-65): con una clase por categorías y otra por puntos, y con una calificada sin entrega, una entregada con retraso calificada, una tarea "Sin categoría" en la clase con categorías, una asignada y una vencida sin entregar, cada fila (`celdas` y `porcentaje`) y cada columna son iguales a las de `GET …/gradebook` con los mismos cursores y límites ≤ 50, y el `porcentaje` de cada alumno es la `general.porcentaje` de su `GET …/mis-calificaciones`.
- **CAL2-A05** Ventanas: `limite` y `limiteTareas` por omisión 100; `0`, `101` y `abc` responden `400 VALIDACION`; con 3 alumnos, `limite=2`, y 3 actividades, `limiteTareas=2`, recorrer las 4 combinaciones da todas las celdas una vez, con `totalAlumnos = 3` y `totalTareas = 3` en las cuatro, y el orden de alumnos y actividades es el del gradebook (incluidas dos actividades con la misma fecha límite, ordenadas por id); un `cursor` de un usuario que no existe responde `400` "cursor: no es válido"; un `cursorTareas` de una actividad de otra clase, `400` "cursorTareas: no es válido"; un `cursorTareas` en mayúsculas funciona igual que en minúsculas.
- **CAL2-A06** La clase: `clase.nombre` es el de la clase; sin alumnos, `alumnos: []`, `totalAlumnos: 0` y las columnas igual; sin actividades, `tareas: []`, `totalTareas: 0` y cada fila con `celdas: []`.
- **CAL2-A07** Una instantánea (con `ejecutorEspiado` y `unaVezDespuesDe` de `ayudas-gradebook.ts`): una calificación confirmada por otra conexión después de leer las celdas, una inscripción nueva después de leer la página y una actividad nueva después del conteo no cambian la respuesta en curso (celdas y porcentaje coherentes entre sí y con la lectura anterior; `totalAlumnos` y `totalTareas` iguales a los de antes); la siguiente lectura sí las ve.
- **CAL2-A10** Sin N+1: `leerExportacionDeCalificaciones` hace las mismas sentencias con 1, 2 y 30 alumnos y con 1, 2 y 30 actividades (con `ejecutorEspiado`), con y sin cursores.

`backend/test/exportacion-calificaciones-estatico.test.ts`:
- **CAL2-A08** Estáticas: `adapters/db/exportacion-de-calificaciones.ts` no escribe ni bloquea (ni `create`, `update`, `delete`, `upsert`, `$executeRaw`, `INSERT`, `UPDATE`, `DELETE`, `FOR UPDATE`/`SHARE`), no usa `$queryRaw` ni `Promise.all`, tiene `instantaneaUnica: true` exactamente una vez en el texto crudo y en código, dentro de `leerExportacionDeCalificaciones`, llama a `leerGradebookCon(tx`, y en código no nombra `estadoPago`, `estado_pago`, `fechaEstadoPago`, `accesoRestringido`, `acceso_restringido`, `motivoRestriccion`, `rol`, `version` ni `hash`; `email` aparece solo en el `select` de los correos y en sus tipos. `adapters/db/calificaciones.ts` sigue sin nombrar `email` y declara `export const leerGradebookCon = async (` (que su única diferencia con `ff09e69` sea esa palabra lo comprueba el manager con `git diff`, no la prueba). `handlers/calificaciones.ts` registra la ruta con la cadena exacta (`app.get(` seguido de `"/clases/:claseId/calificaciones/exportacion"` y `protegido({ roles: ["maestro", "admin"], pertenencia: "propiedad" })`), no compara rol ni relación y no toca Prisma ni SQL. Ningún comentario de los archivos nuevos o cambiados de `backend/src` tiene las palabras de §D-0.6.

`backend/test/esquemas-exportacion.test.ts`:
- **CAL2-A09** Esquemas: `exportacionQuerySchema` (por omisión, límites, cursores UUID, `cursorTareas` a minúsculas); `exportacionDeCalificacionesRespuestaSchema`, `filaDeExportacionSchema` y `alumnoDeExportacionSchema` son `z.strictObject` (texto de `shared/src/calificaciones.ts`, como CAL-1B08) y rechazan un objeto con `estadoPago`, `accesoRestringido` o `rol` de más.

### 02b (frontend; jsdom)
`frontend/src/lib/xlsx.test.ts` (Enmienda 1, M-02: **sin** el lector de prueba; los textos esperados se copian de los literales de §D-5.1 a la prueba, y los CRC se calculan con `crc32` de `node:zlib`, una implementación independiente de la del escritor):
- **CAL2-B01** Estructura, byte a byte: para una hoja dada (nombre "Calificaciones", dos filas, anchos e inmovilizado 3 × 2), la salida de `armarLibroXlsx` es **igual** (`toEqual` sobre los bytes) al archivo esperado que la prueba arma con: las cinco partes fijas literales de §D-5.1 (con `{NOMBRE}` = "Calificaciones") y el `sheet1.xml` literal completo de esa hoja, cada una precedida de su cabecera local con los valores literales de "Contenedor ZIP", seguidas del directorio central y del fin de directorio con los suyos. Además: la función CRC del escritor da `0xCBF43926` para "123456789" y coincide con `crc32` de `node:zlib` sobre cada parte; dos llamadas con la misma hoja dan los mismos bytes; cada parte también es XML bien formado para `DOMParser` (sin `parsererror`), como control adicional.
- **CAL2-B02** Texto: el `sheet1.xml` de una hoja de una fila es exactamente el literal esperado para cada uno de estos textos: `& < > " '` (escapados como en §D-5.1), `]]>`, saltos de línea, tabuladores, espacios al inicio y al final (con `xml:space="preserve"`), acentos, ñ y un emoji (escrito `\u{1F600}`); U+0000 a U+0008, U+000B, U+000C, U+000E a U+001F, U+FFFE, U+FFFF y un sustituto suelto desaparecen (el literal esperado no los tiene); "Tarea_x0041_" se escribe `Tarea_x005F_x0041_`, "_x00e9_" se escribe `_x005F_x00e9_`, y "_x41_" y "x0041_" (no son la forma `_xHHHH_`) quedan igual; un texto que empieza con `=`, `+`, `-` o `@` es una celda `inlineStr` sin `<f>`; un texto que queda vacío tras limpiarlo no se escribe.
- **CAL2-B03** Números y forma: `0`, `-0`, `10`, `8.5`, `7.78`, `1000` y `82.4` salen como `<v>0</v>`, `<v>0</v>`, `<v>10</v>`, `<v>8.5</v>`, `<v>7.78</v>`, `<v>1000</v>` y `<v>82.4</v>`; `NaN`, `Infinity` y `-Infinity` lanzan; un texto de 32,768 unidades lanza y uno de 32,767 no; un nombre de hoja vacío, de 32 caracteres o con `[ ] : * ? / \` lanza; `inmovilizar` con 0 filas o 0 columnas lanza; las referencias de la columna 1, 26, 27, 52, 53, 702 y 703 son `A`, `Z`, `AA`, `AZ`, `BA`, `ZZ` y `AAA`; una fila sin celdas escritas no tiene `<row>` y la siguiente conserva su número; la negrita usa `s="1"` en el orden de atributos `r`, `s`, `t`; con 3 filas y 2 columnas inmovilizadas, el `pane` es `<pane xSplit="2" ySplit="3" topLeftCell="C4" activePane="bottomRight" state="frozen"/>` y la selección `C4`; sin anchos no hay `<cols>`.

`frontend/src/lib/xlsx-muestra.test.ts` (Enmienda 1, DH-10):
- **CAL2-B17** Muestra para H-0: arma con `armarLibroXlsx` una hoja "Calificaciones" de 3 filas de encabezado en negrita y 4 alumnos, con 30 columnas de tareas (pasa de `Z` a `AD`), acentos y ñ, un emoji (`\u{1F600}`), un texto "=SUMA(1;2)", un texto "Tarea_x0041_", números con 0, 1 y 2 decimales, "—", anchos y el inmovilizado 3 × 2, y la escribe en `join(tmpdir(), "cmep-calificaciones-muestra.xlsx")` (`node:fs` y `node:os`); comprueba que el archivo existe y que sus bytes son los de la salida. Corre en cada suite (escribir en la carpeta temporal no afecta a nada); el programador da la ruta en su resumen del paso 2 de 02b.

`frontend/src/services/descargaService.test.ts`:
- **CAL2-B16** `descargarArchivo` (con `URL.createObjectURL` y `URL.revokeObjectURL` sustituidos y `HTMLAnchorElement.prototype.click` espiado): crea un `Blob` con el tipo dado y los bytes, un enlace con `download` igual al nombre y sin `target`, hace un solo `click`, el enlace ya no está en el documento al terminar y la URL se revoca en el turno siguiente.

`frontend/src/features/calificaciones/exportacion-02b.test.ts` (puras; reloj fijo):
- **CAL2-B04** `combinarVentanasDeExportacion`: una sola respuesta da la matriz; 2 × 2 ventanas dan la misma matriz que una sola respuesta con los mismos datos; cada regla de §D-4 (1 a 6) da `cambio` con un caso propio (otro nombre de clase o total en una respuesta, otras actividades dentro de una ventana, una celda desalineada o de menos, otros alumnos u otro orden, otro nombre, correo o porcentaje en la segunda ventana, una actividad repetida, totales que no cuadran); sin alumnos o sin actividades da `vacio`; las columnas quedan de la más antigua a la más reciente y las celdas de cada fila en ese mismo orden. (Enmienda 1, M-01) `mismoAlumnoDeExportacion` da `false` con cada uno de `id`, `nombre`, `email` y `porcentaje` distinto (incluido `null` frente a un número) y `true` con los cuatro iguales. (Enmienda 1, M-03) `ventanasDeLaExportacion(totalAlumnos, totalTareas, 100)` da 1 con 0 × 0, 1 × 1 y 100 × 100, 2 con 101 × 100, 4 con 101 × 101 y 201 con 20,100 × 100.
- **CAL2-B05** `filasDeLaHojaDeExportacion` y `hojaDeExportacion`: las tres filas de encabezado exactas (textos de `TEXTOS_EXPORTACION`, en negrita); "Sin categoría"; los puntos como número; una calificada (también con retraso o sin entrega) como número; "Entregado", "Entregado con retraso", "Sin entregar" y "Asignado" según `ahora` (una actividad que vence un minuto antes y otra un minuto después de `ahora`); el promedio como número o "—"; las filas en el orden de la matriz; una fila con campos de más (`estadoPago: "Deudor"`, `accesoRestringido: true`, forzados en la prueba) no los lleva a ninguna celda; nombre de hoja, anchos y panel inmovilizado de §D-5.2; (Enmienda 1) una celda `calificado` con `calificacion: null` y una `entregado` con calificación lanzan.
- **CAL2-B06** `nombreDelArchivoDeExportacion`: la forma de §D-6 con "Matemáticas I"; la fecha local (con el reloj fijo a las 23:30 de un día en la zona del proceso, la fecha es la de ese día local); cada carácter de `\ / : * ? " < > |`, U+0000, U+001F, U+007F, U+202E y U+2066 pasa a espacio y los espacios se colapsan; puntos y espacios finales fuera; una clase de 120 caracteres se recorta a 80 sin partir un emoji del borde (Enmienda 1, N-04: todos los caracteres especiales de la prueba, emojis incluidos, escritos con escapes `\u{…}`, nunca literales; CAL-T-185); una clase que queda vacía da `Calificaciones - AAAA-MM-DD.xlsx`; el resultado siempre termina en `.xlsx` y no contiene U+202E.
- **CAL2-B07** `mensajeDeErrorDeExportacion`: cada entrada de `ENTRADAS_FUERA_DE_CONTRATO` como `400 VALIDACION` da el genérico; cada `RESTOS_SIN_TEXTO_VISIBLE` tras `campoFueraDeContrato:` da el genérico y tras `claseId:` el de sin acceso; `cursor: no es válido` y `cursorTareas: no es válido` dan el de cambio; `SIN_ACCESO_A_LA_CLASE` da el de sin acceso; `ERROR_INTERNO` (500), `SERVICIO_OCUPADO` (503, con mensaje y sin él), `SIN_CONEXION`, `RESPUESTA_INVALIDA` y un código desconocido dan el genérico; ningún resultado contiene el texto del servidor de la entrada.

`frontend/src/features/calificaciones/exportar-02b.test.tsx` (vista del gradebook con `fetch` sustituido, `descargaService` sustituido con `vi.mock` y sonner real; reloj fijo):
- **CAL2-B08** El botón: "Exportar a Excel" (`outline`, tamaño `sm`) aparece con la tabla, para el maestro y el admin, dentro del contexto opaco de la raíz y entre el resumen y los botones de las ventanas; con el texto del cursor a la vista también; no aparece en los dos vacíos, en la carga ni con un error que reemplaza la vista; lleva `aria-busy` mientras exporta y mientras se pide una ventana del gradebook, y ninguna vez `disabled`; dos clics seguidos (o un clic con la ventana pidiéndose) hacen un solo recorrido.
- **CAL2-B09** El recorrido y el archivo: la primera petición es `…/calificaciones/exportacion?limite=100&limiteTareas=100` sin cursores; con respuestas de 2 × 2 ventanas, las peticiones siguen el orden de §D-4 (alumnos dentro de cada ventana de actividades); `descargarArchivo` se llama una vez, con el nombre de §D-6 y `TIPO_MIME_XLSX`; leído con el lector de prueba, el archivo trae los encabezados, las celdas, los promedios y los correos esperados y no contiene "Deudor", "Al corriente" ni "estring"; un solo aviso, "Se descargó «…»."; el foco sigue en el botón; en la caché de mutaciones no queda ningún correo (el resultado solo trae el nombre).
- **CAL2-B10** Errores (un caso por fila de la matriz de §D-7): `403 SIN_ACCESO_A_LA_CLASE`, `400` de `cursor` y de `cursorTareas` en la segunda ventana, una combinación con `cambio`, un cursor que se repite, `vacio`, `500`, `503`, sin conexión y `RESPUESTA_INVALIDA` dan su aviso, uno solo, sin descarga, con el botón fuera de la espera y el foco en él; `401` con refresco fallido, `403 ACCESO_RESTRINGIDO` y `403 CAMBIO_DE_CONTRASENA_REQUERIDO` no dan aviso ni descarga; un `500` no se reintenta (una sola petición de esa ventana). (Enmienda 1, M-03) Con una primera respuesta de `totalAlumnos: 20100` y `totalTareas: 100` (201 ventanas), una sola petición y el aviso "Esta clase tiene demasiadas calificaciones para exportarlas en un solo archivo.", sin "Inténtalo de nuevo"; con totales de una sola ventana pero respuestas que siguen trayendo cursores nuevos, el recorrido para en la petición 200 con el mismo aviso.
- **CAL2-B11** `VALIDACION` fuera de contrato (regla del humano, 2026-10-13), con `ENTRADAS_DE_FORMULARIO`: un `400 VALIDACION` de un campo que la interfaz no pinta (`campoFueraDeContrato: …`), uno con mensaje vacío o de solo espacios, y uno con prefijo con ruta (`archivoIds.0.id: …`) dan cada uno un solo aviso, el genérico, nunca el texto del servidor, y el botón sale de la espera. La exportación no tiene campos ni modos: "lo escrito se conserva" y "un campo pintado en otro modo" no aplican. La secuencia de un rechazo seguido de otro intento: el aviso del rechazo se va al empezar el intento nuevo y la persona solo lee el del intento que acaba de hacer.
- **CAL2-B12** Con la vista desmontada (DH-08 a): ir a otra sección con la exportación en vuelo aborta la petición (el `signal` llega abortado al `fetch`), y no hay aviso ni descarga, ni si la respuesta llega después; lo mismo si se desmonta entre el último `fetch` y la descarga. Al volver, "Exportar a Excel" funciona. (Enmienda 1, N-01) Con la exportación en vuelo, una recarga del gradebook (pulsar la sección) que responde `403 SIN_ACCESO_A_LA_CLASE` reemplaza la vista, y otra que trae la primera ventana sin alumnos la deja en su vacío: en los dos, la petición de la exportación se aborta, no hay aviso de la exportación ni descarga (tampoco si su respuesta llega después), la vista muestra solo su `MensajeError` o su vacío, y si el botón tenía el foco, el foco queda en la raíz de la vista, nunca en `<body>`.
- **CAL2-B14** Independencia del gradebook: exportar no pide ni invalida ninguna consulta del gradebook (las claves de `clavePrefijoDeCalificaciones` no cambian de `dataUpdatedAt`), y una ventana del gradebook pedida mientras se exporta no cancela la exportación.

`frontend/src/features/calificaciones/recuperar-exportacion-02b.test.tsx` (frases de recuperación, regla del humano del 2026-10-26: **router real** con `rutas` de `app/router` y `createMemoryRouter`, `QueryClient` con la configuración de `app/providers.tsx` (`retry: 1`, `refetchOnWindowFocus: false`, `staleTime: 30_000`) y el `Toaster` de `components/ui/sonner`; reloj fijo):
- **CAL2-B13** Para cada una de las dos frases ("Las calificaciones cambiaron mientras preparábamos el archivo. Inténtalo de nuevo." y "No pudimos preparar el archivo de calificaciones. Inténtalo de nuevo."), provocada por el primer intento, un caso por camino; en cada uno, el intento siguiente vuelve a pedir **a la red y desde la primera ventana** (sin cursores), termina con la descarga y el texto de la frase ya no está en el documento:
  1. **Repetir el control:** pulsar otra vez "Exportar a Excel".
  2. **Otra sección y regreso antes del `staleTime`:** ir a "Personas" y volver a "Calificaciones" por las secciones antes de 30 s, y pulsar "Exportar a Excel".
  3. **La sección activa:** pulsar "Calificaciones" estando en ella (otra `location.key`) y después "Exportar a Excel"; pulsar la sección por sí solo no pide ninguna exportación.
  4. **Atrás y adelante del historial:** `router.navigate(-1)` y `router.navigate(1)`, y pulsar "Exportar a Excel".
  5. **(Enmienda 1, M-03) Otra ventana del gradebook:** pulsar "Alumnos siguientes" (y, en otro caso, "Tareas más antiguas"), esperar la ventana y pulsar "Exportar a Excel": la exportación pide desde su primera ventana, sin `cursor` ni `cursorTareas`, aunque el gradebook esté en otra ventana; y regresar con "Alumnos anteriores" o "Tareas más recientes" y exportar, igual.
  6. **(Enmienda 1) Las dos frases a la vez en la misma sesión:** un primer intento con "cambio" y un segundo con el genérico, y el tercero con éxito: solo se ve el aviso del intento que acaba de terminar.
  
  La interfaz no ofrece otros caminos (el gradebook no tiene filtros ni campos). El aviso "Esta clase tiene demasiadas calificaciones…" no es frase de recuperación (no pide repetir nada; M-03).

`frontend/src/features/calificaciones/estatico-02b.test.ts`:
- **CAL2-B15** Estáticas: `exportar-a-excel.tsx` usa `variant="outline"`, `enEspera` y no `disabled`, y tiene sus textos en `data.ts`; `toast` y `sonner` solo en ese componente dentro del módulo (no en `gradebook-view.tsx` ni en `hooks.ts`); `hooks.ts` no tiene `onError`; `lib/xlsx.ts` no importa nada (ni de `features/`, `services/` ni `@campus/shared`); `services/descargaService.ts` no importa de `features/` ni tiene `target`; ningún archivo de producción importa `lib/lector-xlsx-de-prueba.ts`; en el módulo, el correo (`email` o "correo", sin distinguir mayúsculas, en código) solo dentro de la lista única de §D-5.2 (Enmienda 1, M-01): `filasDeLaHojaDeExportacion` y `mismoAlumnoDeExportacion` en `lib.ts` y `TEXTOS_EXPORTACION` en `data.ts`, y las tres lo nombran (precondición); `lib/xlsx.ts` contiene los cinco literales fijos de §D-5.1 tal cual (Enmienda 1, M-02); ningún comentario de lo nuevo o lo cambiado en 02b tiene las palabras de §D-0.6.

### Pruebas existentes que el programador puede cambiar (lista cerrada, por grep; cualquier otra es PARADA)
**02a** (grep de llamadas a lo que cambia de firma o de exportación, `leerGradebook(`, `GradebookDb`, `app\.get\(` en `backend/test`):
- `backend/test/calificaciones-lecturas-estatico.test.ts:85`: `expect(handler.match(/app\.get\(/g)?.length).toBe(2)` pasa a `toBe(3)`. Nada más del archivo.
- Ninguna otra: `leerGradebook`, `leerMisCalificaciones`, `GradebookDb` y los esquemas del gradebook no cambian; las pruebas que los llaman (`calificaciones-lecturas-consistentes.integracion`, `gradebook.integracion`, las `*.ataque` de 01b) siguen igual.

**02b** (grep de `ESPERADOS`, `correo`, `email`, `toBe(11)`, `toBe(15)`, `getAllByRole("button")` y `aria-busy` en las pruebas de `features/calificaciones` y de `styles/`):
- `frontend/src/features/calificaciones/estatico-01d.test.ts` (CAL-1D09):
  - líneas 29 a 41: `ESPERADOS` suma `"/src/features/calificaciones/components/exportar-a-excel.tsx"`; el título de la línea 57 dice "doce archivos" en lugar de "once".
  - línea 83 (Enmienda 1, M-01: la lista única de §D-5.2): la regla `["correo", /\bcorreo\b|\bemail\b/i]` se aplica al código de cada archivo **después de quitar** las declaraciones `export const filasDeLaHojaDeExportacion =` y `export const mismoAlumnoDeExportacion =` de `lib.ts` y `export const TEXTOS_EXPORTACION =` de `data.ts` (cada una hasta la siguiente declaración de nivel superior); se agrega una precondición de que las tres existen y nombran `email` (las dos de `lib.ts`) y "Correo" (`data.ts`).
  - línea 172: `expect(archivos.length).toBe(15)` pasa a `toBe(16)`.
- Ninguna otra: CAL-1D02 (`gradebook-01d.test.tsx:344`) y CAL-1D01 siguen en verde porque el botón está en espera mientras llega una ventana y cuelga de la raíz opaca; CAL-1D02v (sin botones en los vacíos) también.

## Puntos de ataque para el Tester

### Ronda 0 (cada subentrega; no cuenta en el tope de 3)
- 02a: C-1 y C-2 de §D-R0, antes del programador; recorrer las `*.ataque` del backend contra §D-0.6 y §D-2.
- 02b: C-3 y C-4 de §D-R0; recorrer las `*.ataque` del frontend contra §D-0.6, §D-5.1 y §D-7 (en especial las que cuentan botones en espera, avisos, `fetch(`, `_blank`, colores y valores arbitrarios en crudo).

### 02a
- Fuga: estado de pago o restricción por cualquier camino (alumno deudor y restringido, admin, comaestro, errores); un correo de alguien que no es alumno inscrito activo de esa clase (otra clase, dado de baja, desactivado, un maestro).
- Autorización: maestro retirado entre dos ventanas; clase inexistente; `claseId` en mayúsculas; `HEAD`.
- Ventanas: cursores de otra clase, de un usuario que no es alumno de la clase pero existe (el keyset de `nombre_busqueda` lo acepta, como el roster: comprobar que no devuelve a nadie de fuera), dos actividades con la misma fecha límite, `limite=100` exacto, `limite=100.5`.
- Cálculo: diferencias contra el gradebook y "Mis calificaciones" (categorías sin calificadas, pesos repartidos, sin categoría, tardías, calificada sin entrega).
- Instantánea y N+1: escrituras entre sentencias; conteo de sentencias; `P2028` → `503`.

### 02b
- El .xlsx: XML mal formado con nombres o títulos raros (`]]>`, `&`, controles, sustitutos sueltos, U+2028, U+202E, 120 caracteres, emojis); fórmulas (`=HYPERLINK(...)` como nombre); más de 26, 52 y 702 columnas; una sola fila; CRC; determinismo; abrirlo con el lector de prueba.
- Combinación: cada inconsistencia de §D-4 y combinaciones de ellas; ventanas que llegan en otro orden; el riesgo residual R-02 (documentarlo, no es hallazgo).
- Recorrido: cursores que no avanzan, más de 200 peticiones, abortos en cada etapa (antes del primer `fetch`, entre dos ventanas, después del último y antes de la descarga).
- Interfaz: doble clic, clic con la ventana pidiéndose, avisos repetidos, foco, la vista que se reemplaza con el botón enfocado, códigos que redirigen, frases de recuperación por cada camino (y cualquier otro que la interfaz permita), datos personales en la caché de mutaciones.
- Nombre del archivo: caracteres reservados, de control y de dirección, longitud, vacío, medianoche.

## Riesgos y desacuerdos
- **R-01. Compatibilidad del escritor propio (DH-01 a).** Excel es estricto con el paquete; un detalle mal escrito abre el diálogo de "reparar". Mitigación (Enmienda 1, M-02): §D-5.1 fija el texto literal de las cinco partes fijas, el esqueleto de la hoja y el contenedor ZIP; CAL2-B01 a B03 comparan byte a byte con esos literales y con un CRC independiente (`node:zlib`), no con un lector escrito por el mismo programador; el escape `_xHHHH_` está cubierto; y H-0 (DH-10) abre una muestra en Excel y en LibreOffice al terminar `lib/xlsx.ts`, con el punto de corte de DH-10 para pasar a DH-01 (b) antes de construir la vista. H-2 y H-3 lo repiten al final con un archivo real.
- **R-02. Coherencia entre ventanas** (solo clases de más de 100 alumnos o actividades): §D-4 rechaza lo que se ve (alumnos, actividades, totales, promedios); un cambio de estado sin calificación en una ventana ya recorrida no se detecta. Aceptable para el piloto; la alternativa sin este riesgo es DH-02 (b), con excepción a ESSENTIALS.
- **R-03. Descarga en el teléfono.** Safari en iOS trata distinto las descargas de un `Blob`; lo comprueba H-6. Si falla, se evalúa abrir el archivo en otra pestaña (cambio en `descargaService.ts`), en otra subentrega.
- **R-04. El botón espera a la ventana del gradebook.** "Exportar a Excel" queda en espera mientras el gradebook pide una ventana o recarga (§D-7). Es breve y evita exportar sobre una vista que cambia; es la condición para no reescribir CAL-T-149.
- **R-05. El archivo sale de la plataforma.** Lleva nombres, correos y calificaciones (P-13, decisión del humano). Fuera de la plataforma no hay control: así lo decidió el humano; el plan solo garantiza que no salga el estado de pago ni la restricción.
- **R-06. Desacuerdo de texto con ESSENTIALS (DH-01 a).** ESSENTIALS, "Capas del backend", dice que la librería del .xlsx "es una dependencia nueva del frontend, con confirmación del humano". Con (a) no hay librería: no se rompe ninguna regla, pero el texto queda inexacto. Propuesta: el texto de §"Documentos a actualizar". Decide el humano con DH-01.
- **R-07. Despliegue.** El frontend de 02b llama a una ruta que no existe en un backend anterior (`404` → "No pudimos preparar el archivo…"). Desplegar primero el backend (fila para DEPLOY en ESTADO §3). El gradebook no cambia de contrato, así que un frontend anterior sigue funcionando con el backend nuevo.
- **R-08. CAL-1D09 se afloja en tres declaraciones (Enmienda 1, M-01).** La regla "sin correo en el módulo" deja de valer para `filasDeLaHojaDeExportacion` y `mismoAlumnoDeExportacion` (`lib.ts`) y `TEXTOS_EXPORTACION` (`data.ts`), la lista única de §D-5.2; las vistas, los componentes, los ganchos, los tipos y el resto de `lib.ts` (incluida `combinarVentanasDeExportacion`) la siguen cumpliendo, y CAL2-B15 fija esos tres únicos lugares.
- **R-09. FORO-01.** Si el foro no reutiliza `tareas` y `entregas`, no entra en el gradebook ni en la exportación hasta que FORO-01 lo sume a `leerGradebookCon` (fila en ESTADO §3).
- **R-10. ADMIN-01 (P-08).** La exportación de una clase archivada depende de cómo ADMIN-01 resuelva la archivada en el sexto paso (DH-07; fila en ESTADO §3).

## Documentos a actualizar (texto con la opción recomendada de cada DH; si el humano elige otra, el arquitecto lo ajusta en una enmienda)

Los README del backend los escribe el programador en 02a (están dentro del paquete). Los demás los aplica el orquestador al cerrar la subentrega indicada, con su SHA-256 en `aprobacion.md`; el manager los verifica en la revisión final.

- **A-01 · `docs/ARCHITECTURE-ESSENTIALS.md`, "Capas del backend", viñeta de `adapters/` (al cerrar 02b).** Reemplaza "La exportación de calificaciones a .xlsx (CALIFICACIONES-02) no se escribe en el backend: la API devuelve JSON y el navegador arma el archivo (R-01 de DOCS-04, decisión del humano, 2026-10-26); su librería es una dependencia nueva del frontend, con confirmación del humano, y ningún servicio externo." por: "La exportación de calificaciones a .xlsx (CALIFICACIONES-02) no se escribe en el backend: la API devuelve JSON por ventanas y el navegador arma el archivo con un escritor propio (`frontend/src/lib/xlsx.ts`), sin dependencia nueva ni servicio externo (R-01 de DOCS-04 y DH-01 de CALIFICACIONES-02, decisiones del humano)."
- **A-02 · ESSENTIALS, "Reglas de negocio que tocan código", viñeta "Exportar calificaciones" (al cerrar 02a).** Agrega al final: "La ruta es `GET /clases/:claseId/calificaciones/exportacion` (maestros de la clase y admin): ventanas de hasta 100 alumnos y 100 actividades, cada una en una sola instantánea y con la misma lectura del gradebook (`leerGradebookCon`); el navegador las recorre y no arma el archivo si la clase cambió entre dos ventanas (CALIFICACIONES-02)."
- **A-03 · `docs/ARCHITECTURE.md` §7, fila `calificaciones` (al cerrar 02a).** Antes del cierre " (CALIFICACIONES-01) |" de la fila agrega: " · `GET /clases/{claseId}/calificaciones/exportacion?cursor=&limite=&cursorTareas=&limiteTareas=` (los maestros de la clase y el admin. La lectura del gradebook por ventanas de 1 a 100 alumnos y de 1 a 100 actividades, 100 por omisión, más el nombre de la clase, el correo de cada alumno y los totales de alumnos y actividades; sin resumen ni riesgo. Nunca trae el estado de pago, la restricción, el rol ni la `version`. El navegador recorre las ventanas y arma el .xlsx; CALIFICACIONES-02)".
- **A-04 · ARCHITECTURE §7, "Rutas previstas (DOCS-04)" (al cerrar 02a).** Quita la viñeta que empieza en "- **CALIFICACIONES-02:** una ruta de exportación" y termina en "con la regla de paginación." (ya está en la fila `calificaciones`). (Enmienda 1) En `docs/ARCHITECTURE.md:245` esa viñeta está pegada al párrafo "**Rutas previstas (DOCS-04), no implementadas.** …para pasar por el sexto paso." en la misma línea, sin salto: se quita solo desde "- **CALIFICACIONES-02:**" hasta "paginación." inclusive, y el párrafo queda intacto.
- **A-05 · ARCHITECTURE §11, punto 8 (al cerrar 02b).** "la API devuelve los datos en JSON y el navegador arma el .xlsx" pasa a "la API devuelve los datos en JSON por ventanas (`GET /clases/{claseId}/calificaciones/exportacion`) y el navegador arma el .xlsx con `frontend/src/lib/xlsx.ts`".
- **A-06 · ARCHITECTURE §14, fila "Exportación .xlsx" (al cerrar 02b).** "La librería del frontend es una dependencia nueva, con confirmación del humano, y la elige el plan de CALIFICACIONES-02." pasa a "El .xlsx lo arma un escritor propio del frontend (`lib/xlsx.ts`), sin dependencia nueva (DH-01 de CALIFICACIONES-02); la ruta pagina por ventanas de hasta 100 × 100 (DH-02)."
- **A-07 · ARCHITECTURE §20, D-30 (al cerrar 02b).** "la librería del frontend la elige el plan de CALIFICACIONES-02" pasa a "el .xlsx lo arma `frontend/src/lib/xlsx.ts`, sin dependencia nueva (DH-01 de CALIFICACIONES-02, decisión del humano)".
- **A-08 · `docs/DESIGN.md` §7.28 (al cerrar 02b).** Antes de la viñeta "- Nunca muestra estado de pago, restricción de acceso ni correos." agrega:
  "- **Exportar a Excel** (CALIFICACIONES-02, propuesta): `ExportarAExcel` (`components/exportar-a-excel.tsx`), un botón `outline` `sm` con el icono `FileSpreadsheet` y «Exportar a Excel», entre el resumen y los botones de las ventanas, solo con la tabla o el texto del cursor a la vista (nunca en los vacíos, en la carga ni con un error). Exporta toda la clase, no la ventana. Lleva `enEspera` mientras exporta y mientras el gradebook pide una ventana, y una guarda síncrona. Avisa con sonner, un aviso a la vez (`id` fijo): «Se descargó «<archivo>».» o el error, nunca con el texto del servidor; el foco se queda en el botón. El archivo, `Calificaciones - <clase> - AAAA-MM-DD.xlsx`, tiene una hoja «Calificaciones»: «Alumno», «Correo», una columna por actividad de la más antigua a la más reciente y «Promedio (%)»; debajo de los títulos, la categoría («Sin categoría») y los puntos; las tres primeras filas en negrita y las dos primeras columnas y tres primeras filas inmovilizadas. La calificación va como número; sin calificar, el estado en palabras («Asignado», «Entregado», «Entregado con retraso», «Sin entregar»); sin promedio, «—». Nunca el estado de pago ni la restricción (P-13)."
  Y la viñeta siguiente pasa a: "- Nunca muestra estado de pago, restricción de acceso ni correos (el correo solo va en el archivo exportado, P-13)."
  (Enmienda 1, N-03) Además, la viñeta "- **Panel:** el `h2` "Calificaciones" (`tabIndex={-1}`), el resumen, los botones de las ventanas y la tabla, en ese orden." pasa a: "- **Panel:** el `h2` "Calificaciones" (`tabIndex={-1}`), el resumen, «Exportar a Excel» (solo con la tabla o el texto del cursor a la vista), los botones de las ventanas y la tabla, en ese orden." (Enmienda 1, detalle menor) En la viñeta nueva de A-08, "Avisa con sonner…" suma los textos "No hay calificaciones que exportar: la clase no tiene alumnos o tareas." y "Esta clase tiene demasiadas calificaciones para exportarlas en un solo archivo." como los dos avisos sin promesa de reintento.
- **A-09 · `CLAUDE.md` (al cerrar 02b).** (Enmienda 1) El último punto, la excepción sobre el texto del servidor extendida a la exportación, cambia una regla de `CLAUDE.md`: se aplica solo si el humano aprueba DH-12 (a); con DH-12 (b), ese punto no se aplica y §D-7 cambia en una enmienda.
  - Tabla de módulos, fila `calificaciones`: después de "con el resumen de la clase y los alumnos en riesgo." agrega "«Exportar a Excel» del gradebook (CALIFICACIONES-02): recorre las ventanas de `GET …/calificaciones/exportacion` y arma el .xlsx en el navegador."
  - "Ubicaciones compartidas", después de la viñeta de `lib/errores-de-api.ts`: "- `lib/xlsx.ts` — `armarLibroXlsx` y `TIPO_MIME_XLSX`: arma en el navegador un .xlsx de una hoja (texto, números, negrita, anchos y paneles inmovilizados), sin dependencias; el texto nunca se escribe como fórmula y los caracteres que XML no admite se quitan (CALIFICACIONES-02). Su lector, `lib/lector-xlsx-de-prueba.ts`, solo lo importan pruebas".
  - "Ubicaciones compartidas", después de la viñeta de `services/almacenService.ts`: "- `services/descargaService.ts` — `descargarArchivo`: entrega al navegador un archivo armado en la página (URL de un `Blob` y un enlace con `download`), sin red (CALIFICACIONES-02)".
  - "Manejo de errores en el frontend", viñeta "Textos del servidor": "y `features/calificaciones`, cuyas consultas nunca muestran texto del servidor" pasa a "y `features/calificaciones`, cuyas consultas y cuya exportación nunca muestran texto del servidor".
- **A-10 · `docs/ESTADO.md` §3 (al cerrar 02a), filas nuevas:**
  - "P-08 en la exportación (CALIFICACIONES-02, DH-07): `GET /clases/:claseId/calificaciones/exportacion` es una lectura. Cuando ADMIN-01 resuelva la clase archivada en el sexto paso, la deja pasar a los maestros de la clase y al admin (solo lectura), con su prueba de autorización (los dos exportan una archivada; un alumno no), y «Exportar a Excel» llega con el gradebook de la archivada | **ADMIN-01** | `docs/trabajo/CALIFICACIONES-02-exportar-a-excel/plan.md`, DH-07 y R-10"
  - "El foro en la exportación (CALIFICACIONES-02, S-03): entra en el gradebook y en la exportación solo si sus calificaciones viven en `tareas` y `entregas`; si FORO-01 elige una tabla aparte, lo suma a `leerGradebookCon` y la exportación lo hereda, con una prueba de que un foro calificado sale como columna del archivo | **FORO-01** | ídem, S-03 y R-09"
  - "CALIFICACIONES-02 (R-07): desplegar primero el backend (ruta `…/calificaciones/exportacion`) y después el frontend; con un backend anterior, «Exportar a Excel» dice «No pudimos preparar el archivo de calificaciones…» | **DEPLOY** | ídem, R-07"
  - En la fila de N-52, al final de la columna de destino: "**CALIFICACIONES-02 tocó `gradebook-view.tsx` solo para «Exportar a Excel» y no la absorbió (DH-09, decisión del humano): sigue en el `chore`.**"
- **A-11 · README del backend (el programador, en 02a).**
  - `backend/src/handlers/README.md`, al final de la viñeta de `calificaciones.ts` (después de "…; nunca la versión, el correo, el estado de pago, la restricción ni el rol."; Enmienda 1: esa frase está partida entre las líneas 177 y 178, y el párrafo nuevo va después de la línea 178, que termina en "correo, el estado de pago, la restricción ni el rol."): "  CALIFICACIONES-02a suma `GET /clases/:claseId/calificaciones/exportacion`, con la misma cadena que el gradebook: una ventana de hasta 100 alumnos y 100 actividades (`exportacionQuerySchema`, 100 por omisión en las dos) con el nombre de la clase, el correo de cada alumno, sus celdas y su porcentaje, y los totales de alumnos y actividades (`exportacionDeCalificacionesRespuestaSchema`, estricto). Nunca el estado de pago, la restricción, el rol ni la versión (P-13). El navegador recorre las ventanas y arma el .xlsx; el servidor no escribe archivos ni encola nada (R-01)."
  - `backend/src/adapters/README.md`, sección nueva después de "El gradebook y "Mis calificaciones" en `db/calificaciones.ts`": "## La exportación en `db/exportacion-de-calificaciones.ts` (CALIFICACIONES-02a, §D-2)" con: "Solo lectura, en una instantánea única: el nombre de la clase (PK), la lectura del gradebook de la ventana (`leerGradebookCon` de `calificaciones.ts`, sin cambios: las mismas sentencias, cursores y agregados), el total de actividades (`COUNT` sobre `tareas(clase_id, fecha_limite)`) y los correos de los alumnos de la página (PK de `usuarios`, una consulta con `IN`). De 9 a 12 sentencias, sin SQL crudo y sin consultas dentro de ciclos. Es el único archivo de `adapters/db` que lee el correo para una respuesta de calificaciones: `calificaciones.ts` sigue sin nombrarlo. Ninguna sentencia selecciona el estado de pago, la restricción, el rol ni la versión."
- **Sin cambio:** `docs/PRD.md` (RF-65 ya dice lo que se construye), `AGENTS.md` (los comandos no cambian), `infra/`, `.env.example`.

## Pasos de implementación

### Antes de empezar (orquestador)
1. Registrar en `aprobacion.md` la decisión del humano en cada DH. Si alguna no es la (a): el arquitecto escribe una enmienda antes de la ronda 0. Si DH-01 no es (a): `npm view <paquete> version time license dependencies` (red, con el visto bueno del humano), versión exacta y fecha en `aprobacion.md` y la autorización escrita de la instalación (regla "Pide confirmación antes de agregar una dependencia").
2. Guardar una copia de `plan.md` en el scratchpad con su SHA-256 en `aprobacion.md` (regla de las enmiendas).

### 02a · shared y backend (base `ff09e69`)
1. **Tester, ronda 0:** C-1 y C-2 de §D-R0; recorre las `*.ataque` del backend contra §D-0.6 y §D-2 y reporta cualquier otra que rompería (PARADA del orquestador).
2. **Programador:** `shared/src/calificaciones.ts` e `index.ts` (§D-1); `npm run build` en `shared/`.
3. `export` delante de `const leerGradebookCon` en `adapters/db/calificaciones.ts`, nada más.
4. `adapters/db/exportacion-de-calificaciones.ts` (§D-2) y sus exportaciones en `adapters/db/index.ts`.
5. La ruta de §D-3 en `handlers/calificaciones.ts`.
6. La línea 85 de `calificaciones-lecturas-estatico.test.ts` (lista cerrada).
7. Las pruebas CAL2-A01 a CAL2-A10 en los cuatro archivos nuevos de "Pruebas requeridas".
8. A-11 (los dos README).
9. Verificaciones (abajo): `shared` build; `backend` lint, test y build; después `frontend` lint, test y build (shared cambió: las dos suites, una después de la otra, nunca a la vez).
10. Resumen verificable (`AGENTS.md`): cada CAL2-A con su archivo y título; conteos de `npx vitest list`; comando y última línea de lint, test y build; los hermanos si corrige un hallazgo. Sin matriz de avisos (02a no tiene interfaz).
11. Manager verifica el resumen → tester rondas → manager final → commit del humano `<K2a>` → el orquestador aplica A-02, A-03, A-04 y A-10.

### 02b · frontend (base `<K2a>`)
1. **Tester, ronda 0:** C-3 y C-4 de §D-R0; recorre las `*.ataque` del frontend contra §D-0.6, §D-5.1 y §D-7.
2. **Programador:** `lib/xlsx.ts` y `lib/lector-xlsx-de-prueba.ts`, con CAL2-B01 a B03 y CAL2-B17; corre `npx vitest run src/lib/` y entrega un resumen parcial con la ruta de la muestra.
   **(Enmienda 1, DH-10) PARADA de control H-0:** el programador se detiene aquí. El orquestador le da al humano la ruta de `cmep-calificaciones-muestra.xlsx` y le pide abrirla en Excel y en LibreOffice Calc (unos 2 minutos): sin aviso de reparar ni error, con los acentos, la ñ y el emoji, "=SUMA(1;2)" y "Tarea_x0041_" como texto, los números como números, las 30 columnas, la negrita y el inmovilizado. Si abre limpia en los dos, el programador sigue con el paso 3. Si no, se aplica el punto de corte de DH-10 (una corrección; después, DH-01 (b)).
3. `services/descargaService.ts`, con CAL2-B16.
4. `types.ts`, `data.ts` y `lib.ts` del módulo (§D-4 a §D-8), con CAL2-B04 a B07.
5. `useExportarCalificaciones` en `hooks.ts`.
6. `components/exportar-a-excel.tsx` y su inserción en `gradebook-view.tsx`.
7. `estatico-01d.test.ts` (lista cerrada) y CAL2-B15.
8. CAL2-B08 a B12 y B14; CAL2-B13 con el router real.
9. Verificaciones: `frontend` lint, test y build (02b no toca `shared/`; si lo tocara, también el backend).
10. Resumen verificable con, **desde el primero**, la matriz de avisos, recargas y foco de §D-7 contrastada con el código ("en vuelo a la vez" y "con la vista desmontada").
11. Manager verifica → tester rondas → manager final (verifica A-08 de `DESIGN.md`) → commit del humano `<K2b>` → el orquestador aplica A-01, A-05, A-06, A-07, A-08, A-09 y el cierre de ESTADO (sección 1, 2 y 2b punto 3) → comprobación humana.

### PARADAS (el agente se detiene y pregunta; resolverlo por su cuenta es una desviación)
- Se rompe una prueba normal fuera de la lista cerrada, o una `*.ataque` fuera de C-1 a C-4.
- Cumplir el plan exige tocar algo de "No se toca": `middleware/`, `core/`, `adapters/db/calificaciones.ts` más allá de `export`, el contrato del gradebook, `prisma/`, `infra/`, `app/`, `components/`, `services/apiClient.ts`, `lib/errores-de-api*.ts`, `lib/estado-de-entrega.ts`, un `package.json` o la configuración de Vite o Vitest.
- Hace falta una dependencia nueva (con DH-01 a) o un código de error nuevo.
- `leerGradebookCon` no se puede llamar tal cual desde el adaptador nuevo (por ejemplo, por el tipo de su `tx`).
- `DOMParser` de jsdom no marca `parsererror` con XML mal formado (las pruebas de CAL2-B01 y B02 cambian de método).
- jsdom o el `fetch` sustituido no propagan el `signal` abortado (CAL2-B12).
- Una prueba nueva del módulo no puede fijar el reloj sin romper el `Toaster` o el router (CAL-T-191).
- (Enmienda 1) `crc32` de `node:zlib`, `node:fs` o `node:os` no se pueden importar en las pruebas del frontend (jsdom o `tsc -b`), o la salida de `armarLibroXlsx` no puede ser igual a los literales de §D-5.1 sin cambiarlos (un literal del plan está mal: lo corrige el arquitecto, no el programador).
- (Enmienda 1) El control H-0 del paso 2 de 02b: el programador no sigue hasta que el orquestador le diga el resultado.

### Verificaciones (en el resumen del programador, con el comando y la última línea de salida)
- `shared/`: `npm run build`.
- `backend/` (02a; Docker Desktop encendido): `npm run lint`, `npm run test`, `npm run build`; conteos con `npx vitest list` (archivos contados con `grep -a`).
- `frontend/` (02a y 02b): `npm run lint`, `npm run test`, `npm run build`; conteos con `npx vitest list`.
- Una suite cada vez; nunca dos a la vez (`AGENTS.md`, "Pruebas").
- Lo que no se pudo verificar se dice; ningún agente abre un navegador ni Excel: la compatibilidad del archivo es de la comprobación humana.

### No se toca (base: `ff09e69` fuera de los paquetes; dentro, la de la subentrega)
- **Fuera de los paquetes:** `AGENTS.md`, `CLAUDE.md` (salvo A-09 del orquestador al cerrar 02b), `docs/` (salvo esta carpeta, `docs/ESTADO.md` y los A-n del orquestador), `.claude/`, `infra/`, `.github/`, `package.json`, `package-lock.json`, `eslint.config.mjs` y `.prettierignore` de la raíz.
- **02a:** todo `frontend/`; en `backend/`: `src/middleware/`, `src/core/`, `src/workers/`, `src/config/`, `src/app.ts`, `prisma/`, `src/adapters/` salvo `db/calificaciones.ts` (solo `export`), `db/index.ts`, `db/exportacion-de-calificaciones.ts` (nuevo) y `README.md`; `src/handlers/` salvo `calificaciones.ts` y `README.md`; `package.json`, `vitest.config.ts` y `tsconfig*.json`; `test/` salvo la línea 85 de `calificaciones-lecturas-estatico.test.ts` y los cuatro archivos nuevos (las `*.ataque` de C-1 y C-2 las cambia solo el tester); en `shared/`, todo salvo `src/calificaciones.ts` e `src/index.ts`.
- **02b:** todo `backend/` y `shared/`; en `frontend/`: `src/app/`, `src/components/` (incluidos `ui/`, `foco/`, `seccion/` y `clase/`), `src/styles/`, `src/services/` salvo `descargaService.ts` (nuevo), `src/lib/` salvo `xlsx.ts` y `lector-xlsx-de-prueba.ts` (nuevos), en `src/features/calificaciones/` los archivos `mis-calificaciones-view.tsx` y `components/{resumen-del-gradebook,navegacion-del-gradebook,tabla-del-gradebook,lista-de-mis-calificaciones,calculo-de-calificacion}.tsx`, todos los demás módulos de `features/`, `package.json`, `package-lock.json`, `vite.config.ts`, `vitest.config.ts`, `tsconfig*.json`, `index.html`; en pruebas, solo `estatico-01d.test.ts` (lista cerrada) y los archivos nuevos (las `*.ataque` de C-3 y C-4 las cambia solo el tester).

### Comprobación humana en navegador (al final de 02b; máximo 10 minutos y 7 puntos; solo lo que las pruebas no ven; ningún agente abre navegadores ni Excel)
(Enmienda 1, DH-10) Antes, a mitad de 02b, el control **H-0** (la muestra de `lib/xlsx.ts` en Excel y LibreOffice, unos 2 minutos; paso 2 de 02b). No cuenta en los 7 puntos de abajo, que se hacen al final con un archivo real y siguen dentro de los 10 minutos.
Preparación: una clase con al menos dos alumnos (uno con acento o ñ en el nombre), dos categorías, una tarea sin categoría, una calificada con retraso, una entregada sin calificar y una vencida sin entregar.
- **H-1.** Como maestro, "Exportar a Excel" en Calificaciones: el botón muestra la espera, el archivo se descarga con el nombre `Calificaciones - <clase> - <fecha de hoy>.xlsx` y aparece "Se descargó «…»."
- **H-2.** Abrirlo en Excel (escritorio o web): abre sin el aviso de "reparar"; acentos y ñ bien; al seleccionar las calificaciones de una actividad, la barra de estado muestra su suma (son números).
- **H-3.** Abrir el mismo archivo en LibreOffice Calc, Numbers o Google Sheets (importar): abre sin error.
- **H-4.** El contenido: las tres filas de encabezado en negrita y fijas al desplazar hacia abajo, las dos primeras columnas fijas al desplazar a la derecha, las actividades de la más antigua a la más reciente, la categoría ("Sin categoría" en la que no tiene) y los puntos, los estados en palabras y el promedio igual al del gradebook en dos alumnos; no hay columna de estado de pago ni de restricción.
- **H-5.** Como administrador, lo mismo desde `/admin/clases/<id>/calificaciones`, con una clase cuyo nombre lleve `/` o `:` (en el nombre del archivo pasan a espacio).
- **H-6.** En el teléfono (Safari en iOS o Chrome en Android), como maestro: el archivo se descarga o se ofrece para abrir, y abre.
- **H-7.** Con un lector de pantalla (NVDA o VoiceOver): el botón se anuncia "Exportar a Excel", ocupado mientras exporta, y el aviso de éxito se lee.

## Enmienda 1

Fecha: 2026-11-03. Responde a `revision.md`, "Revisión del plan — CALIFICACIONES-02" (CAMBIOS REQUERIDOS: M-01 a M-03; N-01 a N-04; detalles menores). Plan base: SHA-256 `e635609a35a7a2df983c5b915c1070cc2c351bca3897da0b9617ba2deb6fad8e`. Todos los cambios son ediciones en su lugar, marcadas "Enmienda 1"; nada más del plan cambia. DH-01 (a) sigue siendo la recomendación.

| Id | Hallazgo | Dónde cambia el plan | Qué cambia |
|---|---|---|---|
| E1-1 | M-01 | §D-4 regla 4; §D-5.2 (viñeta "Lista única"); "Cambios por capa" (`lib.ts`); CAL2-B04; CAL2-B15; lista cerrada, `estatico-01d.test.ts:83`; R-08 | Una sola lista de declaraciones que nombran el correo: `filasDeLaHojaDeExportacion` y `mismoAlumnoDeExportacion` (nueva, la usa `combinarVentanasDeExportacion`) en `lib.ts`, y `TEXTOS_EXPORTACION` en `data.ts`. La misma en los siete lugares |
| E1-2 | M-02 | §D-5.1 ("Celdas", "Texto", "Lanza" y los bloques nuevos "Literales" y "Contenedor ZIP"); CAL2-B01 a B03; "Cambios por capa" (`lector-xlsx-de-prueba.ts`); R-01; CAL2-B15 | El XML literal de las cinco partes fijas, el esqueleto literal de `sheet1.xml` (`sheetViews` → `cols` → `sheetData`, `pane` completo con `activePane="bottomRight"` y `state="frozen"`, y su `selection`), las formas literales de las celdas y los valores literales del contenedor ZIP; el escape `_xHHHH_` → `_x005F_xHHHH_` y la decisión de quitar (no codificar) los caracteres de control; CAL2-B01 a B03 comparan byte a byte con esos literales y con `crc32` de `node:zlib`, sin el lector propio |
| E1-3 | M-02 (propuesta del manager) | DH-10 nueva; CAL2-B17 nueva (`lib/xlsx-muestra.test.ts`); paso 2 de 02b con la PARADA de control H-0; PARADAS; comprobación humana | Un .xlsx de muestra al terminar `lib/xlsx.ts`, que el humano abre en Excel y LibreOffice antes de seguir; punto de corte: una corrección y, si sigue sin abrir limpio, DH-01 (b) |
| E1-4 | M-03 (camino que faltaba) | CAL2-B13, caminos 5 y 6 | "Otra ventana del gradebook" (alumnos y tareas, de ida y de regreso) y las dos frases seguidas en la misma sesión; nota de que la interfaz no ofrece otros caminos |
| E1-5 | M-03 (tope de 200) | §D-4 (recorrido); §D-7 (manejador y matriz); §D-8 (`demasiado`); DH-06; "Cambios por capa" (`ventanasDeLaExportacion`, `ResultadoDeLaExportacion`); CAL2-B04; CAL2-B10 | El caso es alcanzable en teoría (no hay tope de tareas por clase), así que tiene texto propio sin "Inténtalo de nuevo": "Esta clase tiene demasiadas calificaciones para exportarlas en un solo archivo." Se decide con los totales de la primera respuesta, sin recorrer, y se mantiene la guarda de 200 peticiones durante el recorrido |
| E1-6 | N-01 | Matriz de §D-7 (fila nueva en "En vuelo a la vez"); CAL2-B12 | La recarga del gradebook que reemplaza la vista (`403`) o la deja en un vacío durante la exportación: se aborta sin aviso ni descarga, y el foco va a la raíz |
| E1-7 | N-02 | "Acceso a datos" (párrafo "Tamaño de la respuesta"); DH-11 nueva | Cifras: ~1 MB por ventana de 100 × 100, ~0.25 MB el máximo del gradebook, ~115 KB una clase del piloto; el techo es decisión del humano (100 × 100 recomendado, o el del gradebook) |
| E1-8 | N-03 | A-08 | También reescribe la viñeta "Panel" de `DESIGN.md` §7.28 con «Exportar a Excel» en su lugar |
| E1-9 | N-04 | §D-0.6; §D-6 (punto 4); §D-R0; CAL2-B06 | O-05 de `features/clases/errores-ch3-r1.ataque.test.ts:418` y CAL-T-185 no rompen si se cumple §D-0.6: sin `new RegExp(`, `\p{L}`, `.split(":")`, `.indexOf(":")` ni `/^…:` en `features/calificaciones/`, y emojis solo con escapes `\u{…}` en las pruebas |
| E1-10 | Detalle menor (terminología) | DH-06; §D-8 | "tareas" en el aviso del vacío, como los textos del gradebook |
| E1-11 | Detalle menor (celda calificada sin calificación) | §D-5.2; CAL2-B05; matriz de §D-7 | Lanza dentro de la mutación (aviso genérico), sin valor por defecto para `calificacion` |
| E1-12 | Detalles menores (anclas) | A-04; A-11 | A-04 quita solo desde "- **CALIFICACIONES-02:**" hasta "paginación." en la línea 245, sin tocar el párrafo; A-11 ubica el ancla partida en las líneas 177 y 178 del README de `handlers/` |
| E1-13 | `revision.md`, "Documentos a actualizar" y "Para el humano" 6 | DH-12 nueva; A-09 | La extensión de la excepción de `CLAUDE.md` a la exportación queda como decisión explícita del humano; A-09 solo aplica ese punto con DH-12 (a) |
| E1-14 | Coherencia | Estado; DH-06 (fila del tope) | "LISTO (Enmienda 1 aplicada)"; DH-01 a DH-12 |

**Decisiones para el humano tras la Enmienda 1:** DH-01 a DH-09 (sin cambio de recomendación) y las nuevas DH-10 (control H-0 adelantado), DH-11 (techo de la ventana) y DH-12 (excepción de `CLAUDE.md`). R-02 (aceptar el riesgo residual entre ventanas) y R-06 (el texto de ESSENTIALS, A-01) siguen en "Riesgos y desacuerdos".
