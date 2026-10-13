# ENTREGAS-01 · entregas, hilo privado y edición concurrente

Cierra el encargo ENTREGAS-01 (RF-14, RF-15, RF-16, RF-24, RF-35, RF-44 parte de ENTREGAS; RN-02, RN-03, RN-06, RN-07) en cinco subentregas, cada una con su commit, más el commit de cierre. Carril sensible: una migración, rutas nuevas con `requireMembership` y `requireOwnership`, estado de pago y restricción de acceso. Historial completo en `docs/trabajo/ENTREGAS-01-entregas-e-hilo-privado/` (`plan.md` con cinco enmiendas, `revision.md`, `reporte-tester.md`, `resumen-programador.md`, `aprobacion.md` con cada decisión literal del humano y los hashes, `comprobacion-humano.md`).

## Qué entra

- **Migración única** `20261012035613_entregas_e_hilo_privado`: tabla `entregas` (una fila por alumno y tarea, creada al primer uso; `estado`, `fecha_entrega`, `con_retraso`, `enlaces`, `version`), `comentarios.entrega_id` (hilo privado; `publicacion_id` pasa a nulo con `CHECK` de un solo contexto), `archivos.entrega_id`, `tareas.version` y `tareas.requiere_adjuntos`. Compatible hacia atrás; aplicada en `campus_dev`.
- **Edición concurrente de tareas** (decisión del humano, P-05 a′): `version` entera como precondición del `PUT`; `409 TAREA_MODIFICADA` sin escribir nada; mover de tema sube la versión. El formulario avisa, descarta y recarga, como el editor de categorías. Regla nueva en ESSENTIALS, "Reglas de datos".
- **Entregas del alumno** (backend y frontend): entregar con archivos y enlaces o "Marcar como completada" (campo "Cómo se entrega" de la tarea), anular y volver a entregar mientras no esté calificada; cierre en la fecha límite cuando la tarea no acepta tardías (reabre al mover la fecha o aceptar tardías); `con_retraso` fijado al entregar; archivos de entrega con su propia ruta y clave `entregas/{tareaId}/{alumnoId}/{archivoId}`; enlaces normalizados y acotados a 2048 caracteres; `ENTREGA_REALIZADA` encolado en la transacción (sin consumidor hasta NOTIFICACIONES).
- **Entregas para maestro y admin**: lista de entregas de una tarea (mismas condiciones y cursor que el roster, sin estado de pago ni correo), entrega de un alumno con descarga de sus archivos; "Trabajo de clase" con el estado de la entrega del alumno.
- **Hilo privado** alumno-maestros, uno por alumno y tarea; el admin lo lee y no escribe (P-01 a); sin borrar ni editar en esta fase (S-04); aislado de las rutas del muro; `COMENTARIO_CREADO` como unión estricta de la forma del muro y la del hilo.
- **Borrar una tarea con entregas** (S-06 modificada por el humano): el maestro recibe `409 TAREA_CON_ENTREGAS` con el conteo; solo el admin la borra, con `?confirmar=entregas`, en cascada e irreversible.
- **Cierre del hueco de descarga**: la descarga de la clase solo sirve archivos de publicaciones; la confirmación exige el prefijo de la clave.
- Frontend: `EstadoEntregaBadge`, `lib/estado-de-entrega.ts`, ganchos de adjuntos con ruta, zona de entrega e hilo en "Tu trabajo", vistas "Entregas" y "Entrega de un alumno", borrado en dos pasos, descarga con errores que reemplazan la vista, lectura fresca al abrir "Editar tarea". `DESIGN.md` con 19 marcas aprobadas tras la comprobación humana (H-1 a H-7 bien, 2026-10-12).
- Documentos: ESSENTIALS, `ARCHITECTURE.md` §7, §8, §11 y §14, `PRD.md` (RF-16, RF-24, RF-44, RN-07, §11), `CLAUDE.md`, `AGENTS.md` (cuatro reglas nuevas), `docs/ESTADO.md`.

## Verificación

| Suite | Al arrancar (`dd8edcb`) | Al cerrar |
|---|---|---|
| Backend | 172 archivos / 2159 pruebas | 192 / 2422 |
| Frontend | 150 / 2243 | 166 / 2536 |
| `*.ataque` | 163 | 175 (ninguna borrada ni saltada) |

Lint, test y build en verde en `shared`, `backend`, `frontend` y la raíz; `prisma validate`, `migrate status` y `migrate diff` al día; PA-07 limpia en todas las corridas del backend. Cinco subentregas con ronda 0 del tester, resumen verificable del programador contrastado por el manager, rondas de ataque (9 en total, ninguna sobre el tope) y revisión final APROBADO CON OBSERVACIONES sin M-nn en cada una. Comprobación humana en navegador con MinIO local y NVDA: 7 puntos bien.

## Pendientes anotados en `docs/ESTADO.md` §3

CALIFICACIONES (`entregas.version` al calificar, rúbrica con entregas calificadas, columnas de calificación, `CHECK` de fecha), NOTIFICACIONES (consumidores de `ENTREGA_REALIZADA` y `COMENTARIO_CREADO`), DEPLOY (backend y frontend juntos; no revertir el backend a antes de 01b con entregas en la base; archivos pendientes hasta `LIMPIEZA_DIARIA`), un chore de `apiClient` y avisos (sesión perdida, lista de códigos copiada, `signal` en `consultaTarea`), un trivial de textos (R-17, READMEs, O-r1-1) y ADMIN (lista de entregas sin filtro por rol si algún día cambia el rol de una cuenta).

🤖 Generated with [Claude Code](https://claude.com/claude-code)
