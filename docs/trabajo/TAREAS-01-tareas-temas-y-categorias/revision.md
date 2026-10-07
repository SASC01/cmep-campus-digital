# Revisión del Manager — TAREAS-01 · tareas, temas y categorías ponderadas — plan
Veredicto: CAMBIOS REQUERIDOS
Verificación propia: no aplica: revisión de plan (no hay código del encargo). `plan.md` revisado con SHA-256 `eb6d076cb68ac45582e230d5b5bb1d9e97df8730760448fe565e5f00cab22d1e` (coincide con `aprobacion.md`).

Resumen: el plan es sólido y está bien fundado en el código. Verifiqué contra `ad070b9` lo que afirma de `core/autoria.ts`, `adapters/db/publicaciones.ts`, `maestros-de-clase.ts` (`bloquearClase`), `cliente.ts` (`enTransaccion`, `ejecutorSqlDe`), `handlers/clases/muro.ts`, `adapters/queue`, el esquema y las migraciones de Prisma, `middleware/README.md` y pg-boss 12.34.0 instalado, y es cierto. Las cinco preguntas son bloqueantes de verdad y coincido con las cinco recomendaciones del arquitecto (tabla en "Para el humano"). Lo que regresa son tres huecos concretos y baratos: uno rompe 01a a mitad de camino, otro deja sin probar el mecanismo nuevo más delicado y el tercero obliga al programador a adivinar. **Las preguntas P-01 a P-05 no dependen de M-01 a M-03:** el orquestador puede llevarle ya la tabla al humano mientras el arquitecto corrige.

## Problemas que bloquean

### M-01 — El esquema de 01a cambia el cuerpo que envía el frontend y rompe una prueba normal que no está en la lista cerrada
Dónde: "Cambios por capa", `shared/` (01a): la rama `material` de `crearPublicacionSchema` gana `temaId: z.uuid(…).nullable().optional().default(null)`; "Pruebas existentes que el programador puede cambiar", 01a; §D-R0 (C-1 a C-4).
Por qué importa: `frontend/src/features/clases/components/formulario-publicacion.tsx` (líneas 150 a 160) envía `resultado.data`, la **salida** de `crearPublicacionSchema.safeParse`. Con `.default(null)`, desde 01a todo material sale con `temaId: null` en el cuerpo. `frontend/src/features/clases/formulario-publicacion.test.tsx` compara ese cuerpo con `toEqual` exacto en dos casos (líneas 170 y 297, `{ tipo: "material", titulo, texto: "", archivoIds: [] }`), así que el paso 9 de 01a (`cd frontend; npm test`) sale en rojo. Ese archivo solo está en la lista cerrada de 01e y ningún C-n de 01a lo cubre: es una PA-16 a mitad de subentrega. Además, es un cambio de comportamiento del frontend en una subentrega donde su código de producción es "No se toca".
Qué se espera: que el cambio del esquema compartido en 01a no altere la salida para un cuerpo sin `temaId` (por ejemplo, `.optional()` sin `.default`, y el adaptador trata la ausencia como `null`), de modo que el cuerpo del frontend no cambie hasta 01e; o, si el arquitecto prefiere conservar el `default`, un C-n de 01a para esos casos y el archivo en la lista cerrada de 01a. Hermanos que el arquitecto debe revisar con el mismo criterio: todo `.default` o transformación nueva en un esquema que el frontend ya usa para **armar** un cuerpo antes de 01d. `publicacionSchema` en 01b es de respuesta y ya lo cubre C-5.

### M-02 — Falta la prueba que demuestra que una cancelación de pg-boss se revierte con la transacción
Dónde: PR-1B13, PA-19, R-05 (punto (iv) que el arquitecto marcó).
Por qué importa: `cancel` con `db` existe en pg-boss 12.34 (`dist/manager.js:1836` ejecuta `plans.cancelJobs`, un `UPDATE … SET state = 'cancelled' WHERE … state < 'completed'`, sobre el `db` recibido) y nunca se ha usado en el proyecto. Las pruebas del plan demuestran que la cancelación **llega** (`cancelled` en PR-1B08, PR-1B10 y PR-1B12) y que un `cancelar` que lanza aborta la edición (PR-1B13). Pero no prueban el modo de falla que distingue "dentro de la transacción" de "fuera": que `cancelar` funcione, algo **posterior** lance y el trabajo viejo vuelva a `created`. Si la cancelación escapara de la transacción, la edición se revertiría con `trabajo_id` apuntando a un recordatorio ya cancelado: la tarea se quedaría sin recordatorio, en silencio. PA-19 solo cubre "una reversión deja un trabajo vivo", no "deja muerto uno que debía seguir vivo" (regla 8 de `AGENTS.md`).
Qué se espera: PR-1B13 suma, llamando al adaptador con un callback doble (precedente: las pruebas de `crearPublicacion` con un `alGuardar` que lanza): (1) **editar la fecha:** se cancela el recordatorio viejo y después lanza el encolado del nuevo, así que la tarea queda intacta, el recordatorio viejo sigue en `created` y `trabajo_id` no cambia; (2) **borrar:** se cancela el recordatorio y después lanza la cancelación de `TAREA_CREADA`, así que la tarea existe y el recordatorio sigue en `created`; (3) **crear:** `TAREA_CREADA` se encola y después lanza el encolado de `RECORDATORIO_24H`, así que no queda ninguno de los dos (hoy el caso dice "un `encolar` que lanza" sin decir cuál). PA-19 se amplía con "o una reversión deja cancelado un trabajo que debía seguir vivo".

### M-03 — Tres puntos donde el programador tendría que adivinar o chocaría con "No se toca"
Dónde: §D-2, §D-4, §D-7, "Cambios por capa" (`backend/adapters/`), "No se toca" de 01b; §D-10 (formulario); S-15 y "Documentos a actualizar".
Por qué importa y qué se espera:
- **(a) Dónde viven las lecturas `FOR KEY SHARE` de tema y de categoría.** Las usan `crearPublicacion` y `moverATema` (01a), y `crearTarea` y `editarTarea` (01b). El plan no dice en qué archivo vive cada ayuda, y en 01b `adapters/db/temas.ts` y `categorias.ts` son "No se toca". Si el programador de 01b quiere poner la de categoría en `categorias.ts`, cae en PA-06. Si la escribe dentro de `tareas.ts`, quedan dos copias de una regla de bloqueo que el tester atacará como hermanas. Se espera el nombre y el archivo de cada ayuda (por ejemplo, las dos creadas y exportadas dentro de `adapters/db` en 01a, aunque la de categoría no tenga uso hasta 01b), y que §D-7 las cite.
- **(b) El selector de categoría no puede elegir en silencio.** Con categorías en la clase, "Sin categoría" no aparece, y un `<select>` nativo sin opción vacía preselecciona la primera categoría: la tarea se publica con una categoría que nadie eligió. Eso anula el propósito de P-01 (a) y la regla de `CLAUDE.md` contra los valores por defecto silenciosos. Se espera una opción inicial vacía ("Elige una categoría") que no pasa la validación del cliente (`ErrorDeCampo` "Elige la categoría de la tarea."), también al editar una tarea "Sin categoría" en una clase que ya tiene categorías, y que PR-1D03 y PR-1D04 lo cubran.
- **(c) S-15 se aparta de ESSENTIALS y no actualiza los documentos.** ESSENTIALS, "Capas del backend", nombra los módulos `queue` y `scheduler`, y `CLAUDE.md` dice "queue y scheduler (pg-boss)". El argumento del arquitecto es bueno (una sola instancia de pg-boss), pero `AGENTS.md` pide confirmación para apartarse de ESSENTIALS, y "Documentos a actualizar" no trae el texto. Se espera: S-15 marcada en el plan como "se aparta de ESSENTIALS (requiere visto bueno explícito)", y el texto para ESSENTIALS "Capas del backend" y para la línea de `adapters/` de `CLAUDE.md` al cerrar 01b.

## Puntos que el arquitecto marcó para revisión
- **(i) Rutas bajo `/api/clases/:claseId/…` (R-02): de acuerdo.** `middleware/README.md`, "Regla de `:claseId`": una ruta con pertenencia y sin `:claseId` responde `500 CLASE_AUSENTE`. Sin `:claseId` no hay sexto paso, y verificarlo a mano viola la regla 2. Las 13 rutas pasan la guarda: ninguna tiene un parámetro en los dos primeros segmentos, y bajo `/clases/` el segmento siguiente es siempre `:claseId`. `PUT …/temas/orden` frente a `…/temas/:temaId` es correcto (en find-my-way gana el segmento literal).
- **(ii) FK de categoría `NO ACTION` y no `RESTRICT`: de acuerdo.** Al borrar una clase, la cascada borra `categorias` y `tareas` en la misma sentencia y PostgreSQL no garantiza el orden de los disparadores de cascada. Con `RESTRICT` la comprobación sería inmediata y fallaría según el orden; con `NO ACTION` se hace al final de la sentencia. Es el mismo precedente que `archivos.publicacion_id` (`20261002141710_archivos`, línea 34). PR-1A08 lo prueba.
- **(iii) Protocolo de bloqueos de §D-7: correcto.** Recorrí los cruces: dos ediciones, edición y borrado, guardar categorías frente a crear o editar una tarea, borrar un tema frente a crear, editar o mover, y crear un material con tema. Dos ediciones quedan en serie sobre la fila de `tareas`. En READ COMMITTED, el `SELECT … FOR NO KEY UPDATE OF t` de la segunda devuelve la versión confirmada, con el `trabajo_id` que dejó la primera: un solo recordatorio vivo. Si el borrado gana, la edición no ve la fila (`404`); si gana la edición, el borrado cancela el trabajo nuevo. Con `FOR UPDATE` sobre la categoría antes de contar, el `409` o el `404` salen siempre. No encontré ciclos de espera: la edición toma `tareas`, luego `FOR KEY SHARE` de tema y categoría, luego `publicaciones`; borrar un tema toma la clase, luego el tema y luego `publicaciones`; el `FOR NO KEY UPDATE` de `bloquearClase` es compatible con el `FOR KEY SHARE` que toma la FK al insertar en `publicaciones`. R-08 (la carrera con la primera categoría) es aceptable con P-01 (a).
- **(iv) Cancelar dentro de la transacción (PA-19): el mecanismo existe** (`cancel(name, id, { db })`, `ConnectionOptions.db`, `dist/types.d.ts:502`). La retención de un trabajo diferido corre desde su `start_after` (`dist/plans.js:2073`, `keep_until = start_after + retention`), así que el argumento de §D-5 es cierto. El hueco de pruebas está en M-02. El plan sigue ESSENTIALS: cancelar y recrear, no el `update()` de pg-boss que movería `startAfter`. Está bien así.
- **(v) P-03 (a), la tarea como publicación de tipo `tarea`: de acuerdo** (recomendación en la tabla). No contradice ESSENTIALS: la tabla `tareas` existe y `archivos` sigue con exactamente un contexto. Contradice `ARCHITECTURE.md` §14, y el plan trae el texto que lo corrige (R-01). Que `crearPublicacionSchema` siga aceptando solo anuncio y material, y que solo `adapters/db/tareas.ts` escriba `tipo: "tarea"` (V-04), cierra la tarea a medias por la ruta del muro.
- **(vi) Dos migraciones en 01a: correcto y necesario.** PostgreSQL no deja usar un valor de `enum` en la misma transacción que lo agrega, Prisma aplica cada archivo de migración como una transacción, y el `CHECK` nuevo usa `'tarea'`. **Compatible hacia atrás:** sí (tablas nuevas, una columna que admite nulos, un valor de `enum` agregado y un `CHECK` que acepta todo lo que aceptaba el anterior). **Reversible:** el código anterior funciona sobre la base nueva mientras no existan filas de tipo `tarea`. Con tareas, el cliente de Prisma anterior falla al leer el muro (R-04): volver atrás exige borrarlas. Es aceptable sin `prod`, y queda anotado para DEPLOY.

## Problemas que no bloquean
- **N-01 — Ráfaga de peticiones en "Trabajo de clase" (R-06).** Abrir la vista dispara una petición por tema con elementos, hasta 31: es un N+1 a nivel HTTP. Cada consulta usa su índice y el tope es 30, así que no bloquea. Sugerencia para 01e: una primera página corta por tema (5 en lugar de 20) o pedir cada sección al hacerse visible, sin cambiar la API.
- **N-02 — "Sin tema" comparte el rango del índice con todos los anuncios.** Por el `CHECK`, todo anuncio tiene `tema_id` nulo, así que `GET …/trabajo?tema=sin-tema` recorre los anuncios de la clase y los descarta por `tipo`. El `groupBy` de conteos también lee todas las publicaciones de la clase. Está bien a la escala del piloto; conviene anotarlo en §14 junto al índice, para que nadie lo reutilice creyendo que excluye los anuncios.
- **N-03 — `tareas.clase_id` duplica `publicaciones.clase_id` sin garantía en la base,** y las lecturas autorizan filtrando por `t.clase_id`. Hoy solo `adapters/db/tareas.ts` escribe las dos filas, en la misma transacción y con el mismo `claseId`, así que el riesgo es bajo. Sugerencia: que PR-1B07 compruebe que coinciden, o que las lecturas filtren por `p.clase_id` (o por ambas).
- **N-04 — Consecuencias de P-01 (a) y de P-04 (b) que conviene que el humano vea** (también en "Para el humano"). Con P-01 (a), un maestro no puede quitar una categoría que tiene tareas del admin o del otro maestro, porque no puede editarlas para moverlas, y mover N tareas son N ediciones (no hay movimiento en bloque). Con P-04 (b), la tarea de un maestro que ya no da la clase la edita el maestro actual, pero su anuncio o su material solo los borra el admin: es una asimetría deliberada, porque la tarea tiene fecha y calificación.

## Detalles menores
- Los `UPDATE … FROM unnest` crudos (orden de temas, categorías) no activan `@updatedAt` de Prisma: que pongan `actualizado_en = now()` de forma explícita.
- `GET …/temas` ordena por `(orden, creado_en, id)` y el índice es `(clase_id, orden, id)`: conviene alinearlos en `(orden, id)` (con 30 filas da igual el costo; es por coherencia).
- R-03 y S-16 exageran el riesgo: si el backend sale primero, nadie puede crear tareas sin la interfaz de 01d, así que el frontend anterior no recibe elementos `tarea`. El riesgo real es la vuelta atrás (R-04).
- S-08 no es una suposición: es una regla del PRD, §2, "No objetivos" ("Comentarios públicos de la clase dentro de una tarea"). Conviene citarlo así.
- RF-24: el "no requiere adjuntos" es un atributo de la tarea. Conviene que "No entra" diga que ENTREGAS agregará una columna a `tareas` (migración aditiva) y un control al formulario de `features/tareas`.
- Borrar una tarea cancela `TAREA_CREADA`, y borrar una publicación del muro no cancela `PUBLICACION_CREADA`. Las dos cosas son inocuas y el consumidor debe tolerar el dato borrado de todos modos (fila de ESTADO para NOTIFICACIONES); basta con una frase del porqué en §D-4.

## Desacuerdos arbitrados
Ninguno (revisión de plan).

## Documentos a actualizar
Además de los que el plan ya lista (bien redactados y completos para ESSENTIALS, `PRD.md` RN-05 y RN-07, `ARCHITECTURE.md` §7, §8, §10, §11 y §14, `CLAUDE.md`, `DESIGN.md` y los README del backend):
- ESSENTIALS, "Capas del backend", y `CLAUDE.md`, línea de `adapters/`: los trabajos diferidos viven en `queue`, sin módulo `scheduler` aparte (M-03 c), si el humano acepta S-15.
- ESTADO, sección 3: para ENTREGAS, la columna de RF-24 en `tareas` y el control del formulario; para DEPLOY, R-04 (el plan ya lo lista) y que backend y frontend de TAREAS-01 salgan en la misma ventana.

## Lista de Modo 1 y lo que pidió el orquestador
- **Cobertura:** RF-12 (la tarea en el muro), RF-13, RF-32, RF-34, RF-43 (con P-03 de CLASES-01 respetada punto por punto), RF-44 (guardar y mostrar), RN-05 (lo que fija la categoría), RN-06 y RN-07 aplicada a tareas, con el admin que publica y el maestro que no toca lo del admin. Cierra los dos pendientes con destino TAREAS: el umbral de §7.7 y O-18. No agrega nada que nadie pidió: "Crear tarea" en el muro (S-18) y `NativeSelect` son el mínimo para las pantallas pedidas. Lo diferido tiene destino.
- **Consultas:** cada consulta de "Acceso a datos" encaja en un índice de §D-1 o existente. El muro y "Trabajo de clase" se paginan por cursor (máximo 100). Temas (30) y categorías (10) van sin paginar, acotados por regla de negocio y muy por debajo de 100 (S-14). No hay consultas dentro de ciclos: conteos, adjuntos y maestros, una consulta cada uno; criterios con `createMany`; orden y categorías con un `UPDATE … FROM unnest` parametrizado. El SQL crudo nuevo es etiquetado y `$queryRawUnsafe` sigue siendo uno solo (V-04).
- **Transacciones, cola y trabajos diferidos:** `TAREA_CREADA` y `RECORDATORIO_24H` se encolan en la transacción del dato; editar la fecha cancela y recrea con un id nuevo, y borrar cancela, todo en la misma transacción (reglas 5 y 8). `adapters/db` no importa `adapters/queue`: el handler pasa callbacks, como en el muro. Ningún handler crea avisos. Falta la prueba de M-02.
- **Cadena y campos:** las 13 rutas declaran `roles` explícitos y el sexto paso; el admin aparece solo donde se nombra. La autoría se decide en `core/autoria.ts`, dentro de la transacción y después de bloquear la tarea; las respuestas traen `puedeEditar`, `puedeBorrar` y `puedeMover`. Nunca salen `estadoPago`, `accesoRestringido`, correos, rol del autor, `trabajo_id` ni la clave del objeto. Nada de la tarea es privado para el alumno inscrito (S-17). `middleware/` no se toca. PR-1A09 y PR-1B14 cubren la autorización completa.
- **Archivos:** los adjuntos de la tarea usan el mismo flujo prefirmado y la misma confirmación por `publicacion_id`, dentro de la transacción. No pasan por Node.
- **Carril:** sensible, correcto (migración, trabajos diferidos, rutas con sexto paso).
- **Corte en subentregas:** correcto. 01a y 01b solo tocan backend y `shared/`; 01c es un refactor puro, en su propio commit; 01d y 01e solo tocan frontend. Cada una se puede cerrar con `lint`, `test` y `build` en verde y un commit, salvo los dos huecos que corrigen M-01 (01a rompería una prueba del frontend) y M-03 (a) (01b chocaría con "No se toca" de `temas.ts` o `categorias.ts`). Las listas de "No se toca" están completas para lo que cada subentrega hace. Comprobé que 01b no rompe el `tsc` del frontend: `publicacion-del-muro.tsx` solo compara `tipo === "material"`, sin `switch` exhaustivo. Entre `<K1b>` y `<K1d>`, una tarea creada por API se vería en el muro de `dev` como anuncio; es aceptable, porque no hay despliegue entre esos commits y nadie puede crearla desde la interfaz.
- **Tamaño de los pasos:** adecuado para el programador (`sonnet`, esfuerzo medio). Las firmas de `core/`, las sentencias de bloqueo, el orden dentro de cada transacción, los códigos de error con su texto y cada prueba con su archivo están escritos. Las tres excepciones son las de M-03.

## Para el humano
Las cinco preguntas son bloqueantes de verdad: P-01 y P-04 son reglas de producto (calificación y autoría), P-02 interpreta su instrucción "el maestro no toca las del admin", P-03 cambia el modelo de datos de `ARCHITECTURE.md` §14 y P-05 es un refactor entre dominios que `AGENTS.md` obliga a confirmar. No falta ninguna pregunta. **El manager coincide con el arquitecto en las cinco.**

| Id | Recomendación del manager | Por qué |
|---|---|---|
| P-01 | **(a)**, igual que el arquitecto. | Nadie queda bloqueado para publicar mientras no haya categorías; con categorías, ninguna tarea nueva queda fuera del cálculo ponderado, y como no se puede quitar una categoría con tareas, una calificación nunca cambia en silencio por un clic. Consecuencia que debe conocer: para quitar una categoría que tiene tareas del admin o del otro maestro, el autor de cada tarea tiene que moverla (no hay movimiento en bloque). |
| P-02 | **(b)**, igual que el arquitecto. | Leo "el maestro no toca las del admin" como la regla de autoría de ESSENTIALS: no edita ni borra. Mover entre temas organiza la clase, y con (c) una tarea del admin quedaría fuera de los temas del maestro. Si usted quiso decir "no toca" en sentido literal, incluido moverla, la variante es (b) sin que el maestro pueda mover lo del admin, no (c). |
| P-03 | **(a)**, igual que el arquitecto. | Reutiliza la autoría, la firma, la confirmación de archivos y la paginación ya atacadas en CLASES, y deja el muro y "Trabajo de clase" como consultas de una sola tabla con índice. Costos que acepta con (a): con tareas ya creadas, volver atrás el backend exige borrarlas (R-04), y todo encargo futuro que lea `publicaciones` debe filtrar por tipo. |
| P-04 | **(b)**, igual que el arquitecto. | Con (a), corregir la fecha de la tarea de un maestro que ya no da la clase obliga a borrarla y crearla de nuevo, y desde ENTREGAS eso borraría las entregas de los alumnos; (c) cambia RN-07 entre maestros activos. Asimetría deliberada: su anuncio o su material siguen pudiéndolos borrar solo el admin. |
| P-05 | **(a)**, igual que el arquitecto. | `CLAUDE.md` asigna el detalle, el formulario y la rúbrica al módulo `tareas`. El refactor queda aislado en su propio commit y sin cambio de comportamiento, y ENTREGAS se construye directo sobre `features/tareas`. Con (b), ENTREGAS movería además todo lo que se escriba ahora. |

**Suposiciones:** no recomiendo vetar ninguna. Tres merecen su atención al aprobar:
- **S-15** se aparta de ESSENTIALS (los trabajos diferidos van en `queue`, sin un módulo `scheduler` aparte). Estoy de acuerdo con el argumento, pero requiere su visto bueno explícito (M-03 c).
- **S-02** (fecha límite obligatoria, a no más de 365 días) es una decisión de producto razonable, pero es una decisión: hoy no habría tareas sin fecha.
- **S-10** (umbral de "fecha límite próxima" de 72 horas) es un valor de diseño que queda como "propuesta" en `DESIGN.md` hasta que usted lo vea en la comprobación (H-7).

**Siguiente paso:** el arquitecto corrige M-01 a M-03 en una enmienda (sin rediseño: son tres precisiones y una prueba), el manager la revisa, y el plan llega a usted con esta tabla. Puede contestar P-01 a P-05 desde ya: las correcciones no dependen de sus respuestas.

## Revisión de la Enmienda 1
Veredicto: **APROBADO**, condicionado a las respuestas del humano a P-01 a P-05 y a su visto bueno o veto de S-15. Si una respuesta difiere de la recomendación (o si veta S-15), el arquitecto escribe una enmienda y el manager la revisa antes de programar (PA-18, R-16).
Verificación propia: no aplica: revisión de plan. `plan.md` revisado: 702 líneas, SHA-256 `e38bad47df49995a1fb5ad75128ab58e7c98ce136f48c5ddb2c092f6065c3795`. Contrasté cada cambio contra su sección, no contra el índice de la enmienda.

- **M-01, resuelto.** "Cambios por capa", `shared/` (01a): `temaId` es `.nullable().optional()`, sin `.default`, y el handler hace `datos.temaId ?? null`. §D-2 lo repite y §D-11 dice que en 01e el cuerpo lleva `temaId` solo con un tema elegido. Con zod 4, una clave opcional ausente no aparece en la salida de `safeParse`, así que el cuerpo que arma `formulario-publicacion.tsx` no cambia en 01a. Los dos `toEqual` (líneas 170 y 297) siguen valiendo, y **la lista cerrada de 01a es coherente sin cambios**: `formulario-publicacion.test.tsx` sigue solo en la de 01e, donde PR-1E04 suma los casos nuevos. PR-1A03 prueba que, sin `temaId`, la salida no lleva la clave. Los hermanos que lista el arquitecto son correctos: `archivoIdsSchema` solo se exporta, los `.default` de `crearTareaSchema` los usa por primera vez el formulario de 01d, y `publicacionSchema` es de respuesta (C-5).
- **M-02, resuelto.** PR-1B13 trae los cuatro casos con los títulos exactos que pedí: "editar: si falla el encolado del recordatorio nuevo, el recordatorio viejo sigue en created y la tarea no cambia"; "borrar: si falla la cancelación de TAREA_CREADA, la tarea sigue y su recordatorio sigue en created"; "crear: si falla el encolado de RECORDATORIO_24H, no queda la tarea ni TAREA_CREADA"; "editar: si falla la cancelación del recordatorio viejo, la edición no se guarda". Cada caso dice qué comprobar (estado de los trabajos, `trabajo_id`, filas). Los callbacks dobles hacen la operación real de pg-boss y después lanzan. PA-19 suma "o una reversión deja cancelado un trabajo que debía seguir vivo", y R-05 cita PR-1B13.
- **M-03 (a), resuelto.** `adapters/db/referencias.ts` (01a, nuevo) define `bloquearTemaParaUsar` y `bloquearCategoriaParaUsar`, con firma, sentencia y retorno. Lo citan §D-2, §D-4 (paso 6; editar remite a "como al crear") y §D-7. V-04 exige `FOR KEY SHARE` solo en ese archivo, el paso 6 de 01a lo crea, PR-1A07 prueba la ayuda de categoría en 01a y en 01b el archivo es "No se toca" (solo se importa). La ayuda de categoría queda sin uso de producción en 01a; no rompe `lint`, porque `eslint.config.mjs` no tiene ninguna regla de exportaciones sin uso.
- **M-03 (b), resuelto.** §D-10 pone la opción vacía "Elige una categoría", seleccionada cuando la tarea no tiene categoría (al crear, o al editar una "Sin categoría" en una clase con categorías), y la valida en el cliente con "Elige la categoría de la tarea.". La regla vive en `cuerpoDeTarea(estado, categoriasEnLaClase)`, igual que en `core.validarCategoriaRequerida`. PR-1D03 (enviar sin elegir no hace ninguna petición) y PR-1D04 lo cubren, y los textos están en "Textos de la interfaz".
- **M-03 (c), resuelto.** S-15 está marcada como apartamiento de ESSENTIALS. R-16 trae la alternativa si el humano la veta. El paso 0 pide el visto bueno o el veto. "Documentos a actualizar" trae los textos condicionados y comprobé que sus anclas existen literalmente: ESSENTIALS línea 32, `CLAUDE.md` línea 92, `ARCHITECTURE.md` §10 "Trabajos diferidos de pg-boss (`startAfter`)." y `adapters/README.md` línea 8.
- **De paso:** el `UPDATE … FROM unnest` del orden de temas pone `actualizado_en = now()` y declara que lo mismo vale para el de categorías (§D-2). Basta. Que la fila de categorías de §D-3 no lo repita es un detalle; el programador lo tiene en §D-2.
- Lo que no se aplicó (N-01 a N-04 y los demás detalles menores) no bloquea. El programador y el tester lo tienen en este archivo.

Sin hallazgos nuevos. La tabla de "Para el humano" no cambia: el manager coincide con el arquitecto en P-01 a P-05, no recomienda vetar ninguna suposición y pide la atención del humano en S-15, S-02 y S-10.

## Verificación del resumen — TAREAS-01a — implementación
Veredicto: **resumen ACEPTADO**. El tester puede atacar 01a.
Corrida propia del 2026-10-06, una suite a la vez, sobre el árbol de trabajo con base `<R>` = `ad070b9`. `resumen-programador.md` SHA-256 `acdc6b97…ee1f`; `plan.md` vigente `3542eef7…eee7`.
PA-01: red `uacam5 2` (Pública), declarada de confianza por el humano para la sesión de hoy (`aprobacion.md`); regla "Campus: bloquear entrada a Docker en redes publicas" habilitada, Inbound, Block, Public; Docker 28.5.1 encendido.

| Comprobación | Resumen del programador | Corrida del manager |
|---|---|---|
| `cd backend; npm run lint` | código 0; `> tsc -p tsconfig.json --noEmit && tsc -p tsconfig.test.json` | código 0; misma última línea (Prettier: "All matched files use Prettier code style!") |
| `cd backend; npm test` | `Test Files 154 passed (154)` · `Tests 1872 passed (1872)` | `Test Files 154 passed (154)` · `Tests 1872 passed (1872)` (87.98 s) |
| `cd backend; npx vitest list` | 1872 pruebas, 154 archivos, 126 `PR-1A` | 1872 líneas, 154 archivos distintos, 126 `PR-1A` |
| Por viñeta (`vitest list`) | 1A01 16 · 1A02 16 · 1A03 27 · 1A04 12 · 1A05 5 · 1A06 9 · 1A07 16 · 1A08 14 · 1A09 11 | idénticas, cada una en el archivo que exige el plan |
| `cd shared; npm run build` | código 0; `> tsc -p tsconfig.json` | código 0; igual. `npm run lint` de `shared`: igual |
| `npm run build` (raíz) | código 0; última línea, el aviso de tiempos de plugins de rolldown | código 0; última línea `✓ built in 825ms`. El aviso de rolldown solo sale cuando los plugins tardan, así que no es una cifra que no coincida |
| `npm run lint` (raíz) | código 0; `> tsc -b` | código 0; `> tsc -b` |
| `cd frontend; npm run lint` | código 0; `> tsc -b` | código 0; `> tsc -b` |
| `cd frontend; npm test` | `127 passed (127)` · `1852 passed (1852)` | `127 passed (127)` · `1852 passed (1852)` |
| `npx prisma validate` | válido | `The schema at prisma\schema.prisma is valid` |

- **Títulos exactos:** los 110 títulos que el resumen cita entre comillas existen literalmente en `npx vitest list`. Los 16 restantes se describen ("más 2", "siete más") y salen de la misma lista. Cada viñeta, de PR-1A01 a PR-1A09, tiene su archivo y al menos un título exacto que existe.
- **V-01:** las 141 `*.ataque` (versionadas y no versionadas; no hay ninguna nueva) coinciden en SHA-256 con la tabla de la ronda 0 de 01a (`diff` vacío). La única distinta respecto de CLASES-02d es `sesiones-y-cadena.ataque.test.ts`, que reescribió el tester (`2C8CB4D7…45C8`).
- **V-02:** las corridas de arriba; todas con código 0.
- **V-03:** `prisma validate` OK; `prisma format --check` "All files are formatted correctly!"; `migrate status`, "12 migrations found" y "Database schema is up to date!". En `backend/prisma/migrations` solo hay dos carpetas nuevas y ningún cambio sobre `ad070b9`. No ejecuté `prisma generate`: el cliente con el que pasaron `lint` y `test` es el que generó el programador.
- **PA-04:** `npx prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --exit-code` termina con código 0 ("No difference detected.").
- **PA-03:** la primera migración contiene solo `ALTER TYPE "tipo_publicacion" ADD VALUE 'tarea';`. La segunda trae `ADD COLUMN "tema_id"`, las cuatro tablas, los índices, las FK y los `CHECK` de §D-1, sin un `DROP` que no sea el de `publicaciones_titulo_segun_tipo` (reemplazado por uno que acepta todo lo anterior), sin `ALTER` de columnas existentes y sin tocar tablas protegidas. `tareas_categoria_id_fkey` es `ON DELETE NO ACTION`; `tareas_id_fkey` va a `publicaciones` con `ON DELETE CASCADE`; `publicaciones_tema_id_fkey`, `ON DELETE SET NULL`; además está `publicaciones_anuncio_sin_tema`. Es compatible hacia atrás.
- **PA-07** (salida completa, `grep -o -F`): `40P01` 0, `deadlock detected` 0, `could not serialize` 0, `too many clients` 0, `Unable to start a transaction` 0, `"Error no controlado"` 10, `"code":"P2028"` 5. Los 10 son exactamente I-1: 5 de `buscarCredencialesPorEmail` y 1 de `crearSesion` (`intentos-r2`), 3 `ZodError` (`archivos.ts:61`, `archivos.ts:90`, `muro.ts:135`) y "boom" (`salud.integracion`). Los 5 `P2028` son los permitidos (`tx.sesion.create` y `tx.tokenCuenta.updateMany` de `cuentas-r3`; `tx.sesion.findFirst`, `tx.sesion.updateMany` y `$queryRawUnsafe` de `servicio-ocupado`), con el control positivo completo. Ninguno sale de una ruta de TAREAS-01. **Limpia.**
- **V-04:** `$queryRawUnsafe` en código versionado solo en `adapters/db/cliente.ts`. SQL etiquetado nuevo solo en `referencias.ts`, `temas.ts` y `categorias.ts`. `FOR KEY SHARE` solo en `referencias.ts` (dos sentencias parametrizadas). `tipo: "tarea"` en escrituras: 0. `addHook` y `notifier` en `handlers/*.ts`: 0. `estadoPago`: los mismos archivos versionados que en `ad070b9`. `console.` en los archivos nuevos: 0. `trabajoId` o `trabajo_id` en `shared/src`: 0.
- **V-05 ("No se toca"):** `git diff --name-only ad070b9` y los archivos sin versionar caben exactamente en "Cambios por capa" de 01a y en A-1, A-3, A-5, A-8, A-10 y A-11. `maestros-de-clase.ts` solo importa `bloquearClase`, cuyo cuerpo en `bloqueo-clase.ts` es idéntico y no se reexporta en `index.ts`. `shared/src/index.ts` solo agrega reexportaciones. Pruebas existentes cambiadas: solo E6 de `bloqueo-usuario.integracion.test.ts` (I-2: la lista cerrada suma `categorias.ts`, `referencias.ts` y `temas.ts`, y cambia el título; la lógica no) y `sesiones-y-cadena.ataque.test.ts` (tester, ronda 0). Los `package.json`, `package-lock.json`, `infra/`, `AGENTS.md`, `CLAUDE.md` y `.claude/` no cambiaron. ESSENTIALS: SHA-256 `21896847350e5e562c33ad4f58a1dd5860145cb209bf6cefff9ea3d855e72558`, el de `aprobacion.md`.
- **V-06:** `handlers/tareas/temas.ts` (6 rutas) y `categorias.ts` (2 rutas) declaran todas `protegido()` con `roles` explícitos y su sexto paso, como la tabla de "Autorización". La lista cerrada de `printRoutes` de `sesiones-y-cadena.ataque` (72 entradas, ronda 0) pasa en verde. `middleware/` no cambió, así que `RUTAS_PUBLICAS` sigue con 10.
- **V-07:** las cifras del resumen coinciden una por una con mi `vitest list` y con mi corrida (tabla de arriba).

**Arbitraje de las desviaciones declaradas** (el plan calla; ninguna contradice el plan):
1. **`PublicacionDb.tipo` admite `"tarea"`: se acepta.** El cliente generado ya conoce el valor, así que `tsc` lo exige. Es solo un tipo, sin cambio de consulta. En 01b el muro lo filtra o lo pinta (C-5 y §D-6).
2. **Nombres de temas y categorías recortados y con CRLF normalizado, con `conNombresDeCategoriaNormalizados` en `core/tareas/categorias.ts`: se acepta.** Es lo que pide S-05 ("mismas reglas de texto de CLASES… `normalizarTextoLargo`"). Para temas se reutiliza `conTextosNormalizados`. La función nueva es pura, no muta lo recibido, deja intacto lo que no es texto y tiene sus dos pruebas.
3. **`CODIGOS_TAREAS` solo con los 7 códigos de 01a: se acepta.** Coincide con el reparto de `shared/src/tareas.ts` en el plan (01a, temas y categorías; 01b, tareas). 01b agrega los 4 restantes.
4. **Pruebas extra en archivos de "Pruebas requeridas" (`bloquearTemaParaUsar` directo y el `FOR KEY SHARE` frente al guardado de categorías): se aceptan.** Son archivos de la lista, llevan el prefijo de su viñeta, cuentan en los 126 y prueban §D-7, que el plan pide proteger.
5. **`creado_en` separado 1 ms por posición en las categorías nuevas: se acepta.** Sin eso, el orden `(creado_en, id)` de §D-3 mezclaría por uuid las categorías creadas en un mismo guardado. El costo (un `creado_en` desplazado unos milisegundos) es irrelevante. Conviene una línea en `adapters/README.md` (sección de `db/categorias.ts`), y basta con que llegue con el README de 01b.
6. **`moverATema` responde `temaId` en minúsculas y `renombrarTema` el conteo con un `count`: se acepta.** Las minúsculas siguen el criterio de los ids de toda la API (`ordenTemasSchema`, ids de categoría). El conteo hace falta porque `temaSchema` lleva `elementos`, y es una sola consulta por índice (`publicaciones_tema_id_idx`), no un ciclo.
7. **`npx prettier --write` acotado a `backend/` (y los comentarios del esquema): se acepta.** `AGENTS.md` permite formateadores acotados al paquete, y `git status` no muestra archivos ajenos.

**Pendientes del resumen:**
- **"temaId: temaId: debe ser un identificador válido":** el prefijo doble es un patrón que ya existía (`maestroId`, `alumnoId`, `claseId`, `publicacionId`, `comentarioId` en `shared/` llevan el prefijo y `validarCuerpo` agrega otro), así que no es un defecto de 01a. Va a ESTADO §3 como pendiente transversal de carril trivial (quitar el prefijo de los mensajes de `z.uuid` en `shared/` o no duplicarlo en `validarCuerpo`, decidido una vez para todos). El formulario del muro de 01e nunca envía un `temaId` inválido.
- **El desempate por `creado_en` ordenado en memoria (S-14):** se acepta. Son hasta 30 filas ya filtradas por `(clase_id, orden, id)`; es el detalle menor que anoté en la revisión del plan y no pide índice.

Sin M-nn nuevos.

## Arbitraje — ronda 1 de 01a
Base: `reporte-tester.md`, "TAREAS-01a — Ronda 1" (SHA-256 `44162db5…df38`), y `aprobacion.md`, "Ronda 1 de 01a del tester: ROTO". Leí el código citado; no corrí nada en este arbitraje.

### 1. T-02 y T-03: se corrigen en 01a, en una clave de comparación propia de los nombres de temas y categorías
- **No se toca `normalizarTerminoDeBusqueda`.** La usan el buscador de alumnos, `usuarios.nombre_busqueda` (ya guardado y normalizado al escribir) y su índice de trigramas (ESSENTIALS, "Búsqueda de alumnos": "definida una sola vez en `shared/`"). Cambiarla obligaría a renormalizar las filas guardadas y movería la búsqueda de alumnos sin plan. Queda fuera de 01a.
- **Dónde va el remedio:** en `shared/src/tareas.ts` (permitido en 01a), una sola función pura que dé la clave de comparación de un nombre de tema o de categoría. Primero NFKC; después quita los `Default_Ignorable_Code_Point` (`/\p{Default_Ignorable_Code_Point}/gu`); al final, `normalizarTerminoDeBusqueda`. La usan los **cuatro** sitios que hoy comparan nombres: `validarNuevoTema` y `validarRenombre` (`core/tareas/temas.ts`), `planearReemplazoDeCategorias` (`core/tareas/categorias.ts`) y el refine de nombres repetidos de `reemplazarCategoriasSchema` (`shared/src/tareas.ts`). El tester los cuenta como tres flujos (crear tema, renombrar tema, guardar categorías), pero el guardado compara en dos lugares. **Solo cambia la comparación:** el nombre se guarda y se muestra tal como llega, con los ZWJ de los emojis intactos, porque `textoConContenidoSchema` los admite a propósito.
- **T-02 (invisibles):** es un defecto. S-05 dice que los nombres no se repiten, y dos nombres que se ven idénticos son el mismo nombre.
- **T-03 (formas de compatibilidad):** también se corrige en 01a, con la misma función. S-05 nombra solo mayúsculas y acentos, pero el plan, en "Puntos de ataque" para 01a (punto 2), pone el ancho completo entre las variantes de "nombres iguales": es la intención del arquitecto, no un requisito inventado. Agregar NFKC a una función que hay que crear de todos modos por T-02 cuesta una línea y no toca la búsqueda de alumnos. Si se dejara fuera, los dos casos rojos de T-03 quedarían en `*.ataque` sin remedio, y el programador no puede tocarlos.
- **O-01 ("ñ" igual a "n")** se queda como está: es el criterio de ESSENTIALS para `nombre_busqueda`, y la clave nueva lo hereda a propósito.
- Para ESTADO §3 (destino: el encargo que vuelva a abrir la búsqueda de alumnos): ¿`normalizarTerminoDeBusqueda` debe quitar los ignorables y aplicar NFKC para los nombres de personas? Así queda decidido una sola vez para todo `nombre_busqueda`.

### 2. El `500` de `GET /api/admin/clases` (PR-2A12)
- **La hipótesis del tester es plausible, y es la causa más probable.** `listarClasesAdmin` (`adapters/db/clases.ts:361`) pide las clases con `maestros: SELECT_MAESTROS_DE_CLASE` anidado. Con Prisma 7.10 sin la vista previa `relationJoins` (el `generator` de `schema.prisma` no la declara), Prisma resuelve la relación con una segunda consulta (`maestros_de_clase WHERE clase_id IN (…)`), fuera de una transacción. En READ COMMITTED, cada sentencia ve su propia instantánea. Si otro archivo de pruebas borra sus clases entre las dos sentencias (`borrarClasesDePrueba` hace `clase.deleteMany`, y la cascada borra `maestros_de_clase`), la primera ve la clase y la segunda ya no ve sus maestros. La página sale con `maestros: []` y el esquema de respuesta (mínimo 1) lanza `ZodError too_small`, que termina en `500`. La lista es global, así que la toca la limpieza de cualquier archivo en paralelo. Eso explica que sea intermitente y que saliera verde en las corridas del programador y en la mía.
- **No encontré otra causa ni una condición de la base con una clase sin maestros:** `core/clases/maestros.ts` no deja quitar al último maestro y valida dentro de la transacción, con la clase bloqueada. `crearClaseAdministrada` y `crearClaseDePrueba` crean la clase y sus asignaciones en un solo `create` anidado. `maestros_de_clase.maestro_id` es `ON DELETE RESTRICT`. Ninguna ruta borra clases. Los `INSERT INTO clases` sin maestro de `migracion-maestros-de-clase` y `sexto-paso-02a-r1` van sobre tablas temporales y se revierten. El caso nuevo del tester (`temas-01a-r1`, maestro retirado) deja la clase con un maestro, no con cero, y terminó 22 s antes.
- **Por qué sigue siendo del dominio (regla del humano del 2026-10-02):** la lectura no es consistente. Hoy solo la dispara la limpieza de las pruebas, pero cualquier borrado de clases futuro (una baja de clase en ADMIN) produciría el mismo `500` en el flujo del admin. Hermanos que debe revisar quien lo corrija: toda lectura con una relación anidada cuyo esquema exige un mínimo (`listarClasesInscritas`, `listarClasesImpartidas`, `leerClase` con sus maestros para el encabezado, `listarPersonas`).
- **(a) I-1:** no entra. I-1 es la lista de errores provocados a propósito, y este no lo es.
- **(b) PA-07 en las corridas siguientes de 01a, mientras exista el pendiente:** si reaparece **exactamente** ese error (`GET /api/admin/clases`, `ZodError too_small` en `clases[n].maestros`) y, con él, el rojo de PR-2A12 u otro caso de la lista del admin en `gestion-clases.integracion`, quien corre lo reporta con `requestId`, hora, proceso y el caso rojo, **no repite la corrida para limpiarla** (PA-12) y **no bloquea** el veredicto de 01a. Cualquier otro "Error no controlado", o ese mismo error en otra ruta, sí bloquea. Excepción: si sale en la corrida de cierre del manager, se reporta en `revision.md` y el humano lo ve en el resumen del commit de 01a.
- **(c) Destino recomendado para el humano:** **pendiente de prioridad alta en ESTADO §3**, con su propio encargo `fix/clases` (carril normal: toca `adapters/db/clases.ts`, sin migración ni middleware), que conviene correr **después del commit de 01a y antes de la ronda 0 de 01b**, para que las corridas de 01b salgan limpias. No recomiendo meterlo en 01a: es código de otro dominio, protegido en TAREAS-01, y mezclarlo rompe "una funcionalidad por cambio". El remedio lo decide su plan; las salidas naturales son leer la página y sus maestros en una sola instantánea (una transacción de solo lectura en REPEATABLE READ, o una sola sentencia) y aplicar lo mismo a los hermanos.

### 3. T-01, T-02 y T-04 van al programador (y T-03 con ellos, por el punto 1)
- **T-01 y T-04 son el mismo mecanismo:** un id de la ruta que no se pasa a minúsculas antes de compararlo en memoria o de devolverlo. Se espera **un solo remedio**, en la validación de los parámetros de 01a (`temaIdParamSchema` y el `publicacionId` de la ruta de mover, pasados a minúsculas como ya hacen `ordenTemasSchema` y los ids de categoría). No basta con parchar `validarRenombre`. Así se cubren las dos condiciones de T-01 (que el tema exista y que no se cuente a sí mismo) y la respuesta de T-04.
- **Hermanos que el resumen de la corrección debe recorrer uno por uno** (regla de hermanos y de estados vecinos):
  - las seis rutas de temas y mover: `GET` y `POST …/temas` (sin id), `PUT …/temas/:temaId`, `DELETE …/temas/:temaId`, `PUT …/temas/orden` y `PUT …/publicaciones/:publicacionId/tema`;
  - los ids del cuerpo: `temaId` al mover y al publicar un material, `temaIds` del orden e `id` de cada categoría;
  - toda respuesta de 01a que repita un id recibido;
  - los cuatro sitios que comparan nombres (punto 1).

  Para cada uno: si el remedio aplica, si se aplicó y con qué caso queda cubierto. Los estados vecinos de la comparación de nombres: crear, renombrar al mismo nombre, renombrar al de otro, y el guardado de categorías con dos nombres equivalentes en el mismo cuerpo y frente a una categoría que ya existe.
- **Rojos que deben quedar en verde después de la corrección:** los 7 casos de `temas-01a-r1` y `categorias-01a-r1` (T-01 a T-04). El programador no toca ninguna `*.ataque`. Base de V-01: la tabla de 143 hashes de la ronda 1.
- **PA-07 de la corrección:** I-1 = 10, más la excepción del punto 2 (b).

## Verificación del resumen — TAREAS-01a — corrección de la ronda 1
Veredicto: **resumen ACEPTADO**. El tester puede atacar la ronda 2. Mi corrida completa del backend trajo **un rojo intermitente ajeno a la corrección**: está en una `*.ataque` de CLASES-02b que no cambió, la causa es una cuenta global sobre el único admin y pasa aislada. Lo reporto completo abajo (PA-12) y no lo cuento contra el resumen.
Corrida propia del 2026-10-06, una suite a la vez. PA-01: red `uacam5 2` (Pública, declarada de confianza hoy); regla del firewall habilitada, Inbound, Block, Public.

| Comprobación | Resumen del programador | Corrida del manager |
|---|---|---|
| `cd shared; npm run build` | código 0; `> tsc -p tsconfig.json` | código 0 |
| `cd backend; npm run lint` | código 0; `> tsc -p tsconfig.json --noEmit && tsc -p tsconfig.test.json` | código 0 |
| `cd backend; npm test` | `Test Files 156 passed (156)` · `Tests 1918 passed (1918)` | `Test Files 1 failed \| 155 passed (156)` · `Tests 1 failed \| 1917 passed (1918)` (113.21 s): el rojo intermitente de abajo |
| `cd backend; npx vitest list` | 1918 pruebas, 156 archivos | 1918 líneas, 156 archivos. Por archivo, frente a mi lista de 01a: `core/tareas/temas.test.ts` 16 → 18, `categorias.test.ts` 16 → 17, `esquemas-tareas.test.ts` 27 → 29, y los dos `*.ataque` del tester (26 + 15 = 41). 1872 + 41 + 5 = 1918 |
| `npm run build` (raíz) | código 0; `✓ built in 1.58s` | código 0; `✓ built in 1.35s` |
| `npm run lint` (raíz) | código 0; `> tsc -b` | código 0; `> tsc -b` |
| `cd frontend; npm run lint` | código 0; `> tsc -b` | código 0; `> tsc -b` |
| `cd frontend; npm test` | `127 passed (127)` · `1852 passed (1852)` | `127 passed (127)` · `1852 passed (1852)` |

- **Los 7 rojos de la ronda 1, en verde:** en mi corrida completa, el único rojo es el de abajo, así que los 41 casos de `temas-01a-r1` y `categorias-01a-r1` (incluidos los 7 de T-01 a T-04) pasan.
- **V-01:** las 143 `*.ataque` coinciden con la tabla de la ronda 1 (`diff` vacío). Ninguna cambió.
- **PA-07:** `40P01` 0 · `deadlock detected` 0 · `could not serialize` 0 · `too many clients` 0 · `Unable to start a transaction` 0 · `"Error no controlado"` 10, exactamente I-1 (5 de `buscarCredencialesPorEmail`, 1 de `crearSesion`, 3 `ZodError` de URL del almacén y "boom") · `"code":"P2028"` 5, los permitidos (`tx.sesion.create`, `tx.tokenCuenta.updateMany`, `tx.sesion.findFirst`, `tx.sesion.updateMany` y `$queryRawUnsafe`), con el control positivo. `too_small`: 0. El `ZodError` de `GET /api/admin/clases` no reapareció y la excepción arbitrada no se usó. **Limpia.**
- **El rojo intermitente (PA-12, sin repetir la corrida completa):** `test/admin-muro-02b-r1.ataque.test.ts` › "ataque CLASES-02b r1: el admin no comenta (P-03 a)" › "comentar en su publicación y en la de un maestro…": `expected 3 to be +0` en la línea 391, `comentario.count({ where: { autorId: admin.id } })`.
  - La aserción cuenta los comentarios del admin **en toda la base**. El admin es una cuenta única que comparten todos los archivos, y `muro-admin.integracion.test.ts` siembra comentarios de ese admin con `crearComentarioDePrueba` (líneas 283 y 668, entre otras) mientras corre en paralelo.
  - Las cuentas se cruzan entre archivos. No hubo `500` ni ningún "Error no controlado".
  - Ninguno de los dos archivos cambió respecto de `ad070b9`, y la corrección no toca el muro ni los comentarios.
  - Corrido aislado para diagnosticar (`npx vitest run test/admin-muro-02b-r1.ataque.test.ts`): `10 passed (10)`.
  - **No es del dominio** (la regla de los `500` no aplica: la API respondió bien y lo que falla es la cuenta de la prueba) **ni de 01a**.
  - **Destino:** ESTADO §3, pendiente de aislamiento de pruebas. Como es una `*.ataque`, la reescribe el tester con autorización, acotando la cuenta a la clase o a las publicaciones de su escenario. Conviene que entre en la ronda 0 del `fix/clases` que ya recomendé.
  - **Para las corridas siguientes de 01a:** si reaparece **exactamente** ese caso con esa aserción, se reporta con su hora y no bloquea; cualquier otro rojo sí.

**Hermanos y estados vecinos, contrastados con el código** (todos los "aplica / se aplicó" y "no aplica" del resumen son ciertos):
- **Seis rutas de temas y mover:**
  - `GET` y `POST …/temas`: sin id de ruta; el `POST` compara con `claveDeNombre` (`validarNuevoTema`, `core/tareas/temas.ts:30-31`).
  - `PUT …/temas/:temaId` (`handlers/tareas/temas.ts:72`) y `DELETE …/temas/:temaId` (línea 87): las dos usan `temaIdParamSchema`, que ahora transforma a minúsculas (`shared/src/tareas.ts:47`). `validarRenombre` compara además en minúsculas en sus dos condiciones (líneas 40 a 45).
  - `PUT …/temas/orden`: `ordenTemasSchema` ya pasaba los ids a minúsculas (`enMinusculas`, línea 14), y `validarOrdenDeTemas` compara en minúsculas; sin cambio, con razón.
  - `PUT …/publicaciones/:publicacionId/tema`: `publicacionDeMoverParamSchema` (líneas 50 a 53, a minúsculas) solo en esa ruta (línea 100). `publicacionIdParamSchema` del muro no cambió (`git diff` de `shared/src/clases.ts` no lo toca).
  - Publicar un material con `temaId`: no aplica, con razón. El adaptador solo lo usa en `bloquearTemaParaUsar` (comparación `uuid` en la base, que no distingue mayúsculas) y la respuesta del muro no lleva `temaId`.
- **Ids del cuerpo:** `temaId` al mover pasa a minúsculas (`moverElementoSchema`, línea 60). Los `temaIds` del orden y el `id` de cada categoría ya iban a minúsculas (`reemplazarCategoriasSchema`, línea 128, y `planearReemplazoDeCategorias`, líneas 51, 58, 66 y 73). `temaId` al publicar: no aplica, por lo dicho arriba.
- **Respuestas que repiten un id recibido:** solo `moverATema` (`adapters/db/temas.ts:179`), que ahora devuelve los dos ids en minúsculas: `publicacionId` ya llega transformado y `temaId` también. Crear, renombrar, ordenar y las categorías responden filas releídas de la base. No hay otra.
- **Comparación de nombres:** los cuatro sitios usan `claveDeNombre`: `validarNuevoTema`, `validarRenombre`, `planearReemplazoDeCategorias` (línea 53) y el refine de `reemplazarCategoriasSchema` (línea 113). `normalizarTerminoDeBusqueda` solo se llama dentro de `claveDeNombre` y en la búsqueda de alumnos (`core/clases/busqueda.ts`), y no cambió (`git diff` de `shared/src/clases.ts` no la toca). `claveDeNombre` aplica NFKC, quita `\p{Default_Ignorable_Code_Point}` y luego llama a `normalizarTerminoDeBusqueda`, tal como el arbitraje. Los estados vecinos que lista el programador (crear; renombrar al mismo nombre en otra forma; renombrar al de otro; dos nombres equivalentes en el mismo guardado y frente a una existente, que en un guardado en bloque es el mismo caso) tienen caso nuevo en `core/` o en los rojos del tester.
- **"No se toca":** `git diff --name-only ad070b9` y los archivos sin versionar son los de 01a. Lo nuevo de la corrección cae en `shared/src/tareas.ts`, `shared/src/index.ts` (dos reexportaciones por nombre), `core/tareas/temas.ts`, `core/tareas/categorias.ts`, `handlers/tareas/temas.ts` y los tres archivos de PR-1A. `shared/src/` fuera de `clases.ts`, `tareas.ts` e `index.ts` no cambió.

Sin M-nn nuevos.

## Verificación del resumen — TAREAS-01a — corrección de la ronda 2
Veredicto: **resumen ACEPTADO**. El tester puede atacar la ronda 3, la última antes de escalar.
Corrida propia del 2026-10-06, una suite a la vez. PA-01: red `uacam5 2`, declarada de confianza hoy; regla del firewall habilitada (Block, Public).

| Comprobación | Resumen del programador | Corrida del manager |
|---|---|---|
| `cd shared; npm run build` y `npm run lint` | código 0; "All matched files use Prettier code style!" | código 0; igual |
| `cd backend; npm run lint` | código 0; `> tsc -p tsconfig.json --noEmit && tsc -p tsconfig.test.json` | código 0 |
| `cd backend; npm test` | `157 passed (157)` · `1938 passed (1938)` | `157 passed (157)` · `1938 passed (1938)` |
| `cd backend; npx vitest list` | 1938 casos, 157 archivos; +7 propios (temas +3, categorías +2, esquemas +2) | 1938 y 157. Frente a la corrección de la ronda 1: `temas.test.ts` 18 → 21, `categorias.test.ts` 17 → 19, `esquemas-tareas.test.ts` 29 → 31, más `nombres-ids-01a-r2` del tester con 13 casos. 1918 + 13 + 7 = 1938 |
| `npm run build` (raíz) | código 0; `✓ built in 1.28s` | código 0; `✓ built in 995ms` |
| `npm run lint` (raíz) y `cd frontend; npm run lint` | código 0; `> tsc -b` | código 0; `> tsc -b` |
| `cd frontend; npm test` | `127 passed (127)` · `1852 passed (1852)` | `127 passed (127)` · `1852 passed (1852)` |

- **Los 2 rojos de `nombres-ids-01a-r2` (T-05), en verde:** la corrida completa no tiene ningún rojo.
- **V-01:** las 144 `*.ataque` coinciden con la tabla de la ronda 2 (`diff` vacío).
- **PA-07:** `40P01`, `deadlock detected`, `could not serialize`, `too many clients`, `Unable to start a transaction` y `too_small`: 0 cada uno. `"Error no controlado"`: 10, exactamente I-1. `"code":"P2028"`: 5, los permitidos, con control positivo. Ninguna de las dos excepciones arbitradas apareció. **Limpia.**
- **Títulos exactos:** los 8 que cita el resumen existen literalmente en `vitest list`.
- **"No se toca":** respecto de la ronda 1, solo cambian `shared/src/clases.ts` (únicamente la palabra `export` delante de `CARACTER_QUE_SE_VE_VACIO`; la definición no cambia), `shared/src/tareas.ts`, `shared/src/index.ts` (reexportación por nombre, A-11) y los tres archivos de pruebas de PR-1A. Ninguna `*.ataque` cambió. El resto de `shared/src/` no cambió.

**Hermanos y estados vecinos, contrastados con el código y con `shared/dist`:**
- **Los cuatro sitios** siguen pasando por `claveDeNombre`: `validarNuevoTema` y `validarRenombre` (`const clave = claveDeNombre`), `planearReemplazoDeCategorias` y el refine de `reemplazarCategoriasSchema`. Ninguno llama directo a `normalizarTerminoDeBusqueda`.
- **La regla vive donde dice** (`shared/src/tareas.ts`, líneas 22 a 37): un solo `replace` sobre `CARACTER_QUE_SE_VE_VACIO` (la definición única de `clases.ts`, sin duplicarla). Lo que además es `Default_Ignorable` se quita; lo demás (U+2800 y U+1D159) se cambia por un espacio. Va después de NFKC y antes de `normalizarTerminoDeBusqueda`.
- **Comportamiento medido con `claveDeNombre`:**
  - "Unidad 1", "Unidad" + U+2800 + "1", "Unidad 1" + U+1D159, "Uni" + U+200B + "dad 1" y "Unidad" + NBSP + "1" dan todos `unidad 1`.
  - "Unidad" + U+3164 + "1" da `unidad1`.
  - U+FF9E y U+FF9F dan `""`.
  - "Straße" da `straße` y "STRASSE", `strasse`.
- **Estados vecinos:** cada uno tiene su caso:
  - nombre que queda vacío tras la clave (el esquema lo rechaza antes, por `contarCaracteresVisibles`);
  - renombrar a sí mismo con solo un carácter que se ve vacío de diferencia (pasa);
  - dos nombres equivalentes en un mismo guardado de categorías (`400`);
  - una categoría renombrada con solo esa diferencia (pasa);
  - relleno Hangul y espacios Unicode (caso de `esquemas-tareas`).

### Arbitraje — ronda 2 de 01a
- **(a) La desviación (U+2800 y U+1D159 cuentan como espacio, no se quitan): se acepta.** El blanco braille y U+1D159 se dibujan como un hueco con ancho, así que en "Unidad" + U+2800 + "1" ocupan el lugar de un espacio, y la clave correcta es la de "Unidad 1". Así lo esperaba el tester y así lo pide el principio de T-02 ("dos nombres que se ven idénticos son el mismo nombre"). Queda documentada en el comentario de `claveDeNombre` (líneas 22 a 28) y reutiliza la definición única de `shared/`. No bloquea.
- **(b) O-05, el relleno Hangul se quita ("unidad1"): se acepta como está.** Es `Default_Ignorable` y se trata igual que el resto de esa clase (T-02). Si se dibuja como un hueco o no depende de la fuente. El caso que queda abierto ("Unidad 1" frente a "Unidad" + relleno + "1", que en algunas fuentes se ven iguales) es de severidad mínima: un maestro duplicándose un tema en su propia clase. Cambiarlo es una línea, pero no amerita otra ronda. Va a **ESTADO §3** como observación, con destino al encargo que revise la normalización de textos. No bloquea.
- **(c) O-06, U+FF9E y U+FF9F visibles con clave vacía: observación con destino, sin corrección en 01a.** El efecto es un falso "repetido" entre dos nombres de un solo carácter de ese tipo, irreal en la práctica. No es una evasión de duplicados. La corrección no va en `contarCaracteresVisibles` (compartida y protegida, y cambiaría qué texto cuenta como vacío en todo el sistema). Si algún día se corrige, va en `claveDeNombre`, por ejemplo con una clave de respaldo cuando la normalizada queda vacía. **ESTADO §3**, con el mismo destino que (b). No bloquea.
- **(d) O-07, sin plegado de mayúsculas Unicode ni homoglifos: observación con destino.** S-05 no lo pide ("sin distinguir mayúsculas ni acentos" se cumple con `toLowerCase` en el alfabeto latino de la institución), y la detección de homoglifos entre alfabetos queda fuera del alcance del piloto. **ESTADO §3**, con el mismo destino. No bloquea.
- **(e) O-04, el UUID máximo en mayúsculas da `400` (por `z.uuid`), anterior a 01a: observación con destino.** Afecta a todas las rutas con ids desde antes de este encargo, es un id que nunca existe y la respuesta es un `400` controlado, no un `500`. **ESTADO §3**, como pendiente transversal de ids de carril trivial, junto con el prefijo duplicado "temaId: temaId: …" que ya registré. No bloquea.

Para ESTADO §3 (lo aplica el orquestador): O-05, O-06 y O-07, en una sola fila "Normalización de nombres para comparar: relleno Hangul como espacio, clave vacía de U+FF9E y U+FF9F, plegado de mayúsculas Unicode y homoglifos", con destino al encargo que revise `normalizarTerminoDeBusqueda` y los nombres de personas. O-04 va en la fila de ids transversales.

Sin M-nn nuevos.

## Revisión final — TAREAS-01a
Veredicto: **APROBADO CON OBSERVACIONES**. Nada bloquea: 01a se puede cerrar con el commit `<K1a>`. Las observaciones son pendientes con destino y dos detalles menores.
Verificación propia del 2026-10-06, una suite a la vez, con base `<R>` = `ad070b9` y el árbol de 01a sin commit. PA-01: red `uacam5 2`, declarada de confianza hoy; regla del firewall habilitada (Inbound, Block, Public).
- **Shared:** `npm run build` código 0 (`> tsc -p tsconfig.json`); `npm run lint` código 0 ("All matched files use Prettier code style!").
- **Backend:** `npm run lint` código 0 (`> tsc -p tsconfig.json --noEmit && tsc -p tsconfig.test.json`). `npm test` código 0: `Test Files 158 passed (158)` · `Tests 1949 passed (1949)`, lo esperado.
- **Prisma:** `npx prisma validate`, válido. PA-04 (`migrate diff … --exit-code`), código 0, "No difference detected.". `migrate status`: 12 migraciones, base al día.
- **Raíz:** `npm run build` código 0 (`✓ built in 746ms`); `npm run lint` código 0.
- **Frontend:** `npm run lint` código 0; `npm test` `127 passed (127)` · `1852 passed (1852)`, lo esperado.

### 1. Lo planeado, solo lo planeado y todo lo planeado
`git diff ad070b9 --stat`: 14 archivos versionados cambiados (284 inserciones, 44 borrados), más 22 nuevos en los paquetes. Contra el plan:
- **§D-1:** las dos migraciones, tal como las contrasté en la verificación de la implementación (PA-03): el `enum` aparte; `temas`, `categorias`, `tareas` y `criterios_rubrica`; `publicaciones.tema_id`, con sus FK, índices y los siete `CHECK`.
- **§D-2:** las seis rutas de temas y mover, con la secuencia de bloqueos y errores del plan (`adapters/db/temas.ts`, `handlers/tareas/temas.ts`), y el tema al publicar un material (`crearPublicacion` con `bloquearTemaParaUsar`, y `temaId ?? null` en el handler del muro).
- **§D-3:** `GET` y `PUT …/categorias` (`adapters/db/categorias.ts`), con el `FOR UPDATE` de las que se quitan antes de contar sus tareas, el `UPDATE … FROM unnest` solo de las que cambian y `createMany`.
- **§D-7:** `bloquearClase` movido sin cambios (A-5); las únicas lecturas `FOR KEY SHARE` están en `referencias.ts` (Enmienda 1, M-03 a).
- **§D-8:** los 7 códigos de 01a, con sus mensajes.
- **Enmienda 1, M-01:** `temaId` sin `.default`; el cuerpo del frontend no cambió y la suite del frontend sigue igual (127 / 1852).
- **`shared/`:** `textoDeUnaLineaSchema`, `archivoIdsSchema` exportado y `shared/src/tareas.ts` (temas y categorías), con reexportaciones por nombre (A-11). `CARACTER_QUE_SE_VE_VACIO` pasó a exportarse y `claveDeNombre` es nueva (arbitrajes de las rondas 1 y 2).
- **Lo arbitrado cuenta como planeado:** las siete decisiones del resumen inicial, la clave de comparación de T-02 y T-03, y la desviación de U+2800 y U+1D159.
- **Nada fuera del plan:**
  - Ningún archivo de "No se toca" cambió. `package.json`, `package-lock.json`, `infra/`, `AGENTS.md`, `CLAUDE.md` y `.claude/` siguen iguales.
  - ESSENTIALS tiene el hash de `aprobacion.md` (`21896847…2558`).
  - Las pruebas existentes cambiadas son solo la E6 de `bloqueo-usuario.integracion` (I-2) y la `*.ataque` que reescribió el tester en la ronda 0.
  - **Nada de lo de 01a quedó fuera.**

### 2 y 3. Corrida, PA-07 y V-01
- **PA-07**, sobre la salida completa del backend:
  - `40P01`, `deadlock detected`, `could not serialize`, `too many clients`, `Unable to start a transaction` y `too_small`: 0 cada uno.
  - `"Error no controlado"`: 10, exactamente I-1 (5 de `buscarCredencialesPorEmail`, 1 de `crearSesion`, 3 `ZodError` de URL del almacén y "boom").
  - `"code":"P2028"`: 5, los permitidos (`tx.sesion.create`, `tx.tokenCuenta.updateMany`, `tx.sesion.findFirst`, `tx.sesion.updateMany` y `$queryRawUnsafe`), con control positivo.
  - No apareció ninguna de las dos excepciones arbitradas. **Limpia.**
- **V-01:** las 145 `*.ataque` coinciden en SHA-256 con la tabla de la ronda 3 (`diff` vacío).
  - `git diff ad070b9 --name-only` sobre `*.ataque` da solo `sesiones-y-cadena.ataque.test.ts` (ronda 0 del tester).
  - Las nuevas son las cuatro del tester: `temas-01a-r1`, `categorias-01a-r1`, `nombres-ids-01a-r2` y `temas-01a-r3`.
  - No hay borradas (`git ls-files --deleted` vacío) ni casos saltados (ningún `.skip`, `.only`, `.todo`, `xit` ni `xdescribe` en las pruebas).
  - **El programador no tocó ninguna `*.ataque`.**

### 4. Definición de terminado (`AGENTS.md`), para 01a
- **Cumple los RF y RN:** sí, en su parte de backend.
  - RF-43: crear, renombrar, reordenar y borrar temas, mover elementos y "Sin tema", con P-03 (a) a (c) de CLASES-01 y P-02 (b).
  - RF-32: categorías en bloque con suma de 100, tope de 10 y sin quitar una categoría con tareas (P-01 a).
  - RN-06: el sexto paso en las 8 rutas.
  - La interfaz y las tareas vienen en 01b a 01e.
- **Capas y middleware:** sí.
  - `core/tareas/*` es puro.
  - Prisma y el SQL solo viven en `adapters/db`.
  - Los handlers son delgados y las 8 rutas van con `protegido()`, `roles` explícitos y el sexto paso.
  - `middleware/` no cambió.
- **`lint`, `build` y `test` en verde:** sí (corrida propia, arriba).
- **Pruebas de autorización de cada endpoint nuevo:** sí. PR-1A09 (`temas-autorizacion.integracion`, 11 casos) cubre las 8 rutas con rol incorrecto, clase ajena, clase inexistente, alumno restringido, cambio de contraseña pendiente y sin token, y comprueba que no salgan `estadoPago`, `accesoRestringido` ni correos. Las `*.ataque` del tester lo reforzaron.
- **Migración incluida y compatible hacia atrás:** sí, dos migraciones aditivas y validadas (PA-03, PA-04, PR-1A08). La vuelta atrás con filas de tipo `tarea` (R-04) aplica desde 01b.
- **`infra/` y `.env.example`:** no hacía falta tocarlos (no hay variables ni servicios nuevos) y no cambiaron.
- **Documentos:** los README del backend están al día (punto 7). Los textos de ESSENTIALS, `PRD.md` y `ARCHITECTURE.md` de "Al cerrar 01a" los aplica el orquestador con A-9 (punto 7).

### 5. Reglas que no se rompen y estilo
- **Estado de pago:** ninguna respuesta nueva lo lleva (PR-1A09).
- **Consultas sanas:** cada consulta filtra por una columna con índice (`temas(clase_id, orden, id)`, `categorias(clase_id, creado_en, id)`, `tareas(categoria_id)`, `publicaciones(clase_id, tema_id, …)` y las PK). Las listas de temas (30) y de categorías (10) están acotadas (S-14). No hay consultas dentro de ciclos: conteos con un `groupBy`, orden y categorías con un `UPDATE … FROM unnest`. Todo el SQL crudo está etiquetado y parametrizado, y `$queryRawUnsafe` sigue siendo uno solo.
- **Transacciones:** toda escritura compuesta va con `enTransaccion`, y ninguna ruta de 01a dio `P2028`.
- **Cola:** 01a no encola eventos nuevos. Publicar un material con tema sigue encolando `MATERIAL_CREADO` en la misma transacción, después del bloqueo del tema.
- **Lo que no aplica en 01a o no cambió:** archivos (sin cambios), UTC (`timestamptz(3)`), trabajos diferidos (no aplican en 01a), secretos (ninguno), esquema solo por migraciones, sin dependencias ni proveedores nuevos, `notifier` y autenticación sin tocar.
- **Estilo (`CLAUDE.md`):** retornos tempranos, `AppError` tipados en `core/` y `adapters/`, handlers sin `try/catch`, nada de Prisma fuera de `adapters/db` y comentarios que explican el porqué. Los `?? 0` de los conteos son valores válidos (cero elementos), no datos ocultos.

### 6. Hallazgos y observaciones del tester
- **T-01** (renombrar con el id en mayúsculas) y **T-04** (mover respondía el id en mayúsculas): corregidos en la validación de los parámetros. Verdes en `temas-01a-r1` y en las rondas 2 y 3.
- **T-02** (invisibles), **T-03** (formas de compatibilidad) y **T-05** (U+2800 y U+1D159): corregidos con `claveDeNombre` en los cuatro sitios. Verdes en `temas-01a-r1`, `categorias-01a-r1`, `nombres-ids-01a-r2` y en los bordes de `temas-01a-r3`.
- **O-01** ("ñ" igual a "n"): se queda; es el criterio de ESSENTIALS.
- **O-02** (sin FK compuesta que obligue a que `tema_id` y `categoria_id` sean de la misma clase): lo cuida la aplicación (filtro por clase y `referencias.ts`). Lo debe vigilar 01b (junto con N-03 de la revisión del plan).
- **O-03** (una tarea en el muro daría `500` hoy): por la API de 01a no se llega; lo cierra C-5 de 01b.
- **O-04 a O-07:** a ESTADO §3, como se arbitró en la ronda 2.

### 7. Documentos
**Textos que el orquestador aplica al cerrar 01a (A-9):** los de `plan.md`, "Documentos a actualizar" → "Al cerrar 01a" (líneas 511 a 520 del plan vigente), tal cual:
- ESSENTIALS, "Tablas";
- ESSENTIALS, "Restricciones clave";
- ESSENTIALS, "Reglas de negocio", viñeta "Temas" reescrita;
- ESSENTIALS, viñeta nueva "Categorías ponderadas", después de "Calificación general";
- `PRD.md`, RN-05, viñeta nueva;
- `ARCHITECTURE.md` §7, fila `tareas` (primera parte);
- `ARCHITECTURE.md` §14 (diagrama y filas `temas`, `categorias` y `publicaciones`).

**Ajuste que recomiendo sobre esos textos**, porque los arbitrajes de las rondas 1 y 2 cambiaron cómo se decide "nombre repetido" (definición de terminado: "documentos actualizados si cambió una decisión"):
- En la viñeta "Temas" de ESSENTIALS, "(hasta 30 por clase, sin nombres repetidos)" pasa a "(hasta 30 por clase, sin nombres repetidos: se comparan con `claveDeNombre` de `shared/src/tareas.ts`, sin distinguir mayúsculas, acentos, caracteres invisibles ni formas de compatibilidad)".
- En la viñeta "Categorías ponderadas", después de "hasta 10 por clase", se agrega ", sin nombres repetidos (misma comparación que los temas)".

Si el humano prefiere los textos del plan sin el ajuste, no bloquea.

**`CLAUDE.md`:** no se toca en 01a; sus textos llegan en 01c a 01e. **`DESIGN.md`:** no aplica (01a no tiene frontend).

**README del programador:** `adapters/README.md` (sección `db/bloqueo-clase.ts`, `referencias.ts`, `temas.ts` y `categorias.ts`) y `handlers/README.md` (`tareas/temas.ts`, `tareas/categorias.ts` y el `temaId` de `clases/muro.ts`) describen lo que hay. Eso incluye las únicas lecturas `FOR KEY SHARE`, el `actualizado_en` a mano y el `creado_en` distinto por posición en las categorías nuevas: la línea que pedí para 01b ya está.

### 8. Medición del programador en 01a
- **Rondas del tester:** 3, más la ronda 0. Ronda 1 ROTO (T-01 a T-04), ronda 2 ROTO (T-05), ronda 3 RESISTE: dentro del tope, en la última.
- **Rondas extra por hermanos o estados vecinos:** **1** (T-02 → T-05: el remedio usó una lista de invisibles más corta que la definición que ya existía en `shared/`).
- **Resúmenes devueltos:** 0 de 3.
- **PARADAS del programador:** 0.
- **Umbral de 2:** no se alcanzó, así que sigue en `sonnet`. El conteo sigue abierto para el resto de TAREAS.

### Problemas que no bloquean (detalles menores)
- `adapters/db/categorias.ts`, `mensajeConTareas(nombres.get(…) ?? "", …)`: el `?? ""` no se alcanza (las ids que se quitan salen de `actuales`), pero es un valor por defecto silencioso. Si algún día se alcanzara, el mensaje diría «» en lugar de fallar. Carril trivial cuando se toque el archivo.
- `handlers/README.md`: una línea de la viñeta de `tareas/categorias.ts` perdió la sangría con el ajuste de línea de Prettier. Cosmético.

### Para el humano
- **(i) El `500` de `GET /api/admin/clases` (CLASES-02, `listarClasesAdmin`):** la lista lee las clases y sus maestros en dos sentencias con distinta instantánea (Prisma 7 sin `relationJoins`). Un borrado de clases entre las dos (hoy solo lo hace la limpieza de las pruebas; mañana, una baja de clases en ADMIN) produce una clase sin maestros y un `500`.
  - **Recomendación:** un encargo propio `FIX-CLASES` (carril normal; toca `adapters/db/clases.ts` y sus hermanos `listarClasesInscritas`, `listarClasesImpartidas`, `leerClase` y `listarPersonas`), **entre `<K1a>` y la ronda 0 de 01b**, para que las corridas de 01b salgan limpias.
  - En su ronda 0 entra la reescritura de `admin-muro-02b-r1.ataque` › "el admin no comenta", cuya aserción cuenta los comentarios del admin en toda la base y choca con `muro-admin.integracion`. Ese caso pasa aislado; el cambio es acotar la cuenta a su escenario.
  - **Rama:** sugiero hacerlo en `feat/tareas` como commit propio, con su carpeta en `docs/trabajo/`, porque TAREAS no toca esos archivos. Si prefiere, en una rama `fix/clases` desde `main`.
- **(ii) El ajuste de los textos de ESSENTIALS** del punto 7: aceptarlo o aplicar los del plan tal cual.
- **(iii) Filas para ESTADO §3** (las aplica el orquestador):
  - el `500` de la lista del admin y la intermitencia de `admin-muro-02b-r1`, con el destino de (i);
  - "Normalización de nombres para comparar" (O-05, O-06, O-07), con destino al encargo que revise `normalizarTerminoDeBusqueda`;
  - "Ids transversales" (O-04, el UUID máximo en mayúsculas, y el prefijo duplicado "temaId: temaId: …"), carril trivial.

## Revisión de la Enmienda 2 — TAREAS-01b
Veredicto: **CAMBIOS REQUERIDOS** (M-01 y M-02). Son dos precisiones de ejecución, sin rediseño. El inventario, el remedio, C-8b y R-06 están bien.
Verificación propia: no aplica: revisión de plan. `plan.md` con la Enmienda 2: 752 líneas, SHA-256 `68d13196eb2fb4029f72b75e87fce6c7b32a45fc577b31a9e7ab3cdff0f7681f`, en `feat/tareas` con `HEAD` = `<M1>` = `07e4ab7`. Contrasté contra el código de `<M1>`: `lecturas-consistentes.integracion.test.ts`, `lecturas-fx-r1` y `lecturas-fx-r2`.

**¿Hace falta el humano?** No. La enmienda no cambia el alcance de 01b ni abre archivos protegidos nuevos:
- `adapters/db/tareas.ts` y `publicaciones.ts` ya estaban en 01b.
- `lecturas-consistentes` es una prueba normal que se suma a la lista cerrada (A-3).
- C-8b es una reescritura de `*.ataque` por C-n (A-2 de TAREAS-01).
- Aplica una regla de ESSENTIALS que el humano ya aprobó (A-1 de FIX-CLASES).

Basta con informarle al cerrar 01b, como ya prevé el orquestador.

### Problemas que bloquean

#### M-01 — Las pruebas nuevas no pueden reutilizar "sin cambiarla" la ayuda de la tabla retenida, y el borrado de una tarea no puede ir por `borrarPublicacion`
- **Dónde:** "Pruebas requeridas" de 01b (párrafo "Instantánea única de 01b" y tabla de PR-1B15 a PR-1B18b); lista cerrada de 01b ("solo el `describe` nuevo… usando sus ayudas sin cambiarlas").
- **Por qué importa:** en `<M1>`, `leerConLaClaseBorradaEnMedio` (`lecturas-consistentes.integracion.test.ts:114-170`) solo acepta `tabla: "clases" | "maestros_de_clase"`, con una rama literal de `LOCK TABLE … NOWAIT` por tabla, y siempre borra la **clase** (`tx.clase.deleteMany`, línea 170).
  - PR-1B15 retiene `publicaciones`, y PR-1B16c, PR-1B17 y PR-1B18b retienen `tareas`, y las cuatro borran una publicación. Con la ayuda tal como está no se puede, y cambiarla viola la lista cerrada (PA-16). Copiarla en el `describe` nuevo contradice "reutilizar sin copiarlos".
  - Además, el texto dice que los borrados usan "las funciones reales de los adaptadores (`borrarPublicacion`, `moverATema`)", pero desde 01b `borrarPublicacion` solo encuentra anuncios y materiales (§D-6): sobre una tarea devuelve `false` sin borrar nada.
  - Y en una retención, el borrado tiene que ir **dentro de la transacción retenedora**: por otra conexión esperaría a la tabla retenida y bloquearía hasta el `timeout`.
  - El programador tendría que adivinar las tres cosas.
- **Qué se espera:** que el plan diga cómo se reutiliza la ayuda. Por ejemplo, autorizar en la lista cerrada una generalización mínima: `tabla` gana las ramas literales `"publicaciones"` y `"tareas"` (siempre literales, nunca interpoladas), y la acción de borrado pasa a ser un parámetro con la de hoy por defecto, sin cambiar las llamadas existentes de PR-FX-02 a PR-FX-05. La alternativa es una ayuda nueva en el `describe` nuevo, dicha así. Y que diga con qué se borra cada cosa:
  - en una retención, dentro de la transacción retenedora (por ejemplo, `tx.publicacion.deleteMany({ where: { id } })`; la cascada borra la tarea y sus criterios; la tarea se siembra sin adjuntos);
  - con el gancho, `borrarPublicacion` solo para materiales y, para una tarea, la función real que corresponda (`borrarTarea` con un `alBorrar` vacío) o el `deleteMany` directo.

#### M-02 — El orden del paso 16 no produce el "rojo antes del remedio", y C-8b deja un rojo sin declarar entre los pasos 16 y 19
- **Dónde:** paso 16 ("Antes del adaptador, PR-1B15, PR-1B16a y PR-1B16c… con la corrida en rojo guardada"), paso 17 ("el orquestador lanza la ronda 0 complementaria del tester para C-8b"), PA-21 y PA-05.
- **Por qué importa:**
  - **El orden:** `leerTarea` y `listarTrabajo` nacen en el mismo paso 16. Escritas las pruebas "antes del adaptador", fallarían porque la función no existe, no por el defecto, y PA-21 no podría distinguirlo. La sección de pruebas dice lo correcto ("antes de envolver `leerTarea` y `listarTrabajo` en la opción"), pero el paso dice otra cosa.
  - **C-8b:** desde que `tareas.ts` usa la opción (paso 16), `lecturas-fx-r1` › "la opción solo se puede activar…" queda en rojo hasta que el tester aplique C-8b. Ese rojo no está en la lista de rojos esperados, así que cualquier corrida que lo incluya cae en PA-05 (el precedente de FIX-CLASES fue justo esa PARADA). El plan no dice si el programador se detiene después del paso 17 o si es un rojo esperado.
- **Qué se espera:**
  - **Paso 16:** primero `leerTarea` y `listarTrabajo` funcionando **sin** la opción (con el `ejecutor` y sin `enTransaccion`, en el orden de sentencias de §D-12); después las pruebas, con su corrida en rojo por el defecto guardada; después la opción, y en verde.
  - **C-8b, una de dos, escrita en el plan:** (a) el programador se detiene al terminar el paso 17 con un resumen parcial, el tester aplica C-8b y el programador sigue en el 18; o (b) el caso de `lecturas-fx-r1` entra como rojo esperado desde el paso 16 hasta C-8b, con su título exacto.

### Lo que verifiqué y está bien
1. **Inventario de §D-12:**
   - `leerTarea` aplica: la publicación es una relación a uno obligatoria, leída en otra sentencia después de `tareas`.
   - `listarTrabajo` aplica: comprueba el cursor antes de la página, y la `tarea` es obligatoria en un elemento de tipo tarea.
   - `listarPublicaciones` ya corre en la instantánea. Lo nuevo de 01b (la relación `tarea` en el `select` de la página y la consulta de los maestros) va con `tx` dentro, sin usos nuevos de la opción.
   - Las escrituras de tareas, con la relectura `leerTarea(…, tx)`, siguen en READ COMMITTED: anidada, la opción se ignora, y la fila está recién creada o bloqueada por la propia transacción.
   - `adjuntosConfirmadosDe` es una sola sentencia. `listarComentarios` no cambia de instantánea. `listarTemas` y `listarCategorias` no tienen cursor ni relación obligatoria (un conteo que falta es `0`).
   - **No falta ninguna lectura de 01b**, y la frontera cursor→página queda cubierta en las dos únicas lecturas paginadas con el `cursor` de Prisma (`listarTrabajo` y `listarPublicaciones`; temas y categorías no paginan, S-14). Los estados vecinos de `listarTrabajo` (el tema borrado entre su comprobación y la página, el cursor movido de tema, la página frente a los adjuntos) quedan dentro de la instantánea. El de los adjuntos no tiene una prueba propia, pero es el mismo mecanismo de PR-FX-06b: no hace falta.
2. **C-8b:**
   - Los usos esperados quedan en `clases.ts:4`, `publicaciones.ts:2` y `tareas.ts:2`, con el texto literal solo en las dos llamadas, nunca en un comentario (el caso cuenta el texto del archivo).
   - Conserva todo lo que protege `lecturas-fx-r1`: ningún archivo fuera de `adapters/db` nombra la opción, `index.ts` no reexporta `enTransaccion`, los niveles de aislamiento solo viven en `cliente.ts` y la lista sigue cerrada.
   - Revisé `lecturas-fx-r2`. El caso "estático de publicaciones.ts" sigue valiendo: las dos lecturas con la opción y sin escrituras, porque los maestros se leen con Prisma y no con SQL crudo; las cuatro escrituras, sin la opción. "Ningún camino de producción les pasa un ejecutor" también sigue valiendo, porque 01b no llama a esas funciones. Y "O-4" ya está reescrito. **Nada más queda contradicho.**
3. **Las siete pruebas nuevas** (resuelto M-01):
   - PR-1B15 y PR-1B16c retienen la tabla de la relación (la lectura pasa por el padre y espera en el hijo), y PR-1B16a usa el gancho tras la comprobación del cursor. Las tres pueden fallar por el defecto sin la opción: `publicacion: null`, la página vacía y `tarea: null`.
   - PR-1B17 sin "antes" queda justificada: su control PR-1B18b corre la misma carrera anidada en READ COMMITTED y reproduce el defecto. Lo mismo PR-1B18a para PR-1B16a.
   - Cumplen "Bloqueos en las pruebas": `NOWAIT` con reintento acotado, `timeout` explícito y la formación detectada contra esa tabla con el `application_name` del archivo (`formadasEnLaTabla` es genérica). El gancho no retiene nada.
   - Una precisión: si el adaptador de `listarPublicaciones` lanza en lugar de devolver `tarea: null`, la expectativa del control PR-1B18b ("devuelve la tarea sin resumen") debe aceptar también el rechazo. Que el arquitecto la deje así, o que el programador lo reporte (no bloquea).
4. **R-06 y mi recomendación:** **diferir la decisión a 01e es aceptable y no cambia el diseño de 01b.**
   - Cada `GET …/trabajo` en instantánea ocupa una conexión unos milisegundos (4 sentencias por índice, más `BEGIN`, `SET` y `COMMIT`). Con 31 peticiones de una sola vista y 10 conexiones, la cola se vacía muy por debajo del `maxWait` de 2 s. El `503` solo aparece si el pool ya está saturado por la carga global, y entonces aparecería igual sin la instantánea.
   - Las salidas posibles son del frontend: una primera página corta por tema (5 en lugar de 20, N-01 de la revisión del plan) y pedir las secciones al hacerse visibles o en tandas de hasta 6. El contrato de 01b no cambia.
   - **Recomendación para 01e**, que el arquitecto la fije en su plan: primera página de 5 por tema y como máximo 6 peticiones de "Trabajo de clase" en vuelo a la vez. Una lectura agregada en el backend sería otro encargo, solo si las mediciones lo piden.
5. **R-17** es correcta: `shared/dist` no se versiona y, después del merge, `global-setup` fallaba. `cd shared; npm run build` como precondición de toda corrida del backend sobre `<M1>`, más la nota en ESTADO §5, basta. La tomo como mía: la corro antes de cada corrida del backend de 01b.
6. **Pasos, PARADAS y commit:** con M-01 y M-02 resueltos, los pasos 12 a 20 son ejecutables por `sonnet`. PA-21 y V-04 (con el conteo de usos) cubren los riesgos de la enmienda, y el commit `<K1b>` sigue siendo uno solo.

### Detalles menores
- El encabezado "### 01b (base `<K1a>`)" de los pasos debería decir `<M1>`, como fija `aprobacion.md` (la base de 01b dentro de los paquetes es el merge).

## Revisión de las correcciones de la Enmienda 2 — TAREAS-01b
Veredicto: **APROBADO**. El programador puede arrancar 01b. Sin M-nn.
Verificación propia: no aplica: revisión de plan. `plan.md`: 780 líneas, SHA-256 `3dac8fc1bca023d0bf63aaba70dde6beeb521ec83c48313e271b288c314724e9`. Contrasté cada punto con su sección, no con el índice.

- **M-01, resuelto.** El párrafo "Ayuda de la tabla retenida" (líneas 433 a 441) generaliza `leerConLaClaseBorradaEnMedio` en el mismo archivo, sin cambiar su nombre ni las llamadas de PR-FX-02 a PR-FX-05:
  - **Tablas:** dos ramas literales nuevas (`LOCK TABLE publicaciones … NOWAIT` y `LOCK TABLE tareas … NOWAIT`); el nombre de la tabla nunca se interpola.
  - **Borrado:** un `borrar?: (tx) => Promise<void>` opcional que reemplaza el borrado de la clase solo cuando viene, y que corre **dentro de la transacción retenedora**.
  - **Lo demás no cambia:** el reintento, el presupuesto, la detección con `formadasEnLaTabla`, el `timeout` y el `maxWait`.
  - **Cumple "Bloqueos en las pruebas":** el `NOWAIT` y el reintento acotado siguen iguales, la acción queda dentro del `timeout` explícito de la retenedora (15 s, mayor que su espera de 4 s), y la formación se sigue detectando contra esa tabla con el `application_name` del archivo.
  - **Con qué se borra cada cosa:**
    - con la tabla retenida, `tx.publicacion.deleteMany({ where: { id, tipo: "tarea" } })` con `count` 1, con la cascada a la tarea y sus criterios y las tareas sembradas sin adjuntos (la FK de `archivos` es `NO ACTION`);
    - con el gancho, `borrarPublicacion` real solo para materiales, `borrarTarea` real con actor admin y `alBorrar` vacío para una tarea, y `moverATema` real.
  - **No hay bloqueo mutuo:** repasé PR-1B15 (retiene `publicaciones`; la lectura entra por `tareas`) y PR-1B16c y PR-1B17 (retienen `tareas`; la lectura entra por `publicaciones`). En cada caso la retenedora borra en la tabla que ella misma retiene, y la cascada sobre la otra tabla pide `ROW EXCLUSIVE`, compatible con el `ACCESS SHARE` de la lectura que espera. La lectura no toma bloqueos de fila.
  - **Lista cerrada de 01b (línea 482):** coherente. Permite el `describe` nuevo y exactamente esa generalización, y declara que los casos existentes no cambian.
- **M-02, resuelto.**
  - **Paso 16 (líneas 627 a 636), en este orden:** (a) `tareas.ts` completo, con `leerTarea` y `listarTrabajo` funcionando **sin** la opción; (b) la ayuda y las siete pruebas, con PR-1B15, PR-1B16a y PR-1B16c en rojo por el defecto y la salida guardada (un rojo por otra causa es PA-21); (c) la opción en los dos usos; (d) verde.
  - **PR-1B16b en verde desde (b) es correcto:** si la fila del cursor sigue existiendo en otro tema, el cursor de Prisma la encuentra y la página no queda vacía. Es una guarda de regresión, no la evidencia del defecto. Esa evidencia la dan PR-1B16a y su control PR-1B18a.
  - **"Rojo esperado 5"** (línea 638): el título exacto del caso de `lecturas-fx-r1`, esperado **solo** si la diferencia es `adapters/db/tareas.ts:2` (cualquier otra es PA-05). El programador no se detiene: lo declara con la salida del `expect`. El tester aplica C-8b al empezar su ronda 1. Está alineado en §D-R0 (fila C-8b, línea 278), en el índice de la Enmienda 2 y en "Rojo antes del remedio".
- **Precisión de PR-1B18b, resuelta:** acepta `tarea: null` o el rechazo de la lectura, y rechaza la tarea con su resumen.
- **Detalle, resuelto:** el encabezado de los pasos dice "01b (base `<M1>` = `07e4ab7`…)".
- **R-06:** queda escrita mi recomendación para 01e (primera página de 5 por tema y como máximo 6 peticiones en vuelo, solo en el frontend; el contrato de 01b no cambia).

En mis verificaciones de 01b aceptaré el rojo esperado 5 solo con la diferencia exacta `adapters/db/tareas.ts:2`, y antes de cada corrida del backend correré `cd shared; npm run build` (R-17).

## Verificación del resumen — TAREAS-01b — implementación
Veredicto: **resumen ACEPTADO**. El tester puede atacar la ronda 1 de 01b.
Corrida propia del 2026-10-06, una suite a la vez, en `feat/tareas` con base `<M1>` = `07e4ab7`. PA-01: red `IZZI-F281-5G` (de confianza permanente), regla del firewall habilitada (Inbound, Block, Public). R-17: corrí `cd shared; npm run build` antes del backend.

| Comprobación | Resumen del programador | Corrida del manager |
|---|---|---|
| `cd shared; npm run build` y `npm run lint` | código 0; "All matched files use Prettier code style!" | código 0; igual |
| `cd backend; npm run lint` | código 0 | código 0 |
| `cd backend; npm test` | `169 passed (169)` · `2123 passed (2123)` | `169 passed (169)` · `2123 passed (2123)` (100.94 s) |
| `cd backend; npx vitest list` | 2123 casos, 169 archivos, 113 con `PR-1B` | 2123, 169 y 113. Por viñeta: 1B01 5, 1B02 6, 1B03 10, 1B04 3, 1B05 4, 1B06 15, 1B07 10, 1B08 10, 1B09 8, 1B10 4, 1B11 9, 1B12 6, 1B13 4 (por el nombre de su `describe`, con los cuatro títulos exactos del plan), 1B14 12, y uno cada una de PR-1B15 a PR-1B18b |
| `npm run build` (raíz) | código 0; `✓ built in 802ms` | código 0; `✓ built in 661ms` |
| `npm run lint` (raíz) y `cd frontend; npm run lint` | código 0; `> tsc -b` | código 0 |
| `cd frontend; npm test` | `127 passed (127)` · `1852 passed (1852)` | igual |

- **Títulos:** los 77 títulos que el resumen cita entre comillas existen literalmente en `vitest list`, incluidos los cuatro de PR-1B13 de la Enmienda 1 y los siete de PR-1B15 a PR-1B18b. También existe el título nuevo de E6 (I-2). Cada viñeta de PR-1B01 a PR-1B18b tiene su caso.
- **PA-07**, sin excepción para `GET /api/admin/clases`:
  - `40P01`, `deadlock detected`, `could not serialize`, `too many clients`, `Unable to start a transaction`, `too_small` y `timed out`: 0 cada uno.
  - `"Error no controlado"`: 10, exactamente I-1.
  - `"code":"P2028"`: 5, los permitidos, con control positivo.
  - `nombres-tokens-r2` pasó, así que su excepción arbitrada no hizo falta. **Limpia.**
- **V-01:** las 147 `*.ataque` coinciden con la tabla unificada de la complementaria (C-2 de 01b y C-8b), con `diff` vacío. El programador no tocó ninguna.
- **V-03:** `backend/prisma` no cambió respecto de `07e4ab7`.
- **V-04:**
  - `instantaneaUnica: true` aparece exactamente en `clases.ts` (4), `publicaciones.ts` (2) y `tareas.ts` (2), las dos en código, en `leerTarea` y `listarTrabajo`.
  - `tipo: "tarea"` solo aparece en `adapters/db/tareas.ts` (la escritura de la línea 281 y dos filtros de borrado).
  - `trabajoId` o `trabajo_id` en `shared/src`: 0. `$queryRawUnsafe`: solo en `cliente.ts`.
- **V-05**, respecto de `07e4ab7`:
  - Intactos: `prisma/**`, `middleware/**`, `adapters/db/{temas,categorias,referencias,bloqueo-clase,maestros-de-clase,cliente,clases}.ts`, `adapters/{auth,notifier,storage}`, `config/`, `core/{clases,archivos,auth}`, los `package.json`, `package-lock.json` e `infra/`. En `workers/` solo cambia `README.md` (permitido).
  - Frontend: solo cambian los seis dobles normales, que agregan `tarea: null` y un comentario, sin tocar ninguna aserción.
  - Las pruebas existentes del backend que cambian son las de la lista cerrada, y solo se extienden: en `lecturas-consistentes`, las únicas líneas quitadas son las de la generalización autorizada de la ayuda (el tipo de `tabla` y el borrado de la clase, que pasa a ser el valor por defecto).
- **V-06:** las cinco rutas de `handlers/tareas/tareas.ts` usan `protegido()` con `roles` explícitos y su sexto paso:
  - `POST`, `PUT` y `DELETE`: `maestro` y `admin`, con `propiedad`;
  - los dos `GET`: los tres roles, con `inscripcion`.

  `sesiones-y-cadena` pasa con sus 79 rutas.

**Reglas que no se rompen en lo nuevo, contrastadas con el código:**
- **Crear:** `crearTarea` encola `TAREA_CREADA` y, si corresponde, `RECORDATORIO_24H` dentro de su transacción (`alGuardar(ejecutorSqlDe(tx))`), después de confirmar los adjuntos y antes de releer.
- **Editar:** bloquea la tarea con `FOR NO KEY UPDATE OF t`, aplica la autoría en `core` (`puedeEditarTarea`, con P-04 b) y valida la fecha. Con `planDeRecordatorio` guarda el `trabajo_id`, y `alReprogramar` cancela el recordatorio viejo y encola el nuevo con un id nuevo, en la misma transacción.
- **Borrar:** `FOR UPDATE OF t`, `puedeBorrarTarea`, los adjuntos pasan a `descartado`, borra la publicación y `alBorrar` cancela los dos trabajos dentro de la transacción.
- **Lo demás:**
  - ningún handler crea avisos ni llama a `notifier`;
  - `puedeEditar` y `puedeBorrar` se calculan por elemento en `leerTarea` y en el muro, este último con los maestros leídos con `tx` y solo si la página trae una tarea;
  - el detalle no lleva `estadoPago`, rol, correos ni `trabajo_id` (PR-1B14);
  - `borrarPublicacion`, `listarComentarios` y `crearComentario` filtran `tipo IN ('anuncio', 'material')` (§D-6).

### Arbitraje
- **PR-1B16b: su rojo antes de la opción es el mismo defecto, y no tratarlo como PA-21 fue correcto.**
  - **Me equivoqué al aprobar las correcciones de la Enmienda 2:** escribí que PR-1B16b "en verde desde (b) es correcto". La fila del cursor movida de tema sigue existiendo, pero el `cursor` de Prisma con `skip: 1` da por hecho que la primera fila del resultado es la del cursor. Como esa fila ya no cumple el filtro del tema, `skip: 1` se salta un elemento legítimo (falta `m3`).
  - Es la misma frontera cursor→página, con otro síntoma: un elemento de menos en lugar de una página vacía. La instantánea la corrige, porque en ella la fila del cursor sigue en el tema.
  - PA-21 cubre un rojo "por otra causa" (que la función no exista, un tipo o un error de la ayuda), y este rojo es por el defecto. El programador lo reportó con su salida exacta.
  - **Basta este arbitraje.** Para que el plan no siga diciendo lo contrario, sugiero que el arquitecto agregue una línea en el paso 16 (b) la próxima vez que toque el plan (PR-1B16b también en rojo por el defecto), sin enmienda propia.
  - **Hermanos de este síntoma:** solo pasa cuando la fila del cursor puede salir del filtro de la lista entre la comprobación y la página. Eso solo ocurre en `listarTrabajo` (por `tema_id`, también en "Sin tema"), que ya está en la instantánea. En las demás listas con cursor, el filtro es inmutable para la fila (`clase_id`, `publicacion_id`, `maestro_id` o `usuario_id`).
- **Las siete decisiones donde el plan calla:**
  1. **PR-1B16b:** se acepta (arriba).
  2. **El paso 15 verificado después de 16(a):** se acepta. El plan ponía el `publicacionSchema` con `tarea` obligatoria (paso 12) antes del mapeo del muro, y adelantar `tareaParaResponder` y correr la suite del muro justo después es lo correcto.
  3. **`archivoIds` de `crearTareaSchema` en minúsculas:** se acepta. Sin eso, conservar un adjunto escrito en mayúsculas al editar no se reconocería en `idsActuales` y se trataría como nuevo (un `400`). Sigue el criterio de ids en minúsculas de TAREAS (T-01 y T-04), y `archivoIdsSchema` del muro no cambia.
  4. **`leerTareaCon` y `listarTrabajoCon` internas:** se acepta. Las sentencias quedan con `db`/`tx`, y la opción es un cambio de una línea por función.
  5. **`puedeMover` en el handler con `puedeMoverElemento(relacion)` de `core`:** se acepta. La decisión vive en `core` y la relación sale del sexto paso: no es una verificación a mano.
  6. **Retirar el comentario con "REPEATABLE READ" de `tareas.ts`:** se acepta (el nivel solo vive en `cliente.ts`).
  7. **Ayudas nuevas en `ayudas-tareas.ts`:** se acepta (la lista cerrada permite agregar).

### Detalles menores (no bloquean)
- `leerTarea` y `listarTrabajo` usan `titulo: publicacion.titulo ?? ""`. Para una tarea, el `CHECK` garantiza el título, así que no se alcanza, pero es un valor por defecto silencioso. Si algún día se alcanzara, sería mejor fallar que devolver un título vacío. Carril trivial cuando se toque el archivo.

**Para ESTADO §3** (lo aplica el orquestador): el consumidor de `TAREA_CREADA` y `RECORDATORIO_24H` (NOTIFICACIONES, §D-5), tal como lo declara el programador.

Sin M-nn.

## Revisión final — TAREAS-01b
Veredicto: **APROBADO CON OBSERVACIONES**. Nada bloquea: 01b se puede cerrar con el commit `<K1b>`. Las observaciones son pendientes con destino y un detalle de carril trivial.
Verificación propia del 2026-10-06, una suite a la vez, en `feat/tareas` con base `<M1>` = `07e4ab7`. PA-01: red `IZZI-F281-5G`, regla del firewall habilitada (Block, Public).
- **Shared** (R-17, antes del backend): `npm run build` y `npm run lint`, código 0.
- **Backend:** `npm run lint` código 0. `npm test` código 0: `Test Files 172 passed (172)` · `Tests 2159 passed (2159)` (103.95 s), lo esperado.
- **Raíz:** `npm run build` (`✓ built in 653ms`) y `npm run lint`, código 0.
- **Frontend:** `npm run lint` código 0; `npm test` `127 passed (127)` · `1852 passed (1852)`, lo esperado.
- **Prisma:** `npx prisma validate`, válido; `backend/prisma` sin cambios respecto de `07e4ab7` (V-03).
- **Archivos protegidos fuera de los paquetes,** contra los hashes de `aprobacion.md`: ESSENTIALS `00209816…c2aef`, `ARCHITECTURE.md` `88a01a2e…26da` y `PRD.md` `8f7cf71a…f5f5`.

### 1. Lo planeado, solo lo planeado y todo lo planeado
`git diff 07e4ab7 --stat`: 54 archivos versionados (2624 inserciones, 122 borrados), más los nuevos. Contra el plan con las Enmiendas 1 y 2:
- **`shared/` (A-11):** `tipoDeElementoDelMuroSchema`, `resumenDeTareaSchema` y `publicacionSchema` con `tarea` obligatoria (§D-6); los esquemas de tareas y de "Trabajo de clase" en `tareas.ts`, con `archivoIds` en minúsculas (decisión 3 aceptada); y reexportaciones nuevas en `index.ts`, sin quitar ninguna.
- **`core/`:** `puedeEditarTarea` y `puedeBorrarTarea` en `autoria.ts` (P-04 b, S-09); `tareas.ts`, `recordatorio.ts` y `texto.ts`; las dos colas y sus esquemas en `eventos/avisos-de-clase.ts`.
- **`adapters/` (A-4):** `queue` con `encolar(…, { inicio })` y `cancelar(…, { sql })`, y las dos colas con la política de los avisos. `db/tareas.ts` (§D-4, §D-6, §D-7 y §D-12). `db/publicaciones.ts` con el resumen de la tarea, `puedeBorrarTarea` y los maestros con `tx` dentro de la instantánea, y el muro y los comentarios limitados a anuncios y materiales.
- **`handlers/`:**
  - `adjuntos.ts` (A-6): comparé las dos funciones contra las de `muro.ts` en `07e4ab7`, sin comentarios ni espacios, y son **idénticas**.
  - `tareas/tareas.ts`: las cinco rutas.
  - `muro.ts`: importa de `adjuntos.ts` y mapea `tarea` a ISO.
  - `app.ts`: registra `tareasHandler` (A-10).
- **README del programador:** `adapters`, `handlers` y `workers` (A-8).
- **Pruebas:** las de "Pruebas requeridas" y las de la lista cerrada de 01b. `lecturas-consistentes` solo cambia en la generalización autorizada de la ayuda (M-01).
- **Frontend:** solo dobles `tarea: null` con su comentario, en 6 pruebas normales y en 16 `*.ataque` (C-5 del tester). Ninguna aserción ni archivo de producción cambia.
- **Lo arbitrado** (las siete decisiones de la verificación) cuenta como planeado. **Nada fuera de 01b ni de más, y nada de 01b faltó.**

### 2 y 3. PA-07 y V-01
- **PA-07**, sin excepción para `GET /api/admin/clases`:
  - `40P01`, `deadlock detected`, `could not serialize`, `too many clients`, `Unable to start a transaction`, `too_small` y `timed out`: 0 cada uno.
  - `"Error no controlado"`: 10, exactamente I-1.
  - `"code":"P2028"`: 5, los permitidos, con control positivo.
  - `nombres-tokens-r2` pasó. **Limpia.**
- **V-01:** las 150 `*.ataque` coinciden con la tabla del cierre de PA-09 (`diff` vacío).
  - `git diff 07e4ab7 --name-only` sobre `*.ataque` da 21 archivos, todos del tester: los 16 del frontend por C-5, más `temas-01a-r1`, `temas-01a-r3`, `lecturas-fx-r2`, `sesiones-y-cadena` y `lecturas-fx-r1`.
  - Las nuevas son `tareas-01b-r1`, `instantanea-01b-r1` y `referencias-01b-r1`.
  - No hay borradas ni casos saltados.
  - **El programador no tocó ninguna `*.ataque`.**

### 4. Definición de terminado (`AGENTS.md`), para 01b
- **Cumple los RF y RN:**
  - RF-34: crear y editar con título, instrucciones, adjuntos, fecha, puntos, categoría y rúbrica propia.
  - RF-44: solo guardar y mostrar `aceptaTardias`.
  - RF-12, en su parte de tareas: la tarea en el muro y sin comentarios (S-08).
  - RF-13, en su parte backend: el detalle con rúbrica de solo lectura.
  - RN-07 aplicada a tareas, con P-02 (b) y P-04 (b).
  - RN-06, con el sexto paso.
- **Capas y middleware:** `core` puro, Prisma solo en `adapters/db`, handlers sin SQL ni verificaciones a mano, y las cinco rutas con `protegido()`, `roles` explícitos y el sexto paso. `middleware/` sin cambios.
- **`lint`, `build` y `test`:** en verde (corrida propia).
- **Pruebas de autorización:** las cinco rutas en PR-1B14 (12 casos), con la matriz de autoría contra la API en PR-1B09 y en `tareas-01b-r1` del tester.
- **Migración:** no hay en 01b (V-03).
- **`infra/` y `.env.example`:** sin cambios y sin necesidad de tocarlos.
- **Documentos:** los README están al día. Los textos de "Al cerrar 01b" los aplica el orquestador (punto 7).

### 5. Reglas que no se rompen y estilo
- **Cola en la misma transacción:** `crearTarea` encola `TAREA_CREADA` y `RECORDATORIO_24H` con el `EjecutorSql` de su transacción.
- **Trabajos diferidos sincronizados:** editar cancela y recrea el recordatorio con un id nuevo y guarda `trabajo_id`; borrar cancela los dos, todo en la transacción, con la fila de la tarea bloqueada. Lo prueban PR-1B08, PR-1B10, PR-1B12, PR-1B13 y `cola.integracion` (la cancelación revertida queda en `created`).
- **Sin avisos en la petición:** los handlers no llaman a `notifier`.
- **Archivos:** los adjuntos se confirman dentro de la transacción y los que salen pasan a `descartado`; el flujo prefirmado no cambia.
- **UTC:** fechas en ISO en las respuestas y `timestamptz`.
- **Estado de pago:** ninguna respuesta nueva lo lleva (PR-1B14 lo busca en cualquier profundidad).
- **Consultas sanas:** cada consulta por índice; `GET …/trabajo` paginado por cursor; sin consultas en ciclos (los maestros, en una consulta y solo si hay tareas); el SQL crudo nuevo es etiquetado.
- **Instantánea única:** `leerTarea` y `listarTrabajo` con la opción; `listarPublicaciones` con todo lo nuevo dentro de la que ya tenía; las escrituras en READ COMMITTED.
- **Estilo (`CLAUDE.md`):** retornos tempranos, `AppError` tipados, comentarios del porqué y ningún `console.`.

### 6. Observaciones con destino
- **`titulo: publicacion.titulo ?? ""`** en `leerTarea` y `listarTrabajo` (inalcanzable por el `CHECK`, pero es un valor por defecto silencioso): carril trivial, la próxima vez que se toque `adapters/db/tareas.ts`.
- **El consumidor de `TAREA_CREADA` y `RECORDATORIO_24H`:** NOTIFICACIONES (§D-5). Carga la tarea por id y termina sin avisar si ya no existe; el de `RECORDATORIO_24H`, además, si `tareas.trabajo_id` ya no es el id del trabajo.
- **O-02 de 01a** (sin FK compuesta que obligue a que tema y categoría sean de la misma clase): vigilada en 01b. Toda referencia pasa por `bloquearTemaParaUsar` o `bloquearCategoriaParaUsar` con `clase_id`, y el tester lo atacó en `referencias-01b-r1` sin hallazgo. Sigue cubierta por la aplicación, y queda como nota sin acción.
- **O-03 de 01a** (una tarea en el muro daba `500`): cerrada por C-5 y el mapeo de `tarea`.
- **PR-1B16b** (el plan esperaba su verde antes de la opción): arbitrado en la verificación. Es el mismo defecto (`skip: 1` con el cursor movido de tema); que el arquitecto corrija la línea del paso 16 (b) la próxima vez que toque el plan.
- **R-06** queda diferido a 01e, con la recomendación ya escrita en el plan.

### 7. Documentos
**Textos que el orquestador aplica con A-9 al cerrar 01b:** los de `plan.md`, "Documentos a actualizar" → "**Al cerrar 01b**" (líneas 565 a 582 del plan vigente), tal cual:
- **ESSENTIALS:**
  - viñeta "Autoría": "(regla general; hoy publicaciones y comentarios, en TAREAS también las tareas)" pasa a "(regla general: publicaciones, comentarios y tareas)", y se agrega al final la oración de P-04 que empieza "En las tareas, cada autor edita y borra la suya…" y termina "…devuelven `puedeEditar` y `puedeBorrar`.";
  - "Restricciones clave": "· una tarea es una publicación de tipo `tarea` con su fila 1:1 en `tareas` (mismo id; TAREAS-01)";
  - "Archivos": "Materiales, anuncios y adjuntos de tareas: solo los sube…" y "5 por publicación o tarea".
- **`docs/PRD.md`, RN-07:** "En las tareas, un maestro de la clase edita y borra también las de un maestro que ya no da la clase (TAREAS-01)."
- **`ARCHITECTURE.md`:**
  - §7: la fila `tareas`, segunda parte ("`POST /clases/{claseId}/tareas` · `GET/PUT/DELETE /clases/{claseId}/tareas/{tareaId}` · `GET /clases/{claseId}/trabajo?tema=` … Todo cuelga de `/clases/{claseId}` para pasar por el sexto paso (TAREAS-01)"), y la fila `archivos`;
  - §8: al final de la última viñeta;
  - §10: la fila `RECORDATORIO_24H` y, por S-15, después de "Trabajos diferidos de pg-boss (`startAfter`).", la oración "Viven en `adapters/queue` (`encolar` con `inicio` y `cancelar`, dentro de la transacción del dato; TAREAS-01).";
  - §11: punto 6;
  - §14: diagrama `publicaciones ||--o| tareas : es` y las filas `publicaciones`, `tareas`, `criterios_rubrica` y `archivos`.
- **`CLAUDE.md`, "Backend (`backend/src/`)", por S-15:** la línea de `adapters/` pasa a "adapters/    db (Prisma), auth, storage (R2 / MinIO), notifier (canales in-app y correo con Resend), queue (pg-boss: cola y trabajos diferidos), live (LiveKit)".
- **ESTADO §5:** "`shared/dist` no se versiona: después de un merge o un cambio de rama que toca `shared/src`, `cd shared; npm run build` antes de correr el backend (R-17 de TAREAS-01)".
- **No van:** la viñeta de ESSENTIALS "Capas del backend" por S-15 ya está aplicada (hash `00209816…`). Por la Enmienda 2, ESSENTIALS y `ARCHITECTURE.md` no cambian.

**README del programador:**
- `adapters/README.md`: describe `db/tareas.ts`, los trabajos diferidos en `queue` (S-15), la cancelación revertida, los bloqueos de §D-7 y las lecturas en instantánea única con sus usos (4, 2 y 2). La línea "Módulos" ya dice "`queue` (cola y trabajos diferidos de pg-boss, con su única instancia; no hay un módulo `scheduler` aparte, TAREAS-01)". La sección de `db/categorias.ts` (01a) sigue diciendo que las nuevas se crean "con `creado_en` distinto por posición", que era lo que pedí.
- `handlers/README.md`: las cinco rutas de `tareas/tareas.ts`.
- `workers/README.md`: las dos colas sin consumidor.

Describen lo que hay.

**Filas para ESTADO §3:**
- el consumidor de `TAREA_CREADA` y `RECORDATORIO_24H` (NOTIFICACIONES);
- `titulo ?? ""` en `adapters/db/tareas.ts` (carril trivial);
- la línea de PR-1B16b del paso 16 (b) (arquitecto, sin urgencia);
- R-04 para DEPLOY: con filas de tipo `tarea`, volver atrás el backend exige borrarlas antes (si no estaba ya);
- de §D-5 y del plan: los ids de criterios al editar la rúbrica (CALIFICACIONES restringe la edición cuando haya calificaciones) y la regla de P-01 para el cálculo (CALIFICACIONES).

### 8. Medición del programador
- **01b:**
  - rondas del tester: 1 (RESISTE);
  - rondas extra por hermanos: 0;
  - resúmenes devueltos: 0 de 1;
  - PARADAS: 1, correcta (PA-05 en el paso 17 por el caso de rutas de `sesiones-y-cadena`, al que le faltaba C-2 en la ronda 0; resuelta con la complementaria del tester).
- **Acumulado de TAREAS-01 (01a y 01b):** 1 ronda extra por hermanos (T-02 → T-05 en 01a). El umbral de 2 no se alcanzó: sigue en `sonnet`.

### 9. Para el humano
- **La Enmienda 2** (las lecturas de tareas en instantánea única) se aplicó sin su firma: aplica una regla de ESSENTIALS que usted ya aprobó en FIX-CLASES (A-1 y A-2), no cambia el alcance de 01b y no abre archivos protegidos. Trajo siete pruebas más y dos usos de la opción en `tareas.ts`.
- **R-06, diferido a 01e:** "Trabajo de clase" pide una lectura por tema (hasta 31). Con la instantánea, cada una ocupa una conexión unos milisegundos. Mi recomendación, ya escrita en el plan para 01e y solo en el frontend: primera página de 5 elementos por tema y como máximo 6 peticiones en vuelo. Una lectura agregada en el backend sería otro encargo, solo si las mediciones lo piden.
- **Sin decisiones pendientes** para cerrar 01b.

**Mensaje del commit propuesto:**
```
feat(tareas): TAREAS-01b, tareas con rúbrica, adjuntos, categoría, tema y entregas tardías (rutas /api/clases/:claseId/tareas y /trabajo), TAREA_CREADA y RECORDATORIO_24H en la transacción del dato y lecturas de tareas en una sola instantánea
```
(más las líneas de atribución que correspondan).

**Rutas para `git add`** (todas las que hoy muestra `git status`, más los documentos que el orquestador aplique con A-9):
```
shared/src/clases.ts shared/src/index.ts shared/src/tareas.ts
backend/src/app.ts backend/src/adapters/README.md backend/src/adapters/db/index.ts backend/src/adapters/db/publicaciones.ts backend/src/adapters/db/tareas.ts backend/src/adapters/queue/colas.ts backend/src/adapters/queue/index.ts
backend/src/core/autoria.ts backend/src/core/autoria.test.ts backend/src/core/eventos/avisos-de-clase.ts backend/src/core/tareas/recordatorio.ts backend/src/core/tareas/recordatorio.test.ts backend/src/core/tareas/tareas.ts backend/src/core/tareas/tareas.test.ts backend/src/core/tareas/texto.ts backend/src/core/tareas/texto.test.ts
backend/src/handlers/README.md backend/src/handlers/adjuntos.ts backend/src/handlers/clases/muro.ts backend/src/handlers/tareas/tareas.ts backend/src/workers/README.md
backend/test/ayudas-tareas.ts backend/test/bloqueo-usuario.integracion.test.ts backend/test/cola.integracion.test.ts backend/test/esquemas-tareas.test.ts backend/test/lecturas-consistentes.integracion.test.ts backend/test/tareas.integracion.test.ts backend/test/tareas-autoria.integracion.test.ts backend/test/tareas-autorizacion.integracion.test.ts backend/test/tareas-concurrencia.integracion.test.ts backend/test/trabajo.integracion.test.ts
backend/test/instantanea-01b-r1.ataque.test.ts backend/test/referencias-01b-r1.ataque.test.ts backend/test/tareas-01b-r1.ataque.test.ts backend/test/lecturas-fx-r1.ataque.test.ts backend/test/lecturas-fx-r2.ataque.test.ts backend/test/sesiones-y-cadena.ataque.test.ts backend/test/temas-01a-r1.ataque.test.ts backend/test/temas-01a-r3.ataque.test.ts
frontend/src/app/marco.test.tsx frontend/src/app/muro-recuperar-c-r3.ataque.test.tsx frontend/src/app/muro-recuperar-c-r4.ataque.test.tsx
frontend/src/features/clases/adjuntos-de-publicacion.test.tsx frontend/src/features/clases/formulario-publicacion.test.tsx frontend/src/features/clases/lib.test.ts frontend/src/features/clases/muro-view.test.tsx frontend/src/features/clases/publicacion-del-muro.test.tsx
frontend/src/features/clases/archivos-d-r1.ataque.test.tsx frontend/src/features/clases/archivos-d-r2.ataque.test.tsx frontend/src/features/clases/archivos-d-r3.ataque.test.tsx frontend/src/features/clases/cargar-mas-02c-r2.ataque.test.tsx frontend/src/features/clases/foco-02c-r3.ataque.test.tsx frontend/src/features/clases/foco-02c-r4.ataque.test.tsx frontend/src/features/clases/foco-02c-r5.ataque.test.tsx frontend/src/features/clases/heredados-02d-r1.ataque.test.tsx frontend/src/features/clases/muro-02c-r1.ataque.test.tsx frontend/src/features/clases/muro-c-r1.ataque.test.tsx frontend/src/features/clases/muro-c-r2.ataque.test.tsx frontend/src/features/clases/muro-c-r3.ataque.test.tsx frontend/src/features/clases/segmentado-02d-r1.ataque.test.tsx frontend/src/features/clases/ventana-02c-r2.ataque.test.tsx
docs/trabajo/TAREAS-01-tareas-temas-y-categorias/
docs/ESTADO.md docs/ARCHITECTURE-ESSENTIALS.md docs/ARCHITECTURE.md docs/PRD.md CLAUDE.md
```
`ARCHITECTURE-ESSENTIALS.md` ya trae el ajuste de `claveDeNombre`, que entra en este commit. Esa línea y la de `ARCHITECTURE.md`, `PRD.md` y `CLAUDE.md` van después de que el orquestador aplique los textos de A-9. El SHA-256 resultante de cada uno se anota en `aprobacion.md`.

### Problemas que bloquean
Ninguno.

## Verificación del resumen — TAREAS-01c — implementación
Veredicto: **resumen DEVUELTO** al programador, por **M-01** (un hueco del movimiento que 01d necesita). Las cifras, la ausencia de cambios de comportamiento, V-01 y la Enmienda 3 están bien. La corrección es pequeña y sigue siendo solo refactor.
Corrida propia del 2026-10-06, una suite a la vez, en `feat/tareas` con base `<K1b>` = `ebfe126`. El backend no se corre en 01c.

| Comprobación | Resumen del programador | Corrida del manager |
|---|---|---|
| `cd frontend; npm run lint` | código 0; `> tsc -b` | código 0 |
| `cd frontend; npm test` | `128 passed (128)` · `1864 passed (1864)` | `128 passed (128)` · `1864 passed (1864)` |
| `cd frontend; npm run build` | código 0; `✓ built in 661ms` | código 0; `✓ built in 672ms` |
| `npm run build` y `npm run lint` (raíz) | código 0 | código 0 |
| `cd frontend; npx vitest list` | 1864 (antes, 1852) | 1864 casos (las dos líneas de más de la salida son títulos con un salto de línea), 12 de `reexportaciones-01c.test.ts`; la ronda 0 de 01c registró 127 / 1852 antes. **PR-1C01: +1 archivo y +12 casos, exactamente ese** |

- **PR-1C02:** los 12 títulos citados existen literalmente.
- **Sin cambio de comportamiento:**
  - Los componentes movidos difieren de su original en `ebfe126` solo en las rutas de importación, en el texto leído de `components/clase/data.ts` y, en `AdjuntosDePublicacion`, en la prop `mensajeDeError`, que el envoltorio rellena con `mensajeDeErrorClases`.
  - `TEXTOS_ADJUNTOS` y los dos hooks son idénticos a su origen.
  - `CAPACIDADES_POR_PERSPECTIVA` lee las mismas bases.
  - No cambia ningún texto, petición, foco ni aserción, y la suite completa sigue en verde.
- **Lo compartido no importa de `features/`:** `grep 'from "@/features/'` en `components/`, `lib/` y `services/` da 0. Cada origen queda como reexportación de una línea, o como el envoltorio que pide §D-9.
- **"No se toca":** no se borró nada (los cuatro `git mv` dejan el origen recreado). Siguen intactos `app/router.tsx`, `components/ui` y `layout`, los servicios protegidos, `features/auth`, `admin` y `diagnostico`, `styles` y los `lib/` protegidos, los `package.json` y todo `backend/`, `shared/` e `infra/`.
- **V-01:** las 150 `*.ataque` coinciden con la tabla de la complementaria (O-07, Enmienda 3). Las únicas `*.ataque` cambiadas respecto de `ebfe126` son las dos del tester (`estatico-02c-r1` y `clases-r1`).
- **Enmienda 3 en el código:** `components/clase/data.ts` importa `FIRMA_ADMINISTRACION` de `@campus/shared` en una sola línea y define `TEXTOS_DE_LA_CLASE = { sinAcceso, firmaAdministracion }`. `firma-del-autor.tsx` lee `TEXTOS_DE_LA_CLASE.firmaAdministracion`. `features/clases/data.ts` ya no tiene ni la clave ni el `import`. El texto en pantalla es el mismo valor.

### Problemas que bloquean

#### M-01 — Los mensajes de error de archivos se quedaron en `features/clases`, y 01d no podrá usarlos sin duplicarlos
- **Dónde:** §D-9, fila "`TEXTOS_ADJUNTOS`, `ACCEPT_DE_ADJUNTOS`, `MARGEN_DE_VISTA_PREVIA_MS` y los mensajes de error de archivos" → `components/adjuntos/data.ts`. Hoy siguen en `features/clases/data.ts:215-218` (`MENSAJES_ERROR_CLASES_GENERALES`, bloque "§D-D6: errores de los archivos adjuntos": `archivoNoSubido`, `archivoInvalido` y `almacenNoDisponible`) y en `features/clases/lib.ts:116-119` (la parte del mapa por código de `ARCHIVO_NO_SUBIDO`, `ARCHIVO_INVALIDO`, `ALMACEN_NO_CONFIGURADO` y `ALMACEN_NO_DISPONIBLE`).
- **Por qué importa:**
  - **La lectura del plan:** "los mensajes de error de archivos" no puede ser la parte `error*` de `TEXTOS_ADJUNTOS`, porque esa ya se mueve con `TEXTOS_ADJUNTOS`, que la fila nombra aparte. Son los mensajes de los códigos de error de archivos.
  - **01d los necesita:** el formulario de tarea sube adjuntos y recibe esos mismos códigos (`POST …/archivos` y `crearTarea`/`editarTarea` con `ARCHIVO_INVALIDO`), y `mensajeDeErrorTareas` tiene que traducirlos. Sin el movimiento, 01d tendría que copiarlos ("no dupliques datos entre módulos", `CLAUDE.md`) o importarlos de `features/clases` (regla 9), o hacer este movimiento dentro de 01d y mezclar refactor con funcionalidad, que es justo lo que 01c existe para evitar.
- **Qué se espera:**
  - Que esos mensajes, y su relación con los cuatro códigos, vivan en `components/adjuntos/data.ts`.
  - Que `features/clases` los siga usando con exactamente la misma salida: `MENSAJES_ERROR_CLASES_GENERALES` y el mapa de `mensajeDeErrorClases` apuntan a los valores compartidos y conservan sus claves.
  - Que `reexportaciones-01c.test.ts` sume un caso que lo compruebe (los mismos valores por la ruta vieja y por la nueva).
  - Sin cambio de comportamiento: la suite completa sigue en verde, los dos rojos esperados siguen resueltos y V-01 no cambia.

### Arbitraje de las tres desviaciones
1. **`AdjuntosDePublicacion` como envoltorio: se acepta.** Es lo que §D-9 manda para todo símbolo que usaba `mensajeDeErrorClases`: la versión compartida recibe la función y `features/clases` conserva un envoltorio con el mismo nombre y la misma salida. El `toBe` de PR-1C02 vale para las reexportaciones, y para los envoltorios es imposible por construcción: es una contradicción interna del plan. PR-1C02 los comprueba por nombre y salida (la de `AdjuntosDePublicacion` la cubre la suite del muro y de archivos, en verde). Que el arquitecto corrija el texto de PR-1C02 ("`toBe` para las reexportaciones; nombre y salida para los envoltorios") la próxima vez que toque el plan. No hace falta una enmienda.
2. **Una sola corrida de la suite para los grupos 3 a 5: se acepta**, declarada. Eran reexportaciones pequeñas (tipos y funciones), cada una verificada con `tsc -b` y ESLint, y el estado final está en verde en mi corrida. Para la corrección de M-01 y para 01d y 01e, que se cumpla el plan tal como está escrito ("después de cada grupo") o que se declare antes de desviarse.
3. **La interpretación de "mensajes de error de archivos": no se acepta.** Es M-01 (arriba). En cambio, **`TIEMPO_FRESCO_DEL_MURO_MS` quedarse en `features/clases` sí es correcto:** es la frescura propia del muro, y el cálculo compartido (`tiempoFrescoDeAdjuntos`) recibe el tiempo sin vistas previas como parámetro, así que 01d pasa el suyo para el detalle de la tarea. Las demás claves de `MENSAJES_ERROR_CLASES_GENERALES` (sin acceso, alumno, publicación, comentario, genérico) son de CLASES o ya existen en `components/clase` (`sinAcceso`): no hace falta moverlas.

### Nota para el commit `<K1c>`
Los cuatro `git mv` dejan en el índice un renombrado, y el archivo de origen recreado aparece como nuevo sin seguimiento (`??`). El bloque de `git add` debe incluir **las dos rutas de cada uno** (la nueva en `components/` y la de origen en `features/clases/components/`). Si no, el commit borraría los orígenes.

## Verificación del resumen — TAREAS-01c — corrección de M-01
Veredicto: **resumen ACEPTADO**. El tester puede atacar la ronda 1 de 01c.
Corrida propia del 2026-10-06, una suite a la vez (solo frontend y raíz; el backend no se corre en 01c).

| Comprobación | Resumen del programador | Corrida del manager |
|---|---|---|
| `cd frontend; npm run lint` | código 0 | código 0 |
| `cd frontend; npm test` | `128 passed (128)` · `1865 passed (1865)` | `128 passed (128)` · `1865 passed (1865)` |
| `cd frontend; npm run build` | código 0 | código 0 |
| `npm run build` y `npm run lint` (raíz) | código 0 | código 0 |
| `cd frontend; npx vitest list` | 1865 (1864 + 1) | 1865 casos, 13 de `reexportaciones-01c.test.ts` |

- **Título nuevo:** "PR-1C02: los mensajes de error de archivos y su mapa por código viven en components/adjuntos/data.ts y features/clases los usa igual" existe literalmente.
- **Misma salida de `mensajeDeErrorClases`, texto por texto:**
  - En `ebfe126`, el mapa traducía `ARCHIVO_NO_SUBIDO`, `ARCHIVO_INVALIDO`, `ALMACEN_NO_CONFIGURADO` y `ALMACEN_NO_DISPONIBLE` a tres textos de `MENSAJES_ERROR_CLASES_GENERALES`.
  - Hoy el mapa esparce `MENSAJES_POR_CODIGO_DE_ARCHIVO` (`components/adjuntos/data.ts:43-48`): las mismas cuatro claves, y esas claves no se repiten en el resto del mapa.
  - Los valores salen de `MENSAJES_ERROR_DE_ARCHIVOS` (líneas 37 a 41), con los tres textos idénticos a los de `ebfe126`: "Uno de los archivos no terminó de subir. Inténtalo de nuevo.", "Uno de los archivos no coincide con lo que elegiste. Vuelve a adjuntarlo." y "Los archivos no están disponibles en este momento. Inténtalo más tarde.".
  - `MENSAJES_ERROR_CLASES_GENERALES` conserva sus tres claves, ahora tomadas del compartido, y `features/clases/data.ts` reexporta `MENSAJES_ERROR_DE_ARCHIVOS`.
  - **La salida es la misma para cada código.**
- **Sin cambio de comportamiento ni nada fuera de §D-9:** la suite completa está en verde. Solo cambiaron los archivos que ya estaban en la entrega (ninguno nuevo); lo compartido sigue sin importar de `features/` (`grep` = 0); `backend/` y `shared/` no cambiaron.
- **Lo que 01d necesita para adjuntos (§D-10), todo ya compartido:**
  - `AdjuntosDePublicacion` (el compartido, con `mensajeDeError`) y `ListaDeAdjuntosElegidos`;
  - `useSolicitarSubida` y `useUrlDeDescarga`;
  - `tipoDeArchivo`, `errorDeArchivoElegido`, `avisoDeFalloAlSubir` (con los mensajes de cada módulo) y `tiempoFrescoDeAdjuntos`;
  - `TEXTOS_ADJUNTOS`, `ACCEPT_DE_ADJUNTOS`, `MARGEN_DE_VISTA_PREVIA_MS`, `MENSAJES_ERROR_DE_ARCHIVOS` y `MENSAJES_POR_CODIGO_DE_ARCHIVO`, en `components/adjuntos/`;
  - `subirArchivo` en `services/almacenService.ts`.

  Además están `ConClaseDeLaRuta` y `FirmaDelAutor` (`components/clase/`), la perspectiva y la base de la ruta (`lib/ruta-de-clase.ts`), los errores de la API (`lib/errores-de-api.ts`) y `clavePublicaciones` (`services/clasesService.ts`). Lo demás que §D-10 nombra (`services/trabajoService.ts`, `lib/vencimiento.ts` y `native-select`) nace en 01d. **No hay hermanos pendientes.**
- **V-01:** las 150 `*.ataque` coinciden con la tabla de la complementaria (`diff` vacío).

Sin M-nn. Sigue vigente la nota para el commit `<K1c>`: en el `git add` van las dos rutas de cada uno de los cuatro `git mv`.

## Revisión final — TAREAS-01c
Veredicto: **APROBADO CON OBSERVACIONES, con una condición de corrida.**
- **El refactor está bien:** lo planeado, sin cambio de comportamiento, V-01 151/151.
- **Mi corrida completa del frontend salió con 2 rojos por tiempo límite** (5 s) en dos `*.ataque` de la barra lateral de CLASES-02d que 01c no toca, con la máquina cargada. No la repetí (PA-12).
- **Condición:** antes del bloque del commit `<K1c>`, una repetición de `cd frontend; npm test`, autorizada por el orquestador y con la carga comprobada, debe salir en verde. Si con la máquina descargada vuelven a caer **exactamente** esos dos casos por tiempo, es PA-12 y se escala junto a M-02 de DESIGN-01b (el `testTimeout` del frontend). Cualquier otro rojo bloquea.

Verificación propia del 2026-10-06, una suite a la vez, en `feat/tareas` con base `<K1b>` = `ebfe126`:
- `cd frontend; npm run lint`, código 0.
- `cd frontend; npm test`, código 1: `Test Files 2 failed | 127 passed (129)` · `Tests 2 failed | 1874 passed (1876)`, con `Duration 179.52s` (transform 42.55 s y setup 186.15 s, contra unos 80 s, 18 s y 52 s de las corridas del tester). Esperado: 129 / 1876; las cifras coinciden y solo sobran los dos rojos.
- `cd frontend; npm run build`, código 0 (`✓ built in 2.34s`); raíz `npm run build` y `npm run lint`, código 0.

**Los dos rojos (PA-12, reportados completos):**
- `src/app/barra-02d-r1.ataque.test.tsx` › "ataque CLASES-02d r1: cuántas clases y cuáles" › "con 101 clases pide una sola página de 100 (sin cursor) y termina en «Ver todas» hacia el inicio": `Test timed out in 5000ms` (6236 ms).
- `src/app/foco-barra-02d-r2.ataque.test.tsx` › "ataque CLASES-02d r2: T-07 y sus estados vecinos" › "101 → 100 clases con el foco en «Ver todas»: el foco queda en la lista, no en <body>": `Test timed out in 5000ms` (6107 ms).
- **Diagnóstico:** carga medida justo después, CPU al 68 % y 6867 MB libres de 32 436 (el tester midió 16-20 % y unos 15 200 MB libres antes de sus corridas). Los dos archivos y `components/layout` no cambiaron respecto de `ebfe126`. Corridos aislados: `Test Files 2 passed (2)` · `Tests 33 passed (33)`. Son los casos de 101 clases, los más pesados del grupo que M-02 de DESIGN-01b ya marcaba "cerca del límite de 5 s". **No se deben a 01c.**
- **El mismo árbol** salió en verde (129 / 1876) en la ronda 1 del tester, con la carga medida antes.

### 1. Lo planeado, solo lo planeado y todo lo planeado
`git diff ebfe126 --stat`: todo cae en `frontend/src`, más la carpeta del encargo y `docs/ESTADO.md`.
- **Los nueve movimientos de §D-9** están hechos, con su reexportación o su envoltorio en el origen:
  - `components/clase/` (`ConClaseDeLaRuta`, `FirmaDelAutor` y `data.ts` con `TEXTOS_DE_LA_CLASE`);
  - `components/adjuntos/` (los dos componentes, `data.ts` con los textos, el `accept`, el margen y los mensajes de error de archivos con su mapa por código por M-01, `hooks.ts`, `lib.ts` y `types.ts`);
  - `lib/ruta-de-clase.ts`, `lib/errores-de-api.ts` y `clavePublicaciones` en `services/clasesService.ts`.
- **La Enmienda 3 y M-01** están aplicados como se verificó en su momento.
- **Lo que no se movió, y no tocaba:** los ganchos de foco, `focoPerdido` y `vecinaDeFila` (§D-9). `TIEMPO_FRESCO_DEL_MURO_MS` se queda en `features/clases`, como se arbitró.
- **Nada borrado:** `git diff ebfe126 -M --diff-filter=D` vacío; los cuatro `git mv` dejan su origen recreado.
- **"No se toca" desde 01c, intacto:** `app/**` (incluido `router.tsx`), `components/ui`, `components/layout`, los componentes protegidos, los servicios protegidos, `features/auth`, `admin` y `diagnostico`, los `lib/` protegidos, `index.html`, `vite.config.ts`, `vitest.config.ts`, `frontend/package.json`, y todo `backend/`, `shared/` e `infra/`. En `styles/` solo cambia la `*.ataque` del tester (`clases-r1`).
- **Sin cambio de comportamiento:** lo comprueban `reexportaciones-01c.test.ts` (13 casos), `refactor-01c-r1.ataque` del tester (11 casos, contra copias literales del código de `ebfe126`) y la suite completa.

### 3. V-01
- Las 151 `*.ataque` coinciden con la tabla de la ronda 1 de 01c (`diff` vacío).
- `git diff ebfe126 --name-only` sobre `*.ataque` da solo las dos que reescribió el tester en la ronda 0 (`features/clases/estatico-02c-r1` y `styles/clases-r1`), y la nueva es `refactor-01c-r1`.
- No hay borradas ni casos saltados. **El programador no tocó ninguna `*.ataque`.**

### 4. Definición de terminado, para 01c
- **Requisito:** cumple las reglas 5 y 9 de `CLAUDE.md`. Lo que comparten `clases` y `tareas` vive en `components/`, `lib/` y `services/`, sin importaciones de `features/` en lo compartido (`grep` = 0), así que `features/tareas` puede nacer en 01d sin importar de `features/clases`.
- **Capas:** frontend solo, siguiendo la estructura de módulos.
- **`lint`, `build` y `test`:** lint y build en verde. Test, con la condición de arriba: dos corridas completas en verde del mismo árbol (programador y tester) y la mía con dos tiempos límite por carga, ajenos a 01c.
- **Endpoints y migraciones:** ninguno.
- **Documentos:** `CLAUDE.md`, "Ubicaciones compartidas", por A-9 (texto abajo).

### 5. Diseño y estilo
- **Lista de diseño:** no aplica. No cambia nada visual (ningún texto, token, clase ni componente de `ui/`), y `DESIGN.md` no se toca.
- **Estilo (`CLAUDE.md`):**
  - **Bien:** los datos van en `data.ts` (`components/adjuntos`, `components/clase`), los hooks en `hooks.ts`, las funciones puras en `lib.ts` y `ArchivoCandidato` en `types.ts`. Las únicas interfaces en componentes son de Props (`AdjuntosDePublicacionProps` se exporta para el envoltorio).
  - **Por decisión del plan:** `lib/ruta-de-clase.ts` y `lib/errores-de-api.ts` declaran sus tipos y la tabla de bases junto a las funciones. §D-9 lo fija así ("tipo y funciones"), y es como viven los demás `lib/` compartidos.
  - **Lo que falta, ninguno:** `?? []`, `fetch(`, `console.`, `dangerouslySetInnerHTML` ni `target="_blank"` en lo nuevo (lo vigila `refactor-01c-r1`).

### 6. Observaciones con destino
- **O-1 de la ronda 0** (`estatico-r1` ya no cubría lo movido): **cerrada.** `refactor-01c-r1` la cubre con su revisión estática de los 12 archivos de destino.
- **O-2 de la ronda 0** (la exención "`features/clases/lib.ts`, donde vive `perspectivaDeRuta`" en `estatico-02c-r1` › §D-2C1 apunta al archivo viejo): inocua hoy, porque no filtra ninguna línea. Destino: el tester la actualiza a `lib/ruta-de-clase.ts` la próxima vez que reescriba ese archivo por un C-n (fila en ESTADO §3).
- **Para el arquitecto, la próxima vez que toque el plan:** que PR-1C02 diga "`toBe` para las reexportaciones; nombre y salida para los envoltorios", y que el paso 16 (b) diga que PR-1B16b también salía en rojo por el defecto.
- **Los dos tiempos límite de esta corrida:** a ESTADO §5 y a la fila de M-02 de DESIGN-01b. Los casos de 101 clases de `barra-02d-r1` y `foco-barra-02d-r2` pasan de 6 s con la máquina cargada.

### 7. Documentos
**`CLAUDE.md`, "Ubicaciones compartidas"** (A-9, lo aplica el orquestador). Es el texto del plan, ajustado a lo que quedó.
- Agregar, después de la viñeta de `components/layout/`:
  - "`components/clase/` — `ConClaseDeLaRuta` y `FirmaDelAutor`, compartidos por `features/clases` y `features/tareas`; sus textos (el de «sin acceso» y el de la firma de la administración) viven en `components/clase/data.ts` (`TEXTOS_DE_LA_CLASE`)"
  - "`components/adjuntos/` — los adjuntos elegidos y publicados (`ListaDeAdjuntosElegidos` y `AdjuntosDePublicacion`, que recibe los mensajes de error de cada módulo), con su subida y descarga (`hooks.ts`), sus funciones puras (`lib.ts`), sus textos, el `accept`, el margen de las vistas previas y los mensajes de error de archivos con su mapa por código (`data.ts`) y `ArchivoCandidato` (`types.ts`)"
- Agregar, después de la viñeta de `lib/variante-de-clase.ts`:
  - "`lib/ruta-de-clase.ts` — la perspectiva (`Perspectiva`, `perspectivaDeRuta`) y la base de la ruta de una clase (`baseDeClase`, `BASES_POR_PERSPECTIVA`)"
  - "`lib/errores-de-api.ts` — los errores por campo y de cursor de la API (`erroresPorCampo`, `esErrorDeCursor`, y la traducción de un `VALIDACION` a errores de formulario con los mensajes de cada módulo)"
- En la viñeta de `services/clasesService.ts`, "las claves de las listas de clases y la consulta de la barra lateral, compartidas por `components/layout` y `features/clases`" pasa a "las claves de las listas de clases y la del muro (`clavePublicaciones`), y la consulta de la barra lateral, compartidas por `components/layout`, `features/clases` y `features/tareas`".

**`DESIGN.md`:** no hay que tocarlo (no hay ningún patrón visual nuevo).

**Filas para ESTADO:**
- **§3:**
  - O-1 de 01c, cerrada por `refactor-01c-r1`;
  - O-2 de 01c (la exención de `estatico-02c-r1` › §D-2C1, para el tester, en la próxima reescritura por un C-n);
  - para el arquitecto: el texto de PR-1C02 y el del paso 16 (b).
- **§5:** la corrida del manager con dos tiempos límite por carga, junto a M-02 de DESIGN-01b.

### 8. Medición del programador
- **01c:**
  - rondas del tester: 1 (RESISTE);
  - rondas extra por hermanos: 0;
  - resúmenes devueltos: **1 de 2** (M-01: una lectura de §D-9 que dejaba los mensajes de error de archivos en `features/clases`; no es un caso de hermanos);
  - PARADAS: 0.
- **Acumulado de TAREAS-01 (01a a 01c):** 1 ronda extra por hermanos (T-02 → T-05 en 01a). El umbral de 2 no se alcanzó: sigue en `sonnet`.

### 9. Commit `<K1c>` (después de la condición)
**Mensaje propuesto:**
```
refactor(clases): TAREAS-01c, piezas compartidas para clases y tareas (components/clase, components/adjuntos, lib/ruta-de-clase, lib/errores-de-api y la clave del muro en services/clasesService), sin cambio de comportamiento
```
(más las líneas de atribución que correspondan).

**Rutas para `git add`**, con las dos rutas de cada `git mv` (el destino y el origen recreado):
```
frontend/src/components/adjuntos/adjuntos-de-publicacion.tsx frontend/src/features/clases/components/adjuntos-de-publicacion.tsx
frontend/src/components/adjuntos/lista-de-adjuntos-elegidos.tsx frontend/src/features/clases/components/lista-de-adjuntos-elegidos.tsx
frontend/src/components/clase/con-clase-de-la-ruta.tsx frontend/src/features/clases/components/con-clase-de-la-ruta.tsx
frontend/src/components/clase/firma-del-autor.tsx frontend/src/features/clases/components/firma-del-autor.tsx
frontend/src/components/adjuntos/data.ts frontend/src/components/adjuntos/hooks.ts frontend/src/components/adjuntos/lib.ts frontend/src/components/adjuntos/types.ts
frontend/src/components/clase/data.ts
frontend/src/lib/errores-de-api.ts frontend/src/lib/ruta-de-clase.ts
frontend/src/services/clasesService.ts
frontend/src/features/clases/data.ts frontend/src/features/clases/hooks.ts frontend/src/features/clases/lib.ts frontend/src/features/clases/types.ts
frontend/src/features/clases/reexportaciones-01c.test.ts
frontend/src/features/clases/refactor-01c-r1.ataque.test.tsx frontend/src/features/clases/estatico-02c-r1.ataque.test.ts frontend/src/styles/clases-r1.ataque.test.ts
docs/trabajo/TAREAS-01-tareas-temas-y-categorias/ docs/ESTADO.md CLAUDE.md
```
`CLAUDE.md` va después de que el orquestador aplique el texto de A-9, con su SHA-256 en `aprobacion.md`. Después del `git add`, `git status` no debe mostrar ningún `D` ni ningún `??` en `frontend/`.

### Problemas que bloquean
Ninguno en el código. La única condición es la repetición de la suite del frontend descrita arriba.

### Corrida de confirmación (autorizada por el orquestador)
**No se corrió: la carga no bajó del umbral en los 3 minutos de espera.** La condición de la revisión final de 01c sigue abierta.
- **Protocolo del orquestador:** medir `LoadPercentage` cada 10 s; correr solo con dos lecturas seguidas en 25 % o menos; esperar hasta 3 minutos.
- **Medición (2026-10-06):**
  - 18 lecturas sueltas entre las 20:53:05 y las 20:53:36: de 32 % a 76 %.
  - Después, 17 lecturas cada 10 s entre las 20:53:49 y las 20:56:47: 38, 62, 85, 63, 60, 60, 62, 65, 73, 58, 65, 48, 56, 7, 79, 56 y 77 %. Nunca hubo dos seguidas en 25 % o menos.
  - RAM libre al final: 7128 MB.
- **Procesos con más CPU acumulada:** `ChatGPT` (dos procesos), `com.docker.backend` y `Docker Desktop` (estos dos son normales con Docker encendido), `Warframe.x64` (unos 10 GB de memoria) y `Code` (varios). **Hay actividad del humano ajena al proyecto.** No terminé ningún proceso: no los arranqué yo (`AGENTS.md`).
- **Sigue:** la corrida de confirmación queda pendiente hasta que el equipo esté descargado (el humano cierra lo que esté usando, o se repite la medición más tarde). Con dos lecturas en 25 % o menos, una sola corrida de `cd frontend; npm test`, con los mismos criterios: 129 / 1876 en verde cierra 01c; los mismos dos casos por tiempo límite son PA-12 y se escalan junto a M-02 de DESIGN-01b; cualquier otro rojo bloquea.
