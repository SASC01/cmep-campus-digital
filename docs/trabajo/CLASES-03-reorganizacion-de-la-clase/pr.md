# CLASES-03 · reorganización de la clase

Cierra el encargo CLASES-03 (RF-60 a RF-64; RN-07 a RN-09) en seis subentregas, cada una con su commit: 03a y 03b en el backend, 03c1, 03c2, 03d y 03e en el frontend. Carril sensible: dos migraciones, rutas nuevas con la cadena de middleware y permisos por rol del autor. Historial completo en `docs/trabajo/CLASES-03-reorganizacion-de-la-clase/`: `plan.md` con trece enmiendas, `revision.md`, `reporte-tester.md`, un resumen del programador por subentrega y `aprobacion.md` con cada decisión literal del humano y los hashes.

## Qué entra

- **Secciones de la clase:** Avisos · Actividades de aprendizaje · Recursos · Dudas · Personas · Calificaciones, iguales en las tres perspectivas. "Foro" entra en tercera posición con FORO-01. `…/alumnos` y `…/maestros` redirigen a `…/personas`.
  - **Indicador:** la sección activa se mide en la página, con dos variables CSS en el `style` del indicador. Es la única excepción a "ningún valor suelto", documentada en `DESIGN.md` §7.3.
  - **Volver a abrir:** pulsar la sección en la que ya se está vuelve a pedir lo que falló, con el gancho compartido `components/seccion/` que `features/calificaciones` reexporta. Así se cumplen las frases "Vuelve a abrir …" (N-54).
- **03a · Recursos en el backend.** Migración `20261028165322_clases_03_recursos`:
  - `publicaciones.bloque` (`aprendizaje` o `docente`, por el rol del autor) y `publicaciones.version`, con sus índices;
  - `GET` y `PUT` de un recurso, con edición por versión (`409 RECURSO_MODIFICADO`);
  - filtros `?tipo=anuncio`, `?seccion=actividades` y `?seccion=` en temas, compatibles hacia atrás;
  - permiso de mover por bloque;
  - borrado que toma la fila primero.
- **03b · Dudas en el backend.** Migración `20261029153231_clases_03_dudas`:
  - tabla `dudas`, con las respuestas como tercer contexto de `comentarios` (`CHECK` de un solo contexto);
  - listar, publicar, marcar «Resuelta», borrar dudas y respuestas;
  - el admin lee, marca y borra, pero no escribe.
- **03c1 · Navegación y nombres:** las secciones, el indicador medido, «Personas» (maestros arriba, alumnos abajo) y todos los textos aprobados en DH-12.
- **03c2 · Contenido:**
  - Avisos solo con anuncios y Actividades solo con actividades;
  - conteos de temas por sección; el total, solo para maestro y admin;
  - ordenar temas con espera, conservando el orden si la recarga falla;
  - avisos con el formulario desmontado en comentario, clase y tema;
  - guardas de doble clic en comentario y clase (filas 1 y 2 de CHORE-04).
- **03d · «Recursos»:**
  - dos bloques por tema;
  - nuevo recurso, y editar con lectura fresca y conflicto;
  - borrar, mover y comentarios;
  - formulario de Avisos solo con anuncios;
  - "Escribe el título del recurso" al crear y al editar.
- **03e · «Dudas»:**
  - publicar, responder, marcar y quitar «Resuelta» (insignia con icono y texto), y borrar con confirmación;
  - respuestas plegables, sin mensajes dobles cuando una duda deja de existir;
  - las dos decisiones de texto del humano en Recursos: la nota "No pudimos cargar los temas. El recurso conserva su tema." al editar y "Ese recurso ya no existe." al borrar.
- **Documentos:**
  - `DESIGN.md`: §7.3, §7.16 a §7.22 y las nuevas §7.30 Recursos y §7.31 Dudas;
  - `CLAUDE.md`: fila `clases` y `components/seccion/`;
  - `AGENTS.md`: regla de las suites cuando un encargo toca `shared/`;
  - `ARCHITECTURE.md` §7 y §14 y ESSENTIALS (tablas, restricciones, edición concurrente, recursos, dudas, interfaz);
  - `docs/ESTADO.md`.

## Verificación

| Suite | Al cerrar 03b | Al cerrar |
|---|---|---|
| Backend | 229 archivos / 2774 pruebas | 229 / 2774 (sin cambios desde 03b) |
| Frontend | 237 / 5310 | 272 / 5953 |
| `*.ataque` | 226 al arrancar | 246 (ninguna borrada ni saltada; las reescritas, con su motivo y su fila de §D-R0 o arbitraje del manager) |

- **Suites:** lint, test y build en verde en `shared`, `backend` y `frontend`. `prisma validate` y las dos migraciones aplicadas en `campus_dev` con la confirmación del humano.
- **Proceso por subentrega:** cada una pasó por ronda 0 del tester, resumen verificable contrastado por el manager con su propia corrida, rondas de ataque y revisión final APROBADO o APROBADO CON OBSERVACIONES.
- **Rondas extra:**
  - 03d llegó a tres rondas.
  - 03e agotó las tres: su último hallazgo (T-05, bajo) lo verificó el manager sin cuarta ronda, por decisión del humano.

**Pendiente antes de fusionar:** la comprobación humana en navegador (H-1 a H-7 del plan).

## Despliegue (fila DEPLOY en `docs/ESTADO.md` §3)

Primero el backend, con las migraciones `clases_03_recursos` y `clases_03_dudas`, y después el frontend. El frontend nuevo no funciona con un backend anterior: no existen `…/recursos` ni `…/dudas`, y un backend anterior ignora `?tipo=anuncio`. Si se vuelve atrás el backend, hay que volver también el frontend.

## Pendientes anotados en `docs/ESTADO.md` §3

- **Retiro de compatibilidad de CLASES-02 y CLASES-03 antes del primer DEPLOY:**
  - listas mezcladas sin filtro;
  - `bloque` obligatorio;
  - ramas de material y de tarea en el muro.
- **CHORE-04:** filas 26 a 29 ("Ver más" con `isFetchingNextPage` y el orden de temas entre montajes).
- **El `chore` de foco y navegación del marco:**
  - O-16 en categorías;
  - O-03 de 03c2;
  - observaciones de 03e;
  - el hermano en los comentarios de Avisos y Recursos.
- **El `chore` de `apiClient` y avisos:** la guarda de redirección en los ganchos heredados de `features/clases`.
- **El próximo encargo que toque `features/tareas`:** los hermanos de T-01 a T-05 de 03d y PR-1A17.
- **Detalles de `useTemasDelRecurso`:** por el carril trivial.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
