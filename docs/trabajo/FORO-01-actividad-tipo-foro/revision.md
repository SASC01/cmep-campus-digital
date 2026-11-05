# Revisión del Manager — FORO-01 · actividad tipo foro — plan
Veredicto: CAMBIOS REQUERIDOS (regresa al Arquitecto)
Verificación propia: revisión de plan; sin suites por instrucción del orquestador (ADMIN-01 corre en la copia principal). Solo lectura y `git`. Plan revisado: SHA-256 `e5723d33bfe0c3b7387fe44d5eed4af5ac3856e892f112ae5f5c1a325778b4ea` (coincide con el del encargo). Contrastado con `ADMIN-01-administracion/plan.md` (Enmiendas 1 a 4) en la copia principal y con el código en `e94ee59`.

El plan es sólido en lo grueso: DH-01 (a) es lo que ESSENTIALS ya prevé, el cierre de las rutas de tarea a un foro está bien inventariado y el cruce con ADMIN-01 de 01a está completo. Hay cuatro cosas que bloquean. La primera es la que el humano pidió de forma expresa.

## Problemas que bloquean

### M-01 — La regla tardía no vive en una sola función
Dónde: DH-02; §D-2.1; §D-8.4 (nota "quedará marcada con retraso"); FORO-1A06; `backend/src/core/calificaciones/calificar.ts:171-182`.
Por qué importa: el humano pidió "una sola función donde cambiarla". El plan dice que cambiar a (b) "toca solo `reglaDeParticipacion` y su prueba". No es cierto. Hay tres lugares fuera de la función:
1. **Calificar.** `exigirEntregaCalificable` decide con su propia copia del cierre, `!tarea.aceptaTardias && esTarde(...)`. Con un foro, el plan la reutiliza con `actividad: "foro"`, solo para cambiar el texto. Si el cliente cambia el cierre del foro (que nunca cierre, o que cierre aunque acepte tardías), calificar y participar dejan de coincidir. Dos ejemplos: el maestro califica a quien todavía puede participar, que después recibe `PARTICIPACION_CALIFICADA`; o el maestro no puede calificar a quien ya no puede participar.
2. **Frontend.** El aviso "La fecha límite ya pasó: tu participación quedará marcada con retraso." lo calcula el cliente con `fechaLimite` y `aceptaTardias`, porque `miParticipacionRespuestaSchema` no trae ese dato. Con (b), el aviso mentiría.
3. **FORO-1A06.** Dice que ningún otro archivo compara `aceptaTardias` con la fecha de un foro. Con el punto 1, `calificar.ts` sí lo hace, así que la prueba falla o queda vacía.
Qué se espera:
- Que el cierre que usa calificar con un foro salga de `reglaDeParticipacion`, o que el plan declare de forma explícita y razonada que P-03 c′ queda fuera de la decisión del cliente.
- Que el cliente reciba del servidor el "con retraso si publicas ahora" (un campo calculado con la regla) en lugar de calcularlo.
- Que FORO-1A06 sea verdadera y vigile de verdad.
- Que DH-02 diga, opción por opción, qué cambia además de la función: textos del formulario y del detalle ("Aceptar con retraso", "Se aceptan participaciones con retraso"), y si la opción toca ESSENTIALS ("tarde y cierre como en las entregas", línea 127).

### M-02 — No se fija cuándo entra 01a a `main` respecto de ADMIN-01
Dónde: §Resumen punto 3, §D-X, §D-R0 01b ("Paso 0").
Por qué importa: el plan supone, sin decirlo, que 01a se queda en `feat/foro-01` y que lo que se fusiona después es `main` en la rama del foro. Si 01a llegara a `main` antes que ADMIN-01, el cruce cambiaría de lado: la rama de ADMIN heredaría ADM-1A09 en rojo, con 16 rutas con `:claseId` que no están en su tabla. También heredaría la unión de `sesiones-y-cadena.ataque` y `lecturas-fx-r1.ataque` y el conflicto de `schema.prisma`. Es justo lo que la instrucción del humano quiere evitar. Al revés no hay problema: 01a no depende de nada de ADMIN-01. Todo lo que usa de ADMIN (`enClaseArchivada`, `useSoloLecturaDeLaClase`, `esClaseArchivada`, `claveClaseDetalle`, `useFocoAlCargarMas`) aparece desde 01b.
Qué se espera: una regla explícita en el plan: "Ningún commit de FORO-01 entra a `main` antes de que ADMIN-01 se fusione; 01b arranca con `git merge main`". Si el humano quiere otro orden, el plan dice qué absorbe ADMIN-01 y quién lo hace.

### M-03 — Dos accesos a `participaciones_foro` sin índice que los sirva
Dónde: §D-1.2 (índices), §D-3.4 (`listarParticipaciones`, paso 4), "Acceso a datos" (fila "Conteo de réplicas por principal").
Por qué importa: regla 4 (toda consulta filtra por una columna indexada; sin recorridos completos disfrazados).
1. El conteo de réplicas es `groupBy({ by: ["principalId"], where: { principalId: { in } } })`, sin `foroId`. Ninguno de los dos índices empieza por `principal_id`, así que recorre la tabla o el índice entero.
2. La FK `principal_id → participaciones_foro(id) ON DELETE CASCADE` no tiene un índice que empiece por `principal_id`. Borrar un foro, o la clase con el borrado definitivo de ADMIN-01, borra en cascada cada principal. Por cada una, PostgreSQL busca sus réplicas por `principal_id`: es un recorrido por cada principal borrada.
Qué se espera: el conteo filtra también por `foroId`, y hay un índice con `principal_id` al frente (por ejemplo, `(principal_id, creado_en, id)`, que también sirve a la lista de réplicas), o una justificación de por qué no hace falta, con la prueba que lo mida.

### M-04 — El conteo de 01c no es creíble y el corte no se sostiene
Dónde: §D-0.2 (01c "~30: … ~4 existentes"), §D-R0 01c a 01e (punto 3 del grep).
Por qué importa: es la regla del 2026-11-04 (`AGENTS.md`, "Tamaño de subentregas"). El mismo plan cita "las 17 pruebas del grep" que cambian porque `useTrabajo` y `useTemasDeLaSeccion` pasan a `seccion=actividades-y-foros`. En `e94ee59`, 17 archivos de prueba del frontend dependen del valor `"actividades"`: dobles que eligen respuesta con `searchParams.get("seccion") === "actividades"` y claves `claveTemasDeLaSeccion(…, "actividades")`. Unos 8 son `*.ataque`. A eso se suman `secciones-03c1`, `como-se-entrega-01a`, la cifra V-06 de `styles/clases-r1.ataque` y las listas de códigos. 01c queda en unos 19 + 7 + 18 ≈ 44 archivos, no en ~30.
Qué se espera: recontar 01c y partirla si pasa de unos 30 (por ejemplo, 01c1 con la sección, crear, editar y el detalle, y 01c2 con "Actividades" y los hermanos de 03d). Otra opción, que el Arquitecto valore: conservar `seccion=actividades` y la clave de caché, y pedir los foros con un parámetro aparte (`&conForos=si`, como `conTipo=si`). Así casi todos los dobles y claves de esas 17 pruebas siguen valiendo y la lista cerrada se encoge. En cualquier caso, la Enmienda de arranque de 01c confirma la cifra.

## Problemas que no bloquean
- **N-01. El borrado definitivo de ADMIN-01 con un foro no tiene prueba.** Cuenta los foros entre "actividades", porque lee `tareas (clase_id, …)`, y sus participaciones entre "entregas". La cascada atraviesa `participaciones_foro` con su FK sobre sí misma. ADM-1B05 no crea un foro. 01b debe sumar un caso: una clase archivada con un foro con principal, réplica y calificación se borra con `204` y deja todo limpio. También la viñeta de PARADA de 01b debe revisar el conteo de `entregas`, no solo el de actividades.
- **N-02. `handlers/foros.ts` vive fuera de `handlers/tareas/`** para no tocar `temas-01a-r1.ataque:1007-1011`, y con eso pierde lo que esa prueba vigila: sin SQL, sin Prisma, sin `.rol`, sin comparaciones de rol y quién encola o cancela. FORO-1A51 debe copiar ese regex sin aflojarlo. Para no necesitar `.rol`, el handler pasa el objeto `perfil` completo a `publicarReplica`. Otra opción aceptable: ponerlo en `handlers/tareas/foros.ts`, con un C-n de esa prueba.
- **N-03. Conteos que cambian sin decirlo.**
  - `adapters/db/categorias.ts` cuenta `tareas` por categoría, con los foros incluidos, y su texto dice "«X» tiene N tareas. Muévelas…".
  - `TIPOS_CON_TEMA` con `foro` cambia el total de `GET …/temas` sin sección. DH-09 promete "la respuesta de hoy".
  - Hay que inventariarlos y decidir el texto ("actividades" o dejarlo), con la lista cerrada que corresponda.
- **N-04. Huecos en la matriz (§D-10) y en los textos.**
  - Faltan filas para la descarga de los adjuntos del planteamiento, "Mover" de un foro, la consulta de `mi-participacion` y la lista de devoluciones con su "Ver más" y su cursor.
  - No hay texto de cursor vencido para "Comentarios de la devolución" ni de recarga fallida para `ParticipanteView`.
  - Toda frase nueva que salga de aquí necesita su caso por camino.
- **N-05. "Participaciones" nombra dos cosas para el maestro:** el `h3` de `ForoView`, donde están las publicaciones, y el `h2` de `ParticipantesView`, la tabla para calificar. Así, "Vuelve a abrir Participaciones" es ambiguo. Propuesta para DH-12: "Participantes" o "Calificar participaciones" para la tabla.
- **N-06. Las réplicas no suben `entregas.version`.** El maestro puede publicar la calificación sin ver una réplica que llegó mientras calificaba, y el alumno sigue replicando después de calificado (S-06). Es aceptable, pero conviene que quede como suposición explícita en S-12.
- **N-07. FORO-1B01 no es determinista** ("o `403` antes, según la cadena de ADMIN"). Con §D-1 de ADMIN, una ruta cerrada responde `409 CLASE_ARCHIVADA` a toda relación que pasó la pertenencia y los roles. El caso debe fijar un solo resultado por rol.
- **N-08. La fusión de 01b dice "Cualquier otro conflicto: PARADA",** y `docs/ESTADO.md` se concilia al fusionar (`AGENTS.md`, "Trabajo en paralelo"). Hay que exceptuarlo con esa regla.
- **N-09. El paso 10 y la nota de la línea 807** piden `lint`, `test` y `build` "de shared, del backend y del frontend" sin decir que, en las rondas, son las suites de los módulos. La suite completa de cada paquete la corre el manager al cerrar (`AGENTS.md`, "Suites por ronda"). §D-R0 lo dice bien; hay que alinear los pasos.
- **N-10. Las Enmiendas de arranque (01b a 01e) son aceptables** como forma de cumplir la regla de la lista cerrada por grep: la base de esas subentregas no existe hasta que se fusione ADMIN-01, y el plan ya fija lo que se conoce en `e94ee59`. Con dos condiciones:
  - cada enmienda se verifica con `git diff --no-index` contra la copia guardada;
  - si "Se toca" crece fuera de lo previsto en §D-8 y en "Cambios por capa", o toca algo de "No se toca", se requiere la aprobación escrita del humano (carril sensible).

## Detalles menores
- Falta `lecturas-fx-r2.ataque.test.ts:1072-1108` como vigilada de 01a. Lee el cuerpo de `listarPublicaciones`, que 01a cambia. La comprobación inalcanzable que lanza no es una escritura, así que debería seguir en verde.
- FORO-1A14 es vago ("o la forma que ya usen"). Debe fijar una forma o mandar la verificación al resumen, como dice la misma viñeta.
- DEPLOY: el frontend del foro se despliega completo, después de 01e. Con 01c o 01d solos, la celda de un foro en el gradebook enlaza a la vista de una tarea (sin `conTipo`). Se suma a R-01.
- DH-07 (a) oculta la marca a los compañeros, pero todos ven la fecha de publicación y la fecha límite, así que la marca se deduce. Conviene decírselo al humano: es presentación, no confidencialidad.
- La lista de foros ordena en memoria (R-07). Tiene precedente (R-13 de ADMIN-01) y está acotada por clase. Se acepta.

## Respuesta a las verificaciones pedidas
1. **Cruce con ADMIN-01.** La tabla de §D-X y el "Se toca" de 01a cubren todos los archivos de 01a que aparecen en las listas de ADMIN-01: `shared/src/index.ts`, `schema.prisma`, `migrations/`, `adapters/db/index.ts`, `publicaciones.ts` (otro tramo) y las dos `*.ataque` de listas. No falta ninguno. `app.ts`, `core/*`, `adapters/db/{tareas,temas,entregas}.ts` y `shared/src/tareas.ts` no están en ninguna lista de ADMIN. Los cruces que el plan llama inevitables lo son. `publicaciones.ts` no puede esperar a 01b, porque sin ese cambio la lista del muro sin `tipo` responde `500` en cuanto exista un foro. Los demás son listas o barriles que enumeran todo. Es correcto que el middleware no se toque: en §D-1 de ADMIN-01, una ruta con `pertenencia` y sin `enClaseArchivada` responde `409 CLASE_ARCHIVADA` a todos en una archivada, y las 16 rutas del foro declaran `pertenencia`. 01a no depende de nada de ADMIN-01. El riesgo es el orden de fusión (M-02).
2. **Participación tardía.** No, la regla no está concentrada (M-01): calificar tiene su propia copia del cierre y el aviso del frontend la recalcula. El valor por omisión del plan le agrega dos cosas a lo que dijo el humano: la marca "con retraso" y el cierre en la fecha límite cuando el foro no acepta tardías. Las dos vienen de RN-08 y de ESSENTIALS, no del paréntesis del humano. "Sin penalización" ya se cumple en todo el sistema (RN-05). Ver "Para el humano".
3. **DH-01.** Revisé `adapters/db/{tareas,entregas,temas,publicaciones,categorias,archivos,referencias}.ts`. Todas las funciones que leen `tareas` o `entregas` por id quedan en §D-3.3:
   - `leerTareaCon`, `editarTarea`, `borrarTarea`, `existeLaTarea`, `leerMiEntregaCon`, `entregar`, `anularEntrega`, `comentarEnHiloPrivado`, `calificarEntrega`, `leerEntregaDeAlumnoCon`, `listarEntregasCon` y `listarHiloPrivadoCon`;
   - las dos búsquedas de archivo de entrega, por `existeLaTarea`.
   El muro filtra `TIPOS_DEL_MURO` al borrar y al comentar (`publicaciones.ts:324,352`). El plan detecta bien el defecto de hoy: con el id de otro tipo, `borrarTarea` confirma el descarte de archivos y después devuelve `false`. Gradebook, riesgo, "Mis calificaciones" y exportación no cambian de consulta. El efecto lateral sin inventariar es el conteo de categorías (N-03).
4. **Tamaño.** 01a (~30–31) es creíble. 01b (~12) es pequeña, pero su corte lo impone la fusión. 01c no es creíble (M-04). 01d y 01e son razonables a falta del grep.
5. **Reglas de plan.**
   - Bien: prefijo `FORO-`; lista cerrada de 01a por grep; `VALIDACION` fuera de contrato en los cinco formularios, con el campo de otro modo y la secuencia de rechazo seguido de validación local; frases de recuperación con un caso por camino; guardas con ref; autorización por endpoint con restringido y llaves exactas; cola y trabajos diferidos en la misma transacción (crear, editar, borrar, calificar; participar y replicar no encolan).
   - Por completar: la matriz (N-04).
   - Las Enmiendas de arranque se aceptan con las condiciones de N-10.
6. **Las 13 DH.** Todas son decisiones de producto o de proceso legítimas. No veo ninguna pregunta bloqueante escondida. Matices:
   - DH-01 y DH-10 son más confirmaciones que decisiones: ESSENTIALS ya prevé la primera y la regla del humano ya impone la segunda.
   - DH-13 cita "una subentrega final, separada", frase que no está en `aprobacion.md`. Si viene del encargo del orquestador, se anota ahí; si no, se quita.
   - Las recomendaciones son sanas, con los matices de DH-02, DH-05 y DH-07 de abajo.

## Desacuerdos arbitrados
Ninguno.

## Documentos a actualizar
- Al cierre, A-01 a A-10 como dice el plan. Con M-01, A-01 y A-02 deben nombrar también la regla de calificar a quien no participó (P-03 c′) en el foro.
- `aprobacion.md`: el orden de fusión (M-02), cuando el humano lo decida.

## Para el humano
- **DH-02 (participación tardía).** Dijiste "sin penalización; el maestro ve fecha y hora de cada participación". La opción (a) del plan cumple eso y agrega dos reglas que vienen del PRD (RN-08) y de ESSENTIALS:
  - una participación después de la fecha límite queda marcada "Con retraso" (el alumno ve "Con retraso" en su estado y el maestro ve la marca);
  - si el foro no acepta tardías, se cierra en la fecha límite.
  Si querías solo la fecha y hora, sin marca ni cierre, eso es la (b), más "el foro nunca cierra", y cambia ESSENTIALS y el PRD. La (b) del plan no aclara si conserva el cierre. "Sin penalización" ya es así en todo el sistema (RN-05).
- **DH-05 (moderación).** Con (a), lo inapropiado solo se quita borrando el foro entero, y con él todas las participaciones y calificaciones de la clase en ese foro. Para el piloto se acepta, pero es costoso. Conviene que quede con fecha de revisión.
- **DH-07.** Ocultar "Con retraso" a los compañeros es solo presentación: la fecha de publicación y la fecha límite son visibles para todos.
- **Orden de fusión (M-02).** ¿Confirmas que ningún commit de FORO-01 entra a `main` antes de ADMIN-01?
- **Commit de fusión de 01b.** El plan pide un commit de fusión antes del trabajo de 01b. Con él, la suite queda en rojo (ADM-1A09) hasta cerrar 01b. Es un commit intermedio, y `AGENTS.md` pide "un commit por subentrega, nada intermedio". Decide si lo aceptas así, o si la fusión se hace con `--no-commit` y entra en el commit de 01b.

---

## Verificación de la Enmienda 1 — FORO-01
Veredicto: CAMBIOS REQUERIDOS (uno solo y pequeño: M-05)
Verificación propia: `git diff --no-index` completo entre la copia previa (`plan-foro-01-v0.md`, SHA-256 `e5723d33…`, comprobado) y el plan actual (SHA-256 `fdfe0e3b6ba57623d7ffa5894cb9c35f002ba182bf4d03e44da94890a8bd51e8`, 182 466 bytes, comprobado): 255 inserciones y 79 borrados, como dice el orquestador. Además, contrasté con el código de `e94ee59`: `handlers/tareas/{tareas,temas}.ts`, `shared/src/{tareas,recursos}.ts`, `handlers/validacion.ts`, `core/calificaciones/calificar.ts`, `adapters/db/categorias.ts`, el esquema de `Tarea` y las dos pruebas que usan `trabajoQuerySchema`. Sin suites.

### M-01 a M-04: resueltos
- **M-01, resuelto.**
  - La regla tardía solo se lee en `reglaDeParticipacion`. `exigirEntregaCalificable` con `"foro"` decide el cierre con ella, y con `"tarea"` conserva su cuerpo de hoy, que es la regla de la tarea.
  - La interfaz recibe `participarConRetraso` y `replicarConRetraso` del servidor. FORO-1D04b prohíbe comparar fechas en los componentes del foro.
  - Lo que sigue mirando la fecha está declarado fuera de DH-02 con razón: la insignia de vencimiento (`vencimientoDe`), "Sin entregar" (`estadoDeEntregaVisible`) y el riesgo (RN-05).
  - Busqué copias en `core/`, `adapters/db/{entregas,calificaciones}.ts` y `frontend/src/{lib,components}`: no queda ninguna que DH-02 deba mover.
  - La parte (ii) de FORO-1A06 (equivalencia) es la protección buena. La parte (i) tiene un defecto (M-05).
- **M-02, resuelto.** La regla de orden está en el encabezado y en DH-13. La opción (b) dice quién absorbe el cruce.
- **M-03, resuelto.**
  - El índice `(principal_id, creado_en, id)` sirve a la lista de réplicas, al conteo (que ahora filtra también por `foroId`) y a la cascada de la FK sobre sí misma.
  - FORO-1A15 comprueba la definición y que el índice se puede usar (`enable_seqscan = off`).
  - Que `autor_id` no lleve índice es razonable: no hay bajas físicas.
- **M-04, resuelto.**
  - Los handlers de ADMIN-01 no cambian. `handlers/tareas/tareas.ts:229-235` destructura `seccion` de `validarParametros` y la pasa a `listarTrabajo`. `handlers/tareas/temas.ts:39-43` hace lo mismo con `listarTemasDeLaSeccion`. Con el `.transform`, solo se ensancha el tipo del parámetro de los adaptadores, que FORO sí toca.
  - `validarParametros` recibe `z.ZodType<T>` y no exige un `ZodObject`. El mapeo del handler de "trabajo" es genérico (`material`, `tarea`, `puedeMover` por `tipo === "material"`), así que un foro sale bien sin tocarlo.
  - Pérdida de `.shape`: el único uso en los tres paquetes es `shared/src/recursos.ts:22`. El `temaDeTrabajoSchema` exportado lo cubre, y `recursos.ts` no está en ninguna lista de ADMIN-01.
  - Las dos pruebas vigiladas siguen valiendo: `esquemas-tareas.test.ts:432-457` usa `.data` con `toMatchObject` y `.tema`, y `frontend/src/lib/errores-de-api.test.ts` tipa el esquema estructuralmente, con `safeParse`.
  - Conteos:
    - 01a (~32): sale exacta con el desglose (4 + 3 + 4 + 8 + 2 + 9 + 2), o 33 con `ayudas-foros.ts`. Es creíble.
    - 01b (~12): creíble; FORO-1B08 cabe en un archivo de prueba.
    - 01c (~28): el desglose de producción (16) y de pruebas nuevas (7) cuadra. Las 5 existentes quedan justas (N-12).
    - 01d (~29): creíble, con su regla de corte si la Enmienda de arranque encuentra más pruebas de URL completa.
    - 01e (~26): igual que antes.

### Problemas que bloquean
#### M-05 — FORO-1A06 (i) falla contra el diseño del propio plan
Dónde: "Pruebas requeridas", 01a, FORO-1A06 (i), primera y segunda viñeta; §D-2.1.
Por qué importa: la viñeta exige que `aceptaTardias` aparezca en `core/foros/participacion.ts` "solo dentro del cuerpo de `reglaDeParticipacion`". Pero §D-2.1 declara en ese mismo archivo `interface ForoParaParticipar { fechaLimite: Date; aceptaTardias: boolean }`, fuera de la función. Además, `adapters/db/foros.ts` no solo lo nombra en el `select`: también arma el objeto `foro` que pasa a `decidirParticipacionPrincipal`, `decidirReplica` y `accionesDelForo`. Tal como está escrita, la prueba falla contra el diseño, o el programador tendría que aflojarla. Cualquiera de las dos cosas es una PARADA en 01a.
Qué se espera: que la viñeta admita la declaración de `ForoParaParticipar` y nombre todas las apariciones permitidas en `adapters/db/foros.ts`: el `select` y el armado de `{ fechaLimite, aceptaTardias }` que se pasa a `core/`. Lo que debe prohibir son las comparaciones (`esTarde(`, `entregaCerrada(`, `getTime(`, `<`/`>` con `fechaLimite`), no la palabra.

### Problemas que no bloquean
- **N-11. DH-14 (a): condiciones de la copia B.** La fusión en curso vive en el directorio de git de la copia B (`MERGE_HEAD` es por worktree) y no afecta a la copia principal. Las condiciones del plan son correctas pero se quedan cortas. Hay que sumar:
  - Prohibir también `git restore`, `git checkout -- <ruta>` y `git clean`, además de `merge --abort`, `stash`, `checkout` de rama y `reset`. Un `restore` o un `checkout -- <ruta>` devuelve el archivo a la versión de `K1a` y descarta en silencio lo que trajo ADMIN-01.
  - Una segunda comprobación, porque `git diff MERGE_HEAD --stat` no detecta esa pérdida en un archivo que ya está en el "Se toca" de 01a (por ejemplo, `shared/src/index.ts` o `schema.prisma`). Debe hacerse `git diff HEAD --stat` (contra `K1a`) y comprobar que solo muestra archivos que cambió `main` desde la base de la fusión (`git diff --name-only HEAD...MERGE_HEAD`) o del "Se toca" de 01b. En los seis archivos de cruce, el manager revisa la resolución hunk por hunk.
  - Poner en la regla que ningún agente hace `git commit` ni `git merge --continue` mientras dura 01b. El commit lo hace el humano.
  - Con eso, (a) es segura. Mientras dure 01b, el trabajo sin commit es la fusión completa más unos 12 archivos. 01b es corta, así que el riesgo se acepta. Si el humano prefiere no tener ese estado abierto, (b) es la alternativa.
- **N-12. A 01c le falta la misma regla de corte que 01d.** En su recuento entraron 5 pruebas existentes. Los hermanos T-01 a T-05 cambian comportamiento de `features/tareas`, y puede haber pruebas que fijan el de hoy. Las vistas nuevas pueden tocar el conteo de `perspectivaDeRuta(` de `estatico-02c-r1.ataque:123-133`. Si la Enmienda de arranque de 01c pasa de unos 30, que se parta como 01d.
- **N-13. Dos cambios fuera de la tabla de cambios (son inocuos, pero la tabla debe nombrarlos):**
  - el paso 17 invierte el orden: los hermanos T-01 a T-05 pasan antes que `tipo` en `FormularioTarea`;
  - "Puntos de ataque", punto 7: `conForos` repetido, con otros valores o sin sección.
  - Los dos son coherentes con E1-4, pero ninguna fila los menciona.
- **N-14. "Preguntas bloqueantes" sigue diciendo "esas cinco"**, y la lista ahora tiene seis (DH-01, DH-02 (c), DH-04, DH-05, DH-06, DH-09). DH-02 (c) no cambia rutas ni tablas: cambia el formulario y el PRD. La frase debe decir lo que cambia cada una.

### Mapeo de los hunks
Cada hunk del diff corresponde a una fila de la tabla:
- E1-1: resumen, DH-02, §D-2.1, §D-2.2, §D-2.4, §D-2.5, §D-3.2, §D-8.4, `core/`, FORO-1A06, FORO-1A33, FORO-1D04, FORO-1D04b, R-11.
- E1-2: encabezado, DH-13, R-10, A-11, paso 11.
- E1-3: índices, §D-3.4, "Acceso a datos", FORO-1A15.
- E1-4 y E1-9: §D-0.2, §D-X, §D-3.1, §D-3.3, §D-6, `categorias.ts`, `shared/`, frontend, FORO-1A25, FORO-1A26b, FORO-1C15 y FORO-1C25 trasladados, FORO-1D29 a FORO-1D31, §D-R0 01a y 01c a 01e, pasos 17 y 18.
- E1-10: "Participantes".
- E1-11: matriz, textos, FORO-1C37, FORO-1D32, FORO-1D33, FORO-1E27 a FORO-1E35.
- E1-12: DH-10 y el desacuerdo retirado.
- E1-13: DH-14, §D-R0 01b, R-09.
- E1-14 a E1-26: una fila por cambio.
Las excepciones son las dos de N-13. Los números E1-5 a E1-8 están vacíos, como se declara. No hay escapes `\uXXXX` ni texto fuera de lo que describe la tabla.

### Las DH reescritas o nuevas
- **DH-02:** dice lo que pidió la revisión. Separa lo que dijo el humano (sin penalización; el maestro ve fecha y hora) de lo que viene de RN-08 y de ESSENTIALS (la marca y el cierre). Distingue (b) "sin marca, con cierre" de (c) "sin marca ni cierre". §D-2.5 lista, opción por opción, código, textos y documentos. La consecuencia de (c) que el humano debe ver está bien dicha: el maestro nunca podrá calificar a quien no participó, y ese alumno contará para siempre como vencido sin entregar (R-11).
- **DH-05:** el costo está explícito y la revisión queda con destino (DEPLOY). Bien.
- **DH-07:** "presentación, no confidencialidad". Bien.
- **DH-09:** `conForos=si`, con la excepción declarada del total de temas sin sección. Bien.
- **DH-10:** cita lo literal de `aprobacion.md`. Bien.
- **DH-12:** "Participantes" y "actividades" en el editor de categorías. Bien. El editor dirá "actividades" en todas las clases, también en las que no tienen foros. Es coherente con el vocabulario del PRD ("actividad"), pero el humano lo verá en pantalla.
- **DH-13:** bien.
- **DH-14:** bien, con las condiciones de N-11.

### Para el humano
- **DH-02:** de acuerdo con la recomendación. Si eliges (c), ten presente R-11.
- **DH-14:** de acuerdo con (a), siempre que se sumen las condiciones de N-11. Si prefieres no tener una fusión abierta durante toda la subentrega, elige (b): es un commit intermedio, pero queda visible en el historial.

---

## Verificación de la Enmienda 2 — FORO-01
Veredicto final del plan: APROBADO
Verificación propia: comparé con `git diff --no-index` completo la copia previa (`plan-foro-01-e1.md`, SHA-256 `fdfe0e3b…`) con el plan actual (SHA-256 `f112642bdd6f1b7f7b120edf0bf77bbdc09859dc6af89ba4a1359b70c8724331`, 188 064 bytes). Los dos hashes están comprobados y el diff da 51 inserciones y 9 borrados. No corrí suites.

### M-05: resuelto
- FORO-1A06 (i) ya prohíbe las decisiones con la fecha, no la palabra. Cuentan como decisión `esTarde(`, `entregaCerrada(`, `getTime(`, `Date.now(` y cualquier comparación `<`, `<=`, `>` o `>=` con `fechaLimite`, `fecha_limite` o `ahora` a un lado. Fuera de `reglaDeParticipacion`, ninguna puede aparecer en `participacion.ts`, `adapters/db/foros.ts`, `adapters/db/actividades.ts` ni `handlers/foros.ts`.
- La prueba admite lo que el diseño necesita, cada caso por su nombre:
  - la interfaz `ForoParaParticipar` y el reenvío de parámetros;
  - en `foros.ts`, el `select` y el armado de `{ fechaLimite, aceptaTardias }`;
  - en `handlers/foros.ts`, el mapeo `toISOString()`, el paso de los campos del formulario, `momentoDelRecordatorio` y `validarFechaLimite`. Las dos últimas son la regla del recordatorio y la de la fecha, no la tardía.
- Ninguna de esas excepciones compara fechas, así que no abren un hueco.
- En los archivos que (i) no recorre, las copias de la regla quedan cubiertas por otras pruebas:
  - `core/calificaciones/` (la rama `"foro"` de `exigirEntregaCalificable`): la parte (ii), de equivalencia, y la llamada obligatoria a `reglaDeParticipacion(`;
  - el frontend: FORO-1D04b.

### Hunks
Cada hunk corresponde a una fila de la tabla:
- E2-1: FORO-1A06 (i).
- E2-2: las condiciones de DH-14 y el bloque "Con DH-14 (a)…" de §D-R0 01b.
- E2-3: la regla de corte de 01c en §D-0.2.
- E2-4: "Preguntas bloqueantes".
- E2-5: las filas E1-27 y E1-28.

Además está la nota de encabezado de la Enmienda 2, igual que la de la Enmienda 1, y la tabla misma. Ninguna DH cambió de opciones ni de recomendación: en DH-14 solo se suman las condiciones de N-11.

N-11 a N-14 quedan atendidos.

### Detalles menores (no bloquean; se pueden corregir al aplicar la primera Enmienda de arranque o al cierre)
- **La fila de DH-14 rompe la tabla de las DH.** La celda de la recomendación tiene viñetas en líneas nuevas, y una tabla de markdown no admite saltos de línea dentro de una fila. Al mostrarse, la fila queda cortada y las condiciones salen fuera de la tabla. El contenido es correcto. Conviene pasarlo a una sola línea, con `;` o `<br>`, porque el humano aprueba leyendo esa tabla.
- **La segunda comprobación de §D-R0 01b no exceptúa los documentos.** `git diff HEAD --stat` debe admitir también `docs/trabajo/FORO-01-…` y `docs/ESTADO.md`, como ya los admite la primera. Si no, el resumen y la revisión de 01b dan una falsa alarma.

### Para el humano
- El plan queda listo para tu aprobación por escrito (carril sensible).
- Al aprobar, responde las 14 DH. Coincido con todas las recomendaciones, con los matices que ya anoté:
  - DH-02 (c): R-11.
  - DH-12: "actividades" en todas las clases.
  - DH-14 (a): con sus condiciones.
- Confirma DH-13: ningún commit de FORO-01 entra a `main` antes de que ADMIN-01 se fusione.

---

## Verificación de las Enmiendas 3 y 4 — FORO-01
Veredicto: CAMBIOS REQUERIDOS (uno solo y acotado: M-06, en el diseño de 01a2; 01a1 puede arrancar ya)
Verificación propia:
- Comparé con `git diff --no-index` completo la copia aprobada `plan-foro-01-e2.md` (SHA-256 `f112642b…`, comprobado) contra el plan actual (SHA-256 `f7e0d50084f5263aa545d077220099b03c095e44ae67a71c71bc89cd8dfa311f`, 216 653 bytes, comprobado): 263 inserciones y 50 borrados, como dice el orquestador. El hash de `plan-foro-01-e3.md` (`6d2409dc…`) también coincide.
- Contrasté el diff con la "Aprobación corregida por el humano" y con "Enmienda 3 y respuestas del humano" de `aprobacion.md`, y con el código de `e94ee59`: `core/autoria.ts:12-19`, `adapters/db/errores.ts:47-57` y `adapters/db/entregas.ts:361-372` (`bloquearEntrega`). También con el plan de ADMIN-01 (sus listas y §D-4, "Sin cambio en `errores.ts`").
- Sin suites.

### Problema que bloquea
#### M-06 — Dos borrados simultáneos de la misma principal terminan en `500`, no en `404`
Dónde: §D-11, "La transacción", pasos 3, 5 y 6; FORO-1A61 (`asignado` → `ERROR_INTERNO`, "inalcanzable"); FORO-1A67 (espera "un `204` y un `404`").
Por qué importa: la secuencia es esta.
1. A y B leen la principal en el paso 3, sin bloqueo, y la encuentran.
2. A toma la fila de la entrega (paso 5), la devuelve a `asignado` (PB-2 a), borra la principal y confirma.
3. B estaba esperando esa fila. En READ COMMITTED, `bloquearEntrega` le devuelve la versión ya confirmada, `estado = asignado`.
4. B llama a `efectoDeBorrarPrincipal({ estado: "asignado" })`, que según FORO-1A61 lanza `ERROR_INTERNO`. Responde `500` antes de llegar al paso 6, que era el que daba el `404`.

Así que el caso no es inalcanzable: es justo el doble clic del admin que FORO-1A67 prueba. Habría al menos una ronda del tester por algo que se ve desde el plan. Es la clase de error que AGENTS.md pide resolver en el diseño (una consulta que decide con un dato leído antes de tomar el bloqueo).
Qué se espera: que el borrado de una principal decida con lo que hay **después** de tomar la fila de la entrega. Por ejemplo, volver a leer la participación tras `bloquearEntrega` y responder `404 PARTICIPACION_NO_ENCONTRADA` si ya no está. Que FORO-1A61 deje de llamar inalcanzable a `asignado` (o que el plan diga qué devuelve en ese caso) y que FORO-1A67 incluya el doble borrado de una **principal sin calificación**, no solo de una réplica. Las réplicas no tienen este problema: no tocan `entregas` y su `deleteMany` con `count === 0` ya da `404`.

### Lo que pediste revisar
1. **DH-05**
   - **Coincide con la letra del humano más PB-1 (a) y PB-2 (a), sin permisos ni efectos de más:**
     - solo el admin borra (ruta 17 con `roles: ["admin"]`); nadie edita; el alumno no borra lo suyo;
     - la cascada de réplicas;
     - la calificación se conserva;
     - sin calificación, la entrega vuelve a "sin participar".
   - `puedeBorrarParticipacion` es una función nueva en `core/autoria.ts`, y no `puedeBorrar`, porque la regla general dejaría al alumno borrar lo suyo (`autoria.ts:17`), justo lo que el humano excluyó. Así se cumple su frase completa. `puedeBorrar` en las listas es un dato para la interfaz, no un permiso.
   - S-E3-1 (la archivada queda cerrada también para el admin) y S-E3-2 (borrar no avisa ni deja registro de quién borró) las aceptó el humano.
   - **Efecto implícito que el humano debe conocer:** con la principal calificada, la entrega conserva `fecha_entrega`, así que el alumno ya no puede volver a publicar (FORO-1A65, `PARTICIPACION_YA_PUBLICADA`). Se sigue de "la calificación se conserva" y coincide con S-06, pero el humano no lo dijo.
   - **Autorización:** la ruta 17 entra en la cadena con `protegido({ roles: ["admin"], pertenencia: "propiedad" })`, como las demás rutas del admin. `middleware/` no se toca. El orden de la cadena da `ACCESO_RESTRINGIDO` al restringido antes del `403` del rol, como espera FORO-1A62.
   - **Transacción y bloqueos (`tareas` → `entregas` → `participaciones_foro`):**
     - es compatible con calificar (`tareas` `FOR SHARE` → `entregas`), con publicar (`tareas` `FOR KEY SHARE` → `entregas`) y con replicar (`tareas` `FOR KEY SHARE` y después el `FOR KEY SHARE` de la FK sobre la principal);
     - no hay ciclo: replicar no toca `entregas` y calificar no toca `participaciones_foro`;
     - el `DELETE` de la principal espera a la réplica en vuelo, o la réplica falla por FK. Lo analicé con `bloquearEntrega` de `e94ee59`: en las dos órdenes el plan está bien, salvo M-06.
   - **`P2003` → `404`:** `alFaltarReferencia` es opcional en `traducirErrorPrisma` (`errores.ts:47-57`). Sin la opción el error se relanza como hoy, y las seis llamadas existentes no la pasan. `errores.ts` está en el "Se toca" de 01a2 y su prueba en la lista cerrada. No está en ninguna lista de ADMIN-01: su §D-4 dice explícitamente "Sin cambio en `errores.ts`". Sin cruce.
   - **El cruce nuevo con `lecturas-fx-r2.ataque:967`** (C-3 de FORO en 01a2; C-4 de ADMIN-01 en 01b) es inevitable, porque la prueba enumera todos los borrados de `backend/src`. Está en §D-X y en las reglas de la fusión de 01b (unión ordenada, la resuelve el tester).
2. **Partición 01a1 / 01a2**
   - **01a1 es exactamente lo aprobado.** El diff solo le cambia el nombre, los pasos 4 y 5 (la PARADA con el SQL que pidió el humano) y la nota sobre los C-1 y C-2 de la ronda 0 detenida. No cambia ni el "Se toca", ni la lista cerrada, ni las vigiladas, ni las pruebas.
   - **01a2 (~14) es creíble:** 7 de producción (`shared/src/foros.ts`, `core/autoria.ts`, `core/foros/participacion.ts`, `adapters/db/{foros,errores,index}.ts`, `handlers/foros.ts`), 2 pruebas nuevas, 3 normales de la lista cerrada y 2 `*.ataque` (C-1 bis y C-3).
   - Su §D-R0 tiene base `<K1a1>`, lista cerrada por grep (las llamadas a `traducirErrorPrisma`), C-n y vigiladas.
   - Toca `shared/`, así que al cerrar se corren las dos suites completas.
3. **DH-14 (b)**
   - El commit de fusión lo hace el humano y puede quedar en rojo. La base de 01b es `<KF>` y la verificación de la subentrega es `git diff <KF>`. Bien.
   - Las prohibiciones de git valen solo mientras dura la resolución. Bien.
   - **Quién resuelve los conflictos** (programador para producción y pruebas normales, tester para las `*.ataque`) es una recomendación del arquitecto: el humano solo dijo "hecho por mí". El orquestador debe confirmarlo con él al llegar a 01b, o desde ahora.
   - **Verificación de `<KF>` contra los dos padres** (punto 6):
     - Las dos comprobaciones `--stat` / `--name-only` son correctas, pero no detectan que en un archivo de cruce se haya perdido lo de ADMIN-01: el archivo quedaría igual a `<K1a2>` y está en el "Se toca" de FORO.
     - En el camino recomendado lo cubre la revisión hunk por hunk del punto 5. En la alternativa (el humano resuelve solo), el punto 6 es la única revisión y no la incluye.
     - Ver N-15.
4. **Hunks:** cada uno corresponde a una fila E3-n o E4-n:
   - E3-1, PB-1 y PB-2;
   - E3-2, la partición, el resumen 3, §D-0.2, §D-R0 01a1 y el encabezado de los pasos;
   - E3-3, DH-05, §D-11, la ruta 17, "Autorización", "Alcance", las filas de §D-X, FORO-1A60 a FORO-1A70, FORO-1B01, FORO-1B04, FORO-1D35 a FORO-1D38, la matriz, el punto 10 de ataque, R-06, §D-R0 01a2, los pasos 10a a 10f, A-03 y las menciones de "17 rutas";
   - E3-4, DH-14, §D-R0 01b, el paso 11 y R-09;
   - E3-5, los pasos 4 y 5;
   - E3-6, la fila de DH-14 y las excepciones de `docs/`;
   - E3-7, A-01 y A-08;
   - E4-1, el estado, el encabezado, "Preguntas bloqueantes", el resumen 5, DH-05, S-E3-1, S-E3-2, "Arranca" y 10a;
   - E4-2, A-08.

   Fuera de la tabla no hay cambios. Mis dos detalles de la Enmienda 2 quedan atendidos (E3-6): la fila de DH-14 ya está en un párrafo por celda y la comprobación exceptúa `docs/`.

### Problemas que no bloquean
- **N-15. Punto 6 de §D-R0 01b:** que la verificación de `<KF>` incluya siempre la revisión de la resolución en los siete archivos de cruce, no solo en el camino recomendado. Por ejemplo, `git show --remerge-diff <KF> -- <archivos de cruce>`, o `git diff <KF>^2 <KF> -- <archivo>` y `git diff <KF>^1 <KF> -- <archivo>` por archivo. Así, la alternativa en la que el humano resuelve solo tiene la misma red. También hay que aclarar que las pruebas nuevas de 01a1 y 01a2 cuentan como permitidas en `git diff <KF>^2 <KF> --stat`, como dice la regla general de §D-R0.
- **N-16. Textos que quedaron viejos tras E4-1:**
  - "Alcance": "Que los maestros borren depende de PB-1";
  - la viñeta "Alumno restringido … en las 16 rutas" de "Autorización", que ya son 17;
  - las ramas "con PB-1 (b) o (c)" de §D-11, de la fila 17 de "Autorización" y de FORO-1A60.

  No cambian nada del diseño, pero deben decir que PB-1 está resuelta en (a). Se corrigen junto con M-06.

### Para el humano
- **DH-05:** el plan hace lo que escribiste, más tus dos respuestas. Una consecuencia que no dijiste, pero que se sigue de "la calificación se conserva": si borras la participación de un alumno ya calificado, ese alumno no puede volver a publicar en ese foro. Si quieres otra cosa, dilo antes de 01a2.
- **DH-14 (b):** cuando llegue la fusión, hay que decidir quién resuelve los conflictos. La recomendación del plan es que el programador y el tester los resuelvan con reglas fijas, que yo revise, y que tú hagas el commit. La alternativa es que los resuelvas tú solo.

---

## Verificación de la Enmienda 5 — FORO-01
Veredicto: APROBADO
Verificación propia:
- Comparé con `git diff --no-index` completo `plan-foro-01-e4.md` (SHA-256 `f7e0d500…`, comprobado) con el plan actual (SHA-256 `1b7daae3a6da9db255a675c32eeb21d5d9e791d17e315a76fc404b93fa26f44e`, 224 247 bytes, comprobado). Salen 61 inserciones y 24 borrados, en 22 hunks (`-U0`).
- Contrasté las respuestas del humano con `aprobacion.md` ("Verificación de las Enmiendas 3 y 4", respuestas del cuestionario).
- No corrí suites: la ronda 0 de 01a1 corre ahora.

### 01a1 no cambió
Ningún hunk cae en las secciones de 01a1: §D-0 a §D-10 en lo que es de 01a1, la fila 01a1 de §D-0.2, "Pruebas requeridas" FORO-1A01 a FORO-1A53, §D-R0 01a1 y los pasos 1 a 10. Las menciones de "16 rutas" en el texto de 01a1 (FORO-1A47, FORO-1A49, C-1 y "Cambios por capa") siguen como estaban, y está bien: son las de 01a1. El único texto común que cambia es la viñeta "Alumno restringido" de "Autorización". Ahora dice "las 17 rutas (las 16 de 01a1 y la 17 de 01a2)", y para 01a1 no cambia nada. La ronda 0 de 01a1 sigue válida.

### M-06: resuelto, con sus estados vecinos
- **El arreglo.** El paso 5 vuelve a leer la principal (`id`, `foroId`, `principalId: null`) después de `bloquearEntrega`. En READ COMMITTED esa sentencia ve lo que confirmó quien tenía la fila. Si la principal ya no está, lanza `404` sin escribir nada.
  - Dos borrados de la misma principal dan `204` y `404`, y la `version` sube una sola vez.
  - `asignado` en `efectoDeBorrarPrincipal` queda de verdad inalcanzable, con la razón escrita en FORO-1A61.
- **Estados vecinos, revisados uno por uno contra el código:**
  - Dos borrados de una principal calificada: el segundo relee y da `404`.
  - Dos borrados de una réplica: el `deleteMany` espera la fila y da `count === 0`, así que `404`.
  - Una principal y una de sus réplicas a la vez: la cascada y el paso 6 dan `404` a la réplica.
  - Borrar contra calificar: los dos deciden con la entrega bloqueada.
  - Borrar contra volver a publicar: hay que repasar dos órdenes.
    - Si el borrado del id viejo toma la fila de la entrega antes que la principal nueva, relee, no encuentra la vieja y da `404`.
    - Si la principal nueva va antes, la relectura también da `404` y no toca la principal nueva, porque el `deleteMany` es por id.
  - Réplica en vuelo: la FK la pone en serie y el `P2003` da `404`.
  - Borrar contra borrar el foro: el paso 1 los pone en serie.
- **Pruebas.** FORO-1A67 forma el segundo borrado detrás de la fila con `formadasDetrasDe`, como pide `AGENTS.md` (CHORE-02), en los cuatro casos más el de volver a publicar.

### N-15 y N-16
- **N-15, resuelto.** El punto 6 incluye siempre `git show --remerge-diff` de los siete archivos de cruce, con el diff por padre como respaldo si la versión de Git no lo admite. Admite las pruebas y ayudas nuevas de 01a1 y 01a2.
- **N-16, resuelto.** Salieron "depende de PB-1", las ramas "PB-1 (b) o (c)" de la ruta 17, de §D-11, de "Autorización" y de FORO-1A60, y el "16 rutas" de la viñeta del restringido. Lo que queda con "(b) o (c)" es de DH-04 o es el historial de PB-1, y está bien.

### Decisiones del humano
- **DH-05 (E5-4):** "conserva la calificación, no vuelve a publicar su principal y puede seguir replicando". Coincide con lo que respondió. FORO-1A65 suma la réplica (`201`).
- **DH-14 (E5-5):** el programador resuelve producción y pruebas normales, el tester las `*.ataque`, el manager revisa los siete archivos de cruce y el humano hace el commit. Coincide con lo que respondió. La alternativa queda tachada como historial.

### Hunks
Cada hunk corresponde a una fila de la tabla:
- E5-1: §D-11, pasos 5 y 6, "Concurrencia" y "Estados vecinos"; FORO-1A61; FORO-1A67.
- E5-2: §D-R0 01b, punto 6.
- E5-3: "Alcance", la ruta 17 de §D-3.1, la regla, el comentario, la firma y `protegido` de §D-11, la fila 17 y la viñeta del restringido en "Autorización", y FORO-1A60.
- E5-4: DH-05, la regla de §D-11 y FORO-1A65.
- E5-5: DH-14 y el punto 3 de §D-R0 01b.

Además están la nota de encabezado de la Enmienda 5 y su tabla. No hay cambios fuera de la tabla.

### Detalle menor (no bloquea)
- El encabezado del punto 6 de §D-R0 01b todavía dice "con la alternativa del punto 3, es la única revisión", y esa alternativa ya es historial. No cambia nada, porque la revisión con `--remerge-diff` va "siempre". Se puede limpiar en la Enmienda de arranque de 01b.

### Estado del plan
El plan queda APROBADO para 01a1 (en curso) y 01a2. 01b a 01e siguen sujetas a su Enmienda de arranque, con las condiciones de E1-23.

---

## Verificación de la Enmienda 6 — FORO-01
Veredicto: APROBADO
Verificación propia:
- `git diff --no-index` completo entre `plan-foro-01-e5.md` (SHA-256 `1b7daae3…`, comprobado) y el plan actual (SHA-256 `6398b144362db926c80ea2efdd844dcd66bafa4712330b7c665317ee4d9467d2`, comprobado): 45 inserciones y 1 borrado.
- Leí `frontend/src/lib/errores-ch3-r2.ataque.test.ts:197-276`: la expresión `prefijados`, el `INVENTARIO` y los dos casos.
- Hice mi propio grep:
  - de los literales `"<nombre>: …"` que el plan manda escribir;
  - de los que ya hay en `shared/src`;
  - de las pruebas del frontend y del backend que leen `shared/src` o importan los esquemas que cambian.
- Revisé que ADMIN-01 no choque: su `plan.md` (línea 943) y su árbol de trabajo actual (`git diff shared/src/clases.ts` en la copia principal).
- Sin suites.

### Opción (a): sana y con precedente
- La prueba no prohíbe prefijos. Exige dos cosas: que cada nombre esté inventariado y que `quitarRutaDelMensaje` no se coma texto legítimo (que nada después del prefijo sea otro nombre en camelCase).
- Los tres nombres nuevos siguen la convención de todos los parámetros de `shared/src` (`tareaId`, `temaId`, `publicacionId`, `seccion`, `confirmar`…). Quitarles el prefijo (opción b) dejaría a los mensajes del foro como los únicos distintos y rompería la regla de la ruta doble que el backend y `lib/errores-de-api.ts` tratan igual para todos.
- Es exactamente lo que hicieron el Arbitraje 2 de CLASES-03a (`tipo`, `bloque`, `recursoId`, `seccion`) y C-26 de CLASES-03b (`dudaId`, `respuestaId`, `resuelta`), que están comentados en el propio `INVENTARIO`.
- La comprobación de legibilidad de C-6 y C-7 es la correcta: la ruta doble deja `"no es válido"` o `"debe ser un identificador válido"`, y ningún resto empieza con un nombre en camelCase.

### Hermanos: completos
- **Literales con prefijo que manda escribir el plan.** Mi grep en el plan da exactamente:
  - `foroId`, `participacionId` y `conForos` (01a1);
  - `conTipo` (01b);
  - `alumnoId` y `tema`, que ya están en `INVENTARIO`.

  Los mensajes de cuerpo del foro no llevan prefijo. Puntos, versión, rúbrica y adjuntos reusan las constantes de la tarea (`MENSAJE_PUNTOS`, `MENSAJE_VERSION`, `criterioEntradaSchema`, `archivoIdsSchema`), sin literal nuevo. `"cursor: no es válido"` vive en `adapters/` (backend), donde el caso solo mira el resto, y el resto no es un nombre. Coincide con E6-2.
- **El frontend lee `shared/src` en un solo lugar:** `errores-ch3-r2.ataque.test.ts`, cubierta por C-6.
  - Los que importan en ejecución los esquemas que cambian son `features/clases/hooks.ts` (parsea con `listaTrabajoRespuestaSchema`) y `lib/errores-de-api.test.ts` (ya vigilada). Ensanchar el enum no los rompe.
  - Los tres `*.ataque` de `features/clases` (`trabajo-01e-r1`, `trabajo-01e-r2`, `ver-mas-01e-r3`) solo nombran `elementoDeTrabajoSchema` en un comentario.
- **El backend lee `shared/src` en siete pruebas.** E6-3 nombra cinco. De las dos que faltan:
  - `nombres-ids-01a-r2.ataque` solo importa funciones (`claveDeNombre`, `normalizarTerminoDeBusqueda`) y no le afecta.
  - `calificaciones-lecturas-estatico.test.ts:90-108` (CAL-1B08) exige `export const columnaDelGradebookSchema = z.strictObject(` y lo mismo para `tareaDeMisCalificacionesSchema`. No toca 01a1, pero sí 01b, donde esos dos esquemas ganan `tipo` (ver el detalle de abajo).
  - Las once pruebas del backend que parsean con `listaTrabajoRespuestaSchema` aceptan el enum ensanchado.
- **ADMIN-01** tiene esta prueba vigilada ("ningún literal nuevo") y su `shared/src/clases.ts` en curso no agrega ningún literal con prefijo. Un choque en la fusión es improbable.

### 01a1
Lo que E6 le cambia:
- C-6, que es un C-n del tester en la ronda 0;
- la nota "Frontend" con sus vigiladas;
- la lista cerrada de literales de §D-3.2.

La lista de §D-3.2 no es diseño nuevo. Pone por escrito los mensajes que el plan ya fijaba y suma una PARADA si aparece otro. No cambian ni el "Se toca" de producción, ni la lista cerrada de pruebas normales, ni los pasos, ni las pruebas requeridas. El frontend sigue sin cambios de producción. Con nombres de más en `INVENTARIO`, la prueba queda en verde antes y después del programador. La ronda 0 sigue válida.

### Hunks
Cada hunk corresponde a una fila E6-n:
- la nota de encabezado de la Enmienda 6;
- §D-3.2 (E6-2);
- C-6 en §D-R0 01a1 (E6-1);
- la nota "Frontend" y sus vigiladas (E6-1 y E6-3);
- la vigilada de 01a2 (E6-3);
- C-7 en §D-R0 01b (E6-1);
- la tabla.

No hay cambios fuera de la tabla. El único borrado es la línea "Frontend", que se reescribe.

### Detalles menores (no bloquean; para la Enmienda de arranque de 01b)
- **CAL-1B08 en 01b.** `calificaciones-lecturas-estatico.test.ts:90-108` exige que `columnaDelGradebookSchema` y `tareaDeMisCalificacionesSchema` sigan declarados como `z.strictObject(`. El `tipo` opcional de §D-6 debe sumarse dentro de esa declaración, no con `.extend` sobre otra base. Si no, la prueba cambia y es PARADA. Hay que nombrarla en las vigiladas de 01b.
- **Regla de la fusión.** C-7 dice que, si la fusión trae `errores-ch3-r2.ataque` con cambios de ADMIN-01, el tester une el `INVENTARIO` "con la regla de las `*.ataque` de §D-R0 01b, punto 4". Pero el punto 4 nombra archivos concretos y trata cualquier otro conflicto como PARADA. Conviene sumar ese archivo al punto 4, o dejar escrito que su conflicto es PARADA. Hoy el resultado sería una PARADA, que es lo seguro.
