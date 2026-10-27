# Revisión del Manager — DOCS-04 · nuevos requisitos — plan y documentos
Veredicto: CAMBIOS REQUERIDOS (cuatro correcciones de texto, en su lugar; la segunda revisión solo verifica esos hunks)
Verificación propia: sin `lint`, `test` ni `build` por instrucción del encargo (solo documentación). `git diff --stat 06dbc7c -- backend frontend shared CLAUDE.md AGENTS.md .claude infra`: **vacío**. `git diff --stat 06dbc7c`: 5 archivos, 177 inserciones, 28 borrados (ESSENTIALS 28, ARCHITECTURE 27, DESIGN 14, ESTADO 26, PRD 110), igual que lo registrado en `aprobacion.md`. Tablas Markdown: cada fila agregada tiene las columnas de su encabezado (cotejo mecánico de los hunks de los cinco documentos). Sin emojis. "Materia" solo aparece en `ARCHITECTURE.md` D-31. RF-60 a RF-74 únicos y correlativos.

Contrato: la petición literal del humano en `aprobacion.md` (2026-10-26).

## Problemas que bloquean

### M-01 — RN-06 decide en silencio el acceso a una clase archivada y contradice RF-69
Dónde: `docs/PRD.md`, RN-06, viñeta nueva: «Una clase archivada sale de las listas de sus maestros y alumnos; **solo el Administrador la ve** y la restaura (RN-10)».
Por qué importa: la petición dice que la clase archivada «desaparece de las listas» de maestros y alumnos y que el alumno «conserva lectura de sus calificaciones». «Solo el Administrador la ve» (1) contradice RF-69 y RN-10 (el alumno sí ve sus calificaciones) y (2) cierra en silencio que el maestro deja de entrar, que RF-69, RN-10 y P-08 dejan como **pendiente por confirmar**. RN-06 es una regla que el plan de ADMIN-01 leerá literal.
Qué se espera: que RN-06 diga solo lo que la petición confirma (sale de las listas; el Administrador la ve en la lista de archivadas y la restaura; el alumno lee sus calificaciones en "Clases anteriores") y remita lo demás a RF-69 como pendiente.

### M-02 — RN-10 dice que duplicar copia «lo del Administrador», más de lo que la petición permite
Dónde: `docs/PRD.md`, RN-10, última viñeta: «Duplicar copia la estructura y **lo del Administrador**, nunca a las personas ni su trabajo (RF-71)».
Por qué importa: la petición enumera lo que **no** se copia: avisos y actividades, sin distinguir autor. Los avisos y las actividades que publicó el Administrador son «lo del Administrador», así que la regla, leída literal, los copiaría. Cambia el sentido de RF-71.
Qué se espera: que RN-10 copie la lista cerrada de RF-71 (nombre, descripción, recursos de aprendizaje y secciones; nada más), o que remita a RF-71 sin parafrasear.

### M-03 — D-30 y ESSENTIALS registran como decisión lo que es previsión técnica del arquitecto
Dónde: `docs/ARCHITECTURE.md` §20, D-30 («el foro reutiliza la fila de `tareas` y la de `entregas`…», «exportación a .xlsx con una librería detrás de un adaptador», con «el foro como tabla aparte» como alternativa descartada, todo bajo «Decisión del humano del 2026-10-26, con el cliente»); `docs/ARCHITECTURE-ESSENTIALS.md`, «Reglas de negocio», viñeta «Foro» («y su fila de `entregas` por alumno para el estado y la calificación»), sin la marca de previsto.
Por qué importa: el humano decidió el alcance (secciones, foro, exportar, archivar, duplicar, exámenes en el hito 3), no el modelo de datos. El propio plan (S-06) y `ARCHITECTURE.md` §14 dicen «Previsto (DOCS-04), no migrado. Cada encargo confirma o cambia esto», pero D-30 lo atribuye al humano y ESSENTIALS, que manda, lo enuncia como regla. El arquitecto de FORO-01 lo encontraría ya decidido. La petición no pide una librería: la exportación también podría generarse en el navegador (ver R-01 abajo).
Qué se espera: D-30 separa lo que decidió el humano (alcance, orden, ENVIVO sin cambios, exámenes por confirmar) de lo previsto por el arquitecto (foro sobre `tareas` y `entregas`; mecanismo de la exportación), con la marca «previsto, lo confirma FORO-01 / CALIFICACIONES-02»; la alternativa «tabla aparte» deja de figurar como descartada por el humano. La viñeta «Foro» de ESSENTIALS lleva «previsto (S-06; lo confirma FORO-01)» en lo que toca a `entregas`.

### M-04 — RF-65 excluye columnas sin que la petición lo diga y con una cita que no lo sostiene
Dónde: `docs/PRD.md` RF-65 («No incluye correos, estado de pago ni restricción de acceso (RN-02)»); `docs/ARCHITECTURE-ESSENTIALS.md`, viñeta «Exportar calificaciones» («sin correos, estado de pago ni restricción»).
Por qué importa: la petición fija el contenido («alumnos × actividades, con categorías y promedio») y no excluye nada; quitar el correo es una decisión silenciosa (un archivo para Excel suele necesitar un identificador además del nombre). RN-02 no la sostiene: el maestro y el administrador **sí** pueden ver el estado de pago de sus alumnos. Excluir el estado de pago y la restricción es prudente (el archivo sale de la plataforma), pero es una recomendación, no una regla vigente.
Qué se espera: que las exclusiones queden como «recomendación, pendiente por confirmar» (con su motivo: el archivo sale de la plataforma y puede reenviarse) en el PRD y en ESSENTIALS, sin citar RN-02 como fundamento; y una pregunta corta en §11 (o en P-nn) sobre qué identifica al alumno en el archivo.

## Problemas que no bloquean

### N-01 — DE-05: el indicador de siete opciones a ancho natural choca con «solo `transition-transform`»
`DESIGN.md` §7 (orbes, «Rendimiento») dice que el indicador del control segmentado usa **solo** `transition-transform`. Con anchos distintos, el indicador cambia de ancho al pasar de una opción a otra: o el ancho salta sin transición mientras la posición se desliza, o se anima el ancho (prohibido), o se escala con `scaleX` (deforma el `rounded-row`). La viñeta de §7.3 promete «el mismo `transform` y la misma transición», que no alcanza para las tres cosas. Además, medir la opción activa no se puede comprobar en jsdom (sin diseño de página): las pruebas solo verían medidas simuladas.
Qué pasa con el indicador actual con 7 opciones: `w-1/5`, `grid-cols-5` y `translate-x-[400%]` no sirven; la alternativa de columnas iguales (`grid-cols-7`, `w-1/7`, traslados hasta `translate-x-[600%]`) funciona sin medir y se prueba con clases, pero cada columna mide lo que el rótulo más largo (unos 230 px): unos 1,600 px, con desplazamiento horizontal en todas las anchuras.
A 360 px: el área útil es de unos 320 px (360 − 2 × 16 − `p-1`). A ancho natural (unos 780 px) se ven dos o tres opciones; con columnas iguales, una y media. Las dos son viables con el desplazamiento dentro del grupo que ya existe (`max-w-full overflow-x-auto`, `w-max`), pero «la opción activa queda a la vista al entrar» es comportamiento nuevo (desplazar el grupo hasta ella) y el patrón actual no da ninguna pista visual de que hay más opciones a la derecha. «Caben desde 1024 px» es justo: a 1024 px el contenido mide unos 860 px (1024 − 24 − 96 − 20 − 24) antes del relleno del panel; CLASES-03 lo mide.
Mi opinión: la propuesta es viable si CLASES-03 decide explícitamente cómo cambia el ancho (recomiendo: el ancho cambia sin transición y solo la posición se desliza, que respeta la regla), o si el humano prefiere una tercera vía más simple: sin indicador deslizante, el fondo en la opción activa (cambia la regla de §7.3 y la decide el humano). Que el plan de CLASES-03 lo cierre antes de programar.

### N-02 — CLASES-03 va a chocar con pruebas `*.ataque` que el programador no puede tocar
15 archivos `*.ataque.test.ts(x)` del frontend nombran «Muro» o «Trabajo de clase», y 2 (`frontend/src/app/rutas-01d-r1.ataque.test.tsx`, `frontend/src/components/layout/estatico-r1.ataque.test.ts`) afirman el indicador de cinco opciones (`w-1/5`, `translate-x-[400%]`). El riesgo R-02 del plan habla de rutas, no de esto. El plan de CLASES-03 debe inventariar esas pruebas (grep, como pide `AGENTS.md`) y proponer su sustitución para que la arbitre el manager, en lugar de descubrirlo en una PARADA del programador.

### N-03 — P-03 («¿los alumnos ven "Recursos del docente"?») es la pregunta más delicada para el cliente
«Ambos maestros los ven» admite una lectura en que el bloque es solo para maestros (material de apoyo docente). La recomendación del arquitecto (los alumnos ven los dos bloques) es la que no les quita lo que hoy ven, y por eso coincido; pero si el cliente quería un bloque solo de maestros, el reparto de los materiales actuales por rol del autor ocultaría a los alumnos todo lo que hoy publican los maestros. Conviene plantearla al cliente con esa consecuencia escrita, no como confirmación.

### N-04 — Consecuencias derivadas, aceptables, que conviene que el humano vea
- El recordatorio de 24 h para foros (PRD §4.5, nota; `ARCHITECTURE.md` §10; ESSENTIALS «Trabajos diferidos») y «un foro vencido sin participación principal cuenta como sin entregar» (RN-05) no son literales de la petición: se derivan de «igual que una tarea» y «la entrega es participar». Coherentes; el humano puede vetarlos en P-09 o P-11.
- Las prioridades M de RF-60 a RF-71 y su colocación en el hito 1 son del arquitecto (S-05), pero el PRD no lo dice. Basta con que el humano las vea.

## Detalles menores
- PRD §6: «"Gradebook" del maestro, que suma "Exportar a Excel"»: el administrador también exporta (RF-65), desde «Gestión de clases».
- `ARCHITECTURE.md` §7: `GET /clases/anteriores` convive con `/clases/{claseId}`; el plan de ADMIN-01 comprueba la guarda `onRoute` de la cadena y el orden de rutas de Fastify.
- ESTADO 2b, ENVIVO: además de la nota literal, suma «El bloque de grabaciones de "Recursos" se define al planear ENVIVO.». Sale de la petición (punto 1), así que es aceptable.
- R-01 en `ARCHITECTURE.md` §11 punto 8: si la exportación pasa por el almacén, depende de `LIMPIEZA_DIARIA`, que se construye antes de DEPLOY, es decir, después de CALIFICACIONES-02. El plan de esa entrega tiene que resolver la limpieza de sus propios archivos.
- Conteo de vistas del PRD §6 verificado: estudiante 10 + 4 secciones + 2 = 16; maestro 9 + 4 = 13; administrador 6; total 35 + 3.

## Cotejo requisito por requisito (petición → documentos)

| Requisito de la petición | RF / sección | Resultado |
|---|---|---|
| 1. CLASES-03: siete pestañas en ese orden | RF-60; ESSENTIALS «Secciones»; DESIGN §7.16 | Fiel (Personas y Foro con P-01 y P-02) |
| 1a. Avisos reemplaza a Muro; solo anuncios del admin y de los maestros; comentarios conservados | RF-61, RF-12, RF-33, RF-59 | Fiel (salida de tareas y materiales: S-03/P-04) |
| 1b. Actividades de aprendizaje reemplaza a Trabajo de clase; después foro y exámenes | RF-62, RN-08 | Fiel |
| 1c. Recursos: dos bloques, autoría, reparto por rol del autor, grabaciones con ENVIVO | RF-63, RN-07, RN-09 | Fiel (P-03, P-05, P-06 pendientes; ver N-03) |
| 1d. Dudas: hilo abierto, resuelta y borrar por maestro y admin, no se califica, hilo privado conservado | RF-64, RN-07, RN-09 | Fiel (P-07 pendiente) |
| 2. CALIFICACIONES-02: .xlsx alumnos × actividades con categorías y promedio, maestro y admin | RF-65 | **Cambiado:** exclusiones no pedidas (M-04) |
| 3. FORO-01: planteamiento como una tarea, principal y réplicas, califica con puntos, pondera, «la entrega es participar» | RF-66 a RF-68, RN-05, RN-08 | Fiel en el PRD; **D-30 y ESSENTIALS** dan el modelo de datos por decidido (M-03) |
| 4. ADMIN-01: pendientes de §3 con destino ADMIN | ESTADO 2b punto 4 | Fiel |
| 4a. Archivar: fuera de las listas, «Clases anteriores», lista de archivadas, restaurar | RF-69, RN-10 | Fiel en RF-69 y RN-10; **cambiado en RN-06** (M-01) |
| 4b. Borrar definitivamente solo una archivada, con confirmación y conteo | RF-70, RN-10 | Fiel |
| 4c. Duplicar: qué copia y qué no | RF-71 | Fiel en RF-71; **cambiado en RN-10** (M-02); maestros del duplicado como pendiente (DE-03) |
| 5. EXAMENES-01, hito 3, por confirmar, con sus cuatro preguntas | RF-72, RF-73, RN-11, §9, §11 p. 16 | Fiel |
| 6. EXAMENES-02: medidas, límites explícitos (capturas, otro dispositivo), sin grabar video | RF-74, RN-11, ARCHITECTURE §19 riesgo 11 | Fiel |
| Orden de la hoja de ruta | ESTADO 2b | Fiel |
| Nota de Zoom literal en ENVIVO | ESTADO 2b punto 9 | Fiel, literal |
| «Materia» como alternativa futura en ARCHITECTURE, sin implementar | D-31 | Fiel; no se cuela en PRD, ESSENTIALS ni DESIGN |
| ENVIVO no se toca | todos | Fiel (ver abajo) |

Nada de la petición falta.

## ESTADO.md, hunk por hunk
**Del orquestador (antes del arquitecto; fuera de esta revisión salvo coherencia):** línea 5 (última actualización); sección 1, fila N-19 (#23, merge `06dbc7c`, que coincide con `git log`); sección 2, párrafo de DOCS-04. Pendiente para el orquestador: el párrafo de CALIFICACIONES-01 de la sección 2 sigue diciendo «Siguiente encargo: … (ADMIN, según el orden de la sección 2b)», que la hoja nueva deja sin vigencia. Y la línea 5, al cerrar.
**Del arquitecto:**
- 2b, bloque nuevo «Hoja de ruta»: orden literal exacto (DOCS-04 → CLASES-03 → CALIFICACIONES-02 → ADMIN-01 → FORO-01 → NOTIFICACIONES → DEPLOY → ENVIVO → hito 3). Los dos `chore` van en el punto 5 como «lugar propuesto por el arquitecto, por confirmar (P-12)». Incluye el recordatorio de las reglas de planes (`VALIDACION` fuera de contrato y frases de recuperación). La nota de ENVIVO es literal. Correcto.
- 2b, viñeta de los dos `chore`: suma su lugar por confirmar y la observación de que CLASES-03 renombra los textos «Vuelve a abrir Trabajo de clase…». Correcto y útil.
- 2b, «Orden … (2026-10-02)»: marcado como sustituido. Correcto.
- Sección 3: `key={claseId}` suma ADMIN-01 de forma condicional; N-47 → CLASES-03; O-1 y N-01 de FIX-CLASES → ADMIN-01 (RF-69 y RF-70). Las tres son coherentes. Ninguna otra fila cambió.
- Secciones 1, 2, 4, 5 y 6: el arquitecto no las tocó.

## ENVIVO
§12 de `ARCHITECTURE.md` no aparece en el diff. Las menciones de LiveKit, «en vivo» y `GRABACION_LISTA` en los hunks de ESSENTIALS son texto anterior, que se reemite porque la línea ganó una frase al final; su contenido no cambia. RF-22, RF-23, RF-40, RF-41 y el hito 2 siguen igual. Zoom solo aparece en ESTADO 2b. Las únicas referencias nuevas a ENVIVO son el bloque de grabaciones «pendiente, se define al planear ENVIVO» (de la petición) y «ENVIVO sin cambios» en D-30. Verificado.

## Coherencia entre documentos
- Lo previsto está marcado como tal en ARCHITECTURE §7 y §14 y en ESSENTIALS («Tablas», «Autorización», «Archivos»). Las excepciones son las de M-03.
- RN-08 a RN-11 no contradicen la autoría vigente: los recursos del docente y las dudas siguen RN-07, y el administrador borra cualquiera. Tampoco la calificación general (el foro pondera como una tarea) ni el estado de pago (nada nuevo lo devuelve a un alumno). Las contradicciones son las internas de M-01 y M-02.
- El vocabulario «actividad» entra por definición y regla de lectura (RN-08), sin reescribir RF existentes: las referencias de los planes cerrados no se rompen. Bien resuelto.
- La contradicción del no-objetivo de exámenes (§2) frente a RF-72 y RF-73 queda resuelta («en la fase 1»). También la de «una clase nunca queda sin maestro» frente a duplicar (DE-03, pendiente) y la de «mover organiza la clase» frente a recursos de aprendizaje (DE-04).
- La exportación no nombra librería ni proveedor. R-01 queda como decisión del humano en el plan de CALIFICACIONES-02.

**R-01, mi opinión:** coincido en que (a), generarla en el worker, subirla al almacén y descargarla con URL prefirmada, es la única que cumple las dos reglas sin excepción. Pide a cambio una interfaz asíncrona (pedir, esperar, descargar), un prefijo nuevo y la limpieza de esos archivos (ver «Detalles menores»). Antes de elegir, propongo que el plan evalúe una opción (c): la API devuelve la matriz en JSON con las mismas consultas del gradebook y el navegador arma el .xlsx. Ningún archivo pasa por Node, no hay cola ni almacén, y sí hay una dependencia nueva del frontend y la regla de paginación que resolver. La (b), responder el archivo desde la API, solo con la excepción escrita en ESSENTIALS y aprobada por el humano.

## DESIGN.md
Solo §7.3 (una viñeta), §7.16 (una viñeta con subviñetas), §7.18 y §7.22 (una línea de remisión cada una). Todo son líneas agregadas; no hay borrados. Ningún token ni valor cambia, y las tablas de tokens no aparecen en el diff. Las marcas «propuesta (DOCS-04)» están donde se propone. El análisis de DE-05 está en N-01.

## Tono y forma
Español de México, sin emojis. Los hunks son quirúrgicos: frases añadidas al final de filas y viñetas existentes y bloques nuevos, sin reescrituras. Las tablas están íntegras.

## Opiniones sobre P-01 a P-12 y DE-03, DE-05 y DE-09
| # | Recomendación del arquitecto | Mi opinión |
|---|---|---|
| P-01 | «Personas» en los tres roles | Coincido. |
| P-02 | «Foro» llega con FORO-01 | Coincido: una sección vacía durante dos encargos confunde. |
| P-03 | Los alumnos ven los dos bloques | Coincido, pero preguntarla al cliente con la consecuencia escrita (N-03). |
| P-04 | Tareas y materiales salen de «Avisos» | Coincido (es lo literal). |
| P-05 | Los temas siguen organizando los recursos | Coincido; la alternativa (recursos sin tema) perdería la organización de hoy. |
| P-06 | Los recursos conservan los comentarios | Coincido: es el cambio mínimo y no pierde datos. |
| P-07 | Preguntan y responden inscritos y maestros; el admin lee, marca y borra; cada autor borra lo suyo; solo texto | Coincido. |
| P-08 | Solo lectura; el maestro no entra; el alumno solo ve calificaciones | Coincido con un matiz: preguntar al cliente si el maestro necesita consultar las calificaciones de sus grupos archivados (aclaraciones). La exportación del admin lo cubre si la respuesta es no. |
| P-09 | Sin editar ni borrar; ve las de otros; réplicas cierran con la fecha; maestros replican; solo texto; sin hilo privado | Coincido. |
| P-10 | Secciones = temas; copiar categorías; el admin elige maestros; duplicar archivada | Coincido. |
| P-11 | Lo decide NOTIFICACIONES | Coincido. |
| P-12 | Los `chore` entre ADMIN-01 y FORO-01 | Coincido en respetar «después de ADMIN». Pero el argumento de DE-09 (no heredar mecanismos que se rediseñan) vale igual para CLASES-03, que agrega al menos tres formularios (duda, respuesta, editar recurso). Si el humano acepta moverlo, (a), la traducción de errores, rendiría más antes de CLASES-03. |
| DE-03 | Duplicar exige elegir de 1 a 2 maestros | Coincido: respeta «no copia maestros» y la invariante de RN-06. |
| DE-05 | Siete opciones a ancho natural | Viable con la condición de N-01 (cómo cambia el ancho sin animar algo distinto de `transform`). |
| DE-09 | Ver P-12 | Ver P-12. |

## Desacuerdos arbitrados
Ninguno: no hay hallazgos del tester en un encargo de documentación.

## Documentos a actualizar
- Las cuatro correcciones M-01 a M-04, en su lugar (PRD RN-06, RN-10 y RF-65; ARCHITECTURE D-30; ESSENTIALS «Foro» y «Exportar calificaciones»).
- Al cerrar, el orquestador actualiza la línea 5 y la sección 2 de `ESTADO.md` (el «Siguiente encargo» de CALIFICACIONES-01).
- `CLAUDE.md` y `AGENTS.md` siguen sin tocarse, como pidió el humano (R-07): cada plan propone su texto.

## Para el humano
- P-01 a P-12 (antes del plan de CLASES-03: P-01 a P-07), con las dos opiniones de la tabla. La más delicada para el cliente es P-03.
- DE-09/P-12: confirmar el lugar de los dos `chore` o adelantar (a) antes de CLASES-03.
- R-01: el mecanismo de la exportación, en el plan de CALIFICACIONES-02 (opciones a, b y c).

## Revisión de la Enmienda 1 — DOCS-04
Veredicto: **APROBADO CON OBSERVACIONES** (los documentos pueden ir al commit del humano; las observaciones son para los planes de CLASES-03, CALIFICACIONES-02 y ADMIN-01, no para estos documentos)
Verificación propia: sin `lint`, `test` ni `build` por instrucción del encargo. `git diff --stat 06dbc7c -- backend frontend shared CLAUDE.md AGENTS.md .claude infra`: **vacío**. `git diff --stat 06dbc7c`: 5 archivos, 179 inserciones, 29 borrados (ESSENTIALS 28, ARCHITECTURE 27, DESIGN 14, ESTADO 28, PRD 111). SHA-256 de `PRD.md`, `ARCHITECTURE.md`, `ARCHITECTURE-ESSENTIALS.md`, `DESIGN.md` y `plan.md`: iguales a los de `aprobacion.md` (Enmienda 1).

Método del cotejo: no había copia guardada de los documentos de la primera revisión, así que recuperé de la transcripción de mi primera corrida el `git diff 06dbc7c` que revisé entonces (los cuatro documentos y `plan.md`), le quité las líneas `index` y lo comparé con el `git diff` de hoy (`diff` de los dos diffs; `plan.md` con `--strip-trailing-cr`). Sugerencia de proceso para el orquestador: la regla de `AGENTS.md` de guardar copia antes de cada enmienda habla de `plan.md`; en un encargo de documentación conviene guardar también los documentos.

### Cotejo de los 14 hunks
| # | Hunk declarado | Cambió desde la primera revisión | Resultado |
|---|---|---|---|
| 1 | PRD RF-65 | Sí | Coincide |
| 2 | PRD RF-69 | Sí | Coincide |
| 3 | PRD RN-06 | Sí | Coincide |
| 4 | PRD RN-10, última viñeta | Sí | Coincide |
| 5 | PRD §11 «(P-01 a P-13)» | Sí | Coincide |
| 6 | PRD §11 pregunta 14 | Sí | Coincide |
| 7 | PRD §11 pregunta 17 | Sí (línea nueva; el encabezado del hunk pasa de `+369,13` a `+369,14`, consecuencia de la misma línea) | Coincide |
| 8 | ESSENTIALS «Capas», `adapters/` | Sí | Coincide |
| 9 | ESSENTIALS «Foro» | Sí | Coincide |
| 10 | ESSENTIALS «Exportar calificaciones» | Sí | Coincide |
| 11 | ARCHITECTURE §14, fila «Exportación .xlsx» | Sí | Coincide |
| 12 | ARCHITECTURE §20, D-30 | Sí | Coincide |
| 13 | DESIGN §7.3, viñeta «Con siete opciones» | Sí (una sola línea) | Coincide |
| 14 | `plan.md`: R-01 y la sección «Enmienda 1» | Sí: la línea de R-01 y las líneas 201 a 265, agregadas al final | Coincide |

Nada más cambió en los cuatro documentos ni en `plan.md`. `ESTADO.md` cambió en una sola línea desde la primera revisión, la del párrafo de CALIFICACIONES-01 en la sección 2 («Siguiente encargo»), que es del orquestador y que yo había pedido en «Documentos a actualizar»; no es de la enmienda del arquitecto. RF-60 a RF-74 únicos y correlativos; tablas íntegras (conteo mecánico de columnas por bloque en los seis archivos); sin emojis.

### M-01 a M-04
- **M-01 — resuelto.** RN-06 dice ahora solo lo confirmado: «sale de las listas de sus maestros y alumnos (inicio y barra lateral). El Administrador la ve en la lista de clases archivadas y la restaura, y el alumno conserva la lectura de sus calificaciones de esa clase en "Clases anteriores" (RF-69, RN-10). Si el maestro sigue entrando a una clase archivada y si consulta sus calificaciones está **pendiente por confirmar**». «Solo el Administrador la ve» ya no aparece en ningún documento (grep). RF-69 y la pregunta 14 suman la consulta de calificaciones del maestro, sin recomendación, como pedí. RN-10 («acceso del maestro… pendiente por confirmar»), ESSENTIALS «Autorización» (recomendación pendiente) y «Clases archivadas…» quedan coherentes con RN-06.
- **M-02 — resuelto.** RN-10: «Duplicar copia solo el nombre, la descripción, los recursos de aprendizaje y las secciones de la clase. **No** copia maestros, alumnos, avisos, actividades, recursos del docente ni calificaciones, sin importar quién los publicó (RF-71).» Es la lista cerrada de RF-71 y de la petición; «sin importar quién los publicó» cierra la lectura que permitía copiar lo del administrador. «Lo del Administrador» ya no aparece (grep).
- **M-03 — resuelto.** D-30 separa lo que decidió el humano («el alcance y el orden de los encargos»; el foro «se plantea, se califica y pondera como una tarea»; exportar a .xlsx «sin servicio externo») de un bloque «**Previsión del arquitecto, no decidida:**» con el foro sobre `tareas` y `entregas` (lo decide FORO-01, que también pesa la tabla aparte) y el mecanismo de la exportación (worker con almacén, API o navegador; lo decide CALIFICACIONES-02). «El foro como tabla aparte» salió de las alternativas descartadas y el porqué atribuye la previsión al arquitecto. ESSENTIALS «Foro» deja la regla en los campos de una tarea y pone aparte «Previsto, no decidido (lo confirma o lo cambia el plan de FORO-01): que reutilice la fila de `tareas` y la de `entregas`». ESSENTIALS «Tablas» ya decía «Previsto (DOCS-04), sin migrar; cada encargo lo confirma en su plan».
- **M-04 — resuelto.** RF-65: «**Pendiente por confirmar:** qué identifica al alumno en el archivo (recomendación: su nombre; el correo solo si el colegio lo necesita…) y si se excluyen el estado de pago y la restricción de acceso (recomendación: excluirlos, porque un archivo descargado sale del control de la plataforma y puede reenviarse; pregunta 17 de §11)». ESSENTIALS lleva la misma recomendación como «Pendiente por confirmar». Ninguno cita RN-02 ni la presenta como decidida; «sin correos» y «No incluye correos» ya no aparecen (grep). La pregunta 17 existe y es P-13 del plan.

### Arbitraje de los dos hunks que el arquitecto agregó por su cuenta (M-03, mecanismo)
**Se quedan como están.** Los dos textos anteriores daban por hecho que el .xlsx se escribe en el backend, que era justo la previsión que M-03 pedía no presentar como decidida; sin corregirlos, la opción (c) de R-01 quedaba cerrada en ESSENTIALS antes de su plan. No meten una indecisión en ESSENTIALS:
- En «Capas», lo que queda como regla es una condición que vale gane la opción que gane: si una librería del .xlsx entra al backend, se importa solo en un adaptador. Eso endurece la regla 1 de `AGENTS.md` (que nombra paquetes concretos) para una dependencia que todavía no existe. Lo abierto (dónde se genera, cuál librería) va marcado «Previsto (DOCS-04)» y remitido a un plan concreto, el mismo patrón que ESSENTIALS ya usa para todo lo de DOCS-04 y que acepté en la primera revisión.
- En ARCHITECTURE §14 el condicional es natural: esa tabla es de previsiones.
- Detalle sin consecuencia: «navegador» aparece en una viñeta de las capas del backend. Si gana (c), CALIFICACIONES-02 decide dónde vive la librería del frontend (`lib/` o `services/`, según `CLAUDE.md`) y actualiza esa viñeta.

### N-01 — aplicada y coherente
La viñeta de §7.3 cambia la marca a «propuesta (DOCS-04); la fija el plan de CLASES-03 antes de programar». Dice que «Solo la posición se desliza, con el mismo `transform` (`translate`) y la misma transición de 200 ms… el ancho cambia sin transición», con el porqué (animar el ancho rompe la regla de movimiento; `scaleX` deformaría el `rounded-row`). Dice también que medir la opción activa no se comprueba en jsdom («medidas simuladas y lo que no ven va a la comprobación humana») y agrega la «Tercera vía, que cambia la regla de este control y la decide el humano: sin indicador deslizante, con el fondo en la opción activa». Esto concuerda con §7 «Rendimiento» (línea 348: el indicador usa solo `transition-transform`, sin `will-change`) y con la regla general de §7.3 (vidrio, `rounded-row`, `aria-current`, `motion-reduce`). §7.16 remite a esta viñeta y no necesita cambio. Ningún token ni valor cambia. Para el plan de CLASES-03 (no para este documento):
- El ancho medido llega como un valor en píxeles en línea. Es geometría, no un tamaño de diseño, y el plan debe decirlo para que la regla de «ningún tamaño suelto» no lo marque.
- Lo que señalé en la primera revisión sigue siendo de ese plan: con el desplazamiento horizontal del grupo, nada indica a simple vista que hay más opciones a la derecha.

### La tabla P-01 a P-13 del plan
La tabla recoge mis opiniones fielmente: P-03 con la consecuencia escrita (N-03) y P-08 con la consulta de calificaciones del maestro, que ya quedó en RF-69, RN-06 y la pregunta 14. P-12 es la única diferencia y queda bien planteada: el arquitecto acepta llevar el `chore` (a), traducción de errores, antes de CLASES-03 si el humano lo autoriza; si no, se queda donde lo puso, y el (b), foco y navegación del marco, sigue entre ADMIN-01 y FORO-01. P-13 es nueva y viene de M-04. R-01 ahora incluye la opción (c) con su costo (dependencia del frontend y regla de paginación) y la dependencia de `LIMPIEZA_DIARIA` si gana (a), y D-30 remite a R-01.

### Problemas que bloquean
Ninguno.

### Observaciones (no bloquean; van a los planes de los encargos)
- **O-1 (CALIFICACIONES-02).** `ARCHITECTURE.md` §7 («Si devuelve el archivo o una URL prefirmada lo decide su plan») y §11, punto 8, enumeran solo las opciones (a) y (b). Los dos dicen que decide el plan y D-30 enumera las tres, así que no hay contradicción. Al cerrar R-01, ese plan actualiza las dos líneas con la opción que gane.
- **O-2 (ADMIN-01).** ESSENTIALS «Autorización» (recomendación pendiente sobre la clase archivada) no menciona la pregunta nueva sobre si el maestro consulta las calificaciones. Ya está marcada como pendiente y el plan de ADMIN-01 lee RF-69: lo ajusta con la respuesta del cliente.
- **O-3 (CLASES-03).** Las dos notas de N-01 de arriba (el ancho medido como geometría y la pista de que hay más opciones a la derecha), más N-02 de la primera revisión: inventariar los `*.ataque` que nombran «Muro» o «Trabajo de clase» o fijan el indicador de cinco opciones.

### Decisiones para el humano (lista cerrada)
| # | Pregunta | Recomendación del arquitecto | La mía |
|---|---|---|---|
| P-01 | ¿«Personas» reúne alumnos y maestros en los tres roles? | Sí, en los tres roles (siete secciones para todos) | Coincido |
| P-02 | ¿«Foro» aparece desde CLASES-03 o llega con FORO-01? | Llega con FORO-01, en tercera posición | Coincido |
| P-03 | ¿Los alumnos ven «Recursos del docente»? | Sí, los dos bloques | Coincido; preguntarla al cliente con la consecuencia escrita: si el bloque fuera solo para maestros, los alumnos dejarían de ver lo que hoy publican sus maestros (N-03) |
| P-04 | ¿Las tareas y los materiales salen de «Avisos»? | Sí: a «Actividades de aprendizaje» y a «Recursos» | Coincido (es lo literal) |
| P-05 | ¿Los temas siguen organizando los recursos? | Sí; en «Recursos de aprendizaje» solo el admin mueve | Coincido |
| P-06 | ¿Los recursos conservan los comentarios? | Sí, como hoy | Coincido |
| P-07 | «Dudas»: ¿quién escribe y qué borra cada quien? | Escriben inscritos y maestros; el admin lee, marca y borra; cada autor borra lo suyo; solo texto, sin edición | Coincido |
| P-08 | Clase archivada: ¿qué puede hacer cada rol? | Solo lectura; el maestro no entra; el alumno solo ve sus calificaciones; el admin lee y restaura; código y recordatorios apagados | Coincido; además preguntar al cliente si el maestro consulta las calificaciones de sus clases archivadas (ya en RF-69 y la pregunta 14) |
| P-09 | Foro: editar o borrar, ver las de otros, réplicas tras la fecha, maestros, adjuntos, hilo privado | No edita ni borra; ve las de otros; las réplicas cierran con la fecha; los maestros replican; solo texto; sin hilo privado | Coincido |
| P-10 | Duplicar: ¿secciones = temas?, ¿categorías?, ¿maestros?, ¿una archivada? | Temas; sí copia categorías; el admin elige de 1 a 2 maestros; sí se duplica una archivada (nace activa) | Coincido |
| P-11 | ¿Avisos de «Dudas» y del foro? | Los decide el plan de NOTIFICACIONES | Coincido |
| P-12 / DE-09 | ¿Dónde van los dos `chore`? | Entre ADMIN-01 y FORO-01; si el humano lo autoriza, el (a) antes de CLASES-03 | Mover el (a), traducción de errores, antes de CLASES-03, porque esa entrega agrega al menos tres formularios; el (b), entre ADMIN-01 y FORO-01 |
| P-13 | Exportar: ¿qué identifica al alumno?, ¿se excluyen el estado de pago y la restricción? | El nombre (el correo solo si el colegio lo necesita); excluir el estado de pago y la restricción | Coincido; que el cliente sepa que con dos alumnos del mismo nombre en una clase solo el correo los distingue |
| DE-03 | Duplicar sin copiar maestros, frente a «una clase nunca queda sin maestro» | El admin elige de 1 a 2 maestros al duplicar | Coincido |
| DE-05 | Siete secciones en el control segmentado | Opciones a su ancho natural; solo la posición del indicador se desliza; la fija el plan de CLASES-03 | Coincido; la tercera vía (sin indicador deslizante) la decide el humano solo si la prefiere |
| R-01 | ¿Cómo se genera y entrega el .xlsx? | (a) provisional: worker, almacén y URL prefirmada; evaluar (c); (b) solo con excepción escrita | Evaluar primero (c), la API devuelve JSON y el navegador arma el archivo: no pasa nada por Node y no hace falta cola, almacén ni limpieza. Si choca con la paginación o el tamaño, (a). (b), solo con la excepción escrita y aprobada. Lo decide el humano en el plan de CALIFICACIONES-02 |

### Documentos a actualizar
Ninguno en este encargo. Al cerrarlo, el orquestador actualiza la línea 5 de `ESTADO.md` y deja en `aprobacion.md` las decisiones del humano sobre P-12 y DE-05, si las toma antes de CLASES-03.
