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

## Verificación de la Enmienda 7 (rearranque) — FORO-01 (2026-11-14)
Veredicto: **CAMBIOS REQUERIDOS**
Verificación propia: lint, test y build **no corridos** (modo plan; solo `git`, `grep` y lectura; no corrí ningún archivo de prueba). `plan.md`: 2283 líneas, SHA-256 `18b4f5cf32b2fa4b46c0066ecf82e4353f0bc5b12ab1d84e78632d3ac056200e` (coincide). Copia `plan-foro-01-antes-e7.md`: SHA-256 `6398b144…` (coincide). `git diff --no-index --shortstat`: 683 inserciones y 27 eliminaciones (coincide). `backend/`, `frontend/` y `shared/` idénticos a `fd4a7ad` (`git diff --stat fd4a7ad` vacío en los tres).

El rearranque está bien planteado: nada de lo que el humano aprobó cambió sin decirlo, lo que queda "sin objeto" de verdad lo está, y el backend está bien reanclado salvo un punto de compilación. Bloquean dos cosas: el valor `foro` del enum rompe la compilación en archivos que 01a no puede tocar (M-07), y el inventario de 01c2 deja fuera al menos siete pruebas que la sección "Foro" pone en rojo, así que su conteo (y con él la partición del frontend de DH-15) no es creíble (M-08).

### Problemas que bloquean

#### M-07 — El valor `foro` del enum rompe la compilación del backend en archivos fuera de "Se toca"
Dónde: plan §E7.2, fila de `duplicado-de-clase.ts` (línea 96); §E7.5.0, "No se toca" (línea 255: `core/clases/*` y `adapters/db/duplicado-de-clase.ts`); §E7.5.1, "Se toca" (línea 280: `publicaciones.ts` "solo `listarPublicaciones`"). Código: `backend/src/core/clases/duplicado.ts:8` (`TipoDePublicacionOriginal = "anuncio" | "material" | "tarea"`) y `:43` (`RecursoOriginal.tipo`); `backend/src/adapters/db/duplicado-de-clase.ts:90-107` (selecciona `tipo: true` de `publicacion`) y `:134-137` (lo pasa a `planDeDuplicado`); `backend/src/adapters/db/publicaciones.ts:29-31` (`PublicacionDb.tipo`), `:90-97` (`SELECT_PUBLICACION` con `tipo`) y `:140-171` (`crearPublicacion` devuelve `Promise<PublicacionDb>` con `...creada`).
Por qué importa: Prisma no estrecha el tipo por el `where`: `tipo` llega como `$Enums.TipoPublicacion` (`generated/models/Publicacion.ts:222`), que con el paso 4 de 01a pasa a incluir `"foro"`. Desde ese `prisma generate`, `tsc` falla en `duplicado-de-clase.ts` (asigna a `TipoDePublicacionOriginal`) y en `crearPublicacion` (asigna a `PublicacionDb.tipo`). Los dos primeros archivos son ADMIN-01 y están en "No se toca"; `crearPublicacion` queda fuera del "solo `listarPublicaciones`". El remedio de la línea 1063 ("si hace falta para el compilador, se estrecha con una comprobación inalcanzable") solo nombra `listarPublicaciones`. Es una PARADA segura en el paso 4 o 5 de 01a, con `lint` y `build` en rojo, y el remedio exige crecer "Se toca" en carril sensible (§E7.5.0, E1-23). El reanclaje revisó el duplicado por su conducta (no copia foros), no por su tipo.
Qué se espera: el inventario completo de los lugares de `backend/src` donde el `tipo` de Prisma desemboca en un tipo literal más estrecho (mi grep: `"anuncio" | "material" | "tarea"` y `tipo: true` en `adapters/db`; encontré esos tres; `tareas.ts:684-698` y `temas.ts:212-221` ya estrechan a mano y compilan), cada uno en "Se toca" de 01a con su remedio mínimo (estrechar en el adaptador o ensanchar el tipo de `core/`) y sus vigiladas (`duplicado-de-clase.integracion`, `borrado-duplicado-*`, las de `core/clases/duplicado`), y el conteo de 01a corregido (unos 32 o 33). El humano lo aprueba con el plan; no hace falta una DH.

#### M-08 — El inventario de 01c2 deja fuera las pruebas que fijan la posición de las secciones, y su conteo no es creíble
Dónde: plan §E7.5.4, "Lista cerrada" (líneas 402-408), "Grep de la lista" (línea 410, que da por "vigiladas" a `indicador-03c1-r1.ataque` e `indicador-03c1-r2.ataque` porque "buscan las secciones por nombre"), C-n (líneas 415-422) y "Vigiladas" (línea 426: `app/router-01d.test.tsx` y `app/rutas-01d-r1.ataque.test.tsx`); §E7.1 (línea 60, 01c2 ~30).
Por qué importa: con "Foro" tercera, "Recursos", "Dudas", "Personas" y "Calificaciones" bajan una posición. Hay pruebas que fijan la lista completa en otros archivos y pruebas que fijan el indicador medido por índice. El grep del plan solo mira `features/clases` y solo busca textos. Mi grep (lista multilínea `"Dudas",\s*"Personas"` en todo `frontend/src` y `esperadas\(|medidasDeLaOpcion\(|indicador-x`) encuentra, además de lo inventariado:
- **Normales fuera de la lista:**
  - `app/router-01d.test.tsx:192-205` (CAL-1D06: las seis secciones de las tres perspectivas) y `:225-254` (el indicador en las opciones 4 y 5). El plan la da por vigilada y va a fallar.
  - `features/clases/dudas-caminos-03e.test.tsx:451-458` (CL3-E12, la lista completa).
- **Líneas de más en archivos ya listados:**
  - `features/clases/clase-layout.test.tsx:310-317` (la lista del admin), `:274` y `:360` (`medidasDeLaOpcion(4)` de "Personas"). El plan solo nombra `:381-383` y `:418-460`.
  - `features/clases/secciones-03c1.test.tsx:184` (`esperadas(5)` de "Calificaciones") y `:243-256` y `:276-282` (`esperadas(4)` de "Personas" y `{ x: "520px", ancho: "135px" }`). El plan solo nombra `:19-27` y `:153-160`.
- **`*.ataque` sin C-n:**
  - `app/rutas-01d-r1.ataque.test.tsx:196-210` ("Calificaciones" en el índice 5: `500px` y `130px`).
  - `features/clases/clases-admin-02c-r1.ataque.test.tsx:383-393` (la lista completa del admin).
  - `features/clases/indicador-03c1-r1.ataque.test.tsx:354-456` (`esperadas(5)` de "Calificaciones") e `indicador-03c1-r2.ataque.test.tsx:297-305` y `:439` (índices 4 y 5, con el historial de cada sección que se sumó).
  - Precedente: CLASES-03e ajustó como C-n justo estas `*.ataque` al sumar "Dudas" (sus comentarios "CLASES-03e ronda 0" en `rutas-01d-r1`, `clases-admin-02c-r1`, `indicador-03c1-r1` e `indicador-03c1-r2`).
- **Listas cerradas de CHORE-04 que el foro alcanza:** `lib/guardas-ch4-r1.ataque.test.ts`.
  - ATQ-CH4-32 (`:72-93`) cierra la lista de mutaciones que no viven en un manejador a dos espacios. Hoy incluye `editar-tarea-view.tsx` («const handleGuardar = async (datos: CrearTarea, version: number) => {»). `editar-foro-view.tsx` con la misma forma (`key={foroId}` en un componente interno, §E7.3, punto 3) entra en esa lista.
  - ATQ-CH4-34 (`:106-135`) cierra la de `.refetch(` sin `cancelRefetch: false`. Hoy incluye la recarga tras un conflicto de `editar-tarea-view.tsx:132` y las dos de `entrega-de-alumno-view.tsx`. `editar-foro-view.tsx` (01c2) y `participante-view.tsx` (01e) con la recarga tras un `409` de §7.21 suman líneas.
  - En 01c1, el remedio de T-01 en `editar-tarea-view.tsx` toca el archivo de las dos líneas que fijan: como mínimo, vigilada.

Con lo anterior, 01c2 pasa de ~30 a unos 37 (2 normales y 5 `*.ataque` más), por encima de la regla de corte. Así, la partición del frontend que el humano aprobaría con DH-15 ya no es la del plan. La comprobación de arranque del tester lo encontraría en la ronda 0 de 01c2, pero como PARADA y enmienda a mitad del encargo, sobre una partición ya aprobada.
Qué se espera:
- La lista cerrada y los C-n de 01c2 completos (con el texto exacto de cada C-n, como C-9), y un C-n condicional para `guardas-ch4-r1` en 01c2 y en 01e (como C-8), o la forma de `editar-foro-view.tsx` y `participante-view.tsx` fijada para no entrar en esas listas.
- El recuento de 01c2 y, si pasa de unos 30, el corte nuevo con sus conteos, reflejado en §E7.1 y en DH-15 antes de que el humano la responda.
- La línea "Grep" de cada subentrega del frontend ampliada a todo `frontend/src`, con los patrones por índice y por listas cerradas de CHORE-04, para que la comprobación de arranque sea una red de seguridad y no el inventario.

### Problemas que no bloquean

- **N-17 — La comprobación de arranque no sustituye al inventario; las vigiladas del backend tienen huecos.** Con M-08 cerrado, la comprobación de arranque basta como red de seguridad en 01c1, 01d y 01e. No basta como sustituto de lo que el arquitecto no abrió: la limitación declarada es justo donde salieron M-07 y M-08. En el backend no encontré pruebas que deban cambiar fuera de lo inventariado. Sí faltan tres vigiladas que leen archivos que 01a y 01b cambian, y conviene nombrarlas:
  - `instantanea-01b-r1.ataque.test.ts:524-557`, que exige `export const leerTarea =`, `const leerTareaCon =`, `const listarTrabajoCon =` y la opción solo en `leerTarea` y `listarTrabajo` (01a y 01b cambian `tareas.ts`);
  - `calificaciones-estatico-01b-r1.ataque.test.ts`, CAL-T-69 (sin `request.query.x` ni `request.query as` en `handlers/calificaciones.ts`; 01b suma `conTipo`) y su primer caso (sin `rol` ni `version` en `adapters/db/calificaciones.ts`);
  - `autoria-02b-r1.ataque.test.ts` (oráculo propio de `core/autoria.ts`; 01b suma `puedeBorrarParticipacion`).
- **N-18 — Las listas de `features/tareas`: la decisión es correcta; falta decir dónde vive la lógica.** Que `features/tareas` no importe los ganchos de `features/clases` es la regla 9, y la regla 5 no obliga a subirlos: nadie fuera de `features/clases` los usaría. El patrón de Entregas está documentado en `DESIGN.md` §7.10 ("conservan la lista también cuando falla una recarga de fondo"). Subir `useListaConservadaTrasLaPagina` a `components/` sería un refactor entre dominios que pide confirmación y no hace falta. Pero ese patrón vive en línea en `entregas-view.tsx:98-114` (`handleVerMas` con sus cuatro salidas), y el foro lo necesita en cinco listas. El plan debe decir que esa lógica va en un gancho de `features/tareas/hooks.ts` (CLAUDE.md, reglas 3 y 4), no copiada cinco veces en los componentes.
- **N-19 — El plan corrige, no solo revisa, un riesgo que el humano había aceptado.** La fila de ADMIN-01d1 y 01d2 de ESTADO §3 dice "Riesgo declarado (decisión del humano, 2026-11-06); revisar en FORO-01". FORO-1C41 y FORO-1E41 lo corrigen en la tarea y en calificar (conducta nueva en flujos de tareas). Es razonable y está acotado, pero el humano debe saberlo al aprobar.
- **N-20 — DH-09 (a) perdió su motivo original.** R-E7-4 lo dice bien: con DEPLOY después de ENVIVO, el opt-in (`conForos`, `conTipo`) ya no protege a un frontend anterior. Se conserva para no tocar los dobles que eligen por `seccion` (M-04) y se retira en el `chore` de compatibilidad. Coincido en conservarlo, pero el humano aprobó DH-09 por otra razón: hay que decírselo en una línea.
- **N-21 — §E7.7 ubica mal un efecto de DH-02 (c).** `FormularioTarea` con `tipo="foro"` está en 01c1 (§E7.5.3), no "después de 01c2" (línea 497).

### Lo que comprobé

**Diff (punto 1).** Los 45 hunks se mapean a E7-1 a E7-16 (uno, la nota de "Cambios por capa" en la línea 1437, no está nombrado en la columna "Secciones" de la tabla; ver detalles). Las 27 eliminaciones son líneas reescritas que conservan su texto como historial, con la marca "(Enmienda 7)" delante o detrás. No cambió nada aprobado: §D-1 (modelo), §D-3.1 (las 17 rutas, verificadas en las líneas 943-958), §D-9 (textos; solo suma la fila del complemento de DH-12, presentada como decisión), DH-01 a DH-12 (DH-05 con la decisión del humano, literal), PB-1 (a), PB-2 (a), el opt-in y las migraciones como PARADA con su SQL. Lo "sin objeto" lo está de verdad: DH-13 y DH-10 cumplidas (ADMIN-01 en `main`; PR #32 revertido), DH-14 y §D-X sin fusión, R-03, R-04, R-09 y R-10. Las frases del plan viejo ("antes de fusionar ADMIN-01", `e94ee59`, "copia B", "otra copia", "remerge-diff", "01a1" y "01a2") solo quedan en secciones marcadas como historial o reemplazadas.

**Reanclaje (punto 2).**
- ADM-1A09 (a) (`clases-archivadas-matriz.integracion.test.ts:97-98`) compara la lista de rutas con `:claseId` de `printRoutes` con la tabla, por igualdad: se pone roja en cuanto `app.ts` registra el foro. La política en 01a está justificada.
- Las 16 entradas que suma la lista cerrada y sus políticas son coherentes con (b) a (e): las rutas 6 y 7 (`roles: ["estudiante"]`, `"lectura"`) dan `403` al maestro y al admin y `409` al alumno, como la entrega propia de una tarea; (d) sigue en 4.
- `contarParaBorrar` (`borrado-de-clase.ts:26-54`) cuenta `tarea.count({ claseId })`, las entregas con fecha y las calificadas. `borrarClaseDefinitivamente` lee los `archivos` por `clase_id` y los `trabajo_id` de `tareas`, y borra la clase con su cascada. Con las FK de §D-1.2 (`foro_id → tareas` y `principal_id` en cascada), el foro cae completo. El duplicado (`duplicado-de-clase.ts:90-95`) solo lee materiales. Correcto, salvo M-07.
- Migraciones: 19 carpetas, las tres últimas de ADMIN-01 (`20261104234335`, `20261105163205`, `20261109150104`). El CHECK `publicaciones_titulo_segun_tipo` solo lo tocan `20261002003225` y `20261006151533`. El CHECK de `bloque` (`20261028165322`) exige `bloque` nulo fuera de materiales, como dice el plan. El enum en su propia migración y el CHECK en la segunda siguen el precedente de `tipo_publicacion_tarea`. Los tres nombres de índice miden menos de 63 caracteres. Compatibles hacia atrás, con R-02 declarado.
- Cadena: `middleware/index.ts:14-22`, `:47-58` y `core/clases/archivada.ts` como dice §E7.2. **El plan no toca `middleware/`, `adapters/auth` ni `infra/`** (§E7.5.0, líneas 251-253; §E7.9).
- `protegido({…, enClaseArchivada: "lectura" })` en varias líneas (`handlers/tareas/tareas.ts:121-127`) y el patrón de CAL-1B08 (`calificaciones-lecturas-estatico.test.ts:77-88`): correcto.
- "Foro" activa en `foro` y no en `foros/:foroId`: `indiceDeSeccionActiva` (`features/clases/lib.ts:114-128`) compara `destino` o `destino/`, así que `…/foros/x` no activa `…/foro`. Correcto.
- `DESIGN.md`: §7.32 y §7.33 son de ADMIN-01, y §7.34 está libre. §7.10 ya documenta las dos variantes ("Lo implementan…"; Entregas "va más allá").
- Reglas que no se rompen: capas, cadena completa en cada ruta, sin estado de pago (FORO-1B10 con llaves exactas), índices de M-03 y paginación en cada lista (la de foros declara su índice y su riesgo en "Acceso a datos", línea 1509), nada por la cola al publicar (S-09), adjuntos por URL prefirmada y `BORRAR_OBJETOS`, UTC, el recordatorio con crear, editar y borrar en la misma transacción, avisos solo por `notifier` (no se toca). Sin hallazgos fuera de M-07.

**Inventarios (punto 4), con mi grep.**
- **C-1 coincide con el árbol:** título "…, ADMIN-01b, ADMIN-01e y FORO-01a: …" (hoy `:585`, "… y ADMIN-01e"); comentario después del de ADMIN-01e (`:573-584`); 26 entradas (10 GET, 10 HEAD, 3 POST, 2 PUT y 1 DELETE); posiciones de `sort()` verificadas una por una ("participaciones" antes de "participantes"; `…/devoluciones` antes de `…/participaciones`); igual al ajuste de `e81ff10`.
- **C-2 coincide:** hoy son 24 (1+2+1+4+2+4+1+2+1+2+2+2 por archivo); "veintinueve" con "cinco de foros"; `adapters/db/foros.ts:5` va entre `exportacion-de-calificaciones.ts:1` y el comentario de ADMIN-01e que precede a `gestion-de-usuarios.ts:2`, que es su lugar en el orden.
- **C-3, C-6 y C-7 coinciden:** `lecturas-fx-r2.ataque.test.ts:972` y `:995-996`, con `participacionForo` entre `movimientoInscripcion` y `publicacion`; `errores-ch3-r2.ataque.test.ts:231-254`, después de `"resuelta",`, con `alumnoId` y `tema` ya inventariados.
- **C-8 a C-14 coinciden con sus líneas:** `tareas-01a-r1.ataque.test.tsx:176-195` y `:93`; `heredados-02d-r1.ataque.test.tsx:209-273`; `estatico-02c-r1.ataque.test.ts:123-133` (nueve archivos hoy); V-06 en 90 (lo conté: 90 `enEspera=` en producción), con `restoClases` en 3 y la regla de `fijos`; `categorias-01e-r1:174` y `-r2:153`.
- **01a y 01b:** las listas cerradas cuadran con el árbol. Hay 7 archivos con `printRoutes` o `rutasDeLaApp`, como dice el plan; las demás pruebas que leen el esquema o los índices filtran por tabla o por nombre. Sí faltan vigiladas (N-17). **01d y 01e:** cuadran (`seccion=actividades` y la URL completa solo en `contenido-03c2:242`; "0 tareas" y "Tiene 3 tareas." solo en `categorias-view` y en las dos de C-12; las URL del gradebook solo en `calificaciones/lib.test.ts:150-162`). **01c2:** incompleto (M-08).

**Conteos (punto 5).** Conté cada "Se toca": 01a 18+9+1+3 = 31; 01b 18+5+4+3 = 30; 01c1 8+4+1+1 = 14; 01c2 15+6+6+3 = 30; 01d 16+6+2+3 = 27; 01e 17+6+2+1 = 26. Las cifras cuadran con sus listas, pero la de 01a sube con M-07 y la de 01c2 no es creíble (M-08). Cada corte se justifica por tamaño, no por tema. El orden no deja la rama rota entre commits si se cierran M-07 y M-08. 01a y 01b verifican backend y frontend con `build` de `shared`; 01c1 a 01e no tocan `shared/`.

**Reglas nuevas (punto 3).** Por subentrega están: las guardas con ref en un manejador con nombre y su comprobación quitándolas (FORO-1C50, 1D50 y 1E50); las `EXCEPCIONES` de CH4-01; «Ver más» con `isFetching`, `cancelRefetch: false` y sin lectores nuevos de `isFetchingNextPage`; la `key` por cada id de la ruta y CH6-A30 (c) (FORO-1C52, 1D52 y 1E52); ningún aviso ante un código que redirige (FORO-1C53, 1D53 y 1E53); la política única en `ForosView` (FORO-1C54 y 1D54); la memoria por consulta (FORO-1D51); `VALIDACION` fuera de contrato en cada formulario (FORO-1C06 a 1C11, con "pintado solo en otro modo" y "rechazo seguido de uno local"; los de participar y calificar en 01d y 01e); un caso por camino por frase (FORO-1C20 a 1C23, 1D20 a 1D27 y 1E20 a 1E35); la matriz desde el primer resumen de 01c1, y los ids con prefijo `FORO-`. Falta lo de M-08 (las dos listas cerradas de `guardas-ch4-r1`) y lo de N-18.

### Detalles menores
- La nota de "Cambios por capa" (línea 1437) no aparece en la columna "Secciones" de ninguna fila de la tabla E7.
- A-11 (línea 2105) deja suelto, después de la marca, el fragmento viejo "el orden de fusión (DH-13) y la forma de la fusión de 01b (DH-14), cuando el humano los decida".
- §D-0.1 (línea 693) y A-07 (línea 2094) citan filas de ESTADO por su número de línea en `e94ee59` (470, 331, 332): conviene citarlas por su texto.
- A-04 no nombra la entrada de `services/trabajoService.ts` en "Ubicaciones compartidas" de `CLAUDE.md`, que hoy enumera sus claves y gana las del foro en 01c2.

### Desacuerdos arbitrados
Ninguno.

### Documentos a actualizar
Los de "Documentos al cierre", con la corrección de A-04 de arriba. M-07 no cambia documentos: ESSENTIALS ya dice que el duplicado no copia actividades.

### Para el humano
- **DH-15 (partición).** Coincido con (a) en el backend: dos subentregas de unos 30 y la política de clase archivada en 01a, porque la prueba de ADMIN-01 (ADM-1A09) se pone roja en cuanto el foro registra sus rutas; lo comprobé. Con M-07, 01a sube a unos 32 o 33, que sigue dentro de lo aceptado antes. **En el frontend no se puede responder todavía:** 01c2 tiene unos 37 archivos, no 30 (M-08), y hay que recortarla antes de que la apruebes.
- **DH-16 (cuándo entra a `main`).** Coincido con (a): un solo PR al cerrar 01e. `main` nunca tiene medio foro y no hay trabajo en paralelo que pida adelantarlo. Con (b), entre 01b y 01e `main` tendría rutas y columnas del gradebook de un foro que ninguna pantalla puede crear.
- **DH-17 (el foro al borrar una clase).** Coincido con (a): sin cambiar ADMIN-01. El diálogo ya cuenta actividades, entregas, calificaciones y archivos, que es lo que pide RN-10, y el foro entra en esas cuentas; la cascada lo borra completo (lo comprobé en el código).
- **DH-18 (participaciones de una cuenta dada de baja).** Coincido con (a): siguen con su nombre y sin marca, como las dudas y los comentarios; el alumno sale de "Participantes", del gradebook y de la exportación, y vuelve al reactivarlo. Es coherente con "conserva todos sus datos" de ESSENTIALS.
- **Complemento de DH-12.** Aprobarlos: "Tiene {n} actividades." / "Tiene 1 actividad." y "Esta clase no tiene categorías. Sus actividades se califican por puntos.". Es el mismo editor que ya decidiste en E1-9.
- **DH-02 (la regla tardía).** De verdad no bloquea: vive en una sola función de 01a. Si el cliente responde tarde, se rehace esa función, unos textos y, con (c), el formulario de 01c1 (no de 01c2, N-21).
- **Dos avisos sin decisión nueva:** el plan corrige (no solo revisa) un riesgo que aceptaste el 2026-11-06, el `409` con la clase archivada en tarea y calificar (N-19); y el opt-in de DH-09 se conserva por las pruebas, no por compatibilidad, y se retira antes de DEPLOY (N-20).
- **Carril:** sensible, correcto. **El plan no toca `middleware/`, `adapters/auth` ni `infra/`.** Los archivos de ADMIN-01 que M-07 obliga a tocar entran con tu aprobación del plan.

### Estado del plan
Vuelve al arquitecto para una Enmienda 8 corta: M-07 (01a), M-08 (01c2 y DH-15 del frontend) y, si quiere, N-17, N-18 y N-21. Lo demás de la Enmienda 7 queda verificado y no hace falta revisarlo de nuevo.

## Verificación de la Enmienda 8 — FORO-01 (2026-11-14)
Veredicto: **APROBADO**
Verificación propia: lint, test y build **no corridos** (modo plan; solo `git`, `grep` y lectura; no corrí ningún archivo de prueba). `plan.md`: 2565 líneas, SHA-256 `cf26b7f925e782ae34c5a5cabcc4647660c85e1d5ef049406096e2e1a409e81a` (coincide). Copia `plan-foro-01-antes-e8-18b4f5cf.md`: SHA-256 `18b4f5cf…` (coincide). `git diff --no-index --shortstat`: 288 inserciones y 6 eliminaciones (coincide).

M-07 y M-08 quedan resueltos, y lo comprobé con mi propio grep. La partición nueva del frontend cuadra y su orden es viable. Quedan cuatro detalles de inventario y de texto (N-22 a N-25). Ninguno cambia lo que el humano decide ni un conteo: se corrigen con una enmienda corta antes de la ronda 0 de la subentrega que tocan, como se hizo con la Enmienda 6.

### M-07: resuelto
- **Mi grep.** Busqué en `backend/src`, sin `generated/`, las uniones `"anuncio" | "material" | "tarea"` y sus parciales, todo `tipo: true`, todo `tx.publicacion.(create|find*|update*)` con su `select`, los `include` y los `$queryRaw` con `tipo`. Sobre el tipo de publicación solo hay tres asignaciones de una fila de Prisma a una unión estrecha:
  - `crearPublicacion` (`publicaciones.ts:140-171`, por `SELECT_PUBLICACION`, `:90-97`);
  - `listarPublicaciones` (`:215-265`);
  - `duplicado-de-clase.ts:90-107` hacia `RecursoOriginal` (`core/clases/duplicado.ts:8,43`).

  Lo demás estrecha a mano (`tareas.ts:684-698`), compara (`temas.ts:215-221`), lleva el tipo escrito sobre SQL que filtra (`publicaciones.ts:272-304`) o es otro enum (archivos, tokens, movimientos). No hay `select` anidado de `publicacion` con `tipo`: el único, `calificaciones.ts:104`, lee `titulo`. En `shared/src` las uniones de `clases.ts:471` y `:527` y de `tareas.ts:285` son esquemas de respuesta y compilan. En el frontend no hay `switch`, `Record` ni `satisfies never` sobre el tipo.
- **Los tres remedios son sanos:**
  - `{ ...creada, tipo, … }` toma el tipo del parámetro (`"anuncio" | "material"`). No hace consultas nuevas y no cambia la conducta.
  - La ayuda de `listarPublicaciones` es de verdad inalcanzable: los dos `donde` (`{ claseId, tipo: { in: [anuncio, material, tarea] } }` y `{ claseId, tipo: "anuncio", temaId: null }`) excluyen `foro`. Es un retorno temprano que lanza `AppError` en `adapters/`, como `errorElementoSinTitulo`, y no rompe `lecturas-fx-r2.ataque:1082-1108`, que solo prohíbe escrituras, bloqueos y SQL crudo dentro del cuerpo.
  - Sumar `"foro"` a `TipoDePublicacionOriginal` no cambia el duplicado: el adaptador ya filtra `tipo: "material"` (`:93`), `planDeDuplicado` filtra con `esRecursoDeAprendizaje` (`:165`), y esa función devuelve `false` a todo lo que no es material (`:23`). `duplicado-de-clase.ts` no se toca. Ninguna prueba estática lee `core/clases/duplicado.ts`.
- **El conteo de 01a** (19 + 9 + 1 + 3 = 32) es creíble. FORO-1A08 no choca con ningún id.
- **"Mover" un foro en 01a** responde `404`: `TEMA_NO_ENCONTRADO` si el tema no existe y, si no, `PUBLICACION_NO_ENCONTRADA`, porque el `updateMany` filtra `TIPOS_CON_TEMA` (`temas.ts:204-238`). Coincide con lo declarado.

### M-08: resuelto
- **Mi grep, en todo `frontend/src`:**
  - las listas multilínea `"Actividades de aprendizaje",\s*"Recursos"` y `"Dudas",\s*"Personas"`;
  - los índices `esperadas\(\d`, `medidasDeLaOpcion\(`, `opcionDe\(lista, \d` e `indiceDeSeccionActiva\(`;
  - los px literales `"\d{2,3}px"`;
  - `toHaveLength\((6|7)\)`, los enlaces por posición y todo archivo que nombre "Secciones de la clase" y cuente.

  Encuentra exactamente lo que inventaría §E8.2: `secciones-03c1`, `clase-layout`, `clases/lib.test`, `recursos-lib-03d`, `app/router-01d` y `dudas-caminos-03e` como normales; `heredados-02d-r1`, `rutas-01d-r1`, `clases-admin-02c-r1` e `indicador-03c1-r1` y `-r2` como `*.ataque`. `textos-03c1` enumera claves y no cambia. Los demás usan las secciones por nombre.
- **Texto exacto, línea por línea, contra los archivos:**
  - las seis normales con su antes y después, con la aritmética comprobada (130×5 = 650 y 95+50 = 145; 120+50 = 170; "Calificaciones" ocupa 600..740);
  - C-17 (`rutas-01d-r1:196-210`) y C-18 (`clases-admin-02c-r1:378-393`);
  - C-19 (`indicador-03c1-r1`: los once `esperadas(5)`, el `esperadas(4)` de `:523`, los cuatro `opcionDe(lista, 5)` y los dos `"500px"`, en las líneas citadas);
  - C-15 (`guardas-ch4-r1:89-92` y `:112-120`; ATQ-CH4-32 compara en el orden del glob, así que `editar-foro-view` va antes que `editar-tarea-view`; ATQ-CH4-34 ordena).

  Cada ajuste conserva la intención del ataque y sigue el precedente de CLASES-03d y CLASES-03e: los comentarios de esas dos están en los mismos archivos. El cambio de control de CL3-R2-08 (pulsar "Foro" en el índice 2 y sumar la ruta `foro` al router de prueba) es el que hizo CLASES-03d con "Recursos" y es necesario: "Recursos" en el índice 3 ya no cabe en 90..340.
- C-20 tiene un hueco de texto (N-22).

### La partición nueva
- **Conteos.** Conté cada "Se toca":
  - 01c1: 7 de producción (`foros-view.tsx`, `data.ts`, `hooks.ts`, `types.ts` y `fila-de-entrega.tsx` de `features/clases`, más `trabajoService.ts` y el router), 2 pruebas nuevas, 7 normales (las seis de §E8.2 y `como-se-entrega-01a`) y 7 `*.ataque` (C-9, C-10, C-11 y C-17 a C-20): **23**.
  - 01c2: 13 de producción (11 de `features/tareas`, más `trabajoService.ts` y el router), 8 pruebas nuevas, 2 normales (CH4-01 y CH6-A30 (c)) y 2 `*.ataque` (C-8 condicional y C-15): **25**.
  - 01a: **32**; 01e: 17 + 6 + 2 + 2 = **27**.

  Todas quedan en unos 30 o menos, y cada corte se justifica por tamaño (01c1 y 01c2 juntas son unos 48).
- **El orden es viable.**
  - 01c1 cierra en verde con la sección y su lista.
  - Las pruebas de 01c1 solo miran enlaces, la lista, la política única y la recarga; ninguna navega al detalle.
  - La parte de FORO-1C01 que dice "no activa en `foros/:foroId`" sí depende de una ruta que llega en 01c2 (N-25).
  - 01c2 no rompe lo de 01c1: suma rutas, y CH6-A30 (a) ya cubre el render prop de `ForosView` desde 01c1 con `key={claseId}`, sin entrar en ninguna lista.
  - V-06 sin cambio en 01c2 es correcto: `porArchivo` solo cuenta archivos con `enEspera=` (`clases-r1.ataque:212-219`), y las vistas reutilizan `AccionesDeLaTarea` y `FormularioTarea`.
- **Ids trazados.** Todos los de 01c quedan asignados en §E8.3: 1C01 a 1C14 (1C14 partido), 1C20 a 1C27 (1C25 ya movido a 01d), 1C30 a 1C37, 1C40, 1C41, 1C43 y 1C50 a 1C54 (partidos).
- **Entre los commits de 01c1 y 01c2,** las filas de la lista y "Crear foro" apuntan a rutas que todavía no existen (el `*` del router lleva a `/login`). Solo pasa en la rama y no se puede crear un foro por la interfaz, así que es aceptable con DH-16 (a). Hay que declararlo (N-25).

### N-17 a N-21
- **N-17: aceptado en el backend, no del todo en el frontend.**
  - Las tres vigiladas que pedí están con su línea.
  - Las del backend citadas como archivo completo (`duplicado-de-clase.integracion`, `borrado-de-clase.integracion`, `borrado-duplicado-*`) no leen código ni enumeran rutas (grep de `readFileSync`, `readdirSync` y `printRoutes`: ninguno). De acuerdo con dejarlas así.
  - En el frontend, cinco de las citadas como archivo completo **sí leen el código fuente**, contra la razón de §E8.5 (N-24).
- **N-18: correcto.**
  - `useVerMasConservandoLaLista` vive en `features/tareas/hooks.ts` y solo lo usa ese módulo, así que la regla 5 no obliga a subirlo.
  - No duplica un dato entre módulos: es la variante de Entregas, que `DESIGN.md` §7.10 documenta aparte.
  - No lee `isFetchingNextPage` y lleva `cancelRefetch: false` (CH4-03 lo revisa en todo `src/`).
  - El aviso de la recarga de fondo con memoria por consulta sigue en la variante de `useAvisoDeRecargaFallida` (§E7.3, punto 5).
  - Dejar `entregas-view.tsx` como está está justificado.
- **N-19 y N-20:** bien redactados para el humano, con la opción de rechazar N-19 al aprobar.
- **N-21:** corregido en §E7.7.

### Problemas que bloquean
Ninguno.

### Problemas que no bloquean
- **N-22 — A C-20 le faltan los índices que van como argumento suelto.**
  - En `indicador-03c1-r2.ataque.test.tsx`, `visitar` y `fotosAjenasAlNavegar` reciben el índice en su propia línea:
    - `:383`, `:404`, `:429`, `:446`, `:466` y `:484` llevan `5,` ("Calificaciones"), que pasa a `6,`;
    - `:420` y `:499` llevan `4,` ("Personas"), que pasa a `5,`.
  - La lista de "Cambios" de C-20 solo nombra `esperadas` y `opcionDe`, y su regla de respaldo ("si alguno de `esperadas(4)` u `opcionDe(lista, 4)` nombra Personas…") no los alcanza, aunque su comentario sí habla de "los destinos de visitar y fotosAjenasAlNavegar".
  - Leído al pie de la letra, el tester se detiene. Hay que sumar esas ocho líneas antes de la ronda 0 de 01c1.
- **N-23 — En §E7 quedan etiquetas de subentrega viejas sin marcar,** y algunas son texto literal de un C-n:
  - El comentario de C-8 dice `// FORO-01c1, C-8` (línea 627), pero C-8 va ahora en 01c2.
  - Los de C-9, C-10 y C-11 dicen `// FORO-01c2 ronda 0` (`:657`, `:658` y `:662`) y van en 01c1; §E8.2 dice "sin cambio de texto", así que la etiqueta equivocada quedaría escrita en las pruebas.
  - Sin marca de la Enmienda 8 quedan también:
    - §E7.2 (`:327` y `:329`, "(01c2)");
    - §E7.3, puntos 1 (`:351`, "Secciones (01c2)"), 6 (`:366`, "01c1") y 8 (`:376` y `:384`, "(01c1)");
    - los encabezados de §E7.4 (`:416` y `:434`), que reparten los casos al revés que §E8.3;
    - R-E7-1 y R-E7-2 (`:780-781`).
  - §E8 manda, así que no confunde a quien lee §E8 primero; los textos literales de los C-n sí hay que corregirlos.
- **N-24 — Cinco `*.ataque` del frontend que §E8.5 da por "de conducta" leen el código fuente.**
  - `tareas-01d-r1`, `-r2` y `-r3.ataque` (`:478-537`, `:503-540` y `:391-…`) recorren todo `features/tareas/`. Prohíben en los archivos nuevos del foro:
    - `fetch(`, `console.`, `?? []` y emojis;
    - `disabled` en JSX, las escalas anuladas y los valores arbitrarios en px o rem;
    - importar con `from "@/features/…"`, también del propio módulo;
    - tipos fuera de `types.ts` (salvo las interfaces Props).
  - `entregas-01e-r1` y `-r2.ataque` (`:723-768` y `:523-560`) leen, entre otros, `hooks.ts`, `lib.ts`, `data.ts`, `types.ts`, `tabla-de-entregas.tsx` y `acciones-de-la-tarea.tsx`. Además de reglas como las de arriba, **fijan una cuenta: `renovarTrasErrorDeLaEntrega(` aparece exactamente 3 veces en `features/tareas/hooks.ts`** (`entregas-01e-r1:767` y `-r2:542`). Si los ganchos de participar (01d) o de calificar la participante (01e) lo reutilizan, las dos se ponen rojas.
  - Qué se espera: nombrarlas como vigiladas, con esas reglas, y decir si el foro llama a `renovarTrasErrorDeLaEntrega`. Si lo llama, va un C-n en 01d o en 01e (más dos `*.ataque`, que siguen dentro de unos 30). Si no, que el plan lo prohíba de forma expresa.
- **N-25 — Lo que 01c1 no puede probar sin las rutas de 01c2.**
  - La parte de FORO-1C01 que dice "no activa en `foros/:foroId`" no se puede probar en 01c1 con el router real, porque esa ruta llega en 01c2 y hoy cae en el `*`. Debe ir con `indiceDeSeccionActiva` en 01c1, o en 01c2 con el router real.
  - Hay que declarar que, entre los dos commits, las filas y "Crear foro" apuntan a rutas aún inexistentes, y que por eso 01c1 no puede entrar sola a `main`: vale con DH-16 (a) y no con (c).

### Detalles menores
- FORO-1A08 prueba `core/clases/duplicado.ts` desde `core/actividades.test.ts`, un archivo del foro. Funciona; solo hay que encontrarlo ahí.
- C-15 da por hecha la firma exacta `handleGuardar = async (datos: CrearTarea, version: number)`. Si el foro usa otro tipo de datos, es una PARADA evitable: conviene que el programador declare la línea, como ya dice para C-16.

### Hunks
Los 17 hunks se mapean a E8-1 a E8-8:
- el estado y la nota (E8-1 a E8-8);
- §E8 (E8-1 a E8-5);
- las notas de §E7.1, §E7.5.0, §E7.5.1, §E7.5.3, §E7.5.5 y §E7.5.6 (E8-1 y E8-3);
- §E7.7 (E8-7);
- DH-15 y los avisos (E8-3 y E8-6);
- §E7.11 (E8-3);
- §D-0.1, A-04 y A-11 (E8-8);
- la tabla.

Las 6 eliminaciones son líneas reescritas que conservan el texto anterior como historial. Ninguna DH aprobada cambió de opción ni de recomendación. Solo DH-15, que todavía no responde el humano, se reescribe.

### Para el humano
- **El plan está listo para tu aprobación escrita** (carril sensible), sobre el SHA-256 `cf26b7f9…`. N-22 a N-25 no cambian nada de lo que decides ni ningún conteo. Se corrigen con una enmienda corta que verifica el manager, como la Enmienda 6: N-22, N-23 y N-25 antes de la ronda 0 de 01c1, y N-24 antes de la de 01d. Si prefieres aprobar el texto ya corregido, pide esa enmienda primero; son pocas líneas.
- **El plan no toca `middleware/`, `adapters/auth` ni `infra/`.** Toca una línea de ADMIN-01 (`core/clases/duplicado.ts:8`) sin cambiar su conducta.
- **DH-15 (cómo se parte el trabajo):** coincido con **(a)**, seis subentregas en este orden:
  - 01a, el núcleo del foro con su clase archivada (~32);
  - 01b, el resto del backend (~30);
  - 01c1, la sección "Foro" y su lista (~23);
  - 01c2, los arreglos heredados de las tareas, el formulario y crear, editar, ver y borrar un foro (~25);
  - 01d, "Actividades", participaciones y réplicas (~27);
  - 01e, calificar y los enlaces del gradebook (~27).

  Todas quedan en unos 30 o menos, y las cuentas son las mías. (b) solo cambia el backend y deja 01a en ~35.
- **DH-16 (cuándo entra a `main`):** **(a)**, un solo PR al cerrar 01e. Con la partición nueva hay una razón más: entre 01c1 y 01c2 la lista de foros enlaza a pantallas que todavía no existen.
- **DH-17 (el foro al borrar una clase):** **(a)**, sin tocar ADMIN-01. El diálogo ya cuenta actividades, entregas, calificaciones y archivos, como pide RN-10, y la cascada borra el foro completo.
- **DH-18 (participaciones de una cuenta dada de baja):** **(a)**, siguen con su nombre y sin marca, como las dudas; el alumno vuelve completo al reactivarlo.
- **Complemento de DH-12:** aprobar "Tiene {n} actividades." / "Tiene 1 actividad." y "Esta clase no tiene categorías. Sus actividades se califican por puntos.".
- **DH-02 (participación tardía):** no bloquea. Si el cliente responde con (c) después de cerrar 01c2, se rehace ahí el formulario del foro.
- **N-19 (riesgo que habías aceptado):** recomiendo dejar que el plan lo corrija en la tarea, el foro y calificar. Es acotado y tiene sus pruebas. Si no lo quieres, dilo al aprobar.
- **N-20 (opt-in de DH-09):** se conserva por las pruebas y se retira antes de DEPLOY. No pide decisión.

## Verificación de la Enmienda 9 — FORO-01 (2026-11-14)
Veredicto: **APROBADO**
Verificación propia: lint, test y build **no corridos** (modo plan; solo `git`, `grep` y lectura; no corrí ningún archivo de prueba).

**El texto que el humano aprueba:** `plan.md`, **2729 líneas, SHA-256 `e899f7b5bb1fe9b0cb2be14cc1268a7eb365a15cdef7ddbf8efbdd31ba61fd88`**. La copia anterior `plan-foro-01-antes-e9-cf26b7f9.md` coincide con `cf26b7f9…`. `git diff --no-index --shortstat`: 200 inserciones y 36 eliminaciones. Los 33 hunks se mapean a E9-1 a E9-6.

N-22 a N-25 quedan cerrados. Las decisiones del humano están integradas tal como las registra `aprobacion.md`, y la enmienda no cambió nada más. Dos detalles de redacción no bloquean (N-26 y N-27): se resuelven en el mensaje de aprobación, sin tocar el plan.

### Lo que comprobé
1. **N-22 a N-25, cerrados de verdad:**
   - **N-22.** C-20 queda completo. Contra `indicador-03c1-r2.ataque.test.tsx`, línea por línea:
     - `esperadas(5)` está en `:439`, `:475`, `:526`, `:557` y `:576`, y son las cinco del archivo;
     - `opcionDe(lista, 5)` está en `:528`, `:554` y `:558`;
     - los argumentos sueltos `5,` están en `:383`, `:404`, `:429`, `:446`, `:466` y `:484`, y los `4,` en `:420` y `:499`;
     - no cambian `1,` en `:390` ni `0` en `:414`, `:440` y `:476`;
     - el archivo no tiene ningún `esperadas(4)`;
     - el router de prueba (`:75-84`) y el control de CL3-R2-08 (`:590-601`) están como dice el plan.

     C-19 no tiene argumentos sueltos (mi grep de `^\s+\d,$` no da nada en `-r1`). La regla "si aparece otro índice ≥ 2, PARADA" es la red correcta.
   - **N-23.** C-8 dice "FORO-01c2" y C-9, C-10 y C-11 dicen "FORO-01c1 ronda 0", en el texto literal que el tester escribe. Las demás menciones quedan marcadas: §E7.2, §E7.3 (puntos 1, 6 y 8), los encabezados de §E7.4, §E7.5.4, R-E7-1 y R-E7-2, §D-0.1, §D-8.6, §D-10 y §D-R0. Quedan tres cifras viejas sin marcar (N-27).
   - **N-24.** Abrí cada prueba citada, y la regla de cada una es la que la prueba fija:
     - `tareas-01d-r1` (`:479-537`), `-r2` (`:504-541`) y `-r3` (`:390-410`);
     - `entregas-01d-r2:784`, `entregas-01e-r1:767` y `-r2:542`: `renovarTrasErrorDeLaEntrega(` aparece exactamente 3 veces, y además se prohíbe `reaccionarAlErrorDeLaEntrega`;
     - CAL-T-127 (`aviso-calificar-01c-r3:530-555`): `avisarDelErrorDeLaEntrega(` aparece 5 veces, una sola con `mensajeDelAvisoDeCalificar`, y ese nombre vive solo en `hooks.ts` y `lib.ts`;
     - `entregas-01d-r3:718-735`: los cinco ganchos con `MiEntrega|Hilo|Comentar|Entregar|Anular`. Ningún nombre del foro coincide; `useMiParticipacion` no contiene `MiEntrega`;
     - CAL-T-98 (`estatico-01c-r1:106-112`): `.version` dos veces, en el panel;
     - CAL-1D09 (`estatico-01d.test.ts:58`): doce archivos; conté 12 en `features/calificaciones`;
     - V-16 y V-15 (`components/layout/estatico-r1.ataque:102-125`): `fixed` y `animate-`;
     - `lib/estatico-ch3-r2.ataque:171-187`: `.isError) x.reset()` solo en los diez de `DIEZ` y los cinco de `REINICIAN_EN_01F`, quince en total. El grep de producción da 15.

     **Las reglas no se contradicen entre sí:** `entregas-01d-r2` admite `@/features/tareas`, `tareas-01d-r2` prohíbe todo `@/features/`, y el plan elige la más estricta (rutas relativas). **Tampoco contradicen `CLAUDE.md`, "Formularios":** ese apartado admite dos formas, y la del plan es la segunda ("si el error del servidor vive en un estado del formulario, la validación local lo reemplaza en ese mismo estado o lo limpia antes de validar"). Sus casos de `VALIDACION` fuera de contrato la cubren en cada formulario: el del foro con FORO-1C06 a FORO-1C11 (el "otro modo" con `requiereAdjuntos` y `version`, y el "rechazo seguido de uno local" en FORO-1C09); la participación con FORO-1D05 a FORO-1D09; la réplica con FORO-1D10; calificar el foro con FORO-1E05 a FORO-1E09 (`puntajes` sin rúbrica como "otro modo") y FORO-1E40.

     Mi grep de `import.meta.glob|readFileSync|readdirSync` da 41 archivos en el frontend, y el plan nombra todos los que leen código de lo que el foro toca, salvo `features/clases/estatico-03c1-r1.ataque` (detalle menor). `lib/xlsx-muestra` solo escribe un archivo.
   - **N-25.** FORO-1C01 se parte: en 01c1, con `indiceDeSeccionActiva` (`foro` y `FORO` dan 2; `foros` y `foros/x` dan -1, que es lo que hace `features/clases/lib.ts:114-128`) y el orden de las secciones; en 01c2, con el router real.
2. **El estado intermedio es cierto.** El único comodín es `app/router.tsx:212` (`{ path: "*", element: <Navigate to="/login" replace /> }`), y no hay ningún `*` anidado. Una ruta sin hijo coincidente cae ahí. Las pruebas de 01c1 solo miran el `href` de los enlaces, la lista, la política única y la recarga, así que 01c1 puede cerrar con sus suites en verde. Que 01c1 no entre sola a `main` cuadra con DH-16 (a).
3. **No cambió nada más.**
   - En las filas de DH-15 a DH-18 y del complemento de DH-12 (`git diff --word-diff`), las opciones y las recomendaciones son las mismas palabras: solo se agregan las marcas de "decidida por el humano".
   - C-1, C-2, C-3, C-6, C-7 y C-14 a C-19 no cambian de contenido. C-15 deja de fijar la firma de `handleGuardar` (era el detalle pedido) y fija la forma. C-11 solo explicita que las vistas de 01c2 no llevan entrada en `fijos`, lo que ya decía la Enmienda 8.
   - De los conteos, solo cambia 01a, de ~32 a ~33, por el archivo nuevo de FORO-1A08 (`core/clases/duplicado-con-foros.test.ts`). Un archivo nuevo de prueba lo permite §E7.5.0 aunque `core/clases/*` siga en "No se toca".
4. **El encabezado** (líneas 8-23) dice lo que el humano aprueba y no afirma nada falso, pero se queda corto en dos puntos (N-26).

### Problemas que bloquean
Ninguno.

### Problemas que no bloquean
- **N-26 — El encabezado se queda corto en dos puntos.** Basta decirlos en el mensaje de aprobación; no hace falta tocar el plan.
  - **Punto 3.** "Una sola línea de código de ADMIN-01" es cierto para el código de producción que creó ADMIN-01: `core/clases/duplicado.ts:8`. Pero el encargo también toca:
    - la prueba de ADMIN-01 de la matriz de clase archivada (`clases-archivadas-matriz.integracion.test.ts`, lista cerrada en 01a y 01b);
    - código existente de encargos anteriores: en 01a, `adapters/db/publicaciones.ts` (`crearPublicacion` y `listarPublicaciones`, sin cambio de conducta), `adapters/db/tareas.ts`, `adapters/db/entregas.ts`, `core/tareas/tareas.ts`, `core/calificaciones/calificar.ts` y `app.ts`; en 01b, `handlers/calificaciones.ts` (que ADMIN-01 modificó), `adapters/db/calificaciones.ts`, `temas.ts`, `categorias.ts`, `errores.ts` y `core/autoria.ts`; en el frontend, `FormularioTarea`, el panel de calificación, la tabla de entregas, el router y el gradebook.

    Todo está en la lista "Se toca" de cada subentrega, que es lo que el humano aprueba con el plan; el encabezado no lo dice.
  - **Punto 2.** "Las dos son compatibles hacia atrás" es cierto para el esquema: el código de hoy funciona con la base nueva. Volver a un backend anterior después de crear foros no está garantizado (R-02, con su fila de DEPLOY).
- **N-27 — Tres cifras viejas sin la marca de la Enmienda 9.** §E8.1 `:201` ("01a pasa a ~32 (19, 9 pruebas nuevas…)"), la nota de §E7.5.1 `:647` y `:649` (FORO-1A08 "en `core/actividades.test.ts`" y "Total: ~32") y la nota de §E7.1 `:419` ("01a ~32"). §E9 manda (§E9.6 y §E9.7) y no confunde a quien lo lee primero. Si hay otra enmienda, que las marque.

### Detalles menores
- `features/clases/estatico-03c1-r1.ataque.test.ts` (CL3-R1-34: `features/clases/hooks.ts` sin declaraciones de tipos; CL3-R1-33: nadie copia el gancho de `components/seccion`) lee un archivo que 01c1 cambia (`useForos`) y no está nombrado. Es la regla general de `CLAUDE.md` y queda vigilada por la comprobación de arranque.

### Punto 5: 01a en ~33
Basta informarlo al pedir la aprobación; no hace falta volver a preguntar. La opción que el humano eligió es la misma partición, y el archivo de más es una prueba nueva que él mismo pidió aislar. 01a sigue en el margen que ya se aceptó para 01a1 (~32).

### Para el humano: qué aprueba si aprueba este plan
1. El foro completo (RF-66 a RF-68) en seis subentregas, cada una con su commit: 01a (~33) y 01b (~30) de backend; 01c1 (~23), 01c2 (~25), 01d (~27) y 01e (~27) de frontend. Un solo PR a `main` al cerrar 01e.
2. Dos migraciones en 01a (el tipo `foro` y la tabla `participaciones_foro`), cada una como PARADA: el programador te enseña el SQL y espera tu confirmación escrita antes de aplicarla. Volver atrás después de crear foros no está garantizado (R-02).
3. Sin cambios en `middleware/`, `adapters/auth`, `infra/` ni `.env.example`. De ADMIN-01 cambia una línea de producción (`core/clases/duplicado.ts:8`, sin cambio de conducta) y su prueba de la matriz de clase archivada. Se cambia, sin cambio de conducta salvo lo decidido, código existente de clases, tareas, entregas y calificaciones (por ejemplo, `publicaciones.ts` en 01a), todo en la lista "Se toca" de cada subentrega.
4. Lo que ya decidiste: DH-01 a DH-18 (DH-05 con tu corrección), PB-1 y PB-2, los dos textos del editor de categorías y la corrección del `409` con la clase archivada (N-19).
5. La regla de participación tardía queda con su valor por omisión hasta que responda el cliente (DH-02), en una sola función.
6. Una sola comprobación tuya en el navegador, al final de 01e: 7 puntos y máximo 10 minutos.

## Verificación del resumen del programador — FORO-01a (2026-11-14)
Resumen verificado: `resumen-programador.md`, 297 líneas, SHA-256 `9fe14a96685dab8ee150253ef07b049817c69ba2864e4bb7c812c0afd912730a`. Plan: `e899f7b5…`. Precondiciones: Docker Desktop 28.5.1 responde (`docker info`); la red es de confianza solo hoy, por declaración del humano; hay una sola copia de trabajo; el equipo está conectado a la corriente (`Win32_Battery.BatteryStatus` = 2). Corrí todo una cosa a la vez.

### Mis corridas contra las del resumen
| Comando | Mi última línea | Resumen | ¿Coincide? |
|---|---|---|---|
| `shared`: `npm run lint` | `All matched files use Prettier code style!` | igual | sí |
| `shared`: `npm run build` | `> tsc -p tsconfig.json` (sin errores) | igual | sí |
| `backend`: `npm run lint` | `> tsc -p tsconfig.json --noEmit && tsc -p tsconfig.test.json` (exit 0) | igual | sí |
| `backend`: `npm run build` | `> tsc -p tsconfig.json` (exit 0) | igual | sí |
| `backend`: `npx vitest run` con los 35 filtros de §8, tal cual | `Tests  1654 passed (1654)` · `Test Files  150 passed (150)` (exit 0; 158 s) | igual | sí |
| `backend`: `npx vitest list` de los 5 filtros de §8, contado con `grep -a ' > ' \| grep -ac 'FORO-'` | **92**, en 10 archivos: 7, 2, 13, 10, 7, 5, 10, 15, 15 y 8 | igual, archivo por archivo | sí |
| `grep -c "instantaneaUnica: true" backend/src/adapters/db/foros.ts` | `5` | igual | sí |
| `backend`: `npx prisma validate` | `The schema at prisma\schema.prisma is valid 🚀` | igual | sí |
| `backend`: `npx prisma migrate status` | `21 migrations found in prisma/migrations` / `Database schema is up to date!` | igual | sí |
| `backend`: `npx prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --exit-code` | `No difference detected.`, exit 0 | igual | sí |
| `frontend`: `npm run lint` | `> tsc -b` (exit 0) | igual | sí |
| `frontend`: `npm run build` | `✓ built in 967ms` | `✓ built in 2.15s` (solo cambia el tiempo) | sí |
| `frontend`: `npx vitest run src/lib` (con C-6) | `Tests  296 passed (296)` · `Test Files  23 passed (23)` | igual | sí |

### Migraciones, "Se toca" y reglas que no se rompen
- **Migraciones.**
  - Los dos `migration.sql` tienen los SHA-256 que confirmó el humano (`8ec418c5…` y `478c2e22…`).
  - La primera es solo `ALTER TYPE "tipo_publicacion" ADD VALUE 'foro'`.
  - La segunda trae lo de §D-1.2:
    - la tabla con su PK;
    - los tres índices con los nombres esperados (de menos de 63 caracteres);
    - las FK `foro_id → tareas ON DELETE CASCADE`, `autor_id → usuarios RESTRICT` y `principal_id → participaciones_foro CASCADE`;
    - a mano, el CHECK de título reemplazado con el mismo nombre y `'foro'`, y el índice único parcial `participaciones_foro_una_principal … WHERE principal_id IS NULL`, cada uno con su comentario.
  - `schema.prisma` coincide con las migraciones (`migrate diff` sin diferencias). La relación de `Usuario` va después de `dudasResueltas`.
  - Las dos son compatibles hacia atrás: el enum crece, el CHECK acepta lo de antes y la tabla es nueva.
- **"Se toca" y "No se toca"** (`git status` y `git diff fd4a7ad`).
  - Los 19 archivos de producción son los de §E7.5.1, §E8.1 y §E9.6, y el resto del árbol cuadra con la lista: las 10 pruebas nuevas, la ayuda `ayudas-foros.ts` (que el paso 9 de §E7.11 prevé: "y la ayuda `backend/test/ayudas-foros.ts` (nueva) si hace falta"), la lista cerrada y las 3 `*.ataque` de la ronda 0.
  - Ningún archivo de producción del frontend, de `middleware/`, `adapters/auth|notifier|queue`, `config/`, `workers/`, `infra/` ni de `duplicado-de-clase.ts` cambió.
  - En `core/clases/duplicado.ts` solo cambian la declaración del tipo y su comentario.
  - En `publicaciones.ts`, solo `crearPublicacion` (`tipo` del parámetro) y `listarPublicaciones` (el `donde` con `TIPOS_DE_LA_LISTA` y `tipoDeLaLista`), más esas dos constantes privadas.
  - En `tareas.ts`, solo `leerTarea` y `leerTareaCon`, `crearTarea`, `editarTarea`, `borrarTarea` y tres ayudas privadas (`errorTareaNoEncontrada`, `asegurarReferencias` y `autorYPertenencia`) que solo cambian para llevar la actividad hacia esas cuatro. `listarTrabajo` no cambió.
  - La lista cerrada (`clases-archivadas-matriz`) suma exactamente las 16 filas y el comentario de §E7.5.1, y nada más.
- **Capas.**
  - `core/foros/participacion.ts` y `core/actividades.ts` solo importan `@campus/shared` (tipos) y `core/`.
  - Prisma solo aparece en `adapters/db`.
  - `handlers/foros.ts` es delgado: valida, llama al adaptador, encola en `alGuardar` y responde. No lleva `try/catch` ni compara rol ni relación, y pasa el perfil entero a `publicarReplica`.
  - Los errores de Prisma (`P2002` del índice único parcial) se traducen con `traducirErrorPrisma` dentro de `adapters/db/foros.ts`.
- **Cadena de middleware.** Abrí las 16 rutas (`handlers/foros.ts:148-653`): cada una va con `protegido({ roles, pertenencia })` exactamente como la sección 3 del resumen y §D-3.1, y `enClaseArchivada: "lectura"` en las 10 lecturas (2, 3, 6, 7, 8, 10 y 12 a 15). `protegido()` arma la cadena completa en su orden por construcción (`middleware/index.ts`), y ninguna ruta verifica a mano rol, propiedad o inscripción.
- **Estado de pago.** Todas las respuestas pasan por esquemas `z.strictObject` de `shared/src/foros.ts`; los autores van firmados con `firmaDelAutor`, sin `rol`, correo ni estado de pago. Un campo de más daría `500`, nunca una fuga. FORO-1A50 compara las llaves exactas de las 16 rutas para los tres roles, con un alumno deudor.
- **Consultas sanas.** Contrasté la sección 4 del resumen con `adapters/db/foros.ts` y `actividades.ts`, y coinciden:
  - sin consultas dentro de un ciclo: un `groupBy` o un `findMany` por página;
  - cada consulta por PK o por los índices de M-03, y cada lista paginada con cursor y `limite` de 1 a 100;
  - las cinco lecturas en instantánea única;
  - sin SQL crudo; el que tocan `tareas.ts` y `entregas.ts` sigue parametrizado y sin cambiar.
  - `listarForos` usa el índice `(clase_id, tipo, tema_id, …)` por su prefijo, como declara "Acceso a datos".
- **Cola, archivos y fechas.**
  - Participar y replicar no encolan nada (FORO-1A34).
  - Crear encola `TAREA_CREADA` y `RECORDATORIO_24H` dentro de `alGuardar` de `crearTarea`; editar cancela y recrea el recordatorio en `alReprogramar`; borrar cancela los dos en `alBorrar`. Todo en la transacción del dato (FORO-1A20, FORO-1A21 y FORO-1A22).
  - Los adjuntos del planteamiento van por URL prefirmada (`archivosParaPublicar`).
  - Las fechas salen con `toISOString()`, y la hora es la del servidor (`new Date()`).

### Pruebas requeridas y matriz de autorización
- Cada viñeta de 01a (FORO-1A01 a FORO-1A08, FORO-1A10 a FORO-1A13, FORO-1A15, FORO-1A20 a FORO-1A24, FORO-1A26 a FORO-1A35, FORO-1A40 a FORO-1A53, y FORO-1B01 a FORO-1B05 y FORO-1B07 de §E7.4) tiene su archivo y su título exacto en la sección 7 del resumen, y cada título existe en `vitest list`. FORO-1A25 y FORO-1A26b van en 01b, como dice §E7.4.
- **La matriz de rutas** (sección 3) cubre las 16 rutas en cada caso negativo: sin sesión, rol incorrecto (el admin en 6, 7, 9, 11 y 16), clase ajena (maestro de otra clase y alumno no inscrito), clase inexistente, alumno restringido (RN-09) y, en una clase archivada, las escrituras (FORO-1B01, por rol), las lecturas (FORO-1B02, con 6 y 7 en `409` para el alumno), el `403` antes del `409` (FORO-1B03) y la restauración (FORO-1B05). ADM-1A09 (a) a (e) queda en verde con las 16 filas.
- **Las 13 mutaciones** cubren cada guarda nueva. La redundancia que se declara es correcta: con M11, FORO-1A06 (ii) sigue en verde porque, con el valor por omisión de DH-02, la regla de la tarea y la del foro dan lo mismo, y la guarda la vigila la parte estática (i), que sí cae (`AGENTS.md`, "Pruebas").
- **Hermano del defecto de aislamiento de FORO-1A47** (un conteo de toda la base). Busqué en las pruebas nuevas y en `ayudas-foros.ts` todo `count(`, `count(*)`, `findMany()` sin filtro y toda lectura de `pgboss.job`:
  - todos van acotados a su foro, su tarea, su clase, su autor o un id único, por ejemplo `contarParticipaciones(foroId)` y `trabajosDeTarea(cola, id)`;
  - el único `count(*)` sin `WHERE` (`migracion-foro-01:143`) lee el esquema aparte de esa prueba.

  No queda otro con el mismo vicio.

### Arbitraje de las desviaciones y las dudas
1. **`editarTarea` también fuerza `requiereAdjuntos = false` en un foro:** aceptado. Es el hermano de `crearTarea`, con `"tarea"` no cambia nada y el handler ya manda `false`.
2. **`exigirVersion` recibe `() => tareaModificada(tipo)` y `() => entregaModificada(tipo)`:** aceptado. No cambia ninguna firma existente: `exigirVersion` ya recibía `error: () => AppError` (`core/concurrencia.ts:6-12`). Las factorías ganan un parámetro opcional con su valor por omisión, así que las llamadas de hoy (`tareaModificada()` en `core/tareas/tareas.test.ts:90-…` y las de los adaptadores) siguen igual. Busqué si se pasan por referencia a algo que las llame con un argumento: no se pasan.
3. **FORO-1A15, el conteo de réplicas con `(foro_id, principal_id, creado_en, id)`:** aceptado. La consulta lleva `foro_id = $1 AND principal_id IN (…)`, y los dos índices le sirven. El caso prueba lo que M-03 pedía: la lista de réplicas y la cascada de la FK nombran `participaciones_foro_principal_id_creado_en_id_idx`, y el conteo usa un `Index (Only) Scan` sin `Seq Scan` (`migracion-foro-01:298-323`). El plan mismo dice "la prueba mide que el índice sirve, no el plan que elige PostgreSQL".
4. **`creadoEn = ahora` en la participación y la réplica, igual a `fecha_entrega`:** aceptado. Es lo que pide FORO-1A29, en UTC y con la hora del servidor.
5. **`firmaDelAutor` en el adaptador para todas las listas nuevas:** aceptado. Es una función pura de `core/`, y el detalle del foro sigue firmándose en el handler, como la tarea.
6. **FORO-1A47 con 14 rutas:** aceptado. Las rutas 1 y 2 no llevan `:foroId`.
7. **FORO-1A41 sin el filtro `asignadas`:** sí falta un caso (M-09, abajo). La viñeta pide "cada filtro" y el título del caso dice "lo lista en cada filtro".
8. **El singular de `TAREA_CON_ENTREGAS` del admin en un foro:** el texto es el aprobado, letra por letra, con la fila de §D-2.4 (`plan.md:1332`). En la frase, "sus participaciones, sus réplicas y sus calificaciones" es del foro, así que es correcta con 1 y con N alumnos, y solo varía "1 alumno" / "N alumnos". No hace falta otra decisión del humano.
9. **`entregaCerrada({ ...foro, requiereAdjuntos: false }, ahora)`:** aceptado. `entregaCerrada` no lee ese campo (`core/entregas/entregas.ts:52-53`); dar uno de relleno evita tocar `TareaParaEntregar`, que no está en "Se toca".
10. **`tareaNoEncontrada` en `TEXTOS_POR_ACTIVIDAD`:** aceptado. Es lo que pide la fila de `errorTareaNoEncontrada` de §D-2.4, y los tres lugares leen el texto de la tabla.
11. **34 archivos frente a ~33:** aceptado. La diferencia es la ayuda que el plan prevé.

### La observación para el arquitecto (`borrarComentario` y `borrarMiComentario`)
No es un riesgo real.
- **Por qué.**
  - Las dos exigen `publicacionId` y `publicacion: { claseId }` (`publicaciones.ts:445-466`).
  - El CHECK `num_nonnulls("publicacion_id", "entrega_id", "duda_id") = 1` deja fuera los comentarios de las devoluciones del foro, que van con `entrega_id`.
  - Un comentario del muro sobre un foro no se puede crear por la API, porque `comentar` filtra `TIPOS_DEL_MURO` (FORO-1A48).
  - Pasa lo mismo hoy con las tareas.
  - Solo un dato sembrado a mano se borraría con `204`, y lo borraría su autor o quien ya puede borrar comentarios.
- **Destino:** una fila en `docs/ESTADO.md` §3 con destino "retiro de compatibilidad e higiene de pruebas" (antes de DEPLOY). Allí se retira `DELETE …/mis-comentarios` (compatibilidad de CLASES-02) y se puede filtrar `TIPOS_DEL_MURO` en `borrarComentario`.
- **No hace falta una decisión del humano.** No va en una subentrega de FORO-01, porque `publicaciones.ts` está en "Se toca" solo para dos funciones.

**Corrida que el programador no hizo** (`plan.md:2052`): `frontend`: `npx vitest run src/features/clases` → `Tests  3068 passed (3068)` · `Test Files  124 passed (124)` (exit 0; 323 s). Queda cubierta.

### Veredicto: **DEVUELTO**
Todas las cifras del resumen coinciden con mis corridas y no encontré nada que rompa una regla. El resumen vuelve por una sola viñeta incompleta.

#### M-09 — FORO-1A41 no prueba el filtro `asignadas`
- **Dónde:** `backend/test/foros-calificar.integracion.test.ts:166-…`, caso "FORO-1A41: … Mis calificaciones lo lista en cada filtro"; viñeta de `plan.md:2030` ("'Mis calificaciones' lo lista con su estado en cada filtro"); desviación 8 del resumen.
- **Por qué importa:**
  - El título del caso dice "en cada filtro", pero solo se piden `sin-entregar`, `entregadas`, `calificadas` y `todas`.
  - Falta `asignadas`, uno de los cinco de `shared/src/calificaciones.ts:153-156`. Es justo el que lista un foro abierto sin principal, el estado que más cambia con la regla del foro.
  - Una viñeta que no se cubre entera devuelve el resumen (`manager.md`, "Verificación del resumen", punto 3).
- **Qué se espera:**
  - Un foro con la fecha límite en el futuro y sin principal del alumno aparece en `asignadas` y no en `sin-entregar`.
  - Al publicar el alumno su principal, sale de `asignadas` y aparece en `entregadas`.
  - El caso puede ir en el mismo `it` o en uno nuevo con el prefijo `FORO-1A41`.
  - El resumen de la corrección trae el título exacto, la corrida de `test/foros-calificar` y el conteo nuevo de `vitest list`.
  - Hermanos que debe revisar: los otros filtros por estado que toca el foro (el estado del alumno en la lista de foros, FORO-1A24, y en "Participantes", FORO-1A44), para confirmar que cada estado posible de su entrega (`asignado` abierto, `asignado` vencido, `entregado`, `calificado` con y sin fecha) tiene un caso.
- No hace falta volver a correr las suites completas: basta `test/foros-calificar` y `lint`.

### Para el tester (ronda 1 de 01a), por prioridad, además de "Puntos de ataque" del plan
1. **Clase archivada "sin escribir nada".** FORO-1B01 solo comprueba que el conteo de participaciones no cambia. Hay que atacar PUT y DELETE del foro, publicar y calificar en una archivada, y comprobar que no cambian el título, la `version`, el `trabajo_id`, los trabajos de la cola, las entregas ni las calificaciones.
2. **Carreras sobre la misma entrega:** publicar la principal mientras se califica a quien no participó con el foro a punto de cerrar (la frontera del milisegundo de la regla); publicar mientras el admin borra el foro con `?confirmar=entregas`; editar la fecha (reabrir o cerrar) mientras se publica. Nunca `500`, nunca un `P2003` ni un `P2002` sin traducir.
3. **IDOR por ids cruzados:** `participacionId` de otro foro de la misma clase o de otra clase en las rutas 10 y 11; `alumnoId` de otra clase, dado de baja o maestro en 13 a 16; un cursor de otro foro, de otro alumno o de otro hilo en 8, 10, 14, 7 y 15.
4. **Fuga de datos a profundidad:** `enRespuestaA.autor` (ruta 14), el autor admin ("Administración" y sin rol), `conRetraso` de otro alumno visible para un estudiante en las listas 8 y 10 y en la respuesta 201 de una réplica a una principal ajena.
5. **El tipo cruzado en lo que no cambió:** sembrar a mano un comentario del muro en un foro y borrarlo por `DELETE …/publicaciones/:id/comentarios/:cid` y por `DELETE …/mis-comentarios/:cid` (la observación de arriba: esperado `204`, inofensivo; que quede documentado); `PUT …/publicaciones/:foroId/tema` en 01a (esperado `404`, nunca `500`); `?tipo=foro` en la lista del muro.
6. **El recordatorio:** editar con fechas a menos de 24 h y a más, en la frontera exacta; editar un foro sin `trabajo_id`; borrar con un recordatorio ya en curso. Cada caso cancela y recrea en la misma transacción.
7. **Textos y validación:** principal y réplica en los límites exactos (5 000 y 1 000 caracteres visibles), con invisibles, combinantes y `\u0000`; `limite` de 0, 101 y no numérico; y un cuerpo con llaves de más (`requiereAdjuntos`, `tipo`, `autorId`), que se deben ignorar.
8. **El gradebook y el riesgo con foros:** un foro abierto sin principal no cuenta en `vencidasSinEntregar`; calificado sin participar sí sale en la exportación; un foro en una categoría ponderada junto a tareas.

### Para el humano
Nada que decidir. La observación de `borrarComentario` va a `docs/ESTADO.md` §3 con destino "retiro de compatibilidad e higiene de pruebas"; la anota el orquestador al cerrar 01a.

## Verificación de la corrección de M-09 — FORO-01a (2026-11-14)
Veredicto: **ACEPTADO** (el tester puede atacar)

Leí `resumen-programador.md` (335 líneas), sección "Corrección tras la verificación del manager — FORO-01a: M-09 (2026-11-14)", y los tres casos nuevos (`backend/test/foros-calificar.integracion.test.ts:223-409`). El archivo es nuevo de 01a y no está en git, así que lo contrasté leyéndolo entero.

### Mis corridas (desde `backend/`, una a la vez; Docker 28.5.1)
| Comando | Mi última línea | Resumen | ¿Coincide? |
|---|---|---|---|
| `npx vitest run test/foros-calificar` | `Tests  10 passed (10)` · `Test Files  1 passed (1)` | igual | sí |
| `npm run lint` | `> tsc -p tsconfig.json --noEmit && tsc -p tsconfig.test.json` (exit 0) | igual | sí |
| `npx vitest list` de los 5 filtros, contado con `grep -a ' > ' \| grep -ac 'FORO-'` | **95** en 10 archivos; `foros-calificar` tiene 10 | 95 en 10; de 7 a 10 | sí |

### Los tres casos cumplen la viñeta (`plan.md:2030`) y lo que pedía M-09
- **La transición** (`:276-290`). Un foro abierto sin principal del alumno está en `asignadas` y no en `sin-entregar` ni en `entregadas`. El alumno publica su principal por la API real (201), y entonces el foro sale de `asignadas` y aparece en `entregadas`.
- **Los seis estados en los cinco filtros** (`:292-330`). Cada filtro se compara con igualdad exacta sobre la lista de su clase, con `todas` = los seis. El caso comprueba además la `entrega` de cuatro de esos estados en "Mis calificaciones". Es el caso que vigila la separación por fecha entre `asignadas` y `sin-entregar`.
- **FORO-1A24 y FORO-1A44** (`:332-408`). Los mismos seis estados en la lista de foros del alumno (`entrega`) y en "Participantes" (`estado`, `conRetraso`, si trae fecha y `entregadas`).
- **La tabla de hermanos del resumen** coincide, celda por celda, con lo que afirman estos casos y FORO-1A41 de antes. La redundancia que se declara es cierta: el caso de la transición no tiene ningún foro vencido, y M14 lo deja en verde.

### No cambió nada más desde mi verificación
- `git diff fd4a7ad --stat -- backend/src shared/src frontend/src` sigue en `11 files changed, 270 insertions(+), 86 deletions(-)`.
- Los únicos archivos de los paquetes más nuevos que mi entrada anterior de `revision.md` son `foros-calificar.integracion.test.ts` y `adapters/db/calificaciones.ts`, y este último es idéntico a `fd4a7ad` (`git diff --quiet fd4a7ad -- backend/src/adapters/db/calificaciones.ts` → igual). `git status` muestra los mismos archivos que antes.
- Las 291 `*.ataque` son idénticas, byte por byte, a `foro01-arranque/v01-foro01a-r0.txt`: hice `sha256sum` de todas y un `diff` sin diferencias.
- Los SHA-256 de las dos migraciones siguen siendo `8ec418c5…` y `478c2e22…`.

### Arbitraje: M14 y M15 mutaron `adapters/db/calificaciones.ts`, que está en "No se toca"
**Se acepta como desviación declarada.**
- **Por qué:**
  - La guarda que el caso vigila vive en ese archivo. Sin mutarlo, `AGENTS.md` ("Pruebas": una prueba que dice vigilar una guarda se comprueba quitándola) no se podía cumplir.
  - La mutación fue temporal, desde una copia, con `filecmp` byte a byte.
  - Yo mismo comprobé que el archivo quedó idéntico a la base.
  - Hay precedente: K14 de CHORE-06.
- **Lo que no se repite:** hacerlo sin preguntar.

**Regla para el tester desde la ronda 1 de 01a** (y para el programador en adelante):
1. **Mutar un archivo de "No se toca" exige preguntar antes** (por el orquestador). Se nombran el archivo, el ancla exacta y el caso que se quiere comprobar, y se espera la respuesta.
2. **Con permiso, la mutación es temporal:**
   - copia previa;
   - un solo cambio de ancla, que aparece exactamente una vez;
   - corrida de las pruebas nombradas;
   - restauración desde la copia;
   - comparación byte a byte;
   - `git diff --quiet <base> -- <archivo>` (o su SHA-256, si es un archivo nuevo de la subentrega).

   El reporte trae el comando y su resultado.
3. **Nunca se mutan, ni con permiso:**
   - las migraciones, `schema.prisma` y el cliente generado;
   - `infra/`, los `.env*` y `.claude/`;
   - las `*.ataque` de otro encargo.
4. **Un archivo de "Se toca"** se puede mutar sin preguntar, con las mismas condiciones del punto 2.

### Puntos de ataque para la ronda 1
Los ocho que di antes siguen y en el mismo orden. Solo el 8 se precisa: los casos nuevos de M-09 siembran tres de los seis estados con ayudas (`crearEntregaDePrueba`, `calificadaSinParticipar`). El ataque debe recorrerlos por la API real:
- publicar tarde en un foro que acepta tardías;
- calificar a quien participó;
- calificar a quien no participó con el foro cerrado.

Y comprobar los cinco filtros, la lista de foros, "Participantes", el gradebook y la exportación después de cada paso.

## Revisión final — FORO-01a (2026-11-14)
Veredicto: **ESCALAR AL HUMANO**, por un solo punto: la suite completa del backend no salió verde. Fallaron 6 archivos ajenos al foro, todos con `Hook timed out in 10000ms` en `beforeAll`; es el pendiente conocido de `hookTimeout` de ESTADO §3. Lo demás de 01a está **aprobado**: plan, reglas, decisiones del humano, pruebas, "Se toca", V-01, migraciones, frontend completo y PA-07 limpia. No hay nada que corregir en el código de FORO-01a.

Precondiciones: Docker Desktop 28.5.1 con los contenedores de `infra/` de siempre, que no toqué; la red es de confianza solo hoy, por declaración del humano; una sola copia de trabajo; el equipo está conectado a la corriente (`BatteryStatus` = 2), con la CPU al 47 % medida durante la suite del frontend. Corrí todo una cosa a la vez.

### 1. Corridas (comando exacto y última línea)
| Paquete | Comando | Última línea |
|---|---|---|
| shared | `npm run lint` | `All matched files use Prettier code style!` |
| shared | `npm run build` | `> tsc -p tsconfig.json`, exit 0 |
| backend | `npm run lint` | `> tsc -p tsconfig.json --noEmit && tsc -p tsconfig.test.json`, exit 0 |
| backend | `npm run build` | `> tsc -p tsconfig.json`, exit 0 |
| backend | `npm test` (completa, Testcontainers, de 18:59:49 a 19:05:30) | `Test Files  6 failed \| 285 passed (291)` · `Tests  3108 passed \| 58 skipped (3166)` (334 s; `import 805.90s`), **exit 1** |
| backend | los 6 archivos rojos, solos, como diagnóstico (no es una segunda corrida completa: PA-12) | `Test Files  6 passed (6)` · `Tests  58 passed (58)` (15 s) |
| backend | `npx prisma validate` | `The schema at prisma\schema.prisma is valid 🚀` |
| backend | `npx prisma migrate status` | `21 migrations found in prisma/migrations` / `Database schema is up to date!` |
| backend | `npx prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --exit-code` | `No difference detected.`, exit 0 |
| frontend | `npm run lint` | `> tsc -b`, exit 0 |
| frontend | `npm run build` | `✓ built in 1.10s` |
| frontend | `npm run test` (completa, de 19:08:48 a 19:18:57) | `Test Files  345 passed (345)` · `Tests  8372 passed (8372)` (604 s), exit 0 |

- **Cuentas del backend:**
  - **Casos.** 3166 = 3043 del cierre de ADMIN-01 (`docs/ESTADO.md`, "backend `3043 passed`") + 95 casos `FORO-` del programador + 28 `ATQ-FORO-` del tester. C-1 y C-2 cambian casos que ya existían y no suman.
  - **Archivos.** 291 = 275 + los 10 de pruebas nuevas + las 6 `*.ataque` de la ronda 1.
  - **No verdes.** Los 58 `skipped` son los casos de los 6 archivos cuyo `beforeAll` (`construirApp`) venció a los 10 s: `admin-correo.integracion`, `admin-restablecimiento.integracion`, `archivos-d-r2.ataque`, `auth-registro.integracion`, `autorizacion-cuentas.integracion` e `invitacion-flujo-03a-r2.ataque`. Ninguno es del foro y ninguno falló por una aserción.
- **Cuentas del frontend:** iguales a las del cierre de CHORE-06 (345 y 8372). C-6 suma entradas dentro de un caso que ya existía.

### PA-07 sobre la suite completa del backend
- **Conteo:** `40P01` 0 · `deadlock detected` 0 · `could not serialize` 0 · `too many clients` 0 · `"Error no controlado"` 7 · `"code":"P2028"` 5.
- **Control positivo:** están los tres `P2028` de `servicio-ocupado`, en la misma app (pid 29152):
  - `POST /api/auth/cambiar-contrasena`, con `tx.sesion.findFirst()` (`usuarios.ts:293`);
  - `POST /api/auth/refrescar`, con `tx.sesion.updateMany()` (`sesiones.ts:72`);
  - `POST …/publicaciones/:publicacionId/comentarios`, con `$queryRawUnsafe` de `encolar`.
- **Los otros dos `P2028`** son los permitidos de `cuentas-r3` (pid 15188): `POST /api/auth/login`, con `tx.sesion.create()` (`sesiones.ts:39`), y `POST /api/auth/restablecer`, con `tx.tokenCuenta.updateMany()` (`tokens-cuenta.ts:119`).
- **Los 7 "Error no controlado"** son del inventario:
  - `handlers/auth/index.ts:125` ×5 y `:134` ×1, los fallos simulados del login;
  - "boom" de `GET /api/prueba/error-comun`.
- **Los 3 que faltan del inventario de 10** (`handlers/archivos.ts:62` y `:97`, y `handlers/clases/muro.ts:87`) son de `archivos-d-r2.ataque`, uno de los 6 archivos que no arrancaron. Aparecen en la corrida aislada de esos 6, así que no hay ninguno fuera del inventario.
- **PA-07 limpia**, con la salvedad de esos 6 archivos.

### 2. "Se toca", "No se toca", V-01 y migraciones (contra `fd4a7ad`)
- **40 archivos en los paquetes.** Son 19 de producción, 10 pruebas nuevas, la ayuda `ayudas-foros.ts`, 1 de la lista cerrada (`clases-archivadas-matriz`), las 3 `*.ataque` de la ronda 0 y las 6 de la ronda 1. Todos están en la lista de §E7.5.1, §E8.1 y §E9.6, o son pruebas y ayudas nuevas, que §E7.5.0 permite.
- **Producción sin cambio desde mi verificación:** `git diff fd4a7ad --stat -- backend/src shared/src frontend/src` sigue en `11 files changed, 270 insertions(+), 86 deletions(-)`. Ningún archivo de "No se toca" cambió: ni `middleware/`, ni `adapters/auth|notifier|queue`, ni `config/`, `workers/`, `infra/` o `.env.example`, ni `handlers/tareas|clases/*`, `duplicado-de-clase.ts` o `adapters/db/calificaciones.ts`, que es idéntico a la base. Tampoco cambió la producción del frontend.
- **V-01:**
  - Hay 297 `*.ataque`, idénticas a `foro01-arranque/v01-foro01a-r1.txt` (SHA-256 `bdfaa952…`); hice `sha256sum` de todas y un `diff` sin diferencias.
  - Contra la lista de la ronda 0 solo se suman los 6 archivos nuevos del tester. Ninguna se modificó, se saltó ni se borró fuera de C-1, C-2 y C-6.
- **Migraciones:** `8ec418c5…` y `478c2e22…` siguen siendo los SHA-256 que el humano confirmó por escrito, dos veces y con el SQL a la vista (`aprobacion.md`: las dos PARADAS, cada una con "Confirmo, aplícala"). `validate`, `migrate status` y `migrate diff` dan lo de la tabla.

### 3. El plan y las decisiones del humano en 01a
- **RF-66 a RF-68, en el backend de 01a:**
  - crear, leer, editar y borrar un foro con su regla de autoría;
  - participar con la principal y las réplicas, donde "la entrega es participar";
  - calificar a cada alumno con o sin rúbrica, con su devolución;
  - el foro en el gradebook, el riesgo, "Mis calificaciones" y la exportación.

  La lista de foros, el detalle y "Participantes" ya responden. "Actividades" con foros, `conTipo` y el borrado de participaciones son de 01b, como dice el plan.
- **DH-01 a DH-12, donde aplican.**
  - DH-01 (a): el foro como publicación más su fila en `tareas` y `entregas`.
  - DH-02 (a): la regla tardía vive solo en `reglaDeParticipacion`, y calificar la lee (FORO-1A06, (i) y (ii)).
  - DH-03 (a): el maestro replica siempre y sin marca.
  - DH-04 (a): el alumno replica en cualquier principal.
  - DH-06 (a): la devolución va en las rutas 7 y 15.
  - DH-07 (a): `conRetraso` solo para quien debe verlo.
  - DH-09 (a): el muro sin foros. El opt-in de "Actividades" es de 01b.
  - Los textos de DH-12 coinciden letra por letra con §D-2.4.
  - DH-05, DH-08 y DH-11 son de 01b o del frontend.
- **Clase archivada:** las 16 rutas tienen la política de §E7.3 (lecturas con `"lectura"` y escrituras cerradas), la prueban FORO-1B01 a FORO-1B05 y ATQ-FORO-01 a 04, y las 16 filas de ADM-1A09 quedan en verde.
- **M-07:** se cumple con los tres remedios aprobados (`crearPublicacion`, `listarPublicaciones` y la línea del tipo en `core/clases/duplicado.ts`), y FORO-1A08 prueba que el duplicado no copia foros.
- **Pruebas requeridas:** cada una tiene su caso (95 `FORO-`). Cada guarda tiene su mutación real: 15 del programador y 8 del tester (MT1 a MT8, todas en "Se toca"). La redundancia de FORO-1A06 (ii) quedó declarada y la vigila (i).

### 4. Definición de terminado de `AGENTS.md`
- [x] **Cumple RF-66 a RF-68 y RN-05, RN-07, RN-08 y RN-09 en su parte de backend** (RN-09: el alumno restringido recibe `403` en las 16 rutas, FORO-1A49).
- [x] **Capas y middleware:** `core/` puro, Prisma solo en `adapters/` y handlers delgados. Las 16 rutas pasan por `protegido()` con la cadena completa, sin verificaciones a mano (FORO-1A51 estático).
- [ ] **`lint`, `build` y `test` en verde:** `lint` y `build` en los tres paquetes y la suite completa del frontend, sí. **La suite completa del backend, no:** 6 archivos ajenos vencieron por tiempo en su `beforeAll` y pasan solos (tabla 1). Lo decide el humano (sección 9).
- [x] **Pruebas de autorización de cada endpoint nuevo:** la matriz de las 16 rutas cubre sin sesión, rol incorrecto, clase ajena, clase inexistente, alumno restringido, clase archivada y llaves exactas sin estado de pago (FORO-1A49, FORO-1A50, FORO-1B01 a FORO-1B05 y ATQ-FORO-10 a 14).
- [x] **Migraciones de Prisma incluidas y compatibles hacia atrás:** el enum crece, el CHECK acepta lo de antes y la tabla es nueva. R-02 (volver atrás después de crear foros) queda declarado.
- [x] **`infra/` y `.env.example` sin cambio:** `git status` no muestra nada ahí, y 01a no suma ni cambia variables de entorno (`config/` sin cambio).
- [ ] **Documentos:** no toca ninguno ahora. Están en "Documentos al cierre" y van al cerrar el encargo; los README, en 01b (punto 6).

### 5. Lo aceptado sin caso o declarado, en un solo lugar
| Qué | Estado | ¿Va a ESTADO §3? Destino |
|---|---|---|
| **O-r1-1:** el cursor de "Participantes" acepta el id de cualquier usuario como posición (`inscripciones.ts:87-105`) | Aceptado: es R-19 de ADMIN-01, que ya está en §3 ("el roster y el gradebook existentes, riesgo con destino"). No filtra datos | **Sí, ampliando la fila existente de R-19:** "también lo usa 'Participantes' del foro (FORO-01a)". Mismo destino |
| **O-r1-2:** la principal hecha en el milisegundo exacto de la fecha límite, formada detrás de una calificación de "no participó" de un milisegundo después, recibe `409 PARTICIPACION_CALIFICADA` | Aceptado: es la conducta de la tarea (la hora se toma al recibir la petición y la fila de la entrega pone las dos en serie) y ningún RF pide otra cosa | **Sí, junto a DH-02:** "regla tardía del foro, cuando responda el cliente". Si el cliente pide otra frontera, se revisa ahí; no pide una decisión nueva hoy |
| **O-r1-3:** mover un foro de tema (`404`) y borrar un tema con un foro sin contarlo | Declarados para 01b (§E8.1, `TIPOS_CON_TEMA`) | No: lo cierra 01b con FORO-1A25 y FORO-1A26b |
| **Redundancias:** FORO-1A06 (ii) con M11 (la vigila la parte estática, (i)); el caso de la transición de M-09 con M14 (la vigila el de los seis estados) | Declaradas con su mecanismo (`AGENTS.md`, "Pruebas") | No |
| **Desviaciones aceptadas:** `requiereAdjuntos = false` también en `editarTarea`; `exigirVersion` con una función; el conteo de réplicas de FORO-1A15 con el otro índice; `creadoEn = ahora`; `firmaDelAutor` en el adaptador; FORO-1A47 con 14 rutas; 34 → 40 archivos (la ayuda más las 6 `*.ataque` del tester) | Arbitradas en "Verificación del resumen del programador — FORO-01a" | No |
| **Mutación temporal en `adapters/db/calificaciones.ts`** ("No se toca") por M14 y M15 | Aceptada como desviación declarada; el archivo es idéntico a la base. Regla nueva: preguntar antes | **Sí:** proponer al humano que la regla ("mutar un archivo de 'No se toca' exige preguntar antes…") pase a `.claude/agents/tester.md` y `programador.md`. Es la segunda vez (K14 de CHORE-06): la regla de `CLAUDE.md` sobre lo que se corrige dos veces |
| **R-02:** volver a un backend anterior después de crear foros no está garantizado | Declarado; fila de DEPLOY en A-08 | **Sí**, ya prevista en A-08 (DEPLOY: R-01, R-02 y R-04) |
| **`borrarComentario` y `borrarMiComentario` sin filtro de tipo** | No es un riesgo real: inalcanzable por la API | **Sí:** destino "retiro de compatibilidad e higiene de pruebas" (antes de DEPLOY) |
| **La suite completa del backend en rojo por tiempo** (6 archivos en `beforeAll`) | Es la fila de §3 "Tiempo de espera de levantar la app en el backend (CLASES-03a)", con su remedio decidido (`hookTimeout: 30_000`) | **Sí, actualizando esa fila:** "se repitió en el cierre de FORO-01a: 6 archivos, 58 casos, verdes aislados". El destino lo decide el humano (sección 9) |

### 6. Documentos
- **Ahora, al cerrar 01a, solo lo de `docs/trabajo/` y `docs/ESTADO.md`:** las filas del punto 5 y el estado del encargo. Lo aplica el orquestador; `ESTADO.md` queda fuera de "No se toca".
- **En 01b, dentro de la subentrega:** A-05, `backend/src/adapters/README.md` y `handlers/README.md`. Están en "Se toca" de 01b.
- **Al cierre del encargo (después de 01e),** con la autorización del humano, porque están fuera de `docs/trabajo/`:
  - A-01: ESSENTIALS, con la tabla `participaciones_foro`, sus restricciones, la viñeta "Foro" ya decidida y "siete secciones";
  - A-02: el PRD;
  - A-03: `ARCHITECTURE.md` §7 y §14, con las 17 rutas y el modelo;
  - A-04: `CLAUDE.md`;
  - A-06: `DESIGN.md`, que va dentro de 01e;
  - A-07 a A-10: ESTADO.

  Adelantar la tabla a ESSENTIALS ahora es posible (ya existe en `main` desde este commit), pero el plan la deja para el cierre, y DH-16 (a) no lleva nada a `main` antes de 01e. No lo recomiendo.

### 7. Conteo de rondas de 01a (para el registro)
- **Rondas de ataque:** 1, con veredicto RESISTE y 0 hallazgos. **Rondas extra por hermanos o estados vecinos:** 0.
- **Resúmenes devueltos:** 1 (M-09, una viñeta incompleta). Se imputa al programador; no es una ronda del tester.
- **PARADAS:** 2, las dos migraciones, previstas y confirmadas por escrito. No hubo PARADAS imprevistas, ni del programador ni del tester (la ronda 0 se aplicó sin PARADA).
- **Enmiendas del plan:** 3 antes de programar (7, 8 y 9) y ninguna durante.
- **Regla del modelo del programador:** no se activa (0 rondas extra; el umbral es 2). Además, `.claude/agents/programador.md` ya está en `model: opus` (`effort: medium`). La tabla de `AGENTS.md` todavía dice `sonnet`; es una diferencia de documentación anterior a FORO-01, y la anoto para el orquestador.

### 8. El commit de 01a
- `git add -n -A -- backend frontend shared docs/ESTADO.md docs/trabajo/FORO-01-actividad-tipo-foro docs/trabajo/CHORE-06-foco-y-navegacion/aprobacion.md` da **47 rutas**:
  - `backend/prisma` 3: el esquema y las dos `migration.sql`;
  - `backend/src` 16: 13 de producción y 3 pruebas;
  - `backend/test` 17;
  - `frontend/src` 1;
  - `shared/src` 3;
  - `docs/ESTADO.md` 1;
  - `docs/trabajo` 6: los 5 de FORO-01 y el `aprobacion.md` de CHORE-06.
- Son los 40 archivos de los paquetes más 7 documentos.
- `docs/trabajo/DEPLOY-investigacion-vps.md` **queda fuera** (0 coincidencias). El cliente generado de Prisma no entra (lo ignora git).
- No hice ningún `git add` real ni un commit. Con DH-16 (a), el commit queda solo en la rama.

### 9. Para el humano: la decisión que bloquea el cierre
La suite completa del backend de hoy dio `Test Files  6 failed | 285 passed (291)`.
- **Qué falló:** 6 archivos de autenticación, cuentas, invitaciones y archivos, ninguno del foro ni tocado por 01a. Su `beforeAll` (levantar la app) pasó de los 10 s.
- **Por qué:** fue con la máquina cargada; la importación tardó 806 s contra 288 s en la corrida de módulos de esta tarde.
- **Comprobación:** los 6, solos, pasan los 58 casos en 15 s.
- **Es la fila conocida de ESTADO §3,** con el remedio que ya decidiste (`hookTimeout: 30_000` en `backend/vitest.config.ts`) y su lugar en el `chore` de higiene de pruebas, después de ENVIVO.
- **Por PA-12 no repetí la corrida completa** para limpiarla.

Opciones:
- **(a)** Aceptar el cierre de 01a así, con el registro de arriba.
- **(b)** Autorizar una sola corrida completa más del backend, con la máquina descargada.
- **(c)** Adelantar el remedio ya decidido: una línea en `backend/vitest.config.ts`, por el carril trivial, antes de 01b. Ese archivo está fuera de "Se toca" de FORO-01, así que necesita tu autorización.

**Mi recomendación: (c) y luego (b).** El fallo ya se repite en cierres de subentrega, y en el carril sensible conviene que cada cierre tenga una corrida completa verde, no una explicada. Si prefieres no tocar nada ahora, (a) es defendible: nada de lo que cambió FORO-01a está en esos archivos.

**Resumen para el humano (máximo 15 líneas):**
1. FORO-01a (núcleo del foro en el backend: 16 rutas, dos migraciones, la regla tardía en una función) cumple el plan y tus decisiones.
2. El tester no encontró nada (ronda 1 RESISTE, 28 ataques). Hubo un resumen devuelto y corregido (M-09) y ninguna PARADA imprevista.
3. Shared, backend y frontend: `lint` y `build` en verde. Frontend completo en verde: 345 archivos, 8372 casos.
4. Backend completo: 3108 de 3166 casos verdes. Los 58 restantes son de 6 archivos ajenos al foro que no arrancaron por tiempo. Solos, pasan.
5. Necesito tu decisión: (a) cerrar así, (b) otra corrida, o (c) subir el tiempo de arranque ya decidido y volver a correr (mi recomendación).
6. Las dos migraciones son las que confirmaste; no se tocó `middleware/`, `auth`, `infra/` ni `.env.example`.
7. El commit de 01a lleva 47 rutas y deja fuera `DEPLOY-investigacion-vps.md`. Solo va a la rama: el PR se hace al cerrar 01e.
8. A ESTADO §3 van cinco filas: R-19 ampliada, O-r1-2 junto a DH-02, R-02 en DEPLOY, `borrarComentario` al retiro de compatibilidad, y la fila del tiempo de arranque actualizada.
9. Te propongo poner por escrito la regla de "preguntar antes de mutar un archivo de 'No se toca'", que ya se corrigió dos veces.

## Cierre de la revisión final — FORO-01a (2026-11-14)
Veredicto final de la subentrega: **APROBADO**

El humano eligió "Subir el tiempo y repetir" (`aprobacion.md`, "Decisiones del humano al cerrar 01a"). Con `hookTimeout: 30_000`, la suite completa del backend sale verde. Lo demás de la revisión final sigue como estaba.

### 1. Suite completa del backend, repetida (la única repetición, autorizada por el humano)
- **Comando** (Docker 28.5.1, desde `backend/`, de 20:18:26 a 20:22:56): `npm test`. Última línea: `Test Files  291 passed (291)` · `Tests  3166 passed (3166)`, `Duration  254.64s` (`import 544.00s`), exit 0.
  - Antes había dado `6 failed | 285 passed (291)` · `3108 passed | 58 skipped (3166)`.
  - Los 58 casos que faltaban ahora corren y pasan. El total es el mismo.
- **PA-07:**
  - **Conteo:** `40P01` 0 · `deadlock detected` 0 · `could not serialize` 0 · `too many clients` 0 · `"Error no controlado"` 10 · `"code":"P2028"` 5.
  - **Control positivo:** los tres de `servicio-ocupado` (pid 31672):
    - `POST /api/auth/cambiar-contrasena`, por `usuarios.ts:293`;
    - `POST /api/auth/refrescar`, por `sesiones.ts:72`;
    - `POST …/comentarios`, por `$queryRawUnsafe`.
  - **Los otros dos** son los permitidos de `cuentas-r3` (pid 28888): `POST /api/auth/login` (`sesiones.ts:39`) y `POST /api/auth/restablecer` (`tokens-cuenta.ts:119`).
  - **Los 10 "Error no controlado"** son exactamente el inventario: `handlers/auth/index.ts:125` ×5 y `:134` ×1, `handlers/archivos.ts:62` y `:97`, `handlers/clases/muro.ts:87`, y "boom".
  - **PA-07 limpia, sin salvedades.**

### 2. `backend/vitest.config.ts`
- **El cambio:** `git diff -- backend/vitest.config.ts` da `1 file changed, 2 insertions(+)`, exactamente el comentario y `hookTimeout: 30_000,`, junto a `testTimeout: 15000,`. No cambia nada más del archivo.
- **El archivo:** está fuera de "Se toca" de 01a y lo cambió el programador por el carril trivial, con la autorización expresa del humano.
- **Verificación:** `npm run lint` desde `backend/` sigue con `> tsc -p tsconfig.json --noEmit && tsc -p tsconfig.test.json`, exit 0. Es el remedio que el humano decidió el 2026-10-28; su fila de ESTADO §3 se cierra con este cambio.

### 3. `AGENTS.md`
SHA-256 `24cd71ab…`; contra la copia `AGENTS-antes-01a.md` (`239ca2f6…`), `git diff --no-index` da 3 inserciones y 2 eliminaciones.
- **(a) La celda del `programador`:** pasa de "`sonnet`, esfuerzo `medium` (a prueba)" a "`opus`, esfuerzo `medium` (desde TAREAS-01d, 2026-10-07)". Es correcto: `.claude/agents/programador.md` dice `model: opus` y `effort: medium`, y `git log -S"model: opus"` da `1118c1a 2026-10-07` (TAREAS-01d).
- **(b) "Estado vigente…":** es correcto y no reescribe el historial (las decisiones de `sonnet` del 2026-10-02 y del 2026-10-05 quedan como estaban).
- **(c) La viñeta nueva de "Pruebas":** dice lo esencial de mi regla de cuatro puntos y no afirma de más. Tiene un hueco que hay que cerrar, porque choca con una regla que ya existe.
  - En "Reglas del equipo", `AGENTS.md:135` dice que, antes de instruir a un agente sobre un archivo de "No se toca", el orquestador pide autorización **al humano**. La viñeta nueva dice "con permiso" sin decir de quién, y se puede leer como que basta con el del orquestador.
  - Le falta, además, que el ancla aparezca una sola vez, que es lo que garantiza "un solo cambio".
  - **Corrección propuesta (antes → después),** en la misma viñeta:
    - Antes: "Un archivo de "Se toca" se puede mutar sin preguntar: copia previa, un solo cambio, restauración desde la copia y comparación byte a byte. Antes de mutar un archivo de "No se toca", el agente pregunta a través del orquestador, con el archivo, el ancla exacta y el caso que quiere comprobar; con permiso, la mutación es temporal y se restaura igual, …"
    - Después: "Un archivo de "Se toca" se puede mutar sin preguntar: copia previa, un solo cambio en un ancla que aparece una sola vez, restauración desde la copia y comparación byte a byte. Antes de mutar un archivo de "No se toca", el agente pregunta a través del orquestador, con el archivo, el ancla exacta y el caso que quiere comprobar, y el orquestador pide la autorización al humano (como manda "Reglas del equipo" para la lista "No se toca"); con su permiso, la mutación es temporal y se restaura igual, …"
  - El resto de la viñeta se queda como está. La lista de "nunca" es más estricta que el texto que se le mostró al humano (suma el cliente generado y las `*.ataque` de otros encargos), y "Se toca sin preguntar" es la práctica que ya da la viñeta anterior ("mutación real, restaurada"). Ninguna de las dos cosas da más permiso del que había.
  - **No bloquea el cierre de 01a**, pero conviene aplicarla antes de la ronda 0 de 01b, que es donde vuelve a aplicar.
- **Registro pendiente:** `aprobacion.md` ya trae la copia previa (`239ca2f6…`), pero todavía no el SHA-256 resultante (`24cd71ab…`, o el que quede tras la corrección). `AGENTS.md` está en "No se toca", así que se verifica contra ese hash ("Commits y cierre de subentregas").

### 4. Nada más cambió desde la revisión final
- **Producción de 01a:** `git diff fd4a7ad --stat -- backend/src shared/src frontend/src` sigue en `11 files changed, 270 insertions(+), 86 deletions(-)`. Fuera de los paquetes solo cambiaron `backend/vitest.config.ts` y `AGENTS.md`, los dos con autorización.
- **Las `*.ataque`:** son 297, idénticas a `v01-foro01a-r1.txt`; hice `sha256sum` de todas y un `diff` sin diferencias.
- **Migraciones:** `8ec418c5…` y `478c2e22…`, como antes.

### 5. El commit
- **Rutas:** `git add -n -A -- backend frontend shared AGENTS.md docs/ESTADO.md docs/trabajo/FORO-01-actividad-tipo-foro docs/trabajo/CHORE-06-foco-y-navegacion/aprobacion.md` da **49 rutas**: las 47 de antes, más `backend/vitest.config.ts` y `AGENTS.md`. `DEPLOY-investigacion-vps.md` queda fuera (0).
- **Mi postura:** `backend/vitest.config.ts` (carril trivial de pruebas) y `AGENTS.md` (proceso) van en un commit propio, antes del de 01a. Así el commit de 01a es solo el foro, y `AGENTS.md` dice "no mezcles refactor con funcionalidad". Si el humano prefiere uno solo, el mensaje debe nombrar los dos cambios. Lo decide el humano.

### Para el humano
- La suite completa del backend sale verde con el tiempo de 30 s que autorizaste: 291 archivos y 3166 casos, sin ningún rojo.
- 01a queda **APROBADO**.
- Antes de 01b, conviene precisar en `AGENTS.md` que el permiso para mutar un archivo de "No se toca" lo das tú (texto exacto arriba).
- Sobre los commits, mi recomendación es uno propio para `vitest.config.ts` y `AGENTS.md`, y después el de 01a. Tú decides.

## Arbitraje de la ronda 0 — FORO-01b (2026-11-16)
Solo lectura; no corrí suites. Revisé `git diff 451aa35` de los dos archivos, `reporte-tester.md` ("Ronda 0 — FORO-01b"), el plan (§D-3.2, §D-3.3, la fila de `temas.ts` en `plan.md:1474`, E1-9, §E7.5.2 y FORO-1A62) y el código de hoy (`adapters/db/temas.ts`, `handlers/tareas/temas.ts:108-118` y `ayudas-foros.ts`).

### C-T1 · ATQ-FORO-30 (`foros-01a-r1-tipo-y-validacion.ataque.test.ts`): **ACEPTADO**
Lo que el caso exige ahora, contra lo que manda el plan:
1. **`GET …/temas` sin sección, `elementos: 1` para el tema con el foro.** El plan, `plan.md:1474`: "`TIPOS_CON_TEMA` suma `"foro"` (el total, renombrar y mover). (E1-9, N-03) El total sin sección cuenta los foros a propósito". Correcto.
2. **`?seccion=actividades` sin `conForos`, `elementos: 0`.** Misma fila: "`actividades` sigue siendo `{ tipo: "tarea" }`"; solo `"actividades-con-foros"` (que exige `conForos=si`, §D-3.2, `plan.md:1452`) cuenta foros. Correcto.
3. **Mover con `{ temaId: null }` → `200` con `{ publicacionId, temaId: null }`.** El plan pone el foro en `TIPOS_CON_TEMA` también para "mover", así que el `updateMany` de `moverATema` lo encuentra. El código y el cuerpo los decide el handler de hoy (`reply.send(moverElementoRespuestaSchema.parse(movido))`, `temaId: temaId?.toLowerCase() ?? null`), que 01b no cambia (`handlers/tareas/*` está en "No se toca"). Correcto.
4. **La publicación queda sin tema y `tareas.version` pasa de 0 a 1.** `plan.md:1474`: "En `moverATema`, la rama que sube `tareas.version` aplica también a `"foro"`". El foro de prueba nace con la versión por omisión (0). Correcto.
5. **Después, `sinTema` es 1 sin sección y 0 con `?seccion=actividades`.** Sale de 1 y 2. `crearEscenarioDeForo` no crea ninguna otra publicación en la clase (`ayudas-foros.ts:47-50`), así que los conteos exactos son seguros. Correcto.
6. **Lo que no cambia** (el muro con `?tipo=foro` da `400`; "Trabajo" sin `conForos` no lista el foro ni lo acepta como cursor): sigue `plan.md:1473` (sin `conForos`, `tipos` sin `foro`). Correcto.

**Nada pide más ni algo distinto del plan, y no hay nada que decida el arquitecto.** El caso conserva la intención del original: el tipo cruzado por la ruta del muro. Ahora vigila además que mover un foro sube su versión, que es lo que protege a la edición concurrente. Lo que el original afirmaba (`404`) era la conducta de 01a, declarada para 01b en §E8.1.

### C-T2 · ATQ-FORO-10 (`foros-01a-r1-ids-y-fugas.ataque.test.ts`): **ACEPTADO**
Solo acota el filtro (`numero >= 3` pasa a `numero >= 3 && numero <= 16`) y agrega un comentario. Las aserciones son las mismas, las 14 rutas con `:foroId` para cada rol con el foro de otra clase, y `toHaveLength(14)` ya no depende de si 01b suma la ruta 17 a `rutasDelForo`. Los ids cruzados de la ruta 17 los cubre FORO-1A62 (`plan.md:2062-2068`: un foro de otra clase, el id de una tarea o una participación de otro foro dan `404`), como dice el comentario.

### Proceso
- **Lo que pedía el plan.** §E7.5.0 manda PARADA y enmienda si aparece una prueba que el diseño cambia y que no está inventariada. Estas dos son `*.ataque` del propio tester, nacidas en la ronda 1 de 01a, después del plan, que no podía inventariarlas.
- **Por qué basta este arbitraje.** Lo que afirman ahora lo decide el plan letra por letra, así que no hace falta una enmienda.
- **Registro.** El orquestador las anota en `aprobacion.md` como C-T1 y C-T2, con este arbitraje.
- **En adelante,** el tester declara en su ronda 0 las `*.ataque` propias que la subentrega cambia, como hizo aquí, y el manager las arbitra antes de que el programador implemente.

### Las dos vigiladas nuevas: el diseño de 01b las respeta
- **`tareas-01a-r1.ataque:737-746`** exige, en el cuerpo de `moverATema`, `tx.tarea.updateMany` antes de `bloquearTemaParaUsar` y de `tx.publicacion.updateMany`, sin `for`, `while`, `.forEach(` ni SQL crudo. El plan solo amplía la condición de esa rama (de `publicacion.tipo === "tarea"` a tarea o foro), en el mismo lugar. Se cumple si la condición se escribe sin ciclos (`=== "tarea" || === "foro"`, o `.includes(…)`, que no es `.forEach`) y sin mover la llamada de sitio.
- **`temas-01a-r3.ataque:440-485`.**
  - Fija la lista cerrada de archivos de `core/tareas/` y `handlers/tareas/`, más cuatro de `adapters/db`, y les prohíbe `console.`, `estadoPago`, `.rol`, `relacion ===` y comparaciones de rol con texto.
  - El diseño de 01b no crea archivos en esas carpetas: `core/autoria.ts` y `core/foros/` están fuera.
  - En `temas.ts` solo cambian `TIPOS_CON_TEMA`, `FILTRO_DE_LA_SECCION` y la condición de `moverATema`. En `categorias.ts`, el texto del `409` y un `tx.tarea.count({ where: { categoriaId, publicacion: { tipo: "foro" } } })`.
  - Nada de eso necesita `.rol` ni comparar un rol. Si `mensajeConActividades` se escribe en un archivo nuevo de `core/tareas/`, la lista cerrada de la prueba se rompe: tiene que ir en un archivo existente (`core/tareas/categorias.ts`) o fuera de esa carpeta.

### Conteo de 01b
Los dos archivos ya eran de 01a, pero 01b los cambia, así que cuentan en 01b: **~32** (18 de producción, 5 pruebas nuevas, 4 normales y 5 `*.ataque`: C-1 bis, C-3, C-7, C-T1 y C-T2). Sigue en "unos 30" y no hace falta partir; el humano aceptó 01a en ~33.

## Verificación del resumen del programador — FORO-01b (2026-11-16)
Veredicto: **ACEPTADO** (el tester puede atacar)

Resumen: `resumen-programador.md`, "Implementación — FORO-01b (2026-11-16)", 556 líneas, SHA-256 `ea31390e…` (coincide). Base `451aa35`. Precondiciones: Docker 28.5.1; el equipo conectado a la corriente (`BatteryStatus` = 2); la red de casa, confirmada por el humano; no corre otra suite. Corrí todo una cosa a la vez.

### 1. Mis corridas contra las del resumen
| Comando | Mi última línea | ¿Coincide? |
|---|---|---|
| `shared`: `npm run lint` | `All matched files use Prettier code style!` | sí |
| `shared`: `npm run build` | `> tsc -p tsconfig.json`, exit 0 | sí |
| `backend`: `npm run lint` | `> tsc -p tsconfig.json --noEmit && tsc -p tsconfig.test.json`, exit 0 | sí |
| `backend`: `npm run build` | `> tsc -p tsconfig.json`, exit 0 | sí |
| `backend`: `npx vitest run` con los 38 filtros de la §7, tal cual | `Tests  1901 passed (1901)` · `Test Files  177 passed (177)` (09:44 a 09:46) | sí |
| PA-07 sobre esa salida | `40P01`, `deadlock detected`, `could not serialize`, `too many clients`, "Error no controlado" y `P2028`: 0 en los seis | — |
| `backend`: `npx vitest list` de los 6 filtros de la §7, contado con `grep -a ' > ' \| grep -av '\.ataque\.' \| grep -ac 'FORO-'` | **134** en 16 archivos, con el mismo reparto (los 5 nuevos con 3, 18, 6, 4 y 4; `errores.test.ts` con 4) | sí |
| `backend`: `npx prisma migrate status` | `21 migrations found` / `Database schema is up to date!` | sí |
| `backend`: `npx prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --exit-code` | `No difference detected.`, exit 0 | sí |
| `frontend`: `npm run lint` | `> tsc -b`, exit 0 | sí |
| `frontend`: `npm run build` | `✓ built in 873ms` | sí (cambia solo el tiempo) |
| `frontend`: `npx vitest run src/lib` | `Tests  296 passed (296)` · `Test Files  23 passed (23)` | sí |
| `frontend`: `npx vitest run src/features/clases` | `Tests  3068 passed (3068)` · `Test Files  124 passed (124)` | sí |
| `frontend`: `npx vitest run src/features/tareas` | `Tests  1355 passed (1355)` · `Test Files  42 passed (42)` | sí |
| `frontend`: `npx vitest run src/features/calificaciones` | `Tests  474 passed (474)` · `Test Files  23 passed (23)` | sí |

- **V-01:** hay 297 `*.ataque`, idénticas a `v01-foro01b-r0.txt`; hice `sha256sum` de todas y un `diff` sin diferencias.
- **`backend/prisma/`:** sin cambios contra `451aa35`.
- **`git status`:** 33 archivos en los paquetes, los de la §1 del resumen. Nada de "No se toca".

### 2. "Se toca" (§E7.5.2) contra `451aa35`
- **`adapters/db/tareas.ts`:** cambian `listarTrabajoCon` y `listarTrabajo` (solo el tipo de `seccion`), `ElementoDeTrabajoDb.tipo` y dos constantes privadas (`TIPOS_DE_LA_SECCION` y `tipoDeTrabajo`, que estrecha con un `ERROR_INTERNO` inalcanzable, como en 01a).
- **`categorias.ts`:** solo el texto del `409` y el conteo de foros en su camino.
- **`calificaciones.ts`:** `SELECT_TAREA` (suma `tipo`), `columnaDe` (lo estrecha a `"tarea" | "foro"`, con un error inalcanzable) y el campo `tipo` de la interfaz, que hace falta.
- **`core/autoria.ts`:** solo `puedeBorrarParticipacion`.
- **`shared/src/recursos.ts`:** solo la línea del tema, más su import.
- **La lista cerrada:** los 4 archivos, como dice el plan. Las filas y los títulos, contrastados con el diff.
- **`ayudas-foros.ts`:** solo gana `rutaDeBorrarParticipacion`, que §E7.5.0 permite. El conteo de 33 es correcto (~32 + la ayuda).

### 3. Reglas que no se rompen
- **Ruta 17** (`handlers/foros.ts`, al final):
  - lleva `protegido({ roles: ["admin"], pertenencia: "propiedad" })` sin `enClaseArchivada`, así que en una archivada queda cerrada también para el admin (S-E3-1);
  - el handler valida `participacionParamSchema`, pasa `perfilDe(request)` y responde `204`, o `404 "Ese foro ya no existe."` si el adaptador devuelve `false`;
  - ninguna verificación de rol se hace a mano: la regla es `puedeBorrarParticipacion` de `core/` (`actor.rol === "admin"`), dentro del adaptador.
- **`borrarParticipacion`** (`adapters/db/foros.ts`), en READ COMMITTED y con el orden del proyecto (tareas, entregas, participaciones):
  - bloquea la fila del foro, con `bloquearTareaParaEntregar`;
  - comprueba el tipo;
  - busca la participación (`404`);
  - aplica `puedeBorrarParticipacion` (`403`, inalcanzable por la ruta);
  - si es principal, bloquea la entrega del autor y **vuelve a leer la principal después del bloqueo** (M-06 y E5-1: el segundo de dos borrados responde `404`, nunca `500`);
  - aplica `efectoDeBorrarPrincipal`: calificada, conserva todo (DH-05 y E5-4); entregada, vuelve a `asignado` con `version + 1` (PB-2 a);
  - borra con `deleteMany`, y las réplicas caen por la FK.

  Sin SQL crudo, sin ciclos y sin encolar (FORO-1A69). Todo va por PK, por el único `(tarea_id, alumno_id)` y por `(principal_id, …)` para la cascada.
- **`puedeBorrar`:** sale de `core/` con el actor de la petición. En la respuesta `201` de una réplica (alumno o maestro), `false`. FORO-1A70 y FORO-1A50 lo prueban, con llaves exactas y sin estado de pago en las 17 rutas.
- **El opt-in:**
  - `conForos` y `conTipo` son `z.literal("si").optional()`, así que otro valor o uno repetido da `400`;
  - `conForos` exige `seccion=actividades` (`superRefine`);
  - el `.transform` deja una sola llave, `seccion`, así que los handlers de `tareas` no cambian (están en "No se toca");
  - `columnaParaResponder` solo suma `tipo` con `conTipo === "si"`, y la exportación nunca lo pide;
  - sin los parámetros, la respuesta es la de siempre, llave por llave (FORO-1B06 y FORO-1A25).
- **Consultas:**
  - `listarTrabajoCon` usa el mismo `where` con un `tipo in`, y las entregas de la página en una sola consulta;
  - el gradebook lee `publicacion.tipo` en la relación que ya leía;
  - el `409` de categorías suma una sentencia, solo en su camino de error.

  Sin N+1, todo por los índices de hoy.
- **Errores de Prisma:** `alFaltarReferencia` (`P2003` y `23503`) vive en `adapters/db/errores.ts`, el único archivo que conoce esos códigos. `publicarReplica` traduce así el caso en que el admin borró la principal en medio (`404`, nunca `500` ni `P2003`).

### 4. Pruebas requeridas de 01b
- **Cada viñeta tiene su caso con el título que cita la §6:** FORO-1A25 (4), FORO-1A26b (2), FORO-1A60 a FORO-1A70, FORO-1B06 (4), FORO-1B08, FORO-1B09 y FORO-1B10 (2), y FORO-1B04 en ADM-1A09.
- **Revisé el cuerpo de FORO-1B10 y FORO-1B09:**
  - FORO-1B10 tiene llaves exactas sin `activo` ni `cuentaDesactivada`, `404 ALUMNO_NO_ENCONTRADO` en la ruta 13 y vuelta atrás al reactivar;
  - FORO-1B09 (el archivo del planteamiento no se copia) y FORO-1B08 (el objeto va a la cola de borrado) afirman lo que pide su viñeta.
- **La ruta 17 en la matriz:** la tabla de la §2 del resumen cubre sin sesión, rol, restringido, clase inexistente, ids cruzados, clase archivada, llaves exactas y la cadena estática (FORO-1A49, FORO-1A50, FORO-1A51, FORO-1A62 y FORO-1B01).
- **Mutaciones:** 15 en archivos de "Se toca", cada una con su caso que cae (la regla nueva de `AGENTS.md`).
- **Las dos redundancias están bien declaradas:**
  - con N1, el `403` del adaptador es inalcanzable porque `requireRole` corta antes, y la regla la vigilan FORO-1A60 y FORO-1A70;
  - con N3, el doble borrado de una calificada no escribe la entrega, y la relectura la vigilan los otros dos casos.

### 5. Arbitraje de las desviaciones
1. **`mensajeConActividades` en `adapters/db/categorias.ts`: aceptado.**
   - Reemplaza a `mensajeConTareas`, que ya vivía ahí (el texto del `409` estaba en el adaptador desde TAREAS-01). No mueve una regla de dominio de capa: es el texto de un error que el adaptador ya lanzaba.
   - Respeta `temas-01a-r3.ataque:440-485`: no hay archivo nuevo, ni `.rol`, ni comparaciones de rol. Lo comprobé en el diff.
   - Es el texto del plan aprobado (§D-3.3, E1-9: "«X» tiene {total} actividad(es). Muévelas a otra categoría antes de quitarla.", y el de hoy, letra por letra, con solo tareas).
   - El complemento de DH-12 son los textos del editor del frontend (01d), no este `409`.
2. **`actor` en lugar de `actorId` en `listarParticipaciones` y `listarReplicas`: aceptado.** Hace falta para `puedeBorrarParticipacion`. Las dos funciones son nuevas de FORO-01a, así que no cambia ninguna firma de otro encargo. El handler pasa `perfilDe(request)` entero, como pide FORO-1A51.
3. **`borrarParticipacion` devuelve `false` si el foro no existe o es de otro tipo: aceptado.** Es el mismo contrato que las rutas 3 a 16 (`404` "Ese foro ya no existe."), y la participación que falta la lanza el adaptador.
4. **`columnaParaResponder` con una flecha: aceptado y necesario.** Pasada por referencia a `.map`, el índice entraría como `conTipo`.
5. **`23503` además de `P2003`: aceptado.** Con el driver adapter, PostgreSQL entrega su código en `meta`, que `errores.ts` ya leía para el `22021`. Los códigos siguen solo en `adapters/db/errores.ts`.
6. **`ayudas-foros.ts` con una exportación más y el conteo de 33: aceptado** (§E7.5.0: "una ayuda existente solo gana exportaciones").
7. **FORO-1A67 y FORO-1A68 frente al orden de la fila retenida: aceptados como deterministas.**
   - Cada operación se lanza solo después de que `formadasDetrasDe` confirma que la anterior ya espera la fila (`wait_event` `transactionid` o `tuple`), y la siguiente queda formada detrás del candado de la tupla.
   - PostgreSQL concede ese candado en el orden de llegada. Es el mismo mecanismo que `conFilaRetenida`, que el proyecto usa desde CHORE-02 sin falsos rojos.
   - Si alguna vez fallara, sería PA-12 (se reporta sin repetir). La salida es sumar la comprobación de que la operación siguiente espera a la anterior, no a la retención.

   No hace falta cambiar nada ahora.

### 6. Hermanos
Contrasté la tabla de la §4 del resumen con el código:
- **Temas:** `TIPOS_CON_TEMA` suma `foro`, con el total, renombrar y mover. `FILTRO_DE_LA_SECCION` lleva `actividades` (solo tareas) y `actividades-con-foros` (tareas y foros).
- **Mover:** la rama de la versión aplica también al foro, en el mismo lugar que vigila `tareas-01a-r1.ataque:737-746`.
- **"Actividades", categorías, gradebook, "Mis calificaciones", exportación, riesgo (FORO-1A66), borrado definitivo, duplicado y baja:** cada fila tiene su caso.
- **Estados del borrado:** la tabla de la §4 cubre los once, con su caso.
- **Detalle sin caso propio:** "renombrar un tema" cuenta el foro (`elementos` en la respuesta de `PUT …/temas/:temaId`). Lo cubre el mismo `TIPOS_CON_TEMA` que vigila N6, pero ningún caso lo afirma. No bloquea; queda como punto de ataque.

### 7. Puntos de ataque para la ronda 1 de 01b, por prioridad
1. **Concurrencia del borrado, más allá de FORO-1A67 y FORO-1A68:**
   - borrar una principal contra el borrado del foro (`borrarTarea`, `FOR UPDATE` de la fila de tareas) en los dos órdenes;
   - borrar contra volver a publicar después de "sin participar", con el foro abierto;
   - borrar contra un archivado de la clase que confirma después del sexto paso (la carrera que ADMIN-01 aceptó en ADM-T1A04);
   - dos réplicas en vuelo y el borrado de su principal.

   En todos: nunca `500`, `P2003` ni `P2002` sin traducir, y la entrega siempre en un estado válido (`version` sube una sola vez).
2. **`puedeBorrar` y las llaves:**
   - `true` solo para el admin en las listas 8 y 10;
   - `false` en la `201` de una réplica del maestro y del alumno;
   - nunca `estadoPago`, `rol` ni correo, también en la vista del admin y en una clase archivada (lectura).
3. **El opt-in:**
   - `conForos`: con `SI`, vacío, repetido, con `seccion=aprendizaje` o `docente`, en `GET …/recursos` y en `GET …/temas` sin sección;
   - `conTipo`: en la exportación, en "Mis calificaciones" de una clase anterior (`lectura-del-alumno`) y en el gradebook de una archivada;
   - un frontend viejo (sin los parámetros): llave por llave, igual a `451aa35`, con un foro en la clase;
   - un material como cursor con `actividades-con-foros`, y un foro como cursor de un tema distinto.
4. **El texto del `409` de categorías:**
   - una categoría con solo foros, con un foro y una tarea, con 1 y con N;
   - dos categorías que se quitan a la vez (el texto debe ser de la primera con actividades y su cuenta de foros, no la de la otra).
5. **Temas:**
   - renombrar un tema con un foro (su `elementos`, sin caso propio);
   - borrar un tema con un foro: pasa a «Sin tema» y la confirmación lo cuenta;
   - mover un foro contra editarlo (el `409 TAREA_MODIFICADA` por la versión que sube al moverlo).
6. **ADMIN-01 con foros** (FORO-1B08 a FORO-1B10), con datos más ricos:
   - réplicas de un maestro dado de baja en una clase archivada que se borra o se duplica;
   - un alumno calificado dado de baja y reactivado;
   - el conteo del diálogo con una principal borrada por el admin antes.
7. **La regla nueva de `AGENTS.md`:** toda mutación en un archivo de "No se toca" se pregunta antes, por el orquestador, y el humano autoriza.

### Para el humano
Nada.

## Revisión final — FORO-01b (2026-11-16)
Veredicto: **APROBADO**

Precondiciones: Docker 28.5.1; el equipo conectado a la corriente (`BatteryStatus` = 2); la red de casa, confirmada por el humano; no corre otra suite. Corrí todo una cosa a la vez.

### 1. Corridas (comando exacto y última línea)
| Paquete | Comando | Última línea |
|---|---|---|
| shared | `npm run lint` | `All matched files use Prettier code style!` |
| shared | `npm run build` | `> tsc -p tsconfig.json`, exit 0 |
| backend | `npm run lint` | `> tsc -p tsconfig.json --noEmit && tsc -p tsconfig.test.json`, exit 0 |
| backend | `npm run build` | `> tsc -p tsconfig.json`, exit 0 |
| backend | `npm test` (completa, de 10:14:43 a 10:18:31) | `Test Files  299 passed (299)` · `Tests  3223 passed (3223)` (`Duration  221.78s`), exit 0 |
| backend | `npx prisma validate` | `The schema at prisma\schema.prisma is valid 🚀` |
| backend | `npx prisma migrate status` | `21 migrations found in prisma/migrations` / `Database schema is up to date!` |
| backend | `npx prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --exit-code` | `No difference detected.`, exit 0 |
| frontend | `npm run lint` | `> tsc -b`, exit 0 |
| frontend | `npm run build` | `✓ built in 993ms` |
| frontend | `npm run test` (completa, de 10:19:59 a 10:27:36) | `Test Files  345 passed (345)` · `Tests  8372 passed (8372)` (`Duration  453.22s`), exit 0 |

- **Cuentas del backend:**
  - **Archivos.** 299 = 291 del cierre de 01a + 5 pruebas nuevas + 3 `*.ataque` de la ronda 1.
  - **Casos.** 3223 = 3166 + 39 casos `FORO-` del programador (de 95 a 134) + 18 `ATQ-FORO-` del tester. Las de la lista cerrada y las de la ronda 0 cambian casos que ya existían.
- **Frontend:** igual que al cierre de 01a, como se esperaba (C-7 suma entradas dentro de un caso que ya existía).
- **PA-07 sobre la suite completa del backend:**
  - **Conteo:** `40P01` 0 · `deadlock detected` 0 · `could not serialize` 0 · `too many clients` 0 · `"Error no controlado"` 10 · `"code":"P2028"` 5.
  - **Control positivo:** los tres de `servicio-ocupado` (pid 18956): `cambiar-contrasena` (`usuarios.ts:293`), `refrescar` (`sesiones.ts:72`) y `comentarios` (`$queryRawUnsafe`).
  - **Los otros dos** son los permitidos de `cuentas-r3` (pid 20356): `login` (`sesiones.ts:39`) y `restablecer` (`tokens-cuenta.ts:119`).
  - **Los 10 "Error no controlado"** son exactamente el inventario: `auth/index.ts:125` ×5 y `:134`, `archivos.ts:62` y `:97`, `muro.ts:87`, y "boom".
  - **PA-07 limpia.**

### 2. "Se toca", "No se toca", V-01
- **Dentro de los paquetes, contra `451aa35`:** 36 archivos (18 de producción, 5 pruebas nuevas, 4 de la lista cerrada, `ayudas-foros.ts`, las 5 `*.ataque` de la ronda 0 y las 3 de la ronda 1). La producción es la que verifiqué en el resumen, sin cambios. `backend/prisma` no cambió.
- **Fuera de los paquetes, contra `fd4a7ad`:**
  - `infra/`, `.claude/`, `CLAUDE.md` y `docs/DESIGN.md` no cambiaron (`git diff --quiet` limpio);
  - `AGENTS.md` solo cambió por el cierre de 01a, y su SHA-256 `b874bf2c…` es el registrado en `aprobacion.md`;
  - el resto son `docs/trabajo/FORO-01-…`, `docs/ESTADO.md` y `DEPLOY-investigacion-vps.md`, que no entra.
- **V-01:** hay 300 `*.ataque`, idénticas a `v01-foro01b-r1.txt` (`60b38386…`); hice `sha256sum` de todas y un `diff` sin diferencias. Solo cambiaron las 5 de la ronda 0 (C-1 bis, C-3, C-7, C-T1 y C-T2) y se sumaron las 3 del tester.

### 3. El plan y las decisiones del humano en 01b
- **DH-05 con PB-1 (a), PB-2 (a), S-E3-1, S-E3-2 y la Enmienda 5:**
  - solo el admin borra (ruta 17, `roles: ["admin"]` y `puedeBorrarParticipacion`);
  - nadie edita y el alumno no borra lo suyo;
  - la calificación se conserva y el alumno calificado no vuelve a publicar pero sí replica (FORO-1A65);
  - sin calificación, la entrega vuelve a "sin participar" (FORO-1A66);
  - en una clase archivada nadie borra (FORO-1B01, ATQ);
  - no se avisa ni queda registro de quién borró (FORO-1A69);
  - M-06: dos borrados dan `204` y `404` (FORO-1A67, ATQ-FORO-6x).
- **DH-09 (a), el opt-in:**
  - sin `conForos` ni `conTipo`, la respuesta de "Trabajo", los temas con sección, el gradebook y "Mis calificaciones" es la de `451aa35`, llave por llave (FORO-1A25, FORO-1B06 y ATQ-FORO-80, con un frontend viejo y un foro en la clase);
  - la excepción declarada en E1-9 es el total de temas sin sección, que cuenta los foros.
- **DH-17 (a):** el borrado definitivo cuenta el foro y lo borra en cascada sin tocar ADMIN-01 (FORO-1B08, con el objeto del planteamiento en la cola).
- **DH-18 (a):** las participaciones de una cuenta dada de baja siguen con su nombre y sin marca (FORO-1B10, los dos casos).
- **P-10:** el duplicado no copia foros (FORO-1B09).
- **README (A-05):** `handlers/README.md` y `adapters/README.md` describen las 17 rutas, la política de clase archivada, el opt-in y `esActividadDeTipo`.
- **Pruebas requeridas:** cada una tiene su caso (39 `FORO-` nuevos). La ronda 1 suma 18 `ATQ-FORO-`.
- **Guardas:** 15 mutaciones del programador y 5 del tester (MB4 reforzó ATQ-FORO-84 con un caso determinista), todas en "Se toca". Las redundancias N1 y N3 están declaradas con su mecanismo.

### 4. Definición de terminado (01b)
- [x] **RF-66 a RF-68 y RN-07, RN-08 y RN-10, en su parte de backend:** moderación del admin, "Actividades" con foros, tipo en el gradebook, y borrado y duplicado de clases con foros.
- [x] **Capas y middleware:** la ruta 17 va por `protegido()` con la cadena completa; la regla vive en `core/` y los códigos de Prisma en `adapters/db`.
- [x] **`lint`, `build` y `test` en verde:** shared, backend y frontend, con las suites completas (tabla 1).
- [x] **Pruebas de autorización del endpoint nuevo:** la matriz de la ruta 17 y las 17 rutas con llaves exactas, sin estado de pago.
- [x] **Migración:** no aplica; 01b no cambia el esquema (`migrate diff` sin diferencias).
- [x] **`infra/`, `.env.example` y `config/` sin cambio:** no cambió la configuración.
- [x] **Documentos:** los README van en el diff; lo demás va al cierre del encargo (punto 6).

### 5. Lo aceptado o declarado, en un solo lugar
| Qué | Estado | ¿A ESTADO §3? |
|---|---|---|
| **O-01b-1:** la lista de foros trae `entrega: null` si el alumno nunca tuvo fila, y `{ estado: "asignado", conRetraso: false }` si el admin le borró la principal | Es §D-3.2 ("`null` … o sin fila"). Con la fecha y el retraso iguales, la interfaz debe pintar lo mismo | **No.** Va al plan del frontend (abajo) |
| **O-01b-2:** `puedeBorrar` es `true` para el admin también en una clase archivada, donde la ruta 17 responde `409` | Es la regla del plan (§D-11). El backend niega la escritura, y el frontend la oculta con el contexto de solo lectura de ADMIN-01 | **No.** Ya lo cubre FORO-1C14 (01c2): en una archivada no se pinta ningún control de escritura del foro. En 01d, "Borrar" del admin (FORO-1D35) dice "nunca en una archivada" |
| **O-01b-3:** `conForos` en `GET …/recursos` se ignora con `200` | `recursosQuerySchema` no es estricto, como el de temas; el plan no lo define; no trae foros | **Sí, junto a la fila de retiro de compatibilidad (antes de DEPLOY):** al retirar el opt-in del foro (R-E7-4), se revisa que los esquemas de consulta no acepten parámetros que no son suyos |
| Desviaciones aceptadas en la verificación del resumen: `mensajeConActividades` en el adaptador, `actor` en las listas, `false` y `404` en `borrarParticipacion`, la flecha de `columnaParaResponder`, `23503` y la ayuda | Arbitradas | No |
| Redundancias N1 y N3 (programador) y MB4 reforzada (tester) | Declaradas con su mecanismo | No |
| C-T1 y C-T2 (ronda 0) | Arbitrados y aceptados ("Arbitraje de la ronda 0 — FORO-01b") | No |

**Cómo debe llegar O-01b-1 al programador de 01c1 y 01d.**
- **Lo que ya cubre el plan:** S-10 manda pintar el estado del alumno con `estadoDeEntregaVisible`, sin cambios, y esa función ya trata igual `null` y `{ asignado, conRetraso: false }` (las dos caen en "Asignado" o "Sin entregar" según la fecha; `lib/estado-de-entrega.ts`).
- **Lo que no fija ninguna prueba requerida:**
  - FORO-1C02 (01c1, la fila de la lista de foros) pide "fila con estado del alumno";
  - FORO-1D29 (01d, la fila en "Actividades") pide la insignia y el destino;
  - ninguna de las dos exige las dos formas.
- **No hace falta una enmienda.** En el encargo de la ronda 0 de 01c1 y de 01d, el orquestador pide al tester que sus casos (o un C-n propio) incluyan una fila con `entrega: null` y otra con `{ asignado, conRetraso: false }`, con el foro abierto y vencido, y que comprueben la misma insignia.
- **Al programador** se le dice que FORO-1C02 y FORO-1D29 cubren las dos formas.

### 6. Documentos del cierre de 01b
- El plan pide en 01b solo A-05 (los README), y ya están en el diff.
- Todo lo demás va al cierre del encargo, con la autorización del humano para lo que está fuera de `docs/trabajo/`:
  - ESSENTIALS: la tabla, las restricciones, las reglas del foro y de autoría con el borrado del admin, y "siete secciones";
  - PRD: RF-66 a RF-68, RN-07 y RN-08;
  - `ARCHITECTURE.md`: §7 con las 17 rutas y los dos parámetros, y §14;
  - `CLAUDE.md`;
  - `DESIGN.md`, en 01e;
  - ESTADO.
- Ahora solo se toca `docs/ESTADO.md`, con el estado del encargo y la fila de O-01b-3.

### 7. Conteo de rondas de 01b
- **Rondas de ataque:** 1, RESISTE, 0 hallazgos. **Rondas extra:** 0.
- **Resúmenes devueltos:** 0. **PARADAS:** 0. **Enmiendas del plan:** 0.
- **C-n del tester arbitrados en la ronda 0:** 2 (C-T1 y C-T2), los dos aceptados sin corrección.
- **Regla del modelo del programador:** no se activa (0 rondas extra); el programador sigue en `opus`.

### 8. El commit de 01b
- `git add -n -A -- backend frontend shared docs/ESTADO.md docs/trabajo/FORO-01-actividad-tipo-foro` da **41 rutas**:
  - `backend/src` 15: 13 de producción, `borrado.test.ts` y `errores.test.ts`;
  - `backend/test` 15;
  - `frontend/src` 1;
  - `shared/src` 5;
  - `docs/ESTADO.md` 1;
  - `docs/trabajo` 4: `aprobacion.md`, `reporte-tester.md`, `resumen-programador.md` y `revision.md`.
- `docs/trabajo/DEPLOY-investigacion-vps.md` **queda fuera** (0).
- No hice `git add` real ni commit. El commit queda en la rama (DH-16 a).

### Para el humano
1. FORO-01b cierra el backend del foro: el admin borra participaciones y réplicas, el foro aparece en "Actividades" y en los temas, el gradebook trae el tipo, y el foro funciona ante el borrado, el duplicado y la baja de cuentas.
2. Todo, con las reglas que decidiste: solo el admin modera, la calificación se conserva, nada se avisa ni se registra, y en una clase archivada nadie borra.
3. El tester no encontró nada (18 ataques). No hubo resúmenes devueltos, PARADAS ni enmiendas.
4. Suites completas en verde: backend, 299 archivos y 3223 casos; frontend, 345 archivos y 8372 casos.
5. Sin migraciones; no se tocó `middleware/`, `auth`, `infra/` ni `.env.example`.
6. Un frontend viejo recibe exactamente lo de hoy: el foro solo aparece con los parámetros nuevos.
7. El commit lleva 41 rutas y deja fuera `DEPLOY-investigacion-vps.md`; solo va a la rama.
8. Siguiente: 01c1, la sección "Foro" en el frontend. Dos observaciones del tester ya tienen su lugar en las pruebas de 01c y 01d.


## Verificación del resumen del programador — FORO-01c1 (2026-11-16)

**Veredicto: DEVUELTO** (M-10). Además, una decisión del humano sobre el texto del error de la primera página (desviación 1; ver "Para el humano"). Las cifras del resumen coinciden todas con mis corridas; lo que vuelve es la cobertura de una viñeta.

Base: `ebbcb40` (01b). Resumen leído: `resumen-programador.md`, "## Implementación — FORO-01c1 (2026-11-16)" (733 líneas, SHA-256 `c428bfa0…`). Solo frontend: no corrí nada del backend ni hizo falta Docker. Nadie más corría una suite (lo confirmó el orquestador). Corrí todo una cosa a la vez, desde `frontend/`.

### Mis cifras contra las del resumen
| Qué | Resumen | Mi corrida | ¿Coincide? |
|---|---|---|---|
| `npm run lint` | `All matched files use Prettier code style!`, `> tsc -b`, salida 0 | `All matched files use Prettier code style!` · `> tsc -b` · exit 0 | Sí |
| `npx vitest run src/features/clases` | `Test Files  126 passed (126)` · `Tests  3099 passed (3099)` | `Test Files  126 passed (126)` · `Tests  3099 passed (3099)` (301.78 s) | Sí |
| `npx vitest run src/app src/lib src/styles src/features/tareas/como-se-entrega-01a.test.tsx` | `Test Files  63 passed (63)` · `Tests  1111 passed (1111)` | `Test Files  63 passed (63)` · `Tests  1111 passed (1111)` (65.76 s) | Sí |
| `npm run build` | `✓ built in 882ms` | `✓ built in 904ms` | Sí (el tiempo varía) |
| Casos nuevos (`npx vitest list` de las dos pruebas nuevas, con `grep -a`) | 31 = 27 + 4 | `npx vitest list src/features/clases/foros-01c.test.tsx src/features/clases/recuperar-foros-01c.test.tsx`: 31 con `grep -a -c` (27 de `foros-01c` y 4 de `recuperar-foros-01c`) | Sí |
| `grep -rho "enEspera=" frontend/src --include=*.tsx --exclude=*.test.tsx \| wc -l` | 91 (90 en la base; 1 en `foros-view.tsx`) | 91; 90 en `ebbcb40` (`git grep`); `grep -c` en `foros-view.tsx` = 1 | Sí |
| Archivos | 23: 7 de producción, 2 nuevas, 7 de la lista cerrada y 7 `*.ataque` | `git diff --name-only ebbcb40` y los no rastreados: los mismos 23. Fuera de `frontend/`, solo `docs/trabajo/FORO-01…` y `ESTADO.md`. `infra/`, `.claude/`, `CLAUDE.md` y `DESIGN.md` siguen iguales a `fd4a7ad`, y `AGENTS.md` conserva su SHA-256 (`b874bf2c…`) | Sí |

### "Se toca" y la lista cerrada (§E8.3, §E8.2 y §E7.5.0), contra `ebbcb40`
- **Producción (7):** cada archivo tiene solo lo que §E8.3 le asigna:
  - `trabajoService.ts`: solo las dos claves;
  - `hooks.ts`: solo `useForos`;
  - `types.ts`: solo las dos reexportaciones de `@campus/shared`;
  - `router.tsx`: solo la ruta `foro` en las tres ramas;
  - `data.ts`: la sección, `LIMITE_FOROS`, `TEXTOS_FOROS` y PR-1A17 (sale `TEXTOS_FORMULARIO_PUBLICACION.sinTema` y `TEXTOS_TRABAJO.sinTema` pasa a `TEXTOS_DE_LA_CLASE.sinTema`);
  - `fila-de-entrega.tsx`: las dos props opcionales.

  `grep` de `TEXTOS_FORMULARIO_PUBLICACION.*sinTema` en `src/`: solo queda el comentario de la prueba.
- **Lista cerrada:** cotejé cada línea "antes → después" de §E8.2 en `git diff -U0`:
  - `secciones-03c1.test.tsx`: los diez puntos;
  - `clase-layout.test.tsx`: los ocho;
  - `lib.test.ts`: los seis;
  - `recursos-lib-03d.test.ts`: los tres;
  - `router-01d.test.tsx`: los cinco. Las tres listas quedaron en varias líneas por Prettier, con el mismo contenido;
  - `dudas-caminos-03e.test.tsx`: uno;
  - `como-se-entrega-01a.test.tsx`: `:262` y el tipo de `:241` (desviación 2, aceptada abajo).

  Ningún cambio fuera de lo listado.
- **"No se toca":** `lib.ts`, `dudas-view.tsx`, `components/*`, `lib/errores-de-api*` y `services/apiClient.ts` siguen sin cambios. Las siete `*.ataque` son las de los C-n del tester, iguales a `v01-foro01c1-r0.txt` según el orquestador.

### Las reglas del frontend en `foros-view.tsx`
Todas se cumplen:
- **CH6-A30 (a):** `key={claseId}` en el render prop de `ConClaseDeLaRuta`, en una línea (`:192`).
- **«Ver más foros»:** `enEspera={foros.isFetching}` (`:155`), `fetchNextPage({ cancelRefetch: false })` en el manejador con nombre `handleVerMas` (`:91-97`), con la guarda `cargandoMasRef`. Sin `isFetchingNextPage`.
- **La política única y §7.10:**
  - `useListaConservadaTrasLaPagina(claveListaDeForos(claseId), …)` con la `queryKey` exacta de `useForos`;
  - `useAvisoDeRecargaFallida` con `claseId`;
  - `useRecargarAlPulsarLaSeccion(foros)`;
  - `useMarcarViejaSiQuedoEnError(claveListaDeForos(claseId))`;
  - `useFocoAlCargarMas`.
- **Ningún aviso ante `CODIGOS_QUE_REDIRIGE_EL_CLIENTE`:** el aviso sale solo con la lista conservada. FORO-1C53 cubre «Ver más».
- **Ningún texto del servidor sin traducir:** `mensajeDeErrorDeLista` y `mensajeDeConsultaClases`, de `lib.ts`.
- **Tipos y textos:** el tipo viene de `./types` (reexportado de `shared`); los textos, de `TEXTOS_FOROS`.
- **Componentes:** los de `components/ui/` (`Button`, `buttonVariants`, `Card`) y los compartidos (`MensajeError`, `Cargando`, `EstadoVacio`, `EstadoEntregaBadge`). Solo tokens (`text-h2`, `text-small`, `text-muted-foreground`). Sin vidrio propio, sin `disabled`, sin `?? []` ni `fetch(`.
- **Orden de los estados:** error → cargando → vacío → datos (`:116-131`).
- **Clase archivada:** "Crear foro" no se pinta con `useSoloLecturaDeLaClase()`.
- **Una sola acción principal:** "Crear foro", `primary`.
- **Importaciones:** ninguna de otro módulo de `features/`.

### Pruebas requeridas de 01c1
Cada viñeta tiene su caso con el título exacto que da el resumen. Los leí todos, y afirman lo que pide la viñeta, **salvo FORO-1C51 (M-10)**:
- FORO-1C01 (su parte, §E9.5): los cinco índices en las tres perspectivas, y el router real con las siete secciones, el `href` y `aria-current`.
- FORO-1C02:
  - cargando → vacío → datos;
  - la primera página en `500`, sin aviso;
  - el conteo en singular, en plural y en cero, con "Crear foro" y su `href`;
  - la frase del alumno y sus insignias;
  - **las dos formas de la entrega** (`null` y `{ estado: "asignado", conRetraso: false }`), con el foro abierto y vencido: el texto de las filas es igual por pares, "Asignado" en las abiertas y "Sin entregar" en las vencidas (`foros-01c.test.tsx:354-378`). **Confirmado:** cubre lo que O-01b-1 pedía.
- FORO-1C03: el cursor, el foco en la primera fila nueva, que el botón ya no se ofrezca, y la espera durante la recarga.
- FORO-1C14 (la lista): maestro y admin en una clase archivada, sin "Crear foro" (según el resumen, F7 lo tumba).
- FORO-1C50 (Ver más), FORO-1C52 (la lista entre dos clases), FORO-1C53 (los tres códigos, con el destino de `irA`) y FORO-1C54 (sus cuatro estados).
- **La frase de recuperación (FORO-1C20 a FORO-1C23):** con el router real y `Providers`, un caso por cada camino:
  - pulsar «Foro» estando ahí;
  - ir a «Avisos» y volver;
  - atrás y adelante;
  - «Ver más» no se ofrece y no hay aviso.

  Cada uno exige que la primera petición nueva vaya sin cursor y que la frase desaparezca. "Otro filtro u otra ventana" no aplica, porque la lista no los tiene. El salto a Foro de otra clase y de vuelta queda como punto de ataque: el plan no lo inventarió.
- **Matriz de §D-10:** la contrasté con el código. Sus dos correcciones son ciertas:
  - el texto de la primera página es el genérico, lo que deja una decisión al humano;
  - la lista conservada no muestra el error mientras la recarga vuela.

  Una fila contradice el código (N-29).
- **Hermanos frente a `DudasView`:** cada fila de la tabla del resumen coincide con el código, incluida la diferencia a propósito de la `key`. Dos puntos:
  - "no aplica" para `useFilaEnFoco`: la razón (no hay acciones por fila) es cierta. El estado vecino "una recarga correcta quita la fila enfocada" queda en N-28;
  - los estados vecinos están completos salvo "dos fallos seguidos" (N-30) y los dos caminos de M-10.

### Problemas que bloquean

#### M-10 — FORO-1C51 cubre un solo camino de los tres que nombra su viñeta
- **Dónde:** `frontend/src/features/clases/foros-01c.test.tsx:487-513`, el único caso de la segunda mitad de FORO-1C51. El resumen lo mapea a la viñeta completa.
- **Qué pide el plan:** §E7.4, FORO-1C51: "Mientras una recarga la recupera (**pulsar "Foro", volver o saltar de clase**), la lista se ve sin mensaje de error; si esa recarga falla, la reemplaza". Es también el texto de `DESIGN.md` §7.10, "Error de la página siguiente".
- **Qué hay:** solo "pulsar «Foro»". No hay caso para "volver" (ir a otra sección y regresar antes de 30 s con la lista conservada) ni para "saltar de clase" (de A a B y de vuelta a A, con la lista de A conservada).
- **Por qué importa:**
  - Son los caminos en que la vista **se monta de nuevo con la recarga en vuelo**. Es la clase de defecto de CHORE-06b (T-04 y T-05) que resolvió la memoria por consulta de `useListaConservadaTrasLaPagina` (`hooks.ts:1341-1350`, que nombra esos mismos caminos).
  - En Foro pesan más que en Dudas. `ForosDeLaClase` lleva `key={claseId}` y Dudas no, así que el salto de clase desmonta y vuelve a montar la lista de Foro, mientras que la de Dudas sobrevive. El mecanismo es el mismo gancho, pero el estado vecino es otro. "Pulsar «Foro»" no lo ejercita: ahí la vista no se monta de nuevo.
  - La regla del manager pide que cada viñeta tenga su caso **y que afirme lo que la viñeta pide**.
- **Qué se espera:**
  - Un caso por cada camino que falta: "volver" y "saltar de clase", este con el historial o con la navegación de la barra.
  - Cada uno afirma que, mientras la recarga vuela, la lista se ve sin `role="alert"`, y que si la recarga falla la reemplaza.
  - Cada uno se comprueba con una mutación: por ejemplo, F6 (sin conservar) y, para el salto de clase, la memoria del gancho.
  - La tabla de pruebas requeridas del resumen se corrige con los títulos nuevos.

### Problemas que no bloquean (se corrigen en el resumen de la corrección)
- **N-28 — La vista no tiene la raíz de §D-8.2, y no se declaró.**
  - §D-8.2 pide "raíz `tabIndex={-1}` y `useFocoAlPerderseElControl`". La vista sigue a `DudasView`: el `h2` lleva `tabIndex={-1}`, y `useFocoAlPasarAError` lleva el foco ahí cuando la lista pasa a error.
  - §E7.3, punto 5 ("sigue a `DudasView` en todo lo de la lista") lo permite, y ninguna lista de `features/clases` usa `useFocoAlPerderseElControl`. **Lo acepto.**
  - Lo que queda fuera: una recarga **correcta** que quita la fila que tenía el foco deja el foco en `<body>`. Ni Dudas (su efecto con `vecinaDeFila`) ni el gancho de la raíz cubren ese caso aquí. Es alcanzable con `refetchOnReconnect`, que sigue activo por defecto (`app/providers.tsx:14` solo apaga `refetchOnWindowFocus`).
  - El programador lo declara como desviación en la corrección. El tester lo ataca (ver "Para el tester").
- **N-29 — Una fila de la matriz contradice el código.**
  - La fila "«Ver más foros» · `400` del cursor" dice "La lista sale de la caché". No sale: queda en error con sus datos.
  - Al salir, `useMarcarViejaSiQuedoEnError` la marca vieja. Al volver, o al pulsar la sección, la política única la pide desde la primera página. Es lo que retiró el `removeQueries` de §D-8.2 (§E7.3, punto 5).
  - Se corrige el texto de esa fila.
- **N-30 — Falta un caso para "dos fallos de «Ver más foros» seguidos".**
  - La razón que da el programador es válida: el gancho es el mismo de Dudas, con su prueba. Pero la lista de Foro se monta de otra forma (`key={claseId}`).
  - Con la corrección de M-10, conviene sumar ese caso: dos avisos, uno por fallo, y la lista se queda. Es barato. Si no se suma, queda como punto de ataque.

### Desviaciones arbitradas
1. **El texto del error de la primera página: decide el humano** (ver "Para el humano").
   - **(a) El plan sí lo pide, en ese lugar.**
     - §D-9, fila `ForosView`: "error de la consulta: "No pudimos cargar los foros."" (DH-12).
     - §D-10, fila "Primera página · `5xx` o red": "Reemplaza ("No pudimos cargar los foros.")".
     - §D-8.2 no da el texto. §E7.3, punto 5 manda seguir a `DudasView` en los ganchos y las políticas de la lista, y dice que "el texto de la lista cambiada y el error que quita el acceso reemplazan la lista, como en Dudas". No retira el texto del error.
     - Ante un `5xx`, Dudas, Avisos, Recursos y un tema de Actividades muestran el genérico del módulo ("Algo salió mal. Inténtalo de nuevo."), con la misma `mensajeDeErrorDeLista`; hay nueve llamadas, contando la de Foro.
   - **(b) Se puede sin tocar `lib.ts`, pero no queda bien.**
     - `mensajeDeErrorDeConsulta` (`lib/errores-de-api.ts:113-128`) ya acepta un `respaldo`, que es el texto fijo del lugar ante red, código desconocido o `VALIDACION` sin campo. Con `TEXTOS_FOROS.error` en `data.ts`, la vista podría llamar a `esErrorDeCursor(e) ? TEXTOS_FOROS.cambioMientrasLosVeias : mensajeDeErrorDeConsulta(e, TRADUCCION_DE_ERRORES_CLASES, TEXTOS_FOROS.error)`.
     - Ninguna prueba estática lo prohíbe, y hay vistas que importan del contrato (`esErrorDeCursor`, en `usuarios-view.tsx` y `entregas-view.tsx`).
     - Pero así la vista clasifica errores en línea, cuando la regla 3 de `CLAUDE.md` y la convención del módulo (los envoltorios de una línea en `lib.ts`) lo ponen en `lib.ts`, y además duplicaría `mensajeDeErrorDeLista`. No lo recomiendo.
   - **(c) Lo limpio es abrir `features/clases/lib.ts`, que no está en el "Se toca" de ninguna subentrega.**
     - Bastaría un parámetro opcional `respaldo` en `mensajeDeErrorDeLista`, que se pasa a `mensajeDeErrorDeConsulta`. Las nueve llamadas de hoy no cambian.
     - Iría en 01c1, en esta misma ronda de corrección. Ampliar "Se toca" pide la aprobación escrita del humano (§E7.5.0, carril sensible).
   - **Otro dato:** el texto aprobado dice qué pasó, pero no qué hacer. `DESIGN.md` §7.10 pide las dos cosas ("No pudimos cargar tus clases. Revisa tu conexión e inténtalo de nuevo."), y el genérico sí dice qué hacer.
2. **`como-se-entrega-01a.test.tsx:241`: es parte del mismo cambio.**
   - El tipo del `import.meta.glob` es la declaración que lee la línea 262. Si PR-1A17 cambia esa línea a `TEXTOS_FORMULARIO_RECURSO.sinTema` sin tocar el tipo, `tsc -b` falla. Si no la cambia, la prueba lee `undefined`.
   - La intención es la de la lista cerrada (§E7.5.3, "lee `TEXTOS_FORMULARIO_RECURSO.sinTema`"). **Aceptado.**
   - Nota para el arquitecto: el grep de §E7.5.3 (`TEXTOS_FORMULARIO_PUBLICACION\.sinTema`) no alcanza la forma de tipo `TEXTOS_FORMULARIO_PUBLICACION: { sinTema: string }`. En las próximas listas cerradas conviene buscar también los parámetros de tipo de `import.meta.glob`.
3. **`rotulo` y `complemento` de `FilaDeEntrega`, y la fila del alumno sin `entrega`: cumplen §D-8.2 y no cambian lo que ya existía.**
   - **Cumple §D-8.2:** la fila lleva "estado de `vencimientoDe`", y "el alumno ve **además** su `EstadoEntregaBadge` (`estadoDeEntregaVisible`)". Si se pasara `entrega`, la segunda línea diría el estado y la insignia lo repetiría. La desviación 4 del resumen es la lectura literal del plan.
   - **No cambia lo existente:** el único otro uso es `seccion-de-tema.tsx:141`, que no pasa ninguna de las dos props. Toma el `rotulo` "Tarea:" por omisión y no pinta el `span` del complemento, porque el render es condicional. Su DOM no cambia.
   - **`DESIGN.md`:**
     - el complemento usa `text-small` y `text-muted-foreground`, que son tokens;
     - el estado va en texto, no solo en color;
     - `shrink-0` y `min-w-0` cuidan los 360 px.
   - **Consecuencia de diseño, que se documenta en 01e:**
     - en "Actividades", la fila del alumno dice el estado en la segunda línea, con los colores de §7.7 (y desde 01d también la de un foro, que pasa `entrega`);
     - en "Foro", la segunda línea dice el vencimiento y el estado va en la insignia;
     - el mismo foro se leerá distinto en las dos secciones. Va al humano como dato para la comprobación de 01e (ver "Para el humano").
4. **Las dos redundancias y la prueba reforzada: aceptadas.**
   - **F2 (la guarda con ref):** `fetchNextPage({ cancelRefetch: false })` devuelve la promesa en vuelo y no pide otra página; CH4-03 vigila ese `cancelRefetch` de forma estática. Dudas no lleva ref.
     - La viñeta de FORO-1C50 ("sin la guarda, dos") no se puede cumplir con esa opción. La redundancia queda declarada con su mecanismo, como pide `AGENTS.md`, "Pruebas".
     - En los hechos, FORO-1C50 vigila la combinación: cae solo si se quitan la guarda y la opción juntas.
   - **F5 (`useMarcarViejaSiQuedoEnError`):** su redundancia con TanStack Query 5.103.2 está escrita en `CLAUDE.md` ("Ubicaciones compartidas", `components/seccion/`).
   - **F14:** sumar al caso de FORO-1C51 la aserción del foco en el `h2`, y probarla con el foco en una fila (con el foco en «Ver más foros», `useFocoAlCargarMas` lo tapaba), es el remedio correcto. Comprobé la aserción en `foros-01c.test.tsx:503-512`.
5. **"Dos fallos de «Ver más» seguidos" sin caso propio:** la razón es aceptable, pero conviene el caso (N-30).
6. **El patrón visual nuevo en 01e: basta.**
   - §E7.3, punto 9 nombra "la fila de un foro" entre los patrones que van a `DESIGN.md` §7.34 en 01e, con la marca "propuesta (FORO-01)". §E7.5.0 solo deja tocar `DESIGN.md` en 01e. El encargo es FORO-01 y 01e es parte de él, así que se cumple la regla de `AGENTS.md`.
   - **Condición, que verifico en la revisión final de 01e:** §7.34 describe el complemento a la derecha (la insignia del alumno y el conteo atenuado del maestro y del admin) y la diferencia con la fila del alumno de §7.7.

### Para el tester (ronda 1 de 01c1, después de la corrección), por prioridad
1. **La lista conservada con la vista montada de nuevo:**
   - con `key={claseId}`, de A a B y de vuelta a A por el historial con la recarga de A en vuelo, después de que falle «Ver más foros»;
   - salir y volver con la misma recarga en vuelo;
   - dos fallos seguidos de «Ver más foros» con la vista montada de nuevo entre uno y otro.

   Se espera un solo aviso por fallo, ningún aviso heredado y la lista sin `alert` mientras la recarga vuela.
2. **El aviso que llega sin dueño:** en FORO-1C52, después de que A falla con la vista desmontada, volver a A. ¿Aparece entonces el aviso del fallo viejo? Mismo caso con la página de A en vuelo y el reintento (`retry: 1`) durante el salto.
3. **El foco:**
   - una recarga correcta que quita la fila enfocada, con `refetchOnReconnect` o una invalidación (N-28): ¿el foco cae en `<body>`?;
   - «Ver más foros» cuando la página siguiente llega vacía o solo con filas repetidas (`unirPaginasSinRepetidas` no está en la vista): ¿a dónde va el foco y se repiten claves de React?;
   - el cursor vencido con el foco en «Ver más foros».
4. **La frase "Vuelve a abrir Foro" por los caminos que el plan no inventarió:**
   - saltar a Foro de otra clase y volver, con el historial y con la barra (`ForosView` se queda montada y solo cambia la `key`);
   - pulsar «Foro» dos veces seguidas con la frase a la vista.
5. **El mensaje de error de la primera página según el código:**
   - `5xx` sin cuerpo, sin red, `503 SERVICIO_OCUPADO` con un texto vacío o de solo espacios;
   - `VALIDACION` de `claseId`, `VALIDACION` con una ruta, `403 SIN_ACCESO_A_LA_CLASE` y `404` de la clase;
   - los tres códigos con que `apiClient` redirige en la **primera** página (FORO-1C53 solo cubre «Ver más»).

   Se espera un solo mensaje legible y ningún aviso. Si el humano elige otro texto, se prueba con ese.
6. **Las filas:**
   - `fechaLimite` en los bordes (vence hoy, mañana, vencida por minutos), con el reloj fijo: la segunda línea y la insignia no se contradicen;
   - títulos largos sin espacios a 360 px, junto al complemento;
   - `participaciones` muy grandes (el esquema ya rechaza las negativas, una `entrega` ausente y una fecha ilegible);
   - si la ruta del alumno llega a una clase archivada, la vista sin la frase.
7. **Las reglas estáticas sobre `foros-view.tsx`:** CH4-04 (no lee `isFetchingNextPage`), CH6-A30 (a), V-06 (91) y V-07 (sin vidrio propio); y que `features/clases` siga sin tipos fuera de `types.ts` (`ElementoDeForo` solo se reexporta).

### Para el humano
**Decisión: el texto del error al cargar la lista de foros.**

Si la lista de foros no carga por un fallo del servidor o de la red, la vista muestra hoy "Algo salió mal. Inténtalo de nuevo.", igual que Dudas, Avisos y Recursos. El texto que aprobaste en DH-12 es "No pudimos cargar los foros.". Para mostrarlo bien hay que tocar un archivo que el plan no deja tocar.

- **(A) Aceptar "Algo salió mal. Inténtalo de nuevo."**
  - No cambia ningún archivo.
  - Es el mismo texto de las demás secciones de la clase.
  - Dice qué hacer, como pide `DESIGN.md` §7.10.
  - Queda registrado que el texto de DH-12 no se usa.
- **(B) "No pudimos cargar los foros.", armado en la propia vista.**
  - No amplía la lista de archivos.
  - Pero la vista clasifica errores en línea, contra la convención del módulo. No lo recomiendo.
- **(C) "No pudimos cargar los foros." con un cambio de una línea en `features/clases/lib.ts`.**
  - Un parámetro opcional, sin cambiar las otras ocho listas.
  - Pide tu aprobación por escrito para sumar ese archivo a la lista de esta subentrega, porque es el carril sensible.
  - Si eliges C, sugiero "No pudimos cargar los foros. Inténtalo de nuevo.", para que diga qué hacer.

**Recomiendo (A),** por ser la misma conducta en todas las secciones y no abrir otro archivo. Con B o C, el programador lo aplica en esta misma ronda de corrección, con sus casos.

**Para la comprobación en el navegador de 01e** (el dato de la desviación 3):
- en "Foro", el alumno ve el estado de su participación en una insignia a la derecha ("Entregado", "Sin entregar", "Calificado", con el vocabulario de las tareas);
- en "Actividades" (desde 01d), el mismo foro lo dice en la segunda línea de la fila.

Es lo que dice el plan. Si prefieres que se lean igual, o palabras propias de un foro ("Participaste"), es un cambio de diseño y de textos para 01d o 01e.


## Verificación de la corrección de M-10 — FORO-01c1 (2026-11-16)

**Veredicto: ACEPTADO.** M-10 queda corregido y N-28, N-29 y N-30 quedan atendidos. Las cifras del resumen coinciden con mis corridas. El remedio de producción de N-28 cumple las reglas. Las tres rutas sin caso van al tester (punto 3). Pasa a la ronda 1 del tester.

**Cómo verifiqué:**
- **Resumen leído:** `resumen-programador.md`, "## Corrección tras la verificación del manager — FORO-01c1: M-10 (2026-11-16)" (873 líneas).
- **Decisión del humano:** el texto de error queda en el genérico, registrado en `aprobacion.md:450`.
- **Corridas:** solo frontend, una a la vez, desde `frontend/`.
- **Alcance:**
  - frente a `ebbcb40`, `hooks.ts` sigue solo con `useForos`, y `lib.ts` y `components/` no cambian;
  - siguen siendo los mismos 23 archivos;
  - los SHA-256 de `foros-view.tsx` (`099c3eaa…`) y de `hooks.ts` (`2892d76c…`) coinciden con los que el resumen da después de restaurar las mutaciones.

### Mis cifras contra las del resumen
| Qué | Resumen | Mi corrida | ¿Coincide? |
|---|---|---|---|
| `npm run lint` | salida 0, `> tsc -b` | `> tsc -b` · exit 0 | Sí |
| `npx vitest run src/features/clases` | `Test Files  126 passed (126)` · `Tests  3105 passed (3105)` | `Test Files  126 passed (126)` · `Tests  3105 passed (3105)` (296.20 s) | Sí |
| `npx vitest run src/app src/lib src/styles src/features/tareas/como-se-entrega-01a.test.tsx` | `Test Files  63 passed (63)` · `Tests  1111 passed (1111)` | `Test Files  63 passed (63)` · `Tests  1111 passed (1111)` (65.25 s) | Sí |
| `npm run build` | `✓ built in 853ms` | `✓ built in 911ms` | Sí (el tiempo varía) |
| `npx vitest list` de las dos pruebas nuevas, con `grep -a -c` | 37 = 33 + 4 | 37: 33 de `foros-01c` y 4 de `recuperar-foros-01c` | Sí |
| `enEspera=` en producción | 91 | 91 (`grep -rho "enEspera=" frontend/src --include=*.tsx --exclude=*.test.tsx \| wc -l`) | Sí |

### 1. Los casos de M-10 afirman lo que pide la viñeta
Están en `foros-01c.test.tsx:628-723`.
- **Usan el router real** (`montar` sin cliente propio, o sea `Providers`, con `staleTime` de 30 s y `retry: 1`).
- **Preparación común:**
  - la lista queda conservada por un `503` de «Ver más foros», con un aviso;
  - `retenerLaPrimeraPagina` retiene cada petición de la primera página, incluido el reintento.
- **Mientras la recarga vuela** (`enVueloSinError`):
  - "Foro 6" está a la vista;
  - no hay `role="alert"` ni el texto genérico;
  - el foco no se mueve.
- **Después:**
  - si la recarga responde, no hay `alert`;
  - si falla, aparece el `alert` y la lista se va.
- **"Volver":** pulsar «Avisos» desmonta `ForosView` y pulsar «Foro» la monta de nuevo.
- **"Saltar de clase":** con `[Foro de B, Foro de A]` y `navigate(-1)` y `navigate(1)`, `ForosView` se queda montada, pero `ForosDeLaClase` cambia de `key` de A a B y de vuelta a A. El montaje nuevo ocurre en los dos caminos, y en el salto se exige un solo aviso en total.
- **La variante que falla demuestra que la recarga sí se pidió en cada camino:** si no hubiera petición, no aparecería el `alert` y el caso caería.
- **Detalle menor:** en la variante que responde, "Foro 25" ya estaba en la lista conservada, así que esperarlo no prueba que la respuesta llegó. Lo prueba la variante que falla, que es la que importa. No bloquea.
- **Mutaciones que da el resumen:** G1 (la memoria por consulta, en `hooks.ts`) tumba 5 casos y F6 tumba 8. Con eso, los casos vigilan el remedio y no solo el estado final.

N-30 (`:725-736`, dos avisos, la lista y el botón siguen) y N-28 (`:738-757`, con `invalidateQueries` y el foco en el `h2`) afirman lo que les pedí.

### 2. El remedio de N-28 en producción
Está en `foros-view.tsx`: `useFilaEnFoco("data-foro-id")` y un efecto sin dependencias que lleva el foco al `h2` cuando `filaEnFocoRef.current !== null && focoPerdido(document)`.

**Cumple `CLAUDE.md`:**
- El gancho con estado (`useFilaEnFoco`) vive en `hooks.ts`, y `focoPerdido` en `lib.ts`. El efecto de la vista solo los combina, igual que el efecto de foco de `DudasView` (`dudas-view.tsx:106-138`). No es un gancho nuevo en línea.
- Usa retornos tempranos.
- La memoria es la de la fila enfocada en esta instancia, no la de la consulta. Es correcta: lo que se recuerda es el foco de este montaje, y con `key={claseId}` empieza en `null` en cada clase.

**No rompe los otros caminos del foco:**
- **El error:** el efecto y `useFocoAlPasarAError` llevan el foco al mismo `h2`, sin pelear.
- **«Ver más foros»:** el botón está fuera del `<ul>`. Al entrar en él, `useFilaEnFoco` deja la ref en `null`, así que el efecto no actúa y manda `useFocoAlCargarMas` (FORO-1C03 sigue verde).
- **El cambio de clase:** la instancia vieja se desmonta sin correr el efecto, y la nueva arranca con la ref en `null`. Manda `ClaseLayout` con `useFocoAlTituloDeLaClase` (`clase-layout.tsx:52`), que lleva el foco perdido a la raíz y de ahí al título de la clase, como dice `DESIGN.md` §7.14 ("al cambiar de clase, al título de la clase").

**Frente a `DudasView` (CHORE-06a, H-R2): un hermano bien resuelto, no un hueco.**
- Dudas, si la fila enfocada sigue en la lista, vuelve a enfocarla; si salió, va al control equivalente de la vecina o a la vecina, y sin vecinas, al encabezado. También corrige el cambio de clase con `clasePrevia`, porque su componente sobrevive a ese cambio.
- Foro no tiene acciones por fila. §7.14 dice que, en las listas de la clase, "una fila con el foco lo lleva al encabezado de la lista"; la regla de la vecina de §7.14 es para "una acción **confirmada** que quita la fila", que aquí no existe. El `h2` es el destino correcto.
- `clasePrevia` sobra con `key={claseId}`.
- **Dudas no tiene este hueco hoy:** su efecto cubre cualquier recarga, correcta o fallida (`:117-137`). No hay pendiente con destino.
- **Detalle (no bloquea):** el comentario de la vista y el resumen dicen "si ese foro ya no está", pero el efecto no comprueba `ids`: mueve el foco con solo perderse. Se distingue solo si el foco se pierde con la fila todavía a la vista, como al pulsar un espacio en blanco, que se cubre con el `setTimeout` de `useFilaEnFoco`. Queda como punto de ataque 4.

### 3. Las tres rutas sin caso: puntos de ataque del tester, no otra devolución
Por qué:
- **El deber de inventariar es del plan.** `AGENTS.md` ("Toda frase de recuperación…") lo pone en el arquitecto. El contrato del programador son las viñetas del plan, y las cuatro de FORO-1C20 a FORO-1C23 tienen su caso, uno por camino. Ya en la primera verificación dejé estas rutas como puntos de ataque, no como devolución; devolver ahora por ellas cambiaría la regla a mitad de la subentrega.
- **"Saltar a Foro de otra clase y volver con la frase a la vista"** es un camino real, distinto de FORO-1C22, porque cambia la `key` y no desmonta `ForosView`. Pero el mecanismo ya está probado por partes:
  - la consulta de A queda en error;
  - al desmontarse `ForosDeLaClase`, `useMarcarViejaSiQuedoEnError` la marca vieja (y TanStack 5.103.2 la deja inválida);
  - al volver, se pide de nuevo.

  Es lo mismo que acaban de probar los dos casos de "saltar de clase" de M-10, con la lista en error conservada, y lo que prueba FORO-1C54, "salir y volver con la lista en error". El riesgo es bajo y el tester lo ataca primero.
- **"Pulsar «Foro» dos veces con la frase a la vista"** no es otro camino: es el camino de FORO-1C20 repetido, una prueba de robustez (la política única no debe duplicar). Es ataque.
- **Los tres códigos con que `apiClient` redirige en la primera página** no son un camino de la frase. Son un vecino de FORO-1C53, cuya viñeta en 01c1 solo nombra «Ver más foros»; la vista no avisa en la primera página por construcción (`useAvisoDeRecargaFallida` solo avisa con la lista conservada). Es ataque.
- **"A falla con la vista desmontada y luego se vuelve a A"** es un vecino de FORO-1C52. El caso de "saltar de clase" ya fija un solo aviso al volver con un fallo conservado. Es ataque.
- **Si el tester rompe alguno,** la ronda extra se anota contra el inventario del plan, no contra el programador.
- **Nota para el arquitecto (al cierre de FORO-01):** en una sección con `key={claseId}`, el salto a la misma sección de otra clase es un camino propio de cada frase de recuperación.

### 4. La redundancia de F14: aceptada
- `useFocoAlCargarMas` (`components/foco/hooks.ts:144-167`) lleva el foco al encabezado cuando el botón se desmonta con el foco dentro, por cualquier causa: la última página, el error o el cursor vencido.
- El efecto de N-28 cubre las filas.
- En la lista no queda otro control enfocable que se pierda: "Crear foro" no se desmonta por una recarga.
- La redundancia queda declarada con su mecanismo, como pide `AGENTS.md`, "Pruebas". Conservar el gancho por paridad con `DudasView` es lo que manda §E7.3, punto 5.

### Detalles menores
- El resumen repite el encabezado de la sección (`resumen-programador.md:735` y `:738`). Es un defecto de transcripción, sin efecto.
- Las dos filas corregidas de la matriz (N-29 y el texto de error) coinciden con el código y con la decisión del humano.

### Para el tester: puntos de ataque de la ronda 1 de 01c1, por prioridad
1. **La frase "Vuelve a abrir Foro" por el salto de clase:**
   - con la frase a la vista en A, ir a Foro de B y volver a A, con el historial y con la barra;
   - se espera la primera página sin cursor, la frase fuera y ningún aviso;
   - además, pulsar «Foro» dos veces seguidas con la frase a la vista: una sola petición.
2. **El aviso heredado:**
   - A falla en «Ver más» con su vista desmontada (FORO-1C52) y luego se vuelve a A: ¿sale el aviso viejo?;
   - mismo caso con el reintento (`retry: 1`) en vuelo durante el salto;
   - dos fallos con un montaje entre ellos.
3. **Los tres códigos de redirección en la primera página, y en una recarga de la lista conservada:** ningún aviso.
4. **El foco del efecto de N-28:**
   - un clic en un espacio en blanco con una fila enfocada, seguido de un render (por ejemplo, una recarga en vuelo que llega): ¿el foco salta al `h2` sin que se haya perdido una fila?;
   - cambiar de ventana o de pestaña con una fila enfocada y una recarga que llega;
   - la fila enfocada sigue en la lista, pero la lista pasa por "Cargando".
5. **Una página siguiente vacía, o con filas repetidas** (la vista no usa `unirPaginasSinRepetidas`): claves de React repetidas y a dónde va el foco tras «Ver más foros».
6. **El mensaje de la primera página para cada código:**
   - `5xx` sin cuerpo, sin red y `503` con el texto vacío: el genérico, según la decisión del humano;
   - `VALIDACION` de `claseId` o con ruta, `403 SIN_ACCESO_A_LA_CLASE` y `404`.

   Se espera un solo mensaje legible y ningún aviso.
7. **Las filas:**
   - fechas en el borde, con el reloj fijo (la segunda línea y la insignia no se contradicen);
   - títulos largos a 360 px junto al complemento;
   - conteos muy grandes.
8. **Las reglas estáticas sobre `foros-view.tsx`:** CH4-04, CH6-A30 (a), V-06 (91), V-07, y que no haya tipos fuera de `types.ts`.


## Revisión final — FORO-01c1 (2026-11-16)

**Veredicto: APROBADO.** No hay problemas que bloqueen. Lint, build y la suite completa del frontend salen en verde y las cuentas cuadran. No hay nada fuera de "Se toca" y V-01 sale limpio. El plan y la decisión del humano sobre el texto de error se cumplen.

**Verificación propia:** lint en verde · build `✓ built in 1.02s` · test `Test Files  349 passed (349)` · `Tests  8442 passed (8442)`.

### 1. Corridas
Desde `frontend/`, una a la vez. 01c1 no toca `backend/` ni `shared/` (`git diff --name-only ebbcb40 -- backend shared` da 0), así que no hace falta la suite del backend (`AGENTS.md`, "Pruebas").

| Comando | Última línea |
|---|---|
| `npm run lint` | `> tsc -b`, exit 0 (antes, `All matched files use Prettier code style!`) |
| `npm run build` | `✓ built in 1.02s`, exit 0 |
| `npm run test` (suite completa) | `Test Files  349 passed (349)` · `Tests  8442 passed (8442)` (489.80 s), exit 0 |

- **Validez de la corrida completa:**
  - La lancé antes de que el límite de uso interrumpiera la sesión. Corrió de 12:30:40 a 12:38:50 y terminó con exit 0; leí sus últimas líneas completas en el archivo de salida.
  - Ningún archivo de `frontend/src` cambió después de las 12:30: el último es `foros-01c1-r1-foco.ataque.test.tsx`, de las 12:19. El orquestador confirmó que el árbol no cambió.
  - Por eso la tomo como válida y no la repito. Si una corrida no termina, no se da por buena (PA-12).
  - Lint y build corrieron justo antes, sobre el mismo árbol.
- **Las cuentas cuadran:**
  - Archivos: 349 = 345 (al cierre de 01b) + 2 pruebas nuevas del programador + 2 `*.ataque` del tester.
  - Casos: 8442 = 8372 + 37 (`foros-01c` 33 y `recuperar-foros-01c` 4) + 33 (23 en `foros-01c1-r1.ataque` y 10 en `foros-01c1-r1-foco.ataque`).
  - La lista cerrada y los C-n cambiaron aserciones, títulos e índices, pero no el número de casos. CL3-C01 perdió una aserción, no un caso.
- **Las corridas del tester también cuadran:**
  - `src/features/clases`: 3138 = 3105 + 33.
  - `src/app src/lib src/styles`: 1100 = 1111 menos los 11 casos de `como-se-entrega-01a.test.tsx`, que él no incluyó.

### 2. "Se toca", "No se toca" y V-01
- **Dentro de los paquetes, contra `ebbcb40`:** 25 archivos de `frontend/`:
  - 7 de producción;
  - 2 pruebas nuevas;
  - 7 de la lista cerrada;
  - 7 `*.ataque` de la ronda 0 (C-9, C-10, C-11 y C-17 a C-20);
  - 2 `*.ataque` nuevas del tester.

  Nada en `backend/` ni en `shared/`. Las 7 de producción tienen solo lo que §E8.3 les asigna, como verifiqué el resumen y su corrección. La corrección de M-10 solo tocó `foros-view.tsx` y `foros-01c.test.tsx`.
- **Fuera de los paquetes, contra `fd4a7ad`:** `infra/`, `.claude/`, `CLAUDE.md` y `docs/DESIGN.md` siguen iguales. El SHA-256 de `AGENTS.md` es `b874bf2c…`, el registrado en `aprobacion.md`. `docs/trabajo/DEPLOY-investigacion-vps.md` es ajeno al encargo y no entra.
- **V-01:** `sha256sum -c v01-foro01c1-r1.txt` (lista `061d8fd9…`) da 302 de 302 OK. `git ls-files -co` da 302 `*.ataque`: las 300 de antes más las 2 nuevas del tester. Ninguna `*.ataque` cambió fuera de los C-n de la ronda 0, y el programador no tocó ninguna.

### 3. El plan y las decisiones del humano
- **La sección "Foro", tercera de siete en las tres perspectivas** (§D-8.1, §E7.3, punto 1):
  - está en `SECCIONES_DE_LA_CLASE` y en las tres ramas del router;
  - queda activa en `foro`, no en `foros/:foroId` (FORO-1C01, en sus dos partes de 01c1);
  - el indicador medido se ajusta con la lista cerrada y los C-n.
- **«Crear foro»** (§D-8.2) es un enlace `primary` con `Plus`, solo para el maestro y el admin, y es la única acción principal de la vista. No se pinta en una clase archivada (FORO-1C14 en la lista; ATQ-FORO-106 también cubre la clase que pasa a solo lectura con el foco en él).
- **Lo que pide §E7.3** de `ForosView`:
  - `key={claseId}` (punto 3);
  - la guarda con ref, `enEspera={isFetching}` y `cancelRefetch: false`, sin `isFetchingNextPage` (punto 4);
  - la política de `DudasView` (punto 5), con `useListaConservadaTrasLaPagina`, `useRecargarAlPulsarLaSeccion`, `useMarcarViejaSiQuedoEnError` y `useFocoAlCargarMas`;
  - ningún aviso ante una redirección (punto 7).
- **Las pruebas requeridas de 01c1** tienen cada una su caso (verificación del resumen y de M-10):
  - FORO-1C01 a FORO-1C03 y FORO-1C14 (la lista);
  - FORO-1C20 a FORO-1C23;
  - las partes de la lista de FORO-1C50 a FORO-1C54.

  FORO-1C51 cubre sus tres caminos, cada uno con la recarga que responde y la que falla. FORO-1C02 cubre las dos formas de la entrega (O-01b-1).
- **Las frases de recuperación, camino por camino:**
  - "La lista de foros cambió… Vuelve a abrir Foro para verla completa.":
    - pulsar «Foro» (FORO-1C20);
    - otra sección y volver (FORO-1C21);
    - atrás y adelante (FORO-1C22);
    - el control que falló no se ofrece (FORO-1C23);
    - y, del tester, el salto a «Foro» de otra clase y de vuelta, por el historial (ATQ-FORO-90) y por la barra (ATQ-FORO-91), y pulsar dos o tres veces (ATQ-FORO-92).
  - El genérico "Algo salió mal. Inténtalo de nuevo." de la primera página:
    - pulsar «Foro» (FORO-1C54);
    - salir y volver (FORO-1C54);
    - el salto de clase (FORO-1C51, en sus casos de M-10).
- **La matriz de avisos y recargas (§D-10):** la del resumen, con las correcciones de N-29 y del texto, coincide con el código. El tester la atacó por cada clase de error:
  - la primera página, en nueve variantes (ATQ-FORO-99);
  - los tres códigos de redirección en la primera página y en la recarga (ATQ-FORO-97 y ATQ-FORO-98);
  - el aviso que no se hereda (ATQ-FORO-93 a ATQ-FORO-96).
- **La decisión del humano del 2026-11-16** ("El genérico, como las demás"; `aprobacion.md:450`):
  - ante un `5xx` o sin red, la primera página muestra "Algo salió mal. Inténtalo de nuevo." (FORO-1C02 y ATQ-FORO-99);
  - `features/clases/lib.ts` no cambió;
  - la fila de §D-10 quedó corregida en el resumen.
- **N-25 (§E9.5), el estado intermedio aceptado con DH-16 (a):**
  - las filas apuntan a `…/foros/:foroId` y «Crear foro» a `…/foros/nuevo`, que llegan en 01c2;
  - hasta entonces caen en la ruta comodín;
  - las pruebas de 01c1 solo miran el `href` y no navegan al detalle;
  - 01c1 no entra sola a `main`: el PR es único, al cerrar 01e.

### 4. Definición de terminado (para 01c1) y reglas de `CLAUDE.md` y `DESIGN.md`
- [x] Cumple su parte de RF-66 a RF-68: la sección y su lista (§E8.3). Lo demás llega en 01c2, 01d y 01e.
- [x] Capas y middleware: no hay código del backend. El backend ya protege la ruta de la lista (01a).
- [x] `lint`, `build` y `test` (suite completa) en verde.
- [x] Pruebas de autorización: no hay endpoint nuevo.
- [x] Migración: no hay.
- [x] `infra/` y `.env.example`: sin cambios.
- [x] Documentos: en 01c1 no toca ninguno. `DESIGN.md` va en 01e (§E7.3, punto 9), y `CLAUDE.md` y los demás al cierre del encargo (ver el punto 5).

**Reglas de `CLAUDE.md`** en `foros-view.tsx`, `fila-de-entrega.tsx`, `data.ts`, `hooks.ts`, `types.ts` y `trabajoService.ts`:
- los tipos se reexportan de `shared` y la única interfaz de la vista es la de sus Props;
- los textos están en `data.ts`;
- `useForos` y `useFilaEnFoco` viven en `hooks.ts`, y `focoPerdido`, `mensajeDeErrorDeLista` y `mensajeDeConsultaClases` en `lib.ts`;
- ningún `fetch`;
- no importa de otro módulo;
- retornos tempranos: error → cargando → vacío → datos;
- sin `?? []`, sin ternarios anidados, sin `disabled` y sin valores por defecto en `estadoPago`, `rol` ni `calificacion`.

ATQ-FORO-110 lo fija sobre el texto de la vista.

**Reglas de `DESIGN.md`:**
- solo tokens (`text-h2`, `text-small`, `text-muted-foreground`, y los de la fila de §7.7);
- componentes de `components/ui/` y los compartidos;
- sin vidrio propio: la fila ya es de vidrio fuerte;
- el estado va con texto (la insignia o "{n} participaciones"), nunca solo con color;
- §7.10 se cumple con su orden de estados, el vacío dentro del `Card` y "Error de la página siguiente";
- el foco nunca cae en `<body>` desde la lista (N-28, ATQ-FORO-101 a ATQ-FORO-105);
- los textos son los de DH-12 en español de México, sin emojis, salvo el texto de error decidido por el humano;
- los 360 px los cubren las clases `min-w-0`, `shrink-0` y `wrap-anywhere`. Lo visual no se puede medir en jsdom: queda para la comprobación del humano en 01e (ATQ-FORO-109 comprueba el texto entero).

### 5. Lo aceptado o declarado, en un solo lugar
| Qué | Estado | Dónde |
|---|---|---|
| El texto de error de la primera página: el genérico, no "No pudimos cargar los foros." (§D-9) | Decisión del humano (2026-11-16) | `aprobacion.md:450`; verificación del resumen, desviación 1 |
| `como-se-entrega-01a.test.tsx:241`, el tipo del `import.meta.glob` | Aceptado: es parte de PR-1A17 | Verificación del resumen, desviación 2 |
| `rotulo` y `complemento` de `FilaDeEntrega`; la fila del alumno sin `entrega` (el vencimiento en la segunda línea y el estado en la insignia) | Aceptado: es la lectura literal de §D-8.2 y no cambia `seccion-de-tema.tsx` | Desviación 3 |
| Sin raíz con `tabIndex={-1}` ni `useFocoAlPerderseElControl` (§D-8.2): el `h2` y la política de `DudasView` | Aceptado y declarado (N-28) | Verificación de M-10 |
| Las redundancias F2 (la ref de «Ver más foros»), F5 (`useMarcarViejaSiQuedoEnError`) y F14 (`useFocoAlPasarAError`) | Declaradas con su mecanismo | Desviación 4; verificación de M-10, punto 4 |
| O-01c1-1: con el salto a una clase que no está en la caché, el foco queda en `<body>` (`ClaseLayout`, "No se toca") | Fuera de 01c1: se suma a la fila de `ESTADO.md` §3 | Abajo |
| O-01c1-4: el estado de la fila y la insignia se calculan con dos `new Date()` | Aceptado sin destino. Discreparían solo si el reloj cruza la fecha límite entre dos líneas del mismo render, y con el reloj fijo coinciden (ATQ-FORO-108). Si 01d (la fila del foro en "Actividades") o 01e tocan la fila, conviene calcular `ahora` una sola vez | Aquí |
| O-01c1-5: las filas repetidas no son alcanzables (el backend pagina por `(creado_en, id)` con `skip: 1`) | Aceptado: la vista no necesita `unirPaginasSinRepetidas` | `reporte-tester.md`, ronda 1 |
| La nota para el arquitecto: en una sección con `key={claseId}`, el salto a la misma sección de otra clase es un camino propio de cada frase de recuperación | Va al cierre de FORO-01, con las lecciones del encargo, para proponerla junto a la regla de frases de recuperación de `AGENTS.md`. No va a §3: no es un pendiente del producto | Verificación de M-10, punto 3 |
| La nota del grep de §E7.5.3, que no alcanza los parámetros de tipo de `import.meta.glob` | Igual que la anterior: al cierre de FORO-01 | Desviación 2 |

**Lo que `DESIGN.md` debe decir en 01e** (§E7.3, punto 9, y A-06; lo verifico en la revisión final de 01e):
- **§7.34, "propuesta (FORO-01)", la fila de un foro:**
  - es la `FilaDeEntrega` de §7.7 con "Foro:" oculto al inicio del enlace;
  - la segunda línea dice siempre el vencimiento (`vencimientoDe`);
  - a la derecha va un complemento: para el alumno, su `EstadoEntregaBadge` (`estadoDeEntregaVisible`; `null` y asignado se ven igual); para el maestro y el admin, "{n} participaciones", "1 participación" o "Sin participaciones" en `--text-small` y `--muted-foreground`;
  - las props `rotulo` y `complemento`, que sin ellas dejan la fila de siempre;
  - y la diferencia con la fila del alumno de "Actividades" de §7.7, donde el estado va en la segunda línea.
- **§7.10, "Error de la página siguiente":** sumar Foro a la lista de las listas que lo implementan.
- **§7.14, "Lo abierto es de su clase":** sumar Foro a las listas en que una fila o «Ver más» con el foco lo llevan al encabezado. Además, la regla de N-28: una recarga que quita la fila enfocada lleva el foco al `h2`.

**Para el cierre de FORO-01, con la autorización del humano:**
- **`CLAUDE.md`:** la tabla de módulos (`clases` suma la sección "Foro") y "Ubicaciones compartidas" (`services/trabajoService.ts` suma `clavePrefijoDeForos` y `claveListaDeForos`).
- **ESSENTIALS, PRD y `ARCHITECTURE.md`**, como ya prevé el plan.

### 6. Lo que va a `docs/ESTADO.md` §3
- **O-01c1-1 se suma a la fila que ya existe**, "Foco al cambiar de ruta en la SPA: cuando la vista se desmonta por completo (clase nueva sin caché, cambio de sección)…" (`ESTADO.md:463`). Esa fila ya describe el mismo caso, "clase nueva sin caché", y tiene destino: el encargo del foco al cambiar de ruta, antes de DEPLOY (DH-05 (b) de CHORE-06).
  - Se le agrega el caso concreto y su causa: "FORO-01c1 (O-01c1-1, 2026-11-16): con el foco en una fila de «Foro» de A, saltar a «Foro» de una clase B que no está en la caché deja el foco en `<body>`; `ClaseLayout` pinta `<Cargando />` mientras pide el detalle y `useFocoAlTituloDeLaClase` no tiene adónde llevarlo. Pasa igual en cualquier sección. Con B en la caché, el foco va al título (ATQ-FORO-105)".
  - No va a la fila "Foco tras navegar o reemplazar la vista, de ADMIN-01" (`:381`), que reúne casos del administrador con otros destinos. Tampoco hace falta una fila nueva.
- **Nada más de 01c1 va a §3.** O-01c1-4 y O-01c1-5 quedan aceptados sin destino. Las notas para el arquitecto van al cierre del encargo. Lo de `DESIGN.md` ya tiene destino en el plan (01e).
- **O-01b-1** (`null` frente a `{ asignado }`), de la revisión de 01b, **queda cerrado en 01c1** con FORO-1C02 y ATQ-FORO-108. Su parte de 01d (FORO-1D29, en "Actividades") sigue como estaba indicado para la ronda 0 de 01d.

### 7. Conteo de rondas de 01c1
- **Rondas de ataque:** 1 (ronda 1, RESISTE, 0 hallazgos, 33 casos y 6 mutaciones propias). **0 rondas extra.**
- **Ronda 0 del tester:** 7 C-n aplicados, sin PARADA y sin `*.ataque` propias que arbitrar.
- **Resúmenes devueltos:** 1 (M-10, un caso que faltaba en una viñeta, sin código de producción). La corrección trajo además un defecto de producción, encontrado por la prueba de N-28 y corregido en `foros-view.tsx`: una recarga correcta que quitaba la fila enfocada dejaba el foco en `<body>`.
- **PARADAS y enmiendas:** 0 y 0.
- **Decisiones del humano durante la implementación:** 1 (el texto de error, opción A).
- **Regla del modelo del programador:** no se activa. No hubo rondas extra del tester por hermanos ni estados vecinos, y el programador ya está en `opus`.

### 8. El commit de 01c1
`git add -n -A -- frontend docs/ESTADO.md docs/trabajo/FORO-01-actividad-tipo-foro` da **30 rutas**:
- los 25 de `frontend/`;
- `docs/ESTADO.md`;
- y 4 de la carpeta del encargo: `aprobacion.md`, `reporte-tester.md`, `resumen-programador.md` y `revision.md`.

`docs/trabajo/DEPLOY-investigacion-vps.md` queda fuera (0 coincidencias). No hice ningún `git add` real ni un commit. El commit va solo a la rama: por DH-16 (a), el PR a `main` es uno solo, al cerrar 01e.

### Para el humano
1. 01c1 agrega la sección "Foro" en la clase, tercera de siete, para los tres roles, con su lista de foros.
   - El alumno ve su estado en cada foro.
   - El maestro y el admin ven cuántos participaron, y tienen «Crear foro», que no aparece en una clase archivada.
2. El error de carga dice "Algo salió mal. Inténtalo de nuevo.", como decidiste.
3. El tester no encontró nada en 33 ataques. Hubo un resumen devuelto, por una prueba que faltaba, y al completarlo apareció y se corrigió un problema real de foco.
4. La suite completa del frontend está en verde: 8442 casos. No cambia el backend ni `shared/`.
5. Hasta 01c2, abrir un foro o pulsar «Crear foro» lleva al inicio de sesión, porque esas pantallas todavía no existen. Por eso la rama no va a `main` hasta 01e.
6. Hay un pendiente de foco que no es de este encargo: al saltar a otra clase que no se ha abierto, el foco se pierde. Se suma a la fila que ya tienes para el encargo de foco antes de DEPLOY.
7. El commit lleva 30 rutas y deja fuera `DEPLOY-investigacion-vps.md`. Sigue 01c2: crear, editar, ver y borrar un foro.


## Verificación de la Enmienda 10 — FORO-01c2 (2026-11-16)

**Veredicto: ACEPTADA.** Está lista para la aprobación escrita del humano, con la opción (A). Hay un detalle que no bloquea (N-31) y que conviene ajustar al aprobarla. Revisión de plan, corta: no edité el plan ni el código, y corrí tres suites, una a la vez.

### 1. El diff completo
- **Archivos:** `plan.md` tiene 2897 líneas (SHA-256 `18d86a8a…`); la copia previa, 2729 (`e899f7b5…`, que es la del plan aprobado).
- **Diff:** `git diff --no-index` da **170 inserciones y 2 líneas reemplazadas en 7 hunks**. Coincide con el cotejo del orquestador:
  - `:25-26`, la nota;
  - `:58-210`, §E10;
  - `:911` y `:913`, §E7.5.3, la lista cerrada y las vigiladas de la 01c2 nueva;
  - `:930`, la nota de inventario;
  - `:938`, la nota de §E7.5.4;
  - `:2887-2897`, la tabla E10-1 a E10-4.
- **Las dos líneas reemplazadas** conservan su texto entero y solo suman su "**(Enmienda 10)** más …".
- **Nada más cambia:** ni ids, ni decisiones del humano, ni otras subentregas, ni C-n (C-8 y C-15 siguen como estaban).

### 2. §E10.2, el caso antes → después
- **El "antes" es literal:** coincide carácter por carácter con `clase-archivada-01d2-tareas.test.tsx:961-974` del árbol.
- **Lo que hoy da ese archivo, corrido solo:**

  `npx vitest run src/features/tareas/clase-archivada-01d2-tareas.test.tsx` → `Tests  1 failed | 109 passed (110)`.

  El único rojo es ese caso, `AssertionError: expected 1 to be 2`, en `:972`.
- **El "después" es correcto contra el código del árbol:**
  - la clave `["clases", CLASE, "tareas", TAREA]` es la de `claveTarea` (`services/trabajoService.ts:19-20`), y `CLASE` y `TAREA` están en `:26-27`;
  - `conLaEscrituraEnVuelo` (`:868-884`) devuelve `cliente`;
  - `VISTA_DESMONTADA` (`:856-862`) navega a Dudas y espera su `h2`;
  - `clienteDePrueba` (`:268-274`) no fija `gcTime`, así que la consulta de la tarea sigue en la caché 5 minutos sin observador;
  - `useEditarTarea` llama en su `onError` (`hooks.ts:305`) a `marcarViejaLaActividadTrasConflicto` (`:228-235`), que hace `invalidateQueries({ queryKey, refetchType: "none" })` solo con `TAREA_MODIFICADA` o `TAREA_CON_CALIFICACIONES` (`data.ts:462-464`);
  - `pedirDeNuevoLaTarea` no reacciona a `TAREA_MODIFICADA` (`CODIGOS_QUE_RENUEVAN_LA_TAREA`, `data.ts:466-471`).

  Por eso: un aviso, ninguna lectura y `isInvalidated` en verdadero.
- **La precondición `isInvalidated === false` se cumple en ese punto:**
  - entre el montaje y `soltar()` nada invalida la tarea: ni salir a Dudas ni lanzar el `PUT`;
  - el caso hermano del mismo archivo lo afirma tras una salida igual (ADM-1D211 hermano, `:561`, `isInvalidated` en falso);
  - si algo la marcara antes, el caso caería en la precondición y no en la última aserción. Sería una PARADA segura, sin falso verde.
- **Sigue protegiendo algo de la fila 36:** el aviso único del `409` con la vista desmontada (ahora también después de `reposar`) y que la caché no quede sirviendo la versión vieja. Las otras dos variantes de la fila, `:919-933` y `:935-959`, no cambian.
- **Las dos mutaciones vigilan lo que dicen:**
  - quitar `if (!montado.current) return` (`editar-tarea-view.tsx:133`) devuelve la recarga de hoy. Cae la aserción de las lecturas (`antes + 1`, lo que hoy da el rojo, al revés) y también la última, porque la lectura limpia la marca;
  - quitar la llamada de `hooks.ts:305` deja la lectura en `antes` y cae solo la última aserción.

  Cada una tumba una aserción distinta.

### 3. §E10.3, el inventario
**Lo más barato, la suite del módulo con el árbol de hoy:**

`npx vitest run src/features/tareas` → `Test Files  2 failed | 41 passed (43)` · `Tests  11 failed | 1364 passed (1375)`.

Los 11 rojos son exactamente los que reportó el programador:
- **10 en `hermanos-03d-01c.test.tsx`,** la variante del foro: FORO-1C30, FORO-1C31, FORO-1C32 ×2, FORO-1C33, FORO-1C34 ×2 y FORO-1C35 ×2, todas con el prefijo FORO-1C36, más FORO-1C41 del foro. Es el rojo esperado, porque las rutas del foro llegan en este mismo 01c2.
- **ADM-1D221 fila 36** con la vista desmontada.

Ninguna otra prueba de `features/tareas` cae con T-01 a T-05 ya aplicados.

**Lo que conviene saber de esa corrida:**
- `editar-tarea-view.test.tsx` **pasa en verde** con T-02 y T-03 en el árbol, así que hoy la entrada condicional no se aplicaría (pero ver N-31).
- `tareas-01a-r1.ataque.test.tsx` (`:195`, dos `GET …/temas`) **pasa**, así que C-8 tampoco se activa con el árbol de hoy. Es un dato para la ronda 0 bis del tester.

**Lo de fuera de `features/tareas`:**

`npx vitest run src/app` → `Test Files  36 passed (36)` · `Tests  628 passed (628)`.

Incluye CH6-A07 (`estado-por-id-ch6.test.tsx:1035-1063`), ATQ-CH6-05 y 06, y PR-1D07 de `router.test.tsx`, que monta la edición y solo espera «Título».

**Mis búsquedas además de las del arquitecto:**
- **Pruebas fuera de `features/tareas` que abren `tareas/:id/editar`:** solo las de `app/` (corridas arriba). En `features/clases`, `features/calificaciones` y `components` no hay ninguna.
- **«Categoría» o «Tema» por etiqueta o nombre fuera de `features/tareas`:** solo `components/ui/native-select.test.tsx`, que monta el componente suelto, y los recursos de `features/clases`. FORO-01 no toca ninguno de los dos.
- **Conteos de `/temas` o `/categorias`:** `formulario-tarea.test.tsx:664`, `:689` y `:714` y `editar-tarea-view.test.tsx:321` (`toBeGreaterThan(1)`, siguen valiendo), `tareas-01a-r1.ataque:195` (C-8) y `app/clase-03c1.test.tsx:540`, que es de "Actividades" y no de la edición.

**Conclusión:** no apareció ninguna prueba que el inventario de §E10.3 no tenga. La lista de vigiladas, una por una con su porqué, coincide con lo que encontré.

**N-31 (no bloquea): la entrada condicional de `editar-tarea-view.test.tsx` está bien cerrada en el qué, pero no en el cuándo.**
- Las líneas y los reemplazos están fijados (`getBy…` → `await findBy…` en `:159-160` y `:236`, y un `await screen.findByLabelText("Tema")` antes de `guardar()` en `:334-335`), con PARADA ante cualquier otra cosa.
- Pero con T-02 y T-03, «Categoría» y «Tema» se pintan solo cuando llega la lectura que los confirma, y esas tres líneas los leen en el mismo instante en que aparece «Título». Hoy pasan, pero dependen del orden en que se resuelven las respuestas del doble, y un cambio de tiempos los puede poner rojos en cualquier corrida posterior: la del tester, la del manager o una de 01d o 01e, donde la lista cerrada ya no es la de 01c2.
- **Remedio:**
  - **recomendado:** aplicar los tres cambios mecánicos sin condición en 01c2. Son seguros, porque `findBy` espera a que el campo esté y no cambia lo que protege cada caso. El conteo pasa directo a ~27;
  - **o bien:** dejar escrito que la condición vale para toda corrida de 01c2 (programador, tester o manager) y que, si se pone rojo en 01d o en 01e, es una PARADA.

  Basta con anotar la opción en la aprobación del humano o en el resumen del programador. No hace falta otra enmienda.

### 4. §E10.4, la fila de `ESTADO.md` §3
- **Es cierta contra `ESTADO.md:378`:** "un `409` (`RECURSO_MODIFICADO`, `TAREA_MODIFICADA` o de calificar) que llega con la clase archivada no pide la recarga…", rutas 20 y 36 y calificar (fila 33), "revisar en FORO-01". Habla del `409` con la clase archivada, no de la vista desmontada.
- **Sus pruebas son las que dice el plan:** `:919-933` (archivada: ninguna lectura, un aviso, el texto de archivada) y `:935-959` (`RESTAURADOS`: un aviso, ni pide ni reinicia, lo escrito y el foco siguen). Esas dos no cambian, y con FORO-1C41 se sabe además que la tarea queda vieja.
- **El reparto es correcto:** tarea y foro en 01c2, calificar en 01e (FORO-1E41) y el recurso sigue en la fila (A-07).
- **Detalle (no bloquea):** ADM-1D221 con la vista desmontada pertenece a otra fila, la de los "Hermanos heredados de `features/tareas`…" (`ESTADO.md:404`, T-01 a T-05 de CLASES-03d), que 01c2 cierra entera. Al cierre conviene nombrar las dos filas. El plan ya la tiene en su lista de cierre (§D-0.1, fila 331).

### 5. §E10.5, el conteo
13 de producción + 8 pruebas nuevas + 3 normales (CH4-01, CH6-A30 (c) y `clase-archivada-01d2-tareas`) + 2 `*.ataque` (C-8 condicional y C-15) = **~26**, o **~27** con `editar-tarea-view.test.tsx`. Las dos cifras quedan lejos de unas 30, así que no hay corte nuevo ni decisión del humano por tamaño (`AGENTS.md`, "Tamaño de subentregas").

### 6. La pregunta al humano
- **(A) es la que hay que recomendar.** Es lo que ya manda el plan aprobado (T-01 de §D-8.6 y FORO-1C30). Deja la tarea igual que el foro y que su vecino de calificar (fila 33 con la vista desmontada, que ya afirma un aviso y ninguna lectura).
- **(B) partiría FORO-1C30 por tipo** y dejaría una recarga que nadie ve.
- **El origen es una omisión del inventario del plan, no del programador:** el plan ya preveía este riesgo (§D-0.2, E2-3: "pruebas que fijan el comportamiento de hoy de los hermanos T-01 a T-05"), pero no lo inventarió. La PARADA estuvo bien detenida.

**Para el humano, en pocas líneas:**
- Una prueba vieja de la administración afirmaba que, si guardas una tarea y te vas antes de que llegue un conflicto, la app pide la tarea otra vez en segundo plano.
- El plan que aprobaste quita esa petición inútil: solo avisa y deja la tarea marcada para pedirla al volver.
- La enmienda cambia esa prueba para que diga lo nuevo, con las dos comprobaciones que la vigilan.
- Recomiendo (A). Aprobarla no cambia nada visible para la persona, salvo una petición menos.


## Verificación del resumen — FORO-01c2 — implementación (2026-11-16)

**Veredicto: ACEPTADO.**
- Todas las cifras del resumen coinciden con mis corridas, y las dos suites de la ronda salen en verde con C-15 aplicado.
- Las cuatro pruebas normales cambian solo lo autorizado: el "después" de §E10.2 es idéntico byte a byte.
- No hay problemas que bloqueen.
- Una desviación (la 6) va al humano, sin bloquear al tester, porque no se puede remediar dentro de 01c2.
- Dos detalles (N-32 y N-33) se corrigen en la siguiente entrega del programador, si la hay, o quedan como puntos de ataque.

**Contexto:** resumen leído, `resumen-programador.md`, "## Implementación — FORO-01c2 (2026-11-16)" (1224 líneas, SHA-256 `060b9517…`). Plan con la Enmienda 10 aprobada (opción A) y N-31 decidido ("Cambiarlas ya en 01c2"). Base `88b37af`. Solo frontend, una corrida a la vez, desde `frontend/`.

### Mis cifras contra las del resumen
| Qué | Resumen | Mi corrida | ¿Coincide? |
|---|---|---|---|
| `npm run lint` | salida 0, `> tsc -b` | `> tsc -b` · exit 0 | Sí |
| `npx vitest run src/features/tareas` | `Test Files  50 passed (50)` · `Tests  1459 passed (1459)` | `Test Files  50 passed (50)` · `Tests  1459 passed (1459)` (85.54 s) | Sí |
| `npx vitest run src/app src/lib src/services` | `Tests  2 failed \| 981 passed (983)`, antes de C-15 | `Test Files  66 passed (66)` · `Tests  983 passed (983)`, con C-15 aplicado | Sí: los mismos 983 casos; los 2 rojos de C-15 pasan a verde con la ronda 0 bis |
| `npm run build` | `✓ built in 894ms` | `✓ built in 864ms` | Sí (el tiempo varía) |
| `npx vitest list` de las 8 pruebas nuevas, con `grep -a -c "^src/"` | 104 = 20 + 4 + 5 + 7 + 31 + 15 + 15 + 7 | 104. Por archivo: `hermanos-03d-01c` 20, `vecinos-formulario-tarea-01c` 4, `formulario-foro-01c` 5, `traduccion-foro-01c` 7, `foro-detalle-01c` 31, `crear-editar-foro-01c` 15, `errores-foro-01c` 15 y `recuperar-foro-01c` 7 | Sí |
| `enEspera=` en producción | 91 | 91 | Sí |
| Archivos | 25 del programador (13 de producción, 8 nuevas y 4 normales) | `git status` contra `88b37af`: los mismos 25, más `lib/guardas-ch4-r1.ataque.test.ts` (C-15, del tester), así que son 26. Nada en `backend/` ni `shared/` | Sí |

### "Se toca" y la lista cerrada
- **Producción:** los 13 archivos son exactamente los de §E8.3 para 01c2:
  - en `features/tareas`: `formulario-tarea`, `acciones-de-la-tarea`, `detalles-de-la-tarea`, `editar-tarea-view`, las tres vistas nuevas, `hooks`, `data`, `lib` y `types`;
  - `services/trabajoService.ts`, solo con `claveForo` y `consultaForo` (desviación 3);
  - `app/router.tsx`, con las tres rutas del foro para el maestro y el admin, y `foros/nuevo` → `/login` y `foros/:foroId` para el alumno.
- **Nada fuera de "Se toca":**
  - `features/clases`, `components/*`, `lib/errores-de-api*` y `services/apiClient.ts` siguen sin cambios;
  - `lib/errores-ch3-r1.ataque.test.ts` no aparece en `git status`. El programador no la tocó (desviación 9).
- **Las 4 pruebas normales cambian solo lo autorizado:**
  - **`clase-archivada-01d2-tareas.test.tsx:961-980`:** idéntico al "después" literal de §E10.2. `diff` entre el bloque del plan y el del árbol: sin diferencias.
  - **`editar-tarea-view.test.tsx` (N-31):** solo `:159-160` (`getByLabelText` → `await findByLabelText` dentro del mismo `expect`), `:236` (ídem con `findByRole`) y un `await screen.findByLabelText("Tema")` después de `:335`. Cada cambio lleva el comentario literal de §E10.3. Ninguna aserción cambió de objeto ni de valor.
  - **`guardas-de-doble-clic-estatico.test.ts`:** `EXCEPCIONES` suma `crear-foro-view.tsx#crear.mutateAsync` y `editar-foro-view.tsx#editar.mutateAsync`, con el comentario literal de §E7.5.4, punto 5.
  - **`estado-por-id-estatico-ch6.test.ts` (CH6-A30 (c)):** suma `key={foro.id}` y `key={foroId}`, como dice el punto 6.
- **C-15 (del tester):** las dos líneas declaradas coinciden con `editar-foro-view.tsx`: `handleGuardar` a cuatro espacios, dentro de `contenido()` de `EdicionDelForo` (que lleva `key={foroId}`), y la recarga dentro de `recargarTrasConflicto`.

### Pruebas requeridas de 01c2
Cada viñeta de §E8.3 ("01c2") y de §E9.5 tiene su archivo y su título exacto, y los títulos del resumen coinciden con los de `npx vitest list`:
- FORO-1C01 (el router real en `foros/:foroId`);
- FORO-1C04 a FORO-1C14;
- FORO-1C24, FORO-1C26 y FORO-1C27;
- FORO-1C30 a FORO-1C37;
- FORO-1C40, FORO-1C41 y FORO-1C43;
- las partes de las vistas de FORO-1C50, FORO-1C52 y FORO-1C53;
- ADM-1D221.

Leí los casos en que más me fijé:
- **FORO-1C50, reescrita** (`crear-editar-foro-01c.test.tsx:363-388` y `foro-detalle-01c.test.tsx:478-515`).
  - Los dos clics van dentro de un solo `act`, que es la forma de `dosClicsEnElMismoRender` de CHORE-04. Antes, con dos `fireEvent.click` sueltos, el segundo ya veía `enEspera` y la guarda no se ejercitaba (N2 sobrevivía).
  - Ahora afirma una sola escritura con la respuesta retenida, y N1 y N2 la tumban.
  - **Correcta.**
- **FORO-1C52, reescrita** (`foro-detalle-01c.test.tsx:517-533` y `crear-editar-foro-01c.test.tsx:390-414`).
  - Con B ya en la caché, el salto de A a B no pasa por «Cargando». Antes, ese estado desmontaba la confirmación y el formulario por otra vía, y la `key` no se ejercitaba (N8 sobrevivía).
  - Ahora la confirmación de A no aparece abierta en B y ningún clic borra B. Además, guardar en B lleva el título y la versión de B (7).
  - N8 y N18 la tumban. **Correcta.**
- **FORO-1C40** (`vecinos-formulario-tarea-01c.test.tsx:168-213`).
  - La tabla "CH6-A14: los 8 formularios por los 2 vecinos" de CHORE-06 (`resumen-programador.md:308-319`) dice, para la tarea nueva: "ninguna prueba manda un `400` de `version:` (el campo que solo lleva la edición)". El caso usa justo eso.
  - Para la edición, la tabla pedía "un campo que solo acepte el modo crear". Ese campo no existe: el formulario pinta lo mismo en los dos modos, como en "Tema (crear y renombrar)" de esa misma tabla, que dice "No aplica".
  - Que pasara desde el inicio es lo esperado: CHORE-06 ya lo había descrito como conducta correcta sin caso.
  - La segunda mitad (rechazo del servidor y después uno local) la tumba N17.
  - La primera mitad (`version:`) no tiene mutación propia. Fija una conducta sin una guarda nueva, y la tumbaría sumar `version` a los campos pintados (punto de ataque 6).
  - **Correcta**, con la lectura de la desviación 11.
- **FORO-1C13, el caso de éxito** (`foro-detalle-01c.test.tsx:364-376`): ver N-32.
- **ADM-1D221 fila 36:** pasa. La precondición `isInvalidated === false` se cumple, como anticipé en la verificación de la Enmienda 10. Según el resumen, H1 tumba `:978` y H2 tumba `:979`, cada una una aserción distinta, como pedía §E10.2.

**Hallazgos de esta parte:**
- **N-32 (no bloquea): el título de FORO-1C13 promete más de lo que el caso afirma.** Dice "marca vieja la lista de «Foro»", pero el caso solo comprueba el aviso, que el foro salió de la caché, la navegación y la ruta del `DELETE`.
  - FORO-1C05 sí afirma sus invalidaciones con `isInvalidated`, y es el modelo. Su título nombra "los temas", que no afirma.
  - **Remedio:** sumar la aserción que el título promete (la lista de «Foro» y, ya que el gancho lo hace, las actividades y las calificaciones) o quitarla del título. Lo mismo con "los temas" en FORO-1C05.
  - Puede ir en la siguiente entrega del programador. Si no la hay, es un punto de ataque.
- **N-33 (no bloquea): dos conductas nuevas de la edición del foro sin caso.**
  - El aviso de la recarga fallida con el foro en caché, con los textos de la desviación 1 (`avisoDeRecargaFallidaAlEditarElForo`).
  - "No puedes editar este foro." cuando `puedeEditar` es falso.
  - Las dos están en la matriz del resumen ("Recarga fallida con caché") y en el código, pero no en ninguna prueba: el grep de los dos textos en las pruebas de 01c2 da 0.
  - El plan no las inventarió (son la copia de la tarea), así que no bloquean. Van como punto de ataque 3, y el programador puede sumarlas si vuelve a entregar.

### La matriz, los hermanos, los `VALIDACION` y las frases, contra el código
- **La matriz de `ForoView`, `CrearForoView` y `EditarForoView`** coincide con el código:
  - `errorQueReemplazaLaVistaDelForo` reemplaza la vista sin foro, ante `TAREA_NO_ENCONTRADA`, `SIN_ACCESO_A_LA_CLASE`, `ALUMNO_NO_ENCONTRADO` o un `VALIDACION` de `claseId:`, `foroId:` o `alumnoId:`;
  - `useAvisoDeRecargaFallidaDelForo` avisa una vez por fallo, con memoria por consulta, y su función de descarga calla ante una redirección y aplica la regla T-11 del foro;
  - `useBorrarForo`: en el éxito, aviso, `removeQueries` e invalidaciones; ante un error, `renovarTrasErrorAlBorrar`, que distingue con o sin observador (T-05);
  - `useEditarForo`: T-04 con `claveForo` y T-11 con `pedirDeNuevoElForo`;
  - todos callan ante `errorQueRedirigeElCliente`.
  - La única corrección es la de la desviación 6 (el foco tras borrar).
- **Hermanos y estados vecinos:** las tablas de T-01, T-02/T-03, T-04 y T-05 están completas y coinciden con el código:
  - T-01 tiene `if (!montado.current) return` en las dos ediciones (`editar-tarea-view.tsx:133` y `editar-foro-view.tsx`);
  - T-04 tiene `marcarViejaLaActividadTrasConflicto` en las dos mutaciones, solo con `TAREA_MODIFICADA` o `TAREA_CON_CALIFICACIONES` y no con `CLASE_ARCHIVADA` (el ADM-1D211 hermano sigue verde);
  - T-05 tiene `renovarTrasErrorAlBorrar` en `useBorrarTarea` y en `useBorrarForo`, y con la vista montada deja lo de PR-1D05, que sigue verde;
  - T-02 y T-03 están en `useListaConfirmadaAlAbrir`, con los once estados de su tabla.

  Las dos formas de la tarea y del foro tienen cada una su caso (FORO-1C30 a FORO-1C35 y FORO-1C36).
- **Los `VALIDACION` fuera de contrato** cubren los cinco tipos de `AGENTS.md` en crear (FORO-1C06 a FORO-1C09) y en editar (FORO-1C11):
  - un campo no pintado;
  - un campo pintado solo en otro tipo o modo (`requiereAdjuntos` y `version`);
  - un mensaje vacío o de solo espacios;
  - un prefijo con ruta (`rubrica.1.criterio:`, en la fila 2);
  - un rechazo seguido de uno local.

  Además, `ENTRADAS_FUERA_DE_CONTRATO` se recorre en las funciones (FORO-1C10) y en la vista de editar (FORO-1C11).
- **Las frases de recuperación, un caso por camino:**
  - "No pudimos actualizar el foro. Mostramos la última versión que tenemos.":
    - desde «Foro» pulsando la fila, atrás y adelante, y el salto a otro foro y de vuelta, que es el camino propio de la vista con `key` por el foro (FORO-1C24);
    - el siguiente fallo y la lectura correcta (FORO-1C26).

    Pulsar la sección estando en ella no aplica, porque ninguna sección está activa en `foros/:foroId`, como fija FORO-1C01. "Desde «Actividades»" va en 01d (FORO-1D30).
  - Las "…Inténtalo de nuevo." de publicar, guardar, borrar y descargar: repetir el mismo botón (FORO-1C27 y FORO-1C37).
  - **Lo que queda para el tester:**
    - el salto a la misma vista **de otra clase**. En `CrearForoView` (`key={claseId}`) es un camino real; en el detalle y en la edición, un foro es de una sola clase y la URL de otra clase responde `404`;
    - las dos frases de edición de la desviación 1 ("revisa tu conexión" e "inténtalo de nuevo en un momento"), que heredan la regla de la tarea y del recurso y no tienen caso en el foro (N-33).

### Reglas de `CLAUDE.md` y `DESIGN.md` en el código nuevo
**Estructura:**
- tipos en `types.ts` (`TipoDeActividad`, `ActividadDetalle`, `TextosDeLaPolitica` y las reexportaciones de `shared`);
- textos y listas en `data.ts`;
- funciones puras en `lib.ts`;
- ganchos en `hooks.ts`;
- ninguna importación de `features/clases`.

**Guardas de doble clic:**
- `handleBorrar` es un manejador con nombre de `AccionesDeLaTarea`, con `borrandoRef` que se suelta en `onSettled`;
- `handleSubmit` de `FormularioTarea` lleva `guardandoRef`;
- las vistas llaman a `mutateAsync` dentro de `onGuardar`, que es la excepción registrada.

**Ningún `.refetch(` nuevo sin `{ cancelRefetch: false }`,** salvo la recarga tras un conflicto (C-15).

**`key` por los ids de la ruta:**
- `CrearForoDeLaClase key={claseId}`;
- el bloque del detalle, `key={foro.id}`;
- `EdicionDelForo key={foroId}`;
- un foro pertenece a una sola clase, así que el `foroId` es único por todos los ids de la ruta, como el `tareaId` de la tarea.

**Retornos tempranos y estados:** error → cargando → datos en las tres vistas. La clase archivada va primero en crear y editar.

**Tokens:** `text-h2`, `text-h3`, `text-small`, `text-muted-foreground` y `max-w-prose`; la insignia es `Badge` `muted` con `MessagesSquare`.

**Una sola acción principal:** la del formulario. En el detalle, "Editar foro" va en `outline` y "Borrar foro" en `ghost`.

**Textos del servidor, solo por la traducción:** solo pasan por `mensajeDeErrorForo` o `mensajeDeConsultaForo` (en `lib.ts`, sobre `lib/errores-de-api.ts`).

**Detalle menor:** `AccionesDeLaTarea` crea siempre las dos mutaciones (`useBorrarTarea` y `useBorrarForo`) y usa la del tipo. No tiene efecto visible, porque ninguna se lanza sin el manejador, pero cada detalle de una tarea monta también un `useBorrarForo`. Si 01d o 01e tocan ese componente, conviene elegirla por el tipo en un subcomponente.

### Las 11 desviaciones
1. **Tres textos que §D-9 no trae: aceptados, sin decisión del humano.**
   - Los dos avisos de la recarga fallida al editar son literalmente los de la tarea (`features/tareas/data.ts:71-73`) y los del recurso (`features/clases/data.ts:790-792`), con "el foro".
   - "No puedes editar este foro." es el de la tarea ("No puedes editar esta tarea.", `:126`).
   - El rótulo de la política, "Participaciones después de la fecha límite", es el del grupo del formulario que aprobó DH-12.
   - Siguen `DESIGN.md` §9: dicen qué pasó y qué hacer, sin culpar y sin palabras prohibidas.
   - No son requisitos nuevos, sino el mismo patrón con otro sustantivo. Solo un detalle de estilo: la tarea rotula esa fila "Entregas tardías", más corto. Quedan a la vista del humano en la comprobación de 01e, sin pedirle una decisión ahora.
   - Les falta caso (N-33).
2. **Sin el panel «Participantes»: aceptada.** §D-8.3 lo marca "(01e; E1-10)", y su ruta llega en 01e.
3. **Solo `claveForo` y `consultaForo`: aceptada.** Las demás claves las crean 01d y 01e, que las usan. Crearlas ahora sería código sin uso.
4. **`cancelQueries` en lugar de `refetch({ cancelRefetch: true })`: aceptada.**
   - ATQ-CH4-34 es una lista cerrada de `.refetch(` sin `{ cancelRefetch: false }`. Cancelar la lectura previa y luego `refetch({ cancelRefetch: false })` da lo mismo que pide §D-8.6: una lectura en vuelo de antes no confirma.
   - **Primera consecuencia,** un `ErrorDeCampo` del servidor que se pinta sin su campo mientras la lista no se confirma: dura lo que tarda la lectura. Es mejor que perder el mensaje, y el mensaje sigue siendo legible. Queda como punto de ataque 2 (lectura del lector de pantalla y foco).
   - **Segunda consecuencia,** la regla local de "Elige la categoría" no se aplica sin la lista confirmada: es la regla de §D-8.6 ("mientras no llegan, o si fallan, el campo no se muestra y guardar conserva el valor"). El servidor la exige igual (`CATEGORIA_REQUERIDA`), así que no se pierde nada.
   - `cancelQueries` puede cancelar la lectura de otra vista. Por el `exact: true` y porque la vista anterior ya se desmontó al navegar, solo afecta a una lectura sin observador.
5. **Las categorías marcadas viejas: aceptada.**
   - Es lo que hace la tarea (`invalidarTrasCambiar`).
   - Es necesario, porque desde 01b el conteo de actividades por categoría cuenta los foros (E1-9; `mensajeConActividades`).
   - La matriz de §D-10 no lo nombraba. Ahora la del resumen sí.
6. **El foco tras borrar un foro con éxito: decisión del humano** (ver "Para el humano").
   - **Hoy:** el gancho saca el foro de la caché y `AccionesDeLaTarea` navega a «Foro». El botón "Sí, borrar foro", que tenía el foco, se desmonta con la vista, y nada lo recoloca. La clave de `useFocoAlTituloDeLaClase` de `ClaseLayout` (`${claseId}:${soloLectura}`) no cambia entre secciones. El foco cae en `<body>`.
   - **El plan:** §D-10, fila "Sí, borrar foro", columna "Foco": "Éxito: `h2` de «Foro»". §D-8.3 no lo dice.
   - **El precedente:** la tarea hace lo mismo hoy. `useBorrarTarea` navega a "Actividades", y su foco también cae en `<body>`.
   - Es el caso que ya tiene una fila en `ESTADO.md` §3 (`:463`, "Foco al cambiar de ruta en la SPA… cambio de sección"), con destino en el encargo del foco al cambiar de ruta, antes de DEPLOY.
   - Remediarlo solo en el foro exige tocar `features/clases/foros-view.tsx`, que no está en el "Se toca" de 01c2 ni de 01d (§E7.5.5).
7. **Borrar con `404` y la vista montada: aceptada.** Es lo que fijan PR-1D05 (`:517`) y §E7.3, punto 8 (c): el `removeQueries` es para la consulta sin observador.
8. **`useAvisoDeRecargaFallidaDe` con la clave por su texto: aceptada.**
   - Es la variante que pedía §E7.3, punto 5.
   - La firma de hoy no cambia y `avisarDelErrorDeLaEntrega(` sigue en 5.
   - `JSON.stringify` de una clave de cadenas es estable.
9. **`PREFIJOS_QUE_REEMPLAZAN_LA_VISTA_DEL_FORO` como expresión: aceptada.**
   - El programador **no tocó** `lib/errores-ch3-r1.ataque.test.ts` (no aparece en `git status`).
   - El remedio es legítimo:
     - `features/tareas/lib.ts` es uno de los tres archivos aprobados para leer `.message` (`lib/estatico-ch3-r1.ataque.test.ts:96-116`);
     - `.test(error.message)` es una de las formas que admite O-05;
     - la expresión `/^(?:claseId|foroId|alumnoId):/` equivale a la lista de §E7.3, punto 6, con `startsWith`. FORO-1C43 lo fija.
   - No es esquivar la regla: la regla prohíbe recortar el mensaje, y aquí solo se clasifica.
10. **FORO-1C26: aceptada.** Un aviso de sonner ya mostrado no se retira. "Quitar el aviso" se cumple con que no salga ninguno más y con que la vista muestre la versión nueva, que es lo que afirma el caso.
11. **FORO-1C40 en la edición: aceptada.** Ver arriba: el vecino "campo pintado solo en el otro modo" no existe en la edición de la tarea, y `version:` cubre el caso en los dos modos.

### Para el humano
**Desviación 6, el foco después de borrar un foro.** Hoy, al borrar un foro, la app vuelve a «Foro» y el foco del teclado se pierde: queda en la página, no en el título de la sección. Con una tarea pasa lo mismo desde antes. El plan pedía llevarlo al título "Foro", pero eso exige tocar la vista de la lista, que esta subentrega no puede tocar.
- **(A) Aceptarlo como está**, igual que la tarea. Se suma a la fila de `ESTADO.md` "Foco al cambiar de ruta en la SPA", cuyo encargo, antes de DEPLOY, lo resolverá para la tarea y el foro a la vez.
- **(B) Remediarlo solo en el foro en 01d.** Hay que sumar `features/clases/foros-view.tsx` a su lista, con tu aprobación por escrito, y la vista enfocaría su `h2` al llegar desde un borrado. Quedaría distinto de la tarea y con un mecanismo propio que el encargo del foco después reemplazaría.

**Recomiendo (A).**

No hay ninguna otra decisión para el humano: los textos de la desviación 1 son la copia literal de los de la tarea.

### Para el tester (ronda 1 de 01c2), por prioridad
1. **Borrar un foro con éxito:**
   - ¿sale un `GET` del foro ya borrado? El gancho hace `removeQueries` con la vista todavía observando, a diferencia de la tarea, que la marca vieja sin pedirla para no provocar un `404` (`hooks.ts`, `useBorrarTarea`, comentario del éxito);
   - ¿se ve un instante "Ese foro ya no existe." antes de navegar?;
   - ¿la lista de «Foro» se pide al llegar (N-32)?;
   - ¿a dónde va el foco (desviación 6)?;
   - lo mismo con el segundo paso ("Borrar con las participaciones").
2. **T-02 y T-03 en la edición:**
   - abrir la edición con la lectura de temas o categorías de "Actividades" en vuelo (`cancelQueries`);
   - una lectura que falla y luego la siguiente correcta;
   - el reinicio tras un `409`;
   - un `CATEGORIA_REQUERIDA` o un `VALIDACION` de `temaId:` con el campo todavía oculto: ¿el `ErrorDeCampo` se lee, se anuncia y queda asociado cuando el campo aparece?;
   - abrir y cerrar la edición varias veces seguidas.
3. **La edición del foro sin caso (N-33):**
   - la recarga fallida con el foro en caché (red y servidor, los dos textos, una vez por fallo, y callado en una archivada);
   - `puedeEditar` que cae en una recarga con el foco dentro del formulario (a la raíz, nunca a `<body>`);
   - "No puedes editar este foro.".
4. **Los hermanos con saltos:**
   - el `409` de A llega con la edición de B montada: ninguna lectura de B, un aviso, A queda vieja (T-01 y T-04 con `key={foroId}`);
   - borrar A con `404` o `403` estando ya en B;
   - crear un foro y saltar de clase con la publicación en vuelo: no navega, un aviso, `key={claseId}`.
5. **La clase archivada:**
   - un `409 CLASE_ARCHIVADA` al borrar y al guardar un foro;
   - restaurar y volver a abrir la edición (FORO-1C41 en el foro) con un guardado en vuelo.
6. **Los `VALIDACION` y las traducciones:**
   - sumar `version` a los campos pintados del foro debe tumbar FORO-1C40 y FORO-1C08;
   - un `VALIDACION` de `participacionId:` en la vista del foro;
   - un `ALUMNO_NO_ENCONTRADO` en la lectura del foro (lo reemplaza la lista de §E7.3).
7. **Las tres redirecciones** en la primera carga del detalle y de la edición, y en la recarga tras un `409`.
8. **`AccionesDeLaTarea` con las dos mutaciones:** que el detalle de una tarea no lance nada del foro, y que un borrado de tarea en vuelo no ponga en espera ningún control del foro.


## Verificación de la corrección — FORO-01c2: T-01 y N-32 (2026-11-16)

**Veredicto: ACEPTADA.**
- T-01 queda corregido de raíz y vigilado, y N-32 queda corregido.
- Todas las cifras coinciden.
- Hay una condición de plan (nota en §D-8 antes de 01d) y dos filas nuevas para `ESTADO.md` §3 (O-01c2-2 y `errorElement`). Ninguna bloquea la ronda 2.

Leí `resumen-programador.md`, "## Corrección tras la ronda 1 — FORO-01c2: T-01 y N-32 (2026-11-16)" (1356 líneas). La decisión del humano sobre la desviación 6 fue la opción A ("Aceptarlo como la tarea"). Solo frontend, una corrida a la vez, desde `frontend/`.

### Mis cifras contra las del resumen
| Comando | Resumen | Mi corrida | ¿Coincide? |
|---|---|---|---|
| `npm run lint` | salida 0, `> tsc -b` | `> tsc -b` · exit 0 | Sí |
| `npm run build` | `✓ built in 902ms` | `✓ built in 861ms` | Sí (el tiempo varía) |
| `npx vitest run src/features/tareas` | `Test Files  52 passed (52)` · `Tests  1511 passed (1511)` | `Test Files  52 passed (52)` · `Tests  1511 passed (1511)` | Sí |
| `npx vitest run src/features/clases` | `Test Files  128 passed (128)` · `Tests  3138 passed (3138)` | `Test Files  128 passed (128)` · `Tests  3138 passed (3138)` | Sí |
| `npx vitest run src/app src/lib src/services` | `Test Files  66 passed (66)` · `Tests  983 passed (983)` | `Tests  983 passed (983)` | Sí |
| `npx vitest list` de los tres archivos | `claves-foro-01c2` 7, `foro-detalle-01c` 35 (antes 31), `crear-editar-foro-01c` 15 | 7, 35 y 15 | Sí |

- **La suite de `features/tareas`:** 1511 = 1459 + 41 (la `*.ataque` del tester) + 7 + 4.
- **Archivos:** `git status --short frontend` da 28. Nada en `backend/` ni `shared/`.
- **V-01:** `sha256sum -c v01-foro01c2-r1.txt` da 303 de 303 OK.
- **Las `*.ataque`:** el programador no tocó ninguna, y ATQ-FORO-111 pasa a verde.

### El remedio de T-01: correcto y completo
- **La forma nueva** (`services/trabajoService.ts:25-32`):
  - `claveListaDeForos` = `["clases", c, "foros", "lista"]`;
  - `claveForo` = `["clases", c, "foros", "foro", foroId]`.

  En la posición 3 una lleva `"lista"` y la otra `"foro"`, así que para ningún `foroId` coinciden ni una es prefijo de la otra. Las dos cuelgan de `clavePrefijoDeForos` (`["clases", c, "foros"]`). Es el mismo recurso del segmento fijo `"alumno"` de las entregas.
- **Ninguna clave del foro está escrita a mano:**
  - en producción, el grep de `"foros"` fuera de `trabajoService.ts` solo encuentra el segmento de ruta de `TEXTOS_ACCIONES_POR_TIPO` (`data.ts:505`), que no es una clave;
  - el grep de `["clases", …, "foro(s)"` solo encuentra la definición del prefijo;
  - las 15 referencias de producción usan `claveForo`, `claveListaDeForos` o `clavePrefijoDeForos`;
  - en las pruebas, `hermanos-03d-01c` ya usa `claveForo` o `claveTarea` según el tipo, y la `*.ataque` del tester usa `claveForo`.
- **Los casos nuevos lo vigilan:**
  - `claves-foro-01c2.test.ts` prueba siete `foroId`, incluidos `lista`, `foro`, `nuevo`, `""` y `LISTA`, con las cuatro relaciones de prefijo;
  - los tres casos de vista de `foro-detalle-01c.test.tsx` (`:628-…`) cubren el maestro y el alumno en `…/foros/lista` y el maestro en `…/foros/lista/editar`: dicen "Ese foro ya no existe." sin romperse, y «Foro» conserva sus filas;
  - el cuarto caso es el control del camino inverso.

  El doble responde ahora `400 VALIDACION` de `foroId:` ante un id que no es uuid, como el servidor real. Según el resumen, P6 (la forma vieja) tumba los cuatro casos, y su rojo previo coincide (`4 failed | 38 passed (42)`).
- **La lista de hermanos es cierta contra el código y el router:**
  - **`foros/nuevo`:** el literal va antes de `:foroId` en las tres ramas (`router.tsx`: alumno → `/login`; maestro y admin → `CrearForoView`).
  - **`…/foros/nuevo/editar`:** entra por `foros/:foroId/editar` con `"nuevo"`. Su clave, `[…, "foros", "foro", "nuevo"]`, no coincide con ninguna otra, y el servidor responde `400` de `foroId`. Es el mismo camino que `…/foros/lista/editar` sin el choque. Lo cubre el caso puro con `nuevo`, y un caso de vista no agregaría nada que no fije ya el de `lista/editar`. **No hace falta.**
  - **`claveTarea`, `claveTrabajo`, `claveTemas` y `claveCategorias`:** su análisis es correcto. Ninguna clave fija vive en `[…, "tareas", <palabra>]`, y el `tema` de `claveTrabajo` sale de los datos, nunca de la ruta.

### La desviación del plan (§D-8, `plan.md:1749`)
- **El problema:** §D-8 escribe literalmente `claveForo(claseId, foroId) = ["clases", claseId, "foros", foroId]`. Es la forma que tenía el defecto.
- **Las reglas que importan no cambian:** las claves de 01d y 01e "todas bajo `claveForo`" (`:1750`), e "invalidar `claveForo` renueva todo lo del foro" (`:1751`).
- **Para 01c2 basta con registrarlo,** como N-31, en `aprobacion.md` y en esta revisión: el código, las pruebas y la `*.ataque` usan la función, no el literal.
- **Pero pido una nota en el plan antes de que arranque 01d.** §D-8 es lo que lee el programador de 01d para colgar siete claves nuevas. Con el literal viejo a la vista, una clave escrita a mano (`["clases", c, "foros", foroId, "participaciones"]`) reabriría T-01 en otro lugar. Es una nota de hecho, no una decisión nueva.
- **Texto, para insertar debajo de `plan.md:1749` sin borrar la línea:**

  > **(Corrección de la ronda 1 de 01c2, T-01; 2026-11-16)** La forma vigente es `claveForo(claseId, foroId) = ["clases", claseId, "foros", "foro", foroId]`: el segmento fijo `"foro"` evita que un `:foroId` igual a `"lista"` coincida con `claveListaDeForos(claseId)` (como `"alumno"` en las entregas de una tarea). La línea de arriba queda como historial. Las claves de 01d y 01e (`claveParticipaciones` … `claveDevoluciones`) se arman siempre con `claveForo(claseId, foroId)` más su segmento, nunca con el literal, y ninguna usa en la posición 3 los segmentos `"lista"` ni `"foro"` para otra cosa.

- **Quién la pone:** el arquitecto, en la comprobación de arranque de 01d o en su próxima enmienda. Si no hay otra, puede ir como nota corta con la regla de transcripción de `AGENTS.md`, con la copia previa y el SHA-256 en `aprobacion.md`. Basta con que el humano la acepte por escrito: no cambia ninguna decisión ni conducta.

### O-01c2-2 y sus hermanos (anteriores a FORO-01, en "No se toca"): alcanzables, pero la vista no se rompe
Lo verifiqué por lectura de `app/router.tsx`, `services/clasesService.ts`, `features/clases/hooks.ts`, `features/clases/clase-layout.tsx`, `components/clase/con-clase-de-la-ruta.tsx` y `components/layout/hooks.ts`. No corrí nada contra ningún servidor ni cambié archivos.

**Las claves que chocan:**
- `claveClaseDetalle(id)` = `["clases", id]` (`clasesService.ts:21`) es la de `useClase` (`features/clases/hooks.ts:228-233`, con `select: (r) => r.clase`), que es lo que pide `ClaseLayout`;
- `claveClasesAnteriores()` = `["clases", "anteriores"]` (`:25`) es la consulta **infinita** de "Clases anteriores" del alumno y de "Clases archivadas" del maestro (`hooks.ts:394-…`);
- `CLAVE_CLASES_INSCRITAS` y `CLAVE_CLASES_IMPARTIDAS` (`:12-13`) son las consultas **infinitas** de los inicios del alumno y del maestro (`hooks.ts:206-226`);
- la barra lateral **no** choca: su clave es `[…inscritas | impartidas, "barra"]` (`clasesService.ts:51-57`). Es hija de `["clases", "inscritas"]`, pero no es igual.

**Las rutas exactas:** la persona tiene que escribir la URL a mano, porque ningún enlace de la interfaz la arma:
- el alumno, después de abrir su inicio (`/estudiante`), escribe `/estudiante/clases/inscritas`; o, después de abrir "Clases anteriores", `/estudiante/clases/anteriores`;
- el maestro, después de su inicio, `/maestro/clases/impartidas`; o, después de "Clases archivadas", `/maestro/clases/anteriores`.

En la rama del maestro solo `clases/nueva` es un literal antes de `clases/:claseId`. En la del alumno no hay ninguno.

**Qué ve la persona:**
- Con la lista en caché y fresca (30 s), `useClase` no pide nada. Su `select` lee `.clase` de la página infinita y da `undefined` sin lanzar nada.
- `ClaseLayout` ve `data === undefined` sin error y pinta `<Cargando />` (`clase-layout.tsx:67-69`) **indefinidamente**, sin secciones.
- **No se rompe como T-01:** `ClaseLayout` protege con `!data`, y nada lee la página como si fuera una clase.
- Si la persona vuelve a esa URL ya pasados los 30 s, la consulta se pide con la función del detalle, `GET /api/clases/inscritas` sin `limite`, que **es un endpoint real** y devuelve una lista. `claseRespuestaSchema` la rechaza, y la vista muestra el error de consulta con "Volver…".
- La página infinita no se pierde, porque una lectura fallida conserva los datos, así que el inicio sigue funcionando.
- Con el admin no hay lista en caché con esa clave: la petición sale y recibe el error del servidor, y la vista lo dice.

**Gravedad: baja.** Solo se alcanza escribiendo a mano una URL con una palabra reservada en lugar del id. Se recupera navegando, no corrompe datos y no derriba la aplicación.

**Destino:** una **fila nueva en `ESTADO.md` §3**, con destino en el retiro de compatibilidad e higiene de pruebas, antes de DEPLOY.
- El remedio de raíz no es renombrar claves: es que `ConClaseDeLaRuta`, y las vistas que leen `:foroId`, `:tareaId`, `:alumnoId` o `:recursoId`, rechacen un id que no sea uuid antes de pedir nada, con el mismo "No tienes acceso a esta clase." o "Ese … ya no existe.".
- Así se cierra toda la familia (T-01 incluido) en un solo lugar, sin peticiones al servidor.
- Toca `components/clase/` y varios módulos, así que necesita su propio plan.
- **No hay decisión del humano ahora:** solo se registra.

**La falta de `errorElement` en el router** (la vio T-01: «Unexpected Application Error!» de React Router):
- es la red de seguridad de toda la SPA. Cualquier excepción de render deja a la persona en una pantalla genérica, sin el marco, sin poder navegar y en inglés;
- **gravedad media como riesgo de producción,** aunque hoy no se conoce ninguna excepción alcanzable después de la corrección de T-01;
- va a una **fila nueva en `ESTADO.md` §3**, con destino **antes de DEPLOY** (en el plan de DEPLOY o en el retiro de compatibilidad e higiene). Pide un patrón visual nuevo en `DESIGN.md` y textos que aprueba el humano: por ejemplo, "Algo salió mal al mostrar esta página." con "Volver al inicio";
- no se recomienda meterlo en FORO-01: sería un alcance ajeno a la actividad tipo foro;
- no hay decisión del humano ahora, más allá de aceptar el destino.

### N-32: las aserciones prueban lo que dicen los títulos
- **FORO-1C13, éxito** (`foro-detalle-01c.test.tsx:394-417`):
  - la lista de «Foro» se siembra fresca en la caché y se exige que se vuelva a pedir al llegar a «Foro», lo que prueba que quedó vieja sin depender de `isInvalidated`, porque la consulta se vuelve a observar;
  - las actividades (`[…trabajo, "sin-tema"]`), los temas, las categorías y las calificaciones (`[…calificaciones, "gradebook"]`), sin observador, quedan con `isInvalidated === true`.
- **FORO-1C05, publicar:** el título ya no promete "marca viejos los temas", sino "vuelve a pedir los temas", que es lo correcto porque el formulario abierto los observa, y lo afirma.
- **Mutaciones:** según el resumen, cada una de P1 a P5 quita una invalidación y tumba al menos un caso; P4 (las categorías) solo la vigila FORO-1C13. Cada título queda vigilado por su mutación.
- **La ronda 1 del tester** (ATQ-FORO-112 y ATQ-FORO-113) ya había confirmado que la conducta es la que dicen los títulos, y que no sale ningún `GET` del foro borrado.

### Para el tester (ronda 2 de 01c2), por prioridad
1. **El remedio de T-01 por los demás ids que no son uuid:**
   - `…/foros/foro`, `…/foros/nuevo/editar`, `…/foros/FORO` y `…/foros/%20`, con la lista de «Foro» y otro foro en la caché;
   - abrir un foro y después la lista, y al revés;
   - que el borrado y la edición de un foro sigan invalidando la lista y el foro con la clave nueva (`invalidateQueries` de `clavePrefijoDeForos` y `removeQueries` de `claveForo`).
2. **Que ninguna invalidación del foro use todavía la forma vieja:** invalidar o quitar `claveForo` no debe tocar la lista, e invalidar la lista no debe tocar un foro.
3. **Los hermanos de la familia O-01c2-2 dentro del encargo:** `…/tareas/<palabra>` y `…/foros/<palabra>` con las listas del trabajo o de los temas en la caché. Confirmar que no hay otro choque alcanzable en lo que FORO-01 creó o tocó. No se ataca `ClaseLayout`, que está en "No se toca".
4. **Que lo de la ronda 1 siga verde con la clave nueva:** el foco y el `GET` tras borrar, T-02 y T-03, la edición del foro (ATQ-FORO-119) y los saltos.


## Arbitraje de la ronda 2 — FORO-01c2: T-02 y T-03 (2026-11-16)

Arbitraje corto, sin suites. Leí `reporte-tester.md`, "## Ronda 2 — FORO-01c2 (2026-11-16)", y el código, solo por lectura. Los rojos son los que reporta el tester: 2 de T-02 (ATQ-FORO-126, en mayúsculas) y 3 de T-03 (ATQ-FORO-127).

### 1. T-02: se corrige ahora, en "Se toca", con un id canónico en las vistas del foro
**Es un defecto de 01c2.** Las vistas nuevas guardan el foro bajo el id de la ruta, y `AccionesDeLaTarea` lo borra con el id de los datos (`acciones-de-la-tarea.tsx:45-46`). El backend pasa el id a minúsculas (`shared/src/foros.ts:20-24`), así que con un uuid en mayúsculas las dos claves divergen.

**Remedio que acepto:**
- `ForoView` y `EditarForoView` pasan el `:foroId` de la ruta por **una sola función pura** de `features/tareas/lib.ts` (por ejemplo, `idCanonicoDeLaRuta`, que lo pasa a minúsculas, la forma canónica de un uuid), antes de pedir, de fijar la `key` y de pasarlo a los ganchos.
- Con eso, la consulta, la `key={foroId}` de la edición, `useEditarForo` (su `setQueryData` tras guardar), `useAvisoDeRecargaFallidaDelForo`, la clave de foco y el borrado de `AccionesDeLaTarea` usan la misma clave.
- Un id que no es uuid sigue llegando tal cual al servidor, que responde `400` de `foroId` (como fijan ATQ-FORO-124 y T-01).

**Remedios que no acepto:**
- **Que `AccionesDeLaTarea` borre con el id de la ruta.**
  - Deja dos claves para el mismo foro: la de la ruta y la de los datos, que usan los enlaces de la lista y la navegación tras publicar.
  - El borrado solo quitaría la de la ruta, y una copia en minúsculas ya visitada sobreviviría al borrado, contra T-05.
  - Además, cambia la firma de un componente que la tarea comparte.
- **Que la vista rechace las mayúsculas.**
  - Negaría una URL que el backend acepta y respondería "Ese foro ya no existe." sobre un foro que existe.
- **Normalizar dentro de los ganchos.**
  - El id de la ruta también es la `key` y la clave de foco, que viven en la vista. Normalizar en un solo lugar, a la entrada, es lo que evita el siguiente vecino.

**El hermano de la tarea: tiene el mismo defecto.** Lo verifiqué por lectura:
- `detalle-tarea-view.tsx:48` pide con el `tareaId` de la ruta (`useTarea(claseId, tareaId)`);
- `AccionesDeLaTarea` borra con `tarea.id`;
- `tareaIdParamSchema` lo pasa a minúsculas (`shared/src/tareas.ts:222-224`).

Es anterior a FORO-01 (TAREAS-01). **No se corrige en 01c2:**
- `detalle-tarea-view.tsx` no está en "Se toca", y el remedio no cabe en `AccionesDeLaTarea` sin la forma que rechacé arriba;
- además, la tarea tiene más vistas que leen `:tareaId`: la edición, las entregas y la entrega de un alumno (`useTarea` en cuatro archivos). Corregir solo el detalle dejaría a sus hermanas a medias.

**Va a `ESTADO.md` §3, en la familia de O-01c2-2,** que se reformula como "ids de la ruta que no son el uuid canónico: palabras reservadas y mayúsculas". Destino: el retiro de compatibilidad e higiene antes de DEPLOY. El remedio de familia es canonicalizar (minúsculas) y validar el id en un solo lugar a la entrada de cada vista (`ConClaseDeLaRuta` y los lectores de `:tareaId`, `:foroId`, `:alumnoId` y `:recursoId`). Cuando llegue, la función de `features/tareas/lib.ts` de este remedio se sube a ese lugar común.

**No hace falta decisión del humano para T-02.** Solo debe saber que el foro queda corregido y la tarea pasa a la fila.

### 2. T-03: recomiendo la opción (a), corregirlo ahora; decide el humano
- **Qué dice el plan:**
  - §D-8.3 dice que el detalle del foro tiene la composición del de la tarea, con «Detalles», la categoría con su peso y el tema. Lo que cambia esos datos debe marcarlo viejo, como a la tarea.
  - Ni §D-10 ni §E7.5.5 nombran `useRenombrarTema`, `useBorrarTema` ni `useGuardarCategorias`: el inventario no los vio. No hay contradicción: es un hueco.
  - La fila "Mover un foro" de §D-10 (01d) ya pide marcar `claveForo` al mover, y es el hermano de `useMoverElemento` (`features/clases/hooks.ts:1597`), que hoy no es alcanzable.
- **(a) Corregirlo ahora, con la autorización escrita del humano para tocar `features/clases/hooks.ts` en 01c2.** Recomendada.
  - **El cambio es pequeño y está acotado:** en las tres mutaciones (`:1471`, `:1494` y `:2135`), junto a `["clases", claseId, "tareas"]`, se invalida también `clavePrefijoDeForos(claseId)`. Va con el mismo comentario de por qué ("el tema y la categoría también salen en el detalle del foro").
  - **Prefijo:** acepto el prefijo completo de los foros, que es el mismo alcance que la tarea da a `["clases", claseId, "tareas"]` y cubre también la fila de la lista, que trae el `tema`. Sin observadores solo marca viejas las consultas: no pide nada.
  - **Sus casos ya existen** (ATQ-FORO-127, del tester), así que el remedio nace con su rojo previo.
  - **Tamaño:** el árbol pasa a 31 archivos. La regla de "unos 30" de `AGENTS.md` es un criterio para partir una subentrega al planearla, no un tope, y un archivo más no justifica partir 01c2.
  - **Por qué la recomiendo:** cierra el hallazgo donde se encontró, sin dejar un defecto conocido en un commit, sin sacar del árbol una `*.ataque` y sin enmendar el plan otra vez. 01d iba a abrir ese archivo de todos modos.
- **(b) Pasarlo a 01d.** Funciona, pero cuesta más proceso por el mismo cambio:
  - sacar del árbol una `*.ataque` en rojo, que es borrar un archivo y pide confirmación del humano;
  - guardar su SHA-256;
  - poner una nota en el plan y una fila temporal en `ESTADO.md`;
  - reintroducirla en la ronda 0 de 01d.

  Mientras tanto la rama no va a `main` (DH-16 (a)), así que el riesgo para la persona es nulo. Es aceptable si el humano prefiere no abrir el archivo en 01c2.
- **(c) Otra forma:** invalidar los foros desde `features/tareas` cuando cambian los temas o las categorías. No es posible sin que `features/tareas` escuche mutaciones de `features/clases` (regla 9 de `CLAUDE.md`). La descarto.
- **Lo que necesita decisión del humano:** solo elegir (a) o (b). Con (a), la autorización por escrito de `features/clases/hooks.ts` en 01c2, limitada a esas tres mutaciones, como pide §E7.5.0 en el carril sensible. Con (b), la confirmación de sacar del árbol, por ahora, `features/clases/foros-01c2-r2-temas.ataque.test.tsx`.
- **En los dos casos,** `useMoverElemento` queda para 01d, como ya dice §D-10. Debe usar el **id canónico** de la publicación (vecino de T-02).

### 3. Conteo de rondas
- **Rondas de ataque:** 2, las dos ROTO. Queda **una**: si la ronda 3 sale ROTO, se escala al humano (`AGENTS.md`, "Flujo", punto 6).
- **T-02 cuenta como estado vecino de T-01, mismo mecanismo:** con qué id se arma la clave bajo la que vive un foro.
  - La lista de hermanos de la corrección de T-01 revisó las palabras reservadas, las claves literales y las demás claves de `trabajoService.ts`, pero no "el id de la ruta frente al id de los datos".
  - Para la medición, la ronda 2 es **una ronda extra por hermanos o estados vecinos**.
- **T-03 es un hallazgo nuevo:** es un hermano de la implementación original (el patrón de la tarea que no se extendió al foro desde `features/clases`), no del remedio de T-01. Además, estaba en un archivo que el programador no podía tocar.
- **La regla del modelo no cambia nada:** el programador ya está en `opus`.

### 4. Lo que debe traer la corrección: los vecinos de "la clave bajo la que vive un foro"
El programador lista cada uno con "aplica / aplicado / no aplica (por qué)", y la corrección trae sus casos o cita el que ya lo cubre.
- **Quién lee la clave** (todos con el id canónico):
  1. `useForo` en `ForoView`;
  2. `useForo` en `EditarForoDeLaClase`, que es la clave de foco;
  3. `useForo` en `EdicionDelForo`;
  4. `useAvisoDeRecargaFallidaDelForo`, en las dos vistas, y su memoria `ultimoFalloAvisado`;
  5. `renovarTrasErrorAlBorrar`, que cuenta observadores por la clave.
- **Quién escribe en ella:**
  6. `setQueryData` de `useEditarForo` tras guardar, con la ruta en mayúsculas y el detalle en minúsculas en caché: después de guardar, el detalle muestra lo nuevo sin pedirlo;
  7. el reinicio tras el `409` (`consulta.refetch()`).
- **Quién la quita o la marca vieja:**
  8. `removeQueries` de `useBorrarForo` al borrar con éxito;
  9. `marcarViejaLaActividadTrasConflicto` de `useEditarForo`;
  10. `pedirDeNuevoElForo`, ante un `404`, un `403` o la descarga;
  11. `invalidarTrasCambiarElForo`;
  12. con (a), las tres mutaciones de `features/clases/hooks.ts` (`:1471`, `:1494` y `:2135`), con un caso por cada una (ATQ-FORO-127);
  13. las que invalidan el prefijo de la clase, que ya alcanzan al foro: `features/clases/hooks.ts:367` y `:674` (`claveClaseDetalle(claseId)` sin `exact`). Se lista y se confirma "ya aplica", sin caso nuevo.
- **Las `key` y la navegación:**
  14. `key={foroId}` de `EdicionDelForo`, ahora canónico, y `key={foro.id}` del bloque del detalle, que viene de los datos: deben coincidir;
  15. la navegación tras publicar (`foro.id`) y los enlaces de la lista (`foro.id`): ya son canónicos;
  16. «Cancelar» y «Volver» (`detalle = …/foros/${foroId}`), con el id canónico.
- **Lo que queda fuera y por qué:**
  17. `useMoverElemento`, en 01d;
  18. la tarea (T-02 hermano), en `ESTADO.md` §3;
  19. el `claseId` en mayúsculas, que es de la familia de O-01c2-2 y está en "No se toca";
  20. el detalle de un recurso (el hermano probable de T-03 del tester): es de CLASES-03d, `features/clases`, y queda como observación sin verificar para el mismo `chore`.
- **Mutaciones que debe traer:**
  - quitar la normalización en `ForoView` debe tumbar ATQ-FORO-126;
  - quitarla en `EditarForoView` debe tumbar un caso de la edición en mayúsculas (si no existe, el programador lo agrega: guardar en mayúsculas y abrir el detalle en minúsculas);
  - con (a), quitar cada una de las tres invalidaciones de `features/clases/hooks.ts` debe tumbar su caso de ATQ-FORO-127.


## Verificación de la corrección — FORO-01c2: T-02 y T-03 (2026-11-16)

**Veredicto: ACEPTADA.** No hay hallazgos que bloqueen. Pasa a la ronda 3 del tester, que es la última.
- T-02 queda corregido con el remedio que acepté en el arbitraje, y llega a todos los usos del `:foroId`.
- T-03 queda corregido con exactamente lo que autorizó el humano ("Autorizo, corregir ahora").
- Las cifras coinciden.
- Dos detalles que no bloquean:
  - la aserción de "sin volver a pedirlo" en el caso de la edición;
  - el orden del rojo previo, aceptado con la garantía de las mutaciones.
- Un vecino hacia adelante, el 23, va a la nota del plan antes de 01d.

Leí `resumen-programador.md`, "## Corrección tras la ronda 2 — FORO-01c2: T-02 y T-03 (2026-11-16)" (1544 líneas). Solo frontend, una corrida a la vez, desde `frontend/`.

### Mis cifras contra las del resumen
| Comando | Resumen | Mi corrida | ¿Coincide? |
|---|---|---|---|
| `npm run lint` | salida 0, `> tsc -b` | `> tsc -b` · exit 0 | Sí |
| `npm run build` | `✓ built in 1.29s` | `✓ built in 1.74s` | Sí (el tiempo varía) |
| `npx vitest run src/features/tareas` | `Test Files  53 passed (53)` · `Tests  1553 passed (1553)` | `Test Files  53 passed (53)` · `Tests  1553 passed (1553)` | Sí |
| `npx vitest run src/features/clases` | `Test Files  129 passed (129)` · `Tests  3141 passed (3141)` | `Test Files  129 passed (129)` · `Tests  3141 passed (3141)` | Sí |
| `npx vitest run src/app src/lib src/services` | `Test Files  66 passed (66)` · `Tests  983 passed (983)` | `Test Files  66 passed (66)` · `Tests  983 passed (983)` | Sí |
| `npx vitest list` | `claves-foro-01c2` 9, `crear-editar-foro-01c` 16 | 9 y 16 | Sí |

- **Cuentas:**
  - `features/tareas`: 1553 = 1511 + 39 (la `*.ataque` de la ronda 2) + 2 + 1;
  - `features/clases`: 3141 = 3138 + 3 (ATQ-FORO-127).
- **Archivos:** `git status --short frontend` da 31.
- **V-01:** `sha256sum -c v01-foro01c2-r2.txt` da 305 de 305 OK. El programador no tocó ninguna `*.ataque`.

### T-02: es el remedio aceptado y está completo
- **La función:** `idCanonicoDeLaRuta = (id) => id.toLowerCase()` es una función pura en `features/tareas/lib.ts:478`, con su comentario.
- **Dónde se aplica:** a la entrada, y en un solo lugar por vista:
  - `ForoView` (`foro-view.tsx:143`): `<DetalleDelForo … foroId={idCanonicoDeLaRuta(foroId)} />`;
  - `EditarForoView` (`editar-foro-view.tsx:171`): `<EditarForoDeLaClase … foroId={idCanonicoDeLaRuta(foroId)} />`.
- **Ningún uso del `:foroId` crudo:** el grep de `foroId` en las dos vistas solo encuentra el crudo en `useParams` y en la guarda de `undefined`. Todo lo demás recibe el canónico:
  - la consulta (`:46`, `:52` y `:147`);
  - `useEditarForo` (`:53`);
  - el aviso de recarga fallida (`:53` y `:73`);
  - la clave de foco (`:60` y `:151`);
  - `key={foroId}` (`:155`);
  - `detalle`, que alimenta «Cancelar» y la navegación tras guardar (`:54`).

  El borrado y «Editar foro» de `AccionesDeLaTarea` usan `tarea.id`, que ya es canónico. «Volver a Foro» usa `base`.
- **Un id que no es uuid** solo cambia de letras y sigue llegando al servidor, que responde `400` de `foroId`. Las vistas siguen diciendo «Ese foro ya no existe.» (ATQ-FORO-124 y los casos de T-01 siguen verdes).
- **Vecino 21:** `…/foros/LISTA` pasa a `lista` y a `claveForo(c, "lista")` = `[…, "foros", "foro", "lista"]`. Con la forma de T-01 no choca con `claveListaDeForos`, y el caso puro incluye `LISTA`. **Correcto.**
- **Vecino 22:** la barra del navegador conserva las mayúsculas. **Aceptable.**
  - La URL no es una clave. «Atrás» y «Adelante» vuelven a esa URL y la vista la vuelve a hacer canónica.
  - Redirigir a la forma canónica sería otra conducta, con su propia entrada en el historial, que el arbitraje no pidió. Queda para el remedio de la familia (`ESTADO.md` §3), si se quiere.
- **Los casos:**
  - el caso puro fija la función y que `claveForo` coincide tras hacerla canónica;
  - el caso de la edición (`crear-editar-foro-01c.test.tsx:459-478`) afirma que el detalle en minúsculas muestra el título guardado desde la URL en mayúsculas. Esa es la aserción que tumba Q2.
  - **Detalle:** `lecturasAntes` se toma después de navegar al detalle, así que "sin volver a pedirlo" no está bien vigilado. Lo sostiene el título, porque la invalidación del gancho no alcanza el foro. No bloquea.
- **El remedio escrito antes que sus casos:**
  - es una desviación del orden "rojo primero" del programador;
  - pero el rojo de T-02 ya existía antes del remedio, en las `*.ataque` del tester (ATQ-FORO-126, rojo en la ronda 2);
  - y Q1 y Q2 demuestran, quitando el remedio, que cada caso nuevo cae sin él. Es la misma garantía.
  - **La acepto.** Para las próximas correcciones, el orden pedido sigue siendo el caso en rojo primero.

### T-03: el diff de `features/clases/hooks.ts` es exactamente lo autorizado
- **Cotejo:** `git diff -U0 88b37af -- features/clases/hooks.ts` contiene:
  - el import de `clavePrefijoDeForos`;
  - la invalidación de `clavePrefijoDeForos(claseId)` en `useRenombrarTema`, `useBorrarTema` y `useGuardarCategorias`;
  - tres comentarios.

  Nada más. El SHA-256 es `32d7d025…`, el que dio el programador.
- **El orden observable de `useGuardarCategorias` no cambia:** `setQueryData(claveCategorias…)` y `toast.success` siguen antes. Lo único nuevo es que el `await` espera además la del prefijo de los foros, en paralelo con la de las tareas.
  - En el editor de categorías no hay ninguna consulta de foros observada, así que la invalidación solo marca viejo, no pide nada, y la espera del botón no se alarga.
  - En `useRenombrarTema` y `useBorrarTema` la invalidación nueva entra en el `Promise.all` que ya existía.
- **Ninguna prueba de `features/clases` dejó de vigilar algo:** la suite pasa de 3138 a 3141, que son los tres casos de ATQ-FORO-127, y ninguna cambió. Una prueba que contara las invalidaciones de esas mutaciones se habría puesto roja, no verde.
- Q3 a Q5 tumban, cada una, su caso de ATQ-FORO-127.

### Los 22 vecinos contra el código
- **Del 1 al 16:** cada "aplicado" lo está, porque todos reciben el `foroId` canónico de la entrada o el `tarea.id` de los datos (ver arriba).
  - El 11 (`invalidarTrasCambiarElForo`) no usa el id: "no aplica" es cierto.
  - El 13 (`hooks.ts:367` y `:674`, ahora una línea más abajo) invalida `claveClaseDetalle(claseId)` sin `exact`, lo que alcanza el prefijo `["clases", claseId, …]`: "ya aplica" es cierto.
- **Del 17 al 20:** el "fuera" es cierto, con la razón que da cada uno.
- **El 21 y el 22:** ver T-02.
- **El vecino 23, que agrego yo, es hacia adelante.** Hoy no es alcanzable, pero 01d y 01e van a leer más ids de la URL en las vistas del foro: `:alumnoId` en `ParticipanteView`, y su `key` `${foroId}:${alumnoId}`.
  - La regla del remedio de T-02 (todo id de la ruta que arma una clave pasa por `idCanonicoDeLaRuta` a la entrada) les aplica igual.
  - Los ids que vienen de los datos (`participacion.id`, `elemento.id` en `seccion-de-tema.tsx`) ya son canónicos.
  - **Lo pido en la nota del plan antes de 01d,** junto con la de `claveForo` de la verificación anterior. Una línea más: "Todo `:foroId` y `:alumnoId` que lea una vista del foro pasa por `idCanonicoDeLaRuta` (`features/tareas/lib.ts`) antes de armar una clave, una `key` o una ruta, como hacen `ForoView` y `EditarForoView` desde 01c2 (T-02)."
- **No encontré otra mutación de `features/clases` ni de `features/tareas` que invalide `["clases", c, "tareas"]` sin alcanzar ya el foro.** Las tres de T-03 eran todas, y `useMoverElemento` es de 01d. Las que invalidan `claveTarea` en `features/tareas` son de la tarea misma: el conflicto de entregar, `pedirDeNuevoLaTarea` y el aviso.

### Para el tester: puntos de ataque de la ronda 3 de 01c2 (la última), por prioridad
1. **T-02 por todos los caminos con mayúsculas o con mayúsculas y minúsculas mezcladas en el `:foroId`:**
   - en el detalle: borrar con éxito y luego "atrás", con `404` y con `403`; la descarga de un adjunto con `403`; y la recarga fallida, con un aviso por fallo que no se repite entre la versión en mayúsculas y la de minúsculas;
   - en la edición: el `409` con la vista montada y desmontada, el foco tras perder `puedeEditar`, y «Cancelar»;
   - saltar con el historial entre `…/foros/<A>` y `…/foros/<a>`: el mismo foro no debe montarse dos veces ni guardar estado aparte;
   - el alumno, en su rama.
2. **T-03 en los dos sentidos:**
   - renombrar o borrar un tema y guardar las categorías con el detalle de un foro y la lista de «Foro» en caché: que se marquen viejos y que, al volver, se pidan;
   - que guardar las categorías no deje «Guardar» en espera más tiempo con una consulta de foros observada (por ejemplo, si el editor y un foro conviven en la caché con observadores);
   - que un fallo de esas mutaciones no invalide nada de más.
3. **Los vecinos 13, 21 y 22:**
   - editar la clase o asignar maestros invalida el prefijo de la clase: ¿el detalle del foro y la lista quedan viejos y se piden al volver?;
   - `…/foros/LISTA` y `…/foros/Lista/editar`;
   - la URL en mayúsculas que queda en la barra, tras recargar o volver.
4. **Lo de las rondas 1 y 2, con los dos remedios:** que lo que ya resistió (las claves de T-01, el aislamiento, las guardas, los `VALIDACION` y las redirecciones) siga verde.

**Si la ronda 3 sale ROTO, se escala al humano** (`AGENTS.md`, "Flujo", punto 6).


## Revisión final — FORO-01c2 (2026-11-16)

**Veredicto: APROBADO.** No hay problemas que bloqueen.
- Lint, build y la suite completa del frontend salen en verde, y las cuentas cuadran exactamente.
- Nada fuera de "Se toca", salvo `features/clases/hooks.ts`, que autorizó el humano para T-03. V-01 sale limpio.
- El plan, con la Enmienda 10, y las cuatro decisiones del humano se cumplen.
- Queda una tarea antes de 01d: la nota del plan del punto 6, con la aceptación escrita del humano. No bloquea el commit de 01c2.

**Verificación propia:** lint en verde · build `✓ built in 925ms` · test `Test Files  363 passed (363)` · `Tests  8671 passed (8671)`.

### 1. Corridas
Desde `frontend/`, una a la vez. 01c2 no toca `backend/` ni `shared/` (`git diff --name-only 88b37af -- backend shared` da 0), así que la suite del backend no hace falta.

| Comando | Última línea |
|---|---|
| `npm run lint` | `> tsc -b`, exit 0 |
| `npm run build` | `✓ built in 925ms`, exit 0 |
| `npm run test` (suite completa) | `Test Files  363 passed (363)` · `Tests  8671 passed (8671)` (493.82 s), exit 0 |

**Las cuentas cuadran exactamente:**
- **Archivos:** 363 = 349 (al cierre de 01c1) + 9 pruebas nuevas del programador + 5 `*.ataque` nuevas del tester.
- **Casos:** 8671 = 8442 + 118 + 111.
  - Los 118 son del programador:
    - `hermanos-03d-01c` 20;
    - `vecinos-formulario-tarea-01c` 4;
    - `formulario-foro-01c` 5;
    - `traduccion-foro-01c` 7;
    - `foro-detalle-01c` 35;
    - `crear-editar-foro-01c` 16;
    - `errores-foro-01c` 15;
    - `recuperar-foro-01c` 7;
    - `claves-foro-01c2` 9.
  - Los 111 son del tester: `foros-01c2-r1` 41, `-r2` 39, `-r2-temas` 3, `-r3` 20 y `-r3-temas` 8.
  - La lista cerrada y C-15 cambian aserciones, no el número de casos.
- **Las corridas del tester en la ronda 3 también cuadran:** 1573 = 1553 + 20 y 3149 = 3141 + 8.

### 2. "Se toca", "No se toca" y V-01
- **Dentro de los paquetes, contra `88b37af`:** 33 archivos en `frontend/`, nada en `backend/` ni en `shared/` (`git diff --name-only 88b37af -- backend shared` da 0):
  - **14 de producción:** los 13 de §E8.3 para 01c2 y `features/clases/hooks.ts`, autorizado por escrito por el humano solo para T-03. Su diff sigue siendo el import, las tres invalidaciones y tres comentarios (SHA-256 `32d7d025…`, sin cambio desde la verificación);
  - **9 pruebas nuevas:** las 8 de §E8.3 y `claves-foro-01c2.test.ts` (T-01 y T-02);
  - **4 de la lista cerrada:** `EXCEPCIONES` y CH6-A30 (c) de §E7.5.4; ADM-1D221 con el "después" literal de §E10.2; los tres cambios de N-31;
  - **6 `*.ataque`:** `lib/guardas-ch4-r1.ataque.test.ts` (C-15, ronda 0 bis) y las cinco nuevas del tester (`foros-01c2-r1`, `-r2`, `-r3` en `features/tareas`, y `foros-01c2-r2-temas` y `-r3-temas` en `features/clases`).
- **Fuera de los paquetes, contra `fd4a7ad`:**
  - `infra/`, `.claude/`, `CLAUDE.md` y `docs/DESIGN.md` siguen iguales;
  - el SHA-256 de `AGENTS.md` es `b874bf2c…`, el registrado;
  - `plan.md` sigue en `18d86a8a…`, con la Enmienda 10 aprobada.
  - `docs/trabajo/ENVIVO-investigacion-bigbluebutton.md` lo modificó el humano y él pidió que viaje en este commit: 15 líneas agregadas y 3 quitadas. Es ajeno a FORO-01 y queda fuera de "No se toca".
  - **No trae nada con forma de secreto:** nombra `BBB_URL` y `BBB_SECRET` como variables del `.env` y dice que el secreto "nunca va al repositorio", pero no incluye ningún valor, ninguna URL ni ninguna cadena larga. Lo busqué con un grep de URL y de cadenas de 24 o más caracteres, sin resultados.
- **V-01:** `sha256sum -c v01-foro01c2-r3.txt` (lista `7137cd23…`) da 307 de 307 OK, y `git ls-files -co` da 307 `*.ataque`. Las 302 de antes de 01c2 solo cambiaron en C-15; el programador no tocó ninguna.

### 3. El plan y las decisiones del humano
- **Enmienda 10, opción (A), y N-31:** ADM-1D221 tiene el "después" literal y su precondición se cumple; `editar-tarea-view.test.tsx` cambió solo en las tres líneas, sin condición. Verificado en el resumen.
- **La desviación 6, "aceptarlo como la tarea":** no hubo cambio en el árbol. Va a la fila del foco en `ESTADO.md` (punto 5).
- **T-03, "Autorizo, corregir ahora":** las tres invalidaciones, y nada más, en `features/clases/hooks.ts`.
- **Las pruebas requeridas de 01c2** (§E8.3 y §E9.5) tienen cada una su caso, como verifiqué en el resumen. Las correcciones agregaron T-01, N-32 y T-02, y las tres rondas del tester suman 111 casos.
- **Las frases de recuperación tienen un caso por camino:**
  - FORO-1C24 (desde «Foro», con atrás y adelante, y saltando a otro foro) y FORO-1C26;
  - FORO-1C27 y FORO-1C37 ("…Inténtalo de nuevo.", repitiendo el botón);
  - las dos frases de edición de la desviación 1, que cubre ATQ-FORO-119 (N-33, ronda 1).
- **La matriz de §D-10** coincide con el código, con la corrección de la desviación 6 y el cambio de N-29.
- **N-25 se cerró.**
  - Las filas de «Foro» (`foros-view.tsx`, `${base}/foros/${foro.id}`) llevan a `ForoView`, y «Crear foro» (`${base}/foros/nuevo`) lleva a `CrearForoView`. Las dos rutas existen desde 01c2 en las ramas del maestro y del admin.
  - En la del alumno existe `foros/:foroId`, y `foros/nuevo` lleva a `/login`.
  - Ya no queda ningún enlace hacia la ruta comodín.
- **N-32 y N-33 se cerraron:** N-32 con las aserciones de FORO-1C13 y FORO-1C05, y N-33 con ATQ-FORO-119 del tester.

### 4. Definición de terminado (para 01c2) y reglas de `CLAUDE.md` y `DESIGN.md`
- [x] Cumple su parte de RF-66 a RF-68: crear, editar, ver y borrar un foro; los hermanos T-01 a T-05 y FORO-1C41; los vecinos de CH6-A14 en la tarea. Participar y replicar llegan en 01d, y calificar en 01e.
- [x] Capas y middleware: no hay código del backend. Las rutas del foro ya estaban protegidas (01a y 01b).
- [x] `lint`, `build` y `test` (suite completa) en verde.
- [x] Pruebas de autorización: no hay endpoint nuevo.
- [x] Migración: no hay.
- [x] `infra/` y `.env.example`: sin cambios.
- [x] Documentos: en 01c2 no toca ninguno. `DESIGN.md` §7.34 va en 01e, y `CLAUDE.md` y los demás al cierre del encargo. `ESTADO.md` lo actualiza el orquestador (punto 5).

**Las reglas de `CLAUDE.md` y `DESIGN.md`** se verificaron en el resumen y en las correcciones:
- los tipos en `types.ts`, los textos en `data.ts`, las funciones puras en `lib.ts` (incluida `idCanonicoDeLaRuta`) y los ganchos en `hooks.ts`;
- las guardas de doble clic con un manejador con nombre;
- la `key` por los ids de la ruta, ahora canónicos;
- los retornos tempranos y el orden de los estados;
- solo tokens y una sola acción principal;
- los textos del servidor solo por `mensajeDeErrorForo` y `mensajeDeConsultaForo`.

Las pruebas estáticas vigiladas siguen verdes dentro de la suite completa.

### 5. Lo aceptado o declarado, y lo que va a `ESTADO.md` §3
**Lo aceptado o declarado en 01c2, en un solo lugar:**
- Desviaciones del resumen:
  - 1 (los tres textos con el patrón de la tarea);
  - 2 y 3 (Participantes y las demás claves, en 01d y 01e);
  - 4 (`cancelQueries` y sus dos consecuencias);
  - 5 (las categorías marcadas viejas);
  - 7 (borrar con `404` y la vista montada);
  - 8 (`useAvisoDeRecargaFallidaDe`);
  - 9 (la expresión para O-05);
  - 10 (FORO-1C26);
  - 11 (FORO-1C40 en la edición).
- La desviación 6, por decisión del humano.
- El cambio de la forma de `claveForo` respecto de §D-8 (T-01), con la nota del plan del punto 6.
- El remedio escrito antes que sus casos en T-02, aceptado por la garantía de Q1 y Q2.
- Los detalles que no bloquean:
  - las dos mutaciones de borrar en `AccionesDeLaTarea`;
  - la aserción de "sin volver a pedirlo" en el caso T-02 de la edición, cuya conducta comprobó el tester en la ronda 3.
- Las observaciones del tester:
  - O-01c2-1 y O-01c2-6 (defectos de sus pruebas, corregidos);
  - O-01c2-3 (dos `GET` al guardar, como la tarea, sin efecto visible);
  - O-01c2-9 (React Router no distingue mayúsculas en rutas literales; no es un defecto).

**Filas que cambian o se agregan en `ESTADO.md` §3:**

1. **"Foco al cambiar de ruta en la SPA"** (`:463`). Se le suma, después del caso de FORO-01c1:
   > **Caso que suma FORO-01c2 (desviación 6, decisión del humano del 2026-11-16, "Aceptarlo como la tarea"):** al borrar con éxito un foro (y, desde antes, una tarea), la vista navega a «Foro» (a «Actividades de aprendizaje», en la tarea) y el foco, que estaba en «Sí, borrar …», queda en `<body>`; el plan pedía el `h2` de la sección (§D-10). Se resuelve con el mismo encargo, para la tarea y el foro a la vez. Referencias: `docs/trabajo/FORO-01-actividad-tipo-foro/revision.md`, "Verificación del resumen — FORO-01c2 — implementación (2026-11-16)" y "Revisión final — FORO-01c2 (2026-11-16)".

   El destino no cambia: el encargo del foco al cambiar de ruta, antes de DEPLOY.

2. **Fila nueva:** "Ids de la URL que no son el uuid canónico: palabras reservadas y mayúsculas".
   > Ids de la URL que no son el uuid canónico (anterior a FORO-01 salvo lo dicho; observaciones O-01c2-2, O-01c2-5, O-01c2-7 y O-01c2-8 del tester y vecino 22 de FORO-01c2): (1) una palabra reservada como `:claseId` comparte clave con una lista en caché: `/estudiante/clases/inscritas`, `/estudiante/clases/anteriores`, `/maestro/clases/impartidas` y `/maestro/clases/anteriores`, escritas a mano después de abrir el inicio, "Clases anteriores" o "Clases archivadas", dejan `ClaseLayout` en "Cargando" indefinidamente (`claveClaseDetalle(id) = ["clases", id]` frente a `CLAVE_CLASES_INSCRITAS`, `CLAVE_CLASES_IMPARTIDAS` y `claveClasesAnteriores()`; la vista no se rompe); (2) un uuid en mayúsculas en la URL: la tarea (`detalle-tarea-view.tsx`, la edición, las entregas y la entrega de un alumno) pide con el id de la URL y borra con el de los datos, así que tras borrar «atrás» pinta la tarea borrada y un `404` al borrar no reemplaza la vista (el foro se corrigió en FORO-01c2, T-02, con `idCanonicoDeLaRuta` en `features/tareas/lib.ts`); el `claseId` en mayúsculas daría dos entradas en la caché para la misma clase; (3) `%20` y otros ids llegan sin codificar a la ruta de la API; (4) la barra del navegador conserva las mayúsculas. Gravedad baja: solo se alcanza escribiendo la URL a mano. Remedio de raíz: validar y canonicalizar (minúsculas) el id en un solo lugar, a la entrada de cada vista (`ConClaseDeLaRuta` y los lectores de `:tareaId`, `:foroId`, `:alumnoId` y `:recursoId`), antes de pedir nada, y subir ahí `idCanonicoDeLaRuta`.

   **Destino:** el retiro de compatibilidad e higiene de pruebas, antes de DEPLOY, con su propio plan (toca `components/clase/` y varios módulos). **Referencias:** `reporte-tester.md`, rondas 1, 2 y 3 de FORO-01c2; `revision.md`, "Verificación de la corrección — FORO-01c2: T-01 y N-32" y "Arbitraje de la ronda 2 — FORO-01c2".
3. **Fila nueva:** "El router no tiene `errorElement`".
   > El router de la SPA (`app/router.tsx`) no tiene `errorElement`: cualquier excepción al pintar una vista deja a la persona en «Unexpected Application Error!» de React Router, sin el marco, sin poder navegar y en inglés (lo mostró T-01 de FORO-01c2, ya corregido). Hoy no se conoce ninguna excepción alcanzable. Gravedad media como riesgo de producción. Pide un patrón visual en `DESIGN.md` y textos que aprueba el humano (por ejemplo, "Algo salió mal al mostrar esta página." con "Volver al inicio").

   **Destino:** antes de DEPLOY, en el plan de DEPLOY o en el retiro de compatibilidad e higiene. **Referencias:** las mismas de la fila anterior.
4. **"Hermanos heredados de `features/tareas` que CLASES-03d corrigió…"** (`:404`): **se cierra entera.** FORO-01c2 corrigió T-01 a T-05 en la tarea y en el foro (FORO-1C30 a FORO-1C36), con ADM-1D221 con la vista desmontada actualizado por la Enmienda 10. No queda nada.
5. **"CHORE-06a (los 'sin caso' de CH6-A14)"** (`:352`):
   - la tarea nueva y la edición de tarea quedan cubiertas en sus dos vecinos (FORO-1C40);
   - **queda solo** "rechazo del servidor seguido de uno local" en el panel de calificación, con destino **FORO-01e (FORO-1E40)**.
6. **"ADMIN-01d1 y 01d2 (N-01d1-4 extendido)"** (`:378`):
   - la tarea y el foro, hechos en FORO-01c2: el `409` con la clase archivada o con la vista desmontada deja vieja la actividad, y al restaurar y volver a abrir la edición nace con la versión del servidor (FORO-1C41 y ADM-1D221);
   - **quedan** calificar (fila 33), con destino **FORO-01e (FORO-1E41)**, y el recurso (ruta 20, `RECURSO_MODIFICADO`), que sigue como riesgo declarado. FORO-01 no toca `features/clases` para eso (A-07).

**Lo que va a 01d y a 01e, además de la nota del plan:**
- 01d: `useMoverElemento` con el foro (punto 6) y el vecino 23 (`idCanonicoDeLaRuta`);
- 01e: FORO-1E40 y FORO-1E41 (las filas 5 y 6), y en `DESIGN.md` §7.34 la fila del foro con complemento (de 01c1).

### 6. La nota del plan antes de 01d
La pone el arquitecto, con aceptación escrita del humano. Es una corrección de hechos: no cambia ninguna decisión ni conducta aprobada. Tiene tres partes, cada una con su lugar:

**(a) Debajo de `plan.md:1749`** (la línea de `claveForo` en §D-8), sin borrar esa línea:
> **(Corrección de la ronda 1 de 01c2, T-01; 2026-11-16)** La forma vigente es `claveForo(claseId, foroId) = ["clases", claseId, "foros", "foro", foroId]`: el segmento fijo `"foro"` evita que un `:foroId` igual a `"lista"` coincida con `claveListaDeForos(claseId)` (como `"alumno"` en las entregas de una tarea). La línea de arriba queda como historial. Las claves de 01d y 01e (`claveParticipaciones` … `claveDevoluciones`) se arman siempre con `claveForo(claseId, foroId)` más su segmento, nunca con el literal, y ninguna usa en la posición 3 los segmentos `"lista"` ni `"foro"` para otra cosa.

**(b) Debajo de `plan.md:654`** (§E7.3, "Frontend", punto 3, la viñeta de `ParticipantesView` y `ParticipanteView`):
> **(Corrección de la ronda 2 de 01c2, T-02; 2026-11-16)** Todo `:foroId` y `:alumnoId` que lea una vista del foro pasa por `idCanonicoDeLaRuta` (`features/tareas/lib.ts`) a la entrada, antes de armar una clave, una `key` o una ruta, como hacen `ForoView` y `EditarForoView` desde 01c2. Así la clave de la vista y la de los datos (que el servidor devuelve en minúsculas) son la misma. Las `key` de esta lista (``key={`${foroId}:${alumnoId}`}`` incluida) usan los ids canónicos.

**(c) En dos lugares:**
- **Debajo de la fila "Mover un foro" de §D-10 (`plan.md:1926`):**
  > **(Corrección de la ronda 2 de 01c2, T-03; 2026-11-16)** "Sin cambio" ya no es cierto: `useMoverElemento` (`features/clases/hooks.ts`) hoy solo invalida `claveTarea(claseId, publicacionId)` y `claveRecurso`, que no alcanzan el foro. En 01d invalida también `claveForo(claseId, publicacionId)` (el id de la publicación es el de los datos, ya canónico), y un caso de 01d, con el id que le dé el arquitecto, lo prueba con el detalle del foro en caché (marcado viejo y pedido al volver). El hueco hermano, que renombrar o borrar un tema y guardar las categorías no marcaran viejo el detalle del foro, lo cerró 01c2 con la autorización del humano (T-03): esas tres mutaciones invalidan `clavePrefijoDeForos(claseId)`.
- **En §E7.5.5** (`plan.md:976`, "Se toca" de 01d, la entrada de `features/clases/hooks.ts`), al final de su paréntesis:
  > **(2026-11-16)** y `useMoverElemento`, que invalida además `claveForo` (la fila "Mover un foro" de §D-10).

**Por qué hace falta:** §D-8 y §D-10 son lo que leerán el programador y el tester de 01d. Hoy dicen la forma vieja de la clave y "sin cambio" en `useMoverElemento`, y las dos cosas reabrirían T-01 y T-03.

### 7. Conteo de rondas de 01c2 (para la medición)
- **Rondas de ataque:** 3, en orden ROTO (T-01), ROTO (T-02 y T-03) y RESISTE. No hubo que escalar.
- **Rondas extra por hermanos o estados vecinos:** **1**, la ronda 2. T-02 es un estado vecino de T-01: el mismo mecanismo, con qué id se arma la clave bajo la que vive un foro. T-03 es un hallazgo nuevo, en un archivo que el programador no podía tocar. La ronda 1 fue un hallazgo nuevo (T-01).
- **Resúmenes devueltos:** 0. El resumen de implementación y las dos correcciones se aceptaron.
- **PARADAS:** 1, bien detenida (ADM-1D221, la Enmienda 10).
- **Enmiendas:** 1 (la 10). La nota del punto 6 queda pendiente antes de 01d.
- **Decisiones del humano:** 4, todas en la opción recomendada:
  - la Enmienda 10, opción (A);
  - N-31 ("Cambiarlas ya en 01c2");
  - la desviación 6 ("Aceptarlo como la tarea");
  - T-03 ("Autorizo, corregir ahora").
- **C-n:** C-15 (ronda 0 bis). C-8 no se activó.
- **Regla del modelo del programador:** no se activa (ya está en `opus`). Hubo una ronda extra por vecinos, por debajo del umbral de 2.
- **Lo que la subentrega enseña al arquitecto** (para el cierre de FORO-01 y la regla de inventario de `AGENTS.md`):
  1. el inventario de pruebas que fijan la conducta de hoy tiene que buscar también las de "con la vista desmontada" (ADM-1D221, la PARADA);
  2. el inventario de "lo que cambia lo que muestra un detalle nuevo" tiene que recorrer las mutaciones de **otros** módulos que invalidan el detalle hermano (`features/clases` frente al foro, T-03);
  3. al diseñar claves de caché, un id que viene de la URL nunca ocupa la misma posición que un segmento fijo (T-01), y la clave se arma siempre con el id canónico, el mismo que devuelve el servidor (T-02).

### 8. El tamaño
33 archivos: 14 de producción, 9 pruebas nuevas, 4 de la lista cerrada y 6 `*.ataque`.
- El humano aceptó 31 al autorizar T-03. Los dos de más son las dos `*.ataque` de la ronda 3, del tester, que no son alcance del programador.
- La regla de "unos 30" de `AGENTS.md` sirve para partir una subentrega al **planearla**, no es un tope del commit.
- **No pide nada del humano.** Solo lo sabe en el resumen.

### 9. El commit de 01c2
`git add -n -A -- frontend docs/ESTADO.md docs/trabajo/FORO-01-actividad-tipo-foro docs/trabajo/ENVIVO-investigacion-bigbluebutton.md` da **40 rutas**:
- los 33 de `frontend/`;
- `docs/ESTADO.md`;
- `docs/trabajo/ENVIVO-investigacion-bigbluebutton.md`, por pedido del humano;
- 5 de la carpeta del encargo: `aprobacion.md`, `plan.md`, `reporte-tester.md`, `resumen-programador.md` y `revision.md`.

`docs/trabajo/DEPLOY-investigacion-vps.md` queda fuera (0 coincidencias). No hice ningún `git add` real ni un commit. El commit va solo a la rama (DH-16 (a)).

### Para el humano
1. **01c2 completa el foro para el maestro y el admin:** crear, editar, ver y borrar un foro. El alumno ya puede abrir uno. Los enlaces de la sección «Foro» ya llevan a pantallas que existen.
2. **Se corrigieron cinco defectos heredados de las tareas** (T-01 a T-05 de CLASES-03d), que también afectaban al foro.
3. **El tester encontró tres defectos en tres rondas, todos corregidos:** una clave de caché que chocaba, un id en mayúsculas en la URL y el detalle del foro que no se actualizaba al cambiar temas o categorías. La última ronda resistió.
4. **Tus cuatro decisiones quedaron aplicadas:** la Enmienda 10, los tres cambios de prueba, el foco tras borrar y la autorización de `features/clases/hooks.ts`.
5. **La suite completa del frontend está en verde.** No cambia el backend ni `shared/`.
6. **Dos filas nuevas para `ESTADO.md`, las dos antes de DEPLOY:**
   - los ids escritos a mano en la URL (incluida la tarea con mayúsculas, que no se corrigió aquí);
   - una pantalla de error propia del router.
7. **Antes de 01d, el arquitecto pone una nota de tres partes en el plan.** Necesita tu aceptación por escrito; no cambia decisiones.
8. **El commit lleva 40 rutas,** incluido tu documento de ENVIVO, y deja fuera el de DEPLOY.
