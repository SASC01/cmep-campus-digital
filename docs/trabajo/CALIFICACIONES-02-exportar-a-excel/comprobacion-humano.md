# Comprobación humana — CALIFICACIONES-02 · exportar a Excel

Propuesta del manager en `revision.md`, "## Revisión final — 02b y cierre de CALIFICACIONES-02". Máximo 10 minutos y 7 puntos; solo lo que las pruebas automáticas no ven. H-0 (la muestra de `lib/xlsx.ts` en Excel y LibreOffice) ya se hizo el 2026-11-04: bien.

**Preparación:** una clase con al menos dos alumnos (uno con acento o ñ en el nombre), dos categorías, una tarea sin categoría, una calificada con retraso, una entregada sin calificar y una vencida sin entregar.

| Punto | Qué revisar | Resultado |
|---|---|---|
| H-1 · Maestro | «Exportar a Excel» aparece entre el resumen y los botones de las ventanas. Al pulsarlo se ve la espera, se descarga `Calificaciones - <clase> - <fecha de hoy>.xlsx` y aparece «Se descargó «…».» una sola vez. | |
| H-2 · Excel | Abre sin el aviso de reparar; acentos y ñ bien. Al seleccionar las calificaciones de una actividad, la barra de estado muestra su suma (son números). | |
| H-3 · LibreOffice Calc, Numbers o Google Sheets | El mismo archivo abre sin error. | |
| H-4 · Contenido | Tres filas de encabezado en negrita y fijas al bajar; «Alumno» y «Correo» fijas al ir a la derecha. Actividades de la más antigua a la más reciente, con su categoría («Sin categoría» donde no hay) y sus puntos. Estados en palabras. «Promedio (%)» igual al del gradebook en dos alumnos, y «—» donde no hay promedio. Ninguna columna de estado de pago ni de restricción. | |
| H-5 · Administrador | Lo mismo desde `/admin/clases/<id>/calificaciones`, con una clase cuyo nombre lleve `/` o `:`; esos caracteres pasan a espacio en el nombre del archivo. | |
| H-6 · Teléfono (Safari en iOS o Chrome en Android), como maestro | El botón cabe sin desbordar, y el archivo se descarga o se ofrece para abrir, y abre. | |
| H-7 · Lector de pantalla (NVDA o VoiceOver) | El botón se anuncia «Exportar a Excel», se anuncia ocupado mientras exporta, y se lee el aviso de éxito. | |

No verificadas por decisión del humano, cubiertas por pruebas automáticas: los avisos de error y de «demasiadas», el doble clic, salir a mitad de la exportación, el escape de fórmulas y de caracteres raros, el recorte del nombre del archivo, los topes de Excel y el contraste.
