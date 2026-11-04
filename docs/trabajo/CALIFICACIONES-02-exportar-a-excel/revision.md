# Revisión del Manager — CALIFICACIONES-02 · exportar a Excel — plan

## Revisión del plan — CALIFICACIONES-02

Veredicto: **CAMBIOS REQUERIDOS** (vuelve al Arquitecto para una enmienda corta: M-01 a M-03)
Plan revisado: `plan.md`, 622 líneas, SHA-256 `e635609a35a7a2df983c5b915c1070cc2c351bca3897da0b9617ba2deb6fad8e` (coincide con `aprobacion.md`).
Verificación propia: modo plan, sin suites por instrucción del orquestador (solo lectura del código y de las pruebas). Repetí el grep de la lista cerrada y de §D-R0 (detalle abajo).
Carril: **normal, confirmado.** No toca `middleware/`, `adapters/auth`, sesiones, contraseñas, migraciones ni `infra/`, y no cambia el estado de pago ni la restricción; solo garantiza que no salgan (P-13), con esquema estricto y pruebas de fuga, como el gradebook.

### Lo que el plan hace bien (comprobado contra el código)
- **R-01, P-08 y P-13 se respetan.** El navegador arma el archivo desde el JSON; no hay cola, almacén ni archivo en Node. P-08 se difiere con razón (DH-07, abajo). P-13 queda por construcción: `z.strictObject` en las cuatro piezas de la respuesta, `select` explícito `{ id, email }` en el adaptador nuevo, CAL2-A02/A08/A09 y CAL2-B09.
- **DH-02 (a) es sano.** La cadena es la del gradebook (`protegido({ roles: ["maestro", "admin"], pertenencia: "propiedad" })`); la tabla de "Autorización" cubre rol incorrecto, clase ajena o inexistente, maestro retirado, alumno restringido (paso 4), cambio de contraseña, `401` y `claseId` inválido, con `GET` y `HEAD`. `leerGradebookCon` (`adapters/db/calificaciones.ts:220`) se puede reutilizar tal cual: recibe `Prisma.TransactionClient`, no usa `Promise.all` y sus sentencias no dependen del tamaño. Comprobé que las poblaciones cuadran, de lo que depende la regla 6 de §D-4 aun con una sola respuesta: la página de alumnos (`SOLO_CUENTAS_ACTIVAS = { usuario: { activo: true } }`, `inscripciones.ts:59`) y `totalAlumnos` (`inscripcion.count({ where: { claseId, usuario: { activo: true } } })`) filtran igual, y la ventana de tareas (`where: { claseId, ...keyset }`) y el `tarea.count({ where: { claseId } })` nuevo también. Índices: todos existen (PK de `clases` y de `usuarios`, `tareas(clase_id, fecha_limite)`, el único de `entregas`). Sin N+1 y sin SQL crudo nuevo.
- **La detección de "la clase cambió"** (§D-4, reglas 1 a 6 más el cursor repetido) es razonable; el riesgo residual R-02 (un cambio de estado sin calificación en una ventana ya recorrida, solo con más de 100 alumnos o actividades) está declarado y es del humano aceptarlo.
- **CAL-T-68 y CAL-T-69 siguen en pie.** El correo vive en un archivo aparte. La ruta nueva no contiene `inscripcion`, `maestros`, `request.query.<x>` ni `try {`, y `protegido({...})` se quita antes de comparar.
- **§D-R0 (C-1 a C-4) es correcto.** Lo comprobé en `sesiones-y-cadena.ataque.test.ts:544-629`, `lecturas-fx-r1.ataque.test.ts:758-823` (lista `usos` con `calificaciones.ts:2`; la del archivo nuevo entra como `:1`), `estatico-01d-r1.ataque.test.ts:47` (`toBe(11)`) y `styles/clases-r1.ataque.test.ts:170-177` (`toHaveLength(71)` y `fijos`).
- **La lista cerrada coincide con mi grep.** Backend: solo `calificaciones-lecturas-estatico.test.ts:85` (`app\.get\(` de 2 a 3). La extracción de `export const leerGradebook =` en CAL-1B08 no confunde `leerGradebookCon`, porque exige ` =` después del nombre, y el texto de los comentarios de `handlers/calificaciones.ts` y `adapters/db/index.ts` ya está cubierto por §D-0.6. Frontend: solo `estatico-01d.test.ts` (líneas 29-41, 57, 83 y 172). CAL-1D01, CAL-1D02, CAL-1D02v y CAL-T-149 siguen en verde con `enEspera={exportar.isPending || pidiendoLaVentana}` y el botón dentro de `cuerpo(...)` (`gradebook-view.tsx:146-174`).
- **La regla de `shared/` se cumple en 02a:** backend y frontend, una suite después de otra. Los ids `CAL2-` llevan el prefijo del encargo, y el `VALIDACION` fuera de contrato está inventariado (CAL2-B07 y B11).
- **DH-07 (a) es correcto.** Hoy no hay clase archivada (`clases.activa` sin uso); la ruta es una lectura `GET` y ADMIN-01 resolverá la archivada en el sexto paso. La fila de A-10 con destino ADMIN-01, con su prueba de autorización, es lo que hace falta. Adelantar algo ahora sería construir sobre una columna que no existe.

## Problemas que bloquean

### M-01 — El correo tiene que compararse en `combinarVentanasDeExportacion`, pero el plan solo lo permite en `filasDeLaHojaDeExportacion`
Dónde: §D-4 regla 4 ("…con el mismo nombre, correo y porcentaje; si no, `cambio`") y CAL2-B04 ("otro nombre, correo o porcentaje en la segunda ventana" da `cambio`), contra §D-5.2 ("Es la **única** función de `lib.ts` que nombra `email`"), la enmienda de CAL-1D09 en la lista cerrada (`estatico-01d.test.ts:83`: solo se quitan `filasDeLaHojaDeExportacion` y `TEXTOS_EXPORTACION`) y CAL2-B15 ("en el módulo, `email` solo en `filasDeLaHojaDeExportacion`").
Por qué importa: el plan se contradice. Si el programador cumple la regla 4, CAL-1D09 y CAL2-B15 quedan en rojo, y la salida es una PARADA o una comparación torcida que esconda el nombre del campo (por ejemplo, `JSON.stringify(alumno)`).
Qué se espera: que el plan diga en qué declaraciones de `lib.ts` se nombra `email` (por ejemplo, `filasDeLaHojaDeExportacion` y `combinarVentanasDeExportacion`, o una sola función `mismoAlumno` que use las dos) y que §D-5.2, la enmienda de la línea 83 de `estatico-01d.test.ts` y CAL2-B15 digan exactamente esa misma lista.

### M-02 — Con DH-01 (a), el plan tiene que fijar literalmente el XML fijo del paquete; hoy el programador tendría que adivinar el formato que Excel exige
Dónde: §D-5.1 (describe las partes en prosa), CAL2-B01 a B03, R-01 y H-2/H-3.
Por qué importa: el riesgo principal de DH-01 (a) es el diálogo "reparar" de Excel, y con el plan tal cual solo se detecta en la comprobación humana, al final de 02b, después de tres rondas posibles del tester. Además, las pruebas leen el archivo con un lector escrito por el mismo programador (`lib/lector-xlsx-de-prueba.ts`): un error de concepto compartido entre el escritor y el lector pasa en verde. Excel es estricto con lo que la prosa no fija: el orden de los hijos de `<worksheet>` (`sheetViews`, luego `cols`, luego `sheetData`), los espacios de nombres (`xmlns` principal y `xmlns:r`) y los atributos obligatorios de `xf` y `pane`. Y hay un caso que el plan no cubre: OOXML interpreta `_xHHHH_` dentro del texto como un carácter escapado (un título "Tarea_x0041_" se ve "TareaA"); el `_x` literal se escribe `_x005F_x…`. El rol del manager es comprobar que los pasos son lo bastante pequeños para que el programador no adivine; aquí no lo son.
Qué se espera:
1. El contenido literal de las cinco partes fijas (`[Content_Types].xml`, `_rels/.rels`, `xl/workbook.xml`, `xl/_rels/workbook.xml.rels`, `xl/styles.xml`) y el esqueleto de `sheet1.xml` con el orden de sus elementos y el `pane` completo (`xSplit`, `ySplit`, `topLeftCell`, `activePane="bottomRight"`, `state="frozen"`).
2. CAL2-B01 compara esas partes byte a byte con los literales del plan, no solo con "XML bien formado".
3. CAL2-B02 suma el escape de `_xHHHH_` (un texto con `_x0041_` sale igual al leerlo y en el XML va como `_x005F_x0041_`).

Si el humano elige DH-01 (b), (c) o (e), este punto no aplica: lo sustituye la autorización de la dependencia.

### M-03 — Frases de recuperación: falta el camino "otra ventana del gradebook" y hay un camino que no puede cumplir "Inténtalo de nuevo"
Dónde: CAL2-B13 (cuatro caminos) y §D-4/§D-8 (`MAXIMO_DE_PETICIONES_DE_EXPORTACION` da el genérico "…Inténtalo de nuevo.").
Por qué importa: es la regla del humano del 2026-10-26 en `AGENTS.md`: "además, cada camino que la interfaz permita (…, otra ventana)". En el gradebook, la persona puede moverse de ventana ("Alumnos siguientes", "Tareas más antiguas") entre el fallo y el reintento, y el plan no lo inventaría. La misma regla dice que, si un camino no puede cumplir la promesa, el plan cambia el texto o el remedio y no lo deja como observación. Con más de 200 peticiones, "Inténtalo de nuevo" vuelve a fallar siempre.
Qué se espera:
1. CAL2-B13 suma, para las dos frases, el camino "cambiar de ventana del gradebook y pulsar «Exportar a Excel»": el intento pide desde la primera ventana de la exportación, sin cursores, aunque el gradebook esté en otra.
2. Para el tope de peticiones: un texto propio, sin la promesa de reintento, en `MENSAJES_ERROR_EXPORTACION` y en CAL2-B10, o el argumento explícito en el plan de que el caso es inalcanzable (con el cálculo) y por eso conserva el genérico. Decide el arquitecto; lo que no vale es dejarlo implícito.

## Problemas que no bloquean (inclúyanse en la misma enmienda)
- **N-01 — Falta un estado vecino en la matriz de §D-7.** Una recarga del gradebook que **reemplaza la vista** (`403`) o la deja en un **vacío** (la clase se quedó sin alumnos o sin tareas) mientras se exporta desmonta `ExportarAExcel`. Por DH-08, la exportación se aborta sin aviso ni descarga, y el foco va a la raíz por `useFocoAlPerderseElControl`. Es coherente, pero no está en la matriz ni tiene un caso. Que se sume una fila a "En vuelo a la vez" y un caso en CAL2-B12 o B14.
- **N-02 — Tamaño de la respuesta.** Una ventana de 100 × 100 son hasta 10,000 celdas, cerca de 1 MB de JSON por respuesta, con el `parse` estricto en los dos lados: cuatro veces el máximo del gradebook (50 × 50). Cumple la letra de "máx. 100" por dimensión y una clase real del piloto (unos 30 × 40) queda lejos. Que el plan lo diga en "Acceso a datos" con la cifra. Si el humano prefiere el mismo techo que el gradebook, 50 × 100 o 50 × 50 solo cambia `LIMITE_DE_LA_EXPORTACION` y los conteos de CAL2-A05.
- **N-03 — DESIGN §7.28, viñeta "Panel".** Hoy dice "el `h2`, el resumen, los botones de las ventanas y la tabla, en ese orden". A-08 agrega «Exportar a Excel» entre el resumen y las ventanas, pero no corrige esa viñeta, y quedarían dos frases que se contradicen. A-08 debe reescribirla también.
- **N-04 — Ronda 0 de 02b: dos `*.ataque` que el plan no nombra en su verificación.**
  - `features/clases/errores-ch3-r1.ataque.test.ts:418-447` (O-05) recorre `features/calificaciones/` y prohíbe `new RegExp(`, `\p{L}`, `.split(":")`, `.indexOf(":")` y las formas `/^[…]+:`. Tienen que respetarlas el limpiador del nombre del archivo (§D-6) y cualquier expresión nueva de `lib.ts`.
  - CAL-T-185 (`estatico-01d-r1.ataque.test.ts:63-67`) prohíbe emojis literales en **todas** las pruebas de la carpeta del módulo. CAL2-B06 ("sin partir un emoji del borde") debe escribirlos con escapes `\u{…}`.

  Que §D-0.6 los diga.

## Detalles menores
- Terminología: el texto del vacío de la exportación dice "actividades", y los textos del gradebook dicen "tareas" ("Aún no hay tareas en esta clase.", "Tareas más antiguas"). Uno de los dos, el mismo en la vista y en el aviso.
- §D-5.2: una celda `calificado` sin `calificacion` (inalcanzable por los CHECK) caería en `TEXTOS_ESTADO_DE_ENTREGA.calificado`, "Calificado", en silencio. CLAUDE.md pide no poner valores por defecto a `calificacion`: que sea un error explícito, como `errorDatoMalFormado` en el backend, o que el plan diga por qué basta el contrato.
- A-04: en `docs/ARCHITECTURE.md:245`, la "viñeta" de CALIFICACIONES-02 está pegada al párrafo "Rutas previstas…" en la misma línea, sin salto. El reemplazo literal funciona igual; el orquestador debe quitar solo desde "- **CALIFICACIONES-02:**" hasta "paginación.", sin tocar el párrafo.
- A-11: el ancla del README de `handlers/` ("…; nunca la versión, el correo, …") está partida en dos líneas (`handlers/README.md:177-178`). No cambia el texto que se agrega.
- `lib/lector-xlsx-de-prueba.ts` no es `*.test.ts`, así que entra en el `tsc -b` de producción y en los recorridos estáticos de `src/` (como `errores-de-api-fuera-de-contrato.ts`). Está bien; solo que no use `.message`, `fetch(` ni emojis literales.

## Desacuerdos arbitrados
Ninguno entre agentes. R-06 (ESSENTIALS dice "su librería es una dependencia nueva del frontend, con confirmación del humano") no es una contradicción que resuelva yo: con DH-01 (a) no hay librería, y apartarse del texto de ESSENTIALS es decisión del humano. Va en "Para el humano".

## Documentos a actualizar
A-01 a A-11 están bien dirigidos y sus anclas existen. Verifiqué las de ESSENTIALS:32 y :129, ARCHITECTURE:236 (fila `calificaciones`, cierre " (CALIFICACIONES-01) |"), :245, :330, :435 y :594, DESIGN §7.28, las de CLAUDE.md, ESTADO:387 (N-52) y las de los dos README. Cambios: A-08 suma la corrección de la viñeta "Panel" (N-03). A-09 extiende a una **acción** la excepción de CLAUDE.md sobre el texto del servidor, que hoy cubre solo las consultas de `features/calificaciones`; es razonable (una lectura sin campos, cuyos mensajes del servidor serían de forma de zod), pero cambia una regla de CLAUDE.md y la aprueba el humano con el plan.

## Para el humano
1. **DH-01:** recomiendo **(a), escritor propio**, con M-02 aplicado. Una dependencia nueva exige justificar por qué no basta con lo que hay, y aquí sí basta: unas 200 líneas de un formato estable, sin cadena de suministro y con control del caso de las fórmulas. "No sobreconstruyas" habla del alcance funcional, y escribir el formato no agrega funciones que nadie pidió. A cambio, el riesgo se concentra en la compatibilidad con Excel. Le propongo una opción para bajarlo: que, al terminar `lib/xlsx.ts` en 02b, una prueba deje un .xlsx de muestra en la carpeta temporal y usted lo abra en Excel y en LibreOffice (H-2 y H-3 adelantados, unos 2 minutos) antes de que el programador siga con la vista. Si no abre limpio, se cambia a (b) en ese momento y no al final.
2. **R-06:** si elige (a), aprueba también cambiar el texto de ESSENTIALS (A-01).
3. **R-02:** aceptar el riesgo residual entre ventanas (solo clases con más de 100 alumnos o actividades), o pedir DH-02 (b), que es una excepción a "toda lista se pagina".
4. **N-02:** 100 × 100 (recomendado por el plan, unos 1 MB por respuesta) o el mismo techo que el gradebook.
5. **DH-03 a DH-09:** las recomendaciones (a) del arquitecto me parecen correctas. En DH-04, el archivo ordena las actividades de la más antigua a la más reciente, al revés del gradebook; es una decisión de lectura y le corresponde a usted.
6. **A-09:** la excepción de CLAUDE.md sobre el texto del servidor se extiende a la exportación.

## Verificación de la Enmienda 1 — CALIFICACIONES-02

Veredicto: **APROBADO.** El plan puede ir al humano. M-01 a M-03 y N-01 a N-04 quedaron resueltos; no hay problemas que bloqueen.

**Hashes, reproducidos con `sha256sum`:**
- Copia previa, `copias-plan/plan-calificaciones02-v1-e635609a.md`: `e635609a35a7a2df983c5b915c1070cc2c351bca3897da0b9617ba2deb6fad8e`. Es el plan que revisé.
- `plan.md` nuevo: `a25ccc638bea591b23cab7ff89e12e72c4a773f1d1d8bbf5265755ad4f2d09db`, 718 líneas. `cmp` con `copias-plan/plan-calificaciones02-v2-enmienda1-a25ccc63.md` da igual.

Los dos hashes coinciden con `aprobacion.md`.

Verificación propia: modo plan, sin suites. Hice `git diff --no-index -U0` completo entre la copia v1 y `plan.md` (38 hunks) y revisé contra el código las piezas que la enmienda nombra.

### Hunks contra E1-1 a E1-14
Todos los hunks caen en algún E1; ninguno queda sin mapear y nada cambia fuera de lo declarado.

| Hunk (v1 → v2) | E1 |
|---|---|
| -2 (Estado) | E1-14 |
| -83 (DH-06: "tareas" y la fila del tope) | E1-10, E1-5 |
| -101,0 +103,9 (DH-10, DH-11 y DH-12 nuevas) | E1-3, E1-7, E1-13 |
| -139,0 +150 (§D-0.6, O-05 y emojis) | E1-9 |
| -235 y -238 (recorrido: `demasiado`) | E1-5 |
| -242 (regla 4: `mismoAlumnoDeExportacion`) | E1-1 |
| -270,3 (Celdas, Texto y Lanza) | E1-2 |
| -274,0 +286,42 (literales XML y contenedor ZIP) | E1-2 |
| -281 (celda mal formada y lista única del correo) | E1-11, E1-1 |
| -290,0 (§D-6, punto 4) | E1-9 |
| -301 y -308 (manejador y gancho: `demasiado`) | E1-5 |
| -321,2 (matriz de §D-7: celda mal formada, tope y fila nueva) | E1-11, E1-5, E1-6 |
| -343 (§D-8: `vacio` y `demasiado`) | E1-10, E1-5 |
| -359 (§D-R0) | E1-9 |
| -392 (lector y `xlsx-muestra.test.ts`) | E1-2, E1-3 |
| -394 y -396 (`types.ts` y `lib.ts`) | E1-5, E1-1 |
| -415,0 (tamaño de la respuesta) | E1-7 |
| -456,4 (CAL2-B01 a B03 y B17) | E1-2, E1-3 |
| -465,3 (CAL2-B04 a B06) | E1-1, E1-5, E1-11, E1-9 |
| -473 (B10), -475 (B12) y -483,0 (B13, caminos 5 y 6) | E1-5, E1-6, E1-4 |
| -486 (B15) y -496 (lista cerrada, línea 83) | E1-1, E1-2 |
| -521 (R-01) y -528 (R-08) | E1-2, E1-1 |
| -539 (A-04), -546 (A-08 y A-09) y -557 (A-11) | E1-12, E1-8, E1-13 |
| -582, -600,0 y -614,0 (paso 2 de 02b, PARADAS y H-0) | E1-3, E1-2 |
| -622,0 (sección "Enmienda 1") | tabla |

### Lo que comprobé
- **M-01, resuelto.** Hay una sola lista de declaraciones que nombran el correo: `filasDeLaHojaDeExportacion` y `mismoAlumnoDeExportacion` en `lib.ts`, y `TEXTOS_EXPORTACION` en `data.ts`. Es la misma en §D-4, §D-5.2, "Cambios por capa", CAL2-B04, CAL2-B15, la enmienda de `estatico-01d.test.ts:83` y R-08. `combinarVentanasDeExportacion` ya no nombra `email`.
- **M-02, XML literal válido según ECMA-376.**
  - `[Content_Types].xml`: los `Default` de `rels` y `xml` y los tres `Override` con sus tipos correctos (`sheet.main+xml`, `worksheet+xml`, `styles+xml`).
  - `_rels/.rels`: la relación `officeDocument` hacia `xl/workbook.xml`.
  - `workbook.xml`: los espacios de nombres `main` y `r` y `<sheets>` con `r:id="rId1"`; `bookViews` es opcional.
  - `workbook.xml.rels`: `rId1` apunta a la hoja y `rId2` a los estilos.
  - `styles.xml`: los hijos van en el orden del esquema (`fonts`, `fills`, `borders`, `cellStyleXfs`, `cellXfs`, `cellStyles`), con los dos rellenos obligatorios (`none` y `gray125`), la fuente 1 con `<b/>` y el `xf` 1 con `applyFont="1"`; no declara colores, así que no choca con V-02 a V-04.
  - `sheet1.xml`: el orden del esquema (`sheetViews` → `cols` → `sheetData`) y el `pane` completo (`xSplit="2" ySplit="3" topLeftCell="C4" activePane="bottomRight" state="frozen"`) con su `selection`. Las celdas son `inlineStr` con `<is><t xml:space="preserve">` y nunca `<f>`, y los números van con `String(n)`.
  - **Escapes:** primero se quitan los controles que XML 1.0 no admite, recorriendo por puntos de código; después se escapa `_xHHHH_` con `/_(?=x[0-9A-Fa-f]{4}_)/g`; al final, las cinco entidades. El orden es correcto, porque `_x005F_` no contiene ningún carácter que haya que convertir en entidad.

  Es lo que Excel, LibreOffice y Google Sheets aceptan en un paquete mínimo.
- **El contenedor ZIP está bien.** Las cabeceras locales miden 30 bytes, las del directorio central 46 y el fin de directorio 22, con las firmas correctas y en *little-endian*. La fecha DOS `0x0021` es el 1980-01-01 (`0 << 9 | 1 << 5 | 1`), la hora es 0 y el método es 0, sin descriptores. El tamaño comprimido es igual al tamaño, la versión es 20 y los atributos son 0. Los nombres son ASCII (no hace falta el bit 11 de UTF-8), y el fin de directorio declara 6 entradas.
- **CAL2-B01 a B03 comparan byte a byte, sin el lector propio.** El CRC se cruza con `crc32` de `node:zlib`, que existe en Node 24 (`engines: >=24 <25`; en este equipo, v24.21.0). B02 cubre `_x0041_`, `_x00e9_` y los dos falsos positivos (`_x41_`, `x0041_`). B03 cubre `-0`, el orden de atributos `r`, `s`, `t`, las filas sin celdas y el `pane` literal.
- **H-0 y su punto de corte (DH-10 y la PARADA del paso 2 de 02b) son claros.** CAL2-B17 deja la muestra en la carpeta temporal con lo que más riesgo tiene: más de 26 columnas, "=SUMA(1;2)", "Tarea_x0041_", emoji, ñ y decimales. Si la muestra no abre limpia, hay una corrección dentro de los literales; si los literales están mal, los corrige el arquitecto; si sigue sin abrir, se pasa a DH-01 (b) antes de construir la vista. Queda fuera de los 7 puntos de la comprobación final.
- **M-03, resuelto.** CAL2-B13 suma el camino 5 (otra ventana del gradebook, de alumnos y de tareas, de ida y de regreso) y el camino 6 (las dos frases seguidas). El tope de peticiones tiene un texto propio sin promesa de reintento ("Esta clase tiene demasiadas calificaciones para exportarlas en un solo archivo."); se decide con los totales de la primera respuesta, y además se conserva la guarda de 200 peticiones durante el recorrido (CAL2-B10). El argumento de que el caso es alcanzable (no hay tope de tareas por clase) es correcto.
- **N-01 a N-04, resueltos.** La matriz de §D-7 tiene la fila nueva, cubierta por CAL2-B12. Las cifras de tamaño y DH-11 están. A-08 reescribe la viñeta "Panel". O-05 y CAL-T-185 quedan en §D-0.6, §D-6 y §D-R0.
- **No encontré contradicciones nuevas, salvo los dos detalles de abajo.**

### Problemas que no bloquean
- **N-05 — `node:zlib`, `node:fs` y `node:os` en las pruebas del frontend.** `tsconfig.app.json` limita `types` a `["vite/client"]` e incluye todo `src/`, y hoy ninguna prueba de `src/` importa un módulo `node:`. Es probable que `tsc -b` (en `lint` y `build`) no resuelva `node:zlib` si los tipos de `vitest` no traen los de Node. El plan ya lo tiene como PARADA, así que no se rompe nada en silencio. Para que esa PARADA no frene 02b, recomiendo que el humano preautorice desde ya el remedio menor: `/// <reference types="node" />` al inicio de `lib/xlsx.test.ts` y `lib/xlsx-muestra.test.ts` (`@types/node` ya es dependencia de desarrollo del frontend), sin tocar ningún `tsconfig`. Si no lo preautoriza, la PARADA sigue como está.
- **N-06 — Arbitraje: `ventanasDeLaExportacion` con 0 × 0.** §D-4 la define como `ceil(totalAlumnos / 100) × ceil(totalTareas / 100)`, que da 0 con 0 × 0, y CAL2-B04 pide 1. **Manda CAL2-B04:** cada factor vale `max(1, ceil(…))`, porque la primera respuesta ya es una petición. El resultado no cambia (0 y 1 están bajo el tope, y la combinación da `vacio`), pero el programador no debe tener que elegir. El orquestador anota este arbitraje en `aprobacion.md`; si hay otra enmienda, el arquitecto alinea la fórmula.

### Detalles menores
- La línea 12 (Preguntas bloqueantes) todavía dice "DH-01 a DH-09"; ahora son DH-01 a DH-12.
- La tabla de la Enmienda 1 no lista lo que se suma a la viñeta nueva de A-08 (los dos avisos sin promesa de reintento). El cambio está marcado "Enmienda 1, detalle menor" en su lugar y es correcto.
- §D-5.1 dice que se "conservan los retornos de carro". Al leer el XML, un CR literal en el contenido se normaliza a LF, así que en la celda se verá un salto LF. No afecta a nombres ni títulos reales; si se quiere conservar el CR, se escribe `&#13;`. No hace falta cambiar nada en este encargo.
- El texto "Esta clase tiene demasiadas calificaciones para exportarlas en un solo archivo." dice qué pasó, pero no qué hacer (DESIGN §9). Es aceptable, porque la persona no puede hacer nada desde la interfaz.

### Decisiones para el humano (lista final, con mi opinión)
1. **DH-01, cómo se arma el .xlsx:** el escritor propio (a). Ya tiene literales, pruebas byte a byte y H-0; no hace falta una dependencia.
2. **DH-02, la ruta y la paginación:** ruta nueva por ventanas (a). Cumple "toda lista se pagina" sin excepción y usa el mismo cálculo del gradebook.
3. **DH-03, el nombre del archivo:** `Calificaciones - <clase> - AAAA-MM-DD.xlsx` (a). Es claro y no choca entre días.
4. **DH-04, el contenido de la hoja:** (a). El orden de la más antigua a la más reciente es una decisión de lectura suya; me parece natural en una hoja de cálculo.
5. **DH-05, nada más que lo que pide RF-65:** (a). Sumar riesgo o pesos sería construir lo que nadie pidió.
6. **DH-06, los textos:** (a), con el aviso de éxito. Un lector de pantalla no anuncia la descarga.
7. **DH-07, clases archivadas:** diferirlo a ADMIN-01 (a). Hoy no existe la clase archivada y la fila de ESTADO lo garantiza.
8. **DH-08, salir con la exportación en vuelo:** cancelar (a). Una descarga que aparece en otra sección sorprende, y repetir cuesta una sola petición.
9. **DH-09, N-52:** no absorberlo (a). Cambia una `*.ataque` y trae su propia frase de recuperación; va mejor en el `chore`.
10. **DH-10, control H-0 adelantado:** sí (a). Son unos 2 minutos que pueden ahorrar rehacer la vista.
11. **DH-11, el techo de la ventana:** 100 × 100 (a). Las clases del piloto salen en una sola respuesta de unos 115 KB y sin el riesgo R-02.
12. **DH-12, la excepción de CLAUDE.md:** extenderla a la exportación (a). Es una lectura sin campos, cuyo texto del servidor nunca es para la persona.
13. **R-02, el riesgo residual entre ventanas:** aceptarlo. Solo existe con más de 100 alumnos o tareas y con un cambio sin calificación.
14. **R-06, el texto de ESSENTIALS (A-01):** aprobarlo junto con DH-01 (a).
15. **N-05, opcional:** preautorizar el `/// <reference types="node" />` en las dos pruebas nuevas de `lib/`, para que la PARADA de los tipos de Node no frene 02b.

## Verificación del resumen — 02a — implementación

Veredicto: **ACEPTADO.** Puede atacar el tester. Sin M-nn.
Resumen verificado: `resumen-programador.md`, SHA-256 `8bf1b597144d4ae0155a18890c42204c091fe4446c357c7db2f9e9c33feee163` (reproducido). Plan: `a25ccc63…` (reproducido). Árbol sin commit sobre `ff09e69`.

### Mis corridas (una suite cada vez; Docker 28.5.1; red `uacam5 2` de confianza para esta sesión)
Carga medida (dos lecturas, `Win32_Processor.LoadPercentage`) antes de cada corrida completa: backend 17 % y 19 %; frontend 8 % y 9 %. Las dos con el equipo descargado.

| Paquete y comando | Mi corrida (última línea) | Resumen | ¿Coincide? |
|---|---|---|---|
| `shared` · `npm run build` | `> tsc -p tsconfig.json`, salida 0 | igual | Sí |
| `shared` · `npm run lint` | "All matched files use Prettier code style!" | igual | Sí |
| `backend` · `npm run lint` | `> tsc -p tsconfig.json --noEmit && tsc -p tsconfig.test.json`, salida 0 | igual | Sí |
| `backend` · `npm run test` | `Tests  2796 passed (2796)` · `Test Files  233 passed (233)` · 221.73 s | 2796 / 233 · 251.07 s | Sí |
| `backend` · `npm run build` | `> tsc -p tsconfig.json`, salida 0 | igual | Sí |
| `frontend` · `npm run lint` | `> tsc -b`, salida 0 | igual | Sí |
| `frontend` · `npm run test` | `Tests  5953 passed (5953)` · `Test Files  272 passed (272)` · 247.10 s | 5953 / 272 · 480.65 s | Sí |
| `frontend` · `npm run build` | `✓ built in 751ms`, salida 0 (solo el aviso de siempre del tamaño de los chunks) | `✓ built in 1.95s` | Sí (el tiempo varía) |

Conteos con `npx vitest list` (archivos con `grep -a`):

| Cifra | Mía | Resumen |
|---|---|---|
| Backend, casos (`grep -a -c ""`) | 2796 | 2796 |
| Backend, archivos (`grep -a -o "^[^ ]*\.test\.ts"`, `sort -u`, `wc -l`) | 233 | 233 |
| Backend, casos `CAL2-` | 22 (4 esquemas, 2 autorización, 6 estático, 10 integración) | 22 (igual reparto) |
| Backend, archivos `*.ataque` | 93 | 93 |
| Frontend, archivos | 272 | 272 |
| Frontend, casos `CAL2-` | 0 | 0 |
| Frontend, líneas de la lista | 5974 (contra 5953 casos de la corrida) | 5974 / 5953 |

### Pruebas requeridas
Los 22 títulos del resumen existen tal cual en `npx vitest list` (cotejo literal de cada uno con " > <título>"), en los archivos que dice. CAL2-A01 a CAL2-A10 tienen cada una al menos un caso, y el contenido cumple la viñeta del plan: A01 recorre cada fila de la tabla de "Autorización" con `GET` y `HEAD` (incluidos el comaestro retirado, la clase inexistente con tres roles y la misma respuesta que la ajena, el token vencido y el `claseId` malo); A02 revisa la fuga sobre el cuerpo de todas las respuestas del archivo, en el `pedir` común; A04 compara con el gradebook en ventanas de 50, 2 × 2 y 1 × 3, y con "Mis calificaciones" alumno por alumno, con la "Sin categoría", la calificada sin entrega, la tardía, la asignada y la vencida; A05 cubre el 100 por omisión en las dos dimensiones (101 × 101), el 100 exacto, `0`/`101`/`abc` en los dos límites, las 4 combinaciones, el empate por id, los dos cursores ajenos con su mensaje exacto y el cursor en mayúsculas; A07, las tres escrituras de otra conexión con `unaVezDespuesDe` y la lectura siguiente; A10, 10 sentencias sin cursores y 12 con cursores, iguales en los cinco tamaños.

### "No se toca" de 02a contra `ff09e69`
- `git diff --stat ff09e69` y `git status --short --ignored`: en los paquetes solo cambian los archivos de la lista del plan y los cinco nuevos (adaptador y cuatro pruebas). Nada en `frontend/` (hash de las 153 `*.ataque` del frontend: `afb2c102…`, el mismo del reporte del tester), nada en `middleware/`, `core/`, `workers/`, `config/`, `app.ts`, `prisma/`, `package.json` ni `tsconfig*`.
- `adapters/db/calificaciones.ts`: un solo hunk, `-const leerGradebookCon = async (` / `+export const leerGradebookCon = async (`. Nada más.
- `calificaciones-lecturas-estatico.test.ts`: solo la línea 85, `toBe(2)` → `toBe(3)` (lista cerrada).
- `*.ataque` del backend: las 93 tienen el SHA-256 de la tabla de V-01 del reporte del tester (`diff` sin diferencias), incluidas C-1 (`78680f5e…`) y C-2 (`849134d1…`). Las únicas `*.ataque` con diferencia contra `ff09e69` son esas dos, del tester.
- A-11: el párrafo de `handlers/README.md` va después de la línea 178 y la sección de `adapters/README.md` después de la del gradebook, con el texto literal del plan.
- Fuera de los paquetes: `docs/ESTADO.md` (excluido) y una línea al final de `docs/trabajo/CLASES-03-reorganizacion-de-la-clase/aprobacion.md` (el registro del cierre de CLASES-03 hecho por el orquestador al crear la rama; ver "Detalles").

### Las decisiones donde el plan calla
1. **El correo en el adaptador (CAL2-A08).** La acepto. El texto de CAL2-A08 ("`email` solo en el `select` de los correos y en sus tipos") es más estrecho que el propio §D-2, que pide `alumno: { ...fila.alumno, email }` en el retorno: el correo tiene que salir del `select` y llegar a la fila. El tramo que permite la prueba (de `const cuentas =` al `return {` de la función) es lo mínimo que §D-2 exige, y la prueba lo acota bien: dentro del tramo hay exactamente un `select:` y es `{ id: true, email: true }` sobre `tx.usuario.findMany`; fuera del tramo y del tipo `AlumnoDeExportacionDb`, `email` no aparece en el código. Si el formato cambia la sangría, `indexOf` da `-1` y la precondición falla con su mensaje. No hay choque con M-01 de la Enmienda 1: esa lista única es del frontend (`filasDeLaHojaDeExportacion`, `mismoAlumnoDeExportacion` y `TEXTOS_EXPORTACION`) y llega en 02b. Se cumple §D-0.4: `calificaciones.ts` sigue sin nombrar el correo (lo comprueban la prueba y el diff). Además, el adaptador arma el alumno campo por campo (`id`, `nombre`, `email`) en lugar de esparcir `fila.alumno`, lo que es más estricto para P-13. No hace falta enmienda.
2. **CAL2-A10 con centinelas.** Correcta. Los tamaños 1 × 1, 2 × 2, 30 × 30, 1 × 30 y 30 × 1 cubren 1, 2 y 30 en cada dimensión, con cursores y sin ellos. Las secuencias (10 sentencias sin cursores y 12 con cursores) caen en el "de 9 a 12" de §D-2.
3. **CAL2-A05 sembrada con `createMany`.** Correcta. Las filas se limpian por `idsUsuarios` e `idsClases`, como en las demás pruebas, y el `hashContrasena` es un texto de relleno que nunca se usa para entrar.
4. **CAL2-A07 en los dos momentos.** Cubre lo que pide la viñeta ("después del conteo") y además el caso más fuerte, después de `tarea.findMany`.
5. **"el tipo de cuenta" en lugar de "rol".** Correcta. CAL2-A08 (§D-0.6) recorre los comentarios de los cuatro archivos de `backend/src` y la regla de "rol" en código pasa.
6. **CAL2-A01, la clase inexistente con tres roles y el token vencido.** Correcta. La tabla del plan pide "maestro o admin", y comparar el cuerpo con el de la clase ajena demuestra "la misma respuesta".

### La observación del `503` por `P2028`
Estoy de acuerdo y no devuelve el resumen. El plan no lo pide como prueba requerida: lo pone en "Puntos de ataque" de 02a ("`P2028` → `503`"), así que es del tester. La ruta lo hereda del mismo `enTransaccion` con instantánea única que usan el gradebook y las demás lecturas, sin código nuevo de errores. Si el tester encuentra que no responde `503`, entra como hallazgo en la ronda 1.

### Detalles (no bloquean)
- **Carga de las corridas del programador.** Las suyas arrancaron por encima del 25 % y lo declaró. Las mías, con el equipo descargado, dan las mismas cifras, así que la desviación no afectó ningún resultado. Queda como desviación de proceso registrada, sin efecto.
- **Para el orquestador:** la línea que se agregó a `docs/trabajo/CLASES-03-reorganizacion-de-la-clase/aprobacion.md` es suya (el cierre de CLASES-03) y queda fuera de la lista de 02a. Decida si va en el commit de 02a, con mención en el mensaje, o en uno de documentos aparte. No es del programador.
- Hermanos y matriz de avisos: no aplican. Es la implementación inicial y 02a no tiene interfaz.

## Revisión final — 02a

Veredicto: **APROBADO.** No hay problemas que bloqueen ni M-nn. La subentrega puede ir al commit del humano (`<K2a>`).
Verificación propia (una suite cada vez; Docker 28.5.1; carga medida antes de cada corrida completa: backend 15 % y 16 %, frontend 11 % y 9 %):

| Comando | Última línea |
|---|---|
| `cd shared; npm run build` | `> tsc -p tsconfig.json`, salida 0 |
| `cd backend; npm run lint` | `> tsc -p tsconfig.json --noEmit && tsc -p tsconfig.test.json`, salida 0 |
| `cd backend; npm run test` | `Test Files  234 passed (234)` · `Tests  2806 passed (2806)` · 160.27 s |
| `cd backend; npm run build` | `> tsc -p tsconfig.json`, salida 0 |
| `cd frontend; npm run lint` | `> tsc -b`, salida 0 |
| `cd frontend; npm run test` | `Test Files  272 passed (272)` · `Tests  5953 passed (5953)` · 262.22 s |
| `cd frontend; npm run build` | `✓ built in 915ms`, salida 0 (solo el aviso de siempre del tamaño de los chunks) |

Conteos con `npx vitest list` en el backend: 2806 casos, 234 archivos y 94 `*.ataque` (contados con `grep -a`); 10 casos `CAL2-T-`. Coinciden con el tester (234 / 2806) y con la cuenta 233 + 1 y 2796 + 10. Frontend sin cambio (272 / 5953).
PA-07 sobre mi salida del backend: `40P01` 0, `deadlock detected` 0, `could not serialize` 0, `too many clients` 0, `"Error no controlado"` 10 y `"code":"P2028"` 5. Son los mismos conteos que el tester atribuyó al inventario.

### 1. El diff contra el plan
- **Se hizo lo planeado, solo lo planeado y todo lo planeado de 02a:**
  - §D-1 en `shared/` y su reexportación por nombre.
  - `export` en `leerGradebookCon`, y nada más en ese archivo.
  - §D-2 en el adaptador nuevo: cuatro pasos en serie, en una instantánea única, con los dos `AppError` inalcanzables tal como dice el plan y sin `$queryRaw` propio.
  - §D-3 en la ruta, con la cadena exacta y `columnaParaResponder`.
  - La línea 85 de la lista cerrada.
  - Los cuatro archivos de pruebas requeridas.
  - A-11 con su texto literal.
- **Desde mi verificación del resumen** (`94ae54a2…` en este archivo) el diff de los paquetes no cambió: `git diff --stat ff09e69 -- backend shared frontend` sigue en 10 archivos, con 116 inserciones y 4 borrados. Lo único nuevo es la `*.ataque` del tester.

### 2. V-01 y las `*.ataque`
- **Backend:** las 94 `*.ataque` coinciden byte a byte con la tabla de la ronda 1 del reporte del tester (`diff` sin diferencias). Contra la tabla de la ronda 0, la única diferencia es la nueva `backend/test/exportacion-02a-r1.ataque.test.ts` (`885668a6…`).
- **Frontend:** las 153 `*.ataque` siguen en `afb2c102…`.
- Ninguna `*.ataque` fue modificada, saltada ni borrada por el programador. Las únicas con diferencia contra `ff09e69` son C-1 y C-2, del tester en la ronda 0.

### 3. "No se toca" contra `ff09e69`
- En los paquetes solo cambian los archivos permitidos de 02a (ver mi verificación del resumen). No hay cambios en `frontend/`, `middleware/`, `core/`, `workers/`, `config/`, `app.ts`, `prisma/`, `package.json` ni `tsconfig*`.
- Fuera de los paquetes cambian `docs/ESTADO.md` (excluido) y la línea del orquestador en `docs/trabajo/CLASES-03-reorganizacion-de-la-clase/aprobacion.md`, ya señalada.

### 4. La `*.ataque` nueva: hora real y selectores de estilo
- **No depende de la fecha real:**
  - Las fechas límite son fijas (`FECHA_BASE` = 2026-12-01T12:00Z).
  - Las llamadas directas al adaptador pasan `ahora: new Date(FECHA_BASE)`.
  - Las que van por la ruta (que usa `new Date()`) no afirman nada que dependa de si una tarea ya venció: los totales, el orden, las ids, las dos celdas calificadas y comparaciones entre dos lecturas del mismo instante.
  - Pasado el 2026-12-01 nada cambia de sentido.
- **Usa tiempo de reloj solo como umbral de duración, con margen:**
  - T-01: `< 4.5 s`, contra el `maxWait` de 2 s.
  - T-02: espera 5.5 s, contra el `timeout` de 5 s de Prisma.
  - T-09: `< 15 s` para una ventana de 100 × 100.
  - Ver "Detalles".
- **No hay selectores de estilo:** es del backend y no toca el DOM.
- **Cumple las reglas de bloqueos de CHORE-02:**
  - Sin `LOCK TABLE`.
  - `ocuparPool` retiene conexiones de su propio proceso con un `timeout` explícito (30 s) mayor que su espera más larga.
  - La app registra en nivel `error` para no meter sus `P2028` provocados en el conteo de PA-07.

### 5. Definición de terminado (02a)
- [x] RF-65, parte del servidor: la ruta, las ventanas, el mismo cálculo que el gradebook y P-13. La parte del navegador es 02b.
- [x] Capas y middleware:
  - El handler es delgado, sin comparar rol ni relación y sin Prisma.
  - Prisma solo en `adapters/db`.
  - La cadena es `protegido({ roles: ["maestro", "admin"], pertenencia: "propiedad" })`.
- [x] `lint`, `build` y `test` en verde en los tres paquetes (corrida propia).
- [x] Pruebas de autorización del endpoint nuevo: rol incorrecto, clase ajena, alumno restringido y que no se filtre el estado de pago (CAL2-A01, CAL2-A02 y CAL2-T-05, T-08 y T-10).
- [x] Sin migración: usa índices que ya existen (PK de `clases` y de `usuarios`, `tareas(clase_id, fecha_limite)` y los del gradebook).
- [x] Sin cambios en `infra/` ni en `.env.example`.
- [ ] Documentos: los README (A-11) están hechos. A-02, A-03, A-04 y A-10 los aplica el orquestador al cerrar 02a (abajo).

### 6. Reglas que no se rompen y estilo
- **P-13 por construcción:** el esquema es estricto, el `select` del adaptador es mínimo (`nombre`, `id` y `email`) y el alumno se arma campo por campo.
- **Consultas sanas:**
  - Sentencias en serie, de 10 a 12, iguales en cualquier tamaño (CAL2-A10).
  - Paginación hasta 100 por dimensión.
  - Ninguna consulta dentro de un ciclo.
  - Sin SQL crudo nuevo.
- **Solo lecturas:** sin cola ni archivos (R-01), y fechas en UTC.
- **Estilo:**
  - Retornos tempranos (`if (!clase) throw …`).
  - Ningún valor por defecto silencioso: el correo que falta es un `500`, nunca `""`.
  - `ids.length === 0 ? [] : …` evita una consulta vacía y no oculta datos.

### 7. Hallazgos y observaciones del tester
- **Ronda 1: RESISTE, sin hallazgos.** No hay nada que arbitrar.
- **O-r1-1** (`z.coerce.number` acepta `0x64`, `1e2` y ` 100 ` como 100): **queda como observación, sin acción.**
  - Es el mismo patrón que `gradebookQuerySchema` y que la paginación de todo el proyecto.
  - No deja pasar del tope de 100 ni acepta menos de 1.
  - Cambiarlo solo aquí rompería la coherencia con el gradebook, cuyos parámetros comparte CAL2-A04.
  - Si el humano quiere endurecerlo, es un `chore` transversal de `shared/`, no de este encargo. No propongo fila en ESTADO §3 porque no hay daño que corregir.
- **El `503` por `P2028` en la ruta, forzado de forma determinista: queda como observación, sin acción.**
  - El adaptador lo prueba de forma determinista por sus dos caminos: el `maxWait` con el pool lleno (T-01) y el `timeout` entre sentencias (T-02). Los dos dan `AppError` 503 `SERVICIO_OCUPADO` con causa `P2028`.
  - La traducción a la respuesta HTTP es la del envoltorio único de errores, sin código nuevo, y ya la cubren `servicio-ocupado.integracion.test.ts` y las de CHORE-02.
  - T-03 comprueba que la ruta nunca da `500`.
  - El argumento del tester es correcto: forzarlo en la ruta exige retener una tabla compartida, lo que la regla de bloqueos de CHORE-02 prohíbe.

### Documentos a actualizar al cerrar 02a (el orquestador, con el SHA-256 de cada archivo en `aprobacion.md`)
Revisé las cuatro anclas sobre el árbol actual. Todas existen una sola vez y **los textos del plan siguen tal cual**, sin enmienda:
- **A-02**, `docs/ARCHITECTURE-ESSENTIALS.md:129`: la viñeta "Exportar calificaciones (DOCS-04; CALIFICACIONES-02)…" termina en "Decisiones del humano, 2026-10-26."; el texto se agrega al final. La frase "no arma el archivo si la clase cambió entre dos ventanas" describe lo que hace 02b. Queda bien porque las dos subentregas se fusionan en el mismo PR. Si 02b terminara con DH-01 (b), esa frase sigue siendo cierta, porque §D-4 no depende de la librería.
- **A-03**, `docs/ARCHITECTURE.md:236`, fila `calificaciones`: " (CALIFICACIONES-01) |" aparece una sola vez en la línea; el texto se inserta antes. Los parámetros, los límites (1 a 100, 100 por omisión) y los campos que nunca salen coinciden con §D-1 y con el código.
- **A-04**, `docs/ARCHITECTURE.md:245`: la viñeta "- **CALIFICACIONES-02:** … con la regla de paginación." está pegada al párrafo en la misma línea, como dice la Enmienda 1. Se quita solo desde "- **CALIFICACIONES-02:**" hasta "paginación." inclusive.
- **A-10**, `docs/ESTADO.md` §3 (línea 313 en adelante): las tres filas nuevas (ADMIN-01, FORO-01 y DEPLOY), con el formato de tres columnas de la tabla. La frase de N-52 va al final de la columna de destino de su fila (línea 387).

### Detalles (no bloquean)
- **Umbrales de duración en la `*.ataque` nueva** (T-01 `< 4.5 s` y T-09 `< 15 s`): pasan con margen en el equipo descargado. Con carga alta podrían fallar por tiempo y no por un defecto, como ya pasó otras veces (ESTADO §5). La regla de medir la carga antes de cada corrida lo cubre. No pide cambio.
- **Línea del orquestador en el `aprobacion.md` de CLASES-03:** sigue pendiente decidir si va en el commit de 02a o en uno de documentos aparte (ver mi verificación del resumen).
- **Carga en las corridas del programador:** ya registrada y sin efecto (mis tres corridas con el equipo descargado dan las mismas cifras).

## Verificación del resumen — 02b

Veredicto: **ACEPTADO.** Puede atacar el tester. No hay M-nn que bloqueen. Hay dos observaciones (N-07 y N-08) y el arbitraje del punto 9, abajo.
Resumen verificado: la sección de 02b de `resumen-programador.md` (SHA-256 del archivo `7c035686d87c7c61bec23313303b3fb4f1f5ee11fec381137996d307840ce4fe`, reproducido). Plan `a25ccc63…`. Base de 02b dentro de los paquetes: `<K2a>` = `57192e2`.

### Mis corridas (una cada vez, sin nada en paralelo)
Carga antes de la suite: 20 % y 9 % (dos lecturas seguidas en 25 % o menos). Antes del lint hubo una lectura de 52 % seguida de una de 10 %. Por eso el lint no cuenta como corrida en frío, aunque es determinista y sus cifras no dependen de la carga.
`git diff --quiet 57192e2 -- shared backend` sale con 0: 02b no toca `shared/` ni el backend. Por eso no corrí sus suites; las 94 `*.ataque` del backend siguen iguales a la tabla de la ronda 1 de 02a.

| Comando | Mi corrida (última línea) | Resumen | ¿Coincide? |
|---|---|---|---|
| `cd frontend; npm run lint` | `> tsc -b`, salida 0 | igual | Sí |
| `cd frontend; npm run test` | `Test Files  279 passed (279)` · `Tests  6034 passed (6034)` · 401.05 s | 279 / 6034 · 361.69 s | Sí |
| `cd frontend; npm run build` | `✓ built in 1.61s`, salida 0 (solo el aviso de siempre del tamaño de los chunks) | `✓ built in 1.10s` | Sí (el tiempo varía) |

Conteos con `cd frontend; npx vitest list` (contados con `grep -a`), todos iguales a los del resumen:
- **Archivos:** 279.
- **`*.ataque`:** 153.
- **Casos `CAL2-B`:** 81, por archivo: `lib/xlsx.test.ts` 15, `lib/xlsx-muestra.test.ts` 1, `services/descargaService.test.ts` 1, `exportacion-02b.test.ts` 15, `exportar-02b.test.tsx` 30, `recuperar-exportacion-02b.test.tsx` 13 y `estatico-02b.test.ts` 6.
- **Por viñeta:** B01 3, B02 5, B03 7, B04 5, B05 4, B06 4, B07 2, B08 4, B09 1, B10 16, B11 4, B12 4, B13 13, B14 1, B15 6, B16 1 y B17 1.
- **Total:** 5953 + 81 = 6034.

### Pruebas requeridas
Cotejé los 59 títulos del resumen contra la lista:
- Los 50 títulos fijos existen tal cual, en el archivo que dice.
- Los 9 de `it.each` o `describe.each` (B10 ×2, B11, B12, B13 (1) a (5)) existen con su prefijo literal y dan el número de casos que el resumen declara.

CAL2-B01 a CAL2-B17 tienen cada una al menos un caso. Lo que verifiqué en el contenido:
- **B04:** la regla de §D-4 trae 14 casos con nombre, de la regla 1 a la 6, entre ellos "otra dirección" y "otro porcentaje" en la segunda ventana.
- **B09:** lee el archivo con el lector, revisa "Deudor", "Al corriente" y "estring", y revisa la caché de mutaciones.
- **B13:** usa el router real (`rutas` con `createMemoryRouter`), el `QueryClient` de `app/providers.tsx` (`retry: 1`, `refetchOnWindowFocus: false`, `staleTime: 30_000`, comprobado contra el archivo) y el `Toaster` de `components/ui/sonner`. Recorre los seis caminos, con el 5 en sus dos dimensiones.
- **B12:** la recarga es `router.navigate(ruta)` sobre la ruta activa, con otra `location.key`: es pulsar la sección.

### "No se toca" de 02b contra `57192e2`
- **Producción:**
  - Nuevos: `lib/xlsx.ts`, `lib/lector-xlsx-de-prueba.ts`, `services/descargaService.ts` y `components/exportar-a-excel.tsx`.
  - Cambiados en el módulo: `types.ts`, `data.ts`, `lib.ts`, `hooks.ts` y `gradebook-view.tsx`. Este último solo tiene el `import` y la inserción entre `ResumenDelGradebook` y `NavegacionDelGradebook`.
- **Nada en:** `app/`, `components/`, `styles/` (fuera de C-4), los demás módulos, los cinco componentes vedados de `features/calificaciones/`, `package*.json`, `tsconfig*`, ni la configuración de Vite o Vitest.
- **Lista cerrada** (`estatico-01d.test.ts`): `ESPERADOS` suma el componente; el título pasa a "doce archivos"; la regla del correo se aplica después de quitar las tres declaraciones de la lista única, con su precondición; y `toBe(15)` pasa a `toBe(16)`. Nada más.
- **V-01:** las 153 `*.ataque` del frontend coinciden byte a byte con la tabla de la ronda 0 de 02b (`diff` sin diferencias; hash conjunto `81e3fa12…`). Las únicas con cambios contra `57192e2` son C-3 y C-4, del tester. Las dos líneas del `N-05` (`/// <reference types="node" />`) están en las dos pruebas nuevas de `lib/`, sin tocar `tsconfig`.

### La matriz de avisos, recargas y foco contra el código
Coincide con `exportar-a-excel.tsx`, `hooks.ts` y `lib.ts`:
- **El aviso:** `toast.dismiss(id)` al empezar; un solo `success` o `error` con `id` fijo; `cancelado` no avisa; el `catch` calla si la señal se abortó o si `errorQueRedirigeElCliente`.
- **La espera y la guarda:** `enEspera={exportar.isPending || pidiendoLaVentana}`, guarda con ref que se libera en el `finally`.
- **La señal:** `exportarCalificaciones` mira `signal.aborted` antes de descargar, y el `useEffect` de limpieza aborta el controlador.
- **La mutación:** sin `onSuccess`, `onError` ni `invalidateQueries`.
- **"En vuelo a la vez":** una ventana del gradebook pone el botón en espera y no aborta la exportación (B14). Una recarga que quita el botón lo desmonta, aborta sin aviso ni descarga, y el foco va a la raíz por el gancho sin cambio (B12).
- **"Con la vista desmontada":** el recorrido abortado no avisa ni aunque la respuesta llegue después, y entre el último `fetch` y la descarga devuelve `cancelado` (B12, casos 1 y 2). Al volver, el componente nuevo tiene sus propias refs y su controlador.
- **El recorrido:** pide la ventana 200 y para antes de la 201. La comprobación de los totales corre solo con la primera respuesta. Los cursores de alumnos se recuerdan por ventana de tareas y los de tareas en todo el recorrido. Es la lectura correcta de §D-4.

### Las decisiones donde el plan calla (1 a 12)
Acepto las doce:
- **1 a 3:** son tipos de interfaz en `types.ts`, una función pura en `lib.ts` y constantes en `data.ts`, conforme a las reglas 1 a 3. Las claves `primeraColumna` y `segundaColumna` evitan nombrar el correo fuera de la lista única.
- **4:** el recorrido descrito arriba.
- **5 y 6:** lanzan, como pide la Enmienda 1.
- **7:** la copia a `Uint8Array` es por el tipo de `BlobPart`; `self-start` es de colocación, no un valor visual suelto.
- **8:** el `Toaster` de `sonner` en `exportar-02b`, y el de `components/ui/sonner` en B13, como pide el plan.
- **10 a 12:** correctas.
- **9:** se arbitra abajo.

### Arbitraje del punto 9 (el reloj en el caso de B12 que deja la vista en su vacío)
1. **¿Es aceptable en la prueba? Sí.**
   - CAL-T-191 y la regla de `tester.md` piden que el reloj esté fijo, no que sea un solo instante. `vi.setSystemTime(AHORA + 1 s)` deja el reloj fijo y determinista.
   - `beforeEach` lo vuelve a poner en `AHORA` y `afterEach` hace `useRealTimers`.
   - Modela lo que pasa en el navegador: entre la respuesta que pintó el botón y la recarga pasa tiempo.
   - La prueba sigue demostrando lo que pide el plan: el aborto, sin aviso ni descarga, y el foco en la raíz, nunca en `<body>`.
   - El avance cae dentro del `it.each` y también corre en el caso del `403`, donde no hace falta: ahí la clave cambia por `errorUpdatedAt` y `errorUpdateCount`. No estorba.
2. **¿El hueco es real? Sí, y es anterior a 02b.**
   - `claveDeFocoDeLaConsulta` (`components/foco/lib.ts`, desde CALIFICACIONES-01d) lee `status`, `dataUpdatedAt`, `errorUpdatedAt` y `errorUpdateCount`.
   - Entre dos respuestas exitosas en el mismo milisegundo, con el mismo `status`, la clave no cambia. Si la segunda quita el control enfocado, el foco no se recoloca.
   - Vale para cualquier vista que use el gancho, no solo para «Exportar a Excel».
   - **Para este botón es prácticamente inalcanzable:** el botón tiene que recibir el foco después de la respuesta que lo pintó, y la respuesta de la recarga tendría que llegar con el mismo `Date.now()` que esa respuesta anterior. Enfocar, pulsar la sección y la ida y vuelta por la red no caben en un milisegundo.
   - Ni siquiera con un reloj reducido a 100 ms (Firefox con `resistFingerprinting`) es un camino realista, aunque en teoría no es imposible.
3. **¿Es un pendiente o una decisión del humano? Es un pendiente con destino.** No pide una decisión ahora.
   - El arreglo toca `components/foco/`, que está en "No se toca" de este encargo. 02b no lo introduce ni lo empeora.
   - Destino: el `chore` de foco y navegación del marco, junto a N-52 y N-54.
   - El orquestador agrega su fila en `docs/ESTADO.md` §3 al cerrar 02b, con referencia a este arbitraje y al punto 9 del resumen.
   - La forma del arreglo la decide el plan de ese `chore`, que aprueba el humano. No hace falta tocar "No se toca" en CALIFICACIONES-02.

### Problemas que no bloquean
- **N-07 · Dos valores de respaldo inalcanzables en `combinarVentanasDeExportacion`** (`features/calificaciones/lib.ts`, regla 8 y la preparación de las reglas 2 y 4).
  - En la regla 8, una celda que falta se omite sin aviso (`celda === undefined ? [] : [celda]`). Si se alcanzara, `filasDeLaHojaDeExportacion` emparejaría las celdas con columnas equivocadas sin lanzar.
  - `respuestas[0]?.tareas ?? primera.tareas` y `porVentana[0]?.filas ?? primera.alumnos` son respaldos del mismo tipo.
  - Las reglas 3 a 5 los hacen inalcanzables, y la fila que falta ya lanza. Por coherencia con "sin valores por defecto silenciosos" (`CLAUDE.md`) y con la Enmienda 1 ("lanza, nunca un valor inventado"), lo esperado es que la celda que falta lance como la fila.
  - Se corrige en la misma ronda si el tester devuelve algo. Si no, va como detalle a la revisión final; no amerita una ronda propia.
- **N-08 · El punto 9 del resumen** dice "segundo caso (el vacío)", pero el avance del reloj corre en los dos casos del `it.each`. Es solo precisión del resumen: el código es correcto.

### Para el orquestador
- Al cerrar 02b, además de A-01, A-05 a A-09 y la verificación de A-02 a A-04 y A-10 (los verifico en la revisión final), va la fila nueva de ESTADO §3 del punto 9, con destino el `chore` de foco y navegación del marco.
- La comprobación humana H-1 a H-7 sigue al final de 02b. H-0 ya se hizo: «H-0 bien», muestra `a56f9a56…`.

## Arbitraje de la ronda 1 — 02b

Reporte arbitrado: `reporte-tester.md`, "## Ronda 1 — 02b" (SHA-256 del archivo `ccf297d5e6c547cf35e6b9bccdd36c78d49b73b3295a80621c30d694a0459721`). Ataque nueva: `frontend/src/features/calificaciones/exportacion-02b-r1.ataque.test.tsx`.
Veredicto del arbitraje: **T-01 y T-02 son hallazgos válidos.** Los corrige el programador en esta ronda junto con N-07. **No hace falta una enmienda del arquitecto:** los dos remedios aplican decisiones que ya están aprobadas (DH-03 y M-03) y no cambian contratos, textos, dependencias ni "No se toca". Este arbitraje queda como su registro, y el orquestador lo anota en `aprobacion.md`. **CAL2-T-20 tal como está escrita es incorrecta** (ver T-02): la reescribe el tester antes de que el programador corrija. **O-r1b-1 va al humano.**

### T-01 (CAL2-T-18) — el nombre parte un grafema en el borde de 80
- **Manda DH-03 (a).** Es la decisión del humano y dice «hasta 80 caracteres (sin partir un emoji)». §D-6, punto 2 («sin partir un par sustituto») es un detalle del arquitecto más débil que la decisión que desarrolla. Entre los dos, se cumple la decisión aprobada. No hay desacuerdo con ESSENTIALS ni decisión nueva.
- **La medida no cambia: como máximo 80 puntos de código, sin partir nunca un grafema.** No uso 80 grafemas porque un grafema no tiene tope de puntos de código: una familia con ZWJ ocupa de 5 a 7, y una letra con marcas combinantes, cuantos se quiera. Con 80 grafemas, el nombre del archivo no tendría largo acotado. Así se conserva la medida de §D-6 y se cumple la condición de DH-03.
- **Remedio** (`nombreDelArchivoDeExportacion`, `features/calificaciones/lib.ts`):
  1. Después de la limpieza actual (reservados, control y dirección a espacio, espacios colapsados, sin espacios al inicio, sin puntos ni espacios al final), se divide en grafemas con `Intl.Segmenter` (`granularity: "grapheme"`). Está en `lib` ES2022 del `tsconfig`, sin dependencia nueva.
  2. Se toman grafemas enteros mientras la suma de sus puntos de código no pase de 80; el primero que no cabe se descarta entero, con todo lo que sigue.
  3. Después, otra vez sin puntos ni espacios al final (como hoy). Si no queda nada: `Calificaciones - AAAA-MM-DD.xlsx` (§D-6.3).
  4. Si `Intl.Segmenter` no existe en el navegador (Firefox anterior a 125), el recorte sigue siendo el de hoy (80 puntos de código, sin partir un par sustituto). Así, un detalle del nombre nunca hace fallar la exportación. Va con un comentario que lo explique.
  5. Se respetan §D-0.6 y O-05: sin `new RegExp(`, `\p{L}`, `.split(":")`, `.indexOf(":")` ni `/^…:`. Tampoco invisibles literales en el código (`lib/estatico-ch3`): la prueba escribe los emojis y el ZWJ con escapes `\u{…}`.
- **Casos nuevos en CAL2-B06** (en `exportacion-02b.test.ts`, el archivo del programador), cada uno en el borde:
  - una bandera, una familia con ZWJ, una tecla con número y un tono de piel que quedarían partidos: se quitan enteros;
  - el mismo emoji que termina exactamente en el punto de código 80: se conserva entero;
  - una clase que es un solo grafema de más de 80 puntos de código: el nombre sin clase;
  - `Intl.Segmenter` ausente (sustituido en la prueba y restaurado): el recorte por puntos de código, sin lanzar.
- **Hermanos y estados vecinos que el resumen tiene que listar:** no hay otro recorte de texto en 02b (la hoja no recorta y el nombre de la hoja es fijo). Los estados son: el grafema que cabe exacto; el que cruza el 80; la clase que queda vacía tras el recorte; un punto o espacio que queda al final tras el recorte; y el navegador sin `Intl.Segmenter`.

### T-02 (CAL2-T-20) — más de 16,381 tareas dan columnas después de `XFD`
- **El hallazgo es válido.** M-03, aprobada por el humano, le da a «demasiado» el papel de detener lo que no cabe en un solo archivo, y el tope de columnas de la hoja no estaba en esa cuenta. Es muy improbable, pero hoy produce un archivo roto en silencio en lugar de avisar.
- **Remedio en dos capas** (las dos, sin texto nuevo):
  1. **El recorrido** (`recorrerLaExportacion`, `hooks.ts`). En la misma comprobación que ya hace con la primera respuesta, además de `necesarias > MAXIMO_DE_PETICIONES_DE_EXPORTACION`, devuelve `{ tipo: "demasiado" }` si la hoja no cabe: `totalTareas` + las 3 columnas fijas (Alumno, Correo y Promedio) > 16,384. No pide nada más, y el aviso es el de M-03 («Esta clase tiene demasiadas calificaciones para exportarlas en un solo archivo.», sin promesa de reintento). Con 16,381 tareas cabe (la última columna es `XFD`); con 16,382, no. Va como función pura en `lib.ts` (por ejemplo, `cabeEnUnaHoja(totalAlumnos, totalTareas)`), con las 3 columnas fijas como constante en `data.ts` sin nombrar el correo. Si las tareas crecen a mitad del recorrido, la regla 1 de §D-4 ya da `cambio`, así que las columnas de la matriz nunca pasan de las de la primera respuesta. Por filas no hace falta en el recorrido: con el tope de 200 ventanas, los alumnos no pasan de 20,000.
  2. **El escritor** (`armarLibroXlsx`, `lib/xlsx.ts`). Lanza (`Error`, error de programación, como los demás de §D-5.1) si una fila tiene más de 16,384 celdas, si hay más de 16,384 anchos o si hay más de 1,048,576 filas, antes de armar nada. Exporta `MAXIMO_DE_COLUMNAS_XLSX = 16_384` y `MAXIMO_DE_FILAS_XLSX = 1_048_576` para que lo use la capa 1. Es el mismo criterio con que ya lanza ante los otros límites de Excel (nombre de 31 y texto de 32,767). La salida de CAL2-B01 a B03 no cambia.
- **Casos nuevos** (archivos del programador):
  - CAL2-B03: 16,384 columnas no lanza y la última referencia es `XFD`; 16,385 lanza; 16,385 anchos lanzan; más de 1,048,576 filas lanza. Sin armar un millón de filas de verdad: basta un arreglo de ese largo, porque el escritor lanza antes de recorrerlo.
  - CAL2-B04, o la prueba de la función pura: 16,381 tareas caben y 16,382 no, también con 0 alumnos.
  - CAL2-B10: una primera respuesta con `totalAlumnos: 1` y `totalTareas: 16382` da una sola petición, el aviso de demasiadas, ninguna descarga y el botón fuera de la espera.
- **Por qué CAL2-T-20 es incorrecta:** exige que `armarLibroXlsx(hojaDeExportacion(matriz))` con 16,382 tareas dé una hoja sin referencias después de `XFD`. Eso solo se cumple quitando columnas sin avisar, es decir, perdiendo calificaciones en silencio, que es justo lo que el plan prohíbe («sin valor inventado», Enmienda 1). Su propio «Esperado» admite la otra salida: «o la exportación se detiene con un aviso». **Decisión:** antes de que corrija el programador, el tester reescribe CAL2-T-20 para que afirme el comportamiento arbitrado:
  - (a) con esa matriz, `armarLibroXlsx(hojaDeExportacion(…))` lanza y nunca devuelve una hoja que pase de `XFD`;
  - (b) por la vista, una primera respuesta con 16,382 tareas da una sola petición y el aviso de demasiadas, sin descarga.

  El programador no la toca (`AGENTS.md`). Esa reescritura no cuenta como ronda.
- **¿Cabe en §D-4, §D-5.1 y §D-8 tal como están?**
  - §D-8: sí, sin cambios (el texto `demasiado` ya existe).
  - §D-4 y §D-5.1: son extensiones de la condición de «demasiado» y de la lista de «Lanza», dentro de la intención de M-03 y de la forma de §D-5.1. No hace falta enmienda; queda registrado aquí.
- **Hermanos que el resumen tiene que listar:** los demás límites de Excel y cómo los cubre cada uno:
  - filas: escritor; en el recorrido es inalcanzable;
  - texto de una celda (32,767): ya lanza;
  - nombre de la hoja: fijo y ya validado;
  - ancho de columna (máximo 255): los anchos son fijos de 14 a 36.

  Los estados vecinos de la comprobación del recorrido son: la primera respuesta con 201 ventanas; con 16,382 tareas; con las dos condiciones a la vez; la clase que crece a mitad del recorrido (`cambio`); y la que llega a 200 peticiones.

### N-07 — sí, en esta misma ronda
Lo dije en la verificación del resumen y se mantiene. CAL2-T-21 confirma que es inalcanzable, pero un respaldo silencioso que, si se alcanzara, mezclaría celdas y columnas contradice `CLAUDE.md` y la Enmienda 1. En `combinarVentanasDeExportacion`:
- la celda que falta en la regla 8 lanza (`Error`), como ya hace la fila;
- `respuestas[0]?.tareas ?? primera.tareas` y `porVentana[0]?.filas ?? primera.alumnos` dejan su respaldo: lanzan, o el código se reordena para que no haga falta.

El programador lista como hermanos los demás `??` del código nuevo de 02b (por ejemplo, `ENTIDADES[c] ?? c` y `tabla[…] ?? 0` en `lib/xlsx.ts`) y dice de cada uno si oculta un dato. Los de un índice que siempre está en rango por construcción pueden quedarse, con un comentario que diga por qué.

### O-r1b-1 — es un riesgo nuevo y va al humano
- **No está dentro de R-02 tal como se le presentó al humano.** R-02 dice que §D-4 «rechaza lo que se ve (alumnos, actividades, totales, promedios)» y que solo se escapa «un cambio de estado sin calificación». DH-02 (a) prometió lo mismo («si entre dos ventanas cambió algo que se ve»). El caso del tester sí se ve: una baja y un alta que se compensan entre dos páginas de alumnos dejan en el archivo a un alumno ya dado de baja y sin el nuevo.
- **No se puede detectar con lo que da la API.** Sería un cambio de diseño en el backend de 02a, ya cerrado, por ejemplo una marca de la lista de inscritos en cada respuesta. Solo pasa en clases de más de 100 alumnos (el piloto ronda 30) y en el instante del recorrido.
- **Mi recomendación al humano:** aceptarlo como una ampliación de R-02. Si lo acepta:
  - el orquestador actualiza el texto de R-02 en el cierre de 02b;
  - el texto de A-02 ya aplicado en ESSENTIALS («no arma el archivo si la clase cambió entre dos ventanas») pasa a «no arma el archivo si detecta que la clase cambió entre dos ventanas (riesgo residual R-02 de CALIFICACIONES-02)».

  Si no lo acepta, es un encargo de backend aparte, no una corrección de 02b. **No frena la corrección de esta ronda.**

### O-r1b-2 — no pide nada
El retorno de carro se conserva como pide §D-5.1, y cualquier lector de XML lo normaliza a salto de línea al abrir el archivo. No se pierde texto, y hoy no se alcanza porque el servidor normaliza los saltos. Queda como observación, sin cambio y sin fila en ESTADO.

### Lo que el programador puede tocar en esta corrección
- **Producción:**
  - `frontend/src/features/calificaciones/lib.ts`: `nombreDelArchivoDeExportacion`, la función pura de la hoja que cabe y N-07 en `combinarVentanasDeExportacion`.
  - `frontend/src/features/calificaciones/hooks.ts`: solo la comprobación de la primera respuesta en `recorrerLaExportacion`.
  - `frontend/src/features/calificaciones/data.ts`: la constante de las 3 columnas fijas, sin nombrar el correo.
  - `frontend/src/lib/xlsx.ts`: los dos máximos exportados y sus `throw`.
- **Pruebas:** solo sus propios archivos de 02b (`exportacion-02b.test.ts`, `exportar-02b.test.tsx`, `lib/xlsx.test.ts`) con los casos de arriba. Ninguna `*.ataque`. Ningún archivo de la lista "No se toca" de 02b.
- **El resumen** trae lo de siempre: cada caso nuevo con su título, las cifras de `npx vitest list` y de la corrida, y lint, test y build con su última línea. Trae además los hermanos y los estados vecinos de T-01, T-02 y N-07 que listé arriba, uno por uno.

### Orden
1. El tester reescribe CAL2-T-20 según la decisión de arriba, sin tocar CAL2-T-18 ni las demás.
2. El programador corrige T-01, T-02 y N-07.
3. Manager: verificación del resumen.
4. Tester: ronda 2.

## Verificación de la corrección de la ronda 1 — 02b

Veredicto: **ACEPTADO.** Puede ir la ronda 2 del tester. No hay M-nn.
Resumen verificado: "Corrección de la ronda 1 — 02b" en `resumen-programador.md` (SHA-256 del archivo `f10e565844e8c6366e5eb18da8f07c9af9dcd29408879b7ac182c502a7c03a14`, reproducido). Remedio de referencia: "## Arbitraje de la ronda 1 — 02b" de este archivo.

### Mis corridas (una cada vez, sin nada en paralelo)
- **Carga:** antes del lint, 19 % y 13 %. Antes de la suite subió a 37 % y 45 %; esperé con un ciclo de lecturas hasta tener dos seguidas en 25 % o menos (17 % y 21 %), y entonces la lancé.
- **Paquetes sin cambios:** `git diff --quiet 57192e2 -- shared backend` sale con 0. Las 94 `*.ataque` del backend siguen iguales a la tabla de la ronda 1 de 02a.

| Comando | Mi corrida (última línea) | Resumen | ¿Coincide? |
|---|---|---|---|
| `cd frontend; npm run lint` | `> tsc -b`, salida 0 | igual | Sí |
| `cd frontend; npm run test` | `Test Files  280 passed (280)` · `Tests  6054 passed (6054)` · 259.18 s | 280 / 6054 · 385.90 s | Sí |
| `cd frontend; npm run build` | `✓ built in 820ms`, salida 0 | `✓ built in 2.32s` | Sí (el tiempo varía) |

Conteos con `cd frontend; npx vitest list` (contados con `grep -a`): todos coinciden con el resumen.
- 280 archivos y 154 `*.ataque`.
- 89 casos `CAL2-B` y 12 `CAL2-T`.
- `CAL2-B` por archivo: `lib/xlsx.test.ts` 16, `lib/xlsx-muestra.test.ts` 1, `services/descargaService.test.ts` 1, `exportacion-02b.test.ts` 21, `exportar-02b.test.tsx` 31, `recuperar-exportacion-02b.test.tsx` 13 y `estatico-02b.test.ts` 6.
- La cuenta 6045 + 1 (CAL2-T-20 b) + 8 = 6054 cuadra.

Los 8 títulos nuevos del resumen existen tal cual (cotejo literal con " > <título>"):
- 4 de CAL2-B06;
- CAL2-B03 (T-02), CAL2-B04 (`cabeEnUnaHoja`), CAL2-B05 (T-02) y CAL2-B10 (T-02).

CAL2-T-18 y CAL2-T-20 (a) y (b) están en verde en mi corrida.

La muestra de CAL2-B17 que escribió mi corrida (`C:\Users\Carlos\AppData\Local\Temp\cmep-calificaciones-muestra.xlsx`, 18,628 bytes, 12:51) tiene SHA-256 `a56f9a56…`, el de H-0. Una hoja válida sale con los mismos bytes.

### V-01 y "No se toca"
- **Frontend:** las 154 `*.ataque` coinciden byte a byte con la tabla de la ronda 1 de 02b, en la que puse el hash nuevo de la reescritura de CAL2-T-20 (`bef8aa53…`, antes `0cab4d2b…`; "Reescritura de CAL2-T-20" del reporte). La comparación con `diff` no da diferencias.
- **Archivos que tocó el programador:** todos están en la lista del arbitraje.
  - Producción: `lib.ts`, `hooks.ts`, `data.ts` y `lib/xlsx.ts`.
  - Pruebas: `exportacion-02b.test.ts`, `exportar-02b.test.tsx` y `lib/xlsx.test.ts`.
- **El resto:** `git status` sobre los paquetes muestra el mismo conjunto de 02b de antes, más la `*.ataque` del tester. Nada en "No se toca".

### Los remedios contra el arbitraje
- **T-01** (`recortarSinPartirGrafemas`):
  - Recorta con `Intl.Segmenter` por grafemas enteros hasta 80 puntos de código. El primero que no cabe corta todo lo que sigue.
  - Después vuelve a quitar los puntos y espacios del final, y sin clase da el nombre sin clase.
  - Sin `Intl.Segmenter` recorta por puntos de código y no lanza.
  - No usa `new RegExp(`, `\p{L}` ni invisibles literales; las pruebas arman los emojis con `String.fromCodePoint`.
  - Los cuatro casos nuevos de B06 cubren lo que pedí, incluida la restauración de `Intl.Segmenter` en el `finally`.
- **T-02, las dos capas:**
  - El recorrido devuelve `demasiado` con la primera respuesta si `necesarias > 200 || !cabeEnUnaHoja(…)`.
  - `armarLibroXlsx` valida el tamaño (`validarTamano`) antes de armar nada, con las dos constantes exportadas.
  - B03, B04 y B10 cubren los bordes que pedí: 16,384 columnas llegan a `XFD`; 16,385 lanzan; 16,381 tareas caben y 16,382 no.
- **N-07:** los tres respaldos lanzan.
  - La celda que falta en la regla 8 lanza.
  - El grupo sin respuestas lanza.
  - La exportación sin ventana de referencia lanza.
- **Hermanos y estados vecinos:** están completos y coinciden con el código.
  - De T-01, los siete: otro recorte, grafema exacto, grafema que cruza, clase vacía, punto o espacio final, sin `Intl.Segmenter` y emoji de un solo punto.
  - De T-02, los cinco límites de Excel y los cinco estados del recorrido.
  - De N-07, los seis `??`. Lo comprobé con `grep`: el código nuevo de 02b no tiene otros.
- **La matriz de avisos:** solo cambian la fila de `demasiado` (también cuando la hoja no cabe) y la del genérico (también cuando `hojaDeExportacion` o `armarLibroXlsx` lanzan, y los respaldos de N-07). Es lo que hace el componente: lo que se lanza dentro de la mutación da el genérico y `demasiado` da el texto de M-03.

### Las tres decisiones que me pidieron
1. **`hojaDeExportacion` también lanza si la matriz no cabe: la acepto.**
   - Es el mismo criterio de «antes de armar nada» del arbitraje, en `lib.ts`, que el programador podía tocar.
   - No agrega texto, contrato ni camino nuevo: si se alcanzara, el error se lanza dentro de la mutación y da el aviso genérico, como cualquier otro.
   - Desde la interfaz es inalcanzable, porque el recorrido ya lo detiene con `demasiado`. Evita recorrer miles de celdas para después tirar el resultado.
   - Que `cabeEnUnaHoja` también cuente las filas también lo acepto: así el recorrido, la hoja y el escritor usan el mismo criterio.
   - El motivo que da (el tiempo de CAL2-T-20 (a) con el equipo cargado) no sería suficiente por sí solo, pero el cambio se sostiene sin él.
2. **Los tres `??` que se quedan en `lib/xlsx.ts`: aceptables.**
   - La regla de `CLAUDE.md` es contra los respaldos que ocultan datos que faltan (`data ?? []`, o `estadoPago`, `rol` y `calificacion` sin dato). Estos tres solo satisfacen `noUncheckedIndexedAccess` sobre índices que están en rango por construcción:
     - las cinco llaves que encuentra la expresión;
     - la máscara `& 0xff` sobre una tabla de 256;
     - un desplazamiento por parte, en el mismo orden.
   - Cada uno lleva su comentario y ninguno toca un dato de la persona.
   - Si alguno se equivocara, CAL2-B01, que compara byte a byte y con `crc32` de `node:zlib`, lo detectaría.
   - `columna.categoria?.nombre ?? sinCategoria` es un valor explícito válido (§D-5.2), igual que `instrucciones ?? ""` en `CLAUDE.md`.
3. **N-07 sin prueba propia: basta.**
   - Los tres `throw` no se alcanzan ni llamando a la función pura con entradas fabricadas: las reglas 3 a 5 se comprueban antes, y los grupos nacen con una respuesta.
   - Probarlos exigiría un doble de la propia función.
   - Lo que importa (toda matriz aceptada tiene una celda por columna, en orden) lo cubre CAL2-T-21 con 3,000 combinaciones, y sigue en verde.

### Observaciones (no bloquean)
- El escritor no valida el ancho máximo de columna (255). Con los anchos fijos del encargo (de 14 a 36) es inalcanzable. Queda como observación del resumen, sin fila en ESTADO.
- La primera corrida acotada del programador, con la carga en 59 % y 46 %, tuvo rojos por tiempo (CAL2-T-20 a y CAL-T-159). Él los declaró y repitió con el equipo descargado. Mi suite con el equipo descargado está en verde. Es otro ejemplo de por qué se mide la carga antes de correr, no un defecto.
- El punto 3 de "Decisiones" del resumen dice que los escapes `\u202E` y `\u2066` de `exportacion-02b.test.ts` habían quedado como caracteres literales en la primera versión de 02b. Ya están de vuelta como escapes. Ninguna regla estática los atrapó porque las de invisibles leen producción y CAL-T-185 solo busca emojis. Es un detalle para el tester en la ronda 2, no un hallazgo: hoy el archivo está bien.
- O-r1b-1 sigue con el humano (ver el arbitraje).

## Revisión final — 02b y cierre de CALIFICACIONES-02

Veredicto: **APROBADO.** No hay problemas que bloqueen ni M-nn. 02b puede ir al commit del humano (`<K2b>`) y CALIFICACIONES-02 queda listo para la comprobación humana H-1 a H-7.

**Verificación propia** (una cosa cada vez, sin nada en paralelo):
- **Carga:** antes del lint, 18 % y 17 %; antes de la suite, 10 % y 11 % (las dos con dos lecturas seguidas en 25 % o menos).
- **Paquetes sin cambios:** `git diff --quiet 57192e2 -- shared backend` sale con 0. Las 94 `*.ataque` del backend siguen iguales a la tabla de la ronda 1 de 02a.

| Comando | Última línea |
|---|---|
| `cd frontend; npm run lint` | `> tsc -b`, salida 0 |
| `cd frontend; npm run test` | `Test Files  281 passed (281)` · `Tests  6062 passed (6062)` · 263.51 s |
| `cd frontend; npm run build` | `✓ built in 840ms`, salida 0 (solo el aviso de siempre del tamaño de los chunks) |

Conteos con `cd frontend; npx vitest list` (contados con `grep -a`): 281 archivos, 155 `*.ataque`, 89 casos `CAL2-B` y 20 `CAL2-T` (12 de la ronda 1 y 8 de la ronda 2). Coinciden con el tester (281 / 6062) y con la cuenta 6054 + 8.

### 1. El diff contra el plan
- **02b hizo lo planeado, solo lo planeado y todo lo planeado:**
  - `lib/xlsx.ts` con los literales de §D-5.1, comprobados byte a byte por B01 a B03; H-0 bien.
  - `lib/lector-xlsx-de-prueba.ts`, que solo importan pruebas.
  - `services/descargaService.ts`.
  - `types.ts`, `data.ts`, `lib.ts` y `hooks.ts` del módulo (§D-4 a §D-8).
  - `ExportarAExcel` y su única inserción en `gradebook-view.tsx`.
  - La lista cerrada de `estatico-01d.test.ts`.
  - CAL2-B01 a B17.
- **Lo que se agregó después del plan**, cada cosa con su registro:
  - T-01: el recorte por grafemas, que aplica DH-03.
  - T-02: el tope de la hoja en el recorrido, `hojaDeExportacion` y el escritor, dentro de M-03.
  - N-07.

  Están en "Arbitraje de la ronda 1 — 02b" y en "Verificación de la corrección de la ronda 1 — 02b" de este archivo, y en `aprobacion.md`. Sin dependencias nuevas: `package.json` y `package-lock.json` no cambian.

### 2. V-01 y las `*.ataque`
- **Frontend:** las 155 `*.ataque` coinciden byte a byte con la tabla de la ronda 2 de 02b (`diff` sin diferencias; hash conjunto `a2f82829…`).
- **Cambios contra `57192e2`:**
  - Las únicas `*.ataque` cambiadas son C-3 y C-4, del tester en la ronda 0.
  - Las dos nuevas son `exportacion-02b-r1` (con CAL2-T-20 reescrita por el arbitraje) y `exportacion-02b-r2`, las dos del tester.
- **El programador no modificó, saltó ni borró ninguna.**
- **`exportacion-02b-r2.ataque.test.tsx`:** fija el reloj (`useFakeTimers` y `setSystemTime`) y no usa selectores de estilo.

### 3. "No se toca"
- **Dentro de los paquetes, contra `<K2a>` = `57192e2`:** solo cambian los archivos permitidos de 02b (sección 1).
  - Nada en `app/`, `components/` (ni `foco/`), `styles/` fuera de C-4, los demás módulos, los cinco componentes vedados de `features/calificaciones/`, `package*.json`, `tsconfig*`, ni la configuración de Vite o Vitest.
  - Nada en `shared/` ni en el backend.
- **Fuera de los paquetes, contra `ff09e69`:**
  - Cambian `CLAUDE.md` (A-09), `docs/ARCHITECTURE-ESSENTIALS.md` (A-01 y A-02), `docs/ARCHITECTURE.md` (A-03 a A-07), `docs/DESIGN.md` (A-08), `docs/ESTADO.md` (excluido) y esta carpeta.
  - La línea de cierre de CLASES-03 en su `aprobacion.md` ya entró en `<K2a>`.
  - `AGENTS.md`, `.claude/`, `infra/`, `.github/` y los archivos de la raíz no cambian.
- **Hashes actuales:** ESSENTIALS `1cc016f5…`, ARCHITECTURE `72126105…`, DESIGN `a03be967…` y CLAUDE `f87cd7b0…`. Coinciden con los que dio el orquestador.

### 4. Los documentos de cierre, contra el plan y el código
- **A-02 (de 02a), con el ajuste de R-02:** la ruta, las ventanas de 100 × 100, la instantánea, `leerGradebookCon` y «no arma el archivo si detecta que la clase cambió entre dos ventanas (riesgo residual R-02 de CALIFICACIONES-02)». Coincide con la decisión del humano sobre O-r1b-1 (opción A, en `aprobacion.md`).
- **A-03:** es el texto literal del plan, insertado antes de « (CALIFICACIONES-01) |», como pedía. La fila queda terminada en «…CALIFICACIONES-02) (CALIFICACIONES-01) |»; ver "Detalles".
- **A-04:** la viñeta de CALIFICACIONES-02 se quitó de "Rutas previstas" y el párrafo quedó intacto.
- **A-10:**
  - las filas de ADMIN-01 (P-08), FORO-01 y DEPLOY (R-07);
  - la frase de N-52;
  - la fila del punto 9, con destino el `chore` de foco y navegación del marco.
- **A-01, A-05, A-06 y A-07:** literales del plan y ciertos para el código: escritor propio en `lib/xlsx.ts`, sin dependencia, y JSON por ventanas.
- **A-08 (`DESIGN.md` §7.28):**
  - Están la viñeta nueva, el «Panel» de N-03 y la frase del correo solo en el archivo.
  - Los textos coinciden con `data.ts`: «Se descargó «…».», el aviso de vacío, el de demasiadas, «Correo», «Promedio (%)», «Sin categoría» y «—».
  - También coinciden con el componente: `outline` `sm`, `FileSpreadsheet`, `enEspera` y la guarda.
  - **El patrón visual nuevo quedó documentado en el mismo encargo**, como pide `AGENTS.md`. No hay pantalla nueva para §7.1.
- **A-09 (`CLAUDE.md`):**
  - la fila `calificaciones` de la tabla de módulos;
  - `lib/xlsx.ts`, después de `lib/errores-de-api.ts`;
  - `services/descargaService.ts`, después de `services/almacenService.ts`;
  - «cuyas consultas y cuya exportación nunca muestran texto del servidor», con DH-12 (a).

### 5. Definición de terminado
- [x] RF-65: alumnos × actividades con categorías, puntos y promedio, el mismo cálculo que el gradebook (CAL2-A04), para los maestros de la clase y el admin, con nombre y correo y nunca estado de pago ni restricción (P-13; CAL2-A02, B05, B09 y T-15).
- [x] Capas y middleware: la ruta de 02a con la cadena del gradebook; nada de seguridad solo en el frontend.
- [x] `lint`, `test` y `build` en verde (corrida propia; el backend en la revisión final de 02a, sin cambios desde entonces).
- [x] Pruebas de autorización del endpoint (02a).
- [x] Sin migración, sin cambios en `infra/` ni en `.env.example`.
- [x] Documentos actualizados (sección 4).

### 6. Reglas que no se rompen y estilo
- **Archivos:** no pasan por Node ni por el almacén: el .xlsx se arma en la página y se entrega con un `Blob`.
- **Red:** sin `fetch(` fuera de `apiClient` y `almacenService`.
- **Errores:** ningún texto del servidor llega a la persona.
- **Caché:** en la de mutaciones solo queda el nombre del archivo.
- **Estilo de módulos:** tipos en `types.ts`, textos y constantes en `data.ts`, funciones puras en `lib.ts`, ganchos en `hooks.ts`, y el componente solo con su `Props`.
- **Errores en el frontend:** `throw` solo dentro de la mutación; `try/catch/finally` con aviso en el manejador.
- **Valores por defecto:** sin respaldos silenciosos sobre datos (N-07 corregida; los tres `??` de índices en rango están justificados).
- **Sin anidar:** ni if/else anidados ni ternarios anidados en JSX.

### Lista de diseño (02b toca `frontend/`)
- **Coincide con `DESIGN.md` §7.28 y el patrón quedó documentado** (A-08).
- **Solo tokens:** el botón no trae color, tamaño, radio ni sombra sueltos. `self-start` es colocación. El .xlsx no declara colores (V-02 a V-05 en verde).
- **Componentes:** `Button` de `components/ui/`, `outline` `sm`, sin `disabled`, con `enEspera`. Nada hecho a mano y nada con el aspecto por defecto de shadcn/ui.
- **Rasgos prohibidos:** ningún degradado, mancha ni vidrio nuevo; el gradebook sigue opaco.
- **Estado:** no se comunica solo con color; el botón no tiene estados de color, y la espera va en `aria-busy` con su indicador.
- **Densidad y acción principal:** acorde al rol, y una sola acción principal por vista (el botón es `outline`; CAL-T-186).
- **Textos:** en español de México, concretos, sin emojis. Los avisos sin promesa falsa de reintento son el de vacío y el de demasiadas.
- **Errores, carga y vacío:** el botón no aparece en los vacíos, en la carga ni con un error que reemplaza la vista; los avisos cubren cada error.
- **Foco y accesibilidad:** el foco se queda en el botón, va a la raíz si la vista se reemplaza (B12), y el botón tiene su nombre accesible.
- **360 px:** el botón es `sm` y `self-start`. No lo puedo ver sin navegador; queda dentro de H-6.

### 7. Medición del programador en 02b (y en el encargo)
- **02a:** 0 rondas extra (la ronda 1 RESISTE); 1 resumen, aceptado; 0 PARADAS.
- **02b:** 1 ronda extra (la ronda 1 ROTO; la ronda 2 RESISTE), **0 por hermanos o estados vecinos**.
  - T-01 fue una contradicción del plan (§D-6 contra DH-03).
  - T-02 fue un tope que el plan no incluyó en la cuenta de M-03.
  - Ninguno vino de un remedio que no se extendiera.
- **Resúmenes:** 2 (implementación y corrección), los dos aceptados, 0 devueltos.
- **PARADAS:** 1, la de control H-0, prevista por el plan (DH-10). No es un incidente.
- **Encargo completo:** 3 rondas del tester, 1 extra y 0 por hermanos; 3 resúmenes, 0 devueltos; 0 PARADAS imprevistas.
- **Desviaciones de proceso, declaradas por el programador:** corridas lanzadas con la carga por encima del 25 % (en 02a y en la primera corrida acotada de la corrección de 02b). No cambiaron ninguna cifra, porque mis corridas con el equipo descargado dan lo mismo.
- **La regla de `AGENTS.md`** (2 o más rondas extra por hermanos pasan al `programador` a `opus`) **no se activa.**

### 8. Pendientes con destino y observaciones
**Con destino (ESTADO §3, ya escritos):**
- P-08 en la exportación → ADMIN-01.
- El foro en la exportación → FORO-01.
- Desplegar primero el backend (R-07) → DEPLOY.
- El punto 9 (la clave de foco con dos respuestas en el mismo milisegundo) → el `chore` de foco y navegación del marco.

**Aceptado por el humano:** R-02 ampliado con O-r1b-1 (opción A).

**Observaciones sin fila:**
- O-r1-1: `z.coerce` acepta `0x64` y `1e2`, como el gradebook.
- O-r1b-2: el retorno de carro se normaliza al abrir.
- El ancho máximo de columna (255) no se valida; es inalcanzable con los anchos fijos.
- El navegador sin `Intl.Segmenter` solo se probó en jsdom.

### Detalles (no bloquean; el orquestador puede ajustarlos antes del commit)
- **La marca de A-08 en `DESIGN.md` §7.28.** Dice «(CALIFICACIONES-02, propuesta)». Los encargos anteriores usan «propuesta (CLASES-03e)», «propuesta (CLASES-02c)», etc., la forma que §11 convierte después en «propuesta aprobada (fecha)».
  - Recomiendo «(propuesta (CALIFICACIONES-02b))» en la viñeta nueva.
  - Recomiendo la misma marca al final del «Panel» que reescribió N-03, que hoy no lleva ninguna.
  - Cuando el humano dé por buena H-1 a H-7, las dos pasan a «propuesta aprobada (fecha)».
- **`DESIGN.md:662` quedó desactualizada.** La viñeta «Secciones» de §7.3 termina en «"Exportar a Excel" del gradebook (RF-65) lo diseña CALIFICACIONES-02.» Propongo «… lo diseñó CALIFICACIONES-02 (§7.28).». El plan no la listaba en A-08.
- **El cierre de la fila `calificaciones` de `ARCHITECTURE.md` §7** queda «…; CALIFICACIONES-02) (CALIFICACIONES-01) |». Es literal del plan; se lee raro, pero es correcto. Opcional: «(CALIFICACIONES-01 y CALIFICACIONES-02) |».

### Hoja de comprobación humana (máximo 10 minutos y 7 puntos; H-0 ya se hizo)
**Preparación:** una clase con al menos dos alumnos (uno con acento o ñ en el nombre), dos categorías, una tarea sin categoría, una calificada con retraso, una entregada sin calificar y una vencida sin entregar.

1. **H-1 · Maestro, descarga:** en Calificaciones, «Exportar a Excel» está entre el resumen y los botones de las ventanas. Al pulsarlo se ve la espera; se descarga `Calificaciones - <clase> - <fecha de hoy>.xlsx` y aparece «Se descargó «…».» una sola vez.
2. **H-2 · Excel (escritorio o web):** abre sin el aviso de reparar; los acentos y la ñ se ven bien. Al seleccionar las calificaciones de una actividad, la barra de estado muestra su suma (son números).
3. **H-3 · Otro programa:** el mismo archivo abre sin error en LibreOffice Calc, Numbers o Google Sheets (importar).
4. **H-4 · Contenido:**
   - las tres filas de encabezado en negrita y fijas al bajar, y «Alumno» y «Correo» fijas al ir a la derecha;
   - las actividades de la más antigua a la más reciente, con su categoría («Sin categoría» en la que no tiene) y sus puntos;
   - los estados en palabras («Asignado», «Entregado», «Entregado con retraso», «Sin entregar»);
   - «Promedio (%)» igual al del gradebook en dos alumnos, y «—» donde no hay;
   - ninguna columna de estado de pago ni de restricción.
5. **H-5 · Administrador:** lo mismo desde `/admin/clases/<id>/calificaciones`, con una clase cuyo nombre lleve `/` o `:`. En el nombre del archivo pasan a espacio.
6. **H-6 · Teléfono (Safari en iOS o Chrome en Android), como maestro:** el botón cabe en la pantalla sin desbordar, y el archivo se descarga o se ofrece para abrir, y abre.
7. **H-7 · Lector de pantalla (NVDA o VoiceOver):** el botón se anuncia «Exportar a Excel», ocupado mientras exporta, y el aviso de éxito se lee.

Lo que las pruebas ya cubren, y no se repite a mano:
- los textos de error y de demasiadas;
- el doble clic;
- salir a mitad de la exportación;
- el escape de fórmulas y caracteres raros;
- el recorte del nombre;
- los topes de Excel;
- el contraste.

Quedan como «no verificadas por decisión del humano, cubiertas por pruebas automáticas».
