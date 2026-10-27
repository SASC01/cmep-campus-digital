# Resumen del programador — CHORE-03 · 03a (primera entrega, 2026-10-26)

> Transcripción del orquestador: el programador entregó este resumen como texto en su respuesta final; se copia tal cual, sin cambiar contenido.

Plan: docs/trabajo/CHORE-03-errores-api/plan.md (Enmienda 1, aprobado; subentrega 03a)
Pasos completados: 9 de 9 (pasos 1 a 9 de 03a; el paso 0 era la ronda 0 del tester)

Archivos creados / modificados (todo bajo frontend/src/):
- Modificados: lib/errores-de-api.ts, features/tareas/data.ts, features/tareas/lib.ts, components/adjuntos/lib.ts, features/tareas/detalle-tarea-view.tsx, editar-tarea-view.tsx, entregas-view.tsx, entrega-de-alumno-view.tsx, components/hilo-privado.tsx, components/tu-trabajo.tsx (en las vistas solo cambian la llamada y su importación; Prettier partió la importación de tu-trabajo.tsx).
- Creados: lib/errores-de-api-fuera-de-contrato.ts; pruebas lib/errores-de-api.test.ts, lib/errores-de-api-estatico.test.ts, features/tareas/errores-ch3.test.ts, components/adjuntos/errores-ch3.test.ts, features/tareas/formularios-ch3.test.tsx, features/tareas/consultas-ch3.test.tsx, features/tareas/recuperar-ch3.test.tsx.
- `quitarPrefijoDeCampo` sigue en el contrato (se borra en 03b). `PREFIJO_DE_RUTA` y la importación de `quitarPrefijoDeCampo` salieron de tareas/lib.ts. No toqué ningún hooks.ts, ninguna prueba existente, shared/ ni backend/. `git diff --stat ad10844 -- frontend shared backend infra CLAUDE.md AGENTS.md .claude README.md`: 11 archivos, todos de la lista de 03a, más la C-1 del tester. Los docs/*.md modificados son los de la parte A del arquitecto.

Verificación (desde frontend/, una suite a la vez; antes de correr revisé con Get-CimInstance que no hubiera ningún vitest corriendo):
- lint: `npm run lint` → salida 0; última línea `> tsc -b` (antes: `All matched files use Prettier code style!`)
- test: `npm run test` → salida 0; `Test Files  204 passed (204)` · `Tests  3426 passed (3426)` · `Duration  124.74s`; `grep -c "Test timed out"` = 0
- build: `npm run build` → salida 0; `✓ built in 1.38s`. Vite avisa que hay un chunk de más de 500 kB; es un aviso, no un error, y no comprobé si ya salía en la base.
- prisma validate: n/a

Pruebas requeridas (las tareas viven en features/tareas/):
- CH3-A01 → lib/errores-de-api.test.ts › "CH3-A01: quitarRutaDelMensaje quita cada ruta una sola vez y deja intacto lo que no empieza con una ruta"
- CH3-A02 → ídem › "CH3-A02: textoVisibleOGenerico da el genérico ante cada resto sin texto visible y deja el texto visible tal cual"
- CH3-A03 → ídem › "CH3-A03: mensajeDeErrorDeApi recorre la tabla y respeta los ids, los códigos fijos, los del servidor y lo que no es ApiError"
- CH3-A04 → ídem › "CH3-A04: mensajeDeErrorDeConsulta da el respaldo ante toda la tabla y respeta los ids, los códigos fijos y los del servidor"
- CH3-A05 → ídem › "CH3-A05: esErrorDeCursor da lo mismo que antes sin campos y reconoce la lista de campos que recibe"
- CH3-A06 → ídem › "CH3-A06: la tabla trae cada clase requerida, ninguna ruta con texto fijo ni de cursor y ningún resto sin texto visible"
- CH3-A07 → ídem › "CH3-A07: erroresDeFormularioDeApi con mensajeDeErrorDeApi da el genérico en el campo pintado sin texto visible y null en las rutas de la tabla"
- CH3-A08 → tareas/errores-ch3.test.ts › "CH3-A08: mensajeDeErrorTareas recorre la tabla, da el genérico ante un código con mensaje del servidor sin texto visible y conserva los textos fijos de los ids" (comprueba que son 14 códigos)
- CH3-A09 → ídem › "CH3-A09: mensajeDeConsultaTareas da el genérico ante toda la tabla y conserva los ids y los códigos con mensaje del servidor"
- CH3-A10 → ídem › "CH3-A10: errorDeEnlacesDeApi y errorDeTextoDeApi dan el genérico en su campo sin texto visible y null en las rutas de la tabla"
- CH3-A11 → ídem › "CH3-A11: erroresDeLaTareaDeApi da el genérico en el título y en una fila de la rúbrica sin texto visible y null en las rutas de la tabla"
- CH3-A12 → ídem › "CH3-A12: calificar da el genérico en sus campos sin texto visible, null en las rutas de la tabla y el aviso es el de mensajeDeErrorTareas"
- CH3-A13 → components/adjuntos/errores-ch3.test.ts › "CH3-A13: con ARCHIVO_INVALIDO sin texto visible da el texto fijo de ARCHIVO_INVALIDO del módulo; con mensaje, el de siempre"
- CH3-A14 → tareas/formularios-ch3.test.tsx, dos it.each sobre los 7 formularios (crear, editar, entregar, comentario del alumno, comentario del maestro, panel con rúbrica y panel sin rúbrica):
  - "CH3-A14: $formulario.nombre con $nombre da un solo aviso legible, ningún ErrorDeCampo, conserva lo escrito y el botón sale de la espera" (F1, F3 y F4: 21 casos)
  - "CH3-A14: $formulario.nombre con F2 en $campo.prefijo ($resto) marca ese campo con el genérico, sin aviso, con el foco donde va un error de campo con mensaje" (titulo, enlaces.0, texto, comentario, puntajes.0.puntos y calificacion, cada uno con "   " y "\u{200B}": 18 casos)
- CH3-A15 → ídem › "CH3-A15: el panel con rúbrica ante %j da un solo mensaje legible y conserva lo escrito" (5 entradas)
- CH3-A16 → ídem › "CH3-A16: $control.nombre con $nombre da exactamente un aviso legible" (anular, borrar sin confirmar y con confirmar; 12 casos) y "CH3-A16: la descarga de un adjunto (alFallarLaDescarga) con %s da exactamente un aviso legible" (4 casos)
- CH3-A17 → tareas/consultas-ch3.test.tsx:
  - "CH3-A17: $nombre con «limite: Too big: expected number» muestra el genérico, nunca el texto en inglés ni la ruta" (6 primeras cargas)
  - "CH3-A17: $nombre con «claseId: x» sigue dando «No tienes acceso a esta clase.»" (las mismas 6)
  - "CH3-A17: %s con «limite: Too big: expected number» avisa una vez con el genérico" (los 3 "Ver más")
- CH3-A18 → tareas/recuperar-ch3.test.tsx › "CH3-A18: $nombre tras F2: el mismo botón manda una petición nueva y, si responde bien, el ErrorDeCampo desaparece" (6 formularios)
- CH3-A19 → ídem › "CH3-A19: con el genérico bajo el comentario del alumno, ir a «Trabajo de clase» y volver al detalle antes de 30 s quita el error y «Enviar comentario» manda un POST nuevo"
- CH3-A20 → lib/errores-de-api-estatico.test.ts › "CH3-A20: features/tareas y components/adjuntos no manipulan error.message; la expresión de ruta vive solo en el contrato; la tabla común no importa de features/ y ningún archivo de producción la importa"
- CH3-A21 → tareas/consultas-ch3.test.tsx › "CH3-A21: «Ver más alumnos» de la lista de entregas: un aviso genérico tras el reintento, el botón sigue y, al repetir, se pide de nuevo la página sin un segundo aviso" (con el `Providers` real: retry 1)
- CH3-A22 → ídem › "CH3-A22: «Ver más comentarios» del hilo %s: un aviso genérico tras el reintento, el botón sigue y, al repetir, se pide de nuevo la página sin un segundo aviso" (hilo del alumno y del maestro, con "limite:" y con "cursor:": 4 casos)
- CH3-A23 → tareas/formularios-ch3.test.tsx › "CH3-A23: $formulario.nombre con $nombre en la solicitud de subida da un solo aviso con el archivo, ningún ErrorDeCampo, conserva lo escrito y no envía" (crear y entregar con F1, F3 y F4: 6 casos)
- CH3-A24 → lib/errores-de-api-estatico.test.ts › "CH3-A24: ni la tabla común, ni el contrato, ni las pruebas nuevas del chore tienen un carácter invisible literal"
Indicación del humano: CH3-A14, A16, A18 y A23 son `it.each` sobre los formularios o controles, con una sola función de montaje por archivo (`montar`).

Conteos:
- 7 archivos nuevos con 108 casos, de `npx vitest list` sobre los 7 archivos (108 líneas): errores-de-api 7, errores-de-api-estatico 2, tareas/errores-ch3 5, adjuntos/errores-ch3 1, formularios-ch3 66, consultas-ch3 20, recuperar-ch3 7.
- Por id: A01–A13 1 cada uno; A14 39; A15 5; A16 16; A17 15; A18 6; A19 1; A20 1; A21 1; A22 4; A23 6; A24 1.
- La corrida completa (`npm run test`) dio 204 archivos y 3426 casos; en la ronda 0 eran 197 y 3318: +7 archivos y +108 casos, coinciden.
- Comprobé que las pruebas detectan el defecto: con la expresión vieja y sin la regla de visibles en el contrato fallan 57 de 71 casos de formularios-ch3 y tareas/errores-ch3. Con el "Ver más" del hilo mostrando `error.message` fallan 6 de 20 de consultas-ch3. Las dos modificaciones fueron temporales: restauré los archivos antes de la corrida completa. La copia de respaldo quedó un momento en %TEMP% en vez del scratchpad; ya la borré.

Matriz de avisos y recargas (§D-6, `tareas`). Fuera de lo que se marca como nuevo, nada cambia:
- Lo que se renueva no cambia en ningún disparador: ningún hooks.ts cambió, y siguen las 3 llamadas a `renovarTrasErrorDeLaEntrega(` y las 5 a `avisarDelErrorDeLaEntrega`.
- Clases de error en las acciones:
  - VALIDACION de un campo pintado con mensaje: ErrorDeCampo con el mensaje, sin aviso (como hoy).
  - F2 (campo pintado sin texto visible): ErrorDeCampo con el genérico, sin aviso (nuevo). El foco va al mismo control que con un error con mensaje (lo compara CH3-A14).
  - F1 y F4: un toast con el resto. Antes, F4 mostraba la ruta.
  - F3: un toast con el genérico. Antes salía un toast en blanco.
  - Código con mensaje del servidor: su mensaje; si no tiene texto visible, el genérico (nuevo).
  - 5xx y red: el genérico, como hoy.
  - En los toasts el foco sigue en el botón (lo comprueba CH3-A14).
- En vuelo a la vez y con la vista desmontada: sin cambio en todas las acciones. Las guardas con ref siguen y los avisos siguen en los hooks.
- Por disparador:
  - Crear y editar tarea: lo de arriba. TAREA_MODIFICADA da un toast con su mensaje y recarga (sin cambio).
  - Solicitud de subida (crear y entregar): un solo toast `errorRechazado(nombre, resto o genérico)`, sin ErrorDeCampo, sin enviar. ARCHIVO_INVALIDO sin texto visible da el texto fijo. Si falla el PUT al almacén, el texto de siempre.
  - Entregar: `enlaces.N` va como ErrorDeCampo en "Enlace". ENTREGA_VACIA, como ErrorDeCampo fijo. Los 409 dan un toast con su mensaje y renuevan la tarea y el trabajo (sin cambio).
  - Anular y borrar: un solo toast. TAREA_CON_ENTREGAS va en línea en la confirmación (acciones-de-la-tarea:73); sin texto visible ahora da el genérico, antes quedaba en blanco.
  - Comentario del alumno y del maestro: `texto` va como ErrorDeCampo; lo demás, un toast. Si sale bien, el campo se vacía y el foco vuelve al campo.
  - Calificar: comentario, puntajes.N.puntos y, sin rúbrica, calificacion van como ErrorDeCampo con foco en el primer error. Lo no pintado da un toast (`mensajeDelCampoDeCalificacion` y `mensajeDelAvisoDeCalificar` ya dan lo mismo que `mensajeDeErrorTareas`). Los 409 dan un toast y recargan (sin cambio).
  - Descarga de un adjunto: un solo toast; F1 y F4 con el resto, F3 con el genérico.
- Consultas que reemplazan la vista (detalle, "Editar tarea", entregas de una tarea y su lista, entrega de un alumno y su tarea, primera carga del hilo, "Tu trabajo"):
  - Un VALIDACION que no es de un id da `MensajeError` con el genérico. Antes salía el texto de zod.
  - claseId, tareaId y alumnoId dan su texto fijo.
  - Código con mensaje del servidor: su mensaje, o el genérico si no tiene texto visible.
  - 5xx y red: el genérico.
  - El foco no cambia (`useFocoAlPerderseElControl` no se tocó). Las recargas con datos en caché siguen con `useAvisoDeRecargaFallida` y `avisoDeRecargaFallidaAlEditar`, de texto fijo.
  - Con la vista desmontada no hay aviso en una consulta.
- "Ver más alumnos" y "Ver más comentarios":
  - Un VALIDACION da un solo toast con el genérico. El reintento de retry: 1 cae dentro de la misma llamada, así que da un solo aviso.
  - El botón sigue en pantalla y sale de la espera; lo ya cargado sigue.
  - El cursor de la lista de entregas sigue con su texto en la lista, sin toast.
  - El cursor del hilo ahora da el toast genérico (cambio declarado en §D-4; antes salía "el cursor no es válido").
  - Lo que reemplaza la vista o redirige no avisa.
  - Con la vista desmontada no avisa (`montadoRef`).
  - En vuelo a la vez: `pidiendoMasRef` más `isFetching` dejan pasar una sola petición.
  - Dos fallos seguidos (O-3): cada pulsación que falla da un toast nuevo (un aviso por fallo nuevo) y el botón queda disponible. No hay caso de dos fallos seguidos; CH3-A21 y CH3-A22 cubren fallo y luego acierto.

Hermanos (cada uno: si el remedio aplica y si se aplicó):
- `mensajeDeErrorTareas`: aplica, aplicado (envoltorio).
- `mensajeDeConsultaTareas`: aplica, aplicada (nueva).
- `erroresDeLaTareaDeApi`: aplica sin cambio de código (hereda del contrato).
- `errorDelCampoDeApi`, `errorDeEnlacesDeApi`, `errorDeTextoDeApi`: aplica, aplicado.
- `mensajeDelCampoDeCalificacion` (N-33), `mensajeDelAvisoDeCalificar` (N-36; conserva el nombre) y `erroresDeCalificacionDeApi`: aplica, aplicado.
- `avisoDeFalloAlSubir`: aplica, aplicado.
- Los usos de acción de `mensajeDeErrorTareas` heredan el contrato: AdjuntosDePublicacion en detalle-tarea-view:108, entrega-de-alumno-view:208 y entrega-realizada:88; acciones-de-la-tarea:73; formulario-tarea:224 y formulario-de-entrega:135 (subida); los toasts de hooks.ts. Aplica, aplicado.
- Las 10 llamadas de consulta de §D-4: detalle:72 (era la :71; la línea se movió por la importación), editar:71, entregas:111, :159 y :163, entrega-de-alumno:170 y :174 (eran :169 y :173), hilo:175 y :183, tu-trabajo:54 (era :49). Aplica, aplicado.
- `avisoDeRecargaFallidaAlEditar` (tareas/lib.ts) y `useAvisoDeRecargaFallida`: no aplica. Son textos fijos y no leen el mensaje del servidor; no se tocaron.
- Fuera de 03a, a propósito, quedan sin aplicar: `features/clases` (`quitarPrefijoDeCampo`, `return error.message` en lib.ts:151, `.message.slice` en lib.ts:422) es de 03b; `features/admin` (lib.ts:42) y `features/auth` (lib.ts:44) son de 03c.

Reglas estáticas que se rompen sin darse cuenta (una por una):
1. `mensajeDelAvisoDeCalificar` solo aparece en tareas/hooks.ts y tareas/lib.ts: `grep -rl mensajeDelAvisoDeCalificar src` sin las pruebas.
2. Ningún `disabled`, `?? []`, `fetch(` ni `console.` en tareas/lib.ts, data.ts ni hooks.ts: `grep -nE "\sdisabled(=|\s|>|\})|\?\?\s*\[\s*\]|\bfetch\(|\bconsole\."` sobre los tres, sin resultados. Las palabras de §D-0.9 las verifica la corrida completa en verde (entregas-01d-r3, entregas-01e-r1 y CAL-1C13 pasan).
3. CAL-T-99: el grep -lE de `Default_Ignorable_Code_Point`, `⠀`, `\u{2800}`, `\u{1D159}`, `contarCaracteresVisibles =`, `CARACTER_VISIBLE` y `normalizarTextoLargo =`, y el grep -F de `\r\n|\r`, salen vacíos en producción. Un script de Python confirma que ningún archivo de producción tiene U+2800 ni U+1D159 literales. `contarCaracteresVisibles` se importa de `@campus/shared`.
4. `esErrorDeCursor` se define una sola vez: `grep -rnE "(const|function)\s+esErrorDeCursor\b"` da solo lib/errores-de-api.ts:40.
5. `features/calificaciones`: `git diff --stat ad10844 -- src/features/calificaciones` vacío; 11 archivos de producción (6 más 5 en components/).
6. Tipos: `TraduccionDeErrores` vive en lib/; tareas/data.ts la importa con `import type` y la usa solo en `satisfies` (grep).
7. Ningún invisible literal en la tabla, el contrato ni las pruebas nuevas: un script de Python revisa 9 archivos, sin resultados, y CH3-A24 pasa.

V-01: `git ls-files -co --exclude-standard | grep -E '\.ataque\.test\.tsx?$' | sort | xargs sha256sum`, contra la tabla "Tabla de SHA-256 de las 204 `*.ataque` al cierre de la ronda 0 de CHORE-03 03a" de reporte-tester.md (hashes en minúsculas): base 204, actual 204, `diff` vacío. **204 de 204 iguales.**

Hallazgos atendidos: no aplica (primera entrega de 03a).

PARADAS: ninguna. `satisfies` compiló, `tsc -b` y `vite build` aceptan `\p{…}/u`, no hubo que tocar ningún hooks.ts ni pruebas existentes, y ninguna prueba normal falló.

Desviaciones del plan: ninguna en el código. Lecturas mías de las pruebas que conviene que revise el manager:
- CH3-A12: con dos criterios enviados, `erroresDeCalificacionDeApi` con "calificacion:" da `null` por diseño (T-02: con rúbrica no se pinta). Lo pruebo así, y sin criterios da el genérico.
- CH3-A16, descarga: llamo directo al callback de `useAvisoDeRecargaFallida` con el `ApiError`, en un `renderHook`, sin una petición de descarga real.
- CH3-A19: el regreso al detalle es con el historial (`router.navigate(-1)`) a los 10 s.
- CH3-A24: el archivo estático no se lee a sí mismo, porque `import.meta.glob` no incluye a quien lo importa. Lo verifiqué con el script de Python.
- CH3-A17: el caso de «claseId: x» lo extendí a las 6 primeras cargas.
- En la tabla, U+0085 va como `\u{0085}`, con llaves según la nota N-02; §D-3 lo escribía `\u0085`. Es el mismo valor.

Pendiente o fuera de alcance detectado:
- El estado vecino "dos fallos seguidos" en los dos "Ver más" (O-3) no tiene caso propio; lo deja el plan para el tester.
- El aviso de Vite por el chunk de más de 500 kB del build: sin verificar si es previo.
- Los hermanos de clases, admin y auth quedan para 03b y 03c, según el plan.
