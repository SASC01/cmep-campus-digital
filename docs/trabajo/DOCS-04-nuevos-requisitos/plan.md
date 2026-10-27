# Plan — DOCS-04 · nuevos requisitos (cambio de alcance antes de ADMIN)
Estado: LISTO
Carril: normal (encargo de documentación, sin código ni pruebas; los encargos que nacen de aquí llevan su propio carril, sección 2b de `docs/ESTADO.md`)
Requisitos: RF-60 a RF-74 nuevos; RF-01 a RF-59, RN-01 a RN-07 y §1, §2, §4.5, §6, §9 y §11 del PRD, tocados donde se dice abajo; RN-08 a RN-11 nuevos

Contrato: la petición literal del humano en `aprobacion.md` (2026-10-26). Autorización de escritura de este encargo: `docs/PRD.md`, `docs/ARCHITECTURE.md`, `docs/ARCHITECTURE-ESSENTIALS.md`, `docs/DESIGN.md` (estructura de la clase) y `docs/ESTADO.md` (solo la sección 2b y filas de la sección 3 cuyo destino cambia). Nada de código, pruebas, `CLAUDE.md` ni `AGENTS.md`.

Nota de arranque: al lanzarme, `aprobacion.md` todavía no existía (el orquestador lo escribió un minuto después). Leí la petición literal en cuanto llegó el aviso, antes de escribir nada, y este plan sigue el texto literal, no el resumen del encargo.

## Preguntas bloqueantes
Ninguna. El humano pidió los documentos ya: lo que la petición deja abierto va como "pendiente por confirmar" en el documento, con mi recomendación, y se lista en "Preguntas para el humano" (abajo). Ninguna cambia lo que se escribe hoy; cambian lo que planeará cada encargo.

## Suposiciones
- S-01. "Grupo" (palabra de la petición en ADMIN-01) es lo mismo que "clase" en los documentos. Los documentos siguen diciendo "clase" y aclaran el sinónimo una vez (PRD §4.6).
- S-02. "Recursos" es el nombre de la interfaz para lo que hoy es una publicación de tipo `material`. En la base sigue siendo `material`; no se renombra el tipo (evita una migración sin valor).
- S-03. "Avisos: solo anuncios de administración y maestros" implica que las tareas y los materiales dejan de aparecer en esa sección (hoy salen en el muro). Las tareas viven en "Actividades de aprendizaje" y los materiales en "Recursos". Lo registro como consecuencia del texto literal y lo dejo visible como pregunta (P-04) por si el humano quería otra cosa.
- S-04. Los alumnos ven los dos bloques de "Recursos". Motivo: "los materiales actuales se reparten por rol del autor", y esos materiales hoy los ven los alumnos; ocultar "Recursos del docente" les quitaría lo que ya ven. Va como pregunta (P-03).
- S-05. Las prioridades de los RF nuevos son mías: M para los requisitos confirmados, "por confirmar" para EXAMENES. El humano las veta o cambia.
- S-06. FORO-01 modela el foro como una actividad hermana de la tarea (misma fila de `tareas`: fecha límite, puntos, categoría, tema, rúbrica, tardías), porque la petición dice "igual que una tarea". `ARCHITECTURE.md` lo deja como "previsto"; el plan de FORO-01 lo confirma o lo cambia.

## Numeración

### RF nuevos (PRD §4.6, subsección nueva)
Hoy el último es RF-59 (§4.4). Las subsecciones por rol tienen huecos (RF-26 a RF-29, RF-45 a RF-49), pero los requisitos nuevos cruzan los tres roles, así que no caben en una sección por rol: van en una subsección nueva, **§4.6 "Organización de la clase, actividades y exámenes (DOCS-04)"**, con números correlativos desde RF-60. Los huecos no se usan.

| RF | Requisito (resumen) | Encargo | Estado |
|---|---|---|---|
| RF-60 | Siete secciones de la clase, en orden: Avisos · Actividades de aprendizaje · Foro · Recursos · Dudas · Personas · Calificaciones | CLASES-03 | Confirmado; perspectivas de "Personas" y momento de "Foro" por confirmar (P-01, P-02) |
| RF-61 | "Avisos" reemplaza a "Muro": solo anuncios del admin y de los maestros; los comentarios se conservan | CLASES-03 | Confirmado |
| RF-62 | "Actividades de aprendizaje" reemplaza a "Trabajo de clase": tareas y sus entregas, y después foros y exámenes | CLASES-03 | Confirmado |
| RF-63 | "Recursos" con dos bloques: "Recursos de aprendizaje" (admin) y "Recursos del docente" (cada maestro); reparto de los materiales actuales por rol del autor; bloque de grabaciones en ENVIVO | CLASES-03 | Confirmado; grabaciones, temas y comentarios por confirmar (P-03, P-05, P-06) |
| RF-64 | "Dudas": hilo abierto de la clase, con "resuelta" y borrado por maestro y admin; no se califica; distinto del hilo privado | CLASES-03 | Confirmado; quién escribe y autoría fina por confirmar (P-07) |
| RF-65 | Exportar a Excel (.xlsx) las calificaciones de una clase: alumnos × actividades, con categorías y promedio; maestro y admin | CALIFICACIONES-02 | Confirmado; mecanismo por decidir en su plan (R-01) |
| RF-66 | Crear un foro: planteamiento con adjuntos opcionales, fecha límite, puntos, rúbrica opcional, tardías sí o no; maestro o admin | FORO-01 | Confirmado |
| RF-67 | Participar en un foro: una participación principal y réplicas libres; "la entrega es participar" | FORO-01 | Confirmado; reglas finas por confirmar (P-09) |
| RF-68 | Calificar un foro por alumno, con puntos (o rúbrica); pondera en su categoría | FORO-01 | Confirmado |
| RF-69 | Archivar y restaurar una clase; "Clases anteriores" del alumno con lectura de sus calificaciones | ADMIN-01 | Confirmado; acceso del maestro y solo lectura por confirmar (P-08) |
| RF-70 | Borrar definitivamente una clase archivada, solo admin, con confirmación y conteo de lo que se pierde | ADMIN-01 | Confirmado |
| RF-71 | Duplicar una clase: copia nombre, descripción, recursos de aprendizaje y secciones; no copia maestros, alumnos, avisos, actividades, recursos del docente ni calificaciones | ADMIN-01 | Confirmado; "secciones" y maestros del duplicado por confirmar (P-10) |
| RF-72 | Banco de preguntas por maestro, reutilizable en todas sus clases (abiertas y de opción múltiple; editar y borrar) | EXAMENES-01 (hito 3) | **Pendiente por confirmar** |
| RF-73 | Examen con preguntas al azar del banco; mostrar o no el resultado al alumno (por defecto no) | EXAMENES-01 (hito 3) | **Pendiente por confirmar** |
| RF-74 | Medidas de disuasión y registro: cámara obligatoria para iniciar, cambio de pestaña o ventana, bloqueo de copiar, pegar y clic derecho, registro por alumno y examen para el maestro; límites explícitos | EXAMENES-02 (hito 3) | **Pendiente por confirmar** |

### RN nuevas (PRD §5)
Hoy la última es RN-07. Nuevas: **RN-08 Actividades** (vocabulario, foro como actividad calificable, "la entrega es participar"), **RN-09 Recursos y dudas**, **RN-10 Clases archivadas, borradas y duplicadas**, **RN-11 Exámenes (pendiente por confirmar)**.

### RN y RF existentes que se tocan
RN-05 (el foro pondera; actividades vencidas sin entregar), RN-06 (clase archivada y duplicado con maestros), RN-07 (recursos del docente, recursos de aprendizaje, dudas, foro). RF-12, RF-25, RF-33, RF-43 y RF-59 (muro → Avisos; material → recurso), RF-52 (archivar, borrar, duplicar). Sin tocar su texto, RN-08 dice que donde RN-05, RF-10, RF-17, RF-20, RF-30, RF-37 y RF-42 hablan de "tareas" en sentido de lo que se califica o vence, se lee "actividades".

### Decisiones D-nn (ARCHITECTURE §20)
Hoy la última es D-29. Nuevas: **D-30** cambio de alcance de DOCS-04 y **D-31** concepto "Materia" como alternativa futura a duplicar, sin implementar.

## Vocabulario: "actividad"
Problema: el PRD dice "tarea" en sentido amplio (lo que se califica, vence o se cuenta en el riesgo) en muchos sitios. Reescribirlo entero es un cambio grande sin valor y con riesgo de romper referencias de los planes cerrados.

Decisión: una sola definición y una regla de lectura, sin reescribir:
- RN-08 define **actividad** como lo que se asigna y se califica dentro de una clase: tarea, foro (FORO-01) y examen (por confirmar). "Actividades de aprendizaje" es la sección que las reúne.
- RN-08 dice, una vez, que RN-05 y los RF-10, RF-17, RF-20, RF-30, RF-37 y RF-42, cuando dicen "tarea" en sentido de lo que se califica, vence o cuenta en el riesgo, se aplican a toda actividad calificable desde que ese tipo exista. La palabra "tarea" sigue siendo correcta donde de verdad es una tarea (RF-13, RF-14, RF-24, RF-34, RF-44, entregas con archivos).
- La introducción de §4 remite a RN-08.
- RN-05 sí se toca en dos frases (el foro pondera; "actividades vencidas sin entregar"), porque son reglas de cálculo que los planes leen literal.
- ESSENTIALS y `ARCHITECTURE.md` usan "actividad" solo en lo nuevo; el código y las tablas siguen con `tareas` (el foro reusa esa fila, S-06).

## Inventario de cambios por documento
Todos los cambios se aplican con `Edit` sobre anclas literales, por bloques; ningún documento se reescribe completo. Marca de encargo: "(DOCS-04)" en cada bloque nuevo, como los documentos ya hacen con "(CLASES-02)" o "(TAREAS-01)". Lo no cerrado lleva "pendiente por confirmar".

### `docs/PRD.md`
| Sección | Cambio |
|---|---|
| Encabezado (tabla) | Sin cambios. |
| §1 Resumen | Una frase: la clase se organiza en siete secciones y el maestro publica avisos, recursos y actividades (tareas y foros) (DOCS-04). |
| §2 No-objetivos | "Comentarios públicos de la clase dentro de una tarea": se aclara que el foro (FORO-01) es otra actividad y "Dudas" (RF-64) es de la clase, así que la tarea sigue sin comentarios públicos. "Exámenes o cuestionarios en línea con autocalificación": pasa a "fuera de la fase 1; EXAMENES-01 lo reconsidera en el hito 3, pendiente por confirmar". Así se resuelve la contradicción con RF-72 y RF-73. |
| §4 introducción | Una línea que remite a RN-08 (vocabulario "actividad"). |
| §4.2 | RF-12 (muro → "Avisos", más las secciones de RF-60), RF-25 (vista previa en avisos y recursos). |
| §4.3 | RF-33 (anuncios en "Avisos"; materiales como "Recursos del docente"; edita y borra lo suyo), RF-43 (temas: organizan actividades y recursos; temas en recursos por confirmar, P-05). |
| §4.4 | RF-52 (suma archivar, restaurar, borrar y duplicar con remisión a RF-69 a RF-71; "muro" → "Avisos"), RF-59 (anuncios en "Avisos" y "Recursos de aprendizaje"). |
| §4.5 Notificaciones | Tabla: "Nueva publicación o anuncio" → "Nuevo aviso"; "Nuevo material" → "Nuevo recurso"; "Nueva tarea" → "Nueva actividad (tarea o foro)". Nota nueva: avisos de dudas y de participaciones del foro, pendientes por confirmar (P-11); los decide el plan de NOTIFICACIONES. Los eventos internos no cambian de nombre. |
| §4.6 (nueva) | RF-60 a RF-74, en tres tablas: CLASES-03 (RF-60 a RF-64), CALIFICACIONES-02, FORO-01 y ADMIN-01 (RF-65 a RF-71) y hito 3, pendientes por confirmar (RF-72 a RF-74), con las preguntas abiertas del humano y la nota explícita de límites de EXAMENES-02 (una web no impide capturas ni otro dispositivo; no se graba video). |
| §5 | RN-05: dos frases (el foro pondera en su categoría; "actividades vencidas sin entregar", con un foro sin participación principal contando como sin entregar). RN-06: clase archivada y duplicado con maestros elegidos. RN-07: recursos (aprendizaje: solo el admin sube, edita, borra y mueve; docente: cada maestro lo suyo, los maestros de la clase los ven, regla de autoría vigente), dudas (maestro y admin marcan resuelta y borran) y foro. RN-08 a RN-11 nuevas. |
| §6 Vistas | Listas de estudiante y maestro con las siete secciones, el detalle de foro y "Clases anteriores"; admin con archivados dentro de "Gestión de clases"; nuevo total; el examen no se cuenta (por confirmar). |
| §9 Hitos | Hito 1: suma secciones de la clase, foro, exportar, archivar, borrar y duplicar. Hito 3: suma EXAMENES-01 y EXAMENES-02, pendientes por confirmar. Una línea: el orden de los encargos vive en `docs/ESTADO.md` (2b). |
| §11 | Supuestos (DOCS-04): S-01 a S-04 de este plan. Preguntas abiertas: P-01 a P-12 en forma corta (el detalle vive en este plan) y las de EXAMENES de la petición. |

### `docs/ARCHITECTURE.md`
| Sección | Cambio |
|---|---|
| §7 API | Bloque nuevo bajo la tabla: "Rutas previstas (DOCS-04), no implementadas", por encargo: CLASES-03 (filtro de publicaciones por tipo y bloque, editar recurso con `version`, dudas y sus respuestas, resuelta, borrar), CALIFICACIONES-02 (exportación), FORO-01 (crear foro con las rutas de tareas, participaciones; calificar con la ruta existente), ADMIN-01 (archivar, restaurar, borrar con `?confirmar=`, duplicar, `GET /clases/anteriores`). Cada encargo fija las rutas exactas en su plan. EXAMENES: sin rutas. |
| §8 Eventos | Una nota: DOCS-04 no decide eventos nuevos. Candidatos para NOTIFICACIONES (duda nueva, respuesta, participación), y para ADMIN-01 el borrado de los objetos del almacén de una clase borrada y la copia de los recursos al duplicar, que nunca se hacen dentro de la petición. `RECORDATORIO_24H` sirve también al foro (uno por actividad con fecha límite). |
| §10 | Una frase: el recordatorio es por actividad con fecha límite (foro incluido, FORO-01). |
| §11 Archivos | Una viñeta: los recursos usan los mismos archivos que hoy los materiales (`materiales/{claseId}/`); los adjuntos del planteamiento de un foro, los de una tarea. Exportación: si deja un archivo, va al bucket privado y se descarga por URL prefirmada (R-01). |
| §12 ENVIVO | **Sin cambios.** |
| §14 Modelo de datos | Bloque nuevo bajo la tabla: "Previsto (DOCS-04), no migrado": `publicaciones.tipo` suma `foro` (y `examen` por confirmar), con su fila 1:1 en `tareas`; `publicaciones.bloque` (`aprendizaje` / `docente`) para los recursos, con la migración de datos por rol del autor; `publicaciones.version` para editar recursos; tabla `dudas` y respuestas como `comentarios` con un tercer contexto `duda_id` (recomendación; decide CLASES-03); tabla `participaciones_foro` (principal y réplicas, `padre_id`), con la fila de `entregas` del alumno como estado y calificación; `clases.archivada_en` (y el uso de `clases.activa`, hoy sin uso); exportación sin tabla y sin librería decidida ("detrás de un adaptador, decidir en el plan de CALIFICACIONES-02"; nada fuera de los proveedores aprobados). El diagrama no se toca hasta que existan las tablas. |
| §19 Riesgos | Riesgo 11: medidas de EXAMENES-02, que son disuasión y no control (pendiente por confirmar). |
| §20 | D-30 y D-31. |

### `docs/ARCHITECTURE-ESSENTIALS.md`
| Sección | Cambio |
|---|---|
| Capas del backend | Una frase en `adapters/`: la librería de .xlsx, si se usa, se importa solo en un adaptador; módulo y librería en el plan de CALIFICACIONES-02 (previsto). |
| Reglas de datos / Tablas | Línea "Previstas (DOCS-04), sin migrar": `dudas`, `participaciones_foro`, columnas `publicaciones.bloque`, `publicaciones.version`, `clases.archivada_en`, tipo `foro`. |
| Trabajos diferidos | "Uno por tarea" → "uno por actividad con fecha límite (tarea y, desde FORO-01, foro)". |
| Archivos | Una frase: recursos = archivos de publicaciones como los materiales; exportación y archivos de una clase borrada, por la regla de siempre (R-01). |
| Reglas de negocio | Viñetas nuevas: secciones y Avisos; Recursos (bloques y autoría); Dudas; Foro como actividad calificable; clase archivada, borrada y duplicada. Retoques: Calificación (el foro pondera), Alumno en riesgo (actividades), Temas (nombres de las secciones nuevas y el maestro que no mueve recursos de aprendizaje), Autoría (recursos y dudas). |
| Interfaz | Viñeta nueva con las siete secciones y la nota de "Clases anteriores"; la barra lateral no lista clases archivadas. |
| Autorización | Una frase (previsto ADMIN-01): la clase archivada se resuelve en el sexto paso de la cadena, en `middleware/` (carril sensible). |

Contradicciones entre documentos que este encargo resuelve en los tres: no-objetivo de exámenes (PRD §2) contra RF-72 y RF-73; "una clase nunca queda sin maestro" (RN-06, ESSENTIALS) contra "duplicar no copia maestros" (P-10: el admin elige maestros al duplicar); "mover de tema organiza la clase y no cuenta como editarlo" (ESSENTIALS, Temas) contra "el maestro no mueve recursos de aprendizaje"; "el muro sigue cronológico" y "Trabajo de clase" (ESSENTIALS, Temas) contra los nombres nuevos. La contradicción de la exportación con "los archivos nunca pasan por Node" no se resuelve aquí: se escala (R-01).

### `docs/DESIGN.md`
| Sección | Cambio |
|---|---|
| §7.3 | Viñeta nueva "Con siete opciones (propuesta (DOCS-04))": el indicador de anchos iguales no sirve (ver "Decisiones", DE-05). Propuesta: opciones a su ancho natural y un indicador que toma posición y ancho de la opción activa, con la misma transición, `aria-current` y color de texto; el grupo se desplaza en horizontal dentro de sí mismo, nunca la página. Alternativa: anchos iguales con desplazamiento. CLASES-03 fija el mecanismo. |
| §7.16 | Viñeta nueva "Siete secciones (propuesta (DOCS-04))": orden, perspectivas, qué reemplaza a qué, qué no es sección; "Recursos" con dos bloques; "Dudas" con el patrón de hilo (§7.18 y §7.25: lista con divisores, `FirmaDelAutor`, formulario de texto, borrar con §7.14, "resuelta" con insignia de texto e icono, nunca solo color); "Avisos" sobre el patrón del muro (§7.18) sin tareas ni materiales; "Foro" con la entrada que decida P-02. Solo estructura: el detalle de cada pantalla lo planea CLASES-03. Ningún token ni valor cambia. |
| §7.18 y §7.22 | Una línea al inicio de cada una: desde CLASES-03, "Muro" se llama "Avisos" y "Trabajo de clase" se llama "Actividades de aprendizaje" (sin cambiar el resto de la sección, que describe lo construido). |

### `docs/ESTADO.md`
| Sección | Cambio |
|---|---|
| 2b | Bloque nuevo al inicio: la hoja de ruta de DOCS-04 en orden (DOCS-04 → CLASES-03 → CALIFICACIONES-02 → ADMIN-01 → los dos `chore` → FORO-01 → NOTIFICACIONES → DEPLOY → ENVIVO → hito 3), una línea por encargo (qué entra, carril probable, dependencias), la nota literal de ENVIVO, el hito 3 "por confirmar, sin planear" y el recordatorio de las reglas de planes (`VALIDACION` fuera de contrato; frases de recuperación) para CLASES-03 en adelante. El bullet de los dos `chore` gana su lugar en la hoja; el "Orden de los siguientes encargos (2026-10-02)" queda como historia, marcado como sustituido. |
| 3 | Destino cambia en tres filas: O-1 y N-01 de FIX-CLASES ("El encargo que agregue la baja de clases" → ADMIN-01, RF-70); N-47 de CALIFICACIONES-01d (el indicador de las secciones → CLASES-03, que toca esa prueba); `key={claseId}` de CALIFICACIONES-01d (suma ADMIN-01 si "Clases anteriores" enlaza a las calificaciones de una clase). Las filas con destino ADMIN no cambian: ADMIN-01 las absorbe (2b lo dice). |
| 1, 2, 4, 5, 6 y línea 5 | **No se tocan** (las lleva el orquestador). |

## Decisiones (con su porqué)
- **DE-01. RF nuevos en una subsección propia (§4.6), desde RF-60.** Cruzan los tres roles; meterlos en los huecos por rol (RF-26, RF-45) los partiría y confundiría con los requisitos de ese rol.
- **DE-02. "Actividad" por definición y regla de lectura (RN-08), no por reescritura.** Ver "Vocabulario".
- **DE-03. Duplicar exige elegir maestros.** "No copia maestros" choca con "una clase nunca queda sin maestro" (RN-06, ESSENTIALS, `maestros_de_clase`). Lo resuelvo leyendo "no copia" como "no los arrastra": al duplicar, el admin elige de uno a dos maestros, como al crear una clase. Queda como pregunta (P-10) porque la alternativa (permitir clases sin maestro) cambiaría una regla de ESSENTIALS.
- **DE-04. El maestro no mueve de tema los recursos de aprendizaje.** La petición dice "el maestro no mueve, borra ni edita". Hoy, mover de tema "organiza la clase y no cuenta como editarlo" y el maestro puede mover el material del admin. La regla nueva gana para ese bloque; para todo lo demás, mover sigue siendo organizar.
- **DE-05. Control segmentado de siete opciones (propuesta).** La regla de §7.3 reparte el grupo en columnas iguales (`grid-cols-N`, indicador de `1/N`). Con "Actividades de aprendizaje" (el rótulo más largo, unos 230 px en `--text-small` 700 con su relleno), siete columnas iguales piden unos 1,600 px: el grupo se desplazaría en horizontal incluso en escritorio. A su ancho natural, las siete suman unos 780 px y caben desde 1024 px. Propongo opciones a su ancho natural y un indicador que toma la posición y el ancho de la opción activa (misma transición de 200 ms con `transform`, sin transición con movimiento reducido, mismo estado por `aria-current` y color). Es un mecanismo nuevo (medir la opción activa); CLASES-03 lo planea con sus pruebas. Alternativa más simple: anchos iguales con desplazamiento horizontal del grupo en todas las anchuras. No acorto el rótulo: el nombre lo dio el humano.
- **DE-06. Los recursos guardan su bloque (recomendación).** La firma "Administración" se deriva del rol al leer; el bloque podría derivarse igual. Recomiendo guardarlo (`publicaciones.bloque`), porque un cambio de rol futuro (ADMIN) movería en silencio los recursos de bloque y cambiaría quién puede editarlos. Decide el plan de CLASES-03.
- **DE-07. Dudas en tabla propia, respuestas como comentarios (recomendación).** Hoy solo el maestro y el admin escriben publicaciones; una duda la escribe el alumno, y meterla en `publicaciones` mezclaría su autorización con la del muro. Las respuestas sí encajan en `comentarios`, con un tercer contexto (`duda_id`) en su `CHECK` de exactamente un contexto. Decide el plan de CLASES-03.
- **DE-08. Clase archivada con `clases.archivada_en` y la columna `activa`, que existe sin uso desde CLASES-a.** Recomendación para ADMIN-01: `activa = false` y la fecha de archivado; "clases activas" de los KPI (RF-50) ya significa "no archivadas".
- **DE-09. Los dos `chore` posteriores a ADMIN van después de ADMIN-01 y antes de FORO-01.** El humano no los nombró en el orden nuevo. Motivo: ya estaban decididos "después de ADMIN" (2026-10-26); la traducción de errores (a) y el foco del marco (b) tocan `lib/errores-de-api.ts` y los ganchos de foco que FORO-01 va a usar con un formulario nuevo (participar) y una sección nueva; hacerlos antes evita que FORO-01 herede tres mecanismos que se van a rediseñar. Es decisión mía: el humano la confirma o los mueve (P-12).
- **DE-10. ENVIVO no cambia en ningún documento.** La nota de Zoom va solo en la hoja de ruta de `ESTADO.md`, literal. El bloque de grabaciones de "Recursos" queda "pendiente por confirmar; se define al planear ENVIVO".
- **DE-11. No hay eventos nuevos decididos.** El PRD (§4.5) no pide avisos de dudas ni del foro; inventarlos sería un requisito. Se listan como candidatos para el plan de NOTIFICACIONES (P-11).
- **DE-12. EXAMENES sin modelo de datos ni rutas.** Solo requisitos, preguntas y límites. La única nota técnica: la cámara de EXAMENES-02 se usa en el navegador para detectar que está encendida; no se envía ni se graba video, y no se usa ningún servicio de supervisión externo (proveedores aprobados).

## Preguntas para el humano (no bloquean; quedan "pendiente por confirmar" en los documentos)
| # | Pregunta | Recomendación | Para |
|---|---|---|---|
| P-01 | Hoy el maestro tiene "Alumnos" y el admin "Alumnos" y "Maestros". ¿"Personas" las reúne en las tres perspectivas? | Sí: una sección "Personas" en los tres roles, para que los tres tengan siete. El estudiante ve lo de hoy; el maestro, el roster (con estado de pago y alta manual) y los maestros; el admin, además, la asignación de maestros. Alternativa: conservar los nombres de hoy (el admin tendría ocho secciones). | CLASES-03 |
| P-02 | La sección "Foro" no tiene contenido hasta FORO-01. ¿Aparece en CLASES-03 con un estado vacío o llega con FORO-01? | Que llegue con FORO-01, en su posición fija (tercera): una sección que no puede tener nada durante dos encargos confunde. Alternativa: mostrarla desde CLASES-03 con "Aún no hay foros en esta clase.". | CLASES-03 y FORO-01 |
| P-03 | ¿Los alumnos ven "Recursos del docente"? | Sí, los dos bloques (S-04): los materiales que hoy ven pasan ahí. | CLASES-03 |
| P-04 | Con "Avisos: solo anuncios", las tareas y los materiales dejan de salir en esa sección (hoy salen en el muro). ¿Correcto? | Sí (S-03): tareas en "Actividades de aprendizaje", materiales en "Recursos". | CLASES-03 |
| P-05 | ¿Los temas siguen organizando los recursos o solo las actividades? | Que sigan organizando los dos, como hoy los materiales; en "Recursos de aprendizaje" solo el admin mueve de tema (DE-04). Alternativa: temas solo en actividades y recursos sin tema. | CLASES-03 |
| P-06 | Los materiales de hoy tienen comentarios. ¿Los recursos los conservan? | Sí, igual que hoy: no se pierde lo escrito y no hay mecanismo nuevo. Alternativa: recursos sin comentarios (las preguntas van a "Dudas"), con los comentarios viejos guardados pero sin mostrarse. | CLASES-03 |
| P-07 | "Dudas": ¿quién escribe y qué borra cada quien? | Preguntan y responden los alumnos inscritos y los maestros de la clase; el admin lee, marca "resuelta" y borra, sin escribir (como en el muro y el hilo privado). Cada autor borra lo suyo (RN-07). Sin edición. Solo texto, sin adjuntos. "Resuelta" se puede quitar. | CLASES-03 |
| P-08 | Clase archivada: ¿qué puede hacer cada rol? | Solo lectura para todos. El maestro deja de verla y no entra (como una clase ajena). El alumno solo ve sus calificaciones en "Clases anteriores". El admin la ve completa, sin escribir, y la restaura. El código de invitación no sirve mientras esté archivada. Los recordatorios de sus actividades no avisan. | ADMIN-01 |
| P-09 | Foro: ¿el alumno edita o borra su participación?, ¿ve las de los demás antes de publicar la suya?, ¿replica después de la fecha límite?, ¿participan los maestros?, ¿adjuntos en la participación?, ¿hilo privado por alumno como en la tarea? | No edita ni borra en FORO-01 (como el hilo privado); sí ve las de los demás; las réplicas siguen la misma regla de cierre que la principal; los maestros replican y el admin lee; solo texto; sin hilo privado (la devolución va con la calificación). Un foro vencido sin participación principal cuenta como "sin entregar" en el riesgo. | FORO-01 |
| P-10 | Duplicar: ¿"secciones" son los temas? ¿Se copian las categorías ponderadas? ¿Y los maestros del duplicado? ¿Se puede duplicar una clase archivada? | "Secciones" = temas (nombre y orden). Las categorías también se copian (son estructura, no datos de alumnos); confirmar. El admin elige de uno a dos maestros al duplicar (DE-03). Mismo nombre, editable en el formulario. Sí, también una archivada (la copia nace activa). | ADMIN-01 |
| P-11 | ¿Avisos (notificaciones) de "Dudas" y del foro? | Que los decida el plan de NOTIFICACIONES. Candidatos: duda nueva a los maestros, respuesta al autor de la duda, foro nuevo como "Nueva actividad", participación a los maestros. | NOTIFICACIONES |
| P-12 | Lugar de los dos `chore` (traducción de errores; foco y navegación del marco) en la hoja de ruta. | Después de ADMIN-01 y antes de FORO-01 (DE-09). | Hoja de ruta |

Preguntas que la petición ya deja abiertas para EXAMENES (se copian en el PRD tal cual): tiempo límite, intentos, quién califica las preguntas abiertas y cuántas preguntas por examen. Añado, como "por confirmar" y con recomendación: si el examen pondera en una categoría como las demás actividades (sí), y el aviso de privacidad y consentimiento para usar la cámara (obligatorio antes de iniciar; el texto lo da el colegio).

## Riesgos y desacuerdos
- **R-01. Exportación .xlsx contra dos reglas de ESSENTIALS (escala al humano en el plan de CALIFICACIONES-02).** "Los archivos nunca pasan por Node ni por el Droplet" y "ningún handler hace trabajo pesado dentro de la petición". Generar el .xlsx en la API y devolverlo en la respuesta rompe la primera literalmente (aunque la regla se escribió para archivos de los usuarios). Opciones para ese plan: (a) el worker lo genera con una librería de Node dentro de un adaptador, lo sube al bucket privado (prefijo nuevo, por ejemplo `exportaciones/{claseId}/`) y la interfaz lo descarga con URL prefirmada: cumple las dos reglas, pero es asíncrono (pedir, esperar, descargar) y la limpieza debe borrarlo; (b) respuesta directa desde la API, acotada en tamaño (una clase de unas decenas de alumnos), como excepción escrita en ESSENTIALS con aprobación del humano. Mi recomendación provisional es (a), por no abrir excepciones; el plan de CALIFICACIONES-02 la confirma con datos de tamaño. La librería es una dependencia nueva: requiere la confirmación de `AGENTS.md`. Ningún servicio externo. **Enmienda 1 (propuesta del manager):** antes de elegir, ese plan evalúa también (c): la API devuelve la matriz en JSON con las mismas consultas del gradebook y el navegador arma el .xlsx. Ningún archivo pasa por Node ni hay cola ni almacén; a cambio, la dependencia nueva es del frontend y hay que resolver la regla de paginación (la matriz completa de una clase en una respuesta, o por ventanas que el navegador junta). Si gana (a), depende de `LIMPIEZA_DIARIA`, que se construye antes de DEPLOY, es decir, después de CALIFICACIONES-02: su plan resuelve la limpieza de sus propios archivos (prefijo `exportaciones/` con vencimiento o borrado propio).
- **R-02. CLASES-03 toca datos (migración de materiales por rol del autor, `bloque`, `version`, `dudas`) y tres módulos del frontend.** Carril sensible por la migración y, por tamaño, en subentregas. Las rutas de la interfaz cambian de nombre (`trabajo` → actividades, el índice del muro → avisos): su plan decide si las rutas viejas redirigen.
- **R-03. Clase archivada en el sexto paso de la cadena (`middleware/`).** ADMIN-01 pasa a carril sensible por eso, además de por la migración.
- **R-04. Borrar una clase definitivamente se lleva filas con FK `RESTRICT` o `NO ACTION`** (`movimientos_inscripcion`, `archivos.entrega_id`, `puntajes_rubrica` diferida) y objetos del almacén. El plan de ADMIN-01 inventaría el orden de la cascada y manda los objetos a la limpieza por la cola, nunca dentro de la petición.
- **R-05. Duplicar copia archivos de recursos de aprendizaje.** Si las dos clases apuntan al mismo objeto, borrar uno rompería el otro. El plan de ADMIN-01 elige entre copiar el objeto en el almacén (copia del lado del almacén, sin pasar por Node) o contar referencias.
- **R-06. EXAMENES-02 es disuasión, no control.** Una web no impide capturas de pantalla, otro dispositivo ni otra persona en la habitación, y los bloqueos de copiar, pegar y clic derecho se saltan con las herramientas del navegador. El riesgo es de expectativas del cliente, no técnico: queda escrito en el PRD (RF-74, RN-11) y en `ARCHITECTURE.md` §19.
- **R-07. `CLAUDE.md` queda desfasado** (filas de `clases`, `tareas` y `calificaciones`, "Muro", "Trabajo de clase") hasta que CLASES-03, FORO-01 y CALIFICACIONES-02 se implementen. Por instrucción del humano no se toca aquí; cada plan propone su texto.
- **R-08. CALIFICACIONES-02 va antes de FORO-01.** La exportación debe salir de las mismas consultas del gradebook (columnas por actividad), no de una lista de "tareas" escrita a mano; así el foro entra solo. Lo dice su línea en 2b.

## Qué NO cambia
- ENVIVO: §12 de `ARCHITECTURE.md`, "Clases en vivo" de ESSENTIALS, RF-22, RF-23, RF-40, RF-41 y el hito 2 siguen con LiveKit, sin una palabra nueva. Zoom aparece solo en la nota literal de la hoja de ruta.
- `CLAUDE.md`, `AGENTS.md`, `README.md`, `.claude/agents/`, `backend/`, `frontend/`, `shared/`, `infra/`, código y pruebas.
- Tokens, valores, contraste y patrones aprobados de `DESIGN.md` (solo se agregan viñetas "propuesta (DOCS-04)" y dos líneas de remisión).
- Secciones 1, 2, 4, 5 y 6 de `ESTADO.md` y su línea de última actualización.
- Proveedores: ninguno nuevo; la exportación usa una librería de Node detrás de un adaptador (por decidir), no un servicio.
- Reglas de autorización vigentes, estado de pago (RN-01 a RN-03) y restricción de acceso: nada nuevo devuelve el estado de pago a un alumno; la exportación no lo incluye.

## Pasos
1. Escribir este plan (hecho).
2. Aplicar los cambios del PRD, por bloques.
3. Aplicar los de ESSENTIALS, `ARCHITECTURE.md` y `DESIGN.md`.
4. Releer `ESTADO.md` desde disco y aplicar 2b y las tres filas de la sección 3.
5. Escribir el resumen final al pie de este plan.

Los pasos 1 a 5 están hechos (2026-10-26).

## Resumen final
**RF nuevos (PRD §4.6):** RF-60 secciones de la clase · RF-61 Avisos · RF-62 Actividades de aprendizaje · RF-63 Recursos · RF-64 Dudas (CLASES-03) · RF-65 exportar a Excel (CALIFICACIONES-02) · RF-66 crear foro · RF-67 participar · RF-68 calificar foro (FORO-01) · RF-69 archivar y restaurar, "Clases anteriores" · RF-70 borrar una clase archivada · RF-71 duplicar (ADMIN-01) · RF-72 banco de preguntas · RF-73 examen (EXAMENES-01) · RF-74 disuasión y registro (EXAMENES-02); RF-72 a RF-74 **pendientes por confirmar**. **RN nuevas:** RN-08 Actividades · RN-09 Recursos y dudas · RN-10 Clases archivadas, borradas y duplicadas · RN-11 Exámenes (pendiente por confirmar). **Decisiones de registro:** D-30 (cambio de alcance) y D-31 ("Materia", sin implementar).

**Documentos y secciones tocadas:**
- `docs/PRD.md`: §1; §2 (no-objetivos de comentarios y de exámenes); §4 (vocabulario); RF-12, RF-25, RF-33, RF-43, RF-52, RF-59; §4.5 (tres filas y la nota de avisos de dudas y foro); §4.6 nueva; RN-05, RN-06, RN-07; RN-08 a RN-11 nuevas; §6 (bloque "Desde DOCS-04" con el total de 35 + 3); §9 (hitos 1 y 3, y la remisión al orden de `ESTADO.md`); §11 (supuesto y preguntas 10 a 16).
- `docs/ARCHITECTURE.md`: §7 (rutas previstas), §8 (sin eventos nuevos; candidatos), §10 (recordatorio por actividad), §11 (punto 8: recursos, foro, exportación, duplicado), §14 (tabla "Previsto (DOCS-04), no migrado"), §19 (riesgo 11), §20 (D-30, D-31). §12 sin cambios.
- `docs/ARCHITECTURE-ESSENTIALS.md`: "Capas del backend" (librería .xlsx en un adaptador, prevista), "Autorización" (clase archivada en el sexto paso, prevista), "Tablas" (previstas), "Asíncrono" (sin eventos nuevos), "Trabajos diferidos" (por actividad), "Archivos" (recursos, foro, exportación, duplicado), "Reglas de negocio" (Calificación, Alumno en riesgo, Temas, Autoría y seis viñetas nuevas: secciones, Recursos, Dudas, Foro, clases archivadas y duplicadas, exportar, exámenes), "Interfaz" (barra lateral sin archivadas y secciones de la clase).
- `docs/DESIGN.md`: §7.3 (viñeta "Con siete opciones", propuesta (DOCS-04)), §7.16 (viñeta "Siete secciones", propuesta (DOCS-04)), §7.18 y §7.22 (una línea de remisión cada una). Sin tokens ni valores.
- `docs/ESTADO.md`: 2b (hoja de ruta de DOCS-04 al inicio, con diez puntos; la viñeta de los dos `chore` con su lugar; el orden del 2026-10-02 marcado como sustituido) y tres filas de la sección 3 (N-47 → CLASES-03; O-1 y N-01 de FIX-CLASES → ADMIN-01; `key={claseId}` suma ADMIN-01). Secciones 1, 2, 4, 5 y 6 y la línea 5 sin tocar.

**Decisiones:** DE-01 a DE-12 (arriba). Las que el humano debe mirar primero: DE-03 (duplicar exige elegir maestros), DE-05 (indicador de siete opciones a ancho natural, propuesta), DE-09 (los dos `chore` entre ADMIN-01 y FORO-01).

**Preguntas para el humano (ninguna bloquea):** P-01 a P-12 de la tabla de arriba, cada una con recomendación; más las de EXAMENES de la petición. Las que frenan el plan del siguiente encargo (CLASES-03): P-01, P-02, P-03, P-04, P-05, P-06 y P-07.

**Escalado (no se resuelve aquí):** R-01, la exportación .xlsx frente a "los archivos nunca pasan por Node" y "lo lento va por cola"; lo decide el humano en el plan de CALIFICACIONES-02.

**Qué NO cambió:** ENVIVO en todos los documentos (LiveKit; Zoom solo en la nota literal de 2b); `CLAUDE.md`, `AGENTS.md`, `README.md`, `.claude/agents/`; código, pruebas, `infra/` y `shared/`; tokens y patrones aprobados de `DESIGN.md`; secciones 1, 2, 4, 5 y 6 de `ESTADO.md`; proveedores (ninguno nuevo); reglas de estado de pago y restricción de acceso.

**Sin verificar:** no tengo terminal en esta sesión, así que no pude sacar el `git diff --stat` de los cinco documentos; lo calcula el orquestador contra `06dbc7c`.

## Enmienda 1 (revisión del manager)
Fecha: 2026-10-26. Responde a `revision.md` (CAMBIOS REQUERIDOS: M-01 a M-04). Solo corrige esos cuatro hallazgos en su lugar, aplica N-01 en `DESIGN.md` §7.3 y suma a R-01 la opción (c); nada más de los documentos cambia. Todas las ediciones son con `Edit` sobre anclas literales. Sin terminal: el orquestador calcula los hashes y el `git diff`.

### Hallazgos que bloqueaban
| # | Archivo y ancla | Cómo quedó |
|---|---|---|
| M-01 | `docs/PRD.md`, RN-06, viñeta que empezaba «Una clase archivada sale de las listas de sus maestros y alumnos; solo el Administrador la ve y la restaura (RN-10).» | Dice solo lo confirmado: sale de las listas (inicio y barra lateral); el Administrador la ve en la lista de archivadas y la restaura; el alumno conserva la lectura de sus calificaciones en "Clases anteriores" (RF-69, RN-10). Si el maestro sigue entrando y si consulta sus calificaciones queda **pendiente por confirmar** (RF-69; P-08; pregunta 14 de §11). La frase siguiente de la viñeta (duplicar y maestros) no cambia. |
| M-01 (coherencia) | `docs/PRD.md`, RF-69, lista «Pendiente por confirmar» (ancla: «que el maestro deje de entrar, que el código de invitación no sirva…»), y §11, pregunta 14 (ancla: «14. Clase archivada: ¿solo lectura para todos?, ¿el maestro deja de entrar?») | Suman el matiz del manager en P-08: si el maestro consulta las calificaciones de sus clases archivadas (aclaraciones), sin recomendación propia (se le pregunta al cliente; si es no, la exportación del Administrador lo cubre). |
| M-01 (revisión) | `docs/ARCHITECTURE-ESSENTIALS.md` («Autorización», viñeta «Previsto (DOCS-04; ADMIN-01…)»; «Clases archivadas, borradas y duplicadas»; «Interfaz», barra lateral) y `docs/ARCHITECTURE.md` (§7, §8, §14) | Revisados: ninguno repite «solo el Administrador la ve». El acceso del maestro aparece solo como «Recomendación, pendiente por confirmar» en «Autorización». Sin cambios. |
| M-02 | `docs/PRD.md`, RN-10, última viñeta (ancla: «Duplicar copia la estructura y lo del Administrador, nunca a las personas ni su trabajo (RF-71).») | Lista cerrada literal de RF-71: copia solo nombre, descripción, recursos de aprendizaje y secciones; **no** copia maestros, alumnos, avisos, actividades, recursos del docente ni calificaciones, sin importar quién los publicó (RF-71). |
| M-02 (revisión) | `docs/ARCHITECTURE-ESSENTIALS.md`, «Clases archivadas, borradas y duplicadas», y `docs/ARCHITECTURE.md` (§8, §11 punto 8, D-31) | Revisados: ESSENTIALS ya tenía la lista cerrada literal; ARCHITECTURE no parafrasea qué se copia («lo del Administrador» no aparece). Sin cambios. |
| M-03 | `docs/ARCHITECTURE.md` §20, fila D-30 (ancla: «y el foro reutiliza la fila de `tareas` y la de `entregas`; …exportación a .xlsx con una librería detrás de un adaptador…») | La decisión del humano queda en el alcance y el orden (siete secciones, foro calificable como una tarea, exportar a .xlsx sin servicio externo, archivar, restaurar, borrar y duplicar, exámenes por confirmar, ENVIVO sin cambios). Un bloque aparte, «**Previsión del arquitecto, no decidida:**», lleva que el foro reutilice `tareas` y `entregas` (a decidir en el plan de FORO-01, que también pesa la tabla aparte) y el mecanismo de la exportación (worker con almacén, API o navegador, y librería; a decidir en el plan de CALIFICACIONES-02). «El foro como tabla aparte» sale de las alternativas descartadas; el porqué separa la regla de proveedores (decidida) de la previsión del foro (del arquitecto). |
| M-03 | `docs/ARCHITECTURE-ESSENTIALS.md`, «Reglas de negocio», viñeta «Foro (DOCS-04; FORO-01)» (ancla: «y su fila de `entregas` por alumno para el estado y la calificación») | La regla vigente se queda en los campos de una tarea; una frase aparte dice «Previsto, no decidido (lo confirma o lo cambia el plan de FORO-01): que reutilice la fila de `tareas` y la de `entregas` por alumno…». |
| M-03 (mecanismo) | `docs/ARCHITECTURE-ESSENTIALS.md`, «Capas del backend», `adapters/` (ancla: «Previsto (DOCS-04): la librería que escriba el .xlsx…») y `docs/ARCHITECTURE.md` §14, fila «Exportación .xlsx» (ancla: «La librería que escribe el .xlsx va detrás de un adaptador») | Ambas daban por hecho que el .xlsx se escribe en el backend. Ahora: «si el .xlsx se escribe en el backend», su librería va en un adaptador; dónde se genera (worker, API o navegador) lo decide el plan de CALIFICACIONES-02. Es la misma corrección de M-03 (mecanismo como previsión) y deja sitio a la opción (c) de R-01. `ARCHITECTURE.md` §11 punto 8 y el punto 3 de `ESTADO.md` 2b (CALIFICACIONES-02) no cambian (D-30 remite a R-01 de este plan para la opción (c)). |
| M-04 | `docs/PRD.md`, RF-65 (ancla: «No incluye correos, estado de pago ni restricción de acceso (RN-02).») | Sin cita a RN-02 y sin decidir: «**Pendiente por confirmar:** qué identifica al alumno en el archivo (recomendación: su nombre; el correo solo si el colegio lo necesita para cruzar el archivo con sus registros) y si se excluyen el estado de pago y la restricción de acceso (recomendación: excluirlos, porque un archivo descargado sale del control de la plataforma y puede reenviarse; pregunta 17 de §11)». |
| M-04 | `docs/ARCHITECTURE-ESSENTIALS.md`, «Exportar calificaciones (DOCS-04; CALIFICACIONES-02)» (ancla: «sin correos, estado de pago ni restricción.») | La misma recomendación pendiente por confirmar, con su motivo, sin presentarla como regla. |
| M-04 (pregunta) | `docs/PRD.md` §11: pregunta 17 nueva al final de la lista (tras la 16) y la remisión «(P-01 a P-12)» pasa a «(P-01 a P-13)» | «17. Exportar a Excel: ¿qué identifica al alumno en el archivo (nombre, correo)? ¿Se excluyen el estado de pago y la restricción de acceso? (RF-65)». Es P-13 (abajo). |

Líneas de este plan que la enmienda sustituye (no se reescriben para conservar el historial): en "Qué NO cambia", «la exportación usa una librería de Node detrás de un adaptador (por decidir)» se lee «el mecanismo y la librería de la exportación se deciden en su plan (R-01)», y «la exportación no lo incluye» se lee «excluir el estado de pago de la exportación es recomendación pendiente (P-13)». En la tabla de `ARCHITECTURE.md` del inventario, la fila de §20 se lee con D-30 tal como quedó arriba. S-06 ya decía "previsto" y no cambia.

### Hallazgos que no bloqueaban
- **N-01 (DE-05), aceptada.** `docs/DESIGN.md` §7.3, viñeta «Con siete opciones»: la marca pasa a «propuesta (DOCS-04); la fija el plan de CLASES-03 antes de programar». El indicador toma posición y ancho de la opción activa, pero **solo la posición se desliza** con `transform` (`translate`) y 200 ms; el ancho cambia sin transición (animar el ancho rompe "solo `transform`"; `scaleX` deformaría el `rounded-row`). Suma que medir la opción activa no se comprueba en jsdom (medidas simuladas en las pruebas; lo demás, a la comprobación humana) y la tercera vía (sin indicador deslizante, fondo en la opción activa), que cambia la regla y decide el humano. §7.16 («El indicador sigue la viñeta de siete opciones de §7.3») no necesita cambio. Ningún token ni valor cambia.
- **N-02, nota para el plan de CLASES-03 (sin cambios en los documentos).** Ese plan inventaría con grep las pruebas `*.ataque.test.ts(x)` que nombran «Muro» o «Trabajo de clase» (15 según el manager) y las que afirman el indicador de cinco opciones (`frontend/src/app/rutas-01d-r1.ataque.test.tsx` y `frontend/src/components/layout/estatico-r1.ataque.test.ts`: `w-1/5`, `translate-x-[400%]`), y propone su sustitución para que la arbitre el manager antes de programar, no en una PARADA del programador.
- **N-03, nota para el humano (sin cambios en los documentos).** P-03 se plantea al cliente con su consecuencia escrita: si "Recursos del docente" fuera solo para maestros, el reparto de los materiales actuales por rol del autor ocultaría a los alumnos todo lo que hoy publican sus maestros. Mi recomendación sigue siendo que los alumnos vean los dos bloques.
- **N-04 y detalles menores:** sin cambios en esta enmienda (el humano los ve en `revision.md`). Lo de `LIMPIEZA_DIARIA` entra en R-01.

### Preguntas P-01 a P-13: recomendaciones
| # | Mi recomendación | La del manager | Resultado |
|---|---|---|---|
| P-01 | «Personas» en los tres roles | Igual | Coinciden |
| P-02 | «Foro» llega con FORO-01 | Igual: una sección vacía durante dos encargos confunde | Coinciden |
| P-03 | Los alumnos ven los dos bloques | Igual, pero preguntarla al cliente con la consecuencia escrita (N-03) | Coinciden (el manager añade cómo plantearla) |
| P-04 | Tareas y materiales salen de «Avisos» | Igual (es lo literal) | Coinciden |
| P-05 | Los temas siguen organizando los recursos | Igual | Coinciden |
| P-06 | Los recursos conservan los comentarios | Igual | Coinciden |
| P-07 | Preguntan y responden inscritos y maestros; el admin lee, marca y borra; cada autor borra lo suyo; solo texto | Igual | Coinciden |
| P-08 | Solo lectura; el maestro no entra; el alumno solo ve sus calificaciones; el admin lee y restaura | Igual, y añade preguntar si el maestro consulta las calificaciones de sus clases archivadas (aclaraciones); si es no, la exportación del admin lo cubre | Coinciden en lo planteado; la pregunta añadida quedó en RF-69, RN-06 y la pregunta 14 de §11, sin recomendación mía |
| P-09 | Sin editar ni borrar; ve las de otros; réplicas cierran con la fecha; maestros replican; solo texto; sin hilo privado | Igual | Coinciden |
| P-10 | Secciones = temas; copiar categorías; el admin elige maestros; duplicar archivada | Igual | Coinciden |
| P-11 | Lo decide NOTIFICACIONES | Igual | Coinciden |
| P-12 | Los `chore` entre ADMIN-01 y FORO-01 | Respetar «después de ADMIN», pero si el humano acepta moverlo, el `chore` (a), traducción de errores, rendiría más antes de CLASES-03 (que agrega al menos tres formularios: duda, respuesta, editar recurso) | Difieren en el lugar de (a). Acepto el argumento: es el mismo de DE-09. Mi recomendación queda condicionada: si el humano acepta mover (a), antes de CLASES-03; si no, mi lugar original. (b) sigue entre ADMIN-01 y FORO-01 |
| P-13 (nueva, M-04) | Identificar al alumno por su nombre (el correo solo si el colegio lo necesita); excluir el estado de pago y la restricción, porque el archivo sale del control de la plataforma | El manager pidió la pregunta; no da recomendación | Sin comparación (pregunta 17 de §11; CALIFICACIONES-02) |

DE-03: coinciden. DE-05: coinciden con la condición de N-01, ya aplicada. DE-09: ver P-12.

### R-01 (exportación)
La opción (c) del manager (la API devuelve la matriz en JSON y el navegador arma el .xlsx) y la dependencia de `LIMPIEZA_DIARIA` de la opción (a) quedaron en R-01, arriba, como opciones a evaluar en el plan de CALIFICACIONES-02. D-30 remite a R-01. Lo decide el humano en ese plan.

### Hunks de la enmienda (para el cotejo del orquestador)
1. `docs/PRD.md`, RF-65: exclusiones a pendiente por confirmar (M-04).
2. `docs/PRD.md`, RF-69: matiz de P-08 en la lista de pendientes (M-01).
3. `docs/PRD.md`, RN-06: viñeta de la clase archivada (M-01).
4. `docs/PRD.md`, RN-10: última viñeta, lista cerrada de duplicar (M-02).
5. `docs/PRD.md` §11: «(P-01 a P-12)» → «(P-01 a P-13)» (M-04).
6. `docs/PRD.md` §11: pregunta 14 con el matiz de P-08 (M-01).
7. `docs/PRD.md` §11: pregunta 17 nueva (M-04).
8. `docs/ARCHITECTURE-ESSENTIALS.md`, «Capas del backend», `adapters/`: librería de .xlsx condicionada a que se escriba en el backend (M-03).
9. `docs/ARCHITECTURE-ESSENTIALS.md`, «Foro»: reutilizar `tareas` y `entregas` como previsto (M-03).
10. `docs/ARCHITECTURE-ESSENTIALS.md`, «Exportar calificaciones»: exclusiones a pendiente por confirmar (M-04).
11. `docs/ARCHITECTURE.md` §14, fila «Exportación .xlsx»: dónde se genera, por decidir (M-03).
12. `docs/ARCHITECTURE.md` §20, fila D-30: decisión del humano y previsión del arquitecto separadas (M-03).
13. `docs/DESIGN.md` §7.3, viñeta «Con siete opciones»: marca, ancho sin transición, jsdom y tercera vía (N-01; tres ediciones en la misma línea).
14. Este `plan.md`: R-01 (opción (c) y `LIMPIEZA_DIARIA`) y esta sección.

`docs/ESTADO.md` no se toca en esta enmienda.
