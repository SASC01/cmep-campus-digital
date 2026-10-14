# Revisión del Manager — CALIFICACIONES-01 · calificar con rúbrica, devolver con comentario, gradebook y calificaciones del alumno

## Revisión del plan — CALIFICACIONES-01
Veredicto: **CAMBIOS REQUERIDOS** (tres problemas que bloquean, los tres baratos de corregir en el plan; el resto del diseño es sólido y no hay que rehacerlo).
Plan revisado: `plan.md` SHA-256 `ef85ae0f535c2ed147394fa1ddc075a0e5b75cb97bceeede1a5a62caba9aab2b` (878 líneas), contra el código de `d998282`.
Verificación propia: lint, test y build **no ejecutados** (revisión de plan; el árbol de código está en `d998282` sin cambios, solo `docs/`). Lo que digo del código sale de leerlo y de mis propios grep sobre `backend/test`, `backend/src`, `frontend/src` y `shared/src`.

### Problemas que bloquean

#### M-01 — La FK `NO ACTION` de `puntajes_rubrica.criterio_id` depende del orden de los disparadores de la cascada: borrar una tarea calificada (o su clase) muy probablemente responde 500
Dónde: plan §D-1 (`plan.md:135-136` y la viñeta "Llaves foráneas", `plan.md:158`), CAL-1A01 (`plan.md:624`, "borrar la publicación de una tarea con criterios, entregas y puntajes no falla") y R-07 (`plan.md:756`). Código: `backend/src/adapters/db/tareas.ts:561` (`borrarTarea` borra la publicación y deja todo a la cascada), `backend/prisma/schema.prisma` (`Tarea.criterios` y `Tarea.entregas`, ambas `Cascade`), migraciones `20261006151533_tareas_temas_y_categorias/migration.sql:95` (FK de criterios a tareas) y `20261012035613_entregas_e_hilo_privado/migration.sql:50` (FK de entregas a tareas, creada después).
Por qué importa: el plan afirma que "la cascada borra en la misma sentencia criterios, entregas y puntajes y la comprobación se hace al final", por analogía con `archivos.publicacion_id`. La analogía no vale. En PostgreSQL las acciones de una FK son disparadores `AFTER ROW` que se encolan y corren en orden de llegada al final de la sentencia, y los de una misma fila salen en orden alfabético de nombre (`RI_ConstraintTrigger_a_<oid>`, en la práctica el orden de creación). En los casos que ya funcionan en el proyecto (borrar una clase con archivos o con categorías), la cascada hermana nace en el **mismo** nivel que el borrado que genera la comprobación, así que se encola antes que ella. Aquí el rombo está un nivel más abajo: borrar la fila de `tareas` encola primero la cascada a `criterios_rubrica` (la FK más antigua) y después la de `entregas`; la primera, al borrar los criterios, encola la comprobación `NO ACTION` de `puntajes_rubrica`, y la segunda, al borrar las entregas, encola **después** la cascada que borraría esos puntajes. La comprobación corre primero, encuentra los puntajes y falla con `23503`. Es el borrado confirmado del admin de una tarea calificada con rúbrica (flujo real de ENTREGAS-01, S-06) y el de una clase. CAL-1A01 lo descubriría ya con el programador a media subentrega, sin PARADA ni alternativa decidida. Además, ninguna prueba requerida recorre por la API el borrado confirmado del admin de una tarea con puntajes reales (CAL-1A12 e solo cubre el `409` del maestro). No lo verifiqué contra una base (no corro SQL en modo plan); es razonamiento sobre el orden de disparo documentado, y por eso pido que el plan no dependa de él.
Qué se espera: un diseño de la FK que no dependa del orden de los disparadores, elegido en el plan con su motivo. Opciones que veo: (1) `criterio_id` con `ON DELETE NO ACTION DEFERRABLE INITIALLY DEFERRED`, escrita a mano como los `CHECK` (la comprobación pasa al `COMMIT`, cuando la cascada ya terminó; conserva la defensa contra un defecto de `editarTarea`; el plan dice cómo se comporta Prisma ante esa FK al buscar deriva y lo deja comentado en el esquema); (2) `ON DELETE CASCADE` (lo más simple; pierde la defensa, que entonces queda solo en CAL-1A16); (3) que `borrarTarea` borre antes los puntajes (toca `borrarTarea`, la clase no tiene ese camino y cambia el inventario O-4 de borrados; no la recomiendo). Además: una prueba requerida en 01a del borrado confirmado del admin, por la API, de una tarea con rúbrica, entregas calificadas y puntajes, y otra del borrado de su clase en la misma condición; una PARADA explícita si cualquiera de las dos falla; y R-07 reescrito según la opción elegida (con `CASCADE`, revertir el backend ya no da un `500` al editar: borra el desglose en silencio).

#### M-02 — Calificar no detecta que cambiaron los puntos de una tarea sin rúbrica: el `409 RUBRICA_MODIFICADA` promete algo que el diseño no comprueba
Dónde: §D-2.1 (`plan.md:189-201`: `decidirCalificacion` solo compara la forma del cuerpo), §D-3 paso 7 (`plan.md:280`), §D-10 (`plan.md:388`: el mensaje dice "La rúbrica o los puntos de la tarea cambiaron") y §D-11 (`plan.md:398`: `calificarEntregaSchema` no lleva nada de la tarea). Código: `backend/src/adapters/db/tareas.ts:446-457` (`editarTarea` cambia `puntos` en la misma escritura que la fecha o el título).
Por qué importa: es justo la regla de edición concurrente que pidió el humano ("las decisiones que alguien toma sobre lo que vio", ESSENTIALS). Caso: tarea sin rúbrica de 10 puntos, sin calificaciones todavía; la maestra A abre el panel ("Calificación (de 10 puntos)") y escribe 9; el maestro B cambia la tarea a 100 puntos (P-04 lo permite porque nadie ha calificado); A guarda. El cuerpo `{ version, puntajes: [], calificacion: 9 }` tiene la forma correcta y 9 está en rango: se guarda "9 de 100" (9 %) cuando A quiso 90 %, una calificación equivocada y silenciosa. Con rúbrica el caso queda cubierto por accidente (con 0 calificadas `editarTarea` siempre recrea los criterios y cambian sus ids), pero deja de estarlo si se adopta N-02.
Qué se espera: que el cuerpo lleve lo que la persona vio de la tarea (los puntos con que abrió el panel, o la versión de la tarea si el arquitecto acepta que mover de tema también provoque el `409`) y que `core/` lo compare con la fila ya bloqueada `FOR SHARE` antes de validar rangos: `409 RUBRICA_MODIFICADA` y el panel recarga la tarea y la entrega (S-12). Con su caso en CAL-1A03 (unitaria), en CAL-1A12 d (editar solo los puntos de una tarea sin rúbrica antes de calificar) y en CAL-1C01/CAL-1C05 (el cuerpo envía los puntos de apertura aunque una recarga de fondo traiga otros).

#### M-03 — El gradebook del maestro quedaría con vidrio: los botones `outline` de las ventanas son `vidrio-fuerte` fuera de `data-material="opaco"`
Dónde: §D-13.3 (`plan.md:442-444`: "superficie opaca … sin `Card`, sin `data-material`, que solo pone `ContenedorRol`", y los cuatro botones de ventana `outline` `sm`), CAL-1D09 (`plan.md:677`, que **prohíbe** `data-material` en `features/calificaciones`) y la parte 01d de "Documentos a actualizar" (`plan.md:790`: "§8 (el gradebook del maestro, opaco sin `data-material`)"). Código: `frontend/src/components/ui/button-variants.ts:15` (la variante `outline` es `vidrio-fuerte` y solo pasa a borde de tinta sobre superficie con `in-data-[material=opaco]`).
Por qué importa: `DESIGN.md` §8 (línea 826) dice "Maestro: vidrio; el gradebook, opaco" y §10 (línea 856) prohíbe "vidrio en pantallas densas (gradebook y administrador)". `CLAUDE.md` ("Tokens") da el mecanismo: "Una pantalla densa marca su contenedor con `data-material="opaco"` … el vidrio pasa a `--surface` sin tocar los componentes". El plan pinta la tabla sobre `--surface` pero deja "Tareas más recientes", "Tareas más antiguas", "Alumnos anteriores" y "Alumnos siguientes" (y cualquier `outline` futuro de la vista) como vidrio con `backdrop-filter`. El precedente del roster (tabla opaca dentro de un `Card`) es de otra vista, que `DESIGN.md` no declara densa.
Qué se espera: el contenedor del gradebook marcado con `data-material="opaco"` (y el plan decide si también `data-densidad="densa"`, por los controles de 36 px de §8 en tablas), o una alternativa argumentada que deje la vista sin ningún elemento de vidrio; CAL-1D09 exige ese contexto en lugar de prohibirlo; CAL-1D01 comprueba que los controles del gradebook cuelgan de él (como `app/contexto-r1.ataque.test.tsx`), y el texto de §8 en "Documentos a actualizar" se corrige. Comprobé que `contexto-r1.ataque` solo cuenta contextos en `/admin`, en los inicios y en las pantallas públicas, no en rutas de clase: no rompe; que §D-R0 lo diga.

### Problemas que no bloquean

- **N-01 — Las listas cerradas estáticas leen el texto crudo, comentarios incluidos, y el plan no lo advierte.** Es la causa de las PARADAS de ENTREGAS. Mi grep: `backend/test/muro-c-r1.ataque.test.ts:628` busca `COMENTARIO_CREADO` y `AVISO_FALLIDO` con `readFileSync` sin quitar comentarios y solo admite cuatro archivos; `lecturas-fx-r1.ataque.test.ts:758` prohíbe `enTransaccion`, `instantaneaUnica` e `isolationLevel` fuera de `adapters/db`, y `REPEATABLE READ`, `RepeatableRead` o `Serializable` fuera de `cliente.ts`, y cuenta `instantaneaUnica: true` por archivo, todo en crudo; `lecturas-fx-r2.ataque.test.ts:966` prohíbe `DELETE FROM` y `TRUNCATE` en crudo; `hilo-01c-r1.ataque.test.ts:718` cuenta exactamente 4 `instantaneaUnica: true` en el texto crudo de `entregas.ts`. El propio §D-3 (`plan.md:281`) invita a escribir "no encola `COMENTARIO_CREADO`": copiado como comentario en `handlers/calificaciones.ts`, `adapters/db/entregas.ts` o `core/calificaciones/`, pone en rojo `muro-c-r1`. Qué se espera: §D-R0 dice, en sus filas de "Diseño", que la restricción alcanza a los comentarios de los archivos nuevos y cambiados, con la lista de palabras.
- **N-02 — Conservar los ids de una rúbrica idéntica siempre, no solo con calificaciones.** §D-2.1 y CAL-1A07 (`plan.md:210-219`, `:630`) mantienen "con 0 calificadas, siempre `reemplazarRubrica: true`". Así, corregir solo el título de una tarea mientras otra persona califica provoca un `409 RUBRICA_MODIFICADA` y el panel descarta lo escrito sin motivo real. Con "idéntica ⇒ no se reemplaza" en los dos casos, la edición de título no molesta a nadie; no rompe `tareas.integracion.test.ts:431` (PR-1B08 cambia la rúbrica) ni el inventario O-4 (`criterioRubrica.deleteMany` sigue existiendo). Si se adopta, M-02 deja de ser solo de las tareas sin rúbrica.
- **N-03 — Versión de apertura cuando el panel pasa de la frase al formulario por una recarga.** §D-12.5 (`plan.md:416-417`): la versión nace en el inicializador perezoso al montar el panel; si se montó mostrando "Podrás calificar…" y una recarga de fondo vuelve calificable la entrega (el alumno entregó), el formulario aparece con la versión vieja y el primer guardado da un `409` evitable. Qué se espera: que el formulario monte (y tome su versión) cuando aparece, y una fila más en la matriz de §D-14 para ese estado vecino.
- **N-04 — Foco tras `409 ENTREGA_NO_CALIFICABLE`.** La matriz (`plan.md:472`) lo manda a la raíz, pero el `Card` con el `h3` "Calificación" sigue montado (solo cambia a la frase). Lo coherente con el resto de la matriz es el `h3`; decidirlo y que CAL-1C06 lo fije.
- **N-05 — Matriz de §D-14 incompleta respecto de la regla del 2026-10-12.** La tabla del gradebook no tiene las columnas "en vuelo a la vez" y "con la vista desmontada"; la de 01c no tiene la fila de `useEditarTarea` con `409 TAREA_CON_CALIFICACIONES` (aviso, lo escrito se conserva, foco en el botón) ni su vecino `409 TAREA_MODIFICADA`; la del modal no dice qué pasa con "Ver cálculo" durante una recarga o un "Ver más tareas" en vuelo. El arquitecto completa el borrador; el programador la entrega completa en su primer resumen.
- **N-06 — "Vence el …" en tareas ya vencidas de "Mis calificaciones".** `plan.md:450` y `:796` dan solo "Vence el <fecha larga>"; para una vencida debe decir "Venció el …", con los textos de `lib/vencimiento.ts` (`DESIGN.md` §7.7).
- **N-07 — Importaciones de `shared/src/calificaciones.ts`.** `plan.md:396` dice que importa solo de `entregas.ts`, `clases.ts` y `enlaces-registro.ts`, pero `calificarEntregaSchema` usa `MAXIMO_CRITERIOS_RUBRICA`, que vive en `shared/src/tareas.ts:22`. Corregir la frase (no hay ciclo: `tareas.ts` no importa `calificaciones.ts`).
- **N-08 — §D-3 dice "sin escribir nada antes del paso 8"** (`plan.md:273`), pero el paso 4 inserta la fila perezosa. La reversión la deshace (CAL-1A13 "sin crear fila" se cumple), pero el texto debe decirlo así para que el tester no lo reporte como contradicción.
- **N-09 — A-6 cita `PRD.md` §11** (`plan.md:55`), pero "Documentos a actualizar" no trae texto para §11 (el supuesto "Umbrales de alumno en riesgo de RN-05"). Agregarlo o quitar la cita.
- **N-10 — El modal y `DialogContent`.** `components/ui/dialog.tsx` trae por defecto un botón de cierre con icono (`showCloseButton = true`); con "Cerrar" quedan dos controles de cierre. Decidir uno. El diálogo va por `DialogPortal` (lo fijo nunca dentro del vidrio del `Card` de "Mis calificaciones"; `estatico-r1.ataque` V-16 solo admite `fixed` en `dialog.tsx` y en la barra).

### Opinión sobre las suposiciones y las autorizaciones

| Id | Opinión | ¿Que la mire el humano? |
|---|---|---|
| S-01 (el admin no califica) | Aceptar: coherente con P-01 (a) de ENTREGAS-01 (el admin lee y no escribe). | Sí, es de producto: si el admin debe poder corregir una calificación por una queja, es solo sumar `admin` a `roles`. |
| S-02 (`NUMERIC(7,2)`, 2 decimales, centésimas) | Aceptar. | No |
| S-03 (sin penalización por retraso) | Aceptar. | No |
| S-04 (umbrales como constantes; vencidas cuentan desde antes de la inscripción) | Aceptar las constantes. La parte de R-13 tiene efecto visible: un alumno que se inscribe a mitad del periodo con 3 tareas ya vencidas entra "En riesgo" el primer día. | **Sí** (R-13): o se acepta, o la consulta suma `t.fecha_limite >= i.creado_en` y "Trabajo de clase" se ajusta en otro encargo. |
| S-05 (sin estado de pago en el gradebook) | Aceptar: RN-02 se cumple con menos superficie. | No |
| S-06 (RF-30 fuera) | Aceptar: el humano lo dejó a criterio del arquitecto. | No |
| S-07 (ventanas 25 × 20, hasta 50) | Aceptar; las ventanas evitan celdas desalineadas. | No |
| S-08 (promedio de la clase) | Aceptar. | No |
| S-09 (`/clases/{claseId}/mis-calificaciones`) | Aceptar: pasa por el sexto paso de la cadena; `ARCHITECTURE.md` §7 se corrige con A-6. | No |
| S-10 (sección "Calificaciones" al final) | Aceptar. | No |
| S-11 (`CALIFICACION_PUBLICADA` con versión) | Aceptar. | No |
| S-12 (tras el `409`, avisa, descarta y recarga) | Aceptar: es la regla de ESSENTIALS. Con M-02, también cuando cambian los puntos. | No |
| S-13, S-14, S-16, S-17, S-18, S-20 | Aceptar. S-14: los enlaces relativos a la ruta (`../tareas/…`) resuelven bien desde la ruta hija `calificaciones`; que CAL-1D01 lo pruebe con el router real en las dos ramas, como ya dice. | No |
| S-15 (no absorber `formatearFechaDeClase`) | Aceptar: es refactor con cambio de comportamiento. Pero cambia un destino que fijó el humano ("el próximo encargo que toque `lib/format.ts`"). | **Sí**: confirmar el nuevo destino (un `chore`). |
| S-19 (recarga fallida del gradebook con datos, sin aviso) | Aceptar: vista de solo lectura, se vuelve a pedir al enfocar. | No |
| A-1 (migración) | Aceptar, con M-01 resuelto. | La aprueba el humano por escrito (carril sensible). |
| A-2 y A-3 | Aceptar. A-3 es el cambio mínimo correcto (las filas `calificado` fabricadas cumplen el `CHECK` nuevo). | No |
| A-4 (código compartido del frontend, con el movimiento de `useFocoAlPerderseElControl` a `components/foco/`) | Aceptar dentro de 01d, paso 1: es un movimiento con reexportación, sin cambio de comportamiento, con CAL-1D08, la suite completa en verde antes de seguir y PA-07. Copiarlo sería la cuarta copia de un mecanismo con unificación pendiente (regla 5). Es, aun así, un refactor dentro de un encargo de funcionalidad (`AGENTS.md`: "no mezcles refactor con funcionalidad"). | **Sí** (R-05): dentro de 01d (mi recomendación) o como 01d-0 con su propio commit. |
| A-5 y A-6 | Aceptar. | No |

### Observaciones para la ronda 0 y la implementación
- **O-1.** Ronda 0 de 01a: además del inventario del plan, recorrer las listas estáticas en crudo de N-01 y confirmar que solo rompen las de §D-R0. Base de V-01: las 175 `*.ataque` de la ronda 2 de 01e de ENTREGAS-01.
- **O-2.** Paso 3 de 01a: correr la prueba del borrado en cascada con puntajes (M-01) en cuanto exista la migración, antes de seguir. Si se elige `DEFERRABLE`, comprobar que `prisma migrate dev` no propone recrear la FK (PA-06).
- **O-3.** No agregar en `shared/` un `refine` que ate `estado: "calificado"` a `calificacion !== null`: los dobles `entregaRealizada({ estado: "calificado", puedeAnular: false })` de `entregas-01d-r1.ataque` (`:467`, `:506`, `:579`, `:935`), `entregas-01d-r2.ataque` (`:357`, `:469`) y `entregaDeAlumno({ estado: "calificado", … })` de `entregas-01e-r1.ataque:604` quedarían rojos fuera de §D-R0 (con C-5 y C-6 traen `calificacion: null`). Con el esquema del plan siguen pasando y la vista los trata como "calificada sin desglose".
- **O-4.** `leerEntregaDb` (`backend/test/ayudas-entregas.ts:104`) devuelve la fila entera: desde 01a trae `calificacion` como `Decimal` de Prisma. Las comparaciones antes y después siguen valiendo; una prueba nueva que compare la fila con un literal debe convertirlo.
- **O-5.** Con M-03, el gradebook del admin queda con dos contenedores opacos anidados (el de `ContenedorRol` y el de la vista): inocuo, pero que CAL-1D01 no cuente contextos.
- **O-6.** Comprobación humana: las cinco secciones del admin a 360 px (control segmentado que se desplaza en horizontal, §7.3) no están en la hoja; caben dentro de H-3 sin pasar de 7 puntos.

### Pruebas, inventario y lo demás que revisé (sin hallazgo)
- **§D-R0 (C-1 a C-11) y la lista cerrada por grep:** repetí el grep de los dobles de `MiEntrega` y `EntregaDeAlumno` (`puedeAnular:`, `conRetraso` con `enlaces` en pruebas): los únicos archivos son los nueve que el plan nombra, y las apariciones fuera de los constructores son llamadas con anulaciones (heredan `calificacion: null`) o los dobles en línea que la lista cerrada ya cita. Backend: los `toEqual` exactos de la entrega son los dos de `entregas.integracion.test.ts` y el `base` de `esquemas-entregas.test.ts`; las filas `calificado` fabricadas pasan con A-3; `migracion-01a-r1.ataque` aplica solo hasta la migración de ENTREGAS (`:89-93`). Frontend: las listas de secciones y clases del indicador de la lista cerrada de 01d coinciden con `clase-layout.test.tsx` y `lib.test.ts`. Las reglas estáticas de `tareas-01a-r1`, `tareas-01d-r1/r2/r3`, `estatico-r1`, `clases-r1` V-06, `estatico-02c-r1`, `refactor-01c-r1` y `ver-mas-01e-r3` no rompen con el diseño (los textos de la clase salen de `components/clase/data.ts`; nada de `features/tareas` importa de `@/features/`; `translate-x-[400%]` no casa con la regla de px, rem, em, vh o vw).
- **Orden de bloqueo (R-01):** `FOR SHARE` sobre `tareas` choca con `FOR NO KEY UPDATE OF t` de `editarTarea` (`tareas.ts:414`) y con `FOR UPDATE OF t` de `borrarTarea` (`:538`), y no con el `FOR KEY SHARE` de `bloquearTareaParaEntregar` (`entregas.ts:229`), que sigue siendo el único de su archivo. Todas las rutas toman primero la tarea; la FK de los puntajes toma `FOR KEY SHARE` de criterios que solo `editarTarea` borra después de esperar en la tarea. No encuentro ciclo. `FOR SHARE` no casa con ninguna lista estática (la de `muro.integracion.test.ts:593` filtra además por `publicaciones`).
- **Edición concurrente:** `exigirVersion` (`core/concurrencia.ts`, sin cambios) con la fila bloqueada `FOR NO KEY UPDATE`; versión 0 para la fila perezosa, igual a la que responde `GET …/entregas/:alumnoId` sin fila (`entregas.ts:517-536`). Anular o volver a entregar y otra calificación suben la versión: `409 ENTREGA_MODIFICADA`. Con M-02, completo.
- **P-04 y `editarTarea`:** el conteo de calificadas va después de `exigirVersion` y con la tarea bloqueada; calificar no sube `tareas.version`, así que un formulario de la tarea abierto antes de la primera calificación recibe `TAREA_CON_CALIFICACIONES`, no `TAREA_MODIFICADA`. Correcto.
- **Cálculo (RN-05):** los cinco casos de `AGENTS.md` están en CAL-1A05 (a) a (e), con la regla de P-01 de TAREAS-01 en (f) y (g); cuentas en centésimas enteras; redondeo al final.
- **Gradebook y "Mis calificaciones":** agregados por `GROUP BY` sin contadores guardados, sin N+1 (CAL-1B04), cursores comprobados en la misma instantánea, índices existentes (`tareas(clase_id, fecha_limite)`, el único `(tarea_id, alumno_id)`, `entregas_alumno_id_idx`), `requireOwnership` con `admin` en `roles` explícitos, estudiante con inscripción y siempre `perfilDe(request).id`; sin estado de pago, restricción, correo, rol ni `version` (RN-02, S-11 de ENTREGAS-01).
- **`CALIFICACION_PUBLICADA`** se encola con el ejecutor de la transacción (`alGuardar`), sin consumidor ni cambio en `workers/`.
- **Autorización por endpoint, sin `LOCK TABLE`, PA-07, ids `CAL-nn`, lista cerrada por subentrega, copia del plan antes de cada enmienda y matriz desde el primer resumen:** presentes (con N-05 para completar la matriz).
- **"No se toca"** cubre `middleware/`, `adapters/auth`, `infra/`, `package.json` y las ayudas compartidas salvo A-3; `adapters/db/inscripciones.ts` queda intacto (solo se importa `condicionesDePaginaDeAlumnos`, ya exportada en `:67`).
- **Textos:** tono de `DESIGN.md` §9, sin palabras prohibidas ni emojis; salvo N-06.
- **Comprobación humana:** 7 puntos, solo lo que las pruebas no ven; cabe en 10 minutos si H-3 absorbe O-6.

### Carril y modelo
- **Carril sensible: confirmado** (migración, edición concurrente sobre `entregas.version`, bloqueo nuevo sobre `tareas`, datos de alumnos junto al estado de pago y la restricción).
- **Programador `opus`, esfuerzo `medium`: confirmado** (frontmatter de `.claude/agents/programador.md`). Detalle: la tabla de agentes de `AGENTS.md` todavía dice `sonnet`; manda el frontmatter, pero conviene que el orquestador alinee el texto.

### Preguntas P-01 a P-05 (mi recomendación también está en la columna del plan)

| Id | Arquitecto | Manager | Por qué |
|---|---|---|---|
| P-01 "Devolver" | (a) | **(a)**, coincido | RF-36 dice "publicar la calificación"; un solo estado nuevo, sin reglas de borrador. Efecto a aceptar: no existe "quitar una calificación", solo recalificar. (b) y (c) se suman después sin migrar. |
| P-02 Comentario de la devolución | (a) | **(a)**, coincido | Una sola conversación por entrega, sin columna nueva; el aviso único es `CALIFICACION_PUBLICADA` (R-10). Efecto a aceptar: el comentario no se edita ni se borra (S-04 de ENTREGAS-01). |
| P-03 Calificar a quien no entregó | (c) | **(c′)**, variante de menor riesgo | Solo cuando la entrega ya está cerrada (fecha límite vencida **y** la tarea no acepta tardías). Con (c), un cero provisional bloquea para siempre a un alumno que todavía tenía derecho a entregar tarde, y no hay forma de quitar la calificación; las tareas nacen aceptando tardías (`acepta_tardias` por defecto `true`). Con (c′), la maestra que quiere poner ceros cambia antes la tarea a "No aceptar" (se puede aunque tenga calificaciones: no toca puntos ni rúbrica). Cuesta leer `acepta_tardias` en el bloqueo de la tarea y usar `entregaCerradaAhora` en el panel. Si el humano prefiere menos pasos, (c) con la nota del panel es aceptable. |
| P-04 Rúbrica y puntos con calificaciones | (a) | **(a)**, coincido | Una sola fuente de verdad para la nota, el desglose y el encabezado del gradebook. Con N-02 (los ids se conservan siempre que la rúbrica llega idéntica). (c) solo si el humano quiere corregir erratas de un criterio ya calificado. |
| P-05 Porcentaje dentro de una categoría | (a) | **(a)**, coincido | El mismo criterio "por puntos" que RN-05 ya fija para la clase sin categorías; el modal explica una sola regla. |

### Documentos a actualizar
- Los de "Documentos a actualizar" del plan, con estos ajustes: §8 de `DESIGN.md` según M-03; R-07 y `ARCHITECTURE.md` §14 (fila `puntajes_rubrica`) según la FK que resulte de M-01; el texto de `PRD.md` §11 que falta (N-09); y el destino nuevo de `formatearFechaDeClase` en `docs/ESTADO.md` §3, si el humano lo confirma (S-15).
- `AGENTS.md`, tabla de agentes: el modelo del `programador` (ver "Carril y modelo"), cuando el humano lo autorice.

### Para el humano
1. Responder P-01 a P-05; en P-03, elegir entre (c) y (c′).
2. S-04/R-13: si un alumno inscrito tarde puede aparecer "En riesgo" por tareas que vencieron antes de su alta.
3. S-15: el nuevo destino del pendiente `formatearFechaDeClase`.
4. A-4/R-05: mover el gancho de foco dentro de 01d (mi recomendación) o en una 01d-0 con su propio commit.
5. S-01: si el admin debe poder calificar.
6. Con P-04 (a), el formulario de la tarea no sabe de antemano que los puntos y la rúbrica están congelados: la maestra lo descubre al guardar y deshace a mano. Se evalúa en H-5; mejorarlo (una marca en la respuesta de la tarea) sería otro encargo.

Siguiente paso: el arquitecto corrige M-01 a M-03 (y lo que quiera de N-01 a N-10) en una enmienda, con la copia previa de `plan.md`; vuelvo a revisarla con `git diff --no-index` contra esa copia.

Columna "Recomendación del manager" llenada en `plan.md` (solo esa celda de P-01 a P-05; `git diff --no-index` contra la copia previa: 5 líneas cambiadas, ninguna otra). SHA-256 de `plan.md` resultante: `5208ac75f04291bd77092a73832545b8fb7d0af02449712795b42e1a4dd0c4e3`.

## Revisión de la Enmienda 1 — CALIFICACIONES-01
Veredicto: **APROBADO CON OBSERVACIONES**. M-01 a M-03 quedan resueltos, N-01 a N-10 atendidos y no aparece nada que bloquee. Las dos observaciones nuevas (N-11 y N-12) se corrigen en la ronda 0 o al aplicar los documentos, sin otra enmienda.
Base: `git diff --no-index` completo contra la copia del orquestador `copias-plan/plan-calificaciones-antes-enmienda1-5208ac75.md` (SHA-256 `5208ac75…`, comprobado). Resultado: `plan.md` SHA-256 `50b7facb1b15e05628dc961d250835b17dd8e0e9536476624bc7d4a7736b6ce9`, 954 líneas; 64 bloques, 150 líneas agregadas y 74 quitadas. Cada bloque lleva la marca "Enmienda 1" o es el resumen final. La columna "Recomendación del manager" no cambió. Verificación propia: lint, test y build no ejecutados (sigue siendo revisión de plan).

### M-01 (FK diferida): resuelto, y la PARADA es contingencia, no probabilidad
- **¿Lo resuelve?** Sí. Una FK `DEFERRABLE INITIALLY DEFERRED` aplaza al `COMMIT` solo la comprobación `NO ACTION`; las acciones `CASCADE` de las demás FK (entregas → puntajes, tareas → criterios) siguen corriendo al final de la sentencia (la documentación de PostgreSQL dice que las acciones referenciales distintas de `NO ACTION` no se difieren). Al confirmar, la cascada ya borró los puntajes y la comprobación pasa, sin importar el orden de los disparadores. Eso vale para el borrado confirmado de la tarea, para el de la clase y para la limpieza de las pruebas, que borra clases con sentencias sueltas: cada una se confirma sola y la comprobación corre al confirmar.
- **¿Es real el riesgo de deriva con Prisma 7?** Lo considero bajo. Prisma no modela la diferibilidad de una FK, así que su comparación no la ve distinta de la que espera `schema.prisma` (mismo nombre, columnas, destino, `ON DELETE` y `ON UPDATE`). El proyecto ya convive con objetos que Prisma no expresa, escritos a mano y sin deriva: los `CHECK` de TAREAS y ENTREGAS y el índice único parcial del admin, que AUTH-01 verificó con el mismo `migrate diff` (`docs/trabajo/AUTH-01-autenticacion-basica/plan.md:23`, `:96`).
- **Decisión:** se queda la FK diferida, no `CASCADE`. R-14 y PA-06 quedan como contingencia razonable; no lo marco ni M ni N. Detalle para el paso 3: usar la forma exacta del precedente, `npx prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --exit-code` (código 0 y "No difference detected").
- **CAL-1A19, CAL-1A20 y PA-10:** correctos.
  - CAL-1A19 recorre el borrado confirmado del admin por la API, una vez con puntajes por SQL (paso 3) y otra con calificaciones hechas por la API (paso 7).
  - CAL-1A20 borra la clase por SQL y cubre la limpieza de las pruebas, que era el otro camino que rompía.
  - CAL-1A01 comprueba `condeferrable` y `condeferred` en `pg_constraint` y que borrar un criterio con puntajes falle al confirmar.
  - PA-10 prohíbe cambiar a `CASCADE` o tocar `borrarTarea` sin el humano.
- **R-07:** reescrito con criterio: un fallo ruidoso al revertir, en lugar de borrar el desglose en silencio.

### M-02 (lo que se vio de la tarea): completo
- **Sin rúbrica:** `puntosVistos` contra los puntos de la fila bloqueada `FOR SHARE`, antes de validar rangos.
- **Con rúbrica:** los ids enviados contra los de la rúbrica vigente. Con N-02, una rúbrica se reemplaza solo si cambia el número de criterios, un texto o un puntaje máximo, y entonces cambian todos los ids. Así, ids iguales implican mismos textos y mismos máximos, y la comparación de ids cubre el cambio de máximos. Los puntos de la tarea los cubre `puntosVistos`.
- **El `409` no deja nada a medias:** todo ocurre antes del paso 8; la única escritura previa, la fila perezosa, se revierte con la transacción (N-08).
- **Frontend:** el formulario toma puntos y rúbrica al montarse. CAL-1C01 y CAL-1C05 fijan que el cuerpo y las etiquetas usan los de apertura.
- **No usar `tareas.version`:** bien razonado (mover de tema la sube).

### M-03 (gradebook sin vidrio): resuelto
- **El mecanismo:** con `data-material="opaco"` en la raíz de `gradebook-view.tsx`, `styles/tokens.css:83-91` lleva `--glass`, `--glass-strong` y los filtros a `--surface` y `none`. El `Card` (`vidrio`) y los cuatro `outline` (`vidrio-fuerte`, con borde de tinta por `in-data-[material=opaco]`) quedan opacos sin cambiar de clase.
- **C-12:** es el cambio mínimo de `styles/clases-r1.ataque.test.ts` V-07. Su última aserción (`:350-352`) exige que `data-material` y `data-densidad` vivan solo en `contenedor-rol.tsx`; se suma una ruta y las listas de vidrio no cambian, porque el gradebook no escribe clases de vidrio.
- **`contexto-r1.ataque`:** no rompe.
- **CAL-1D09:** exige el atributo una sola vez y ningún `data-densidad`.
- **Sin `data-densidad`:** aceptable, porque los controles ya son `sm` y no hay campos.

### N-01 a N-10, uno por uno
| Id | Estado |
|---|---|
| N-01 | Atendido. §D-0.9 trae la lista completa de palabras prohibidas también en comentarios, para backend y frontend; el paso 8 bis pide el grep en cada resumen; CAL-1A18 y CAL-1C13 lo fijan. La excepción de `data-material` en `gradebook-view.tsx` es coherente con C-12. |
| N-02 | Atendido. CAL-1A07 y CAL-1A12 d cubren los dos lados. Lo comprobé con mi grep: `tareas-version.integracion:214-280` y `tareas-01a-r1.ataque:371-403` comparan criterios solo antes y después de un `409`, y `tareas.integracion` PR-1B08 cambia la rúbrica. Ninguna exige ids nuevos con una rúbrica idéntica. |
| N-03 | Atendido. El formulario interno queda en el mismo archivo, así que el `enEspera=` de C-7 no se mueve; lo cubren CAL-1C14 y la fila nueva de la matriz. |
| N-04 | Atendido. Ahora recarga, reinicia y lleva el foco al `h3`; el orden de los efectos (el hijo antes que el gancho de la vista) está explicado. Ver N-11 para un estado vecino. |
| N-05 | Atendido. La matriz trae las columnas y filas que faltaban (edición de una tarea calificada con su vecino `TAREA_MODIFICADA`, "Ver cálculo" con una recarga en vuelo, filtro con "Ver más tareas" en vuelo). |
| N-06 | Atendido (`vencimientoDe`, CAL-1D04). |
| N-07 | Atendido. `PUNTOS_MAXIMOS` existe en `shared/src/tareas.ts:23`. |
| N-08 | Atendido. |
| N-09 | Atendido (texto de §11). |
| N-10 | Atendido (`showCloseButton={false}`, portal, CAL-1D05). |

### Problemas que no bloquean (nuevos)
- **N-11 — La recarga tras `409 ENTREGA_NO_CALIFICABLE` pide solo la entrega.** Que la entrega sea calificable depende de la tarea: su fecha límite y, con (c′), si acepta tardías. Si otra persona movió la fecha límite hacia adelante (o, con (c′), volvió a aceptar tardías), el servidor responde `ENTREGA_NO_CALIFICABLE`, pero la consulta de la tarea en caché sigue vieja. Tras recargar solo la entrega, `sePuedeCalificar` vuelve a pintar el formulario y el siguiente guardado da otro `409`. Así sigue hasta que la tarea se renueve por otra vía. Es un estado vecino del mismo mecanismo. Qué se espera: con `ENTREGA_NO_CALIFICABLE`, `recargarTrasConflicto` pide la tarea y la entrega a la vez, como con `RUBRICA_MODIFICADA`, con su fila en §D-14 y su caso en CAL-1C06. Puede entrar como precisión del programador en 01c sin otra enmienda, si el orquestador lo registra en `aprobacion.md`.
- **N-12 — Los textos de documentos no recogen M-02.** La viñeta "Edición concurrente" de ESSENTIALS (`plan.md`, "Documentos a actualizar") y la fila `calificaciones` de `ARCHITECTURE.md` §7 siguen sin decir que calificar exige también los puntos de la tarea que se vieron (`puntosDeLaTarea`, `409 RUBRICA_MODIFICADA`). Hay que agregarlo al aplicar los documentos al cerrar 01a y 01b (A-6).

### §D-R0 tras la enmienda
- **C-1 a C-12 y la lista cerrada:** repetí el grep de los inventarios que la enmienda podía mover:
  - la lista de `data-material` y `data-densidad` (C-12);
  - las listas de vidrio de V-07 (sin cambio);
  - `enEspera=` (C-7 y C-8 sin cambio: el formulario interno vive en `panel-de-calificacion.tsx`);
  - los borrados de O-4 (`criterioRubrica.deleteMany` sigue);
  - las comparaciones de criterios de TAREAS (N-02 no las rompe);
  - las filas `calificado` fabricadas (con A-3, y con la FK diferida no cambia nada: no tienen puntajes).

  No encuentro otra prueba existente que rompa. Los rojos esperados de 01d suman C-12 y dicen bien "pasos 4 y 5".
- **Lista cerrada de normales:** no cambia con la enmienda (01a, 01b, 01c sin ninguna, 01d).

### Coherencia global
- **Menciones residuales:** sin residuos de los textos anteriores ("sin `data-material`", "misma sentencia", la invalidación de `ENTREGA_NO_CALIFICABLE` desde el gancho, `esEntregaNoCalificable`, "C-8 a C-11").
- **"No se toca":** cubre todo lo que la enmienda toca: `features/calificaciones` es nuevo; `borrarTarea` no cambia.
- **Pruebas nuevas:** CAL-1A19 y CAL-1A20 están en 01a; CAL-1C14 en 01c.
- **PARADAS:** PA-10 es nueva y PA-09 queda precisada para (c′).
- **P-03:** el diseño está escrito para (c) y (c′), así que la respuesta del humano no exige otra enmienda.
- **Decisiones para el humano:** quedan en la tabla nueva del plan.

### Observaciones para la ronda 0
- **O-7.** Ronda 0 de 01d: C-12 junto con C-8 a C-11. En 01a, el tester comprueba en crudo la lista de §D-0.9 (O-1) sobre `d998282`, para tener la línea base.
- **O-8.** `ConClaseDeLaRuta` muestra su carga y su "sin acceso" antes de que exista la raíz opaca del gradebook. La píldora de `Cargando` (vidrio fuerte) se verá un instante sobre el fondo, como en las demás secciones. Es aceptable; que §7.28 de `DESIGN.md` lo diga para que el tester no lo reporte.
- **O-9.** N-11, si el orquestador lo registra como precisión para 01c.

### ¿Puede ir al humano?
**Sí.** El plan puede entregarse al humano para que responda P-01 a P-05 (en P-03, entre (c) y (c′)), las decisiones de la tabla nueva (S-04/R-13, S-15, A-4/R-05, S-01, H-5) y sus vetos de S y A, con la aprobación explícita por escrito del carril sensible. Si responde algo distinto de lo ya escrito (salvo (c′), que ya está diseñada), aplica PA-09: enmienda previa con copia del plan.

---

## Verificación del resumen — CALIFICACIONES-01a
Veredicto: **RESUMEN ACEPTADO**: el tester puede atacar (ronda 1 de 01a). Ninguna cifra difiere, cada viñeta CAL-1A01 a CAL-1A20 tiene su caso y no hay nada que bloquee. Resumen verificado: `resumen-programador.md`, "## 01a — implementación" (SHA-256 `c717f785e98101513bd184aeb5abd16089b11393191cc86b893c077391976ac4`, comprobado con `sha256sum`).

### Mis corridas (una a la vez; Docker Desktop encendido; ninguna con `--write` ni `--fix`)
| Paquete | Comando | Código | Última línea |
|---|---|---|---|
| shared | `npm run lint` | 0 | `All matched files use Prettier code style!` |
| shared | `npm run build` | 0 | `> tsc -p tsconfig.json` |
| backend | `npm run lint` | 0 | `> tsc -p tsconfig.json --noEmit && tsc -p tsconfig.test.json` |
| backend | `npm run build` | 0 | `> tsc -p tsconfig.json` |
| backend | `npx prisma validate` | 0 | `The schema at prisma\schema.prisma is valid 🚀` |
| backend | `npm run test` | 0 | `Tests  2523 passed (2523)` (`Test Files  203 passed (203)`, 148.6 s) |
| backend | `npx prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --exit-code` | 0 | `No difference detected.` |
| backend | `npx prisma migrate status` | 0 | `Database schema is up to date!` (14 migraciones) |
| frontend | `npm run lint` | 0 | `> tsc -b` |
| frontend | `npm run test` | 0 | `Tests  2536 passed (2536)` (`Test Files  166 passed (166)`) |
| frontend | `npm run build` | 0 | `✓ built in 787ms` |

En la salida completa del backend: `40P01` 0, `deadlock detected` 0, `"Error no controlado"` 10 y `"code":"P2028"` 5 (`grep -o … | wc -l`). Son los mismos que el inventario I-1 y la lista de `P2028` de la ronda 0.

### Cifras (las suyas, las mías y si coinciden)
| Cifra | Resumen | Mía | ¿Coincide? |
|---|---|---|---|
| Casos del backend (`npx vitest list \| wc -l`) | 2523 | 2523 | sí |
| Archivos del backend (`npx vitest list --filesOnly \| wc -l`) | 203 | 203 | sí |
| Casos nuevos frente a la ronda 0 (2422 en 192) | +101 en 11 archivos | +101 en 11 (18+14+6+9+13+3+13+8+7+5+5) | sí |
| Casos por archivo nuevo (11 cifras) | las 11 del resumen | las 11 iguales (`sed -E 's/ > .*//' \| sort \| uniq -c`) | sí |
| Corrida del backend | 2523 passed / 203 | 2523 passed / 203 | sí |
| Corrida del frontend | 2536 passed / 166 | 2536 passed / 166 | sí |
| `40P01` / `deadlock` / `Error no controlado` / `P2028` | 0 / 0 / 10 / 5 | 0 / 0 / 10 / 5 | sí |
| Últimas líneas de `lint` y `build` (shared, backend, frontend) y `prisma validate` | las de su tabla | las mismas; la de `vite build` cambia solo en el tiempo (1.48 s contra 787 ms) | sí |
| `*.ataque` iguales a la tabla de la ronda 0 | 175 de 175 | 175 de 175 (`sha256sum` contra la tabla del `reporte-tester.md`; solo difería el nombre `apiClient`, que mi `tr` pasó a minúsculas) | sí |
| `migrate diff` | `No difference detected.` (código 0) | igual | sí |
| Títulos citados en "Pruebas requeridas" | 96 títulos completos, más los de CAL-1A02 abreviados con "…" | los 96 aparecen literales en `npx vitest list`; los 7 de CAL-1A02, con su prefijo; 101 casos con `CAL-1A` | sí |

### Cotejo viñeta por viñeta (leí el código de cada caso)
| Viñeta | ¿Existe? | ¿Prueba lo que pide? |
|---|---|---|
| CAL-1A01 | 10 casos en `calificaciones-migracion.integracion` | Sí. Cada `CHECK` se rechaza por su nombre con SQL parametrizado: según estado (4 combinaciones), en rango (−0.01 y 1000.01 en las dos tablas; 0 y 1000 pasan), fecha según estado relajada (c′) y sin fecha sin retraso ni enlaces. La FK en `pg_constraint` tiene `condeferrable` y `condeferred` verdaderos, `confdeltype` `a`, y la de `entrega_id` es `c`. Borrar un criterio con puntajes pasa dentro de la transacción y falla al confirmar, sin dejar nada borrado. El borrado de la publicación se lleva todo. La migración se aplica en un esquema aparte sobre datos de ENTREGAS-01 (asignada y entregada, archivo, enlaces e hilo), que quedan iguales; los cinco `CHECK` quedan `convalidated` y la FK diferida; una asignada de antes puede pasar a calificada sin fecha. |
| CAL-1A02 | 7 casos | Sí: identidad, 7/9 de 10 = 7.78, parcial 2.5 y 4, todo 0 y todo al máximo, mitades hacia arriba (0.125 → 0.13), 0.1 + 0.2 y los extremos 1 y 1000. |
| CAL-1A03 | 7 casos | Sí, incluido el orden de §D-2.2 (un criterio de otra tarea fuera de rango da 409, no 400) y los puntos vistos antes que todo error de `decidirCalificacion`. |
| CAL-1A04 | 1 caso, la matriz 3 × 3 × 2 | Sí, con la regla (c′): `asignado` es calificable solo con la fecha vencida hace 1 ms y sin tardías; en la fecha exacta no lo es (`esTarde` es estricto). |
| CAL-1A05 | 14 casos, (a) a (k) | Sí, los cinco casos de `AGENTS.md` y los de P-01/P-05. |
| CAL-1A06 | 6 casos | Sí. |
| CAL-1A07 | 3 casos | Sí, con N-02: la rúbrica idéntica nunca se reemplaza. |
| CAL-1A08 | 8 casos, más 1 de CAL-1A18 en el mismo archivo | Sí. |
| CAL-1A09 | 2 casos | Sí: 7.78 escalado, `fecha_calificacion` entre antes y después, `version` 2, el trabajo con datos exactos y un id distinto del de la entrega, fecha, retraso y enlaces intactos. El comentario aparece en los dos hilos y no hay ningún trabajo de la cola del hilo para esa entrega. |
| CAL-1A10 | 2 casos | Sí. |
| CAL-1A11 | 1 caso | Sí. La foto de `fotoDeCalificar` incluye entrega, puntajes, comentarios y trabajos. |
| CAL-1A12 | (a), (b), (c), (d) ×3, (e) y (g): 8 casos | Sí. **(f) sin caso propio: lo acepto.** Cada respuesta HTTP de (a) a (e) pasa por `respuestaDe` (estado < 500 y cuerpo sin `deadlock`, `P2003` ni `40P01`), y en la corrida completa hay 0 `40P01` y 0 `deadlock detected`. (g) llama al adaptador y espera `AppError` `SERVICIO_OCUPADO` 503, sin nada encolado ni escrito. Así no suma una línea de `P2028` al inventario de PA-07, y lo dice en un comentario. |
| CAL-1A13 | 4 casos | Sí, con (c′): asignada sin vencer, sin fila y con fila → 409 sin crear fila ni escribir; vencida en una tarea que acepta tardías → 409 sin fila; sin fila, vencida y sin tardías → 200, calificada sin fecha, y el alumno recibe `ENTREGA_CALIFICADA` al entregar, anular y subir, y ve su calificación sin `version`. |
| CAL-1A14 | 3 casos | Sí: 11 cuerpos inválidos → 400 `VALIDACION`, incluidos `version` −1, 1.5 y "1", el criterio repetido en mayúsculas y el cuerpo como arreglo; nada escrito ni encolado. |
| CAL-1A15 | 3 casos | Sí, con las llaves exactas de `miEntrega`, `entregaDeAlumno` y la calificación, y el desglose insertado al revés y leído en el orden de la rúbrica. |
| CAL-1A16 | 5 casos | Sí. La foto incluye `tarea` (con `trabajo_id`), publicación, criterios, puntajes, archivos y trabajos del recordatorio. Ocho cambios prohibidos (otro orden, rúbrica vaciada, uno permitido junto con uno prohibido) → 409 sin escribir. |
| CAL-1A17 | 7 casos | Sí. **El admin recibe 403** y su respuesta entra en el caso "sin fuga". El estudiante es un inscrito no restringido (403 por rol), la restringida da `ACCESO_RESTRINGIDO`, y para el cambio pendiente se usa un maestro de la clase. El caso "sin fuga" junta todas las respuestas del archivo (al menos 18) y busca `estadoPago`, `accesoRestringido`, `motivoRestriccion`, `email`, `"rol"`, `deudor` y `@`. Ver N-17. |
| CAL-1A18 | 5 casos en `calificaciones-estatico`, más 1 en `esquemas-calificaciones` | Sí, salvo la exclusión de `colas.ts` (N-13). |
| CAL-1A19 | Por SQL en el paso 3 (`calificaciones-migracion`) y por la API en el paso 7 (`calificaciones.integracion`) | Sí: 204, y no quedan tarea, publicación, criterios, entregas, puntajes ni comentarios; los archivos quedan `descartado` sin contexto. |
| CAL-1A20 | 2 casos | Sí: un `DELETE FROM clases` parametrizado y la limpieza normal con puntajes. |

### Desviaciones declaradas
1. **Migración en dos invocaciones** (`--create-only` y después `migrate dev`): **la acepto.** Es lo que A-1 autoriza, hecho en la única forma que permite escribir la FK diferida y los `CHECK` antes de aplicar, sin editar una migración ya aplicada. Lo comprobé: el archivo coincide con §D-1 sentencia por sentencia (columnas, tabla, PK, índice `puntajes_rubrica_criterio_id_idx`, FK de `entrega_id` en `CASCADE`, FK de `criterio_id` en `NO ACTION DEFERRABLE INITIALLY DEFERRED` con el mismo nombre, tres `CHECK` nuevos, el de fecha reemplazado con su nombre y el de sin fecha sin retraso ni enlaces). `migrate diff` no ve diferencias y `migrate status` está al día. Es compatible hacia atrás: las columnas admiten nulos, la tabla es nueva, los `CHECK` relajan o solo restringen lo que ENTREGAS-01 nunca escribe (`calificado`), y la base existente ya cumplía el `CHECK` nuevo de sin fecha.
2. **`exigirEntregaCalificable` repite el cuerpo de `entregaCerrada`**: **la acepto.** La firma de §D-2.1 recibe solo `{ fechaLimite, aceptaTardias }` y `core/entregas/` no se toca. Llamar a `entregaCerrada` obligaría a inventar `requiereAdjuntos`, que es peor. Usa el mismo `esTarde`, el comentario nombra el acoplamiento y CAL-1A04 recorre la matriz. Queda un riesgo conocido: si algún día cambia la regla de cierre, hay que cambiarla en los dos lugares. No pide acción.
3. **`editarTarea` lee los criterios siempre**: **la acepto.** No es una desviación del diseño: §D-4.2 dice "(Enmienda 1, N-02: se leen siempre, para comparar)". La que quedó desfasada es la tabla "Acceso a datos" del plan ("solo con calificadas"). Es una consulta por el único `(tarea_id, orden)`, de 20 filas como máximo. Ver N-18 (corrección del texto del plan, sin enmienda).
4. **`puntajeEnviadoSchema` interno**: **la acepto.** El plan lo escribe en línea dentro de `calificarEntregaSchema` y no lo nombra; es `z.strictObject` (lo comprueba CAL-1A18) y el tipo público es `CalificarEntrega`.
5. `ayudas-calificaciones.ts` nuevo: dentro de lo que "No se toca" admite (ayudas nuevas en archivos nuevos).

**La exclusión de `colas.ts` en CAL-1A18 (N-01) debilita la regla, aunque poco.** Es aceptable para la primera categoría de palabras (los nombres de las colas). `colas.ts` ya los nombra en código (`COLA_AVISO_FALLIDO`, `COLA_COMENTARIO_CREADO`), `muro-c-r1.ataque:628` lo admite entre quienes los nombran y el comentario de `:60` es anterior al encargo, así que ninguna lista estática cambia por él. Lo que no se justifica es sacar el archivo entero: `colas.ts` es un archivo cambiado del encargo y queda sin vigilar para las otras tres categorías (`DELETE FROM`/`TRUNCATE`, los nombres del aislamiento y `enTransaccion`/`instantaneaUnica`/`isolationLevel`), que sí pueden tumbar `lecturas-fx-r1` y `lecturas-fx-r2`. Hoy está limpio (lo comprobé con mi grep), así que no bloquea; es N-13.

### "No se toca", `*.ataque`, lista cerrada y A-2
- `git diff --stat d998282 -- <toda la lista de "No se toca" del plan, sin docs/, más docs/DESIGN.md, .claude, frontend/src salvo *.test.ts(x), los tsconfig y los vitest.config>` → **vacío**. Los cambios de `frontend/src` son 9 archivos, todos de prueba: los 4 de la lista cerrada y las 5 `*.ataque` de C-5 y C-6, que reescribió el tester.
- `*.ataque`: 175 de 175 iguales a la tabla de la ronda 0 de 01a. Ninguna modificada, saltada ni borrada por el programador.
- Pruebas normales cambiadas (`git diff -U1 d998282`): exactamente las de la lista cerrada de 01a, cada una solo con `calificacion: null`: `esquemas-entregas` 1 línea, `entregas.integracion` 2, `entregas-01d` 2, `entregas-01e` 3, `detalle-tarea-view` 1, `router-01e` 1. El doble "cerca de `:496-504`" de `entregas-01e` es, como dice el resumen, una llamada a `entregaDeAlumno(...)`, que hereda el campo.
- A-2 y A-3. En `db/tareas.ts` cambió solo `editarTarea`: la importación de `exigirRubricaCongelada`, `puntos` en `FilaBloqueadaConVersion` (que solo usa `editarTarea`; `moverATema` usa `FilaBloqueada`), `t.puntos` en el `SELECT`, el conteo y la lectura de la rúbrica después de la versión y antes de la fecha, y el reemplazo condicionado. En `handlers/tareas/entregas.ts`, solo la importación de los constructores y el uso de `entregaDeAlumnoParaResponder` en el `GET`. `db/inscripciones.ts`: ninguna línea. `ayudas-entregas.ts`: solo `crearEntregaDePrueba` y su tipo de opciones. `colas.ts`: la cola en la lista de avisos y el comentario.

### Capas, cadena y transacción
- `handlers/calificaciones.ts` es delgado: `protegido({ roles: ["maestro"], pertenencia: "propiedad" })` (S-01: el admin fuera), y valida parámetros y cuerpo después de `conTextosNormalizados`. No compara rol ni relación, y no toca Prisma ni SQL. Encola solo `COLA_CALIFICACION_PUBLICADA`, desde `alGuardar`, con el `sql` de la transacción y un `eventoId` nuevo. Responde con el esquema estricto `entregaDeAlumnoRespuestaSchema`.
- `adapters/db/entregas.ts`, `calificarEntrega`: tarea `FOR SHARE` (el único del archivo), después alumno inscrito, criterios, fila perezosa, entrega `FOR NO KEY UPDATE`, `exigirVersion(…, entregaModificada)`, `exigirEntregaCalificable` (c′) y `decidirCalificacion` (puntos vistos primero, M-02). Por último las escrituras, sin ciclos: `deleteMany`/`createMany`, `update` con `version: { increment: 1 }` y el comentario, y luego `alGuardar` y la relectura en la misma transacción. Es el orden de §D-3 y §D-0.5.
- `core/calificaciones/` solo importa de `core/` (`entregas/entregas.js`, `errores.js`). Prisma solo aparece en `adapters/db` (el `Decimal` se convierte con `.toNumber()` ahí). Ninguna respuesta nueva selecciona ni devuelve el estado de pago, la restricción, el correo ni el rol.
- Grep propio de §D-0.9 en los comentarios de los 12 archivos nuevos o cambiados de `backend/src` (líneas que empiezan con comentario y, aparte, todas las líneas sumadas del diff): una sola coincidencia, `adapters/queue/colas.ts:60` (`AVISO_FALLIDO`, anterior al encargo). Las líneas sumadas solo traen `enTransaccion(` en código de `adapters/db/entregas.ts`, que está permitido.

### Hallazgos
**Ningún M nuevo.** Observaciones, sin bloqueo:
- **N-13 — CAL-1A18 (N-01) saca `colas.ts` entero.** Dónde: `backend/test/calificaciones-estatico.test.ts:86-89`. Qué se espera: que `colas.ts` entre en la lista de archivos y solo omita la categoría de los nombres de cola, de modo que las otras tres sigan vigiladas en un archivo cambiado del encargo. El programador lo puede corregir en su primera corrección de 01a; si la ronda 1 sale en verde, se corrige al empezar 01b, que vuelve a tocar archivos vigilados.
- **N-14 — Valores por defecto en ramas inalcanzables de `decidirCalificacion`.** Dónde: `backend/src/core/calificaciones/calificar.ts`, `calificacionDirecta ?? Number.NaN`, `maximoDe.get(…) ?? 0` y `puntosDe.get(…) ?? 0`. `formaCorresponde` las deja inalcanzables, pero si una falla futura las alcanzara, `?? 0` aceptaría en silencio 0 puntos de un criterio desconocido. `CLAUDE.md` pide valores por defecto explícitos: mejor un `ERROR_INTERNO` explícito. Es un detalle de estilo.
- **N-15 — `if` anidado en `calificacionDe`.** Dónde: `backend/src/adapters/db/entregas.ts`, `calificacionDe` (`if (estado !== "calificado") { if (…) throw …; return null }`). Se aplana con dos guardas. Es un detalle de estilo.
- **N-16 — La FK diferida mueve su `FOR KEY SHARE` al `COMMIT`.** Con `INITIALLY DEFERRED`, la comprobación de `puntajes_rubrica.criterio_id` (y su bloqueo `FOR KEY SHARE` sobre el criterio) corre al confirmar, no al insertar. No hay ciclo: el único que borra criterios (`editarTarea`) y los borrados en cascada esperan antes en la fila de `tareas`, que calificar retiene `FOR SHARE` hasta el `COMMIT`. Pero la tabla de `adapters/README.md` y §D-9 ("la FK toma `FOR KEY SHARE` de los criterios") lo describen como si fuera inmediato. Qué se espera: una frase en el README al cerrar 01a. Al tester: atacar calificar contra editar y contra borrar en los dos órdenes, con la comprobación al confirmar.
- **N-17 — "Sin fuga" de CAL-1A17 depende de los casos anteriores del archivo.** Junta las respuestas de los demás casos. Si se corre solo, falla por su precondición (≥ 18) y no pasa en vacío, así que es aceptable; queda anotado para que nadie lo parta en archivos distintos.
- **N-18 — La tabla "Acceso a datos" del plan contradice §D-4.2.** Dice "criterios (solo con calificadas)"; con N-02 se leen siempre. La corrige el orquestador en el texto del plan (o en los documentos de A-6), sin enmienda ni cambio de código.

### Veredicto
**RESUMEN ACEPTADO.** Todas las cifras coinciden con mi corrida y las 20 viñetas tienen su archivo y su título exacto, con casos que prueban lo que piden (CAL-1A12 (f) cubierto en (a) a (e)). Acepto las cuatro desviaciones; ninguna pide enmienda del arquitecto. "No se toca" está vacío, las 175 `*.ataque` siguen iguales y la lista cerrada se respetó. La ronda 1 del tester puede empezar. N-13 a N-18 no bloquean: N-13, N-14 y N-15 entran en la primera corrección del programador que toque esos archivos; N-16 y N-18 son de documentos (al cerrar 01a).

## Verificación de la corrección de la ronda 1 — CALIFICACIONES-01a
Veredicto: **RESUMEN ACEPTADO**: el tester puede hacer la ronda 2 de 01a. Todas las cifras coinciden y el diff es el descrito, sin nada de más. CAL-T-01 está en verde sin cambios, y la lista de hermanos está completa en lo que importa. Resumen verificado: `resumen-programador.md`, "## 01a — corrección de la ronda 1 (T-01)". El archivo tiene SHA-256 `6008d0659245115ed611d0af3926d3ec08fc41b28e358e9e66946ad306ab07b2`, el mismo que anota `aprobacion.md`.

### Mis corridas
Condiciones: en `backend/` y de una en una. Docker 28.5.1. La red está en el perfil Público y la regla de bloqueo de `com.docker.backend.exe` está activa. Ningún comando con `--write` ni `--fix`.

| Comando | Código | Última línea |
|---|---|---|
| `npm run lint` | 0 | `> tsc -p tsconfig.json --noEmit && tsc -p tsconfig.test.json` (antes: `All matched files use Prettier code style!`) |
| `npm run test` | 0 | `Duration  129.86s (…)`; resumen: `Test Files  206 passed (206)` · `Tests  2546 passed (2546)` |
| `npm run build` | 0 | `> tsc -p tsconfig.json` |
| `npx vitest list \| wc -l` | 0 | `2546` |
| `npx vitest list --filesOnly \| wc -l` | 0 | `206` |

No volví a correr `shared/` ni `frontend/`: no cambiaron desde mi verificación anterior. Ningún archivo de `shared/src` ni de `frontend/src` es más nuevo que este `revision.md`.

### Cifras
| Cifra | Resumen | Mía | ¿Coincide? |
|---|---|---|---|
| Casos del backend (`npx vitest list \| wc -l`) | 2546 | 2546 | sí |
| Archivos del backend (`--filesOnly`) | 206 | 206 | sí |
| Casos de `calificaciones-lecturas.integracion` | 4 | 4 | sí |
| Corrida del backend | 2546 passed / 206 | 2546 passed / 206 | sí |
| `"Error no controlado"` / `"code":"P2028"` / `40P01` | 10 / 5 / 0 | 10 / 5 / 0 (además, `deadlock detected` 0 y `Test timed out` 0) | sí |
| Últimas líneas de `lint` y `build` | las de su tabla | las mismas | sí |
| `*.ataque` iguales a la tabla de la ronda 1 del tester | ninguna tocada | 178 de 178 con `sha256sum` contra la tabla. El nombre `apiClient` difiere solo porque mi `tr` lo pasó a minúsculas; el hash es el mismo. `calificaciones-01a-r1.ataque.test.ts` tiene `252752f4…0c042` en la tabla y en el árbol | sí |
| Título de CAL-1A15b | el que cita | literal en `npx vitest list` | sí |

### Cotejo del diff
- **`backend/src/adapters/db/entregas.ts`, `listarEntregasCon`:**
  - El `count` de `entregadas` cambia `estado: { in: ESTADOS_ENTREGADOS }` por `fechaEntrega: { not: null }`.
  - Conserva `tareaId` (prefijo del único `(tarea_id, alumno_id)`) y `alumno: { activo: true, inscripciones: { some: { claseId } } }`.
  - El comentario explica el porqué. Su afirmación de que solo `entregado` y `calificado` tienen fecha es cierta: el `CHECK` `entregas_fecha_segun_estado` de la migración exige que `asignado` no tenga fecha.
- **`ESTADOS_ENTREGADOS`:** ya no aparece en `backend/src`, `shared/src` ni `frontend/src` (grep). `EstadoEntrega` sigue en uso, en `ESTADOS_DE_ENTREGA`.
- **CAL-1A15b, en `calificaciones-lecturas.integracion.test.ts`:**
  - Usa cuatro alumnas: la `entregado` de `escenario()`, una `calificado` con fecha, una `calificado` cuya fecha se borra con `$executeRaw` parametrizado y una sin fila.
  - Espera `total` 4 y `entregadas` 2. La fila sin entrega viene `calificado` con `fechaEntrega: null`, y la calificada con fecha trae su fecha.
  - Prueba lo que pide: si faltara una fila, `find` daría `undefined` y la aserción fallaría.
- **Pruebas normales:** desde mi verificación anterior solo cambió `calificaciones-lecturas.integracion.test.ts`. Los demás archivos de `backend/test` y de `src` conservan su fecha. Los únicos más nuevos son los 3 `*.ataque` del tester y el cliente generado de Prisma, que se regenera en cada corrida y que git ignora. Frente a `d998282`, las normales rastreadas tienen exactamente los cambios de la implementación: `entregas.integracion` +2 y `esquemas-entregas` +1.
- **"No se toca":**
  - `git diff --stat d998282 -- <toda la lista del plan>` está vacío.
  - En `handlers/tareas/` solo cambia `entregas.ts`, por A-2 y desde la implementación.
  - En `frontend/` solo cambian pruebas.
  - Fuera del árbol rastreado solo hay los archivos nuevos de `backend/src` y `shared/src` que pide el plan.

### Hermanos y estados vecinos
Hice mi propio grep en `backend/src`, `shared/src` y `frontend/src`, sin pruebas ni `generated/`. Busqué `"entregado"`, `"calificado"`, `"asignado"`, `estado: { in|notIn|not`, `fechaEntrega: {`, `entregadas`, `Entregaron` y `Entregó`. No hay otro lugar que use "entregado o calificado" como "entregó".

Los 14 hermanos del resumen coinciden con el código. La lista no nombra tres lugares, pero ninguno cambia la conclusión:
- **`frontend/src/features/tareas/components/tabla-de-entregas.tsx:51-56`:** la tabla de la misma vista de T-01.
  - La insignia sale de `estadoDeEntregaVisible` (hermano 8) y dice "Calificado".
  - La columna de la fecha muestra "—" cuando `fechaEntrega` es nula (hermano 2).
  - Para una calificada sin entrega, la fila dice "Calificado · —", que es verdad.
- **`backend/src/adapters/db/tareas.ts:666`:** el estado que alimenta la fila de "Trabajo de clase" del alumno; es el lado del servidor del hermano 8. Pasa el estado sin interpretarlo.
- **`backend/src/adapters/db/tareas.ts:430`:** el conteo de `calificado` de la rúbrica congelada (P-04). Cuenta "calificó", no "entregó". Está bien que también congele la rúbrica con una calificada sin entrega.

Los estados vecinos del conteo están completos y coinciden con la condición nueva: sin fila, `asignado` con fila, entregado a tiempo y con retraso, calificado con y sin fecha, alumno de baja o desactivado, recalificar y reabrir tras calificar sin entrega.

**Lo diferido está bien diferido:**
- **01b, "vencidas sin entregar" y los filtros de "Mis calificaciones":** ese código no existe en 01a y el plan ya fija la regla.
  - Por S-04 y §D-6.6, una calificada sin entrega no cuenta como vencida sin entregar; su 0 ya baja el promedio.
  - Por §D-7.2, el filtro `entregadas` usa solo `entregado` y la calificada sin entrega va a "Calificadas" (CAL-1B05).
  - Es el mismo criterio de T-01, y el plan lo pone como punto de ataque de 01b.
- **01c, `lib/estado-de-entrega.ts` y "Tu trabajo":**
  - Que muestre "Calificado" es correcto.
  - Falta la frase "No entregaste esta tarea y ya está calificada." (CAL-1C09). Es interfaz de 01c, y vive en `lib/` y en `features/tareas`, partes del frontend que 01a no toca.
  - Entre 01a y 01c, una calificada sin entrega solo se puede crear por la API, porque todavía no hay interfaz para calificar. Nada de esto debía corregirse ya.

### Arbitraje de O-r1-2: el `409 TAREA_CON_ENTREGAS` con una calificada sin entrega
**Se queda como está en 01a. Es una observación de texto para el cierre (N-19), y la redacción la decide el humano.**
- **El bloqueo es correcto** y es el del plan (§D-3 carreras (e), CAL-1A12 (e)). Una calificada sin entrega tiene una calificación que el borrado se llevaría, así que debe impedir el borrado del maestro y pedir la confirmación del admin. El conteo de `ESTADOS_QUE_CUENTAN` no cambia.
- **Lo impreciso es el texto.** Dice "Esta tarea tiene 1 entrega" cuando nadie entregó. Además, el texto del admin ("también se borrarán la entrega y los comentarios privados") no avisa que también se borran las calificaciones, y eso pasa con cualquier tarea calificada, no solo con la calificada sin entrega.
- **No se corrige ahora, por tres razones:**
  - El texto vive en `core/tareas/tareas.ts` (`mensajeTareaConEntregas`), que está en "No se toca".
  - Su redacción la modificó el humano (S-06, 2026-10-11).
  - El caso solo aparece con (c′), con la tarea cerrada y calificando a quien no entregó, y el texto no engaña sobre lo que se protege.

### Hallazgos
**Ningún M nuevo.** Observaciones, sin bloqueo:
- **N-19 — El texto del `409 TAREA_CON_ENTREGAS` no distingue entregas de calificaciones.**
  - Dónde: `backend/src/core/tareas/tareas.ts`, `mensajeTareaConEntregas`, líneas 51-58.
  - Qué se espera: que el humano decida al cerrar CALIFICACIONES-01 si el texto pasa a algo como "tiene N entregas o calificaciones" y si el del admin nombra las calificaciones que se borran. Si dice que sí, el cambio va en un encargo propio o en un ajuste de 01d, con autorización para tocar `core/tareas/`.
  - Ver "Para el humano".
- **N-20 — N-15 sigue pendiente.**
  - Esta corrección tocó `adapters/db/entregas.ts`, pero no aplanó el `if` anidado de `calificacionDe` (líneas 169-174).
  - No es culpa del programador: la instrucción de la corrección solo nombraba T-01.
  - Qué se espera: que el orquestador pase N-15 junto con N-13 y N-14 en la próxima corrección de 01a, o al empezar 01b.
- **O-r1-1 (N-17), confirmada como observación.** El caso "sin fuga" de CAL-1A17 nunca pasa en vacío: su umbral hace que falle si los otros casos no corrieron. Pero depende del orden de los casos. Se resuelve en la revisión final: o se fija el orden del archivo, o el caso junta sus propias respuestas. No bloquea la ronda 2.

### Para el humano
- **N-19:** ¿el aviso de borrado de una tarea calificada debe decir "entregas o calificaciones" y, para el admin, nombrar las calificaciones que se borran? Recomiendo que sí, con un ajuste de texto al cerrar CALIFICACIONES-01. Es tu texto de S-06 y vive en un archivo de "No se toca".

## Revisión final — CALIFICACIONES-01a
Veredicto: **CAMBIOS REQUERIDOS** (M-04 al tester y M-05 al programador; los dos son defectos de prueba, ninguno de producción). El código de 01a cumple el plan, solo el plan y todo lo de 01a del plan. Pasa las capas, la cadena, la cola, la migración y "No se toca". Pero mi primera corrida completa del backend salió en rojo por una `*.ataque` que depende de otro archivo de la suite, y una prueba normal de autorización depende del orden de sus casos. Las dos se corrigen antes del commit de 01a. Ninguna toca código de producción, así que no hace falta otra ronda de ataque: basta mi verificación.
Verificación propia: lint 3 de 3 en 0 · test backend **1 rojo en la 1.ª corrida (CAL-T-13) y verde en la 2.ª**, frontend verde · build 3 de 3 en 0.

### Mis corridas (una a la vez; Docker Desktop encendido; ninguna con `--write` ni `--fix`)
| Paquete | Comando | Código | Última línea |
|---|---|---|---|
| shared | `npm run lint` | 0 | `All matched files use Prettier code style!` |
| shared | `npm run build` | 0 | `> tsc -p tsconfig.json` |
| backend | `npm run lint` | 0 | `> tsc -p tsconfig.json --noEmit && tsc -p tsconfig.test.json` |
| backend | `npm run build` | 0 | `> tsc -p tsconfig.json` |
| backend | `npx prisma validate` | 0 | `The schema at prisma\schema.prisma is valid 🚀` |
| backend | `npm run test` (1.ª) | **1** | `npm error command C:\WINDOWS\system32\cmd.exe /d /s /c vitest run`; resumen `Test Files  1 failed \| 206 passed (207)` · `Tests  1 failed \| 2552 passed (2553)`. El rojo: `calificaciones-01a-r1.ataque.test.ts` › CAL-T-13, `expected 2 to be 1` en `:569` |
| backend | `npm run test` (2.ª, mismo árbol) | 0 | `Duration  130.76s (…)`; resumen `Test Files  207 passed (207)` · `Tests  2553 passed (2553)` |
| backend | `npx prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --exit-code` | 0 | `No difference detected.` |
| backend | `npx prisma migrate status` | 0 | `Database schema is up to date!` |
| frontend | `npm run lint` | 0 | `> tsc -b` |
| frontend | `npm run build` | 0 | `✓ built in 767ms` |
| frontend | `npm run test` | 0 | `Test Files  166 passed (166)` · `Tests  2536 passed (2536)` |

### Cifras
| Cifra | Esperada (orquestador y tester, ronda 2) | Mía | ¿Coincide? |
|---|---|---|---|
| Backend: casos y archivos | 2553 en 207 | 2553 en 207 (las dos corridas) | sí |
| Frontend: casos y archivos | 2536 en 166 | 2536 en 166 | sí |
| `"Error no controlado"` / `"code":"P2028"` / `40P01` | 10 / 5 / 0 | 10 / 5 / 0 en las dos corridas (además `deadlock detected` 0 y `Test timed out` 0) | sí |
| `*.ataque` iguales a la tabla de la ronda 2 | 179 | 179 de 179 (`sha256sum` contra la tabla, sin diferencias) | sí |
| Backend en verde | sí | **no en la 1.ª corrida** (CAL-T-13) | **no**: M-04 |
| Archivos cambiados desde mi verificación de la corrección de la ronda 1 | solo la `*.ataque` nueva | solo `backend/test/calificaciones-01a-r2.ataque.test.ts` (`find -newer revision.md`) | sí |

### Problemas que bloquean

#### M-04 — CAL-T-13 cuenta un comentario en toda la base y choca con `hilo-privado.integracion`: la suite del backend queda en rojo según cómo se crucen los archivos
Dónde: `backend/test/calificaciones-01a-r1.ataque.test.ts:567-569`, `comentario.count({ where: { texto: "é".repeat(1000) } })` con `toBe(1)`.
Por qué importa:
- `backend/test/hilo-privado.integracion.test.ts:360-363` escribe el mismo texto (`\n${"é".repeat(1000)}\n`, que queda igual tras la normalización). La base de Testcontainers es una sola por corrida y los archivos corren en paralelo. Ese archivo borra su clase en `afterAll`, así que el choque solo ocurre cuando los dos se cruzan en el tiempo.
- Por eso las corridas del tester, la del programador, mis dos verificaciones anteriores y mi 2.ª corrida pasaron, y mi 1.ª falló con `expected 2 to be 1`. Ni la prueba ni el código cambiaron entre las dos.
- Una suite que falla al azar no cumple "`lint`, `build` y `test` en verde" de la definición de terminado. Además, enseña a ignorar los rojos, justo cuando 01b va a correr la suite muchas veces.
- No es un defecto de producción: la calificación y su comentario se guardan bien.
Qué se espera:
- **El tester** corrige su propia prueba con el cambio mínimo: que cuente solo los comentarios de la entrega del escenario (por `entrega: { tareaId: e.tareaId }` o por `entregaId`), sin bajar lo que comprueba.
- Lista los hermanos de sus cuatro archivos de 01a: toda consulta o conteo filtrado solo por un valor literal que otro archivo pueda repetir. Mi grep solo encontró este. CAL-T-12 usa `randomUUID()` y los conteos de `pgboss.job` filtran por `entregaId` o `tareaId`.
- Actualiza la tabla de SHA-256 y no toca nada más.
- El programador no la toca (`AGENTS.md`).

#### M-05 — El caso "sin fuga" de CAL-1A17 depende del orden y de la ejecución de los demás casos del archivo (N-17 / O-r1-1)
Dónde: `backend/test/calificaciones-autorizacion.integracion.test.ts:43-54` (arreglo `respuestas` del módulo) y `:232-238` (umbral `>= 18`).
Por qué importa:
- Hoy no pasa en vacío. Si se corre solo (`-t`), falla por su precondición.
- Pero con otro orden (`sequence.shuffle`), con un caso saltado o con el archivo partido, revisa solo una parte de las respuestas y puede pasar sin haber visto la del admin ni la de la alumna restringida.
- Es la misma clase de defecto que M-04: el resultado de una prueba depende de otras. M-04 acaba de mostrar que en esta suite esa dependencia se materializa.
- Es la prueba de "no se filtra el estado de pago" que exige `AGENTS.md` para el endpoint nuevo.
- Después del commit de 01a, corregirla obligaría a sumarla a la lista cerrada de 01b. Ahora es barato.
Qué se espera:
- **El programador** hace que cada respuesta del archivo pase por la comprobación de fuga en el mismo caso que la produce (por ejemplo, dentro del `pedir` del archivo) o que el caso "sin fuga" produzca sus propias respuestas, sin depender de los otros casos. Se conserva el título de CAL-1A17 y la lista de claves buscadas.
- Hermanos: mi grep no encontró otro acumulador de módulo en las pruebas de 01a (`respuestas.push` solo aparece aquí).

### Problemas que no bloquean (destino de cada observación)
| Id | Qué | Destino |
|---|---|---|
| N-13 | CAL-1A18 (N-01) saca `adapters/queue/colas.ts` entero de la vigilancia de comentarios (`calificaciones-estatico.test.ts:86-89`). | **Misma vuelta que M-05** (programador, solo prueba). `colas.ts` entra a la lista y omite solo la primera categoría (los nombres de cola). Hoy está limpio, así que no bloquea por sí sola. Va ahora porque la vuelta del programador ocurre de todos modos y así 01b no tiene que sumar el archivo a su lista cerrada. |
| N-16 | La tabla de `adapters/README.md` («la FK toma `FOR KEY SHARE` de los criterios») describe como inmediata la comprobación de la FK diferida. §D-9 del plan dice lo mismo. | **Misma vuelta que M-05** (programador; A-6: los README de `backend/src/` son suyos). El README debe decir que con la FK diferida la comprobación de `puntajes_rubrica.criterio_id`, y su `FOR KEY SHARE` sobre los criterios, corre al confirmar, no al insertar. Tampoco ahí hay ciclo: quien borra criterios (`editarTarea`, la cascada de una tarea o una clase) espera antes en la fila de `tareas`, que calificar retiene `FOR SHARE` hasta confirmar. El tester lo atacó en los dos órdenes (CAL-T-15 a CAL-T-19). §D-9 no se toca: es historia del plan. |
| N-14 | `?? Number.NaN` y `?? 0` (dos) en ramas inalcanzables de `decidirCalificacion` (`core/calificaciones/calificar.ts:129, 138, 149`). | **Primer paso de 01b** (programador), como paso propio y declarado en su resumen, con las pruebas de 01a sin cambios: un `ERROR_INTERNO` explícito en lugar del valor. No va ahora: es código de producción después del RESISTE y pediría otra ronda de ataque por un detalle de estilo de ramas inalcanzables. |
| N-15 / N-20 | `if` anidado en `calificacionDe` (`adapters/db/entregas.ts:169-174`). | **Primer paso de 01b**, junto con N-14 y por la misma razón: se aplana con dos guardas. A-2 ya cubre `entregas.ts` en 01b. |
| N-18 | La tabla "Acceso a datos" del plan dice «criterios (solo con calificadas)» y §D-4.2 dice que se leen siempre (N-02). | **Errata en `aprobacion.md`**, sin tocar `plan.md` (está aprobado y verificado por hash). Texto abajo. |
| N-19 / O-r1-2 | El `409 TAREA_CON_ENTREGAS` dice «tiene N entregas» aunque solo haya calificadas sin entrega. El texto del admin no nombra las calificaciones que se borran. | **Para el humano, al cerrar CALIFICACIONES-01.** Pendiente en `docs/ESTADO.md` §3 con ese destino. El bloqueo es correcto y no cambia. El texto vive en `core/tareas/` ("No se toca") y su redacción es del humano (S-06). |

### Definición de terminado (`AGENTS.md`), punto por punto, para 01a
| Punto | Estado | Evidencia |
|---|---|---|
| Cumple RF-36 y RN-05, RN-06 y RN-07 (parte de backend) | **Sí** | RF-36: calificar con rúbrica o calificación directa, comentario privado en el hilo y publicación inmediata (CAL-1A05 a CAL-1A13). RN-05: la suma por criterio escalada y redondeada (CAL-1A02 y CAL-1A05); el cálculo general y el riesgo son funciones puras con sus casos de `AGENTS.md` (categorías sin calificadas, pesos redistribuidos, sin calificar, rúbrica parcial, con retraso), y las lecturas que los usan son de 01b. RN-06: solo los maestros de la clase califican (`protegido({ roles: ["maestro"], pertenencia: "propiedad" })`); el admin lee (S-01). RN-07: calificar no edita ni borra contenido de otro autor; el comentario de la devolución lo firma quien califica. (c′) y T-01 resisten en la ronda 2. |
| Respeta las capas y pasa por el middleware | **Sí** | `core/calificaciones/` solo importa de `core/` (`entregas/entregas.js` y `errores.js`); `core/eventos/avisos-de-clase.ts` usa `zod`, como antes. Prisma solo en `adapters/db`. El handler es delgado, sin verificación de rol ni de relación a mano (lo vigila CAL-1A18). Encola desde `alGuardar` con el `sql` de la transacción. |
| `lint`, `build` y `test` en verde | **No, todavía** | `lint` y `build` en 0 en los tres paquetes. `test` del backend con un rojo intermitente (M-04); el frontend en verde. |
| Pruebas de autorización del endpoint nuevo | **Sí, con M-05** | CAL-1A17: sin token, rol (estudiante y admin), maestro ajeno y clase inexistente iguales, restringido, cambio de contraseña, tarea de otra clase, alumno inválido en 5 formas, alumna deudora y restringida calificada. El "sin fuga" depende del orden (M-05). Las `*.ataque` del tester pasan cada respuesta por `sinFuga` en su propio caso. |
| Migración incluida y compatible hacia atrás | **Sí** | `20261013135122_calificaciones`: columnas que admiten nulos, tabla nueva, `CHECK` que relajan o solo restringen lo que ENTREGAS-01 nunca escribe (`calificado`) y uno nuevo que la base ya cumplía (CAL-1A01 lo aplica sobre datos de ENTREGAS-01). `migrate diff` sin diferencias y `migrate status` al día. Revertir el código después de que haya calificaciones no es inocuo: es R-07 y va a "Riesgos". |
| `infra/` y `.env.example` | **No aplica** | Sin infraestructura ni configuración nuevas. `git diff d998282 -- infra backend/.env.example frontend/.env.example` vacío. |
| Documentos | **Pendiente del orquestador (A-6)** | README de `backend/src/` actualizados por el programador (falta N-16). Textos de `docs/` abajo. |

### Reglas que no se rompen y estilo (sin hallazgo nuevo)
- **Capas, cadena, estado de pago:** como arriba. Ninguna respuesta nueva lleva estado de pago, restricción, correo ni rol (CAL-1A15, CAL-1A17 y la `sinFuga` del tester).
- **Consultas sanas:** sin consultas en ciclos (`deleteMany`/`createMany`, una sentencia cada una). Todo filtra por PK, único o índice de §D-1. Los criterios tienen tope de 20.
- **Cola:** `CALIFICACION_PUBLICADA` se encola en la misma transacción, con id nuevo por publicación y solo ids. Sin trabajo pesado en la petición, sin `workers/` y sin notificaciones escritas.
- **Archivos:** nada pasa por Node.
- **UTC:** `fecha_calificacion` en `timestamptz` e ISO en la API.
- **Trabajos diferidos:** no aplica (calificar no mueve fechas).
- **Secretos y proveedores:** sin secretos, sin proveedores nuevos y sin dependencias (`package.json` sin cambios).
- **Autenticación:** sin cambios.
- **Estilo:** retornos tempranos y errores tipados en `core/` y `adapters/`. Las únicas faltas son N-14 y N-15, con destino 01b.
- **`*.ataque`:** 179 de 179 iguales a la tabla de la ronda 2. El programador no modificó, saltó ni borró ninguna. Las reescrituras C-1 a C-6 de la ronda 0 son del tester (A-5).
- **"No se toca":** `git diff --stat d998282 -- <toda la lista del plan>` vacío. En `handlers/tareas/` solo cambia `entregas.ts` (A-2). En `frontend/src` solo cambian los 4 dobles de la lista cerrada y las 5 `*.ataque` de C-5 y C-6. En `ayudas-entregas.ts` solo cambia `crearEntregaDePrueba` (A-3).

### Desacuerdos arbitrados
- Entre programador y tester no hubo desacuerdos: T-01 se corrigió como lo pidió el orquestador y el tester lo confirmó (CAL-T-01 sin cambios, CAL-T-24 a CAL-T-30).
- O-r1-2 quedó arbitrada en mi verificación anterior como N-19 (para el humano).
- M-04 lo arbitro aquí: la `*.ataque` es incorrecta en su aislamiento, no en lo que comprueba. La corrige su autor, el tester.

### Documentos a actualizar (textos literales; los aplica el orquestador con A-6 tal cual, después del APROBADO de 01a)
Estos textos parten de los de "Documentos a actualizar" del plan y llevan tres ajustes: (c′) en lugar de (c), T-01 ("entregó" es tener `fecha_entrega`) y N-12 (`puntosDeLaTarea`). Lo que describe algo que todavía no existe en 01a (el gradebook, "Mis calificaciones", el panel de calificación) espera a su subentrega. `CLAUDE.md` no cambia en 01a: sus filas van con 01c y 01d, y su lista de dominios del backend ya incluye `calificaciones`.

**E-1. `docs/ARCHITECTURE-ESSENTIALS.md`, "Reglas de datos", viñeta "Edición concurrente" (al cerrar 01a; N-12).** Reemplazar el fragmento literal
> `` y `entregas` (entregar y anular la suben; calificar la exigirá en CALIFICACIONES). ``

por
> `` y `entregas` (entregar, anular y calificar la suben; calificar la exige: si el alumno anuló o volvió a entregar, u otra persona calificó, `409 ENTREGA_MODIFICADA`). Calificar envía además los puntos de la tarea que vio (`puntosDeLaTarea`): si ya no son los de la tarea bloqueada, o la rúbrica cambió, `409 RUBRICA_MODIFICADA`; no usa `tareas.version`, que también sube al mover de tema (CALIFICACIONES-01). ``

Al cerrar 01c, no antes, se agrega al final de la misma viñeta: «Tras el `409`, el panel de calificación avisa, descarta lo escrito y recarga, como el formulario de la tarea.»

**E-2. ESSENTIALS, "Tablas", "Restricciones clave" (al cerrar 01a; con (c′) y T-01).** Reemplazar el fragmento literal
> `` `entregas`: una fila por alumno y tarea, creada al primer uso (entregar o comentar), con `fecha_entrega` si y solo si no está `asignado` (ENTREGAS-01) ``

por
> `` `entregas`: una fila por alumno y tarea, creada al primer uso (entregar, comentar o calificar); `asignado` sin `fecha_entrega`, `entregado` con ella, y `calificado` con `calificacion` y `fecha_calificacion`, con o sin `fecha_entrega` (sin ella cuando se calificó a quien no entregó); sin `fecha_entrega` no hay retraso ni enlaces. "Entregó" es tener `fecha_entrega`, no el estado (ENTREGAS-01; CALIFICACIONES-01) · `puntajes_rubrica (entrega_id, criterio_id)` PK, el desglose de una calificación con rúbrica; su FK a `criterios_rubrica` es `NO ACTION DEFERRABLE INITIALLY DEFERRED` (se comprueba al confirmar) y está escrita a mano en la migración, porque Prisma no la expresa (CALIFICACIONES-01) ``

**E-3. ESSENTIALS, "Reglas de negocio que tocan código" (al cerrar 01a; con (c′)).** Reemplazar la viñeta literal
> `- Calificación general: categorías ponderadas; categorías sin tareas calificadas redistribuyen su peso; tareas sin calificar no cuentan.`

por
> `` - Calificación (RF-36, RN-05; CALIFICACIONES-01): un maestro de la clase califica una entrega con la rúbrica (la suma de los puntos por criterio, escalada a los puntos de la tarea y redondeada a centésimas) o, sin rúbrica, con una calificación directa, con hasta 2 decimales. Publicar es devolver: el alumno la ve en cuanto se guarda, y el comentario opcional de la devolución va al hilo privado de la entrega, sin aviso propio (P-01 y P-02). Recalificar vuelve a publicar. A quien no entregó solo se le califica con la entrega cerrada, es decir, con la fecha límite vencida en una tarea que no acepta entregas con retraso (P-03 c′): la fila queda `calificado` sin `fecha_entrega`, el alumno ya no entrega ni anula, y no cuenta entre los que entregaron. Una tarea con alguna entrega calificada no cambia sus puntos ni su rúbrica (`409 TAREA_CON_CALIFICACIONES`), y una rúbrica idéntica nunca se reemplaza (P-04). El admin lee las calificaciones y no califica (S-01). Calificación general: por categorías ponderadas y, dentro de cada una, por puntos (P-05); las categorías sin tareas calificadas no cuentan y su peso se reparte; las tareas sin calificar no cuentan; las entregas con retraso cuentan igual. ``

**E-4. ESSENTIALS, "Asíncrono y notificaciones", viñeta "Eventos" (al cerrar 01a).** Después de la frase final literal «`COMENTARIO_CREADO` sirve al muro y al hilo privado (ENTREGAS-01).» agregar
> `` `CALIFICACION_PUBLICADA` lleva `{ entregaId, tareaId, claseId, version }` con un id nuevo por publicación (también al recalificar) y cubre el comentario de la devolución, que no encola `COMENTARIO_CREADO` (CALIFICACIONES-01). ``

**E-5. ESSENTIALS, "Alumno en riesgo" (al cerrar 01b, no en 01a: la consulta de las vencidas es de 01b).** Reemplazar `- Alumno en riesgo: promedio < 70 % o ≥ 3 tareas vencidas sin entregar.` por
> `` - Alumno en riesgo: promedio < 70 % o ≥ 3 tareas vencidas sin entregar. Los umbrales son constantes de `core/` hasta que exista la configuración (RF-56), y el promedio que se compara es el redondeado que se muestra. "Vencidas sin entregar" son las tareas de la clase con la fecha límite pasada y sin entrega `entregado` ni `calificado` del alumno: una calificada sin entrega no cuenta, porque su calificación ya pesa en el promedio (CALIFICACIONES-01). ``

**A-1. `docs/ARCHITECTURE.md` §7 (al cerrar 01a lo de calificar y de las tareas; el gradebook y "Mis calificaciones" con el texto del plan al cerrar 01b; N-12).** En la fila `calificaciones`, reemplazar el fragmento literal
> `` `PUT /clases/{claseId}/tareas/{tareaId}/entregas/{alumnoId}/calificacion` (forma final: CALIFICACIONES) ``

por
> `` `PUT /clases/{claseId}/tareas/{tareaId}/entregas/{alumnoId}/calificacion` (maestros de la clase; el admin no califica. El cuerpo lleva la `version` de la entrega y los `puntosDeLaTarea` con que se abrió el panel, los puntajes por criterio o la calificación directa, y un comentario opcional que va al hilo privado. `409 ENTREGA_MODIFICADA` si cambió la entrega; `409 RUBRICA_MODIFICADA` si cambiaron los puntos o la rúbrica; `409 ENTREGA_NO_CALIFICABLE` si el alumno no entregó y la entrega sigue abierta. Responde con la entrega del alumno y su calificación; CALIFICACIONES-01) ``

En la fila `tareas`, después de la frase literal «El `PUT` de una tarea exige `version` y responde `409 TAREA_MODIFICADA` si otra persona guardó antes (ENTREGAS-01a).», agregar
> `` Con alguna entrega calificada, responde `409 TAREA_CON_CALIFICACIONES` si cambia los puntos o la rúbrica. `GET …/entrega` y `GET …/entregas/{alumnoId}` traen la calificación (`null` sin calificar; el alumno, sin `version`), y en `GET …/entregas` cuenta como entregada la fila con `fecha_entrega` (CALIFICACIONES-01). ``

**A-2. `docs/ARCHITECTURE.md` §8 (al cerrar 01a).** Reemplazar la fila literal `` | `CALIFICACION_PUBLICADA` | Aviso al alumno | `` por
> `` | `CALIFICACION_PUBLICADA` | Aviso al alumno. Datos `{ entregaId, tareaId, claseId, version }`; id nuevo por publicación (también al recalificar); el consumidor descarta el aviso si la entrega ya no existe, si no está calificada o si su versión cambió. Cubre el comentario de la devolución, que entra al hilo privado sin `COMENTARIO_CREADO`. Sin consumidor hasta NOTIFICACIONES (CALIFICACIONES-01) | ``

**A-3. `docs/ARCHITECTURE.md` §14, fila `entregas` (al cerrar 01a; con (c′) y T-01).** Reemplazar la fila completa por
> `` | `entregas` | `id`, `tarea_id` (FK `CASCADE`), `alumno_id` (FK `RESTRICT`), `estado` (`asignado` / `entregado` / `calificado`), `fecha_entrega`, `con_retraso`, `enlaces` (jsonb, lista de hasta 5), `version`, `calificacion` (`NUMERIC(7,2)`, de 0 a 1000) y `fecha_calificacion` (CALIFICACIONES-01) | único `(tarea_id, alumno_id)` · índice `(alumno_id)` · `CHECK`: `asignado` sin `fecha_entrega` y `entregado` con ella; `calificado` con o sin ella (sin ella cuando se calificó a quien no entregó, con la entrega cerrada; CALIFICACIONES-01); sin `fecha_entrega`, sin retraso ni enlaces; `calificacion` si y solo si está `calificado`, y `fecha_calificacion` si y solo si hay `calificacion`; `version >= 0`. Una fila por alumno y tarea, creada al primer uso (entregar, comentar o calificar). "Entregó" es tener `fecha_entrega`, no el estado. La cascada desde `tareas` solo se alcanza sin entregas `entregado` o `calificado`, o por el borrado confirmado del admin (S-06 de ENTREGAS-01) | ``

**A-4. §14, fila `puntajes_rubrica` (al cerrar 01a; N-16).** Reemplazar `` | `puntajes_rubrica` | `entrega_id`, `criterio_id`, `puntos` | PK compuesta | `` por
> `` | `puntajes_rubrica` | `entrega_id` (FK `CASCADE`), `criterio_id` (FK `NO ACTION DEFERRABLE INITIALLY DEFERRED`, escrita a mano en la migración porque Prisma no expresa la diferibilidad. Se comprueba al confirmar, junto con su `FOR KEY SHARE` sobre el criterio: así el borrado en cascada de una tarea o una clase calificada no depende del orden de los disparadores, y un reemplazo indebido de los criterios de una tarea calificada hace fallar la transacción en lugar de borrar el desglose; Enmienda 1, M-01), `puntos` (`NUMERIC(7,2)`, de 0 a 1000), `creado_en` | PK `(entrega_id, criterio_id)` · índice `(criterio_id)` · el desglose de una calificación con rúbrica; se reemplaza al recalificar; una tarea calificada no reemplaza sus criterios (P-04) (CALIFICACIONES-01) | ``

**A-5. §14, fila `criterios_rubrica` (al cerrar 01a; N-02).** Reemplazar el fragmento literal `editar la rúbrica reemplaza sus criterios` por
> `` editar la rúbrica reemplaza sus criterios solo si cambió (una rúbrica idéntica conserva sus ids), y nunca en una tarea con entregas calificadas (`409 TAREA_CON_CALIFICACIONES`; CALIFICACIONES-01) ``

La viñeta de "Reglas de acceso a datos" sobre el gradebook va al cierre de 01b, con el texto del plan.

**`docs/PRD.md` (al cerrar 01b, como dice el plan).** Un ajuste por (c′): en el texto propuesto para RN-05, «Se puede calificar a quien no entregó una tarea vencida» pasa a «Se puede calificar a quien no entregó solo con la entrega cerrada: la fecha límite vencida en una tarea que no acepta entregas con retraso». Lo demás queda como en el plan.

**Errata del plan (N-18), una línea en `aprobacion.md`.** `plan.md` no se toca:
> `Errata del plan (N-18 del manager, sin enmienda): en "Acceso a datos", fila editarTarea, «criterios (solo con calificadas)» se lee «criterios (siempre, para comparar; N-02, §D-4.2)»; manda §D-4.2.`

**`docs/ESTADO.md` §3, pendientes nuevos con destino (al cerrar 01a):**
- DEPLOY (R-07, S-16): desplegar juntos el frontend y el backend de CALIFICACIONES-01. `calificacion` es obligatoria en las respuestas estrictas de `GET …/entrega` y `GET …/entregas/:alumnoId`, así que un frontend anterior las rechaza. Tampoco se revierte el backend a una versión anterior a 01a si ya hay calificaciones: el `editarTarea` anterior reemplaza siempre los criterios y la FK diferida hace fallar la transacción al confirmar (`500` al editar una tarea calificada, sin borrar nada).
- 01b, primer paso (N-14 y N-15): un `ERROR_INTERNO` explícito en las tres ramas inalcanzables de `decidirCalificacion`, y `calificacionDe` aplanada con guardas.
- Cierre de CALIFICACIONES-01, decide el humano (N-19): el texto de `409 TAREA_CON_ENTREGAS` cuando solo hay calificadas sin entrega, y si el del admin nombra las calificaciones que se borran.
- `formatearFechaDeClase` (S-15): pasa al `chore` posterior, como se registró en la aprobación.

### Cotejo del cambio de estado del plan (transcripción con cotejo)
- `sha256sum` de la copia `copias-plan/plan-calificaciones-antes-aprobacion-50b7facb.md`: `50b7facb1b15e05628dc961d250835b17dd8e0e9536476624bc7d4a7736b6ce9`. El de `plan.md`: `bdcf91d0539d72a2ace8e398a039e198ea6e66dd8c96da6608f2ad6367881191`. Los dos son los que anota `aprobacion.md`.
- `git diff --no-index -U0 <copia> plan.md`: un solo hunk, `@@ -2,2 +2,2 @@`, y `1 file changed, 2 insertions(+), 2 deletions(-)`. Cambian solo la línea 2 (Estado BLOQUEADO → LISTO, con las respuestas del humano y "en P-03 rige la variante (c′)", con los lugares marcados) y la línea 3 (la nota de transcripción, que remite a `aprobacion.md`). Ninguna otra línea del plan cambió (954 líneas en los dos). **Cotejo correcto.**
- Las respuestas resumidas en la línea 2 coinciden con el texto literal del humano en `aprobacion.md`: P-01 (a), P-02 (a), P-03 (c′), P-04 (a) con N-02, P-05 (a), S-04/R-13, S-15, A-4/R-05, S-01, H-5, sin vetos, A-1 a A-6 y R-14 con `CASCADE` (que no fue necesario).

### Riesgos residuales de 01a (para el humano)
1. **El `FOR SHARE` nuevo sobre `tareas`.** Calificar queda en serie con editar, mover de tema y borrar la misma tarea, y es compatible con entregar, anular, comentar y otras calificaciones. No hay ciclos: todos toman primero la tarea. CAL-1A12 y las carreras del tester (CAL-T-15 a CAL-T-19 y CAL-T-30) dan 0 `deadlock` y 0 `40P01` en los dos órdenes. Si la tarea está muy disputada, el costo es esperar; si la espera pasa de 5 s, la respuesta es `503 SERVICIO_OCUPADO`, nunca `500`.
2. **La FK diferida de `puntajes_rubrica.criterio_id`.** Prisma no la expresa. Hoy `migrate diff` no ve diferencias y no propuso recrearla (R-14 no ocurrió), pero si alguien regenerara esa migración o creara la tabla a mano, perdería la diferibilidad sin ruido: la protege CAL-1A01, que lee `condeferrable` y `condeferred` en `pg_constraint`. Con la FK diferida, su comprobación y su bloqueo ocurren al confirmar (N-16).
3. **El `CHECK` relajado por (c′).** `calificado` puede quedar sin `fecha_entrega`, y desde ahora "entregó" es tener `fecha_entrega`, no el estado (T-01). Cualquier lectura nueva que cuente o filtre "entregadas" debe seguir esa regla: el gradebook y "Mis calificaciones" en 01b, "Tu trabajo" en 01c y `RECORDATORIO_24H` en NOTIFICACIONES. La excepción deliberada es "vencidas sin entregar" (S-04), donde una calificada sin entrega no cuenta. Por eso propongo E-2, E-3 y E-5 con esa frase literal.
4. **Despliegue conjunto (S-16) y no revertir el backend (R-07).** Va a `docs/ESTADO.md` §3 con destino DEPLOY (texto arriba).
5. **La migración valida los `CHECK` nuevos sobre toda la tabla `entregas`** (`ADD CONSTRAINT` sin `NOT VALID`), con un bloqueo exclusivo mientras dura. Con los datos del piloto es instantáneo. Lo anoto solo para DEPLOY, si algún día la tabla fuera grande.
6. **El texto de `409 TAREA_CON_ENTREGAS`** con calificadas sin entrega (N-19): es una decisión tuya, al cierre del encargo.

### Métricas del encargo en 01a
- **Rondas del tester:** 2. Una extra, por T-01 (media): un caso de (c′), la calificada sin entrega contada como entregada, que el plan no recogía. No fue un hermano ni un estado vecino sin aplicar: el plan se escribió con (c) como opción principal, y el conteo `entregadas` de ENTREGAS-01 no estaba entre los lugares marcados "Con (c′)".
- **Resúmenes del programador devueltos:** 0 de 2 (la implementación y la corrección de la ronda 1, los dos aceptados).
- **PARADAS:** 0.
- **Rondas extra por hermanos o estados vecinos:** 0. No se alcanza el umbral para cambiar el modelo del programador, que ya está en `opus`.
- **Esta revisión** devuelve dos defectos de prueba (M-04 del tester y M-05 del programador). No son rondas de ataque y no cuentan en el tope de 3. Lo anoto porque M-04 es la primera `*.ataque` intermitente del encargo.

### Para el humano
- **N-19:** ¿el aviso de borrado de una tarea calificada debe decir "entregas o calificaciones" y, para el admin, nombrar las calificaciones que se borran? Recomiendo que sí, como un ajuste de texto al cerrar CALIFICACIONES-01, con autorización para tocar `core/tareas/`.
- No hay otra decisión tuya pendiente en 01a. Los riesgos 1 a 5 son informativos.

### Qué sigue (para el orquestador)
1. **Tester (M-04):** corrige CAL-T-13 con el cambio mínimo, lista los hermanos de sus cuatro archivos de 01a, actualiza la tabla de SHA-256 y corre solo ese archivo y el lint del backend.
2. **Programador (M-05, más N-13 y N-16):** solo `calificaciones-autorizacion.integracion.test.ts`, `calificaciones-estatico.test.ts` y `backend/src/adapters/README.md`. Sin código de producción y sin tocar ninguna `*.ataque`. Entrega su resumen verificable con hermanos y estados vecinos: el orden de los casos, un caso saltado y la corrida aislada con `-t`.
3. **Manager:** verifico las dos correcciones con `git diff`, `lint` y dos corridas completas del backend, una a la vez. Si salen en verde y el diff es solo ese, el veredicto pasa a APROBADO sin otra ronda de ataque.
4. Después: el orquestador aplica los textos E-1 a E-4, A-1 a A-5, la errata y los pendientes de §3, y le entrega al humano el bloque del commit de 01a.

## Cierre de la revisión final — CALIFICACIONES-01a
Veredicto: **APROBADO CON OBSERVACIONES.** M-04 y M-05 están resueltos, igual que N-13 y N-16. Las dos corridas completas del backend salieron en verde con los inventarios esperados. Desde mi revisión final solo cambiaron los cinco archivos declarados. Nada bloquea el commit de 01a. Las observaciones de abajo forman una lista cerrada y cada una tiene destino.
Verificación propia: lint backend 0 · test backend 2553 de 2553 en 207 archivos, dos veces · build backend 0. El frontend no lo corrí: ningún archivo de `frontend/` cambió desde mi revisión final (`find -newer`), así que vale mi corrida anterior: `Test Files  166 passed (166)` · `Tests  2536 passed (2536)`.

### Qué cambió desde mi revisión final
- `find backend frontend shared docs AGENTS.md CLAUDE.md infra .claude -newer revision.md -type f` (sin `node_modules`, `dist`, `generated` ni `tmp`) da exactamente estos archivos: `backend/src/adapters/README.md`, `backend/test/calificaciones-01a-r1.ataque.test.ts`, `backend/test/calificaciones-autorizacion.integracion.test.ts`, `backend/test/calificaciones-estatico.test.ts` y `backend/test/calificaciones-migracion.integracion.test.ts`. Además cambiaron `aprobacion.md`, `reporte-tester.md` y `resumen-programador.md` de esta carpeta, que quedan fuera de la verificación. No cambió ningún archivo de producción, de `shared/`, de `frontend/` ni de "No se toca".
- `git status --short`: 47 entradas, las mismas que en mi revisión final (28 `M` y 19 `??`). Las corridas no dejaron archivos nuevos.
- **`*.ataque`:** comparé el `sha256sum` de las 179 (`git ls-files -co --exclude-standard`) con la tabla "tras la corrección de M-04". Coinciden las 179. Contra la tabla de la ronda 2 solo difiere `backend/test/calificaciones-01a-r1.ataque.test.ts` (`252752f4…` → `5e02a277…`, igual que el `5E02A277…` de la tabla). El programador no tocó ninguna `*.ataque`.

### Juicio de cada corrección
| Id | Archivo | Juicio |
|---|---|---|
| **M-04** (tester) | `calificaciones-01a-r1.ataque.test.ts:567-574` | **Resuelto.** Es el cambio mínimo: el `count` suma `entrega: { tareaId: e.tareaId }` y conserva el texto y el `toBe(1)`. Lo que demuestra no baja: el comentario de 1000 caracteres visibles se guarda una sola vez en el hilo de la entrega del escenario, y los cinco `400` previos siguen comprobados con `fotoDeCalificar`, que ya estaba acotada. La lista de 28 hermanos coincide con mi grep de la revisión final, donde este era el único filtro por un literal repetible. |
| **M-05** (programador) | `calificaciones-autorizacion.integracion.test.ts:49-64, 242-262` | **Resuelto.** Se quitó el acumulador de módulo. Ahora `pedir` envuelve a `pedirEn` y pasa cada respuesta por `sinFuga` en el caso que la produce, y ninguna llamada usa `pedirSinComprobar` por fuera del envoltorio. El caso "sin fuga" conserva su título y `CLAVES_DE_FUGA`. Arma su propio escenario con la alumna deudora y restringida y ocho respuestas: 401, alumna 403, admin 403, maestro 200, segundo maestro con versión vieja 409, GET del maestro 200, GET del admin 200 y GET de la alumna 403. Compara los ocho códigos, así que no puede pasar en vacío. Lo comprobé en los estados vecinos: archivo solo, `-t "sin fuga"` (`1 passed \| 6 skipped`), semillas 1 y 3 (en las dos, "sin fuga" corre en segundo lugar, antes del caso que antes llenaba el acumulador) y la suite completa dos veces. |
| **Hermano de M-05** | `calificaciones-migracion.integracion.test.ts:442-447, 586-604` | **Bien encontrado y bien resuelto, sin debilitar CAL-1A01.** El `UPDATE` a `calificado` sin `fecha_entrega` se sigue ejecutando contra el esquema migrado. Los `CHECK` de PostgreSQL no son diferibles, así que si rechazaran la fila el `$executeRaw` lanzaría un error de Prisma, no `Revertir`, y fallaría `toBeInstanceOf(Revertir)`. Además se comprueba `actualizadas === 1`, es decir, que la fila existía y pasó. La única diferencia es que ya no confirma: la fila vuelve a `asignado`, y eso también se comprueba. La transacción no toca `puntajes_rubrica`, así que la FK diferida no interviene. Lo corrí con las semillas 1 y 3: `13 passed (13)` en las dos. |
| **N-13** | `calificaciones-estatico.test.ts:88-120` | **Resuelto.** `colas.ts` vuelve a la lista y solo se le omite la categoría de nombres de cola. Las otras cuatro categorías se le revisan. El comentario explica por qué. |
| **N-16** | `backend/src/adapters/README.md` | **Resuelto.** La tabla de calificar y el párrafo de la FK diferida dicen ahora que la comprobación de `criterio_id` y su `FOR KEY SHARE` corren al confirmar, y por qué no hay ciclo. Prettier solo realineó una tabla que es nueva de 01a. `migration.sql` y `schema.prisma` no se tocaron (bien: cambiar la migración cambiaría su checksum). |

Los hermanos y los estados vecinos que declara el programador coinciden con el código. Los archivos 3 a 6 crean el escenario en cada caso y su `beforeAll` solo construye la app. Ninguno tiene acumuladores de módulo.

### Mis corridas (desde `backend/`, una a la vez; Docker Desktop 28.5.1; sin `--write` ni `--fix`)
| Comando | Código | Última línea / resumen |
|---|---|---|
| `npm run lint` | 0 | `> tsc -p tsconfig.json --noEmit && tsc -p tsconfig.test.json` |
| `npx vitest run test/calificaciones-autorizacion.integracion.test.ts` | 0 | `Tests  7 passed (7)` |
| `… --sequence.shuffle --sequence.seed=1 --reporter=verbose` | 0 | `Tests  7 passed (7)` |
| `… --sequence.shuffle --sequence.seed=3 --reporter=verbose` | 0 | `Tests  7 passed (7)` |
| `… -t "sin fuga"` (extra) | 0 | `Tests  1 passed \| 6 skipped (7)` |
| `npx vitest run test/calificaciones-migracion.integracion.test.ts --sequence.shuffle --sequence.seed=1` y `=3` (extra) | 0 y 0 | `Tests  13 passed (13)` en las dos |
| `npm run test` (1.ª, 10:25:15 a 10:27:32) | 0 | `Duration  132.44s (transform 14.24s, setup 5.90s, import 233.29s, tests 1050.17s, environment 57ms)`; `Test Files  207 passed (207)` · `Tests  2553 passed (2553)` |
| `npm run test` (2.ª, 10:27:37 a 10:29:55, empezó cuando terminó la 1.ª) | 0 | `Duration  132.93s (transform 14.93s, setup 6.02s, import 232.88s, tests 1067.69s, environment 74ms)`; `Test Files  207 passed (207)` · `Tests  2553 passed (2553)` |
| `npm run build` | 0 | `> tsc -p tsconfig.json` |
| `npx vitest list \| grep -c ""` · `--filesOnly` | — | 2553 · 207 |

| Cifra | Esperada | Programador | Tester | Mía (1.ª / 2.ª) |
|---|---|---|---|---|
| Casos y archivos | 2553 en 207 | 2553 en 207 | 2553 en 207 (dos corridas) | 2553 en 207 / 2553 en 207 |
| `"Error no controlado"` | 10 | 10 | 10 / 10 | 10 / 10 |
| `"code":"P2028"` | 5 | 5 | 5 / 5 | 5 / 5 |
| `40P01` | 0 | 0 | 0 / 0 | 0 / 0 |
| `deadlock detected` · `Test timed out` | 0 · 0 | — | 0 · 0 | 0 · 0 / 0 · 0 |
| Autorización: sola, semilla 1, semilla 3 | 7 · 7 · 7 | 7 · 7 · 7 | — | 7 · 7 · 7 |

Todas las cifras coinciden. Con esto, el último punto de la definición de terminado que estaba en "No, todavía" («`lint`, `build` y `test` en verde») pasa a **Sí**. El de las pruebas de autorización pasa de «Sí, con M-05» a **Sí**.

### Observaciones (lista cerrada, con destino)
1. **N-14 y N-15/N-20 → primer paso de 01b** (programador). Va como paso propio, declarado en su resumen, y las pruebas de 01a no cambian. Por un lado, un `ERROR_INTERNO` explícito en lugar de `?? Number.NaN` y `?? 0` en las tres ramas inalcanzables de `decidirCalificacion`. Por otro, aplanar con guardas el `if` anidado de `calificacionDe`.
2. **N-18 → ya aplicada.** La errata está en `aprobacion.md` y `plan.md` no se toca.
3. **N-19 → el humano, al cierre de CALIFICACIONES-01.** Es el texto de `409 TAREA_CON_ENTREGAS` cuando solo hay calificadas sin entrega, y si el del admin nombra las calificaciones que se borran. Va a `ESTADO.md` §3 (abajo).
4. **R-07 y S-16 → DEPLOY.** Hay que desplegar juntos el frontend y el backend, y no revertir el backend a una versión anterior a 01a si ya hay calificaciones. Va a `ESTADO.md` §3 (abajo).
5. **Detalle sin acción:** en el caso "sin fuga", el ciclo `for (const [r] of propias) sinFuga(r)` repite lo que ya hace `pedir`. Es inocuo y deja explícito qué revisa el caso. No se toca.

### Documentos que aplica el orquestador (A-6), después de este APROBADO y antes del commit de 01a
- **Se aplican tal cual los textos literales de mi "Revisión final — CALIFICACIONES-01a", "Documentos a actualizar":** E-1, E-2, E-3 y E-4 en `docs/ARCHITECTURE-ESSENTIALS.md`, y A-1 (las filas `calificaciones` y `tareas` de §7), A-2 (§8), A-3, A-4 y A-5 (§14) en `docs/ARCHITECTURE.md`. Las correcciones no cambian ninguno: A-4 ya decía que la FK se comprueba al confirmar, con su `FOR KEY SHARE`, igual que el README corregido por N-16.
- **No se aplican en 01a:** E-5 y la viñeta del gradebook en "Reglas de acceso a datos" (van con 01b), la frase del panel tras el `409` en E-1 (va con 01c), `PRD.md` (con 01b, con el ajuste de (c′) para RN-05) y `CLAUDE.md` (con 01c y 01d).
- **La errata N-18** ya está en `aprobacion.md`, así que no hay que repetirla.
- **`docs/ESTADO.md` §3, pendientes nuevos con destino.** Son los cuatro de mi revisión final, con un ajuste en el cuarto:
  - DEPLOY (R-07, S-16): desplegar juntos el frontend y el backend de CALIFICACIONES-01. `calificacion` es obligatoria en las respuestas estrictas de `GET …/entrega` y `GET …/entregas/:alumnoId`, así que un frontend anterior las rechaza. Tampoco se revierte el backend a una versión anterior a 01a si ya hay calificaciones: el `editarTarea` anterior reemplaza siempre los criterios y la FK diferida hace fallar la transacción al confirmar (`500` al editar una tarea calificada, sin borrar nada).
  - 01b, primer paso (N-14 y N-15): un `ERROR_INTERNO` explícito en las tres ramas inalcanzables de `decidirCalificacion`, y `calificacionDe` aplanada con guardas.
  - Cierre de CALIFICACIONES-01, decide el humano (N-19): el texto de `409 TAREA_CON_ENTREGAS` cuando solo hay calificadas sin entrega, y si el del admin nombra las calificaciones que se borran.
  - `formatearFechaDeClase` (S-15): **no se agrega una fila nueva.** Ya existe una en §3 (destino «El próximo encargo que toque `lib/format.ts`»). Solo se cambia su destino a «el `chore` posterior a CALIFICACIONES-01 (S-15, decisión del humano en la aprobación del plan)».
- **`ESTADO.md` §3, filas existentes que 01a resuelve en parte:**
  - La fila «CALIFICACIONES (§D-11 del plan de ENTREGAS-01, puntos 1 a 4)…» se marca **resuelta en 01a**. Calificar exige `entregas.version` (`409 ENTREGA_MODIFICADA`). Una tarea calificada no cambia su rúbrica ni sus puntos (`409 TAREA_CON_CALIFICACIONES`). Ya existen las columnas `calificacion` y `fecha_calificacion`. El `CHECK` se relajó por (c′).
  - De la fila «Para CALIFICACIONES: los ids de los criterios… y la regla de P-01 para el cálculo», queda **resuelta en 01a la parte de los ids** (P-04 y N-02: una rúbrica idéntica conserva sus ids, y una tarea calificada no reemplaza sus criterios). La parte del cálculo se cierra con 01b, cuando las lecturas lo usen.

### Métricas (cierre de 01a)
- **Rondas del tester:** 2, con una extra por T-01, que no vino de hermanos. La corrección de M-04 no es una ronda de ataque.
- **Resúmenes del programador devueltos:** 0 de 3.
- **PARADAS:** 0.
- **Rondas extra por hermanos o estados vecinos:** 0. En esta vuelta el programador encontró por su cuenta el hermano de `calificaciones-migracion`.

## Verificación del resumen — CALIFICACIONES-01b
Veredicto: **RESUMEN ACEPTADO.** Todas las cifras coinciden con mis corridas. Las ocho viñetas (CAL-1B01 a CAL-1B08) tienen su archivo y el título exacto, y leí el código de cada caso: prueban lo que pide el plan. "No se toca" está vacío y las 179 `*.ataque` son iguales a la tabla de la ronda 0 de 01b. La única prueba normal que cambió es E6, dentro de la lista cerrada. Nada bloquea. La ronda 1 del tester puede empezar. N-21 a N-25 no bloquean y cada una tiene destino.

### Mis corridas (una a la vez; Docker Desktop encendido; sin `--write` ni `--fix`)
| Paquete | Comando | Código | Última línea / resumen |
|---|---|---|---|
| shared | `npm run lint` | 0 | `All matched files use Prettier code style!` |
| shared | `npm run build` | 0 | `> tsc -p tsconfig.json` |
| backend | `npm run lint` | 0 | `> tsc -p tsconfig.json --noEmit && tsc -p tsconfig.test.json` |
| backend | `npm run test` (18:03:10Z a 18:06:09Z) | 0 | `Duration  173.75s (transform 25.64s, setup 6.41s, import 259.03s, tests 1472.13s, environment 55ms)`; `Test Files  212 passed (212)` · `Tests  2579 passed (2579)` |
| backend | `npm run build` | 0 | `> tsc -p tsconfig.json` |
| backend | `npx prisma validate` | 0 | `The schema at prisma\schema.prisma is valid 🚀` |
| backend | `npx vitest run test/calificaciones-lecturas.integracion.test.ts` (archivo de 01a, para comparar los avisos de `pg`) | 0 | `Tests  4 passed (4)` |
| frontend | `npm run lint` | 0 | `> tsc -b` |
| frontend | `npm run test` (18:07:51Z a 18:10:08Z, **primera corrida**) | 0 | `Duration  134.07s (transform 37.15s, setup 70.40s, import 361.19s, tests 642.09s, environment 320.25s)`; `Test Files  166 passed (166)` · `Tests  2536 passed (2536)` |
| frontend | `npm run build` | 0 | `✓ built in 772ms` |

- **Frontend:** pasó en verde a la primera, en 134 s (137 s de reloj). No hubo ningún tiempo de espera. Antes de correrlo, `tasklist /FI "IMAGENAME eq node.exe"` mostraba 9 procesos `node` ajenos, cada uno con 25 a 39 MB, que parecían en reposo. No terminé ninguno. No tengo con qué explicar las dos corridas en rojo del programador. Que los 27 archivos fallidos pasaran solos y que mi corrida completa saliera en verde apunta a algo del momento, no al cambio. Ningún archivo de `frontend/` cambió.
- **Conteos:** backend `npx vitest list | grep -c ""` → 2579 y `--filesOnly` → 212. Por archivo nuevo (`grep -c` sobre la lista): `gradebook.integracion` 7, `mis-calificaciones.integracion` 5, `calificaciones-lecturas-consistentes.integracion` 6, `calificaciones-lecturas-autorizacion.integracion` 2 y `calificaciones-lecturas-estatico` 6. Frontend `npx vitest list --json`: 2536 casos en 166 archivos, y `--filesOnly` → 166.
- **Inventarios del backend** (`grep -o -F … | wc -l` sobre mi salida): `"Error no controlado"` 10, `"code":"P2028"` 5, `40P01` 0, `deadlock detected` 0, `could not serialize` 0, `too many clients` 0 y `Test timed out` 0.
- **`DeprecationWarning` de `pg`** («Calling client.query() when the client is already executing a query»):
  - En mi corrida completa salen 19. Hay uno por proceso de trabajo de Vitest (19 `pid` distintos): Node emite cada aviso de obsolescencia una sola vez por proceso.
  - Un archivo de 01a solo da 0, igual que los cinco nuevos solos, según el programador.
  - Las corridas completas anteriores a 01b, guardadas en el scratchpad de la sesión, ya los traían: 18 en la ronda 0 de 01b (código de `<K1a>`), 19 y 19 en las dos de M-04, y 18 y 19 en las dos mías del cierre de 01a. La del inicio del encargo (`d998282` más la ronda 0 de 01a) trae 14.
  - **Son anteriores a 01b y no los causa el cambio** (N-23).

### Cifras (las suyas, las mías y si coinciden)
| Cifra | Programador | Mía | Coincide |
|---|---|---|---|
| Backend: casos y archivos | 2579 en 212 | 2579 en 212 | Sí |
| Casos nuevos por archivo | 7 · 5 · 6 · 2 · 6 (+26 en 5) | 7 · 5 · 6 · 2 · 6 | Sí |
| Frontend: casos y archivos | 2536 en 166 | 2536 en 166 | Sí |
| `"Error no controlado"` · `P2028` · `40P01` | 10 · 5 · 0 | 10 · 5 · 0 | Sí |
| `Test timed out` · `deadlock detected` | 0 · 0 | 0 · 0 | Sí |
| `DeprecationWarning` de `pg` | 19 | 19 (anteriores a 01b) | Sí |
| Últimas líneas de `lint` y `build` (shared, backend, frontend) y `prisma validate` | las de su tabla | las mismas; `vite build` cambia solo en el tiempo (1.47 s frente a 772 ms) | Sí |
| `*.ataque` iguales a la tabla de la ronda 0 de 01b | 179 de 179 | 179 de 179 (`sha256sum` en minúsculas contra la tabla; `diff` vacío) | Sí |
| `instantaneaUnica: true` en `calificaciones.ts` | 2 | 2 (CAL-1B08 y C-4 en verde) | Sí |

### Cotejo viñeta por viñeta de 01b (leí el código de cada caso)
| Viñeta | Archivo y casos | Juicio |
|---|---|---|
| **CAL-1B01** | `gradebook.integracion.test.ts`, tres casos con los títulos citados | **Cubierta.** Las columnas van en orden `(fecha_limite DESC, id DESC)`, con título, puntos y categoría. Las celdas de Ana cubren los cinco estados: calificada, entregada, con retraso, asignada sin fila y **calificada sin entrega** (`calificado`, `conRetraso: false`, 8 puntos). Ana tiene 0 vencidas, así que la calificada sin entrega no cuenta como vencida sin entregar. Los porcentajes de Ana (86.67) y Carla (46, con «Sin categoría» fuera) los comprobé a mano y son correctos; el modo puntos (73.33) está en el tercer caso. Beto tiene 3 vencidas, así que va con el motivo `vencidas`; Carla va con `promedio`. El resumen es `totalAlumnos 3`, `promedioDeLaClase 66.34` y `alumnosEnRiesgo 2`. La dada de baja (50/50) y la desactivada (0/50) habrían cambiado el promedio y el riesgo, y sus filas siguen en la base: la prueba distingue. **El resumen se calcula sobre toda la clase:** el segundo caso recorre la clase de una fila en una y con `limiteTareas=2`, y en cada página exige el mismo resumen y los mismos datos por fila que la lectura completa. |
| **CAL-1B02** | mismo archivo, tres casos | **Cubierta.** Las filas siguen el cursor del roster hasta el final, y un cursor inexistente da `400 VALIDACION`. **Empates:** hay cinco tareas con la misma fecha límite al milisegundo, más una antes y una después. Con `limiteTareas=2` salen 4 ventanas que suman exactamente la lista esperada, sin repetir ni saltar, con el desempate por id descendente. El orden de texto en minúsculas coincide con el de `uuid` en PostgreSQL. En cada ventana, las celdas van en el orden de sus columnas. Un `cursorTareas` de otra clase o inexistente da `400` con «cursorTareas: no es válido». Límites: 0, 51 y texto (filas y tareas) y los ids mal formados dan `400`; 1 y 50 dan `200`. |
| **CAL-1B03** | `calificaciones-lecturas-consistentes.integracion.test.ts`, cinco casos | **Cubierta.** El doble del ejecutor envuelve la transacción con sus opciones, así que el REPEATABLE READ se abre de verdad, y corre el gancho después de la llamada indicada. Cada caso comprueba `disparado()` y tiene un control previo sin carrera. Los tres cursores borrados después de comprobarlos (tarea del gradebook, alumno del gradebook y tarea de «Mis calificaciones») devuelven lo que sigue, sin página vacía. Las dos calificaciones que llegan después de leer las celdas o las entregas dejan la celda, el porcentaje, el riesgo y el resumen (o `general`) sin la calificación nueva, y una lectura posterior sí los ve. **Estos dos son los que distinguen la instantánea:** en READ COMMITTED el agregado vería la calificación y la celda no. Ver N-24 sobre los tres de cursor. |
| **CAL-1B04** | mismo archivo, un caso | **Cubierta.** Usa el gancho de consultas con cuatro tamaños: 2×2, 30×2, 2×30 y 30×30. Las precondiciones comprueban que todas las filas y columnas entran en la página, así que crecen de verdad. La lista exacta de llamadas es de 7 sentencias en el gradebook, 9 con los dos cursores y 4 en «Mis calificaciones», y es igual en los cuatro tamaños. |
| **CAL-1B05** | `mis-calificaciones.integracion.test.ts`, cinco casos | **Cubierta.** `general` es `toEqual` contra `calificacionGeneral` de `core/` con los agregados a mano (1300/20 y 0/10; 32.5), incluida la calificada sin entrega (D, 0 puntos). Las tareas calificadas del compañero no entran. **Los cinco filtros** van con nueve tareas, vencidas y por vencer, entregadas a tiempo y con retraso, calificadas con y sin entrega, una con fila `asignado` y otras sin fila: `asignadas` → [G]; `entregadas` → [H, B, A]; `calificadas` → [I, C, D]; `sin-entregar` → [F, E]. Los revisé contra §D-7.2 y son correctos. El cursor recorre cada filtro de dos en dos. Una entregada como cursor de «calificadas» sirve. Uno de otra clase o inexistente da `400` con «cursor: no es válido». Los límites 0, 101 y texto y un filtro desconocido dan `400`. **Nunca otro alumno:** el compañero ve solo sus calificaciones, con su `general` (100, con `sinCategoria` 1), y las de la alumna le salen `asignado`. **Nunca `version`:** `leer` exige que el cuerpo no contenga `version` en ninguna respuesta. Las llaves de la respuesta y de cada tarea son exactamente las del esquema. |
| **CAL-1B06** | `calificaciones-lecturas-autorizacion.integracion.test.ts`, dos casos | **Cubierta, con toda la tabla de "Autorización" de las dos rutas.** Gradebook: sin token `401`; estudiante `403 ROL_NO_PERMITIDO`; maestro ajeno `403 SIN_ACCESO_A_LA_CLASE`; clase inexistente con el mismo cuerpo; `:claseId` mal formado `400`; cambio pendiente `403 CAMBIO_DE_CONTRASENA_REQUERIDO`; maestro y admin `200`, con la deudora restringida, el deudor y la del cambio pendiente en las filas. «Mis calificaciones»: sin token `401`; maestro de la clase y admin `403 ROL_NO_PERMITIDO`; no inscrito `403 SIN_ACCESO_A_LA_CLASE`; restringida `403 ACCESO_RESTRINGIDO`; cambio pendiente `403`; el inscrito deudor `200` (60). **Sin fuga:** `pedir` pasa cada respuesta, de éxito o de error, por `CLAVES_DE_FUGA` en el caso que la produce (el remedio de M-05), con `estadoPago`, `accesoRestringido`, `motivoRestriccion`, `email`, `"rol"`, `deudor` y `@`. |
| **CAL-1B07** | `gradebook.integracion.test.ts`, un caso | **Cubierta.** Para Ana, Beto y Carla compara `mis.general.porcentaje` con el de su fila del gradebook (Beto con `null`) y el modo. Los dos lados salen de `calificacionGeneral` sobre la misma suma (§D-6.5 y §D-7.4). |
| **CAL-1B08** | `calificaciones-lecturas-estatico.test.ts`, seis casos | **Cubierta.** Comprueba que no hay escrituras de Prisma, `$executeRaw`, SQL de escritura ni `FOR … UPDATE/SHARE`. Hay exactamente 3 `$queryRaw` etiquetados y ningún `Unsafe`. Los ciclos no consultan (precondición: hay ciclos que revisar); tampoco hay `async` en `map`/`forEach` ni `Promise.all`. `instantaneaUnica: true` aparece 2 veces en el texto crudo y 2 en el código, dentro de `enTransaccion` de cada función. La cadena exacta de las dos rutas aparece literal y `alumnoId: perfilDe(request).id`. Las nueve respuestas nuevas de `shared/` son `z.strictObject`. Los comentarios de los cinco archivos de `src` no nombran las palabras de §D-0.9. |
| C-1 y C-4 | `sesiones-y-cadena.ataque`, `lecturas-fx-r1.ataque` | En verde en mi corrida completa. Sus hashes son los de la tabla de la ronda 0 (las reescribió el tester). |

### Cotejo del código
- **`adapters/db/calificaciones.ts` contra §D-6 y §D-7:**
  - **Instantánea y orden:** cada lectura corre en un solo `enTransaccion(…, { instantaneaUnica: true })`, con las sentencias en serie (todas con `await`, sin `Promise.all`). El único ciclo (`agregadosDeLaClase`, de `:193` a `:197`) agrupa filas en memoria; el `else` dentro del ciclo lo permite `CLAUDE.md`.
  - **Cursores:** el de tareas se comprueba por `(id, clase_id)` con `tarea.findFirst` y, si falta, da `400 VALIDACION` (`"cursorTareas: no es válido"` y `"cursor: no es válido"`). Después la página va por conjunto de claves sobre los valores leídos, sin el `cursor` de Prisma. El de alumnos va por `condicionesDePaginaDeAlumnos`, importada sin cambiar `inscripciones.ts`, que lo comprueba por PK y da `400`. Las dos páginas usan `paginar`.
  - **SQL:** los tres `$queryRaw` son plantillas etiquetadas con `${claseId}::uuid`, `${ahora}` y `${alumnoId}::uuid`, y su texto es el de §D-6.5, §D-6.6 y §D-7.4. Los dos agregados del gradebook recorren toda la clase.
  - **Cálculos de `core/`:** `calificacionGeneral`, `motivosDeRiesgo` y `promedioDeLaClase`. El promedio de la clase se toma sobre los alumnos del agregado y el riesgo sobre los de los dos agregados, como pide §D-6. `totalAlumnos` es `inscripcion.count` con `usuario.activo`.
  - **Formas imposibles:** una celda `calificado` sin calificación (o al revés), o una tarea sin título, lanza `ERROR_INTERNO` en vez de inventar un dato. Los `?? SIN_ENTREGA`, `?? SIN_AGREGADOS` y `?? 0` son ausencias legítimas (sin fila, sin calificadas o sin vencidas) y no esconden datos.
  - **Lo que no se lee:** ninguna consulta selecciona correo, estado de pago, restricción, rol ni `version`.
  - **Decisiones menores del programador:** las acepto las cinco. Los filtros van con `AND: [keyset, filtro]`, porque los dos llevan `fechaLimite`. Las celdas no se consultan con la página vacía. El `modo` sale de `core/`.
- **`handlers/calificaciones.ts`:**
  - **Cadena:** el gradebook va con `protegido({ roles: ["maestro", "admin"], pertenencia: "propiedad" })` y «Mis calificaciones» con `protegido({ roles: ["estudiante"], pertenencia: "inscripcion" })`.
  - **Lo que hace el handler:** `alumnoId: perfilDe(request).id`, la consulta con `validarParametros` (el patrón de `admin.ts` y `clases.ts`) y la fecha límite a ISO 8601 con `toISOString()`. Responde con `parse` del esquema estricto. No compara rol ni relación, ni toca Prisma.
- **`shared/src/calificaciones.ts`:**
  - **Respuestas:** son `z.strictObject`. La fila del alumno es `alumnoDeEntregaSchema` (`{ id, nombre }`, estricto). No hay `version`, correo, estado de pago, restricción ni rol, y «Mis calificaciones» no trae el promedio de la clase.
  - **Consultas:** las dos son `paginacionSchema.extend`. Los límites son 1 a 50 (25) y 1 a 50 (20) en el gradebook, y 1 a 100 (20) en «Mis calificaciones».
  - **Importaciones:** de `enlaces-registro.ts` y `entregas.ts`, y ninguno de los dos importa `calificaciones.ts` (`grep`), así que no hay ciclo. `index.ts` reexporta por nombre.
- **Paso 0 (N-14 y N-15):**
  - **Mínimo y sin cambio de comportamiento:** las tres ramas inalcanzables de `decidirCalificacion` lanzan `formaInalcanzable()` (`ERROR_INTERNO`), y `calificacionDe` queda con guardas que dan los mismos cuatro resultados. Las pruebas de 01a no cambiaron y pasan.
- **E6:** solo el comentario, el título y `"calificaciones.ts"` en la lista ordenada, exactamente lo que dice la lista cerrada. Fuera de E6 no cambió ninguna prueba normal: el `git status` de `backend/test/` solo da `bloqueo-usuario.integracion` y las dos C-n del tester.
- **READMEs:** las dos secciones nuevas describen lo que hace el código, incluidas las sentencias (7 y 9; 4 y 5). Ver N-21.
- **`EXPLAIN`:**
  - **Lo del programador:** lo hizo sobre datos sintéticos (79 823 entregas) y no muestra ningún `Seq Scan` sobre `entregas` ni `tareas`.
  - **Mi repetición:** corrí §D-6.5 y §D-6.6 contra `campus_dev` por `docker exec … psql`, dentro de `BEGIN READ ONLY … ROLLBACK`, sin `ANALYZE` y sin leer `.env`. La base local es casi vacía (7 clases, 1 tarea y 0 entregas).
  - **Plan natural de §D-6.5:** el único `Seq Scan` es sobre `usuarios`, lo esperable con tan pocas filas, y no cuenta como PA-04. `tareas` va por `tareas_clase_id_fecha_limite_idx`, `entregas` por `entregas_alumno_id_idx` e `inscripciones` por `inscripciones_pkey`.
  - **Con `enable_seqscan = off`:** las dos consultas resuelven todo con índices. En §D-6.6, `tareas` va por `tareas_clase_id_fecha_limite_idx` con el rango `fecha_limite < now()`.
  - **Conclusión:** ningún recorrido secuencial sobre `entregas` ni `tareas`. PA-04 no aplica.
- **"No se toca":**
  - **Dentro de los paquetes:** `git diff --stat 216c1b5 -- <todas las rutas de la lista, incluido frontend/ entero>` da vacío.
  - **Fuera de los paquetes:** `git diff --stat d998282 -- AGENTS.md CLAUDE.md docs/ARCHITECTURE.md docs/ARCHITECTURE-ESSENTIALS.md docs/PRD.md docs/DESIGN.md .claude infra package.json package-lock.json` da solo los dos documentos de A-6. Sus SHA-256 (`f868938f…2cb3` y `f47574dd…d47f`) son los de `aprobacion.md`, y `git diff --stat 216c1b5` sobre esas rutas da vacío, así que no cambiaron después de `<K1a>`.
  - **Sin archivos nuevos** en esas rutas (`git status --untracked-files=all`).

### Juicios del punto 5
1. **El `if` anidado del hilo privado (`adapters/db/entregas.ts:844-847`, de ENTREGAS-01):**
   - **Decisión:** se queda como está en 01b y va a un pendiente con destino (N-22).
   - **Por qué no se aplana ahora:** es código de ENTREGAS-01, ajeno a las calificaciones y ya atacado. N-15 nombraba solo `calificacionDe`, y el paso 0 era el cambio mínimo. Aplanarlo ahora abriría superficie de ataque por un detalle de estilo.
   - **El hermano que el programador descartó:** `core/calificaciones/calificar.ts:132-138` (`if (criterios.length === 0) { if … throw; if … throw; return }`) tiene la misma forma que el `calificacionDe` anterior, así que su argumento de que "no es un if/else anidado" no se sostiene. Lo pongo en el mismo pendiente y no devuelvo el resumen. El programador dio una razón, aunque no la comparto. El alcance de N-15 lo fijé yo, y era `calificacionDe`. Y es una rama de 01a con veredicto RESISTE.
2. **La lista desactualizada de quién usa la instantánea única (`backend/src/adapters/README.md:165`):**
   - **Decisión:** se corrige en 01b (N-21).
   - **Por qué ahora:** 01b agrega un usuario más (`calificaciones.ts`), el README es archivo de 01b (paso 4), es una línea de documentación y ninguna prueba lo lee.
   - **Cuándo:** en la primera corrección del programador en 01b. Si el tester da RESISTE sin hallazgos, va como cambio de documentación antes de mi revisión final, sin ronda del tester.
3. **Los `DeprecationWarning` de `pg`:**
   - **Origen:** son anteriores a 01b. Sale uno por proceso de trabajo de Vitest, y ya estaban en las corridas de 01a (18 a 19) y desde el inicio del encargo (14). No los causa el cambio y no bloquean.
   - **Destino:** pendiente en `docs/ESTADO.md` §3 (N-23).

### Hallazgos
Ningún `M-nn`: nada bloquea.

- **N-21 — La lista de quién usa la instantánea única en `adapters/README.md` está desactualizada.**
  - Dónde: `backend/src/adapters/README.md:165`, «Hoy la usan `listarClasesAdmin`, …, `listarPublicaciones` y `listarComentarios`».
  - Qué falta: no nombra a los usuarios de `tareas.ts` ni de `entregas.ts` (ENTREGAS-01), ni a `leerGradebook` y `leerMisCalificaciones` (01b).
  - Qué se espera: que la frase nombre a todos los que hoy pasan la opción, o que remita a cada sección en lugar de enumerarlos.
  - Destino: el programador, en 01b (punto 5.2). De paso, el comentario de `handlers/calificaciones.ts:45-46` corta la frase en «(S-01: el» y sigue en la línea siguiente. Se puede reacomodar en el mismo cambio, sin formateador.
- **N-22 — Dos `if` anidados sin aplanar, hermanos de N-15.**
  - Dónde: `adapters/db/entregas.ts:844-847` (ENTREGAS-01) y `core/calificaciones/calificar.ts:132-138` (01a).
  - Qué se espera: aplanarlos con guardas, como `calificacionDe`, sin cambiar el comportamiento.
  - Destino: pendiente en `docs/ESTADO.md` §3, para el `chore` posterior a CALIFICACIONES-01 (el mismo de S-15).
- **N-23 — `DeprecationWarning: Calling client.query() when the client is already executing a query` de `pg` en la suite del backend.**
  - Qué es: sale uno por proceso de trabajo, y ya estaba antes de 01b. Lo anuncia `pg@9`, que lo quitará.
  - Qué se espera: localizar quién encadena consultas sobre el mismo cliente (con `--trace-deprecation`) antes de cualquier actualización mayor de `pg` o de `@prisma/adapter-pg`.
  - Destino: pendiente en `docs/ESTADO.md` §3, con destino «antes de actualizar `pg` a 9».
- **N-24 — Los tres casos de cursor borrado de CAL-1B03 no distinguen la instantánea.**
  - Por qué: el conjunto de claves se arma con los valores que ya se leyeron. Por eso esos casos también pasarían en READ COMMITTED; lo que demuestran es que no se usa el `cursor` de Prisma (la regla T-18), que es lo que pide la viñeta («no deja una página vacía»).
  - Lo que sí distingue la instantánea: los dos casos de la calificación que llega en medio.
  - Destino: sin acción. Lo anoto para el tester.
- **N-25 — El resumen dice «fuera: solo `docs/ARCHITECTURE.md`».**
  - Por qué: su `git diff --stat d998282` no incluía `docs/ARCHITECTURE-ESSENTIALS.md`, que también cambió por A-6. Lo compensó con el `diff` contra `216c1b5` y los SHA-256 de los dos, que coinciden.
  - Destino: sin acción. En el próximo resumen, que la lista de "fuera" incluya los dos.

### Desacuerdos arbitrados
- `calificar.ts:132-138`: el programador dice que no es un `if/else` anidado. No estoy de acuerdo, porque tiene la misma forma que N-15. Se resuelve como pendiente (N-22), sin devolver el resumen.

### Veredicto
**RESUMEN ACEPTADO.** Las cifras coinciden y las ocho viñetas existen y prueban lo que piden. El código cumple §D-6, §D-7, §D-9, §D-10 y §D-11, la cadena de "Autorización" y "Acceso a datos". "No se toca" y las `*.ataque` están intactos. La ronda 1 del tester de 01b puede empezar. N-21 va a la primera corrección del programador en 01b. N-22 y N-23 van a `docs/ESTADO.md` §3, y N-24 y N-25 no piden acción.

## Revisión final — CALIFICACIONES-01b
Veredicto: **APROBADO CON OBSERVACIONES**
Verificación propia: lint `0` en shared, backend y frontend · test backend `Test Files  216 passed (216)` · `Tests  2617 passed (2617)`; frontend `Test Files  166 passed (166)` · `Tests  2536 passed (2536)` · build `0` en los tres · `prisma validate` válido

Nada bloquea. El código de 01b es el que acepté en la verificación del resumen, más N-21, que solo cambia texto. El tester dio RESISTE en la ronda 1, sin hallazgos. Las 183 `*.ataque` son iguales a su tabla. "No se toca" está vacío y no hay migración nueva. La subentrega cumple RF-17, la parte de datos de RF-18, RF-37, RN-02, RN-03, RN-05 y RN-06. Las observaciones abiertas tienen destino. Los textos de A-6 de 01b van abajo, con cada fragmento viejo comprobado en su documento.

### Mis corridas (una a la vez; Docker Desktop encendido; sin `--write` ni `--fix`; no terminé ningún proceso)
Precondición PA-01: `Get-NetConnectionProfile` da la red `uacam5 2` con perfil `Private`; Docker Engine 28.5.1 responde. Es la misma red que usaron el tester y el programador en esta subentrega. PA-01 no aplica.

| Paquete | Comando | Código | Última línea / resumen |
|---|---|---|---|
| shared | `npm run lint` | 0 | `All matched files use Prettier code style!` |
| shared | `npm run build` | 0 | `> tsc -p tsconfig.json` |
| backend | `npm run lint` | 0 | `> tsc -p tsconfig.json --noEmit && tsc -p tsconfig.test.json` |
| backend | `npm run test` (18:53:09Z a 18:55:52Z; salida en `<scratchpad>/backend-final-01b.log`) | 0 | `Duration  158.25s (transform 23.25s, setup 7.23s, import 258.64s, tests 1305.21s, environment 64ms)`; `Test Files  216 passed (216)` · `Tests  2617 passed (2617)` |
| backend | `npm run build` | 0 | `> tsc -p tsconfig.json` |
| backend | `npx prisma validate` | 0 | `The schema at prisma\schema.prisma is valid 🚀` |
| backend | `npx vitest list` | 0 | 2617 líneas; 216 archivos distintos (`sed 's/ >.*//' \| sort -u \| wc -l`) |
| frontend | `npm run lint` | 0 | `> tsc -b` |
| frontend | `npm run test` (18:57:41Z a 19:00:24Z) | 0 | `Duration  159.73s (transform 48.97s, setup 105.26s, import 449.96s, tests 723.29s, environment 371.88s)`; `Test Files  166 passed (166)` · `Tests  2536 passed (2536)`; 0 `Test timed out` |
| frontend | `npm run build` | 0 | `✓ built in 1.06s` |

### Cifras
| Cifra | Esperada (orquestador, tester y programador) | Mía | Coincide |
|---|---|---|---|
| Backend: casos y archivos | 2617 en 216 | 2617 en 216 (corrida y `vitest list`) | Sí |
| Las 4 `*.ataque` de la ronda 1 de 01b | 11 · 18 · 7 · 2 (38) | 11 · 18 · 7 · 2 | Sí |
| Las 5 pruebas normales de 01b | 7 · 5 · 6 · 2 · 6 (26) | 7 · 5 · 6 · 2 · 6 | Sí |
| Frontend: casos y archivos | 2536 en 166 | 2536 en 166 | Sí |
| `"Error no controlado"` · `"code":"P2028"` · `40P01` | 10 · 5 · 0 | 10 · 5 · 0 | Sí |
| `deadlock detected` · `could not serialize` · `too many clients` · `Test timed out` · `Unable to start a transaction` | 0 en todas | 0 en todas | Sí |
| `DeprecationWarning` de `pg` (N-23) | 18 a 19, uno por proceso | 19 | Sí, anteriores a 01b |
| `*.ataque` iguales a la tabla de 183 de la ronda 1 de 01b | 183 de 183 | 183 de 183 (`sha256sum` en minúsculas, ordenado por ruta, `diff` vacío) | Sí |
| `instantaneaUnica: true` en `adapters/db` | 14 en 5 archivos | 2 + 4 + 4 + 2 + 2 = 14, todas en código | Sí |

### N-21: cotejo del cambio (solo texto)
- **Qué cambió después de mi verificación del resumen:** por fecha de modificación, solo `backend/src/adapters/README.md` y `backend/src/handlers/calificaciones.ts` (12:44:59, después de la ronda 1 del tester). El resto del código de 01b quedó como estaba cuando lo verifiqué (11:05 a 11:19), y las pruebas de la ronda 1 (12:36) corrieron contra ese código.
- **`adapters/README.md:165`:** la frase final nombra las 14 lecturas por archivo. La cotejé con un `awk` que asigna cada `instantaneaUnica: true` a su función exportada: `leerClase`, `listarClasesImpartidas`, `listarClasesInscritas` y `listarClasesAdmin` (`clases.ts`); `listarPublicaciones` y `listarComentarios`; `leerTarea` y `listarTrabajo`; `leerMiEntrega`, `listarEntregas`, `leerEntregaDeAlumno` y `listarHiloPrivado`; y `leerGradebook` y `leerMisCalificaciones`. Coincide uno por uno. C-4 no lee el README (solo archivos `.ts`/`.js` de `src`) y sigue en verde.
- **`handlers/calificaciones.ts:44-46`:** el comentario ya no corta la frase en «(S-01: el». El texto es el mismo y el código de las dos rutas también: la cadena, `perfilDe(request).id`, `validarParametros`, `toISOString()` y `parse` del esquema estricto. CAL-1B08 y CAL-T-69 están en verde.
- **Hermano del programador:** la otra enumeración del README (la de `{ maxWait }`) está al día (`enlaces-registro.ts:128` y `:204`). Lo comprobé.

### "No se toca"
- **Dentro de los paquetes:** `git diff --stat 216c1b5 -- <todas las rutas de la lista del plan, más backend/prisma, backend/src/app.ts, core/calificaciones/general.ts, core/calificaciones/riesgo.ts, adapters/db/tareas.ts y frontend/ entero>` → vacío.
- **Fuera de los paquetes:** `git diff --stat d998282 -- AGENTS.md CLAUDE.md docs/ARCHITECTURE.md docs/ARCHITECTURE-ESSENTIALS.md docs/PRD.md docs/DESIGN.md .claude infra package.json package-lock.json` → solo los dos documentos de A-6 de 01a. Sus SHA-256 son `f868938f0a2ac223c9b1140b1b7ac4aaea5971415accfb47755a9f1aa5fb2cb3` (`ARCHITECTURE.md`) y `f47574ddcd79bd0c47530137d6b547ffb6b6d6dd9c3009c77fbd23711b07d47f` (ESSENTIALS), iguales a los de `aprobacion.md`, y contra `216c1b5` el `diff` está vacío.
- **Archivos nuevos:** `git status --untracked-files=all` da solo el adaptador nuevo, `ayudas-gradebook.ts` (permitido: ayuda nueva en archivo nuevo), las 5 pruebas normales y las 4 `*.ataque` de la ronda 1.
- **`backend/prisma`:** sin cambios. 01b no trae migración.
- **Pruebas normales cambiadas:** solo E6 de `bloqueo-usuario.integracion`, dentro de la lista cerrada de 01b. Las dos `*.ataque` modificadas (`sesiones-y-cadena` y `lecturas-fx-r1`) son C-1 y C-4 de la ronda 0 del tester, con los hashes de su tabla.

### Definición de terminado (`AGENTS.md`), punto por punto
| Punto | ¿Cumple? | Evidencia |
|---|---|---|
| **RF-17** "Mis calificaciones" por clase | **Sí (backend)** | `GET /clases/:claseId/mis-calificaciones`: `general` con el porcentaje; tareas con estado y calificación; filtro `todas`, `asignadas`, `entregadas`, `calificadas` y `sin-entregar`, con el cursor por clase. Lo cubren CAL-1B05, CAL-T-60 a CAL-T-64 y CAL-T-54 (borde del milisegundo). La vista llega en 01d. |
| **RF-18** modal de cálculo, parte de datos | **Sí** | `general` es `CalificacionGeneral` completo: `modo`, `porcentaje`, `puntos`, `categorias` (peso, peso efectivo, porcentaje, obtenido, posible y tareas) y `sinCategoria`. Sale en cada página, de su misma instantánea. Ninguna ruta de categorías se abre al alumno (S-17 de TAREAS-01). El modal es de 01d. |
| **RF-37** gradebook | **Sí (backend)** | Alumnos × tareas en dos dimensiones paginadas; resumen de toda la clase (`promedioDeLaClase`, `alumnosEnRiesgo`); `motivosDeRiesgo` por fila, para destacar al alumno. Lo cubren CAL-1B01, CAL-1B02, CAL-T-43 a CAL-T-55 y CAL-T-67. |
| **RN-02** estado de pago | **Sí** | Ninguna consulta de `calificaciones.ts` selecciona correo, estado de pago, restricción, rol ni `version` (CAL-T-68). Las nueve respuestas son `z.strictObject` y la fila del alumno es `{ id, nombre }`. "Sin fuga" se comprueba en cada respuesta, de éxito o de error, con alumnos deudores y restringidos en la clase (CAL-1B06 y CAL-T-59). El gradebook tampoco se lo da al maestro, por S-05. |
| **RN-03** restricción | **Sí** | El alumno restringido recibe `403 ACCESO_RESTRINGIDO` en "Mis calificaciones" por `GET` (también con consulta inválida) y por `HEAD`, sin datos (CAL-1B06 y CAL-T-65). En el gradebook aparece en su fila, sin el dato de la restricción. |
| **RN-05** cálculo (P-05 a, S-04, S-08) | **Sí** | Las dos vistas usan `calificacionGeneral`, `promedioDeLaClase` y `motivosDeRiesgo` de `core/` (01a, con los cinco casos de `AGENTS.md`) sobre la misma suma en centésimas (CAL-1B07). P-05 (a): por puntos dentro de la categoría. Redistribución y "Sin categoría" fuera (CAL-T-48). De categorías a puntos (CAL-T-52). Umbral sobre el redondeado: 69.995 → 70, fuera de riesgo (CAL-T-53). S-04: constantes, y el inscrito tarde cuenta las vencidas anteriores (CAL-T-51). S-08 y T-01: una calificada sin entrega cuenta en el promedio y no como vencida (CAL-1B01 y CAL-T-48). Nada se guarda. |
| **RN-06** propiedad | **Sí** | Gradebook: `protegido({ roles: ["maestro", "admin"], pertenencia: "propiedad" })`, así que entran los maestros de la clase y el admin en cualquier clase, y el maestro ajeno o una clase inexistente reciben `403 SIN_ACCESO_A_LA_CLASE`, sin oráculo por la validación (CAL-T-57). "Mis calificaciones": `roles: ["estudiante"], pertenencia: "inscripcion"`, y el alumno sale de `perfilDe(request).id`. |
| Capas y cadena de middleware | **Sí** | `core/` no cambia de dependencias (el paso 0 solo agrega `formaInalcanzable`). El adaptador importa de `core/` y nunca al revés. Prisma y SQL viven solo en `adapters/db/calificaciones.ts`: tres `$queryRaw` etiquetados, sin `Unsafe`. Los handlers son delgados y no comparan rol ni relación (CAL-1B08 y CAL-T-69). |
| Consultas sanas | **Sí** | El número de sentencias es fijo: 7 y 9 en el gradebook, 4 y 5 en "Mis calificaciones" (CAL-1B04, y CAL-T-55 con seis tamaños). Las listas tienen tope (50 × 50 y 100). Los cursores se comprueban por llave y la página va por conjunto de claves (regla T-18). `EXPLAIN` sin recorrido secuencial sobre `entregas` ni `tareas` (mi verificación del resumen). |
| Instantánea única | **Sí** | `instantaneaUnica: true` en las dos lecturas, con las sentencias en serie. La distinguen CAL-1B03, dos casos, y CAL-T-32 a CAL-T-41, con el control negativo en READ COMMITTED (CAL-T-42), que con la tarea movida de categoría da `ERROR_INTERNO`. N-24 queda resuelta. |
| `lint`, `build` y `test` en verde | **Sí** | Tabla de arriba: los tres paquetes, de uno en uno. |
| Pruebas de autorización de los dos endpoints | **Sí** | CAL-1B06 cubre la tabla de "Autorización" completa en las dos rutas. CAL-T-56 a CAL-T-58, CAL-T-65 y CAL-T-66 cubren `HEAD`, el maestro ajeno con consultas inválidas, `:claseId` mal formado o en mayúsculas, el alumno dado de baja (`403`) y el desactivado (`401`). |
| Migración | **No aplica** | `backend/prisma` sin cambios. |
| `infra/` y `.env.example` | **No aplica** | Sin cambios. Los umbrales son constantes (S-04). |
| Documentos | **Pendientes de A-6 de 01b** | Textos literales abajo. `adapters/README.md` y `handlers/README.md` ya están actualizados (paso 4 y N-21). |

**Estilo (`CLAUDE.md`):** el estilo se respeta:
- **Retornos tempranos:** el paso 0 aplanó `calificacionDe`, y las formas imposibles lanzan `ERROR_INTERNO` en vez de inventar un valor.
- **Valores por defecto:** los `??` de `calificaciones.ts` son ausencias legítimas (sin fila, sin calificadas o sin vencidas).
- **Errores tipados:** se lanzan en el adaptador, y el handler no lleva `try/catch`.
- **Pendiente:** los dos `if` anidados de N-22 quedan para el `chore`.

### Hallazgos del tester
La ronda 1 de 01b terminó **RESISTE con 0 hallazgos**: no hay nada que corregir ni que arbitrar. Revisé sus 38 casos por categoría en el reporte. CAL-T-42, el control negativo, es la prueba más valiosa de la subentrega: demuestra que sin la instantánea la tarea movida de categoría sería un `500` real.

### Documentos a actualizar (textos literales; los aplica el orquestador con A-6 tal cual, después de este APROBADO)
Cada fragmento viejo existe una sola vez en su documento, en el árbol actual (`grep -c -F` = 1). Los rótulos de `ARCHITECTURE.md` siguen a A-1 a A-5 de 01a y se llaman ARQ-6 y ARQ-7, para no confundirlos con la autorización A-6. Lo que describe la interfaz (la sección "Calificaciones" de la clase y las filas de `CLAUDE.md`) espera a 01c y 01d (N-26). **`CLAUDE.md` no cambia en 01b:** sus cambios son de `frontend/` (filas `tareas` y `calificaciones`, "Ubicaciones compartidas"), y su lista de dominios del backend ya incluye `calificaciones`. `DESIGN.md` tampoco cambia: 01b no tiene interfaz.

**E-5. `docs/ARCHITECTURE-ESSENTIALS.md`, "Reglas de negocio que tocan código" (línea 115).** Es el texto de mi revisión final de 01a; agrego una oración al final por S-04/R-13, que el humano aceptó y CAL-T-51 comprueba. Reemplazar la viñeta literal
> `- Alumno en riesgo: promedio < 70 % o ≥ 3 tareas vencidas sin entregar.`

por
> `` - Alumno en riesgo: promedio < 70 % o ≥ 3 tareas vencidas sin entregar. Los umbrales son constantes de `core/` hasta que exista la configuración (RF-56), y el promedio que se compara es el redondeado que se muestra. "Vencidas sin entregar" son las tareas de la clase con la fecha límite pasada y sin entrega `entregado` ni `calificado` del alumno: una calificada sin entrega no cuenta, porque su calificación ya pesa en el promedio. Cuentan también las que vencieron antes de que el alumno se inscribiera, como en "Trabajo de clase" (S-04) (CALIFICACIONES-01). ``

**ARQ-6. `docs/ARCHITECTURE.md`, "Reglas de acceso a datos" (línea 425).** Es el texto del plan, ajustado a lo implementado: el gradebook hace dos `GROUP BY` y "Mis calificaciones", uno. Reemplazar la viñeta literal
> `- **Promedios, gradebook, alumnos en riesgo y KPIs se calculan con consultas agregadas**, no se guardan.`

por
> `` - **Promedios, gradebook, alumnos en riesgo y KPIs se calculan con consultas agregadas**, no se guardan. El gradebook lee en una sola instantánea, con dos `GROUP BY` sobre toda la clase: lo calificado por alumno y categoría, y las vencidas sin entregar por alumno. "Mis calificaciones" lee con uno: lo calificado del alumno por categoría, por `entregas_alumno_id_idx`. Los dos aplican las mismas funciones de `core/calificaciones/` sobre la misma suma, así que el porcentaje de un alumno es el mismo en las dos vistas (CALIFICACIONES-01). ``

**ARQ-7. `docs/ARCHITECTURE.md` §7, fila `calificaciones` (línea 236).** Es el texto del plan, ajustado a lo implementado: los límites, quién entra, qué no sale y los valores de `estado`. Reemplazar el fragmento literal del final de la fila
> `` · `GET /clases/{id}/gradebook` · `GET /me/calificaciones` | ``

por
> `` · `GET /clases/{claseId}/gradebook?cursor=&limite=&cursorTareas=&limiteTareas=` (los maestros de la clase y el admin, en cualquier clase. Alumnos × tareas por ventanas: de 1 a 50 alumnos (25) con el cursor del roster, y de 1 a 50 tareas (20) en orden `(fecha_limite DESC, id DESC)`. Cada fila trae sus celdas, su porcentaje, sus vencidas sin entregar y sus motivos de riesgo. El resumen (modo, total de alumnos, promedio de la clase y alumnos en riesgo) es de toda la clase, no de la página. Nunca trae el correo, el estado de pago, la restricción, el rol ni la `version`) · `GET /clases/{claseId}/mis-calificaciones?estado=&cursor=&limite=` (solo el alumno inscrito, y siempre el de la sesión. `estado` = `todas`, `asignadas`, `entregadas`, `calificadas` o `sin-entregar`; de 1 a 100 tareas (20). Cada página trae la calificación general con su desglose por categorías. Sin `version`, sin el promedio de la clase y sin nada de otro alumno) (CALIFICACIONES-01) | ``

**PRD-1. `docs/PRD.md`, RF-17 (línea 89).** Reemplazar el fragmento literal
> `(todo, asignado, entregado, calificado, sin entregar) | M |`

por
> `(todo, asignado, entregado, calificado, sin entregar). Solo las calificaciones propias, con el desglose del cálculo de RF-18; sin el promedio de la clase ni datos de otros alumnos (CALIFICACIONES-01) | M |`

El plan proponía además «En la sección "Calificaciones" de la clase». Esa frase describe la interfaz de 01d y se agrega al cerrar 01d (N-26).

**PRD-2. `docs/PRD.md`, RF-36 (línea 109).** Es el texto del plan. Reemplazar el fragmento literal
> `dejar comentario privado y publicar la calificación | M |`

por
> `dejar comentario privado y publicar la calificación. Publicar es devolver: el alumno ve la calificación en cuanto se guarda; el comentario va a los comentarios privados de la entrega. Se puede recalificar (CALIFICACIONES-01) | M |`

**PRD-3. `docs/PRD.md`, RN-05 (líneas 190 y 192).** Es el texto del plan, con el ajuste de (c′) de mi revisión final de 01a y la regla de T-01 en "Alumno en riesgo". Son dos reemplazos.

(a) Reemplazar la viñeta literal
> `- Una clase sin categorías califica por puntos. Con categorías, toda tarea nueva o editada lleva una; una tarea sin categoría no cuenta en la calificación general hasta asignarle una (TAREAS-01).`

por estas dos viñetas, en dos líneas (la primera queda igual):
> `- Una clase sin categorías califica por puntos. Con categorías, toda tarea nueva o editada lleva una; una tarea sin categoría no cuenta en la calificación general hasta asignarle una (TAREAS-01).`
> `- Dentro de una categoría, por puntos. Una tarea con entregas calificadas no cambia sus puntos ni su rúbrica. Se puede calificar a quien no entregó solo con la entrega cerrada: la fecha límite vencida en una tarea que no acepta entregas con retraso (CALIFICACIONES-01).`

(b) Reemplazar el fragmento literal
> `(Umbrales iniciales, ajustables en configuración.)`

por
> `(Umbrales iniciales, ajustables en configuración; constantes hasta que exista la configuración, RF-56. Una tarea calificada sin entrega no cuenta como vencida sin entregar; CALIFICACIONES-01.)`

**PRD-4. `docs/PRD.md` §11, "Supuestos tomados" (línea 285; Enmienda 1, N-09).** Es el texto del plan. Reemplazar la viñeta literal
> `- Umbrales de "alumno en riesgo" de RN-05.`

por
> `- Umbrales de "alumno en riesgo" de RN-05: promedio menor a 70 % o 3 o más tareas vencidas sin entregar, como constantes hasta que exista la configuración (RF-56) (CALIFICACIONES-01).`

**EST-1. `docs/ESTADO.md` §3, fila «Para CALIFICACIONES: los ids de los criterios… y la regla de P-01 para el cálculo» (línea 293).** Esta fila se cierra en 01b. En la columna "Destino", reemplazar el fragmento literal
> `` La regla de P-01 para el cálculo (`core/calificaciones/general.ts`, con pruebas) la usan las lecturas de 01b: se cierra ahí ``

por
> `` **Regla de P-01 para el cálculo resuelta en CALIFICACIONES-01b (2026-10-13):** el gradebook y "Mis calificaciones" calculan con `calificacionGeneral` (`core/calificaciones/general.ts`). Una clase sin categorías califica por puntos y, con categorías, una tarea "Sin categoría" no cuenta (CAL-1B01, CAL-1B05, CAL-T-48 y CAL-T-52). Fila cerrada ``

**EST-2. `docs/ESTADO.md` §3, fila de N-14 y N-15 (línea 276).** Se resolvió en el paso 0 de 01b. Reemplazar el fragmento literal
> `| CALIFICACIONES-01b, primer paso del programador, declarado en su resumen |`

por
> `` | **Resuelta en CALIFICACIONES-01b (2026-10-13), paso 0:** `formaInalcanzable()` (`ERROR_INTERNO`) en las tres ramas inalcanzables y `calificacionDe` con guardas, sin cambio de comportamiento; las pruebas de 01a pasan sin cambios | ``

**EST-3. `docs/ESTADO.md` §3, dos filas nuevas.** Van inmediatamente después de la fila que empieza con `| N-19 de CALIFICACIONES-01a (O-r1-2 del tester)`:
> `` | N-22 de CALIFICACIONES-01b: dos `if` anidados sin aplanar, hermanos de N-15: `adapters/db/entregas.ts:844-847` (hilo privado, ENTREGAS-01) y `core/calificaciones/calificar.ts:132-138` (`criterios.length === 0`, 01a). Aplanarlos con guardas, sin cambio de comportamiento | El `chore` posterior a CALIFICACIONES-01 (el mismo de S-15) | `revision.md` de CALIFICACIONES-01, "Verificación del resumen — CALIFICACIONES-01b" | ``
> `` | N-23 de CALIFICACIONES-01b: `DeprecationWarning: Calling client.query() when the client is already executing a query` de `pg` en la suite del backend (uno por proceso de trabajo de Vitest; 14 al inicio del encargo, 18 a 19 desde 01a; anterior a 01b). `pg@9` quitará ese comportamiento. Localizar quién encadena consultas sobre el mismo cliente, con `--trace-deprecation` | Antes de actualizar `pg` a 9 o `@prisma/adapter-pg` a una versión mayor | ídem, y "Revisión final — CALIFICACIONES-01b" | ``

En los bloques entre dos acentos graves dobles (E-5, ARQ-6, ARQ-7, EST-1, EST-2 y EST-3), lo que se aplica es el texto de dentro, sin el espacio de cada extremo; en los de un solo acento grave, el texto de dentro.

**Errata.** No hay errata del plan en 01b.

### Problemas que bloquean
Ninguno (sin `M-nn`).

### Observaciones abiertas y su destino (lista cerrada)
| Id | Qué | Estado y destino |
|---|---|---|
| N-21 | Lista de usuarios de la instantánea única en `adapters/README.md` y corte del comentario de `handlers/calificaciones.ts` | **Resuelta** en "01b — N-21". Cotejada arriba. |
| N-22 | Dos `if` anidados: `entregas.ts:844-847` y `calificar.ts:132-138` | Pendiente para el `chore` posterior a CALIFICACIONES-01 (EST-3). |
| N-23 | `DeprecationWarning` de `pg`: 19 en mi corrida, uno por proceso, anterior a 01b | Pendiente «antes de actualizar `pg` a 9» (EST-3). |
| N-24 | Los casos de cursor borrado de CAL-1B03 no distinguían la instantánea | **Resuelta por el tester** en la ronda 1: CAL-T-32 a CAL-T-41 la distinguen, y CAL-T-42 (control negativo en READ COMMITTED) prueba que sin ella fallarían, uno con `ERROR_INTERNO`. Sin acción. |
| N-25 | La lista de "fuera" del resumen de 01b omitía ESSENTIALS | El resumen de N-21 tampoco nombra ESSENTIALS en "fuera" (dice «las mismas rutas»). Lo comprobé yo y está vacío contra `216c1b5`. Sin acción; queda para el próximo resumen. |
| N-19 | Texto de `409 TAREA_CON_ENTREGAS` con solo calificadas sin entrega | Sigue para el humano al cierre del encargo (`ESTADO.md` §3). 01b no lo toca. |
| S-16/R-07 | Desplegar juntos frontend y backend; no revertir el backend a antes de 01a con calificaciones | **01b no suma nada.** Las dos rutas son nuevas: no cambia ninguna respuesta existente ni el esquema, y ningún frontend las consume todavía. Revertir solo 01b no rompe la base. La fila DEPLOY queda como está. |
| **N-26** | Lo que describe la interfaz no va en los documentos de 01b: «En la sección "Calificaciones" de la clase» de RF-17 (texto del plan) y las filas de `CLAUDE.md` | Al cerrar 01d (RF-17 y la fila `calificaciones` de `CLAUDE.md`) y 01c (fila `tareas` y "Ubicaciones compartidas"), con los textos del plan. |
| **N-27** | Las dos corridas rojas del frontend que tuvo el programador en la implementación de 01b (tiempos de espera; los 27 archivos pasaban solos) no se reprodujeron: mis dos corridas de 01b salieron en verde a la primera (134 s y 160 s) y ningún archivo de `frontend/` cambió en 01b | Sin acción en 01b. Si se repite en 01c o 01d, se trata como PA-12 (rojo intermitente) con la carga del equipo anotada. |

### Riesgos residuales de 01b
1. **Agregados sobre toda la clase en cada petición (R-03).** Cada página y cada ventana del gradebook repite los dos `GROUP BY` de la clase completa: recorrer 4 ventanas de tareas son 4 agregados iguales. Es correcto (el resumen no depende de la página, CAL-T-49) y barato con decenas de alumnos, pero el costo crece con alumnos × tareas calificadas. DEPLOY lo mide. Si una clase llega a cientos de alumnos, la salida es una vista materializada, que es una decisión de ESSENTIALS.
2. **`EXPLAIN` con pocos datos.** El del programador usó 79 823 entregas sintéticas y el mío una base casi vacía (sin `ANALYZE`). Con estadísticas reales, el planificador puede elegir otra cosa. El orden `(fecha_limite DESC, id DESC)` usa `tareas(clase_id, fecha_limite)` y desempata por `id` en memoria. Si DEPLOY ve un ordenamiento caro, el índice `(clase_id, fecha_limite DESC, id DESC)` ya está propuesto en el plan ("Acceso a datos").
3. **Tope de ventanas.** El máximo por petición es 50 × 50 = 2500 celdas, con una sola consulta `IN` de hasta 50 tareas y 50 alumnos, y 100 tareas en "Mis calificaciones". La respuesta queda acotada. La conexión queda ocupada durante 7 a 9 sentencias en REPEATABLE READ, y con el pool lleno la respuesta es `503 SERVICIO_OCUPADO`, como cualquier lectura con instantánea única.
4. **`modo` por puntos o por categorías.** Lo decide la existencia de categorías en la instantánea. Cuando una clase pasa de puntos a categorías (o al revés), cambian a la vez todos los porcentajes, el promedio y el riesgo, y una tarea "Sin categoría" empieza o deja de contar (CAL-T-52). Es la regla de P-01 de TAREAS-01, pero el maestro lo verá como un salto. Entre páginas de "Mis calificaciones", `general` puede cambiar si llega una calificación o cambian las categorías (R-09): la vista de 01d muestra el de la última página.
5. **Inscrito tarde (S-04/R-13, aceptado por el humano).** Cuentan las vencidas anteriores a su alta, así que puede entrar "En riesgo" el día que se inscribe (CAL-T-51). Queda escrito en E-5.
6. **N+1 interno de Prisma.** CAL-1B04 y CAL-T-55 cuentan llamadas del adaptador, no sentencias SQL reales (el tester lo declaró). Hoy Prisma resuelve `categoria` y `publicacion` por lotes. Un cambio de versión de Prisma que lo hiciera por fila no lo vería ninguna prueba. Es un riesgo bajo y compartido con todas las lecturas anidadas del proyecto.

### Métricas de 01b
- **Rondas del tester:** 1 (RESISTE), **0 extra**. La ronda 0 no cuenta.
- **Resúmenes del programador devueltos:** **0 de 2** (implementación y N-21).
- **PARADAS:** **0**.
- **Hermanos y estados vecinos:** no hubo correcciones de hallazgos. El único hermano declarado (el `if` del hilo privado) y el que agregué (`calificar.ts:132-138`) van a N-22.
- **Regla del programador (decisión del humano, 2026-10-05):** 01b no suma rondas extra por hermanos ni por estados vecinos. El `programador` sigue en `sonnet` para 01c.

### Desacuerdos arbitrados
Ninguno nuevo en 01b. El de `calificar.ts:132-138` ya quedó resuelto en la verificación del resumen (N-22).

### Para el humano
- **N-19** sigue pendiente para el cierre del encargo. No hace falta decidirlo ahora.
- No hay decisiones nuevas de producto ni de arquitectura en 01b.

### Veredicto
**APROBADO CON OBSERVACIONES.** 01b cumple el plan, solo el plan y todo el plan de la subentrega:
- **Lo implementado:** las dos lecturas en una instantánea única, el cálculo de `core/` en los dos lados, la cadena de "Autorización" y nada del estado de pago ni de otro alumno.
- **Verificación:** `lint`, `test` y `build` de los tres paquetes, y `prisma validate`, en verde en mi corrida. Las 183 `*.ataque` están intactas y "No se toca" está vacío.
- **Observaciones:** N-22, N-23, N-26 y N-27 tienen destino. N-19 sigue para el humano.
- **Siguiente paso:** el orquestador aplica E-5, ARQ-6, ARQ-7, PRD-1 a PRD-4 y EST-1 a EST-3 tal cual, y entrega al humano el bloque de commit de 01b.

## Verificación del resumen — CALIFICACIONES-01c
Veredicto: **RESUMEN DEVUELTO.** Mis corridas coinciden con todas las cifras del resumen, salvo una: el encabezado de la matriz dice "24 filas" y tiene 28 (N-28). Las catorce viñetas (CAL-1C01 a CAL-1C14) tienen su archivo y el título exacto. Leí el código de cada caso y todas prueban lo que pide el plan. "No se toca" está vacío, las 183 `*.ataque` son iguales a la tabla de la ronda 0 de 01c y ninguna prueba normal cambió. Lo devuelvo por **M-06**: en un estado vecino que la matriz no lista, el formulario se vuelve a montar con una recarga de fondo. Así pierde lo escrito y toma en silencio la versión nueva, sin `409`. Eso contradice la fila B1, §D-12.5 y el §7.27 de `DESIGN.md`, y el plan lo nombra como punto de ataque de 01c ("una recarga de fondo que reinicia el panel sin `409`"). Si no se corrige ahora, es una ronda extra segura del tester.

### Mis corridas (una a la vez; Docker Desktop encendido; sin `--write` ni `--fix`; no terminé ningún proceso; ningún navegador)
| Paquete | Comando | Código | Última línea / resumen |
|---|---|---|---|
| frontend | `npm run lint` | 0 | `> tsc -b` (antes: `All matched files use Prettier code style!`) |
| frontend | `npm run test` (22:29:39Z a 22:31:28Z, **primera corrida**) | 0 | `Duration  106.17s (transform 26.13s, setup 72.63s, import 240.21s, tests 447.21s, environment 332.88s)`; `Test Files  170 passed (170)` · `Tests  2595 passed (2595)` |
| frontend | `npm run build` | 0 | `✓ built in 735ms` |
| backend | `npm run test` (22:33:31Z a 22:35:49Z, después de la del frontend; O-r0c-1) | 0 | `Duration  132.98s (transform 14.80s, setup 6.56s, import 257.38s, tests 1040.47s, environment 65ms)`; `Test Files  216 passed (216)` · `Tests  2617 passed (2617)` |

- **N-27:** la suite del frontend pasó en verde a la primera, en 106 s (109 s de reloj), sin ningún `Test timed out`. No hay nada intermitente que reportar.
- **Conteos:** `npx vitest list` desde `frontend/` da 2595 líneas con " > " en 170 archivos (`awk -F' > ' 'NF>1{print $1}' | sort -u | wc -l`). Por archivo nuevo (`grep -c "<archivo> >"`): `calificar-01c.test.tsx` 35, `calificacion-01c.test.tsx` 4, `estatico-01c.test.ts` 7 y `format-01c.test.ts` 13.
- **Inventarios del backend** (`grep -o -F … | wc -l` sobre mi salida): `"Error no controlado"` 10, `"code":"P2028"` 5, `40P01` 0, `deadlock detected` 0, `could not serialize` 0 y `Test timed out` 0. `muro-c-r1.ataque` y `muro-c-r2.ataque` (R-24) pasan dentro de la suite completa.
- **Comprobación aparte de M-06:** escribí un guion de Node en el scratchpad de la sesión, fuera del repositorio, con el `react` y el `react-dom` del repositorio y `jsdom`. Reproduce la forma de `contenido()`: un fragmento con la nota y el formulario, o el formulario solo. Al pasar de `asignado` a `calificado`, el inicializador perezoso corre otra vez (`montajes 1` → `2`) y la apertura pasa de 0 a 1.

### Cifras (las suyas, las mías y si coinciden)
| Cifra | Programador | Mía | Coincide |
|---|---|---|---|
| Frontend: casos y archivos | 2595 en 170 | 2595 en 170 | Sí |
| Casos nuevos por archivo | 35 · 4 · 7 · 13 (+59 en 4) | 35 · 4 · 7 · 13 | Sí |
| Backend: casos y archivos | 2617 en 216 | 2617 en 216 | Sí |
| `"Error no controlado"` · `P2028` · `40P01` | 10 · 5 · 0 | 10 · 5 · 0 | Sí |
| Últimas líneas de `lint` y `build` del frontend | `> tsc -b` · `✓ built in 722ms` | `> tsc -b` · `✓ built in 735ms` | Sí (solo cambia el tiempo) |
| Duración del frontend | 107.31 s | 106.17 s | Sí |
| `*.ataque` iguales a la tabla de la ronda 0 de 01c | 183 de 183 | 183 de 183 (`sha256sum` en minúsculas contra la tabla; `diff` vacío) | Sí |
| Filas de la matriz de §D-14 | "24 filas" (encabezado de la sección 2) | 28 (A1–A13, B1–B5, C1–C4, D1–D3, E1–E3); `aprobacion.md` dice 28 | **No** (N-28) |
| Archivos nuevos y cambiados | 7 nuevos y 9 cambiados (incluido `DESIGN.md`) | los mismos (`git status` y `git diff --stat 10e5a02`) | Sí |

### Cotejo viñeta por viñeta de 01c (leí el código de cada caso)
| Viñeta | Archivo y casos | Juicio |
|---|---|---|
| **CAL-1C01** | `calificar-01c.test.tsx`, "panel con rúbrica": 8 casos (1 + 5 de `it.each` + 2) | **Cubierta.** Las etiquetas "Claridad (de 5 puntos)" llevan `inputmode="decimal"` y `autocomplete="off"`, y el total en vivo da 7.5 de 9 → 8.33 y 7 de 9 → 7.78. Los cinco casos de validación local cubren vacío, 6, -1, 1.234 y "cuatro": ningún `PUT`, foco en el primer campo, `aria-invalid` y el texto del `ErrorDeCampo` por `aria-describedby`, sin aviso. `aNumeroDePuntos` acepta "8,5", " 8.5 " y "08.50" y da `NaN` con "8.", ".5", "1e1", "Infinity", "-1", "", "8.123", "8,5,1" y "0x10". **El cuerpo** exige con `toEqual` exacto `{ version: 2, puntosDeLaTarea: 10, puntajes en el orden de la rúbrica, calificacion: null, comentario: "Buen trabajo" }`. Antes de enviar, una recarga de fondo trae la entrega con versión 7 y la tarea con 20 puntos y otra rúbrica; la precondición comprueba que llegaron los dos `GET`, las etiquetas y el total siguen siendo los de apertura y "Estructura" no aparece. |
| **CAL-1C02** | mismo archivo, 2 casos | **Cubierta.** Exige "Calificación (de 80 puntos)", `puntajes: []`, `calificacion: 72.5` con coma y sin `comentario` cuando solo había espacios. El error de vacío y el de 80.5 salen bajo el campo, con el foco ahí. |
| **CAL-1C03** | mismo archivo, 2 casos | **Cubierta.** Hay un solo `success` ("Calificación publicada"), la caché tiene exactamente la respuesta y la lista de entregas y el gradebook (bajo el prefijo) quedan `isInvalidated`. El hilo se vuelve a pedir con comentario (1 → 2) y no sin él. Ningún `GET` de la entrega de más. Los campos muestran lo guardado, el comentario queda vacío, aparece "Actualizar calificación" y el foco va al `h3`. Recalificar avisa "Calificación actualizada" y envía `version: 4`. |
| **CAL-1C04** | mismo archivo, 5 casos | **Cubierta, con los cuatro vecinos.** Hay un aviso con el mensaje del servidor y exactamente un `GET` más de la entrega, en espera (`aria-busy`) y sin `disabled`. Un clic y un `submit` durante la recarga no envían ningún `PUT`. Al llegar, lo escrito se descarta, el foco va al `h3` y el siguiente cuerpo lleva `version: 5`. **Vecinos:** (1) con dos `409` seguidos se envían las versiones `[2, 3]` y después 4, con dos avisos y tres `GET`. (2) Si la recarga da 5xx, los avisos son exactamente `[409, recarga fallida]`, lo escrito se conserva, el botón sale de la espera, el foco queda en el botón y el siguiente envío reusa `version: 2`. (3) Un `404 ALUMNO_NO_ENCONTRADO` en la recarga reemplaza la vista, deja solo el aviso del `409` y lleva el foco a la raíz (`tabindex=-1`). (4) Si se pulsa "Volver a las entregas" con la recarga en vuelo y llega un 5xx, no hay `console.error` ni un segundo aviso. "Enter" se prueba con `fireEvent.submit`: es el mismo `onSubmit` y lo acepto. |
| **CAL-1C05** | mismo archivo, 3 casos | **Cubierta, con M-02.** Hay un `GET` de la tarea y uno de la entrega, y el panel se reinicia con "Estructura (de 10 puntos)" y el foco en el `h3`. Sin rúbrica, cuando los puntos pasan de 10 a 100, el panel muestra "Calificación (de 100 puntos)" y los cuerpos llevan `puntosDeLaTarea` 10 y después 100. En el vecino, si la recarga de la tarea falla con 5xx, salen dos avisos (el del `409` y el de la tarea), no se reinicia nada y lo escrito se conserva. |
| **CAL-1C06** | mismo archivo, 7 casos | **Cubierta, con N-11.** El caso de `ENTREGA_NO_CALIFICABLE` **distingue N-11**: el servidor cambia `aceptaTardias` de `false` a `true` entre la apertura y la recarga. Si solo se pidiera la entrega, `sePuedeCalificar` volvería a pintar el formulario. Exige dos `GET` de la tarea y dos de la entrega, la frase, ni nota ni botón, el foco en el `h3` y un solo aviso. Los demás: un `400` de `puntajes.1.puntos` pinta el error en "Ortografía", con su descripción accesible, el foco ahí y sin aviso. Con `503` y sin conexión hay un aviso, lo escrito se conserva, el botón sale de la espera y el foco sigue en él. Un `404` del alumno da un aviso y reemplaza la vista. Vecinos: un `404` de la tarea da un aviso y "Esa tarea ya no existe."; un `ACCESO_RESTRINGIDO` redirige sin aviso y sin recarga. |
| **CAL-1C07** | mismo archivo, 1 caso | **Cubierta.** Un clic, otro clic y dos `submit` con la respuesta en vuelo hacen un solo `PUT`, con `aria-busy` y `aria-disabled` y sin `disabled`. |
| **CAL-1C08** | mismo archivo, 5 casos | **Cubierta, con (c′).** El admin ve "Calificación: 8.5 de 10", la fecha, el desglose y el `h3`, sin `textbox` ni botones de calificar; sin calificación lee "Sin calificar todavía.". Una entrega `asignado` sin vencer muestra la frase dentro del `Card` del panel, sin `textbox`. **(c′):** vencida en una tarea que no acepta tardías → la nota y el formulario; vencida en una que sí las acepta → la frase, sin nota ni botón. |
| **CAL-1C09** | `calificacion-01c.test.tsx`, 3 casos | **Cubierta.** Calificada con entrega: dentro de la sección "Tu trabajo" salen "Tu entrega ya está calificada.", "Calificación: 8.5 de 10", la fecha, los dos criterios y "Entregaste el …". Calificada sin entrega y sin rúbrica: la frase nueva, "Calificación: 0 de 10", sin la frase de hoy, sin "Entregaste el", sin `listitem` y sin "Anular entrega". Sin calificación no aparece nada nuevo. |
| **CAL-1C10** | mismo archivo, 1 caso | **Cubierta.** Hay un aviso con el mensaje del servidor y ningún `success`. Un `PUT` y el mismo número de `GET` de la tarea que antes. El título y los puntos escritos se conservan y el foco queda en "Guardar cambios", sin navegar. |
| **CAL-1C11** | `format-01c.test.ts`, 13 casos | **Cubierta.** Siete enteros y decimales, incluidos 1000 sin separador y 0; 7.777 → "7.78" y ningún "8.50". Cinco porcentajes con U+00A0, que comprobé con `od`: en la prueba es un literal y en `format.ts` va escrito como escape (R-24). |
| **CAL-1C12** | `estatico-01c.test.ts`, 2 casos | **Cubierta, con O-r0c-2.** Recorre más de 100 archivos de producción sin comentarios y el literal queda solo en `components/clase/data.ts`. Las dos llaves de `features/tareas` son ese valor (`toBe`). |
| **CAL-1C13** | mismo archivo, 5 casos | **Cubierta.** Revisa los 11 archivos de producción nuevos o cambiados, con precondición de que existan. Cubre todo lo que pide la viñeta: sin `disabled`, `?? []`, `fetch(`, `console.`, valores por defecto, vidrio, `data-material`/`data-densidad` ni importaciones de otro módulo; los compartidos no importan de `features/`; `renovarTrasErrorDeLaEntrega(` 3 veces y ninguna después de `useCalificarEntrega`; los tipos solo en `types.ts` y los componentes solo con `…Props`; la vista sin correo, pago ni `perspectivaDeRuta(`. Los comentarios no tienen las palabras de §D-0.9, con una sola excepción literal anterior a 01c y escrita con su motivo. |
| **CAL-1C14** | `calificar-01c.test.tsx`, 2 casos | **Cubierta tal como la escribe el plan.** Frase → formulario con la versión de ese momento (`version: 1`, sin `409`), y formulario → frase con el foco en la raíz, no en `<body>`. **Le falta el estado vecino de M-06.** |

### Cotejo de la matriz de §D-14 con el código, fila por fila
Código: `useCalificarEntrega` (`hooks.ts:509-541`), `FormularioDeCalificacion` y `PanelDeCalificacion` (`panel-de-calificacion.tsx`), y `recargarTrasConflicto` y `calificacion()` (`entrega-de-alumno-view.tsx:98-153`). `useFocoAlPerderseElControl` y `useAvisoDeRecargaFallida` no cambian.

| Fila | Juicio | Lo que vi en el código |
|---|---|---|
| A1 `200` | Cumple | `onSuccess` hace `setQueryData`, invalida la lista, el prefijo y, solo con `cuerpo.comentario`, el hilo, y da un aviso según `habiaCalificacion`. Después `onCalificada` suma un reinicio y el panel lleva el foco al `h3`. Con la vista desmontada, los callbacks de `useMutation` corren igual y `setReinicios` sobre un componente desmontado no hace nada. Cuando la entrega era `asignado`, `setQueryData` ya vuelve a montar el formulario antes del reinicio (es el mecanismo de M-06), pero aquí da igual, porque el reinicio viene enseguida. |
| A2 `ENTREGA_MODIFICADA` | Cumple | El gancho solo avisa. El `catch` espera a `onConflicto` dentro del `try`, así que la guarda y `enEspera` siguen tomadas toda la recarga y se liberan en el `finally`. `recargarTrasConflicto` no hace nada si la vista ya no está montada (`montadoRef`, al empezar y al volver). |
| A3 `RUBRICA_MODIFICADA` | Cumple | `Promise.all` con `tarea.refetch()` porque `recargaLaTareaTrasConflicto` es verdadero. |
| A4 `ENTREGA_NO_CALIFICABLE` (N-11) | Cumple | Está en `CODIGOS_QUE_RECARGAN_LA_TAREA_AL_CALIFICAR`. El `Card` y el `h3` siguen montados y el reinicio enfoca el `h3`. |
| A5 recarga de la entrega fallida | Cumple | Un aviso con `avisoRecargaFallida`, ningún reinicio, y el `finally` libera el botón. El foco no se mueve. |
| A6 recarga de la tarea fallida | Cumple (desviación 2) | `tareaNueva.isError` hace `return` sin aviso propio. Avisa `useAvisoDeRecargaFallida`: está activo con datos en caché y sin error que reemplace la vista, y su marca `errorUpdateCount:errorUpdatedAt` es nueva en cada fallo, así que también avisa en el segundo `409` seguido. |
| A7 recarga con `404`/`403` | Cumple | `errorQueReemplazaLaVista` y ningún aviso. Si es la tarea, `useAvisoDeRecargaFallida` está inactivo porque la vista se reemplaza. El foco va a la raíz. |
| A8 recarga con un error con que `apiClient` redirige | Cumple en lo que se ve (N-29) | En la entrega, `errorQueRedirigeElCliente` no avisa. En la tarea, `useAvisoDeRecargaFallida` sí daría su aviso, porque no excluye los códigos que redirigen; viene de ENTREGAS-01e. `irA` es `window.location.assign`: la página se recarga y el aviso no se llega a ver. |
| A9 `400` de un campo | Cumple | `esErrorDeCampoDeCalificacion` silencia el gancho. `erroresDeCalificacionDeApi` traduce la posición a la llave del criterio enviado y `enfocarPrimerError` busca el campo por `name`. |
| A10 `404`/`403` | Cumple | `pedirDeNuevoLaTarea` y `avisarDelErrorDeLaEntrega`, la misma deduplicación que el hilo. El `catch` del formulario devuelve `null` y no pinta nada. |
| A11 redirige | Cumple | `errorQueRedirigeElCliente` hace `return` antes del aviso. Lo prueba CAL-1C06 (vecino). |
| A12 `503`, 5xx o red | Cumple | `mensajeDeErrorTareas`, un aviso y el foco en el botón (CAL-1C06). |
| A13 `400` de un id | Cumple | No se puede alcanzar desde la vista. Si llegara, daría un aviso, como dice la fila. |
| **B1** recarga de fondo con otra versión | **No cumple en un estado (M-06)** | Cumple mientras el formulario no cambia de lugar en el árbol: `entregado` ↔ `calificado`, o la misma entrega con otra versión (CAL-1C01). **No cumple** si la entrega pasa de `asignado` (cerrada, con la nota) a `calificado` porque otro maestro de la clase, o el mismo en otra pestaña, calificó a quien no entregó. `contenido()` devuelve `<>nota + formulario</>` en un caso y el formulario solo en el otro, y React lo vuelve a montar: se pierde lo escrito, la versión de apertura pasa a ser la nueva, el siguiente guardado ya no recibe `409`, el aviso no sale y, si el foco estaba en un campo, va a la raíz. |
| B2 frase → formulario (N-03) | Cumple | El formulario nace con su inicializador perezoso cuando `sePuedeCalificar` pasa a verdadero (CAL-1C14). |
| B3 formulario → frase | Cumple | El foco va a la raíz (CAL-1C14). |
| B4 recarga que reemplaza la vista | Cumple | Sin cambio desde ENTREGAS-01e. |
| B5 recarga con 5xx y datos | Cumple | Sin cambio. El panel no se toca. |
| C1 tarea con otros puntos o rúbrica | Cumple | `apertura.tarea` decide las etiquetas, el total y el cuerpo (CAL-1C01). |
| C2 tarea que cambia si se puede calificar | Cumple | `sePuedeCalificar(entrega, tarea, new Date())` usa la tarea actual. Se comporta como B2 y B3. |
| C3 y C4 | Cumple | Sin cambio. |
| D1 a D3 | Cumple | La invalidación del hilo solo ocurre con comentario y `useHiloPrivado` no cambia. |
| E1 `TAREA_CON_CALIFICACIONES` | Cumple | Solo suma el código a `CODIGOS_CON_MENSAJE_DEL_SERVIDOR`. No está en `CODIGOS_QUE_RENUEVAN_LA_TAREA` (CAL-1C10). |
| E2 y E3 | Cumple | Sin cambio desde ENTREGAS-01a. |

**Estado que falta en la matriz:** "Recarga de fondo que deja la entrega calificable pero cambia la nota de entrega cerrada (de `asignado` a `calificado`), con el formulario a la vista". Es el de M-06. Ninguna otra fila falta: revisé los caminos de la guarda (envío, recarga, `finally`), del foco (montaje, reinicio, control perdido, vista reemplazada) y de los avisos (gancho y vista, montada y desmontada).

### Reglas de `CLAUDE.md` y de `DESIGN.md` (sin hallazgo, salvo M-06 en §7.27)
- **Componentes y formularios:** un solo `primary` con `enEspera` y guarda con ref; ningún `disabled`. Cada campo lleva `autoComplete="off"`, `aria-invalid` y `ErrorDeCampo` enlazado con `aria-describedby`; el comentario, además, su ayuda permanente. `noValidate` y Enter por `onSubmit`.
- **Valores por defecto:** no hay `?? []`. Los `?? ""` son de campos de texto y son válidos. `calificacion` nunca lleva un valor por defecto: el admin compara con `=== null` y "Tu trabajo" con `!== null`.
- **Retornos y JSX:** solo retornos tempranos. Los únicos ternarios en JSX son de un nivel (el texto del botón, `aria-describedby` y la lectura del admin).
- **Módulo:** los textos están en `data.ts` y los tipos en `types.ts`; los componentes solo declaran `…Props`. `CalificacionDeEntrega` y `CalificarEntrega` se reexportan de `@campus/shared`. No hay ningún `fetch` y nada importa de otro módulo de `features`: `services/calificacionesService.ts` y `lib/format.ts` no importan de `features/`.
- **Diseño:** solo tokens y utilidades de la escala (`text-small`, `text-h3`, `text-body`, `font-bold`, `text-muted-foreground`, `text-foreground`, `gap-*`, `pt-1`, `wrap-anywhere`). Sin vidrio, porque el panel es un `Card`. Sin emojis, con el tono de §9. El estado se dice con texto (nota, frase, "Sin calificar todavía.").
- **Marcas "propuesta (CALIFICACIONES-01c)":** §7.24, §7.26 y §7.27 describen lo que hace el código y nada más, salvo una frase. "Lo que se vio" de §7.27 dice "Una recarga de fondo no cambia lo escrito", y M-06 la contradice en un estado. Con M-06 corregido, el texto queda bien. El `tabIndex={-1}` del `h3` del admin, que nada enfoca, está escrito en §7.26. Es inofensivo y no pido quitarlo.

### Las seis desviaciones declaradas
| # | Desviación | Juicio |
|---|---|---|
| 1 | `recargaLaTareaTrasConflicto` en lugar de `esRubricaModificada` | **Aceptada.** Es lo que pide N-11, registrada como precisión en `aprobacion.md`. Los dos códigos viven en `data.ts` y CAL-1C06 distingue el caso. |
| 2 | Si falla la recarga de la tarea, avisa con el texto de `useAvisoDeRecargaFallida` (dos avisos, no tres) | **Aceptada.** La regla de fondo de §D-14 es un aviso por hecho: el `409` y una recarga fallida. Si la vista sumara su texto, la tarea perdida daría dos avisos. Queda escrito en §7.27 y lo prueba CAL-1C05 (vecino). No hace falta enmienda. |
| 3 | `esErrorDeCampoDeCalificacion` y `fraseDePuntaje` en `lib.ts` | **Aceptada.** Son funciones puras del módulo, en su archivo, y no amplían el alcance. |
| 4 | Singular "de 1 punto" y "Escribe de 0 a 1 punto." | **Aceptada.** Es la concordancia correcta, con el criterio que ya existía en `puntosDeLaFila`. El plan solo daba la forma general. |
| 5 | El foco al primer error se busca por el `name` del campo | **Aceptada.** El `name` de cada campo es su llave de error y el resultado es el mismo que con un mapa de refs. CAL-1C01, CAL-1C02 y CAL-1C06 lo prueban. |
| 6 | `claveGradebook(claseId, { cursor, cursorTareas })` | **Aceptada para 01c.** Todavía nadie la usa. 01d puede ajustarla sin enmienda si su ventana necesita otra forma, siempre que siga colgando del prefijo que invalida calificar. Para 01d: el tipo de la ventana, mejor derivado de `gradebookQuerySchema` de `shared/` que escrito a mano en la firma (N-30). |

### "No se toca", `*.ataque` y pruebas normales
- **Dentro de los paquetes, contra `<K1b>`:** `git diff --stat 10e5a02 -- frontend backend shared` muestra solo `components/clase/data.ts`, `lib/format.ts` (A-4), los seis archivos de `features/tareas` de §D-12 y `styles/clases-r1.ataque.test.ts` (C-7 del tester). Los no rastreados son los dos componentes de §D-12, `services/calificacionesService.ts` (A-4) y las cuatro pruebas nuevas. `backend/` y `shared/` no cambian.
- **Fuera, contra `<R>`:** solo `docs/ARCHITECTURE-ESSENTIALS.md`, `docs/ARCHITECTURE.md` y `docs/PRD.md` (vacíos contra `<K1b>`; sus SHA-256 `2ce262f4…0c98`, `1092813b…5e93` y `ee54d6fa…38e5` son los de `aprobacion.md`), y `docs/DESIGN.md`, por el paso 6. `AGENTS.md`, `CLAUDE.md`, `.claude/`, `infra/`, los `package.json` y el `package-lock.json` no cambian.
- **Las 183 `*.ataque`** son iguales a la tabla de la ronda 0 de 01c. **Ninguna prueba normal cambió**, como pide la lista cerrada vacía de 01c.

### Hermanos y estados vecinos del resumen, contra el código
- **Foco del panel:** las ocho situaciones de la lista coinciden con el código y con sus pruebas.
- **Versión de apertura:** las cinco situaciones listadas coinciden. **Falta una:** la nota que aparece o desaparece mientras el formulario sigue siendo calificable (M-06). Es un estado vecino del mismo mecanismo (inicializadores perezosos más la identidad del formulario en el árbol), y la regla del 2026-10-05 pide listarlo.
- **Recarga tras un `409` y aviso de recarga fallida:** coinciden (A2 a A8).
- **Números:** coinciden. `aNumeroDePuntos` es la única entrada de los tres campos de puntos y del total. Los dos formateadores comparten el mismo `Intl.NumberFormat`.
- **T-01 en "Trabajo de clase":** **coincido.** Una calificada sin entrega tiene estado `calificado`, y "Calificado" dice exactamente eso: no afirma que entregó. La frase "No entregaste esta tarea y ya está calificada." la aclara en "Tu trabajo", y la entrega de un alumno ya dice "Todavía no entrega." por la fecha. `lib/estado-de-entrega.ts` está en "No se toca". No es PA-03 y no pide cambio.

### Hallazgos

#### M-06 — El formulario se vuelve a montar con una recarga de fondo cuando la entrega pasa de `asignado` a `calificado` (bloquea)
- **Dónde:** `frontend/src/features/tareas/components/panel-de-calificacion.tsx:282-307`, en `contenido()`. Con la entrega `asignado` (cerrada) devuelve `<>{nota}{formulario}</>`; con cualquier otro estado devuelve `formulario` solo, en la misma posición del `CardContent`.
- **Qué pasa:** el maestro A tiene abierto el formulario de un alumno que no entregó (la entrega está cerrada y se ve la nota) y está escribiendo. Mientras tanto, el maestro B de la misma clase, o el mismo A en otra pestaña, lo califica. Una recarga de fondo de la entrega trae `calificado` (por ejemplo, al volver a la pestaña con `refetchOnWindowFocus`). El tipo del hijo cambia de `Fragment` a `FormularioDeCalificacion` y React desmonta el formulario y monta otro. Lo comprobé con un guion fuera del repositorio: el inicializador corre dos veces y la apertura pasa de 0 a 1. Resultado:
  - lo escrito por A se pierde sin ningún aviso;
  - la versión de apertura pasa a ser la nueva sin `409`, así que el siguiente guardado de A pisa la calificación de B sin que nadie se lo diga;
  - el botón cambia a "Actualizar calificación";
  - si el foco estaba en un campo, va a la raíz.
- **Por qué importa:** contradice la fila B1 de §D-14 ("el panel **no** se reinicia; […] recibe `409`"), §D-12.5 ("Ninguna otra recarga de fondo cambia lo escrito ni la versión") y el §7.27 de `DESIGN.md`. Además, es el primer punto de ataque de 01c en el plan ("una recarga de fondo que reinicia el panel sin `409` (pierde lo escrito)"). Ni la matriz ni la lista de hermanos de la versión de apertura incluyen este estado vecino.
- **Qué se espera (resultado, no implementación):**
  - con el formulario a la vista, una recarga de fondo que deja la entrega calificable conserva el formulario montado, con lo escrito, la versión y la tarea de apertura, aunque la nota aparezca o desaparezca;
  - el guardado siguiente envía la versión de apertura y recibe `409 ENTREGA_MODIFICADA` (fila A2);
  - una fila nueva en la matriz para ese estado;
  - un caso de prueba nuevo (sugiero un caso de CAL-1C14 (vecino), en `calificar-01c.test.tsx`): formulario con la nota y el foco en un campo, recarga de fondo con la entrega `calificado` y una versión mayor, y después lo escrito se conserva, el foco sigue en el campo, no hay aviso y el siguiente cuerpo lleva la versión de apertura;
  - la lista de hermanos completada: dónde más cambia de lugar en el árbol algo que vive en un inicializador perezoso. Que revise también los `key` y los envoltorios condicionales del panel y de `entrega-de-alumno-view.tsx`.
  - Si la nota debe quedarse o quitarse cuando la entrega pasa a `calificado` con el formulario abierto, lo decide el programador, siempre que el formulario no se vuelva a montar. Después del reinicio por `409`, el panel muestra lo que corresponda al estado nuevo.

#### Observaciones (no bloquean)
- **N-28 — Cifra del resumen:** el encabezado de la sección (2) dice "24 filas" y la matriz tiene 28 (13 + 5 + 4 + 3 + 3; `aprobacion.md` dice 28). Corregirla en el resumen de la corrección.
- **N-29 — Fila A8 en la recarga de la tarea:** si la recarga de la tarea tras `RUBRICA_MODIFICADA` o `ENTREGA_NO_CALIFICABLE` trae un código que redirige, `useAvisoDeRecargaFallida` (de ENTREGAS-01e, sin cambios) daría su aviso, porque no excluye esos códigos. No se llega a ver, porque `irA` hace `window.location.assign` y recarga la página. Basta precisar la fila en el resumen de la corrección; no pido código. Si algún día `irA` pasa a navegar dentro de la SPA, hay que excluir esos códigos en el gancho.
- **N-30 — Para 01d (desviación 6):** el tipo de la ventana de `claveGradebook` está escrito a mano en la firma. En 01d conviene derivarlo de `gradebookQuerySchema` (regla 7 de `CLAUDE.md`, por analogía) o justificarlo.
- **N-26 sigue en pie:** la fila `tareas` y "Ubicaciones compartidas" de `CLAUDE.md` (`services/calificacionesService.ts`, `formatearPuntos` y `formatearPorcentaje`, `TEXTOS_DE_LA_CLASE.sinCategoria`) los aplica el orquestador con A-6 al cerrar 01c, después de mi revisión final.

### Veredicto
**RESUMEN DEVUELTO** al programador por **M-06** (la cifra de N-28 se corrige en el mismo resumen). Las corridas, las 14 viñetas, "No se toca", las 183 `*.ataque` y las seis desviaciones están bien. El tester no ataca hasta que el resumen de la corrección traiga:
- M-06 corregido, con su caso y su fila en la matriz;
- la lista de hermanos y estados vecinos de la identidad del formulario;
- N-28 corregida;
- `lint`, `test` y `build` del frontend con su última línea.

Como la corrección solo toca el frontend, la suite del backend no hace falta, salvo que la corrección toque algo que lean `muro-c-r1` o `muro-c-r2` (R-24). Esta devolución no cuenta como ronda del tester.

## Segunda verificación del resumen — CALIFICACIONES-01c
Veredicto: **RESUMEN ACEPTADO.** El tester puede hacer la ronda 1 de 01c. M-06 está corregido y probado. Con el remontaje restituido, los dos casos nuevos fallan en la aserción de identidad del nodo, y el archivo quedó restaurado. Todas las cifras del resumen coinciden con mis corridas. La tabla de hermanos (12 caminos) y la fila B6 coinciden con el código. Quedan dos observaciones, N-31 y N-32, que no bloquean.

### Mis corridas (en `frontend/`, una a la vez; sin `--write` ni `--fix`; no terminé ningún proceso; ningún navegador)
| Comando | Código | Última línea / resumen |
|---|---|---|
| `npm run lint` | 0 | `> tsc -b` (antes: `All matched files use Prettier code style!`) |
| `npm run test` (22:49:20Z a 22:51:09Z, primera corrida) | 0 | `Duration  105.51s (transform 30.07s, setup 72.08s, import 241.66s, tests 446.13s, environment 327.88s)`; `Test Files  170 passed (170)` · `Tests  2597 passed (2597)`; `grep -c "Test timed out"` = 0 |
| `npm run build` | 0 | `✓ built in 707ms` |

El backend no lo corrí: `git diff --stat 10e5a02 -- backend shared` sale vacío y la corrección no toca nada que lean `muro-c-r1` o `muro-c-r2` (R-24).

### Cifras
| Cifra | Programador | Mía | Coincide |
|---|---|---|---|
| Casos y archivos (`npx vitest list`; `grep -c " > "`; `awk`, `sort -u` y `wc -l` sobre la primera columna) | 2597 en 170 | 2597 en 170 | Sí |
| `calificar-01c` · `calificacion-01c` · `estatico-01c` · `format-01c` | 37 · 4 · 7 · 13 | 37 · 4 · 7 · 13 | Sí |
| Última línea de `lint` y `build` | `> tsc -b` · `✓ built in 704ms` | `> tsc -b` · `✓ built in 707ms` | Sí (solo cambia el tiempo) |
| Duración del frontend y `Test timed out` | 105.85 s · 0 | 105.51 s · 0 | Sí |
| Con el remontaje restituido | 2 fallan y 35 pasan (37) | `Tests  2 failed`, 35 pasan (37) | Sí |
| Filas de la matriz (N-28) | 29 (A1–A13, B1–B6, C1–C4, D1–D3, E1–E3) | 29 | Sí |
| `git diff --stat 10e5a02 -- frontend backend shared` | `9 files changed, 485 insertions(+), 9 deletions(-)` | igual, con los mismos 9 archivos; los mismos 7 no rastreados | Sí |
| `*.ataque` iguales a la tabla de la ronda 0 de 01c | 183 | 183 de 183 (`sha256sum` en minúsculas contra la tabla; `diff` vacío) | Sí |

### Cotejo de M-06
- **Código (`panel-de-calificacion.tsx:282-313`):** el `CardContent` tiene siempre los mismos hijos y en el mismo orden: el `h3`, un comentario JSX, `{conNota && <p>}`, `{!calificable && <p>}` y `{calificable && <FormularioDeCalificacion/>}`.
  - El formulario está siempre en la última posición, con el mismo padre y sin `key` propia.
  - `conNota = calificable && entrega.estado === "asignado"` sigue el estado actual de la entrega: la nota desaparece al pasar a `calificado` y aparece al pasar a `asignado` cerrada.
  - Los inicializadores perezosos (`apertura` y `estado`, líneas 60-70) no cambian.
  - La única `key` es la de `PanelDeCalificacion` en la vista (`key={reinicios}`).
- **La vista:** `entrega-de-alumno-view.tsx` no cambió en esta corrección; su fecha de modificación es anterior a mi verificación anterior. Ningún envoltorio de la vista cambia de forma con una recarga de fondo:
  - la raíz es fija;
  - `Cargando` solo sale sin datos;
  - el `div` de datos tiene hijos fijos;
  - `calificacion()` depende solo de `perspectiva`.
- **Los dos casos nuevos (`calificar-01c.test.tsx:997-1080`):**
  - **CAL-1C14b** cumple todo lo pedido:
    - la precondición de dos `GET` de la entrega;
    - el mismo nodo antes y después (`toBe` sobre "Claridad" y sobre el `<form>`);
    - el foco sigue en el campo;
    - se conservan los tres valores escritos;
    - las etiquetas y el texto del botón son los de apertura;
    - ningún aviso antes del guardado;
    - después del guardado, `version: 0`, un solo aviso con `MENSAJE_MODIFICADA`, exactamente un `GET` más de la entrega y ninguno de la tarea, "Actualizar calificación", el foco en el `h3` y el comentario vacío.
  - **El vecino inverso** (de `entregado` a `asignado` cerrada) comprueba que aparece la nota, el mismo nodo, el foco, lo escrito, `version: 2`, un aviso y el foco en el `h3`.
- **Remontaje restituido (comprobado por mí):**
  - Copié `panel-de-calificacion.tsx` al scratchpad (SHA-256 `fd6e23bb…43fc`).
  - Con un guion fuera del repositorio volví a poner el formulario en dos posiciones: dentro de un fragmento con la nota, o solo.
  - Corrí `npx vitest run src/features/tareas/calificar-01c.test.tsx`: 2 fallan y 35 pasan (37). Los dos fallan en la aserción `toBe` de identidad (líneas 1020 y 1067). Los dos casos anteriores de CAL-1C14 siguen en verde.
  - Restauré el archivo desde la copia: el SHA-256 vuelve a ser `fd6e23bb…43fc` y `git diff --no-index` contra la copia sale vacío. El archivo no está rastreado; `git status` muestra los mismos 9 modificados y 7 no rastreados.

### Hermanos y estados vecinos (los 12 caminos, contra el código)
| # | Camino | Juicio |
|---|---|---|
| 1-2 | `asignado` cerrada ↔ `calificado` o `entregado`, con el formulario a la vista | **Coinciden.** Solo cambia el `<p>` de la nota y el formulario conserva su posición. Lo prueban los dos casos y la inyección. |
| 3 | `calificado` → `asignado` | **"No aplica" justificado.** Ningún camino del producto anula una calificación. Si ocurriera, caería en el caso 2 o en el 7. |
| 4 | `entregado` → `calificado` | **Coincide.** `conNota` es falso en los dos estados y el árbol no cambia. |
| 5 | Cambia la fecha con `entregado` | **Coincide.** Con un estado distinto de `asignado`, `sePuedeCalificar` (`lib.ts:613-620`) devuelve `true` sin leer la fecha, y el panel no lee `conRetraso`. |
| 6 | Cambian los puntos o la rúbrica con el formulario abierto (M-02) | **Coincide.** Salen de `apertura.tarea` y no se vuelven a montar (CAL-1C01 y CAL-1C05). |
| 7-8 | Frase ↔ formulario (CAL-1C14, N-03) | **Coinciden y deben remontar.** `{calificable && …}` monta y desmonta el formulario. Las dos pruebas originales de CAL-1C14 siguen en verde, también con la inyección. |
| 9 | Reinicio por `key={reinicios}` tras un `200` o un `409` | **Coincide y debe remontar** (CAL-1C03 a CAL-1C06). |
| 10 | Vista reemplazada (`404`/`403`) | **Coincide.** `contenido()` de la vista devuelve `MensajeError`. |
| 11 | 5xx o sin red con datos en caché | **Coincide.** `Cargando` solo sale sin datos. |
| 12 | Vence la fecha con la vista abierta | **Coincide.** Es el caso 8 en el siguiente render. |

No falta ningún camino. También revisé el resto del mecanismo:
- **Primera carga:** el formulario nace con la entrega de ese momento.
- **Recarga:** los casos 1, 2, 4, 5, 6 y 11.
- **Error en caché:** el caso 11.
- **Cambio de clave:** cambiar de `alumnoId` monta otra vista por la ruta, como en ENTREGAS-01e, y no cambió.
- **Fallos seguidos:** los vecinos de CAL-1C04.

### Matriz (N-28 y N-29)
- **B6:** coincide con el código.
  - El formulario no se vuelve a montar y la nota aparece o desaparece.
  - Lo escrito, la versión, los puntos, la rúbrica y el texto del botón siguen siendo los de apertura (`apertura.habiaCalificacion`; CAL-1C14b exige "Calificar y devolver" después de la recarga).
  - No hay aviso y el foco no se mueve.
  - El guardado siguiente pasa por A2.
- **A8 precisada:** coincide con lo que vi en la verificación anterior. N-29 queda cerrada sin código.
- **N-28:** corregida (29 filas).

### `DESIGN.md` §7.27
Sigue describiendo lo que hace el código: "Una recarga de fondo no cambia lo escrito" ya se cumple también en B6. Solo hay una precisión de texto (N-31). `DESIGN.md` no cambió en esta corrección.

### Observaciones (no bloquean)
- **N-31 — Texto de la nota en §7.27:** dice "si se califica a quien no entregó, antes del formulario va «Este alumno no entregó…»". El código la muestra solo mientras la entrega está `asignado` (cerrada y sin calificar). Al actualizar la calificación de quien no entregó, o en B6, la nota no sale. Así era también antes de la corrección. Basta precisar el texto, por ejemplo "mientras la entrega sigue sin calificar", en la revisión final de 01c o antes; no pido código.
- **N-32 — El vecino de CAL-1C14b:** comprueba la identidad del campo, pero no la del `<form>`. Tampoco el número de `GET` después del `409` ni el texto del aviso. La identidad del campo basta para distinguir el remontaje (lo comprobé) y lo demás lo cubre CAL-1C14b. No pido cambio.

### Veredicto
**RESUMEN ACEPTADO.** El tester puede atacar 01c en la ronda 1. Esta segunda verificación no cuenta como ronda del tester.

## Verificación de la corrección de la ronda 1 — CALIFICACIONES-01c
Base: "## 01c — corrección de la ronda 1 (T-02, T-03, N-31)" de `resumen-programador.md` (línea 606) y "## Ronda 1 de 01c" de `reporte-tester.md`. `<K1b>` = `10e5a023dc1fc215112dbf7828ab4b32cfa036e1`. Solo corrí `frontend/` (el backend no cambió), una suite a la vez. No usé formateadores, `--write` ni `--fix`. No terminé ningún proceso, no abrí navegadores, no leí `.env` y no hice commit.

### Mis corridas (en `frontend/`)
| Comando | Código | Última línea (mía) | Del resumen |
|---|---|---|---|
| `npm run lint` | 0 | `> tsc -b`, después de `All matched files use Prettier code style!` | Igual |
| `npm run test` | 0 | `Test Files  174 passed (174)` · `Tests  2699 passed (2699)` · `Duration  124.59s`; `grep -c "Test timed out"` = 0 | Igual (107.90 s; la duración varía por carga) |
| `npm run build` | 0 | `✓ built in 773ms` | `✓ built in 1.48s` (el tiempo varía por carga) |

### Cifras
| Cifra | Resumen | Mía | ¿Coincide? |
|---|---|---|---|
| Casos (`npx vitest list`, `grep -c " > "`) | 2699 | 2699 | Sí |
| Archivos (`cut -d'>' -f1 \| sort -u \| grep -c test`) | 174 | 174 | Sí |
| `calificar-01c.test.tsx` | 49 | 49 | Sí |
| `grep -c "1C06[bc]"` | 12 | 12 | Sí |
| `Test timed out` | 0 | 0 | Sí |
| `*.ataque` (SHA-256 contra la tabla de la ronda 1 de 01c) | 187 iguales | 187 iguales (`diff` vacío, normalizando mayúsculas y el `*` de `sha256sum`) | Sí |
| `git diff --stat 10e5a02 -- frontend backend shared` | 9 archivos, `520 insertions(+), 10 deletions(-)` | Igual | Sí |

CAL-T-77, CAL-T-78 y los dos CAL-T-91 de `calificar-01c-r1.ataque.test.tsx` están en verde sin cambios (sus hashes son los de la tabla). `lib/errores-de-api.ts` no cambió.

### Cotejo de T-02 (leí `hooks.ts`, `lib.ts` y `panel-de-calificacion.tsx`)
**El remedio coincide con lo que dice el resumen.**
- `useCalificarEntrega.onError` sigue este orden: `409`, luego `pedirDeNuevoLaTarea`, luego "redirige". Después calla solo si `erroresDeCalificacionDeApi(error, criteriosEnviados) !== null`. Si `mensajeDelCampoDeCalificacion` no es `null`, da un aviso con el mensaje sin el prefijo. Si no, `avisarDelErrorDeLaEntrega`.
- Panel y gancho deciden con la misma función y los mismos criterios:
  - El panel la llama con `apertura.tarea.rubrica`, que congela un `useState` perezoso.
  - El gancho la llama con `cuerpo.puntajes`, que `cuerpoDeCalificacion` arma como `tarea.rubrica.map(...)` desde esa misma apertura: mismos ids y mismo orden.
  - Como una recarga de fondo no cambia la apertura, el `null` de los dos lados coincide siempre: nunca hay dos avisos ni cero.
- Con `null`, el panel sale del `catch` sin reiniciar nada. Lo escrito se conserva y el `finally` saca el botón de la espera.

**Hermanos, uno por uno:**
| Hermano | Código | Coincide con el resumen |
|---|---|---|
| `puntajes.<i>.puntos` fuera del envío | `criteriosEnviados[i] === undefined`: `null` y un aviso | Sí (CAL-T-77, CAL-1C06b) |
| `calificacion:` con rúbrica | `criteriosEnviados.length > 0`: `null` y un aviso. Con rúbrica, el panel no pinta "Calificación" | Sí (CAL-T-78, CAL-1C06b) |
| `calificacion:` sin rúbrica | `{ calificacion }`: el panel lo pinta, sin aviso | Sí (vecino de CAL-1C06b) |
| `comentario:` sin comentario | `{ comentario }`: el `Textarea` siempre está y se pinta | Sí (vecino de CAL-1C06b) |
| `VALIDACION` sin prefijo de calificar (`version:`, `puntosDeLaTarea:`, `puntajes.<i>.criterioId:`, `puntajes:`) | La expresión no coincide: los dos dan `null` y queda `avisarDelErrorDeLaEntrega` (un aviso con `mensajeDeErrorTareas`) | Sí (CAL-1C06b con `version:`) |
| Dos campos en un mensaje | Inalcanzable: el servidor manda `issues[0]` | Sí |
| Con la vista desmontada | El aviso vive en el gancho | Sí |
| Formulario de tarea | `erroresDeLaTareaDeApi` usa `erroresDeFormularioDeApi` con `CAMPOS_DEL_FORMULARIO`, que da `null` con un campo ajeno. El gancho (`if (erroresDeLaTareaDeApi(error)) return`) y el formulario usan la misma función | Sí: el patrón ya era correcto |
| Entrega e hilo | `errorDeEnlacesDeApi` y `errorDeTextoDeApi` en el gancho y en el formulario. El grupo de enlaces y el texto siempre se pintan | Sí |
| `erroresPorCampo` (`lib/errores-de-api.ts`) | Traduce incidencias de `safeParse` del cliente, no un `VALIDACION` del servidor, y no se usa en `features/tareas` (grep) | Confirmado: no aplica |

### Cotejo de T-03 (leí `entrega-de-alumno-view.tsx` y `useAvisoDeRecargaFallida`)
- El `activo` suma `!consulta.isFetching && !entregaReemplazaLaVista`, y `entregaReemplazaLaVista` usa la misma regla que `contenido()`.
- `git diff 10e5a02 -- frontend/src/features/tareas/hooks.ts` solo trae lo de 01c (`useCalificarEntrega` y sus imports). `useAvisoDeRecargaFallida` no cambió. Las otras cinco llamadas al gancho (detalle, editar, entregas y dos de `features/clases`) tampoco cambiaron, y sus pruebas siguen en verde.
- Cruces, contra el código:
  - **Tarea 5xx + entrega 404:** solo el aviso del `409` (CAL-T-91).
  - **Tarea 5xx + entrega `403`:** solo el del `409` (CAL-1C06c).
  - **Tarea 404 + entrega 5xx:** la tarea reemplaza la vista y `recargarTrasConflicto` sale callada.
  - **Las dos 404:** igual que el cruce anterior.
  - **Las dos 5xx:** dos avisos, el del `409` y el de la tarea (sin cambio).
  - **Entrega con un código que redirige + tarea 5xx:** el aviso de la tarea se activaría, pero `irA` recarga la página. Es el mismo destino que N-29 y está declarado como pendiente. Lo acepto así.
- **`!consulta.isFetching` sí abre un estado vecino nuevo, y el resumen no lo lista: M-07.**
  - El gancho solo marca un fallo como avisado (`ultimoFalloAvisado`, por consulta de la caché y compartido por todas las vistas de la tarea) cuando lo anuncia.
  - Cuando esta vista lo calla, porque la entrega reemplaza la vista o porque el usuario se va mientras la entrega se recarga, el fallo de la tarea queda sin marcar.
  - La siguiente vista de la misma tarea lo anuncia en cuanto se monta.
  - La fila "«Tu trabajo» y el detalle de la tarea… No aplica: no cambié el gancho ni su llamada en esas vistas" está refutada: esas vistas comparten la marca.

### Los 12 casos nuevos
- **Existen con los títulos exactos del resumen**, en `frontend/src/features/tareas/calificar-01c.test.tsx`: CAL-1C06b ×5 (`it.each` de 3 y 2 vecinos) y CAL-1C06c ×7 (`it.each` de 5 y 2 vecinos). Comparé con `npx vitest list`.
- **Prueban lo que dicen:**
  - **Un aviso exacto:** `aviso.error.mock.calls` igual a `[[mensaje]]`.
  - **Ningún campo inválido:** ningún `aria-invalid`.
  - **Lo escrito se conserva:** los valores siguen en el formulario.
  - **El botón sale de la espera:** sin `aria-busy` y con el foco.
  - **No hubo reinicio:** un solo `GET` de la entrega y uno de la tarea.
  - **Vista reemplazada:** el texto que la reemplaza y el foco en la raíz (`tabindex="-1"`).
- **Detectan el defecto.** Lo comprobé en una copia del paquete en el scratchpad (sin `git stash` y sin tocar el árbol):
  - Volví a poner `if (esErrorDeCampoDeCalificacion(error)) return` en lugar del bloque de T-02 y quité las dos guardas de `activo`.
  - Corrí `npx vitest run calificar-01c.test.tsx calificar-01c-r1.ataque.test.tsx` y salió `Tests  9 failed | 107 passed (116)`.
  - De los 12 nuevos fallan 5, los mismos que dice el resumen: los dos primeros de CAL-1C06b, los dos de `403` de CAL-1C06c y el vecino de fondo con `404`. Además fallan las 4 `*.ataque` de la ronda 1.
  - Con el código actual, la copia da `49 passed`.
  - Al terminar, `git diff --stat` y `git status --short` son idénticos a los de antes.

### Matriz (31 filas)
Hay 31 filas: A1–A14, B1–B6, C1–C5, D1–D3 y E1–E3, contadas en el resumen.
- **A7, A9, A14, C3 y C5:** coinciden con el código.
- **A6:** coincide en la vista, pero su columna "Con la vista desmontada" dice "—" y no es cierto: el aviso callado se anuncia en la siguiente vista de la tarea (M-07). Lo mismo vale para A7 y C5 cuando el usuario sale de la vista reemplazada.

### `DESIGN.md` §7.27
- **N-31:** corregida. El texto ahora dice lo que hace el código: la nota sale solo con `asignado` cerrado y sin calificar, y se conserva la marca "propuesta (CALIFICACIONES-01c)".
- **"Otros errores":** el pendiente del programador es correcto. Hoy dice "un error de un campo se marca bajo ese campo, sin aviso", y con T-02 un campo que el panel no tiene sí avisa. **Decisión:** se corrige ahora, en la vuelta de M-07, por el carril trivial (solo texto). Sirve un texto como "un error de un campo del panel se marca bajo ese campo, sin aviso; si el panel no tiene ese campo, un aviso con el mensaje del servidor". Es N-34.

### Hallazgos
#### M-07 — El aviso de la tarea que esta vista calla se anuncia después en la siguiente vista, de más o falso (estado vecino de T-03 que falta)
- **Dónde:** `frontend/src/features/tareas/entrega-de-alumno-view.tsx`, en el `activo` de `useAvisoDeRecargaFallida` (`!consulta.isFetching && !entregaReemplazaLaVista`). Interactúa con `ultimoFalloAvisado` de `useAvisoDeRecargaFallida` (`hooks.ts`), que se comparte con `entregas-view.tsx`, `detalle-tarea-view.tsx` y `editar-tarea-view.tsx`.
- **Qué pasa:** cuando la vista calla el fallo de la tarea, el fallo queda sin marcar, y la siguiente vista de esa tarea lo anuncia al montarse aunque ya no corresponda.
- **Evidencia:** lo reproduje con una prueba desechable en la copia del scratchpad (`mgr-vecino.test.tsx.txt`).
  - Montaje: la vista de la entrega, una recarga de fondo con la tarea en `500` y la entrega en `404`, y luego la lista de entregas con la misma `QueryClient`.
  - **Con la corrección:** en la entrega, 0 avisos (bien). En la lista, si la tarea sigue en `500`, salen **dos** avisos idénticos, "No pudimos actualizar la tarea. Mostramos la última versión que tenemos.": el viejo al montar y el nuevo de su recarga. Si la tarea ya responde `200`, sale **uno falso**: la lista muestra la versión nueva y el aviso dice que muestra la última que tenía.
  - **Antes de la corrección:** en la lista salía 1 aviso con `500` y 0 con `200`.
  - Es una regresión de la corrección y viola el "un solo aviso" de §D-14. La misma ruta existe si el usuario sale mientras la entrega se recarga (`!consulta.isFetching`).
  - El detalle y editar comparten la marca. No los reproduje, pero el mecanismo es el mismo.
- **Por qué devuelve el resumen:** regla 4 de la verificación (estados vecinos del mismo mecanismo: cambio de vista y vista desmontada). La fila "«Tu trabajo» y el detalle de la tarea… No aplica" da una razón que el código refuta.
- **Qué se espera:**
  - Un fallo de la tarea que esta vista decide no anunciar no se anuncia después en otra vista de la misma tarea. Esa otra vista anuncia solo los fallos de sus propias recargas.
  - Los cruces de T-03 y C5 siguen como están.
  - Una prueba con el cambio de vista (la lista de entregas, con la tarea en `500` y en `200` al volver) que falle con el código actual.
  - La lista de hermanos y vecinos cubre el detalle, editar y la lista, y la salida durante la recarga de la entrega.
  - A6, A7 y C5 de la matriz, corregidas en "Con la vista desmontada".
  - Si el remedio toca `useAvisoDeRecargaFallida`, las pruebas de TAREAS y ENTREGAS siguen en verde sin cambiar de resultado.

#### N-33 — Mensaje vacío en un campo que el panel sí pinta (no bloquea)
`erroresDeCalificacionDeApi` deja `""` como mensaje si el servidor manda `comentario:` sin texto. El panel pintaría un `ErrorDeCampo` vacío, mientras que `mensajeDelCampoDeCalificacion` sí cae al genérico. Es inalcanzable con zod, que siempre trae mensaje, así que no pido cambio. El `!esApiError(error) ||` de `mensajeDelCampoDeCalificacion` sobra, porque `esErrorDeCampoDeCalificacion` ya lo comprueba; es inocuo.

#### N-34 — `DESIGN.md` §7.27, "Otros errores" (no bloquea, se corrige en esta vuelta)
Ver la sección anterior. Es solo texto, por el carril trivial. Lo aplica el programador junto con M-07.

### Para la medición del programador
Si M-07 se hubiera encontrado en la ronda 2 del tester, habría contado como una ronda extra sobre el mismo mecanismo que T-03. La encontré en esta verificación, que no es ronda del tester. La dejo anotada para el orquestador por la regla del 2026-10-05 (2 o más rondas extra por hermanos o vecinos pasan al `programador` a `opus` en el carril sensible).

### Veredicto
**RESUMEN DEVUELTO.**
- T-02, N-31, las cifras, los 12 casos (con 5 que distinguen el defecto), las `*.ataque` y "No se toca" están bien.
- Vuelve por M-07: un estado vecino que la corrección de T-03 abrió y que el resumen declara "no aplica" con una razón que el código refuta.
- En la misma vuelta va N-34 (texto de §7.27).
- El tester no ataca la ronda 2 hasta que una nueva verificación acepte el resumen.

## Segunda verificación de la corrección de la ronda 1 — CALIFICACIONES-01c
Base: "## 01c — corrección de la verificación (M-07, N-34)" de `resumen-programador.md` (línea 729). `<K1b>` = `10e5a023dc1fc215112dbf7828ab4b32cfa036e1`. Solo corrí `frontend/` (el backend no cambió), una suite a la vez. No usé formateadores, `--write` ni `--fix`. No terminé ningún proceso, no abrí navegadores, no leí `.env` y no hice commit.

### Mis corridas (en `frontend/`)
| Comando | Código | Última línea (mía) | Del resumen |
|---|---|---|---|
| `npm run lint` | 0 | `> tsc -b`, después de `All matched files use Prettier code style!` | Igual |
| `npm run test` | 0 | `Test Files  174 passed (174)` · `Tests  2705 passed (2705)` · `Duration  113.14s`; `grep -c "Test timed out"` = 0 | Igual (114.55 s; la duración varía por carga) |
| `npm run build` | 0 | `✓ built in 759ms` | `✓ built in 734ms` (el tiempo varía por carga) |

### Cifras
| Cifra | Resumen | Mía | ¿Coincide? |
|---|---|---|---|
| Casos (`npx vitest list`, `grep -c " > "`) | 2705 | 2705 | Sí |
| Archivos (`cut -d'>' -f1 \| sort -u \| grep -c test`) | 174 | 174 | Sí |
| `calificar-01c.test.tsx` | 55 | 55 | Sí |
| `grep -c "CAL-1C06d"` | 6 | 6 | Sí |
| `Test timed out` | 0 | 0 | Sí |
| `*.ataque` (SHA-256 contra la tabla de "## Ronda 1 de 01c" de `reporte-tester.md`) | 187 iguales | 187 iguales (`diff` vacío, normalizando mayúsculas y el `*` de `sha256sum`) | Sí |
| `git diff --stat 10e5a02 -- frontend backend shared` | 9 archivos, `541 insertions(+), 10 deletions(-)` | Igual, los mismos 9 (nada en `backend/` ni en `shared/`) | Sí |
| No rastreados | Los mismos 11 | Los mismos 11 | Sí |

### Cotejo de M-07 (leí `useAvisoDeRecargaFallida` y `entrega-de-alumno-view.tsx`)
**El remedio coincide con lo que dice el resumen.**
- **Sin el sexto parámetro no cambia nada.** `callado = false` hace que la limpieza nueva salga en su primera línea (`if (!alSalir.current.callado) return`). El efecto que avisa no cambió. `git diff 10e5a02 -- frontend/src/features/tareas/hooks.ts` trae solo lo de 01c (`useCalificarEntrega` y sus imports) y lo de M-07 (el parámetro, `alSalirRef`, los dos efectos y el comentario). Detalle, editar y entregas no pasan el parámetro. Los dos ganchos homónimos de `features/clases` son otro gancho. La suite completa sale en verde con solo +6 casos, y ningún archivo de prueba de TAREAS ni de ENTREGAS cambió.
- **La marca se escribe en la limpieza, no en cada render.** El efecto sin dependencias solo actualiza la ref. El `WeakMap` se escribe únicamente en la limpieza del efecto `[queryClient, claseId, tareaId]`, es decir, al desmontar o al cambiar de tarea. React corre todas las limpiezas de un commit antes que los efectos nuevos, y el efecto de la ref no tiene limpieza. Por eso, al cambiar de ids, la limpieza usa los ids de su cierre y la marca del último render de la tarea anterior.
- **No hay carrera con un fallo nuevo.** La marca escrita es la del último render, y un fallo posterior trae otro `errorUpdateCount`, así que se avisa. Lo comprobé: después de salir, la lista (con la tarea en 200) avisa 1 con el primer fallo nuevo y 2 con el segundo.
- **`callado`** es `falloDeLaTarea && (consulta.isFetching || entregaReemplazaLaVista)`. `activo` es el complemento sobre el mismo `falloDeLaTarea`, el mismo de la ronda 1. Los dos nunca son verdaderos a la vez.

**Prueba desechable repetida sobre el código corregido.** Hice una copia nueva de `frontend/` y `shared/` en el scratchpad (`v2/copia`, con uniones a los `node_modules`; sin `git stash`), con un archivo `mgr-v2.test.tsx` que extiende el actual:
| Caso | Resultado con la corrección | Con el `activo` de la ronda 1 sin `callado` |
|---|---|---|
| Repro original (fondo: tarea 500 + entrega 404, después la lista), tarea 500 al volver | 1 aviso en total | 2 |
| Igual, tarea 200 al volver | 0 | 1 falso |
| **El detalle** como siguiente vista, tarea 500 / 200 | 1 / 0 | 2 / 1. Confirma que el detalle compartía la marca y que la corrección lo cubre |
| Quedarse en la pantalla reemplazada mientras la tarea falla dos veces más, y después la lista con 500 | 0 en la vista; 1 en la lista (solo la suya) | Falla |
| Fallo nuevo después de salir (lista con 200; dos fallos nuevos) | 1 y 2 | Falla |
| StrictMode: entrega reemplazada que vuelve bien, y después la lista con 500 | 1 en la vista y 2 en total | Igual |

- **La pregunta del orquestador (vista reemplazada y el usuario se queda en la pantalla de error):** la vista de la entrega sigue montada y sigue callando, también con los fallos nuevos. Al salir se desmonta y la limpieza consume la última marca.
- **Un único caso no desmonta:** pasar de la entrega de un alumno a la de otro de la misma tarea, porque la ruta no tiene `key` y `tareaId` no cambia. Ahí, si la entrega nueva responde bien, la vista avisa una vez, y es cierto. No se pierde ni se duplica nada.
- **StrictMode:** solo existe en `main.tsx`, y su doble efecto ocurre solo en desarrollo; producción no lo ejecuta. Ninguna prueba envuelve la vista de la entrega en StrictMode, salvo mi caso desechable, que da lo esperado. Forcé el riesgo residual (un fallo sin marcar en caché al montar, con la entrega en vuelo) y salió 1 aviso con y sin StrictMode: en pruebas, `staleTime` es 0 y la recarga al montar trae una marca nueva. Ninguna vista deja un fallo sin marcar (las únicas lecturas de `claveTarea` son `useTarea` en las cuatro vistas; no hay `fetchQuery` de la tarea). Lo acepto como riesgo residual de desarrollo.
- Al terminar, `git status --short` y `git diff --stat` son idénticos a los de antes. Quité las uniones con `rmdir`, que no toca el destino.

### Los 16 estados vecinos, contra el código
Los 16 coinciden. Detalle de los que pidió el orquestador:
- **Detalle y editar:** el resumen corrige su "No aplica" de la ronda 1. El detalle lo comprobé arriba. Editar llama al mismo gancho con la misma consulta y sin `callado`, así que el mecanismo es idéntico.
- **"Tu trabajo" y el detalle del alumno:** sí no aplican. `tu-trabajo.tsx` no llama al gancho (líneas 19-20). La ruta `tareas/:tareaId/entregas/:alumnoId` solo existe en los bloques de maestro y de admin de `router.tsx`. Sin `EntregaDeAlumnoView`, la caché del alumno no tiene quién calle un fallo.
- **Cambio de ids, dos fallos seguidos con la vista reemplazada, `ENTREGA_MODIFICADA` y la tarea en 404 en la vista siguiente:** coinciden con el código (ver arriba).
- **Dos fallos seguidos con la entrega bien:** PR-1D04 sigue en verde, sin cambios.

### Los 6 casos de CAL-1C06d
- **Existen con los títulos exactos del resumen** en `frontend/src/features/tareas/calificar-01c.test.tsx`, en el `describe` "el fallo de la tarea callado por la entrega no se repite en la siguiente vista (CAL-1C06d)". Hay dos `it.each` de 2 casos y dos `it`. Los títulos coinciden con `npx vitest list`.
- **Prueban lo que dicen:**
  - El total de avisos de las dos vistas es exactamente `[[aviso]]` o `[]`.
  - La salida durante la recarga usa una entrega diferida que se resuelve después de `cleanup()`.
  - Remontar da ningún aviso, con la vista reemplazada.
  - La entrega que vuelve bien da un solo aviso de la tarea, y el panel visible.
- **4 fallan con el código anterior.** Lo comprobé en mi copia: quité el sexto argumento de la llamada, lo que equivale al `activo` de la ronda 1, porque sin `callado` la limpieza no hace nada. Con `-t "CAL-1C06d"` fallan los cuatro de la lista (500 y 200, de fondo y saliendo durante la recarga) y pasan los dos vecinos que fijan estados que ya funcionaban. Es lo mismo que dice el resumen.

### Matriz (31 filas) y `DESIGN.md`
- La matriz sigue con 31 filas. Cambian 4 filas y no hay filas nuevas.
- **A7, C3 y C5** ("Con la vista desmontada") coinciden con el código.
- **A6** coincide salvo por una precisión (N-35).
- **N-34:** corregida. §7.27, "Otros errores", dice ahora "un error de un campo que el panel tiene se marca bajo ese campo, sin aviso; si el panel no tiene ese campo, un solo aviso con el mensaje del servidor, sin marcar ningún campo; …". Es lo que hace `useCalificarEntrega` desde T-02. Se conserva la marca "propuesta (CALIFICACIONES-01c)".

### Observaciones (no bloquean)
#### N-35 — A6: "la siguiente vista avisa uno si la tarea sigue fallando" supone que esa vista vuelve a pedir la tarea
- **Dónde no se cumple:** en A6, la tarea se pide con `tarea.refetch()` tras el `409`, sin invalidarla. En producción (`staleTime: 30_000` en `app/providers.tsx`), si el maestro sale durante la recarga de la entrega y la tarea se leyó bien hace menos de 30 s, la siguiente vista no vuelve a pedirla. En ese caso no avisa y muestra la copia en caché. Ese fallo no se anuncia en ninguna vista.
- **Por qué lo acepto:** es justo lo que pidió M-07 ("anuncia solo los fallos de sus propias recargas"). La copia tiene menos de 30 s, así que por definición está fresca. El `409` ya avisó que la rúbrica o la entrega cambiaron. Si el maestro vuelve a calificar con la copia vieja, el servidor responde otro `409`.
- **Qué se espera:** en las pruebas `staleTime` es 0, así que este camino no tiene caso. Al cerrar, el texto de A6 dirá "si la siguiente vista vuelve a pedir la tarea". No pido cambios de código.
- **Para el tester:** es una decisión arbitrada, no un hallazgo nuevo.

### Veredicto
**RESUMEN ACEPTADO.**
- M-07 está corregida. El fallo que la vista de la entrega calla ya no se repite en la lista ni en el detalle, y un fallo nuevo después de salir se avisa una vez. Los 16 vecinos coinciden con el código. Los 4 casos que distinguen el defecto fallan con el código anterior.
- TAREAS y ENTREGAS siguen en verde sin cambiar de resultado.
- N-34 está corregida.
- Las cifras, las 187 `*.ataque` y "No se toca" coinciden.
- N-35 queda como precisión de texto para el cierre.
- El tester puede hacer la ronda 2 de 01c.

## Verificación de la corrección de la ronda 2 — CALIFICACIONES-01c
Base: "## 01c — corrección de la ronda 2 (T-04)" de `resumen-programador.md` (línea 803). `<K1b>` = `10e5a023dc1fc215112dbf7828ab4b32cfa036e1`. Solo corrí `frontend/` (el backend no cambió), una suite a la vez. No usé formateadores, `--write` ni `--fix`. No terminé ningún proceso, no abrí navegadores, no leí `.env` y no hice commit. `git status --short` y `git diff --stat` quedaron idénticos antes y después de mi trabajo.

### Mis corridas (en `frontend/`)
| Comando | Código | Última línea (mía) | Del resumen |
|---|---|---|---|
| `npm run lint` | 0 | `> tsc -b`, después de `All matched files use Prettier code style!` | Igual |
| `npm run test` | 0 | `Test Files  177 passed (177)` · `Tests  2789 passed (2789)` · `Duration  114.05s`; `grep -c "Test timed out"` = 0 | Igual (117.14 s; la duración varía por carga) |
| `npm run build` | 0 | `✓ built in 749ms` | `✓ built in 768ms` (el tiempo varía por carga) |

### Cifras
| Cifra | Resumen | Mía | ¿Coincide? |
|---|---|---|---|
| Casos (`npx vitest list`, `grep -c " > "`) | 2789 | 2789 | Sí |
| Archivos (`cut -d'>' -f1 \| sort -u \| grep -c test`) | 177 | 177 | Sí |
| `calificar-01c.test.tsx` | 62 | 62 | Sí |
| `grep -c "CAL-1C06e"` | 7 | 7 | Sí |
| `grep -c "CAL-T-11[34]"` | 11, en verde | 11, en verde (la suite completa pasa); los 6 rojos de T-04 de la ronda 2 están en verde sin cambiar el archivo | Sí |
| `Test timed out` | 0 | 0 | Sí |
| `*.ataque` (SHA-256 contra la tabla de "## Ronda 2 de 01c" de `reporte-tester.md`) | `campos-01c-r2.ataque.test.tsx` sin cambios | 190 de 190 iguales, ningún archivo de más ni de menos (normalizando mayúsculas y el `*` de `sha256sum`) | Sí |
| `git diff --stat 10e5a02 -- frontend backend shared` | 9 archivos, `559 insertions(+), 11 deletions(-)` | Igual, los mismos 9; `lib/errores-de-api.ts`, `shared/` y `backend/` sin cambios contra `<K1b>` | Sí |
| No rastreados | Los mismos 14 | Los mismos 14 | Sí |

### Cotejo del diff (T-04)
Comparé las copias de antes de la corrección que el programador dejó en el scratchpad (`t04/lib.ts` y `t04/hooks.ts`) con el árbol actual. Las copias `*.nuevo.ts` son idénticas byte a byte al árbol actual (`cmp`).
- **`lib.ts`:** se agregan un bloque de 14 líneas, `PREFIJO_DE_RUTA` (`/^[A-Za-z0-9_.-]+:\s*/`) y `mensajeDelAvisoDeCalificar`, con su comentario del porqué. Nada más cambia.
- **`hooks.ts`:** son 4 cambios: el import, el quinto parámetro `mensajeDe = mensajeDeErrorTareas`, `toast.error(mensajeDe(error))` y la última llamada de `useCalificarEntrega.onError`. Las otras **cuatro** llamadas de `avisarDelErrorDeLaEntrega` no pasan el parámetro, así que se comportan igual que antes: descarga en la línea 281, entregar en 432, anular en 452 y comentar en 493. El resumen dice "las otras cinco" (ver N-37). La deduplicación por tarea perdida (`tareaPerdidaAvisada`) no cambia.
- **Nunca dos avisos:** los caminos de `onError` son excluyentes y cada uno termina en `return` o en la única llamada final. Ningún camino avisa dos veces.
- **Genérico cuando queda vacío:** `sinRuta === ""` da `MENSAJES_ERROR_TAREAS.generico`. Lo cubre el caso vecino.
- **Solo toca `VALIDACION`:** para cualquier otro código, la función devuelve el mensaje de `mensajeDeErrorTareas` sin cambios. Lo comprobé con un caso desechable: un `ENTREGA_MODIFICADA` con el mensaje "x: y" se queda como "x: y". Los textos fijos de `claseId:`, `tareaId:` y `alumnoId:` también se conservan, porque ninguno empieza con un token seguido de dos puntos ("Esa tarea ya no existe.", por ejemplo).
- **La pregunta del orquestador ("Nota: …"):** sí hay un doble recorte, aunque hoy no se alcanza (N-36).
  - El servidor siempre forma exactamente un prefijo, `"<ruta>: <mensaje>"` (`backend/src/handlers/validacion.ts:16-18`).
  - Cuando la ruta es simple (`version:`, `puntajes:`), `quitarPrefijoDeCampo` ya la quitó dentro de `mensajeDeErrorTareas`, y después `PREFIJO_DE_RUTA` se aplica otra vez sobre el mensaje.
  - Caso desechable: `"version: Nota: algo"` da "algo", mientras que `"puntajes.0: Nota: algo"` da "Nota: algo".
  - **No llega del servidor hoy:** ningún mensaje de `calificarEntregaSchema` empieza con una palabra seguida de dos puntos ("Falta la versión de la entrega", "Debe ser un identificador válido", "No repitas un criterio"…). Los mensajes por defecto de zod tampoco: "Invalid input: …" o "Unrecognized key: …" llevan un espacio antes de los dos puntos, y `PREFIJO_DE_RUTA` no admite espacios. Con `'puntajes.0: Unrecognized key: "x"'`, el aviso queda en `Unrecognized key: "x"`, que es la misma clase de texto de zod en inglés que ya existía y no es nueva.
  - Por eso no bloquea.

### Los 7 casos de CAL-1C06e
- **Existen con los títulos exactos del resumen** en `frontend/src/features/tareas/calificar-01c.test.tsx`, en el `describe` "el aviso de un 400 sin lugar en el panel no lleva el prefijo de ruta (CAL-1C06e)". Hay un `it.each` de 6 casos y un `it`. Los títulos coinciden con `npx vitest list`.
- **Qué prueban:**
  - `aviso.error.mock.calls` es exactamente `[["Revisa este valor."]]`, es decir, un solo aviso con el texto limpio.
  - Ninguna caja de texto tiene `aria-invalid="true"`.
  - Las dos notas escritas se conservan ("4" y "3").
  - El botón sale de la espera.
  - El caso vecino espera exactamente el genérico.
- **6 fallan con el código anterior. Lo comprobé yo, en una copia** (`v3c/copia` en el scratchpad, con uniones a los `node_modules`; sin `git stash`):
  - Con el código actual: `npx vitest run src/features/tareas/calificar-01c.test.tsx -t "CAL-1C06e"` da `Tests  7 passed | 55 skipped (62)`.
  - Con `t04/lib.ts` y `t04/hooks.ts`: da `Tests  6 failed | 1 passed | 55 skipped (62)`. Fallan los cinco prefijos con el aviso literal (por ejemplo, `"puntajes.0.criterioId: Revisa este valor."`) y el vecino con `"puntajes.0.criterioId:"`. Pasa el control sin prefijo.
  - Quité las uniones con `rmdir`, que no toca el destino, y borré la copia.

### Fila A14 de la matriz, contra el código
**Coincide.**
- **Qué se renueva:** nada. `onError` no reinicia el formulario, y CAL-1C06e lo comprueba con los valores conservados.
- **Aviso:** uno, del gancho, sin prefijo de ruta, o el genérico si no queda mensaje.
- **Foco en el botón, que sale de la espera:** el mecanismo no cambió. CAL-1C06e comprueba que `aria-busy` desaparece, y CAL-T-112 sigue en verde.
- **Doble clic = un `PUT`:** la guarda con la ref no cambió.
- **Con la vista desmontada:** el aviso sale igual, porque `onError` está en las opciones de `useMutation`, no en las de `mutate`.
- La matriz sigue con 31 filas.

### Hermanos pendientes (mecanismo anterior a 01c): arbitraje
**Confirmé con un caso desechable que hoy un prefijo con puntos sí llega a la persona** (con el código actual, en la misma copia):
- **Crear y editar tarea:** `erroresDeLaTareaDeApi(VALIDACION "archivoIds.0: Un archivo adjunto no es válido")` da `null`, y `mensajeDeErrorTareas` devuelve `"archivoIds.0: Un archivo adjunto no es válido"` sin cambios. Es el texto del toast de `useCrearTarea.onError` y de `useEditarTarea.onError` (`hooks.ts:166` y `:189`). Pasa lo mismo con `"rubrica.2: Invalid input"`.
- **Entregar:** es el mismo `mensajeDeErrorTareas`, por `avisarDelErrorDeLaEntrega` (`hooks.ts:432`), con `archivoIds.<i>` de `entregarSchema`.
- **Temas y categorías:** `mensajeDeErrorClases` (`features/clases/lib.ts:155`) devuelve `"orden.3: Debe ser un identificador válido"` y `"categorias.0.peso: El peso debe ser entero"` sin cambios.

**Decisión: pendiente con destino al `chore` posterior a CALIFICACIONES-01 (el mismo de S-15 y N-22). No se corrige ahora.** Razones:
1. El mecanismo es de TAREAS-01, ENTREGAS-01d y CLASES-02, no de 01c. §D-12 cubre solo el aviso de calificar, que ya quedó corregido.
2. El remedio natural es uno solo: `PREFIJO_DE_CAMPO` en `lib/errores-de-api.ts:21`, que está en "No se toca". Además alcanza a `features/clases`, que está fuera del plan. Corregirlo dentro de cada módulo duplicaría `PREFIJO_DE_RUTA` en tres sitios.
3. Ninguno se alcanza con el cliente de hoy: el cliente manda ids que vienen del almacén y filas de rúbrica con forma de objeto. Igual que T-04, solo aparecen si el contrato se desvía. Severidad baja.
4. Esta es la última ronda del tope. Abrir `lib/` ahora pediría autorización del humano y otra ronda por un defecto que no se alcanza.

No lo escalo como decisión urgente. Si el humano prefiere corregirlo ya, va en "Para el humano" (abajo).

**Texto literal para `docs/ESTADO.md` §3** (una fila nueva):

| T-04 de CALIFICACIONES-01c, hermanos fuera de §D-12: el aviso de un `400 VALIDACION` cuyo prefijo es una ruta con puntos o índices llega a la persona con el nombre técnico, porque `quitarPrefijoDeCampo` (`frontend/src/lib/errores-de-api.ts:21`, `/^([a-zA-Z_]+):\s*/`) no los admite. Ejemplos: crear y editar tarea (`useCrearTarea` y `useEditarTarea`, `features/tareas/hooks.ts`) muestran "archivoIds.0: Un archivo adjunto no es válido" o "rubrica.2: …"; entregar (`useEntregar`) muestra "archivoIds.0: …"; temas y categorías (`mensajeDeErrorClases`, `features/clases/lib.ts:155`) muestran "orden.3: …" o "categorias.0.peso: …". No se alcanza con el cliente actual (solo si el contrato se desvía). Remedio: que `quitarPrefijoDeCampo` quite una ruta completa (`^[A-Za-z0-9_.-]+:\s*`), una sola vez y sobre el mensaje crudo, sin cambiar `campoDeErrorDeApi`; con eso, `mensajeDelAvisoDeCalificar` (`features/tareas/lib.ts`) se puede simplificar y se resuelve N-36 | El `chore` posterior a CALIFICACIONES-01 (el mismo de S-15 y N-22) | `revision.md` de CALIFICACIONES-01, "Verificación de la corrección de la ronda 2 — CALIFICACIONES-01c"; `reporte-tester.md`, "Ronda 2 de 01c", T-04 |

**Para la ronda 3 del tester:** estos hermanos son una decisión ya tomada y no cuentan como hallazgo: crear y editar tarea (`archivoIds.<i>`, `rubrica.<i>`), entregar (`archivoIds.<i>`), y temas y categorías (`orden.<i>`, `categorias.<i>.*`). N-36 (el doble recorte) tampoco cuenta como hallazgo mientras ningún mensaje del servidor empiece con un token sin espacios seguido de dos puntos.

### Observaciones (no bloquean)
#### N-36 — `mensajeDelAvisoDeCalificar` puede recortar dos prefijos cuando la ruta es simple
- **Dónde:** `frontend/src/features/tareas/lib.ts`, `mensajeDelAvisoDeCalificar`, que aplica `PREFIJO_DE_RUTA` sobre la salida de `mensajeDeErrorTareas`, la cual ya pasó por `quitarPrefijoDeCampo`.
- **Efecto:** con `"version: Nota: algo"`, el aviso dice "algo".
- **Por qué no bloquea:** ningún mensaje del servidor para calificar (de `shared/` ni por defecto de zod) tiene esa forma. Ver el cotejo.
- **Qué se espera:** se resuelve en el `chore` del texto de §3 (quitar la ruta una sola vez, sobre el mensaje crudo). No pido cambios ahora.

#### N-37 — El resumen dice "las otras cinco llamadas"; son cuatro
- **Dónde:** "Diff resumido" del resumen. `avisarDelErrorDeLaEntrega` tiene cinco llamadas en total, cuatro sin el parámetro y una con él.
- **Por qué no bloquea:** no es una cifra de archivos, pruebas o casos. Lo que afirma de fondo (que ninguna otra llamada cambia) es correcto.
- **Qué se espera:** corregirla si el resumen se reescribe. No devuelvo el resumen por esto.

### Veredicto
**RESUMEN ACEPTADO.**
- T-04 está corregida dentro de §D-12 con un diff mínimo. Los 6 rojos de CAL-T-113 y CAL-T-114 pasan sin cambiar el archivo.
- 6 de los 7 casos nuevos distinguen el defecto (lo comprobé en una copia).
- Las cifras, las 190 `*.ataque` y "No se toca" coinciden.
- A14 coincide con el código.
- Los hermanos fuera de §D-12 quedan arbitrados como pendiente con destino al `chore` posterior.
- No hay `M-nn`. N-36 y N-37 no bloquean.
- El tester puede hacer la ronda 3 de 01c, la última del tope.

### Para el humano
- **Opcional:** si prefieres no dejar pendientes los hermanos de T-04, la corrección exige autorizar un cambio en `frontend/src/lib/errores-de-api.ts` (está en "No se toca") y en el aviso de `features/clases`, con pruebas propias. Mi recomendación es dejarlo para el `chore` posterior, como dice el texto para §3.

## Verificación de la corrección de la ronda 3 — CALIFICACIONES-01c
Base: "## 01c — corrección de la ronda 3 (T-05, ronda 4 cerrada)" de `resumen-programador.md` (línea 873). Decisión del humano: `aprobacion.md`, "Decisión del humano tras la escalada de 01c (2026-10-13)". `<K1b>` = `10e5a023dc1fc215112dbf7828ab4b32cfa036e1`. Solo corrí `frontend/` (el backend no cambió), una suite a la vez. No usé formateadores, `--write` ni `--fix`. No terminé procesos, no abrí navegadores, no leí `.env`, no hice commit y no leí ni toqué `plan.md` (el arquitecto escribe la Enmienda 2). `git status --short` y `git diff --stat` quedaron idénticos antes y después; `lib.ts` volvió a su SHA-256 `6e4c92e2…4f64a7d17` tras el cotejo.

### Mis corridas (en `frontend/`)
| Comando | Código | Última línea (mía) | Del resumen |
|---|---|---|---|
| `npm run lint` | 0 | `> tsc -b`, después de `All matched files use Prettier code style!` | Igual |
| `npm run test` (02:13:21Z a 02:15:26Z) | 0 | `Test Files  179 passed (179)` · `Tests  2902 passed (2902)` · `Duration  122.11s`; `grep -c "Test timed out"` = 0 | Igual (122.65 s; la duración varía) |
| `npm run build` | 0 | `✓ built in 744ms` | `✓ built in 800ms` (el tiempo varía) |

### Cifras
| Cifra | Resumen | Mía | ¿Coincide? |
|---|---|---|---|
| Casos (`npx vitest list`, `grep -c " > "`) | 2902 | 2902 | Sí |
| Archivos (`cut -d'>' -f1 \| sort -u \| grep -c test`) | 179 | 179 | Sí |
| `calificar-01c.test.tsx` | 70 | 70 | Sí |
| `grep -c "CAL-1C06f"` | 8 | 8 | Sí |
| `grep -c "CAL-T-135"` | 3, en verde | 3, en verde en la suite completa; `aviso-calificar-01c-r3.ataque.test.tsx` sin cambios (`2ef258e9…eaf711bf`) | Sí |
| `Test timed out` | 0 | 0 | Sí |
| `*.ataque` (SHA-256 contra "Tabla de SHA-256 de las 192 `*.ataque` al cierre de la ronda 3 de 01c" de `reporte-tester.md`) | 192 iguales | 192 de 192 iguales, ningún archivo de más ni de menos (`diff` vacío, normalizando mayúsculas y el `*` de `sha256sum`) | Sí |
| `git diff --stat <K1b> -- frontend backend shared` | 9 archivos, `562 insertions(+), 11 deletions(-)` | Igual, los mismos 9; `lib/errores-de-api.ts`, `backend/` y `shared/` sin cambios contra `<K1b>` | Sí |
| No rastreados en `frontend/` | 16 | 16 (25 líneas de `git status --short frontend` = 9 + 16) | Sí |
| `AGENTS.md` y `.claude/agents/arquitecto.md` contra los hashes de `aprobacion.md` | — | `1932ec64…834efe` y `ee07ae58…2d8d`: coinciden | Sí |

### Cotejo del diff (T-05)
- **Mínimo:** contra la versión anterior, `erroresDeCalificacionDeApi` (`features/tareas/lib.ts:665-682`) cambia solo en dos líneas de código (`recortado` y `mensaje = recortado === "" ? MENSAJES_ERROR_TAREAS.generico : recortado`) y un comentario de dos líneas con el porqué. Nada más en `lib.ts`; ningún otro archivo de producción cambia.
- **El genérico solo cuando no queda mensaje:** la comparación es `=== ""` sobre lo que deja el prefijo, que con `:\s*` ya consume espacios, tabuladores y saltos de línea. Con un mensaje no vacío el resultado es el de antes. Es la misma comparación de `mensajeDelCampoDeCalificacion` y `mensajeDelAvisoDeCalificar`.
- **Campo marcado, con foco y sin aviso; nunca dos avisos:** la función da `null` en los mismos casos que antes (el cambio toca el valor, no cuándo hay valor). Así, el panel (`panel-de-calificacion.tsx:112-115`) pinta y enfoca igual, y `useCalificarEntrega.onError` (`hooks.ts:565`) calla igual. Los caminos de `onError` siguen siendo excluyentes.
- **Los 8 casos existen con los títulos exactos** del resumen en el `describe` "un 400 pintable sin mensaje marca el campo con el genérico, nunca vacío (CAL-1C06f)" (coinciden con `npx vitest list`). Comprueban el foco, `aria-invalid="true"`, la descripción accesible con el genérico (con `stringContaining` en los del comentario, por su ayuda), ningún `aviso.error`, lo escrito conservado y el botón sin `aria-busy`. El vecino exige `aviso.error.mock.calls` igual a `[[genérico]]` y ninguna caja marcada. `GENERICO` del test coincide con `MENSAJES_ERROR_TAREAS.generico` (`data.ts:140`).
- **7 fallan con el código anterior. Lo comprobé yo, sin `git stash`:** guardé `lib.ts` en el scratchpad (`v-r3c/lib.nuevo.ts`), derivé `v-r3c/lib.antes.ts` revirtiendo las dos líneas (el `diff` entre ambas solo muestra esas líneas), lo puse en su lugar, corrí y lo restauré:
  - `npx vitest run src/features/tareas/calificar-01c.test.tsx -t "CAL-1C06f"` → `Tests  7 failed | 1 passed | 62 skipped (70)`. Fallan los 5 del `it.each` pintable y los 2 hermanos `calificacion:`; pasa el vecino de control.
  - `npx vitest run src/features/tareas/aviso-calificar-01c-r3.ataque.test.tsx -t "CAL-T-135"` → `Tests  3 failed | 86 skipped (89)`.
  - Restaurado: SHA-256 de `lib.ts` igual al de antes; `git diff --stat` igual al final. La suite completa en verde la corrí antes del cotejo, con el código nuevo.

### Fila A9 de la matriz, contra el código
**Coincide.** Nada se renueva (el panel solo hace `setErrores(deCampo)` y `enfocarPrimerError`); sin aviso (el gancho calla porque la función no da `null`); el `ErrorDeCampo` lleva el mensaje sin prefijo o, si no queda nada, el genérico; foco en el primer campo con error; con la vista desmontada no sale aviso, igual que con un mensaje no vacío. Dos intentos seguidos reemplazan las marcas con el mismo genérico. La matriz sigue con 31 filas.

### Hermanos y estados vecinos
**Del mecanismo de 01c (el texto de un `400` de calificar que llega a la interfaz), contra el código:**
- `puntajes.<i>.puntos:` vacío o con blancos, `comentario:` con y sin comentario escrito, y `calificacion:` sin rúbrica (el hermano del tester) pasan por la misma línea de `erroresDeCalificacionDeApi`. **Aplicado y cubierto** (CAL-T-135 y CAL-1C06f). Correcto.
- `calificacion:` con rúbrica y `puntajes.<i>.puntos:` con `i` fuera del envío dan `null` y van por `mensajeDelCampoDeCalificacion`, que ya daba el genérico. **Sin cambio, correcto.**
- Otros prefijos (`version:`, `cuerpo:`, rutas con puntos) van por `mensajeDelAvisoDeCalificar`, que ya da el genérico (T-04). **Sin cambio, correcto.**
- Espacios Unicode que `\s` reconoce (NBSP, BOM, U+2028): el prefijo se los lleva. Correcto.
- **Caracteres de ancho cero** (`U+200B`, `U+200C`, `U+200D`, `U+2060`, que `\s` no reconoce) dejarían un texto invisible en los tres caminos. **Lo juzgo inalcanzable y se queda:** el servidor arma `"<ruta>: <mensaje>"` (`backend/src/handlers/validacion.ts`) con textos fijos de `core/` o con mensajes de zod definidos en `shared/`, y ningún mensaje de `shared/src` ni de `backend/src/core` es vacío ni de solo caracteres invisibles (lo busqué). Arreglarlo exige cambiar la comparación en los tres caminos, y eso no cabe en una ronda cerrada. Va en la fila de §3.
- Dos prefijos pintables en un mismo texto: `validarCuerpo` manda solo la primera incidencia, y si llegara como texto, el resto se pinta y no queda vacío. No aplica.

**Fuera del mecanismo de 01c, por lectura del código actual: en ninguno llega hoy un mensaje vacío a la persona.**
- `errorDelCampoDeApi` (`lib.ts:379-384`), que usan `errorDeEnlacesDeApi` y `errorDeTextoDeApi` (ENTREGAS-01d), hace `slice` sin genérico: es el mismo patrón exacto que T-05. Con `"enlaces.0:"` o `"texto:"` sin mensaje, el `ErrorDeCampo` de entregar o del hilo privado quedaría vacío.
- `mensajeDeErrorTareas` (`lib.ts:144-157`), en `VALIDACION`, pasa por `quitarPrefijoDeCampo`. Con `"x:"` sin mensaje quedaría vacío el aviso de crear, editar o borrar tarea, de entregar, anular, comentar o descargar, y también el `MensajeError` de la entrega del alumno. Los prefijos `claseId:`, `tareaId:` y `alumnoId:` tienen texto fijo y no se afectan.
- `erroresDeFormularioDeApi` con `mensajeDeErrorTareas` (formulario de tarea, `erroresDeLaTareaDeApi`, `lib.ts:163-172`): con `"titulo:"` sin mensaje, el `ErrorDeCampo` quedaría vacío.
- **Ninguno se alcanza hoy.** El único productor de `VALIDACION` es el servidor, que siempre escribe `"<ruta>: <mensaje>"` con un mensaje no vacío. Los mensajes de `core/` son literales (`calificar.ts:135` y `:145`, `categorias.ts:32-54`, `adapters/db/errores.ts:54`) y los de zod tienen texto (en `shared/src` no hay ningún mensaje vacío). Además, `apiClient` descarta un error sin `mensaje` (`errorApiSchema`, `min(1)`). Coincide con lo que dice el resumen.
- Lo de `CODIGOS_CON_MENSAJE_DEL_SERVIDOR` con un mensaje de un solo espacio es N-38 (abajo).

**Texto literal para `docs/ESTADO.md` §3.** La fila de los prefijos con puntos que propuse en la verificación anterior aún no está en §3, así que la unifico con esta. Esta fila sustituye a aquella; queda una sola:

| T-04 y T-05 de CALIFICACIONES-01c, hermanos fuera de §D-12, en el texto de un `400 VALIDACION` que llega a la persona. (1) **Prefijo con puntos o índices:** `quitarPrefijoDeCampo` (`frontend/src/lib/errores-de-api.ts:21`, `/^([a-zA-Z_]+):\s*/`) no los quita y el aviso muestra el nombre técnico: crear y editar tarea (`useCrearTarea` y `useEditarTarea`, `features/tareas/hooks.ts`) con "archivoIds.0: Un archivo adjunto no es válido" o "rubrica.2: …"; entregar (`useEntregar`) con "archivoIds.0: …"; temas y categorías (`mensajeDeErrorClases`, `features/clases/lib.ts:155`) con "orden.3: …" o "categorias.0.peso: …". (2) **Prefijo sin mensaje:** `errorDelCampoDeApi` (`features/tareas/lib.ts`, por `errorDeEnlacesDeApi` y `errorDeTextoDeApi`, ENTREGAS-01d) deja un `ErrorDeCampo` vacío en entregar y en el hilo privado con `"enlaces.0:"` o `"texto:"`; `mensajeDeErrorTareas` (TAREAS-01) deja vacío el aviso de crear, editar, borrar, entregar, anular, comentar y descargar, y el `MensajeError` de la entrega del alumno, con `"x:"`; `erroresDeFormularioDeApi` del formulario de tarea deja un `ErrorDeCampo` vacío con `"titulo:"`. (3) **Caracteres de ancho cero** (`U+200B`, `U+200C`, `U+200D`, `U+2060`) tras el prefijo dejan un texto invisible en los tres caminos de calificar (`erroresDeCalificacionDeApi`, `mensajeDelCampoDeCalificacion`, `mensajeDelAvisoDeCalificar`), que comparan con `""`. (4) Un mensaje de solo espacios en los códigos de `CODIGOS_CON_MENSAJE_DEL_SERVIDOR` se muestra tal cual. Nada de esto se alcanza con el servidor y el cliente actuales: el servidor siempre manda un prefijo simple o una ruta seguida de un mensaje con texto. Remedio: que `quitarPrefijoDeCampo` quite una ruta completa (`^[A-Za-z0-9_.-]+:\s*`), una sola vez y sobre el mensaje crudo, sin cambiar `campoDeErrorDeApi`; y que todo texto del servidor que quede vacío o sin caracteres visibles dé el genérico del módulo, con un solo ayudante de `lib/errores-de-api.ts` que usen todos los caminos. Con eso se simplifica `mensajeDelAvisoDeCalificar` y se resuelve N-36 | El `chore` posterior a CALIFICACIONES-01 (el mismo de S-15 y N-22) | `revision.md` de CALIFICACIONES-01, "Verificación de la corrección de la ronda 2 — CALIFICACIONES-01c" y "Verificación de la corrección de la ronda 3 — CALIFICACIONES-01c"; `reporte-tester.md`, "Ronda 2 de 01c" (T-04) y "Ronda 3 de 01c" (T-05, O-r3c-1) |

### Alcance de la ronda 4 cerrada del tester
Según la decisión del humano ("ronda 4 cerrada a T-05 y su hermano"):
- **Sí comprueba:**
  1. V-01 contra la tabla de las 192 `*.ataque` de la ronda 3 de 01c, antes de escribir nada.
  2. Que los 3 rojos de CAL-T-135 pasen sin cambiar `aviso-calificar-01c-r3.ataque.test.tsx`.
  3. Una pasada mínima sobre el mecanismo de mensajes vacíos de calificar:
     - el hermano `calificacion:` sin rúbrica, vacío y con blancos;
     - `comentario:` con lo escrito conservado;
     - blancos Unicode que `\s` reconoce;
     - dos intentos seguidos con el mismo `400` vacío;
     - que ningún camino de `onError` dé dos avisos, ni ninguno cuando el campo no se pinta (los vecinos `calificacion:` con rúbrica y `puntajes.<i>.puntos:` fuera del envío).
  4. Lint y la suite completa del frontend, una a la vez y con 0 `Test timed out`, y la tabla de SHA-256 al cierre.
- **No cuenta como hallazgo de esta ronda:**
  - todo lo de la fila de §3 de arriba: prefijos con puntos, prefijo sin mensaje en ENTREGAS-01d y TAREAS-01, caracteres de ancho cero y mensajes de solo espacios;
  - N-35, N-36, O-r2c-1, O-r3c-1 y O-r1c-2;
  - cualquier otra cosa fuera del mecanismo de mensajes vacíos de calificar.
- **Excepción:** algo crítico o alto, dentro o fuera del mecanismo, se reporta y el orquestador lo escala al humano. Algo medio o bajo fuera del mecanismo va a "Observaciones", no a hallazgos.
- No corre el backend (no cambió) ni abre navegadores.

### Observaciones (no bloquean)
#### N-38 — Un mensaje de solo espacios en un código con mensaje del servidor se muestra tal cual
- **Dónde:** `mensajeDeErrorTareas` (`features/tareas/lib.ts:149`) devuelve `error.message` sin más para `CODIGOS_CON_MENSAJE_DEL_SERVIDOR`. `errorApiSchema` (`shared/src/errores.ts`) exige `min(1)`, y un solo espacio lo cumple.
- **Por qué no bloquea:** el servidor manda textos fijos para esos códigos, y está fuera del mecanismo de 01c. El programador ya lo anotó como observación.
- **Qué se espera:** entra en el `chore` de la fila de §3 (punto 4). No pido cambios ahora.

### Veredicto
**RESUMEN ACEPTADO.**
- T-05 y su hermano `calificacion:` quedan corregidos con un diff mínimo dentro de §D-12. Los 3 rojos de CAL-T-135 pasan sin cambiar el archivo, y 7 de los 8 casos nuevos distinguen el defecto. Lo comprobé yo; el octavo es el control.
- Las cifras, las 192 `*.ataque`, "No se toca" (los mismos 9 archivos) y la fila A9 coinciden con mi corrida y con el código.
- Los hermanos y estados vecinos están completos, y lo que dice el resumen de cada uno coincide con el código. Los caracteres de ancho cero se quedan, porque son inalcanzables. Los pendientes fuera del mecanismo van unificados en la fila de §3.
- No hay `M-nn`. N-38 no bloquea.
- El tester puede hacer la ronda 4 cerrada con el alcance de arriba.

## Revisión de la Enmienda 2 — CALIFICACIONES-01
Veredicto: **APROBADO CON OBSERVACIONES.** El plan de 01d puede ir a su ronda 0. N-39 se transcribe antes de que el programador empiece 01d; la ronda 0 del tester no depende de ella.
Verificación propia: sin `lint`, `test` ni `build`, por instrucción del orquestador (el tester estaba corriendo la suite del frontend). Solo leí documentos y código, y corrí `git diff --no-index` y `sha256sum`.

### Cotejo de la enmienda
- **Copia previa:** SHA-256 `bdcf91d0539d72a2ace8e398a039e198ea6e66dd8c96da6608f2ad6367881191`. Coincide con el que dio el orquestador.
- **`plan.md` revisado:** SHA-256 `3a7fbb73419b621e7670dd43e21b748cdbd30526d58d2fb27e84b85abd0f34f0`. No toqué `plan.md`: S-21, S-22 y R-15 no tienen columna "Recomendación del manager" (la tabla de suposiciones y la de riesgos tienen tres columnas, y las preguntas de la enmienda son viñetas). Mis recomendaciones están abajo.
- **Diff:** `git diff --no-index <copia> plan.md` da 13 hunks, con 154 inserciones y 8 borrados. Los 8 borrados son líneas de 01d que vuelven con su texto original intacto más un agregado "(Enmienda 2)".

| # | Hunk | Sección | ¿Es de la Enmienda 2 y está marcado? |
|---|---|---|---|
| 1 | `-1,6 +1,7` | Cabecera | Sí: una línea nueva. Las decisiones del humano, el carril y la línea de la Enmienda 1 no cambian |
| 2 | `-55,6 +56,8` | Suposiciones | Sí: S-21 y S-22, filas nuevas. S-01 a S-20 intactas |
| 3 | `-460,9 +463,13` | §D-13.2 (01d) | Sí: N-30 en `types.ts`, textos y campos de cursor en `data.ts`, y la viñeta nueva de los `VALIDACION` en `lib.ts` |
| 4 | `-470,11 +477,12` | §D-13.3 y §D-13.4 (01d) | Sí: viñeta nueva del error que reemplaza la tabla, y un agregado al final de "Ver más tareas" |
| 5 | `-529,6 +537,10` | §D-14, gradebook (01d) | Sí: cuatro filas nuevas al final. Las filas existentes no cambian |
| 6 | `-547,6 +559,21` | §D-14, "Mis calificaciones" (01d) | Sí: tabla nueva después de la nota N-05 |
| 7 | `-723,7 +750,44` | Pruebas requeridas → 01d | Sí: un agregado al final de CAL-1D09, el párrafo de la regla y CAL-1D10 a CAL-1D17 |
| 8 | `-750,6 +814,7` | Lista cerrada → 01d | Sí: viñeta de constancia "sin cambios" |
| 9 | `-791,6 +856,18` | Puntos de ataque → 01d | Sí: viñeta nueva |
| 10 | `-810,6 +887,7` | Riesgos | Sí: R-15, fila nueva |
| 11 | `-845,6 +923,11` | Textos de la interfaz | Sí: grupo nuevo "Errores de las consultas (01d)". Los textos de 01c no cambian |
| 12 | `-885,12 +968,12` | Pasos → 01d | Sí: pasos 2, 3, 4 y 7. Cada uno conserva su texto con un agregado |
| 13 | `-952,3 +1035,66` | Final del plan | Sí: la sección "Enmienda 2" |

Nada de 01a, 01b ni 01c cambia: ni el diseño, ni las pruebas, ni la lista cerrada, ni los pasos. Tampoco cambian la columna del manager de la tabla de preguntas ni las decisiones del humano. La enmienda cumple la regla de transcripción con cotejo.

### Fondo
- **Regla literal.** Comparé la enmienda con `AGENTS.md:140` y con `.claude/agents/arquitecto.md:27`. Hay un caso por control que envía datos: ventanas, filtro y "Ver más tareas". Cada uno cubre las tres clases (campo no pintable, mensaje vacío o de espacios, prefijo con ruta), dos entradas por clase, y también un mensaje sin prefijo. El modal no aplica, con razón: no hace peticiones. La regla dice "un solo aviso o un `ErrorDeCampo`", y la enmienda usa un `MensajeError` en lugar de la tabla cuando no hay filas. Es una lectura por analogía y no la letra de la regla, pero está declarada (S-21) y queda para el humano. Le doy la razón: es el mismo reparto que el 5xx ya aprobado en §D-14. "La selección se conserva" y "ningún `aria-busy` al terminar" se pueden verificar en los casos.
- **Inventario completo.** Lo comparé con `shared/src/calificaciones.ts:145-162` y `enlaces-registro.ts:47-50`. El gradebook envía `cursor`, `limite`, `cursorTareas` y `limiteTareas`. "Mis calificaciones" envía `cursor`, `limite` y `estado`. A eso se suma `claseId` de la ruta, que ya estaba en contrato. No hay otro parámetro: `paginacionSchema` es un `z.object` no estricto, así que un parámetro de más se descarta y no da `400`.
- **Cursor contra fuera de contrato.** El error de diseño que corrige la enmienda es real. `esErrorDeCursor` (`lib/errores-de-api.ts:36`) es `campoDeErrorDeApi(error) === "cursor"`, así que con él "cursorTareas: no es válido" habría caído en el genérico. `campoDeErrorDeApi` está exportada (`:29`), solo atiende `VALIDACION` y usa `PREFIJO_DE_CAMPO = /^([a-zA-Z_]+):\s*/`. Por eso cada fila de la frontera de CAL-1D10 se cumple tal como está escrita: `cursor:` sin mensaje da `cursor`; `cursorTareas.0:`, ` cursor:` y "Cursor:" no son cursor; y un `500` con "cursor: x" tampoco lo es. **Regla 9:** `features/calificaciones` importa de `lib/`, que es una ubicación compartida, y no de otro módulo. **"No se toca":** `lib/errores-de-api.ts` no cambia. **Pruebas existentes:** la regla de `refactor-01c-r1.ataque.test.tsx:426-462` busca la definición de `esErrorDeCursor` con `\b`, y esa búsqueda no encuentra `esErrorDeCursorDeCalificaciones`. Ninguna prueba actual menciona `features/calificaciones`, `mensajeDeErrorCalificaciones` ni la función nueva (grep vacío). La lista cerrada y §D-R0 de verdad no cambian: la enmienda no agrega ningún `enEspera=` ni `data-material`.
- **S-22 está bien fundada.** No hay `z.config`, `locales` ni mapa de errores en `shared/src`, `backend/src` ni `frontend/src`. Además, `validarParametros` (`backend/src/handlers/validacion.ts:22-30`) arma `"<ruta>: <issue.message>"` con el mensaje de zod 4 por defecto, en inglés (por ejemplo, "Too big: expected number to be <=50" o "Invalid UUID"), y la ruta va unida con puntos. Un `zod/locales/es` tampoco serviría: daría textos técnicos, fuera del tono de §9. Un texto fijo es la respuesta correcta.
- **Casos.** CAL-1D10 a CAL-1D17 se pueden verificar y sus títulos son precisos, con dos salvedades menores (N-40 y N-41). La matriz nueva tiene las columnas "En vuelo a la vez" y "Con la vista desmontada", y es coherente con el mecanismo de `entregas-view.tsx:99-117` (guarda, montaje, cursor, reemplazo, redirección y un aviso).
- **Textos.** "No pudimos cargar las calificaciones / tus calificaciones / más tareas. Inténtalo de nuevo." Siguen §9 (qué pasó y qué hacer) y el patrón que ya existe ("No pudimos cargar tus clases…"). No llevan dos puntos ni palabras prohibidas.
- **R-15 es coherente con la fila de §3 que propuse** (la de T-04 y T-05: prefijos con puntos, prefijo sin mensaje, ancho cero y espacios), y además la completa con una dimensión que aquella no tenía: en las consultas paginadas de `features/tareas` (`mensajeDeErrorTareas`, `lib.ts:150-154`) y de `features/clases` (`mensajeDeErrorClases`, `lib.ts:151-155`), un `limite:` llegaría **en inglés**. El remedio de mi fila (quitar la ruta completa) no lo resuelve. Ver N-42.

### Arbitraje: ¿sube algo a `lib/`?
No hay duplicación que obligue a subir nada. Las tres funciones de `features/tareas` (`erroresDeCalificacionDeApi`, `mensajeDelCampoDeCalificacion` y `mensajeDelAvisoDeCalificar`) traducen el error de una **mutación**, con textos de `core/` en español que se muestran sin el prefijo. Las de `features/calificaciones` clasifican el error de una **consulta** y nunca muestran el texto del servidor. Son reglas distintas por lado. Lo único común, leer el prefijo, ya vive en `lib/` (`campoDeErrorDeApi`), y los mensajes por código son de cada módulo por diseño (§D-9 de TAREAS-01c). `esErrorDeCursorDeCalificaciones` generaliza `esErrorDeCursor`, pero hoy la usa un solo módulo, así que la regla 5 no aplica. Con `lib/errores-de-api.ts` en "No se toca", lo correcto es que cada módulo resuelva lo suyo. **Pendiente para el `chore`:** (a) que `esErrorDeCursor` acepte la lista de campos (con `["cursor"]` por defecto) y `features/calificaciones` la use; (b) el ayudante único de "texto del servidor visible o respaldo" que ya pide mi fila de §3.

### Recomendación del manager (S-21, S-22 y R-15)
- **S-21:** sí, como está.
- **S-22:** sí, como está. Mostrar el mensaje sin el prefijo dejaría texto de zod en inglés frente a la persona.
- **R-15:** sí, al `chore`, pero **unificada en la fila de §3 de T-04 y T-05 como punto (5)**, no como fila aparte, con el texto de N-42.

### Problemas que bloquean
Ninguno.

### Observaciones
#### N-39 — `services/calificacionesService.ts` no está en la lista de archivos de 01d (se aplica antes de que empiece el programador)
- **Dónde:** "Cambios por capa → frontend/ → 01d" (`plan.md:658`). §D-13.2 (N-30) y el paso 2 de 01d cambian la firma de `claveGradebook` en ese archivo, pero la lista de archivos de la subentrega no lo nombra.
- **Por qué importa:** PA-03 manda detenerse ante "uno que el plan no lista para su subentrega". Un programador que la lea al pie de la letra se detiene. Es el mismo patrón de PARADA que las Enmiendas 4 y 5 de ENTREGAS-01. "No se toca" ya lo excluye (`plan.md:1002`) y el cambio no rompe pruebas: `calificar-01c.test.tsx:423,449` y `calificar-01c-r1.ataque.test.tsx:845,847` pasan el mismo objeto literal, y las reglas estáticas de `estatico-01c*.test.ts` no prohíben un tipo derivado.
- **Qué se espera:** sumar `services/calificacionesService.ts` (solo la firma de `claveGradebook`, N-30) a la lista de 01d, con la marca "Enmienda 2". Es una transcripción sin decisión de diseño.

#### N-40 — "El foco no en `<body>`" en la primera carga necesita una precondición
- **Dónde:** CAL-1D11 y CAL-1D14 ("en la primera carga, el foco no está en `<body>`"), y la fila de §D-14 ("nunca `<body>`"). CAL-1D03 ya traía la misma frase.
- **Por qué importa:** en una primera carga, nada tiene el foco y `document.activeElement` es `<body>` desde antes de la respuesta. Tal como está escrita, la prueba falla con un código correcto o empuja a robar el foco al cargar.
- **Qué se espera:** que el caso fije dónde está el foco antes de la respuesta (dentro de la raíz, que existe mientras carga, o en un elemento previo) y verifique que no cae en `<body>` por el error. Puede aclararlo el programador en el título del caso, sin enmienda.

#### N-41 — CAL-1D13 deja dos caminos con "o"
- "Con `refetch` del `QueryClient` **o** al invalidar el prefijo" permite escoger el camino más fácil. Que sean los dos, como dos entradas del mismo caso. No pide enmienda: el programador lo cubre y lo dice en el resumen.

#### N-42 — Texto para R-15 en la fila de §3
- Sumar a la fila de T-04 y T-05 (`revision.md`, "Verificación de la corrección de la ronda 3 — CALIFICACIONES-01c") el punto: "(5) **Consultas paginadas:** un `400 VALIDACION` de un parámetro de consulta (`limite:`, `cursor.0:`) en "Ver más" de `features/tareas/entregas-view.tsx` (`mensajeDeErrorTareas`) y en las listas de `features/clases` (`mensajeDeErrorClases`) muestra el mensaje de zod en inglés o con su prefijo. Remedio: en las consultas, un texto fijo del lugar en vez del mensaje del servidor (criterio S-22 de CALIFICACIONES-01d); quitar la ruta no basta." Destino: el mismo `chore`. Lo aplica el orquestador al cerrar 01d.

### Detalles menores
- La constancia de la lista cerrada (`plan.md:817`) dice que el grep de `campoDeErrorDeApi` encuentra `clases-admin-view.tsx` y `entregas-view.tsx`. Esos dos archivos solo usan `esErrorDeCursor`, y `refactor-01c-r1.ataque` no nombra `campoDeErrorDeApi`. La conclusión, que nada cambia, sigue en pie.
- CAL-1D10 podría sumar `"claseId:"` sin mensaje → `sinAcceso`. Ya está en los puntos de ataque y la función no mira el mensaje.
- La regla `.message` de CAL-1D09 también encontraría un comentario que lo mencione. Conviene aplicarla sin comentarios, como las demás reglas estáticas.
- Tras una ventana fallida, la pila "no se toca" y la vista queda en el `MensajeError` hasta salir de la sección. Es lo mismo que ya pasa con el 5xx aprobado. No pido cambios.

### Para el humano
- S-21, S-22 y R-15 son preguntas que no bloquean. Recomiendo las tres como están, y R-15 unificada en la fila de §3 que ya existe (N-42).

## Revisión final — CALIFICACIONES-01c
Veredicto: **APROBADO CON OBSERVACIONES**
Verificación propia: lint `0` en shared y frontend · build `0` en shared y frontend · test frontend `Test Files  180 passed (180)` · `Tests  2933 passed (2933)`; backend `Test Files  216 passed (216)` · `Tests  2617 passed (2617)`

Nada bloquea. El código es el que acepté en la verificación de la corrección de la ronda 3: después de esa verificación solo entró la `*.ataque` de la ronda 4 cerrada. El tester dio RESISTE sin hallazgos. Las 193 `*.ataque` son iguales a su tabla y "No se toca" tiene los mismos 9 archivos. Fuera de los paquetes solo cambiaron los documentos autorizados, con sus hashes. La subentrega cumple RF-13 y RF-36 en la interfaz, RN-02, RN-03 y RN-06 (S-01). Los textos de A-6 de 01c van abajo, cada uno con su fragmento viejo comprobado. Las observaciones abiertas tienen destino.

Base: `<K1b>` = `10e5a023dc1fc215112dbf7828ab4b32cfa036e1` dentro de los paquetes y `<R>` = `d998282` fuera. Corrí una suite a la vez, sin formateadores, `--write` ni `--fix`. No terminé procesos, no abrí navegadores, no leí `.env`, no hice commit y no toqué código, pruebas ni `plan.md`.

### Mis corridas
Precondición PA-01: `Get-NetConnectionProfile` da la red `IZZI-F281-5G` con perfil `Public`. La regla "Campus: bloquear entrada a Docker en redes publicas" está activa (`Inbound`, `Public`, `Block`, `Enabled: True`, con `Get-NetFirewallRule`). Es la mitigación de `AGENTS.md` para ese perfil, así que corrí el backend. Docker Engine 28.5.1.

| Paquete | Comando | Código | Última línea / resumen |
|---|---|---|---|
| shared | `git diff --stat 10e5a02 -- shared` | 0 | vacío: `shared/` no cambió |
| shared | `npm run lint` | 0 | `All matched files use Prettier code style!` |
| shared | `npm run build` | 0 | `> tsc -p tsconfig.json` |
| frontend | `npm run lint` | 0 | `> tsc -b` (antes: `All matched files use Prettier code style!`) |
| frontend | `npm run build` | 0 | `✓ built in 762ms` |
| frontend | `npm run test` (02:32:32Z a 02:34:33Z) | 0 | `Duration  117.85s (transform 28.04s, setup 78.69s, import 262.28s, tests 517.51s, environment 355.08s)`; `Test Files  180 passed (180)` · `Tests  2933 passed (2933)`; `grep -c "Test timed out"` = 0 |
| backend | `npm run test` (02:35:18Z a 02:38:37Z, después del frontend; O-r0c-1) | 0 | `Duration  164.43s (transform 13.67s, setup 6.52s, import 288.86s, tests 1056.61s, environment 62ms)`; `Test Files  216 passed (216)` · `Tests  2617 passed (2617)` |
| frontend | `npx vitest list` | 0 | 2933 líneas con " > " en 180 archivos (`awk -F' > ' 'NF>1{print $1}' \| sort -u \| wc -l`) |
| backend | `npx vitest list` | 0 | 2617 en 216 archivos |

El backend y `shared/` no cambiaron en 01c. Corrí la suite del backend porque `muro-c-r1.ataque` y `muro-c-r2.ataque` recorren `frontend/src` (O-r0c-1, R-24). Pasan dentro de la suite completa.

### Cifras
| Cifra | Esperada (orquestador y tester) | Mía | ¿Coincide? |
|---|---|---|---|
| Frontend: casos y archivos | 2933 en 180 | 2933 en 180 (corrida y `vitest list`) | Sí |
| `Test timed out` en el frontend | 0 | 0 | Sí |
| Backend: casos y archivos | 2617 en 216 | 2617 en 216 | Sí |
| `"Error no controlado"` · `"code":"P2028"` · `40P01` | 10 · 5 · 0 | 10 · 5 · 0 | Sí |
| `deadlock detected` · `could not serialize` · `too many clients` · `Test timed out` · `Unable to start a transaction` (backend) | 0 en todas | 0 en todas | Sí |
| `DeprecationWarning` de `pg` (N-23) | 18 a 19 | 19 | Sí, anteriores al encargo |
| `*.ataque` iguales a la "Tabla de SHA-256 de las 193 `*.ataque` al cierre de la ronda 4 cerrada de 01c" | 193 de 193 | 193 de 193 (`sha256sum` sobre `git ls-files -co --exclude-standard`, en minúsculas, ordenado por ruta; `diff` vacío) | Sí |
| Pruebas normales de 01c (`vitest list`) | 70 · 4 · 7 · 13 | `calificar-01c` 70 · `calificacion-01c` 4 · `estatico-01c` 7 · `format-01c` 13 (94) | Sí |
| `*.ataque` de 01c (rondas 1 a 4) | 67 · 2 · 6 · 15 · 46 · 22 · 9 · 89 · 16 · 31 | iguales (303) | Sí |
| Suma | 2536 (cierre de 01b) + 94 + 303 = 2933 | 2933 | Sí |
| `git diff --stat 10e5a02 -- frontend backend shared` | 9 archivos, `562 insertions(+), 11 deletions(-)` | igual, los mismos 9 | Sí |
| No rastreados en los paquetes | 17 (3 de producción, 4 normales y 10 `*.ataque`) | 17, los mismos | Sí |

### "No se toca"
- **Dentro de los paquetes, contra `<K1b>`.** Cambian solo `components/clase/data.ts`, `lib/format.ts` (A-4), los seis archivos de `features/tareas` de §D-12 y `styles/clases-r1.ataque.test.ts` (C-7 de la ronda 0, con el hash de la tabla). `lib/errores-de-api.ts`, `backend/` y `shared/` no cambian. Los nuevos son `services/calificacionesService.ts` (A-4), los dos componentes de §D-12 y las pruebas.
- **Fuera de los paquetes, contra `<R>`.** Cambian solo `docs/ARCHITECTURE.md`, `docs/ARCHITECTURE-ESSENTIALS.md` y `docs/PRD.md` (A-6 de 01a y 01b, con `diff` vacío contra `<K1b>`), `docs/DESIGN.md` (paso 6 de 01c), y `AGENTS.md` y `.claude/agents/arquitecto.md` (regla del humano del 2026-10-13). Sus SHA-256 coinciden con `aprobacion.md`: `1092813b…5e93`, `2ce262f4…0c98`, `ee54d6fa…38e5`, `1932ec64…834efe` y `ee07ae58…2d8d`. `CLAUDE.md`, el resto de `.claude/`, `infra/`, los `package.json` y el `package-lock.json` no cambian.
- **Pruebas:** ninguna prueba normal anterior cambió, como pide la lista cerrada vacía de 01c. Ninguna `*.ataque` fue modificada, saltada ni borrada por el programador: la única `*.ataque` anterior que cambió es C-7, del tester.

### Definición de terminado (`AGENTS.md`), punto por punto, para 01c
| Punto | ¿Cumple? | Evidencia |
|---|---|---|
| **RF-13** (lo que ve el alumno de su rúbrica y su calificación) | **Sí** | "Tu trabajo" (`entrega-realizada.tsx`) muestra la lectura cuando `entrega.calificacion !== null`: "Calificación: 8.5 de 10", la fecha en la zona local y, con rúbrica, "Criterio: p de max" por criterio, en una lista. Con la entrega calificada sin entregar (P-03 c′), la frase es "No entregaste esta tarea y ya está calificada.", sin fecha de entrega ni "Anular entrega". No muestra la versión ni nada de otro alumno. Lo cubren CAL-1C09 y CAL-T-71 a CAL-T-100. |
| **RF-36** (interfaz) | **Sí** | Puntuar por criterio, o una calificación directa sin rúbrica, con hasta 2 decimales y punto o coma. Comentario opcional, que va al hilo privado (se invalida el hilo solo si hubo comentario). "Calificar y devolver" y "Actualizar calificación" para recalificar. Calificar a quien no entregó solo con la entrega cerrada, con su nota. Tras un `409` (los tres códigos), un aviso, recarga (también la tarea con `RUBRICA_MODIFICADA` y `ENTREGA_NO_CALIFICABLE`, N-11) y reinicio con el foco en el `h3`. Lo cubren CAL-1C01 a CAL-1C08 y CAL-1C14, y las rondas 1 a 4. |
| **RN-02** estado de pago | **Sí** | Ningún archivo de 01c nombra `estadoPago`, `accesoRestringido` ni correos (grep vacío; CAL-1C13 lo exige en la vista). Los tipos salen de `@campus/shared` (`CalificacionDeEntrega`, `CalificarEntrega`), cuyas respuestas son estrictas. |
| **RN-03** restricción | **Sí** | Un `403 ACCESO_RESTRINGIDO` al calificar o al recargar lo resuelve `apiClient` con su redirección, sin aviso de la vista (A8, A11; CAL-1C06 vecino). El backend ya niega (01a). |
| **RN-06** propiedad; S-01 | **Sí** | El administrador ve la lectura o "Sin calificar todavía.", sin campos ni botones (CAL-1C08). La seguridad está en el backend (`requireOwnership` de la ruta de 01a), no en la interfaz. |
| Capas, middleware y "nada de seguridad solo en el frontend" | **Sí** | 01c no toca `backend/`. La interfaz solo elige qué mostrar. |
| Regla 7 de `CLAUDE.md` (tipos de la API desde `shared/`) | **Sí** | `CalificacionDeEntrega`, `CalificarEntrega` y `CriterioDeRubrica` se reexportan de `@campus/shared` en `types.ts`. Los tipos propios (`EstadoDelPanel`, `TareaDeApertura`, `ResultadoDeCalificacion`, `TotalDelPanel` y `VariablesDeCalificar`) son de la interfaz y viven en `types.ts`. |
| Regla 8 (ningún `fetch`) | **Sí** | La única petición nueva es `api(rutaDeCalificacion(…), { method: "PUT", … })` dentro de `useCalificarEntrega` (`hooks.ts`). Grep de `fetch(` en los 11 archivos de producción: vacío. |
| Regla 9 (ningún import entre módulos) | **Sí** | Grep de `@/features` en los archivos de producción de 01c: vacío. `services/calificacionesService.ts`, `lib/format.ts` y `components/clase/data.ts` no importan de `features/`. |
| `CLAUDE.md`, "Componentes" | **Sí** | Un solo `primary` por vista, con `enEspera` y guarda síncrona con ref (`enviandoRef`). Ningún `disabled`. Iconos y avisos con `lucide-react` y `sonner`. |
| `CLAUDE.md`, "Formularios" | **Sí** | Datos de otra persona, así que cada campo lleva `autoComplete="off"`. El error usa `ErrorDeCampo`, con `aria-invalid` y `aria-describedby`, y nunca queda vacío (T-05). La ayuda del comentario es permanente y está enlazada. `noValidate` y Enter por `onSubmit`. |
| `CLAUDE.md`, errores y valores por defecto | **Sí** | El único `throw` lo hace `api` dentro de la mutación. El manejador del formulario y `recargarTrasConflicto` usan `try/catch/finally` y avisos. No hay `?? []`. Los `?? ""` son campos de texto. `calificacion` nunca lleva un valor por defecto: se compara con `=== null` o `!== null`. Solo retornos tempranos, y los ternarios de JSX son de un nivel. |
| Estructura del módulo | **Sí** | Los textos están en `data.ts` (`TEXTOS_CALIFICAR`, `TEXTOS_CALIFICACION` y los tres grupos de códigos), las funciones puras en `lib.ts`, los ganchos en `hooks.ts` y los tipos en `types.ts`. Los componentes solo declaran `…Props`. |
| `lint`, `build` y `test` en verde | **Sí** | Tabla de arriba. `shared/` no cambió y su `lint` y `build` están en verde. |
| Pruebas de autorización de endpoint nuevo | **No aplica** | 01c no tiene endpoints. El `PUT` es de 01a, con sus pruebas. |
| Migración · `infra/` · `.env.example` | **No aplica** | Sin cambios. |
| Documentos | **Pendientes de A-6 de 01c** | `DESIGN.md` ya está escrito (§7.24, §7.26 y §7.27). `CLAUDE.md`, ESSENTIALS y `ESTADO.md`: textos literales abajo. |

### `DESIGN.md` (§7.24, §7.26 y §7.27, "propuesta (CALIFICACIONES-01c)")
Leí el `diff` de `DESIGN.md` contra `<K1b>` (24 líneas, 4 marcas) y lo comparé con el código final, después de las seis correcciones.
- **§7.24, "Calificada" y "Calificada sin entrega".** Coincide con `entrega-realizada.tsx`. La frase depende de `fechaEntrega === null`, no del estado, y la lectura aparece cuando hay calificación.
- **§7.26, "Calificación".** Coincide: un `Card` entre la entrega y el hilo, con el `h3` (`tabIndex={-1}`). El maestro ve el panel y el administrador, la lectura o "Sin calificar todavía.".
- **§7.27.** Coinciden con el código: cuándo hay formulario (P-03 c′), la nota solo mientras la entrega está `asignado` (N-31), las etiquetas y los valores aceptados, el total (que no es región viva), el comentario con su ayuda, el botón con sus dos textos y su espera, "Lo que se vio" (inicializadores perezosos, con M-06 corregido), el éxito, el `409` (T-03 y M-07: "Un error que reemplaza la vista no se avisa otra vez") y "Otros errores" (T-02, N-34). Solo falta una precisión: no dice que el aviso y el `ErrorDeCampo` nunca llevan el nombre técnico del campo ni quedan vacíos (T-04 y T-05). No bloquea (N-43).
- **Tokens y material.** Solo usa la escala propia (`text-small`, `text-h3`, `text-body`, `font-bold`, `text-muted-foreground`, `text-foreground`, `gap-*`, `pt-1`, `wrap-anywhere`). No hay ningún color, tamaño, radio ni sombra suelto. No hay vidrio propio: el panel es un `Card`, como el de la entrega (§7.26). No hay `data-material` ni `data-densidad`, porque §7.26 no los pide (CAL-1C13).
- **Foco y estado.** El `h3` recibe el foco en cada reinicio. El error se marca con `aria-invalid` y se describe con texto. El estado se dice con texto (la nota, la frase, "Sin calificar todavía."), nunca solo con color.
- **Tono (§9).** Textos concretos y en segunda persona, con la concordancia "de 1 punto". Sin palabras prohibidas ni emojis (grep vacío).
- **Navegador, 360 px y lector de pantalla:** sin verificar, porque ningún agente abre navegadores. Van a la hoja de 01d (ver abajo).

### Matriz de §D-14 (31 filas) contra el código final
Leí `useCalificarEntrega`, `FormularioDeCalificacion`, `PanelDeCalificacion`, `recargarTrasConflicto`, `useAvisoDeRecargaFallida` (con `callado`) y las cuatro funciones de traducción de `lib.ts`. **Las 31 filas (A1–A14, B1–B6, C1–C5, D1–D3 y E1–E3) coinciden** con el texto que dejaron las correcciones: implementación, M-06 (B6), ronda 1 (A6, A7, A9, C3, A14 y C5), M-07 (columna "Con la vista desmontada" de A6, A7, C3 y C5), ronda 2 (A14) y ronda 3 (A9). Comprobé en particular:
- **A6 y C3:** `activo = falloDeLaTarea && !(consulta.isFetching || entregaReemplazaLaVista)` y `callado` es el complemento. La marca se escribe solo en la limpieza.
- **A9 y A14:** caminos excluyentes en `onError`.
  - El gancho calla si `erroresDeCalificacionDeApi(error, criteriosEnviados) !== null`.
  - Si el panel no tiene el campo, avisa con `mensajeDelCampoDeCalificacion`.
  - Si no, avisa con `mensajeDelAvisoDeCalificar`.
  - En los tres caminos, si no queda texto, el genérico.
  - El panel aplica la misma función con la rúbrica de apertura, que es la del envío.
- **N-35 y O-r2c-1:** el texto de A6 ("la siguiente vista de la tarea solo avisa de su propia recarga") se cumple siempre con `@tanstack/query-core` 5.103.2, porque un error deja la consulta invalidada (CAL-T-107 lo fija). Ya no hace falta precisar la fila.

### Hallazgos del tester
- **Ronda 1:** T-02 y T-03, corregidos. Además, M-07 (vecino de T-03), corregido.
- **Ronda 2:** T-04, corregido.
- **Ronda 3:** T-05, corregido.
- **Ronda 4 cerrada:** RESISTE, sin hallazgos. O-r4c-1 va a la fila del `chore`.
- **Desacuerdos:** no hubo entre el programador y el tester. Las decisiones tomadas en las verificaciones (los hermanos fuera de §D-12, N-35, N-36 y el ancho cero) el tester las respetó como tales.

### Documentos a actualizar (textos literales; los aplica el orquestador con A-6 tal cual, después de este APROBADO)
Comprobé en el árbol actual que cada fragmento viejo existe una sola vez en su documento (`grep -c -F` = 1).
- **Qué entra en 01c (N-26):** la fila `tareas` y "Ubicaciones compartidas" de `CLAUDE.md`, y la frase del panel en ESSENTIALS que E-1 dejó para después.
- **Qué queda para 01d:**
  - la frase «En la sección "Calificaciones" de la clase» de RF-17;
  - la fila `calificaciones` de `CLAUDE.md`;
  - la viñeta de `components/foco/`: el movimiento de `useFocoAlPerderseElControl` es de 01d y todavía no existe.
- **Cómo leer los bloques:**
  - En los bloques entre dos acentos graves dobles, lo que se aplica es el texto de dentro, sin el espacio de cada extremo.
  - En los de un solo acento grave, el texto de dentro.

**CLAUDE-1. `CLAUDE.md`, tabla de módulos, fila `tareas` (línea 58).** Reemplazar el fragmento literal del final de la fila
> `` entregas de una tarea y entrega de un alumno para maestro y administrador (ENTREGAS-01) | Estudiante, Maestro, Administrador | ``

por
> `` entregas de una tarea y entrega de un alumno para maestro y administrador (ENTREGAS-01); panel de calificación en la entrega de un alumno (el maestro califica y devuelve, y recarga tras un conflicto; el administrador lee) y la calificación con su desglose en "Tu trabajo" (CALIFICACIONES-01) | Estudiante, Maestro, Administrador | ``

**CLAUDE-2. `CLAUDE.md`, "Ubicaciones compartidas", viñeta `lib/format.ts` (línea 74).** Reemplazar el fragmento literal
> `` porcentajes, tamaños de archivo (`formatearTamano`) ``

por
> `` puntos y porcentajes (`formatearPuntos`, `formatearPorcentaje`), tamaños de archivo (`formatearTamano`) ``

**CLAUDE-3. `CLAUDE.md`, "Ubicaciones compartidas", viñeta `components/clase/` (línea 71).** Reemplazar el fragmento literal del final de la viñeta
> `` y el texto 'Sin tema' (`TEXTOS_DE_LA_CLASE.sinTema`) ``

por
> `` y los textos 'Sin tema' (`TEXTOS_DE_LA_CLASE.sinTema`) y 'Sin categoría' (`TEXTOS_DE_LA_CLASE.sinCategoria`) ``

**CLAUDE-4. `CLAUDE.md`, "Ubicaciones compartidas", viñeta nueva.** Va en una línea propia, inmediatamente después de la línea que empieza con `` - `services/trabajoService.ts` `` (línea 88):
> `` - `services/calificacionesService.ts` — las claves de las calificaciones de una clase (`clavePrefijoDeCalificaciones`, `claveGradebook` y `claveMisCalificaciones`: gradebook y "Mis calificaciones"), compartidas por `features/tareas`, que las marca viejas al calificar, y `features/calificaciones` ``

**E-6. `docs/ARCHITECTURE-ESSENTIALS.md`, "Reglas de datos", viñeta "Edición concurrente" (línea 65).** Es la frase de 01c que E-1 dejó para después, ajustada a lo implementado (N-11; recarga fallida, A5 y A6). Reemplazar el fragmento literal
> `` Tras el `409`, el formulario de la tarea avisa, descarta lo escrito y recarga la versión actual, como el editor de categorías (decisión del humano, 2026-10-11). ``

por
> `` Tras el `409`, el formulario de la tarea avisa, descarta lo escrito y recarga la versión actual, como el editor de categorías (decisión del humano, 2026-10-11). Tras un `409` al calificar (`ENTREGA_MODIFICADA`, `RUBRICA_MODIFICADA` o `ENTREGA_NO_CALIFICABLE`), el panel de calificación avisa, descarta lo escrito y recarga la entrega y, con `RUBRICA_MODIFICADA` o `ENTREGA_NO_CALIFICABLE`, también la tarea, como el formulario de la tarea; si la recarga falla, conserva lo escrito y la versión que vio (CALIFICACIONES-01). ``

**EST-4. `docs/ESTADO.md` §3, fila unificada del `chore` de la traducción de errores.** Va inmediatamente después de la fila que empieza con `| N-23 de CALIFICACIONES-01b:` (línea 280).
- **Qué reemplaza:**
  - la fila de los prefijos con puntos de la ronda 2 y su versión unificada de la ronda 3 (ninguna de las dos se aplicó);
  - el punto (5) de N-42, que ya entra aquí y no hay que aplicarlo al cerrar 01d.
- **Forma:** es una sola línea de tabla. No lleva ningún `|` dentro del texto.

> `` | T-04 y T-05 de CALIFICACIONES-01c (hermanos fuera de §D-12) y R-15 de su Enmienda 2: el texto de un `400 VALIDACION`, o de un código con mensaje del servidor, que llega a la persona. (1) **Prefijo con puntos o índices:** `quitarPrefijoDeCampo` (`frontend/src/lib/errores-de-api.ts:21`, `/^([a-zA-Z_]+):\s*/`) no los quita y el aviso muestra el nombre técnico: crear y editar tarea (`useCrearTarea` y `useEditarTarea`, `features/tareas/hooks.ts`) con "archivoIds.0: Un archivo adjunto no es válido" o "rubrica.2: …"; entregar (`useEntregar`) con "archivoIds.0: …"; temas y categorías (`mensajeDeErrorClases`, `features/clases/lib.ts:155`) con "orden.3: …" o "categorias.0.peso: …"; y el error de la lista de alumnos (`features/clases/lib.ts:426`). (2) **Prefijo sin mensaje:** `errorDelCampoDeApi` (`features/tareas/lib.ts`, por `errorDeEnlacesDeApi` y `errorDeTextoDeApi`, ENTREGAS-01d) deja un `ErrorDeCampo` vacío en entregar y en el hilo privado con `"enlaces.0:"` o `"texto:"`; `mensajeDeErrorTareas` (TAREAS-01) deja vacío el aviso de crear, editar, borrar, entregar, anular, comentar y descargar, y el `MensajeError` de la entrega del alumno, con `"x:"`; `erroresDeFormularioDeApi` del formulario de tarea deja un `ErrorDeCampo` vacío con `"titulo:"`. (3) **Caracteres que `\s` no reconoce:** los de ancho cero (`U+200B`, `U+200C`, `U+200D`, `U+2060`) y los de control como `U+0085` (O-r4c-1) tras el prefijo dejan un texto invisible en los tres caminos de calificar (`erroresDeCalificacionDeApi`, `mensajeDelCampoDeCalificacion` y `mensajeDelAvisoDeCalificar`), que comparan con `""`; y un prefijo con letras fuera de ASCII (el respaldo `"parámetro:"` de `validarParametros`, O-r3c-1) no se quita. (4) **Mensaje de solo espacios** en los códigos de `CODIGOS_CON_MENSAJE_DEL_SERVIDOR`: se muestra tal cual (N-38). (5) **Consultas paginadas:** un `400 VALIDACION` de un parámetro de consulta (`limite:`, `cursor.0:`) en "Ver más" de `features/tareas/entregas-view.tsx` (`mensajeDeErrorTareas`) y en las listas de `features/clases` (`mensajeDeErrorClases`) muestra el mensaje de zod en inglés o con su prefijo; quitar la ruta no basta (R-15, N-42). (6) **Cursor con otro nombre:** `esErrorDeCursor` (`lib/errores-de-api.ts:35`) solo reconoce `cursor`; CALIFICACIONES-01d resuelve `cursorTareas` con su propia `esErrorDeCursorDeCalificaciones` (Enmienda 2). Nada de esto se alcanza con el servidor y el cliente actuales: el servidor siempre manda una ruta seguida de un mensaje con texto, y el cliente envía datos en contrato. Remedio: rediseñar la traducción en un solo lugar de `lib/errores-de-api.ts`, en lugar de seguir corrigiendo camino por camino (tres rondas seguidas del tester en CALIFICACIONES-01c sobre este mecanismo): quitar una ruta completa (`^[A-Za-z0-9_.-]+:\s*` o más amplia), una sola vez y sobre el mensaje crudo, sin cambiar `campoDeErrorDeApi`; que todo texto del servidor que quede vacío o sin caracteres visibles dé el genérico del módulo; en las consultas, un texto fijo del lugar en vez del mensaje del servidor (criterio S-22 de CALIFICACIONES-01d); que `esErrorDeCursor` acepte la lista de campos (con `["cursor"]` por defecto) y que `features/calificaciones` la use; y una tabla común de entradas fuera de contrato que recorran todas las funciones de traducción de los módulos. Con eso se simplifica `mensajeDelAvisoDeCalificar` y se resuelven N-36 y la comprobación repetida de `esApiError` en `mensajeDelCampoDeCalificacion` (N-33) | El `chore` posterior a CALIFICACIONES-01 (el mismo de S-15 y N-22). Toca `lib/` y dos módulos de `features/`, así que lleva plan y aprobación del humano | `revision.md` de CALIFICACIONES-01: "Verificación de la corrección de la ronda 2 — CALIFICACIONES-01c", "Verificación de la corrección de la ronda 3 — CALIFICACIONES-01c", "Revisión de la Enmienda 2" (N-42) y "Revisión final — CALIFICACIONES-01c"; `reporte-tester.md`: rondas 2, 3 y 4 cerrada de 01c (T-04, T-05, O-r3c-1, O-r4c-1) | ``

**EST-5. `docs/ESTADO.md` §3, fila nueva (O-r1c-2).** Va inmediatamente después de EST-4.
> `` | O-r1c-2 de CALIFICACIONES-01c: la vista de la entrega de un alumno (`EntregaDelAlumno`, `features/tareas/entrega-de-alumno-view.tsx`) no lleva `key` por `alumnoId`, y el panel de calificación solo cambia de `key` con sus reinicios. Si algún día la vista pasa de un alumno a otro sin desmontarse, el formulario del segundo conservaría la versión y lo escrito del primero, y el guardado iría con la versión equivocada. Hoy no se alcanza: no hay enlace directo entre entregas | El encargo que agregue navegación directa entre entregas de alumnos (anterior o siguiente): que la vista o el panel cambien de `key` con el alumno, con su prueba | `reporte-tester.md` de CALIFICACIONES-01, rondas 1 a 3 de 01c (O-r1c-2); `revision.md`, "Revisión final — CALIFICACIONES-01c" | ``

**Errata.** No hay errata del plan en 01c.

### Problemas que bloquean
Ninguno (sin `M-nn`).

### Observaciones nuevas (no bloquean)
#### N-43 — §7.27 de `DESIGN.md` no dice que los errores del servidor nunca llevan el nombre técnico ni quedan vacíos
- **Dónde:** `docs/DESIGN.md`, §7.27, viñeta "Otros errores".
- **Qué falta:** el código, después de T-04 y T-05, garantiza que ni el aviso ni el `ErrorDeCampo` muestran el prefijo técnico, y que sin texto dicen el genérico. El texto de diseño no lo dice. No es una contradicción: es una regla que no quedó escrita.
- **Qué se espera:** reemplazar el fragmento literal
  > `un error de un campo que el panel tiene se marca bajo ese campo, sin aviso; si el panel no tiene ese campo, un solo aviso con el mensaje del servidor, sin marcar ningún campo;`

  por
  > `un error de un campo que el panel tiene se marca bajo ese campo, sin aviso; si el panel no tiene ese campo, un solo aviso con el mensaje del servidor, sin marcar ningún campo. Ni el aviso ni el error del campo llevan el nombre técnico del campo y, si al mensaje no le queda texto, dicen "Algo salió mal. Inténtalo de nuevo.";`
- **Destino:** lo aplica el programador en 01d, en el mismo paso en que escribe `DESIGN.md` (sin ronda propia y antes de la comprobación humana que aprueba las marcas). `DESIGN.md` está fuera de "No se toca" solo para el programador de la subentrega (A-6).

### Observaciones abiertas y su destino (lista cerrada)
| Id | Qué | Estado y destino |
|---|---|---|
| N-19 | Texto de `409 TAREA_CON_ENTREGAS` cuando solo hay calificadas sin entrega | Sigue **para el humano al cierre del encargo** (fila de `ESTADO.md` §3). 01c no lo toca. |
| N-22 | Dos `if` anidados (`entregas.ts:844-847`, `calificar.ts:132-138`) | `chore` posterior a CALIFICACIONES-01 (fila EST-3 de 01b, ya en §3). |
| N-23 | `DeprecationWarning` de `pg` (19 en mi corrida) | "Antes de actualizar `pg` a 9" (ya en §3). |
| N-26 | Documentos que describen la interfaz | **La parte de 01c se aplica ahora** (CLAUDE-1 a CLAUDE-4 y E-6). Quedan para **01d**: RF-17 («En la sección "Calificaciones" de la clase»), la fila `calificaciones` de `CLAUDE.md` y la viñeta de `components/foco/`. |
| N-27 | Rojos intermitentes del frontend en 01b | **Cerrada.** En 01c todas mis corridas del frontend (seis) salieron en verde a la primera, sin ningún `Test timed out`. |
| N-33 | Mensaje vacío en un campo que el panel pinta | **Resuelta por T-05** (`erroresDeCalificacionDeApi` da el genérico). La comprobación repetida de `esApiError` en `mensajeDelCampoDeCalificacion` es inocua y va a EST-4. |
| N-35 / O-r2c-1 | A6 suponía que la siguiente vista vuelve a pedir la tarea | **Cerrada.** Con `@tanstack/query-core` 5.103.2 siempre la vuelve a pedir (el error invalida la consulta), y CAL-T-107 lo fija: si una versión futura cambia ese comportamiento, la prueba falla. El texto de A6 queda como está. |
| N-36 | Doble recorte de "Nota: …" con una ruta simple | `chore` (EST-4). Hoy no se alcanza. |
| N-37 | "Cinco llamadas" en lugar de cuatro, en un resumen | Sin acción: es texto del resumen y no cambia nada de fondo. |
| N-38 | Mensaje de solo espacios en `CODIGOS_CON_MENSAJE_DEL_SERVIDOR` | `chore` (EST-4, punto 4). |
| O-r1c-1 | Volver a la vista con el `PUT` en vuelo | Sin acción: es la fila B1, por diseño. El siguiente guardado recibe el `409`, y el aviso de éxito sale una vez (CAL-T-88). |
| O-r1c-2 | La vista no tiene `key` por `alumnoId` | Fila nueva EST-5, con destino en el encargo que agregue navegación entre entregas. |
| O-r3c-1 | Prefijo `"parámetro:"` con letra fuera de ASCII | `chore` (EST-4, punto 3). |
| O-r4c-1 | `U+0085` y otros invisibles que `\s` no reconoce | `chore` (EST-4, punto 3). |
| N-42 | R-15 en la fila de §3 | **Absorbida en EST-4** (punto 5). Ya no hay que aplicarla al cerrar 01d. |
| N-39, N-40, N-41 | Observaciones de la Enmienda 2 | N-39 ya está aplicada en `plan.md` (`5ea9bd38…`). N-40 y N-41 se le dictan al programador de 01d. |
| N-43 | Precisión de §7.27 | 01d, con el paso de `DESIGN.md` (arriba). |
| S-21, S-22, R-15 | Preguntas de la Enmienda 2 que no bloquean | **Para el humano**, con el cierre de 01c. Recomiendo las tres: S-21 y S-22 como están, y R-15 al `chore` (EST-4). Si no hay veto, rigen. |

### Riesgos residuales de 01c
1. **Errores fuera de contrato fuera de calificar.** Todo lo de EST-4 sigue vivo en TAREAS-01, ENTREGAS-01d y CLASES-02 hasta el `chore`. Ninguno se alcanza con el servidor de hoy. Si un cambio del servidor rompe el formato `"<ruta>: <mensaje>"` o empieza a mandar mensajes de zod de un esquema de consulta, aparecerían textos técnicos o en inglés frente a la persona.
2. **Cambio de alumno sin desmontar la vista (O-r1c-2).** Hoy no se puede llegar a ese estado. El riesgo aparece con la primera navegación "anterior o siguiente" entre entregas. Queda en EST-5.
3. **Reloj del navegador.** `sePuedeCalificar` usa la hora del equipo y solo elige entre el formulario y la frase; el servidor decide con su propio reloj. Si el reloj del equipo está desfasado, el maestro puede ver el formulario y recibir `409 ENTREGA_NO_CALIFICABLE`, que recarga y reinicia (A4, N-11). Ningún temporizador vuelve a pintar el panel justo a la hora límite: la frase cambia al formulario con la siguiente recarga de fondo (por ejemplo, al volver a la pestaña) o al volver a abrir la vista. Es lo que dicen B2 y C2.
4. **La marca de M-07 con StrictMode.** El doble montaje de desarrollo puede marcar como atendido un fallo callado antes de tiempo. En producción no pasa (aceptado en la segunda verificación de la ronda 1).
5. **Despliegue (S-16/R-07).** 01c consume `calificacion` como obligatoria en las dos respuestas de la entrega. El frontend y el backend se despliegan juntos (fila DEPLOY de §3, sin cambio).
6. **Sin navegador real.** Nadie vio todavía el panel a 360 px, con NVDA ni con un teclado real: va a la hoja de 01d (abajo).
7. **`formatearPorcentaje` todavía no se usa en producción.** Lo usará 01d (A-4). Tiene sus casos en `format-01c.test.ts` y en `format-01c-r1.ataque`.

### Métricas de 01c
- **Rondas del tester:** 3 dentro del tope, más 1 cerrada que autorizó el humano.
  - **Extra: 2** (rondas 2 y 3), las dos de la misma clase: el mensaje de un `VALIDACION` fuera de contrato (T-02 → T-04 → T-05), cada una vecina del remedio anterior.
  - La ronda 4 cerrada no tuvo hallazgos. Si se cuenta como ronda, son 3 extra sobre el mismo mecanismo.
- **Resúmenes del programador devueltos:** **2 de 6** (implementación, M-06, ronda 1, M-07, ronda 2 y ronda 3).
  - M-06 es un estado vecino de la versión de apertura.
  - M-07 es vecino de T-03.
  - Los dos los detecté en la verificación, antes del tester, y no cuentan como rondas.
- **PARADAS:** **0**.
- **Hermanos:** en cada corrección, las listas del programador estaban completas fuera del mecanismo y coincidían con el código (lo comprobé en las seis verificaciones). La falla estuvo dentro del mecanismo: T-04 llevó el genérico a dos de los tres caminos de calificar, y T-05 fue el tercero.

### Juicio sobre las reglas del 2026-10-05 y del 2026-10-07
- **Regla del 2026-10-05 (programador a `opus` si hay 2 o más rondas extra por hermanos o estados vecinos).** 01c la cumple otra vez (2 rondas extra), pero ya está aplicada: el programador corre con `opus` desde TAREAS-01d y así hizo todo CALIFICACIONES-01. La regla no prevé un paso siguiente. **Recomiendo seguir con `opus`.** El modelo no explica estas rondas:
  - Cada remedio fue correcto y mínimo.
  - Los vecinos eran entradas fuera de contrato que el plan no había inventariado. El humano ya lo atacó desde el plan con la regla del 2026-10-13 en `AGENTS.md` y `arquitecto.md`.
  - "No se toca" sobre `lib/errores-de-api.ts` obligó a remedios locales, camino por camino.
- **Mi parte.** En la verificación de la ronda 1 anoté N-33 (el mensaje vacío en un campo que el panel pinta) como inalcanzable y no la pedí corregida. Era exactamente T-05, y le costó al encargo la ronda 3. Por eso propongo al humano una regla para el manager (abajo).
- **Regla del 2026-10-07, por analogía.** Esa regla dice que si las rondas extra por estados vecinos del foco no bajan con `opus`, el `chore` rediseña el mecanismo en lugar de corregirlo estado por estado. **Aplica aquí a un mecanismo concreto: la traducción de los errores de la API en el frontend.**
  - El patrón es el mismo que T-09 → T-14 → T-15 en el foco de TAREAS-01d: tres rondas seguidas (T-02 → T-04 → T-05), con `opus`, cada una vecina del remedio anterior.
  - El mismo patrón sigue vivo fuera de calificar: EST-4 lista seis clases en cuatro módulos.
- **Recomendación para el `chore`:**
  - **Diseño:** no más parches por camino. Un solo contrato de traducción en `lib/errores-de-api.ts`, con estas invariantes:
    - cada error va por un solo canal: un campo, un aviso, la vista reemplazada o la redirección;
    - nunca un texto vacío o invisible;
    - nunca un prefijo técnico;
    - nunca un mensaje de zod en inglés en una consulta.
  - **Pruebas:** una tabla común de entradas fuera de contrato que recorran todas las funciones de traducción de `features/tareas`, `features/clases` y `features/calificaciones`.
  - **Proceso:** plan propio, carril normal (no toca nada sensible), con la lista cerrada de pruebas por grep (regla del 2026-10-12). Como toca `lib/` y dos dominios, necesita la aprobación del humano.

### Hoja de la comprobación humana
01c no tiene hoja propia: va una sola al final de 01d, con máximo 7 puntos. Los puntos H-1 a H-7 del plan ya cubren 01c en lo esencial:
- H-1: calificar con rúbrica y medio punto, y el alumno ve el desglose.
- H-2: dos pestañas, `409` y foco en "Calificación".
- H-5: editar una tarea calificada.
- H-6: calificar a quien no entregó.
- H-7: NVDA en el panel.

Propongo sumar solo lo que ninguna prueba automática puede ver, **sin agregar puntos**:
- **H-1, al final:** "A 360 px, el panel de calificación se lee completo: las etiquetas largas de criterio no desbordan y el botón queda a la vista."
- **H-7, al final:** "Tras «Calificar y devolver», se anuncia el aviso y el foco queda en «Calificación»."

H-2 y H-5 quedan como están: ya prueban el `409` del panel y `TAREA_CON_CALIFICACIONES`. La hoja sigue con 7 puntos y dentro de los 10 minutos.

### Desacuerdos arbitrados
Ninguno nuevo en esta revisión. Los de 01c ya quedaron arbitrados en sus verificaciones:
- los hermanos de T-04 y T-05 fuera de §D-12 van al `chore`;
- N-35 y N-36 son decisiones tomadas;
- el ancho cero es inalcanzable.

El tester los respetó.

### Para el humano
- **S-21, S-22 y R-15** (Enmienda 2). Recomiendo las tres; R-15 va al `chore`, en EST-4. Si no hay veto, rigen para 01d.
- **N-19** sigue pendiente para el cierre del encargo.
- **El `chore` de la traducción de errores** (EST-4) es un rediseño, no un parche: necesita plan y tu aprobación, porque toca `lib/` y dos dominios.
- **Propuesta opcional de regla para el manager**, en `.claude/agents/manager.md`, "Verificación del resumen del programador": "En un mecanismo que ya tuvo una ronda extra del tester, el manager no deja como observación un vecino del mismo mecanismo por ser inalcanzable: lo pide corregido en la misma vuelta." Motivo: N-33, que dejé pasar en la ronda 1, fue T-05 en la ronda 3. Requiere tu autorización, porque `.claude/` está en "No se toca".

### Veredicto
**APROBADO CON OBSERVACIONES.** 01c cumple el plan, solo el plan y todo el plan de la subentrega, con las correcciones de M-06, M-07 y T-02 a T-05.
- **Verificación:** `lint` y `build` de `shared/` y `frontend/`, y `test` de `frontend/` (2933 en 180) y de `backend/` (2617 en 216), en verde en mi corrida, una a la vez.
- **Pruebas e intocables:** las 193 `*.ataque` están intactas y "No se toca" tiene los 9 archivos esperados. Los documentos de fuera coinciden con sus hashes.
- **Documentos y diseño:** la definición de terminado se cumple punto por punto. `DESIGN.md` describe lo implementado, salvo la precisión de N-43. Las 31 filas de la matriz coinciden con el código.
- **Observaciones:** todas tienen destino, en la lista cerrada de arriba. N-19, S-21, S-22 y R-15 quedan para el humano.
- **Siguiente paso (orquestador):**
  1. Aplicar tal cual CLAUDE-1 a CLAUDE-4, E-6, EST-4 y EST-5, y anotar los SHA-256 de `CLAUDE.md`, ESSENTIALS y `ESTADO.md` en `aprobacion.md`.
  2. Entregar al humano el bloque de commit de 01c: los 9 archivos cambiados, los 17 nuevos de los paquetes, `docs/DESIGN.md`, `AGENTS.md`, `.claude/agents/arquitecto.md`, los tres documentos de A-6 de 01c y `docs/trabajo/CALIFICACIONES-01-calificaciones-y-gradebook/`.
  3. Dictar al programador de 01d N-40, N-41 y N-43.
