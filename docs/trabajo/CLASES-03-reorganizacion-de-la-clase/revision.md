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

## Verificación del resumen — 03b — implementación
Veredicto: ACEPTADO, sin M-nn. El tester puede atacar 03b (ronda 1).
Fecha: 2026-10-29. CPU al 5 % antes de empezar. Una cosa tras otra, nunca dos suites a la vez. Ningún tiempo agotado.

| Qué | Resumen del programador | Mi corrida |
|---|---|---|
| `npm run build` (`shared/`) | exit 0 | exit 0 |
| `npm run lint` (`shared/`) | `All matched files use Prettier code style!` | Igual |
| `npm run lint` (`backend/`) | exit 0 | exit 0 |
| `npx prisma validate` | `The schema at prisma\schema.prisma is valid 🚀` | Igual |
| `npx vitest list` (`backend/`, `grep -a`) | 2760 casos, 228 archivos; 1, 6, 24 y 8 por archivo | 2760, 228; `core/dudas.test.ts` 1 · `migracion-clases-03b` 6 · `dudas.integracion` 24 · `dudas-autorizacion` 8 (39 con "CL3-B") |
| `npm run test` (`backend/`) | `Test Files  228 passed (228)` · `Tests  2760 passed (2760)` | `Test Files  228 passed (228)` · `Tests  2760 passed (2760)` · `Duration  144.72s (transform 15.73s …)` |
| PA-07 (backend) | 0 `40P01`, deadlock y `P2003` | `40P01` 0 · deadlock 0 · serialización 0 · clientes 0 · `P2003` 0 · "Error no controlado" 10 (el inventario) · `P2028` 5 (los permitidos) |
| `npm run build` (`backend/`) | exit 0 | exit 0 |
| `npm run lint` (`frontend/`) | exit 0 | exit 0 |
| `npx vitest list` (`frontend/`, `grep -a`) | 5310, 237 | 5310, 237 |
| `npm run test` (`frontend/`) | `Test Files  237 passed (237)` · `Tests  5310 passed (5310)` | Igual · `Duration  184.32s` |
| `npm run build` (`frontend/`) | `✓ built in 1.42s` | `✓ built in 712ms`, exit 0 |

Todas las cifras coinciden.

### Contraste
- **CL3-B01 a CL3-B10:** cada viñeta tiene su caso con el título del resumen. Leí el código de:
  - **CL3-B01:** el patrón de CAL-1A01, con un esquema propio, las migraciones hasta la anterior, datos de antes y la de 03b. Prueba que los comentarios de antes siguen sin duda. `comentarios_un_solo_contexto` rechaza los cinco casos inválidos (ninguno, y dos o tres contextos) y acepta cada contexto solo. También prueba `dudas_resuelta_completa`, las FK (la cascada a respuestas y desde la clase, y `RESTRICT` para el autor y para quien marcó) y los dos índices.
  - **CL3-B03:** el orden, el cursor y las banderas `propia`, `puedeBorrar` y `puedeMarcar` para cinco personas.
  - **CL3-B07:** la retención de la fila de `dudas` con `FOR UPDATE`, `formadasDetrasDe` con el pid propio y `timeout: 30_000`, en los dos órdenes: `201` y `204` con la respuesta borrada en cascada; `204` y `404` sin insertar.
  - **CL3-B10:** una lectura estática de que el handler no encola, y un recorrido de todas las rutas sin trabajos en `pgboss.job`.
- **E6:** el diff es solo la línea de comentario, el título y `"dudas.ts"` en la lista.
- **Migración:** `20261029153231_clases_03_dudas/migration.sql`, SHA-256 `91c42c41…0dff`. Es el que registró el orquestador tras la confirmación literal del humano, y coincide con §D-4: tabla `dudas` con sus FK (clase en cascada; autor y `resuelta_por` en `RESTRICT`), índice `(clase_id, creado_en DESC, id DESC)`, `comentarios.duda_id` con FK en cascada e índice `(duda_id, creado_en, id)`, `dudas_resuelta_completa` y el reemplazo de `comentarios_un_solo_contexto` con el mismo nombre y tres contextos. Es compatible hacia atrás, porque toda fila de antes tiene `duda_id` nulo. No tiene `DO $$` y no lleva sufijos vigilados.
- **Bloqueos:**
  - `crearRespuesta` toma la duda `FOR SHARE` y no inserta si no la encuentra.
  - `borrarDuda` toma la fila `FOR UPDATE` antes de leer el autor y borrar; las respuestas caen en cascada.
  - `marcarDuda` es un solo `UPDATE` condicionado (`resueltaEn: null` al marcar, así que es idempotente) y vuelve a leer; con la fila borrada responde `404`.
  - `borrarRespuesta` toca una sola fila y no bloquea la duda, así que no hay ciclo con `borrarDuda`.
  - Es la lección de T-01 y T-02 de 03a, y la suite no muestra ningún interbloqueo.
- **Cadena de middleware de las siete rutas** (`handlers/clases/dudas.ts`), igual que "Autorización" y §D-5:
  - `GET …/dudas` y `GET …/respuestas`: estudiante, maestro y admin · inscripción.
  - `POST …/dudas` y `POST …/respuestas`: estudiante y maestro · inscripción. El admin recibe `403 ROL_NO_PERMITIDO`.
  - `PUT …/resuelta`: maestro y admin · propiedad. El estudiante, también el autor, recibe `403`.
  - Los dos `DELETE`: los tres roles · inscripción, con `puedeBorrar` de `core/autoria.ts`.
  - `puedeMarcarDuda` vive en `core/` y no hay `.rol` en el handler.
- **Datos que no salen:** `SELECT_DUDA` no lee `resuelta_por` y la respuesta no lleva estado de pago, correo, rol ni quién marcó. Lo prueban CL3-B03 y CL3-B05, y el caso de éxito de `dudas-autorizacion`, que busca también `resueltaPor` y `marcadaPor`.
- **Cola:** no se encola nada (CL3-B10).
- **V-01:** las 229 `*.ataque` contra la tabla de la ronda 2 de 03a solo difieren en cuatro, las de la ronda 0 de 03b: `sesiones-y-cadena` (C-1), `lecturas-fx-r1` (C-2), `lecturas-fx-r2` (C-3) y `errores-ch3-r2` (C-26). Las cuatro tienen el SHA-256 de la tabla de la ronda 0 de 03b.
- **Enmienda 2:**
  - El SQL crudo nuevo está solo en `adapters/db/dudas.ts`, y hay dos `instantaneaUnica: true`.
  - Mi réplica de `comentariosDe` sobre `app.ts`, `adapters/db/index.ts` y `adapters/db/tareas.ts` da 0 palabras vigiladas.
  - No hay `LOCK TABLE` y la retención lleva `timeout`.
- **"No se toca":** desde `a0ae116` solo cambiaron, fuera de los archivos nuevos de 03b, `schema.prisma`, los dos README, `adapters/db/index.ts`, `app.ts`, `shared/src/index.ts`, E6, las cuatro `*.ataque` del tester y los documentos del orquestador.

### Desviaciones declaradas
1. **La relación de Prisma se llama `marcadaPor`.** Aceptada: la columna sigue siendo `resuelta_por`; es solo el nombre de la relación, que choca con el del campo.
2. **`marcarDuda` recibe `ahora` del handler en vez de usar `now()` de la base.** Aceptada: la fecha sigue siendo del servidor, en UTC, y la idempotencia no depende de ella (el `UPDATE` es condicionado). Deja fijar el reloj solo sobre `Date`. Diferencia que se nota: `creado_en` sale del reloj de la base y `resuelta_en` del de Node, que en el mismo Droplet coinciden.
3. **`borrarDuda` toma la fila `FOR UPDATE` antes de borrar.** Aceptada: va más allá del plan ("lee el autor") en la dirección que enseñaron T-01 y T-02. Deja en serie el borrado y la respuesta en curso, coincide con "Acceso a datos" ("`FOR SHARE` contra el `DELETE`") y no rompe ningún inventario (`dudas.ts` ya está en E6).
4. **Las ayudas de retención están dentro del archivo de prueba.** Aceptada por el mismo motivo que en 03a. Con esta ya son cuatro copias; se suma a O-4 (`docs/ESTADO.md` §3, el chore de higiene de pruebas).

## Revisión final — 03b
Veredicto: **APROBADO**, sin M-nn. Puede hacerse el commit de 03b.
Fecha: 2026-10-29. CPU al 9 % antes de empezar. Una cosa tras otra, nunca dos suites a la vez. Ningún tiempo agotado.

Verificación propia:
| Qué | Última línea |
|---|---|
| `npm run build` (`shared/`) | exit 0 |
| `npm run lint` (`shared/`) | `All matched files use Prettier code style!` |
| `npm run lint` (`backend/`) | exit 0 |
| `npx prisma validate` | `The schema at prisma\schema.prisma is valid 🚀` |
| `npx vitest list` (`backend/`, `grep -a`) | 2774 casos, 229 archivos |
| `npm run test` (`backend/`) | `Test Files  229 passed (229)` · `Tests  2774 passed (2774)` · `Duration  143.80s (transform 15.55s, setup 6.91s, import 281.69s, tests 1135.65s)` |
| PA-07 (backend) | `40P01` 0 · deadlock 0 · serialización 0 · clientes 0 · `P2003` 0 · "Error no controlado" 10 (el inventario) · `P2028` 5 (los permitidos) |
| `npm run build` (`backend/`) | exit 0 |
| `npm run lint` (`frontend/`) | exit 0 |
| `npx vitest list` (`frontend/`, `grep -a`) | 5310 casos, 237 archivos |
| `npm run test` (`frontend/`) | `Test Files  237 passed (237)` · `Tests  5310 passed (5310)` · `Duration  174.59s` |
| `npm run build` (`frontend/`) | `✓ built in 735ms`, exit 0 |

Coinciden con la ronda 1 del tester (229 / 2774 y 237 / 5310).

### Lo que revisé
- **V-01:** las 230 `*.ataque` del árbol son las 230 de la tabla de la ronda 1 de 03b, con el mismo SHA-256 una por una: 0 diferencias, ninguna de más ni de menos. Desde `<K3a>` solo cambiaron las cuatro de la ronda 0 (C-1, C-2, C-3 y C-26) y se sumó la nueva del tester (`dudas-clases03b-r1`). El programador no tocó ninguna.
- **"No se toca":**
  - Dentro de los paquetes, contra `<K3a>` = `a0ae116`: solo cambiaron los archivos nuevos de 03b, `schema.prisma`, `adapters/db/index.ts`, `app.ts`, `shared/src/index.ts`, los dos README, E6 (de la lista cerrada) y las `*.ataque` del tester.
  - Fuera de los paquetes, contra `<R>` = `689c636`: desde `a0ae116` solo cambiaron `docs/ESTADO.md` y `docs/trabajo/CLASES-03-…/`; `docs/ARCHITECTURE*.md` todavía no.
  - No se tocó nada de `middleware/`, `adapters/auth/`, `config/`, `workers/`, `core/autoria.ts`, `publicaciones.ts`, `entregas.ts` ni de `infra/`.
- **Requisitos:**
  - **RF-64:** un hilo abierto de la clase. Los inscritos y los maestros preguntan y responden; todos los de la clase leen. Los maestros de la clase y el admin marcan y quitan «Resuelta». No se califica, no se edita, es solo texto y está separado del hilo privado (las rutas no alcanzan otros contextos; CL3-B09, CL3b-r1-08).
  - **P-07:** el admin lee, marca y borra, sin escribir (`403 ROL_NO_PERMITIDO` al crear una duda o responder). El estudiante, incluido el autor, no marca.
  - **RN-07:** `puedeBorrar` de `core/autoria.ts`. El admin borra todo, cada autor lo suyo y un maestro lo de un estudiante, nunca lo de otro maestro (CL3-B06, CL3-B08, CL3b-r1-11). Borrar la duda se lleva sus respuestas (DH-05).
  - **RN-09:** un alumno restringido no ve Dudas (CL3b-r1-12).
- **Autorización:** las siete rutas llevan la cadena de §D-5 y de "Autorización". Ninguna respuesta lleva estado de pago, correo, rol ni quién marcó, y no se encola nada (CL3-B03, CL3-B10, CL3b-r1-14).
- **Pruebas requeridas:** CL3-B01 a CL3-B10 con su caso; las contrasté en "Verificación del resumen — 03b — implementación". La ronda 1 suma 14 casos `CL3b-r1`, todos en verde.
- **Migración:** `20261029153231_clases_03_dudas/migration.sql`, SHA-256 `91c42c41…0dff`. Es la que confirmó el humano y coincide con §D-4. Es compatible hacia atrás: tabla y columna nuevas, y un `CHECK` de tres contextos con el mismo nombre que acepta todo lo de antes.
- **README (la lección de M-01 de 03a):** `adapters/README.md`, sección "Dudas en `db/dudas.ts`", describe lo que hace el código:
  - `borrarDuda` toma la fila `FOR UPDATE` antes de leer el autor y borrar;
  - `crearRespuesta` toma la duda `FOR SHARE` y no inserta sin fila;
  - `marcarDuda` es un `updateMany` condicionado e idempotente, con la fecha que pasa el handler;
  - `borrarRespuesta` toca una sola fila;
  - el párrafo de concurrencia y el de aislamiento están completos.
  
  La lista de lecturas con instantánea única suma `listarDudas` y `listarRespuestas`. `handlers/README.md` describe las siete rutas con su cadena, que el admin no escribe y que nada se encola. Ninguno describe un orden viejo.
- **Estilo (`CLAUDE.md`):** `core/` puro. El SQL crudo va etiquetado y parametrizado, solo en `dudas.ts` (Enmienda 2). No hay consultas en ciclos y los handlers son delgados.

### Arbitraje de O-03b-1 (marcar contra quitar «Resuelta» a la vez)
**Basta con dejarla para 03e; no requiere nada en 03b.**
- El resultado es siempre el de un orden en serie válido: marcar sin efecto y después quitar. La fila nunca queda a medias (`dudas_resuelta_completa`), y la respuesta de marcar dice la verdad del momento en que se leyó.
- Tomar la fila `FOR UPDATE` en `marcarDuda` solo cambiaría qué orden en serie gana, no la experiencia: quien marcó vería «Resuelta» y, en la siguiente lectura, ya no.
- En 03e, el plan ya hace lo que hace falta: `useMarcarDuda` invalida `claveDudas` al tener éxito (§D-9.4) y la lista se vuelve a pedir, así que la persona ve el estado real enseguida.
- **Destino:** 03e. El tester de 03e lo puede atacar como estado vecino de CL3-E04 (marcar con una recarga que trae la duda sin resolver: el botón y la insignia siguen al dato nuevo, sin perder el foco).

### Documentos a aplicar al cerrar 03b (DH-10, autorizados por el humano)
**Lista exacta para 03b:** A-09 (las partes de 03b), A-10 (las partes de 03b) y A-11 (las partes de 03b). **A-12 no tiene nada de 03b.** En `docs/ESTADO.md`, el orquestador actualiza el estado del encargo (§2) y las observaciones de abajo (§3). Los textos ya están ajustados a lo que quedó en el código: `borrarDuda` con `FOR UPDATE`, el admin que marca y borra sin escribir y quién marcó nunca en la respuesta.

**A-09 · `docs/ARCHITECTURE.md` §7.**
1. Fila `clases`: al final de la celda de rutas, después de "…(publicaciones, tareas y recursos)", agregar:
   > · Desde CLASES-03b: `GET/POST /clases/{claseId}/dudas` (la lista, de la más reciente a la más antigua, paginada; publicar: alumnos inscritos y maestros de la clase) · `PUT /clases/{claseId}/dudas/{dudaId}/resuelta` (marcar y quitar «Resuelta»: maestros de la clase y admin; marcar dos veces no cambia la fecha) · `DELETE /clases/{claseId}/dudas/{dudaId}` (con sus respuestas) · `GET/POST /clases/{claseId}/dudas/{dudaId}/respuestas` · `DELETE /clases/{claseId}/dudas/{dudaId}/respuestas/{respuestaId}`. El admin lee, marca y borra, sin escribir (`403 ROL_NO_PERMITIDO`); un estudiante, también el autor, no marca. Quién marcó una duda no sale en ninguna respuesta, y nada de esto encola avisos (los decide NOTIFICACIONES)
2. "Rutas previstas (DOCS-04)": quitar entera la viñeta "**CLASES-03 (lo que falta después de 03a):** …".

**A-10 · `docs/ARCHITECTURE.md` §14.**
1. Fila `comentarios`:
   - En la columna de columnas, después de "`entrega_id` (FK `CASCADE`; ENTREGAS-01a)", agregar ", `duda_id` (FK `CASCADE`; CLASES-03b)".
   - En la de restricciones, reemplazar "índices `(publicacion_id, creado_en, id)` y `(entrega_id, creado_en, id)` · `CHECK` de exactamente un contexto (`publicacion_id` o `entrega_id`)" por:
     > índices `(publicacion_id, creado_en, id)`, `(entrega_id, creado_en, id)` y `(duda_id, creado_en, id)` · `CHECK comentarios_un_solo_contexto`: exactamente un contexto entre `publicacion_id`, `entrega_id` y `duda_id` (CLASES-03b, mismo nombre)
   - Al final de la celda, después de "…se lee `FOR SHARE` en la misma transacción", agregar:
     > ; al responder una duda, la duda se lee `FOR SHARE`
2. Fila nueva `dudas`, justo después de la fila `comentarios`:
   > | `dudas` | `id`, `clase_id` (FK `CASCADE`), `autor_id` (FK `RESTRICT`), `texto`, `resuelta_en`, `resuelta_por` (FK `RESTRICT`), `creado_en`, `actualizado_en` | índice `(clase_id, creado_en DESC, id DESC)` · `CHECK dudas_resuelta_completa`: `resuelta_en` y `resuelta_por` juntos · sus respuestas son `comentarios` con `duda_id`, que se borran con ella · `resuelta_por` nunca sale en una respuesta · borrar una duda toma primero su fila `FOR UPDATE`, así queda en serie con una respuesta en curso (CLASES-03b) |
3. Diagrama `erDiagram`: después de la línea `  entregas ||--o{ comentarios : hilo_privado`, agregar:
   > ```
   >   clases ||--o{ dudas : pregunta
   >   usuarios ||--o{ dudas : escribe
   >   dudas ||--o{ comentarios : responde
   > ```
4. Tabla "Previsto (DOCS-04), no migrado": quitar la fila `dudas`.

**A-11 · `docs/ARCHITECTURE-ESSENTIALS.md`.**
1. "Tablas": en la lista, después de "`comentarios`", agregar " · `dudas` (CLASES-03)".
2. Línea "Previsto (DOCS-04)": quitar el fragmento "· tabla `dudas`, con sus respuestas en `comentarios` como tercer contexto (`duda_id`) (CLASES-03) " (incluido su separador `·`). El resto no cambia.
3. "Restricciones clave": reemplazar "`comentarios` con exactamente un contexto: `publicacion_id` (muro) o `entrega_id` (hilo privado; ENTREGAS-01)" por:
   > `comentarios` con exactamente un contexto: `publicacion_id` (muro y recursos), `entrega_id` (hilo privado; ENTREGAS-01) o `duda_id` (respuestas de una duda; CLASES-03)
4. "Reglas de negocio que tocan código", viñeta "Dudas (DOCS-04; CLASES-03)": agregar al final (es la lección de 03a, igual que en "Recursos"):
   > Responder toma la duda `FOR SHARE` y borrarla la toma `FOR UPDATE` antes de borrar, así quedan en serie; quién marcó «Resuelta» no sale en las respuestas (CLASES-03b).

A-01 a A-08, A-12 y A-13 no tocan 03b.

### Rutas del commit de 03b (cotejadas con `git status`)
- **shared:** `shared/src/dudas.ts`, `shared/src/index.ts`
- **Esquema:** `backend/prisma/schema.prisma`, `backend/prisma/migrations/20261029153231_clases_03_dudas/`
- **Código del backend:**
  - `backend/src/core/dudas.ts`, `backend/src/core/dudas.test.ts`
  - `backend/src/adapters/db/dudas.ts`, `backend/src/adapters/db/index.ts`, `backend/src/adapters/README.md`
  - `backend/src/handlers/clases/dudas.ts`, `backend/src/handlers/README.md`
  - `backend/src/app.ts`
- **Pruebas del programador:** `backend/test/ayudas-dudas.ts`, `backend/test/migracion-clases-03b.integracion.test.ts`, `backend/test/dudas.integracion.test.ts`, `backend/test/dudas-autorizacion.integracion.test.ts`, `backend/test/bloqueo-usuario.integracion.test.ts`
- **Pruebas del tester:** `backend/test/sesiones-y-cadena.ataque.test.ts`, `backend/test/lecturas-fx-r1.ataque.test.ts`, `backend/test/lecturas-fx-r2.ataque.test.ts`, `backend/test/dudas-clases03b-r1.ataque.test.ts`, `frontend/src/lib/errores-ch3-r2.ataque.test.ts`
- **Documentos:** `docs/trabajo/CLASES-03-reorganizacion-de-la-clase/` (`aprobacion.md`, `reporte-tester.md`, `revision.md` y `resumen-programador-03b.md`), `docs/ESTADO.md`, y `docs/ARCHITECTURE.md` y `docs/ARCHITECTURE-ESSENTIALS.md` con A-09 a A-11 aplicados.
- Antes del `git add`, `git status` no debe mostrar nada más.

### Observaciones con destino (para `docs/ESTADO.md` §3)
- **O-03b-1 (marcar contra quitar «Resuelta» a la vez):** el resultado es siempre un orden en serie válido. **Destino: 03e**, como estado vecino de CL3-E04: la invalidación de `claveDudas` tras marcar muestra el estado real.
- **O-4 (se suma a la de 03a):** la retención de una fila con `FOR UPDATE` y `formadasDetrasDe` ya está copiada en cinco archivos de prueba (`recursos.integracion`, `recursos-clases03a-r1` y `-r2`, `dudas.integracion` y `dudas-clases03b-r1`), porque `conFilaRetenida` no admite `publicaciones` ni `dudas`. **Destino:** el `chore` de higiene de pruebas: ampliar `conFilaRetenida` a cualquier tabla y mover allí también `ejecutorEspiado` y `unaVezDespuesDe`.
- **O-1, O-2 y O-3 de 03a** siguen con su destino (03d, A-13 y FORO-01 o el `chore`).

## Verificación de la Enmienda 4 — CLASES-03
Veredicto: APROBADO, sin M-nn. La ronda 0 de 03c1 puede arrancar.
Verificación propia: lint, test y build no aplican. Es una enmienda del plan y el código no cambió desde `<K3b>` = `e502381`: `git status` solo muestra `AGENTS.md`, `docs/ESTADO.md`, `aprobacion.md` y `plan.md`.

Fecha: 2026-10-29.

### 1. Integridad y cotejo
- SHA-256 de `plan.md`: `2ec5f98792f1cab134b5bfb649fb50191c0a72412bb9a30b1809651c7746ee31` (1059 líneas); de la copia previa: `204515a6604c786ae27376d87d5e6c5fd9543b50e0834e3780a41b6791a85971`. Los dos coinciden con `aprobacion.md`.
- `AGENTS.md`: SHA-256 `bb98590852939b0d5f80a177db57da29f2dffffd99346b2bcaaac67d9a4dc787`, igual al que registró el orquestador con la autorización del humano. El diff es una sola viñeta en "Pruebas" (backend y frontend completos si se toca `shared/`, con `grep -a`), que coincide con la propuesta de "Revisión final — 03a".
- `git diff --no-index` completo: 17 hunks, cada uno con su id y ninguno fuera de la enmienda:

| Hunk | Dónde | Id |
|---|---|---|
| 1 | Encabezado | E4-1 |
| 2 | DH-12 | E4-11 |
| 3 | S-14 y S-15 | E4-5 |
| 4 | §D-9.2 | E4-4 |
| 5 | §D-9.3 | E4-4 |
| 6 | §D-13, `TEXTOS_MURO` | E4-2 |
| 7 | §D-13, `TEXTOS_DUDAS` | E4-6 |
| 8 | §D-14, matriz de 03e | E4-7 |
| 9 | §D-R0, C-16 | E4-3 |
| 10 | CL3-C18 | E4-3 |
| 11 | CL3-E02 | E4-8 |
| 12 | CL3-E13 a E15 | E4-8 |
| 13 | Lista cerrada de 03c1, `muro-view.test.tsx` | E4-3 |
| 14 | Puntos de ataque de 03e | E4-10 |
| 15 | A-06 | E4-9 |
| 16 | Paso 3 de 03e | E4-8 |
| 17 | Tabla de la Enmienda 4 | — |

- No cambian el alcance, el diseño de datos, las rutas ni ningún DH salvo DH-12, que queda cerrada.

### 2. Corrección 1 (vacío de Avisos del admin)
- Es literal del humano: "Publica el primer aviso de esta clase.". La condición del humano se cumple: el admin publica anuncios en cualquier clase (RF-59; la ruta `POST …/publicaciones` admite al admin con `propiedad`, `handlers/clases/muro.ts`).
- **Mi grep de los textos viejos de los vacíos en `frontend/src` (pruebas):** "Aún no hay publicaciones en esta clase." aparece solo en `muro-02c-r1.ataque.test.tsx:239`, en C-16 y nombrada por la enmienda, y en `muro-view.test.tsx:137` y `:140` (PR-2C09). "Publica el primer anuncio o material de tu clase." aparece solo en `muro-view.test.tsx:179`. Ninguna prueba usa las constantes `vacio*` de `TEXTOS_MURO`. **La única `*.ataque` es la de C-16.**
- **Pruebas normales:** `muro-view.test.tsx` ya está en la lista cerrada de 03c1 ("Solo las aserciones sobre los textos de §D-13 (vacíos, …)"). La nota de la Enmienda 4 nombra `:137-140` y `:179`, y la misma fila cubre también `:173`, el vacío del estudiante ("Tu maestro aún no ha publicado nada en esta clase.", que pasa a "Aún no hay avisos en esta clase." desde el plan original). No hace falta enmendar más: es un "vacío" de la misma fila. El programador lo nombra en su resumen.

### 3. Corrección 2 ("Responder" en una duda sin respuestas), S-14 y S-15
- **Lo literal del humano se cumple:** "Responder" en lugar de "Ver respuestas (0)" (CL3-E14 exige que "Ver respuestas (0)" no aparezca nunca); al pulsarlo se despliega el bloque con el formulario y el foco va a "Escribe una respuesta"; con n ≥ 1 sigue "Ver respuestas (n)".
- **Ningún nombre accesible repetido dentro de una duda:** plegado con 0 respuestas no hay formulario, así que "Responder" es uno solo; desplegado, el control se llama "Ocultar respuestas" (S-15) y el único "Responder" es el botón de enviar. Entre dudas distintas cada fila tiene su "Responder", el mismo patrón que "Ver comentarios (n)" en el muro, ya aceptado; cada uno vive dentro de su `li`.
- **El foco en los estados vecinos:**
  - El control es un solo elemento en todos sus estados: conserva el foco al cambiar de texto, y CL3-E14 lo comprueba por referencia.
  - Si el conteo baja a 0 con el bloque desplegado, sigue "Ocultar respuestas" y al plegar pasa a "Responder" (estudiante y maestro), en el mismo botón.
  - Si el control desaparece para el admin con el foco dentro, el foco va a la fila de la duda (`li` con `tabIndex={-1}`), nunca a `<body>`. Lo cubren S-14 y CL3-E15, en los dos casos: plegado con el conteo que baja a 0 y desplegado que se pliega con 0.
  - Si llega la primera respuesta, el bloque sigue desplegado y el control sigue en "Ocultar respuestas" (S-15, CL3-E14). Con el bloque plegado, el texto pasa de "Responder" a "Ver respuestas (1)" en el mismo botón.
  - Si el admin está en una duda con 0 respuestas y llega una, el control aparece; no había foco que perder.
  - Doble clic en "Responder" despliega y pliega sin ningún `POST` (§D-14).
  
  No encuentro un estado vecino sin destino de foco.
- **Cobertura:** CL3-E02, E13 (R9, el camino "Responder" con 0), E14 y E15. La matriz de §D-14 distingue el control que despliega del botón de enviar y suma la recarga que cambia el conteo. Los puntos de ataque de 03e incluyen el paso de 0 a 1 y de 1 a 0, el admin y "Ver respuestas (0)".
- **A-06 coincide con §D-13** (`TEXTOS_DUDAS.verRespuestas(n)` solo con n ≥ 1, `.responder` con 0 para estudiante y maestro, `.ocultarRespuestas` desplegado) y con §D-9.2. No los contradice.
- **S-14 y S-15 bastan como suposiciones; no hace falta una decisión del humano.** Las dos se deducen de reglas que el humano ya decidió:
  - **S-14:** el admin no escribe (P-07) y, con 0 respuestas, no hay nada que leer, así que un "Responder" para él llevaría a un formulario que no puede usar.
  - **S-15:** cumple "un solo nombre accesible por control" y la regla de foco del mismo elemento que ya se usa en "Marcar como resuelta".
  
  Ninguna cambia lo que el humano pidió. Conviene que el orquestador se las mencione en el próximo resumen al humano, por transparencia, sin pedirle respuesta; las verá en la comprobación H-5 de 03e.

### Detalle menor
- La nota de E4-3 nombra `muro-view.test.tsx:137-140` y `:179`, pero no `:173` (el vacío del estudiante). Como dije arriba, la fila de la lista cerrada lo cubre; basta con que el programador lo mencione.

## Verificación de la Enmienda 5 — CLASES-03
Veredicto:
- **Para 03c1: APROBADA.** Con la autorización del humano para la fila condicionada, el programador puede cerrar 03c1.
- **Para 03d y 03e: CAMBIOS REQUERIDOS (M-01).** El barrido no encontró una prueba normal que romperá en 03d y en 03e. M-01 no frena 03c1 ni 03c2; debe corregirse antes de la ronda 0 de 03d.

Verificación propia: lint, test y build no aplican. Es una enmienda del plan; verifiqué con el diff completo, greps y lectura del código y de las pruebas.

Fecha: 2026-10-29.

### 1. Integridad y cotejo
- SHA-256 de `plan.md`: `1e5460951f1a9cf95afca865c1e95967b6d7e5e526687409f6e72addad6a5ae6` (1102 líneas); de la copia previa: `2ec5f98792f1cab134b5bfb649fb50191c0a72412bb9a30b1809651c7746ee31`. Los dos coinciden con `aprobacion.md`.
- `git diff --no-index` completo: 7 hunks, cada uno con su id y ninguno fuera de la enmienda:

| Hunk | Dónde | Id |
|---|---|---|
| 1 | Encabezado | E5-1 |
| 2 | §D-R0, "Barrido de pruebas normales del frontend…" | E5-5 |
| 3 | Lista cerrada de 03c1: `router-01d` ampliada, `marco.test.tsx:305` y `features/tareas/recuperar-ch3.test.tsx` (condicionada) | E5-3, E5-2 y E5-4 |
| 4 | Lista cerrada de 03d y 03e (`lib.test.ts`, `secciones-03c1.test.tsx`, `app/clase-03c1.test.tsx`) | E5-6 |
| 5 | R-13 | E5-4 |
| 6 | "No se toca" (la excepción condicionada) | E5-4 |
| 7 | Tabla de la Enmienda 5 | — |

- No cambian el alcance, el diseño, las pruebas requeridas ni ningún DH.

### 2. Las filas de 03c1
- **`app/marco.test.tsx:305` (O-14):** solo `"Publicaciones"` → `"Avisos"` en la aserción `heading` y en el título del caso; "Nada más del archivo". Correcto: es el `h2` solo para lectores de §D-13 ("Avisos"), el mismo cambio que C-16 hizo en `foco-02c-r3`, `-r4` y `-r5`.
- **`app/router-01d.test.tsx:178-200` (CAL-1D06):** las aserciones del indicador (`w-1/5`, `grid-cols-5`, `translate-x-[…]`) pasan a medidas simuladas, como en `clase-layout.test.tsx`, y las rutas `…/alumnos` y `…/maestros`, a `…/personas`. "Ninguna otra aserción". Correcto: es lo que cambió DH-03 (indicador medido) y DH-09 (Personas), y la condición de `vi.restoreAllMocks` evita que las medidas simuladas se filtren a otros casos.
- **`features/tareas/recuperar-ch3.test.tsx:449/:470` (CH3-A19):** solo el nombre del enlace (`/Trabajo de clase/` → `/Actividades de aprendizaje/`) y el título, condicionado a la autorización del humano. "No se toca" lo dice con su excepción condicionada. Correcto.

### 3. Barrido propio (pruebas normales y `*.ataque` del frontend)
Grep de "Publicaciones", "Trabajo de clase", "Muro", `name: "Alumnos"`/`"Maestros"`, `w-1/N`, `grid-cols-N`, `translate-x-[`, `translate-x-full`, "Material", "Publicar material", "Tipo de publicación" y "Ver más publicaciones"; y, para 03d, `tipo: "material"`, `erroresDeLaPublicacionDeApi`, `CAMPOS_PINTADOS_DE_LA_PUBLICACION` y `CLASES_DE_POSICION_DEL_INDICADOR`.
- **03c1:** coincide con E5-5. Las únicas que rompen, fuera de lo que ya cubren C-7 a C-20, son las tres normales de esta enmienda y `foco-pestana-02d-r3` (C-20). Las demás coincidencias son títulos, comentarios, rutas propias del árbol de la prueba o el marco del admin (`/admin/maestros`), y la corrida de 03c1 las dio verdes.
- **03c2:** no rompe nada nuevo. Las pruebas con materiales en "Trabajo de clase" (`app/clase-03c1.test.tsx`, `consultas-ch3.test.tsx`, `trabajo-view.test.tsx:385` y `formularios-ch3.test.tsx:622-629`) siguen valiendo, porque sus dobles comparan el `pathname` y la rama de material se conserva (DH-08). Las cuentas de `GET …/temas` ya están en C-25 y en la fila de `trabajo-view.test.tsx` de 03c2.
- **03d y 03e:** las de "Material" y del grupo de tipo están cubiertas por C-10, C-23 y las filas de 03d (`formulario-publicacion`, `muro-view`, `recuperar-ch3` y `formularios-ch3` de `features/clases`). `publicacion-del-muro.test.tsx:136` y `adjuntos-de-publicacion.test.tsx:194` no rompen (DH-08). `lib/errores-de-api.test.ts:389` usa el esquema de `shared/`, que no cambia. La referencia de `estatico-r1.ataque:155` a `CLASES_DE_POSICION_DEL_INDICADOR` es solo un comentario; la lista de valores arbitrarios ya está en C-7. **Falta una: M-01.**

### Problemas que bloquean
#### M-01 — `features/clases/errores-ch3.test.ts` romperá en 03d y en 03e, y no está en sus listas cerradas
- **Dónde:** `frontend/src/features/clases/errores-ch3.test.ts` (prueba normal de CHORE-03). Hoy solo figura en la lista de 03c1, y solo para los textos de §D-13.
- **Por qué:**
  - Fija los modos de la publicación: `MATERIAL = erroresDeLaPublicacionDeApi(error, "material")` (`:174`), las filas `"material"` de `FILAS_POR_MODO` (`:185-186`) y `MODOS` (`:193`), y `CAMPOS_PINTADOS_DE_LA_PUBLICACION` exacto `{ anuncio: ["texto"], material: ["titulo", "texto"] }` en CH3-B15 (3) (`:246-249`). §D-8.7 (03d) deja `CAMPOS_PINTADOS_DE_LA_PUBLICACION` en `{ anuncio: ["texto"] }` y `erroresDeLaPublicacionDeApi` sin parámetro de tipo (o con `"anuncio"` fijo): rompe en `tsc` (lint) y en la aserción.
  - Fija también las llamadas a `erroresDeFormularioClases(` en CH3-B15 (4) (`:250-268`): exactamente 4 en `lib.ts`. `erroresDelRecursoDeApi` (03d, §D-8.5) es la quinta; `erroresDeLaDudaDeApi` y `erroresDeLaRespuestaDeApi` (03e, §D-9.4) suman dos más. Rompe en 03d y otra vez en 03e.
  - Es una PARADA segura en las dos subentregas; justo lo que la regla de listas cerradas por grep quiere evitar. El barrido de E5-5 no la encontró porque buscaba "Material" entre comillas y aquí aparece como `"material"` en un parámetro, y porque no cubría los conteos estáticos de `features/clases`.
- **Qué se espera (enmienda corta del arquitecto, antes de la ronda 0 de 03d):** filas en las listas cerradas:
  - **03d:** en `errores-ch3.test.ts`, el modo `"material"` sale de `FILAS_POR_MODO` y `MODOS` (o se reemplaza por el formulario de recursos con `erroresDelRecursoDeApi`, si §D-8 lo deja así); CH3-B15 (3) pasa a `{ anuncio: ["texto"] }` (y suma `CAMPOS_PINTADOS_DEL_RECURSO` si se quiere fijar); y CH3-B15 (4) cuenta 5 llamadas en `lib.ts`. Nada más.
  - **03e:** CH3-B15 (4) cuenta 7 en `lib.ts`, o las que dé el diseño final de §D-9.4. Si `useCrearDuda` o `useResponder` llaman `erroresDeFormularioClases(` en `hooks.ts`, también cambia el conteo de `hooks.ts`; el arquitecto fija cuál de las dos formas usa el plan, para que el conteo sea exacto.
  - Además, que el barrido de 03d y 03e incluya los conteos estáticos de `features/clases` (`errores-ch3.test.ts`, `estatico-r1.ataque`, `estatico-02c-r1.ataque`, `errores-ch3-r1.ataque`) contra los archivos nuevos y las funciones nuevas de §D-8 y §D-9, no solo los textos.

### 4. R-13
**La recomendación es correcta** (autorizar el cambio de una línea y del título). CH3-A19 protege un camino de recuperación ("ir a la sección y volver al detalle quita el error"), no el nombre de la sección. El nombre lo cambió una decisión del humano (DH-12), y su hermana `*.ataque` ya cambió por C-17. Las alternativas están bien costeadas:
- conservar el nombre viejo en la interfaz contradice §D-13;
- dejarla roja lo prohíbe `AGENTS.md`;
- un enlace falso es ruido para el lector de pantalla;
- moverla a `app/` también toca `features/tareas`, porque borra el caso, y pide además autorización para borrar.

No hay ninguna más barata.

### 5. Adenda 2 del tester (C-20, `foco-pestana-02d-r3.ataque.test.tsx:311`)
Conserva lo que protegía. El diff es +7/−2: el montaje pasa a la ruta del estudiante, se conservan las dos vistas juntas (`AlumnosView` y `PersonasView`) y se agrega un comentario de motivo. Lo protegido sigue igual: dos instancias de `useFocoAlCargarMas` montadas a la vez, el foco de «Ver más» de «Personas» en su fila nueva y el roster sin tocarla. `AlumnosView` solo lee `:claseId`, así que el roster es el mismo. El montaje anterior tampoco era un camino real de la app. El tester reconoce el error de su ronda 0 ("sin cambio" bajo C-13). Correcto. Su sugerencia de atacar en la ronda 1 la "Personas" compuesta del maestro (sus maestros más el roster) es pertinente: va con CL3-C06 y CL3-C07.

### Qué falta para que el programador cierre 03c1
**Solo la autorización del humano para `features/tareas/recuperar-ch3.test.tsx`** (una línea y el título de CH3-A19, R-13). Con ella, el programador aplica las tres filas de la Enmienda 5 y vuelve a correr `lint`, `test` y `build` del frontend. `shared/` no cambió en 03c1, así que el backend no hace falta. Las únicas rojas posibles son las de esas filas, ya corregidas. Si el humano no la autoriza, 03c1 no puede cerrar en verde (R-13) y hay que volver a preguntarle. M-01 no afecta a 03c1.

## Verificación de la Enmienda 6 — CLASES-03
Veredicto: Enmienda 6 **APROBADA**, sin M-nn propios: corrige M-01 de la verificación de la Enmienda 5. Para la observación de 03c2 pido una enmienda corta (**M-01** de esta verificación). Bloquea solo la ronda 0 de 03c2, no el cierre de 03c1.
Verificación propia: lint, test y build no aplican. Es una enmienda del plan; verifiqué con el diff completo, greps y lectura de las pruebas y del código.

Fecha: 2026-10-29.

### 1. Integridad y cotejo
- SHA-256 de `plan.md`: `5905780238b9f41033c3353b8f92f40d35bc682dc6f11ad3809f9888d97abce9` (1148 líneas); de la copia previa: `1e5460951f1a9cf95afca865c1e95967b6d7e5e526687409f6e72addad6a5ae6`. Los dos coinciden con `aprobacion.md`.
- `git diff --no-index` completo: 9 hunks, cada uno con su id y ninguno de 03c1 ni de 03c2:

| Hunk | Dónde | Id |
|---|---|---|
| 1 | Encabezado | E6-1 |
| 2 | §D-8.5, §D-8.6 y §D-8.7 | E6-4 y E6-5 |
| 3 | §D-9.4 | E6-4 |
| 4 | C-19 | E6-5 |
| 5 | C-27 y C-28 | E6-6 |
| 6 | Barrido de conteos y listas estáticas | E6-7 |
| 7 | "Rojos esperados" de 03d y 03e | E6-6 |
| 8 | Lista cerrada de 03d y 03e (`errores-ch3.test.ts`) | E6-2 y E6-3 |
| 9 | Tabla de la Enmienda 6 y la observación | — |

### 2. Las filas de `errores-ch3.test.ts`
- **Conteos y forma:** los conteos coinciden con la forma que fija el plan.
  - Hoy `lib.ts` tiene 4 llamadas a `erroresDeFormularioClases(`: la clase (`:192`), la publicación (`:199`), el código (`:209`) y el tema (`:358`). §D-8.5 pone `erroresDelRecursoDeApi` en `lib.ts`, así que 03d tiene **5**. §D-9.4 pone `erroresDeLaDudaDeApi` y `erroresDeLaRespuestaDeApi` en `lib.ts`, así que 03e tiene **7**.
  - E6-4 cierra las dos puertas que harían inexacto el conteo: los ganchos y los formularios llaman a los envoltorios, nunca a `erroresDeFormularioClases(` directo (`hooks.ts` sigue con 1, la de `useComentar`), y las listas de campos se escriben solo en `data.ts`.
  - `erroresDeLaPublicacionDeApi` conserva su parámetro con el tipo literal `"anuncio"`, así la fila `ANUNCIO` y las llamadas de hoy no cambian. Es la forma de menos riesgo.
- **Fila de 03d:** solo `MATERIAL` → `RECURSO_CREAR`/`RECURSO_EDITAR`; las dos filas `"material"` → cuatro de recurso; `MODOS`; CH3-B15 (3) a `{ anuncio: ["texto"] }` más `CAMPOS_PINTADOS_DEL_RECURSO`; CH3-B15 (4) de 4 a 5 y el título. Todo lo demás queda igual, incluida la regla de las listas literales en `data.ts`, que se sigue cumpliendo porque `["titulo", "texto"]` pasa a vivir en `CAMPOS_PINTADOS_DEL_RECURSO`. Correcto y mínimo.
- **Fila de 03e:** solo el conteo de 5 a 7. Las filas de duda y respuesta se pueden sumar, pero solo como filas nuevas. Correcto.

### 3. C-27, C-28 y C-19
- **C-27 y C-28** (`estatico-02c-r1.ataque.test.ts:62-77`): son las dos reglas que leí, la de los lectores de `.puedeBorrar` (`:69-73`) y la de la asignación de `puedeBorrar` solo desde el dato (`:74-76`). Las filas suman los archivos y los nombres que lee §D-8.3, §D-9.2 y §D-9.3. Conservan lo protegido: el botón decide por el dato, nunca por el rol.
- **Detalle (N-01):** C-28 deja que el tester sume el nombre exacto si el programador nombra distinto el dato (por ejemplo, `fila.puedeBorrar`); C-27 no lo dice. En 03d puede pasar algo igual: si `SeccionDeRecursos` le pasa a la fila `puedeBorrar={recurso.puedeBorrar}`, ese archivo también lee `.puedeBorrar` y la prop casa con `puedeBorrar\s*[:=]`. Basta con que el tester aplique a C-27 el mismo criterio que a C-28 (sumar el archivo o el nombre exacto, anotado). No pido enmienda por esto.
- **C-19:** suma `editar-recurso-view.tsx`, que según §D-8.6 (E6-5) llama a `perspectivaDeRuta` como `trabajo-view.tsx`. Coherente con la regla de la prueba: solo las vistas la llaman y los componentes la reciben por props.

### 4. Barrido
Mi grep de conteos y listas estáticas de `features/clases` (y de `lib/` y `services/` que leen `features/`) contra §D-8 y §D-9 coincide con la tabla de E6-7:
- `errores-ch3.test.ts` rompe (filas nuevas).
- `estatico-02c-r1.ataque` rompe (C-19, C-27 y C-28).
- `styles/clases-r1.ataque` rompe (C-21 y C-22).
- Las listas de secciones rompen (ya cubiertas).
- Lo demás no rompe si se respetan las reglas que la tabla nombra.

En particular, `estatico-r1.ataque:155` solo nombra `CLASES_DE_POSICION_DEL_INDICADOR` en un comentario; `reexportaciones-01c.test.ts` fija claves de `components/adjuntos` que no cambian; y `lib/estatico-ch3-r1` y `-r2` y `features/clases/errores-ch3-r1.ataque:439` solo prohíben **declarar** `CODIGOS_QUE_REDIRIGE_EL_CLIENTE` fuera de `apiClient`, no importarla. **No falta ninguna fila para 03d ni para 03e.**

### 5. Arbitraje de la observación para 03c2 (`CODIGOS_QUE_REDIRIGE_EL_CLIENTE`)
- **Lo que hay hoy:** `features/clases` no tiene una forma de saber si un código redirige sin la constante. Sus ganchos avisan `mensajeDeErrorClases(error)` aunque `apiClient` redirija; es el patrón heredado O-1d3-2. Tampoco hay un ayudante en `lib/errores-de-api.ts`. `features/tareas/lib.ts:230-232` y `features/calificaciones/lib.ts:158` resuelven lo mismo con un ayudante propio que importa la constante de `@/services/apiClient`. Esa es la forma establecida y la que permite la regla: la prueba solo prohíbe **declararla** o **copiar los tres códigos** fuera de `apiClient`, y fija **quién la importa**.
- **Por qué §D-11 debe usar esa vía, y no otra:**
  - Quitar la cláusula ("con un código que redirige, no avisa") contradice CL3-C14 ("desmontado con `ACCESO_RESTRINGIDO`, ningún aviso") y la matriz de clase de §D-14.
  - Copiar los códigos lo prohíbe `apiClient-ch3-r1.ataque:55-64`.
  - Un ayudante nuevo en `lib/` o en `services/` toca archivos de "No se toca".
- **Por qué no basta con que el tester la sume en la ronda 0:** por la regla de listas cerradas por grep, la prueba que romperá debe estar inventariada en el plan antes de la ronda 0. Si no, su roja es una PARADA del orquestador y una vuelta más. El archivo exacto donde vive la importación lo debe fijar el plan, no el programador: de eso depende la fila.

**M-01 — Enmienda 7, corta, antes de la ronda 0 de 03c2 (no afecta a 03c1):**
- **(a) §D-11, variante de `useCrearClase` y `useEditarClase`:** la comprobación vive en `features/clases/lib.ts`, como `errorQueRedirigeElCliente(error)` (o el nombre que elija el arquitecto), con `import { CODIGOS_QUE_REDIRIGE_EL_CLIENTE, esApiError } from "@/services/apiClient"`, igual que `features/tareas/lib.ts:232`. `hooks.ts` la llama y no importa la constante.
- **(b) §D-R0, fila C-29 (03c2):** `frontend/src/services/apiClient-ch3-r1.ataque.test.ts:55-79`. La lista `usan` suma `["/src/features/clases/lib.ts", true, false]` en su orden (calificaciones, clases, tareas), con su motivo. El título del caso ("solo tareas y calificaciones importan la lista") suma "clases". Nada más. Va en "Rojos esperados" de 03c2.
- **(c)** Comprobar que no rompe nada más: `services/apiClient-ch3.test.ts` (CH3-B11) solo fija quién declara; `features/clases/errores-ch3-r1.ataque:439` y `lib/estatico-ch3-r1` y `-r2`, lo mismo. Si el ayudante se prueba, sus casos van en las pruebas requeridas de 03c2 (CL3-C14 ya cubre el efecto).
- **Opcional (decide el arquitecto):** usar el mismo ayudante en los ganchos de 03c2 que hoy avisan con el formulario desmontado (comentario y tema), por coherencia con O-1d3-2. No lo pido; el plan solo lo exige en la variante de clase.

## Verificación de la Enmienda 7 — CLASES-03
Veredicto: APROBADA, sin M-nn. Corrige el M-01 de la verificación de la Enmienda 6 y la ronda 0 de 03c2 queda desbloqueada.
Verificación propia: lint, test y build no aplican. Es una enmienda del plan; la verifiqué con el diff completo, con greps y leyendo el código y las pruebas.

Fecha: 2026-10-29.

### 1. Integridad y cotejo
- SHA-256 de `plan.md`: `84074f4a5ecda3725b51c52da2a82dfc26195ba021226c462f607d65f6d04fe6` (1170 líneas). SHA-256 de la copia previa: `5905780238b9f41033c3353b8f92f40d35bc682dc6f11ad3809f9888d97abce9`. Los dos coinciden con `aprobacion.md`.
- El `git diff --no-index` completo da 8 hunks. Cada uno corresponde a un E7-n y ninguno toca 03c1, 03d ni 03e:

| Hunk | Dónde | Id |
|---|---|---|
| 1 | Encabezado | E7-1 |
| 2 | §D-11, variante de clase | E7-2 |
| 3 | §D-R0, C-29 | E7-4 y E7-5 |
| 4 | "Rojos esperados" de 03c2 y de 03c sin partir | E7-4 |
| 5 | Reparto de 03c2 | E7-3 |
| 6 | CL3-C19 | E7-3 |
| 7 | Paso 3 de 03c2 | E7-3 |
| 8 | Tabla de la Enmienda 7 | — |

### 2. El ayudante de §D-11
- **Nombre, firma y cuerpo:** `errorQueRedirigeElCliente = (error: unknown): boolean => esApiError(error) && CODIGOS_QUE_REDIRIGE_EL_CLIENTE.includes(error.codigo)`, idéntico a `features/tareas/lib.ts:231-232` y a `features/calificaciones/lib.ts:157-158`.
- **La importación cumple la regla de `apiClient-ch3-r1.ataque:70`** (`import { …CODIGOS_QUE_REDIRIGE_EL_CLIENTE… } from "@/services/apiClient"`). `features/clases/lib.ts:16` ya importa `esApiError` de `@/services/apiClient`, y §D-11 dice que la importación se une a esa. Así queda una sola línea, `import { CODIGOS_QUE_REDIRIGE_EL_CLIENTE, esApiError } from "@/services/apiClient"`, que coincide con la expresión de la prueba.
- **No declara la constante ni copia los tres códigos.** Las cuatro reglas (`apiClient-ch3-r1:55-64`, `lib/estatico-ch3-r1:197-215`, `lib/estatico-ch3-r2:93-104` y `features/clases/errores-ch3-r1:439`) solo miran declaraciones y los tres literales juntos en el código de producción. El ayudante no tiene ninguno de los dos.
- `hooks.ts` llama al ayudante y no importa la constante, así que `usan` suma un solo archivo (`lib.ts`).

### 3. CL3-C19
Cubre el ayudante:
- `true` con los tres códigos;
- `false` con otros `ApiError`, con un `Error`, con `null` y con un objeto con `codigo` que no es `ApiError`;
- el mismo resultado que el de `features/tareas` en todos esos casos.

Está en el reparto y en el paso 3 de 03c2. CL3-C14 ya cubre su efecto: desmontado con `ACCESO_RESTRINGIDO`, ningún aviso.

### 4. C-29
- Permite solo sumar `["/src/features/clases/lib.ts", true, false]` a `usan`, en su orden (calificaciones, clases, tareas), y "clases" al título.
- La regla de los tres códigos (`:55-64`) no cambia. "Nada más."
- Está en "Rojos esperados" de 03c2 y de 03c sin partir.
- Sus vecinos (`apiClient-ch3.test.ts` CH3-B11, que solo fija quién la declara, y las tres reglas de solo declarar) no cambian.

### 5. Conteos de la Enmienda 6 y de CH3-B15
Mi grep confirma que no cambian:
- El ayudante no llama a `erroresDeFormularioClases(`: CH3-B15 (4) sigue en 4 en 03c2, 5 en 03d y 7 en 03e.
- No escribe listas de campos, y `hooks.ts` sigue con una llamada.
- Ninguna prueba fija las exportaciones de `features/clases/lib.ts`.
- Las reglas de `errores-ch3-r1.ataque` (O-05: sin `.message` ni copias de la ruta), `estatico-r1.ataque` (`?? []`, ternarios) y `ver-mas-01e-r3.ataque` (sin importaciones de otro módulo de `features/`) no se ven afectadas, porque importar de `@/services/apiClient` está permitido.
- `apiClient-ch3-r1.ataque:48` compara solo los ayudantes de tareas y de calificaciones (no es exhaustiva), así que no rompe.

### Para la ronda 0 de 03c2
Las filas que toca son C-25 y C-29.

## Verificación del resumen del programador — 03c1
Veredicto: **ACEPTADO** (sin M-nn que bloqueen). El tester puede atacar.
Resumen verificado: `resumen-programador-03c1.md` (SHA-256 `eb7f0ae4…44f0`), incluida "## Cierre de la PARADA (Enmienda 5)". Plan `84074f4a…` ("LISTO (Enmiendas 1 a 7 aplicadas)").

### 1. Cifras (frontend, una corrida tras otra, nunca dos a la vez)
`git diff --stat e502381 -- shared backend`: vacío. 03c1 no toca `shared/` ni el backend, así que basta el frontend.

| Comando (desde `frontend/`) | Resumen | Mi corrida |
|---|---|---|
| `npm run lint` | exit 0, `> tsc -b` | exit 0; `All matched files use Prettier code style!` y `> tsc -b` |
| `npx vitest list` con `grep -acE "^src/"` | 5367 | 5367 |
| `npx vitest list` con `grep -aE "^src/"`, `sed 's/ > .*//'`, `sort -u` y `wc -l` | 241 | 241 |
| `npm run test` | `Test Files  241 passed (241)` · `Tests  5367 passed (5367)` · 179.97s | `Test Files  241 passed (241)` · `Tests  5367 passed (5367)` · `Duration  184.38s`; 0 «Hook timed out» |
| `npm run build` | `✓ built in 820ms` | exit 0, `✓ built in 808ms` (el aviso de siempre de trozos de más de 500 kB) |

- Desglose de los +57 casos frente a 237/5310: `secciones-03c1.test.tsx` 12, `clase-03c1.test.tsx` 31, `textos-03c1.test.ts` 5, `components/seccion/hooks.test.tsx` 4 (más 5 en `lib.test.ts`), con +4 archivos. Coincide con mi `vitest list`.
- `git diff --stat` del cierre de la PARADA (3 archivos, +63 −19): coincide. El "+210 −135" de los 8 archivos del primer resumen ya no se puede reproducir, porque `router-01d.test.tsx` sumó después la Enmienda 5. Hoy los 8 archivos dan +262 −146, y la diferencia es consistente con esa enmienda.

### 2. Pruebas requeridas de 03c1, matriz y hermanos
- **Mapa:** contrasté con `npx vitest list` los títulos de CL3-C01 a C07, C12, C13, C16, C17 y C18. Cada viñeta del resumen tiene su archivo y su título exacto, y el caso existe. CL3-C05 cubre las tres redirecciones con `historyAction` `REPLACE` y atrás/adelante. CL3-C06 (maestro) afirma una sola petición a `…/clases/:id` y ninguna a `…/personas`. CL3-C12 y C13 usan `rutas` y `Providers`, y prueban (a), (b), (c) y (d) más la lista sana y la lista de temas en error. Comparan la ausencia de `cursor` y que la frase desaparece.
- **Matriz de §D-14 contra el código:** coincide.
  - `MuroView` y `ElementosDelTema` vuelven a pedir solo con `isError`, por `useAlPulsarLaSeccionActiva`.
  - "Ver más avisos" y "Ver más de `<tema>`" usan `enEspera={isFetching}` con `cancelRefetch: false`.
  - R1 y R2 pasan por `mensajeDeErrorDeLista`.
  - En `TrabajoView`, el gancho vuelve a pedir la lista de temas solo si está en error.
  - En `PersonasView`, maestro y admin quedan dentro de un solo `ConClaseDeLaRuta`, así que «No tienes acceso…» sale una sola vez. `MaestrosDeLaClaseEnLectura` lee `useClase`, la misma clave del encabezado.
  - `data-candidato-maestro-id` está en `buscador-de-maestros.tsx:67`, `:91` y `:136` y en `maestros-de-clase-view.tsx:29`. `BuscadorAlumnos` sigue con `data-candidato-id`, y no hay otro vigilante de ese atributo (grep).
- **Estados vecinos del gancho compartido:** cubiertos.
  - Montar no cuenta (C16).
  - Una `key` nueva en la misma ruta sí cuenta (C16, C12 a, C13 a).
  - Otra ruta desmonta, y al volver montar no cuenta (C16). La consulta en error se pide al montar (C12 b, C13 b).
  - El historial (C12 c, C13 c).
  - La lista sana no pide nada (C12) y un tema sano tampoco (C13 a).
  - La lista de temas en error (C13 a).
- **Hermanos del cierre de la PARADA:** hice un grep propio de las pruebas normales con "Publicaciones", "Trabajo de clase", "Muro", "Ver más publicaciones", `grid-cols-5`, `w-1/5` y `translate-x-[n00%]`. No queda ninguna aserción viva con esos textos o clases; solo comentarios. `router.test.tsx:170` y `consultas-ch3.test.tsx:300`, `:345` y `:354` siguen entrando por `…/alumnos` o `…/maestros`: pasan por la redirección y siguen probando el roster. Es correcto y no exige cambio.

### 3. Lista cerrada de 03c1
Pruebas normales cambiadas frente a `e502381`: `clase-layout.test.tsx`, `lib.test.ts`, `tarjeta-de-tarea.test.tsx`, `muro-view.test.tsx`, `trabajo-view.test.tsx`, `features/clases/recuperar-ch3.test.tsx` (`TEXTOS_CLASE.muro` → `.avisos`, la referencia al nombre de la sección), `maestros-de-clase-view.test.tsx`, `router-01d.test.tsx`, `marco.test.tsx` y `features/tareas/recuperar-ch3.test.tsx`. Todas están en la lista cerrada.
- Las tres filas de la Enmienda 5 se aplicaron literalmente:
  - `marco.test.tsx` cambia solo el título y la aserción de O-14.
  - `router-01d.test.tsx` cambia solo el primer `it.each` y los cinco CAL-1D06, con medidas simuladas y `vi.restoreAllMocks`.
  - `features/tareas/recuperar-ch3.test.tsx` cambia solo `:449` y `:470`, que son las dos líneas que autorizó el humano.
- `router-01e.test.tsx`, `router.test.tsx`, `gradebook-01d.test.tsx` y las demás normales de `features/calificaciones` no cambian, así que CL3-C16 cumple "sin cambio".
- **Decisión sobre las dos filas iguales de `router-01d.test.tsx` (`admin/personas/2` dos veces): se quedan.** La lista cerrada dice "no se borra ni se desactiva ningún caso", y quitar una fila borra un caso (5367 → 5366). La fila duplicada no cuesta nada ni oculta nada. La redirección de `…/alumnos` y `…/maestros` la prueba CL3-C05 (las tres rutas con `replace`), no estos casos. Tampoco se cambia la entrada de una fila a `…/maestros`, porque la Enmienda 5 manda entrar por `…/personas`.

### 4. V-01
Recalculé el SHA-256 de las 230 `*.ataque` del árbol (`git ls-files -co --exclude-standard`). Coinciden 230 de 230 con la tabla "con las adendas 1 y 2" de `reporte-tester.md` (`956ee380…`), sin diferencias. Las 24 `*.ataque` cambiadas frente a `e502381` son exactamente las 24 que esa tabla marca como reescritas por el tester (las 21 de la ronda 0, `foco-02c-r4` y `foco-02c-r5` de la adenda 1, y `foco-pestana-02d-r3` de la adenda 2). Ninguna la cambió el programador.

### 5. "No se toca", capas y estilo
- **"No se toca":**
  - Fuera de los paquetes (base `689c636`), los cambios están en `docs/trabajo/CLASES-03-…`, `docs/ESTADO.md`, los documentos de cierre de 03a y 03b que aplicó el orquestador, y `AGENTS.md`. Este último coincide con el hash de `aprobacion.md` (`bb985908…`).
  - Dentro de `frontend/` (base `e502381`): `features/tareas/` cambia solo en la fila autorizada (y en la `*.ataque` del tester), y `features/calificaciones/hooks.ts` solo en la reexportación de DH-06. Quitar `useRef` y `useLocation` es consecuencia directa y la exige el lint.
  - Sin cambios en `lib/`, `services/`, `app/providers.tsx`, `components/ui|adjuntos|foco|layout|clase/` ni `styles/`. `components/seccion/` es la ubicación nueva que pide el plan.
- **Indicador:** `style` solo con `--indicador-x` y `--indicador-ancho` (es el único `style=` de `features/clases` y `components/seccion`). Las clases `translate-x-(--indicador-x)` y `w-(--indicador-ancho)` van sin corchetes. Salieron `CLASES_DEL_INDICADOR_POR_SECCIONES` y `CLASES_DE_LA_REJILLA_POR_SECCIONES`, y `CLASES_DE_POSICION_DEL_INDICADOR` queda con dos valores. La medida se hace con `useLayoutEffect` al montar y al cambiar de sección. `ResizeObserver` y `document.fonts.ready` solo vuelven a medir, si existen, y se desconectan al desmontar.
- **`useAlPulsarLaSeccionActiva`:** vive en `components/seccion/hooks.ts` con el cuerpo de antes, y `features/calificaciones/hooks.ts` lo reexporta. CL3-C16 confirma que es la misma función.
- **Capas y estilo:** tipos nuevos en `types.ts`, textos y secciones en `data.ts`, funciones puras en `lib.ts` y el gancho en `hooks.ts`. Retornos tempranos y ningún ternario anidado en JSX. Sin clases de la escala anulada de Tailwind (grep) y solo tokens (`text-h2`, `text-h3`, `text-small`, `rounded-row`, `bg-surface`, `bg-accent-soft`). Los textos coinciden con §D-13 (con la Enmienda 4).

### Detalles menores (no bloquean; no hace falta otra corrida)
- **M-01 · comentario huérfano en `features/clases/types.ts:54`.** "Lo que cada perspectiva ve de una clase (§D-2C1); es una fila de CAPACIDADES_POR_PERSPECTIVA." quedó encima de `MedidaDeOpcion` y no de `CapacidadesDePerspectiva`. Conviene devolverlo a su lugar la próxima vez que se toque el archivo (03c2).
- **M-02 · `features/clases/trabajo-view.tsx:49`.** Una línea de comentario de 135 caracteres; Prettier no la reacomoda porque es un comentario. Se puede partir en 03c2, que toca el archivo.
- **M-03 · `clase-layout.test.tsx`, segundo PR-2C07.** La entrada `…/alumnos` pasó a `…/trabajo` (índice 1) y no a `…/personas`, y su `aria-current` pasó a "Actividades de aprendizaje". La fila de la lista cerrada nombra "rutas `…/alumnos` y `…/maestros` por `…/personas`". El cambio sigue dentro del propósito de la fila: cubre una posición más del indicador medido y evita dos montajes iguales, sin debilitar nada. Se acepta y queda anotado.
- `MaestrosDeLaClaseEnLectura` pasa `onQuitar` y `alQuedarseSinDestino` como funciones vacías para no cambiar `ListaMaestrosDeClase` (§D-7.7 lo pide así). Con `puedeQuitar={false}` no se alcanzan.

## Arbitraje de la ronda 1 — 03c1
Fecha: 2026-10-29. Base: `reporte-tester.md` (SHA-256 `35a9ae6b…`), "## CLASES-03c1 — Ronda 1"; plan `84074f4a…`. Arbitraje de solo lectura: no corrí suites, porque para esto no hacía falta. Leí el código, las pruebas y `docs/ESTADO.md`, e hice grep sobre `frontend/src`.

### Decisión en una línea por punto
- **T-01:** defecto real. Se corrige en 03c1. Sus dos casos rojos son correctos. Ojo: el remedio literal del tester ("pintar el `<span>` solo si `medida.indice === activa`") deja en rojo su propio caso de control.
- **T-02:** defecto real. Se corrige en 03c1, **pero CL3-R1-02, tal como está escrita, es incorrecta**: contradice a CL3-R1-03 y CL3-R1-08 del mismo archivo, y a CL3-C04. El tester la reescribe en una adenda de la ronda 1 antes de que el programador corrija.
- **T-03:** se corrige en 03c1 (una línea), junto con su hermano de la misma sección (`personas-view.tsx:73`). Los otros tres hermanos pasan a CHORE-04 como filas nuevas.
- **O-01 y O-02:** quedan como observaciones, sin remedio en 03c1. O-01 no contradice el plan: es literalmente lo que pide §D-7.4.

### T-01 — confirmado (media)
- **Es real.** En el navegador, leer `offsetLeft` dentro del `useLayoutEffect` (`hooks.ts`, `useIndicadorDeSecciones`) calcula los estilos con el `<span>` ya insertado. Lo hace sin `--indicador-x`, y entonces `translate` es inválido al calcularse y queda en `none`, o con la medida de la sección anterior (al volver de "Editar clase", la `medida` sigue siendo la de "Avisos"). El `setMedida` siguiente es un cambio de estilo con `transition-transform` activo: el indicador se desliza 200 ms sin que nadie haya cambiado de sección. Antes de 03c1 no pasaba, porque la clase de posición venía en el primer render. Contradice la intención de §D-7.2 ("mide … antes de pintar") y la viñeta de siete opciones de `DESIGN.md` §7.3.
- **Las pruebas son correctas.** No localizan por clases de estilo: usan `aria-label`, `aria-hidden`, `data-slot="card"` y la variable CSS. La condición que fijan es un resultado observable en jsdom: al medir, el indicador no está o ya tiene su posición. Esa condición deja fuera una variante válida, la de montar el indicador sin posición y activar la transición en un cuadro posterior. Lo acepto: esa variante es la frágil, porque si la transición se activa en el mismo cambio que la posición, el navegador anima igual (la transición usa el estilo de después del cambio). Y el plan ya dice que, sin sección activa, el indicador no se monta.
- **Qué se espera (resultado):**
  - Al entrar en una clase en cualquier sección, el indicador aparece ya bajo la opción activa.
  - Lo mismo al volver a una sección desde una pantalla sin sección activa: "Editar clase", "Categorías", el detalle, la edición o las entregas de una tarea.
  - Al cambiar de una sección a otra, se sigue deslizando desde la anterior. **El caso de control CL3-R1-01 (`:199`, `fotos[0] === "0px"`) debe seguir verde.** Aviso al programador: con el remedio literal del tester (`medida.indice === activa`), al pasar de "Avisos" a "Calificaciones" el indicador desaparece en el momento de medir y el control se pone rojo. El resultado pedido es que se desmonte (o se olvide su medida) solo cuando no hay sección activa o al entrar, nunca al cambiar de sección.
- **Hermanos y estados vecinos que el resumen debe declarar uno por uno:**
  - Primera entrada en cada perspectiva y en cada sección, incluida la primera ("Avisos").
  - La vuelta desde cada pantalla sin sección activa.
  - Cambiar de sección (control).
  - Atrás y adelante del historial (CL3-R1-03).
  - Pulsar la sección activa (CL3-R1-08).
  - El aviso tardío del `ResizeObserver` y de `document.fonts.ready` con el indicador sin montar (CL3-R1-06).
  - **Cambio de clase en otra sección**, por la barra lateral, con la clase nueva en caché: `ClaseLayout` no pone `key` a `SeccionesDeClase`, así que puede heredar la `medida` de la otra clase. Se trata como una entrada: el indicador aparece en su lugar, sin deslizarse desde la sección de la otra clase.
  - El control de dos botones de `FormularioPublicacion` no aplica: tiene clases fijas y no usa medida.

### T-02 — confirmado (baja); CL3-R1-02 incorrecta tal como está
- **Es real.** Por §D-7.2, el `<ul>` lleva `relative` y el panel `p-1`. El `offsetLeft` del `<li>` se mide desde el `<ul>`, pero en el área desplazable del panel la opción empieza después del relleno. Con el `scrollLeft` que hoy calcula `desplazamientoParaVer`, la opción activa queda cortada tantos píxeles como mide el relleno (4 px). Incumple "la opción entera a la vista" (§D-7.2) y "la opción activa queda a la vista al entrar" (`DESIGN.md` §7.3).
- **La prueba es incorrecta: fija una implementación y choca con otras tres.**
  1. En el modelo del archivo, `offsetLeft` vale 0 en todo lo que no es un `<li>` de las secciones. jsdom no aplica CSS (`vitest.config.ts`: solo `tokens.css?raw`) y `getBoundingClientRect` da ceros. Así, ningún remedio que **mida** el relleno o la posición del `<ul>` en el panel (`getBoundingClientRect`, el `offsetLeft` del contenedor, el relleno calculado) llega a 164. Los dos remedios que sugiere el propio tester siguen en rojo. Lo único que la pone en verde es escribir 4 px fijos en el código, un número que repite `p-1` y se desfasa en silencio si cambia el panel. Eso no es aceptable (CLAUDE.md › Tokens: ningún tamaño suelto).
  2. Con el mismo modelo y los mismos números (panel de 250, opción de 300 a 410), CL3-R1-03 (`:255`, `toBe(300 + 110 - 250)`) y CL3-R1-08 (`:376`, `toBe(160)`) exigen exactamente 160. CL3-R1-02 exige al menos 164. El archivo no puede quedar entero en verde con ningún remedio.
  3. CL3-C04 (`secciones-03c1.test.tsx:295`, `toBe(410 - 250)`) modela un panel sin relleno, así que en su modelo 160 es correcto y no cambia.
  4. Afirmar `toHaveClass("relative")` y `toHaveClass("p-1")` no localiza por clases, pero ata la prueba a la forma del árbol en lugar de a la geometría.
- **Qué hace el tester (adenda a la ronda 1, solo en `indicador-03c1-r1.ataque.test.tsx`, antes de la corrección):**
  - Un solo modelo geométrico para todo el archivo. El panel tiene un relleno inicial P, el `<ul>` empieza en P dentro del área desplazable y cada `<li>` se mide desde el `<ul>`.
  - `getBoundingClientRect` del panel, del `<ul>` y de cada `<li>`, y el relleno calculado del panel (`getComputedStyle`), coherentes con esos desplazamientos y con el `scrollLeft` del momento. Así pasa cualquier remedio que sea correcto en un navegador y midiendo.
  - Sin las precondiciones de clase.
  - Que afirme que la opción queda entera a la vista, no un `scrollLeft` exacto, salvo donde el plan pide no desplazar (CL3-R1-08 y la segunda viñeta de CL3-C04).
  - Que CL3-R1-03 y CL3-R1-08 sigan el mismo modelo. Conviene correr CL3-R1-02 con dos valores de P, para que un número fijo no pase.
  - Las demás `*.ataque` no se tocan. La tabla de SHA-256 se actualiza para este archivo.
- **Qué se espera del código (resultado):** la opción activa queda entera dentro del panel al entrar y al cambiar de sección, en el modelo con relleno de la adenda y en el sin relleno de CL3-C04, y sin números de píxeles escritos en el código. `medidaDelIndicador` y `desplazamientoParaVer` conservan su firma y su contrato (CL3-C03 no cambia). Lo que cambia es qué posición de la opción recibe la segunda. El indicador sigue en las coordenadas del `<ul>`. Hermano: el borde izquierdo usa la misma comparación. Hoy deja 4 px de margen, y con el remedio puede quedar alineado con el inicio de la opción; los dos resultados son aceptables. Ningún otro control usa `desplazamientoParaVer` (grep).

### T-03 — se corrige en 03c1; hermanos uno por uno
Se corrige aquí, no en CHORE-04:
- Es una línea en `features/clases/`, el módulo del encargo, y ningún archivo cae en "No se toca".
- 03c1 compone esta tabla dentro de su sección nueva «Personas», junto al buscador que dispara la recarga.
- §D-12 pide `enEspera={isFetching}` en todo "Ver más" de este encargo.
- Mandarla a CHORE-04 dejaría CL3-R1-15 en rojo, y una subentrega no se cierra con pruebas en rojo.
- `docs/ESTADO.md` §3 ya tenía este pendiente ("Los demás «Ver más» de CLASES… pasan a `enEspera={isFetching}`", destino "Carril trivial"), y esta corrección cierra dos de sus cinco controles.
- Cambiar el valor no altera los conteos de `enEspera=` de `styles/clases-r1.ataque.test.ts`.

| Hermano | Decisión | Por qué |
|---|---|---|
| `features/clases/components/tabla-alumnos.tsx:218` («Ver más alumnos» del roster, maestro y admin en «Personas») | **03c1** | Hallazgo T-03; CL3-R1-15 |
| `features/clases/personas-view.tsx:73` («Ver más alumnos» del estudiante en «Personas») | **03c1** | Misma sección y mismo control. El archivo ya está en el plan de 03c1 (§Cambios por capa) y no en "No se toca". Lleva un caso normal nuevo (abajo) |
| `features/clases/clases-admin-view.tsx:78` («Cargar más clases» de `/admin/clases`) | **CHORE-04**, fila nueva | Fuera de las secciones de la clase; 03c1 no lo toca |
| `features/clases/components/comentarios-de-publicacion.tsx:180` («Ver más comentarios») | **CHORE-04**, fila nueva | 03c1 no lo toca, y §D-10 (R6) fija "sin cambio de código en `ComentariosDePublicacion`" para 03d. El tester de 03d y 03e lo anota como observación con esta fila, no como hallazgo |
| `features/clases/components/panel-mis-clases.tsx:61` (con la prop `isFetchingNextPage` en `inicio-estudiante-view.tsx:52` e `inicio-maestro-view.tsx:47`) | **CHORE-04**, fila nueva | No es una línea: cambia la prop del panel, las dos vistas de inicio y los dobles de dos `*.ataque` (`inicio-sin-datos-02c-r1.ataque.test.tsx:19` e `inicio-sin-datos-r2.ataque.test.tsx:20` pasan `isFetchingNextPage: false`). El §D-R0 de CHORE-04 debe inventariarlos. La misma fila puede llevar el pendiente del texto del cursor de "Ver más clases" (§3, "Carril trivial, en el próximo cambio que toque… `panel-mis-clases.tsx`") |
| `features/admin/components/tabla-enlaces.tsx:240` y `registrados-del-enlace.tsx:71` | Ya en CHORE-04 (filas 24 y 25) o ADMIN-01 | `features/admin` está en "No se toca" de este plan |
| `isFetchingNextPage` en `calificaciones/mis-calificaciones-view.tsx:80`, `tareas/components/hilo-privado.tsx:146` y `tareas/entregas-view.tsx:82` | No aplica | No es el `enEspera` de un botón, sino la condición del foco tras cargar más. Sus botones ya usan `isFetching` (`:185`, `:221` y `:146`) |
| Resto de "Ver más" (`muro-view.tsx:145`, `seccion-de-tema.tsx:144`) | Ya correctos | `enEspera={…isFetching}` |

Grep usado: `isFetchingNextPage` y `fetchNextPage` sobre `frontend/src` sin pruebas. No hay más casos.

### O-01 y O-02
- **O-01 (la consulta y el hash se pierden en la redirección): observación cerrada, sin destino.** §D-7.4 prescribe literalmente `<Navigate to="../personas" replace />`, y DH-09 solo pide no romper marcadores. Un marcador viejo llega a «Personas», y eso se cumple. «Personas» no lee ni la consulta ni el hash (grep de `useSearchParams`, `location.search` y `.hash` en `features/clases`, `app` y `components`: 0), así que no hay nada que conservar.
- **O-02 (doble clic en la sección activa con la lista en error: dos `GET`): observación cerrada, sin remedio en 03c1.**
  - Es una lectura, no una mutación, así que la regla de la guarda con ref no aplica.
  - `refetch()` cancela la primera petición y solo se aplica una respuesta.
  - El gancho es el compartido con `features/calificaciones` (DH-06, "con el cuerpo exacto"), y cambiarlo tocaría a ese módulo.
  - Si en una ronda aparece un aviso doble o un foco perdido por este camino, eso sí sería hallazgo.

### Para el programador: alcance de la corrección de la ronda 1 de 03c1
**Orden:** primero la adenda del tester a CL3-R1-02, y después la corrección. Las dos van dentro de la ronda 1 y no cuentan como ronda extra.

**Archivos de producción que puede tocar (lista cerrada):**
1. `frontend/src/features/clases/components/secciones-de-clase.tsx` (T-01).
2. `frontend/src/features/clases/hooks.ts`, solo `useIndicadorDeSecciones` y sus auxiliares (T-01 y T-02).
3. `frontend/src/features/clases/lib.ts`, solo para **agregar** una función pura si el remedio la necesita. No cambia la firma ni el contrato de `medidaDelIndicador` ni de `desplazamientoParaVer`.
4. `frontend/src/features/clases/types.ts`, solo para **agregar** un tipo si hace falta; `MedidaDeOpcion`, `MedidaDelPanel` y `MedidaDelIndicador` no cambian. Si lo toca, puede devolver el comentario de M-01 (`:54`) a su lugar.
5. `frontend/src/features/clases/components/tabla-alumnos.tsx:218` (T-03), solo esa línea.
6. `frontend/src/features/clases/personas-view.tsx:73` (hermano), solo esa línea.

**Pruebas:**
- **Ninguna prueba normal existente cambia.** Siguen como están `secciones-03c1.test.tsx` (CL3-C01, C02 y C04), `lib.test.ts` (CL3-C03) y `clase-layout.test.tsx`.
- Ninguna `*.ataque` la toca el programador.
- Pruebas nuevas permitidas, solo en archivos nuevos:
  - Un caso para el hermano del estudiante: `frontend/src/features/clases/personas-ver-mas-03c1.test.tsx`, «CL3-C1R1-01: «Ver más alumnos» del estudiante en «Personas» queda en espera mientras la lista se vuelve a pedir» (con `aria-busy`, sin selectores de estilo).
  - Si agrega una función pura a `lib.ts`, sus casos en un archivo nuevo, no en `lib.test.ts`.
- **PARADA:** cualquier prueba roja que no sea CL3-R1-01 ×2, CL3-R1-02 (ya reescrita) y CL3-R1-15.

**El resumen trae:**
- Los hermanos y estados vecinos de T-01, T-02 y T-03 de arriba, uno por uno, con lo que pasa en cada uno.
- La matriz de §D-14 solo para las filas que cambian: el indicador y los dos "Ver más alumnos".
- Las cifras con su comando, como siempre.

### Documentos a actualizar (orquestador, al cerrar 03c1)
- `docs/ESTADO.md` §3, fila "Los demás «Ver más» de CLASES…": roster y compañeros, hechos en CLASES-03c1. Comentarios, inicios (`panel-mis-clases.tsx` con las dos vistas) y clases del admin pasan a CHORE-04.
- `docs/ESTADO.md` §2b, inventario de CHORE-04: filas 26 (`clases-admin-view.tsx:78`), 27 (`comentarios-de-publicacion.tsx:180`) y 28 (`panel-mis-clases.tsx:61` con `inicio-estudiante-view.tsx` e `inicio-maestro-view.tsx`, y la nota de los dos `inicio-sin-datos-*.ataque` para su §D-R0), con la misma razón que las filas 24 y 25 ("Ver más" con `isFetchingNextPage`, contra `CLAUDE.md` › Componentes; T-03 de CLASES-03c1).

### Para el humano (informativo; no bloquea)
- Mover tres "Ver más" de CLASES del pendiente "Carril trivial" a CHORE-04 sigue el precedente de las filas 24 y 25 (O-22 de CHORE-03). Si prefiere corregirlos antes por carril trivial, se puede hacer en cualquier momento fuera de CLASES-03, salvo `comentarios-de-publicacion.tsx` mientras dure 03d.

## Verificación de la corrección de la ronda 1 — 03c1
Fecha: 2026-10-29. Veredicto: **ACEPTADO** (sin M-nn que bloqueen). El tester puede atacar la ronda 2.
Resumen verificado: `resumen-programador-03c1-r1.md` (SHA-256 `841eb6c0…625d3`, reproducido). Bases: plan `84074f4a…` (reproducido), `reporte-tester.md` `6f335866…` (reproducido; ronda 1 y su adenda 1) y "## Arbitraje de la ronda 1 — 03c1" de este archivo.

### 1. Cifras (frontend, una corrida tras otra, nunca dos a la vez)
`git diff --stat e502381 -- shared backend`: vacío. La corrección no toca `shared/` ni el backend, así que basta el frontend.

| Comando (desde `frontend/`) | Resumen | Mi corrida |
|---|---|---|
| `npm run lint` | exit 0; `All matched files use Prettier code style!` y `> tsc -b` | exit 0; las mismas dos líneas |
| `npx vitest list` con `grep -acE "^src/"` | 5410 (5404 + 6) | 5410 |
| `npx vitest list` con `grep -aE "^src/"`, `sed` que quita lo que va tras ` > `, `sort -u` y `wc -l` | 246 (244 + 2) | 246 |
| `npm run test` | `Test Files  246 passed (246)` · `Tests  5410 passed (5410)` · 183.38s; 0 «Hook timed out» | `Test Files  246 passed (246)` · `Tests  5410 passed (5410)` · `Duration  182.71s`; 0 «Hook timed out» |
| `npm run build` | exit 0, `✓ built in 782ms` | exit 0, `✓ built in 741ms` (el aviso de siempre de trozos de más de 500 kB) |
| `git diff --stat e502381` de los 6 de producción | `6 files changed, 284 insertions(+), 41 deletions(-)` | igual |

- **Títulos:** los 13 títulos de la tabla "Pruebas requeridas" del resumen existen tal cual en `npx vitest list`: CL3-R1-01 ×2 más su control, CL3-R1-02 ×3 más su control, CL3-R1-15, CL3-C1R1-01 y los cinco CL3-C1R1-02. CL3-C1R1-01 lleva el título exacto que fijó el arbitraje.

### 2. Lista cerrada del arbitraje
- **Qué cambió en la corrección.** No hay un commit intermedio, así que lo acoté por la hora de modificación del árbol. Después de la adenda del tester (17:24) solo cambiaron seis archivos de producción: `types.ts` 17:26, `lib.ts` 17:26, `secciones-de-clase.tsx` 17:27, `tabla-alumnos.tsx` 17:27, `personas-view.tsx` 17:29 y `hooks.ts` 17:29. También aparecieron los dos archivos de prueba nuevos (`opcion-en-el-panel-03c1.test.ts` y `personas-ver-mas-03c1.test.tsx`, 17:28). Ninguna prueba normal ya existente se modificó después de las 16:29, la hora del cierre de la PARADA que ya verifiqué, y el conjunto de pruebas normales cambiadas frente a `e502381` es el mismo de esa verificación. Por tanto, ninguna prueba normal existente cambió.
- **Cada archivo, dentro de lo permitido:**
  - `tabla-alumnos.tsx`: frente a `e502381`, una sola línea (`:218`, `isFetchingNextPage` → `isFetching`). Cumple.
  - `personas-view.tsx:73`: solo esa línea, además de lo de 03c1 ya verificado. Cumple.
  - `lib.ts`: solo se agrega `opcionEnElPanel`. `medidaDelIndicador` y `desplazamientoParaVer` no cambian de cuerpo ni de firma. Cumple.
  - `types.ts`: solo se agregan `PosicionDelPanel` y `MedidaDelIndicadorDeLaClase`, que extiende `MedidaDelIndicador` sin cambiarlo. El comentario de M-01 vuelve encima de `CapacidadesDePerspectiva`. Cumple.
  - `hooks.ts`: **`posicionDelPanel` y el cambio en `conservarSiIgual` caben en "auxiliares".** Las dos son constantes privadas del módulo (no se exportan) y solo las llama `useIndicadorDeSecciones` (grep). `conservarSiIgual` ya existía como auxiliar del gancho, y compararla también por `base` es parte del remedio de T-01: sin eso, una medida igual de otra clase se conservaría con la `base` vieja y el gancho la ocultaría para siempre. Cumple.
  - `secciones-de-clase.tsx`: pasa `base` al gancho y monta el indicador solo con `medida !== null`. Cumple.
- **V-01:** 233 de 233 `*.ataque` con el mismo SHA-256 que la tabla "con la adenda 1" de `reporte-tester.md`, sin diferencias. En mi cotejo con `diff`, las dos filas de `services/apiClient*.ataque` aparecieron distintas solo porque mi conversión a minúsculas también cambió la ruta, `apiClient`; sus hash coinciden. El programador no tocó ninguna.

### 3. Contraste con el código
**T-01** (`hooks.ts:959-1007`, `secciones-de-clase.tsx:45-60`):
- **Remedio.** Hay tres partes.
  - Durante el render, `if (activa < 0 && medida !== null) setMedida(null)`. Es el patrón de React para ajustar el estado propio en el render, y el lint lo acepta.
  - Cada medida guarda la `base` en que se tomó, y el gancho devuelve `null` si la `base` no coincide.
  - Los dos efectos dependen de `[activa, base]`.

  En cada entrada, el `<span>` no está en el DOM cuando el `useLayoutEffect` mide. El `setMedida` síncrono del efecto de diseño lo monta ya con su posición antes de pintar, y un elemento recién insertado no anima. Al cambiar de sección dentro de la misma `base`, la medida anterior se conserva y el indicador se desliza: el control sigue verde.
- **Estados vecinos, uno por uno, contra el código:**
  - **Entrada directa:** `useState(null)`. Correcto.
  - **Vuelta desde una pantalla sin sección:** las seis pantallas (`editar`, `categorias`, `tareas/nueva`, `tareas/:id`, `…/editar` y `…/entregas[/:alumnoId]`) son hijas de `ClaseLayout` (`router.tsx:70-155`), así que `SeccionesDeClase` sigue montado con `activa < 0` y olvida la medida. Correcto para todas, aunque solo «Editar clase» tiene caso.
  - **Historial:** es un cambio de sección. Desliza, y es lo que se quiere.
  - **Pulsar la sección activa:** sin cambio de dependencias. Correcto.
  - **Aviso tardío del observador:** `vigente = false` en la limpieza. Además, con `activa < 0` el efecto no observa. Correcto.
  - **Cambio de clase en la misma sección:** la `base` cambia, así que el indicador se desmonta y vuelve a aparecer ya medido. Correcto. Precisión: CL3-R1-07 solo afirma la posición final, no la ausencia del indicador al medir. En el modelo, la posición vieja y la nueva coinciden, así que no hay deslizamiento visible que probar.
  - **Cambio de clase en otra sección con la clase nueva en caché:** el razonamiento es el mismo. La `base` cambia antes de que corra el efecto, así que en el commit no hay `<span>`. Ni `conservarSiIgual`, que compara la `base`, ni la medida filtrada pueden devolver la medida de la otra clase. El código es correcto. **No tiene caso permanente.** El arbitraje lo nombró como estado vecino y la lista cerrada no le daba archivo al programador, así que **lo fija el tester en la ronda 2** (abajo).
  - **Ida y vuelta A → B → A** (en secciones distintas): al volver a A, la medida es de B y no se devuelve. Es otra entrada. Correcto.
- **Estilo:**
  - `style` solo lleva `--indicador-x` y `--indicador-ancho`; CL3-R1-30 está verde.
  - No hay ningún número de píxeles ni clases con corchetes.
  - Los tipos nuevos están en `types.ts` y ninguno en `hooks.ts` (CL3-R1-34 verde).
  - Hay retornos tempranos en `opcionDeLaLista` y en los dos efectos.
  - `estiloDelIndicador` es una asignación de dos ramas, no un ternario en JSX, así que la permite CLAUDE.md.

**T-02** (`lib.ts:115-123`, `hooks.ts:971-980` y `:1029-1033`):
- **Sin píxeles fijos.** La distancia entre la lista y el área desplazable es `lista.left − panel.left − clientLeft + scrollLeft`. Esa expresión es igual al relleno del panel, cualquiera que sea el desplazamiento. Las dos lecturas se hacen seguidas, con el mismo `scrollLeft`.
- **CL3-C04 sigue con 160.** En jsdom todo da 0.
- **La adenda prueba relleno 4 y 12.** Un número fijo no pasa las dos, y ambas están verdes.
- **El indicador sigue en las coordenadas del `<ul>`.** `medidaDelIndicador` recibe la opción sin corregir.
- **Borde izquierdo:** ahora queda alineado, sin margen. El arbitraje acepta ese resultado.

**T-03:** las dos líneas pasan a `isFetching`, las dos con `cancelRefetch: false`.
- **CL3-C1R1-01.** No usa selectores de estilo: localiza por rol, nombre y `aria-busy`. Retiene la recarga, pulsa el botón, afirma que no sale ninguna petición con `cursor=` y comprueba la salida de la espera.
- **Lo que queda con `isFetchingNextPage`** (grep sin pruebas):
  - Los tres controles de CHORE-04: `clases-admin-view.tsx:78`, `comentarios-de-publicacion.tsx:180` y `panel-mis-clases.tsx:61`, con las dos vistas de inicio.
  - Los dos de `features/admin`.
  - Las tres guardas de foco que el arbitraje declaró "no aplica".

  Coincide con el arbitraje.

### 4. Matriz y hermanos
- **Matriz.** Las cinco filas que cambian coinciden con el código.
  - El indicador no tiene petición, aviso ni cambio de foco. Su estado lo dicen `aria-current` y el color del texto.
  - Los dos «Ver más alumnos» quedan en espera durante cualquier `isFetching`. Un clic se une a la recarga y no sale otra petición.
  - Si la recarga falla, se reemplaza el bloque por su `MensajeError` y el foco va al encabezado «Alumnos» (T-27), sin cambio.
  - No se agrega ningún `toast`.
- **Hermanos de «Ver más».** La tabla del resumen es la del arbitraje, fila por fila, y lo que dice de cada uno coincide con el código.
- **Estados vecinos de «Ver más».** Primera carga, página en vuelo, recarga por invalidación, recarga que falla, doble clic y vista desmontada: coinciden.

### Para la ronda 2 del tester (03c1)
1. **Que fije el estado vecino sin caso permanente:** cambio de clase **en otra sección**, por la barra lateral o por `router.navigate`, con la clase nueva en caché (por ejemplo, la clase B en «Calificaciones», después la clase A en «Actividades de aprendizaje» y de vuelta a la clase B en «Calificaciones»).
   - Usar las fotos de CL3-R1-01: en cada lectura de geometría, el indicador no está o ya tiene su posición.
   - Agregar también la ida y vuelta A → B → A.
   - Va en un archivo `*.ataque` nuevo de la ronda 2, sobre el modelo de `indicador-03c1-r1`.
2. **La vuelta desde al menos otra pantalla sin sección que no sea «Editar clase»**, por ejemplo el detalle de una tarea o «Categorías», con las mismas fotos.
3. **T-02 por los caminos que la adenda dejó con relleno 0:**
   - El historial con relleno 4 (CL3-R1-03 corre con 0 para no duplicar T-02).
   - Un cambio de sección con el panel ya desplazado (`scrollLeft` distinto de 0) y relleno distinto de 0, en los dos sentidos: la opción a la derecha y a la izquierda del área visible.
4. **El «Ver más alumnos» del roster con la página siguiente y la recarga en vuelo a la vez:** que siga saliendo una sola respuesta aplicada y que el foco no caiga en `<body>`.
5. Fuera de la ronda: los «Ver más» de CHORE-04 (filas 26 a 28) se anotan como observación si aparecen, no como hallazgo.

### Detalles menores (no bloquean)
- **Precisión del resumen:** la tabla de T-01 da CL3-R1-07 como cobertura del "cambio de clase en la misma sección", pero ese caso no comprueba el indicador en el momento de medir. Por el código, el estado es correcto. Queda anotado; no devuelve el resumen.
- **M-02** (`trabajo-view.tsx:49`, comentario de 135 caracteres) sigue para 03c2, como dice el resumen.

## Revisión final — 03c1
Fecha: 2026-10-29. Plan `plan.md`, SHA-256 `84074f4a5ecda3725b51c52da2a82dfc26195ba021226c462f607d65f6d04fe6` (lo reproduje). `reporte-tester.md`, SHA-256 `3d90c37f…` (lo reproduje), "## CLASES-03c1 — Ronda 2": RESISTE. `AGENTS.md`, SHA-256 `bb98590852939b0d5f80a177db57da29f2dffffd99346b2bcaaac67d9a4dc787` (lo reproduje; contra `HEAD`, solo la viñeta de `shared/`). Base dentro de los paquetes: `e502381` (`<K3b>`).

**Veredicto: APROBADO CON OBSERVACIONES.** No hay M-nn que bloqueen. M-01 y M-02 son de documentos y tienen destino. M-03 es un paso de cierre del orquestador antes del commit.

**Verificación propia** (desde `frontend/`, una corrida tras otra, nunca dos a la vez):

| Comando | Mi resultado | Esperado (ronda 2) |
|---|---|---|
| `npm run lint` | exit 0 (última línea `> tsc -b`) | exit 0 |
| `npx vitest list` con `grep -a -c -E "^src/"` | 5434 casos | 5434 |
| `… \| sed 's/ > .*//' \| sort -u \| wc -l` (con `grep -a`) | 248 archivos | 248 |
| `npm run test` | `Test Files  248 passed (248)` · `Tests  5434 passed (5434)` · exit 0; 0 «timed out» | igual |
| `npm run build` | `✓ built in 742ms` · exit 0 | — |

**`shared/` y backend sin tocar:** `git diff --stat e502381 -- shared backend infra .env.example` sale vacío, y no hay archivos sin rastrear fuera de `frontend/` y `docs/trabajo/`. Por eso no aplica la regla de `shared/` de `AGENTS.md` y no corrí el backend.

### 1. Cumplimiento de 03c1 (reparto de DH-14, §D-7)
- **7.1:** `SECCIONES_DE_LA_CLASE` es una sola lista para las tres perspectivas: Avisos · Actividades de aprendizaje · Personas · Calificaciones, sin "Foro". `crearTarea` sale de `CapacidadesDePerspectiva`, y `TEXTOS_CLASE.alumnos` y `.maestrosDeLaClase` salen del todo. `TEXTOS_CLASE.recursos` y `.dudas` se suman ya (§D-7.1 lo pide), aunque nadie los lee hasta 03d y 03e.
- **7.2 con N-47:**
  - `ul` con `relative flex`, `li` con `shrink-0` y enlace con `whitespace-nowrap`.
  - El indicador usa `translate-x-(--indicador-x)` y `w-(--indicador-ancho)` con las dos variables en `style`, la excepción de A-01; no hay corchetes arbitrarios. Sin sección activa no se monta.
  - `useLayoutEffect` mide y desplaza solo al montar y al cambiar de sección. `ResizeObserver` y `document.fonts.ready` vuelven a medir sin desplazar, cada uno con su guarda, y se desconectan al desmontar.
  - `CLASES_DEL_INDICADOR_POR_SECCIONES` y `CLASES_DE_LA_REJILLA_POR_SECCIONES` salen; `CLASES_DE_POSICION_DEL_INDICADOR` queda con `""` y `"translate-x-full"`.
  - N-47: `clase-layout.test.tsx` ya no habla de cuartos ni quintos (grep 0).
  - Los remedios de T-01 (la medida ligada a la `base`) y de T-02 (`opcionEnElPanel`, que mide y nunca escribe) siguen en su lugar.
- **7.3:** `components/seccion/hooks.ts` tiene el cuerpo exacto de la copia que había en `calificaciones`. `features/calificaciones/hooks.ts` solo lo reexporta, y es lo único que cambia en ese módulo fuera de sus pruebas. `MuroView` cambia su efecto de T-35 por el gancho, con el mismo comportamiento: en error, `refetch`; sana, nada.
- **7.4:** `personas` existe en las tres ramas. `alumnos` (maestro), y `alumnos` y `maestros` (admin), redirigen con `<Navigate to="../personas" replace />`. `trabajo` se conserva.
- **7.7:** `PersonasView` decide por `perspectivaDeRuta`.
  - El estudiante ve lo mismo que antes.
  - El maestro ve `MaestrosDeLaClaseEnLectura`, que sale de `useClase` sin petición nueva y usa `ListaMaestrosDeClase` con `puedeQuitar={false}`, y después `AlumnosView`.
  - El admin ve `MaestrosDeClaseView` y después `AlumnosView`.
  - `data-candidato-maestro-id` aparece en las dos filas y en los dos `useFilaEnFoco`.
- **Textos de §D-13 de 03c**, con la corrección 1 de la Enmienda 4, en `data.ts`:
  - `TEXTOS_CLASE.avisos`, `.trabajo` y `.personas`.
  - `TEXTOS_MURO`: el `tituloLista` "Avisos", los tres vacíos (el del admin, "Publica el primer aviso de esta clase."), "Ver más avisos" y R1.
  - `TEXTOS_TRABAJO`: el vacío, R2 y la recarga fallida.
  - `TEXTOS_TEMAS.consecuenciaSinConteo`, que se suma ahora y se usa en 03c2.
  - `TEXTOS_MAESTROS_DE_CLASE.consecuencia`.

  En el código de producción no queda ningún "Muro", "Publicaciones" ni "Trabajo de clase" visible (grep sin pruebas ni comentarios).
- **"Avisos" sin "Crear tarea":** `MuroView` pierde el enlace y sus importaciones. "Ver más avisos" usa `enEspera={publicaciones.isFetching}` (`muro-view.tsx:145`).
- **R1 y R2:** el gancho compartido está en `MuroView`, en `TrabajoView` (la lista de temas en error) y en `SeccionDeTema` (cada tema en error; los sanos no piden nada, S-10).
- **Pruebas requeridas:** encontré con `npx vitest list` todos los casos de 03c1:
  - `secciones-03c1.test.tsx`: CL3-C01 (3), CL3-C02 (7) y CL3-C04 (también lo cita el tester en `indicador-03c1-r1`).
  - `lib.test.ts`: CL3-C03 (5).
  - `app/clase-03c1.test.tsx`: CL3-C05 (9), CL3-C06 (3), CL3-C07 (2), CL3-C12 (5: a, b, c, d y "sana no pide"), CL3-C13 (5: a con un tema en error, a con la lista de temas en error, b, c y d) y CL3-C18 (7).
  - `components/seccion/hooks.test.tsx`: CL3-C16 (4).
  - `textos-03c1.test.ts`: CL3-C17 (5).
  - `personas-ver-mas-03c1.test.tsx`: CL3-C1R1-01 (1).
  - `opcion-en-el-panel-03c1.test.ts`: los 5 casos de `opcionEnElPanel`.
- **Lo de 03c2 no entró:** no hay `tipo=anuncio`, `seccion=actividades`, `useTemasDeLaSeccion`, `useMontado` ni guardas de §D-12 en el diff. Es correcto.
- **Hallazgos y arbitraje:**
  - T-01, T-02 y T-03 están corregidos. Sus casos de la ronda 1 están verdes en mi corrida, y la ronda 2 fijó los estados vecinos que pedí (24 casos verdes).
  - T-03 se aplicó solo en `tabla-alumnos.tsx:218` y `personas-view.tsx:73`. Los otros cinco «Ver más» con `isFetchingNextPage` (grep: `clases-admin-view.tsx:78`, `comentarios-de-publicacion.tsx:180`, `panel-mis-clases.tsx:61`, `admin/components/tabla-enlaces.tsx:240` y `registrados-del-enlace.tsx:71`) son las filas 24 a 28 de CHORE-04, que ya están en `ESTADO.md`.
  - O-01 y O-02 quedan cerradas como observación, sin destino (arbitraje de la ronda 1).
  - No hay desacuerdos abiertos.

### 2. V-01 y "No se toca"
- **V-01:** comparé las **235 de 235** `*.ataque` con la tabla de la ronda 2 (`join` por ruta, `sha256sum` de `git ls-files` más las no rastreadas): 0 diferencias, 0 faltantes, 0 sobrantes.
  - Contra `e502381` cambiaron 24 `*.ataque`. Todas son reescrituras del tester en la ronda 0 de 03c1: 21, más las 2 de P-03c1-1 y la de la adenda 2 (C-20).
  - Hay 5 nuevas: `estatico-03c1-r1`, `indicador-03c1-r1`, `indicador-03c1-r2`, `app/personas-03c1-r1` y `app/personas-03c1-r2`.
  - El programador no cambió ninguna `*.ataque`.
- **Pruebas normales cambiadas:** todas están en la lista cerrada de 03c1, con la Enmienda 5: `marco.test.tsx:302,305`, `router-01d.test.tsx`, `clase-layout.test.tsx`, `lib.test.ts`, `maestros-de-clase-view.test.tsx`, `muro-view.test.tsx`, `features/clases/recuperar-ch3.test.tsx`, `tarjeta-de-tarea.test.tsx` y `trabajo-view.test.tsx`.
- **Excepción autorizada:** `features/tareas/recuperar-ch3.test.tsx` cambia solo en `:449` (título) y `:470` (`/Actividades de aprendizaje/`), según `git diff -U0`.
- **Fuera de las pruebas**, en `features/tareas`, `features/admin`, `features/auth`, `features/diagnostico`, `features/calificaciones`, `lib/`, `services/`, `app/providers.tsx`, `app/require-*`, `components/ui|adjuntos|foco|layout|clase` y `styles/`: el único cambio es `features/calificaciones/hooks.ts`, la reexportación permitida. `components/seccion/` es la carpeta nueva de DH-06.
- **Capas y estilo:**
  - `useIndicadorDeSecciones` vive en `hooks.ts`; las funciones puras, en `lib.ts`; los tipos, en `types.ts`. En los componentes solo hay interfaces de Props.
  - Hay retornos tempranos y ningún ternario anidado en JSX.
  - No hay valores por defecto silenciosos. `MaestrosDeLaClaseEnLectura` sigue el orden error → cargando → datos.
- **Diseño:** el único valor suelto es el `style` de las dos variables medidas, que A-01 documenta como excepción. El estado de la sección va con `aria-current` y `text-link`, no solo con el indicador. "Personas" junta paneles que ya existían, sin `primary` (grep 0), y no hay patrón visual nuevo fuera de lo que documentan A-01 y A-02.

### 3. Documentos aplicados por el orquestador (contra el plan)
Hashes reproducidos: `DESIGN.md` `0c85338b…`, `CLAUDE.md` `c9a2f534…` y `ARCHITECTURE-ESSENTIALS.md` `b93f7275…`. La copia `DESIGN-antes-03c1.md` es igual a `HEAD`. La copia `ESTADO-antes-03c1.md` difiere de `HEAD` solo en §2 (el hash de `<K3b>`), que es anterior a 03c1.

**Cotejo literal** (comprobé con Python que cada texto aplicado es una subcadena exacta de `plan.md`):
- **A-01** (§7.3, la viñeta entera, con la excepción del `style`): literal.
- **A-02** (§7.16):
  - La viñeta "Secciones (propuesta (DOCS-04); fijada en propuesta (CLASES-03c))": literal.
  - Las tres remisiones ("Actividades de aprendizaje: §7.22.", "Recursos: §7.30 (…CLASES-03d).", "Dudas: §7.31 (…CLASES-03e).") reemplazan las viñetas viejas en su lugar.
  - "Foro" queda intacto.
  - En "Perspectivas" cambia solo la frase que manda el plan.
  - La frase de §7.17 (`DESIGN.md:681`) es literal.
- **A-03** (frase de entrada de §7.18): literal.
- **A-04** (frase de entrada de §7.22):
  - Es igual al texto del plan si se le devuelve la frase de los conteos, que es justo la que DH-14 deja para 03c2.
  - R2 en "Carga por tema" y el texto de "Recarga fallida" coinciden con §D-13.
- **A-08** (`CLAUDE.md`, después de `components/foco/`): literal. Solo falta el punto final, igual que en las viñetas vecinas.
- **A-11** ("Interfaz" de ESSENTIALS): literal.

**Marcas de origen:** ninguna se borró.
- "Con siete opciones (propuesta (DOCS-04)…)" y "Siete secciones (propuesta (DOCS-04)…)" pasan a "(propuesta (DOCS-04); fijada en propuesta (CLASES-03c))".
- Las frases de entrada de §7.18 y §7.22, que remitían a "propuesta (DOCS-04)", ahora la llevan con su "fijada en".
- "Perspectivas (propuesta (CLASES-02c))" conserva su marca.
- Las viñetas hijas que se fueron no tenían marca propia.

**Patrón visual nuevo documentado en DESIGN.md en este encargo:**
- El indicador medido y la excepción del `style` están en A-01.
- "Personas" con maestros arriba y alumnos abajo, por perspectiva, está en A-02.
- "Avisos" sin "Crear tarea" está en A-02 y A-03.
- No veo otro patrón nuevo en 03c1. `MaestrosDeLaClaseEnLectura` es un `Card` con `h2`, el panel de siempre.

**`ESTADO.md` (contra la copia previa):**
- N-47 está marcado "Hecho en CLASES-03c1".
- N-54 dice "Cumplido en Avisos y Actividades de aprendizaje … Recursos y Dudas lo usarán en CLASES-03d y 03e; queda el resto del inventario".
- La fila de los "Ver más" dice que el roster y los compañeros quedaron hechos y que lo demás pasa a CHORE-04, filas 26 a 28.
- Las filas 26, 27 y 28 están en el inventario de CHORE-04, con la nota de los dos `inicio-sin-datos-*.ataque` en la 28.
- Las filas 1 y 2 de CHORE-04 y O-16 siguen abiertas. Es correcto: son de 03c2 (A-12).

## Problemas que bloquean
Ninguno.

## Problemas que no bloquean
### M-01 — `DESIGN.md` §7.16 se contradice: la viñeta "Secciones" de `ClaseLayout` sigue con los nombres y el indicador de antes
Dónde: `docs/DESIGN.md:662`, viñeta "**Secciones** (`SeccionesDeClase`)". Todavía dice:
- "es la segunda sección de las tres perspectivas: "Muro", "Trabajo de clase" y "Personas" (estudiante), "Muro", "Trabajo de clase" y "Alumnos" (maestro)…";
- "…con el control segmentado de cuatro opciones de §7.3";
- "Con cinco opciones, el indicador sigue la regla de §7.3", es decir, columnas iguales.

Tres líneas abajo, la viñeta nueva "Secciones (…CLASES-03c)" y A-01 (§7.3) dicen otra cosa.

Por qué importa: `DESIGN.md` es la fuente única del sistema visual, y quien planee 03d lee dos reglas opuestas en la misma sección. No es un error del orquestador: A-02 no incluyó esa viñeta en lo que se reemplaza, así que es un hueco del plan. Como `docs/` fuera de A-01 a A-13 está en "No se toca", el orquestador no puede corregirlo por su cuenta.

Qué se espera: una enmienda del arquitecto (o un A-nn nuevo) con el texto que cierra esa viñeta como historia de CLASES-02 y CALIFICACIONES-01d. Por ejemplo, una frase final del tipo "Desde CLASES-03, los nombres, el orden y el indicador son los de «Secciones», abajo, y §7.3 «Secciones de una clase»". Debe aplicarse a más tardar al cerrar 03c2, y la revisión final de 03c2 lo verifica. No frena el commit de 03c1.

### M-02 — Frases de A-03 y A-04 que solo se vuelven verdad con 03c2. Se aceptan; no hay que esperar
Dónde:
- `DESIGN.md:685`, la frase de entrada de §7.18: "el muro se llama "Avisos" y solo lista anuncios".
- `DESIGN.md:753`, la frase de entrada de §7.22: "solo lista actividades (hoy, tareas)".
- Por arrastre, la de §7.18 que dice que la tarea en el muro, "Tema" del material, "Tipo con una publicación en vuelo" y "Crear tarea" "solo se alcanzan por compatibilidad".

Por qué importa: en el commit de 03c1, "Avisos" todavía pide `…/publicaciones` sin `tipo=anuncio` y "Actividades" pide `…/trabajo` sin `seccion=actividades`. Así que la lista de Avisos todavía muestra materiales y tareas, y la de Actividades todavía muestra materiales. Esos filtros son CL3-C08 y CL3-C09, de 03c2.

Dictamen: son aceptables tal como están, y ninguna frase tiene que esperar a 03c2.
1. DH-14, aprobado por el humano, asigna estas frases a 03c1. Solo deja para 03c2 la frase de los conteos y la parte de O-16 y CHORE-04. Recortarlas ahora sería apartarse del texto aprobado.
2. La rama no se despliega hasta después de 03e (A-13, DEPLOY), y el commit de 03c2 viene en seguida.
3. Las referencias hacia adelante (los seis nombres con Recursos y Dudas, los segmentos `recursos` y `dudas`, §7.30, §7.31, "Hasta FORO-01 son seis" de ESSENTIALS y "Recursos y Dudas" en A-08) se escribieron así aposta: el plan las aplicaba al cerrar 03c aunque no se partiera, y 03c nunca iba a traer Recursos ni Dudas.

Qué se espera: que la revisión final de 03c2 compruebe que las dos frases "solo lista…" ya son verdad (CL3-C08 y CL3-C09 verdes). Además, que `aprobacion.md` anote que, entre `<K3c1>` y `<K3c2>`, esas frases se adelantan a 03c2.

### M-03 — `ESTADO.md` §2 sigue en el estado de antes de 03c1. Paso de cierre del orquestador, antes del commit
Dónde: `docs/ESTADO.md:236`. Todavía dice "03c1 espera la confirmación del humano de los textos de §D-13 (DH-12)" y "DH-12 … pendiente", con las cifras del frontend 237 / 5310 y 230 `*.ataque`.

Qué se espera: antes del `git add`, §2 debe decir:
- DH-12 cerrada, con la Enmienda 4.
- Las Enmiendas 4 a 7 y el plan `84074f4a…`.
- 03c1 cerrada: ronda 1 ROTO (T-01 a T-03, corregidos), ronda 2 RESISTE y revisión final APROBADO CON OBSERVACIONES.
- Frontend 248 / 5434 y 235 `*.ataque`.
- Pendiente del commit `<K3c1>`.

## Detalles menores
- **M-02 de la verificación del resumen**, `trabajo-view.tsx:49`: el comentario de 132 caracteres que agregó este encargo ("…DH-09). El alumno lo ve agrupado por tema y de solo lectura;") sigue sin partir. Va a 03c2, que toca el archivo. Prettier no reacomoda comentarios.
- **M-01 de la verificación del resumen**, el comentario de `CapacidadesDePerspectiva`: ya se movió en la ronda 1. Está cerrado.
- El texto que A-02 reemplazó en §7.16 se llevó la nota "'Exportar a Excel' del gradebook lo diseña CALIFICACIONES-02". No se pierde ninguna decisión, porque PRD RF-65 la conserva. Se puede devolver si el arquitecto toca §7.16 por M-01.
- **O-03 del tester:** los «Ver más» con `isFetchingNextPage` son las filas 24 a 28 de CHORE-04, ya registradas en `ESTADO.md`.

## Desacuerdos arbitrados
Ninguno nuevo. Siguen el arbitraje de la ronda 1 (T-01, T-02 y T-03 en 03c1; O-01 y O-02 cerradas) y la decisión del orquestador sobre P-03c1-1 (C-16).

## Documentos a actualizar
- `ESTADO.md` §2: M-03, antes del commit.
- `DESIGN.md:662`: M-01, con enmienda del arquitecto, a más tardar al cerrar 03c2.
- Lo demás que corresponde a 03c1 (A-01, A-02, A-03 y A-04 en su parte, A-08, A-11 y la parte de A-12 de 03c1) ya está aplicado. Quedan para 03c2 la frase de los conteos de A-04 y lo de A-12 sobre O-16 y CHORE-04 (filas 1 y 2).

## Para el humano
- **Comprobación en navegador:** es una sola, al final de 03e, y ningún agente la hace. Solo dejo registrados los puntos que tocan 03c1:
  - **H-1:** el indicador a 360, 768 y 1440 px en las tres perspectivas. Debe cubrir la activa al entrar y al cambiar, y a 360 px el grupo se desplaza dentro de su panel.
  - **H-2:** con zoom al 200 % y tras recargar, cuando las fuentes llegan tarde. La ronda 2 dejó anotado que mezclar `getBoundingClientRect` (fraccionario) con `offsetLeft` (entero) puede dejar menos de 1 px.
  - **H-6:** "Personas" del admin con el teclado (los dos buscadores y las dos listas). El atributo `data-candidato-maestro-id` es de 03c1.
  - **H-7**, en su parte de las secciones: el lector de pantalla anuncia la activa.
- M-02 es informativo: entre el commit de 03c1 y el de 03c2, `DESIGN.md` describe "Avisos" y "Actividades" ya filtradas.

## Rutas para el `git add` del commit de 03c1
Código (14 modificados y 1 nuevo):
```
frontend/src/app/router.tsx
frontend/src/components/seccion/hooks.ts
frontend/src/features/calificaciones/hooks.ts
frontend/src/features/clases/components/buscador-de-maestros.tsx
frontend/src/features/clases/components/seccion-de-tema.tsx
frontend/src/features/clases/components/secciones-de-clase.tsx
frontend/src/features/clases/components/tabla-alumnos.tsx
frontend/src/features/clases/data.ts
frontend/src/features/clases/hooks.ts
frontend/src/features/clases/lib.ts
frontend/src/features/clases/types.ts
frontend/src/features/clases/maestros-de-clase-view.tsx
frontend/src/features/clases/muro-view.tsx
frontend/src/features/clases/personas-view.tsx
frontend/src/features/clases/trabajo-view.tsx
```
Pruebas normales (10 modificadas y 6 nuevas):
```
frontend/src/app/marco.test.tsx
frontend/src/app/router-01d.test.tsx
frontend/src/app/clase-03c1.test.tsx
frontend/src/components/seccion/hooks.test.tsx
frontend/src/features/clases/clase-layout.test.tsx
frontend/src/features/clases/lib.test.ts
frontend/src/features/clases/maestros-de-clase-view.test.tsx
frontend/src/features/clases/muro-view.test.tsx
frontend/src/features/clases/recuperar-ch3.test.tsx
frontend/src/features/clases/tarjeta-de-tarea.test.tsx
frontend/src/features/clases/trabajo-view.test.tsx
frontend/src/features/clases/opcion-en-el-panel-03c1.test.ts
frontend/src/features/clases/personas-ver-mas-03c1.test.tsx
frontend/src/features/clases/secciones-03c1.test.tsx
frontend/src/features/clases/textos-03c1.test.ts
frontend/src/features/tareas/recuperar-ch3.test.tsx
```
Pruebas `*.ataque` (24 modificadas y 5 nuevas):
```
frontend/src/app/barra-02d-r1.ataque.test.tsx
frontend/src/app/muro-recuperar-c-r3.ataque.test.tsx
frontend/src/app/muro-recuperar-c-r4.ataque.test.tsx
frontend/src/app/rutas-01d-r1.ataque.test.tsx
frontend/src/app/personas-03c1-r1.ataque.test.tsx
frontend/src/app/personas-03c1-r2.ataque.test.tsx
frontend/src/components/layout/estatico-r1.ataque.test.ts
frontend/src/features/calificaciones/secciones-01d-r3.ataque.test.tsx
frontend/src/features/clases/archivos-d-r1.ataque.test.tsx
frontend/src/features/clases/archivos-d-r3.ataque.test.tsx
frontend/src/features/clases/cargar-mas-02c-r2.ataque.test.tsx
frontend/src/features/clases/clases-admin-02c-r1.ataque.test.tsx
frontend/src/features/clases/estatico-02c-r1.ataque.test.ts
frontend/src/features/clases/estatico-03c1-r1.ataque.test.ts
frontend/src/features/clases/foco-02c-r3.ataque.test.tsx
frontend/src/features/clases/foco-02c-r4.ataque.test.tsx
frontend/src/features/clases/foco-02c-r5.ataque.test.tsx
frontend/src/features/clases/foco-pestana-02d-r3.ataque.test.tsx
frontend/src/features/clases/heredados-02d-r1.ataque.test.tsx
frontend/src/features/clases/indicador-03c1-r1.ataque.test.tsx
frontend/src/features/clases/indicador-03c1-r2.ataque.test.tsx
frontend/src/features/clases/maestros-02c-r1.ataque.test.tsx
frontend/src/features/clases/muro-02c-r1.ataque.test.tsx
frontend/src/features/clases/muro-c-r1.ataque.test.tsx
frontend/src/features/clases/muro-c-r2.ataque.test.tsx
frontend/src/features/clases/muro-c-r3.ataque.test.tsx
frontend/src/features/clases/recuperar-ch3-r1.ataque.test.tsx
frontend/src/features/clases/ver-mas-01e-r3.ataque.test.tsx
frontend/src/features/tareas/formularios-ch3-r1.ataque.test.tsx
```
Documentos y carpeta de trabajo:
```
AGENTS.md
CLAUDE.md
docs/ARCHITECTURE-ESSENTIALS.md
docs/DESIGN.md
docs/ESTADO.md
docs/trabajo/CLASES-03-reorganizacion-de-la-clase/aprobacion.md
docs/trabajo/CLASES-03-reorganizacion-de-la-clase/plan.md
docs/trabajo/CLASES-03-reorganizacion-de-la-clase/reporte-tester.md
docs/trabajo/CLASES-03-reorganizacion-de-la-clase/revision.md
docs/trabajo/CLASES-03-reorganizacion-de-la-clase/resumen-programador-03c1.md
docs/trabajo/CLASES-03-reorganizacion-de-la-clase/resumen-programador-03c1-r1.md
```
En total son 71 archivos: 15 de código, 16 de pruebas normales, 29 `*.ataque`, 5 documentos y 6 de `docs/trabajo/`. Son exactamente los de `git status -uall` (57 modificados y 14 sin rastrear), sin archivos ajenos. No entra nada de `shared/`, `backend/` ni `infra/`. `AGENTS.md` entra por la regla de `shared/` que autorizó el humano (hash `bb985908…`). `docs/ARCHITECTURE.md` no cambió desde `HEAD`.

## Verificación de la Enmienda 8 — CLASES-03
Fecha: 2026-10-30. Solo lectura, grep y git. No corrí `lint`, `test` ni `build` porque el tester está corriendo la suite del frontend (ronda 0 de 03c2), y nunca corren dos suites a la vez. La Enmienda 8 solo cambia texto de documentos.

**Veredicto: APROBADA CON M-01 y M-02.** Ninguna de las dos frena el trabajo de 03c2 (la ronda 0, la implementación ni las rondas). Las dos son huecos de documentos, de la misma clase que el M-01 de la revisión final de 03c1. Se resuelven con una enmienda de documentos, que se aplica junto con A-02 bis y A-02 ter al cerrar 03c2. La revisión final de 03c2 lo verifica.

### 1. Hashes y diff
- `plan.md`: 1188 líneas, SHA-256 `8ae33a509fd5b2b76e2448f5700e8ae283d221e0718d00a22559b52e94e76065` (reproducido).
- Copia previa `…/scratchpad/copias-plan/plan-clases03-antes-enmienda8-84074f4a.md`: 1170 líneas, SHA-256 `84074f4a5ecda3725b51c52da2a82dfc26195ba021226c462f607d65f6d04fe6` (reproducido).
- `git diff --no-index` completo: 5 hunks, todos con su E8-n. Nada queda fuera de la tabla.

| Hunk | Líneas del plan nuevo | E8 |
|---|---|---|
| 1 | 2 (Estado) | E8-1 |
| 2 | 957 ("Si 03c se parte"), 960 (A-02 bis), 961 (A-02 ter) | E8-4, E8-2, E8-3 |
| 3 | 1013 (paso 5 de 03c2) | E8-5 |
| 4 | 1055 ("No se toca", línea de `docs/`) | E8-6 |
| 5 | 1174-1188 (sección "Enmienda 8", su tabla y la observación para 03d) | registro de E8-1 a E8-6 |

Ningún hunk toca alcance, diseño, código, pruebas requeridas, conteos, DH, §D-R0 ni las listas cerradas de 03c2 a 03e. La copia congelada sobre la que ataca el tester (`plan-clases03-v8-enmienda7-84074f4a.md`) sigue siendo válida para 03c2.

### 2. A-02 bis corrige M-01
- **Contra el código de `91756a5`** (`features/clases/components/secciones-de-clase.tsx`), todo coincide:
  - `<ul aria-label={TEXTOS_CLASE.secciones}>` (`:65`, "Secciones de la clase" en `data.ts:294`).
  - `NavLink` con `buttonVariants({ variant: "ghost", size: "sm" })` y `text-link` en el activo (`:37-42`), dentro de un `Card` (`:56`).
  - El indicador medido con `--indicador-x` y `--indicador-ancho` (`:47-63`).
  - `end={segmento === ""}`: solo "Avisos" (`:70`).
  - `indiceDeSeccionActiva` (`lib.ts:74-88`): la ruta exacta para `""` y el prefijo `destino/` para las demás. Por eso "Editar recurso" dejará activa "Recursos".

  El texto viejo decía "`NavLink` (`end`)" para todos, y eso ya era falso. A-02 bis lo corrige.
- **Marcas (DESIGN.md §11, `:942`, y la regla de marcas del plan, `:956`):** la viñeta vieja (`DESIGN.md:662`) lleva tres marcas, y las tres se conservan literales:
  - "propuesta, decisión del humano (2026-10-02)";
  - "propuesta aprobada (2026-10-11)", que suma "fijada en propuesta (CLASES-03c)";
  - "CALIFICACIONES-01d, propuesta aprobada (2026-10-26)", que también suma "fijada en propuesta (CLASES-03c)".

  La frase nueva "Desde CLASES-03" lleva "(propuesta (CLASES-03c))". No se borra ninguna marca.
- **Lo que la viñeta vieja decía y A-02 bis deja de decir:**
  - "Categorías de calificación" y el detalle de tarea "no son secciones": quedan en la viñeta "Secciones", que A-02 bis cita.
  - "Ninguna sección existente cambia de posición": era historia de 01d. Se pierde sin daño.
- **La nota de "Exportar a Excel"** (RF-65, CALIFICACIONES-02) vuelve, como pedía el detalle menor.
- **Las anclas** existen tal cual y una sola vez: `:662` empieza y termina con el texto que cita A-02 bis.

### 3. A-02 ter: las cuatro anclas y el barrido
- Las anclas (1), (2) y (3) de `:413` y la (4) de `:360` existen literales, una vez cada una. La (1) cambia "(viñeta siguiente)" por "(abajo)", y es correcto: desde A-01, la viñeta siguiente (`:414`) es "Secciones de una clase", y "Tipo de publicación" está en `:415`. Ninguna toca marcas.
- Hice el barrido yo mismo en `docs/DESIGN.md`, con dos greps: uno de "Trabajo de clase", "muro"/"Muro", "Alumnos", "Maestros", "cuatro/cinco opciones" y "cuatro secciones", y otro de "Personas", "secciones", "sección", "indicador", "/alumnos" y "/maestros". Las líneas que A-02 ter enumera son correctas, y su clasificación también (historia, patrón de §7.18, o algo que no es una sección): `:316`, `:318`, `:348`, `:390`, `:445`, `:452`, `:510`, `:538`, `:569`, `:687`, `:698`, `:716`, `:790`, `:791` y `:868`.
- Hay más menciones de "muro" que no están enumeradas: `:587`, `:706`, `:709`, `:726`, `:732`, `:737`, `:746` y `:755`. Todas nombran el patrón de §7.18 o la clave de su caché, así que entran en la categoría "nombran el patrón de §7.18", aunque no estén en la lista. No pido cambio.
- La única que no entra en ninguna categoría es `:449` (M-01, abajo).

### 4. Momento de aplicación
El cierre de 03c2 es coherente por cuatro razones:
- Cumple el "a más tardar al cerrar 03c2" de M-01.
- 03c2 no toca `secciones-de-clase.tsx`, `indiceDeSeccionActiva` ni `CAPACIDADES_POR_PERSPECTIVA`, así que lo que afirma A-02 bis sigue siendo cierto en `<K3c2>`.
- La revisión final de 03c2 lo verifica, con el paso 5 de 03c2 y la viñeta "Si 03c se parte".
- E8-6 lo deja dentro de la excepción de "No se toca".

### M-01 — El barrido de A-02 ter no ve `DESIGN.md:449`, que nombra "Alumnos" como página de la clase
Dónde: `docs/DESIGN.md:449`, §7.4, viñeta "Lista de clases de la barra (propuesta (CLASES-02d); …)". Dice: "con `aria-current="page"` en cualquier página de esa clase (muro, Personas o Alumnos)".

Por qué importa: está escrita en presente y enumera las páginas de la clase con los nombres de antes. Desde 03c1, "Alumnos" ya no es una página: `…/alumnos` redirige a `…/personas`. Además faltan "Actividades de aprendizaje" y "Calificaciones". No es historia ni una cosa que no sea sección, que son las dos categorías del barrido. Y "Alumnos" estaba entre las palabras del barrido. Es el mismo defecto que M-01 de 03c1: `DESIGN.md` describe las secciones de antes en presente.

Qué se espera: un cambio literal más en A-02 ter, sin tocar la marca de la viñeta, que haga verdad la enumeración. Por ejemplo, "(muro, Personas o Alumnos)" pasa a "(cualquiera de sus secciones, §7.16, y las pantallas que cuelgan de ellas)". También hay que sumar `:449` a la lista del barrido. Se aplica al cerrar 03c2.

### M-02 — Dos textos de la interfaz que 03c1 ya cambió siguen viejos en `DESIGN.md`, y ningún A-nn los cubre
Dónde y qué:
- `docs/DESIGN.md:695`, §7.18, viñeta "Ver más": "Ver más publicaciones", dos veces. El código de `91756a5` dice "Ver más avisos" (`TEXTOS_MURO.verMasPublicaciones`, `features/clases/data.ts:352`; §D-13 del plan).
- `docs/DESIGN.md:757`, §7.22, viñeta "Orden": el vacío "Aún no hay tareas ni materiales en esta clase.". El código de `91756a5` dice "Aún no hay actividades en esta clase." (`TEXTOS_TRABAJO.vacio`, `data.ts:489`; §D-13; CL3-C09).

Por qué importa: es la misma clase de hueco que M-01 de 03c1, un texto de `DESIGN.md` que contradice lo construido y que la lista de A-nn no reemplaza. A-03 solo cambia la frase de entrada de §7.18. A-04 cambia la frase de entrada de §7.22 y los textos de "Recarga fallida" y "Carga por tema" (R2 y la recarga fallida, ya aplicados en `:759` y `:764`), pero no el vacío de "Orden". El barrido de la Enmienda 8 se limitó a los nombres de las secciones y al indicador, así que tampoco los ve. Los dos son de 03c1, y mi revisión final de 03c1 los dejó pasar: lo anoto como hueco propio. Como `docs/` está en "No se toca", el orquestador no puede corregirlos por su cuenta.

Qué se espera: en la misma enmienda que M-01, dos cambios literales, aplicados al cerrar 03c2:
- en `:695`, "Ver más publicaciones" pasa a "Ver más avisos" en sus dos apariciones, sin tocar la marca "propuesta aprobada (2026-10-11)";
- en `:757`, el vacío pasa a "Aún no hay actividades en esta clase.".

Antes, el arquitecto cruza cada texto de §D-13 que cambia en 03c1 y 03c2 con `DESIGN.md` (un grep por cada texto viejo de la tabla) y confirma que no queda otro. Los textos de §D-13 que entran en 03d y 03e (Recursos y Dudas) ya los cubren A-05 y A-06 como secciones nuevas.

### Arbitraje de la observación del arquitecto para 03d
Dictamen: **hay que enmendar ahora, en la misma enmienda de documentos que M-01 y M-02, con un A-03 bis que se aplica al cerrar 03d.** No conviene esperar a planear el cierre de 03d. Hay tres razones:
1. **El cambio es seguro, no condicional.** §8.7 del plan (`:318`) y CL3-D19 (`:828`) quitan de `FormularioPublicacion` el grupo "Tipo de publicación", el título y el tema. Con eso, `:415` ("Lo usa `FormularioPublicacion`") y "Publicar material" de `:713` quedan falsos en presente en cuanto cierre 03d.
2. **Ese momento no existe.** El plan de 03d ya está escrito, y nadie va a "planear el cierre de 03d" otra vez. Si se deja así, aparece como M-nn en la revisión final de 03d y cuesta una enmienda entonces, que es exactamente el patrón de M-01 de 03c1. Hacerlo ahora cuesta un párrafo de documentos.
3. **Depende del texto que deja A-02 ter (1).** La frase "y, desde CLASES-02d, el grupo "Tipo de publicación" (abajo)" la escribe esta misma enmienda en `:413`. Conviene que A-03 bis ancle sobre ese texto ya enmendado y no sobre el de hoy.

Alcance esperado del A-03 bis (el resultado, no la redacción):
- `:413`, el grupo "Tipo de publicación", y la viñeta de `:415` ("Lo usa `FormularioPublicacion`") pasan a historia "hasta CLASES-03d", con sus marcas intactas.
- En `:713`, "("Publicar anuncio" o "Publicar material")" pasa a "Publicar anuncio".
- Un vecino que la observación no nombra: `:696`, "Errores de campo", el texto "Escribe el título del material", que pierde su campo en 03d.

Las viñetas `:700` ("Tema" del material), `:701` (tipo en vuelo) y `:702` ("Crear tarea") ya están cubiertas por la frase de entrada de A-03 como lo construido hasta CLASES-03. La insignia "Material" de `:540` y `:691` sigue existiendo por DH-08, así que se queda.

### Para el orquestador
- La ronda 0 de 03c2 no se detiene.
- La enmienda de M-01, M-02 y A-03 bis puede llegar en cualquier momento antes del cierre de 03c2 (A-03 bis, antes del cierre de 03d). Antes de esa enmienda, guarda la copia del plan con su SHA-256 (`8ae33a50…`) en `aprobacion.md`, y yo la verifico con `git diff --no-index` contra esa copia.

## Verificación de la Enmienda 9 — CLASES-03
Fecha: 2026-10-30. Solo lectura, grep y git. No corrí `lint`, `test` ni `build` porque el tester sigue con la ronda 0 de 03c2 en la suite del frontend, y nunca corren dos suites a la vez. La Enmienda 9 solo cambia texto de documentos.

**Veredicto: APROBADA CON M-01.** M-01 es una frase de A-03 bis que pone una fecha falsa en `DESIGN.md`. No frena 03c2, porque A-03 bis se aplica al cerrar 03d. Se corrige en la enmienda del arbitraje del título del recurso (abajo), que tiene que llegar antes de la ronda 0 de 03d. M-01 y M-02 de la verificación de la Enmienda 8 quedan cerrados.

### 1. Hashes y diff
- `plan.md`: 1207 líneas, SHA-256 `d0b9216f4684d65e90426a44fe070db1a3fb973ab3217216a76c7908629592f3`. Lo reproduje y coincide con `aprobacion.md:185`.
- Copia previa `…/scratchpad/copias-plan/plan-clases03-antes-enmienda9-8ae33a50.md`: 1188 líneas, SHA-256 `8ae33a509fd5b2b76e2448f5700e8ae283d221e0718d00a22559b52e94e76065` (reproducido).
- `git diff --no-index` completo: 5 hunks, todos con su E9-n. Nada queda fuera de la tabla.

| Hunk | Líneas del plan nuevo | E9 |
|---|---|---|
| 1 | 2 (Estado) | E9-1 |
| 2 | 961 (A-02 ter, reescrita solo con la cola "Enmienda 9": cambios (5) a (8), barrido y cruce de §D-13) y 963 (A-03 bis nueva) | E9-2, E9-3, E9-4, E9-5 y E9-6 |
| 3 | 1027 (paso 8 de 03d) | E9-7 |
| 4 | 1057 ("No se toca", línea de `docs/`) | E9-8 |
| 5 | 1191-1207 (sección "Enmienda 9", su tabla y la observación del título) | registro de E9-1 a E9-8 |

En la línea de A-02 ter, el texto anterior a "**Enmienda 9 (…)**" es idéntico byte por byte al de la Enmienda 8. Ningún hunk toca alcance, código, pruebas requeridas, conteos, DH, §D-R0 ni listas cerradas.

### 2. Anclas, contra `DESIGN.md` en `HEAD`, sin cambios en el árbol
Conté cada ancla literal con `grep -o -F`. Todas están una sola vez y en la línea que cita el plan:

| Ancla | Línea |
|---|---|
| (5) "(muro, Personas o Alumnos);", con su marca "(propuesta (CLASES-02d); decisión del humano P-02 A; …)" | `:449` |
| (6) "- **"Ver más":** "Ver más publicaciones" y "Ver más comentarios"" y "aplicada a "Ver más publicaciones";" | `:695` |
| (7) el vacío "Aún no hay tareas ni materiales en esta clase." | `:757` |
| (8) "dentro de la clase: las tareas y los materiales agrupados por tema." y "El muro sigue cronológico (§7.18)." | `:755` |
| A-03 bis (2), con el encabezado de la viñeta | `:415` |
| A-03 bis (3) | `:696` |
| A-03 bis (4) | `:713` |

- En (6), "Ver más publicaciones" aparece dos veces en `:695` y las dos anclas las distinguen. Tras el primer reemplazo, la segunda sigue siendo única.
- A-03 bis (1) ancla sobre el texto que deja A-02 ter (1), "y, desde CLASES-02d, el grupo "Tipo de publicación" (abajo).". Hoy `:413` dice "(viñeta siguiente)" una sola vez, así que tras A-02 ter queda una sola vez. El orden que fijan A-03 bis ("después de A-02 ter") y el paso 8 de 03d es correcto.
- **Marcas:** ningún cambio toca una marca de origen. (5) y (6) lo dicen de forma expresa, y A-03 bis dice "con todas las marcas intactas". Las notas nuevas ("(CLASES-03c)" y "hasta CLASES-03d") se suman, no reemplazan.

### 3. Contra el código de `91756a5`
- (6): `TEXTOS_MURO.verMasPublicaciones` dice "Ver más avisos" (`data.ts:352`).
- (7): `TEXTOS_TRABAJO.vacio` dice "Aún no hay actividades en esta clase." (`data.ts:489`).
- (8): describe lo que será verdad con CL3-C09 (03c2), y se aplica al cerrar 03c2. "La fila "Material" … solo se alcanza por compatibilidad" coincide con DH-08.
- (5): la lista de la barra (`components/layout/lista-de-clases.tsx:89-90`) es un `NavLink` sin `end` hacia `/${rol}/clases/${id}`. Queda activo en cualquier ruta debajo de la clase. Ver el detalle menor.
- A-03 bis: §D-8.7 (`:318`) y CL3-D19 (`:828`) quitan el grupo, el título y el tema. El control de dos botones sigue vigente en `FormularioTarea` (`DESIGN.md:417` y `:739`; `features/tareas/data.ts`). Ver M-01.

### 4. Cruce de §D-13 (lo repetí yo)
Saqué los textos que 03c1 quitó con `git diff e502381 91756a5 -- frontend/src/features/clases/data.ts`, de las líneas `-`. Busqué cada uno en `docs/DESIGN.md` con `grep -F`:

| Texto viejo | Dónde aparece en `DESIGN.md` |
|---|---|
| "Aún no hay publicaciones en esta clase." | en ninguna |
| "Tu maestro aún no ha publicado nada en esta clase." | en ninguna |
| "Publica el primer anuncio o material de tu clase." | en ninguna |
| "El muro cambió mientras lo veías. Vuelve a abrirlo…" | en ninguna |
| "…Vuelve a abrir Trabajo de clase…" | en ninguna |
| "No pudimos actualizar Trabajo de clase…" | en ninguna |
| "…se queda en el muro." | en ninguna |
| `"Publicaciones"` | en ninguna |
| "Ver más publicaciones" | `:695`, cambio (6) |
| "Aún no hay tareas ni materiales en esta clase." | `:757`, cambio (7) |
| "Crear tarea" | `:664` y `:762`, ya verdad; `:685` y `:702`, cubiertas por A-03 |

- Los nombres "Muro", "Trabajo de clase", "Alumnos" y "Maestros" son los del barrido de las Enmiendas 8 y 9.
- Las clases `grid-cols-N`, `w-1/N` y `translate-x-…` caen en las reglas de columnas de §7.3, que A-01 deja para los controles de columnas iguales.
- 03c2 solo suma `consecuenciaSinConteo`, un texto nuevo sin texto viejo.

El cruce de E9-5 es correcto y completo.

### M-01 — A-03 bis (1) fecha "desde CLASES-03d" un control que existe desde la propuesta aprobada del 2026-10-11
Dónde: `plan.md:963`, A-03 bis, cambio (1). Dice que `:413` pasa a "…; desde CLASES-03d, el control de dos botones de "Entregas después de la fecha límite" (abajo).".

Por qué importa: es falso. "Entregas después de la fecha límite" implementa ese patrón desde la "propuesta aprobada (2026-10-11)" de `FormularioTarea` (`DESIGN.md:417`). "Cómo se entrega" lo usa desde la "propuesta aprobada (2026-10-12)" (`:739`). CLASES-03d no les cambia nada. `DESIGN.md` es la fuente única, y una fecha de origen equivocada es justo lo que las marcas buscan evitar (§11). El cambio (2) tiene el mismo defecto a medias: "lo usa "Entregas después de la fecha límite"" deja fuera "Cómo se entrega".

Qué se espera: (1) dice que el patrón también lo usan los controles de dos botones de `FormularioTarea`, sin fecharlos en CLASES-03d. Por ejemplo, "…(abajo); los controles de dos botones de `FormularioTarea` ("Entregas después de la fecha límite" y "Cómo se entrega", abajo) siguen el mismo patrón.". (2) nombra los dos. Se corrige antes del cierre de 03d. Lo más barato es hacerlo en la misma enmienda del título del recurso.

### Arbitraje — el título vacío del recurso ("…del material" al crear, "…del recurso" al editar)
**Lo decido yo, sin escalar: un solo texto, "Escribe el título del recurso", en crear y en editar.** El humano queda informado.

Por qué no es del humano:
- DH-12 aprobó los textos de §D-13, y ninguno de los dos está en esa tabla. Los dos son mensajes de esquemas de `shared/`, ya construidos:
  - "Escribe el título del material" es de `crearPublicacionSchema`, rama `material` (`shared/src/clases.ts:420`), desde CLASES-c.
  - "Escribe el título del recurso" es de `editarRecursoSchema` (`shared/src/recursos.ts:67`), de 03a, ya en un commit.
- La decisión no crea un texto ni cambia uno aprobado, y no toca alcance. Quita una incoherencia del plan (§D-8.5 eligió validar con dos esquemas) a favor del texto que ya usa el vocabulario aprobado: "Título del recurso", "Nuevo recurso" y "Publicar recurso" (§D-13). Que el mismo campo diga "material" al crear y "recurso" al editar contradice el tono de `DESIGN.md` §9 (concreto y con el nombre de lo que la persona ve).

Por qué necesita enmienda antes de la ronda 0 de 03d:
- El tester escribe sus `*.ataque` a partir del plan, y el programador no puede tocarlas.
- Si el texto se decide después, un ataque que fije "Escribe el título del material" al crear obligaría a otra ronda.
- No hace falta antes: 03c2 no toca recursos.

Qué se espera de la enmienda (el resultado, no la implementación):
1. En §D-8.5, el título vacío dice "Escribe el título del recurso" en los dos modos, sin tocar `shared/`. Por ejemplo, validando el título con la regla de `editarRecursoSchema`. Como las dos reglas son `textoConContenidoSchema(200, …)` y solo cambia el mensaje, el envío que pasa la validación local tampoco lo rechaza el servidor por el título.
2. Un caso en "Pruebas requeridas" de 03d: crear con el título vacío o con solo espacios muestra "Escribe el título del recurso" en un `ErrorDeCampo` y no envía nada. Puede sumarse a CL3-D08 o a CL3-D17. Si sube un conteo, se actualiza en el mismo cambio.
3. El grep de la lista cerrada de 03d sobre "Escribe el título del material", en las pruebas normales que cubren `FormularioRecurso` o su envoltorio.
4. En A-05 (§7.30), el error de campo "Escribe el título del recurso". Así, la remisión de A-03 bis (3), "el del recurso vive en "Recursos" (§7.30)", tiene a dónde apuntar.

### Detalle menor
- (5), `:449`: el paréntesis nuevo "(cualquiera de sus secciones, §7.16, y las pantallas que cuelgan de ellas; CLASES-03c)" se queda corto. El `NavLink` sin `end` también queda activo en "Editar clase" y "Categorías de calificación", que no son secciones ni cuelgan de una. Una forma más exacta sería "(sus secciones, §7.16, y las demás pantallas de la clase; CLASES-03c)". Se puede ajustar en la misma enmienda. No bloquea.

### Para el orquestador y el humano
- La ronda 0 de 03c2 no se detiene. Los cambios (5) a (8) se aplican al cerrar 03c2, como dice la Enmienda 9.
- Antes de la ronda 0 de 03d hace falta una enmienda de documentos y plan, con M-01 y el arbitraje del título (§D-8.5, el caso de prueba, la lista cerrada y A-05). Guarda antes la copia del plan, `d0b9216f…`, con su SHA-256.
- **Para el humano, solo informativo:** el formulario de recursos dirá "Escribe el título del recurso" también al crear, en lugar de "Escribe el título del material". Si prefiere otro texto, lo dice antes de la ronda 0 de 03d.

## Arbitraje de la ronda 0 — 03c2
Fecha: 2026-10-30. Fuente: `reporte-tester.md`, "## CLASES-03c2 — Ronda 0" (SHA-256 del archivo `6a189e1a3b633fabc6077918946a700e40bdfb9628d3b62b524a559c869a98b0`, reproducido) y la última entrada de `aprobacion.md`. Solo lectura, grep y git; sin suites. No toqué ni verifiqué la Enmienda 10.

**Veredicto: hace falta una Enmienda 11 pequeña (texto abajo) y una autorización del humano para dos líneas de `features/tareas`.** P-03c2-2 se resuelve ya con este arbitraje. Además, encontré dos hermanos que el reporte y el plan no tienen: dos pruebas normales que rompen por las mismas dos causas.

### 1. P-03c2-1 · `features/tareas/formularios-ch3-r1.ataque.test.tsx:240`
- Confirmado en el código. `:240` compara `` url === `${RUTA_CLASE}/temas` `` y todo lo demás cae en `inesperadas` (`:302-303`). Con §D-7.6 y N-08, el estudiante solo pide `…/temas?seccion=actividades`, así que el caso de `:960-996` se pondrá rojo en el paso 2. El cambio que propone el tester (`` ruta.pathname === `${RUTA_CLASE}/temas` ``) protege lo mismo: el camino de recuperación por el enlace de la tarea.
- **No cabe en ninguna fila de §D-R0.** La fila "Diseño" de `features/tareas` (plan, §D-R0, "Pruebas de `features/tareas` que nombran «Trabajo de clase»") solo permite cambiar estas pruebas cuando "aserten el nombre visible de la sección". Por eso valió en 03c1 (`:975`, el enlace) y no vale ahora: lo que rompe es la URL. C-25 abarca solo `features/clases` y `app/`. "No se toca" incluye toda la carpeta `frontend/src/features/tareas/`, con una sola excepción, y la autorización del humano del 2026-10-29 está "acotada a esas dos líneas de ese archivo" (`recuperar-ch3.test.tsx:449` y `:470`).
- **Decisión:** hacen falta las dos cosas. (a) **Autorización del humano**, porque `AGENTS.md` pide preguntar antes de instruir sobre un archivo de "No se toca". (b) **Enmienda 11** con una fila C-30 en §D-R0, condicionada a esa autorización, igual que la Enmienda 5. No hay remedio en el código: N-08, aprobado, quita al estudiante la consulta total.
- **Hermano que nadie inventarió (bloquea igual):** `features/tareas/recuperar-ch3.test.tsx:200` (prueba normal; CH3-A19, `:449-490`). Su doble compara `` ruta === `${RUTA_CLASE}/temas` ``, y `ruta` es la cadena completa (`:149`). Lo que no casa va a `inesperadas`, con un `400`. CH3-A19 pulsa «Actividades de aprendizaje» como estudiante y espera «Ensayo final». Romperá en el paso 2 de 03c2, igual que P-03c2-1. El barrido de la Enmienda 5 (E5-5) dice "En 03c2 no rompe nada nuevo", y eso es falso. Necesita una fila en la lista cerrada de 03c2 y que el humano amplíe su autorización a `:200`. Cambio mínimo: `` url.pathname === `${RUTA_CLASE}/temas` ``, porque `url` ya es el `URL` de `:151`.
- Barrido de hermanos (grep de comparaciones exactas de `…/temas` y de pruebas que montan el router fuera de `features/clases` y `app/`): solo estos dos rompen. `features/tareas/formularios-ch3.test.tsx:171` también compara exacto, pero no monta `TrabajoView`: los formularios de la tarea siguen pidiendo el total. `features/clases/formularios-ch3.test.tsx:273` compara la URL exacta, pero su caso de `:344` es el formulario de material, que en 03c2 sigue pidiendo el total. `app/router.test.tsx:218` ya tiene su fila en la lista cerrada de 03c2. `app/clase-03c1.test.tsx`, `consultas-ch3.test.tsx` y las `*.ataque` de `features/clases` comparan el `pathname`.

### 2. P-03c2-2 · `features/clases/trabajo-01e-r1.ataque.test.tsx:276-331`
- Confirmado. Hoy `useOrdenarTemas` solo hace `setQueryData(claveTemas)` (`features/clases/hooks.ts:869-871`). Con §D-7.6, la vista lee la lista por sección, y la espera de CL3-C10 la vuelve a pedir al doble, que sigue con el orden viejo. El caso falla en `:320-330`.
- **El cambio propuesto protege lo mismo, y algo más.** Se siguen asertando un solo `PUT` con el doble clic de 30 ms y el orden nuevo en la vista. El orden ahora llega por la recarga por sección, que es el contrato de 03c2. Si el gancho no invalidara esa lista, el caso fallaría. Antes de implementar también pasa, porque `setQueryData` escribe el orden nuevo en la lista total que hoy lee la vista. Así que no entra en "Rojos esperados".
- **Decisión: cabe en C-25 con este arbitraje, sin enmienda,** igual que `foco-pestana` en C-20. El archivo está en el inventario de C-25, y C-25 autoriza "el cambio mínimo en el doble" que exige la consulta nueva de temas. Lo dejo registrado en la Enmienda 11 (E11-4) para que §D-R0 quede exacto, pero el tester no espera a esa enmienda.
- **Qué hace el tester (adenda de la ronda 0; cuenta en V-01):** en el caso de `:276`, dentro del `act` de `:310-322` y **antes** de `soltar(…)`, el doble deja `datos.temas` en el orden nuevo, con un literal (`[{ id: idTema(2), nombre: "Unidad 2" }, { id: idTema(1), nombre: "Unidad 1" }]`), como haría el servidor al confirmar. Pone un comentario con el motivo (C-25, CL3-C10) y no cambia ninguna aserción. Nada más del archivo. Actualiza la tabla de SHA-256.
- **Hermanos de la espera de CL3-C10.** Solo `useOrdenarTemas` escribe `claveTemas` con `setQueryData` (grep en `features/clases/hooks.ts` y `features/tareas/hooks.ts`). Pulsan «Subir», «Bajar» o `…/temas/orden` cinco archivos:
  - `trabajo-01e-r2.ataque:171-191`: solo cuenta los `PUT`. No rompe.
  - `styles/clases-r1.ataque`: es estática. No rompe.
  - `formularios-ch3.test.tsx:587-592`: es la tabla de errores y nunca llega a `onSuccess`. No rompe.
  - `trabajo-view.test.tsx`, PR-1E02 (`:549-597`): su `manejar` ya guarda el orden en `datos` (`:555-558`). No rompe. El caso del `409` sigue por `onError` y no rompe.
  - **`trabajo-view.test.tsx` › "M-01 · «Bajar» de un tema y «Subir» de otro en el mismo turno mandan un solo PUT del orden" (`:1304-1341`, prueba normal): ROMPE.** Su `manejar` devuelve la respuesta retenida sin guardar el orden. `crearServidor(tresTemas(), …)` no conserva la referencia a los datos, y `:1337-1339` espera `["Unidad 2", "Unidad 1", "Unidad 3"]`. La fila de la lista cerrada de 03c2 para ese archivo solo nombra el doble del `GET …/temas` con `?seccion`, la URL de `…/trabajo` y la cuenta. No nombra el manejador del `PUT`. **Necesita ampliar la fila (Enmienda 11, E11-3).**

### 3. R-03c2-1 · indicación para el programador (confirmada)
Confirmado en `services/apiClient-ch3-r1.ataque.test.ts:59-84`. La expresión `\bCODIGOS_QUE_REDIRIGE_EL_CLIENTE\b` corre sobre el texto completo de cada archivo de producción, comentarios incluidos. Hoy ningún archivo de producción de `features/clases`, `components/`, `lib/` ni `app/` nombra la constante, y `lib.ts:16` importa `{ esApiError } from "@/services/apiClient"`. Indicación literal:
> En `features/clases/lib.ts`, une la constante a la importación que ya existe en la línea 16, exactamente así: `import { CODIGOS_QUE_REDIRIGE_EL_CLIENTE, esApiError } from "@/services/apiClient"` (comillas dobles, sin alias, sin una segunda importación del mismo módulo), y escribe `errorQueRedirigeElCliente` con el cuerpo de §D-11. No declares la constante ni escribas sus tres códigos entre comillas. **En ningún otro archivo de producción de `src/` (incluidos `features/clases/hooks.ts`, `data.ts`, `types.ts` y los componentes) aparece el texto `CODIGOS_QUE_REDIRIGE_EL_CLIENTE`, tampoco en un comentario.** Los `onError` de `useCrearClase` y `useEditarClase` llaman a `errorQueRedirigeElCliente(error)`. Si un comentario lo explica, di "un error con que `apiClient` ya redirige" o nombra `errorQueRedirigeElCliente`. En tus pruebas (`*.test.*`) sí puedes nombrarla.

### 4. R-03c2-2 · el `reset()` de §D-12 y CL3-C15
- En el código, ni `formulario-comentario.tsx` ni `formulario-clase.tsx` tienen `.reset()` (grep). Guardan el error del servidor en su estado `errores`, que la validación local reemplaza (`setErrores(erroresPorCampo(…))`) y que `setErrores({})` limpia antes de `mutate` (`formulario-comentario.tsx:34-39`; `formulario-clase.tsx:92-96` y `:105-111`). Es la segunda rama de la regla de `CLAUDE.md` › Formularios: "Si el error del servidor vive en un estado del formulario, la validación local lo reemplaza en ese mismo estado o lo limpia antes de validar".
- El texto de §D-12 ("conservando `if (… .isError) … .reset()` después de la guarda") pide **conservar**, no agregar: en estos dos archivos no hay nada que conservar. La frase de CL3-C15 ("el `reset()` de T-05 sigue limpiando el error viejo") nombra el mecanismo equivocado. Lo que protege es T-05 de CHORE-03: tras un rechazo del servidor, el envío siguiente muestra un solo mensaje, el suyo. Agregar `reset()` además rompería `lib/estatico-ch3-r2.ataque.test.ts:135-148`, que está fuera de §D-R0.
- **Decisión: "nada que conservar".** El programador **no agrega `reset()`** y `estatico-ch3-r2` no necesita fila. Indicación literal:
> En `formulario-comentario.tsx` y `formulario-clase.tsx`, la guarda de §D-12 es una ref que se marca justo antes de `mutate`, después de la validación local y, en editar, después de `if (claseId === undefined) return`. Se libera en el `onSettled` de esa misma llamada a `mutate`, para que una validación local fallida o la falta de `claseId` nunca la dejen tomada. No agregues `mutacion.reset()` ni `if (… .isError) … .reset()`: estos formularios no tienen ese `reset()`, y el error del servidor sigue en el estado `errores`, como hoy (reemplazado por la validación local o limpiado con `setErrores({})` antes de `mutate`). En CL3-C15, "el `reset()` de T-05 sigue limpiando el error viejo" se prueba así: tras un `400 VALIDACION` del servidor en el campo (su `ErrorDeCampo`), (a) un segundo envío válido quita ese `ErrorDeCampo` antes de la respuesta nueva, y (b) un segundo envío que la validación local rechaza muestra un solo `ErrorDeCampo`, el local, y ningún aviso. Además, el siguiente envío sale (la guarda se liberó). Titula el caso por lo que comprueba, sin la palabra `reset()`.

### 5. ¿Cambia el plan? Sí: texto mínimo para la Enmienda 11 (después de la 10)
Sin cambio de alcance, de diseño ni de DH. Guardar antes la copia de `plan.md` con su SHA-256.
- **E11-1 · §D-R0, fila nueva C-30 (03c2; condicionada a la autorización del humano, porque `features/tareas` está en "No se toca").** `frontend/src/features/tareas/formularios-ch3-r1.ataque.test.tsx:240` (caso de `:960-996`) | El doble atiende `GET …/temas` solo con la URL exacta | Con §D-7.6 y N-08, el estudiante pide `GET …/temas?seccion=actividades`: `:240` compara `ruta.pathname` en lugar de `url`. Nada más del archivo; no queda roja (pasa antes y después). | 03c2.
- **E11-2 · Lista cerrada de 03c2, fila nueva condicionada a la misma autorización:** `frontend/src/features/tareas/recuperar-ch3.test.tsx:200` (CH3-A19): `` ruta === `${RUTA_CLASE}/temas` `` → `` url.pathname === `${RUTA_CLASE}/temas` ``. Nada más. En "No se toca", la excepción de `recuperar-ch3.test.tsx` suma `:200` (03c2). En el barrido E5-5, "En 03c2 no rompe nada nuevo" pasa a "En 03c2 rompen `features/tareas/recuperar-ch3.test.tsx:200` (E11-2) y el caso M-01 de `trabajo-view.test.tsx` (E11-3)".
- **E11-3 · Lista cerrada de 03c2, fila de `features/clases/trabajo-view.test.tsx` ampliada:** en "M-01 · «Bajar» de un tema y «Subir» de otro en el mismo turno mandan un solo PUT del orden" (`:1304-1341`), el doble guarda el orden nuevo en sus datos justo antes de soltar la respuesta retenida del `PUT …/temas/orden` (como PR-1E02 en `:555-558`), para que la recarga por sección que espera `useOrdenarTemas` (CL3-C10) lo devuelva. Las aserciones (un `PUT`, su cuerpo y el orden en pantalla) no cambian.
- **E11-4 · §D-R0, C-25 (registro del arbitraje):** suma `trabajo-01e-r1.ataque.test.tsx:276-331`. El `PUT` retenido deja `datos.temas` en el orden nuevo antes de soltarse, por la espera de CL3-C10. Las aserciones no cambian.
- **E11-5 · §D-12 y CL3-C15.** En §D-12, "conservando `if (… .isError) … .reset()` después de la guarda" pasa a "sin `reset()`: los dos formularios guardan el error del servidor en su estado `errores`, que la validación local reemplaza y `setErrores({})` limpia antes de `mutate` (`CLAUDE.md` › Formularios); no se agrega `reset()` (`lib/estatico-ch3-r2.ataque.test.ts:135-148`)". En CL3-C15, "y el `reset()` de T-05 sigue limpiando el error viejo" pasa a "y, tras un `ErrorDeCampo` del servidor, el envío siguiente muestra un solo mensaje, el suyo (T-05 de CHORE-03)".

### Para el orquestador y el humano
- **Pregunta para el humano (una sola):** "¿Autorizas cambiar, en `features/tareas`, una línea en cada uno de dos archivos de prueba: `formularios-ch3-r1.ataque.test.tsx:240` (la cambia el tester) y `recuperar-ch3.test.tsx:200` (la cambia el programador)? En los dos, el doble de `GET …/temas` pasa a comparar la ruta sin la consulta (`pathname`), porque en 03c2 el estudiante pide `…/temas?seccion=actividades`. No cambia ninguna aserción." Recomiendo que sí. Si no lo autoriza, las dos pruebas quedan rojas y 03c2 no puede cerrar, porque no hay remedio en el código sin revertir N-08.
- **Orden:** (1) el tester aplica ya la adenda de P-03c2-2 (sección 2 de este arbitraje); (2) la Enmienda 11, después de la 10, con su verificación; (3) con la autorización, el tester aplica C-30 en la misma adenda de la ronda 0; (4) recién entonces entra el programador, con las indicaciones de las secciones 3 y 4. Si entra antes, se detiene en el paso 2 por E11-2 y E11-3.

## Verificación de la Enmienda 10 — CLASES-03
Fecha: 2026-10-30. Comparé solo las copias del scratchpad, porque `plan.md` cambia en paralelo con la Enmienda 11. Usé lectura, grep y git. No corrí `lint`, `test` ni `build`: el tester está corriendo un archivo.

**Veredicto: APROBADA, sin M-nn.** Quedan cerrados el M-01 y el detalle menor de la verificación de la Enmienda 9. El arbitraje del título del recurso quedó en el plan como lo pedí, y antes de la ronda 0 de 03d, como hacía falta.

### 1. Hashes y diff
- Copia de antes, `copias-plan/plan-clases03-antes-enmienda10-d0b9216f.md`: 1207 líneas, SHA-256 `d0b9216f4684d65e90426a44fe070db1a3fb973ab3217216a76c7908629592f3` (lo reproduje).
- Copia de después, `copias-plan/plan-clases03-v11-enmienda10-fe22a798.md`: 1223 líneas, SHA-256 `fe22a7986d8c307c457749c08412f84a7064a4af0f341499fca7e3b340503506` (lo reproduje).
- `git diff --no-index` completo: 9 hunks, con 24 líneas agregadas y 8 quitadas. Todos tienen su E10-n:

| Hunk | Dónde | E10 |
|---|---|---|
| 1 | Estado | E10-1 |
| 2 | §D-8.5, viñeta de la validación local (`:311`) | E10-4 |
| 3 | §D-R0, fila C-30 nueva (`:555`) | E10-6 |
| 4 | "Rojos esperados" de 03d (`:644`) | E10-6 |
| 5 | CL3-D28 nuevo (`:838`) | E10-5 |
| 6 | Lista cerrada de 03d, `formulario-publicacion.test.tsx` | E10-6 |
| 7 | A-02 ter (5), A-03 bis (1), (2) y su nota, y A-05 | E10-3, E10-2 y E10-7 |
| 8 | Paso 4 de 03d | E10-5 |
| 9 | Registro de la Enmienda 10 | — |

Ningún hunk toca `shared/`, el backend, ninguna DH ni nada de 03c2. A-02 ter solo cambia el texto de (5), que se sigue aplicando al cerrar 03c2.

### 2. A-03 bis (M-01 de la Enmienda 9)
- **Fecha corregida.** (1) ya no fecha el control de dos botones en CLASES-03d. Ahora dice "los controles de dos botones de `FormularioTarea` ("Entregas después de la fecha límite", abajo, y "Cómo se entrega", §7.21) siguen el mismo patrón". (2) dice "lo usan los controles de dos botones de `FormularioTarea`, …".
- **Referencias comprobadas.** "Entregas después de la fecha límite" está en `DESIGN.md:417`, debajo de `:413` y de `:415`. "Cómo se entrega" está en `:739`, que pertenece a §7.21 (`:735`, "Formulario de tarea y rúbrica"), con su marca "propuesta aprobada (2026-10-12)".
- **Marcas intactas.** A-03 bis sigue diciendo "con todas las marcas intactas", y (2) dice "sin tocar su encabezado". "Hasta CLASES-03d" solo se refiere al grupo "Tipo de publicación", que es lo que 03d quita.
- **Detalle menor de la Enmienda 9.** A-02 ter (5) pasa a "(sus secciones, §7.16, y las demás pantallas de la clase; CLASES-03c)", conserva la marca de `:449` y ya cubre "Editar clase" y "Categorías de calificación".

### 3. §D-8.5 y el servidor
- **De dónde sale el título.** Lo valida `editarRecursoSchema.shape.titulo`. `editarRecursoSchema` es un `z.object` sin envoltorio (`shared/src/recursos.ts:66-77`), así que `.shape.titulo` existe.
- **`shared/` sin cambios.** `git status` y `git diff HEAD -- shared/` no muestran nada.
- **El servidor no rechaza lo que pasó la validación local.**
  - La regla del título al crear (`crearPublicacionSchema`, rama `material`, `shared/src/clases.ts:420`) y la de editar (`recursos.ts:67`) son la misma función: `textoConContenidoSchema(200, mensaje)` (`clases.ts:125-129`).
  - Esa función usa `textoLargoCon`, cuyos mensajes son genéricos (`clases.ts:111-118`), con el mismo máximo y el mismo mínimo de caracteres visibles.
  - Solo cambia el mensaje del título vacío. Por eso, un título que pasa la validación local tampoco lo rechaza el servidor.
- **`400 VALIDACION` del servidor.** Si aun así llega uno con `titulo:`, se muestra como el de cualquier campo pintado (§D-15), y CL3-D15 y CL3-D17 lo cubren.

### 4. CL3-D28 y el conteo de 03d
- **Los casos son consecutivos.** CL3-D28 existe (`:838`). Conté las viñetas de 03d con `grep -c "^- \*\*CL3-D[0-9]"`: dan 28, de D01 a D28, sin saltos ni duplicados. Coincide con "03d pasa de 27 a 28" de E10-5.
- **Ningún otro conteo cambia.** El único conteo del plan con cifra (03c, 19 pruebas) no se toca. El paso 4 de 03d suma D28.
- **Lo que pide el caso.** Cubre crear y editar, el título vacío, solo con espacios y solo con invisibles. Pide un único `ErrorDeCampo` con `aria-invalid`, cero `POST` o `PUT`, nunca "…del material", lo escrito conservado y el botón fuera de la espera. Cubre lo que pedí.

### 5. C-30, "Rojos esperados" y el grep
- **El caso que cita C-30 existe tal cual.** `features/clases/muro-c-r1.ataque.test.tsx:404-425` va de `it(` en `:404` al cierre en `:425`. La parte del título está en `:412-417`: "Material", "Título del material", "Publicar material" y "Escribe el título del material". El hermano `muro-c-r2.ataque.test.tsx:399-419` también coincide, con el título en `:406-411`.
- **Hacía falta inventariar `muro-c-r1`.** C-23 nombra `muro-c-r2` pero no `muro-c-r1`, así que C-30 sí era necesario.
- **El resto de `muro-c-r1` no entra en C-30.** Su caso de `:429` (texto como texto) sirve un material en el doble del servidor. No depende del formulario: lo pinta la rama de material de `PublicacionDelMuro`, que DH-08 conserva.
- **Su lugar en "Rojos esperados".** La fila de 03d (`:644`) suma "C-30 (Enmienda 10)" con "(C-30, en los pasos 4 y 5)". Es coherente: el paso 4 crea `FormularioRecurso` y el paso 5 quita el tipo de `FormularioPublicacion`.
- **Grep propio de "Escribe el título del material"** (`frontend/src`, `backend/src`, `backend/test` y `shared/src`). Da exactamente el inventario de E10-6:

| Dónde | Archivo y línea | Qué pasa en 03d |
|---|---|---|
| Frontend, prueba normal | `features/clases/formulario-publicacion.test.tsx:171` (PR-C12h, `:157-174`; el título en `:166-171`) | Ya está en la lista cerrada de 03d, y la fila dice qué espera |
| Frontend, ataque | `muro-c-r1.ataque.test.tsx:417` | Entra con C-30 |
| Frontend, ataque | `muro-c-r2.ataque.test.tsx:411` | Ya estaba en C-23; C-30 fija su texto |
| Backend | `muro-c-r1.ataque.test.ts:714`, `muro-c-r2.ataque.test.ts:279`, `admin-muro-02b-r1.ataque.test.ts:576` y `muro.integracion.test.ts:789` | Fijan el mensaje del servidor y no cambian, porque `shared/` no cambia |
| Shared | `shared/src/clases.ts:420` | No cambia |

- **Grep vecino.** Busqué "Título del material", `name: "Material"` y "Publicar material" en las `*.ataque` del frontend. Salen `segmentado-02d-r1` (C-10), `archivos-d-r1`, `archivos-d-r2`, `muro-c-r2` y `ver-mas-01e-r3` (C-23) y `muro-c-r1` (C-30). No hay otra.

### 6. Numeración de C-30
En mi "## Arbitraje de la ronda 0 — 03c2" (`revision.md`, líneas 1646, 1674 y 1682), "C-30" nombra la fila de `features/tareas/formularios-ch3-r1.ataque.test.tsx:240`. Como la Enmienda 10 ya usó C-30 para `muro-c-r1`, esa fila será **C-31** en la Enmienda 11. No reescribo el arbitraje: esta nota es la que manda. Cuando verifique la Enmienda 11, compruebo que use C-31 y que no queden dos C-30.

## Verificación de la Enmienda 11 — CLASES-03
Fecha: 2026-10-30. Solo lectura, grep y git; no corrí `lint`, `test` ni `build`. Comparé las copias del scratchpad.

**Veredicto: APROBADA, sin M-nn.** El texto aplica fielmente los puntos 1 a 5 de mi "## Arbitraje de la ronda 0 — 03c2". La fila nueva es C-31; ya no hay dos C-30. Las dos líneas de `features/tareas` siguen condicionadas a la autorización del humano. Hay un detalle menor, que no bloquea.

### 1. Hashes y diff
- **Copia de antes:** `copias-plan/plan-clases03-antes-enmienda11-fe22a798.md`, 1223 líneas, SHA-256 `fe22a7986d8c307c457749c08412f84a7064a4af0f341499fca7e3b340503506` (reproducido).
- **Plan vigente:** `plan.md`, 1254 líneas, SHA-256 `5c53894078640e5fa7639e315d4d8481d8b06bb8b81c8d5a5aa222194199ac24` (reproducido). Es idéntico a la copia `copias-plan/plan-clases03-v12-enmienda11-5c538940.md` y coincide con la última entrada de `aprobacion.md`.
- **Diff:** el `git diff --no-index` completo da 11 hunks (+40 / −9). Todos tienen su E11-n:

| Hunk | Dónde | E11 |
|---|---|---|
| 1 | Estado | E11-0 |
| 2 | §D-12 (`:381`) | E11-5 |
| 3 | §D-R0, C-25 (registro de `trabajo-01e-r1`) y fila C-31 nueva (`:550` y `:556`) | E11-4 y E11-1 |
| 4 | Barrido de pruebas normales, después de la tabla de la Enmienda 5 (`:608`) | E11-2 (y nombra E11-3, C-31 y E11-4) |
| 5 | "Rojos esperados", fila de 03c2 (`:643`) | E11-1 y E11-4 |
| 6 | CL3-C15 | E11-5 |
| 7 | Lista cerrada de 03c2: fila de `trabajo-view.test.tsx` ampliada y fila nueva de `recuperar-ch3.test.tsx:200` (`:883`) | E11-3 y E11-2 |
| 8 | Paso 3 de 03c2: R-03c2-1, R-03c2-2 y el orden de entrada (`:1017-1019`) | E11-5 |
| 9 | "No se toca", `features/tareas/` (`:1063`) | E11-2 |
| 10 | Fila E5-5 (`:1153`) | E11-2 |
| 11 | Registro de la Enmienda 11 | — |

- **Lo que no cambia:** alcance, diseño, DH, `shared/`, backend, nada de 03d ni de 03e, y los conteos. Siguen 19 viñetas CL3-C.

### 2. Contra los puntos del arbitraje
- **Punto 1 / E11-1 (C-31).**
  - La fila aparece una sola vez (`:556`). Las únicas C-30 del plan son las de la Enmienda 10 (`muro-c-r1`).
  - Contra `HEAD` (archivo sin cambios en el árbol), `features/tareas/formularios-ch3-r1.ataque.test.tsx:240` compara `` url === `${RUTA_CLASE}/temas` ``. Las líneas `:302-303` mandan lo demás a `inesperadas`, y el caso empieza en `:960`.
  - `ruta` es el `URL` de `:188`, así que `ruta.pathname` existe y `:219` ya lo usa.
  - La fila está condicionada a la autorización y dice "Nada más del archivo".
- **E11-2 (`recuperar-ch3.test.tsx:200`).**
  - En `:200` está `` ruta === `${RUTA_CLASE}/temas` ``. `ruta` es la cadena completa (`:149`) y `url` es el `URL` de `:151`. CH3-A19 empieza en `:449`.
  - La fila está condicionada, y "No se toca" (`:1063`) solo suma `:200` y `:240`, con la condición. No entra nada más de `features/tareas`.
  - El barrido de §D-R0 (`:608`) y E5-5 (`:1153`) corrigen la frase falsa.
- **E11-3 (`trabajo-view.test.tsx`, caso M-01, `:1304-1341`).**
  - Su `manejar` (`:1307-1310`) devuelve la promesa retenida sin guardar el orden. PR-1E02 lo guarda en `:555-558`.
  - La fila solo toca el doble y dice que las aserciones (`:1322-1325` y `:1337-1340`) no cambian.
  - Para "guardar el orden en sus datos", el caso necesita conservar la referencia que hoy no conserva (`crearServidor(tresTemas(), …)`). Ese cambio entra en "el doble" de la fila.
- **E11-4 (C-25).**
  - Registra `trabajo-01e-r1.ataque.test.tsx:276-331`. Comprobado en `HEAD`: el `act` de la suelta va de `:310` a `:321` y las aserciones (`:309` y `:322-329`) no cambian.
  - Dice "no queda roja", y coincide con la adenda 1 del tester (`reporte-tester.md:3987`).
- **E11-5 (§D-12, CL3-C15 y paso 3 de 03c2).**
  - §D-12 dice "sin `reset()`" y da el motivo y la `*.ataque` que lo fija (`lib/estatico-ch3-r2.ataque.test.ts:135-148`).
  - CL3-C15 dice "el envío siguiente muestra un solo mensaje, el suyo (T-05 de CHORE-03)", con el procedimiento (a), (b) y la guarda liberada.
  - Comparé byte por byte las dos indicaciones del paso 3 con mis citas del arbitraje y son **idénticas**: R-03c2-1 (880 caracteres) y R-03c2-2 (1106 caracteres).
  - El orden de entrada del programador (`:1019`) es el del arbitraje.
- **"Rojos esperados" de 03c2 (`:643`).**
  - Sigue "C-25 que el tester cambió y C-29". Suma que C-31 y la adenda de C-25 sobre `trabajo-01e-r1` se reescriben en la ronda 0 y no quedan rojas.
  - Es coherente con la ronda 0 real (`reporte-tester.md:3725-3743` y `:4002`): el único rojo es C-29. La única C-25 que el tester cambió es `trabajo-01e-r1`, que no queda roja.

### 3. Grep de hermanos (lo repetí)
- **Comparaciones exactas de `…/temas`** (`===`, `!==`, `toBe(` y `toEqual(` contra una plantilla que termina en `/temas`), en todas las pruebas de `frontend/src`:
  - Fuera de `features/tareas`, todas comparan el `pathname`: `app/clase-03c1:192`, `personas-03c1-r1.ataque:246`, `features/clases/consultas-ch3:117`, `formularios-ch3*`, `recuperar-ch3*` y `trabajo-view.test.tsx`, donde `ruta` es el `pathname` (`:147`).
  - `app/router.test.tsx:218` ya tiene su fila.
  - En `features/tareas` quedan tres:
    - `:240` de la `*.ataque` (C-31).
    - `recuperar-ch3.test.tsx:200` (E11-2).
    - `formularios-ch3.test.tsx:171`, que no monta `TrabajoView`.
- **`endsWith("/temas")`.**
  - En `features/clases` (`trabajo-01e-r1:74` y `:359-363`, `trabajo-01e-r2:72`, `ver-mas-01e-r3:95` y `trabajo-view.test.tsx:615` y `:629`), todos van sobre el `pathname`. En `trabajo-01e-r1`, `ruta` es `url.pathname` (`:70`).
  - En `features/tareas` (13 archivos) van sobre la URL completa, pero ninguno monta `TrabajoView`. El único que nombra `…/trabajo`, `tareas-01d-r1:394`, monta ahí un `<p>` de relleno.
- **Otras pruebas fuera de `features/clases` y `app/`.**
  - Ninguna importa `TrabajoView`.
  - De las que montan el router real, solo `features/tareas/formularios-ch3-r1.ataque` y `recuperar-ch3.test.tsx` llegan a "Actividades de aprendizaje". Son las dos condicionadas.
  - `features/calificaciones/secciones-01d-r3` y `-r4` montan el router real, pero no nombran "Actividades", `/trabajo` ni `/temas`.
- **«Subir», «Bajar» y `…/temas/orden`:** las mismas cinco del arbitraje. Solo rompen el M-01 de `trabajo-view.test.tsx` (E11-3) y `trabajo-01e-r1.ataque:276-331` (E11-4).
- **Resultado:** ningún hermano nuevo. Coincide con el grep del arquitecto (registro de la Enmienda 11).

### Detalle menor (no bloquea)
- La indicación literal R-03c2-2 (paso 3, `:1018`) dice: `En CL3-C15, "el reset() de T-05 sigue limpiando el error viejo" se prueba así…`. Pero E11-5 ya quitó esa frase de CL3-C15. Como es la cita literal de mi arbitraje, no pido cambiarla: el procedimiento que sigue es el mismo que CL3-C15 trae ahora.
- Para el programador: esa frase es el nombre viejo del mismo caso. El caso se titula por lo que comprueba, sin `reset()`.

### Para el orquestador
- Sigue pendiente la única pregunta del arbitraje para el humano: la autorización de `features/tareas/formularios-ch3-r1.ataque.test.tsx:240` (C-31, la aplica el tester) y de `features/tareas/recuperar-ch3.test.tsx:200` (E11-2, la aplica el programador).
- Sin esa autorización, 03c2 no cierra: las dos se pondrán rojas en el paso 2.
- El orden es el de `:1019`: primero la adenda del tester (C-31, con la autorización) y después el programador.

## Verificación del resumen del programador — 03c2

Fecha: 2026-10-30. Resumen: `resumen-programador-03c2.md` (SHA-256 `fca5fcfd426939a58689ddf5b8eb8a6d833327af7dd2f277c9728617ee9b991e`, reproducido). Plan: `plan.md` (SHA-256 `5c53894078640e5fa7639e315d4d8481d8b06bb8b81c8d5a5aa222194199ac24`, reproducido). Base dentro de los paquetes: `91756a5` (HEAD); fuera: `689c636`.

**Veredicto: DEVUELTO** por M-01 (un estado vecino de O-16 que la matriz da por cubierto y el código no cubre). Todas las cifras coinciden, no falta ninguna viñeta y la lista cerrada, R-03c2-1, R-03c2-2, V-01 y "No se toca" están limpios. La corrección es pequeña y no toca nada más.

Verificación propia (desde `frontend/`, una tras otra; 03c2 no toca `shared/` ni `backend/`: `git diff 91756a5 -- shared backend infra` vacío y sin archivos nuevos): lint exit 0 · 5501 casos en 251 archivos · `Tests  5501 passed (5501)` · build exit 0.

| Comprobación | Resumen | Mi corrida |
|---|---|---|
| `npm run lint` | `> tsc -b` (exit 0), antes `All matched files use Prettier code style!` | Igual (exit 0) |
| `npx vitest list \| grep -acE "^src/"` | 5501 | 5501 |
| Archivos (`grep -aE "^src/" \| sed 's/ > .*//' \| sort -u \| wc -l`) | 251 | 251 |
| `contenido-03c2.test.tsx` / `formularios-03c2.test.tsx` / `app/redirige-03c2.test.ts` | 17 / 41 / 9 | 17 / 41 / 9 |
| `npm run test` | `Test Files  251 passed (251)` · `Tests  5501 passed (5501)` | Igual (`Duration  218.80s`); 0 «Hook timed out» |
| `npm run build` | `✓ built in 1.07s` (exit 0) | `✓ built in 770ms` (exit 0; el aviso de tamaño de bloque de siempre) |
| `git diff --stat HEAD -- frontend` | 13 archivos, 201 inserciones, 29 borrados | Igual |

### Problemas que bloquean

#### M-01 — Crear y renombrar tema: un `TEMA_REPETIDO` se pierde si el formulario se desmonta mientras el gancho renueva temas y trabajo
Dónde: `frontend/src/features/clases/hooks.ts`, `onError` de `useCrearTema` (`:872-877`) y de `useRenombrarTema` (`:900-905`).
Por qué importa: §D-11 manda que un error de un campo pintado se calle "solo si el formulario sigue montado; si no, lo avisa". El gancho decide con `montado.current` **antes** de `await renovarTrasError(…)`. Con `TEMA_REPETIDO` (error del campo `nombre` según `erroresDelTemaDeApi`, y código de `CODIGOS_QUE_RENUEVAN_LOS_TEMAS`), esa espera vuelve a pedir los temas y el trabajo de la vista. En TanStack Query 5.103.2, el `onError` del gancho se espera (`mutation.js:196`) antes del `dispatch` del error (`:211`), y los callbacks de `mutate` solo corren si el observador sigue suscrito (`mutationObserver.js:147`). Si la persona sale de Actividades durante esa recarga, con el botón todavía en espera, el gancho ya decidió callar y el formulario ya no pinta su `ErrorDeCampo`. Resultado: ningún mensaje, y el tema no se creó ni se renombró. Es el mismo hueco de O-16, en el estado "desmontado durante la espera del `onError`". La matriz del resumen dice "Desmontada: uno" para esa fila, y la lista de estados vecinos de O-16 no incluye este estado.
Qué se espera:
- Con `TEMA_REPETIDO` en crear y en renombrar tema, si el formulario se desmonta después de la respuesta y antes de que termine la renovación, sale un solo aviso con el mensaje del módulo.
- Si sigue montado al terminar la renovación, sale su `ErrorDeCampo` sin aviso, como hoy.
- Se agregan casos nuevos en `formularios-03c2.test.tsx`: renovación retenida, desmontar y soltar; y la variante montada. No se cambia ninguna prueba existente.
- El resumen de la corrección lista los hermanos: cada gancho de `features/clases` cuyo `onError` u `onSuccess` decide con `montado` y después espera. Según mi lectura, solo estos dos; `useComentar`, `useCrearClase` y `useEditarClase` deciden sin `await`. Anota que `useCrearPublicacion`, `useCrearRecurso`, `useEditarRecurso` (03d), `useCrearDuda` y `useResponder` (03e) deben nacer con la decisión después de su última espera.
- La lista de estados vecinos del mecanismo incluye este estado. La matriz de crear y renombrar tema se corrige.

### Pruebas requeridas → caso (todas existen en `npx vitest list`, con el título exacto del resumen)
- CL3-C08: 3 casos (`contenido-03c2.test.tsx`, uno por perspectiva). Afirman la URL completa de la primera página y `tipo`, `limite` y `cursor` de "Ver más avisos".
- CL3-C09: 10 casos (`contenido-03c2.test.tsx`). Cubren `?seccion=actividades` en temas y en cada tema, los conteos de la sección, "Sin tema", el vacío y el total. Cubren también que el estudiante no pide el total y la frase sin conteo cuando el total falla o no tiene el tema.
- CL3-C10: 2 casos nuevos. En el primero, la lista por sección se retiene, el botón sigue con `aria-busy` y conserva el foco. Siguen en verde el M-01 de `trabajo-view.test.tsx` (E11-3) y C-25.
- CL3-C11: 2 casos.
- CL3-C14: 15 casos de O-16 (5 formularios × desmontado, montado y vacío) y 14 de la variante de clase. Cubren 500, 503, la red, éxito y `ACCESO_RESTRINGIDO` desmontados, y éxito y errores montados.
- CL3-C15: 12 casos (3 controles × 4). El procedimiento (a) y (b) de E11-5 se cumple, y ningún título dice `reset()`.
- CL3-C19: 9 casos (`app/redirige-03c2.test.ts`).
- Total: 3 + 10 + 2 + 2 (17, `contenido`) + 29 + 12 (41, `formularios`) + 9 (`redirige`) = 67, igual que `npx vitest list`.

### Matriz de avisos, recargas y foco contra el código
Contrastada fila por fila con `hooks.ts`, `trabajo-view.tsx`, `seccion-de-tema.tsx`, `formulario-comentario.tsx` y `formulario-clase.tsx`. Coincide salvo M-01. Confirmado:
- `useOrdenarTemas` escribe el total y espera solo las listas por sección. El `predicate` (`queryKey.length > 3`) deja fuera el total. Una recarga por sección que falla no rechaza `invalidateQueries`: el botón sale de la espera y avisa la recarga fallida.
- Con la vista desmontada y el `PUT` en vuelo, la invalidación no tiene observadores y se resuelve.
- Todas las invalidaciones de temas (`invalidarTemas`, `invalidarTemasYTrabajo`, `features/tareas/hooks.ts:103` y `:122`) usan `claveTemas` sin `exact`, así que alcanzan la clave por sección.
- En la variante de clase montada, el gancho calla y `alFallar`/`alTerminar` avisan: nunca dos avisos. Desmontada, un aviso, y ninguno con `errorQueRedirigeElCliente`.
- Las guardas se marcan después de la validación local y de `claseId`, y se liberan en `onSettled`.
- Lo heredado (O-1d3-2 en comentario, tema, orden, borrar, mover y en la recarga fallida) está declarado como tal, y §D-11 lo deja así.

### Lista cerrada, R-03c2-1 y R-03c2-2
- Pruebas normales cambiadas: solo `features/clases/trabajo-view.test.tsx`, el caso M-01 de E11-3: el doble guarda el orden antes de `soltar` y ninguna aserción cambia. Y `features/tareas/recuperar-ch3.test.tsx:200`, de E11-2: una línea, `url.pathname`, con la autorización del humano. Las filas de `muro-view.test.tsx` y `app/router.test.tsx` no hicieron falta.
- R-03c2-1: en producción de `src/`, el texto `CODIGOS_QUE_REDIRIGE_EL_CLIENTE` sale solo en `services/apiClient.ts`, `features/calificaciones/lib.ts`, `features/tareas/lib.ts` (ya estaban en `91756a5`) y `features/clases/lib.ts`, en la importación unida de `:16` (exacta) y en el cuerpo de §D-11 (`:483`). Ningún comentario de `features/clases` la nombra, y ninguno de los tres códigos aparece entre comillas en `features/clases`. Los `onError` de clase llaman a `errorQueRedirigeElCliente`.
- R-03c2-2: no hay ningún `reset(` en los dos formularios ni en el diff. El error del servidor sigue en `errores`.

### V-01 y "No se toca"
- V-01: `sha256sum` de las 235 `*.ataque` (rastreadas y no rastreadas) contra la tabla "al cierre de la ronda 0 de CLASES-03c2, con las adendas 1 y 2" de `reporte-tester.md` (SHA-256 `4a94f6b4…`): 235 de 235 iguales. Las tres que aparecen en `git diff` son las del tester: C-29, la adenda 1 (C-25) y la adenda 2 (C-31, `:240`, una línea). El programador no cambió ninguna.
- Dentro de los paquetes, contra `91756a5`: solo `features/clases`, las dos líneas autorizadas de `features/tareas` (`:200` del programador y `:240` del tester), la `*.ataque` de `services/` del tester (C-29) y un archivo de prueba nuevo en `app/`. `app/providers.tsx` y `app/require-*.tsx` no se tocaron. No hay cambios en `shared/`, `backend/`, `infra/`, `components/`, `lib/`, `services/` (producción) ni `styles/`.
- Fuera de los paquetes: `AGENTS.md` (`bb985908…`), `CLAUDE.md` (`c9a2f534…`) y `ARCHITECTURE-ESSENTIALS.md` (`b93f7275…`) coinciden con los hashes de `aprobacion.md`. `DESIGN.md` y `PRD.md` no cambian desde HEAD; solo cambian `docs/ESTADO.md` y la carpeta del encargo.
- `CLAUDE.md`: retornos tempranos, `null` explícito (`elementosEnTotalDelTema`), ningún `?? []` nuevo, tipos de API reexportados en `types.ts` (`SeccionDeTemas`), textos en `data.ts` y nada visual nuevo.

### Puntos del programador (arbitraje)
(a) **CL3-C19 en `src/app/redirige-03c2.test.ts`: correcto.** La regla 9 de `eslint.config.mjs` (`files: ["frontend/src/features/**/*.{ts,tsx}"]`) alcanza también las pruebas, y la viñeta pide comparar con `features/tareas/lib.ts`. El plan no fija el archivo, `app/` ya tiene pruebas que importan de varios módulos (`marco.test.tsx`) y no está en "No se toca", salvo `providers.tsx` y `require-*.tsx`. Sin enmienda.

(b) **CL3-C14, "500 → el mensaje del servidor; red → el de conexión": el código cumple §D-11 y no hay que corregir código.** Lo que obliga es el mecanismo de §D-11: avisar con `mensajeDeErrorClases(error)`. Además, "montado, cada uno de esos cuatro casos da exactamente lo de hoy, nunca dos avisos", y `CLAUDE.md` pide que ningún texto del servidor llegue sin pasar por `lib/errores-de-api.ts`. Con `TRADUCCION_DE_ERRORES_CLASES`:
- `ERROR_INTERNO` y `SIN_CONEXION` (`apiClient.ts:134` y `:143-144`) dan el genérico del módulo.
- `SERVICIO_OCUPADO` está en `CODIGOS_CON_MENSAJE_DEL_SERVIDOR` y conserva el texto del servidor.
- Montado (`alFallar`) y desmontado dan el mismo texto, y los casos lo aseguran.

El paréntesis de la viñeta ("el mensaje del servidor", "el de conexión") describe mal la traducción vigente. Es un detalle de redacción del plan; se registra aquí y no pide enmienda antes de la ronda 1. El tester ataca con la lectura de §D-11: el mismo texto que da `alFallar` con el formulario montado.

### Fuera de alcance, con destino
- `useGuardarCategorias` (`hooks.ts`, `onError`): un error de fila con el editor de categorías desmontado no da mensaje. Es la misma clase de O-16, en otra vista, y no está en §D-11. Destino: la fila de O-16 de `docs/ESTADO.md` §3 (`:323`), como hermano pendiente. Va al `chore` de foco y navegación del marco, o a CALIFICACIONES-02 si ese encargo rehace el editor de categorías antes. Lo anota el orquestador al cerrar 03c2.
- O-1d3-2 heredado en `features/clases`: los `onError` de comentario, tema, orden, borrar y mover, y el aviso de recarga fallida de Actividades, no excluyen los códigos que redirige `apiClient`. Destino: la fila de R-3 de CHORE-02 de `docs/ESTADO.md` §3 (`:386`, "chore de `apiClient` y avisos"). Se suma "y los ganchos de `features/clases`, que desde CLASES-03c2 tienen `errorQueRedirigeElCliente` para hacerlo". Lo anota el orquestador al cerrar 03c2.

### M-02 de 03c1
Cerrado. El comentario de `trabajo-view.tsx:49` (132 caracteres en `91756a5`) quedó partido en `:55-63`. La línea más larga del bloque mide 104 caracteres y el texto es el mismo, actualizado a 03c2.

### Para la ronda 1 del tester (después de la corrección de M-01)
- O-16 en crear y renombrar tema con `TEMA_REPETIDO`: desmontar en cada momento. Antes de la respuesta, durante la renovación y después. Además, desmontar y volver a montar mientras se renueva. Siempre un solo mensaje.
- Variante de clase: el orden entre el callback del gancho y los de `mutate` (desmontar en el mismo turno de la respuesta) y `StrictMode`.
- `useOrdenarTemas`: salir y volver a Actividades con el `PUT` o la recarga por sección en vuelo (foco y `aria-busy` de la vista nueva). "Subir" mientras otra recarga por sección está en vuelo. Un `409` mientras se espera la recarga.
- El total (maestro y admin): cuando ya estaba en caché y una recarga posterior falla, la frase va sin conteo, sin aviso. Que el total no se vuelva a pedir tras ordenar. Que el estudiante no lo pida por ningún camino, incluidos R2 y el historial.
- Que la clave por sección se renueve al publicar un material desde Avisos y al crear, editar o borrar una tarea desde `features/tareas` (invalidaciones no exactas).
- Guardas de §D-12: un tercer clic durante el `onSettled`, y el envío con `Enter` en el campo además del clic.

## Verificación de la corrección de M-01 — 03c2

Fecha: 2026-10-30. Resumen: `resumen-programador-03c2.md`, sección "## Corrección de M-01 (verificación del manager)" (SHA-256 del archivo `699da149311700d61c48fcb8008697a1b17cd214fa13094ca5cdb5b42936628b`, reproducido).

**Veredicto: ACEPTADO.** M-01 queda cerrado; no hay M-nn nuevos. El tester puede atacar (ronda 1 de 03c2).

Verificación propia (desde `frontend/`, una tras otra): lint exit 0 · 5511 casos en 251 archivos · `Tests  5511 passed (5511)` · build exit 0.

| Comprobación | Resumen | Mi corrida |
|---|---|---|
| `npm run lint` | `> tsc -b` (exit 0) | Igual (exit 0) |
| `npx vitest list \| grep -acE "^src/"` | 5511 | 5511 |
| Archivos (`grep -aE … \| sort -u \| wc -l`) | 251 | 251 |
| `formularios-03c2.test.tsx` | 51 | 51 |
| Casos contra mi lista anterior (`comm`, `LC_ALL=C`) | +10 | 10 nuevos y 0 que falten: ningún caso se borró ni cambió de título |
| `npm run test` | `Tests  5511 passed (5511)`, `Test Files  251 passed (251)` | Igual (`Duration  218.72s`); 0 «Hook timed out» |
| `npm run build` | `✓ built in 731ms` (exit 0) | `✓ built in 754ms` (exit 0) |
| `git diff --stat HEAD -- frontend` | 13 archivos, 211 inserciones, 35 borrados | Igual |

**Remedio contra el código.** `avisarErrorDelTema` (`hooks.ts:858-868`):
- Un error que no es del campo se avisa al momento (`:865`), como antes.
- Después espera `renovarTrasError` (`:866`).
- Al final, un error del campo se avisa solo si `!montado.current` (`:867`).

La decisión se toma después de la última espera. Entre esa lectura y el despacho del error quedan solo microtareas: los ganchos de tema no tienen `onSettled` propio. `useCrearTema` (`:887`) y `useRenombrarTema` (`:909`) la llaman en su `onError`, y ninguna firma cambió. Con el formulario montado, el gancho calla y sale el `ErrorDeCampo` de `alFallar` (`formulario-tema.tsx`). Con un `VALIDACION` de `nombre`, que no renueva, la espera termina al instante y el comportamiento es el de antes.

**Los 10 casos nuevos** existen con el título exacto del resumen: 5 estados × crear y renombrar tema. Son: desmontado antes de la respuesta, desmontado durante la renovación, montado al terminar la renovación, desmontado después del `ErrorDeCampo`, y desmontado y vuelto a montar durante la renovación.

El caso "durante la renovación" retiene las lecturas de `…/temas` del doble. Espera la petición de la renovación, afirma que todavía no hay aviso, desmonta, suelta y espera un solo aviso con el mensaje del servidor. El caso montado afirma el `ErrorDeCampo` y ningún aviso. El programador dice que, con el orden anterior, fallaban 4 casos; no lo repetí (exigiría tocar producción), pero la lectura de los casos lo hace creíble.

**Hermanos y estados vecinos contra el código.** Mi grep de `montado.current` en producción de `features/clases` da solo `hooks.ts:170`, `:172` (`useMontado`), `:183` (clase, `onError` síncrono), `:197` y `:218` (clase, `onSuccess` síncrono, invalidaciones con `void`), `:723` (`useComentar`, síncrono) y `:867` (tema, después de la espera). Coincide con la lista del resumen, y su "no aplica" en comentario y clase está razonado: ninguna espera entre la decisión y el despacho. Los ganchos de 03d y 03e quedan anotados con el patrón de `avisarErrorDelTema`, y `useGuardarCategorias` sigue con su destino. La tabla de estados vecinos cubre los de mi M-01 y los que pedí listar.

**Matriz corregida.** Las dos filas nuevas de crear y renombrar tema (`VALIDACION` de `nombre` y `TEMA_REPETIDO`) coinciden con el código.

**Lista cerrada y V-01.**
- Fuera de los tres archivos de prueba nuevos (sin rastrear), las pruebas normales cambiadas siguen siendo solo `trabajo-view.test.tsx` (E11-3) y `features/tareas/recuperar-ch3.test.tsx:200` (E11-2), con el mismo diff de antes (13 y 2 líneas).
- V-01: las 235 `*.ataque` son idénticas a la tabla de la adenda 2 (`4a94f6b4…`).
- Producción: solo cambió `features/clases/hooks.ts` respecto de la verificación anterior. `lib.ts` y `types.ts` siguen igual.

### Para la ronda 1 del tester (sustituye la lista de la verificación anterior)
- O-16 en tema: desmontar en el mismo turno en que termina la renovación. Una renovación que falla (temas o trabajo con 5xx) tras `TEMA_REPETIDO`, montado y desmontado: un solo mensaje, más el aviso de recarga fallida si la vista sigue. Dos envíos seguidos con `TEMA_REPETIDO` tras volver a montar.
- Crear y editar clase: desmontar en el mismo turno de la respuesta (el orden entre el gancho y los callbacks de `mutate`) y `StrictMode`.
- "Subir" y "Bajar": salir y volver con el `PUT` o la recarga por sección en vuelo (foco y `aria-busy` de la vista nueva); "Subir" mientras otra recarga por sección está en vuelo; un `409` mientras se espera la recarga.
- El total (maestro y admin): ya en caché y con una recarga posterior que falla, la frase va sin conteo y sin aviso. Que el total no se vuelva a pedir tras ordenar. Que el estudiante no lo pida por ningún camino, incluidos R2 y el historial.
- Que la clave por sección se renueve al publicar un material desde Avisos y al crear, editar o borrar una tarea desde `features/tareas`.
- Guardas de §D-12: un tercer clic durante el `onSettled`, y el envío con `Enter` además del clic.
- Comentario: desmontar con `VALIDACION` de `texto` y con otros códigos; `ACCESO_RESTRINGIDO` queda como heredado (O-1d3-2) y no es hallazgo.

## Verificación de la corrección de la ronda 1 — 03c2

Fecha: 2026-10-30. Hallazgo: T-01 (`reporte-tester.md`, "## CLASES-03c2 — Ronda 1", SHA-256 `b86acbb98c64eb5141969fb72c6da9cbab6536e78585a43c9c5da423496a163c`). Resumen: `resumen-programador-03c2.md`, "## Corrección de la ronda 1 (T-01)" (SHA-256 `0a4802b99dc27421543dc72b4895bf3e5a156733acf8821af89dd98ff17b97c8`). Los dos hashes están reproducidos.

**Veredicto: DEVUELTO por M-01.** El remedio de T-01 tapa el hueco de T-01, pero su escritura en la caché trae dos estados vecinos que el resumen no lista y que empeoran lo de antes. Todas las cifras coinciden.

Verificación propia (desde `frontend/`, una tras otra): lint exit 0 · 5547 casos en 254 archivos · `Tests  5547 passed (5547)` · build exit 0.

| Comprobación | Resumen | Mi corrida |
|---|---|---|
| `npm run lint` | `> tsc -b` (exit 0) | exit 0 |
| `npx vitest list \| grep -acE "^src/"` | 5547 | 5547 |
| Archivos | 254 | 254 |
| `contenido-03c2.test.tsx` | 19 | 19 |
| Contra mi lista de la verificación de M-01 (`comm`, `LC_ALL=C`) | +36 | 0 que falten. Nuevos: 34 del tester (11 en `ordenar-03c2-r1`, 19 en `formularios-03c2-r1` y 4 en `invalidaciones-03c2-r1`) y 2 del programador (`contenido-03c2`) |
| `npm run test` | `Tests  5547 passed (5547)`, `Test Files  254 passed (254)` | Igual (`Duration  218.26s`); 0 «Hook timed out» |
| `npm run build` | `✓ built in 822ms` (exit 0) | `✓ built in 789ms` (exit 0) |
| `git diff --stat HEAD -- frontend` | 13 archivos, 245 inserciones, 35 borrados | Igual |

**V-01 y lista cerrada:**
- Las 238 `*.ataque` tienen el mismo SHA-256 que la tabla "de las 238 … al cierre de la ronda 1 de CLASES-03c2". El programador no cambió ninguna.
- Las pruebas normales cambiadas siguen siendo solo `trabajo-view.test.tsx` (E11-3) y `features/tareas/recuperar-ch3.test.tsx:200` (E11-2), con el diff de antes (13 y 2 líneas).
- Producción: solo `hooks.ts` y `lib.ts`.

**El remedio contra el código:**
- `temasEnElOrdenDe` (`lib.ts:353-365`) es pura. Conserva los conteos de la sección, pone al final los temas que la respuesta no trae y renumera `orden`.
- `filtroDeLasSecciones` (`hooks.ts:823-830`) es el mismo filtro de antes, compartido.
- `onSuccess` (`hooks.ts:960-969`) escribe el total, espera la recarga por sección y, después, aplica `setQueriesData` solo a las listas en `error` o sin observadores.
- CL3-C10 y CL3-2R1-03 siguen verdes: la vista no cambia mientras se espera.
- Los dos casos nuevos existen con su título exacto y comprueban el orden en pantalla, los conteos de la sección y el `PUT` siguiente.
- Los hermanos del resumen (crear, renombrar o borrar tema, mover, `useGuardarCategorias`) están bien razonados.

### Problemas que bloquean

#### M-01 — La escritura del orden en la caché borra el error que reemplaza la vista y la marca de "viejo" de las listas por sección
Dónde: `frontend/src/features/clases/hooks.ts:962-969`, el `setQueriesData` del `onSuccess` de `useOrdenarTemas`.

Por qué importa: en TanStack Query 5.103.2, `setQueryData`/`setQueriesData` despacha `success` con `successState` (`query.js:437-449` y `:497-504`): `error: null`, `status: "success"`, `isInvalidated: false` y `dataUpdatedAt` = ahora. Eso abre dos estados que el resumen no lista:
1. **Un error que reemplaza la vista vuelve a quedar oculto.** Sigue este orden:
   - El `PUT` responde `200` y la recarga por sección, que se espera, responde `403 SIN_ACCESO_A_LA_CLASE` (o un `VALIDACION` de `claseId`), porque la persona perdió el acceso entre las dos peticiones.
   - La vista cambia a `MensajeError` "No tienes acceso a esta clase." (`errorQuitaLaVista`, `trabajo-view.tsx`, `contenido()`).
   - Enseguida el `setQueriesData` alcanza esa consulta (`status === "error"`) y la pone en `success` con los datos viejos reordenados.
   - Vuelven los temas con "Subir", "Bajar", "Renombrar" y "Borrar tema" para alguien sin acceso.

   Eso contradice la regla de `lib.ts:500-502` ("el mensaje reemplaza la vista y deja de ofrecer acciones") y el patrón T-11. Antes de esta corrección no pasaba.
2. **Una lista que se sabe vieja deja de estarlo.** Sigue este orden:
   - La persona sale de Actividades con el `PUT` en vuelo.
   - Mientras no se ve, otra acción marca vieja la lista por sección. Por ejemplo, crear o borrar una tarea en `features/tareas`, que invalida `claveTemas` sin `exact` (lo prueba CL3-2R1-19). Sin observadores, la invalidación no vuelve a pedir la lista, solo la marca.
   - El `PUT` responde y el `setQueriesData` le quita la marca y le pone fecha de ahora.
   - Si vuelve en menos de 30 s (`staleTime` de `app/providers.tsx`), la vista no la pide y muestra los conteos de antes de la tarea nueva o borrada. Antes de la corrección, la invalidación del `onSuccess` dejaba la lista marcada y la vista la pedía al volver (CL3-2R1-05 y 06).

   El orden escrito es una suposición local, no lo que dijo el servidor; no debe pasar por fresco.

Qué se espera:
- Si la recarga por sección termina en un error que reemplaza la vista, la vista sigue con su `MensajeError` y sin acciones; nada lo sobrescribe.
- Toda lista por sección a la que se le escribe el orden del `PUT` queda marcada vieja, igual que antes de escribirla. Al volver a montarse la vista, la vuelve a pedir. Si esa petición falla, el orden que se ve y del que parte el siguiente «Subir»/«Bajar» sigue siendo el del `PUT` (T-01 y el caso nuevo de O-01 en verde).
- El aviso de recarga fallida sale una vez por fallo, como hoy.
- Casos nuevos en `contenido-03c2.test.tsx`:
  - `403 SIN_ACCESO_A_LA_CLASE` en la recarga tras el `PUT`: un `MensajeError` y ningún «Subir».
  - La lista marcada vieja por otra invalidación mientras el `PUT` responde con la vista desmontada: al volver antes de 30 s, se vuelve a pedir y muestra los conteos nuevos. Este caso va con `staleTime: 30_000`, como `app/providers.tsx`.
- No se cambia ninguna prueba existente ni ninguna `*.ataque`.
- El resumen lista los estados vecinos de la escritura en la caché:
  - error que conserva la vista;
  - error que la reemplaza;
  - sin observadores y sin marca;
  - sin observadores y marcada por otra acción;
  - vuelta antes y después de 30 s;
  - y el estudiante.

### O-01 (arbitraje): fuera de 03c2, como observación con destino
Volver a Actividades **antes** de que responda el `PUT` deja la vista nueva sin saber que hay un orden en vuelo. Un «Subir» en esa ventana parte del orden viejo.
- **Es heredado:** en `91756a5` pasaba igual con la lista total. 03c2 no lo introduce, y el caso de O-01 que sí agravaba 03c2 (el `PUT` responde con la vista desmontada y se vuelve con la recarga fallando) quedó cubierto con la corrección de T-01.
- **La ventana es corta:** dura lo que tarda en responder el `PUT`, y la persona tiene que salir, volver y ordenar dentro de ella.
- **El remedio es otro mecanismo:** una guarda que sobreviva al desmontaje (por ejemplo, `mutationKey` con `useIsMutating`) en `hooks.ts`, `trabajo-view.tsx` y `seccion-de-tema.tsx`. Es una guarda de doble envío entre montajes, que conviene uniformar con las demás.

No entra en 03c2, y la ronda 2 del tester no la ataca como hallazgo. **Destino:** CHORE-04 (guardas de doble clic). El orquestador suma una fila al inventario de `docs/ESTADO.md` §2b al cerrar 03c2: "«Subir»/«Bajar» de Actividades entre montajes de la vista: volver antes de que responda el `PUT` permite otro orden calculado con la lista vieja; guarda con `mutationKey`/`useIsMutating` en `features/clases/hooks.ts`, `trabajo-view.tsx` y `components/seccion-de-tema.tsx`; O-01 de la ronda 1 de CLASES-03c2". Lo mismo aplicará a Recursos (03d) si ordena temas con este gancho.

### Para la ronda 2 del tester (después de la corrección de M-01)
- La escritura del orden en la caché, para cada error de la recarga por sección tras un `PUT` `200`:
  - `5xx` y red: la vista se conserva y hay un aviso.
  - `SIN_ACCESO_A_LA_CLASE` y `VALIDACION` de `claseId`: la vista se reemplaza, sin acciones.
  - Dos fallos seguidos.
- Las listas sin observadores, con y sin otra invalidación mientras el `PUT` responde. Volver antes y después de 30 s, con la configuración de `app/providers.tsx` (`staleTime: 30_000` y `retry: 1`).
- El siguiente «Subir»/«Bajar» después de cada uno de esos estados: nunca deshace el anterior sin aviso. Probarlo también con un tema que el `PUT` trae y la lista por sección no (o al revés): `temasEnElOrdenDe` pone al final los que faltan.
- Que la recarga sana tras el `PUT` siga mandando: el servidor gana sobre el orden escrito.
- O-01 (volver antes de que responda el `PUT`) queda fuera: va a CHORE-04.

## Verificación de la corrección de M-01 de la ronda 1 — 03c2

Fecha: 2026-10-30. Resumen: `resumen-programador-03c2.md`, "## Corrección de M-01 de la ronda 1" (SHA-256 del archivo `77ce95d13e647901250ca5dc69f213ac0a75d7dc3a1e14c7a7785a75a0a8ae74`, reproducido).

**Veredicto: ACEPTADO.** M-01 de la ronda 1 queda cerrado y no hay M-nn nuevos. Sigue la ronda 2 del tester.

Verificación propia (desde `frontend/`, una tras otra): lint exit 0 · 5549 casos en 254 archivos · `Tests  5549 passed (5549)` · build exit 0.

| Comprobación | Resumen | Mi corrida |
|---|---|---|
| `npm run lint` | `> tsc -b` (exit 0) | exit 0 |
| `npx vitest list \| grep -acE "^src/"` | 5549 | 5549 |
| Archivos | 254 | 254 |
| `contenido-03c2.test.tsx` | 21 | 21 |
| Contra mi lista de la verificación anterior (`comm`, `LC_ALL=C`) | +2 | 2 nuevos, con el título exacto del resumen; 0 que falten |
| `npm run test` | `Tests  5549 passed (5549)`, `Test Files  254 passed (254)` | Igual (`Duration  217.45s`); 0 «Hook timed out» |
| `npm run build` | `✓ built in 756ms` (exit 0) | `✓ built in 749ms` (exit 0) |
| `git diff --stat HEAD -- frontend` | 13 archivos, 266 inserciones, 35 borrados | Igual |

**V-01 y lista cerrada:**
- Las 238 `*.ataque` tienen el mismo SHA-256 que la tabla de la ronda 1 de 03c2.
- Las pruebas normales cambiadas siguen siendo solo E11-3 y E11-2, con el diff de antes (13 y 2 líneas).
- En producción solo cambió `hooks.ts`. `lib.ts`, `types.ts` y `trabajo-view.tsx` siguen como en la verificación anterior.

**El remedio, contra el código y contra TanStack Query 5.103.2:**
- `ponerElOrdenEnLasSeccionesSinElNuevo` (`hooks.ts:949-970`) se llama en `onSuccess` (`:991`), después de esperar la recarga por sección.
- **El error que reemplaza la vista se conserva.** El filtro (`:959`) deja fuera toda lista con `status === "error"` y `errorQuitaLaVista(error)`, así que nada escribe sobre un `403 SIN_ACCESO_A_LA_CLASE` ni sobre un `VALIDACION` de `claseId`. El caso nuevo lo comprueba: el `MensajeError` sigue a la vista, sin «Subir», «Bajar», «Renombrar» ni «Borrar tema», y sin los temas.
- **Cada lista escrita queda vieja.** Después de `setQueryData`, que según `query.js:497-504` deja `isInvalidated: false`, viene `invalidateQueries({ queryKey, exact: true, refetchType: "none" })` (`:967`). Según `queryClient.js:297-302`, eso la marca vieja con `query.invalidate()` y no la pide. Al montar, `shouldFetchOnMount` llama a `isStaleByTime`, que da `true` con `isInvalidated` (`query.js:217`, `queryObserver.js:434-449`): se pide aunque no hayan pasado 30 s. El segundo caso nuevo lo comprueba con `staleTime: 30_000` y otra invalidación mientras la vista no está.
- **T-01 sigue cerrado.** Con 5xx o red, la lista montada en error toma el orden del `PUT`. Los casos de T-01 (CL3-2R1-01, las dos variantes, y los dos "CL3-C10 (T-01…)") siguen verdes en mi corrida, igual que CL3-C10, CL3-2R1-02 a 08 y el M-01 de `trabajo-view.test.tsx`.

**Tabla de estados vecinos, uno por uno.** Coincide con el código en las 12 filas:
- Una recarga que llega no se escribe: tiene observadores y `status` `success`.
- 5xx y red se escriben y quedan marcados: `SIN_CONEXION` no reemplaza la vista.
- `403` y `VALIDACION` de `claseId` no se escriben.
- Dos fallos seguidos: cada `onSuccess` escribe sobre el orden anterior, y `errorUpdateCount` no cambia al escribir, así que sale un aviso por fallo.
- Las listas desmontadas, con y sin otra invalidación, antes y después de 30 s, se escriben y quedan marcadas.
- Una lista desmontada con un error que reemplaza la vista no se toca.
- El estudiante no ordena, y O-01 va a CHORE-04.

La matriz corregida, con sus tres filas, coincide con el código.

**Sin cambio de comportamiento que bloquee (para la ronda 2).** Con la vista montada, después de escribir el orden sobre una recarga fallida, la consulta queda en `success`. Pulsar «Actividades de aprendizaje» estando ahí ya no la vuelve a pedir: `useAlPulsarLaSeccionActiva` solo pide cuando `isError`. La frase de recarga fallida no promete esa acción, así que no rompe la regla del 2026-10-26. Ir a otra sección y volver sí la pide, porque quedó marcada vieja. El tester lo comprueba y no cuenta como hallazgo, salvo que encuentre una frase que lo prometa.

### Para la ronda 2 del tester (sustituye las cinco de la verificación anterior)
Con `app/providers.tsx` (`staleTime: 30_000`, `retry: 1`, `refetchOnWindowFocus: false`):
1. Tras un `PUT` `200`, cada error de la recarga por sección:
   - 5xx y red: la vista se conserva, con un aviso por fallo, el orden del `PUT` y la lista marcada vieja.
   - `SIN_ACCESO_A_LA_CLASE` y `VALIDACION` de `claseId`: la vista se reemplaza, sin acciones.
   - Dos fallos seguidos.
2. Listas por sección con la vista desmontada, con y sin otra invalidación mientras responde el `PUT`. Volver antes y después de 30 s: siempre se piden al montar. Si esa petición falla, queda el orden del `PUT`.
3. El siguiente «Subir»/«Bajar» después de cada uno de esos estados nunca deshace el anterior sin aviso. Incluye un tema que trae el `PUT` y no la lista por sección, o al revés, y un tema creado o borrado entre medias: `409 ORDEN_DESACTUALIZADO`, aviso y renovación.
4. Cuando la recarga sí llega tras el `PUT`, manda lo que dice el servidor. También con otra recarga en vuelo, por ejemplo la renovación de un `TEMA_REPETIDO` (como CL3-2R1-04).
5. Pulsar la sección activa después de escribir el orden sobre una recarga fallida no pide nada. Es lo esperado; solo es hallazgo si alguna frase de la vista promete esa acción. O-01 (volver antes de que responda el `PUT`) no es hallazgo: va a CHORE-04.

## Revisión final — 03c2
# Revisión del Manager — CLASES-03c2 (contenido) — final
Veredicto: **APROBADO CON OBSERVACIONES** (nada bloquea; M-01 y M-02 son pasos de cierre del orquestador antes del commit)

Verificación propia (desde `frontend/`, una suite tras otra). 03c2 no toca `shared/` ni el backend: `git diff --stat 91756a5 -- shared backend` sale vacío.
- `npm run lint`: exit 0. Última línea: `> tsc -b` (antes, `All matched files use Prettier code style!`).
- `npx vitest list`:
  - `grep -ac " > "` = **5569** casos.
  - `grep -a " > " | sed 's/ > .*//' | sort -u | wc -l` = **255** archivos, 146 de ellos `*.ataque` del frontend.
- `npm run test`: `Test Files  255 passed (255)` · `Tests  5569 passed (5569)` (222.87 s).
- `npm run build`: exit 0. Última línea: `✓ built in 769ms`.
- Las cifras coinciden con la ronda 2 del tester (5569 / 255) y con la suma de cada entrega: 5434 de base, +67 de la implementación, +10 de M-01, +34 de la ronda 1, +2 de T-01, +2 de M-01 de la ronda 1 y +20 de la ronda 2.
- Casos por archivo nuevo: `contenido-03c2` 21, `formularios-03c2` 51, `redirige-03c2` 9, `invalidaciones-03c2-r1.ataque` 4, `formularios-03c2-r1.ataque` 19, `ordenar-03c2-r1.ataque` 11 y `ordenar-03c2-r2.ataque` 20.

Hashes reproducidos:
- `plan.md` `5c538940…`, `reporte-tester.md` `15f49f8e…` y `resumen-programador-03c2.md` `77ce95d1…`.
- `AGENTS.md` `bb985908…`, `CLAUDE.md` `c9a2f534…` y `ARCHITECTURE-ESSENTIALS.md` `b93f7275…`, iguales a los de `aprobacion.md`.
- `DESIGN.md` `47f85120…`, igual al que anotó el orquestador. La copia `DESIGN-antes-03c2.md` (`0c85338b…`) es igual a `91756a5`.

### 1. Cumplimiento de 03c2 (DH-14)
- **7.5, la URL con `tipo=anuncio`:** `usePublicaciones` (`hooks.ts:614-621`) pide `…/publicaciones?tipo=anuncio&limite=20[&cursor]` y su clave no cambia. Lo prueba CL3-C08, con 3 casos (uno por perspectiva) que comparan la URL exacta de la primera página y la de "Ver más avisos".
- **7.6 completo, salvo los textos:**
  - `useTrabajo` pide con `seccion=actividades`.
  - `useTemasDeLaSeccion` usa `claveTemasDeLaSeccion`, que cuelga de `claveTemas`; así, toda invalidación no exacta del total también la alcanza.
  - `TrabajoView` saca la estructura de la lista por sección y pide el total solo con `capacidades.gestionarTrabajo` (N-08).
  - `SeccionDeTema` recibe `elementosEnTotal` y, si es `null`, usa `TEXTOS_TEMAS.consecuenciaSinConteo`.
  - `useOrdenarTemas` escribe el total y espera la recarga por sección.
  - La recarga fallida va sobre la consulta por sección.
  - Lo prueban CL3-C09 (10 casos), CL3-C10 (6) y CL3-C11 (2).
- **§D-11 (O-16):** cubre el comentario, crear y editar clase, y crear y renombrar tema, con `useMontado`. La variante de clase calla ante `errorQueRedirigeElCliente` (`lib.ts:497-498`), con la misma firma que en tareas y calificaciones. Lo prueban CL3-C14 (39 casos, con los 10 de M-01) y CL3-C19 (9 casos en `src/app/`, lugar aceptado en la verificación del resumen).
- **§D-12, sin `reset()`:** `formulario-comentario.tsx` y `formulario-clase.tsx` tienen su guarda con ref. Se marca justo antes de `mutate` y se libera en el `onSettled` de esa misma llamada. Ninguno de los dos archivos tiene `reset()`. Lo prueba CL3-C15 (12 casos).
- **R-03c2-1:** en la producción de `features/clases`, `CODIGOS_QUE_REDIRIGE_EL_CLIENTE` aparece solo dos veces: en la importación de `lib.ts:16` (unida a `esApiError`, con comillas dobles) y en el cuerpo de `errorQueRedirigeElCliente`. `hooks.ts` solo llama a la función. **R-03c2-2:** cumplido (punto anterior).
- **T-01 (ronda 1):** corregido; CL3-2R1-01 a 08 están en verde.
- **Las dos correcciones de M-01 siguen como las acepté:** la de la verificación del resumen (`avisarErrorDelTema`) y la de la ronda 1 (`ponerElOrdenEnLasSeccionesSinElNuevo`, que no toca las listas cuyo error quita la vista y deja vieja cada lista que escribe). La ronda 2 las atacó con 20 casos, todos en verde.
- **Alcance y estilo de `CLAUDE.md`:**
  - No hay nada fuera del plan.
  - Usa retornos tempranos.
  - Los ternarios de `seccion-de-tema.tsx` y `trabajo-view.tsx` no están anidados.
  - `posicion.get(a.id) ?? fuera` es un respaldo explícito y comentado: un tema que la respuesta no trae va al final. No esconde datos que falten.
  - Los tipos nuevos se reexportan de `shared/` en `types.ts`.
- **M-02 de 03c1, cerrado:** las frases "solo lista anuncios" (§7.18, `DESIGN.md:685`) y "solo lista actividades (hoy, tareas)" (§7.22, `:753`) ya son ciertas, porque CL3-C08 y CL3-C09 comprueban los filtros en las tres perspectivas.

### 2. V-01 y "No se toca"
- **V-01:**
  - Las 239 `*.ataque` (93 del backend y 146 del frontend, según `git ls-files -co --exclude-standard`) tienen el SHA-256 de la tabla de la ronda 2. El `diff` por ruta da 0 diferencias, 0 faltantes y 0 sobrantes.
  - Contra `91756a5` cambian tres, todas del tester en la ronda 0: `trabajo-01e-r1` (C-25, adenda 1), `features/tareas/formularios-ch3-r1:240` (C-31, adenda 2) y `services/apiClient-ch3-r1` (C-29). Las cuatro nuevas son de las rondas 1 y 2.
  - El programador no tocó ninguna.
- **`features/tareas`:** cambian solo dos líneas, las dos autorizadas por el humano el 2026-10-30, y ninguna aserción cambia:
  - `recuperar-ch3.test.tsx:200`: una línea, `url.pathname`.
  - `formularios-ch3-r1.ataque.test.tsx:240`: `ruta.pathname`, más dos líneas de comentario.
- **Pruebas normales que cambian:** solo `trabajo-view.test.tsx` (E11-3, el caso M-01) y `recuperar-ch3.test.tsx` (E11-2, la de arriba).
- **Sin cambios contra `91756a5`:** `shared/`, `backend/`, `infra/`, `components/`, `lib/`, `docs/ARCHITECTURE.md`, `docs/PRD.md` y `.claude/`. En `services/` solo cambia C-29, y en `app/` solo hay dos pruebas nuevas.
- `AGENTS.md`, `CLAUDE.md` y `ARCHITECTURE-ESSENTIALS.md` coinciden con los hashes de `aprobacion.md`.

### 3. Documentos que aplicó el orquestador
**`DESIGN.md` contra `DESIGN-antes-03c2.md`.** Comparé con `git diff --no-index --word-diff` (5 hunks) y con un script que extrae los textos del plan y los busca como subcadena exacta.
- **A-02 bis:** la viñeta nueva coincide letra por letra con una línea completa de `DESIGN.md` (`:662`), y la vieja ya no está.
- **A-02 ter:**
  - En (1) a (4) y en (8), cada texto nuevo está y cada texto viejo desapareció.
  - (5), con el texto de la Enmienda 10 ("(sus secciones, §7.16, y las demás pantallas de la clase; CLASES-03c);"), (6) en sus dos apariciones y (7): comprobados con `grep -F`, una coincidencia cada uno.
  - Ya no queda "muro, Personas o Alumnos" ni "tareas ni materiales". "Ver más publicaciones" solo queda como historia, en `:695`.
- **A-04, la frase de los conteos:** la frase de entrada completa de §7.22 es una línea exacta del plan. El texto que cita, "Sus actividades y recursos pasarán a «Sin tema».", es igual a `TEXTOS_TEMAS.consecuenciaSinConteo` (`data.ts:532`).
- **Marcas de origen:** conté todas las marcas "propuesta…)" y "decisión del humano…)" antes y después. Solo cambia "propuesta (CLASES-03c)", que pasa de 4 a 7: la frase nueva "Desde CLASES-03" y los dos "fijada en propuesta (CLASES-03c)" de A-02 bis. No se borró ninguna.
- **Patrón visual nuevo de 03c2:** no hay.
  - La frase sin conteo para borrar un tema ya la describe A-04, igual que el total que solo pide quien gestiona (el estudiante no borra temas).
  - El aviso cuando el formulario ya no está (O-16) es el aviso de siempre, con textos que ya existían ("Clase creada", "Cambios guardados" y el mensaje traducido). Es un comportamiento, no un patrón visual.

**`ESTADO.md` contra `ESTADO-antes-03c2.md`** (4 hunks):
- **O-16:** dice "Cumplido en CLASES-03c2 … para comentario, crear y editar clase y tema (§D-11); anuncio y recurso, en CLASES-03d", con el hermano `useGuardarCategorias` y su destino, como lo pedí en la verificación del resumen. La fila sigue abierta hasta 03d, porque A-12 dice "cerradas en 03c y 03d". Es correcto.
- **R-3 de CHORE-02:** suma O-1d3-2 de `features/clases`, con la frase que pedí.
- **Filas 1 y 2 de CHORE-04:** tachadas, con "Hecho en CLASES-03c2 (2026-10-30, §D-12)".
- **Fila 29 de CHORE-04:** es el texto literal de mi arbitraje de O-01, más "Lo mismo aplicará a Recursos (03d) si ordena temas con este gancho", que también viene de ese arbitraje.
- **§2 y la línea 5:** siguen en "03c2 en curso". Ver M-01.

## Problemas que bloquean
Ninguno.

## Problemas que no bloquean
### M-01 — `ESTADO.md` §2 y "Última actualización" todavía describen 03c2 en curso
Dónde: `docs/ESTADO.md:5` ("03c2 en curso") y `:236`, que termina en "03c2 (contenido, base `<K3c1>`): Enmienda 8 (M-01 de la revisión final de 03c1) y ronda 0 en curso. Backend 229 / 2774; frontend 248 / 5434; 235 `*.ataque`.".

Qué se espera, antes del `git add`:
1. En `:236`, el plan pasa de "Enmiendas 1 a 7 (`plan.md`, SHA-256 `84074f4a…`)" a "Enmiendas 1 a 11 (`plan.md`, SHA-256 `5c538940…`)".
2. En `:236`, la frase final de 03c2 se reemplaza por esta:
> 03c2 (contenido, base `<K3c1>`): Enmiendas 8 a 11 (documentos de 03c1, arbitraje de la ronda 0 y título del recurso para 03d); ronda 0 con dos PARADAS resueltas (P-03c2-2 por C-25; P-03c2-1 por C-31 con autorización del humano para `features/tareas/formularios-ch3-r1.ataque.test.tsx:240` y `recuperar-ch3.test.tsx:200`); dos devoluciones del manager (M-01 del resumen y M-01 de la ronda 1, corregidas); ronda 1 ROTO (T-01, corregido), ronda 2 RESISTE; revisión final APROBADO CON OBSERVACIONES; A-02 bis, A-02 ter (1) a (8), la frase de los conteos de A-04 y la parte de A-12 de 03c2 aplicados. **03c2 cerrada el 2026-10-30**, pendiente del commit del humano `<K3c2>`. Backend 229 / 2774 (sin cambios desde 03b); frontend 255 / 5569; 239 `*.ataque`.
3. En `:5`: "Última actualización: 2026-10-30, por el orquestador (CLASES-03 en curso en `feat/clases-03`: 03c2 cerrada, pendiente del commit `<K3c2>`; sigue 03d)."

No toques otras líneas de `ESTADO.md`, salvo la fila de M-02.

### M-02 — O-03 de la ronda 2 va a `ESTADO.md` §3, no a la comprobación humana
Dónde: `reporte-tester.md`, "## CLASES-03c2 — Ronda 2", O-03. Incluye el cambio de comportamiento que anoté en "Verificación de la corrección de M-01 de la ronda 1 — 03c2": después de escribir el orden sobre una recarga fallida, pulsar la sección activa no vuelve a pedir nada.

Por qué no va a la comprobación humana:
- Esa comprobación es solo para lo que las pruebas no ven (AGENTS.md, "Trabajo visual"). Dura 10 minutos, tiene 7 puntos y ya están ocupados (H-1 a H-7).
- Para ver O-03 hay que forzar un fallo del servidor justo después de «Subir», y el humano no puede hacerlo en el navegador. Además, CL3-2R2-10 ya lo prueba.
- No aplica la regla de frases de recuperación: ninguna frase de la vista promete esa recarga. "No pudimos actualizar Actividades de aprendizaje. Mostramos la última versión que tenemos." no pide ninguna acción.
- No es un defecto de 03c2: el orden que se ve es el del servidor. Lo que puede quedar viejo son los conteos, hasta que la vista se vuelva a montar o llegue otra invalidación.

Qué se espera: al cerrar 03c2, el orquestador suma esta fila a la tabla de pendientes de `ESTADO.md` §3:
> | O-03 de la ronda 2 de CLASES-03c2: tras «Subir»/«Bajar» con la recarga por sección fallida, la vista escribe el orden de la respuesta y deja la lista marcada vieja; con la vista montada no la vuelve a pedir sola, y pulsar «Actividades de aprendizaje» estando ahí tampoco (CL3-2R2-10), así que los conteos de la sección pueden quedar viejos hasta volver a montarla o hasta otra invalidación. Ninguna frase promete la recarga | El `chore` de foco y navegación del marco (una sola política de recarga); si Recursos (03d) ordena temas con `useOrdenarTemas`, hereda lo mismo | `docs/trabajo/CLASES-03-reorganizacion-de-la-clase/revision.md`, "Revisión final — 03c2" (M-02) |

La comprobación humana no cambia.

## Detalles menores
- La frase que pedí para R-3 de CHORE-02 ("y los ganchos de `features/clases`, que desde CLASES-03c2 tienen `errorQueRedirigeElCliente` para hacerlo") quedó tal cual la escribí. Se entiende; la redacción es mía, no del orquestador, y no hay que cambiarla.
- R-03c2-2 del plan sigue citando la frase vieja de CL3-C15. Es el detalle menor de la Enmienda 11 y no afecta el código.
- `reporte-tester.md` tiene finales de línea CRLF, y git avisa que los convertirá a LF. Es cosmético, y su hash es el del árbol de trabajo.
- **Medición del programador (AGENTS.md, decisión del 2026-10-05):** 03c2 tuvo una sola ronda extra del tester (la ronda 1, por T-01), y vino de un mecanismo nuevo (la lista por sección tras ordenar), no de hermanos sin extender. Las dos devoluciones del manager fueron estados vecinos que encontró la verificación, no rondas del tester. No se llega a 2, así que el `programador` sigue en `sonnet`.

## Desacuerdos arbitrados
- No hay desacuerdos nuevos entre programador y tester: la ronda 2 no tuvo hallazgos.
- O-03 queda arbitrado en M-02. O-01 de la ronda 1 ya tiene su fila en CHORE-04 (la 29).

## Documentos a actualizar
- `ESTADO.md`: §2 y `:5` por M-01, antes del commit; la fila de §3 por M-02, al cerrar 03c2.
- Lo demás de 03c2 (A-02 bis, A-02 ter (1) a (8), la frase de los conteos de A-04 y la parte de A-12) ya está aplicado y cotejado arriba.
- Quedan para 03d: A-03 bis, A-05 y la parte de A-12 de 03d (O-16 en anuncio y recurso).
- `CLAUDE.md`, `AGENTS.md` y ESSENTIALS no cambian en 03c2.

## Para el humano
- **Comprobación en navegador** (una sola, al final de 03e; ningún agente la hace): ninguno de los puntos H-1 a H-7 es de 03c2. Los filtros (`tipo=anuncio`, `seccion=actividades`), los conteos por sección, la frase de borrar un tema, O-16 y las guardas los cubren las pruebas automáticas, y quedan como "no verificados en navegador, cubiertos por pruebas automáticas". Si al hacer H-3 o H-5 pasa por Avisos o Actividades: Avisos solo debe mostrar anuncios, y Actividades solo tareas.
- No hay decisiones pendientes para cerrar 03c2.

## Rutas para el `git add` del commit de 03c2
Código (8 modificados):
```
frontend/src/features/clases/components/formulario-clase.tsx
frontend/src/features/clases/components/formulario-comentario.tsx
frontend/src/features/clases/components/seccion-de-tema.tsx
frontend/src/features/clases/data.ts
frontend/src/features/clases/hooks.ts
frontend/src/features/clases/lib.ts
frontend/src/features/clases/trabajo-view.tsx
frontend/src/features/clases/types.ts
```
Pruebas normales (2 modificadas y 3 nuevas):
```
frontend/src/features/clases/trabajo-view.test.tsx
frontend/src/features/tareas/recuperar-ch3.test.tsx
frontend/src/app/redirige-03c2.test.ts
frontend/src/features/clases/contenido-03c2.test.tsx
frontend/src/features/clases/formularios-03c2.test.tsx
```
Pruebas `*.ataque` (3 modificadas y 4 nuevas):
```
frontend/src/features/clases/trabajo-01e-r1.ataque.test.tsx
frontend/src/features/tareas/formularios-ch3-r1.ataque.test.tsx
frontend/src/services/apiClient-ch3-r1.ataque.test.ts
frontend/src/app/invalidaciones-03c2-r1.ataque.test.tsx
frontend/src/features/clases/formularios-03c2-r1.ataque.test.tsx
frontend/src/features/clases/ordenar-03c2-r1.ataque.test.tsx
frontend/src/features/clases/ordenar-03c2-r2.ataque.test.tsx
```
Documentos y carpeta de trabajo:
```
docs/DESIGN.md
docs/ESTADO.md
docs/trabajo/CLASES-03-reorganizacion-de-la-clase/aprobacion.md
docs/trabajo/CLASES-03-reorganizacion-de-la-clase/plan.md
docs/trabajo/CLASES-03-reorganizacion-de-la-clase/reporte-tester.md
docs/trabajo/CLASES-03-reorganizacion-de-la-clase/revision.md
docs/trabajo/CLASES-03-reorganizacion-de-la-clase/resumen-programador-03c2.md
```
En total son 27 archivos: 8 de código, 5 de pruebas normales, 7 `*.ataque`, 2 documentos y 5 de `docs/trabajo/`. Son exactamente los de `git status -uall` (19 modificados y 8 sin rastrear), sin archivos ajenos. No entra nada de `shared/`, `backend/`, `infra/`, `AGENTS.md`, `CLAUDE.md` ni ESSENTIALS.
