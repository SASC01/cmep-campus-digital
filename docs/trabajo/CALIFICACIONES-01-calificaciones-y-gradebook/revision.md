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
