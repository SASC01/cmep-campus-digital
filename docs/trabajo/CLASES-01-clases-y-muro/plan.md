# Plan — CLASES-01 · clases, personas y muro (inicio de estudiante y maestro, crear y editar clase, código de invitación, compañeros y roster, alta manual, muro con comentarios y adjuntos)
Estado: LISTO. Aprobado por escrito por el humano el 2026-09-29 (carril sensible): P-01 a P-04, R-10 y R-19 con la recomendación; P-05 con la recomendación en (a) a (e), y cambios del humano en (f) y (g). La aprobación la registra el orquestador en `aprobacion.md`.
Enmienda 1 (revisión del manager): M-01 y M-02, N-01 a N-09, detalles menores y la nota (g) de P-05.
Enmienda 2 (decisiones del humano del 2026-09-29 y observaciones de la revisión de la enmienda 1): correo enmascarado en el buscador, `movimientos_inscripcion`, O-01, O-02 y detalles menores.
Enmienda 3 (revisión de la enmienda 2): M-03, N-10, N-11 y el enmascarado de una parte local de 1 carácter. Solo cambia CLASES-b.
Enmienda 4 (cierre de CLASES-a): regla de la guarda (T-02 y T-13), separadores del código (T-15), nombre de una sola línea (T-16), `normalizarTextoLargo` antes de validar (T-01), cursor inválido en `inscritas` e `impartidas` (T-18), errores que no son de un campo (T-19), texto sobre vidrio azul (M-06), C-16, PA-09 registrada, pendientes nuevos, N-04 a CLASES-b, H-6 y la base de b.
Enmienda 5 (cierre de CLASES-b): ejemplo de PR-B01b y mínimo de 3 con espacios (D-2), textos de §D-B6, longitud del término sobre el normalizado y normalización única en `shared/` (T-20, T-24), foco en el roster (T-21 a T-23) y su extensión de la ronda 4 (T-25, T-26), C-17, PR-B05 con 40,000 filas, pruebas normales nuevas, pendientes con destino (dos autorizaciones nuevas para c), la base de c y los textos propuestos de b.
Enmienda 6 (arranque de CLASES-c): regla única de contenido visible (§D-C4, C-18) y los cuatro triviales heredados de b (aviso de "Agregar a la clase", `focoPerdido`, `claseId ?? ""` y la línea de `DESIGN.md` §7.14), que entran en c por decisión del humano del 2026-10-01.
Enmienda 7 (PA-16 en CLASES-c): el caso E6 de `backend/test/bloqueo-usuario.integracion.test.ts` suma `publicaciones.ts` a su lista cerrada de SQL etiquetado en `adapters/db`, y la búsqueda de listas cerradas de la ronda 0 incluye las pruebas normales.
Enmienda 8 (ronda 1 de CLASES-c, arbitrajes del manager): cursor borrado en el muro y en los comentarios (T-29), avisos de crear en los hooks (T-30), `normalizarTextoLargo` en `shared/` y en los formularios (T-31), los máximos y mínimos de cadena cuentan en puntos de código (T-32, C-20) y mensajes en español del tipo y de la descripción del material (T-33).
Enmienda 9 (cierre de CLASES-c): texto del cursor inválido en el muro y en los comentarios (T-34, PR-C17), "Muro" recupera el muro en error (T-35, cuarta ronda autorizada por el humano, PR-C18), copia de `errorCursorInvalido` en `publicaciones.ts` (D-1), N-C4, desviaciones aceptadas, pendientes con destino, textos de cierre (c), la base y las cifras de d.
Carril: sensible (las cuatro subentregas; el motivo de cada una está en "Alcance", "Subentregas"). La revisión humana del diff no es obligatoria (`AGENTS.md`, "Commits y cierre de subentregas").
Requisitos: RF-10 (parcial), RF-11, RF-12 (parcial: sin tareas), RF-19, RF-25, RF-30 (parcial), RF-31, RF-33, RF-38 y RF-39; RN-02, RN-03, RN-04 y RN-06. Diferidos con destino: RF-32 y RF-43. Contexto: ESSENTIALS "Autorización", "Reglas de datos", "Asíncrono y notificaciones" y "Archivos"; `ARCHITECTURE.md` §6, §7, §8, §11 y §14; `DESIGN.md` §4 a §8.
Rama: `feat/clases`. Arrancó en `3399c79`, con el mismo contenido que `origin/main` (`1eb9080`, fusión del PR #15). Ningún agente crea ni cambia de rama.
Antecedentes de forma: `docs/trabajo/AUTH-03-ajustes-de-cuentas/plan.md` (subentregas, ronda 0, PARADAS, verificaciones y "No se toca"). Pendientes que llegan a este encargo: `docs/ESTADO.md` §2b y §3 (tabla "Pendientes de `ESTADO.md`", abajo). Revisiones del manager: `revision.md`.

**Marcadores de commit:**
- `<R>` = `3399c79`, el commit con que arrancó la rama;
- `<Ca>`, `<Cb>` y `<Cc>`: los commits de CLASES-a, -b y -c. El orquestador los lee con `git log` después de cada commit y los anota en `aprobacion.md`. El humano nunca da un hash. `<Ca>` = `855069b`. `<Cb>` = `e9df1f0`.

No hay commit de aprobación del plan.

---

## Enmienda 9 — cierre de CLASES-c (decisiones y arbitrajes de la implementación)
Registra en el texto del plan lo que se decidió y se construyó en CLASES-c. Las fuentes son:
- `aprobacion.md`: "CLASES-c (desde el 2026-10-01)", "Decisión del humano sobre la escalada de CLASES-c" y "Cuarta ronda de CLASES-c";
- `revision.md`: "Verificación del resumen — CLASES-c — corrección de la ronda 2" (línea 2758) y "Revisión final — CLASES-c" (desde la 2833), con "Documentos a actualizar al cierre de c", "Lo que debe registrar la Enmienda 9" y "Cuarta ronda y cierre";
- `resumen-programador.md`: "CLASES-c — corrección de la ronda 2" (línea 1404) y "CLASES-c — cuarta ronda (T-35)" (línea 1445);
- `reporte-tester.md`: "CLASES-c — Ronda 2" (línea 2976) y "Ronda 3" (línea 3202).

CLASES-c está en la **cuarta ronda, corta y cerrada**, autorizada por el humano (opción (A) mínima de M-23). La corrección ya está entregada, el manager la verifica y falta la regresión final del tester ("CLASES-c — Ronda 4, regresión final"), que publicará la tabla de SHA-256 de cierre. No hay quinta ronda.

No cambia ninguna decisión de d, salvo la base y las cifras (punto 8). El estado sigue en LISTO.

| # | Qué cambió | Origen | Dónde |
|---|---|---|---|
| 1 | **T-34: texto del cursor inválido en el muro y en los comentarios.**<br>- `mensajeDeErrorDeLista(error, textoDelCursor)`, pura, en `lib.ts`: si el error es un `VALIDACION` del campo `cursor`, devuelve `textoDelCursor`; si no, `mensajeDeErrorClases(error)`, como siempre.<br>- Textos en `data.ts`: `TEXTOS_MURO.cambioMientrasLoVeias` y `TEXTOS_COMENTARIOS.cambioMientrasLosVeias`.<br>- La usan `muro-view.tsx` (error de la consulta de publicaciones) y `components/comentarios-de-publicacion.tsx` (error de los comentarios). El foco no cambia: sigue yendo al encabezado.<br>- **PR-C17:** un ID con tres casos, uno por archivo: `muro-view.test.tsx`, `publicacion-del-muro.test.tsx` y `lib.test.ts`. Es una excepción aceptada a M-02 (N-C8), porque cada caso cubre un lado distinto. Los títulos de las pruebas no cambian. | Ronda 2 del tester; corrección de la ronda 2; N-C8 | §D-C5, §D-C6, "Cambios por capa" (frontend), "Pruebas requeridas" (c) |
| 2 | **T-35 (M-23): "Muro" recupera el muro en error.** Cuarta ronda autorizada por el humano, opción (A) mínima.<br>- En `muro-view.tsx`, una ref guarda la `key` de `useLocation()` con la que se montó la vista. Un efecto, cuando esa clave cambia (pulsar "Muro" estando en el muro) y la consulta de publicaciones está en `isError`, llama a `refetch()`, que vuelve a pedir desde la primera página. Con la lista sana no hace nada.<br>- No cambian el texto, el foco (se queda en "Muro"), `hooks.ts`, `lib.ts`, `data.ts`, el backend, `shared/` ni `DESIGN.md`.<br>- **PR-C18:** dos casos en `muro-view.test.tsx`. | Ronda 3 del tester (T-35); revisión final de c (M-23); decisión del humano | §D-C5, "Cambios por capa" (frontend), "Pruebas requeridas" (c), paso 35 |
| 3 | **D-1, aceptada por el manager (opción a):** `adapters/db/publicaciones.ts` define su propia copia de `errorCursorInvalido`, con el mismo código y mensaje, como ya hacía `inscripciones.ts`.<br>- Motivo: `clases.ts`, `inscripciones.ts` y `errores.ts` están en "No se toca".<br>- PR-C03f y PR-C04e cubren la equivalencia.<br>- Unificar los errores de `adapters/db` sería un refactor aparte (un CHORE), no un pendiente de c. | Verificación del resumen, corrección de la ronda 1 (D-1) | §D-C2 |
| 4 | **N-C4, hecho aceptado:** el primer programador cambió, sin declararlo, una línea de un caso existente de `backend/test/clases.integracion.test.ts:128`: un U+202E literal pasó a escape, con el mismo valor. Lo declaró en la corrección 1. Es un cambio de forma aceptado en un archivo "del propio encargo que se extiende": ningún caso se reescribió. | Revisión del manager (N-C4) | — |
| 5 | **Desviaciones aceptadas en la implementación de c:**<br>- los envoltorios `publicacionRespuestaSchema` y `comentarioRespuestaSchema` en `shared/`;<br>- `MuroView` también usa `ConClaseDeLaRuta`;<br>- los avisos de borrar publicación y comentario van en los callbacks de los hooks, igual que los de crear (T-30);<br>- `vecinaDeFila` es nueva en `lib.ts`, con su caso en `lib.test.ts`;<br>- los encabezados `h2` y `h3` del muro y de los comentarios son solo para lectores de pantalla (N-C7, a H-6). | Revisión final de c | "Cambios por capa" (`shared/` y frontend) |
| 6 | **Pendientes con destino** (ya en `docs/ESTADO.md` §3, salvo los que anota el orquestador al cerrar): "Ver más clases" con el texto técnico, el botón "Volver a cargar" para todas las listas paginadas, `formulario-clase.tsx` sin normalizar, `descripcionClaseSchema` con el mensaje en inglés, `contarVisibles` en `auth.ts`, la observación para NOTIFICACIONES, los `P2028` de AUTH y N-C7 a H-6 | Revisión final de c, "Pendientes con destino" | "Pendientes de `ESTADO.md`" |
| 7 | **Textos literales de cierre (c), versión final del manager:**<br>- §7: la fila `clases`, sin la frase "Publicaciones y comentarios llegan con CLASES-c", y el párrafo de contenido visible con los ajustes de T-31 y T-32;<br>- §8: la frase para NOTIFICACIONES;<br>- §14: las filas `publicaciones` y `comentarios`, sin cambio, y la viñeta nueva de "Reglas de acceso a datos" sobre la paginación por cursor, autorizada por el humano.<br>ESSENTIALS, `CLAUDE.md`, `PRD.md` y `README.md` no cambian en c. | Revisión final de c, "Documentos a actualizar"; autorización del humano | "Textos literales propuestos" |
| 8 | **Base de d:**<br>- `<Cc>` dentro de los paquetes;<br>- V-01 desde la tabla de la regresión final de c (las 96 `*.ataque` de la ronda 3, más las que agregue esa regresión).<br>**Cifras de cierre de c** (cuarta ronda, antes de la regresión final): backend 111 archivos y 1226 pruebas; frontend 95 archivos y 1292 pruebas; más lo que agregue la regresión final.<br>La regla de la Enmienda 7 para la ronda 0 de d (listas cerradas también en las pruebas normales) ya está en "Ronda 0". | Revisión final de c | V-01, "Puntos de ataque" (ronda 0), pasos 0, 35 y 36 |

**Contradicciones que encontré y corregí:**
- **La viñeta "Caracteres invisibles en el plan" de la Enmienda 6 y el párrafo de escapes bajo "Pruebas requeridas" (c)** decían que la tabla tenía caracteres invisibles literales. Ya no los tiene, porque el orquestador los restituyó a escapes. Corregí los dos.
- **La Enmienda 8 y §D-C2 decían que `listarPublicaciones` responde "con el código y el mensaje de `errorCursorInvalido` (`adapters/db/clases.ts`)",** como si se reutilizara una función que no se exporta. Es una copia con el mismo código y mensaje (D-1). Corregí §D-C2; la fila 1 de la tabla de la Enmienda 8 es historia y se lee con esta corrección.
- **El paso 36 y V-01 hablaban del cierre de c en futuro.** Ahora dicen lo que queda: la regresión final del tester y el commit `<Cc>`.

## Enmienda 8 — ronda 1 de CLASES-c (arbitrajes del manager)
Registra en el plan los arbitrajes del manager sobre los cinco hallazgos de la ronda 1 del tester. Fuentes:
- `revision.md`, "Arbitrajes de la ronda 1 — CLASES-c" (línea 2583);
- `reporte-tester.md`, "CLASES-c — Ronda 1" (líneas 2597 a 2861).

Ninguno necesita una decisión del humano: T-29 aplica a c la regla que el humano ya aprobó en a (T-18). No cambian §D-C1, §D-C3, PARADAS, "No se toca" ni la lista cerrada de archivos. El estado sigue en LISTO.

| # | Qué cambió | Origen | Dónde |
|---|---|---|---|
| 1 | **T-29, cursor borrado (medio):** `listarPublicaciones` y `listarComentarios` leen primero el cursor por PK.<br>- Si no hay fila, responden `400 VALIDACION` "cursor: no es válido", con el código y el mensaje de `errorCursorInvalido` (`adapters/db/clases.ts`).<br>- En comentarios, la publicación se comprueba antes que el cursor.<br>- No hay oráculo: un cursor borrado, uno ajeno y un UUID inexistente responden igual.<br>- Es una consulta por PK, sin transacción, con el residual aceptado en a. El frontend no cambia.<br>- Es el principio común de §D-A4 (T-18, decisión del humano en a), aplicado a c. | Arbitraje del manager, T-29 | §D-C2, "Acceso a datos", "Pruebas requeridas" (c): PR-C03f y PR-C04e |
| 2 | **T-32, unidad de los máximos (bajo):**<br>- Todos los `max` y `min` de cadena de `shared/` cuentan en **puntos de código** (zod 4 lo hace a propósito). Incluye `nombreClaseSchema` (120 y `min(2)`) y `descripcionClaseSchema` (2,000) de a: ahí no cambia el código, solo lo que el plan afirma. El término de búsqueda de b ya medía así.<br>- El `maxLength` del navegador (solo en el buscador de b) cuenta unidades de UTF-16, es más estricto que el servidor y no se toca.<br>- C-20: el tester reescribe su caso de T-32. | Arbitraje del manager, T-32 | §D-C4, §D-R0 (C-20), "Puntos de ataque" (c), punto 4 |
| 3 | **T-31, el formulario mide antes de normalizar (bajo):**<br>- `normalizarTextoLargo` se define en `shared/src/clases.ts`, y `backend/src/core/clases/texto.ts` la reexporta. Es una sola definición, como `normalizarTerminoDeBusqueda` en b.<br>- `FormularioPublicacion` y `FormularioComentario` normalizan antes de `safeParse` y envían `resultado.data`.<br>- `formulario-clase.tsx` no entra en c: queda como pendiente.<br>- Descarté replicar la función en el frontend, porque serían dos copias de la misma regla. | Arbitraje del manager, T-31 | §D-C4, "Cambios por capa" (`shared/`, `core/` y frontend), V-04, "Pruebas requeridas" (c): PR-C15a a PR-C15c, "Pendientes" |
| 4 | **T-30, avisos perdidos al crear (medio):**<br>- Los avisos de crear publicación y comentario pasan a los callbacks de `useCrearPublicacion` y `useComentar`. El hook no avisa un error de campo.<br>- El componente llama a `mutate` solo con estado local.<br>- Cada aviso sale una sola vez.<br>- Residual aceptado: un error de campo del servidor con el formulario ya desmontado no se avisa. | Arbitraje del manager, T-30 | §D-C5, "Cambios por capa" (frontend), "Pruebas requeridas" (c): PR-C14a y PR-C14b |
| 5 | **T-33, mensajes en inglés (bajo):** dos mensajes nuevos.<br>- "Elige si es un anuncio o un material" (`error` del `discriminatedUnion`).<br>- "La descripción debe ser texto" (`error` del `z.string()` de la descripción del material).<br>`descripcionClaseSchema` de a no se toca: queda como pendiente. | Arbitraje del manager, T-33 | §D-C6, "Pruebas requeridas" (c): PR-C16, "Pendientes" |
| 6 | **IDs nuevos:** PR-C03f, PR-C04e, PR-C14a, PR-C14b, PR-C15a, PR-C15b, PR-C15c y PR-C16.<br>- Separé T-31 en tres IDs (y no en dos), para que cada ID tenga un solo archivo (M-02).<br>- Todos van en archivos de la lista cerrada de c: `muro.integracion.test.ts`, `formulario-publicacion.test.tsx` y `publicacion-del-muro.test.tsx` (nuevos de c) y `core/clases/texto.test.ts` (extendido en c, Enmienda 6). No hace falta ningún archivo nuevo. | Arbitraje del manager | "Pruebas requeridas" (c) |

**Contradicciones que encontré y corregí:**
- **§D-C4 afirmaba que los máximos cuentan unidades de UTF-16.** La premisa era falsa desde la Enmienda 6; la escribí yo. El manager reconoció que el punto 4 de su lista de la ronda 1 tenía la misma premisa falsa. Corregí la viñeta.
- **Consecuencia en C-18, fila 2 de la Enmienda 6 y §D-C4, "Cambio de comportamiento en el nombre".** Decían que un nombre de un solo emoji simple (U+1F44D) "hoy pasa porque mide 2 unidades de UTF-16". Es falso: mide 1 punto de código y ya lo rechazaba el `min(2)`. Lo nuevo de C-18 son solo los nombres sin contenido visible, o con uno solo, que miden 2 o más puntos de código. Corregí la línea de §D-C4. La fila 2 de la Enmienda 6 y la fila C-18 son historia de la ronda 0 de c y se leen con esta corrección. PR-C12b y PR-C12f siguen valiendo, porque los dos casos esperan `400` por cualquiera de las dos reglas.

## Enmienda 7 — PA-16 en CLASES-c (lista cerrada de E6)
Registra la autorización que pidió la PA-16 del programador en CLASES-c. La fuente es `resumen-programador.md`, "CLASES-c — implementación" (línea 1126).
- **Qué pasó:** la implementación de los pasos 28 a 34 deja exactamente un rojo, en una prueba normal de AUTH-02 que no está en la lista cerrada de c: `backend/test/bloqueo-usuario.integracion.test.ts`, caso "E6: solo salud.ts, bloqueo-usuario.ts, enlaces-registro.ts e invitaciones.ts usan SQL etiquetado en adapters/db" (línea 679).
- **Por qué falla:** ese caso lista de forma cerrada los archivos de `adapters/db` con `$queryRaw` o `$executeRaw`. El `SELECT … FOR SHARE` etiquetado de `adapters/db/publicaciones.ts`, que el plan exige (§D-C3, "Acceso a datos", V-04), la desborda.
- **Cómo actuó el programador:** se detuvo como manda PA-16, sin tocar la prueba ni esconder el SQL.

No cambia ningún diseño de c ni de d. El estado sigue en LISTO.

| # | Qué cambió | Origen | Dónde |
|---|---|---|---|
| 1 | **Autorización de `backend/test/bloqueo-usuario.integracion.test.ts` en c**, como "existente antes del encargo que se modifica":<br>- el caso E6 suma `"publicaciones.ts"` a su lista cerrada (`toEqual`), a su título ("…, invitaciones.ts y publicaciones.ts usan SQL etiquetado en adapters/db") y a su comentario, con una línea que cite CLASES-c, §D-C3 y V-04;<br>- nada más cambia en ese archivo: no se reescribe el caso, no se quita ninguna aserción y no se toca el patrón;<br>- **la lista sigue cerrada:** `publicaciones.ts` es el único archivo de c con SQL etiquetado, coherente con V-04 ("`$queryRaw` o `$executeRaw` nuevos en `backend/src/` → solo el `FOR SHARE` de `adapters/db/publicaciones.ts`"). | PA-16 del programador en CLASES-c | "Pruebas: listas cerradas" (c), paso 32 |
| 2 | **PA-16 queda cerrada para ese archivo y ese caso.** La adaptación la hace el programador junto con sus pruebas de c. Cualquier otro cambio en ese archivo, u otra prueba normal fuera de la lista, vuelve a activar PA-16. | — | Paso 32 |
| 3 | **Ronda 0 de d y siguientes:** la búsqueda de listas cerradas (archivos, tablas, colas, SQL crudo, rutas) cubre también las pruebas normales existentes, no solo las `*.ataque`, para que el plan las autorice antes de programar. C-12 solo pedía buscar en las `*.ataque`, y por eso E6 no salió en la ronda 0 de c. | Lección de esta PA-16 | "Puntos de ataque" (ronda 0, punto 2) |
| 4 | **Forma del caso E6, sin cambio.** Derivar su lista de V-04 o de un recorrido del código quitaría su función: que cada archivo nuevo con SQL etiquetado pase por una autorización explícita. Por eso queda como lista cerrada literal, y se amplía en cada encargo que agregue SQL etiquetado (d no agrega ninguno). | Decisión del arquitecto (lo mínimo) | — |

**Contradicciones que encontré y corregí:**
- C-12 de §D-R0 ya preveía "cualquier lista cerrada de archivos con `$queryRaw`", pero solo en las `*.ataque`, y la lista cerrada de c no autorizaba ninguna prueba normal existente. No reescribo C-12: el punto 3 lo cubre para d y para lo que siga.

## Enmienda 6 — arranque de CLASES-c (regla de contenido visible y triviales heredados de b)

> **Nota de transcripción (orquestador, 2026-10-01).** El arquitecto redactó esta enmienda completa (su texto y 19 ediciones con ancla literal sobre el cuerpo del plan), pero no pudo escribir `plan.md`: su única herramienta de escritura reescribe el archivo entero y los 243 KB del plan rebasan su límite de salida por respuesta; reescribirlo de memoria habría repetido el incidente de la Enmienda 4. Por el precedente de `docs/ESTADO.md` §4 (transcripción del orquestador cuando el entorno impide a un agente escribir su entregable), el orquestador aplicó las 19 ediciones tal cual, sin cambiar contenido. El registro de lo aplicado es el diff de este archivo contra `e9df1f0`; el manager lo verifica en su revisión de la enmienda. La segunda tanda del arquitecto (E20 a E29, con las correcciones de la revisión del manager) se aplicó igual. Al transcribir las filas PR-C12a a PR-C12g, la herramienta de edición convirtió los escapes de la forma `\uXXXX` en caracteres reales; el orquestador los devolvió a texto con un script el mismo día.

Registra lo que el paso 27 pide antes de la ronda 0 de CLASES-c y la decisión del humano sobre los triviales de b. Las fuentes son:
- `aprobacion.md`: `<Cb>` = `e9df1f0` y la decisión del humano del 2026-10-01 ("Los triviales heredados de b entran en CLASES-c, no en un commit aparte");
- `revision.md`: "Revisión final — CLASES-b" ("Detalles menores (no bloquean…)") y "Revisión final — CLASES-b — ronda 4 y cierre";
- `reporte-tester.md`: "CLASES-b — Ronda 5, regresión final", "Observaciones finales para H-6 (consolidadas de b)", punto 2, y la observación de CLASES-a sobre los `Cf` en `nombreClaseSchema`.

No cambia ninguna decisión de a, b ni d, ni de §D-C1, §D-C2, §D-C3 ni §D-C5. En c cambian la regla de §D-C4 (que el plan ya delegaba aquí), sus mensajes en §D-C6, una línea de `DESIGN.md` en §D-C7 y la sección nueva §D-C5 bis. El estado sigue en LISTO.

| # | Qué cambió | Origen | Dónde |
|---|---|---|---|
| 1 | **Regla única de contenido visible** (detalle en §D-C4).<br>- **Visible:** un punto de código de letra, número, puntuación o símbolo (`[\p{L}\p{N}\p{P}\p{S}]`) que no sea ignorable por defecto ni U+2800 ni U+1D159. Es la definición de `nombreSchema` de personas.<br>- **Los `Cf` ni se rechazan ni cuentan.** Se siguen rechazando los de control, los inversores de dirección y, en el nombre, los saltos de línea.<br>- **Mínimo, en puntos de código visibles:** 2 en el nombre de la clase y 1 en el título del material, el anuncio y el comentario. Los máximos no cambian, y los textos opcionales no exigen mínimo.<br>- **Orden:** es la última comprobación del esquema, sobre el texto ya recortado o normalizado.<br>- **Dónde vive:** `shared/src/clases.ts`. `core/` no cambia.<br>- **Mensajes:** los del campo vacío.<br>**Descartadas:**<br>- **rechazar todo `Cf`, como el nombre de una persona:** rompe los emojis con U+200D (los usan `clases-r2` y H-6), las banderas de subdivisiones (etiquetas U+E0020 a U+E007F) y el persa o las escrituras índicas (U+200C y U+200D);<br>- **rechazar una lista cerrada de `Cf` invisibles:** la lista nunca se cierra, algunos tienen uso legítimo (U+200B en tailandés y jemer) y sería una segunda regla;<br>- **quitar los `Cf` al guardar:** altera lo escrito y rompe los emojis;<br>- **contar grafemas con `Intl.Segmenter`:** sería otra forma de contar, distinta de la de personas y de la del término de búsqueda, y depende de la versión de Unicode de cada motor;<br>- **exigir contenido visible en los opcionales:** un opcional que se ve vacío no hace daño, y la regla cambiaría la descripción de la clase, que es de a. | Pendiente de la Enmienda 4 (observación del tester de a); paso 27 | §D-C4, §D-C6, "Cambios por capa" (`shared/` y `core/`), "Pruebas requeridas" (c), "Pruebas: listas cerradas" (c), "Puntos de ataque" (c), pasos 29 y 32, V-04 |
| 2 | **El nombre de la clase entra en la regla:** mínimo de 2 visibles, con el mensaje de hoy ("El nombre debe tener al menos 2 caracteres").<br>- Un nombre de un solo emoji simple (U+1F44D), que hoy pasa porque mide 2 unidades de UTF-16, pasa a `400`.<br>- PR-A08d y PR-A08e no quedan contradichas; PR-C12f extiende `clases.integracion.test.ts`.<br>- S-02 y §D-A3 no se reescriben. | Pendiente de la Enmienda 4 | §D-C4, "Pruebas requeridas" (c) |
| 3 | **C-18:** ningún `*.ataque` afirma que se acepte un nombre o una descripción con `Cf`; el tester lo confirma | Encargo del orquestador | §D-R0, "Puntos de ataque" (ronda 0), paso 27 |
| 4 | **Texto para `ARCHITECTURE.md` §7 (c),** para que TAREAS y ENTREGAS reutilicen la regla. A ESSENTIALS no va: es una regla de validación, no una decisión de arquitectura | — | "Textos literales propuestos" |
| 5 | **Aviso de "Agregar a la clase" perdido:** los avisos pasan a los callbacks de `useAgregarAlumno` | `reporte-tester.md`, ronda 5 de b, observación 2; decisión del humano | §D-C5 bis, "Cambios por capa" (frontend), PR-C13a, PR-C13b, V-04 |
| 6 | **`focoPerdido`** pasa a `lib.ts`, con el documento como parámetro.<br>**Descartadas:**<br>- un archivo de utilidades de foco (sugerencia de la revisión): sale de la estructura de módulos de `CLAUDE.md` por una sola función;<br>- `lib/` compartido: hoy solo lo usa un módulo (regla 5);<br>- dejarla en `hooks.ts` sin exportar: la usan dos componentes. | `revision.md`, detalle menor de b | §D-C5 bis, "Cambios por capa" (frontend), PR-C13c, V-04 |
| 7 | **`claseId ?? ""` (N-B1):** una guarda `ConClaseDeLaRuta`.<br>- Se corrigen los cuatro archivos con el mismo mecanismo (parámetro de la ruta): `personas-view.tsx` y `alumnos-view.tsx` de b, y `clase-layout.tsx` y `editar-clase-view.tsx` de a.<br>- `formulario-clase.tsx` queda pendiente: ahí `claseId` es una prop opcional del modo "crear" y pide otro remedio. | `revision.md` N-B1; recomendación del orquestador | §D-C5 bis, "Cambios por capa" (frontend), PR-C13d, V-04, "Pendientes" |
| 8 | **`DESIGN.md` §7.14:** el párrafo "Implementan este patrón…" sube junto a la confirmación en línea | `revision.md`, detalle menor de b | §D-C7, paso 33 |
| 9 | **Listas cerradas de c:**<br>- se suman un archivo nuevo y cinco "del propio encargo" (PA-16 sigue igual);<br>- "No se toca" de c no cambia: ninguno de los archivos que ahora se autorizan está en su lista; el `components/*.tsx` de esa lista es `frontend/src/components/`, no `features/clases/components/`. | — | "Pruebas: listas cerradas" (c) |
| 10 | **Alcance, decisión del humano, pendientes, pasos y `<Cb>`** | Decisión del humano del 2026-10-01; cierre de b | Cabecera, "Decisiones registradas", "Pendientes", "Alcance", pasos 27, 29, 32 y 33 |
| 11 | **M-21: ruta real de las pruebas de `FormularioClase`.** Es `frontend/src/features/clases/components/formulario-clase.test.tsx`. Se corrigen la lista cerrada de c ("del propio encargo que se extienden") y PR-C12g. La lista de a y PR-A21a no se reescriben: queda una nota en "Contradicciones" | Revisión de la Enmienda 6 (manager) | "Pruebas: listas cerradas" (c), "Pruebas requeridas" (c) |
| 12 | **M-22: C-19 en §D-R0.** `PanelMisClases` usará `useFocoAlCargarMas` de `hooks.ts` (§D-C5, PR-C11a). `inicio-sin-datos-r2.ataque.test.tsx:25` simula `./hooks` con una fábrica cerrada de cuatro hooks, y con Vitest 4 leer un export ausente lanza. La fábrica suma un doble inerte, sin cambiar aserciones | Revisión de la Enmienda 6 (manager) | §D-R0, "Puntos de ataque" (ronda 0), paso 27 |
| 13 | **N-C1:** el texto para `ARCHITECTURE.md` §7 dice dónde vive la regla (`shared/src/clases.ts`) y que `shared/src/auth.ts` tiene una copia equivalente hasta unificarlas. Va como párrafo propio, después de "Detrás del proxy de Cloudflare…" | Revisión de la Enmienda 6 (manager) | "Textos literales propuestos" |
| 14 | **N-C3:** `textoConContenidoSchema` usa `mensaje` también como error de tipo de `z.string()` (campo ausente), igual que `nombreClaseSchema`. PR-C12e suma ese caso | Revisión de la Enmienda 6 (manager) | §D-C4, "Pruebas requeridas" (c) |
| 15 | **Detalle: escapes en el código.** Las cadenas con caracteres invisibles se escriben con escapes en las pruebas, nunca tal cual | Revisión de la Enmienda 6 (manager) | "Pruebas requeridas" (c) |
| 16 | **Detalle: `ESTADO.md` §3.** El pendiente de `formulario-clase.tsx` y la unificación de `contarVisibles` van también ahí (los anota el orquestador) | Revisión de la Enmienda 6 (manager) | "Pendientes de `ESTADO.md`" |

**Contradicciones que encontré y corregí:**
- §D-C4 decía que la regla "se define en una enmienda… Esta nota no la decide", y el paso 27 decía "Antes, la enmienda…". Ahora la regla está escrita y el paso 27 lo dice.
- Los pendientes de N-B1, `focoPerdido` y la línea de §7.14 iban "a la próxima vez que se toque el archivo" (o a `ESTADO.md` §3). El humano los adelantó a c.
- Me aparté de dos sugerencias, con motivo (filas 6 y 7): la revisión proponía un archivo de utilidades de foco, y el orquestador, corregir los cinco archivos o solo los dos de b.
- No es contradicción, pero lo anoto: la tabla de cierre de b tiene 87 `*.ataque` (85, más `alumnos-b-r4` y `alumnos-b-r5`). V-01 y el paso 27 ya lo dicen como "85, más las de la ronda 4", así que no los cambié.
- **Ruta de las pruebas de `FormularioClase` (M-21).** La lista cerrada de a y PR-A21a a PR-A21e la citan como `src/features/clases/formulario-clase.test.tsx`; el archivo real está en `src/features/clases/components/formulario-clase.test.tsx`. No reescribo a, que ya cerró: esas referencias se leen como esa ruta real. La lista de c y PR-C12g ya la llevan.
- **Caracteres invisibles en el plan.** Al transcribir las filas PR-C12a a PR-C12g, algunos escapes de la Enmienda 6 quedaron como caracteres invisibles literales. El orquestador ya los restituyó a escapes (Enmienda 9). En el código de las pruebas van siempre como escapes (`\u200B`, `\u3164`…).

## Enmienda 5 — cierre de CLASES-b (decisiones y arbitrajes de la implementación)
Registra en el texto del plan lo que se decidió y se construyó en CLASES-b. Las fuentes son:
- `aprobacion.md`: "CLASES-b (desde el 2026-09-30)" y "Decisión del humano sobre la escalada de CLASES-b";
- `revision.md`: "Verificación del resumen — CLASES-b — implementación", sus verificaciones de corrección (ronda 1, ronda 2 y su segunda pasada) y "Revisión final — CLASES-b" (ESCALAR AL HUMANO);
- `reporte-tester.md`: rondas 0 a 3 de b y C-17.

CLASES-b está en la **ronda 4, corta y cerrada** (T-25 y T-26), autorizada por el humano, sin quinta ronda. Lo que agregue esa ronda queda referido aquí como "ronda 4".

No cambia ninguna decisión de c ni de d, salvo lo que indica el punto 7 (dos autorizaciones nuevas para c) y el punto 9 (textos propuestos). El estado sigue en LISTO.

| # | Qué cambió | Origen | Dónde |
|---|---|---|---|
| 1 | **D-2: ejemplo de PR-B01b y mínimo de 3.**<br>- El ejemplo `"  a  b "` → `null` era erróneo: normalizado queda `"a b"`, que mide 3 y se acepta. La viñeta queda con un ejemplo que sí se rechaza (`"  ab  "`, 2 normalizados) y con `"a b"` como aceptado.<br>- **Decisión:** el mínimo de 3 **cuenta los espacios interiores** que quedan tras normalizar, como ya hace la implementación en los tres lados. Excluirlos pediría una segunda regla de conteo distinta de la normalización, y `"a b"` es inofensivo: se busca como `LIKE '%a b%'` sobre el índice GIN.<br>- §D-B6 suma "Agregar alumnos", "No encontramos a ese alumno.", "\<nombre\> ya estaba en la clase" (D-4) y "La búsqueda no puede tener más de 120 caracteres" (T-24). | D-2 del manager; desviaciones 1 y 7; D-4; T-24 | S-11, §D-B3, §D-B4, §D-B6, "Pruebas requeridas" (b) |
| 2 | **Longitud del término sobre el normalizado (T-20, T-24).**<br>- Se mide **sobre el término normalizado**, de 3 a 120 puntos de código, con un tope de 1000 en crudo.<br>- La normalización y el criterio viven en un solo lugar, `shared/src/clases.ts`: `normalizarTerminoDeBusqueda`, `LONGITUD_MINIMA_BUSQUEDA`, `LONGITUD_MAXIMA_BUSQUEDA`, `LONGITUD_MAXIMA_BUSQUEDA_CRUDA` y `estadoDeTerminoDeBusqueda`.<br>- La usan el esquema, `core/clases/busqueda.ts` y el frontend. `core/auth/normalizacion.ts` no cambia, y una prueba exige que las dos normalizaciones sean equivalentes.<br>- El `maxLength` del campo cuenta unidades de UTF-16; el tope real lo decide `estadoDeTerminoDeBusqueda`. | T-20, T-24, D-8; observación del manager en la corrección 1 | S-11, §D-B1, §D-B3, §D-B4, §D-B5, "Cambios por capa" (`shared/`, `core/`) |
| 3 | **Foco en el roster (T-21 a T-23):** patrón "Foco al confirmar una acción que borra la fila" (`DESIGN.md` §7.14, propuesta).<br>- El foco va al mismo control de la fila que ocupa el lugar de la quitada (la siguiente, o la anterior si era la última); si la lista queda vacía, al `h2` del panel con `tabIndex={-1}`.<br>- Se mueve cuando la fila ya desapareció de los datos, no en el `onSuccess`.<br>- Implementación: `TablaAlumnos` recuerda por id la fila con el foco (`focusin`/`focusout`, `data-alumno-id`) y, después de cada render, lo recoloca si el control se desmontó por cualquier causa (consulta que falla, otra pestaña, lista vacía).<br>**Extensión de la ronda 4 (T-25, T-26), en curso:** "un control que desaparece por su propia acción". "Agregar a la clase" lleva el foco al siguiente "Agregar a la clase", al anterior o al campo de búsqueda; "Ver más" lleva el foco al primer elemento nuevo o, si no llegó nada, al encabezado de la lista. | T-21 (arbitraje del manager, opción A), T-22, T-23; T-25 y T-26 (decisión del humano) | §D-B4, §D-B7, "Pruebas requeridas" (b), paso 25 |
| 4 | **C-17:** el doble de `sonner` de `alumnos-b-r1.ataque.test.tsx` pasó a ser invocable por D-4 (toast neutro). Hash `755019C7…` → `C3692E9E…`. Ninguna aserción cambió | Arbitraje del manager (opción A) | §D-R0 |
| 5 | **PR-B05 con 40,000 filas** (M-07). Umbral medido: con 16,000 el planificador no usa el GIN y con 17,000 a 20,000 sí. La aserción imprime el plan elegido si falla, y la transacción lleva `timeout` de 15 s. Retiene `usuarios` unos 5 s: nota para CHORE-02 | D-1, M-07 | "Pruebas requeridas" (b), R-27 |
| 6 | **Pruebas normales nuevas de b:**<br>- PR-B11c2, D-4, T-22, T-23 y T-24 en `alumnos-view.test.tsx`;<br>- T-20 en `alumnos.integracion.test.ts` y en `core/clases/busqueda.test.ts`;<br>- T-24 en `lib.test.ts`;<br>- equivalencia de la normalización en `core/clases/busqueda.test.ts`;<br>- las de T-25 y T-26 que agregue la ronda 4. | Correcciones de las rondas 1 y 2; ronda 4 | "Pruebas requeridas" (b) |
| 7 | **Pendientes con destino:**<br>- **"Ver más clases" (`panel-mis-clases.tsx`, de a) → CLASES-c.** Se autoriza ese archivo en c, y "Ver más publicaciones" y "Ver más comentarios" nacen con el criterio de §7.14 extendido (PR-C11a a PR-C11c);<br>- "Cargar más enlaces" de admin → ADMIN;<br>- PR-B05 y la espera en cadena → CHORE-02;<br>- para la pantalla de movimientos de ADMIN, la sugerencia de dejar ver un alta seguida de una baja del mismo alumno en poco tiempo;<br>- la ayuda permanente y el aviso de longitud, leídos seguidos por `aria-describedby` → H-6;<br>- `claseId ?? ""` en `personas-view.tsx` y `alumnos-view.tsx` (N-B1, no bloquea) → carril trivial, en el próximo cambio que toque esos archivos. | Revisión final de b; decisión del humano (punto 2); observaciones del tester | "Pendientes de `ESTADO.md`", "No entra", "Alcance" (c), "Entra", §D-C5, "Cambios por capa" (frontend), "Pruebas: listas cerradas" (c), "Pruebas requeridas" (c), paso 32, H-6, R-27 |
| 8 | **Base de c:** V-01 arranca de la tabla de cierre de b: 85 `*.ataque`, más las de la regresión de la ronda 4. Cifras de cierre de b: backend 104 archivos y 1144 pruebas; frontend 84 archivos y 1167 pruebas, más las que agregue la ronda 4. La base de "No se toca" de c dentro de los paquetes es `<Cb>` | Revisión final de b | V-01, V-05, "Puntos de ataque" (ronda 0), pasos 0, 25 y 27 |
| 9 | **Textos literales propuestos (b):** la viñeta de búsqueda de §14 ("Reglas de acceso a datos") y la de ESSENTIALS ("Reglas de datos") pasan a "3 a 120 caracteres ya normalizados, tope crudo de 1000, normalización única en `shared/`". La de "Reglas de negocio" (alta manual) no cambia: el enmascarado y el registro se construyeron como estaban redactados | Revisión final de b ("Documentos a actualizar") | "Textos literales propuestos" |

**Contradicciones que encontré y corregí:**
- **§D-B3 decía que `prepararTerminoDeBusqueda` aplica `normalizarParaBusqueda` de `core/auth/normalizacion.ts`.** Desde T-24 usa la normalización de `shared/`, y `core/auth` quedó intacto, con una prueba de equivalencia. También la fila de `core/clases/busqueda.ts` en "Cambios por capa" declaraba ahí `LONGITUD_MINIMA_BUSQUEDA`, que ahora vive en `shared/`.
- **§D-B4 decía que el maestro también puede abrir `PersonasView` "por URL".** El backend lo deja pasar (`requireMembership`), pero el router no le da ruta propia; el maestro tiene "Alumnos". Lo aceptó el manager (desviación 4, D-3) y quedó así escrito.
- **§D-B4 omitía dos detalles construidos y aceptados:** la invalidación de `["clases", claseId, "personas"]` al agregar (desviación 5) y el toast neutro cuando `yaEstaba: true` (D-4). Antes el aviso decía "Agregaste a…" aunque no se hubiera agregado a nadie.
- **La ayuda del buscador dice "Escribe al menos 3 letras."** y el mínimo cuenta los espacios interiores (punto 1). Se queda: solo difiere en casos como `"a b"`, y cambiarla es carril trivial si el humano lo pide.
- **Las cifras de cierre de a de la Enmienda 4** (backend 96 y 1054, frontend 77 y 1082) eran las de la ronda 4, antes de la regresión final. El cierre real fue de 97 y 1059 en el backend, y 78 y 1106 en el frontend, con 79 `*.ataque` (`aprobacion.md`, "Cierre de CLASES-a"). Lo anoté en V-01, que ya mira a c.

## Enmienda 4 — cierre de CLASES-a (decisiones y arbitrajes de la implementación)
Registra en el texto del plan lo que se decidió y se construyó en CLASES-a. Las fuentes son:
- `aprobacion.md`: "Ronda 0 e implementación de CLASES-a" y "Decisión del humano sobre la escalada";
- `revision.md`: "Revisión final — CLASES-a" y "Revisión final — CLASES-a — ronda 4 y cierre" (APROBADO, pendiente de la regresión final del tester);
- los arbitrajes del manager sobre T-02, T-13, T-15 y C-16.

No cambia ninguna decisión de b, c ni d, salvo lo que se indica:
- las dos notas de coherencia de §D-B3 bis y §D-C4;
- N-04 y los textos fijos del inicio del maestro, que pasan a b;
- la regla del texto sobre vidrio azul, que vale para b, c y d.

El estado sigue en LISTO.

| # | Qué cambió | Origen | Dónde |
|---|---|---|---|
| 1 | **Regla de la guarda.** La expresión regular literal de §D-0.3 no cubría todos los casos. Queda la regla textual aceptada:<br>- toda ruta bajo `/api` que declare un parámetro llamado `claseId` en cualquier posición de su URL, y todo comodín bajo `/clases` (`/clases*` y `/clases/*`), lleva el sexto paso;<br>- bajo `/clases/`, el único parámetro permitido en el segmento siguiente es `:claseId`.<br>PR-A06f y PR-A06g ya existen como pruebas normales y entran en la tabla. | T-02 y T-13 | §D-0.3, C-3, R-08, "Entra", texto para `ARCHITECTURE.md` §6, "Pruebas requeridas" (a) |
| 2 | **Separadores del código de invitación, en lista cerrada:** `SEPARADORES_CODIGO_CLASE`, en `shared/src/clases.ts`.<br>- Se aceptan: espacio y tabulador ASCII, U+00A0, U+2007, U+202F, U+3000, guion ASCII, U+2010 y U+2011.<br>- Se rechazan: U+2012 a U+2015, U+FEFF, U+200B y las letras que `toUpperCase` convierte (`ß`, `ſ`, ligaduras).<br>- `toUpperCase` solo se aplica sobre `a`–`z`.<br>Pruebas: PR-A02a2 y PR-A02d2. | T-15; arbitraje del manager (opción A) | S-03, §D-A3, texto para ESSENTIALS, "Pruebas requeridas" (a) |
| 3 | **Nombre de la clase en una sola línea:** `nombreClaseSchema` también rechaza U+2028 y U+2029. Prueba PR-A08e | T-16 | S-02, §D-A3, "Pruebas requeridas" (a) |
| 4 | **`normalizarTextoLargo` antes de validar.** En a, se aplica a la descripción en `POST /clases` y en `PUT /clases/:claseId`, **antes** de validarla: CRLF y CR pasan a LF. Los demás caracteres de control siguen rechazados. | T-01 | §D-A2, §D-A3, §D-C4 |
| 5 | **Cursor que ya no existe en `inscritas` e `impartidas`:** responde `400 VALIDACION` ("cursor: no es válido") si el cursor ya no es una inscripción del alumno o una clase del maestro.<br>- Se comprueba por PK antes de paginar, con una consulta fuera de ciclo.<br>- Un cursor ajeno y uno inexistente reciben la misma respuesta.<br>- El frontend no cambia.<br>- Pruebas normales: PR-A13c y PR-A13d.<br>- **Residual aceptado por el manager:** si la fila del cursor se borra entre la lectura por PK y la página, puede salir una página vacía (ventana de milisegundos). | T-18; decisión del humano; ronda 4 | "Decisiones registradas", §D-A2, §D-A4, "Cambios por capa" (`db/clases.ts`), "Acceso a datos", R-22, "Pruebas requeridas" (a) |
| 6 | **Errores que no son de un campo en `FormularioClase`:** avisan con `toast.error`, sin marcar ningún campo con `aria-invalid`. Un `VALIDACION` de `nombre` o `descripcion` sigue bajo su campo. Prueba normal PR-A21e. | T-19; ronda 4 | §D-A5, "Pruebas requeridas" (a) |
| 7 | **Texto sobre vidrio azul** en `bloque-destacado.tsx`: solo `text-accent-foreground` (`#FFFFFF`: titular y su error) y `text-accent-soft-glass` (saludo, fecha y siguiente paso). El siguiente paso va sin fondo. Queda como regla de diseño para b, c y d: **ningún texto sobre vidrio azul fuera de esos dos tokens.** | M-06; ronda 4 | §D-A5, reglas de los pasos (frontend) |
| 8 | **C-16:** el tester adaptó `backend/test/clases-r2.ataque.test.ts` a la regla de T-18. Es la única `*.ataque` existente que cambió después de la ronda 0 | Arbitraje del manager; ronda 4 | §D-R0 |
| 9 | **PA-09 en CLASES-a:** el programador editó y revirtió `adapters/db/errores.ts` en lugar de detenerse. Queda como desviación registrada, sin escalar | Verificación del resumen de a | R-26, reglas de los pasos |
| 10 | **Pendientes nuevos con destino:**<br>- los caracteres `Cf` invisibles en el nombre de la clase, a CLASES-c;<br>- los comodines generales `/api/*` y `/api/:seccion/*`, a CHORE-02 (M-15);<br>- la intermitencia de `LOCK TABLE usuarios`, a CHORE-02 (ya está en `docs/ESTADO.md` §3). | Revisión final de a; `ESTADO.md` | "Pendientes de `ESTADO.md`", "No entra", §D-0.3, §D-C4, R-08, R-27 |
| 11 | **N-04 y los textos fijos del inicio del maestro, a CLASES-b** (carril trivial dentro de b):<br>- en "Unirme a la clase", solo `CODIGO_INVALIDO` y un `VALIDACION` de `codigo` van al campo; lo demás (un 500, "sin conexión", `ACCESO_RESTRINGIDO`), con toast;<br>- "Nueva clase" y "Crear clase" de `inicio-maestro-view.tsx` pasan a `data.ts`.<br>Prueba normal: PR-B17. | Ronda 4 de a | "Alcance" (b), "Entra", §D-B4 bis, "Cambios por capa" (frontend), "Pruebas: listas cerradas" (b), "Pruebas requeridas" (b), paso 22 |
| 12 | **H-6 a 360 px suma** los nombres largos: una clase de 120 caracteres sin espacios y otra de 60 emojis, un maestro con nombre largo y el saludo con ese nombre. Siguen siendo 6 puntos.<br>- **Nuevo reparto de tiempos:** H-1 baja de 3 a 2.5 minutos y H-6 sube de 0.5–1 a 1.5. El total pasa de unos 9.5 a unos 10, en el tope.<br>- **Por qué se recorta H-1:** para que quepan los nombres largos de H-6 sin pasar de 10 minutos. Sus pasos no cambian; son rápidos y los apoya la cuenta ya preparada.<br>- **Fuera del tiempo, igual que el arranque:** la preparación, es decir, la cuenta de maestro con nombre largo y las cadenas de `comprobacion-humano.md` ya listas. | Rondas del tester de a | "Comprobación humana" |
| 13 | **Base de b:** V-01 arranca de la tabla del tester al cierre de a (77 `*.ataque`, con C-16, más las `-r4` que agregue la regresión final). Cifras de cierre de a: backend 96 archivos y 1054 pruebas; frontend 77 archivos y 1082 pruebas. La base de "No se toca" de b dentro de los paquetes es `<Ca>`. | Cierre de a | V-01, V-05, "Puntos de ataque" (ronda 0), pasos 0, 13 y 15 |

**Contradicciones que encontré y corregí:**
- **§D-A4 frente a §D-B3 bis.** Al pie de la letra no son la misma regla, y es a propósito. En personas y roster, el cursor de un alumno quitado de la clase **sigue sirviendo** (O-01). En `inscritas`, el cursor de una inscripción borrada **se rechaza**. El principio común es uno solo: el cursor se rechaza con `400 VALIDACION` cuando ya no se puede reconstruir la clave de orden desde la que se pagina.
  - En personas y roster, la clave (`usuarios.nombre_busqueda`) sobrevive a la baja, así que solo se rechaza si el usuario no existe.
  - En `inscritas`, la clave (`inscripciones.creado_en`) desaparece con la fila.
  - En `impartidas`, la clave (`clases.creado_en`) solo vale si la clase es del maestro.

  Lo escribí en §D-A4 y, como nota sin cambio de comportamiento, en §D-B3 bis.
- **§D-C4 decía que `normalizarTextoLargo` se aplica "antes de guardar".** Con la validación de `textoLargoSchema`, que rechaza `\r`, "antes de guardar" deja el mismo defecto de T-01 en publicaciones y comentarios. §D-C4 queda como "antes de validar", también para c. No es una decisión nueva de c: es la condición para que la regla que c ya tenía funcione.
- **§D-A5 decía "Siguiente paso en `--accent-soft-glass`"**, sin decir si era el texto o el fondo. El código lo tomó como fondo, y eso fue M-06. Queda escrito como texto, sin fondo.
- **La cabecera de la Enmienda 3 decía que "PA" no cambió.** PA-03 sí ganó la cláusula de `movimientos_inscripcion`, que solo aplica a la migración de b. Lo anoté en esa sección.
- **Textos que todavía describían la regla vieja:**
  - C-3 de §D-R0, R-08, "Entra" y el texto propuesto para §6 hablaban de un segmento `:claseId`;
  - S-03 y el texto propuesto para ESSENTIALS decían "sin espacios ni guiones", sin la lista cerrada.

  Los alineé con los puntos 1 y 2.

## Enmienda 3 — revisión de la enmienda 2 (M-03 bloquea solo CLASES-b; N-10 y N-11, no)
Incorporé los tres hallazgos y el detalle menor, sin desacuerdos. El estado sigue en LISTO.

**Nada de CLASES-a cambió:** §D-0, §D-A, sus pruebas, V, PA, "No se toca" y su migración quedan como en la enmienda 2. CLASES-a ya arrancó; esta enmienda la revisa el manager antes del paso 15 (ronda 0 de CLASES-b).

*Corrección de la Enmienda 4:* PA-03 sí ganó la cláusula de `movimientos_inscripcion`. Esa cláusula solo aplica a la migración de b; lo que PA-03 exige a la migración de a no cambió. El manager aprobó esta enmienda (`revision.md`, "Revisión de la Enmienda 3").

| Hallazgo | Qué cambió | Dónde |
|---|---|---|
| **M-03** (bloquea CLASES-b) | `movimientos_inscripcion` gana la columna `secuencia BIGSERIAL NOT NULL` (`BigInt @default(autoincrement())` en Prisma), que toma su valor en el momento del `INSERT` del movimiento.<br>- Como la transacción que espera inserta su movimiento después de que la otra confirmó, `secuencia` respeta el orden real de los cambios.<br>- El orden del registro es `secuencia`. `creado_en` queda como la fecha y no sirve para ordenar: es la hora de inicio de la transacción.<br>- La "última fila" del invariante se define por `secuencia`, y PR-B16f la usa.<br>- `id` sigue siendo UUID (ESSENTIALS: "Llaves UUID"). | §D-B2, §D-B8, S-23, PR-B16a, PR-B16f, PA-03, texto para §14, "Puntos de ataque" (b) |
| **N-10** | En cada archivo de pruebas de b (y de c y d, que tienen los mismos `RESTRICT`), la limpieza de `ayudas-clases.ts` corre **antes** que el borrado de usuarios de `ayudas-auth.ts`: primero los movimientos, después las clases. Es una regla de los pasos de b, c y d, y `ayudas-clases.ts` la documenta | §D-B8, "Pruebas: listas cerradas" (b, c y d), reglas de los pasos |
| **N-11** | PR-B16f corre en 5 rondas de **8 peticiones simultáneas** (4 altas y 4 bajas, en orden aleatorio), dentro del pool de conexiones de las pruebas, y comprueba el invariante al final de cada ronda. Un `P2028` activa PA-07 tal como está | PR-B16f |
| Detalle menor (S-22) | La regla pasa a "hasta 2 caracteres de la parte local, y nunca todos":<br>- con 3 o más, los 2 primeros (el texto del humano, tal cual);<br>- con 2, solo el primero;<br>- con 1, ninguno (`"a@x.mx"` → `"***@x.mx"`).<br>Así el buscador nunca deja ver una parte local completa, que es lo que el humano pidió evitar. | S-22, PR-B01e |

## Enmienda 2 — decisiones del humano (2026-09-29) y observaciones de la revisión de la enmienda 1
El humano aprobó por escrito. Nada de lo que decidió deja preguntas abiertas: los casos borde de (f) y (g) quedan como suposiciones registradas (S-22 y S-23). El estado pasa a LISTO.

| Cambio | Qué cambió | Dónde |
|---|---|---|
| **Estado** | LISTO. La tabla "Preguntas bloqueantes" pasa a "Decisiones registradas", sin las ramas que ya no aplican. Se quitan del cuerpo las condiciones "si P-0x es A/B" | Cabecera, "Decisiones registradas" y todo el cuerpo |
| **P-05 (f), correo enmascarado** (decisión del humano) | El buscador devuelve `correoEnmascarado` y **nunca** el correo completo, en ningún campo.<br>- Enmascara el backend, antes de responder, con la función pura `enmascararCorreo` de `core/clases/busqueda.ts`.<br>- El roster del dueño (`GET …/alumnos`) conserva el correo completo.<br>- Casos borde: S-22.<br>- Pruebas: PR-B01d a PR-B01g (unitarias), PR-B04h (integración, con búsqueda del correo completo en el JSON serializado) y PR-B10g (frontend).<br>- R-07 se reduce. | S-11, S-22, §D-B1, §D-B3, §D-B4, §D-B6, §D-B7, `shared/`, "Autorización", "Pruebas requeridas", "Puntos de ataque" (b), R-07, H-3, textos para ESSENTIALS y PRD |
| **P-05 (g), `movimientos_inscripcion`** (decisión del humano) | Tabla nueva, con **migración nueva en CLASES-b** (`movimientos_inscripcion`, §D-B8).<br>- Se escribe en la misma transacción que el alta manual y la baja, solo cuando la inscripción cambia de verdad.<br>- Unirse con código no es un alta manual.<br>- CLASES no tiene ninguna ruta ni función de lectura.<br>- Sin índices secundarios. Llaves foráneas con `ON DELETE RESTRICT`.<br>- Pruebas PR-B16a a PR-B16h, en un archivo nuevo. | S-23, §D-B2, §D-B8, "Qué autoriza", "Cambios por capa", "Acceso a datos", "Pruebas requeridas", PA-03, V-03, V-04, V-05, "No se toca" (b), "No entra", textos para ESSENTIALS, §14 y PRD |
| **O-01** | El `nombre_busqueda` del cursor se lee solo de `usuarios` por PK, y el cursor se rechaza (`400`) solo si ese usuario no existe. Casos PR-B02f y PR-B03e | §D-B3 bis, "Acceso a datos" |
| **O-02** | PR-C04d con `timeout` explícito de 15 s y confirmación en cuanto `pg_stat_activity` muestra la espera, filtrando por `FOR SHARE` | PR-C04d |
| **Detalles menores de la revisión** | PR-C09a y PR-C03a partidos; PR-B08j pasa a PR-B08i; el texto para §6 no fija la forma de `requireAdmin` | "Pruebas requeridas", §D-0.3, R-08, texto para §6 |
| **Coherencia** | `enEspera=` no cambia (25, 29, 35 y 36). Las rutas no cambian. Los pasos de b suman el de la migración, y los de c y d se renumeran. La comprobación humana sigue en 6 puntos y unos 9.5 minutos | "Pruebas: listas cerradas", "Pasos de implementación", V-04, V-05, "Comprobación humana" |

## Enmienda 1 — revisión del manager (CAMBIOS REQUERIDOS: M-01 y M-02 bloquean; N-01 a N-09, no)
Incorporé todos los hallazgos, sin desacuerdos. El manager la aprobó (`revision.md`, "Revisión de la enmienda 1").

| Hallazgo | Qué cambió | Dónde |
|---|---|---|
| **M-01** (bloquea) | `POST /clases/:claseId/alumnos` responde `{ alumno: { id, nombre }, yaEstaba }`, sin `estadoPago`, `accesoRestringido` ni `email`.<br>- `listarAlumnosDeClase` queda como **la única** función que selecciona los datos de pago.<br>- `GET /clases/:claseId/alumnos` queda como la única ruta que los devuelve.<br>- Prueba PR-B06e. | §D-B1, §D-B2, "Cambios por capa", "Acceso a datos", "Autorización", PR-B06e |
| **M-02** (bloquea) | Cada ID es un solo comportamiento en un solo archivo.<br>- Listas cerradas por subentrega, en tres grupos.<br>- PA-16 solo fuera de esas listas.<br>- La fila abierta pasa a cuatro archivos concretos. | "Pruebas requeridas", "Cambios por capa", reglas de los pasos, PA-16 |
| **N-01** | ADMIN necesitará una excepción de la guarda | §D-0.3, R-08, texto para §6 |
| **N-02** | Paginación de personas y roster por conjunto de claves con `where`; PR-B02d, PR-B03d; PA-17; `paginacionRosterSchema` | §D-B1, §D-B3 bis |
| **N-03** | Ids de publicación y comentario generados en el handler | §D-C3 |
| **N-04** | Comprobación humana en 6 puntos | "Comprobación humana" |
| **N-05** | V-05 mecánica para los archivos de la raíz | V-05 |
| **N-06** | CHECK de `archivos` en las dos direcciones; PR-D08c | §D-D1 |
| **N-07** | PR-B05 con la misma forma de consulta que emite Prisma | PR-B05 |
| **N-08** | `LIMPIEZA_DIARIA` borra también los objetos | R-03, R-05, texto para §11 |
| **N-09** | El comentario lee la publicación `FOR SHARE`; PR-C04d | §D-C3, V-04 |
| Detalles menores | R-09, excepción de `PersonasView`, "Publicar anuncio" y "Publicar material", S-11, R-21 | Varios |

*Nota de la Enmienda 4:* los IDs N-01 a N-09 de esta tabla son de la revisión del plan. El N-04 de la revisión final de CLASES-a ("Unirme a la clase") es otro hallazgo, y está en la tabla de la Enmienda 4 (fila 11).

---

## Decisiones registradas
Las respuestas del humano del 2026-09-29 a la antigua tabla de preguntas bloqueantes, más las decisiones del cierre de CLASES-a y de CLASES-b y del arranque de CLASES-c. Ya no queda ninguna pregunta abierta.

| ID | Pregunta (resumen) | Decisión del humano | Qué aplica el plan |
|---|---|---|---|
| **P-01** | Dónde vive la "lista de clases" de PRD §7, si la barra lateral es compacta | **A:** la barra sigue compacta con "Inicio"; la lista son las tarjetas de "Mis clases" del inicio, y cada clase lleva "Volver a mis clases". El orquestador ajusta la frase del PRD §7 | §D-A5, texto para PRD §7 |
| **P-02** | Adjuntos y vista previa (RF-33, RF-25): dominio `archivos` | **(a) A:** entran, como CLASES-d.<br>**(b) A:** 25 MB por archivo y hasta 5 por publicación. Tipos: PDF, PNG, JPEG, WebP, GIF, Word, Excel y PowerPoint (actuales y 97-2003) y texto plano. Vista previa solo de imágenes, sin SVG.<br>**(c) A:** `minio@^8` en el backend.<br>**(d) A:** un archivo está `confirmado` si y solo si tiene publicación; `clase_id` autoriza al pendiente (R-10).<br>**(e) A:** `LIMPIEZA_DIARIA` queda antes de DEPLOY y borra también los objetos. | CLASES-d completa |
| **P-03** | Temas (RF-43) | **A:** en TAREAS, completo, con estas reglas:<br>(a) un elemento puede quedar "Sin tema";<br>(b) sin orden manual dentro de un tema: van por fecha de creación;<br>(c) borrar un tema pasa sus elementos a "Sin tema", con confirmación en línea;<br>(d) el alumno ve "Trabajo de clase" agrupado y de solo lectura, y el muro sigue cronológico. | "No entra" |
| **P-04** | Lo que depende de módulos que aún no existen | **(a) A:** RF-32 en TAREAS.<br>**(b) A:** los inicios salen parciales.<br>**(c) A:** CLASES encola los tres avisos en la misma transacción, sin consumidor hasta NOTIFICACIONES, con 7 días de retención. | §D-A5, §D-C3 |
| **P-05** | Huecos del PRD en clases y muro | **(a) A:** el maestro puede quitar alumnos, con confirmación en línea.<br>**(b) A:** el maestro borra publicaciones y comentarios de su clase, y cada autor borra su comentario.<br>**(c) A:** no se editan.<br>**(d) A:** el alumno no ve el código.<br>**(e) A:** el alumno no sale por su cuenta.<br>**(f) Cambio del humano:** el buscador muestra el nombre y el correo **enmascarado** (primeros 2 caracteres de la parte local, `***` y el dominio). El correo completo solo aparece en el roster, para alumnos ya inscritos en su clase. El buscador nunca muestra el estado de pago.<br>**(g) Cambio del humano:** el maestro puede quitar alumnos, pero cada alta manual y cada baja quedan registradas en `movimientos_inscripcion` (clase, alumno, maestro, tipo alta o baja, y fecha). En CLASES solo se escribe; la pantalla de consulta es de ADMIN. | (a) a (e): §D-B2, §D-C2. (f): §D-B3, S-22. (g): §D-B8, S-23 |
| **R-10** | ESSENTIALS pide "`archivos` con exactamente un contexto" | Aceptado: confirmado si y solo si tiene publicación, con `clase_id` para autorizar mientras tanto. El orquestador cambia ESSENTIALS con el texto propuesto | §D-D1, texto para ESSENTIALS |
| **R-19** | `consultaMe` sube a `services/sesionService.ts` | Aceptado | §D-A6 |
| **T-18** (cierre de CLASES-a) | Qué responden `inscritas` e `impartidas` ante un cursor que ya no existe | Aprobado: `400 VALIDACION` ("cursor: no es válido") si el cursor ya no es una inscripción del alumno o una clase del maestro. El frontend no cambia | §D-A4 |
| **Escalada de CLASES-b** (2026-09-30) | Cómo cerrar b con T-25 y T-26 abiertos, y adónde va el mismo patrón fuera de b | **1.** Cuarta ronda corta y cerrada, solo en archivos de b (T-25 y T-26 en `buscador-alumnos.tsx`, `tabla-alumnos.tsx` y `personas-view.tsx`), con la extensión de `DESIGN.md` §7.14 y sus pruebas normales; sin quinta ronda.<br>**2.** El "Ver más clases" de a (`panel-mis-clases.tsx`) pasa a CLASES-c; el "Cargar más enlaces" de admin, a ADMIN (o a un `chore`). | §D-B4, paso 25, §D-C5, "No entra" |
| **Triviales heredados de b** (2026-10-01) | Si los detalles menores de la revisión final de b van en un commit aparte | "Los triviales heredados de b entran en CLASES-c, no en un commit aparte." | §D-C5 bis, §D-C7 |

---

## Suposiciones

- **S-01 · Entorno** (de `docs/ESTADO.md` §5, sin volver a verificarlo):
  - Docker Desktop 4.48.0, Node `v24.21.0` y npm `11.19.0`.
  - Existe la regla del firewall "Campus: bloquear entrada a Docker en redes publicas" (Inbound, Block, perfil Público).
  - La suite del backend solo corre después de PA-01.
  - En el árbol hay dos cambios de documentación sin commit, anteriores a este encargo: `docs/ESTADO.md` y `docs/trabajo/AUTH-03-ajustes-de-cuentas/aprobacion.md`. Entran en el commit de CLASES-a y quedan fuera de V-05.
- **S-02 · Datos de una clase:**
  - Nombre de 2 a 120 caracteres, **en una sola línea**: sin saltos de línea ni los separadores Unicode U+2028 y U+2029 (T-16).
  - Descripción opcional de hasta 2,000 caracteres, en varias líneas.
  - El PRD no pide sección, aula ni materia.
  - Una descripción vacía se guarda como `null`.
- **S-03 · Código de invitación:**
  - 7 caracteres del alfabeto `ABCDEFGHJKLMNPQRSTUVWXYZ23456789` (32 símbolos, sin I, O, 0 ni 1): unos 3.4 × 10¹⁰ códigos posibles.
  - Al escribirlo, se aceptan minúsculas, espacios y guiones: se normaliza a mayúsculas sin separadores.
  - **"Espacios y guiones" es una lista cerrada** (T-15, arbitraje del manager): espacio y tabulador ASCII, U+00A0, U+2007, U+202F, U+3000, guion ASCII, U+2010 y U+2011.
  - Cualquier otro carácter queda en el texto y hace fallar la forma final. Entre ellos están las rayas U+2012 a U+2015, U+FEFF, U+200B y las letras que `toUpperCase` convertiría (`ß`, `ſ`, ligaduras): el paso a mayúsculas solo toca `a`–`z`.
  - Regenerar invalida el código anterior de inmediato; los que ya están inscritos no se ven afectados.
  - La unicidad la da un índice. Una colisión se reintenta **una vez**, sin ciclo (§D-A2).
- **S-04 · Unirse** es idempotente (`yaEstabas: true`).
  - Un código inexistente responde `404 CODIGO_INVALIDO`, también para quien ya está inscrito en la clase de un código viejo.
  - No hay límite propio de intentos: con 3.4 × 10¹⁰ códigos, adivinar uno no es práctico, y el límite de tasa global llega con DEPLOY (R-05).
- **S-05 · `clases.activa`** se crea con valor `true` por defecto (§14 de `ARCHITECTURE.md` la prevé para el KPI de RF-50), pero ninguna ruta la usa ni la cambia. Archivar una clase no entra.
- **S-06 · Color de la tarjeta** (`DESIGN.md` §7.6 deja la decisión a CLASES): se deriva del id de la clase con una función pura (`varianteDeClase`, §D-A5). Es estable, no se guarda y el maestro no lo elige.
- **S-07 · Pertenencia:**
  - `requireMembership` deja pasar al estudiante inscrito **y** al maestro dueño; `requireOwnership`, solo al maestro dueño.
  - El administrador no pasa por ninguna de las dos. Sus rutas de clases (RF-52) llegarán con ADMIN, bajo `/admin`, con una excepción de la guarda (N-01, R-08).
- **S-08 · Clase inexistente o ajena:** la misma respuesta, `403 SIN_ACCESO_A_LA_CLASE`, que no revela si la clase existe.
- **S-09 · Compañeros (RF-19):** el alumno ve al maestro y a los alumnos **activos**, por nombre y con su avatar de iniciales. No ve correo, estado de pago ni restricción de acceso: la restricción de un compañero tampoco se muestra a otros alumnos.
- **S-10 · Roster del maestro (RF-39):** nombre, correo **completo**, estado de pago, etiqueta "Acceso restringido" si aplica, y fecha de inscripción. Solo cuentas activas.
- **S-11 · Buscador (RF-38, RN-04):**
  - Solo estudiantes activos.
  - **Longitud del término (T-20, T-24; Enmienda 5):** de 3 a 120 puntos de código **ya normalizado**, con un tope de 1000 en crudo. La normalización y el criterio se definen una sola vez, en `shared/` (§D-B3).
  - **El mínimo cuenta los espacios interiores** que quedan tras normalizar (D-2, Enmienda 5): `"a b"` mide 3 y se acepta; `"  ab  "` mide 2 y no.
  - Devuelve hasta 20 resultados y un indicador `hayMas`. No pagina más allá: si hay más, se pide un término más largo (R-06, aceptado por el manager).
  - Muestra el nombre y el **correo enmascarado** (P-05 f, S-22), nunca el correo completo ni el estado de pago.
  - Un solo `LIKE` sobre el término completo: "rez" y "José Pé" encuentran a "José Pérez", y "perez jose" no. RN-04 ("por cualquier parte del nombre") se cumple.
  - El `AND` por palabra que el manager sugirió como opcional no se adopta, para no sumar otra forma de consulta al índice; se puede agregar después sin migración.
- **S-12 · Alta manual de un alumno restringido:** se permite. RN-03 no lo impide, y el roster lo marca.
- **S-13 · Publicaciones:**
  - Anuncio: texto de 1 a 5,000 caracteres.
  - Material: título de 1 a 200 y texto opcional de hasta 5,000.
  - Texto plano, sin formato ni enlaces automáticos. React escapa el contenido; ningún `dangerouslySetInnerHTML`.
  - Solo publica el maestro dueño (RF-33); los alumnos comentan (RF-12).
- **S-14 · Comentarios:**
  - Texto plano de 1 a 1,000 caracteres.
  - Comentan los alumnos inscritos y el maestro dueño.
  - Se muestran del más antiguo al más reciente.
  - Siguen sin adjuntos (decisión del humano en DOCS-02b).
- **S-15 · Textos de interfaz:** los de este plan son propuesta (§D-A7, §D-B6, §D-C6 y §D-D6), con el tono de `DESIGN.md` §9.
- **S-16 · Sin la CLI de shadcn:** todo componente nuevo se escribe a mano, como `table.tsx` y `badge.tsx` en AUTH-03. D-02 y D-03 de DOCS-01 siguen pendientes.
- **S-17 · "Inicio" no se marca activo en las páginas de una clase:** `BarraNavegacion` usa `end`, y el marco no se toca. Las páginas de clase llevan su propio enlace "Volver a mis clases".
- **S-18 · Sin diálogos:** todas las confirmaciones son en línea (`DESIGN.md` §7.14). M-02 de DESIGN-01a sigue con ADMIN.
- **S-19 · `index.html` no se toca:** el área segura de iOS sigue con DEPLOY.
- **S-20 · Una sola dependencia nueva:** `minio@^8` en CLASES-d.
- **S-21 · CORS de MinIO en `dev`:**
  - El servidor de MinIO admite cualquier origen por defecto (no se configura `MINIO_API_CORS_ALLOW_ORIGIN`), así que el navegador puede subir desde `http://127.0.0.1:5173` sin tocar `infra/`.
  - No lo verifica ninguna prueba automática: lo comprueba H-5.
  - Si H-5 falla por CORS, el orquestador se detiene y se lo lleva al humano, porque el remedio tocaría `infra/`.
  - El CORS de R2 es de DEPLOY.
- **S-22 · Correo enmascarado, casos borde** (P-05 f; ajustado en la Enmienda 3). `enmascararCorreo(email)`:
  - separa en la **última** `@`: la parte local es lo de antes y el dominio, lo de después; el dominio se muestra completo;
  - cuenta caracteres Unicode completos (`Array.from`), no unidades de UTF-16;
  - **regla general: hasta 2 caracteres de la parte local, y nunca todos.** Así:
    - **3 caracteres o más:** los 2 primeros + `***` + `@dominio` (`ana.lopez@colegio.mx` → `an***@colegio.mx`), el texto del humano tal cual;
    - **2 caracteres:** solo el primero + `***` + `@dominio` (`jo@x.mx` → `j***@x.mx`);
    - **1 carácter:** ninguno: `***` + `@dominio` (`a@x.mx` → `***@x.mx`).
  - Mostrar 2 de 2, o 1 de 1, dejaría ver la parte local completa, y el humano pidió que el correo completo no se vea en el buscador;
  - **sin `@`, con la parte local vacía o con el dominio vacío:** `***`, sin nada del original. `correoSchema` (`z.email`) no admite esos correos ni una segunda `@`, así que el caso solo cubre datos anteriores a la validación; la función no lanza.
  - Nada de esto cambia el diseño: por eso no es pregunta. El manager lo marcó como informativo para el humano (`revision.md`, "Para el humano", punto 1).
- **S-23 · `movimientos_inscripcion`** (P-05 g):
  - **"fecha"** es la columna `creado_en` (`timestamptz`), la convención de todas las tablas (§14). Es la hora de inicio de la transacción, así que **no sirve para ordenar**;
  - **el orden del registro es la columna `secuencia`** (`BIGSERIAL`), que toma su valor en el `INSERT` del movimiento (M-03, §D-B8);
  - **`maestro_id` es quien hace el movimiento**: el perfil de la petición. Hoy siempre coincide con `clases.maestro_id`. Si ADMIN deja que el admin agregue o quite alumnos (RF-52), ese encargo decide si registra sus movimientos aquí (y si renombra la columna);
  - **solo se registran los cambios reales:** un alta con `yaEstaba: true` y una baja de alguien no inscrito no escriben nada;
  - **unirse con código no es un alta manual** y no registra nada. La baja sí se registra siempre, aunque la inscripción viniera de un código: la baja siempre es manual.

---

## Pendientes de `ESTADO.md`: resueltos o reasignados

| Pendiente | Qué hace este plan | Dónde |
|---|---|---|
| RF-25 (vista previa de imágenes) | Entra en CLASES-d | §D-D |
| RF-43 (temas) y sus preguntas | Se reasigna a TAREAS, con las respuestas del humano registradas en P-03 | "Decisiones registradas" |
| R-01 de DESIGN-01 (barra lateral con lista de clases) | Resuelto con P-01 A; el texto del PRD §7 lo ajusta el orquestador | "Textos literales propuestos" |
| S-07 de DESIGN-01 (foco blanco sobre superficies de color) | Se resuelve en CLASES-a | §D-A5, `DESIGN.md` §6 |
| M-20 de AUTH-03b (`AccionEstadoVacio` exportado) | Se resuelve en CLASES-a | §D-A6 |
| AUTH-01: `requireMembership` y `requireOwnership` reales | CLASES-a | §D-0 |
| AUTH-01: vaciar toda la caché al cambiar de identidad | CLASES-a | §D-A5 |
| AUTH-01: ESLint contra `addHook` en `handlers/` (M-14) | CLASES-a | §D-0.4 |
| AUTH-01: guarda sobre todas las rutas (M-15), incluidos los comodines generales `/api/*` y `/api/:seccion/*` (Enmienda 4) | Se reasigna a **CHORE-02** | §D-0.3, R-08 |
| C-07 (`nombre_busqueda` normalizado en `core/` y trigramas) | Se resuelve en CLASES-b (índice en la migración de a) | §D-A1, §D-B3 |
| D-02 y D-03 de DOCS-01 | Siguen pendientes (S-16) | — |
| R-10 de DESIGN-01 | `--text-display` en móvil se resuelve en CLASES-a; el radio de las casillas sigue pendiente | §D-A5 |
| M-02 de DESIGN-01a | Sigue con ADMIN (S-18) | — |
| Área segura de iOS | Sigue con DEPLOY (S-19) | — |
| M-17 de AUTH-03a | Se reasigna al próximo encargo que toque `establecer-contrasena-view.tsx` | — |
| **Nuevo:** `LIMPIEZA_DIARIA` de archivos pendientes y descartados (filas **y objetos**) | Antes de DEPLOY | R-05 |
| **Nuevo:** excepción de la guarda para las rutas de clases del admin | ADMIN | §D-0.3, R-08 |
| **Nuevo:** pantalla de consulta de `movimientos_inscripcion`, con sus índices (ordenada por `secuencia`) | ADMIN | §D-B8 |
| **Nuevo (Enmienda 4):** caracteres `Cf` invisibles en el nombre de la clase (se puede crear una clase de nombre visualmente vacío) | CLASES-c: regla única de contenido visible (Enmienda 6) para el nombre de la clase, el título del material, el anuncio y los comentarios, aplicada también a `nombreClaseSchema` | §D-C4 |
| **Nuevo (Enmienda 4):** N-04 de la revisión final de a ("Unirme a la clase" marca en el campo errores que no son de un campo) y los textos fijos "Nueva clase" y "Crear clase" de `inicio-maestro-view.tsx` | CLASES-b, carril trivial dentro de b | §D-B4 bis |
| **Nuevo (Enmienda 4):** intermitencia de la suite del backend por `LOCK TABLE usuarios` (espera en cadena entre `cuentas-r1.ataque:130` y las filas retenidas de `cuentas-r3` y `bloqueo-usuario`) | CHORE-02 (ya en `docs/ESTADO.md` §3) | R-27 |
| **Nuevo (Enmienda 5):** "Ver más clases" de a (`panel-mis-clases.tsx`) deja el foco en `<body>` al desaparecer (patrón de T-26) | CLASES-c, con la autorización del archivo; "Ver más publicaciones" y "Ver más comentarios" nacen con el mismo criterio | §D-C5, PR-C11a a PR-C11c |
| **Nuevo (Enmienda 5):** "Cargar más enlaces" de admin, mismo patrón de T-26 | ADMIN (o un `chore`) | "No entra" |
| **Nuevo (Enmienda 5):** PR-B05 retiene `usuarios` unos 5 s y alarga la ventana de la espera en cadena | CHORE-02, junto a la espera en cadena | R-27 |
| **Nuevo (Enmienda 5):** sugerencia para la pantalla de movimientos: dejar ver un alta seguida de una baja del mismo alumno en poco tiempo (observación 1 del tester, consecuencia aceptada de P-05) | ADMIN | "No entra" |
| **Nuevo (Enmienda 5):** con un término demasiado largo, `aria-describedby` lee la ayuda permanente y luego el aviso | H-6 (escucharlo una vez); si molesta, carril trivial | "Comprobación humana" |
| **Nuevo (Enmienda 5):** N-B1, `claseId ?? ""` en `personas-view.tsx` y `alumnos-view.tsx` (no bloquea) | CLASES-c (Enmienda 6, carril trivial dentro de c; decisión del humano del 2026-10-01), junto con el mismo patrón en `clase-layout.tsx` y `editar-clase-view.tsx` | §D-C5 bis |
| **Nuevo (Enmienda 6):** el aviso "Agregaste a…" se pierde si la fila del buscador se desmonta (observación 2 del tester, ronda 5 de b) | CLASES-c, carril trivial | §D-C5 bis |
| **Nuevo (Enmienda 6):** `focoPerdido` se exporta desde `hooks.ts` sin ser un hook (estaba en `docs/ESTADO.md` §3) | CLASES-c, carril trivial: pasa a `lib.ts` | §D-C5 bis |
| **Nuevo (Enmienda 6):** la línea "Implementan este patrón…" de `DESIGN.md` §7.14 (estaba en `docs/ESTADO.md` §3) | CLASES-c, carril trivial | §D-C7 |
| **Nuevo (Enmienda 6):** `claseId ?? ""` en `components/formulario-clase.tsx` (prop opcional del modo "crear", no un parámetro de la ruta) | Carril trivial, en el próximo cambio que toque `formulario-clase.tsx` (por ejemplo, que `useEditarClase` reciba el id al mutar). El orquestador lo anota también en `docs/ESTADO.md` §3 | §D-C5 bis |
| **Nuevo (Enmienda 6):** `shared/src/auth.ts` conserva su copia privada del conteo de visibles (`contarVisibles`), equivalente a `contarCaracteresVisibles` | El próximo encargo que toque `shared/src/auth.ts`: que importe la definición de `clases.ts`. El orquestador lo anota también en `docs/ESTADO.md` §3 | §D-C4 |
| **Nuevo (Enmienda 8):** `formulario-clase.tsx` valida la descripción sin aplicar antes `normalizarTextoLargo` (el mismo patrón de T-31) | Carril trivial, en el próximo cambio que toque `formulario-clase.tsx`, junto con su `claseId ?? ""`. El orquestador lo anota también en `docs/ESTADO.md` §3 | §D-C4 |
| **Nuevo (Enmienda 8):** `descripcionClaseSchema` responde el mensaje de tipo por defecto de zod, en inglés (el mismo patrón de T-33) | Carril trivial, en el próximo cambio que toque `descripcionClaseSchema`. El orquestador lo anota también en `docs/ESTADO.md` §3 | §D-C6 |
| **Nuevo (Enmienda 9):** "Ver más clases" muestra el texto técnico tras el `400` del cursor (los inicios y `panel-mis-clases.tsx`, de a) | El próximo cambio que toque esos archivos, con un texto como el de T-34 (ya en `docs/ESTADO.md` §3) | §D-C5 |
| **Nuevo (Enmienda 9):** botón "Volver a cargar" en el error de todas las listas paginadas (muro, comentarios, personas, roster e inicios), con una acción opcional en `MensajeError` (`components/mensaje-error.tsx`, que está en "No se toca"; M-23) | Decisión del humano después de H-6 de CLASES-d, o un `chore` de interfaz | §D-C5 |
| **Nuevo (Enmienda 9):** observación para NOTIFICACIONES: los trabajos de `PUBLICACION_CREADA`, `MATERIAL_CREADO` y `COMENTARIO_CREADO` pueden apuntar a una publicación o un comentario ya borrados, y el consumidor debe descartarlos sin fallar ni reintentar | NOTIFICACIONES (el orquestador lo agrega a `docs/ESTADO.md` §3) | §D-C3, texto para §8 |
| **Nuevo (Enmienda 9):** los `P2028` de AUTH (`cambiar-contrasena` e `invitarMaestrosEnLote`), fuera de los dos aceptados | CHORE-02 o AUTH (ya en `docs/ESTADO.md` §3) | R-27 |
| **Nuevo (Enmienda 9):** N-C7, el foco que cae en los encabezados `sr-only` del muro y de los comentarios no se ve | Comprobación humana H-6 de CLASES-d, como candidato a uno de sus puntos | "Comprobación humana" |
| **Nuevo (Enmienda 9):** dos detalles menores de la revisión final de c: la sangría de una línea de `handlers/README.md` y `conTextosNormalizados`, que podría vivir en `core/clases/texto.ts` | Carril trivial, en el próximo cambio que toque esos archivos | — |

---

## Alcance

### Subentregas
Las cuatro van en la misma rama, en este orden. Cada una tiene su ronda 0 del tester, su programador, sus rondas 1 a 3 del tester y la revisión final del manager. **La comprobación humana en navegador se hace una sola vez, al final de CLASES-d.**

| Subentrega | Requisitos | Contenido | Carril y motivo | Base de "No se toca" dentro de los paquetes |
|---|---|---|---|---|
| **CLASES-a** | RF-10 y RF-30 (parciales), RF-11, RF-31; RN-06 | - `requireMembership` y `requireOwnership` reales, más la regla de la guarda para `:claseId`.<br>- Migración `clases_e_inscripciones`, con el índice GIN del buscador.<br>- Crear, editar y ver clase; ver y regenerar el código; unirse con código.<br>- Inicio de estudiante y de maestro (bloque destacado y tarjetas) y páginas de clase (encabezado y secciones).<br>- ESLint contra `addHook`, caché al cambiar de identidad, M-20 y `--text-display-compacto`. | **Sensible:** `middleware/`, migración, raíz (`eslint.config.mjs`) | `<R>` = `3399c79` |
| **CLASES-b** | RF-19, RF-38, RF-39; RN-02, RN-03, RN-04 | - Migración `movimientos_inscripcion`.<br>- Compañeros (vista del alumno) y roster con estado de pago y restricción (vista del maestro).<br>- Buscador con correo enmascarado, alta manual y quitar alumno.<br>- Registro de altas manuales y bajas.<br>- `EstadoPagoBadge` y `AccesoRestringidoBadge`.<br>- **Heredado de a** (Enmienda 4, carril trivial dentro de b): N-04 en "Unirme a la clase" y los textos fijos del inicio del maestro (§D-B4 bis). | **Sensible:** migración, estado de pago y restricción de acceso | `<Ca>` |
| **CLASES-c** | RF-12 (sin tareas), RF-33 (sin adjuntos) | - Migración `publicaciones_y_comentarios`.<br>- Muro: publicar anuncios y materiales, comentar y borrar.<br>- Encolado de `PUBLICACION_CREADA`, `MATERIAL_CREADO` y `COMENTARIO_CREADO`.<br>- **Heredado de b** (Enmienda 5): el foco de "Ver más clases" en `panel-mis-clases.tsx`, con el criterio de §7.14 extendido (§D-C5).<br>- **Regla de contenido visible** (Enmienda 6, §D-C4), también para `nombreClaseSchema`.<br>- **Heredado de b** (Enmienda 6, carril trivial dentro de c; decisión del humano del 2026-10-01): el aviso de "Agregar a la clase", `focoPerdido` a `lib.ts`, `claseId ?? ""` en cuatro vistas y la línea de `DESIGN.md` §7.14 (§D-C5 bis y §D-C7). | **Sensible:** migración y colas | `<Cb>` |
| **CLASES-d** | RF-33 (adjuntos), RF-25 | - Dominio `archivos`: migración `archivos`, `adapters/storage` con `minio` y `STORAGE_*`.<br>- Subida y descarga con URL prefirmada y confirmación al publicar.<br>- Vista previa de imágenes. | **Sensible:** migración, dependencia nueva y configuración | `<Cc>` |

**Fuera de los paquetes** (`docs/`, raíz, `infra/`, `.claude/`), la base de "No se toca" es `<R>` para todo el encargo, con las reglas mecánicas de V-05 para `eslint.config.mjs`, `backend/package.json` y `package-lock.json`. Quedan fuera de esa verificación:
- los cambios en `docs/trabajo/CLASES-01-clases-y-muro/` y en `docs/ESTADO.md`;
- los cambios previos, sin commit, de `docs/trabajo/AUTH-03-ajustes-de-cuentas/aprobacion.md` (S-01), que entran en el commit de CLASES-a y ningún agente vuelve a tocar.

Los archivos protegidos que el orquestador cambie con autorización del humano se verifican contra el SHA-256 que anota en `aprobacion.md`, no contra un commit: `docs/ARCHITECTURE.md`, `docs/ARCHITECTURE-ESSENTIALS.md`, `docs/PRD.md`, `CLAUDE.md` y `README.md`, al cerrar cada subentrega.

### Puntos de commit
Hay **cuatro commits en total**, uno al cerrar cada subentrega, y ninguno intermedio: ni en el plan, ni en la ronda 0, ni en las correcciones. Ningún agente hace commit.

1. **Al cerrar CLASES-a** (APROBADO del manager después de las rondas del tester) → `<Ca>`.
2. **Al cerrar CLASES-b** → `<Cb>`.
3. **Al cerrar CLASES-c** → `<Cc>`.
4. **Al cerrar CLASES-d** (más la comprobación humana en navegador) → `<Cd>`.

Al cerrar cada subentrega, el orquestador:
1. aplica los textos de documentos de esa subentrega que autorice el humano ("Textos literales propuestos para documentos") y anota en `aprobacion.md` el SHA-256 de cada archivo protegido que cambió;
2. actualiza `docs/ESTADO.md` (con las filas de "Documentos a actualizar" de `revision.md`);
3. le da al humano un resumen de 15 líneas como máximo y el bloque de comandos listo para copiar (`git status`, `git add` con las rutas y `git commit` con el mensaje);
4. después del commit, lee el hash con `git log` y lo anota en `aprobacion.md`.

La subentrega siguiente arranca después de ese commit.

### Entra
1. **Autorización por clase (CLASES-a):**
   - `requireMembership` y `requireOwnership` reales sobre `:claseId`;
   - la decoración `request.clase` con su acceso `claseDe(request)`;
   - la guarda `onRoute`, que exige el sexto paso en toda ruta que declare el parámetro `claseId` en cualquier posición y en todo comodín bajo `/clases`, y que bajo `/clases/` el parámetro de clase se llame así (§D-0.3).
2. **Clases (CLASES-a):**
   - crear y editar (maestro);
   - ver el detalle (miembros);
   - ver y regenerar el código (dueño);
   - unirse con el código (estudiante);
   - listar las clases propias: inscritas (estudiante) e impartidas (maestro), con paginación por cursor y total.
3. **Inicio de estudiante y de maestro (CLASES-a):**
   - bloque destacado con saludo, titular con dato y la acción principal ("Unirme a la clase" o "Crear clase");
   - panel "Mis clases" con tarjetas.
   - Reemplazan a `BienvenidaView`, que se borra.
4. **Páginas de clase (CLASES-a):**
   - encabezado con el nombre, el maestro y la descripción; para el dueño, además, el código con "Copiar código" y "Regenerar código";
   - enlaces de sección;
   - el formulario de crear y editar.
5. **Compañeros y roster (CLASES-b):**
   - `GET /clases/{claseId}/personas` (miembros, sin datos sensibles);
   - `GET /clases/{claseId}/alumnos` (dueño, con correo completo, estado de pago y restricción);
   - buscador `GET /clases/{claseId}/alumnos/candidatos`, con el correo enmascarado en el backend;
   - alta manual `POST /clases/{claseId}/alumnos` (sin datos de pago en la respuesta) y baja `DELETE /clases/{claseId}/alumnos/{alumnoId}`;
   - registro de cada alta manual y cada baja en `movimientos_inscripcion`, en la misma transacción y con orden estricto (`secuencia`), sin ruta de lectura;
   - lo heredado de a: N-04 en "Unirme a la clase" y los textos fijos del inicio del maestro (§D-B4 bis).
6. **Muro (CLASES-c):**
   - publicaciones (anuncio y material) y comentarios, con paginación por cursor;
   - borrar;
   - encolado de los tres avisos;
   - lo heredado de b (Enmienda 5): el foco de "Ver más clases" en `panel-mis-clases.tsx` (§D-C5).
   - la regla única de contenido visible (Enmienda 6, §D-C4), aplicada también a `nombreClaseSchema`;
   - lo heredado de b por decisión del humano (Enmienda 6, §D-C5 bis): el aviso de "Agregar a la clase", `focoPerdido`, `claseId ?? ""` y la línea de `DESIGN.md` §7.14.
7. **Archivos (CLASES-d):**
   - `adapters/storage` y el puerto `Almacen` en `core/`;
   - `POST /clases/{claseId}/archivos` (pendiente y URL de subida);
   - confirmación al publicar;
   - `POST /clases/{claseId}/archivos/{archivoId}/descarga`;
   - vista previa de imágenes en el muro;
   - `services/almacenService.ts` en el frontend.
8. **Compartidos:**
   - `components/estado-pago-badge.tsx` y `components/acceso-restringido-badge.tsx` (CLASES-b);
   - `services/sesionService.ts` (CLASES-a, R-19);
   - en `lib/format.ts`, `formatearFechaLarga` (a) y `formatearTamano` (d).
9. **Patrones visuales nuevos**, documentados en `docs/DESIGN.md` en la subentrega que los crea (§D-A8, §D-B7, §D-C7, §D-D7).
10. **Textos literales propuestos** para `ARCHITECTURE.md`, ESSENTIALS, `CLAUDE.md`, `PRD.md` y `README.md`. El orquestador los aplica al cerrar cada subentrega, con autorización del humano.

### No entra (con destino)
| Qué | Destino |
|---|---|
| RF-32, categorías ponderadas | TAREAS |
| RF-43, temas (con las respuestas de P-03) | TAREAS |
| "Próximas entregas" y "siguiente fecha límite" de RF-10; bloque de entregas del inicio del estudiante | TAREAS |
| "Pendientes de calificar" de RF-30 | TAREAS o CALIFICACIONES |
| Tareas en el muro (RF-12) | TAREAS (R-01) |
| Consumidor de los avisos, campana y `notificaciones` | NOTIFICACIONES |
| RF-52: el admin ve todas las clases y agrega alumnos a cualquiera, con su excepción de la guarda (N-01) | ADMIN |
| **Pantalla de consulta de `movimientos_inscripcion`** (ordenada por `secuencia`) y los índices que pida su consulta; si el admin registra sus propias altas y bajas ahí. Sugerencia (Enmienda 5): que deje ver un alta seguida de una baja del mismo alumno en poco tiempo | ADMIN |
| Archivar o borrar una clase; salir de una clase; editar publicaciones o comentarios | Sin encargo: el PRD no los pide |
| `LIMPIEZA_DIARIA`: filas y objetos de los archivos pendientes vencidos y descartados | Antes de DEPLOY |
| Guarda sobre todas las rutas (M-15), incluidos los comodines generales `/api/*` y `/api/:seccion/*` | CHORE-02 |
| Caracteres `Cf` invisibles en el nombre de la clase (Enmienda 4) | CLASES-c (§D-C4) |
| Intermitencia de `LOCK TABLE usuarios` en la suite del backend (Enmienda 4), y PR-B05, que retiene `usuarios` unos 5 s (Enmienda 5) | CHORE-02 (R-27) |
| Foco de "Cargar más enlaces" de admin (patrón de T-26; Enmienda 5) | ADMIN (o un `chore`) |
| CORS del bucket privado en R2 | DEPLOY (`ARCHITECTURE.md` §11 ya lo prevé) |
| M-17 de AUTH-03a | Próximo encargo que toque `establecer-contrasena-view.tsx` |
| Índices de las llaves foráneas de autoría (R-21) | ADMIN, si alguna vez hay bajas físicas |

### Qué autoriza la aprobación de este plan (lista cerrada)
- **Tocar `backend/src/middleware/` (CLASES-a):**
  - `require-membership.ts`, `require-ownership.ts`, `tipos.ts`, `index.ts`, `guarda-de-rutas.ts` y `README.md`;
  - crear `pertenencia.ts`.
  - Nada más de `middleware/`. `rutas-publicas.ts` **no** cambia.
- **Tocar `eslint.config.mjs` de la raíz (CLASES-a):** solo el bloque nuevo de §D-0.4.
- **Cuatro migraciones:** `clases_e_inscripciones` (a, §D-A1), `movimientos_inscripcion` (b, §D-B8), `publicaciones_y_comentarios` (c, §D-C1) y `archivos` (d, §D-D1). Para cada una:
  - un único `npx prisma migrate dev --create-only --name <nombre>`;
  - revisión del SQL contra su sección;
  - un único `npx prisma migrate dev`, que la aplica en `campus_dev`.

  Si la aplicación falla, se corrige el SQL de esa misma carpeta; nunca se crea una segunda carpeta para tapar la primera.
- **Comandos de solo lectura de Prisma:** `validate`, `format --check`, `generate`, `migrate status` y `migrate diff --from-config-datasource --to-schema prisma/schema.prisma --exit-code`.
- **Una dependencia (CLASES-d):** `minio@^8` en `backend/`, con un único `npm install minio@^8 --workspace @campus/backend` desde la raíz. Cambian `backend/package.json` y `package-lock.json`, y nada más en el lockfile fuera del árbol de `minio`.
- **Borrar `frontend/src/features/auth/bienvenida-view.tsx` (CLASES-a).** Ningún otro archivo se borra.
- **Tocar `frontend/src/styles/tokens.css` y `tokens.test.ts` (CLASES-a):** solo el token `--text-display-compacto` de §D-A5.
- **Tocar `backend/src/adapters/queue/colas.ts` (CLASES-c):** solo las cuatro colas de §D-C3.
- **Prohibido:**
  - `migrate reset`, `migrate resolve`, `db push`, `db pull`, `db execute`, `migrate deploy` a mano y editar migraciones existentes;
  - cualquier escritura manual en `campus_dev`;
  - arrancar la API, el worker o Vite; abrir navegadores;
  - instalar cualquier otra dependencia;
  - leer o imprimir cualquier `.env`;
  - borrar archivos fuera del autorizado;
  - editar un archivo de producción para simular un defecto (PA-15).

---

## Diseño

### §D-0 · Transversal: autorización por clase (CLASES-a)

#### §D-0.1 · Sexto paso de la cadena
Archivo nuevo `middleware/pertenencia.ts` con `resolverClaseDeLaRuta(request, exigencia: "inscripcion" | "propiedad"): Promise<ClaseDeLaRuta>`:
1. Lee `request.params.claseId`:
   - si la ruta no tiene ese parámetro, es un error de programación: `500 CLASE_AUSENTE`;
   - si no es un UUID, `400 VALIDACION` ("claseId: debe ser un identificador válido"), con `claseIdParamSchema` de `shared/`.
2. `const perfil = perfilDe(request)`.
3. `buscarDatosDePertenencia(claseId, perfil.id)` (`adapters/db/clases.ts`) → `{ maestroId: string; inscrito: boolean } | null`, en **una sola consulta**: `clases` por PK con `inscripciones` filtradas por `usuario_id` (PK compuesta).
4. `relacionConClase(perfil, datos)` y `evaluarPertenencia(relacion, exigencia)`, de `core/clases/pertenencia.ts`. Si hay error, se lanza `403 SIN_ACCESO_A_LA_CLASE` ("No tienes acceso a esta clase."), igual para una clase inexistente y para una ajena.
5. Devuelve `{ id: claseId, relacion }`.

`requireMembership()` y `requireOwnership()` son `function` con nombre que asignan `request.clase = await resolverClaseDeLaRuta(request, …)`.
- `tipos.ts` declara `clase: ClaseDeLaRuta | null` y exporta `claseDe(request)`, que responde `500 CLASE_AUSENTE` si la ruta no pasó por el sexto paso, igual que `perfilDe`.
- `registrarMiddleware` decora `clase` con `null`.

**Reglas de `relacionConClase`** (pura):
- `"maestro"` si `perfil.rol === "maestro"` y `datos.maestroId === perfil.id`;
- `"estudiante"` si `perfil.rol === "estudiante"` y `datos.inscrito`;
- en cualquier otro caso, `null`: datos nulos, admin, maestro ajeno o estudiante no inscrito.

**`evaluarPertenencia`:** con `"propiedad"`, solo pasa `"maestro"`; con `"inscripcion"`, pasa cualquier relación no nula.

El orden de la cadena no cambia: `withAccess` y `requireRole` corren antes, así que un restringido o un admin nunca llegan a la consulta de pertenencia.

#### §D-0.2 · Marcas y `protegido()`
- `index.ts` marca el sexto paso con `marcarPasoDeLaCadena(requireMembership(), "requireMembership")` o con `"requireOwnership"`.
- El tipo `PasoObligatorio` de `guarda-de-rutas.ts` se amplía a `PasoDeLaCadena = PasoObligatorio | "requireMembership" | "requireOwnership"`.
- `OpcionesProtegido` no cambia.

#### §D-0.3 · Regla nueva de la guarda `onRoute` (texto de la Enmienda 4: T-02 y T-13)
En `motivoDeRechazo`, para toda ruta que pueda atender `/api/*` y no sea pública, rige esta regla:

> **Toda ruta bajo `/api` que declare un parámetro llamado `claseId` en cualquier posición de su URL (`:claseId` seguido de un carácter que no pueda formar parte del nombre, o del fin), y todo comodín bajo `/clases` (`/clases*` y `/clases/*`, a cualquier profundidad), lleva el sexto paso marcado en la posición 5; bajo `/clases/`, el único parámetro permitido en el segmento siguiente es `:claseId`.**

- **"En cualquier posición"** incluye `:claseId` al principio o en medio de un segmento, `:claseId?`, `:claseId(regex)` y `:claseId-:parte`. Un parámetro cuyo nombre solo empieza igual (`:claseIdOtro`) no cuenta, porque el carácter siguiente sí forma parte del nombre.
- **Si falta el sexto paso**, el motivo es `"tiene :claseId (o un comodín bajo /clases) y no pasa por requireMembership ni requireOwnership"`.
- **Si bajo `/clases/` el segmento siguiente declara otro parámetro**, o `:claseId` combinado con otro, el motivo es `"nombra el parámetro de clase distinto de :claseId"`.
- **Dónde vive la expresión:** en `guarda-de-rutas.ts`, y la documenta `middleware/README.md`. El plan fija la regla, no la expresión.

Una ruta **con** pertenencia y **sin** `:claseId` sigue arrancando (así lo hacen hoy `guarda-r2`), y en una petición responde `500 CLASE_AUSENTE` (PR-A06d).

**Fuera de esta regla:** los comodines generales `/api/*` y `/api/:seccion/*`, que también pueden atender `/api/clases/…`, van con la guarda sobre todas las rutas (M-15), en CHORE-02.

**Consecuencia para ADMIN (N-01):**
- Con esta regla, `/api/admin/clases/:claseId` exigiría un sexto paso que el admin nunca pasa, y `/api/admin/clases/:id` se rechaza por el nombre.
- El encargo ADMIN (RF-52) agregará una excepción de la guarda, en `middleware/` y en carril sensible. La forma la decide ese plan; como sugerencia, un sexto paso propio del admin, marcado, que la regla acepte junto a los otros dos (R-08).
- **No se construye en CLASES.**

#### §D-0.4 · ESLint contra `addHook` en `handlers/` (M-14)
Bloque nuevo en `eslint.config.mjs`, después del bloque de `executeSql` y con `files: ["backend/src/handlers/**"]`. En la configuración plana, el último bloque que coincide reemplaza las opciones de la regla, así que el bloque repite los dos selectores de `executeSql` y agrega uno más:
```js
{ selector: "CallExpression[callee.property.name='addHook']",
  message: "Los plugins de handlers/ no añaden hooks: correrían antes de protegido() y la guarda no los ve (middleware/README.md, M-14)." }
```
Hoy ningún archivo de `handlers/` usa `addHook` (`app.ts` y `guarda-de-rutas.ts` están fuera de ese glob).

#### §D-0.5 · Errores nuevos (en `shared/src/clases.ts`, `CODIGOS_CLASES`)
- **CLASES-a a c:** `SIN_ACCESO_A_LA_CLASE` (403), `CODIGO_INVALIDO` (404), `ALUMNO_NO_ENCONTRADO` (404), `PUBLICACION_NO_ENCONTRADA` (404), `COMENTARIO_NO_ENCONTRADO` (404) y `BUSQUEDA_MUY_CORTA` (400).
- **CLASES-d:** `ARCHIVO_INVALIDO` (400), `ARCHIVO_NO_SUBIDO` (400), `ARCHIVO_NO_ENCONTRADO` (404), `ALMACEN_NO_CONFIGURADO` (503) y `ALMACEN_NO_DISPONIBLE` (503).
- **Errores de programación**, que no van a `shared/`: `CLASE_AUSENTE` y `CODIGO_NO_DISPONIBLE` (500).

### CLASES-a

#### §D-A1 · Migración `clases_e_inscripciones` (compatible hacia atrás)
El SQL de `--create-only` debe contener **solo** esto (salvo los nombres que genere Prisma):
```sql
CREATE TYPE "origen_inscripcion" AS ENUM ('codigo', 'manual');
CREATE TABLE "clases" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "maestro_id" UUID NOT NULL,
  "nombre" TEXT NOT NULL,
  "descripcion" TEXT,
  "codigo_invitacion" TEXT NOT NULL,
  "activa" BOOLEAN NOT NULL DEFAULT true,
  "creado_en" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "actualizado_en" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "clases_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "inscripciones" (
  "clase_id" UUID NOT NULL,
  "usuario_id" UUID NOT NULL,
  "origen" "origen_inscripcion" NOT NULL,
  "creado_en" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "inscripciones_pkey" PRIMARY KEY ("clase_id", "usuario_id")
);
CREATE UNIQUE INDEX "clases_codigo_invitacion_key" ON "clases"("codigo_invitacion");
CREATE INDEX "clases_maestro_id_creado_en_id_idx" ON "clases"("maestro_id", "creado_en" DESC, "id" DESC);
CREATE INDEX "inscripciones_usuario_id_creado_en_clase_id_idx" ON "inscripciones"("usuario_id", "creado_en" DESC, "clase_id" DESC);
CREATE INDEX "usuarios_nombre_busqueda_idx" ON "usuarios" USING GIN ("nombre_busqueda" gin_trgm_ops);
ALTER TABLE "clases" ADD CONSTRAINT "clases_maestro_id_fkey" FOREIGN KEY ("maestro_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "inscripciones" ADD CONSTRAINT "inscripciones_clase_id_fkey" FOREIGN KEY ("clase_id") REFERENCES "clases"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "inscripciones" ADD CONSTRAINT "inscripciones_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
```
En `schema.prisma`:
- modelos `Clase` e `Inscripcion`, con `@@map`, las relaciones y los índices de arriba (`@@index([maestroId, creadoEn(sort: Desc), id(sort: Desc)])`, `@@id([claseId, usuarioId])` e `@@index([usuarioId, creadoEn(sort: Desc), claseId(sort: Desc)])`);
- enum `OrigenInscripcion` con `@@map("origen_inscripcion")`;
- en `Usuario`: `@@index([nombreBusqueda(ops: raw("gin_trgm_ops"))], type: Gin)` y las relaciones inversas.

**Compatibilidad:**
- Solo tablas e índices nuevos. `usuarios` gana un índice, sin cambios de columnas.
- `pg_trgm` ya existe (`extensiones_iniciales`).
- El índice sobre `usuarios` bloquea sus escrituras mientras se crea; con unos pocos miles de filas son milisegundos (R-17).

#### §D-A2 · Rutas de CLASES-a (prefijo `/api`, plugin `handlers/clases/clases.ts`)
| Ruta | Cadena (`protegido`) | Entrada | Respuesta | Notas |
|---|---|---|---|---|
| `POST /clases` | `roles: ["maestro"]` | `crearClaseSchema` `{ nombre, descripcion? }` | `201 { clase: ClaseDetalle }` | `maestroId` sale de `perfilDe(request)`; cualquier otro campo del cuerpo se descarta. La descripción pasa por `normalizarTextoLargo` **antes** de validarse (T-01) |
| `GET /clases/inscritas?cursor&limite` | `roles: ["estudiante"]` | `paginacionSchema` (cursor = `claseId`) | `200 { clases: ClaseInscrita[], total, siguienteCursor }`; `400 VALIDACION` si el cursor no es válido (§D-A4) | `ClaseInscrita = { id, nombre, maestro: { nombre } }` |
| `GET /clases/impartidas?cursor&limite` | `roles: ["maestro"]` | ídem | `200 { clases: ClaseImpartida[], total, siguienteCursor }`; `400 VALIDACION` si el cursor no es válido (§D-A4) | `ClaseImpartida = { id, nombre, alumnos: number }` (solo alumnos activos) |
| `POST /clases/unirse` | `roles: ["estudiante"]` | `unirseSchema` `{ codigo }` (normalizado en zod) | `200 { clase: { id, nombre }, yaEstabas: boolean }`; `404 CODIGO_INVALIDO` | Inscripción con `origen = 'codigo'`; **no** escribe en `movimientos_inscripcion` (S-23) |
| `GET /clases/:claseId` | `roles: ["estudiante", "maestro"], pertenencia: "inscripcion"` | — | `200 { clase: ClaseDetalle }` | `ClaseDetalle = { id, nombre, descripcion: string \| null, maestro: { id, nombre } }`. **Sin** `codigoInvitacion` |
| `PUT /clases/:claseId` | `roles: ["maestro"], pertenencia: "propiedad"` | `editarClaseSchema` `{ nombre, descripcion? }` (reemplazo completo) | `200 { clase: ClaseDetalle }` | `updateMany` con `id` **y** `maestro_id` como defensa extra; si actualiza 0 filas, `403 SIN_ACCESO_A_LA_CLASE`. La descripción pasa por `normalizarTextoLargo` **antes** de validarse (T-01) |
| `GET /clases/:claseId/codigo` | `roles: ["maestro"], pertenencia: "propiedad"` | — | `200 { codigo }` + `Cache-Control: no-store` | |
| `POST /clases/:claseId/codigo` | ídem | — | `200 { codigo }` + `no-store` | Regenera |

**`normalizarTextoLargo` antes de validar (T-01):** en `POST /clases` y `PUT /clases/:claseId`, la descripción se normaliza (CRLF y CR → LF, recorte de extremos) y **después** se valida con `descripcionClaseSchema`. Así un `\r` de Windows no se rechaza como carácter de control. Los demás caracteres de control siguen rechazados (§D-A3).

**¿Por qué `inscritas` e `impartidas`, y no un solo `GET /clases`?** Con una sola ruta, el handler tendría que elegir los datos según el rol, y eso es una decisión de autorización dentro del handler (regla 2). Con dos rutas la decide `requireRole`. Es un cambio de nombre respecto de `ARCHITECTURE.md` §7 (R-09).

**Generación del código** (S-03):
- `core/clases/codigo.ts`: `codigoDesdeBytes(bytes: Uint8Array): string`. Es pura y usa `ALFABETO_CODIGO_CLASE[b % 32]`; con 32 símbolos, `% 32` no tiene sesgo.
- El handler pasa `() => codigoDesdeBytes(randomBytes(LONGITUD_CODIGO_CLASE))` (`node:crypto`) a `crearClase` y a `regenerarCodigo`.
- En el adaptador, dos llamadas explícitas, **sin ciclo** (regla 4):
  1. primer intento;
  2. si choca con un P2002 sobre `codigo_invitacion` (lo detecta `traducirErrorPrisma` con su `alDuplicar`), un segundo intento con un código nuevo;
  3. si vuelve a chocar, `500 CODIGO_NO_DISPONIBLE`.

**Unirse:**
1. `buscarClasePorCodigo(codigo)` (índice único). Si no existe, `404`.
2. `inscribir` con `origen = 'codigo'` (`createMany`, `skipDuplicates`). Si inserta 0 filas, `yaEstabas: true`.

Son dos sentencias sin transacción: si el código se regenera entre las dos, la inscripción usa el id ya encontrado, y eso es aceptable.

#### §D-A3 · Datos compartidos (`shared/src/clases.ts`)
- **Alfabeto y código:**
  - `ALFABETO_CODIGO_CLASE` y `LONGITUD_CODIGO_CLASE = 7`;
  - `SEPARADORES_CODIGO_CLASE` (T-15, lista cerrada): espacio (U+0020) y tabulador (U+0009) ASCII, U+00A0, U+2007, U+202F, U+3000, guion ASCII (U+002D), U+2010 y U+2011;
  - `normalizarCodigoDeClase(texto)` quita **solo** los caracteres de `SEPARADORES_CODIGO_CLASE` y pasa a mayúsculas **solo** las letras `a`–`z`. Cualquier otro carácter queda tal cual y hace fallar la forma final; en particular, las rayas U+2012 a U+2015, U+FEFF, U+200B y las letras que `toUpperCase` convertiría (`ß` → `SS`, `ſ` → `S`, ligaduras como `ﬁ`);
  - `codigoInvitacionSchema`: `z.string().max(40).transform(normalizarCodigoDeClase).pipe(z.string().regex(/^[A-HJ-NP-Z2-9]{7}$/, "Escribe los 7 caracteres del código"))`.
- **Textos:**
  - `nombreClaseSchema`: `trim`, de 2 a 120 caracteres, sin caracteres de control ni inversores de dirección, y **en una sola línea**: rechaza también U+2028 y U+2029 (T-16);
  - `textoLargoSchema(max)`: permite `\n` y `\t`; prohíbe los demás caracteres de control C0 y C1 y los inversores de dirección (U+202A a U+202E y U+2066 a U+2069); **admite** los unificadores de emoji (U+200D);
  - `descripcionClaseSchema` = `textoLargoSchema(2000)`, opcional; una cadena vacía después de `trim` se vuelve `undefined`. El handler la normaliza con `normalizarTextoLargo` antes de validarla (§D-A2).
- **Esquemas de las rutas:** `crearClaseSchema`, `editarClaseSchema`, `unirseSchema` y `claseIdParamSchema = z.object({ claseId: z.uuid("claseId: debe ser un identificador válido") })`.
- **Respuestas:** `claseDetalleSchema`, `claseInscritaSchema`, `claseImpartidaSchema`, `listaClasesInscritasRespuestaSchema`, `listaClasesImpartidasRespuestaSchema`, `unirseRespuestaSchema` y `codigoClaseRespuestaSchema`.
- `CODIGOS_CLASES` y los tipos inferidos. `paginacionSchema` se reutiliza desde `enlaces-registro.ts`, sin moverlo.
- **Pendiente para CLASES-c:** los caracteres `Cf` invisibles en `nombreClaseSchema` (§D-C4).

#### §D-A4 · Paginación por cursor
`core/paginacion.ts`: `paginar<T>(filas: T[], limite: number, cursorDe: (fila: T) => string): { pagina: T[]; siguienteCursor: string | null }`.
- Los repositorios piden `take: limite + 1`.
- El cursor es el `id` de la última fila.
- En `inscritas`, el cursor es el `claseId`, con `cursor: { claseId_usuarioId }` y `skip: 1`. El orden `creado_en DESC, clase_id DESC` usa columnas propias de `inscripciones`, así que el `cursor` de Prisma aplica sin problema.
- Personas y roster usan conjunto de claves con `where` (§D-B3 bis).

**Cursor que ya no existe (T-18, decisión del humano; Enmienda 4):**
- **`GET /clases/inscritas`:** con `cursor`, el adaptador lee primero por PK `inscripciones` (`clase_id` = cursor, `usuario_id` = el alumno). Si no existe, `400 VALIDACION` ("cursor: no es válido"). Si existe, pagina como arriba.
- **`GET /clases/impartidas`:** con `cursor`, el adaptador lee primero `clases` por PK con el `maestro_id` del maestro. Si no existe o es de otro maestro, `400 VALIDACION` ("cursor: no es válido"). Si pasa, pagina como arriba.
- **Detalles:**
  - Es una consulta por PK, antes de pedir la página y fuera de cualquier ciclo.
  - Un cursor ajeno y uno inexistente reciben la misma respuesta, sin oráculo de existencia.
  - El alcance lo sigue dando el `usuarioId` o el `maestroId` del perfil: no es una verificación de autorización nueva.
  - El frontend no cambia: un error de "Ver más clases" llega como `isError` y se muestra con `MensajeError`.
- **Pruebas normales:** PR-A13c y PR-A13d. En `*.ataque`, C-16.
- **Residual aceptado por el manager:** si la fila del cursor se borra entre la lectura por PK y la página, puede salir una página vacía. Es una ventana de milisegundos, no se reproduce desde la interfaz y tiene el mismo alcance que el problema original.

**Principio común con §D-B3 bis:** un cursor se rechaza con `400 VALIDACION` solo cuando ya no se puede reconstruir la clave de orden desde la que se pagina.
- En `inscritas`, la clave (`inscripciones.creado_en`) desaparece con la inscripción.
- En `impartidas`, la clave (`clases.creado_en`) solo vale si la clase es del maestro.
- En personas y roster, la clave (`usuarios.nombre_busqueda`) sobrevive a la baja, y por eso allí el cursor se rechaza solo si el usuario no existe.

#### §D-A5 · Frontend de CLASES-a
**Rutas** (`app/router.tsx`, dentro de cada `RequireRol`):
- `/estudiante`:
  - índice → `InicioEstudianteView`;
  - `clases/:claseId` → `ClaseLayout`, con índice → `MuroView` (en a, un vacío provisional; §D-C5);
  - `clases/:claseId/personas` → `PersonasView`, que llega en b.
- `/maestro`:
  - índice → `InicioMaestroView`;
  - `clases/nueva` → `CrearClaseView`;
  - `clases/:claseId` → `ClaseLayout`, con índice → `MuroView`, `editar` → `EditarClaseView` y `alumnos` → `AlumnosView` (b).

`BienvenidaView` se borra, y `TEXTOS_SESION` pierde `saludo` y `proximamente` (sin más usos).

**Nombre de la sesión:** los inicios leen el nombre con `useNombreDeSesion()` (`features/clases/hooks.ts`), sobre `consultaMe`, que sube a `services/sesionService.ts` (R-19).

**`InicioEstudianteView`** (orbes en movimiento, ya en `RUTAS_CON_ORBES_EN_MOVIMIENTO`):
1. **`BloqueDestacado`** (`features/clases/components/bloque-destacado.tsx`, vidrio azul):
   - **Saludo:** `<p>` con un `<span>` que dice exactamente `Hola, <nombre>` y, en otro elemento, la fecha de hoy (`formatearFechaLarga`). El saludo depende solo de la sesión, así que se ve aunque falle la consulta de clases.
   - **Titular** (`h1`, `text-display-compacto sm:text-display`) con dato: `titularInicio(rol, total)`. Mientras carga, `Cargando`; con error, "No pudimos cargar tus clases".
   - **Siguiente paso:** texto en `text-accent-soft-glass`, **sin fondo**.
   - **Texto sobre el vidrio azul (M-06, Enmienda 4):** fuera de la tarjeta interna, solo dos colores de texto. Contraste según la tabla de `DESIGN.md` §3: 5.4 y 4.5.
     - `text-accent-foreground` (`#FFFFFF`): el titular, también en su mensaje de error;
     - `text-accent-soft-glass`: el saludo, la fecha y el siguiente paso.
   - La tarjeta interna (vidrio fuerte) conserva `--foreground` y `--muted-foreground`, y `Cargando` va como pastilla de vidrio fuerte. Ningún token nuevo.
   - **Tarjeta interna** (vidrio fuerte, 320 px):
     - insignia "Código de clase" y título "Únete a una clase";
     - `FormularioUnirseClase`, con el campo "Código de la clase" (`autoComplete="off"`, `spellCheck={false}`, `font-mono`, error con `ErrorDeCampo`) y el botón `primary` **"Unirme a la clase"** (`enEspera`);
     - con éxito, toast y navegación a `/estudiante/clases/{id}`. `CODIGO_INVALIDO` va bajo el campo; los demás errores, desde b, van con toast (N-04, §D-B4 bis).
2. **`PanelMisClases`** (`Card`), título `h2` "Mis clases":
   - estados en orden error → cargando → vacío → datos;
   - rejilla de `TarjetaClase` (2 columnas; 1 por debajo de 640 px);
   - "Ver más clases" (`outline`, `enEspera={isFetchingNextPage}`) solo si hay `siguienteCursor`;
   - vacío: `EstadoVacio` con el título "Aún no tienes clases" y la acción `outline` "Únete con tu código de clase", que **lleva el foco al campo del código**.

**`InicioMaestroView`:** la misma composición, con estas diferencias:
- La tarjeta interna lleva "Nueva clase" y el enlace-botón `primary` **"Crear clase"** (`Link` con `buttonVariants({ variant: "primary" })`, a `/maestro/clases/nueva`).
- Las tarjetas muestran "N alumnos".
- El vacío es "Aún no tienes clases", con la acción `outline` "Crea tu primera clase".

**`TarjetaClase`** (`features/clases/components/tarjeta-clase.tsx`):
- `Link` que ocupa toda la tarjeta, con nombre accesible = nombre de la clase; `--radius-card`, altura mínima de 104 px (`min-h-26`) y 20 px de relleno.
- Variante `varianteDeClase(claseId)` (`lib.ts`): la suma de los códigos de carácter del id módulo 3 → `"verde" | "azul" | "blanca"`.
- Metadatos: para el estudiante, el nombre del maestro (TAREAS agrega "· entrega el lunes"); para el maestro, "Sin alumnos", "1 alumno" o "N alumnos".
- **Foco (S-07):**
  - En las variantes de color: `focus-visible:-outline-offset-4` y `focus-visible:outline-brand-foreground` o `outline-accent-foreground` (contorno blanco de 2 px, 4 px hacia dentro).
  - En la blanca: el foco global de `--ring`, por fuera.
  - Sin `ring-` ni `focus:`.

**Bloque destacado, foco (S-07):**
- Los elementos enfocables del bloque **fuera** de la tarjeta interna (hoy ninguno) usan el contorno blanco.
- Dentro de la tarjeta interna, `--ring`. El botón `primary` ya trae su foco interior.

**Token nuevo (R-10 de DESIGN-01):** `--text-display-compacto` en `tokens.css` (`2rem`, interlineado `1.05`, interletraje `-0.03em`, peso `700`), expuesto por `@theme` como `text-display-compacto`.
- El titular usa `text-display-compacto sm:text-display`.
- `tokens.test.ts` suma su fila.
- No cambia `--text-display` ni ningún `@media`.

**`ClaseLayout`** (`features/clases/clase-layout.tsx`):
- `useParams().claseId` y `useClase(claseId)`: error → `MensajeError` con el mensaje del código y el enlace "Volver a mis clases"; cargando → `Cargando`; datos → lo siguiente.
- `EncabezadoClase` (`Card`): "Volver a mis clases" (`Link`, tamaño `enlace`), `h1` con el nombre de la clase (`text-h1`), "Maestro: \<nombre\>" y la descripción (`whitespace-pre-line`, `max-w-prose`).
- En el maestro, además:
  - `CodigoDeClase`, con:
    - la etiqueta "Código de la clase" y el código en `font-mono` y `text-h2`;
    - "Copiar código" (`outline`, `size="sm"`, `enEspera={copiando}`, `try/catch/finally` y toast);
    - "Regenerar código" (`outline`, `size="sm"`), con confirmación en línea (§7.14): frase de consecuencia, "Sí, regenerar" (`destructive`, `enEspera`) y "Cancelar". El foco va a "Cancelar" y, al cancelar, vuelve a "Regenerar código";
  - el enlace "Editar clase".
- `SeccionesDeClase`:
  - `<ul aria-label="Secciones de la clase">` con `NavLink` (`end`) estilados con `buttonVariants({ variant: "ghost", size: "sm" })`;
  - el activo lleva `aria-current="page"` y `bg-surface text-link`;
  - **no** es una `nav`;
  - en CLASES-a, solo "Muro"; CLASES-b agrega "Personas" (estudiante) y "Alumnos" (maestro).
- `<Outlet />`.

**`CrearClaseView` y `EditarClaseView`:** `FormularioClase` en una `Card`.
- Campos "Nombre de la clase" y "Descripción (opcional)" (`Textarea`), con `autoComplete="off"`.
- Validación en cliente con `crearClaseSchema` y `ErrorDeCampo`.
- **Errores de la API (T-19, Enmienda 4):**
  - un `VALIDACION` de `nombre` o `descripcion` va bajo su campo;
  - cualquier otro error (un 500, "sin conexión", `SIN_ACCESO_A_LA_CLASE` o un `VALIDACION` de un campo que no es del formulario) avisa con `toast.error`, sin `aria-invalid` en ningún campo (PR-A21e).
- Botón `primary` "Crear clase" o "Guardar cambios" (`enEspera`) y enlace-botón `outline` "Cancelar".
- Con éxito, toast y navegación a la clase.
- `EditarClaseView` precarga con `useClase`.

**Caché al cambiar de identidad:** en `features/auth/hooks.ts`, `consultarMeDeLaCuentaNueva` pasa de `removeQueries({ queryKey: consultaMe.queryKey })` a `removeQueries()` (**todas** las consultas, no las mutaciones).

#### §D-A6 · M-20 y detalles de CLASES-a
- **`components/estado-vacio.tsx`:** `AccionEstadoVacio` deja de exportarse; el tipo va en línea dentro de `EstadoVacioProps`.
- **`lib/format.ts` suma `formatearFechaLarga(fecha: Date, zona?: string): string`:** "martes 29 de septiembre", con `Intl.DateTimeFormat("es-MX", { weekday: "long", day: "numeric", month: "long" })`.
- **`services/sesionService.ts` (R-19):** contiene `consultaMe` (la clave `["me"]` y la misma `queryFn` de hoy). `features/auth/hooks.ts` la importa de ahí y la **reexporta** con el mismo nombre. `useMe` no cambia de firma.

#### §D-A7 · Textos de CLASES-a (propuesta; `features/clases/data.ts`)
- **Inicio del estudiante:**
  - titular: "Aún no estás en ninguna clase", "Estás en 1 clase" o "Estás en N clases";
  - siguiente paso con 0 clases: "Pide a tu maestro el código de su clase y escríbelo aquí para unirte.";
  - siguiente paso con 1 o más: "Aquí verás tus próximas entregas en cuanto tus maestros publiquen tareas.".
- **Inicio del maestro:**
  - titular: "Aún no tienes clases", "Tienes 1 clase" o "Tienes N clases";
  - siguiente paso con 0 clases: "Crea tu primera clase y comparte su código con tus alumnos.";
  - siguiente paso con 1 o más: "Comparte el código de cada clase para que tus alumnos se unan.".
- **Unirse:** "Únete a una clase", "Código de la clase", "Unirme a la clase"; toasts "Te uniste a \<clase\>" y "Ya estabas en \<clase\>"; `CODIGO_INVALIDO` "No encontramos una clase con ese código. Revisa que esté bien escrito.".
- **Panel:** "Mis clases", "Ver más clases", vacío "Aún no tienes clases", acciones "Únete con tu código de clase" y "Crea tu primera clase", y el error "No pudimos cargar tus clases. Revisa tu conexión e inténtalo de nuevo.".
- **Tarjeta:** "Sin alumnos", "1 alumno", "N alumnos".
- **Formulario:** "Crear clase", "Editar clase", "Nombre de la clase", "Descripción (opcional)", "Crear clase", "Guardar cambios", "Cancelar"; toasts "Clase creada" y "Cambios guardados".
- **Código:** "Código de la clase", "Copiar código", toast "Código copiado", "Regenerar código", la frase "El código actual dejará de funcionar. Quienes ya están en la clase no se ven afectados.", "Sí, regenerar", "Cancelar" y el toast "Código nuevo listo".
- **Clase:** "Volver a mis clases", "Maestro: \<nombre\>", "Muro", "Personas", "Alumnos", "Editar clase" y `SIN_ACCESO_A_LA_CLASE` "No tienes acceso a esta clase.".
- **Muro provisional (solo en CLASES-a):** "Pronto podrás ver aquí los anuncios y materiales de la clase.".

#### §D-A8 · `docs/DESIGN.md` (lo edita el programador de CLASES-a a mano, marcado como **propuesta**)
- **§4, Escala:** nota de implementación de `--text-display-compacto`.
- **§6, Foco:** la viñeta de los botones rellenos se extiende a las tarjetas de clase de color y al bloque destacado (blanco sobre `--brand`: 7.9; sobre `--accent`: 9.2; sobre vidrio azul: 5.4). Cierra S-07.
- **§7.1, tabla de alcance:** `/estudiante/clases/*`, `/maestro/clases/*` y `/maestro/clases/nueva`, con orbes quietos y vidrio.
- **§7.4:** nota de R-01 con la decisión de P-01, y "Inicio" sin marcar dentro de una clase (S-17).
- **§7.5, implementación:** `BloqueDestacado`, el saludo como texto, el titular con `h1` y su estado de carga y error.
- **§7.6, implementación:** `TarjetaClase`, la variante por id, los metadatos por rol y el foco.
- **§7.10:** los dos vacíos del inicio y la acción que lleva el foco al campo del código.
- **§7.16 (nueva), "Encabezado y secciones de una clase".**

La revisión final de a comprobó que el código coincide con lo documentado, incluidos los colores del texto sobre vidrio azul (M-06). `DESIGN.md` no cambió en la ronda 4.

### CLASES-b

#### §D-B1 · Rutas (plugin `handlers/clases/alumnos.ts`)
| Ruta | Cadena | Entrada | Respuesta |
|---|---|---|---|
| `GET /clases/:claseId/personas?cursor&limite` | `roles: ["estudiante", "maestro"], pertenencia: "inscripcion"` | `paginacionRosterSchema` (cursor = `usuarioId`; límite de 1 a 100, **50 por defecto**) | `200 { maestro: { id, nombre }, alumnos: { id, nombre }[], totalAlumnos, siguienteCursor }` |
| `GET /clases/:claseId/alumnos?cursor&limite` | `roles: ["maestro"], pertenencia: "propiedad"` | ídem | `200 { alumnos: AlumnoDeClase[], total, siguienteCursor }`, con `AlumnoDeClase = { id, nombre, email, estadoPago: "al_corriente" \| "deudor", accesoRestringido: boolean, origen: "codigo" \| "manual", inscritoEn }` (correo **completo**) |
| `GET /clases/:claseId/alumnos/candidatos?q&limite` | ídem | `busquedaCandidatosSchema` `{ q: 3–120 puntos de código ya normalizado, con tope de 1000 en crudo; limite: 1–50, 20 por defecto }` (T-20, T-24) | `200 { candidatos: { id, nombre, correoEnmascarado, yaInscrito }[], hayMas }` (**nunca** el correo completo, P-05 f).<br>- `400 VALIDACION` si el término mide más de 120 normalizados o más de 1000 en crudo, o menos de 3 en crudo y normalizado.<br>- `400 BUSQUEDA_MUY_CORTA` si solo al normalizarse queda por debajo de 3 (`"  ab  "`, PR-B04e). |
| `POST /clases/:claseId/alumnos` | ídem | `agregarAlumnoSchema` `{ alumnoId }` | `200 { alumno: { id, nombre }, yaEstaba }` (sin `estadoPago`, `accesoRestringido` ni correo: M-01); `404 ALUMNO_NO_ENCONTRADO` |
| `DELETE /clases/:claseId/alumnos/:alumnoId` | ídem | `:alumnoId` uuid | `204` (también si no estaba inscrito) |

- En los dos listados, los alumnos van ordenados por `nombre_busqueda` y después por `usuario_id`, y solo cuentan las cuentas activas.
- **`estadoPago` y `accesoRestringido` salen solo de `GET /clases/:claseId/alumnos`**, y los selecciona solo `listarAlumnosDeClase` (RN-02).
- **El correo completo sale solo de `GET /clases/:claseId/alumnos`** (alumnos ya inscritos en la clase del dueño). El buscador lo selecciona para enmascararlo, pero la respuesta solo lleva `correoEnmascarado` (§D-B3).
- `paginacionRosterSchema = paginacionSchema.extend({ limite: z.coerce.number().int().min(1).max(100).optional().default(50) })`, en `shared/src/clases.ts`. `paginacionSchema` (20 por defecto) sigue para las demás listas.

#### §D-B2 · Agregar y quitar, con registro (P-05 g)
Las dos operaciones van en **una transacción** del adaptador (`adapters/db/inscripciones.ts`), y escriben el movimiento solo si la inscripción cambió de verdad (S-23):
- **Agregar** — `agregarAlumnoManual({ claseId, alumnoId, maestroId }): Promise<{ alumno: { id, nombre }; yaEstaba: boolean } | null>`:
  1. dentro de la transacción, `usuarios` por PK con `rol = 'estudiante' AND activo`, con `select` de `id` y `nombre` solamente. Si no hay fila, devuelve `null` → `404 ALUMNO_NO_ENCONTRADO` (un maestro, el admin, una cuenta inactiva y un id inexistente dan la misma respuesta);
  2. `inscripcion.createMany({ data: [{ claseId, usuarioId: alumnoId, origen: "manual" }], skipDuplicates: true })`;
  3. si insertó 1 fila, `movimientoInscripcion.create({ claseId, alumnoId, maestroId, tipo: "alta" })`; si insertó 0 (`yaEstaba`), nada.
- **Quitar** — `quitarAlumno({ claseId, alumnoId, maestroId }): Promise<void>`:
  1. `inscripcion.deleteMany` por PK;
  2. si borró 1 fila, `movimientoInscripcion.create({ …, tipo: "baja" })`; si borró 0, nada.
- `maestroId` es `perfilDe(request).id`.
- **Orden del registro (M-03):**
  - Cada movimiento toma su `secuencia` (`BIGSERIAL`) en el momento de su `INSERT`, que siempre es el último paso de la transacción.
  - La transacción que espera a otra (por el conflicto de la PK o por el bloqueo de la fila) inserta su movimiento después de que la otra confirmó, así que recibe una `secuencia` mayor.
  - Por eso **`secuencia` respeta el orden real de los cambios de una misma inscripción**.
  - `creado_en` no sirve para ordenar: es la hora de inicio de la transacción.
- **Concurrencia** (en READ COMMITTED):
  - Dos altas simultáneas del mismo alumno se ordenan por el conflicto de la PK (`ON CONFLICT DO NOTHING` espera a la otra transacción): una inserta y registra, y la otra no.
  - Dos bajas simultáneas se ordenan por el bloqueo de la fila: una borra y registra; la otra, al despertar, ya no la encuentra.
  - Un alta y una baja simultáneas registran cada una solo si cambiaron algo.
- **Invariante** (con solo altas manuales y bajas, empezando sin inscripción). Para `(clase_id, alumno_id)`:
  - **la fila con la `secuencia` más alta** coincide con el estado final (alta ⇔ inscrito);
  - ordenadas por `secuencia`, las filas alternan alta y baja, empezando por alta;
  - altas − bajas ∈ {0, 1}.

  PR-B16f lo comprueba.
- **Quitar** no toca entregas ni ningún otro dato; hoy no existen.
- Unirse con código (`inscribir`, `db/clases.ts`) no cambia: no registra movimientos (S-23).

#### §D-B3 · Buscador (C-07) y correo enmascarado (P-05 f)
- **Normalización y criterio del término, en un solo lugar** (`shared/src/clases.ts`; T-20, T-24, Enmienda 5):
  - `normalizarTerminoDeBusqueda(q)`: la misma normalización que `normalizarParaBusqueda` de `core/auth/normalizacion.ts` (sin acentos, minúsculas, espacios colapsados y recortados);
  - `LONGITUD_MINIMA_BUSQUEDA = 3` y `LONGITUD_MAXIMA_BUSQUEDA = 120`, en puntos de código del término normalizado, y `LONGITUD_MAXIMA_BUSQUEDA_CRUDA = 1000`;
  - `estadoDeTerminoDeBusqueda(q)`: dice si el término es válido, muy corto o muy largo con ese criterio;
  - la usan el esquema (`busquedaCandidatosSchema`), `core/clases/busqueda.ts` y el frontend (§D-B5). Ninguno de los tres tiene su propia copia;
  - `core/auth/normalizacion.ts` **no cambia** (sigue normalizando `nombre_busqueda` al escribir), y una prueba exige que las dos normalizaciones sean equivalentes.
  - El mínimo cuenta los espacios interiores que quedan tras normalizar (S-11, D-2).
- `core/clases/busqueda.ts`:
  - `prepararTerminoDeBusqueda(q: string): string | null` normaliza con `normalizarTerminoDeBusqueda` de `shared/` y devuelve `null` si el resultado mide menos de `LONGITUD_MINIMA_BUSQUEDA`;
  - `escaparComodinesLike(t)` escapa `\`, `%` y `_` con `\`;
  - `enmascararCorreo(email: string): string`, con las reglas de S-22. Pura, sin lanzar.
- **El repositorio `buscarCandidatos`:**
  - filtra con `nombreBusqueda: { contains: terminoEscapado }`, `rol: "estudiante"` y `activo: true`;
  - ordena por `nombreBusqueda` y después por `id`, con `take: limite + 1`;
  - selecciona `id`, `nombre` y `email` (este último, para enmascararlo);
  - `yaInscrito` sale de `inscripciones: { where: { claseId }, select: { usuarioId: true } }`, en el mismo `findMany`.
- **El handler** construye cada candidato como `{ id, nombre, correoEnmascarado: enmascararCorreo(email), yaInscrito }` y valida la salida con `candidatosRespuestaSchema`, que no tiene ningún campo de correo completo (zod descarta lo que sobre). El correo completo nunca sale del handler.
- Prisma no escapa los comodines de `contains` (R-16): lo hace `core/`.
- **El índice GIN** de §D-A1 cubre `LIKE '%…%'` con 3 caracteres o más. PR-B05 lo demuestra.

#### §D-B3 bis · Paginación de personas y del roster (N-02, O-01)
Por conjunto de claves con `where`, sin el `cursor` de Prisma:
1. Sin `cursor`, la primera página.
2. Con `cursor` (un `usuarioId`): una consulta a **`usuarios` por PK** lee el `nombre_busqueda` de ese usuario (fuera de cualquier ciclo). **Solo si ese usuario no existe**, `400 VALIDACION` ("cursor: no es válido"). Que ya no esté en la clase o esté inactivo no importa.
3. `inscripcion.findMany({ where: { claseId, usuario: { activo: true }, OR: [{ usuario: { nombreBusqueda: { gt: n } } }, { usuario: { nombreBusqueda: n }, usuarioId: { gt: id } }] }, orderBy: [{ usuario: { nombreBusqueda: "asc" } }, { usuarioId: "asc" }], take: limite + 1 })`.
4. `paginar` con `usuarioId` como cursor.

Si Prisma no admite ese `orderBy` por la relación o los casos PR-B02d y PR-B03d fallan por el orden, **PA-17**.

**Nota de la Enmienda 4 (sin cambio de comportamiento):** es el mismo principio de §D-A4: el cursor se rechaza solo cuando ya no se puede reconstruir la clave de orden. Aquí la clave (`usuarios.nombre_busqueda`) sobrevive a la baja, así que el cursor de un alumno quitado sigue sirviendo. En `inscritas` e `impartidas` la clave no sobrevive, y por eso allí se rechaza.

#### §D-B4 · Frontend de CLASES-b
- **`PersonasView`** (ruta del estudiante; el backend también deja pasar al maestro dueño, pero el router no le da ruta propia: él tiene "Alumnos"), en una `Card`:
  - sección "Maestro", con `AvatarUsuario` y el nombre;
  - sección "Alumnos" con el contador en palabras ("24 alumnos") y una lista `ul` con divisores (sin vidrio fuerte: excepción documentada en §D-B7);
  - "Ver más alumnos" (`outline`, `enEspera`), con el foco de "un control que desaparece por su propia acción" (abajo; ronda 4).
  - Estados en orden. Vacío: "Aún no hay alumnos en esta clase" (sin acción).
- **`AlumnosView`** (maestro), con dos `Card`:
  1. **`BuscadorAlumnos`**, con título "Agregar alumnos":
     - campo "Buscar alumno por nombre" (`autoComplete="off"`), con la ayuda "Escribe al menos 3 letras.";
     - `useTerminoDiferido(valor, 300)` y la consulta solo cuando `terminoDeBusquedaValido(termino)`;
     - **término demasiado largo (T-24):** el campo lleva `aria-invalid`, `aria-describedby` con la ayuda y el aviso, y `ErrorDeCampo` "La búsqueda no puede tener más de 120 caracteres"; no se hace la petición. El aviso de longitud y el de mínimo nunca aparecen a la vez;
     - cada resultado muestra:
       - el nombre;
       - el **correo enmascarado tal como llega de la API**, como texto secundario;
       - la insignia `muted` "Ya está en la clase" o el botón "Agregar a la clase" (`outline`, `size="sm"`, `enEspera` en su fila; nombre accesible con el nombre del alumno como `sr-only`);
     - sin resultados, "No encontramos alumnos con ese nombre. Solo aparecen alumnos con cuenta."; con `hayMas`, "Hay más resultados: escribe más del nombre.";
     - al agregar:
       - toast "Agregaste a \<nombre\>"; si la respuesta trae `yaEstaba: true`, toast neutro "\<nombre\> ya estaba en la clase", sin éxito ni error (D-4);
       - `ALUMNO_NO_ENCONTRADO` avisa con "No encontramos a ese alumno.";
       - invalidación de `["clases", claseId, "alumnos"]`, `["clases", claseId, "candidatos"]`, `["clases", claseId, "personas"]` y `["clases", "impartidas"]`;
       - el foco no se pierde cuando "Agregar a la clase" se convierte en la insignia (ronda 4, abajo).
  2. **`TablaAlumnos`:**
     - `Table` (opaca) con filas de 48 px (`className="h-12"` en `TableRow`, sin tocar `table.tsx`);
     - columnas "Nombre", "Correo" (completo), "Estado de pago" (`EstadoPagoBadge`), "Acceso" (`AccesoRestringidoBadge` o "—"), "Se unió" (fecha) y "Acciones";
     - "Quitar" (`ghost`, `size="sm"`, con el nombre del alumno en `sr-only`), con confirmación en línea en la misma fila: "Dejará de ver la clase. Sus datos no se borran.", "Sí, quitar" (`destructive`, `enEspera`) y "Cancelar", con el manejo de foco de §7.14 (abajo);
     - "Ver más alumnos" (`outline`, `enEspera`), con el foco de la ronda 4 (abajo).
     - Vacío: "Aún no hay alumnos. Comparte el código de la clase o búscalos arriba."
- **Foco al confirmar una acción que borra la fila** (T-21 a T-23; `DESIGN.md` §7.14, propuesta):
  - tras "Sí, quitar", el foco va al mismo control de la fila que ocupa el lugar de la quitada: la siguiente, o la anterior si era la última;
  - si la lista queda vacía, o no queda control al cual saltar, va al `h2` del panel ("Alumnos", `tabIndex={-1}`). Nunca a `<body>`;
  - se mueve cuando la fila ya desapareció de los datos, no en el `onSuccess`, y funciona con varias páginas cargadas;
  - **implementación:** `TablaAlumnos` recuerda por id la fila que tiene el foco (`focusin` y `focusout` en el documento, con `closest("[data-alumno-id]")`; `data-alumno-id` solo lo llevan las filas del roster). Después de cada render, si el control con el foco se desmontó por cualquier causa (la consulta nueva falla y la tabla se reemplaza por el error, otra pestaña quitó la fila, la lista quedó vacía), lo recoloca con el criterio de arriba. No roba el foco a un control que la persona eligió.
- **Foco cuando un control desaparece por su propia acción** (T-25 y T-26; ronda 4, en curso; extensión de §7.14):
  - "Agregar a la clase", que se convierte en la insignia, lleva el foco al siguiente "Agregar a la clase", al anterior o, si no queda ninguno, al campo de búsqueda;
  - "Ver más alumnos" (roster y `PersonasView`), que desaparece al cargar la última página, lleva el foco al primer elemento nuevo o, si no llegó nada, al encabezado de la lista;
  - nunca a `<body>`.
- **`SeccionesDeClase`** suma "Personas" (estudiante) y "Alumnos" (maestro); `app/router.tsx` suma las dos rutas.
- **Compartidos:**
  - `components/estado-pago-badge.tsx`: `EstadoPagoBadge({ estado })` → `<Badge variant="success">` con `CircleCheck` y "Al corriente", o `<Badge variant="danger">` con `CircleAlert` y "Deudor". Sin valor por defecto (un `estado` desconocido no tiene rama: `never`).
  - `components/acceso-restringido-badge.tsx`: `<Badge variant="danger">` con `Lock` y "Acceso restringido".
  - Ninguno de los dos escribe `text-danger`: el rojo vive solo en `badge.tsx` (V-13).

#### §D-B4 bis · Heredado de CLASES-a (Enmienda 4; carril trivial dentro de b)
Dos ajustes de a que la revisión final mandó a b (N-04 y un detalle menor). No cambian datos ni rutas.
- **N-04, "Unirme a la clase"** (`features/clases/components/formulario-unirse-clase.tsx`, con su apoyo en `lib.ts`):
  - van bajo el campo del código solo `CODIGO_INVALIDO` y un `VALIDACION` de `codigo`;
  - cualquier otro error (un 500, "sin conexión", `ACCESO_RESTRINGIDO`) avisa con `toast.error`, sin `aria-invalid` en el campo;
  - es el mismo patrón que T-19 en `FormularioClase`;
  - `apiClient` sigue resolviendo por su cuenta la redirección de `ACCESO_RESTRINGIDO`.
- **Textos fijos del inicio del maestro:** "Nueva clase" y "Crear clase" de `inicio-maestro-view.tsx` pasan a `data.ts` (regla 2 de `CLAUDE.md`). Sin cambio visible.
- **Prueba normal:** PR-B17, en `inicio-estudiante-view.test.tsx` (extendido).

#### §D-B5 · Cambios de CLASES-b en `hooks.ts` y `lib.ts`
- **`hooks.ts`:** `usePersonas`, `useAlumnos`, `useCandidatos(claseId, termino)`, `useAgregarAlumno`, `useQuitarAlumno` y `useTerminoDiferido(valor, ms)`, sin tipos declarados.
- **`lib.ts`:** `terminoDeBusquedaValido` y `terminoDeBusquedaMuyLargo`, las dos sobre `estadoDeTerminoDeBusqueda` de `shared/`, sin una copia propia de la normalización (T-24); `textoConteoAlumnos(n)`; y el ajuste de N-04 si el reparto de errores vive ahí (§D-B4 bis).
- **El campo del buscador** usa `maxLength={LONGITUD_MAXIMA_BUSQUEDA}`, de `shared/` (D-8). El navegador cuenta unidades de UTF-16, no puntos de código normalizados, así que puede cortar antes (por ejemplo, con 60 emojis) o después (41 sílabas hangul) que el criterio del servidor. El tope real lo decide `estadoDeTerminoDeBusqueda`, y lo segundo lo cubre el aviso de longitud.

El frontend **no** enmascara nada: muestra lo que da la API.

#### §D-B6 · Textos de CLASES-b (propuesta)
- "Maestro", "Alumnos", "N alumnos" (y "1 alumno"), "Ver más alumnos" y "Aún no hay alumnos en esta clase".
- "Agregar alumnos" (título del panel del buscador), "Buscar alumno por nombre", "Escribe al menos 3 letras.", "Agregar a la clase", "Ya está en la clase" y los dos mensajes del buscador de §D-B4.
- "La búsqueda no puede tener más de 120 caracteres" (T-24).
- Encabezados de la tabla y la confirmación de quitar, de §D-B4.
- Toasts "Agregaste a \<nombre\>", "\<nombre\> ya estaba en la clase" (neutro, D-4) y "Quitaste a \<nombre\> de la clase".
- `ALUMNO_NO_ENCONTRADO`: "No encontramos a ese alumno.".

#### §D-B7 · `docs/DESIGN.md` (programador de CLASES-b, a mano, **propuesta**)
- **§7.8:** la insignia "Ya está en la clase" (`muted`) y la implementación de `EstadoPagoBadge` y `AccesoRestringidoBadge`.
- **§8:** el roster del maestro es una tabla opaca dentro de un panel de vidrio, con filas de 48 px y botones de 36 px.
- **§7.2, excepción:** las filas de la lista de compañeros (`PersonasView`) van sin vidrio fuerte, separadas por divisores de `--border` dentro del panel. Son filas de solo lectura, sin acción, y el vidrio fuerte por fila recargaría una lista de 30 nombres.
- **§7.14 (Enmienda 5):** el patrón "Foco al confirmar una acción que borra la fila" (T-21 a T-23) y, en la ronda 4, su extensión a "un control que desaparece por su propia acción" (T-25 y T-26), con el criterio de §D-B4.
- **§7.17 (nueva), "Buscador con resultados en línea":**
  - mínimo de 3 caracteres, espera de 300 ms y ayuda permanente;
  - tope de 120, con el aviso de longitud (T-24);
  - resultados con acción por fila y nombre accesible con el dato de la fila;
  - **el correo enmascarado como texto secundario (el completo solo en el roster)**;
  - los mensajes de sin resultados y de "hay más".

#### §D-B8 · Migración `movimientos_inscripcion` (P-05 g, M-03; compatible hacia atrás)
**Por qué en CLASES-b y no dentro de la de a:** la tabla solo la escribe b; así cada migración va junto al código que la usa, y la de a queda como la revisó el manager. b ya era carril sensible.

El SQL de `--create-only` debe contener **solo** esto:
```sql
CREATE TYPE "tipo_movimiento_inscripcion" AS ENUM ('alta', 'baja');
CREATE TABLE "movimientos_inscripcion" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "secuencia" BIGSERIAL NOT NULL,
  "clase_id" UUID NOT NULL,
  "alumno_id" UUID NOT NULL,
  "maestro_id" UUID NOT NULL,
  "tipo" "tipo_movimiento_inscripcion" NOT NULL,
  "creado_en" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "movimientos_inscripcion_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "movimientos_inscripcion" ADD CONSTRAINT "movimientos_inscripcion_clase_id_fkey" FOREIGN KEY ("clase_id") REFERENCES "clases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "movimientos_inscripcion" ADD CONSTRAINT "movimientos_inscripcion_alumno_id_fkey" FOREIGN KEY ("alumno_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "movimientos_inscripcion" ADD CONSTRAINT "movimientos_inscripcion_maestro_id_fkey" FOREIGN KEY ("maestro_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
```
**Única variante admitida:** si `prisma validate` exige `@unique` para un `autoincrement()` que no es la llave, se agrega `@unique` a `secuencia` y el SQL suma exactamente `CREATE UNIQUE INDEX "movimientos_inscripcion_secuencia_key" ON "movimientos_inscripcion"("secuencia");`. El programador reporta cuál de las dos formas quedó.

**Decisiones y por qué:**
- **`secuencia BIGSERIAL` (M-03):** en Prisma, `secuencia BigInt @default(autoincrement())`.
  - Toma su valor con `nextval` en el `INSERT`, y el movimiento siempre se inserta al final de su transacción, después de cualquier espera (§D-B2). Así el orden por `secuencia` es el orden real de los cambios, sin empates.
  - Se prefiere a `clock_timestamp()` más un desempate porque es una sola columna, entera, sin precisión que cuidar, y la pantalla de ADMIN puede paginar por ella.
  - `BIGINT` y no `INT`: un registro no se reinicia.
  - Una secuencia puede dejar huecos (transacciones revertidas); el registro no los necesita contiguos, solo ordenados.
- **`id` sigue siendo UUID:** ESSENTIALS pide llaves UUID; `secuencia` es una columna de orden, no la llave.
- **`tipo` como enum** (`tipo_movimiento_inscripcion`), no con CHECK: es la convención del esquema (`origen_inscripcion`, `estado_archivo`, `tipo_token_cuenta`) y Prisma lo expresa y lo compara, así que no hay deriva.
- **`creado_en timestamptz(3)`** con `DEFAULT CURRENT_TIMESTAMP`: es la "fecha" del humano (S-23), para mostrar. **No se usa para ordenar.** Sin `actualizado_en`: la fila nunca se actualiza.
- **Llaves foráneas con `ON DELETE RESTRICT`:** es un registro, no debe desaparecer en silencio con una cascada. Hoy ninguna ruta borra clases ni usuarios (la baja de cuentas es `activo = false`). Si ADMIN introduce borrados físicos, decide qué hacer con este registro.
- **Sin índices secundarios** (salvo el `UNIQUE` de la variante admitida, si Prisma lo exige). En CLASES no hay ninguna consulta sobre la tabla (solo `INSERT`), y la regla 4 de `AGENTS.md` pide índices para las consultas que existen. La pantalla de ADMIN propondrá los suyos con su consulta; probablemente `(alumno_id, secuencia DESC)` y `(clase_id, secuencia DESC)`. Queda anotado en "No entra".
- **Sin ruta ni función de lectura:** `adapters/db` no exporta nada que lea la tabla; las escrituras viven dentro de `agregarAlumnoManual` y `quitarAlumno` (PR-B16g y PR-B16h). Las pruebas leen la tabla con `obtenerDb()` directamente, como las demás pruebas de integración.
- En `schema.prisma`: modelo `MovimientoInscripcion` con `@@map("movimientos_inscripcion")`, enum `TipoMovimientoInscripcion` y las relaciones inversas en `Clase` y `Usuario` (con `relationName` distintos para `alumno` y `maestro`).
- **Compatibilidad:** tabla, tipo y secuencia nuevos, sin tocar nada existente.
- **Limpieza de las pruebas (N-10):** por los `RESTRICT` de `movimientos_inscripcion` (y de `clases.maestro_id`), en cada archivo de pruebas de b la limpieza de `backend/test/ayudas-clases.ts` corre **antes** que el borrado de usuarios de `ayudas-auth.ts`:
  1. los movimientos de las clases de prueba;
  2. las clases, que borran en cascada sus inscripciones;
  3. al final, los usuarios.

  `ayudas-clases.ts` (extendido en b) expone una función que hace los dos primeros pasos en ese orden, y su comentario explica por qué va antes que `borrarUsuariosDePrueba`. La misma regla vale para los archivos de c y d.

### CLASES-c

#### §D-C1 · Migración `publicaciones_y_comentarios` (compatible hacia atrás)
```sql
CREATE TYPE "tipo_publicacion" AS ENUM ('anuncio', 'material');
CREATE TABLE "publicaciones" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "clase_id" UUID NOT NULL,
  "autor_id" UUID NOT NULL,
  "tipo" "tipo_publicacion" NOT NULL,
  "titulo" TEXT,
  "texto" TEXT NOT NULL,
  "creado_en" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "actualizado_en" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "publicaciones_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "comentarios" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "publicacion_id" UUID NOT NULL,
  "autor_id" UUID NOT NULL,
  "texto" TEXT NOT NULL,
  "creado_en" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "actualizado_en" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "comentarios_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "publicaciones_clase_id_creado_en_id_idx" ON "publicaciones"("clase_id", "creado_en" DESC, "id" DESC);
CREATE INDEX "comentarios_publicacion_id_creado_en_id_idx" ON "comentarios"("publicacion_id", "creado_en", "id");
ALTER TABLE "publicaciones" ADD CONSTRAINT "publicaciones_clase_id_fkey" FOREIGN KEY ("clase_id") REFERENCES "clases"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "publicaciones" ADD CONSTRAINT "publicaciones_autor_id_fkey" FOREIGN KEY ("autor_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "comentarios" ADD CONSTRAINT "comentarios_publicacion_id_fkey" FOREIGN KEY ("publicacion_id") REFERENCES "publicaciones"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "comentarios" ADD CONSTRAINT "comentarios_autor_id_fkey" FOREIGN KEY ("autor_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
-- A mano (Prisma no expresa CHECK y no lo compara al buscar deriva):
ALTER TABLE "publicaciones" ADD CONSTRAINT "publicaciones_titulo_segun_tipo"
  CHECK (("tipo" = 'anuncio' AND "titulo" IS NULL) OR ("tipo" = 'material' AND "titulo" IS NOT NULL));
```
- `comentarios.publicacion_id` es `NOT NULL` por ahora. ENTREGAS lo hará nulo, agregará `entrega_id` y un `CHECK (num_nonnulls(publicacion_id, entrega_id) = 1)`, compatible hacia atrás.
- Cuando TAREAS lleve las tareas al muro, podrá sumar `'tarea'` al enum con `ALTER TYPE … ADD VALUE` (R-01).
- En `schema.prisma`: modelos `Publicacion` y `Comentario`, el enum `TipoPublicacion` y las relaciones inversas en `Clase` y `Usuario`.

#### §D-C2 · Rutas (plugin `handlers/clases/muro.ts`)
| Ruta | Cadena | Entrada | Respuesta |
|---|---|---|---|
| `GET /clases/:claseId/publicaciones?cursor&limite` | `roles: ["estudiante", "maestro"], pertenencia: "inscripcion"` | `paginacionSchema` (20 por defecto) | `200 { publicaciones: Publicacion[], siguienteCursor }`, con `Publicacion = { id, tipo, titulo: string \| null, texto, autor: { id, nombre }, creadoEn, comentarios: number }`; `400 VALIDACION` si el cursor no es válido (T-29) |
| `POST /clases/:claseId/publicaciones` | `roles: ["maestro"], pertenencia: "propiedad"` | `crearPublicacionSchema` (discriminada por `tipo`) | `201 { publicacion }` |
| `DELETE /clases/:claseId/publicaciones/:publicacionId` | ídem | — | `204`; `404 PUBLICACION_NO_ENCONTRADA` |
| `GET /clases/:claseId/publicaciones/:publicacionId/comentarios?cursor&limite` | `roles: ["estudiante", "maestro"], pertenencia: "inscripcion"` | ídem (20) | `200 { comentarios: { id, texto, autor: { id, nombre }, creadoEn, propio }[], siguienteCursor }`; `404` si la publicación no es de esa clase; `400 VALIDACION` si el cursor no es válido (T-29) |
| `POST /clases/:claseId/publicaciones/:publicacionId/comentarios` | ídem | `crearComentarioSchema` `{ texto }` | `201 { comentario }`; `404` |
| `DELETE /clases/:claseId/publicaciones/:publicacionId/comentarios/:comentarioId` | `roles: ["maestro"], pertenencia: "propiedad"` | — | `204`; `404 COMENTARIO_NO_ENCONTRADO` |
| `DELETE /clases/:claseId/mis-comentarios/:comentarioId` | `roles: ["estudiante", "maestro"], pertenencia: "inscripcion"` | — | `204`; `404` |

- **Toda consulta por `publicacionId` o `comentarioId` filtra además por la clase de la ruta.** Una publicación de otra clase responde `404` sin escribir ni revelar nada.
- **"Mis comentarios"** borra con `autor_id = perfil.id` dentro de la condición del `deleteMany`. Si borra 0 filas, `404`.
- `propio` es `autor.id === perfil.id`.
- **Cursor que ya no existe (T-29, Enmienda 8).** Es el principio común de §D-A4 (T-18, decisión del humano en a), aplicado a c: la clave de orden (`publicaciones.creado_en` y `comentarios.creado_en`) desaparece con la fila.
  - **`listarPublicaciones`:** con `cursor`, primero lee `publicaciones` por PK, con `id = cursor` y `clase_id = claseId`. Si no hay fila, `400 VALIDACION` "cursor: no es válido", con el mismo código y mensaje que `errorCursorInvalido` de `adapters/db/clases.ts`. `adapters/db/publicaciones.ts` define su propia copia, como `inscripciones.ts`, porque `clases.ts`, `inscripciones.ts` y `errores.ts` no se tocan (D-1, Enmienda 9). Si hay fila, pagina como siempre.
  - **`listarComentarios`:** primero comprueba la publicación en la clase. Si no está, `404 PUBLICACION_NO_ENCONTRADA`, aunque venga un cursor. Después, con `cursor`, lee `comentarios` por PK, con `id = cursor` y `publicacion_id = publicacionId`. Si no hay fila, `400 VALIDACION` "cursor: no es válido".
  - **Sin oráculo:** un cursor borrado, uno de otra clase o de otra publicación y un UUID inexistente reciben la misma respuesta. Un cursor que no es UUID sigue respondiendo lo que da `paginacionSchema`.
  - **Una consulta por PK,** fuera de ciclos y sin transacción. Residual aceptado, igual que en a: si la fila se borra entre la lectura y la página, puede salir una página vacía.
  - **El frontend no cambia:** el `400` de "Ver más" llega como `isError` y se muestra con `MensajeError`, con el foco en el encabezado (T-27).
  - **Pruebas:** PR-C03f y PR-C04e.

#### §D-C3 · Avisos
- **`core/eventos/avisos-de-clase.ts`:**
  - colas: `COLA_PUBLICACION_CREADA = "PUBLICACION_CREADA"`, `COLA_MATERIAL_CREADO = "MATERIAL_CREADO"`, `COLA_COMENTARIO_CREADO = "COMENTARIO_CREADO"` y `COLA_AVISO_FALLIDO = "AVISO_FALLIDO"`;
  - esquemas: `datosPublicacionCreadaSchema = { publicacionId, claseId }` y `datosComentarioCreadoSchema = { comentarioId, publicacionId, claseId }`;
  - `colaDePublicacion(tipo): string`.
- **Ids (N-03):** el handler genera `publicacionId` y `comentarioId` con `randomUUID()` **antes** de llamar al adaptador. Ese id es también el id del trabajo (el `eventId` idempotente).
- **`adapters/queue/colas.ts`:**
  - `AVISO_FALLIDO` primero, sin reintentos;
  - después, las tres colas con `retryLimit: 3`, `retryDelay: 30`, `retryBackoff: true`, `expireInSeconds: 300`, `deadLetter: "AVISO_FALLIDO"`, `retentionSeconds: 604_800` y `deleteAfterSeconds: 604_800`;
  - la API y el worker las crean al arrancar;
  - **sin consumidor** hasta NOTIFICACIONES (R-02);
  - los datos del trabajo no llevan texto, nombres ni correos.
- **Encolado transaccional:** `crearPublicacion({ id, … }, alGuardar)` y `crearComentario({ id, … }, alGuardar)` abren la transacción, insertan y llaman a `alGuardar(ejecutorSqlDe(tx))`. El handler pasa `(sql) => encolar(cola, datos, { id, sql })`. Si `encolar` lanza, la transacción se revierte.
- **Comentarios (N-09):** la transacción primero lee la publicación con `tx.$queryRaw\`SELECT id FROM publicaciones WHERE id = ${publicacionId}::uuid AND clase_id = ${claseId}::uuid FOR SHARE\``.
  - Sin fila, `404` sin insertar.
  - Un borrado simultáneo espera a que el comentario confirme y lo borra en cascada.
  - Si el borrado confirma antes, el `FOR SHARE` ya no ve la fila y responde `404`.
- **Borrar una publicación:** `deleteMany` con `id` y `clase_id`, que borra también sus comentarios (CASCADE). No encola nada.

#### §D-C4 · Texto
`core/clases/texto.ts`: `normalizarTextoLargo(t)` convierte CRLF y CR en LF y recorta los extremos, sin tocar el interior.
- **Se aplica antes de validar** (Enmienda 4, T-01): en a, a la descripción de la clase en `POST` y `PUT` (§D-A2); en c, igual, a los textos de publicaciones y comentarios, antes de validarlos y guardarlos.
- Los demás caracteres de control siguen rechazados por el esquema.
- Si se validara antes de normalizar, `textoLargoSchema` rechazaría el `\r` de un texto escrito en Windows.

**Regla única de contenido visible (Enmienda 6; resuelve el pendiente de la Enmienda 4).** Los caracteres `Cf` invisibles (U+200B, U+2060…) permitían crear un nombre o un texto visualmente vacío. Desde CLASES-c, una sola regla vale para el nombre de la clase, el título del material, el texto del anuncio y los comentarios.
- **Carácter visible:**
  - un punto de código de las categorías letra (`L`), número (`N`), puntuación (`P`) o símbolo (`S`);
  - que no sea ignorable por defecto (`Default_Ignorable_Code_Point`), ni U+2800 (patrón Braille en blanco), ni U+1D159 (cabeza de nota nula);
  - es la definición de `nombreSchema` de personas (`shared/src/auth.ts`, T-11 y T-13 de AUTH).
- **Lo que no cuenta, pero se admite:**
  - los espacios (`Z`) y las marcas combinantes (`M`);
  - los caracteres de formato (`Cf`: U+200B, U+200C, U+200D, U+2060, U+FEFF, U+00AD, U+200E, U+200F, las etiquetas U+E0020 a U+E007F…);
  - los selectores de variación (U+FE00 a U+FE0F) y los rellenos Hangul.

  No se rechazan porque forman parte de emojis válidos (U+200D, U+FE0F y las etiquetas de las banderas de subdivisiones) y de otros alfabetos (U+200C y U+200D en persa y en las escrituras índicas; U+200E y U+200F en árabe y hebreo). Los tonos de piel (U+1F3FB a U+1F3FF, `Sk`) y los indicadores regionales (`So`) sí cuentan.
- **Lo que se sigue rechazando, sin cambio:**
  - los caracteres de control (`Cc`; en los textos largos se admiten `\n` y `\t`);
  - los inversores de dirección (U+202A a U+202E y U+2066 a U+2069);
  - en el nombre, los saltos de línea (`\r`, `\n`, U+2028 y U+2029).
- **Mínimo, en caracteres visibles contados por punto de código** (`Array.from`), no por unidades de UTF-16 ni por grafemas:
  - **2** en el nombre de la clase;
  - **1** en el título del material, el texto del anuncio y el comentario.

  Un emoji compuesto cuenta cada componente visible: U+1F44D = 1; U+2764 U+FE0F = 1; U+1F44D U+1F3FD = 2; U+1F1F2 U+1F1FD = 2; U+1F469 U+200D U+1F4BB = 2.
- **Los máximos no cambian, y cuentan en puntos de código** (Enmienda 8, T-32). Zod 4 mide así a propósito todos los `max` y `min` de cadena de `shared/`:
  - 120 el nombre, también su `min(2)`; 200 el título; 5,000 el anuncio y la descripción del material; 1,000 el comentario; 2,000 la descripción de la clase;
  - en los esquemas de a no cambia el código, solo lo que el plan afirmaba; el término de búsqueda de b ya medía en puntos de código;
  - un texto puede guardar hasta el doble de unidades de UTF-16 que su máximo. Las columnas son `TEXT`, así que no es un riesgo;
  - el `maxLength` del navegador cuenta unidades de UTF-16. Hoy solo lo usa el buscador de b, que lo documenta; en cualquier campo sería más estricto que el servidor, nunca más laxo. No se agrega ni se quita ningún `maxLength`.
- **Los textos opcionales no exigen contenido visible:** la descripción de la clase (de a, sin cambio) y la descripción del material. Si uno no tiene contenido visible, se acepta tal cual.
- **Orden:**
  - nombre de la clase: `trim` de zod → largo de 2 a 120 → una sola línea → control → inversores → **contenido visible** (último `refine`);
  - título, anuncio y comentario: en el servidor, primero `normalizarTextoLargo` (antes de validar) → máximo → control → inversores → **contenido visible**.

  El conteo va siempre al final, sobre el texto ya recortado o normalizado. Ni el recorte ni la normalización quitan o agregan caracteres visibles: el `trim` de JavaScript quita U+FEFF de los extremos, pero U+FEFF no cuenta.
- **Dónde vive** (una sola definición, como `normalizarTerminoDeBusqueda` en b), en `shared/src/clases.ts`:
  - `contarCaracteresVisibles(texto: string): number`;
  - `MINIMO_VISIBLES_NOMBRE_CLASE = 2` y `MINIMO_VISIBLES_TEXTO = 1`;
  - `textoConContenidoSchema(max: number, mensaje: string)` = `textoLargoSchema(max)` más el `refine` `contarCaracteresVisibles(t) >= MINIMO_VISIBLES_TEXTO`, con `mensaje`. El mismo `mensaje` es el error de tipo de su `z.string({ error: mensaje })`, para que un campo ausente o que no es texto responda en español, como `nombreClaseSchema` con "Escribe el nombre de la clase" (N-C3);
  - `nombreClaseSchema` suma, como último `refine`, `contarCaracteresVisibles(t) >= MINIMO_VISIBLES_NOMBRE_CLASE`.
  - **`normalizarTextoLargo(texto: string): string`** (Enmienda 8, T-31), con la misma regla de arriba.
    - `backend/src/core/clases/texto.ts` la reexporta, así que los handlers y `core/clases/texto.test.ts` no cambian sus importaciones; también vale importarla de `@campus/shared`, como `core/clases/busqueda.ts`.
    - `FormularioPublicacion` y `FormularioComentario` la aplican a los textos que el servidor normaliza (título y texto; comentario) **antes** de `safeParse`, y envían `resultado.data`. El servidor sigue normalizando por su cuenta.
    - Los dos lados dan el mismo resultado y el mismo mensaje: un comentario de 1,000 caracteres seguidos de un salto de línea se envía; uno de 1,001 sin saltos se rechaza en el formulario con el mensaje del servidor.
    - El campo visible no se reescribe mientras la persona escribe.
    - `formulario-clase.tsx` (la descripción de a) no entra en c: queda como pendiente con destino.
- **Quién la usa:**
  - **esquemas de c:**
    - en `crearPublicacionSchema`, `textoConContenidoSchema` va en el texto del anuncio y en el título del material; el texto del material sigue con `textoLargoSchema(5000)`, opcional;
    - `crearComentarioSchema` la usa en su texto;
  - **backend:** a través de esos esquemas (`validarCuerpo`);
  - **frontend:** valida con los mismos esquemas antes de enviar:
    - `FormularioClase` ya lo hace con `crearClaseSchema`;
    - `FormularioPublicacion` y `FormularioComentario` usan los suyos, con `ErrorDeCampo` bajo el campo y sin llamar a la API;
  - `core/` no cambia, y ni `backend/src/` ni `frontend/src/` tienen una copia (V-04);
  - `shared/src/auth.ts` conserva su copia privada porque no se toca; unificarlas queda como pendiente con destino.
- **Mensajes** (`DESIGN.md` §9). Son los del campo vacío, porque un texto sin contenido visible se ve vacío:
  - nombre: "El nombre debe tener al menos 2 caracteres" (el de hoy);
  - título: "Escribe el título del material";
  - anuncio: "Escribe el anuncio";
  - comentario: "Escribe tu comentario".

  El servidor los responde como `400 VALIDACION` "\<campo\>: \<mensaje\>".
- **Cambio de comportamiento en el nombre (C-18):** un nombre de 2 o más puntos de código sin contenido visible, o con uno solo, responde `400 VALIDACION`. Un emoji simple solo (U+1F44D) mide 1 punto de código y ya lo rechazaba el `min(2)` (corrección de la Enmienda 8).
  - PR-A08d y PR-A08e siguen valiendo.
  - S-02 y §D-A3 no se reescriben: desde c, sus 2 caracteres mínimos son visibles.
- **Residual aceptado** (el mismo de `nombreSchema` de personas):
  - un carácter que se ve vacío solo en algunas fuentes y no es ignorable por defecto cuenta como visible;
  - un `Cf` en medio de un texto con contenido visible se admite, así que dos nombres pueden verse iguales y ser distintos (los nombres de clase no son únicos).
- **Pruebas:** PR-C12a a PR-C12i.

#### §D-C5 · Frontend de CLASES-c
- **`MuroView`:** `useInfiniteQuery(["clases", claseId, "publicaciones"])`.
  - En el maestro, arriba, `FormularioPublicacion` (`Card`):
    - grupo "Tipo de publicación" (`role="group"` con su nombre) con dos botones `outline`, `size="sm"` y `aria-pressed`: "Anuncio" (por defecto) y "Material";
    - con "Material", el campo "Título del material";
    - `Textarea` "Anuncio" o "Descripción (opcional)";
    - botón `primary` **"Publicar anuncio"** o **"Publicar material"** (`enEspera`), la única acción principal de la vista. Con éxito, limpia el formulario, avisa e invalida la lista.
  - Lista de `PublicacionDelMuro` (`Card`) con estados en orden y "Ver más publicaciones" (`outline`, `enEspera`).
  - Vacío: estudiante, "Tu maestro aún no ha publicado nada en esta clase."; maestro, "Publica el primer anuncio o material de tu clase." (sin acción).
- **`PublicacionDelMuro`:**
  - insignia `muted` con texto e icono ("Anuncio" con `Megaphone`, "Material" con `BookOpen`), autor y fecha;
  - título del material en `h3`;
  - texto plano con `whitespace-pre-line` y `max-w-prose`;
  - "Ver comentarios (N)" u "Ocultar comentarios" (`ghost`, `size="sm"`, `aria-expanded`, `aria-controls`);
  - en el maestro, "Borrar publicación" (`ghost`, `size="sm"`) con confirmación en línea: "Se borrará con sus comentarios." ("…y sus adjuntos." desde d), "Sí, borrar" (`destructive`, `enEspera`) y "Cancelar".
- **`ComentariosDePublicacion`** (se monta al abrir):
  - `useInfiniteQuery`, habilitada solo mientras está abierta;
  - lista ascendente y "Ver más comentarios" (`outline`, `size="sm"`, `enEspera`);
  - `FormularioComentario`, con `Textarea` "Escribe un comentario" y "Comentar" (`outline`, `enEspera`);
  - "Borrar" (`ghost`, `size="sm"`): el maestro lo ve en todos los comentarios; el estudiante, en los `propio`. Pide confirmación en línea con "Sí, borrar comentario" (`destructive`, `enEspera`).
- **Foco de los "Ver más" (Enmienda 5; criterio de `DESIGN.md` §7.14 extendido en la ronda 4 de b):**
  - "Ver más publicaciones" y "Ver más comentarios" nacen con el criterio de "un control que desaparece por su propia acción": al desaparecer tras cargar la última página, el foco va al primer elemento nuevo o, si no llegó nada, al encabezado de la lista. Nunca a `<body>`;
  - **heredado de b, con autorización de archivo:** "Ver más clases" de `features/clases/components/panel-mis-clases.tsx` (de CLASES-a) se corrige con el mismo criterio. Es el único cambio que c hace en ese archivo, y no cambia sus datos ni sus textos.
  - Pruebas: PR-C11a a PR-C11c.
- **Avisos de crear publicación y comentario (T-30, Enmienda 8).** Mismo criterio que §D-C5 bis, punto 1:
  - **`useCrearPublicacion` y `useComentar`** (`hooks.ts`):
    - en `onSuccess`, la invalidación de siempre y `toast.success` ("Publicado" o "Comentario publicado");
    - en `onError`, `toast.error(mensajeDeErrorClases(error))`, **salvo** si el error es de un campo del formulario (el que detecta `erroresDeFormularioClases` con `["titulo", "texto"]` o `["texto"]`). En ese caso el hook no avisa, y el componente muestra el campo.
  - **El componente** llama a `mutate` solo con estado local: en `onSuccess` limpia los campos; en `onError` pone los errores de campo. No importa `toast` para crear. Como TanStack Query no llama a esos callbacks si el componente se desmontó, el formulario solo se limpia si sigue montado.
  - **Cada aviso sale una sola vez:** éxito, error de red o `500`, con el formulario montado o desmontado (comentarios cerrados o fuera del muro), sin duplicados.
  - **Residual aceptado:** un error de campo del servidor con el formulario ya desmontado no se avisa. T-31 cierra esa diferencia, porque los dos lados validan igual.
  - **Pruebas:** PR-C14a y PR-C14b.
- **Texto del cursor inválido (T-34, Enmienda 9):**
  - la consulta de publicaciones (`muro-view.tsx`) y la de comentarios (`components/comentarios-de-publicacion.tsx`) muestran su error con `mensajeDeErrorDeLista(error, textoDelCursor)` (`lib.ts`);
  - un `400 VALIDACION` del campo `cursor` da el texto de §D-C6, que dice qué pasó y cómo recuperar la lista; cualquier otro error sigue con `mensajeDeErrorClases`;
  - el foco no cambia: sigue yendo al encabezado de la lista;
  - **Pruebas:** PR-C17.
- **"Muro" recupera el muro en error (T-35, M-23; cuarta ronda autorizada por el humano):**
  - en `MuroDeLaClase` (`muro-view.tsx`), una ref guarda la `key` de `useLocation()` con la que se montó la vista;
  - un efecto reacciona cuando esa clave cambia. Pulsar "Muro" estando en el muro agrega una entrada al historial con la misma ruta y otra `key`, sin desmontar la vista. Si la consulta de publicaciones está en `isError`, el efecto llama a `refetch()`, que vuelve a pedir desde la primera página: la alerta desaparece y se ven las publicaciones;
  - con la lista sana no hace nada;
  - el texto no cambia ("Vuelve a abrirlo" pasa a ser verdad) y el foco se queda en el enlace "Muro" que la persona pulsó, nunca en `<body>`. No cambian `hooks.ts`, `lib.ts`, `data.ts`, el backend, `shared/` ni `DESIGN.md`;
  - los comentarios ya se recuperan con "Ocultar comentarios" y "Ver comentarios";
  - **Pruebas:** PR-C18.

#### §D-C5 bis · Heredado de CLASES-b (Enmienda 6; carril trivial dentro de c)
Cuatro detalles menores de la revisión final de b que el humano mandó a c (2026-10-01). No cambian datos, rutas ni textos. No abren rondas propias del tester: los cubre su regresión.
1. **Aviso de "Agregar a la clase"** (`hooks.ts`, `components/buscador-alumnos.tsx`):
   - **El problema:** hoy los avisos van en los callbacks de `mutate` de `FilaCandidato`. Si la persona escribe otro término con el `POST` en vuelo, la fila se desmonta y TanStack Query no llama a esos callbacks: el alta se hace, pero no sale "Agregaste a…".
   - **`onSuccess` de `useAgregarAlumno`:** además de la invalidación de hoy, avisa con `toast.success(TEXTOS_BUSCADOR_ALUMNOS.agregado(nombre))` o, si llega `yaEstaba: true`, con el aviso neutro `toast(TEXTOS_BUSCADOR_ALUMNOS.yaEstaba(nombre))` (D-4).
   - **`onError` de `useAgregarAlumno`:** avisa con `toast.error(mensajeDeErrorClases(error))`.
   - Los callbacks de `useMutation` corren aunque el componente se haya desmontado.
   - **`FilaCandidato`** llama a `agregar.mutate(candidato.id)` sin callbacks y deja de importar `toast`. Así cada aviso sale una sola vez.
   - Los textos no cambian. "Quitar" (`tabla-alumnos.tsx`) tampoco: queda fuera del encargo del humano.
   - **Pruebas:** PR-C13a y PR-C13b.
2. **`focoPerdido` pasa a `lib.ts`:**
   - Firma: `focoPerdido(documento: Pick<Document, "activeElement" | "body">): boolean`. Responde `true` si `activeElement` es `null`, es `body` o ya no está conectado.
   - Recibe el documento en lugar de leer el global, así que es pura respecto de su entrada, como pide `CLAUDE.md` para `lib.ts`.
   - `useFocoAlCargarMas` (`hooks.ts`), `buscador-alumnos.tsx` y `tabla-alumnos.tsx` la importan de `lib.ts` y la llaman con `focoPerdido(document)`. `hooks.ts` deja de exportarla.
   - El comportamiento no cambia.
   - **Prueba:** PR-C13c.
3. **`claseId ?? ""` (N-B1):**
   - **Componente nuevo `components/con-clase-de-la-ruta.tsx`:** `ConClaseDeLaRuta({ children })`, con `children: (claseId: string) => ReactNode`.
     - Lee `useParams<{ claseId: string }>()`.
     - Sin `claseId`, hace un retorno temprano con `<MensajeError mensaje={TEXTOS_CLASE.sinAcceso} />` ("No tienes acceso a esta clase."), sin pedir nada.
     - Con `claseId`, devuelve `children(claseId)`.
   - **Vistas que lo usan:** `ClaseLayout`, `EditarClaseView`, `PersonasView` y `AlumnosView`.
     - La vista exportada solo monta `ConClaseDeLaRuta`.
     - Su cuerpo actual pasa a un componente interno del mismo archivo, que recibe `claseId: string`.
     - Los nombres exportados, las rutas, los textos y el comportamiento con el parámetro no cambian.
   - **`components/formulario-clase.tsx` no entra:**
     - su `claseId` es una prop opcional del modo "crear";
     - corregirlo pide otro mecanismo (que `useEditarClase` reciba el id al mutar, o partir el formulario);
     - queda como pendiente con destino.
   - **Prueba:** PR-C13d.
4. **`DESIGN.md` §7.14:** ver §D-C7.

#### §D-C6 · Textos de CLASES-c (propuesta)
- "Tipo de publicación", "Anuncio", "Material", "Título del material", "Descripción (opcional)", "Publicar anuncio" y "Publicar material"; toast "Publicado".
- "Ver comentarios (N)", "Ocultar comentarios", "Escribe un comentario" y "Comentar"; toast "Comentario publicado".
- "Borrar publicación", "Se borrará con sus comentarios.", "Sí, borrar", "Borrar" y "Sí, borrar comentario"; toasts "Publicación borrada" y "Comentario borrado".
- "Ver más publicaciones", "Ver más comentarios" y los dos vacíos.
- Errores: `PUBLICACION_NO_ENCONTRADA` "Esa publicación ya no existe."; `COMENTARIO_NO_ENCONTRADO` "Ese comentario ya no existe.".
- Errores de campo (Enmienda 6, §D-C4), para el campo vacío o sin contenido visible: "Escribe el anuncio", "Escribe el título del material" y "Escribe tu comentario".
- Errores de tipo (Enmienda 8, T-33): "Elige si es un anuncio o un material" es el `error` del `discriminatedUnion` de `crearPublicacionSchema`, para un `tipo` ausente o desconocido (el servidor responde "tipo: Elige si es un anuncio o un material"). "La descripción debe ser texto" es el `error` del `z.string()` de la descripción opcional del material, que sigue opcional, con un máximo de 5,000 y sin mínimo de visibles.
- Cursor inválido (Enmienda 9, T-34): `TEXTOS_MURO.cambioMientrasLoVeias`, "El muro cambió mientras lo veías. Vuelve a abrirlo para verlo completo.", y `TEXTOS_COMENTARIOS.cambioMientrasLosVeias`, "Los comentarios cambiaron mientras los veías. Vuelve a abrirlos para verlos completos.".

#### §D-C7 · `docs/DESIGN.md` (programador de CLASES-c, a mano, **propuesta**)
- **§7.3:** un grupo de dos botones con `aria-pressed` para elegir el tipo; el botón principal cambia su objeto según el tipo.
- **§7.18 (nueva), "Publicación del muro y comentarios":**
  - panel de vidrio;
  - insignia de tipo con texto e icono;
  - texto plano con `max-w-prose`;
  - comentarios plegables con `aria-expanded`, en orden ascendente;
  - borrar con confirmación en línea.
- **§7.14 (Enmienda 6; detalle menor de b):** el párrafo "Implementan este patrón `AccionRestablecer` (…) y la confirmación de "Revocar" en `TablaEnlaces` (…)." sube justo después de las tres viñetas de la confirmación en línea, antes de "Foco al confirmar una acción que borra la fila", y empieza "Implementan la confirmación en línea", con las mismas dos referencias. Ninguna otra línea de §7.14 cambia.

### CLASES-d

#### §D-D1 · Migración `archivos` (compatible hacia atrás)
```sql
CREATE TYPE "estado_archivo" AS ENUM ('pendiente', 'confirmado', 'descartado');
CREATE TABLE "archivos" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "clave_objeto" TEXT NOT NULL,
  "nombre" TEXT NOT NULL,
  "tipo" TEXT NOT NULL,
  "tamano" INTEGER NOT NULL,
  "subido_por" UUID NOT NULL,
  "estado" "estado_archivo" NOT NULL DEFAULT 'pendiente',
  "clase_id" UUID NOT NULL,
  "publicacion_id" UUID,
  "creado_en" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "actualizado_en" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "archivos_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "archivos_clave_objeto_key" ON "archivos"("clave_objeto");
CREATE INDEX "archivos_publicacion_id_idx" ON "archivos"("publicacion_id");
ALTER TABLE "archivos" ADD CONSTRAINT "archivos_subido_por_fkey" FOREIGN KEY ("subido_por") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "archivos" ADD CONSTRAINT "archivos_clase_id_fkey" FOREIGN KEY ("clase_id") REFERENCES "clases"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "archivos" ADD CONSTRAINT "archivos_publicacion_id_fkey" FOREIGN KEY ("publicacion_id") REFERENCES "publicaciones"("id") ON DELETE NO ACTION ON UPDATE CASCADE;
-- A mano:
ALTER TABLE "archivos" ADD CONSTRAINT "archivos_tamano_positivo" CHECK ("tamano" > 0);
ALTER TABLE "archivos" ADD CONSTRAINT "archivos_confirmado_si_y_solo_si_contexto"
  CHECK (("estado" = 'confirmado') = ("publicacion_id" IS NOT NULL));
```
- **El CHECK va en las dos direcciones (N-06):** un `confirmado` tiene publicación, y un `pendiente` o `descartado` no la tiene.
- **`NO ACTION`** en `publicacion_id`: al borrar una clase, la cascada borra en la misma sentencia sus publicaciones y sus archivos, y `NO ACTION` comprueba al final de la sentencia.
- **Borrar una publicación suelta:** la transacción primero descarta sus archivos (§D-D3).
- TAREAS y ENTREGAS agregarán sus columnas de contexto y ampliarán el `CHECK`.

#### §D-D2 · Almacén
- **Puerto (`core/archivos/almacen.ts`):**
  ```ts
  interface Almacen {
    urlDeSubida(o: { clave: string; tipo: string }): Promise<string>
    urlDeDescarga(o: { clave: string; tipo: string; disposicion: string }): Promise<string>
    metadatosDe(clave: string): Promise<{ tamano: number; tipo: string } | null>
  }
  ```
- **Adaptador (`adapters/storage/index.ts`, único importador de `minio`):** `crearAlmacen({ endPoint, port, useSSL, accessKey, secretKey, region, bucket })`, con un `Client` de `minio`.
  - **La región fija** hace que firmar no pida nada por red (R-18; PA-14).
  - Subida: `presignedPutObject(bucket, clave, 300)`.
  - Descarga: `presignedGetObject(bucket, clave, 300, { "response-content-type": tipo, "response-content-disposition": disposicion })`.
  - Metadatos: `statObject`. `NotFound` → `null`; cualquier otro error → `AppError 503 ALMACEN_NO_DISPONIBLE`, sin la URL ni las llaves en el mensaje.
- **Configuración:** `config/env.ts` suma cinco variables:
  - `STORAGE_ENDPOINT` (URL `http` o `https`, opcional);
  - `STORAGE_ACCESS_KEY` y `STORAGE_SECRET_KEY` (opcionales);
  - `STORAGE_REGION` (`us-east-1` por defecto; `auto` en R2);
  - `STORAGE_BUCKET_PRIVADO` (`campus-privado` por defecto).

  Con `superRefine`: las tres primeras van todas o ninguna, y en `production` son obligatorias. Los mensajes no llevan valores. `config/almacen.ts`: `opcionesDeAlmacen(env)` → `OpcionesAlmacen | null`.
- **`app.ts`:** `construirApp({ env, almacen }: { env: Env; almacen?: Almacen | null })`.
  - Si no llega `almacen`, lo construye con `opcionesDeAlmacen(env)`, o deja `null`.
  - Lo pasa a `muroHandler` y a `archivosHandler`.
  - Las pruebas pasan un doble en memoria (`backend/test/almacen-en-memoria.ts`).
  - Sin almacén, subir y descargar responden `503 ALMACEN_NO_CONFIGURADO`, y el muro lista los adjuntos con `vistaPrevia: null`.
- **`dev`:** `backend/.env.example` suma las cinco variables, con los valores de desarrollo de `infra/.env.example`. CORS de MinIO: S-21.

#### §D-D3 · Flujo
1. **`POST /clases/:claseId/archivos`** (`roles: ["maestro"], pertenencia: "propiedad"`), con `solicitarSubidaSchema` `{ nombre, tipo, tamano }`:
   - `validarArchivoDeclarado` (core); si falla, `400 ARCHIVO_INVALIDO` sin escribir;
   - sin almacén, `503`;
   - si todo pasa, inserta la fila `pendiente` con `clave_objeto = materiales/{claseId}/{archivoId}`. El id sale de `randomUUID` en el handler, y el nombre del usuario **nunca** va en la clave;
   - responde `201 { archivo: { id, nombre, tipo, tamano }, subida: { url, metodo: "PUT", cabeceras: { "Content-Type": tipo }, expiraEn } }` con `no-store`.
2. **El navegador sube directo al almacén** con `services/almacenService.ts`.
3. **`POST /clases/:claseId/publicaciones`** con `archivoIds` (hasta 5, sin repetidos):
   1. `buscarArchivosParaConfirmar(ids)`, una consulta por PK;
   2. `almacen.metadatosDe(clave)` con `Promise.all` y `coincideConLoDeclarado`. Si falta el objeto, `400 ARCHIVO_NO_SUBIDO`; si el tamaño o el tipo son distintos, `400 ARCHIVO_INVALIDO`. En los dos casos, no se crea nada;
   3. `crearPublicacion({ id, … }, alGuardar)` inserta la publicación y hace `UPDATE archivos SET estado = 'confirmado', publicacion_id = $pub WHERE id IN (…) AND clase_id = $clase AND subido_por = $yo AND estado = 'pendiente' AND publicacion_id IS NULL AND creado_en > $ahora - 24 h`;
   4. si el conteo no coincide, lanza `400 ARCHIVO_INVALIDO` y todo se revierte; si coincide, encola.
4. **El muro** agrega `adjuntos: { id, nombre, tipo, tamano, vistaPrevia: { url, expiraEn } | null }[]`, de una consulta `archivos WHERE publicacion_id IN (página) AND estado = 'confirmado'`. `vistaPrevia` solo existe para PNG, JPEG, WebP y GIF, con disposición `inline`.
5. **`POST /clases/:claseId/archivos/:archivoId/descarga`** (`roles: ["estudiante", "maestro"], pertenencia: "inscripcion"`): busca `archivos WHERE id AND clase_id AND estado = 'confirmado'`.
   - Sin fila, `404 ARCHIVO_NO_ENCONTRADO`.
   - Con fila, `200 { url, expiraEn }` con `no-store` y disposición `attachment` (RFC 5987 más una alternativa en ASCII).
6. **Borrar una publicación con adjuntos:** en la misma transacción, `UPDATE archivos SET estado = 'descartado', publicacion_id = NULL WHERE publicacion_id = $1` antes del `DELETE`. Los objetos siguen en el almacén hasta `LIMPIEZA_DIARIA`.

#### §D-D4 · Constantes (`shared/src/archivos.ts`)
- `TIPOS_DE_ARCHIVO_PERMITIDOS: Record<string, readonly string[]>`:
  - `application/pdf` → `pdf`;
  - `image/png` → `png`; `image/jpeg` → `jpg` y `jpeg`; `image/webp` → `webp`; `image/gif` → `gif`;
  - los tres de Office Open XML → `docx`, `xlsx` y `pptx`;
  - `application/msword` → `doc`; `application/vnd.ms-excel` → `xls`; `application/vnd.ms-powerpoint` → `ppt`;
  - `text/plain` → `txt`.
- `TIPOS_CON_VISTA_PREVIA` (las cuatro imágenes), `TAMANO_MAXIMO_ARCHIVO_BYTES = 25 * 1024 * 1024` y `MAXIMO_ADJUNTOS_POR_PUBLICACION = 5`.
- Esquemas: `solicitarSubidaSchema`, `solicitarSubidaRespuestaSchema`, `adjuntoSchema`, `descargaRespuestaSchema`, y `archivoIds` en `crearPublicacionSchema` (`z.array(z.uuid()).max(5)`, sin repetidos, `[]` por defecto).

#### §D-D5 · Frontend de CLASES-d
- **`services/almacenService.ts`:** `subirArchivo(subida, archivo: File): Promise<void>` hace `fetch(subida.url, { method: "PUT", headers: subida.cabeceras, body: archivo, credentials: "omit" })`.
  - Rechaza si la URL no es `http:` o `https:`, o si es el origen de la API.
  - Si la respuesta no es `ok`, lanza.
  - No usa `apiClient`, para no mandar nunca el token al almacén.
- **`FormularioPublicacion` suma:**
  - "Adjuntar archivos" (`outline`, `size="sm"`), con un `<input type="file" multiple>` oculto y `accept` de `TIPOS_DE_ARCHIVO_PERMITIDOS`;
  - `ListaDeAdjuntosElegidos`: nombre, `formatearTamano` y "Quitar" (`ghost`, con el nombre en `sr-only`);
  - validación en cliente con `ErrorDeCampo`;
  - `handlePublicar` (`try/catch/finally`), con el botón principal en `enEspera` de principio a fin. Por cada archivo, en orden, llama a `useSolicitarSubida.mutateAsync` y a `subirArchivo`; después, a `crear.mutateAsync({ …, archivoIds })`. Si algo falla, toast, y el formulario conserva lo escrito.
- **`AdjuntosDePublicacion`:**
  - las imágenes con `vistaPrevia` van en `<img alt="Imagen adjunta: <nombre>">` (`max-h-80`, `rounded-row`, `object-contain`, sin `loading="lazy"`); con `onError`, pasan a la ficha;
  - todos los adjuntos tienen una ficha sólida (`bg-muted`, `rounded-row`) con icono, nombre, tamaño y "Descargar" (`outline`, `size="sm"`, `enEspera`, nombre en `sr-only`), que pide la URL y hace `window.location.assign(url)` dentro de un `try/catch`;
  - `usePublicaciones` usa `staleTime: 240_000`.
- **`lib/format.ts`:** `formatearTamano(bytes)` → "820 KB" o "2.4 MB".

#### §D-D6 · Textos de CLASES-d (propuesta)
- "Adjuntar archivos"; ayuda "Hasta 5 archivos de 25 MB: PDF, imágenes, Word, Excel, PowerPoint o texto.".
- Errores:
  - "«\<nombre\>» pesa más de 25 MB.";
  - "«\<nombre\>» no es de un tipo permitido.";
  - "Puedes adjuntar hasta 5 archivos.";
  - "No pudimos subir «\<nombre\>». Inténtalo de nuevo.";
  - `ARCHIVO_NO_SUBIDO`: "Uno de los archivos no terminó de subir. Inténtalo de nuevo.";
  - `ARCHIVO_INVALIDO`: "Uno de los archivos no coincide con lo que elegiste. Vuelve a adjuntarlo.";
  - `ALMACEN_NO_CONFIGURADO` y `ALMACEN_NO_DISPONIBLE`: "Los archivos no están disponibles en este momento. Inténtalo más tarde.".
- "Quitar", "Descargar", "Imagen adjunta: \<nombre\>" y "Se borrará con sus comentarios y adjuntos.".

#### §D-D7 · `docs/DESIGN.md` (programador de CLASES-d, a mano, **propuesta**)
**§7.19 (nueva), "Adjuntos y vista previa":**
- ficha sólida `--muted`;
- imagen con `alt` descriptivo y respaldo si falla la carga;
- "Descargar" con `enEspera`;
- lista de archivos elegidos con "Quitar";
- ayuda permanente con los límites.

### §D-R0 · Cambios de comportamiento y ronda 0 del tester
La ronda 0 no cuenta en el tope de 3. El tester reescribe **solo** los casos `*.ataque` que contradicen estos cambios, sin cambiar lo que protegen. Completa el inventario con su propia búsqueda en todas las `*.ataque` de los dos paquetes.

| # | Sub. | Cambio | Casos que lo contradicen hoy (inventario del arquitecto; lo completa el tester) |
|---|---|---|---|
| C-1 | a | `requireMembership` y `requireOwnership` ya no responden `501` | `backend/test/guarda-r2.ataque.test.ts:94`: su título dice "501", pero sus aserciones solo piden `401` sin token. El tester decide si el título se ajusta. `middleware-orden.integracion.test.ts:99` y `middleware/index.test.ts:39` son pruebas normales: las cambia el programador |
| C-2 | a, b, c, d | Rutas nuevas bajo `/api/clases` | `backend/test/sesiones-y-cadena.ataque.test.ts:449-501` (lista exacta): se agregan las rutas de cada subentrega (V-06), con sus `HEAD`. Lo que protege se reformula sin debilitarse: ninguna ruta nueva crea cuentas ni cambia roles; solo siguen creando maestros las tres de hoy |
| C-3 | a | La guarda rechaza una ruta que declara `claseId` en cualquier posición, o un comodín bajo `/clases`, sin sexto paso, y un parámetro de clase con otro nombre (texto de la Enmienda 4) | Ningún caso conocido registra `:claseId`. El tester busca `claseId` y `/clases/:` en `guarda-r2`, `nombres-guarda-r3` y `middleware-orden` |
| C-4 | a | `/estudiante` y `/maestro` dejan de ser `BienvenidaView`. El `h1` es el titular con dato, y "Hola, \<nombre\>" pasa a ser un `<span>` de texto | Casos: `app/sesion-r2.ataque.test.tsx:103`, `:174`, `:184`, `:199` y `:208`; `app/router.ataque.test.tsx:91` y `:154`; `app/marco-r1.ataque.test.tsx:136-137`, `:217` y `:264`.<br>- `findByRole("heading", { name: "Hola, X" })` se convierte en `findByText("Hola, X")`.<br>- **Sigue protegiendo** que la pantalla muestre la identidad de la cuenta vigente.<br>- Las aserciones negativas no cambian.<br>- Si un `stubFetch` no conoce `/api/clases/inscritas` o `/impartidas` y eso rompe el caso, se agrega esa respuesta al doble. |
| C-5 | a | Los inicios piden `GET /api/clases/inscritas` o `/impartidas` | Cualquier `*.ataque` que cuente **todas** las llamadas a `fetch` al llegar a `/estudiante` o a `/maestro`, o que falle ante una ruta desconocida |
| C-6 | a | Al entrar con otra cuenta se descartan todas las consultas; `consultaMe` se define en `services/sesionService.ts` y `features/auth/hooks.ts` la reexporta | `app/cache-03a-r1.ataque.test.tsx` y `app/sesion-r2.ataque.test.tsx`, solo si alguno afirma que otra consulta sobrevive a un login; cualquier prueba estática que liste los archivos de `services/` de forma cerrada |
| C-7 | a | `enEspera=` pasa de 20 a **25** | `frontend/src/styles/clases-r1.ataque.test.ts:82-132` (V-06): `formulario-unirse-clase.tsx` 1, `formulario-clase.tsx` 1, `panel-mis-clases.tsx` 1 y `codigo-de-clase.tsx` 2 |
| C-8 | a | Vidrio nuevo | `clases-r1.ataque.test.ts:134-158` (V-07): `vidrio-fuerte` suma `bloque-destacado.tsx` y `tarjeta-clase.tsx`; `vidrio-azul` pasa a **exactamente** `bloque-destacado.tsx` |
| C-9 | a | `--text-display-compacto` en `tokens.css` | `styles/tokens-r1.ataque.test.ts` (`:127`), si enumera los `--text-*` de forma cerrada |
| C-10 | a | `BienvenidaView` se borra; `TEXTOS_SESION` pierde `saludo` y `proximamente` | Cualquier `*.ataque` que importe `bienvenida-view` o esas dos claves |
| C-11 | b | `enEspera=` pasa de 25 a **29** | V-06: `buscador-alumnos.tsx` (o su fila) 1; `tabla-alumnos.tsx` (o su fila) 2; `personas-view.tsx` 1 |
| C-12 | c | `enEspera=` pasa de 29 a **35**; colas nuevas; un `$queryRaw` etiquetado nuevo | - V-06: `formulario-publicacion.tsx` 1, `muro-view.tsx` 1, `publicacion-del-muro.tsx` 1, `comentarios-de-publicacion.tsx` 2 y `formulario-comentario.tsx` 1.<br>- Colas: cualquier `*.ataque` que las enumere de forma cerrada (`worker-r1`, `worker-r2`, `worker-03c-r1`).<br>- SQL etiquetado: cualquier lista cerrada de archivos con `$queryRaw`. |
| C-13 | d | `enEspera=` pasa de 35 a **36**; `STORAGE_*` en `config/env.ts`; `construirApp` acepta `almacen` | - V-06: `adjuntos-de-publicacion.tsx` 1.<br>- `config/env.ataque.test.ts`, si compara el objeto completo.<br>- `arranque-r1.ataque.test.ts`, si fija la firma de `construirApp`. |
| C-14 | a | ESLint rechaza `addHook` en `handlers/` | Ninguno |
| C-15 | b | Migración, tabla y secuencia nuevas (`movimientos_inscripcion`) | Cualquier `*.ataque` que liste de forma cerrada las tablas, las secuencias, las migraciones o los modelos de Prisma. Hoy no conozco ninguno |
| C-16 | a (ronda 4) | `GET /clases/inscritas` e `/impartidas` responden `400 VALIDACION` ("cursor: no es válido") ante un cursor que ya no es una inscripción del alumno o una clase del maestro (T-18, decisión del humano) | **Ya hecho por el tester, con el arbitraje del manager:** `backend/test/clases-r2.ataque.test.ts`, caso "HEAD, paginación, campos extra y fugas siguen como en la ronda 1".<br>- El cursor de una clase ajena responde `400 VALIDACION` "cursor: no es válido", y el caso sigue afirmando que no hay fuga.<br>- Se suma una aserción: un UUID inexistente responde idéntico, sin oráculo de existencia.<br>- Hash nuevo: `0135A34D3331D84D227DC0CF080C338A16E25334BE4E10EE172677329F7407D8`.<br>- Es la única `*.ataque` existente que cambió después de la ronda 0. |
| C-17 | b (corrección de la ronda 1) | Con `yaEstaba: true`, "Agregar a la clase" avisa con un toast neutro, `toast("<nombre> ya estaba en la clase")` (D-4) | **Ya hecho por el tester, con el arbitraje del manager (opción A):** `frontend/src/features/clases/alumnos-b-r1.ataque.test.tsx`.<br>- El doble de `sonner` pasa a ser invocable (`toast: Object.assign(vi.fn(), aviso)`), con las mismas referencias de `success` y `error`; ninguna aserción cambió.<br>- Hash: `755019C7…` → `C3692E9EC300696E9EB10470BE5239055CF3326D0FCD1607BD82663210AF1B1F`.<br>- Es la única `*.ataque` existente que cambió en b después de la ronda 0. |
| C-18 | c (Enmienda 6) | `nombreClaseSchema` exige al menos 2 caracteres visibles, y los textos obligatorios de c, al menos 1 (§D-C4). Un nombre sin contenido visible o de un solo emoji simple pasa a `400 VALIDACION`. La descripción de la clase no cambia | **Ningún caso conocido; el tester lo confirma.** Inventario del arquitecto: busqué `U+200B`, `U+2060`, `U+FEFF`, esos literales, `Cf`, `nombreClaseSchema`, `textoLargoSchema` y `descripcionClaseSchema` en las `*.ataque` de los dos paquetes.<br>- Ninguna afirma que se acepte un nombre de clase o una descripción con `Cf`.<br>- `backend/test/clases-r2.ataque.test.ts:146` acepta una descripción con U+200D dentro de un emoji. No lo contradice: la descripción no cambia y U+200D se sigue admitiendo.<br>- `frontend/src/features/clases/clases-r2.ataque.test.tsx:87-143` pinta nombres de 60 emojis con datos dobles, sin pasar por el esquema.<br>- No son de C-18: el término de búsqueda (`alumnos-b-r2`, `alumnos-b-r3`), los nombres de persona (`cuentas-03a-r1`, `auth-registro`, `invitacion-r1`), los nombres de la guarda (`nombres-guarda-r3`), el código (`codigo-r1`, `codigo-r2`) y los enlaces del pie (`pie-r2`, `pie-r3`). |
| C-19 | c (Enmienda 5, §D-C5; Enmienda 6) | `PanelMisClases` usa `useFocoAlCargarMas` de `hooks.ts` para el foco de "Ver más clases" (PR-C11a) | `frontend/src/features/clases/inicio-sin-datos-r2.ataque.test.tsx:25` simula `./hooks` con una fábrica cerrada de cuatro hooks (`useNombreDeSesion`, `useClasesInscritas`, `useClasesImpartidas` y `useUnirseAClase`). Con Vitest 4, leer un export ausente de un módulo simulado lanza.<br>- **La fábrica suma `useFocoAlCargarMas`** con un doble inerte que devuelve un ref: `() => ({ current: null })`.<br>- **No cambia ninguna aserción.** El caso sigue protegiendo que los inicios sin datos no afirman nada que la API no dio.<br>- **El tester busca además** cualquier otra `*.ataque` que simule `./hooks` (o `../hooks`) con una fábrica cerrada y monte los inicios o el panel, y la trata igual. |
| C-20 | c (ronda 1; Enmienda 8) | Los `max` y `min` de cadena de `shared/` cuentan en puntos de código, no en unidades de UTF-16 (T-32, §D-C4) | **Lo hace el tester antes del V-01 del programador:** `backend/test/muro-c-r1.ataque.test.ts:855`, caso "máximos en unidades de UTF-16, contados después de normalizar…".<br>- Lo reescribe según la unidad corregida: 2,500 emojis más "a" son 2,501 puntos de código y responden `201`; 5,000 emojis más "a" responden `400`.<br>- No debilita los 10 subcasos ASCII.<br>- Publica el hash nuevo en la tabla de la ronda 1.<br>- Ninguna prueba normal cambia por T-32. |

**Al terminar cada ronda 0:**
- Los casos reescritos quedan **en rojo** hasta que el programador termine, y ninguno más.
- El tester publica en `reporte-tester.md`, sección "CLASES-x — Ronda 0":
  - la lista exacta de casos en rojo esperados (archivo, línea, título y C-n);
  - la tabla de hashes de todas las `*.ataque`.

---

## Cambios por capa
"Crear" y "Modificar", por subentrega. Todo archivo que no aparece aquí está en "No se toca".

### shared/
| Archivo | Sub. | Acción | Contenido |
|---|---|---|---|
| `src/clases.ts` | a, b, c, d | Crear (a); Modificar (b, c, d) | **a:** §D-A3 (con `SEPARADORES_CODIGO_CLASE` y el rechazo de U+2028 y U+2029) y `CODIGOS_CLASES`.<br>**b:** `estadoPagoSchema`, `paginacionRosterSchema`, `personasRespuestaSchema`, `alumnoDeClaseSchema` (con `email` completo), `listaAlumnosRespuestaSchema`, `busquedaCandidatosSchema`, `candidatoSchema = { id, nombre, correoEnmascarado, yaInscrito }` (**sin** `email`, P-05 f), `candidatosRespuestaSchema`, `agregarAlumnoSchema`, `agregarAlumnoRespuestaSchema` (`{ alumno: { id, nombre }, yaEstaba }`) y `alumnoIdParamSchema`. Además, la normalización y el criterio del término (T-20, T-24): `normalizarTerminoDeBusqueda`, `LONGITUD_MINIMA_BUSQUEDA`, `LONGITUD_MAXIMA_BUSQUEDA`, `LONGITUD_MAXIMA_BUSQUEDA_CRUDA` y `estadoDeTerminoDeBusqueda` (§D-B3).<br>**c:** `tipoPublicacionSchema`, `crearPublicacionSchema` (discriminada), `publicacionSchema`, `listaPublicacionesRespuestaSchema`, `crearComentarioSchema`, `comentarioSchema`, `listaComentariosRespuestaSchema` y los esquemas de parámetros.<br>**c (Enmienda 6, §D-C4):** `contarCaracteresVisibles`, `MINIMO_VISIBLES_NOMBRE_CLASE`, `MINIMO_VISIBLES_TEXTO` y `textoConContenidoSchema(max, mensaje)`; `nombreClaseSchema` suma el `refine` de contenido visible; `crearPublicacionSchema` y `crearComentarioSchema` lo usan en sus textos obligatorios.<br>**c (Enmienda 8):** `normalizarTextoLargo` (desde `core/clases/texto.ts`, T-31); el `error` en español del `discriminatedUnion` y de la descripción del material (T-33).<br>**c (Enmienda 9, desviación aceptada):** los envoltorios `publicacionRespuestaSchema` y `comentarioRespuestaSchema`.<br>**d:** `adjuntos` en `publicacionSchema` y `archivoIds` en `crearPublicacionSchema`. |
| `src/archivos.ts` | d | Crear | §D-D4 |
| `src/index.ts` | a, b, c, d | Modificar | Reexporta lo nuevo |

### backend/core/ (funciones puras, con pruebas unitarias)
| Archivo | Sub. | Firma |
|---|---|---|
| `core/clases/codigo.ts` (Crear) | a | `codigoDesdeBytes(bytes: Uint8Array): string` |
| `core/clases/pertenencia.ts` (Crear) | a | - `type RelacionConClase = "maestro" \| "estudiante"`<br>- `interface DatosDePertenencia { maestroId: string; inscrito: boolean }`<br>- `relacionConClase(perfil: Pick<PerfilAutenticado, "id" \| "rol">, datos: DatosDePertenencia \| null): RelacionConClase \| null`<br>- `evaluarPertenencia(relacion: RelacionConClase \| null, exigencia: "inscripcion" \| "propiedad"): AppError \| null` |
| `core/paginacion.ts` (Crear) | a | `paginar<T>(filas: T[], limite: number, cursorDe: (fila: T) => string): { pagina: T[]; siguienteCursor: string \| null }` |
| `core/clases/texto.ts` (Crear en a; Modificar en c) | a, c | `normalizarTextoLargo(texto: string): string`. En c (Enmienda 8, T-31), la reexporta de `shared/src/clases.ts`, sin definirla |
| `core/clases/busqueda.ts` (Crear) | b | - `prepararTerminoDeBusqueda(q: string): string \| null`, con `normalizarTerminoDeBusqueda` y `LONGITUD_MINIMA_BUSQUEDA` importadas de `shared/` (T-24)<br>- `escaparComodinesLike(t: string): string`<br>- `enmascararCorreo(email: string): string` (S-22) |
| `core/eventos/avisos-de-clase.ts` (Crear) | c | §D-C3 |
| `core/archivos/almacen.ts` (Crear) | d | `interface Almacen` (§D-D2) |
| `core/archivos/politica.ts` (Crear) | d | - `validarArchivoDeclarado({ nombre, tipo, tamano }): AppError \| null`<br>- `claveDeMaterial(claseId: string, archivoId: string): string`<br>- `esImagenConVistaPrevia(tipo: string): boolean`<br>- `disposicionDeContenido(nombre: string, modo: "inline" \| "attachment"): string`<br>- `coincideConLoDeclarado(declarado, real): "ok" \| "falta" \| "distinto"`<br>- `VIGENCIA_URL_FIRMADA_S = 300` |

La regla de contenido visible (Enmienda 6) no agrega nada a `core/`: vive en `shared/` y la aplican los esquemas. Desde la Enmienda 8, `normalizarTextoLargo` también se define en `shared/`, y `core/clases/texto.ts` solo la reexporta (T-31).

### backend/adapters/
| Archivo | Sub. | Acción | Contenido |
|---|---|---|---|
| `db/clases.ts` | a | Crear | - `buscarDatosDePertenencia`<br>- `crearClase(datos, generarCodigo)`, `editarClase`, `leerClase`, `leerCodigo` y `regenerarCodigo(…, generarCodigo)`<br>- `listarClasesImpartidas` y `listarClasesInscritas`, con la comprobación del cursor por PK de §D-A4<br>- `buscarClasePorCodigo` e `inscribir({ claseId, usuarioId, origen }): Promise<{ yaEstaba: boolean }>` (unirse con código; no registra movimientos) |
| `db/inscripciones.ts` | b | Crear | - `listarPersonas` y `listarAlumnosDeClase`, con la paginación de §D-B3 bis. `listarAlumnosDeClase` es **la única** que selecciona `estadoPago` y `accesoRestringido`<br>- `buscarCandidatos({ claseId, termino, limite })`, que selecciona el `email` para que el handler lo enmascare<br>- `agregarAlumnoManual({ claseId, alumnoId, maestroId })` y `quitarAlumno({ claseId, alumnoId, maestroId })`, cada una en una transacción, con su escritura en `movimientos_inscripcion` como último paso (§D-B2)<br>- **Ninguna función exportada lee `movimientos_inscripcion`** |
| `db/publicaciones.ts` | c, d | Crear (c); Modificar (d) | **c:**<br>- `crearPublicacion({ id, claseId, autorId, tipo, titulo, texto }, alGuardar)`, `listarPublicaciones` y `borrarPublicacion`<br>- `listarComentarios` y `crearComentario({ id, claseId, publicacionId, autorId, texto }, alGuardar)`, con el `FOR SHARE`; devuelve `null` si no hay publicación<br>- `borrarComentario` y `borrarMiComentario`<br>**d:** confirmación de `archivoIds`, adjuntos en el listado y descarte al borrar |
| `db/archivos.ts` | d | Crear | `registrarArchivoPendiente`, `buscarArchivosParaConfirmar` y `buscarArchivoConfirmado` |
| `db/index.ts` | a, b, c, d | Modificar | Reexporta lo nuevo. No reexporta `obtenerDb` |
| `queue/colas.ts` | c | Modificar | §D-C3 |
| `storage/index.ts` | d | Crear | §D-D2 |
| `README.md` (adapters) | a, b, c, d | Modificar | - **a:** pertenencia y el reintento único del código<br>- **b:** el registro de movimientos en la misma transacción, su orden por `secuencia` y la ausencia de lecturas<br>- **c:** el encolado de los avisos y el `FOR SHARE`<br>- **d:** `storage`, el puerto y la confirmación |

### backend/handlers/ (ruta, método y cadena exacta)
| Ruta | Sub. | Archivo | Cadena |
|---|---|---|---|
| `POST /api/clases` | a | `clases/clases.ts` (Crear) | `authenticate → withProfile → withPasswordGate → withAccess → requireRole(["maestro"])` |
| `GET /api/clases/inscritas` | a | ídem | `… → requireRole(["estudiante"])` |
| `GET /api/clases/impartidas` | a | ídem | `… → requireRole(["maestro"])` |
| `POST /api/clases/unirse` | a | ídem | `… → requireRole(["estudiante"])` |
| `GET /api/clases/:claseId` | a | ídem | `… → requireRole(["estudiante","maestro"]) → requireMembership` |
| `PUT /api/clases/:claseId` | a | ídem | `… → requireRole(["maestro"]) → requireOwnership` |
| `GET` y `POST /api/clases/:claseId/codigo` | a | ídem | `… → requireRole(["maestro"]) → requireOwnership` |
| `GET /api/clases/:claseId/personas` | b | `clases/alumnos.ts` (Crear) | `… → requireRole(["estudiante","maestro"]) → requireMembership` |
| `GET` y `POST /api/clases/:claseId/alumnos`, `GET …/alumnos/candidatos`, `DELETE …/alumnos/:alumnoId` | b | ídem | `… → requireRole(["maestro"]) → requireOwnership` |
| `GET /api/clases/:claseId/publicaciones`, `GET` y `POST …/publicaciones/:publicacionId/comentarios`, `DELETE …/mis-comentarios/:comentarioId` | c | `clases/muro.ts` (Crear) | `… → requireRole(["estudiante","maestro"]) → requireMembership` |
| `POST …/publicaciones`, `DELETE …/publicaciones/:publicacionId`, `DELETE …/comentarios/:comentarioId` | c | ídem | `… → requireRole(["maestro"]) → requireOwnership` |
| `POST /api/clases/:claseId/archivos` | d | `archivos.ts` (Crear) | `… → requireRole(["maestro"]) → requireOwnership` |
| `POST /api/clases/:claseId/archivos/:archivoId/descarga` | d | ídem | `… → requireRole(["estudiante","maestro"]) → requireMembership` |

**Otros cambios:**
- `app.ts`: registra `clasesHandler` (a), `alumnosHandler` (b) y `muroHandler` (c) con `{ prefix: "/api" }`, y `archivosHandler` (d). En d, además, el parámetro `almacen` (§D-D2).
- `handlers/README.md`: los plugins y las rutas.
- **Ningún handler:**
  - lleva `try/catch`, salvo para traducir un error de proveedor;
  - verifica roles, propiedad o inscripción a mano;
  - importa `adapters/notifier`;
  - usa `addHook`.
- `estadoPago` aparece solo en `handlers/clases/alumnos.ts` (ruta `GET …/alumnos`) y en `adapters/db/inscripciones.ts` (`listarAlumnosDeClase`), además de `shared/`.

### backend/middleware/ (CLASES-a; §D-0)
Archivos: `require-membership.ts`, `require-ownership.ts`, `pertenencia.ts` (Crear), `tipos.ts`, `index.ts`, `guarda-de-rutas.ts` y `README.md`.

`README.md` documenta la opción `pertenencia`, el sexto paso real, `claseDe`, la regla de §D-0.3 (texto de la Enmienda 4) y la nota de N-01 para ADMIN.

### backend/workers/
Sin cambios.

### backend/prisma/
- a: migración `20260929232924_clases_e_inscripciones` (§D-A1) y `schema.prisma`.
- b: migración `20260930235837_movimientos_inscripcion` (§D-B8, sin la variante `@unique`) y `schema.prisma`.
- c: migración `<timestamp>_publicaciones_y_comentarios` (§D-C1) y `schema.prisma`.
- d: migración `<timestamp>_archivos` (§D-D1) y `schema.prisma`.

### infra/ y .env.example
- `infra/`: sin cambios (S-21).
- `backend/src/config/env.ts`, `config/env.test.ts` y `config/almacen.ts` (Crear), con su prueba (d).
- `backend/.env.example` (d), con este texto:
  ```
  # Almacén de archivos (protocolo S3). En desarrollo, el MinIO de infra/: estos valores DEBEN
  # COINCIDIR con STORAGE_* y MINIO_API_PORT de infra/.env. No son secretos y no sirven en prod.
  # Sin estas tres variables la API arranca, pero subir y descargar archivos responde 503.
  # En production son obligatorias (R2: STORAGE_REGION=auto).
  STORAGE_ENDPOINT=http://127.0.0.1:9000
  STORAGE_ACCESS_KEY=campusdev
  STORAGE_SECRET_KEY=dev_minio_no_usar_en_prod
  STORAGE_REGION=us-east-1
  STORAGE_BUCKET_PRIVADO=campus-privado
  ```
- `eslint.config.mjs` (a): §D-0.4.
- `backend/package.json` y `package-lock.json` (d): `minio`.

### frontend/
**Compartido**
| Archivo | Sub. | Acción |
|---|---|---|
| `src/app/router.tsx` | a, b | Modificar (§D-A5; b agrega `personas` y `alumnos`) |
| `src/features/auth/bienvenida-view.tsx` | a | **Borrar** |
| `src/features/auth/data.ts` | a | Modificar: `TEXTOS_SESION` sin `saludo` ni `proximamente` |
| `src/features/auth/hooks.ts` | a | Modificar: `consultarMeDeLaCuentaNueva`; `consultaMe` se importa de `services/sesionService.ts` y se reexporta |
| `src/services/sesionService.ts` | a | Crear: `consultaMe` |
| `src/components/estado-vacio.tsx` | a | Modificar (M-20) |
| `src/components/estado-pago-badge.tsx`, `acceso-restringido-badge.tsx` | b | Crear |
| `src/lib/format.ts` | a, d | Modificar: `formatearFechaLarga` (a) y `formatearTamano` (d) |
| `src/services/almacenService.ts` | d | Crear |
| `src/styles/tokens.css` | a | Modificar: solo `--text-display-compacto` |

**`src/features/clases/`** (módulo nuevo)
| Archivo | Sub. | Contenido |
|---|---|---|
| `types.ts` | a–d | Reexporta los tipos de `shared/`; tipos exclusivos de la interfaz |
| `data.ts` | a–d | Textos de §D-A7, §D-B6, §D-C6 y §D-D6; claves de consulta; `ACCEPT_DE_ADJUNTOS` (d). En b, además, "Nueva clase" y "Crear clase" del inicio del maestro (§D-B4 bis). En c (Enmienda 9), `TEXTOS_MURO.cambioMientrasLoVeias` y `TEXTOS_COMENTARIOS.cambioMientrasLosVeias` (T-34) |
| `lib.ts` | a–d | `varianteDeClase`, `titularInicio`, `siguientePasoInicio`, `textoConteoAlumnos`, `terminoDeBusquedaValido` y `terminoDeBusquedaMuyLargo` (b, sobre `estadoDeTerminoDeBusqueda` de `shared/`), el reparto de errores de N-04 (b, si vive aquí), `focoPerdido(documento)` (c, Enmienda 6, desde `hooks.ts`), `mensajeDeErrorDeLista(error, textoDelCursor)` (c, Enmienda 9, T-34), `vecinaDeFila` (c, desviación aceptada) y `errorDeArchivoElegido` (d) |
| `hooks.ts` | a–d | - **a:** `useNombreDeSesion`, `useClasesInscritas`, `useClasesImpartidas`, `useClase`, `useCodigoDeClase`, `useCrearClase`, `useEditarClase`, `useRegenerarCodigo` y `useUnirseAClase`<br>- **b:** §D-B5<br>- **c:** `usePublicaciones`, `useCrearPublicacion`, `useBorrarPublicacion`, `useComentarios`, `useComentar`, `useBorrarComentario` y `useBorrarMiComentario`; además (Enmienda 6), los avisos de `useAgregarAlumno` en sus callbacks, y `focoPerdido` deja de exportarse de aquí; y (Enmienda 8, T-30), los avisos de `useCrearPublicacion` y `useComentar` en sus callbacks<br>- **d:** `useSolicitarSubida` y `useUrlDeDescarga` |
| `inicio-estudiante-view.tsx`, `inicio-maestro-view.tsx`, `clase-layout.tsx`, `crear-clase-view.tsx`, `editar-clase-view.tsx`, `muro-view.tsx` | a (`muro-view` provisional), c; `inicio-maestro-view.tsx` se modifica en b (textos a `data.ts`, §D-B4 bis); `clase-layout.tsx` y `editar-clase-view.tsx` se modifican en c (N-B1, §D-C5 bis); en c, `muro-view.tsx` también usa `ConClaseDeLaRuta` (desviación aceptada), `mensajeDeErrorDeLista` (T-34) y el `refetch()` al pulsar "Muro" con la lista en error (T-35, Enmienda 9) | Vistas |
| `personas-view.tsx`, `alumnos-view.tsx` | b; se modifican en c (N-B1, §D-C5 bis) | Vistas |
| `components/bloque-destacado.tsx`, `tarjeta-clase.tsx`, `panel-mis-clases.tsx`, `formulario-unirse-clase.tsx`, `formulario-clase.tsx`, `encabezado-clase.tsx`, `codigo-de-clase.tsx`, `secciones-de-clase.tsx` | a; `secciones-de-clase.tsx` y `formulario-unirse-clase.tsx` (N-04, §D-B4 bis) se modifican en b; **`panel-mis-clases.tsx` se modifica en c**, solo para el foco de "Ver más clases" (§D-C5, Enmienda 5) | Crear |
| `components/buscador-alumnos.tsx`, `tabla-alumnos.tsx`, `lista-personas.tsx` | b; `buscador-alumnos.tsx` y `tabla-alumnos.tsx` se modifican en c (aviso de agregar y `focoPerdido`, §D-C5 bis) | Crear |
| `components/con-clase-de-la-ruta.tsx` | c (Enmienda 6, §D-C5 bis) | Crear |
| `components/formulario-publicacion.tsx`, `publicacion-del-muro.tsx`, `comentarios-de-publicacion.tsx`, `formulario-comentario.tsx` | c (`formulario-publicacion.tsx` se modifica en d). En c (Enmienda 8), `formulario-publicacion.tsx` y `formulario-comentario.tsx` normalizan antes de validar (T-31) y solo manejan estado local en `mutate` (T-30); `comentarios-de-publicacion.tsx` usa `mensajeDeErrorDeLista` (T-34, Enmienda 9) | Crear |
| `components/lista-de-adjuntos-elegidos.tsx`, `adjuntos-de-publicacion.tsx` | d | Crear |

- Ningún componente llama a `fetch`: solo lo hacen `services/apiClient.ts` y `services/almacenService.ts`.
- Los tipos de la API se infieren de `shared/`.
- `features/clases` no importa de otro módulo.

### Pruebas: listas cerradas por subentrega (M-02)
Tres grupos por subentrega. **Solo** estos archivos de pruebas se crean o se modifican; cualquier otro activa **PA-16**.
- **Nuevos:** el programador los crea en esa subentrega.
- **Existentes antes del encargo que se modifican:** se leen completos y se cambian solo los casos que dice la columna, sin reescribir el archivo ni borrar casos ajenos al cambio.
- **Del propio encargo que se extienden:** archivos creados en una subentrega anterior de CLASES. Solo se les **agregan** casos (los IDs de la subentrega); los casos ya existentes no se borran ni se reescriben.

| Sub. | Nuevos | Existentes antes del encargo que se modifican (y qué cambia) | Del propio encargo que se extienden |
|---|---|---|---|
| **a** | **Backend:** `src/core/clases/codigo.test.ts`, `src/core/clases/pertenencia.test.ts`, `src/core/clases/texto.test.ts`, `src/core/paginacion.test.ts`, `test/ayudas-clases.ts` (ayuda), `test/guarda-clase.integracion.test.ts`, `test/clases.integracion.test.ts` y `test/clases-autorizacion.integracion.test.ts`.<br>**Frontend:** `src/features/clases/lib.test.ts`, `inicio-estudiante-view.test.tsx`, `inicio-maestro-view.test.tsx`, `clase-layout.test.tsx` y `formulario-clase.test.tsx`; `src/features/auth/cambio-de-identidad.test.tsx`. | - `backend/src/middleware/index.test.ts`: el caso "501" pasa a PR-A07d.<br>- `backend/test/middleware-orden.integracion.test.ts`: el caso de `:99` pasa a PR-A07a a PR-A07c.<br>- `frontend/src/app/router.test.tsx`: PR-A26a a PR-A26c y "Hola" como texto.<br>- `frontend/src/styles/tokens.test.ts`: PR-A24.<br>- `frontend/src/components/estado-vacio.test.tsx`: PR-A25.<br>- `frontend/src/lib/format.test.ts`: PR-A27.<br>- **Solo para adaptarse a los inicios nuevos:** `frontend/src/app/marco.test.tsx`, `frontend/src/features/auth/login-view.test.tsx`, `frontend/src/features/auth/registro-view.test.tsx` y `frontend/src/features/auth/registro-maestro-view.test.tsx`. Se permite exactamente agregar al doble de `fetch` la respuesta de `/api/clases/inscritas` o `/impartidas`, o cambiar `findByRole("heading", { name: "Hola, X" })` por `findByText("Hola, X")`. No se quita ninguna aserción, y cada caso cambiado se lista en el resumen. | — |
| **b** | **Backend:** `src/core/clases/busqueda.test.ts`, `test/alumnos.integracion.test.ts`, `test/alumnos-autorizacion.integracion.test.ts` y `test/movimientos-inscripcion.integracion.test.ts`.<br>**Frontend:** `src/features/clases/personas-view.test.tsx` y `alumnos-view.test.tsx`; `src/components/estado-pago-badge.test.tsx`. | — | - `backend/test/ayudas-clases.ts`: limpieza de movimientos y después de clases, que corre **antes** de `borrarUsuariosDePrueba` en cada archivo de b (N-10, §D-B8).<br>- `frontend/src/features/clases/lib.test.ts` (PR-B09).<br>- `clase-layout.test.tsx` (PR-B14).<br>- `frontend/src/app/router.test.tsx` (PR-B15).<br>- `frontend/src/features/clases/inicio-estudiante-view.test.tsx` (PR-B17, N-04). |
| **c** | **Backend:** `src/core/eventos/avisos-de-clase.test.ts`, `test/muro.integracion.test.ts` y `test/muro-autorizacion.integracion.test.ts`.<br>**Frontend:** `src/features/clases/muro-view.test.tsx`, `formulario-publicacion.test.tsx` y `publicacion-del-muro.test.tsx`; `src/features/clases/con-clase-de-la-ruta.test.tsx` (Enmienda 6). | `backend/test/bloqueo-usuario.integracion.test.ts` (Enmienda 7): solo el caso E6 suma `"publicaciones.ts"` a su lista cerrada, a su título y a su comentario. No se reescribe el caso ni se quita ninguna aserción, y la lista sigue cerrada: `publicaciones.ts` es el único archivo de c con SQL etiquetado (V-04) | - `backend/test/ayudas-clases.ts` (misma regla de orden de limpieza).<br>- `frontend/src/features/clases/inicio-estudiante-view.test.tsx` (PR-C11a, foco de "Ver más clases"; Enmienda 5).<br>- `backend/src/core/clases/texto.test.ts` (PR-C12a a PR-C12d; Enmienda 6).<br>- `backend/test/clases.integracion.test.ts` (PR-C12f).<br>- `frontend/src/features/clases/components/formulario-clase.test.tsx` (PR-C12g).<br>- `frontend/src/features/clases/lib.test.ts` (PR-C13c).<br>- `frontend/src/features/clases/alumnos-view.test.tsx` (PR-C13a y PR-C13b). |
| **d** | **Backend:** `src/core/archivos/politica.test.ts`, `src/config/almacen.test.ts`, `src/adapters/storage/index.test.ts`, `test/almacen-en-memoria.ts` (ayuda), `test/archivos.integracion.test.ts` y `test/archivos-autorizacion.integracion.test.ts`.<br>**Frontend:** `src/services/almacenService.test.ts` y `src/features/clases/adjuntos-de-publicacion.test.tsx`. | `backend/src/config/env.test.ts` (PR-D02a a PR-D02c) | - `backend/test/ayudas-clases.ts` (misma regla de orden de limpieza).<br>- `frontend/src/lib/format.test.ts` (PR-D14).<br>- `frontend/src/features/clases/lib.test.ts` (PR-D15).<br>- `formulario-publicacion.test.tsx` (PR-D11a a PR-D12c). |

---

## Acceso a datos
Ninguna consulta va dentro de un ciclo. Toda lista se pagina (100 como máximo). El único SQL crudo nuevo en `src/` es el `SELECT … FOR SHARE` etiquetado y parametrizado de `crearComentario`; lo demás pasa por la API de Prisma.

| Operación | Tablas y consulta | Índice | Paginación | Transacción |
|---|---|---|---|---|
| `buscarDatosDePertenencia` (a) | `clases` por PK, con `inscripciones` donde `usuario_id` | PK; PK `(clase_id, usuario_id)` | — | No |
| `crearClase` (a) | `INSERT clases`; un reintento si choca el código | único `codigo_invitacion` | — | No |
| `editarClase` (a) | `UPDATE clases WHERE id AND maestro_id` | PK | — | No |
| `leerClase` y `leerCodigo` (a) | `clases` por PK (+ maestro por PK) | PK | — | No |
| `regenerarCodigo` (a) | `UPDATE clases SET codigo WHERE id AND maestro_id`; un reintento | PK; único | — | No |
| `listarClasesImpartidas` (a) | 1. Con cursor, `clases` por PK (`id` = cursor, `maestro_id` = el maestro); si no hay fila, `400` (§D-A4).<br>2. `clases WHERE maestro_id ORDER BY creado_en DESC, id DESC`, cursor y `take + 1`, con `_count` de inscripciones activas.<br>3. `COUNT`. | PK; `(maestro_id, creado_en DESC, id DESC)`; PK de `inscripciones` | Sí (20; máx. 100) | No |
| `listarClasesInscritas` (a) | 1. Con cursor, `inscripciones` por PK (`clase_id` = cursor, `usuario_id` = el alumno); si no hay fila, `400` (§D-A4).<br>2. `inscripciones WHERE usuario_id ORDER BY creado_en DESC, clase_id DESC`, cursor en la PK, `include` de clase y maestro.<br>3. `COUNT`. | PK; `(usuario_id, creado_en DESC, clase_id DESC)` | Sí | No |
| `buscarClasePorCodigo` e `inscribir` (a) | `clases` por código; `INSERT inscripciones ON CONFLICT DO NOTHING` | único; PK | — | No |
| `listarPersonas` y `listarAlumnosDeClase` (b) | 1. Con cursor, **`usuarios` por PK** (el `nombre_busqueda` del cursor; `400` solo si no existe).<br>2. `inscripciones WHERE clase_id AND usuario.activo AND (clave > cursor) ORDER BY usuario.nombre_busqueda, usuario_id LIMIT n+1`.<br>3. `COUNT` sin la clave. | PK de `usuarios`; PK de `inscripciones` (prefijo `clase_id`) | Sí (50; máx. 100) | No |
| `buscarCandidatos` (b) | `usuarios WHERE rol = 'estudiante' AND activo AND nombre_busqueda LIKE '%t%' ORDER BY nombre_busqueda, id LIMIT n+1`, con `inscripciones` de la clase en lote | **GIN `usuarios_nombre_busqueda_idx`**; PK de `inscripciones` | Tope de 50 y `hayMas` (R-06) | No |
| `agregarAlumnoManual` (b) | 1. `usuarios` por PK (`id`, `nombre`).<br>2. `INSERT inscripciones ON CONFLICT DO NOTHING`.<br>3. Si insertó, `INSERT movimientos_inscripcion` (toma `secuencia`). | PK; PK; PK | — | **Sí** |
| `quitarAlumno` (b) | 1. `DELETE inscripciones` por PK.<br>2. Si borró, `INSERT movimientos_inscripcion` (toma `secuencia`). | PK; PK | — | **Sí** |
| `listarPublicaciones` (c; d suma adjuntos) | 1. Con cursor, `publicaciones` por PK (`id` = cursor, `clase_id`); si no hay fila, `400` (§D-A4, principio común; T-29).<br>2. `publicaciones WHERE clase_id ORDER BY creado_en DESC, id DESC`, con cursor e `include` del autor.<br>3. `groupBy comentarios WHERE publicacion_id IN (página)`.<br>4. (d) `archivos WHERE publicacion_id IN (página) AND estado = 'confirmado'`. | PK; `(clase_id, creado_en DESC, id DESC)`; `(publicacion_id, creado_en, id)`; `archivos(publicacion_id)` | Sí (20) | No |
| `crearPublicacion` (c; d confirma) | `INSERT publicaciones`; (d) `UPDATE archivos WHERE id IN (≤5) AND …`; `insert` de pg-boss | PK | — | **Sí** |
| `borrarPublicacion` (c; d) | (d) `UPDATE archivos WHERE publicacion_id`; `DELETE publicaciones WHERE id AND clase_id` | `archivos(publicacion_id)`; PK | — | Sí |
| `listarComentarios` (c) | 1. `publicaciones WHERE id AND clase_id` (sin fila, `404`).<br>2. Con cursor, `comentarios` por PK (`id` = cursor, `publicacion_id`); si no hay fila, `400` (§D-A4, principio común; T-29).<br>3. `comentarios WHERE publicacion_id ORDER BY creado_en, id`, cursor e `include` del autor. | PK; PK; `(publicacion_id, creado_en, id)` | Sí (20) | No |
| `crearComentario` (c) | `SELECT … FOR SHARE` (`$queryRaw` etiquetado); `INSERT comentarios`; `insert` de pg-boss | PK | — | **Sí** |
| `borrarComentario` y `borrarMiComentario` (c) | `DELETE comentarios WHERE id AND publicacion.clase_id [AND publicacion_id \| AND autor_id]` | PK | — | No |
| `registrarArchivoPendiente` (d) | `INSERT archivos` | PK; único | — | No |
| `buscarArchivosParaConfirmar` (d) | `archivos WHERE id IN (≤5)` | PK | Entrada acotada a 5 | No |
| `buscarArchivoConfirmado` (d) | `archivos WHERE id AND clase_id AND estado = 'confirmado'` | PK | — | No |

`movimientos_inscripcion` solo recibe `INSERT`; no hay ninguna consulta de lectura (por eso no lleva índices secundarios, §D-B8). Su orden es `secuencia`.

---

## Autorización
| Endpoint | Pueden | No pueden (y respuesta) | Campos que nunca salen |
|---|---|---|---|
| `POST /clases` | Maestro | - Sin token: 401.<br>- Estudiante o admin: 403 `ROL_NO_PERMITIDO`.<br>- Maestro con cambio de contraseña pendiente: 403 `CAMBIO_DE_CONTRASENA_REQUERIDO`. | — |
| `GET /clases/inscritas` y `POST /clases/unirse` | Estudiante no restringido | - Sin token: 401.<br>- Restringido: 403 `ACCESO_RESTRINGIDO`.<br>- Maestro o admin: 403 `ROL_NO_PERMITIDO`. | `codigoInvitacion`, `estadoPago`, `email` |
| `GET /clases/impartidas` | Maestro | Estudiante o admin: 403 | `estadoPago` |
| `GET /clases/:claseId` | Estudiante inscrito y maestro dueño | - No inscrito, maestro ajeno o clase inexistente: 403 `SIN_ACCESO_A_LA_CLASE`.<br>- Admin: 403 `ROL_NO_PERMITIDO`.<br>- Restringido, aunque esté inscrito: 403 `ACCESO_RESTRINGIDO`. | `codigoInvitacion`, `estadoPago`, `email` |
| `PUT /clases/:claseId`, `GET` y `POST …/codigo` | Maestro dueño | - Estudiante inscrito: 403 `ROL_NO_PERMITIDO`.<br>- Maestro ajeno: 403 `SIN_ACCESO_A_LA_CLASE`, sin escribir. | — |
| `GET …/personas` | Estudiante inscrito y maestro dueño | Ídem | **`estadoPago`, `accesoRestringido`, `email`** |
| `GET …/alumnos` | Maestro dueño | Estudiante inscrito: 403; maestro ajeno: 403 | — (aquí, y solo aquí, salen el correo completo, `estadoPago` y `accesoRestringido`) |
| `GET …/alumnos/candidatos` | Maestro dueño | Ídem | **el correo completo** (solo `correoEnmascarado`, P-05 f), `estadoPago`, `accesoRestringido` |
| `POST …/alumnos` | Maestro dueño | Ídem, sin escribir inscripción ni movimiento | **`estadoPago`, `accesoRestringido`, correo** |
| `DELETE …/alumnos/:alumnoId` | Maestro dueño | Ídem, sin escribir inscripción ni movimiento | — (204) |
| `GET …/publicaciones`, `GET` y `POST …/comentarios`, `DELETE …/mis-comentarios/:id` | Estudiante inscrito y maestro dueño | Ídem. Una publicación o comentario de otra clase con un `claseId` propio da 404, sin escribir | `estadoPago`, `email` |
| `POST …/publicaciones`, `DELETE …/publicaciones/:id`, `DELETE …/comentarios/:id` | Maestro dueño | Estudiante: 403 `ROL_NO_PERMITIDO`; maestro ajeno: 403 | — |
| `POST …/archivos` | Maestro dueño | Ídem | — |
| `POST …/archivos/:id/descarga` | Estudiante inscrito y maestro dueño | Ídem; un archivo de otra clase o pendiente da 404 | La clave del objeto; ninguna URL de otra clase |
| `movimientos_inscripcion` | Nadie la lee en CLASES | Ninguna ruta la expone (PR-B16g, PR-B16h) | Toda la tabla |

- **El admin no pasa por ninguna ruta de `/api/clases`** (S-07).
- **El estado de pago solo aparece en `GET /clases/:claseId/alumnos`.** Las pruebas lo comprueban recorriendo el JSON de toda respuesta (PR-A16, PR-B02e, PR-B04g, PR-B06e, PR-B08i, PR-C03b y PR-D06c).
- **El correo completo de un estudiante solo aparece en `GET /clases/:claseId/alumnos`** (y el propio en `GET /me`). PR-B04h lo comprueba en el buscador.

---

## Pruebas requeridas
**Regla (M-02): cada ID es un solo comportamiento en un solo archivo, y cada ID lleva su caso**, con el ID al inicio del título del caso (por ejemplo, `it("PR-A18c: exactamente un botón primary", …)`).
- Todos los archivos están en "Pruebas: listas cerradas por subentrega".
- Todas las pruebas llevan al menos una aserción, y ninguna termina con un `return` temprano ante una precondición que falte.
- Los avisos se comprueban en la cola (`buscarTrabajo` o `describirCola`).
- Nada llama a Resend ni a un almacén real.
- **La suite del backend solo corre con PA-01.**

### CLASES-a
| ID | Archivo | Comportamiento |
|---|---|---|
| PR-A01a | `backend/src/core/clases/codigo.test.ts` | `codigoDesdeBytes` da 7 caracteres, todos del alfabeto |
| PR-A01b | ídem | asociación `b % 32`: 0 → "A", 31 → "9", 32 → "A" |
| PR-A01c | ídem | lanza con 6 y con 8 bytes |
| PR-A02a | ídem | `codigoInvitacionSchema` normaliza minúsculas, espacios y guiones |
| PR-A02a2 | ídem | acepta los espacios y guiones Unicode de la lista cerrada `SEPARADORES_CODIGO_CLASE` (T-15; ya existe, `codigo.test.ts:33`) |
| PR-A02b | ídem | rechaza "O", "0", "I" y "1" |
| PR-A02c | ídem | rechaza 6 y 8 caracteres |
| PR-A02d | ídem | rechaza dígitos de ancho completo y caracteres invisibles |
| PR-A02d2 | ídem | rechaza las rayas U+2012 a U+2015, que no son guiones (T-15; ya existe, `codigo.test.ts:71`) |
| PR-A03a | `backend/src/core/clases/pertenencia.test.ts` | `relacionConClase`, en tabla: maestro dueño, maestro ajeno, estudiante inscrito, estudiante no inscrito, admin, datos nulos, y un estudiante cuyo id coincide con `maestroId` → `null` |
| PR-A03b | ídem | `evaluarPertenencia` con `"propiedad"` y con `"inscripcion"` para cada relación |
| PR-A04a | `backend/src/core/paginacion.test.ts` | con `limite + 1` filas, el cursor es el id de la última de la página |
| PR-A04b | ídem | con `limite` filas o menos, cursor `null` |
| PR-A04c | ídem | lista vacía |
| PR-A05 | `backend/src/core/clases/texto.test.ts` | `normalizarTextoLargo`: CRLF y CR → LF, recorte en los extremos, el interior no cambia |
| PR-A06a | `backend/test/guarda-clase.integracion.test.ts` | una ruta `/api/x/:claseId` sin sexto paso no arranca, con el mensaje exacto |
| PR-A06b | ídem | con `pertenencia: "inscripcion"` o `"propiedad"`, arranca |
| PR-A06c | ídem | `/api/clases/:id` no arranca |
| PR-A06d | ídem | una ruta con pertenencia y sin `:claseId` arranca, y con token responde `500 CLASE_AUSENTE` |
| PR-A06e | ídem | un `:claseId` que no es UUID responde `400 VALIDACION` |
| PR-A06f | ídem | `:claseId` en cualquier posición del segmento (no solo al principio) exige el sexto paso (T-02; ya existe, `guarda-clase.integracion.test.ts:120`) |
| PR-A06g | ídem | bajo `/clases/`, el segmento siguiente solo puede ser exactamente `:claseId`, ni combinado con otro parámetro (T-13; ya existe, `guarda-clase.integracion.test.ts:146`) |
| PR-A07a | `backend/test/middleware-orden.integracion.test.ts` (modificado) | un restringido inscrito recibe `ACCESO_RESTRINGIDO`, no `SIN_ACCESO_A_LA_CLASE` |
| PR-A07b | ídem | el admin recibe `ROL_NO_PERMITIDO` |
| PR-A07c | ídem | el miembro recibe 200 y el que no es miembro, 403 |
| PR-A07d | `backend/src/middleware/index.test.ts` (modificado) | el sexto paso lleva la marca `requireMembership` o `requireOwnership` |
| PR-A08a | `backend/test/clases.integracion.test.ts` | crear responde 201 con un código de 7 caracteres del alfabeto |
| PR-A08b | ídem | `maestro_id` es el del perfil aunque el cuerpo traiga otro `maestroId` |
| PR-A08c | ídem | una descripción vacía se guarda como `null` |
| PR-A08d | ídem | un nombre con U+202E responde 400 |
| PR-A08e | ídem | un nombre con separador de línea (U+2028) o de párrafo (U+2029) responde 400 (T-16; ya existe, `clases.integracion.test.ts:135`) |
| PR-A09a | ídem | con un generador doble cuyo primer código choca, se crea con el segundo |
| PR-A09b | ídem | si los dos chocan, `500` y ninguna fila nueva |
| PR-A10a | ídem | editar como dueño responde 200 con los datos nuevos |
| PR-A10b | ídem | un cuerpo inválido responde 400 sin cambios |
| PR-A11a | ídem | el dueño ve el código, con `no-store` |
| PR-A11b | ídem | regenerar cambia el código, y el viejo responde `404 CODIGO_INVALIDO` al unirse |
| PR-A11c | ídem | después de regenerar, los inscritos siguen inscritos |
| PR-A12a | ídem | unirse con el código en minúsculas y con espacios → 200, `yaEstabas: false`, `origen = 'codigo'` |
| PR-A12b | ídem | la segunda vez → 200, `yaEstabas: true`, una sola fila |
| PR-A12c | ídem | un código inexistente → 404 sin escribir |
| PR-A13a | ídem | `inscritas` devuelve solo las del alumno, en orden, en 3 páginas con cursor y con `total` |
| PR-A13b | ídem | `impartidas` devuelve solo las del maestro, con el conteo de alumnos activos |
| PR-A13c | ídem | `inscritas` con un cursor que ya no es una inscripción del alumno responde `400 VALIDACION` ("cursor: no es válido") (T-18; ya existe, ronda 4) |
| PR-A13d | ídem | `impartidas` con un cursor que es una clase de otro maestro responde `400 VALIDACION` ("cursor: no es válido") (T-18; ya existe, ronda 4) |
| PR-A14a | ídem | el detalle responde 200 al miembro, sin `codigoInvitacion` |
| PR-A14b | ídem | un `claseId` inexistente y uno ajeno reciben el mismo 403 (código y mensaje) |
| PR-A15a | `backend/test/clases-autorizacion.integracion.test.ts` | cada ruta de a: sin token, 401 |
| PR-A15b | ídem | cada ruta: con `debe_cambiar_contrasena`, 403 |
| PR-A15c | ídem | cada ruta: estudiante restringido **inscrito**, 403 `ACCESO_RESTRINGIDO` |
| PR-A15d | ídem | cada ruta: admin, 403 `ROL_NO_PERMITIDO` |
| PR-A15e | ídem | cada ruta: rol incorrecto, 403 |
| PR-A15f | ídem | cada ruta de clase: maestro ajeno y estudiante no inscrito, 403 `SIN_ACCESO_A_LA_CLASE` |
| PR-A15g | ídem | cada ruta: el caso permitido, 2xx |
| PR-A15h | ídem | en cada caso negado, las filas de `clases` e `inscripciones` quedan como estaban |
| PR-A16 | ídem | recorrido recursivo del JSON de toda respuesta de a: ninguna clave `estadoPago`, `accesoRestringido` ni `email` |
| PR-A17a | `frontend/src/features/clases/lib.test.ts` | `varianteDeClase` es determinista y, con 30 ids aleatorios, usa las tres variantes |
| PR-A17b | ídem | `titularInicio` y `siguientePasoInicio` en 0, 1 y N, por rol |
| PR-A17c | ídem | `textoConteoAlumnos` en 0, 1 y N |
| PR-A18a | `frontend/src/features/clases/inicio-estudiante-view.test.tsx` | "Hola, \<nombre\>" se ve también cuando falla `/api/clases/inscritas` |
| PR-A18b | ídem | el `h1` lleva el dato |
| PR-A18c | ídem | exactamente un botón `primary` ("Unirme a la clase") |
| PR-A18d | ídem | unirse con éxito navega a la clase y muestra el toast |
| PR-A18e | ídem | `CODIGO_INVALIDO` muestra `ErrorDeCampo` asociado al campo |
| PR-A18f | ídem | el campo del código lleva `autoComplete="off"` |
| PR-A18g | ídem | la acción del vacío lleva el foco al campo del código |
| PR-A18h | ídem | los estados del panel siguen el orden error → cargando → vacío → datos |
| PR-A18i | ídem | "Ver más clases" aparece solo con cursor |
| PR-A18j | ídem | cada tarjeta es un enlace con nombre accesible igual al nombre de la clase y destino `/estudiante/clases/{id}` |
| PR-A19a | `frontend/src/features/clases/inicio-maestro-view.test.tsx` | las tarjetas muestran "N alumnos" |
| PR-A19b | ídem | "Crear clase" apunta a `/maestro/clases/nueva` |
| PR-A19c | ídem | la acción del vacío "Crea tu primera clase" es `outline` |
| PR-A19d | ídem | cada tarjeta es un enlace con el nombre de la clase y destino `/maestro/clases/{id}` |
| PR-A20 | — | Fundida en PR-A18j y PR-A19d (M-02) |
| PR-A21a | `frontend/src/features/clases/formulario-clase.test.tsx` | la validación en cliente muestra `ErrorDeCampo` |
| PR-A21b | ídem | el envío llama a la API y navega a la clase |
| PR-A21c | ídem | el botón está en `enEspera` mientras envía |
| PR-A21d | ídem | al editar, precarga los datos |
| PR-A21e | ídem | un error que no es de un campo avisa con toast, sin marcar "Nombre de la clase" (T-19; ya existe, ronda 4) |
| PR-A22a | `frontend/src/features/clases/clase-layout.test.tsx` | `SIN_ACCESO_A_LA_CLASE` muestra `MensajeError` y "Volver a mis clases" |
| PR-A22b | ídem | las secciones llevan `aria-current` y no hay `nav` |
| PR-A22c | ídem | el maestro copia el código (portapapeles doble), y un fallo da un toast |
| PR-A22d | ídem | regenerar pide confirmación en línea: foco a "Cancelar" y, al cancelar, vuelve a "Regenerar código" |
| PR-A22e | ídem | el estudiante no ve el código ni pide `/codigo` |
| PR-A23a | `frontend/src/features/auth/cambio-de-identidad.test.tsx` | con `["clases", "inscritas"]` de la cuenta A en caché, entrar con B deja esa consulta fuera de la caché antes del primer render del inicio de B |
| PR-A23b | ídem | `consultaMe` importada de `features/auth/hooks` y de `services/sesionService` es el mismo objeto |
| PR-A24 | `frontend/src/styles/tokens.test.ts` (modificado) | `--text-display-compacto` vale `2rem`, `1.05`, `-0.03em` y `700` |
| PR-A25 | `frontend/src/components/estado-vacio.test.tsx` (modificado) | el módulo exporta exactamente `["EstadoVacio"]` |
| PR-A26a | `frontend/src/app/router.test.tsx` (modificado) | `/estudiante` monta el inicio del estudiante |
| PR-A26b | ídem | `/maestro/clases/nueva` monta el formulario |
| PR-A26c | ídem | un estudiante en `/maestro/...` vuelve a `/estudiante` |
| PR-A27 | `frontend/src/lib/format.test.ts` (modificado) | `formatearFechaLarga` da "martes 29 de septiembre" en la zona indicada |

### CLASES-b
| ID | Archivo | Comportamiento |
|---|---|---|
| PR-B01a | `backend/src/core/clases/busqueda.test.ts` | "José" se normaliza a "jose" |
| PR-B01b | ídem | `"  ab  "` → `null` (2 normalizados, menos de 3); `"  a  b "` → `"a b"`, que mide 3 y se acepta: el mínimo cuenta el espacio interior (D-2, Enmienda 5) |
| PR-B01c | ídem | `escaparComodinesLike` escapa `%`, `_` y `\` |
| PR-B01d | ídem | `enmascararCorreo("ana.lopez@colegio.mx") === "an***@colegio.mx"` (parte local de 3 o más) |
| PR-B01e | ídem | parte local de 2 y de 1 caracteres: `"jo@x.mx"` → `"j***@x.mx"` y `"a@x.mx"` → `"***@x.mx"`; nunca aparece la parte local completa (S-22, Enmienda 3) |
| PR-B01f | ídem | sin `@`, con la parte local vacía o con el dominio vacío → `"***"`, sin lanzar; con dos `@` separa en la última |
| PR-B01g | ídem | cuenta caracteres Unicode completos (una parte local con un emoji o una letra fuera del plano básico no se parte a la mitad) |
| PR-B02a | `backend/test/alumnos.integracion.test.ts` | personas: el estudiante inscrito ve al maestro y a los alumnos activos, ordenados por nombre |
| PR-B02b | ídem | personas: una cuenta inactiva no aparece |
| PR-B02c | ídem | personas: paginación con cursor y `totalAlumnos` |
| PR-B02d | ídem | personas: dos alumnos con el mismo nombre, partidos entre dos páginas (`limite=1`), salen los dos, sin repetirse ni perderse |
| PR-B02e | ídem | personas: el recorrido recursivo no encuentra `estadoPago`, `accesoRestringido` ni `email`, con un compañero deudor y otro restringido |
| PR-B02f | ídem | personas: si se quita de la clase al alumno del cursor, la página siguiente sale completa |
| PR-B03a | ídem | roster: `estadoPago` `deudor` y `al_corriente` correctos |
| PR-B03b | ídem | roster: `accesoRestringido: true` para el restringido |
| PR-B03c | ídem | roster: `origen` y el correo completo correctos |
| PR-B03d | ídem | roster: dos alumnos con el mismo nombre partidos entre dos páginas |
| PR-B03e | ídem | roster: un cursor de un alumno desactivado después sigue sirviendo; un cursor de un usuario inexistente → 400 |
| PR-B04a | ídem | candidatos: "jose", "PÉREZ" y "rez" encuentran a "José Pérez" |
| PR-B04b | ídem | candidatos: no devuelve maestros, al admin ni cuentas inactivas |
| PR-B04c | ídem | candidatos: `yaInscrito` es correcto |
| PR-B04d | ídem | candidatos: `"%%%"` y `"___"` no devuelven a todos los estudiantes |
| PR-B04e | ídem | candidatos: `q` de 2 → 400; `"  ab  "` → `400 BUSQUEDA_MUY_CORTA` |
| PR-B04f | ídem | candidatos: `limite` y `hayMas` |
| PR-B04g | ídem | candidatos: el recorrido recursivo no encuentra `estadoPago`, `accesoRestringido` ni `email` |
| PR-B04h | ídem | candidatos: cada `correoEnmascarado` es el de `enmascararCorreo`, y el correo completo de ningún candidato aparece en `JSON.stringify` de la respuesta (ni en otro campo), incluido un alumno ya inscrito |
| PR-B05 | ídem | Con `SET LOCAL enable_seqscan = off`, `EXPLAIN (FORMAT JSON)` de la consulta con la misma forma que emite Prisma (`"nombre_busqueda"::text LIKE $1`, más `rol`, `activo`, `ORDER BY` y `LIMIT`, con parámetros) menciona `usuarios_nombre_busqueda_idx`.<br>**Como quedó (D-1, M-07; Enmienda 5):**<br>- siembra 40,000 filas dentro de una transacción que se revierte. El umbral medido es: con 16,000 el planificador elige otro *bitmap* sobre `usuarios_rol_idx`, y con 17,000 a 20,000, el GIN. 40,000 deja un margen de dos veces el umbral, medido también en la suite completa;<br>- la aserción imprime el plan elegido si falla;<br>- la transacción lleva `{ timeout: 15000, maxWait: 15000 }`;<br>- retiene `usuarios` unos 5 s (R-27, CHORE-02). |
| PR-B06a | ídem | agregar → 200, `yaEstaba: false`, `origen = 'manual'` |
| PR-B06b | ídem | agregar dos veces → 200, `yaEstaba: true`, una sola fila |
| PR-B06c | ídem | un maestro, el admin, una cuenta inactiva o un id inexistente como `alumnoId` → `404 ALUMNO_NO_ENCONTRADO` sin escribir |
| PR-B06d | ídem | agregar a un alumno restringido → 200 (S-12) |
| PR-B06e | ídem | la respuesta de agregar tiene exactamente las claves `alumno` (`id`, `nombre`) y `yaEstaba`, sin `estadoPago`, `accesoRestringido` ni `email` en el recorrido recursivo, con un alumno deudor y restringido |
| PR-B07a | ídem | quitar → 204 |
| PR-B07b | ídem | quitar a quien no está inscrito → 204 |
| PR-B07c | ídem | después de quitarlo, el alumno recibe 403 en `GET /clases/:claseId` |
| PR-B08a | `backend/test/alumnos-autorizacion.integracion.test.ts` | cada ruta de b: sin token, 401 |
| PR-B08b | ídem | cada ruta: `debe_cambiar_contrasena`, 403 |
| PR-B08c | ídem | cada ruta: restringido inscrito, 403 `ACCESO_RESTRINGIDO` |
| PR-B08d | ídem | cada ruta: admin, 403 |
| PR-B08e | ídem | cada ruta: rol incorrecto, 403 (el estudiante inscrito en `…/alumnos`, `…/candidatos` y en el `POST` y el `DELETE`) |
| PR-B08f | ídem | cada ruta: maestro ajeno y estudiante no inscrito, 403 `SIN_ACCESO_A_LA_CLASE` |
| PR-B08g | ídem | cada ruta: el caso permitido, 2xx |
| PR-B08h | ídem | en cada caso negado, `inscripciones` y `movimientos_inscripcion` quedan como estaban |
| PR-B08i | ídem | ninguna respuesta que recibe un estudiante contiene `estadoPago` |
| PR-B09 | `frontend/src/features/clases/lib.test.ts` (extendido) | `terminoDeBusquedaValido` con espacios, acentos y 3 caracteres |
| PR-B10a | `frontend/src/features/clases/alumnos-view.test.tsx` | con menos de 3 caracteres no pide nada |
| PR-B10b | ídem | con temporizadores falsos, una sola petición 300 ms después de la última tecla |
| PR-B10c | ídem | un candidato inscrito muestra "Ya está en la clase" en lugar del botón |
| PR-B10d | ídem | agregar invalida el roster y muestra el toast |
| PR-B10e | ídem | el buscador lleva `autoComplete="off"` |
| PR-B10f | ídem | el botón de cada fila lleva el nombre del alumno en su nombre accesible |
| PR-B10g | ídem | cada resultado muestra el `correoEnmascarado` tal como llega, y el buscador no muestra ningún correo completo |
| PR-B11a | ídem | la tabla muestra "Al corriente" y "Deudor" como texto |
| PR-B11b | ídem | la tabla muestra "Acceso restringido" como texto |
| PR-B11c | ídem | quitar pide confirmación en línea, con el manejo de foco |
| PR-B11c2 | ídem | tras "Sí, quitar", el foco va al "Quitar" de la fila que ocupa el lugar de la quitada: fila del medio, última y única (en la única, al `h2`); nunca a `<body>` (T-21, corrección de la ronda 1) |
| PR-B11d | ídem | "Ver más alumnos" aparece solo con cursor |
| PR-B12a | `frontend/src/features/clases/personas-view.test.tsx` | el maestro va separado de los alumnos |
| PR-B12b | ídem | el contador va en palabras |
| PR-B12c | ídem | no hay correos ni insignias de pago |
| PR-B12d | ídem | los estados siguen su orden |
| PR-B13a | `frontend/src/components/estado-pago-badge.test.tsx` | "Al corriente" con su icono |
| PR-B13b | ídem | "Deudor" con su icono |
| PR-B13c | ídem | `AccesoRestringidoBadge` con "Acceso restringido" y su icono |
| PR-B14 | `frontend/src/features/clases/clase-layout.test.tsx` (extendido) | las secciones suman "Personas" (estudiante) y "Alumnos" (maestro) |
| PR-B15 | `frontend/src/app/router.test.tsx` (extendido) | `personas` y `alumnos` montan sus vistas |
| PR-B16a | `backend/test/movimientos-inscripcion.integracion.test.ts` | un alta manual efectiva escribe exactamente una fila `alta` con `clase_id`, `alumno_id`, `maestro_id` del perfil y `creado_en`, y con una `secuencia` mayor que la de cualquier movimiento anterior |
| PR-B16b | ídem | una baja efectiva escribe exactamente una fila `baja`, con una `secuencia` mayor que la del alta previa |
| PR-B16c | ídem | un alta con `yaEstaba: true` y una baja de alguien no inscrito no escriben nada (S-23) |
| PR-B16d | ídem | unirse con código no escribe nada; quitar después a ese alumno escribe una `baja` |
| PR-B16e | ídem | si el `INSERT` del movimiento falla (llamando al adaptador con un `maestroId` inexistente: viola la llave foránea), la transacción se revierte: la inscripción no se crea (alta) o sigue ahí (baja), y no queda ninguna fila de movimiento |
| PR-B16f | ídem | Concurrencia (M-03, N-11): **5 rondas de 8 peticiones simultáneas** (4 altas y 4 bajas del mismo alumno, en orden aleatorio), empezando sin inscripción y dentro del pool de conexiones de las pruebas. Al final de cada ronda:<br>- la fila con la **`secuencia` más alta** coincide con el estado final (alta ⇔ inscrito);<br>- ordenadas por `secuencia`, las filas alternan alta y baja, empezando por alta;<br>- altas − bajas ∈ {0, 1};<br>- ninguna petición responde 5xx.<br>Un `P2028` activa PA-07. |
| PR-B16g | ídem | ninguna ruta de `printRoutes` contiene "movimiento", y ninguna respuesta de las rutas de b contiene el id ni la `secuencia` de una fila de `movimientos_inscripcion` |
| PR-B16h | ídem | el módulo `adapters/db/index` no exporta ninguna función cuyo nombre contenga "movimiento" (no hay lectura) |
| PR-B17 | `frontend/src/features/clases/inicio-estudiante-view.test.tsx` (extendido) | "Unirme a la clase" (N-04): `CODIGO_INVALIDO` y un `VALIDACION` de `codigo` van bajo el campo; un 500 y "sin conexión" avisan con toast, sin `aria-invalid` en el campo del código |

**Pruebas normales nuevas de las correcciones de b** (Enmienda 5; casos con el hallazgo en el título, sin ID PR propio):

| Caso | Archivo | Comportamiento |
|---|---|---|
| T-20 | `backend/test/alumnos.integracion.test.ts` | la longitud de `q` se mide sobre el normalizado: hangul (`각`, `가나`), `"abc"` más 118 espacios, 121 caracteres y `"ab"`, con la respuesta que corresponde a cada uno |
| T-20 | `backend/src/core/clases/busqueda.test.ts` | el criterio de longitud sobre el término normalizado en `core/` |
| Equivalencia | ídem | `normalizarTerminoDeBusqueda` de `shared/` y `normalizarParaBusqueda` de `core/auth/normalizacion.ts` dan lo mismo con 7 muestras (acentos, espacios, hangul, emoji y dígrafos) |
| D-4 | `frontend/src/features/clases/alumnos-view.test.tsx` | agregar con `yaEstaba: true` avisa con un toast neutro, sin éxito ni error |
| T-22 | ídem | si la consulta nueva del roster falla después de quitar, el foco va al `h2` del panel; nunca a `<body>` |
| T-23 | ídem | si otra pestaña quitó la fila antes del `onSuccess`, el foco no queda en `<body>` |
| T-24 | ídem | con un término de más de 120 normalizados, el campo lleva `aria-invalid` y `ErrorDeCampo` "La búsqueda no puede tener más de 120 caracteres", y no se hace la petición |
| T-24 | `frontend/src/features/clases/lib.test.ts` (extendido) | `terminoDeBusquedaValido` y `terminoDeBusquedaMuyLargo` siguen a `estadoDeTerminoDeBusqueda` |
| T-25 y T-26 | `alumnos-view.test.tsx` y `personas-view.test.tsx` (ronda 4) | los casos que agregue la ronda 4 para el foco de "Agregar a la clase" y de "Ver más alumnos" |

### CLASES-c
| ID | Archivo | Comportamiento |
|---|---|---|
| PR-C01a | `backend/src/core/eventos/avisos-de-clase.test.ts` | `colaDePublicacion` por tipo |
| PR-C01b | ídem | los esquemas rechazan campos de texto extra |
| PR-C02a | `backend/test/muro.integracion.test.ts` | crear anuncio y material → 201 |
| PR-C02b | ídem | material sin título → 400 |
| PR-C02c | ídem | un `INSERT` directo que viole `publicaciones_titulo_segun_tipo` falla |
| PR-C02d | ídem | queda exactamente un trabajo en la cola que corresponde, con `id = publicacionId` y solo ids en sus datos |
| PR-C02e | ídem | con un `alGuardar` doble que lanza (llamando al adaptador), no quedan ni la publicación ni el trabajo |
| PR-C03a | ídem | el muro sale en orden descendente |
| PR-C03b | ídem | el recorrido recursivo del muro no encuentra `estadoPago` ni `email` |
| PR-C03c | ídem | el muro pagina con cursor |
| PR-C03d | ídem | cada publicación trae el conteo correcto de comentarios |
| PR-C03e | ídem | cada publicación trae el nombre de su autor |
| PR-C04a | ídem | comentan el alumno inscrito y el maestro (201) y se encola `COMENTARIO_CREADO` con `id = comentarioId` |
| PR-C04b | ídem | comentar una publicación de otra clase con el `claseId` propio → 404 sin escribir ni encolar |
| PR-C04c | ídem | la lista de comentarios es ascendente y paginada, con `propio` correcto |
| PR-C04d | ídem | Comentar mientras otra transacción de la prueba borra la publicación:<br>- la transacción que borra es `obtenerDb().$transaction`, con `timeout: 15_000` explícito;<br>- la prueba confirma en cuanto `pg_stat_activity` muestra la espera del comentario (`wait_event_type = 'Lock'` y un `query` que contiene `FOR SHARE`), sin tiempos fijos;<br>- el comentario responde `404`, nunca `500`, y no queda ninguno.<br>Si aun así aparece un `P2028`, PA-07. |
| PR-C05a | ídem | borrar una publicación → 204, y sus comentarios desaparecen |
| PR-C05b | ídem | borrar una de otra clase → 404 |
| PR-C05c | ídem | un estudiante que borra → 403 |
| PR-C06a | ídem | el maestro borra cualquier comentario de su clase |
| PR-C06b | ídem | el alumno borra el suyo por "mis comentarios" |
| PR-C06c | ídem | con el comentario de otro, "mis comentarios" → 404 y el comentario sigue |
| PR-C07 | ídem | `describirCola` de las tres colas: `retryLimit` 3, backoff, `deadLetter` `AVISO_FALLIDO` y retención de 7 días; `AVISO_FALLIDO` existe |
| PR-C08a a PR-C08h | `backend/test/muro-autorizacion.integracion.test.ts` | la matriz de PR-A15a a PR-A15h, para cada ruta de c (un ID por fila de la matriz) |
| PR-C09a | `frontend/src/features/clases/formulario-publicacion.test.tsx` | el grupo de tipo usa `aria-pressed` |
| PR-C09f | ídem | con "Material", el formulario pide el título |
| PR-C09b | ídem | publicar limpia el formulario y avisa |
| PR-C09c | ídem | el botón dice "Publicar anuncio" o "Publicar material" según el tipo |
| PR-C09d | `frontend/src/features/clases/muro-view.test.tsx` | un solo `primary` en la vista del maestro y ninguno en la del estudiante |
| PR-C09e | ídem | los vacíos por rol |
| PR-C10a | `frontend/src/features/clases/publicacion-del-muro.test.tsx` | un `<script>` o un `<img onerror>` en el texto se muestran como texto, sin nodos nuevos |
| PR-C10b | ídem | la insignia de tipo lleva texto |
| PR-C10c | ídem | "Ver comentarios" con `aria-expanded` pide los comentarios solo al abrirse |
| PR-C10d | ídem | "Borrar" aparece en los comentarios propios del alumno y en todos para el maestro, con confirmación en línea |
| PR-C11a | `frontend/src/features/clases/inicio-estudiante-view.test.tsx` (extendido) | con teclado, "Ver más clases" desaparece al cargar la última página y el foco va a la primera tarjeta nueva o al encabezado "Mis clases"; nunca a `<body>` (Enmienda 5) |
| PR-C11b | `frontend/src/features/clases/muro-view.test.tsx` | ídem con "Ver más publicaciones" (primera publicación nueva o encabezado de la lista) |
| PR-C11c | `frontend/src/features/clases/publicacion-del-muro.test.tsx` | ídem con "Ver más comentarios" (primer comentario nuevo o encabezado de los comentarios) |
| PR-C12a | `backend/src/core/clases/texto.test.ts` (extendido) | `contarCaracteresVisibles`: `"ab"` → 2; `"a b"` → 2; `"\u{1F44D}"` → 1; `"\u2764\uFE0F"` → 1; `"\u{1F44D}\u{1F3FD}"` → 2; `"\u{1F1F2}\u{1F1FD}"` → 2; `"\u{1F469}\u200D\u{1F4BB}"` → 2; `"数学"` → 2. Y 0 con `"\u200B\u2060\uFEFF\u00AD"`, `"\u3164\u115F"`, `"\u2800"`, `"\u{1D159}"`, `"\u0301"` y `" \u3000\u00A0"` |
| PR-C12b | ídem | `nombreClaseSchema` rechaza, con "El nombre debe tener al menos 2 caracteres": `"\u200B\u200B"`, `"\u2060\uFEFF\u2060"`, `"a\u200B"`, `"\u3164\u3164"`, `"\u2800\u2800"` y `"\u{1F44D}"` |
| PR-C12c | ídem | `nombreClaseSchema` acepta `"\u{1F469}\u200D\u{1F4BB} Programación"`, `"\u2764\uFE0F\u2764\uFE0F"`, `"\u{1F44D}\u{1F3FD}"`, `"\u{1F1F2}\u{1F1FD} Historia"`, `"\u{1F3F4}\u{E0067}\u{E0062}\u{E0073}\u{E0063}\u{E0074}\u{E007F} Escocia"`, `"数学"`, `"می\u200Cخواهم"` y `"Mate\u200Bmáticas"` (un `Cf` en medio se admite y no cuenta) |
| PR-C12d | ídem | Orden: primero `normalizarTextoLargo`, después el esquema. `"\r\n\u200B\r\n"` no pasa `textoConContenidoSchema(1000, m)`, con el mensaje `m` (contenido visible, no carácter de control); `"\r\n\u{1F44D}\r\n"` pasa como `"\u{1F44D}"`; `"\u200D"` no pasa; `"\u{1F469}\u200D\u{1F4BB}"` sí |
| PR-C12e | `backend/test/muro.integracion.test.ts` | Sin contenido visible (`"\u200B\u2060"`, `"\u3164"` o solo espacios y saltos), cada texto obligatorio responde `400 VALIDACION`: el anuncio, "texto: Escribe el anuncio"; el título del material, "titulo: Escribe el título del material"; el comentario, "texto: Escribe tu comentario". Ninguno escribe filas ni encola trabajos. Un `POST` de anuncio sin el campo `texto` responde "texto: Escribe el anuncio" (no el mensaje de zod por defecto). Un comentario `"\u{1F44D}"` → 201 |
| PR-C12f | `backend/test/clases.integracion.test.ts` (extendido) | `POST /clases` y `PUT /clases/:claseId` con `"\u200B\u2060"` o `"\u{1F44D}"` → `400 VALIDACION` "nombre: El nombre debe tener al menos 2 caracteres", sin crear ni cambiar filas; `"\u{1F469}\u200D\u{1F4BB} Programación"` → 201 |
| PR-C12g | `frontend/src/features/clases/components/formulario-clase.test.tsx` (extendido) | `"\u200B\u200B"` en "Nombre de la clase" muestra `ErrorDeCampo` "El nombre debe tener al menos 2 caracteres" y no llama a la API |
| PR-C12h | `frontend/src/features/clases/formulario-publicacion.test.tsx` | un anuncio, o el título de un material, hechos solo de caracteres invisibles muestran su `ErrorDeCampo` y no llaman a la API |
| PR-C12i | `frontend/src/features/clases/publicacion-del-muro.test.tsx` | un comentario hecho solo de caracteres invisibles muestra `ErrorDeCampo` "Escribe tu comentario" y no llama a la API |
| PR-C13a | `frontend/src/features/clases/alumnos-view.test.tsx` (extendido) | Con el `POST` de agregar en vuelo, la persona escribe otro término y la fila desaparece. Al responder, sale "Agregaste a \<nombre\>" (con `yaEstaba: true`, el aviso neutro) aunque la fila ya no exista |
| PR-C13b | ídem | Sin desmontar la fila, cada aviso de agregar (éxito, neutro y error) sale exactamente una vez |
| PR-C13c | `frontend/src/features/clases/lib.test.ts` (extendido) | `focoPerdido` con un documento doble: `activeElement` nulo, igual a `body` o desconectado → `true`; un elemento conectado → `false` |
| PR-C13d | `frontend/src/features/clases/con-clase-de-la-ruta.test.tsx` | Sin `:claseId` en la ruta, `ConClaseDeLaRuta` muestra `MensajeError` "No tienes acceso a esta clase." y no llama a su hijo ni a `fetch`. Con el parámetro, pasa el id tal cual |
| PR-C03f | `backend/test/muro.integracion.test.ts` | T-29, publicaciones: un cursor borrado → `400 VALIDACION` "cursor: no es válido"; un cursor de otra clase responde idéntico a un UUID inexistente; un cursor válido sigue paginando |
| PR-C04e | ídem | T-29, comentarios: lo mismo con el cursor de un comentario (borrado, de otra publicación, UUID inexistente y válido). Con una publicación de otra clase, `404 PUBLICACION_NO_ENCONTRADA` aunque haya cursor |
| PR-C14a | `frontend/src/features/clases/formulario-publicacion.test.tsx` | T-30: el aviso de crear una publicación (éxito y error de red o `500`) sale exactamente una vez, con el formulario montado y desmontado. Un error de campo se muestra bajo su campo, sin toast |
| PR-C14b | `frontend/src/features/clases/publicacion-del-muro.test.tsx` | T-30: lo mismo con el aviso de comentar, también con los comentarios cerrados antes de la respuesta |
| PR-C15a | `backend/src/core/clases/texto.test.ts` (extendido) | T-31: `normalizarTextoLargo` de `core/clases/texto.ts` es la misma función que la de `@campus/shared`, y da lo mismo con CRLF, CR y extremos en blanco |
| PR-C15b | `frontend/src/features/clases/formulario-publicacion.test.tsx` | T-31: el formulario normaliza antes de validar. Un anuncio de 5,000 caracteres seguidos de `\r\n` se envía ya normalizado; uno de 5,001 sin saltos se rechaza en el formulario con el mensaje del servidor |
| PR-C15c | `frontend/src/features/clases/publicacion-del-muro.test.tsx` | T-31: lo mismo con el comentario (1,000 más un salto se envía normalizado; 1,001 se rechaza) |
| PR-C16 | `backend/test/muro.integracion.test.ts` | T-33: sin `tipo` y con `tipo: "tarea"` → "tipo: Elige si es un anuncio o un material"; un material con `texto: 5` o `texto: null` → "texto: La descripción debe ser texto"; ningún mensaje en inglés |
| PR-C17 | `frontend/src/features/clases/muro-view.test.tsx`, `frontend/src/features/clases/publicacion-del-muro.test.tsx` y `frontend/src/features/clases/lib.test.ts` (excepción aceptada a M-02, N-C8: un caso por archivo) | T-34. **Muro:** tras el `400` del cursor en "Ver más publicaciones", se muestra el texto que dice qué pasó y el foco va al encabezado. **Comentarios:** lo mismo en "Ver más comentarios", y el foco no cae en `<body>`. **`lib.ts`:** un `VALIDACION` del campo `cursor` da el texto dado, y cualquier otro error sigue el camino de siempre |
| PR-C18 | `frontend/src/features/clases/muro-view.test.tsx` | T-35, dos casos. Con el muro en error por el `400` del cursor, pulsar "Muro" vuelve a pedir la primera página y la lista reaparece, con el foco en "Muro". Con el muro sano, pulsar "Muro" no vuelve a pedir nada |

El cambio de `DESIGN.md` §7.14 (§D-C5 bis, punto 4) no lleva ID: es documentación y lo verifica el manager en la revisión final.

En el código de las pruebas, toda cadena con caracteres invisibles o de formato (de PR-C12a a PR-C12i) se escribe con escapes (`\u200B`, `\u2060`, `\uFEFF`, `\u3164`, `\u200D`…), nunca tal cual. En esta tabla también van como escapes (el orquestador los restituyó; Enmienda 9).
Enmienda 8: los IDs PR-C03f a PR-C16 van en archivos que ya están en la lista cerrada de c; no hace falta ningún archivo nuevo. Los casos del tester de T-29 a T-31 y de T-33 deben pasar sin tocarlos; el de T-32 lo reescribe el tester (C-20).

### CLASES-d
| ID | Archivo | Comportamiento |
|---|---|---|
| PR-D01a | `backend/src/core/archivos/politica.test.ts` | tipo permitido con extensión coincidente; `foto.png` como `application/pdf` → error |
| PR-D01b | ídem | tamaño 0 y 25 MB + 1 → error; 25 MB exactos → ok |
| PR-D01c | ídem | un nombre con `/`, `\` o un carácter de control → error |
| PR-D01d | ídem | la clave `materiales/{claseId}/{archivoId}` no contiene el nombre |
| PR-D01e | ídem | `disposicionDeContenido` con acentos, comillas, `;` y saltos de línea da `filename*` en UTF-8 y una alternativa ASCII sin comillas ni saltos |
| PR-D01f | ídem | `esImagenConVistaPrevia("image/svg+xml") === false` |
| PR-D01g | ídem | `coincideConLoDeclarado` en sus tres resultados |
| PR-D02a | `backend/src/config/env.test.ts` (modificado) | las tres variables `STORAGE_*` van todas o ninguna |
| PR-D02b | ídem | `production` las exige |
| PR-D02c | ídem | los mensajes no llevan valores |
| PR-D02d | `backend/src/config/almacen.test.ts` | `http` → `useSSL: false` con su puerto; `https` → `true` y el puerto 443 |
| PR-D03a | `backend/src/adapters/storage/index.test.ts` | con un endpoint inalcanzable (`http://127.0.0.1:9`), la URL de subida se firma sin red y lleva `X-Amz-Expires=300` |
| PR-D03b | ídem | la URL de descarga lleva `response-content-disposition` |
| PR-D04a | `backend/test/archivos.integracion.test.ts` | solicitar: el dueño recibe 201, con la fila `pendiente` y la clave correcta |
| PR-D04b | ídem | un tipo o un tamaño inválidos → 400 sin escribir |
| PR-D04c | ídem | sin almacén (`almacen: null`) → `503 ALMACEN_NO_CONFIGURADO` |
| PR-D05a | ídem | publicar con adjuntos (almacén en memoria) confirma los archivos |
| PR-D05b | ídem | si falta el objeto → `400 ARCHIVO_NO_SUBIDO` y no se crea la publicación |
| PR-D05c | ídem | si el tamaño o el tipo son distintos → 400 |
| PR-D05d | ídem | un archivo de otra clase, de otro usuario, ya confirmado o de hace más de 24 h → 400 sin cambios |
| PR-D05e | ídem | 6 ids o ids repetidos → 400 |
| PR-D05f | ídem | un error forzado dentro de la transacción no deja archivos confirmados ni trabajos |
| PR-D06a | ídem | en el muro, `vistaPrevia` solo en las imágenes |
| PR-D06b | ídem | sin almacén, `vistaPrevia: null` y la lista sale igual |
| PR-D06c | ídem | el recorrido recursivo del muro no encuentra `clave_objeto`, `claveObjeto` ni `estadoPago` |
| PR-D07a | ídem | descarga: el miembro recibe 200 con `no-store` |
| PR-D07b | ídem | descarga de un archivo de otra clase con el `claseId` propio → 404 |
| PR-D07c | ídem | descarga de un pendiente → 404 |
| PR-D08a | ídem | borrar una publicación con adjuntos deja sus archivos `descartado` y sin contexto |
| PR-D08b | ídem | un `UPDATE` directo a `confirmado` sin publicación falla por el `CHECK` |
| PR-D08c | ídem | un `UPDATE` directo que pone `publicacion_id` a un `pendiente` falla por el `CHECK` |
| PR-D09a a PR-D09h | `backend/test/archivos-autorizacion.integracion.test.ts` | la matriz de PR-A15a a PR-A15h, para las dos rutas de d (un ID por fila) |
| PR-D09i | ídem | un restringido inscrito no obtiene ninguna URL |
| PR-D10a | `frontend/src/services/almacenService.test.ts` | `PUT` sin `Authorization`, con `credentials: "omit"` y con el `Content-Type` |
| PR-D10b | ídem | rechaza una URL `javascript:`, una relativa y una del origen de la API |
| PR-D10c | ídem | una respuesta que no es `ok` lanza |
| PR-D11a | `frontend/src/features/clases/formulario-publicacion.test.tsx` (extendido) | rechaza en cliente un tipo no permitido, con `ErrorDeCampo` |
| PR-D11b | ídem | rechaza un archivo de más de 25 MB |
| PR-D11c | ídem | rechaza un sexto archivo |
| PR-D11d | ídem | infiere el tipo por la extensión cuando `File.type` viene vacío |
| PR-D12a | ídem | el orden es solicitar, subir y publicar |
| PR-D12b | ídem | si falla la subida del segundo archivo, aparece el toast y no se llama a publicar |
| PR-D12c | ídem | el botón principal sigue en `enEspera` durante todo el proceso |
| PR-D13a | `frontend/src/features/clases/adjuntos-de-publicacion.test.tsx` | la imagen lleva `alt="Imagen adjunta: <nombre>"` |
| PR-D13b | ídem | con `onError`, la imagen pasa a la ficha |
| PR-D13c | ídem | "Descargar" pide la URL (`enEspera`) y llama a `window.location.assign` (doble) |
| PR-D14 | `frontend/src/lib/format.test.ts` (extendido) | `formatearTamano`: "820 KB" y "2.4 MB" |
| PR-D15 | `frontend/src/features/clases/lib.test.ts` (extendido) | `errorDeArchivoElegido` para tipo, tamaño y cantidad |

---

## Puntos de ataque para el Tester
Reglas de `tester.md`: sin selectores de clase y sin navegadores. Las `*.ataque` nuevas van en archivos nuevos con sufijo `-r<N>`.

### Ronda 0 (cada subentrega; no cuenta en el tope de 3)
1. **Precondiciones:**
   - el árbol está limpio dentro de los paquetes contra la base de la subentrega: `<R>` en a, `<Ca>` en b, `<Cb>` en c y `<Cc>` en d;
   - V-01 coincide con la tabla vigente:
     - en CLASES-a, la de AUTH-03c, ronda 2;
     - en CLASES-b, la del cierre de a (79 `*.ataque`, con C-16);
     - en **CLASES-c, la del cierre de b**: las 85 `*.ataque` (con C-16 y C-17), más las que agregue la regresión de la ronda 4 de b;
     - en d, la del cierre de c;
   - PA-01 antes de cualquier prueba del backend.
2. **Reescritura:** solo los casos que contradicen los C-n de la subentrega (§D-R0), conservando lo que protegen. Busca como mínimo:
   - `Hola,`, `heading` en `/estudiante` y `/maestro`, y `BienvenidaView` (a);
   - `printRoutes` y la lista exacta de rutas (a, b, c y d);
   - `NO_IMPLEMENTADO`, `pertenencia` y `:claseId` (a);
   - `consultaMe` y las listas cerradas de archivos de `services/` (a);
   - `enEspera=`, `vidrio`, `vidrio-fuerte`, `vidrio-azul`, `text-danger` y `text-destructive` (todas);
   - toda prueba estática que recorra el código (`import.meta.glob`, `readdirSync` o `?raw`) y cuente o liste archivos, clases, botones, tokens, colas, tablas, migraciones o SQL crudo: `styles/clases-r1`, `components/layout/estatico-r1`, `styles/tokens-r1`, `features/admin/cuentas-r1` y `backend/test/arquitectura-cuentas-r1`;
   - listas cerradas de tablas, secuencias, migraciones o modelos (b);
   - `OPCIONES_DE_COLAS`, `describirCola`, los nombres de cola y `$queryRaw` (c);
   - `U+200B`, `U+2060`, `U+FEFF`, `Cf`, `nombreClaseSchema`, `textoLargoSchema` y `descripcionClaseSchema` (c, C-18);
   - `vi.mock("./hooks"` y `vi.mock("../hooks"` con fábrica cerrada en las `*.ataque` que montan los inicios o `PanelMisClases` (c, C-19);
   - `validarEnv`, las variables de entorno y `construirApp(` (d).
   - **en d y en los encargos que sigan (Enmienda 7):** las listas cerradas de archivos, tablas, colas, rutas o SQL crudo se buscan también en las pruebas normales existentes, no solo en las `*.ataque`; por ejemplo, el caso E6 de `backend/test/bloqueo-usuario.integracion.test.ts`. El tester reporta cada una en su ronda 0, para que el plan la autorice antes de programar.

   **Casos fuera del inventario:** si encuentras un caso contradicho que el plan no lista, lo reescribes igual y **citas el C-n que lo contradice**. Si ningún C-n lo contradice, es un hallazgo: no lo reescribes y lo reportas.
3. **Reporte:** en `reporte-tester.md`, "CLASES-x — Ronda 0", el diff, la lista exacta de casos que quedan en rojo y la tabla de hashes de todas las `*.ataque`. Formatea solo los archivos que tocaste, desde su paquete.

### CLASES-a
1. **Pertenencia:**
   - un estudiante inscrito en la clase A pide la B;
   - un maestro pide una clase de otro maestro, en todas las rutas de propiedad;
   - un `claseId` en mayúsculas, con espacios o con un sufijo (`…/uuid%00`);
   - el mismo UUID en dos formatos;
   - el admin con un `claseId` real.
2. **Guarda:** rutas con `:claseId` y cadenas reordenadas, con el sexto paso en otra posición, con `:claseid` o `:clase_id`, o con un comodín.
3. **Código:**
   - 1,000 creaciones seguidas, sin repetidos ni confusables;
   - unirse con variantes Unicode;
   - dos `POST /clases/unirse` simultáneos del mismo alumno → una fila;
   - regenerar y unirse al mismo tiempo.
4. **Fugas:** `codigoInvitacion`, `estadoPago` o `email` de terceros en cualquier respuesta a un estudiante; `Cache-Control` en `/codigo`.
5. **Interfaz:**
   - cambiar de cuenta sin cerrar sesión;
   - un titular sin dato;
   - más de un `primary`;
   - el foco en las tarjetas de color y en el vacío;
   - el nombre de una clase con U+202E o con 120 caracteres sin espacios.

### CLASES-b
1. **Estado de pago y restricción** en cualquier respuesta de personas, candidatos, agregar, muro o detalle, incluso anidados: fuera de `GET …/alumnos`, ninguna los lleva.
2. **Correo enmascarado (P-05 f):**
   - el correo completo de un candidato en cualquier parte de la respuesta del buscador: otro campo, un mensaje de error, una cabecera, un `hayMas` o un candidato ya inscrito;
   - partes locales de 1, 2, 3 y 64 caracteres (con 1 y 2 no debe verse nunca la parte local completa); con `+`, puntos, mayúsculas, caracteres Unicode o emojis; dominios con subdominios;
   - que el enmascarado no se pueda revertir combinando búsquedas (los 2 primeros caracteres son todo lo que sale);
   - que el roster del dueño sí muestre el completo y el de otra clase no.
3. **`movimientos_inscripcion` (P-05 g, M-03):**
   - altas y bajas simultáneas, repetidas y cruzadas; que, ordenadas por `secuencia`, las filas nunca muestren dos altas seguidas ni una baja sin alta previa, y que la de `secuencia` más alta coincida siempre con el estado final;
   - que `creado_en` no se use para ordenar en ningún código (el orden es `secuencia`);
   - que un alta por código, un alta repetida o una baja de alguien no inscrito no escriban;
   - que una transacción fallida no deje fila ni inscripción huérfana;
   - que ninguna ruta, error o log exponga filas de la tabla.
4. **Buscador:** comodines, `\`, términos que al normalizarse quedan en menos de 3, 120 caracteres, emojis y el `limite` fuera de rango.
5. **Paginación:** homónimos en el borde de la página, un cursor de un alumno quitado o desactivado entre dos páginas, un cursor de otra clase, un cursor inexistente.
6. **Interfaz:** una petición por término, sin carreras; el foco en la confirmación; el nombre accesible por fila.

### CLASES-c
1. **Alcance de las consultas:** `publicacionId` o `comentarioId` de otra clase con el `claseId` propio, en todas las rutas; borrar el comentario de otro por "mis comentarios".
2. **Concurrencia:** comentar y borrar la publicación al mismo tiempo, en los dos órdenes; ningún `500` ni comentario huérfano.
3. **Cola:** transacción revertida sin trabajo; ids de trabajo repetidos; ningún texto ni correo en los datos del trabajo.
4. **Texto:** XSS en el título, el texto y el comentario; caracteres de control; 5,000 y 5,001 caracteres, medidos en puntos de código (T-32, Enmienda 8); saltos de línea `\r`; que el formulario y el servidor midan lo mismo después de normalizar (T-31).
5. **Interfaz:** doble envío de la publicación y de "Comentar"; los comentarios se piden solo al abrirse; las confirmaciones; el foco de los tres "Ver más" (publicaciones, comentarios y "Ver más clases") al desaparecer, que nunca queda en `<body>` (Enmienda 5).
6. **Contenido visible (Enmienda 6):**
   - nombres, títulos, anuncios y comentarios hechos solo de: `Cf` (U+200B, U+2060, U+FEFF, U+00AD, U+180E, U+2061 a U+2064, etiquetas), rellenos Hangul, Braille en blanco, marcas combinantes sueltas o espacios Unicode;
   - un nombre con uno solo de esos visibles;
   - que la regla no rompa emojis (ZWJ, VS16, tonos, banderas regionales y de subdivisiones, teclas) ni otros alfabetos (árabe, hebreo con marcas de dirección, persa con U+200C, devanagari, CJK);
   - que el frontend avise igual que el servidor;
   - que no haya una copia de la regla fuera de `shared/`.

   **No son hallazgo** (decisiones de §D-C4): un `Cf` en medio de un texto con contenido visible, un opcional sin contenido visible y un carácter que se ve vacío solo en algunas fuentes.
7. **Heredado de b (Enmienda 6; en la regresión, sin rondas propias):**
   - el aviso de agregar con la fila desmontada, y sin duplicados;
   - el foco de §7.14 igual que antes tras mover `focoPerdido`;
   - las cuatro vistas sin `claseId` en la ruta.

### CLASES-d
1. **Subida:**
   - la clave con `../` o con el nombre del usuario;
   - tipo y extensión cruzados;
   - `tamano` negativo, decimal o enorme;
   - confirmar ids de otro maestro, de otra clase, ya confirmados o viejos;
   - el mismo id dos veces.
2. **Descarga:** un `archivoId` de otra clase; uno pendiente; uno descartado; un restringido.
3. **URLs y cabeceras:** vigencia de 5 minutos; `response-content-disposition` con un nombre malicioso (comillas, CRLF, `;`); el `Authorization` nunca va al almacén.
4. **Secretos:** `STORAGE_SECRET_KEY` o una firma `X-Amz-Signature` en los logs (PA-10).

---

## Riesgos y desacuerdos
- **R-01 · Muro sin tareas.** RF-12 incluye las tareas en el muro. TAREAS tendrá que mezclarlas con las publicaciones (una consulta por unión y fecha, o `'tarea'` en `tipo_publicacion`).
- **R-02 · Avisos sin consumidor.** Los trabajos esperan hasta 7 días; después, el supervisor del worker los borra. NOTIFICACIONES decide si descarta al consumir los que tengan más de cierta antigüedad.
- **R-03 · Subida después de confirmar, y tamaño libre en la subida.** La URL de subida vale 5 minutos y no limita el tamaño (R2 no admite `POST` con política).
  - Mitigación: `statObject` impide confirmar un objeto que no coincide; la descarga fuerza el tipo declarado y `attachment` para lo que no es imagen; solo los maestros suben.
  - El objeto sobrante queda en el almacén hasta `LIMPIEZA_DIARIA`.
  - Riesgo residual aceptado por el manager.
- **R-04 · Contenido disfrazado.** Un HTML declarado como `image/png` se sirve como `image/png` en un `<img>`, que no ejecuta código. Sin SVG. El bucket es de otro origen. Riesgo residual aceptado por el manager.
- **R-05 · Pendientes sin límite ni limpieza.** Pendiente para antes de DEPLOY: "`LIMPIEZA_DIARIA` de archivos: borra **el objeto del almacén y la fila** de cada pendiente de más de 24 h y de cada descartado", además del límite de tasa global de DEPLOY.
- **R-06 · Buscador sin paginación completa.** Hasta 20 resultados (50 como máximo) y `hayMas`. Aceptado por el manager.
- **R-07 · Correos en el buscador.** Resuelto por la decisión del humano (P-05 f): el buscador expone como mucho 2 caracteres de la parte local, nunca todos, y el dominio. Un maestro puede saber que existe una cuenta `an***@colegio.mx` con cierto nombre; el correo completo solo lo ve de sus propios alumnos, en el roster.
- **R-08 · La regla de la guarda depende del nombre `claseId`.**
  - Toda ruta de este encargo cuelga de `/clases/:claseId`.
  - La guarda exige el sexto paso en toda ruta que declare `claseId` en cualquier posición y en todo comodín bajo `/clases`, y rechaza otro parámetro después de `/clases/` (§D-0.3, Enmienda 4). La convención queda en `middleware/README.md` y en §6.
  - **Hoy bloquea las rutas de clases del admin (N-01):** ADMIN agregará una excepción de la guarda, en `middleware/` y en carril sensible. Como sugerencia para su plan, un sexto paso propio del admin, marcado, que la regla acepte.
  - La guarda sobre todas las rutas (M-15), incluidos los comodines generales `/api/*` y `/api/:seccion/*`, sigue en CHORE-02.
- **R-09 · Cambio de nombres respecto de `ARCHITECTURE.md` §7 y §11.** No contradice ESSENTIALS.
  - `GET /clases` pasa a `inscritas` e `impartidas`.
  - El buscador sale de `usuarios` (`GET /usuarios/buscar?q=`) y va a `…/alumnos/candidatos`.
  - `POST /archivos/subida` y `POST /archivos/descarga` pasan a `POST /clases/{claseId}/archivos` y `POST /clases/{claseId}/archivos/{archivoId}/descarga`.
- **R-10 · ESSENTIALS, "Restricciones clave" de `archivos`:** resuelto por la decisión del humano; el orquestador aplica el texto propuesto.
- **R-11 · Titular del estudiante antes de TAREAS.** "Estás en 3 clases" no es "lo siguiente"; TAREAS lo cambia por "Tienes N entregas esta semana".
- **R-12 · Costo del sexto paso:** una consulta más por petición en las rutas de clase (PK).
- **R-13 · `Promise.all` de hasta 5 `statObject` al publicar:** decenas de milisegundos; E/S del almacén, no de la base.
- **R-14 · Tamaño del encargo con el programador a prueba.** Cuatro subentregas pequeñas, listas cerradas de pruebas por subentrega (PA-16), un ID por comportamiento y simulación de defectos solo sobre copias (PA-15).
- **R-15 · Tiempo de la suite del frontend:** si una prueba nueva pasa de 4 s en la suite completa, el programador lo reporta; no cambia `vitest.config.ts`.
- **R-16 · Prisma no escapa comodines en `contains`.** Lo hace `core/`, y PR-B04d lo prueba.
- **R-17 · El índice GIN sobre `usuarios`** bloquea sus escrituras mientras se crea; con miles de filas son milisegundos.
- **R-18 · `minio` y la red al firmar.** Con la región fija, minio-js no consulta la región del bucket. Si una versión futura lo hiciera, PR-D03a falla (PA-14).
- **R-19 · `consultaMe` compartida.** Aceptado por el humano y el manager (§D-A6).
- **R-20 · `LIKE` con `contains` y el plan genérico de PostgreSQL:** PR-B05 lo comprueba en un plan con parámetro.
- **R-21 · Llaves foráneas sin índice:** `publicaciones.autor_id`, `comentarios.autor_id`, `archivos.subido_por`, `archivos.clase_id` y las tres de `movimientos_inscripcion`. Hoy ninguna ruta borra usuarios ni clases, y ninguna consulta filtra por ellas. Si ADMIN introduce bajas físicas o la consulta de movimientos, propone los índices.
- **R-22 · Paginación con una consulta extra.**
  - Con cursor, el roster y personas hacen una lectura por PK de `usuarios`.
  - Desde la Enmienda 4, `inscritas` e `impartidas` hacen una lectura por PK de `inscripciones` o de `clases` (§D-A4). Su residual (una página vacía si la fila se borra en medio) lo aceptó el manager.
  - Si Prisma no admite el orden por relación del roster, PA-17.
- **R-23 · `movimientos_inscripcion` con `ON DELETE RESTRICT`:** un borrado físico futuro de una clase o de un usuario con movimientos fallará. Es deliberado (el registro no desaparece en silencio); lo decide ADMIN si llega a haber bajas físicas. Las pruebas borran los movimientos y las clases antes que los usuarios (N-10).
- **R-24 · El registro no lleva a quien actúa si no es el maestro:** hoy solo el maestro dueño agrega y quita. Si ADMIN deja que el admin lo haga, decide si registra ahí y con qué columna (S-23).
- **R-25 · Huecos en `secuencia`:** una transacción revertida consume un valor de la secuencia sin dejar fila. El registro no necesita valores contiguos, solo ordenados; ADMIN no debe interpretar un hueco como un movimiento perdido.
- **R-26 · Desviación de proceso en CLASES-a (PA-09), registrada sin escalar.**
  - Qué pasó: en la implementación de a, el camino elegido para el reintento del código pedía tocar `backend/src/adapters/db/errores.ts`, que está en "No se toca" (PA-09). En lugar de detenerse, el programador editó el archivo, lo revirtió y siguió por otra vía.
  - Estado final: cumple §D-A2. El reintento usa `traducirErrorPrisma` con `alDuplicar`, sin tocar `errores.ts`.
  - El manager lo arbitró como desviación registrada.
  - En la ronda 4, ante T-18, el programador sí se detuvo y preguntó.
  - Para b, c y d rige la regla de siempre: cuando una parada se cumple, el programador se detiene y reporta, aunque la alternativa parezca obvia o inofensiva.
- **R-27 · Intermitencia preexistente de la suite del backend por `LOCK TABLE usuarios`.** Es la espera en cadena entre `cuentas-r1.ataque:130` y las filas retenidas de `cuentas-r3` y `bloqueo-usuario`. No la causa CLASES. Está anotada en `docs/ESTADO.md` §3, con destino CHORE-02, y volvió a aparecer en la primera corrida del manager en el cierre de a.
  - **Desde b (Enmienda 5):** PR-B05 retiene `usuarios` unos 5 s mientras siembra 40,000 filas y corre `ANALYZE`. No forma el ciclo, pero alarga la ventana en que la cola se forma.
  - Candidatos para CHORE-02, por medir: correrlo en un grupo secuencial con los archivos que retienen bloqueos, o sembrar con un `nombre_busqueda` constante y corto.
  - No se cambia en CLASES.

### Textos literales propuestos para documentos (los aplica el orquestador al cerrar cada subentrega, con autorización del humano)

**`docs/ARCHITECTURE.md` §6, tabla de la cadena, fila 6 (CLASES-a).** Reemplaza la fila por:
> | 6 | `requireMembership` / `requireOwnership` sobre el parámetro `:claseId` de la ruta. `requireMembership` deja pasar al estudiante inscrito y al maestro dueño; `requireOwnership`, solo al maestro dueño. Clase inexistente o ajena: la misma respuesta. El administrador no pasa por ninguna de las dos: sus rutas de clases viven bajo `/admin` | 403 `SIN_ACCESO_A_LA_CLASE` (400 `VALIDACION` si `:claseId` no es un UUID) |

Y agrega las viñetas, después de "Rol, restricción y banderas…" (la primera, con la regla de la Enmienda 4):
> - Toda ruta bajo `/api` que declare el parámetro `claseId` en cualquier posición de su URL, y todo comodín bajo `/clases` (`/clases*` y `/clases/*`, a cualquier profundidad), lleva el sexto paso; bajo `/clases/`, el único parámetro permitido en el segmento siguiente es `:claseId`. La guarda `onRoute` no deja arrancar la API si falta. El paso deja la clase y la relación del usuario con ella en la petición (`claseDe(request)`). Las consultas por un recurso de la clase (publicación, comentario, archivo) filtran además por el `claseId` de la ruta (CLASES-a). Los comodines generales (`/api/*`, `/api/:seccion/*`) quedan para la guarda sobre todas las rutas (CHORE-02).
> - Las rutas de clases del administrador (`/admin/clases/{claseId}…`, encargo ADMIN) no pasan esta regla tal como está: ADMIN agrega a la guarda una excepción, en carril sensible (CLASES-a, N-01).

**`docs/ARCHITECTURE.md` §7, filas `usuarios`, `clases` y `archivos`.** Las reemplaza por (CLASES-a; la fila `clases` se completa en b y c, y `archivos` en d). Al cerrar c, la fila `clases` se reemplaza completa por la de abajo, sin la frase "Publicaciones y comentarios llegan con CLASES-c" (Enmienda 9):
> | `usuarios` | `GET /me` · `GET /me/estado-pago` |
> | `clases` | `POST /clases` · `GET /clases/inscritas` (estudiante) · `GET /clases/impartidas` (maestro) · `POST /clases/unirse` · `GET/PUT /clases/{claseId}` · `GET/POST /clases/{claseId}/codigo` (ver y regenerar) · `GET /clases/{claseId}/personas` · `GET/POST /clases/{claseId}/alumnos` · `GET /clases/{claseId}/alumnos/candidatos?q=` (correo enmascarado) · `DELETE /clases/{claseId}/alumnos/{alumnoId}` · `GET/POST /clases/{claseId}/publicaciones` · `DELETE /clases/{claseId}/publicaciones/{publicacionId}` · `GET/POST /clases/{claseId}/publicaciones/{publicacionId}/comentarios` · `DELETE /clases/{claseId}/publicaciones/{publicacionId}/comentarios/{comentarioId}` (maestro) · `DELETE /clases/{claseId}/mis-comentarios/{comentarioId}` (autor) |
> | `archivos` | `POST /clases/{claseId}/archivos` (registra un archivo `pendiente` y devuelve la URL prefirmada de subida) · `POST /clases/{claseId}/archivos/{archivoId}/descarga` (URL prefirmada de descarga). Sustituyen a `POST /archivos/subida` y `POST /archivos/descarga`. TAREAS y ENTREGAS agregan sus contextos |

**`docs/ARCHITECTURE.md` §7, como párrafo propio después del que contiene "Formato de error único…" y "Detrás del proxy de Cloudflare…" (CLASES-c; Enmienda 6, versión final de la Enmienda 9 con T-31 y T-32).** Agrega:
> Textos que escribe el usuario: todo nombre, título o texto obligatorio exige contenido visible, es decir, un mínimo de puntos de código de letra, número, puntuación o símbolo que no sean ignorables por defecto (2 en el nombre de una clase; 1 en el título de un material, un anuncio o un comentario). Se cuentan con `contarCaracteresVisibles`, de `shared/src/clases.ts`; `shared/src/auth.ts` tiene una copia equivalente para los nombres de persona hasta que se unifiquen. Los caracteres de formato (`Cf`) no se rechazan, salvo los inversores de dirección, pero no cuentan: así un emoji compuesto o un texto en otro alfabeto pasan, y uno hecho solo de invisibles no. Los textos largos se normalizan antes de validarse, en el servidor y en los formularios, con `normalizarTextoLargo` (también de `shared/src/clases.ts`: CRLF y CR pasan a LF y se recortan los extremos). Los máximos se miden aparte, después de normalizar y en puntos de código, no en unidades de UTF-16. Los nombres de persona siguen su propia regla, más estricta (`shared/src/auth.ts` rechaza todo `Cf`).

**`docs/ARCHITECTURE.md` §8 (CLASES-c).** Agrega, después de la tabla de eventos:
> - `PUBLICACION_CREADA`, `MATERIAL_CREADO` y `COMENTARIO_CREADO` se encolan desde CLASES en la misma transacción que el dato, con el id del dato (generado en el handler antes del `INSERT`) como id del trabajo y solo ids en sus datos. Sus colas tienen 3 reintentos con espera exponencial, la cola de fallidos `AVISO_FALLIDO` y una retención de 7 días. Su consumidor llega con NOTIFICACIONES; hasta entonces los trabajos esperan en la cola. Un trabajo puede apuntar a una publicación o un comentario ya borrados: el consumidor lo descarta sin error.

**`docs/ARCHITECTURE.md` §11 (CLASES-d).** En el paso 1, cambia "`POST /archivos/subida`" por "`POST /clases/{claseId}/archivos`". Agrega, después del paso 5:
> 6. Materiales y anuncios (CLASES-d): solo sube el maestro dueño de la clase. Límites: 25 MB por archivo y 5 por publicación; tipos PDF, PNG, JPEG, WebP, GIF, Word, Excel y PowerPoint (formatos actuales y 97-2003) y texto plano; el SVG no se admite. La clave es `materiales/{claseId}/{archivoId}` y nunca lleva el nombre del archivo. Al publicar, la API compara con `statObject` el tamaño y el tipo reales con lo declarado, antes de confirmar dentro de la transacción de la publicación. La URL de subida no limita el tamaño (R2 no admite `POST` con política): un objeto que no coincide no se confirma y queda para la limpieza. Un archivo pasa a `descartado` si se borra su publicación. La descarga fuerza el tipo declarado y `attachment`; las imágenes se muestran en vista previa con una URL `inline` de 5 minutos. El firmado es local (región fija en `STORAGE_REGION`); el bucket se elige con `STORAGE_BUCKET_PRIVADO`.
> 7. `LIMPIEZA_DIARIA`, que se construye antes de DEPLOY, borra el objeto del almacén y la fila de cada `pendiente` de más de 24 h y de cada `descartado`.

**`docs/ARCHITECTURE.md` §14 (a, b, c y d; cada fila al cerrar su subentrega).** En el diagrama, agrega `clases ||--o{ movimientos_inscripcion : registra` y `usuarios ||--o{ movimientos_inscripcion : afecta` (b). En la tabla, reemplaza o agrega:
> | `usuarios` | … (sin cambios en columnas) | … · índice GIN `gin_trgm_ops` sobre `nombre_busqueda` (`usuarios_nombre_busqueda_idx`), que se normaliza en `core/` al escribir (sin acentos, minúsculas, espacios colapsados); `unaccent` no se usa en las consultas |
> | `clases` | `id`, `maestro_id`, `nombre`, `descripcion`, `codigo_invitacion`, `activa` | `codigo_invitacion` único (7 caracteres de un alfabeto sin I, O, 0 ni 1) · índice `(maestro_id, creado_en DESC, id DESC)` · FK a `usuarios` con `ON DELETE RESTRICT` |
> | `inscripciones` | `clase_id`, `usuario_id`, `origen` (`codigo` / `manual`), `creado_en` | PK `(clase_id, usuario_id)` · índice `(usuario_id, creado_en DESC, clase_id DESC)` · FK con `ON DELETE CASCADE` a los dos lados |
> | `movimientos_inscripcion` | `id`, `secuencia`, `clase_id`, `alumno_id`, `maestro_id`, `tipo` (`alta` / `baja`), `creado_en` | Registro de cada alta manual y cada baja efectivas, escrito en la misma transacción que la inscripción, como su último paso; unirse con código no se registra. **El orden es `secuencia`** (`BIGSERIAL`, asignada en el `INSERT`: respeta el orden real de los cambios, sin empates; puede tener huecos). `creado_en` es la fecha para mostrar, no el orden (es la hora de inicio de la transacción). FK a `clases` y a `usuarios` con `ON DELETE RESTRICT`. Sin índices secundarios: CLASES solo escribe; la consulta y sus índices los agrega ADMIN |
> | `publicaciones` | `id`, `clase_id`, `autor_id`, `tipo` (`anuncio` / `material`), `titulo`, `texto` | índice `(clase_id, creado_en DESC, id DESC)` · `CHECK`: el material lleva título y el anuncio no |
> | `comentarios` | `id`, `publicacion_id`, `autor_id`, `texto` | índice `(publicacion_id, creado_en, id)`. Hoy solo el contexto `publicacion_id` (NOT NULL); ENTREGAS agrega `entrega_id` y el `CHECK` de exactamente un contexto. Al comentar, la publicación se lee `FOR SHARE` en la misma transacción |
> | `archivos` | `id`, `clave_objeto`, `nombre`, `tipo`, `tamano`, `subido_por`, `estado` (`pendiente` / `confirmado` / `descartado`), `clase_id`, `publicacion_id` | `clave_objeto` único · índice `(publicacion_id)` · `CHECK`: un archivo está `confirmado` si y solo si tiene contexto; `pendiente` y `descartado`, ninguno. `clase_id` autoriza mientras el archivo está pendiente. TAREAS y ENTREGAS agregan `tarea_id` y `entrega_id` |

Y en "Reglas de acceso a datos", reemplaza la viñeta de la búsqueda por (texto ajustado en la Enmienda 5):
> - Búsqueda de alumnos: `LIKE '%término%'` sobre `nombre_busqueda`, con `%`, `_` y `\` escapados; índice GIN `gin_trgm_ops`. El término mide de 3 a 120 caracteres **ya normalizados** (con un tope de 1000 en crudo); la normalización está definida una sola vez en `shared/` (`normalizarTerminoDeBusqueda`) y equivale a la que aplica `core/` a `nombre_busqueda` al escribir. Hasta 20 resultados con indicador de "hay más". El correo de cada resultado sale enmascarado desde el backend (`core/`); el completo solo en el roster del dueño. Frontend: espera de 300 ms.

Y agrega en "Reglas de acceso a datos" (c; Enmienda 9, autorizada por el humano). Las filas `publicaciones` y `comentarios` de la tabla de §14 van sin cambio, y el diagrama ya tiene sus relaciones:
> - **Paginación por cursor:** el cursor es el id de la última fila de la página anterior. Con cursor, la consulta lee primero esa fila por su llave, filtrada por el dueño de la lista (el alumno, el maestro, la clase o la publicación). Si no existe (se borró, es ajena o nunca existió), responde `400 VALIDACION` "cursor: no es válido", igual en los tres casos, sin revelar cuál es. La interfaz lo explica con un texto que dice qué pasó y cómo recuperar la lista (CLASES-a, T-18; CLASES-c, T-29 y T-34).

**Sin cambios en c** (Enmienda 9): `docs/ARCHITECTURE-ESSENTIALS.md`, `CLAUDE.md`, `docs/PRD.md` y `README.md`.

**`docs/ARCHITECTURE-ESSENTIALS.md`.**
- "Tablas" (b): agrega `movimientos_inscripcion` después de `inscripciones`.
- "Reglas de datos" (b): reemplaza "Búsqueda de alumnos: `unaccent` + trigramas sobre `nombre_busqueda`. Frontend: mínimo 3 caracteres, espera de 300 ms." por (texto ajustado en la Enmienda 5):
  > - Búsqueda de alumnos: `nombre_busqueda` se normaliza en `core/` al escribir (sin acentos, minúsculas, espacios colapsados) y se busca con `LIKE` y el índice GIN de trigramas sobre esa columna; el término pasa por la misma normalización, definida una sola vez en `shared/`, y escapa los comodines. Mide de 3 a 120 caracteres ya normalizados, con un tope de 1000 en crudo. `unaccent` no se usa en las consultas. Frontend: espera de 300 ms.
- "Restricciones clave" (d): reemplaza "`comentarios` y `archivos` con exactamente un contexto" por:
  > `comentarios` con exactamente un contexto · `archivos`: confirmado si y solo si tiene exactamente un contexto (los `pendiente` y `descartado`, ninguno; `clase_id` autoriza mientras tanto)
- "Autorización" (a): agrega:
  > - `requireMembership`: estudiante inscrito o maestro dueño; `requireOwnership`: solo el maestro dueño; siempre sobre `:claseId`, con la misma respuesta para una clase inexistente y una ajena. El admin no pasa por rutas de clase fuera de `/admin`, y sus rutas de clases necesitan una excepción de la guarda (ADMIN).
- "Archivos" (d): agrega:
  > - Materiales y anuncios: 25 MB por archivo, 5 por publicación; PDF, imágenes (sin SVG), Office y texto plano. La confirmación compara el objeto real con lo declarado. Vista previa solo de imágenes. La limpieza borra también el objeto de los pendientes vencidos y de los descartados.
- "Reglas de negocio que tocan código" (a y b): agrega:
  > - Código de clase: 7 caracteres sin I, O, 0 ni 1; se escribe sin distinguir mayúsculas y admite como separadores los espacios y guiones de una lista cerrada; regenerarlo invalida el anterior sin afectar a los inscritos. Unirse es idempotente.
  > - Alta manual (b): el buscador del maestro muestra el nombre y el correo enmascarado (hasta 2 caracteres de la parte local y nunca todos, `***` y el dominio), enmascarado en el backend; el correo completo solo en el roster, de alumnos ya inscritos en su clase. Cada alta manual y cada baja efectivas se registran en `movimientos_inscripcion` en la misma transacción, ordenadas por `secuencia`; la consulta es de ADMIN.

**`CLAUDE.md`.**
- Tabla "Módulos":
  - fila `auth` (a): quita "bienvenida post-login (provisional hasta los dashboards)";
  - fila `clases`: "Inicio de estudiante y maestro, muro con comentarios y adjuntos, crear/editar clase, código de invitación, compañeros, roster, buscador y alta manual de alumnos".
- "Ubicaciones compartidas":
  - (b) la viñeta de `components/` pasa a decir que ya existen `EstadoPagoBadge` (`estado-pago-badge.tsx`) y `AccesoRestringidoBadge` (`acceso-restringido-badge.tsx`);
  - (a y d) `lib/format.ts` suma `formatearFechaLarga` y `formatearTamano`;
  - (a) viñeta nueva: "`services/sesionService.ts` — la consulta de `/me` (`consultaMe`), compartida por `features/auth` y `features/clases`";
  - (d) viñeta nueva: "`services/almacenService.ts` — sube un archivo al almacén con la URL prefirmada que dio la API (`PUT`, sin `Authorization` ni credenciales). Es el único `fetch` fuera de `apiClient`".

**`docs/PRD.md`.**
- §7, "Patrones a conservar" (a): reemplaza "barra lateral con lista de clases" por:
  > tarjetas de "Mis clases" en el inicio de cada rol (la barra lateral es compacta: `docs/DESIGN.md` §7.4)
- §5, RN-04 (b): agrega al final:
  > - En el buscador del Maestro, cada alumno aparece con su nombre y su correo enmascarado (hasta los 2 primeros caracteres antes de la `@`, nunca todos, `***` y el dominio). El correo completo solo se ve en la lista de alumnos de su clase, una vez inscrito. El buscador nunca muestra el estado de pago.
  > - Cada alta manual y cada baja de un alumno quedan registradas, en el orden en que ocurrieron (clase, alumno, maestro, tipo y fecha). El Administrador las consulta (ADMIN).

**`README.md` (d).** En "Backend en local", después de la copia de `.env.example`:
> Si tu `backend/.env` es anterior a CLASES-d, copia a mano las cinco variables `STORAGE_*` de `backend/.env.example`: sin ellas la API arranca, pero subir y descargar archivos responde 503.

---

## Pasos de implementación

**Reglas para todos los pasos y todos los agentes:**
- **Formateadores:**
  - solo `npx prettier --write <rutas concretas>` y `npx eslint --fix <rutas concretas>`, **ejecutados desde el paquete del encargo** (`shared/`, `backend/` o `frontend/`) y solo sobre los archivos que tocaste;
  - nunca `npm run format`, nunca desde la raíz, nunca `--write`, `--fix` o `-i` fuera de ese paquete;
  - `eslint.config.mjs` (a), `docs/DESIGN.md` y los `README.md` se editan a mano.
- **Sin navegadores ni aplicaciones gráficas.** Sin `npm run dev` y sin arrancar la API, el worker ni Vite.
- **Git solo de lectura. Ningún agente hace commit.**
- **No leas ni imprimas ningún `.env`.** No termines procesos que no arrancaste.
- **Salidas largas**, a un archivo del scratchpad, sin tubería. Comandos en la sintaxis de Windows PowerShell 5.1.
- **Backend:** antes de cualquier `npm test` del backend, PA-01.
- **Cuando una parada se cumple, te detienes**, aunque la alternativa parezca obvia o inofensiva, y reportas el comando, la salida literal y tu hipótesis. En CLASES-a hubo una PA-09 resuelta por cuenta propia, registrada como desviación (R-26).
- **El programador nunca toca `*.ataque.test.*`. El tester nunca toca código de producción ni pruebas normales.**
- **Pruebas (M-02 y lección de AUTH-03):**
  - Solo se crean o modifican los archivos de pruebas de "Pruebas: listas cerradas por subentrega", en el grupo que les toca. Nunca se sobrescribe un archivo de pruebas completo: se edita en su lugar.
  - **Cada ID de "Pruebas requeridas" tiene su caso**, en el archivo que dice su fila, con el ID al inicio del título. Un ID sin caso es un resumen incompleto.
  - El resumen asocia cada ID con su archivo y el título exacto del caso (la tabla completa, no un rango).
- **Limpieza de las pruebas del backend en b, c y d (N-10):** en cada archivo de pruebas de integración de esas subentregas, la limpieza de `ayudas-clases.ts` (movimientos de inscripción y después clases) corre **antes** que `borrarUsuariosDePrueba` de `ayudas-auth.ts`, por los `ON DELETE RESTRICT`.
- **Simular un defecto (lección de AUTH-03c):** para demostrar que una prueba detecta un error, se usa un doble o una **copia** del archivo en el scratchpad. Nunca se edita un archivo de producción para después revertirlo (PA-15).
- **Frontend, reglas estáticas vigentes** (una violación activa PA-06):
  - `estatico-r1`:
    - ningún valor arbitrario de maquetación (`-[…]`) fuera de `components/ui/`;
    - ningún `animate-` nuevo, ningún `bg-background` y ningún `fixed`;
    - ningún `<a href="…">` literal (usa `Link`) y ningún `#` ni `javascript:`.
  - `clases-r1`:
    - ninguna clase de las escalas anuladas ni colores de la paleta;
    - ningún `ring-` ni `focus:` (el foco va con `focus-visible:`);
    - ningún `disabled` en JSX; `aria-busy` y `aria-disabled` solo en `button.tsx`;
    - `enEspera=` solo en la lista de C-7, C-11, C-12 y C-13;
    - vidrio solo donde lo dicen C-8 y `card.tsx`;
    - `text-danger` y `text-destructive` solo en los archivos de hoy (el rojo, a través de `Badge`).
- **Frontend, regla de diseño de b, c y d** (M-06, Enmienda 4; la revisa el manager en cada revisión final):
  - **ningún texto sobre vidrio azul fuera de `text-accent-foreground` y `text-accent-soft-glass`** (`DESIGN.md` §3, §6 y §7.2), y ningún fondo `bg-accent-soft-glass` bajo un texto sobre vidrio azul;
  - toda superficie de color nueva nombra los colores de su texto en su sección de `DESIGN.md`.
- **Frontend, foco de c y d** (Enmienda 5; la revisa el manager en cada revisión final): todo control que desaparece o borra su fila sigue `DESIGN.md` §7.14 (con su extensión de la ronda 4 de b); el foco nunca queda en `<body>`.
- **Backend, reglas estáticas vigentes** (`arquitectura-cuentas-r1`):
  - exactamente un `$queryRawUnsafe` y ningún `$executeRawUnsafe`;
  - `pg-boss` solo en `adapters/queue/index.ts`; `executeSql` solo en `adapters/`;
  - `handlers/`, `middleware/` y `workers/` no obtienen el cliente de Prisma;
  - además, `minio` solo en `adapters/storage/index.ts` (ESLint).

### PARADAS
| # | Condición |
|---|---|
| PA-01 | La regla del firewall "Campus: bloquear entrada a Docker en redes publicas" no existe, está deshabilitada o no es Inbound/Block/Public, o la red activa no es de confianza (`Get-NetFirewallRule -DisplayName "Campus: bloquear entrada a Docker en redes publicas"`, `Get-NetConnectionProfile`). **No se corre ninguna prueba del backend** |
| PA-02 | Pasa cualquiera de estas cosas:<br>- la rama no es `feat/clases`;<br>- hay cambios fuera de los permitidos contra la base de la subentrega;<br>- la base no existe (`git cat-file -e '<hash>^{commit}'`);<br>- un archivo protegido que cambió el orquestador no coincide con su SHA-256 de `aprobacion.md`;<br>- V-01 no coincide con la última tabla del tester. |
| PA-03 | El SQL de `--create-only` contiene algo distinto de §D-A1, §D-B8, §D-C1 o §D-D1, o `migrate dev` propone `reset` o avisa de deriva. En particular:<br>- un `DROP` o un `ALTER` de una columna existente;<br>- cualquier cambio en `usuarios` que no sea el índice GIN;<br>- en `movimientos_inscripcion`, cualquier índice salvo el `UNIQUE` de `secuencia` de la variante admitida de §D-B8, o una `secuencia` que no sea `BIGSERIAL NOT NULL`. |
| PA-04 | `migrate diff … --exit-code` no termina con código 0 (incluido el índice GIN, si Prisma no lo expresa igual) |
| PA-05 | (c) Pasa cualquiera de estas cosas:<br>- los trabajos de aviso no heredan `retry_limit`, `dead_letter` o la retención de su cola;<br>- una transacción revertida deja un trabajo;<br>- los datos del trabajo llevan texto, nombres o correos. |
| PA-06 | Falla una `*.ataque` que no está en la lista de rojos esperados de la ronda 0, o al terminar sigue en rojo una de esa lista |
| PA-07 | En la salida completa de la suite del backend aparece `40P01`, `deadlock detected`, `could not serialize`, `P2028` o `too many clients`.<br>**Única exclusión:** los dos `P2028` aceptados de `backend/test/cuentas-r3.ataque.test.ts` (uno en `POST /api/auth/login` sobre `tx.sesion.create` y uno en `POST /api/auth/restablecer` sobre `tx.tokenCuenta.updateMany`), con el texto de PA-07 de `docs/trabajo/AUTH-03-ajustes-de-cuentas/plan.md`.<br>Todo reporte incluye el comando, el conteo por término y la ruta y la llamada de cada `P2028`. |
| PA-08 | Cualquier camino por el que un correo real podría salir fuera de `production` |
| PA-09 | La implementación exige tocar un archivo de "No se toca", instalar una dependencia distinta de `minio` (d), o cambiar una firma de AUTH-01 a AUTH-03 que no esté en "Cambios por capa" |
| PA-10 | Un log contiene una contraseña, un token, una cookie, `STORAGE_SECRET_KEY`, una firma `X-Amz-Signature`, una URL prefirmada completa o el correo completo de un candidato del buscador |
| PA-11 | Quedan contenedores de Testcontainers 120 s después de terminar una corrida (no se borran a mano) |
| PA-12 | Una prueba propia es intermitente |
| PA-13 | (a) La regla de la guarda de §D-0.3 hace que no arranque una ruta existente, o exige cambiar `rutas-publicas.ts` |
| PA-14 | (d) Firmar una URL con `minio` intenta conectarse al almacén (PR-D03a falla sin red), o `npm install minio` agrega un paquete de AWS o cambia algo del lockfile fuera del árbol de `minio` |
| PA-15 | Para demostrar un defecto habría que editar un archivo de producción (en lugar de un doble o una copia en el scratchpad) |
| PA-16 | Pasa cualquiera de estas cosas:<br>- hay que crear o modificar un archivo de pruebas que no está en "Pruebas: listas cerradas por subentrega" para la subentrega en curso;<br>- hay que cambiar un archivo existente de otra forma que la de su columna;<br>- hay que borrar o reescribir un caso ya existente de un archivo "del propio encargo que se extiende".<br>Extender los archivos listados para la subentrega **no** activa esta parada. |
| PA-17 | (b) Prisma no admite el `orderBy` por `usuario.nombreBusqueda` con el filtro de conjunto de claves de §D-B3 bis, o PR-B02d o PR-B03d fallan por el orden de la paginación |

### Verificaciones
- **V-01 (hashes):** `Get-FileHash -Algorithm SHA256` de todas las `*.ataque`, contra la última tabla del tester.
  - Para CLASES-b fue la tabla vigente al cierre de a: 79 `*.ataque` (77 de la ronda 3, con el hash de C-16 para `clases-r2`, más las 2 `-r4` de la regresión final). Cifras reales de cierre de a: backend 97 archivos y 1059 pruebas; frontend 78 archivos y 1106 pruebas (`aprobacion.md`, "Cierre de CLASES-a").
  - **Para CLASES-c, la tabla vigente al cierre de b:**
    - las 85 `*.ataque`, con el hash de C-16 para `clases-r2` (`0135A34D…`) y el de C-17 para `alumnos-b-r1` del frontend (`C3692E9E…`);
    - más las que agregue la regresión de la ronda 4 de b, tal como queden en `reporte-tester.md`.

    Cifras de cierre de b, como referencia de V-07: backend 104 archivos y 1144 pruebas; frontend 84 archivos y 1167 pruebas; más las que agregue la ronda 4.
  - **Para d, la tabla de la regresión final de c** ("CLASES-c — Ronda 4, regresión final" en `reporte-tester.md`): las 96 `*.ataque` de la ronda 3, más las que agregue esa regresión.

    Cifras de cierre de c, como referencia de V-07 (cuarta ronda, antes de la regresión final): backend 111 archivos y 1226 pruebas; frontend 95 archivos y 1292 pruebas; más lo que agregue la regresión final (Enmienda 9).
- **V-02 (paquetes):** desde la raíz, `npm run build`, `npm run lint` y `npm run test`, todos con código 0 (el backend, solo con PA-01). El resumen trae **el comando exacto y la última línea de salida de cada uno**.
- **V-03 (Prisma, a, b, c y d):** `npx prisma validate`, `npx prisma format --check`, `npx prisma generate`, `npx prisma migrate status` y `npx prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --exit-code`.
- **V-04 (búsquedas en el código de producción, sin pruebas):**
  - `$queryRawUnsafe` → exactamente 1 (`adapters/db/cliente.ts`); `$executeRawUnsafe` → 0; `$queryRaw` o `$executeRaw` nuevos en `backend/src/` → solo el `FOR SHARE` de `adapters/db/publicaciones.ts` (c);
  - `addHook` en `backend/src/handlers/` → 0;
  - `from "minio"` → solo `adapters/storage/index.ts` (d);
  - `estadoPago` en `backend/src/` → solo `handlers/clases/alumnos.ts`, `adapters/db/inscripciones.ts` y los archivos de AUTH que ya lo tenían;
  - `movimientoInscripcion` (el modelo de Prisma) en `backend/src/` → solo `adapters/db/inscripciones.ts`, y ahí solo en `.create(` (b);
  - `enmascararCorreo` → definido en `core/clases/busqueda.ts` y usado en `handlers/clases/alumnos.ts` (b); `correoEnmascarado` no aparece en `frontend/src/features/clases/lib.ts` (el frontend no enmascara);
  - `console.` → 0 en los archivos nuevos del backend;
  - `fetch(` en `frontend/src/` → solo `services/apiClient.ts` y `services/almacenService.ts`;
  - `dangerouslySetInnerHTML` y `target="_blank"` → 0;
  - `enEspera=` → 25 (a), 29 (b), 35 (c) y 36 (d); `vidrio-azul` → solo `bloque-destacado.tsx`;
  - `autoComplete="off"` en el campo del código, en el buscador y en el formulario de la clase;
  - `from "@/features/auth` en `features/clases/` → 0.
  - (c, Enmienda 6) `Default_Ignorable_Code_Point` en `shared/src/` → solo en `auth.ts` (sin cambios) y `clases.ts`; en `backend/src/` y `frontend/src/` → 0. `contarCaracteresVisibles` se define solo en `shared/src/clases.ts`;
  - (c, Enmienda 6) `claseId ?? ""` en `frontend/src/features/clases/` → solo en `components/formulario-clase.tsx`;
  - (c, Enmienda 6) `focoPerdido` se define solo en `features/clases/lib.ts`, y `hooks.ts` no lo exporta;
  - (c, Enmienda 6) `toast` en `features/clases/components/buscador-alumnos.tsx` → 0.
  - (c, Enmienda 8) `normalizarTextoLargo` se define solo en `shared/src/clases.ts`; `backend/src/core/clases/texto.ts` solo la reexporta.
- **V-05 ("No se toca"), mecánica:**
  - **Dentro de los paquetes:** por cada ruta de la lista de la subentrega, `git diff --quiet <base> -- <ruta>` con código 0 y `git status --porcelain -- <ruta>` vacío. La base es `<R>` en a, `<Ca>` en b, **`<Cb>` en c** y `<Cc>` en d.
  - **Migraciones:** en cada subentrega, `git diff --name-only <base> -- backend/prisma/migrations` lista solo la carpeta nueva de esa subentrega (a, b, c y d tienen una cada una).
  - **`eslint.config.mjs`:**
    - en a, `git diff <R> -- eslint.config.mjs` contiene solo el bloque de §D-0.4, y el programador pega ese diff en su resumen;
    - en b, c y d, `git diff --quiet <Ca> -- eslint.config.mjs` con código 0.
  - **`backend/package.json` y `package-lock.json`:**
    - en a, b y c, `git diff --quiet <R> -- backend/package.json package-lock.json` con código 0;
    - en d, el diff contra `<Cc>` contiene solo `minio` y su árbol, y el programador lo pega en su resumen.
  - **Fuera de los paquetes, lo demás:** lo mismo con base `<R>`, salvo los archivos protegidos que cambió el orquestador, que se comparan con **el último** SHA-256 anotado en `aprobacion.md`.
  - **`docs/DESIGN.md`:** lo editan los programadores (pasos 11, 23, 33 y 44), así que no se compara con `<R>`: su diff lo revisa el manager en cada revisión final.
  - **Excluidos:** `docs/trabajo/CLASES-01-clases-y-muro/`, `docs/ESTADO.md` y los cambios previos de `docs/trabajo/AUTH-03-ajustes-de-cuentas/aprobacion.md` (S-01).
- **V-06 (rutas):** la lista de `printRoutes` es la de hoy más, exactamente:
  - a: `POST /api/clases`; `GET` y `HEAD /api/clases/inscritas` y `/api/clases/impartidas`; `POST /api/clases/unirse`; `GET`, `HEAD` y `PUT /api/clases/:claseId`; `GET`, `HEAD` y `POST /api/clases/:claseId/codigo`;
  - b: `GET` y `HEAD …/personas`; `GET`, `HEAD` y `POST …/alumnos`; `GET` y `HEAD …/alumnos/candidatos`; `DELETE …/alumnos/:alumnoId`;
  - c: `GET`, `HEAD` y `POST …/publicaciones`; `DELETE …/publicaciones/:publicacionId`; `GET`, `HEAD` y `POST …/publicaciones/:publicacionId/comentarios`; `DELETE …/comentarios/:comentarioId`; `DELETE /api/clases/:claseId/mis-comentarios/:comentarioId`;
  - d: `POST …/archivos`; `POST …/archivos/:archivoId/descarga`.

  `RUTAS_PUBLICAS` sigue con exactamente las 10 de hoy. Ninguna ruta contiene "movimiento".
- **V-07 (conteos del resumen):** `npx vitest list` desde `backend/` y desde `frontend/`, redirigidos a un archivo del scratchpad.
  - Cada cifra del resumen sale de esas listas o de la corrida, con el comando incluido.
  - Además, una búsqueda de cada ID de "Pruebas requeridas" de la subentrega en esas listas: todos aparecen.
  - El manager lo contrasta con su propia corrida.

### Antes de empezar (orquestador)
0. **Hecho el 2026-09-29:** el humano respondió y aprobó por escrito (carril sensible).
   - El orquestador anotó en `aprobacion.md` la aprobación, con el texto literal del humano, `<R>` = `3399c79` y el SHA-256 de los archivos protegidos.
   - El manager aprobó la Enmienda 2 para CLASES-a (M-03 quedó para b) y aprobó la Enmienda 3. CLASES-a arrancó.
   - **CLASES-a:**
     - se implementó y tuvo tres rondas del tester; la revisión final dio ESCALAR;
     - el humano autorizó una cuarta ronda corta y cerrada (M-06, T-18, T-19 y N-01 a N-03) y aprobó la regla de T-18;
     - el manager aprobó la ronda 4 ("Revisión final — CLASES-a — ronda 4 y cierre"), y la regresión final del tester dio RESISTE.

     La Enmienda 4 registra ese cierre en el plan. Commit `<Ca>` = `855069b`.
   - **CLASES-b (2026-09-30):**
     - se implementó y tuvo tres rondas del tester (ROTO en la tercera, con T-25 y T-26, dos hallazgos bajos de foco); la revisión final dio ESCALAR AL HUMANO;
     - el humano autorizó una cuarta ronda corta y cerrada (T-25 y T-26), y mandó "Ver más clases" a CLASES-c y "Cargar más enlaces" a ADMIN.

     La Enmienda 5 registra ese cierre en el plan. CLASES-c arranca en el paso 27, después del commit `<Cb>`.
   - **CLASES-c (2026-10-01):**
     - la Enmienda 6 fijó la regla de contenido visible y los triviales de b; la Enmienda 7 cerró la PA-16 del caso E6, y la Enmienda 8, los arbitrajes de la ronda 1;
     - tuvo tres rondas del tester (T-29 a T-35). La revisión final dio ESCALAR AL HUMANO por T-35 (M-23);
     - el humano autorizó una cuarta ronda corta y cerrada, opción (A) mínima: solo `muro-view.tsx` y `muro-view.test.tsx`.

     La Enmienda 9 registra ese cierre en el plan. CLASES-d arranca en el paso 37, después del commit `<Cc>`.
   - No hay commit de aprobación.

### CLASES-a
1. **Tester, ronda 0 de CLASES-a** (§D-R0: C-1 a C-10 y C-14). Base `<R>`.
2. **Programador, precondiciones:**
   - PA-01 y PA-02;
   - `git diff --name-only <R> -- shared backend frontend` lista solo las `*.ataque` de la ronda 0;
   - V-01 con la tabla de la ronda 0.
3. `shared/src/clases.ts` e `index.ts`; `npm run build` desde `shared/`.
4. `core/`: `clases/codigo.ts`, `clases/pertenencia.ts`, `clases/texto.ts`, `paginacion.ts` y sus pruebas (PR-A01a a PR-A05); `npm test` de esos archivos.
5. **Migración:**
   1. `schema.prisma`;
   2. `npx prisma migrate dev --create-only --name clases_e_inscripciones`;
   3. revisión del SQL contra §D-A1 (PA-03);
   4. `npx prisma migrate dev`, una sola vez;
   5. V-03.
6. `adapters/db/clases.ts` e `index.ts`; `adapters/README.md`.
7. `middleware/` (§D-0.1 a §D-0.3) y su `README.md`; `middleware/index.test.ts` (modificado, PR-A07d).
8. `handlers/clases/clases.ts`, `app.ts` y `handlers/README.md`. `eslint.config.mjs` (§D-0.4).
9. Pruebas del backend de a (PR-A06a a PR-A16) y la suite completa del backend. Los rojos deben ser exactamente los de la ronda 0; al terminar, ninguno.
10. `frontend/`, con las pruebas PR-A17a a PR-A27 y los cambios permitidos en los archivos existentes de la lista:
    - `services/sesionService.ts`, `features/auth/hooks.ts` y `data.ts`;
    - el borrado de `bienvenida-view.tsx`;
    - `components/estado-vacio.tsx`, `lib/format.ts`, `styles/tokens.css` y `app/router.tsx`;
    - el módulo `features/clases` de a.

    Suite completa del frontend: rojos esperados → ninguno.
11. `docs/DESIGN.md` (§D-A8), a mano.
12. V-01 a V-07. `resumen-programador.md`, sección "CLASES-a", con:
    - la salida de cada V;
    - la tabla de IDs, con su archivo y el título exacto de su caso;
    - la respuesta a cada PA: "no se activó" o "se activó y me detuve".
13. **Revisión y rondas de CLASES-a:**
    1. **Manager, verificación del resumen:** lint, test y build propios; cifras e IDs contrastados.
    2. **Tester, rondas 1 a 3.**
    3. **Manager, revisión final:** incluye el diff línea por línea de las `*.ataque` de la ronda 0 y los patrones de `DESIGN.md`.
    4. **Ronda 4, corta y cerrada**, autorizada por el humano: corrección del programador (PR-A13c, PR-A13d y PR-A21e), C-16 del tester, verificación del manager (APROBADO) y regresión final del tester. Sin quinta ronda: un hallazgo nuevo en lo que cambió se escala al humano.
14. **Cierre de CLASES-a (orquestador), con la regresión final del tester en RESISTE:**
    1. aplica los textos marcados (a) y anota sus SHA-256;
    2. actualiza `docs/ESTADO.md`;
    3. da al humano el resumen (15 líneas como máximo) y el bloque de comandos;
    4. tras el commit, lee el hash con `git log` y lo anota como `<Ca>`.

### CLASES-b
15. **Tester, ronda 0 de CLASES-b** (C-2, C-11 y C-15). Base `<Ca>`; V-01 contra la tabla vigente al cierre de a (79 `*.ataque`, con C-16).
16. **Programador, precondiciones** (como en el paso 2, con `<Ca>`).
17. `shared/src/clases.ts` (b) e `index.ts`; build.
18. `core/clases/busqueda.ts` (con `enmascararCorreo`) y su prueba (PR-B01a a PR-B01g).
19. **Migración:**
    1. `schema.prisma`, con `secuencia BigInt @default(autoincrement())`;
    2. `npx prisma migrate dev --create-only --name movimientos_inscripcion`;
    3. revisión del SQL contra §D-B8 (PA-03). Si `prisma validate` exigió `@unique` en `secuencia`, se reporta la variante;
    4. `npx prisma migrate dev`, una sola vez;
    5. V-03.
20. `adapters/db/inscripciones.ts` (con `agregarAlumnoManual` y `quitarAlumno` en transacción, el movimiento como último paso) e `index.ts`; `handlers/clases/alumnos.ts` (con el enmascarado), `app.ts` y los README.
21. Pruebas del backend de b (PR-B02a a PR-B08i y PR-B16a a PR-B16h; `ayudas-clases.ts` extendido con la limpieza en el orden de N-10) y la suite completa. Si PR-B02d o PR-B03d fallan por el orden, PA-17.
22. `frontend/`: suite completa al terminar.
    - `components/estado-pago-badge.tsx` y `acceso-restringido-badge.tsx`;
    - `app/router.tsx`, `secciones-de-clase.tsx` y las vistas y componentes de b, con sus pruebas (PR-B09 a PR-B15);
    - lo heredado de a (§D-B4 bis): `formulario-unirse-clase.tsx`, `lib.ts`, `inicio-maestro-view.tsx` y `data.ts`, con PR-B17.
23. `docs/DESIGN.md` (§D-B7), a mano.
24. V-01 a V-07; `resumen-programador.md`, "CLASES-b".
25. **Revisión y rondas de CLASES-b:**
    1. **Manager, verificación del resumen.**
    2. **Tester, rondas 1 a 3**, con las correcciones de las rondas 1 y 2 (T-20 a T-24, D-1, D-3, D-4, D-8, M-07 y C-17).
    3. **Manager, revisión final de CLASES-b** (ESCALAR AL HUMANO, por T-25 y T-26).
    4. **Ronda 4, corta y cerrada**, autorizada por el humano (2026-09-30):
       - corrección del programador de T-25 y T-26, solo en `buscador-alumnos.tsx`, `tabla-alumnos.tsx` y `personas-view.tsx`, con la extensión de `DESIGN.md` §7.14 y sus pruebas normales;
       - verificación del manager y regresión del tester.

       Sin quinta ronda: un hallazgo nuevo en lo que cambió se escala al humano.
26. **Cierre de CLASES-b (orquestador):** como en el paso 14, con los textos marcados (b). El hash queda como `<Cb>`.

### CLASES-c
27. **Tester, ronda 0 de CLASES-c** (C-2, C-12, C-18 y C-19). Base `<Cb>` = `e9df1f0`; V-01 contra la tabla vigente al cierre de b (85 `*.ataque`, con C-16 y C-17, más las de la regresión de la ronda 4 de b). La regla de "contenido visible" (§D-C4) ya está fijada: es la Enmienda 6.
28. **Programador, precondiciones** (con `<Cb>`).
29. `shared/src/clases.ts` (c), con la regla de contenido visible de §D-C4; build. `core/clases/texto.test.ts` extendido (PR-C12a a PR-C12d). `core/eventos/avisos-de-clase.ts` y su prueba (PR-C01a y PR-C01b).
30. **Migración:**
    1. `schema.prisma`;
    2. `--create-only --name publicaciones_y_comentarios`;
    3. revisión contra §D-C1. El `CHECK` se agrega a mano en esa misma carpeta, antes de aplicar;
    4. `migrate dev`, una sola vez;
    5. V-03.
31. `adapters/queue/colas.ts` y **PR-C07 antes de seguir** (PA-05). Después:
    - `adapters/db/publicaciones.ts` (con el `FOR SHARE`) e `index.ts`;
    - `handlers/clases/muro.ts` (ids con `randomUUID`);
    - `app.ts` y los README.
32. Pruebas del backend de c (PR-C02a a PR-C08h y PR-C12e; PR-C12f en `clases.integracion.test.ts`) y la suite completa. `frontend/`: el muro de c, con sus pruebas (PR-C09a a PR-C10d, PR-C12g a PR-C12i), y el foco de los "Ver más", incluido "Ver más clases" en `panel-mis-clases.tsx` (§D-C5, PR-C11a a PR-C11c). Lo heredado de b (§D-C5 bis), con PR-C13a a PR-C13d: `hooks.ts`, `lib.ts`, `components/buscador-alumnos.tsx`, `tabla-alumnos.tsx` y `con-clase-de-la-ruta.tsx`, `clase-layout.tsx`, `editar-clase-view.tsx`, `personas-view.tsx` y `alumnos-view.tsx`. Suite completa. **Enmienda 7:** junto con sus pruebas del backend, el programador adapta el caso E6 de `backend/test/bloqueo-usuario.integracion.test.ts`, solo como dice la lista cerrada de c. Con eso, PA-16 queda cerrada para ese archivo y ese caso.
33. `docs/DESIGN.md` (§D-C7, con la línea de §7.14 de la Enmienda 6), a mano.
34. V-01 a V-07; `resumen-programador.md`, "CLASES-c".
35. **Manager: verificación del resumen. Tester, rondas 1 a 3. Manager, revisión final de CLASES-c** (hecho: ESCALAR AL HUMANO por T-35).
    - **Cuarta ronda, corta y cerrada,** autorizada por el humano (opción (A) mínima de M-23): corrección del programador (T-35, PR-C18; solo `muro-view.tsx` y `muro-view.test.tsx`), verificación del manager y regresión final del tester.
    - Sin quinta ronda: un hallazgo nuevo va como pendiente con destino o como decisión del humano.
36. **Cierre de CLASES-c (orquestador), con la regresión final del tester en RESISTE:** como en el paso 14, con los textos marcados (c) en su versión final de la Enmienda 9, incluida la viñeta de §14 sobre la paginación por cursor, que el humano autorizó. El hash queda como `<Cc>`.

### CLASES-d
37. **Tester, ronda 0 de CLASES-d** (C-2 y C-13). Base `<Cc>`.
38. **Programador, precondiciones** (con `<Cc>`).
39. **Dependencia:** `npm install minio@^8 --workspace @campus/backend`, una sola vez, desde la raíz. Revisa el diff del lockfile (PA-14) y repórtalo con la versión instalada.
40. `shared/src/archivos.ts` y `clases.ts` (d); build. `core/archivos/almacen.ts` y `politica.ts`, con su prueba (PR-D01a a PR-D01g).
41. Configuración y almacén:
    - `config/env.ts` y `env.test.ts` (modificado, PR-D02a a PR-D02c);
    - `config/almacen.ts`, con su prueba (PR-D02d);
    - `backend/.env.example`;
    - `adapters/storage/index.ts` y su prueba (**PR-D03a y PR-D03b antes de seguir**, PA-14).
42. **Migración y código de d:**
    1. `schema.prisma`;
    2. `--create-only --name archivos`;
    3. revisión contra §D-D1, con los `CHECK` a mano;
    4. `migrate dev`, una sola vez;
    5. V-03;
    6. `adapters/db/archivos.ts`, `publicaciones.ts` (d) e `index.ts`;
    7. `handlers/archivos.ts`, `clases/muro.ts` (d) y `app.ts`;
    8. `test/almacen-en-memoria.ts` y los README.
43. Pruebas del backend de d (PR-D04a a PR-D09i) y la suite completa. `frontend/`: `services/almacenService.ts`, `lib/format.ts` (d) y los componentes de d, con sus pruebas (PR-D10a a PR-D15). Suite completa.
44. `docs/DESIGN.md` (§D-D7), a mano.
45. V-01 a V-07; `resumen-programador.md`, "CLASES-d".
46. **Manager: verificación del resumen. Tester, rondas 1 a 3. Manager, revisión final de CLASES-d.**
47. **Comprobación humana** (abajo). El orquestador la escribe en `comprobacion-humano.md`. Un "no pasa" se escala: los ajustes visuales van por el carril trivial; lo que cambie la lógica, al carril que corresponda.
48. **Cierre de CLASES-d (orquestador):**
    1. aplica los textos marcados (d) y anota sus SHA-256;
    2. actualiza `docs/ESTADO.md`, con el cierre del encargo y los pendientes de `LIMPIEZA_DIARIA` (filas y objetos) y de la consulta de `movimientos_inscripcion` (ADMIN, ordenada por `secuencia`);
    3. da al humano el resumen y el bloque de comandos;
    4. tras el commit, anota `<Cd>`.

    El humano decide el PR.

### Comprobación humana en navegador (una sola, al final de CLASES-d; máximo 10 minutos y 6 puntos; solo lo que las pruebas no ven)
**Preparación** (no cuenta en el tiempo):
- `infra` levantado (PostgreSQL y MinIO), y la API y la SPA en local, que arranca el humano. No hace falta el worker.
- Antes, el humano copia a su `backend/.env` las cinco variables `STORAGE_*` de `backend/.env.example`.
- Cuentas `@pruebas.local`: una de maestro **con un nombre largo** y una de estudiante, esta en una ventana privada. En `comprobacion-humano.md`, el orquestador indica el nombre del maestro y las cadenas para pegar en H-6.
- Ningún agente abre navegadores.

**Tiempo estimado: unos 10 minutos** (H-1, 2.5; H-2, 1; H-3, 2; H-4, 1.5; H-5, 1.5; H-6, 1.5).
- **H-1.** Como maestro, crea una clase y copia su código. Como estudiante, pégalo en minúsculas y con un espacio en medio en "Unirme a la clase". Los dos inicios deben mostrar la tarjeta de la clase, y el titular, el número correcto. Después, como maestro, regenera el código; como el mismo estudiante, vuelve a escribir el código viejo: debe decir que no existe.
- **H-2.** Con el teclado (Tab), en el inicio: el foco en una tarjeta verde o azul se ve como un contorno blanco por dentro, y en una blanca, azul por fuera. En el bloque destacado el foco también se ve (S-07).
- **H-3.** Como maestro, en "Alumnos":
  1. quita al estudiante (confirmación en línea);
  2. búscalo escribiendo su nombre sin acentos: su correo debe verse **enmascarado** (a lo más dos letras, `***` y el dominio), nunca completo;
  3. agrégalo de nuevo: en la tabla aparece con su correo **completo** y "Al corriente".

  Como estudiante, en "Personas", el maestro va aparte y no ves ningún correo ni estado de pago.
- **H-4.** Como maestro, publica un anuncio y un material. Como estudiante, comenta; como maestro, borra ese comentario.
- **H-5.** Como maestro, publica un material con una imagen PNG y un PDF. La imagen se ve en vista previa, y el PDF se descarga con su nombre original. Es la única comprobación real de la subida al MinIO y de su CORS (S-21).
- **H-6.** A 360 px. Antes, el maestro crea dos clases más pegando las cadenas de `comprobacion-humano.md`: un nombre de 120 caracteres sin espacios y otro de 60 emojis.
  - **En el inicio del maestro:** el titular a 32 px sin desbordarse, las tarjetas en una columna, la tarjeta interna debajo del texto, el relleno del bloque destacado sin apretar el texto, y el saludo con el nombre largo sin salirse.
  - **En las tarjetas de las dos clases largas:** el nombre se parte sin desplazamiento horizontal. En el inicio del estudiante, el nombre largo del maestro también cabe en la tarjeta.
  - **En la página de esas clases:** el `h1` y "Maestro: …" parten la línea sin desbordarse, y las secciones y el encabezado no provocan desplazamiento horizontal.
  - **Con el lector de pantalla, una sola vez (Enmienda 5):** en "Alumnos", pega en el buscador una de esas cadenas largas y escucha el campo. La ayuda permanente y el aviso de longitud se leen seguidos (`aria-describedby`). Si te molesta, el ajuste es del carril trivial: cuando hay aviso, `aria-describedby` apunta solo al aviso. Si no cabe en el tiempo, queda "no verificado por decisión del humano".

Lo demás queda "no verificado por decisión del humano, cubierto por pruebas automáticas".
- El contraste lo cubre `tokens.test.ts`.
- El estado "Deudor" no se puede provocar desde la interfaz (lo cambia ADMIN); lo cubren PR-B03a y PR-B11a.
- El registro de `movimientos_inscripcion` no tiene pantalla en CLASES; lo cubren PR-B16a a PR-B16h.

### No se toca
Nadie modifica estas rutas, salvo lo que diga "Cambios por capa" para la subentrega en curso. La base es la de V-05.

**Común a las cuatro subentregas**
- `infra/**`, `.claude/**` y `.codex/**`.
- `AGENTS.md`, `CLAUDE.md` y `README.md`: solo el orquestador, con autorización del humano y hash anotado.
- `docs/ARCHITECTURE.md`, `docs/ARCHITECTURE-ESSENTIALS.md` y `docs/PRD.md`: solo el orquestador, al cerrar cada subentrega, con hash anotado.
- `docs/ESTADO.md` (orquestador) y `docs/design/**`.
- `docs/trabajo/**` fuera de esta carpeta. Dentro de ella:
  - `plan.md` es del arquitecto;
  - `revision.md`, del manager;
  - `aprobacion.md` y `comprobacion-humano.md`, del orquestador;
  - cada agente escribe solo su entregable (`resumen-programador.md`, `reporte-tester.md`).
- Raíz: `package.json`, `.prettierrc.json`, `.prettierignore`, `tsconfig.base.json`, `.gitignore`, `.gitattributes` y `.nvmrc`. `eslint.config.mjs`, salvo §D-0.4 en a. `package-lock.json`, salvo `minio` en d.
- **Backend:**
  - `package.json` (salvo `minio` en d), `prisma.config.ts`, `vitest.config.ts`, `tsconfig*.json` y cualquier `.env`;
  - las migraciones existentes (y, en cada subentrega, las de las subentregas anteriores);
  - `src/server.ts`, `src/worker.ts` y `src/scripts/**`;
  - `src/config/{auth,cola,correo,logger}.ts`;
  - `src/adapters/notifier/**` y `src/adapters/auth/**`;
  - `src/adapters/db/{cliente,bloqueo-usuario,sesiones,salud,errores,usuarios,tokens-cuenta,enlaces-registro,invitaciones}.ts`;
  - `src/adapters/queue/index.ts`;
  - `src/middleware/{authenticate,with-profile,with-password-gate,with-access,require-role,rutas-publicas}.ts`;
  - `src/handlers/auth/**` y `src/handlers/{admin,errores,salud,usuarios,validacion}.ts`;
  - `src/core/auth/**`, `src/core/correo/**`, `src/core/eventos/correo-de-cuenta.ts` y `src/core/errores.ts`;
  - `src/workers/**`;
  - `test/global-setup.ts`, `test/setup.ts`, `test/entorno-de-pruebas.ts`, `test/ayudas-auth.ts`, `test/ayudas-cuentas.ts`, `test/ayudas-concurrencia.ts`, `test/notifier-en-memoria.ts` y `test/preparar-cola.ts`.
- **Frontend:**
  - `package.json`, `components.json`, `tsconfig*.json`, `vite.config.ts`, `vitest.config.ts`, `index.html` y `.env*`;
  - `src/main.tsx` y `src/test/setup.ts`;
  - `src/styles/**`, salvo `tokens.css` y `tokens.test.ts` en a;
  - `src/app/require-*.tsx`, `providers.tsx` y `fondo-de-la-app.tsx`;
  - `src/services/{apiClient,authService,tokenAcceso,navegacion,liveService}.ts`;
  - `src/components/layout/**`;
  - `src/components/ui/**`;
  - `src/components/{mensaje-error,error-de-campo,cargando,avatar-usuario}.tsx` y `src/lib/{utils,cache-de-mutaciones}.ts`;
  - `src/features/admin/**` y `src/features/diagnostico/**`;
  - `src/features/auth/**`, con estas excepciones en a:
    - `hooks.ts` y `data.ts`;
    - el borrado de `bienvenida-view.tsx`;
    - el archivo nuevo `cambio-de-identidad.test.tsx`;
    - los tres archivos de pruebas que la lista de a permite adaptar: `login-view.test.tsx`, `registro-view.test.tsx` y `registro-maestro-view.test.tsx`.
- **Pruebas:** todo archivo de pruebas que no esté en "Pruebas: listas cerradas por subentrega" para la subentrega en curso (PA-16).
- **Para el programador:** todo `*.ataque.test.*`. **Para el tester:** el código de producción y las pruebas normales.

**CLASES-a, además:** todo lo que "Cambios por capa" asigna a b, c o d, en particular `adapters/db/{inscripciones,publicaciones,archivos}.ts`, `adapters/queue/colas.ts`, `adapters/storage/**`, `config/env.ts`, `components/estado-pago-badge.tsx` y `services/almacenService.ts`.

**CLASES-b, además:**
- `src/middleware/**`, `eslint.config.mjs`, `features/auth/**`, `services/sesionService.ts`, `styles/**` y `components/estado-vacio.tsx`;
- en `backend/prisma/`, todo salvo `schema.prisma` y la carpeta nueva `<timestamp>_movimientos_inscripcion`;
- lo que "Cambios por capa" asigna a c o d.

**CLASES-c, además:**
- `src/middleware/**`, `eslint.config.mjs`, `features/auth/**`, `services/**`, `styles/**`, `components/*.tsx` y `adapters/db/inscripciones.ts`;
- lo que "Cambios por capa" asigna a d.

**CLASES-d, además:** `src/middleware/**`, `eslint.config.mjs`, `features/auth/**`, `services/sesionService.ts`, `styles/**`, `components/*.tsx`, `adapters/db/{clases,inscripciones}.ts`, `adapters/queue/colas.ts` y `handlers/clases/{clases,alumnos}.ts`.
