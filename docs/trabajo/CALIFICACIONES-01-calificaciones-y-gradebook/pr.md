# PR: CALIFICACIONES-01 · calificar con rúbrica, devolver con comentario, gradebook y calificaciones del alumno

Rama `feat/calificaciones` → `main`. Cuatro subentregas, carril sensible (migración, edición concurrente, estado de pago y restricción en el gradebook). Plan aprobado por escrito el 2026-10-13; comprobación humana de 7 puntos en verde el 2026-10-26.

## Qué entra

- **Backend (01a, 01b).** `PUT /clases/:claseId/tareas/:tareaId/entregas/:alumnoId/calificacion` para los maestros de la clase (el admin lee, no califica): calificación con rúbrica (suma escalada a los puntos de la tarea, centésimas) o directa, comentario opcional de devolución al hilo privado, versión de la entrega y puntos vistos como precondición (`409 ENTREGA_MODIFICADA` / `409 RUBRICA_MODIFICADA`), y calificar a quien no entregó solo con la entrega cerrada (`409 ENTREGA_NO_CALIFICABLE` si sigue abierta). Una tarea con calificaciones congela puntos y rúbrica (`409 TAREA_CON_CALIFICACIONES`); una rúbrica idéntica conserva sus ids. Evento `CALIFICACION_PUBLICADA` encolado en la misma transacción. `GET /clases/:claseId/gradebook` (maestros y admin; ventanas de alumnos × tareas, agregados por clase, riesgo) y `GET /clases/:claseId/mis-calificaciones` (solo el alumno de la sesión; filtro por estado, calificación general con desglose), los dos en instantánea única con SQL etiquetado y parametrizado.
- **Migración `20261013135122_calificaciones`**, compatible hacia atrás: `entregas.calificacion` y `fecha_calificacion`, tabla `puntajes_rubrica` con FK `NO ACTION DEFERRABLE INITIALLY DEFERRED` escrita a mano, `CHECK` de fecha relajado para la calificada sin entrega.
- **Frontend (01c, 01d).** Panel de calificación en la entrega de un alumno (versión y rúbrica de apertura, recarga tras un conflicto, foco en el encabezado); calificación con desglose en "Tu trabajo"; sección "Calificaciones" en las tres perspectivas con el gradebook opaco por ventanas (columna fija, resumen con "En riesgo") y "Mis calificaciones" (filtro, "Ver más tareas", modal de cálculo con un solo cierre); `components/foco/` compartido; recuperación al pulsar la sección activa.
- **Reglas de negocio nuevas** (`docs/ARCHITECTURE-ESSENTIALS.md`, `PRD.md`): "entregó" es tener `fecha_entrega`; calificación por categorías ponderadas y por puntos dentro de cada una; alumno en riesgo con umbrales constantes; publicar es devolver.
- **Proceso:** dos reglas nuevas para el arquitecto en `AGENTS.md` y `.claude/agents/arquitecto.md`: inventario de `VALIDACION` fuera de contrato en formularios nuevos (2026-10-13) y casos por camino para toda frase de recuperación de la interfaz (2026-10-26).

## Cómo se probó

- Backend: 2617 casos en 216 archivos; frontend: 3318 casos en 197 archivos; 204 pruebas de ataque; `lint`, `build` y `prisma validate` en verde en la corrida del manager.
- 9 rondas del tester más 2 cerradas, 3 de 16 resúmenes devueltos por el manager, 0 PARADAS. Historial completo en `docs/trabajo/CALIFICACIONES-01-calificaciones-y-gradebook/`.

## Despliegue

Backend y frontend se despliegan juntos: `calificacion` es obligatoria en las respuestas estrictas de la entrega y un frontend anterior las rechaza. No revertir el backend a una versión anterior a 01a si ya hay calificaciones (la FK diferida hace fallar `editarTarea` al confirmar). Detalle en `docs/ESTADO.md` §3, fila DEPLOY.

## Pendientes con destino

N-19 (texto de `409 TAREA_CON_ENTREGAS`, carril trivial), N-52 (riesgo residual del gradebook), `key={claseId}`, N-47, y los dos `chore` posteriores a ADMIN (traducción de errores de la API; foco y navegación del marco), todos en `docs/ESTADO.md` §3 y §2b.
