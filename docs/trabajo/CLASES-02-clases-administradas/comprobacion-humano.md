# Comprobación humana en navegador — CLASES-02

Lo registra el orquestador con el resultado que reportó el humano. Una sola comprobación para todo el encargo, al final de 02d (plan, "Comprobación humana"; `AGENTS.md`, "Trabajo visual": máximo 10 minutos y 7 puntos, solo lo que las pruebas automáticas no ven).

- **Fecha:** 2026-10-05 (reportada al orquestador el 2026-10-06).
- **Quién:** el humano, en su equipo, con la API y la SPA en local y `campus_dev` con la migración `20261003191319_clases_administradas` aplicada; con su admin de desarrollo, un maestro y un estudiante. Ningún agente abrió el navegador.
- **Hoja:** la versión final del manager, en `revision.md`, "Revisión final — CLASES-02d y cierre del encargo", apartado "3. Comprobación humana".
- **Base:** el árbol de trabajo de 02d antes de su commit `<K2d>` = `8aa5282`.
- **Resultado reportado (literal):** "Comprobación H-1 a H-7: bien, sin observaciones."

| Punto | Qué comprueba | Resultado |
|---|---|---|
| H-1 | La migración de datos sobre `campus_dev`: el maestro que ya tenía clases antes de 02a las sigue viendo en su inicio y en su barra lateral | Bien |
| H-2 | `/admin/clases`: crear una clase con dos maestros, abrirla y ver la tabla, el encabezado ("Maestros: … y …") y las secciones Muro, Alumnos y Maestros en material opaco, con el indicador visible | Bien |
| H-3 | La barra lateral del estudiante o del maestro: con varias clases, un nombre largo y dos clases de iniciales iguales, la insignia, el recorte, el `title` y el desplazamiento; con el foco en "Reintentar" o en una clase, cambiar de pestaña, esperar la respuesta y volver: el foco queda en la barra, nunca en `<body>` | Bien |
| H-4 | A 360 px: la barra inferior sin la lista, y "Personas" con correos largos sin desbordarse | Bien |
| H-5 | Publicar como admin: la insignia "Administración" en el muro del estudiante, y el maestro sin "Borrar publicación" en ella | Bien |
| H-6 | "Tipo de publicación": el indicador se desliza al cambiar de tipo, con y sin movimiento reducido del sistema | Bien |
| H-7 | El maestro no ve "Crear clase" ni "Editar clase", y su inicio se lee bien sin la tarjeta interna | Bien |

Sin observaciones del humano. Lo demás queda "no verificado en navegador por decisión del humano, cubierto por pruebas automáticas". El contraste lo cubren las pruebas de tokens.
