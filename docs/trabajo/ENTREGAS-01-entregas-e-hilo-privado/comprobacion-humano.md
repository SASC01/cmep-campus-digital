# Comprobación humana — ENTREGAS-01 (una sola, al final de 01e)

Hoja final del manager (`revision.md`, "Revisión final — ENTREGAS-01e y cierre del encargo"). Máximo 7 puntos y unos 10 minutos: solo lo que las pruebas automáticas no ven. Ningún agente abre navegadores. Lo que no entra queda como "no verificada por decisión del humano, cubierta por pruebas automáticas" (`AGENTS.md`, "Trabajo visual"). Si todo sale bien, se aprueban las 19 marcas "propuesta (ENTREGAS-01x)" de `DESIGN.md` (§7.7, §7.8, §7.19, §7.20, §7.21, §7.24, §7.25, §7.26 y §8).

Precondiciones: `infra` levantado (`docker compose up -d`: PostgreSQL, MinIO), API (`npm run dev` en `backend`) y Vite (`npm run dev` en `frontend`); una clase con un maestro y un alumno inscrito; la cuenta de administrador.

| Punto | Qué comprobar | Resultado (bien / observación) |
|---|---|---|
| **H-1** (MinIO local; alumno) | Entregar con un PDF y un enlace de unos 2000 caracteres. Descargar el PDF propio, anular y volver a entregar. A 360 px, el enlace largo se parte dentro de su panel, sin barra horizontal. | |
| **H-2** (maestro, luego alumno) | Crear una tarea con "Marcar como completada". A 360 px, "Cómo se entrega" y "Entregas después de la fecha límite" caben en el formulario. Como alumno, marcarla sin adjuntar nada y ver "Entregado" en "Trabajo de clase". | |
| **H-3** (reloj real) | Una tarea sin entregas tardías con la fecha límite a 2 minutos. Mientras se espera, hacer H-4 y H-5. Al vencer, recargar el detalle del alumno y ver la frase de entrega cerrada. Como maestro, mover la fecha a mañana y ver que el alumno vuelve a poder entregar. | |
| **H-4** (maestro) | "Entregas" a 360 px y en escritorio. La tabla se desplaza dentro de su contenedor, las insignias se leen y "Ver entrega" abre la del alumno. Si hay una clase sin alumnos, ver si "Entregaron 0 de 0" junto a "Aún no hay alumnos" estorba (O-1e1-1). | |
| **H-5** (alumno, maestro y admin) | El alumno escribe en el hilo, el maestro responde desde la entrega del alumno y el alumno ve la respuesta. El admin abre la misma entrega y la lee sin formulario, con la nota de solo lectura. | |
| **H-6** (maestro, dos pestañas) | Guardar la tarea en una y, después de cambiar el título, en la otra. Un solo aviso, la segunda se recarga con lo de la primera (el título nuevo se descarta) y el foco queda en "Título" (P-05 a′). | |
| **H-7** (NVDA; alumno) | En "Tu trabajo", que se lean la insignia, la nota mientras se entrega, la confirmación de "Anular entrega" con el foco en "Cancelar" y el enlace con "(se abre en otra pestaña)". | |

Resultado del humano (fecha, puntos bien, observaciones y decisiones): _pendiente_.
