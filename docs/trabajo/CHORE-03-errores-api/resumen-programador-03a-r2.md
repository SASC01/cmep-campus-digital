# Resumen del programador — CHORE-03 · 03a, ronda 2 (corrección de T-01 y T-02, 2026-10-26)

> Transcripción del orquestador: el programador entregó este resumen como texto en su respuesta final; se copia tal cual, sin cambiar contenido.

Plan: docs/trabajo/CHORE-03-errores-api/plan.md (Enmienda 2, LISTO, SHA-256 a9014e2f…; DH-5 sí, DH-6 sí). Subentrega 03a, ronda 2.

Pasos completados: 5 de 5 (los pasos 10 a 14 de 03a). Leí los pasos 10 a 14, §D-1, §D-3, §D-4 y §D-6 del plan. Son coherentes entre sí y no encontré ninguna sección a medias.

**Archivos creados y modificados** (todo bajo `frontend/src/`):
- Modificados:
  - `lib/errores-de-api.ts`: `CAMPO_QUE_REPITE_EL_ESQUEMA` y la forma nueva de `quitarRutaDelMensaje`. `RUTA_DEL_MENSAJE` queda con el mismo literal; solo su comentario dice ahora que se quitan la ruta y el nombre que la sigue.
  - `lib/errores-de-api-fuera-de-contrato.ts`: `CON_CAMPO_REPETIDO` con las 3 entradas de §D-3, sumada después de `DOS_PUNTOS_DENTRO`. El tipo no cambia.
  - `components/adjuntos/adjuntos-de-publicacion.tsx`, solo la guarda de §D-4:
    - `onDescargar: () => Promise<void>`;
    - `descargandoRef` con `alPulsar` (`try`/`finally`);
    - `onClick={() => void alPulsar()}`;
    - las dos fichas pasan `descargar(...)` sin `void`.
    - Prettier partió el `<Button>` en varias líneas. Sigue un solo `enEspera=`.
  - `lib/errores-de-api.test.ts`: CH3-A01 ampliada, con título nuevo, y CH3-A25 nueva.
  - `features/tareas/errores-ch3.test.ts`: CH3-A08 ampliada, con el mismo título.
- Creado: `components/adjuntos/descarga-ch3.test.tsx` (CH3-A26).
- No toqué ningún `hooks.ts`, ni `shared/`, `backend/`, `clases`, `calificaciones`, `admin`, `auth`, `app/` o `services/`, ni ninguna `*.ataque` o prueba de otros.
- `git diff --stat ad10844 -- frontend shared backend infra CLAUDE.md AGENTS.md .claude README.md .env.example` da 12 archivos: los 11 de la ronda 1 más `adjuntos-de-publicacion.tsx`. Nuevos sin seguimiento: 13, que son los 12 de la ronda 1 más `descarga-ch3.test.tsx`.

**Verificación** (desde `frontend/`, una suite a la vez; antes de cada corrida comprobé con `Get-CimInstance` que no hubiera ningún `node` con `vitest`):
- **lint:** `npm run lint` → exit 0. Última línea: `> tsc -b`; antes de ella, `All matched files use Prettier code style!`.
  - La primera corrida falló por un error mío de tipos en la prueba nueva (`exactOptionalPropertyTypes`: le pasaba `rutaDeArchivos` y `alFallarLaDescarga` como `undefined`). Lo corregí pasando las props con spread condicional. No toqué nada de producción por eso.
- **test:** `npm run test` (corrida final, 04:38:15Z a 04:42:49Z) → exit 0.
  - `Test Files  209 passed (209)` · `Tests  3550 passed (3550)` · `Duration  269.87s`.
  - `grep -c "Test timed out"` = 0.
  - Una corrida previa, antes de ajustar solo los títulos de CH3-A25, dio lo mismo: 209 y 3550, sin tiempos límite.
- **build:** `npm run build` → exit 0, `✓ built in 1.44s`. Sale el mismo aviso de Vite por el chunk de más de 500 kB que en la ronda 1.
- **prisma validate:** n/a.

**Pruebas requeridas (03a):**
- **CH3-A01** → `lib/errores-de-api.test.ts` › "CH3-A01: quitarRutaDelMensaje quita la ruta una vez y el nombre de campo que el esquema repite detrás, y deja intacto lo que no empieza con una ruta"
  - Ahora también recorre cada ruta de `RUTAS_FUERA_DE_CONTRATO` con 3×3 separadores, delante y detrás de `campoFueraDeContrato`.
  - Casos nuevos: `archivoId: archivoId:`, `confirmar: confirmar:`, `temaIds.0: temaId: x`, `a: b: c: d` → `c: d`, `x: a.b: c`, `x: 14:30 y`, `x: Valor: 10` y `x: "nota": y`.
  - Además, " archivoId: archivoId: x", que empieza con espacio, queda intacto.
- **CH3-A02 a A07** → `lib/errores-de-api.test.ts`, con los mismos títulos de `resumen-programador-03a.md`, sin cambios. Ahora también recorren `CON_CAMPO_REPETIDO`.
- **CH3-A08** → `features/tareas/errores-ch3.test.ts` › "CH3-A08: mensajeDeErrorTareas recorre la tabla, da el genérico ante un código con mensaje del servidor sin texto visible y conserva los textos fijos de los ids"
  - Se amplía con `archivoId: archivoId: …` → "debe ser un identificador válido" y `confirmar: confirmar: no es válido` → "no es válido".
  - Los dobles de `claseId`, `tareaId` y `alumnoId` dan su texto fijo en `mensajeDeErrorTareas`, `mensajeDeConsultaTareas` y `mensajeDelAvisoDeCalificar`.
- **CH3-A09 a A24** → los mismos archivos y títulos de `resumen-programador-03a.md`, sin cambios y en verde.
- **CH3-A25** → `lib/errores-de-api.test.ts` › "CH3-A25: $esquema en $ruta da su ruta doble y el contrato la deja sin ningún prefijo": un `it.each` de 24 filas.
  - Cubre los 23 esquemas del plan; `publicacionYComentarioParamSchema` va dos veces, una por `publicacionId` y otra por `comentarioId`.
  - Cada fila comprueba el `path` y el `message` reales y lo que da el mensaje armado `${path.join(".")}: ${message}`. Va con las dos traducciones (sin `textosPorCampo`, y con `claseId`, `tareaId` y `alumnoId`), tanto en acción como en consulta.
  - Ninguna salida empieza con una ruta ni queda sin texto visible. Las 24 pasan: PA-10 no aplica.
- **CH3-A26** → `components/adjuntos/descarga-ch3.test.tsx`, dos `it.each` sobre 2 fichas × 2 formas de avisar (8 casos):
  - "CH3-A26: $ficha con $forma: dos clics seguidos que fallan mandan una petición y dan un aviso; al repetir el control se pide otra vez y descarga" → (a) y (b);
  - "CH3-A26: $ficha con $forma: dos clics seguidos que salen bien navegan una sola vez" → (c).
  - Comprobé que detectan el defecto: con la guarda anulada de forma temporal, las 8 fallan. Después restauré el archivo desde una copia en el scratchpad; el SHA-256 quedó igual, `06699e36…`.

**Conteos:**
- `npx vitest list <archivo> | grep -c " > "`:
  - `lib/errores-de-api.test.ts`: 31 (antes 7; +24 de CH3-A25);
  - `features/tareas/errores-ch3.test.ts`: 5 (sin cambio);
  - `components/adjuntos/descarga-ch3.test.tsx`: 8 (nuevo).
- Corrida completa: de 208 a 209 archivos (+1) y de 3518 a 3550 casos (+32 = 24 + 8). Coincide.

**Hallazgos atendidos:**
- **T-01: corregido.** Las 6 rojas del tester pasan sin tocarlas (`vitest run` sobre los tres archivos y la corrida completa):
  - `lib/errores-ch3-r1.ataque.test.ts` › "T-01: los mensajes reales del servidor para un id de la ruta o el ?confirmar= de borrar llegan a la persona sin ninguna ruta técnica";
  - `features/tareas/errores-ch3-r1.ataque.test.ts` › "T-01: «archivoId: archivoId: …» (descargar un adjunto de la tarea o de una entrega) y «confirmar: confirmar: no es válido» (borrar) dan un aviso sin ruta técnica";
  - `features/tareas/formularios-ch3-r1.ataque.test.tsx` › "T-01: 'un adjunto de la tarea en el detalle' / 'un archivo de «Tu trabajo»' / 'un archivo de la entrega de un alumno': el 400 real del servidor ante un archivoId de la ruta inválido («archivoId: archivoId: …») da un aviso sin ruta técnica" (3 casos);
  - ídem › "T-01: borrar la tarea con el 400 real del servidor ante un ?confirmar= inválido («confirmar: confirmar: no es válido») da un aviso sin ruta técnica".
- **T-02: corregido.** Las 3 rojas pasan sin tocarlas: `features/tareas/formularios-ch3-r1.ataque.test.tsx` › "'un adjunto de la tarea en el detalle' / 'un archivo de «Tu trabajo»' / 'un archivo de la entrega de un alumno': dos clics seguidos en «Descargar» que falla mandan una sola petición y dan un solo aviso".

**Hermanos y estados vecinos de T-01.** El remedio vive en el contrato, así que aplica a todo lo que pasa por `quitarRutaDelMensaje`.
- Funciones de `tareas` y `adjuntos`:
  - `mensajeDeErrorTareas`: aplica (envoltorio de `mensajeDeErrorDeApi`).
  - `erroresDeLaTareaDeApi`, `errorDeEnlacesDeApi` y `errorDeTextoDeApi`: aplica (pasan por `mensajeDeErrorTareas` cuando el campo es suyo).
  - `mensajeDelCampoDeCalificacion`, `mensajeDelAvisoDeCalificar` y `erroresDeCalificacionDeApi`: aplica (mismo camino).
  - `mensajeDeConsultaTareas`: no le hace falta (un `VALIDACION` da el respaldo); los ids dobles dan su texto fijo.
  - `avisoDeFalloAlSubir` de `adjuntos/lib.ts`: no aplica; `ARCHIVO_INVALIDO` es un código y no se recorta.
  - Hermanos del muro que sí lo heredan: `mensajeDeErrorClases` hoy usa `quitarPrefijoDeCampo` y se migra en 03b.
- Inventario de §D-1:
  - `archivoId` en las tres descargas (detalle, "Tu trabajo" y la entrega de un alumno), 03a: aplica, da "debe ser un identificador válido" (CH3-A08, A25 y las rojas del tester).
  - `confirmar` al borrar, 03a: aplica, da "no es válido".
  - `tareaId`, `alumnoId` y `claseId` dobles, 03a: su texto fijo sin cambio (`campoDeErrorDeApi` lee el primer prefijo).
  - Filas de 03b (`alumnoId` de `clases`, `temaId`, `temaIds.<i>`, `publicacionId`, `comentarioId`, `maestroId`, `maestroIds.<i>`, `categorias.<i>.id` y `tema`): el contrato ya las resuelve, como prueba CH3-A25; `clases` solo las verá al migrar en 03b. `tema: tema:` en consulta da el respaldo.
  - `id: id:` de admin (M-04) es de 03c y no está en mi inventario (CH3-A25 no puede importar el backend). La regla lo cubre: "id" casa con la expresión.
- Bordes de S-05, comprobados con las dos expresiones literales (`node`) y en CH3-A01:
  - "x: Nota: algo" → "Nota: algo".
  - "Calificación de 0 a 10: revisa los puntos" → intacto.
  - "Debe ser 0: 10" sin ruta → intacto; con `archivoIds.0:` delante → "Debe ser 0: 10".
  - "puntajes.0.criterioId: 14:30 no es válido" → "14:30 no es válido".
  - "14:30 no es válido" sin ruta → "30 no es válido". Igual que en la ronda 1: es el borde que N-07 excluye, y el segundo paso no lo toca porque "30" no es camelCase.
  - Mensaje sin ruta → intacto.
  - Mensaje que empieza con espacio → intacto, aunque lleve el nombre repetido.
  - "a: b: c: d" → "c: d".
  - Ruta doble con "\u{200B}" → genérico, por `textoVisibleOGenerico`.

**Hermanos y estados vecinos de T-02.**
- Controles con mutación en lo que toca 03a (grep de `Ref.current) return` y `enEspera=`):
  - borrar la tarea: `borrandoRef` (`acciones-de-la-tarea.tsx:68` y `:82`), con ref;
  - anular la entrega: `anulandoRef` (`entrega-realizada.tsx:66` y `:129`), con ref;
  - entregar: `entregandoRef` (`formulario-de-entrega.tsx`), con ref;
  - crear y editar la tarea: `guardandoRef` (`formulario-tarea.tsx`), con ref;
  - comentario del hilo: `enviandoRef` (`hilo-privado.tsx:64`), con ref;
  - calificar: `enviandoRef` (`panel-de-calificacion.tsx:124`), con ref;
  - "Ver más comentarios": `pidiendoMasRef` (`hilo-privado.tsx:164`), con ref;
  - "Ver más alumnos": `pidiendoMasRef` (`entregas-view.tsx:100`), con ref;
  - «Descargar»: ahora `descargandoRef` (`adjuntos-de-publicacion.tsx:29`), aplicado.
  - `lista-de-adjuntos-elegidos.tsx` no lanza mutaciones.
- Estados del mecanismo:
  - Primer clic: pide la URL (CH3-A26 b y c).
  - Dos clics seguidos: una petición (CH3-A26 a y c, y las rojas del tester).
  - Clic durante la espera: lo frena la ref, y además `isPending` ya no sale de la espera antes de tiempo, porque hay una sola llamada en vuelo.
  - Fallo: un aviso y el botón sin `aria-busy` ni `aria-disabled` (a).
  - Fallo y repetir: petición nueva, `assign` una vez y ningún aviso de más (b).
  - Fallo dos veces seguidas: la ref se libera en el `finally`, así que cada clic asentado pide de nuevo y avisa una vez. No tiene caso propio.
  - Éxito: `assign` una vez (c).
  - Vista desmontada: la ref muere con la ficha y su `finally` no tiene efecto visible. Avisar queda igual que hoy: el muro avisa con `toast`, y en `tareas` lo hace el callback de `useAvisoDeRecargaFallida`. No tiene caso propio.

**Matriz §D-6, descargas** (en vuelo a la vez: `descargandoRef` de `VistaDeFicha`, `components/adjuntos/adjuntos-de-publicacion.tsx:29`):
- **Detalle, adjuntos de la tarea:** ficha de la clase, con `alFallarLaDescarga` (`detalle-tarea-view.tsx:109`).
- **"Tu trabajo":** ficha en ruta `rutaDeMiEntrega`, con `alFallarLaDescarga` (`entrega-realizada.tsx:89-90`).
- **Entrega de un alumno:** ficha en ruta `rutaDeEntregaDeAlumno`, con `alFallarLaDescarga` (`entrega-de-alumno-view.tsx:209-210`).
- **Muro:** ficha de la clase, sin `alFallarLaDescarga`, con `toast.error(mensajeDeErrorClases)` (`features/clases/components/adjuntos-de-publicacion.tsx:15`). Hereda la guarda sin tocar `clases`.

En los cuatro sitios, las mismas reglas:
- Dos clics seguidos: una petición y, si falla, un aviso. El botón queda en espera hasta que la petición se asienta y después un clic nuevo vuelve a pedir la URL.
- Respuestas:
  - F1 y F4 dan el resto en el aviso;
  - F3 da el genérico;
  - una ruta doble da su resto;
  - 5xx y red, como hoy;
  - lo que redirige no avisa (`errorQueRedirigeElCliente`, en `tareas`);
  - un 404 de la tarea, un 403 de la clase o un 404 del alumno vuelven a pedir la tarea (`tareas`).
- Lo que se renueva no cambia.
- El foco sigue en el botón.

**Reglas estáticas de las PARADAS** (grep sobre los archivos de producción de `src/`):
1. `mensajeDelAvisoDeCalificar` solo aparece en `features/tareas/hooks.ts` y `features/tareas/lib.ts`.
2. Ningún `disabled`, `?? []`, `fetch(` ni `console.` en `tareas/lib.ts`, `data.ts` ni `hooks.ts`: grep vacío.
3. CAL-T-99: grep vacío de `Default_Ignorable_Code_Point`, `u{2800}`, `u{1D159}`, `u2800`, `CARACTER_VISIBLE`, `contarCaracteresVisibles =`, `normalizarTextoLargo =` y `\r\n|\r`.
4. `esErrorDeCursor` se define una sola vez, en `lib/errores-de-api.ts:40`.
5. `calificaciones`: `git diff --stat ad10844` vacío y 11 archivos de producción.
6. `TraduccionDeErrores` solo aparece en `tareas/data.ts`: `import type` y `satisfies`.
7. Ningún invisible literal: lo comprobé con un script de Python (categorías Cf, Zs, Zl, Zp, Cc y Mn, más U+2800, U+1D159 y los rellenos Hangul) sobre los 6 archivos de esta ronda; dio 0.
8. `styles/clases-r1.ataque`: `grep -c "enEspera="` en `adjuntos-de-publicacion.tsx` = 1.
9. `entregas-01e-r2.ataque`: `alFallarLaDescarga?: (error: unknown) => void` sigue en la línea 143, y no hay `disabled`, `?? []`, `fetch(`, `console.`, importaciones de `@/features` ni `_blank`. Lo confirman `hooks.ts` sin tocar y la corrida en verde.

**V-01:** con el comando de V-01, contra las filas de "Tabla de SHA-256 de las 208 `*.ataque` al cierre de la ronda 1" de `reporte-tester.md`, en minúsculas: base 208, actual 208, `diff` vacío, `IGUALES`. **208 de 208 iguales.**

**PARADAS:** ninguna. PA-9 no aplica: DH-6 está autorizada y no cambié `AdjuntosDePublicacionProps`, `descargar`, `hooks.ts` ni los textos. PA-10 no aplica. Ninguna prueba ajena falló (PA-1).

**Desviaciones del plan:** ninguna en producción.
- En CH3-A25, `publicacionYComentarioParamSchema` va en dos filas, una por campo, para cubrir las dos filas del inventario.
- En CH3-A26 junté (a) y (b) en un mismo caso, porque (b) es "después de asentarse (a)", y dejé (c) en otro.

**Pendiente o fuera de alcance detectado:**
- "Dos fallos seguidos" y "vista desmontada" de la descarga no tienen caso propio; los describo arriba según el código.
- `id: id:` de admin (M-04) queda para 03c.
- Con el aviso de Vite por el chunk de más de 500 kB no hice nada: sale igual que en la ronda 1.
- Salidas de las corridas en el scratchpad: `r2-lint-final.txt`, `r2-test-final.txt` y `r2-build-final.txt`.
