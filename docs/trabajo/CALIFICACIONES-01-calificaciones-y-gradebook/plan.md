# Plan — CALIFICACIONES-01 · calificar con rúbrica, devolver con comentario, gradebook y calificaciones del alumno
Estado: LISTO. Aprobado por escrito por el humano el 2026-10-13 (`aprobacion.md`, "Aprobación del plan por el humano"): P-01 (a), P-02 (a), **P-03 (c′)**, P-04 (a) con N-02, P-05 (a); S-04/R-13 sí, como está; S-15 al chore posterior; A-4/R-05 dentro de 01d; S-01 sí, el admin solo lee; H-5 se juzga en la comprobación; sin vetos a S-nn; A-1 a A-6 autorizadas; en R-14, si `migrate dev` propone recrear la FK, PA-06 se resuelve con `CASCADE` sin consultar al humano. El diseño está escrito con la opción recomendada de cada pregunta y dice, en cada lugar, qué cambia con las demás; **en P-03 rige la variante (c′)** (los lugares marcados "Con (c′)": §D-2.1, §D-3, §D-10, §D-12.2, §D-12.5, CAL-1A04, CAL-1A13, CAL-1C08 y H-6).
Enmienda 1 (M-01 a M-03 y N-01 a N-10 de la revisión del manager) aplicada en su lugar, con la marca "Enmienda 1", y resumida al final. Nota de transcripción: el cambio de estado de estas dos líneas lo hizo el orquestador el 2026-10-13 al registrar la aprobación del humano (PA-09: con (c′) el diseño ya está escrito y no hace falta enmienda); copia previa y SHA-256 en `aprobacion.md`.
Enmienda 2 (2026-10-13; la regla de `VALIDACION` fuera de contrato de `AGENTS.md` y `.claude/agents/arquitecto.md`, aplicada a 01d) aplicada en su lugar, con la marca "Enmienda 2", y resumida al final. No cambia el alcance, las subentregas, las decisiones del humano ni el carril; suma S-21 y S-22, dos funciones y textos en `features/calificaciones`, filas de §D-14 y los casos CAL-1D10 a CAL-1D17.
Carril: sensible (migración: `entregas.calificacion`, `entregas.fecha_calificacion`, tabla `puntajes_rubrica` y el `CHECK` de fecha según estado; edición concurrente sobre `entregas.version`; un bloqueo nuevo, `FOR SHARE`, sobre la fila de `tareas`; el gradebook junto a datos de alumnos (RN-02); alumno restringido (RN-03))
Requisitos: RF-17, RF-18, RF-36, RF-37; RN-02, RN-03, RN-05, RN-06, RN-07; ESSENTIALS "Edición concurrente" (calificar la exige); §D-11 del plan de ENTREGAS-01 (puntos 1 a 4); pendientes de `docs/ESTADO.md` §3 con destino CALIFICACIONES.
Rama: `feat/calificaciones`. Base de "No se toca" `<R>` = `d998282`.

Decisiones heredadas que este plan no vuelve a preguntar: P-01 a P-05 de TAREAS-01 (una tarea es una publicación de tipo `tarea`; categorías ponderadas y su regla de P-01: clase sin categorías califica por puntos y una tarea "Sin categoría" no cuenta en la general); P-01 a P-05 de ENTREGAS-01 (el admin lee entregas e hilos y no escribe; entrega cerrada; "Marcar como completada"; límites; versión entera como precondición, y tras el `409` el formulario avisa, descarta y recarga, decisión del humano del 2026-10-11); S-06 modificada de ENTREGAS-01 (una tarea con entregas `entregado` o `calificado` solo la borra el admin, con confirmación); S-11 de ENTREGAS-01 (el alumno no recibe `version`).

## Preguntas bloqueantes

| Id | Pregunta | Opciones | Recomendación del arquitecto y por qué | Recomendación del manager |
|---|---|---|---|---|
| P-01 | **¿Qué es "devolver"?** El humano pidió "devolver con comentario"; RF-36 dice "dejar comentario privado y publicar la calificación". No está definido si devolver es lo mismo que publicar, si hay un borrador previo o si es regresarle la entrega al alumno para que la rehaga. Cambia el modelo de datos (una columna de publicación), lo que ve el alumno y la máquina de estados de la entrega. | **(a)** Devolver = publicar: una sola acción, "Calificar y devolver" (la primera vez) o "Actualizar calificación" (después). Al guardarla, el alumno la ve de inmediato y se encola el aviso. Sin borradores. Recalificar vuelve a publicar.<br>**(b)** Borrador y devolución: el maestro guarda la calificación sin que el alumno la vea ("Guardar borrador", el gradebook la marca "Borrador") y "Devolver" la publica. Columna nueva `entregas.devuelta_en`; el alumno solo ve calificaciones devueltas y la entrega no cuenta como calificada para él hasta entonces.<br>**(c)** Devolver = regresar para rehacer: además de calificar, el maestro puede "Devolver para corregir", que regresa la entrega a `asignado` (el alumno vuelve a entregar), con o sin calificación previa. | **(a).** Es lo que dice RF-36 ("publicar la calificación") y deja un solo estado nuevo (`calificado`), que ENTREGAS-01 ya creó. Con (b) aparecen un estado intermedio que el alumno no ve, un filtro más en el gradebook y otra regla para el promedio (¿cuenta un borrador?); con (c), una transición nueva que choca con RF-14 ("anular y volver a entregar mientras no esté calificada") y con el desglose guardado. Las dos se pueden sumar después sin migrar lo de este encargo. | **(a)**, coincido con el arquitecto. RF-36 dice "publicar la calificación": un solo estado nuevo (`calificado`), sin reglas de borrador para el promedio ni para el gradebook. Efecto que el humano acepta: no existe "quitar una calificación", solo recalificar. (b) y (c) se pueden sumar después sin migrar lo de este encargo. |
| P-02 | **¿Dónde vive el comentario de la devolución?** RF-36 lo llama "comentario privado"; RF-16 ya tiene el hilo de "comentarios privados" por alumno y tarea. Cambia el esquema (una columna o no), lo que ve el alumno y los avisos. | **(a)** Es un comentario más del hilo privado de esa entrega, firmado por el maestro y creado en la misma transacción que la calificación. Es opcional. Queda en el historial (los comentarios privados no se editan ni se borran, S-04 de ENTREGAS-01) y el alumno puede contestarlo ahí. No encola `COMENTARIO_CREADO`: el aviso es el de la calificación.<br>**(b)** Es un campo de la calificación (`entregas.comentario_calificacion`, hasta 1000 caracteres) que se muestra junto a la nota en "Tu trabajo" y se reemplaza al recalificar.<br>**(c)** Los dos: el campo y, además, una copia en el hilo. | **(a).** Reutiliza lo que ya existe (tabla, esquema, firma, aislamiento frente al muro, vista y pruebas del hilo), no agrega columna y mantiene una sola conversación por entrega: el alumno contesta donde lee. Con (b) habría dos lugares con "comentarios privados" del maestro y un texto que desaparece al recalificar; (c) duplica. | **(a)**, coincido. Una sola conversación por entrega, sin columna nueva, y un solo aviso (`CALIFICACION_PUBLICADA`, que cubre el comentario; R-10). Efecto que el humano acepta: como todo comentario privado, el de la devolución no se edita ni se borra (S-04 de ENTREGAS-01). |
| P-03 | **¿Se califica a quien no entregó?** (§D-11.4 de ENTREGAS-01.) Sin eso, un alumno que no entrega nada no baja su promedio (RN-05: "las tareas sin calificar no afectan el promedio"); solo aparece en riesgo por tareas vencidas. Hoy el `CHECK` `entregas_fecha_segun_estado` lo impide. Cambia la migración, la máquina de estados y lo que ve el alumno. | **(a)** Sí, siempre: el maestro califica también una entrega `asignado` (o sin fila), venza o no. Queda `calificado` sin `fecha_entrega`.<br>**(b)** No: solo se califican entregas `entregado` (o `calificado`, para recalificar). El `CHECK` no cambia.<br>**(c)** Sí, pero solo con la fecha límite vencida ("Sin entregar"). Antes de vencer, `409 ENTREGA_NO_CALIFICABLE`. | **(c).** Deja al maestro poner el cero que hoy no puede poner, sin cerrarle la tarea a un alumno que todavía está a tiempo. Efecto que el humano debe aceptar: si la tarea acepta entregas con retraso, calificar a quien no entregó le cierra la entrega (RF-14: ya está calificada), como en (a). Con (b), el promedio de quien no entrega nada se ve mejor de lo que es y "calificar en cero" no existe. El `CHECK` se relaja (compatible hacia atrás) solo con (a) o (c). | **(c′)**, variante de menor riesgo de (c): calificar a quien no entregó solo cuando su entrega ya está cerrada (fecha límite vencida **y** la tarea no acepta entregas con retraso). Con (c), un cero provisional bloquea para siempre a un alumno que todavía podía entregar tarde, y no hay forma de quitar una calificación; las tareas nacen aceptando tardías. Con (c′), quien quiere poner ceros cambia antes la tarea a "No aceptar" (se puede aunque tenga calificaciones: no toca puntos ni rúbrica). Cuesta leer `acepta_tardias` al bloquear la tarea y usar `entregaCerradaAhora` en el panel. Si el humano prefiere menos pasos, (c) con la nota del panel es aceptable. |
| P-04 | **La rúbrica y los puntos de una tarea que ya tiene calificaciones** (§D-11.2 de ENTREGAS-01; S-04 de TAREAS-01: editar la rúbrica reemplaza los criterios y cambia sus ids). Si el maestro edita la rúbrica o los puntos después de calificar, el desglose guardado apunta a criterios que ya no existen y la nota queda escalada a otros puntos. Cambia la migración (copias en `puntajes_rubrica` o no), `editarTarea` y lo que se muestra. | **(a)** Congelar: con al menos una entrega calificada, `PUT` de la tarea responde `409 TAREA_CON_CALIFICACIONES` si cambian los puntos o la rúbrica (número de criterios, texto o puntos máximos, en orden). Lo demás (título, instrucciones, fecha, categoría, tema, adjuntos) se edita como hoy. Si la rúbrica llega idéntica, no se reemplaza (los ids se conservan). `puntajes_rubrica` apunta a `criterios_rubrica` con FK.<br>**(b)** Instantánea: cada calificación guarda su desglose con copia del texto y los puntos máximos de cada criterio, y los puntos de la tarea con que se calificó. Editar la tarea queda libre; las calificaciones ya publicadas no cambian y recalificar usa la rúbrica nueva desde cero.<br>**(c)** Como (a), pero se permite corregir el texto de un criterio (se actualiza en su lugar, mismo id); solo se congelan los puntos, el número de criterios y sus puntos máximos. | **(a).** Una sola fuente de verdad: la nota, el desglose, el encabezado del gradebook ("de 10 puntos") y la rúbrica que ve el alumno dicen siempre lo mismo. Cuesta una comparación en una transacción que ya bloquea la tarea y un aviso en el formulario. (b) evita tocar `editarTarea`, pero deja calificaciones "sobre 10" en una tarea que ahora vale 20, y un formulario de calificar que debe explicar por qué el desglose guardado no coincide con la rúbrica. (c) es razonable si el humano quiere corregir erratas; suma una ruta de actualización por criterio. | **(a)**, coincido. Una sola fuente de verdad para la nota, el desglose y el encabezado del gradebook. Con un ajuste (N-02 de `revision.md`): una rúbrica idéntica conserva sus ids siempre, haya o no calificaciones. (c) solo si el humano quiere corregir erratas de un criterio ya calificado. |
| P-05 | **Cómo se calcula el porcentaje dentro de una categoría** (RN-05 dice "categorías ponderadas", pero no cómo se combinan las tareas de una misma categoría). Cambia el número que ven el maestro y el alumno, y el texto del modal de cálculo (RF-18). | **(a)** Por puntos: puntos obtenidos entre puntos posibles de las tareas calificadas de la categoría. Una tarea de 100 puntos pesa más que una de 10.<br>**(b)** Promedio de porcentajes: cada tarea calificada vale lo mismo dentro de su categoría, sin importar sus puntos. | **(a).** Es la misma regla que RN-05 ya fija para la clase sin categorías ("califica por puntos"), así que el modal explica un solo criterio en los dos modos. Con (b), el maestro que da 100 puntos a un proyecto y 10 a una práctica vería que valen lo mismo, contra lo que expresan los puntos. Cambiar a (b) toca solo una función de `core/` y el texto del modal. | **(a)**, coincido. Es el mismo criterio "por puntos" que RN-05 ya fija para la clase sin categorías, así que el modal de cálculo explica una sola regla. |

**P-03 con la variante (c′) del manager (Enmienda 1).** El diseño queda escrito para (c) y para (c′); cada lugar que cambia lo dice ("Con (c′)"): §D-2.1 (`exigirEntregaCalificable`), §D-3 (el bloqueo de la tarea lee `acepta_tardias`), §D-10 (mensaje), §D-12.2 y §D-12.5 (el panel), CAL-1A04, CAL-1A13, CAL-1C08 y H-6. Con (c′) se califica a quien no entregó solo con la entrega **cerrada** (fecha límite vencida y tarea que no acepta entregas con retraso, la regla `entregaCerrada` de ENTREGAS-01); con (c), con la fecha límite vencida aunque la tarea acepte tardías (y entonces calificar le cierra la entrega al alumno, R-02). Sigo recomendando (c) por un paso menos para la maestra; (c′) evita un cero que no se puede quitar a quien aún podía entregar tarde, y es igual de barato.

**Otras decisiones para el humano (Enmienda 1; las señala la revisión del manager, "Para el humano"):**

| Id | Decisión | Recomendación del arquitecto |
|---|---|---|
| S-04 / R-13 | ¿Un alumno inscrito a mitad del periodo puede aparecer "En riesgo" por tareas que vencieron antes de su alta? | Sí, como está (cuenta lo mismo que él ve como "Sin entregar"). Si no, la consulta de §D-6.6 suma `t.fecha_limite >= i.creado_en` y la fila de "Trabajo de clase" se ajusta en otro encargo. |
| S-15 | Nuevo destino del pendiente "mover `formatearFechaDeClase` a `lib/format.ts`" (el humano lo había atado al primer encargo que tocara `lib/format.ts`). | Un `chore` de texto y accesibilidad, después de CALIFICACIONES. |
| A-4 / R-05 | Mover `useFocoAlPerderseElControl` a `components/foco/` dentro de 01d (paso 1) o en una 01d-0 con su propio commit. | Dentro de 01d, paso 1 (coincide con el manager): movimiento con reexportación, CAL-1D08 y la suite completa en verde antes de seguir. |
| S-01 | ¿El admin debe poder calificar (por ejemplo, para corregir una nota tras una queja)? | No, por ahora (lee y no escribe, como en el hilo). Si sí, se suma `admin` a `roles` del `PUT`. |
| H-5 | Con P-04 (a), la maestra descubre al guardar que los puntos y la rúbrica están congelados. | Aceptarlo en este encargo y juzgarlo en H-5; una marca en la respuesta de la tarea sería otro encargo. |

## Suposiciones

Puedes vetar cualquiera al aprobar; cada una se cambia sin rediseñar.

| Id | Suposición | Por qué |
|---|---|---|
| S-01 | **El admin no califica.** Lee el gradebook de cualquier clase y ve la calificación de cada entrega (en la vista de la entrega de un alumno, en solo lectura), pero `PUT …/calificacion` es solo de los maestros de la clase. | Coincide con P-01 (a) de ENTREGAS-01: el admin lee entregas e hilos y no escribe. RN-06 le da alcance para atender una queja; RF-36 es un requisito del maestro. Si el humano lo quiere, se suma `admin` a `roles` y su firma "Administración" ya existe en el hilo. |
| S-02 | **Escala de los puntos.** Los puntos de cada criterio y la calificación directa son números de 0 al máximo, con hasta 2 decimales (`8.5`, `7.25`). La calificación de una tarea con rúbrica se escala (RN-05) y se redondea a la centésima más cercana, las mitades hacia arriba (`7/9` de 10 puntos = `7.78`). Se guarda `NUMERIC(7,2)`. Los cálculos se hacen en centésimas enteras. En la interfaz se acepta punto o coma decimal. | Medio punto es habitual en una rúbrica; con enteros, `7/9 × 10` no tiene representación exacta de todos modos. Vetable: solo enteros (cambia un `refine` de `shared/` y nada más). |
| S-03 | **Sin penalización por retraso.** Una entrega `con_retraso` se califica y cuenta igual que una a tiempo; el retraso solo se muestra. | El PRD no define penalización (RF-15 solo la marca). Es el caso "entregas tardías" que `AGENTS.md` exige probar en el cálculo: se prueba que no cambia nada. |
| S-04 | **Umbrales de "alumno en riesgo" como constantes de `core/`** (`UMBRAL_PROMEDIO_EN_RIESGO = 70`, `UMBRAL_VENCIDAS_SIN_ENTREGAR = 3`). El riesgo por promedio compara el porcentaje redondeado que se muestra (69.99 sí; 70.00 no). "Vencidas sin entregar" cuenta las tareas de la clase con la fecha límite ya pasada y sin entrega `entregado` ni `calificado` del alumno, aunque se haya inscrito después de que vencieran (es lo mismo que él ve como "Sin entregar"). Un alumno sin tareas calificadas no está en riesgo por promedio. | La tabla `configuracion` no existe todavía (RF-56 es de ADMIN); RN-05 dice "umbrales iniciales, ajustables en configuración". Cuando exista, los umbrales pasan a leerse de ahí sin cambiar la regla. |
| S-05 | **El gradebook no lleva estado de pago, restricción de acceso ni correo.** El roster (RF-39) ya los muestra; `listarAlumnosDeClase` sigue siendo la única lectura de alumnos que selecciona `estado_pago`. | RN-02 permite al maestro verlos, pero RF-37 no los pide: agregarlos multiplicaría la superficie de RN-02 sin necesidad (mismo criterio que S-05 de ENTREGAS-01). |
| S-06 | **RF-30 ("entregas pendientes de calificar" en el inicio del maestro) no entra:** va al encargo de los inicios, con RF-10. | El inicio del maestro es de otro encargo (S-07 de ENTREGAS-01 lo dejó igual) y lo que necesita (las entregas `entregado` de sus clases) ya se puede consultar con los índices de este encargo. |
| S-07 | **Forma del gradebook.** Filas: los alumnos inscritos con cuenta activa, con el orden y el cursor del roster, de 25 en 25 (hasta 50). Columnas: las tareas de la clase de la fecha límite más reciente a la más antigua, de 20 en 20 (hasta 50). Las dos dimensiones se recorren por ventanas ("Alumnos siguientes" y "Alumnos anteriores"; "Tareas más antiguas" y "Tareas más recientes"), no agregando filas: cada respuesta es una sola instantánea y sus celdas siempre corresponden a sus columnas. Cada celda dice la calificación ("8.5") o el estado en palabras ("Entregado", "Sin entregar", "—" para asignada sin vencer). Al final, "Promedio" (o "—") y "Riesgo" (insignia "En riesgo" con su motivo en texto). Arriba, el resumen: alumnos, promedio de la clase y cuántos están en riesgo. Sin filtro "solo en riesgo" ni promedio por tarea. | RF-37 pide la tabla, el promedio de la clase y los alumnos en riesgo "destacados": la insignia por fila y el conteo los destacan. Con "Ver más" en dos dimensiones, una tarea creada entre dos páginas dejaría celdas desalineadas. El filtro y el promedio por tarea no los pide el PRD. |
| S-08 | **Promedio de la clase** = media de los promedios generales de los alumnos inscritos activos que tienen al menos una tarea que cuenta; `null` si ninguno. Las calificaciones de un alumno dado de baja o desactivado se conservan en la base, pero no cuentan ni aparecen. | RF-37 no lo define; es la lectura habitual de "promedio general de la clase" y no depende de la página que se ve. |
| S-09 | **"Mis calificaciones"** es por clase (RF-17: "por clase"), en la sección nueva "Calificaciones" de la clase: el porcentaje general con "Ver cálculo" (el modal de RF-18) y la lista de tareas de la clase (fecha límite más reciente primero, de 20 en 20, "Ver más tareas") con su estado y su calificación, filtrable por "Todas", "Asignadas", "Entregadas", "Calificadas" y "Sin entregar" (el filtro lo aplica el servidor). Nunca muestra el promedio de la clase ni datos de otro alumno. | RF-17 y RF-18. La ruta de `ARCHITECTURE.md` §7 (`GET /me/calificaciones`) pasa a `GET /clases/{claseId}/mis-calificaciones`: así pasa por el sexto paso de la cadena (inscripción) como todo lo de una clase. |
| S-10 | **Sección "Calificaciones"** al final de las secciones de la clase, en las tres perspectivas: "Muro", "Trabajo de clase", "Personas", "Calificaciones" (estudiante); "Muro", "Trabajo de clase", "Alumnos", "Calificaciones" (maestro); "Muro", "Trabajo de clase", "Alumnos", "Maestros", "Calificaciones" (admin). Ninguna sección existente cambia de posición. | Es donde el alumno y el maestro buscan sus notas; al final, las posiciones (y las pruebas del indicador de Alumnos y Maestros) no cambian. Vetable: un enlace "Calificaciones" en "Trabajo de clase" en lugar de una sección (menos pruebas que cambiar, peor de encontrar). |
| S-11 | **`CALIFICACION_PUBLICADA`** se encola en la transacción de cada publicación (también al recalificar), con un id nuevo por publicación y datos `{ entregaId, tareaId, claseId, version }`. Para NOTIFICACIONES: el consumidor avisa al alumno y termina sin avisar si la entrega ya no existe, si no está `calificado` o si su `version` ya no es la del evento. Sin consumidor en este encargo. | Mismo patrón que `ENTREGA_REALIZADA` (S-09 de ENTREGAS-01). Recalificar es otra publicación que el alumno debe conocer; la versión evita avisar de una nota que ya cambió. |
| S-12 | **Tras un `409` al calificar** (`ENTREGA_MODIFICADA`, `RUBRICA_MODIFICADA` (también si cambiaron solo los puntos de la tarea, Enmienda 1, M-02) o `ENTREGA_NO_CALIFICABLE` (Enmienda 1, N-04)), el panel avisa con el mensaje del servidor, descarta lo escrito (puntos y comentario) y recarga la entrega (y la tarea, si cambió la rúbrica), con el mismo mecanismo que el formulario de la tarea (§D-8.3 del plan de ENTREGAS-01). | Es la regla de ESSENTIALS ("Edición concurrente": tras el `409`, avisa, descarta y recarga). Un comentario de devolución es corto (hasta 1000 caracteres) y los puntos se vuelven a escribir en segundos. |
| S-13 | **Lo que ve el alumno de su calificación:** en "Tu trabajo" del detalle, "Calificación: 8.5 de 10", la fecha ("Calificada el lunes 6 de octubre a las 14:30") y, si hay rúbrica, el desglose por criterio ("Claridad: 4 de 5"). En "Mis calificaciones", solo el número. Nunca `version`. El comentario lo lee en el hilo (P-02 a). | RF-13 ya le muestra la rúbrica; el desglose es lo que le permite entender su nota. S-11 de ENTREGAS-01: el alumno no recibe `version`. |
| S-14 | **Desde el gradebook se califica en la vista que ya existe:** cada celda enlaza a la entrega de ese alumno en esa tarea (`…/tareas/:tareaId/entregas/:alumnoId`, ENTREGAS-01e), donde está el panel de calificación. Los enlaces son relativos a la ruta de la clase (`../tareas/…`), así que sirven igual para el maestro y para el admin. | No duplica la vista de la entrega ni pide `perspectivaDeRuta` en el módulo nuevo. |
| S-15 | **Números en la interfaz:** `formatearPuntos` ("8.5", "10", "7.78") y `formatearPorcentaje` ("87.5 %") en `lib/format.ts`, con el formato de `es-MX` y hasta 2 decimales, sin ceros de relleno. El pendiente de `docs/ESTADO.md` §3 "mover `formatearFechaDeClase` a `lib/format.ts`" (destino: "el próximo encargo que toque `lib/format.ts`") **no se absorbe**: es un refactor de `features/clases` con un cambio de comportamiento (la fecha inválida), y este encargo no mezcla refactor con funcionalidad. Se propone reasignarlo al `chore` de accesibilidad o a uno de texto. | `CLAUDE.md` ubica los porcentajes en `lib/format.ts`; los usan `features/tareas` y `features/calificaciones` (regla 5). |
| S-16 | **Despliegue:** `calificacion` entra obligatoria (puede ser `null`) en `miEntregaSchema` y `entregaDeAlumnoSchema`. Sin `prod` todavía, backend y frontend se despliegan juntos (como S-14 de ENTREGAS-01); si ya hubiera `prod`, backend primero, en la misma ventana. | `CLAUDE.md` prohíbe un valor por defecto para `calificacion` en el frontend: un campo opcional "por compatibilidad" lo escondería. |
| S-17 | **Quién calificó no se guarda ni se muestra.** La entrega guarda la calificación y su fecha; el comentario del hilo ya lleva su autor. | RF-36 no lo pide; una columna `calificado_por` se agrega después sin migrar datos. |
| S-18 | **La entrega de un alumno muestra la calificación como lectura arriba del panel** solo para el admin y cuando no se puede calificar; para el maestro, el panel ya trae los valores guardados. La celda del gradebook y la fila de "Mis calificaciones" no muestran el desglose. | Una sola forma de ver el desglose por perspectiva; el modal de RF-18 es de categorías, no de criterios. |
| S-19 | **Un error de recarga del gradebook con datos ya cargados no avisa:** la tabla sigue mostrando lo último y se vuelve a pedir al enfocar la pestaña o al volver a la sección. Un error en la primera carga de una ventana (o uno que la reemplaza, como perder el acceso) sí se muestra en lugar de la tabla. | El gradebook es de solo lectura; un aviso por cada recarga fallida sería otro mecanismo de aviso (el de `features/tareas` está atado a la consulta de la tarea) para un caso sin acción posible. Vetable: copiar el aviso único de `useAvisoDeRecargaFallida`. |
| S-20 | **El maestro de la clase califica con el panel aunque el alumno esté restringido** (RN-03 restringe al alumno, no a su trabajo; S-16 de ENTREGAS-01). El gradebook no lo marca (S-05). | La restricción no borra ni congela datos (RN-03). |
| S-21 | (Enmienda 2) **En las consultas de 01d, el "mensaje legible" de la regla de `VALIDACION` fuera de contrato es uno solo de estos dos:** el `MensajeError` en lugar de la tabla o de la lista (primera carga, ventana nueva del gradebook o filtro nuevo de "Mis calificaciones") o un aviso (`toast.error`) cuando ya hay filas a la vista ("Ver más tareas"). Nunca los dos, nunca ninguno, nunca un `ErrorDeCampo` (el selector "Mostrar" tiene valores cerrados: no hay nada que la persona pueda corregir). "Lo escrito se conserva" se lee como "la selección se conserva" (el selector sigue con la opción elegida; las filas ya cargadas siguen a la vista) y "el botón sale de la espera", como "ningún control queda con `aria-busy="true"`". | La regla habla de formularios con campos de texto; 01d no tiene ninguno, pero sí controles que mandan parámetros al servidor y reciben `400 VALIDACION`. Es el mismo reparto de §D-14 para un 5xx en esas consultas, así que no hay mecanismo nuevo. Vetable: un aviso también en la primera carga (serían dos mensajes por un error). |
| S-22 | (Enmienda 2) **Un `VALIDACION` de una consulta de 01d nunca muestra el mensaje del servidor ni un trozo de él:** muestra un texto fijo del módulo (el del cursor, el de "sin acceso" para `claseId` o el genérico del lugar). En 01c, en cambio, el aviso muestra el mensaje sin su prefijo (T-04). | En calificar, los mensajes de campo los escribe `core/` en español para un dato que la persona tecleó. En una consulta, la persona no escribió nada, y los mensajes de forma de los esquemas de consulta son los de zod por defecto, en inglés (`shared/` no configura un idioma: ningún `z.config` ni `locales` en `shared/src`), por ejemplo "limiteTareas: Too big: expected number to be <=50". Vetable: mostrar el mensaje sin el prefijo, como en 01c (entonces podría salir texto en inglés). |

## Autorizaciones que pide el plan (por escrito, al aprobarlo)

| Id | Qué | Dónde |
|---|---|---|
| A-1 | Crear la migración del encargo (§D-1) y cambiar `schema.prisma`; aplicarla en `campus_dev` con `npx prisma migrate dev` (pregunta antes, `AGENTS.md`). | `backend/prisma/` (01a) |
| A-2 | Cambiar código ya cerrado de otros dominios del backend: `adapters/db/entregas.ts` (calificar y la calificación en las dos lecturas de una entrega), `adapters/db/tareas.ts` (`editarTarea` con P-04; nada más), `adapters/db/index.ts`, `adapters/db/inscripciones.ts` (ninguna línea; solo se importa `condicionesDePaginaDeAlumnos`, ya exportada), `adapters/queue/colas.ts`, `core/eventos/avisos-de-clase.ts`, `handlers/tareas/entregas.ts` (las respuestas de la entrega pasan a `handlers/respuestas-de-entrega.ts`, con la calificación) y `app.ts` (registrar el plugin nuevo). | 01a y 01b |
| A-3 | Cambiar una ayuda compartida de pruebas del backend: `backend/test/ayudas-entregas.ts`, `crearEntregaDePrueba` escribe `calificacion` y `fecha_calificacion` cuando el estado es `calificado` (parámetro opcional `calificacion`, por defecto 1), para que las filas fabricadas cumplan el `CHECK` nuevo. Nada más de ese archivo. | 01a |
| A-4 | Cambiar código compartido del frontend: `lib/format.ts` (dos funciones nuevas, S-15), `services/calificacionesService.ts` (nuevo: claves compartidas por `features/tareas` y `features/calificaciones`), `components/clase/data.ts` (`sinCategoria`), `components/foco/` (nuevo: `useFocoAlPerderseElControl`, `claveDeFocoDeLaConsulta` y el tipo `MomentoDeLaConsulta`, movidos de `features/tareas` con reexportación en el origen, §D-13.1), `features/clases/data.ts` (la sección "Calificaciones" y las clases del indicador para cinco secciones), `features/tareas` (§D-12) y `app/router.tsx`. | 01c y 01d |
| A-5 | Que el tester reescriba, en la ronda 0 de cada subentrega, las `*.ataque` que rompen por un cambio de contrato listado en §D-R0 (y solo esas), con el cambio mínimo, su motivo y la tabla de SHA-256 al final de la ronda. | `backend/test/`, `frontend/src/` |
| A-6 | Que el orquestador aplique al cerrar cada subentrega los textos de "Documentos a actualizar" (ESSENTIALS, `ARCHITECTURE.md` §7, §8 y §14, `PRD.md` RF-17, RF-36, RN-05 y §11, `CLAUDE.md`), con su SHA-256 en `aprobacion.md`. `DESIGN.md` lo escribe el programador en su subentrega con la marca "propuesta (CALIFICACIONES-01x)". Los README de `backend/src/` los actualiza el programador. | `docs/`, `CLAUDE.md` |

No hay apartamientos de ESSENTIALS. Lo que cambia ahí ("Restricciones clave" de `entregas` con P-03, "Edición concurrente", "Reglas de negocio" y "Eventos") son textos nuevos que reflejan las respuestas del humano (A-6).

## Alcance

### Entra, por subentrega (un commit del humano por subentrega)

| Subentrega | Paquetes | Qué entra |
|---|---|---|
| **01a** · Calificar (backend) | `shared/`, `backend/` y, en el frontend, **solo los dobles de pruebas** que exige el campo nuevo `calificacion` | La única migración del encargo (§D-1). El cálculo de RN-05 y las reglas puras (§D-2). Calificar y recalificar una entrega con rúbrica o calificación directa, con `entregas.version` exigida y la fila bloqueada, el comentario de devolución en el hilo (P-02 a) y `CALIFICACION_PUBLICADA` en la transacción (§D-3, §D-8). La calificación en `GET …/entrega` (alumno) y en `GET …/entregas/:alumnoId` (maestro y admin) (§D-5). Congelar los puntos y la rúbrica de una tarea calificada (P-04 a, §D-4). |
| **01b** · Gradebook y "Mis calificaciones" (backend) | `shared/`, `backend/` | `GET /clases/:claseId/gradebook` (§D-6) y `GET /clases/:claseId/mis-calificaciones` (§D-7): lecturas agregadas en una sola instantánea, promedio general por categorías o por puntos, promedio de la clase y alumnos en riesgo. |
| **01c** · Calificar y ver la calificación (frontend, `features/tareas`) | `frontend/` | El panel "Calificación" en la entrega de un alumno (el maestro califica; el admin lee), la calificación en "Tu trabajo" del alumno, el aviso de `TAREA_CON_CALIFICACIONES` al editar una tarea, `formatearPuntos` y `formatearPorcentaje`, las claves de `services/calificacionesService.ts` y "Sin categoría" compartido (§D-12). `DESIGN.md`. |
| **01d** · Gradebook, "Mis calificaciones" y el modal de cálculo (frontend, `features/calificaciones`) | `frontend/` | El módulo nuevo `features/calificaciones` (§D-13): el gradebook del maestro y del admin, "Mis calificaciones" del alumno y el modal "Cálculo de calificación" (RF-18, excepción de modal del PRD); la sección "Calificaciones" de la clase y sus rutas; `components/foco/` (movido con reexportación). `DESIGN.md`. Comprobación humana única al final. |

**01a toca el frontend solo en pruebas** (como 01b de ENTREGAS-01): `calificacion` entra obligatoria en dos esquemas estrictos de respuesta y los dobles sin ella dejarían de pasar el `parse`. Ningún archivo de producción del frontend cambia en 01a; el `build` del frontend no se rompe (ningún doble de esos tipos está tipado; grep de `: MiEntrega`, `: EntregaDeAlumno`, `satisfies` y `as` en `frontend/src` sobre `d998282`: solo aparece la prop de `entrega-realizada.tsx`, que es código de producción y sigue compilando).

### No entra (con destino)

| Qué | Destino |
|---|---|
| "Entregas pendientes de calificar" del inicio del maestro (RF-30) y "Próximas entregas" (RF-10) | El encargo de los inicios (S-06) |
| Consumidor de `CALIFICACION_PUBLICADA` (y de los demás eventos) | NOTIFICACIONES (S-11 dice qué debe descartar) |
| Borrador de calificación o "devolver para corregir" | Solo si el humano elige P-01 (b) o (c) |
| Umbrales de riesgo configurables | ADMIN (RF-56), al existir `configuracion` (S-04) |
| Analytics del admin (RF-53), exportar el gradebook, promedio por tarea, filtro "solo en riesgo" | Sin encargo; el PRD no los pide |
| Estado de pago, restricción o correo en el gradebook | No (S-05) |
| Penalización por retraso | No (S-03) |
| Mover `formatearFechaDeClase` a `lib/format.ts` | Se propone reasignarlo a un `chore` (S-15) |
| `signal` en `consultaTarea` (`services/trabajoService.ts`) y el `chore` de `apiClient` | Sus encargos: este plan no toca `services/trabajoService.ts` ni `services/apiClient.ts` |
| Unificar los mecanismos de foco de `features/clases` y `features/tareas` | El `chore` de accesibilidad del marco. Este encargo solo mueve el de `features/tareas` a `components/foco/` sin cambiarlo, para que `features/calificaciones` lo use (§D-13.1) |

### Pendientes de `docs/ESTADO.md` §3 con destino CALIFICACIONES

| Pendiente | Qué hace este plan |
|---|---|
| §D-11.1 de ENTREGAS-01: exigir `entregas.version` al calificar | §D-3: `exigirVersion` con la fila bloqueada `FOR NO KEY UPDATE`; `409 ENTREGA_MODIFICADA` |
| §D-11.2 y S-04 de TAREAS-01: la rúbrica cuando hay entregas calificadas (ids que cambian) | P-04 (a): §D-4 |
| §D-11.3 (S-12 de ENTREGAS-01): columnas `calificacion` y `fecha_calificacion` | §D-1 |
| §D-11.4 (N-03): el `CHECK` de fecha según estado | P-03 (c): §D-1 lo relaja |
| Regla de P-01 de TAREAS-01 para el cálculo (clase sin categorías por puntos; "Sin categoría" no cuenta) | §D-2.3 |
| Alumno en riesgo (RN-05) | §D-2.4 y §D-6 (S-04) |
| `entregas_alumno_id_idx` sin consulta que lo usara (observación de ENTREGAS-01) | Lo usa la consulta agregada de "Mis calificaciones" (§D-7): queda justificado |
| `consultaTarea` sin `signal`; `chore` de `apiClient` | No se tocan (ver "No entra") |
| `formatearFechaDeClase` a `lib/format.ts` | No se absorbe (S-15) |

## Diseño

### §D-0 · Decisiones transversales
1. **Tres rutas nuevas, todas bajo `/api/clases/:claseId`** (la guarda `onRoute` las acepta tal cual; **no se toca `middleware/`**), en un plugin nuevo `handlers/calificaciones.ts` (`calificacionesHandler`, recibe `{ almacen }` porque la respuesta de calificar lleva los adjuntos de la entrega), registrado en `app.ts` después de `hiloPrivadoHandler`:
   - `PUT /clases/:claseId/tareas/:tareaId/entregas/:alumnoId/calificacion` — `protegido({ roles: ["maestro"], pertenencia: "propiedad" })` (S-01).
   - `GET /clases/:claseId/gradebook` — `protegido({ roles: ["maestro", "admin"], pertenencia: "propiedad" })`.
   - `GET /clases/:claseId/mis-calificaciones` — `protegido({ roles: ["estudiante"], pertenencia: "inscripcion" })`. El alumno es siempre `perfilDe(request).id`; la ruta no tiene `:alumnoId`.
   Ningún handler compara rol, relación ni ids de usuario: que `:alumnoId` sea un alumno inscrito con cuenta activa es un filtro de datos del adaptador (`404 ALUMNO_NO_ENCONTRADO`, el mismo de ENTREGAS-01), igual que en las rutas de entregas.
2. **Toda consulta filtra por la clase de la ruta:** la tarea por `(id, clase_id)`, la entrega por `(tarea_id, alumno_id)` de esa tarea, los criterios por `tarea_id` de esa tarea, las categorías por `clase_id`; un cursor de tarea es una tarea de esa clase. Un id de otra clase es "no encontrado" (o `400` en un cursor), sin escribir ni revelar nada.
3. **RN-02:** ninguna función nueva selecciona `estado_pago`, `fecha_estado_pago`, `acceso_restringido`, `motivo_restriccion` ni `email`. Todas las respuestas nuevas son `z.strictObject` de `shared/`: un campo de más rompe el `parse` en el servidor (un `500` en pruebas, nunca una fuga silenciosa).
4. **Edición concurrente** (ESSENTIALS): calificar exige la `version` que vio el maestro (`GET …/entregas/:alumnoId` ya la devuelve) y la compara con la fila de `entregas` ya bloqueada. Entregar, anular y calificar suben la versión; comentar no (S-15 de ENTREGAS-01). **(Enmienda 1, M-02)** Calificar también decide sobre lo que vio **de la tarea**: el cuerpo lleva los puntos de la tarea con que se abrió el panel (`puntosDeLaTarea`) y, con rúbrica, los ids de sus criterios (`puntajes[].criterioId`); los dos se comparan con la fila de `tareas` ya bloqueada `FOR SHARE` y con sus criterios antes de validar rangos (§D-2.1). No se usa `tareas.version`: mover la tarea de tema la sube y daría un `409` sin motivo.
5. **Orden de bloqueo del proyecto, sin excepción: primero la fila de `tareas`, después `entregas`, `puntajes_rubrica`, `comentarios`, `criterios_rubrica` y `archivos`.** Calificar toma la tarea con `FOR SHARE` (§D-9): choca con la edición, el movimiento de tema y el borrado de esa tarea (que la toman con `FOR NO KEY UPDATE` o `FOR UPDATE`) y no con entregar, anular ni comentar (`FOR KEY SHARE`).
6. **Lecturas de varias sentencias en una sola instantánea** (ESSENTIALS, FIX-CLASES): el gradebook y "Mis calificaciones" corren con `enTransaccion(…, { instantaneaUnica: true })`; los cursores se comprueban dentro de la misma instantánea antes de la página. Las lecturas de una entrega ya la usan (ENTREGAS-01).
7. **Agregados, no contadores guardados** (ESSENTIALS): los promedios, el promedio de la clase, las vencidas sin entregar y el riesgo se calculan en cada lectura, con `SUM`/`COUNT` agrupados y las reglas puras de `core/`. Nada de eso se guarda.
8. **Números en centésimas enteras:** `core/` recibe y calcula en centésimas (`Math.round(x * 100)`) y solo divide al final; las sumas de SQL salen como `(SUM(calificacion) * 100)::bigint`. Ningún resultado depende del redondeo binario de un `float`.
9. **(Enmienda 1, N-01) Palabras que no se escriben ni en comentarios.** Varias listas estáticas de las `*.ataque` leen el texto crudo de los archivos, comentarios incluidos. En todo archivo nuevo o cambiado de este encargo, **ningún comentario** contiene: en `backend/src`, `COMENTARIO_CREADO`, `AVISO_FALLIDO`, `PUBLICACION_CREADA`, `MATERIAL_CREADO` o `colaDePublicacion` (`muro-c-r1.ataque:628`); fuera de `adapters/db`, `enTransaccion`, `instantaneaUnica` o `isolationLevel`, y fuera de `adapters/db/cliente.ts`, `REPEATABLE READ`, `RepeatableRead` o `Serializable` (`lecturas-fx-r1.ataque:758`); `DELETE FROM` o `TRUNCATE` (`lecturas-fx-r2.ataque:966`); `instantaneaUnica: true` en comentarios de `adapters/db/entregas.ts` o `adapters/db/calificaciones.ts` (`hilo-01c-r1.ataque:718` y C-4 cuentan el texto crudo). En `frontend/src`, en los archivos que vigilan las reglas de ENTREGAS y TAREAS (`features/tareas/**`, `features/calificaciones/**`, `components/**`, `lib/**`), ningún comentario con `vidrio`, `data-material` (salvo en `features/calificaciones/gradebook-view.tsx`, M-03, donde el atributo es código), `disabled`, `?? []`, `fetch(`, `console.`, `_blank`, `perspectivaDeRuta(`, `correo` o `estadoPago`, ni los literales "Sin tema" o "Sin categoría". En lugar de nombrar la palabra, el comentario la describe ("el aviso del hilo", "la opción de instantánea"). La ronda 0 recorre estas listas en crudo (O-1 de la revisión).

### §D-1 · Migración (01a; una sola carpeta, `<timestamp>_calificaciones`)
Prisma genera lo que puede expresar; los `CHECK` van a mano al final del mismo archivo, como en TAREAS-01a y ENTREGAS-01a. Todo es aditivo o relaja una restricción: el backend de ENTREGAS-01 sigue funcionando sobre el esquema nuevo (nunca escribe `calificado`).

```sql
-- Prisma (columnas y tabla nuevas)
ALTER TABLE "entregas" ADD COLUMN "calificacion" DECIMAL(7,2),
                       ADD COLUMN "fecha_calificacion" TIMESTAMPTZ(3);

CREATE TABLE "puntajes_rubrica" (
  "entrega_id"  UUID NOT NULL,
  "criterio_id" UUID NOT NULL,
  "puntos"      DECIMAL(7,2) NOT NULL,
  "creado_en"   TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "puntajes_rubrica_pkey" PRIMARY KEY ("entrega_id", "criterio_id")
);
CREATE INDEX "puntajes_rubrica_criterio_id_idx" ON "puntajes_rubrica"("criterio_id");
ALTER TABLE "puntajes_rubrica" ADD CONSTRAINT "puntajes_rubrica_entrega_id_fkey"
  FOREIGN KEY ("entrega_id") REFERENCES "entregas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
-- Enmienda 1 (M-01): Prisma genera esta FK sin DEFERRABLE; en el archivo de la migración se reemplaza a
-- mano su sentencia por esta, con el mismo nombre (Prisma no expresa la diferibilidad).
ALTER TABLE "puntajes_rubrica" ADD CONSTRAINT "puntajes_rubrica_criterio_id_fkey"
  FOREIGN KEY ("criterio_id") REFERENCES "criterios_rubrica"("id")
  ON DELETE NO ACTION ON UPDATE CASCADE DEFERRABLE INITIALLY DEFERRED;

-- A mano (Prisma no expresa CHECK y no lo compara al buscar deriva):
ALTER TABLE "entregas" ADD CONSTRAINT "entregas_calificacion_segun_estado"
  CHECK ((("estado" = 'calificado') = ("calificacion" IS NOT NULL))
     AND (("calificacion" IS NULL) = ("fecha_calificacion" IS NULL)));
ALTER TABLE "entregas" ADD CONSTRAINT "entregas_calificacion_en_rango"
  CHECK ("calificacion" IS NULL OR "calificacion" BETWEEN 0 AND 1000);
ALTER TABLE "puntajes_rubrica" ADD CONSTRAINT "puntajes_rubrica_puntos_en_rango"
  CHECK ("puntos" BETWEEN 0 AND 1000);

-- Solo con P-03 (a) o (c): calificar a quien no entregó deja la fila en calificado sin fecha de entrega.
-- El nombre se conserva: las pruebas que lo nombran (asignada con fecha, entregada sin fecha) siguen valiendo.
ALTER TABLE "entregas" DROP CONSTRAINT "entregas_fecha_segun_estado";
ALTER TABLE "entregas" ADD CONSTRAINT "entregas_fecha_segun_estado"
  CHECK (("estado" = 'asignado'   AND "fecha_entrega" IS NULL)
      OR ("estado" = 'entregado'  AND "fecha_entrega" IS NOT NULL)
      OR  "estado" = 'calificado');
ALTER TABLE "entregas" ADD CONSTRAINT "entregas_sin_fecha_sin_retraso_ni_enlaces"
  CHECK ("fecha_entrega" IS NOT NULL OR ("con_retraso" = false AND "enlaces" = '[]'::jsonb));
```

- **Llaves foráneas (Enmienda 1, M-01).** `puntajes_rubrica.entrega_id` es `CASCADE` (el desglose muere con su entrega, también en el borrado confirmado del admin). `puntajes_rubrica.criterio_id` es **`NO ACTION DEFERRABLE INITIALLY DEFERRED`**. Por qué no un `NO ACTION` inmediato: al borrar una tarea, PostgreSQL encola las acciones de las FK de `tareas` en el orden de sus disparadores; la cascada a `criterios_rubrica` (la FK más antigua) encola la comprobación de `puntajes_rubrica` **antes** de que la cascada a `entregas` encole el borrado de los puntajes, así que la comprobación los encontraría y el borrado confirmado del admin (S-06 de ENTREGAS-01) o el de la clase fallarían con `23503`. La analogía con `archivos.publicacion_id` no vale: ahí la cascada hermana nace en el mismo nivel. Con la comprobación diferida al `COMMIT`, la cascada ya terminó cuando se comprueba: no depende del orden de los disparadores. Por qué no `CASCADE`: conserva la defensa en profundidad (si un defecto de `editarTarea` borrara los criterios de una tarea calificada, la transacción falla al confirmar en lugar de borrar el desglose en silencio) y deja un fallo ruidoso si alguien revierte el backend (R-07). Con P-04 (a), `editarTarea` nunca reemplaza criterios de una tarea calificada (§D-4), así que en un flujo normal la comprobación siempre pasa.
- **(Enmienda 1, M-01) Prisma y la FK diferida.** Prisma no expresa `DEFERRABLE`: `schema.prisma` declara la relación con `onDelete: NoAction`, con un comentario que dice que la FK real es diferida y vive en la migración (sentencia escrita a mano, con el mismo nombre, en lugar de la que genera Prisma). Paso 3 de 01a: después de `migrate dev`, `npx prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma` (o la forma que ya usa el proyecto) debe decir "No difference detected", y un `migrate dev` siguiente no debe proponer recrear la FK; si lo propone, es PA-06. La prueba del borrado en cascada (CAL-1A19 y CAL-1A20) corre en ese mismo paso, antes de seguir (O-2 de la revisión); si falla, es PA-10.
- **`puntajes_rubrica_criterio_id_idx`:** lo usa la comprobación de la FK cuando `editarTarea` borra los criterios de una tarea sin calificaciones (sin el índice, cada borrado recorrería la tabla entera).
- **Sin índice nuevo en `entregas`:** el gradebook y "Mis calificaciones" usan el único `(tarea_id, alumno_id)` y `entregas_alumno_id_idx` (§D-6, §D-7).
- **Con P-03 (b):** no se tocan `entregas_fecha_segun_estado` ni se agrega `entregas_sin_fecha_sin_retraso_ni_enlaces`.
- **Con P-04 (b):** `puntajes_rubrica` pasa a `(entrega_id, orden)` como PK, con `criterio_id` nulo (`ON DELETE SET NULL`), `criterio` (texto) y `puntos_max` copiados, y `entregas` suma `puntos_de_la_tarea INT` (los puntos con que se calificó).
- **`schema.prisma`:** `Entrega.calificacion Decimal? @db.Decimal(7, 2)`, `Entrega.fechaCalificacion DateTime? @map("fecha_calificacion") @db.Timestamptz(3)`, `Entrega.puntajes PuntajeRubrica[]`; `model PuntajeRubrica` (`@@map("puntajes_rubrica")`, `@@id([entregaId, criterioId])`, `@@index([criterioId])`, relaciones a `Entrega` (`Cascade`) y a `CriterioRubrica` (`NoAction`; diferida en la migración, Enmienda 1, M-01)); `CriterioRubrica.puntajes PuntajeRubrica[]`. Comentarios en el modelo con la marca CALIFICACIONES-01a.
- **`Decimal` de Prisma solo en `adapters/db`:** el adaptador convierte con `.toNumber()` (exacto para dos decimales hasta 1000) y entrega `number` a `core/` y a los handlers.

### §D-2 · `core/calificaciones/` (puro, con pruebas unitarias; 01a)

#### §D-2.1 · `core/calificaciones/calificar.ts`
```ts
export interface CriterioParaCalificar { id: string; criterio: string; puntosMax: number }
export interface PuntajeEnviado { criterioId: string; puntos: number }
export interface CalificacionDecidida {
  calificacion: number                                   // ya redondeada a centésimas
  puntajes: { criterioId: string; puntos: number }[]     // en el orden de los criterios; [] sin rúbrica
}

// Errores (§D-10).
export const entregaModificada = (): AppError       // 409 ENTREGA_MODIFICADA
export const rubricaModificada = (): AppError       // 409 RUBRICA_MODIFICADA
export const entregaNoCalificable = (): AppError    // 409 ENTREGA_NO_CALIFICABLE
export const tareaConCalificaciones = (): AppError  // 409 TAREA_CON_CALIFICACIONES

// RN-05: la suma de los puntos por criterio, escalada a los puntos de la tarea. En centésimas:
// round(Σ puntos_c * puntosDeLaTarea / Σ puntosMax), con las mitades hacia arriba. Sin rúbrica no se usa.
export const escalarALaTarea = (p: {
  puntos: readonly number[]; maximos: readonly number[]; puntosDeLaTarea: number
}): number

// Lanza, en este orden:
// 0. (Enmienda 1, M-02) RUBRICA_MODIFICADA (409) si puntosVistos (los puntos de la tarea con que se abrió
//    el panel, del cuerpo) no son los puntos de la fila ya bloqueada.
// 1. RUBRICA_MODIFICADA (409) si la forma del cuerpo no corresponde a la tarea vigente: con rúbrica,
//    calificacionDirecta debe ser null y los criterioId deben ser exactamente los de la rúbrica (ni
//    uno de más, ni uno de menos); sin rúbrica, puntajes debe ser [] y calificacionDirecta un número.
// 2. VALIDACION (400) si un valor sale de rango: "puntajes.<i>.puntos: Escribe de 0 a <max> puntos."
//    (i = posición en el cuerpo) o "calificacion: Escribe de 0 a <puntos> puntos.".
// Devuelve la calificación (escalada con rúbrica; la directa tal cual) y los puntajes ordenados.
export const decidirCalificacion = (p: {
  criterios: readonly CriterioParaCalificar[]
  puntosDeLaTarea: number
  puntosVistos: number            // Enmienda 1, M-02
  puntajes: readonly PuntajeEnviado[]
  calificacionDirecta: number | null
}): CalificacionDecidida

// P-03 (c): entregado o calificado, siempre; asignado (o sin fila), solo con la fecha límite vencida
// (esTarde de core/entregas). Si no, ENTREGA_NO_CALIFICABLE. Con (a) no mira la fecha; con (b) rechaza
// todo asignado. Con (c′) (Enmienda 1): asignado solo con la entrega cerrada (entregaCerrada de
// core/entregas: vencida y la tarea no acepta tardías); por eso recibe la tarea completa.
export const exigirEntregaCalificable = (p: {
  estado: EstadoEntrega; tarea: { fechaLimite: Date; aceptaTardias: boolean }; ahora: Date
}): void

// P-04 (a), con N-02 (Enmienda 1). Rúbrica idéntica = mismo número de criterios y, en orden, mismo texto y
// mismos puntos máximos. Con calificadas > 0 y puntos distintos o rúbrica no idéntica:
// TAREA_CON_CALIFICACIONES. Si no lanza, devuelve reemplazarRubrica = !rubricaIdentica: una rúbrica
// idéntica nunca se reemplaza, haya o no calificaciones (los ids se conservan); una distinta, sin
// calificaciones, se reemplaza como hoy (S-04 de TAREAS-01). Nunca escribe.
export const exigirRubricaCongelada = (p: {
  calificadas: number
  puntosActuales: number
  puntosNuevos: number
  rubricaActual: readonly { criterio: string; puntosMax: number }[]
  rubricaNueva: readonly { criterio: string; puntosMax: number }[]
}): { reemplazarRubrica: boolean }
```
`EstadoEntrega`, `esTarde` y `entregaCerrada` se importan de `core/entregas/entregas.ts` (no cambia). **Por qué los puntos vistos (Enmienda 1, M-02):** en una tarea sin rúbrica de 10 puntos, si otra persona la sube a 100 mientras una maestra escribe "9", el cuerpo tiene la forma correcta y 9 está en rango: sin esta comparación se guardaría "9 de 100". Con rúbrica, un cambio de criterios cambia sus ids (con N-02 solo se reemplaza una rúbrica distinta) y lo detecta el paso 1; un cambio solo de los puntos de la tarea lo detecta el paso 0. Con P-04 (c), `exigirRubricaCongelada` compara solo número de criterios, puntos máximos y puntos, y devuelve además `actualizarTextos: boolean`.

#### §D-2.2 · Por qué el orden RUBRICA_MODIFICADA → VALIDACION
Un cuerpo con la forma de una rúbrica vieja (otro criterio, otro número de criterios) no es un error de captura: la tarea cambió mientras se calificaba (solo puede pasar si nadie la había calificado, P-04 a). Por eso es `409` y el panel recarga (S-12). Un valor fuera de rango con la forma correcta sí es de captura: `400` con el campo, sin recargar.

#### §D-2.3 · `core/calificaciones/general.ts` (RN-05, P-01 de TAREAS-01, P-05 a)
```ts
export interface CategoriaDeLaClase { id: string; nombre: string; peso: number }
export interface AgregadoPorCategoria {
  categoriaId: string | null      // null: tareas "Sin categoría"
  obtenidoCentesimas: number      // Σ calificacion × 100 de las tareas calificadas
  posible: number                 // Σ puntos de esas tareas
  tareas: number                  // cuántas
}
export interface DesgloseDeCategoria {
  id: string; nombre: string; peso: number
  pesoEfectivo: number | null     // su peso repartido entre las categorías con tareas calificadas (2 decimales); null si no tiene
  porcentaje: number | null       // obtenido / posible × 100 (2 decimales); null sin tareas calificadas
  obtenido: number; posible: number; tareas: number
}
export interface CalificacionGeneral {
  modo: "puntos" | "categorias"
  porcentaje: number | null       // 2 decimales; null si nada cuenta
  puntos: { obtenido: number; posible: number; tareas: number }  // lo que cuenta en la general
  categorias: DesgloseDeCategoria[]                               // [] en modo puntos; en el orden de la clase
  sinCategoria: { tareas: number }                                // calificadas sin categoría (no cuentan con categorías)
}
export const calificacionGeneral = (p: {
  categorias: readonly CategoriaDeLaClase[]
  agregados: readonly AgregadoPorCategoria[]
}): CalificacionGeneral
export const promedioDeLaClase = (porcentajes: readonly (number | null)[]): number | null
```
Reglas, en este orden:
1. **Sin categorías en la clase → modo `puntos`:** el porcentaje es Σ obtenido / Σ posible de todas las tareas calificadas (todas las agregadas; ninguna tiene categoría porque una categoría con tareas no se quita). `null` sin tareas calificadas. `sinCategoria.tareas` = 0 (no aplica).
2. **Con categorías → modo `categorias`:** cada categoría de la clase con su agregado (o sin tareas). Las categorías sin tareas calificadas no cuentan y su peso se reparte proporcionalmente: `pesoEfectivo = peso / Σ pesos de las categorías con tareas × 100`. El porcentaje general es Σ (porcentaje sin redondear × peso) / Σ pesos de las que cuentan, redondeado al final. Las tareas "Sin categoría" no cuentan (`sinCategoria.tareas` dice cuántas hay). `null` si ninguna categoría tiene tareas calificadas.
3. **Dentro de una categoría, por puntos (P-05 a):** obtenido / posible. Con P-05 (b), promedio de los porcentajes de cada tarea (el agregado pasa a llevar Σ porcentajes y `tareas`).
4. Un agregado con un `categoriaId` que no está en la lista de la clase es inalcanzable (FK y misma instantánea): lanza `AppError("ERROR_INTERNO", "La calificación tiene una categoría que no es de la clase.", 500)`, nunca lo ignora.
5. `promedioDeLaClase`: media de los no nulos, redondeada a 2 decimales; `null` si no hay ninguno.
6. Las tareas sin calificar no entran en ningún agregado (la consulta solo suma `calificado`); las entregas con retraso se suman igual (S-03).

#### §D-2.4 · `core/calificaciones/riesgo.ts` (RN-05, S-04)
```ts
export const UMBRAL_PROMEDIO_EN_RIESGO = 70
export const UMBRAL_VENCIDAS_SIN_ENTREGAR = 3
export type MotivoDeRiesgo = "promedio" | "vencidas"
// "promedio" si porcentaje !== null && porcentaje < 70 (el redondeado); "vencidas" si vencidas >= 3.
// En ese orden; [] si ninguno.
export const motivosDeRiesgo = (p: { porcentaje: number | null; vencidasSinEntregar: number }): MotivoDeRiesgo[]
```

### §D-3 · Calificar — `PUT /clases/:claseId/tareas/:tareaId/entregas/:alumnoId/calificacion` (01a)
Cuerpo `calificarEntregaSchema` (§D-11) después de `conTextosNormalizados(request.body, ["comentario"])`. En el handler: `ahora = new Date()`, `eventoId = randomUUID()` y, si hay comentario, `comentarioId = randomUUID()`. Después `calificarEntrega(…, alGuardar)` (`adapters/db/entregas.ts`, A-2), en una transacción READ COMMITTED, en este orden. **(Enmienda 1, N-08)** Antes del paso 8 la única escritura es la fila perezosa del paso 4; si cualquier paso del 5 al 7 lanza, la transacción se revierte entera y esa fila tampoco queda (CAL-1A13 "sin crear fila"):
1. `bloquearTareaParaCalificar(tx, { tareaId, claseId })` (función privada nueva del mismo archivo; SQL etiquetado y parametrizado): `SELECT fecha_limite, acepta_tardias, puntos FROM tareas WHERE id = $tareaId::uuid AND clase_id = $claseId::uuid FOR SHARE` (`acepta_tardias` lo usa P-03 (c′), Enmienda 1; con (c) se lee igual y no se usa). Sin fila → `null` → `404 TAREA_NO_ENCONTRADA`. **Es el único `FOR SHARE` de `entregas.ts`;** el `FOR KEY SHARE` de `bloquearTareaParaEntregar` sigue siendo el único de su modo (las `*.ataque` de C-9 de ENTREGAS-01 no cambian).
2. `alumnoInscrito(tx, { claseId, alumnoId })` (la privada que ya existe): `404 ALUMNO_NO_ENCONTRADO`.
3. Los criterios de la tarea: `tx.criterioRubrica.findMany({ where: { tareaId }, orderBy: { orden: "asc" }, select: { id, criterio, puntosMax } })` (único `(tarea_id, orden)`). Estables: la edición que los reemplaza espera al `FOR SHARE`.
4. `asegurarFilaDeEntrega(tx, { tareaId, alumnoId })` (la privada que ya existe; `INSERT … ON CONFLICT DO NOTHING`). Solo hace falta con P-03 (a) o (c); con (b) se omite y "sin fila" es `asignado`.
5. `bloquearEntrega(tx, { tareaId, alumnoId })` (la privada que ya existe, `FOR NO KEY UPDATE`). Dos calificaciones, o una calificación y una entrega o una anulación del mismo alumno, quedan en serie aquí.
6. `exigirVersion({ leida: version, actual: fila.version }, entregaModificada)` (`core/concurrencia.ts`, sin cambios). Una fila recién creada nace con versión 0, la misma que `GET …/entregas/:alumnoId` responde sin fila.
7. `exigirEntregaCalificable({ estado: fila.estado, tarea: { fechaLimite, aceptaTardias }, ahora })` y `decidirCalificacion({ criterios, puntosDeLaTarea: puntos, puntosVistos: cuerpo.puntosDeLaTarea, puntajes, calificacionDirecta })` (Enmienda 1: `puntosVistos`, M-02; la tarea completa, por (c′)).
8. Escrituras: `tx.puntajeRubrica.deleteMany({ where: { entregaId } })` y, si hay puntajes, `tx.puntajeRubrica.createMany({ data })` (una sentencia cada una; nunca en un ciclo); `tx.entrega.update({ where: { id }, data: { estado: "calificado", calificacion, fechaCalificacion: ahora, version: { increment: 1 } }, select: { version: true } })`; con comentario, `tx.comentario.create({ data: { id: comentarioId, entregaId, autorId, texto } })` (el hilo privado de esa entrega, P-02 a; **no encola `COMENTARIO_CREADO`**, S-11). `fecha_entrega`, `con_retraso` y `enlaces` no cambian.
9. `alGuardar(ejecutorSqlDe(tx), { entregaId, version })`: el handler encola `CALIFICACION_PUBLICADA` con id `eventoId` y datos `{ entregaId, tareaId, claseId, version }` (§D-8).
10. Responde `leerEntregaDeAlumno({ claseId, tareaId, alumnoId }, tx)` dentro de la misma transacción (anidada: la opción de instantánea se ignora, como en entregar). Respuesta `200` con `entregaDeAlumnoRespuestaSchema` (con `calificacion` y la `version` nueva).

- **Recalificar** es la misma petición sobre una entrega `calificado`: reemplaza los puntajes, la calificación y la fecha, sube la versión y vuelve a encolar el aviso.
- **Carreras** (también en §D-9): (a) el alumno anula o vuelve a entregar antes → la versión cambió → `409 ENTREGA_MODIFICADA`; (b) el maestro califica antes → la anulación recibe `409 ENTREGA_CALIFICADA` (ya existe) y la entrega `409 ENTREGA_CALIFICADA`; (c) dos maestros con la misma versión → el segundo recibe `409 ENTREGA_MODIFICADA`; (d) editar la rúbrica antes (sin calificaciones) → los criterios cambiaron → `409 RUBRICA_MODIFICADA`; cambiar solo los puntos de la tarea antes (con o sin rúbrica) → `409 RUBRICA_MODIFICADA` por los puntos vistos (Enmienda 1, M-02); cambiar solo el título antes → la calificación pasa (N-02: la rúbrica idéntica conserva sus ids); calificar antes → la edición recibe `409 TAREA_CON_CALIFICACIONES` (P-04 a); (e) borrar la tarea antes → `404 TAREA_NO_ENCONTRADA`; calificar antes → el borrado del maestro recibe `409 TAREA_CON_ENTREGAS` (la calificada cuenta, S-06 de ENTREGAS-01). Nunca un `deadlock`, un `P2003` ni un `500`; un `P2028` es `503 SERVICIO_OCUPADO`.
- **Borrar una tarea calificada (Enmienda 1, M-01):** `borrarTarea` no cambia. El borrado confirmado del admin (`?confirmar=entregas`) de una tarea con rúbrica y entregas calificadas responde `204`: la cascada se lleva criterios, entregas, puntajes e hilos, y la FK diferida de `puntajes_rubrica.criterio_id` se comprueba al confirmar, cuando ya no queda ningún puntaje (CAL-1A19). Lo mismo al borrar la clase (hoy no hay ruta; lo hace la limpieza de las pruebas, CAL-1A20).
- **Desde la entrega del alumno:** una entrega calificada no se entrega, no se anula y no recibe archivos (las reglas de `core/entregas` ya lo dicen con `ENTREGA_CALIFICADA`); con P-03 (c), tampoco la calificada sin entrega.

### §D-4 · Congelar puntos y rúbrica de una tarea calificada (P-04 a; `editarTarea`, 01a, A-2)
En `adapters/db/tareas.ts`, solo dentro de `editarTarea`:
1. El `SELECT … FOR NO KEY UPDATE OF t` que ya existe suma `t.puntos`.
2. Después de la autoría y de `exigirVersion` (sin cambio de orden) y **antes** de `validarFechaLimite`: `const calificadas = await tx.entrega.count({ where: { tareaId, estado: "calificado" } })` (prefijo `tarea_id` del único) y los criterios actuales (`findMany` por `tarea_id`, orden; Enmienda 1, N-02: se leen siempre, para comparar). `exigirRubricaCongelada({ calificadas, puntosActuales, puntosNuevos: datos.puntos, rubricaActual, rubricaNueva: datos.rubrica })` → `409 TAREA_CON_CALIFICACIONES` sin escribir nada.
3. El reemplazo de criterios (`deleteMany` + `createMany`) corre solo si `reemplazarRubrica`. **(Enmienda 1, N-02)** Una rúbrica idéntica no se reemplaza nunca, con o sin calificaciones: sus ids se conservan, los puntajes siguen apuntando a ellos y corregir el título de una tarea mientras otra persona califica no le provoca un `409`. `criterioRubrica.deleteMany` sigue existiendo (inventario O-4 sin cambio) y las pruebas de TAREAS-01 que cambian la rúbrica (PR-1B08) siguen igual; ninguna prueba exige ids nuevos con la rúbrica idéntica (grep de `criterioRubrica.findMany` en `backend/test`: solo comparan antes y después de un `409`).
4. Orden de errores de `editarTarea` desde 01a: `404 TAREA_NO_ENCONTRADA` → `403 EDICION_NO_PERMITIDA` → `409 TAREA_MODIFICADA` → `409 TAREA_CON_CALIFICACIONES` → `400 FECHA_LIMITE_INVALIDA` → categoría y tema. Nada más de `editarTarea`, `crearTarea`, `borrarTarea`, `leerTarea` ni `listarTrabajo` cambia.
5. `moverATema` no mira calificaciones (mover no toca puntos ni rúbrica).

Con P-04 (b), §D-4 no existe y §D-3 guarda las copias; con (c), el paso 3 actualiza el texto de cada criterio en su lugar con un `UPDATE … FROM (VALUES …)` etiquetado (una sentencia).

### §D-5 · La calificación en las lecturas de una entrega (01a, A-2)
- `MiEntregaDb` y `EntregaDeAlumnoDb` suman `calificacion: CalificacionDb | null`, con `CalificacionDb = { puntos: number; sobre: number; fecha: Date; puntajes: { criterioId: string; criterio: string; puntosMax: number; puntos: number }[] }` (`sobre` = los puntos de la tarea; con P-04 a, los mismos con que se calificó).
- `SELECT_ENTREGA` suma `calificacion` y `fechaCalificacion`. La tarea se lee con `puntos` (en `leerMiEntregaCon`, junto a `SELECT_TAREA_PARA_ENTREGAR`; en `leerEntregaDeAlumnoCon`, la comprobación `existeLaTarea` pasa a leer `puntos`). **Solo si la entrega está `calificado`**, una consulta más: `tx.puntajeRubrica.findMany({ where: { entregaId }, select: { puntos, criterio: { select: { id, criterio, puntosMax, orden } } } })`, ordenada por `criterio.orden` (PK `(entrega_id, criterio_id)`; los criterios por su PK). Una consulta por petición, nunca por elemento.
- `calificado` sin `calificacion` (o al revés) es inalcanzable por `entregas_calificacion_segun_estado`: `errorEntregaMalFormada()` (500 explícito, el que ya existe), nunca un valor inventado.
- `handlers/respuestas-de-entrega.ts` (nuevo): `miEntregaParaResponder(almacen, entrega)` (movida de `handlers/tareas/entregas.ts`, con `calificacion`) y `entregaDeAlumnoParaResponder(almacen, entrega)` (lo que hoy arma en línea `GET …/entregas/:alumnoId`, con `calificacion`), más `calificacionParaResponder(c)` (fechas en ISO 8601). Las usan `handlers/tareas/entregas.ts` y `handlers/calificaciones.ts`. El alumno sigue sin `version` (S-11 de ENTREGAS-01).

### §D-6 · Gradebook — `GET /clases/:claseId/gradebook?cursor=&limite=&cursorTareas=&limiteTareas=` (01b)
Consulta `gradebookQuerySchema` (§D-11): `cursor` (un `usuarioId`, como el roster), `limite` (1 a 50, 25 por defecto), `cursorTareas` (el id de la última tarea de la ventana anterior) y `limiteTareas` (1 a 50, 20 por defecto). `leerGradebook({ claseId, cursor, limite, cursorTareas, limiteTareas, ahora })` en `adapters/db/calificaciones.ts` (archivo nuevo), en **una sola instantánea**, con las sentencias en serie:
1. **Columnas.** Con `cursorTareas`, primero esa tarea por `(id, clase_id)` (sin fila → `400 VALIDACION` "cursorTareas: no es válido"); después la página: `tarea.findMany({ where: { claseId, …(cursorTareas ? { OR: [{ fechaLimite: { lt: f } }, { fechaLimite: f, id: { lt: cursorTareas } }] } : {}) }, orderBy: [{ fechaLimite: "desc" }, { id: "desc" }], take: limiteTareas + 1, select: { id, fechaLimite, puntos, categoria: { select: { id, nombre } }, publicacion: { select: { titulo } } } })` (índice `(clase_id, fecha_limite)`). El título viene de la publicación (relación obligatoria: por eso la instantánea). `paginar` da `siguienteCursorTareas`.
2. **Filas.** `condicionesDePaginaDeAlumnos({ claseId, cursor, limite }, tx)` (exportada de `inscripciones.ts` desde ENTREGAS-01, sin cambios: inscritos con cuenta activa, orden `nombre_busqueda, usuario_id`, cursor comprobado por PK, `400` si no existe) y `inscripcion.findMany` con `usuarioId` y `usuario.nombre`. `paginar` da `siguienteCursor`.
3. **Celdas.** Una sola consulta: `entrega.findMany({ where: { tareaId: { in: idsDeColumnas }, alumnoId: { in: idsDeFilas } }, select: { tareaId, alumnoId, estado, conRetraso, calificacion } })` (único `(tarea_id, alumno_id)`). Sin fila: `asignado`, sin retraso ni calificación.
4. **Categorías de la clase** (hasta 10): `categoria.findMany({ where: { claseId }, select: { id, nombre, peso }, orderBy: [{ creadoEn: "asc" }, { id: "asc" }] })` (índice `(clase_id, creado_en, id)`).
5. **Agregado de la clase por alumno y categoría** (SQL etiquetado; Prisma no agrupa por un campo de otra tabla):
   ```sql
   SELECT e.alumno_id::text AS alumno_id, t.categoria_id::text AS categoria_id,
          (SUM(e.calificacion) * 100)::bigint AS obtenido_centesimas,
          SUM(t.puntos)::int AS posible, COUNT(*)::int AS tareas
   FROM tareas t
   JOIN entregas e      ON e.tarea_id = t.id AND e.estado = 'calificado'
   JOIN inscripciones i ON i.clase_id = t.clase_id AND i.usuario_id = e.alumno_id
   JOIN usuarios u      ON u.id = e.alumno_id AND u.activo
   WHERE t.clase_id = ${claseId}::uuid
   GROUP BY e.alumno_id, t.categoria_id
   ```
   Índices: `tareas(clase_id, fecha_limite)` (prefijo), el único de `entregas` (prefijo `tarea_id`), la PK de `inscripciones` y la de `usuarios`. Devuelve a lo más (alumnos × 11) filas: no es una lista que se responda, es la entrada de `calificacionGeneral`.
6. **Vencidas sin entregar por alumno** (SQL etiquetado):
   ```sql
   SELECT i.usuario_id::text AS alumno_id, COUNT(t.id)::int AS vencidas
   FROM inscripciones i
   JOIN usuarios u ON u.id = i.usuario_id AND u.activo
   JOIN tareas t   ON t.clase_id = i.clase_id AND t.fecha_limite < ${ahora}
   LEFT JOIN entregas e ON e.tarea_id = t.id AND e.alumno_id = i.usuario_id
                        AND e.estado IN ('entregado', 'calificado')
   WHERE i.clase_id = ${claseId}::uuid AND e.id IS NULL
   GROUP BY i.usuario_id
   ```
   Índices: PK de `inscripciones` (prefijo `clase_id`), `tareas(clase_id, fecha_limite)` (rango), el único de `entregas`. `fecha_limite < ahora` es `esTarde` (S-03 de ENTREGAS-01). Solo aparecen alumnos con al menos una.
7. **Total de alumnos:** `inscripcion.count({ where: { claseId, usuario: { activo: true } } })` (como `listarEntregas`).

Con eso, en el adaptador y con las funciones de `core/` (como `accionesDeEntrega` en `entregas.ts`): para cada alumno de la clase que aparece en 5 o 6, `calificacionGeneral` y `motivosDeRiesgo`; `promedioDeLaClase` sobre los porcentajes de los alumnos del agregado; `alumnosEnRiesgo` = cuántos tienen al menos un motivo (un alumno sin calificaciones y con menos de 3 vencidas no aparece en ninguno y no está en riesgo). Para las filas de la página: su porcentaje, sus vencidas y sus motivos, y sus celdas en el orden de las columnas.

Respuesta `gradebookRespuestaSchema` (§D-11): `tareas` (columnas: `id`, `titulo`, `fechaLimite`, `puntos`, `categoria` o `null`), `siguienteCursorTareas`, `alumnos` (filas: `alumno { id, nombre }`, `celdas` en el orden de `tareas` (`tareaId`, `estado`, `conRetraso`, `calificacion` o `null`), `porcentaje` o `null`, `vencidasSinEntregar`, `motivosDeRiesgo`), `siguienteCursor` y `resumen` (`modo`, `totalAlumnos`, `promedioDeLaClase` o `null`, `alumnosEnRiesgo`). Nunca correo, estado de pago, restricción, rol ni `version`.

### §D-7 · Mis calificaciones — `GET /clases/:claseId/mis-calificaciones?estado=&cursor=&limite=` (01b)
Consulta `misCalificacionesQuerySchema`: `estado` (`todas` por defecto, `asignadas`, `entregadas`, `calificadas` o `sin-entregar`), `cursor` (un `tareaId`) y `limite` (1 a 100, 20 por defecto). `leerMisCalificaciones({ claseId, alumnoId: perfilDe(request).id, filtro, cursor, limite, ahora })` en `adapters/db/calificaciones.ts`, en **una sola instantánea**:
1. Con cursor, la tarea por `(id, clase_id)` (sin fila → `400 VALIDACION` "cursor: no es válido"). El cursor solo necesita ser una tarea de la clase: su clave de orden (`fecha_limite`, `id`) sirve aunque la tarea ya no pase el filtro (criterio de N-04 de ENTREGAS-01).
2. La página: `tarea.findMany({ where: { claseId, …keyset, …filtro }, orderBy: [{ fechaLimite: "desc" }, { id: "desc" }], take: limite + 1, select: { id, fechaLimite, puntos, categoria: { select: { id, nombre } }, publicacion: { select: { titulo } } } })`. El filtro, con la relación `entregas` (un `EXISTS` por el único `(tarea_id, alumno_id)`):
   - `calificadas`: `entregas: { some: { alumnoId, estado: "calificado" } }`.
   - `entregadas`: `entregas: { some: { alumnoId, estado: "entregado" } }` (con o sin retraso).
   - `asignadas`: `fechaLimite: { gte: ahora }` y `entregas: { none: { alumnoId, estado: { in: ["entregado", "calificado"] } } }`.
   - `sin-entregar`: `fechaLimite: { lt: ahora }` y el mismo `none`.
   - `todas`: sin filtro.
3. Las entregas del alumno en las tareas de la página: una consulta, `entrega.findMany({ where: { alumnoId, tareaId: { in: ids } }, select: { tareaId, estado, conRetraso, calificacion } })`.
4. Las categorías de la clase y el **agregado del alumno** (SQL etiquetado, la misma suma que §D-6.5 para un alumno):
   ```sql
   SELECT t.categoria_id::text AS categoria_id, (SUM(e.calificacion) * 100)::bigint AS obtenido_centesimas,
          SUM(t.puntos)::int AS posible, COUNT(*)::int AS tareas
   FROM entregas e JOIN tareas t ON t.id = e.tarea_id
   WHERE e.alumno_id = ${alumnoId}::uuid AND t.clase_id = ${claseId}::uuid AND e.estado = 'calificado'
   GROUP BY t.categoria_id
   ```
   Índices: `entregas_alumno_id_idx` (por fin con una consulta que lo usa) y la PK de `tareas`. `calificacionGeneral` da `general`.

Respuesta `misCalificacionesRespuestaSchema`: `general` (`CalificacionGeneral`: el modal de RF-18 sale de aquí; ninguna ruta de categorías se abre al alumno, S-17 de TAREAS-01), `tareas` (`id`, `titulo`, `fechaLimite`, `puntos`, `categoria` o `null`, `entrega { estado, conRetraso, calificacion }`, con `asignado` si no hay fila) y `siguienteCursor`. Cada página trae `general` de su misma instantánea. Nunca `version`, el estado de pago ni nada de otro alumno: todas las consultas filtran por `alumnoId = perfilDe(request).id`.

**Mismo número en los dos lados (CAL-1B07):** el porcentaje del alumno en "Mis calificaciones" y el de su fila en el gradebook salen de la misma función (`calificacionGeneral`) sobre la misma suma.

### §D-8 · Evento (01a; `core/eventos/avisos-de-clase.ts` y `adapters/queue/colas.ts`, A-2)
- `COLA_CALIFICACION_PUBLICADA = "CALIFICACION_PUBLICADA"`, en `OPCIONES_DE_COLAS` con la misma política que las demás colas de avisos (3 reintentos con espera exponencial, `AVISO_FALLIDO`, retención de 7 días).
- `datosCalificacionPublicadaSchema = z.strictObject({ entregaId: z.uuid(), tareaId: z.uuid(), claseId: z.uuid(), version: z.number().int().min(1) })`, solo ids (S-11).
- Lo encola solo `handlers/calificaciones.ts`, desde `alGuardar(sql, …)` con el ejecutor de la transacción (`adapters/db` nunca importa `adapters/queue`). Sin consumidor ni cambio en `workers/`.

### §D-9 · Concurrencia y bloqueos (READ COMMITTED en las escrituras; instantánea única en las lecturas)

| Operación | Bloquea, en orden | Choca con |
|---|---|---|
| Calificar (01a) | `tareas` **`FOR SHARE`**; inscripción (lectura); `INSERT … ON CONFLICT` en `entregas`; `entregas` `FOR NO KEY UPDATE` + versión; `puntajes_rubrica` (borrar e insertar; la FK toma `FOR KEY SHARE` de los criterios); `comentarios` | Editar la tarea y moverla de tema (`FOR NO KEY UPDATE`) y borrarla (`FOR UPDATE`): quedan en serie. Entregar, anular, comentar y otra calificación de la misma tarea toman modos compatibles con `FOR SHARE` sobre la tarea y quedan en serie, si acaso, sobre la fila de `entregas` del mismo alumno |
| Editar tarea (01a, P-04) | `tareas` `FOR NO KEY UPDATE`; conteo de calificadas (sin bloqueo); criterios (solo si se reemplazan) | Calificar (en serie: la edición posterior ve la calificación y responde `409 TAREA_CON_CALIFICACIONES` si cambian puntos o rúbrica) |
| Entregar / anular / comentar (sin cambio) | `tareas` `FOR KEY SHARE`; `entregas` `FOR NO KEY UPDATE` | Calificar al mismo alumno (en serie sobre su fila; el segundo decide con lo que dejó el primero) |
| Borrar tarea (sin cambio) | `tareas` `FOR UPDATE` → … | Calificar (en serie: borrado primero → `404`; calificar primero → `409 TAREA_CON_ENTREGAS` para el maestro) |

- **Sin ciclos:** todas toman primero la fila de `tareas`; las que siguen toman `entregas` del alumno y, después, filas hijas. Calificar no toma nada antes de la tarea. Insertar puntajes toma `FOR KEY SHARE` de los criterios, que solo `editarTarea` borra, y `editarTarea` espera antes en la tarea.
- **Sin `LOCK TABLE` ni bloqueos consultivos.** Un `P2028` responde `503 SERVICIO_OCUPADO`.

### §D-10 · Errores nuevos (`AppError` en `core/calificaciones/calificar.ts`; códigos en `CODIGOS_CALIFICACIONES` de `shared/`)

| Código | HTTP | Mensaje |
|---|---|---|
| `ENTREGA_MODIFICADA` | 409 | "La entrega cambió mientras la calificabas: el alumno la anuló o la volvió a entregar, u otra persona la calificó. No se guardó tu calificación; revisa la entrega actual." |
| `RUBRICA_MODIFICADA` | 409 | "La rúbrica o los puntos de la tarea cambiaron mientras calificabas. No se guardó tu calificación; vuelve a calificar con la versión actual." (Enmienda 1, M-02: también cuando cambiaron solo los puntos de la tarea, con o sin rúbrica) |
| `ENTREGA_NO_CALIFICABLE` | 409 | Con P-03 (c): "Este alumno todavía puede entregar. Podrás calificarlo cuando entregue o cuando pase la fecha límite." Con (c′) (Enmienda 1): "Este alumno todavía puede entregar. Podrás calificarlo cuando entregue o cuando se cierre la entrega." Con (b): "Este alumno no ha entregado la tarea." |
| `TAREA_CON_CALIFICACIONES` | 409 | "Esta tarea ya tiene calificaciones: no puedes cambiar sus puntos ni su rúbrica. Lo demás sí se puede editar." |
| `VALIDACION` (existente) | 400 | "puntajes.<i>.puntos: Escribe de 0 a <max> puntos." · "calificacion: Escribe de 0 a <puntos> puntos." (de `core/`); los de forma, de los esquemas de §D-11 |
| `TAREA_NO_ENCONTRADA`, `ALUMNO_NO_ENCONTRADO`, `SIN_ACCESO_A_LA_CLASE`, `SERVICIO_OCUPADO`, `ENTREGA_CALIFICADA` (existentes) | — | Sin cambio |

### §D-11 · Esquemas de `shared/` (01a y 01b)
- **`shared/src/entregas.ts`** (01a): `puntajeDeCriterioSchema = z.strictObject({ criterioId: z.uuid(), criterio: z.string(), puntosMax: z.number().int().min(1).max(1000), puntos: z.number().min(0).max(1000) })`; `calificacionDeEntregaSchema = z.strictObject({ puntos: z.number().min(0).max(1000), sobre: z.number().int().min(1).max(1000), fecha: z.iso.datetime(), puntajes: z.array(puntajeDeCriterioSchema) })`; `miEntregaSchema` y `entregaDeAlumnoSchema` suman `calificacion: calificacionDeEntregaSchema.nullable()` (obligatoria, S-16). **Nombres elegidos para no entrar en las listas cerradas de las `*.ataque`:** ninguno lleva "omentario" (`hilo-01c-r1:756` cuenta 3) ni coincide con `^(miEntrega|entregaDeAlumno|filaDeEntrega|listaEntregas|alumnoDeEntrega)(Respuesta)?Schema$` (`entregas-01b-r1:1035` cuenta 7). `entregas.ts` sigue sin importar `tareas.ts` ni `calificaciones.ts`.
- **`shared/src/calificaciones.ts`** (nuevo; importa de `entregas.ts`, `clases.ts`, `enlaces-registro.ts` y `tareas.ts` (`MAXIMO_CRITERIOS_RUBRICA` y `PUNTOS_MAXIMOS`; Enmienda 1, N-07), nunca al revés: ninguno de esos cuatro importa `calificaciones.ts`, así que no hay ciclo):
  - `tieneHastaDosDecimales = (n: number): boolean` (`Number.isFinite(n) && Math.round(n * 100) / 100 === n`) y `puntosDeCalificacionSchema = z.number({ error: "Escribe un número de puntos" }).min(0, …).max(1000, …).refine(tieneHastaDosDecimales, "Usa hasta 2 decimales")`.
  - `calificarEntregaSchema = z.strictObject({ version: z.number().int().min(0), puntosDeLaTarea: z.number().int().min(1).max(PUNTOS_MAXIMOS) (Enmienda 1, M-02: los puntos de la tarea con que se abrió el panel), puntajes: z.array(z.strictObject({ criterioId: z.uuid().transform(minúsculas), puntos: puntosDeCalificacionSchema })).max(MAXIMO_CRITERIOS_RUBRICA).refine(sin criterioId repetido, "No repitas un criterio"), calificacion: puntosDeCalificacionSchema.nullable(), comentario: textoConContenidoSchema(1000, "Escribe tu comentario").optional() })`. Las cuatro primeras llaves son obligatorias (`calificacion` puede ser `null`).
  - `motivoDeRiesgoSchema`, `desgloseDeCategoriaSchema`, `calificacionGeneralSchema` (la forma de §D-2.3), `columnaDelGradebookSchema`, `celdaDelGradebookSchema`, `filaDelGradebookSchema`, `resumenDelGradebookSchema`, `gradebookRespuestaSchema` (01b): todos `z.strictObject`.
  - `gradebookQuerySchema = paginacionSchema.extend({ limite: 1..50, default 25; cursorTareas: z.uuid().transform(minúsculas).optional(); limiteTareas: z.coerce.number().int().min(1).max(50).optional().default(20) })`.
  - `filtroDeMisCalificacionesSchema = z.enum(["todas", "asignadas", "entregadas", "calificadas", "sin-entregar"])`, `misCalificacionesQuerySchema = paginacionSchema.extend({ estado: filtro.optional().default("todas") })`, `tareaDeMisCalificacionesSchema`, `misCalificacionesRespuestaSchema` (01b), todos `z.strictObject` salvo las consultas.
  - `CODIGOS_CALIFICACIONES` con los cuatro códigos de §D-10. Los tipos inferidos de todo lo anterior.
- **`shared/src/index.ts`**: reexporta por nombre lo nuevo (regla de A-11 de CLASES-02). `npm run build` de `shared` en cada subentrega que lo toca, antes de correr el backend (R-17 de TAREAS-01).

### §D-12 · Frontend de 01c: calificar y ver la calificación (`features/tareas`, A-4)
1. **Piezas compartidas:**
   - `lib/format.ts`: `formatearPuntos(n: number): string` (`Intl.NumberFormat("es-MX", { maximumFractionDigits: 2, useGrouping: false })`: "8.5", "10", "7.78", "1000") y `formatearPorcentaje(n: number): string` (`formatearPuntos(n)` + espacio de no separación + "%": "87.5 %"). Nada más de ese archivo cambia (S-15).
   - `services/calificacionesService.ts` (nuevo, solo claves): `clavePrefijoDeCalificaciones(claseId) = ["clases", claseId, "calificaciones"] as const`, `claveGradebook(claseId, ventana)` y `claveMisCalificaciones(claseId, filtro)`, que cuelgan del prefijo. Lo usan `features/tareas` (para invalidar al calificar) y `features/calificaciones`. No toca `trabajoService.ts`.
   - `components/clase/data.ts`: `TEXTOS_DE_LA_CLASE.sinCategoria = "Sin categoría"`; las dos llaves `sinCategoria` de `features/tareas/data.ts` toman su valor de ahí (como "Sin tema" en ENTREGAS-01a). El literal queda en un solo archivo (CAL-1C12).
2. **`lib.ts`:** `rutaDeCalificacion(claseId, tareaId, alumnoId)` (`${rutaDeEntregaDeAlumno(…)}/calificacion`); `aNumeroDePuntos(texto)` (recorta, acepta punto o coma decimal, `^\d+([.,]\d{1,2})?$`; cualquier otra cosa da `NaN`, que la validación rechaza; nunca coacciona en silencio); `estadoInicialDelPanel(tarea, entrega)` (los puntos guardados de cada criterio, o la calificación directa, como texto; vacíos si no hay calificación; comentario vacío); `cuerpoDeCalificacion(estado, tareaDeApertura, version)` (Enmienda 1, M-02: con los puntos de la tarea y la rúbrica tal como estaban al montar el formulario, nunca los de una recarga posterior; `puntosDeLaTarea` va en el cuerpo; arma el cuerpo en el orden de la rúbrica, valida con `calificarEntregaSchema` y con los rangos de cada criterio y de la tarea, y omite `comentario` si queda vacío tras `normalizarTextoLargo`; devuelve `{ ok, datos }` o `{ ok: false, errores }` con llaves `puntajes.<criterioId>`, `calificacion` y `comentario`); `totalDelPanel(estado, tarea)` (la suma de la rúbrica y la calificación escalada con la misma fórmula en centésimas que `core/`; solo para mostrar: decide el servidor); `sePuedeCalificar(entrega, tarea, ahora)` (P-03 c: `entregado` o `calificado`; `asignado` solo si ya es tarde, con `yaEsTarde`; con (c′), Enmienda 1: `asignado` solo con `entregaCerradaAhora(tarea, ahora)`); `esConflictoDeCalificacion(error)` (`ENTREGA_MODIFICADA`, `RUBRICA_MODIFICADA` o, desde la Enmienda 1 (N-04), `ENTREGA_NO_CALIFICABLE`: los tres recargan y reinician el panel), `esRubricaModificada(error)`; `erroresDeCalificacionDeApi(error, criteriosEnviados)` (un `VALIDACION` "puntajes.<i>.puntos: …" pasa a la llave `puntajes.<criterioId de la posición i en el envío>`; "calificacion: …" y "comentario: …" a las suyas; `null` si no es de un campo); `fraseDeCalificacion(c)` ("Calificación: 8.5 de 10") y `fraseDeFechaDeCalificacion(c)` ("Calificada el lunes 6 de octubre a las 14:30").
3. **`data.ts`:** `TEXTOS_CALIFICAR` y `TEXTOS_CALIFICACION` (textos de "Textos de la interfaz"). `CODIGOS_CON_MENSAJE_DEL_SERVIDOR` suma `ENTREGA_MODIFICADA`, `RUBRICA_MODIFICADA`, `ENTREGA_NO_CALIFICABLE` y `TAREA_CON_CALIFICACIONES`. **No cambian** `CODIGOS_QUE_RENUEVAN_LA_TAREA` (la recarga tras un `409` de calificar la hace la vista, una sola vez), `CODIGOS_QUE_REEMPLAZAN_LA_VISTA` ni `CODIGOS_QUE_REDIRIGE_EL_CLIENTE` (la fija `entregas-01d-r3.ataque`).
4. **`hooks.ts`:** `useCalificarEntrega(claseId, tareaId, alumnoId)`, una mutación con variables `{ cuerpo: CalificarEntrega; habiaCalificacion: boolean }` que hace `PUT` con `entregaDeAlumnoRespuestaSchema`.
   - `onSuccess`: `setQueryData(claveEntregaDeAlumno(…), respuesta)`; invalida `claveListaDeEntregas(claseId, tareaId)`, `clavePrefijoDeCalificaciones(claseId)` y, si el cuerpo llevó comentario, `claveHilo(rutaDelHiloDeAlumno(…))`; aviso "Calificación publicada" o "Calificación actualizada".
   - `onError`: con `ENTREGA_MODIFICADA`, `RUBRICA_MODIFICADA` o `ENTREGA_NO_CALIFICABLE`, un aviso con el mensaje del servidor y nada más: la recarga es de la vista, una sola vez (Enmienda 1, N-04: `ENTREGA_NO_CALIFICABLE` ya no invalida desde el gancho; sigue el camino de los otros dos). Si no, `pedirDeNuevoLaTarea` (la regla T-11, sin cambiarla: un `404` de la tarea o del alumno o un `403` de la clase reemplazan la vista); un error de campo no avisa (lo pinta el panel); un error con que `apiClient` ya redirigió no avisa; lo demás, `avisarDelErrorDeLaEntrega` (un solo aviso por tarea perdida).
   - **No llama a `renovarTrasErrorDeLaEntrega`** (las `*.ataque` de ENTREGAS-01d y 01e fijan exactamente 3 llamadas) y su nombre no casa con `/MiEntrega|Hilo|Comentar|Entregar|Anular/` (`entregas-01d-r3.ataque:713`).
5. **`components/panel-de-calificacion.tsx`** (`PanelDeCalificacion`; props `claseId`, `tareaId`, `alumnoId`, `tarea`, `entrega`, `onConflicto(error): Promise<void>`, `onCalificada(): void`, `enfocarAlMontar: boolean`). Un `Card` con el `h3` "Calificación" (`tabIndex={-1}`, ref); con `enfocarAlMontar`, su efecto de montaje lleva el foco al `h3`. **(Enmienda 1, N-03)** El formulario es un componente interno (`FormularioDeCalificacion`, en el mismo archivo `panel-de-calificacion.tsx`, para que el `enEspera=` de C-7 siga en ese archivo) que se monta solo cuando `sePuedeCalificar` es verdadero; **la versión de apertura, los puntos y la rúbrica de la tarea con que se abrió (M-02) y lo escrito nacen en su inicializador perezoso, al montar el formulario** (como `FormularioTarea`, §D-8.2 de ENTREGAS-01). Así, si el panel se montó con la frase "Podrás calificar…" y una recarga de fondo vuelve calificable la entrega (el alumno entregó), el formulario aparece con la versión de ese momento, no con la del montaje del panel. Ninguna otra recarga de fondo cambia lo escrito ni la versión.
   - Si `!sePuedeCalificar(entrega, tarea, ahora)`: solo la frase "Podrás calificar cuando el alumno entregue o cuando pase la fecha límite." (sin formulario).
   - Si se puede y la entrega está `asignado` (vencida, P-03 c): una nota "Este alumno no entregó la tarea. Si lo calificas, ya no podrá entregarla." antes del formulario. Con (c′) (Enmienda 1), la nota es "Este alumno no entregó la tarea y la entrega ya está cerrada." y la frase sin formulario dice "Podrás calificar cuando el alumno entregue o cuando se cierre la entrega.".
   - Las etiquetas "de <n> puntos" y la rúbrica del formulario son las de apertura (Enmienda 1, M-02), las mismas que viajan en el cuerpo.
   - **Con rúbrica:** un campo por criterio, en orden: `Label` "<criterio> (de <max> puntos)", `Input` de texto con `inputMode="decimal"` y `autoComplete="off"` (datos de otra persona), `aria-invalid` y `ErrorDeCampo` enlazado con `aria-describedby`. Debajo, un texto (no región viva) "Suma de la rúbrica: 7 de 9 · Calificación: 7.78 de 10" con lo que ya es válido.
   - **Sin rúbrica:** un solo campo "Calificación (de <puntos> puntos)".
   - **Comentario:** `Textarea` "Comentario para el alumno (opcional)", `autoComplete="off"`, con la ayuda permanente "Se publica en los comentarios privados de esta entrega." enlazada con `aria-describedby`.
   - **Botón principal** (la única acción `primary` de la vista): "Calificar y devolver" si la entrega no tiene calificación; "Actualizar calificación" si ya la tiene. `enEspera` mientras se envía y mientras se recarga tras un `409`, con guarda síncrona con ref (`CLAUDE.md`, "Componentes"); nunca `disabled`. Enter en un campo envía el formulario (`onSubmit`).
   - **Al enviar:** valida en el cliente; con errores no pide nada y lleva el foco al primer campo con error. Si no, `mutateAsync`; con éxito, `onCalificada()`; en el `catch`, con `esConflictoDeCalificacion`, `await onConflicto(error)`; con errores de campo del servidor, los pinta y lleva el foco al primero; lo demás ya lo avisó el gancho. El `finally` libera la guarda.
   - Nunca escribe el texto exacto "Calificado" ni una frase que empiece por "Entregó el " (`entregas-01e-r1.ataque:603` busca esos textos en la vista).
6. **`components/calificacion-de-la-entrega.tsx`** (`CalificacionDeLaEntrega`; prop `calificacion`): solo lectura. "Calificación: 8.5 de 10", "Calificada el …" y, si hay rúbrica, una lista "Claridad: 4 de 5". La usan "Tu trabajo" del alumno y la vista del admin.
7. **`entrega-de-alumno-view.tsx`** (A-4): entre el `Card` de la entrega y el hilo privado.
   - **Maestro:** `<PanelDeCalificacion key={reinicios} … enfocarAlMontar={reinicios > 0} />`, con el estado local `reinicios` (empieza en 0). `onCalificada = () => setReinicios((n) => n + 1)` (la caché ya tiene la respuesta: el panel nace con la versión y los valores nuevos). Los tres códigos de `esConflictoDeCalificacion` (también `ENTREGA_NO_CALIFICABLE`, Enmienda 1, N-04) pasan por `recargarTrasConflicto`: al reiniciar, el panel se monta otra vez con su `h3` y lo enfoca (los efectos del hijo corren antes que `useFocoAlPerderseElControl` de la vista, que entonces ve un elemento activo conectado y no lo mueve); si la entrega ya no es calificable, el panel muestra la frase y el foco queda en el `h3`, no en la raíz. `recargarTrasConflicto = async (error) => { pide de nuevo la entrega (`consulta.refetch()`) y, con `RUBRICA_MODIFICADA`, también la tarea (`tarea.refetch()`), a la vez; si alguna falla, avisa "No pudimos cargar la entrega actual. Revisa tu conexión e inténtalo de nuevo." y no reinicia (lo escrito y la versión se conservan); si las dos responden, `setReinicios((n) => n + 1)` }`. `refetch` no lanza; el aviso va en el propio manejador asíncrono (`try/catch` de `CLAUDE.md`).
   - **Admin:** un `Card` con el `h3` "Calificación" y `CalificacionDeLaEntrega`, o "Sin calificar todavía."; sin formulario (S-01).
   - Sin texto suelto: todo viene de `data.ts` (la vista no puede contener "correo" ni `estadoPago`, `entregas-01e-r1.ataque:758`).
   - `useFocoAlPerderseElControl` y su clave no cambian: si una recarga quita el control con el foco (el panel pasa a la frase, la vista se reemplaza), el foco va a la raíz.
8. **"Tu trabajo" del alumno** (`components/entrega-realizada.tsx`, A-4): con `entrega.calificacion !== null`, `CalificacionDeLaEntrega` después de la frase de calificada. La frase es la de hoy ("Tu entrega ya está calificada.") si hubo entrega; "No entregaste esta tarea y ya está calificada." si no hay `fechaEntrega` (P-03 c). `tu-trabajo.tsx` no cambia (una entrega `calificado` sin fecha ya cae en `EntregaRealizada`).
9. **Editar tarea:** sin código nuevo. `TAREA_CON_CALIFICACIONES` en `CODIGOS_CON_MENSAJE_DEL_SERVIDOR` hace que el `onError` que ya existe de `useEditarTarea` avise con el mensaje del servidor; el formulario conserva lo escrito (no es `TAREA_MODIFICADA`).

### §D-13 · Frontend de 01d: `features/calificaciones` (A-4)
1. **`components/foco/` (movido, sin cambiar comportamiento):** `hooks.ts` con `useFocoAlPerderseElControl` (copiado tal cual de `features/tareas/hooks.ts`), `lib.ts` con `claveDeFocoDeLaConsulta` (el cuerpo de `claveDeFocoDeLaTarea`) y `types.ts` con `MomentoDeLaConsulta`. En el origen, una reexportación: `export { useFocoAlPerderseElControl } from "@/components/foco/hooks"` en `features/tareas/hooks.ts`, `export const claveDeFocoDeLaTarea = claveDeFocoDeLaConsulta` en `features/tareas/lib.ts` y `export type { MomentoDeLaConsulta } from "@/components/foco/types"` en `features/tareas/types.ts`. Ningún importador de `features/tareas` cambia. Nada de `components/foco/` importa de `features/` (`refactor-01c-r1.ataque:417`). Motivo: `features/calificaciones` necesita el mismo criterio de foco y un módulo no importa de otro (regla 9); copiarlo sería la cuarta copia de un mecanismo que ya tiene un pendiente de unificación (M-14 y O-20 de CLASES-02d).
2. **Módulo `features/calificaciones`:**
   - `types.ts`: los tipos de la API inferidos de `shared/` y reexportados (regla 7); `VentanaDelGradebook = { cursor: string | null; cursorTareas: string | null }`. (Enmienda 2, N-30 de la revisión de 01c) Ese tipo se deriva de `GradebookQuery` de `shared/` (`{ [K in "cursor" | "cursorTareas"]: NonNullable<GradebookQuery[K]> | null }`), no se escribe a mano; la firma de `claveGradebook` en `services/calificacionesService.ts` usa la misma derivación (los servicios no importan de `features/`). Ninguna clave ni ruta cambia de forma.
   - `data.ts`: `TEXTOS_GRADEBOOK`, `TEXTOS_MIS_CALIFICACIONES`, `TEXTOS_CALCULO`, `OPCIONES_DEL_FILTRO` (valor y texto), los límites (25 alumnos, 20 tareas, 20 por página en "Mis calificaciones") y `MENSAJES_ERROR_CALIFICACIONES` (`sinAcceso` toma `TEXTOS_DE_LA_CLASE.sinAcceso`). (Enmienda 2) `MENSAJES_ERROR_CALIFICACIONES` suma `gradebook`, `misCalificaciones` y `verMasTareas` (textos en "Textos de la interfaz") y los dos textos del cursor ya previstos (`cursorDelGradebook`, "La clase cambió…", y `cursorDeMisCalificaciones`, "Tus tareas cambiaron…"); y las listas cerradas `CAMPOS_DE_CURSOR_DEL_GRADEBOOK = ["cursor", "cursorTareas"]` y `CAMPOS_DE_CURSOR_DE_MIS_CALIFICACIONES = ["cursor"]`.
   - `lib.ts`: `rutaDelGradebook(claseId, ventana, limites)`, `rutaDeMisCalificaciones(claseId, filtro, cursor)`, `textoDeCelda(celda, fechaLimite, ahora)` (calificada: `formatearPuntos(calificacion)`; si no, el texto de `estadoDeEntregaVisible` de `lib/estado-de-entrega.ts`; asignada sin vencer: "—" con "Asignado" como texto `sr-only`), `textoDeMotivos(motivos)`, `enlaceAEntregaDeAlumno(tareaId, alumnoId)` = `../tareas/${tareaId}/entregas/${alumnoId}` y `enlaceATarea(tareaId)` = `../tareas/${tareaId}` (relativos a la ruta de la clase, S-14), `mensajeDeErrorCalificaciones(error)`, y las funciones puras de la pila de ventanas (`ventanaSiguiente`, `ventanaAnterior`).
   - **(Enmienda 2) Los `400 VALIDACION` de las consultas del módulo**, en `lib.ts`, con las funciones exportadas de `lib/errores-de-api.ts` sin cambiarlas (está en "No se toca"; solo se importa `campoDeErrorDeApi`):
     - `esErrorDeCursorDeCalificaciones(error: unknown, campos: readonly string[]): boolean` = `campoDeErrorDeApi(error)` está en `campos`. Es verdadero para un `VALIDACION` cuyo prefijo es exactamente `cursor:` (o `cursorTareas:` en el gradebook), con cualquier mensaje después, también vacío o de solo espacios; falso para una ruta (`cursorTareas.0:`, `cursor.0:`), para un prefijo con espacios delante o con otra capitalización, para un mensaje sin prefijo y para cualquier error que no sea `VALIDACION`. **Por qué no basta `esErrorDeCursor` de `lib/errores-de-api.ts`:** solo reconoce el campo `cursor`; el `400` "cursorTareas: no es válido" de §D-6.1 caería en "fuera de contrato" y diría el genérico en lugar de "La clase cambió…". El gradebook usa `CAMPOS_DE_CURSOR_DEL_GRADEBOOK`; "Mis calificaciones", `CAMPOS_DE_CURSOR_DE_MIS_CALIFICACIONES` (equivale a `esErrorDeCursor`, pero el módulo usa una sola función). La clasificación solo mira el error, no lo que se envió: un `cursor:` en una primera carga sin cursor también da el texto del cursor, que sigue siendo legible y fijo.
     - `mensajeDeErrorCalificaciones(error: unknown, respaldo: string): string` (la firma gana el segundo parámetro; la función es nueva y nadie la llama todavía): `SIN_ACCESO_A_LA_CLASE`, o un `VALIDACION` cuyo `campoDeErrorDeApi` es `claseId`, dan `MENSAJES_ERROR_CALIFICACIONES.sinAcceso`; **cualquier otro error da `respaldo`**: un `VALIDACION` fuera de contrato (un campo que la vista no pinta, como `limite:`, `limiteTareas:` o `estado:`; un mensaje vacío o de solo espacios; un prefijo con ruta; un mensaje sin prefijo), un 5xx, un `503`, la falta de conexión o un código que el módulo no conoce. Nunca devuelve `error.message` ni un trozo de él (S-22), así que nunca devuelve una cadena vacía ni un prefijo técnico. `respaldo` es `MENSAJES_ERROR_CALIFICACIONES.gradebook`, `.misCalificaciones` o `.verMasTareas`, según el lugar. Las vistas deciden el cursor **antes** de llamarla (con `esErrorDeCursorDeCalificaciones`) y nunca pasan `error.message` a `MensajeError` ni a `toast` (CAL-1D09).
     - No hay `ErrorDeCampo` en 01d: ningún control del módulo tiene un error que la persona pueda corregir (S-21).
   - `hooks.ts`: `useGradebook(claseId, ventana)` (`useQuery` con `placeholderData: keepPreviousData`, para que la tabla anterior siga a la vista mientras llega la ventana nueva) y `useMisCalificaciones(claseId, filtro)` (`useInfiniteQuery`). Sin avisos dentro de los ganchos.
3. **`gradebook-view.tsx`** (`GradebookView`, maestro y admin, ruta `…/clases/:claseId/calificaciones`). `ConClaseDeLaRuta` → `GradebookDeLaClase`. Raíz con `tabIndex={-1}` y `useFocoAlPerderseElControl(raizRef, claveDeFocoDeLaConsulta(…))`.
   - **Superficie opaca (Enmienda 1, M-03; `DESIGN.md` §7.1, §8 y §10; `CLAUDE.md`, "Tokens"):** la raíz de la vista (el `div` con `tabIndex={-1}`, el mismo del gancho de foco) lleva **`data-material="opaco"`**. Todo lo que pinta el gradebook cuelga de ella: el `Card` del contenido, los cuatro botones `outline` de las ventanas, los enlaces de las celdas y la tabla. En ese contexto las utilidades de vidrio se pintan en `--surface` sin que los componentes cambien de clase (el `Card` queda opaco y los `outline` pasan al borde de tinta, `button-variants.ts`), así que la vista no tiene ningún elemento de vidrio ni otro fondo escrito a mano que el `--surface` de la columna fija de la tabla. Dentro del `Card`: el `h2` "Calificaciones" (`tabIndex={-1}`), el resumen, la navegación y la tabla. **Sin `data-densidad="densa"`:** los controles de la vista ya miden 36 px por su tamaño (`sm`) y no hay campos; el atributo no cambiaría nada. El encabezado y las secciones de la clase (el marco de `ClaseLayout`, compartido con las demás secciones) conservan su material: el contexto opaco cubre el contenido de la sección, como la tabla opaca dentro del panel en el roster y en la tabla de entregas; si el humano quiere el marco opaco también, es un cambio de `ClaseLayout` para otro encargo. En el admin quedan dos contextos opacos anidados (el de `ContenedorRol` y el de la vista): inocuo (O-5 de la revisión).
   - **Resumen** (`components/resumen-del-gradebook.tsx`): "30 alumnos", "Promedio de la clase: 82.4 %" (o "Promedio de la clase: —") y "3 en riesgo" (con la insignia `warning` y su icono; nunca solo color).
   - **Navegación** (`components/navegacion-del-gradebook.tsx`): "Tareas más recientes", "Tareas más antiguas", "Alumnos anteriores" y "Alumnos siguientes", `outline` `sm`; cada una solo si aplica (no `disabled`): "más antiguas"/"siguientes" con su cursor siguiente; "más recientes"/"anteriores" con la pila de la vista no vacía. `enEspera={isFetching}` en las cuatro y guarda síncrona con ref. Si el botón pulsado ya no está al llegar la ventana nueva, el foco va al `h2`.
   - **Tabla** (`components/tabla-del-gradebook.tsx`): `Table` (opaca, §7.9) con `caption` `sr-only` "Calificaciones por alumno y tarea"; primera columna "Alumno" fija a la izquierda (`sticky left-0` con fondo `--surface`); una columna por tarea con el título (dos líneas como máximo), "de <puntos> puntos" y la categoría o "Sin categoría"; cada celda, un enlace (`enlaceAEntregaDeAlumno`) con el texto de `textoDeCelda` y, como `sr-only`, "<alumno>, <tarea>"; "con retraso" en `--text-small` si aplica. Al final "Promedio" (`formatearPorcentaje` o "—") y "Riesgo" (`Badge` `warning` "En riesgo" con `TriangleAlert` y, debajo, el motivo en texto; o "—"). Filas de 48 px; cifras tabulares a la derecha. La tabla se desplaza en horizontal dentro de su contenedor (la página nunca). Sin valores arbitrarios.
   - **Estados:** error → cargando → vacío ("Aún no hay alumnos en esta clase." o "Aún no hay tareas en esta clase.") → datos.
   - **(Enmienda 2) El error que reemplaza la tabla**, en este orden: con `esErrorDeCursorDeCalificaciones(error, CAMPOS_DE_CURSOR_DEL_GRADEBOOK)`, el texto `cursorDelGradebook`; si no, `MensajeError` con `mensajeDeErrorCalificaciones(error, MENSAJES_ERROR_CALIFICACIONES.gradebook)`. Así, un `VALIDACION` fuera de contrato se ve igual que un 5xx: un solo `MensajeError` legible, sin aviso. Con datos ya cargados, una recarga de fondo con cualquier `VALIDACION` (de cursor o fuera de contrato) conserva la tabla sin aviso (S-19); solo `SIN_ACCESO_A_LA_CLASE` o un `VALIDACION` de `claseId` la reemplazan.
4. **`mis-calificaciones-view.tsx`** (`MisCalificacionesView`, estudiante, misma ruta en su rama). Raíz con `tabIndex={-1}` y el mismo gancho de foco. `Card` (vidrio, pantalla de trabajo del alumno) con el `h2` "Mis calificaciones" (`tabIndex={-1}`).
   - **General:** "Calificación general" y el porcentaje en `--text-h2` 700 (o "Aún no tienes tareas calificadas que cuenten."); "Ver cálculo" (`outline`), que abre el modal.
   - **Filtro:** `NativeSelect` "Mostrar" con "Todas", "Asignadas", "Entregadas", "Calificadas" y "Sin entregar"; cambiarlo pide la lista con ese filtro (clave nueva) y el foco se queda en el selector.
   - **Lista** (`components/lista-de-mis-calificaciones.tsx`): filas con divisores de 1 px (sin vidrio fuerte, como §7.25), cada una con el título (enlace `enlaceATarea`), la categoría o "Sin categoría", la fecha límite con el texto de `vencimientoDe(fechaLimite, ahora)` de `lib/vencimiento.ts` ("Vence en 2 días", "Vence el martes 6 de octubre", "Venció el martes 6 de octubre"; Enmienda 1, N-06), `EstadoEntregaBadge` con `estadoDeEntregaVisible` y, si está calificada, "8.5 de 10".
   - **"Ver más tareas":** `outline`, `enEspera={isFetching}`, guarda síncrona; si desaparece al cargar la última página, el foco va al enlace de la primera fila nueva o, sin filas nuevas, al `h2` (el mecanismo de `entregas-view.tsx`, escrito en la vista, sin gancho nuevo). Un fallo avisa una vez, solo con la vista montada y si el error no reemplaza la vista ni lo redirige `apiClient`; un `400` del cursor dice "Tus tareas cambiaron mientras las veías. Vuelve a abrir Calificaciones para verlas completas." sin aviso. (Enmienda 2) El manejador de "Ver más tareas" decide en este orden, como `entregas-view.tsx`: sin error o con la vista desmontada, nada; con `esErrorDeCursorDeCalificaciones(error, CAMPOS_DE_CURSOR_DE_MIS_CALIFICACIONES)`, nada (el texto del cursor lo pinta la lista); si el error reemplaza la vista o lo redirige `apiClient`, nada; si no, **un** `toast.error(mensajeDeErrorCalificaciones(error, MENSAJES_ERROR_CALIFICACIONES.verMasTareas))`, también con un `VALIDACION` fuera de contrato. Un aviso por intento: no se usa un `id` de sonner que junte dos intentos en uno. La primera carga y el filtro nuevo siguen el orden de §D-13.3 con `CAMPOS_DE_CURSOR_DE_MIS_CALIFICACIONES` y `MENSAJES_ERROR_CALIFICACIONES.misCalificaciones`; el `MensajeError` va en lugar de la lista, y el selector "Mostrar" sigue a la vista con la opción elegida.
   - **Vacíos por filtro:** "Aún no hay tareas en esta clase.", "No tienes tareas asignadas pendientes.", "No tienes tareas entregadas sin calificar.", "Aún no tienes tareas calificadas.", "No tienes tareas sin entregar.".
5. **Modal "Cálculo de calificación"** (`components/calculo-de-calificacion.tsx`, RF-18; excepción de modal del PRD y de `CLAUDE.md`). `Dialog` de `components/ui/dialog.tsx` (primer uso; capa flotante opaca, §7.11). Título "Cálculo de tu calificación".
   - **Modo puntos:** "Esta clase califica por puntos: se suman los puntos de tus tareas calificadas y se dividen entre los puntos posibles." y "Obtuviste 85 de 100 puntos: 85 %.".
   - **Modo categorías:** una tabla "Categoría", "Peso", "Peso que cuenta", "Tu porcentaje" y "Tareas calificadas" (una categoría sin tareas calificadas dice "—" en "Peso que cuenta" y "Tu porcentaje"); "Las categorías sin tareas calificadas no cuentan: su peso se reparte entre las demás."; si hay tareas calificadas sin categoría, "1 tarea sin categoría no cuenta en tu calificación general." (o "N tareas…"); al final "Tu calificación general: 87.5 %.".
   - Sin nada calificado que cuente: "Todavía no tienes tareas calificadas que cuenten en tu calificación general.".
   - Un solo control de cierre (Enmienda 1, N-10): `DialogContent` con `showCloseButton={false}` (sin la equis de esquina) y "Cerrar" (`outline`, `DialogClose` con `asChild`) al pie. `DialogContent` ya se monta en el portal (`DialogPortal`): lo fijo queda fuera del vidrio del `Card` de "Mis calificaciones" (`DESIGN.md` §7.2; V-16 de `estatico-r1.ataque` solo admite `fixed` en `dialog.tsx` y en la barra). El foco queda atrapado en el diálogo, Escape lo cierra y el foco vuelve a "Ver cálculo". Si la vista se reemplaza con el diálogo abierto, el diálogo deja de pintarse y el foco va a la raíz.
6. **Secciones y rutas:** `features/clases/data.ts` suma `TEXTOS_CLASE.calificaciones = "Calificaciones"`, la sección `{ segmento: "calificaciones", texto }` al final de las tres perspectivas (S-10) y, para cinco secciones, `5: "w-1/5"`, `5: "grid-cols-5"` y `"translate-x-[400%]"`. `app/router.tsx`: `calificaciones` → `MisCalificacionesView` en la rama del estudiante y → `GradebookView` en las del maestro y del admin.
7. **Lo que el módulo no hace:** no llama a `perspectivaDeRuta` (los enlaces son relativos), no importa de `features/` (sus textos de clase vienen de `components/clase/data.ts`), no declara tipos fuera de `types.ts` salvo las Props, no usa `?? []`, `disabled`, `fetch(` ni valores arbitrarios, no pinta estado de pago, restricción ni correos, no escribe clases de vidrio ni fondos a mano y lleva `data-material="opaco"` solo en la raíz de `gradebook-view.tsx` (Enmienda 1, M-03).

### §D-14 · Matriz de avisos, recargas y foco (la entrega el programador desde su primer resumen de 01c y de 01d; `AGENTS.md`)

**01c · "Calificar y devolver" / "Actualizar calificación" (`useCalificarEntrega` y `PanelDeCalificacion`)**

| Clase de respuesta | Qué se renueva | Aviso (uno) | Foco | En vuelo a la vez | Con la vista desmontada |
|---|---|---|---|---|---|
| `200` | `setQueryData` de la entrega; invalida la lista de entregas, el prefijo de calificaciones y el hilo (si hubo comentario); el panel se reinicia | "Calificación publicada" o "Calificación actualizada" | `h3` "Calificación" | Doble clic o Enter repetido = un `PUT` (guarda con ref) | El aviso sale (es del gancho); no hay reinicio |
| `409 ENTREGA_MODIFICADA` | Un `GET` de la entrega (la vista); si responde, reinicio con la versión nueva (lo escrito se descarta) | El mensaje del servidor | `h3` "Calificación" | Un segundo `409` seguido: el mismo camino otra vez | El aviso sale; no hay recarga |
| `409 RUBRICA_MODIFICADA` | Un `GET` de la tarea y uno de la entrega, a la vez; si responden, reinicio con la rúbrica nueva | El mensaje del servidor | `h3` "Calificación" | — | El aviso sale |
| La recarga tras un `409` falla (red o 5xx) | Nada: sin reinicio; lo escrito y la versión se conservan | "No pudimos cargar la entrega actual. Revisa tu conexión e inténtalo de nuevo." (además del del `409`: dos hechos) | Se queda en el botón | Un guardado nuevo vuelve a dar `409` y a intentar | — |
| La recarga tras un `409` trae un `404`/`403` | La vista se reemplaza por su mensaje (regla de §7.26) | Solo el del `409` | La raíz | — | — |
| `409 ENTREGA_NO_CALIFICABLE` (Enmienda 1, N-04) | Un `GET` de la entrega (la vista); si responde, reinicio: el panel pasa a la frase "Podrás calificar…" | El mensaje del servidor | `h3` "Calificación" (el `Card` sigue montado) | — | El aviso sale; no hay recarga |
| `400 VALIDACION` de un campo (`puntajes.<i>.puntos`, `calificacion`, `comentario`) | Nada | Ninguno: `ErrorDeCampo` bajo el campo | El primer campo con error | — | — |
| `404 TAREA_NO_ENCONTRADA`, `404 ALUMNO_NO_ENCONTRADO`, `403 SIN_ACCESO_A_LA_CLASE` | `pedirDeNuevoLaTarea` (T-11): la vista se reemplaza | Uno por tarea perdida (`avisarDelErrorDeLaEntrega`) | La raíz | Calificar y "Enviar comentario" con el mismo `404`: un aviso | El aviso sale una vez |
| Redirige `apiClient` (`ACCESO_RESTRINGIDO`, `CAMBIO_DE_CONTRASENA_REQUERIDO`, sesión perdida) | — | Ninguno | — | — | — |
| `503 SERVICIO_OCUPADO`, otro 5xx o sin conexión | Nada | El de `mensajeDeErrorTareas` | Se queda en el botón | — | El aviso sale |
| Recarga de fondo de la entrega con otra versión (sin guardar) | La consulta se actualiza; el panel **no** se reinicia (lo escrito se conserva hasta el `409`) | Ninguno | Sin cambio | — | — |
| Recarga de fondo que vuelve calificable una entrega que no lo era (el panel mostraba la frase; Enmienda 1, N-03) | El formulario se monta en ese momento y toma la versión y los puntos de la tarea de ese momento | Ninguno | Sin cambio (la frase no tenía foco); si el foco estaba en el `h3`, se queda | — | — |
| Recarga de fondo que vuelve no calificable la entrega con el formulario a la vista (el alumno anuló antes de la fecha) | El formulario desaparece (lo escrito se pierde: ya no hay qué calificar) | Ninguno | Si el control con el foco desaparece, la raíz (`useFocoAlPerderseElControl`) | — | — |
| Recarga de fondo de la tarea con otros puntos o rúbrica (Enmienda 1, M-02) | La consulta se actualiza; el formulario **no** cambia: sus etiquetas y el cuerpo siguen con los de apertura | Ninguno | Sin cambio | El guardado siguiente recibe `409 RUBRICA_MODIFICADA` y recarga | — |

**01c · Editar una tarea calificada (`useEditarTarea`, sin código nuevo; Enmienda 1, N-05)**

| Clase de respuesta | Qué se renueva | Aviso (uno) | Foco | En vuelo a la vez | Con la vista desmontada |
|---|---|---|---|---|---|
| `409 TAREA_CON_CALIFICACIONES` | Nada: no está en `CODIGOS_QUE_RENUEVAN_LA_TAREA`; lo escrito se conserva | El mensaje del servidor (por `CODIGOS_CON_MENSAJE_DEL_SERVIDOR`) | Se queda en "Guardar cambios" | Doble clic = un `PUT` (la guarda de `FormularioTarea`, sin cambio) | El aviso sale (es del gancho) |
| `409 TAREA_MODIFICADA` (su vecino, sin cambio desde ENTREGAS-01a) | Un `GET` de la tarea y reinicio del formulario (§D-8.3 de ENTREGAS-01) | El mensaje del servidor | "Título" | Igual | El aviso sale |
| Los dos seguidos (otra persona calificó y cambió algo a la vez) | El servidor responde primero `TAREA_MODIFICADA` (§D-4.4): reinicio; el guardado siguiente, si sigue cambiando puntos o rúbrica, `TAREA_CON_CALIFICACIONES` | Uno por respuesta | Según la fila | — | — |

"Tu trabajo" (alumno) no gana mutaciones: la calificación es solo lectura y sigue las recargas que ya tiene.

**01d · Gradebook (`useGradebook`)**

(Enmienda 1, N-05: con las columnas "En vuelo a la vez" y "Con la vista desmontada". La vista no da avisos: ninguna fila depende de que esté montada para avisar.)

| Disparador | Clase de respuesta | Qué se renueva | Aviso | Foco | En vuelo a la vez | Con la vista desmontada |
|---|---|---|---|---|---|---|
| Primera carga | `403 SIN_ACCESO_A_LA_CLASE` o `400` de `claseId` | — | Ninguno: `MensajeError` "No tienes acceso a esta clase." en lugar de la tabla | La raíz, si el foco estaba dentro | — | Nada (TanStack descarta el resultado) |
| Primera carga o ventana nueva | `400` de un cursor (alumnos o tareas) | — | Ninguno: "La clase cambió mientras veías las calificaciones. Vuelve a abrir Calificaciones para verlas completas." | La raíz | — | Nada |
| Primera carga o ventana nueva | 5xx, `503` o sin conexión | — | Ninguno: `MensajeError` con el texto genérico en lugar de la tabla | La raíz | — | Nada |
| Ventana nueva (uno de los cuatro botones) | `200` | La tabla anterior se ve hasta que llega la nueva | Ninguno | Si el botón pulsado ya no está, el `h2` | Un segundo botón pulsado durante la carga no hace nada (guarda con ref y `enEspera={isFetching}` en los cuatro): una sola ventana en vuelo | Nada |
| Ventana nueva durante una recarga de fondo | — | `isFetching` ya es verdadero: los botones están en espera y no piden nada hasta que termine | Ninguno | Sin cambio | — | — |
| Recarga de fondo con datos | Cualquier error que no reemplaza la vista | Se conserva lo último (S-19) | Ninguno | Sin cambio | Coincide con una ventana nueva: gana la clave nueva (la anterior ya no se observa) | Nada |
| Recarga de fondo con datos | `403 SIN_ACCESO_A_LA_CLASE` | La vista se reemplaza | Ninguno | La raíz | — | Nada |
| Cualquiera | Redirige `apiClient` | — | Ninguno | — | — | — |
| Primera carga o ventana nueva (Enmienda 2) | `400 VALIDACION` **fuera de contrato**: un campo que la vista no pinta (`limite:`, `limiteTareas:`, `estado:` o cualquiera salvo `claseId`, `cursor` y `cursorTareas`); un mensaje vacío o de solo espacios; un prefijo con ruta (`cursorTareas.0:`, `alumnos.0.id:`); un mensaje sin prefijo | — (la pila de ventanas de la vista no se toca) | Ninguno (sin `toast`): un solo `MensajeError` con `MENSAJES_ERROR_CALIFICACIONES.gradebook` en lugar de la tabla; nunca el mensaje del servidor, su prefijo ni una cadena vacía (S-22) | La raíz, si el foco estaba dentro; nunca `<body>` | Un segundo botón pulsado durante la carga no pidió nada (guarda); al reemplazarse la tabla, ningún control queda con `aria-busy="true"` | Nada |
| Primera carga o ventana nueva (Enmienda 2) | `400 VALIDACION` con prefijo exacto `cursor:` o `cursorTareas:` y cualquier mensaje, también vacío | — | Ninguno: el texto fijo `cursorDelGradebook` ("La clase cambió…"), nunca el del servidor ni el genérico | La raíz | — | Nada |
| La misma consulta otra vez (recarga al volver a la pestaña o al volver a la sección) con el mismo `400` fuera de contrato (Enmienda 2) | — | Sigue un solo `MensajeError` (no se apila ni se duplica) | Ninguno | Sin cambio; nunca `<body>` | — | Nada |
| Recarga de fondo con datos (Enmienda 2) | `400 VALIDACION` de cursor o fuera de contrato | Se conserva lo último (S-19) | Ninguno | Sin cambio | Coincide con una ventana nueva: gana la clave nueva | Nada |

**01d · "Mis calificaciones" (`useMisCalificaciones`) y el modal**

| Disparador | Clase de respuesta | Qué se renueva | Aviso | Foco |
|---|---|---|---|---|
| Primera carga o filtro nuevo | `403`, `400` de `claseId`, 5xx, red | — | Ninguno: `MensajeError` en lugar de la lista | La raíz si estaba dentro; con un filtro nuevo, el foco sigue en el selector |
| "Ver más tareas" | `200` | Se agregan filas | Ninguno | Si el botón desaparece, el primer enlace nuevo o el `h2` |
| "Ver más tareas" | `400` del cursor | — | Ninguno: el texto de "Tus tareas cambiaron…" en la lista | La raíz |
| "Ver más tareas" | 5xx, `503` o red, con la vista montada | Se conservan las filas | Uno (`mensajeDeErrorCalificaciones`) | Se queda en el botón |
| "Ver más tareas" | Cualquier error con la vista desmontada, o que la reemplaza, o que redirige | — | Ninguno | — |
| Recarga de fondo con datos | Error que no reemplaza la vista | Se conserva lo último (S-19) | Ninguno | Sin cambio |
| Modal abierto | La consulta se reemplaza por un error | El diálogo deja de pintarse | Ninguno | La raíz |
| "Ver cálculo" / Escape / "Cerrar" | — | — | — | Al cerrar, de vuelta a "Ver cálculo" |
| "Ver cálculo" durante una recarga de fondo o con "Ver más tareas" en vuelo (Enmienda 1, N-05) | — | El modal abre con `general` de la última página en caché (no espera); si la recarga trae otro `general`, el contenido del modal se actualiza sin cerrarse | Ninguno | Dentro del modal, sin cambio | "Ver cálculo" no lleva `enEspera` (no pide nada) | — |
| Filtro nuevo con el modal cerrado y "Ver más tareas" en vuelo | — | La clave cambia: la página que estaba en vuelo ya no se observa y no se agrega | Ninguno | En el selector | — | — |

Columnas "En vuelo a la vez" y "Con la vista desmontada" de "Mis calificaciones" (Enmienda 1, N-05): "Ver más tareas" dos veces = una petición (guarda con ref y `enEspera={isFetching}`, también durante una recarga); con la vista desmontada, ningún aviso (la comprobación de montaje de §D-13.4).

**01d · `400 VALIDACION` fuera de contrato en "Mis calificaciones" (Enmienda 2; S-21 y S-22)**

"Fuera de contrato" es lo mismo que en el gradebook: un campo que la vista no pinta (`estado:` (la vista solo envía valores de `OPCIONES_DEL_FILTRO`), `limite:` o cualquiera salvo `claseId` y `cursor`), un mensaje vacío o de solo espacios, un prefijo con ruta (`estado.0:`, `cursor.0:`, `tareas.0.id:`) o un mensaje sin prefijo.

| Disparador | Clase de respuesta | Qué se renueva | Aviso | Foco | En vuelo a la vez | Con la vista desmontada |
|---|---|---|---|---|---|---|
| Primera carga o filtro nuevo | Fuera de contrato | —; el selector "Mostrar" conserva la opción elegida | Ninguno (sin `toast`): un solo `MensajeError` con `MENSAJES_ERROR_CALIFICACIONES.misCalificaciones` en lugar de la lista; nunca el mensaje del servidor, su prefijo ni una cadena vacía | Con un filtro nuevo, en el selector; en la primera carga, la raíz si estaba dentro; nunca `<body>` | Dos filtros seguidos que fallan: solo se observa la última clave y queda un solo `MensajeError` | Nada |
| Filtro nuevo que responde `200` después de uno fallido | — | La lista vuelve y el `MensajeError` desaparece | Ninguno | En el selector | — | — |
| "Ver más tareas" | Fuera de contrato, con la vista montada | Se conservan las filas | Uno: `MENSAJES_ERROR_CALIFICACIONES.verMasTareas`; nunca el mensaje del servidor ni una cadena vacía | Se queda en el botón, que sale de la espera (`aria-busy` falso) | Dos clics durante la petición: una petición y un aviso | Ninguno |
| "Ver más tareas" otra vez, con el mismo error | Fuera de contrato | Se conservan las filas | Uno por intento: dos intentos dan dos llamadas a `toast.error` con el mismo texto, nunca dos por un intento | En el botón | — | — |
| "Ver más tareas" | Prefijo exacto `cursor:` con cualquier mensaje, también vacío | — | Ninguno: el texto fijo `cursorDeMisCalificaciones` ("Tus tareas cambiaron…") en la lista | La raíz | — | Ninguno |
| "Ver más tareas" en vuelo y la vista se desmonta; la respuesta es un `400` fuera de contrato | — | — | Ninguno, ni al responder ni al volver a montar la vista con la misma `QueryClient` (el error ya ocurrido no se anuncia al montar) | — | — | Ninguno |
| Recarga de fondo con datos | `400 VALIDACION` de cursor o fuera de contrato | Se conserva lo último (S-19) | Ninguno | Sin cambio | — | — |
| Modal "Cálculo de calificación" | No aplica: el modal no envía nada (lee `general` de la caché) | — | — | — | — | — |

### §D-R0 · Cambios de contrato que rompen pruebas existentes

Inventario hecho por grep sobre `d998282` (listas cerradas e inventarios estáticos de `backend/test` y `frontend/src`, llamadas directas a funciones cuya firma cambia, dobles de cada tipo que gana campos y aserciones sobre cada texto que cambia). Las `*.ataque` las reescribe el tester en la ronda 0 de su subentrega (A-5), con el cambio mínimo, su motivo y la tabla de SHA-256; las normales están en la lista cerrada del programador. Donde el diseño se eligió para no romper una prueba, se dice.

| C-n | Prueba | Qué fija hoy | Decisión | Subentrega |
|---|---|---|---|---|
| C-1 | `backend/test/sesiones-y-cadena.ataque.test.ts:543` | Inventario exacto de rutas bajo `/api` (`printRoutes`) | **C-n:** suma exactamente `PUT /api/clases/:claseId/tareas/:tareaId/entregas/:alumnoId/calificacion` en 01a, y `GET` y `HEAD` de `/api/clases/:claseId/gradebook` y de `/api/clases/:claseId/mis-calificaciones` en 01b (4 entradas); el título suma "CALIFICACIONES-01a" y "CALIFICACIONES-01b". Ninguna crea cuentas ni es pública. | 01a y 01b |
| C-2 | `backend/test/entregas-01b-r1.ataque.test.ts:649` (dentro de "anular una entrega que pasa a calificado…") | La retenedora escribe `UPDATE entregas SET estado = 'calificado'` | **C-n:** el `UPDATE` suma `, calificacion = 1, fecha_calificacion = now()` (sin eso viola `entregas_calificacion_segun_estado`). Las aserciones no cambian. | 01a |
| C-3 | `backend/test/lecturas-fx-r2.ataque.test.ts:966` (O-4) | El conjunto exacto de modelos que se borran en `backend/src` | **C-n:** suma `"puntajeRubrica"` (calificar reemplaza el desglose con `deleteMany`); el título suma "y puntajes de rúbrica". Lo demás (nada borra `enlaces_registro` ni `usuarios`, ningún `DELETE FROM` crudo) no cambia. | 01a |
| C-4 | `backend/test/lecturas-fx-r1.ataque.test.ts:758` | Usos de `instantaneaUnica: true` por archivo de `adapters/db` | **C-n:** suma `"adapters/db/calificaciones.ts:2"` (`leerGradebook` y `leerMisCalificaciones`; ninguna mención en comentarios); el título "doce lecturas (cuatro de clases, dos del muro, dos de tareas y cuatro de entregas)" pasa a "catorce lecturas (…, cuatro de entregas y dos de calificaciones)". | 01b |
| C-5 | `frontend/src/features/tareas/entregas-01d-r1.ataque.test.tsx`, `entregas-01d-r2.ataque.test.tsx` y `entregas-01d-r3.ataque.test.tsx` (los constructores `entregaAsignada` y `entregaRealizada`, cerca de las líneas 55 a 82 de cada uno) | Dobles de `MiEntrega` sin `calificacion` | **C-n:** cada constructor suma `calificacion: null`. Nada más. | 01a |
| C-6 | `frontend/src/features/tareas/entregas-01e-r1.ataque.test.tsx` (constructor `entregaDeAlumno`, `:73`, y el doble de `MiEntrega` en línea, `:694-702`) y `entregas-01e-r2.ataque.test.tsx` (`entregaDeAlumno`, `:61`, y el doble en línea, `:257-265`) | Dobles de `EntregaDeAlumno` y `MiEntrega` sin `calificacion` | **C-n:** suman `calificacion: null`. Nada más. | 01a |
| C-7 | `frontend/src/styles/clases-r1.ataque.test.ts:153` (V-06) | 55 `enEspera=` con su lugar exacto | **C-n:** de 55 a 56; la lista fija suma `features/tareas/components/panel-de-calificacion.tsx: 1` y `features/tareas/components/calificacion-de-la-entrega.tsx: 0`; `entrega-de-alumno-view.tsx` sigue en 0 y `entrega-realizada.tsx` en 1. | 01c |
| C-8 | El mismo caso V-06 | 56 `enEspera=` | **C-n:** de 56 a 61; la lista fija suma `features/calificaciones/components/navegacion-del-gradebook.tsx: 4`, `features/calificaciones/mis-calificaciones-view.tsx: 1` y, con 0, `gradebook-view.tsx`, `components/tabla-del-gradebook.tsx`, `components/resumen-del-gradebook.tsx`, `components/lista-de-mis-calificaciones.tsx` y `components/calculo-de-calificacion.tsx`. | 01d |
| C-9 | `frontend/src/features/clases/heredados-02d-r1.ataque.test.tsx:217-238` | Las secciones esperadas de las tres perspectivas | **C-n:** las tres listas suman "Calificaciones" al final. La sección activa y el indicador montado no cambian. | 01d |
| C-10 | `frontend/src/features/clases/clases-admin-02c-r1.ataque.test.tsx:360-364` | Las secciones del admin | **C-n:** la lista suma "Calificaciones" al final; el recorrido de abajo no cambia. | 01d |
| C-11 | `frontend/src/components/layout/estatico-r1.ataque.test.ts:138` | Los únicos valores arbitrarios de maquetación | **C-n:** suma `"translate-x-[400%]"` (la quinta sección del admin). | 01d |
| C-12 (Enmienda 1, M-03) | `frontend/src/styles/clases-r1.ataque.test.ts:312` (V-07), su última aserción (`:350-352`) | `data-material` y `data-densidad` solo en `components/layout/contenedor-rol.tsx` | **C-n:** la lista ordenada suma `"/src/features/calificaciones/gradebook-view.tsx"` (el contexto opaco del gradebook, `DESIGN.md` §8 y §10). Las listas de vidrio, vidrio fuerte y vidrio azul de la misma prueba no cambian: el gradebook no escribe clases de vidrio. Sigue protegiendo que el atributo solo entre con el plan. | 01d |
| — (Enmienda 1, M-03) | `frontend/src/app/contexto-r1.ataque.test.tsx` | Cuántos contextos opacos y densos hay en `/admin`, en los inicios y en las pantallas públicas | **Diseño:** no recorre rutas de clase (comprobado por el manager); el contexto nuevo del gradebook no entra en sus cuentas. No cambia. | 01d |
| — (Enmienda 1, N-01) | `backend/test/muro-c-r1.ataque.test.ts:628`, `lecturas-fx-r1.ataque.test.ts:758`, `lecturas-fx-r2.ataque.test.ts:966`, `hilo-01c-r1.ataque.test.ts:718` y las reglas estáticas del frontend de ENTREGAS y TAREAS | Leen el texto crudo, comentarios incluidos | **Diseño:** §D-0.9 prohíbe esas palabras también en los comentarios de los archivos nuevos y cambiados. No cambian (salvo C-3 y C-4, por código). | 01a a 01d |
| — | `backend/test/hilo-01c-r1.ataque.test.ts:718` y `entregas-01b-r1.ataque.test.ts:1002` | `FOR KEY SHARE` una sola vez en `entregas.ts`, en `bloquearTareaParaEntregar`; 4 `instantaneaUnica: true` en `entregas.ts` | **Diseño:** calificar usa `FOR SHARE` (no casa con `/FOR\s+KEY\s+SHARE/`) y no suma `instantaneaUnica` a `entregas.ts` (las lecturas nuevas viven en `calificaciones.ts`). No cambian. | 01a |
| — | `backend/test/entregas-01b-r1.ataque.test.ts:1016` | `entregas.ts` sin `Unsafe` ni consultas en ciclos; el handler de entregas sin relación, rol, SQL ni Prisma | **Diseño:** calificar no tiene ciclos (un `deleteMany` y un `createMany`); `handlers/tareas/entregas.ts` solo cambia de dónde importa los constructores de respuesta. No cambia. | 01a |
| — | `backend/test/entregas-01b-r1.ataque.test.ts:1031` y `hilo-01c-r1.ataque.test.ts:735` | Cuántos esquemas de respuesta con ciertos nombres hay en `shared/src/entregas.ts` (7 y 3) y que sean estrictos | **Diseño:** los nombres nuevos (`puntajeDeCriterioSchema`, `calificacionDeEntregaSchema`) quedan fuera de los dos patrones. No cambian. | 01a |
| — | `backend/test/muro-c-r1.ataque.test.ts:628` | Quién nombra las colas del muro | **Diseño:** `CALIFICACION_PUBLICADA` no está en su patrón y el handler nuevo no nombra `COMENTARIO_CREADO` (S-11). No cambia. | 01a |
| — | `backend/test/temas-01a-r1.ataque.test.ts:978` y `temas-01a-r3.ataque.test.ts:440` | Lista cerrada de `handlers/tareas/`, sin `relacion ===` | **Diseño:** el plugin nuevo es `handlers/calificaciones.ts` y los constructores, `handlers/respuestas-de-entrega.ts` (fuera de `handlers/tareas/`). No cambian. | 01a |
| — | `backend/test/migracion-01a-r1.ataque.test.ts` | Los `CHECK` de la migración de ENTREGAS-01 | **Diseño:** esa prueba aplica las migraciones solo hasta la de ENTREGAS-01; la nueva no corre ahí. No cambia. | 01a |
| — | `frontend/src/features/tareas/entregas-01e-r1.ataque.test.tsx:738`, `:762`; `entregas-01e-r2.ataque.test.tsx:527`; `entregas-01d-r2.ataque.test.tsx:767`; `entregas-01d-r3.ataque.test.tsx:672`, `:712`; `entregas-01d-r1.ataque.test.tsx:879`, `:907` | Reglas estáticas sobre los archivos de ENTREGAS (sin `disabled`, `?? []`, `fetch(`, valores por defecto en `calificacion`, vidrio, correo en las vistas; `renovarTrasErrorDeLaEntrega(` 3 veces; ganchos del alumno y del hilo; tipos solo Props en componentes) | **Diseño:** el código nuevo de esos archivos las cumple (§D-12.4 y §D-12.7). No cambian. | 01c |
| — | `frontend/src/features/tareas/entregas-01e-r1.ataque.test.tsx:583` y `:603` | El admin no tiene ningún `textbox`; "Calificado" y "Entregó el …" aparecen en la vista del maestro | **Diseño:** el admin ve la calificación en solo lectura (S-01) y el panel no escribe esos textos (§D-12.5). No cambian. | 01c |
| — | `frontend/src/features/clases/estatico-02c-r1.ataque.test.ts:99` | Quién llama a `perspectivaDeRuta` | **Diseño:** `features/calificaciones` usa enlaces relativos (S-14). No cambia. | 01d |
| — | `frontend/src/features/clases/refactor-01c-r1.ataque.test.tsx:417` y `ver-mas-01e-r3.ataque.test.tsx:311` | Nada de `components/` importa de `features/`; `features/clases/data.ts` sin valores arbitrarios en px, rem, em, vh o vw | **Diseño:** `components/foco/` no importa de `features/`; `translate-x-[400%]` no casa con esa regla. No cambian. | 01d |

**Rojos esperados.** Entre el cierre de la ronda 0 de cada subentrega y la entrega del programador, solo pueden estar rojas estas; cualquier otra roja es PARADA del orquestador.

| Subentrega | Rojas tras la ronda 0 | Pasan a verde en |
|---|---|---|
| 01a | C-1 (falta la ruta), C-2 (las columnas no existen), C-3 (nadie borra `puntajeRubrica` todavía), C-5 y C-6 (el esquema estricto de hoy rechaza `calificacion`) | C-5 y C-6 en el paso 1 (`shared/`); C-2 en el paso 3 (migración); C-3 en el paso 6 (calificar); C-1 en el paso 7 (handler) |
| 01b | C-1 (faltan cuatro entradas) y C-4 (no existe `calificaciones.ts`) | Pasos 3 y 4 de 01b |
| 01c | C-7 | Paso 5 de 01c |
| 01d | C-8 a C-12 (C-12, Enmienda 1) | Pasos 4 y 5 de 01d |

## Cambios por capa

### shared/
- `src/entregas.ts` (01a): `puntajeDeCriterioSchema`, `calificacionDeEntregaSchema` y `calificacion` en `miEntregaSchema` y `entregaDeAlumnoSchema`; sus tipos (§D-11).
- `src/calificaciones.ts` (nuevo; 01a: `tieneHastaDosDecimales`, `puntosDeCalificacionSchema`, `calificarEntregaSchema`, `CODIGOS_CALIFICACIONES`; 01b: gradebook y "Mis calificaciones").
- `src/index.ts`: reexporta por nombre. `npm run build` de `shared` en 01a y 01b.

### backend/core/ (puras, con pruebas unitarias)
- `calificaciones/calificar.ts` (01a): `escalarALaTarea`, `decidirCalificacion`, `exigirEntregaCalificable`, `exigirRubricaCongelada` y los cuatro errores (§D-2.1).
- `calificaciones/general.ts` (01a): `calificacionGeneral`, `promedioDeLaClase` (§D-2.3).
- `calificaciones/riesgo.ts` (01a): umbrales y `motivosDeRiesgo` (§D-2.4).
- `eventos/avisos-de-clase.ts` (01a, A-2): `COLA_CALIFICACION_PUBLICADA` y `datosCalificacionPublicadaSchema` (§D-8).
- Sin cambios: `concurrencia.ts`, `entregas/entregas.ts`, `tareas/tareas.ts`, `autoria.ts`.

### backend/adapters/
- `db/entregas.ts` (01a, A-2): `calificarEntrega` y la privada `bloquearTareaParaCalificar` (§D-3); la calificación en `leerMiEntrega` y `leerEntregaDeAlumno` (§D-5). Sin `instantaneaUnica` nueva y sin otro `FOR KEY SHARE`.
- `db/tareas.ts` (01a, A-2): solo `editarTarea` (§D-4).
- `db/calificaciones.ts` (nuevo, 01b): `leerGradebook` y `leerMisCalificaciones` (§D-6, §D-7), con su SQL etiquetado; ninguna escritura.
- `db/index.ts`: reexporta lo nuevo.
- `queue/colas.ts` (01a, A-2): la cola nueva en `OPCIONES_DE_COLAS`.
- Errores de Prisma traducidos en `errores.ts` como siempre (no cambia); ningún `P2002` atrapado (el `ON CONFLICT` los evita).
- Sin cambios: `auth`, `notifier`, `storage`, `live`, `db/inscripciones.ts`, `db/referencias.ts`, `db/cliente.ts`.

### backend/handlers/ (cadena exacta en "Autorización")
- `calificaciones.ts` (nuevo): `calificacionesHandler` con `{ almacen }`; el `PUT` en 01a, los dos `GET` en 01b.
- `respuestas-de-entrega.ts` (nuevo, 01a): `miEntregaParaResponder`, `entregaDeAlumnoParaResponder`, `calificacionParaResponder` (§D-5).
- `tareas/entregas.ts` (01a, A-2): importa los constructores de `respuestas-de-entrega.ts` (sin otro cambio).
- `app.ts`: registra `calificacionesHandler` con prefijo `/api` después de `hiloPrivadoHandler`.

### backend/workers/
Sin cambios (S-11).

### backend/prisma/ (migración compatible hacia atrás)
Una migración en 01a (§D-1). `npx prisma validate`, `format` y `generate`; `migrate dev --name calificaciones` con A-1.

### infra/ y .env.example
Sin cambios: no hay servicios ni variables nuevos (los umbrales son constantes, S-04).

### frontend/
- 01a: solo pruebas (lista cerrada de abajo).
- 01c: `lib/format.ts`, `services/calificacionesService.ts`, `components/clase/data.ts`; `features/tareas` (`components/panel-de-calificacion.tsx`, `components/calificacion-de-la-entrega.tsx`, `components/entrega-realizada.tsx`, `entrega-de-alumno-view.tsx`, `data.ts`, `lib.ts`, `hooks.ts`, `types.ts`).
- 01d: `components/foco/` (nuevo) con las reexportaciones de `features/tareas` (`hooks.ts`, `lib.ts`, `types.ts`); `services/calificacionesService.ts` (solo la firma de `claveGradebook` con `VentanaDelGradebook` derivada de `GradebookQuery`, N-30; transcripción del orquestador por N-39 de la revisión de la Enmienda 2, 2026-10-13); `features/calificaciones/` (nuevo: `types.ts`, `data.ts`, `lib.ts`, `hooks.ts`, `gradebook-view.tsx`, `mis-calificaciones-view.tsx`, `components/resumen-del-gradebook.tsx`, `components/navegacion-del-gradebook.tsx`, `components/tabla-del-gradebook.tsx`, `components/lista-de-mis-calificaciones.tsx`, `components/calculo-de-calificacion.tsx`); `features/clases/data.ts`; `app/router.tsx`.
- Tipos de la API inferidos de `shared/` y reexportados desde el `types.ts` de cada módulo (regla 7). Ningún `fetch` fuera de `apiClient`.

## Acceso a datos

Ninguna consulta dentro de un ciclo; todas filtran por llave primaria, única o índice existente o nuevo de §D-1; toda lista se pagina.

| Función (subentrega) | Tablas y orden | Índice que usa | Paginación | Transacción |
|---|---|---|---|---|
| `calificarEntrega` (01a) | `tareas` `FOR SHARE`; `inscripciones` + `usuarios`; `criterios_rubrica`; `INSERT … ON CONFLICT` en `entregas`; `entregas` `FOR NO KEY UPDATE`; `puntajes_rubrica` (`deleteMany`, `createMany`); `entregas` `UPDATE`; `comentarios` `INSERT`; `pgboss.job`; relectura con `leerEntregaDeAlumno` | PK de `tareas`; PK `(clase_id, usuario_id)`; único `(tarea_id, orden)`; único `(tarea_id, alumno_id)`; PK `(entrega_id, criterio_id)` (prefijo) | — (hasta 20 criterios) | READ COMMITTED |
| `editarTarea` (01a, solo lo nuevo) | + `count` de `entregas` por `tarea_id` y `estado`; + criterios (solo con calificadas) | prefijo `tarea_id` del único de `entregas`; único `(tarea_id, orden)` | — | READ COMMITTED (la de siempre) |
| `leerMiEntrega` / `leerEntregaDeAlumno` (01a, lo nuevo) | + `puntos` de la tarea (misma sentencia); + `puntajes_rubrica` con sus criterios (solo si está calificada) | PK de `puntajes_rubrica` (prefijo `entrega_id`); PK de `criterios_rubrica` | — | Instantánea única (la de siempre) |
| `leerGradebook` (01b) | `tareas` (cursor y ventana, con categoría y publicación); `usuarios` (cursor, PK) e `inscripciones` + `usuarios` (página); `entregas` (celdas); `categorias`; agregado por alumno y categoría; vencidas por alumno; `count` de inscritos | `tareas(clase_id, fecha_limite)`; PK de `usuarios`; PK de `inscripciones` con orden por `usuarios.nombre_busqueda` (el plan aceptado del roster, §D-B3 bis de CLASES-01); único `(tarea_id, alumno_id)`; `categorias(clase_id, creado_en, id)` | Alumnos por cursor `usuarioId` (25, hasta 50); tareas por cursor `tareaId` (20, hasta 50) | Instantánea única |
| `leerMisCalificaciones` (01b) | `tareas` (cursor y página con filtro `EXISTS` sobre `entregas`, categoría y publicación); `entregas` del alumno en la página; `categorias`; agregado del alumno | `tareas(clase_id, fecha_limite)`; único `(tarea_id, alumno_id)`; `entregas_alumno_id_idx`; `categorias(clase_id, creado_en, id)` | Cursor `tareaId` (20, hasta 100) | Instantánea única |

- **Sin índices nuevos fuera de §D-1.** El orden de las columnas y de "Mis calificaciones" es `(fecha_limite DESC, id DESC)` sobre `tareas(clase_id, fecha_limite)`: el desempate por `id` ordena dentro de una misma fecha límite (pocas filas). Si el plan de PostgreSQL con datos reales lo pidiera, el índice `(clase_id, fecha_limite DESC, id DESC)` se propone en DEPLOY; hoy no hace falta (PA-04 si el programador ve otra cosa).
- **Los dos agregados del gradebook recorren toda la clase** (no solo la página): son `GROUP BY` sobre índices, con a lo más alumnos × 11 y alumnos filas; nada se guarda (ESSENTIALS).
- **Ninguna lista nueva sin tope:** filas 50, columnas 50, tareas del alumno 100, criterios 20 (`MAXIMO_CRITERIOS_RUBRICA`), categorías 10.

## Autorización

Toda ruta con `protegido()` (cadena fija de ESSENTIALS). Ningún handler verifica rol, propiedad, inscripción ni autoría a mano.

| Método y ruta (subentrega) | `roles` | Sexto paso | Estudiante | Maestro de la clase | Admin | Maestro ajeno / alumno no inscrito |
|---|---|---|---|---|---|---|
| `PUT /clases/:claseId/tareas/:tareaId/entregas/:alumnoId/calificacion` (01a) | `maestro` | propiedad | 403 (rol) | Califica | 403 (rol; S-01) | 403 `SIN_ACCESO_A_LA_CLASE` |
| `GET /clases/:claseId/gradebook` (01b) | `maestro`, `admin` | propiedad | 403 (rol) | Sí | Sí, en cualquier clase | 403 |
| `GET /clases/:claseId/mis-calificaciones` (01b) | `estudiante` | inscripción | Solo las suyas | 403 (rol) | 403 (rol) | 403 |
| `GET …/entrega` y `GET …/entregas/:alumnoId` (sin cambio de cadena; 01a cambia la respuesta) | los de ENTREGAS-01 | — | La suya, con su calificación y sin `version` | La del alumno, con calificación y `version` | Igual que el maestro | 403 |
| `PUT /clases/:claseId/tareas/:tareaId` (sin cambio de cadena; 01a suma el `409`) | `maestro`, `admin` | propiedad | 403 | Según autoría; `409 TAREA_CON_CALIFICACIONES` si cambia puntos o rúbrica de una tarea calificada | Igual | 403 |

- **En todas:** sin token `401`; alumno restringido `403 ACCESO_RESTRINGIDO` sin escribir nada; cambio de contraseña pendiente `403 CAMBIO_DE_CONTRASENA_REQUERIDO`; clase inexistente igual que ajena (`403 SIN_ACCESO_A_LA_CLASE`); `:claseId` que no es uuid `400`; `:tareaId` de otra clase `404 TAREA_NO_ENCONTRADA`; `:alumnoId` no inscrito, de otra clase, desactivado, que no es estudiante o inexistente `404 ALUMNO_NO_ENCONTRADO`.
- **Campos que se omiten:** ninguna respuesta lleva `estadoPago`, `fechaEstadoPago`, `accesoRestringido`, `motivoRestriccion`, `email`, `rol` ni la clave de un objeto, para ningún rol, también con alumnos deudores y restringidos en la clase. El alumno nunca recibe `version` ni datos de otro alumno (ni el promedio de la clase).

## Pruebas requeridas

Reglas heredadas que aplican a todas: toda prueba con fechas relativas fija el reloj (`vi.useFakeTimers({ toFake: ["Date"] })` en el frontend; `ahora` explícito en `core/`; en integración, fechas límite con al menos una hora de margen); `testTimeout` de 15 s del frontend; cada prueba ejecuta al menos una aserción y una precondición faltante la hace fallar con mensaje; ninguna `LOCK TABLE`; retenciones de fila con `conFilaDeEntregasRetenida` (o `conFilaRetenida`) y `formadasDetrasDe`, con `timeout` explícito; ninguna prueba llama a Resend ni al almacén real. Los ids llevan el prefijo del encargo (`CAL-…`) y van en el título del caso. Los conteos del resumen salen de `npx vitest list` o de la corrida.

### 01a (calificar, backend)
- **CAL-1A01** Migración, con SQL parametrizado: `entregas_calificacion_segun_estado` rechaza `calificado` sin `calificacion`, `entregado` con `calificacion`, `calificacion` sin `fecha_calificacion` y al revés; `entregas_calificacion_en_rango` rechaza −0.01 y 1000.01; `puntajes_rubrica_puntos_en_rango` igual; con P-03 (c), `entregas_fecha_segun_estado` acepta `calificado` sin `fecha_entrega` y sigue rechazando `asignado` con fecha y `entregado` sin fecha; `entregas_sin_fecha_sin_retraso_ni_enlaces` rechaza `calificado` sin fecha con retraso o con enlaces; borrar un criterio con puntajes falla al confirmar la transacción (FK `NO ACTION` diferida; Enmienda 1, M-01) y no deja nada borrado; borrar la publicación de una tarea con criterios, entregas y puntajes no falla; la FK `puntajes_rubrica_criterio_id_fkey` existe con `condeferrable` y `condeferred` verdaderos en `pg_constraint`. La migración aplica sobre una base con datos de ENTREGAS-01 (entregas `asignado` y `entregado`, archivos, hilos).
- **CAL-1A02** `escalarALaTarea` (unitaria): suma igual a los puntos de la tarea (identidad), distinta (`7/9` de 10 = 7.78), **rúbrica parcial** (puntos parciales por criterio: 2.5 de 5 y 4 de 5), todo 0, todo al máximo, mitades (redondeo hacia arriba en la centésima), decimales en los puntos de los criterios, puntos de la tarea 1 y 1000.
- **CAL-1A03** `decidirCalificacion` (unitaria): (Enmienda 1, M-02) `puntosVistos` distintos de los puntos de la tarea → `RUBRICA_MODIFICADA`, con y sin rúbrica, y antes que cualquier otro error (también con un cuerpo de forma correcta y valores en rango: el "9 de 10" que sería "9 de 100"); con rúbrica, calificación directa no nula → `RUBRICA_MODIFICADA`; un criterio de menos, uno de más, uno de otra tarea → `RUBRICA_MODIFICADA`; sin rúbrica con puntajes o con calificación nula → `RUBRICA_MODIFICADA`; puntos de un criterio > su máximo → `VALIDACION` con "puntajes.<i>.puntos:" y la posición del cuerpo (no la de la rúbrica); calificación directa > puntos → `VALIDACION` "calificacion:"; el orden de los errores (§D-2.2); los puntajes salen en el orden de la rúbrica aunque lleguen en otro.
- **CAL-1A04** `exigirEntregaCalificable` (unitaria, reloj explícito): matriz estado (`asignado`, `entregado`, `calificado`) × fecha límite (−1 ms, exacta, +1 ms) × `aceptaTardias` (sí, no; Enmienda 1) con la regla de P-03 que elija el humano ((c): la fecha decide; (c′): `asignado` solo con la entrega cerrada).
- **CAL-1A05** `calificacionGeneral` (unitaria), con los cinco casos de `AGENTS.md` y los de P-01 de TAREAS-01: (a) **categorías sin tareas calificadas** (no cuentan; `pesoEfectivo` y `porcentaje` nulos); (b) **pesos redistribuidos** (40/40/20 con una vacía → 50/50, y el general es el ponderado); (c) **tareas sin calificar** (no entran: el agregado de entrada solo trae calificadas, y una categoría con tareas sin calificar es "sin tareas calificadas"); (d) **rúbrica parcial** (agregados con centésimas: 7.78 + 2.5); (e) **entregas tardías** (mismo resultado con y sin retraso; el agregado no distingue); (f) clase sin categorías → modo puntos; (g) con categorías, "Sin categoría" no cuenta y `sinCategoria.tareas` la dice; (h) nada que cuente → `porcentaje: null`; (i) un `categoriaId` desconocido → `ERROR_INTERNO`; (j) redondeo al final (no la suma de redondeados); (k) con P-05 (a), una tarea de 100 puntos pesa más que una de 10 dentro de su categoría.
- **CAL-1A06** `motivosDeRiesgo` y `promedioDeLaClase` (unitarias): 69.99 → `promedio`; 70 → nada; `null` → nada; 2 vencidas → nada; 3 → `vencidas`; los dos; la media ignora los nulos y es `null` sin ninguno.
- **CAL-1A07** `exigirRubricaCongelada` (unitaria; Enmienda 1, N-02): rúbrica idéntica → `reemplazarRubrica: false` con 0 y con calificadas (también si solo cambian los puntos y no hay calificadas); rúbrica distinta sin calificadas → `true`; con calificadas, puntos distintos, un criterio de más o de menos, otro texto, otro máximo, otro orden → `TAREA_CON_CALIFICACIONES`.
- **CAL-1A08** Esquemas (unitaria de `shared/`): `calificarEntregaSchema` es estricto; `version`, `puntosDeLaTarea` (Enmienda 1, M-02: entero de 1 a 1000), `puntajes` y `calificacion` obligatorias; `puntos` negativos, `NaN`, `Infinity`, texto, 3 decimales y 1000.01 → error; 0, 1000 y 2 decimales pasan; `criterioId` repetido (también en mayúsculas) → error; ids a minúsculas; `comentario` vacío, solo invisibles o de 1001 caracteres → error; `tieneHastaDosDecimales` con 0.1, 0.29, 1.005 y 7.785.
- **CAL-1A09** `PUT` con rúbrica → `200`: entrega `calificado`, `calificacion` escalada, `fecha_calificacion` = ahora, `version` + 1, puntajes guardados; la respuesta trae `calificacion` con los puntajes, el texto y el máximo de cada criterio y la `version` nueva; un trabajo `CALIFICACION_PUBLICADA` con id nuevo y datos exactos `{ entregaId, tareaId, claseId, version }`; con comentario, un comentario del maestro en el hilo de esa entrega (lo lista `GET …/entregas/:alumnoId/comentarios` y `GET …/entrega/comentarios` del alumno) y **ningún** trabajo `COMENTARIO_CREADO`; `fecha_entrega`, `con_retraso` y `enlaces` intactos.
- **CAL-1A10** Calificación directa (tarea sin rúbrica) y recalificar: la segunda calificación reemplaza puntajes, calificación y fecha, sube la versión otra vez y encola un segundo aviso con otro id.
- **CAL-1A11** Versión vieja → `409 ENTREGA_MODIFICADA` sin escribir nada: entrega, puntajes, comentarios y `pgboss.job` iguales antes y después.
- **CAL-1A12** Concurrencia (fila retenida, `formadasDetrasDe`): (a) dos maestros con la misma versión → un `200` y un `409 ENTREGA_MODIFICADA`; (b) anular antes que calificar → `409 ENTREGA_MODIFICADA`; calificar antes que anular → la anulación `409 ENTREGA_CALIFICADA`; (c) volver a entregar (tras anular) antes que calificar → `409 ENTREGA_MODIFICADA`; (d) editar la rúbrica (sin calificaciones) antes que calificar → `409 RUBRICA_MODIFICADA`; calificar antes que editar la rúbrica → `409 TAREA_CON_CALIFICACIONES`; (Enmienda 1, M-02 y N-02) editar solo los puntos de una tarea sin rúbrica antes que calificar → `409 RUBRICA_MODIFICADA` y nada escrito; editar solo el título (con la rúbrica idéntica) antes que calificar → la calificación responde `200` y los criterios conservan sus ids; (e) borrar antes que calificar → `404 TAREA_NO_ENCONTRADA`; calificar antes que el borrado del maestro → `409 TAREA_CON_ENTREGAS`; (f) en ninguna, `deadlock`, `P2003` ni `500`; (g) con la fila de la entrega retenida más que el `timeout` de la transacción, `503 SERVICIO_OCUPADO` sin escribir.
- **CAL-1A13** Estados (P-03 c; con (c′), Enmienda 1, también vencida en una tarea que acepta tardías → `409 ENTREGA_NO_CALIFICABLE`, y la que se califica sin entrega es una vencida de una tarea que no las acepta): `asignado` sin vencer (con y sin fila) → `409 ENTREGA_NO_CALIFICABLE` sin crear fila; sin fila y vencida → `200`, fila `calificado` sin `fecha_entrega`; después, el alumno recibe `409 ENTREGA_CALIFICADA` al entregar, al anular y al pedir subir un archivo, y `GET …/entrega` trae su calificación.
- **CAL-1A14** Validación por la API: rango por criterio y de la calificación directa (`400` con el prefijo de §D-10), estructura y puntos vistos distintos (`409 RUBRICA_MODIFICADA`, Enmienda 1), cuerpo con llaves de más, sin `version` o sin `puntosDeLaTarea`, con `version` negativa o decimal, con `puntajes` repetidos → `400`; ninguno escribe ni encola.
- **CAL-1A15** Lecturas: `GET …/entrega` del alumno trae `calificacion` (con desglose) y nunca `version`; `GET …/entregas/:alumnoId` trae `calificacion` y `version`; sin calificar, `calificacion: null`; las respuestas traen exactamente las llaves de sus esquemas.
- **CAL-1A16** Editar una tarea calificada (P-04 a): cambiar el título, las instrucciones, la fecha o el tema → `200`, criterios con los mismos ids y puntajes intactos; cambiar los puntos o la rúbrica → `409 TAREA_CON_CALIFICACIONES` sin escribir nada (tarea, publicación, criterios, archivos, `trabajo_id` y trabajos de la cola iguales); el orden de errores de §D-4.4 (versión vieja con rúbrica distinta → `409 TAREA_MODIFICADA`); una tarea sin calificaciones (también con entregas `entregado`) se edita como hoy.
- **CAL-1A17** Autorización del `PUT`: sin token `401`; estudiante `403`; admin `403` (S-01); maestro ajeno `403 SIN_ACCESO_A_LA_CLASE`; clase inexistente igual; alumno (llamador) restringido `403 ACCESO_RESTRINGIDO`; cambio pendiente `403`; tarea de otra clase `404 TAREA_NO_ENCONTRADA`; `:alumnoId` inexistente, de otra clase, dado de baja, desactivado o maestro `404 ALUMNO_NO_ENCONTRADO`; ninguno escribe ni encola. **Sin fuga:** con el alumno deudor y restringido, ninguna respuesta (éxito o error, maestro, admin y alumno) contiene `estadoPago`, `accesoRestringido`, `email`, `"rol"`, `deudor` ni `@`.
- **CAL-1A18** Reglas estáticas: `handlers/calificaciones.ts` no compara relación ni rol, no toca Prisma ni SQL y solo encola `COLA_CALIFICACION_PUBLICADA`; `FOR SHARE` (sin `KEY`) aparece una vez en `adapters/db/entregas.ts`, dentro de `bloquearTareaParaCalificar`, y lo usa `calificarEntrega`; `adapters/db` no importa `adapters/queue`; las respuestas nuevas de `shared/` son `z.strictObject`; (Enmienda 1, N-01) ningún archivo nuevo o cambiado de `backend/src` nombra en un comentario las palabras de §D-0.9.
- **CAL-1A19** (Enmienda 1, M-01) Borrado confirmado del admin, por la API: `DELETE /api/clases/:claseId/tareas/:tareaId?confirmar=entregas` sobre una tarea con rúbrica de dos criterios, dos entregas calificadas con la API (con puntajes reales), una entregada sin calificar, un comentario de devolución y archivos de entrega → `204`, sin `500` ni `23503`; no queda la tarea, ni sus criterios, entregas, puntajes ni hilos; los archivos quedan `descartado` sin contexto. Corre en el paso 3 de 01a con puntajes escritos por SQL parametrizado (antes de que exista calificar) y otra vez, con calificaciones hechas por la API, en el paso 7. Si falla, PA-10.
- **CAL-1A20** (Enmienda 1, M-01) Borrar la clase de una tarea calificada con rúbrica: no hay ruta de baja de clases, así que la prueba borra la fila de `clases` con SQL parametrizado (como la limpieza de las pruebas, `borrarMovimientosYClasesDePrueba`) y comprueba que no falla y que no quedan tareas, criterios, entregas ni puntajes de esa clase; y que la limpieza normal de las pruebas de 01a con puntajes no falla. Si falla, PA-10.

### 01b (gradebook y "Mis calificaciones", backend)
- **CAL-1B01** Gradebook, datos (reloj con margen): columnas en orden `(fecha_limite DESC, id DESC)` con título, puntos y categoría; celdas en el orden de las columnas (calificada, entregada, con retraso, asignada sin fila, calificada sin entrega); porcentaje por categorías y por puntos; vencidas sin entregar; motivos; resumen (`totalAlumnos`, `promedioDeLaClase`, `alumnosEnRiesgo`) calculado sobre toda la clase, no sobre la página; un alumno dado de baja o desactivado no aparece ni cuenta (sus calificaciones siguen en la base).
- **CAL-1B02** Paginación: filas con el cursor del roster (inexistente → `400`); columnas con `cursorTareas` (de otra clase o inexistente → `400`; empates de fecha límite resueltos por `id` sin repetir ni saltar tareas al recorrer todas las ventanas); límites (0, 51, texto → `400`).
- **CAL-1B03** Instantánea única: el cursor de tareas (y el de alumnos) borrado entre su comprobación y la página no deja una página vacía (gancho de consultas, como PR-FX); una calificación que llega en medio no deja un resumen distinto de las celdas.
- **CAL-1B04** Sin N+1: el número de sentencias de `leerGradebook` y de `leerMisCalificaciones` es el mismo con 2 y con 30 alumnos y con 2 y con 30 tareas (gancho de consultas).
- **CAL-1B05** "Mis calificaciones": `general` igual al cálculo de `core/`; los cinco filtros (con tareas vencidas y por vencer, entregadas a tiempo y con retraso, calificadas con y sin entrega); cursor (de otra clase → `400`) y límites; nunca aparece la entrega de otro alumno ni su calificación; la respuesta no trae `version`.
- **CAL-1B06** Autorización: gradebook: sin token `401`, estudiante `403`, maestro ajeno `403`, admin `200`, cambio pendiente `403`; "Mis calificaciones": maestro `403`, admin `403`, alumno no inscrito `403`, restringido `403 ACCESO_RESTRINGIDO`, sin token `401`. Sin fuga de estado de pago, restricción, correo ni rol en ninguna respuesta, con alumnos deudores y restringidos en la clase.
- **CAL-1B07** El porcentaje del alumno en "Mis calificaciones" es el de su fila del gradebook (mismos datos, misma función).
- **CAL-1B08** Reglas estáticas: `adapters/db/calificaciones.ts` no escribe (ni `create`, `update`, `delete`, `upsert` ni SQL de escritura), su SQL es etiquetado sin `Unsafe` y sin consultas en ciclos, y nombra `instantaneaUnica: true` exactamente 2 veces, en código.

### 01c (calificar y ver la calificación, frontend; reloj fijo en todas)
- **CAL-1C01** Panel con rúbrica: un campo por criterio con su etiqueta ("Claridad (de 5 puntos)"); la suma y la calificación escalada en el texto; validación local (vacío, mayor que el máximo, negativo, 3 decimales, letras) sin petición y con el foco en el primer error; punto y coma decimal; el cuerpo enviado es exactamente `{ version, puntosDeLaTarea, puntajes en orden, calificacion: null, comentario? }` con la versión, los puntos y la rúbrica de apertura aunque una recarga de fondo de la entrega o de la tarea traiga otros (Enmienda 1, M-02); las etiquetas siguen diciendo los puntos de apertura.
- **CAL-1C02** Sin rúbrica: un campo "Calificación (de 80 puntos)"; el cuerpo lleva `puntajes: []`.
- **CAL-1C03** Éxito: un solo aviso de éxito ("Calificación publicada" la primera vez, "Calificación actualizada" después); la entrega en caché es la respuesta; se marcan viejas la lista de entregas, el prefijo de calificaciones y, con comentario, el hilo (sin comentario, el hilo no); el panel se reinicia con los valores guardados y el botón dice "Actualizar calificación"; el foco está en el `h3` "Calificación".
- **CAL-1C04** `409 ENTREGA_MODIFICADA`: un aviso con el mensaje del servidor, exactamente un `GET` de la entrega, `enEspera` (sin `disabled`) durante la recarga y ningún `PUT` más con clics o Enter; al llegar, lo escrito se descartó, el panel muestra lo guardado y el foco está en el `h3`; el siguiente guardado envía la versión nueva. Estados vecinos: segundo `409` seguido; recarga fallida con 5xx (dos avisos en total, lo escrito y la versión se conservan, el foco no está en `<body>`); `404` en la recarga (la vista se reemplaza y el foco va a la raíz); "Volver a las entregas" durante la recarga (sin errores en la consola).
- **CAL-1C05** `409 RUBRICA_MODIFICADA`: un `GET` de la tarea y uno de la entrega; el panel se reinicia con los criterios nuevos; (Enmienda 1, M-02) en una tarea sin rúbrica cuyos puntos subieron de 10 a 100, el panel se reinicia con "Calificación (de 100 puntos)" y el siguiente cuerpo lleva `puntosDeLaTarea: 100`.
- **CAL-1C06** `409 ENTREGA_NO_CALIFICABLE` (Enmienda 1, N-04: un `GET` de la entrega, el panel se reinicia con la frase y el foco queda en el `h3` "Calificación", no en la raíz); `400` de un campo (`ErrorDeCampo` en ese criterio, sin aviso, foco en ese campo); `503` y sin conexión (un aviso, lo escrito se conserva, el botón vuelve a estar disponible); `404` del alumno (un aviso, la vista se reemplaza).
- **CAL-1C07** Guarda síncrona: doble clic y Enter repetido hacen un `PUT`; el botón usa `enEspera`, nunca `disabled`.
- **CAL-1C08** Perspectivas y estados: el admin ve la calificación en solo lectura, sin ningún `textbox` ni botón de calificar; sin calificación, "Sin calificar todavía."; una entrega `asignado` sin vencer muestra "Podrás calificar…" sin formulario; una vencida sin entrega muestra la nota y el formulario (P-03 c; con (c′), Enmienda 1, solo si además la tarea no acepta tardías, y una vencida que las acepta muestra la frase sin formulario).
- **CAL-1C09** "Tu trabajo": calificada con entrega (frase de hoy, "Calificación: 8.5 de 10", la fecha y el desglose por criterio); calificada sin entrega ("No entregaste esta tarea y ya está calificada."); sin calificación, nada nuevo.
- **CAL-1C10** Editar una tarea calificada: `409 TAREA_CON_CALIFICACIONES` da un aviso con el mensaje del servidor, lo escrito se conserva y no hay `GET` de la tarea.
- **CAL-1C11** `formatearPuntos` y `formatearPorcentaje`: enteros, uno y dos decimales, 1000 sin separador, 0, con el espacio de no separación antes de "%".
- **CAL-1C12** "Sin categoría" se escribe una sola vez, en `components/clase/data.ts` (por texto fuente, como T-r1-2 de ENTREGAS-01a), y las llaves de `features/tareas` son ese valor (`toBe`).
- **CAL-1C13** Regla estática de lo nuevo y lo cambiado de 01c: sin `disabled`, `?? []`, `fetch(`, `console.`, valor por defecto en `calificacion`, vidrio ni importaciones de otro módulo de `features`; `renovarTrasErrorDeLaEntrega(` sigue en 3; tipos solo en `types.ts` (componentes, solo Props); la vista de la entrega de un alumno sin "correo", `estadoPago` ni `perspectivaDeRuta(`; ningún comentario con las palabras de §D-0.9 (Enmienda 1, N-01).
- **CAL-1C14** (Enmienda 1, N-03) El panel montado con la frase (entrega `asignado` sin vencer, versión 0): una recarga de fondo trae la entrega `entregado` con versión 1; el formulario aparece y el primer guardado envía `version: 1` (sin `409`). Y al revés: con el formulario a la vista, una recarga que trae la entrega no calificable lo quita y el foco no queda en `<body>`.

### 01d (gradebook, "Mis calificaciones" y modal, frontend; reloj fijo en todas)
- **CAL-1D01** Gradebook: encabezados (título, "de N puntos", categoría), celdas con texto (calificación, "Entregado", "Entregado con retraso", "Sin entregar", "—" con "Asignado" para lector de pantalla), "Promedio" y "Riesgo" (insignia con texto y motivo); el resumen; los enlaces de las celdas apuntan a `…/tareas/:tareaId/entregas/:alumnoId` del maestro y del admin (montado con el router real en las dos ramas); (Enmienda 1, M-03) la raíz de la vista lleva `data-material="opaco"` y todos los botones, enlaces y la tabla del gradebook cuelgan de ella (`closest('[data-material="opaco"]')` es la raíz para cada control, en el maestro; en el admin, sin contar contextos, O-5).
- **CAL-1D02** Ventanas: cada botón pide la ventana correcta (cursor de alumnos o de tareas); "anteriores" y "más recientes" vuelven con la pila; solo aparecen los que aplican; `enEspera={isFetching}` y guarda (dos clics, una petición); si el botón pulsado desaparece, el foco va al `h2`; la tabla anterior se ve mientras llega la nueva.
- **CAL-1D03** Errores del gradebook según la matriz de §D-14 (primera carga, `400` del cursor, `403`, recarga de fondo con datos), con el foco nunca en `<body>`.
- **CAL-1D04** "Mis calificaciones": porcentaje o su frase; filas con estado y calificación; la fecha con el texto de `vencimientoDe` ("Vence…" o "Venció el…", Enmienda 1, N-06); el filtro pide con `estado` y conserva el foco en el selector; "Ver más tareas" (foco al primer enlace nuevo o al `h2`; un aviso con la vista montada; ninguno desmontada; `400` del cursor con su texto); vacíos por filtro; el enlace de cada tarea va a su detalle.
- **CAL-1D05** Modal: "Ver cálculo" lo abre; modo puntos y modo categorías con sus textos, "Peso que cuenta" y "—"; la nota de "Sin categoría" en singular y plural; Escape y "Cerrar" lo cierran y el foco vuelve a "Ver cálculo"; el foco queda atrapado dentro; hay un solo botón de cierre (sin la equis de `DialogContent`) y el contenido se pinta en el portal, fuera del `Card` (Enmienda 1, N-10).
- **CAL-1D06** Secciones: "Calificaciones" es la última en las tres perspectivas, con su `href` y `aria-current`; en el admin el indicador mide un quinto (`w-1/5`, `grid-cols-5`) y en "Calificaciones" se traslada con `translate-x-[400%]`; las posiciones de "Alumnos" y "Maestros" no cambian.
- **CAL-1D07** Router: el estudiante en `…/calificaciones` monta "Mis calificaciones"; el maestro y el admin, el gradebook; ninguno pide la ruta del otro.
- **CAL-1D08** `components/foco/`: las reexportaciones de `features/tareas` son los mismos objetos (`toBe`) y el gancho se comporta igual (las pruebas de foco de TAREAS y ENTREGAS siguen en verde sin cambios).
- **CAL-1D09** Regla estática de `features/calificaciones`: tipos solo en `types.ts` (componentes, solo Props); sin `?? []`, `disabled`, `fetch(`, `console.`, `perspectivaDeRuta(`, clases de vidrio, fondos escritos a mano (salvo el fondo `--surface` de la columna fija del alumno, que el desplazamiento horizontal exige), valores arbitrarios, `estadoPago`, `accesoRestringido` ni correo; no importa de otro módulo de `features`. (Enmienda 1, M-03) `data-material="opaco"` aparece exactamente una vez en el módulo, en la raíz de `gradebook-view.tsx`, y ninguna vez en "Mis calificaciones"; ningún `data-densidad`. (Enmienda 2) Ningún archivo de producción del módulo contiene `.message` (las vistas nunca pasan el mensaje del servidor a `MensajeError` ni a `toast`; el prefijo lo lee `campoDeErrorDeApi`, fuera del módulo), ninguno llama a `esErrorDeCursor(` (el módulo usa `esErrorDeCursorDeCalificaciones`) y ninguno usa `ErrorDeCampo`.

**(Enmienda 2) `400 VALIDACION` fuera de contrato (regla de `AGENTS.md`, "Reglas del equipo", del 2026-10-13).** Inventario de 01d: los controles que mandan datos al servidor son las ventanas del gradebook (`cursor`, `limite`, `cursorTareas`, `limiteTareas`), el filtro "Mostrar" (`estado`) y "Ver más tareas" de "Mis calificaciones" (`cursor`, `limite`, `estado`). Ninguno es un formulario de texto; la regla aplica por analogía (S-21). El modal y "Ver cálculo" no envían nada: **no aplica**. En todos, "fuera de contrato" son las tres clases de la regla: (1) un campo que la vista no pinta (`limite:`, `limiteTareas:`, `estado:`, ninguno de los cuales tiene un campo en la vista), (2) un mensaje vacío (`""`) o de solo espacios (`"   "`), (3) un prefijo con ruta (`cursorTareas.0:`, `alumnos.0.id:`, `estado.0:`, `cursor.0:`). Los servidores dobles responden `{ error: { codigo: "VALIDACION", mensaje } }` con estado `400`. Las aserciones comunes son: exactamente un mensaje legible (S-21), que no contiene el mensaje del servidor ni su prefijo (`queryByText` con el prefijo y con el texto en inglés de zod da `null`) ni es vacío; ningún `ErrorDeCampo`; ningún control con `aria-busy="true"` al terminar; el foco nunca en `<body>`; reloj fijo.
- **CAL-1D10** `esErrorDeCursorDeCalificaciones` y `mensajeDeErrorCalificaciones` (unitaria, tabla):
  - **Cursor:** "cursor: no es válido" es cursor con las dos listas; "cursorTareas: no es válido" lo es con la del gradebook y no con la de "Mis calificaciones"; "cursor:" y "cursorTareas:   " (sin mensaje) lo son.
  - **No es cursor:** "cursorTareas.0: no es válido", "cursor.0: x", " cursor: x", "Cursor: x", "", "   " y un mensaje sin prefijo no lo son; un `500` con el mensaje "cursor: x" y un error que no es `ApiError` tampoco.
  - **Mensaje con respaldo `R`:** "limiteTareas: Too big: expected number to be <=50", "limite: Too small…", "estado: Invalid option…", "", "   ", "cursorTareas.0: no es válido", "alumnos.0.id: x" y "Revisa este valor." dan `R`. "claseId: Invalid UUID" y `SIN_ACCESO_A_LA_CLASE` dan `sinAcceso`. Un `500`, un `503` y un error de red dan `R`.
  - **Nunca:** el resultado nunca es vacío ni contiene `:`, `Too` ni el mensaje del servidor.
- **CAL-1D11** Gradebook, primera carga con un `400 VALIDACION` fuera de contrato (`it.each` con las tres clases, dos entradas por clase: `limiteTareas: Too big…` y `estado: Invalid option…`; `""` y `"   "`; `cursorTareas.0: no es válido` y `alumnos.0.id: Invalid UUID`), en el maestro: un solo `MensajeError` con "No pudimos cargar las calificaciones. Inténtalo de nuevo.", ningún `toast.error`, ninguna tabla, nada del mensaje del servidor en el documento, ningún `aria-busy="true"` y el foco no en `<body>`.
- **CAL-1D12** Gradebook, ventana nueva con un `400 VALIDACION` fuera de contrato (las mismas seis entradas), tras pulsar "Tareas más antiguas" y tras pulsar "Alumnos siguientes":
  - La petición llevó el cursor correcto y la tabla anterior se vio mientras llegaba la respuesta.
  - Después, el mismo resultado de CAL-1D11, con el foco en la raíz.
  - **Vecinos del cursor:** `cursorTareas: no es válido` y `cursorTareas:` (sin mensaje) dan el texto "La clase cambió mientras veías las calificaciones. Vuelve a abrir Calificaciones para verlas completas.", sin aviso (falla si el código solo usa `esErrorDeCursor`). `cursor:` (sin mensaje) en "Alumnos siguientes" da el mismo texto.
- **CAL-1D13** Gradebook, estados vecinos:
  - **El mismo `400` dos veces seguidas** (primera carga fallida y otra petición de la misma clave, con `refetch` del `QueryClient` o al invalidar el prefijo de calificaciones): un solo `MensajeError` y ningún aviso.
  - **Recarga de fondo con datos** que responde un `400` fuera de contrato, y otra que responde `cursorTareas: no es válido`: la tabla sigue a la vista y no hay aviso (S-19).
  - **Vista desmontada** con una ventana en vuelo que responde un `400` fuera de contrato: ningún aviso, ningún error en la consola; al volver a montar la vista con la misma `QueryClient`, tampoco hay aviso.
  - **En el admin**, la entrada `limiteTareas: Too big…` da el mismo resultado que en el maestro.
- **CAL-1D14** Filtro "Mostrar" con un `400 VALIDACION` fuera de contrato (`it.each` con las tres clases: `estado: Invalid option…` y `limite: Too big…`; `""` y `"   "`; `estado.0: Invalid option…` y `tareas.0.id: x`), en la primera carga y tras elegir "Calificadas":
  - La petición llevó `estado=calificadas`.
  - El selector sigue con "Calificadas" elegida y con el foco.
  - Un solo `MensajeError` con "No pudimos cargar tus calificaciones. Inténtalo de nuevo." en lugar de la lista, ningún `toast.error` y nada del mensaje del servidor.
  - En la primera carga, el foco no está en `<body>`.
- **CAL-1D15** Filtro, estados vecinos:
  - **Dos filtros seguidos que fallan** ("Asignadas" y luego "Sin entregar"): un solo `MensajeError`, el de la última clave, y ningún aviso.
  - **Volver a un filtro que responde `200`:** la lista vuelve, el `MensajeError` desaparece y el foco sigue en el selector.
  - **Vista desmontada** con el filtro en vuelo y un `400` fuera de contrato: ningún aviso.
- **CAL-1D16** "Ver más tareas" con un `400 VALIDACION` fuera de contrato (las tres clases: `limite: Too big…` y `estado: Invalid option…`; `""` y `"   "`; `cursor.0: no es válido` y `tareas.0.id: x`), con la vista montada:
  - Exactamente una llamada a `toast.error`, con "No pudimos cargar más tareas. Inténtalo de nuevo.".
  - Las filas ya cargadas siguen (mismo número de enlaces de tarea).
  - "Ver más tareas" sigue a la vista, sin `aria-busy="true"`, con el foco.
  - Ningún `MensajeError` y nada del mensaje del servidor en el documento.
  - **Vecino:** `cursor:` (sin mensaje) da el texto "Tus tareas cambiaron mientras las veías. Vuelve a abrir Calificaciones para verlas completas." y ningún aviso.
- **CAL-1D17** "Ver más tareas", estados vecinos:
  - **El mismo `400` fuera de contrato en dos intentos seguidos** (el segundo clic después de que se asienta el primero): dos llamadas a `toast.error`, una por intento, con el mismo texto.
  - **Doble clic durante la petición:** una petición y un aviso.
  - **Un `400` fuera de contrato seguido de un `200`:** se agregan las filas, sin aviso nuevo.
  - **Vista desmontada** con "Ver más tareas" en vuelo y un `400` fuera de contrato: ningún aviso, ni al responder ni al volver a montar la vista con la misma `QueryClient`.

### Pruebas existentes que el programador puede cambiar (lista cerrada, por subentrega; cualquier otra es PARADA)
Grep hecho sobre `d998282`: llamadas directas a cada función cuya firma cambia (ninguna cambia de firma: `calificarEntrega` es nueva, `editarTarea` y las lecturas conservan la suya), dobles de cada tipo que gana campos (`MiEntrega`, `EntregaDeAlumno`, sus respuestas y `miEntregaSchema`; `: MiEntrega|: EntregaDeAlumno|puedeAnular:|version: \d` en pruebas), aserciones exhaustivas sobre esas respuestas (`).toEqual({`) y sobre cada texto o lista que cambia (secciones de la clase, clases del indicador).

**01a:**
- `backend/test/esquemas-entregas.test.ts`, caso "PR-1B04: la respuesta vuelve a exigir http o https…" (`:73-88`): `base` suma `calificacion: null`. Nada más.
- `backend/test/entregas.integracion.test.ts`, los dos `toEqual` de la entrega del alumno (`:226-234` y `:581-589`): suman `calificacion: null`. Nada más.
- `frontend/src/features/tareas/entregas-01d.test.tsx`, constructores `entregaAsignada` (`:55`) y `entregaRealizada` (`:66`): suman `calificacion: null`.
- `frontend/src/features/tareas/entregas-01e.test.tsx`: constructor `entregaDeAlumno` (`:72`), el doble de `EntregaDeAlumno` en línea (cerca de `:496-504`) y los dos dobles de `MiEntrega` en línea (cerca de `:266-275` y `:843-852`): suman `calificacion: null`.
- `frontend/src/features/tareas/detalle-tarea-view.test.tsx`, el doble de `MiEntrega` de `stubApi` (cerca de `:63-71`): suma `calificacion: null`.
- `frontend/src/app/router-01e.test.tsx`, el doble de `EntregaDeAlumno` (`:94-102`): suma `calificacion: null`.
- **Revisadas y sin cambio:** las filas `calificado` fabricadas con `crearEntregaDePrueba` (`entregas.integracion:619, :839, :1125`, `entregas-lecturas.integracion:217`, `hilo-privado.integracion:305`, `tareas-borrar-con-entregas.integracion:353`, `hilo-01c-r1.ataque:370`, `entregas-01b-r1.ataque:748, :893`) pasan con A-3; `entregas-migracion.integracion:165-202` (los nombres de los `CHECK` se conservan y siguen rechazando lo mismo); `tareas-version.integracion` y `tareas-01a-r1.ataque` (comparan criterios tras un `409` de versión, que va antes del de calificaciones); `esquemas-tareas.test.ts` (`editarTareaSchema` no cambia); `router.test.tsx` PR-1D07 (no responde la entrega del alumno); las pruebas de la fila de "Trabajo de clase" (su `entrega` es `{ estado, conRetraso }`, sin cambio); E6 de `bloqueo-usuario.integracion` (en 01a solo cambian `entregas.ts` y `tareas.ts`, que ya están).

**01b:**
- `backend/test/bloqueo-usuario.integracion.test.ts`, caso "E6: solo salud.ts, bloqueo-usuario.ts, … y entregas.ts usan SQL etiquetado en adapters/db" (`:687-717`): la lista ordenada suma `"calificaciones.ts"` (después de `"bloqueo-usuario.ts"`), el título suma "calificaciones.ts" y el bloque de comentario de `:677-686` suma una frase de CALIFICACIONES-01b (los agregados del gradebook y de "Mis calificaciones"). Nada más.

**01c:** ninguna prevista. El panel nuevo cambia lo que pinta la vista del maestro, y las pruebas de `entregas-01e.test.tsx` lo buscan por nombre accesible; si alguna normal cae por el panel, es PA-02, no un cambio libre.

**01d:**
- `frontend/src/features/clases/lib.test.ts`, "PR-2C01: la tabla de capacidades de §D-2C1, celda por celda" (`:276-317`): las tres listas de secciones suman "Calificaciones" al final. Nada más.
- `frontend/src/features/clases/clase-layout.test.tsx`:
  - "PR-2C07: el admin vuelve a la lista de clases, ve Muro, Alumnos y Maestros…" (`:260-291`): la lista suma "Calificaciones" y `"w-1/4"` pasa a `"w-1/5"`.
  - "PR-2C08: el maestro ve el código pero no «Editar clase»" (`:314-330`): `toHaveLength(3)` pasa a `toHaveLength(4)`.
  - "PR-1E05 · tres secciones para el estudiante y el maestro y cuatro para el admin…" (`:368-397`): las tres listas suman "Calificaciones"; título nuevo: "PR-1E05 · cuatro secciones para el estudiante y el maestro y cinco para el admin, con «Trabajo de clase» segunda y «Calificaciones» última".
  - "PR-1E05 · en …/trabajo, … en el admin mide un cuarto" (`:399-421`): el estudiante pasa de `"w-1/3"` a `"w-1/4"`; el admin, de `"w-1/4"` a `"w-1/5"` y de `"grid-cols-4"` a `"grid-cols-5"`; título: "…en el admin mide un quinto". Nada más.
- **Revisadas y sin cambio:** M-T1 (`clase-layout.test.tsx:222`, "Alumnos" sigue en la tercera posición del maestro), PR-2C07 de las posiciones (`:294-312`), los casos de `indiceDeSeccionActiva` de `lib.test.ts` (índices de "Alumnos" y "Maestros" iguales) y PR-B14.
- **(Enmienda 2) Sin cambios en esta lista ni en §D-R0.** CAL-1D10 a CAL-1D17 son casos nuevos en archivos nuevos de `features/calificaciones`. Las funciones de la enmienda son nuevas o del módulo nuevo: `mensajeDeErrorCalificaciones` gana un parámetro, pero nadie la llama todavía. `lib/errores-de-api.ts` no cambia (solo se importa `campoDeErrorDeApi`, que ya se exporta). Ninguna `*.ataque` busca `campoDeErrorDeApi` fuera de `features/clases`: el grep sobre `frontend/src` solo lo encuentra en `lib/errores-de-api.ts`, `features/clases/lib.ts`, `features/clases/clases-admin-view.tsx`, `features/tareas/entregas-view.tsx`, `refactor-01c-r1.ataque.test.tsx` y `reexportaciones-01c.test.ts`, y las dos pruebas fijan de dónde se reexporta `esErrorDeCursor`, no quién importa de `lib/`. La enmienda no suma ningún `enEspera=`, `data-material` ni valor arbitrario, así que C-8 y C-12 no cambian. Los textos nuevos solo entran en `features/calificaciones/data.ts`.

## Puntos de ataque para el Tester

### Ronda 0 (cada subentrega; no cuenta en el tope de 3)
- V-01 contra la tabla de 175 `*.ataque` de la ronda 2 de 01e de ENTREGAS-01 (y después, contra la de la subentrega anterior); C-n solo por §D-R0 (A-5), con la tabla de SHA-256 al final.
- **Inventario:** recorrer las listas cerradas, los inventarios estáticos (rutas, usos de `instantaneaUnica`, `FOR KEY SHARE`, modelos que se borran, nombres de cola, archivos de `handlers/tareas/`, `enEspera=`, vidrio, valores arbitrarios, llamadores de `perspectivaDeRuta`, secciones de la clase) y los dobles de `MiEntrega` y `EntregaDeAlumno`, y confirmar que solo rompen las de §D-R0. Cualquier otra es PARADA del orquestador (vuelve al arquitecto para una enmienda), no un C-n improvisado.
- Al cerrar la ronda 0, correr las dos suites (de una en una) y reportar exactamente los rojos esperados de §D-R0, cada uno fallando por la causa que dice la tabla.
- 01a: comprobar que la migración aplica sobre una base con datos de ENTREGAS-01 (entregas `asignado` y `entregado` con archivos y enlaces, hilos).

### 01a
- **Versión:** calificar con la versión de antes de que el alumno anulara, con la de antes de otra calificación, con la versión como texto, `1.0`, `-0`, `2^53`; dos pestañas del mismo maestro; los dos maestros de la clase a la vez.
- **Que un `409` o un `400` no dejen nada a medias:** puntajes borrados sin reinsertar, un comentario creado, un trabajo encolado, la versión subida.
- **Carreras:** calificar contra anular, entregar, comentar, editar la rúbrica, mover de tema y borrar la tarea, en los dos órdenes; calificar a dos alumnos de la misma tarea a la vez (no deben esperarse entre sí más allá de la tarea); un `deadlock` en cualquier combinación es hallazgo.
- **Forma del cuerpo:** puntajes de otra tarea o de otra clase, un criterio repetido en mayúsculas, puntajes con calificación directa, la calificación directa en una tarea con rúbrica, 21 puntajes, decimales raros (`0.1 + 0.2`, `1e-2`, `7.785`), `-0`.
- **Escala y redondeo:** fronteras de la centésima en `escalarALaTarea` con rúbricas cuyo máximo no divide los puntos de la tarea; una suma de 1000 puntos de criterios contra una tarea de 1.
- **Calificar sin entrega (P-03):** antes de vencer, en el milisegundo exacto, después; con la tarea que acepta tardías (el alumno ya no puede entregar); sin fila; con una fila `asignado` que solo tiene hilo.
- **Rúbrica congelada (P-04):** el mismo texto con espacios o mayúsculas distintos, el mismo criterio en otro orden, los mismos criterios con un máximo cambiado, la rúbrica vaciada, los puntos de la tarea cambiados sin tocar la rúbrica; una tarea calificada movida de tema (debe pasar).
- **Fugas:** el estado de pago, la restricción, el correo o el rol en cualquier respuesta (también en errores), con alumnos deudores y restringidos; la alumna que recibe `version`; el admin que califica por cualquier camino.
- **Hilo:** el comentario de devolución visible por las rutas del muro, contado en el muro o sin su autor; que encole `COMENTARIO_CREADO`; un comentario de 1000 caracteres visibles y uno de solo invisibles.

### 01b
- **Paginación de dos dimensiones:** tareas con la misma fecha límite (al milisegundo) a ambos lados del corte de una ventana; el cursor de tareas de otra clase; el cursor de alumnos de un maestro o de un alumno de otra clase (debe servir mientras exista, N-04 de ENTREGAS-01); el cursor borrado entre la comprobación y la página.
- **Agregados:** que el resumen dependa de la página que se pide; un alumno dado de baja con calificaciones que cuente; una categoría borrada (imposible con tareas) o una clase que pasa de categorías a puntos; la tarea "Sin categoría" que cuente con categorías; una tarea vencida hace un milisegundo; una tarea calificada sin entrega contada como vencida sin entregar.
- **N+1:** crecer alumnos y tareas y contar sentencias.
- **"Mis calificaciones":** ver la calificación o la entrega de otro alumno por el filtro, el cursor o una tarea de otra clase; la `version`; el promedio de la clase.
- **Autorización:** el estudiante en el gradebook, el maestro y el admin en "Mis calificaciones", el maestro ajeno, el alumno restringido.

### 01c
- El panel que envía la versión de una recarga de fondo en lugar de la de apertura; una recarga de fondo que reinicia el panel sin `409` (pierde lo escrito); el reinicio con los datos viejos; dos avisos o dos `GET` por un solo `409`; un `PUT` enviado desde el teclado mientras se recarga; el foco en `<body>` tras el reinicio, tras un `404`, tras `ENTREGA_NO_CALIFICABLE` o al perder la posibilidad de calificar.
- El hilo que no muestra el comentario recién publicado; el gradebook o la lista de entregas que siguen viejos al volver.
- Números: "8,5", " 8.5 ", "08.50", "8.", ".5", "1e1", "Infinity".
- El admin con cualquier control de calificar; el alumno que ve `version` o la calificación de otro.
- "Tu trabajo" de una entrega calificada sin entrega.

### 01d
- La tabla con 50 × 50 a 360 px (desplazamiento solo dentro del contenedor, columna del alumno fija), una tarea de 200 caracteres en el encabezado, un nombre de 120 caracteres.
- Los botones de ventana durante una recarga; dos clics; la pila de "anteriores" tras un error; el foco al llegar al final.
- El modal con datos que cambian mientras está abierto; abrirlo durante una recarga; Escape con una petición en vuelo.
- Que una prueba dependa de la hora real (hallazgo; reloj fijo, regla de `tester.md`).
- El filtro y "Ver más tareas" a la vez; "Ver más tareas" durante una recarga (`isFetching`); el `400` del cursor.
- La sección "Calificaciones" con la ruta en mayúsculas; el estudiante que escribe la URL del gradebook (ve "Mis calificaciones", la misma ruta en su rama) y el maestro la de "Mis calificaciones".
- **(Enmienda 2) `400 VALIDACION` fuera de contrato en las tres consultas** (ventanas del gradebook, filtro y "Ver más tareas"):
  - **Las tres clases de la regla**, cada una en cada disparador: un campo que la vista no pinta (`limite:`, `limiteTareas:`, `estado:`, `version:`), un mensaje vacío o de solo espacios (también tabuladores y un salto de línea), y un prefijo con ruta (`cursorTareas.0:`, `cursor.0:`, `alumnos.0.id:`, `estado.0:`).
  - **Lo que es hallazgo:** que salga ningún mensaje, dos mensajes (`MensajeError` y aviso a la vez) o un mensaje vacío; que se vea el prefijo o el texto en inglés de zod; que un control quede con `aria-busy="true"`; que el foco caiga en `<body>`.
  - **La frontera del cursor:** `cursorTareas:` contra `cursorTareas.0:`, `cursor:` sin mensaje, ` cursor:` con un espacio delante, `CURSOR:`; un `cursorTareas:` que llega a "Mis calificaciones" (allí es fuera de contrato) y un `cursor:` en la primera carga sin cursor enviado (el texto del cursor: la clasificación de §D-13.2 no mira lo que se envió).
  - **`claseId:`** con un mensaje vacío: "No tienes acceso a esta clase.", nunca el genérico.
  - **Vecinos:**
    - El mismo error dos veces seguidas, que debe dar un aviso por intento en "Ver más tareas" y un solo `MensajeError` en las demás.
    - Un `400` fuera de contrato seguido de un `200`.
    - El error en una recarga de fondo con datos.
    - La vista desmontada con la petición en vuelo, y montarla otra vez con la misma `QueryClient`.
    - Un filtro nuevo mientras "Ver más tareas" falla.
    - El `400` mientras el modal está abierto (el modal solo se cierra si la consulta se reemplaza; con "Ver más tareas" fallido, sigue abierto).

## Riesgos y desacuerdos

| Id | Riesgo o desacuerdo | Qué propone el plan |
|---|---|---|
| R-01 | **Bloqueo nuevo sobre `tareas` (`FOR SHARE`).** Calificar espera a una edición, un movimiento de tema o un borrado de la misma tarea, y ellos lo esperan a él. Mal ubicado, podría formar un ciclo. | Siempre primero la tarea (§D-0.5, §D-9); ninguna operación toma una fila hija y después la tarea. CAL-1A12 recorre las combinaciones en los dos órdenes y exige cero `deadlock`. |
| R-02 | **P-03 (c) con tareas que aceptan entregas tardías:** calificar a quien no entregó le cierra la entrega, y no hay forma de quitar una calificación (P-01 a). | Se dice en la nota del panel ("ya no podrá entregarla") y en P-03. La variante (c′) del manager (Enmienda 1) lo evita: solo se califica sin entrega con la entrega ya cerrada; el diseño está escrito para las dos. |
| R-03 | **Los agregados del gradebook recorren toda la clase en cada petición.** | Son `GROUP BY` sobre índices y devuelven a lo más alumnos × 11 filas; con clases de decenas de alumnos es barato. Si una clase crece a cientos, DEPLOY mide y, si hace falta, se propone una vista materializada (sería una decisión de ESSENTIALS, no de este encargo). |
| R-04 | **Cambio de pruebas de las secciones de la clase** (S-10): seis casos normales y tres `*.ataque` cambian solo por la sección nueva. | Es la misma forma de TAREAS-01e (C-11). Vetable: el enlace en "Trabajo de clase". |
| R-05 | **Mover `useFocoAlPerderseElControl` a `components/foco/`** es un refactor dentro de un encargo de funcionalidad. | Es un movimiento con reexportación, sin cambio de comportamiento, en el mismo paso que lo necesita, con su prueba de identidad (CAL-1D08) y con todas las pruebas de foco de TAREAS y ENTREGAS sin cambios. La alternativa es una cuarta copia del mecanismo (regla 5). Si el humano prefiere separarlo, va a una subentrega 01d-0 de solo refactor antes de 01d. La recomendación del arquitecto y la del manager coinciden: dentro de 01d, paso 1 (Enmienda 1; decisión para el humano arriba). |
| R-06 | **El pendiente de `formatearFechaDeClase` cambia de destino** (S-15). | Se reasigna a un `chore`; el orquestador lo anota en `docs/ESTADO.md` §3 al cerrar 01c. |
| R-07 | **Despliegue:** `calificacion` obligatoria en dos respuestas; un frontend viejo con un backend nuevo rompe el `parse` de "Tu trabajo" y de la entrega de un alumno. | S-16: se despliegan juntos. **No revertir el backend a una versión anterior a 01a si ya hay calificaciones** (texto de la Enmienda 1, con la FK diferida de M-01): el `editarTarea` de ENTREGAS-01 reemplaza siempre los criterios, y con puntajes que apuntan a ellos la transacción falla al confirmar (un `500` al editar cualquier tarea calificada, ruidoso y sin borrar nada; con una FK en `CASCADE` borraría el desglose en silencio, por eso no se eligió). Su `anularEntrega` y su `borrarTarea` ya tratan bien una entrega `calificado`, y con la FK diferida su borrado en cascada pasa. Va a `docs/ESTADO.md` §3 con destino DEPLOY. |
| R-14 | (Enmienda 1, M-01) **La FK diferida de `puntajes_rubrica.criterio_id` y Prisma:** Prisma no expresa `DEFERRABLE`; si su comparación de esquema la viera distinta, propondría recrearla en cada `migrate dev`. | Paso 3 de 01a: `migrate diff` sin diferencias y un `migrate dev` siguiente sin propuestas; si no, PA-06 y decide el humano entre la FK diferida y `CASCADE` (la alternativa (2) de la revisión: pierde la defensa contra un defecto de `editarTarea`, que queda solo en CAL-1A16). |
| R-08 | **Redondeo en dos lados:** el panel muestra la calificación escalada con su propia cuenta y el servidor guarda la suya. | La misma fórmula en centésimas en los dos lados (§D-2.1, §D-12.2), con los mismos casos de prueba; lo que se guarda y se muestra después es lo del servidor. |
| R-09 | **Desglose de `general` en cada página de "Mis calificaciones":** una calificación que llega entre páginas cambia el porcentaje. | La vista muestra el de la última página (como el conteo de entregas de ENTREGAS-01e); cada página es coherente con su instantánea. |
| R-10 | **El comentario de devolución entra al hilo sin `COMENTARIO_CREADO`** (S-11). | NOTIFICACIONES debe saber que el aviso de `CALIFICACION_PUBLICADA` cubre ese comentario. Se anota en `ARCHITECTURE.md` §8 (texto propuesto abajo). |
| R-11 | **Medición del programador:** 01c y 01d tienen muchas acciones que mueven el foco y recargan. | La matriz de §D-14 va desde el primer resumen (`AGENTS.md`); el panel reutiliza el mecanismo ya probado del formulario de la tarea (reinicio por `key`, `refetch` esperado, foco al `h3`), sin ganchos nuevos. El programador sigue en `opus` (`aprobacion.md`). |
| R-12 | **`ARCHITECTURE.md` §7 lista `GET /me/calificaciones`** y RF-17 dice "por clase". | S-09: la ruta pasa a `/clases/{claseId}/mis-calificaciones` (texto propuesto abajo). |
| R-13 | **"En riesgo" de un alumno que se inscribió tarde** (S-04): las tareas vencidas antes de su alta cuentan como sin entregar. | Es lo que él ve como "Sin entregar" en "Trabajo de clase"; si el humano lo quiere distinto, la consulta de §D-6.6 suma `t.fecha_limite >= i.creado_en` (un cambio acotado) y la fila de "Trabajo de clase" debería seguir la misma regla (otro encargo). |
| R-15 | (Enmienda 2) **Hermanos fuera de 01d de los `VALIDACION` de consulta fuera de contrato.** "Ver más" de `features/tareas/entregas-view.tsx` avisa con `mensajeDeErrorTareas`, que solo quita un prefijo sin puntos (`quitarPrefijoDeCampo`). Un `limite: Too big…` saldría en inglés y un `cursor.0: …`, con su prefijo. Las listas paginadas de `features/clases` (`mensajeDeErrorClases`) tienen el mismo camino. Son los mismos hermanos que el programador anotó para T-04 (`archivoIds.<i>`, `orden.<i>`, `categorias.<i>.*`). | No se tocan en este encargo: `lib/errores-de-api.ts` y esos módulos están en "No se toca", y el cliente de hoy no provoca esas respuestas. Van al mismo `chore` posterior que los hermanos de T-04; el orquestador los suma a ese pendiente en `docs/ESTADO.md` §3 al cerrar 01d. Si el humano prefiere arreglarlos aquí, hace falta autorizar `lib/errores-de-api.ts` (ampliar `PREFIJO_DE_CAMPO` a rutas) y una enmienda con sus pruebas. |

### Documentos a actualizar (texto propuesto; los aplica el orquestador al cerrar la subentrega indicada, A-6)

**ESSENTIALS** (al cerrar 01a, salvo lo marcado):
- "Reglas de datos", viñeta "Edición concurrente": reemplazar "(entregar y anular la suben; calificar la exigirá en CALIFICACIONES)" por "(entregar, anular y calificar la suben; calificar la exige: si el alumno anuló o volvió a entregar, u otra persona calificó, `409 ENTREGA_MODIFICADA`; CALIFICACIONES-01)" y, al final de la viñeta: "Tras el `409`, el panel de calificación avisa, descarta lo escrito y recarga, como el formulario de la tarea."
- "Tablas", restricciones clave: reemplazar "`entregas`: una fila por alumno y tarea, creada al primer uso (entregar o comentar), con `fecha_entrega` si y solo si no está `asignado` (ENTREGAS-01)" por (con P-03 c) "`entregas`: una fila por alumno y tarea, creada al primer uso (entregar, comentar o calificar); `asignado` sin `fecha_entrega`, `entregado` con ella y `calificado` con `calificacion` y `fecha_calificacion` (con o sin `fecha_entrega`: se califica también a quien no entregó una tarea vencida; CALIFICACIONES-01) · `puntajes_rubrica (entrega_id, criterio_id)` PK, el desglose de una calificación con rúbrica".
- "Reglas de negocio", reemplazar la viñeta "Calificación general…" por: "Calificación (RF-36, RN-05; CALIFICACIONES-01): el maestro de la clase califica una entrega con la rúbrica (la suma de los puntos por criterio, escalada a los puntos de la tarea, redondeada a centésimas) o con una calificación directa si no hay rúbrica, con hasta 2 decimales; publicar es devolver: el alumno la ve en cuanto se guarda, y el comentario de la devolución va al hilo privado (P-01 y P-02). Recalificar vuelve a publicar. Se califica a quien no entregó solo con la fecha límite vencida (P-03). Una tarea con alguna entrega calificada no cambia sus puntos ni su rúbrica (`409 TAREA_CON_CALIFICACIONES`; P-04). El admin ve las calificaciones y el gradebook, y no califica. Calificación general: por categorías ponderadas y, dentro de cada una, por puntos (P-05); las categorías sin tareas calificadas no cuentan y su peso se reparte; las tareas sin calificar no cuentan; las entregas con retraso cuentan igual." (texto con las recomendaciones; se ajusta a las respuestas).
- "Reglas de negocio", "Alumno en riesgo": agregar "Umbrales como constantes de `core/` hasta que exista la configuración (RF-56); 'vencidas sin entregar' son las tareas de la clase con la fecha límite pasada y sin entrega `entregado` ni `calificado` del alumno."
- "Asíncrono y notificaciones", al final de "Eventos": "`CALIFICACION_PUBLICADA` lleva `{ entregaId, tareaId, claseId, version }` con un id nuevo por publicación (también al recalificar) (CALIFICACIONES-01)."

**`ARCHITECTURE.md`:**
- §7, fila `calificaciones` (al cerrar 01b): "`PUT /clases/{claseId}/tareas/{tareaId}/entregas/{alumnoId}/calificacion` (maestros de la clase; exige `version`; `409 ENTREGA_MODIFICADA` o `RUBRICA_MODIFICADA`; con comentario opcional, que va al hilo privado) · `GET /clases/{claseId}/gradebook?cursor=&limite=&cursorTareas=&limiteTareas=` (maestros y admin; alumnos × tareas por ventanas, promedio general, promedio de la clase y alumnos en riesgo) · `GET /clases/{claseId}/mis-calificaciones?estado=&cursor=&limite=` (el alumno, solo las suyas; con el desglose del cálculo) (CALIFICACIONES-01)". Fila `tareas`: agregar "El `PUT` de una tarea con entregas calificadas responde `409 TAREA_CON_CALIFICACIONES` si cambia los puntos o la rúbrica (CALIFICACIONES-01)".
- §8, fila `CALIFICACION_PUBLICADA` (al cerrar 01a): "Aviso al alumno. Datos `{ entregaId, tareaId, claseId, version }`; id nuevo por publicación; el consumidor descarta el aviso si la entrega ya no existe, si no está calificada o si su versión cambió. Cubre el comentario de devolución, que entra al hilo privado sin `COMENTARIO_CREADO` (CALIFICACIONES-01)".
- §14 (al cerrar 01a): fila `entregas`: reemplazar "`calificacion` y `fecha_calificacion` las agrega CALIFICACIONES (ENTREGAS-01a)" por "`calificacion` (`NUMERIC(7,2)`, de 0 a 1000) y `fecha_calificacion`, presentes si y solo si está `calificado` (`CHECK`); con P-03, `calificado` puede no tener `fecha_entrega` (calificar a quien no entregó una tarea vencida) (CALIFICACIONES-01)"; fila `puntajes_rubrica`: "`entrega_id` (FK `CASCADE`), `criterio_id` (FK `NO ACTION DEFERRABLE INITIALLY DEFERRED`: se comprueba al confirmar, así el borrado en cascada de una tarea o una clase calificada no depende del orden de los disparadores; Enmienda 1, M-01), `puntos` (`NUMERIC(7,2)`, de 0 a 1000) | PK `(entrega_id, criterio_id)` · índice `(criterio_id)` · el desglose de una calificación con rúbrica; se reemplaza al recalificar; una tarea calificada no reemplaza sus criterios (P-04)"; "Reglas de acceso a datos": agregar al final de la viñeta de promedios "El gradebook y 'Mis calificaciones' leen en una sola instantánea con dos `GROUP BY` (por alumno y categoría; vencidas por alumno) y aplican las reglas de `core/calificaciones/` (CALIFICACIONES-01)".

**`PRD.md`** (al cerrar 01b):
- RF-17: agregar "En la sección 'Calificaciones' de la clase; sin el promedio de la clase ni datos de otros alumnos (CALIFICACIONES-01)."
- RF-36: agregar "Publicar es devolver: el alumno ve la calificación en cuanto se guarda; el comentario va a los comentarios privados de la entrega. Se puede recalificar (CALIFICACIONES-01)." (con P-01 a y P-02 a).
- §11, "Supuestos tomados" (Enmienda 1, N-09): reemplazar la viñeta `Umbrales de "alumno en riesgo" de RN-05.` por `Umbrales de "alumno en riesgo" de RN-05: promedio menor a 70 % o 3 o más tareas vencidas sin entregar, como constantes hasta que exista la configuración (RF-56) (CALIFICACIONES-01).`
- RN-05: agregar "Dentro de una categoría, por puntos. Una tarea con entregas calificadas no cambia sus puntos ni su rúbrica. Se puede calificar a quien no entregó una tarea vencida (CALIFICACIONES-01)." (con P-03 c, P-04 a y P-05 a) y, en "Alumno en riesgo", "(constantes hasta que exista la configuración, RF-56)".

**`CLAUDE.md`** (al cerrar 01c y 01d):
- Fila `tareas`: agregar "; panel de calificación en la entrega de un alumno (el maestro califica y devuelve; el administrador lee) y la calificación en 'Tu trabajo' (CALIFICACIONES-01)".
- Fila `calificaciones`: "Mis calificaciones con el modal de cálculo, gradebook con alumnos en riesgo (la sección 'Calificaciones' de la clase); calificar entrega vive en `tareas`" y roles "Estudiante, Maestro, Administrador".
- "Ubicaciones compartidas": `lib/format.ts` suma "puntos y porcentajes (`formatearPuntos`, `formatearPorcentaje`)"; viñeta nueva "`services/calificacionesService.ts` — las claves de las calificaciones de una clase (gradebook y 'Mis calificaciones'), compartidas por `features/tareas` y `features/calificaciones`"; viñeta nueva "`components/foco/` — `useFocoAlPerderseElControl` y `claveDeFocoDeLaConsulta`: el foco va a la raíz de la vista si una recarga quita el control que lo tenía (movido de `features/tareas`, que lo reexporta)"; viñeta `components/clase/`: agregar "y 'Sin categoría' (`TEXTOS_DE_LA_CLASE.sinCategoria`)".

**`DESIGN.md`** (lo escribe el programador en su subentrega, con la marca "propuesta (CALIFICACIONES-01x)"):
- 01c: §7.24 ("Tu trabajo" con la calificación y el desglose), §7.26 (el panel en la entrega de un alumno), sección nueva **§7.27 Panel de calificación** (campos por criterio, total, comentario, "Calificar y devolver"/"Actualizar calificación", conflicto al guardar: avisa, descarta y recarga, foco al `h3`; el admin en solo lectura).
- 01d: §7.1 (la ruta `…/calificaciones` del maestro es "Gradebook": opaca; la del alumno, pantalla de trabajo con vidrio), §7.3 (control segmentado con cinco opciones: `w-1/5`, `grid-cols-5`, `translate-x-[400%]`), §7.11 (primer uso del diálogo: el modal de cálculo), §7.16 (la sección "Calificaciones"), secciones nuevas **§7.28 Gradebook** (Enmienda 1, M-03: la raíz de la vista con `data-material="opaco"`, también en el maestro, y el contenido en un `Card` que en ese contexto es opaco; tabla, columna fija, celdas con texto, ventanas de alumnos y tareas, resumen; el marco de la clase conserva su material) y **§7.29 Mis calificaciones y cálculo** (general, filtro, lista, modal con un solo botón de cierre), y §8 (Enmienda 1, M-03: "el gradebook del maestro marca su raíz con `data-material="opaco"`, sin `data-densidad` (sus controles ya son `sm` y no tiene campos); el marco de la clase sigue con vidrio").

### Textos de la interfaz (propuesta, tono de `DESIGN.md` §9; viven en `data.ts`)
- **Panel de calificación (01c):** "Calificación"; "<criterio> (de <n> puntos)"; "Calificación (de <n> puntos)"; "Suma de la rúbrica: <a> de <b> · Calificación: <c> de <n>"; "Comentario para el alumno (opcional)"; "Se publica en los comentarios privados de esta entrega."; "Calificar y devolver"; "Actualizar calificación"; "Podrás calificar cuando el alumno entregue o cuando pase la fecha límite."; "Este alumno no entregó la tarea. Si lo calificas, ya no podrá entregarla."; con P-03 (c′) (Enmienda 1), en su lugar "Podrás calificar cuando el alumno entregue o cuando se cierre la entrega." y "Este alumno no entregó la tarea y la entrega ya está cerrada."; "Escribe los puntos de este criterio."; "Escribe de 0 a <n> puntos."; "Usa hasta 2 decimales."; "Escribe la calificación."; avisos "Calificación publicada", "Calificación actualizada", "No pudimos cargar la entrega actual. Revisa tu conexión e inténtalo de nuevo."; "Sin calificar todavía.".
- **Calificación de una entrega (01c):** "Calificación: <p> de <n>"; "Calificada el <fecha larga> a las <hora>"; "<criterio>: <p> de <max>"; "No entregaste esta tarea y ya está calificada.".
- **Gradebook (01d):** "Calificaciones"; "Calificaciones por alumno y tarea"; "Alumno"; "de <n> puntos"; "Sin categoría" (de `components/clase/data.ts`); "Promedio"; "Riesgo"; "En riesgo"; "Promedio menor a 70 %"; "3 o más tareas vencidas sin entregar"; "Asignado"; "con retraso"; "<n> alumnos" ("1 alumno"); "Promedio de la clase: <p>" ("Promedio de la clase: —"); "<n> en riesgo"; "Tareas más recientes"; "Tareas más antiguas"; "Alumnos anteriores"; "Alumnos siguientes"; "Cargando las calificaciones…"; "Aún no hay alumnos en esta clase."; "Aún no hay tareas en esta clase."; "La clase cambió mientras veías las calificaciones. Vuelve a abrir Calificaciones para verlas completas.".
- **Mis calificaciones (01d):** "Mis calificaciones"; "Calificación general"; "Aún no tienes tareas calificadas que cuenten."; "Ver cálculo"; "Mostrar"; "Todas"; "Asignadas"; "Entregadas"; "Calificadas"; "Sin entregar"; "<p> de <n>"; la fecha límite con los textos de `vencimientoDe` (`lib/vencimiento.ts`: "Vence…" o "Venció el…"; Enmienda 1, N-06); "Ver más tareas"; los vacíos de §D-13.4; "Tus tareas cambiaron mientras las veías. Vuelve a abrir Calificaciones para verlas completas."; "Cargando tus calificaciones…".
- **Errores de las consultas (01d; Enmienda 2, en `MENSAJES_ERROR_CALIFICACIONES` de `features/calificaciones/data.ts`):**
  - `gradebook`: "No pudimos cargar las calificaciones. Inténtalo de nuevo."
  - `misCalificaciones`: "No pudimos cargar tus calificaciones. Inténtalo de nuevo."
  - `verMasTareas`: "No pudimos cargar más tareas. Inténtalo de nuevo."
  - Son también los textos del 5xx, del `503` y de la falta de conexión, que §D-14 llamaba "el texto genérico" sin escribirlo. Siguen `DESIGN.md` §9: qué pasó y qué hacer, sin tecnicismos. No llevan dos puntos (CAL-1D10).
- **Modal (01d):** "Cálculo de tu calificación"; "Esta clase califica por puntos: se suman los puntos de tus tareas calificadas y se dividen entre los puntos posibles."; "Obtuviste <a> de <b> puntos: <p>."; "Categoría"; "Peso"; "Peso que cuenta"; "Tu porcentaje"; "Tareas calificadas"; "Las categorías sin tareas calificadas no cuentan: su peso se reparte entre las demás."; "1 tarea sin categoría no cuenta en tu calificación general." / "<n> tareas sin categoría no cuentan en tu calificación general."; "Tu calificación general: <p>."; "Todavía no tienes tareas calificadas que cuenten en tu calificación general."; "Cerrar".
- **Sección:** "Calificaciones".

## Pasos de implementación

### Antes de empezar (orquestador)
1. Respuestas del humano a P-01 a P-05, vetos de S-01 a S-20 y autorizaciones A-1 a A-6, por escrito, en `aprobacion.md`. Si alguna respuesta no es la recomendada, el arquitecto escribe una enmienda antes de la ronda 0 de 01a (con la copia previa de `plan.md`, `AGENTS.md`).
2. Docker Desktop encendido y red de confianza (PA-01): la suite del backend necesita Testcontainers.
3. Ronda 0 de 01a del tester (C-1, C-2, C-3, C-5 y C-6; inventario; rojos esperados). El programador empieza después, con la tabla de SHA-256 de esa ronda como base de V-01.

### 01a (base `<R>` = `d998282`)
1. `shared/`: `src/entregas.ts` (§D-11), `src/calificaciones.ts` (lo de 01a), `src/index.ts`; `npm run build` de `shared`. CAL-1A08. C-5 y C-6 pasan a verde aquí; las normales del frontend de la lista cerrada de 01a se ajustan en este paso.
2. `core/calificaciones/` (`calificar.ts`, `general.ts`, `riesgo.ts`) con sus pruebas (CAL-1A02 a CAL-1A07).
3. `schema.prisma` y la migración de §D-1 (A-1): `npx prisma validate`, `format`, `migrate dev --name calificaciones` (pregunta antes), los `CHECK` a mano al final del archivo, la FK diferida de `puntajes_rubrica.criterio_id` en lugar de la que genera Prisma (Enmienda 1, M-01) y `generate`. Después, `migrate diff` sin diferencias y un `migrate dev` sin propuestas (si no, PA-06). `backend/test/ayudas-entregas.ts` (A-3). CAL-1A01, CAL-1A19 (con puntajes por SQL) y CAL-1A20, **antes de seguir** (O-2; si fallan, PA-10). C-2 pasa a verde.
4. `core/eventos/avisos-de-clase.ts` y `adapters/queue/colas.ts` (§D-8).
5. `adapters/db/entregas.ts`: la calificación en `leerMiEntrega` y `leerEntregaDeAlumno` (§D-5); `handlers/respuestas-de-entrega.ts` y el cambio de importación en `handlers/tareas/entregas.ts`. Las normales del backend de la lista cerrada de 01a. CAL-1A15.
6. `adapters/db/entregas.ts`: `calificarEntrega` y `bloquearTareaParaCalificar` (§D-3); `db/index.ts`. C-3 pasa a verde.
7. `handlers/calificaciones.ts` con el `PUT` y su registro en `app.ts`. CAL-1A09 a CAL-1A14, CAL-1A17, CAL-1A18 y CAL-1A19 con calificaciones hechas por la API. C-1 pasa a verde.
8. `adapters/db/tareas.ts`: `editarTarea` (§D-4, con N-02). CAL-1A16 y los casos (d) de CAL-1A12.
8 bis. (Enmienda 1, N-01) Antes de entregar: grep, en los archivos nuevos y cambiados de `backend/src`, de las palabras de §D-0.9 dentro de comentarios; el resumen trae el comando y su salida vacía. Lo mismo en 01b (backend) y en 01c y 01d (frontend).
9. README de `backend/src/` (`adapters/README.md`: §D-9 y los bloqueos; `handlers/README.md`: el plugin nuevo).
10. `lint`, `test` y `build` de `shared`, `backend` y `frontend`, de uno en uno (nunca dos suites a la vez); `npx prisma validate`.

### 01b (base `<K1a>`)
1. `shared/src/calificaciones.ts` (gradebook y "Mis calificaciones"), `index.ts`, `build`.
2. `adapters/db/calificaciones.ts`: `leerGradebook` y `leerMisCalificaciones` (§D-6, §D-7); `db/index.ts`. E6 de `bloqueo-usuario.integracion` (lista cerrada de 01b).
3. Los dos `GET` en `handlers/calificaciones.ts`. CAL-1B01 a CAL-1B08. C-1 y C-4 pasan a verde.
4. README; `lint`, `test` y `build` de `shared` y `backend`.

### 01c (base `<K1b>`)
1. `lib/format.ts` (CAL-1C11), `services/calificacionesService.ts`, `components/clase/data.ts` y las llaves `sinCategoria` de `features/tareas/data.ts` (CAL-1C12).
2. `features/tareas`: `types.ts`, `data.ts`, `lib.ts` y `hooks.ts` (§D-12.2 a §D-12.4).
3. `components/calificacion-de-la-entrega.tsx` y su uso en `entrega-realizada.tsx` (CAL-1C09).
4. `components/panel-de-calificacion.tsx` y `entrega-de-alumno-view.tsx` (§D-12.5 y §D-12.7). CAL-1C01 a CAL-1C08. C-7 pasa a verde.
5. Editar tarea: el código en `CODIGOS_CON_MENSAJE_DEL_SERVIDOR` (CAL-1C10). CAL-1C13.
6. `DESIGN.md` (§7.24, §7.26 y §7.27) con la marca "propuesta (CALIFICACIONES-01c)".
7. `lint`, `test` y `build` del frontend. Primer resumen con la matriz de §D-14 (01c).

### 01d (base `<K1c>`)
1. `components/foco/` y las reexportaciones de `features/tareas` (§D-13.1). CAL-1D08 y la suite completa del frontend en verde antes de seguir (si una prueba de foco de TAREAS o ENTREGAS cambia de resultado, PA-07).
2. `features/calificaciones`: `types.ts`, `data.ts`, `lib.ts` y `hooks.ts`. (Enmienda 2) Con `esErrorDeCursorDeCalificaciones`, `mensajeDeErrorCalificaciones(error, respaldo)` y los textos y campos de cursor de §D-13.2: CAL-1D10. `VentanaDelGradebook` y la firma de `claveGradebook` derivadas de `GradebookQuery` (N-30).
3. `mis-calificaciones-view.tsx`, `components/lista-de-mis-calificaciones.tsx` y `components/calculo-de-calificacion.tsx` (CAL-1D04 y CAL-1D05; Enmienda 2: CAL-1D14 a CAL-1D17).
4. `gradebook-view.tsx` (con `data-material="opaco"` en su raíz, Enmienda 1, M-03) y sus tres componentes (CAL-1D01 a CAL-1D03; Enmienda 2: CAL-1D11 a CAL-1D13). C-8 y C-12 pasan a verde.
5. `features/clases/data.ts` (sección y clases del indicador) y `app/router.tsx`. CAL-1D06 y CAL-1D07; la lista cerrada normal de 01d. C-9, C-10 y C-11 pasan a verde. CAL-1D09.
6. `DESIGN.md` (§7.1, §7.3, §7.11, §7.16, §7.28, §7.29 y §8) con la marca "propuesta (CALIFICACIONES-01d)".
7. `lint`, `test` y `build` del frontend; después, `lint` y `build` de la raíz. Primer resumen con la matriz de §D-14 (01d), incluidas las filas de `VALIDACION` fuera de contrato (Enmienda 2), cada una con el caso que la cubre.
8. Hoja de comprobación humana (abajo) para el orquestador.

### PARADAS (el agente se detiene y pregunta; resolverlo por su cuenta es una desviación)
- **PA-01:** Docker Desktop apagado o red no confiable para la suite del backend (regla de Ryuk de `AGENTS.md`).
- **PA-02:** una prueba existente (`*.ataque` o normal) falla y su causa no está en §D-R0 ni en la lista cerrada, o una de ellas necesita más que el cambio descrito.
- **PA-03:** hace falta tocar un archivo de "No se toca" o uno que el plan no lista para su subentrega.
- **PA-04:** una consulta nueva no encaja en los índices de "Acceso a datos", Prisma no expresa una del plan sin SQL crudo no previsto (el único SQL crudo nuevo es el de §D-3.1, §D-6.5, §D-6.6 y §D-7.4, etiquetado y parametrizado), o `EXPLAIN` muestra un recorrido secuencial sobre `entregas` o `tareas` en una de ellas.
- **PA-05:** el orden de bloqueo de §D-0.5 no se puede cumplir en alguna operación, o una prueba de concurrencia muestra un `deadlock`.
- **PA-06:** `prisma migrate dev` propone borrar o recrear algo que no está en §D-1, o la migración no aplica sobre la base con datos de ENTREGAS-01.
- **PA-07:** mover `useFocoAlPerderseElControl` cambia el resultado de cualquier prueba de foco existente.
- **PA-08:** el puerto de la API o de Vite está ocupado por un proceso ajeno (no se termina).
- **PA-09:** una respuesta del humano a P-01 a P-05 distinta de la recomendada llega sin su enmienda (con P-03 (c′), el diseño ya está escrito: basta que el orquestador lo registre en `aprobacion.md`).
- **PA-10:** (Enmienda 1, M-01) CAL-1A19 o CAL-1A20 fallan (el borrado en cascada de una tarea o una clase con puntajes da `500`, `23503` o deja filas), o la limpieza de las pruebas falla con puntajes. No se cambia la FK a `CASCADE` ni se toca `borrarTarea` sin decisión del humano.

### Verificaciones (en el resumen del programador, con comando y última línea)
- `npm run lint`, `npm run test` y `npm run build` de cada paquete tocado, de uno en uno; `npx prisma validate` en 01a; `npx vitest list` para los conteos.
- Cada viñeta de "Pruebas requeridas" de la subentrega con su archivo y el título exacto del caso (con su id `CAL-…`).
- En 01c y 01d, la matriz de §D-14 desde el primer resumen, contrastada con el código.
- Hermanos y estados vecinos de cada remedio (regla de `AGENTS.md`).
- Que ningún archivo de "No se toca" cambió: `git diff --stat <base> -- <rutas>` vacío.

### No se toca (base: `<R>` fuera de los paquetes; dentro, la de la subentrega)
- `AGENTS.md`, `CLAUDE.md`, `docs/ARCHITECTURE*.md`, `docs/PRD.md` (los aplica el orquestador con A-6), `.claude/agents/*`.
- `infra/`, `backend/.env.example`, `frontend/.env.example`, todos los `package.json` y `package-lock.json` (sin dependencias nuevas).
- `backend/src/middleware/`, `adapters/auth/`, `adapters/notifier/`, `adapters/storage/`, `adapters/live/` (si existe), `config/`, `workers/`, `worker.ts`, `server.ts`, `adapters/db/cliente.ts`, `adapters/db/errores.ts`, `adapters/db/referencias.ts`, `adapters/db/bloqueo-clase.ts`, `adapters/db/inscripciones.ts`, `adapters/db/publicaciones.ts`, `adapters/db/archivos.ts`, `adapters/db/temas.ts`, `adapters/db/categorias.ts`, `core/autoria.ts`, `core/concurrencia.ts`, `core/entregas/`, `core/tareas/`, `core/clases/`, `handlers/clases/`, `handlers/tareas/` (salvo la importación de `entregas.ts`, A-2), `handlers/adjuntos.ts`, `handlers/validacion.ts`, `handlers/errores.ts`, `backend/test/setup.ts`, `global-setup.ts` y las ayudas compartidas de `backend/test/` salvo `crearEntregaDePrueba` (A-3; se pueden sumar ayudas nuevas en archivos nuevos).
- `frontend/src/services/` (todos, salvo `calificacionesService.ts`, nuevo), `app/providers.tsx`, `styles/`, `components/ui/`, `components/layout/`, `components/adjuntos/`, `components/mensaje-error.tsx`, `components/cargando.tsx`, `components/estado-vacio.tsx`, `components/estado-entrega-badge.tsx`, `lib/` (salvo `lib/format.ts`, A-4), `frontend/vitest.config.ts`, `features/auth/`, `features/admin/`, `features/diagnostico/`.
- En `features/clases`, todo salvo `data.ts` (01d). En `features/tareas`, todo salvo lo que lista §D-12 y §D-13.1.
- Todas las `*.ataque` existentes, salvo las reescrituras C-n del tester por §D-R0 (A-5).

### Comprobación humana en navegador (una sola, al final de 01d; máximo 10 minutos y 7 puntos; solo lo que las pruebas no ven; ningún agente abre navegadores)
- **H-1 (maestro y alumno):** calificar una entrega con una rúbrica de tres criterios usando medio punto, con un comentario. Como alumno, ver en "Tu trabajo" la calificación con su desglose y el comentario en los comentarios privados; en "Mis calificaciones", el porcentaje y la fila "Calificado".
- **H-2 (maestro, dos pestañas):** abrir la misma entrega en dos pestañas; calificar en una y, después de escribir otros puntos, en la otra. Un solo aviso, la segunda se recarga con lo de la primera (lo escrito se descarta) y el foco queda en "Calificación".
- **H-3 (maestro y admin):** el gradebook a 360 px y en escritorio: la tabla se desplaza dentro de su superficie opaca (sin vidrio en los botones, Enmienda 1, M-03), la columna del alumno queda fija, "En riesgo" y su motivo se leen, y las ventanas de tareas y de alumnos avanzan y regresan. Abrir una celda lleva a la entrega de ese alumno. Como admin a 360 px, las cinco secciones de la clase se desplazan dentro de su panel (O-6).
- **H-4 (alumno, teclado y NVDA):** "Ver cálculo" abre el modal en una clase con categorías (una sin tareas calificadas y una tarea "Sin categoría"): se lee el título y la tabla, Tab no sale del modal, Escape lo cierra y el foco vuelve a "Ver cálculo".
- **H-5 (maestro):** editar una tarea ya calificada: cambiar el título se guarda; cambiar los puntos o un criterio da el aviso de `TAREA_CON_CALIFICACIONES` y lo escrito se conserva.
- **H-6 (maestro y alumno):** con una tarea vencida que el alumno no entregó (con (c′), Enmienda 1: una que además no acepta entregas con retraso), calificarla en cero (P-03); el gradebook muestra "0" y el alumno ve "No entregaste esta tarea y ya está calificada." y ya no puede entregar.
- **H-7 (NVDA, maestro):** en el panel de calificación, que se lean la etiqueta de cada criterio con su máximo, el error de un campo fuera de rango y la ayuda del comentario; y que la sección "Calificaciones" se lea como actual en las secciones de la clase.
- Lo que no entra en la hoja queda como "no verificada por decisión del humano, cubierta por pruebas automáticas" (`AGENTS.md`, "Trabajo visual"). Si todo sale bien, se aprueban las marcas de `DESIGN.md`.

## Enmienda 1 (revisión del manager)

Responde a "Revisión del plan — CALIFICACIONES-01" de `revision.md` (CAMBIOS REQUERIDOS, sobre el `plan.md` con SHA-256 `5208ac75…`, del que el orquestador guardó copia). Cada cambio está aplicado en su lugar con la marca "Enmienda 1". No cambian el alcance, las subentregas, las preguntas ni mis recomendaciones; la columna "Recomendación del manager" no se tocó. El plan sigue **BLOQUEADO** por P-01 a P-05.

| Hallazgo | Qué cambió | Dónde |
|---|---|---|
| **M-01** (FK `NO ACTION` y orden de las cascadas) | `puntajes_rubrica.criterio_id` pasa a `NO ACTION DEFERRABLE INITIALLY DEFERRED`, escrita a mano en la migración con el mismo nombre. Se elige sobre `CASCADE` porque conserva la defensa contra un defecto de `editarTarea` y un fallo ruidoso al revertir el backend, en lugar de borrar el desglose en silencio. Verificación de deriva de Prisma en el paso 3. Pruebas nuevas por la API del borrado confirmado del admin (CAL-1A19) y del borrado de la clase (CAL-1A20, por SQL: no hay ruta), en el mismo paso 3. PARADA nueva PA-10. R-07 reescrito y R-14 nuevo. | §D-1 (SQL, "Llaves foráneas", "Prisma y la FK diferida", `schema.prisma`); §D-3 ("Borrar una tarea calificada"); CAL-1A01, CAL-1A19, CAL-1A20; R-07, R-14; `ARCHITECTURE.md` §14 en "Documentos"; pasos 3 y 7 de 01a; PA-10 |
| **M-02** (puntos de una tarea sin rúbrica) | El cuerpo lleva `puntosDeLaTarea` (los de apertura). `decidirCalificacion` los compara con la fila bloqueada antes de todo: `409 RUBRICA_MODIFICADA`, con su mensaje de siempre. No se usa `tareas.version`: mover de tema la sube. El formulario toma puntos y rúbrica de apertura y los muestra en sus etiquetas. | §D-0.4; §D-2.1 (paso 0, `puntosVistos`); §D-3 pasos 7 y carreras (d); §D-10; §D-11 (`calificarEntregaSchema`); §D-12.2 y §D-12.5; §D-14 (fila nueva); S-12; CAL-1A03, CAL-1A08, CAL-1A12 d, CAL-1A14, CAL-1C01, CAL-1C05 |
| **M-03** (vidrio en el gradebook del maestro) | La raíz de `gradebook-view.tsx` lleva `data-material="opaco"`, sin `data-densidad` (controles `sm`, sin campos). El contenido va en un `Card`, que en ese contexto es opaco, y los `outline` pasan a borde de tinta. No hay fondos a mano, salvo el `--surface` de la columna fija. El marco de la clase conserva su material. C-12 nuevo (V-07 de `clases-r1.ataque`). `contexto-r1.ataque` no cambia. CAL-1D09 exige el atributo en ese único lugar; CAL-1D01 comprueba que los controles cuelgan de él. | §D-13.3, §D-13.7; §D-R0 (C-12 y la fila de `contexto-r1`); rojos esperados de 01d; CAL-1D01, CAL-1D09; `DESIGN.md` §7.28 y §8 en "Documentos"; paso 4 de 01d; H-3 |
| N-01 (listas estáticas sobre texto crudo) | Lista de palabras que no se escriben ni en comentarios, para backend y frontend. Un grep en el resumen. | §D-0.9; §D-R0 (fila de diseño); CAL-1A18, CAL-1C13; paso 8 bis de 01a |
| N-02 (ids de una rúbrica idéntica) | Una rúbrica idéntica no se reemplaza nunca, con o sin calificaciones. | §D-2.1 (`exigirRubricaCongelada`); §D-4.2 y §D-4.3; §D-3 carreras (d); CAL-1A07, CAL-1A12 d |
| N-03 (versión al pasar de la frase al formulario) | `FormularioDeCalificacion`, en el mismo archivo, toma versión, puntos y rúbrica al montarse él, no el panel. Hay una fila nueva en la matriz. | §D-12.5; §D-14; CAL-1C14 |
| N-04 (foco tras `ENTREGA_NO_CALIFICABLE`) | Sigue el camino de los otros dos `409`: recarga, reinicio y foco al `h3`. | §D-12.2, §D-12.4, §D-12.7; §D-14; S-12; CAL-1C06 |
| N-05 (matriz incompleta) | En el gradebook entran las columnas "en vuelo a la vez" y "con la vista desmontada". Hay filas nuevas para la edición de una tarea calificada (`TAREA_CON_CALIFICACIONES`, su vecino `TAREA_MODIFICADA` y los dos seguidos) y para "Ver cálculo" durante una recarga o con "Ver más tareas" en vuelo. | §D-14 |
| N-06 ("Venció el") | La fecha de "Mis calificaciones" usa el texto de `vencimientoDe`. | §D-13.4; textos; CAL-1D04 |
| N-07 (importaciones de `shared/src/calificaciones.ts`) | También importa de `tareas.ts`; no hay ciclo. | §D-11 |
| N-08 ("sin escribir nada antes del paso 8") | El texto dice que la fila perezosa del paso 4 se revierte si algo lanza. | §D-3 |
| N-09 (PRD §11) | Texto propuesto para el supuesto de los umbrales. | "Documentos a actualizar", `PRD.md` |
| N-10 (cierre del diálogo) | Queda un solo control de cierre (`showCloseButton={false}` más "Cerrar"), dentro del portal. | §D-13.5; CAL-1D05 |
| P-03 (c′) del manager | El diseño queda escrito para (c) y (c′). Mi recomendación sigue siendo (c), en su celda. | Nota después de la tabla de preguntas; §D-2.1, §D-3 paso 1, §D-10, §D-12.2, §D-12.5; textos; R-02; CAL-1A04, CAL-1A13, CAL-1C08; H-6 |
| "Para el humano" de la revisión | Tabla nueva con S-04/R-13, S-15, A-4/R-05, S-01 y H-5, cada una con mi recomendación. En A-4/R-05 coincido con el manager: dentro de 01d. | Después de la tabla de preguntas; R-05 |
| Detalle | Los rojos esperados de 01d apuntaban a los pasos "4 y 6"; ahora dicen "4 y 5". | §D-R0, "Rojos esperados" |

## Enmienda 2 (regla de `VALIDACION` fuera de contrato, 01d)

**Origen.** Es la regla que el humano aprobó el 2026-10-13. Está en `AGENTS.md`, "Reglas del equipo", y en `.claude/agents/arquitecto.md`, "Límites" y la línea "## Pruebas requeridas" del esqueleto. Todo plan con un formulario o panel nuevo que envía datos inventaría, como casos requeridos, los `400 VALIDACION` que el cliente no espera: un campo no pintable, un mensaje vacío o de solo espacios, y un prefijo con ruta. Motivo: T-02, T-04 y T-05 de 01c. No cambia el alcance, las subentregas, las respuestas del humano (P-01 a P-05, S-01, A-4/R-05) ni el carril (**sensible**). Cada cambio está en su lugar con la marca "Enmienda 2".

**1. Inventario de 01d**

| Control | Qué envía | ¿Formulario según la regla? | En contrato | Fuera de contrato: respuesta de la interfaz |
|---|---|---|---|---|
| Ventanas del gradebook (los cuatro botones, y la primera carga) | `cursor`, `limite` (25), `cursorTareas`, `limiteTareas` (20) | No: no hay texto escrito ni mutación. Sí es un control que envía parámetros y recibe `400`, así que aplica por analogía (S-21) | `cursor:` y `cursorTareas:` (§D-6.1 y §D-6.2): el texto fijo "La clase cambió…". `claseId:`: "No tienes acceso a esta clase." | **Campo no pintable** (`limite:`, `limiteTareas:`, `estado:` u otro), **mensaje vacío o de espacios**, **prefijo con ruta** (`cursorTareas.0:`): un solo `MensajeError` con el genérico del gradebook en lugar de la tabla, sin aviso, foco a la raíz. Con datos, en una recarga de fondo: nada (S-19) |
| Filtro "Mostrar" (`NativeSelect`) | `estado` (valores cerrados de `OPCIONES_DEL_FILTRO`), `limite` (20) | No (valores cerrados, sin texto). Aplica por analogía; nunca un `ErrorDeCampo`, porque no hay nada que corregir | `claseId:` | `estado:`, `limite:`, mensaje vacío o ruta (`estado.0:`): un solo `MensajeError` con el genérico de "Mis calificaciones" en lugar de la lista. El selector conserva la opción y el foco. Sin aviso |
| "Ver más tareas" | `cursor`, `limite`, `estado` | No; aplica por analogía | `cursor:`: el texto fijo "Tus tareas cambiaron…" en la lista, sin aviso | Un solo aviso, "No pudimos cargar más tareas. Inténtalo de nuevo.". Las filas se conservan y el botón sale de la espera con el foco. Un aviso por intento; ninguno con la vista desmontada |
| Modal "Cálculo de calificación" y "Ver cálculo" | Nada | — | — | **No aplica:** no hacen peticiones (leen `general` de la caché) |

**Cómo se distingue el cursor de lo fuera de contrato (§D-13.2):**
- `esErrorDeCursorDeCalificaciones(error, campos)` decide por el prefijo exacto que reconoce `campoDeErrorDeApi` de `lib/errores-de-api.ts` (`^[a-zA-Z_]+:`): `cursor` en las dos vistas, más `cursorTareas` en el gradebook. El mensaje del servidor no cuenta: `cursor:` sin mensaje también es cursor, y su texto es fijo y nunca vacío.
- Todo lo demás pasa por `mensajeDeErrorCalificaciones(error, respaldo)`: `sinAcceso` para `SIN_ACCESO_A_LA_CLASE` y `claseId:`; el genérico del lugar para todo lo demás. Nunca devuelve el mensaje del servidor (S-22: en una consulta, los mensajes de forma de zod llegan en inglés).
- **Hallazgo de diseño que esta enmienda corrige:** §D-13 y §D-14 preveían el texto del cursor con `esErrorDeCursor`, que solo reconoce `cursor`. Con él, "cursorTareas: no es válido" habría caído en el genérico. CAL-1D12 lo fija.
- **`lib/errores-de-api.ts` no se toca** ("No se toca"): solo se importa `campoDeErrorDeApi`, ya exportada. Todo lo nuevo vive en `features/calificaciones`. Sus hermanos fuera del módulo van al `chore` (R-15).

**2. Casos requeridos nuevos** (en "Pruebas requeridas → 01d"):

| Id | Qué cubre |
|---|---|
| CAL-1D10 | Unitarias de las dos funciones: la frontera del cursor, las tres clases, `claseId`, y que nunca salga vacío ni con prefijo |
| CAL-1D11 | Las tres clases en la primera carga del gradebook |
| CAL-1D12 | Las tres clases en una ventana nueva, más los vecinos del cursor (`cursorTareas:`, con mensaje y sin él) |
| CAL-1D13 | Vecinos del gradebook: dos veces seguidas, recarga de fondo con datos, desmontada y vuelta a montar, admin |
| CAL-1D14 | Las tres clases en la primera carga y en un filtro nuevo |
| CAL-1D15 | Vecinos del filtro: dos filtros seguidos, vuelta a un `200`, desmontada |
| CAL-1D16 | Las tres clases en "Ver más tareas", más el vecino `cursor:` sin mensaje |
| CAL-1D17 | Vecinos de "Ver más tareas": un aviso por intento, doble clic, fallo y luego `200`, desmontada sin aviso tampoco al volver a montar |

El modal no lleva casos: no envía nada. CAL-1D09 suma tres reglas estáticas: sin `.message`, sin `esErrorDeCursor(` y sin `ErrorDeCampo` en el código del módulo.

**3. Matriz de §D-14.** Al gradebook se suman cuatro filas: fuera de contrato en la primera carga o en una ventana nueva; el cursor con cualquier mensaje; el mismo `400` otra vez; la recarga de fondo con datos. A "Mis calificaciones" se suma una tabla nueva con las columnas "En vuelo a la vez" y "Con la vista desmontada": primera carga o filtro nuevo, filtro que se recupera, "Ver más tareas" (una vez y dos veces), el cursor, la vista desmontada, la recarga de fondo y el modal (no aplica).

**4. Puntos de ataque (01d):** viñeta nueva con las tres clases por disparador, la frontera del cursor, `claseId:` sin mensaje y los vecinos.

**5. Textos nuevos:** `MENSAJES_ERROR_CALIFICACIONES.gradebook`, `.misCalificaciones` y `.verMasTareas`, en "Textos de la interfaz". También cubren el "texto genérico" del 5xx, que §D-14 no escribía.

**6. 01c, para constancia:** la regla ya se aplicó a 01c por correcciones: T-02 → CAL-1C06b, T-04 → CAL-1C06e y T-05 → CAL-1C06f (esta, en curso en la ronda 4). Lo resuelven `erroresDeCalificacionDeApi`, `mensajeDelCampoDeCalificacion` y `mensajeDelAvisoDeCalificar` de `features/tareas/lib.ts`. Las pruebas requeridas de 01c no cambian.

**7. Lista cerrada y §D-R0:** sin cambios (casos nuevos en archivos nuevos; ningún `enEspera=`, `data-material` ni valor arbitrario nuevo; ver la viñeta de la Enmienda 2 en la lista cerrada de 01d).

**8. Carril:** sigue **sensible**. La enmienda no toca `middleware/`, migraciones ni datos.

**Preguntas para el humano (no bloquean; el diseño está escrito con la recomendación):**
- **S-21:** ¿basta con un `MensajeError` en lugar de la tabla o de la lista, sin aviso, cuando no hay filas a la vista? Recomendación: sí, es el reparto que §D-14 ya usa para un 5xx.
- **S-22:** ¿se muestra un texto fijo en lugar del mensaje del servidor sin su prefijo? Recomendación: sí, porque los mensajes de forma de zod llegan en inglés.
- **R-15:** ¿los hermanos fuera de 01d van al `chore`? Recomendación: sí.

**Resumen de la Enmienda 2**
1. Cabecera: la línea de la Enmienda 2.
2. Suposiciones: S-21 (qué es el "mensaje legible" en una consulta) y S-22 (nunca el mensaje del servidor).
3. §D-13.2: `VentanaDelGradebook` y `claveGradebook` se derivan de `GradebookQuery` (N-30); textos, campos de cursor y dos funciones (`esErrorDeCursorDeCalificaciones`, `mensajeDeErrorCalificaciones(error, respaldo)`).
4. §D-13.3 y §D-13.4: el orden de decisión del error en el gradebook, en el filtro y en "Ver más tareas".
5. §D-14: cuatro filas en el gradebook y una tabla nueva para "Mis calificaciones".
6. Pruebas 01d: CAL-1D09 ampliado y CAL-1D10 a CAL-1D17 nuevos.
7. Lista cerrada de 01d y §D-R0: sin cambios, con la constancia del grep.
8. Puntos de ataque de 01d: una viñeta nueva.
9. Riesgos: R-15 (hermanos al `chore`). Textos: tres mensajes de error.
10. Pasos 2, 3, 4 y 7 de 01d: los casos nuevos y la matriz ampliada. Carril sensible, sin cambio.
