# Plan — CHORE-03 · traducción de los errores de la API en el frontend
Estado: LISTO
**Enmienda 5 (2026-10-27, ronda 1 del tester en 03c; DH-9 respondida por el humano el 2026-10-27: opción (a), y A-8 aprobada con la variante del manager; el orquestador cambió solo la línea de estado, ver aprobacion.md):** bloqueaba solo DH-9 (la autorización para sacar de "No se toca" en 03c los diez archivos del remedio de T-05; la pregunta exacta está en "Preguntas bloqueantes"). Con la opción (a), el plan pasa a LISTO sin otro cambio y arranca la ronda 2 de 03c (pasos 8 a 12). Con la (b), el plan se enmienda otra vez para registrar el diferimiento. No toca nada de 03a ni de 03b (cerradas) ni los pasos 0 a 6 de 03c (ver "Enmienda 5" al final).
**Enmienda 4 (2026-10-27; DH-8 respondida por el humano el 2026-10-27: opción (a); el orquestador cambió solo la línea de estado, ver aprobacion.md):** bloqueaba solo DH-8 (la autorización para sacar de "No se toca" en 03b los archivos del remedio de T-03 y T-04; la pregunta exacta está en "Preguntas bloqueantes"). Con cualquiera de sus dos opciones respondida, el plan pasa a LISTO sin otro cambio. No toca nada de 03a ni los pasos 0 a 9 de 03b (ver "Enmienda 4" al final).
**Enmienda 2 (DH-6 respondida por el humano el 2026-10-26: sí; el orquestador cambió solo la línea de estado, ver aprobacion.md):** bloqueaba solo DH-6 (la autorización para sacar `components/adjuntos/adjuntos-de-publicacion.tsx` de "No se toca" en 03a). Con la respuesta del humano, el plan pasa a LISTO sin otro cambio; la pregunta exacta está en "Preguntas bloqueantes".
**Enmienda 3 (2026-10-26):** sigue LISTO. No quedan preguntas abiertas: DH-5 (sí), DH-6 (sí) y DH-7 (opción b) están respondidas; responde a M-04, M-05 y los detalles menores de la revisión de la Enmienda 2 (ver "Enmienda 3" al final). No toca nada de 03a.
Carril: normal
Requisitos: sin RF nuevo. Fuente del alcance: `docs/ESTADO.md` §3, fila "T-04 y T-05 de CALIFICACIONES-01c (hermanos fuera de §D-12) y R-15 de su Enmienda 2…" (puntos (1) a (6) y el remedio; absorbe N-33, N-36, N-38, N-42 y R-15) más N-46 y la observación de la Enmienda 2 de CALIFICACIONES-01 sobre `esErrorDeCursor` con lista de campos (`aprobacion.md`, "Alcance del chore"). Reglas que aplican: `AGENTS.md` ("VALIDACION fuera de contrato", "frases de recuperación", ids con prefijo, lista cerrada por grep); `DESIGN.md` §9 ("los errores dicen qué pasó y qué hacer, sin tecnicismos").

**Carril normal, justificado:** solo toca `frontend/src/lib/`, `frontend/src/services/apiClient.ts` (una exportación, sin cambiar su lógica), `frontend/src/components/adjuntos/lib.ts` y los módulos `tareas`, `clases`, `calificaciones`, `admin` y `auth` del frontend. No toca `middleware/`, `adapters/auth`, sesiones ni contraseñas (en `features/auth` solo cambia el texto de un error, no el manejo de credenciales ni de tokens), migraciones, `infra/`, el estado de pago ni la restricción de acceso. Nada del backend ni de `shared/`.

## Parte A — decisiones de DOCS-04 registradas
Autorización del humano (2026-10-26, literal en `aprobacion.md`): "Regístralas en el PRD donde corresponda". Todas las ediciones son `Edit` sobre anclas literales; ningún documento se reescribió. Marca usada: "(… decisión del humano, 2026-10-26)". EXAMENES-01 y 02 y el bloque de grabaciones de "Recursos" siguen **pendientes por confirmar**. P-12 no tiene lugar en el PRD (su §9 remite el orden a `ESTADO.md` 2b), así que va solo en `ESTADO.md`. P-04 ya era texto firme en RF-61; solo cambia su supuesto y su pregunta en §11. Sin terminal: el orquestador calcula los hashes y el `git diff`.

| # | Archivo | Sección (ancla) | Decisión |
|---|---|---|---|
| 1 | `docs/PRD.md` | §4.3, RF-43 ("Desde CLASES-03 organizan las actividades…") | P-05: los temas organizan también los recursos; en "Recursos de aprendizaje" solo el Administrador mueve de tema |
| 2 | `docs/PRD.md` | §4.5, nota "Avisos de "Dudas" y del foro (DOCS-04)" | P-11: los decide el plan de NOTIFICACIONES (deja de ser "pendiente por confirmar") |
| 3 | `docs/PRD.md` | §4.6, párrafo de introducción | P-01 a P-13, DE-03 y R-01 cerradas; siguen pendientes los exámenes y el bloque de grabaciones |
| 4 | `docs/PRD.md` | §4.6, RF-60 | P-01: "Personas" en los tres roles (qué ve cada uno); P-02: "Foro" llega con FORO-01, tercera posición, CLASES-03 no la muestra vacía |
| 5 | `docs/PRD.md` | §4.6, RF-63 | P-03: los alumnos ven los dos bloques; P-06: los recursos conservan los comentarios. Grabaciones siguen pendientes |
| 6 | `docs/PRD.md` | §4.6, RF-64 | P-07: inscritos y maestros preguntan y responden; el Administrador lee, marca y borra sin escribir; cada autor borra lo suyo; sin edición; solo texto; "resuelta" se quita |
| 7 | `docs/PRD.md` | §4.6, RF-65 | P-13: nombre y correo, nunca estado de pago ni restricción; R-01: la API entrega JSON y el navegador arma el .xlsx, sin cola ni almacén |
| 8 | `docs/PRD.md` | §4.6, RF-67 | P-09: sin editar ni borrar; ve las de los demás; réplicas con la misma regla de cierre; maestros replican y el Administrador lee; solo texto; sin hilo privado; foro vencido sin participación cuenta en el riesgo |
| 9 | `docs/PRD.md` | §4.6, RF-69 | P-08: solo lectura para todos; el maestro también consulta sus clases archivadas en solo lectura (incluidas las calificaciones); código sin servir; recordatorios sin avisar; dónde las encuentra el maestro lo decide ADMIN-01 |
| 10 | `docs/PRD.md` | §4.6, RF-71 | P-10 y DE-03: secciones = temas; se copian las categorías; el Administrador elige 1 o 2 maestros; nombre igual y editable; se duplica una archivada y la copia nace activa |
| 11 | `docs/PRD.md` | §5, RN-06, viñeta de la clase archivada | P-08 (solo lectura; el maestro consulta) y DE-03 (maestros al duplicar), sin "pendiente por confirmar" |
| 12 | `docs/PRD.md` | §5, RN-07, viñeta "Desde CLASES-03" | P-07: cada alumno borra lo suyo en "Dudas" |
| 13 | `docs/PRD.md` | §5, RN-10, segunda viñeta | P-08: solo lectura para todos, el maestro consulta, el Administrador lee y restaura, código y recordatorios |
| 14 | `docs/PRD.md` | §6, "Desde DOCS-04", viñeta de secciones | P-01: "Personas" sin "por confirmar" |
| 15 | `docs/PRD.md` | §11, "Supuestos tomados", viñeta DOCS-04 | P-03 y P-04 confirmados |
| 16 | `docs/PRD.md` | §11, encabezado "Preguntas abiertas de DOCS-04" y preguntas 10 a 15 | Cada una con "**Resuelta el 2026-10-26 (decisión del humano)**" y su respuesta; en la 11 quedan pendientes las grabaciones |
| 17 | `docs/PRD.md` | §11, pregunta 17 | P-13 y R-01 |
| 18 | `docs/ARCHITECTURE-ESSENTIALS.md` | "Capas del backend", viñeta `adapters/` (última frase) | R-01: el .xlsx no se escribe en el backend; librería del frontend con confirmación del humano |
| 19 | `docs/ARCHITECTURE-ESSENTIALS.md` | "Autorización", viñeta "Previsto (DOCS-04; ADMIN-01…)" | P-08 (O-2 del manager): el maestro consulta sus archivadas sin escribir (antes, "como en una clase ajena") |
| 20 | `docs/ARCHITECTURE-ESSENTIALS.md` | "Asíncrono y notificaciones", frase "DOCS-04 no agrega eventos" | P-11 |
| 21 | `docs/ARCHITECTURE-ESSENTIALS.md` | "Archivos", viñeta "Previsto (DOCS-04)" | R-01: la exportación no deja archivo en el servidor ni en el almacén; sin apartamiento |
| 22 | `docs/ARCHITECTURE-ESSENTIALS.md` | "Reglas de negocio", Temas (última frase) | P-05 |
| 23 | `docs/ARCHITECTURE-ESSENTIALS.md` | "Reglas de negocio", Secciones de la clase | P-01 y P-02 |
| 24 | `docs/ARCHITECTURE-ESSENTIALS.md` | "Reglas de negocio", Recursos | P-03 y P-06 |
| 25 | `docs/ARCHITECTURE-ESSENTIALS.md` | "Reglas de negocio", Dudas | P-07 |
| 26 | `docs/ARCHITECTURE-ESSENTIALS.md` | "Reglas de negocio", Clases archivadas, borradas y duplicadas (dos ediciones) | P-08 (solo lectura, maestro, código, recordatorios); P-10 y DE-03 (duplicar) |
| 27 | `docs/ARCHITECTURE-ESSENTIALS.md` | "Reglas de negocio", Exportar calificaciones | P-13 y R-01 |
| 28 | `docs/ARCHITECTURE.md` | §7, "Rutas previstas", viñeta CALIFICACIONES-02 | R-01 y P-13: la ruta devuelve la matriz en JSON; completa o por ventanas lo decide su plan |
| 29 | `docs/ARCHITECTURE.md` | §7, "Rutas previstas", viñeta ADMIN-01 | P-08: el maestro consulta sus archivadas; rutas en ese plan |
| 30 | `docs/ARCHITECTURE.md` | §8, viñeta "DOCS-04 no decide eventos nuevos" (candidatos) | P-11 |
| 31 | `docs/ARCHITECTURE.md` | §8, misma viñeta (clase archivada) | P-08: los consumidores de una clase archivada terminan sin avisar |
| 32 | `docs/ARCHITECTURE.md` | §11, punto 8 | R-01: sin archivo, sin cola ni bucket; sin apartamiento |
| 33 | `docs/ARCHITECTURE.md` | §14, tabla "Previsto", fila "Exportación .xlsx" | R-01 y P-13 |
| 34 | `docs/ARCHITECTURE.md` | §20, D-30 (dos ediciones: el texto y un espacio sobrante antes del punto) | R-01 y P-13: la exportación sale de la "Previsión del arquitecto, no decidida" y queda decidida; el foro sigue como previsión |
| 35 | `docs/DESIGN.md` | §7.16, "Siete secciones", viñeta "Orden" | P-01 y P-02 |
| 36 | `docs/DESIGN.md` | §7.16, "Siete secciones", viñeta "Actividades de aprendizaje" | P-05 (cómo se ven los temas en "Recursos" lo diseña CLASES-03) |
| 37 | `docs/ESTADO.md` | §2b, viñeta "Hoja de ruta" | P-12 y el orden nuevo: DOCS-04 (hecho) → CHORE-03 → CLASES-03 → CALIFICACIONES-02 → ADMIN-01 → `chore` de foco y navegación → FORO-01 → NOTIFICACIONES → DEPLOY → ENVIVO → hito 3 |
| 38 | `docs/ESTADO.md` | §2b, punto 1 (DOCS-04) y nuevo 1b (CHORE-03) | DOCS-04 hecho; CHORE-03 en curso |
| 39 | `docs/ESTADO.md` | §2b, punto 2 (CLASES-03) | P-01 a P-07 decididas |
| 40 | `docs/ESTADO.md` | §2b, punto 3 (CALIFICACIONES-02) | R-01 y P-13; el plan elige solo la librería |
| 41 | `docs/ESTADO.md` | §2b, punto 4 (ADMIN-01) | P-08, P-10 y DE-03 |
| 42 | `docs/ESTADO.md` | §2b, punto 5 | Solo el `chore` (b), entre ADMIN-01 y FORO-01; el (a) pasó a CHORE-03 |
| 43 | `docs/ESTADO.md` | §2b, punto 6 (FORO-01) | P-02 y P-09 |
| 44 | `docs/ESTADO.md` | §2b, punto 7 (NOTIFICACIONES) | P-11 confirmado |
| 45 | `docs/ESTADO.md` | §2b, viñeta "Dos `chore` después de ADMIN" (última frase) | P-12 |
| 46 | `docs/ESTADO.md` | §3, fila "T-04 y T-05 de CALIFICACIONES-01c…", columna "Destino" | "CHORE-03 (en curso)" |
| 47 | `docs/PRD.md` | §5, RN-10, cuarta viñeta ("Duplicar copia solo…") | **Enmienda 1 (M-02):** P-10 y DE-03, igual que RF-71: secciones = temas (nombre y orden), se copian las categorías ponderadas, el Administrador elige de uno a dos maestros, nombre igual y editable, se duplica una archivada y la copia nace activa. La frase de D-31 ("temas y, si se decide, categorías", de la Materia hipotética) no se toca |
| 48 | `docs/ESTADO.md` | §2b, elemento "1b" de la lista numerada | **Enmienda 1 (N-08):** pasa a sub-viñeta del punto 1 (`     - **1b. CHORE-03 …**`, con la sangría del contenido del punto), para que Markdown la lea como elemento y no como continuación; conserva la etiqueta "1b" y no renumera los puntos 2 a 10, que otros documentos citan por número. Sin cambio de contenido |

Notas para el orquestador (no las apliqué porque están fuera de lo autorizado):
- `docs/ESTADO.md` §2 (la lleva el orquestador), párrafo de CALIFICACIONES-01, aún dice "los dos `chore` … van después de ADMIN (sección 2b)" y "el orden de la sección 2b arranca con CLASES-03". Quedó desfasado por P-12.
- ~~En la lista numerada de 2b, "1b." no es un marcador de lista de Markdown…~~ Enmienda 1 (N-08): lo corregí yo en §2b (fila 48).
- Enmienda 1 (N-05): "No se toca" verifica §2b por el SHA-256 de su texto. Método de extracción: desde la línea que empieza con `## 2b.` (incluida) hasta la línea anterior a la que empieza con `## 3.` (incluida esa última, en blanco o no), con los finales de línea tal como están en el archivo. El orquestador lo anota en `aprobacion.md` junto al hash de `PRD.md` recalculado por M-02.

## Preguntas bloqueantes
**Enmienda 5 (ronda 1 del tester en 03c): una pregunta bloqueante, DH-9.** DH-8 (abajo) ya la respondió el humano el 2026-10-27: opción (a).
> **DH-9.** Para corregir T-05 (tras un rechazo del servidor, un reenvío que la validación local rechaza deja en pantalla el `MensajeError` viejo junto al `ErrorDeCampo` nuevo: dos mensajes a la vez), ¿autorizas que en 03c salgan de "No se toca" estos diez archivos, solo para agregar, justo después de su guarda `if (<mutación>.isPending) return`, un comentario de dos líneas y la línea `if (<mutación>.isError) <mutación>.reset()` (§D-4, Enmienda 5)? Ningún `hooks.ts` cambia.
> - `frontend/src/features/admin/components/formulario-invitar-maestro.tsx`, `formulario-invitacion-masiva.tsx`, `formulario-generar-enlace.tsx` y `formulario-corregir-correo.tsx`;
> - `frontend/src/features/auth/components/formulario-login.tsx`, `formulario-registro.tsx`, `formulario-registro-maestro.tsx`, `formulario-recuperar.tsx`, `formulario-nueva-contrasena.tsx` (restablecer y establecer contraseña) y `formulario-cambiar-contrasena.tsx`.
>
> - **(a) Recomendada: sí, en 03c.** Es la forma que ya usa `BuscadorDeCuenta` (`buscar.reset()`, T-05 de AUTH-02 r2), una línea por formulario, sin tocar ganchos, textos ni la salida del camino feliz ni la del error del servidor. Las 11 rojas del tester pasan sin tocarlas y 03c puede cerrarse en verde.
> - **(b) Diferirlo a CHORE-04**, que pasaría a llamarse "guardas y limpieza de envío" (ya va a tocar esos mismos manejadores: filas 7 a 10 y 12 a 17 de la "Lista para CHORE-04"). Las 11 rojas siguen en la suite (ninguna prueba se desactiva para que pase), así que **03c no se cierra ni se hace su commit hasta que CHORE-04 entregue el remedio**, y CHORE-03 queda abierto. Diferirlo a ADMIN-01 y a un encargo de `auth` (que hoy no existe) es lo mismo, con 03c abierto más tiempo.

> **DH-8.** Para corregir T-03 ("Editar clase" con un `400 VALIDACION` de `maestroIds` no muestra nada) y T-04 ("Publicar un anuncio" con un `400 VALIDACION` de `titulo` no muestra nada), ¿autorizas que en 03b salgan de "No se toca" estos archivos, solo en las líneas de §D-4 (Enmienda 4)?
> - **(a) Recomendada: tres archivos.** `frontend/src/features/clases/components/formulario-clase.tsx` (la importación y una llamada), `frontend/src/features/clases/components/formulario-publicacion.tsx` (la importación y una llamada) y **`frontend/src/features/clases/hooks.ts`**, que el plan protege como todos los `hooks.ts` (PA-2): solo `useCrearPublicacion`, cuyo `onError` pasa a recibir lo que se envió y a decidir con la misma función que el formulario (una importación y dos líneas). Así el formulario y su gancho deciden en un solo lugar, también con la vista desmontada.
> - **(b) Sin tocar `hooks.ts`: dos archivos.** Solo los dos formularios. El gancho sigue callando ante un `titulo:` y es el formulario quien avisa cuando su tipo no pinta ese campo. Funciona, pero la decisión queda partida en dos sitios (el gancho con su lista de siempre y el formulario con la nueva), que es justo lo que "Puntos de ataque" pide evitar.
>
> Si no autorizas ninguna, las cuatro pruebas rojas de T-03 y T-04 siguen en la suite y 03b no puede cerrarse en verde (ninguna prueba se desactiva para que pase); el remedio iría a un encargo aparte y 03b esperaría a ese encargo.

**Enmienda 3: no queda ninguna abierta.** La única (DH-6, abajo) la respondió el humano el 2026-10-26: sí (`aprobacion.md`, "Decisiones del humano a la Enmienda 2"). Lo que sigue es el historial.

Plan original y Enmienda 1: ninguna. Lo que el alcance deja abierto va en "Suposiciones" con su alternativa; ninguna cambia la forma del contrato.

**Enmienda 2 (ronda 1 del tester en 03a): una pregunta bloqueante, DH-6.**
> **DH-6.** ¿Autorizas que, en 03a, `frontend/src/components/adjuntos/adjuntos-de-publicacion.tsx` salga de "No se toca" solo para agregar la guarda síncrona con ref al botón «Descargar» (`VistaDeFicha`), con su prueba CH3-A26, para corregir T-02 (dos clics seguidos mandan dos peticiones y dan dos avisos; defecto previo a `ad10844`)? **Recomendación: sí.** Si dices que no, el remedio se difiere a un encargo aparte y 03a no puede cerrarse mientras las tres pruebas rojas de T-02 sigan en la suite (detalle en "Enmienda 2", DH-6).

DH-5 (el remedio de T-01, que cambia S-05) no bloquea: la ronda 2 se ejecuta con la opción recomendada salvo que el humano la vete. Enmienda 3: el humano respondió DH-5 sí y DH-7 con la opción (b) del manager, el 2026-10-26 (S-14).

## Decisiones para el humano (Enmienda 1)
No bloquean: con cada una, el plan se ejecuta con la opción recomendada mientras el humano no diga otra cosa, salvo DH-2, que el humano confirma al aprobar el plan (la regla de frases de recuperación no deja un camino diferido como observación).

| # | Pregunta | Recomendación del arquitecto | Opinión del manager | Si se elige la otra opción |
|---|---|---|---|---|
| DH-1 (S-01, N-03) | En las consultas de `tareas`, `clases` y `admin`, ¿el texto fijo del lugar se aplica solo ante un `400 VALIDACION` o también ante los códigos con mensaje del servidor (`SERVICIO_OCUPADO`, `TEMA_REPETIDO`…), es decir, S-22 completo? | Solo ante `VALIDACION`: los mensajes de esos códigos están en español y dicen más que el genérico; el texto de zod en inglés solo llega en `VALIDACION` | Aceptar S-01 (solo `VALIDACION`), llevándolo al humano como decisión sobre el alcance | El paso 5 de `mensajeDeErrorDeConsulta` da siempre el respaldo; cambian los textos de los `503` en listas; CH3-A04, A09, B02 y C02 se ajustan en una enmienda |
| DH-2 (S-06 b2, M-03) | ¿Aceptas que los caminos de navegación (pulsar la sección activa; otra sección y regreso antes del `staleTime`; atrás y adelante) de las consultas que reemplazan la vista con "Algo salió mal. Inténtalo de nuevo." o con "No pudimos completar la operación. Inténtalo de nuevo." se prueben en el `chore` de foco y navegación y no en CHORE-03? La lista de consultas afectadas está en S-06 (b2). "Repetir el control" de los dos "Ver más" con toast sí entra aquí (CH3-A21 y CH3-A22) | Sí: es el mismo texto en el mismo lugar que hoy sale con un `5xx`, y los mecanismos que lo renuevan (N-54, N-52) son de ese `chore` | Aceptar diferirlos solo con el visto bueno del humano | El plan se enmienda con un caso por camino de cada consulta de la lista, en las tres subentregas |
| DH-3 (A-2 y A-3) | ¿Se agregan a `CLAUDE.md` y a `AGENTS.md` (y a `.claude/agents/arquitecto.md`) los textos de "Documentos a actualizar"? | Sí, las dos (A-2 con la excepción de `features/calificaciones`) | Aprobar las dos (su texto de A-2 decía solo "Excepción: `features/diagnostico`") | No se aplican; la regla queda solo en este plan |
| DH-4 (R-06) | Destino de N-22 y de `formatearFechaDeClase` | N-22, carril trivial al tocar el archivo; `formatearFechaDeClase`, el próximo encargo que toque `lib/format.ts` | Lo deja al humano | El orquestador anota el destino que el humano diga |

## Suposiciones (vetables por el humano)
- **S-01. En las consultas, "texto fijo del lugar" (S-22) se aplica a los `400 VALIDACION`, no a los códigos con mensaje del servidor.** En `tareas`, `clases` y `admin`, un `VALIDACION` en una consulta (salvo el cursor, que tiene su texto, y los ids con texto propio: `claseId`, `tareaId`, `alumnoId`) muestra el respaldo del lugar, nunca el texto del servidor ni un trozo de él. Los códigos que hoy muestran el mensaje del servidor en español (`SERVICIO_OCUPADO`, `TEMA_REPETIDO`…) lo siguen mostrando en una consulta si tiene texto visible. Motivo: R-15 y N-42 apuntan al texto de zod en inglés, que solo llega en `VALIDACION`; aplicar S-22 completo cambiaría textos que hoy se alcanzan (un `503 SERVICIO_OCUPADO` en una lista), y esos mensajes del servidor están en español y dicen más que el genérico. `features/calificaciones` ya aplica S-22 completo y no cambia. Alternativa: S-22 completo en todos los módulos (cambia el texto de los `503` en listas). **Enmienda 1 (N-03):** quité la frase "el humano pidió que ningún texto visible cambie salvo donde llega un prefijo o un vacío", que no está en la petición literal de `aprobacion.md`. S-01 es una decisión sobre el alcance y pasa a "Decisiones para el humano" (DH-1); mientras no responda, el plan se ejecuta con S-01 tal como está.
- **S-02. El "texto fijo del lugar" es el genérico del módulo**, salvo donde el lugar ya tiene uno propio (las consultas de `features/calificaciones`, la lista de clases del admin): "Algo salió mal. Inténtalo de nuevo." en `tareas` y `clases`; "No pudimos completar la operación. Inténtalo de nuevo." en `admin`. Son los textos que esos lugares ya muestran ante un `5xx` o sin conexión, así que no nace ningún texto ni ningún patrón (`DESIGN.md` no cambia). Alternativa: un texto por lugar ("No pudimos cargar a los alumnos…"), con textos nuevos en `data.ts`, marca en `DESIGN.md` y sus caminos de recuperación.
- **S-03. Una sola regla para el mensaje sin texto visible, la que ya aprobó el humano en calificar (T-05 y CAL-T-135, comprobación humana de CALIFICACIONES-01):** si el `VALIDACION` nombra un campo que el formulario pinta, ese campo muestra un `ErrorDeCampo` con el genérico del módulo y no hay aviso; si nombra un campo que no pinta, o no trae ruta, la persona recibe un solo aviso con el genérico (toast en `tareas` y `clases`; el `MensajeError` del formulario en `admin` y `auth`, que es como esos módulos muestran hoy los errores del servidor). Nunca ambos ni ninguno.
- **S-04. "Sin caracteres visibles" es `contarCaracteresVisibles(texto) === 0`**, la regla única de contenido visible de `shared/src/clases.ts` (ya exportada en `@campus/shared`). Cubre espacios, NBSP, `U+3000`, tabuladores y saltos, los de ancho cero (`U+200B`, `U+200C`, `U+200D`, `U+2060`, `U+FEFF`), los de control (`U+0085`) y el conjunto "se ve vacío" (`U+2800`, `U+1D159`, rellenos Hangul). Un mensaje solo de puntuación ("...") cuenta como visible y se muestra. No se copia la regla en el frontend (CAL-T-99 lo prohíbe).
- **S-05. La ruta que se quita es `^[\p{L}\p{M}\p{N}_.-]+:` seguida de `\s*`, una sola vez, sobre el mensaje crudo y solo en `VALIDACION`.** Cubre puntos, índices, guiones, guiones bajos, mayúsculas, un solo carácter (`.`, `-`, `0`) y letras fuera de ASCII (`parámetro:`, el respaldo de `validarParametros`, O-r3c-1). Un mensaje que empieza con espacio, o con palabras separadas antes de los dos puntos ("Calificación de 0 a 10: …"), no se recorta. Los códigos con mensaje del servidor nunca se recortan (lo fija CAL-T-123). `campoDeErrorDeApi` no cambia (`/^([a-zA-Z_]+):\s*/`), así que "cursor.0:" no es un error de cursor.
  **Enmienda 2 (T-01).** "Una sola vez" no basta: el servidor arma `${ruta}: ${mensaje}` (`validarCuerpo` y `validarParametros`, `backend/src/handlers/validacion.ts:18` y `:29`) y los esquemas de `shared/` de los ids, de `confirmar` y de `tema` ya traen el nombre de su campo al inicio de su propio mensaje, así que llega "archivoId: archivoId: debe ser un identificador válido" (inventario completo en §D-1, "Rutas dobles del servidor"). La regla pasa a ser: **se quita la ruta (la misma expresión, una vez) y, solo si se quitó, se quita además un nombre de campo en camelCase que la siga: `^[a-z][A-Za-z0-9]*:\s*`, una vez.** Ese nombre empieza con minúscula ASCII y solo lleva letras y dígitos ASCII, sin puntos ni espacios; así "x: Nota: algo" → "Nota: algo", "archivoIds.0: Debe ser 0: 10" → "Debe ser 0: 10", "puntajes.0.criterioId: 14:30 no es válido" → "14:30 no es válido" y 'cuerpo: Unrecognized key: "nota"' → 'Unrecognized key: "nota"' siguen como estaban (CAL-T-121, CH3-A01 y N-36), y "archivoId: archivoId: x", "confirmar: confirmar: x", "temaIds.0: temaId: x" y "categorias.0.id: categoriaId: x" dan "x". Nunca se quitan más de dos prefijos (la ruta del servidor y el nombre que repite el esquema): "a: b: c: d" → "c: d". Razón de la forma: en el inventario, todo mensaje de `shared/` que empieza con "palabra:" es un nombre de campo en camelCase, y todo texto para la persona que sigue a una ruta empieza con mayúscula, con un dígito o con comillas (`shared/`, `core/calificaciones/calificar.ts`, `core/tareas/categorias.ts`, `adapters/db`, y los mensajes de zod). Los códigos con mensaje del servidor siguen sin recortarse. Enmienda 3 (M-04): la misma convención aparece fuera de `shared/`, en el esquema local `parametrosIdSchema` de `backend/src/handlers/admin.ts:60` ("id: id: debe ser un identificador válido", 03c); la regla ya lo cubre ("id" casa con el nombre en camelCase), así que la regla no cambia; solo suma su fila en §D-1 y su caso CH3-C08.
- **S-06. Frases de recuperación.** Ningún texto de recuperación cambia ni se crea. El chore suma disparadores a textos que ya existen en los mismos lugares: (a) el genérico en un `ErrorDeCampo` (nuevo fuera de calificar: el campo pintado con mensaje vacío); (b) el genérico de una consulta ante un `VALIDACION` fuera de contrato (el mismo texto y el mismo lugar que hoy salen con un `5xx`). Para (a), la acción que el texto pide es repetir el envío: el plan exige el camino "repetir el control" en cada formulario, y "ir a otra sección y regresar antes del `staleTime`" en uno por módulo; "pulsar la sección activa" no aplica a un error de envío (no hay nada cargado que renovar; lo escrito y su error viven en el formulario). Para (b), los caminos de esas frases en las consultas son del `chore` (b) de foco y navegación, que ya los tiene asignados (N-54, N-52); este chore no los cambia ni los empeora. Si el humano no lo acepta, (b) suma los casos de camino de cada consulta tocada y el chore crece con el alcance de (b).
  **Enmienda 1 (M-03).** (b) se parte en dos. **(b1) Repetir el control, donde el control sigue en pantalla tras el aviso, entra en CHORE-03:** "Ver más" de la lista de entregas (`features/tareas/entregas-view.tsx:111`, toast) y "Ver más comentarios" del hilo privado (`features/tareas/components/hilo-privado.tsx:175`, toast); casos CH3-A21 y CH3-A22. En `tareas`, `clases` y `admin`, todos los demás errores de consulta reemplazan la vista o la lista con un `MensajeError` (también los "Ver más" de `mensajeDeErrorDeLista` y los de `tabla-enlaces.tsx` y `registrados-del-enlace.tsx`, cuyo `isError` quita la tabla con su botón), así que no queda control que repetir en el mismo lugar; `features/calificaciones` no gana ningún disparador (su "Ver más tareas" ya da el texto fijo). **(b2) Los caminos de navegación** (pulsar la sección activa con otra `location.key`; ir a otra sección y regresar antes del `staleTime`; atrás y adelante) **de las consultas cuyo error reemplaza la vista o la lista con "Algo salió mal. Inténtalo de nuevo." (o "No pudimos completar la operación. Inténtalo de nuevo." en `admin`) se difieren al `chore` de foco y navegación**, solo si el humano lo confirma (DH-2). Consultas afectadas: en `tareas`, la primera carga del detalle, de "Editar tarea", de la lista de entregas, de la entrega de un alumno, del hilo y de "Tu trabajo"; en `clases`, las once de §D-4 y los cinco "Ver más" de `mensajeDeErrorDeLista` (muro, comentarios, inicio del estudiante, inicio del maestro, sección de un tema); en `admin`, la tabla de enlaces y los registrados de un enlace. Es el mismo texto en el mismo lugar que hoy sale con un `5xx`; los mecanismos que lo renuevan (N-54, N-52) son de ese `chore`. Si el humano no lo confirma, el plan se enmienda con un caso por camino de cada consulta de esa lista.
- **S-07. La tabla común vive en `frontend/src/lib/errores-de-api-fuera-de-contrato.ts`**, la exporta y solo la importan pruebas (no entra en el paquete de la aplicación). No contiene `U+2800` ni `U+1D159`, ni escritos como escape: CAL-T-99 (`estatico-01c-r1.ataque`) los prohíbe en cualquier archivo de producción de `src/`. Esos dos casos van en la prueba de `lib/` (las pruebas están fuera de esa regla). Enmienda 1 (N-02): los demás caracteres invisibles de la tabla se escriben como escapes, nunca literales (§D-3, CH3-A24).
- **S-08. `features/auth` no tiene variante de consulta.** Sus dos consultas son `GET /me` (sin parámetros) y la de la invitación (`POST` con el token en el cuerpo, cuyo `VALIDACION` trae texto de `shared/` en español); las dos usan `mensajeDeErrorAuth` con el contrato. Enmienda 1 (N-04 d): el resumen de 03c las lista como hermanas, con esta razón (`acceso-restringido-view.tsx:25` y `establecer-contrasena-view.tsx:44`).
- **S-09. `features/diagnostico` no entra** (temporal; muestra `codigo: mensaje` a propósito). La regla estática del chore lo exceptúa por nombre.
- **S-10. "El error de la lista de alumnos (`features/clases/lib.ts:426`)" de la fila de §3 es el de la lista de categorías** (`erroresDeCategoriasDeApi`, el `VALIDACION` de `categorias:` en esa línea). Se cubre así; el roster de alumnos (`tabla-alumnos.tsx`) entra como consulta.
- **S-11. N-22 y `formatearFechaDeClase`** (filas de §3 con destino "el `chore` posterior a CALIFICACIONES-01, el mismo de S-15") no entran: el humano acotó CHORE-03 a la traducción de errores y N-46, y esas filas tocan el backend y `lib/format.ts`. Queda una pregunta no bloqueante para el cierre (Riesgos, R-06).
- **S-12. `services/apiClient.ts` solo gana la exportación** de `CODIGOS_QUE_REDIRIGE_EL_CLIENTE`; sus comparaciones (`error.codigo === "ACCESO_RESTRINGIDO"`, `error.codigo === "CAMBIO_DE_CONTRASENA_REQUERIDO"`, `new ApiError("NO_AUTENTICADO"`) quedan literales, porque `entregas-01d-r3.ataque` las lee.
- **S-13. Tres subentregas** (03a, 03b, 03c), por el volumen de pruebas de interfaz (unos 25 formularios con cuatro casos cada uno) y porque cada una toca módulos distintos; ver "Subentregas".
- **S-14 (Enmienda 3, M-05 con DH-7 = b). La guarda con ref de los controles que solo se protegen con `isPending` no entra en el chore.** El humano lo decidió para "los 18 controles" de la revisión del manager. Al repetir su búsqueda (todo `.mutate(` y `.mutateAsync(` de producción en `frontend/src/`, contra los `if (…Ref.current` que los preceden en el mismo manejador) salen **cuatro más en `features/clases`**, de la misma clase y en lo que recorre 03b: quitar un maestro (`maestros-de-clase-view.tsx:67`), borrar un comentario (`components/comentarios-de-publicacion.tsx:74`), borrar una publicación (`components/publicacion-del-muro.tsx:118`) y quitar un alumno (`components/tabla-alumnos.tsx:59`); y uno fuera de 03b y 03c, cerrar sesión en `app/require-rol.tsx:46`. Supongo que DH-7 aplica a la clase y no solo a los 18 nombrados: los 22 de 03b y 03c (y el de `app/`) quedan fuera, con destino CHORE-04, y la lista completa está en "Puntos de ataque", "Lista para CHORE-04". Si el humano quiere tratar distinto a los cuatro nuevos, se enmienda solo esa lista.

## Alcance
**Entra:**
1. El contrato único en `lib/errores-de-api.ts` (§D-1): quitar la ruta una vez (Enmienda 2: y el nombre de campo que el esquema repite detrás, S-05), el genérico ante un texto sin caracteres visibles, la variante de consulta (S-22 sobre `VALIDACION`), `esErrorDeCursor(error, campos = ["cursor"])`.
2. La tabla común de entradas fuera de contrato (§D-3) y su recorrido en las pruebas de cada función de traducción de cada módulo.
3. La migración de `features/tareas` (incluido calificar: N-33, N-36 y los tres caminos), `components/adjuntos` (`avisoDeFalloAlSubir`), `features/clases`, `features/calificaciones` (Enmienda 1, M-01: solo el alias del cursor y N-46; su función de consulta ya cumple S-22 y no se migra), `features/admin` y `features/auth` al contrato, con el cambio mínimo (§D-4).
4. N-46: `CODIGOS_QUE_REDIRIGE_EL_CLIENTE` exportada desde `services/apiClient.ts` e importada por `features/tareas` y `features/calificaciones`.
5. Los casos de `VALIDACION` fuera de contrato de cada formulario existente y la regla estática que impide volver a manipular el mensaje del servidor fuera de `lib/errores-de-api.ts`.

**No entra:** textos nuevos o por lugar (S-02); los caminos de navegación de las consultas que reemplazan la vista (S-06 b2, `chore` de foco y navegación, si el humano lo confirma en DH-2; Enmienda 1: "repetir el control" de los dos "Ver más" con toast sí entra, S-06 b1); `features/diagnostico` (S-09); el backend (los mensajes del servidor no cambian); `shared/`; N-22 y `formatearFechaDeClase` (S-11); la duplicación de `erroresPorCampo` en `auth` y `admin` (homónimos aceptados, regla 9); `useAlPulsarLaSeccionActiva`, foco y navegación (`chore` (b)).

## Subentregas
| Sub | Qué | Por qué junta eso |
|---|---|---|
| **03a** | Contrato en `lib/errores-de-api.ts`, tabla común, `features/tareas` (crear, editar, entregar, anular, hilo, calificar, borrar, consultas) y `components/adjuntos/lib.ts` | Es donde nacieron T-04 y T-05; prueba el contrato contra el módulo con más caminos |
| **03b** | `features/clases`, `features/calificaciones` (cursor con `esErrorDeCursor`) y N-46 (`services/apiClient.ts`, `tareas/data.ts`, `tareas/lib.ts`, `calificaciones/data.ts`, `calificaciones/lib.ts`); se borra `quitarPrefijoDeCampo` | `clases` es el último usuario de `quitarPrefijoDeCampo`; N-46 toca `calificaciones` en el mismo archivo que el cursor |
| **03c** | `features/admin` y `features/auth`; la regla estática pasa a todo `src/` | Módulos independientes de los demás; formularios con `MensajeError` en lugar de toast |

Cada subentrega es un commit (regla de "Commits y cierre de subentregas"). La base de "No se toca" dentro de `frontend/` es `ad10844` para 03a y el commit de la subentrega anterior para 03b y 03c.

## Diseño
No hay petición nueva, dato nuevo ni evento. El flujo es: `apiClient` lanza `ApiError(codigo, mensaje, estado)` como hoy → un hook o una vista llama a la función de traducción de su módulo → esa función es un envoltorio de una de las dos funciones del contrato, con la tabla de traducción del módulo.

### §D-1. El contrato (`frontend/src/lib/errores-de-api.ts`)
Lo que ya existe y no cambia: `ErroresFormulario`, `IncidenciaValidacion`, `campoDeErrorDeApi` (con su expresión `/^([a-zA-Z_]+):\s*/`), `erroresDeFormularioDeApi(error, camposValidos, mensajeDeError)` (misma firma: el vacío lo resuelve el `mensajeDeError` del módulo) y `erroresPorCampo`. `quitarPrefijoDeCampo` se conserva en 03a (lo usa `features/clases`) y se borra en 03b.

Lo nuevo, con su firma exacta:

```ts
import { contarCaracteresVisibles } from "@campus/shared"

// Lo que cada módulo le dice al contrato. Vive aquí (lib/), no en un types.ts de módulo.
export interface TraduccionDeErrores {
  generico: string                                    // el genérico del módulo
  mensajesPorCodigo: Readonly<Record<string, string>> // códigos con texto fijo propio
  codigosConMensajeDelServidor: readonly string[]     // códigos cuyo mensaje ya viene en español
  textosPorCampo: Readonly<Record<string, string>>    // VALIDACION de un id con texto fijo (claseId…)
}

// Una ruta de campo: letras (también fuera de ASCII), marcas, dígitos, punto, guion bajo y guion,
// seguida de dos puntos y de los espacios que la separan del mensaje.
const RUTA_DEL_MENSAJE = /^[\p{L}\p{M}\p{N}_.-]+:\s*/u

// Enmienda 2 (T-01): el nombre de un campo en camelCase (minúscula ASCII al inicio; letras y dígitos
// ASCII, sin puntos ni espacios) que algunos esquemas de shared/ repiten al inicio de su mensaje.
const CAMPO_QUE_REPITE_EL_ESQUEMA = /^[a-z][A-Za-z0-9]*:\s*/

// La ruta, una vez; y, solo si había ruta, el nombre de campo que la sigue, una vez.
export const quitarRutaDelMensaje = (mensaje: string): string => {
  const sinRuta = mensaje.replace(RUTA_DEL_MENSAJE, "")
  if (sinRuta === mensaje) return mensaje
  return sinRuta.replace(CAMPO_QUE_REPITE_EL_ESQUEMA, "")
}

export const textoVisibleOGenerico = (texto: string, generico: string): string =>
  contarCaracteresVisibles(texto) > 0 ? texto : generico

const CAMPOS_DE_CURSOR: readonly string[] = ["cursor"]
export const esErrorDeCursor = (
  error: unknown,
  campos: readonly string[] = CAMPOS_DE_CURSOR,
): boolean  // campoDeErrorDeApi(error) !== null && campos.includes(campo)

export const mensajeDeErrorDeApi = (error: unknown, traduccion: TraduccionDeErrores): string
export const mensajeDeErrorDeConsulta = (
  error: unknown,
  traduccion: TraduccionDeErrores,
  respaldo: string = traduccion.generico,
): string
```

Orden de decisión (retornos tempranos; `Object.hasOwn` en los dos mapas, para que "constructor", "toString" o "__proto__" den el genérico, como ya fijan `lib.test.ts` de `tareas` y de `auth`):

| Paso | `mensajeDeErrorDeApi` (acciones: guardar, enviar, borrar, descargar) | `mensajeDeErrorDeConsulta` (lo que se carga, incluidos "Ver más") |
|---|---|---|
| 1. No es `ApiError` | `generico` | `respaldo` |
| 2. `VALIDACION` y `campoDeErrorDeApi` está en `textosPorCampo` | ese texto | ese texto |
| 3. `VALIDACION` (cualquier otro) | `textoVisibleOGenerico(quitarRutaDelMensaje(message), generico)` | `respaldo` |
| 4. Código en `mensajesPorCodigo` | ese texto | ese texto |
| 5. Código en `codigosConMensajeDelServidor` | `textoVisibleOGenerico(message, generico)` (sin quitar nada) | `textoVisibleOGenerico(message, respaldo)` |
| 6. Cualquier otro | `generico` | `respaldo` |

Por qué `VALIDACION` va antes que los mapas: `features/admin` tenía "VALIDACION" dentro de su lista de códigos con mensaje del servidor (lo mostraba crudo, con la ruta); con el paso 2-3 primero, ningún módulo puede volver a mostrarlo crudo aunque lo liste. En los demás módulos los conjuntos son disjuntos y el orden no cambia ninguna salida.

El cursor no es un paso del contrato: cada vista lo reconoce antes con `esErrorDeCursor(error, campos)` y muestra su texto de "cambió mientras la veías", como hoy.

**Rutas dobles del servidor (Enmienda 2, T-01).** Inventario por búsqueda en `shared/src/` (mensajes que empiezan con "`palabra`:", literales y con plantilla) y en `backend/src/handlers/validacion.ts`. El servidor responde `${path.join(".")}: ${message}` (`validarCuerpo` y `validarParametros`); con estos esquemas, el mensaje lleva dos prefijos:

| Lo que llega | Esquema de `shared/` | Dónde se alcanza | Sub | Con la regla de S-05 (Enmienda 2) |
|---|---|---|---|---|
| `archivoId: archivoId: debe ser un identificador válido` | `archivoIdParamSchema` (`archivos.ts:78`), `archivoDeEntregaParamSchema` y `archivoDeEntregaDeAlumnoParamSchema` (`idDeRuta`, `entregas.ts:135`) | Descargar un adjunto (detalle, "Tu trabajo", entrega de un alumno; muro en 03b) | 03a, 03b | "debe ser un identificador válido" |
| `confirmar: confirmar: no es válido` | `borrarTareaQuerySchema` (`tareas.ts:233`) | Borrar una tarea | 03a | "no es válido" |
| `tareaId: tareaId: …`, `alumnoId: alumnoId: …` | `tareaIdParamSchema`, `idDeRuta` | Rutas de tareas y entregas | 03a | Su texto fijo (`textosPorCampo`, paso 2; `campoDeErrorDeApi` lee el primer prefijo), sin cambio |
| `claseId: claseId: …` | `claseIdParamSchema` | Rutas de clase | 03a, 03b | Su texto fijo, sin cambio |
| `alumnoId: alumnoId: …` | `agregarAlumnoSchema` (cuerpo), `alumnoIdParamSchema` | Alta manual y baja (`clases` no tiene texto fijo de `alumnoId`) | 03b | "debe ser un identificador válido" |
| `temaId: temaId: …` | `temaIdParamSchema`, `moverElementoSchema`, `crearPublicacionSchema` (material) | Renombrar y borrar un tema, mover de tema, publicar un material | 03b | "debe ser un identificador válido" |
| `temaIds.<i>: temaId: …` | `ordenTemasSchema` | Reordenar los temas | 03b | "debe ser un identificador válido" |
| `publicacionId: publicacionId: …` | `publicacionIdParamSchema`, `publicacionDeMoverParamSchema`, `publicacionYComentarioParamSchema` | Borrar una publicación, mover, comentar | 03b | "debe ser un identificador válido" |
| `comentarioId: comentarioId: …` | `publicacionYComentarioParamSchema`, `comentarioIdParamSchema` | Borrar un comentario | 03b | "debe ser un identificador válido" |
| `maestroId: maestroId: …` | `asignarMaestroSchema` (cuerpo), `maestroIdParamSchema` | Agregar y quitar un maestro | 03b | "debe ser un identificador válido" |
| `maestroIds.<i>: maestroId: …` | `maestroIdsSchema` (`crearClaseAdminSchema`) | Crear y editar una clase (admin) | 03b | "debe ser un identificador válido" |
| `categorias.<i>.id: categoriaId: …` | `categoriaEntradaSchema` (`reemplazarCategoriasSchema`) | Guardar las categorías (no se pinta en la fila: `PREFIJO_DE_FILA_DE_CATEGORIA` solo lee `nombre` y `peso`) | 03b | "debe ser un identificador válido" |
| `tema: tema: elige un tema válido` | `trabajoQuerySchema` | Consulta de "Trabajo de clase" | 03b | Consulta: el respaldo (S-01), sin cambio |
| `id: id: debe ser un identificador válido` (Enmienda 3, M-04) | Ninguno: esquema local `parametrosIdSchema` de `backend/src/handlers/admin.ts:60` (`z.uuid("id: debe ser un identificador válido")`), fuera de `shared/` | Por `validarParametros` en cuatro rutas de `:id` del administrador: restablecer la contraseña de una cuenta (`POST /usuarios/:id/restablecer-contrasena`, `admin.ts:112`), corregir su correo (`PUT /usuarios/:id/correo`, `:137`), revocar un enlace (`POST /enlaces-registro/:id/revocar`, `:179`) y los registrados de un enlace (`GET /enlaces-registro/:id/registrados`, `:196`, consulta) | 03c | Acciones (`mensajeDeErrorAdmin`): "debe ser un identificador válido". Consulta de registrados (`mensajeDeConsultaAdmin`): el respaldo, "No pudimos completar la operación. Inténtalo de nuevo." (S-01; `admin` no tiene `textosPorCampo`). No entra en CH3-A25 (no se puede importar de `@campus/shared`): la cubre CH3-C08 con el literal |

~~`features/admin` y `features/auth` (03c) no llaman a ninguna de esas rutas.~~ Enmienda 3 (M-04): `features/admin` (03c) llama a las cuatro rutas de la última fila; `features/auth` no llama a ninguna. Los mensajes de un solo prefijo (`cuerpo: debe ser un objeto JSON`, `claseId: debe ser…` de `middleware/pertenencia.ts`, `cursor: no es válido`, `${campo}: no es válido` de `adapters/db/calificaciones.ts`, los de `core/`) no cambian con la regla: lo que sigue a su ruta empieza con mayúscula, o su primera palabra no va pegada a dos puntos. Ningún texto que sigue a una ruta en el servidor empieza con "minúscula + letras + dos puntos" salvo los nombres de campo del inventario.

### §D-2. Qué recibe la persona, por clase de entrada (la regla que prueban todas las funciones)
| Entrada del servidor | Acción con campo pintado | Acción sin campo pintado | Consulta |
|---|---|---|---|
| `VALIDACION` "`<campo pintado>`: Mensaje" | `ErrorDeCampo` "Mensaje", sin aviso (como hoy) | — | `respaldo` |
| `VALIDACION` "`<campo pintado>`:" + sin texto visible | `ErrorDeCampo` con el genérico, sin aviso (S-03) | — | `respaldo` |
| `VALIDACION` "`<ruta no pintada>`: Mensaje" (con puntos, índices, otro campo) | — | un aviso "Mensaje" | `respaldo` |
| `VALIDACION` "`<ruta no pintada>`:" + sin texto visible, o sin ruta y sin texto visible | — | un aviso con el genérico | `respaldo` |
| `VALIDACION` "`<ruta>`: Debe ser 0: 10" | según el campo | "Debe ser 0: 10" (un solo recorte, N-36; Enmienda 2: lo que sigue a la ruta no es un nombre en camelCase, S-05) | `respaldo` |
| `VALIDACION` "`<ruta>`: `<nombreDeCampo>`: Mensaje" (el esquema repite su campo; Enmienda 2, T-01; inventario en §D-1) | `ErrorDeCampo` "Mensaje", sin aviso | un aviso "Mensaje" | `respaldo` |
| `VALIDACION` "`<ruta>`: `<nombreDeCampo>`:" + sin texto visible (Enmienda 2) | `ErrorDeCampo` con el genérico, sin aviso | un aviso con el genérico | `respaldo` |
| `VALIDACION` "`<campo que el formulario pinta en otro modo, no en este>`: Mensaje" (Enmienda 4, T-03 y T-04: `maestroIds` al editar una clase, `titulo` en un anuncio) | — (en este modo no está pintado) | un aviso "Mensaje" | `respaldo` |
| Lo mismo + sin texto visible (Enmienda 4) | — | un aviso con el genérico | `respaldo` |
| `VALIDACION` sin ruta ("Los datos enviados tienen caracteres no permitidos.") | — | ese texto, tal cual | `respaldo` |
| `VALIDACION` de `claseId`, `tareaId`, `alumnoId` | — | su texto fijo (como hoy) | su texto fijo |
| Código con mensaje del servidor, mensaje con texto | — | ese mensaje, sin recorte (como hoy) | ese mensaje |
| Código con mensaje del servidor, sin texto visible (N-38) | — | un aviso con el genérico | `respaldo` |
| Código con texto fijo, `5xx`, sin conexión | como hoy | como hoy | como hoy |

En todos los casos de acción: lo escrito se conserva y el botón sale de la espera (nada de esto cambia en los formularios: lo garantiza la mutación, que ya termina en error; las pruebas lo comprueban).

**Enmienda 4 (T-03 y T-04). "Campo pintado" se decide por el modo de lo que se envió.** Un formulario con modos (crear o editar, anuncio o material) pasa a la función de traducción la lista de los campos que pinta **ese** modo, no la de todos sus modos. La lista vive una sola vez en el `data.ts` del módulo, por modo, y el formulario y su gancho la leen con la misma función y con el modo del envío (el `tipo` de los datos enviados, que el gancho recibe como `variables`), nunca con el estado actual del formulario. Un campo que el formulario acepta en otro modo es, en este, un campo que no pinta: un solo aviso (filas nuevas de la tabla). En `features/clases` aplica a crear y editar clase y a publicar un anuncio o un material (§D-4); los demás formularios del módulo y los de `tareas` no tienen campos que dependan del modo o ya lo resuelven (inventario en "Enmienda 4", hermanos).

**Enmienda 5 (T-05). "Un solo mensaje" vale para el envío que la persona acaba de hacer, no solo para una respuesta.** La regla del formulario: **antes de validar en local, el formulario limpia el error del servidor del envío anterior.** Donde ese error vive en el estado de la mutación (`isError`, con su `MensajeError`: los formularios de `admin` y `auth`), el manejador lo limpia con `mutacion.reset()`, solo si hay error (§D-4, Enmienda 5). Donde vive en el estado del formulario (`setErrores` en `clases` y `tareas`), la validación local ya lo reemplaza en el mismo estado, o lo limpia a mano (`hilo-privado.tsx:68`). Los avisos (toasts) no se quedan en la vista, así que no cuentan para la secuencia. Secuencias, en un formulario con `MensajeError`:

| Envío anterior | Envío nuevo | Qué ve la persona |
|---|---|---|
| Rechazado por el servidor (cualquier fila de la tabla de arriba, o un código) | Rechazado por la validación local, sin petición | Solo el `ErrorDeCampo` de la validación local; el `MensajeError` anterior desaparece (antes, los dos) |
| Rechazado por la validación local | Rechazado por el servidor | Solo el `MensajeError` (sin cambio: el manejador ya hace `setErrores({})` antes de `mutate`) |
| Rechazado por el servidor | Rechazado por el servidor | Solo el `MensajeError` del envío nuevo (sin cambio) |
| Aceptado (con su texto de éxito en la vista: invitar maestro, corregir el correo) | Rechazado por la validación local | El texto de éxito sigue y aparece el `ErrorDeCampo` (sin cambio: `reset()` solo corre con `isError`; el éxito no es un mensaje de error) |
| Rechazado por el servidor | Aceptado | El éxito de siempre, sin `MensajeError` (sin cambio) |

### §D-3. La tabla común (`frontend/src/lib/errores-de-api-fuera-de-contrato.ts`)
Solo datos, exportados; la importan pruebas. Sin `U+2800` ni `U+1D159` (S-07) y sin texto de la interfaz (ningún literal de `data.ts`).

```ts
export const MENSAJE_DE_PRUEBA = "Revisa este valor."
export const CAMPO_FUERA_DE_CONTRATO = "campoFueraDeContrato" // ningún formulario lo pinta

// Rutas que ningún formulario pinta (ni ids con texto fijo, ni "cursor").
export const RUTAS_FUERA_DE_CONTRATO: readonly string[] = [
  CAMPO_FUERA_DE_CONTRATO, "archivoIds.0", "archivoIds.12", "rubrica.2", "orden.3", "enlaces.0.url",
  "puntajes.0.criterioId", "cursor.0", "limite", "parámetro", "PUNTAJES.0.PUNTOS", "a.b.c.d.e.f.g.h",
  "x.0.y", "campo_raro-1", "0", "-", "_", ".", "archivoIds.0.id", // Enmienda 1 (N-01)
]

// Restos que no tienen ningún carácter visible.
export const RESTOS_SIN_TEXTO_VISIBLE: readonly string[] = [
  "", " ", "   ", "\t", "\n", "\t\n ", "\u{00A0}", "\u{3000}", "\u{200B}", "\u{200C}", "\u{200D}", "\u{2060}",
  "\u{FEFF}", "\u0085", "\u{200B}\u{00A0}\u0085",
]
// Enmienda 1 (N-02): todo carácter invisible se escribe como escape (`\u{200B}`, con llaves), nunca
// literal, en esta tabla, en las pruebas y en el código de producción: un literal invisible no se
// puede revisar en un diff. Lo comprueba CH3-A24.

export type ClaseFueraDeContrato = "campo-no-pintable" | "sin-texto-visible" | "ruta" | "dos-puntos-dentro" | "sin-ruta"
export interface EntradaFueraDeContrato {
  clase: ClaseFueraDeContrato
  mensaje: string          // crudo, como llega en error.mensaje
  resto: string | null     // lo que debe quedar tras quitar la ruta; null = sin texto visible (genérico)
}
export const ENTRADAS_FUERA_DE_CONTRATO: readonly EntradaFueraDeContrato[]
// Se arma (con un map sobre las dos listas, en el mismo archivo) así:
// - campo-no-pintable: `${CAMPO_FUERA_DE_CONTRATO}: ${MENSAJE_DE_PRUEBA}` → MENSAJE_DE_PRUEBA
// - ruta: por cada ruta R: `${R}: ${M}`, `${R}:${M}`, `${R}:\t${M}` → M
// - sin-texto-visible: por cada resto S: `${CAMPO_FUERA_DE_CONTRATO}:${S}`, `archivoIds.0:${S}` y `${S}` solo → null
// - dos-puntos-dentro: "archivoIds.0: Debe ser 0: 10" → "Debe ser 0: 10"; "x: Nota: algo" → "Nota: algo" (N-36)
// - sin-ruta: MENSAJE_DE_PRUEBA → él mismo; "Calificación de 0 a 10: revisa los puntos" → él mismo
// - Enmienda 2 (T-01), constante CON_CAMPO_REPETIDO, con las clases que ya existen (el tipo
//   ClaseFueraDeContrato no cambia) y solo con rutas de RUTAS_FUERA_DE_CONTRATO (nadie las pinta):
//   { clase: "ruta", mensaje: `${CAMPO_FUERA_DE_CONTRATO}: ${CAMPO_FUERA_DE_CONTRATO}: ${M}`, resto: M }
//   { clase: "ruta", mensaje: `archivoIds.0.id: ${CAMPO_FUERA_DE_CONTRATO}: ${M}`, resto: M }
//   { clase: "sin-texto-visible", mensaje: `${CAMPO_FUERA_DE_CONTRATO}: ${CAMPO_FUERA_DE_CONTRATO}:\u{200B}`, resto: null }
//   Se suman a ENTRADAS_FUERA_DE_CONTRATO después de DOS_PUNTOS_DENTRO; así toda prueba que recorre la
//   tabla (las de 03a, 03b y 03c) pasa también por la ruta doble. Los mensajes reales del servidor no
//   van en la tabla (sus campos, como `temaId`, sí los pinta algún formulario): van en CH3-A25.

// Una entrada de cada clase requerida, para las pruebas de interfaz de cada formulario.
export const ENTRADAS_DE_FORMULARIO: Readonly<Record<"campo-no-pintable" | "sin-texto-visible" | "ruta", EntradaFueraDeContrato>>
// campo-no-pintable: `${CAMPO_FUERA_DE_CONTRATO}: ${M}`; sin-texto-visible: "   " (sin ruta);
// ruta: `archivoIds.0.id: ${M}` (Enmienda 1, N-01: tres niveles, la forma literal `campo.<i>.subcampo:`
// de la regla de AGENTS.md; ningún formulario pinta `archivoIds` ni sus hijos)
```

Los tipos `ClaseFueraDeContrato` y `EntradaFueraDeContrato` viven en ese archivo de `lib/` (como `ErroresFormulario` en `lib/errores-de-api.ts`); ningún módulo los declara.

### §D-4. Migración por módulo (cambio mínimo)
Cada módulo declara su `TraduccionDeErrores` en su `data.ts` (constante, regla 2; `satisfies TraduccionDeErrores` con `import type`) y sus funciones de traducción pasan a ser envoltorios con el mismo nombre y la misma firma. Ningún hook cambia de forma (las reglas estáticas cuentan `renovarTrasErrorDeLaEntrega(` en 3 y cinco llamadas a `avisarDelErrorDeLaEntrega`).

**`features/tareas` (03a; N-46 en 03b)**
| Función | Queda como | Cambio visible |
|---|---|---|
| `mensajeDeErrorTareas(error)` | `mensajeDeErrorDeApi(error, TRADUCCION_DE_ERRORES_TAREAS)`; `textosPorCampo`: `claseId` → `sinAccesoALaClase`, `tareaId` → `tareaNoEncontrada`, `alumnoId` → `alumnoNoEncontrado` | Solo con rutas con puntos, índices o letras fuera de ASCII (antes salía la ruta), con resto sin texto visible (antes vacío o invisible) y con un código con mensaje del servidor sin texto visible (antes en blanco). Enmienda 2 (T-01): "archivoId: archivoId: debe ser un identificador válido" (descargar) → "debe ser un identificador válido" y "confirmar: confirmar: no es válido" (borrar) → "no es válido" (antes, y en la ronda 1, salía «archivoId: …» y «confirmar: …») |
| `mensajeDeConsultaTareas(error)` (nueva) | `mensajeDeErrorDeConsulta(error, TRADUCCION_DE_ERRORES_TAREAS)` | Un `VALIDACION` fuera de contrato en una consulta da el genérico (antes, el texto de zod) |
| `erroresDeLaTareaDeApi` | Sin cambio de código (ya usa `mensajeDeErrorTareas`) | "titulo:" vacío → `ErrorDeCampo` con el genérico |
| `errorDelCampoDeApi` (privada), `errorDeEnlacesDeApi`, `errorDeTextoDeApi` | Si el `VALIDACION` es de su campo (`/^enlaces(\.\d+)?:/`, `/^texto:/`), `mensajeDeErrorTareas(error)`; si no, `null` | "enlaces.0:" o "texto:" vacíos → `ErrorDeCampo` con el genérico (antes vacío) |
| `mensajeDelCampoDeCalificacion` | `esErrorDeCampoDeCalificacion(error) ? mensajeDeErrorTareas(error) : null` (sin la segunda comprobación de `esApiError`, N-33) | Ancho cero o `U+0085` tras el prefijo → genérico |
| `mensajeDelAvisoDeCalificar` | `(error) => mensajeDeErrorTareas(error)`; se conserva el nombre porque `aviso-calificar-01c-r3.ataque` (CAL-T-127) lo exige en `hooks.ts` y `lib.ts` | "version: Nota: algo" → "Nota: algo" (un solo recorte, N-36) |
| `erroresDeCalificacionDeApi` | El mensaje pasa a ser `mensajeDeErrorTareas(error)` en lugar de `slice` y comparar con `""` | Ancho cero o `U+0085` tras un prefijo pintable → `ErrorDeCampo` con el genérico |
| `PREFIJO_DE_RUTA` (privada) | Se borra (su trabajo lo hace el contrato) | — |
| `errorQueRedirigeElCliente` | En 03b importa `CODIGOS_QUE_REDIRIGE_EL_CLIENTE` de `@/services/apiClient` | — |

Vistas de `tareas` cuyo error es de una consulta y pasan a `mensajeDeConsultaTareas` (03a): `detalle-tarea-view.tsx:71`, `editar-tarea-view.tsx:71`, `entregas-view.tsx:111` (toast de "Ver más"), `:159`, `:163`, `entrega-de-alumno-view.tsx:169`, `:173`, `components/hilo-privado.tsx:175` (toast de "Ver más comentarios"), `:183`, `components/tu-trabajo.tsx:49`. Los `mensajeDeError={mensajeDeErrorTareas}` de `AdjuntosDePublicacion` (descarga, una acción) y `acciones-de-la-tarea.tsx:73` no cambian. **Enmienda 1 (M-03):** el "Ver más comentarios" del hilo no reconoce el cursor; con `mensajeDeConsultaTareas`, un `400 VALIDACION` "cursor: …" ahí da el genérico (antes, "el cursor no es válido"). Es un cambio visible declarado; el hilo no gana texto de "cambió mientras la veías" (eso sería un texto nuevo, S-02).

**`components/adjuntos/lib.ts` (03a):** en `avisoDeFalloAlSubir`, el motivo de `ARCHIVO_INVALIDO` pasa a `textoVisibleOGenerico(error.message, mensajeDeError(error))`: sin texto visible, el texto fijo de `ARCHIVO_INVALIDO` del módulo (los dos módulos lo tienen por `MENSAJES_POR_CODIGO_DE_ARCHIVO`). Misma firma. Con mensaje, la salida no cambia.

**`components/adjuntos/adjuntos-de-publicacion.tsx` (03a, Enmienda 2, T-02; solo si el humano lo autoriza en DH-6).** `VistaDeFicha` gana la guarda síncrona con ref de `CLAUDE.md` › Componentes, en un solo lugar para las dos fichas (`FichaDeAdjunto` y `FichaDeAdjuntoEnRuta`) y, por tanto, para los cuatro sitios que la usan (adjuntos de la tarea en el detalle, "Tu trabajo", la entrega de un alumno y, por el envoltorio de `features/clases`, el muro). Forma exacta:
- `VistaDeFichaProps.onDescargar` pasa de `() => void` a `() => Promise<void>`; `FichaDeAdjunto` y `FichaDeAdjuntoEnRuta` pasan `() => descargar(descarga.mutateAsync, adjunto, mensajeDeError, alFallarLaDescarga)` (sin `void`).
- En `VistaDeFicha`: `const descargandoRef = useRef(false)` y un manejador `alPulsar` asíncrono: `if (descargandoRef.current) return`; `descargandoRef.current = true`; `try { await onDescargar() } finally { descargandoRef.current = false }`. El botón llama `onClick={() => void alPulsar()}` y conserva `enEspera={pidiendo}` (el `enEspera=` del archivo sigue siendo uno: `styles/clases-r1.ataque`).
- `descargar`, `AdjuntosDePublicacionProps` (incluido `alFallarLaDescarga?: (error: unknown) => void`, que lee `entregas-01e-r2.ataque`), `components/adjuntos/hooks.ts` y los textos no cambian. Nada de `?? []`, `disabled`, `fetch(`, `console.` ni importaciones de `features/` (`entregas-01d-r1`, `entregas-01e-r2`, `refactor-01c-r1`).
- Con la guarda, `useMutation` solo tiene una llamada en vuelo, así que `pidiendo` (`isPending`) ya no sale de la espera mientras la primera sigue (lo que el tester vio en T-02). Tras asentarse, la guarda se libera y un clic nuevo vuelve a pedir la URL ("repetir el control" de "Inténtalo de nuevo").

Hermanos (regla de `AGENTS.md`), revisados por búsqueda de `enEspera=` y de `Ref.current) return` en lo que 03a toca (`features/tareas/` y `components/adjuntos/`): todas las demás acciones con mutación ya tienen su ref (`guardandoRef` en `formulario-tarea.tsx`, `entregandoRef` en `formulario-de-entrega.tsx`, `anulandoRef` en `entrega-realizada.tsx`, `borrandoRef` en `acciones-de-la-tarea.tsx`, `enviandoRef` en `panel-de-calificacion.tsx` y en `hilo-privado.tsx`, `pidiendoMasRef` en los dos "Ver más"); `lista-de-adjuntos-elegidos.tsx` no lanza mutaciones. El remedio solo aplica a «Descargar». Fuera de 03a no se audita (no es objeto del chore); el muro hereda la guarda sin tocar `features/clases` (CH3-B08, Enmienda 2).

**`features/clases` (03b)**
| Función | Queda como | Cambio visible |
|---|---|---|
| `MENSAJES_ERROR_CLASES` (constante privada de `lib.ts`) | Se mueve a `data.ts` como `MENSAJES_POR_CODIGO_DE_CLASES` (regla 2), mismo contenido | — |
| `mensajeDeErrorClases(error)` | `mensajeDeErrorDeApi(error, TRADUCCION_DE_ERRORES_CLASES)`; `textosPorCampo`: `claseId` → `sinAccesoALaClase` | Como en `tareas` ("orden.3:", "categorias.0.peso:" con otro sufijo, vacíos) |
| `mensajeDeConsultaClases(error)` (nueva) | `mensajeDeErrorDeConsulta(error, TRADUCCION_DE_ERRORES_CLASES)` | `VALIDACION` fuera de contrato en una lista → genérico |
| `mensajeDeErrorDeLista(error, textoDelCursor)` | `esErrorDeCursor(error) ? textoDelCursor : mensajeDeConsultaClases(error)` | "limite: …" en "Ver más" → genérico (R-15) |
| `erroresDeFormularioClases`, `errorDelCampoCodigo`, `erroresDelTemaDeApi` | Sin cambio de código | Campo pintado vacío → `ErrorDeCampo` con el genérico |
| `erroresDeCategoriasDeApi` | Los dos caminos usan `mensajeDeErrorClases(error)` (la fila y "categorias:") en lugar de `slice` y `quitarPrefijoDeCampo` | Fila o lista vacías → genérico |
| `avisoDeFalloAlSubir` (envoltorio) | Sin cambio | Hereda el de `components/adjuntos` |
| `CAMPOS_PINTADOS_DE_LA_CLASE` y `CAMPOS_PINTADOS_DE_LA_PUBLICACION` (nuevas en `data.ts`, Enmienda 4) | Los campos que pinta cada modo (forma exacta abajo) | — |
| `erroresDeLaClaseDeApi(error, modo)` (nueva en `lib.ts`, Enmienda 4, T-03) | `erroresDeFormularioClases(error, CAMPOS_PINTADOS_DE_LA_CLASE[modo])` | Al editar, "maestroIds: …" da un aviso (antes, nada) |
| `erroresDeLaPublicacionDeApi(error, tipo)` (nueva en `lib.ts`, Enmienda 4, T-04) | `erroresDeFormularioClases(error, CAMPOS_PINTADOS_DE_LA_PUBLICACION[tipo])` | En un anuncio, "titulo: …" da un aviso (antes, nada; y el error quedaba guardado y aparecía bajo el título al pasar a "Material") |

**Enmienda 4 (T-03 y T-04): forma exacta del remedio** (§D-2, "Campo pintado se decide por el modo"). Las líneas son las de `1f11d38e`, que estos archivos conservan en la ronda 1 de 03b.
- `src/features/clases/data.ts`, después de `TRADUCCION_DE_ERRORES_CLASES` (`:252-259`), con un comentario de una o dos líneas que diga el porqué (un `VALIDACION` de un campo que el modo no pinta se avisa):
  ```ts
  export const CAMPOS_PINTADOS_DE_LA_CLASE = {
    crear: ["nombre", "descripcion", "maestroIds"],
    editar: ["nombre", "descripcion"],
  } as const

  export const CAMPOS_PINTADOS_DE_LA_PUBLICACION = {
    anuncio: ["texto"],
    material: ["titulo", "texto"],
  } as const satisfies Readonly<Record<TipoPublicacion, readonly string[]>>
  ```
  La importación de tipos de `./types` (`:9`) suma `TipoPublicacion`. Ningún tipo nuevo: `satisfies` usa uno que ya existe y, si un tipo de publicación nuevo (por ejemplo, el `foro` de FORO-01) entra en `TipoPublicacion`, no compila hasta que alguien decida qué campos pinta (R-09).
- `src/features/clases/lib.ts`, después de `erroresDeFormularioClases` (`:156-159`), las dos funciones de la tabla, cada una con un comentario de una línea:
  ```ts
  export const erroresDeLaClaseDeApi = (
    error: unknown,
    modo: keyof typeof CAMPOS_PINTADOS_DE_LA_CLASE,
  ): ErroresFormulario | null => erroresDeFormularioClases(error, CAMPOS_PINTADOS_DE_LA_CLASE[modo])

  export const erroresDeLaPublicacionDeApi = (
    error: unknown,
    tipo: TipoPublicacion,
  ): ErroresFormulario | null =>
    erroresDeFormularioClases(error, CAMPOS_PINTADOS_DE_LA_PUBLICACION[tipo])
  ```
  (Prettier decide el corte de línea; la forma es esta.) `lib.ts` suma las dos constantes a su importación de `./data` y `TipoPublicacion` a la de `./types`. `erroresDeFormularioClases` no cambia (CH3-B04, PR-1C02 y `refactor-01c-r1` la llaman con listas propias).
- `src/features/clases/components/formulario-clase.tsx` (**solo con DH-8, (a) o (b)**): en la importación de `../lib` (`:16`), `erroresDeFormularioClases` pasa a `erroresDeLaClaseDeApi`; en `alFallar` (`:69`), `const erroresDeCampo = erroresDeLaClaseDeApi(error, modo)`. Nada más del archivo cambia: ni el comentario de `:64-67`, ni el `if (mutacion.isPending) return` de `:79`, que es "sin ref; fuera del chore, CHORE-04" (fila 2 de la lista; §D-6, Enmienda 3), ni el `enEspera=` (`styles/clases-r1.ataque` cuenta uno).
- `src/features/clases/components/formulario-publicacion.tsx` (**solo con DH-8, (a) o (b)**): en la importación de `../lib` (`:23-29`), `erroresDeFormularioClases` pasa a `erroresDeLaPublicacionDeApi`; en el `catch` de `handlePublicar` (`:148`), `const erroresDeCampo = erroresDeLaPublicacionDeApi(error, datos.tipo)` (el `tipo` de lo enviado, el parámetro `datos` de `:121`; no el estado `tipo`). Con DH-8 (a), nada más cambia.
- `src/features/clases/hooks.ts` (**solo con DH-8 (a)**): en la importación de `./lib` (`:81-90`) se suma `erroresDeLaPublicacionDeApi` (después de `erroresDeFormularioClases`, que sigue en uso en `useComentar`, `:681`); en `useCrearPublicacion` (`:596-621`), `onError: (error) => {` (`:613`) pasa a `onError: (error, datos) => {` y `if (erroresDeFormularioClases(error, ["titulo", "texto"])) return` (`:617`) pasa a `if (erroresDeLaPublicacionDeApi(error, datos.tipo)) return`. El `renovarTrasError` de `:616`, el comentario de `:605-606`, `onSuccess` y el resto del archivo no cambian.
- **Con DH-8 (b) (sin `hooks.ts`):** el gancho sigue callando ante `titulo:` y `texto:` (su lista `["titulo", "texto"]` es la de "Material"). En el `catch` de `formulario-publicacion.tsx`, en lugar del `if (erroresDeCampo) setErrores(erroresDeCampo)` de `:149`: si `erroresDeCampo` no es `null`, `setErrores(erroresDeCampo)` y `return`; si no, y `erroresDeLaPublicacionDeApi(error, "material")` no es `null` (el gancho calló), `toast.error(mensajeDeErrorClases(error))` (se suma `mensajeDeErrorClases` a la importación de `../lib`; `toast` ya se importa). Con un comentario que diga por qué el formulario avisa ahí. Es la opción de respaldo: la decisión queda en dos sitios.

Vistas de `clases` cuyo error es de una consulta y pasan a `mensajeDeConsultaClases` (03b): `categorias-view.tsx:37`, `clase-layout.tsx:35`, `editar-clase-view.tsx:18`, `components/buscador-de-maestros.tsx:199`, `components/buscador-alumnos.tsx:131`, `trabajo-view.tsx:169`, `personas-view.tsx:39` y `:52`, `components/encabezado-clase.tsx:53`, `maestros-de-clase-view.tsx:42`, `components/tabla-alumnos.tsx:185`. Las de `mensajeDeErrorDeLista` (`muro-view.tsx:117`, `components/comentarios-de-publicacion.tsx:153`, `inicio-estudiante-view.tsx:46`, `inicio-maestro-view.tsx:41`, `components/seccion-de-tema.tsx:79`) no cambian de llamada. Los `toast.error(mensajeDeErrorClases(…))` de `hooks.ts` y de los formularios son de acciones y no cambian.

**`features/calificaciones` (03b)**
- `esErrorDeCursorDeCalificaciones` pasa a ser la misma función que `esErrorDeCursor`: `export const esErrorDeCursorDeCalificaciones = esErrorDeCursor` (sin llamar a `esErrorDeCursor(`, que CAL-1D09 sigue prohibiendo en el módulo; ver §D-R0, N-L2). Las vistas no cambian.
- ~~`mensajeDeErrorCalificaciones(error, respaldo)` pasa a `mensajeDeErrorDeConsulta(…)` con `TRADUCCION_DE_ERRORES_CALIFICACIONES`~~ **Enmienda 1 (M-01): `mensajeDeErrorCalificaciones` no se migra y no nace `TRADUCCION_DE_ERRORES_CALIFICACIONES`.** Motivo: ya cumple S-22 por completo (el texto de "sin acceso" o el respaldo; nunca texto del servidor ni un trozo de él), su salida no cambiaría y el envoltorio obligaba a importar `mensajeDeErrorDeConsulta`, con lo que CAL-1D09 (N-L2) fallaba; el `generico` de esa traducción era un valor muerto. El cuerpo de `mensajeDeErrorCalificaciones` y su comentario no cambian.
- `esErrorDeSinAcceso` no cambia. `errorQueRedirigeElCliente` importa la lista de `@/services/apiClient`; `CODIGOS_QUE_REDIRIGE_EL_CLIENTE` sale de `calificaciones/data.ts`.
- **Enmienda 1 (M-01): importaciones exactas de `features/calificaciones/lib.ts` tras 03b** (cada una en una línea; Prettier con `printWidth: 100` no las parte; el orden de los nombres es el escrito, sin ordenación automática en el proyecto):
  - `import { campoDeErrorDeApi, esErrorDeCursor } from "@/lib/errores-de-api"` (sustituye a `import { campoDeErrorDeApi } from "@/lib/errores-de-api"`; `campoDeErrorDeApi` lo sigue usando `esErrorDeSinAcceso`). Es exactamente lo que exige la expresión de N-L2.
  - `import { CODIGOS_QUE_REDIRIGE_EL_CLIENTE, esApiError } from "@/services/apiClient"` (sustituye a `import { esApiError } from "@/services/apiClient"`).
  - La importación de `./data` pierde `CODIGOS_QUE_REDIRIGE_EL_CLIENTE` y conserva `MENSAJES_ERROR_CALIFICACIONES` y `TEXTOS_GRADEBOOK`.
  - Nada importa `mensajeDeErrorDeConsulta` ni `TraduccionDeErrores` en el módulo. Si el programador necesitara otra importación de `@/lib/errores-de-api` en este archivo, es PARADA (PA-8).
- `features/calificaciones/data.ts` en 03b: solo se borra `CODIGOS_QUE_REDIRIGE_EL_CLIENTE` (con su comentario). Nada más cambia.
- Ningún archivo de producción nuevo en el módulo (CAL-1D09 y CAL-T-182 exigen once).

**`features/admin` (03c):** `TRADUCCION_DE_ERRORES_ADMIN` en `data.ts` con `generico: MENSAJE_ERROR_ADMIN_GENERICO`, `mensajesPorCodigo: MENSAJES_ERROR_ADMIN`, `codigosConMensajeDelServidor: CODIGOS_CON_MENSAJE_DEL_SERVIDOR` (que pierde "VALIDACION" y queda `["CUPO_DIARIO_INSUFICIENTE"]`, con su comentario al día) y `textosPorCampo: {}`. `mensajeDeErrorAdmin` es el envoltorio; `mensajeDeConsultaAdmin` (nueva) lo usan `components/tabla-enlaces.tsx:190` y `components/registrados-del-enlace.tsx:33`; los demás usos son acciones. Cambio visible: un `VALIDACION` deja de mostrar su ruta ("nombre: caracteres no permitidos" → "caracteres no permitidos").

**`features/auth` (03c):** `TRADUCCION_DE_ERRORES_AUTH` en `data.ts` con `generico: MENSAJE_ERROR_AUTH_GENERICO`, `mensajesPorCodigo: MENSAJES_ERROR_AUTH`, `codigosConMensajeDelServidor: []`, `textosPorCampo: {}`; `mensajeDeErrorAuth` es el envoltorio. Cambio visible: un `VALIDACION` deja de mostrar su ruta ("email: Escribe un correo válido" → "Escribe un correo válido").

**Enmienda 5 (T-05): forma exacta del remedio en `admin` y `auth` (solo con DH-9 (a)).** Las líneas son las de `9272501e`, que estos diez archivos conservan en la ronda 1 de 03c (ninguno cambió en 03c). En cada uno se insertan tres líneas **inmediatamente después** de la guarda `if (<m>.isPending) return` y antes de leer el formulario (`new FormData`) o de `safeParse`, con la misma sangría que la guarda y `<m>` igual al nombre de la mutación del archivo:
```ts
    // T-05 de CHORE-03: el error del servidor del envío anterior se quita antes de validar,
    // para que la persona lea un solo mensaje: el de este envío.
    if (<m>.isError) <m>.reset()
```

| # | Archivo (`frontend/src/features/…`) | `<m>` | Guarda (línea tras la que se inserta) | Formularios |
|---|---|---|---|---|
| 1 | `admin/components/formulario-invitar-maestro.tsx` | `invitar` | `:22` | Invitar maestro |
| 2 | `admin/components/formulario-invitacion-masiva.tsx` | `invitar` | `:31` | Invitación masiva |
| 3 | `admin/components/formulario-generar-enlace.tsx` | `generar` | `:42` | Generar enlace de registro |
| 4 | `admin/components/formulario-corregir-correo.tsx` | `corregir` | `:28` | Corregir el correo |
| 5 | `auth/components/formulario-login.tsx` | `inicioSesion` | `:25` | Iniciar sesión |
| 6 | `auth/components/formulario-registro.tsx` | `alta` | `:25` | Registro de estudiante |
| 7 | `auth/components/formulario-registro-maestro.tsx` | `alta` | `:29` | Registro de maestro por enlace |
| 8 | `auth/components/formulario-recuperar.tsx` | `recuperar` | `:25` | Recuperar contraseña |
| 9 | `auth/components/formulario-nueva-contrasena.tsx` | `nuevaContrasena` | `:66` | Restablecer contraseña y establecer contraseña (invitación) |
| 10 | `auth/components/formulario-cambiar-contrasena.tsx` | `cambiar` | `:25` | Cambio obligatorio de contraseña |

Por qué esta forma y no otra:
- **Al inicio del manejador y no dentro de la rama del rechazo local:** `formulario-nueva-contrasena.tsx` y `formulario-cambiar-contrasena.tsx` rechazan en local por dos caminos (el esquema y la confirmación, `:77-86` y `:31-40`); una sola línea antes de los dos cubre ambos y los tres caminos de establecer (nombre, contraseña y confirmación). En el camino válido no cambia nada: `mutate` ya deja la mutación en `pending` y quita el `MensajeError` en el mismo render (TanStack Query v5).
- **Con `isError` y no siempre:** `reset()` también borra `isSuccess` y `data`. Con la condición, el texto de éxito de invitar maestro (`:48-52`) y de corregir el correo (`:51-55`) sigue igual ante un rechazo local posterior (§D-2, Enmienda 5): el remedio solo toca la secuencia de T-05. `BuscadorDeCuenta` no cambia: su `buscar.reset()` (`:34`) es incondicional a propósito, para quitar la ficha de la cuenta anterior (DEC-19), y es el control en verde del tester.
- **Después de la guarda de `isPending`:** con una petición en vuelo, el manejador sale antes y nunca desprende la mutación que sigue corriendo. La guarda no cambia y **no se agrega ninguna ref** (filas 7 a 10 y 12 a 17 de la "Lista para CHORE-04"; §D-6, Enmienda 3).
- **No limpiar al cambiar un campo:** casi todos estos formularios no son controlados (leen `FormData`), así que habría que sumar un `onChange` por campo; y el `MensajeError` del servidor desaparecería mientras la persona escribe, que sí cambia el camino del error del servidor (hoy el error sigue hasta el siguiente envío, como lo comprueba `admin/rutas-ch3-r1.ataque` al pulsar la sección activa).
- **Ningún gancho cambia:** los diez ganchos (`useInvitarMaestro`, `useInvitarEnLote`, `useGenerarEnlace`, `useCorregirCorreo` en `admin/hooks.ts:94`, `:125`, `:46` y `:136`; `useLogin`, `useRegistro`, `useRegistroMaestro`, `useRecuperar`, `useNuevaContrasena` y `useCambiarContrasena` en `auth/hooks.ts:52`, `:71`, `:92`, `:125`, `:136` y `:179`) devuelven el resultado de `useMutation` sin envolverlo, así que `reset` ya está expuesto. Los de `auth` que sacan la mutación de la caché al asentarse (`sacarDeLaCacheAlAsentar`, `gcTime: 0`) no cambian nada: `reset()` actúa sobre el observador del componente.
- **Lo que nada más cambia:** ni los textos, ni `data.ts`, ni `lib.ts`, ni los `MensajeError`, ni `ENLACE_INVALIDO` (que reemplaza el formulario, `formulario-registro-maestro.tsx:47-49` y `formulario-nueva-contrasena.tsx:93-95`: con él el manejador ya no se alcanza), ni el `onError` de `useCambiarContrasena` (`CAMBIO_NO_REQUERIDO`), ni «Cerrar sesión».

### §D-5. N-46 (03b)
- `services/apiClient.ts` exporta, después de `esApiError`, exactamente:
  ```ts
  // Los errores con que apiClient saca a la persona de la vista (acceso restringido, cambio de
  // contraseña obligatorio, sesión perdida). Quien los recibe no avisa.
  export const CODIGOS_QUE_REDIRIGE_EL_CLIENTE: readonly string[] = [
    "ACCESO_RESTRINGIDO",
    "CAMBIO_DE_CONTRASENA_REQUERIDO",
    "NO_AUTENTICADO",
  ]
  ```
  `procesar` y `perderSesion` no cambian (S-12).
- `features/tareas/data.ts` y `features/calificaciones/data.ts` dejan de declararla; `features/tareas/lib.ts` y `features/calificaciones/lib.ts` la importan de `@/services/apiClient` (ya importan `esApiError` de ahí: la misma línea).
- Sin ciclo: `services/apiClient.ts` sigue importando solo `@campus/shared`, `./navegacion` y `./tokenAcceso`; nada de `features/` ni de `lib/` (lo prueba CH3-B12).

### §D-6. Matriz de avisos (para los resúmenes del programador)
No hay vistas nuevas, pero sí disparadores nuevos. Desde el primer resumen de cada subentrega, el programador entrega, por formulario y por consulta tocados, la matriz: por cada clase de entrada de §D-2 (y, en las acciones, también "en vuelo a la vez" y "con la vista desmontada", que no cambian porque los avisos siguen en los hooks), qué se muestra (un aviso, un `ErrorDeCampo` o un `MensajeError`), si se renueva algo (debe ser lo mismo que hoy) y dónde queda el foco. El manager la contrasta con el código (regla "Matriz de avisos y recargas").

**Enmienda 2 (T-02).** "Sin cambio" en "en vuelo a la vez" solo vale si el programador lo comprobó en el código de cada control, no por suposición: en la ronda 1, la fila "Descarga de un adjunto" decía "las guardas con ref siguen" y la descarga no tenía ninguna. Desde la ronda 2 de 03a, cada fila de la matriz en "en vuelo a la vez" nombra la ref que la protege (archivo y nombre) o dice "sin ref" como hallazgo. La fila de la descarga queda: dos clics seguidos, una petición y, si falla, un aviso; el botón en espera hasta que esa petición se asienta; después, un clic nuevo pide otra vez la URL.

**Enmienda 3 (M-05, DH-7 = b). Qué hace el programador con un "sin ref" en 03b y 03c.** Un control de la matriz que solo se protege con `isPending` (o con nada) **no es un hallazgo del chore y no se corrige**: el programador lo declara en su fila de "en vuelo a la vez" como "sin ref; fuera del chore, CHORE-04" y lo nombra en la lista de hermanos del resumen con ese mismo destino. No agrega la ref aunque el archivo se toque en la subentrega (en 03b, `buscador-de-maestros.tsx`, `buscador-alumnos.tsx`, `maestros-de-clase-view.tsx` y `tabla-alumnos.tsx` cambian solo en la línea de su consulta y su importación, §D-4): agregarla es salirse de "Cambios por capa", PA-3. Si encuentra un control sin ref que no está en "Lista para CHORE-04" (Puntos de ataque), lo declara igual y lo marca "nuevo, para la lista de CHORE-04"; el orquestador lo suma a `docs/ESTADO.md`. Un control que **sí** tiene ref la nombra (archivo y nombre), como en la Enmienda 2. En 03a no cambia nada: «Descargar» era el único sin ref y ya tiene la suya (DH-6).

**Enmienda 4 (T-03 y T-04).** En el resumen de la ronda 2 de 03b, las filas de "Crear y editar clase" y de "Publicar anuncio o material" de la matriz se parten por modo (crear, editar; anuncio, material) y suman las filas nuevas de §D-2 ("campo que el formulario pinta en otro modo"), con estas salidas: editar clase con `maestroIds:` → un aviso (desde `alFallar`), sin `ErrorDeCampo`; anuncio con `titulo:` → un aviso (desde el gancho con DH-8 (a); desde el `catch` del formulario con DH-8 (b)), sin `ErrorDeCampo`, y al pulsar «Material» después no aparece ningún error bajo el título. "Con la vista desmontada": en el anuncio, con DH-8 (a) el gancho avisa una vez; con DH-8 (b), el `catch` de `handlePublicar` sigue corriendo tras desmontarse (la promesa de `mutateAsync` no depende del componente) y avisa una vez; el programador dice cuál comprobó y con qué caso. En crear y editar clase no cambia: los avisos viven en los callbacks de `mutate` y, desmontada la vista, no hay aviso, como antes y como con cualquier otro error de ese formulario (fila de la matriz de la primera entrega). "En vuelo a la vez" no cambia: `formulario-clase.tsx` sigue "sin ref; fuera del chore, CHORE-04" aunque el archivo se toque (fila 2 de la lista; agregar la ref es PA-3) y `formulario-publicacion.tsx` sigue con `publicandoRef`.

**Enmienda 5 (T-05).** En el resumen de la ronda 2 de 03c, la matriz suma, por cada uno de los once formularios de §D-4 (Enmienda 5), las filas de las secuencias de §D-2 (Enmienda 5), con estas salidas: rechazo del servidor y después rechazo local → solo el `ErrorDeCampo`, ninguna petición nueva, nada se renueva, el foco queda donde ya quedaba con un rechazo local (sin cambio); rechazo local y después rechazo del servidor → solo el `MensajeError` (sin cambio); éxito con texto en la vista y después rechazo local → el texto de éxito sigue (invitar maestro y corregir el correo). "En vuelo a la vez" no cambia: la guarda `isPending` sale antes de `reset()` y cada formulario sigue "sin ref; fuera del chore, CHORE-04" (filas 7 a 10 y 12 a 17). "Con la vista desmontada" no aplica a la secuencia (el rechazo local es síncrono). Los **estados vecinos del mecanismo** que el resumen lista uno por uno, con su caso: primer envío rechazado en local (`isError` es `false`: no hay `reset`); servidor y después local (`reset`); servidor y después un envío válido (`reset` y `mutate` en el mismo manejador: igual que antes); éxito y después local (sin `reset`); el envío con la petición en vuelo (sale por `isPending`); `ENLACE_INVALIDO` (el formulario ya no está); `CAMBIO_NO_REQUERIDO` con la recarga de `/me` fallida (el `MensajeError` queda y el siguiente rechazo local lo quita); pulsar la sección activa (mismo componente: el error sigue hasta el siguiente envío, S-06); ir a otra sección y volver (componente nuevo, sin error); y el error de un código que `apiClient` redirige (O-r1-6, decisión tomada).

### §D-R0. Pruebas existentes que el rediseño rompe (inventario por grep)
**Cómo se hizo el inventario** (sin terminal: con la herramienta de búsqueda sobre `frontend/src/**/*.test.{ts,tsx}`, en `ad10844` más la parte A, que no toca código):
1. Funciones cuya firma cambia: `esErrorDeCursor` (gana `campos` con valor por defecto). Patrones `esErrorDeCursor` y `\(esErrorDeCursor\)`. Resultado: `reexportaciones-01c.test.ts` (solo `toBe`: sigue igual), `refactor-01c-r1.ataque` (la pasa a `map`: rompe, C-1), `estatico-01d.test.ts` (texto: no la llama; ver N-L2).
2. Símbolos que se borran o se mueven: `quitarPrefijoDeCampo`, `PREFIJO_DE_RUTA`, `MENSAJES_ERROR_CLASES`, `CODIGOS_QUE_REDIRIGE_EL_CLIENTE` (en `tareas/data.ts` y `calificaciones/data.ts`). Patrones `quitarPrefijo|PREFIJO_DE|MENSAJES_ERROR_CLASES\b|CODIGOS_QUE_REDIRIGE_EL_CLIENTE|errorQueRedirigeElCliente`. Resultado: solo `entregas-01d-r3.ataque` (lee el bloque en `tareas/data.ts`: C-2). `PREFIJO_DE_EBFE126` de `refactor-01c-r1` es una copia local; no depende del código.
3. Tipos que ganan o pierden campos: ninguno (`TraduccionDeErrores` y `EntradaFueraDeContrato` son nuevos).
4. Textos que cambian: las salidas de las funciones de traducción ante un `VALIDACION` con ruta compuesta o sin texto visible, de `auth` y `admin` ante cualquier `VALIDACION` con ruta, y de las consultas ante un `VALIDACION` fuera de contrato. Patrones: `"VALIDACION"` (55 archivos de prueba, revisados uno por uno en las líneas que lo usan), `mensajeDeErrorAuth|mensajeDeErrorAdmin`, `mensajeDeErrorDeLista`, `mensajeDeErrorClases\(`, `mensajeDeErrorTareas\(`, `toHaveTextContent\(".*: `, `\\u200[BCD]|\\u2060|\\u0085|\\u00A0|\\uFEFF` (ninguna prueba fija hoy un texto invisible del servidor).
5. Reglas estáticas sobre los archivos que cambian: los 24 archivos con `import.meta.glob` (lista abajo, "Revisadas que no rompen").

**`*.ataque` que rompen (4): las reescribe el tester en la ronda 0 de su subentrega, con A-5, sin cambiar lo que protegen.**
| C-n | Sub | Archivo › caso | Por qué rompe | Reescritura |
|---|---|---|---|---|
| C-1 | 03a | `frontend/src/features/clases/refactor-01c-r1.ataque.test.tsx` › "erroresPorCampo y esErrorDeCursor dan lo mismo con incidencias sin campo, repetidas o con llaves que no son texto, y con errores que no son de cursor" (línea 178) | `errores.map(esErrorDeCursor)` pasa el índice como segundo argumento: con `campos` es un error de tipos en `tsc -b` y, en tiempo de ejecución, `campos.includes` no existe sobre un número | `errores.map((e) => esErrorDeCursor(e))`. Nada más del caso cambia |
| C-2 | 03b | `frontend/src/features/tareas/entregas-01d-r3.ataque.test.tsx` › "CODIGOS_QUE_REDIRIGE_EL_CLIENTE son exactamente los que apiClient redirige; sin disabled, ?? [], fetch( ni importaciones de otros módulos en lo que cambió" (líneas 675-708) | Lee el bloque de la constante en `/src/features/tareas/data.ts`, que deja de declararla (N-46) | Lee el bloque de `/src/services/apiClient.ts` con la misma expresión y los mismos tres códigos; suma que `/src/features/tareas/data.ts` y `/src/features/calificaciones/data.ts` no la declaran; conserva las tres aserciones `toContain` sobre `apiClient.ts` y la lista `cambiados` con sus reglas |
| C-3 | 03b | `frontend/src/features/clases/muro-c-r3.ataque.test.tsx` › los casos "400 VALIDACION de limite" y "400 VALIDACION de otro campo que menciona el cursor" de «Ver más publicaciones con %s» y «Ver más comentarios con %s» (cuatro ejecuciones) | `deSiempre` se calcula con `mensajeDeErrorClases` ("Too big: expected number", "el cursor no es válido"), pero la lista es una consulta y ahora muestra el genérico (S-01) | `deSiempre` de esos dos casos pasa a `mensajeDeConsultaClases(...)` (importada de `./lib`); los otros cinco casos y la precondición no cambian (ya dan lo mismo por los dos caminos). El comentario de cabecera dice "lo de siempre (mensajeDeConsultaClases)" |
| C-4 | 03c | `frontend/src/features/admin/cuentas-r1.ataque.test.tsx` › "invitar: 400 VALIDACION del servidor muestra su mensaje" (línea 481) | Espera "nombre: caracteres no permitidos"; la ruta ya no llega a la persona | `toHaveTextContent("caracteres no permitidos")` y `not.toHaveTextContent("nombre:")` |

**Pruebas normales que rompen (3): lista cerrada del programador, por subentrega.** Solo puede cambiar estas líneas (y crear las pruebas nuevas de "Pruebas requeridas" y su propio archivo estático `lib/errores-de-api-estatico.test.ts` en las tres subentregas).
| Id | Sub | Archivo › caso | Cambio exacto |
|---|---|---|---|
| — | 03a | Ninguna | Si una prueba normal de `tareas`, `clases` o `components/` falla en 03a, es PARADA (PA-1) |
| N-L1 | 03b | `frontend/src/features/clases/lib.test.ts` › "PR-C17: un VALIDACION del campo cursor da el texto dado; cualquier otro error sigue el camino de siempre" (líneas 132-134) | La salida esperada de `"limite: debe ser un número"` pasa de `"debe ser un número"` a `"Algo salió mal. Inténtalo de nuevo."`. El título no cambia |
| N-L2 | 03b | `frontend/src/features/calificaciones/estatico-01d.test.ts` › "CAL-1D09: (Enmienda 2) ningún archivo de producción del módulo lee .message, llama a esErrorDeCursor( ni usa ErrorDeCampo" (líneas 136-138) | Solo la expresión de la importación: `/import \{ campoDeErrorDeApi, esErrorDeCursor \} from "@\/lib\/errores-de-api"/`. La prohibición de llamar a `esErrorDeCursor(` sigue (el alias no la llama) y el título no cambia. **Enmienda 1 (M-01):** coincide exactamente con la primera importación de §D-4 "`features/calificaciones`", porque `mensajeDeErrorCalificaciones` ya no se migra |
| N-L3 | 03c | `frontend/src/features/auth/lib.test.ts` › "traduce por código, usa el mensaje del servidor en VALIDACION y un genérico en lo demás" (líneas 72-74) | La salida esperada pasa de `"email: Escribe un correo válido"` a `"Escribe un correo válido"`; el título pasa a "…usa el mensaje del servidor sin su ruta en VALIDACION…" |

**Revisadas que no rompen** (el diseño las respeta; si alguna falla, es PARADA, no reescritura):
- Estáticas: `aviso-calificar-01c-r3.ataque` CAL-T-127 (cinco llamadas a `avisarDelErrorDeLaEntrega`; `mensajeDelAvisoDeCalificar` solo en `tareas/hooks.ts` y `tareas/lib.ts`: se conserva el nombre y `hooks.ts` no cambia); `entregas-01e-r1`, `entregas-01d-r2`, `entregas-01e-r2` y `estatico-01c.test.ts` CAL-1C13 (`renovarTrasErrorDeLaEntrega(` en 3; sin `disabled`, `?? []`, `fetch(`, `console.` ni las palabras de §D-0.9 en comentarios de `tareas/lib.ts`, `data.ts` y `hooks.ts`); `entregas-01d-r1` (`fetch(` solo en `apiClient` y `almacenService`); `estatico-01c-r1.ataque` CAL-T-99 (ninguna copia de la regla de visibles: se importa `contarCaracteresVisibles`, nunca se define, y no se escribe `Default_Ignorable_Code_Point`, `CARACTER_VISIBLE`, U+2800 (ni literal ni como escape) ni `\u{1D159}` en producción, ni en comentarios); `refactor-01c-r1` (`esErrorDeCursor` definida una sola vez, en `lib/errores-de-api.ts`; nada de `lib/` importa de `features/`); `reexportaciones-01c.test.ts` (`esErrorDeCursor` de `features/clases` sigue siendo la misma de `lib/`; `erroresDeFormularioClases` y `avisoDeFalloAlSubir` siguen siendo envoltorios con `mensajeDeErrorClases`); `estatico-01d.test.ts` y `estatico-01d-r1.ataque` (once archivos de producción en `calificaciones`; `.message` nunca; un solo `toast.error(` en "Mis calificaciones"; las pruebas nuevas del módulo sin emojis, sin `return` temprano y, si construyen fechas, con reloj fijo); `ver-mas-01e-r3` y `tareas-01d-r3` (sin tipos fuera de `types.ts` en los módulos: `TraduccionDeErrores` vive en `lib/`; `data.ts` solo la usa con `satisfies`); `tareas-01a-r1` ("No tienes acceso a esta clase." nunca literal en `features/tareas`); `estatico-02c-r1`, `clases/estatico-r1`, `styles/clases-r1` y `components/layout/estatico-r1` (no se tocan vistas en lo que miran); `admin/cuentas-r1` (estática) y `maestros-03b-r1`.
- De comportamiento (los textos siguen iguales porque la ruta es simple o el texto es fijo): `aviso-calificar-01c-r3` (CAL-T-119 a CAL-T-126 y CAL-T-135: un recorte, genérico ante vacío, códigos sin recorte, ids fijos); `calificar-vacio-01c-r4` (genérico exacto en el `ErrorDeCampo`); `calificar-01c-r1`, `campos-01c-r2`, `cruces-01c-r3`, `avisos-01c-r2`; `entregas-01d-r1`, `-r2`, `-r3` (enlaces y texto con mensaje); `entregas-01e-r1` (cursor); `tareas-01d-r2`, `-r3`; `app/cuentas-r1` (`toHaveTextContent("muy larga")` es una subcadena); `auth/enlace-r1` (sin ruta); `clases-r1`, `-r2`, `-r4` (`expect(texto).not.toMatch(/^[a-zA-Z_]+:/)` se cumple mejor); `maestros-02c-r1`, `categorias-01e-r1`, `clases-admin-02c-r1`, `muro-c-r2`; las de `calificaciones` (cursor y S-22: misma salida).
- Normales: `tareas/lib.test.ts`, `calificar-01c.test.tsx`, `entregas-01d.test.tsx`, `entregas-01e.test.tsx`, `editar-tarea-view.test.tsx`, `detalle-tarea-view.test.tsx`, `formulario-tarea.test.tsx`, `como-se-entrega-01a.test.tsx`; `clases/reexportaciones-01c.test.ts`, `categorias-view.test.tsx`, `muro-view.test.tsx`, `publicacion-del-muro.test.tsx`, `inicio-*-view.test.tsx`, `clases-admin-view.test.tsx`, `formulario-publicacion.test.tsx`, `lib.test.ts` (salvo N-L1); `calificaciones/lib.test.ts` (alias con la misma firma); `admin/lib.test.ts`.

**Tamaño de §D-R0:** 4 `*.ataque` (C-1 a C-4: una en 03a, dos en 03b, una en 03c) y 3 pruebas normales (N-L1 a N-L3: dos en 03b, una en 03c). Base de V-01: las 204 `*.ataque` de la tabla de `docs/trabajo/N19-texto-tarea-con-entregas/reporte-tester.md`.

**Enmienda 2: inventario de lo que rompen los remedios de T-01 y T-02** (búsqueda sobre `frontend/src/**/*.test.{ts,tsx}` en el estado de la ronda 1 de 03a, con las 208 `*.ataque`):
1. **T-01, mensajes con "ruta: minúscula camelCase:".** Patrones: `["'\x60][^"'\x60\s:]+:\s*[a-z][A-Za-z0-9_]*:` (literales; `\x60` es la comilla invertida) y `\}:\s?[a-z][A-Za-z0-9]*:` (plantillas). Resultado: solo los casos de T-01 del tester (`lib/errores-ch3-r1.ataque.test.ts:217-218`, `features/tareas/errores-ch3-r1.ataque.test.ts:179-180`, `features/tareas/formularios-ch3-r1.ataque.test.tsx:66` y `:942`), que piden justo el remedio; los demás aciertos son de fechas, URL y títulos, sin `VALIDACION`. Revisadas a mano las que fijan un solo recorte con dos puntos detrás: CAL-T-121 (`aviso-calificar-01c-r3.ataque.test.tsx:294-301`: "Debe ser 0: 10", "Llegó a las 14:30", "14:30 no es válido", "Valor: 10", 'Unrecognized key: "nota"'), CAL-T-119, CAL-T-120, CAL-T-122, CAL-T-123 y CAL-T-135; CH3-A01 ("x: Nota: algo", "parámetro: el cursor no es válido"); y las de la ronda 1 ("texto: Nota: algo", "version: Nota: algo", "claseId.0: x", rutas extra con `MENSAJE_DE_PRUEBA`). Ninguna rompe: lo que sigue a su ruta empieza con mayúscula, con un dígito, con comillas o no lleva dos puntos pegados a su primera palabra.
2. **T-01, tabla común con tres entradas más.** Ninguna prueba fija su tamaño exacto (`toBeGreaterThan(50)` en `errores-de-api.test.ts:73`, `toBeGreaterThan(100)` en `adjuntos/errores-ch3-r1.ataque.test.ts:38`) ni cuenta entradas por clase (CH3-A06 comprueba presencia). La rotación por tercios de `formularios-ch3-r1.ataque` sigue pasando cada entrada por al menos dos formularios (siete formularios, índice mod 3). Las nuevas usan rutas que nadie pinta.
3. **T-02, `adjuntos-de-publicacion.tsx`.** Patrones: `adjuntos-de-publicacion`, `Descargar`, `onDescargar`, `VistaDeFicha`, y "dos clics … descarga" en las pruebas. Las estáticas que leen el archivo se cumplen con la forma de §D-4: `styles/clases-r1.ataque` (un `enEspera=`), `entregas-01e-r2.ataque` (`alFallarLaDescarga?: (error: unknown) => void`; los cuatro ganchos de `components/adjuntos/hooks.ts`; sin `disabled`, `?? []`, `fetch(` ni `features/`), `entregas-01d-r1.ataque` y `refactor-01c-r1.ataque` (sin `?? []`, `disabled`, `console.`, `fetch(`; `AdjuntosDePublicacion` definida en sus dos lugares). Ninguna prueba de comportamiento hace dos clics seguidos en «Descargar» esperando dos peticiones; las que descargan dos veces lo hacen con la primera ya asentada, y la guarda se libera en el `finally`.

**Lista cerrada de la Enmienda 2: ninguna prueba existente cambia**, ni normal ni `*.ataque`. El programador solo amplía sus propias pruebas nuevas de 03a (CH3-A01 y CH3-A08, con su título si hace falta) y crea CH3-A25 y CH3-A26. Si otra prueba falla, es PARADA (PA-1).

**Enmienda 3: inventario de CH3-C08 (03c)** (búsqueda sobre `frontend/src/**/*.test.{ts,tsx}` en el estado de la ronda 1 de 03a). Patrones: `identificador v`, `"id: ` y `VALIDACION` en `features/admin/`. Resultado: ninguna prueba de `admin` fija la salida de un `VALIDACION` de `id:` en las cuatro rutas; el único `VALIDACION` de `admin` es C-4 (`cuentas-r1.ataque.test.tsx:474-475`, "nombre: caracteres no permitidos", ya reescrita por el tester en la ronda 0 de 03c). Las demás apariciones de "identificador válido" son de `claseId`, `tareaId`, `alumnoId` y `archivoId` (03a y 03b, sin cambio). **Lista cerrada de la Enmienda 3: ninguna prueba existente cambia.** M-05 no añade pruebas (DH-7 = b).

**Enmienda 4: inventario de lo que rompe el remedio de T-03 y T-04** (búsqueda sobre `frontend/src/**/*.test.{ts,tsx}` en el estado de la ronda 1 de 03b, con las 217 `*.ataque`):
1. **Función cuya llamada cambia.** Patrón `erroresDeFormularioClases`: `errores-ch3.test.ts` (CH3-B04, `:117-133`), `reexportaciones-01c.test.ts` (PR-1C02, `:187-201`), `refactor-01c-r1.ataque` (`:181-185`) y `clases/errores-ch3-r1.ataque` (`:307`, `:376`). Todas la llaman con su propia lista; la función no cambia, así que ninguna rompe.
2. **Salidas que cambian** (solo en editar clase con `maestroIds:` y en un anuncio con `titulo:`). Patrones `maestroIds:` y `["'\x60]titulo:` en las pruebas: `maestros-02c-r1.ataque.test.tsx:279-292` ("un VALIDACION de maestroIds del servidor queda bajo el selector, sin prefijo y sin aviso") es de **crear** (`renderCrear`), cuya lista no cambia; `formularios-ch3-r1.ataque.test.tsx:319-411` son los casos del tester (los cuatro rojos de T-03 y T-04 piden justo el remedio; los de crear y material siguen igual); los demás aciertos son de `tareas` (`titulo:` de una tarea, otra función) o cuerpos de petición. Ninguna prueba espera silencio ni un `ErrorDeCampo` de `titulo` en un anuncio, ni de `maestroIds` al editar.
3. **Ganchos.** Patrones `useCrearPublicacion`, `useCrearClase` y `useEditarClase` en las pruebas: solo un comentario (`clases-r2.ataque.test.tsx:206`); nadie llama al gancho con datos sin `tipo` (el tipo `CrearPublicacion` lo exige).
4. **Reglas estáticas sobre los archivos que cambian.** `ver-mas-01e-r3.ataque` (`formulario-publicacion.tsx`, `lib.ts`, `hooks.ts` y `data.ts` de `clases`: sin tipos fuera de `types.ts` salvo Props, sin `?? []`, `disabled`, `fetch(`, `console.`, ni importaciones de otro módulo); `entregas-01d-r1.ataque` (`clases/lib.ts` y `data.ts`: sin `?? []`, `disabled` ni valores por defecto de `rol`, `estadoPago`, `accesoRestringido` o `calificacion`); `clases/estatico-r1.ataque` (sin `?? []` ni ternarios anidados en JSX); `styles/clases-r1.ataque` (un `enEspera=` en cada formulario); `clases/errores-ch3-r1.ataque` (O-05: ningún `.message` nuevo, ninguna copia de la expresión de ruta, `new RegExp(`, `.split(":")`). La forma de §D-4 las cumple: `satisfies` y `keyof typeof` no declaran tipos, y `TipoPublicacion` ya existe.
5. **El conteo de archivos de ataque.** `clases/errores-ch3-r1.ataque.test.ts:494` exige exactamente 4 archivos `-ch3-r1.ataque` en `features/clases`, `features/calificaciones` y `services`: las pruebas nuevas del programador van en sus archivos `*-ch3.test.*`, nunca con ese sufijo.

**Lista cerrada de la Enmienda 4: ninguna prueba existente cambia**, ni normal ni `*.ataque`. El programador solo amplía sus propios archivos de 03b (`errores-ch3.test.ts`, `formularios-ch3.test.tsx`, `recuperar-ch3.test.tsx`) con CH3-B15 a CH3-B17. Si otra prueba falla, es PARADA (PA-1).

**Enmienda 5: inventario de lo que rompe el remedio de T-05** (búsqueda sobre `frontend/src/**/*.test.{ts,tsx}` en el estado de la ronda 1 de 03c, con las 223 `*.ataque`):
1. **Llamadas a `reset`.** Patrones `\.reset\(` y `reset` en las pruebas: solo `vi.resetModules()` (29 archivos de `app/`, `services/` y `calificaciones/`). Ninguna prueba cuenta ni espía `reset` de una mutación.
2. **Pruebas que fijen que el `MensajeError` sigue tras un rechazo local.** Patrón `aria-invalid` en las pruebas de `features/admin`, `features/auth` y `app/` (16 archivos, 25 apariciones), leídas con las 12 líneas anteriores: todas las que provocan un rechazo local (`login-view.test.tsx:92-100`, `registro-view.test.tsx:65-75`, `establecer-contrasena-view.test.tsx:187-199`, `enlace-r1.ataque.test.tsx:267-293` y `:437-444`, `invitacion-r1.ataque.test.tsx:246-258`, `maestros-view.test.tsx:175-183` y `:481-493`, `cuentas-r1.ataque.test.tsx:486-497`) parten de un formulario sin error del servidor, así que `isError` es `false` y nada cambia; las de `formularios-ch3.test.tsx` (programador) y `errores-ch3-r1.ataque.test.tsx` (tester) exigen 0 `aria-invalid` con el `MensajeError` o 1 tras el rechazo local (las 11 rojas de T-05, que piden justo el remedio). Ninguna espera dos mensajes.
3. **El texto de éxito.** Patrones `Correo actualizado|invitar\.exito|Invitación enviada`: `cuentas-r1.ataque.test.tsx:406-410` y `cuentas-view.test.tsx:241` (el éxito tras corregir, sin un envío posterior) y `cuentas-r2.ataque.test.tsx:274` (`BuscadorDeCuenta`, que no cambia). Con la condición `isError`, el éxito no se toca.
4. **Reglas estáticas que leen los diez archivos.** `admin/cuentas-r1.ataque` (`fetch(`, `components/ui/dialog`, importaciones de `auth`, tipos en `hooks.ts`), `styles/clases-r1.ataque` (`disabled`, `aria-busy`/`aria-disabled`, 61 `enEspera=` con su reparto por archivo), `components/layout/estatico-r1.ataque` (`<CampoContrasena` 7, `type="password"`, `aria-label`), `lib/estatico-ch3-r1.ataque` y `errores-de-api-estatico.test.ts` (CH3-C07: formas de mostrar `.message` crudo; el tester quita los comentarios antes de buscar), `clases/errores-ch3-r1.ataque` (O-05, sin `new RegExp(`, `.split(":")` ni copias del contrato). Las tres líneas de §D-4 (Enmienda 5) no traen nada de eso: ni `enEspera=`, ni `disabled`, ni `.message`, ni importaciones.
5. **El conteo de archivos de ataque.** `clases/errores-ch3-r1.ataque.test.ts:494` cuenta los `-ch3-r1.ataque` de `clases`, `calificaciones` y `services`; las pruebas nuevas van en los archivos `*-ch3.test.*` del programador, nunca con ese sufijo.

**Lista cerrada de la Enmienda 5: ninguna prueba existente cambia**, ni normal ni `*.ataque`. El programador solo amplía sus propios archivos de 03c (`admin/formularios-ch3.test.tsx`, `auth/formularios-ch3.test.tsx` y `lib/errores-de-api-estatico.test.ts`) con CH3-C09 a CH3-C13. Si otra prueba falla, es PARADA (PA-1).

## Cambios por capa
### shared/
Ninguno. Se usa `contarCaracteresVisibles`, ya exportada por nombre en `shared/src/index.ts`.

### backend/core/, backend/adapters/, backend/handlers/, backend/workers/, backend/prisma/
Ninguno. Los mensajes del servidor no cambian.

### infra/ y .env.example
Ninguno.

### frontend/
**03a**
- `src/lib/errores-de-api.ts`: lo de §D-1 (sin borrar `quitarPrefijoDeCampo`).
- `src/lib/errores-de-api-fuera-de-contrato.ts` (nuevo): §D-3.
- `src/features/tareas/data.ts`: `TRADUCCION_DE_ERRORES_TAREAS`.
- `src/features/tareas/lib.ts`: §D-4 (tareas), salvo N-46.
- Vistas de `tareas` con consultas (§D-4): `detalle-tarea-view.tsx`, `editar-tarea-view.tsx`, `entregas-view.tsx`, `entrega-de-alumno-view.tsx`, `components/hilo-privado.tsx`, `components/tu-trabajo.tsx` (solo la llamada y su importación).
- `src/components/adjuntos/lib.ts`: `avisoDeFalloAlSubir` (§D-4).
- Pruebas nuevas (03a de "Pruebas requeridas").
- **Enmienda 2 (ronda 2 de 03a):** `src/lib/errores-de-api.ts` (`quitarRutaDelMensaje` con `CAMPO_QUE_REPITE_EL_ESQUEMA`, §D-1, T-01); `src/lib/errores-de-api-fuera-de-contrato.ts` (`CON_CAMPO_REPETIDO`, §D-3); `src/components/adjuntos/adjuntos-de-publicacion.tsx` (la guarda de `VistaDeFicha`, §D-4, T-02), **solo con la autorización del humano en DH-6**; las ampliaciones de CH3-A01 y CH3-A08 y las pruebas nuevas CH3-A25 y CH3-A26.

**03b**
- `src/lib/errores-de-api.ts`: borra `quitarPrefijoDeCampo`.
- `src/features/clases/data.ts` (`MENSAJES_POR_CODIGO_DE_CLASES`, `TRADUCCION_DE_ERRORES_CLASES`), `src/features/clases/lib.ts` (§D-4) y las once vistas de consultas de §D-4 (solo la llamada y su importación).
- `src/features/calificaciones/data.ts` (solo sin `CODIGOS_QUE_REDIRIGE_EL_CLIENTE`; Enmienda 1, M-01: sin `TRADUCCION_DE_ERRORES_CALIFICACIONES`) y `src/features/calificaciones/lib.ts` (§D-4: el alias del cursor y las importaciones exactas; `mensajeDeErrorCalificaciones` no cambia).
- `src/services/apiClient.ts` (§D-5); `src/features/tareas/data.ts` y `src/features/tareas/lib.ts` (N-46).
- Pruebas nuevas (03b) y las líneas N-L1 y N-L2.
- **Enmienda 4 (ronda 2 de 03b, T-03 y T-04):** `src/features/clases/data.ts` (`CAMPOS_PINTADOS_DE_LA_CLASE`, `CAMPOS_PINTADOS_DE_LA_PUBLICACION` y `TipoPublicacion` en su importación de tipos) y `src/features/clases/lib.ts` (`erroresDeLaClaseDeApi`, `erroresDeLaPublicacionDeApi` y sus importaciones), que ya estaban en 03b; **solo con la autorización del humano en DH-8:** `src/features/clases/components/formulario-clase.tsx` y `src/features/clases/components/formulario-publicacion.tsx` (con (a) o (b)) y `src/features/clases/hooks.ts` (solo con (a)), en las líneas exactas de §D-4 (Enmienda 4); las ampliaciones CH3-B15 a CH3-B17 en los archivos de prueba del programador de 03b.

**03c**
- `src/features/admin/data.ts`, `src/features/admin/lib.ts`, `src/features/admin/components/tabla-enlaces.tsx` (línea 190 e importación) y `components/registrados-del-enlace.tsx` (línea 33 e importación).
- `src/features/auth/data.ts` y `src/features/auth/lib.ts`.
- Pruebas nuevas (03c), la línea N-L3 y la regla estática extendida a todo `src/`.
- **Enmienda 5 (ronda 2 de 03c, T-05), solo con la autorización del humano en DH-9 (a):** los diez archivos de la tabla de §D-4 (Enmienda 5), cada uno solo con sus tres líneas después de la guarda de `isPending`: `src/features/admin/components/formulario-invitar-maestro.tsx`, `formulario-invitacion-masiva.tsx`, `formulario-generar-enlace.tsx`, `formulario-corregir-correo.tsx`; `src/features/auth/components/formulario-login.tsx`, `formulario-registro.tsx`, `formulario-registro-maestro.tsx`, `formulario-recuperar.tsx`, `formulario-nueva-contrasena.tsx` y `formulario-cambiar-contrasena.tsx`. Las ampliaciones CH3-C09 a CH3-C13 en `src/features/admin/formularios-ch3.test.tsx`, `src/features/auth/formularios-ch3.test.tsx` y `src/lib/errores-de-api-estatico.test.ts`. Ningún `hooks.ts`, `data.ts` ni `lib.ts` cambia en la ronda 2.

## Acceso a datos
No aplica: no hay consultas nuevas ni cambia ninguna petición.

## Autorización
No cambia. Ningún error cambia de código ni de destino; `apiClient` redirige igual (S-12). El estado de pago y la restricción no se tocan.

## Pruebas requeridas
Todas en el frontend (Vitest con jsdom, sin API). Cada título empieza por su id. Las de interfaz usan el `fetch` doble de siempre; las de camino de recuperación con secciones usan `rutas` de `app/router` en un `createMemoryRouter` y la configuración de `app/providers.tsx` (`retry: 1`, `refetchOnWindowFocus: false`, `staleTime: 30_000`). Toda prueba que construya fechas fija el reloj (regla del tester); ninguna termina con un `return` temprano.

**Convenciones.** "Tabla" es `ENTRADAS_FUERA_DE_CONTRATO`; "restos" es `RESTOS_SIN_TEXTO_VISIBLE`; "F1, F3, F4" son las tres entradas de `ENTRADAS_DE_FORMULARIO` (campo no pintable, sin texto visible sin ruta, ruta con puntos; Enmienda 1, N-01: la ruta es de tres niveles, `archivoIds.0.id: …`, la forma `campo.<i>.subcampo:` de la regla; el manager la llamó "F3", aquí es F4); "F2" es "`<campo pintado del formulario>`:" + `"   "` y + `"\u{200B}"` (Enmienda 1, N-02: escrito como escape). En cada caso de formulario se comprueba: (a) exactamente un mensaje legible (un aviso **o** un `ErrorDeCampo` con texto **o** el `MensajeError` del formulario, nunca dos ni ninguno), (b) que no es la ruta ni un texto sin caracteres visibles, (c) lo escrito se conserva, (d) el botón no tiene `aria-busy="true"` ni `aria-disabled="true"`.

### 03a — contrato, `features/tareas` y `components/adjuntos`
`frontend/src/lib/errores-de-api.test.ts` (nuevo):
- **CH3-A01** `quitarRutaDelMensaje`: cada ruta de `RUTAS_FUERA_DE_CONTRATO` con ": ", ":" y ":\t" se quita una sola vez ("x: Nota: algo" → "Nota: algo"); "parámetro: el cursor no es válido" → "el cursor no es válido"; un mensaje sin ruta, uno que empieza con espacio (" cursor: no es válido") y "Calificación de 0 a 10: revisa los puntos" quedan intactos. **Enmienda 2 (T-01):** además, con cada ruta de `RUTAS_FUERA_DE_CONTRATO` y cada separador (": ", ":", ":\t") delante y detrás del nombre, "`<ruta>`: `campoFueraDeContrato`: Revisa este valor." → "Revisa este valor."; "archivoId: archivoId: debe ser un identificador válido" → "debe ser un identificador válido"; "confirmar: confirmar: no es válido" → "no es válido"; "temaIds.0: temaId: x" → "x"; "a: b: c: d" → "c: d" (nunca más de dos prefijos); y siguen intactos tras quitar la ruta: "x: a.b: c" → "a.b: c", "x: 14:30 y" → "14:30 y", "x: Valor: 10" → "Valor: 10", 'x: "nota": y' → '"nota": y'. El título puede cambiar a "…quita la ruta una vez y el nombre de campo que el esquema repite detrás…".
- **CH3-A02** `textoVisibleOGenerico`: cada resto da el genérico; también `"\u{2800}"`, `"\u{1D159}"`, `"\u{3164}"` y sus mezclas con espacios (solo en esta prueba, S-07); "Revisa" y "..." quedan tal cual.
- **CH3-A03** `mensajeDeErrorDeApi` con una traducción de prueba recorre la tabla: cada entrada da `resto ?? generico`; los ids de `textosPorCampo` dan su texto; un código de `mensajesPorCodigo` da su texto; un código con mensaje del servidor da su mensaje sin recorte ("a.b: c" → "a.b: c") y, con cada resto, el genérico; "constructor", "toString" y "__proto__" como código o como campo dan el genérico; un error que no es `ApiError`, `undefined` y una cadena dan el genérico; una traducción que lista "VALIDACION" entre los códigos con mensaje del servidor sigue quitando la ruta (el caso de `admin`).
- **CH3-A04** `mensajeDeErrorDeConsulta`: toda la tabla da el respaldo (con y sin respaldo explícito; sin él, el genérico); los ids de `textosPorCampo` dan su texto; los códigos fijos dan su texto; un código con mensaje del servidor con texto da su mensaje y, con cada resto, el respaldo.
- **CH3-A05** `esErrorDeCursor`: sin `campos`, los mismos once errores de `refactor-01c-r1` (líneas 165-177) dan lo mismo que `campoDeErrorDeApi(e) === "cursor"`; con `["cursor", "cursorTareas"]` reconoce los dos; "cursor.0: x", "Cursor: x" y un `SIN_ACCESO_A_LA_CLASE` con "cursor: x" dan `false`.
- **CH3-A06** La tabla: tiene al menos una entrada de cada clase requerida (`campo-no-pintable`, `sin-texto-visible`, `ruta`); ninguna ruta es `claseId`, `tareaId`, `alumnoId` ni `cursor`; ningún `resto` es una cadena sin caracteres visibles (esas son `null`); `ENTRADAS_DE_FORMULARIO` trae las tres clases.
- **CH3-A07** `erroresDeFormularioDeApi` con un `mensajeDeError` construido con `mensajeDeErrorDeApi`: "nombre:" + cada resto da `{ nombre: genérico }`; las rutas de la tabla dan `null`.

`frontend/src/features/tareas/errores-ch3.test.ts` (nuevo):
- **CH3-A08** `mensajeDeErrorTareas` recorre la tabla (`resto ?? "Algo salió mal. Inténtalo de nuevo."`); cada código de `CODIGOS_CON_MENSAJE_DEL_SERVIDOR` de `tareas` (hoy 14), con cada resto, da el genérico y con "Mensaje." da "Mensaje."; `claseId:`, `tareaId:`, `alumnoId:` (con y sin mensaje) dan sus textos fijos. **Enmienda 2 (T-01):** los mensajes reales de `tareas` del inventario de §D-1: "archivoId: archivoId: debe ser un identificador válido" → "debe ser un identificador válido"; "confirmar: confirmar: no es válido" → "no es válido"; "tareaId: tareaId: debe ser un identificador válido", "alumnoId: alumnoId: …" y "claseId: claseId: …" → sus textos fijos, en `mensajeDeErrorTareas`, `mensajeDeConsultaTareas` (los ids) y `mensajeDelAvisoDeCalificar`.
- **CH3-A09** `mensajeDeConsultaTareas` recorre la tabla (siempre el genérico); "limite: Too big: expected number" y "cursor.0: x" dan el genérico; los ids dan sus textos fijos; `SERVICIO_OCUPADO` con texto da su mensaje.
- **CH3-A10** `errorDeEnlacesDeApi` y `errorDeTextoDeApi`: su campo (`enlaces:`, `enlaces.0:`, `enlaces.4:`; `texto:`) con cada resto da el genérico, con "Mensaje." da "Mensaje."; las rutas de la tabla y "enlaces.0.url: x" dan `null`.
- **CH3-A11** `erroresDeLaTareaDeApi`: "titulo:" y "rubrica.0.criterio:" con cada resto dan su campo con el genérico; las rutas de la tabla (incluida "rubrica.2") dan `null`; `FECHA_LIMITE_INVALIDA` sigue en `fechaLimite`.
- **CH3-A12** Calificar: `mensajeDelCampoDeCalificacion` y `erroresDeCalificacionDeApi` (con dos criterios enviados) dan el genérico para "puntajes.0.puntos:", "calificacion:" y "comentario:" con cada resto, y `null` para las rutas de la tabla; `mensajeDelAvisoDeCalificar(e)` es igual a `mensajeDeErrorTareas(e)` para toda la tabla y para "version: Nota: algo" (→ "Nota: algo", N-36).

`frontend/src/components/adjuntos/errores-ch3.test.ts` (nuevo):
- **CH3-A13** `avisoDeFalloAlSubir` con `ARCHIVO_INVALIDO` y cada resto da `errorRechazado(nombre, <texto fijo de ARCHIVO_INVALIDO>)`, con el `mensajeDeError` de `tareas` y con una traducción de prueba que tenga ese código; con "El archivo pesa más de 25 MB." no cambia.

`frontend/src/features/tareas/formularios-ch3.test.tsx` (nuevo):
- **CH3-A14** Por cada formulario, F1, F2, F3 y F4 con las comprobaciones (a) a (d): crear tarea (F2 en `titulo` → `ErrorDeCampo` con el genérico, sin aviso; F1, F3 y F4 → un aviso; el foco va donde ya iba con un error de campo con mensaje, sin cambiar), editar tarea (ídem), entregar (F2 en `enlaces.0`), comentario privado del alumno (F2 en `texto`), comentario privado del maestro en la entrega de un alumno (F2 en `texto`) y el panel de calificación (F2 en `comentario`, `puntajes.0.puntos` y, sin rúbrica, `calificacion`).
- **CH3-A15** Panel de calificación, punto (3) de la fila: "comentario:\u{200B}", "comentario:\u{0085}", "puntajes.0.puntos:\u{2060}" → `ErrorDeCampo` con el genérico; "puntajes.0.criterioId:\u{200B}\u{00A0}" → un aviso con el genérico; "parámetro: Revisa este valor." → un aviso "Revisa este valor.".
- **CH3-A16** Controles sin campos, en sus hooks (`renderHook`): `useAnularEntrega`, `useBorrarTarea` (con y sin `confirmar`) y la descarga de un adjunto (`useAvisoDeRecargaFallida(...)` devuelto como `alFallarLaDescarga`): F1, F3 y F4 y un `ENTREGA_CERRADA` con mensaje "   " dan exactamente un aviso legible.

`frontend/src/features/tareas/consultas-ch3.test.tsx` (nuevo):
- **CH3-A17** Un `400 VALIDACION` "limite: Too big: expected number" en: la primera carga del detalle, la de "Editar tarea", la de la lista de entregas, su "Ver más" (un toast), la entrega de un alumno, la primera carga del hilo y su "Ver más comentarios" (un toast), y "Tu trabajo": se ve o se avisa "Algo salió mal. Inténtalo de nuevo.", nunca el texto en inglés ni la ruta; "claseId: x" sigue dando "No tienes acceso a esta clase.".
- **CH3-A21** (Enmienda 1, M-03; frase "Algo salió mal. Inténtalo de nuevo." en un toast, camino "repetir el control"; en `consultas-ch3.test.tsx`, con la configuración de TanStack Query de `app/providers.tsx`) "Ver más" de la lista de entregas (`entregas-view.tsx`): la primera página llega bien con `siguienteCursor`; el doble responde `400 VALIDACION` "limite: Too big: expected number" a la petición de la página siguiente y a su reintento (`retry: 1`); se ve exactamente un toast con el genérico; el botón "Ver más" sigue en pantalla, sin `aria-busy="true"` ni `aria-disabled="true"`, y las filas de la primera página siguen. Al pulsar el mismo botón, el doble responde bien: se cuenta una petición nueva de la página siguiente (con el mismo cursor), aparecen sus filas y no se muestra un segundo toast.
- **CH3-A22** (Enmienda 1, M-03; mismo camino y misma configuración) "Ver más comentarios" del hilo privado (`components/hilo-privado.tsx`), en la vista del alumno y en la entrega de un alumno del maestro: lo mismo que CH3-A21 (un toast genérico; el botón sigue y sale de la espera; los comentarios ya cargados siguen; al repetir, una petición nueva, aparecen los comentarios y no hay segundo toast). Además, un `400 VALIDACION` "cursor: el cursor no es válido" en ese "Ver más" da el genérico (el hilo no tiene texto de "cambió mientras la veías" y no reconoce el cursor; antes salía "el cursor no es válido"), y repetir el control vuelve a pedir la página.

`frontend/src/features/tareas/recuperar-ch3.test.tsx` (nuevo; frase "Algo salió mal. Inténtalo de nuevo." en un `ErrorDeCampo`, S-06 a):
- **CH3-A18** Repetir el control: en crear tarea, editar tarea, entregar, comentario del alumno, comentario del maestro y el panel de calificación, tras F2 el mismo botón manda una petición nueva y, si responde bien, el `ErrorDeCampo` desaparece (y se ve el aviso de éxito de siempre).
- **CH3-A19** Ir a otra sección y regresar antes del `staleTime` (con `rutas` y la configuración de `Providers`): con el `ErrorDeCampo` genérico en el comentario del alumno, la persona va a "Trabajo de clase" y vuelve al detalle de la tarea antes de 30 s: el `ErrorDeCampo` ya no está y "Enviar comentario" manda un `POST` nuevo. "Pulsar la sección activa" no aplica (S-06).

`frontend/src/lib/errores-de-api-estatico.test.ts` (nuevo; el programador lo extiende en 03b y 03c):
- **CH3-A20** En los archivos de producción de `src/features/tareas/` y `src/components/adjuntos/`: ninguna aparición de `.message.replace(`, `.message.slice(`, `.message.substring(`, `return error.message`, `? error.message` ni `: error.message`; la expresión de ruta (`/^[` … `]+:\s*/`) se define solo en `src/lib/errores-de-api.ts`; `src/lib/errores-de-api-fuera-de-contrato.ts` no importa nada de `features/` y ningún archivo de producción lo importa.
- **CH3-A23** (Enmienda 1, N-04 b; en `formularios-ch3.test.tsx`) La solicitud de subida con un `VALIDACION` fuera de contrato, en crear tarea y en entregar: con un archivo elegido, el doble responde a la solicitud de subida (`POST …/archivos`) con F1, F3 y F4; en cada caso, exactamente un toast con `errorRechazado(<nombre del archivo>, <resto o genérico>)` (nunca la ruta ni un motivo sin texto visible), ningún `ErrorDeCampo`, lo escrito y el archivo elegido se conservan y el botón sale de la espera; la petición de crear o entregar no sale.
- **CH3-A24** (Enmienda 1, N-02; en `src/lib/errores-de-api-estatico.test.ts`) Ni `src/lib/errores-de-api-fuera-de-contrato.ts` ni `src/lib/errores-de-api.ts` ni ningún archivo `*-ch3.test.ts(x)` contienen un carácter invisible literal: U+00A0, U+3000, U+200B, U+200C, U+200D, U+2060, U+FEFF, U+0085, U+2800, U+3164 ni U+1D159 (la prueba los busca escritos ella misma como escapes). Las entradas se escriben como escapes.
- **CH3-A25** (Enmienda 2, T-01; en `src/lib/errores-de-api.test.ts`) Las rutas dobles reales, para todos los módulos (el contrato con una traducción de prueba sin `textosPorCampo`, y otra con `claseId`, `tareaId` y `alumnoId`): un `it.each` sobre las filas del inventario de §D-1. Por cada fila, (1) el esquema real de `@campus/shared` (`archivoIdParamSchema`, `archivoDeEntregaParamSchema`, `archivoDeEntregaDeAlumnoParamSchema`, `borrarTareaQuerySchema`, `tareaIdParamSchema`, `tareaDeEntregaParamSchema`, `alumnoDeEntregaParamSchema`, `claseIdParamSchema`, `agregarAlumnoSchema`, `alumnoIdParamSchema`, `temaIdParamSchema`, `moverElementoSchema`, `crearPublicacionSchema` con un material, `ordenTemasSchema`, `publicacionIdParamSchema`, `publicacionDeMoverParamSchema`, `publicacionYComentarioParamSchema`, `comentarioIdParamSchema`, `asignarMaestroSchema`, `maestroIdParamSchema`, `crearClaseAdminSchema`, `reemplazarCategoriasSchema` y `trabajoQuerySchema`, todos exportados por nombre en `shared/src/index.ts`) con un valor inválido en ese campo da como primera incidencia el `path` y el `message` de la fila (así el inventario no se aparta de `shared/`); (2) el mensaje armado como el servidor, `${path.join(".")}: ${message}` (la forma de `handlers/validacion.ts`, escrita en la prueba), da en `mensajeDeErrorDeApi` lo que dice la última columna (el resto sin ningún prefijo, o el texto fijo del id), y en `mensajeDeErrorDeConsulta` el respaldo o el texto fijo; (3) ninguna salida empieza con una ruta (`/^[\p{L}\p{M}\p{N}_.-]+:/u`) ni queda sin texto visible. Si un esquema del inventario no da esa incidencia, la prueba falla con el nombre del esquema (no se adapta la fila sin enmienda).
- **CH3-A26** (Enmienda 2, T-02; solo con DH-6 autorizada; en `src/components/adjuntos/descarga-ch3.test.tsx`, nuevo) `AdjuntosDePublicacion` con un adjunto, un `it.each` sobre las dos fichas (sin `rutaDeArchivos` y con `rutaDeArchivos`) y las dos formas de avisar (sin `alFallarLaDescarga`, con el `mensajeDeError`; y con `alFallarLaDescarga`), con el `fetch` doble que retiene la petición de la URL de descarga: (a) dos `fireEvent.click` seguidos en «Descargar» mandan una sola petición; al soltarla con un `400 VALIDACION` F4 hay exactamente un aviso (o una llamada a `alFallarLaDescarga`) y el botón queda sin `aria-busy="true"` ni `aria-disabled="true"`; (b) "repetir el control": un clic nuevo después de asentarse manda una petición nueva y, si responde bien, `window.location.assign` se llama una vez con su URL y no hay un segundo aviso; (c) dos clics seguidos con una respuesta buena llaman a `window.location.assign` una sola vez. Las tres pruebas rojas de T-02 del tester (`formularios-ch3-r1.ataque.test.tsx`, "dos clics seguidos en «Descargar»…") deben pasar sin tocarlas.

### 03b — `features/clases`, `features/calificaciones` y N-46
`frontend/src/features/clases/errores-ch3.test.ts` (nuevo):
- **CH3-B01** `mensajeDeErrorClases` recorre la tabla; cada código de `CODIGOS_CON_MENSAJE_DEL_SERVIDOR` de `clases` (hoy 12), con cada resto, da el genérico; "claseId:" da "No tienes acceso a esta clase."; los códigos de `MENSAJES_POR_CODIGO_DE_CLASES` dan lo mismo que antes (incluidos los cuatro de archivos). Enmienda 1 (N-04 c): el envoltorio `avisoDeFalloAlSubir(error, nombre)` de `features/clases` recorre la tabla (`errorRechazado(nombre, resto ?? genérico)`) y, con `ARCHIVO_INVALIDO` y cada resto, da `errorRechazado(nombre, <texto fijo de ARCHIVO_INVALIDO de clases>)`. **Enmienda 2 (T-01, hermanos que el tester anotó para 03b):** las filas de `clases` del inventario de §D-1 dan su resto sin prefijos en `mensajeDeErrorClases` ("publicacionId: publicacionId: …", "comentarioId: comentarioId: …", "temaId: temaId: …", "temaIds.0: temaId: …", "maestroId: maestroId: …", "maestroIds.0: maestroId: …", "categorias.0.id: categoriaId: …", "alumnoId: alumnoId: …" y "archivoId: archivoId: …" → "debe ser un identificador válido"; "claseId: claseId: …" → "No tienes acceso a esta clase."), y "tema: tema: elige un tema válido" da el genérico en `mensajeDeConsultaClases`; `erroresDeCategoriasDeApi` da `null` con "categorias.0.id: categoriaId: …" (no se pinta en la fila).
- **CH3-B02** `mensajeDeConsultaClases` recorre la tabla (siempre el genérico); "claseId:" da su texto fijo.
- **CH3-B03** `mensajeDeErrorDeLista`: "cursor: x" da el texto dado; toda la tabla da el genérico.
- **CH3-B04** `erroresDeFormularioClases` (con `["nombre", "descripcion", "maestroIds"]`), `errorDelCampoCodigo` y `erroresDelTemaDeApi`: su campo con cada resto da el genérico; las rutas de la tabla dan `null`.
- **CH3-B05** `erroresDeCategoriasDeApi`: "categorias.1.peso:" y "categorias:" con cada resto dan el genérico en la fila y en la lista; "categorias.0.peso.x: y" y las rutas de la tabla dan `null`.

`frontend/src/features/calificaciones/errores-ch3.test.ts` (nuevo; sin fechas, sin emojis, sin `return` temprano):
- **CH3-B06** `esErrorDeCursorDeCalificaciones` es la misma función que `esErrorDeCursor` (`toBe`); `mensajeDeErrorCalificaciones` (sin migrar, Enmienda 1, M-01) con cada respaldo recorre la tabla y da el respaldo; "claseId: x", "claseId:" con cada resto y `SIN_ACCESO_A_LA_CLASE` dan el texto de "sin acceso"; `SERVICIO_OCUPADO` con texto y con cada resto da el respaldo (S-22 completo, sin cambio); `data.ts` del módulo no exporta `TRADUCCION_DE_ERRORES_CALIFICACIONES` ni `CODIGOS_QUE_REDIRIGE_EL_CLIENTE` (`Object.keys` del módulo importado con `import * as`).

`frontend/src/features/clases/formularios-ch3.test.tsx` (nuevo):
- **CH3-B07** Por cada formulario, F1 a F4 con (a) a (d): crear clase y editar clase del admin (F2 en `nombre`), unirse a una clase (F2 en `codigo`), publicar un anuncio y un material en el muro (F2 en `texto`), comentar en el muro (F2 en `texto`), crear un tema y renombrarlo (F2 en `nombre`) y el editor de categorías (F2 en `categorias.0.nombre` → bajo su fila, y en `categorias` → bajo el total).
- **CH3-B08** Controles sin campos, en sus hooks: borrar una publicación, borrar un comentario, regenerar el código, agregar y quitar un maestro, el alta manual y la baja de un alumno, mover un elemento de tema, reordenar los temas y borrar un tema: F1, F3, F4 y un código con mensaje del servidor de `clases` con "\u{200B}" dan exactamente un aviso legible. Enmienda 1 (N-04 a): también la descarga de un adjunto del muro (`AdjuntosDePublicacion` con `mensajeDeErrorClases`, `components/adjuntos/adjuntos-de-publicacion.tsx:58`), con la petición de la URL de descarga respondiendo F1, F3 y F4: un solo aviso legible. **Enmienda 2 (T-02, hermano; solo si DH-6 se autorizó en 03a):** en el muro, dos clics seguidos en «Descargar» mandan una sola petición y dan un solo aviso; y "archivoId: archivoId: debe ser un identificador válido" da el aviso "debe ser un identificador válido".
- **CH3-B14** (Enmienda 1, N-04 b; en `formularios-ch3.test.tsx`) La solicitud de subida con un `VALIDACION` fuera de contrato al publicar en el muro (anuncio o material con un archivo): F1, F3 y F4 en la solicitud dan exactamente un toast con `errorRechazado(<nombre>, <resto o genérico>)`, ningún `ErrorDeCampo`; el texto y el archivo elegido se conservan, el botón sale de la espera y la publicación no sale.

`frontend/src/features/clases/consultas-ch3.test.tsx` (nuevo):
- **CH3-B09** "limite: Too big: expected number" en cada consulta de §D-4 (categorías, la clase en el marco, "Editar clase", los dos buscadores, temas de "Trabajo de clase", "Personas" en primera carga y en recarga, el código, "Maestros" de la clase, el roster) y en los "Ver más" de `mensajeDeErrorDeLista` (muro, comentarios, inicio del estudiante, inicio del maestro, sección de un tema): se ve "Algo salió mal. Inténtalo de nuevo.", nunca el texto en inglés; "cursor: x" sigue dando su texto de "cambió mientras…".

`frontend/src/features/clases/recuperar-ch3.test.tsx` (nuevo):
- **CH3-B10** Repetir el control en cada formulario de CH3-B07 tras F2 (petición nueva; el `ErrorDeCampo` desaparece al responder bien) y, con `rutas` y `Providers`, ir a otra sección y regresar antes del `staleTime` con el `ErrorDeCampo` genérico en el formulario de tema de "Trabajo de clase": se va al muro y se vuelve; el formulario no muestra el error y guardar manda una petición nueva.

`frontend/src/services/apiClient-ch3.test.ts` (nuevo):
- **CH3-B11** `CODIGOS_QUE_REDIRIGE_EL_CLIENTE` son exactamente los tres códigos; `errorQueRedirigeElCliente` de `tareas` y de `calificaciones` da `true` para los tres y `false` para `SIN_ACCESO_A_LA_CLASE`, `VALIDACION`, un error que no es `ApiError` y "constructor"; ningún archivo de producción de `src/` salvo `services/apiClient.ts` declara `CODIGOS_QUE_REDIRIGE_EL_CLIENTE`.
- **CH3-B12** Sin ciclo: las importaciones de `services/apiClient.ts` son solo `@campus/shared`, `./navegacion` y `./tokenAcceso`.

`frontend/src/lib/errores-de-api-estatico.test.ts` (extendido):
- **CH3-B13** La regla de CH3-A20 cubre también `src/features/clases/` y `src/features/calificaciones/`; `quitarPrefijoDeCampo` no aparece en ningún archivo de `src/`.

**Enmienda 4 (ronda 2 de 03b, T-03 y T-04).** Ids con el prefijo del encargo; un `it.each` por módulo (aquí, `features/clases`), como pidió el humano. Las cuatro pruebas rojas de T-03 y T-04 del tester (`formularios-ch3-r1.ataque.test.tsx`, "editar clase con «maestroIds: …»" y "publicar un anuncio con «titulo: …»", dos de cada uno) deben pasar sin tocarlas, igual que los otros 84 casos de ese archivo.

`frontend/src/features/clases/errores-ch3.test.ts` (ampliado):
- **CH3-B15** "Campo pintado" por modo, en las funciones. (1) Un `it.each` sobre las filas (función, modo, campo, ¿lo pinta?): `erroresDeLaClaseDeApi` con `crear` × `nombre` sí, `descripcion` sí, `maestroIds` sí; con `editar` × `nombre` sí, `descripcion` sí, `maestroIds` **no**; `erroresDeLaPublicacionDeApi` con `anuncio` × `texto` sí, `titulo` **no**; con `material` × `titulo` sí, `texto` sí. Por fila, con `${campo}: ${MENSAJE_DE_PRUEBA}`, con `${campo}: ${campo}: ${MENSAJE_DE_PRUEBA}` (ruta doble) y con `${campo}:` seguido de cada resto de `RESTOS_SIN_TEXTO_VISIBLE`: si lo pinta, `{ [campo]: MENSAJE_DE_PRUEBA }` o `{ [campo]: <genérico> }`; si no, `null`, y `mensajeDeErrorClases` del mismo error da `MENSAJE_DE_PRUEBA` o el genérico (el aviso que reciben el gancho y el formulario: con texto visible y sin ruta). (2) Toda la tabla (`ENTRADAS_FUERA_DE_CONTRATO`) da `null` en los cuatro modos. (3) Las listas exactas: `CAMPOS_PINTADOS_DE_LA_CLASE` es `{ crear: ["nombre", "descripcion", "maestroIds"], editar: ["nombre", "descripcion"] }` y `CAMPOS_PINTADOS_DE_LA_PUBLICACION` es `{ anuncio: ["texto"], material: ["titulo", "texto"] }` (`toEqual`); así "crear" y "material" deciden lo mismo que antes del remedio. (4) Estática, sobre el texto crudo de producción de `src/features/clases/` (`import.meta.glob` con `?raw`): `erroresDeFormularioClases(` solo aparece en `lib.ts` (su definición, `errorDelCampoCodigo`, `erroresDelTemaDeApi` y las dos funciones nuevas), en `components/formulario-comentario.tsx` y, con DH-8 (a), en `hooks.ts` una sola vez (`useComentar`); con DH-8 (b), también en `hooks.ts` en `useCrearPublicacion`. Ningún archivo de producción de `features/clases` salvo `data.ts` escribe `["nombre", "descripcion", "maestroIds"]` ni, con DH-8 (a), `["titulo", "texto"]`.

`frontend/src/features/clases/formularios-ch3.test.tsx` (ampliado):
- **CH3-B16** Por cada formulario de `clases` con modos, el caso general "un `VALIDACION` de un campo que el formulario acepta en otro modo y no pinta en este da exactamente un aviso legible", y su contrario. Un `it.each` sobre las filas (formulario, modo, campo, ¿lo pinta?): crear clase × `maestroIds` (sí: un `ErrorDeCampo` localizado por el grupo «Maestros de la clase» y su descripción accesible, sin aviso); editar clase × `maestroIds` (no: un aviso, ningún `ErrorDeCampo`); publicar × anuncio × `titulo` (no: un aviso); publicar × material × `titulo` (sí: un `ErrorDeCampo` bajo el título, sin aviso); y el formulario de tema en crear y en renombrar × `nombre` (sí en los dos: el modo no cambia su campo). Por fila, con `${campo}: ${MENSAJE_DE_PRUEBA}` y con `${campo}:\u{200B}`: (a) a (d) de las convenciones (exactamente un mensaje legible, sin ruta ni texto invisible, lo escrito se conserva, el botón sin `aria-busy="true"` ni `aria-disabled="true"`). Además: (e) en el anuncio, tras el aviso, pulsar «Material» no muestra ningún error bajo el título (el error no quedó guardado); (f) en el anuncio, con el formulario desmontado mientras la petición está en vuelo (se suelta después con `titulo: ${MENSAJE_DE_PRUEBA}`), hay exactamente un aviso, `MENSAJE_DE_PRUEBA` (lo da el gancho con DH-8 (a) y el `catch` con DH-8 (b)).

`frontend/src/features/clases/recuperar-ch3.test.tsx` (ampliado):
- **CH3-B17** Frase de recuperación del aviso genérico ("Algo salió mal. Inténtalo de nuevo.") que nace en CH3-B16 con `${campo}:\u{200B}`, por cada camino:
  - **Repetir el control:** en editar clase (`maestroIds:\u{200B}`) y en el anuncio (`titulo:\u{200B}`), pulsar otra vez «Guardar cambios» o «Publicar anuncio» manda una petición nueva (`PUT /api/admin/clases/:claseId` o `POST …/publicaciones`) con lo que se conservó; si responde bien, editar clase avisa con el éxito de siempre y navega a `/admin/clases/:claseId`, y el anuncio avisa con su éxito y vacía el campo; no hay un segundo aviso de error.
  - **Ir a otra sección y regresar antes del `staleTime`:** con `rutas` y `Providers`, en "Editar clase" del admin tras el aviso genérico, salir por «Cancelar» a la clase (`/admin/clases/:claseId`) y volver a `/admin/clases/:claseId/editar` antes de 30 s (por el enlace de la vista de la clase que lleva ahí; si no lo hay, con «atrás» del historial, y el resumen dice cuál usó): el formulario se monta con los valores de la clase, sin error; «Guardar cambios» manda un `PUT` nuevo. En el anuncio, el camino es el de CH3-B10 y O-14 (el estado del formulario es local y el aviso no queda en la vista), sin caso nuevo.
  - **Pulsar la sección activa:** no aplica. El aviso es un toast que no queda en la vista y el formulario conserva lo escrito y su estado (S-06, O-r1-2); no hay nada cargado que renovar.

### 03c — `features/admin` y `features/auth`
`frontend/src/features/auth/errores-ch3.test.ts` y `frontend/src/features/admin/errores-ch3.test.ts` (nuevos):
- **CH3-C01** `mensajeDeErrorAuth` recorre la tabla (`resto ?? "No pudimos completar la operación. Inténtalo de nuevo."`); sus códigos fijos no cambian; "constructor" y "toString" dan el genérico.
- **CH3-C02** `mensajeDeErrorAdmin` recorre la tabla; `CUPO_DIARIO_INSUFICIENTE` con cada resto da el genérico y con texto da su mensaje; `mensajeDeConsultaAdmin` recorre la tabla (siempre el genérico).

`frontend/src/features/auth/formularios-ch3.test.tsx` y `frontend/src/features/admin/formularios-ch3.test.tsx` (nuevos):
- **CH3-C03** Formularios de `auth`: iniciar sesión, registro de estudiante, registro de maestro por enlace, recuperar contraseña, restablecer contraseña, establecer contraseña (invitación) y cambio obligatorio de contraseña. F1, F3 y F4 con (a) a (d): un solo `MensajeError` (`role="alert"`) con texto legible, sin toast; los campos conservan lo escrito (también los de contraseña) y, tras F3, repetir el control con una respuesta buena quita la alerta (frase "Inténtalo de nuevo", camino "repetir el control"; el `MensajeError` genérico ya salía ahí con un `5xx`).
- **CH3-C04** Formularios de `admin`: invitar maestro, invitación masiva, generar enlace de registro, buscar una cuenta y corregir el correo. Lo mismo que CH3-C03.
- **CH3-C05** Controles sin campos: restablecer la contraseña desde la ficha y revocar un enlace: F1, F3 y F4 dan un solo `MensajeError` legible.
- **CH3-C06** "limite: Too big: expected number" en la tabla de enlaces y en los registrados de un enlace: se ve el genérico de `admin`, nunca el texto en inglés.

`frontend/src/lib/errores-de-api-estatico.test.ts` (extendido):
- **CH3-C07** La regla de CH3-A20 cubre todo `src/` de producción salvo `src/lib/errores-de-api.ts` y `src/features/diagnostico/` (S-09).

`frontend/src/features/admin/errores-ch3.test.ts` y `frontend/src/features/admin/formularios-ch3.test.tsx` (Enmienda 3, M-04):
- **CH3-C08** La ruta doble del esquema local del administrador. El mensaje se escribe literal en la prueba, `"id: id: debe ser un identificador válido"`, con un comentario que cite `backend/src/handlers/admin.ts:60` y la forma `${path.join(".")}: ${message}` de `handlers/validacion.ts` (el esquema no está en `@campus/shared` y la prueba no puede importarlo). (1) En `errores-ch3.test.ts`: `mensajeDeErrorAdmin` con un `400 VALIDACION` con ese mensaje da exactamente "debe ser un identificador válido", y `mensajeDeConsultaAdmin` da "No pudimos completar la operación. Inténtalo de nuevo."; con "id: id:" seguido de cada resto, las dos dan el genérico; ninguna salida empieza con una ruta (`/^[\p{L}\p{M}\p{N}_.-]+:/u`) ni contiene "id:". (2) En `formularios-ch3.test.tsx`, un `it.each` sobre las cuatro rutas, con el `fetch` doble respondiendo ese `400 VALIDACION` a la petición de la ruta (y a su reintento, si el montaje lo tiene): restablecer la contraseña desde la ficha de una cuenta (tras confirmar), corregir el correo, revocar un enlace (tras "Sí, revocar") y los registrados de un enlace (al expandir la fila; consulta). En las tres acciones, exactamente un `MensajeError` (`role="alert"`) con "debe ser un identificador válido", sin toast, y el botón sin `aria-busy="true"` ni `aria-disabled="true"`; en corregir el correo, además, el correo escrito se conserva. En la consulta, exactamente un `MensajeError` con el genérico de `admin`. En las cuatro, el texto visible no contiene "id:". El genérico de la consulta es el mismo texto y lugar que hoy sale con un `5xx`: sus caminos de navegación son de S-06 (b2) y DH-2 (los registrados de un enlace ya están en esa lista).

**Enmienda 5 (ronda 2 de 03c, T-05; solo con DH-9 (a)).** Ids con el prefijo del encargo; un `it.each` por módulo, con títulos `%s` sobre tuplas (ningún título repetido en `npx vitest list`). Las 11 pruebas rojas de T-05 del tester (`admin/errores-ch3-r1.ataque.test.tsx` 4 y `auth/errores-ch3-r1.ataque.test.tsx` 7, "…el MensajeError de un envío anterior y el error local del siguiente") deben pasar sin tocarlas, igual que los demás casos de esos archivos y la fila de `buscar una cuenta` (el control). "Rechazo del servidor" usa tres entradas por formulario: F1 (`campoFueraDeContrato: Revisa este valor.`, da "Revisa este valor."), F3 (`"   "`, da el genérico, que es la frase de recuperación "…Inténtalo de nuevo.") y un código con texto fijo del módulo (en `admin`, uno de `MENSAJES_ERROR_ADMIN`, y en la masiva también `CUPO_DIARIO_INSUFICIENTE` con texto; en `auth`, uno de `MENSAJES_ERROR_AUTH` que no sea `ENLACE_INVALIDO` ni `CAMBIO_NO_REQUERIDO` ni uno que `apiClient` redirija). "Rechazo local" es un valor que el esquema o la confirmación rechazan sin petición. En cada caso, además de lo propio: lo escrito se conserva (también las contraseñas) y el botón queda sin `aria-busy="true"` ni `aria-disabled="true"`.

`frontend/src/features/admin/formularios-ch3.test.tsx` (ampliado):
- **CH3-C09** Servidor y después local, en `admin`. Un `it.each` sobre las tuplas (formulario, rechazo del servidor, rechazo local): invitar maestro (correo sin arroba; nombre solo de espacios), invitación masiva (lista solo de espacios; más de 100 líneas), generar enlace (vigencia `0`; vigencia `31`) y corregir el correo (correo sin arroba), cada una con F1, F3 y el código fijo; y buscar una cuenta (correo sin arroba) con F1, como control que ya pasa. Tras el `MensajeError` del servidor, el reenvío rechazado en local deja: (a) ningún `role="alert"`; (b) exactamente un `aria-invalid="true"` con su `ErrorDeCampo` con texto; (c) ni el texto del servidor ni el genérico en `document.body`; (d) ninguna petición nueva. **Repetir el control** (frase "Inténtalo de nuevo" de F3, y el envío corregido tras F1 y el código): se corrige el campo y se vuelve a pulsar; (e) sale exactamente una petición nueva; con una respuesta buena, el éxito de siempre (el texto de invitar o de corregir, el resultado de la masiva o el enlace nuevo), sin `role="alert"` ni `aria-invalid`; con F1 otra vez, exactamente un `MensajeError` "Revisa este valor." y ningún `aria-invalid`.

`frontend/src/features/auth/formularios-ch3.test.tsx` (ampliado):
- **CH3-C10** Servidor y después local, en `auth`. Lo mismo que CH3-C09, con las tuplas: iniciar sesión (correo sin arroba), registro de estudiante (contraseña de menos de 10 caracteres), registro de maestro por enlace (nombre solo de espacios), recuperar contraseña (correo sin arroba), restablecer contraseña (contraseña corta; confirmación distinta), establecer contraseña por invitación (nombre vacío; contraseña corta; confirmación distinta) y cambio obligatorio (contraseña corta; confirmación distinta), cada una con F1, F3 y el código fijo. Mismas comprobaciones (a) a (d), con el `MensajeError` del formulario y su título. **Repetir el control:** con el campo corregido, una petición nueva; con una respuesta buena, el destino de siempre (la ruta tras iniciar sesión o registrarse, `/login` con su aviso tras restablecer o establecer, la confirmación fija de recuperar, el destino tras el cambio obligatorio), sin `role="alert"`; con F1 otra vez, exactamente un `MensajeError` y ningún `aria-invalid`.

`frontend/src/features/admin/formularios-ch3.test.tsx` y `frontend/src/features/auth/formularios-ch3.test.tsx` (ampliados; un `it.each` por módulo):
- **CH3-C11** Local y después servidor (el contrario). En los once formularios: primero un rechazo local (el de la primera tupla de CH3-C09 o CH3-C10), después el campo corregido y un envío que el servidor rechaza con F1: (a) exactamente un `MensajeError` "Revisa este valor."; (b) ningún `aria-invalid="true"` ni `ErrorDeCampo`; (c) exactamente una petición. **Repetir el control:** pulsar otra vez con una respuesta buena da el éxito o el destino de siempre y quita la alerta.
- **CH3-C12** Lo que no cambia. (1) En invitar maestro y en corregir el correo: tras un envío aceptado, un rechazo local deja el texto de éxito (`role="status"`) **y** el `ErrorDeCampo`, sin `role="alert"` (fija la condición `isError` de §D-4, Enmienda 5). (2) En los once: dos envíos válidos seguidos que el servidor rechaza (F1 y luego el código fijo) dan exactamente un `MensajeError`, el del segundo, y dos peticiones. (3) En los once: un envío con la petición en vuelo (pulsar otra vez antes de soltarla) no manda una segunda petición y, al soltarla con F1, hay exactamente un `MensajeError` (la guarda `isPending` sigue antes de `reset`; no es una prueba de doble clic en el mismo render, que es de CHORE-04).

`frontend/src/lib/errores-de-api-estatico.test.ts` (extendido):
- **CH3-C13** Sobre el texto crudo de producción, sin comentarios: en cada uno de los diez archivos de §D-4 (Enmienda 5), la expresión `if \((\w+)\.isError\) \1\.reset\(\)` aparece exactamente una vez, con el nombre de la mutación de su fila, después de `.isPending) return` y antes del primer `safeParse(` del archivo; ninguno de los diez contiene `Ref.current) return` (la ref es de CHORE-04); en `features/admin` y `features/auth`, `.reset()` de una mutación solo aparece en esos diez y en `buscador-de-cuenta.tsx` (que sigue con `buscar.reset()` sin condición).

**Frases de recuperación (regla de `AGENTS.md`).** El remedio no crea ni cambia ningún texto. La frase que toca es la del genérico de `admin` y de `auth` en el `MensajeError` ("…Inténtalo de nuevo.", tras F3), que ya existía con un `5xx`. Por camino: **repetir el control** es el único que el remedio cambia (ahora, con un rechazo local en medio, el texto desaparece y queda el `ErrorDeCampo`; después, el envío corregido vuelve a pedir): CH3-C09, CH3-C10 y CH3-C11. **Ir a otra sección y regresar antes del `staleTime`** y **atrás y adelante del historial**: el formulario se monta de nuevo con un observador nuevo y sin error; el remedio no los cambia y ya los cubre el tester con el router real y `Providers` (`admin/rutas-ch3-r1.ataque.test.tsx`, 20 casos, y `auth/rutas-ch3-r1.ataque.test.tsx`, 10 casos). **Pulsar la sección activa:** mismo componente; el texto sigue hasta el siguiente envío y repetirlo lo quita (S-06; lo fija el tester en `admin/rutas-ch3-r1`). Sin casos nuevos de navegación.

### Lo que no se repite
La autorización por endpoint no aplica (ningún endpoint nuevo). Las pruebas existentes de calificar, entregar y comentar (r1 a r4 de 01c) siguen cubriendo los avisos únicos, el doble clic y la vista desmontada: no se duplican.

## Puntos de ataque para el Tester
- Cualquier entrada que deje un aviso vacío, invisible o con una ruta técnica en cualquiera de las funciones de §D-4 o en cualquier formulario; en especial, mezclas de restos (`"\u{00A0}\u{200B}\n"`), una ruta muy larga, una ruta solo de dígitos, letras con marca combinante (`"párametro:"`).
- Aviso **y** `ErrorDeCampo` a la vez, o ninguno: el formulario y su hook deciden con la misma función (por ejemplo, `erroresDeLaTareaDeApi` en `formulario-tarea.tsx` y en `useCrearTarea`); buscar un formulario donde no coincidan.
- Consultas: un `VALIDACION` de un parámetro de consulta en cada "Ver más" y en cada primera carga y recarga; que ninguna muestre el texto de zod.
- `esErrorDeCursor` pasado como función a `map`, `filter` o `some` en código de producción (el mismo problema de C-1).
- N-46: que ningún módulo siga con una copia de la lista y que `apiClient` no importe de `features/` ni de `lib/`.
- **Decisiones tomadas que no son hallazgo:** una ruta precedida por un carácter invisible o por un espacio ("\u{200B}campo: x", " campo: x") no es una ruta y se muestra tal cual (el servidor arma siempre `${campo}: ${mensaje}`, `handlers/validacion.ts`); un mensaje solo de puntuación es visible (S-04); los códigos con mensaje del servidor no se recortan aunque empiecen con algo que parece una ruta (CAL-T-123); en las consultas, los códigos con mensaje del servidor muestran su mensaje (S-01); los caminos de recuperación de las consultas son del `chore` (b) (S-06); Enmienda 1: esto vale solo para los caminos de navegación de las consultas que reemplazan la vista (S-06 b2, si el humano lo confirma en DH-2), no para "repetir el control" de los dos "Ver más" con toast (CH3-A21 y CH3-A22); Enmienda 1 (N-07): un `VALIDACION` sin ruta cuyo mensaje empezara con algo como "14:30 …" perdería "14:" (S-05); hoy no se alcanza, porque todo `VALIDACION` del servidor lleva ruta (`validarCuerpo`, `validarParametros`, `core/calificaciones`, `core/tareas/categorias`, los cursores) o no lleva dos puntos (`adapters/db/errores.ts`).
- **Enmienda 2 (T-01).** A atacar: la ruta doble en cada camino de un campo pintado y no pintado de `tareas` (el aviso de calificar, `erroresDeLaTareaDeApi`, enlaces, texto), con separadores raros entre los dos prefijos, con un resto sin texto visible tras el nombre, y que nada quite un tercer prefijo. **Decisiones tomadas que no son hallazgo:** se quitan como máximo dos prefijos (la ruta y un nombre en camelCase); un texto para la persona que, tras la ruta, empezara con una palabra en minúscula pegada a dos puntos ("x: ejemplo: algo") perdería esa palabra (hoy no se alcanza: §D-1, "Rutas dobles del servidor"); el resto que queda tras una ruta doble empieza con minúscula ("debe ser un identificador válido", "no es válido"), como ya pasaba con "el cursor no es válido" (R-07).
- **Enmienda 2 (T-02).** A atacar: dos y tres clics seguidos en «Descargar» en los cuatro sitios, también después de que React vuelve a pintar; que la guarda se libere tras un fallo y tras un éxito; la vista desmontada con la descarga en vuelo (sin aviso si quien la pasa maneja `alFallarLaDescarga` con su propia guarda de montaje, como hoy).
- **Enmienda 3 (M-04, 03c).** A atacar: "id: id: debe ser un identificador válido" en las cuatro rutas de `:id` del administrador (CH3-C08), con separadores raros entre los dos prefijos y con un resto sin texto visible; que ningún `MensajeError` muestre "id:" ni quede vacío.
- **Enmienda 3 (M-05, DH-7 = b, 03b y 03c). Decisión tomada que no es hallazgo:** los controles de "Lista para CHORE-04" (abajo) solo se protegen con `isPending`, así que dos clics en el mismo render pueden mandar dos peticiones. Es un defecto previo a `ad10844`, fuera del chore por decisión del humano (2026-10-26), con destino **CHORE-04 · guardas de doble clic**. El tester lo anota como observación (`O-…`, con el archivo y el control) y **no escribe pruebas rojas** de doble clic sobre ellos en 03b ni en 03c. Si encuentra otro control sin ref que no está en la lista, también es observación con destino CHORE-04, no hallazgo. Sí es hallazgo que un control que hoy **tiene** ref la pierda, o que la descarga del muro (guardada en 03a por DH-6, CH3-B08) mande dos peticiones.

- **Enmienda 4 (T-03 y T-04).**
  - **03b, ronda 2:** las cuatro rojas de T-03 y T-04 en verde sin tocarlas; buscar otro formulario de `clases` donde la lista de campos que se pasa a la traducción no dependa del modo, o donde el formulario y su gancho la calculen por separado; que el modo salga de lo enviado (`datos.tipo`) y no del estado (cambiar de tipo con la petición en vuelo no debe cambiar la decisión: `publicandoRef` y `elegirTipo` lo impiden, comprobarlo); anuncio con `titulo:` y luego «Material» (ningún error viejo bajo el título); la vista desmontada con el anuncio en vuelo (un aviso, nunca dos); `maestroIds.0: maestroId:` y `maestroIds:` en los dos modos; que crear clase y material sigan dando exactamente lo de la ronda 1. **Decisiones tomadas que no son hallazgo:** en crear y editar clase, con la vista desmontada no hay aviso de ningún error (callbacks de `mutate`, como en `1f11d38e`); el doble clic en crear y editar clase (fila 2 de la "Lista para CHORE-04").
  - **03c:** buscar el mismo patrón en `features/admin` y `features/auth`: un formulario con modos (por ejemplo, `formulario-nueva-contrasena.tsx` en restablecer y en establecer con el nombre corregible; registro de estudiante y de maestro) que asocie un `VALIDACION` del servidor a un campo con una lista que no dependa del modo. Hoy ninguno lo hace (sus errores del servidor van a un `MensajeError`; `erroresPorCampo` de `auth` y `erroresPorCampoAdmin` solo leen la validación local), así que un hallazgo ahí sería nuevo de 03c.

- **Enmienda 5 (T-05, 03c ronda 2).**
  - **A atacar:** las 11 rojas de T-05 en verde sin tocarlas; secuencias largas en los once formularios (servidor → local → servidor → local; local → servidor → local; éxito → local → servidor); los dos caminos de rechazo local de restablecer, establecer y el cambio obligatorio (esquema y confirmación) y el nombre de establecer; el código con texto fijo y `CUPO_DIARIO_INSUFICIENTE` como primer rechazo; que el éxito de invitar maestro y de corregir el correo siga tras un rechazo local; que un envío válido tras un error siga mandando una sola petición; y buscar un formulario de `admin` o `auth` con `MensajeError` de una mutación y validación local que no esté en la tabla de §D-4 (Enmienda 5). **Decisiones tomadas que no son hallazgo:** el texto de éxito de invitar maestro y de corregir el correo sigue tras un rechazo local (no es un mensaje de error; §D-2, Enmienda 5); el doble clic en el mismo render en los once (filas 7 a 10 y 12 a 17 de la "Lista para CHORE-04"; observación, sin prueba roja, como en la Enmienda 3).
  - **Hermanos revisados, sin remedio** (búsqueda de `.isError` en producción de `frontend/src/` y de `safeParse(` en los componentes): en `admin`, «Sí, restablecer» de la ficha (`ficha-de-cuenta.tsx:97` y `:123`) y «Sí, revocar» (`tabla-enlaces.tsx:135`) no validan en local, así que no hay secuencia; `BuscadorDeCuenta` ya lo resolvía. En `auth`, «Cerrar sesión» (`formulario-cambiar-contrasena.tsx:99`, `acceso-restringido-view.tsx:72`) no muestra `MensajeError`, y las consultas de S-08 no son envíos. En `clases` (03b, cerrada): `formulario-clase.tsx`, `formulario-publicacion.tsx`, `formulario-comentario.tsx`, `formulario-tema.tsx`, `formulario-unirse-clase.tsx` y `editor-de-categorias.tsx` guardan el error del servidor de un campo en el mismo `errores` que la validación local reemplaza (`setErrores(…)` en la rama del rechazo local), y los demás errores del servidor son avisos que no se quedan en la vista; `errorDeArchivos` de la publicación es de la elección de archivos, no del servidor. En `tareas` (03a, cerrada): `formulario-tarea.tsx` y `panel-de-calificacion.tsx` usan un solo `errores`, que la validación local reemplaza; `hilo-privado.tsx` ya limpia el error del servidor antes de validar (`setErrorDelServidor(null)`, `:68`); en `formulario-de-entrega.tsx`, el rechazo local (sin contenido) solo se alcanza sin enlaces, y quitar los enlaces ya borra `errorDeEnlaces` (`:107`). En `calificaciones` no hay formularios (calificar vive en `tareas`). **Ningún hermano queda pendiente:** ni 03a ni 03b cambian.
  - **O-r1-4 (`ENLACE_INVALIDO` con mensaje vacío lo rechaza `errorApiSchema`): decisión tomada, sin acción.** No se alcanza (el backend responde con el mismo esquema, `mensaje` con al menos un carácter) y el resultado es el genérico, legible.
  - **O-r1-5 (el error de «Sí, revocar» reaparece al volver a abrir la confirmación): decisión tomada, destino ADMIN-01**, que rehace la gestión de enlaces. Es previo al chore, no da dos mensajes para un envío y está en `tabla-enlaces.tsx`, que 03c solo toca en la consulta (PA-3). El orquestador lo registra en `docs/ESTADO.md` §3 con ese destino.
  - **O-r1-6 (los formularios de `auth` y `admin` pintan su `MensajeError` un instante mientras `apiClient` redirige con `ACCESO_RESTRINGIDO`, `CAMBIO_DE_CONTRASENA_REQUERIDO` o `NO_AUTENTICADO`): decisión tomada, destino el `chore` de foco y navegación** (el (b) de `docs/ESTADO.md` §2b, después de ADMIN-01), que ya lleva lo que pasa en la vista mientras se navega (N-52, N-54). Es previo al chore; `irA` recarga la página, así que dura un instante y jsdom no lo puede medir como lo ve la persona. El remedio sería que los formularios no pinten un error de `CODIGOS_QUE_REDIRIGE_EL_CLIENTE` (N-46), lo que toca los mismos once componentes y su matriz; no entra aquí. El orquestador lo registra en `docs/ESTADO.md` §3.
  - **O-r1-7 (`features/clases/data.ts:239` nombra `MENSAJES_ERROR_CLASES` en un comentario): decisión tomada, sin acción.** Es el comentario que explica el cambio de nombre de 03b (cerrada); ninguna regla lo prohíbe.
  - **O-22 del manager (los «Cargar más» de enlaces y de registrados usan `enEspera={isFetchingNextPage}`, `tabla-enlaces.tsx:240` y `registrados-del-enlace.tsx:71`): decisión tomada, destino CHORE-04**, que pasa a incluir, además de la guarda con ref, la regla de `CLAUDE.md` del "Ver más" (`enEspera={isFetching}`) en su inventario y en su regla estática de todo `src/`. Si ADMIN-01 rehace esas tablas antes, las absorbe y su plan lo dice. Es previo al chore (PA-3 en 03c). El orquestador suma las dos filas a la "Lista para CHORE-04" de `docs/ESTADO.md`.

**Lista para CHORE-04 (Enmienda 3, M-05 y S-14; la copia el orquestador a `docs/ESTADO.md`).** Búsqueda: todo `.mutate(` y `.mutateAsync(` de producción en `frontend/src/` sin un `if (…Ref.current` antes en el mismo manejador. Todas las rutas son relativas a `frontend/src/`; la línea es la de la llamada.

| # | Archivo | Control (mutación) | En qué subentrega se recorre |
|---|---|---|---|
| 1 | `features/clases/components/formulario-comentario.tsx:40` | Comentar en el muro (`comentar`) | 03b |
| 2 | `features/clases/components/formulario-clase.tsx:97` y `:112` | Crear y editar una clase del admin (`crear`, `editar`) | 03b |
| 3 | `features/clases/components/codigo-de-clase.tsx:58` | Regenerar el código (`regenerar`) | 03b |
| 4 | `features/clases/components/formulario-unirse-clase.tsx:36` | Unirse a una clase (`unirse`) | 03b |
| 5 | `features/clases/components/buscador-alumnos.tsx:44` | Alta manual de un alumno (`agregar`) | 03b (el archivo cambia solo en su consulta, `:131`) |
| 6 | `features/clases/components/buscador-de-maestros.tsx:100` | Agregar un maestro (`asignar`) | 03b (el archivo cambia solo en su consulta, `:199`) |
| 7 | `features/admin/components/formulario-corregir-correo.tsx:39` | Corregir el correo (`corregir`) | 03c |
| 8 | `features/admin/components/formulario-generar-enlace.tsx:56` | Generar un enlace de registro (`generar`) | 03c |
| 9 | `features/admin/components/formulario-invitacion-masiva.tsx:41` | Invitación masiva (`invitar`) | 03c |
| 10 | `features/admin/components/formulario-invitar-maestro.tsx:36` | Invitar maestro (`invitar`) | 03c |
| 11 | `features/admin/components/buscador-de-cuenta.tsx:42` | Buscar una cuenta (`buscar`) | 03c |
| 12 | `features/auth/components/formulario-login.tsx:38` | Iniciar sesión (`inicioSesion`) | 03c |
| 13 | `features/auth/components/formulario-registro.tsx:39` | Registro de estudiante (`alta`) | 03c |
| 14 | `features/auth/components/formulario-registro-maestro.tsx:44` | Registro de maestro por enlace (`alta`) | 03c |
| 15 | `features/auth/components/formulario-recuperar.tsx:35` | Recuperar contraseña (`recuperar`) | 03c |
| 16 | `features/auth/components/formulario-nueva-contrasena.tsx:90` | Restablecer o establecer contraseña (`nuevaContrasena`) | 03c |
| 17 | `features/auth/components/formulario-cambiar-contrasena.tsx:44` y `:99` | Cambio obligatorio de contraseña (`cambiar`) y cerrar sesión (`cerrarSesion`) | 03c |
| 18 | `features/auth/acceso-restringido-view.tsx:72` | Cerrar sesión en "Acceso restringido" (`cerrarSesion`) | 03c |
| 19 | `features/clases/maestros-de-clase-view.tsx:67` | Quitar un maestro de la clase (`retirar`) (S-14, nuevo) | 03b (el archivo cambia solo en su consulta, `:42`) |
| 20 | `features/clases/components/comentarios-de-publicacion.tsx:74` | Borrar un comentario del muro (`borrar`) (S-14, nuevo) | 03b |
| 21 | `features/clases/components/publicacion-del-muro.tsx:118` | Borrar una publicación del muro (`borrar`) (S-14, nuevo) | 03b |
| 22 | `features/clases/components/tabla-alumnos.tsx:59` | Quitar un alumno (`quitar`) (S-14, nuevo) | 03b (el archivo cambia solo en su consulta, `:185`) |
| 23 | `app/require-rol.tsx:46` | Cerrar sesión desde el marco por rol (`cerrarSesion`) (S-14, nuevo) | Ninguna: `src/app/` no lo recorre el chore |

Las filas 1 a 18 son las del manager (M-05); 19 a 23, las que suma mi búsqueda (S-14). Ya tienen su ref, y no van en la lista: en 03a, las de §D-4 (más «Descargar», DH-6); en `features/clases`, `editor-de-categorias.tsx` (`guardandoRef`), `formulario-publicacion.tsx` (`publicandoRef`), `formulario-tema.tsx` (`enviandoRef`), `mover-elemento.tsx` (`moviendoRef`), `seccion-de-tema.tsx` (`borrandoRef`) y `trabajo-view.tsx` (`ordenandoRef`); en `features/admin`, `ficha-de-cuenta.tsx` y `tabla-enlaces.tsx` (`enviandoRef`). Recomendación para CHORE-04 (del manager): carril normal, con su inventario y una regla estática que fije la guarda en todo `src/`.

## Riesgos y desacuerdos
- **R-01. Volumen de pruebas de interfaz** (unos 25 formularios con cuatro casos, más controles y consultas). Mitigación: `it.each` por formulario y una sola función de montaje por módulo; el `testTimeout` de 15 s ya está. Si una corrida pasa de los límites por carga del equipo, es PA-12 del tester, no del código.
- **R-02. Una prueba existente que este inventario no vio.** Revisé las 55 que usan `"VALIDACION"` y las 24 estáticas, pero muchas comparan contra la salida dinámica de una función. Si alguna rompe, es PARADA (PA-1), no una corrección por cuenta propia.
- **R-03. Expresiones con `\p{…}` y la bandera `u`.** Las soporta todo navegador moderno y el `target` de Vite; si `tsc -b` o `vite build` las rechazaran, PA-7.
- **R-04. Tipos de las tablas existentes.** `MENSAJES_ERROR_AUTH`, `MENSAJES_ERROR_ADMIN` y `CODIGOS_CON_MENSAJE_DEL_SERVIDOR` de `admin` son `as const`; un objeto literal `as const` se asigna a `Readonly<Record<string, string>>` y una tupla `as const` a `readonly string[]`. Si `satisfies` falla por la forma de alguna, PA-5.
- **R-05. La tabla es código escaneado por las reglas estáticas** aunque solo la importen pruebas: cualquier regla futura sobre todo `src/` le aplica (ya pasa con CAL-T-99, S-07).
- **R-06. Pregunta no bloqueante para el cierre:** N-22 (`if` anidados en el backend) y `formatearFechaDeClase` a `lib/format.ts` tienen en §3 el destino "el `chore` posterior a CALIFICACIONES-01 (el mismo de S-15)". CHORE-03 no los absorbe (S-11). Recomiendo darles destino "carril trivial al tocar el archivo" (N-22) y "el próximo encargo que toque `lib/format.ts`" (`formatearFechaDeClase`); lo decide el humano y lo anota el orquestador.
- **R-07 (Enmienda 2, T-01). El resto de una ruta doble es un fragmento en minúscula** ("debe ser un identificador válido", "no es válido"): es legible y sin tecnicismos de ruta, pero no dice qué hacer. Solo se llega con una URL o un cuerpo manipulados (el cliente arma siempre ids y `?confirmar=` válidos), igual que el `limite:` de R-15. Mejorarlo con un texto por campo es la opción (b) que descarto en la Enmienda 2 (textos nuevos, S-02); si el humano lo quiere, va a un encargo con los textos en `data.ts` y su marca en `DESIGN.md`.
- **R-08 (Enmienda 2, T-01). La regla del nombre repetido depende de una convención de `shared/`** (los esquemas que repiten su campo lo escriben en camelCase al inicio de su mensaje, y ningún texto para la persona empieza con "palabra:" en minúscula). CH3-A25 la amarra a los esquemas reales: si un esquema nuevo de `shared/` escribe su mensaje de otra forma, la prueba no lo ve hasta que alguien lo sume al inventario. Recomiendo, para un encargo futuro que sí toque `shared/` y el backend, quitar el nombre del mensaje de esos esquemas (la causa) y dejar la regla del contrato como red; está fuera de este chore ("No se toca"). **Enmienda 3 (M-04):** la convención no es solo de `shared/`: también la sigue un esquema local del backend, `parametrosIdSchema` de `backend/src/handlers/admin.ts:60` ("id: debe ser un identificador válido", cuatro rutas de 03c). CH3-A25 no puede verlo porque no se importa de `@campus/shared`; lo amarra CH3-C08 con el mensaje literal, así que un cambio de ese texto en el backend no lo detecta ninguna prueba del frontend. El encargo futuro que quite la causa debe incluir ese esquema (y buscar otros `z.*("campo: …")` locales en `backend/src/handlers/`; hoy es el único, por búsqueda propia).
- **R-09 (Enmienda 4, T-03 y T-04). Las listas de campos pintados por modo hay que mantenerlas a mano.** Si un formulario gana o pierde un campo en un modo, su lista de `data.ts` cambia en el mismo cambio. CLASES-03 cambiará el formulario de publicación ("Avisos" y "Recursos", con su bloque) y FORO-01 sumará un tipo: `satisfies Readonly<Record<TipoPublicacion, …>>` hace que un tipo nuevo no compile sin su lista, pero un campo nuevo dentro de un tipo no lo detecta nada salvo CH3-B15 (3), que fija las listas de hoy. Recomiendo que esos planes nombren la lista en su "Cambios por capa".
- **R-10 (Enmienda 5, T-05). La regla de limpiar antes de validar vive en cada formulario, no en un solo lugar.** Un formulario nuevo de CLASES-03 o de ADMIN-01 que muestre un `MensajeError` desde `isError` puede olvidarla; CH3-C13 solo fija los diez archivos de hoy. Mitigación: A-8 (la regla en `CLAUDE.md` › "Formularios") y que esos planes la pidan en "Pruebas requeridas". CHORE-04 tocará los mismos manejadores para poner la ref: la ref va antes de la guarda o en su lugar, y la línea de `reset()` queda después de ella; su plan debe nombrarlo para no perderla. Alternativa descartada: un gancho compartido que envuelva `useMutation` y limpie solo (tocaría los `hooks.ts`, PA-2, y es un refactor de dos módulos).
- **Desacuerdos con ESSENTIALS:** ninguno. Con la parte A, la exportación ya no es un apartamiento de "Archivos" (R-01 decidido).

## PARADAS (el programador se detiene y reporta; no lo resuelve)
- **PA-1.** Falla una prueba, normal o `*.ataque`, que no está en §D-R0 (C-1 a C-4, N-L1 a N-L3) ni es nueva de este plan.
- **PA-2.** Cumplir el plan exigiría cambiar `features/tareas/hooks.ts` (el número de llamadas a `renovarTrasErrorDeLaEntrega` o a `avisarDelErrorDeLaEntrega`, o sus argumentos) o cualquier `hooks.ts`. **Enmienda 4:** salvo, con DH-8 (a), `features/clases/hooks.ts` en las líneas exactas de §D-4 (la importación y `useCrearPublicacion.onError`); cualquier otra línea de ese archivo sigue siendo PA-2.
- **PA-3.** Haría falta tocar un archivo de "No se toca".
- **PA-4.** `contarCaracteresVisibles` no se puede importar de `@campus/shared` en el frontend sin cambiar `shared/` (nunca se copia la regla).
- **PA-5.** `satisfies TraduccionDeErrores` no compila con la forma de una constante existente (no se cambia la constante sin plan).
- **PA-6.** Un formulario muestra hoy los errores del servidor de una forma que §D-2 no prevé (por ejemplo, aviso y `ErrorDeCampo` a la vez en el camino feliz, o un error del servidor que no pasa por ninguna función de traducción).
- **PA-7.** `npm run build` o `tsc -b` del frontend rechazan la expresión de §D-1.
- **PA-8.** (Enmienda 1, M-01) `features/calificaciones/lib.ts` necesitaría una importación de `@/lib/errores-de-api` distinta de `import { campoDeErrorDeApi, esErrorDeCursor } from "@/lib/errores-de-api"`, o habría que tocar `mensajeDeErrorCalificaciones`.
- **PA-9.** (Enmienda 2) La guarda de T-02 exigiría cambiar algo de `adjuntos-de-publicacion.tsx` distinto de lo que dice §D-4 (`AdjuntosDePublicacionProps`, `descargar`, un `enEspera=` de más o de menos, los textos) o tocar `components/adjuntos/hooks.ts`; o el humano no autorizó DH-6 (entonces no se toca el archivo y se reporta).
- **PA-10.** (Enmienda 2) Un esquema del inventario de §D-1 no da en CH3-A25 el `path` o el `message` que dice su fila (no se corrige la fila ni la regla por cuenta propia).
- **PA-11.** (Enmienda 4) El humano no respondió DH-8 (entonces no se tocan `formulario-clase.tsx`, `formulario-publicacion.tsx` ni `hooks.ts`, y se reporta); o el remedio de T-03 y T-04 exigiría cambiar algo de esos archivos distinto de lo que dice §D-4 (Enmienda 4), por ejemplo agregar la ref de la fila 2 de la "Lista para CHORE-04", tocar otro gancho o un comentario ajeno; o `satisfies Readonly<Record<TipoPublicacion, readonly string[]>>` no compila porque `TipoPublicacion` no es exactamente `"anuncio" | "material"`; o, tras el remedio, alguna de las cuatro rojas de T-03 y T-04 sigue roja.
- **PA-13.** (Enmienda 5; PA-12 es la del tester, por carga) El humano no respondió DH-9 o eligió (b) (entonces no se toca ninguno de los diez archivos y se reporta); o el remedio de T-05 exigiría algo distinto de las tres líneas de §D-4 (Enmienda 5) en cada archivo (por ejemplo, tocar un `hooks.ts`, un texto, la guarda de `isPending`, agregar una ref de la "Lista para CHORE-04", o llamar a `reset()` sin la condición `isError`); o un formulario de la tabla no tiene su guarda en la línea indicada o su mutación no expone `reset`; o, tras el remedio, alguna de las 11 rojas de T-05 sigue roja o cae una prueba que no está en CH3-C09 a CH3-C13.

**Reglas estáticas que se rompen sin darse cuenta (Enmienda 1, N-06).** Leen el texto crudo, también los comentarios. Antes de cada resumen, el programador las comprueba una por una y el resumen dice, por cada una, el comando o la búsqueda con que la verificó:
- `mensajeDelAvisoDeCalificar` no aparece, ni en comentarios, en ningún archivo de producción salvo `features/tareas/hooks.ts` y `features/tareas/lib.ts` (CAL-T-127): tampoco en `lib/errores-de-api.ts`, en `lib/errores-de-api-fuera-de-contrato.ts`, en `components/adjuntos/lib.ts` ni en ningún `data.ts`.
- `disabled`, `?? []`, `fetch(` y `console.` no aparecen, ni en comentarios, en `features/tareas/lib.ts`, `features/tareas/data.ts` ni `features/tareas/hooks.ts` (`entregas-01d-r3`, `entregas-01e-r1`, `entregas-01d-r2`, `entregas-01e-r2` y CAL-1C13), ni las palabras de §D-0.9 de esas pruebas.
- Ningún archivo de producción contiene U+2800 ni U+1D159 (literales o como escape), `Default_Ignorable_Code_Point`, `CARACTER_VISIBLE`, `contarCaracteresVisibles =`, `normalizarTextoLargo =` ni la expresión `\r\n|\r` escrita (CAL-T-99); la tabla común tampoco.
- `esErrorDeCursor` se define una sola vez, en `lib/errores-de-api.ts` (`refactor-01c-r1`); el alias de `calificaciones` es una asignación, no una definición, y nadie de `features/calificaciones` escribe `esErrorDeCursor(` (CAL-1D09).
- `features/calificaciones` sigue con once archivos de producción (CAL-1D09, CAL-T-182) y ninguno lee `.message`.
- Ningún tipo nuevo fuera de `types.ts` en los módulos (`ver-mas-01e-r3`, `tareas-01d-r3`): `TraduccionDeErrores` se importa con `import type` y solo se usa con `satisfies`.
- Ningún carácter invisible literal en la tabla, en `lib/errores-de-api.ts` ni en las pruebas nuevas (CH3-A24, N-02).

## No se toca
Base: `ad10844` fuera de los paquetes; dentro de `frontend/`, `ad10844` para 03a y el commit de la subentrega anterior para 03b y 03c. Fuera de esa verificación: `docs/trabajo/CHORE-03-errores-api/` y `docs/ESTADO.md` salvo su §2b.
- Todo `backend/`, `shared/`, `infra/`, `.env.example`.
- En `frontend/`, todo lo que "Cambios por capa" no nombra para la subentrega en curso. En particular: todos los `hooks.ts` de los módulos; `features/calificaciones/gradebook-view.tsx`, `mis-calificaciones-view.tsx` y sus componentes; `features/diagnostico/`; `src/app/`; `src/components/` salvo `components/adjuntos/lib.ts` (03a) y, solo si el humano lo autoriza en DH-6 (Enmienda 2), `components/adjuntos/adjuntos-de-publicacion.tsx` (03a, la guarda de §D-4); `src/services/` salvo `services/apiClient.ts` (03b, solo la exportación de §D-5). **Enmienda 4:** en 03b, y solo si el humano lo autoriza en DH-8, salen `features/clases/components/formulario-clase.tsx` y `features/clases/components/formulario-publicacion.tsx` (con (a) o (b)) y `features/clases/hooks.ts` (solo con (a)), en las líneas exactas de §D-4 (Enmienda 4); el resto de esos archivos sigue en "No se toca". **Enmienda 5:** en 03c, y solo si el humano lo autoriza en DH-9 (a), salen los diez archivos de la tabla de §D-4 (Enmienda 5) (`features/admin/components/formulario-invitar-maestro.tsx`, `formulario-invitacion-masiva.tsx`, `formulario-generar-enlace.tsx`, `formulario-corregir-correo.tsx`; `features/auth/components/formulario-login.tsx`, `formulario-registro.tsx`, `formulario-registro-maestro.tsx`, `formulario-recuperar.tsx`, `formulario-nueva-contrasena.tsx` y `formulario-cambiar-contrasena.tsx`), cada uno solo en sus tres líneas insertadas después de la guarda de `isPending`; el resto de esos archivos, `buscador-de-cuenta.tsx`, `ficha-de-cuenta.tsx` y todos los `hooks.ts` siguen en "No se toca".
- Toda prueba existente, salvo las reescrituras C-1 a C-4 (del tester) y las líneas N-L1 a N-L3 (del programador, en su subentrega).
- `docs/PRD.md`, `docs/ARCHITECTURE.md`, `docs/ARCHITECTURE-ESSENTIALS.md`, `docs/DESIGN.md` y `docs/ESTADO.md` §2b tal como quedaron tras la parte A: el orquestador los verifica por su SHA-256 (de §2b, el del texto de la sección, extraído con el método de la Enmienda 1, N-05, en "Notas para el orquestador"; de `PRD.md`, el recalculado tras M-02), no por el commit. `CLAUDE.md`, `AGENTS.md`, `README.md` y `.claude/` hasta el cierre (A-1 a A-3).

## Documentos a actualizar (al cerrar 03c)
- **`CLAUDE.md`, "Ubicaciones compartidas" (A-1, lo aplica el orquestador con su hash):**
  - Sustituir la viñeta de `lib/errores-de-api.ts` por la de la cita de abajo, tal cual (sin el `> ` inicial). **Enmienda 3 (detalle menor de la revisión de la Enmienda 2):** es el texto final, con DH-5 ya aplicado; sustituye la redacción anterior, que llevaba la instrucción de la Enmienda 2 dentro de la cita.
    > - `lib/errores-de-api.ts` — el contrato único de los errores de la API: `mensajeDeErrorDeApi` (acciones) y `mensajeDeErrorDeConsulta` (consultas: ante un `VALIDACION`, el texto fijo del lugar) sobre la `TraduccionDeErrores` de cada módulo; `quitarRutaDelMensaje` (la ruta, una vez, y el nombre de campo en camelCase que el esquema repite detrás; solo en `VALIDACION`), `textoVisibleOGenerico` (el genérico del módulo ante un texto sin caracteres visibles), `campoDeErrorDeApi`, `esErrorDeCursor(error, campos)`, `erroresDeFormularioDeApi` y `erroresPorCampo`. La tabla común de entradas fuera de contrato, que recorren las pruebas de cada función de traducción, vive en `lib/errores-de-api-fuera-de-contrato.ts` (solo la importan pruebas)
  - *Historial, no se aplica (Enmienda 3):* la redacción de la Enmienda 2 decía, desde la descripción de `quitarRutaDelMensaje` hasta el final: "… `quitarRutaDelMensaje` (una vez, solo en `VALIDACION`; Enmienda 2: el texto pasa a "(la ruta, una vez, y el nombre de campo en camelCase que el esquema repite detrás; solo en `VALIDACION`)"), `textoVisibleOGenerico` (el genérico del módulo ante un texto sin caracteres visibles), `campoDeErrorDeApi`, `esErrorDeCursor(error, campos)`, `erroresDeFormularioDeApi` y `erroresPorCampo`. La tabla común de entradas fuera de contrato, que recorren las pruebas de cada función de traducción, vive en `lib/errores-de-api-fuera-de-contrato.ts` (solo la importan pruebas)".
  - En la viñeta de `services/apiClient.ts`, sumar: "; exporta `CODIGOS_QUE_REDIRIGE_EL_CLIENTE` (los errores con que redirige), que importan los módulos para no avisar de ellos".
- **`CLAUDE.md`, "Manejo de errores en el frontend" (A-2, opcional, lo decide el humano). Enmienda 1: texto literal del manager, con un solo ajuste mío marcado.** Viñeta nueva al final de esa lista, después de "Subidas, descargas y manejadores asíncronos…":
  > - **Textos del servidor:** ningún mensaje de la API llega a la persona sin pasar por `lib/errores-de-api.ts`. Cada módulo declara su `TraduccionDeErrores` en `data.ts` y traduce las acciones con `mensajeDeErrorDeApi` y las consultas con `mensajeDeErrorDeConsulta` (ante un `VALIDACION`, el texto fijo del lugar); fuera de ese archivo nadie recorta `error.message`. Las pruebas de cada función de traducción recorren `ENTRADAS_FUERA_DE_CONTRATO` (`lib/errores-de-api-fuera-de-contrato.ts`). Excepciones: `features/diagnostico`, temporal, y `features/calificaciones`, cuyas consultas nunca muestran texto del servidor (el de "sin acceso" o el texto fijo del lugar).

  Ajuste mío: el manager escribió "Excepción: `features/diagnostico`, temporal." Con la decisión de M-01, `features/calificaciones` no declara `TraduccionDeErrores` ni usa `mensajeDeErrorDeConsulta`, así que la frase "Cada módulo declara…" no sería cierta sin nombrarlo. Si el humano prefiere el texto del manager tal cual, la viñeta queda con "Excepción: `features/diagnostico`, temporal." y `features/calificaciones` queda como una excepción no escrita.
- **`AGENTS.md`, regla "Todo plan con un formulario nuevo inventaría los `VALIDACION` fuera de contrato…" (A-3, opcional). Enmienda 1: texto literal del manager.** Insertar después de «lo escrito se conserva y el botón sale de la espera.» y antes de «Motivo:»:
  > Desde CHORE-03, la función de traducción del módulo es un envoltorio de `lib/errores-de-api.ts` y sus pruebas recorren además `ENTRADAS_FUERA_DE_CONTRATO` de `lib/errores-de-api-fuera-de-contrato.ts`.

  La misma frase va en `.claude/agents/arquitecto.md`, línea 27 (la regla "Formularios nuevos y `VALIDACION` fuera de contrato"), después de «…y el botón sale de la espera.» y antes de «Si el módulo ya tiene una función que traduce esos errores…». Motivo: CLASES-03 trae al menos tres formularios nuevos (duda, respuesta y editar recurso). Lo aplica el orquestador al cerrar 03c, con el SHA-256 de cada archivo en `aprobacion.md`.
- **`docs/ESTADO.md` §3 (el orquestador):** cerrar la fila "T-04 y T-05 de CALIFICACIONES-01c…" (incluye N-33, N-36, N-38, N-42, R-15 y N-46) con "Hecho en CHORE-03 (fecha)" y las cifras; dar destino a N-22 y a `formatearFechaDeClase` según la respuesta a R-06. Enmienda 3 (DH-7): el encargo pendiente **CHORE-04 · guardas de doble clic**, con la "Lista para CHORE-04" de "Puntos de ataque" (las 23 filas, con su ruta), lo registra el orquestador ya, no al cierre (lo pidió el humano el 2026-10-26); al cerrar 03b y 03c suma las filas "nuevo, para la lista de CHORE-04" que traigan los resúmenes (§D-6).
- **`CLAUDE.md`, "Formularios" (A-8, Enmienda 5, opcional, lo decide el humano al cerrar 03c).** Viñeta nueva al final de la lista de "### Formularios", después de la de `CampoContrasena`, tal cual (sin el `> ` inicial):
  > - Un formulario que muestra el error del servidor desde el estado de la mutación (`isError` con su `MensajeError`) lo limpia antes de validar en local, después de su guarda de envío: `if (mutacion.isError) mutacion.reset()`. Así la persona lee un solo mensaje, el del envío que acaba de hacer, nunca el `MensajeError` viejo junto al `ErrorDeCampo` nuevo. Si el error del servidor vive en el estado del formulario, la validación local lo reemplaza en el mismo estado (CHORE-03, T-05).

  Motivo: CLASES-03 y ADMIN-01 traen formularios nuevos, y T-05 fue un vecino de la regla "un solo aviso o un `ErrorDeCampo`, nunca ambos" que ningún plan había inventariado. Sin respuesta, no se aplica. Lo aplica el orquestador con el SHA-256 de `CLAUDE.md` en `aprobacion.md`, junto con A-1 y A-2.
- **`docs/ESTADO.md` §3 (el orquestador, Enmienda 5):** O-r1-5 con destino ADMIN-01; O-r1-6 con destino el `chore` de foco y navegación; O-22 en la "Lista para CHORE-04" (dos filas: `admin/components/tabla-enlaces.tsx:240` y `admin/components/registrados-del-enlace.tsx:71`, «Cargar más» con `enEspera={isFetchingNextPage}`). Con DH-9 (b), además, T-05 con destino CHORE-04 ("guardas y limpieza de envío") y 03c abierta.
- **`docs/DESIGN.md`:** sin cambios (ningún texto ni patrón nuevo, S-02). Si el humano veta S-02, el plan se enmienda con los textos por lugar, sus marcas "propuesta (CHORE-03)" y sus caminos de recuperación.

## Autorizaciones que pide el plan
- **A-1.** El texto de cierre de `CLAUDE.md` ("Ubicaciones compartidas"), aplicado por el orquestador al cerrar 03c, con su SHA-256 en `aprobacion.md`.
- **A-2 y A-3 (opcionales).** Los textos de `CLAUDE.md` ("Manejo de errores en el frontend") y de `AGENTS.md`. Sin respuesta, no se aplican. **Enmienda 1:** los textos literales están en "Documentos a actualizar" (los del manager; en A-2, con el ajuste de `features/calificaciones` marcado). A-3 incluye también `.claude/agents/arquitecto.md`, línea 27. El manager y yo recomendamos aprobar las dos.
- **A-4 (Enmienda 1):** sin cambio de alcance; N-L2 queda como estaba escrita y ahora coincide con la importación de §D-4 (M-01).
- **A-4.** El programador cambia solo las líneas N-L1 (03b), N-L2 (03b) y N-L3 (03c) de §D-R0.
- **A-5.** El tester reescribe en la ronda 0 de cada subentrega las `*.ataque` C-1 (03a), C-2 y C-3 (03b) y C-4 (03c), sin cambiar lo que protegen.
- **A-6 (Enmienda 2, DH-6).** Sacar `frontend/src/components/adjuntos/adjuntos-de-publicacion.tsx` de "No se toca" en 03a, solo para la guarda de `VistaDeFicha` (§D-4). Pendiente del humano; sin ella, PA-9. Enmienda 3: autorizada por el humano el 2026-10-26 (DH-6, sí).
- **A-7 (Enmienda 4, DH-8).** Sacar de "No se toca" en 03b `frontend/src/features/clases/components/formulario-clase.tsx` y `frontend/src/features/clases/components/formulario-publicacion.tsx` y, con la opción (a), `frontend/src/features/clases/hooks.ts`, solo en las líneas de §D-4 (Enmienda 4), para corregir T-03 y T-04. Pendiente del humano; sin ella, PA-11.
- **A-1 (ajuste de la Enmienda 2).** El texto de cierre de `CLAUDE.md` cambia solo en la descripción de `quitarRutaDelMensaje` (ver "Documentos a actualizar"); el resto de A-1, como lo aprobó el humano. Enmienda 3: el humano aceptó el cambio en DH-5 (2026-10-26); el texto final, completo y sin instrucciones dentro de la cita, está en "Documentos a actualizar".
- **A-8 (Enmienda 5, opcional).** La viñeta nueva de `CLAUDE.md` › "Formularios" (texto literal en "Documentos a actualizar"), aplicada por el orquestador al cerrar 03c con su SHA-256 en `aprobacion.md`. Sin respuesta, no se aplica. Recomiendo aprobarla.
- **A-9 (Enmienda 5, DH-9).** Sacar de "No se toca" en 03c los diez archivos de la tabla de §D-4 (Enmienda 5), solo en sus tres líneas, para corregir T-05. Pendiente del humano; sin ella, PA-13.

## Pasos de implementación
**03a**
0. Ronda 0 del tester: V-01 sobre las 204 `*.ataque` de la base; reescribe C-1 (A-5).
1. `src/lib/errores-de-api.ts`: `TraduccionDeErrores`, `quitarRutaDelMensaje`, `textoVisibleOGenerico`, `esErrorDeCursor` con `campos`, `mensajeDeErrorDeApi`, `mensajeDeErrorDeConsulta` (§D-1). No borrar `quitarPrefijoDeCampo`.
2. `src/lib/errores-de-api-fuera-de-contrato.ts` (§D-3).
3. `src/lib/errores-de-api.test.ts` (CH3-A01 a CH3-A07). `npm run test` del frontend.
4. `src/features/tareas/data.ts`: `TRADUCCION_DE_ERRORES_TAREAS` (con `import type`).
5. `src/features/tareas/lib.ts`: los envoltorios y las simplificaciones de §D-4 (sin N-46); borrar `PREFIJO_DE_RUTA` y la importación de `quitarPrefijoDeCampo`.
6. `src/components/adjuntos/lib.ts`: `avisoDeFalloAlSubir` (§D-4).
7. Las seis vistas de `tareas` con consultas: `mensajeDeConsultaTareas` en las líneas de §D-4.
8. Pruebas CH3-A08 a CH3-A24 (Enmienda 1: A21 a A24).
9. `npm run lint`, `npm run test` y `npm run build` del frontend (nunca a la vez que otra suite); resumen verificable con la matriz de §D-6 y la lista de hermanos (cada formulario y consulta de `tareas` de §D-4, uno por uno). Enmienda 1 (N-04 e): la lista nombra también `avisoDeRecargaFallidaAlEditar` (`tareas/lib.ts:246`) y `useAvisoDeRecargaFallida` como hermanos a los que el remedio no aplica (textos fijos, no leen el mensaje del servidor), y las verificaciones de "Reglas estáticas que se rompen sin darse cuenta" (PARADAS, Enmienda 1) una por una.

**03a · ronda 2 del programador (Enmienda 2), con el humano ya respondido en DH-6:**
10. T-01: `src/lib/errores-de-api.ts`, `CAMPO_QUE_REPITE_EL_ESQUEMA` y la forma nueva de `quitarRutaDelMensaje` (§D-1). `RUTA_DEL_MENSAJE` se queda escrita exactamente como está (`lib/errores-ch3-r1.ataque` y CH3-A20 leen ese literal); su comentario (hoy "Se quita una sola vez") pasa a decir que se quitan la ruta, una vez, y el nombre de campo que la sigue.
11. T-01: `src/lib/errores-de-api-fuera-de-contrato.ts`, `CON_CAMPO_REPETIDO` (§D-3), sumada a `ENTRADAS_FUERA_DE_CONTRATO` después de `DOS_PUNTOS_DENTRO`.
12. T-01: amplía CH3-A01 y CH3-A08 y crea CH3-A25.
13. T-02 (solo con DH-6 autorizada; si no, PA-9 y se salta este paso): `src/components/adjuntos/adjuntos-de-publicacion.tsx`, la guarda de `VistaDeFicha` (§D-4), y `src/components/adjuntos/descarga-ch3.test.tsx` con CH3-A26.
14. `npm run lint`, `npm run test` y `npm run build` del frontend, una suite a la vez. Las 9 pruebas rojas de la ronda 1 (T-01 × 6 y T-02 × 3) pasan sin tocarlas. Resumen verificable con: los hallazgos T-01 y T-02 uno por uno; los hermanos de T-01 (cada fila del inventario de §D-1, con su sub y si el remedio aplica ya en 03a por el contrato) y de T-02 (los controles de §D-4, con su ref); la matriz de §D-6 corregida en "en vuelo a la vez" con la ref de cada control; los estados vecinos de la guarda (primer clic, dos clics en vuelo, fallo, éxito, clic tras asentarse, vista desmontada); y las reglas estáticas de las PARADAS más `styles/clases-r1.ataque` (un `enEspera=` en el archivo) y `entregas-01e-r2.ataque`.

**03b**
0. Ronda 0 del tester: reescribe C-2 y C-3 (A-5).
1. `src/services/apiClient.ts`: la exportación de §D-5.
2. `src/features/tareas/data.ts` sin la constante; `src/features/tareas/lib.ts` la importa de `@/services/apiClient`.
3. `src/features/calificaciones/data.ts` (sin la constante) y `lib.ts` (alias del cursor e importaciones exactas de §D-4; Enmienda 1, M-01: sin envoltorio de la consulta ni `TRADUCCION_DE_ERRORES_CALIFICACIONES`).
4. `src/features/clases/data.ts` (`MENSAJES_POR_CODIGO_DE_CLASES`, `TRADUCCION_DE_ERRORES_CLASES`) y `lib.ts` (§D-4).
5. Las once vistas de `clases` con consultas: `mensajeDeConsultaClases`.
6. `src/lib/errores-de-api.ts`: borrar `quitarPrefijoDeCampo`.
7. N-L1 y N-L2 (A-4).
8. Pruebas CH3-B01 a CH3-B14 (Enmienda 1: B14).
9. `lint`, `test` y `build` del frontend; resumen con matriz y hermanos. Enmienda 3 (M-05): en la matriz, cada control de la "Lista para CHORE-04" que recorre 03b (filas 1 a 6 y 19 a 22) va como "sin ref; fuera del chore, CHORE-04", sin corregirlo (§D-6).

**03b · ronda 2 del programador (Enmienda 4), solo con DH-8 respondida (si no, PA-11 y se detiene):**
10. `src/features/clases/data.ts`: `CAMPOS_PINTADOS_DE_LA_CLASE` y `CAMPOS_PINTADOS_DE_LA_PUBLICACION`, y `TipoPublicacion` en la importación de tipos (§D-4, Enmienda 4).
11. `src/features/clases/lib.ts`: `erroresDeLaClaseDeApi` y `erroresDeLaPublicacionDeApi`, con sus importaciones (§D-4, Enmienda 4).
12. T-03: `src/features/clases/components/formulario-clase.tsx`, la importación (`:16`) y la llamada de `alFallar` (`:69`).
13. T-04: con DH-8 (a), `src/features/clases/components/formulario-publicacion.tsx` (importación `:23-29` y `:148`) y `src/features/clases/hooks.ts` (importación `:81-90`, `:613` y `:617`); con DH-8 (b), solo `formulario-publicacion.tsx` con la forma de respaldo de §D-4 (importación y el `catch` de `:145-151`).
14. Pruebas CH3-B15 a CH3-B17 en los tres archivos de 03b del programador (con la variante de CH3-B15 (4) y CH3-B16 (f) que corresponda a la opción de DH-8).
15. `npm run lint`, `npm run test` y `npm run build` del frontend, una suite a la vez. Las 4 pruebas rojas de la ronda 1 (T-03 × 2 y T-04 × 2) pasan sin tocarlas. Resumen verificable con: T-03 y T-04 uno por uno; los hermanos de "Enmienda 4" (los doce, uno por uno, con su destino); la matriz de §D-6 con las filas partidas por modo (Enmienda 4), incluidos "con la vista desmontada" y "en vuelo a la vez"; los estados vecinos del mecanismo (crear, editar, anuncio, material, el cambio de tipo después del aviso, la vista desmontada, repetir el envío y volver antes del `staleTime`); y las reglas estáticas de las PARADAS más las del punto 4 del inventario de la Enmienda 4 en §D-R0.

**03c**
0. Ronda 0 del tester: reescribe C-4 (A-5).
1. `src/features/admin/data.ts` (`TRADUCCION_DE_ERRORES_ADMIN`; "VALIDACION" fuera de su lista y su comentario al día) y `lib.ts` (`mensajeDeErrorAdmin` envoltorio, `mensajeDeConsultaAdmin`).
2. `components/tabla-enlaces.tsx:190` y `components/registrados-del-enlace.tsx:33`: `mensajeDeConsultaAdmin`.
3. `src/features/auth/data.ts` (`TRADUCCION_DE_ERRORES_AUTH`) y `lib.ts` (`mensajeDeErrorAuth` envoltorio).
4. N-L3 (A-4).
5. Pruebas CH3-C01 a CH3-C07 y, Enmienda 3 (M-04), CH3-C08.
6. `lint`, `test` y `build` del frontend; resumen con matriz y hermanos. Enmienda 1 (N-04 d): la lista de hermanos nombra las dos consultas de `auth` (`acceso-restringido-view.tsx:25` y `establecer-contrasena-view.tsx:44`), que quedan con `mensajeDeErrorAuth` (variante de acción) por S-08, con esa razón. Enmienda 3: los hermanos de M-04 son las cuatro rutas de la fila `id: id:` de §D-1 (tres acciones y una consulta), una por una con su salida; en la matriz, cada control de la "Lista para CHORE-04" que recorre 03c (filas 7 a 18) va como "sin ref; fuera del chore, CHORE-04", sin corregirlo (§D-6).
7. Cierre del encargo: el orquestador aplica A-1 (y A-2 y A-3 si el humano las aprueba) y actualiza `docs/ESTADO.md` §3.

**03c · ronda 2 del programador (Enmienda 5), solo con DH-9 respondida (si no, o con (b), PA-13 y se detiene).** El paso 7 (cierre) se ejecuta después del paso 12 y de la revisión final del manager; con A-8 aprobada, el orquestador la aplica junto con A-1 a A-3.
8. T-05 en `admin`: las tres líneas de §D-4 (Enmienda 5) en `formulario-invitar-maestro.tsx` (tras `:22`), `formulario-invitacion-masiva.tsx` (tras `:31`), `formulario-generar-enlace.tsx` (tras `:42`) y `formulario-corregir-correo.tsx` (tras `:28`).
9. T-05 en `auth`: las tres líneas en `formulario-login.tsx` (tras `:25`), `formulario-registro.tsx` (tras `:25`), `formulario-registro-maestro.tsx` (tras `:29`), `formulario-recuperar.tsx` (tras `:25`), `formulario-nueva-contrasena.tsx` (tras `:66`) y `formulario-cambiar-contrasena.tsx` (tras `:25`).
10. Correr solo los dos archivos del tester con las rojas (`npx vitest run src/features/admin/errores-ch3-r1.ataque.test.tsx` y luego `src/features/auth/errores-ch3-r1.ataque.test.tsx`, uno a la vez): las 11 de T-05 en verde sin tocarlas. Si alguna sigue roja, PA-13.
11. Pruebas CH3-C09 a CH3-C13 en `admin/formularios-ch3.test.tsx`, `auth/formularios-ch3.test.tsx` y `lib/errores-de-api-estatico.test.ts`.
12. `npm run lint`, `npm run test` y `npm run build` del frontend, una suite a la vez. Resumen verificable con: T-05 uno por uno en los once formularios; los hermanos de la Enmienda 5 ("Puntos de ataque": los de `admin` y `auth` sin secuencia, `BuscadorDeCuenta`, y los de `clases`, `tareas` y `calificaciones`, uno por uno, con su razón); la matriz de §D-6 con las filas de las secuencias (Enmienda 5) y los estados vecinos del mecanismo, cada uno con su caso; el `git diff 9272501e` de los diez archivos (exactamente tres líneas añadidas en cada uno, cero borradas); y las reglas estáticas de las PARADAS más las del punto 4 del inventario de la Enmienda 5 en §D-R0.

## Enmienda 1 (revisión del manager)
Fecha: 2026-10-26. Responde a `revision.md` (CAMBIOS REQUERIDOS). No cambia el alcance, las subentregas ni el contrato (§D-1 y §D-2 intactos). Cada cambio está marcado "Enmienda 1" en su lugar.

**Problemas que bloquean**
- **M-01 (decisión: no migrar `mensajeDeErrorCalificaciones`).** Sigo la recomendación del manager: la función ya cumple S-22 y su salida no cambia; no nace `TRADUCCION_DE_ERRORES_CALIFICACIONES` (su `generico` era un valor muerto). `features/calificaciones/lib.ts` importa exactamente `import { campoDeErrorDeApi, esErrorDeCursor } from "@/lib/errores-de-api"`, que es lo que pide N-L2 sin cambiarla. Tocado: §D-4 "`features/calificaciones`" (importaciones exactas y `data.ts`), §D-R0 N-L2 (nota), Alcance punto 3, Cambios por capa 03b, Pasos 03b paso 3, CH3-B06, A-4 y PA-8 nueva.
- **M-02.** `docs/PRD.md` RN-10, cuarta viñeta, dice ahora lo mismo que RF-71 (temas con nombre y orden, categorías ponderadas, de uno a dos maestros, nombre editable, duplicar una archivada y la copia nace activa). Fila 47 de la parte A. El orquestador recalcula el SHA-256 de `PRD.md` en `aprobacion.md`.
- **M-03.** S-06 (b) se parte: (b1) "repetir el control" de los dos "Ver más" con toast entra (CH3-A21, entregas; CH3-A22, hilo, también con el cursor que el hilo no reconoce); (b2) los caminos de navegación de las consultas que reemplazan la vista se difieren al `chore` de foco y navegación, con su lista de consultas, como DH-2, que el humano confirma. Tocado: S-06, Alcance ("No entra"), §D-4 (vistas de `tareas`, el cursor del hilo), Pruebas 03a, Puntos de ataque y "Decisiones para el humano".

**Otros puntos**
- **S-01 (N-03):** quité la petición que el registro no tiene; pasa a DH-1 con mi recomendación y la del manager.
- **A-2 y A-3:** textos literales del manager en "Documentos a actualizar" (A-3 también en `.claude/agents/arquitecto.md`, línea 27); en A-2, un ajuste marcado: la excepción de `features/calificaciones`, que con M-01 no declara `TraduccionDeErrores`. DH-3.
- **N-01:** `ENTRADAS_DE_FORMULARIO.ruta` pasa a `archivoIds.0.id: …` (tres niveles) y la ruta se suma a `RUTAS_FUERA_DE_CONTRATO`; en las convenciones es F4.
- **N-02:** los invisibles de §D-3 y de las pruebas (Convenciones, CH3-A02, CH3-A15, CH3-B08, Puntos de ataque) quedan como escapes `\u{…}`; CH3-A24 nueva lo comprueba en la tabla, el contrato y las pruebas nuevas.
- **N-03:** ver S-01.
- **N-04:** (a) descarga del muro en CH3-B08; (b) la solicitud de subida en interfaz, CH3-A23 (crear tarea y entregar) y CH3-B14 (publicar en el muro); (c) `avisoDeFalloAlSubir` de `clases` en CH3-B01; (d) las dos consultas de `auth` como hermanas en S-08 y en el paso 6 de 03c; (e) `avisoDeRecargaFallidaAlEditar` y `useAvisoDeRecargaFallida` como hermanos sin remedio en el paso 9 de 03a.
- **N-05:** método de extracción del hash de §2b en "Notas para el orquestador" y en "No se toca".
- **N-06:** lista "Reglas estáticas que se rompen sin darse cuenta" junto a las PARADAS, que el resumen verifica una por una.
- **N-07:** el borde "14:30 …" va a "Decisiones tomadas que no son hallazgo".
- **N-08:** en `docs/ESTADO.md` §2b, "1b." pasa a sub-viñeta del punto 1 con la etiqueta "1b" y sin renumerar (fila 48). La frase desfasada de §2 sigue siendo del orquestador.

**Secciones del plan tocadas:** Parte A (filas 47 y 48, notas), Decisiones para el humano (nueva), Suposiciones (S-01, S-06, S-07, S-08), Alcance, §D-3, §D-4 (`tareas` y `calificaciones`), §D-R0 (N-L2), Cambios por capa (03b), Pruebas requeridas (Convenciones, A02, A15, A21 a A24, B01, B06, B08, B14), Puntos de ataque, PARADAS (PA-8 y reglas estáticas), No se toca, Documentos a actualizar, Autorizaciones y Pasos (03a 8 y 9, 03b 3 y 8, 03c 6).

## Enmienda 2 (ronda 1 del tester en 03a)
Fecha: 2026-10-26. Responde a `reporte-tester.md`, "## Ronda 1 — 03a" (ROTO: T-01 media, T-02 baja), con `resumen-programador-03a.md` y la verificación del manager (`revision.md`, "## Verificación del resumen — 03a — primera entrega") a la vista. No cambia el alcance, las subentregas, el orden de pasos de §D-1 ni S-01 a S-04 y S-06 a S-13. Cada cambio está marcado "Enmienda 2" en su lugar. Estado: **BLOQUEADO solo por DH-6**; con la respuesta, LISTO.

### T-01 — rutas dobles del servidor: remedio en el contrato (opción c)
**Verificación propia.** `validarCuerpo` y `validarParametros` (`backend/src/handlers/validacion.ts:18` y `:29`) responden `${path.join(".")}: ${message}`. En `shared/src/` busqué los mensajes que empiezan con "`palabra`:" (literales y con plantilla): los traen los esquemas de los ids (`archivoId`, `tareaId`, `alumnoId`, `claseId`, `temaId`, `publicacionId`, `comentarioId`, `maestroId`, `categoriaId`), `confirmar` y `tema`. El inventario completo, con su subentrega y su salida, está en §D-1, "Rutas dobles del servidor". En 03a se alcanzan `archivoId` (las tres descargas) y `confirmar` (borrar); `tareaId`, `alumnoId` y `claseId` ya dan su texto fijo, porque `campoDeErrorDeApi` lee el primer prefijo. En 03b se alcanzan, además, rutas dobles con **distinto** primer y segundo prefijo: `temaIds.<i>: temaId:`, `maestroIds.<i>: maestroId:` y `categorias.<i>.id: categoriaId:`. En 03c, ninguna.

**Opciones.**
- (a) Quitar también la ruta si lo que sigue es **la misma** ruta. Cubre 03a, pero no las tres rutas dobles distintas de 03b: obligaría a otra enmienda del contrato en 03b. Descartada por incompleta.
- (b) Textos fijos por campo en `textosPorCampo` (`archivoId`, `confirmar`…). Crea textos nuevos (S-02, `DESIGN.md` §9 y sus caminos de recuperación), hay que enumerarlos en cada módulo y tampoco cubre `temaIds.0` ni `categorias.0.id`, porque `campoDeErrorDeApi` no reconoce rutas con puntos. Descartada.
- Cambiar `shared/` o el backend para que el esquema no repita su campo es la causa, pero está en "No se toca" y fuera del chore. Queda como recomendación (R-08).
- Dar el genérico ante una ruta doble pierde el texto del servidor y hace que §D-2 dependa del número de prefijos. Descartada.
- **(c) Elegida:** quitar la ruta, una vez, y, solo si había ruta, un nombre de campo en camelCase que la siga (`^[a-z][A-Za-z0-9]*:\s*`), una vez (§D-1, S-05). Es una regla determinista de dos líneas en el único lugar que ya recorta. Cubre el inventario de las tres subentregas y no cambia ninguna salida que fije una prueba existente (§D-R0, Enmienda 2, punto 1): "x: Nota: algo", "Debe ser 0: 10", "14:30 no es válido", "Valor: 10" y 'Unrecognized key: "nota"' siguen igual. `RUTA_DEL_MENSAJE` y `campoDeErrorDeApi` no cambian.

**Dónde aplica.** En 03a: el programador lo corrige en la ronda 2 (pasos 10 a 12). 03b y 03c lo heredan por el contrato; CH3-B01 suma los hermanos de `clases` que anotó el tester.

### T-02 — doble clic en «Descargar»: entra en 03a (opción a), con DH-6
**Recomendación: (a).** El remedio es una ref en un solo componente (`VistaDeFicha`) y cubre las dos fichas y los cuatro sitios que la usan (§D-4). Diferirlo no sirve:
- Las tres pruebas rojas del tester no las toca el programador, y ninguna prueba se desactiva para que pase (`AGENTS.md`, "Pruebas"). 03a no puede cerrarse en verde mientras sigan rojas.
- Un carril trivial no aplica, porque cambia el comportamiento (una petición en lugar de dos).
- Mandarlo al `chore` de foco y navegación (después de ADMIN-01) dejaría 03a abierta varios encargos.
- La propia matriz de 03a declaró la guarda "sin cambio" (§D-6). La regla de hermanos se cumplió en lo que 03a toca: «Descargar» es el único control con mutación sin ref (§D-4).

**Si el humano elige (b), diferir:** el plan se enmienda de nuevo. Las tres pruebas de T-02 quedan como las decida el manager (mi lectura es que siguen en la suite y 03a espera al encargo que lleve el remedio). El destino sería un encargo propio en carril normal, con su plan y la misma guarda.

### Decisiones para el humano (Enmienda 2)
| # | Pregunta | Recomendación del arquitecto | Si se elige la otra opción |
|---|---|---|---|
| DH-5 (T-01, cambia S-05, que aprobaste) | ¿Aceptas que el contrato quite, además de la ruta, el nombre de campo en camelCase que el esquema de `shared/` repite detrás ("archivoId: archivoId: debe ser un identificador válido" → "debe ser un identificador válido"), como máximo dos prefijos? No bloquea: sin veto, la ronda 2 la aplica | Sí: cubre las rutas dobles de 03a, 03b y 03c con una sola regla y no cambia nada de lo que ya fijan las pruebas | (a) solo la misma ruta repetida: 03b necesitará otra enmienda para `temaIds.<i>: temaId:`, `maestroIds.<i>: maestroId:` y `categorias.<i>.id: categoriaId:`. (b) textos por campo: textos nuevos en `data.ts`, `DESIGN.md` y sus caminos de recuperación |
| DH-6 (T-02, **bloquea**) | ¿Autorizas que, en 03a, `frontend/src/components/adjuntos/adjuntos-de-publicacion.tsx` salga de "No se toca" solo para agregar la guarda síncrona con ref al botón «Descargar» (`VistaDeFicha`), con su prueba CH3-A26? | Sí: un cambio de una ref en un solo componente; sin él, 03a no cierra en verde | Se difiere a un encargo aparte (carril normal); el manager decide qué pasa con las tres pruebas rojas de T-02, y 03a no se cierra hasta que llegue el remedio |

### Cambios por sección (Enmienda 2)
- **Encabezado:** estado BLOQUEADO por DH-6.
- **Preguntas bloqueantes:** DH-6, con su pregunta exacta.
- **Suposiciones:** S-05 (la regla del nombre repetido).
- **Alcance:** punto 1.
- **§D-1:** el código de `quitarRutaDelMensaje` con `CAMPO_QUE_REPITE_EL_ESQUEMA`, y el inventario "Rutas dobles del servidor".
- **§D-2:** la nota de la fila "Debe ser 0: 10" y dos filas nuevas (ruta doble, con mensaje y sin texto visible).
- **§D-3:** `CON_CAMPO_REPETIDO` (tres entradas con rutas que nadie pinta; `ClaseFueraDeContrato` no cambia).
- **§D-4:** la fila de `mensajeDeErrorTareas` (cambio visible); la guarda de `adjuntos-de-publicacion.tsx` con sus hermanos.
- **§D-6:** "en vuelo a la vez" nombra la ref de cada control; la fila de la descarga.
- **§D-R0:** el inventario de la Enmienda 2 (lista cerrada vacía: ninguna prueba existente cambia).
- **Cambios por capa (03a):** lo de la ronda 2.
- **Pruebas requeridas:** CH3-A01 y CH3-A08 ampliadas; CH3-A25 y CH3-A26 nuevas (`it.each` sobre el inventario y sobre las fichas, como pidió el humano); CH3-B01 y CH3-B08 (03b) con los hermanos.
- **Puntos de ataque:** dos viñetas (T-01 y T-02, con sus decisiones que no son hallazgo).
- **Riesgos:** R-07 y R-08.
- **PARADAS:** PA-9 y PA-10.
- **No se toca:** la excepción de DH-6.
- **Documentos a actualizar:** el texto de `quitarRutaDelMensaje` en A-1.
- **Autorizaciones:** A-6 (DH-6) y la nota de A-1.
- **Pasos de implementación:** 03a, pasos 10 a 14 (ronda 2).

`docs/DESIGN.md` no cambia: no hay texto ni patrón visual nuevo (la guarda es técnica y los restos son texto del servidor, S-02).

## Enmienda 3 (revisión de la Enmienda 2 y decisiones DH-5 a DH-7)
Fecha: 2026-10-26. Responde a `revision.md`, "## Revisión de la Enmienda 2 — CHORE-03" (APROBADO CON OBSERVACIONES: M-04, M-05 y dos detalles menores), y a `aprobacion.md`, "Decisiones del humano a la Enmienda 2": DH-5 sí, DH-6 sí, DH-7 = opción (b) del manager. Estado: **LISTO**, sin preguntas nuevas. Cada cambio está marcado "Enmienda 3" en su lugar. **No toca nada de 03a** (la ronda 2 corre en paralelo): ni el código ni las expresiones de §D-1, ni §D-3, ni §D-4 de `tareas` y `adjuntos`, ni "Pruebas requeridas › 03a", ni los pasos 10 a 14. El contrato no cambia.

### M-04 — la ruta doble `id: id:` del administrador (03c)
Verificación propia: en `backend/src/handlers/admin.ts:60`, `parametrosIdSchema = z.object({ id: z.uuid("id: debe ser un identificador válido") })`, y `validarParametros(parametrosIdSchema, …)` en `:116`, `:138`, `:183` y `:200` (las rutas de `:112`, `:137`, `:179` y `:196`). Una búsqueda de `z.*("<camelCase>: …")` en todo `backend/src/` da solo ese esquema: los demás mensajes con "palabra:" son de un solo prefijo (`cuerpo:`, `claseId:` de `middleware/pertenencia.ts:32`, los `cursor:` de `adapters/db`). Coincide con el inventario del manager. La regla de S-05 ya lo cubre; lo que faltaba era la fila, el caso y R-08.

### M-05 — "sin ref" en 03b y 03c, con DH-7 = (b)
Los controles que solo se protegen con `isPending` quedan fuera del chore, con destino **CHORE-04 · guardas de doble clic**. §D-6 dice qué hace el programador (lo declara y lo nombra como hermano con ese destino, sin corregirlo), y "Puntos de ataque" dice qué hace el tester (observación, sin prueba roja). Al repetir la búsqueda del manager salen 4 controles más en `features/clases` (03b) y uno en `app/` (fuera del chore): S-14 supone que DH-7 aplica a toda la clase. La lista completa, con 23 filas, está en "Puntos de ataque", "Lista para CHORE-04", para que el orquestador la copie a `docs/ESTADO.md`.

### Detalles menores
- (a) El texto de A-1 para `CLAUDE.md` queda como viñeta final completa y literal, con DH-5 aplicado; la redacción anterior queda como historial marcado "no se aplica".
- (b) "Preguntas bloqueantes" dice primero que no queda ninguna abierta (DH-6 respondida sí el 2026-10-26) y marca "Ninguna" como del plan original y la Enmienda 1.

### Cambios por sección (Enmienda 3)
- **Encabezado:** una línea nueva después de la nota de DH-6 (las líneas 2 y 3 no cambian).
- **Preguntas bloqueantes:** el estado (ninguna abierta), "Ninguna" marcada como historial y la nota de DH-5 y DH-7 respondidas.
- **Suposiciones:** S-05 (una frase de M-04 al final, sin cambio de regla) y S-14 nueva.
- **§D-1:** solo el inventario "Rutas dobles del servidor": la fila `id: id:` (03c) y la frase de 03c, tachada y corregida.
- **§D-6:** el párrafo de M-05.
- **§D-R0:** el inventario de la Enmienda 3 (lista cerrada vacía).
- **Pruebas requeridas › 03c:** CH3-C08 nueva.
- **Puntos de ataque:** dos viñetas (M-04 y M-05) y la "Lista para CHORE-04".
- **Riesgos:** R-08, una frase.
- **Documentos a actualizar:** el texto final de A-1 y el registro de CHORE-04 en `docs/ESTADO.md`.
- **Autorizaciones:** A-6 (autorizada) y la nota de A-1 (DH-5).
- **Pasos de implementación:** 03b paso 9, y 03c pasos 5 y 6.

### Lo que el orquestador hace ahora
- Registrar en `docs/ESTADO.md` el encargo pendiente CHORE-04 con la "Lista para CHORE-04" (23 filas) y la recomendación del manager (carril normal, inventario propio y una regla estática en todo `src/`).
- Llevar al humano, sin bloquear, la extensión de S-14: los cuatro controles de `features/clases` y el de `app/require-rol.tsx` que no estaban entre los 18.

## Enmienda 4 (ronda 1 del tester en 03b)
Fecha: 2026-10-27. Responde a `reporte-tester.md`, "## Ronda 1 — 03b" (ROTO: T-03 y T-04, media), con `resumen-programador-03b.md` (matriz de `clases`), `revision.md` ("## Verificación del resumen — 03b — primera entrega", O-15) y `aprobacion.md` ("## 03b · arranque" en adelante) a la vista. Copia del plan antes de esta enmienda: `copias-plan/plan-chore03-antes-enmienda4-ee08bf2a.md` (la guardó el orquestador). Estado: **BLOQUEADO solo por DH-8**; con la respuesta, LISTO. Cada cambio está marcado "Enmienda 4" en su lugar. **No toca nada de 03a** (cerrada) ni los pasos 0 a 9 de 03b: solo suma la ronda 2 (pasos 10 a 15). El contrato de `lib/errores-de-api.ts` no cambia.

### T-03 y T-04 — la lista de campos pintados no dependía del modo
**Verificación propia en el código** (en `1f11d38e`; ni estos archivos ni `hooks.ts` cambiaron en la ronda 1):
- **T-03.** `formulario-clase.tsx:68-75`: `alFallar` llama a `erroresDeFormularioClases(error, ["nombre", "descripcion", "maestroIds"])` en los dos modos; `errores.maestroIds` solo lo pinta `SelectorDeMaestros` (`selector-de-maestros.tsx:74`), que se monta con `modo === "crear"` (`formulario-clase.tsx:158-165`). `useCrearClase` y `useEditarClase` (`hooks.ts:156-184`) no tienen `onError`: el formulario es el único que decide, así que el remedio no toca `hooks.ts`.
- **T-04.** `useCrearPublicacion.onError` (`hooks.ts:613-619`) calla si `erroresDeFormularioClases(error, ["titulo", "texto"])` no es `null`; el `catch` de `handlePublicar` (`formulario-publicacion.tsx:144-151`) guarda `errores.titulo`; el título y su `ErrorDeCampo` solo se pintan con `esMaterial` (`:232-248`). El gancho y el formulario coinciden entre sí, pero no con lo que se pinta. Un efecto más que el reporte no menciona: el error queda guardado y aparece bajo el título al pulsar «Material» (CH3-B16 (e)).

**Remedio (mínimo, en el espíritu del chore).** La lista de campos pintados pasa a depender del modo y vive una sola vez, en `data.ts` (`CAMPOS_PINTADOS_DE_LA_CLASE`, `CAMPOS_PINTADOS_DE_LA_PUBLICACION`), leída por dos funciones de `lib.ts` (`erroresDeLaClaseDeApi(error, modo)`, `erroresDeLaPublicacionDeApi(error, tipo)`), como `erroresDelTemaDeApi` y `erroresDeLaTareaDeApi`: el formulario y su gancho deciden con la misma función y con el modo de lo enviado. En los modos que pintan todo (crear, material) la salida es la de siempre. Forma exacta, archivos y líneas en §D-4 (Enmienda 4).
- **Por qué funciones en `lib.ts` y no solo la constante:** CH3-B15 prueba la decisión por modo sin montar nada, y la regla estática de CH3-B15 (4) impide que vuelva una lista literal fuera de `data.ts`.
- **Por qué se toca `hooks.ts` (DH-8 (a)):** el gancho de la publicación decide si avisa y solo él conoce lo enviado cuando la vista ya no está (T-30 de CLASES). Sin tocarlo, el formulario tiene que compensar su silencio (DH-8 (b)), con la decisión en dos sitios. El cambio en `hooks.ts` es una importación y dos líneas de `useCrearPublicacion`; ningún otro gancho.
- **Descartado:** cambiar `erroresDeFormularioClases` (su firma la fijan CH3-B04, PR-1C02 y `refactor-01c-r1`); dar el genérico a todo `VALIDACION` de un campo no pintado (pierde el texto del servidor, contra §D-2); pintar `maestroIds` al editar o `titulo` en un anuncio (texto y patrón nuevos, S-02, y el servidor no los acepta en esos modos).

### Hermanos inventariados (otros formularios cuya lista de campos podría depender del modo)
Búsqueda: `erroresDeFormularioClases|erroresDe\w*DeApi|errorDe\w*DeApi|errorDelCampo\w*|CAMPOS_` en producción de `features/` y, por cada acierto, qué pinta el formulario en cada modo.

| # | Formulario (archivo) | ¿Modos? | ¿El patrón aplica? | Destino |
|---|---|---|---|---|
| 1 | Crear y editar clase (`clases/components/formulario-clase.tsx:69`) | crear, editar | Sí (T-03) | Esta enmienda |
| 2 | Publicar anuncio o material (`clases/components/formulario-publicacion.tsx:148`, `clases/hooks.ts:617`) | anuncio, material | Sí (T-04) | Esta enmienda |
| 3 | Comentar en el muro (`clases/components/formulario-comentario.tsx:46`, `clases/hooks.ts:681`, `["texto"]`) | No | No: `texto` siempre se pinta | Ninguno |
| 4 | Crear y renombrar un tema (`erroresDelTemaDeApi`: `clases/components/formulario-tema.tsx:51`, `clases/hooks.ts:800` y `:824`) | crear, renombrar | No: los dos modos pintan `nombre` (`formulario-tema.tsx:86-99`) | Lo fija CH3-B16 |
| 5 | Unirse a una clase (`errorDelCampoCodigo`, `clases/components/formulario-unirse-clase.tsx:50`) | No | No: `codigo` siempre se pinta | Ninguno |
| 6 | Editor de categorías (`erroresDeCategoriasDeApi`: `clases/components/editor-de-categorias.tsx:143` con las llaves enviadas, `clases/hooks.ts:936` con `[]`) | No | No: la fila o, fuera de rango, la lista, que siempre se pinta; el tester comprobó que gancho y editor deciden igual en 25 entradas | Ninguno |
| 7 | Controles sin campos de `clases` (CH3-B08) | — | No: no asocian errores a campos | Ninguno |
| 8 | Crear y editar tarea (`erroresDeLaTareaDeApi` con `CAMPOS_DEL_FORMULARIO`: `tareas/components/formulario-tarea.tsx:235`, `tareas/hooks.ts:169` y `:192`) | crear, editar | No: los dos modos pintan los ocho campos (categoría y tema siempre, `formulario-tarea.tsx:353-406`; "cómo se entrega", `:411-461`; la rúbrica con `EditorDeRubrica`, `:508`, y una fila fuera de rango pasa a `rubrica`, T-10, `tareas/lib.ts:250-288`) | Ninguno (03a cerrada) |
| 9 | Entregar con y sin adjuntos requeridos (`errorDeEnlacesDeApi`: `tareas/components/formulario-de-entrega.tsx:143`, `tareas/hooks.ts:367`) | Un solo formulario | No: `CampoDeEnlaces` se pinta siempre (`formulario-de-entrega.tsx:200-206`) | Ninguno (03a cerrada) |
| 10 | Calificar con y sin rúbrica (`erroresDeCalificacionDeApi(error, criteriosEnviados)`: `tareas/components/panel-de-calificacion.tsx:112`, `tareas/hooks.ts:501`) | con rúbrica, sin rúbrica | Ya depende del modo: `calificacion` con rúbrica y una posición fuera del envío dan `null` y el gancho avisa con `mensajeDelCampoDeCalificacion` (T-02 de CALIFICACIONES-01c) | Ninguno (03a cerrada) |
| 11 | Hilo privado (`errorDeTextoDeApi`: `tareas/components/hilo-privado.tsx:56`, `tareas/hooks.ts:428`) | No | No: `texto` siempre se pinta | Ninguno |
| 12 | Formularios de `admin` y `auth` (03c) | Algunos (`formulario-nueva-contrasena.tsx`: restablecer y establecer; registro de estudiante y de maestro) | Hoy no: no asocian un `VALIDACION` del servidor a ningún campo (todo va al `MensajeError`; `erroresPorCampo` de `auth` y `erroresPorCampoAdmin` solo leen la validación local) | Punto de ataque de 03c (Enmienda 4) |

Solo 1 y 2 entran. Coincide con los hermanos que revisó el tester (comentario, tema, unirse y categorías).

### Decisiones para el humano (Enmienda 4)
| # | Pregunta | Recomendación del arquitecto | Si se elige la otra opción |
|---|---|---|---|
| DH-8 (T-03 y T-04, **bloquea**) | ¿Autorizas sacar de "No se toca" en 03b `formulario-clase.tsx` y `formulario-publicacion.tsx` y, con la opción (a), `features/clases/hooks.ts` (solo `useCrearPublicacion`), en las líneas de §D-4 (Enmienda 4)? Texto exacto en "Preguntas bloqueantes" | (a): un solo lugar decide por el gancho y el formulario, también con la vista desmontada; el cambio en `hooks.ts` es una importación y dos líneas | (b): sin `hooks.ts`; el formulario avisa cuando el gancho calló, con la decisión en dos sitios. Ninguna: las cuatro rojas siguen y 03b no cierra hasta un encargo aparte |

### Cambios por sección (Enmienda 4)
- **Encabezado:** estado BLOQUEADO por DH-8 (una línea nueva; las de las Enmiendas 2 y 3 no cambian).
- **Preguntas bloqueantes:** DH-8, con sus dos opciones, antes del historial.
- **§D-2:** dos filas nuevas ("campo que el formulario pinta en otro modo") y el párrafo "Campo pintado se decide por el modo de lo que se envió".
- **§D-4 (`features/clases`):** tres filas en la tabla y la forma exacta del remedio, archivo por archivo, con la variante (b).
- **§D-6:** las filas de la matriz partidas por modo, "con la vista desmontada" y "en vuelo a la vez".
- **§D-R0:** el inventario de la Enmienda 4 (lista cerrada vacía).
- **Cambios por capa (03b):** lo de la ronda 2.
- **Pruebas requeridas (03b):** CH3-B15, CH3-B16 y CH3-B17.
- **Puntos de ataque:** una viñeta (03b ronda 2 y 03c).
- **Riesgos:** R-09.
- **PARADAS:** PA-2 (la excepción de DH-8 (a)) y PA-11.
- **No se toca:** la excepción de DH-8.
- **Autorizaciones:** A-7.
- **Pasos de implementación:** 03b, pasos 10 a 15 (ronda 2).

`docs/DESIGN.md` no cambia: ningún texto ni patrón nuevo (el aviso es el toast de siempre con el texto del servidor o el genérico, S-02).

## Enmienda 5 (ronda 1 del tester en 03c)
Fecha: 2026-10-27. Responde a `reporte-tester.md`, "## Ronda 1 — 03c" (ROTO: T-05, media, con 11 pruebas rojas; O-r1-4 a O-r1-7), con `resumen-programador-03c.md` (matriz de `admin` y `auth`), `revision.md` ("## Verificación del resumen — 03c — primera entrega", O-20 a O-24) y `aprobacion.md` ("## 03c · arranque" en adelante) a la vista. Copia del plan antes de esta enmienda: `copias-plan/plan-chore03-antes-enmienda5-eab43ac5.md` (la guardó el orquestador). Estado: **BLOQUEADO solo por DH-9**; con (a), LISTO. Cada cambio está marcado "Enmienda 5" en su lugar. **No toca nada de 03a ni de 03b** (cerradas) ni los pasos 0 a 6 de 03c: solo suma la ronda 2 (pasos 8 a 12) y una nota antes de ellos sobre cuándo corre el paso 7. El contrato de `lib/errores-de-api.ts` no cambia.

### T-05 — el `MensajeError` del envío anterior seguía junto al error local del siguiente
**Verificación propia en el código** (en `9272501e`; ninguno de estos archivos cambió en 03c):
- En los diez archivos, el `MensajeError` se pinta con `<m>.isError` (por ejemplo, `formulario-invitar-maestro.tsx:47`, `formulario-login.tsx:48-53`, `formulario-nueva-contrasena.tsx:104-106`), y el manejador, ante un rechazo local, solo hace `setErrores(…)` (o `setError`, `setErrorConfirmacion`) y sale (`formulario-invitar-maestro.tsx:30-33`, `formulario-invitacion-masiva.tsx:34-37`, `formulario-nueva-contrasena.tsx:77-86`, `formulario-cambiar-contrasena.tsx:31-40`…). Nadie limpia el estado de la mutación cuando el envío no llega al servidor, así que el `MensajeError` viejo y el `ErrorDeCampo` nuevo quedan a la vez.
- `BuscadorDeCuenta` (`buscador-de-cuenta.tsx:31-37`) ya llama a `buscar.reset()` en esa rama (T-05 de AUTH-02 r2): por eso el tester lo usó de control en verde.
- Los once formularios son diez archivos: restablecer y establecer contraseña comparten `formulario-nueva-contrasena.tsx` (el séptimo de `auth` que nombra el tester es "establecer contraseña (invitación)").
- Previo al chore (igual en `ad10844`), pero es la misma regla que el chore aplica ("un solo aviso o un `ErrorDeCampo`, nunca ambos") llevada al envío siguiente, en los dos módulos de 03c. Mismo caso que T-02 en 03a y T-03 y T-04 en 03b: el remedio está en archivos de "No se toca" y necesita autorización (DH-9).

**Remedio (mínimo y uniforme).** Una línea por archivo, con su comentario, justo después de la guarda de `isPending`: `if (<m>.isError) <m>.reset()`. Forma, archivos, líneas y por qué en §D-4 (Enmienda 5); la regla en §D-2 (Enmienda 5). Cumple lo que pide el encargo:
- (a) No toca ningún `hooks.ts`: los diez ganchos devuelven `useMutation` sin envolver y ya exponen `reset`.
- (b) No cambia la salida del camino feliz ni la del error del servidor: en el camino válido, `mutate` ya quitaba el `MensajeError`; con la condición `isError`, el texto de éxito tampoco cambia (CH3-C12 lo fija).
- (c) Deja en verde las 11 rojas sin tocarlas: tras el rechazo local no queda `role="alert"`, queda un `aria-invalid` y el texto del servidor sale de la pantalla (lo que piden `admin/errores-ch3-r1.ataque.test.tsx:703-706` y `auth/errores-ch3-r1.ataque.test.tsx:580-583`).
- (d) Respeta las guardas: va después de `if (<m>.isPending) return`, que no cambia, y no agrega ninguna ref (filas 7 a 10 y 12 a 17 de la "Lista para CHORE-04").

**Descartado:** limpiar al cambiar un campo (un `onChange` por campo en formularios no controlados, y cambia el camino del error del servidor); `reset()` sin condición (borra también el texto de éxito de invitar y de corregir, un cambio que T-05 no pide); un gancho común que limpie solo (toca los `hooks.ts`, PA-2, y es un refactor de dos módulos).

### Hermanos inventariados
Búsqueda: `.isError` en todo el código de producción de `frontend/src/` (los `MensajeError` que leen el estado de una mutación existen solo en `admin` y `auth`) y `safeParse(` en los componentes de `admin`, `auth`, `clases` y `tareas` (dónde se valida en local y dónde queda el error del servidor). Resultado, uno por uno, en "Puntos de ataque" (Enmienda 5):

| # | Control | ¿El patrón aplica? | Destino |
|---|---|---|---|
| 1 | Los once formularios de la tabla de §D-4 (Enmienda 5) | Sí (T-05) | Esta enmienda, con DH-9 (a) |
| 2 | Buscar una cuenta (`admin/components/buscador-de-cuenta.tsx:34`) | Ya resuelto (`buscar.reset()`) | Ninguno; no se toca |
| 3 | «Sí, restablecer» de la ficha (`ficha-de-cuenta.tsx:97` y `:123`) y «Sí, revocar» (`tabla-enlaces.tsx:135`) | No: sin validación local | Ninguno (O-r1-5, otro defecto, va a ADMIN-01) |
| 4 | «Cerrar sesión» (`formulario-cambiar-contrasena.tsx:99`, `acceso-restringido-view.tsx:72`) y las consultas de `auth` (S-08) | No: sin `MensajeError` de envío | Ninguno |
| 5 | Formularios de `clases` (clase, publicación, comentario, tema, unirse, categorías) | No: el error del servidor de un campo vive en el mismo `errores` que la validación local reemplaza; los demás son avisos | Ninguno (03b cerrada, sin cambio) |
| 6 | Formularios de `tareas` (tarea, calificación, hilo privado, entrega) | No: un solo `errores`; el hilo ya limpia (`hilo-privado.tsx:68`); en la entrega, el rechazo local solo se alcanza sin enlaces y quitar los enlaces borra su error (`formulario-de-entrega.tsx:107`) | Ninguno (03a cerrada, sin cambio) |
| 7 | `features/calificaciones` | No: no tiene formularios | Ninguno |

Solo la fila 1 entra. Coincide con los hermanos del tester ("invitar maestro, invitación masiva, generar enlace, corregir el correo, iniciar sesión, registro de estudiante, registro de maestro por enlace, recuperar contraseña, restablecer contraseña, establecer contraseña y cambio obligatorio"; fuera, restablecer desde la ficha y revocar; ya resuelto, buscar).

### Observaciones del tester y del manager (decisiones tomadas, sin corregir en el chore)
Detalle y razón en "Puntos de ataque" (Enmienda 5): O-r1-4, sin acción (no se alcanza); **O-r1-5 → ADMIN-01**; **O-r1-6 → el `chore` de foco y navegación**; O-r1-7, sin acción; **O-22 → CHORE-04** (con la regla del "Ver más" en su inventario; ADMIN-01 lo absorbe si llega antes a esas tablas). El orquestador las registra en `docs/ESTADO.md` §3.

### Decisiones para el humano (Enmienda 5)
| # | Pregunta | Recomendación del arquitecto | Si se elige la otra opción |
|---|---|---|---|
| DH-9 (T-05, **bloquea**) | ¿Autorizas sacar de "No se toca" en 03c los diez archivos de la tabla de §D-4 (Enmienda 5), solo para sus tres líneas después de la guarda de `isPending`? Texto exacto en "Preguntas bloqueantes" | (a): una línea por formulario, la forma que ya usa `BuscadorDeCuenta`, sin ganchos ni textos; 03c cierra en verde | (b): diferir a CHORE-04 ("guardas y limpieza de envío"), que toca esos mismos manejadores; las 11 rojas siguen y **03c no se cierra ni se hace su commit hasta entonces**. Diferirlo a ADMIN-01 y a un encargo de `auth` deja 03c abierta más tiempo |
| A-8 (no bloquea; al cerrar 03c) | ¿Se agrega a `CLAUDE.md` › "Formularios" la regla "antes de validar en local, el formulario limpia el error del servidor anterior"? Texto literal en "Documentos a actualizar" | Sí: CLASES-03 y ADMIN-01 traen formularios nuevos con `MensajeError` | La regla queda solo en este plan (§D-2, Enmienda 5) |

### Cambios por sección (Enmienda 5)
- **Encabezado:** `Estado: BLOQUEADO` y una línea nueva de la Enmienda 5 (las de las Enmiendas 2, 3 y 4 no cambian).
- **Preguntas bloqueantes:** DH-9, con sus dos opciones, antes de DH-8 (marcada como respondida).
- **§D-2:** el párrafo "Un solo mensaje vale para el envío que la persona acaba de hacer" con la tabla de secuencias.
- **§D-4:** la forma exacta del remedio en `admin` y `auth` (tabla de diez archivos y razones), después del párrafo de `features/auth`.
- **§D-6:** las filas de las secuencias en la matriz y los estados vecinos del mecanismo.
- **§D-R0:** el inventario de la Enmienda 5 (lista cerrada vacía).
- **Cambios por capa (03c):** lo de la ronda 2.
- **Pruebas requeridas (03c):** CH3-C09 a CH3-C13 y las frases de recuperación por camino.
- **Puntos de ataque:** una viñeta (T-05, hermanos y las observaciones O-r1-4 a O-r1-7 y O-22 como decisiones tomadas).
- **Riesgos:** R-10.
- **PARADAS:** PA-13.
- **No se toca:** la excepción de DH-9.
- **Documentos a actualizar:** A-8 (`CLAUDE.md` › "Formularios") y las filas de `docs/ESTADO.md` §3.
- **Autorizaciones:** A-8 y A-9.
- **Pasos de implementación:** 03c, pasos 8 a 12 (ronda 2) y la nota sobre el paso 7.

`docs/DESIGN.md` no cambia: ningún texto ni patrón nuevo (el `ErrorDeCampo` y el `MensajeError` son los de siempre; solo deja de verse a la vez el de un envío anterior).
