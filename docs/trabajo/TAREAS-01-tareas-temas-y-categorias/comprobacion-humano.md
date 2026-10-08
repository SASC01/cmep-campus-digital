# Comprobación humana en navegador — TAREAS-01

Lo registra el orquestador con el resultado que reporte el humano. Una sola comprobación para todo el encargo, al final de 01e (plan, "Comprobación humana en navegador"; `AGENTS.md`, "Trabajo visual": máximo 10 minutos y 7 puntos, solo lo que las pruebas automáticas no pueden ver; nada de mediciones manuales de contraste).

- **Fecha:** pendiente.
- **Quién:** el humano, en su equipo, con la API y la SPA en local (el worker no hace falta) y `campus_dev` con las migraciones `20261006151453_tipo_publicacion_tarea` y `20261006151533_tareas_temas_y_categorias` aplicadas; con su admin de desarrollo, una cuenta de maestro y una de estudiante inscrito en la misma clase.
- **Hoja:** la versión final del manager, en `revision.md`, "Revisión final — TAREAS-01e y cierre del encargo", apartado "9. Para el humano". Junta H-1 a H-7 del plan con los cuatro puntos de 01d (`docs/ESTADO.md` §3) en 7 puntos, en orden de ejecución.
- **Base:** el árbol de trabajo de 01e antes de su commit `<K1e>` (o ese commit, si ya está hecho).
- **Resultado reportado:** pendiente.

| Punto | Qué comprueba | Qué demuestra que las pruebas no ven | Resultado |
|---|---|---|---|
| 1 | **Maestro, categorías (H-4).** En "Trabajo de clase", "Categorías de calificación": agrega dos con 60 y 30. El total dice "Faltan 10 %" mientras escribes. "Guardar categorías" no pasa hasta llegar a 100 % | Que el total se lee en vivo en pantalla real | Pendiente |
| 2 | **Maestro, crear tareas (H-1 y H-2).** Crea la tarea A con fecha de mañana a una hora que elijas, dos criterios de rúbrica y un PDF, y una tarea B a dos semanas. Abre el detalle de A: dos columnas en escritorio, y la hora que muestra es la que elegiste. Achica la ventana a 360 px en el detalle y en el formulario de editar: una columna y nada se corta | El selector de fecha de tu navegador y tu zona (ninguna prueba ve un selector nativo), y el diseño a 360 px (jsdom no calcula diseño) | Pendiente |
| 3 | **Maestro, "Trabajo de clase" (H-3 y H-7).** Con tres temas: "Subir" y "Bajar" con el teclado (el foco sigue en el botón), mueve la tarea B a otro tema y borra un tema (sus elementos pasan a "Sin tema"). La fila de A dice "Vence mañana a las …" en tono de aviso, junto a B en tono neutro (umbral de 72 h, S-02) | Que el foco se ve y se mueve bien en un navegador real, y el tono de aviso | Pendiente |
| 4 | **Estudiante (H-1, segunda mitad).** Ve A en el muro, abre su detalle y ve "Tu trabajo" sin "Editar" ni "Borrar". En "Trabajo de clase" no hay ningún control de gestión ni "Mover" | La vista real del estudiante con sus datos | Pendiente |
| 5 | **Admin a 360 px (H-5 y H-6, más el contexto opaco de 01d).** Publica una tarea desde la clase: en el muro del estudiante firma "Administración", y el maestro no ve "Editar tarea" ni "Borrar tarea" en su detalle. A 360 px, las cuatro secciones se desplazan dentro de su panel. El formulario y el detalle de tarea en el contexto opaco del admin se leen bien | El desplazamiento horizontal y el material opaco, que jsdom no pinta | Pendiente |
| 6 | **Foco con el navegador real (01d, `document.activeElement`).** En el formulario de editar una tarea, con el foco en "Título", cambia de pestaña y vuelve: el foco sigue en "Título". Haz clic en un espacio en blanco de la vista y espera unos segundos: el foco no salta a ningún control. Borra una tarea desde su detalle: llegas a "Trabajo de clase" con el aviso "Tarea borrada" | El criterio de ventana con `document.activeElement`, que solo se aproximó en jsdom (O-6 de 01d) | Pendiente |
| 7 | **Lector de pantalla (opcional, si lo usas; H-3 y 01d).** En el formulario de tarea: el control segmentado "Entregas después de la fecha límite" se anuncia como grupo con el botón presionado, "Quitar criterio" dice su número, y se anuncian el total y la nota del tope. En una clase con muchos temas, "Trabajo de clase" al abrir no satura los anuncios con muchos "Cargando `<tema>`" (31 regiones `role="status"`, `docs/ESTADO.md` §3) | Lo que solo oye un lector real | Pendiente |

Lo que no esté en la hoja queda "no verificado en navegador por decisión del humano, cubierto por pruebas automáticas". El contraste lo cubren las pruebas de tokens.

**Al reportar el resultado:** con la aprobación del humano, las marcas "propuesta (TAREAS-01d)" y "propuesta (TAREAS-01e)" de `docs/DESIGN.md` pasan a "propuesta aprobada (fecha)" por el carril trivial; cualquier ajuste visual que pida después de ver la pantalla va por ese mismo carril (`AGENTS.md`, "Trabajo visual").
