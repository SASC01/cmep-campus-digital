# Revisión del Manager — CLASES-03 · reorganización de la clase — plan
Veredicto: CAMBIOS REQUERIDOS
Verificación propia: lint, test y build no aplican en modo plan. El código no cambió: `git status` solo muestra `docs/trabajo/CLASES-03-reorganizacion-de-la-clase/`, y la rama está en `689c636`. El SHA-256 de `plan.md` es `3eb8364675ef5e65fb3cdc90f33c3cacc62dcb0194a959b71d1941dcfb4e8449` (886 líneas) y coincide con `aprobacion.md`.

Fecha: 2026-10-27. Revisé el plan contra PRD RF-60 a RF-64 y RN-07 a RN-09, ESSENTIALS, `AGENTS.md`, `CLAUDE.md`, `DESIGN.md` (§7.1 a §7.3, §7.16 a §7.18, §7.22, §9 a §11), `docs/ESTADO.md` (§2b y §3) y el código en `689c636`. Hice greps propios en los dos paquetes y leí el comportamiento de TanStack Query 5.103.2 en `node_modules`.

El plan es sólido. Cubre los cinco RF sin agregar alcance. Respeta P-01 a P-07 y la cadena de middleware. Ninguna respuesta incluye estado de pago ni correo. Todas las consultas nuevas usan un índice y las listas van paginadas. Las migraciones son compatibles hacia atrás. Las cinco fallas que bloquean salen de cotejar el plan con el código: dos remedios no se pueden aplicar como están escritos, dos inventarios de pruebas están incompletos y falta inventariar una frase de recuperación. Las cinco se corrigen con poco trabajo en una enmienda.

## Problemas que bloquean

### M-01 — El remedio de O-16 (§D-11) no sirve, tal como está escrito, para crear y editar clase
Dónde: §D-11 y DH-07 ("cada gancho … en su `onError` calla un error de campo solo si el formulario sigue montado; si no, lo avisa"); CL3-C14.
Por qué importa: `useCrearClase` y `useEditarClase` (`features/clases/hooks.ts:157-184`) no tienen `onError`. Todos sus errores los maneja `formulario-clase.tsx:68-74` y `:97`/`:112` con los callbacks de `mutate`, y esos callbacks no corren si el formulario se desmonta. Con la vista desmontada se pierde **cualquier** error (5xx, red, `VALIDACION`), no solo el de un campo pintado. La frase "calla un error de campo" supone un `onError` del gancho que hoy avisa lo demás: así funcionan comentario, tema y publicación, pero clase no. El programador tendría que inventar el remedio, o es PARADA ("que un remedio del plan no aplique tal como está escrito").
Qué se espera: §D-11 describe la variante de los dos ganchos de clase. Con el formulario desmontado, el gancho avisa una vez cualquier error con `mensajeDeErrorClases`. Con el formulario montado no avisa nada, porque `alFallar` del formulario sigue siendo el único que avisa. El plan dice además qué pasa con un éxito con el formulario desmontado (hoy no hay aviso ni navegación): lo deja así con su motivo o lo avisa. CL3-C14 suma el caso "desmontado + 5xx" para crear y editar clase, y la matriz de 03c lo refleja.

### M-02 — `moverATema` con `actor.rol` rompe una `*.ataque` que el inventario no nombra
Dónde: §D-2 (`puedeMoverRecurso(rolDelActor: Rol, …)`, `bloqueEfectivo(bloque, rolDelAutor: Rol)`), §D-3.9 y §D-3.5 ("`false` para la relación `estudiante`"); §D-R0, C-5.
Por qué importa: `backend/test/temas-01a-r3.ataque.test.ts:470-481` prohíbe `\.rol\b`, `relacion ===` y comparaciones de rol en `adapters/db/temas.ts`, que figura en su lista de archivos. Con la firma del plan, `moverATema` (en `adapters/db/temas.ts`) escribe `actor.rol` y `autor.rol`, y la prueba se pone roja. C-5 cita las líneas 440-460 como "Confirma" porque las lee como un inventario de archivos, pero la regla que se rompe está en la 478. Esa protección existe para que la decisión de rol viva entera en `core/` (regla 2).
Qué se espera: las funciones de `core/recursos.ts` reciben objetos, no el rol suelto: `puedeMoverRecurso(actor: ParticipanteDeAutoria, bloque)` y `bloqueEfectivo(bloque, autor: ParticipanteDeAutoria)`. Así `adapters/db/temas.ts`, `publicaciones.ts` y `recursos.ts` y los handlers nunca escriben `.rol`, y la prueba sigue como está. Para un estudiante, `puedeMoverRecurso` devuelve `false` por sí sola, y "`false` para la relación `estudiante`" se quita de §D-3.5. Si el arquitecto prefiere conservar la firma con el rol, C-5 nombra la línea 478 y su cambio mínimo. Esa alternativa debilita una protección y no la recomiendo.

### M-03 — `crearPublicacion` gana `bloque` sin decir si es obligatorio, y cinco archivos de prueba la llaman directo
Dónde: §D-3.1 ("el handler pasa `bloque` … a `crearPublicacion`, que lo escribe"); "Pruebas existentes que el programador puede cambiar" de 03a; §D-R0.
Por qué importa: la regla del 2026-10-12 pide inventariar por grep las llamadas directas a cada función cuya firma cambia. `crearPublicacion(` se llama en `archivos.integracion.test.ts:452`, `muro-admin.integracion.test.ts:246` y `muro.integracion.test.ts:260` (normales), y en `lecturas-fx-r2.ataque.test.ts:684` y `muro-c-r1.ataque.test.ts:472` (ataque). Si `bloque` es obligatorio, las cinco fallan en `tsc` (lint) y ninguna está en la lista cerrada ni en §D-R0. Si es opcional, el plan no lo dice y "el código siempre lo escribe" queda sin garantía.
Qué se espera: el plan fija la firma. Mi recomendación es `bloque?: Bloque | null` con `null` por defecto: es coherente con DH-02 (a), no cambia ninguna prueba, y CL3-A05 comprueba que la única llamada de producción (`muro.ts`) lo pasa siempre. La otra opción es dejarlo obligatorio y sumar los tres normales a la lista cerrada de 03a y los dos `*.ataque` a §D-R0 y a "Rojos esperados".

### M-04 — `tarjeta-de-tarea.test.tsx` falta en la lista cerrada de 03c
Dónde: "Pruebas existentes que el programador puede cambiar", 03c, fila de `muro-view.test.tsx` ("quitar las aserciones de 'Crear tarea' en el muro"); S-09.
Por qué importa: la única prueba normal que aserta "Crear tarea" en `MuroView` es `frontend/src/features/clases/tarjeta-de-tarea.test.tsx:142-156` (PR-1D06, "el maestro y el admin ven «Crear tarea» como enlace…"). `muro-view.test.tsx` no lo aserta (grep: 0). Con S-09 esa prueba se pone roja fuera de la lista: es PARADA segura en 03c.
Qué se espera: la lista cerrada de 03c suma `features/clases/tarjeta-de-tarea.test.tsx`, con el permiso de cambiar el caso PR-1D06 para que afirme que "Crear tarea" ya no está en Avisos en ninguna perspectiva. La fila de `muro-view.test.tsx` deja de hablar de "Crear tarea".

### M-05 — "Algo salió mal. Inténtalo de nuevo." en la primera carga de las consultas nuevas no tiene sus caminos
Dónde: §D-10 (R1 a R8), §D-14 (matriz de 03d), pruebas de 03d y 03e.
Por qué importa: la regla del 2026-10-26 pide, por cada frase de recuperación en un lugar nuevo, un caso por camino. En la primera carga fallida (5xx o red), `mensajeDeErrorDeLista` y `mensajeDeErrorDeConsulta` muestran el genérico del módulo ("Algo salió mal. Inténtalo de nuevo.", `features/clases/data.ts:235`) o el texto de conexión, en un `MensajeError` sin botón. Eso pasa en cinco lugares nuevos: un bloque de Recursos (su lista de temas por sección), la sección de un tema de Recursos, la lista de Dudas, las respuestas de una duda y la primera carga de "Editar recurso". R7 cubre solo las acciones. La matriz de 03d no tiene la fila "primera carga de un bloque o de una sección, 5xx o red"; la de 03e sí la tiene, pero sin casos de caminos. CALIFICACIONES-01d tuvo sus tres rondas por esta misma clase de omisión.
Qué se espera: una fila R9 en §D-10 para esos cinco lugares, con sus caminos: (a) pulsar la sección estando en ella (el gancho compartido vuelve a pedir lo que está en error); (b) ir a otra sección y regresar antes del `staleTime`; (c) atrás y adelante del historial; para las respuestas, además "Ocultar respuestas" / "Ver respuestas"; para "Editar recurso", "Volver a Recursos" y volver a entrar. En cada camino sale la petición y el texto desaparece. Cada camino lleva su caso en CL3-D23, CL3-E09 y CL3-E10 (o en casos nuevos `CL3-D27` y `CL3-E13`), con el router real y el `QueryClient` de `app/providers.tsx`. La matriz de 03d suma la fila de primera carga 5xx o red, para el bloque y para la sección.

## Problemas que no bloquean

- **N-01 · Textos de documentos (A-01 a A-04, DH-10).**
  - (a) A-01 y A-02 reemplazan viñetas marcadas "propuesta (DOCS-04)" por "propuesta (CLASES-03c)", y se pierde el origen. `DESIGN.md` §11 y la decisión del humano del 2026-09-27 piden no borrar la marca. Que el texto diga "(propuesta (DOCS-04); fijada en propuesta (CLASES-03c))" o equivalente.
  - (b) A-02 dice "Y en 'Actividades de aprendizaje', 'Recursos' y 'Dudas', la remisión …", sin decir si la remisión reemplaza la viñeta o se agrega. Si se agrega, en §7.16 quedan "cada uno un panel (`Card`)" (Recursos) y "su botón (`outline` …)" (Dudas), que contradicen R-08 (b) y (c) y las nuevas §7.30 y §7.31. Esas dos viñetas deben **reemplazarse** por su remisión.
  - (c) Falta actualizar la frase de §7.17 "Dejará de ver la clase. Lo que publicó se queda en el muro.", que C-18 cambia a "…en la clase.".
  - (d) La viñeta "Perspectivas" de §7.16 sigue nombrando "Muro y Personas / Muro y Alumnos / Muro, Alumnos y Maestros". Conviene una línea que remita a "Secciones".
  - Lo corrige la misma enmienda; el orquestador no debe aplicar los textos tal como están.
- **N-02 · Partir 03c (punto 7).** 03c junta unos 42 archivos `*.ataque` candidatos (C-7 a C-20, unos 14 de ellos "confirma"), 9 grupos de normales y 17 pruebas requeridas que mezclan tres mecanismos con riesgo propio: el indicador medido, las frases R1 y R2 con el gancho compartido, y O-16 más las guardas de CHORE-04. Recomiendo partirla:
  - 03c1, navegación y nombres: las seis secciones con sus nombres, el indicador (DH-03) y N-47, rutas y redirecciones (DH-09), Personas (§D-7.7), el gancho compartido (DH-06) y todos los textos de §D-13 de 03c, incluidas las frases R1 y R2. Ronda 0: C-7 a C-11, C-13 a C-20.
  - 03c2, contenido: los filtros `?tipo=anuncio` y `?seccion=actividades`, los conteos por sección, `useOrdenarTemas` con espera, los caminos de R1 y R2, y O-16 con las guardas de clase, comentario y tema (CL3-C08 a C-15). Su ronda 0 queda casi solo en los dobles de URL.
  - El costo es un commit más. Ningún archivo `*.ataque` se toca dos veces si todos los textos van en 03c1. Lo decide el humano. Si se queda en una sola subentrega, no bloquea.
- **N-03 · Filtro por tema en `listarRecursos` (§D-3.5).** "`tema_id IS NOT DISTINCT FROM :tema`" no usa el índice como condición: Postgres lo filtra y ordena aparte. Que el plan diga `tema_id = :tema` o `tema_id IS NULL` (Prisma `temaId: valor | null`), como `listarTrabajo` (`adapters/db/tareas.ts:615-620`), para que el orden salga del índice `(clase_id, bloque, tema_id, creado_en DESC, id DESC)`.
- **N-04 · El mecanismo del camino (b) de §D-10 está mal nombrado.** No es `retryOnMount`, que solo actúa sin datos (`queryObserver.js:431-436`). Es que TanStack Query 5.103.2 marca la consulta `isInvalidated: true` al fallar (`query.js:450-462`), así que al volver a montarse está vieja aunque el `staleTime` no haya vencido. El comportamiento prometido se cumple. Hay que corregir el texto para que nadie dependa de `retryOnMount`, y fijar la versión como supuesto del caso. Las pruebas de hoy del muro (`muro-recuperar-c-r3`) usan un `QueryClient` sin `staleTime`; los casos nuevos usan el de `providers.tsx`, como ya exige "Reglas comunes".
- **N-05 · `useCrearPublicacion` en §D-11 aparece en 03c, pero su prueba (CL3-D22) está en 03d.** Dejarlo en una sola subentrega. Recomiendo 03d, que rehace ese formulario.
- **N-06 · CL3-A01 ("datos sembrados antes de aplicarla").** Nombrar el patrón existente, el de CAL-1A01 (`calificaciones-migracion.integracion.test.ts:460-508`): un esquema aparte, las migraciones hasta la anterior, sembrar y aplicar la de 03a. Así el programador no tiene que adivinarlo.
- **N-07 · DH-03 y el atributo `style`.** El indicador medido es el primer `style` de `features/`; hoy solo lo usa `components/ui/sonner.tsx`. A-01 debe decir que las dos variables medidas (`--indicador-x` y `--indicador-ancho`) son la única excepción a "valores sueltos" y por qué: son una medida de la página, no un valor de diseño. Sin eso, la excepción quedaría como precedente para usar `style` en otros lados.
- **N-08 · `useTemas` (el total) en "Actividades".** Solo lo necesita la frase de borrar un tema, y esa frase solo la ven el maestro y el admin. Que §D-7.6 diga que el estudiante no lo pide (`enabled` por perspectiva), para no sumar una petición sin uso. Cambia los conteos de `GET …/temas` en `trabajo-view.test.tsx`, que ya está en la lista cerrada.
- **N-09 · Despliegue (R-09).** El frontend nuevo necesita el backend nuevo: las rutas `…/recursos` y `…/dudas` no existen antes. Además, `paginacionSchema` es `z.object` no estricto, así que un backend viejo ignora `?tipo=anuncio` y Avisos mostraría la lista mezclada. Hay que desplegar el backend antes que el frontend. Va como nota para DEPLOY en A-13, no como "se despliegan por separado sin acción".

## Detalles menores
- En "Autorización", `GET …/recursos`, `GET …/recursos/:recursoId` y `PUT …/recursos/:recursoId` tienen su `roles · pertenencia` en prosa. Una tabla como la de dudas (§D-5) ayudaría al tester.
- El texto `TEXTOS_RESPUESTAS.borrar` dice "Borrar", sin objeto (§9: verbo y objeto). Es el mismo patrón de los comentarios de hoy, así que se acepta por coherencia.
- En §D-15, en "Recurso, crear/editar", `version:` y `tipo:` no son "campos que el otro modo pinta", porque los dos modos pintan los mismos campos. Siguen valiendo como campos no pintados. Basta con corregir la etiqueta.

## Postura sobre cada DH
| DH | Postura | Nota |
|---|---|---|
| DH-01 carril | **Confirmo sensible** para todo el encargo | `AGENTS.md` pone las migraciones en el carril sensible, y 03a y 03b no se pueden hacer sin migración (verificado: RN-09, la `version` de la edición concurrente y la tabla `dudas`). La única diferencia práctica es la aprobación explícita y por escrito, que el humano da de todos modos. 03c a 03e no tocan esquema, `middleware/` ni `adapters/auth`. El programador ya está en `opus`, así que el carril no cambia el modelo. |
| DH-02 compatibilidad | **Aprobar**, con M-03 | Verificado: `autor_id` es `NOT NULL` con `RESTRICT`, así que el reparto cubre todo material, y el `UPDATE` crudo no toca `actualizado_en`. Las columnas nuevas son nulas o con valor por defecto. El `CHECK` de comentarios con el mismo nombre acepta lo de antes (las pruebas solo buscan su nombre). `paginacionSchema` y `temasQuerySchema` no son estrictos. Ninguna prueba compara filas completas de `publicaciones` contra un literal. Volver atrás el backend es seguro: `bloqueEfectivo` resuelve los nulos. No contradice ESSENTIALS. |
| DH-03 indicador medido | **Aprobar**, con N-07 | Es la propuesta escrita en `DESIGN.md` §7.3 (DOCS-04). Tailwind 4.3.3 soporta `-(--var)`, que ya se usa en `button-variants.ts` y `barra-superior.tsx`. C-7 es correcto y ninguna prueba estática prohíbe `style`. La alternativa (c) cambia la regla del control para todos sus usos, y la (b) desplaza el grupo incluso en escritorio. |
| DH-04 temas en Recursos | **Aprobar** | Cumple P-05 sin `Card` dentro de `Card`. |
| DH-05 borrar duda con sus respuestas | **Aprobar** | Es RN-07 ("su hilo, de quien sea"). El humano debe saber que un alumno, al borrar su duda, se lleva la respuesta del maestro. |
| DH-06 gancho a `components/seccion/` | **Aprobar** | Es la regla 5, y tiene precedente: `features/tareas/hooks.ts:75` reexporta de `components/foco`. CAL-1D09 (archivos del módulo) y `refactor-01c-r1:417` no cambian. |
| DH-07 `useMontado` en diez ganchos | **Aprobar con M-01** | `docs/ESTADO.md` §3 manda O-16 a este encargo con estos mismos hermanos. Los de clase necesitan su variante. |
| DH-08 código sin uso | **Aprobar** | Borrarlo ahora suma ataques y pide permiso para borrar archivos sin ganar nada. |
| DH-09 rutas viejas | **Aprobar** | Es el menor riesgo. `features/tareas` no cambia. |
| DH-10 documentos | **Aprobar con N-01** | El orquestador aplica los textos ya corregidos. |
| DH-11 pruebas que cambian | **Aprobar con M-02, M-03 y M-04** | Fuera de esas tres fallas, mis greps coinciden con §D-R0. Revisé los dobles por URL: casi todos comparan `pathname` o `startsWith`, y los que comparan `/temas` exacto (`trabajo-view.test`, `router.test`) están en la lista o no montan "Actividades". |
| DH-12 textos | **Aprobar** | Tono de §9 sin palabras prohibidas. Hay que considerar R-08 (b): "Publicar duda" queda `primary`, contra lo que proponía DOCS-04 (`outline`). |
| DH-13 dependencias | Sin observación | — |

## Desacuerdos arbitrados
Ninguno en esta ronda.

## Documentos a actualizar
- Los de A-01 a A-13, con las correcciones de N-01. Además, `DESIGN.md` §7.17 ("se queda en la clase") en 03c, y en A-13 la nota de orden de despliegue de N-09.

## Para el humano
1. **Carril:** sensible (DH-01), aunque se pidió "normal". El recorrido es el mismo; solo agrega tu aprobación por escrito del plan.
2. **03c en una o en dos subentregas** (N-02). Recomiendo partirla. Si se queda entera, no bloquea.
3. **Recursos huérfanos (S-02 y R-12):** con el plan, nadie edita el recurso del docente de un maestro que ya no da la clase, y solo el admin lo borra. Con las tareas, en cambio, otro maestro de la clase sí las edita (P-04 de TAREAS-01). El PRD no lo pide para los recursos. Si el colegio quiere el mismo trato que las tareas, es una decisión nueva.
4. **R-08:** tres cambios a la propuesta DOCS-04 de §7.16: "Editar recurso" deja activa la sección "Recursos", "Publicar duda" es `primary`, y en Recursos cada bloque es una `section` con sus temas como paneles.
5. **DH-05:** un alumno que borra su duda se lleva las respuestas de su maestro.

## Revisión de la Enmienda 1 — CLASES-03
Veredicto: APROBADO CON OBSERVACIONES
Verificación propia: lint, test y build no aplican en modo plan. El código no cambió: `git status` solo muestra la carpeta del encargo.

### Integridad y cotejo
- SHA-256 de `plan.md`: `c9efaac17f4e3873764997f48714af63459ff945ce6ff08251822aa31e1a1518` (966 líneas), y de la copia previa (scratchpad, `copias-plan/plan-clases03-v1-3eb83646.md`): `3eb8364675ef5e65fb3cdc90f33c3cacc62dcb0194a959b71d1941dcfb4e8449`. Los dos coinciden con lo declarado.
- `git diff --no-index` completo de la copia contra `plan.md`: 50 hunks, +146 y −66 líneas. Cada hunk corresponde a un id de la Enmienda 1 y ninguno trae un cambio sin id:

| Hunks | Id |
|---|---|
| 1, 7, 18, 23, 29, 30, 34, 44 a 47 | N-02 / DH-14 (reparto de 03c en 03c1 y 03c2, C-25, rojos esperados, pasos) |
| 2, 5, 6, 43 | DH-14, DH-15 y DH-16 nuevas (S-02 remite a DH-15) |
| 3, 40 (R-09), 42 | N-09 |
| 4 | C-25 en DH-11 (N-02) |
| 8 a 12, 15 a 17 | M-02 (§D-2, §D-3.7 a §D-3.9) |
| 13, 33 | M-03 (§D-3.1, CL3-A05) |
| 14 | N-03 y M-02 (§D-3.5) |
| 19 | N-08 (§D-7.6) |
| 20 | N-04 (R1 b) |
| 21, 25, 26, 37, 38, 48, 49 | M-05 (R9, matrices de 03d y 03e, CL3-D27, CL3-E13, pasos) |
| 22, 24 | M-01 (variante de §D-11 y su tabla en la matriz de 03c) y N-05 |
| 27, 31 | Detalles menores (§D-15 y tabla de `roles` · `pertenencia`) |
| 28 | M-02 y M-03 en §D-R0 (líneas 474-481 de `temas-01a-r3` y las cinco llamadas a `crearPublicacion`, como "Diseño: no cambia") |
| 32 | N-06 |
| 35, 36 | N-02 (CL3-C08 separado en C08 y C18; CL3-C13 por `pathname`), N-08 (CL3-C09) y M-01 (CL3-C14) |
| 39 | M-04 y N-02 (listas cerradas de 03c1 y 03c2) y N-08 |
| 40 (R-08) | DH-16 |
| 41 | N-01 y N-07 (A-01 a A-06 y la regla de marcas) |
| 50 | Tabla de la Enmienda 1 |

### Contraste por hallazgo
- **M-01: resuelto.** Lo comprobé en el código. `alTerminar` (`formulario-clase.tsx:55-62`) ya avisa "Clase creada" / "Cambios guardados" con `TEXTOS_FORMULARIO_CLASE.avisoCreada` / `avisoGuardada` (`data.ts:130-131`), así que el gancho reutiliza textos que ya existen. El orden de TanStack Query asegura que nunca salgan dos avisos: el `onSuccess` y el `onError` del gancho corren antes que los callbacks de `mutate`, cuando el formulario todavía está montado, así que con el formulario montado el gancho calla y solo avisa `alTerminar` o `alFallar`. **Avisar el éxito sin navegar es correcto:** la persona ya eligió otra pantalla y llevarla a la clase le quitaría lo que está haciendo, pero tiene que saber que se guardó; es el criterio de T-30 que ya siguen los demás ganchos. También es correcto no avisar los códigos de `CODIGOS_QUE_REDIRIGE_EL_CLIENTE`, porque la página se va. CL3-C14 cubre desmontado con 500, red, éxito y `ACCESO_RESTRINGIDO`, y montado sin aviso doble. La tabla de clase de la matriz de 03c es coherente.
- **M-02: resuelto.** `temas-01a-r3.ataque.test.ts:474-481` prohíbe `\.rol\b`, `relacion ===` y los roles comparados a mano fuera de `core/` sobre el código ya sin comentarios (`sinComentarios`, `:416-420`). Con `bloqueAlPublicar(perfil)`, `bloqueEfectivo(bloque, autor)` y `puedeMoverRecurso(actor, bloque)`, ni `adapters/db/temas.ts` ni `handlers/tareas/temas.ts` escriben `.rol`; `SELECT_AUTOR` (`rol: true`) no coincide con el patrón. La prueba no cambia.
- **M-03: resuelto.** `bloque?: Bloque | null` con `null` por defecto, como `temaId`. Las cinco llamadas directas quedan como "Diseño: no cambia". CL3-A05 comprueba que `muro.ts` siempre pasa el bloque y que una llamada sin él deja el bloque nulo.
- **M-04: resuelto.** `tarjeta-de-tarea.test.tsx` (PR-1D06, `:142-156`) está en la lista de 03c1 con su cambio exacto, y la fila de `muro-view.test.tsx` ya no habla de "Crear tarea".
- **M-05: resuelto.** R9 cubre los cinco lugares con sus caminos: sección, regreso, historial, "Ocultar/Ver respuestas" y "Volver a Recursos". Tiene filas de primera carga en las matrices de 03d (bloque, sección, "Editar recurso") y 03e (respuestas), y sus casos en CL3-D27 y CL3-E13, con el router real y el `QueryClient` de `providers.tsx`.
- **N-01: cumple `DESIGN.md` §11.** Ninguna marca se borra. "(propuesta (DOCS-04); fijada en propuesta (CLASES-03x))" conserva el origen y, al aprobarla el humano, pasa a "propuesta aprobada (fecha)" como siempre. A-02 ahora **reemplaza** las viñetas de Recursos y Dudas, y actualiza "Perspectivas" y la frase de §7.17.
- **N-03 a N-09 y los detalles: resueltos** como se pidió.
- **N-02, el punto en que el arquitecto se aparta de mi reparto: lo acepto.** Los caminos de R1 y R2 van en 03c1 con su texto y su gancho. La regla del 2026-10-26 pide los casos junto con la frase que se renombra, y como CL3-C12 y CL3-C13 comparan el `pathname` y la ausencia de `cursor`, los filtros de 03c2 no los cambian. Mi reparto movía esos casos a la segunda entrega sin ganar nada. Con esto, ninguna `*.ataque` se toca dos veces.

### Observaciones (no bloquean; el programador o el orquestador las atienden en su paso)
- **O-E1-1 · CL3-C13 en 03c1, "también con la lista por sección en error".** En 03c1 todavía no existe la lista por sección (`useTemasDeLaSeccion` llega en 03c2), así que en 03c1 ese caso se hace con la lista de temas que la vista usa entonces, la total. Como su doble falla por `pathname` (`…/temas`), el mismo caso sigue valiendo en 03c2 para la lista por sección sin cambiar la prueba. El programador lo dice en su resumen de 03c1. No es PARADA.
- **O-E1-2 · A-02, línea "Actividades de aprendizaje: §7.22."** Reemplaza la viñeta de DOCS-04 completa, y esa viñeta tenía una previsión para FORO-01: "desde FORO-01, los foros con su insignia de tipo (texto e icono, §7.8)". Esa frase se conserva, en esa línea o en la frase de entrada de §7.22 (A-04), y la línea lleva su marca como las de Recursos y Dudas: "(propuesta (DOCS-04); fijada en propuesta (CLASES-03c))". Lo ajusta el orquestador al aplicar A-02, sin enmienda.
- **O-E1-3 · Tabla de la Enmienda 1.** En la fila de M-01 aparece DH-07 como lugar del cambio, pero ningún hunk toca esa fila. El texto de DH-07 sigue siendo cierto (siete componentes, diez ganchos), así que es solo una errata de la tabla y no afecta nada.

### Postura sobre las DH nuevas
| DH | Postura | Nota |
|---|---|---|
| DH-14 partir 03c | **Aprobar: partir en 03c1 y 03c2** | Con el reparto del arquitecto (caminos de R1 y R2 en 03c1). Cuesta un commit más, y cada mecanismo de riesgo llega a su propia ronda del tester. |
| DH-15 recursos del docente de un maestro retirado | **Aprobar la recomendación: dejarlo como RN-07** | Es lo que dice el PRD (decisión del colegio del 2026-10-26) y no agrega reglas. Cualquier maestro de la clase los puede mover de tema y el admin los borra. Las alternativas (b) y (c) son decisiones nuevas del PRD. |
| DH-16 tres cambios a la propuesta de §7.16 | **Aprobar los tres** | (a) es lo que hace `NavLink` con una ruta bajo el segmento; (b) cumple "una sola acción principal por vista"; (c) evita un `Card` dentro de otro (§7.2) y respeta P-05. |

### ¿Puede ir al humano?
Sí. Ya no queda ningún problema que bloquee. Con las respuestas de DH-01 a DH-16 y su aprobación por escrito (carril sensible), puede arrancar la ronda 0 de 03a.

## Verificación de la Enmienda 2 — CLASES-03
Veredicto: APROBADO
Verificación propia: lint, test y build no aplican: es una enmienda del plan y la verificación es estática, por grep, lectura y una réplica en Node de la regla de comentarios de CAL-1A18 sobre el árbol. No corrí suites: el árbol de 03a está a medias (pasos 1 a 6), y la corrida le toca al programador en el paso 8.

Fecha: 2026-10-28.

### 1. Integridad y cotejo
- SHA-256 de `plan.md`: `ba4bd5ec2a93314475d2e20495b4fb1d3bca6fdfb5d77ad5c580939812a5cb8b` (1000 líneas); de la copia previa (`copias-plan/plan-clases03-antes-enmienda2-c9efaac1.md`): `c9efaac17f4e3873764997f48714af63459ff945ce6ff08251822aa31e1a1518`, que es el plan aprobado por el humano. Los dos coinciden con lo declarado.
- `git diff --no-index` completo: 6 hunks, +39 y −5 líneas. Cada uno corresponde a un id:

| Hunk | Dónde | Id |
|---|---|---|
| 1 | Encabezado "Estado" | E2-1 |
| 2 | §D-0.5 (SQL crudo solo en `recursos.ts` y `dudas.ts`; comentarios de `app.ts`, `tareas.ts` e `index.ts`) | E2-5 |
| 3 | §D-1.7 (sin `DO $$` ni los sufijos `_calificaciones` o `_clases_administradas`) | E2-5 |
| 4 | §D-R0: nota de E6, tabla del barrido, "No hay C-26" y la frase de "Rojos esperados" | E2-3, E2-4 y E2-5 |
| 5 | Lista cerrada: filas de E6 en 03a y 03b; la fila de ayudas de 03b se reescribe sin cambio de contenido | E2-2 |
| 6 | Sección "Enmienda 2" | Tabla |

- Ningún cambio fuera de la enmienda: alcance, DH, suposiciones, diseño de concurrencia (§D-0.5 conserva entera la frase de los bloqueos) y pruebas requeridas quedan como estaban.

### 2. Filas de E6 en la lista cerrada
`bloqueo-usuario.integracion.test.ts:676-719`: la lista esperada tiene 11 archivos y lleva comentarios de cada encargo en `:677-687`. Las filas de 03a y 03b solo permiten sumar el archivo a la lista (en su orden alfabético: `recursos.ts` va antes que `referencias.ts`), el nombre al título y una línea al bloque de comentarios, con "Nada más de esa prueba". El patrón (`$queryRaw|$executeRaw` sin `Unsafe`, sin contar las líneas de comentario) y las demás aserciones no se tocan. Es el mismo cambio que hicieron AUTH-03b, CLASES-c, TAREAS-01a y 01b, ENTREGAS-01b y CALIFICACIONES-01b. Correcto.

### 3. Barrido propio (pruebas normales del backend, con el árbol de 03a)
Grep sobre `backend/test/*.test.ts` y `backend/src/**/*.test.ts` sin `*.ataque` (`readdir`, `readFile`, `import.meta.glob`, `printRoutes`, `pg_constraint`, `pg_indexes`, `Object.keys` del índice, textos de bloqueo). Salen 11 archivos con inventario estático. Contra el árbol:
- **E6 (`bloqueo-usuario.integracion`)**: en el árbol, los archivos de `adapters/db` con SQL etiquetado son los 11 esperados más `recursos.ts`. **Es la única que rompe con 03a.** E7 (`bloqueo-usuario.js` solo desde `adapters/db`) no rompe.
- **CAL-1A18 y CAL-1B08 (comentarios)**: repliqué en Node `comentariosDe` y las cinco familias de palabras sobre `app.ts`, `adapters/db/tareas.ts`, `adapters/db/index.ts`, `adapters/db/entregas.ts` y `handlers/tareas/entregas.ts` del árbol: 0 coincidencias. El diff de `index.ts` y `app.ts` en 03a solo suma exportaciones, una importación y un `register`, sin comentarios nuevos. CAL-1A18 `adapters/db` no importa la cola: no rompe.
- **Migraciones por sufijo** (`calificaciones-migracion`, `migracion-maestros-de-clase`): la nueva es `20261028165322_clases_03_recursos`; no termina en esos sufijos ni tiene `DO $$`. Está partida en sentencias que terminan en `;` al final de línea y con comentarios `--` de línea completa, así que `sentenciasDe` la parte bien para el patrón de CL3-A01. Además coincide con §D-1: reparto antes de los `CHECK`, dos `CHECK` y dos índices.
- **Restricciones e índices por nombre**: ninguno se quita ni se renombra.
- **`higiene-de-pruebas`**: `.$transaction(` sigue solo en `cliente.ts`; `addHook` en `app.ts` y la guarda; los manejadores de raíz en `errores.ts`; la fábrica de Fastify en `app.ts`. No rompe.
- **`printRoutes`** (PR-2A24 y PR-B16g): las rutas nuevas no quitan las de gestión ni contienen "movimiento". PR-B16h (`Object.keys` del índice sin "movimiento") no rompe con `listarRecursos`, `leerRecurso`, `editarRecurso` y `listarTemasDeLaSeccion`.
- **Textos de bloqueo** en pruebas normales (`restablecer`, `tareas-version`, `entregas-concurrencia`, `hilo-privado-concurrencia`, `muro.integracion:586-599`): son retenciones propias o comentarios, no inventarios del código. No rompen.
- **PR-1B03 bis y M-02**: `handlers/tareas/*.ts`, `handlers/clases/{muro,recursos}.ts`, `adapters/db/{temas,recursos,publicaciones}.ts` no tienen `.rol` ni `relacion ===` (grep: 0). Las tres rutas de `recursos.ts` llevan exactamente la cadena de la tabla de "Autorización".

**Confirmo: solo E6 rompe**, en 03a con `recursos.ts` y en 03b con `dudas.ts`. No falta nada en la tabla del barrido.

### 4. Condiciones de diseño nuevas (§D-0.5, §D-1.7, barrido)
Son coherentes con lo ya implementado: la migración aplicada no tiene `DO $$` y su nombre no lleva los sufijos vigilados; los comentarios de `app.ts`, `tareas.ts` e `index.ts` no nombran las palabras de CAL-1A18 y CAL-1B08; y en `adapters/db` el SQL crudo nuevo está solo en `recursos.ts`. Valen igual para 03b (`dudas.ts`, el registro de `dudasHandler` en `app.ts` y la migración `…_clases_03_dudas`), como dice la enmienda.

### Observación (no bloquea)
- **O-E2-1:** al reanudar, el programador hace primero el cambio de E6 (fila de 03a) y lo declara en su resumen, con el diff de esa prueba limitado a la lista, el título y la línea de comentario. En 03b repite lo mismo con `dudas.ts`.

### ¿Puede reanudar?
Sí. El programador reanuda 03a en el paso 7 con la lista cerrada ampliada (E6). No hay M-nn.

## Verificación del resumen — 03a — implementación
Veredicto: ACEPTADO. El tester puede atacar 03a (ronda 1).
Verificación propia (2026-10-28, una corrida tras otra, nunca dos a la vez; CPU al 14 % antes de empezar, Docker Desktop encendido):

| Qué | Resumen del programador | Mi corrida |
|---|---|---|
| `npm run build` (`shared/`) | `> tsc -p tsconfig.json` (exit 0) | `> tsc -p tsconfig.json`, exit 0 |
| `npm run lint` (`backend/`) | `> tsc -p tsconfig.json --noEmit && tsc -p tsconfig.test.json` (exit 0) | Misma última línea, exit 0 |
| `npx prisma validate` | `The schema at prisma\schema.prisma is valid 🚀` | Igual |
| `npx vitest list` | 2690 casos en 221 archivos; 73 con "CL3-A" | 2690 casos, 221 archivos, 73 con "CL3-A" |
| Casos por archivo | `core/recursos.test.ts` 11 · `migracion-clases-03a` 6 · `recursos.integracion` 29 · `recursos-autorizacion` 15 · `recursos-filtros` 12 | 11 · 6 · 29 · 15 · 12 (suman 73) |
| `npm run test` (`backend/`) | Dos corridas con tiempos agotados (PARADA); la del orquestador con el equipo libre: `221 passed (221)` · `2690 passed (2690)` | `Test Files  221 passed (221)` · `Tests  2690 passed (2690)` · `Duration  135.41s (transform 14.60s, setup 6.91s, import 264.04s, tests 1062.45s)`. Ningún "timed out" en la salida (grep: 0) |
| `npm run build` (`backend/`) | `> tsc -p tsconfig.json` (exit 0) | `> tsc -p tsconfig.json`, exit 0 |

Todas las cifras coinciden. La suite verde con el equipo libre, sin un solo tiempo agotado, confirma que la PARADA del programador fue por la carga del equipo, como diagnosticó el orquestador.

### Contraste
- **Pruebas requeridas CL3-A01 a CL3-A18:** cada viñeta tiene caso con el título que da el resumen. Leí el código de los casos que más riesgo tenían de quedarse en el título:
  - **CL3-A01:** sigue el patrón de CAL-1A01 (esquema propio, migraciones hasta la anterior, datos, la del encargo). Compara las cuatro filas con `bloque`, `version` = 0 y un `actualizado_en` fijo antiguo.
  - **CL3-A02 y CL3-A03:** rechazos por el nombre del `CHECK` y los índices por `pg_indexes` con columnas y orden.
  - **CL3-A09 y CL3-A11:** cubren sin sesión, cambio pendiente, restringido, clase ajena e inexistente (iguales), y que nada cambie en las negaciones. Recorren todas las claves de la respuesta (`clavesDe`) contra `estadoPago`, `accesoRestringido`, `email` y `rol`, y `version` en la lista, con un alumno `deudor` inscrito y además `not.toContain("deudor")`.
  - **CL3-A10:** el cursor borrado entre la comprobación y la página usa `unaVezDespuesDe` y `ejecutorEspiado`, con la precondición de que el gancho corrió.
  - **CL3-A13:** la retención usa `FOR UPDATE` y `formadasDetrasDe` con el pid propio y `timeout: 30_000`; la versión vieja da `409` y no escribe nada, ni la fila ni los archivos.
  - **CL3-A08:** cuenta lo de cada sección; el material sin bloque cuenta en el total y en ninguna sección de recursos.
  - **CL3-A04:** recorre las tablas completas por función.
- **E6 (O-E2-1):** el diff de `bloqueo-usuario.integracion.test.ts` es solo la línea de comentario, el título y `"recursos.ts"` en la lista. Correcto.
- **Lista cerrada:** `ayudas-tareas.ts` solo agrega la opción `bloque` (sin ella, nulo); `lecturas-consistentes:738` solo gana `actor`. Las 226 `*.ataque` coinciden una por una con la tabla de SHA-256 de la ronda 0 (`reporte-tester.md`); las dos cambiadas (C-1 y C-2) son del tester. Ningún caso nuevo está saltado (`skip`, `only` o `todo`: 0).
- **Migración:** `migration.sql` tiene el SHA-256 `a2e81df7fc75e044e7232da0095472b1f15777a1c3f744a1ac3d5d0de5430e6f`, el mismo que registró el orquestador tras la confirmación del humano. Coincide punto por punto con §D-1: enum, columnas nulas o con valor por defecto, reparto antes de los `CHECK` con su comentario, dos `CHECK` a mano y dos índices. No tiene `DO $$` y no lleva los sufijos vigilados.
- **Autorización:** las tres rutas de `handlers/clases/recursos.ts` llevan exactamente la cadena de la tabla de "Autorización": `GET` lista con estudiante, maestro y admin · inscripción; `GET` y `PUT` del detalle con maestro y admin · propiedad. Los permisos por elemento los decide `core/recursos.ts`, que recibe `ParticipanteDeAutoria`. No hay `.rol` ni `relacion ===` en handlers ni adaptadores (M-02 cumplido). `version` sale solo en el detalle: `SELECT_RECURSO` no la lee y `recursoSchema` no la tiene.
- **Condiciones de la Enmienda 2:** en `adapters/db`, el SQL crudo nuevo está solo en `recursos.ts`. Mi réplica de `comentariosDe` sobre `app.ts`, `adapters/db/tareas.ts` e `index.ts` da 0. Las pruebas nuevas no usan `LOCK TABLE` y sus dos transacciones llevan `timeout: 30_000`.
- **"No se toca":** ningún archivo de la lista cambió. `adapters/db/tareas.ts` solo gana `export` en `confirmarArchivos` (más su comentario) y el filtro `seccion`; no hay nada fuera de `backend/` y `shared/` salvo `docs/ESTADO.md`, que es del orquestador.
- **Matriz de avisos y recargas:** no aplica, porque 03a no tiene interfaz.

### Desviaciones declaradas
1. **`leerRecurso` y `editarRecurso` devuelven `null` y el handler responde `404 RECURSO_NO_ENCONTRADO`.** Aceptada: es el patrón de `leerTarea` y `editarTarea`, y el error sigue tipado en el handler.
2. **`tipo?: "anuncio" | undefined` y `seccion?: "actividades" | undefined`.** Aceptada: lo exige `exactOptionalPropertyTypes`, y la firma de hoy no cambia.
3. **Leer y editar un material con bloque nulo usan su `bloqueEfectivo`.** Aceptada: es lo que pide DH-02 (a) y lo prueba CL3-A12; la lista sigue sin mostrarlo.
4. **La descripción de `editarRecursoSchema` reutiliza la del material.** Aceptada: evita duplicar la regla, que es la misma por §D-3.7.
5. **La ayuda de retención de CL3-A13 está dentro de su archivo.** Aceptada: usa el mismo método de CHORE-02 (`formadasDetrasDe` con el pid propio y `timeout` explícito), y `conFilaRetenida` no admite `publicaciones`.
6. **`ejecutorEspiado` y `unaVezDespuesDe` se importan de `ayudas-gradebook.ts`.** Aceptada: es una ayuda de pruebas existente. Si se usa más, conviene moverla a una ayuda común en un chore; no bloquea.

### Detalle menor
- En `src/core/recursos.test.ts` hay dos pares de títulos idénticos ("tabla completa actor × autor × bloque" y "con el bloque nulo sigue el bloque efectivo del autor"), en `describe` distintos (editar y borrar). `vitest list` los distingue por su `describe` y el resumen lo aclara entre paréntesis. No hace falta cambiarlo.

## Arbitraje — corrección de la ronda 1 de 03a
Fecha: 2026-10-28. Leí `reporte-tester.md` ("CLASES-03a — Ronda 1"), las dos últimas entradas de `aprobacion.md`, la prueba `muro-c-r1.ataque.test.ts:343-407`, el diff de `borrarPublicacion` (`adapters/db/publicaciones.ts`) y el de `archivoIdsSchema` (`shared/src/clases.ts`). T-03 queda fuera: espera la autorización del humano.

### Punto 1 — PARADA por `muro-c-r1.ataque` › "el FOR SHARE del comentario va primero y el DELETE de la publicación espera…"
**Decisión: (a). El remedio es correcto, y la `*.ataque` se ajusta con el cambio mínimo en la ronda 2 del tester.**

Por qué el remedio es correcto:
- Tomar la fila de la publicación con `FOR UPDATE` antes de tocar sus archivos es el orden de `borrarTarea` (`FOR UPDATE OF t`) y lo que pide "Acceso a datos" del plan: el borrado toma la fila primero.
- Con ese orden, los cruces con las demás escrituras sobre la misma fila quedan en serie y sin ciclo:
  - **Con `editarRecurso`** (`FOR NO KEY UPDATE` de la fila y después los archivos): quien llega segundo espera la fila sin haber tocado ningún archivo. Se acaban el `40P01` de T-01 y el `P2003` de T-02. Si el borrado llega primero, la edición no encuentra la fila y responde `404`, como en CL3a-r1-04.
  - **Con `crearComentario`** (`FOR SHARE` y después el `INSERT` con su FK): `FOR UPDATE` choca con `FOR SHARE`, así que el borrado espera al comentario y el comentario cae en cascada. Si el borrado llega primero, el comentario espera y responde `404` (PR-C04d).
  - **Con `moverATema`** (un `UPDATE` de la fila): en serie.
- Tomar antes un bloqueo más débil (`FOR NO KEY UPDATE`) obligaría a subirlo a `FOR UPDATE` en el `DELETE`, y esa subida sí puede cruzarse con un `FOR SHARE`. Borrar antes de descartar los archivos lo impide la FK `NO ACTION`, como dice el programador. No hay un remedio mejor.
- El SQL crudo nuevo está en `publicaciones.ts`, que ya figura en E6: no se rompe ningún inventario. Mi grep confirma que ninguna otra prueba depende del texto del `DELETE`. La única que busca texto en `pg_stat_activity` además de esta es `muro.integracion:586-599`, que busca el `FOR SHARE` del comentario y borra con Prisma directo, así que no le afecta. `lecturas-fx-r2:1093-1112` solo exige que `borrarPublicacion` no use `instantaneaUnica`, y no la usa.

Por qué la prueba debe ajustarse: lo que protege (el comentario va primero, el borrado espera, responde `204`, sin `500` y sin comentario huérfano) se sigue cumpliendo. Lo que se rompe es cómo detecta que el borrado ya está en espera: busca el texto de la sentencia (`ILIKE '%DELETE%'`), y la espera ahora ocurre en el `SELECT … FOR UPDATE`. Un cambio de SQL que conserva el comportamiento no debe romper la prueba.

Qué hace cada agente:
- **Tester:** al iniciar la ronda 2, y antes de atacar, hace el cambio mínimo en ese caso y en nada más del archivo, con su motivo, en su V-01 y en la tabla de SHA-256. El sondeo da por formado el borrado cuando un proceso espera **esa fila** con el criterio de CHORE-02 (`wait_event` `transactionid` o `tuple`, `wait_event_type = 'Lock'`), y cuando su sentencia es el `SELECT … FOR UPDATE` o el `DELETE` sobre `publicaciones` (por ejemplo, `query ILIKE '%publicaciones%' AND (query ILIKE '%DELETE%' OR query ILIKE '%FOR UPDATE%')`). Las demás aserciones (`204`, publicación y comentario borrados, el trabajo de la cola anotado) no cambian. Ese ajuste no cuenta como ronda.
- **Programador:** no toca esa prueba. Entrega su resumen de la corrección con ella **declarada como roja esperada**, citando este arbitraje, junto con la roja de T-03 (CL3a-r1-12), que sigue esperando la autorización del humano. Además corre la suite completa del backend: cualquier otra roja es PARADA.
- **Manager:** en la verificación del resumen acepta esas dos rojas y ninguna otra.

### Punto 2 — alcance del remedio de T-04
**Decisión: se acepta el alcance completo en 03a**, con el remedio en la base `archivoIdsSchema`, por la regla de hermanos. No se limita a recursos.
- **Es el mismo defecto en los cuatro esquemas.** `editarRecursoSchema`, `crearPublicacionSchema`, `crearTareaSchema` y `editarTareaSchema` comparaban los repetidos antes de pasar a minúsculas. Limitarlo a recursos dejaría tres hermanos conocidos con el defecto, que es justo lo que la regla prohíbe. `entregarSchema` (ENTREGAS-01) ya comparaba en minúsculas: el remedio unifica la regla con ese precedente.
- **El cambio visible es mínimo y siempre a mejor.** Un id nuevo repetido con otra capitalización pasa de `400 ARCHIVO_INVALIDO` a `400 VALIDACION` "No repitas un archivo adjunto", que es más preciso; los dos son `400` y nada se escribe. El frontend nunca produce esa entrada, porque envía los ids tal como se los dio el servidor.
- **Ninguna prueba fija el código viejo (grep propio):**
  - Backend: `esquemas-tareas` PR-1B06 (`[A, A]`) y `tareas-01b-r1:521` (repetidos iguales) siguen rechazando. `archivos.integracion:421` (`[uno.id, uno.id]`) también. `esquemas-entregas` PR-1B04 lee el primer mensaje, que no cambia. CL3a-r1-14 acepta cualquier `400`. CL3a-r1-15 es la que debe pasar.
  - Frontend: ninguna prueba manda ids repetidos con otra capitalización ni aserta `ARCHIVO_INVALIDO` en ese caso.
- **Condiciones para el resumen del programador:**
  - **(a)** Lista los hermanos uno por uno: los cuatro esquemas más `entregarSchema`. En `entregarSchema`, su `refine` propio queda redundante con el de la base y ahora salen dos avisos iguales; el programador dice si lo deja (el primer mensaje no cambia y PR-1B04 sigue verde) o lo quita. Quitarlo es un refactor, y no lo pido.
  - **(b)** Como cambió `shared/`, corre también `npm run build` de `shared/` y `npm run lint` y `npm run test` del **frontend** (no modifica nada ahí), una suite tras otra, nunca a la vez. Cualquier roja del frontend es PARADA.

### Rojas esperadas hasta la ronda 2
- `muro-c-r1.ataque` › "el FOR SHARE del comentario va primero…" (punto 1; la ajusta el tester al iniciar la ronda 2).
- `recursos-clases03a-r1.ataque` › CL3a-r1-12 (T-03, hasta la decisión del humano y su corrección).
- Ninguna otra.

## Arbitraje 2 — corrección de la ronda 1 de 03a
Fecha: 2026-10-28. Leí `resumen-programador-03a-r1.md`, la última entrada de `aprobacion.md`, `frontend/src/lib/errores-ch3-r2.ataque.test.ts:200-262`, `frontend/src/lib/errores-de-api.ts:61-73` y `frontend/src/lib/errores-de-api.test.ts` (CH3-A25).

### 1. PARADA por `errores-ch3-r2.ataque` › "en shared/src, todo mensaje que empieza con «palabra:» es un nombre del inventario…" (`:253`)
**Decisión: (a).** El tester suma `tipo`, `bloque`, `recursoId` y `seccion` al `INVENTARIO` (`:231-244`) con el cambio mínimo y su motivo al empezar la ronda 2, sin contar ronda, como `muro-c-r1`. Ninguna otra línea del archivo cambia. No hace falta enmienda de textos: son los que fija el plan.

Verificación del contrato:
- El servidor arma `${path}: ${message}` (`validarParametros` y `validarCuerpo`), así que llega, por ejemplo, `tipo: tipo: no es válido`.
- `quitarRutaDelMensaje` quita una vez la ruta (`RUTA_DEL_MENSAJE = /^[\p{L}\p{M}\p{N}_.-]+:\s*/u`) y, como había ruta, una vez el campo en camelCase que repite el esquema (`/^[a-z][A-Za-z0-9]*:\s*/`).
- Lo que queda en los cinco casos es `no es válido`, `elige un bloque válido`, `debe ser un identificador válido` y `no es válida` (dos veces). Ninguno empieza con otro nombre seguido de dos puntos, así que la segunda aserción de la prueba (`conTercero`) sigue vacía y no se come texto legítimo.
- Los cuatro nombres cumplen la forma que la prueba supone. En `recursoId` el prefijo repetido es exactamente el nombre del campo, como `temaId` y `claseId`.

**Textos por campo (`textosPorCampo`):**
- `tipo`, `seccion` y `bloque` solo viajan en consultas `GET` (`?tipo=`, `?seccion=`, `?bloque=`). Un `VALIDACION` de consulta muestra el texto fijo del lugar (`mensajeDeErrorDeConsulta`), así que **no necesitan** texto por campo.
- `recursoId` viaja en la ruta de `GET` y de `PUT …/recursos/:recursoId`. El `PUT` es una acción, así que sí lo necesita: "Ese recurso ya no existe.". Ya está en el plan (§D-13, `TRADUCCION_DE_ERRORES_CLASES.textosPorCampo` suma `recursoId`) y entra en **03d**, con `EditarRecursoView` y `useEditarRecurso`. 03c no lo necesita, porque solo usa `?tipo=anuncio`, `?seccion=actividades` y `?seccion=` en temas, todos de consulta.
- `dudaId` sigue en 03e, como ya dice §D-13.

### 2. Para que no se repita en 03b: enmienda corta del plan (Enmienda 3)
Sí la pido. Alcance exacto, para el arquitecto:
- **(a) "Verificaciones" (pasos 8 de 03a y 6 de 03b, y la viñeta "Backend (03a, 03b)"):** siempre que la subentrega cambie `shared/src`, además de lo del backend, desde `frontend/` se corren `npm run lint`, `npm run test` y `npm run build`, después del backend y nunca a la vez. Cada uno va en el resumen con su comando y su última línea. Y el conteo de archivos de `npx vitest list` se hace con `grep -a` (ver el punto 4). Esto vale también para el tester y para el manager en 03b.
- **(b) §D-R0 de 03b, fila C-26:** `frontend/src/lib/errores-ch3-r2.ataque.test.ts:231-244` (el `INVENTARIO` de nombres con prefijo en `shared/src`). Suma los nombres nuevos con prefijo de `shared/src/dudas.ts`: según §D-6, `dudaId` y `respuestaId` (los esquemas de parámetros, con el patrón de `temaIdParamSchema`) y `resuelta` (`marcarDudaSchema`: "resuelta: debe ser verdadero o falso"). El arquitecto confirma la lista con un grep sobre el texto final de §D-6 (cualquier otro `"<nombre>: …"` nuevo de 03b entra en la misma fila). Va en "Rojos esperados" de 03b. Si el tester ya sumó en la ronda 2 de 03a nombres de 03b, la fila lo dice.
- **(c) Barrido del frontend:** el arquitecto repite para el frontend el barrido de la Enmienda 2, sobre las pruebas (normales y `*.ataque`) que leen `shared/src` o `backend/src` con `import.meta.glob` o que fijan textos de `shared/`. Mi grep encuentra solo cuatro archivos:
  - `lib/errores-ch3-r2.ataque.test.ts`: la que rompe.
  - `lib/errores-de-api.test.ts` (CH3-A25): es una lista de casos, no exhaustiva, y no rompe con nombres nuevos.
  - `features/admin/errores-ch3.test.ts` y `features/admin/formularios-ch3.test.tsx`: solo citan el backend en comentarios.
  
  El arquitecto lo confirma y escribe el resultado en §D-R0, como en la Enmienda 2.
- **No cambia** el alcance, el diseño, las pruebas requeridas ni ningún DH.

### 3. ¿Entrega ya el programador?
**Sí.** El programador corre ahora `npm run build` desde `frontend/` (la única verificación que le falta) y entrega su resumen de la corrección con dos rojas esperadas, citando los dos arbitrajes:
- `backend/test/muro-c-r1.ataque.test.ts` › "el FOR SHARE del comentario va primero…" (Arbitraje 1).
- `frontend/src/lib/errores-ch3-r2.ataque.test.ts` › "en shared/src, todo mensaje que empieza con «palabra:»…" (este punto 1).

CL3a-r1-12 (T-03) ya está verde y deja de ser roja esperada. Cualquier otra roja es PARADA. No hace falta esperar la Enmienda 3: es para 03b.

### 4. Cifra de archivos del frontend (197 contra 237)
La resolví en mi corrida:
- `npx vitest list` desde `frontend/` da **5310** líneas que empiezan con `src/`. Pero la salida tiene bytes que GNU grep toma por binarios (los títulos con «», acentos y secuencias de color). Desde ese punto, `grep -E "^src/" | sed …` deja de imprimir líneas, aunque `grep -c` sí las cuenta. Con mi propio conteo sin `-a` salieron 193 archivos únicos; el programador obtuvo 197.
- Con `grep -a -E "^src/" | sed 's/ > .*//' | sort -u | wc -l` salen **237** archivos únicos, igual que la corrida (`237`) y que `find src -name "*.test.ts*"` (237). Los casos coinciden: 5310.

La cifra de la corrida es correcta; el conteo del resumen falló por el comando. El programador corrige su resumen con `grep -a` (237 archivos y 5310 casos), y la regla queda en la Enmienda 3 (a).

### Rojas esperadas hasta la ronda 2
- `backend/test/muro-c-r1.ataque.test.ts` › "el FOR SHARE del comentario va primero y el DELETE de la publicación espera…".
- `frontend/src/lib/errores-ch3-r2.ataque.test.ts` › "en shared/src, todo mensaje que empieza con «palabra:» es un nombre del inventario…".
- Ninguna otra.

## Verificación de la corrección de la ronda 1 de 03a y de la Enmienda 3
Veredicto: corrección **ACEPTADA**, Enmienda 3 **APROBADA**, sin M-nn. El tester puede empezar la ronda 2 de 03a.
Fecha: 2026-10-28. CPU al 20 % antes de empezar. Corrí todo una cosa tras otra, nunca dos suites a la vez. Ningún tiempo agotado en las dos suites.

### (1) Verificación del resumen — corrección de la ronda 1 de 03a
| Qué | Resumen del programador (con su adenda) | Mi corrida |
|---|---|---|
| `npm run build` (`shared/`) | `> tsc -p tsconfig.json`, exit 0 | exit 0 |
| `npm run lint` (`shared/`) | `All matched files use Prettier code style!` | Igual, exit 0 |
| `npm run lint` (`backend/`) | `> tsc -p tsconfig.json --noEmit && tsc -p tsconfig.test.json`, exit 0 | exit 0 |
| `npx prisma validate` | `The schema at prisma\schema.prisma is valid 🚀` | Igual |
| `npx vitest list` (`backend/`) | 2713 casos, 223 archivos | 2713 casos, 223 archivos (`grep -a`) |
| `npm run test` (`backend/`) | `Test Files  1 failed \| 222 passed (223)` · `Tests  1 failed \| 2712 passed (2713)` | `Test Files  1 failed \| 222 passed (223)` · `Tests  1 failed \| 2712 passed (2713)` · `Duration  137.81s (transform 15.04s …)`. La única roja es `muro-c-r1.ataque` › "el FOR SHARE del comentario va primero…". 0 "timed out" y 0 `40P01`, `deadlock detected` o `P2003` |
| `npm run build` (`backend/`) | `> tsc -p tsconfig.json`, exit 0 | exit 0 |
| `npm run lint` (`frontend/`) | `> tsc -b`, exit 0 | exit 0 |
| `npx vitest list` (`frontend/`) | 5310 casos, 237 archivos (`grep -a`) | 5310 casos, 237 archivos |
| `npm run test` (`frontend/`) | `Test Files  1 failed \| 236 passed (237)` · `Tests  1 failed \| 5309 passed (5310)` | Igual · `Duration  174.86s`. La única roja es `errores-ch3-r2.ataque` › "en shared/src, todo mensaje que empieza con «palabra:»…". 0 "timed out" |
| `npm run build` (`frontend/`) | `✓ built in 1.33s` | `✓ built in 773ms`, exit 0 |

- Todas las cifras coinciden.
- Solo están rojas las dos que permiten los arbitrajes 1 y 2.
- CL3a-r1-01, -02, -12 y -15 están verdes: `recursos-clases03a-r1.ataque.test.ts` pasó entero.

**Contraste con el código:**
- **T-01 y T-02.** `borrarPublicacion` hace primero `SELECT p.tipo::text, p.bloque::text, p.autor_id … FOR UPDATE` (etiquetado, parametrizado, en `publicaciones.ts`, que ya está en E6). Después lee el autor por PK, decide con `puedeBorrarRecurso` (material) o `puedeBorrar` (anuncio) y recién entonces descarta los archivos y borra. Es el remedio arbitrado.
- **Hermanos de T-01 y T-02:** anuncio, mover, comentar, editar (quitando, agregando o conservando adjuntos), borrado primero (`404`), edición primero (`200` y `204`), borrar un comentario (no aplica) y `borrarTarea` (ya bloqueaba). Son los mismos estados que mi Arbitraje 1 dio por cubiertos con ese orden de bloqueo, y la suite los confirma: ningún interbloqueo en el log.
- **T-03.** `adapters/db/tareas.ts` gana solo lo autorizado: el `import type { Bloque }`, el campo `bloque: Bloque | null` del tipo, `bloque: true` en el `select` y `bloque: fila.bloque` en lo que devuelve, además de lo que ya tenía del plan (el `export` de `confirmarArchivos` y `seccion`). En `handlers/tareas/tareas.ts`, `puedeMover` es `puedeMoverRecurso(actor, bloqueEfectivo(elemento.bloque, elemento.autor))` para un material y `puedeMoverElemento(relacion)` para una tarea. No hay `.rol` ni `relacion ===` en el handler (grep: 0), y la respuesta no gana `bloque` (CL3a-r1-23 verde). Los estados vecinos que lista el programador (estudiante, maestro en cada bloque, admin, bloque nulo de autor admin y de autor maestro, `?seccion=actividades`) salen de la misma función de `core/` que ya probó CL3-A04.
- **T-04.** El `refine` de `archivoIdsSchema` compara en minúsculas. Los hermanos van uno por uno (`editarRecursoSchema`, `crearPublicacionSchema`, `crearTareaSchema`, `editarTareaSchema`; `maestroIdsSchema` y `ordenTemasSchema` ya comparaban en minúsculas). El `refine` redundante de `entregarSchema` se queda, como permitía el arbitraje: la API sigue respondiendo con el primer mensaje y `esquemas-entregas` PR-1B04 sigue verde.
- **"No se toca".** Los cambios de la corrección están en `publicaciones.ts`, `tareas.ts` (dentro de lo autorizado), `handlers/tareas/tareas.ts` y `shared/src/clases.ts`. Ninguna `*.ataque` cambió; la ronda 2 la empezará el tester con su V-01.

### (2) Enmienda 3
- **Integridad.** SHA-256 de `plan.md`: `204515a6604c786ae27376d87d5e6c5fd9543b50e0834e3780a41b6791a85971` (1027 líneas); de la copia previa: `ba4bd5ec2a93314475d2e20495b4fb1d3bca6fdfb5d77ad5c580939812a5cb8b`. Coinciden.
- **Diff completo** (`git diff --no-index`): 9 hunks, cada uno con su id:

| Hunk | Dónde | Id |
|---|---|---|
| 1 | Encabezado "Estado" | E3-1 |
| 2 | §D-13, último párrafo (textos por campo) | E3-4 |
| 3 | §D-R0, fila C-26 | E3-3 |
| 4 | §D-R0, nota de las `*.ataque` de 03b y "Barrido del frontend…" | E3-5 (y la aclaración "No hay C-26" → C-26) |
| 5 | "Rojos esperados" de 03b | E3-3 |
| 6 | Paso 8 de 03a | E3-2 |
| 7 | Paso 6 de 03b | E3-2 |
| 8 | "Verificaciones" (frontend si cambia `shared/src`; conteo con `grep -a`) | E3-2 |
| 9 | Sección "Enmienda 3" | Tabla |

- **Cumple lo que pedí en el Arbitraje 2:**
  - **(a)** El frontend está en las verificaciones de 03a, de 03b y de cualquier subentrega que cambie `shared/src`, para el programador, el tester y el manager, con `grep -a`.
  - **(b)** C-26 lleva `dudaId`, `respuestaId` y `resuelta`, con su comprobación de la segunda aserción. "Rojos esperados" aclara bien que C-26 se reescribe en la ronda 0 de 03b sin quedar roja (sumar nombres que todavía no existen no cambia el resultado) y que, si no se reescribiera, se pondría roja en el paso 1, lo que sería PARADA.
  - **(c)** El barrido del frontend coincide con el mío.
- **Nada fuera de la enmienda:** el alcance, el diseño, las pruebas requeridas y las DH no cambian.

**Sobre los textos por campo de 03e (E3-4):** son consecuencia del Arbitraje 2, no textos nuevos.
- **`respuestaId`:** viaja en la ruta de una acción (`DELETE …/respuestas/:respuestaId`), igual que `claseId` y `recursoId`. Necesita su texto fijo, y "Esa respuesta ya no existe." ya está en la tabla de §D-13 (`MENSAJES_ERROR_CLASES_GENERALES.respuestaNoEncontrada`), que el humano revisa en DH-12.
- **`resuelta`:** se lleva el genérico del módulo ("Algo salió mal. Inténtalo de nuevo."), que también ya existe. Es lo que pide CL3-E07, "un aviso legible" para un `resuelta:` fuera de contrato que la interfaz nunca produce, porque siempre envía un booleano. Sin esa entrada, la persona leería "debe ser verdadero o falso", que es peor.
- **Conclusión:** no aparece ninguna cadena nueva. Es una asignación de textos ya aprobables en DH-12; basta mencionarla al humano en el resumen de la subentrega, sin decisión aparte.

### ¿Puede atacar el tester?
Sí. Al empezar la ronda 2 de 03a, sin contarla, hace los dos ajustes arbitrados:
- el sondeo de `muro-c-r1.ataque` (Arbitraje 1);
- los cuatro nombres en el `INVENTARIO` de `errores-ch3-r2.ataque` (Arbitraje 2).

Después corre las dos suites, una tras otra, como pide la Enmienda 3 (a).

## Revisión final — 03a
Veredicto: CAMBIOS REQUERIDOS (un solo problema, de documentación: M-01). El código, las pruebas y la migración están aprobados. Con M-01 corregido y verificado por el manager (diff de los dos README y `npm run lint` del backend), 03a queda **APROBADO** y puede hacerse el commit, sin otra ronda del tester ni otra corrida de suites.
Fecha: 2026-10-28. CPU al 24 % antes de empezar. Una cosa tras otra, nunca dos suites a la vez. Ningún tiempo agotado.

Verificación propia:
| Qué | Última línea |
|---|---|
| `npm run build` (`shared/`) | `> tsc -p tsconfig.json`, exit 0 |
| `npm run lint` (`shared/`) | `All matched files use Prettier code style!`, exit 0 |
| `npm run lint` (`backend/`) | exit 0 |
| `npx prisma validate` | `The schema at prisma\schema.prisma is valid 🚀` |
| `npx vitest list` (`backend/`, `grep -a`) | 2721 casos, 224 archivos |
| `npm run test` (`backend/`) | `Test Files  224 passed (224)` · `Tests  2721 passed (2721)` · `Duration  143.82s (transform 15.11s, setup 6.92s, import 277.57s, tests 1135.66s)` |
| PA-07 (backend) | `40P01` 0 · `deadlock detected` 0 · `could not serialize` 0 · `too many clients` 0 · "Error no controlado" 10 (el inventario) · `P2028` 5 (los permitidos) |
| `npm run build` (`backend/`) | exit 0 |
| `npm run lint` (`frontend/`) | exit 0 |
| `npx vitest list` (`frontend/`, `grep -a`) | 5310 casos, 237 archivos |
| `npm run test` (`frontend/`) | `Test Files  237 passed (237)` · `Tests  5310 passed (5310)` · `Duration  179.48s` |
| `npm run build` (`frontend/`) | `✓ built in 753ms`, exit 0 |

Coinciden con la ronda 2 del tester (224 / 2721 y 237 / 5310).

### Lo que revisé
- **V-01:** las 229 `*.ataque` del árbol son las 229 de la tabla de la ronda 2 (`reporte-tester.md`), con el mismo SHA-256 una por una: 0 diferencias, ninguna de más ni de menos. El programador no tocó ninguna; las que cambiaron (C-1, C-2, los ajustes arbitrados de `muro-c-r1` y `errores-ch3-r2`, y las tres nuevas del tester) son del tester.
- **"No se toca" contra `<R>` = `689c636`:** `git diff --name-only` sobre `middleware/`, `adapters/auth/`, `config/`, `workers/`, `core/calificaciones/`, `core/entregas/`, `core/autoria.ts`, `handlers/calificaciones.ts`, `handlers/tareas/entregas.ts` y `hilo-privado.ts`, `adapters/db/{entregas,calificaciones,referencias}.ts`, `infra/`, `.env.example`, `AGENTS.md`, `CLAUDE.md`, `frontend/src/{features,components,services,app,styles}` y `docs/{DESIGN,ARCHITECTURE,ARCHITECTURE-ESSENTIALS,PRD}.md`: vacío. `adapters/db/tareas.ts` tiene solo lo del plan (`export` de `confirmarArchivos`, `seccion`) y lo que autorizó el humano para T-03 (`bloque` en el `select`, su tipo y el `import type`). Las pruebas normales cambiadas son las de las listas cerradas (`ayudas-tareas.ts`, `lecturas-consistentes:738`, E6). `docs/ESTADO.md` es del orquestador.
- **Requisitos:**
  - **RF-63 (backend):** dos bloques guardados con el rol del autor al publicar; reparto de los existentes en la migración; lista por bloque y tema para los inscritos; edición con `version`; comentarios conservados (P-06, CL3-A17).
  - **RN-07:**
    - "Recursos de aprendizaje": solo el admin edita, borra y mueve.
    - "Recursos del docente": edita y borra su autor, el admin borra y mueve cualquiera, y cualquier maestro de la clase mueve (S-03).
    - Las banderas de "Trabajo de clase" ya siguen la misma regla (T-03).
  - **RN-09:** el bloque es el del autor al publicar; un alumno restringido no ve recursos (`withAccess`, CL3-A09).
  - **Autorización:** la cadena de las tres rutas nuevas es la de la tabla de "Autorización". Ninguna respuesta lleva estado de pago, correo, restricción ni rol, y `version` solo sale en el detalle (CL3-A09, CL3-A11, CL3a-r1-20).
- **Pruebas requeridas:** CL3-A01 a CL3-A18 con su caso, contrastadas en "Verificación del resumen — 03a". Las rondas suman 29 casos `CL3a-r1` y `CL3a-r2` en verde.
- **Migración:** `20261028165322_clases_03_recursos/migration.sql`, SHA-256 `a2e81df7…6e6f`. Es la que confirmó el humano y es compatible hacia atrás (columnas nulas o con valor por defecto, `CHECK` que un backend anterior no viola, ningún índice quitado).
- **Estilo (`CLAUDE.md`):** `core/` lanza `AppError` y no tiene I/O. Los adaptadores traducen los errores. El SQL crudo va etiquetado y parametrizado. No hay consultas en ciclos, y los handlers son delgados.
- **Hallazgos del tester:** T-01 a T-04 corregidos y comprobados en la ronda 2 (RESISTE). Los dos desacuerdos (`muro-c-r1` y `errores-ch3-r2`) se arbitraron y quedaron ajustados.

### Problemas que bloquean
#### M-01 — Los README de `adapters/` y `handlers/` describen `borrarPublicacion` y `GET …/trabajo` como eran antes de la corrección
- **Dónde:** `backend/src/adapters/README.md`.
  - `:257-261` dice que `borrarPublicacion` lee la autoría y borra "sin candado".
  - `:282-283` dice que "primero pasa sus archivos a `descartado`".
  - `:544-545` (`db/publicaciones.ts`) no menciona el bloqueo previo.
  - `:546-547` (`db/tareas.ts`) no menciona `bloque` en `listarTrabajo`.
  
  `backend/src/handlers/README.md` no dice que `tareas/tareas.ts` calcula el `puedeMover` de un material con `puedeMoverRecurso` y `bloqueEfectivo` (T-03).
- **Por qué importa:** ESSENTIALS remite al protocolo de bloqueos de `backend/src/adapters/README.md`. Desde la corrección de T-01 y T-02, `borrarPublicacion` toma la fila de la publicación `FOR UPDATE` antes de tocar sus archivos, que es justo lo que evita el interbloqueo. El próximo que lea el README (03b, ADMIN-01, FORO-01) aprendería el orden viejo, el que causó T-01 y T-02. Definición de terminado: "Documentos actualizados si cambió una decisión".
- **Qué se espera:** el programador corrige esos pasajes para que digan lo que hace el código:
  - `borrarPublicacion` toma primero la fila (`SELECT … FOR UPDATE`, etiquetado), después lee el autor y decide (`puedeBorrarRecurso` en un material, `puedeBorrar` en un anuncio), descarta los archivos y borra, y por qué: quien edita, comenta o mueve queda en serie y no hay ciclo con los archivos (T-01 y T-02).
  - `listarTrabajo` devuelve además `bloque`, que no sale en la respuesta, y el handler lo usa para el `puedeMover` de un material (T-03).
  
  Solo esos pasajes, sin tocar código ni pruebas. Corre `npm run lint` del backend (Prettier revisa los `.md`) y da el diff en su resumen.

### Problemas que no bloquean
Ninguno nuevo. Las observaciones van abajo, con destino.

### Documentos a aplicar al cerrar 03a (DH-10, autorizados por el humano)
**Lista exacta para 03a:** A-09 (la parte de 03a), A-10 (la parte de 03a) y A-11 (las partes de 03a). **A-12 no tiene nada de 03a.** Sus filas (N-47, O-16, N-54 y CHORE-04) se cierran en 03c y 03d. En `docs/ESTADO.md`, el orquestador solo actualiza el estado del encargo (§2) y suma las observaciones de abajo (§3).

Textos ajustados por lo que cambió en las rondas: el bloqueo previo de `borrarPublicacion`, el `puedeMover` de "Trabajo de clase", el `400 VALIDACION` de los adjuntos repetidos con otra capitalización y la ruta real para editar un recurso.

**A-09 · `docs/ARCHITECTURE.md` §7.**
1. Fila `clases`: al final de la celda de rutas, después de "…`personas` devuelve al alumno el correo completo de maestros y compañeros (02b)", agregar:
   > · Desde CLASES-03a: `GET /clases/{claseId}/publicaciones?tipo=anuncio` ("Avisos": solo anuncios, también al comprobar el cursor; sin `tipo`, la lista completa, por compatibilidad hasta su retiro) · `GET /clases/{claseId}/recursos?bloque=&tema=` ("Recursos", por bloque y tema, paginado; alumnos inscritos, maestros de la clase y admin) · `GET/PUT /clases/{claseId}/recursos/{recursoId}` (maestros de la clase y admin; el `PUT` exige `version`: `409 RECURSO_MODIFICADO`; un id que no es un material de la clase, `404 RECURSO_NO_ENCONTRADO`). Un recurso es un material: se publica (con el bloque del rol del autor), se borra y se comenta por las rutas de publicaciones; borrar una publicación toma primero su fila y después descarta sus archivos. En `archivoIds`, un id repetido, también con otra capitalización, responde `400 VALIDACION` "No repitas un archivo adjunto" (publicaciones, tareas y recursos)
2. Fila `tareas`: al final de la celda, después de "…Todo cuelga de `/clases/{claseId}` para pasar por el sexto paso (TAREAS-01)", agregar:
   > · Desde CLASES-03a: `GET /clases/{claseId}/temas?seccion=actividades|aprendizaje|docente` (conteos por sección, misma forma) · `GET /clases/{claseId}/trabajo?seccion=actividades` ("Actividades de aprendizaje": solo tareas; sin `seccion`, por compatibilidad, también materiales) · mover un recurso de aprendizaje es solo del admin (`403 MOVER_NO_PERMITIDO`), mover un recurso sube su `version`, y el `puedeMover` de un material en `GET …/trabajo` sigue la regla de su bloque
3. "Rutas previstas (DOCS-04)": reemplazar la viñeta **CLASES-03** entera por esta, porque su parte de 03a ya no es cierta (decía `PUT …/publicaciones/{publicacionId}` para editar). Se quita del todo al cerrar 03b, como dice el plan:
   > - **CLASES-03 (lo que falta después de 03a):** "Dudas": `GET/POST /clases/{claseId}/dudas` · `GET/POST …/dudas/{dudaId}/respuestas` · `PUT …/dudas/{dudaId}/resuelta` (marcar y quitar) · `DELETE …/dudas/{dudaId}` y `DELETE …/dudas/{dudaId}/respuestas/{respuestaId}`.

**A-10 · `docs/ARCHITECTURE.md` §14.**
1. Fila `publicaciones`: al final de la celda de restricciones, después de "…índices `(clase_id, tema_id, creado_en DESC, id DESC)` y `(tema_id)`", agregar:
   > · `bloque` (`aprendizaje` / `docente`; `CHECK publicaciones_bloque_solo_material`: solo un material lo lleva; se escribe al publicar con el rol del autor y la migración `clases_03_recursos` repartió los existentes; nulo permitido solo por compatibilidad, leído con el bloque del rol del autor) · `version` (entero desde 0, `CHECK publicaciones_version_no_negativa`; precondición del `PUT` de un recurso; mover un material la sube) · índices `(clase_id, tipo, tema_id, creado_en DESC, id DESC)` y `(clase_id, bloque, tema_id, creado_en DESC, id DESC)` · editar un recurso toma su fila `FOR NO KEY UPDATE`; borrar una publicación la toma `FOR UPDATE` antes de descartar sus archivos (CLASES-03a)
2. Tabla "Previsto (DOCS-04), no migrado": quitar las filas `publicaciones.bloque` y `publicaciones.version`. La fila `dudas` se queda hasta 03b.

**A-11 · `docs/ARCHITECTURE-ESSENTIALS.md`.**
1. "Tablas", línea "Previsto (DOCS-04)": quitar el fragmento "· `publicaciones.bloque` (`aprendizaje` / `docente`) y `publicaciones.version` para los recursos (CLASES-03)" (incluido su separador `·` inicial). El resto de la línea no cambia.
2. "Restricciones clave": al final, después de "…una tarea es una publicación de tipo `tarea` con su fila 1:1 en `tareas` (mismo id; TAREAS-01)", agregar (antes del punto final, si lo lleva):
   > · `publicaciones.bloque` solo en materiales, escrito al publicar con el rol del autor; un nulo (solo por compatibilidad) se lee con el bloque del rol del autor (CLASES-03)
3. "Edición concurrente": en "hoy `tareas` (editar la exige; mover de tema también la sube) y `entregas` (…`409 ENTREGA_MODIFICADA`)", reemplazar " y `entregas` (" por ", `entregas` (" y agregar, justo después del paréntesis que cierra `entregas`:
   > y `publicaciones` de los recursos (editar la exige; mover un recurso también la sube; `409 RECURSO_MODIFICADO`; CLASES-03)
4. "Reglas de negocio que tocan código", viñeta "Recursos": cambiar "(recomendación; decide CLASES-03)" por "(CLASES-03a)" y agregar al final de la viñeta:
   > Los temas se gestionan en "Actividades de aprendizaje"; en "Recursos" solo se mueve un recurso. Borrar una publicación toma primero su fila y después descarta sus archivos, para quedar en serie con editar, comentar y mover.

A-01 a A-08 y A-13 no tocan 03a.

### Rutas del commit de 03a (bloque de `git add`)
- **shared:** `shared/src/clases.ts`, `shared/src/index.ts`, `shared/src/tareas.ts`, `shared/src/recursos.ts`.
- **Esquema:** `backend/prisma/schema.prisma`, `backend/prisma/migrations/20261028165322_clases_03_recursos/`.
- **Código del backend:**
  - `backend/src/core/recursos.ts`
  - `backend/src/adapters/db/recursos.ts`, `backend/src/adapters/db/publicaciones.ts`, `backend/src/adapters/db/tareas.ts`, `backend/src/adapters/db/temas.ts`, `backend/src/adapters/db/index.ts`
  - `backend/src/handlers/clases/recursos.ts`, `backend/src/handlers/clases/muro.ts`, `backend/src/handlers/tareas/tareas.ts`, `backend/src/handlers/tareas/temas.ts`
  - `backend/src/app.ts`
  - `backend/src/adapters/README.md`, `backend/src/handlers/README.md` (con M-01)
- **Pruebas del programador:**
  - `backend/src/core/recursos.test.ts`
  - `backend/test/migracion-clases-03a.integracion.test.ts`, `backend/test/recursos.integracion.test.ts`, `backend/test/recursos-autorizacion.integracion.test.ts`, `backend/test/recursos-filtros.integracion.test.ts`
  - `backend/test/ayudas-tareas.ts`, `backend/test/lecturas-consistentes.integracion.test.ts`, `backend/test/bloqueo-usuario.integracion.test.ts`
- **Pruebas del tester:**
  - `backend/test/sesiones-y-cadena.ataque.test.ts`, `backend/test/lecturas-fx-r1.ataque.test.ts`, `backend/test/muro-c-r1.ataque.test.ts`
  - `backend/test/recursos-clases03a-r1.ataque.test.ts`, `backend/test/migracion-clases03a-r1.ataque.test.ts`, `backend/test/recursos-clases03a-r2.ataque.test.ts`
  - `frontend/src/lib/errores-ch3-r2.ataque.test.ts`
- **Documentos:** `docs/trabajo/CLASES-03-reorganizacion-de-la-clase/` (plan, aprobación, reportes, resúmenes y esta revisión), `docs/ESTADO.md`, `docs/ARCHITECTURE.md` y `docs/ARCHITECTURE-ESSENTIALS.md` (con A-09 a A-11 aplicados).
- Antes del `git add`, `git status` no debe mostrar nada más (en particular, ningún archivo de `frontend/` salvo la `*.ataque`, ni `.env`).

### Observaciones y pendientes con destino (para `docs/ESTADO.md` §3, o para 03b)
- **O-1 (O-r1-1 del tester):** mover un recurso a su mismo tema sube su `version` y deja con `409` a quien tenía el formulario abierto, aunque nada cambió. S-03 lo permite. **Destino: 03d.** El tester de 03d comprueba si `MoverElemento` ofrece el tema actual; si lo ofrece, el programador lo declara y el manager decide si basta con que el control no lo ofrezca.
- **O-2 (O-r1-2 del tester):** en `GET …/publicaciones` sin `tipo`, el `puedeBorrar` de un material sale de `puedeBorrar` y no de `puedeBorrarRecurso`. Solo difieren con datos imposibles por la API. **Destino:** el retiro de compatibilidad (A-13), que quita los materiales del muro.
- **O-3:** el `refine` de repetidos de `entregarSchema` quedó redundante con el de `archivoIdsSchema` (T-04). Da dos mensajes iguales y la API usa el primero. **Destino:** el próximo encargo que toque `shared/src/entregas.ts` (probablemente FORO-01) o el `chore` de higiene de pruebas.
- **O-4:** `ejecutorEspiado` y `unaVezDespuesDe` viven en `backend/test/ayudas-gradebook.ts` y ya los usan las pruebas de recursos. Además, la retención de una fila de `publicaciones` está repetida en tres archivos de prueba (`recursos.integracion`, `recursos-clases03a-r1` y `-r2`), porque `conFilaRetenida` no admite esa tabla. **Destino:** el `chore` de higiene de pruebas, junto con el `hookTimeout` de 30 s ya registrado: moverlos a una ayuda común y ampliar `conFilaRetenida`.
- **Para 03b (recordatorios, ya escritos en el plan):** E6 suma `dudas.ts`; C-26 en `errores-ch3-r2` (`dudaId`, `respuestaId`, `resuelta`); lint, test y build del frontend porque cambia `shared/src` (Enmienda 3); y la lección de T-01: en toda escritura compuesta que toque filas hijas, tomar primero la fila padre. `borrarDuda` no toca archivos, pero `crearRespuesta` (`FOR SHARE` de la duda) contra `borrarDuda` debe quedar en serie, como prevé CL3-B07.

### Para el humano
- **Una regla propuesta para `AGENTS.md` o `CLAUDE.md`** ("Tras cada cambio"): hoy dice "`build` si tocaste `shared/`". Propongo "si tocaste `shared/`, `build` de `shared/` y `lint`, `test` y `build` del backend y del frontend". En 03a, la roja de `errores-ch3-r2` estuvo escondida desde el paso 1 porque el plan solo pedía el backend; la Enmienda 3 lo arregla para este encargo, pero no para los siguientes. Lo decide el humano.

### Verificación de M-01 — 03a
Veredicto: M-01 resuelto. **03a APROBADO**; puede hacerse el commit.
Verificación propia: `npm run lint` desde `backend/`, exit 0, con la última línea `> tsc -p tsconfig.json --noEmit && tsc -p tsconfig.test.json`. Prettier, que revisa también los `.md`, pasó.

- **`backend/src/adapters/README.md`** ahora dice lo que hace el código:
  - `:257-262`: `borrarPublicacion` toma antes la fila `FOR UPDATE` y `borrarComentario` no toma candado.
  - `:282-284`: `borrarPublicacion` toma primero la fila `FOR UPDATE` (T-01 y T-02) y después descarta los archivos.
  - Sección "Recursos y filtros por sección", `db/publicaciones.ts`: describe el orden, el SQL etiquetado, el porqué (en serie con editar, mover y comentar; `404` si el borrado va primero) y la decisión por bloque.
  - `db/tareas.ts`: `listarTrabajo` lee `bloque`, que no sale en la respuesta, para el `puedeMover` de un material.
  - Todo coincide con `borrarPublicacion` (`adapters/db/publicaciones.ts`) y `listarTrabajoCon` (`adapters/db/tareas.ts`) del árbol.
- **`backend/src/handlers/README.md`:** `GET …/trabajo` calcula el `puedeMover` de un material con `puedeMoverRecurso`, el actor y `bloqueEfectivo(bloque, autor)`, y el de una tarea con `puedeMoverElemento(relacion)`. Es lo que hace `handlers/tareas/tareas.ts`.
- **Las dos líneas de continuación en la columna 0** (la que empieza con «MOVER_NO_PERMITIDO» en la viñeta de `db/temas.ts` y la que empieza con «EDICION_NO_PERMITIDA» en la de `editarRecurso`) **no rompen** ni la lista ni el código en línea:
  - En CommonMark, una línea sin sangría que sigue a un párrafo de una viñeta es una continuación perezosa del mismo párrafo, también en una viñeta anidada.
  - Un código en línea puede contener un salto de línea, que se muestra como espacio. Las dos se ven como `403 MOVER_NO_PERMITIDO` y `403 EDICION_NO_PERMITIDA` dentro de su viñeta.
  - Prettier las deja así (`--check` pasa) y probablemente las vuelva a poner así si se re-indentan a mano. **Las acepto** sin corregir: el detalle es solo del texto fuente.
- **`git status`:** fuera de lo ya revisado en "Revisión final — 03a", los únicos cambios nuevos son los dos README y los documentos que aplicó el orquestador (`docs/ARCHITECTURE.md` y `docs/ARCHITECTURE-ESSENTIALS.md`, A-09 a A-11, registrados en `aprobacion.md`). Revisé su diff (8 y 10 líneas, más y menos) contra los textos literales de la revisión final y no hay nada más. No cambió código, pruebas ni otros archivos.

**Rutas definitivas del commit de 03a** (cotejadas con `git status`: coinciden con la lista de la revisión final, sin nada de más ni de menos):
- `shared/src/clases.ts`, `shared/src/index.ts`, `shared/src/tareas.ts`, `shared/src/recursos.ts`
- `backend/prisma/schema.prisma`, `backend/prisma/migrations/20261028165322_clases_03_recursos/`
- `backend/src/core/recursos.ts`, `backend/src/core/recursos.test.ts`
- `backend/src/adapters/db/recursos.ts`, `backend/src/adapters/db/publicaciones.ts`, `backend/src/adapters/db/tareas.ts`, `backend/src/adapters/db/temas.ts`, `backend/src/adapters/db/index.ts`, `backend/src/adapters/README.md`
- `backend/src/handlers/clases/recursos.ts`, `backend/src/handlers/clases/muro.ts`, `backend/src/handlers/tareas/tareas.ts`, `backend/src/handlers/tareas/temas.ts`, `backend/src/handlers/README.md`, `backend/src/app.ts`
- `backend/test/migracion-clases-03a.integracion.test.ts`, `backend/test/recursos.integracion.test.ts`, `backend/test/recursos-autorizacion.integracion.test.ts`, `backend/test/recursos-filtros.integracion.test.ts`, `backend/test/ayudas-tareas.ts`, `backend/test/lecturas-consistentes.integracion.test.ts`, `backend/test/bloqueo-usuario.integracion.test.ts`
- `backend/test/sesiones-y-cadena.ataque.test.ts`, `backend/test/lecturas-fx-r1.ataque.test.ts`, `backend/test/muro-c-r1.ataque.test.ts`, `backend/test/recursos-clases03a-r1.ataque.test.ts`, `backend/test/migracion-clases03a-r1.ataque.test.ts`, `backend/test/recursos-clases03a-r2.ataque.test.ts`
- `frontend/src/lib/errores-ch3-r2.ataque.test.ts`
- `docs/trabajo/CLASES-03-reorganizacion-de-la-clase/`, `docs/ESTADO.md`, `docs/ARCHITECTURE.md`, `docs/ARCHITECTURE-ESSENTIALS.md`
