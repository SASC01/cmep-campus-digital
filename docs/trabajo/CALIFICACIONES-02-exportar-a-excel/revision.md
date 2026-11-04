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
