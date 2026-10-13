# Revisión del Manager — ENTREGAS-01 · entregas, hilo privado y edición concurrente

## Revisión del plan — ENTREGAS-01
Veredicto: CAMBIOS REQUERIDOS
Verificación propia: no aplica, porque es una revisión de plan y aún no hay código del encargo. Revisé `plan.md` con SHA-256 `8561e4e968736f5d4a943456b843994cc4581ed6aaee09e32195b4d1b17062f5`, que coincide con `aprobacion.md`. Después solo llené la columna "Recomendación del manager" (líneas 13 a 17; comprobé contra una copia que no cambió nada más). SHA-256 resultante: `5004ea4667ad7ab9f9b27f556ac78101b880227576b06cbb3fed76e37e2e1825`. Contrasté el plan con el código de `<R>` = `dd8edcb`: `handlers/archivos.ts`, `handlers/adjuntos.ts`, `adapters/db/archivos.ts`, `publicaciones.ts`, `tareas.ts`, `temas.ts`, `inscripciones.ts`, `cliente.ts`, `core/archivos/politica.ts` y `schema.prisma` con la migración `20261002141710_archivos`. En el frontend: `features/tareas` (`editar-tarea-view.tsx`, `formulario-tarea.tsx`, `hooks.ts`, `lib.ts`, `data.ts`) y `services/apiClient.ts`. También repasé las pruebas estáticas e inventarios de `backend/test/` y `frontend/src/`.

Resumen: el plan es sólido y está bien fundado. Lo que afirma del código es cierto, incluidos los bloqueos de `editarTarea` y `borrarTarea`, la semántica de cursor del roster, el aislamiento de los comentarios del muro (todas sus consultas filtran por `publicacionId` o por `tipo IN ('anuncio', 'material')`) y el hueco de la descarga. Las cinco preguntas son bloqueantes de verdad y **coincido con las cinco recomendaciones del arquitecto**; en P-05 pongo una condición, M-03. Lo que regresa es el mismo tipo de hueco que M-01 de TAREAS-01, solo que más grande: **siete pruebas `*.ataque` y dos pruebas normales que ya existen se romperán por cambios que el propio plan provoca, y ni §D-R0 ni la lista cerrada del programador las nombran.** Cada una sería una PARADA a mitad de subentrega, y dos de ellas chocan con decisiones de diseño del plan: el `disabled` de "Guardar cambios" y el `target="_blank"` de los enlaces. Además pido cuatro precisiones baratas. **Las respuestas a P-01 a P-05 no dependen de M-01 a M-05:** el orquestador puede llevarle ya la tabla al humano mientras el arquitecto escribe la enmienda.

### Problemas que bloquean

#### M-01 — §D-R0 y la lista cerrada del programador no incluyen siete `*.ataque` y dos pruebas normales que el plan va a romper
Dónde: §D-R0; "Pruebas existentes que el programador puede cambiar"; PA-02 y PA-03; §D-3.6, §D-3.11, §D-8.3 y §D-9.5.
Por qué importa: con el plan tal como está, cada una de estas pruebas falla por un cambio que el plan ordena. Ninguna está en §D-R0 (A-4) ni en la lista cerrada, así que el programador o el tester caen en PA-02 a mitad de subentrega. Es justo el modo de falla de M-01 de TAREAS-01, y en TAREAS-01b se resolvió con C-7 y C-8b. Las comprobé una por una contra `dd8edcb`:

| Prueba | Qué fija hoy | Qué la rompe | Subentrega |
|---|---|---|---|
| `backend/test/sesiones-y-cadena.ataque.test.ts:527` | El inventario exacto de rutas bajo `/api` (`printRoutes`, `toEqual`) | Las 8 rutas de entregas y las 4 del hilo | 01b y 01c |
| `backend/test/lecturas-fx-r1.ataque.test.ts:758` | Los usos exactos de `instantaneaUnica: true`: `clases.ts:4`, `publicaciones.ts:2` y `tareas.ts:2` | `adapters/db/entregas.ts` con `leerMiEntrega`, `listarEntregas` y `leerEntregaDeAlumno` (01b), y con `listarHiloPrivado` (01c) | 01b y 01c |
| `backend/test/muro-c-r1.ataque.test.ts:625` | Solo `colas.ts`, `avisos-de-clase.ts` y `handlers/clases/muro.ts` nombran `COLA_COMENTARIO_CREADO` | `handlers/tareas/hilo-privado.ts` encola `COMENTARIO_CREADO` (§D-5) | 01c |
| `backend/test/temas-01a-r3.ataque.test.ts:440` | Lista cerrada de `handlers/tareas/` (`categorias.ts`, `tareas.ts`, `temas.ts`) y ningún `relacion ===` en esos handlers | `handlers/tareas/entregas.ts` (01b) y `hilo-privado.ts` (01c); el `relacion === "estudiante"` de §D-3.11 (ver M-02) | 01b y 01c |
| `backend/test/instantanea-01b-r1.ataque.test.ts:386, 470, 484` | Llama a `listarTrabajo({ claseId, tema, cursor, limite })` | Si `alumnoId` es obligatorio (§D-3.11), el `tsc` de las pruebas (`npm run lint` del backend) falla | 01b |
| `frontend/src/features/tareas/tareas-01d-r2.ataque.test.tsx:519` | Ningún `disabled` en JSX en todo `features/tareas` | §D-8.3: "Guardar cambios" pasa a `disabled` mientras se muestra el aviso de conflicto | **01a** |
| `frontend/src/features/tareas/tareas-01d-r1.ataque.test.tsx:493` | Ningún `target="_blank"` en todo `features/tareas` | §D-9.5: `lista-de-enlaces.tsx` usa `target="_blank"` | 01d |
| `backend/test/lecturas-consistentes.integracion.test.ts` (normal) | Llama 5 veces a `listarTrabajo` y una a `moverATema` | La firma nueva de `listarTrabajo` | 01b |
| `backend/test/archivos.integracion.test.ts:441` (normal) | Llama a `buscarArchivosParaConfirmar({ ids, claseId, subidoPor })` | §D-3.6 vuelve obligatorio `prefijo` | 01b |

Qué se espera:
1. Por cada `*.ataque`, el arquitecto decide una de dos cosas. Si el diseño cambia para no romperla, se aplica eso; por ejemplo, `alumnoId` opcional en `listarTrabajo` con ausencia = `null`, o "Guardar cambios" sin `disabled`, como pide M-03 d. Si no, va un C-n en §D-R0 con la subentrega, el cambio mínimo y su motivo. Por ejemplo: el inventario de rutas suma exactamente las 12 rutas de la tabla "Autorización"; la lista de `instantaneaUnica` suma `adapters/db/entregas.ts:N` con N fijo; la lista de `COLA_COMENTARIO_CREADO` suma `handlers/tareas/hilo-privado.ts`; la lista de `handlers/tareas/` suma los dos archivos nuevos y conserva la regla de `relacion ===`. Para `target="_blank"`, la regla pasa a exigir que todo `target="_blank"` de `features/tareas` lleve `rel="noopener noreferrer"` y viva solo en `lista-de-enlaces.tsx`, sin quitar la regla.
2. Las dos pruebas normales entran en la lista cerrada del programador, solo para sumar el argumento nuevo.
3. Una instrucción para la ronda 0 de cada subentrega: el tester inventaría las listas cerradas, los inventarios estáticos y las llamadas directas a funciones cuya firma cambia, **antes** de que el programador empiece. Si encuentra otra que el plan no previó, es PARADA del orquestador y no un C-n improvisado. Aunque el corte por subentrega resuelva la mayoría, esta tabla no es necesariamente exhaustiva.

#### M-02 — §D-3.11 obliga a comparar la relación del sexto paso dentro del handler
Dónde: §D-3.11 ("el handler pasa `perfil.id` solo si la relación del sexto paso es `"estudiante"`"); "Cambios por capa", `handlers/tareas/tareas.ts` (01b).
Por qué importa: `temas-01a-r3.ataque.test.ts:440` prohíbe `relacion ===` en `handlers/tareas/`. El precedente que el plan cita (`puedeMover`) no compara nada en el handler: llama a `puedeMoverElemento(relacion)` de `core/tareas/temas.ts`. El espíritu de la regla 2 de `AGENTS.md` es que el handler no razone sobre roles.
Qué se espera: una función pura en `core/` que reciba la relación y el id del perfil y devuelva el id del alumno o `null` (por ejemplo, en `core/entregas/entregas.ts`), con su prueba unitaria en PR-1B03 o en una nueva. El handler solo la llama. `core/tareas/` y `core/entregas/` no están en "No se toca".

#### M-03 — El `409 TAREA_MODIFICADA` del formulario no dice cómo convive con los mecanismos que ya tiene `features/tareas`
Dónde: §D-8.2, §D-8.3, PR-1A12 a PR-1A14; P-05 (condición de mi recomendación).
Por qué importa: el formulario de edición es justo donde TAREAS-01d gastó las rondas 2 a 4 por estados vecinos de recarga y foco (T-09, T-13, T-14 y T-15). El plan describe el resultado del conflicto, pero no lo relaciona con lo que ya existe, y el programador tendría que adivinar en cinco puntos:
- **(a) Aviso duplicado.** `useEditarTarea.onError` (`hooks.ts:133`) avisa con `toast.error(mensajeDeErrorTareas(error))` todo error que no es de campo. Con el aviso en línea, el `409` saldría dos veces y el lector de pantalla lo anunciaría dos veces.
- **(b) "Cargar la versión actual" sin decir con qué consulta.** Si es otra petición, duplica lo que ya resuelven `useAvisoDeRecargaFallida` (un solo aviso por fallo, incluido `StrictMode`), `errorQueReemplazaLaVista` (404) y `puedeEditar`. Además, el "aviso de `sonner` con el texto de recarga fallida" de §D-8.3 se sumaría al que ya da ese gancho.
- **(c) Reinicializar el formulario.** El estado nace una sola vez (`useState(() => estadoInicialDelFormulario(tarea))`, `formulario-tarea.tsx:77`) y el plan no dice cómo se reinicia (por ejemplo, remontando con `key` por versión). Tampoco dice si `TAREA_MODIFICADA` entra en `CODIGOS_QUE_RENUEVAN_LA_TAREA`. Si entra, la consulta se recarga sola al recibir el `409`, y hay que asegurar que esa recarga ni reinicia el formulario ni quita el aviso.
- **(d) Foco.** Al remontar, "Cargar la versión actual" se desconecta y la clave de `useFocoAlPerderseElControl` cambia (lleva `dataUpdatedAt`). El resultado que se espera (foco en "Título") depende del orden de los efectos, y el plan no lo nombra. Además, el `disabled` de "Guardar cambios" choca con `tareas-01d-r2` (M-01).
- **(e) Estados vecinos que faltan en las pruebas requeridas.** Un segundo `409` seguido después de cargar. Una recarga exitosa en segundo plano (por enfocar la pestaña) con el aviso visible. Los archivos elegidos: el formulario los sube como pendientes **antes** del `PUT`, así que tras el `409` existen en el almacén y se pierden al cargar la versión actual, y el aviso dice "Copia lo que necesites" sin mencionarlos.

Qué se espera: §D-8.3 reescrito en términos de los mecanismos existentes:
1. El `409` no da aviso de `sonner`; solo el aviso en línea.
2. "Cargar la versión actual" es el `refetch` de la misma consulta `useTarea`, y la recarga fallida, el 404 y la pérdida de `puedeEditar` quedan en manos de los ganchos que ya existen, sin un aviso nuevo.
3. Se dice cómo se reinicia el formulario y que ninguna otra recarga lo reinicia.
4. Se nombra el destino del foco frente a `useFocoAlPerderseElControl`.
5. "Guardar cambios" queda sin `disabled`. Sigue el precedente del tope de criterios: no envía nada y lleva el foco a "Cargar la versión actual".
6. El texto del aviso dice qué pasa con los archivos elegidos, o el formulario los conserva.

PR-1A13 y PR-1A14 suman los estados de (e). No pido ningún gancho nuevo: el remedio es reutilizar los que hay.

#### M-04 — Faltan dos pruebas: entregar y anular a la vez, y el hueco de la descarga en rojo antes del remedio
Dónde: PR-1B09, PR-1B11, PR-1B17; paso 4 de 01b.
Por qué importa: el orquestador pidió de forma explícita la concurrencia "entregar y anular a la vez". El plan la tiene solo entre los puntos de ataque; PR-1B09 cubre dos entregas, no una entrega contra una anulación. Además, el paso 4 de 01b dice que PR-1B17 debe fallar antes del cambio de §D-3.6, pero en ese paso todavía no existe ninguna ruta que confirme un archivo de entrega (llegan en los pasos 6 y 7). Así la prueba no puede estar en rojo cuando el plan lo pide.
Qué se espera:
- **PR-1B09 bis.** Anular retenido con `conFilaRetenida` sobre la fila de `entregas` mientras llega una entrega, y entregar retenido mientras llega una anulación. Las dos quedan en serie, sin `500`. El estado final es coherente: o `entregado` con sus archivos confirmados, o `asignado` con los archivos `descartado` y sin `entrega_id`, y nunca un archivo confirmado colgado de una entrega `asignado`. La versión final es la de partida más las operaciones que tuvieron éxito, y no queda ningún `ENTREGA_REALIZADA` de una entrega que se revirtió.
- **PR-1B17** fabrica el archivo de entrega confirmado con SQL parametrizado (la migración de 01a ya lo permite), igual que PR-1B18. Así queda en rojo en el paso 4, antes de §D-3.6, y el resumen anota esa corrida roja con su comando y su última línea.

#### M-05 — El texto de R-01 para ESSENTIALS es más amplio que lo que el plan implementa y dejaría fuera de la regla código ya aprobado
Dónde: R-01; "Documentos a actualizar", ESSENTIALS, "Reglas de datos" (viñeta "Edición concurrente").
Por qué importa: tal como está redactada ("una fila que dos personas pueden cambiar a la vez desde lo que tenían en pantalla lleva `version`"), la regla abarcaría al editor de categorías, que guarda en bloque sin versión. Para ese editor, el humano decidió el 2026-10-11 descartar y recargar. También abarcaría a renombrar y ordenar temas. ESSENTIALS manda sobre los demás documentos, así que el primer revisor que lea la regla marcaría como defecto código aprobado.
Qué se espera: la regla acotada a lo que de verdad protege. Las filas que se editan con un formulario que reemplaza lo guardado (hoy `tareas`) y las decisiones que alguien toma sobre lo que vio (calificar una entrega, en CALIFICACIONES) llevan `version`. Las excepciones se nombran con su motivo: categorías, descartar y recargar (decisión del humano, 2026-10-11); temas, renombrar y ordenar sin versión, porque no hay texto largo que perder. El resto del texto se conserva.

### Lo que verifiqué y está bien
- **Cobertura del PRD.**
  - RF-14: entregar con archivos y enlaces, anular y volver a entregar mientras no esté calificada. El cierre de P-02 es un límite adicional y está bien planteado como pregunta.
  - RF-15 y RF-44: `con_retraso` se fija al entregar, la entrega se cierra en la fecha límite y se reabre.
  - RF-16: un hilo por alumno y tarea. Los avisos a la contraparte (§D-5) coinciden con la tabla de avisos del PRD §4.
  - RF-24 (P-03) y RF-35: lista con estado, fecha y conteo; "a tiempo o tarde" se ve en la insignia.
  - RN-02: ninguna función nueva lee el estado de pago y las respuestas usan esquemas `z.strictObject`.
  - RN-03 (`withAccess`; PR-1B24 y PR-1C07), RN-06 (el admin, según P-01) y RN-07 (S-04; ver N-01).
  - Nada inventado: lo que el PRD no cubre va como pregunta o como suposición vetable. Los triviales de 01a (O-1, O-2, O-3, "Sin tema" y el `?? ""` del título) tienen destino ENTREGAS en `docs/ESTADO.md` §3 y son pequeños.
- **Capas y cadena.** Las 13 rutas declaran `roles` y sexto paso. `:claseId` va en el tercer segmento, así que la guarda `onRoute` las acepta y `middleware/` no se toca. Que `:alumnoId` sea un alumno inscrito es un filtro de datos con `404 ALUMNO_NO_ENCONTRADO` uniforme, no una verificación de permisos; es correcto. La única comparación de rol a mano es la de M-02.
- **Consultas.** Cada consulta de "Acceso a datos" encaja en un índice existente o de §D-1. `listarEntregas` reutiliza las condiciones del roster (el plan aceptado en §D-B3 bis de CLASES-01). `entregadas` usa el prefijo `tarea_id` del único y la PK de `inscripciones`. "Trabajo de clase" hace una sola consulta de entregas por página (PR-1B23). Toda lista se pagina con un máximo de 100, y el SQL crudo nuevo va etiquetado y parametrizado (PA-04).
- **Cola.** `ENTREGA_REALIZADA` y `COMENTARIO_CREADO` se encolan con `alGuardar` en la transacción del dato; `adapters/db` no importa `adapters/queue` y `workers/` no cambia. Que anular no encole nada (S-09) es correcto: la versión ya invalida el aviso.
- **Bloqueos.** Recorrí los cruces. Entregar, anular y comentar toman `FOR KEY SHARE` de `tareas`:
  - frente al `FOR UPDATE OF t` de `borrarTarea` quedan en serie;
  - con el `FOR NO KEY UPDATE OF t` de `editarTarea` son compatibles, y la entrega decide con la tarea confirmada que vio, una serialización válida en READ COMMITTED.
  - Dos entregas del mismo alumno quedan en serie sobre la fila de `entregas`.
  - `moverATema` pasa a tomar `tareas` antes que `publicaciones`, en el mismo orden que editar y borrar. Hoy no bloquea `tareas` (`temas.ts:154-180`); el cambio es una línea.
  - El `FOR KEY SHARE` del tema no choca con otro `FOR KEY SHARE`, y borrar un tema (`SET NULL` sobre `publicaciones`) no forma ciclo.
  - PR-1A08 y PA-05 cubren el riesgo que queda.
- **Archivos.** Todo va por URL prefirmada. El alumno sube por su propia ruta con clave `entregas/{tareaId}/{alumnoId}/{archivoId}`, la confirmación va dentro de la transacción con el prefijo y nada pasa por Node.
- **Migración.** Es compatible hacia atrás: aditiva, relaja `NOT NULL` y el `CHECK`, y el backend anterior solo lee comentarios por `publicacionId`, así que nunca ve los privados. Se puede revertir, con la salvedad de N-02. Las fechas son `timestamptz(3)` en UTC.
- **Trabajos diferidos.** No hay nuevos. PR-1A03 comprueba que un `409` no cancela ni recrea `RECORDATORIO_24H`.
- **Instantánea única y cursor antes de la página.** Las cuatro lecturas nuevas lo cumplen (ver N-04).
- **Reglas heredadas de TAREAS-01.** Están todas:
  - listas cerradas estáticas del frontend (más las del backend que faltan, M-01);
  - reloj fijo y `testTimeout` de 15 s;
  - guarda síncrona con ref en cada acción que lanza una mutación (§D-8.3, §D-9.3, §D-9.4 y §D-9.6);
  - "Ver más" con `isFetching` (§D-9.6 y §D-10.2);
  - hermanos y estados vecinos, resúmenes verificables y una sola suite a la vez (Verificaciones).
- **"No se toca", A-2 y A-3.** Son coherentes con los cambios por capa. La función de M-02 cabe en `core/entregas/` o `core/tareas/`, que no están protegidos.

### El hueco de la descarga (§D-3.6, R-06)
- **El diagnóstico es cierto, pero el hueco está latente.** `buscarArchivoConfirmado` (`adapters/db/archivos.ts`) filtra solo `id`, `claseId` y `estado: "confirmado"`, y `POST /clases/:claseId/archivos/:archivoId/descarga` admite a cualquier inscrito (`handlers/archivos.ts`). Hoy no se puede explotar: el `CHECK archivos_confirmado_si_y_solo_si_contexto` (`20261002141710_archivos`) obliga a que todo archivo confirmado tenga `publicacion_id`, y los comentarios del muro no tienen adjuntos en el esquema. La migración de 01a relaja ese `CHECK`, pero ningún código escribe `entrega_id` hasta 01b, así que el hueco nace con 01b.
- **El remedio no rompe nada.** `publicacionId: { not: null }` deja igual la descarga de materiales, anuncios y adjuntos de tareas, que hoy tienen todos `publicacion_id` (las tareas usan `claveDeMaterial` y la misma confirmación). Los comentarios no tienen archivos que perder. La confirmación con prefijo también es correcta. La clave del objeto no cambia nunca, la lectura previa (`archivosParaConfirmar`) ya filtra por prefijo y el `CHECK` nuevo impide dos contextos. Por eso el `UPDATE` de la transacción (`crearPublicacion`, `confirmarArchivos`) no necesita repetir el prefijo, aunque conviene decirlo (detalle).
- **Cuándo.** En 01b, como paso 4 y antes de crear las rutas de entregas, es el lugar correcto. No hace falta un fix aparte ni adelantarlo a 01a, porque ningún commit queda con el hueco abierto. Hay dos condiciones: PR-1B17 en rojo con una fila fabricada (M-04) y la nota de vuelta atrás (N-02).

### A-6: los dos apartamientos de ESSENTIALS
- **R-01 es necesaria.** ESSENTIALS no tiene ninguna regla contra "gana el último que guarda", y la regla es transversal: CALIFICACIONES la usará. El texto propuesto es demasiado amplio (M-05).
- **R-02 no es una contradicción estricta.** ESSENTIALS ya prevé `campus-privado/entregas/`, y la frase "solo los sube un maestro de la clase o el admin" habla de materiales, anuncios y adjuntos de tareas. Aun así, la viñeta nueva es correcta y evita leerla como "los estudiantes nunca suben". El texto está bien; las cifras dependen de P-04.

### Subentregas y bases
- **01a vertical es necesaria, aunque por otra razón que la que da R-03 (N-05).** La alternativa compatible sería una `version` opcional en el servidor hasta 01d. Cuesta más de lo que ahorra: un cambio de contrato a mitad del encargo, un C-n más y un periodo en que un `PUT` sin versión gana en silencio. 01a toca un solo flujo (editar tarea) y respeta "backend primero" dentro de la subentrega, en el orden de `CLAUDE.md`. 01b y 01c son solo backend, salvo los dobles de "Trabajo de clase" que el plan ya declara; 01d y 01e son solo frontend.
- Con M-01 resuelto, cada subentrega cierra con `lint`, `test` y `build` en verde. Las bases (`<R>` = `dd8edcb` fuera de los paquetes; `<K1a>` a `<K1d>` dentro) siguen "Commits y cierre de subentregas".

### Pruebas requeridas
Autorización de cada ruta nueva (PR-1B24, PR-1B25, PR-1C05 y PR-1C07): completa. Cubre rol incorrecto, clase ajena igual que inexistente, alumno restringido sin escribir nada y ningún dato de pago, tampoco en los errores ni para el admin. Cierre y retraso: PR-1B01 a PR-1B03, con `ahora` explícito y la frontera del milisegundo. Concurrencia: PR-1A04, PR-1A08, PR-1B09, PR-1B22 y PR-1C06, y falta la de entregar contra anular (M-04). Borrar una tarea con entregas: PR-1B22. Aislamiento del hilo frente al muro y entre alumnos: PR-1C04. Hueco de la descarga: PR-1B17 (M-04). La lista cerrada y §D-R0 son el objeto de M-01. Puntos de ataque, PARADAS, verificaciones con comando y última línea, y la hoja de comprobación humana (7 puntos, todos de lo que las pruebas no ven: almacén real, reloj real, 360 px, lector de pantalla y dos pestañas): bien.

### Suposiciones
Ninguna tiene que pasar a pregunta bloqueante: si se vetan, cada una se cambia sin rediseñar. **No recomiendo vetar ninguna**, pero dos piden la atención del humano:
- **S-04 (hilo sin borrar ni editar).** RN-07 se presenta como "regla general para todo lo que se publica en una clase", y un hilo donde nadie borra nada se aparta de esa letra. Es razonable para el piloto, porque RF-16 pide el hilo y no su moderación, y agregarla después cuesta dos rutas y `puedeBorrar`. Pero el humano debe saberlo, y si la acepta, el PRD debe decirlo (N-01).
- **S-06 (borrar una tarea borra las entregas).** El plan lo resuelve así: en la misma transacción de `borrarTarea`, después del `FOR UPDATE OF t` y de la autoría, los archivos de entrega pasan a `descartado` y la cascada borra entregas y comentarios privados. Los objetos quedan en el almacén hasta que exista `LIMPIEZA_DIARIA` (antes de DEPLOY). Técnicamente es correcto, pero destruye trabajo de los alumnos con un clic del maestro. La confirmación en línea lo dice, y la alternativa (`409` si hay entregas) es un veto barato.
- **S-02 (anular quita archivos y enlaces).** Los archivos pasan a `descartado` y la base no queda con huérfanos. Los objetos esperan a `LIMPIEZA_DIARIA`, igual que los adjuntos que quita hoy una edición de tarea. Razonable.
- **S-05 (la lista del maestro sin estado de pago, restricción ni correo).** Razonable. RF-35 no lo pide y RF-39 ya lo muestra en el roster. Que `listarAlumnosDeClase` siga siendo la única lectura del estado de pago reduce la superficie de RN-02.
- S-01, S-03, S-07 a S-11 y S-13 a S-16: razonables. S-12, con la nota N-03.

### Carril y modelo del programador
**Sensible: correcto.** Hay una migración, rutas con sexto paso, el endurecimiento de la descarga de archivos y la restricción de acceso en todas las rutas nuevas. **`opus` para el programador (R-13): de acuerdo.** Es la decisión del humano del 2026-10-07, y 01a, 01d y 01e tocan justo el mecanismo de foco que produjo las rondas extra en TAREAS-01d.

### Problemas que no bloquean
- **N-01 — S-04 frente a RN-07.** Si el humano acepta S-04, "Documentos a actualizar" suma a `PRD.md` RF-16 una línea como: "En esta fase, los comentarios privados no se borran ni se editan (ENTREGAS-01)." Así RN-07 no queda contradicha en silencio.
- **N-02 — Volver atrás después de 01b.** Un backend anterior a 01b, con archivos de entrega en la base, reabre el hueco de la descarga (su `buscarArchivoConfirmado` no filtra por contexto). Además, su `borrarTarea` fallaría con un `500` por la FK `NO ACTION` de `archivos.entrega_id`. R-10 solo habla del frontend. Hay que anotarlo para DEPLOY: no se revierte el backend a antes de 01b con entregas en la base.
- **N-03 — El `CHECK` de fecha según estado condiciona a CALIFICACIONES.** `("estado" = 'asignado') = ("fecha_entrega" IS NULL)` impide calificar a quien nunca entregó (un cero por no entregar) sin relajarlo antes. Es compatible relajarlo después, pero conviene escribirlo en §D-11 para que su plan lo decida.
- **N-04 — Semántica del cursor de `listarEntregas`.** §D-0.7 dice "el cursor se comprueba contra la misma lista (mismo dueño)", pero la lista reutiliza la regla del roster: sirve cualquier usuario que exista, y un alumno dado de baja sigue sirviendo como cursor (`inscripciones.ts:64`). PR-1B20 es coherente con el roster. Basta con decirlo de forma explícita para que el tester no lo marque como defecto.
- **N-05 — La premisa de R-03 no es exacta.** `editarTareaSchema` no tipa nada en el frontend (`apiClient` recibe `body: unknown`), así que sumarle `version` no rompe el `build`. Lo que sí lo rompe son los campos obligatorios nuevos de `tareaDetalleSchema`. Los dobles tipados entran en `tsc -b` (por ejemplo, `features/tareas/lib.test.ts:135`, `tareaDeEjemplo: TareaDetalle`) y el `parse` en las pruebas. Además, el flujo real se rompería: un `PUT` sin versión responde `400`. La conclusión (01a vertical) no cambia; el motivo de R-03 debe ser el correcto para que el humano decida sobre lo cierto.

### Detalles menores
- A-2 nombra `handlers/archivos.ts`, pero el plan no le cambia nada (el cambio está en el adaptador): o se quita, o se dice qué cambia.
- Pruebas de integración de cierre y retraso: la fecha límite debe llevar un margen de al menos una hora, o usar un `Date` falso del proceso (la API corre en el mismo proceso con `inject`). La frontera del milisegundo se queda en `core/`.
- `entregas_alumno_id_idx` no lo usa ninguna consulta de este encargo. Conviene justificarlo ("Mis calificaciones") o dejarlo para CALIFICACIONES.
- §D-3.6: una frase que explique por qué el `UPDATE` de la transacción de una publicación no repite el prefijo ni `entregaId: null`.

### Lista de diseño (sobre el plan; se verifica en la revisión final)
- Solo tokens: el aviso de conflicto usa `--warning-soft` y `--foreground` con `TriangleAlert`, y la tabla de entregas es opaca dentro de un `Card`, como el roster (§8).
- El estado nunca va solo con color: las insignias de §7.8 llevan texto, y la fila de §7.7 dice el estado en palabras.
- Una sola acción principal por vista: "Entregar tarea" o "Marcar como completada" en "Tu trabajo"; las vistas del maestro no tienen ninguna.
- Estados de error, carga y vacío en cada vista nueva.
- 360 px en H-4; foco y etiquetas nombrados en cada acción.
- Textos en el tono de §9, sin palabras prohibidas ni emojis.
- Patrones nuevos con su lugar en `DESIGN.md`: §7.21 para el aviso de conflicto, §7.24 a §7.26 y §8, con la marca "propuesta (ENTREGAS-01x)".
- El plan no tiene degradados, manchas ni nada parecido a Google Classroom.

### Desacuerdos arbitrados
Ninguno (revisión de plan).

### Documentos a actualizar
Además de los que lista el plan, que están bien redactados para ESSENTIALS, `ARCHITECTURE.md` §7, §8, §11 y §14, `PRD.md`, `CLAUDE.md`, `DESIGN.md` y los README del backend:
- ESSENTIALS: la regla de R-01 acotada (M-05).
- `PRD.md` RF-16: la línea de N-01, si el humano acepta S-04.
- `docs/ESTADO.md` §3:
  - para DEPLOY, N-02 y R-10 (backend y frontend juntos; no revertir el backend a antes de 01b con entregas);
  - para CALIFICACIONES, §D-11 más N-03;
  - para NOTIFICACIONES, lo que §D-5 pide descartar a cada consumidor.

### Para el humano
Las cinco preguntas son bloqueantes de verdad: P-01 es de privacidad, P-02 interpreta RF-44, P-03 cambia el esquema y el formulario, P-04 cambia la política de archivos y su costo, y P-05 es la decisión que usted dejó para este encargo. No falta ninguna pregunta.

| Id | Recomendación del arquitecto | Recomendación del manager | ¿Coinciden? |
|---|---|---|---|
| P-01 | (a) El admin ve entregas e hilos y no escribe | (a): igual que en el muro; RN-06 le da alcance y el texto de privacidad lo hace explícito | Sí |
| P-02 | (a) Cerrada: ni entrega ni anula; mover la fecha o aceptar tardías la reabre | (a): la única que cumple RF-44 al pie de la letra y deja reabrir sin guardar nada nuevo | Sí |
| P-03 | (a) Campo "Cómo se entrega"; sin adjuntos obligatorios, el alumno puede adjuntar | (a): una sola regla en el servidor; la columna nace en `true` | Sí |
| P-04 | (a) 5 archivos de 25 MB y 5 enlaces, como los materiales | (a): una sola política; un tope mayor solo encarece el abuso; el video, por enlace | Sí |
| P-05 | (a) Versión entera en `tareas` y `entregas` desde este encargo | (a), con la condición M-03: el aviso del `409` reutiliza los mecanismos de recarga y foco que ya tiene el formulario. Si usted prefiere menos riesgo: (a) en el servidor, y en el formulario descartar y recargar, como ya aprobó para las categorías | Sí, con condición |

**Suposiciones:** no recomiendo vetar ninguna. Mire con atención S-04 (hilo sin borrar ni editar, frente a la letra de RN-07) y S-06 (borrar una tarea borra las entregas de los alumnos; la alternativa es un `409`).

**A-6:** R-01 es necesaria, con el texto acotado que pide M-05. R-02 es una aclaración correcta. Las dos requieren su firma.

**Siguiente paso:** el arquitecto escribe una enmienda con M-01 a M-05 (sin rediseño: tablas de C-n, una función pura, la especificación del `409` y dos pruebas) y el manager la revisa. Usted puede contestar P-01 a P-05 desde ya, porque las correcciones no dependen de sus respuestas.

## Revisión de la Enmienda 1 — ENTREGAS-01
Veredicto: APROBADO CON OBSERVACIONES. Queda condicionado a las respuestas del humano a P-01 a P-05 y a sus vetos de S-nn y A-nn. No hay M-nn nuevos.
Verificación propia: no aplica, porque es una revisión de plan. Revisé `plan.md` con SHA-256 `879e3537b9678f3f0d69bf9f06f7459bfe2f1177d6d4c54aac210db00bcabed6` (799 líneas). La columna "Recomendación del manager" sigue intacta: comparé por script las cinco celdas contra las que escribí, y son idénticas. En la fila P-05 solo cambió la celda del arquitecto. Contrasté de nuevo contra `dd8edcb`: `features/tareas/hooks.ts`, `editar-tarea-view.tsx` y `formulario-tarea.tsx`; `backend/test/sesiones-y-cadena`, `lecturas-fx-r1`, `instantanea-01b-r1`, `lecturas-consistentes.integracion`; `core/tareas/temas.ts`, `core/clases/pertenencia.ts`, `shared/src/tareas.ts`.

Resumen: la enmienda responde a los cinco M y a los cinco N, cada uno aplicado en su lugar con la marca "Enmienda 1". Quedan tres precisiones de ronda 0 que el tester puede aplicar sin enmienda (observaciones O-1 a O-3).

### M-01: resuelto
- **C-1 a C-5 están en §D-R0, uno por cada `*.ataque` que señalé.** Cada uno dice la subentrega, el cambio mínimo y el motivo. Las otras dos `*.ataque` se salvan por diseño:
  - `instantanea-01b-r1`, porque `alumnoId` pasa a ser opcional en `listarTrabajo`;
  - `tareas-01d-r2`, porque "Guardar cambios" queda sin `disabled`. Comprobé que ya no queda ningún `disabled` en el diseño de `features/tareas`; el tope de enlaces de §D-9.3 tampoco lo usa.
- **`alumnoId` opcional no rompe otra cosa.**
  - Los llamadores de `listarTrabajo` son el handler (`handlers/tareas/tareas.ts:214`, que se cambia), `instantanea-01b-r1` (líneas 386, 470 y 484) y `lecturas-consistentes.integracion` (cinco llamadas). Con el parámetro ausente no se hace la consulta de entregas, así que las pruebas que cuentan o interceptan sentencias con `ejecutorConGancho` (PR-1B16a a c, PR-1B18a) ven las mismas sentencias.
  - Las aserciones exactas miran `elementos[i].id` o `elementos[0].tarea`, y `entrega` va al lado de `tarea`, no dentro.
  - `tareas.ts` conserva sus dos `instantaneaUnica: true`, como dice C-2.
- **Cada C-n describe el cambio de contrato.**
  - C-1: 8 rutas en 01b y 4 en 01c, como en la tabla "Autorización".
  - C-2: `entregas.ts:3` y después `:4`.
  - C-3: suma `hilo-privado.ts`.
  - C-4: suma los dos handlers y conserva la regla de `relacion ===`.
  - C-5: la regla se mantiene con una excepción acotada a un solo archivo, con `rel="noopener noreferrer"` y con un motivo bien escrito.
  - Ver O-1 y O-2 para dos precisiones de conteo.
- **Las dos normales están en la lista cerrada del programador.** `archivos.integracion` entra solo para sumar `prefijo`. Que `prefijo` siga obligatorio es la decisión correcta: un olvido no puede confirmar en silencio un archivo de otro contexto.
- **El inventario de la ronda 0 está en §D-R0 y en "Puntos de ataque", Ronda 0.** Si aparece algo que el plan no previó, es PARADA del orquestador.

### M-02: resuelto
`alumnoDeLaRelacion(relacion: RelacionConClase, perfilId)` es pura y vive en `core/entregas/entregas.ts`. El tipo existe en `core/clases/pertenencia.ts:3` y ya lo importa `core/tareas/temas.ts`, así que no cruza capas. Tiene su prueba unitaria en PR-1B03 bis, y la misma prueba exige que `handlers/tareas/tareas.ts` no contenga `relacion ===`. Ningún handler conserva la comparación: §D-3.11 dice de forma explícita que el handler solo llama a la función.

### M-03: resuelto, y realizable sin ganchos nuevos
Contrasté §D-8.2 y §D-8.3 con el código:
- **Un solo aviso.** El retorno temprano en `useEditarTarea.onError` (`hooks.ts:133`) sigue el patrón que ya existe para los errores de campo. `TAREA_MODIFICADA` queda fuera de `CODIGOS_QUE_RENUEVAN_LA_TAREA` (`data.ts:158`), así que no hay recarga automática.
- **"Cargar la versión actual" = `consulta.refetch()` de `useTarea`, en la vista.**
  - Con datos en caché, un `refetch` fallido (red o 5xx) activa `useAvisoDeRecargaFallida`, que ya da un solo aviso por fallo.
  - Un `404` o un `403 SIN_ACCESO_A_LA_CLASE` cumplen `errorQueReemplazaLaVista` (`lib.ts:198-205`), y la vista ya muestra `sinPermisoParaEditar`. No hace falta ningún aviso nuevo.
- **Versión y reinicio.** El estado nace una sola vez (`formulario-tarea.tsx:77`), así que la versión en el mismo inicializador perezoso es la de apertura. `key={reinicios}` es el único disparador del reinicio y lo cambia solo un `refetch` con éxito y con `puedeEditar`. Las categorías y los temas ya están en caché, así que el remontaje no pasa por "Cargando".
- **Foco.** El orden que describe es correcto. El `refetch` con éxito cambia `dataUpdatedAt`, y la clave de `claveDeFocoDeLaTarea` (`lib.ts:268`) cambia en un commit en que el botón todavía está conectado: `useFocoAlPerderseElControl` no mueve nada. El remontaje ocurre en el commit siguiente, con la misma clave, así que ese efecto ni siquiera corre. El efecto de montaje del hijo lleva el foco a "Título". En un `404` o al perder `puedeEditar`, el botón desaparece y el gancho lleva el foco a la raíz, que es lo que ya hace hoy.
- **"Guardar cambios" sin `disabled`.** No envía y lleva el foco al botón, como el precedente del tope de criterios.
- **Archivos elegidos.** El texto del aviso dice que no se adjuntaron, y quedan `pendiente` hasta la limpieza.
- **Estados vecinos.** PR-1A13 y PR-1A14 cubren el segundo `409`, la recarga de fondo con el aviso a la vista, el `refetch` fallido, el `404`, la pérdida de `puedeEditar`, los archivos ya subidos (sin volver a subirlos) y la primera apertura sin mover el foco.
- **Sobre la celda de P-05 del arquitecto, que ahora incluye mi variante (a′): mi recomendación no cambia.** Sigue siendo (a), y la condición M-03 ya se cumple. El argumento del arquitecto es bueno: una tarea lleva hasta 10 000 caracteres de instrucciones y hasta 20 criterios, y la especificación no agrega ningún gancho. (a′) queda como alternativa aceptable si el humano prefiere el menor riesgo de implementación.

### M-04: resuelto (precisión en O-3)
- **PR-1B09 bis.** Retiene la fila de `entregas` con `conFilaRetenida`, usa `formadasDetrasDe` y cubre partir de `entregado` y partir de `asignado`. Los resultados válidos de cada orden tienen su versión final (`v + 2` o `v + 1`), con el invariante "ningún archivo confirmado colgado de una entrega `asignado`" por consulta directa, y sin ningún `ENTREGA_REALIZADA` de una operación revertida.
- **PR-1B17.** Fabrica con SQL parametrizado una entrega `entregado` con `fecha_entrega` y `enlaces = '[]'`, más un archivo `confirmado` con `entrega_id`, `publicacion_id` nulo y clave `entregas/{tareaId}/{alumnoId}/{archivoId}`. Eso cumple los `CHECK` que deja 01a: `entregas_fecha_segun_estado`, `entregas_asignada_sin_retraso_ni_enlaces` y el nuevo `archivos_confirmado_si_y_solo_si_contexto`. La ayuda debe llenar también las columnas obligatorias de `archivos` (`subido_por`, `nombre`, `tipo` y `tamano > 0`), lo que es implícito en "una ayuda nueva". El resumen anota la corrida roja en el paso 4 de 01b y la verde después.

### M-05: resuelto
El texto para ESSENTIALS queda acotado a las filas que se editan con un formulario que reemplaza lo guardado y a las decisiones que alguien toma sobre lo que vio: `tareas`, `entregas` y calificar en CALIFICACIONES. Nombra las dos excepciones con su motivo: categorías, que descartan y recargan (decisión del humano, 2026-10-11), y temas, sin versión, con el orden que se renueva tras `ORDEN_DESACTUALIZADO`. Ese código existe en `shared/src/tareas.ts:275` y en `core/tareas/temas.ts:69`. R-01 apunta al mismo texto.

### N-01 a N-05, detalles y columna
- **N-01:** la línea para `PRD.md` RF-16 queda condicionada a S-04. Bien.
- **N-02:** está en R-10, con destino `docs/ESTADO.md` §3, DEPLOY. Bien.
- **N-03:** está en §D-11, punto 4. Bien.
- **N-04:** queda como excepción explícita en §D-0.7, citando `inscripciones.ts:64`. Bien.
- **N-05:** R-03 y la fila de 01a en "Alcance" quedan con la premisa correcta. Bien.
- **`handlers/archivos.ts`:** salió de A-2 con su motivo. Bien.
- **`entregas_alumno_id_idx`:** justificado. `ARCHITECTURE.md` §14 lo documenta, y "Mis calificaciones" (RF-17) leerá las entregas de un alumno en todas sus tareas. **Recomiendo conservarlo:** cuesta poco y evita otra migración en CALIFICACIONES. Si el humano prefiere no crear índices sin una consulta, quitarlo es un veto sin rediseño.
- **El margen de una hora (o `Date` falso) en las pruebas de integración de cierre y retraso** y **la frase de §D-3.6** sobre el `UPDATE` de una publicación: aplicados.
- **Columna "Recomendación del manager":** intacta (ver "Verificación propia").

### Observaciones (para la ronda 0; el tester las aplica sin enmienda)
- **O-1 — C-1 y las entradas `HEAD`.** El inventario de `sesiones-y-cadena` lista también `HEAD` por cada `GET` (19 entradas `HEAD /api…` hoy). "Las 8 rutas con sus métodos" son 11 entradas en 01b (8 más 3 `HEAD`: `GET …/entrega`, `GET …/entregas` y `GET …/entregas/:alumnoId`). En 01c son 6 (4 más 2 `HEAD`). El tester lo escribe así en su C-1.
- **O-2 — C-2 cuenta texto, no código.** `lecturas-fx-r1` cuenta las apariciones literales de `instantaneaUnica: true` en el archivo, con los comentarios incluidos (la exclusión de comentarios solo existe para `tareas.ts`). El programador no escribe ese literal en comentarios de `entregas.ts`. Si la implementación reparte una lectura en dos funciones, el número de C-2 se ajusta a las lecturas reales con la opción, no al revés.
- **O-3 — PR-1B09 bis: orden fijo y fila existente.** Para que cada orden se ejercite de verdad y no al azar, cada caso lanza la primera operación, espera con `formadasDetrasDe` a que esté formada detrás de la retención y solo entonces lanza la segunda. El caso (b) parte de una fila existente en `asignado` (por ejemplo, después de una anulación), porque sin fila no hay nada que retener.

### Para el humano

**Preguntas que debe contestar**

| Id | Pregunta | Recomendación del arquitecto | Recomendación del manager |
|---|---|---|---|
| P-01 | ¿El admin ve y escribe en las entregas y en el hilo privado alumno-maestro? | (a) Ve entregas, descarga sus archivos y lee los hilos; no escribe. El alumno ve "Solo tú, tus maestros y la administración pueden verlos." | (a), igual. Es lo mismo que hace en el muro; RN-06 le da alcance y el texto de privacidad lo hace explícito |
| P-02 | Con la entrega cerrada (no acepta tardías y ya venció), ¿el alumno puede anular? ¿Mover la fecha la reabre? | (a) No entrega ni anula. Mover la fecha límite o aceptar tardías la reabre; el cierre se calcula en cada acción | (a), igual. Es la única que cumple RF-44 para todos por igual y deja reabrir sin guardar nada nuevo |
| P-03 | ¿Dónde se indica que una tarea no requiere adjuntos? | (a) Campo nuevo "Cómo se entrega" en el formulario (por defecto "Con archivos o enlaces"). Sin adjuntos obligatorios, el alumno puede marcarla como completada o adjuntar de todos modos | (a), igual. Una sola regla en el servidor; las tareas existentes siguen pidiendo adjuntos |
| P-04 | ¿Cuánto cabe en una entrega? | (a) Hasta 5 archivos de 25 MB y 5 enlaces, con los mismos tipos que los materiales; el video, por enlace | (a), igual. Un tope mayor solo encarece el abuso y el almacén |
| P-05 | ¿Se acaba con "gana el último que guarda"? | (a) Versión entera en `tareas` y `entregas` desde este encargo. Ante el `409`, el formulario conserva lo escrito y ofrece "Cargar la versión actual". (a′) es aceptable | (a), igual. La condición que puse (M-03) ya se cumple. Si prefiere el menor riesgo: (a′), con versión en el servidor y descartar y recargar en el formulario, como las categorías, aunque se pierde lo escrito |

**Suposiciones que debe mirar** (no recomiendo vetar ninguna):
- **S-04:** el hilo privado no se borra ni se edita en esta fase. Se aparta de la letra de RN-07 ("regla general para todo lo que se publica en una clase"). Si la acepta, `PRD.md` RF-16 lo dirá.
- **S-06:** borrar una tarea borra las entregas y los hilos de sus alumnos. La confirmación lo dice, pero es irreversible. La alternativa es rechazar el borrado con `409` si hay entregas.
- **S-05:** la lista de entregas del maestro no muestra estado de pago, restricción ni correo, que siguen solo en el roster. Es razonable y reduce la superficie de RN-02.
- **S-03:** el retraso se fija al entregar; ampliar después el plazo no lo borra.

**Autorizaciones**
- **A-1:** crear la migración del encargo y aplicarla en local con `prisma migrate dev`.
- **A-2:** cambiar código ya cerrado de otros dominios del backend (archivos, temas, inscripciones, publicaciones, tareas y adjuntos); `handlers/archivos.ts` ya no está.
- **A-3:** cambiar piezas compartidas del frontend (`components/adjuntos/`, solo agregados; `components/clase/data.ts`; dos piezas nuevas; la fila de "Trabajo de clase"; el router).
- **A-4:** el tester reescribe en la ronda 0 las `*.ataque` que rompen por un cambio de contrato de §D-R0, con C-1 a C-5 nombrados.
- **A-5:** el orquestador aplica los textos de "Documentos a actualizar" al cerrar cada subentrega; el programador escribe `DESIGN.md` con la marca "propuesta".
- **A-6:** dos cambios en ESSENTIALS, que requieren su firma:
  - **R-01:** regla nueva de edición concurrente, acotada a tareas, entregas y calificación, con las excepciones de categorías y temas.
  - **R-02:** el estudiante sube los archivos de su entrega por su propia ruta, y la descarga de la clase solo sirve archivos de publicaciones.

**Riesgos que debe conocer antes de aprobar**
- **El frontend del `409` (01a).** Vive en el formulario de edición, donde TAREAS-01d tuvo tres rondas extra por foco y recarga. El plan lo apoya en los ganchos que ya existen y nombra cada estado vecino, pero sigue siendo el punto más probable de rondas extra. (a′) lo elimina a cambio de perder lo escrito.
- **El hueco de la descarga.** Hoy no se puede explotar, pero con entregas cualquier compañero podría descargar la entrega ajena por su id. Se cierra en 01b, antes de que exista el primer archivo de entrega, con una prueba que debe verse en rojo primero.
- **Nota para DEPLOY.** Backend y frontend se despliegan juntos. Además, con entregas en la base no se debe revertir el backend a antes de 01b: reabriría el hueco y borrar una tarea daría `500`.
- **Borrar una tarea borra trabajo de los alumnos (S-06).** Los archivos quedan en el almacén hasta que exista la limpieza diaria (antes de DEPLOY).
- **Modelo del programador.** Sigue en `opus` (su decisión del 2026-10-07), y el carril es sensible.

## Revisión de la Enmienda 2 — ENTREGAS-01
Veredicto: **APROBADO CON OBSERVACIONES**
Verificación propia: es una revisión de plan, sin `lint`, `test` ni `build`. `plan.md` tiene SHA-256 `e95156c4cc8984f0fc0867d44a04e73199878b165c4c1211f61593544536eb2b` (899 líneas). `git diff --stat dd8edcb` sale vacío en `backend/`, `frontend/`, `shared/`, `infra/`, `AGENTS.md`, `CLAUDE.md`, `docs/PRD.md`, `docs/ARCHITECTURE*.md`, `docs/DESIGN.md` y `.claude/`. La columna "Recomendación del manager" está intacta en P-01 a P-05. Lo que sigue se contrastó con el código de `dd8edcb`.

### Problemas que bloquean
Ninguno.

### P-05 (a′): correcto. Es el mecanismo de las categorías, adaptado sin ganchos nuevos
- **Un solo aviso.** `useEditarTarea.onError` (`hooks.ts:133`) ya termina en `toast.error(mensajeDeErrorTareas(error))` cuando `erroresDeLaTareaDeApi` devuelve `null`. Con `TAREA_MODIFICADA` en `CODIGOS_CON_MENSAJE_DEL_SERVIDOR` (`data.ts:140`), `mensajeDeErrorTareas` (`lib.ts:123`) muestra el texto del servidor. `pedirDeNuevoLasOpciones` y `pedirDeNuevoLaTarea` no reaccionan a ese código, así que hay un solo `GET`: el `refetch` de la vista.
- **Por qué `TAREA_MODIFICADA` queda fuera de `CODIGOS_QUE_RENUEVAN_LA_TAREA`.** El porqué del plan es correcto. En las categorías, `useGuardarCategorias.onError` (`features/clases/hooks.ts:935`) sí espera la invalidación y el editor lee la caché. Aquí `pedirDeNuevoLaTarea` va con `void`, y cambiarlo tocaría T-11 (`tareas-01d-r2.ataque:320` y `:341`).
- **Un solo camino de reinicio.** `recargarTrasConflicto` es lo único que sube `reinicios`, y solo tras un `refetch` con éxito y con `puedeEditar`. La prop `onConflicto` no hace más que disparar ese `refetch`. Ninguna otra recarga toca la `key`, así que PR-1A12 sigue valiendo.
- **La guarda siempre se libera.** `refetch` no lanza: con `throwOnError` en falso, resuelve con su resultado. El `finally` de `handleGuardar` (`formulario-tarea.tsx:194`) libera siempre `guardandoRef` y `enProceso`. Mientras se recarga, `handleSubmit` ya sale por `guardandoRef.current`, sin `disabled`, y `tareas-01d-r2.ataque:519` no se rompe.
- **Foco.** El efecto de montaje del hijo (`enfocarAlMontar`) corre antes que el de `useFocoAlPerderseElControl` (`hooks.ts:255`) en el mismo commit, y ese gancho no hace nada si `document.activeElement` está conectado y no es `<body>`. Si `dataUpdatedAt` cambiara en un commit anterior al de `setReinicios`, "Guardar cambios" seguiría conectado y tampoco se movería nada. Ese orden no ocurre: la promesa de `refetch` resuelve antes de que se emita la notificación programada. En los dos órdenes el resultado es el mismo.
- **Estados vecinos.** §D-8.3.7 nombra todos, y PR-1A13 y PR-1A14 (a) a (h) los exigen: segundo `409`, recarga de fondo, `refetch` fallido, `404` o `403`, pérdida de `puedeEditar`, "Cancelar" durante la recarga, primera apertura y archivos ya subidos. En producción, `retry: 1` (`app/providers.tsx:14`) alarga en un segundo el `enEspera` de un `refetch` que falla; no cambia nada. En las pruebas, `retry: false`.
- **`*.ataque` de `features/tareas`.** Todas siguen en verde con el diseño o ya están en §D-R0:
  - `tareas-01d-r1:493`: sin `target` ni `fetch`.
  - `tareas-01d-r2:519`: sin `disabled` ni escalas anuladas.
  - `tareas-01d-r3:386`: tipos solo en `types.ts` (`EditarTarea` se reexporta).
  - `tareas-01d-r2:320` y `:341`: T-11.

### S-06 modificada: correcta en capas, orden y bloqueos
- **Sin verificación de rol en el handler.** El handler compara `confirmar === CONFIRMAR_BORRADO_CON_ENTREGAS`, que es un dato de la petición. El rol llega a `core/` como `actor.rol` dentro de `adapters/db/tareas.ts`, a partir del `perfilDe(request)` que el handler ya pasa hoy (`handlers/tareas/tareas.ts:195`). Es el mismo camino que `puedeBorrarTarea` (`core/autoria.ts`).
- **La regla estática no salta.** La de `temas-01a-r3.ataque:470` (`/\.rol\b|relacion\s*===|===\s*"(admin|maestro|estudiante)"/`, fuera de `core/`) no reacciona a esa línea, y `adapters/db/tareas.ts` no está en esa lista cerrada.
- **C-1 no cambia.** `printRoutes` lista la ruta, no su consulta. `validarParametros` (`handlers/validacion.ts:22`, en "No se toca") ya sirve para `request.query`, como `trabajoQuerySchema`. El `z.strictObject` con `z.literal` rechaza con `400 VALIDACION` el valor vacío, el arreglo (parámetro repetido) y las llaves de más.
- **Orden dentro de `borrarTarea` (`adapters/db/tareas.ts:468`):**
  1. `FOR UPDATE OF t`, que choca con el `FOR KEY SHARE` de entregar, anular y comentar.
  2. La autoría: `403` sin conteo.
  3. El `count`, en una sentencia nueva de READ COMMITTED que ya ve la entrega recién confirmada. El `AppError` sale antes de la primera escritura y `enTransaccion` revierte todo.
  4. El descarte de los archivos de entrega, antes del `deleteMany` de la publicación, para que la FK `NO ACTION` no dé `500`. Hacerlo siempre es seguro: por el `CHECK` de §D-1, solo un archivo `confirmado` lleva `entrega_id`, y eso solo pasa en `entregado` o `calificado`.

  Índices: el prefijo `tarea_id` del único de `entregas` y `archivos_entrega_id_idx`.
- **Maestro con el parámetro → `409`.** Bien justificado: sin entregas, la misma petición borra, y un `403` sería falso. PR-1B22 (e) lo exige.
- **Mensajes.** Viven en `core/`, en singular y plural y por rol, y PR-1B27 los exige: la matriz 0, 1, 2 y 30 × tres roles × confirmar.
- **Frontend.** Sin ganchos ni componentes nuevos:
  - Reutiliza `useBorrarTarea.onError`, con un retorno temprano solo para `TAREA_CON_ENTREGAS`.
  - Los dos botones destructivos llevan guarda con ref y `enEspera`.
  - Foco: al segundo "Cancelar"; de vuelta a "Borrar tarea" al cancelar; a la raíz con `404` o al perder `puedeBorrar`. Nunca a `<body>`.
  - Quedan cubiertos `tareas-01d-r1:360` (un solo `DELETE`, con la URL de hoy) y `detalle-tarea-view.test.tsx:210` y `:217` (en la lista cerrada).
  - `detalle-tarea-view.tsx:37` ya tiene `perspectiva`: no hay un llamador nuevo de `perspectivaDeRuta` (`estatico-02c-r1:99`).
- **Pruebas.** Cubren todo lo pedido:
  - Maestro con entregas → `409`, con una foto que incluye archivos, criterios y `pgboss.job`: (a) y (b).
  - Admin sin parámetro: (c).
  - Admin con parámetro, en cascada: (d).
  - Maestro con parámetro: (e).
  - Filas `asignado` con hilo: (f).
  - Carreras en los dos órdenes: PR-1B22 bis.
- **R-14 y R-15: de acuerdo.** Contar las entregas guardadas, y no a los alumnos de la lista, protege justo lo que no se rehace. Que la confirmación diga "las entregas" y no un número es honesto con lo que pasa. La alternativa `?confirmar=n` queda escrita por si el humano la quiere.

### S-04 y documentos
- `PRD.md`: RF-16 lleva la frase de N-01 sin condición, y RN-07 suma la viñeta nueva después de la de TAREAS-01 (ancla en `PRD.md:206`).
- ESSENTIALS: las viñetas de "Reglas de negocio" y "Autoría" (ancla en la línea 118) son coherentes con S-06 modificada.
- `ARCHITECTURE.md` §7 y §14 también son coherentes.

### Problemas que no bloquean
- **N-01 — PR-1B28 (y PR-1B04, que ya lo decía): "unitaria en `shared/`".** `shared/` no tiene corredor de pruebas: su `package.json` solo trae `build` y `lint`, y los `package.json` están en "No se toca". Los esquemas de `shared/` hoy se prueban en `backend/test/esquemas-tareas.test.ts`. Qué se espera: las dos pruebas van en `backend/test/`, PR-1B28 en `esquemas-tareas.test.ts` y PR-1B04 en un `esquemas-entregas.test.ts` nuevo, sin tocar `shared/package.json`. Ver O-1.
- **N-02 — "Borrar con las entregas" se decide por la perspectiva (`puedeConfirmarEntregas`), no por un dato del servidor.** El comentario de `acciones-de-la-tarea.tsx` dice "nunca del rol", y C-13 (`estatico-02c-r1:62`) protege esa intención; su expresión regular no lo detecta y no se rompe. Lo acepto por tres razones:
  - El servidor niega al maestro por cualquier camino (PR-1B22 e).
  - La rama del admin en el router solo la abre el rol `admin`.
  - §D-10.3 ya decide igual `puedeEscribir` del hilo.

  Si el humano prefiere no depender de la perspectiva, hay una alternativa barata: un código distinto para el `409` del admin, por ejemplo `TAREA_CON_ENTREGAS_CONFIRMABLE`. El tester no lo abre como hallazgo.
- **N-03 — Entre 01b y 01e, el maestro que borra una tarea con entregas ve "Algo salió mal. Inténtalo de nuevo.".** `TAREA_CON_ENTREGAS` entra en `CODIGOS_CON_MENSAJE_DEL_SERVIDOR` recién en 01e, y desde 01d ya hay entregas reales. Se acepta porque no se despliega por subentrega (S-14) y la rama no sale antes de 01e. El tester de 01d no lo abre como hallazgo.
- **N-04 — El `409 TAREA_CON_ENTREGAS` no avisa si la vista se desmonta con el `DELETE` en vuelo.** El gancho suprime el `toast` y el segundo paso ya no está en pantalla: es el reverso del patrón T-30. Se acepta porque no cambió ningún dato: la tarea sigue y la persona ya se fue. Es por diseño; el tester no lo abre como hallazgo.

### Detalles menores
- §D-8.3.1 dice que `useEditarTarea` no cambia, pero §D-8.2 le cambia el tipo a `EditarTarea`. Cambia el tipo, no el comportamiento.
- `DESIGN.md` §7.21 dice hoy "Si después la recarga tiene éxito, el formulario conserva lo escrito". La viñeta "Conflicto al guardar" debe decir "salvo tras un `409`", para que no se contradigan.
- La viñeta "Autoría" de ESSENTIALS dice que la regla vive en `core/autoria.ts`. Conviene sumar que la de borrar con entregas vive en `core/tareas/tareas.ts` (`exigirBorradoConEntregasPermitido`).
- La línea 173 del plan conserva "P-05 a" en un comentario de código del servidor, que no cambió con (a′). Es correcto; si el programador lo copia, puede quedarse así.

### Observaciones (para la ronda 0; el tester y el programador las aplican sin enmienda)
- **O-1:** PR-1B04 (la parte de `enlaceDeEntregaSchema`) y PR-1B28 se escriben en `backend/test/` (N-01). No es una PARADA.
- **O-2:** la guarda de "Cancelar" mientras vuela el `DELETE` (§D-10.5.5) vale para los dos pasos, pero PR-1E08 (d) solo la pide en el segundo. El tester la ataca también en el primero, como maestro y como admin. Es un cambio de comportamiento: hoy "Cancelar" cierra la confirmación aunque haya una petición en vuelo. Ninguna prueba existente depende de eso: `detalle-tarea-view.test.tsx:204`, `:299` y `:413` cancelan sin petición en vuelo.
- **O-3:** PR-1B22 bis suma el orden que falta con el hilo. Un comentario retiene la tarea y deja una fila `asignado`; después llega el borrado del maestro sin parámetro, que espera y responde `204`, y el hilo se borra. Así se confirma, en la carrera, que `asignado` no cuenta (S-06).

### Carril y modelo
Se confirma el carril **sensible**: migración, estado de pago junto a la lista del maestro, borrado irreversible de trabajo de alumnos y endurecimiento de la descarga. El `programador` sigue en `opus` con esfuerzo `medium` (`.claude/agents/programador.md`; decisión del humano del 2026-10-07). Con esta revisión, el plan queda listo para la ronda 0 de 01a.

## Revisión de la Enmienda 3 — ENTREGAS-01
Veredicto: **CAMBIOS REQUERIDOS** (un solo M-nn, de una línea; el resto de la enmienda queda aprobado)
Verificación propia: revisión de plan, sin `lint`, `test` ni `build`.
- `plan.md` tiene SHA-256 `6de11562c8e8028d3f0a770164cfc5382799ad2513cd737ae623ad25726629a0` (967 líneas), igual al de `aprobacion.md`.
- En los paquetes, `git status` solo muestra las 7 `*.ataque` de C-6 y C-7. `tareas-01b-r1.ataque.test.ts` tiene SHA-256 `27A518A0…7A78B63FEDC3`, igual a la tabla V-01 del tester.
- Comprobé contra el código:
  - `editarTarea` (`adapters/db/tareas.ts:348-462`) y `alReprogramar` (`handlers/tareas/tareas.ts:172-179`);
  - `cancelar` y `encolar` (`adapters/queue/index.ts:58-80`);
  - `trabajosDeTarea` (`ayudas-tareas.ts:157`, `ORDER BY created_on, id`);
  - `crearTareaSchema` (`shared/src/tareas.ts:187`, `z.object`);
  - `temas-01a-r1.ataque:953-1009` y E6 (`bloqueo-usuario.integracion:685-711`);
  - `tareas-concurrencia.integracion` completo y `schema.prisma`.
- Con zod 4.6.5 (`node`, en `shared/`) confirmé que `extend` conserva las instancias de `shape`: `toBe` por llave da `true`.

### Problemas que bloquean

#### M-01 — C-8 deja rojo el `lint` del backend, y "Rojos esperados de 01a" no lo prevé
Dónde: §D-R0, "C-8: contrato", aserción 3 (`fila.version` y `detalleDe(respuestas[i]).version`), y la tabla "Rojos esperados de 01a" con su "Criterio para el tester".
Por qué importa:
- **El `lint` cubre las pruebas.** `npm run lint` del backend corre `tsc -p tsconfig.test.json`, que incluye `test/` (`backend/tsconfig.test.json`).
- **Las dos lecturas no compilan sobre `dd8edcb` + C-8.**
  - El modelo `Tarea` de `schema.prisma` no tiene `version`, así que el tipo que devuelve `leerTareaDb` tampoco la tiene.
  - Tampoco la declara `tareaDetalleSchema` (`shared/src/tareas.ts:225-239`).
  - Las dos lecturas dan `TS2339`, y el `lint` queda rojo desde la ronda 0 complementaria hasta los pasos 1 y 3 de 01a.
- **El propio plan lo detendría.** La tabla es una "lista cerrada de lo que puede estar rojo; cualquier otro rojo es PARADA", y el tester corre `lint` en cada ronda (lo hizo en la ronda 0).
- **La suite sí cumple el criterio.** Vitest no comprueba tipos, así que en la suite C-8 sería la única roja.

Qué se espera: una de dos, y el arquitecto elige.
- **(a) Recomendada, porque deja el `lint` en verde y el criterio como está.** El contrato escribe las dos aserciones de `version` sin leer la propiedad:
  - `expect(fila).toMatchObject({ version: 1 })`, después de la guarda de nulo;
  - `expect(detalleDe(respuestas[i])).toMatchObject({ version: 1 })`.

  Compilan sobre los dos árboles sin conversiones de tipo y son igual de estrictas cuando existe la columna. Sobre `dd8edcb` no llegan a ejecutarse, porque la aserción 2 falla antes.
- **(b) Declarar el rojo.** La tabla suma una fila: el `lint` del backend queda rojo solo por `TS2339` en esas dos lecturas de C-8, desde la ronda 0 complementaria hasta los pasos 1 y 3. El criterio del tester exige ese rojo exacto y ningún otro.

Con (a) o (b) aplicada no hace falta otra revisión completa. Me basta verificar ese cambio con `git diff` de `plan.md`, y después arranca la ronda 0 complementaria.

### Lo que se aprueba, punto por punto
1. **C-8 es coherente y realizable.**
   - **Por qué gana una sola.** El orden de §D-2.1 (404, autoría, versión, fecha) pone el `409` antes de cualquier escritura. `alReprogramar` es lo último del callback, así que un perdedor que lanza `TAREA_MODIFICADA` revierte sin cancelar ni encolar nada.
   - **Por qué quedan dos trabajos.** La ganadora pasa la fecha de 5 días a una de entre 6 y 11. Cancela el trabajo de crear y encola uno nuevo. Por `created_on` quedan exactamente `["cancelled", "created"]`: es `now()` de dos transacciones sucesivas, así que no hay empate posible.
   - **El resultado no depende del orden.** Con la misma versión, en serie o en paralelo, siempre hay una `200` y cinco `409`. No hace falta `conFilaRetenida` ni `formadasDetrasDe`, y no hay `LOCK TABLE`.
   - **"Única roja en la aserción 2" es cierto sobre `dd8edcb` + C-6.**
     - `crearTareaSchema` es `z.object`: descarta `version` y responde seis `200`, como hoy. La aserción 1 pasa como hoy.
     - En los pasos 1 a 4 la versión ya se acepta pero todavía no se compara, así que sigue roja en la aserción 2.
     - Pasa a verde en el paso 5.
   - **Las demás aserciones.** La 3 es exacta: las fechas viajan con milisegundos y la columna es `Timestamptz(3)`. La 4 es la de hoy.
   - **Relación con PR-1A03 y PR-1A04.** C-8 es esas dos pruebas en carrera, y no las duplica.
2. **Lista cerrada (i), (ii) y (iii): mínima y exacta.**
   - **(i) y (ii).** Solo suman `version: 0`, el reparto de códigos, `TAREA_MODIFICADA` y `version` 1, y conservan la aserción de `vivos`.
   - **(iii).** Reemplaza solo el `toBe(crearTareaSchema)` por tres comprobaciones: las llaves, la misma instancia por llave y la obligatoriedad de `version`.
     - No duplica PR-1A06: esa prueba va por la API (`400` sin escribir).
     - (iii)(3) es, a nivel de esquema, el reemplazo de la identidad que se pierde.
   - **Los otros dos PR-1B12 caben con solo `version: 0`.** `borrarTarea` y `borrarTema` no tocan `tareas.version`: el tema se borra con `deleteMany` y la FK `SET NULL` solo cambia `publicaciones`. Sus resultados aceptados (`200` o `404`) no cambian.
3. **C-9 es el cambio mínimo y correcto por regla.**
   - **Regla 1.** El caso quita los comentarios antes de buscar (`sinComentarios`). El comentario de la excepción en `entregas.ts` no cuenta, y la lista ordenada `["adapters/db/entregas.ts", "adapters/db/referencias.ts"]` es exacta.
   - **Regla 2.** Es la misma lista que C-4, con la regla `prohibido` intacta.
   - **Regla 3 (3a y 3b).** Conserva "organizar la clase no avisa a nadie" y suma la detección de un `cancelar(` en `entregas.ts`, que S-09 prohíbe.
   - **No contradice el diseño aprobado.**
     - §D-0.4: el handler encola desde `alGuardar`.
     - §D-5: sin cambio.
     - §D-6: entregar, anular y comentar toman la tarea `FOR KEY SHARE`.
   - **`referencias.ts` no hace falta tocarlo.** Sin A-7 está bien: R-17 queda como pendiente trivial, con la alternativa por A-7 escrita.
4. **E6:** sumar `entregas.ts` en 01b es correcto y suficiente.
   - E6 solo lee el primer nivel de `adapters/db/`.
   - PA-04 limita el SQL crudo nuevo a §D-3.5, §D-3.7 y §D-4, todo en `entregas.ts`.
   - El orden de `sort()` deja `entregas.ts` entre `enlaces-registro.ts` e `invitaciones.ts`.
   - En 01c no cambia: el hilo vive en `entregas.ts`.
5. **`actualizadoEn` (§D-2.3): acepto el cambio.**
   - `Tarea` y `Publicacion` llevan `@updatedAt` en `schema.prisma`.
   - En `backend/test` nadie lee `actualizadoEn` ni `actualizado_en`.
   - En `frontend/src` solo aparece como literal en dobles de prueba; ningún código de producción lo lee.
   - La API lo expone (`tareaDetalleSchema`), pero nadie lo pinta.
   - Evitarlo no vale SQL crudo nuevo. La regla de una columna propia para un futuro "Editada el …" es la correcta.
6. **"Rojos esperados de 01a"** coincide con la tabla del tester, con PA-02 ya resuelta. C-8 reemplaza la fila de PA-02, y (i) a (iii) la de las normales fuera de lista. Solo le falta lo de M-01.
7. **Consistencia.**
   - El encabezado dice "Enmiendas 1 a 3 aplicadas".
   - C-6 y C-7 conservan los nombres del tester, y C-8 y C-9 siguen esa numeración.
   - "Antes de empezar", paso 3, y el paso 5 de 01a son coherentes.
   - La columna del manager no cambió.

### Problemas que no bloquean
- **N-01 — `backend/src/adapters/README.md:295-299` deja de ser exacto en 01b, y R-17 no lo nombra.**
  - El README dice que `referencias.ts` tiene "las únicas lecturas `FOR KEY SHARE` del proyecto" y que "nadie más escribe un `FOR KEY SHARE`".
  - No está en "No se toca", y el paso 9 de 01b ya lo actualiza.
  - Qué se espera: en 01b el programador corrige ese párrafo y nombra `bloquearTareaParaEntregar` como segunda excepción, con su porqué. R-17 queda solo para el comentario de `referencias.ts`. Lo verifico en la revisión de 01b.
- **N-02 — los comentarios explicativos quedarían falsos si se aplica al pie de la letra "nada más".**
  - **Tester, C-8:** el comentario de C-6 en `tareas-01b-r1.ataque.test.ts:140-146` termina con "Las «seis ediciones de fecha simultáneas» no se tocan…". El contrato de C-8 dice "ninguna otra parte del archivo cambia".
  - **Programador, E6:** el bloque de comentarios de `bloqueo-usuario.integracion.test.ts:677-684` enumera por encargo los archivos con SQL. La lista cerrada de E6 dice "Nada más".
  - Qué se espera: se permite actualizar solo esos comentarios, sin cambiar ninguna aserción.
    - El tester cambia la última frase del de C-6 y agrega el motivo de C-8 sobre el caso.
    - El programador agrega la línea de ENTREGAS-01b en E6.

### Detalles menores
- "Puntos de ataque", Ronda 0, viñeta de la Enmienda 1 (`plan.md:718`): dice "solo rompen las de la tabla de C-1 a C-5"; ahora la tabla llega a C-9.
- En la lista cerrada, los anclajes `:156` y `:236` de los otros dos PR-1B12 caen dentro de los casos, cuyos títulos están en `:148` y `:228`. Los títulos son correctos y bastan.
- En (iii)(2), recorrer las llaves con `Object.keys` exige tipar la llave para indexar `shape` en modo estricto. Es un detalle de implementación, que se resuelve sin `any`.

### Observaciones para la ronda 0 complementaria (y siguientes)
- **O-1:** cómo se aplica C-8 en la ronda 0 complementaria.
  - Conserva el mismo `describe`, `timeout`, `escenario()` y `crear(e)`.
  - El comentario de motivo sigue la regla de la ronda 0 ("ENTREGAS-01a ronda 0 complementaria (C-8, §D-R0 …)").
  - La tabla de SHA-256 cambia solo en `tareas-01b-r1`.
  - Después se corren, de uno en uno, la suite completa del backend y el `lint` del backend (este último, según lo que resuelva M-01).
- **O-2:** C-9 en 01b.
  - En la ronda 0 de 01b, sus reglas 1 y 2 quedan rojas hasta que existan `adapters/db/entregas.ts` y `handlers/tareas/entregas.ts`, igual que C-1, C-2 y C-4. El tester la lista en sus rojos esperados de 01b.
  - En la ronda 1 de 01b, el tester ataca también que `FOR KEY SHARE` aparezca una sola vez en el código de `entregas.ts`, dentro de `bloquearTareaParaEntregar`, como dice C-9. La regla estática no lo mide.

### ¿Puede arrancar la ronda 0 complementaria?
**Todavía no.** Arranca en cuanto `plan.md` resuelva M-01 con (a) o con (b). Esa corrección la verifico con `git diff`, sin otra revisión completa. N-01, N-02 y los detalles no la detienen; el orquestador puede pedírselos al arquitecto en la misma edición.

### Verificación de la corrección de M-01
Veredicto final de la Enmienda 3: **APROBADO CON OBSERVACIONES**. La ronda 0 complementaria **puede arrancar**.

`plan.md` actual: SHA-256 `a217f74c441a8a08b6e62ea55a0c725ae85aefdb4fd906792a28c9df0e0281fc` (968 líneas). La versión que revisé tenía `6de11562…6629a0` (967 líneas).

**Cómo comparé.** La carpeta no está versionada y no había copia del archivo revisado, ni en el repositorio ni en el historial de archivos. Tenía guardadas, al pie de la letra, las líneas 1-9, 165-182, 342-361 y 440-548 de la versión revisada, y las comparé con `diff` contra las mismas líneas de hoy. El resto lo revisé bloque por bloque contra lo que leí en la revisión.
- **Lo que comparé con `diff`.** Solo cambian tres líneas:
  - `:470`: "C-8: contrato", la excepción del comentario de C-6 (N-02);
  - `:476`: la aserción 3 con `toMatchObject` (M-01);
  - `:498`: el criterio del tester, con el `lint` en verde (M-01).
- **Lo que revisé por bloques.** Solo cambian, y como se dijo:
  - `:710`: los dos PR-1B12, por título;
  - `:711`: E6, con el comentario de `:677-684` (N-02);
  - `:718`: "C-1 a C-9";
  - `:778`: R-17, que ahora cubre solo el comentario de `referencias.ts`;
  - `:849`: paso 9 de 01b, que suma `adapters/README.md:295-299` (N-01);
  - `:962`: la fila nueva "Corrección M-01 (y N-01, N-02)". Es la única línea agregada y explica el paso de 967 a 968 líneas.
- **Lo que no quedó comprobado con `diff`.** Las líneas 10-164, 183-341, 362-439, 550-698 y las intermedias de los pasos. Ahí no hay ninguna marca de la corrección, y el conteo de líneas no deja espacio para otras líneas agregadas. Aun así, un cambio dentro de una línea existente no se descarta mecánicamente (O-3).

**Lo que pidió el orquestador:**
1. **Las dos aserciones compilan sobre `dd8edcb`.** En vitest 4.1.11, `toMatchObject` es `<E extends object | any[]>(expected: E) => void` (`@vitest/expect`, `index.d.ts:308`). No compara contra el tipo del valor real, así que `expect(fila).toMatchObject({ version: 1 })` (con `fila` ya sin nulo) y `expect(detalleDe(respuestas[i])).toMatchObject({ version: 1 })` compilan aunque ni `Tarea` ni `TareaDetalle` tengan `version`. Ninguna otra aserción del contrato lee una propiedad nueva: `fechaLimite` y `trabajoId` ya existen. La aserción 2 sigue fallando primero, con seis `200`, así que C-8 sigue siendo la única roja de la suite del backend y el `lint` queda en verde. Una vez creada la columna, las dos aserciones son igual de estrictas.
2. **Fuera de lo listado no cambió nada,** dentro del alcance de la comparación descrita arriba. N-01, N-02 y los dos detalles quedaron aplicados como pedí, sin abrir permisos de más: los dos comentarios se autorizan "solo el comentario, ninguna aserción".

**Observación:**
- **O-3:** para las próximas enmiendas, el orquestador guarda en `aprobacion.md` (o en el scratchpad) una copia o el SHA y el conteo de líneas de `plan.md` antes de cada edición. Así la verificación acotada del manager puede ser un `git diff --no-index` completo y no por segmentos.

## Verificación de la Enmienda 4 — ENTREGAS-01
Veredicto: **APROBADO**. El programador puede reanudar el paso 5 de 01a.
Verificación propia: revisión de plan, sin `lint`, `test` ni `build`. Comparé con `git diff --no-index` la copia previa (`a217f74c…81fc`, la que ya verifiqué) contra `plan.md` actual (SHA-256 `ffc6fdd1171e746caa88e8bcf7af30775b429db2b9ffe890b73381b32ee2f3d3`).

1. **Solo cambió lo listado.** Son cuatro hunks:
   - el estado ("Enmiendas 1 a 4");
   - la fila de "Rojos esperados de 01a", que nombra las tres pruebas y dice "(o sin compilar)";
   - la viñeta nueva de la lista cerrada;
   - la sección "## Enmienda 4".
2. **La viñeta no abre la puerta a más cambios.**
   - **Qué permite:** solo "sumar esos campos con su valor por defecto": `requiereAdjuntos: true` y la `version` vigente del caso.
   - **Qué prohíbe:** cambiar, quitar o debilitar aserciones, y cualquier otra prueba que deje de compilar es PARADA. Sumar un campo con un valor no deja lugar a conversiones de tipo ni a `Partial` nuevos.
   - **La cláusula genérica no amplía nada.** La frase "o de cualquier tipo que gane `requiereAdjuntos` o `version`" queda acotada por la enumeración cerrada.
3. **Mi grep coincide con el inventario del arquitecto.** Busqué en `backend/test/`, en los `*.test.ts` de `backend/src/` y en los `*.test.ts(x)` de `frontend/src/`:
   - **Backend.** Las únicas llamadas directas a `crearTarea` y `editarTarea` son `tareas.integracion.test.ts:701`, `:761`, `:806` y `:852`. Las de `leerTarea` (`instantanea-01b-r1.ataque` y `lecturas-consistentes.integracion`) no cambian de firma. No hay dobles tipados de `CrearTarea`, `EditarTarea` ni `TareaDetalleDb`. Las tres creaciones directas con Prisma (`ayudas-tareas.ts:114`, `categorias.integracion:431` y `migracion-tareas.integracion:261`) toman los `DEFAULT` de la migración (`requiere_adjuntos … DEFAULT true`, y `version` 0).
   - **Frontend.** Solo dos dobles tipados: `lib.test.ts:29` (`EstadoDelFormulario`) y `lib.test.ts:135` (`TareaDetalle`).
     - Ninguna prueba renderiza `FormularioTarea` con `onGuardar` propio, así que el cambio de firma de `onGuardar` no rompe pruebas.
     - `cuerpoDeTarea(estado, categorias)` no cambia de firma, y sus llamadas en `tareas-01d-r1.ataque:303-315` parten de `estadoInicialDelFormulario(null)`.
     - Las aserciones de `lib.test.ts` sobre el estado y el cuerpo son por campo, no `toEqual` del objeto completo, así que el campo nuevo no rompe ninguna.

   No queda ninguna otra prueba que vaya a dejar de compilar en 01a fuera de la lista.
4. **Detenerse fue lo correcto.** Volver opcional `requiereAdjuntos` en el adaptador o en `EstadoDelFormulario` para que compilaran las pruebas habría introducido un valor por defecto silencioso en producción (`CLAUDE.md`, "Valores por defecto"). Cambiar pruebas fuera de la lista cerrada también era PARADA según el plan.

**Detalles menores (no bloquean):**
- **Las dos llamadas a `editarTarea`.** Las de `:761` y `:852` reciben `datos` del ayudante `datosDeEdicion` (`tareas.integracion.test.ts:738`). Los campos se suman ahí, en un solo lugar, y eso cabe en la viñeta.
- **La línea 3 de `plan.md`.** El resumen de enmiendas todavía no menciona la Enmienda 4. El estado de la línea 2 sí la menciona.

## Verificación del resumen — ENTREGAS-01a — implementación
Veredicto: **ACEPTADO**. El tester puede atacar la ronda 1 de 01a.

### Mis corridas
Una suite a la vez, con PA-01 verificada: Docker 28.5.1, red `IZZI-F281-5G` en perfil Público y la regla "Campus: bloquear entrada a Docker en redes publicas" habilitada (Inbound, Block, Public).

| Paso | Mi corrida | Resumen | Coincide |
|---|---|---|---|
| `shared` build | código 0, `> tsc -p tsconfig.json` | ídem | sí |
| `shared` lint | código 0, `All matched files use Prettier code style!` | ídem | sí |
| `backend` lint | código 0, `> tsc -p tsconfig.json --noEmit && tsc -p tsconfig.test.json` | ídem | sí |
| `backend` test (04:40:35Z a 04:42:16Z) | `Test Files  175 passed (175)` · `Tests  2186 passed (2186)` · `Duration  97.06s` | 175 · 2186 · 97.05s | sí |
| `backend` build | código 0, `> tsc -p tsconfig.json` | ídem | sí |
| `npx prisma validate` | `The schema at prisma\schema.prisma is valid` | ídem | sí |
| `npx prisma migrate status` | `13 migrations found` · `Database schema is up to date!` (`campus_dev`) | (no lo reporta) | — |
| `npx prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --exit-code` | `No difference detected.`, código 0 | (no lo reporta) | — |
| `frontend` lint | código 0, `> tsc -b` | ídem | sí |
| `frontend` test (04:43:29Z a 04:45:00Z) | `Test Files  152 passed (152)` · `Tests  2265 passed (2265)` · `Duration  88.63s` | 152 · 2265 · 87.75s | sí |
| `frontend` build | código 0, `✓ built in 650ms` (con la advertencia de tamaño de chunk de siempre) | `✓ built in 663ms` | sí |
| `npx vitest list` | backend **2186 en 175**; frontend **2265 en 152** | ídem | sí |

- **Archivos nuevos (casos por archivo):** `tareas-version.integracion` 16, `entregas-migracion.integracion` 6, `concurrencia.test` 4, `conflicto-01a` 11 y `como-se-entrega-01a` 11. `core/tareas/tareas.test.ts` suma 1 caso.
- **Las cuentas cierran contra la base de la ronda 0 complementaria:** backend 2159/172 + 27 casos y 3 archivos; frontend 2243/150 + 22 casos y 2 archivos.

### Verificaciones pedidas
1. **Tabla PR-1A01 a PR-1A18: completa.**
   - Los 48 títulos citados aparecen tal cual en mi `vitest list`. Las seis filas de PR-1D04 (PR-1A16) tienen títulos únicos.
   - **PR-1A01** escribe con SQL etiquetado y parametrizado (`$executeRaw` y `$queryRaw`) y espera el nombre de cada `CHECK`.
   - **PR-1A13 y PR-1A14 (a) a (h)** cubren todo lo que pide la Enmienda 2:
     - un aviso y un `GET`;
     - `aria-busy` sin `disabled`, y ni el clic ni el envío del formulario hacen otro `PUT` durante la recarga;
     - los valores de `v + 1`, los elegidos descartados y el foco en "Título";
     - el guardado siguiente con `v + 1`;
     - sin "Cargar la versión actual" y sin `alert` del conflicto;
     - los ocho estados vecinos, con el espía de `console.error` en (h).
   - **PR-1A04 y PR-1A08** retienen la fila de `tareas` con `FOR UPDATE` y `formadasDetrasDe`, sin `LOCK TABLE`. Llevan `timeout: 30_000` y `maxWait: 5_000`, más que la espera de 10 s. La ayuda es local porque `ayudas-concurrencia.ts` está en "No se toca".
2. **Pruebas cambiadas: dentro de las listas.**
   - **Normales:** coinciden con la lista cerrada (Enmiendas 3 y 4). En `tareas.integracion`, `tareas-autoria`, `tareas-autorizacion` y los dobles del frontend solo se suman campos. (i), (ii) y (iii) son exactamente lo que dice la lista; (iii) usa `Record<string, unknown>` para indexar `shape`, sin `any`. El it.each de O-1 conserva sus seis filas con las mismas respuestas.
   - **`*.ataque`:** mi V-01 da **163/163 iguales** a la tabla de la ronda 0 complementaria (`reporte-tester.md`, línea 488 en adelante); `tareas-01b-r1` es `79BC7AAF…72C79`.
3. **"No se toca": vacío.** `git diff --stat dd8edcb` sobre la lista del plan (con `adapters/live`) muestra solo `features/clases/data.ts | 2 +-`, la línea de `sinTema` que A-3 permite. En las ayudas de `backend/test/` no cambia nada.
4. **El código coincide con el plan, sin nada de más.**
   - **§D-1:** la migración es la del plan, con los `CHECK` al final. `schema.prisma` lleva `Tarea.requiereAdjuntos` y `version`, `Entrega` con `@@unique` y `@@index([alumnoId])`, `Comentario.publicacionId?` y `entregaId`, y `Archivo.entregaId` `NoAction`.
   - **§D-2, `editarTarea`:** lee `t.version` en el mismo `FOR NO KEY UPDATE OF t` y comprueba en orden 404, autoría y `exigirVersion` antes de fecha, categoría y tema. Suma `version: { increment: 1 }` y no escribe nada antes del 409.
   - **§D-2, `moverATema`:** sube la versión antes del `FOR KEY SHARE` del tema y del `UPDATE` de `publicaciones`, que es el orden de §D-0.6.
   - **§D-2, `requiereAdjuntos`:** se guarda al crear y al editar, y se lee en `leerTarea`, que sirve al `GET` y a las respuestas de crear y editar.
   - **§D-7:** el texto del mensaje es exacto.
   - **§D-8:**
     - `TAREA_MODIFICADA` está en `CODIGOS_CON_MENSAJE_DEL_SERVIDOR` y no en `CODIGOS_QUE_RENUEVAN_LA_TAREA`; `useEditarTarea.onError` no cambió.
     - `onConflicto`, `recargarTrasConflicto`, `key={reinicios}` y `enfocarAlMontar` coinciden con §D-8.3.
     - La guarda con ref y `enEspera` son las de siempre. No hay ningún `disabled` en los componentes de `features/tareas`.
   - **Triviales:** O-1, O-2 y O-3 están aplicados.
   - **Documentos:** `DESIGN.md` §7.20 y §7.21 llevan la marca "propuesta (ENTREGAS-01a)", y `adapters/README.md` tiene su sección nueva.
   - **Capas y cadena de middleware:** el handler solo pasa `version` y `requiereAdjuntos`, sin comparar roles. `core/concurrencia.ts` es pura.
   - **Sustitución del título vacío:** `titulo ?? ""` se cambia por un `AppError` `ERROR_INTERNO` 500, que es inalcanzable por el `CHECK`. Es lo que el plan absorbió de TAREAS-01, y el patrón ya existe en `clases.ts`.
5. **Desviaciones declaradas: las tres se aceptan.**
   - **`--create-only`:** se acepta. Es mejor práctica: los `CHECK` entran antes de aplicar la migración, nunca se edita una migración ya aplicada, y queda dentro de A-1.
   - **`ErrorDeCampo` bajo "Cómo se entrega":** está dentro del plan, no es un agregado. §D-8.1 pone `requiereAdjuntos` en `CAMPOS_DEL_FORMULARIO`, y entonces un `VALIDACION` de ese campo deja de avisar con un `toast`; sin el `ErrorDeCampo` se perdería en silencio. `DESIGN.md` §7.21 ya dice "Cada error va en `ErrorDeCampo` bajo su campo": no es un patrón nuevo. Lo cubre la prueba hermana de PR-1A11.
   - **PR-1A17 con `import.meta.glob`:** se acepta como N-01, ver abajo.
6. **`claveDeFocoDeLaTarea`: es un artefacto de las pruebas, no un defecto de producción.**
   - La clave cambia con `dataUpdatedAt`, y TanStack Query le pone `Date.now()` a cada respuesta con éxito, aunque los datos sean idénticos.
   - En el navegador, la respuesta del `refetch` tras el 409 llega como mínimo un viaje de red después de la lectura anterior. Que caiga en el mismo milisegundo no es realista.
   - Con `vi.useFakeTimers({ toFake: ["Date"] })`, `Date.now()` es constante y la clave no cambia. Avanzar 5 s en `guardar()` es lo que haría una persona y no oculta un camino real: los cambios de vista de (d) cambian la clave por el estado y el error, y el de (e), por `dataUpdatedAt`.
   - No va a `docs/ESTADO.md` §3. Queda como punto opcional del tester (T-r1-5).
7. **Hermanos y estados vecinos: coinciden con el código.**
   - `versionDeApertura` nace en el inicializador perezoso, y ninguna recarga la toca.
   - Los ocho estados del conflicto tienen su prueba.
   - En "Cómo se entrega", crear, editar, el cuerpo, el detalle, el valor por defecto del servidor y el error del servidor tienen su prueba.
   - `moverATema` sube la versión también hacia "Sin tema" y hacia su mismo tema: el `updateMany` no depende del destino, y está aceptado por §D-2.3.
   - Que borrar un tema no suba la versión es correcto: el guardado posterior recibe `404 TEMA_NO_ENCONTRADO` y T-08 lo resuelve.
   - Ningún hermano dice "no aplica" sin razón.
8. **PA-07, sobre mi salida completa del backend: limpio.**
   - **Ceros:** `40P01`, `deadlock detected`, `could not serialize`, `too many clients` y `Unable to start a transaction`.
   - **10 `"Error no controlado"`:** son exactamente I-1. Seis de `intentos-r2` (login con fallos simulados), tres `ZodError` (T-39 de `archivos-d-r2`) y uno de `salud` (`boom`, la ruta de error común).
   - **5 `"code":"P2028"`:** todos de nivel 40 (`warn`), sobre `sesion`, `tokenCuenta` y `$queryRawUnsafe`, es decir, los controles de `servicio-ocupado` y `cuentas-r3`. Ninguno sale de tareas, temas ni categorías.

### Problemas que no bloquean
- **N-01 — PR-1A17 esquiva la regla 9 con `import.meta.glob`, y `toBe` no prueba "declarado una sola vez".**
  - `import.meta.glob` carga `features/clases/data.ts` desde una prueba de `features/tareas`. Es una prueba y el código de producción no se acopla, así que se acepta.
  - Pero `toBe` entre cadenas compara el valor, no el origen. Si alguien vuelve a escribir `sinTema: "Sin tema"` o el texto de `categoriaRequerida` a mano, las tres aserciones siguen en verde.
  - El plan pedía `toBe`, así que el programador cumplió la letra. La comprobación real ("declarado una vez") solo se puede hacer por texto fuente: queda para el tester (T-r1-2), y PR-1A17 no se mueve.
- **N-02 — `if (version === null) return` en `editar-tarea-view.tsx` es un no-op silencioso.**
  - Si algún día se alcanzara, "Guardar cambios" no haría nada: ni aviso ni navegación.
  - Hoy es inalcanzable: la vista de edición solo monta el formulario con una tarea. Lanzar ahí tampoco daría aviso, porque el `catch` del formulario solo marca errores de API.
  - Se acepta. Si 01e toca esta vista, conviene que el tipo de `onGuardar` de la edición reciba `number` y no `number | null`, con dos props distintas para crear y editar.

### Detalles menores
- **El `CHECK` `entregas_enlaces_es_lista`, tal como está en el plan,** con `enlaces` que no es lista falla por `jsonb_array_length` (`22023`) y no por la violación del `CHECK` (`23514`). PR-1A01 lo admite. La API siempre escribe una lista validada por zod, así que no tiene efecto. Si en 01b una entrega llegara a escribir algo que no es lista, el error sería otro código, no un 500 nuevo: el adaptador lo traduce como cualquier error de base.

### Para el tester, ronda 1 de 01a (además de los "Puntos de ataque" del plan)
- **T-r1-1 — `version` grande.** Un valor entre `2147483648` y `Number.MAX_SAFE_INTEGER` pasa zod (`int()` de zod 4 es entero seguro), pero la columna es `INTEGER`. Debe responder `409` (o `400`), nunca `500`. Hoy solo se compara en JS, pero hay que confirmarlo por la API.
- **T-r1-2 — "declarado una sola vez" por texto fuente.** Comprobar que el literal `"Sin tema"` vive solo en `components/clase/data.ts`, y los de `categoriaRequerida` y `sinAccesoALaClase`, una sola vez (N-01).
- **T-r1-3 — los caminos de `moverATema`:**
  - mover a un tema inexistente o borrado no deja la versión subida;
  - mover un anuncio no toca `tareas`;
  - mover de tema y borrar la tarea a la vez termina sin `500` ni deadlock.
- **T-r1-4 — borrar el tema elegido mientras se edita.** El guardado recibe `404 TEMA_NO_ENCONTRADO` (T-08) y el siguiente guardado, con la misma versión, da `200`. Ninguna recarga por T-08 debe reiniciar el formulario ni cambiar `versionDeApertura`.
- **T-r1-5 (opcional, baja prioridad) — la clave de foco.** Reproducir PR-1A14 (e) sin avanzar el reloj, para documentar que es solo de las pruebas. Si aparece un camino real en que la vista cambia sin que cambie `dataUpdatedAt`, el estado o el error, es un hallazgo.
- **T-r1-6 — "Cómo se entrega" durante la recarga tras el 409.** Un cambio en el control se pierde con el reinicio, igual que lo escrito; está aceptado por §D-8.3.6. Lo que se ataca es que no quede ningún `PUT` en vuelo ni se envíe un segundo cuerpo.

## Revisión final — ENTREGAS-01a
Veredicto: **APROBADO CON OBSERVACIONES**. Ningún problema bloquea el commit `<K1a>`.
Verificación propia: lint, test y build en verde en los tres paquetes; las cifras están en la tabla de abajo.

### Corrida propia
Una suite a la vez. PA-01 verificada: Docker 28.5.1, `IZZI-F281-5G` en perfil Público y la regla del firewall habilitada.

| Paso | Mi corrida | Tester (ronda 1) |
|---|---|---|
| `shared` build | código 0 | — |
| `backend` lint | código 0, `> tsc -p tsconfig.json --noEmit && tsc -p tsconfig.test.json` | ídem |
| `backend` test (05:12:52Z a 05:14:35Z) | `Test Files  177 passed (177)` · `Tests  2233 passed (2233)` · `Duration  98.50s` | 177 · 2233 |
| `backend` build | código 0 | — |
| `prisma validate` / `migrate status` / `migrate diff --from-config-datasource --to-schema` | válido / `13 migrations found` · `Database schema is up to date!` / `No difference detected.` (código 0) | — |
| `frontend` lint | código 0, `> tsc -b` | ídem |
| `frontend` test (05:15:28Z a 05:17:02Z) | `Test Files  153 passed (153)` · `Tests  2271 passed (2271)` · `Duration  90.59s` | 153 · 2271 |
| `frontend` build | código 0, `✓ built in 632ms` | — |

- **Desde que acepté el resumen, solo cambiaron las 3 `*.ataque` nuevas del tester** y el cliente generado de Prisma, que el `prelint` regenera. Ningún otro archivo de `backend/src`, `backend/prisma`, `backend/test`, `shared/src`, `frontend/src` ni `DESIGN.md` cambió. La lectura del diff de producción de mi verificación del resumen sigue vigente.
- **El diff contra `dd8edcb` es el mismo de entonces:** 38 archivos versionados, más los no versionados (la migración, `core/concurrencia.ts` con su prueba, dos pruebas de integración, dos pruebas del frontend y las 3 `*.ataque`). Nada fuera ni de más.
- **El `migrate diff` con `--from-migrations`** no corre en Prisma 7 sin `shadowDatabaseUrl` en `prisma.config.ts`, que está en "No se toca". Lo cubren `migrate status`, la comparación de `campus_dev` contra el esquema, la suite completa sobre migraciones recién aplicadas y `migracion-01a-r1.ataque`.

### Regresión, PA-07 y "No se toca"
- **V-01: 166/166** iguales a la tabla de la ronda 1 (`reporte-tester.md`, línea 841 en adelante; SHA-256 del reporte `829706c2…14c8`).
  - Las 163 de la ronda 0 complementaria no cambiaron: ninguna borrada ni alterada fuera de C-6, C-7 y C-8.
  - Las 3 nuevas suman 47 casos en el backend y 6 en el frontend, que coincide con los 53 que reporta el tester.
  - No hay `.skip`, `.only` ni `.todo` en ninguna prueba.
- **PA-07, sobre mi salida completa del backend: limpio.**
  - **Ceros:** `40P01`, `deadlock detected`, `could not serialize`, `too many clients` y `Unable to start a transaction`.
  - **10 `"Error no controlado"` (I-1):** 6 de `intentos-r2`, 3 `ZodError` (T-39 de `archivos-d-r2`) y 1 `boom` de `salud.integracion`.
  - **Control positivo:** los 5 `"code":"P2028"` son de nivel 40, sobre `tx.sesion.*`, `tx.tokenCuenta.updateMany` y `$queryRawUnsafe` (`servicio-ocupado` y `cuentas-r3`).
  - Ninguno sale de tareas, temas, categorías ni de las carreras de las rondas.
- **"No se toca": vacío.** Fuera de los paquetes cambian solo `docs/ESTADO.md` y `docs/trabajo/TAREAS-01-…/aprobacion.md` (el registro de `<K1e>` y del PR #20). Son del orquestador y quedan fuera de la verificación.

### Definición de terminado (01a)
- [x] **RF y RN:**
  - P-05 (a′): la versión, el `409` y la recarga. La parte de "Cómo se entrega" de RF-24 corresponde a 01a; la entrega queda para 01b.
  - P-03 (a): "Cómo se entrega".
  - RN-02: PR-1A10 y el ataque de fugas, sin estado de pago, correo, rol ni `trabajo_id`.
- [x] **Capas y middleware:** no hay rutas nuevas, y el `PUT` sigue con su cadena. El handler solo pasa `version` y `requiereAdjuntos`; `core/concurrencia.ts` es pura.
- [x] **lint, build y test:** en verde.
- [x] **Pruebas de autorización del contrato nuevo:**
  - PR-1A05: `404` de otra clase y `403` de autoría antes que la versión.
  - `tareas-autorizacion.integracion`: la matriz completa con `version`.
  - PR-1A10 y el ataque de fugas: las tres relaciones.
  - El maestro de reemplazo frente al autor que sale.
- [x] **Migración compatible hacia atrás:** todo es aditivo o relaja una restricción. El `CHECK` de `archivos` equivale al anterior mientras `entrega_id` sea nulo. La migración aplica sobre datos de TAREAS-01 (`migracion-01a-r1.ataque`).
  - Para el retorno a una versión anterior quedan R-10 y N-02 del plan (DEPLOY).
- [x] **`infra/` y `.env.example`:** sin cambios, y no hacían falta.
- [ ] **Documentos:**
  - `DESIGN.md` §7.20 y §7.21 llevan la marca "propuesta (ENTREGAS-01a)", y `adapters/README.md` tiene su sección: hecho.
  - Falta lo del orquestador al cerrar 01a: la viñeta de ESSENTIALS "Reglas de datos" (A-5) y `docs/ESTADO.md` (N-01).

### Problemas que bloquean
Ninguno.

### Problemas que no bloquean
- **N-01 — `docs/ESTADO.md` §3 está atrasado (destino: orquestador, en el mismo commit `<K1a>`).**
  - **Faltan los pendientes que el plan pedía anotar al aprobarse** (`plan.md`, "Pendientes para `docs/ESTADO.md` §3"):
    - DEPLOY: R-10 y N-02, es decir, backend y frontend se despliegan juntos y no se revierte el backend a antes de 01b con entregas en la base;
    - CALIFICACIONES: §D-11, puntos 1 a 4;
    - NOTIFICACIONES: los descartes de §D-5 para `ENTREGA_REALIZADA` y `COMENTARIO_CREADO`.
  - **Filas que 01a resuelve y hay que cerrar:** "Gana el último que guarda" (P-05 a′), y O-1, O-2 y O-3 de TAREAS-01d.
  - **Filas nuevas de esta revisión:** O-r1-1 y N-02 (abajo).
- **N-02 — "Cómo se entrega" a 360 px, sin verificar (destino: comprobación humana al final de 01e).**
  - Los dos botones del control segmentado son `whitespace-nowrap` (`button-variants.ts`), y las dos columnas miden lo que la etiqueta más larga. "Con archivos o enlaces" y "Marcar como completada" son más largas que las del control de entregas tardías.
  - Con el relleno del panel (`px-6`) y el `p-1` del grupo, a 360 px el grupo probablemente no cabe y se sale del panel.
  - Las pruebas (jsdom) no lo ven, y ningún agente abre navegadores.
  - Propuesta: H-2 se hace a 360 px, sin pasar del tope de 7 puntos. Si se desborda, la corrección va por el carril trivial (que la etiqueta pueda partirse, o una columna en pantallas angostas), y el mismo remedio aplica a "Entregas después de la fecha límite".
- **N-03 — `if (version === null) return` en `editar-tarea-view.tsx`** (N-02 de mi verificación del resumen; destino: 01e, si toca la vista, o nada).
  - Es inalcanzable y no tiene efecto hoy.
  - Si 01e toca la vista, conviene que la edición reciba una `version` numérica y no `number | null`.

### Observaciones del tester, arbitradas
- **O-r1-1 — `features/clases/data.ts:221` repite "No tienes acceso a esta clase.".**
  - Es anterior al encargo, y `features/clases` no se toca en 01a.
  - Destino: `docs/ESTADO.md` §3, carril trivial después de ENTREGAS, junto con R-17.
- **O-r1-2 — abrir "Editar" con la recarga de un movimiento de tema en vuelo.** Va al humano (ver "Para el humano").
  - Es coherente con §D-8.2: se edita sobre la versión con que se abrió.
  - El costo es real con P-05 (a′): quien movió la tarea pierde lo escrito por un "otra persona" que fue él mismo.
- **O-r1-3 — un `PUT` sin `requiereAdjuntos` lo regresa a `true`.**
  - Es la semántica de "cuerpo completo" del `PUT` (igual que `aceptaTardias`, `categoriaId`, `temaId` y `rubrica`), y el formulario siempre lo envía.
  - Destino: nada.
- **N-01 de mi verificación del resumen (PR-1A17 con `toBe`): cerrado.** `tareas-01a-r1.ataque` (T-r1-2) comprueba por texto fuente que "Sin tema" vive solo en `components/clase/data.ts` y que los otros dos textos se escriben una sola vez.
- **T-r1-5 (la clave de foco):** el tester confirmó el arbitraje: es un artefacto de las pruebas con reloj fijo. Destino: nada.

### Medición del programador (01a)
- **Rondas del tester:**
  - ronda 0;
  - ronda 0 complementaria (C-8), que no cuenta;
  - ronda 1 con **RESISTE y 0 hallazgos**.
  - Rondas extra: **0**; por hermanos o estados vecinos: **0**.
- **PARADAS: una (PA-02/PA-03 en el paso 5), correcta.** Tres pruebas normales dejaban de compilar fuera de la lista cerrada. Relajar el tipo habría sido un valor por defecto silencioso; la resolvió la Enmienda 4. Es una falta del plan, no del programador.
- **Resúmenes devueltos: 0.** El resumen se aceptó a la primera, con todas las cifras exactas y los 48 títulos presentes.
- Hay base para mantener el modelo actual del `programador` en 01b. La regla del 2026-10-05 sigue vigente.

### Para 01b (lo que el plan ya prevé; el orquestador lo verifica antes de la ronda 0 de 01b)
- **Ronda 0 del tester:** C-9 (`temas-01a-r1:978`, reglas 1 a 3 con `entregas.ts`), C-1, C-2 y C-4. Quedan rojas hasta que existan los archivos (O-2 de la Enmienda 3).
- **Las 3 `*.ataque` nuevas de 01a tienen reglas estáticas sobre `moverATema`, `editarTarea` y los textos.** 01b no debería tocarlas, porque `borrarTarea` y `listarTrabajo` son funciones aparte. Si 01b cambia `editarTarea` o `moverATema`, el tester lo revisa en el inventario de su ronda 0.
- **Lista cerrada del programador:** E6 de `bloqueo-usuario.integracion` suma `entregas.ts`, con su línea de comentario (N-02 de la Enmienda 3).
- **Paso 9:** `adapters/README.md:295-299` nombra `bloquearTareaParaEntregar` (N-01 de la Enmienda 3).
- **Al cerrar 01b:** R-17 y el futuro "Editada el …" (§D-2.3) van a `docs/ESTADO.md` §3, y se aplican los textos de "Documentos a actualizar" marcados para 01b.
- **`ARCHITECTURE.md` §14:** la fila de `tareas` (`requiere_adjuntos` y `version`) y la de `entregas` ya describen el esquema que existe desde 01a. El plan no fija cuándo se aplican; propongo hacerlo al cerrar 01a o, a más tardar, con el resto de §14 en 01b.

### Para el humano
- **O-r1-2:** ¿la vista de edición debe esperar una lectura fresca de la tarea cuando la abre con datos en caché que se están recargando? Hoy muestra la caché y edita sobre esa versión.
  - El remedio es barato: mostrar "Cargando…" en el primer montaje mientras la consulta está en `isFetching`. Toca solo `editar-tarea-view.tsx` y una prueba, y podría entrar en 01e, que ya toca `features/tareas`.
  - Sin el cambio, el riesgo se limita a la ventana entre mover la tarea y abrir "Editar".
  - Recomiendo hacerlo en 01e. Es una decisión de comportamiento, no un defecto del plan aprobado.

## Verificación del resumen — ENTREGAS-01b — implementación
Veredicto: **ACEPTADO**. El tester puede atacar la ronda 1 de 01b.

### Mis corridas
Una suite a la vez. PA-01: red `uacam5 2` en perfil Público, regla del firewall habilitada (Inbound, Block, Public) y Docker 28.5.1. El humano la declaró de confianza para hoy (`aprobacion.md`).

| Paso | Mi corrida | Resumen | Coincide |
|---|---|---|---|
| `shared` build | código 0 | ídem | sí |
| `shared` lint | código 0, `All matched files use Prettier code style!` | ídem | sí |
| `backend` lint | código 0, `> tsc -p tsconfig.json --noEmit && tsc -p tsconfig.test.json` | ídem | sí |
| `backend` test (15:18:15Z a 15:21:53Z) | `Test Files  185 passed (185)` · `Tests  2348 passed (2348)` · `Duration  204.15s` | 185 · 2348 · 202.53s | sí |
| `backend` build | código 0 | ídem | sí |
| `prisma validate` / `migrate status` / `migrate diff --from-config-datasource --to-schema` | válido / `13 migrations found` · `Database schema is up to date!` / `No difference detected.` | "n/a" | — |
| Migración nueva | ninguna: `git diff --stat 82888dd -- backend/prisma` vacío y ninguna carpeta no versionada en `migrations/` | ídem | sí |
| `frontend` lint | código 0, `> tsc -b` | ídem | sí |
| `frontend` test (15:24:10Z a 15:27:50Z) | `Test Files  153 passed (153)` · `Tests  2271 passed (2271)` · `Duration  210.39s` | 153 · 2271 | sí |
| `frontend` build | código 0, `✓ built in 720ms` | `✓ built in 8.97s` | sí (el tiempo varía) |
| `npx vitest list --json` | backend **2348 en 185**; frontend **2271 en 153** | ídem | sí |

**Casos por archivo nuevo (mi lista):**

| Archivo | Casos |
|---|---|
| `entregas.integracion` | 43 |
| `core/entregas/entregas.test` | 18 |
| `entregas-concurrencia.integracion` | 11 |
| `esquemas-entregas.test` | 10 |
| `tareas-borrar-con-entregas.integracion` | 10 |
| `entregas-autorizacion.integracion` | 10 |
| `entregas-archivos.integracion` | 5 |
| `entregas-lecturas.integracion` | 5 |

`core/tareas/tareas.test.ts` llega a 14 casos. Total: 2233 + 115 = 2348, como dice el resumen.

### Verificaciones pedidas
1. **Tabla PR-1B01 a PR-1B28, con PR-1B03 bis, PR-1B09 bis y PR-1B22 bis: completa.**
   - **Títulos:** los 115 títulos citados aparecen tal cual en mi `vitest list`, y cada viñeta tiene caso.
   - **PR-1B17 y PR-1B18:** estuvieron rojas antes del remedio, con comando y última línea (`Tests  4 failed | 1 passed (5)`); la que pasaba es el control.
   - **PR-1B09 bis:**
     - usa `conFilaDeEntregasRetenida`, con `formadasDetrasDe` por operación y en orden fijo;
     - exige que la operación no termine antes de formarse;
     - lleva `timeout` de 30 s;
     - el caso (b) parte de una fila existente en `asignado`, con versión 4 (O-3 de la Enmienda 1).
   - **PR-1B04 (`shared`) y PR-1B28** están en `backend/test/esquemas-entregas.test.ts` (O-1 de la Enmienda 2).
   - **PR-1B22 bis (c)** es la carrera "comentario primero y después el borrado del maestro → `204`" (O-3 de la Enmienda 2). Fabrica el comentario con SQL dentro de la retenedora, con la tarea en `FOR KEY SHARE` y la fila `asignado`. Es correcto: la ruta del hilo es de 01c.
     - La variante "el borrado primero y el comentario después → `404`" queda en PR-1C06, que el plan ya pide en 01c ("comentar con la tarea borrada → 404" y "a la vez, uno retenido").
2. **Pruebas cambiadas: dentro de las listas.**
   - **Normales:** solo cambian las tres de la lista cerrada, con el cambio mínimo:
     - `archivos.integracion`: suma `prefijo` y su importación;
     - E6: el título, la lista con `entregas.ts` y dos líneas de comentario (N-02 de la Enmienda 3);
     - `trabajo-view.test`: `entrega: null` en la interfaz y en los dos dobles.
   - **PR-1B27:** suma casos nuevos en `core/tareas/tareas.test.ts`, donde el plan la ubica.
   - **`*.ataque`:** mi V-01 da **166/166 iguales** a la tabla de la ronda 0 de 01b (`reporte-tester.md`, desde la línea 1166). Contra 01a cambiaron exactamente las 7 reescritas por el tester en esa ronda:
     - `lecturas-fx-r1` (C-2);
     - `sesiones-y-cadena` (C-1);
     - `temas-01a-r1` (C-9);
     - `temas-01a-r3` (C-4);
     - `trabajo-01e-r1`, `trabajo-01e-r2` y `ver-mas-01e-r3` (C-10, `entrega` en los dobles).
3. **"No se toca": vacío.** Corrí `git diff --stat 82888dd` sobre middleware, auth, notifier, storage, live, config, workers, `cliente.ts`, `errores.ts`, `referencias.ts`, `bloqueo-clase.ts`, `temas.ts`, `publicaciones.ts`, `core/autoria.ts`, `core/clases`, `handlers/clases`, `validacion.ts`, `errores.ts`, `handlers/archivos.ts`, las ayudas compartidas de pruebas, los `.env.example`, los `package.json`, `prisma/`, `infra/`, `AGENTS.md`, `CLAUDE.md`, `.claude`, `ARCHITECTURE*`, `PRD.md`, `DESIGN.md`, `frontend/src/{services,app,styles,components,lib}`, `features/{auth,admin,diagnostico,tareas}` y `vitest.config.ts`.
   - En `features/clases` solo cambian `trabajo-view.test.tsx` y las tres `*.ataque` de C-10.
   - `ayudas-entregas.ts` es una ayuda nueva en un archivo nuevo, y eso está permitido.
4. **El código coincide con el plan, sin nada de más.**
   - **§D-0:**
     - dos familias de rutas: `…/entrega` usa `perfilDe(request).id` y no lleva `:alumnoId`; `…/entregas/:alumnoId` usa el filtro de datos `alumnoInscrito`, por PK con `activo` y `rol: "estudiante"`;
     - `alumnoDeLaRelacion` está en `core/`;
     - toda consulta filtra por clase;
     - la fila es perezosa: `INSERT … ON CONFLICT DO NOTHING` en `asegurarFilaDeEntrega`;
     - `ENTREGA_REALIZADA` se encola dentro de `alGuardar` con el `sql` de la transacción;
     - todas las respuestas usan `z.strictObject`, y del alumno solo se selecciona `nombre` (nunca `email`, `estado_pago` ni `acceso_restringido`).
   - **§D-3.1 a §D-3.7 y §D-3.9 a §D-3.11:**
     - los órdenes de `decidirEntrega` y `decidirAnulacion` coinciden;
     - entregar sigue los pasos 1 a 8: tarea `FOR KEY SHARE`, fila perezosa, entrega `FOR NO KEY UPDATE`, decisión, confirmación con conteo, `UPDATE` con `version + 1`, `alGuardar` y lectura anidada;
     - anular descarta los archivos sin `entrega_id`, devuelve la fila a `asignado`, sube la versión y no encola nada;
     - la subida aplica S-10 con `exigirEntregaAbierta`, firma antes de registrar y responde `no-store`;
     - las descargas filtran por `entrega: { tareaId, alumnoId }`, con `attachment` y `no-store`;
     - `listarEntregas` usa `condicionesDePaginaDeAlumnos` exportada sin cambiar el cuerpo, con una sola consulta de entregas y los dos conteos de §D-3.9;
     - `leerEntregaDeAlumno` responde `version` 0 sin fila;
     - `listarTrabajo` hace una sola `entrega.findMany` por página y solo con `alumnoId`;
     - los tres `instantaneaUnica: true` están donde dice el plan.
   - **§D-3.8, `borrarTarea`:**
     - `?confirmar=entregas` estricto, con `borrarTareaQuerySchema`;
     - los mensajes en singular y en plural se arman en `core/`, y son exactos;
     - `exigirBorradoConEntregasPermitido` también vive en `core/`;
     - el orden es el del plan: `FOR UPDATE OF t`, autoría, conteo (`entregado` y `calificado`), regla, archivos de entrega a `descartado`, archivos de la publicación, `deleteMany` de la publicación;
     - no hay ningún `delete` explícito de `entregas`.
   - **§D-3.6:**
     - `buscarArchivoConfirmado` suma `publicacionId: { not: null }`;
     - `buscarArchivosParaConfirmar` exige `prefijo` y `entregaId: null`;
     - `archivosParaPublicar` es el envoltorio con el prefijo de materiales.
   - **§D-5:** `datosEntregaRealizadaSchema` es estricto, con `{ entregaId, tareaId, claseId, version >= 1 }`, un id nuevo por entrega y la cola en `OPCIONES_DE_COLAS`.
   - **§D-6 y C-9:**
     - `FOR KEY SHARE` aparece una sola vez en el código de `entregas.ts`, dentro de `bloquearTareaParaEntregar`;
     - en `src/` solo lo toman `referencias.ts` y `entregas.ts`, como fija la regla estática (en verde);
     - `encolar(` está solo en `tareas.ts` y `entregas.ts`, y `cancelar(` solo en `tareas.ts`.
   - **§D-7:** los códigos y los mensajes son exactos.
   - **"Autorización":** las ocho rutas tienen los `roles` y el sexto paso de la tabla. Los handlers no comparan roles ni relaciones: `confirmar === CONFIRMAR_BORRADO_CON_ENTREGAS` es un dato de la petición y está aprobado.
   - **READMEs:** `handlers/README.md` y `adapters/README.md` están al día. El párrafo de `referencias.ts` ya nombra la excepción (N-01 de la Enmienda 3); R-17 queda solo para el comentario del código.
   - **Desviación 10** (el error de título en `listarTrabajo`) es lo que el plan absorbió de TAREAS-01.
5. **Desviaciones declaradas:**
   - **1 (esquemas de parámetros propios en `shared/src/entregas.ts`): se acepta.** La razón es real: el ciclo de importación entre `tareas.ts` y `entregas.ts`, y que `alumnoIdParamSchema` no pasa a minúsculas. Mismo mensaje y mismo paso a minúsculas que `tareaIdParamSchema`.
   - **2, 3, 4, 5, 7, 9 y 10: se aceptan.** Son de forma y respetan el contrato. La 4 coincide con la viñeta "En todas" de "Autorización".
   - **6 (prefijo comparado sin distinguir mayúsculas): se acepta; no abre nada.**
     - La lectura también filtra por `id`, `claseId` (la columna `uuid` de la fila) y `subidoPor`, así que un material de otra clase no entra por mayúsculas.
     - "materiales" nunca equivale a "entregas".
     - Los prefijos solo traen hexadecimales, guiones y `/` (ids validados como uuid), así que el `ILIKE` no tiene comodines.
     - Es lo que hace falta para no romper un material subido con `:claseId` en mayúsculas, porque `claveDeMaterial` (que no se toca) usa el id tal como llegó.
     - El `UPDATE` de la entrega usa `startsWith` sensible a mayúsculas, que también es correcto: la clave de entrega siempre nace en minúsculas.
   - **8 (PR-1B26 por el adaptador): N-01.** La razón declarada (no sumar una sexta línea `P2028` a PA-07) tiene salida: `servicio-ocupado-ch-r1.ataque` ya arma una app que registra en nivel `error`, sin ensuciar PA-07. Pero el paso de `AppError` 503 a la respuesta es el manejador común, ya probado. No bloquea.
   - **Enlace de 2048 caracteres: N-02.** Verificado con `shared/dist`: una entrada de 2048 caracteres con `ñ` pasa el esquema y se guarda como un `href` de **12 188** caracteres. `urlDeEntregaRespuestaSchema` no tiene tope, así que tampoco falla al leer.
6. **Hermanos y estados vecinos: coinciden con el código.**
   - La tabla de estado de partida × cierre la decide `core/` con la tarea y la fila bloqueadas.
   - La tabla de subida y descarga por ruta y usuario coincide con los filtros de `buscarArchivoDeMiEntrega`, `buscarArchivoDeEntregaDeAlumno` y `buscarArchivoConfirmado`.
   - La tabla de `borrarTarea` (rol × entregas × parámetro) coincide con `exigirBorradoConEntregasPermitido`.
   - `listarTrabajo` por relación y el cursor del roster, también.
   - Lo que declara sin prueba propia tiene razón:
     - entregar mientras cambia la fecha: queda en serie por diseño y está en los "Puntos de ataque";
     - el admin con el parámetro y sin entregas: la regla con 0 entregas nunca lanza (PR-1B27);
     - el filtro `tema=<uuid>`: es el mismo código que `sin-tema`.
7. **PA-07, sobre mi salida completa del backend: limpio.**
   - **Ceros:** `40P01`, `deadlock detected`, `could not serialize`, `too many clients` y `Unable to start a transaction`.
   - **10 `"Error no controlado"` (I-1):** 6 de `intentos-r2`, 3 `ZodError` y 1 `boom` de `salud`.
   - **5 `"code":"P2028"`:** todos de nivel 40, sobre `tx.sesion.*`, `tx.tokenCuenta.updateMany` y `$queryRawUnsafe`; es el control positivo completo.
   - Ninguno sale de entregas, tareas ni de las retenciones de 01b.
8. **Regla 2 y pruebas de autorización de cada ruta nueva:**
   - PR-1B24 cubre las ocho rutas: sin token, rol incorrecto en las dos direcciones, clase ajena igual que inexistente, restringido sin escribir, cambio de contraseña pendiente, ids en mayúsculas y ninguna fuga de `estadoPago`, `deudor`, `al_corriente`, `accesoRestringido` ni correo, con alumnos deudores.
   - PR-1B25 cubre al admin, y PR-1B22 (j) el `DELETE` con el parámetro.
   - Ninguna verificación de rol, propiedad ni inscripción está escrita a mano en un handler.

### Problemas que no bloquean
- **N-01 — PR-1B26 no pasa por HTTP.**
  - Comprueba el `AppError` 503 y que no se escribe nada, pero no la respuesta `503` de `POST …/entrega`.
  - El paso del `AppError` a HTTP es el manejador común, probado en `servicio-ocupado`. Se acepta.
  - Ataque opcional del tester: T-r1-1.
- **N-02 — un enlace válido puede guardarse mucho más largo que `LONGITUD_MAXIMA_ENLACE`.**
  - `enlaceDeEntregaSchema` mide antes de normalizar; `new URL(texto).href` codifica lo que no es ASCII y los caracteres de control.
  - Hasta 5 enlaces de unos 12 000 caracteres por entrega se guardan y se responden.
  - No hay error ni `500`, pero el dato guardado incumple el tope documentado, y 01d lo va a pintar.
  - El plan es ambiguo ("de 1 a 2048 … se transforma a `URL.href`"), así que no es un defecto del programador.
  - Destino: el tester lo ataca en la ronda 1 (T-r1-2). Si lo reporta como hallazgo, el remedio mínimo es medir también el `href` (tope sobre el resultado de la transformación), con su prueba en `esquemas-entregas.test.ts`. No cambia el contrato de la API.

### Detalles menores
- **`confirmarArchivosDeEntrega` toma la vigencia de 24 h con `Date.now()`,** no con el `ahora` de la entrega. La diferencia es de milisegundos y la lectura del handler usa el mismo criterio.
- **`archivoNoEncontrado` y `tareaNoEncontrada` están repetidos en `handlers/tareas/entregas.ts`,** como en el resto de los handlers. Es el patrón de la casa.

### Para el tester, ronda 1 de 01b (además de los "Puntos de ataque" del plan)
- **T-r1-1 (opcional) — PR-1B26 por HTTP.** Con una app que registre en nivel `error`, como `servicio-ocupado-ch-r1`, para no sumar líneas `P2028` a PA-07: la fila de la entrega retenida más allá del `timeout` debe responder `503 SERVICIO_OCUPADO` sin escribir nada (N-01).
- **T-r1-2 — la longitud guardada de un enlace (N-02).** Probar 2048 caracteres con `ñ`, con espacios, con inversores y con caracteres de control. ¿Cuánto mide lo guardado y lo que vuelve en `GET …/entrega` y en `GET …/entregas/:alumnoId`?
- **T-r1-3 — mayúsculas en el prefijo.**
  - Un material subido por `POST /clases/<CLASEID en mayúsculas>/archivos` y publicado con la ruta en minúsculas, y al revés: debe confirmarse igual.
  - Un archivo de entrega con su id nunca entra en una publicación, aunque se cambien mayúsculas en la ruta o en los ids.
- **T-r1-4 — orden de errores en las descargas.** Una tarea de otra clase con un `archivoId` válido de esta clase debe dar `404 TAREA_NO_ENCONTRADA` (Desviación 4), y un `:alumnoId` dado de baja con un `archivoId` suyo, `404 ALUMNO_NO_ENCONTRADO`, sin firmar nada.

- **T-r1-5 — universo de la lista frente al detalle.**
  - La página, `total` y `entregadas` de `listarEntregas` filtran "inscrito con cuenta activa", sin rol, igual que el roster.
  - `alumnoInscrito`, en cambio, exige además `rol: "estudiante"`.
  - Si una inscripción puede quedar con un usuario cuyo rol ya no es `estudiante` (por ejemplo, un cambio de rol hecho por el admin), la lista lo muestra pero su entrega y sus descargas responden `404 ALUMNO_NO_ENCONTRADO`.
  - Hay que confirmar si ese estado es alcanzable. Si lo es, es una incoherencia que hay que reportar.
- **Para 01c (anotado, no se ataca ahora):** PR-1C06 debe incluir la carrera "el borrado retiene la tarea y llega el comentario → `404` sin comentario ni fila de entrega" con `formadasDetrasDe`. Es la parte del PR-1B22 bis (c) original que 01b no pudo probar.

## Verificación del resumen — ENTREGAS-01b — corrección de la ronda 1 (T-01)
Veredicto: **ACEPTADO**. El tester puede hacer la ronda 2 de 01b.

### Mis corridas
Una suite a la vez. PA-01: `uacam5 2` en perfil Público, con la regla del firewall habilitada; el humano declaró la red de confianza el 2026-10-12.

| Paso | Mi corrida | Resumen | Coincide |
|---|---|---|---|
| `shared` build / lint | código 0 / código 0 | ídem | sí |
| `backend` lint | código 0, `> tsc -p tsconfig.json --noEmit && tsc -p tsconfig.test.json` | ídem | sí |
| `backend` test (16:03:32Z a 16:05:33Z) | `Test Files  186 passed (186)` · `Tests  2373 passed (2373)` · `Duration  116.61s` | 186 · 2373 · 116.58s | sí |
| `backend` build | código 0 | ídem | sí |
| `frontend` lint / test / build | código 0 / `153 passed` · `2271 passed` / `✓ built in 644ms` | 153 · 2271 | sí |
| `npx vitest list --json` | backend 2373 en 186 (`esquemas-entregas.test.ts`: 14); frontend 2271 en 153 | ídem (+4) | sí |

- **PA-07: limpio.**
  - Ceros en `40P01`, `deadlock detected`, `could not serialize`, `too many clients` y `Unable to start a transaction`.
  - 10 `"Error no controlado"` (I-1): 6 de `intentos-r2`, 3 `ZodError` y 1 de `salud`.
  - 5 `"code":"P2028"`: el control positivo (`tx.sesion.*`, `tx.tokenCuenta.updateMany` y `$queryRawUnsafe`).
- **V-01: 167/167** iguales a la tabla de la ronda 1 de 01b (`reporte-tester.md`, línea 1504 en adelante).
- **"No se toca": vacío.** Es la misma lista de mi verificación de 01b.

### El diff de la corrección: solo el hallazgo
Desde mi verificación anterior (15:28Z), en `backend/src`, `backend/test`, `backend/prisma`, `shared/src` y `frontend/src` solo cambiaron, fuera del cliente generado, tres archivos:
- `shared/src/entregas.ts`, el remedio;
- `backend/test/esquemas-entregas.test.ts`, los 4 casos;
- `backend/test/entregas-01b-r1.ataque.test.ts`, la `*.ataque` nueva del tester.

### El remedio es el de N-02
- **El orden en `enlaceDeEntregaSchema`:** `trim` → `min(1)` → `max(2048)` sobre el texto crudo (se conserva, para no procesar entradas enormes) → `refine(esEnlaceAceptado)` → `transform(URL.href)` → `pipe(z.string().max(2048, MENSAJE_ENLACE))`.
- **Qué garantiza:**
  - lo que se guarda y se devuelve nunca pasa de 2048;
  - el mensaje es el único del enlace;
  - dentro de `entregarSchema`, el error sale con la ruta `["enlaces", i]`.
- **Los 4 casos de "enlaceDeEntregaSchema mide el enlace normalizado (T-01)" cubren lo pedido:**
  1. Tres crudos de exactamente 2048 que crecen al normalizar (`ñ`, espacios internos, inversor U+202E): rechazados con `MENSAJE_ENLACE`.
  2. Un crudo corto que normaliza a ≤ 2048: aceptado y normalizado (`%C3%B1`).
  3. La frontera normalizada: 2048 exactos se aceptan y 2049 se rechazan.
  4. Dentro de la lista, en la posición 1: ruta `["enlaces", 1]` y mensaje del enlace.
- **El contrato no cambia:** el frontend de 01d usará el mismo esquema y dará el mismo error.

### Hermanos: los revisé contra el código
| Hermano | Dónde | ¿Se mide antes de una transformación que alarga? | Coincide con el resumen |
|---|---|---|---|
| Tope de 5 enlaces | `entregarSchema`, `.max(5)` del arreglo | La transformación es por elemento y no cambia cuántos hay | sí |
| Tope de 5 archivos y "sin repetidos" | `archivoIdsSchema` + `refine` en minúsculas + `transform(enMinusculas)` | Pasar un uuid a minúsculas no cambia su largo | sí |
| Nombre de archivo | `validarArchivoDeclarado` (`core/archivos/politica.ts`) | Se guarda tal como llega; `disposicionDeContenido` lo codifica solo para la cabecera firmada | sí |
| Textos largos (`normalizarTextoLargo`) | `shared/src/clases.ts:68` y `conTextosNormalizados` (`core/clases/texto.ts`) | Normaliza antes de validar, y solo acorta (CRLF → LF, `trim`) | sí |
| `descripcionClaseSchema` | `clases.ts:140-145` | `trim` → `transform` → `pipe(textoLargoSchema(2000))`: mide después | sí |
| Nombres de tema y de categoría | `nombreTemaSchema` = `textoDeUnaLineaSchema(80)`; `claveDeNombre` (NFKC) | NFKC puede alargar (por ejemplo, U+FDFA), pero solo se usa para comparar repetidos; el nombre guardado es el crudo, ya medido | sí |
| Término de búsqueda | `estadoDeTerminoDeBusqueda` y `busquedaCandidatosSchema` | Mide crudo (1000) y normalizado (120) | sí |
| Código de clase | `codigoInvitacionSchema`: `max(40)` → `transform` → `pipe(regex de 7)` | Solo acorta, y el regex final mide el resultado | sí |
| `nombre_busqueda` | `normalizarParaBusqueda` (NFD) | Puede alargar, pero es una columna interna `text` sin tope y no se devuelve | sí |
| **Agregado:** correo (`correoSchema`, `auth.ts:9-13`) | `trim` → `max(254)` → `pipe(z.email())`; `core/` lo pasa a minúsculas | `z.email` de zod 4 solo acepta ASCII, y `toLowerCase` sobre ASCII no alarga | — (no aplica) |
| **Agregado:** nombre de persona (`nombreSchema`, `auth.ts:40-49`) | `trim` → `min` → `max(120)` → `refine` | Sin transformación que alargue | — (no aplica) |
| **Agregado:** columnas con tope en la base | `schema.prisma` y migraciones | No hay ningún `VARCHAR(n)`: ningún alargamiento puede dar un `500` en la base | — (no aplica) |

**Estados vecinos del mecanismo** (validar → normalizar → guardar → responder): los nombra el resumen, y coinciden con el código y con las pruebas:
- crudo largo que normaliza largo;
- crudo corto que normaliza corto;
- la frontera normalizada;
- crudo de más de 2048;
- un enlace en otra posición de la lista;
- la lectura de lo guardado.

Ningún hermano dice "no aplica" sin razón.

### Problemas que bloquean
Ninguno.

### Problemas que no bloquean
Ninguno nuevo. N-01 de mi verificación de 01b (PR-1B26 por el adaptador) sigue como estaba.

### Para el tester, ronda 2 de 01b
- **T-r2-1 — la frontera normalizada por HTTP.** En `POST …/entrega`, con 2048 y 2049 normalizados, mezclando `ñ` y `%`, comprobar:
  - que la respuesta sea `400 VALIDACION` con el mensaje del enlace y su posición;
  - que no quede ninguna fila de entrega, ningún archivo confirmado ni ningún trabajo nuevo.
- **T-r2-2 — un enlace ya codificado (`%C3%B1`) frente al mismo con `ñ`.** Deben normalizar igual y medir lo mismo, sin doble codificación.
- **T-r2-3 (regresión) — `GET …/entrega` y `GET …/entregas/:alumnoId` siguen devolviendo los enlaces que se guardaron antes de la corrección.** No hay datos previos en `dev` de 01b; es un control de que la lectura no se volvió más estricta.

## Revisión final — ENTREGAS-01b
Veredicto: **APROBADO CON OBSERVACIONES**. Nada bloquea el commit `<K1b>`.
Verificación propia: lint, test y build en verde en los tres paquetes; cifras abajo.

### Corrida propia
Una suite a la vez. PA-01: `uacam5 2` en perfil Público, regla del firewall habilitada; el humano declaró la red de confianza el 2026-10-12.

| Paso | Mi corrida | Tester (ronda 2) |
|---|---|---|
| `shared` build | código 0 | — |
| `backend` lint | código 0, `> tsc -p tsconfig.json --noEmit && tsc -p tsconfig.test.json` | ídem |
| `backend` test (16:22:12Z a 16:24:16Z) | `Test Files  187 passed (187)` · `Tests  2378 passed (2378)` · `Duration  119.78s` | 187 · 2378 |
| `backend` build | código 0 | — |
| `prisma validate` / `migrate status` / `migrate diff --from-config-datasource --to-schema` | válido / `Database schema is up to date!` / `No difference detected.` | — |
| `frontend` lint / test / build | código 0 / `153 passed` · `2271 passed` / código 0 | 153 · 2271 |

- **Desde mi verificación de T-01 solo cambió `backend/test/entregas-01b-r2.ataque.test.ts`,** la `*.ataque` nueva del tester (comprobado con `find -newermt`). El código de producción es el que ya verifiqué.
- **El diff contra `82888dd`:** 31 archivos versionados más los 14 no versionados de 01b. Mi lectura contra el plan sigue vigente: §D-0, §D-3 completo con el §D-3.8 de la Enmienda 2, §D-5, §D-6 con C-9, §D-7, "Acceso a datos", "Autorización" y los READMEs con el párrafo de `referencias.ts`. Nada fuera ni de más.

### Regresión, PA-07 y "No se toca"
- **V-01: 168/168** iguales a la tabla de la ronda 2 (`reporte-tester.md`, SHA-256 `a3b39278…74bf`).
  - Contra `82888dd` hay 2 `*.ataque` nuevas (`entregas-01b-r1` y `-r2`) y exactamente 7 modificadas:
    - C-1: `sesiones-y-cadena`;
    - C-2: `lecturas-fx-r1`;
    - C-4: `temas-01a-r3`;
    - C-9: `temas-01a-r1`;
    - C-10: `trabajo-01e-r1`, `trabajo-01e-r2` y `ver-mas-01e-r3`.
  - Ninguna borrada.
  - No hay `.skip`, `.only` ni `.todo` en ninguna prueba.
- **PA-07: limpio.**
  - Ceros en `40P01`, `deadlock detected`, `could not serialize`, `too many clients` y `Unable to start a transaction`.
  - 10 `"Error no controlado"` (I-1): 6 de `intentos-r2`, 3 `ZodError` y 1 de `salud`.
  - Control positivo: 5 `"code":"P2028"`, de nivel 40, sobre `tx.sesion.*`, `tx.tokenCuenta.updateMany` y `$queryRawUnsafe`.
- **"No se toca": vacío.**
  - Dentro de los paquetes, contra `82888dd`, con la lista completa de mi verificación del resumen.
  - Fuera, contra `dd8edcb`: `AGENTS.md`, `CLAUDE.md`, `.claude`, `infra` y los `package*.json`.
  - `ARCHITECTURE*`, `PRD.md` y `DESIGN.md` no cambiaron desde `82888dd`. Los cambios de `<K1a>` son los de A-5, con su SHA en `aprobacion.md`.

### Definición de terminado (01b)
- [x] **RF y RN:**
  - RF-14: ver, entregar y anular.
  - RF-15 y RF-44 (parte): `con_retraso`, cierre y reapertura.
  - RF-24: "Marcar como completada" por `requiereAdjuntos`.
  - RF-35: la lista del maestro, con total y entregadas.
  - RN-02: ninguna respuesta lleva estado de pago, correo ni restricción (PR-1B24, con alumnos deudores).
  - RN-03 y RN-06: el alumno restringido recibe `403` sin escribir nada.
  - S-06 modificada: el borrado con entregas.
- [x] **Capas y middleware:**
  - Las 8 rutas usan `protegido()` con los roles y el sexto paso de la tabla.
  - Ningún handler compara rol ni relación.
  - `adapters/db` no importa `adapters/queue` (regla estática del tester).
  - El evento se encola en la transacción del dato.
- [x] **lint, build y test:** en verde.
- [x] **Pruebas de autorización por ruta nueva:** PR-1B24 (sin token, rol incorrecto, clase ajena e inexistente, restringido, cambio de contraseña, mayúsculas, sin fugas), PR-1B25 (admin) y PR-1B22 (j) (el `DELETE` con el parámetro).
- [x] **Migración:** ninguna; `migrate diff` sin diferencias.
- [x] **`infra/` y `.env.example`:** sin cambios, y no hacían falta.
- [ ] **Documentos:** lo aplica el orquestador al cerrar 01b (A-5); la lista exacta va abajo. Los READMEs de `backend/src` ya están al día.

### Problemas que bloquean
Ninguno.

### Documentos de A-5 que se aplican ahora (cierre de 01b)
Con los textos de `plan.md`, "Documentos a actualizar". Lo que el plan ata al hilo privado se separa y se deja para 01c.

**ESSENTIALS:**
1. **"Tablas", restricciones clave:** el texto completo del plan, que cubre `comentarios`, `archivos` y `entregas`. El esquema ya existe desde 01a.
2. **"Archivos":** la viñeta nueva de Entregas (A-6, R-02), completa.
3. **"Reglas de negocio":** reemplazar "Entrega tardía" y "Entregas admiten archivos y enlaces" por el texto del plan **sin** su última frase. La frase que queda para 01c es: "Hilo privado (RF-16, al cerrar 01c): uno por alumno y tarea, entre el alumno y los maestros de la clase; el admin lo lee y no escribe.".
4. **"Reglas de negocio", viñeta "Autoría":** "Una tarea con entregas solo la borra el admin, con confirmación (ENTREGAS-01)."
5. **"Asíncrono y notificaciones", viñeta "Eventos":** solo la mitad de 01b, con este texto propuesto: "`ENTREGA_REALIZADA` lleva `{ entregaId, tareaId, claseId, version }` con un id nuevo por entrega (ENTREGAS-01)." La otra mitad ("`COMENTARIO_CREADO` sirve al muro y al hilo privado (ENTREGAS-01).") va al cerrar 01c.

**`ARCHITECTURE.md`:**

6. **§7, fila `tareas`:** el texto del plan sin las dos rutas del hilo. Las rutas que quedan para 01c son "`GET/POST …/entrega/comentarios` (hilo privado del alumno)" y "`GET/POST …/entregas/{alumnoId}/comentarios` (el admin solo lee)". Se conservan las frases del `PUT` con `version` y del `DELETE` con `409 TAREA_CON_ENTREGAS` y `?confirmar=entregas`.
7. **§7, fila `calificaciones`:** el texto del plan.
8. **§8:** la fila `ENTREGA_REALIZADA`. La de `COMENTARIO_CREADO` va al cerrar 01c.
9. **§11:** puntos 1 y 6, con el texto del plan.
   - §14 ya se aplicó en `<K1a>`.

**`PRD.md`:**

10. **RN-07:** la viñeta de S-06 modificada.
11. **RF-24:** el texto del plan.
12. **RF-44:** el texto del plan.
13. **§11, pregunta abierta 4:** "Resuelta (ENTREGAS-01): 25 MB por archivo, hasta 5 archivos y 5 enlaces por entrega; para video, enlace."
   - **RF-16 se pasa al cierre de 01c.** El plan lo pone en 01b, pero describe el hilo privado, que no existe hasta 01c.

**`docs/ESTADO.md` §3:** se suman R-17 (el comentario de cabecera de `adapters/db/referencias.ts`, carril trivial después de ENTREGAS) y la regla de §D-2.3 (una columna propia para un futuro "Editada el …"), las dos que el plan pide anotar al cerrar 01b. También O-1 y O-2 de esta revisión.

### Problemas que no bloquean
- **N-01 — PR-1B26 se prueba por el adaptador, no por HTTP (de mi verificación del resumen).** Destino: nada. El paso del `AppError` 503 a la respuesta es el manejador común, ya probado, y el tester no lo atacó como hallazgo.
- **N-02 — T-01 está cerrado.** El tope se mide sobre el enlace normalizado; T-r2-1 a T-r2-3 resistieron por HTTP y las lecturas no se volvieron más estrictas.

### Observaciones del tester, arbitradas
- **O-b2-1 — `%c3%b1` en minúsculas se guarda distinto de `ñ` y de `%C3%B1`.** Son URL equivalentes y S-08 solo pide guardar el `href`. Destino: nada, mientras nadie compare enlaces. Si un encargo llega a quitar enlaces repetidos, que normalice la capitalización de los `%XX` (anotado aquí).
- **O-1 — subidas de archivos pendientes sin tope hasta `LIMPIEZA_DIARIA` (R-07 del plan).**
  - Ya está aceptado por el plan: S-10 limita la subida a tareas donde se puede entregar, y el tope de 25 MB por archivo sigue.
  - Destino: `docs/ESTADO.md` §3, con `LIMPIEZA_DIARIA` (y DEPLOY, antes de abrir a alumnos): los pendientes de entregas los borra la misma limpieza que los de materiales.
  - Si el humano quiere un tope de pendientes por alumno antes de DEPLOY, es una decisión suya.
- **O-2 — la lista del maestro no filtra por rol y el detalle sí exige `estudiante` (T-r1-5).** Hoy es inalcanzable por la API: solo un estudiante se inscribe y no hay cambio de rol.
  - Destino: `docs/ESTADO.md` §3, para el encargo de ADMIN que permita cambiar el rol de una cuenta. Ese encargo debe decidir qué pasa con sus inscripciones, o alinear el filtro de la lista con el del detalle.

### Medición del programador (01b)
- **Rondas del tester:**
  - ronda 0, que no cuenta;
  - ronda 1, ROTO con un hallazgo (T-01);
  - ronda 2, RESISTE.
- **Rondas extra:** 1. **Por hermanos o estados vecinos: 0.** T-01 era un defecto propio del esquema, anotado como N-02 en mi verificación, no un remedio anterior sin extender. La corrección se aceptó a la primera, con la lista de hermanos completa: los tres que sumé no aplican.
- **PARADAS:** ninguna.
- **Resúmenes devueltos:** 0, tanto en la implementación como en la corrección.
- No se activa la regla del 2026-10-05 (2 o más rondas extra por hermanos).

### Para 01c (lo verifica el orquestador antes de la ronda 0 de 01c)
- **Ronda 0 del tester:**
  - C-1: el inventario suma las 4 rutas del hilo.
  - C-2: `entregas.ts` pasa a 4 usos de `instantaneaUnica`, por `listarHiloPrivado`.
  - C-3: `muro-c-r1:625` suma `handlers/tareas/hilo-privado.ts`.
  - C-4: suma `hilo-privado.ts`.
  - C-9: reglas 2 y 3 con `hilo-privado.ts`.
  - E6 no cambia: el hilo vive en `entregas.ts`.
- **Las reglas estáticas de `entregas-01b-r1` siguen valiendo en 01c si `comentarEnHiloPrivado` reutiliza `bloquearTareaParaEntregar`:** `FOR KEY SHARE` aparece una sola vez, y el conteo de 7 esquemas de respuesta no incluye los del hilo. Si 01c escribe otro `FOR KEY SHARE` o cambia esos nombres, es PARADA, no un C-n improvisado.
- **PR-1C06 debe incluir la carrera "el borrado retiene la tarea y llega el comentario → `404`"** sin comentario ni fila de entrega, con `formadasDetrasDe`. Es la parte del PR-1B22 bis (c) original que 01b no podía probar.
- **`COMENTARIO_CREADO` compartido (§D-5):** la unión de dos `z.strictObject` con llaves distintas (PR-1C08). El tipo del muro se conserva y no cambia de forma.
- **Al cerrar 01c, A-5:**
  - ESSENTIALS: la frase del hilo privado en "Reglas de negocio" y la mitad de `COMENTARIO_CREADO` en "Asíncrono".
  - `ARCHITECTURE.md`: §7, las dos rutas del hilo; §8, la fila `COMENTARIO_CREADO`.
  - `PRD.md`: RF-16.

## Verificación del resumen — ENTREGAS-01c — implementación
Veredicto: **ACEPTADO**. El tester puede atacar la ronda 1 de 01c.

### Mis corridas
Una suite a la vez. PA-01: `uacam5 2` en perfil Público, con la regla del firewall habilitada; el humano declaró la red de confianza el 2026-10-12.

| Paso | Mi corrida | Resumen | Coincide |
|---|---|---|---|
| `shared` build / lint | código 0 / código 0 | ídem | sí |
| `backend` lint | código 0, `> tsc -p tsconfig.json --noEmit && tsc -p tsconfig.test.json` | ídem | sí |
| `backend` test (17:10:09Z a 17:13:27Z) | `Test Files  191 passed (191)` · `Tests  2407 passed (2407)` · `Duration  191.16s` | 191 · 2407 | sí |
| `backend` build | código 0 | ídem | sí |
| `prisma validate` / `migrate status` / `migrate diff --from-config-datasource --to-schema` | válido / `Database schema is up to date!` / `No difference detected.` | (no lo reporta) | — |
| Migración nueva | ninguna (`git status backend/prisma` vacío) | ídem | sí |
| `frontend` lint / test / build | código 0 / `153 passed` · `2271 passed` / código 0 | ídem | sí |
| `npx vitest list --json` | backend 2407 en 191, frontend 2271 en 153 | ídem | sí |

- **Casos por archivo nuevo:** `comentario-creado.test` 3, `hilo-privado.integracion` 14, `hilo-privado-concurrencia.integracion` 4 y `hilo-privado-autorizacion.integracion` 8. Suman 29, y 2378 + 29 = 2407.
- **PA-07: limpio.**
  - Ceros en `40P01`, `deadlock detected`, `could not serialize`, `too many clients` y `Unable to start a transaction`.
  - 10 `"Error no controlado"` (I-1): 6 de `intentos-r2`, 3 `ZodError` y 1 de `salud`.
  - 5 `"code":"P2028"`: el control positivo, de nivel 40 (`tx.sesion.*`, `tx.tokenCuenta.updateMany` y `$queryRawUnsafe`).
  - Ninguno sale del hilo.
- **V-01: 168/168** iguales a la tabla de la ronda 0 de 01c.
- **"No se toca": vacío.**
  - Dentro de los paquetes, contra `159cc7e`: middleware, auth, notifier, storage, queue, config, workers, `cliente.ts`, `errores.ts`, `referencias.ts`, `bloqueo-clase.ts`, `temas.ts`, `publicaciones.ts`, `tareas.ts`, `archivos.ts`, `core/autoria.ts`, `core/clases`, `handlers/clases`, `validacion.ts`, `errores.ts`, `handlers/archivos.ts`, todas las ayudas de `backend/test/` (incluida `ayudas-entregas.ts`), `frontend/`, `prisma/` y los `package*.json`.
  - Fuera de los paquetes: `infra`, `AGENTS.md`, `CLAUDE.md`, `.claude`, `ARCHITECTURE*`, `PRD.md` y `DESIGN.md`.
  - Ninguna prueba normal cambió.

### Verificaciones pedidas
1. **Tabla PR-1C01 a PR-1C08: completa.** Los 29 títulos citados aparecen tal cual en mi `vitest list`.
   - **PR-1C06 tiene las dos carreras:**
     - el borrado retiene la tarea y el comentario (del alumno, o del maestro con el borrado del admin con `?confirmar=entregas`) espera y responde `404` sin comentario, fila ni trabajo;
     - el comentario retiene la tarea y el borrado del maestro espera, y después da `201` y `204`, con el hilo borrado en cascada;
     - además, la variante con una entrega realizada da `409 TAREA_CON_ENTREGAS` y conserva la versión.
   - **PR-1C08:** la unión de dos `z.strictObject` con llaves distintas. Rechaza las dos llaves a la vez, ninguna y llaves de más.
2. **El diff contra `159cc7e`: coincide con el plan.**
   - **§D-4, `listarHiloPrivado`:**
     - corre en una instantánea única: el cuarto `instantaneaUnica: true` de `entregas.ts` (`grep -c` da 4);
     - lee la tarea por `(id, clase_id)`; el alumno de la ruta por PK, con `activo` y `rol: "estudiante"`, solo en las rutas de los maestros;
     - sin fila de entrega, responde una lista vacía y no la crea; con cursor y sin fila, `400`;
     - comprueba el cursor contra `(id, entrega_id)` y lee la página en orden ascendente por `(creado_en, id)`, con `paginacionSchema` (20, hasta 100).
   - **§D-4, `comentarEnHiloPrivado`:**
     - reutiliza `bloquearTareaParaEntregar`; `FOR KEY SHARE` sigue apareciendo una sola vez;
     - crea la fila perezosa con `asegurarFilaDeEntrega` y lee la entrega sin bloquearla ni escribirla (S-15: no cambia estado, versión ni `actualizado_en`);
     - crea el comentario y llama a `alGuardar(sql, { entregaId })`.
   - **S-04:** no hay ruta ni función para borrar o editar un comentario, y la respuesta no lleva `puedeBorrar`.
   - **§D-5:** el handler encola `COMENTARIO_CREADO` dentro de `alGuardar`, con id = id del comentario y datos `{ comentarioId, entregaId, claseId }` validados por el tipo `DatosComentarioPrivado`. `adapters/db` no importa `adapters/queue`. `DatosComentarioCreado` conserva la forma del muro.
   - **§D-6:** el bloqueo de la tarea es `FOR KEY SHARE` y choca con el `FOR UPDATE` del borrado. Lo comprueban las carreras de PR-1C06.
   - **"Autorización":** las cuatro rutas tienen los `roles` y el sexto paso de la tabla, y el admin solo lee (`POST …/entregas/:alumnoId/comentarios` con `roles: ["maestro"]`).
     - `:alumnoId` es un filtro de datos del adaptador: `404 ALUMNO_NO_ENCONTRADO`.
     - El handler no compara roles ni relaciones. `comprobarInscripcion` es fijo por ruta (`false` en las del alumno, cuyo id es el del perfil; `true` en las de los maestros); no sale de un rol leído.
   - **Aislamiento frente al muro:** todas las consultas de comentarios de `publicaciones.ts` filtran por `publicacionId` o por `publicacion: { claseId }`:
     - el `groupBy` del conteo, por `publicacionId in` la página;
     - la lista y su cursor, por `publicacionId`;
     - el borrado del maestro, por `publicacionId` y `publicacion.claseId`;
     - `borrarMiComentario`, por `publicacion: { claseId }`.
     Un comentario privado (`publicacion_id` nulo) nunca entra; PR-1C04 lo comprueba en las cinco rutas.
   - **RN-02:**
     - se selecciona del autor `id`, `nombre` y `rol`, este último solo para `firmaDelAutor`;
     - la respuesta lleva `autor: { id, nombre, administracion }`, `texto`, `creadoEn` y `propio`, nunca el rol, el correo ni el estado de pago;
     - `comentarioPrivadoSchema`, `comentarioPrivadoRespuestaSchema` y `listaComentariosPrivadosRespuestaSchema` son `z.strictObject`.
   - **READMEs:** `handlers/README.md` y `adapters/README.md` tienen sus secciones nuevas (ver detalles).
3. **Pruebas de autorización por ruta nueva (PR-1C03, PR-1C05 y PR-1C07):**
   - sin token;
   - rol incorrecto: el maestro y el admin en las rutas del alumno, el alumno en las de los maestros, y el admin que escribe;
   - clase ajena igual que inexistente;
   - restringido sin escribir, también en su propio hilo;
   - cambio de contraseña pendiente;
   - ids de la ruta en mayúsculas;
   - ninguna fuga de `estadoPago`, `deudor`, `al_corriente`, `accesoRestringido`, el rol ni el correo, con alumnos deudores;
   - como `:alumnoId`: alumno de otra clase, dado de baja, desactivado, inexistente o un maestro, todos con `404` sin escribir;
   - maestro de otra clase: `403 SIN_ACCESO_A_LA_CLASE`.
4. **Hermanos y estados vecinos: coinciden con el código.**
   - Comentar según el estado de la entrega y el actor: el adaptador nunca lee el estado ni el cierre.
   - El alumno de la ruta: `alumnoInscrito`.
   - La tarea borrada antes y después.
   - El cursor de otro hilo, de otra tarea o del muro, y sin fila.
   - El texto en la frontera: `crearComentarioSchema` mide después de `normalizarTextoLargo`, que solo acorta.
   - El aislamiento frente al muro.
   - Ningún "no aplica" sin razón.
5. **Nada fuera del plan ni de más.** Cambian `shared/src/entregas.ts` e `index.ts`, `core/eventos/avisos-de-clase.ts`, `adapters/db/entregas.ts` e `index.ts`, `app.ts` y los dos README. Son nuevos `handlers/tareas/hilo-privado.ts` y 4 archivos de pruebas. Las 5 `*.ataque` modificadas son las de la ronda 0 del tester (C-1, C-2, C-3, C-4 y C-9).

### Problemas que bloquean
Ninguno.

### Problemas que no bloquean
- **N-01 — `autorDelMuroSchema` (de CLASES) es `z.object`, no `z.strictObject`, y va anidado en `comentarioPrivadoSchema`.**
  - Una llave de más en el autor se descartaría en silencio en lugar de romper el `parse`. No hay fuga, porque el adaptador arma el autor con `firmaDelAutor`.
  - Es el mismo esquema del muro, que este encargo no toca.
  - Destino: nada en ENTREGAS. Si un encargo endurece los esquemas del muro, que incluya este.

### Detalles menores
- **`handlers/README.md`, viñeta de `tareas/hilo-privado.ts`:** dos líneas de continuación empiezan en la columna 0 ("…/entregas/:alumnoId/comentarios…" y "claseId }`…"), así que la lista de Markdown se corta. Formato, nada más.
- **`adapters/README.md:411`:** el párrafo de 01b todavía dice "`entregas.ts` (3)"; la sección nueva de 01c dice que pasan a 4. Conviene actualizar el número en el párrafo viejo, por carril trivial o al cerrar 01c.

### Para el tester, ronda 1 de 01c (además de los "Puntos de ataque" del plan)
- **T-r1-1 — el primer comentario simultáneo del alumno y del maestro en un hilo sin fila de entrega.** Una sola fila, dos comentarios y dos trabajos, sin `P2002` ni `500` (el `INSERT … ON CONFLICT DO NOTHING` de los dos espera al otro).
- **T-r1-2 — comentar mientras el alumno entrega o anula.** La fila de la entrega está en `FOR NO KEY UPDATE` y el comentario solo toma `FOR KEY SHARE` por la FK. Ninguno espera al otro, la versión sube solo por la entrega o la anulación y no hay deadlock.
- **T-r1-3 — la regla estática de `z.strictObject` de `entregas-01b-r1` no nombra los esquemas del hilo.** Extenderla, con su C-n si hace falta, a los tres esquemas de respuesta del hilo.
- **T-r1-4 — el cursor después de que el alumno se da de baja y vuelve a inscribirse.** El hilo y su cursor siguen siendo de la misma fila de entrega, así que no debe perderse nada.
- **T-r1-5 — un `COMENTARIO_CREADO` del muro y uno del hilo en la misma clase.** Cada `data` encaja solo en su esquema (`datosComentarioCreadoSchema.safeParse` sobre los trabajos reales de `pgboss.job`).

## Revisión final — ENTREGAS-01c
Veredicto: **APROBADO CON OBSERVACIONES**. Nada bloquea el commit `<K1c>`.
Verificación propia: lint, test y build en verde en los tres paquetes; cifras abajo.

### Corrida propia
Una suite a la vez. PA-01: `uacam5 2` en perfil Público, con la regla del firewall habilitada; el humano declaró la red de confianza el 2026-10-12.

| Paso | Mi corrida | Tester (ronda 1) |
|---|---|---|
| `shared` build | código 0 | — |
| `backend` lint | código 0, `> tsc -p tsconfig.json --noEmit && tsc -p tsconfig.test.json` | ídem |
| `backend` test (17:37:04Z a 17:40:49Z) | `Test Files  192 passed (192)` · `Tests  2422 passed (2422)` · `Duration  219.36s` | 192 · 2422 |
| `backend` build | código 0 | — |
| `prisma validate` / `migrate status` / `migrate diff --from-config-datasource --to-schema` | válido / `Database schema is up to date!` / `No difference detected.` | — |
| `frontend` lint / test / build | código 0 / `153 passed` · `2271 passed` / código 0 | 153 · 2271 |

- **Desde mi verificación del resumen de 01c, en `backend/src`, `backend/test`, `backend/prisma`, `shared/src`, `frontend/src` y `DESIGN.md` solo cambió `backend/test/hilo-01c-r1.ataque.test.ts`,** la `*.ataque` nueva del tester. El código de producción es el que ya verifiqué.
- **El diff contra `159cc7e`:** 18 archivos con los documentos de trabajo; en los paquetes son los de mi verificación más la `*.ataque` nueva. Mi lectura contra §D-4 a §D-7, "Acceso a datos", "Autorización" y los READMEs sigue vigente. Nada fuera ni de más.

### Regresión, PA-07 y "No se toca"
- **V-01: 169/169** iguales a la tabla de la ronda 1 de 01c (`reporte-tester.md`, SHA-256 `ad872544…30bdf`).
  - Contra `159cc7e` hay 1 `*.ataque` nueva (`hilo-01c-r1`) y exactamente las 5 modificadas de la ronda 0 de 01c:
    - C-1: `sesiones-y-cadena`;
    - C-2: `lecturas-fx-r1`;
    - C-3: `muro-c-r1`;
    - C-4: `temas-01a-r3`;
    - C-9: `temas-01a-r1`.
  - Ninguna borrada, y no hay `.skip`, `.only` ni `.todo` en ninguna prueba.
- **PA-07: limpio.**
  - Ceros en `40P01`, `deadlock detected`, `could not serialize`, `too many clients` y `Unable to start a transaction`.
  - 10 `"Error no controlado"` (I-1): 6 de `intentos-r2`, 3 `ZodError` y 1 de `salud`.
  - Control positivo: 5 `"code":"P2028"`, de nivel 40, sobre `tx.sesion.*`, `tx.tokenCuenta.updateMany` y `$queryRawUnsafe`.
- **"No se toca": vacío.** Dentro de los paquetes contra `159cc7e`, con la lista de mi verificación del resumen, más `ARCHITECTURE*`, `PRD.md` y `DESIGN.md`. Fuera, contra `dd8edcb`: `AGENTS.md`, `CLAUDE.md`, `.claude`, `infra` y los `package*.json`.

### Definición de terminado (01c)
- [x] **RF-16 y las reglas:**
  - el hilo privado del alumno y de los maestros, y el admin que lee y no escribe (P-01 a);
  - RN-02: no hay fuga de pago, correo, restricción ni rol (PR-1C07, con alumnos deudores);
  - RN-03 y RN-06: el restringido no lee ni escribe;
  - RN-07 con S-04: no se borra ni se edita, y la respuesta no lleva `puedeBorrar`.
- [x] **Capas y middleware:**
  - las 4 rutas usan `protegido()` con la cadena de la tabla;
  - el handler no compara roles ni relaciones;
  - el aviso se encola en la transacción del comentario;
  - `adapters/db` no importa `adapters/queue`.
- [x] **lint, build y test:** en verde.
- [x] **Pruebas de autorización por ruta:** PR-1C03, PR-1C05 y PR-1C07, más las 15 de `hilo-01c-r1`.
- [x] **Migración:** ninguna.
- [x] **`infra/` y `.env.example`:** sin cambios.
- [ ] **Documentos:** los de A-5 de abajo los aplica el orquestador al cerrar 01c. Los READMEs están al día salvo dos detalles de formato (N-02).

### Problemas que bloquean
Ninguno.

### Documentos de A-5 al cerrar 01c (texto exacto)
`<K1b>` dejó marcas en `ARCHITECTURE.md` y la mitad de "Asíncrono" en ESSENTIALS. Para 01c:
1. **ESSENTIALS, "Reglas de negocio", viñeta "Entregas (RF-14, RF-15, RF-24, RF-44; ENTREGAS-01)":** al final, después de "Cuentan las entregas `entregado` y `calificado`.", agregar el texto del plan sin la marca de subentrega:
   "Hilo privado (RF-16; ENTREGAS-01): uno por alumno y tarea, entre el alumno y los maestros de la clase; el admin lo lee y no escribe; en esta fase sus comentarios no se borran ni se editan."
   - La última cláusula es S-04, aceptada por el humano el 2026-10-11, y es la misma frase que llevará RF-16. Si el orquestador prefiere el texto literal del plan, se omite esa cláusula.
   - Si se omite, también conviene cambiar la viñeta a "RF-14, RF-15, RF-16, RF-24, RF-44".
2. **ESSENTIALS, "Asíncrono y notificaciones", viñeta "Eventos":** al final, después de "…con un id nuevo por entrega (ENTREGAS-01).", agregar "`COMENTARIO_CREADO` sirve al muro y al hilo privado (ENTREGAS-01)."
3. **`ARCHITECTURE.md` §7, fila `tareas`:** reemplazar la marca "hilo privado (`…/entrega/comentarios` y `…/entregas/{alumnoId}/comentarios`): ENTREGAS-01c" por "`GET/POST …/entrega/comentarios` (hilo privado del alumno) · `GET/POST …/entregas/{alumnoId}/comentarios` (maestros de la clase; el admin solo lee) (ENTREGAS-01c)". Es el texto del plan, con la autoría de escritura explícita.
4. **`ARCHITECTURE.md` §8, fila `COMENTARIO_CREADO`:** reemplazar "Aviso a la contraparte" por el texto del plan: "Aviso a la contraparte: en el muro, al autor de la publicación; en el hilo privado, a los maestros de la clase si escribió el alumno, o al alumno si escribió un maestro".
   - Propongo sumar, con §D-5: "; el consumidor termina sin avisar si el comentario ya no existe (ENTREGAS-01)". Es opcional y no lo da el plan para §8.
5. **`PRD.md`, fila RF-16:** el texto del plan, añadido a la descripción de la tabla:
   "Hilo de comentarios privados con el maestro dentro de cada tarea. El Administrador lo lee y no escribe (ENTREGAS-01). En esta fase, los comentarios privados no se borran ni se editan (ENTREGAS-01)."

### Problemas que no bloquean
- **N-01 — `autorDelMuroSchema` no es estricto** (de mi verificación del resumen). Sin fuga: el autor sale de `firmaDelAutor`. Destino: nada en ENTREGAS. El encargo que endurezca los esquemas del muro, que lo incluya; no hace falta en `docs/ESTADO.md`.
- **N-02 — dos detalles de los READMEs del backend.**
  - La viñeta de `tareas/hilo-privado.ts` en `handlers/README.md` tiene dos líneas sin sangría que cortan la lista.
  - `adapters/README.md:411` dice "`entregas.ts` (3)" y ya son 4.
  - Destino: carril trivial, en el mismo cambio que R-17 (el comentario de `referencias.ts`) y O-r1-1 de 01a (`features/clases/data.ts:221`). Los tres son de texto, sin comportamiento, y ya están (o van) en `docs/ESTADO.md` §3.
  - Si el humano quiere el commit `<K1c>` limpio, el programador puede corregir los dos READMEs antes del commit, por carril trivial, sin otra ronda. No es necesario.

### Observación del tester, arbitrada
- **O-c1-1 — caracteres de dirección sin escapar dentro de cadenas de `entregas-01b-r1.ataque.test.ts`.** No tiene efecto: están dentro de literales de prueba, y la regla estática quita comentarios, no cadenas.
  - El repositorio ya tiene el mismo patrón en al menos 8 pruebas de encargos anteriores (`auth-registro`, `clases-r2`, `cuentas-03a-r1`, `invitacion-masiva-03c-r1`, `esquemas-tareas`, `esquemas-entregas`, `pie-r3` e `invitacion-r1`).
  - Destino: nada en 01d. Tocar una `*.ataque` fuera de un C-n exigiría autorización y movería su hash sin ganar nada.
  - Si el humano quiere una regla ("caracteres de dirección siempre escapados con `\u`"), va a un `chore` de higiene de pruebas que los reescriba todos a la vez, con su propio V-01.

### Medición del programador (01c)
- **Rondas del tester:** la ronda 0 no cuenta; la ronda 1 dio RESISTE con 0 hallazgos. Rondas extra: **0**; por hermanos: **0**.
- **PARADAS:** ninguna.
- **Resúmenes devueltos:** 0.
- **Lint:** la primera corrida cayó por el formato de `hilo-privado.ts`, y el programador lo formateó acotado a ese archivo (regla de formateadores por paquete). No es un hallazgo.

### Cierre del backend del encargo (01a a 01c)
- **Rutas:** las 12 rutas nuevas (8 de entregas y 4 del hilo), más el `PUT` con `version` y el `DELETE` con `?confirmar=entregas`. Todas con su cadena y con pruebas de autorización por ruta.
- **Esquema:** la migración única de 01a, sin cambios después.
- **Medición del programador en todo el backend:**
  - en 01a, 0 rondas extra;
  - en 01b, 1 ronda extra, sin relación con hermanos;
  - en 01c, 0 rondas extra;
  - ninguna ronda extra por hermanos en todo el backend, y 0 resúmenes devueltos;
  - una sola PARADA, la de 01a, que era un hueco del plan (Enmienda 4).
- **Pendientes del backend que quedan en `docs/ESTADO.md` §3:**
  - DEPLOY: R-10 y N-02 del plan (backend y frontend juntos; no revertir el backend con entregas en la base) y R-07 / O-1 de 01b (pendientes sin tope hasta `LIMPIEZA_DIARIA`);
  - CALIFICACIONES: §D-11;
  - NOTIFICACIONES: los descartes de §D-5, ahora también los de `COMENTARIO_CREADO` del hilo;
  - ADMIN: O-2 de 01b (cambio de rol e inscripciones);
  - trivial: R-17 y N-02.

### Para 01d (frontend del alumno; lo verifica el orquestador antes de la ronda 0 de 01d)
- **Ronda 0 del tester (§D-R0 "01d y 01e"):** las listas cerradas estáticas de las `*.ataque` de TAREAS-01 suman los archivos nuevos que entren en ellas:
  - V-06: componentes con `enEspera`;
  - V-07: `vidrio-fuerte`;
  - los llamadores de `perspectivaDeRuta`: debe seguir habiendo un solo lugar en `features/tareas/hooks.ts`.
- **C-5:** `tareas-01d-r1:493` pasa a exigir que todo `target="_blank"` de `features/tareas` lleve `rel="noopener noreferrer"` en el mismo elemento y viva solo en `components/lista-de-enlaces.tsx`.
- **R-04:** `components/adjuntos/` solo suma (los ganchos `…En(ruta)` y la prop opcional `rutaDeArchivos`). Si `refactor-01c-r1.ataque` o `reexportaciones-01c.test.ts` fallan, es PARADA, no C-n.
- **`DESIGN.md` en 01d:** §7.7 (la fila "Venció el …" reemplazada por el estado de la entrega con `estadoDeEntregaVisible`) y lo nuevo de "Tu trabajo" e hilo, con la marca "propuesta (ENTREGAS-01d)". La regla de "todo patrón visual nuevo documentado en el mismo encargo" la verifico en la revisión final de 01d.
- **Arrastres de 01a y 01b que tocan el frontend:**
  - **N-02 de 01a:** "Cómo se entrega" y "Entregas después de la fecha límite" a 360 px, en la comprobación humana (H-2), sin pasar de 7 puntos.
  - **Enlaces largos de 01b (T-01):** los enlaces llegan normalizados y de hasta 2048 caracteres, y `lista-de-enlaces.tsx` debe cortarlos visualmente (`break-all` o `truncate` con título), sin desbordar a 360 px. Es un punto de ataque de 01d.
  - **O-r1-2 (decisión del humano, recomendada para 01e) y N-03 de 01a (`if (version === null) return`):** van con 01e, que toca la vista de edición.

## Verificación de la Enmienda 5 — ENTREGAS-01
Veredicto: **APROBADO**. El programador puede reanudar 01d.
Verificación propia: `git diff --no-index` de la copia previa (`ffc6fdd1…f3d3`) contra `plan.md` actual (SHA-256 `35d80036f801b9d382da71c3769b372b6e0f62cb4d8319efc80b253b9283e2a5`). Además corrí la suite del frontend sobre el árbol actual (`npx vitest run`, sin ninguna otra suite a la vez), que es `ec1c4b3` con los pasos 1 a 4 de 01d en código y las reescrituras C-5 y C-11 del tester.

1. **Solo cambió lo listado.** Son cuatro hunks:
   - el estado ("Enmiendas 1 a 5");
   - una frase al final de la viñeta "01d y 01e" de §D-R0;
   - la viñeta nueva de la lista cerrada, con sus tres pruebas y la nota de "Revisadas y sin cambio" y de riesgos del tester;
   - la sección "## Enmienda 5".
2. **Cada cambio es el mínimo que §D-9 obliga, sin abrir la puerta a más.**
   - **`trabajo-view.test.tsx:361`:** una sola aserción, `/Venció el /` → `/Sin entregar/`, que es lo que manda §D-9.8 (S-07, PR-1D12). Las demás filas y perspectivas quedan explícitamente fuera.
   - **`detalle-tarea-view.test.tsx`:**
     - `stubApi` solo responde las dos lecturas nuevas, con dobles válidos de los esquemas de 01b y 01c;
     - en PR-1D05 del estudiante, el texto de TAREAS-01 pasa a `findByRole("button", { name: "Entregar tarea" })`, que es el reemplazo de §D-9;
     - el encabezado puede esperarse con `findByRole` y el mismo nombre;
     - `:176` (vencimiento en "Detalles") queda expresamente sin cambio.
   - **`router.test.tsx` › PR-1D07:** las mismas dos lecturas en `stubDeLaClase`, y el encabezado con `findByRole`.
   - **Regla general:** "cualquier otra aserción cambiada es PARADA". Nada permite debilitar ni quitar aserciones.
3. **No queda otra prueba normal fuera de la lista.**
   - **Mi grep:** busqué "Venció el", "Sin entregar", "Tu trabajo", "Todavía no puedes entregar", `FilaDeEntrega`, `entrega: null`, `/entrega`, `TuTrabajo`, `DetalleTareaView`, `TrabajoView`, `SeccionDeTema`, `AdjuntosDePublicacion`, los ganchos de adjuntos, `segundaLineaDeLaFila` y `estadoDeEntregaVisible` en las pruebas normales de `frontend/src`. Solo salen:
     - `trabajo-view.test`, `detalle-tarea-view.test` y `router.test`, que están en la lista;
     - `tarjeta-de-tarea.test`, `vencimiento.test`, `adjuntos-de-publicacion.test` y `reexportaciones-01c.test`, que están en "Revisadas y sin cambio".
   - **Mi corrida sobre el árbol actual:** `Test Files  2 failed | 151 passed (153)` · `Tests  2 failed | 2269 passed (2271)`. Las dos que caen son exactamente las de la lista:
     - `trabajo-view.test.tsx:361:26` (`/Venció el /`);
     - `detalle-tarea-view.test.tsx:136:14` ("Todavía no puedes entregar…").
   - `router.test.tsx` › PR-1D07 hoy pasa. Su permiso es "puede", no "debe", y quedará en rojo o en verde según cómo responda el doble a las lecturas nuevas cuando `TuTrabajo` las pida. Está cubierto.
4. **Las dos `*.ataque` de riesgo: el código actual las respeta, y las dos pasan en mi corrida.**
   - **`reloj-01e-r4.ataque:26`:** monta `FilaDeEntrega` sin `entrega`. La prop es opcional (`entrega?: … | undefined`, `fila-de-entrega.tsx:16`), y `segundaLineaDeLaFila` devuelve el vencimiento de siempre cuando `entrega === undefined` (`features/clases/lib.ts:496`). Es la condición que fijó el tester.
   - **`tareas-01d-r1.ataque:359`:** `getByText("Tu trabajo")` justo después del `h2`. `TuTrabajo` pinta el encabezado siempre, también al cargar y en error (`tu-trabajo.tsx`, comentario de la línea 24 y el `h3` de la línea 94).
   - Mientras el programador conserve esas dos condiciones, no serán PA-02 del tester.

**Observaciones (no bloquean):**
- **O-1 — conteo de rojos que verá el programador al reanudar.** Lo esperado son estas dos rojas, que corrige con los cambios permitidos. PR-1D07 de `router.test.tsx` solo cambia si cae al conectar las lecturas. El conteo final de 01d lo contrasto en la verificación de su resumen.
- **O-2 — línea 3 del encabezado de `plan.md`.** El resumen de enmiendas todavía nombra solo las Enmiendas 1 a 3, aunque el estado de la línea 2 dice "1 a 5". Es el mismo detalle de la Enmienda 4; no es un cambio de contenido.

## Verificación del resumen — ENTREGAS-01d — implementación
Veredicto: **ACEPTADO**. El tester puede atacar la ronda 1 de 01d.

### Mis corridas
Una suite a la vez; el backend no cambia en 01d.

| Paso | Mi corrida | Resumen | Coincide |
|---|---|---|---|
| `shared` build | código 0 | ídem | sí |
| `frontend` lint | código 0, `> tsc -b` | ídem | sí |
| `frontend` test (19:01:21Z a 19:03:14Z) | `Test Files  158 passed (158)` · `Tests  2319 passed (2319)` · `Duration  109.59s` | 158 · 2319 | sí |
| `frontend` build | código 0, `✓ built in 733ms` | `✓ built in 758ms` | sí |
| `npx vitest list --json` | 2319 en 158 | ídem | sí |
| `backend` y `shared` sin cambios | `git diff ec1c4b3 --stat -- backend shared` vacío y `git status` sin cambios en `backend` ni en `shared` | ídem | sí |

- **V-01: 169/169** iguales a la tabla de la ronda 0 de 01d, con C-5 y C-11. Ninguna `*.ataque` cambió desde entonces.
- **"No se toca": vacío.**
  - **Dentro, contra `ec1c4b3`:** `services`, `app`, `components/ui`, `components/layout`, `components/clase`, `mensaje-error`, `cargando`, `estado-vacio`, `lib/vencimiento.ts`, `lib/format.ts`, `lib/ruta-de-clase.ts`, `lib/errores-de-api.ts`, `vitest.config.ts`, `features/auth`, `features/admin`, `features/diagnostico`, el `package.json`, `ARCHITECTURE*` y `PRD.md`. En `styles/` solo cambió `clases-r1.ataque.test.ts`, la reescritura C-11 del tester.
  - **Fuera, contra `dd8edcb`:** `AGENTS.md`, `CLAUDE.md`, `.claude`, `infra` y los `package*.json`.
  - **`features/clases`:** solo `fila-de-entrega.tsx`, `seccion-de-tema.tsx`, `data.ts`, `lib.ts` y `types.ts` (todos en A-3, incluido `lib.ts`), más `trabajo-view.test.tsx` (Enmienda 5) y la prueba nueva.
  - **`components/adjuntos/`:** solo agregados (R-04). `useSolicitarSubida(claseId)` y `useUrlDeDescarga(claseId)` son envoltorios con la misma petición, y `refactor-01c-r1.ataque` y `reexportaciones-01c.test.ts` siguen en verde.

### Verificaciones pedidas
1. **Tabla PR-1D01 a PR-1D14: completa.**
   - Los 38 títulos citados aparecen en mi `vitest list`. Los tres parametrizados se expanden a títulos distintos: PR-1D02, 5 filas; PR-1D07, 3 códigos más el de `ENTREGA_VACIA`; PR-1D12, 5 filas más 2.
   - El reloj está fijo con `vi.useFakeTimers({ toFake: ["Date"] })` en `entregas-01d.test.tsx` y en `fila-de-entrega-01d.test.tsx`. Las puras reciben `ahora`.
2. **Pruebas normales cambiadas: solo las de la lista cerrada (01d y Enmienda 5), con el cambio mínimo.**
   - `trabajo-view.test.tsx:361` pasa a `/Sin entregar/`.
   - En `detalle-tarea-view.test.tsx`, `stubApi` responde las dos lecturas; el encabezado y "Entregar tarea" pasan a `findByRole`.
   - `router.test.tsx` no cambió.
3. **El código coincide con §D-9.**
   - **Estado de la entrega:**
     - `lib/estado-de-entrega.ts` devuelve los cinco estados y su frontera coincide con la de `vencimientoDe`;
     - `EstadoEntregaBadge` muestra texto, tono e icono por estado, nunca solo color, y cierra con `satisfies never`.
   - **Ganchos:**
     - `…En(ruta)` piden `${ruta}/archivos` y `${ruta}/archivos/:id/descarga`; `rutaDeArchivosDeLaClase` es `/api/clases/:claseId`;
     - `useMiEntrega`, `useEntregar`, `useAnularEntrega`, `useHiloPrivado` y `useComentarEnHilo` viven en `hooks.ts`, sin tipos propios;
     - los tipos se reexportan de `shared/` en `types.ts`;
     - los avisos viven en los ganchos; un `409` de la entrega avisa y vuelve a pedirla; `claveMiEntrega` cuelga de `claveTarea`.
   - **`TuTrabajo`:**
     - el `h3` se pinta en los tres estados;
     - lo que se muestra lo decide el servidor (`puedeEntregar` y `puedeAnular`); el cliente solo elige la frase y la nota de retraso;
     - el foco usa `useFocoAlPerderseElControl` con `claveDeFocoDeLaTarea`.
   - **`FormularioDeEntrega`:**
     - guarda `entregandoRef` en el submit, en "Adjuntar", en "Quitar" y en los enlaces, con `enEspera={enProceso || isPending}`;
     - sube con `subirArchivo` de `almacenService` (sin `Authorization`), dentro de su `try/catch/finally`;
     - una subida fallida da el aviso con el nombre del archivo;
     - la entrega vacía se marca como error de campo antes de pedir nada.
   - **`ListaDeEnlaces`:** es el único `target="_blank"` de `features/tareas`, con `rel="noopener noreferrer"`, el `sr-only` "(se abre en otra pestaña)" y `wrap-anywhere`.
   - **`HiloPrivado`:**
     - usa `FirmaDelAutor`;
     - "Ver más comentarios" usa `enEspera={hilo.isFetching}` y la guarda `pidiendoMasRef`;
     - enviar usa `enviandoRef` y devuelve el foco al campo;
     - el texto de privacidad lo pasa la vista.
   - **Fila de "Trabajo de clase":** `entrega` es opcional y, sin ella, la fila es la de siempre (§D-9.8).
   - **Lo que no hay:** ningún `fetch` fuera de `apiClient` y `almacenService`, ningún `disabled`, ningún `?? []` y ninguna importación entre módulos.
   - **Estilos:** no hay color, tamaño, radio ni sombra sueltos en los componentes nuevos.
   - **Textos:** coinciden con "Textos de la interfaz", salvo el aviso genérico "No pudimos subir tu entrega…", que no se usa (N-01).
4. **`DESIGN.md`:** seis marcas "propuesta (ENTREGAS-01d)". Están en §7.7, §7.8, §7.19, §7.20 y en las secciones nuevas §7.24 "Zona de entrega" y §7.25 "Hilo privado", así que el patrón nuevo quedó documentado en el mismo encargo.
5. **Hermanos y estados vecinos: coinciden con el código.**
   - El foco tras entregar, anular, `409`, subida fallida, quitar un enlace y "Ver más".
   - `enEspera` y la guarda con ref en cada acción.
   - El cierre y el retraso en cada estado.
   - Con y sin `requiereAdjuntos`.
   - La fila por perspectiva.
   - Dos casos declarados sin prueba propia usan mecanismos ya probados: el foco al quitar el último archivo elegido, y el foco cuando una recarga quita el botón enfocado. Van al tester (T-r1-1).
6. **Nada fuera del plan ni de más.**

### Problemas que bloquean
Ninguno.

### Problemas que no bloquean
- **N-01 — el aviso genérico "No pudimos subir tu entrega. Inténtalo de nuevo." no se usa.**
  - Una subida fallida avisa con `avisoDeFalloAlSubir`, que nombra el archivo. Eso es lo que piden PR-1D04 y `DESIGN.md` §7.19, y es más útil para el alumno.
  - Destino: nada. El texto del plan queda reemplazado por el patrón vigente del muro y de la tarea.
- **N-02 — los ids PR-1D01 a PR-1D14 de ENTREGAS chocan con los PR-1D de TAREAS-01d.** En `vitest list` conviven, por ejemplo, "PR-1D07: rutas de las tareas" y "PR-1D07: ENTREGA_YA_REALIZADA…".
  - Se distinguen por el título y por el archivo, y el plan los numeró así.
  - Destino: nada en este encargo. Para encargos futuros, que el arquitecto prefije los ids con el encargo.

### Para el tester, ronda 1 de 01d (además de los "Puntos de ataque" del plan)
- **T-r1-1 — el foco en los dos caminos sin prueba propia:**
  - quitar el último archivo elegido debe llevar el foco a "Adjuntar archivos";
  - una recarga de la entrega que quita el botón enfocado debe llevar el foco a la sección: "Anular entrega" cuando la tarea pasa a cerrada o calificada desde otra pestaña, o el formulario cuando llega una entrega hecha en otra pestaña.
  - En los dos, nunca `<body>`.
- **T-r1-2 — enlaces largos a 360 px:** uno de 2048 caracteres normalizados en `ListaDeEnlaces` y en la ficha del campo no desborda (`wrap-anywhere`), y el `sr-only` sigue dentro del enlace. Lo visual queda para H-1 y H-7; aquí, que las clases estén en el elemento correcto.
- **T-r1-3 — `subirArchivo` y el token:** cada `PUT` al almacén va sin `Authorization` ni credenciales, también en la segunda subida de una entrega con varios archivos y tras un `401` con refresco silencioso a medio camino.
- **T-r1-4 — `useEntregar` con `ENTREGA_VACIA` o un `VALIDACION` de enlaces:** sin `toast`, con el error bajo el grupo, y la entrega no se vuelve a pedir dos veces (un solo `GET` de la entrega después del error).
- **T-r1-5 — el hilo:**
  - "Ver más comentarios" durante un envío propio no duplica páginas;
  - un comentario enviado mientras la lista se recarga aparece una sola vez;
  - el texto de privacidad del alumno está siempre presente, también con el hilo vacío y tras un error de carga.

## Verificación del resumen — ENTREGAS-01d — corrección de la ronda 1 (T-01 a T-03)
Veredicto: **ACEPTADO**. El tester puede hacer la ronda 2 de 01d.

### Mis corridas
| Paso | Mi corrida | Resumen | Coincide |
|---|---|---|---|
| `shared` build | código 0 | ídem | sí |
| `frontend` lint | código 0 | ídem | sí |
| `frontend` test | `Test Files  160 passed (160)` · `Tests  2375 passed (2375)` · `Duration  122.22s` | 160 · 2375 | sí |
| `frontend` build | código 0 | ídem | sí |
| `npx vitest list --json` | 2375 en 160; 11 casos «Ronda 1 …» en `entregas-01d.test.tsx` | ídem | sí |
| `backend` y `shared` | `git diff ec1c4b3 --stat -- backend shared` vacío, sin archivos no versionados | ídem | sí |

- **V-01: 171/171** iguales a la tabla de la ronda 1 de 01d. Las 4 rojas del tester pasan dentro de la corrida completa.
- **"No se toca": vacío.** Mismas listas que en mi verificación de 01d.

### El diff de la corrección: solo los hallazgos y sus hermanos
Desde mi verificación anterior (19:00Z) solo cambiaron:
- `features/tareas/hooks.ts`;
- `components/campo-de-enlaces.tsx`;
- `components/hilo-privado.tsx`;
- `detalle-tarea-view.tsx`, que pasa `claseId` y `tareaId` a `HiloPrivado`;
- `entregas-01d.test.tsx`;
- `docs/DESIGN.md`, en §7.24;
- las dos `*.ataque` nuevas del tester.

### Juicio
- **La regla es única.** `renovarTrasErrorDeLaEntrega` reemplaza a `reaccionarAlErrorDeLaEntrega` y la usan los `onError` de `useEntregar`, `useAnularEntrega` y `useComentarEnHilo`. No hay gancho nuevo ni un segundo camino de renovación: lo que no es un `409` de la entrega sigue por `pedirDeNuevoLaTarea`, como antes.
- **Un `409` hace una petición de cada cosa y un solo aviso.**
  - Invalida `claveTarea` y `clavePrefijoDelTrabajo`. Como `claveMiEntrega` cuelga de `claveTarea`, la tarea y la entrega se piden una vez cada una (T-01) y "Trabajo de clase" queda marcado como viejo (T-02).
  - El hilo (`["hilo-privado", ruta]`) no cuelga de la tarea, así que no se vuelve a pedir.
  - El único aviso es el `toast.error` del `onError`; el `catch` del formulario no avisa.
- **`HiloPrivado`:** las dos props nuevas (`claseId` y `tareaId`) son obligatorias y el único llamador las pasa. `reexportaciones-01c.test.ts`, `refactor-01c-r1.ataque` y las `*.ataque` de 01d están en verde.
- **T-03:**
  - El error de enlaces que devuelve el servidor se pinta con `ErrorDeCampo`, con su propio id.
  - El `Input` lo nombra en `aria-describedby`, junto con el del cliente, y pone `aria-invalid` si hay cualquiera de los dos.
  - Es el mismo mecanismo de errores por campo del resto de los formularios.
- **Los hermanos, contrastados con el código:**

| Código | Entregar | Anular | Comentar | Qué renueva | Aviso | Foco |
|---|---|---|---|---|---|---|
| `ENTREGA_YA_REALIZADA`, `ENTREGA_NO_REALIZADA`, `ENTREGA_CALIFICADA`, `ENTREGA_CERRADA` | sí | sí | no aplica | tarea, entrega y "Trabajo de clase" | uno, con el mensaje del servidor | el gancho de la sección, si desaparece el control |
| `ENTREGA_VACIA` | sí | — | — | nada | ninguno: error del grupo | se queda |
| `VALIDACION` de enlaces o de texto | sí | — | sí | nada | ninguno: error de campo | se queda |
| `TAREA_NO_ENCONTRADA` | sí | sí | sí | `invalidarTrasCambiar`, por `pedirDeNuevoLaTarea` | uno | la raíz, por el reemplazo de la vista |
| `SIN_ACCESO_A_LA_CLASE` | sí | sí | sí | la tarea, por `pedirDeNuevoLaTarea` | uno | la raíz |
| `SERVICIO_OCUPADO` u otro error | sí | sí | sí | nada | uno | se queda |
| **Agregado:** `401` con refresco fallido, `403 ACCESO_RESTRINGIDO` o `403 CAMBIO_DE_CONTRASENA_REQUERIDO` | — | — | — | los redirige `apiClient`; ningún gancho renueva | posible aviso antes de navegar (patrón de todo el proyecto) | se va de la vista |
| **Agregado:** `ALUMNO_NO_ENCONTRADO` | no aplica en 01d: solo existe en las rutas de los maestros | | | lo decide 01e con su vista | | |

- `useEditarTarea` no cambió.

### Problemas que bloquean
Ninguno.

### Problemas que no bloquean
- **N-01 — un `409` que llega con una recarga de la tarea o de la entrega ya en vuelo.** `invalidateQueries` cancela la petición en vuelo y la vuelve a lanzar (`cancelRefetch` por defecto). Debe verse un solo `GET` completado por clave, pero no está probado. Va al tester (T-r2-1).

### Para el tester, ronda 2 de 01d
- **T-r2-1:** un `409 ENTREGA_CERRADA` mientras una recarga de la tarea (o de la entrega) está en vuelo, con respuesta diferida. Debe dar un solo aviso y, al final, la tarea, la entrega y "Trabajo de clase" con los datos de la última respuesta, sin un `GET` de más que termine después.
- **T-r2-2:** anular con `409 ENTREGA_CALIFICADA` desde la confirmación abierta. El foco no debe caer en `<body>` cuando la recarga quita "Sí, anular entrega".
- **T-r2-3:** T-03 con los dos errores a la vez (el del cliente y el del servidor). Los dos ids deben estar en `aria-describedby` y el del servidor debe limpiarse al editar los enlaces.
- **T-r2-4:** comentar con `SIN_ACCESO_A_LA_CLASE`. La tarea se renueva y la vista se reemplaza por el mensaje, con el foco en la raíz, sin un segundo aviso del hilo.

## Verificación del resumen — ENTREGAS-01d — corrección de la ronda 2 (T-04 y T-05)
Veredicto: **ACEPTADO**. El tester puede hacer la ronda 3 de 01d, la última dentro del tope.

### Mis corridas
| Paso | Mi corrida | Resumen | Coincide |
|---|---|---|---|
| `shared` build | código 0 | ídem | sí |
| `frontend` lint | código 0 | ídem | sí |
| `frontend` test | `Test Files  161 passed (161)` · `Tests  2408 passed (2408)` · `Duration  101.97s` | 161 · 2408 | sí |
| `frontend` build | código 0 | ídem | sí |
| `npx vitest list --json` | 2408 en 161; 10 casos «Ronda 2 …» en `entregas-01d.test.tsx` | ídem | sí |
| `backend` y `shared` | sin cambios contra `ec1c4b3` y sin archivos no versionados | ídem | sí |

- **V-01: 172/172** iguales a la tabla de la ronda 2 de 01d. Las `*.ataque` de la ronda 1 no cambiaron desde mi verificación anterior, y las 2 rojas del tester pasan.
- **"No se toca": vacío.** Fuera de lo que permite A-3 no cambia nada dentro de `components/` ni de `lib/`.

### El diff de la corrección: solo los hallazgos y sus hermanos
Cambiaron `campo-de-enlaces.tsx`, `formulario-de-entrega.tsx`, `hilo-privado.tsx`, `hooks.ts`, `lib.ts`, `data.ts`, `entregas-01d.test.tsx` y `DESIGN.md` (§7.24 y §7.25, con la marca de la ronda 2). Nada más, aparte de la `*.ataque` nueva del tester.

### Juicio
- **T-04 (un mensaje por campo):**
  - El error de enlaces del servidor se descarta al escribir, al intentar agregar y al quitar.
  - Si el error local y el del servidor dicen lo mismo, sale una sola vez y `aria-describedby` no repite ids.
  - El hermano del texto del hilo usa el mismo patrón: estado propio y un solo `ErrorDeCampo`.
- **T-05 (un aviso por error), sin ganchos nuevos:**
  - **`avisarDelErrorDeLaEntrega` es una función, no un gancho.** Su `WeakMap` va por instancia de la consulta de la tarea, con `dataUpdatedAt`, el mismo mecanismo de `useAvisoDeRecargaFallida`.
    - No deja avisos huérfanos: guarda solo una marca por consulta, sin callbacks, y la entrada se va con la consulta.
    - Que los avisos de una mutación salgan aunque la vista ya no esté montada es el patrón T-30 de todo el módulo.
  - **`useHiloPrivado` solo amplía su firma.** Una página que falla pasa por `pedirDeNuevoLaTarea`, la regla T-11 de siempre.
  - **"Ver más comentarios" no avisa en tres casos:** si el hilo ya se desmontó (`montadoRef`), si el error reemplaza la vista o si `apiClient` ya redirigió.
- **`errorQueRedirigeElCliente`:**
  - Es una función pura en `lib.ts`, no un gancho.
  - `CODIGOS_QUE_REDIRIGE_EL_CLIENTE` (`ACCESO_RESTRINGIDO`, `CAMBIO_DE_CONTRASENA_REQUERIDO` y `NO_AUTENTICADO`) repite lo que `apiClient` sabe. `apiClient` no exporta esa lista, y `services/` y `lib/errores-de-api.ts` están en "No se toca", así que el lugar es correcto para este encargo (N-01).
  - No contradice a `apiClient`: son exactamente los tres casos en que navega.

### Hermanos, contrastados con el código
**Campos con error del servidor (T-04):**

| Campo | ¿Se duplica el mensaje? | Comprobado |
|---|---|---|
| Enlaces (01d) | ya no: se descarta y se deduplica | `campo-de-enlaces.tsx` y `formulario-de-entrega.tsx` |
| Archivos elegidos | no: solo hay error local; los errores del servidor sobre archivos son avisos | sí |
| `ENTREGA_VACIA` | no: un solo booleano para el cliente y el servidor | sí |
| Texto del hilo | ya no: estado propio y un solo `ErrorDeCampo` | `hilo-privado.tsx` |
| Campos del formulario de tarea (01a), incluido "Cómo se entrega" | no: un solo mapa `errores` por campo; el local reemplaza al del servidor | sí |

En 01a, que el error del servidor siga a la vista hasta el siguiente envío no da dos mensajes. Descartarlo al editar sería un cambio de TAREAS, fuera de esta ronda.

**Disparadores de aviso en la vista del alumno (T-05):**

| Disparador | Reemplaza la vista (404, 403 de la clase) | Redirige (401, `ACCESO_RESTRINGIDO`, `CAMBIO_DE_CONTRASENA_REQUERIDO`) | 409 de la entrega | 5xx o red | Desmontado |
|---|---|---|---|---|---|
| Entregar | un aviso por tarea perdida (deduplicado) y renueva | aviso posible antes de navegar (patrón del proyecto) | un aviso y renueva tarea, entrega y trabajo | un aviso | avisa (T-30) |
| Anular | igual | igual | igual | un aviso | avisa |
| Comentar | igual | igual | no aplica | un aviso | avisa |
| "Ver más comentarios" | sin aviso; renueva la tarea | sin aviso | no aplica | un aviso si está montado | sin aviso |
| Consulta de la tarea | la vista se reemplaza sin aviso, como desde TAREAS-01 | redirige | — | aviso de recarga fallida, una vez por fallo | — |
| Consulta de la entrega | `MensajeError` en "Tu trabajo" si no hay datos; con datos, deja ver la última; no avisa | redirige | — | igual: no avisa | — |
| Consulta del hilo (primera página o recarga) | `MensajeError` en el hilo y renueva la tarea | redirige | — | `MensajeError` sin aviso | — |

- **La consulta de la entrega no renueva la tarea ante un 404** (no aplica, como dice el resumen). Lo comprobé contra la configuración: `staleTime: 30_000` y `refetchOnWindowFocus: false` (`app/providers.tsx`). La entrega cuelga de la clave de la tarea y se actualiza junto con ella (las dos recargas y las invalidaciones de la tarea las alcanzan). Solo se recarga sola cuando la tarea también lo hace, así que no hay un camino del alumno en que la entrega diga "no existe" con la tarea vieja en pantalla.
- **Dos acciones distintas que fallan con un error que no reemplaza la vista (por ejemplo, dos 503): dos avisos. Es correcto y lo arbitro ahora:** son dos fallas de dos acciones de la persona (entregar y comentar), y cada una debe decirse. T-05 era un solo hecho (la tarea ya no existe) contado dos veces. El tester no debe reportarlo como hallazgo en la ronda 3.

### Problemas que bloquean
Ninguno.

### Problemas que no bloquean
- **N-01 — `CODIGOS_QUE_REDIRIGE_EL_CLIENTE` repite en `features/tareas/data.ts` lo que `apiClient` decide.** Destino: nada en ENTREGAS. Si otro módulo lo necesita, que el encargo que pueda tocar `services/` exporte la lista desde `apiClient`.
- **N-02 — con dos 404 a la vez (un comentario y "Ver más"), `pedirDeNuevoLaTarea` corre dos veces.** La segunda invalidación cancela la primera recarga y lanza otra, así que debe completarse un solo `GET` de la tarea. Va al tester (T-r3-2).

### Para el tester, ronda 3 de 01d (la última; lo arbitrado arriba no es hallazgo)
- **T-r3-1 — la deduplicación del aviso entre tareas distintas.** Una tarea perdida avisa una vez. Si la persona abre otra tarea que también se borra, debe avisar otra vez (es otra consulta). Si la misma tarea se vuelve a cargar con éxito y luego se pierde, también avisa otra vez (otro `dataUpdatedAt`).
- **T-r3-2 — N-02:** comentar y "Ver más comentarios" con 404 a la vez. Debe completarse un solo `GET` de la tarea, sin un segundo que termine después, y salir un solo aviso.
- **T-r3-3 — T-04 tras un segundo envío.** El servidor rechaza el enlace 1, el alumno lo corrige y el servidor rechaza el 2. Debe quedar un solo mensaje, el del 2, con `aria-describedby` correcto. Lo mismo con el texto del hilo.
- **T-r3-4 — "Ver más comentarios" con `NO_AUTENTICADO` después de un refresco fallido.** Sin aviso y con navegación al login. Y con `SERVICIO_OCUPADO` justo antes de desmontar: sin aviso.

## Revisión final — ENTREGAS-01d
Veredicto: **APROBADO CON OBSERVACIONES**. Nada bloquea el commit `<K1d>`.
Verificación propia: lint, test y build en verde; cifras abajo.

### Corrida propia
| Paso | Mi corrida | Tester (ronda 3) |
|---|---|---|
| `shared` build | código 0 | — |
| `frontend` lint | código 0, `> tsc -b` | código 0 |
| `frontend` test | `Test Files  162 passed (162)` · `Tests  2425 passed (2425)` · `Duration  103.31s` | 2425 casos |
| `frontend` build | código 0 | — |
| `npx vitest list --json` | **2425 en 162** | 2425 |
| `backend` y `shared` | sin cambios contra `ec1c4b3` y sin archivos no versionados | — |

- **El conteo de archivos es 162, no 161:** 161 de la corrección de la ronda 2 más `entregas-01d-r3.ataque`.
- **Desde mi verificación de la ronda 2** (`find -newer` sobre `frontend/src` y `DESIGN.md`) solo cambió la `*.ataque` nueva del tester. El código es el que ya verifiqué en el resumen y en las dos correcciones.
- **El diff contra `ec1c4b3`:** 25 archivos versionados más los nuevos de 01d. Mi lectura contra §D-9 sigue vigente. Nada fuera ni de más.

### Regresión y "No se toca"
- **V-01: 173/173** iguales a la tabla de la ronda 3.
  - Contra `ec1c4b3` hay 4 `*.ataque` nuevas (`fila-01d-r1` y `entregas-01d-r1` a `-r3`) y exactamente 2 modificadas: C-5 (`tareas-01d-r1`) y C-11 (`styles/clases-r1`).
  - Ninguna borrada, y no hay `.skip`, `.only` ni `.todo`.
- **"No se toca": vacío.**
  - Dentro, contra `ec1c4b3`: `services`, `app`, `components/ui`, `components/layout`, `components/clase`, `mensaje-error`, `cargando`, `estado-vacio`, `lib/vencimiento.ts`, `lib/format.ts`, `lib/ruta-de-clase.ts`, `lib/errores-de-api.ts`, `vitest.config.ts`, `features/auth`, `features/admin`, `features/diagnostico`, el `package.json`, `ARCHITECTURE*` y `PRD.md`.
  - Fuera, contra `dd8edcb`: `AGENTS.md`, `CLAUDE.md`, `.claude`, `infra` y los `package*.json`.
  - `features/clases` solo cambia lo de A-3 (más su prueba y la de la Enmienda 5). `components/adjuntos/` solo suma.

### Definición de terminado (01d)
- [x] **Requisitos:**
  - RF-14: ver la entrega, entregar y anular desde "Tu trabajo".
  - RF-15 y RF-44: retraso, cierre y reapertura, con la frase y la nota.
  - RF-16 del lado del alumno: el hilo con su texto de privacidad.
  - RF-24: "Marcar como completada".
  - S-07: el estado del alumno en "Trabajo de clase".
- [x] **Reglas técnicas:**
  - estructura de módulos: tipos inferidos de `shared/`, ganchos en `hooks.ts`, textos en `data.ts`;
  - sin `fetch` fuera de `apiClient` y `almacenService`;
  - `enEspera` con guarda de ref, sin `disabled`;
  - el estado siempre con texto e icono;
  - tokens solamente.
- [x] **lint, build y test:** en verde.
- [x] **Sin migración ni endpoints nuevos:** los de 01b y 01c ya tienen sus pruebas de autorización.
- [x] **`DESIGN.md`:** §7.7, §7.8, §7.19, §7.20, §7.24 y §7.25 con "propuesta (ENTREGAS-01d)" (las de las rondas 1 y 2 también). La zona de entrega y el hilo, que son patrones nuevos, quedaron documentados en este encargo.
- [ ] **Documentos de A-5:** los aplica el orquestador; abajo va la decisión.

### Problemas que bloquean
Ninguno.

### A-5 al cerrar 01d: qué se aplica ahora (`CLAUDE.md`)
El plan dice "al cerrar 01d y 01e". Se aplica ahora lo que 01d deja terminado en el código, y la fila del módulo `tareas` va al cerrar 01e, porque su texto describe la vista del maestro y el borrado con entregas de 01e. Textos exactos, los del plan:
1. **"Ubicaciones compartidas", viñeta `components/`:** reemplazar "`EstadoEntregaBadge` llega con ENTREGAS" por "`EstadoEntregaBadge` (`estado-entrega-badge.tsx`, ENTREGAS-01)".
2. **Viñeta nueva, después de la de `lib/vencimiento.ts`:** "`lib/estado-de-entrega.ts` — el estado visible de una entrega (`estadoDeEntregaVisible`: asignado, sin entregar, entregado, con retraso o calificado), compartido por `features/clases` y `features/tareas`". Comprobado: lo importan `features/clases/lib.ts`, `features/tareas/components/tu-trabajo.tsx` y `components/estado-entrega-badge.tsx`.
3. **Viñeta `components/adjuntos/`:** agregar al final "; los ganchos `useSolicitarSubidaEn` y `useUrlDeDescargaEn` reciben la ruta de archivos (la de la clase o la de una entrega) y `AdjuntosDePublicacion` acepta `rutaDeArchivos`".
4. **Viñeta `components/clase/`:** agregar "y el texto 'Sin tema' (`TEXTOS_DE_LA_CLASE.sinTema`)". El texto existe desde 01a, y es el lugar del plan.
- **Al cerrar 01e:** la fila `tareas` de la tabla de módulos, con el texto del plan.

### Observaciones del tester, arbitradas
- **O-1d3-1 — con dos 404 a la vez salen dos `GET` de la tarea, porque `consultaTarea` no pasa `signal`.** No es un defecto de 01d: solo se aplica una respuesta, no hay aviso ni estado incorrecto, y el costo es una petición de más en un caso raro. `services/trabajoService.ts` está en "No se toca".
  - Destino: `docs/ESTADO.md` §3, para el encargo que toque `services/` (o un chore): pasar el `signal` de TanStack Query a todas las consultas de `services/*` para que una invalidación cancele la petición en vuelo de verdad.
- **O-1d3-2 — con la sesión perdida (`NO_AUTENTICADO` tras un refresco fallido), una mutación avisa "Algo salió mal" y además redirige.**
  - Es el patrón heredado de todo el proyecto: `useEditarTarea` y las mutaciones del muro hacen lo mismo. `irA` navega con `window.location.assign`, así que el aviso se pierde en la recarga y casi no se ve.
  - En 01d, "Ver más comentarios" ya no avisa con estos códigos (T-05). Extenderlo a las mutaciones sería un cambio transversal de los avisos de todos los módulos.
  - Destino: `docs/ESTADO.md` §3, junto a R-3 de CHORE-02 (`pedirRefresco`): un chore de `apiClient` y de los avisos que decida en un solo lugar no avisar cuando el cliente ya redirige (por ejemplo, que `mensajeDe…` o un helper compartido en `lib/errores-de-api.ts` ignore esos códigos).
  - No es M de 01d.

### Problemas que no bloquean (de las verificaciones de 01d, con destino)
- **N-01 de la ronda 2:** `CODIGOS_QUE_REDIRIGE_EL_CLIENTE` está copiado de `apiClient`. Va en el mismo chore que O-1d3-2.
- **N-01 y N-02 del resumen de 01d:** el aviso genérico de subida no se usa, y los ids PR-1D chocan con los de TAREAS-01d. Destino: nada.

### Medición del programador (01d)
- **Rondas del tester:**
  - ronda 1, ROTO con 3 hallazgos propios (T-01 a T-03);
  - ronda 2, ROTO con 2 hallazgos (T-04 y T-05), vecinos de los remedios de la ronda 1;
  - ronda 3, RESISTE.
- **Rondas extra:** 2. **Por hermanos o estados vecinos: 1,** la ronda 2.
- **PARADAS:** una (la Enmienda 5), correcta.
- **Interrupciones:** una, por un error de red de la API, retomada desde el árbol sin rehacer nada.
- **Resúmenes devueltos:** 0 de 3.
- **El umbral no se alcanza:** la regla de `AGENTS.md` pide 2 o más rondas extra por hermanos en una subentrega, y el `programador` ya está en `opus`.
- **Recomendación para 01e:**
  - En el primer resumen de 01e, el programador entrega la matriz de avisos y recargas de cada vista nueva: disparador (cada mutación y cada consulta) × clase de error (reemplaza la vista, redirige, 409, 5xx o red) × "en vuelo a la vez" × "desmontado". Así se adelanta lo que en 01d llegó en la ronda 2.
  - Reutiliza `renovarTrasErrorDeLaEntrega`, `avisarDelErrorDeLaEntrega` y `useHiloPrivado` en lugar de crear caminos nuevos.
  - El orquestador puede pedirlo al lanzarlo; no hace falta una enmienda.

### Para 01e (lo verifica el orquestador antes de la ronda 0 de 01e)
- **Ronda 0:** las listas cerradas estáticas V-06 (`enEspera`), V-07 (`vidrio-fuerte`) y los llamadores de `perspectivaDeRuta` suman los archivos de 01e (`entregas-view`, `entrega-de-alumno-view`, `panel-de-entregas`, `tabla-de-entregas`, `acciones-de-la-tarea`). El conteo de C-11 cambia con los `enEspera=` nuevos.
- **"Ver más alumnos":** `enEspera={isFetching}` y guarda de ref (`CLAUDE.md`, "Componentes").
- **El hilo del maestro:** `HiloPrivado` con la ruta `…/entregas/:alumnoId/comentarios`. El admin lo ve sin formulario (`puedeEscribir` en falso), con "La administración puede leer este hilo, pero no escribir en él.", que hoy no se usa.
- **Hermano nuevo para 01e: `ALUMNO_NO_ENCONTRADO`.** En la entrega de un alumno, este `404` debe reemplazar la vista y deduplicar el aviso como `TAREA_NO_ENCONTRADA`. Hoy `errorQueReemplazaLaVista` no lo conoce: 01e debe decidir con qué mecanismo, sin un camino paralelo.
- **S-06:** PR-1E06 y PR-1E08 (el `409 TAREA_CON_ENTREGAS` del maestro y la segunda confirmación del admin), la guarda de "Cancelar" con el borrado en vuelo en los dos pasos (O-2 de la Enmienda 2) y N-02 de la Enmienda 2 ("Borrar con las entregas" se decide por la perspectiva).
- **Arrastres de 01a:**
  - O-r1-2: decisión del humano; recomendé esperar una lectura fresca al abrir "Editar".
  - N-03: `if (version === null) return` en `editar-tarea-view.tsx`.
- **Comprobación humana única al final de 01e:** H-1 a H-7, con estos arrastres dentro de los mismos 7 puntos:
  - H-2 a 360 px, para "Cómo se entrega" y "Entregas después de la fecha límite";
  - H-1 o H-7 con un enlace largo en `ListaDeEnlaces` a 360 px.

## Verificación del resumen — ENTREGAS-01e — implementación
Veredicto: **ACEPTADO**. El tester puede atacar la ronda 1 de 01e.

### Mis corridas
Una a la vez; no corrí el backend porque no cambia.

| Paso | Mi corrida | Resumen | Coincide |
|---|---|---|---|
| `shared` build | código 0 | ídem | sí |
| `frontend` lint | código 0, `> tsc -b` | ídem | sí |
| `frontend` test | `Test Files  164 passed (164)` · `Tests  2458 passed (2458)` · `Duration  104.71s` | 164 · 2458 | sí |
| `frontend` build | código 0 | ídem | sí |
| raíz `npm run lint` y `npm run build` | código 0 y código 0 (`✓ built in 696ms`) | ídem | sí |
| `npx vitest list --json` | 2458 en 164 | ídem | sí |
| `backend` y `shared` | `git diff d6794d6 --stat -- backend shared` vacío, sin archivos no versionados | ídem | sí |

- **V-01: 173/173** iguales a la tabla de la ronda 0 de 01e. Las 2 modificadas son las reescrituras del tester: C-13 (`entregas-01d-r3`) y C-12 (`styles/clases-r1`).
- **"No se toca": vacío.**
  - Dentro, contra `d6794d6`: `services`, `app/providers.tsx`, `styles/tokens.css` e `index.css`, `components/`, `lib/`, `vitest.config.ts`, `features/auth`, `features/admin`, `features/diagnostico` y `features/clases`, el `package.json` y `.env.example`.
  - En `app/` solo cambian `router.tsx` (A-3) y la prueba nueva.
  - Fuera, contra `dd8edcb`: `AGENTS.md`, `.claude`, `infra` y los `package*.json`, vacíos.
  - `CLAUDE.md` (`38099010…67ee`), ESSENTIALS (`b9c37b8b…0ec0`), `ARCHITECTURE.md` (`ba1c9113…3faf`) y `PRD.md` (`fedeb259…8e52`) coinciden con sus SHA-256 de `aprobacion.md`, y no cambian contra `d6794d6`.

### Verificaciones pedidas
1. **Tabla PR-1E01 a PR-1E08: completa.**
   - Los 32 títulos citados aparecen en mi `vitest list`. "PR-1E05: rutas de las entregas" es el `describe`, no un caso.
   - PR-1E05 cubre las dos rutas en maestro y en admin, y para el alumno, `*` sin pedir entregas.
   - PR-1E06 y PR-1E08 (a) a (g) cubren S-06 modificada: maestro y admin, con y sin entregas, doble clic, "Cancelar" en vuelo en los dos pasos, `409` seguido de `404`, `409` seguido de `500`, y `puedeBorrar` que se pierde.
   - El reloj está fijo. En PR-1E08 (g) se adelanta 1 s, el mismo artefacto de `dataUpdatedAt` que ya arbitré en 01a.
2. **El código coincide con §D-10.**
   - **Panel "Entregas":** solo un `Link`, sin peticiones.
   - **Vista "Entregas":**
     - `h2` con `tabIndex={-1}`;
     - el conteo con `conteoDeEntregas`, en singular o plural;
     - la `Table` opaca dentro del `Card`, sin `vidrio` ni `data-material`;
     - `EstadoEntregaBadge`;
     - "Ver entrega" con el nombre del alumno en `sr-only`;
     - los estados en orden error → cargando → vacío → datos;
     - "Ver más alumnos" con `enEspera={isFetching}`, guarda `pidiendoMasRef` y `montadoRef`;
     - el `400` del cursor con su texto, sin aviso.
   - **Entrega de un alumno:**
     - las frases de §D-10;
     - `AdjuntosDePublicacion` con la ruta `…/entregas/:alumnoId`;
     - `ListaDeEnlaces`;
     - `HiloPrivado` con `puedeEscribir` solo para el maestro, los textos de privacidad y la nota del admin;
     - `404 ALUMNO_NO_ENCONTRADO` y `TAREA_NO_ENCONTRADA` con sus mensajes.
   - **§D-10.5:**
     - el `409 TAREA_CON_ENTREGAS` sale por `useBorrarTarea.onError` (retorno temprano antes del aviso, sin camino nuevo) y el segundo paso va en `role="alert"`;
     - "Borrar con las entregas" solo con `puedeConfirmarEntregas` (la perspectiva del admin, N-02 de la Enmienda 2) y `?confirmar=entregas`;
     - `borrandoRef` lo comparten los dos botones;
     - "Cancelar" no cierra con el borrado en vuelo.
   - **Router:** las dos rutas en las ramas de maestro y admin.
   - **`DESIGN.md`:** §7.20, §7.26 nueva y §8, con cinco marcas "propuesta (ENTREGAS-01e)".
   - **Lo que no hay:** valores de estilo sueltos, `disabled`, `?? []`, `fetch` e importaciones entre módulos.
3. **La matriz de avisos y recargas coincide con el código.**
   - Reutiliza los mecanismos de 01d: `errorQueReemplazaLaVista`, `errorQueRedirigeElCliente`, `avisarDelErrorDeLaEntrega`, `useAvisoDeRecargaFallida`, `useFocoAlPerderseElControl` y `montadoRef`. Ningún gancho de aviso ni de foco es nuevo.
   - En "Ver más alumnos", el `if` descarta el aviso en este orden: desmontado, cursor, reemplazo de la vista y redirección.
4. **Las 9 condiciones del tester se cumplen en el código.**
   - `enEspera=` por archivo: `acciones-de-la-tarea` 2, `entregas-view` 1 y 0 en los otros tres; V-06 pasa con 55.
   - Ningún `perspectivaDeRuta(` nuevo y ningún `vidrio` ni `data-material` en los archivos nuevos.
   - `.puedeBorrar` aparece solo en `acciones-de-la-tarea`.
   - Los componentes de 01d se usan con la misma firma, y el panel no hace peticiones.
   - Ninguna importación entre módulos, `fixed` ni `animate-`.
   - `renovarTrasErrorDeLaEntrega(` sigue con 3 llamadas.
5. **RN-02:** ningún archivo nuevo menciona `estadoPago` ni `accesoRestringido`, y no hay valores por defecto de `estadoPago` ni de `rol`. El doble de prueba con `estadoPago` lo rechaza el esquema estricto (PR-1E07).
6. **Nada fuera ni de más.** De las pruebas normales solo cambian `detalle-tarea-view.test.tsx:225` y `:232`, en la lista cerrada.

### `ALUMNO_NO_ENCONTRADO`: la rama propia es la forma correcta, no un camino paralelo
- **Por qué no es un camino paralelo:** vive dentro de la misma función de renovación (`pedirDeNuevoLaTarea`), que es el único punto de entrada de todos los ganchos. Invalida `clavePrefijoDeEntregas`, que cuelga de `claveTarea`.
- **Por qué hace falta que sea propia:** renovar la tarea no reemplazaría la vista del alumno, porque la tarea sigue existiendo. Lo que hay que volver a pedir es la entrega de ese alumno, que responde su `404`.
- **Por qué no entra en `CODIGOS_QUE_RENUEVAN_LA_TAREA`:** esa lista no cambia por la Enmienda 2 y la usa `useEditarTarea`.
- **Lo que comparte con `TAREA_NO_ENCONTRADA`:** el reemplazo de la vista (`CODIGOS_QUE_REEMPLAZAN_LA_VISTA`) y el aviso único (`avisarDelErrorDeLaEntrega`).
- **Se acepta.** Solo el nombre `pedirDeNuevoLaTarea` queda corto (N-01).

### Hoja de comprobación humana (propuesta final para el orquestador; 7 puntos, unos 10 minutos)
La del programador cumple: son 7 puntos, solo lo que las pruebas no ven, y con los arrastres dentro. La dejo así, con dos precisiones para que quepa en 10 minutos:
- **H-1** (MinIO): entregar con un PDF y un enlace largo, descargar, anular y volver a entregar. A 360 px, el enlace largo se parte sin desbordar.
- **H-2:** crear una tarea con "Marcar como completada" y marcarla como alumno. A 360 px, "Cómo se entrega" y "Entregas después de la fecha límite" caben en el panel.
- **H-3:** la fecha límite a 2 minutos. Mientras se espera, hacer H-4 y H-5, para no sumar tiempo muerto.
- **H-4:** "Entregas" a 360 px y en escritorio.
- **H-5:** el hilo entre el alumno y el maestro, y el admin sin formulario y con la nota.
- **H-6:** el conflicto de edición en dos pestañas (P-05 a′).
- **H-7:** NVDA en "Tu trabajo".

### Problemas que bloquean
Ninguno.

### Problemas que no bloquean
- **N-01 — `pedirDeNuevoLaTarea` ahora también renueva las entregas de un alumno.** El nombre ya no dice todo lo que hace. Destino: nada en ENTREGAS; si un encargo toca estos ganchos, que lo renombre (por ejemplo, `renovarTrasErrorDeLectura`).
- **N-02 — el segundo paso del borrado reaparece con su mensaje anterior.** Pasa si una recarga quita `puedeBorrar` y otra lo devuelve, y el programador lo declara. Es raro y no lo pide el plan. Destino: nada.

### Para el tester, ronda 1 de 01e (además de los "Puntos de ataque" del plan)
- **T-r1-1 — `ALUMNO_NO_ENCONTRADO` en cada disparador de la vista del alumno:**
  - la consulta de la entrega;
  - "Ver más comentarios";
  - "Enviar comentario";
  - la descarga de un adjunto;
  - las combinaciones en vuelo.
  En todos, un aviso como máximo, la vista reemplazada y el foco en la raíz.
- **T-r1-2 — la descarga de un adjunto en la entrega de un alumno con `404 ARCHIVO_NO_ENCONTRADO` o `ALUMNO_NO_ENCONTRADO`.** Un aviso; con `ALUMNO_NO_ENCONTRADO`, el reemplazo de la vista.
- **T-r1-3 — "Ver más alumnos" desmontado y con redirección.** El resumen los declara sin caso propio.
- **T-r1-4 — el admin con `409` en el primer paso, "Cancelar" y vuelta a "Borrar tarea".** El segundo paso debe ser el mismo, y "Borrar con las entregas" nunca debe aparecer para el maestro, tampoco en `/maestro/…` con un perfil de admin.
- **T-r1-5 — el conteo "Entregaron n de m alumnos." después de "Ver más".** Debe salir de la página más reciente y no cambiar de forma incoherente si `total` cambia entre páginas.

## Verificación del resumen — ENTREGAS-01e — corrección de la ronda 1 (T-01)
Veredicto: **ACEPTADO**. El tester puede hacer la ronda 2 de 01e.

### Mis corridas
| Paso | Mi corrida | Resumen | Coincide |
|---|---|---|---|
| `shared` build | código 0 | ídem | sí |
| `frontend` lint | código 0 | ídem | sí |
| `frontend` test | `Test Files  165 passed (165)` · `Tests  2498 passed (2498)` · `Duration  106.01s` | 165 · 2498 | sí |
| `frontend` build | código 0 | ídem | sí |
| raíz `npm run lint` y `npm run build` | código 0 y código 0 | ídem | sí |
| `npx vitest list --json` | 2498 en 165 | ídem | sí |
| `backend` y `shared` | sin cambios contra `d6794d6` | ídem | sí |

- **V-01: 174/174** iguales a la tabla de la ronda 1 de 01e. Las 3 rojas del tester pasan.
- **"No se toca": vacío.** Mismas rutas que en mi verificación de 01e, con `features/clases`, `components/ui`, `components/layout`, `components/clase` y `lib/`.
- **Desde mi verificación anterior solo cambiaron:**
  - `components/adjuntos/adjuntos-de-publicacion.tsx`;
  - `features/tareas/hooks.ts`;
  - `detalle-tarea-view.tsx` y `entrega-de-alumno-view.tsx`;
  - `components/tu-trabajo.tsx` y `components/entrega-realizada.tsx`;
  - `entregas-01e.test.tsx` y `DESIGN.md`;
  - la `*.ataque` nueva del tester.
  Nada fuera del hallazgo y sus hermanos.

### Juicio
1. **R-04 se respeta.** El cambio en `AdjuntosDePublicacion` solo suma:
   - la prop opcional `alFallarLaDescarga`;
   - un parámetro más en `descargar`, que sin la prop hace exactamente el `toast.error(mensajeDeError(error))` de siempre.
   `features/clases` (el muro y "Trabajo de clase") no pasa la prop y no cambió, así que su comportamiento es el mismo. `refactor-01c-r1.ataque` y `reexportaciones-01c.test.ts` siguen iguales y en verde.
2. **`useAvisoDeRecargaFallida` devuelve ahora el manejador.**
   - **Para los llamadores de 01a y 01d no cambia nada:** el efecto del aviso de recarga fallida es idéntico, y `editar-tarea-view` y `entregas-view` ignoran el retorno.
   - **No hay un segundo camino de aviso:** el manejador usa `errorQueRedirigeElCliente`, `pedirDeNuevoLaTarea` y `avisarDelErrorDeLaEntrega`, los mismos de 01d.
   - **El mensaje es el mismo:** las vistas de la tarea ya pasaban `mensajeDeErrorTareas` como `mensajeDeError`, y ese mapeo incluye los mensajes de archivo.
   - **Se acepta.** El cambio de firma es aceptable: respeta "sin ganchos nuevos" y no rompe a ningún llamador. Pero mezcla dos responsabilidades en un gancho cuyo nombre solo dice la primera (N-01).
3. **`tu-trabajo.tsx` y `entrega-realizada.tsx`, tocados como hermanos: correcto.** Son la descarga del propio alumno, el mismo mecanismo que T-01. El cambio solo pasa la prop. Las `*.ataque` de 01d siguen iguales (V-01) y en verde, y la matriz de 01d gana el mismo trato para las descargas.
4. **Los hermanos, contrastados con el código:**

| Descarga | Reemplaza la vista (`TAREA_NO_ENCONTRADA`, `SIN_ACCESO_A_LA_CLASE`, `ALUMNO_NO_ENCONTRADO`) | Redirige | `ARCHIVO_NO_ENCONTRADO`, almacén, 5xx o red | Desmontada |
|---|---|---|---|---|
| Adjuntos de la tarea en el detalle (todas las perspectivas) | renueva y da un aviso por tarea perdida | sin aviso | un aviso con el mensaje de archivo | renueva y avisa (patrón T-30) |
| "Tu trabajo" del alumno (su entrega) | igual | igual | igual | igual |
| Entrega de un alumno (maestro y admin) | igual, y con `ALUMNO_NO_ENCONTRADO` renueva las entregas | igual | igual | igual |
| Muro y "Trabajo de clase" (`features/clases`) | sin cambio: un aviso, como en CLASES y TAREAS-01 | sin cambio | sin cambio | sin cambio |

   - **Las vistas previas de imágenes** no piden nada a la API: usan la URL `inline` de la respuesta, y si fallan caen a la ficha (T-40). No aplica.
   - **El muro y "Trabajo de clase" quedan fuera de ENTREGAS,** porque `features/clases` no se toca en 01e. Su descarga sigue avisando sin reemplazar la vista ante un `403` de la clase, igual que antes del encargo. Destino: nada; es el comportamiento de CLASES.

### Observaciones del tester, arbitradas
- **O-1e1-1 — con la lista vacía se ven a la vez "Entregaron 0 de 0 alumnos." y "Aún no hay alumnos…".** Dice lo mismo dos veces, pero ninguno de los dos textos es falso, y §D-10 pide el conteo siempre.
  - Destino: ninguno ahora. Si el humano lo ve en la comprobación (H-4), va por carril trivial: no pintar el conteo cuando `total` es 0.
  - No se corrige en esta ronda, para no abrir otro frente en la última.
- **O-1e1-2 — el `400` del cursor quita las filas ya cargadas y deja el conteo a la vista.** El texto dice que la lista cambió y pide volver a abrir "Entregas", así que las filas viejas no deben quedar como si fueran válidas. El conteo es el de la última página buena, y la frase lo pone en contexto. Destino: nada.

### Problemas que bloquean
Ninguno.

### Problemas que no bloquean
- **N-01 — `useAvisoDeRecargaFallida` también devuelve el manejador de descarga.** El nombre ya no dice todo lo que hace. Destino: nada en ENTREGAS; junto a N-01 de la verificación de 01e (`pedirDeNuevoLaTarea`), si un encargo reordena los ganchos de `features/tareas`.

### Para el tester, ronda 2 de 01e
- **T-r2-1 — descargar en las tres vistas con `TAREA_NO_ENCONTRADA` mientras otra petición en vuelo (comentar, "Ver más") responde lo mismo.** Un solo aviso, la vista reemplazada y el foco en la raíz.
- **T-r2-2 — descargar con el componente desmontado.** Por ejemplo, el alumno anula y la entrega deja de mostrarse mientras la descarga vuela. Un aviso como máximo, sin errores en la consola.
- **T-r2-3 — `ARCHIVO_NO_ENCONTRADO` en la descarga de "Tu trabajo" y de la entrega de un alumno.** Un aviso con el mensaje de archivo y sin renovar nada.
- **T-r2-4 — el muro y "Trabajo de clase" sin cambios.** La descarga con un 5xx avisa como antes (control de R-04).

## Revisión final — ENTREGAS-01e y cierre del encargo
Veredicto: **APROBADO CON OBSERVACIONES**. Nada bloquea el commit `<K1e>`. El cierre del encargo queda sujeto a la comprobación humana (H-1 a H-7) y a la aprobación de las marcas de `DESIGN.md`.
Verificación propia: lint, test y build en verde en `shared`, backend, frontend y la raíz; cifras abajo.

### Corrida propia (todas las suites, una a la vez)
PA-01: `IZZI-F281-5G` en perfil Público, con la regla "Campus: bloquear entrada a Docker en redes publicas" habilitada; Docker 28.5.1.

| Paso | Mi corrida | Tester |
|---|---|---|
| `shared` build / lint | código 0 / código 0 | — |
| `backend` lint | código 0, `> tsc -p tsconfig.json --noEmit && tsc -p tsconfig.test.json` | — |
| `backend` test (23:26:47Z a 23:28:55Z) | `Test Files  192 passed (192)` · `Tests  2422 passed (2422)` · `Duration  123.10s` | 192 · 2422 |
| `backend` build | código 0 | — |
| `prisma validate` / `migrate status` / `migrate diff --from-config-datasource --to-schema` | válido / `Database schema is up to date!` / `No difference detected.` | — |
| `frontend` lint / test / build | código 0 / `Test Files  166 passed (166)` · `Tests  2529 passed (2529)` · `Duration  109.11s` / código 0 | 166 · 2529 |
| `npx vitest list --json` (frontend) | 2529 en 166 | ídem |
| raíz `npm run lint` / `npm run build` | código 0 / código 0 | — |

- **PA-07 (backend): limpio.**
  - Ceros en `40P01`, `deadlock detected`, `could not serialize`, `too many clients` y `Unable to start a transaction`.
  - 10 `"Error no controlado"` (I-1): 6 de `intentos-r2`, 3 `ZodError` y 1 de `salud`.
  - Control positivo: 5 `"code":"P2028"`, de nivel 40, sobre `tx.sesion.*`, `tx.tokenCuenta.updateMany` y `$queryRawUnsafe`.
- **Desde mi verificación de la corrección de T-01** solo cambió la `*.ataque` nueva del tester (`entregas-01e-r2`). El código de 01e es el que ya verifiqué en el resumen y en la corrección, contra §D-10.

### Regresión y "No se toca"
- **V-01: 175/175** iguales a la tabla de la ronda 2 de 01e.
  - En 01e, contra `d6794d6`: 2 `*.ataque` nuevas y exactamente 2 modificadas, C-13 (`entregas-01d-r3`) y C-12 (`styles/clases-r1`).
  - En todo el encargo, contra `dd8edcb`: de 163 se pasó a 175 (12 nuevas). No falta ninguna de las de `dd8edcb`, y no hay `.skip`, `.only` ni `.todo`.
- **"No se toca": vacío.**
  - Dentro, contra `d6794d6`: `services`, `providers.tsx`, `tokens.css`, `index.css`, `components/ui`, `components/layout`, `components/clase`, `lib/`, `vitest.config.ts`, `features/auth`, `features/admin`, `features/diagnostico`, `features/clases`, el `package.json`, `backend/` y `shared/`.
  - Fuera, contra `dd8edcb`: `AGENTS.md`, `.claude`, `infra/`, los tres `.env.example` y todos los `package*.json`.
  - `CLAUDE.md`, ESSENTIALS, `ARCHITECTURE.md` y `PRD.md` coinciden con los SHA-256 de `aprobacion.md` (`38099010…`, `b9c37b8b…`, `ba1c9113…` y `fedeb259…`) y no cambian contra `d6794d6`.
  - El único cambio de esquema del encargo es la migración de 01a.

### Definición de terminado
**01e:**
- [x] RF-35 y RN-07 del lado del maestro y del admin: la lista de entregas con el conteo, la entrega de un alumno, el hilo (el admin solo lee) y el borrado con entregas en dos pasos.
- [x] Capas del frontend: sin ganchos de aviso ni de foco nuevos, y sin `fetch` fuera de `apiClient` y `almacenService`.
- [x] Pruebas en verde.
- [x] `DESIGN.md` con sus marcas.

**El encargo completo:**
- [x] **Requisitos:**
  - RF-14: ver, entregar y anular.
  - RF-15 y RF-44 (la parte de ENTREGAS): retraso, cierre y reapertura.
  - RF-16: el hilo privado, que el admin lee sin escribir.
  - RF-24: "Marcar como completada".
  - RF-35: la lista del maestro.
  - RN-02: ninguna fuga de pago, restricción, correo ni rol, comprobada con alumnos deudores en PR-1B24, PR-1C07 y PR-1E07.
  - RN-03 y RN-06: el restringido no lee ni escribe.
  - RN-07: autoría y borrado con entregas (S-06 modificada).
- [x] **Capas y middleware:** las 12 rutas nuevas usan `protegido()` con la cadena de la tabla, y ningún handler compara rol ni relación. Los eventos se encolan en la transacción del dato. `FOR KEY SHARE` aparece solo en `referencias.ts` y `entregas.ts` (C-9).
- [x] **lint, build y test:** en verde en los tres paquetes y en la raíz.
- [x] **Pruebas de autorización por cada ruta nueva:** PR-1B24, PR-1B25 y PR-1B22 (j) en 01b; PR-1C03, PR-1C05 y PR-1C07 en 01c; más las `*.ataque` de las rondas.
- [x] **Migración:** única, de 01a, compatible hacia atrás; todo es aditivo o relaja una restricción. El retorno a una versión anterior está anotado para DEPLOY (R-10 y N-02).
- [x] **`infra/` y `.env.example`:** sin cambios.
- [ ] **Documentos:** ESSENTIALS, `ARCHITECTURE.md`, `PRD.md` y `CLAUDE.md` ya tienen lo de 01a a 01d por A-5. Falta la fila `tareas` de `CLAUDE.md` (abajo) y la aprobación de las marcas de `DESIGN.md` tras la comprobación humana.

### Problemas que bloquean
Ninguno.

### A-5 al cerrar 01e: la fila `tareas` de `CLAUDE.md`
En la tabla de "Módulos", reemplazar la celda de contenido de la fila `tareas`, que hoy dice "Detalle de tarea, crear y editar tarea (rúbrica, adjuntos, categoría, tema y entregas tardías); zona de entrega e hilo privado (ENTREGAS)". El texto nuevo es el del plan:

> Detalle de tarea, crear y editar tarea (rúbrica, adjuntos, categoría, tema, entregas tardías, cómo se entrega y recarga tras un conflicto de edición); borrar con entregas (`409` y confirmación del administrador); zona de entrega e hilo privado del alumno; entregas de una tarea y entrega de un alumno para maestro y administrador (ENTREGAS-01)

La columna de roles no cambia: "Estudiante, Maestro, Administrador".

### `DESIGN.md`: 19 marcas "propuesta (ENTREGAS-01x)" para que el humano las apruebe tras la comprobación
Al aprobarse, cada marca pasa a "propuesta aprobada (fecha)", según la regla de las marcas de origen.

| Sección | Marcas | Qué fijan |
|---|---|---|
| §7.7 Fila de entrega | 1 (01d) | El estado de la entrega del alumno en la fila |
| §7.8 Etiqueta de estado | 1 (01d) | `EstadoEntregaBadge` |
| §7.19 Adjuntos | 2 (01d; 01e ronda 1) | Los adjuntos de una entrega; el error al descargar en las vistas de una tarea |
| §7.20 Detalle de tarea | 5 (01a; 01d; 01e ×2; 01e) | La fila "Entrega"; la columna del alumno; el panel "Entregas"; borrar con entregas; la frase nueva de borrar |
| §7.21 Formulario de tarea | 2 (01a ×2) | "Cómo se entrega"; "Conflicto al guardar" |
| §7.24 Zona de entrega (nueva) | 3 (01d; 01d rondas 1 y 2) | La sección; los errores del servidor |
| §7.25 Hilo privado (nueva) | 3 (01d; 01d ronda 2 ×2) | La sección; "Ver más comentarios" y el formulario |
| §7.26 Entregas de una tarea (nueva) | 1 (01e) | La sección |
| §8 Densidad por rol | 1 (01e) | La tabla de entregas con la regla del roster |

### Observaciones abiertas del encargo, con destino
- **O-r1-2 de 01a (decisión del humano, pendiente):** que "Editar tarea" espere una lectura fresca cuando la abre con datos en caché que se están recargando. 01e no lo tocó.
  - Destino: `docs/ESTADO.md` §3, como decisión pendiente del humano. Si la aprueba, va por carril trivial: `editar-tarea-view.tsx` más una prueba.
- **N-03 de 01a (`if (version === null) return`, inalcanzable):** 01e no tocó la vista de edición. Destino: el mismo cambio que O-r1-2, si se hace; si no, nada.
- **O-1e1-1 (con la lista vacía, el conteo "0 de 0" y "Aún no hay alumnos…" a la vez):** queda en la comprobación humana (H-4). Si al humano le estorba, va por carril trivial.
- **N-01 de 01e y de su corrección (los nombres de `pedirDeNuevoLaTarea` y `useAvisoDeRecargaFallida` ya no dicen todo lo que hacen):** nada en ENTREGAS. Si un encargo reordena los ganchos de `features/tareas`, que los renombre.
- **Para `docs/ESTADO.md` §3, si no está ya** (el orquestador lo comprueba al cerrar):
  - CALIFICACIONES: §D-11 (versión al calificar, rúbrica con entregas calificadas, columnas y el `CHECK` de fecha).
  - NOTIFICACIONES: §D-5 (los descartes de `ENTREGA_REALIZADA` y de `COMENTARIO_CREADO` del muro y del hilo).
  - DEPLOY: R-10 y N-02 (backend y frontend juntos; no revertir el backend con entregas en la base) y R-07 / O-1 de 01b (archivos pendientes sin tope hasta `LIMPIEZA_DIARIA`).
  - Chore de `apiClient` y avisos: O-1d3-2 junto a R-3 de CHORE-02 y la lista de códigos que redirigen; O-1d3-1 (el `signal` en `services/*`).
  - Chore trivial de textos: R-17 (el comentario de `referencias.ts`), N-02 de 01c (READMEs) y O-r1-1 de 01a (`features/clases/data.ts:221`).
  - ADMIN: O-2 de 01b (cambio de rol e inscripciones).

### Hoja de comprobación humana final (para el orquestador; 7 puntos, unos 10 minutos; ningún agente abre navegadores)
Solo lo que las pruebas no ven. Los arrastres van dentro de los 7 puntos.
1. **H-1 (MinIO local; alumno):** entregar con un PDF y un enlace de unos 2000 caracteres. Descargar el PDF propio, anular y volver a entregar. A 360 px, el enlace largo se parte dentro de su panel, sin barra horizontal.
2. **H-2 (maestro, luego alumno):** crear una tarea con "Marcar como completada". A 360 px, "Cómo se entrega" y "Entregas después de la fecha límite" caben en el formulario. Como alumno, marcarla sin adjuntar nada y ver "Entregado" en "Trabajo de clase".
3. **H-3 (reloj real):** una tarea sin entregas tardías con la fecha límite a 2 minutos. Mientras se espera, hacer H-4 y H-5. Al vencer, recargar el detalle del alumno y ver la frase de entrega cerrada. Como maestro, mover la fecha a mañana y ver que el alumno vuelve a poder entregar.
4. **H-4 (maestro):** "Entregas" a 360 px y en escritorio. La tabla se desplaza dentro de su contenedor, las insignias se leen y "Ver entrega" abre la del alumno. Si hay una clase sin alumnos, ver si "Entregaron 0 de 0" junto a "Aún no hay alumnos" estorba (O-1e1-1).
5. **H-5 (alumno, maestro y admin):** el alumno escribe en el hilo, el maestro responde desde la entrega del alumno y el alumno ve la respuesta. El admin abre la misma entrega y la lee sin formulario, con la nota de solo lectura.
6. **H-6 (maestro, dos pestañas):** guardar la tarea en una y, después de cambiar el título, en la otra. Un solo aviso, la segunda se recarga con lo de la primera (el título nuevo se descarta) y el foco queda en "Título" (P-05 a′).
7. **H-7 (NVDA; alumno):** en "Tu trabajo", que se lean la insignia, la nota mientras se entrega, la confirmación de "Anular entrega" con el foco en "Cancelar" y el enlace con "(se abre en otra pestaña)".
- Lo que no entra en la hoja queda como "no verificada por decisión del humano, cubierta por pruebas automáticas" (`AGENTS.md`, "Trabajo visual"). Si todo sale bien, se aprueban las 19 marcas de `DESIGN.md`.

### Medición del programador
**01e:**
- Rondas del tester: ronda 0, que no cuenta; ronda 1, ROTO con T-01; ronda 2, RESISTE.
- Rondas extra: 1. Por hermanos o vecinos: **0.** La matriz de avisos y recargas, entregada desde el primer resumen, funcionó: T-01 no fue un vecino de un remedio anterior.
- PARADAS: 0. Interrupciones: 0. Resúmenes devueltos: 0 de 2.

**El encargo completo** (para `docs/ESTADO.md` §6, con el formato de TAREAS-01):

| Subentrega | Modelo | Rondas del tester (sin la 0) | Extra | Extra por hermanos o vecinos | Sobre el tope | Resúmenes devueltos | PARADAS del programador | Interrupciones |
|---|---|---|---|---|---|---|---|---|
| 01a | `opus` | 1 (RESISTE) | 0 | 0 | no | 0 de 1 | 1 (PA-02/PA-03 → Enmienda 4) | 0 |
| 01b | `opus` | 2 (ROTO, RESISTE) | 1 | 0 | no | 0 de 2 | 0 | 0 |
| 01c | `opus` | 1 (RESISTE) | 0 | 0 | no | 0 de 1 | 0 | 0 |
| 01d | `opus` | 3 (ROTO, ROTO, RESISTE) | 2 | 1 (ronda 2) | no (llegó al tope) | 0 de 3 | 1 (→ Enmienda 5) | 1 (error de red) |
| 01e | `opus` | 2 (ROTO, RESISTE) | 1 | 0 | no | 0 de 2 | 0 | 0 |
| **Total** | | **9** | **4** | **1** | **no** | **0 de 9** | **2** | **1** |

- **Las dos PARADAS fueron correctas.** Las dos (Enmiendas 4 y 5) vinieron de pruebas normales que el plan no había inventariado, no de errores del programador. La PARADA PA-02 de la ronda 0 de 01a es del tester (Enmienda 3).

**Recomendación para el siguiente encargo:**
- **Modelo:** mantener al `programador` en `opus`. Ninguna subentrega llegó al umbral de 2 o más rondas extra por hermanos, y ningún resumen se devolvió.
- **Reglas que conviene subir** (las decide el humano; no cambio nada):
  1. **`AGENTS.md`, "Resúmenes verificables del programador":** en toda subentrega con interfaz, el primer resumen trae la matriz de avisos y recargas: disparador (cada mutación y cada consulta) × clase de error (reemplaza la vista, redirige, 409, 5xx o red) × "en vuelo a la vez" × "desmontado". En 01d llegó en la ronda 2; en 01e, desde el principio, con 0 rondas por vecinos.
  2. **`.claude/agents/arquitecto.md` o `AGENTS.md`:**
     - los ids de las pruebas requeridas llevan el prefijo del encargo (por ejemplo, `ENT-1D07`), porque los PR-1D de ENTREGAS chocaron con los de TAREAS-01d;
     - la lista cerrada de pruebas normales de cada subentrega sale de un grep hecho en el plan, por subentrega. Las Enmiendas 4 y 5 fueron por eso.
  3. **La copia del plan antes de cada enmienda (O-3)** ya está adoptada. Conviene escribirla en la regla de "Transcripción con cotejo".
