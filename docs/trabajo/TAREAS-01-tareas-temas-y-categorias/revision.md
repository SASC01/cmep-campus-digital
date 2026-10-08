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

**Corrida de confirmación, hecha (2026-10-06), después de que el humano cerró lo que cargaba el equipo:**
- **Medición previa:** CPU al 4 % (21:16:18) y al 23 % (21:16:29), dos lecturas separadas 10 s; RAM libre 17 600 MB.
- **Comando:** `cd frontend; npm test`, una sola vez y sin nada más corriendo (PA-08), de 21:16:39 a 21:18:09, código 0.
- **Pie de Vitest:** `Test Files 129 passed (129)` · `Tests 1876 passed (1876)` · `Start at 21:16:42` · `Duration 86.30s (transform 18.49s, setup 58.81s, import 165.07s, tests 382.05s, environment 271.25s)`.
- `barra-02d-r1` y `foco-barra-02d-r2` pasan con el equipo descargado.

**La condición de la revisión final de 01c queda cumplida.** El veredicto es APROBADO CON OBSERVACIONES, sin condiciones: 01c cierra. El orquestador puede dar el bloque del commit `<K1c>` (sección 9, con las dos rutas de cada `git mv`).

## Verificación del resumen — TAREAS-01d — implementación
Veredicto: **resumen ACEPTADO**. El tester puede atacar la ronda 1 de 01d. Sin M-nn; tres detalles menores al final.
Corrida propia del 2026-10-06, una suite a la vez, en `feat/tareas` con base `<K1c>` = `ad670c9`. **Carga medida antes:** CPU al 18 % y al 14 % (dos lecturas separadas 10 s) y 17 485 MB libres. El backend no se corre en 01d.

| Comprobación | Resumen del programador | Corrida del manager |
|---|---|---|
| `cd frontend; npm run lint` | código 0; `> tsc -b` | código 0 |
| `cd frontend; npm test` | `136 passed (136)` · `1962 passed (1962)` | `136 passed (136)` · `1962 passed (1962)` (122.24 s) |
| `cd frontend; npm run build` | código 0 | código 0 |
| `npm run build` y `npm run lint` (raíz) | código 0 | código 0 |
| `npx vitest list`, por ID | 1D01 14 · 1D02 16 · 1D03 17 · 1D04 9 · 1D05 13 · 1D06 6 · 1D07 6 · 1D08 5 (+86 sobre 1876) | idénticas, cada una en el archivo que fija el plan; 1962 casos |

- **Títulos:** los 59 títulos citados entre comillas existen literalmente; los tres con comillas internas los comprobé aparte.
- **V-01:** las 151 `*.ataque` coinciden con la tabla de la "Complementaria 2: C-13 (5), V-07" (`diff` vacío). Las únicas `*.ataque` cambiadas respecto de `ad670c9` son las tres del tester (`rutas-02c-r1`, `estatico-02c-r1` y `clases-r1`). **El programador no tocó ninguna.**
- **"No se toca" desde 01c:** respecto de `ad670c9` cambian solo `docs/DESIGN.md`, `app/router.tsx` y `router.test.tsx`, `features/clases/{components/publicacion-del-muro.tsx, muro-view.tsx, data.ts, types.ts}` y las tres `*.ataque` del tester. Los nuevos son `components/ui/native-select.tsx` y su prueba, `features/clases/components/tarjeta-de-tarea.tsx` y su prueba, `features/tareas/**`, `lib/vencimiento.ts` con su prueba y `services/trabajoService.ts`. Nada fuera de lo que abre el plan. `backend/`, `shared/` e `infra/` no cambiaron.
- **Regla 9:** `features/tareas` no importa de `features/clases`, `features/clases` no importa de `features/tareas` (las menciones son comentarios o rutas en las listas de las `*.ataque` del tester), y `components/`, `lib/` y `services/` no importan de `features/` (`grep` = 0 en los tres casos).

### Lista de diseño (manager.md), contra `DESIGN.md` y el código
- **Coincide con `DESIGN.md` y todo lo nuevo está documentado:**
  - §7.1: "crear y editar tarea" en las pantallas de trabajo.
  - §7.3: `NativeSelect` y el control segmentado de entregas tardías.
  - §7.7: el umbral de 72 h, los textos de S-10, "Venció el …" en `muted` y `varianteDeVencimiento`.
  - §7.8: la insignia "Tarea".
  - §7.18: la tarjeta de tarea y "Crear tarea".
  - §7.20 y §7.21: secciones nuevas, todas con "propuesta (TAREAS-01d)".

  Lo escrito coincide con lo implementado: el umbral (`UMBRAL_FECHA_PROXIMA_MS = 72 h`), los textos (`vencimientoDe`), "Tu trabajo" con el texto de S-12, "Elige una categoría" por defecto con categorías y su error "Elige la categoría de la tarea.", y la nota del tope de 20 criterios.
- **Solo tokens:** un `grep` estricto de clases de las escalas anuladas (`text-sm`, `rounded-lg`, `shadow-md`, `font-semibold`, colores de la paleta, `backdrop-blur`, `bg-white`) y de valores sueltos (`#hex`, `rgb`, `oklch` y `[Npx]`) en todo lo nuevo da 0. Usa `text-small`, `text-body`, `text-h2`, `text-h3`, `rounded-row`, `rounded-card`, `bg-surface`, `bg-muted`, `text-link`, `border-input` y `h-(--control-height)`.
- **Componentes de `components/ui/`:** `Button`, `Input`, `Textarea`, `Label`, `Card`, `Badge` y el `NativeSelect` nuevo, reestilizado con los mismos borde, fondo, altura, foco e inválido que `Input` (no con el aspecto por defecto). Los enlaces con aspecto de botón usan `buttonVariants`. Nada hecho a mano.
- **Rasgos prohibidos:** ninguno (sin degradados, sin manchas, sin nada que recuerde a Google Classroom).
- **Vidrio:** solo `Card` y, en el control segmentado, `vidrio-fuerte rounded-card p-1`, como el del muro, con `in-data-[material=opaco]:bg-accent-soft` para el contexto del admin. Ningún `backdrop-blur-*` ni fondo translúcido suelto.
- **El estado nunca solo con color:** el vencimiento va en una insignia con su texto ("Vence mañana a las …" en `warning`; "Venció el …" en `muted`). La insignia "Tarea" lleva texto e icono. El control segmentado indica el estado con `aria-pressed`, el `Check` y el color del texto.
- **Densidad y una sola acción principal:**
  - en el muro, "Crear tarea" es un enlace `outline` con `Plus` y "Publicar…" sigue siendo el único `primary`;
  - en el formulario, solo "Publicar tarea" o "Guardar cambios" es `primary`;
  - el detalle no tiene `primary` ("Editar tarea" `outline`, "Borrar tarea" `ghost`, "Sí, borrar tarea" `destructive`);
  - en `/admin/…` el contenedor ya marca la densidad y el material opaco.
- **Textos:** español de México, tono de §9, en `data.ts`. Sin palabras prohibidas y sin emojis (lo comprobé con `\p{Extended_Pictographic}` en todo lo nuevo).
- **Estados:** las tres vistas y el formulario siguen error → cargando → datos con retornos tempranos, y un `404` dice "Esa tarea ya no existe.". No hay un "vacío" de lista que pida un CTA (la rúbrica vacía no se pinta, como dice §7.20).
- **360 px:** el detalle va a una columna por debajo de `lg` (1024 px, `grid lg:grid-cols-3`). Las filas del formulario son `flex-wrap` con `min-w-56 flex-1` y `w-40`, y el texto largo se parte con `wrap-anywhere`. El aspecto real a 360 px no lo veo sin navegador: queda en H-1 de la comprobación humana.
- **Foco y etiquetas:**
  - cada campo lleva su `Label` asociado y `aria-invalid` con `aria-describedby` hacia su `ErrorDeCampo`;
  - el `NativeSelect` tiene su etiqueta asociada (PR-1D08) y el chevron es `aria-hidden`;
  - el control segmentado es un `role="group"` nombrado por su rótulo, con `aria-pressed`;
  - al quitar un criterio, el foco va al "Quitar criterio" vecino o, sin filas, a "Agregar criterio"; al agregar, va al "Criterio" de la fila nueva. Los adjuntos siguen el mismo criterio de §7.14, y la confirmación de borrar lleva el foco a "Cancelar" y lo devuelve al cancelar;
  - los números de criterio van como texto `sr-only`;
  - el foco visible sale de los componentes de `ui/`.
- **`ErrorDeCampo`** para todo error de campo (del cliente y del servidor), nunca texto rojo suelto.
- **`enEspera`** solo en "Publicar tarea"/"Guardar cambios" y en "Sí, borrar tarea": los dos de la lista de V-06, más los del muro que ya existían. Ningún `disabled` en JSX.
- **`autoComplete="off"`** en todos los campos del formulario y del editor de rúbrica.

### Estilo (`CLAUDE.md`)
- **`types.ts`:** reexporta los tipos de `@campus/shared` y declara solo los de la interfaz.
- **`data.ts`:** los textos, los límites y las clases de posición del indicador.
- **`lib.ts`:** las funciones puras (`cuerpoDeTarea`, `fechaLocalAIso`, `mensajeDeErrorTareas`…).
- **`hooks.ts`:** las consultas y mutaciones, con los avisos en `onSuccess` y `onError` (patrón T-30), sin aviso cuando el error es de un campo, y con la invalidación exacta del muro y por prefijo del trabajo, los temas, las categorías y el detalle.
- **Componentes:** solo declaran interfaces de Props.
- **Lo que no aparece:** `?? []` que oculte datos, ternarios anidados en JSX, `fetch(` y `dangerouslySetInnerHTML`.
- **Manejadores asíncronos:** `try/catch/finally` con aviso.
- **Subida:** con `subirArchivo` (`services/almacenService.ts`), sin `apiClient`.
- **Router:** el estudiante en `tareas/nueva` va a `Navigate to="/login"`, lo mismo que hace `*` (línea 134), y `tareas/:id/editar` cae en `*`.

### Arbitraje de las cuatro desviaciones
1. **Retirar `disabled={enElTope}` de "Agregar criterio": se acepta.** `CLAUDE.md` deja `disabled` para un control que no está disponible, y la regla V-06 del proyecto lo prohíbe en JSX. Con 20 criterios el botón no hace nada y la nota "La rúbrica puede tener hasta 20 criterios." lo explica, tal como documenta §7.21. Sugerencia (no bloquea): enlazar esa nota al botón con `aria-describedby`, para que un lector de pantalla la oiga al llegar a él.
2. **`IncidenciaValidacion` importada desde `./types`: se acepta.** Es el patrón de `CLAUDE.md` (el `types.ts` del módulo reexporta), y evita contar una definición de más en `refactor-01c-r1`.
3. **`varianteDeVencimiento` en `lib/vencimiento.ts`: se acepta.** Evita repetir la tabla de variantes en el muro y en el detalle (y en "Trabajo de clase" en 01e). Es pura, tiene su caso en `vencimiento.test.ts` y está documentada en §7.7.
4. **PR-1D06 en `tarjeta-de-tarea.test.tsx` nuevo, sin tocar `muro-view.test.tsx`: se acepta.** Es el archivo que fija la tabla de PR-1D06. La lista cerrada permitía cambiar `muro-view.test.tsx`, pero no lo obligaba.

### Detalles menores (no bloquean; carril trivial o la corrección que toque esos archivos en 01e)
- **`PublicacionDelMuro`:** si una publicación de tipo `tarea` llegara con `tarea: null`, se pintaría como una publicación común, con "Ver comentarios", que el servidor respondería con `404`. El backend lo impide (la instantánea de 01b garantiza el resumen), pero el respaldo es silencioso. Mejor una decisión explícita (no pintar la tarjeta, o un error).
- **Textos repetidos dentro de `features/tareas/data.ts`:**
  - `categoriaRequerida` aparece en `TEXTOS_FORMULARIO_TAREA` y en `MENSAJES_ERROR_TAREAS`;
  - `MENSAJES_ERROR_TAREAS.sinAccesoALaClase` repite `TEXTOS_DE_LA_CLASE.sinAcceso` (`components/clase/data.ts`), y debería tomarlo de ahí ("no dupliques datos entre módulos").
- **La nota del tope de la rúbrica sin `aria-describedby`** (arbitraje 1).

## Verificación del resumen — TAREAS-01d — corrección de la ronda 1
Fecha: 2026-10-07. Resumen verificado: "## TAREAS-01d — Corrección de la ronda 1" de `resumen-programador.md` (línea 462).
Veredicto: **DEVUELTO** por un hallazgo (M-01, el estado vecino que el propio programador reporta). Las cifras coinciden y las correcciones de T-06 a T-09 son correctas. El único rojo de mi corrida es un tiempo agotado en un caso del tester, no atribuible al programador (ver "Rojo por tiempo").

### Cifras: resumen contra mi corrida
Carga antes de la suite: 13 % y 21 % (10 s de separación), 17 336 MB libres. Las suites se corrieron una a la vez.

| Qué | Resumen | Mi corrida |
|---|---|---|
| `cd frontend; npm run lint` | `> tsc -b` | `> tsc -b`, salida 0 |
| `cd frontend; npm test` | `Test Files 138 passed (138)` · `Tests 2011 passed (2011)`, 132 s | `Test Files 1 failed \| 137 passed (138)` · `Tests 1 failed \| 2010 passed (2011)`, 173 s (el rojo es un tiempo agotado, abajo) |
| `cd frontend; npm run build` | `✓ built in 1.29s` | `✓ built in …`, salida 0 |
| raíz `npm run build` y `npm run lint` | `✓ built in 1.39s` · `> tsc -b` | salida 0 en ambos, mismas últimas líneas |
| `npx vitest list` | 2011 casos en 138 archivos (+27) | 2011 en 138 |
| Por ID | 1D02 19 · 1D03 27 · 1D04 14 · 1D05 21 · 1D06 7 | iguales |
| Títulos nuevos citados (26) | — | los 26 existen con el título exacto |
| V-01 | 153/153 | 153/153 contra la tabla del cierre de la ronda 1 de 01d (`reporte-tester.md`) |
| Los 5 rojos de la ronda 1 | verdes | verdes: `tareas-01d-r1.ataque` 18/18 (aislado) y `tarjeta-01d-r1.ataque` 4/4 |

**Rojo por tiempo (PA-12).**
- **Qué falló.** En la suite completa falló el caso de `tareas-01d-r1.ataque.test.tsx` › "con 20 criterios, «Agregar criterio» no agrega, no usa disabled y la nota dice el tope; el envío lleva los 20", con "Test timed out in 5000ms" (5183 ms).
- **Aislado pasa.** El mismo archivo aislado da 18/18, y ese caso tarda 2942 ms.
- **Causa.** La carga era baja al empezar (13 y 21 %) y llegó a 37 % al terminar. La causa es el peso del caso (20 filas con sus eventos) contra el límite de 5 s de Vitest en una suite de 2011 casos. No es código del programador.
- **Antecedentes.** Es la misma clase de problema que M-02 de DESIGN-01b y que los dos tiempos agotados de 01c. A-13 no lo cubre, porque solo autorizaba el cambio si fallaban `barra-02d-r1` y `foco-barra-02d-r2`.
- **Qué hice.** Por PA-12 no repetí la corrida. Como el resumen vuelve por M-01, la próxima verificación trae una corrida completa nueva.
- **Recomendación.** El tester le pone a su propio caso un `timeout` explícito, de 15 s, en la ronda 2: es su archivo, y V-01 se actualiza con su tabla. El programador no lo toca.
- **Alternativa general.** `testTimeout: 15_000` en `frontend/vitest.config.ts`. Ese archivo está en "No se toca" y lo decide el humano (ver "Para el humano").

### Punto 4: hermanos y estados vecinos, uno por uno, contra el código
**T-06 (llave estable de las filas de la rúbrica).**
- **Cómo funciona.** `erroresConLlavesDeFila` (`features/tareas/lib.ts`) traduce `rubrica.<posición>.<campo>` a `rubrica.<llave>.<campo>` usando las filas que se enviaron.
- **Por qué las posiciones coinciden.** `cuerpoDeTarea` mapea `estado.rubrica` 1:1, sin filtrar, así que las posiciones del servidor son las del envío.
- **Dónde se aplica.** `formulario-tarea.tsx` lo aplica a los errores del cliente y del servidor (`filasEnviadas`), y `editor-de-rubrica.tsx` lee por llave.
- **Casos.** Cada uno tiene el suyo: quitar la primera fila, una del medio y la última; quitar la fila con error; quitar una válida anterior; quitar y volver a agregar.
- **"Puntos máximos" y el prefijo `rubrica.N` del servidor.** Aplicados; `PREFIJO_DE_FILA` los reconoce.
- **Posición fuera del envío.** El error pasa a la rúbrica entera. Correcto.
- **Foco de §7.14.** Sin cambio de comportamiento, con su caso.
- **Los dos "no aplica".** Están razonados y coinciden con el código: "Agregar criterio" no desplaza índices porque la llave es nueva, y los adjuntos no tienen errores por índice.

**T-07 (tarea sin su resumen).**
- **El muro.** `PublicacionDelMuro` manda todo `tipo === "tarea"` a `TarjetaDeTarea`.
- **El esquema.** En `shared/` (`clases.ts:466`) el resumen es `resumenDeTareaSchema.nullable()`, sin `.optional()`, así que no queda una tercera rama con `undefined`.
- **La tarjeta.** Con `tarea === null` muestra la insignia `muted` "Fecha límite no disponible", así que el estado lo dice el texto. No ofrece comentarios ni borrado.
- **Las tres perspectivas.** Las cubre un caso PR-1D06; la perspectiva solo decide el enlace.
- **El detalle sin `tarea`.** Lo rechaza el esquema y la vista dice "Algo salió mal" (caso PR-1D05). Es correcto y no necesitó código.

**T-08 (opciones que cambiaron).**
- **Dónde va el remedio.** `pedirDeNuevoLasOpciones` está en el `onError` de `useCrearTarea` y de `useEditarTarea` (`hooks.ts:93` y `:114`). Invalida temas o categorías según `OPCIONES_QUE_CAMBIARON_POR_CODIGO` (`data.ts:140`), para los tres códigos.
- **El campo.** `CamposDelFormulario` deriva `categoriaId` y `temaId`. Si la opción ya no está en la lista, el valor es `""`, que se muestra como "Elige una categoría" o "Sin tema". Lo que la persona eligió no se borra; solo cambia el valor que se muestra y se envía.
- **Casos.** Crear, editar y los tres códigos tienen el suyo.
- **El estado vecino que encontró el programador.** La recarga fallida de las listas quedó corregida: `FormularioTarea` solo muestra el error si no hay datos y, si los hay, conserva el formulario con las últimas listas. Tiene su caso.
- **El "no aplica" del formulario del muro con `temaId`.** Está razonado (ese campo llega en 01e) y quedó anotado como pendiente con destino.

**T-09 (foco cuando una recarga quita el control).**
- **Cómo funciona.** `useFocoAlPerderseElControl` (`features/tareas/hooks.ts:148`) marca que el foco está dentro con `focusin` y lo desmarca con un `mousedown` fuera. El foco se recoloca solo si cambió la clave, estaba dentro y quedó en `<body>`.
- **Estados vecinos con su caso.** Cada uno tiene el suyo:
  - `puedeBorrar` con la confirmación abierta;
  - `puedeEditar`, en el detalle y en la edición;
  - 404, en ambos;
  - recarga sin cambios, en ambos;
  - error con la tarea en caché y dos fallos seguidos;
  - cambio de `tareaId`;
  - clic fuera.
- **Los dos "no aplica".** Están razonados: en la primera carga nadie tiene el foco dentro, y borrar con éxito navega y desmonta la vista.
- **No duplica un gancho compartido.** Los de `components/layout/hooks.ts` y `features/clases/hooks.ts` son específicos de la barra y de las filas, y no hay uno genérico en `lib/` ni en `components/`.
- **Sin importaciones de `features/clases`.** El `grep` sale vacío fuera de las pruebas.

**Clave de foco y C-13.**
- **La clave del detalle.** Es `[tareaId, status, dataUpdatedAt, errorUpdatedAt]`. Es correcta y no es un rodeo para pasar la prueba:
  - cada respuesta o error nuevo es justo el momento en que la vista pudo cambiar;
  - el gancho igual solo actúa si el foco se perdió, así que una recarga sin cambios no mueve nada (tiene su caso);
  - y la vista no tiene que leer los permisos.
- **El lector de `puedeBorrar`.** Con `grep "\.puedeBorrar"` fuera de las pruebas, `acciones-de-la-tarea.tsx` sigue siendo el único lector; en `detalle-tarea-view.tsx` solo aparece en un comentario.
- **`puedeEditar`.** `editar-tarea-view.tsx` lo lee, como ya lo hacía, y C-13 no lo restringe.

### `docs/DESIGN.md`
Los tres agregados describen lo implementado y llevan la marca "propuesta (TAREAS-01d)":
- §7.18, "Tarea sin resumen" (T-07);
- §7.20, "Foco cuando una recarga quita el control enfocado" (T-09);
- §7.21, "Errores de las filas de la rúbrica" (T-06) y "Opciones que cambian" (T-08).

Al corregir M-01, la frase de §7.21 "Una recarga de las listas que falla no desmonta el formulario" se extiende a la recarga de la tarea en la edición.

### Arbitraje del punto 6: error de recarga de la tarea con el formulario de edición abierto
**Decisión: es un hallazgo que se corrige en 01d (M-01).** No es una observación con destino ni es aceptable, por tres razones:
- **Es el mismo mecanismo que el programador ya corrigió para las listas:** una recarga fallida con datos en caché. Su estado vecino directo es la consulta de la tarea en la misma vista. Según la regla de hermanos y estados vecinos (2026-10-05), un remedio que no se extiende por analogía es justo lo que causa una ronda extra del tester; dejarlo abierto invita a un T-10 en la ronda 2.
- **El daño es perder lo que el maestro escribió**, no algo cosmético. Puede pasar porque la consulta tiene `staleTime: 30_000` y `refetchOnReconnect` está activo por defecto (`app/providers.tsx` solo apaga `refetchOnWindowFocus`). Basta con:
  - un corte de red de más de 30 s mientras el maestro redacta, seguido de un 5xx al reconectar; o
  - un remontaje con la tarea vieja.
- **El remedio es pequeño y local** a `editar-tarea-view.tsx`, y no cambia el plan.

### M-01 — La edición pierde lo escrito ante un error de recarga de la tarea
Dónde: `frontend/src/features/tareas/editar-tarea-view.tsx:37`, en `if (consulta.isError) return <MensajeError …>`, que no mira si ya hay datos.
Por qué importa: es el estado vecino de T-08 (recarga fallida con datos en caché) en la otra consulta de la misma vista. Pierde lo que el maestro escribió y rompe la regla de hermanos y estados vecinos.
Qué se espera:
- **Con la tarea ya cargada y el formulario abierto, un error de recarga no desmonta el formulario ni borra lo escrito**, igual que pasa con las listas.
- **Excepción: el 404 `TAREA_NO_ENCONTRADA`.** La tarea ya no existe y guardar no tiene sentido, así que la vista sigue diciendo que no existe y el foco va a la raíz, como hoy. Su caso PR-1D04 no cambia.
- **Sin datos (primera carga fallida),** el error se muestra como hoy.
- **Una recarga exitosa que quita `puedeEditar`** sigue mostrando "No puedes editar esta tarea." y el foco va a la raíz, como hoy.
- **Hermanos que el resumen debe cubrir uno por uno, cada uno con su caso:**
  - un error 5xx con la tarea en caché, y lo escrito queda intacto;
  - dos fallos seguidos;
  - un fallo y luego una recarga exitosa sin cambios, y lo escrito queda intacto;
  - un 404 con la tarea en caché (sin cambio respecto a hoy);
  - el foco con el formulario conservado: no se mueve, porque el control sigue montado;
  - el detalle: ahí no hay nada escrito que perder, así que mostrar el error es aceptable y basta con decirlo con esa razón.
- §7.21 de `DESIGN.md` se actualiza con la misma frase que las listas.

### Desacuerdos arbitrados
Ninguno entre programador y tester en esta entrega. Las dos decisiones de implementación del programador son correctas:
- la raíz de la vista como destino del foco, porque existe también en los estados de error y de carga;
- la clave del foco con `dataUpdatedAt` y `errorUpdatedAt`.

### Para el humano
Ya van tres veces que la suite completa del frontend tiene tiempos agotados en casos pesados: M-02 de DESIGN-01b, los dos de 01c y este de 01d. La causa es el límite de 5 s de Vitest, no la carga del equipo. Hay dos opciones:
- **(a) Un `timeout` explícito en cada caso pesado,** puesto por quien escribe la prueba. Es lo que recomiendo para este caso.
- **(b) Autorizar `testTimeout: 15_000` general en `frontend/vitest.config.ts`.** Cierra el problema para todos los casos, pero ese archivo está en "No se toca".

## Verificación del resumen — TAREAS-01d — corrección de M-01 y A-13
Fecha: 2026-10-07. Resumen verificado: "## TAREAS-01d — Corrección de M-01" de `resumen-programador.md` (línea 530), con "### A-13: testTimeout y corrida de cierre", y la última sección de `aprobacion.md`.
Veredicto: **ACEPTADO**, pasa a la ronda 2 del tester, sin M-nn. M-01 quedó corregido con cada estado vecino cubierto por su caso. A-13 está aplicado en dos líneas y dentro de lo autorizado.

### Cifras: resumen contra mi corrida
Carga antes de la suite: 33/10 y 24/29 (pares de 10 s), 17 006 MB libres; 41 % al terminar. Corrí una suite a la vez.

| Qué | Resumen (corrida de cierre) | Mi corrida |
|---|---|---|
| `cd frontend; npm run lint` | `> tsc -b` | `> tsc -b`, salida 0 |
| `cd frontend; npm test` | `Test Files 138 passed (138)` · `Tests 2018 passed (2018)`, 86.21 s | `Test Files 138 passed (138)` · `Tests 2018 passed (2018)`, 84.88 s, sin tiempos límite |
| `cd frontend; npm run build` | `✓ built in 764ms` | `✓ built in 656ms`, salida 0 |
| raíz `npm run build` · `npm run lint` | `✓ built in 652ms` · `> tsc -b` | `✓ built in 694ms` · `> tsc -b`, salida 0 en ambos |
| `npx vitest list` | 2018 (+7) | 2018 |
| Por ID | PR-1D04 19 (+5) · PR-1D05 23 (+2) | 19 · 23 |
| Títulos citados | — | Existen con su título exacto los 8 casos nuevos o reescritos: 5 de PR-1D04 y 3 de PR-1D05 (uno de ellos reescrito, lo que da +2 netos). También existe el de `puedeEditar` que cita como ya existente. El título viejo de T-09 ("…y un segundo fallo seguido no dejan el foco en <body>") ya no está; su cobertura pasó a los casos M-01 del detalle (abajo) |
| V-01 | 153/153 | 153/153 (`diff` vacío contra la tabla del cierre de la ronda 1 de 01d), ninguna `*.ataque` tocada |

La corrida del programador anterior a A-13 (3 rojos por tiempo, 188 s) quedó superada por su corrida de cierre y por la mía. Las dos están en verde con el límite de 15 s.

### M-01 contra el código
**Mecanismo.** Las dos vistas comparten el mismo mecanismo:
- `errorQueReemplazaLaVista(hayTarea, error)` (`lib.ts:194`) es una función pura. Devuelve `true` sin tarea en caché o con `TAREA_NO_ENCONTRADA`.
- `editar-tarea-view.tsx` y `detalle-tarea-view.tsx` ponen el error primero solo si esa función lo pide. Si no, pasan a cargando y luego a datos.
- Así se respeta el orden "error → cargando → datos" de `CLAUDE.md`: el error reemplaza la vista solo cuando no hay datos que mostrar (o la tarea ya no existe), y con datos en caché se avisa.
- `useAvisoDeRecargaFallida` (`hooks.ts:145`) lanza el toast en un efecto que depende de `errorUpdatedAt`: un aviso por fallo y ningún `throw`.
- Los textos están en `data.ts`, sin tipos en el archivo de hooks.

**Estados vecinos, uno por uno:**
- **5xx con la tarea en caché (edición).** Mismo nodo del campo, mismo valor, foco intacto, aviso y sin mensaje de error. Caso "PR-1D04: un 5xx en la recarga deja el formulario, lo escrito y el foco, y avisa sin desmontar".
- **Dos fallos seguidos.** Dos avisos y lo escrito intacto. Casos "PR-1D04: dos fallos seguidos avisan dos veces y el formulario sigue intacto" y, en el detalle, "PR-1D05: dos fallos seguidos con la tarea en caché avisan dos veces y el detalle sigue (M-01)".
- **Fallo y luego recarga exitosa.** En la edición lo escrito se conserva: caso "PR-1D04: un fallo seguido de una recarga exitosa conserva lo escrito y no lo sobrescribe con los datos nuevos". En el detalle se muestra la versión nueva sin un segundo aviso: caso "PR-1D05: tras un fallo, una recarga exitosa muestra la versión nueva del detalle (M-01)".
- **404 con la tarea en caché.** Dice "Esa tarea ya no existe.", no avisa de la recarga y el foco no queda en `<body>`. Caso "PR-1D04: un 404 con la tarea en caché sigue diciendo que no existe y el foco va a la raíz". El detalle conserva su caso de 404.
- **Primera carga fallida.** Se muestra el error y no el formulario. Caso "PR-1D04: la primera carga fallida sigue diciendo el error y no muestra el formulario". El detalle conserva "PR-1D05: un error de servidor muestra el aviso genérico".
- **Pérdida de `puedeEditar`.** Sigue igual y la cubre el caso existente de PR-1D04, que pasa.
- **Foco con el formulario conservado.** No se mueve: hay una aserción `toHaveFocus` en el caso del 5xx. En el detalle, "Borrar tarea" conserva el foco, en el caso "PR-1D05: un error de servidor en la recarga con la tarea en caché deja el detalle, avisa y no mueve el foco (M-01)". La clave de foco cambia con `status`, pero el gancho no actúa porque el foco no se perdió.
- **Detalle.** Se extendió el remedio: conserva la última versión y avisa. Es mejor que lo que yo pedía como mínimo (declararlo con su razón) y queda documentado en §7.20 con la marca.

**Decisión de no sobrescribir tras una recarga exitosa (§7.21, con la marca "propuesta (TAREAS-01d)").** Es razonable:
- El formulario es estado local que se inicializa una sola vez con la versión con que se abrió. Ya se comportaba así ante cualquier recarga exitosa antes de M-01.
- Sobrescribir lo que el maestro está escribiendo sería peor que editar sobre la versión abierta, y el servidor valida al guardar.
- No cambiaría nada para 01d. Queda una propiedad conocida: si otra persona edita la misma tarea, gana la última en guardar, porque el `PUT` del plan no lleva versión. Ver "Para el humano".

### A-13
- **El cambio.** `git diff ad670c9 -- frontend/vitest.config.ts` son exactamente dos líneas añadidas dentro de `test: { … }`: el comentario (A-13, cierra M-02 de DESIGN-01b) y `testTimeout: 15_000`. Nada más cambia en el archivo.
- **Nada más fuera de lo abierto.** Contra el estado de mi verificación anterior, `git status` solo suma `frontend/vitest.config.ts`. Lo demás sigue en `frontend/src`, `docs/DESIGN.md` y `docs/trabajo/`, como abrió el plan de 01d.
- **"No se toca".** Intacto salvo A-13. V-01 da 153/153.
- **`hookTimeout`.** No necesita nada. Su valor por defecto es 10 s, ningún rojo vino de un `beforeEach` o `beforeAll`, y mi corrida no tuvo ninguno.
- **Para ESTADO §3.** Con esto, M-02 del cierre de DESIGN-01b queda **cerrado** (la fila de `testTimeout` del frontend). La fila de O-11/O-17 de CLASES-02c y 02d (`alumnos-b-r2` cerca de 5 s) depende de esa misma decisión y también se cierra, porque su umbral pasa a 15 s.
- **El caso pesado del tester** (`tareas-01d-r1`, 20 criterios) ya no necesita un `timeout` propio. La opción (a) de mi verificación anterior queda sin efecto.

### Detalles menores (no bloquean; el tester puede atacarlos en la ronda 2, o van al carril trivial)
- **Aviso al remontar con el error en caché.** Detalle y edición comparten la consulta. Si una recarga falló en el detalle y el maestro abre "Editar tarea" (o vuelve al detalle), la vista nueva monta con `isError` y datos. El efecto avisa enseguida de un fallo anterior, antes de que su propia recarga termine. En desarrollo, `StrictMode` lo duplica al montar. Un `id` fijo en el toast de cada vista lo resolvería sin cambiar el comportamiento.
- **Una aserción floja.** El caso de PR-1D04 "un fallo seguido de una recarga exitosa…" solo espera `isFetching() === 0`. No comprueba que la recarga exitosa llegó (por ejemplo, el título nuevo en la caché o que el aviso siga en 1). Pasaría igual si esa recarga fallara.
- **Texto impreciso.** "Puedes seguir editando; revisa tu conexión." no encaja con un 5xx, que no es un problema de conexión.

### Desacuerdos arbitrados
Ninguno.

### Para el humano
Editar una tarea es "gana el último que guarda": el `PUT` no lleva versión. Dos personas con permiso que editen la misma tarea a la vez no se enteran del cambio de la otra. No es un defecto de 01d ni del plan aprobado. Si en el piloto hay más de un maestro por clase editando las mismas tareas, conviene decidir más adelante un control de versión.

## Verificación del resumen — TAREAS-01d — corrección de la ronda 2
Fecha: 2026-10-07. Resumen verificado: "## TAREAS-01d — Corrección de la ronda 2" de `resumen-programador.md` (línea 590), contra "## TAREAS-01d — Ronda 2" de `reporte-tester.md`.

Veredicto: **ACEPTADO**, pasa a la ronda 3 del tester.
- Las cifras y los títulos coinciden.
- T-10 a T-14 están bien corregidos, con sus hermanos y estados vecinos ciertos.
- Las dos desviaciones quedan aceptadas.
- Hay un hallazgo de estilo, M-01 (un tipo en el archivo de hooks). **No bloquea la ronda 3, pero sí la revisión final.** Lo más barato es que el programador lo corrija antes de lanzar al tester: es mover el tipo, sin cambio de comportamiento, con lint en verde. Así el tester ataca sobre el código final.

### Cifras: resumen contra mi corrida
Carga antes de la suite: 0/22 y luego 29 %, con 17 350 MB libres; 31 % al terminar. Corrí una suite a la vez.

| Qué | Resumen | Mi corrida |
|---|---|---|
| `cd frontend; npm run lint` | `> tsc -b` | `> tsc -b`, salida 0 |
| `cd frontend; npm test` | `Test Files 140 passed (140)` · `Tests 2102 passed (2102)`, 87.52 s | `Test Files 140 passed (140)` · `Tests 2102 passed (2102)`, 86.84 s, sin tiempos límite |
| `cd frontend; npm run build` | `✓ built in 693ms` | `✓ built in 708ms`, salida 0 |
| raíz `npm run build` · `npm run lint` | `✓ built in 725ms` · `> tsc -b` | `✓ built in 713ms` · `> tsc -b`, salida 0 en ambos |
| `npx vitest list` | 2102 casos en 140 archivos | 2102 en 140 |
| Por archivo | lib 35 · formulario 33 · editar 38 · detalle 43 · ataque r1 18 · ataque r2 20 | iguales: PR-1D02 35, 1D03 33, 1D04 38, 1D05 43. De 88 a 149 son +61, como dice el resumen |
| Títulos citados | 56 títulos únicos | existen los 56. Los parametrizados se expanden en `vitest list`: `errorQueReemplazaLaVista(true, %s) = %s` ×7, `%s dice «%s»` ×6 y `VALIDACION «%s»` ×2 por vista |
| V-01 | 155/155 | 155/155: `diff` vacío contra la tabla del cierre de la ronda 2 de 01d. Ninguna `*.ataque` tocada |

**Los 8 rojos de la ronda 2.** Pasan todos dentro de la corrida completa en verde. Están en `tareas-01d-r2.ataque` (20 casos) y `tarjeta-01d-r2.ataque` (3).

**Archivos fuera de lo abierto.**
- `frontend/vitest.config.ts` sigue con solo las dos líneas de A-13.
- `.claude/agents/programador.md` cambia solo `model: sonnet` → `model: opus`. Su SHA-256, `30e26fff…65b9`, coincide con el anotado por el orquestador en `aprobacion.md`.
- `git status` no muestra nada más fuera de `frontend/src`, `docs/DESIGN.md` y `docs/`, así que "No se toca" está intacto.

**Prettier.** El programador corrió Prettier con escritura sobre `frontend/src/features/tareas`, carpeta que incluye las `*.ataque` del tester. V-01 prueba que no cambiaron. Aun así, la próxima vez el comando debe excluirlas.

### Hermanos y estados vecinos, mecanismo por mecanismo, contra el código
**1. Errores de la rúbrica por llave (T-10).**
- `erroresSinFilasQuitadas` (`lib.ts:246`) se aplica después de `erroresConLlavesDeFila` y toma las filas vigentes en el momento de la respuesta (`filasVigentesRef`, actualizado en un efecto).
- Un error de una llave que ya no está pasa a `rubrica`, una sola vez (`??=`), y las demás llaves conservan el suyo.
- Cada caso tiene el suyo: "Criterio", "Puntos máximos", la edición, filas reordenadas, sin filas quitadas, todas las filas quitadas y la posición fuera del envío.
- El "no aplica" de los errores del cliente está razonado: se calculan en el mismo turno con las filas de ese instante, como se ve en `handleSubmit`.

**2. Invalidaciones en `onError` (T-11).**
- `pedirDeNuevoLaTarea` (`hooks.ts`) filtra por `CODIGOS_QUE_RENUEVAN_LA_TAREA` (`data.ts:158`).
- Con 404 llama a `invalidarTrasCambiar`, que renueva muro, trabajo, temas, categorías y la tarea. Con los 403 solo renueva la tarea.
- Está en `onError` de `useBorrarTarea` y de `useEditarTarea`. En `useEditarTarea` convive con `pedirDeNuevoLasOpciones`.
- Hay un caso para cada combinación de borrar o guardar con 404, 403 de permiso, `SIN_ACCESO_A_LA_CLASE` y 500. El 500 no vuelve a pedir la tarea.
- El "no aplica" de crear está razonado: no hay tarea en caché, se avisa y se conserva lo escrito, y tiene su caso.

**3. Aviso de recarga fallida (T-12).**
- `useAvisoDeRecargaFallida` guarda la marca `errorUpdateCount:errorUpdatedAt` en un `WeakMap` por instancia de consulta. Si la instancia se recolecta, la marca se va con ella, y no hay fuga.
- Hay casos para abrir "Editar tarea" o volver al detalle con el error ya avisado, `StrictMode` en las dos vistas, dos fallos seguidos, y fallo, éxito y fallo.
- Los dos casos de `StrictMode` pasan también sin el remedio, y el programador lo declara. Los que lo discriminan son los de montaje con el error en caché, y su mutación lo comprueba.
- Cambio de `tareaId`: razonado, porque es otra consulta y por eso otra marca.
- Esto cierra mi detalle menor de "aviso al remontar con el error en caché" de la verificación de M-01.

**4. Textos y vista por código (T-13).**
- `errorQueReemplazaLaVista` (`lib.ts:197`) reemplaza la vista en cuatro casos: sin tarea en caché, con `TAREA_NO_ENCONTRADA`, con `SIN_ACCESO_A_LA_CLASE`, o con un `VALIDACION` cuyo mensaje empieza por `claseId:` o `tareaId:`. Es la misma convención de prefijo de campo que `PREFIJO_DE_FILA`.
- `avisoDeRecargaFallidaAlEditar` (`lib.ts:210`) dice "revisa tu conexión" sin conexión, con `SIN_CONEXION` o con un estado ≥ 500, y el texto nuevo para el resto.
- El detalle usa un solo texto, que no habla de conexión. Es correcto.
- Hay casos para `SIN_ACCESO_A_LA_CLASE` en las dos vistas, `VALIDACION` de ruta y de otro campo, 503 sin JSON, red caída y 429.
- `ACCESO_RESTRINGIDO` y `CAMBIO_DE_CONTRASENA_REQUERIDO` quedan fijados como "no reemplazan" en `lib.test.ts`, con razón: `apiClient` los redirige antes.

**5. Foco (T-14).** `useFocoAlPerderseElControl` adopta el criterio de `useFilaEnFoco`:
- la memoria apunta al control del último `focusin` dentro de la vista;
- un `focusout` sin destino, decidido en el turno siguiente, la borra solo si el control sigue conectado, la ventana conserva el foco y el control ya no es el elemento activo;
- el foco va a la raíz solo si ese control ya no está en el documento y el foco quedó en `<body>`.

Cada estado que fijó CLASES-02 tiene su caso:
- en las dos vistas: primera carga; recarga sin cambios; recarga que quita el control; clic en blanco seguido de una recarga sin cambios o de una que quita el control; cambio de pestaña; `focusout` sin destino con el control aún enfocado; error en caché y dos fallos; cambio de `tareaId`;
- solo en el detalle: `visibilitychange` y el foco que pasa a otro control.

Que esos dos estén solo en el detalle es aceptable. Los decide el gancho compartido, no la vista. La edición solo difiere en la clave, y esa clave la ejercitan sus otros casos. Lo ideal habría sido decirlo en el resumen; no lo devuelvo por eso.

### Arbitrajes
**(a) Desviación 1, el 5xx conserva "revisa tu conexión": se acepta, y mi detalle menor queda cerrado así.**
- `apiClient` ya presenta los 500 a 504 sin JSON como `SIN_CONEXION` (DEC-12), así que para la persona son el mismo caso.
- La prueba del tester fija ese texto para un 500 `ERROR_INTERNO`.
- Cambiarlo obligaría a una C-n en la última ronda por un matiz de redacción.
- No hace falta una C-n.

**(b) `document.activeElement` en lugar de `document.hasFocus()`: aceptable, y en un navegador es equivalente.**
- Al cambiar de pestaña o de aplicación, el navegador dispara `focusout` y `blur` de la ventana, pero `document.activeElement` sigue siendo el control. Por eso al volver el foco regresa a él, y la memoria se conserva.
- En un clic en blanco, el elemento activo pasa a `<body>` (o a la raíz con `tabIndex={-1}`, que queda dentro de la vista), y la memoria se borra o el foco se queda en la raíz.
- El criterio no depende de `hasFocus()`, que en jsdom queda en falso tras `blur()`.
- Es una divergencia de implementación con los ganchos de CLASES-02, que usan `hasFocus()` con el seguimiento de la ventana. **Conviene anotarla** en el `chore` de accesibilidad del marco: unificar el criterio o extraer un solo gancho compartido.
- Sin navegador no lo verifiqué en uno real.

**(c) `SIN_ACCESO_A_LA_CLASE` en la recarga de la edición pierde lo escrito: aceptable.**
- Es coherente con el 404 de M-01: quien perdió el acceso no puede guardar, porque el `PUT` daría 403, y la vista deja de ofrecer guardar.
- Conservar un formulario que no se puede enviar sería engañoso.
- Queda documentado en §7.21.

**(d) `errorUpdateCount` además de `errorUpdatedAt`: se acepta.**
- `errorUpdateCount` es el identificador correcto de "un fallo nuevo".
- La fecha sola choca cuando dos fallos caen en el mismo milisegundo, como pasa con respuestas instantáneas en las pruebas.

### `docs/DESIGN.md`
§7.20 y §7.21 describen lo implementado, con la marca "propuesta (TAREAS-01d)":
- §7.20: la recarga fallida del detalle, con los cuatro casos que reemplazan la vista; un solo aviso por fallo (T-12); borrar con la tarea vieja (T-11); el criterio de foco con `focusout` sin destino y el elemento activo (T-14).
- §7.21: T-10 en las filas de la rúbrica; los textos por tipo de error (T-13); guardar con la tarea vieja (T-11).

### M-01 — Un tipo declarado en el archivo de hooks
Dónde: `frontend/src/features/tareas/hooks.ts:175`, `interface FalloDeLaConsulta`.
Por qué importa: `CLAUDE.md` lo prohíbe en dos lugares: la regla 1 de módulos ("Los tipos van en `types.ts`") y "Lo que no se hace" ("No pongas tipos en archivos de hooks"). Lint no lo detecta.
Qué se espera:
- La forma del parámetro sale de `types.ts` del módulo, o se infiere del tipo del resultado de TanStack Query.
- `hooks.ts` queda sin declaraciones de tipos.
- Sin cambio de comportamiento, con lint y test en verde.
- No bloquea la ronda 3, pero tiene que estar corregido para la revisión final.

### Detalles menores
- Hay dos casos de `StrictMode` que no discriminan el remedio (declarado por el programador). Se pueden quedar como documentación del comportamiento.
- No apliques Prettier con escritura sobre carpetas que contienen `*.ataque`.

## Verificación del resumen — TAREAS-01d — corrección de T-15 (ronda 4 cerrada)
Fecha: 2026-10-07. Resumen verificado: "## TAREAS-01d — Corrección de la ronda 3 (T-15)" de `resumen-programador.md` (línea 722), contra "## TAREAS-01d — Ronda 3" de `reporte-tester.md` (T-15).

**Veredicto: ACEPTADO.** El tester confirma.
- Las cifras y los 16 títulos coinciden.
- T-15 está corregido en una sola función para las dos vistas.
- T-14 sigue valiendo y cada hermano tiene su caso.
- La desviación se acepta.
- No hay M-nn.
- El M-01 de mi verificación anterior, el tipo declarado en `hooks.ts`, quedó **cerrado**: `FalloDeLaConsulta` vive en `types.ts`, inferido con `Pick<QueryObserverResult, …>`, y `hooks.ts` ya no declara tipos.

### Cifras: resumen contra mi corrida
Carga antes de la suite: 5 % y 14 % (10 s de separación), con 18 323 MB libres. Llegó a 25 % justo antes del test y a 47 % al terminar. Corrí una suite a la vez.

| Qué | Resumen | Mi corrida |
|---|---|---|
| `cd frontend; npm run lint` | `> tsc -b` | `> tsc -b`, salida 0 |
| `cd frontend; npm test` | `Test Files 141 passed (141)` · `Tests 2140 passed (2140)`, 79.69 s | `Test Files 141 passed (141)` · `Tests 2140 passed (2140)`, 84.19 s, sin tiempos límite |
| `cd frontend; npm run build` | `✓ built in 1.76s` | `✓ built in 735ms`, salida 0 |
| raíz `npm run build` · `npm run lint` | `✓ built in 713ms` · `> tsc -b` | `✓ built in 697ms` · `> tsc -b`, salida 0 en ambos |
| `npx vitest list` | 2140 (+16 sobre 2124) | 2140 en 141 archivos |
| Por archivo | editar 50 (+12) · detalle 45 (+2) · lib 37 (+2) | iguales. `tareas-01d-r3.ataque`: 22 |
| Títulos | 16 nuevos | existen los 16: 12 de PR-1D04 (6 del `it.each`), 2 de PR-1D05 y 2 de PR-1D02 |
| Los 2 rojos de `tareas-01d-r3` | en verde | en verde, dentro de la corrida completa |
| V-01 | 156/156 | 156/156 (`diff` vacío contra la tabla del cierre de la ronda 3 de 01d). Ninguna `*.ataque` tocada |

**Fuera de lo abierto, nada nuevo.**
- `git status` no cambia respecto de la verificación anterior, salvo dentro de `features/tareas` y `docs/`.
- `vitest.config.ts` sigue con solo A-13.
- `programador.md` sigue solo con el cambio de modelo.
- Prettier se aplicó esta vez solo sobre los archivos editados, con rutas explícitas. Eso cierra mi detalle de la ronda 2.

### Hermanos y estados vecinos contra el código (punto 4)
**Remedio.**
- `claveDeFocoDeLaTarea(tareaId, consulta)` (`lib.ts:268`) devuelve `tareaId:status:dataUpdatedAt:errorUpdatedAt:errorUpdateCount`.
- Es la única clave de `useFocoAlPerderseElControl` en las dos vistas: `editar-tarea-view.tsx:52` y `detalle-tarea-view.tsx:56`.
- Quitar `puedeEditar` de la clave de la edición no pierde nada. Toda respuesta exitosa cambia `dataUpdatedAt`, así que un `puedeEditar` que pasa a `false` sigue cambiando la clave, y su caso de T-09 sigue en verde.
- `lib.ts` sigue siendo puro: no importa React y la función es una proyección.
- `MomentoDeLaConsulta` está en `types.ts`, inferido de `QueryObserverResult` y no escrito a mano.

**Estados vecinos, uno por uno.**
- **Conserva seguido de reemplaza, en la edición.** Seis combinaciones en un `it.each`: 500→404, 500→403 `SIN_ACCESO_A_LA_CLASE`, red→404, `VALIDACION` de campo→`tareaId:`, 429→`claseId:` y `SIN_CONEXION`→404. Cubren todos los "conservan" y todos los "reemplazan" que lista el tester.
- **Mismo milisegundo.** Hay caso en la edición y en el detalle. Es justo lo que discrimina `errorUpdateCount`, y hay un unitario que lo fija.
- **Camino de T-11.** Un `PUT` con 404 después de una recarga fallida: tiene su caso.
- **Dos fallos que conservan, y conserva seguido de éxito.** El foco queda quieto, porque el control sigue en el documento y el gancho no actúa aunque la clave cambie. Hay un caso para cada uno.
- **Detalle con las mismas secuencias.** Lo cubren el caso del tester (sin hallazgo esperado), el del mismo milisegundo y los de T-09 y T-14 de PR-1D05, todos en verde.
- **T-14 tras el cambio de clave.** El gancho no cambió: `hooks.ts` no está entre los archivos tocados. Una clave que cambia más seguido no hace que el gancho actúe más, porque sigue exigiendo memoria viva y el control fuera del documento. Los casos lo confirman:
  - un clic en blanco y luego conserva→reemplaza no recupera el foco, en las dos vistas;
  - un cambio de pestaña y luego conserva→reemplaza lleva el foco a la raíz;
  - los casos de T-14 de la ronda 2 siguen en verde.
- **Mutaciones declaradas.** Con la clave vieja fallan 11 casos y sin `errorUpdateCount` fallan 3. Es coherente con qué casos discrimina cada parte de la clave.

### Desviación: `errorUpdateCount` en el detalle
**Se acepta.** Es el mismo remedio aplicado al hermano que el propio tester señaló: dos fallos en el mismo milisegundo dejaban la misma clave en el detalle. Además es la consecuencia natural de usar una sola función para las dos vistas.

### `docs/DESIGN.md`
§7.20 suma una frase con la marca "propuesta (TAREAS-01d), T-15": cada respuesta y cada fallo nuevo cuentan como un cambio, y las dos vistas usan `claveDeFocoDeLaTarea`. Describe lo implementado.

### Detalles menores (no bloquean; carril trivial o el cierre de 01d)
- **Títulos del `it.each` de PR-1D04 "%s conserva el formulario…; después %s lo reemplaza…".** El segundo `%s` interpola el código de una función, por ejemplo "después () => Promise.resolve(errorDeApi(estado, codigo, mensaje)) lo reemplaza". Por eso las combinaciones 500→404 y 500→403 tienen **el mismo título**, y en la salida no se ve qué segundo fallo se probó. Basta con un campo de nombre en cada fila de la tabla.

## Revisión final — TAREAS-01d
Fecha: 2026-10-07. Base dentro de los paquetes: `<K1c>` = `ad670c9`. Alcance: frontend y raíz.

**Veredicto: APROBADO CON OBSERVACIONES**, con **una condición antes del commit `<K1d>`** (M-01, solo documentación).

**Verificación propia:** frontend lint 0 · test `Test Files 142 passed (142)` · `Tests 2142 passed (2142)` (78.65 s, sin tiempos límite) · build `✓ built in 644ms` · raíz build `✓ built in 672ms` y lint `> tsc -b`, salida 0. Backend y `shared` sin cambios (`git diff --quiet ad670c9 -- backend shared`, salida 0); no se corrieron.

### Problemas que bloquean (condición del commit)
#### M-01 — Los dos patrones de §7.3 quedaron dentro de §7.6 de `DESIGN.md`
Dónde: `docs/DESIGN.md:488-489`. Las viñetas "Selector de una lista corta, `components/ui/native-select.tsx` (propuesta (TAREAS-01d))" y "Control segmentado de dos botones para una política (propuesta (TAREAS-01d))" están al final de **§7.6 Tarjeta de clase**, después de "Implementación (CLASES-a…)". El hunk `@@ -487,0 +488,3 @@` lo confirma.

Por qué importa:
- El plan ("Documentos a actualizar", al cerrar 01d) y A-8 las ponen en **§7.3 Controles**. Ahí viven el resto de los campos y el control segmentado de dos botones de CLASES-c, del que este es variante.
- `DESIGN.md` es la fuente única del sistema visual. Un patrón de control escondido en la sección de la tarjeta de clase no lo encuentra quien consulte §7.3.
- **Corrección de mi parte:** en la verificación de la implementación de 01d escribí que §7.3 estaba documentada. No comprobé la sección real del hunk; fue error mío.

Qué se espera:
- Las dos viñetas quedan al final de §7.3, después de "Control segmentado de dos botones para elegir un tipo", con el mismo texto y la misma marca.
- §7.6 queda como estaba en `ad670c9`.
- Lo hace el programador (A-8) por el carril trivial. Es solo documentación: no hace falta correr pruebas.
- Yo lo verifico con `git diff -U0 ad670c9 -- docs/DESIGN.md`: ningún hunk dentro de §7.6 y dos líneas nuevas dentro de §7.3.

### 1. Diff contra el plan
`git diff ad670c9 --stat` (versionados) da 18 archivos, +2958 y −17. Sin versionar quedan 31 archivos nuevos: 22 en `features/tareas` y 9 entre `components/ui`, `lib`, `services` y `features/clases`.

Fuera de `frontend/src`, solo cambian `frontend/vitest.config.ts` (A-13, dos líneas), `docs/DESIGN.md`, `.claude/agents/programador.md` (solo `model: opus`, SHA-256 `30e26fff…65b9` igual al de `aprobacion.md`), `docs/ESTADO.md` y la carpeta del encargo. Nada en `backend`, `shared`, `infra`, ningún `.env.example` ni `CLAUDE.md`, que espera el texto de cierre.

**Contra §D-10, punto por punto:**
- **Módulo `features/tareas`.**
  - `types.ts` reexporta de `shared` y declara solo los tipos de la interfaz, incluidos `MomentoDeLaConsulta` y `FalloDeLaConsulta`, inferidos de TanStack Query.
  - `data.ts`, `lib.ts` y `hooks.ts` tienen lo listado. `useRutaDeLaClase` es el único llamador de `perspectivaDeRuta` (C-13).
  - Están los seis componentes del plan más `lista-de-adjuntos-publicados.tsx`, que es la fila de los adjuntos ya publicados al editar. El plan la pide ("al editar, los ya publicados aparecen en la lista con «Quitar»"), es un subcomponente del módulo, usa los textos de `components/adjuntos` y no duplica `AdjuntosDePublicacion`, que es de solo lectura.
  - Las tres vistas usan `ConClaseDeLaRuta`.
- **`services/trabajoService.ts`, `lib/vencimiento.ts` y `components/ui/native-select.tsx` (A-12):** como en el plan. `varianteDeVencimiento` y `TEXTO_FECHA_NO_DISPONIBLE` son extras aceptados en la verificación de la implementación.
- **Formulario:**
  - campos, textos y "Elige una categoría" (Enmienda 1, M-03 b);
  - control segmentado (S-13);
  - rúbrica con total y tope;
  - adjuntos;
  - un solo `enEspera`;
  - `autoComplete="off"`;
  - `ErrorDeCampo` para los errores del cliente y del servidor;
  - foco de §7.14.
  
  La desviación aceptada en la implementación: `disabled={enElTope}` retirado (V-06, §7.21).
- **Detalle:**
  - dos columnas con `lg:grid-cols-3`/`lg:col-span-2`, sin valores arbitrarios;
  - `AccionesDeLaTarea` es la única que lee `tarea.puedeBorrar` (C-13);
  - "Tu trabajo" (S-12);
  - categoría y tema visibles para el alumno (S-17);
  - borrar con confirmación en línea.
- **Muro:**
  - `TarjetaDeTarea` recibe `perspectiva` por props;
  - `PublicacionDelMuro` manda todo `tipo === "tarea"` a la tarjeta (T-07);
  - "Crear tarea" `outline` para maestro y admin (S-18, `CapacidadesDePerspectiva.crearTarea`).
- **Rutas:** las cuatro de §D-10. El estudiante en `tareas/nueva` o en `…/editar` cae en `*`.
- **Vencimiento (S-10):** 72 h, con los textos del plan; "Venció el …" en `muted`.
- **Lo que agregaron las correcciones** cuenta como planeado, porque se aceptó en cada verificación: T-06 a T-15, M-01 de la ronda 1, la recarga fallida con la tarea en caché y M-01 de estilo.
- **Nada del plan quedó sin hacer en 01d.** El destino tras borrar hacia "Trabajo de clase" es de 01e, por §D-10.

### 2. Corrida propia
Carga medida antes: 2/34 en el lint y 3/5 antes del test, con 18 262 MB libres; 32 % al terminar. Corrí una suite a la vez.

| Comando | Esperado | Mío |
|---|---|---|
| `cd frontend; npm run lint` | — | `> tsc -b`, salida 0 |
| `cd frontend; npm test` | 142 / 2142 | `Test Files 142 passed (142)` · `Tests 2142 passed (2142)`, 78.65 s |
| `cd frontend; npm run build` | — | `✓ built in 644ms` |
| raíz `npm run build` · `npm run lint` | — | `✓ built in 672ms` · `> tsc -b`, salida 0 |

### 3. V-01 y las `*.ataque`
- 157/157 contra la tabla de la ronda 4 cerrada (`reporte-tester.md`, "Tabla de SHA-256 de las 157"): `diff` vacío.
- `git diff ad670c9 --name-status -- '*.ataque.test.*'` da tres modificadas por el tester en la ronda 0: `rutas-02c-r1` (C-9), `estatico-02c-r1` y `styles/clases-r1` (C-13 y su complemento V-07).
- Sin versionar hay 6 nuevas del tester: `tarjeta-01d-r1`, `tarjeta-01d-r2` y `tareas-01d-r1` a `r4`.
- Ninguna borrada (`--diff-filter=D` vacío). Ningún `.skip`, `.only`, `.todo` ni `skipIf` en las `*.ataque`.
- El programador no tocó ninguna. La vez que corrió Prettier sobre la carpeta (ronda 2), V-01 mostró que no cambiaron.

### 4. Definición de terminado (01d)
- **RF-34** (crear y editar tareas con título, instrucciones, adjuntos, fecha límite, puntos, categoría y rúbrica propia): cumplido.
- **RF-44** (guardar y mostrar si se aceptan entregas tardías; "con retraso" llega con ENTREGAS): cumplido. Control segmentado en el formulario y política en el detalle y en "Tu trabajo".
- **RF-13** (detalle con instrucciones, adjuntos, fecha, puntos y rúbrica de solo lectura): cumplido.
- **RF-12** (la tarea en el muro): cumplido con su tarjeta, incluida la variante sin resumen.
- **RN-07:** cumplido. La interfaz decide con `puedeEditar` y `puedeBorrar` del servidor, nunca con el rol, y el backend lo niega de todos modos (01b).
- **Capas y módulos de `CLAUDE.md`:**
  - tipos solo en `types.ts`: `hooks.ts`, `lib.ts` y `data.ts` declaran 0, y los componentes solo sus `Props`;
  - `lib/vencimiento.ts` exporta su `Vencimiento`, con precedente en `lib/ruta-de-clase.ts`;
  - regla 9: `features/tareas` no importa de `features/clases` ni al revés; solo `app/router.tsx` importa las vistas;
  - todo `fetch` pasa por `apiClient` dentro de hooks; la subida al almacén es la excepción documentada.
- **lint, build y test:** en verde (punto 2).
- **Endpoint nuevo o migración:** no hay; no aplica.
- **`infra/` y `.env.example`:** sin cambios.
- **Documentos:**
  - `DESIGN.md` por el programador, con la marca, sujeto a M-01;
  - `CLAUDE.md` "Al cerrar 01d" lo aplica el orquestador con el texto de abajo (A-9);
  - ESSENTIALS, PRD y ARCHITECTURE no cambian por 01d, según el plan.

### 5. Lista de diseño y estilo (sobre el estado final)
Lo que cambió en las correcciones:
- **Textos de los avisos por código:** "No pudimos actualizar la tarea. Puedes seguir editando; revisa tu conexión." / "…; inténtalo de nuevo en un momento." / "No pudimos actualizar la tarea. Mostramos la última versión que tenemos." / "No tienes acceso a esta clase.". Están en español de México, dicen qué pasó y qué hacer, sin tecnicismos ni emojis (§9).
- **Insignia "Fecha límite no disponible":** `Badge` `muted` con texto, así que el estado no depende del color.
- **Estados de foco:** la raíz de cada vista lleva `tabIndex={-1}` y el foco nunca cae en `<body>`. Que el foco sea visible sobre la raíz cuando llega por programa no se puede ver sin navegador; va a la comprobación humana.

Lo demás de la lista sigue como en la verificación de la implementación:
- solo tokens y ningún valor arbitrario (C-13, punto 4);
- `NativeSelect` reestilizado;
- vidrio solo en `Card` y en el control segmentado (V-07);
- ningún rasgo prohibido;
- una acción principal por vista (formulario: "Publicar tarea"/"Guardar cambios"; en el muro, "Crear tarea" es `outline`);
- estados de error, carga y datos;
- 360 px correcto en el código (`wrap-anywhere`, `flex-wrap`, una columna abajo de `lg`).

Estilo:
- retornos tempranos;
- sin `?? []` en los archivos de 01d;
- sin `disabled` en el JSX de `features/tareas`;
- `enEspera` solo en los dos botones de C-13;
- `ErrorDeCampo` en todos los errores de campo, incluido el de la rúbrica entera (T-10);
- `autoComplete="off"` en todos los campos del formulario;
- el `<input type="file" hidden>` es el mismo patrón del muro.

### 6. Hallazgos
- **T-06 a T-09** (ronda 1): corregidos y verificados el 2026-10-06/07. El tester los confirmó como resistentes en las rondas 2 y 3.
- **M-01 de 01d** (recarga fallida con el formulario abierto): corregido y verificado. Lo confirmó la ronda 2.
- **T-10 a T-14** (ronda 2): corregidos y verificados. Los confirmó la ronda 3.
- **M-01 de estilo** (tipo en `hooks.ts`): corregido, verificado en la ronda 4.
- **T-15** (ronda 3): corregido en la ronda 4 cerrada. El tester lo confirmó: RESISTE.
- No hay desacuerdos abiertos entre programador y tester.

### Observaciones y detalles menores (no bloquean; con destino)
| # | Qué | Destino |
|---|---|---|
| O-1 | En el `it.each` de PR-1D04 "%s conserva el formulario…; después %s lo reemplaza…", el segundo `%s` interpola el código de una función y dos filas comparten título | Carril trivial con la primera entrega del programador en 01e (un campo de nombre por fila) |
| O-2 | `features/tareas/data.ts`: `categoriaRequerida` repetida (`TEXTOS_FORMULARIO_TAREA` y `MENSAJES_ERROR_TAREAS`), y `MENSAJES_ERROR_TAREAS.sinAccesoALaClase` repite `TEXTOS_DE_LA_CLASE.sinAcceso` de `components/clase/data.ts` ("No dupliques datos entre módulos") | 01e, carril trivial |
| O-3 | La nota del tope de criterios no está ligada por `aria-describedby` al botón "Agregar criterio" | 01e o el `chore` de accesibilidad del marco |
| O-4 | Dos casos de `StrictMode` (PR-1D04 y PR-1D05) pasan también sin el remedio de T-12. El programador lo declaró, y los que discriminan son los de montaje con error en caché | Sin acción: quedan como documentación del comportamiento |
| O-5 | Prettier con escritura sobre una carpeta con `*.ataque` (ronda 2). V-01 mostró que no cambiaron, y en la ronda 3 ya se aplicó por rutas explícitas | Cerrado; queda como regla de proceso ya vigente en `AGENTS.md` |
| O-6 | `useFocoAlPerderseElControl` decide la ventana con `document.activeElement`, y los ganchos de CLASES-02 con `document.hasFocus()`: dos criterios para el mismo patrón | El `chore` de accesibilidad del marco, que por decisión del humano rediseña el mecanismo de foco si las rondas por foco no bajan con `opus` |
| O-7 | "Gana el último que guarda" al editar una tarea (el `PUT` no lleva versión) | ENTREGAS, junto con la calificación concurrente (decisión del humano, 2026-10-07) |

### 7. Documentos
**`CLAUDE.md`, "Al cerrar 01d"** (A-9; texto del plan ajustado a lo que quedó). Lo aplica el orquestador:
1. Tabla de módulos, fila `tareas`, reemplaza la actual por:
   `| \`tareas\` | Detalle de tarea, crear y editar tarea (rúbrica, adjuntos, categoría, tema y entregas tardías); zona de entrega e hilo privado (ENTREGAS) | Estudiante, Maestro, Administrador |`
2. "Ubicaciones compartidas", viñeta de `components/ui/`: "… `badge.tsx` (sus variantes son internas y no se exportan) y `textarea.tsx`" pasa a "… `badge.tsx` (sus variantes son internas y no se exportan), `textarea.tsx` y `native-select.tsx` (`NativeSelect` y `NativeSelectOption`: el `<select>` nativo reestilizado para listas cortas)".
3. "Ubicaciones compartidas", viñeta nueva después de la de `lib/ruta-de-clase.ts`:
   "- `lib/vencimiento.ts` — el estado y el texto de la fecha límite (`vencimientoDe`, con el umbral de 72 h `UMBRAL_FECHA_PROXIMA_MS` y `TEXTO_FECHA_NO_DISPONIBLE`) y la variante de su insignia (`varianteDeVencimiento`)"
4. "Ubicaciones compartidas", viñeta nueva después de la de `services/clasesService.ts`:
   "- `services/trabajoService.ts` — claves y consultas de temas, categorías, \"Trabajo de clase\" y tareas (`claveTemas`, `claveCategorias`, `clavePrefijoDelTrabajo`, `claveTrabajo`, `claveTarea`, `consultaTemas`, `consultaCategorias`, `consultaTarea`), compartidas por `features/clases` y `features/tareas`"

**`DESIGN.md`:**
- Con la marca "propuesta (TAREAS-01d)" están: §7.1 (pantallas de trabajo); §7.3 (`NativeSelect` y el control segmentado de la política, **por mover desde §7.6, M-01**); §7.7 (umbral de 72 h y textos de S-10); §7.8 (insignia "Tarea"); §7.18 (tarea en el muro, tarea sin resumen y "Crear tarea"); §7.20 nueva (detalle, recarga fallida, un aviso por fallo, borrar con la tarea vieja, foco con T-09, T-14 y T-15); §7.21 nueva (formulario, rúbrica con T-06 y T-10, opciones que cambian, recarga fallida, guardar con la tarea vieja).
- Todo describe lo implementado.

**ESSENTIALS, PRD y ARCHITECTURE:** sin cambios por 01d.

### 8. Medición del programador
**En 01d:**
- **Rondas del tester:** la 0 (más dos complementarias), 1, 2, 3 y una 4 cerrada que autorizó el humano (A-14).
- **Rondas extra por hermanos o estados vecinos: 2**, las dos sobre el mecanismo de recarga y foco: la ronda 2 (T-10 a T-14) y la ronda 3 (T-15).
- **Resúmenes devueltos: 1 de 5** (la corrección de la ronda 1, por M-01). M-01 de estilo no devolvió el resumen.
- **PARADAS imputables: 0.** El PA-20 de V-07 fue una omisión de C-13 en la Enmienda 4, no del programador.
- **La sesión se interrumpió una vez por el límite de tokens.**

**Acumulado de TAREAS-01:** 3 rondas extra por hermanos (01a: 1; 01d: 2) y 2 resúmenes devueltos (01c: 1; 01d: 1).

**Modelo:** el programador pasó a `opus` desde la corrección de la ronda 2 de 01d, por la regla de `AGENTS.md`. Con `opus` hubo una ronda extra más (T-15), sobre el mismo mecanismo de foco. Decisión del humano (2026-10-07): sigue con `opus` en 01e y ENTREGAS; si las rondas extra por estados vecinos del foco no bajan, el `chore` de accesibilidad del marco rediseña el mecanismo en lugar de seguir corrigiéndolo estado por estado.

### Filas para `docs/ESTADO.md`
- **§3 (pendientes con destino):**
  - O-1, O-2 y O-3 → 01e (O-3 alternativamente al `chore` de accesibilidad);
  - O-6 → `chore` de accesibilidad del marco, junto con la decisión del humano sobre el rediseño del mecanismo de foco;
  - O-7 → ENTREGAS;
  - la comprobación humana de 01d se suma a la de 01e (abajo).
  - **Cerrados por A-13 desde 01d:** M-02 de DESIGN-01b y la fila O-11/O-17 de CLASES-02c/02d.
- **§6 (medición):** lo del punto 8.

### 9. Para el humano
- **Al cerrar 01d:** el frontend de tareas está completo para crear, editar, ver y borrar, con la tarjeta en el muro. "Trabajo de clase", temas y categorías llegan en 01e. Las entregas ("Tu trabajo" real) llegan en ENTREGAS.
- **Comprobación humana pendiente para el final de 01e:** máximo 10 minutos y 7 puntos (decisión del 2026-09-28). Propongo agrupar así los puntos de 01d con H-1, H-2, H-5, H-6 y H-7 del plan:
  1. el detalle y el formulario a 360 px;
  2. el contexto opaco del admin en el detalle y el formulario;
  3. el lector de pantalla en el control segmentado de entregas tardías y en la rúbrica ("Quitar criterio" con su número, el total y la nota del tope);
  4. el foco tras borrar o perder un permiso: que se vea sobre la raíz de la vista y que, con `document.activeElement` en un navegador real, un clic en blanco no lo recupere y un cambio de pestaña sí lo conserve.
  
  Lo demás queda "no verificado por decisión del humano, cubierto por pruebas automáticas".
- **Pendiente tuyo (ENTREGAS):** "gana el último que guarda".

**Commit `<K1d>`** (después de la condición M-01 y de aplicar el texto de `CLAUDE.md`):
```
git status
git add CLAUDE.md docs/DESIGN.md docs/ESTADO.md docs/trabajo/TAREAS-01-tareas-temas-y-categorias .claude/agents/programador.md frontend/vitest.config.ts frontend/src/app/router.tsx frontend/src/app/router.test.tsx frontend/src/app/rutas-02c-r1.ataque.test.tsx frontend/src/styles/clases-r1.ataque.test.ts frontend/src/components/ui/native-select.tsx frontend/src/components/ui/native-select.test.tsx frontend/src/lib/vencimiento.ts frontend/src/lib/vencimiento.test.ts frontend/src/services/trabajoService.ts frontend/src/features/clases/components/publicacion-del-muro.tsx frontend/src/features/clases/components/tarjeta-de-tarea.tsx frontend/src/features/clases/data.ts frontend/src/features/clases/muro-view.tsx frontend/src/features/clases/types.ts frontend/src/features/clases/estatico-02c-r1.ataque.test.ts frontend/src/features/clases/tarjeta-de-tarea.test.tsx frontend/src/features/clases/tarjeta-01d-r1.ataque.test.tsx frontend/src/features/clases/tarjeta-01d-r2.ataque.test.tsx frontend/src/features/tareas
git commit -m "feat(tareas): TAREAS-01d, detalle, crear y editar tarea con rúbrica, adjuntos, categoría, tema y entregas tardías; tarjeta de tarea en el muro, NativeSelect, vencimiento a 72 h y testTimeout de 15 s del frontend (A-13)"
```

## Revisión de la Enmienda 5 — TAREAS-01e
Fecha: 2026-10-07. Modo 1, revisión de plan. Revisé `plan.md`, "## Enmienda 5", y sus cambios: §D-11 "Lecturas en paralelo", PR-1E06 y PR-1E07, la lista cerrada de 01e, el punto de ataque 1b, §7.22 en "Documentos" y R-06. El diff es contra `<K1d>` = `1118c1a`.

Veredicto: **CAMBIOS REQUERIDOS** (M-01). Es un ajuste pequeño del arquitecto. El diseño es correcto, pero le falta fijar un estado vecino que, con una instancia compartida, puede colgar la suite y dejar la vista sin lugares.

Verificación propia: no aplica (modo plan). Contrasté el código actual:
- `shared`: `paginacionSchema` y `trabajoQuerySchema`;
- `services/apiClient.ts`: acepta `signal` y lo pasa a `fetch`;
- `services/trabajoService.ts`: `claveTrabajo(claseId, tema)`;
- las pruebas de `features/clases`: crean su `QueryClient` con `retry: false`.

### Problemas que bloquean
#### M-01 — Liberar los lugares del limitador compartido al desmontar o cambiar de clase no está fijado ni probado
Dónde: §D-11, viñetas "Como máximo 6 en vuelo" y "Cambiar de clase o desmontar"; PR-1E07, quinto título.

Por qué importa:
- La instancia es única por módulo (`hooks.ts`), así que la comparten todas las vistas montadas y, en pruebas, **todos los casos del mismo archivo**: Vitest aísla por archivo, no por caso.
- Una tarea en curso solo suelta su lugar cuando su promesa se asienta. En producción eso ocurre: TanStack Query aborta el `signal` cuando se queda sin observadores (porque el `queryFn` lo lee) y el `fetch` real rechaza con el aborto.
- En pruebas, un doble de la API que "retiene sus respuestas" y no escucha el `signal` deja la promesa colgada. Los 6 lugares quedan ocupados para el resto del archivo, y PR-1E01, PR-1E02 y las `*.ataque` de 01e que vengan después se cuelgan hasta el tiempo límite. El resultado depende del orden de los casos.
- El plan dice que las que esperan "salen de la cola sin pedir nada". Pero ninguna prueba requerida comprueba **que la clase nueva obtenga sus 6 lugares**: el quinto título de PR-1E07 solo mira que no se pinten datos viejos ni se pidan los que esperaban. Ese estado vecino ("cambio de clave" y "la cola no queda con lugares ocupados") está en el punto de ataque 1b, pero no en las pruebas del programador. Es justo el patrón de las rondas extra por hermanos de este encargo.

Qué se espera (el texto lo decide el arquitecto):
1. **Contrato del limitador en §D-11:**
   - con `signal` ya abortado, `ejecutar` rechaza enseguida, sin formar ni correr la tarea;
   - al salir de la cola, por turno o por aborto, se quita el oyente de `abort`;
   - una tarea en curso libera su lugar cuando su promesa se asienta, con éxito, error o aborto, y la siguiente entra en el mismo turno de microtareas.
2. **Contrato de los dobles en PR-1E06, PR-1E07 y el punto 1b:**
   - las promesas son controladas (resolvedores guardados), sin temporizadores reales ni `setTimeout`;
   - el doble de la API **rechaza con el aborto cuando su `signal` se aborta**, como `fetch`;
   - el número en vuelo se cuenta con un contador del propio doble;
   - todo caso que retiene respuestas las resuelve o desmonta antes de terminar;
   - no se exporta un reinicio de la instancia solo para pruebas.
3. **Un caso requerido más,** en PR-1E07 o como sexto título: "al cambiar de clase (o salir y volver) con 6 peticiones en vuelo y otras en espera, las de la clase nueva obtienen sus 6 lugares y las que esperaban no se piden".
4. **En PR-1E06,** un caso para la `signal` ya abortada al llamar a `ejecutar`.

### Lo revisado sin problemas
1. **Pureza y lugar de la instancia.**
   - `crearLimiteDeConcurrencia(maximo)` en `features/clases/lib.ts` es aceptable. Es una fábrica sin React ni E/S: el estado vive en el cierre del objeto que devuelve, y la función es determinista y se prueba sola.
   - La instancia de módulo en `hooks.ts` tampoco rompe `CLAUDE.md`. No es estado de React ni una constante (no va en `data.ts`), y solo la usa `features/clases`, así que no corresponde a `services/`.
   - Con M-01, las pruebas no necesitan reiniciarla.
2. **Cancelación con el `signal`.**
   - El `queryFn` lee el `signal`, así que TanStack Query lo aborta al quedarse sin observadores. Su promesa se descarta como cancelada (revierte el estado), por lo que el rechazo del limitador no deja nada colgado ni pinta un error.
   - `apiClient` pasa el `signal` a `fetch` (`services/apiClient.ts:28` y `:123`).
   - Con `retry: 1` de producción, un fallo libera su lugar y el reintento vuelve a la cola, al final. Las pruebas usan `retry: false`.
3. **`limite` contra el backend de 01b.**
   - `trabajoQuerySchema` extiende `paginacionSchema`: `limite` entero de 1 a 100, por defecto 20. Así que 5 y 20 son válidos.
   - El cursor es el id del último elemento de cada tema, no un desplazamiento, así que mezclar páginas de 5 y de 20 no salta ni repite elementos.
   - `limite` se decide por el `pageParam` (primera página sin cursor, 5; con cursor, 20). La recarga de una consulta infinita repite cada página con su propio `pageParam`, en serie y una sola plaza a la vez, así que no hay bloqueo mutuo.
4. **Determinismo y si `opus` lo puede ejecutar.**
   - Los títulos son exactos y medibles.
   - El orden "Sin tema" primero depende de que las secciones se monten en orden: las suscripciones de hermanos se confirman en orden de árbol, así que también es determinista en jsdom.
   - Con el contrato de dobles de M-01 no queda nada por adivinar.
5. **Alcance.**
   - Sin cambios de backend ni de contrato, y nada más de alcance.
   - ESSENTIALS y `ARCHITECTURE.md` no necesitan nada: las listas siguen paginadas y es una decisión del cliente.
   - §7.22 de `DESIGN.md`, sin estado visual nuevo, es correcta.
   - R-06 pasa a decidido con el texto literal del humano.

### Detalles menores
- **El párrafo final quedó en la enmienda equivocada.** "§D-10 se ajusta para que coincida (el gancho `useRutaDeLaClase`, …)" era el cierre de la Enmienda 4 y, tras insertar la Enmienda 5 antes de él, ahora parece parte de la 5. Hay que devolverlo al final de la Enmienda 4. La Enmienda 5 no toca §D-10, y 01d ya está cerrada.
- **31 regiones `role="status"` a la vez.** Con 31 temas esperando, la vista monta 31 "Cargando `<tema>`" con `role="status"`. Un lector de pantalla suele no anunciar una región que aparece ya con su texto, así que no bloquea. Se anota para la comprobación humana con lector de pantalla del cierre de 01e.

### Para el humano
Nada que decidir. M-01 es una precisión del plan, sin cambio de alcance.

## Revisión de las correcciones de la Enmienda 5 — TAREAS-01e
Fecha: 2026-10-07. Modo 1. Lo verifiqué contra `plan.md`: §D-11 (líneas 243-252), PR-1E06 y PR-1E07 (490-491), el párrafo "Contrato de los dobles" (493-498), el punto de ataque 1b (548-554), H-3 (768), el cierre de la Enmienda 4 (824) y "### Correcciones (M-01 del manager)" (840-852).

Veredicto: **APROBADO.** M-01 queda cerrado. El programador puede arrancar cuando termine la ronda 0 del tester.

### M-01, punto por punto
1. **Contrato del limitador (§D-11).** Las cuatro reglas están completas y se pueden ejecutar sin adivinar:
   - (i) con un `signal` ya abortado, `ejecutar` rechaza enseguida, sin formar ni correr la tarea;
   - (ii) el oyente de `abort` existe solo mientras la tarea espera, y se quita al salir de la cola por turno o por aborto;
   - (iii) la tarea en curso libera su lugar en un `finally` (éxito, error o aborto) y la primera de la cola entra en el mismo turno de microtareas; en producción el aborto en curso lo da el `fetch` real;
   - (iv) no hay reinicio ni exportación solo para pruebas.
2. **Contrato de los dobles.** Lo citan PR-1E06, PR-1E07 y el punto 1b. Cubre todo lo pedido:
   - promesas controladas, sin temporizadores reales;
   - `AbortError` igual que `fetch`;
   - un contador en el propio doble;
   - cada caso resuelve sus respuestas o desmonta antes de terminar.
   
   Además fija que un caso que termina con lugares ocupados es un hallazgo.
3. **Casos nuevos con título exacto:**
   - "PR-1E06 · un signal ya abortado al llamar a ejecutar rechaza enseguida sin correr la tarea ni ocupar lugar";
   - "PR-1E07 · al cambiar de clase o salir y volver con 6 peticiones de trabajo en vuelo y otras en espera, la clase nueva obtiene sus 6 lugares y las que esperaban nunca se piden".
   
   Quedan 4 casos en PR-1E06 y 6 en PR-1E07.
4. **Punto 6 (anuncios).** Conservar un "Cargando `<tema>`" por sección es aceptable: es el patrón de §7.10 y `cargando.tsx` está protegido. Quedó anotado en H-3 para observarlo con lector de pantalla.
5. **Detalle.** El párrafo de cierre de la Enmienda 4 volvió a su lugar (línea 824).

### Detalle menor (no bloquea)
- El párrafo "Contrato de los dobles" (líneas 493-498) quedó **dentro de la tabla de "Pruebas requeridas"**, entre la fila de PR-1E07 y la de PR-1E05. En Markdown corta la tabla: la fila de PR-1E05 ya no se muestra como fila. El contenido sigue presente y con su ID, pero conviene mover el párrafo debajo de la tabla, sin cambiar texto, antes de que arranque el programador. Lo hace el arquitecto o el orquestador con transcripción. No requiere otra revisión: lo compruebo cuando verifique el resumen de 01e, y el resumen debe mapear PR-1E05 como cualquier otra prueba requerida.

## Verificación del resumen — TAREAS-01e — implementación
Fecha: 2026-10-07. Resumen verificado: "## TAREAS-01e — Implementación" de `resumen-programador.md` (línea 809). Base `<K1d>` = `1118c1a`.

**Veredicto: ACEPTADO.** Pasa a la ronda 1 del tester.
- Las cifras, los títulos, V-01 y "No se toca" coinciden.
- Las Enmiendas 5 y 6 están en el código tal como las fija el plan.
- La lista de diseño está en orden.
- Hay un hallazgo de estilo, **M-01**, que no bloquea la ronda 1 pero sí la revisión final. Lo más barato es corregirlo antes de lanzar al tester: no cambia comportamiento y así el tester ataca el código final.

### Cifras: resumen contra mi corrida
Carga antes de correr: 4 % y 10 % (10 s de separación), 18 150 MB libres, 0 procesos `node`; antes del test, 8 %. Una suite a la vez.

| Qué | Resumen | Mi corrida |
|---|---|---|
| `cd frontend; npm run lint` | `> tsc -b` | `> tsc -b`, salida 0 |
| `cd frontend; npm test` | `Test Files 144 passed (144)` · `Tests 2188 passed (2188)`, 81.17 s | `Test Files 144 passed (144)` · `Tests 2188 passed (2188)`, 81.86 s, sin tiempos límite |
| `cd frontend; npm run build` | `✓ built in 657ms` | `✓ built in 619ms`, salida 0 |
| raíz `npm run build` · `npm run lint` | `✓ built in 639ms` · `> tsc -b` | `✓ built in 614ms` · `> tsc -b`, salida 0 en ambos |
| `npx vitest list` | 2188 en 144 (+46, +2) | 2188 en 144 |
| Por ID | 1E01 6 · 1E02 10 · 1E03 9 · 1E04 4 · 1E05 4 · 1E06 4 · 1E07 6 · 1E08 3 = 46 | iguales, 46 |
| Títulos | 45 citados (PR-1E02 "maestro/admin" con `it.each`) | todos existen. Los 13 títulos exactos del plan para PR-1E06, PR-1E07 y PR-1E08 coinciden carácter por carácter |
| Los 10 rojos esperados | en verde | en verde, dentro de la corrida completa |
| V-01 | 157/157 | 157/157: `diff` vacío contra la tabla de "Complementaria 2: C-15" de `reporte-tester.md` |

**"No se toca".**
- En `features/tareas` cambian solo `components/acciones-de-la-tarea.tsx` (el destino `${base}/trabajo` y dos comentarios), `detalle-tarea-view.test.tsx` (I-2 de C-15) y `tareas-01d-r1.ataque` (reescrita por el tester, C-15).
- `components/ui/**`, `components/cargando.tsx` y `components/layout/**` sin cambios; en `layout` solo cambia `estatico-r1.ataque`, reescrita por el tester.
- En `app/` solo `router.tsx`.
- `backend`, `shared` e `infra` sin cambios.
- Los archivos protegidos por hash coinciden con `aprobacion.md`: ESSENTIALS `9aef6ec5`, `ARCHITECTURE.md` `21638fa4`, `PRD.md` `1b750158`, `CLAUDE.md` `ba2028d4` y `programador.md` `30e26fff`.

**Regla 9.** Ninguna importación `@/features/` fuera de `app/`.

### Enmiendas 5 y 6 en el código
- **Limitador (`features/clases/lib.ts:227`).** No usa React. Cumple el contrato:
  - con `signal` ya abortado rechaza con `DOMException` `AbortError` sin formar la tarea;
  - el oyente de `abort` se agrega solo al formar y se quita al arrancar o al abortar;
  - `correr` sube `enCurso` en la parte síncrona y lo baja en `finally`, que llama a `entrarLaSiguiente` en el mismo turno;
  - no hay reinicio ni exportación para pruebas.
- **Instancia única** `limiteDeTrabajo` en `hooks.ts:717`, usada dentro del `queryFn` de `useTrabajo`. Pide `limite` 5 sin cursor y 20 con cursor; el `signal` de TanStack Query va a la vez a `api` y a `ejecutar`.
- **Constantes en `data.ts:449-451`:** 5, 20 y 6.
- **Orden:** "Sin tema" primero, en `seccionesDeTrabajo`.
- **Espera:** un tema que espera muestra `Cargando` con "Cargando `<tema>`" (§7.10).
- **Campo "Tema" del muro:**
  - se pide solo con "Material" (`enabled`);
  - con la lista pendiente o vacía no aparece;
  - con la lista fallida y sin datos, una nota en línea (`text-small`, `text-muted-foreground`), sin `role="alert"` ni aviso;
  - sin `disabled`;
  - un tema que desaparece no viaja (`temaIdEfectivo`).
- **PR-1E07:**
  - el doble rechaza con `AbortError` (línea 191), cuenta lo que tiene en vuelo y no usa temporizadores reales;
  - los 5 casos que retienen respuestas terminan con `expect(servidor.enVuelo()).toBe(0)`;
  - el caso 3 ("limite=5 … limite=20") **no retiene respuestas** y termina sin esa aserción (ver M-01).

### Lista de diseño (01e)
- **Tokens:** sin colores, tamaños, radios ni sombras sueltos; ningún `text-sm`/`rounded-lg`/`shadow-*` ni hex. El único valor arbitrario nuevo es `translate-x-[300%]` (C-14).
- **Componentes de `ui/`:** `Card`, `Button`/`buttonVariants`, `NativeSelect`, `Input`, `Badge`, `ErrorDeCampo`, `EstadoVacio`, `Cargando` y `MensajeError`. Nada hecho a mano que ya exista.
- **Vidrio:** `vidrio-fuerte` solo en `fila-de-entrega.tsx` y `elemento-de-trabajo.tsx` (C-14, V-07 en verde). Las secciones, la vista de categorías y los formularios toman su vidrio de `Card`. Las filas del editor de categorías van sobre `--muted`, sin vidrio sobre vidrio.
- **Rasgos prohibidos:** ninguno (sin degradados ni `backdrop-blur`).
- **Estado nunca solo con color:**
  - la fila de entrega dice el estado con el texto de `vencimientoDe`, el cuadro es `aria-hidden` y el enlace empieza con "Tarea:" (`sr-only`);
  - el total de categorías va en `role="status"` con texto ("Faltan 20 %" / "Sobran 10 %").
- **Una acción principal por vista:**
  - "Trabajo de clase": "Crear tarea" (`primary`, S-18); "Nuevo tema" y "Categorías de calificación" son `outline`;
  - categorías: "Guardar categorías";
  - el muro sigue con publicar, y su "Crear tarea" es `outline`.
- **Textos:** todos en `data.ts`, en español de México, concretos, sin emojis. Los mensajes del servidor de los 7 códigos nuevos están en español (`core/tareas/temas.ts` y `categorias.ts`).
- **Estados:**
  - error → cargando → vacío → datos en las dos vistas y en cada sección;
  - tema vacío con su texto;
  - "Trabajo de clase" vacío con `EstadoVacio`. Su CTA para maestro y admin son "Crear tarea" y "Nuevo tema", siempre visibles arriba. El estudiante no tiene acción posible;
  - categorías vacías con "Agregar categoría".
- **360 px:** las cuatro secciones del admin se desplazan dentro de su panel (`max-w-full overflow-x-auto`, `w-max`); `wrap-anywhere` y `line-clamp-2` en los títulos. El aspecto real queda para la comprobación humana (H-6).
- **Foco y etiquetas:**
  - el foco sigue §7.14 al crear, renombrar, subir, bajar, borrar tema (`seccionVecina`), mover, "Ver más" y quitar o agregar fila (llave estable);
  - el destino nunca es `<body>` y tiene casos;
  - las etiquetas llevan el nombre como `sr-only`;
  - el encabezado de la vista es un `h2` `sr-only` con `tabIndex={-1}`, igual que el precedente de `muro-view.tsx`. Que el foco se vea sobre él queda para la comprobación humana.
- **`ErrorDeCampo`:** en el formulario de tema, el editor de categorías (fila y lista) y "Tema".
- **`enEspera`:** exactamente los 49 de V-06 (en verde).
- **`autoComplete="off"`:** en el formulario de tema, las dos columnas del editor, "Mover" y "Tema".
- **`DESIGN.md`:** todo lo nuevo está documentado con la marca "propuesta (TAREAS-01e)" y coincide con el código:
  - §7.3, cuatro opciones y el desplazamiento;
  - §7.16, "Trabajo de clase" como segunda sección;
  - §7.18, "Tema" del material y O-18;
  - §7.22 nueva: orden, sección, carga de 5 con tope de 6 y espera como §7.10, fila de tarea `size-11`, material, controles, foco y recarga fallida;
  - §7.23 nueva: el editor, sin categorías, validación y foco.

### Estilo de `CLAUDE.md`
- **Tipos:** en `hooks.ts`, `lib.ts` y `data.ts` hay 0 declaraciones. La excepción es **`interface FocoPendiente` en `components/editor-de-categorias.tsx:31` (M-01)**.
- **Otras reglas:** sin `?? []`; sin `disabled`; sin ternarios anidados en JSX; `try/catch` y aviso en los manejadores; avisos en los hooks.
- **Textos:** `TEXTOS_CLASE.sinAcceso` toma `TEXTOS_DE_LA_CLASE.sinAcceso`. El `sinAccesoALaClase` repetido de `features/clases/data.ts` ya estaba en `1118c1a`: no es de 01e y se suma a O-2 de 01d.

### M-01 — Un tipo que no es de Props en un componente, y una afirmación del resumen que no es exacta
Dónde:
- (a) `frontend/src/features/clases/components/editor-de-categorias.tsx:31`, `interface FocoPendiente`;
- (b) `trabajo-view.test.tsx`, caso "PR-1E07 · la primera página de cada tema pide limite=5 y Ver más pide limite=20" (línea 921).

Por qué importa:
- (a) `CLAUDE.md`, regla 6: "Las interfaces de Props son los ÚNICOS tipos permitidos en el archivo de un componente". Es el mismo patrón que M-01 de estilo de 01d.
- (b) El resumen dice que **cada** caso de PR-1E07 termina con `expect(servidor.enVuelo()).toBe(0)`, y el caso 3 no lo hace. Ese caso no retiene respuestas, así que no deja lugares ocupados, pero la afirmación debe ser exacta.

Qué se espera:
- `FocoPendiente` en `features/clases/types.ts`.
- El caso 3 termina con la misma aserción, o el resumen dice cuáles la llevan.
- Sin cambio de comportamiento, con lint y test en verde.
- Opcional: el cálculo en línea de `errorDeLaLista` (`editor-de-categorias.tsx:55-60`) puede pasar a `lib.ts` como función pura (regla 3).

### Arbitrajes
1. **Campo "Tema" con temas cargados y una recarga fallida: se acepta.**
   - La lista que se tenía sigue siendo válida para elegir, y si el tema elegido desapareció no viaja (`temaIdEfectivo`).
   - Es coherente con M-01 de 01d (no desmontar lo que se está usando por un fallo de recarga).
   - La nota solo aparece sin datos.
2. **`CODIGOS_CON_MENSAJE_DEL_SERVIDOR` suma 7 códigos: se acepta.**
   - Los 7 traen mensajes del backend en español y pensados para la persona ("Ya hay un tema con ese nombre.", "Ese tema ya no existe.", "Esa categoría ya no existe. Elige otra.", etc.).
   - Es la misma convención que los códigos ya presentes.
3. **Textos no listados en el plan: se aceptan.**
   - Son singulares, etiquetas `sr-only`, "—" para un día ilegible y los dos avisos de recarga, que siguen el patrón de 01d.
   - Viven en `data.ts`, siguen §9 y no duplican `components/clase/data.ts`.
4. **La lista de una sección que falla al recargar se reemplaza por `MensajeError`, mientras temas y categorías conservan la vista: se acepta.**
   - Una sección no tiene nada escrito que perder; "Mover" solo guarda una elección.
   - Sigue el precedente del muro y §7.22 ("Un fallo solo afecta a su sección").
   - Evita apilar hasta 31 avisos.
   - Si la persona tenía el foco en la sección, va al `h2` del tema.
5. **`seccionVecina` solo entre las secciones que ya estaban: se acepta.** Es lo correcto: "Sin tema", que aparece en el mismo cambio, no es la vecina del tema borrado. Tiene su caso.
6. **Editor de categorías: se acepta.**
   - Que la lista no cambie mientras guarda es el mismo criterio que T-10 de 01d.
   - Aceptar un "%" pegado está en el punto de ataque 2.
   - Partir de la lista del servidor tras un 409 o 404 también se acepta. Es un guardado en bloque de hasta 10 filas cuyo estado ya no coincide con el del servidor, así que reconciliar fila por fila sería más riesgoso que volver a la verdad del servidor con su mensaje.
   - Queda como observación para el humano: tras ese conflicto se pierden los cambios no guardados de las demás filas. El aviso dice el porqué (el mensaje del servidor), pero no que se descartaron los cambios.
7. **`CategoriasView` desde una ruta de estudiante dice "No tienes acceso a esta clase." sin pedir nada: se acepta.** Es una defensa extra: el router no la monta y el backend lo niega.
8. **`w-max`: se acepta.** Es una utilidad de la escala, no un valor arbitrario.
9. **`IncidenciaValidacion` desde `./types`: se acepta.** Es el mismo precedente aceptado en 01d.

**El comentario de `features/tareas/hooks.ts:153` ("navega al muro"):**
- El archivo está en "No se toca" de 01e, salvo el destino tras borrar.
- Ese comentario describe justamente ese destino, así que cambiarlo cabe en el espíritu de la excepción. Aun así, la regla del orquestador es pedir autorización antes de instruir un cambio en un archivo de la lista.
- Recomiendo que el humano autorice esa sola línea de comentario, que se aplique en el carril trivial al cerrar 01e (junto con la corrección de M-01 si coincide) y que yo la verifique en la revisión final.
- No bloquea: el comportamiento ya es "Trabajo de clase".

### Para el humano
- Observación del arbitraje 6: tras un conflicto 409 o 404 al guardar categorías, el editor vuelve a la lista del servidor y se pierden los cambios no guardados de las demás filas.
- Comprobación final de 01e:
  - H-3 (lector de pantalla con muchos temas);
  - H-6 (cuatro secciones a 360 px);
  - el foco visible sobre los encabezados `sr-only` de las vistas.

## Verificación del resumen — TAREAS-01e — corrección de la ronda 1
Fecha: 2026-10-07. Resumen verificado: "## TAREAS-01e — Corrección de la ronda 1" de `resumen-programador.md`, contra "## TAREAS-01e — Ronda 1" de `reporte-tester.md` (T-16, T-17 y T-18).

Veredicto: **DEVUELTO**, por M-01 (el estado vecino que pidió revisar el coordinador) y por M-02 (arbitraje a).
- Las cifras, los títulos, V-01 y "No se toca" coinciden.
- T-16 y T-18 están bien corregidos.
- El M-01 de la verificación de la implementación quedó cerrado: `FocoPendiente` y `CampoDeLaFila` están en `types.ts`, y el caso 3 de PR-1E07 ya termina con `enVuelo() === 0`.

### Cifras: resumen contra mi corrida
Carga antes de correr: 20 % y 15 % (10 s de separación), 17 976 MB libres, 0 procesos `node`; antes del test, 17 %. Una suite a la vez.

| Qué | Resumen | Mi corrida |
|---|---|---|
| `cd frontend; npm run lint` | `> tsc -b` | `> tsc -b`, salida 0 |
| `cd frontend; npm test` | `Test Files 146 passed (146)` · `Tests 2212 passed (2212)` | `Test Files 146 passed (146)` · `Tests 2212 passed (2212)`, 82.67 s, sin tiempos límite |
| `cd frontend; npm run build` | `✓ built in 698ms` | `✓ built in 628ms`, salida 0 |
| raíz `npm run build` · `npm run lint` | `✓ built in 627ms` · `> tsc -b` | `✓ built in 630ms` · `> tsc -b`, salida 0 en ambos |
| `npx vitest list` | 2212 en 146 (+11) | 2212 en 146 |
| Títulos | 11 (T-16 ×4 con `maestro`/`admin`, T-17 ×3, T-18 ×4) | los 11 existen con su título exacto |
| Los 4 rojos de la ronda 1 | en verde | en verde, dentro de la corrida completa |
| V-01 | 159/159 | 159/159 (`diff` vacío contra la tabla del cierre de la ronda 1 de 01e). Ninguna `*.ataque` tocada |

"No se toca": fuera de `features/clases`, el diff contra `1118c1a` sigue siendo el mismo de la implementación. En `features/tareas` solo cambian el destino en `acciones-de-la-tarea.tsx`, la I-2 y la `*.ataque` de C-15. `components/ui`, `layout` (salvo su `*.ataque`), `styles`, `vitest.config.ts`, `backend`, `shared` e `infra` no cambian.

### Hermanos y estados vecinos contra el código
**T-16.**
- Lo que se pinta según la perspectiva:
  - "Mover" y su selector solo con `gestionar && elemento.puedeMover` (`seccion-de-tema.tsx:112`);
  - los controles de tema, con `gestionar && tema !== null` (`:280-292`).
- Cada caso tiene el suyo: "Sin tema" en estudiante, maestro y admin; "Ver más" visible para el estudiante; sin `puedeMover` no hay "Mover".
- `…/categorias` del estudiante y las acciones de 01d ya estaban cubiertas.
- Correcto.

**T-17.**
- El error que se muestra bajo el total sale ahora solo de `errores[CAMPO_DE_LA_LISTA]`.
- `quitar` filtra los errores de la llave quitada con `erroresSinLaFila`. El prefijo `${llave}.` lleva el punto, así que "nueva-1" no se lleva los de "nueva-10".
- Cada caso tiene el suyo: nombre y peso, cliente y servidor, primera, del medio y última fila, quitar y agregar, el total y el error de lista que se conserva.
- **Pero el "no aplica" del respaldo no es cierto:** ver M-01.

**T-18.** `filasDelServidor` (`lib.ts:457`) busca la llave primero por id y, solo para las filas nuevas (sin id), por `claveDeNombre`. Revisé los casos dudosos:
- **Dos filas nuevas con el mismo nombre normalizado:** no llegan al reemplazo. El esquema del cliente y el servidor las rechazan con la misma `claveDeNombre`, así que no hay respuesta exitosa que reconciliar.
- **Una fila guardada renombrada en el mismo guardado:** se reconcilia por id, nunca por nombre.
- **¿Puede la llave saltar de una fila a otra?** No. Las llaves de las filas nuevas son `nueva-N` y las de las guardadas son su id, así que dos filas del servidor no pueden recibir la misma llave. Tras un conflicto, una categoría ajena con el mismo nombre que una fila nueva toma la llave de esa fila: es la misma fila para la persona, y el foco se queda en ella. Aceptable.
- **El respaldo de foco** solo actúa si el foco se perdió (`soloSiSePerdio`). Va al mismo campo por `data-campo`; si la fila ya no está, al primer campo; sin filas, a "Agregar categoría".
- **Lo que tiene caso:** 409 o 404, dos guardados seguidos, "Guardar categorías", y Enter desde "Nombre" y desde "Peso". "Quitar" de una fila nueva sigue el mismo camino por `data-campo`; está declarado sin caso propio y es razonable.
- Correcto.

### M-01 — El editor de categorías no es inmutable en todos los caminos mientras guarda, y se quitó el respaldo que cubría ese caso
Dónde: `components/editor-de-categorias.tsx`. `cambiar` (79), `agregar` (86), `quitar` (94) y `handleSubmit` (115) se protegen con `if (guardar.isPending) return`.

Por qué importa:
- `isPending` llega al componente **en el render siguiente**. TanStack Query 5.103 avisa a sus observadores con `notifyManager`, cuyo programador por defecto es `setTimeout(cb, 0)` (`query-core/build/modern/notifyManager.js:7`).
- Entre `guardar.mutate(…)` y ese render, un segundo evento pasa la guarda: un "Quitar", otro Enter, escribir o agregar. Por clic, Enter o teclado, todos los caminos tienen la misma ventana. En pruebas basta con dos `fireEvent` seguidos.
- En ese caso:
  - el error del servidor de la fila quitada **se pierde en silencio**, porque ya no existe el respaldo que lo mostraba como error de la lista;
  - si el guardado tiene éxito, `filasDelServidor(enviadas, …)` **devuelve la fila quitada** sin aviso.
- El resumen dice "ese camino no existe" para justificar quitar el respaldo. Por la regla de hermanos y estados vecinos, un "no aplica" que no coincide con el código devuelve el resumen.
- **Precedente en el mismo encargo:** el formulario de tarea de 01d marca la guarda **de forma síncrona** con `guardandoRef` antes del primer `await`.

Qué se espera:
- Una guarda síncrona: un ref que se marca antes de `mutate` y se libera al asentarse. La comparten `cambiar`, `agregar`, `quitar` y `handleSubmit`, así que la lista no cambia entre el envío y la respuesta por ningún camino.
- Un caso que lo pruebe: el envío y un "Quitar" (o un segundo Enter) en el mismo turno. La fila sigue y se envía un solo `PUT`.
- **Hermanos que el resumen debe revisar con el mismo criterio:**
  - `FormularioTema` (`guardando = crear.isPending || renombrar.isPending`): doble Enter, envío y cancelar;
  - la confirmación de borrar tema;
  - "Subir" y "Bajar", que ya dicen "mientras uno está en vuelo, los demás no actúan";
  - "Mover";
  - "Ver más".
  
  Uno por uno, cada uno dice si su guarda es síncrona o por qué no hace falta.

### M-02 (arbitraje a) — "Cancelar" del formulario de tema con el envío en vuelo
**Decisión: se corrige en 01e.** Como el resumen vuelve por M-01, cuesta una línea y un caso.
- Hoy el formulario se cierra como si nada se hubiera guardado, pero el tema se crea o se renombra y sale "Tema creado". Esa contradicción, en el mismo formulario, es justo el estado vecino que este encargo viene pagando con rondas extra.
- **Qué se espera:**
  - "Cancelar" no actúa mientras el envío está en vuelo: retorno temprano con la guarda síncrona de M-01;
  - sin `enEspera` y sin `disabled`, así que V-06 y C-14 no cambian;
  - el botón sigue en el orden de tabulación;
  - un caso: "Cancelar" con "Crear tema" en espera no cierra el formulario, y al llegar la respuesta el foco vuelve a "Nuevo tema" como al guardar.
- **Hermanos:** el "Cancelar" de la confirmación de borrar tema con "Sí, borrar tema" en espera, y el de renombrar.

### Arbitraje (b) — "Sin tema" duplicado entre `features/clases/data.ts` y `features/tareas/data.ts`
**Queda en ESTADO §3 junto con O-2 de 01d** (`categoriaRequerida` y `sinAccesoALaClase` duplicados). Destino: el primer encargo que abra `features/tareas` (ENTREGAS), por el carril trivial, moviendo los textos compartidos a `components/clase/data.ts`.
- No se mueve al cerrar 01e: tocaría código en un archivo protegido al final de la subentrega, sin necesidad funcional.
- El comentario de `features/tareas/hooks.ts:153` sigue con lo que recomendé en la verificación de la implementación: una línea de comentario, con autorización del humano al cerrar 01e. Si el humano prefiere no tocar nada protegido en el cierre, va al mismo destino.

### Para el humano
Nada nuevo que decidir. M-01 y M-02 son correcciones dentro del plan.

## Verificación del resumen — TAREAS-01e — corrección de M-01 y M-02
Fecha: 2026-10-07. Resumen verificado: "## TAREAS-01e — Corrección de M-01 y M-02" de `resumen-programador.md`.

Veredicto: **ACEPTADO**. Pasa a la ronda 2 del tester, sin M-nn.

### Cifras: resumen contra mi corrida
Carga antes de correr: 3 % y 7 % (10 s de separación), 18 062 MB libres, 0 procesos `node`. Una suite a la vez.

| Qué | Resumen | Mi corrida |
|---|---|---|
| `cd frontend; npm run lint` | `> tsc -b` | `> tsc -b`, salida 0 |
| `cd frontend; npm test` | `Test Files 146 passed (146)` · `Tests 2220 passed (2220)` | `Test Files 146 passed (146)` · `Tests 2220 passed (2220)`, 83.43 s, sin tiempos límite |
| `cd frontend; npm run build` | `✓ built in 641ms` | `✓ built in 637ms`, salida 0 |
| raíz `npm run build` · `npm run lint` | `✓ built in 660ms` · `> tsc -b` | `✓ built in 643ms` · salida 0 |
| `npx vitest list` | 2220 en 146 (+8: 2 en categorías, 6 en trabajo) | 2220 en 146 |
| Títulos | 8 | los 8 existen con su título exacto |
| V-01 | 159/159 | 159/159, contra la tabla del cierre de la ronda 1 de 01e. Ninguna `*.ataque` tocada |

"No se toca": fuera de `features/clases`, el diff contra `1118c1a` no cambia. En `features/tareas` siguen solo el destino, la I-2 y la `*.ataque` de C-15. `vitest.config.ts`, `components/ui`, `layout`, `styles`, `backend`, `shared` e `infra` no cambian.

V-06 sigue en 49 (en verde) y no apareció ningún `enEspera` nuevo; `formulario-tema.tsx` sigue con 1.

### Hermanos contra el código
- **Editor de categorías (`guardandoRef`):** se marca después de validar y justo antes de `guardar.mutate`, y se libera en `onSettled`, que corre en éxito y en error. `cambiar`, `agregar`, `quitar` y `handleSubmit` lo consultan.
  - Con esto, lo que el resumen dice ahora de T-17 es cierto: ninguna fila sale de la lista entre el envío y la respuesta.
  - Así que quitar el respaldo de "error de fila sin fila" ya es correcto.
  - El programador corrigió por escrito su "no aplica" anterior.
- **Formulario de tema (`enviandoRef`):** se marca antes de `crear.mutate` o `renombrar.mutate` y se libera en `onSettled`. `handleSubmit` y `handleCancelar` lo consultan (M-02). Al llegar la respuesta, `onSuccess` → `onTerminar` cierra el formulario, y el foco vuelve a "Nuevo tema" o a "Renombrar"; los dos tienen caso. Si falla, el formulario sigue abierto y "Cancelar" vuelve a actuar.
- **Borrar tema (`borrandoRef`):** `confirmarBorrado` lo marca antes de `borrar.mutate` y lo libera en `onSettled`. `cancelarBorrado` no actúa mientras está marcado, así que la confirmación no se dispara dos veces en el mismo turno. Tiene caso.
- **Subir y Bajar (`ordenandoRef`):** se marca antes de `ordenar.mutate` y se libera en `onSettled` junto con `ordenEnVuelo`. Sale el primer orden y no un segundo calculado con la lista vieja. Tiene caso.
- **Mover (`moviendoRef`):** se marca antes de `mover.mutate` y se libera en `onSettled`. Tiene caso.
- **"Ver más":** el "no aplica" es correcto. `fetchNextPage({ cancelRefetch: false })` (`seccion-de-tema.tsx:129`) llega a `Query.fetch`, que mira de forma síncrona el `fetchStatus` de la consulta y, si hay una página en vuelo, devuelve la misma promesa (`query-core/build/modern/query.js:299`). Tiene caso.
- **Rúbrica de 01d:** el "no aplica" es correcto y está protegida.
- **`Escape`:** ningún componente lo escucha.
- **Aborto:** las mutaciones no se abortan al desmontar. Si el componente se desmonta, el ref muere con la instancia, así que no queda ninguna guarda trabada.
- **Mutación de comprobación:** con las guardas viejas fallan 7 casos, coherente con los 7 casos de guarda síncrona.

### Detalle menor (no bloquea; para la ronda 2 o el carril trivial)
Con `cancelRefetch: false`, si "Ver más" se pulsa mientras la consulta del tema se está recargando en segundo plano (por ejemplo, tras una invalidación), el clic se une a esa recarga y no pide la página siguiente. El botón no está en `enEspera`, porque `isFetchingNextPage` es falso, así que parece activo y no hace nada. Es un caso raro: basta con volver a pulsar.

## Verificación del resumen — TAREAS-01e — corrección de T-19
Fecha: 2026-10-07. Resumen verificado: "## TAREAS-01e — Corrección de la ronda 2 (T-19)" de `resumen-programador.md`, contra "## TAREAS-01e — Ronda 2" de `reporte-tester.md`.

Veredicto: **ACEPTADO**. Pasa a la ronda 3, la última del tope. Sin M-nn.

### Cifras: resumen contra mi corrida
Carga antes de correr: 19 % y 16 % (10 s de separación), 18 129 MB libres, 0 procesos `node`. Una suite a la vez.

| Qué | Resumen | Mi corrida |
|---|---|---|
| `cd frontend; npm run lint` | `> tsc -b` | salida 0 |
| `cd frontend; npm test` | `Test Files 148 passed (148)` · `Tests 2237 passed (2237)` | `Test Files 148 passed (148)` · `Tests 2237 passed (2237)`, 84.13 s, sin tiempos límite |
| `cd frontend; npm run build` | `✓ built in 752ms` | `✓ built in 633ms`, salida 0 |
| raíz `npm run build` · `npm run lint` | `✓ built in 614ms` · `> tsc -b` | `✓ built in 661ms` · salida 0 |
| `npx vitest list` | 2237 en 148 (+3) | 2237 en 148 |
| Títulos | 3 | existen los 3: dos "T-19 · …" en `trabajo-view.test.tsx` y uno en `muro-view.test.tsx` |
| Rojo de la ronda 2 | en verde | `trabajo-01e-r2.ataque` › "pulsar «Ver más de <tema>» mientras su lista se recarga no se pierde…", en verde |
| V-01 | 161/161 | 161/161 contra la tabla del cierre de la ronda 2 de 01e. Ninguna `*.ataque` tocada |

**"No se toca":** intacto. Fuera de `features/clases`, el diff contra `1118c1a` no cambia.

**Regresión del muro:** todas las `*.ataque` del muro siguen en verde dentro de la corrida completa (`muro-c-r1`, `muro-c-r2`, `archivos-d-*`, `segmentado-02d-r1`).

### El remedio contra el código
- `seccion-de-tema.tsx:133` y `muro-view.tsx:150` pasan a `enEspera={….isFetching}`: es la misma condición de un `enEspera` que ya existía.
- V-06 sigue en 49, con 4 en `seccion-de-tema.tsx` y 1 en `muro-view.tsx`.

**¿El botón se queda "pegado"?** No.
- `isFetching` incluye la espera en el limitador y el reintento de `retry: 1`. Con 31 temas y una invalidación del prefijo, una sección puede esperar varias tandas de 6, o un reintento de 1 s tras un 503.
- Es aceptable:
  - la espera es real, porque la sección se está recargando y pedir la siguiente página antes sería pedirla sobre datos que van a cambiar;
  - el botón muestra su indicador de carga (`enEspera`, `aria-busy`), que es el motivo visible;
  - las lecturas son de 5 elementos por índice, así que la espera típica dura poco.
- No hay sondeo: no hay `refetchInterval` y `refetchOnWindowFocus` está apagado en `app/providers.tsx`. El botón solo entra en espera tras una acción o una reconexión.

**Recarga fallida:** cuando la recarga termina, `isFetching` vuelve a falso. Con error, la sección se reemplaza por `MensajeError` (desviación 4 aceptada) y el botón desaparece, con el foco al `h2` de la sección. Tiene caso, así que la espera no queda abierta para siempre.

### Hermanos
- **Aplicados y probados:** "Ver más de `<tema>`" (el mismo componente para "Sin tema" y todos los temas) y "Ver más publicaciones" del muro.
- **Declarados para ESTADO §3, carril trivial:** "Ver más" de comentarios, del roster de alumnos, de compañeros, de los dos inicios y de la lista de clases del admin. Es el mismo cambio de condición, sin cambiar el conteo de V-06, cada uno con su caso.
  - Destino aceptado: esos archivos no los abre 01e y el remedio es mecánico.
  - Que hoy el clic se pierda durante una recarga en segundo plano es de severidad baja.

### Detalle menor
La fila de estados vecinos cita `refetchOnWindowFocus`, pero está apagado en la app (`app/providers.tsx:14`). El caso real es la recarga al reconectar (`refetchOnReconnect`, activo por defecto), con el mismo `isFetching`. No cambia nada del remedio.

## Verificación del resumen — TAREAS-01e — corrección de T-20 y A-16 (ronda 4 cerrada)
Fecha: 2026-10-07. Resumen verificado: "## TAREAS-01e — Corrección de la ronda 3 (T-20, A-16)" de `resumen-programador.md`, contra "## TAREAS-01e — Ronda 3" de `reporte-tester.md`.

Veredicto: **ACEPTADO**. El tester confirma. Sin M-nn.

### Corrida propia, con hora (zona del equipo, UTC−6)
- **Carga.** Antes del lint (18:55), 43 % y 27 % con 14 377 MB libres. Antes del test, 7 %.
- **Procesos `node`.** Había 6, todos ajenos: `cua-repl.mjs` y `server.mjs` de `…\OpenAI\Codex\runtimes\cua_node\…`. Ninguna suite estaba en curso. No los toqué.
- Corrí una suite a la vez.

| Qué | Resumen | Mi corrida |
|---|---|---|
| `cd frontend; npm run lint` | `> tsc -b` | salida 0 (18:55) |
| `cd frontend; npm test` | 149 / 2241 (desde 18:48:24) | `Test Files 149 passed (149)` · `Tests 2241 passed (2241)`, desde las **18:56:18** (dentro de la ventana de 18:00 a 24:00 en que fallaba T-20), 98.84 s, sin tiempos límite |
| `cd frontend; npm run build` | `✓ built in 827ms` | `✓ built in 754ms` (18:58) |
| raíz `npm run build` · `npm run lint` | `✓ built in 736ms` · `> tsc -b` | `✓ built in 752ms` · salida 0 |
| `npx vitest list` | 2241, sin casos nuevos | 2241 en 149 archivos |
| V-01 | 162/162 | 162/162 contra la tabla del cierre de la ronda 3 de 01e. Ninguna `*.ataque` tocada |

**Zonas horarias.** Corrí los tres archivos corregidos con `TZ=Pacific/Kiritimati`, `Pacific/Pago_Pago` y `America/Santiago`: 86/86 en cada una. Pero en este equipo Node **no aplica** `TZ`: `new Date(2026,9,6,9,0)` siguió saliendo en hora central. Así que esa comprobación **no verifica las zonas**.
- **Lo que sí se puede afirmar, por construcción:** la fecha fija se arma en hora local (`new Date(2026, 9, 6, 9, 0)`), así que en cualquier zona son las 09:00 locales.
- Las fechas derivadas (+30 h → 15:00 del día siguiente; −48 h; +10 días) caen lejos de la medianoche. Un cambio de horario de ±1 h no las mueve de día.
- La aserción de la fila próxima admite "hoy" o "mañana".

### Contra el código
- **Los tres casos corregidos fijan el reloj igual:** `trabajo-view.test.tsx:326`, `tarjeta-de-tarea.test.tsx:88` y `detalle-tarea-view.test.tsx:166`. Usan `vi.useFakeTimers({ toFake: ["Date"] })` y `vi.setSystemTime(new Date(2026, 9, 6, 9, 0))`, con `onTestFinished(() => vi.useRealTimers())`.
  - Solo se simula `Date`: no hay temporizadores falsos que puedan quedar colgados, y TanStack Query y `waitFor` siguen con temporizadores reales.
  - El reloj se restaura aunque la prueba falle.
- **Hermanos, con `grep` propio** (`Date.now`, `new Date()`, `setSystemTime`, `useFakeTimers`, "Vence" y "Venció") en todas las pruebas normales de 01d y 01e (`features/clases`, `features/tareas`, `lib/vencimiento.test.ts`, `native-select.test.tsx`, `router.test.tsx`):
  - **Fijan el reloj:** los tres corregidos.
  - **Usan un `Date.now` congelado** para provocar fallos en el mismo milisegundo, sin comparar textos relativos: `detalle-tarea-view.test.tsx:878` y `editar-tarea-view.test.tsx:967` (`vi.spyOn(Date, "now")`).
  - **Usan fechas absolutas:** `formulario-tarea.test.tsx` (`FECHA_LOCAL`).
  - **Pasan un `AHORA` explícito:** `lib/vencimiento.test.ts`.
  - **`features/tareas/lib.test.ts:24`:** `futuro()` arma una fecha a 5 días de la hora real solo para `estadoValido`. `fechaLimiteSchema` es `z.iso.datetime` y no exige que sea futura, así que la única aserción sobre ella es `toMatch(/Z$/)`. Ninguna aserción depende de la hora: es cierto.
  - Los demás archivos no calculan fechas relativas.
- **A-16:** `git diff 1118c1a -- frontend/src/features/tareas/hooks.ts` es exactamente una línea: "// navega al muro)." → "// navega a Trabajo de clase).".
- **Regla nueva de `.claude/agents/tester.md` (línea 21):** "Toda prueba que compare fechas o textos relativos al tiempo fija el reloj; una prueba que depende de la hora real es hallazgo." SHA-256 `a0899014…38a5`, igual al de `aprobacion.md`.
- **"No se toca":** intacto salvo lo autorizado.
  - En `features/tareas` cambian el destino (`acciones-de-la-tarea.tsx`), las pruebas `detalle-tarea-view.test.tsx` (I-2 de C-15 y el hermano de T-20), la línea de A-16 y la `*.ataque` de C-15.
  - En `.claude` solo cambia `tester.md`.
  - `CLAUDE.md`, `AGENTS.md`, ESSENTIALS, `ARCHITECTURE.md`, `PRD.md`, `components/ui`, `styles`, `vitest.config.ts`, `backend`, `shared` e `infra` no cambian.

## Revisión final — TAREAS-01e y cierre del encargo
Fecha: 2026-10-07. Bases: 01e dentro de los paquetes, `<K1d>` = `1118c1a`; encargo `<R>` = `ad070b9`, con FIX-CLASES entrando por `<M1>` = `07e4ab7`.

Veredicto de 01e y del encargo TAREAS-01: **APROBADO CON OBSERVACIONES.** No hay problemas que bloqueen. Las observaciones tienen destino, y el cierre necesita el texto de `CLAUDE.md` (A-9) y el commit `<K1e>`.

Verificación propia, una suite a la vez:
- **Frontend:** lint 0 · test `Test Files 150 passed (150)` · `Tests 2243 passed (2243)` (19:07:56, 101.74 s, sin tiempos límite) · build `✓ built in 701ms`.
- **Raíz:** build `✓ built in 706ms` y lint, salida 0.
- **Backend:** lint 0 · test `Test Files 172 passed (172)` · `Tests 2159 passed (2159)` (19:11:49, 146.93 s), con PA-07 en orden. `shared` build 0.

### Problemas que bloquean
Ninguno.

### 1. Diff de 01e contra el plan
- **Tamaño.** `git diff 1118c1a --stat` da 31 archivos versionados, +4576 y −67. Sin versionar hay 16 archivos nuevos, todos en `features/clases`: 10 de producción y pruebas del programador y 6 `*.ataque` del tester.
- **Fuera de `frontend/src`** solo cambian:
  - `docs/DESIGN.md`;
  - `.claude/agents/tester.md`, la regla del reloj: SHA-256 `a0899014…38a5`, igual a `aprobacion.md`;
  - `docs/ESTADO.md` y la carpeta del encargo.
- **Sin cambios:**
  - `backend` y `shared`, desde `<K1b>` (`git diff --quiet ebfe126 -- backend shared`, salida 0);
  - `infra`, `vitest.config.ts`, `components/ui`, `components/layout` (salvo su `*.ataque`), `styles` y los archivos protegidos por hash: `CLAUDE.md` `ba2028d4`, `AGENTS.md`, ESSENTIALS `9aef6ec5`, `ARCHITECTURE.md` `21638fa4`, `PRD.md` `1b750158` y `programador.md` `30e26fff`.
- **En `features/tareas`** solo cambian:
  - el destino tras borrar (`acciones-de-la-tarea.tsx`);
  - la I-2 de C-15 y el hermano de T-20 (`detalle-tarea-view.test.tsx`);
  - la línea de A-16 (`hooks.ts`);
  - la `*.ataque` de C-15.
- **Contra §D-11 (con las Enmiendas 5 y 6, C-14, C-15, A-15 y A-16).** Está todo lo planeado:
  - "Trabajo de clase" como segunda sección en las tres perspectivas, con cuatro en el admin y desplazamiento horizontal;
  - `TrabajoView` con "Sin tema" primero, el tema vacío sin petición y "Ver más" por tema;
  - la fila de tarea de §7.7 y el material desplegable;
  - la gestión de temas: crear, renombrar, subir y bajar con el orden completo y el 409, borrar con confirmación en línea, y mover con `puedeMover` y `gestionar`;
  - `CategoriasView` con el editor en bloque, el total en `role="status"` y P-01 a;
  - "Tema" en el formulario del muro, con sus estados de C-14;
  - O-18;
  - el destino tras borrar una tarea;
  - el limitador de 6 con la primera página de 5 (Enmienda 5);
  - las listas cerradas de C-14.
- **Solo lo planeado.** Lo demás son decisiones aceptadas en las verificaciones: las nueve desviaciones de la implementación, las guardas síncronas de M-01 y M-02, "Ver más" en espera durante las recargas (T-19, con "Ver más publicaciones" como hermano autorizado) y el reloj fijo de T-20.

### 2. Corrida propia
Carga:
- antes del frontend, 28 % y 31 %;
- antes del backend, 45 % y 33 %, con 14 443 MB libres.

Había 6 procesos `node` ajenos (servidores de Codex en `…\OpenAI\Codex\…`), sin otra suite en curso; no los toqué.

| Comando | Resultado |
|---|---|
| `cd frontend; npm run lint` | `> tsc -b`, salida 0 (19:07) |
| `cd frontend; npm test` | `Test Files 150 passed (150)` · `Tests 2243 passed (2243)`, 101.74 s, sin tiempos límite (esperado 150 / 2243) |
| `cd frontend; npm run build` | `✓ built in 701ms` |
| raíz `npm run build` · `npm run lint` | `✓ built in 706ms` · salida 0 |
| `cd shared; npm run build` (R-17) | salida 0 |
| `cd backend; npm run lint` | salida 0 (`tsc -p tsconfig.test.json` al final) |
| `cd backend; npm test` | `Test Files 172 passed (172)` · `Tests 2159 passed (2159)`, 146.93 s (esperado 172 / 2159) |

- **PA-01:** la red activa es `IZZI-F281`, perfil Público, que ESTADO §5 declara de confianza. La regla "Campus: bloquear entrada a Docker en redes publicas" está habilitada, Inbound/Block/Public. Docker 28.5.1 encendido.
- **PA-07, sobre la salida completa del backend:**
  - `40P01` 0, `deadlock detected` 0, `could not serialize` 0, `too many clients` 0;
  - `"Error no controlado"` = **10** (I-1): 5 "fallo simulado de la base en la búsqueda", 1 "fallo simulado de la base al crear la sesión", 1 "boom" y 3 de validación provocada;
  - `"code":"P2028"` = **5**, todos de transacción vencida o `timeout` por retención deliberada, ninguno de `maxWait` ("Unable to start a transaction"). Sus llamadas son `tx.sesion.findFirst`, `tx.sesion.create`, `tx.sesion.updateMany`, `tx.tokenCuenta.updateMany` y `$queryRawUnsafe`, los 5 permitidos de `servicio-ocupado` y su control positivo.

### 3. V-01
- **163/163** contra la tabla de la ronda 4 cerrada de 01e: `diff` vacío.
- En 01e, `git diff 1118c1a --name-status -- '*.ataque.test.*'` muestra 7 modificadas, todas reescritas por el tester:
  - C-11: `clases-admin-02c-r1`, `heredados-02d-r1` y `layout/estatico-r1`;
  - C-12: `segmentado-02d-r1`;
  - C-14: `styles/clases-r1` y `estatico-02c-r1`;
  - C-15: `tareas-01d-r1`.
- Hay 6 nuevas: `trabajo-01e-r1`, `categorias-01e-r1`, `trabajo-01e-r2`, `categorias-01e-r2`, `ver-mas-01e-r3` y `reloj-01e-r4`.
- Ninguna borrada. Sin `.skip`, `.only`, `.todo` ni `skipIf`. El programador no tocó ninguna.

### 4. Definición de terminado
**01e:**
- **RF-43 completo, con las reglas de P-03 de CLASES-01 y P-02:** los temas tienen nombre y orden; "Sin tema" va arriba solo si tiene elementos; borrar un tema pasa sus elementos a "Sin tema"; los gestionan maestros y admin; el alumno los ve agrupados y de solo lectura; el muro sigue cronológico.
- **RF-32 completo, con S-06:** categorías en bloque, pesos que suman 100, máximo 10, y "Quitar" no se ofrece con tareas.
- **RF-12:** el muro tiene el campo "Tema" en el material, con sus estados de C-14.
- **O-18:** cerrado.
- **Capas y módulos:**
  - tipos solo en `types.ts`, incluidos los de M-01;
  - sin `?? []`;
  - regla 9 sin importaciones entre `features/`;
  - todo `fetch` por `apiClient` en hooks.
- **lint, build y test:** en verde.
- **Endpoint o migración:** no hay.
- **Documentos:** `DESIGN.md` con la marca (abajo) y `CLAUDE.md` con el texto de abajo.

**Encargo TAREAS-01 (01a a 01e):**
- **RF-12, parte de tareas:** la tarjeta en el muro (01d) y el campo "Tema" (01e).
- **RF-13:** el detalle de tarea (01d).
- **RF-32:** categorías ponderadas (01a, backend; 01e, interfaz).
- **RF-34:** crear y editar tareas con rúbrica propia (01b, backend; 01d, interfaz).
- **RF-43:** temas (01a y 01e).
- **RF-44, guardar y mostrar:** `acepta_tardias` (01b) y el control segmentado y la política (01d). "Con retraso" llega con ENTREGAS.
- **RN-05, la parte que fija la categoría:** una clase sin categorías califica por puntos; con categorías, toda tarea nueva o editada lleva una. Está en `core` (01b) y en el formulario (01d). El texto ya está en `PRD.md`.
- **RN-06:** todo cuelga de `/api/clases/:claseId/…`, con el sexto paso (01a y 01b).
- **RN-07, aplicada a tareas:** la autoría se decide en `core/autoria.ts`, con P-04 b. La interfaz solo lee `puedeEditar` y `puedeBorrar`.
- **P-01 a P-05 y S-01 a S-18:** reflejados según la recomendación aprobada. Cada subentrega los contrastó en su revisión final; S-15 se aplicó con su visto bueno.
- **Migraciones compatibles:** las dos de 01a, verificadas en la revisión final de 01a. R-04 queda para DEPLOY.
- **Pruebas de autorización de las 13 rutas nuevas:** las 8 de 01a en PR-1A09 y las 5 de 01b en PR-1B14, más las matrices del tester.
- **`infra/` y `.env.example`:** sin cambios en todo el encargo.
- **Documentos de las cinco subentregas:**
  - 01a y 01b: ESSENTIALS (tablas, restricciones, temas, categorías, autoría, archivos y `queue`), `PRD.md` (RN-05 y RN-07) y `ARCHITECTURE.md` (§7, §8, §10, §11 y §14), aplicados y comprobados con `grep`;
  - 01c y 01d: `CLAUDE.md`, aplicado;
  - 01e: falta solo `CLAUDE.md` (abajo).

### 5. Lista de diseño y estilo, sobre el estado final de 01e
Lo que cambió en las correcciones:
- **Guardas síncronas:** `guardandoRef`, `enviandoRef`, `borrandoRef`, `ordenandoRef` y `moviendoRef`. Se marcan antes de `mutate` y se liberan en `onSettled`. Sin `disabled`.
- **"Cancelar" inerte con el envío en vuelo:** no lleva `enEspera` y sigue en el orden de tabulación.
- **"Ver más" en espera durante las recargas:** `isFetching` en los dos botones; V-06 sigue en 49.
- **Foco en el editor de categorías:** llave estable por id o nombre, y respaldo por `data-campo` solo si el foco se perdió.

Lo demás de la lista:
- **Tokens:** solo tokens; único valor arbitrario, `translate-x-[300%]`.
- **Componentes:** los de `ui/`.
- **Vidrio:** solo en las dos filas de C-14 y en `Card`.
- **Estado y color:** el estado se dice con texto (vencimiento, total).
- **Acción principal:** una por vista.
- **Textos:** en `data.ts`, con tono §9 y sin emojis.
- **Estados:** error → cargando → vacío → datos.
- **360 px:** resuelto en el código. El aspecto real va a la hoja de comprobación.
- **Foco visible y etiquetas:** cumplidos.
- **Formularios:** `ErrorDeCampo`, `enEspera` en los 49 y `autoComplete="off"`.
- **`DESIGN.md`:** todo lo nuevo documentado con la marca.
- **Estilo de `CLAUDE.md`:** retornos tempranos, `try/catch` con aviso, avisos en los hooks y sin ternarios anidados.

### 6. Hallazgos
**01e:** todos corregidos y confirmados por el tester (ronda 4 cerrada: RESISTE).
- T-16 ("Mover" por perspectiva).
- T-17 (errores al quitar una fila).
- T-18 (foco al adoptar ids).
- T-19 ("Ver más" durante una recarga).
- T-20 (prueba con la hora real).
- M-01 de estilo (tipo en un componente y la aserción de PR-1E07).
- M-01 y M-02 (guardas síncronas y "Cancelar").

**Encargo:**
- 01a, 01b y 01c: cerrados con sus revisiones finales.
- 01d: T-06 a T-15 y los M-01, cerrados.
- 01e: arriba.
- Lo que queda abierto tiene destino.

**Filas para ESTADO §3** (nuevas o con destino actualizado):

| Pendiente | Destino |
|---|---|
| Los demás "Ver más" de CLASES con el patrón de T-19 (`comentarios-de-publicacion.tsx`, `tabla-alumnos.tsx`, `personas-view.tsx`, `panel-mis-clases.tsx`, `clases-admin-view.tsx`): `enEspera={….isFetching}` con un caso cada uno | Carril trivial (o el primer encargo que abra cada archivo) |
| "Sin tema" duplicado entre `features/clases/data.ts` y `features/tareas/data.ts`, más O-2 de 01d (`categoriaRequerida` y `sinAccesoALaClase`, que también sigue en `features/clases/data.ts`): mover a `components/clase/data.ts` | ENTREGAS (primer encargo que abre `features/tareas`), carril trivial |
| O-1 de 01d (títulos del `it.each` de PR-1D04) y O-3 de 01d (`aria-describedby` de la nota del tope). Su destino decía "01e", pero `features/tareas` estuvo protegido | ENTREGAS (O-3, o el `chore` de accesibilidad) |
| Tras un 409 o 404 al guardar categorías, el editor vuelve a la lista del servidor y descarta los cambios no guardados de las demás filas. El aviso dice el porqué, no que se descartaron | CALIFICACIONES o decisión del humano |
| 31 regiones `role="status"` ("Cargando `<tema>`") con muchos temas esperando | Comprobación humana (punto 7 de la hoja); si satura, el `chore` de accesibilidad |
| Divergencia del criterio de ventana: `document.activeElement` en `features/tareas` frente a `hasFocus()` en CLASES (O-6 de 01d) | `chore` de accesibilidad del marco |
| "Gana el último que guarda" al editar una tarea (O-7 de 01d) | ENTREGAS (decisión del humano, 2026-10-07) |
| Estado vecino real de las recargas en segundo plano: `refetchOnReconnect` (por defecto), no `refetchOnWindowFocus` (apagado) | Nota para quien revise recargas; sin acción |

**Filas que se cierran:**
- el umbral de §7.7 (fila de la línea 304 de ESTADO);
- O-18 de CLASES-02d (fila de la línea 269);
- O-1, O-2 y O-3 de 01d con destino "01e": se reubican, como en la tabla de arriba.

### 7. Documentos
**`CLAUDE.md`, "Al cerrar 01e" (A-9), texto exacto.** La fila `clases` de la tabla de módulos queda:

`| \`clases\` | Inicio de estudiante y maestro, muro con comentarios y adjuntos, código de invitación, compañeros, roster, buscador y alta manual de alumnos; trabajo de clase con temas y categorías de calificación (TAREAS-01); gestión de clases del administrador (\`/admin/clases\`: lista, crear y editar clase, maestros de la clase, y alumnos y muro de cualquier clase) | Estudiante, Maestro, Administrador |`

Va antes de la gestión del administrador para no romper el paréntesis de `/admin/clases`.

**`DESIGN.md`:** todo lo nuevo de 01e lleva la marca "propuesta (TAREAS-01e)" y es coherente con el código:
- §7.3: cuatro opciones y el desplazamiento;
- §7.16: "Trabajo de clase" como segunda sección;
- §7.18: "Tema" del material, O-18 y "Ver más" en espera durante la recarga (aplicado a "Ver más publicaciones"; "Ver más comentarios" queda pendiente, declarado);
- §7.22: carga de 5 con tope de 6, espera como §7.10, fila de tarea, material, controles, guardas, "Cancelar", foco y recarga fallida;
- §7.23: el editor, sin categorías, validación, foco y conflicto.

Las marcas "propuesta (TAREAS-01x)" de 01d y 01e pasan a "propuesta aprobada (fecha)" solo cuando el humano apruebe lo visual tras la comprobación (§11 de `DESIGN.md`).

**ESTADO, "Al cerrar 01e" del plan:**
- se cierran el umbral de §7.7 y O-18;
- el consumidor de `TAREA_CREADA` y `RECORDATORIO_24H` (NOTIFICACIONES) ya está (línea 251);
- los ids de criterios y la regla de P-01 (CALIFICACIONES) ya están (línea 255);
- **falta:** una fila "Venció el … de §7.7 y la zona de entrega ('Tu trabajo')" con destino ENTREGAS;
- R-04 (DEPLOY) ya está (línea 254);
- en §2b: RF-43 y RF-44 (la parte de TAREAS) quedan hechos.

**ESSENTIALS, `ARCHITECTURE.md` y `PRD.md`:** no necesitan nada más para el cierre. Los textos de "Documentos a actualizar" de 01a y 01b están aplicados: lo comprobé con `grep` (temas, categorías ponderadas, autoría con tareas, adjuntos de tareas, `queue` con trabajos diferidos, RN-05, RN-07, §7, §8, §10 y §14). 01c, 01d y 01e solo pedían `CLAUDE.md` y `DESIGN.md`.

### 8. Medición del programador
**01e:**
- Rondas: la 0 (con dos complementarias y C-15), 1, 2, 3 y una 4 cerrada (A-15).
- **0 rondas extra por hermanos.** T-19 era un patrón heredado de CLASES que yo había señalado como detalle; T-20 es una prueba con la hora real.
- 1 PARADA correcta antes de escribir código (PA-16/PA-05).
- Resúmenes devueltos, por mi cuenta: **1 de 5**, la corrección de la ronda 1, por M-01 y M-02. `aprobacion.md` dice "2 de 5", pero el M-01 de estilo de la implementación salió **ACEPTADO** con corrección previa a la ronda 1; no devolvió el resumen.

**Acumulado de TAREAS-01:**
- 3 rondas extra por hermanos: 01a, 1; 01d, 2.
- Resúmenes devueltos, por mi cuenta: **3** (01c, 01d y 01e, uno cada uno). `aprobacion.md` dice 4. La diferencia viene de contar como devueltos los M-01 de estilo de 01d y de 01e, que salieron ACEPTADO. Conviene que el orquestador lo concilie en ESTADO §6.
- El programador corre con `opus` desde la ronda 2 de 01d.

**Recomendación para ENTREGAS:**
- **Seguir con `opus`** (decisión del humano). En 01e no hubo rondas extra por estados vecinos del foco, que era la condición del humano para no rediseñar el mecanismo.
- **Dos reglas para el plan de ENTREGAS**, que nacieron aquí y costaron rondas:
  1. Toda acción que dispara una mutación y no debe repetirse usa una guarda síncrona (ref) además de `enEspera`, porque `isPending` llega en el render siguiente.
  2. Un botón de "Ver más" está en espera con `isFetching`, no solo con `isFetchingNextPage`.

  Propongo que el humano decida si suben a `CLAUDE.md` ("Componentes"), por la regla de "si el humano corrige dos veces lo mismo".

### 9. Para el humano
**Hoja de comprobación humana final.** La regla del 2026-09-28 fija un máximo de 10 minutos y 7 puntos. Junté H-1 a H-7 con los cuatro puntos de 01d en 7 puntos, en orden de ejecución. Necesita la API (el worker no), `campus_dev` con las migraciones, y tu admin, una cuenta de maestro y una de estudiante inscrito en la misma clase.

1. **Maestro, categorías (H-4).** En "Trabajo de clase", "Categorías de calificación": agrega dos con 60 y 30. El total dice "Faltan 10 %" mientras escribes. "Guardar categorías" no pasa hasta llegar a 100 %.
   - *Demuestra:* que el total se lee en vivo en pantalla real.
2. **Maestro, crear tareas (H-1 y H-2).** Crea la tarea A con fecha de mañana a una hora que elijas, dos criterios de rúbrica y un PDF, y una tarea B a dos semanas. Abre el detalle de A: dos columnas en escritorio, y la hora que muestra es la que elegiste. Achica la ventana a 360 px en el detalle y en el formulario de editar: una columna y nada se corta.
   - *Demuestra:* el selector de fecha de tu navegador y tu zona (ninguna prueba ve un selector nativo), y el diseño a 360 px (jsdom no calcula diseño).
3. **Maestro, "Trabajo de clase" (H-3 y H-7).** Con tres temas: "Subir" y "Bajar" con el teclado (el foco sigue en el botón), mueve la tarea B a otro tema y borra un tema (sus elementos pasan a "Sin tema"). La fila de A dice "Vence mañana a las …" en tono de aviso, junto a B en tono neutro.
   - *Demuestra:* que el foco se ve y se mueve bien en un navegador real, y el contraste del tono de aviso.
4. **Estudiante (H-1, segunda mitad).** Ve A en el muro, abre su detalle y ve "Tu trabajo" sin "Editar" ni "Borrar". En "Trabajo de clase" no hay ningún control de gestión ni "Mover".
   - *Demuestra:* la vista real del estudiante con sus datos.
5. **Admin a 360 px (H-5 y H-6, más el contexto opaco de 01d).** Publica una tarea desde la clase: en el muro del estudiante firma "Administración", y el maestro no ve "Editar tarea" ni "Borrar tarea" en su detalle. A 360 px, las cuatro secciones se desplazan dentro de su panel. El formulario y el detalle de tarea en el contexto opaco del admin se leen bien.
   - *Demuestra:* el desplazamiento horizontal y el material opaco, que jsdom no pinta.
6. **Foco con el navegador real (01d, `document.activeElement`).** En el formulario de editar una tarea, con el foco en "Título", cambia de pestaña y vuelve: el foco sigue en "Título". Haz clic en un espacio en blanco de la vista y espera unos segundos: el foco no salta a ningún control. Borra una tarea desde su detalle: llegas a "Trabajo de clase" con el aviso "Tarea borrada".
   - *Demuestra:* el criterio de ventana con `document.activeElement`, que solo se aproximó en jsdom (O-6).
7. **Lector de pantalla (opcional, si lo usas; H-3 y 01d).**
   - En el formulario de tarea: el control segmentado "Entregas después de la fecha límite" se anuncia como grupo con el botón presionado, "Quitar criterio" dice su número, y se anuncian el total y la nota del tope.
   - En una clase con muchos temas, "Trabajo de clase" al abrir no satura los anuncios con muchos "Cargando `<tema>`".
   - *Demuestra:* lo que solo oye un lector real.

Lo que no esté en la hoja queda "no verificado por decisión del humano, cubierto por pruebas automáticas".

**Decisiones que te tocan al cerrar el encargo:**
1. Hacer el commit `<K1e>` (abajo) y abrir el PR de `feat/tareas` a `main`.
2. Tras la hoja, aprobar o ajustar lo visual. Con tu aprobación, las marcas "propuesta (TAREAS-01d/01e)" de `DESIGN.md` pasan a "propuesta aprobada (fecha)".
3. El conflicto de categorías (409 o 404 descarta los cambios no guardados): aceptarlo como está o pedir conservarlos, en CALIFICACIONES.
4. Si suben a `CLAUDE.md` las dos reglas de la sección 8 (guarda síncrona y "Ver más" con `isFetching`).
5. Ya decididos, para recordar: "gana el último que guarda" se decide en ENTREGAS, y el `chore` de accesibilidad rediseña el foco si las rondas no bajan.

**Commit `<K1e>`** (después de aplicar el texto de `CLAUDE.md`):
```
git status
git add CLAUDE.md docs/DESIGN.md docs/ESTADO.md docs/trabajo/TAREAS-01-tareas-temas-y-categorias .claude/agents/tester.md frontend/src/app/router.tsx frontend/src/components/layout/estatico-r1.ataque.test.ts frontend/src/styles/clases-r1.ataque.test.ts frontend/src/features/clases frontend/src/features/tareas/components/acciones-de-la-tarea.tsx frontend/src/features/tareas/hooks.ts frontend/src/features/tareas/detalle-tarea-view.test.tsx frontend/src/features/tareas/tareas-01d-r1.ataque.test.tsx
git commit -m "feat(clases): TAREAS-01e, Trabajo de clase con temas (crear, renombrar, ordenar, borrar y mover), categorías de calificación en bloque, campo Tema del material en el muro y O-18; lecturas de Trabajo de clase con tope de 6 y primera página de 5, y regla del reloj fijo en tester.md"
```

**PR de `feat/tareas` a `main`:**
- **Título:** `feat(tareas): TAREAS-01, tareas con rúbrica, temas y categorías ponderadas (01a a 01e)`
- **Descripción:**
  - **Qué entra:**
    - temas y categorías ponderadas (RF-43 y RF-32);
    - tareas con rúbrica propia, adjuntos, categoría, tema y política de entregas tardías (RF-34 y RF-44, guardar y mostrar), con `TAREA_CREADA` y `RECORDATORIO_24H` encolados en la transacción del dato (sin consumidor hasta NOTIFICACIONES);
    - el detalle de tarea (RF-13);
    - la tarea en el muro y "Trabajo de clase" (RF-12);
    - las categorías de calificación;
    - el refactor de piezas compartidas (01c).
  - **Migraciones:** dos, de 01a: el tipo `tarea`, y `temas`, `categorias`, `tareas` y `criterios_rubrica`. Compatibles; R-04 aplica a una vuelta atrás.
  - **Rutas nuevas:** 13 bajo `/api/clases/:claseId/…`, con la cadena de middleware completa y pruebas de autorización.
  - **Cifras de cierre:** backend 172 archivos / 2159 pruebas; frontend 150 / 2243; 163 `*.ataque`; lint y build en verde.
  - **Pendientes con destino:** en `docs/ESTADO.md` §3, entre ellos el consumidor de NOTIFICACIONES, la zona de entrega (ENTREGAS) y los "Ver más" de CLASES por carril trivial.
  - **Comprobación humana:** la hoja de 7 puntos de `revision.md`.
  - **Despliegue:** backend y frontend juntos (S-16).
  - Cierra con la línea de atribución que indique el orquestador.
