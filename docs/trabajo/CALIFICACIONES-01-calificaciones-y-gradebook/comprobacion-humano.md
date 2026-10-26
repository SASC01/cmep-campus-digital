# Comprobación humana — CALIFICACIONES-01 (una sola, al final de 01d)

Versión final de la hoja, fijada por el manager en `revision.md`, "Revisión final — CALIFICACIONES-01d y cierre del encargo", "Hoja de la comprobación humana". Máximo 7 puntos y unos 10 minutos: solo lo que las pruebas automáticas no ven. Ningún agente abre navegadores. Lo que no entra queda como "no verificada por decisión del humano, cubierta por pruebas automáticas" (`AGENTS.md`, "Trabajo visual"). Si todo sale bien, se aprueban las 14 marcas "propuesta (CALIFICACIONES-01c)" y "propuesta (CALIFICACIONES-01d)" de `DESIGN.md` (§7.1, §7.3, §7.11, §7.16, §7.24, §7.26, §7.27, §7.28, §7.29 y §8; lista cerrada con línea y sección en la revisión final).

El humano llena la columna "Resultado". El orquestador registra abajo el veredicto y la fecha, y cambia las marcas de `DESIGN.md` a "propuesta aprobada (<fecha>)" en el commit de la comprobación.

**Precondiciones:** `infra` levantado (`docker compose up -d` en `infra/`), la API (`npm run dev` en `backend/`) y Vite (`npm run dev` en `frontend/`). Cuentas: un maestro, un alumno y el administrador de `seed:admin`. NVDA instalado.

**Qué preparar antes (no cuenta en los 10 minutos), en este orden:**
1. Como administrador, una clase nueva con el maestro asignado; inscribir al alumno.
2. Como maestro, **antes de crear categorías**, la **tarea B**: sin rúbrica, 10 puntos, fecha límite mañana.
3. Las categorías "Tareas" (60) y "Exámenes" (40). Ninguna tarea irá en "Exámenes".
4. La **tarea A**: categoría "Tareas", 10 puntos, rúbrica de tres criterios de 5 puntos cada uno (uno con un nombre largo, de unas 60 letras), fecha límite mañana.
5. Como alumno, entregar A y B (con un archivo o, si la tarea se creó así, con "Marcar como completada").
6. Como maestro, calificar B con 8, sin comentario.
7. **Justo al empezar:** como maestro, la **tarea C**: categoría "Tareas", 10 puntos, sin rúbrica, "Entregas después de la fecha límite: No aceptar" y la fecha límite a 3 minutos. El alumno no la entrega.
8. Dos pestañas con la sesión del maestro y una ventana privada (u otro navegador) con la del alumno.

| # | Punto | Qué comprobar | Resultado (bien / observación) |
|---|---|---|---|
| 1 | **H-1** (maestro y alumno) | Calificar la entrega de A con 4,5, 5 y 5 y con un comentario. A 360 px, el panel de calificación se lee completo: la etiqueta larga del criterio no se desborda y el botón queda a la vista. Como alumno, en el detalle de A, "Tu trabajo" muestra "Calificación: 9.67 de 10" con su desglose, y el comentario aparece en los comentarios privados. En la sección "Calificaciones", la calificación general y la fila de A con "Calificado" y "9.67 de 10". | |
| 2 | **H-2** (maestro, dos pestañas) | Abrir la entrega de A del alumno en las dos pestañas. En una, cambiar a 4, 5 y 5 y "Actualizar calificación". En la otra, escribir otros puntos y "Actualizar calificación". Sale un solo aviso, la segunda pestaña se recarga con lo de la primera (lo escrito se descarta) y el foco queda en "Calificación". | |
| 3 | **H-6** (maestro y alumno; C ya vencida) | En las entregas de C, abrir la del alumno: dice "Este alumno no entregó la tarea y la entrega ya está cerrada.". Calificarla con 0. Como alumno, el detalle de C dice "No entregaste esta tarea y ya está calificada." y no ofrece entregar. | |
| 4 | **H-3** (maestro y admin) | La sección "Calificaciones" (el gradebook), en escritorio y a 360 px. La tabla se desplaza dentro de su panel opaco, sin vidrio en el panel ni en los botones. La columna "Alumno" queda fija al desplazar, y su encabezado (en `--surface`, junto a un encabezado `--muted`) no se ve como un parche que estorbe (O-r1d-3). Las celdas dicen 9.33 (A), 8 (B) y 0 (C); el alumno aparece "En riesgo" con "Promedio menor a 70 %", y el resumen dice "1 alumno", "Promedio de la clase: 46.65 %" y "1 en riesgo". Abrir la celda de A lleva a la entrega del alumno. Pulsar "Calificaciones" estando en ella: la tabla sigue, sin aviso ni salto, y el foco se queda en la sección (T-08). Como admin a 360 px, las cinco secciones de la clase se desplazan dentro de su panel (O-6). | |
| 5 | **H-4** (alumno, teclado y NVDA) | En "Calificaciones", "Ver cálculo" abre el modal. Se leen el título y la tabla ("Tareas" con su peso y "Exámenes" con "—" en "Peso que cuenta" y "Tu porcentaje") y la frase "1 tarea sin categoría no cuenta en tu calificación general.". Tab no sale del modal, Escape lo cierra y el foco vuelve a "Ver cálculo". Después, cambiar "Mostrar" a "Calificadas": anota si molesta que la calificación general desaparezca un momento mientras carga (N-45). | |
| 6 | **H-5** (maestro) | Editar la tarea A, ya calificada. Cambiar el título se guarda. Cambiar los puntos o un criterio da el aviso de que la tarea ya tiene calificaciones (`TAREA_CON_CALIFICACIONES`) y lo escrito se conserva. | |
| 7 | **H-7** (NVDA, maestro) | En el panel de calificación de A se leen la etiqueta de cada criterio con su máximo, el error al escribir 6 en un criterio de 5 y la ayuda del comentario. Con valores válidos, tras "Actualizar calificación" se anuncia el aviso y el foco queda en "Calificación". En el gradebook, "Calificaciones" se lee como la sección actual. | |

**No verificadas por decisión del humano, cubiertas por pruebas automáticas:** el avance y el regreso por ventanas del gradebook; "La clase cambió mientras veías las calificaciones…" y "Tus tareas cambiaron…" con sus recuperaciones (T-06 a T-08); "Ver más tareas" con más de 20 tareas; los errores de red, `5xx` y `VALIDACION` fuera de contrato de las dos vistas (Enmienda 2); el cambio de clase con la vista montada (inalcanzable).

**Cifras de la hoja, por si alguna no coincide:** A = (4 + 5 + 5) / 15 × 10 = 9.33 después del punto 2 (9.67 en el punto 1). "Tareas" = (9.33 + 0) / 20 = 46.65 %. B no cuenta (sin categoría) y "Exámenes" no tiene calificadas, así que su peso se reparte: la calificación general del alumno es 46.65 % y queda en riesgo. Si en el punto 2 la primera pestaña guarda otros puntos, las cifras cambian, pero A nunca pasa de 10, así que "Tareas" queda en 50 % o menos y el riesgo se mantiene.

## Resultado

**Veredicto del humano (2026-10-26): puntos 1 a 7 bien, sin observaciones.** Texto literal: "Comprobación humana CALIFICACIONES-01: puntos 1 a 7 bien, sin observaciones." Con eso, las 14 marcas de `DESIGN.md` (4 de 01c y 10 de 01d; lista cerrada en `revision.md`, "Revisión final — CALIFICACIONES-01d y cierre del encargo") pasan a "CALIFICACIONES-01c, propuesta aprobada (2026-10-26)" y "CALIFICACIONES-01d, propuesta aprobada (2026-10-26)", aplicadas por el orquestador en el commit de cierre. N-45 (la calificación general desaparece un momento al cambiar de filtro) no molestó al humano: sin fila en §3. Lo no verificado queda como "no verificada por decisión del humano, cubierta por pruebas automáticas".
