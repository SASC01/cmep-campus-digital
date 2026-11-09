# Revisión del Manager — ADMIN-01 · administración, ampliado

## Revisión del plan — ADMIN-01

Plan revisado: `plan.md`, SHA-256 `473a59d9210845a8d6eb4a8ef28bb8585fbed2bb54e2a7ad23f7fe8afa4bb4e5` (comprobado con `sha256sum`), rama `feat/admin-01` desde `8d98fba`.

Veredicto: **CAMBIOS REQUERIDOS** (M-01 a M-04). El estado BLOQUEADO por P-01 a P-03 se mantiene: las preguntas son realmente del humano.

Verificación propia: modo plan, sin suites. Leí ESSENTIALS, `AGENTS.md`, `CLAUDE.md`, los RF y RN del encargo en `PRD.md`, ESTADO §2b y §3 en `8d98fba`, `ARCHITECTURE.md` §8, §11 y §14, el protocolo PB de `backend/src/adapters/README.md`, `middleware/{index,pertenencia,require-membership,require-ownership}.ts`, `adapters/db/{cliente,clases,tokens-cuenta,bloqueo-usuario,publicaciones,recursos,errores}.ts`, `adapters/queue/{index,colas}.ts`, `worker.ts` y `schema.prisma`. Repetí los grep de §D-R0 de 01a, 01b y 01e. Los resultados están en cada hallazgo.

Lo que está bien y no repito abajo:
- El carril sensible es correcto.
- El orden de capas se respeta en cada subentrega.
- Todas las rutas nuevas pasan por `protegido()`.
- Ninguna ruta nueva da el estado de pago a un estudiante.
- Las 29 filas E-01 a E-29 tienen destino. Coinciden con ESTADO §3 en `8d98fba` (líneas 319 a 467 y 421).
- La lista de CHORE-04 (filas 7 a 11, 24, 25 y 26) sigue la regla interina de §2b.
- La tabla de §D-1 cubre las 59 rutas con `:claseId` de `handlers/` (23 GET, 18 POST, 9 PUT y 9 DELETE). La comprobé contra el código, una por una.

### Problemas que bloquean

#### M-01 — La lista cerrada de 01a no es "ninguna": dos pruebas normales se rompen y faltan vigiladas
Dónde: §D-R0, 01a ("Lista cerrada de pruebas normales que se pueden cambiar: ninguna"; "Vigiladas").

Por qué importa: `AGENTS.md` pide que la lista cerrada salga del grep del arquitecto, y en ENTREGAS-01 las PARADAS vinieron justo de esto. 01a agrega `enClaseArchivada: "lectura"` al `protegido({...})` de gradebook, mis-calificaciones y exportación, y estas dos pruebas normales comparan el texto exacto de la cadena:
- `backend/test/calificaciones-lecturas-estatico.test.ts:77-87` (CAL-1B08), con los regex `protegido\(\{ roles: \["maestro", "admin"\], pertenencia: "propiedad" \}\)` (gradebook) y `…\["estudiante"\], pertenencia: "inscripcion" \}\)` (mis-calificaciones).
- `backend/test/exportacion-calificaciones-estatico.test.ts:98-103` (CAL2-A08), con el mismo regex sobre la exportación.

Las dos fallan en el paso 6. Además, 01a cambia la comprobación del cursor en las tres listas, y eso no aparece como vigilado:
- `lecturas-fx-r1.ataque.test.ts:324-440` engancha `unaVezDespuesDe("clase.findUnique" | "inscripcion.findUnique" | "maestroDeClase.findUnique", …)` justo en la lectura del cursor. Si el filtro de archivada la vuelve un `findFirst`, el gancho no corre y la precondición falla.
- `lecturas-consistentes.integracion.test.ts:312-375` (PR-FX-03a, PR-FX-03b, PR-FX-04) retiene `LOCK TABLE clases` mientras corre la lista. Con el filtro, la primera sentencia de la lista ya toca `clases`.

Qué se espera:
- La lista cerrada de 01a incluye CAL-1B08 y CAL2-A08, con el texto nuevo exacto de cada cadena.
- §D-2 fija una restricción de diseño: la comprobación del cursor sigue siendo un `findUnique` por PK, con `archivadaEn` de la clase en el `select`.
- `lecturas-fx-r1.ataque:324-440` y PR-FX-03a/03b/04 quedan como vigiladas, con PARADA si cambian. Si el arquitecto prevé que cambian, van como C-n del tester.
- Se repite el grep `protegido\\(\\{` sobre `backend/test` y `backend/src/**/*.test.ts`. Hoy solo da esas dos y `calificaciones-estatico.test.ts:46`, que mira calificar: queda cerrada y no cambia.

#### M-02 — El `CHECK archivos_copia_solo_confirmado` choca con los descartes que ya existen: un `500` al borrar o editar un recurso duplicado
Dónde: §D-5, la migración `admin_01_copias_de_archivos` y la lista "Se toca" de 01b.

Por qué importa:
- `adapters/db/publicaciones.ts:319-322` (borrar un recurso o un aviso) y `adapters/db/recursos.ts:262-265` (editar un recurso y quitarle un adjunto) hacen `estado = 'descartado', publicacionId = null` sin tocar `copia_de`.
- Con una copia en curso, el `CHECK (copia_de IS NULL OR estado = 'confirmado')` rechaza la sentencia. `adapters/db/errores.ts` no traduce esa violación, así que la persona recibe un `500`.
- Es el caso más probable de todos: el admin duplica una clase y enseguida limpia o corrige sus recursos de aprendizaje.

Hermano del mismo mecanismo, sin resolver: duplicar una clase que a su vez tiene copias en curso. Es duplicar una copia recién hecha. La copia nueva apunta (`copia_de`) a un archivo cuyo objeto todavía no existe. El worker recibe `origen_inexistente` y descarta la copia, y el recurso pierde su adjunto sin que nadie se entere.

Qué se espera:
- El plan decide qué pasa con un archivo que se descarta mientras se copia. Opciones: el descarte también pone `copia_de = NULL` y el worker toma ese archivo como terminado, o el borrado y la edición responden `409 ARCHIVO_EN_COPIA`.
- Decide también qué pasa al duplicar una clase con copias en curso: un `409 CLASE_CON_COPIAS_EN_CURSO`, o copiar desde el objeto original de la cadena.
- `publicaciones.ts` y `recursos.ts` entran en "Se toca" de 01b, con su grep de pruebas afectadas.
- Hay un caso ADM para cada camino: borrar un recurso con la copia en curso, editarlo y quitarle el adjunto, y duplicar una copia.

#### M-03 — El worker de copias escribe en la base dentro de un ciclo
Dónde: §D-5, "Worker `COPIAR_OBJETOS`": "Tras copiar: `UPDATE archivos SET copia_de = NULL WHERE id = $1 …`", por archivo; y `copias-de-archivos.ts`: `terminarCopia(id, original)`.

Por qué importa: rompe la regla 4 de `AGENTS.md` y ESSENTIALS ("Sin N+1: ninguna consulta dentro de un ciclo"). El descarte por `origen_inexistente` también es por archivo.

Qué se espera:
- En el ciclo solo van las llamadas al almacén.
- Después del ciclo van dos sentencias por lote: un `UPDATE … WHERE id = ANY($copiados) AND copia_de IS NOT NULL` y un descarte con `id = ANY($sinOrigen)`.
- Las firmas del adaptador pasan a ser de lote. La idempotencia no se pierde, porque `copyObject` sobrescribe.
- ADM-1B11 comprueba que un reintento a mitad del lote deja todo bien.

#### M-04 — Frontend: faltan los casos `VALIDACION` fuera de contrato y los caminos de varias frases de recuperación
Dónde: Pruebas requeridas de 01c, 01f y 01g, y §D-12. Se puede resolver en la enmienda de desbloqueo, pero el plan no se aprueba sin esto. Son reglas de `AGENTS.md` (decisiones del humano del 2026-10-13 y del 2026-10-26).

Por qué importa:
- **Formularios sin sus cuatro casos `VALIDACION`:**
  - "Estado de pago" de la ficha (control segmentado y «Guardar», ADM-1F09).
  - El cambio desde la fila en `/admin/estado-pago` (ADM-1G01).
- **Frases de recuperación sin casos por camino:**
  - `ARCHIVO_EN_COPIA` ("Inténtalo en unos minutos."): repetir la descarga tiene que volver a pedir la URL y no servir el error de caché.
  - `CLASE_CON_COPIAS_EN_CURSO`: cerrar y reabrir el diálogo, y repetir «Sí, borrar definitivamente».
  - "No pudimos cargar las clases. Inténtalo de nuevo." con «Reintentar» (§D-12).
  - El cursor vencido de la tabla de `/admin/estado-pago`.

Qué se espera: un caso ADM por cada formulario y por cada camino, con el router real y `app/providers.tsx`, como ADM-1C06 y ADM-1C07.

### Problemas que no bloquean

- **N-01 — Filas condicionales de ESTADO §3 que ADMIN-01 activa.** §D-0.1 solo inventaría las filas con destino ADMIN. Estas se activan porque el encargo toca sus archivos, y no tienen destino en el plan:
  - 414: el comentario obsoleto de `sesiones-y-cadena.ataque.test.ts:87`. Lo toca la ronda 0 de 01a.
  - 329 y 330: `features/tareas`, en 01d.
  - 453: los inicios, en 01d.
  - 390: el gradebook, en 01d.
  - 446 y 448: `formulario-clase.tsx`, si 01c reutiliza su selector de maestros.
  - 386: la normalización de nombres. RF-58 edita nombres y S-12 usa `normalizarTerminoDeBusqueda`.
  - 397 y 450: si se tocan `lib/format.ts` o `mensaje-error.tsx`.
  - Las filas 3, 5, 6, 19 a 22, 27 y 28 de CHORE-04: aplica la regla interina si 01d reescribe esos controles al ocultarlos.

  Que se resuelvan o se dejen abiertas con su nota: 414 en esta revisión del plan; las de frontend en la enmienda.
- **N-02 — La cola de fallidos de copias no tiene de dónde sacar los `archivoIds`.** `trabajarFallidos` (`adapters/queue/index.ts:163`) entrega solo `id` e `idOriginal`. La correspondencia con el correo funcionaba porque su id es el `eventId`; aquí los ids de los trabajos son aleatorios. El plan debe decir de dónde salen los ids: sumar `datos` a `TrabajoFallidoRecibido` (pg-boss copia `data` al trabajo fallido) o guardar el id del trabajo en las filas.
- **N-03 — Una baja de maestro y una asignación a la vez dejan a un maestro inactivo asignado.**
  - La baja toma `FOR NO KEY UPDATE` sobre el usuario. Asignar, crear o duplicar leen `activo` sin bloquear e insertan en `maestros_de_clase`. La FK de esa inserción solo toma `FOR KEY SHARE`, que no choca con la baja.
  - Las dos transacciones confirman: el conteo de la baja vio 0 clases y la asignación vio la cuenta activa.
  - Por eso E-08 no queda cerrado solo con el filtro `activo`. El plan debe tomar las filas de los maestros `FOR SHARE`, en orden, en asignar, crear y duplicar, o declararlo riesgo residual. Hay un solo admin, pero puede tener dos pestañas.
- **N-04 — El duplicado desordena categorías y recursos.** Un `createMany` les pone a todas las filas el mismo `creado_en`. Las categorías se ordenan por `(creado_en, id)` y los recursos por `(creado_en DESC, id DESC)`, así que el orden de la copia queda al azar del uuid. Hay que conservar el orden de la original, por ejemplo con marcas de tiempo crecientes, y comprobarlo en ADM-1B08.
- **N-05 — El alumno que entra por la ruta normal a una clase archivada.** Puede llegar a `/estudiante/clases/:claseId/...` por un marcador, una pestaña abierta o un futuro aviso, y cada sección le respondería `409`. 01d debe decidir qué hace: redirigir a `/estudiante/clases-anteriores/:claseId` o mostrar un mensaje. Lleva su caso.
- **N-06 — La verificación de deriva usa la forma del repositorio.** Debe ser `npx prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --exit-code` (V-07 de AUTH-01, Prisma 7.10), no "o la forma que use el repositorio".
- **N-07 — P-01 (a) es una excepción a P-08 que el plan no declara como tal.** Que el admin agregue y quite maestros en una archivada contradice "solo lectura para todos" (RN-10 y ESSENTIALS, "Reglas de negocio"), y el plan dice "Desacuerdos con ESSENTIALS: ninguno". Si el humano elige (a), la excepción se anota como decisión suya en A-01 y A-03. Mi alternativa está abajo, en P-01.
- **N-08 — Recortes que el plan presenta como suposiciones.**
  - S-04: el alumno no ve en "Clases anteriores" el desglose de la rúbrica ni el comentario de la devolución. Eso acota RF-69 ("la lectura de sus calificaciones").
  - "No entra": la pantalla de acceso restringido sigue sin el estado de pago, aunque RN-03 lo pide y RN-03 está en "Requisitos".

  Los dos deben pasar a decisión explícita del humano.
- **N-09 — Una subida en vuelo puede dejar un objeto huérfano.** Una URL prefirmada emitida antes de archivar (5 min) puede llegar después del borrado definitivo, y su objeto queda sin fila y sin trabajo. Remedio barato: encolar `BORRAR_OBJETOS` con `inicio` unos 10 min después. Si no, se declara como riesgo.
- **N-10 — Los consumidores futuros tienen que tolerar una clase borrada.** `TAREA_CREADA`, `PUBLICACION_CREADA`, `MATERIAL_CREADO`, `COMENTARIO_CREADO`, `ENTREGA_REALIZADA` y `CALIFICACION_PUBLICADA` ya encolados de una clase borrada deben tolerar que la clase no exista. Se suma a A-07 para NOTIFICACIONES.
- **N-11 — DH-08 (a) necesita una lectura explícita.** Que "ausente" signifique "activa" es un valor por defecto. `CLAUDE.md` pide que sea explícito: una función pura, por ejemplo `estaArchivada(clase)` en `lib.ts`, con el porqué en un comentario y su caso de prueba. Nada de `?? null` disperso en las vistas.
- **N-12 — 01d es la subentrega de más riesgo.** Toca tres módulos y decenas de controles. Si el inventario de la enmienda pasa de unos 25 controles, conviene partirla: d1, el contexto y `features/clases`; d2, `features/tareas`, `features/calificaciones` y las vistas nuevas.

### Detalles menores
- Los parámetros nuevos `:usuarioId` y `:alumnoId` conviven con el `:id` de `/admin/usuarios/:id/{correo,restablecer-contrasena}`. `printRoutes` mostrará un solo nombre por nodo; conviene usar `:id` por consistencia, y C-6 se escribe con ese nombre.
- El `409 ARCHIVO_EN_COPIA` en las dos descargas de entregas sobra: un archivo de entrega nunca es copia. Basta con la descarga de la clase, y `handlers/tareas/entregas.ts` sale de 01b.
- El plan no dice qué pasa con `POST /admin/usuarios/buscar` cuando DH-05 deja de usarlo. Hay que declarar si se conserva por compatibilidad o se retira después.
- §D-4 dice "un `P2003` inesperado se traduce como hoy", pero hoy no se traduce: es un `500`. La carrera de una escritura frente al borrado es prácticamente inalcanzable; basta corregir el texto.
- El filtro `alumnoId` de los movimientos y su índice `(alumno_id, secuencia DESC)` no los usa ninguna pantalla (S-09). Se quitan o se justifican ("no sobreconstruyas").
- Grep de 01b: `Almacen` aparece en 15 archivos, no en 22 (`grep -rlw Almacen backend/src backend/test`). No cambia la conclusión.
- Grep de 01b y 01e: lo demás coincide. `registrarConsumidores` aparece en 6 archivos de prueba. Los C-n están en sus líneas: `sesiones-y-cadena.ataque:553` y `:462`, `lecturas-fx-r1.ataque:805-825` y `lecturas-fx-r2.ataque:967`. PR-B16g y PR-B16h están en `movimientos-inscripcion.integracion:243-281`. Ningún regex de nombres de colas (`muro-c-r1.ataque:633`) ni de `cancelar\(` (`temas-01a-r1.ataque:1022-1028`, `hilo-01c-r1.ataque`) se activa con lo previsto, siempre que el borrado y el duplicado reciban las funciones de cola como parámetros y `adapters/db` no importe `adapters/queue`.

### Desacuerdos arbitrados
Ninguno en esta etapa.

### Documentos a actualizar (al cierre; se suman a A-01 a A-10)
- A-01 y A-03: la decisión de P-01 sobre los maestros de una clase archivada (N-07) y la regla del descarte con la copia en curso (M-02).
- A-07: N-01 (las filas condicionales), N-10 y, si se acepta, N-09.

### Para el humano

**Mi opinión sobre las preguntas:**
- **P-01: de acuerdo con (a) en lo central, con un matiz.** Comparto la baja reversible con revocación por PB, la cuenta del admin intocable y el alta de alumno con temporal y cambio obligatorio. El matiz está en el maestro con clases archivadas:
  - (a) obliga a meter a otro maestro en cada archivada y a quitarlo después. Eso reescribe el historial (la clase archivada muestra a un maestro que nunca la dio) y abre una excepción a "solo lectura para todos".
  - Propongo **(a′)**: `MAESTRO_CON_CLASES` cuenta solo las clases activas. Las archivadas conservan al maestro inactivo, con la marca "Cuenta desactivada", y si se restaura una cuyos maestros están todos inactivos, el admin la reasigna ya activa.
  - Con (a′) no hace falta abrir la gestión de maestros en una archivada.
  - Si prefieres (a) tal cual, queda bien, pero como excepción anotada a P-08 (N-07).
- **P-02: de acuerdo con (a).** RF-53 no tiene métricas definidas, y los interruptores de RF-56 no los lee nadie hasta NOTIFICACIONES. Ten en cuenta que RF-07 (los anuncios del login) es "M" y que ESTADO §2b decía que ADMIN-01 cubría todo lo pendiente de §4.4. Diferirlos a un ADMIN-02 es decisión tuya.
- **P-03: de acuerdo con (a).** Es lo que pide RN-10, y la opción (b) deja controles muertos. El costo está en 01d (N-12).

**Mi opinión sobre las DH:**
- **DH-01 (a):** de acuerdo. Es la única opción que cumple ESSENTIALS, "Autorización": se decide en el sexto paso, cerrado por defecto, y "gestion" exige exactamente `["admin"]`. El handler no decide nada de seguridad. Puedo cerrarla yo.
- **DH-02 (a):** de acuerdo. RF-69 deja el lugar al plan. Puedo cerrarla yo.
- **DH-03 (a):** de acuerdo, con M-02 y M-03 corregidos. Coincide con `ARCHITECTURE.md` §11.8: la copia se hace del lado del almacén y nunca pasa por Node. Es técnica: puedo cerrarla yo, y la migración la apruebas con el plan.
- **DH-04:** la opción (a) es razonable (borrar es irreversible y explícito), pero se pierde la auditoría de altas y bajas de esa clase. El esquema dice a propósito "un registro no desaparece en silencio con una cascada". Si la institución necesita ese historial, elige (b). **Decisión tuya.**
- **DH-05 (a):** de acuerdo. Borra dos archivos (requiere tu aprobación) y obliga a reescribir unas 10 `*.ataque` en la ronda 0 de 01f. **Decisión tuya.**
- **DH-06 (a):** de acuerdo para el piloto. El alta de alumnos por el admin multiplica las temporales que se entregan en papel y que no caducan. **Decisión tuya**: es política de seguridad.
- **DH-07:** de acuerdo, con la posible partición de 01d (N-12). Puedo cerrarla yo.
- **DH-08 (a):** de acuerdo, con N-11. Puedo cerrarla yo.
- **DH-09 (a):** de acuerdo. Coincide con las excepciones de modales de `CLAUDE.md` y del PRD. Puedo cerrarla yo.
- **DH-10 (a):** de acuerdo. Cambia una regla de `DESIGN.md` §7.9, así que te toca aprobarla, aunque es menor.
- **DH-11 (a):** de acuerdo. Es compatibilidad hacia atrás. Puedo cerrarla yo.

**Riesgos que debes aceptar de forma explícita:**
- R-03: una escritura que ya pasó el sexto paso puede confirmarse justo después de archivar.
- R-09: después de archivar o duplicar en `prod`, no se vuelve atrás el backend sin restaurar antes las archivadas.
- R-11: si eliges DH-04 (a), se pierden los movimientos de la clase borrada.
- R-12: el borrado en cascada corre dentro de la petición, con una transacción de hasta 30 s que ocupa una conexión. Bordea la regla 5 ("nada pesado en la petición"); solo los objetos del almacén van por la cola.
- R-08: la temporal no caduca.
- R-05 y R-06: las copias en curso y la vista previa que no carga durante la copia.
- R-13: "Clases anteriores" se ordena en memoria.
- N-03 y N-09, si se declaran residuales en lugar de corregirse.

**Lo que solo tú puedes decidir:**
1. P-01, incluida la variante (a′).
2. P-02.
3. P-03.
4. DH-04.
5. DH-05 (borrar `cuentas-view.tsx` y `buscador-de-cuenta.tsx`).
6. DH-06.
7. DH-10.
8. Los recortes de N-08: el desglose y la devolución del alumno en "Clases anteriores", y el estado de pago en la pantalla restringida.
9. La aceptación de los riesgos de arriba.
10. Las tres migraciones, que confirmas antes de cada `prisma migrate dev`.
11. La aprobación por escrito del plan, por ser carril sensible.

**Lo que puedo cerrar yo** si no dices otra cosa: DH-01, DH-02, DH-03, DH-07, DH-08, DH-09 y DH-11, con las recomendaciones del arquitecto y los ajustes de N-11 y N-12.

## Verificación de la Enmienda 1 — ADMIN-01

Base: `473a59d9…` (copia `copias-plan/plan-admin01-v1-473a59d9.md`). Enmendado: `plan.md` = `80d4fdcdc56b5f60d9d10e9052e49ad645fc71afc36513de6536c910168d50af`. Comprobé con `sha256sum` que coincide con la copia v2 y, con `cmp`, que es idéntico byte a byte.

Veredicto: **CAMBIOS REQUERIDOS** (M-05 y M-06). Son dos correcciones cortas. Cuando estén hechas, verifico solo esos hunks y el plan va al humano.

Verificación propia: modo plan, sin suites. Hice tres cosas:
- `git diff --no-index -U0` completo entre las dos copias: 60 hunks, 343 inserciones y 66 eliminaciones. Busqué caracteres invisibles (U+200B–U+200F, U+202A–U+202E, U+2060–U+2064, U+FEFF) y no hay ninguno.
- Repetí los grep del frontend: el conteo de `enEspera=`, las listas de códigos con mensaje del servidor, las pruebas que montan `/admin` o `CuentasView`, y los ganchos de escritura de `features/clases` y `features/tareas`.
- Revisé en el backend `crearClaseAdministrada`, `conReintentoDeCodigo`, `asignarMaestro`, `listarPersonas`, `restablecerConTemporal` y `traducirErrorDeTransaccion`.

### Cotejo del diff
Cada hunk corresponde a una fila E1-n:
- **Fuera de §D-R0 y "Pasos":** E1-1 a E1-21.
- **Listas por subentrega y matriz:** E1-22.
- **"Pasos":** sus hunks son consecuencia directa de E1-3, E1-4, E1-8, E1-15 y E1-18.
- **Excepción a "No se toca" de `adapters/db/inscripciones.ts`:** sale de E1-19 (S-16), aunque esa fila no nombra §D-R0. Es un detalle.

No hay cambios fuera de lo que declara la tabla.

### Hallazgos de la revisión del plan

| Hallazgo | Estado | Cómo queda |
|---|---|---|
| M-01 | Resuelto | CAL-1B08 y CAL2-A08 entran a la lista cerrada con regex que toleran los saltos de Prettier. El cursor sigue siendo `findUnique` por PK, con `archivadaEn` en el `select`. `lecturas-fx-r1.ataque:324-440`, PR-FX-03a/03b/04 y `clases-r1.ataque:561-585` quedan vigiladas. |
| M-02 | Resuelto | Los dos descartes suman `copiaDe: null`. Duplicar una clase con copias en curso da `409`. Casos ADM-1B17 a ADM-1B19. R-14 queda bien acotado. |
| M-03 | Resuelto | En el ciclo solo va el almacén. Después van dos `UPDATE … WHERE id = ANY(...) AND copia_de IS NOT NULL`, con `try/finally` sin tragar el error. ADM-1B21 cuenta las sentencias. |
| M-04 | Resuelto | Hay casos `VALIDACION` para la ficha (1F09b), la fila (1G01b), la baja, reactivar y restablecer el acceso (1F07b) y archivar, restaurar y borrar (1C15). Hay caminos para `ARCHIVO_EN_COPIA` (1C10), `CLASE_CON_COPIAS_EN_CURSO` (1C11), el error de la lista de clases (1C12), el cursor de estado de pago (1G11) y los errores de carga (1F01, 1F17, 1G12, 1D204). Quitar «Reintentar» y recuperar por caminos cumple la regla. |
| N-01 | Resuelto | E-30 a E-38 tienen decisión. Abajo arbitro E-31 y E-32. |
| N-02 | Resuelto | `datos` en `TrabajoFallidoRecibido` (ADM-1B22). |
| N-03 | Resuelto | `bloquearMaestrosActivos` toma `FOR SHARE` en orden de `id` en asignar, crear y duplicar (ADM-1E18). Comprobé el orden de bloqueos: no hay espera circular con la baja, el restablecimiento, el acceso, el lote ni el login. `FOR SHARE` es compatible con el de la sesión y choca con `FOR NO KEY UPDATE`. Crear conserva su lectura previa (`clases-r1.ataque:593-615`). Envolver cada intento en `enTransaccion` no cambia la traducción de `P2002` ni de `22021`, porque `traducirErrorDeTransaccion` relanza todo lo que no sea `P2028`. El programador debe cuidar que el `null` de un intento no llegue a `aClaseDb`. |
| N-04 | Resuelto | Marcas de tiempo crecientes en el duplicado (ADM-1B20). |
| N-05 | Resuelto | `Navigate replace` antes del `Outlet` (ADM-1D208). |
| N-06 | Resuelto | Comando del repositorio, en las tres migraciones. |
| N-07 | Sin objeto | Con (a′), las dos rutas de maestros quedan cerradas en §D-1. |
| N-08 | Resuelto | Los dos recortes están en A-07 bis. |
| N-09 | Resuelto | `BORRAR_OBJETOS` nace diferido 10 min (`startAfter` por trabajo; ADM-1B23). |
| N-10 | Resuelto | Fila en A-07 bis. |
| N-11 | Resuelto | Hay un solo lugar donde se lee la archivada: `estaArchivada`, con su comentario y ADM-1D101. Lo acompaña S-15: el contexto vale `false` sin proveedor. |
| N-12 | Resuelto | 37 controles, partidos en 21 y 16. Comprobé contra el código las líneas de las filas 1, 2, 3, 7, 33, 34 y 37. Ningún componente de escritura de `features/clases` ni de `features/tareas` queda fuera del inventario. Los controles propios del alumno (entregar, anular, su hilo) los cubre N-05. |
| Detalles menores | Aplicados | `:id`, descarga solo de la clase, `P2003`, movimientos sin filtros, `Almacen`. |

DH-06: comprobé la condición del humano en el código. `restablecerConTemporal` (`adapters/db/usuarios.ts:216-237`) reemplaza el hash, revoca sesiones y tokens, y solo excluye al admin. ADM-1E17 y ADM-1F13 la fijan.

### Problemas que bloquean

#### M-05 — Las cifras de `enEspera=` de 01f y 01g están mal sumadas
Dónde: §D-R0 frontend, el encabezado ("01f 86, 01g 91"), C-17 ("de 78 a 86") y C-19 ("de 86 a 91"); también E1-22.

Por qué importa: el plan dice "si el programador necesita otra cifra, PARADA". Con estas cifras, la PARADA es segura. Conté 72 hoy (`grep -rn "enEspera=" --include=*.tsx`, sin pruebas), igual que V-06. Así quedan las sumas:

| Subentrega | Cambios | Total |
|---|---|---|
| 01c | +4 | 76, correcto |
| 01d1 | +1 | 77, correcto |
| 01d2 | +1 | 78, correcto |
| 01f | Sale `buscador-de-cuenta.tsx` (−1). Entran `usuarios-view` 1, `formulario-nombre-de-cuenta` 1, `formulario-alta-alumno` 1, `dialogo-dar-de-baja` 1, `dialogo-restringir-acceso` 1, `acciones-de-cuenta` 2 y `estado-de-pago-de-cuenta` 1 (+8). | **85**, no 86 |
| 01g | +5 | **90**, no 91 |

Qué se espera: 85 y 90 en el encabezado, C-17, C-19 y E1-22. Si la intención era que algún archivo sumara uno más, debe nombrarse ese archivo.

#### M-06 — Un `409 CLASE_ARCHIVADA` en `features/tareas` no renueva el detalle de la clase, y su efecto sobre los flujos de conflicto no está dicho
Dónde: §D-R0 01d2 ("Se toca" sin `features/tareas/hooks.ts` ni `lib.ts`), la matriz (solo hay una fila de 01d1, "Cualquier escritura de las secciones") y Pruebas (ADM-1D105 solo cubre Avisos).

Por qué importa: es el mismo mecanismo que 01d1 resuelve en el ayudante de errores de `features/clases`, pero su hermano en `tareas` queda sin destino. El ayudante solo cubre las mutaciones de `features/clases`. Las de `features/tareas` (crear, editar y borrar tarea, calificar, el hilo privado, y entregar y anular del alumno) solo suman el código a su lista de mensajes.

Con la clase archivada y la vista abierta pasan dos cosas:
- **No aparece el aviso fijo.** Los controles siguen visibles y el alumno no llega a la redirección de N-05 hasta que vence el `staleTime`.
- **Los flujos de conflicto pueden tomar el `409` por un cambio de versión.** El panel de calificación (`features/tareas/lib.ts:604`, "los tres 409 de calificar recargan y reinician el panel") y el formulario de la tarea descartan lo escrito y recargan ante un conflicto. El plan no dice que `CLASE_ARCHIVADA` quede fuera de esos caminos.

Es el patrón de "estados vecinos" que la regla de los hermanos y la matriz quieren evitar.

Qué se espera:
- `features/tareas/hooks.ts` (y `lib.ts`, si ahí vive la clasificación de los `409`) entran en "Se toca" de 01d2.
- Toda mutación de `tareas` que recibe `CLASE_ARCHIVADA`:
  - avisa una vez;
  - conserva lo escrito;
  - no reinicia el panel ni el formulario como si fuera un conflicto de versión;
  - marca viejo el detalle de la clase.
- La matriz suma la fila de 01d2.
- Se agrega un caso ADM-1D2xx por cada camino:
  - calificar en el panel: lo escrito se conserva y el panel pasa a solo lectura al llegar el detalle;
  - editar una tarea;
  - entregar como alumno: termina en `/estudiante/clases-anteriores/:claseId` por N-05.
- La lista cerrada de `tareas` se repite por grep si alguna prueba fija la lista de los `409` que reinician.

### Problemas que no bloquean
- **N-13 — Vigiladas que faltan en 01f.** Estas pruebas montan `/admin`, que pasa a ser el dashboard y pide `GET /api/admin/resumen`:
  - `app/barra-02d-r1.ataque.test.tsx:429-445`;
  - las pruebas de `features/auth` que terminan en `/admin` tras el login (`rutas-ch3-r1.ataque.test.tsx:160-177`, `secuencias-ch3-r2.ataque.test.tsx` y `errores-ch3-r1.ataque.test.tsx`).

  Deben quedar como vigiladas: el doble debe tolerar la petición nueva o la prueba no mira el contenido. Si alguna cambia, PARADA.
- **N-14 — A-01 y A-03 deben anotar la consecuencia de (a′).** Una clase que se restaura puede quedar activa solo con maestros dados de baja hasta que el admin la reasigne. Frente a "una clase nunca queda sin maestro", conviene escribirlo como decisión del humano y no dejarlo implícito.
- **N-15 — Falta el estado "en vuelo a la vez" en la matriz.** El programador lo completa en su primer resumen de cada subentrega.

### Decisiones que cierra el manager
1. **DH-01, DH-02, DH-03, DH-07, DH-08, DH-09 y DH-11 quedan cerradas con la recomendación (a)**, con estos ajustes:
   - DH-03, con M-02 y M-03 ya incorporados;
   - DH-07, en ocho subentregas (01d1 y 01d2);
   - DH-08, con `estaArchivada` como único punto de lectura.
2. **E-31 y E-32 (filas 329 y 330 de ESTADO §3) pasan a FORO-01: lo acepto.** Las dos filas nacieron de revisiones del manager y del programador en CLASES-03, no de una decisión del humano, así que el manager puede cambiar su destino. Ahora bien, 01d2 sí toca `editar-tarea-view.tsx`, donde está T-01, pero solo para la guarda de archivada, y rehacer esos ganchos sería mezclar un refactor con la funcionalidad. Hay dos condiciones:
   - La guarda de 01d2 no toca el camino del `409` de `editar-tarea-view.tsx:96`.
   - El plan de FORO-01 inventaría las dos filas como activadas.
3. **PR-FX-03a y PR-FX-04: preapruebo la reformulación escrita en §D-R0 01a**, con cuatro condiciones:
   - El programador se detiene igual y reporta la salida observada.
   - La única diferencia aceptable es el estado "ninguna clase y `total` 0". Cualquier otra (`500`, una clase sin maestros, un `total` distinto de la página, un gancho que no corre) sigue siendo PARADA y la arbitro.
   - La prueba nueva acepta exactamente esos dos estados y conserva `existeLaClase(...) === false` y la retención de la tabla.
   - PR-FX-03b no cambia.

   Con eso, el programador aplica el cambio en la misma ronda y lo declara en su resumen.

### Textos de §D-12 que el humano debe ver con atención
- **Diálogo de borrar.** "Se borrarán 32 alumnos, 14 actividades…" suena a que se borran las cuentas, y no es así. Propongo "Se perderán las inscripciones de 32 alumnos, 14 actividades, 210 entregas, 180 calificaciones y 57 archivos, y el registro de altas y bajas de la clase. No se puede deshacer." Incluye los movimientos, que con DH-04 (a) se pierden.
- **`MAESTRO_CON_CLASES`.** "Quítalo de sus clases antes de darlo de baja." no basta, porque una clase nunca queda sin maestro. Propongo "Este maestro tiene N clases activas asignadas. Asigna otro maestro a esas clases y quítalo de ellas antes de darlo de baja."
- **Aviso fijo para el admin.** "Solo puedes consultarla" convive con «Restaurar» y «Duplicar». Basta "Clase archivada el {fecha}. Es de solo lectura."
- **"Invitar maestro" sale de `/admin` y pasa a `/admin/maestros`** (en `outline`). Es un cambio de lugar visible para el humano.

### Para el humano (lista final)
1. La aprobación por escrito del plan enmendado (carril sensible), después de que se corrijan M-05 y M-06.
2. Los textos de arriba: el diálogo de borrar, `MAESTRO_CON_CLASES`, el aviso fijo del admin y el cambio de lugar de "Invitar maestro".
3. La confirmación de cada una de las tres migraciones, antes de su `prisma migrate dev`.

Todo lo demás está decidido: P-01 (a′), P-02 (a) con ADMIN-02, P-03 (a) partida, DH-04, DH-05, DH-06 y DH-10, los recortes de N-08 y los riesgos aceptados.

## Verificación de la Enmienda 2 — ADMIN-01

Base: `80d4fdcd…` (copia `copias-plan/plan-admin01-v2-enmienda1-80d4fdcd.md`). Enmendado: `plan.md` = `e0b31df6fee271a2cae44389425bc071ea4901d5e81a7cdd4c7f6e671c8ae0ad`. Comprobé con `sha256sum` que coincide con la copia v3 y, con `cmp`, que es idéntico byte a byte.

Veredicto: **CAMBIOS REQUERIDOS**, solo por M-07, que es un hermano de M-06. Lo demás de la Enmienda 2 está bien. En cuanto se corrija M-07, verifico solo ese hunk y el plan va al humano.

Verificación propia: modo plan, sin suites. Hice tres cosas:
- `git diff --no-index -U0` completo: 18 hunks, 60 inserciones y 13 eliminaciones. Busqué caracteres invisibles y no hay ninguno.
- Grep en `frontend/src` de `claveClaseDetalle`, de las listas de conflicto de `features/tareas/lib.ts` y de quién importa `services/clasesService`.
- Leí la estática de `features/clases/refactor-01c-r1.ataque.test.tsx:395-475` y el flujo de subida de `formulario-de-entrega.tsx` y `components/adjuntos/hooks.ts`.

### Cotejo del diff
Cada hunk corresponde a una fila E2-n:

| Hunk en v2 | Fila |
|---|---|
| `-2` | E2-9 |
| `-277`, `-295`, `-355` y `-381` (textos) | E2-8 |
| `-347` (párrafo de M-06) | E2-2 y E2-3 |
| `-575` (ADM-1D210 a ADM-1D213) | E2-2 y E2-3 |
| `-687` (condiciones de PR-FX) | E2-7 |
| `-705`, `-739` y `-888` (cifras) | E2-1 |
| `-720` ("Se toca" y lista cerrada de 01d2) | E2-2 |
| `-733` | E2-1 y E2-4 |
| `-743` | E2-6 |
| `-758` (fila de la matriz) | E2-2 |
| `-796` | E2-5 |
| `-841` (Pasos) | E2-2 |
| `-890` | La tabla E2 |

No hay cambios fuera de la tabla.

### Lo que pediste revisar
- **M-05: resuelto.** 01f queda en 85 y 01g en 90 en el encabezado, en C-17, en C-19 y en E1-22. Los únicos "86" y "91" que quedan en el plan están tachados o son números de línea.
- **M-06: resuelto para las mutaciones de `features/tareas/hooks.ts`.**
  - `esClaseArchivada` vive aparte. `CLASE_ARCHIVADA` no entra en `CODIGOS_DE_CONFLICTO_DE_CALIFICACION`, `CODIGOS_QUE_RECARGAN_LA_TAREA_AL_CALIFICAR` ni `CODIGOS_DE_CONFLICTO_DE_ENTREGA` (comprobado en `lib.ts:21-23`, `:355`, `:606` y `:611`), y `esTareaModificada` no cambia.
  - Hay un solo aviso, lo escrito se conserva, nada se reinicia y el detalle se marca viejo con `exact: true`.
  - ADM-1D210 a ADM-1D213 y la fila de la matriz están bien escritos.
  - El grep de la lista cerrada es correcto: ninguna prueba del frontend nombra esas listas ni esas funciones.
- **`claveClaseDetalle` a `services/clasesService.ts`: aceptable.**
  - Tiene precedente exacto: `clavePublicaciones` subió igual en TAREAS-01c, con su reexportación.
  - Cumple la regla 9 (`tareas` no importa de `clases`).
  - `clasesService.ts` está en "Se toca" de 01d2.
  - La estática de `refactor-01c-r1.ataque.test.tsx:418-424` (`components`, `lib` y `services` no importan de `features/`) y la de "una sola definición" (`:427-469`) no se activan: `claveClaseDetalle` no está en su lista de destinos.
  - Al cierre, A-05 actualiza la línea de `services/clasesService.ts` en `CLAUDE.md` ("y la del detalle de la clase").
- **Condición de E-31 y E-32 en ADM-1D211: cumplida.** La guarda es un retorno temprano y no toca `recargarTrasConflicto` ni `:95-99`. El caso de control con `409 TAREA_MODIFICADA` lo comprueba.
- **N-13: resuelto.** Las vigiladas coinciden con mi grep.
- **N-14: resuelto.** La redacción sobre RN-06 es correcta y va como decisión del humano.
- **N-15: resuelto.** El programador completa el estado "en vuelo a la vez" en su primer resumen.
- **PR-FX-03a y PR-FX-04: las cinco condiciones son las de mi decisión 3**, sin cambios.

### Problema que bloquea

#### M-07 — La solicitud de subida no está cubierta: es la primera escritura de todo formulario con adjuntos
Dónde: §D-9, en el párrafo de la Enmienda 2 ("Toda mutación de `features/tareas/hooks.ts` (… subir archivos de la entrega)"), en ADM-1D213 ("con archivos o enlaces elegidos") y en el ayudante de 01d1 en `features/clases/hooks.ts`.

Por qué importa:
- **La subida no es una mutación de `features/tareas/hooks.ts`.** Es `useSolicitarSubidaEn` de `components/adjuntos/hooks.ts:30-38`. `formulario-de-entrega.tsx:122-135` la llama antes que `entregar` y captura su error en su propio `try/catch`, con `toast.error(avisoDeFalloAlSubir(...))`.
- **Con un archivo elegido, el `409 CLASE_ARCHIVADA` llega primero a esa solicitud** (`POST …/entrega/archivos`), no a «Entregar tarea». Ese camino no marca viejo el detalle de la clase, así que el alumno no llega a la redirección de N-05.
- **Es el mismo caso en tres formularios más,** todos con `useSolicitarSubida` de `components/adjuntos`:
  - el formulario de la tarea (crear y editar con un adjunto nuevo), en `features/tareas`;
  - el de publicar un aviso;
  - el de publicar o editar un recurso, en `features/clases`.
- **Ninguno de los archivos de ese camino está en "Se toca":** ni `components/adjuntos/hooks.ts`, ni `formulario-de-entrega.tsx`, ni `formulario-tarea.tsx`, ni `formulario-publicacion.tsx`, ni `formulario-recurso.tsx`. ADM-1D213 llevaría a una PARADA o a una ronda del tester.

Es justo el patrón de estados vecinos que la regla de los hermanos quiere cerrar en el plan.

Qué se espera:
- **El plan decide dónde se marca viejo el detalle cuando la solicitud de subida recibe `CLASE_ARCHIVADA`.** Hay dos opciones:
  - en el gancho compartido de `components/adjuntos/hooks.ts`, con su `claseId`, mediante un `onError` o un parámetro;
  - en el `catch` de cada formulario.
- **Esos archivos entran en "Se toca"** de 01d1 (clases) y de 01d2 (tareas y entrega).
- **Si cambia la firma de `useSolicitarSubida` o de `useSolicitarSubidaEn`,** el grep de sus llamadas y de sus dobles fija la lista cerrada.
- **Los casos separan el camino de la subida del de la mutación final:**
  - ADM-1D213 parte en "solo enlaces" (llega a `entregar`) y "con un archivo" (llega a la solicitud de subida);
  - se suma un caso de 01d1 con un aviso o un recurso con adjunto;
  - y uno de 01d2 con una tarea con adjunto nuevo.

  En todos: un solo aviso, lo escrito y los archivos elegidos se conservan, y el detalle se marca viejo con `exact: true`.
- **La matriz suma el disparador "solicitud de subida"** en 01d1 y 01d2.

### Textos finales de §D-12
Están bien. Lo único nuevo es el título «Borrar definitivamente «{nombre}»». Es correcto y nombra la clase, que ayuda a no borrar la equivocada. Dos cosas que conviene que el humano sepa:
- Quedan comillas angulares anidadas («…«nombre»»).
- Con un nombre largo, el título debe partir en varias líneas, sin recortarse. Eso lo verifica la prueba del diálogo o el punto H-4.

### Para el humano (lista final, cuando M-07 esté corregido)
1. La aprobación por escrito del plan enmendado (carril sensible).
2. Los textos finales de §D-12:
   - el aviso fijo del admin, "Clase archivada el {fecha}. Es de solo lectura.";
   - el título del diálogo, «Borrar definitivamente «{nombre}»», y su texto, "Se perderán las inscripciones de … y el registro de altas y bajas de la clase. No se puede deshacer.";
   - `MAESTRO_CON_CLASES` en plural y singular;
   - "Invitar maestro" en `/admin/maestros`.
3. La confirmación de cada una de las tres migraciones, antes de su `prisma migrate dev`.

## Verificación de la Enmienda 3 — ADMIN-01

Base: `e0b31df6…` (copia `copias-plan/plan-admin01-v3-enmienda2-e0b31df6.md`). Enmendado: `plan.md` = `7dbe0191a6555b807441a185400e26a4870ad4791a500f70f6d886e568670bb7`. Comprobé con `sha256sum` que coincide con la copia v4 y, con `cmp`, que es idéntico byte a byte.

Veredicto: **APROBADO. El plan puede ir al humano para su aprobación por escrito.** No quedan problemas que bloqueen. N-16 y N-17 no bloquean: el programador los cumple dentro de ADM-1D108 y ADM-1D109, y yo los compruebo en la verificación del resumen de 01d1.

Verificación propia: modo plan, sin suites. Hice dos cosas:
- `git diff --no-index -U0` completo: 13 hunks, 50 inserciones y 6 eliminaciones. Busqué caracteres invisibles y no hay ninguno.
- Repetí los grep que el plan cita:
  - `useSolicitarSubidaEn(` aparece solo en `components/adjuntos/hooks.ts:18` y en `formulario-de-entrega.tsx:38`.
  - Los dobles de `refactor-01c-r1.ataque.test.tsx:46-48` simulan los ganchos y no cambian.
  - La lista cerrada de ganchos exportados de `entregas-01e-r2.ataque.test.tsx:535-540` no cambia.
  - Las cuatro vigiladas que leen la `QueryCache` (`dudas-03e.test.tsx:1620`, `dudas-03e-r3.ataque.test.tsx:392-397`, `tareas-01d-r2.ataque.test.tsx:437` y `gradebook-01d.test.tsx:1242-1248`) solo usan `find` y `findAll`, y una suscripción no crea consultas.

### Cotejo del diff
Cada hunk corresponde a una fila E3-n:

| Hunk en v3 | Fila |
|---|---|
| `-349` | E3-2 |
| `-354` (decisión, justificación y diez hermanos) | E3-1 y E3-5 |
| `-544` (ADM-1C04b) | E3-7 |
| `-576` (ADM-1D107 a ADM-1D109) | E3-4 y E3-5 |
| `-591` (ADM-1D213a, ADM-1D213b, ADM-1D214 a ADM-1D216) | E3-4 y E3-5 |
| `-736` y `-742` ("Se toca" de 01d1 y 01d2) | E3-3 y E3-2 |
| `-785` y `-788` (matriz) | E3-6 |
| `-869` y `-872` (Pasos) | Consecuencia de E3-1 y E3-4 |
| `-937` | La tabla |

El hunk del encabezado (`-2`) no tiene fila propia; ver N-17.

### Arbitraje de la decisión del arquitecto (tercera opción: la suscripción en `ClaseLayout`)
**La acepto.** Es mejor que las dos opciones que yo propuse:
- Cubre en un solo lugar la subida, la descarga, las consultas y cualquier escritura futura de la clase.
- No cambia firmas de código compartido y vigilado: los ganchos de `components/adjuntos` siguen igual.
- Evita las cuatro copias en los `catch` de los formularios (regla 5).
- Hay precedente en el repositorio de una suscripción a la caché en `features/clases/hooks.ts` (`quitarRespuestasDeUnaDudaQueSeVa`, `cache.subscribe` con su baja).

Lo que pediste comprobar:
- **Baja al desmontar:** la fija ADM-1D109. **Al cambiar de clase** sin desmontar (`ClaseLayout` sigue montado si cambia el parámetro de la ruta), el plan no lo dice ni lo prueba explícitamente: ver N-16.
- **Otros códigos:** no reacciona a ellos. ADM-1D109 lo prueba con `409 TAREA_MODIFICADA` y con un `500`.
- **Otro `claseId`:**
  - La suscripción no sabe de qué clase vino el error. Siempre invalida el detalle de la clase abierta.
  - El único caso real es una mutación de la clase anterior que termina después de navegar a otra. Eso pide una vez el detalle de la clase actual, que responde `200`.
  - Es un costo de una petición, sin efecto visible y sin ciclo. Lo acepto y queda anotado en N-16.
- **Ciclo:**
  - El detalle es `lectura-del-alumno` y nunca recibe `CLASE_ARCHIVADA` (hermano 8).
  - La invalidación es `exact: true`, así que no vuelve a pedir la consulta que falló.
  - Con `retry: 1` (`app/providers.tsx:14`), el error llega una sola vez por consulta, después del reintento.
  - ADM-1D108 exige "el detalle se pide una sola vez por error" (ver N-16).
- **Avisos duplicados:** no los hay, porque la suscripción no avisa. El aviso sigue siendo el del `catch` del formulario o el de la vista, y ADM-1D107, 1D213b y 1D214 a 1D216 exigen uno solo.
- **Reglas de `CLAUDE.md`:**
  - El gancho vive en `features/clases/hooks.ts`, y `ClaseLayout` lo monta.
  - No hay `fetch`; solo `invalidateQueries`.
  - No hay tipos en el archivo de hooks.
  - `components/clase/lib.ts` es una función pura que solo importa `esApiError` de `services/apiClient`, sin importar nada de `features/` (regla 9; la estática de `refactor-01c-r1.ataque:418-424` sigue en verde).
- **`esClaseArchivada` en `components/clase/lib.ts`: aceptable.** Hay una sola definición y la usan dos módulos (regla 5). El nombre se parece al de `estaArchivada` (N-11 en `features/clases/lib.ts`), pero responden a preguntas distintas: un error frente a una clase. Basta un comentario que lo diga en cada una.
- **`components/adjuntos/` y los cuatro formularios no se tocan,** sin cambio de firmas. El grep lo confirma.

### Casos, hermanos y matriz
- **ADM-1D213a y 1D213b:** separan bien el camino de la mutación final del de la solicitud de subida. En 1D213b no sale `entregar` ni el `PUT`, el detalle se retiene y el alumno termina en N-05.
- **ADM-1D107 y ADM-1D214:** cubren la subida de la clase (aviso, recurso y tarea).
- **ADM-1D108, 1D215 y 1D216:** cubren las consultas cerradas del maestro (`…/codigo`) y las del alumno (la descarga y la lista de Avisos).
- **ADM-1D109:** cubre la baja de la suscripción y el filtro de códigos.
- **Los diez hermanos:** coinciden con el código.
  - Subida y descarga: `components/adjuntos/hooks.ts:17-47`.
  - `PUT` al almacén: no pasa por la API.
  - Las consultas previas, la exportación y el gradebook son `lectura`.
  - Duplicar es `gestion`.
  - Unirse no lleva `:claseId`.

  No falta ningún camino.
- **Matriz:** las filas nuevas de 01d1 y 01d2 cubren los disparadores "solicitud de subida", "descarga del alumno" y "consultas que reciben `CLASE_ARCHIVADA`". Dicen un solo aviso, que lo escrito se conserva y que solo se renueva el detalle.
- **ADM-1C04b:** el título conserva el nombre completo y las comillas anidadas. Comprobar la clase `wrap-anywhere` por atributo es aceptable: `DESIGN.md` la usa en el encabezado de la clase (§7.16, línea 661), y la prueba no localiza elementos por estilo. H-4 confirma que se ve en varias líneas a 360 px.

### Problemas que no bloquean
- **N-16 — La suscripción: cambio de clase y qué evento escucha.** El programador lo resuelve dentro de ADM-1D108 y ADM-1D109, y lo declara en su primer resumen de 01d1. Yo lo compruebo en la verificación del resumen.
  - El efecto depende de `claseId` y del `QueryClient`. Al cambiar de clase sin desmontar `ClaseLayout`, se da de baja y vuelve a suscribirse con la clase nueva. ADM-1D109 suma ese caso: después del cambio, un `CLASE_ARCHIVADA` invalida el detalle de la clase nueva y nunca el de la vieja.
  - Reacciona solo a la transición a error, no a cualquier notificación de una consulta que ya está en error (agregar o quitar un observador, por ejemplo). En consultas, `type === "updated"` con `action.type === "error"`; en mutaciones, su equivalente. Así se cumple "el detalle se pide una sola vez por error" de ADM-1D108.
  - Queda declarado como costo aceptado: una mutación de la clase anterior que termina después de navegar invalida el detalle de la clase actual (una petición, sin efecto visible).
- **N-17 — El hunk del encabezado no tiene fila E3.** E2-9 sí la tenía para el suyo. Es un detalle de cotejo y no cambia el contenido.
- **A-05 al cierre:** `CLAUDE.md`, en "Ubicaciones compartidas", suma `components/clase/lib.ts` (`esClaseArchivada`).

### Para el humano (lista final)
1. **La aprobación por escrito del plan enmendado** (carril sensible): `plan.md` = `7dbe0191a6555b807441a185400e26a4870ad4791a500f70f6d886e568670bb7`.
2. **Los textos finales de §D-12:**
   - el aviso fijo del admin, "Clase archivada el {fecha}. Es de solo lectura.";
   - el título del diálogo, «Borrar definitivamente «{nombre}»», y su texto, "Se perderán las inscripciones de … y el registro de altas y bajas de la clase. No se puede deshacer.";
   - `MAESTRO_CON_CLASES` en plural y singular;
   - "Invitar maestro" pasa a `/admin/maestros`.
3. **La confirmación de cada una de las tres migraciones,** antes de su `prisma migrate dev`.

## Verificación de la Enmienda 4 — ADMIN-01

Base: `7dbe0191…` (plan aprobado; copia `copias-plan/plan-admin01-antes-enmienda4-7dbe0191.md`, cuyo `sha256sum` comprobé). Enmendado: `plan.md` = `a5bb19668efebae23968c87dd857ea89561bc69ac950ba7ee81e54881f67a464` (comprobado), 1005 líneas, sin CR.

Veredicto: **APROBADO. El programador reanuda 01a en el paso 7.** No hay problemas que bloqueen.

Verificación propia: modo de enmienda, sin suites completas. Comprobé que no corría ningún otro vitest y después hice dos corridas acotadas, una tras otra, desde `backend/`:
- `npx vitest run test/bloqueo-usuario.integracion.test.ts -t "E6"` → `Tests  1 failed | 20 skipped (21)`. El diff de la aserción solo suma `"clases.ts"` entre `"categorias.ts"` y `"dudas.ts"`. Es lo que reportó el programador y lo que corrige E4-1.
- Las vigiladas de E4-1 (`arquitectura-cuentas-r1`, `temas-01a-r3`, `temas-01a-r1`, `hilo-01c-r1` y `lecturas-fx-r1`, filtradas por `queryRawUnsafe|FOR KEY SHARE|ninguna escritura dentro de la instant`) → `Tests  5 passed | 81 skipped (86)`, sobre el árbol actual de 01a.

### Cotejo del diff
`git diff --no-index` completo: 10 hunks, 31 inserciones y 7 eliminaciones (coincide con `aprobacion.md`). No hay caracteres invisibles; el único `\u` literal es el de la nota "sin escapes `\uXXXX`".

| Hunk (copia → plan) | Sección | E4-n |
|---|---|---|
| `-2 +2` | Encabezado (Estado) | E4-7 |
| `-410 +410` | §D-12, título del diálogo | E4-3 |
| `-564 +564` | Pruebas, ADM-1C04b | E4-3 |
| `-724 +725,6` | §D-R0 01a, lista cerrada | E4-1 (los tres cambios de E6) y E4-2 (CAL-1A17) |
| `-737 +744` | §D-R0 01a, vigiladas | E4-1 (vigiladas) |
| `-741 +749` | §D-R0 01b, lista cerrada | E4-4 |
| `-743 +751` | §D-R0 01b, vigiladas | E4-4 |
| `-748 +756` | §D-R0 01e, lista cerrada | E4-5 |
| `-882 +890` | Pasos, paso 7 | E4-6 |
| `-981 +989,17` | Tabla E3 (fila E3-7) y tabla E4 nueva | E4-3 y el registro de la enmienda |

No hay hunks fuera de esta lista. El alcance, el diseño, "Se toca" y "No se toca" no cambian. Las dos pruebas que entran en la lista cerrada de 01a son normales de `backend/test/`. `ayudas-calificaciones.ts` queda expresamente sin tocar.

### (a) Cambio mínimo
- **E4-1:** son tres cambios exactos, con líneas que comprobé en el archivo: el título en `:690`, los comentarios en `:677-689` y el arreglo en `:709-723`. No se tocan el patrón, la lectura del directorio, el filtro de comentarios ni la comparación exacta. Deja fuera `clases-archivadas.ts` (comprobé que hoy no tiene SQL crudo) y pone PARADA para cualquier otro archivo.
- **E4-2:** es una sola sentencia antes del `create` de `:145`, más su comentario.
- **E4-3:** corrige los tres lugares que el humano nombró (§D-12, ADM-1C04b y E3-7). El grep de "Borrar definitivamente" no deja ninguna otra aparición con comillas exteriores.
- **E4-4 y E4-5:** adelantan el mismo grep a 01b y 01e. No amplían el alcance: aplican la regla de `AGENTS.md` de que la lista cerrada sale del grep del arquitecto en cada subentrega. Cada lista queda acotada a archivos **nuevos** de `adapters/db` de esa subentrega, con PARADA si un archivo existente gana SQL. `bloqueo-maestros.ts` está en el "Se toca" de 01b.

### (b) E4-1 no debilita lo que protege E6
- `unirseConCodigo` (`backend/src/adapters/db/clases.ts:488-504`) usa `tx.$queryRaw` con plantilla etiquetada. `${codigo}` va como parámetro y la consulta filtra por `codigo_invitacion`, que es único. Es un export propio, dentro de `enTransaccion`, y su comentario dice "modo compartido", no `FOR SHARE`. Así, el corte de `listarClasesAdmin` de `lecturas-fx-r1.ataque:1126-1151` sigue limpio (lo corrí y está en verde).
- `$queryRawUnsafe` y `$executeRawUnsafe` siguen vigilados fuera de E6: `arquitectura-cuentas-r1.ataque:69-74` y `temas-01a-r3.ataque:426-428` exigen que solo `adapters/db/cliente.ts` los use. Las dos están en verde.
- El `FOR SHARE` de `clases.ts` no es `FOR KEY SHARE`: `temas-01a-r1:985-997` y `hilo-01c-r1:718-727` siguen en verde.
- E6 sigue siendo una lista exacta. Un archivo más con SQL etiquetado la rompe igual que antes.

### (c) E4-2 resuelve la interferencia sin quitarle valor a CAL-1A17
- El escenario (`ayudas-calificaciones.ts`) crea la clase con `maestroIds: [maestro, otroMaestro]`, y el tercer caso no usa `otroMaestro`. Al retirarlo antes del `create`, la clase pasa de 2 a 1 y vuelve a 2 maestros. Nunca llega a 3, que es lo que `claseAdminSchema` (`shared/src/clases.ts:244`, `.min(1).max(MAXIMO_MAESTROS_POR_CLASE)`) rechazaba con el `500`.
- La lista del admin lee en una sola instantánea (`instantaneaUnica`), así que ve 2 o 1 maestros, nunca un estado intermedio.
- El caso conserva su valor: `pendiente` sigue siendo un **maestro de la clase** con `debeCambiarContrasena`, y la aserción sigue exigiendo `403 CAMBIO_DE_CONTRASENA_REQUERIDO`. La puerta de contraseña no deja pasar ni a un miembro legítimo.
- `fotoDeCalificar` (`ayudas-calificaciones.ts:178-…`) solo lee la entrega, sus puntajes y sus comentarios, no los maestros. `sinEscritura` no cambia.
- Los hermanos de inserción que cita el plan coinciden con el código. Mi grep de `maestroDeClase.create|createMany|upsert`, `maestros: { create` e `INSERT INTO maestros_de_clase` da el mismo inventario:
  - `exportacion-calificaciones.integracion:292` y `gradebook-01b-r1.ataque:820` suman un segundo maestro a una clase de uno (`crearClaseDeGradebook` crea con uno).
  - `lecturas-fx-r1.ataque:586/608` lo hacen dentro de una transacción retenida.
  - Las migraciones corren en esquemas propios o en tablas temporales.

### (d) El grep del arquitecto está completo
Recorrí todas las pruebas de `backend/test` y `backend/src` que leen fuentes (`readFile`, `readdir`) y buscan `$queryRaw`, `$executeRaw` o `FOR …`, o que nombran `adapters/db`. Son 29 archivos. Las que leen `adapters/db/clases.ts` o enumeran `adapters/db` son tres:
- E6;
- `lecturas-fx-r1.ataque:805-825`, que cuenta `instantaneaUnica` (`unirseConCodigo` no la usa; C-2 ya suma `clases-archivadas.ts`);
- `lecturas-fx-r1.ataque:1126-1151`, vigilada.

Las demás miran otros archivos (`entregas.ts`, `calificaciones.ts`, `tareas.ts`, `publicaciones.ts`, `inscripciones.ts`, la exportación, los handlers), los archivos de migraciones (`migracion-*`, `sexto-paso-02a-r1`, `calificaciones-migracion`) o patrones que 01a no toca (`higiene-de-pruebas`: `$transaction(`, `LOCK TABLE`; `dudas.integracion:741`: el handler de dudas no encola).

La corrida completa del programador (`2 failed | 2837 passed`) confirma empíricamente que, con el árbol de 01a, solo fallaban E6 y la interferencia.

### (e) El hermano "clase sin maestros"
Basta como observación para el tester. Lo comprobé en el código:
- Las nueve pruebas que borran filas de `maestros_de_clase` retiran a uno de dos y dejan al otro: `dudas-clases03b-r1:700`, `recursos-clases03a-r1:427`, `exportacion-02a-r1:401`, `exportacion-calificaciones-autorizacion:255`, `instantanea-01b-r1:267/410`, `temas-01a-r1:939`, `tareas-autoria:124`, y `tareas-01a-r1:309`/`tareas-01b-r1:199`, que además reasignan.
- Las de `lecturas-fx-r1:587/607` borran dentro de una transacción retenida.
- No hay una clase confirmada sin maestros fuera de esquemas aislados: `crearClaseDePrueba` siempre crea con uno o dos, y `clases.maestro_id` y `maestros_de_clase.maestro_id` son `onDelete: Restrict`, así que borrar usuarios no deja clases vacías.
- Hoy no ocurre, así que no justifica un cambio en 01a.

### Problemas que no bloquean
- **N-18 — Hermano "clase sin maestros" como observación con destino.** El tester lo anota en la ronda de 01a. Quien escriba pruebas en 01b (borrado, duplicado) y en 01e (baja de maestro, S-16) no debe dejar confirmada una clase con 0 o con 3 maestros: la lista global del admin es una lectura compartida por toda la suite. Si una prueba nueva lo necesita, se crea y se limpia dentro de una transacción retenida, como `lecturas-fx-r1:575-612`.
- **N-19 — Los hermanos de E4-2 solo cubrían inserciones.** El plan hizo el grep en la dirección del hallazgo (más de dos). La dirección vecina (menos de uno) la cubrí yo en (e) y no hay ningún caso. No hace falta reabrir el plan.

### Detalles menores
- En §D-12, el texto tachado iba entre comillas rectas de cita, como el resto de §D-12, y no era incorrecto. Tacharlo y repetirlo entre comillas invertidas es inocuo y deja el texto inequívoco.
- La interferencia de CAL-1A17 es anterior a 01a: el tope de dos maestros del esquema y el tercer maestro de la prueba ya existían, y la falla era intermitente. Corregirla en 01a está justificado, porque 01a, 01b y 01e suman lecturas de la lista del admin (tabla E4, fila E4-2).

### Para el humano
Nada nuevo. La Enmienda 4 no cambia el alcance ni los textos aprobados, salvo la precisión del título que el humano ya dio.

## Verificación del resumen — ADMIN-01a

Plan: `plan.md` = `a5bb19668efebae23968c87dd857ea89561bc69ac950ba7ee81e54881f67a464` (Enmiendas 1 a 4, comprobado). Resumen: `resumen-programador.md` = `4b40c82e99f8aaf19a29a3227cdfc14687cb7a8a4119aad447782ad6c97aee48`, 128 líneas (comprobado). Base: `8d98fba` (HEAD de `feat/admin-01`).

Entorno (PA-01): red `IZZI-F281-5G`, perfil Público; regla "Campus: bloquear entrada a Docker en redes publicas" habilitada (Inbound, Block, Public); Docker 28.5.1 encendido. Una suite después de otra; antes de cada suite completa, dos lecturas de CPU de 25 % o menos y ningún `node` con `vitest`.

### Cifras: resumen frente a mi corrida

| Comprobación | Resumen | Mi corrida |
|---|---|---|
| shared `npm run build` | exit 0 | exit 0 (`> tsc -p tsconfig.json`) |
| shared `npm run lint` | `All matched files use Prettier code style!` | igual, exit 0 |
| backend `npm run lint` | `> tsc -p tsconfig.json --noEmit && tsc -p tsconfig.test.json`, exit 0 | igual, exit 0 (antes, `All matched files use Prettier code style!`) |
| backend `npm run test` | `Tests  2839 passed (2839)` · `Test Files  239 passed (239)` | `Tests  2839 passed (2839)` · `Test Files  239 passed (239)` (tercera corrida, 198.68 s; ver "Corridas del backend") |
| backend `npm run build` | exit 0 | exit 0 (`> tsc -p tsconfig.json`) |
| `npx vitest list` (backend) | 2839 casos, 239 archivos, 33 ADM-1A | 2839 (`grep -a " > " \| wc -l`), 239 (`cut -d' ' -f1 \| sort -u`), 33 (`grep -a -c "ADM-1A"`) |
| ADM-1A por archivo | 7 / 4 / 14 / 5 / 3 | 7 `archivada.test` · 4 `protegido-clase-archivada` · 14 `clases-archivadas.integracion` · 5 `…-matriz` · 3 `…-migracion` |
| PA-07 | 0/0/0/0, 5 `P2028`, 10 "Error no controlado" | 0/0/0/0, 5 `"code":"P2028"`, 10 "Error no controlado" (5 "fallo simulado de la base en la búsqueda", 1 "al crear la sesión", 1 "boom", 3 `ZodError` de la URL del almacén), igual en las tres corridas |
| `prisma validate` | válido | `The schema at prisma\schema.prisma is valid` |
| Deriva (E1-11) | `No difference detected.`, exit 0 | igual, exit 0 (con `pipefail`) |
| `prisma migrate status` | — | `17 migrations found` · `Database schema is up to date!` (`campus_dev`, 127.0.0.1:5433) |

#### Corridas del backend (tres; solo la tercera vale como cifra)
Durante esta verificación, un proceso ajeno (`ChatGPT.exe` de la app de escritorio de Codex, PID 16092) lanzó en bucle `git ls-files`/`git status` sobre todo `C:\Users\Carlos` y subió la CPU a picos de 30 a 90 %. No lo terminé (no es mío). Pasé la puerta de carga antes de cada corrida, pero la carga volvió a subir a mitad:
1. **Primera** (puerta: 5 % y 0 %): `Tests  1 failed | 2838 passed (2839)`. Falló `archivos-d-r1.ataque` › "subida: firmada para PUT…" (`:781`, `expected 1026 to be less than 1000`). Es una aserción de tiempo: compara `expiraEn` en milisegundos con `X-Amz-Date`, que trunca al segundo, así que tolera menos de un segundo entre la firma y `expiraEn()`, fracción incluida. Es ajena a 01a: la subida es una ruta cerrada que 01a no cambia, salvo que el sexto paso lee una columna más antes de firmar. Sola: `19 passed (19)`.
2. **Segunda** (puerta: 16 % y 21 %): `Test Files  7 failed | 232 passed (239)` · `Tests  2787 passed | 52 skipped (2839)`, 253 s. Los siete son `Hook timed out in 10000ms` en el `beforeAll` de `construirApp` (`admin-correo`, `auth-registro`, `guarda-clase`, `me`, `migracion-maestros-de-clase`, `recuperar`, `sexto-paso-02a-r1.ataque`). Es carga, no 01a.
3. Esos ocho archivos solos, con la puerta (0 %): `Test Files  8 passed (8)` · `Tests  71 passed (71)`.
4. **Tercera** completa (puerta: 12 % y 6 %): **`Test Files  239 passed (239)` · `Tests  2839 passed (2839)`**. Coincide con el resumen.

No devuelvo el resumen por las dos primeras: el total (2839 y 239) coincide en las tres, y ninguna falla toca 01a. La cifra del resumen se reprodujo en verde con la carga baja.

### Pruebas requeridas (ADM-1A01 a 1A15)
Comprobé con `npx vitest list` los 33 títulos del resumen, uno por uno (se extrajeron con un script y se buscó cada cadena exacta): **los 33 existen tal cual**, en los archivos que dice el resumen. Cada viñeta del plan tiene su archivo y sus casos. Leí el cuerpo de cada caso contra su viñeta:
- **1A01 y 1A02:** la matriz completa, con las cuatro políticas y los textos exactos.
- **1A03:** sin pertenencia lanza con las tres políticas. `"gestion"` lanza con `["admin","maestro"]`, `["maestro"]`, `["maestro","admin"]` y sin roles. Con `["admin"]` arma seis pasos, y con pertenencia y sin opción arranca con la guarda.
- **1A04:** compara `archivada_en` y `actualizado_en` en las dos repeticiones.
- **1A06:** 401, 403 de rol para el alumno y el maestro de la clase, `ACCESO_RESTRINGIDO`, `SIN_ACCESO_A_LA_CLASE` en una inexistente, y ninguna clave de estado de pago, restricción, correo ni código.
- **1A07:** las dos listas con 400 exacto y el recorrido completo comparado con la lista esperada.
- **1A08:** el empate de fechas desempatado por `id DESC`, el recorrido de página en página, los tres cursores malos (activa, ajena e inexistente) y las claves prohibidas, `motivoRestriccion` incluida. Ese cursor está en el cuerpo del caso, aunque el título no lo nombre.
- **1A09:** (a) compara `printRoutes` con la tabla, con los `HEAD`. (b) prueba las cerradas con los tres actores, contra una clase gemela activa, y cuenta nueve tablas antes y después. (c) y (e), como pide el plan.
- **1A10, 1A11, 1A13 y 1A15:** cubren su viñeta.
- **1A12:** el caso retenido usa `formadasDetrasDe(pid)` y una transacción con `timeout: 15_000`, mayor que su espera más larga (5 s), como pide `AGENTS.md`.
- **1A14:** usa un esquema propio, con el método de `calificaciones-migracion`.

### V-01: las 249 `*.ataque`
- Extraje de `reporte-tester.md` las 249 filas `| ruta | sha256 |` y corrí `sha256sum -c`: no hay ninguna diferencia.
- El conjunto de la tabla es exactamente el de las `*.ataque` del árbol, rastreadas y no rastreadas: 249 contra 249, con `diff` vacío.
- Comparé cada hash con `git show 8d98fba:<ruta>`. Solo difieren dos, y con los hashes de la ronda 0:
  - C-1 `sesiones-y-cadena.ataque`: `78680f5e…` → `d1673261a3f4467da10cb07deae3b8fad93a6f233caea8370d61d4fbdc45f29b`.
  - C-2 `lecturas-fx-r1.ataque`: `849134d1…` → `7a73655168d44a449a8c9bebd5a941b2b8f16deca5ad8d55bdc11772b9133439`.
- El programador no tocó ninguna `*.ataque`.

### "No se toca" contra `8d98fba`
`git diff --name-only 8d98fba` y `git ls-files --others --exclude-standard`, sin `docs/trabajo/ADMIN-01-administracion/` ni `docs/ESTADO.md`:
- **"Se toca" de 01a:** `shared/src/{clases,index}.ts`, `schema.prisma` y la carpeta de la migración, `core/clases/archivada.ts`, `middleware/{index,pertenencia,require-membership,require-ownership}.ts` y su README, `adapters/db/{clases,clases-archivadas,index}.ts` y su README, los 13 handlers de la lista y `handlers/README.md`.
- **Lista cerrada:** `calificaciones-lecturas-estatico` (CAL-1B08), `exportacion-calificaciones-estatico` (CAL2-A08), `bloqueo-usuario.integracion` (E4-1) y `calificaciones-autorizacion.integracion` (E4-2).
- **C-1 y C-2.**
- **Nuevos de prueba:** `core/clases/archivada.test.ts`, `test/ayudas-clases-archivadas.ts`, `test/protegido-clase-archivada.test.ts` y los tres `test/clases-archivadas*.integracion.test.ts`.

No hay nada más. `guarda-de-rutas.ts`, los demás pasos de `middleware/`, `inscripciones.ts`, `calificaciones.ts`, la exportación, `infra/`, `config/`, `auth/` y `notifier/` quedan intactos. Las vigiladas `lecturas-consistentes.integracion` (PR-FX-03a, 03b y 04) y `gestion-clases.integracion` no cambiaron, y pasan en verde.

### Lista cerrada: E4-1, E4-2, CAL-1B08 y CAL2-A08
- **E4-1** (`bloqueo-usuario.integracion`): son exactamente los tres cambios autorizados.
  - La línea `// ADMIN-01a (§D-3): clases.ts (el FOR SHARE de la clase por su código en unirseConCodigo).` va después de la de CLASES-03b.
  - El título termina en `…, recursos.ts, dudas.ts y clases.ts usan SQL etiquetado en adapters/db`.
  - `"clases.ts"` va entre `"categorias.ts"` y `"dudas.ts"`.
  - El patrón, la lectura del directorio y la comparación no cambian.
- **E4-2** (`calificaciones-autorizacion.integracion`): solo el `maestroDeClase.delete` del segundo maestro (`claseId_maestroId`, `select: { claseId: true }`) antes del `create`, con su comentario. El título, las aserciones y los demás casos no cambian.
- **CAL-1B08 y CAL2-A08:** los regex son literalmente los del plan, con `\s*` y la coma final opcional. Siguen fijando los roles y la pertenencia exactos.

### Migración `20261104234335_admin_01_clases_archivadas`
- **El SQL es el de §Cambios/prisma y R-02:** `ADD COLUMN "archivada_en" TIMESTAMPTZ(3)` (nula), `CHECK clases_activa_segun_archivada ("activa" = ("archivada_en" IS NULL))`, `clases_activas_idx (creado_en DESC, id DESC) WHERE archivada_en IS NULL` y `clases_archivadas_idx (archivada_en DESC, id DESC) WHERE archivada_en IS NOT NULL`. `schema.prisma` suma `archivadaEn DateTime? @map("archivada_en") @db.Timestamptz(3)` y corrige el comentario de `Clase` (A-09).
- **Estado de `campus_dev`:** `migrate status` dice "up to date". La deriva da "No difference detected.", con exit 0. En `pg_indexes` y `pg_constraint` aparecen los dos índices y el `CHECK` con la definición exacta, y `_prisma_migrations` registra la migración como aplicada.
- **Compatibilidad hacia atrás:** columna nula; las filas de hoy cumplen el `CHECK`; un backend anterior no escribe ninguna de las dos columnas. Revertir el código no rompe la base (R-09 queda para DEPLOY).

### §D-1 a §D-3, DH-01 y N-18 contra el código
- **§D-1 y DH-01 (sexto paso, cerrado por defecto):**
  - `evaluarClaseArchivada` (`core/clases/archivada.ts`) es pura. Con la clase activa da `null`. Archivada y sin política da `409 CLASE_ARCHIVADA` para todos. Con `"lectura"` solo bloquea a `"estudiante"`; con `"lectura-del-alumno"` y `"gestion"` deja pasar a los tres. El texto es el del plan.
  - `resolverClaseDeLaRuta` la llama **después** de `evaluarPertenencia`. Una clase inexistente, ajena o con un rol no admitido sigue dando 403 antes del 409; lo prueba ADM-1A09 (e) en toda ruta.
  - `protegido()` lanza al construir si la opción va sin `pertenencia`, o si es `"gestion"` con `roles` distinto de `["admin"]`. La guarda `onRoute` no cambia.
  - **Tabla:**
    - Hay exactamente 22 rutas `"lectura"` (las conté con grep en `handlers/`), 2 `"lectura-del-alumno"` y 2 `"gestion"`.
    - El resto queda sin declarar: `GET …/codigo`, `GET …/alumnos/candidatos`, `PUT /admin/clases/:claseId` y asignar o quitar maestros (P-01 a′).
    - ADM-1A09 (a) obliga a que esa sea la tabla completa.
- **§D-2:**
  - **Archivar y restaurar:** un `updateMany` condicionado (`archivadaEn: null` / `{ not: null }`) que escribe las dos columnas juntas, sin encolar nada. Si el conteo es 0, relee por PK y responde 403 o 409.
  - **Inscritas e impartidas:** filtran también el `total`, y el cursor sigue siendo un `findUnique` por PK con `clase.archivadaEn` en el `select` (M-01).
  - **Lista del admin:** usa `estado` opcional, con su filtro, su orden y su `total`, y un cursor por PK que debe cumplir el estado. Sin `estado`, todas (DH-11).
  - **`GET /clases/anteriores`:** `roles: ["estudiante","maestro"]`, instantánea única, `{ id, nombre, maestros: [{ nombre }], archivadaEn }`. No lleva estado de pago, restricción, correo ni `version`.
  - **Respuestas de clase:** crear, editar, archivar, restaurar y el detalle mandan `archivadaEn`, por `conMaestroPrincipal`.
- **§D-3:** `unirseConCodigo` es un export propio, después de `listarClasesAdmin`.
  - Lee la clase con `tx.$queryRaw` etiquetado y parametrizado (`WHERE codigo_invitacion = ${codigo} FOR SHARE`). Si no existe o está archivada, devuelve `null`, y el handler responde el mismo `404 CODIGO_INVALIDO` que un código inexistente.
  - Inscribe con `createMany` + `skipDuplicates`.
  - Su comentario no nombra `FOR SHARE`, `createMany(` ni `$executeRaw` (O-2).
  - `editarClase` filtra `archivadaEn: null`, y el comentario de `buscarDatosDePertenencia` está corregido (N-01).
  - Se retiraron `buscarClasePorCodigo` e `inscribir`; ningún archivo de producción ni de prueba los llama.
- **N-18:** ninguna prueba nueva deja confirmada una clase con 0 o 3 maestros.
  - Todas crean con `crearClaseDePrueba` (uno) o con `POST /api/admin/clases` y un maestro.
  - ADM-1A09 (b) manda `POST …/maestros` sin cuerpo y `DELETE …/maestros/:maestroId` con ids al azar: en la gemela dan 400 o no encuentran nada, y en la archivada dan 409.
- **O-1:** `estadoDeClasesSchema` no lleva un mensaje propio, y no hay ningún literal nuevo `"palabra: …"` en `shared/src`.

### Decisiones donde el plan calla (las ocho, aceptadas)
1. **Sin códigos nuevos en `CODIGOS_CLASES`.** Bien: la traducción es de 01c.
2. **`estado=otra` → el `400 VALIDACION` de `validarParametros`.** Bien (O-1).
3. **`listarClasesAnteriores` elige la tabla con el rol del perfil, en el adaptador.** Pagina por keyset `(archivada_en, id)` y lee el cursor por PK. Bien: el handler no compara roles, la ruta solo admite estudiante y maestro, y Prisma no admite un `cursor` con orden por una columna de la relación.
4. **`archivada_en` toma la hora de la API (`new Date()`), no `now()` de la base.** Se aparta de la letra de §D-2, pero va en UTC, la API y la base comparten servidor, y ninguna regla depende del reloj. Se acepta. Va en el resumen al humano como desviación menor.
5. **Respuesta 409 ante una carrera entre el `UPDATE` y la relectura.** Bien en el fondo. La forma va en "Detalles menores".
6. **`conMaestroPrincipal` serializa `archivadaEn`.** Bien.
7. **ADM-1A03 en `backend/test/`.** Bien: el plan admite "middleware o integración" y archivos de prueba nuevos.
8. **ADM-1A09 decide "admitido" con una clase gemela activa.** Bien: no codifica a mano qué rol admite cada ruta, así que una ruta nueva no se cuela sin revisar.

### La observación sobre `regenerarCodigo`
Es correcta y basta como observación, sin cambio:
- `POST …/codigo` es una ruta cerrada. Solo una carrera con un archivado que confirma después del sexto paso regeneraría el código de una archivada.
- Ese código no sirve mientras la clase esté archivada (`unirseConCodigo` la rechaza). Al restaurarla, el resultado es el mismo que regenerarlo justo antes de archivar.
- Es la carrera de R-03, que el humano aceptó para toda escritura que pasó el sexto paso: asignar o quitar maestros, el alta manual, etc. El plan solo pide el filtro en `editarClase`.

### Frontend (01a toca `shared/`)

| Comprobación | Resumen | Mi corrida |
|---|---|---|
| `npm run lint` | `> tsc -b`, exit 0 | `> tsc -b`, exit 0 |
| `npm run test` | `Tests  6062 passed (6062)` · `Test Files  281 passed (281)` | igual (puerta: 3 % y 9 %; 330.54 s) |
| `npm run build` | `✓ built in 1.22s`, exit 0, con el aviso de tamaño de siempre | `✓ built in 1.26s`, exit 0, con el mismo aviso (el tiempo varía entre corridas) |
| `npx vitest list` | 281 archivos, 6062 casos (de la corrida) | 6062 casos y 281 archivos (`grep -a`) |

### Hermanos del resumen
La lista coincide con el código:
- **Los cuatro cursores con filtro** (inscritas, impartidas, admin por estado, anteriores) leen por PK y rechazan con 400, y los cuatro `total` filtran.
- **`archivadaEn`** va en las cinco respuestas de clase y en cada fila de la lista del admin.
- **Unirse** tiene un único camino.
- **Los estados del sexto paso:** inexistente, ajena, rol no admitido, admin sin `admin` en `roles`, activa y archivada con cada política.
- **E4-2:** su grep de hermanos coincide con el que hice en la verificación de la Enmienda 4.

No falta ningún hermano ni estado vecino.

### Problemas que bloquean
Ninguno.

### Problemas que no bloquean
- **N-20 — Una aserción de tiempo frágil en `archivos-d-r1.ataque:781`.** Tolera menos de 1000 ms entre `X-Amz-Date` (truncada al segundo) y `expiraEn` (en milisegundos), así que con carga falla sin defecto (1026 ms en mi primera corrida). Es anterior a 01a y es del tester. Destino: que el tester decida en su ronda si la ajusta (por ejemplo, a menos de 2000 ms, sin perder lo que protege: "no más de un segundo después de la firma", medido con la fracción del segundo), o una fila en ESTADO §3. No la puede tocar el programador.
- **N-21 — Carga ajena durante las corridas.** La app de escritorio de Codex (`ChatGPT.exe`) lanza en bucle `git status` y `git ls-files` sobre todo el perfil del usuario. Pasa la puerta de carga y la vuelve a subir a mitad de la suite, y dos de mis tres corridas del backend cayeron por eso. Recomiendo que el humano la cierre durante las suites del tester y del manager (ver "Para el humano").

### Detalles menores
- `archivarClase` y `restaurarClase` (`adapters/db/clases-archivadas.ts`) deciden el 409 de la carrera con `errorAlArchivar(fila.archivadaEn ?? new Date()) ?? sinAcceso()` y `errorAlRestaurar(null) ?? sinAcceso()`. El resultado es correcto (decisión 5), pero un `?? new Date()` y una rama que nunca se alcanza disfrazan de valor por defecto algo que es una decisión. Sería más claro lanzar el 409 del `core/` directamente, con el comentario. No vale una ronda: queda para la revisión final de 01a.
- `listarClasesAnteriores` trata como "maestro" a cualquier rol que no sea `estudiante` (decisión 3). Hoy es inalcanzable por `roles`; una rama explícita sería más defensiva.
- ADM-1A09 (d) dice "las dos rutas" y recorre cuatro (GET y HEAD de cada una). Es correcto; el título solo cuenta las rutas sin sus HEAD.
- En algunas pruebas nuevas aparecen `listas[0]?.token ?? ""` y `[{ pid } = { pid: -1 }]`: si faltara el dato, la aserción siguiente falla con su mensaje. Se acepta.

### Puntos que recomiendo al tester (ronda 1 de 01a)
1. **Carreras de archivar:**
   - dos archivados a la vez (uno 200 y otro 409, sin escribir dos veces);
   - archivar y restaurar a la vez;
   - archivar y unirse, con y sin `FOR SHARE` retenido (`clases-r1:561-585` sigue vigilada);
   - archivar contra una escritura cerrada que ya pasó el sexto paso (R-03, aceptado): que no haya `500` ni un `CHECK` violado.
2. **El keyset de `GET /clases/anteriores`:**
   - empates de `archivada_en` a lo largo de varias páginas;
   - la clase del cursor restaurada entre dos páginas (400);
   - la clase del cursor **restaurada y vuelta a archivar** con una fecha más reciente entre dos páginas: el keyset salta a su nueva posición y puede repetir clases. Juzgar si es un defecto o un caso aceptable, porque el plan solo cubre "deja de cumplir el filtro".
3. **El parámetro `estado`:** `estado=Activas`, `estado=activas&estado=archivadas` (arreglo), `estado=` vacío y con espacios. Esperado: `400 VALIDACION`, nunca `500`. Además, un cursor archivado sin `estado` → 200 (DH-11).
4. **El orden 403/409:**
   - una archivada ajena para un maestro que no es de la clase;
   - el admin en una ruta sin `admin` en `roles`;
   - un alumno restringido en una archivada (`ACCESO_RESTRINGIDO` antes que todo);
   - el `HEAD` de cada ruta `"lectura"` y de `GET /clases/:claseId` para el alumno.
5. **Rutas `"lectura"` que escriben o firman:** las tres descargas en una archivada. Que el maestro y el admin las firmen, que el alumno reciba 409 y que no se cree ni se confirme ninguna fila de `archivos`.
6. **Fugas en `GET /clases/anteriores`:** ninguna clave de correo, estado de pago, restricción ni `version`, también con maestros dados de baja o con nombres raros. Ningún `500` si una archivada del usuario tuviera 0 maestros (N-18, el hermano de E4-2 en la otra dirección).
7. **N-18:** las pruebas que escriba el tester no deben dejar confirmada una clase con 0 o 3 maestros.
8. **N-20:** decidir sobre `archivos-d-r1:781`.

### Veredicto
**ACEPTADO. El tester puede atacar 01a.** Todas las cifras del resumen coinciden con mi corrida:
- **backend:** 2839/239, 33 ADM-1A en 5 archivos, PA-07 0/0/0/0 con 5 y 10;
- **frontend:** 6062/281;
- **lint y build:** los de los tres paquetes;
- **ADM-1A01 a 1A15:** las 15 viñetas con sus 33 títulos exactos;
- **V-01:** 249 de 249, y solo C-1 y C-2 difieren de `8d98fba`;
- **"No se toca":** limpio;
- **migración y deriva:** bien;
- **E4-1 y E4-2:** exactos;
- **decisiones:** las ocho aceptadas, y la observación de `regenerarCodigo` es correcta;
- **§D-1 a §D-3, DH-01 (cerrado por defecto) y N-18:** se cumplen.

Las dos primeras corridas del backend fallaron por carga ajena, no por 01a (ver "Corridas del backend"). La tercera reprodujo la cifra en verde.

### Para el humano
- Durante las suites del tester y del manager, conviene cerrar la app de escritorio de Codex/ChatGPT o pausar su indexado de git (N-21). Hoy hizo fallar dos corridas completas del backend sin ningún defecto del código.

## Arbitraje de T-02 y revisión de T-01 — ADMIN-01a

Veredicto: **ESCALAR AL HUMANO** (T-02: decisión de contrato en un plan aprobado del carril sensible). **T-01: corrección correcta**, sin hallazgos que bloqueen.

Insumos: `plan.md` SHA-256 `a5bb1966…` (Enmiendas 1 a 4), `reporte-tester.md` "Ronda 1 — ADMIN-01a" (línea 367), `resumen-programador.md` "Corrección ronda 1" (189 líneas; SHA-256 `2b05ac7a92bb49acc1aa88079f0e9eccf020d6cbb0cf6e9be289e8bc9dc9947b`, comprobado).

Verificación propia (acotada; por indicación del orquestador no corrí la suite completa):
- Antes de correr: ningún `node` con `vitest` (solo procesos de la app de Codex), red `IZZI-F281-5G` en perfil Público, regla "Campus: bloquear entrada a Docker en redes publicas" habilitada (Inbound, Block, Public), Docker 28.5.1, CPU 30 %.
- `cd backend; npx vitest run test/clases-archivadas.integracion.test.ts test/clases-archivadas-r1.ataque.test.ts` → `Test Files  1 failed | 1 passed (2)` · `Tests  2 failed | 27 passed (29)`. Fallan solo ADM-T1A07 y ADM-T1A07b (T-02). ADM-T1A05 (T-01) y ADM-1A13 en verde.
- `cd backend; npm run lint` → exit 0, última línea `> tsc -p tsconfig.json --noEmit && tsc -p tsconfig.test.json`. Coincide con el resumen.
- `sha256sum` de las dos `*.ataque` de la ronda 1: `clases-archivadas-r1` `c3f5df14…` y `archivos-d-r1` `87add258…`, los del tester. El programador no las tocó.
- La cifra completa del resumen (`2 failed | 2852 passed (2854)`, 240 archivos) es coherente con mi corrida acotada, pero **no la reproduje**. La verificación completa del resumen queda para la entrega que cierre T-02, que de todos modos cambiará código o pruebas.

### T-02: ¿defecto real frente al plan?

**Sí, pero es un hueco del diseño de §D-2, no un error de implementación.**
- El comportamiento es real: lo reproduje (ADM-T1A07 y 07b en rojo). La página siguiente responde `200` con clases de la página anterior.
- La invariante que se rompe está en "Puntos de ataque" 3 (línea 683): "que nunca se salte ni se repita una fila en silencio". R-04 solo cubre la otra mitad: la fila del cursor que deja de cumplir el filtro.
- El programador implementó §D-2 al pie de la letra: "Cursor: un `claseId` que debe ser una archivada del perfil", orden `(archivada_en DESC, id DESC)` y, por M-01, la fila del cursor leída con `findUnique` por PK. Con eso, el servidor solo puede ubicar el cursor en la posición **actual** de la fila. El hueco lo crea el propio plan.
- Severidad baja, como juzgó el tester:
  - hace falta que el admin restaure y vuelva a archivar **la clase exacta del cursor** mientras alguien pagina;
  - volver a archivar pone `archivada_en` en "ahora", así que la fila siempre salta a la cabeza: el único efecto posible es **repetir filas ya entregadas, nunca saltar una**;
  - no hay fuga ni escritura; el daño es visual (filas duplicadas en "Ver más" y claves de React repetidas en 01c y 01d).

### ¿Hay un remedio más barato que (a) dentro de §D-2 y M-01?

**No. Ningún remedio cierra T-02 sin que el cliente mande algo más que el `claseId`, y eso cambia `shared/`.** El programador tiene razón. La prueba:
- Escenario legítimo: B es la archivada más reciente; la página 1 con `limite=1` trae [B] y el cursor B. La página siguiente correcta es [A, C].
- Escenario de T-02: B se restauró y se volvió a archivar después de que el cliente la viera en la posición 2.
- En los dos, la petición es la misma (`cursor=B&limite=2`) y el estado de la base es el mismo: B con la fecha más reciente, y `actualizado_en` también igual, porque la última escritura sobre B fue el archivado. La respuesta correcta es distinta en cada caso. Con solo el uuid y la base actual, ninguna regla del servidor distingue los dos casos.

Las salidas que pidió revisar el orquestador:
- **Cursor opaco que siga validando como uuid:** imposible. El cursor tiene que llevar el `claseId` completo para el `findUnique` por PK (M-01): 122 bits aleatorios, que ocupan todo lo que admite un uuid. No queda espacio para la posición. Guardar la posición en el servidor exigiría una tabla nueva, es decir, una migración: peor que (a).
- **Comparar contra otra columna existente:** no hay ninguna que guarde la historia de la fila. `actualizado_en` coincide con el archivado en los dos escenarios.
- **Rechazar el cursor si quedó en la cabeza:** el programador ya la descartó, y con razón. Rechaza el cursor legítimo del ejemplo (`limite=1`) y no detecta una fila que vuelve a archivarse sin quedar primera.
- **Conservar la `archivada_en` original al volver a archivar:** cambia el significado del dato. Además, no cierra ADM-T1A07b, que vuelve a archivar con `archivarClaseDePrueba(ids.b, segundo(7))` directo en la base, sin pasar por la API.
- **Ordenar por una clave inmutable** (por ejemplo, `clases.creado_en`): cierra el hueco sin tocar `shared/`. Pero contradice §D-2 y el sentido de DH-02 ("de la archivada más recientemente a la más antigua"). No la recomiendo.

**Hecho que el resumen del programador no menciona:** con cualquier remedio, el tester tiene que cambiar pruebas suyas. Las cinco salidas son estas:
- **ADM-T1A07b** arranca con un `claseId` crudo como cursor (`url(ids.centinela)`) y vuelve a archivar por la base. No puede pasar con ninguna salida: con un cursor que exige posición, su primera petición da `400` y falla la precondición; con un cursor que la tolera, la repetición sigue.
- **Con (a) en su forma estricta** (`cursorArchivadaEn` obligatorio si hay `cursor`), fallan además:
  - ADM-T1A06: `recorrerAnteriores` solo manda `cursor`;
  - la última aserción de ADM-T1A08: `conSuCursor` espera `200` con el `claseId` crudo.
  - ADM-T1A07 pasaría sin cambios: el `400` es una salida que acepta.
- **Con (a) opcional** (sin `cursorArchivadaEn`, lee la posición de la fila como hoy): ADM-T1A07 y 07b siguen en rojo, porque no mandan el parámetro, y el hueco queda abierto para cualquier cliente que no lo mande. **No es un remedio.**
- **Con el cursor opaco `"<archivadaEn>|<id>"`:**
  - pasan ADM-T1A06 y ADM-T1A07, que reutilizan `siguienteCursor` tal cual;
  - fallan ADM-T1A07b y la última aserción de ADM-T1A08.
- **Con (b):** el tester reescribe ADM-T1A07 y 07b con el contrato aceptado.

El programador no debe tocar ninguna de las cinco: las cambia el tester en su ronda, con el contrato que decida el humano.

### Costo real de (a)

**Lo que la abarata:** los contratos de las dos listas son de 01a y nadie los consume todavía. `listaClasesAnterioresRespuestaSchema` y `listaClasesAdminConsultaSchema` son nuevos y no están confirmados, y el frontend de 01c y 01d no existe. Además, el `400` del cursor ya tiene interfaz en el plan: la frase "La lista cambió mientras la veías. Vuelve a abrirla para verla completa." con sus caminos (ADM-1C07, ADM-1D06 y ADM-1D204). Con (a), el caso de T-02 cae en ese texto, sin texto nuevo. Hay precedente de dos cursores en el mismo contrato: `cursorTareas` y `siguienteCursorTareas` del gradebook.

**Lo que toca:**

- **`shared/src/clases.ts`:**
  - un `listaClasesAnterioresConsultaSchema` nuevo: `paginacionSchema` más `cursorArchivadaEn: z.iso.datetime()`, los dos o ninguno;
  - `listaClasesAdminConsultaSchema` gana `cursorArchivadaEn`, obligatorio solo con `estado=archivadas` y `cursor`;
  - `listaClasesAnterioresRespuestaSchema` gana `siguienteCursorArchivadaEn` (nullable);
  - `listaClasesAdminRespuestaSchema`, que ya consume el frontend, gana `siguienteCursorArchivadaEn` opcional, para no tocar los dobles de las pruebas del frontend actual;
  - `index.ts` exporta los nuevos;
  - por la regla de `shared/`, se corren `lint`, `test` y `build` de backend y frontend.
- **Backend:**
  - `listarClasesAnteriores` y `listarClasesAdmin` reciben la fecha y la comparan con la fila leída por PK. Si no coincide, `400 VALIDACION` "cursor: no es válido". M-01 se conserva y las vigiladas de `lecturas-fx-r1:324-440` no cambian;
  - los dos handlers serializan la fecha de la última fila;
  - las pruebas propias ADM-1A08 y ADM-1A11 se ajustan, y entra un caso nuevo (fecha distinta → `400`; sin fecha → `400`).
- **Tester:** ADM-T1A06, ADM-T1A07b y ADM-T1A08 (la última aserción) pasan al contrato nuevo. ADM-T1A07 queda igual.
- **Frontend:**
  - 01c: el hook de la lista del admin con `estado=archivadas` arrastra el segundo cursor en `getNextPageParam` y en la URL;
  - 01d2: lo mismo en "Clases anteriores" y "Clases archivadas";
  - sus dobles y sus casos de "Ver más" llevan el campo.
  - Cambio chico por hook, pero son tres listas.
- **Plan: hace falta una Enmienda 5** (carril sensible, aprobación por escrito):
  - §D-2 (contrato del cursor de las dos listas);
  - la lista de `shared/` de 01a;
  - ADM-1A08 y ADM-1A11 más el caso nuevo;
  - los hooks y dobles de 01c y 01d2;
  - "Puntos de ataque" 3;
  - el texto de ADM-1A13 (ver T-01);
  - la decisión sobre el hermano de 01e (abajo).
  - El orquestador guarda la copia previa del plan para el `git diff --no-index`.

### Hermano que nadie inventarió: listas por nombre (01e y las de hoy)

El mismo hueco existe en todo keyset cuyo cursor es un id y cuya clave de orden cambia. Con el nombre es **peor**, porque la fila puede moverse en cualquier dirección: **salta filas, no solo las repite**.
- **`GET /admin/usuarios` (01e):** orden `(nombre_busqueda, id)`, cursor por PK. 01e agrega `editarNombre`. Si se renombra la cuenta del cursor entre dos páginas, las filas entre el nombre viejo y el nuevo se repiten o se saltan en silencio. "Puntos de ataque" 3 nombra esta lista, así que el tester de 01e lo va a encontrar.
- **Ya existen:** el roster de la clase (`inscripciones.ts:76`, orden por `usuario.nombreBusqueda`, cursor por `usuarioId`) y la ventana de alumnos del gradebook. Hoy casi no se alcanzan, porque ninguna ruta del admin renombra cuentas de alumnos. Con `editarNombre` de 01e, sí.

Sea cual sea la decisión de T-02, conviene que la Enmienda 5 fije **una regla para todo keyset sobre una clave que cambia**: cursor con posición, o riesgo aceptado con su alcance. Así no se arbitra lista por lista en cada ronda.

### Recomendación sobre T-02

**Recomiendo la opción A: (a) en su forma estricta, como regla para todo keyset de ADMIN-01 cuya clave de orden cambia.**

Por qué:
- es el momento más barato: los contratos son nuevos y no tienen consumidores;
- el `400` ya tiene su texto y sus caminos en el plan;
- el hermano de 01e (usuarios por nombre) **salta** filas en un flujo verosímil: el admin edita la última fila visible y pulsa "Cargar más", o TanStack Query vuelve a pedir las páginas con los cursores guardados. Ese salto no se puede mitigar en el cliente. Decidirlo ahora para las tres listas evita una regla distinta en cada una.

Las opciones para el humano:

| Opción | Qué hace | Costo | Qué queda |
|---|---|---|---|
| **A (recomendada)** | Cursor con posición estricto (`cursorArchivadaEn` / `siguienteCursorArchivadaEn`, `400` si no coincide o si falta) en `GET /clases/anteriores` y `GET /admin/clases?estado=archivadas`. La misma regla, con `nombre_busqueda`, para `GET /admin/usuarios` en 01e | Enmienda 5. `shared/` y la verificación de los dos paquetes en 01a. Dos adaptadores y dos handlers. ADM-1A08, ADM-1A11 y un caso nuevo. El tester ajusta ADM-T1A06, 07b y 08. En 01c y 01d2, tres hooks arrastran el segundo cursor | El roster y el gradebook (orden por nombre, ya existentes) quedan como riesgo en ESTADO §3, con destino. Se vuelven alcanzables con `editarNombre` de 01e |
| B | Riesgo aceptado (R-14) para las dos listas por `archivada_en`. Ahí la falla es solo repetir filas ya vistas, nunca saltar. La Enmienda 5 pide a 01c y 01d2 descartar por `id` las filas repetidas al juntar páginas | Enmienda 5 corta. El tester reescribe ADM-T1A07 y 07b con el contrato aceptado: restaurada → `400`; vuelta a archivar → `200`, sin saltar ninguna fila. Una función pura y su prueba en 01c y 01d2 | La API repite filas (la interfaz las oculta). **01e sigue necesitando su propia decisión**, porque ahí sí salta filas |
| C | Ordenar las dos listas por una clave que no cambia (`clases.creado_en`) | Enmienda 5. No toca `shared/` | Contradice §D-2 y el sentido de DH-02 (la más recientemente archivada primero). No la recomiendo |

Con cualquier opción, 01a no se cierra con ADM-T1A07 y 07b en rojo. Después de la decisión y de la Enmienda 5:
1. corrige el programador;
2. ataca el tester (ronda 2 de 3);
3. el manager verifica el resumen completo.

Esta PARADA cuenta como la ronda de corrección 1. **No es una ronda extra por hermanos:** el hueco es del plan, no del remedio del programador.

### Revisión de la corrección de T-01

**Veredicto: correcta.**

**El remedio** (`backend/src/adapters/db/clases.ts:189-215`) hace lo que piden §D-1 ("escrituras: 409 para todos") y §D-3 ("cubre la carrera"):
- si el `updateMany` filtrado por `archivadaEn: null` no cambia ninguna fila, `editarClase` relee la clase por PK;
- si no existe, devuelve `null`, y `gestion.ts` sigue respondiendo `403 SIN_ACCESO_A_LA_CLASE`;
- si existe, lanza `errorClaseArchivada()` de `core/clases/archivada.ts:10`: el mismo código y el mismo texto que la ruta cerrada;
- el handler no cambia y no compara nada a mano;
- el adaptador importa de `core/`, que es la dirección permitida.

ADM-T1A05 y ADM-1A13 pasan en mi corrida.

**Desviación de ADM-1A13: aceptada.** El texto del plan (línea 531, "`editarClase` llamado directo con una archivada → `null` sin escribir") era justo la contradicción que produjo T-01: con ese `null`, el handler responde 403 en la carrera. La prueba es del programador (`clases-archivadas.integracion.test.ts:588`), no es `*.ataque` ni está vigilada, y queda más fuerte:
- conserva el 409 por la API y el nombre sin cambio;
- suma el 409 directo con `actualizado_en` intacto, y el `null` de una clase inexistente.

Hay que alinear el texto del plan: va en la Enmienda 5 (ver N-23).

**Hermanos: correctos.**
- Un grep de `archivadaEn` en `adapters/db/*.ts` confirma que `editarClase` es la única escritura que filtra por archivada.
- `archivarClase` y `restaurarClase` ya distinguían 403 de 409 (`clases-archivadas.ts:34-43` y `:56-65`).
- `unirseConCodigo` responde 404 por diseño (§D-3).
- El resto de las escrituras no filtran y confirman bajo R-03, como confirma O-R1-2 del tester.

**Estados vecinos: correctos y coherentes con el código.**
- Activa: sin cambio.
- Archivada antes del sexto paso: el 409 del middleware.
- Archivada en la carrera: el 409 del adaptador.
- Borrada antes del `UPDATE`, o entre el `UPDATE` y `leerClase`: `null` → 403.
- Archivada y restaurada entre el `UPDATE` y la relectura: 409. El código lanza el 409 con cualquier fila existente, sin mirar su `archivadaEn`, así que responde el estado que vio el `UPDATE`. Es la misma regla que la decisión 5 de archivar y restaurar.

No falta ningún estado.

### Problemas que no bloquean
- **N-22 — `backend/src/adapters/README.md:197`** sigue diciendo solo "`editarClase` filtra además `archivada_en IS NULL` (… el filtro cubre la carrera)". Falta la relectura: si no cambia ninguna fila, devuelve `null` cuando la clase no existe y `409 CLASE_ARCHIVADA` cuando existe. El README está en "Se toca" de 01a. Se corrige en la próxima entrega del programador.
- **N-23 — Texto de ADM-1A13 en el plan (línea 531).** Pasa a "→ lanza `409 CLASE_ARCHIVADA` sin escribir; con una clase inexistente, `null`". Va en la Enmienda 5. Si el humano elige una opción sin enmienda, el orquestador lo registra en `aprobacion.md` como desviación aceptada.

### Detalles menores
- La relectura de `editarClase` selecciona `archivadaEn`, pero no lo usa: solo comprueba si la fila existe. Bastaría `select: { id: true }`. Sin efecto.

### Para el humano
1. **T-02:** elegir A (recomendada), B o C de la tabla de arriba. Cualquiera de las tres lleva una Enmienda 5 del arquitecto, con aprobación por escrito (carril sensible).
2. **Alcance de la regla:** si elige A, confirmar que la misma regla aplica a `GET /admin/usuarios` (01e). Decidir también el destino del roster y del gradebook (orden por nombre, ya existentes): riesgo en ESTADO §3 o un encargo aparte.

## Verificación de la Enmienda 5 — ADMIN-01

Veredicto: **CAMBIOS REQUERIDOS** (M-08 y M-09). El contrato de `shared/`, la tabla de §D-2, la lista cerrada, C-21 a C-24, N-22 y N-23 están bien. M-08 es solo de texto; M-09 trae una decisión para el humano.

Insumos:
- `plan.md`: 1197 líneas; SHA-256 `8bd99bfe51f07a4eb93bd288958a9f1096a98aa01a2c1184727afdb1be38ffe7` (comprobado).
- Copia previa: `copias-plan/plan-admin01-antes-enmienda5-a5bb1966.md`; SHA-256 `a5bb19668efebae23968c87dd857ea89561bc69ac950ba7ee81e54881f67a464` (comprobado).
- Sin CR ni caracteres invisibles en las líneas nuevas.

Verificación propia: `git diff --no-index` completo contra la copia, más grep sobre `backend/test`, `backend/src`, `frontend/src` y `shared/src`. **No corrí pruebas.** La enmienda solo cambia el texto del plan y la corrección del código aún no existe; ninguna afirmación de abajo depende de una corrida.

### Cotejo del diff
- `--numstat`: 211 inserciones y 19 borrados, en 36 hunks con `-U0`. Coincide con `aprobacion.md`.
- Cada hunk corresponde a un E5-n:

| Hunks (línea nueva) | E5-n |
|---|---|
| 2 (estado) | E5-14 |
| 213-243 (§D-2: regla, contrato, combinaciones y tabla) | E5-1 |
| 303 y 309 (§D-7.1 y §D-7.7) | E5-4 |
| 452-459 y 461 (`shared/` de 01a y 01e) | E5-2 y E5-4 |
| 470-474 y 476 (adapters de 01a, N-22 y 01e) | E5-3, E5-9 y E5-4 |
| 499-506 (handlers) | E5-3 y E5-4 |
| 525-534 (frontend) | E5-5 |
| 558 (fila de "Acceso a datos") | Ver el detalle menor 1 |
| 587-609 (ADM-1A08, 1A11, 1A13, 1A16 y 1A17) | E5-6 y E5-10 |
| 653, 684, 700, 708, 727, 757 y 778 (1C16, 1D202, 1D217, 1E02, 1E21, 1F18 y 1G14) | E5-6 |
| 787 (Puntos de ataque 3) | E5-12 |
| 802 y 816-818 (R-04, R-16, R-17 y R-18) | E5-11 |
| 852-879 (§D-R0 de 01a, C-21 a C-24) | E5-7 y E5-8 |
| 941-955 (grep por subentrega) | E5-7 |
| 960-961 (nota de la matriz) | E5-5 |
| 1016-1019 (A-07 bis, A-01 y A-02) | E5-11 |
| 1047-1054, 1066, 1074, 1082, 1087 y 1091 (pasos) | E5-13 |
| 1170-1197 (tabla) | — |

- Nada cambia fuera de la decisión del humano:
  - "Se toca" y "No se toca" no cambian;
  - no hay rutas, migraciones ni dependencias nuevas;
  - inscritas, impartidas, el roster y el gradebook no se tocan (R-16 y R-17).

### Problemas que bloquean

#### M-08 — Los riesgos de la posición no dicen qué queda sin cubrir
Dónde: R-16 a R-18 (`plan.md:816-818`), Puntos de ataque 3 (`:787`) y §D-2, tabla (`:234-243`).

Por qué importa: el humano eligió la opción A para cerrar las filas que se repiten o se saltan en silencio. La posición protege **solo la fila del cursor**. Si otra fila se mueve entre dos páginas, la siguiente sigue respondiendo `200` sin avisar:
- **Usuarios (01e, 01f y 01g):** página 1 [N1, N2], cursor N2. Si N4 se renombra a un nombre anterior a N1, la página 2 trae [N3, N5] y N4 se salta. Si N1 se renombra a un nombre posterior al cursor, vuelve en una página siguiente: la fila sale repetida, con la misma clave de React en la tabla.
- **Archivadas y anteriores:** una clase que todavía no se veía se restaura y se vuelve a archivar. Pasa a la cabeza y no se ve hasta reabrir la lista, igual que una clase recién archivada.

Ningún keyset lo evita sin una instantánea guardada, así que no es un defecto de la enmienda. Pero el plan no lo dice, y hay dos frases que el tester puede leer como garantía total:
- la frase original del punto de ataque 3: "que nunca se salte ni se repita una fila en silencio";
- la frase nueva: "nunca `200` con filas repetidas o saltadas".

Pasó lo mismo con T-02: el punto de ataque prometía algo que el diseño no daba.

Además, R-17 dice "que el humano dio por inmutables". El humano no decidió sobre inscritas ni impartidas: ese juicio salió del resumen del programador y lo repetí en mi arbitraje. Además, según la letra de la decisión ("toda lista de ADMIN-01 cuya clave de orden cambia"), las dos podrían entrar, porque 01a les agrega el filtro y su fila puede recrearse con otro `creado_en`.

Qué se espera:
- un riesgo nuevo (R-19) dice qué cubre la posición y qué no:
  - cubre la fila del cursor;
  - no cubre otra fila que se mueve entre dos páginas;
  - dice qué efecto tiene esa fila en cada lista y qué tan alcanzable es (hay una sola cuenta de administración, y sus propias ediciones invalidan la lista);
  - si se acepta tal cual, o si 01c, 01d2, 01f y 01g descartan por `id` las filas repetidas al juntar las páginas;
- el punto de ataque 3 delimita el ataque igual;
- R-17 corrige la atribución;
- el humano acepta R-17 y R-19 en la misma aprobación por escrito.

#### M-09 — La posición de `GET /admin/usuarios` escribe en el log de la API el nombre de un alumno junto a su estado de pago
Dónde:
- §D-7.1 (`plan.md:303`);
- ADM-1E21 (h) (`:735`);
- ADM-1F18 (a) y ADM-1G14 (a) (`:758` y `:779`).

Por qué importa: `ARCHITECTURE-ESSENTIALS.md`, "Operación", dice: "Logs JSON con `requestId` y `userId`, sin contraseñas, tokens ni datos de pago".
- Fastify registra cada petición en `info` con su `req.url` completa, consulta incluida (`node_modules/fastify/lib/logger-pino.js:50` y `log-controller.js:50`).
- `backend/.env.example` usa `LOG_LEVEL=info`.
- `config/logger.ts` solo censura encabezados y cuerpos, no la URL.
- Con la enmienda, cada «Cargar más» del filtro "Deudores" de `/admin/estado-pago` pide `…?rol=estudiante&estadoPago=deudor&cursor=<id>&cursorNombre=<nombre completo>`. Así, el log de producción guarda el nombre de un alumno identificable junto a `deudor`.
- `logs-02a-r1.ataque.test.ts:211` ya fija que "deudor" no aparece en el log de las rutas de gestión.

Parte del problema es anterior a la enmienda. Con el diseño de la Enmienda 1, la URL ya trae `estadoPago=deudor&cursor=<uuid>`, y por R-04 esa fila cumple el filtro. Es decir, el id ya quedaba ligado al estado de pago. La Enmienda 5 cambia ese id por el nombre en claro.

Qué se espera:
- ninguna línea del log de la API permite saber el estado de pago de una persona por su nombre ni por su id;
- la posición de la lista de usuarios no viaja en claro en una URL que se registra;
- 01e o 01g suman una prueba como `logs-02a-r1`: con `LOG_LEVEL=trace`, recorrer páginas de "Deudores" con «Cargar más» no deja en el log `deudor`, `al_corriente`, ni el nombre o el correo de las filas.

Caminos posibles; el arquitecto propone y el humano decide:
- (i) una posición opaca: el servidor emite y compara una huella del `nombre`. Mantiene todo lo demás de la Enmienda 5, pero no resuelve el `estadoPago=` en la URL.
- (ii) registrar la petición sin la consulta. Resuelve las dos cosas, pero toca `config/`, que está en "No se toca", y necesita la autorización del humano.
- (iii) aceptarlo como riesgo, desviándose de ESSENTIALS. Necesita la decisión explícita del humano.

M-09 solo afecta a 01e, 01f y 01g. Si el humano quiere que 01a no espere, puede aprobar ahora la parte de 01a de la Enmienda 5, con M-08 corregido, y dejar M-09 para una enmienda antes de 01e. Esa decisión es suya, no del orquestador.

### (a) Contrato de `shared/`: correcto
- **Cierra T-02.** El servidor compara la posición recibida con la clave actual de la fila, leída con el `findUnique` por PK de siempre (M-01). Revisé `listarClasesAdmin` en `adapters/db/clases.ts:439-490`: el `select` ya trae `archivadaEn`, así que no hay una lectura más. Hace falta comparar como texto con `toISOString()`, y la columna es `TIMESTAMPTZ(3)`. Con eso, la ida y vuelta es exacta, y un mismo instante escrito de otra forma da `400`.
- **No rompe las vigiladas:**
  - las cuatro llamadas directas de `lecturas-fx-r1.ataque` (`:342`, `:350`, `:732` y `:892`) van sin `estado`, y `cursorArchivadaEn` es opcional en la firma;
  - `:324-440` no cambia;
  - el corte de `:1125-1150` mira el cuerpo de `listarClasesAdmin` hasta el siguiente `export` y no gana escrituras;
  - el conteo de `instantaneaUnica` (`:805-825`) se cuenta sobre el texto, con comentarios incluidos: un comentario nuevo que nombre `instantaneaUnica` lo rompería, y por eso queda vigilado.
- **O-1 respetado:**
  - no hay mensajes propios ni `superRefine`, y `cursorArchivadaEn` es `z.string().optional()`;
  - el `400` sale de `errorCursorInvalido` del backend, que ya estaba en el inventario de `errores-ch3-r2.ataque:272`;
  - un parámetro repetido llega como arreglo y lo rechaza `validarParametros` (`handlers/validacion.ts:22-30`) con el texto por omisión de zod. El frontend nunca lo manda.
- **No hay hueco por el campo opcional de la respuesta de la lista del admin.** Quien decide es el servidor, por la combinación (a):
  - con `estado=archivadas` y `cursor` sin posición, responde `400`, nunca la repetición;
  - si alguna vez faltara `siguienteCursorArchivadaEn`, el cliente pediría sin posición y recibiría `400`, con la frase de lista cambiada;
  - el riesgo de que el handler olvide emitir el campo lo cubre ADM-1A11, que exige `null` (presente) en `activas` y sin `estado`; `toBeNull` falla con `undefined`.
- **La lista del admin sin `estado` no cambia.** Lo comprobé en la última aserción de ADM-T1A08 (`sinEstado`), en `clases-archivadas.integracion:499`, en `gestion-02a-r1.ataque:783-825`, en `lecturas-consistentes:290` y en `lecturas-fx-r1:531`.

### (b) Tabla de §D-2: completa
Revisé cada `GET` del plan:
- anteriores;
- la lista del admin en sus tres modos;
- inscritas e impartidas: `clases.ts:306` y `:369`, ordenadas por `creadoEn DESC, claseId DESC`;
- usuarios, incluida la de estado de pago;
- movimientos.

No falta ninguna. Las listas de `/admin/maestros` se ordenan por `creado_en` (`enlaces-registro.ts:50` y `:154`), que no cambia. La tabla no lo dice: ver el detalle menor 2.

### (c) Pruebas nuevas y lista cerrada: correctas
Grep propio sobre `backend/test`, `frontend/src` y `shared/src`.

Backend:
- Llamadas a `/api/clases/anteriores`: solo hay en `clases-archivadas.integracion` (ADM-1A08, `:344-407`), en `clases-archivadas-r1.ataque` y en `sesiones-y-cadena.ataque:626` y `:658`, que solo enumeran rutas.
- Llamadas a `/api/admin/clases?` con cursor: solo `clases-archivadas.integracion:477` y `:486` (ADM-1A11) llevan `estado=archivadas`; las demás van sin `estado`.
- Ninguna prueba compara el cuerpo completo de estas listas con `toEqual`; todas pasan por el esquema o leen `siguienteCursor`.

Frontend:
- Los dobles de `/api/admin/clases?` (`rutas-02c-r1`, `clases-r3`, `foco-02c-r3`, `foco-02c-r4`, `cargar-mas-02c-r2`, `clases-admin-02c-r1` y `clases-admin-view.test`) responden sin el campo nuevo, que es opcional. Reconocen la página siguiente con `includes("cursor=")`, y `cursorArchivadaEn=` no contiene esa cadena.
- Nadie llama a `/api/clases/anteriores`.
- `conCursor` es privado de `features/clases/hooks.ts:151`, y ninguna prueba lo importa.

La lista cerrada de 01a (ADM-1A08 `:318-397` y ADM-1A11 `:435-507`) es exacta. Las demás subentregas no cambian.

### (d) C-21 a C-24 y el rojo esperado: coherentes
Lo comprobé caso por caso contra `clases-archivadas-r1.ataque.test.ts:390-623`:
- **ADM-T1A06** queda en rojo: `recorrerAnteriores` pide la página 2 sin posición, recibe `400` y esperaba `200`.
- **ADM-T1A07** queda en verde:
  - las dos peticiones con cursor reciben `400` por (a), y `resumir` da `400 VALIDACION`;
  - `repetidasEnLaSiguiente` devuelve `[]` ante un `400`.
- **ADM-T1A07b** queda en rojo: la primera petición (`url(ids.centinela)`, sin posición) recibe `400` y esperaba `200`.
- **ADM-T1A08** queda en rojo solo por `conSuCursor` (`:602-603`):
  - la lista de `estado` malformado no lleva cursor;
  - `sinEstado` sigue en `200`;
  - `cursor=${clase.id}&cursor=${clase.id}` llega como arreglo y sigue dando `400`.
- C-23: las fechas (`segundo(6)` del centinela y `segundo(4)` de b) cuadran con la preparación de `:519-528`.

### (e) R-16, R-17, R-18 y A-07 bis
- **R-16 es honesto:**
  - las referencias se comprueban: `condicionesDePaginaDeAlumnos` en `inscripciones.ts:67-101`;
  - hoy ninguna ruta renombra alumnos; el único cambio de nombre está en `tokens-cuenta.ts:109`, y es del maestro por invitación;
  - es la decisión del humano.
- **R-17 está bien en el fondo** (`inscripciones.ts:274` y `maestros-de-clase.ts:74` y `:95` se comprueban: la fila recreada queda primera y solo repite), pero no en la atribución, y debe decidirlo el humano (M-08).
- **R-18 es honesto** y forma parte de la opción A estricta. Lo acepta el humano en la misma aprobación.
- **A-07 bis** está bien redactada y lleva su destino.
- Falta R-19 (M-08).

### (f) N-22 y N-23: resueltos en el texto
- **N-22:** el paso 7b.4 cita bien `adapters/README.md:197-198`, `:204` y `:208`.
- **N-23:** el nuevo texto de ADM-1A13 coincide con el título de la prueba del programador (`clases-archivadas.integracion.test.ts:588`).

### Detalles menores
1. La tabla E5-n no nombra la fila nueva de "Acceso a datos" (`plan.md:558`). Corresponde a E5-1 y E5-3.
2. La tabla de §D-2 deja las listas de `/admin/maestros` en "no cambian de contrato". Le falta el juicio de la clave: `creado_en`, que no cambia.
3. El plan cita `lecturas-fx-r1.ataque:1121-1147`, pero en el archivo actual el bloque está en `:1125-1150`.
4. Para el tester: el control opcional de C-23 ("→ `200` [c]") puede traer, además de c, una archivada más vieja de otra prueba (ADM-1A17 (g) usa "fechas que ninguna otra prueba usa", que podrían ser anteriores a 2020-03-07). Conviene afirmar que la página empieza en c, o usar `limite=1`.
5. ADM-1A16 (c): la variante "con `+00:00`" debe mandar `%2B`. Un `+` sin codificar llega como espacio: también da `400`, pero no prueba lo que dice.

### Para el humano
1. **M-09:** cómo cumplir "logs sin datos de pago" en la lista de usuarios y en la de estado de pago: (i) una huella como posición, (ii) registrar la URL sin la consulta (toca `config/`) o (iii) aceptarlo como riesgo. Decidir también si 01a sigue sin esperar a esta decisión.
2. **M-08:** aceptar o no R-19 (otra fila que se mueve entre dos páginas) y R-17 (inscritas e impartidas a ESTADO §3, fuera de ADMIN-01).

## Verificación de la corrección de la Enmienda 5 — ADMIN-01

Veredicto: **APROBADO.** M-08 y M-09 están resueltos tal como decidió el humano. No hay problemas que bloqueen. Quedan tres observaciones (N-24 a N-26) y dos detalles, que se pueden atender en su subentrega.

Insumos:
- `plan.md`: 1332 líneas; SHA-256 `066d9476fb1bb17301babf505eaeae1b6d904c227c7ac8cdd0c56a33a23f8a68` (comprobado).
- Copia: `copias-plan/plan-admin01-v6-enmienda5-8bd99bfe.md`; SHA-256 `8bd99bfe…` (comprobado).
- Decisiones del humano: `aprobacion.md`, entrada del 2026-11-04 ("Riesgo + descartar repetidas", "Log sin consulta", "A ESTADO §3" y "01a avanza ya").

Verificación propia:
- `git diff --no-index` completo contra la copia, más grep sobre `backend/test`, `backend/src`, `frontend/src`, `node_modules/fastify/lib` y `docs/ESTADO.md` en `8d98fba`.
- **No corrí pruebas.** El cambio es solo de texto del plan y no hay código nuevo que ejecutar.

### Cotejo del diff
`--numstat`: 156 inserciones y 21 borrados, en 32 hunks con `-U0`. Coincide con `aprobacion.md`.

| Hunk (línea nueva) | E5-n |
|---|---|
| 2 (estado) | E5-28 |
| 243-245 (§D-2: `/admin/maestros` por `creado_en`, alcance de la posición y descarte) | E5-20, E5-15 y E5-16 |
| 305 (§D-7.1, nota M-09) y 316-323 (§D-7.11) | E5-24 |
| 486 (adapters de 01e) | E5-24 |
| 545-555 (frontend: `unir-paginas.ts`) | E5-16 |
| 624 (ADM-1A16 c, `%2B`) | E5-22 |
| 679-686, 734, 798 y 829-833 (ADM-1C17, 1D218, 1F19 y 1G15) | E5-16 |
| 766-781 (ADM-1E21 i y ADM-1E22) | E5-17 y E5-25 |
| 838 (punto de ataque 3) | E5-17 |
| 873-886 (R-17 y R-19) | E5-18 y E5-15 |
| 890-896 (excepción a "No se toca") | E5-24 |
| 939 y 1316 (`:1125-1150`, en §D-R0 y en E5-7) | E5-19 |
| 947 (C-23) | E5-21 |
| 961-985 (01e: "Se toca", C-25 a C-32 y vigiladas) | E5-24 y E5-26 |
| 990 (01c, "Se toca") | E5-16 |
| 1036-1062 (grep por subentrega) | E5-16, E5-24 y E5-26 |
| 1124-1129 (A-07 bis, cierre de O-04, A-01 y A-02) | E5-18 y E5-27 |
| 1177, 1185, 1193, 1201 y 1205 (pasos 15, 19, 25, 28 y 30) | E5-16 y E5-25 |
| 1308-1332 (tabla) | — |

Fuera de las cuatro decisiones del humano no cambia nada:
- el contrato de `shared/`, C-21 a C-24 y el rojo esperado de 01a siguen igual;
- 01a no gana archivos;
- la única excepción a "No se toca" es la autorizada (`config/logger.ts`, solo en 01e).

### (a) R-19, punto de ataque 3 y R-17: correctos
- **R-19 (`plan.md:877-886`) tiene el alcance exacto:**
  - Dice qué cubre: la fila del cursor, con `400`.
  - Dice qué no cubre, con los dos ejemplos de usuarios: se salta N4 o se repite N1. La repetida se ve con el nombre viejo hasta reabrir la lista, porque el descarte se queda con la primera aparición.
  - Lo de las archivadas es correcto: una clase que todavía no se veía y se vuelve a archivar no aparece en el recorrido en curso; una que ya se vio no se repite, porque sube a la cabeza.
  - El alcance también se comprueba: la matriz de 01f (`:1089`) renueva "la ficha, la tabla de usuarios y `/admin/estado-pago`" al editar, y `useClasesAnteriores` se marca vieja al archivar y restaurar (`:413`).
- **El punto de ataque 3 (`:838`)** se acota a la fila del cursor. Declara el `200` por otra fila como "no es hallazgo" y redirige el ataque a lo que sí se mitiga: una fila pintada dos veces, una clave de React repetida, un id repetido en el lote y ningún `500`.
- **R-17 (`:873`)** corrige la atribución y registra la decisión del humano. A-07 bis lo anota (`:1124`).

### (b) Descarte por `id`: correcto
- `frontend/src/lib/unir-paginas.ts` y su prueba entran en "Se toca" de 01c (`:990` y `:1048`). 01d2, 01f y 01g lo importan desde archivos que ya tenían en "Se toca".
- Vive en `lib/` por la regla 5. Comprobé las pruebas estáticas que recorren todo `src/` (las cuatro de `lib/` vigiladas y las de `features/calificaciones`, `features/clases`, `features/tareas` y `components/layout`): todas miran su propio módulo o patrones que una función pura no usa. Ninguna enumera los archivos de `lib/`.
- Las pruebas alcanzan:
  - ADM-1C17 (a) cubre la función: orden, repetidas entre páginas y dentro de una página, páginas vacías y que no mute la entrada.
  - ADM-1C17 (b), ADM-1D218, ADM-1F19 y ADM-1G15 cubren cada lista: una sola fila, sin aviso de clave repetida y la tercera página con el cursor de la segunda respuesta.
  - En 01g, ADM-1G15 cubre la casilla única, "Seleccionar todas", la barra y `alumnoIds` sin repetidos, leído en el cuerpo de la petición.
- `useFocoAlCargarMas` (`features/clases/hooks.ts`) ya busca el primer id que no estaba antes y, si no hay ninguno, lleva el foco al encabezado. Por eso el descarte no deja el foco en `<body>`. Ver N-24.

### (c) M-09: correcto
- **El serializador conserva los campos.**
  - Fastify 5.12.5 une los serializadores del usuario sobre los suyos (`logger-factory.js:126`). Un `req` propio reemplaza solo `req`, y `res` y `err` siguen igual.
  - El plan pide los mismos campos que `logger-pino.js:47-54` (`method`, `url`, `version`, `host`, `remoteAddress` y `remotePort`), con `url` cortada en el primer `?`.
- **No rompe `redact`.** En pino, el serializador corre antes de la censura. Como el `req` serializado no lleva `headers` ni `body` (igual que hoy en Fastify), las rutas `req.headers.*` y `req.body.*` quedan sin objeto, sin error. El caso `{ req: { body } }` de `config/logger.ataque.test.ts:60-82` sigue sin dejar secretos, porque el cuerpo ya no se serializa. Queda vigilado.
- **Excepción a "No se toca"** (`:890-896`): solo el archivo, solo en 01e y solo `serializers.req`; `redact`, `level` y la firma no cambian; las pruebas van en archivos nuevos. Es el alcance que autorizó el humano.
- **ADM-1E22** se corre con `LOG_LEVEL: "trace"`:
  - cubre `estadoPago` (`deudor` y `al_corriente`), `q` con parte del correo, `cursorNombre` con espacios y ñ, la lista de archivadas con su posición y los candidatos con `q`;
  - sus precondiciones exigen la línea "incoming request" con su ruta, así que la ausencia de fugas no se debe a un log vacío;
  - no hay otra fuente de esos valores en el log: comprobé que Prisma no registra consultas (`adapters/db/cliente.ts`) y que nada de `src/` llama a `.trace(` ni a `.debug(`.
- **Grep de las pruebas que leen la URL del log.** Busqué `req.url`, `req?.url`, `centinela=`, "incoming request" y "request completed" en `backend/test` y `backend/src`:
  - **Son exactamente los ocho archivos de C-25 a C-32**, con las líneas citadas bien: `find(l => l.req?.url === urlCentinela)` en `:86` de `logs-r2` y en `:62`, `:65` o `:67` de los demás, y la definición de `urlCentinela = "/api/salud?centinela=…"` en las líneas que da el plan.
  - Los demás aciertos no dependen de la consulta:
    - `admin-muro-02b-r1.ataque:272-276` y `tareas-01b-r1.ataque:668-671` leen `r.raw.req.url` de la respuesta de `inject`, no del log;
    - `logs-r2:216-249` compara `/api/me`, `/api/auth/login` y `/api/auth/refrescar`, sin consulta;
    - `logs-03a-r1:279-282`, `logs-03b-r1:259-261` y `logs-03c-r1:228-229` comparan caminos sin consulta. `logs-03b-r1:175` pide `?limite=5`, pero su `toContain("/api/admin/enlaces-registro")` sigue cumpliéndose;
    - `logs-muro-c-r1:230` y `logs-muro-c-r2:243` cuentan con `includes("/api/clases/")`. Las peticiones con `?cursor=` de `logs-muro-c-r2:176-181` siguen contando igual;
    - `logs-02a-r1` pide con `?q=` y `?limite=`, pero no afirma la consulta;
    - las demás pruebas que construyen la app usan `LOG_LEVEL` `error` o `warn` y no leen URLs.
  - Ninguna prueba normal lee la URL del log, así que la lista cerrada de 01e no crece. **C-25 a C-32 están completos.**
- **O-04 de CLASES-02a** es exactamente esta fila: "el log de cada petición incluye la consulta de la URL… decidir si `config/logger.ts` omite la consulta". Está en `docs/ESTADO.md:403` de `8d98fba`, y el plan dice `:404` (detalle 2). Su cierre en 01e es correcto. A-01 y A-02 (`ARCHITECTURE.md:497`, fila "Logs") se actualizan.

### (d) Detalles de la verificación anterior: los cinco atendidos
- 1 en E5-23;
- 2 en E5-20;
- 3 en E5-19;
- 4 en E5-21;
- 5 en E5-22.

### Problemas que no bloquean
- **N-24 — El foco tras el descarte (estado vecino).** El caso que falta es la última página con solo filas repetidas: el foco debe ir al encabezado, nunca a `<body>`. Lo mismo cuando la primera fila de la página nueva es repetida: el foco debe ir a la primera fila nueva de verdad. El gancho ya lo resuelve, pero ninguna de ADM-1C17 (b), 1D218, 1F19 ni 1G15 lo prueba. Conviene sumarlo como un caso más en la subentrega (sin enmienda) o dejarlo para el tester de 01c.
- **N-25 — A-05 (`CLAUDE.md`) no nombra `lib/unir-paginas.ts`.** "Ubicaciones compartidas" enumera cada archivo de `lib/`. Se agrega al cierre, junto con lo demás de A-05.
- **N-26 — Caso unitario de `opcionesDeLogger` en ADM-1E22.** "no deja `"s"`" usa un valor de un solo carácter: comprobar que no aparece no prueba nada. Se usa un valor distintivo, por ejemplo `secreto-cuerpo-1e22`, y se comprueba que no aparece.

### Detalles menores
1. ADM-1E21 (i) afirma el salto de R-19 como comportamiento esperado. Si un encargo posterior agrega instantáneas, esa prueba cambia. El plan ya lo dice ("documenta el riesgo aceptado, no lo cierra").
2. `plan.md:1125` dice "línea 404 en `8d98fba`" para O-04, pero en ese commit es la `:403`; la 404 es la del árbol de trabajo actual.

### Resumen para el humano
1. **Qué aprueba:** la Enmienda 5 corregida. El cursor de las listas que cambian de orden lleva su posición: clases anteriores, archivadas del admin y usuarios. Si la fila del cursor se movió, la lista dice "La lista cambió mientras la veías".
2. **Descarte de repetidas:** las listas de clases del admin, de clases anteriores, de usuarios y de estado de pago descartan las filas repetidas al cargar más. Así una fila no se pinta dos veces y un lote nunca manda un alumno repetido.
3. **Log sin consulta:** desde 01e, el log de la API registra la ruta sin la consulta, con autorización acotada a `config/logger.ts`. Ningún estado de pago, nombre, correo ni término de búsqueda queda en el log. Se cierra O-04 de CLASES-02a.
4. **Riesgos que acepta:**
   - R-19: si se mueve **otra** fila entre dos «Cargar más», puede saltarse sin aviso hasta reabrir la lista (en usuarios, solo con otra pestaña del admin; en las archivadas, la clase vuelta a archivar no se ve durante ese recorrido).
   - R-18: renombrar solo con mayúsculas también pide reabrir.
   - R-16 y R-17: el roster, el gradebook, inscritas e impartidas van a ESTADO §3, con destino a un encargo posterior.
5. **Qué sigue:** 01a avanza sin cambios de fondo: la corrección del programador, la ronda 2 del tester con C-21 a C-24 y mi verificación.

## Verificación de la corrección de la ronda 1 — ADMIN-01a

Fecha: 2026-11-05. Plan vigente: `plan.md`, SHA-256 `066d9476fb1bb17301babf505eaeae1b6d904c227c7ac8cdd0c56a33a23f8a68` (comprobado). Resumen: `resumen-programador.md`, 260 líneas, SHA-256 `7bd7e8eba9288ff8340d66e4eb9d1900affcc9f10a037478f6ae7e347a6e7182` (comprobado), secciones "Corrección ronda 1" (T-01, ya revisado en el arbitraje) y "Corrección ronda 1 — T-02 (Enmienda 5)".

Veredicto: **PENDIENTE: PARADA por PA-01.** Lo que se puede verificar sin Testcontainers coincide con el resumen y con el plan. La suite del backend y `npx vitest list` del backend **no se corrieron**, así que sus cifras (2858 casos, 241 archivos, 37 ADM-1A, el rojo exacto de ADM-T1A06, 07b y 08, ADM-T1A07 en verde y PA-07) quedan **sin verificar**. No las doy por buenas.

### PA-01: la red activa no está cubierta por la regla del firewall

- `Get-NetConnectionProfile`: la única red activa es **`uacam5 2`**, en categoría **Private**.
- La regla "Campus: bloquear entrada a Docker en redes publicas" existe y está habilitada (Inbound, Block, `com.docker.backend.exe`), pero **solo en el perfil Public**. Docker 28.5.1 está encendido.
- `AGENTS.md` ("Pruebas") dice que la regla solo cubre el perfil en que se crea: una red no confiable clasificada como Privada no queda cubierta. `mitigacion-ryuk.md` declara `uacam5 2` no confiable. ESTADO §5 dice que cada declaración de confianza vale solo para su sesión. La última fue la del 2026-11-04, en CALIFICACIONES-02. En `aprobacion.md` de ADMIN-01 no hay ninguna para hoy.
- `npx vitest list` del backend tampoco se puede correr. Vitest 4.1.11 ejecuta el `globalSetup` al recolectar (`collectTests` llama a `initializeGlobalSetup`, `node_modules/vitest/dist/chunks/cli-api.CnMVyzaz.js:13774`). Eso levantaría Testcontainers y Ryuk.
- **Pregunta para el orquestador:** el resumen no dice en qué red corrió el programador la suite del backend hoy (archivos de las 07:35 a las 07:39 y resumen de las 07:58). Si fue `uacam5 2` sin una declaración del humano, es una desviación de proceso y el humano debe saberlo.

**Para reanudar:** el humano declara `uacam5 2` de confianza para la sesión del 2026-11-05 (queda en `aprobacion.md`) o se cambia a `IZZI-F281` o `IZZI-F281-5G`. Después corro solo lo que falta: la suite del backend y `npx vitest list` con `grep -a`. Si esas cifras coinciden, el veredicto pasa a ACEPTADO sin repetir el resto.

### Contrato de `shared/` y adaptadores contra §D-2 (Enmienda 5) y M-01: cumple

- **`shared/src/clases.ts` e `index.ts`.** Están `listaClasesAnterioresConsultaSchema = paginacionSchema.extend({ cursorArchivadaEn: z.string().optional() })` y su tipo. `listaClasesAdminConsultaSchema` suma `cursorArchivadaEn: z.string().optional()`. `siguienteCursorArchivadaEn` es `z.iso.datetime().nullable()`: obligatorio en anteriores y `.optional()` en la lista del admin. `cursor` sigue siendo `z.uuid()` y `paginacionSchema` no cambia. No hay mensajes propios ni `superRefine`, ni literales nuevos con la forma `"<nombre>: …"` (O-1). Todo coincide con §Cambios `shared/`.
- **Un solo error.** Los dos adaptadores lanzan siempre `errorCursorInvalido()`, `new AppError("VALIDACION", "cursor: no es válido", 400)`. Está definido con el mismo texto en `clases.ts:266` y en `clases-archivadas.ts:13`, como permite el plan ("lo reutiliza o lo copia con el mismo texto"). No hay ningún otro texto. Un `cursorArchivadaEn` repetido llega como arreglo y da el `400` de `validarParametros` con su propio campo: el plan lo acepta en §D-2.
- **Comparación de texto exacto.** En `clases-archivadas.ts:179` está `delCursor.clase.archivadaEn.toISOString() !== cursorArchivadaEn` y en `clases.ts:474`, `claseDelCursor.archivadaEn?.toISOString() !== cursorArchivadaEn`, sin interpretar la fecha. El texto vacío, la fecha sin milisegundos y la escrita con `+00:00` dan `400`.
- **M-01 sin cambio.** El cursor se sigue leyendo con `inscripcion.findUnique` o `maestroDeClase.findUnique` (por `claseId_usuarioId` o `claseId_maestroId`) y con `clase.findUnique({ where: { id }, select: { id: true, archivadaEn: true } })`. No hay `findFirst`, ni una lectura más, ni un índice nuevo, y todo sigue en `instantaneaUnica`.
- **Combinaciones (a) a (f).**
  - Anteriores: (a) y (b) se deciden antes de leer, con `(cursor === undefined) !== (cursorArchivadaEn === undefined)`; después vienen (e) y (d).
  - Admin: (c) es `!conPosicion && cursorArchivadaEn !== undefined`, y (a) y (b) solo valen con `archivadas`. Después vienen `cumpleElEstado` (e) y la posición (d).
  - `siguienteCursorArchivadaEn` sale solo con página siguiente, y en el admin solo con `archivadas`.
  - `listarClasesAdmin` deja `cursorArchivadaEn` opcional en su firma, así que las llamadas de `lecturas-fx-r1.ataque` no cambian.
- **Handlers.** No comparan nada. Validan con el esquema, pasan el valor y lo serializan con `toISOString()` o `null`. La cadena de `protegido()` no cambia.

### Pruebas requeridas de la Enmienda 5: cubiertas

- **ADM-1A08** (`clases-archivadas.integracion.test.ts:318`, mismo título). El recorrido con `limite=1` manda `cursor` y `cursorArchivadaEn`. En cada página comprueba que la posición sea el `archivadaEn` de la última clase y que sea `null` exactamente cuando `siguienteCursor` es `null`. Los cursores de una activa, de una ajena y uno inexistente van con una posición bien formada y esperan el cuerpo exacto `400`. Los dos perfiles se cubren.
- **ADM-1A11** (`:445`, mismo título). Están las cinco viñetas: la página siguiente con posición; la posición en `archivadas` y `null` en `activas` y sin `estado`, también con `siguienteCursor`; el cursor de una activa con posición bien formada → `400`; las cuatro combinaciones con `activas` o sin `estado` → `400` exacto; sin `estado` con el cursor de una archivada y sin posición → `200`.
- **ADM-1A16** (`clases-archivadas-posicion.integracion.test.ts`, alumno y maestro). Cubre (a) el control [C, D] con la posición `null` al final; (b) restaurada y vuelta a archivar por la API → `400` exacto; (c) las cuatro variantes, con `%2B00:00` codificado (E5-22); (d) y (e). Todos los `400` comparan el cuerpo completo.
- **ADM-1A17** (ídem, dos casos). (a) a (e) con el admin; (f) directo en la base con `archivarClaseDePrueba`, con un control previo `200` [d]; (g) un tramo propio de 2019 con tres empatadas, recorrido desde un centinela real con `limite` 1, 2 y 3, y cada clase una sola vez en orden.
- **Rojo esperado, revisado en el código** (no en una corrida):
  - ADM-T1A06 (`recorrerAnteriores`), ADM-T1A07b (`cursor=centinela` en la primera petición) y la última aserción de ADM-T1A08 (`conSuCursor`) mandan `cursor` sin posición. Con (a) responden `400`, la causa declarada.
  - ADM-T1A07 tolera `400`, así que debería quedar en verde.
  - Falta confirmarlo con la corrida (PA-01).

### Hermanos y estados vecinos: completos y fieles al código

Cada fila de la tabla del resumen corresponde a una rama del código: la posición válida; la clase restaurada (anteriores: `archivadaEn === null`; admin: `cumpleElEstado`); la clase vuelta a archivar por la API o directo en la base (d); la posición sin cursor y el cursor sin posición (a y b); el otro formato (d); y la clase activa, ajena o inexistente (e). La lista del admin sin `estado` o con `activas` (c) y la posición `null` también coinciden. No aparecen dos estados que el código ya cubre:
- la clase del cursor borrada, o el alumno o maestro retirado de ella: `findUnique` devuelve `null` y responde `400`, igual que "inexistente";
- el parámetro repetido: `400` de `validarParametros`, aceptado en §D-2.

Tampoco aparece el empate de fechas con un cursor distinto. No hace falta: el keyset usa `(archivada_en, id)` de la fila. Nada de esto devuelve el resumen. Inscritas e impartidas quedan sin cambio, con su razón. R-19 está declarado.

### N-22, V-01, "No se toca", M-09 y `lib/unir-paginas.ts`

- **N-22: aplicado.** `adapters/README.md:197-200` describe la relectura de `editarClase`: `null` si la clase no existe (`403`) y `409 CLASE_ARCHIVADA` si existe. Los párrafos de `listarClasesAdmin` (`:207`) y de `listarClasesAnteriores` (`:211`) suman la posición. `handlers/README.md:40` y `:60` también la nombran.
- **V-01: 250 filas.** El repositorio tiene 250 `*.ataque`. Contra `8d98fba` solo cambian cuatro, todas del tester: `sesiones-y-cadena` `d1673261…` (C-1), `lecturas-fx-r1` `7a736551…` (C-2), `archivos-d-r1` `87add258…` (N-20) y `clases-archivadas-r1` `c3f5df14…`, que es nueva. Las cuatro coinciden con los hashes declarados en `reporte-tester.md` y `aprobacion.md`. El programador no tocó ninguna.
- **"No se toca", contra `8d98fba`.** `git diff --name-only` y los archivos sin rastrear dan el mismo conjunto que en mi verificación del resumen de 01a, más `clases-archivadas-posicion.integracion.test.ts`, que es nuevo. Por las horas de modificación, esta corrección solo tocó lo que el resumen lista: `shared/src/clases.ts`, `shared/src/index.ts`, los dos adaptadores, los dos handlers, los dos README y los dos archivos de prueba propios (de 07:35 a 07:39). Las pruebas de la lista cerrada (E6, CAL-1A17 y las estáticas) no cambian desde el 2026-11-04. Ignoré `docs/trabajo/DEPLOY-investigacion-vps.md`, que es ajeno.
- **M-09 y `lib/unir-paginas.ts`: sin tocar.** `git diff 8d98fba -- backend/src/config frontend/` está vacío y `frontend/src/lib/unir-paginas.ts` no existe.

### Cifras: resumen contra mi corrida

Una suite después de otra. Antes de la suite del frontend medí dos veces la carga con 25 % o menos y comprobé que no hubiera otro `vitest`. No terminé ningún proceso ajeno.

| Paquete | Comando | Resumen | Manager |
|---|---|---|---|
| shared | `npm run build` | exit 0 | exit 0 (`> tsc -p tsconfig.json`) |
| shared | `npm run lint` | `All matched files use Prettier code style!` | igual |
| backend | `npm run lint` | exit 0 | exit 0 (`> tsc -p tsconfig.json --noEmit && tsc -p tsconfig.test.json`) |
| backend | `npm run build` | exit 0 | exit 0 (`> tsc -p tsconfig.json`) |
| backend | `npm run test` | `Tests  3 failed \| 2855 passed (2858)` · `Test Files  1 failed \| 240 passed (241)` | **no corrida (PA-01)** |
| backend | `npx vitest list` con `grep -a` | 2858 casos · 241 archivos · 37 ADM-1A | **no corrida (PA-01)** |
| backend | PA-07 | 0/0/0/0 · 5 `P2028` · 10 "Error no controlado" | **sin verificar (PA-01)** |
| frontend | `npm run lint` | exit 0 | exit 0 (`> tsc -b`) |
| frontend | `npm run build` | `✓ built in 2.15s` | `✓ built in 1.52s` |
| frontend | `npm run test` | `Tests  6062 passed (6062)` · `Test Files  281 passed (281)` | `Tests  6062 passed (6062)` · `Test Files  281 passed (281)` (segunda corrida, `npx vitest run`, 264.5 s) |

La primera corrida del frontend (`npm run test`, con 23 % y 7 % de carga al arrancar) cayó por la carga ajena que subió después. Tardó 2005 s y la importación sola sumó 7096 s. Dio `Tests  5 failed | 6039 passed (6044)` y `Test Files  5 failed | 274 passed (279)`: tres `Test timed out in 15000ms`, dos elementos que no aparecieron a tiempo y dos `[vitest-pool]: Timeout starting forks runner`, que dejaron dos archivos sin arrancar. Los cinco archivos que fallaron, corridos solos, dieron `Tests  51 passed (51)`. Como no pude identificar en la salida los dos archivos que no arrancaron, repetí la suite completa con la carga entre 0 % y 12 %, y salió en verde con las cifras del resumen. Ninguna falla tenía que ver con ADMIN-01a, que no toca `frontend/`.

### No bloquea

- **N-27: el resumen no registra PA-01.** La sección "Verificación" de la corrección de T-02 trae la puerta de carga, pero no dice en qué red ni con qué perfil corrió la suite del backend. Desde la ronda 0 de ADMIN-01, cada corrida del backend deja escrito PA-01. Lo pido en el siguiente resumen.

### Detalles menores

- En `clases-archivadas.integracion.test.ts` (ADM-1A08), el recorrido arma `encodeURIComponent(posicion ?? "")`. En `clases-archivadas-posicion.integracion.test.ts` (ADM-1A17 g) aparece `recorridas.includes(ultima ?? "")`. En las dos pruebas, si falta el dato, la prueba falla igual: no ocultan nada. Aun así, son valores por defecto silenciosos y lo correcto es una precondición que lance un error con su mensaje. Se puede atender en cualquier ronda.

### Para el tester en la ronda 2 (cuando se reanude y se confirmen las cifras)

- **C-21 a C-24** tal como los fija §D-R0 de 01a. Con ellos, ADM-T1A06, 07b y 08 deben quedar en verde y ADM-T1A07 debe esperar el `400` exacto en los dos pasos.
- **Qué conviene atacar:**
  - (1) Variantes de la posición fuera de la tabla del programador: un valor muy largo, con caracteres de control o codificado dos veces, y `cursorArchivadaEn` repetido (debe dar `400 VALIDACION` y nunca `500`).
  - (2) La clase del cursor que deja de ser del perfil entre dos páginas: el alumno dado de baja o el maestro retirado de ella. Debe dar `400` y no una página de otra persona.
  - (3) Empates de fecha: el cursor de una clase empatada con la posición de su par. El keyset no debe saltar ni repetir dentro del empate.
  - (4) `HEAD /api/clases/anteriores` con y sin posición: el mismo código que `GET`.
  - (5) Dos vueltas de restaurar y archivar la misma clase entre páginas, en la lista del admin y en anteriores.
  - (6) Que ninguna respuesta `400` de estas listas lleve otro texto que "cursor: no es válido", salvo la del parámetro repetido.
- **R-19** (otra fila que se mueve entre páginas) es un riesgo aceptado. No se reporta como hallazgo.
- **O-R1-1** (una archivada con 0 maestros) sigue con destino a 01e.

### Veredicto

**PENDIENTE: PARADA por PA-01.** El resumen no vuelve al programador: lo que pude verificar coincide. Esto incluye el contrato de `shared/`, los dos adaptadores (un solo texto de error y comparación exacta), ADM-1A08, 1A11, 1A16 y 1A17, la tabla de hermanos y estados vecinos, N-22, V-01 (250), "No se toca", M-09 y `unir-paginas.ts`, y las cifras de shared y del frontend. Falta lo único que exige Testcontainers: la suite y el listado del backend (2858 casos, 241 archivos, 37 ADM-1A, el rojo exacto y PA-07). Lo corro en cuanto el humano resuelva PA-01. Si coincide, el veredicto pasa a **ACEPTADO** y sigue la ronda 2 con lo de arriba.

### Reanudación tras PA-01 (2026-11-05)

El humano cambió el equipo a la red de Izzi. Antes de correr lo comprobé yo:
- `Get-NetConnectionProfile`: **`IZZI-F281-5G`, Public**.
- Regla "Campus: bloquear entrada a Docker en redes publicas": habilitada, Inbound, Block, perfil Public. El perfil Public del firewall está activo.
- Docker 28.5.1. Carga 11 % y 11 % antes del listado, y 9 % y 13 % antes de la suite. Ningún `node` con `vitest`.

Solo corrí lo que había quedado pendiente: una suite, después de que terminó el listado.

| Comprobación | Resumen | Manager |
|---|---|---|
| `cd backend; npx vitest list`, casos (`grep -a " > " \| wc -l`) | 2858 | 2858 |
| archivos (`grep -a " > " \| cut -d' ' -f1 \| sort -u \| wc -l`) | 241 | 241 |
| `grep -a -c "ADM-1A"` | 37 | 37 (y 15 `ADM-T1A`) |
| `npm run test` | `Tests  3 failed \| 2855 passed (2858)` · `Test Files  1 failed \| 240 passed (241)` | `Tests  3 failed \| 2855 passed (2858)` · `Test Files  1 failed \| 240 passed (241)` (168.35 s; no cayó nada por la carga) |
| Las rojas | ADM-T1A06, ADM-T1A07b, ADM-T1A08 | exactamente esas tres, todas de `clases-archivadas-r1.ataque.test.ts` |
| ADM-T1A07 | verde | verde (los otros 12 casos del archivo pasan) |
| PA-07: `40P01` · `deadlock detected` · `could not serialize` · `too many clients` | 0 · 0 · 0 · 0 | 0 · 0 · 0 · 0 |
| PA-07: `"code":"P2028"` | 5 | 5 |
| PA-07: "Error no controlado" | 10 (5 búsqueda, 1 sesión, 1 "boom", 3 `ZodError` del almacén) | 10: 5 "fallo simulado de la base en la búsqueda", 1 "fallo simulado de la base al crear la sesión", 1 "boom" y 3 `ZodError`. Ninguno de 01a |

Las tres rojas fallan por la causa que se declaró: el cursor va sin posición y la respuesta es el cuerpo exacto de §D-2.
- **ADM-T1A06 y ADM-T1A07b:** `AssertionError: {"error":{"codigo":"VALIDACION","mensaje":"cursor: no es válido"}}: expected 400 to be 200`.
- **ADM-T1A08:** `AssertionError: expected '400 VALIDACION' to be '200'`.

Todas las cifras del resumen coinciden con mi corrida. N-27 sigue en pie: el resumen no dice en qué red corrió el programador. Lo pido en el siguiente resumen. No bloquea.

### Veredicto final de esta verificación

**ACEPTADO.** Reemplaza el "PENDIENTE: PARADA por PA-01" de arriba.

La corrección de T-02 (Enmienda 5) y la de T-01 cumplen el plan `066d9476…`:
- el contrato de `shared/` y los dos adaptadores siguen §D-2 y M-01, con un solo texto de error y comparación de texto exacto;
- ADM-1A08, 1A11, 1A16 y 1A17 cubren sus viñetas;
- la tabla de hermanos y estados vecinos está completa;
- N-22 está aplicado;
- V-01 da 250 pruebas `*.ataque`;
- "No se toca" está limpio, y M-09 y `lib/unir-paginas.ts` siguen sin tocar.

Las cifras de shared, backend y frontend coinciden.

Sigue la **ronda 2 del tester**, con C-21 a C-24 y los ataques recomendados en "Para el tester en la ronda 2". Esas recomendaciones siguen vigentes sin cambios. Al terminar la ronda, ADM-T1A06, 07b y 08 deben quedar en verde y ADM-T1A07 debe esperar el `400` exacto.

## Revisión final — ADMIN-01a

Fecha: 2026-11-05. Plan: `plan.md`, SHA-256 `066d9476fb1bb17301babf505eaeae1b6d904c227c7ac8cdd0c56a33a23f8a68` (Enmiendas 1 a 5), comprobado. Tester: `reporte-tester.md`, SHA-256 `9fe41078b6c5534ff73c5353baf7d33674e13e872ebc72be40ece66727257f30` (comprobado), ronda 2 RESISTE desde la línea 542. Programador: `resumen-programador.md`, SHA-256 `7bd7e8eba9288ff8340d66e4eb9d1900affcc9f10a037478f6ae7e347a6e7182`. Base de "No se toca": `8d98fba`. Ignoré `docs/trabajo/DEPLOY-investigacion-vps.md`, que es ajeno.

Veredicto: **APROBADO**
Verificación propia: lint 0 en los tres paquetes · test backend `2864 passed (2864)` en 242 archivos, frontend `6062 passed (6062)` en 281 · build 0 en los tres paquetes (frontend `✓ built in 760ms`)

### Entorno y corridas
- **PA-01:** `Get-NetConnectionProfile` dio `IZZI-F281-5G`, perfil Public. La regla "Campus: bloquear entrada a Docker en redes publicas" está habilitada (Inbound, Block, Public) y el perfil Public del firewall está activo. Docker 28.5.1.
- **Puerta de carga:**
  - antes del backend, 3 % y 0 %;
  - antes del frontend, 16 % y 13 %;
  - en las dos, ningún `node` con `vitest`.
- Corrí una suite después de otra, una sola vez cada una, y ninguna cayó por carga. La app de escritorio de ChatGPT/Codex seguía abierta (17 procesos; N-21).

| Paquete | Comando | Tester (ronda 2) | Manager |
|---|---|---|---|
| shared | `npm run build` | — | exit 0 (`> tsc -p tsconfig.json`) |
| shared | `npm run lint` | — | `All matched files use Prettier code style!` |
| backend | `npm run lint` | exit 0 | exit 0 (`> tsc -p tsconfig.json --noEmit && tsc -p tsconfig.test.json`) |
| backend | `npm test` | `Tests  2864 passed (2864)` · `Test Files  242 passed (242)` | `Tests  2864 passed (2864)` · `Test Files  242 passed (242)` (169.42 s) |
| backend | `npm run build` | exit 0 | exit 0 |
| backend | `npx vitest list` con `grep -a` | 2864 casos · 242 archivos · 6 `ADM-T2A` | 2864 casos · 242 archivos · 37 `ADM-1A` · 15 `ADM-T1A` · 6 `ADM-T2A` |
| backend | PA-07 | 0/0/0/0 · 5 `P2028` · 10 "Error no controlado" | 0/0/0/0 · 5 `"code":"P2028"` · 10: 5 "fallo simulado de la base en la búsqueda", 1 "al crear la sesión", 1 "boom" y 3 `ZodError` del almacén. Ninguno de 01a |
| frontend | `npm run lint` | exit 0 | exit 0 (`> tsc -b`) |
| frontend | `npm run test` | `Tests  6062 passed (6062)` · `Test Files  281 passed (281)` | `Tests  6062 passed (6062)` · `Test Files  281 passed (281)` (272.47 s) |
| frontend | `npm run build` | `✓ built in 908ms` | `✓ built in 760ms`, exit 0 |

Todas las cifras del tester coinciden con mi corrida.

### Problemas que bloquean
Ninguno.

### (a) 01a contra su parte del plan: cumple

`git diff 8d98fba` y los archivos nuevos, contra los pasos 1 a 7 y 7b. Se hizo lo planeado, solo lo planeado y todo lo planeado.

- **Pasos 1 y 7b.1 (`shared/`):**
  - `estadoDeClasesSchema`;
  - `archivadaEn` en las respuestas de clase y en la lista del admin;
  - `listaClasesAnterioresConsultaSchema`;
  - `cursorArchivadaEn` en la consulta del admin, como `z.string().optional()` y sin mensaje propio (O-1);
  - `siguienteCursorArchivadaEn` como `z.iso.datetime().nullable()`;
  - `cursor` sigue siendo `z.uuid()`.
- **Paso 2 (`core/clases/archivada.ts`):** es puro. `evaluarClaseArchivada` queda cerrada por defecto, y `errorAlArchivar` y `errorAlRestaurar` usan los textos de §D-12.
- **Paso 3 (migración `20261104234335_admin_01_clases_archivadas`):**
  - **Contenido:** el `ADD COLUMN` nulo de Prisma, más el bloque a mano de R-02: el `CHECK` `clases_activa_segun_archivada` y los dos índices parciales con su predicado.
  - **Compatible hacia atrás:** la columna es nula, las filas de hoy cumplen el `CHECK` y un backend anterior no escribe ninguna de las dos columnas. Revertir el código no rompe la base. El orden de despliegue es R-09, para DEPLOY.
  - **Deriva:** la de E1-11 dio "No difference detected." en la verificación del resumen, y la migración no cambió desde entonces (17:43 del 2026-11-04).
- **Pasos 4 y 7b.2 (adaptadores):**
  - `archivarClase` y `restaurarClase` hacen un `updateMany` condicionado que escribe las dos columnas juntas, y releen por PK para responder 403 o 409.
  - Las inscritas, las impartidas y la lista del admin filtran también el `total`.
  - El cursor se lee siempre con el `findUnique` por PK de M-01.
  - `listarClasesAnteriores` y `listarClasesAdmin` comparan la posición como texto exacto, con las combinaciones (a) a (f).
  - Todo corre en `instantaneaUnica`.
- **§D-3 (`unirseConCodigo`):**
  - Es una transacción con `$queryRaw` etiquetado y parametrizado, con `FOR SHARE`.
  - Si la clase está archivada o no existe, devuelve `null`, y el handler responde el mismo `404 CODIGO_INVALIDO`.
  - `editarClase` filtra `archivadaEn: null` y relee por PK (T-01).
  - Se retiraron `buscarClasePorCodigo` e `inscribir`.
- **Paso 5 (`middleware/`, §D-1, DH-01):**
  - `protegido()` valida la opción al construir la ruta.
  - `resolverClaseDeLaRuta` decide la clase archivada **después** de `evaluarPertenencia`: primero responde 403 y después 409.
  - `guarda-de-rutas.ts` y los cinco primeros pasos no cambian.
- **Pasos 6 y 7b.3 (handlers):**
  - Hay 22 rutas `"lectura"`, 2 `"lectura-del-alumno"` y 2 `"gestion"`.
  - Las demás quedan cerradas, incluidas `GET …/codigo`, `GET …/alumnos/candidatos`, `PUT /admin/clases/:claseId` y la gestión de maestros (P-01 a′).
  - Los handlers no comparan roles ni estados: validan, llaman al adaptador y serializan.
- **Pasos 7 y 7b.5 (pruebas):**
  - ADM-1A01 a 1A17 están en 6 archivos nuevos, con 37 casos (`grep -a -c "ADM-1A"` sobre `npx vitest list`).
  - En las verificaciones anteriores revisé el cuerpo de cada caso contra su viñeta: 1A01 a 1A15, y 1A08, 1A11, 1A16 y 1A17 de la Enmienda 5.
  - No cambiaron desde entonces. Todos los archivos de producción y las pruebas normales se modificaron por última vez a las 07:39 del 2026-11-05, antes de mi última verificación (09:01).
- **Lista cerrada:**
  - Solo cambiaron CAL-1B08, CAL2-A08, E4-1 (E6) y E4-2 (CAL-1A17), con el alcance exacto del plan, más las pruebas propias de la Enmienda 5.
  - Ninguna otra prueba normal cambió.
- **Vigiladas, sin cambio:**
  - `lecturas-fx-r1:324-440` y `:1125-1150`;
  - `lecturas-consistentes` (PR-FX-03a, 03b y 04);
  - `gestion-02a-r1:783-825`;
  - `gestion-clases.integracion`;
  - `clases-r1:561-585`;
  - las estáticas de E4-1.

  Todas pasan en mi corrida.
- **DH-01 (cerrado por defecto):** una ruta con `:claseId` sin política responde 409 en una clase archivada. ADM-1A09 (a) falla si aparece una ruta que no está en la tabla de §D-1.
- **Enmienda 5:**
  - El contrato, los adaptadores, los README (N-22) y las pruebas siguen §D-2.
  - M-09 (`config/logger.ts`) y `lib/unir-paginas.ts` siguen sin tocar, porque son de 01e y 01c: `git diff 8d98fba -- backend/src/config frontend/` está vacío.
- **"No se toca", contra `8d98fba`:**
  - El conjunto de archivos cambiados y nuevos es exactamente:
    - "Se toca" de 01a;
    - la lista cerrada;
    - las `*.ataque` del tester: C-1, C-2, N-20 y sus dos archivos `clases-archivadas-r*`;
    - los archivos de prueba nuevos;
    - `docs/`.
  - Quedan intactos `infra/`, `.env.example`, `config/`, `adapters/auth`, `notifier/`, `guarda-de-rutas.ts`, `inscripciones.ts`, `calificaciones.ts` y la exportación.
- **Documentos de la subentrega (A-06 y A-09):**
  - Los README de `adapters/`, `handlers/` y `middleware/` están al día, con el contrato de la posición.
  - El comentario de `Clase` en `schema.prisma` está corregido.
  - Los demás (A-01 a A-05, A-07 y A-08) son del cierre del encargo.

### (b) T-01 y T-02: cerrados

**T-01** (`PUT /admin/clases/:claseId` formado detrás de un archivado respondía `403`).
- **Corrección:** `editarClase` relee por PK cuando su `updateMany` filtrado no cambia filas. Si la clase no existe, devuelve `null` (403); si existe, `409 CLASE_ARCHIVADA`.
- **La carrera HTTP:** ADM-T1A05, en verde.
- **Los tres estados vecinos**, en ADM-T2A06:
  - la clase borrada entre el `UPDATE` y la relectura da 403;
  - la clase restaurada en medio da 409 sin escribir, que es la decisión declarada;
  - la clase archivada después del `UPDATE` es R-03, aceptado.
- **La desviación de ADM-1A13**, que ahora espera el 409 y suma el caso inexistente, quedó aceptada en el arbitraje y corregida en el plan (N-23).

**T-02** (el keyset repetía filas si la clase del cursor se restauraba y se volvía a archivar).
- **Cierre:** queda cerrado con la Enmienda 5.
- **Pruebas:**
  - ADM-T1A07 y 07b esperan **exactamente** el `400` "cursor: no es válido", con la clase vuelta a archivar por la API y directo en la base. Los dos tienen su control `200` y pasan en verde.
  - ADM-1A16 y 1A17 también pasan en verde.
  - Ninguno de los casos de ADM-T2A01 a T2A05 dio `200` con filas ajenas, ni saltó o repitió la fila del cursor, ni dio `500`: posiciones manipuladas, empates, dos vueltas de restaurar y archivar, y el perfil retirado de la clase.
- **R-19** (otra fila que se mueve) es un riesgo aceptado, no un resto de T-02.

No hay desacuerdos entre el programador y el tester por arbitrar en esta ronda.

### (d) V-01: las 251 `*.ataque`
- **Tabla de hashes:**
  - Partí de las 249 filas de la tabla de la ronda 0.
  - Cambié `archivos-d-r1` por `87add25840c43bc2608eab5dd15a0f372b34a2d11908cbf60819c6edd69500c2` (N-20, ronda 1).
  - Sumé las dos de la ronda 2: `clases-archivadas-r1` `f2cff9c7d70b053d48e654aa2402d2c1d5d6694de8bb49538049a49a4eab48b2` y `clases-archivadas-r2` `62e4c2ce2ddf293797c0b08021bcd22c5da3c958e7b99521cc47fbd003377933`.
- **Resultado:** `sha256sum -c` sobre las 251 da **cero diferencias**.
- **Conjunto:** el de la tabla es exactamente el de las `*.ataque` del árbol, rastreadas y no rastreadas: 251 contra 251, con `diff` vacío.
- **Contra `git show 8d98fba:<ruta>`:** solo difieren cinco, todas del tester:
  - `sesiones-y-cadena` `d1673261…` (C-1);
  - `lecturas-fx-r1` `7a736551…` (C-2);
  - `archivos-d-r1` `87add258…` (N-20);
  - `clases-archivadas-r1` y `clases-archivadas-r2`, que son nuevas.
- **Pruebas saltadas:** no hay `.skip`, `.only`, `.todo`, `skipIf` ni `runIf` en las pruebas nuevas de 01a.
- El programador no modificó, saltó ni borró ninguna `*.ataque`.

### Definición de terminado (`AGENTS.md`), para 01a
- [x] **Cumple su parte de RF-52:** archivar y restaurar clases, con las reglas de negocio de solo lectura y de unirse con código, más DH-01 y DH-02 del lado del backend.
- [x] **Capas y middleware:**
  - `core/` es puro;
  - Prisma y el SQL etiquetado viven solo en `adapters/db`;
  - toda ruta pasa por `protegido()`, y el sexto paso decide la clase archivada;
  - ningún handler verifica roles, propiedad, inscripción ni estado a mano.
- [x] **`lint`, `build` y `test` en verde** en los tres paquetes, en mi corrida.
- [x] **Pruebas de autorización de las rutas nuevas:**
  - archivar y restaurar: ADM-1A06;
  - `GET /clases/anteriores`: ADM-1A08, con 403 para el admin, 403 para el alumno restringido y sin `estadoPago`, `accesoRestringido`, `email` ni `version`;
  - sin token, 401 en las cuatro rutas: C-1 de `sesiones-y-cadena`.
- [x] **Migración:** incluida, compatible hacia atrás y sin deriva.
- [x] **`infra/` y `.env.example`:** no aplican, porque no cambió la infraestructura ni la configuración.
- [x] **Documentos de la subentrega:** los README y `schema.prisma` están al día. Los del encargo van al cierre (A-01 a A-10).

### Reglas que no se rompen
- **Capas:** se cumplen.
- **Estado de pago:** ninguna respuesta nueva lo incluye.
- **Consultas sanas:**
  - no hay N+1;
  - la lista del admin por estado usa los índices parciales nuevos;
  - la lista de anteriores va por el índice del usuario (R-13);
  - todas las listas paginan con tope;
  - el único SQL crudo nuevo es una plantilla etiquetada.
- **Cola:** archivar y restaurar no encolan nada (S-02).
- **UTC:** `archivadaEn` viaja en ISO.
- **Secretos e infraestructura:** sin cambios.
- **Proveedores:** ninguno nuevo.
- **`notifier`:** no se toca.
- **Autenticación:** sin cambios.
- **Archivos y trabajos diferidos:** no entran en 01a.

### Estilo (`CLAUDE.md`)
- Los módulos siguen su estructura, con retornos tempranos y errores tipados en `core/` y en `adapters/`.
- Los handlers no tienen `try/catch`.
- No hay `any`.
- Quedan dos detalles de valores por defecto, en "Problemas que no bloquean" (NB-1).

### (c) Hallazgos abiertos y su destino

Ninguno bloquea 01a. Todos tienen destino. El orquestador los registra en `aprobacion.md` al cerrar 01a.

| Id | Qué | Estado o destino |
|---|---|---|
| N-20 | Aserción de tiempo frágil en `archivos-d-r1.ataque:781` | **Cerrado.** El tester la acotó en la ronda 1 (`87add258…`). No falló en la ronda 2 ni en mi corrida |
| N-21 | Carga ajena de la app de escritorio de ChatGPT/Codex durante las suites | **Para el humano** (sin código). Hoy no tumbó ninguna corrida, pero seguía abierta, con 17 procesos. Sigue la recomendación de cerrarla durante las suites de 01b en adelante |
| N-24 | Foco tras el descarte por `id`: última página solo con repetidas, o primera fila nueva repetida | **Programador de 01c** (y 01d2, 01f y 01g, que usan la misma función): un caso más en su subentrega. Aprobado así con la Enmienda 5 |
| N-25 | A-05 (`CLAUDE.md`) no nombra `lib/unir-paginas.ts` | **Cierre de ADMIN-01**, con A-05 |
| N-26 | Secreto de un carácter en el caso unitario de `opcionesDeLogger` (ADM-1E22) | **Programador de 01e**. Aprobado así con la Enmienda 5 |
| N-27 | El resumen del programador no registra PA-01 (red y perfil de la suite del backend) | **El orquestador lo exige en cada resumen**, desde 01b. En 01a no se puede reponer. Mi corrida, la del tester y la del manager de la ronda 1 sí quedaron en `IZZI-F281-5G` Público |
| NB-1 | Valores por defecto que disfrazan una decisión (ver "Problemas que no bloquean") | **Carril trivial al cierre de ADMIN-01**, sin cambio de comportamiento. Ningún archivo afectado está en "Se toca" de 01b a 01g, así que no se cuela en otra subentrega |
| O-R1-1 | Una clase archivada con 0 maestros daría `500` por `min(1)` en `GET /clases/anteriores` (y en `conMaestroPrincipal`) | **Tester de 01e**, en su ronda 1: 01e es la única subentrega que da de baja cuentas. El orquestador se lo pasa explícitamente junto con N-18 |
| O-3 (ronda 0) | `gestion-02a-r1.ataque:693-734` exige las claves `["id", "nombre"]` en los maestros del detalle y, en 01e, S-16 suma `cuentaDesactivada` | **Antes de la ronda 0 de 01e**: no está en §D-R0 de 01e (que solo vigila `:268`). Hace falta una enmienda corta del arquitecto que la sume como C-n del tester, verificada por el manager. Si no, la ronda 0 de 01e o el programador chocan con ella (PARADA) **Resuelta por la Enmienda 13** (2026-11-09): C-42 en §D-R0 01e, verificada en "Verificación de la Enmienda 13 — ADMIN-01". |
| R-16 y R-17 | Listas que ya existían antes de ADMIN-01 (roster, Personas, entregas, gradebook, exportación; inscritas e impartidas) | **Cierre de ADMIN-01**: fila nueva de ESTADO §3 (A-07 bis), con destino a un encargo posterior. R-17 está aceptado por el humano |
| R-18 | El cursor estricto da `400` si un nombre solo cambia de mayúsculas | Aceptado con la Enmienda 5, y aplica en 01e. A-07 bis no le da fila: recomiendo nombrarlo al cierre dentro de la fila de R-19 |
| R-19 | La posición protege solo la fila del cursor | **Cierre de ADMIN-01**: fila de ESTADO §3 (A-07 bis), riesgo aceptado. La interfaz descarta las repetidas en 01c, 01d2, 01f y 01g |
| A-07 bis | Filas nuevas o cambiadas de ESTADO §3 | **Cierre de ADMIN-01**. Las aplica el orquestador y yo las verifico en la revisión final del encargo |
| O-R1-3 | 21 `DeprecationWarning` de `pg` (21 también en mi corrida) | Ajeno. Ya tiene fila en ESTADO §3 (N-23 de CALIFICACIONES-01b) |

### Problemas que no bloquean

**NB-1 — Valores por defecto que disfrazan una decisión.** Carril trivial, al cierre de ADMIN-01.

- **Producción (`backend/src/adapters/db/clases-archivadas.ts`).** Ya lo señalé en la verificación del resumen.
  - `archivarClase` decide el 409 de la carrera con `errorAlArchivar(fila.archivadaEn ?? new Date()) ?? sinAcceso()`, y `restaurarClase` con `errorAlRestaurar(null) ?? sinAcceso()`.
  - El resultado es correcto: es la decisión 5, y la carrera la cubre la ronda 2.
  - Pero una fecha inventada y una rama `?? sinAcceso()` inalcanzable se leen como un valor por defecto, cuando en realidad son una decisión. `CLAUDE.md` pide valores por defecto explícitos.
  - Se espera que lance el 409 de `core/` directamente, con su comentario, sin cambiar lo que responde.
- **Pruebas propias.** Hay `?? ""` en:
  - `clases-archivadas.integracion.test.ts:294`, `:298`, `:371` y `:475`;
  - `clases-archivadas-posicion.integracion.test.ts:258` y `:261`.

  En todos los casos, si falta el dato, la aserción siguiente falla y el bucle tiene tope: no ocultan nada. Se espera una precondición que lance un error con su mensaje.

  `clases-archivadas-r2.ataque.test.ts:365` tiene el mismo patrón, pero es del tester y no se toca.

### Detalles menores
- `listarClasesAnteriores` trata como "maestro" a todo rol que no sea `estudiante`. Hoy es inalcanzable por `roles: ["estudiante", "maestro"]`. Va con NB-1 si se quiere una rama explícita.
- `archivada_en` toma la hora de la API (`new Date()`), no `now()` de la base (decisión 4, aceptada). Se lo menciono al humano como desviación menor de la letra de §D-2.
- ADM-1A09 (d) dice "las dos rutas" y recorre cuatro (GET y HEAD de cada una). Es correcto.

### Desacuerdos arbitrados
Ninguno en esta ronda. El único fue T-02, de la ronda 1: lo resolvió el humano con la opción A (Enmienda 5) y ya está cerrado.

### Documentos a actualizar
- **En 01a:** nada pendiente. Los README de `adapters/`, `handlers/` y `middleware/` (A-06) y el comentario de `schema.prisma` (A-09) están al día.
- **Al cierre de ADMIN-01:** A-01 a A-05, A-07, A-07 bis y A-08, como dice el plan. Incluyen la viñeta de "Autorización" de ESSENTIALS con `enClaseArchivada` y el `409 CLASE_ARCHIVADA`, la tabla `clases.archivada_en` y el contrato del cursor con posición en A-01 y A-02. Hay que sumar N-25 y la nota de R-18.

### (e) Archivos del commit de 01a

Son 50 rutas: 44 de código, pruebas y migración, y 6 de `docs/`. Salen de `git diff --name-only 8d98fba` más `git ls-files --others --exclude-standard`, sin `docs/trabajo/DEPLOY-investigacion-vps.md`. `shared/dist` y `backend/src/adapters/db/generated` están en `.gitignore` y no entran.

**shared (2)**
- `shared/src/clases.ts`
- `shared/src/index.ts`

**backend, migración y esquema (2)**
- `backend/prisma/schema.prisma`
- `backend/prisma/migrations/20261104234335_admin_01_clases_archivadas/migration.sql`

**backend, `src/` (25)**
- `backend/src/core/clases/archivada.ts`, `backend/src/core/clases/archivada.test.ts`
- `backend/src/adapters/README.md`, `backend/src/adapters/db/clases.ts`, `backend/src/adapters/db/clases-archivadas.ts`, `backend/src/adapters/db/index.ts`
- `backend/src/middleware/README.md`, `backend/src/middleware/index.ts`, `backend/src/middleware/pertenencia.ts`, `backend/src/middleware/require-membership.ts`, `backend/src/middleware/require-ownership.ts`
- `backend/src/handlers/README.md`, `backend/src/handlers/archivos.ts`, `backend/src/handlers/calificaciones.ts`
- `backend/src/handlers/clases/alumnos.ts`, `clases.ts`, `dudas.ts`, `gestion.ts`, `muro.ts`, `recursos.ts`
- `backend/src/handlers/tareas/categorias.ts`, `entregas.ts`, `hilo-privado.ts`, `tareas.ts`, `temas.ts`

**backend, `test/` (15)**
- Nuevas: `ayudas-clases-archivadas.ts`, `protegido-clase-archivada.test.ts`, `clases-archivadas.integracion.test.ts`, `clases-archivadas-matriz.integracion.test.ts`, `clases-archivadas-migracion.integracion.test.ts`, `clases-archivadas-posicion.integracion.test.ts`
- Lista cerrada: `bloqueo-usuario.integracion.test.ts`, `calificaciones-autorizacion.integracion.test.ts`, `calificaciones-lecturas-estatico.test.ts`, `exportacion-calificaciones-estatico.test.ts`
- Del tester: `sesiones-y-cadena.ataque.test.ts`, `lecturas-fx-r1.ataque.test.ts`, `archivos-d-r1.ataque.test.ts`, `clases-archivadas-r1.ataque.test.ts`, `clases-archivadas-r2.ataque.test.ts`

**docs (6)**
- `docs/trabajo/ADMIN-01-administracion/` completa: `plan.md`, `aprobacion.md`, `resumen-programador.md`, `reporte-tester.md` y `revision.md`.
- `docs/ESTADO.md`. 01a no lo cambió. Su único cambio contra `8d98fba` es de la fase de plan de este encargo: §2b suma ADMIN-02 a la hoja de ruta, entre NOTIFICACIONES y DEPLOY, por la decisión P-02 del humano del 2026-11-04, que consta en `aprobacion.md`. Tiene motivo y es de ADMIN-01. Recomiendo incluirlo en este commit, porque no habrá un commit anterior del encargo (no hay commit de aprobación del plan) y así no arrastra cambios sin confirmar durante siete subentregas. Si el orquestador prefiere dejarlo para el cierre del encargo, tampoco rompe ninguna regla.

**Fuera del commit:** `docs/trabajo/DEPLOY-investigacion-vps.md`, que es ajeno al encargo.

```
git status
git add shared/src/clases.ts shared/src/index.ts backend/prisma/schema.prisma backend/prisma/migrations/20261104234335_admin_01_clases_archivadas backend/src/core/clases/archivada.ts backend/src/core/clases/archivada.test.ts backend/src/adapters/README.md backend/src/adapters/db/clases.ts backend/src/adapters/db/clases-archivadas.ts backend/src/adapters/db/index.ts backend/src/middleware/README.md backend/src/middleware/index.ts backend/src/middleware/pertenencia.ts backend/src/middleware/require-membership.ts backend/src/middleware/require-ownership.ts backend/src/handlers/README.md backend/src/handlers/archivos.ts backend/src/handlers/calificaciones.ts backend/src/handlers/clases/alumnos.ts backend/src/handlers/clases/clases.ts backend/src/handlers/clases/dudas.ts backend/src/handlers/clases/gestion.ts backend/src/handlers/clases/muro.ts backend/src/handlers/clases/recursos.ts backend/src/handlers/tareas/categorias.ts backend/src/handlers/tareas/entregas.ts backend/src/handlers/tareas/hilo-privado.ts backend/src/handlers/tareas/tareas.ts backend/src/handlers/tareas/temas.ts backend/test/ayudas-clases-archivadas.ts backend/test/protegido-clase-archivada.test.ts backend/test/clases-archivadas.integracion.test.ts backend/test/clases-archivadas-matriz.integracion.test.ts backend/test/clases-archivadas-migracion.integracion.test.ts backend/test/clases-archivadas-posicion.integracion.test.ts backend/test/bloqueo-usuario.integracion.test.ts backend/test/calificaciones-autorizacion.integracion.test.ts backend/test/calificaciones-lecturas-estatico.test.ts backend/test/exportacion-calificaciones-estatico.test.ts backend/test/sesiones-y-cadena.ataque.test.ts backend/test/lecturas-fx-r1.ataque.test.ts backend/test/archivos-d-r1.ataque.test.ts backend/test/clases-archivadas-r1.ataque.test.ts backend/test/clases-archivadas-r2.ataque.test.ts docs/trabajo/ADMIN-01-administracion docs/ESTADO.md
```

Después del `git add`, `git status` no debe mostrar nada preparado fuera de estas 50 rutas. Solo debe quedar sin rastrear `docs/trabajo/DEPLOY-investigacion-vps.md`.

### Para el humano
- **Desviación menor aceptada:** la fecha de archivo la pone la API (`new Date()`) en vez del reloj de la base (`now()`). Va en UTC, la API y la base comparten servidor, y ninguna regla depende de ese reloj.
- **N-21:** durante las suites de 01b en adelante, conviene cerrar la app de escritorio de ChatGPT/Codex. Hoy no tumbó ninguna corrida, pero seguía abierta.
- **NB-1:** queda para el carril trivial al cierre de ADMIN-01. No cambia el comportamiento.

### Veredicto
**APROBADO.** 01a cumple su parte del plan `066d9476…`:
- pasos 1 a 7 y 7b;
- ADM-1A01 a 1A17;
- la migración, sin deriva;
- §D-1 a §D-3, DH-01 y la Enmienda 5.

Además:
- T-01 y T-02 están cerrados, y el tester dio RESISTE en la ronda 2 sin hallazgos;
- V-01 da 251 de 251, y solo cambiaron `*.ataque` del tester;
- "No se toca" está limpio;
- las cifras coinciden con mi corrida (backend 2864/242, frontend 6062/281, lint y build en los tres paquetes);
- los hallazgos abiertos tienen destino (tabla de (c)), y O-3 exige una enmienda corta antes de la ronda 0 de 01e.

### Resumen para el humano (15 líneas)
1. ADMIN-01a (backend de clases archivadas) está **APROBADA**. El tester dio RESISTE en la ronda 2, sin hallazgos.
2. Qué hace: el admin archiva y restaura clases, y una clase archivada queda de solo lectura.
3. El maestro y el admin la consultan, el gradebook y la exportación incluidos, y el alumno ve su detalle y sus calificaciones.
4. Toda escritura responde "Esta clase está archivada: solo se puede consultar." Una ruta nueva que no declare qué hace con una archivada también queda cerrada.
5. El código de invitación de una archivada no sirve y responde como un código inexistente. "Clases anteriores" lista las archivadas de cada alumno y maestro.
6. Migración `admin_01_clases_archivadas`: una columna nula, un `CHECK` y dos índices parciales. Es compatible hacia atrás y no tiene deriva.
7. T-01 (`403` en vez de `409` al editar en plena carrera) y T-02 (filas repetidas al paginar) quedaron corregidos. T-02 se corrigió con el cursor con posición de la Enmienda 5.
8. Mi corrida, en `IZZI-F281-5G` Público: backend 2864/2864 en 242 archivos y frontend 6062/6062 en 281. `lint` y `build` en verde en los tres paquetes.
9. Las 251 pruebas de ataque coinciden con sus hashes. El programador no tocó ninguna.
10. Desviación menor aceptada: la fecha de archivo sale del reloj de la API, no del de la base.
11. Pendiente con destino: dos valores por defecto de estilo, por carril trivial al cierre de ADMIN-01.
12. Pendiente con destino: los riesgos R-16 a R-19, que pasan a ESTADO §3 al cierre.
13. Antes de la ronda 0 de 01e hace falta una enmienda corta del plan (O-3: una prueba de ataque que choca con «Cuenta desactivada»).
14. El commit lleva 50 archivos (lista en `revision.md`), con `docs/ESTADO.md` (la decisión de ADMIN-02) y sin el archivo ajeno de DEPLOY.
15. Recomendación: cierra la app de escritorio de ChatGPT/Codex durante las suites. Puede tumbar corridas por carga.

## Verificación de la Enmienda 6 — ADMIN-01

Veredicto: **APROBADO.** La enmienda hace solo lo que decidió el humano: deja `RESTRICT`, explica por qué y agrega ADM-1B24. No hay problemas que bloqueen. Quedan tres observaciones (N-28 a N-30) para el programador de 01b y dos detalles.

Insumos:
- `plan.md`: 1353 líneas; SHA-256 `7118c2283f47e6bfc146f219c795b68d6d502bcbf69ab601e5e44498d97e71eb` (comprobado). Es igual a la copia `copias-plan/plan-admin01-v8-enmienda6-7118c228.md`. Sin CR.
- Copia previa: `copias-plan/plan-admin01-antes-enmienda6-066d9476.md`; SHA-256 `066d9476fb1bb17301babf505eaeae1b6d904c227c7ac8cdd0c56a33a23f8a68` (comprobado). Es el plan aprobado por el humano.
- Decisión del humano: al final de `aprobacion.md` están su pregunta y su respuesta literales ("Dejar RESTRICT" y la prueba pedida).

Verificación propia:
- `git diff --no-index` completo contra la copia previa.
- Lectura de §D-4, §D-5, §D-6, ADM-1B04 a ADM-1B23, §D-R0 (01b) y la regla general de §D-R0.
- Grep en `backend/src`, `backend/prisma/migrations` y `backend/test`: borrados físicos de `archivos`, FK de `archivos`, `leerTrabajosDeCola`, `almacen-en-memoria.ts`, `higiene-de-pruebas` y las rutas de archivar, recursos y descarga.
- `git diff --name-only 69057f7 -- backend/test`: las únicas `*.ataque` cambiadas son C-3, C-4 y C-5, las de la ronda 0.
- **No corrí pruebas**, como pidió el orquestador: el cambio es solo de texto y el código de 01b está a medias.

### Cotejo del diff
`--numstat`: 24 inserciones y 3 borrados, en 5 hunks con `-U0`. Coincide con `aprobacion.md`.

| Hunk (`-U0`) | Sección | E6-n |
|---|---|---|
| `-2 +2` | Encabezado, Estado ("Enmiendas 1 a 6 aplicadas" y la Enmienda 6 descrita) | E6-4 |
| `-522 +522` | §Cambios `backend/prisma/`, 01b `admin_01_copias_de_archivos`: la frase del porqué de `RESTRICT`. La FK, el `CHECK`, los índices y la compatibilidad siguen igual | E6-1 |
| `-655,0 +656,6` | Pruebas requeridas 01b: ADM-1B24, con los incisos (a) a (e) | E6-2 |
| `-1173 +1179` | Paso 13: "ADM-1B02 a ADM-1B24" | E6-3 |
| `-1332,0 +1339,15` | Tabla de la Enmienda 6 | — |

No cambia nada fuera de E6-1 a E6-4. "Se toca", "No se toca", la lista cerrada, las vigiladas, C-3 a C-5, §D-4, §D-5 y ADM-1B01 a ADM-1B23 quedan idénticos. La migración en disco (`20261105163205_admin_01_copias_de_archivos/migration.sql:14`) declara `ON DELETE RESTRICT`, como dicen el plan y la decisión.

### (a) ADM-1B24 frente a la petición literal y su realizabilidad
**Petición literal:** "duplicar una clase y luego borrar definitivamente la original debe funcionar y dejar la copia intacta".
- Los incisos (b) a (d) la cumplen. El worker termina, el `DELETE` responde `204` y la copia queda intacta: clase activa, recurso visible en `GET …/recursos`, fila `confirmado` con `copia_de` nulo y la misma publicación, clase y clave, objeto en el almacén y descarga `200`. Coincide también con el resumen que el orquestador anotó en `aprobacion.md`.
- El inciso (a) va más allá de la letra, pero responde la duda del propio humano ("borrar la clase original con copias existentes fallaría"). Muestra por el camino real que, mientras hay copias en curso, el borrado se rechaza con `409` sin borrar nada. Es barato, no toca ADM-1B06 y lo acepto.
- El inciso (e) también va más allá. Prueba que el borrado de objetos no alcanza el de la copia, que es la otra mitad de "dejar la copia intacta" (el objeto, no solo la fila). Lo acepto.

**Realizable con lo que define el plan para 01b.** Comprobado punto por punto:
- **Rutas:** `POST /admin/clases/:claseId/archivar` ya existe (`handlers/clases/gestion.ts:119`, 01a). `GET /clases/:claseId/recursos` ya existe (`handlers/clases/recursos.ts:53`). La descarga `POST /clases/:claseId/archivos/:archivoId/descarga` ya existe (`handlers/archivos.ts:75`) y 01b la modifica. `duplicar` y el `DELETE` son de 01b y ya están en C-3. No hace falta ninguna ruta nueva.
- **Almacenes:** `objetos-en-memoria.ts` (nuevo en 01b) necesita poder sembrar un objeto, pero eso ya lo exige ADM-1B11 ("copia y limpia"). La descarga firma con el doble existente `almacen-en-memoria.ts`, que no comprueba si el objeto existe (`urlDeDescarga` solo registra). Por eso el `200` de (d) prueba la puerta de `copia_de`, y la existencia del objeto la prueba el doble de `AlmacenDeObjetos`. Las dos aserciones están en (d).
- **Consumidores:** `registrarConsumidoresDeObjetos({ almacenDeObjetos, log }, colas?)` recibe las colas como parámetro "para que las pruebas usen las suyas" (§Cambios `backend/workers/`). Con eso, (b) y (e) se pueden correr igual que en ADM-1B11 y ADM-1B12. Ver N-29 sobre cómo invocarlos sin competir con otros archivos.
- **Filas de pg-boss:** `leerTrabajosDeCola` (`ayudas-clases.ts:239`) filtra con `data ->> clave = valor`, que solo casa valores escalares. No sirve para `archivoIds` ni para `claves`, que son arreglos. Se resuelve con un `$queryRaw` de plantilla en el archivo de la prueba o con una ayuda nueva. Las dos cosas las permite la regla general de §D-R0 ("archivos nuevos de prueba y ayudas nuevas en `backend/test/`; una ayuda existente solo gana exportaciones"). Esto ya lo necesitaban ADM-1B04, ADM-1B08 y ADM-1B23; no lo introduce la enmienda.
- **Archivo de la prueba:** "en el archivo de ADM-1B04 o de ADM-1B11, o en uno nuevo de 01b". Los tres son archivos nuevos de 01b. No pide nada fuera de "Se toca" ni toca la lista cerrada.

### (b) El inciso (e): `datos` de `BORRAR_OBJETOS` al consumidor sin esperar el `startAfter`
**Es correcto.** El consumidor de `BORRAR_OBJETOS` (§D-4, "Worker") solo lee `{ claves }` de los datos y llama a `almacenDeObjetos.borrar(claves)`. El retraso de 10 minutos es una propiedad del trabajo encolado, no del consumidor, y ya lo prueba ADM-1B23 leyendo la fila de pg-boss. Esperar el `startAfter` no agregaría cobertura: solo haría la prueba lenta o la obligaría a manipular la fila de pg-boss.

**Es suficiente** para lo que el humano pidió (el objeto de la copia sobrevive al borrado de la original), siempre que se cumplan dos cosas:
- (e) cubre los dos lados: "suman exactamente las claves de la original" y "ningún trabajo tiene la clave de la copia". Si un trabajo trajera de más (la clave de la copia), la segunda condición lo detecta antes de correr el consumidor.
- Corre el consumidor sobre **todos** los trabajos del borrado ("con sus `datos`", en plural), no sobre uno.

Lo que le falta es afirmar sus precondiciones para que no pase en vacío; ver N-30.

### (c) La frase de E6-1 sobre `RESTRICT` frente a §D-4 y §D-5
Cada afirmación, contrastada:
- **"`copia_de` es transitorio (el worker lo pone en nulo al terminar)".** Exacta: lo dice §D-5 en `terminarCopias`. También lo ponen en nulo `descartarCopias`, los dos descartes de M-02 y el consumidor de fallidos, y la frase no lo niega.
- **"el borrado definitivo ya responde `409 CLASE_CON_COPIAS_EN_CURSO` mientras haya copias en curso (§D-4, paso 2)".** Exacta: el paso 2 cubre las dos direcciones con dos `EXISTS`.
- **"con `SET NULL` esa carrera dejaría una copia 'terminada' sin objeto".** Exacta. `leerCopiasPendientes` solo lee filas con `copia_de` no nulo, así que la copia quedaría fuera del worker. La descarga solo mira `copia_de`, así que firmaría una URL hacia un objeto que nunca se creó. El borrado de objetos de la original va diferido 10 minutos, pero eso no ayuda: el worker ya no copiaría.
- **"con `RESTRICT` el borrado falla sin borrar nada".** Exacta. No existe ningún borrado físico de filas de `archivos` fuera de la cascada desde `clases` (grep en `backend/src`), así que la FK solo puede actuar en el borrado definitivo, y la transacción se revierte entera.

**Dos precisiones (detalle; no bloquean, ver "Detalles menores"):**
- **"la FK solo actúa en una carrera" se queda corto.** Con el diseño del plan esa carrera no se puede alcanzar. El borrado toma la clase `FOR UPDATE` (§D-4, paso 1) y el duplicado la toma `FOR SHARE` (§D-5, paso 1), así que quedan en serie (ADM-1B10). Además, en READ COMMITTED el `EXISTS` del paso 2 se ejecuta después de obtener el bloqueo y ve las copias ya confirmadas. Lo exacto sería "solo actuaría si una carrera escapara a la comprobación del paso 2". La FK es una defensa en profundidad. La decisión no cambia: ante un defecto así, `RESTRICT` falla de forma visible y `SET NULL` dejaría una copia rota en silencio.
- **Ese fallo sería un `500`, no un `409`.** Un `P2003` no se traduce (§D-4, nota de la Enmienda 1, "Sin cambio en `errores.ts`"). La frase no promete un código, así que no es inexacta. Es coherente con aceptar que esa rama no se puede alcanzar.

### (d) Choques con la lista cerrada, las vigiladas y C-3 a C-5
No hay ninguno:
- **Lista cerrada de 01b:** sigue siendo "ninguna" más E6 de `bloqueo-usuario.integracion` (E4-4), que depende solo del SQL etiquetado de `adapters/db`. ADM-1B24 vive en `backend/test` y en un archivo nuevo de 01b.
- **C-3 (inventario de rutas):** ADM-1B24 no agrega rutas. Usa `duplicar` y el `DELETE`, que ya están en C-3, y rutas que ya existían.
- **C-4 (borrados en `backend/src`):** la prueba no está en `src`.
- **C-5 (instantáneas en `src`):** tampoco cuenta.
- **Vigiladas:**
  - `worker-*.ataque`: no se toca `registrarConsumidores`.
  - `higiene-de-pruebas`: la prueba no pide `LOCK TABLE`, y el `.$transaction(` vigilado es de `backend/src`.
  - `arquitectura-cuentas-r1`, `hilo-01c-r1`, `muro-c-r1`, `temas-01a-r1/r3`, `entregas-01b-r1` y `lecturas-fx-r2:1072-1108` leen `backend/src`, no las pruebas.
- **V-01:** ADM-1B24 no es `*.ataque`, así que el conteo no cambia.

### (e) Precondiciones que conviene afirmar con mensaje
ADM-1B24 afirma con aserción una sola precondición: la de (b), que el archivo de la copia tenga `copia_de` nulo y su objeto exista en el almacén. Hay otras tres que hoy quedan implícitas. Si alguna falla en silencio, la prueba se rompe con un mensaje que engaña, o pasa en vacío. Las agrupo en N-28 a N-30.

## Problemas que bloquean
Ninguno.

## Problemas que no bloquean

### N-28 — ADM-1B24 (a): afirmar que la copia está en curso antes de archivar
**Dónde:** `plan.md:657`, inciso (a).

**Por qué importa:** el `409` de (a) depende de que nadie haya procesado todavía el trabajo de `COPIAR_OBJETOS`. Hoy la prueba lo comprueba después del `DELETE` ("el archivo de la copia sigue con `copia_de` = …"). Si algo ya procesó la copia, el `DELETE` responde `204` y borra la original. El fallo diría "esperaba 409, recibió 204", que apunta al borrado cuando el problema está en otra parte.

**Qué se espera:** justo después del `201`, y antes de archivar, la prueba afirma con un mensaje propio dos cosas:
- el archivo de la copia tiene `copia_de` igual al id del archivo original;
- hay exactamente un trabajo de `COPIAR_OBJETOS` cuyos `archivoIds` contienen ese id.

Ese trabajo es el que lee (b), y así (b) no tiene que buscarlo de nuevo.

### N-29 — ADM-1B24 (b) y (e): los consumidores nunca se registran en las colas de producción
**Dónde:** `plan.md:658` y `:660`; §Cambios `backend/workers/` (`registrarConsumidoresDeObjetos(…, colas?)`).

**Por qué importa:** Vitest corre los archivos en paralelo contra la misma base desechable. Si una prueba registra un consumidor con sondeo real sobre `COPIAR_OBJETOS` o `BORRAR_OBJETOS`, tomaría trabajos que encolan otros archivos (ADM-1B08, ADM-1B19 y los demás duplicados) y los procesaría con un almacén en memoria que no tiene sus objetos. Por "origen inexistente", descartaría esas copias, y los otros archivos fallarían de forma intermitente. El riesgo existe para ADM-1B11 y ADM-1B12 tanto como para ADM-1B24, pero ADM-1B24 es la primera prueba que procesa el trabajo **real** que encoló el duplicado, y es la que más tienta a registrar el consumidor en la cola de producción.

**Qué se espera:** el programador elige una de dos formas y la declara en su resumen:
- llamar directamente a la función que procesa un trabajo, con los `datos` leídos de la fila;
- volver a encolar esos `datos` en una cola propia de la prueba y registrar ahí `registrarConsumidoresDeObjetos`, como hacen `worker-correo-de-cuenta` y los `worker-*.ataque`.

Ninguna prueba registra un consumidor con los nombres `COPIAR_OBJETOS` o `BORRAR_OBJETOS`. Destino: programador de 01b y punto de ataque para el tester.

### N-30 — ADM-1B24 (e): afirmar el conjunto esperado y el control positivo antes de comparar
**Dónde:** `plan.md:660`, inciso (e).

**Por qué importa:** "suman exactamente las claves de la original" pasa en vacío si el conjunto esperado está vacío: cero trabajos y cero claves coinciden. Lo mismo pasa con "el objeto de la original desaparece" si el objeto nunca estuvo en el almacén. Además, las claves de la original solo se pueden leer **antes** de (c), porque después sus filas ya no existen, y el plan no dice cuándo leerlas.

**Qué se espera:** con aserción y mensaje, nunca con un `return` temprano (`AGENTS.md`, "Pruebas"):
1. Antes del `DELETE` de (c), la prueba lee las claves de todos los archivos de la original, en cualquier estado. Afirma que el conjunto no está vacío y que contiene la clave del archivo sembrado.
2. Después de (c), afirma que hay al menos un trabajo de `BORRAR_OBJETOS` con alguna de esas claves.
3. Antes de correr el consumidor, afirma que el objeto de la original sigue en el almacén en memoria.

## Detalles menores
- **E6-1, la carrera (ver (c)).** "la FK solo actúa en una carrera" se puede precisar como "solo actuaría si una carrera escapara a la comprobación del paso 2, que el `FOR UPDATE` del borrado y el `FOR SHARE` del duplicado ya ponen en serie (ADM-1B10); en ese caso, el borrado fallaría con un `500` sin borrar nada". No cambia la implementación ni la decisión. Si nadie lo corrige en una enmienda posterior, se puede dejar como está.
- **E6-4, "con su porqué en la migración de 01b".** El encabezado se puede leer como si pidiera un comentario en `migration.sql`. E6-1 aclara que la FK, el SQL y el esquema no cambian y que el porqué vive en el plan. Si el programador quiere poner un comentario SQL en la migración, la carpeta está en "Se toca" y O-01b-1 solo lee archivos `.ts`. No hace falta.
- **ADM-1B24 (d), la descarga.** El `200` no dice qué clave se firmó. Conviene afirmar también que la última entrada de `descargasFirmadas` del doble de `Almacen` tiene la clave de la copia. Es opcional.

## Desacuerdos arbitrados
Ninguno.

## Documentos a actualizar
Ninguno por la enmienda. La migración ya está en disco con `RESTRICT`.

## Para el humano
No hay decisiones pendientes. Solo una nota informativa sobre "Dejar RESTRICT": con los bloqueos del plan, la carrera de la que protege la FK no se puede alcanzar (ver (c)), así que `RESTRICT` funciona como defensa ante un defecto futuro. Tu decisión se sostiene. Ante ese defecto, `RESTRICT` falla de forma visible y revierte todo; `SET NULL` dejaría una copia rota sin aviso.

### Veredicto de esta verificación
**APROBADO.** Las cuatro ediciones corresponden exactamente a E6-1, E6-2, E6-3 y E6-4. ADM-1B24 cumple la petición literal del humano y se puede hacer con lo que el plan define para 01b, sin salir de "Se toca". No choca con la lista cerrada, las vigiladas ni C-3 a C-5.

N-28, N-29 y N-30 pasan al programador de 01b, que los aplica al escribir ADM-1B24 y declara en su resumen cómo invoca los consumidores. El tester los tiene como puntos de ataque.

## Verificación de la Enmienda 7 — ADMIN-01

Veredicto: **APROBADO.** E7-1 es el cambio mínimo. El grep de E7-2 y E7-3 es completo en lo que importa: ninguna otra prueba compara el árbol de rutas de la app con una lista fija. Fuera de E7-1 a E7-5 no cambia nada. No hay problemas que bloqueen; queda un detalle.

Insumos:
- `plan.md`: 1386 líneas; SHA-256 `4f46a1a6bb59bdab789eef4b7fb693c5b6f43a22d7e38c86e1364b0470b2a6c1`. Lo calculé yo y coincide con la entrada "Enmienda 7 del arquitecto" de `aprobacion.md`. Sin CR.
- Copia previa: `copias-plan/plan-admin01-antes-enmienda7-7118c228.md`; SHA-256 `7118c228…` (comprobado).
- La PARADA del programador está al final de `aprobacion.md`: ADM-1A09 (a), `expected [ …(88) ] to deeply equal [ …(84) ]`.

Verificación propia:
- `git diff --no-index` completo contra la copia previa.
- Lectura completa de `backend/test/clases-archivadas-matriz.integracion.test.ts`, que no tiene cambios en el árbol de trabajo (`git diff` vacío).
- Lectura de las tres rutas de 01b en `handlers/clases/gestion.ts:160-215`.
- Grep de las pruebas que enumeran rutas, para 01b y 01e.
- Corrida acotada a dos archivos, con estas precondiciones comprobadas antes:
  - Red `IZZI-F281-5G`, perfil Público (`Get-NetConnectionProfile`).
  - Ningún `node.exe` en ejecución, así que no había otro vitest.
  - La otra copia de trabajo no corre nada, según la respuesta del humano del 2026-11-05 que consta en `aprobacion.md`.

### Cotejo del diff
`--numstat`: 35 inserciones y 2 borrados, en 5 hunks con `-U0`.

| Hunk (`-U0`) | Sección | E7-n |
|---|---|---|
| `-2 +2` | Encabezado, Estado ("Enmiendas 1 a 7 aplicadas" y la Enmienda 7 descrita) | E7-5 |
| `-962,0 +963,14` | §D-R0 01b, lista cerrada: la viñeta de E7-1 (las cuatro líneas, 84 → 88, por qué (b) a (e) no cambian) y la de E7-2 (grep y vigiladas) | E7-1 y E7-2 |
| `-969,0 +984,5` | §D-R0 01e, después de la lista cerrada: la viñeta de E7-3 | E7-3 |
| `-1179 +1198` | Paso 13: ADM-1A09 (a) con las cuatro líneas antes de la suite completa | E7-4 |
| `-1353,0 +1373,14` | Tabla de la Enmienda 7 | — |

### (a) E7-1 es el cambio mínimo
Lo contrasté con el archivo real:
- **Ancla:** la línea 61 es `"POST /api/admin/clases/:claseId/restaurar": "gestion",`, la 60 es archivar y la 62 abre el comentario de las cerradas. Las cuatro líneas de E7-1 van entre las dos políticas `gestion` y ese comentario, con la sangría de las vecinas.
- **Conteo:** `POLITICAS` tiene hoy 61 entradas, 23 de ellas `GET` (`:36-56`, `:64` y `:66`). Con el `HEAD` que `TABLA` agrega por cada `GET`, son 61 + 23 = 84. Con las tres entradas nuevas, una de ellas `GET`, son 64 + 24 = **88**.
- **Corrida.** `npx vitest run test/clases-archivadas-matriz.integracion.test.ts test/clases-archivadas-r1.ataque.test.ts` dio `Test Files 1 failed | 1 passed (2)` · `Tests 1 failed | 19 passed (20)`. La única roja es ADM-1A09 (a), y su diff tiene exactamente cuatro líneas `+`:
  - `DELETE /api/admin/clases/:claseId`
  - `GET …/conteo-de-borrado`
  - `HEAD …/conteo-de-borrado`
  - `POST …/duplicar`

  No sobra ni falta ninguna otra ruta, así que `noReconocidas` sigue vacío. Los otros cuatro casos de la matriz y los 15 de `clases-archivadas-r1.ataque` pasan. El SHA-256 de esa `*.ataque` es `f2cff9c7…`, el de la ronda 2, sin cambio.
- **(b), (c) y (d) no recorren `"gestion"`:** usan `rutasCon("cerrada")` (`:241`), `rutasCon("lectura")` (`:269`) y `rutasCon("lectura-del-alumno")` (`:292`). El `toHaveLength(4)` de (d) no cambia, porque las rutas nuevas no son de esa política.
- **(e) sí las recorre:** pasa por todo `TABLA` sin los `HEAD` (`:306-307`), con `actores.ajeno`, un estudiante no inscrito. Las tres rutas declaran `protegido({ roles: ["admin"], … })` (`gestion.ts:162`, `:172` y `:202`). El `confirmar` (`:175`) y el cuerpo de duplicar (`:205`) se validan dentro del handler, así que el estudiante recibe `403 ROL_NO_PERMITIDO` en `requireRole`, antes de cualquier efecto. Ese código ya está en la lista de (e) (`:311`) y no suma a `revisadas` (`:312`), así que la precondición `> 10` no cambia. No ejecuté (e) con las cuatro líneas, porque no edito pruebas. La conclusión sale del código y de ADM-T1A09, que ya recorre esas rutas con el maestro ajeno, el restringido, el de cambio pendiente y sin token, y pasa.
- **Nada más del archivo cambia.** E7-1 lo dice de forma explícita (títulos, tipos, ayudas, cuerpos y precondiciones) y lo protege con una PARADA si otro caso falla o (a) no da 88.

### (b) El grep de E7-2 y E7-3 está completo
Repetí el grep de `printRoutes|rutasDeLaApp|hasRoute|onRoute|RUTAS_PUBLICAS` en `backend/test` y `backend/src/**/*.test.ts`. Encontró 15 archivos.
- **Nueve los nombra la enmienda:** la matriz, `clases-archivadas-r1.ataque`, `gestion-clases-autorizacion`, `guarda-todas-las-rutas`, `protegido-clase-archivada`, `recursos-autorizacion`, `movimientos-inscripcion`, `autorizacion-cuentas` y `sesiones-y-cadena.ataque`.
- **Los otros seis no enumeran el árbol de la app:**
  - `src/middleware/index.test.ts:91`, `guarda-ch-r1.ataque:12,67`, `guarda-clase-r1.ataque:11` y `middleware-orden.integracion:36,186-191`: comentarios sobre la guarda `onRoute`, o pruebas de esa guarda con rutas propias.
  - `guarda-ch-r3.ataque:143`: `"onRoute"` es un nombre en una lista de hooks bloqueados.
  - `higiene-de-pruebas:264`: es un título.

  Ninguno cambia con rutas nuevas.
- **`duplicar` y `conteo-de-borrado`** solo aparecen en las tres pruebas nuevas de 01b, en C-3 (`sesiones-y-cadena.ataque`) y en C-5 (`lecturas-fx-r1.ataque:806`, un comentario). Las otras dos coincidencias, `enlaces.test.ts:38` y `migracion-maestros-de-clase:48`, son la palabra "duplicar" en un título ajeno.
- **01e:** ninguna prueba existente pide las nueve rutas de §D-7 y §D-8 ni espera un `404` en ellas. La única prueba sobre `/api/admin/usuarios/:id/…` que no es de restablecer ni de correo es `cuentas-r2.ataque:310-319` (`/borrar`, que sigue sin existir), y E7-3 ya la vigila. Ninguna de esas rutas lleva `:claseId`, así que ADM-1A09 no cambia en 01e. El único riesgo, `noReconocidas` sobre el árbol completo, ya está como vigilada.

### (c) No cambia nada más
- Los cinco hunks son solo E7-1 a E7-5.
- "Se toca", "No se toca", §D-1, las demás listas cerradas, C-3 a C-8, C-25 a C-32 y las pruebas requeridas quedan idénticos.
- La matriz y `clases-archivadas-r1.ataque` están sin cambios en el árbol de trabajo.

## Problemas que bloquean
Ninguno.

## Detalles menores
- **E7-2, la lista de patrones.** Incluye `onRoute`, que también encuentra los seis archivos de (b) que la enmienda no nombra. Ninguno enumera rutas, así que la conclusión no cambia. Si se quiere que el grep sea reproducible tal cual, bastaría con una nota de que esos seis se descartan como comentario, guarda propia o lista de hooks.

## Para el humano
Nada que decidir.

### Veredicto de esta verificación
**APROBADO.** El programador aplica las cuatro líneas de E7-1 y vuelve a correr ADM-1A09 completo: los cinco casos deben pasar y (a) debe dar 88. Después sigue con el paso 13.

## Verificación del resumen — ADMIN-01b

Plan: `plan.md` = `4f46a1a6bb59bdab789eef4b7fb693c5b6f43a22d7e38c86e1364b0470b2a6c1` (Enmiendas 1 a 7, comprobado). Resumen: `resumen-programador.md` = `986ec2bd90ee5f2b182155324a7b6c730adc69f26fb4fc3e9dd41bef188df5a2`, 514 líneas (comprobado), sección "ADMIN-01b — Implementación" con "Reanudación" y "Cierre del paso 13". Base: `68242f3` fuera de los paquetes; `69057f7` dentro.

Entorno: red `IZZI-F281-5G`, perfil Público; regla "Campus: bloquear entrada a Docker en redes publicas" habilitada (Inbound, Block, Public); Docker 28.5.1. Trabajo en paralelo: respuesta del humano transmitida por el orquestador (la otra copia no se usa). Ningún `node` corriendo antes de cada suite; una suite después de otra.
- **Puerta de carga: no se cumplió.** La CPU estuvo entre 40 % y 62 % en todas las lecturas (antes y después de la suite), por un proceso ajeno: `ZenlessZoneZero` (PID 8004, un juego). No lo terminé (no es mío). Corrí igual la suite de módulos: la carga solo puede producir rojos falsos por tiempo, no verdes falsos, y la corrida salió en verde y con las mismas cifras del resumen. Para la suite completa del cierre, la puerta sí importa (ver "Para el humano").

### Cifras: resumen frente a mi corrida

| Comprobación | Resumen | Mi corrida |
|---|---|---|
| backend `npm run lint` | `> tsc -p tsconfig.json --noEmit && tsc -p tsconfig.test.json`, exit 0 | igual, exit 0 |
| backend, suite de módulos (`npx vitest run test/{muro,recursos,archivos,gestion,cola,clases,bloqueo,lecturas,worker,sesiones-y-cadena,arquitectura,hilo-01c,temas-01a,entregas-01b-r1,calificaciones-estatico,arranque,logs-archivos,borrado,duplicado,copias,colas-objetos,guarda,sexto,db-cliente,servicio-ocupado,higiene}* src/workers/ritmo-03c-r1.ataque.test.ts src/adapters/storage src/core`, desde `backend/`) | `Tests  1427 passed (1427)` · `Test Files  121 passed (121)` | `Tests  1427 passed (1427)` · `Test Files  121 passed (121)` (138.19 s) |
| Las tres con `printRoutes` (`movimientos-inscripcion`, `gestion-clases-autorizacion`, `recursos-autorizacion`) | `Tests  31 passed (31)` | `Tests  31 passed (31)` · `Test Files  3 passed (3)` |
| ADM-1A09 (`clases-archivadas-matriz.integracion`) | `5 passed (5)` | `Tests  5 passed (5)` |
| backend `npm run build` | exit 0 | exit 0 (`> tsc -p tsconfig.json`) |
| shared `npm run build` | exit 0 | exit 0 |
| shared `npm run lint` | `All matched files use Prettier code style!` | igual, exit 0 |
| frontend `npm run lint` | `> tsc -b`, exit 0 | igual, exit 0 |
| frontend `npm run build` | `✓ built in 1.26s` | `✓ built in 1.65s`, exit 0 (el tiempo varía) |
| frontend `errores-ch3-r2.ataque` | `Tests  84 passed (84)` | `Tests  84 passed (84)` |
| `npx vitest list` de los 11 archivos de 01b | 51 casos · 11 archivos · 46 "ADM-1B" | 51 (`grep -a -c " > "`) · 11 (`cut -d' ' -f1 \| sort -u`) · 46 (`grep -a -c "ADM-1B"`) |
| PA-07 sobre la corrida de módulos | 0/0/0/0 · 3 "Error no controlado" · 3 `P2028` | `40P01` 0 · `deadlock detected` 0 · `could not serialize` 0 · `too many clients` 0 · `"Error no controlado"` 3 (los tres `ZodError` "La URL del almacén debe ser http o https", los mismos de 01a) · `"code":"P2028"` 3 (nivel 40, de `servicio-ocupado`: `tx.sesion.findFirst` de `usuarios.ts:293`, `tx.sesion.updateMany` de `sesiones.ts:72` y el `$queryRawUnsafe` del comentario) |
| `prisma validate` | válido | `The schema at prisma\schema.prisma is valid` |
| `prisma migrate status` | — | `18 migrations found in prisma/migrations` · `Database schema is up to date!` |
| Deriva (E1-11) | `No difference detected.`, exit 0 | `No difference detected.`, exit 0 (comprobado sin tubería) |

Además, como vigiladas de E7-2 que la corrida de módulos no incluye: `protegido-clase-archivada.test.ts` y `autorizacion-cuentas.integracion.test.ts`, `Tests  26 passed (26)`.

**Las "73 rutas".** El resumen no trae la lista literal, solo los 26 prefijos. En Git Bash esos prefijos dan 70 archivos distintos de `test/` (71 con la repetición de `cola*` y `colas-objetos*`), no 73. Con `ritmo-03c-r1` (1) y los 50 de `src/core` y `src/adapters/storage` suman exactamente los 121 archivos del resumen, y la corrida da los mismos 1427 casos. Es el mismo conjunto; solo el "73" no se puede reproducir. No devuelvo el resumen por esto (N-31).

### Pruebas requeridas (ADM-1B01 a 1B24)
Saqué con un script los 45 títulos entre comillas del resumen (los 11 de ADM-1B01 y los 34 de ADM-1B02 a 1B24) y busqué cada uno, exacto, en la salida de `npx vitest list`: **los 45 existen tal cual**, en el archivo que dice el resumen. Cada viñeta del plan tiene al menos un caso. El caso número 46 con "ADM-1B" es "las colas de objetos existen con la política de los avisos y su cola de fallidos (§D-6)", que solo lleva "ADM-1B16" en el `describe`. El resumen lo cuenta entre los 5 restantes ("la política de las colas"), pero en realidad está dentro de los 46. Es un detalle de redacción; las cifras coinciden.

**ADM-1B24** (`duplicado-de-clase.integracion.test.ts:668-778`) cumple (a) a (e) y N-28 a N-30:
- (a) `copiaDe` igual al id del original y un solo trabajo de `COPIAR_OBJETOS`, los dos con mensaje (N-28), antes de archivar. Después, archivar → `200`, borrar → `409 CLASE_CON_COPIAS_EN_CURSO`, y la original, el recurso, el archivo y `copia_de` siguen; ningún `BORRAR_OBJETOS` lleva su clave.
- (b) `procesarCopiaDeObjetos` se llama directo con el trabajo que se lee de pg-boss (N-29). Antes, se afirma con mensaje que el objeto original existe (N-30), y después que la copia terminó y que su objeto existe.
- (c) `204`, y la clase, el recurso y el archivo de la original ya no existen.
- (d) La copia sigue activa y sin `archivadaEn`. Su recurso, con su adjunto, sale en `GET …/recursos` como su maestro. La fila sigue `confirmado`, con `copia_de` nulo y la misma publicación, clase y clave. El objeto existe, y la descarga da `200` con la clave firmada.
- (e) Las claves de los trabajos de borrado son exactamente las de la original, comparadas ordenadas, con el conjunto no vacío afirmado (N-30). Ningún trabajo lleva la clave de la copia. El consumidor, llamado directo, borra el original y deja la copia.
- N-29 en todo 01b: ningún archivo registra consumidores en las colas reales. `worker-objetos` usa `PRUEBA_*` y `colas-objetos` usa `PRUEBA_CANCELAR_VARIOS`; lo comprobé con grep.

### Migración `20261105163205_admin_01_copias_de_archivos`
- El SQL trae `ADD COLUMN "copia_de" UUID`, los tres índices (`archivos_copia_de_idx`, `archivos_clase_id_estado_idx`, `movimientos_inscripcion_clase_id_secuencia_idx` con `"secuencia" DESC`), la FK `archivos_copia_de_fkey … ON DELETE RESTRICT ON UPDATE CASCADE` y, al final, el bloque a mano `CHECK archivos_copia_solo_confirmado ("copia_de" IS NULL OR "estado" = 'confirmado')` con su comentario (R-02). Es el mismo SQL que el programador mostró en su PARADA y que el humano confirmó; la Enmienda 6 deja la FK en `RESTRICT`.
- El esquema coincide: la relación `CopiasDeArchivo` con `onDelete: Restrict`, `@@index([copiaDe])`, `@@index([claseId, estado])` y `@@index([claseId, secuencia(sort: Desc)])`. Los comentarios de `Archivo` y `MovimientoInscripcion` están al día (ya no dice "Sin índices secundarios").
- `migrate status` está al día (18 migraciones) y la deriva no tiene diferencias. ADM-1B14 prueba el `CHECK`, la FK y los índices contra la base desechable.
- Es compatible hacia atrás: la columna es nula y las filas existentes cumplen el `CHECK`.

### E4-4 y E7-1, exactos
- **E4-4** (`bloqueo-usuario.integracion.test.ts`): el título suma los cuatro archivos; el arreglo suma exactamente `bloqueo-maestros.ts`, `borrado-de-clase.ts`, `copias-de-archivos.ts` y `duplicado-de-clase.ts` en orden alfabético; y el comentario de ADMIN-01b va después de la línea de ADMIN-01a. Nada más cambia: el patrón, la lectura y la comparación siguen iguales. Mi grep de `$queryRaw`/`$executeRaw` sobre el primer nivel de `adapters/db` da los mismos 18 archivos del arreglo, y ningún archivo existente ganó SQL etiquetado.
  - `copias-de-archivos.ts` entra porque `leerCopiasPendientes` es un `$queryRaw`, no por las escrituras, que sí son `updateMany`. La previsión de E4-4 ("solo si no expresa sus dos sentencias con `updateMany`") pensaba en las escrituras. La regla que manda, "exactamente los archivos nuevos que usen SQL etiquetado, declarados por el programador", se cumple.
  - El `$queryRaw` es una sola sentencia parametrizada (`copia.id = ANY($1::uuid[])` por PK, `LEFT JOIN` por la PK del original), que es lo que piden M-03 y ADM-1B21. Lo acepto.
  - El comentario ocupa cuatro líneas y no una, porque nombra cuatro archivos sin pasar de 100 columnas. Es un detalle.
- **E7-1** (`clases-archivadas-matriz.integracion.test.ts`): un solo hunk, `@@ -61,0 +62,4 @@`, con las cuatro líneas literales de la enmienda. (a) da las 88 rutas y los cinco casos pasan.

### V-01, C-3 a C-5 y "No se toca"
- **V-01:** saqué la tabla de la ronda 0 de 01b (`reporte-tester.md:822-1077`) en formato `sha256sum -c`. Tiene 251 filas y su lista da `24fb3fe3108411588388b6e7c75cd335dae64c4021968ddff43c12602f3dd18e`, igual a la declarada. `sha256sum -c` no da diferencias. `git ls-files` lista las mismas 251 `*.ataque` y no hay ninguna sin rastrear: el programador no tocó ninguna.
- **C-3 a C-5:** `sesiones-y-cadena` `71c54a11…`, `lecturas-fx-r2` `b008263d…` y `lecturas-fx-r1` `82fe8c49…`, iguales a los del tester. Las tres pasan en la corrida de módulos.
- **Dentro de los paquetes, contra `69057f7`:** cambian 22 archivos rastreados y hay 23 nuevos (la migración incluida), todos de "Se toca" de 01b (incluidos `bloqueo-maestros.ts`, los dos descartes y `objetos-en-memoria.ts`), de la lista cerrada (E4-4 y E7-1), de C-3 a C-5 del tester, o pruebas y ayudas nuevas. Tampoco cambian `workers/index.ts`, `config/`, `middleware/`, `app.ts`, `adapters/db/clases.ts` ni `frontend/`.
- **Fuera de los paquetes, contra `68242f3`:** solo cambia `docs/trabajo/ADMIN-01-administracion/`. `AGENTS.md`, `CLAUDE.md` y los cuatro `.claude/agents/*.md` coinciden con los SHA-256 que anotó `aprobacion.md` (`5b818b82…`, `b5cde043…`, `92bd117a…`, `41a4fa3e…`, `b1d0965c…`, `f33831f0…`). Sigue sin rastrear el archivo ajeno `docs/trabajo/DEPLOY-investigacion-vps.md`, que no entra en el commit de 01b.

### Decisiones donde el plan calla
- **Copia local de `conReintentoDeCodigo` (y de `traducirErrorDeCodigo`) en `duplicado-de-clase.ts`. Aceptada.** Para compartir la de `clases.ts` habría que tocar ese archivo, que no está en "Se toca" de 01b, y eso es PARADA. La copia es idéntica a la de `crearClaseAdministrada`: un reintento que envuelve la transacción entera, que es lo que pide §D-5, paso 4. Deja duplicadas unas 30 líneas (N-32).
- **`confirmado` en `borrarClaseDefinitivamente`. Aceptada, y es la única forma correcta.** El orden de ADM-1B01 (activa → copias en curso → confirmación) exige leer la clase con `FOR UPDATE` antes de decidir sobre la confirmación. Así, una activa sin `confirmar` responde `409 CLASE_NO_ARCHIVADA` (ADM-1B03), y en una archivada la decisión se toma dentro de la transacción, con la fila retenida. La firma de "Cambios por capa" solo omitía el campo.
- **Las colas de fallidos nuevas no fijan `retryLimit`. Aceptada.** Es la forma de `AVISO_FALLIDO` y `CORREO_DE_CUENTA_FALLIDO` en `colas.ts`. §D-6 fija la política de las colas que reintentan (3 reintentos con espera exponencial y 7 días de retención), y las dos colas nuevas la cumplen (lo prueba el caso de política de `colas-objetos`). El consumidor de `COPIAR_OBJETOS_FALLIDO` es idempotente: `descartarCopias` filtra `copiaDe` no nulo.
- **El mensaje "no es válido" de `confirmarBorradoClaseSchema`. Aceptada.** `validarParametros` lo arma como `confirmar: no es válido`, en español y con la forma de `cursor: no es válido`. `confirmar` está en el `INVENTARIO` de `errores-ch3-r2.ataque` (O-01b-10), que da `84 passed`.
- Las demás también se aceptan: el repositorio como parámetro para contar sentencias; datos inválidos en las colas principales registrados en `error` y completados, como `CORREO_DE_CUENTA`; `503 ALMACEN_NO_CONFIGURADO` sin almacén, que es el "error controlado" de §D-4; el original sin fila, inalcanzable con `RESTRICT`, probado como original descartado y sin objeto; y las decisiones de `planDeDuplicado`.

### §D-4 a §D-7.9, R-02 y O-01b-1 a O-01b-11, contra el código
- **§D-4:**
  - El conteo lee la clase y hace cinco `count` en `instantaneaUnica` (exactamente uno en `borrado-de-clase.ts`, como pide C-5).
  - El borrado sigue los pasos 1 a 7 en orden: `bloquearClaseParaBorrar` con `$queryRaw … FOR UPDATE` (no se llama `bloquearClase`); dos `findFirst` de copias (`copiaDe` no nulo y `copias: { some }`); `decidirBorrado`; las claves de todos los estados y los `trabajo_id`; `cancelarVarios` y `encolarVarios` con la conexión de la transacción y `inicio = ahora + 600 000 ms` en lotes de 1000; `movimientoInscripcion.deleteMany`; y `clase.deleteMany`. Todo con `timeout` de 30 s.
  - `adapters/db` no importa `adapters/queue`: el handler arma las dos funciones (O-01b-5).
- **§D-5:**
  - Pasos 1 a 5 en orden. La original va `FOR SHARE`; después, `bloquearMaestrosActivos` (`FOR SHARE`, `ORDER BY id`); el paso 2b (copias en curso → `409`); cuatro lecturas sin ciclo; un `create` con los maestros y un `createMany` por tabla; y `encolarCopias` en lotes de 100, solo si hay archivos.
  - No encola `MATERIAL_CREADO` ni lo nombra (O-01b-4). La descarga de la clase responde `409 ARCHIVO_EN_COPIA` solo si `copiaDe` no es nulo; las de entregas no cambian.
  - Los dos descartes de M-02 suman `copiaDe: null`, y los de `tareas.ts` y `entregas.ts` no cambian, como dicen el plan y los hermanos del resumen.
  - El worker cumple M-03: una lectura; en el ciclo, solo el almacén; dos `updateMany` en el `finally`; y relanza.
- **§D-6:** colas y esquemas en `core/eventos/objetos.ts`, el puerto aparte en `core/archivos/objetos.ts`, `crearAlmacenDeObjetos` con `copyObject` y `removeObjects`, y `registrarConsumidoresDeObjetos` llamado desde `worker.ts` después de `registrarConsumidores`. `workers/index.ts` no cambia, y no hay variables ni proveedores nuevos.
- **§D-7.9:** el orden de bloqueos del duplicado es la original y después los maestros, los dos `FOR SHARE`. `bloquearMaestrosActivos` no se reexporta en `index.ts`.
- **R-02:** el `CHECK` va a mano en la migración y la deriva no tiene diferencias.
- **O-01b-1 a O-01b-11:**
  - No hay `DELETE FROM` ni `TRUNCATE` en `backend/src`, y el conjunto de modelos borrados solo suma `clase` y `movimientoInscripcion`. C-4 está en verde.
  - Hay un solo `instantaneaUnica: true`. C-5 está en verde.
  - Las rutas son exactas. C-3 está en verde.
  - No se nombra `MATERIAL_CREADO`. `muro-c-r1` está en verde.
  - `adapters/db` no importa `adapters/queue`. `hilo-01c-r1` y `entregas-01b-r1` están en verde.
  - `workers/objetos.ts` usa funciones de `adapters/db`, sin `obtenerDb` ni `console.`. `arquitectura-cuentas-r1` está en verde.
  - Los comentarios de `colas.ts` no nombran lo prohibido. CAL-T-20 está en verde.
  - `worker.ts` carga `cargarEnv()` y `cargarEnvCorreo()` antes del almacén, no registra sus opciones y termina con `worker_listo`. `arranque-r1` está en verde.
  - ADM-T1A09 está en verde. `confirmar` está en el inventario. E4-4 está aplicado.
  - N-18 se cumple: las clases nuevas tienen uno o dos maestros, y `maestroIdsSchema` ya rechaza los repetidos sin distinguir mayúsculas.

### Problemas que bloquean
Ninguno.

### Problemas que no bloquean
- **N-31. El comando de la suite de módulos va abreviado y el "73" no se reproduce.** El resumen dice "73 rutas", pero sus 26 prefijos dan 70 archivos de `test/`. Aun así, el total coincide (121 archivos, 1427 casos), así que es el mismo conjunto. La regla de "Resúmenes verificables" pide el comando incluido. Desde 01c, el resumen trae el comando literal (o la lista de archivos) y no un marcador `<…>`.
- **N-32. Hay unas 30 líneas duplicadas** (`conReintentoDeCodigo` y `traducirErrorDeCodigo`) entre `adapters/db/clases.ts` y `duplicado-de-clase.ts`. Destino: 01e, que toca `crearClaseAdministrada` en `clases.ts` (§D-7.9). Si el arquitecto lo admite sin enmienda, una sola copia exportada; si no, carril trivial al cierre. No cambia el comportamiento.

### Detalles menores
- ADM-1B17: el plan dice `200` y la ruta real responde `204`. El resumen lo declara, y el texto del plan es el que está mal.
- `procesarCopiaDeObjetos`: si `terminarCopias` o `descartarCopias` fallan dentro del `finally` mientras se propaga un error del almacén, el error que llega a pg-boss es el de la base y no el del almacén. Los dos provocan el reintento y ninguno se traga.
- `duplicado-de-clase.ts`: la guarda `if (primero === undefined) return null` no se puede alcanzar, porque los ids ya se validaron de 1 a 2.
- ADM-1B24: `terminada.publicacionId ?? ""` en una prueba propia. Si fuera nulo, el `toHaveLength(1)` siguiente fallaría con ruido, así que no oculta nada. Se suma a los `?? ""` del carril trivial del cierre. La variable `recursoOriginal` nombra en realidad el recurso de la copia.
- `handlers/README.md`: una línea de la viñeta de ADMIN-01b (`archivos }`…) empieza en la columna 0 y rompe la sangría de la lista.

### Para el humano
- **Carga para la suite completa del cierre de 01b.** Hoy un juego (`ZenlessZoneZero`) mantiene la CPU entre 40 % y 62 %. La corrida de módulos pasó igual, pero la suite completa del backend (unos 2900 casos) ya cayó dos veces en 01a por carga ajena, con `Hook timed out`. Para la revisión final conviene cerrarlo (es el mismo caso que N-21).

### Recomendaciones para el tester (ronda 1 de 01b)
1. Carreras entre duplicar y borrar, y entre cualquiera de los dos y la descarga o el worker: que nunca quede una copia sin objeto ni un `500` por `P2003` (la FK `RESTRICT` es defensa en profundidad; si actuara, el error no está traducido).
2. El conteo (`HEAD` incluido) y el borrado con una FK que no se previó, más de 1000 claves, archivos `pendiente`, `descartado` y de entregas, y recordatorios vivos. También el `503` del `timeout` de 30 s, que debe dejarlo todo como estaba.
3. Lo que se cuela al duplicar: un material sin bloque de un maestro, temas con huecos o empates, un recurso con el tema borrado, archivos que no están `confirmado`, claves fuera de `materiales/{claseNueva}/` y la descripción.
4. El worker de copias: reintentos con éxito parcial, un descarte en vuelo (R-14), datos fuera del esquema en las tres colas y el consumidor de fallidos.
5. `confirmar` repetido, vacío o en mayúsculas, y las tres rutas con un rol incorrecto, una clase ajena o un alumno restringido. Comprobar también que ninguna respuesta del admin lleve `estadoPago`.
6. Los datos de los trabajos: solo claves o ids, nunca nombres ni texto.

### Veredicto de esta verificación
**ACEPTADO.** Todas las cifras del resumen coinciden con mi corrida, y cada viñeta de ADM-1B01 a 1B24 tiene su caso con el título exacto. La migración, E4-4, E7-1, V-01 (251) y "No se toca" están limpios. N-31 y N-32 no bloquean. El tester puede atacar 01b.

## Verificación de la Enmienda 8 — ADMIN-01

Plan enmendado: `plan.md` = `e539dbcd877f0da7b2e895dff4d8ac099d400ca1fadd66d9f7b36d0a1838b183`, igual al de la entrada "Enmienda 8 del arquitecto" de `aprobacion.md`, sin CR. Copia previa: `copias-plan/plan-admin01-antes-enmienda8-4f46a1a6.md` = `4f46a1a6bb59bdab789eef4b7fb693c5b6f43a22d7e38c86e1364b0470b2a6c1`, la de la Enmienda 7.

Entorno, para las dos corridas de abajo: red `IZZI-F281-5G`, perfil Público. La carga dio 24 % y 23 %, y no había ningún `node` corriendo. El juego de la verificación anterior ya estaba cerrado.

### Cotejo del diff
`git diff --no-index` completo contra la copia previa: 133 inserciones y 4 borrados, en 7 hunks. Todos pertenecen a un E8-n:

| Hunk | Sección | E8-n |
|---|---|---|
| `@@ -2 +2 @@` | Estado | E8-6 ("Enmiendas 1 a 8" y la nota de la Enmienda 8) |
| `@@ -752 +752 @@` | Pruebas requeridas, ADM-1E10 | E8-4 (tacha "acotado por conteos antes y después" y remite a la regla E8) |
| `@@ -976,0 +977,99 @@` | §D-R0 01b, lista cerrada | E8-1, E8-2 y E8-3 |
| `@@ -990,0 +1090,15 @@` | §D-R0 01e | E8-4 (la regla, ADM-1E11 y las vigiladas) |
| `@@ -1198 +1312 @@` | Paso 13 | E8-5 |
| `@@ -1218 +1332 @@` | Paso 25 | E8-4 |
| `@@ -1386,0 +1501,15 @@` | Tabla de la Enmienda 8 | E8-1 a E8-6 |

Las referencias de línea coinciden con los archivos de hoy:
- `clases-archivadas.integracion.test.ts`: los imports `:13` y `:14`; `contar` en `:454`; `listar` en `:455-461`; `entre` en `:462-465`; las tres llamadas a `entre` en `:477`, `:499` y `:526`; `sinEstadoConCursorArchivado` en `:527`.
- `gestion-clases.integracion.test.ts`: el import `:13` (no tiene otro import de `adapters/db/index.js`); `:353`, `:362` y `:363-366`.

Corrida de hoy de los dos archivos, sin cambios: `Tests  35 passed (35)`, 14 casos en `clases-archivadas.integracion` y 21 en `gestion-clases.integracion`. Es la línea base para el "mismo número de casos" de E8-5.

### (a) E8-1, ADM-1A11
- **Sigue probando lo que pide §D-2.** No cambian el filtro y el orden de las tres listas por HTTP, la posición de la Enmienda 5, los `400` del cursor del otro estado y de la posición, el `200` sin estado con cursor archivado, ni `estado=otra`.
  - El `total` por estado pasa de una cota a una igualdad exacta contra el conteo por el mismo filtro, en la misma instantánea.
  - El caso se vuelve más estricto. Si `listarClasesAdmin` no filtrara el `total`, `activas` daría al menos `activasContadas + 2` (las dos archivadas del caso están ahí, y lo afirman las cotas `≥ 1` y `≥ 2`), y el caso fallaría.
  - El transporte queda cubierto por HTTP con `totalDeLaPrimeraPagina`: `total` y filas salen de la misma instantánea, y con página siguiente hay al menos `limite + 1` filas. El handler pasa `total` tal cual (`handlers/clases/gestion.ts:61-75`, `...resultado`).
  - Lo único que deja de verse por HTTP es el filtro del `total`, y lo cubre la comparación de la misma instantánea. Es correcto.
- **Es determinista.** En `adapters/db/cliente.ts:53-74`, `enTransaccion` solo abre una transacción si el ejecutor tiene `$transaction`. Con un `TransactionClient` corre `fn(ejecutor)` sobre él, y las opciones de la llamada anidada (la `instantaneaUnica` de `listarClasesAdmin`) no aplican.
  - Hay precedente de que funciona en tiempo de ejecución: `lecturas-fx-r1.ataque:449-470` y `lecturas-consistentes.integracion:825` y `:841` pasan `tx` a `listarClasesInscritas`, `listarClasesImpartidas`, `listarTrabajo` y `listarPublicaciones`. Sus controles en READ COMMITTED prueban que la lectura corre sobre la transacción de afuera.
  - En REPEATABLE READ, las seis sentencias en serie ven la instantánea de la primera.
  - La transacción solo lee. No retiene filas ni pide `LOCK TABLE`, y lleva un `timeout` explícito de 10 s (la regla de bloqueos de `AGENTS.md`). Los `LOCK TABLE … NOWAIT` con reintento la encuentran igual que a la petición HTTP de hoy.
  - El `pool` en READ COMMITTED que mide `lecturas-fx-r1:755` es por proceso. Cada archivo de Vitest tiene el suyo, así que no le alcanza.
- **El cambio es mínimo:** solo los dos imports, `listar` y `totalDeLaPrimeraPagina` en lugar de `contar`, `listar` y `entre`, las tres llamadas y el bloque de la misma instantánea. Ninguna otra línea del caso usa `antes`, `despues`, `contar` ni `entre`; lo comprobé con grep.
- **Reglas estáticas:**
  - `lecturas-fx-r1.ataque:758-834` recorre solo `backend/src` y quita los `*.test.ts`. La regla de que nada fuera de `adapters/db` nombre `enTransaccion` o `instantaneaUnica` (O-01b-2 de la ronda 0) no alcanza a `backend/test`. Ya hay pruebas que llaman a `enTransaccion` (`cola.integracion`, `colas-objetos.integracion`, `categorias-01a-r1.ataque:450`).
  - PR-CH-04h (`higiene-de-pruebas.integracion:228-246`) cuenta `.$transaction(` solo en `backend/src`, y el bloque nuevo no tiene ninguno.
  - PR-CH-01c (`LOCK TABLE` sin `NOWAIT` en `backend/test`) no aplica, porque el bloque no bloquea tablas.
  - Las demás pruebas estáticas que nombran estos términos (`calificaciones-estatico*`, `calificaciones-lecturas-estatico`, `exportacion-calificaciones-estatico`, `hilo-01c-r1`, `instantanea-01b-r1`, `lecturas-fx-r2`) leen solo `backend/src` o `shared/src`, según su `readdirSync` o `readFileSync`.

### (b) E8-2, PR-2A12
- Tiene el mismo defecto que ADM-1A11 (`:353` y `:362-366`) y el mismo remedio. Por HTTP, `total ≥ filas + (hay siguiente ? 1 : 0)`, con igualdad sin página siguiente. Además, `listarClasesAdmin` con `tx` y `clase.count()` en la misma instantánea REPEATABLE READ, con `timeout` de 10 s.
- No cambian el título, el recorrido por páginas (`:333-351`), la página de 50 y su orden (`:354-361`), `total ≥ 5` ni las aserciones de maestros y alumnos.
- El import nuevo va después de `:13` y sigue el orden de las rutas. Las mismas condiciones de PARADA. Mismo análisis de determinismo y de reglas estáticas que en (a).

### (c) El grep de las hermanas
Repetí la búsqueda en `backend/test` y `backend/src/**/*.test.ts`:
- `Math.min(`/`Math.max(` con un `total`: solo `clases-archivadas.integracion:463-464` (E8-1), `gestion-clases.integracion:365-366` (E8-2) y `gestion-02a-r1.ataque:798-799`.
- `.count()` sin filtro, o con `rol`, `activo`, `archivadaEn` o `estado`: `clase.count()` solo en esas tres. El resto son `usuario.count({ where: { rol: "admin" } })` igual a 1 (`admin-unico.integracion:50` y siete `*.ataque`) y `cuentas-r1.ataque:790` (`> 0`).
- Las 27 líneas con `.total)`: fuera de las tres de PR-2A12 (`gestion-clases.integracion:365-367`), todas son por usuario, tarea o clase del caso (`clases-archivadas.integracion:240-255`, `:348` y `:375`; `lecturas-consistentes:333`, `:356` y `:372`; `lecturas-fx-r1:398-523`; entregas y calificaciones; `clases-r1`, `clases-r4`), o exactas sobre datos propios.
- Las lecturas de la lista global `/api/admin/clases` sin cursor: `clases-archivadas.integracion:167` solo mira propiedades de las filas; `gestion-clases-autorizacion:116`, `logs-02a-r1:168` y `lecturas-fx-r1:943` no comparan cuántas son; y las de `?estado=archivadas` en `clases-archivadas-r1` y `-r2` se ordenan por fechas fijas propias (2019, 2020 y 2026-01), que el archivado por la API de 01b, con la hora real, no intercala delante.

El grep del plan está completo. Las vigiladas de E8-3 están bien elegidas.

**`gestion-02a-r1.ataque:793-799` como observación para el tester es la salida correcta.** Tiene el mismo patrón exacto (`total` de `?limite=2` entre dos `clase.count()`), así que puede fallar de forma intermitente. Es una `*.ataque`, y la regla es que solo el tester la cambia, con un C-n. El programador no puede tocarla, y no hacía falta otra ronda 0 para un rojo que todavía no se ha visto. Si cae en la corrida de módulos de la próxima entrega o en la suite completa del cierre, cuenta como interferencia conocida (E8-3), no como un defecto de 01b. Recomiendo que el tester la acote en su ronda 2 con el remedio de E8-2, como un C-n declarado: así la suite completa del cierre no depende de la suerte.

### (d) E8-4, para 01e
- **No amplía el alcance.** Es una regla sobre cómo se escriben las pruebas nuevas que el plan ya pedía (ADM-1E02, 1E10 y 1E11), con el texto de ADM-1E10 y el paso 25 al día. No suma pruebas requeridas, rutas, campos ni contratos. La lista cerrada de 01e no crece: ninguna prueba existente lee las tres rutas, que nacen en 01e.
- **El `ejecutor` no cambia firmas fuera de "Se toca" de 01e.** Las lecturas que nombra (`leerResumenAdmin`, `listarUsuarios` y la de movimientos) viven en `adapters/db/gestion-de-usuarios.ts` y `adapters/db/movimientos.ts`, dos archivos nuevos de "Se toca" de 01e (§D-R0 01e). Son funciones nuevas, con el mismo patrón que `listarClasesAdmin` (`ejecutor: Ejecutor = obtenerDb()`): no se cambia ninguna firma existente.
- Las escrituras de la misma instantánea (crear un estudiante, desactivar un maestro y archivar una clase del caso) se pueden hacer con Prisma directo sobre `tx`, o con funciones que ya reciben `ejecutor` (`archivarClase(claseId, ejecutor)`, `clases-archivadas.ts:25-28`). No obligan a tocar archivos de fuera.
- El centinela que deshace la transacción sale tal cual de `enTransaccion`: `traducirErrorDeTransaccion` (`errores.ts:65-70`) solo traduce `P2028`. Es el precedente de `colas-objetos.integracion:66-76`.
- ADM-1E11 (buscar sus movimientos por `id`, recorriendo páginas con un límite y un mensaje, con orden relativo y `secuencia` descendente) es determinista con el cursor por `secuencia`, que nunca cambia.

### (e) Nada más cambia
Los siete hunks son todos E8-n. No cambian §D-2, "Se toca", "No se toca", el contrato, el código de producción, las `*.ataque`, los C-n (C-3 a C-5 de 01b; C-6 a C-8 y C-25 a C-32 de 01e) ni las demás listas cerradas y vigiladas. El paso 13 nombra el orden de verificación y pide el `git diff -U0` de los dos archivos en el resumen.

### Problemas que bloquean
Ninguno.

### Detalles menores
- E8-4 (b): si una prueba de 01e hace el cambio esperado con una escritura que sigue el protocolo PB (`cambiarActivo`, con `bloquearUsuarioParaEscribir`), esa escritura corre en REPEATABLE READ. `cliente.ts:50-52` dice que PB depende de READ COMMITTED. Con filas solo del caso no hay carrera, pero conviene que el programador de 01e haga esos cambios con Prisma directo sobre `tx`, sobre las filas del caso, y que deje las rutas de baja y acceso para sus pruebas propias en READ COMMITTED. No es un defecto del plan; es una nota para el resumen de 01e.
- E8-5 pide "el mismo número de casos que antes": hoy son 14 y 21 (35 en total).

### Para el humano
Nada que decidir. La Enmienda 8 es una ampliación mínima de la lista cerrada, como la 4 y la 7, y no cambia contrato ni alcance.

### Veredicto de esta verificación
**APROBADO.** El programador aplica E8-1 y E8-2 con el alcance exacto. Primero corre solos los dos archivos (deben dar 14 y 21 casos, todos en verde) y después la suite de módulos, con el `git diff -U0` de los dos en el resumen. Para el tester queda la observación de `gestion-02a-r1.ataque:793-799` (recomendado acotarla con un C-n en su ronda 2).

## Verificación de la corrección de la ronda 1 — ADMIN-01b

Plan: `plan.md` = `e539dbcd877f0da7b2e895dff4d8ac099d400ca1fadd66d9f7b36d0a1838b183` (Enmiendas 1 a 8, comprobado). Resumen: `resumen-programador.md` = `e343edb1d7b3f3996935b082221efc1b4a54c50449feda1c5813d91036c78a44`, 742 líneas (comprobado). Se revisan las secciones "ADMIN-01b — Corrección ronda 1" y "Enmienda 8".

Entorno:
- Red `IZZI-F281-5G`, perfil Público, con la regla del firewall habilitada (Public). Docker 28.5.1.
- Puerta de carga cumplida: 24/0/17 % antes del `lint` y de los dos archivos, y 15/14 % antes de la suite de módulos.
- Ningún `node` corriendo antes de las corridas, y una suite después de otra. La otra copia de trabajo no se usa (respuesta del humano).

### Cifras: resumen frente a mi corrida

| Comprobación | Resumen | Mi corrida |
|---|---|---|
| backend `npm run lint` | `> tsc -p tsconfig.json --noEmit && tsc -p tsconfig.test.json`, exit 0 | igual, exit 0 |
| Los dos archivos de E8 solos | `Tests  35 passed (35)` (14 y 21) | `Tests  35 passed (35)` |
| Suite de módulos (el comando literal de `resumen-programador.md:578`, ejecutado tal cual desde `backend/`) | `Tests  1446 passed (1446)` · `Test Files  124 passed (124)` (segunda corrida) | `Tests  1446 passed (1446)` · `Test Files  124 passed (124)`, a la primera (108.48 s) |
| backend `npm run build` | `> tsc -p tsconfig.json`, exit 0 | igual, exit 0 |
| PA-07 (módulos) | 0/0/0/0 · 3 "Error no controlado" · 3 `P2028` | `40P01` 0 · `deadlock detected` 0 · `could not serialize` 0 · `too many clients` 0 · `"Error no controlado"` 3 (los `ZodError` de la URL del almacén, del inventario) · `"code":"P2028"` 3 (`tx.sesion.findFirst`, `tx.sesion.updateMany` y `$queryRawUnsafe`, los tres de `servicio-ocupado`) |
| V-01 | 251 sin diferencias más `objetos-r1` `65c1d9d9…` y `borrado-duplicado-r1` `3520057d…`; 253 en total | `sha256sum -c` de la tabla de 251 sin diferencias. Las dos nuevas dan exactamente esos hashes, que son los de la ronda 1 del tester en `aprobacion.md`. Hay 253 `*.ataque` (251 rastreadas y 2 nuevas sin rastrear, ambas del tester). Ninguna otra cambió |

El comando literal de N-31 ya viene en el resumen (76 rutas), así que N-31 queda cerrado. En la primera corrida del programador falló ADM-1A11, que es lo que originó la Enmienda 8; en la tercera, por la interferencia con `archivos-d-r1`, se explica abajo. La mía salió en verde a la primera.

### T-01: el remedio en `adapters/storage/index.ts`
- **Las dos formas de error por clave.** Lo comprobé en `node_modules/minio` 8.0.7: `removeObjects` manda `Quiet: true` (`dist/esm/internal/client.mjs:2264`), y `removeObjectsParser` (`xml-parser.mjs:671-678`) devuelve solo `DeleteResult.Error`, como un arreglo de `{ Key, Code, Message }`.
  - `codigoDeErrorDeBorrado` lee `Code` en la forma real y `Error.Code` en la forma de los tipos.
  - `null` y `undefined` no son error.
  - Cualquier otro objeto sí lo es: sin código reconocible devuelve `""`, que no está en el conjunto de ausentes, y lanza. Con `Quiet`, la respuesta nunca trae éxitos, así que esto no produce falsos rojos.
- **`503` sin secretos.** Tanto un error global como uno por clave lanzan `almacenNoDisponible()`, con un texto fijo, sin URL, llave ni mensaje del proveedor. ADM-1B15 comprueba que el mensaje no contiene el secreto de prueba.
- **`NoSuchKey`/`NotFound` es idempotente:** se filtra con el mismo `CODIGOS_DE_OBJETO_AUSENTE` de `esObjetoAusente`.
- **Un lote con otros errores lanza igual:** basta un código fuera de ese conjunto. ADM-1B15 lo cubre con un `NoSuchKey` junto a un `AccessDenied`.
- **ADM-1B15** (`src/adapters/storage/objetos.test.ts:80-146`) cubre las dos formas para cada código:
  - `NoSuchKey` y `NotFound` resuelven.
  - `AccessDenied` e `InternalError` lanzan con todas las claves fallidas y con una de dos.
  - Un elemento sin código lanza.
  - La mezcla de una clave ausente con un error real lanza.
  - `[null, undefined]` resuelve.
  - La lista vacía no llama al almacén.
  - Un error global da `503`.
  
  La `*.ataque` del tester (ADM-T1B01, 01b y 02, con el cliente real de `minio`) está en verde en mi corrida.
- **Hermanos y estados vecinos.**
  - La tabla de las llamadas a `minio` coincide con el código: `copyObject` no usa el valor de retorno y su error llega como `S3Error` con `code`; `statObject` y las prefirmas no leen la forma de los tipos.
  - Los estados de `borrar` (vacío, todas con error, algunas, error global, clave ausente y reintento tras un fallo parcial) tienen cada uno su caso o su razón.
  - `procesarBorradoDeObjetos` sigue dejando propagar el error.
  - Nada falta.

### T-02: ADM-1B23 y su hermano ADM-1B16
- **ADM-1B23** (`test/borrado-de-clase.integracion.test.ts:388-410`) toma `antes` y `despues` alrededor del `DELETE` y exige `antes + 600 000 ≤ start_after ≤ despues + 600 000`. Es la forma de N-20 y ya no depende de lo que tarde la petición. Que no tenga tolerancia es correcto: la API y la prueba comparten proceso y reloj, el handler calcula `Date.now() + RETRASO` entre las dos marcas, y pg-boss guarda el `Date` sin perder milisegundos. El `?? 0` de `:407` no oculta nada, porque `toHaveLength(1)` ya lo exigió.
- **ADM-1B16** (`test/colas-objetos.integracion.test.ts:88-109`). **15 s y 30 s son razonables.**
  - Los dos casos que esperan un `503` solo pueden tardar más, así que la carga no los rompe.
  - El que espera éxito duerme 5.5 s. Con un `timeout` de 15 s le quedan unos 9.5 s de margen para la conexión y la carga, el triple de antes (3.5 s).
  - Sigue probando lo que pide el plan: con la opción, la transacción dura más de los 5 s por omisión, y sin ella expira en 5 s.
  - Los 30 s del caso cubren la corrida en paralelo de las dos transacciones (unos 6 s), más los 1.5 s de la corta, con holgura.
  - No es una espera de bloqueo: no toca `LOCK TABLE` ni retiene filas.
- Los demás hermanos que miden contra la hora real (`encolarDiferido`, `esperarHasta` y ADM-1B20) no miden duraciones, como dice el resumen.

### E8-1 y E8-2, aplicados exactamente
- El `git diff -U0` del resumen (sin las líneas `index`) es idéntico al que da `git diff -U0 69057f7` de los dos archivos; lo comparé con `diff`.
- Cada una de las 63 líneas añadidas aparece literal en el texto de E8-1 o de E8-2 del plan. Las quitadas son exactamente las que nombran las viñetas: los dos imports, `contar`, `antes`, `despues`, el `return` con `antes` y `despues`, `entre`, las tres llamadas, `totalAntes` y `totalDespues`, y el comentario con los dos `expect` de `:363-366`.
- No cambia ninguna otra línea: son 63 inserciones y 23 borrados, todos en esos hunks.
- Los dos archivos dan los mismos 14 y 21 casos, en verde, y las igualdades de la misma instantánea pasan.

### El cambio fuera de la enmienda: `duplicado-de-clase.integracion.test.ts`
**Lo acepto.**
- Es una prueba nueva de 01b, del propio programador, en "Se toca" como prueba nueva (§D-R0: "más archivos nuevos de prueba"). No es una prueba normal anterior ni está en una lista cerrada, así que no requería PARADA.
- El cambio no debilita nada: los cinco archivos que antes subía el admin los sube ahora el maestro de la clase. Ninguna aserción del archivo lee `subidoPor`; lo comprobé con grep, que solo encuentra las líneas `subidoPor: maestro.id` de `:181`, `:335`, `:436` y `:490`. Los recursos siguen siendo del admin (`autorId: idAdmin`), que es lo que los hace de aprendizaje. El duplicado copia `subido_por` igual que antes.
- La causa está bien leída. `archivos-d-r1.ataque:914-920` (C-23 de su ronda 2) acota su conteo a `subidoPor` en la lista que incluye al admin único, y cualquier archivo que suba el admin en paralelo lo mueve. Es la misma familia de lecturas sin un filtro propio del caso que E8-4.

**Con esto, la familia de `archivos-d-r1` queda en manos del tester.** Las otras pruebas que suben archivos como admin son:
- `borrado-duplicado-r1.ataque:135`, `:451` y `:537`, del tester;
- `admin-muro-02b-r1.ataque:506`, `*.ataque`;
- `muro-admin.integracion:289` y `:618`, normales y fuera de la lista cerrada.

Las dos primeras son `*.ataque` y no las puede tocar el programador. `muro-admin.integracion` lleva al admin como autor por diseño. El remedio de fondo está en la `*.ataque` que cuenta: acotar `filasDelCaso` por ids propios del caso o por una ventana propia, en lugar del admin único. Eso es un C-n del tester.

### Problemas que bloquean
Ninguno.

### Detalles menores
- La primera corrida de los dos archivos del programador se hizo con la carga en 32/25 %, sin una segunda lectura de 25 % o menos. Él lo declara. Mi corrida, con la puerta cumplida, da las mismas cifras.

### Puntos para la ronda 2 del tester
1. **`gestion-02a-r1.ataque:793-799`** (observación de E8-3): el mismo patrón que tenía PR-2A12, con el `total` entre dos `clase.count()`. Recomiendo acotarla con un C-n declarado y el remedio de E8-2 (el `total` contra las filas de la respuesta y contra `clase.count()` en la misma instantánea), para que la suite completa del cierre no dependa de la suerte.
2. **La familia de `archivos-d-r1`** (`:914-920`): su conteo por `subidoPor` del admin único se mueve con cualquier subida del admin en paralelo (`borrado-duplicado-r1:135`, `:451` y `:537`, `admin-muro-02b-r1:506` y `muro-admin.integracion:289` y `:618`). Recomiendo acotarla, también con un C-n, a filas que solo puede escribir el caso: claseIds propios, o subidas del admin con una clave o una ventana propia. Si no se acota y cae en la suite completa del cierre, cuenta como interferencia conocida y no como defecto de 01b, pero habría que repetir la corrida.
3. **T-01:** el borrado por lotes contra el almacén real (MinIO local) con claves mezcladas (existentes, ausentes, y sin permiso si se puede simular). Más de 1000 claves en un trabajo ya no es posible por el esquema (`max(1000)`), pero conviene confirmar que un `datos` con 1000 claves sale en una sola llamada. Y el reintento de pg-boss tras un `503` por clave: que borre lo que faltaba y termine.
4. **T-02:** que ningún otro caso de 01b mida duraciones con la hora real sin acotar (los hermanos que declaró el programador).
5. Lo que quedó de la verificación del resumen de 01b y no se atacó en la ronda 1: carreras entre duplicar, borrar y el worker (y si `P2003` puede aparecer como `500`), lo que se cuela al duplicar, datos fuera del esquema en las tres colas, y `confirmar` manipulado.

### Veredicto de esta verificación
**ACEPTADO.** Las cifras coinciden: `35 passed`; módulos `1446 passed (1446)` en 124 archivos; `lint` y `build` en 0; PA-07 limpia; V-01 con 253. T-01 y T-02 están corregidos, con sus hermanos y estados vecinos. E8-1 y E8-2 se aplicaron exactamente. El cambio de `duplicado-de-clase.integracion` se acepta. Contra `69057f7`, solo cambian archivos de "Se toca" de 01b, las cuatro pruebas de la lista cerrada (E4-4, E7-1, E8-1 y E8-2), C-3 a C-5 y las dos `*.ataque` nuevas del tester, o pruebas y ayudas nuevas. Fuera de los paquetes, solo `docs/trabajo/ADMIN-01-administracion/`. El tester puede empezar la ronda 2.

## Revisión final — ADMIN-01b

Fecha: 2026-11-05. Plan: `plan.md`, SHA-256 `e539dbcd877f0da7b2e895dff4d8ac099d400ca1fadd66d9f7b36d0a1838b183` (Enmiendas 1 a 8), comprobado. Tester: `reporte-tester.md`, SHA-256 `4717095580166206656813b2a7e464de12b6143d962eae19d96f084c87e41711` (comprobado), "## Ronda 2 — ADMIN-01b" RESISTE desde la línea 1262. Programador: `resumen-programador.md`, SHA-256 `e343edb1d7b3f3996935b082221efc1b4a54c50449feda1c5813d91036c78a44`. Bases de "No se toca": `69057f7` dentro de los paquetes y `68242f3` fuera de ellos, con los seis archivos de proceso contra sus SHA-256 de `aprobacion.md`. Ignoré `docs/trabajo/DEPLOY-investigacion-vps.md`, que es ajeno.

Veredicto: **APROBADO**
Verificación propia: lint 0 en los tres paquetes · test backend `2933 passed (2933)` en 258 archivos, frontend `6062 passed (6062)` en 281 · build 0 en los tres paquetes (frontend `✓ built in 1.26s`)

### Entorno y corridas
- **PA-01:** red `IZZI-F281-5G`, perfil Public. La regla "Campus: bloquear entrada a Docker en redes publicas" está habilitada (Inbound, Block, Public), y el perfil Public del firewall está activo. Docker 28.5.1.
- **Trabajo en paralelo:** la otra copia de trabajo no se usa (respuesta del humano, transmitida por el orquestador).
- **Puerta de carga:**
  - Al empezar, la carga estaba entre 34 % y 80 %. La causa fue un `git ls-files --others` sobre todo el perfil del usuario, lanzado por la app de escritorio de ChatGPT (PID 17544), no por mí. No lo terminé (N-21).
  - Antes del backend: 10 %, 8 % y 17 %.
  - Antes del frontend: 25 % y 21 %.
  - En los dos casos no había ningún `node` con `vitest`.
- Corrí una suite después de otra, una sola vez cada una, y ninguna cayó.
  - Backend: 213.64 s.
  - Frontend: 402.17 s, contra 272 s en 01a. La diferencia es la carga intermitente de la misma app, sin ningún rojo.

| Paquete | Comando | Tester (ronda 2) | Manager |
|---|---|---|---|
| shared | `npm run build` | — | exit 0 (`> tsc -p tsconfig.json`) |
| shared | `npm run lint` | — | `All matched files use Prettier code style!`, exit 0 |
| backend | `npm run lint` | exit 0 | exit 0 (`> tsc -p tsconfig.json --noEmit && tsc -p tsconfig.test.json`) |
| backend | `npm test` (suite completa, la única de la subentrega) | módulos: `Tests 1453 passed (1453)` · 127 archivos | `Tests  2933 passed (2933)` · `Test Files  258 passed (258)`, a la primera |
| backend | `npx vitest list` con `grep -a` | 7 `ADM-T2B` | 2933 casos · 258 archivos · 46 `ADM-1B` · 11 `ADM-T1B` · 7 `ADM-T2B` (y 37 `ADM-1A`, 15 `ADM-T1A`, 6 `ADM-T2A`, sin cambio) |
| backend | `npm run build` | — | exit 0 (`> tsc -p tsconfig.json`) |
| backend | PA-07 completa | módulos: 0/0/0/0 · 3 · 3 | ver abajo: limpia, con control positivo |
| backend | `prisma migrate status` y deriva (E1-11) | — | `18 migrations found` · `Database schema is up to date!`; `No difference detected.`, exit 0 |
| frontend | `npm run lint` | — | exit 0 (`> tsc -b`) |
| frontend | `npm run test` (suite completa) | — | `Tests  6062 passed (6062)` · `Test Files  281 passed (281)` |
| frontend | `npm run build` | — | `✓ built in 1.26s`, exit 0 |

**Cuadre con 01a.** 01a cerró con 2864 casos en 242 archivos.
- Suma 16 archivos, 258 − 242:
  - 11 del programador, con 51 casos (los 46 `ADM-1B` y 5 más);
  - 5 del tester, con 18 casos (11 `ADM-T1B` y 7 `ADM-T2B`).
- 51 + 18 = 69 = 2933 − 2864. Las demás pruebas cambiadas no suman casos.
- El frontend sigue igual: 01b no lo toca, y lo único que comparte es `shared/`.

### PA-07 sobre la suite completa del backend
Comando: `npm test`, desde `backend/`, con la salida completa en un archivo.
- **Conteo por término:**
  - `40P01`: 0
  - `deadlock detected`: 0
  - `could not serialize`: 0
  - `too many clients`: 0
  - `"Error no controlado"`: 10
  - `"code":"P2028"`: 5
- **Control positivo:** están los tres `P2028` deterministas de `servicio-ocupado.integracion`, en nivel 40 y en la misma app (pid 11240). Atribuí cada uno por `requestId` dentro de su app:
  - `POST /api/auth/cambiar-contrasena`: `tx.sesion.findFirst()` (`usuarios.ts:293`), desde `handlers/auth/cuentas.ts:202`, `503`.
  - `POST /api/auth/refrescar`: `tx.sesion.updateMany()` (`sesiones.ts:72`), desde `handlers/auth/index.ts:180`, `503`.
  - `POST /api/clases/:claseId/publicaciones/:publicacionId/comentarios`: `$queryRawUnsafe` de `encolar` (`adapters/queue/index.ts:63`), `503`.
- **Los otros dos `P2028`** son los permitidos de `cuentas-r3.ataque` (pid 25572):
  - `POST /api/auth/login`: `tx.sesion.create()` (`sesiones.ts:39`).
  - `POST /api/auth/restablecer`: `tx.tokenCuenta.updateMany()` (`tokens-cuenta.ts:116`).
  - Ninguno es de `maxWait`.
- **Inventario:** los 10 "Error no controlado" son los mismos 10 del cierre de 01a, identificados por ruta y llamada:
  - 5 "fallo simulado de la base en la búsqueda" (`POST /api/auth/login`, `handlers/auth/index.ts:125`);
  - 1 "fallo simulado de la base al crear la sesión" (`POST /api/auth/login`, `:134`);
  - 1 "boom" (`GET /api/prueba/error-comun`);
  - 3 `ZodError` de la URL del almacén (`handlers/archivos.ts:62`, `:97` y `handlers/clases/muro.ts:87`).
  - Ninguno sale de una ruta, un adaptador o un worker de 01b.

**PA-07 limpia.**

### Problemas que bloquean
Ninguno.

### (a) 01b contra su parte del plan: cumple
Revisé `git diff 69057f7` y los archivos nuevos contra los pasos 8 a 13. **Se hizo lo planeado, solo lo planeado y todo lo planeado.** El detalle, caso por caso, está en mis dos verificaciones anteriores ("Verificación del resumen — ADMIN-01b" y "Verificación de la corrección de la ronda 1 — ADMIN-01b").
- **El código de producción no cambió desde que lo verifiqué.**
  - El último cambio a código de producción fue a las 11:57 (`adapters/storage/index.ts`, la corrección de T-01). Mi verificación de esa corrección es posterior (`revision.md` escrito a las 12:33).
  - Desde entonces solo cambiaron archivos del tester: C-33, C-34 y las tres `*.ataque` de la ronda 2.
  - Hoy releí la migración, `borrado-de-clase.ts`, `bloqueo-maestros.ts`, `copias-de-archivos.ts`, `workers/objetos.ts`, `worker.ts` y los diffs de `handlers/clases/gestion.ts` y `handlers/archivos.ts`, y coinciden con lo que aprobé.
- **§D-4, borrado definitivo:**
  - El conteo usa una instantánea única y cinco `count` por índices de la clase. De una activa responde `409 CLASE_NO_ARCHIVADA`.
  - El `DELETE` sigue los pasos 1 a 7 en orden, dentro de una transacción con `timeout` de 30 s (R-12):
    - `FOR UPDATE` de la clase, con `bloquearClaseParaBorrar`;
    - los dos `findFirst` de copias en curso;
    - `decidirBorrado` con el orden de ADM-1B01;
    - las claves de todos los estados y los `trabajo_id`;
    - `cancelarVarios` y `encolarVarios`, con la conexión de la transacción, en lotes de 1000 y diferidos 10 min (N-09);
    - `movimientos_inscripcion` y, por último, la clase.
  - El worker de `BORRAR_OBJETOS` deja propagar el error. La corrección de T-01 también lanza ante un error por clave.
- **§D-5, duplicar:**
  - La original se toma `FOR SHARE` y después `bloquearMaestrosActivos` (`FOR SHARE`, `ORDER BY id`).
  - Paso 2b: con copias en curso responde `409`.
  - Hace cuatro lecturas sin ciclo y un `createMany` por tabla.
  - `COPIAR_OBJETOS` va en lotes de 100, solo si hay archivos, y nunca encola `MATERIAL_CREADO`.
  - El worker cumple M-03: una lectura, solo el almacén dentro del ciclo, y dos `updateMany` en el `finally` antes de relanzar.
  - El consumidor de `COPIAR_OBJETOS_FALLIDO` lee `datos` (N-02).
  - Los dos descartes de M-02 suman `copiaDe: null`.
  - La descarga de la clase responde `409 ARCHIVO_EN_COPIA`; las de entregas no cambian.
- **§D-6:**
  - El puerto `AlmacenDeObjetos` va aparte del `Almacen` de hoy.
  - `crearAlmacenDeObjetos` usa `copyObject` y `removeObjects`, del lado del almacén: ningún objeto pasa por Node.
  - `registrarConsumidoresDeObjetos` se llama desde `worker.ts`, después de `registrarConsumidores`. `workers/index.ts` no cambia.
  - Sin variables ni proveedores nuevos.
- **§D-7.9:**
  - En 01b solo nace `bloquearMaestrosActivos`, sin reexportarse en `index.ts`, y lo usa el duplicado.
  - `asignarMaestro` y `crearClaseAdministrada` son de 01e. `maestros-de-clase.ts` y `clases.ts` no cambiaron.
- **Migración `20261105163205_admin_01_copias_de_archivos`:**
  - Tiene la columna `copia_de UUID` nula y los tres índices (`archivos_copia_de_idx`, `archivos_clase_id_estado_idx` y `movimientos_inscripcion_clase_id_secuencia_idx` con `secuencia DESC`).
  - La FK `archivos_copia_de_fkey` es **`ON DELETE RESTRICT`**, como decidió el humano (Enmienda 6).
  - El `CHECK archivos_copia_solo_confirmado` va a mano y con su comentario (R-02).
  - Hoy la deriva no tiene diferencias y `migrate status` está al día (18 migraciones).
  - **Es compatible hacia atrás:** la columna es nula, las filas existentes cumplen el `CHECK` y un backend anterior no la lee ni la escribe. Revertir el código no rompe la base. Lo único que pasaría con el código revertido está en R-09 (una copia en curso se serviría con `404` del almacén), y su orden de despliegue va a ESTADO §3 al cierre (A-07).
- **ADM-1B01 a 1B24:**
  - Hay 46 casos `ADM-1B` en los 11 archivos del programador (51 casos en total).
  - Cada viñeta tiene su caso con el título exacto (verificación del resumen).
  - **ADM-1B24**, la prueba que pidió el humano, cumple (a) a (e) por el camino real. Está en verde en la suite completa: duplicar, `409` antes del worker, `204` después, la copia intacta con descarga `200`, y `BORRAR_OBJETOS` solo con las claves de la original.
- **Enmiendas 6 a 8:**
  - E6 se cumple con ADM-1B24.
  - E7-1 es un solo hunk de cuatro líneas, y ADM-1A09 (a) da las 88 rutas.
  - E8-1 y E8-2 se aplicaron literalmente (lo cotejé con `diff`).
  - E8-3 dejó la observación de `gestion-02a-r1.ataque`, que el tester cerró con C-33.
  - E8-4 queda para 01e (ver (d)).
- **Lista cerrada y vigiladas:**
  - Entre las pruebas normales existentes solo cambiaron las cuatro de la lista cerrada: E4-4 (`bloqueo-usuario`), E7-1 (`clases-archivadas-matriz`), E8-1 (`clases-archivadas`) y E8-2 (`gestion-clases`).
  - Ya acepté el cambio del programador en su propia prueba nueva, `duplicado-de-clase.integracion` (los archivos los sube el maestro).
  - Todas las vigiladas de §D-R0 01b pasan en la suite completa.
- **R-02:** el `CHECK` va a mano y la deriva no lo propone borrar.

**Reglas que no se rompen:**
- **Capas.** `core/` es puro. `adapters/db` no importa `adapters/queue`: el handler arma las funciones de cola. Los handlers validan, llaman y serializan.
- **Middleware.** Las tres rutas usan `protegido({ roles: ["admin"], pertenencia: "propiedad", enClaseArchivada: "gestion" })`, y ningún handler compara roles ni estados.
- **Estado de pago.** ADM-1B07 comprueba que ni el conteo ni la copia llevan `estadoPago`, `accesoRestringido`, `email` ni `codigoInvitacion`.
- **Consultas sanas.**
  - Ninguna consulta va dentro de un ciclo: el worker hace una lectura y dos escrituras por lote.
  - Toda lectura va por índice (los tres nuevos cubren `archivos.clase_id`, `copia_de` y el `DELETE` de movimientos).
  - El SQL crudo va con plantilla parametrizada.
  - La única lectura sin paginar es la de todas las claves de una clase en el borrado, que el plan prevé y reparte en trabajos de 1000.
- **Cola en la misma transacción.** El encolado y la cancelación usan la conexión del `tx`. ADM-1B16 prueba que una cancelación se revierte con la transacción, y ADM-1B24 (a), que un `409` no deja trabajos de borrado.
- **Archivos.** Los objetos se copian y se borran del lado del almacén.
- **UTC.** Sin cambios.
- **Trabajos diferidos sincronizados.** Los recordatorios de las tareas se cancelan en la misma transacción del borrado.
- **Secretos.** El `503` sale sin URL, llave ni mensaje del proveedor (ADM-1B15 y ADM-T2B01).
- **`infra/`, `.env.example`, proveedores, `notifier` y autenticación:** sin cambios.

**Estilo de `CLAUDE.md`:**
- Hay retornos tempranos en el worker, el adaptador y los handlers.
- `core/` y `adapters/` lanzan `AppError`.
- Los workers dejan propagar los errores.
- No hay `?? []` en producción. Los `?? null` de `bloquearClaseParaBorrar` y de la fila leída son guardas explícitas.

**Definición de terminado:**
- Cumple §D-4 a §D-6 y su parte de §D-7.9.
- Respeta capas y middleware.
- `lint`, `test` y `build` están en verde en los tres paquetes.
- Tiene pruebas de autorización (ADM-1B07, más ADM-T1B03 y los demás casos del tester).
- La migración es compatible.
- `infra/` y `.env.example` no aplican.
- Los README de A-06 (`adapters/`, `handlers/` y `workers/`) y los comentarios del esquema de A-09 están al día. Lo demás es del cierre.

### (b) T-01 y T-02 de la ronda 1: cerrados
- **T-01 (alta)**: `borrar` descartaba los errores por clave de `DeleteObjects`.
  - **Corregido** en `adapters/storage/index.ts`: reconoce la forma real de `minio` 8.0.7 (`{ Key, Code, Message }`) y la de los tipos (`{ Error: { Code } }`). Cualquier error por clave lanza `503 ALMACEN_NO_DISPONIBLE`, sin secretos. `NoSuchKey`/`NotFound` es idempotente.
  - ADM-1B15 cubre las dos formas.
  - El tester lo confirmó contra el cliente real de `minio` y un servidor S3 falso local:
    - ADM-T2B01: claves mezcladas, incluidos `<Code>500</Code>` y `<Error>` sin código;
    - ADM-T2B02: lote de 1000 en una sola llamada con `Quiet`;
    - ADM-T2B03 y T2B04: reintento por pg-boss de punta a punta, que termina `completed` con la cola de fallidos vacía.
  - Todo en verde en la suite completa.
- **T-02 (baja)**: ADM-1B23 dependía de la hora real.
  - **Corregido:** la cota va entre `antes` y `despues`, sin tolerancia, con razón (proceso y reloj compartidos).
  - Su hermano ADM-1B16 tiene más margen de `timeout`.
  - El tester no encontró otra duración medida con la hora real sin acotar (punto 4 de su ronda 2).

### (c) V-01: 256 `*.ataque`, ninguna tocada por el programador
- La tabla de la ronda 0 de 01b (`reporte-tester.md:822-1077`) en formato `sha256sum -c` tiene 251 filas, y su lista da `24fb3fe3…`, igual a la declarada. `sha256sum -c` solo marca diferencias en las dos que cambió el tester en la ronda 2:
  - **C-33** `gestion-02a-r1.ataque`: `73c55120814b8d6bbcceda5d4a3b5c8f1ed1ab58f54400831ac1a710d3b4584a`, igual al declarado. Su diff es exactamente el remedio de E8-2: quita los dos `clase.count()` de fuera de la instantánea, compara el `total` con sus filas y con `clase.count()` en la misma instantánea, y suma dos imports.
  - **C-34** `archivos-d-r1.ataque`: `f76ce52002e295f2bda6e7a7a7f796415e08013e6d4c1fbe2c9c686671fe8252`, igual al declarado. Su diff quita `admin` de `subidoPor` en `filasDelCaso` y agrega el comentario del porqué; la condición por clase no cambia.
- C-3, C-4 y C-5 coinciden con los hashes que ya están en la tabla: `71c54a11…`, `b008263d…` y `82fe8c49…`.
- **Las cinco nuevas, sin rastrear, todas del tester**, coinciden con sus hashes:
  - `objetos-r1` `65c1d9d9…`;
  - `borrado-duplicado-r1` `3520057d…`;
  - `objetos-r2` `935a7211…`;
  - `objetos-reintento-r2` `fd2ae2e9…`;
  - `borrado-duplicado-r2` `b8fc0db0…`.
- **Total:** 256, de las que 101 son del backend y 155 del frontend. `git ls-files` da 251, y no falta ni sobra ninguna frente a la tabla.
- Contra `69057f7` cambian solo cinco `*.ataque`, C-3, C-4, C-5, C-33 y C-34, y no se borró ninguna. Ninguna se saltó: la suite completa no tiene casos `skip` ni `todo` nuevos, porque los 2933 de `vitest list` son los 2933 que pasan.

### (d) Lo abierto, con destino

| Id | Qué | Destino |
|---|---|---|
| N-32 | Unas 30 líneas duplicadas (`conReintentoDeCodigo` y `traducirErrorDeCodigo`) entre `adapters/db/clases.ts` y `duplicado-de-clase.ts` | **Programador de 01e**, que ya toca `crearClaseAdministrada` en `clases.ts` (§D-7.9). Si el arquitecto lo admite sin enmienda, una sola copia exportada. Si no, carril trivial al cierre de ADMIN-01. No cambia el comportamiento |
| O-R2-1 | Un `<Error>` con texto en lugar de hijos (`<Error>AccessDenied</Error>`) se lee como éxito en `borrar` | **No se corrige en 01b.** No es una respuesta posible de S3, MinIO ni R2: el protocolo siempre manda `<Key>`, `<Code>` y `<Message>`. Destino: **DEPLOY**, que es cuando se usa R2 de verdad. Entra como fila de ESTADO §3 al cierre de ADMIN-01 (A-07 bis), con el remedio de una línea anotado: tratar como error todo elemento que no sea `null` ni `undefined`. Si el humano prefiere cerrarlo antes, va como enmienda en una subentrega con backend (01e); no es carril trivial, porque cambia el comportamiento |
| Regla E8-4 | Las pruebas nuevas de 01e no usan conteos de antes y después ni suponen las primeras filas de una lista global | **Arquitecto, programador y tester de 01e.** Ya está en el plan (ADM-1E10, ADM-1E11, §D-R0 01e y paso 25). La verifico en el resumen de 01e, con la nota de mi verificación de la Enmienda 8: los cambios de la misma instantánea, con Prisma directo sobre `tx` y sin el protocolo PB |
| O-3 (ronda 0 de 01a) | `gestion-02a-r1.ataque:693-734` exige `["id", "nombre"]` en los maestros del detalle, y S-16 suma `cuentaDesactivada` en 01e | **Orquestador, antes de la ronda 0 de 01e:** una enmienda corta del arquitecto que la sume como C-n del tester, verificada por mí por `git diff --no-index`. C-33 cambió otro caso de ese archivo (`:793-799`), así que la enmienda debe partir del hash nuevo `73c55120…`, y el caso de O-3 está ahora en `:694-735` (C-33 sumó un import) **Resuelta por la Enmienda 13** (2026-11-09): C-42 en §D-R0 01e, verificada en "Verificación de la Enmienda 13 — ADMIN-01". |
| N-21 | Carga ajena de la app de escritorio de ChatGPT/Codex | **Humano.** Hoy volvió a subir la carga al 60-80 % con un `git ls-files` sobre todo el perfil del usuario, y alargó la suite del frontend de 272 s a 402 s. No tumbó nada. Sigue la recomendación de cerrarla durante las suites |
| N-24 | El foco tras el descarte por `id` | **Programador de 01c** (y 01d2, 01f y 01g) |
| N-25 | A-05 no nombra `lib/unir-paginas.ts` | **Cierre de ADMIN-01**, con A-05 |
| N-26 | Secreto de un carácter en el caso unitario de `opcionesDeLogger` (ADM-1E22) | **Programador de 01e** |
| N-27 | PA-01 en cada resumen | **Cerrado en 01b.** Todos los resúmenes y rondas de 01b registran `IZZI-F281-5G` Público. Se sigue exigiendo |
| N-28 a N-30 | Precondiciones con mensaje, sin colas reales y conjuntos no vacíos | **Cerrados.** Cubiertos en ADM-1B24 y en todo 01b (verificación del resumen). El tester los respetó en la ronda 2 (colas `ATAQUE_T2B_*`) |
| N-31 | El comando de la suite de módulos va abreviado | **Cerrado** desde la corrección de la ronda 1 (comando literal) |
| N-18 y O-R1-1 | Una clase sin maestros, y el `500` por `min(1)` en `GET /clases/anteriores` | **Tester de 01e**, ronda 1. 01b no crea clases sin maestros: duplicar exige de uno a dos maestros activos |
| NB-1 y los `?? ""` de pruebas propias (los dos de 01a y `terminada.publicacionId ?? ""` de ADM-1B24) | Valores por defecto que disfrazan una decisión, y estilo | **Carril trivial al cierre de ADMIN-01**, sin cambio de comportamiento |
| Sangría de `handlers/README.md` | Una línea de la viñeta de ADMIN-01b (`archivos }`…) empieza en la columna 0 | **Carril trivial al cierre de ADMIN-01** (o el programador de 01e, si toca ese README; A-06) |
| R-07, R-09 y R-16 a R-19 | `LIMPIEZA_DIARIA` y `copia_de`; orden de despliegue; cursores | **Cierre de ADMIN-01** (A-07 y A-07 bis), como ya estaba |
| O-R2-2 | ADM-T1B07 (retención de 30 s) sigue retirado | Sin destino. El tester lo retiró por interferir con los `LOCK TABLE … NOWAIT`, y la serialización entre duplicar y borrar la cubren ADM-1B10 y ADM-T2B05 a T2B07, sin retenciones |

### Problemas que no bloquean
Ninguno nuevo. N-32 y O-R2-1 tienen su destino en (d).

### Detalles menores
Ya estaban en mi verificación del resumen y no cambian el veredicto:
- ADM-1B17 dice `200` en el plan, y la ruta real responde `204`. Lo que está mal es el texto del plan.
- En `procesarCopiaDeObjetos`, si `terminarCopias` o `descartarCopias` fallan dentro del `finally` mientras se propaga un error del almacén, a pg-boss le llega el error de la base. Los dos provocan el reintento, y ninguno se traga.
- En `duplicado-de-clase.ts`, la guarda `if (primero === undefined) return null` no se puede alcanzar.
- En ADM-1B24, la variable `recursoOriginal` nombra el recurso de la copia.

### Desacuerdos arbitrados
Ninguno. En 01b no hubo desacuerdo entre el programador y el tester. ADM-T1B07 lo retiró el propio tester.

### Documentos a actualizar
- **En 01b, nada pendiente:**
  - A-06: los README de `adapters/`, `handlers/` y `workers/` describen las rutas, las colas, el puerto y los consumidores nuevos.
  - A-09: los comentarios de `Archivo` y `MovimientoInscripcion` en `schema.prisma` están al día.
  - El detalle de sangría de `handlers/README.md` va en (d).
- **Al cierre de ADMIN-01:**
  - A-01: `archivos.copia_de`, los eventos `BORRAR_OBJETOS` y `COPIAR_OBJETOS`, y la copia del lado del almacén.
  - A-02: §8, §11 y §14 con los índices nuevos, y §20 con DH-03.
  - A-07: R-07 y R-09.
  - A-07 bis, con la fila nueva de O-R2-1.
  - Los demás de la revisión de 01a.
- `AGENTS.md`, "Comandos" (A-10): sin cambio. El worker de siempre (`npm run dev:worker`) ya registra los consumidores de objetos, y no hay variables nuevas.

### (e) Archivos del commit de 01b
Son **55 entradas de `git add`** (59 archivos):
- 54 rutas de los paquetes, con la carpeta de la migración como una sola entrada (contiene solo `migration.sql`);
- la carpeta `docs/trabajo/ADMIN-01-administracion/`, con sus cinco archivos.

Salen de `git diff --name-only HEAD` y `git ls-files --others --exclude-standard`, sin el archivo ajeno. Las cotejé con un script contra `git status`: no falta ni sobra nada. `shared/dist` y `backend/src/adapters/db/generated` están en `.gitignore` y no entran.

**shared (2):** `shared/src/clases.ts` y `shared/src/index.ts`.

**backend, esquema y migración (2):** `backend/prisma/schema.prisma` y `backend/prisma/migrations/20261105163205_admin_01_copias_de_archivos`.

**backend, `src/` (30):**
- `core/` (8): `archivos/objetos.ts` y su prueba, `clases/borrado.ts` y su prueba, `clases/duplicado.ts` y su prueba, `eventos/objetos.ts` y su prueba.
- `adapters/` (16):
  - `README.md`;
  - en `db/`: `archivos.ts`, `bloqueo-maestros.ts`, `borrado-de-clase.ts`, `cliente.ts`, `copias-de-archivos.ts`, `duplicado-de-clase.ts`, `index.ts`, `publicaciones.ts` y `recursos.ts`;
  - en `queue/`: `colas.ts` e `index.ts`;
  - en `storage/`: `index.ts`, `objetos.test.ts`, y `objetos-r1.ataque.test.ts` y `objetos-r2.ataque.test.ts`, del tester.
- `handlers/` (3): `README.md`, `archivos.ts` y `clases/gestion.ts`.
- `worker.ts`, `workers/README.md` y `workers/objetos.ts` (3).

**backend, `test/` (20):**
- Nuevas del programador (8): `ayudas-borrado-duplicado.ts`, `objetos-en-memoria.ts`, `borrado-de-clase.integracion.test.ts`, `borrado-duplicado-autorizacion.integracion.test.ts`, `colas-objetos.integracion.test.ts`, `copias-de-archivos-migracion.integracion.test.ts`, `duplicado-de-clase.integracion.test.ts` y `worker-objetos.integracion.test.ts`.
- Lista cerrada (4): `bloqueo-usuario.integracion.test.ts` (E4-4), `clases-archivadas-matriz.integracion.test.ts` (E7-1), `clases-archivadas.integracion.test.ts` (E8-1) y `gestion-clases.integracion.test.ts` (E8-2).
- Del tester, cambiadas (5): `sesiones-y-cadena.ataque.test.ts` (C-3), `lecturas-fx-r2.ataque.test.ts` (C-4), `lecturas-fx-r1.ataque.test.ts` (C-5), `gestion-02a-r1.ataque.test.ts` (C-33) y `archivos-d-r1.ataque.test.ts` (C-34).
- Del tester, nuevas (3): `borrado-duplicado-r1.ataque.test.ts`, `borrado-duplicado-r2.ataque.test.ts` y `objetos-reintento-r2.ataque.test.ts`. Con las dos de `src/adapters/storage`, son las cinco `*.ataque` nuevas del tester.

**docs (1 entrada, 5 archivos):** `docs/trabajo/ADMIN-01-administracion/`, completa:
- `plan.md`;
- `aprobacion.md`, con la nota de la fusión de `main` (`68242f3`) y los SHA-256 de los seis archivos de proceso;
- `resumen-programador.md`;
- `reporte-tester.md`;
- `revision.md`.

`docs/ESTADO.md` no cambió desde `68242f3`, así que no entra.

**Fuera del commit:** `docs/trabajo/DEPLOY-investigacion-vps.md`, que es ajeno.

```
git status
git add shared/src/clases.ts shared/src/index.ts backend/prisma/schema.prisma backend/prisma/migrations/20261105163205_admin_01_copias_de_archivos backend/src/core/archivos/objetos.ts backend/src/core/archivos/objetos.test.ts backend/src/core/clases/borrado.ts backend/src/core/clases/borrado.test.ts backend/src/core/clases/duplicado.ts backend/src/core/clases/duplicado.test.ts backend/src/core/eventos/objetos.ts backend/src/core/eventos/objetos.test.ts backend/src/adapters/README.md backend/src/adapters/db/archivos.ts backend/src/adapters/db/bloqueo-maestros.ts backend/src/adapters/db/borrado-de-clase.ts backend/src/adapters/db/cliente.ts backend/src/adapters/db/copias-de-archivos.ts backend/src/adapters/db/duplicado-de-clase.ts backend/src/adapters/db/index.ts backend/src/adapters/db/publicaciones.ts backend/src/adapters/db/recursos.ts backend/src/adapters/queue/colas.ts backend/src/adapters/queue/index.ts backend/src/adapters/storage/index.ts backend/src/adapters/storage/objetos.test.ts backend/src/adapters/storage/objetos-r1.ataque.test.ts backend/src/adapters/storage/objetos-r2.ataque.test.ts backend/src/handlers/README.md backend/src/handlers/archivos.ts backend/src/handlers/clases/gestion.ts backend/src/worker.ts backend/src/workers/README.md backend/src/workers/objetos.ts backend/test/ayudas-borrado-duplicado.ts backend/test/objetos-en-memoria.ts backend/test/borrado-de-clase.integracion.test.ts backend/test/borrado-duplicado-autorizacion.integracion.test.ts backend/test/colas-objetos.integracion.test.ts backend/test/copias-de-archivos-migracion.integracion.test.ts backend/test/duplicado-de-clase.integracion.test.ts backend/test/worker-objetos.integracion.test.ts backend/test/bloqueo-usuario.integracion.test.ts backend/test/clases-archivadas-matriz.integracion.test.ts backend/test/clases-archivadas.integracion.test.ts backend/test/gestion-clases.integracion.test.ts backend/test/sesiones-y-cadena.ataque.test.ts backend/test/lecturas-fx-r1.ataque.test.ts backend/test/lecturas-fx-r2.ataque.test.ts backend/test/gestion-02a-r1.ataque.test.ts backend/test/archivos-d-r1.ataque.test.ts backend/test/borrado-duplicado-r1.ataque.test.ts backend/test/borrado-duplicado-r2.ataque.test.ts backend/test/objetos-reintento-r2.ataque.test.ts docs/trabajo/ADMIN-01-administracion
```

Después del `git add`, `git status` no debe mostrar nada sin preparar ni sin rastrear, salvo `docs/trabajo/DEPLOY-investigacion-vps.md`.

### Para el humano
- **N-21:** la app de escritorio de ChatGPT lanza un `git ls-files` sobre todo tu perfil, que subió la carga al 60-80 %. Esperé a que bajara y no lo terminé. Conviene cerrarla durante las suites.
- **O-R2-1:** recomiendo dejarla para DEPLOY, con su fila en ESTADO §3 al cierre. Si prefieres cerrarla antes, es un cambio de una línea en `adapters/storage`, pero necesita enmienda: no es carril trivial, porque cambia el comportamiento.
- **Antes de la ronda 0 de 01e,** el orquestador pide la enmienda corta de O-3 (partiendo del hash nuevo de `gestion-02a-r1.ataque`).

### Veredicto
**APROBADO.** 01b cumple su parte del plan `e539dbcd…`:
- §D-4 a §D-6, y de §D-7.9 lo que le toca a 01b (`bloquearMaestrosActivos`);
- la migración `admin_01_copias_de_archivos`, con la FK `RESTRICT`, el `CHECK` a mano y sin deriva;
- ADM-1B01 a 1B24, ADM-1B24 incluida;
- las Enmiendas 6 a 8;
- R-02.

Además:
- T-01 y T-02 están cerrados.
- El tester dio RESISTE en la ronda 2, sin hallazgos.
- V-01 da 256: 251 rastreadas y 5 nuevas del tester. Solo cambiaron `*.ataque` del tester (C-3, C-4, C-5, C-33 y C-34).
- "No se toca" está limpio.
- Mi suite completa da backend 2933/2933 en 258 archivos y frontend 6062/6062 en 281, con `lint` y `build` en verde en los tres paquetes.
- PA-07 está limpia, con control positivo.
- Todo lo abierto tiene destino.

### Resumen para el humano (15 líneas)
1. ADMIN-01b (backend de borrar y duplicar clases) está **APROBADA**. El tester dio RESISTE en la ronda 2, sin hallazgos.
2. El admin ve un conteo de lo que se pierde y borra para siempre una clase archivada, con `confirmar=borrar`.
3. Los archivos del almacén se borran por la cola, 10 minutos después.
4. Duplicar copia temas, categorías y recursos de aprendizaje con sus archivos. La copia nace activa, con los maestros elegidos, y sin alumnos, tareas ni avisos.
5. Los objetos se copian del lado del almacén, con un worker. Mientras se copian, la descarga responde «en copia».
6. Migración `admin_01_copias_de_archivos`: columna `copia_de`, tres índices, FK `RESTRICT` (tu decisión) y un `CHECK`. Es compatible hacia atrás y no tiene deriva.
7. Tu prueba ADM-1B24 pasa: duplicar y después borrar la original deja la copia intacta y descargable.
8. T-01 (el borrado ignoraba errores por archivo) y T-02 (una prueba dependía de la hora) quedaron corregidos.
9. Mi corrida, en `IZZI-F281-5G` Público: backend 2933/2933 en 258 archivos, frontend 6062/6062 en 281. `lint` y `build` en verde en los tres paquetes.
10. Las 256 pruebas de ataque coinciden con sus hashes, y el programador no tocó ninguna. PA-07 está limpia.
11. Pendiente: N-32 (unas 30 líneas duplicadas) va con el programador de 01e. O-R2-1 (una respuesta que ningún proveedor real envía) va a DEPLOY.
12. Antes de la ronda 0 de 01e hace falta la enmienda corta de O-3.
13. El commit lleva 55 entradas de `git add` (59 archivos), incluidas las 5 pruebas nuevas del tester y la carpeta del encargo con la nota de la fusión.
14. No entra `docs/trabajo/DEPLOY-investigacion-vps.md`, que es ajeno.
15. Recomendación: cierra la app de ChatGPT durante las suites. Hoy subió la carga al 80 %.

## Verificación de la Enmienda 9 — ADMIN-01

Plan enmendado: `plan.md` = `9e678ef4d34af4fa5990e396c0d1f13f941e303998b188240a42e9aa32556f26` (1712 líneas, sin CR), igual al de la entrada "Enmienda 9 del arquitecto" de `aprobacion.md` y a su copia `copias-plan/plan-admin01-v11-enmienda9-9e678ef4.md`. Copia previa: `copias-plan/plan-admin01-antes-enmienda9-e539dbcd.md` = `e539dbcd877f0da7b2e895dff4d8ac099d400ca1fadd66d9f7b36d0a1838b183`, la de la Enmienda 8. Contexto: `reporte-tester.md` = `06a7c4fd…` ("## Ronda 0 — ADMIN-01c", línea 1385). `styles/clases-r1.ataque.test.ts` en el árbol = `5b8d13d3…`, el de C-9 del tester.

No corrí ninguna suite: todo lo de abajo es lectura del código y de las pruebas. Sin navegadores.

### Cotejo del diff
`git diff --no-index` completo contra la copia previa: 203 inserciones y 6 borrados, en 11 hunks. Todos pertenecen a un E9-n. Los 6 borrados son el encabezado, las dos celdas de la matriz y los pasos 14, 27 y 29; las celdas viejas quedan tachadas, no se pierden. Sin caracteres invisibles ni escapes `\uXXXX` en lo agregado (comprobado con `node`).

| Hunk | Sección | E9-n |
|---|---|---|
| `@@ -1,5 +1,5 @@` | Estado | E9-13 |
| `@@ -411,6 +411,14 @@` | §D-9, final (01d1 y 01d2 sin vidrio ni contexto; lectores de `puedeBorrar`) | E9-6 |
| `@@ -422,6 +430,28 @@` | §D-10 (P-01c-1, P-01c-2, traducción de duplicar, sin línea de T-05) | E9-1, E9-2, E9-5 |
| `@@ -440,6 +470,45 @@` | §D-11, bloque "Enmienda 9" (diálogos, vidrio, `MensajeError`, ref, reinicios, `errorQueRedirigeElCliente`, `components/foco/`) | E9-7 a E9-11 |
| `@@ -1134,6 +1203,36 @@` | §D-R0 01c (C-9b, C-9c, C-9d, lista cerrada CH3-B15, vigiladas) | E9-1, E9-2, E9-3, E9-4 (vigiladas de foco), E9-5 |
| `@@ -1141,12 +1240,24 @@` | §D-R0 01d1 y 01d2, vigiladas | E9-6 |
| `@@ -1164,12 +1275,63 @@` | §D-R0 01f (C-13b, C-17b, C-35, C-36, C-37, CH3-C13, vigiladas) y 01g (C-19b, C-19c, C-38, C-39, CH3-C13, vigiladas) | E9-7 a E9-11 |
| `@@ -1208,8 +1370,8 @@` | Matriz, dos celdas de 01c | E9-4 |
| `@@ -1312,7 +1474,7 @@` | Paso 14 | E9-12 (remite a E9-1, E9-2 y E9-5) |
| `@@ -1333,11 +1495,11 @@` | Pasos 27 y 29 | E9-12 (y E9-7 en el 29) |
| `@@ -1513,3 +1675,38 @@` | Tabla de la Enmienda 9 | E9-1 a E9-13 |

### (a) Las PARADAS

**P-01c-1: correcto; los atributos sí hacen falta en el diálogo.**
- `components/ui/dialog.tsx:44-50`: `DialogContent` se envuelve en `DialogPortal` (`DialogPrimitive.Portal` de `radix-ui`, sin `container`), que Radix monta en `document.body`. El contenido queda fuera de la raíz de `ContenedorRol`, que es la única que lleva `data-material` y `data-densidad` (`contenedor-rol.tsx:33-34`).
- Todo lo que el contexto cambia se resuelve por los ancestros del DOM, no por el árbol de React:
  - las variables de `tokens.css:83-98` (`[data-material="opaco"]` y `[data-densidad="densa"]`) se heredan por la cascada;
  - `in-data-[material=opaco]:` de `button-variants.ts:14-17` es la variante `in-*` de Tailwind 4 (`frontend/package.json`: `^4.3.3`), un selector de ancestro.
- Sin los atributos, «Cancelar» (`outline`) saldría con `--glass-strong` al 78 %, desenfoque de 32 px y borde blanco, en vez de `--surface` con borde de 2 px en tinta (§7.3), y mediría 44 px desde 768 px en vez de 36 (§8). El fondo del propio `DialogContent` ya es `bg-surface` (`dialog.tsx:47`), así que el defecto sería de sus controles. El diagnóstico de E9-1 es exacto.
- "Sin `forceMount`" cuadra con las vigiladas que cuentan un solo elemento con contexto con el diálogo cerrado (`clases-admin-02c-r1:458`, `marco-r1:389-391`).

**P-01c-2: `vidrio-fuerte` en el contexto opaco no se aparta de lo aprobado. No va al humano.**
- §7.3, "Control segmentado de dos botones para elegir un tipo", pide `vidrio-fuerte`, `rounded-card` y `p-1` para el grupo dentro de una `Card`, y el indicador `--surface` que pasa a `--accent-soft` en contexto opaco. E9-2 lo copia tal cual.
- §8 ("Opacas, sin vidrio") y §7.2 ("En pantallas densas no hay vidrio") se cumplen por el mecanismo aprobado de §3 ("Materiales", implementación) y de §7.2 (implementación): el contenedor del rol pasa las utilidades a `--surface` "sin que sus consumidores cambien de clase". En `tokens.css:83-91`, `vidrio-fuerte` queda en `--surface`, borde `--border`, sin brillo, sombra ni filtro.
- Es lo mismo que ya hacen `Card` (vidrio) y los botones `outline` (vidrio fuerte) en todo `/admin`. Escribir `bg-surface` a mano sería la desviación.
- El control vive en `/admin/clases`, dentro del contenedor del rol (no en un portal), así que sí recibe el contexto. Lo mismo vale para el control de `estado-de-pago-de-cuenta.tsx` (01f, C-17b): la ficha también cuelga del contenedor del rol.

**P-01c-3: correcto.** `foco-02c-r4.ataque:178-187` declara `clave: () => ["clases", "admin"]`, y el caso de `:245-255` siembra el error con `prefetchQuery` en esa clave exacta. Con `[...CLAVE_CLASES_ADMIN, estado]`, el error sembrado quedaría en otra entrada y el caso pasaría por la primera carga propia de la vista. C-9d lo devuelve a la clave que lee la vista.

**P-01c-4: "como hoy" coincide con el código y con las vigiladas.**
- `clases-admin-view.tsx:43-53`: con `clases.isError` (también tras un `fetchNextPage` fallido) la vista entera pasa a `MensajeError` con `TEXTOS_CLASES_ADMIN.error`, o con el texto del cursor; sin aviso. Es lo que pide `foco-02c-r3:417-431`.
- `:24-30` y `features/clases/hooks.ts:631-650`: `useFocoAlPasarAError` lleva el foco al `h1` (`tabIndex={-1}`, `:94`) solo si hubo datos, la consulta pasa a error y `focoPerdido(document)`. Una primera carga que falla no lo mueve, y un segundo fallo tampoco. Es lo que piden `foco-02c-r3:462-483` y `foco-02c-r4:229-311`.
- Las celdas nuevas lo dicen con precisión ("solo si la lista ya tenía datos y el foco se perdió"). Sin C-n: bien, porque no cambia ningún comportamiento.

### (b) Los C-n
Cada uno es el cambio mínimo, conserva lo que protege su prueba y dice qué pasa a esperar. Comprobé el orden de cada lista contra `rutasDe(...).sort()` o el `.sort()` del caso.

| C-n | Prueba | Juicio |
|---|---|---|
| C-9b | V-07, `data-material\|data-densidad` (`clases-r1:412-415`) | Suma solo `dialogo-borrar-clase.tsx`, en su lugar del orden (3 rutas). Sigue exigiendo igualdad exacta: nada más se marca opaco por su cuenta. Rojo hasta que exista el diálogo |
| C-9c | V-07, `vidrioFuerte` (`:381-407`, hoy 11 rutas) | Suma `clases-admin-view.tsx` entre `panel-anuncios.tsx` y `components/bloque-destacado.tsx` (`clases-admin-view` < `components/`): 12 rutas. El vidrio sin variante, el azul y el contexto no cambian |
| C-9d | `foco-02c-r4:185` | Lo endurece: el caso vuelve a probar "error ya en la caché". Las recargas de `:263-311` usan también `uso.clave`, que después del cambio es la clave exacta de la vista; siguen invalidando lo mismo |
| C-13b | `cuentas-r1:532-534` | De "ningún archivo" a una lista exacta de dos. `infractores` lee el texto crudo, comentarios incluidos; §D-11 ya prohíbe nombrar la ruta en un comentario de otro archivo. Las tres excepciones son las de `CLAUDE.md` y §7.9 (dar de baja, restringir, cambio masivo) |
| C-17b | V-07, las dos listas | 5 rutas de contexto y 13 de vidrio fuerte (`features/admin/…` < `features/auth/…`). Exacto |
| C-19b, C-19c | V-07 y `cuentas-r1:532` | `dialogo-estado-pago-lote.tsx` entre `dar-de-baja` y `restringir-acceso` en las dos: 6 rutas y 3 archivos |
| C-35, C-38 | `estatico-ch3-r2:114-133` y `:135-150` | `CON_REF` exige exactamente una guarda `…Ref.current` entre `preventDefault()` y la guarda `isPending`; los demás conservan la expresión de hoy. Lo endurece. El porqué del lugar es correcto: con la ref después de la línea de T-05, el segundo clic, con `isPending` todavía falso en su cierre y el error viejo a la vista, reiniciaría la mutación en vuelo. `:135-150` solo suma los cuatro (y en 01g, uno) archivos que el plan nombra; `otros` sigue en `[]` y la regla del render no cambia |
| C-36, C-39 | `estatico-ch3-r1:172-182` | Suma los nombres fijos de §D-11 y las claves anidadas de texto fijo. No admite llamadas nuevas, ternarios ni `.message`. `usos.length >= 18`: hoy hay 18 en una línea; sale el de `buscador-de-cuenta.tsx` y entran los de 01f, así que el piso no cae |
| C-37 | `apiClient-ch3-r1:59-84` | `features/admin/lib.ts` entra al principio de `usan` (`admin` < `calificaciones`), con `true, false`. `conLosTres` y las declaraciones (`estatico-ch3-r1:197`, `estatico-ch3-r2:93-104`, `apiClient-ch3:30-47`) no cambian |

Listas cerradas de pruebas normales (no son C-n, las cambia el programador):
- **CH3-B15 de `features/clases/errores-ch3.test.ts` (01c), choque real.** El formulario de duplicar necesita la clave `duplicar` en `CAMPOS_PINTADOS_DE_LA_CLASE`, y `:252-256` exige igualdad exacta. Las filas y el modo de `:178-205` son el mismo patrón de crear y editar. `:264-281` sigue en verde: `["nombre", "maestroIds"]` no es ninguna de las dos listas vigiladas, y `lib.ts` conserva sus 7 llamadas porque el cuerpo de `erroresDeLaClaseDeApi` no cambia.
- **CH3-C13 (`errores-de-api-estatico.test.ts:115-173`).** `reinicianUnaMutacion` solo mira `admin` y `auth`, así que los reinicios sin condición de 01c (`features/clases`) no le llegan. Bien que no se nombren. `ficha-de-cuenta.tsx#restablecer` y `tabla-enlaces.tsx#revocar` son exactos: `const restablecer = useRestablecerContrasena()` (`ficha-de-cuenta.tsx:22`) y `const revocar = useRevocarEnlace()` (`tabla-enlaces.tsx:53`) están en el mismo archivo, y hoy ninguno llama a `reset()`.

### (c) Los seis choques nuevos y el grep repetido
Los seis son reales y cada remedio es correcto:
1. **CH3-B15 en 01c:** arriba.
2. **`estatico-ch3-r2:114-133`:** la expresión de hoy exige que la guarda `isPending` siga **inmediatamente** a `preventDefault()`. La ref de las filas 7 a 10 de CHORE-04 la rompe en `formulario-corregir-correo.tsx` (01f) y en los tres formularios de 01g. C-35 y C-38.
3. **`estatico-ch3-r1:172-182`:** los `MensajeError` nuevos de admin pasan expresiones que hoy no admite el patrón. C-36 y C-39, con nombres fijos.
4. **`apiClient-ch3-r1:59-84`:** la lista `usan` es exacta. C-37. Es la cuarta copia de `errorQueRedirigeElCliente`; ver los detalles.
5. **CH3-C13:** arriba.
6. **El filtro de 01g:** con tres opciones, el indicador necesita `translate-x-[200%]`, que prohíben `estatico-03c1-r1:93-97` (`translate-x-\[[234]00%\]`) y la lista exacta de `components/layout/estatico-r1:138-158`. El `NativeSelect` lo evita sin C-n.

**Grep repetido** sobre las 36 pruebas que leen el código con `import.meta.glob` y las 6 que lo leen con `readFileSync` o `?raw`, buscando listas exactas de archivos, atributos de contexto, vidrio, diálogos, reinicios, `MensajeError`, importadores y nombres de ganchos, para lo que dibujan los "Se toca" de 01c, 01d1, 01d2, 01f y 01g. **No falta ningún choque:** ninguna otra prueba se pone en rojo con el diseño bien hecho. Comprobé además:
- `refactor-01c-r1:221-262` compara `TEXTOS_ADJUNTOS` con `toMatchObject` y cuatro códigos de archivo sueltos. `ARCHIVO_EN_COPIA` no le llega (su lista cerrada sigue siendo `reexportaciones-01c:139-145`).
- `estatico-02c-r1:62-90`: las filas 4, 6, 18, 24, 26 y 32 de §D-9 son exactamente los seis lectores de hoy.
- Ninguna otra prueba vigila `components/ui/dialog` fuera de `cuentas-r1:532` y V-05/V-16 (que ya admiten `dialog.tsx`).
- CAL-T-95 y CAL-T-97 (`tareas/estatico-01c-r1:55-104`), `estatico-03c1-r1:44-65` y CAL-1D09 alcanzan a 01d2 como dice E9-6.

Sí hay **trampas** que el grep de E9 no nombra. No son choques, porque el diseño no obliga a caer en ellas, pero conviene que el tester las deje como observación en la ronda 0 de cada subentrega (N-03).

### (d) Alcance, "Se toca", "No se toca" y lo visual
- **Nada cambia fuera de lo necesario.** No cambian el alcance, el contrato, el backend, "Se toca" ni "No se toca" de ninguna subentrega, ni los textos de §D-12. Todo lo que E9 pide escribir cae en archivos que ya estaban en "Se toca":
  - 01c: `clases-admin-view.tsx` y `dialogo-borrar-clase.tsx`.
  - 01f: `features/admin/lib.ts`, `components/foco/hooks.ts` y los diálogos.
  - 01g: `dialogo-estado-pago-lote.tsx` y los tres formularios.
  - E9-2 deja el control en la vista justamente porque "Se toca" no tiene otro archivo.
  - La lista cerrada de 01c crece en CH3-B15, una prueba normal, con un grep del arquitecto. Es la vía de las Enmiendas 4, 7 y 8.
- **Lo visual aprobado no cambia.** El control segmentado sigue §7.3, el contexto opaco sigue §3, §7.2 y §8, y los diálogos llevan E-23, ya aprobado ("los de 01f y 01g igual").
- **El `NativeSelect` de 01g ya lo cubre el plan aprobado. No es una decisión nueva.**
  - §D-11 (`plan.md:460`) ya fija el filtro por rol de `/admin/usuarios` como `NativeSelect`.
  - `DESIGN.md` §7.3 aprueba el `NativeSelect` como "Selector de una lista corta".
  - §7.29 ya lo usa como filtro de una lista: "Mostrar" de "Mis calificaciones", propuesta aprobada (2026-10-26).
  - §7.9 solo dice "Los filtros", sin nombrar el control. `plan.md:462` nombra las opciones ("Todos / Deudores / Al corriente"), no el control.
  - Es información para el humano: puede cambiarla si quiere, pero no hace falta esperar su respuesta. Si la cambiara a un control segmentado de tres, haría falta otra enmienda: V-07, CL3-R1-35 y la lista de valores arbitrarios, o el indicador medido de §7.3.

### Problemas que bloquean
Ninguno.

### Problemas que no bloquean
**N-01 — CH3-C13 de 01f no queda del todo cerrada.**
- Dónde: §D-R0 01f, "la lista cerrada de 01f, CH3-C13": "y los que el programador declare en los diálogos y en `acciones-de-cuenta.tsx`".
- Por qué importa: `reinicianUnaMutacion` cuenta `<archivo>#<m>` solo si `const <m> = use…(` y `<m>.reset()` están en el mismo archivo. Si la mutación de la baja se crea en `acciones-de-cuenta.tsx` y se pasa al diálogo por props, el `reset()` del diálogo no cuenta. Las entradas dependen de dónde la ponga el programador, y la regla de `AGENTS.md` pide la lista del grep del arquitecto.
- Qué se espera: el programador declara en su resumen cada entrada nueva (`archivo#mutación`). Cada una tiene que ser un archivo de "Se toca" de 01f con un nombre fijo de §D-11 (`baja`, `reactivar`, `restringir`, `restablecerAcceso`, `editar`, `alta`, `cambiar`). Cualquier otra es PARADA. Lo contrasto en la verificación del resumen; no hace falta otra enmienda.

**N-02 — "se eligen por código en `lib.ts`" admite dos lecturas, y una choca con C-36.**
- Dónde: §D-11, "`MensajeError` en `features/admin`", último punto.
- Por qué importa: si `lib.ts` devuelve el texto (`mensaje={textoDeLaFicha(usuario.error)}`), sería una cuarta forma que C-36 no admite, y saldría una PARADA en 01f.
- Qué se espera: `lib.ts` da un predicado por código (por ejemplo, si la cuenta no existe). La vista hace el retorno temprano y pasa a `mensaje` el texto de `data.ts`. Así se lee junto con la frase anterior del mismo punto ("la vista hace un retorno temprano por caso").

**N-03 — Trampas para la ronda 0 de cada subentrega (no son choques).** El diseño no obliga a caer en ellas, pero un programador puede hacerlo sin darse cuenta:
- **01f y 01g, V-16 (`components/layout/estatico-r1:102-112`):** `\bfixed\b` también encuentra `table-fixed`, y una barra de lote fija. §7.9 la pone "Arriba".
- **01f, CL3-R1-35 (`estatico-03c1-r1:93-97`):** `grid-cols-[45]\b` y `w-1/[45]` alcanzan también `md:grid-cols-4` o `lg:grid-cols-5` en los cinco accesos del dashboard, y cualquier columna `w-1/4`.
- **01g, O-07 (`estatico-02c-r1:36-58`):** "Hecho por" de `/admin/movimientos` pinta `actor.nombre` o usa `FirmaDelAutor`. Nunca lee `.administracion` ni escribe "Administración".
- **01d2, estáticas de `features/tareas` que enumeran archivos que 01d2 toca:**
  - `entregas-01e-r1:741-768`: `NUEVOS_01E` incluye `detalle-tarea-view.tsx`, `entrega-de-alumno-view.tsx`, `acciones-de-la-tarea.tsx`, `hooks.ts` y `lib.ts`. Sin vidrio, `data-material`, `fixed` ni `from "@/features/`, y `renovarTrasErrorDeLaEntrega(` exactamente 3 veces en `hooks.ts`.
  - `entregas-01e-r2:530-560`: sin `@/features/` en `entrega-de-alumno-view.tsx` ni en `detalle-tarea-view.tsx`.
  - `entregas-01d-r3:675-718`: la lista de ganchos del alumno y del hilo exportados por `hooks.ts`.
  - Con E9-6 y M-06 no hacen falta cambios (`esClaseArchivada` llega de `@/components/clase/lib`), pero no están nombradas.

### Detalles menores
- **`errorQueRedirigeElCliente` en `features/admin/lib.ts` es la cuarta copia idéntica** (tareas, calificaciones, clases). Va contra la regla 5 de `CLAUDE.md`, con el precedente de C-29 de CLASES-03c2. Subirla a `lib/` es un refactor de varios dominios, fuera de ADMIN-01. Candidata a un chore.
- **O-01c-6, estado vecino del foco:** `useFocoAlPasarAError` recibe hoy `CLAVE_CLASES_ADMIN.join("/")`. Si la vista cambia de "Activas" a "Archivadas" sin desmontarse, la clave debería llevar el estado. E9-4 dice "como hoy" y no lo nombra; queda como observación del tester para el programador, y lo miro en la matriz del primer resumen de 01c.
- **"Restablecer" (acceso) de la tabla de 01g** no tiene nombre fijo en la lista de 01g. Si pinta un `MensajeError`, usa `restablecerAcceso`, que C-36 ya admite.
- **C-36 y C-39, "verde antes y después":** se lee como "antes y después de aplicar el C-n, con el código de hoy". Con el código de 01f y sin el C-n, el caso estaría en rojo.

### Para el humano
Nada que decidir. P-01c-2 no se aparta de lo aprobado, y el `NativeSelect` de 01g ya lo cubre el plan (§D-11, filtro por rol) y `DESIGN.md` (§7.3 y §7.29). Si prefieres un control segmentado en `/admin/estado-pago`, dilo antes de 01g: hace falta otra enmienda corta.

### Veredicto de esta verificación
**APROBADO.** El tester reanuda la ronda 0 de 01c con C-9 ya aplicado y suma C-9b, C-9c y C-9d. Los C-n de 01f y 01g van en sus rondas 0. N-01 y N-02 los contrasto en la verificación del resumen de 01f. N-03 queda para las observaciones del tester en cada ronda 0.

## Arbitraje de P-01c-5 — ADMIN-01c

Origen: `reporte-tester.md`, "### Tras la Enmienda 9" (línea 1813; `7dec660b…`). `foco-02c-r4.ataque.test.tsx` en el árbol = `0165d4e2…` (C-9d aplicado tal como lo escribe el plan; el diff contra `52f1c97` solo cambia `:185` y agrega su comentario). No corrí pruebas: el diagnóstico del tester se comprueba leyendo el archivo y `features/clases/hooks.ts:271-280`.

**Decisión: (a).** C-9d se queda como está en el árbol, y sus tres casos (`:260`, `:283` y `:302`, que fallan en `:267`, `:290` y `:310`) son rojo esperado de 01c, como C-9, C-9b y C-9c. Así se corrige la frase "Debe esperar: verde antes y después" de C-9d en §D-R0 01c, sin otra enmienda. Lo que pasa a esperar:
- **Rojo hoy, porque las recargas no alcanzan la consulta.** La vista de hoy guarda la lista en `["clases", "admin"]` (`hooks.ts:273`). `recargar` invalida `uso.clave(…)`, que con C-9d es `["clases", "admin", "activas"]`, una clave más larga que no es prefijo de la de hoy: no hay nueva petición y el texto de error nunca aparece.
- **Verde con 01c**, cuando la consulta de "Activas" sea exactamente `[...CLAVE_CLASES_ADMIN, "activas"]` (§D-10). Con cualquier otra forma, por ejemplo con el estado delante del prefijo, siguen en rojo. Eso es correcto: fija la clave que el plan ya fijó.

**Mi error en la verificación de la Enmienda 9.** En la fila de C-9d escribí que las recargas "siguen invalidando lo mismo". Eso solo es cierto con el código de 01c, no con el de hoy. Debí ver que la frase "verde antes y después" era falsa.

**Por qué no (b)** (sembrar en `["clases", "admin", "activas"]` solo en `:245-255` y dejar `["clases", "admin"]` en las recargas):
- **Hoy no prueba nada.** Con el código de hoy, el caso de la caché sembraría en una clave que la vista no lee y pasaría por su primera carga propia. Es el mismo hueco de P-01c-3, solo que al revés. Ese "verde antes" sería vacío.
- **No fija la clave de "Activas".** `["clases", "admin"]` es prefijo de las dos claves por estado, así que las recargas pasarían con cualquier clave que empiece por él. El uso "/admin/clases" quedaría con dos claves distintas en el mismo bloque.
- **Cambia más líneas** de las que fija C-9d y necesita texto nuevo. (a) ya está en el árbol.
- **Un rojo esperado en la ronda 0 es el estado normal** de un C-n cuyo remedio aún no existe.

**Con (a), cada caso del uso "/admin/clases" sigue probando lo mismo una vez implementado 01c.** Lo comprobé en el archivo:
- **`:233-246` (dos primeras cargas que fallan):** no usan `clave`, así que no cambian.
- **`:248-258` (error ya en la caché):** siembra en la clave exacta que lee la vista, como cuando se escribió el caso con `["clases", "admin"]`.
- **`:260-281` (recarga que falla tras tener datos):** las dos mitades esperan el texto de error (`findByText`) antes de mirar el foco. Ninguna pasa sin la recarga real.
- **`:283-300` (dos fallos seguidos):**
  - el primer fallo espera el texto;
  - el segundo y el tercero vuelven a pedir porque la clave alcanza la consulta, que es justo lo que hoy no pasa;
  - la afirmación "no mueve el foco" se hace sobre una recarga que de verdad falló.
- **`:302-320` (éxito, error, éxito, error):** espera el texto de error y su desaparición en cada vuelta.
- **El otro bloque (`:323-353`)** excluye a "/admin/clases".
- **El doble** (`:105-107`) responde a todo `/api/admin/clases?`, así que acepta `?estado=activas&limite=50`.
- **La vigilada `foco-02c-r3:478`** invalida `["clases", "admin"]`, que es prefijo de las dos claves por estado. Sigue alcanzando la consulta con 01c.
- **Ningún otro caso de la `*.ataque` queda sin probar nada.**

**El comentario de C-9d no cambia.** "Las recargas invalidan por prefijo, como antes" es cierto con 01c: `invalidateQueries` sin `exact` compara por prefijo, y la clave de "Activas" es la clave completa de la consulta. Cambiarlo pediría otro texto de C-n y no aporta.

**Para el programador de 01c:**
- El rojo esperado completo de la ronda 0 es:
  - V-06 (C-9);
  - V-07 (C-9c y, detrás, C-9b);
  - los tres casos de `foco-02c-r4` del uso "/admin/clases" (C-9d).
- Los cinco pasan a verde con la implementación.
- El resumen los nombra uno por uno, con su título exacto.
- La llave de reinicio de `useFocoAlPasarAError` lleva el estado (O-01c-6).

**Veredicto:** P-01c-5 resuelta con (a). La ronda 0 de 01c queda cerrada sin más cambios del tester; sigue el programador.

## Verificación de la Enmienda 10 — ADMIN-01

Plan enmendado: `plan.md` = `3822b6c0adb9823edb9c552dd6cfac78f4e0ffa2f4eca9fcade0be07d4fbdd78` (1768 líneas, sin CR). Es igual a la entrada "Enmienda 10 del arquitecto" de `aprobacion.md` y a su copia `copias-plan/plan-admin01-v12-enmienda10-3822b6c0.md`. Copia previa: `plan-admin01-antes-enmienda10-9e678ef4.md` = `9e678ef4…`, la de la Enmienda 9. Contexto: `resumen-programador.md`, "ADMIN-01c — PARADA en el paso 14" (línea 744).

Entorno: la carga dio 24 % y 25 %, y después 21 % y 21 %. No había ningún `node` con `vitest`. Corrí una sola prueba acotada, sin cambiar nada del árbol. Sin navegadores.

### Cotejo del diff
`git diff --no-index` completo contra la copia previa: 68 inserciones y 12 borrados, en 14 hunks. Los 12 borrados son líneas reemplazadas, y lo que retiran queda tachado:
- el encabezado;
- §D-9;
- dos de §D-10;
- §D-12;
- ADM-1C01 y ADM-1C03;
- "Nada más del archivo cambia";
- tres filas de la matriz;
- el paso 14.

Sin caracteres invisibles ni escapes `\uXXXX` en lo agregado (comprobado con `node`).

| Hunk | Sección | E10-n |
|---|---|---|
| `@@ -1,5 +1,5 @@` | Estado | E10-7 |
| `@@ -410,7 +410,7 @@` | §D-9, lista compartida | E10-6 |
| `@@ -426,7 +426,7 @@` | §D-10, Duplicar (aviso siempre; foco como al crear o editar) | E10-4, E10-3 |
| `@@ -437,7 +437,7 @@` | §D-10, nombre del grupo | E10-5 |
| `@@ -520,9 +520,10 @@` | §D-12 (avisos; texto nuevo) | E10-4, E10-5 |
| `@@ -730,9 +731,9 @@` | Pruebas ADM-1C01 y ADM-1C03 | E10-5; E10-3 y E10-4 |
| `@@ -1224,7 +1225,23 @@` | §D-R0 01c (CH3-B01 y grep de mapas) | E10-1, E10-2 |
| `@@ -1244,6 +1261,9 @@` | §D-R0 01d1, vigiladas | E10-2, E10-6 |
| `@@ -1258,6 +1278,10 @@` | §D-R0 01d2, vigiladas | E10-2, E10-6 |
| `@@ -1306,6 +1330,7 @@` | §D-R0 01f, vigiladas | E10-2 |
| `@@ -1332,6 +1357,7 @@` | §D-R0 01g, vigiladas | E10-2 |
| `@@ -1372,14 +1398,14 @@` | Matriz: archivar y restaurar (01c), «Duplicar clase», «Restaurar» del aviso (01d1) | E10-6; E10-3 y E10-4 |
| `@@ -1474,7 +1500,7 @@` | Paso 14 | E10-1 (y remite a E10-3 a E10-6) |
| `@@ -1710,3 +1736,33 @@` | Tabla de la Enmienda 10 | E10-1 a E10-7 |

### (a) E10-1, CH3-B01
- **Corrida de hoy**, desde `frontend/`, sin cambiar nada: `npx vitest run src/features/clases/errores-ch3.test.ts src/features/clases/reexportaciones-01c.test.ts src/components/adjuntos/errores-ch3.test.ts` (14:52:08) da `Test Files  1 failed | 2 passed (3)` y `Tests  1 failed | 37 passed (38)`. El único rojo es CH3-B01: `expected [ 'ALMACEN_NO_CONFIGURADO', …(12) ] to deeply equal [ 'ALMACEN_NO_CONFIGURADO', …(11) ]`. Coincide con la PARADA del programador.
- **La causa es la que dice la enmienda.** `features/clases/data.ts:286` esparce `MENSAJES_POR_CODIGO_DE_ARCHIVO` en `MENSAJES_POR_CODIGO_DE_CLASES`, y `errores-ch3.test.ts:95-97` compara sus claves con las de `TEXTOS_FIJOS_DE_SIEMPRE` (`:45-60`) con igualdad exacta.
- **El alcance es mínimo y pasa a verde.** Las dos líneas van después de `RESPUESTA_NO_ENCONTRADA` (`:59`) y antes de la llave (`:60`), con un comentario por entrada, como las de CLASES-03d y 03e (`:55-59`).
  - Con ellas, las claves vuelven a coincidir (12 y 12).
  - El bucle de `:98-100` pide `mensajeDeErrorClases(new ApiError("ARCHIVO_EN_COPIA", "x", 400))`, que sale del mapa por código: `ARCHIVO_EN_COPIA` no está entre los cinco códigos nuevos con mensaje del servidor de 01c.
  - El texto de la línea es carácter por carácter el de `components/adjuntos/data.ts` (diff del programador) y el de §D-12.
  - La corrida acotada queda en 38 de 38. El número de casos no cambia, porque CH3-B01 es un solo caso.
- **El comentario de `reexportaciones-01c.test.ts:146`** ("cuatro códigos" pasa a "cinco") es la única otra línea. `:139-145` ya está en la lista cerrada y el programador ya la cambió.

### (b) E10-2, el grep de mapas
Repetí el grep en todos los `*.test.*` de `frontend/src`: `MENSAJES_POR_CODIGO`, `MENSAJES_ERROR_*`, `TEXTOS_FIJOS` y `mensajesPorCodigo`. Está completo. Solo enumeran las claves de un mapa con igualdad exacta:
- CH3-B01 de clases (`:95`, E10-1);
- `reexportaciones-01c:139-145` (ya en la lista cerrada);
- `features/admin/errores-ch3.test.ts:98` (`MENSAJES_ERROR_ADMIN`);
- `features/auth/errores-ch3.test.ts:57` (`MENSAJES_ERROR_AUTH`).

Los dos últimos no cambian en ninguna subentrega, y E10-2 los deja vigilados con PARADA. El resto recorre el mapa (`reexportaciones-01c:147`, `components/adjuntos/errores-ch3.test.ts:17`, `admin/errores-ch3-r1:438`, `auth/errores-ch3-r1:373`), nombra claves sueltas (`dudas-lib-03e:91-93`, `formularios-ch3`, `secuencias-ch3-r2`, `como-se-entrega-01a:248-255`, `calificaciones/errores-ch3:18-28`) o usa `toMatchObject` (`refactor-01c-r1:222`). Ninguna prueba nombra `MENSAJES_POR_CODIGO_DE_TAREAS`. Las reglas de PARADA por subentrega cierran el hueco que dejó la Enmienda 1.

### (c) E10-3, el foco tras duplicar
- **Lo comprobé en el código.** `FormularioClase.alTerminar` (`formulario-clase.tsx:62-68`) avisa con `toast.success` y hace `navigate`, sin mover el foco. Crear (`/admin/clases/nueva`) y editar (`…/editar`, dentro de `ClaseLayout`) lo usan.
- **Es la práctica de todo el proyecto.** Tras una mutación que navega, ninguna vista mueve el foco a mano:
  - `crear-tarea-view.tsx:22`;
  - `editar-tarea-view.tsx:87`;
  - `editar-recurso-view.tsx:104`;
  - `formulario-unirse-clase.tsx:43`;
  - `acciones-de-la-tarea.tsx:71`.
- **El aviso anuncia el resultado.** `sonner` es una región viva.
- **`ClaseLayout` no mueve el foco al cambiar de clase.** `useFocoAlPasarAError(…, claseId, errorRef)` (`clase-layout.tsx:30`) reinicia su memoria cuando cambia la clave, y en ese render no mueve el foco.
- **Ninguna regla del sistema de foco pide otra cosa.** "Nunca a `<body>`" de `DESIGN.md` §7.14 y de `components/foco` cubre un control que desaparece dentro de la misma vista, por una acción en línea o por una recarga. No cubre el cambio de ruta tras una acción que termina, y el proyecto no tiene un gestor de foco por ruta.
- **"Como hoy" no incumple una razón de accesibilidad que la matriz aprobada protegiera.** El `h1` de la clase nueva era una mejora: sería el único flujo de navegación con foco dirigido, y pediría `encabezado-clase.tsx` (01d1) en 01c. Si el humano lo quiere, conviene decidirlo para todas las navegaciones tras una acción (un chore), no solo para duplicar. Lo dejo para el humano, sin bloquear.

### (d) E10-6, `claveClasesAnteriores`
- **Correcto.**
  - `consultarMeDeLaCuentaNueva` (`features/auth/hooks.ts:45-48`) hace `queryClient.removeQueries()` al entrar, y el cierre de sesión hace `queryClient.clear()` (`:118`). La caché es de cada pestaña y cada cuenta.
  - `GET /clases/anteriores` es solo del alumno y del maestro. Archivar y restaurar son solo del admin. En la sesión del admin esa clave nunca tiene datos, e invalidarla no renovaría nada.
- **El alumno y el maestro sí ven el cambio.** `app/providers.tsx:14` fija `staleTime: 30_000`, con `refetchOnMount` en su valor por defecto. Al montar la lista con datos vencidos, la vuelven a pedir. Es lo mismo que pasa hoy con una clase nueva o una baja en inscritas e impartidas.
- **01c ya no tiene que tocar `services/clasesService.ts`**, que no estaba en su "Se toca". La matriz quita la clave de las tres filas (archivar y restaurar en 01c, «Restaurar» del aviso en 01d1), y ADM-1C14 no la nombraba.

### (e) E10-4 y E10-5, los textos
- **"Estado de las clases"** (nombre accesible del grupo "Activas" / "Archivadas"): sin problema de tono (§9). Es concreto, en español de México, con mayúscula solo en la primera palabra y sin palabras prohibidas.
  - Sigue el precedente de `aria-label={TEXTOS_CLASE.secciones}` ("Secciones de la clase", `secciones-de-clase.tsx:65`) y el "Tipo de publicación" de §7.3. Es un grupo, no un botón: la regla del `sr-only` de los botones no aplica.
  - Lo aprueba el humano. Bien que el paso 14 diga que el programador no lo escribe antes.
- **"Clase duplicada. Los archivos de los recursos pueden tardar unos minutos en estar disponibles."**, ahora siempre: sin problema de tono. Dice qué pasó y qué puede esperar, y "pueden" lo mantiene cierto aunque la original no tuviera archivos.
  - Su único costo es una segunda frase sin objeto cuando no había recursos con archivos.
  - La alternativa (saber si los había) cambiaría `shared/` y el backend en una subentrega de frontend. Es razonable llevarlo al humano como está.

### (f) Nada más cambia
Los 14 hunks pertenecen a E10-1 a E10-7. No cambian:
- el alcance, el contrato, el backend ni `shared/`;
- "Se toca" ni "No se toca" de ninguna subentrega, ni el conteo de archivos de 01c. `errores-ch3.test.ts` ya estaba en la lista cerrada por la Enmienda 9, y `services/clasesService.ts` sale de lo que 01c habría tenido que tocar;
- los C-n ni las cifras de V-06 y V-07;
- las `*.ataque`;
- los demás textos de §D-12.

ADM-1C01 y ADM-1C03 solo ganan lo que piden E10-5, E10-3 y E10-4.

El árbol tiene, además de las `*.ataque` de la ronda 0, los dos archivos de la PARADA del programador: `components/adjuntos/data.ts` y `reexportaciones-01c.test.ts:142`. Los dos están dentro de lo que pide el plan.

### Problemas que bloquean
Ninguno.

### Detalles menores
- El comentario de la constante en `errores-ch3.test.ts:44` ("Lo que cada código con texto fijo daba antes de CHORE-03") ya no es exacto desde CLASES-03d. E10-1 hace bien en no tocarlo: cada entrada posterior lleva su comentario de origen.
- `ARCHIVO_EN_COPIA` se escribe como literal en `components/adjuntos/data.ts`, no como una clave de `MENSAJES_ERROR_DE_ARCHIVOS`. Es lo que pide §D-10 y no hay prueba que lo exija de otra forma. Lo anoto para la verificación del resumen de 01c, por si el programador lo mueve: `refactor-01c-r1:445` fija dónde se define `MENSAJES_ERROR_DE_ARCHIVOS`.

### Para el humano
- **Aprobar el texto nuevo "Estado de las clases"** (E10-5). El programador no lo escribe antes.
- **El aviso "Clase duplicada…" sale siempre** (E10-4). El texto ya estaba aprobado; solo cae su condición.
- **Opcional, sin bloquear:** si quieres que, tras crear, editar o duplicar, el foco vaya al título de la página nueva, es una decisión para todas las navegaciones tras una acción (un chore), no solo para duplicar.

### Veredicto de esta verificación
**APROBADO.** Con el texto de E10-5 aprobado por el humano, el programador reanuda el paso 14 de 01c: aplica CH3-B01 y el comentario de `:146` con el alcance exacto de §D-R0 01c, y la corrida acotada debe dar 38 de 38 antes de seguir.

## Verificación del resumen — ADMIN-01c — implementación

Veredicto: **ACEPTADO** (tras la corrección de M-01; ver "Re-verificación de M-01" al final de esta sección). Primero salió DEVUELTO por una cifra (M-01), que solo cambiaba el resumen: el código, las pruebas, la matriz, los textos y "No se toca" estaban bien.

Plan: `plan.md` = `3822b6c0…` (Enmiendas 1 a 10), comprobado. Resumen: `resumen-programador.md` = `06c3c770…`, sección "ADMIN-01c — Implementación (2026-11-05)" (línea 783). Base dentro de los paquetes: `52f1c97`. Ronda 0: `reporte-tester.md`, "Ronda 0 — ADMIN-01c" con "Tras la Enmienda 9", y mi arbitraje de P-01c-5.

Entorno: 01c es solo frontend (PA-01 no aplica). La otra copia de trabajo no se usa. Sin navegadores. Puerta de carga: 17 % y 20 % a las 15:38:47, sin ningún `vitest`, antes de la suite de módulos; 25 % y 18 % antes de la corrida acotada. Corrí una cosa a la vez. Huella del árbol entregado (`git diff 52f1c97 -- frontend` más los ocho archivos sin rastrear, concatenados): `6eb27b0a1a0dd3b82060cd52771a695d4633642fba53402799b593e2c9045a94`.

### Cifras: resumen contra mi corrida (desde `frontend/`)

| Qué | Resumen | Mi corrida |
|---|---|---|
| `npm run lint` | exit 0; `All matched files use Prettier code style!`; última línea `> tsc -b` | Igual: exit 0, la misma línea de Prettier y `> tsc -b` sin errores |
| `npm run build` | exit 0, `✓ built in 1.22s` | exit 0, `✓ built in 859ms` (el tiempo no es una cifra que contrastar) |
| Suite de módulos, comando literal del resumen | `Test Files 133 passed (133)` · `Tests 2456 passed (2456)` | **Igual:** `Test Files 133 passed (133)` · `Tests 2456 passed (2456)` (15:39:00, 135 s). Sin avisos de React ni `stderr` en la salida |
| Corrida acotada de E10-1 | `Tests 38 passed (38)` (14:56:55) | **`Test Files 3 passed (3)` · `Tests 42 passed (42)`** (15:41:41). Por archivo, con `npx vitest list` y `grep -a`: `features/clases/errores-ch3.test.ts` 28, `reexportaciones-01c.test.ts` 13, `components/adjuntos/errores-ch3.test.ts` 1. **No coincide (M-01)** |
| `npx vitest list` de los tres archivos nuevos | 78: 51, 22 y 5 | **Igual:** 78 (51, 22 y 5); los 78 llevan "ADM-1C" en su ruta de títulos |
| V-01 | 256; lista vigente `ac79306a…`; `sha256sum -c` sin diferencias | **Igual:** 256 rastreadas, ninguna sin rastrear; `sha256sum -c` de la lista `ac79306a…` da 0 diferencias. Contra `52f1c97` solo cambian `styles/clases-r1.ataque.test.ts` (`550ccd96…`) y `foco-02c-r4.ataque.test.tsx` (`0165d4e2…`), las de C-9 a C-9d |

### Problemas que bloquean

#### M-01 — La corrida acotada de E10-1 da 42, no 38
- **Dónde:** `resumen-programador.md`, "Verificación", viñeta "Corrida acotada de E10-1" (`Tests 38 passed (38)`, 14:56:55).
- **Por qué importa:** `.claude/agents/manager.md`, "Verificación del resumen del programador", punto 3, y `AGENTS.md`, "Resúmenes verificables del programador": toda cifra sale de una corrida sobre lo que se entrega, y una que no coincide devuelve el resumen.
- **La causa, comprobada:** los 4 casos que faltan son de CH3-B15, en el mismo `errores-ch3.test.ts`:
  - tres de CH3-B15 (1) en el modo `duplicar` (`nombre`, `maestroIds` y `descripcion`);
  - uno de CH3-B15 (2), "toda la tabla fuera de contrato da null en el modo duplicar".
  La Enmienda 9 los sumó a la lista cerrada. Quedan 38 + 4 = 42. La corrida de las 14:56:55 es anterior a esos cambios (la suite de módulos es de las 15:28:50), así que la cifra es de otro árbol.
- **Lo que me toca:** el "38" lo dicen también el plan (E10-1, "Debe esperar: … 38 casos") y mi verificación de la Enmienda 10 ("La corrida acotada queda en 38 de 38"). Ninguno contó los cuatro casos de CH3-B15. El error del plan y el mío no cambian la regla: la cifra del resumen tiene que ser la de su árbol.
- **Qué se espera:**
  - El programador vuelve a correr la acotada sobre el árbol entregado, sin cambiar nada.
  - Reporta en el resumen el comando, la hora y la última línea.
  - Si el árbol cambia por cualquier motivo, lo dice: la huella de arriba ya no valdría.
  - **Re-verificación:** con la misma huella, solo repito la acotada; el resto de esta verificación se mantiene.

### Pruebas requeridas: ADM-1C01 a 1C17, 1C04b y N-24
Cotejé cada título del resumen con los 78 de `npx vitest list`, uno por uno. Todos existen con el texto exacto, en el archivo que dice el resumen.

| Id | Casos |
|---|---|
| ADM-1C01 | 1 |
| ADM-1C02 | 3 |
| ADM-1C03 | 2 |
| ADM-1C04 | 4 |
| ADM-1C04b | 1 |
| ADM-1C05 | 5 |
| ADM-1C06 | 4 |
| ADM-1C07 y ADM-1C16 (c) | 8 (cuatro caminos en cada pestaña) |
| ADM-1C08 y ADM-1C16 (d) | 2 |
| ADM-1C09 | 1 |
| ADM-1C10 | 3 |
| ADM-1C11 | 3 |
| ADM-1C12 | 4 |
| ADM-1C13 | 1 |
| ADM-1C14 | 5 |
| ADM-1C15 | 15 |
| ADM-1C16 (a), (b) y (c) | 1, 3 y 1 |
| ADM-1C17 (a) y (b) | 5 y 2 |
| N-24 | 2 |
| Matriz | 2 |
| **Total** | **78** |

- Los caminos de ADM-1C06, 1C07, 1C10, 1C11, 1C12 y 1C16 (c) están en `clases-admin-01c-rutas.test.tsx`, que monta `Providers` de `app/providers.tsx` y el router real.
- ADM-1C05 recorre `ENTRADAS_FUERA_DE_CONTRATO` en el modo `duplicar` por CH3-B15 (2). ADM-1C10 lo recorre por CH3-B01 y por la vigilada `components/adjuntos/errores-ch3.test.ts`. Los dos, como dice el resumen.
- **Los cinco rojos esperados** existen con su título exacto y están en verde en mi corrida de módulos:
  - V-06 (`styles/clases-r1.ataque.test.ts:178`);
  - V-07 (`:368`, con C-9c y C-9b);
  - los tres casos del uso "/admin/clases" de `foco-02c-r4.ataque.test.tsx` (`:260`, `:283` y `:302`), dentro de "ataque CLASES-02c r4: useFocoAlPasarAError en $nombre".
- **`enEspera=` por archivo:** el que dice el resumen y C-9 (76 en total): `tabla-clases-admin.tsx` 1, `confirmar-archivado.tsx` 1, `dialogo-borrar-clase.tsx` 1, `formulario-duplicar-clase.tsx` 1, `duplicar-clase-view.tsx` 0 y `clases-admin-view.tsx` 1.

### La matriz de avisos y recargas, contra el código y contra la del plan
Coincide celda por celda con `hooks.ts`, `clases-admin-view.tsx`, `tabla-clases-admin.tsx`, `confirmar-archivado.tsx`, `dialogo-borrar-clase.tsx` y `formulario-duplicar-clase.tsx`. También coincide con la matriz del plan, incluidas sus dos celdas "como hoy" (Enmienda 9).

- **Lista y «Cargar más clases».**
  - El `400` del cursor y el `5xx` reemplazan el contenido con `MensajeError`, con retornos tempranos por caso: predicado `esErrorDeCursor` y textos de `data.ts`, como pide O-01c-15. No hay aviso.
  - `useFocoAlPasarAError` recibe la llave por estado (`claveClasesAdmin(estado).join("/")`, O-01c-6).
  - El control segmentado queda fuera de `contenido()`, así que sigue en pantalla con la lista en error.
- **Archivar y restaurar.**
  - Los avisos viven en el gancho, uno por intento. No avisan de un error con que `apiClient` redirige.
  - `renovarTrasGestionar` corre en el `onSuccess` y en los `409`/`SIN_ACCESO_A_LA_CLASE` (`esCambioDeLaClaseEnGestion`). Renueva el prefijo `CLAVE_CLASES_ADMIN`, `invalidarListasDeClases` y el detalle (`exact`), sin `claveClasesAnteriores` (E10-6).
  - La mutación sigue pendiente hasta que la lista renovada llega. Así `enEspera` cubre la ventana, y el foco lo decide `useFocoAlQuitarUnaClase`, que lee la fila con foco.
- **Conteo.** `staleTime` y `gcTime` en 0, y `removeQueries` al cerrar.
  - `CLASE_NO_ARCHIVADA` muestra el texto del servidor (`mensajeDeConsultaClases`). Cualquier otro error muestra `TEXTOS_BORRAR_CLASE.errorConteo`.
  - Sin `conteo.data`, no se pinta «Sí, borrar definitivamente».
- **Borrado.**
  - El error va en el `MensajeError` del diálogo, sin aviso. Con el diálogo desmontado avisa el gancho (`useMontado`).
  - El éxito avisa desde el gancho y renueva las listas.
  - `reset()` sin condición, en `cerrar()`.
- **Duplicar.**
  - `alFallar` sigue el orden de la matriz: redirige, `MAESTRO_NO_ENCONTRADO` en el selector, campo pintado, y aviso con los errores de campo limpios.
  - En el éxito, el aviso y `navigate` los hace el formulario montado; el gancho avisa solo si el formulario ya no está.
- **«Descargar».** `ARCHIVO_EN_COPIA` entra en `MENSAJES_POR_CODIGO_DE_ARCHIVO` y no cambia nada más.
- **"En vuelo a la vez" y "con la vista desmontada".**
  - Cada fila tiene su mutación de restaurar y su ref.
  - El diálogo es modal (la página queda inerte).
  - Archivar y restaurar avisan también desmontados. El borrado avisa su error solo sin el diálogo. Las listas en error salen de la caché al desmontarse (`useRecuperarListaDeClasesAdmin`).
- **Comprobación extra del foco tras borrar desde el diálogo.** ADM-1C04 solo borra la primera fila, y en ese caso "vecina" e "índice 0" coinciden. Por eso corrí una sonda propia, fuera del repositorio y sin tocar el árbol: borrar la primera, la de en medio y la última de `[5, 6, 7]`. El foco quedó en el «Borrar definitivamente» de 6, 7 y 6, respectivamente: 3 de 3, como pide §7.14.

### Textos (§D-12 y Enmienda 10)
- El título del diálogo es exactamente `Borrar definitivamente «{nombre}»` (`TEXTOS_BORRAR_CLASE.titulo`), sin comillas exteriores. ADM-1C04b lo compara por `textContent`.
- «Estado de las clases» va como `aria-label={TEXTOS_CLASES_ADMIN.estadoDeLasClases}` en el `role="group"`, sin rótulo visible.
- El aviso de duplicado sale siempre, con el texto aprobado, desde el formulario montado o desde el gancho, nunca desde los dos.
- Los demás coinciden carácter por carácter con §D-12:
  - la consecuencia, con singulares y ceros;
  - la confirmación de archivar;
  - "Aún no hay clases archivadas";
  - los tres avisos;
  - la frase del conteo;
  - "Archivada".
- Ningún texto nuevo es "Crear clase" ni "Editar clase" (O-01c-8). Sin emojis.

### E10-2
`MENSAJES_POR_CODIGO_DE_CLASES` no gana ningún código fijo propio: `ARCHIVO_EN_COPIA` llega solo por el mapa que esparce, como pide §D-10. `features/tareas/data.ts` y `features/admin/` no están en el diff. Los cinco códigos nuevos van a `CODIGOS_CON_MENSAJE_DEL_SERVIDOR`, como fija la lista cerrada (`:84`, de 15 a 20).

### Decisiones donde el plan calla
Las once son aceptables. Comento las que pidió el orquestador y las que tienen consecuencia.
- **Foco al cancelar el diálogo, de vuelta a «Borrar definitivamente»** (`useFocoAlCerrarElBorrado`, con `onCloseAutoFocus` prevenido): cumple §7.11 ("el foco vuelve al botón que lo abrió") y §7.14. Sin `DialogTrigger`, Radix lo dejaría en `<body>`. ADM-1C09 lo comprueba.
- **El diálogo no se cierra con el borrado en vuelo:** correcto. El `DELETE` no se puede cancelar. Si el diálogo se cerrara, su error se perdería o saldría como aviso, en contra de la matriz ("en el diálogo, sin aviso"). Escape y el velo no hacen nada mientras tanto. Detalle abajo: «Cancelar» tampoco responde, sin decir por qué.
- **Recargas solo de las listas en error y su salida de la caché al desmontar:** correcto, y mejor que "marcar vieja" (§D-11, Enmienda 1).
  - `invalidateQueries` sobre una consulta infinita vuelve a pedir cada página con su `pageParam` guardado, así que repetiría el cursor vencido.
  - `resetQueries` y `removeQueries` empiezan desde la primera página, sin cursor ni posición, que es lo que prometen ADM-1C07, 1C12 y 1C16 (c).
  - Una lista sana no se vuelve a pedir, así que las pruebas que cuentan peticiones no cambian.
  - Cumple la regla de frases de recuperación de `AGENTS.md` por cada camino probado.
- **El detalle se renueva al archivar o restaurar** (`exact`): correcto y barato. Es lo que leerá el aviso de clase archivada de 01d1 cuando el admin entre a la clase, y no toca `claveClasesAnteriores` (E10-6).
- **Renovar también ante `SIN_ACCESO_A_LA_CLASE` al archivar o restaurar:** correcto (otra pestaña la borró). La analogía no se extendió al conteo ni al borrado: ver N-01c-1.
- **Nombres accesibles** (texto visible `aria-hidden` y un `sr-only` con la acción y la clase): resuelve O-01c-3, y el nombre contiene el texto visible al inicio (WCAG 2.5.3). Se aparta de la letra de §7.9 ("nunca `aria-hidden` ni `aria-label`"): ver N-01c-3.
- **`noSeEncontroElMaestro`**: el cambio de nombre por `estatico-02c-r1:63` es legítimo y no tocó pruebas.

### O-01c-1 a O-01c-15
Todas atendidas.

| Obs. | Qué comprobé |
|---|---|
| O-01c-1 | Cifras por archivo como C-9. Sin `disabled`, `aria-busy` ni `aria-disabled` en los archivos nuevos. El diálogo no tiene «Reintentar» |
| O-01c-2 | Solo clases de la escala propia: `text-small`, `rounded-card`, `rounded-row`, `bg-surface`, `in-data-[material=opaco]:bg-accent-soft`, `aria-pressed:text-link`, `w-1/2` y `translate-x-full`. Sin texto rojo ni corchetes nuevos (el grep de colores y medidas sueltas dio vacío) |
| O-01c-3 | Ver la decisión de los nombres accesibles |
| O-01c-4 | «Abrir» es el primer enlace de la fila. Se conserva `data-clase-id` |
| O-01c-5 | "Como hoy" |
| O-01c-6 | `CLAVE_CLASES_ADMIN` conserva `["clases", "admin"]`. Hay una clave por estado y la llave del foco va por estado |
| O-01c-7 | No escribe `?estado=` al montar. `setParametros` agrega al historial. La URL es `estado=activas&limite=50` |
| O-01c-8 | "Crear clase" sigue en la vista. Sin `perspectivaDeRuta(` |
| O-01c-9 | `CursorDeClasesAdmin` y `AccionDeFilaDeClase` están en `types.ts`. Quedan tipos de objeto en línea (detalle) |
| O-01c-10 | Sin `?? []` y sin ternarios anidados en JSX |
| O-01c-11 | Los cinco códigos están en la lista. Sin `.message`, sin `if (m.isError) m.reset()` y sin redefinir `esErrorDeCursor` |
| O-01c-12 | `lib/unir-paginas.ts`: puro, sin `@/features/`, `.message`, `?? []` ni `console.` |
| O-01c-13 | En `components/adjuntos/data.ts` solo cambian el comentario y la línea |
| O-01c-14 | Sin `forceMount`. `Dialog` y sus atributos solo en `dialogo-borrar-clase.tsx`, y la tabla no importa `components/ui/dialog`. La confirmación en línea no lleva atributos. ADM-1C09 cuenta 0 elementos con contexto mientras el diálogo está cerrado (la vista va sin `ContenedorRol`) |
| O-01c-15 | Predicados en `lib.ts` (`esClaseNoArchivada`, `noSeEncontroElMaestro`, `esCambioDeLaClaseEnGestion`) y textos en `data.ts` |

### "No se toca" y lista cerrada, contra `52f1c97`
- `git diff --name-only 52f1c97 -- backend shared infra AGENTS.md CLAUDE.md .claude docs/DESIGN.md docs/ESTADO.md docs/PRD.md docs/ARCHITECTURE.md docs/ARCHITECTURE-ESSENTIALS.md` sale vacío.
- En `frontend/` cambian 13 archivos rastreados y hay 8 sin rastrear. Todos son de "Se toca" de 01c (con `lib/unir-paginas.ts` y su prueba), pruebas nuevas del encargo, la lista cerrada o las dos `*.ataque` de C-9 a C-9d.
- `services/clasesService.ts` y `encabezado-clase.tsx` no se tocan.
- **Lista cerrada, por `git diff -U0`:**
  - `clases-admin-view.test.tsx` cambia solo en `:165`;
  - `errores-ch3.test.ts` cambia solo en las dos líneas de CH3-B01, `:84` (15 → 20) y CH3-B15 (1) a (3), exactas;
  - `reexportaciones-01c.test.ts` cambia solo en `ARCHIVO_EN_COPIA` en `:139-145` y en el comentario «cinco códigos».
- La vigilada `clases-admin-view.test.tsx:104-127` no cambia.
- Fuera de los paquetes solo cambian archivos de `docs/trabajo/ADMIN-01-administracion/`. El archivo sin rastrear `docs/trabajo/DEPLOY-investigacion-vps.md` es ajeno al encargo.

### `docs/DESIGN.md`: el patrón nuevo va al cierre (A-04)
Lo confirmo.
- `AGENTS.md` pide documentar todo patrón visual nuevo "en ese mismo encargo", y el encargo es ADMIN-01, no la subentrega.
- El plan lo fija así: §D-R0 01c ("`docs/DESIGN.md` no (va al cierre)"), A-04 y el paso 31.
- Lo verifico en la revisión final del encargo, no en la de 01c.
- Para que A-04 no se quede corto, debe recoger, además de su lista:
  - el control segmentado de dos opciones en contexto opaco, el primero de dos opciones de un admin;
  - las acciones de la fila y la columna "Archivada";
  - la confirmación en línea de archivar;
  - el diálogo con conteo y contexto propio en el portal (`data-material` y `data-densidad` en el `DialogContent`), primer diálogo del admin;
  - el foco devuelto al botón que abrió un diálogo sin `DialogTrigger`;
  - la variante de nombre accesible de N-01c-3, o la decisión contraria.

### Problemas que no bloquean (para el tester, después de aceptar)
- **N-01c-1 — Una clase que ya no existe, en el diálogo de borrar.** Con una sola cuenta de administrador, solo pasa desde otra pestaña.
  - El admin recibe `403 SIN_ACCESO_A_LA_CLASE` también por una clase inexistente (`middleware/index.test.ts`, PR-2A06). Con la clase borrada en otra pestaña:
    - el conteo muestra "No pudimos contar lo que se borraría. Cierra y vuelve a intentarlo.", que no se puede cumplir;
    - el `DELETE` deja el error en el diálogo y la fila sigue en la tabla.
  - Lo mismo con `409 CLASE_NO_ARCHIVADA` en el `DELETE`: el plan no pide renovar, y la matriz del plan lo dice así.
  - Hay salida: «Restaurar» de esa fila renueva la lista (decisión 3). Pero la frase del conteo promete otra cosa.
  - Es el hermano de la decisión 3 que no se extendió. Si el tester lo confirma, el remedio natural es el mismo: renovar las listas ante `esCambioDeLaClaseEnGestion` en el conteo y en el borrado.
- **N-01c-2 — El conteo se vuelve a pedir con el diálogo abierto.** Con `staleTime` 0 y `refetchOnWindowFocus` por defecto, volver a la ventana pide el conteo otra vez.
  - Si esa recarga falla con datos ya pintados, el diálogo muestra a la vez el `MensajeError` y «Sí, borrar definitivamente» (`conteo.data` sigue definido). Con el reintento de la app, eso pasa después de dos fallos.
  - Si responde, la cifra puede cambiar mientras la persona la lee.
- **N-01c-3 — El nombre accesible de las acciones de la fila.** El texto visible va con `aria-hidden` y el `sr-only` lleva "Archivar Clase 1". La línea de §7.9 (arbitraje de T-10) dice "como texto `sr-only` dentro del botón (nunca `aria-hidden` ni `aria-label`)".
  - Funciona y cumple 2.5.3. Hay un precedente sin `aria-hidden` que también resuelve O-01c-3: `textoOcultoDeFila` de `tabla-enlaces.tsx`, un `sr-only` que no es solo el dato.
  - No bloquea. Se decide al cierre, en A-04: se documenta la variante o se cambia.

### Detalles menores
- **Tipos de objeto en línea** fuera de `types.ts`, en contra de la regla 1 de `CLAUDE.md`. Las pruebas estáticas no los ven porque solo buscan `type` e `interface`:
  - `useRef<{ id: string; accion: AccionDeFilaDeClase } | null>` en `hooks.ts`;
  - el parámetro `partes` de `TEXTOS_BORRAR_CLASE.consecuencia` y `ESTADOS_DE_LA_LISTA` en `data.ts`;
  - `unidad` de `cantidadCon` en `lib.ts`.
  Destino: el programador de 01d1, que vuelve a tocar esos archivos, o el carril trivial al cierre.
- **«Cancelar» del diálogo no responde mientras el borrado está en vuelo**, y no dice por qué. No puede usar `aria-disabled` (V-06). Basta con que el tester confirme que el foco no se pierde.
- **`aria-describedby={undefined}` en el diálogo:** la consecuencia ("… No se puede deshacer.") no se anuncia como descripción al entrar. Lo anoto para A-04 y H-4. El conteo llega después, así que no se arregla solo con un `DialogDescription`.
- El título de ADM-1C04b escribe «Borrar definitivamente «{nombre}»» entre comillas exteriores. Su aserción es correcta, sin comillas.
- La columna usa `TEXTOS_CLASES_ADMIN.archivada`, fuera de `columnas.*`.
- El resumen admite corridas sin repetir la puerta de carga. Salieron en verde y no se reportan como cifras.

### Puntos de ataque para el tester (cuando el resumen quede aceptado)
1. **N-01c-1:** el conteo y el `DELETE` con `403 SIN_ACCESO_A_LA_CLASE` y con `409 CLASE_NO_ARCHIVADA` (la clase borrada o restaurada en otra pestaña). ¿Se cumple la frase "Cierra y vuelve a intentarlo"? ¿La fila queda para siempre?
2. **N-01c-2:** un evento `focus` de la ventana con el diálogo abierto: recarga del conteo que falla con datos pintados (¿error y botón a la vez?) y recarga que responde otra cifra.
3. **El foco tras borrar desde el diálogo**, en estados vecinos:
   - fila de en medio y última, con varias páginas cargadas;
   - la última fila de la lista, que debe ir al `h1`;
   - una fila repetida descartada por `unirPaginasSinRepetidas`;
   - cerrar con Escape;
   - la vista desmontada con el `DELETE` en vuelo (el botón atrás del navegador).
4. **Cambiar de pestaña con una mutación en vuelo:** «Restaurar» o «Sí, archivar» pendiente y clic en la otra pestaña. Un solo aviso, sin foco en `<body>`, y la fila no reaparece.
5. **`useRecuperarListaDeClasesAdmin`:**
   - error en las dos pestañas a la vez, y salir y volver: deben salir las dos de la caché;
   - error de "Cargar más" con páginas en la caché: `removeQueries` las tira y la lista vuelve desde la primera;
   - el doble montaje de `StrictMode` no debe quitar una lista sana.
6. **El control segmentado:**
   - pulsar la pestaña activa no escribe en el historial;
   - `?estado=` con un valor inválido da "Activas" sin reescribir la URL;
   - el estado no depende solo del color: `Check`, `aria-pressed` y texto `--link`.
7. **Duplicar:**
   - la ruta con una clase archivada y con una inexistente;
   - dos envíos con Enter;
   - `MAESTRO_NO_ENCONTRADO` seguido de elegir otro maestro: el error del selector se limpia;
   - aviso único con la vista desmontada antes de responder.
8. **Nombres accesibles (N-01c-3):** cada botón de la fila y de la confirmación, por `getByRole(name)`, con nombres hostiles (los de `clases-admin-02c-r1:249-285`).

### Para el humano
Nada que decidir en esta verificación. N-01c-3 (el patrón del nombre accesible) se decide al cierre, con A-04.

### Cierre
**DEVUELTO** por M-01: la corrida acotada de E10-1 da `Tests 42 passed (42)`, no 38.
- Solo corrige el resumen. Las demás cifras coinciden con mi corrida: lint, build, `2456` en `133` archivos, 78 casos (51, 22 y 5) y V-01 256.
- Mapeo, rojos esperados, matriz, textos, E10-2, decisiones, O-01c-1 a O-01c-15 y "No se toca": bien.
- Cuando el programador traiga la cifra corregida sobre la misma huella (`6eb27b0a…`), repito solo la acotada. Con eso, ACEPTADO, y el tester ataca con los puntos de arriba.

### Re-verificación de M-01
- **Resumen corregido:** `resumen-programador.md` tiene 954 líneas, SHA-256 `303996f6baf5e99c99a9d5c2846f6eb8df6461cba00f9347e9ee6dca437a8e0b` (el orquestador dio el mismo). La viñeta "Corrida acotada de E10-1" (línea 800) ahora trae:
  - el comando literal;
  - la puerta de carga (3 % y 0 %);
  - `Test Files 3 passed (3)` y `Tests 42 passed (42)`, de las 15:52:47;
  - la causa: los cuatro casos de CH3-B15 en modo `duplicar`.
  Coincide con lo que encontré.
- **Huella del árbol entregado:** sigue en `6eb27b0a1a0dd3b82060cd52771a695d4633642fba53402799b593e2c9045a94`. El código y las pruebas no cambiaron, así que el resto de esta verificación sigue valiendo.
- **Mi corrida:** la puerta de carga dio 20 % y 17 % (15:53:30 y 15:53:32), sin ningún `vitest`. Desde `frontend/`, `npx vitest run src/features/clases/errores-ch3.test.ts src/features/clases/reexportaciones-01c.test.ts src/components/adjuntos/errores-ch3.test.ts` dio `Test Files 3 passed (3)` · `Tests 42 passed (42)` (15:53:34). **Coincide.**
- **Veredicto final: ACEPTADO.** M-01 queda cerrado. El tester ataca con los ocho puntos de "Puntos de ataque para el tester" de arriba (N-01c-1, N-01c-2, foco tras borrar en estados vecinos, cambio de pestaña con mutación en vuelo, `useRecuperarListaDeClasesAdmin`, control segmentado, duplicar y nombres accesibles por N-01c-3). N-01c-3 y los detalles menores siguen con el destino que dice arriba.

## Verificación de la corrección de la ronda 1 — ADMIN-01c

Veredicto: **ACEPTADO** tras la corrección de M-02 (ver "Re-verificación de M-02" al final de esta sección). Primero salió DEVUELTO por M-02. El remedio del foco del hermano de T-01 lleva el foco a la primera fila, no a la vecina, aunque la matriz del resumen dice "la fila vecina". T-01, T-02 y T-03 están bien corregidos, y las cifras coinciden.

- **Documentos:**
  - `resumen-programador.md` = `3615a7b0…`, sección "ADMIN-01c — Corrección ronda 1" (línea 956);
  - `reporte-tester.md` = `e380be6e…`, "Ronda 1 — ADMIN-01c" (línea 1902);
  - plan `3822b6c0…`, comprobado.
- **Entorno:**
  - Puerta de carga: 20 % y 15 % a las 16:23:06, sin ningún `vitest`. Antes hubo lecturas de 26 % a 31 %, y esperé.
  - Una cosa a la vez. Sin navegadores; la otra copia de trabajo no se usa.
- **Huella del árbol entregado** (`git diff 52f1c97 -- frontend` más los archivos sin rastrear): `64cb69e32c324a2d9c15e6785202da6dae13ab8b729e62a2f3652e6e95fcb0ca`.

### Cifras (desde `frontend/`)
| Qué | Resumen | Mi corrida |
|---|---|---|
| `npm run lint` | exit 0, Prettier bien, `> tsc -b` | Igual |
| `npm run build` | exit 0, `✓ built in 887ms` | exit 0, `✓ built in 875ms` |
| Suite de módulos (comando literal) | `134 passed (134)` · `2482 passed (2482)` | **Igual** (16:23:17, 138 s): 2456 + 23 del tester + 3 propios. Sin avisos de claves repetidas ni de `act` |
| `npx vitest list` del archivo propio | 54 (78 + 3 en los tres archivos) | **Igual:** `clases-admin-01c.test.tsx` 54, `-rutas` 22, `unir-paginas` 5 (81). La del tester: 23 |
| V-01 | 257 | **Igual:** `sha256sum -c` de `ac79306a…` da 0 diferencias, y la nueva `clases-admin-01c-r1.ataque.test.tsx` es `1cc30b08…`, la del tester. 257 en total. El programador no tocó ninguna |
| "No se toca" contra `52f1c97` | Limpio | **Limpio:** el diff fuera de `frontend/` es vacío. Los archivos de producción de esta ronda son de "Se toca" de 01c. La lista cerrada conserva las mismas 15 líneas de antes. Las tres pruebas nuevas van en el archivo propio |

### M-02 — Al cerrar el diálogo cuando su fila ya salió, el foco va a la primera fila, no a la vecina
- **Dónde:** `clases-admin-view.tsx`, en `alCerrarElBorrado`, que llama a `marcarBorrada(id)`; y en `useFocoAlQuitarUnaClase` (`hooks.ts`), que calcula la vecina con `previos.indexOf(objetivo.id)`.
- **Lo que pasa:**
  - Con T-01, la fila sale de la lista cuando falla el conteo (o el `DELETE` con `403`) **con el diálogo todavía abierto**.
  - Al cerrar, varios renders después, `idsPrevios` ya no contiene ese `id`. `indexOf` da −1, que se acota a 0, y el foco va a la **primera** fila.
  - Tras un borrado con éxito no pasa (mi sonda de la verificación anterior): ahí la salida de la fila y `onBorrada` caen en el mismo lote.
- **Comprobado con una sonda** fuera del repositorio, sin tocar el árbol. Lista `[5, 6, 7]`; el conteo de una de ellas responde `403` y el servidor la quita; después, «Cancelar»:

  | Fila | Foco obtenido | Foco esperado |
  |---|---|---|
  | Clase 5 | «Borrar definitivamente» de 6 | 6 |
  | Clase 6 | 5 | 7 |
  | Clase 7 | 5 | 6 |

  Dos de tres fallan.
  - La prueba propia "hermano de T-01: al cerrar el diálogo cuando su fila ya salió…" borra la primera de `[5, 6]`, donde la vecina y el índice 0 coinciden. Es el mismo punto ciego que tenía ADM-1C04.
  - El `DELETE` con `403` (T-01) toma el mismo camino, porque también renueva con el diálogo abierto.
- **Por qué importa:**
  - `DESIGN.md` §7.14: "va al mismo control de la fila que ocupa su lugar (la siguiente o, si era la última, la anterior)".
  - La matriz del resumen promete "al cerrar, la fila vecina si la fila ya salió", y el código no lo hace.
  - `.claude/agents/manager.md`, punto 4: lo que el resumen dice de cada estado vecino tiene que coincidir con el código. El foco nunca cae en `<body>`, pero va a otra fila.
- **Qué se espera:**
  - Al cerrar el diálogo de una fila que ya salió, el foco va al «Borrar definitivamente» de la fila que ocupa su lugar: la siguiente o, si era la última, la anterior. Si no queda ninguna, al `h1`.
  - Vale para los dos caminos: el conteo con `403` o con `409 CLASE_NO_ARCHIVADA`, y el `DELETE` con `403`.
  - Casos para la primera, una de en medio y la última fila, y para la lista que queda vacía.
  - En el resumen, los hermanos y estados vecinos: cerrar con Escape y con «Cancelar»; varias páginas cargadas; la fila que sale por el conteo que se vuelve a pedir al reconectar (T-03).

### T-01, T-02 y T-03: el remedio, contra el código

#### T-01: bien
- **El conteo.** Ante `esCambioDeLaClaseEnGestion`, `useConteoDeBorrado` renueva las listas y el detalle (`exact`) y relanza el error.
  - La fila sale de la lista y la frase "Cierra y vuelve a intentarlo" se cumple por cada camino:
    - al cerrar;
    - al pulsar «Clases» o cambiar de pestaña, con la lista ya renovada;
    - al ir y volver.
  - Ya no queda un ciclo sin salida.
- **El borrado.** `useBorrarClase` renueva ante `403` (`esClaseQueYaNoExiste`).
- **El `409 CLASE_NO_ARCHIVADA` del `DELETE` sigue la matriz del plan:** el mensaje va en el diálogo y no se renueva; lo prueba "matriz de 01c: …". Hay salida: al reabrir, el conteo da el mismo `409` y renueva. Es correcto no apartarse de la matriz aprobada.
- **Detalles:**
  - El efecto vive en el `queryFn`. Con el `retry: 1` de `app/providers.tsx`, un `403` del conteo pide y renueva dos veces. Es inocuo.
  - Con un `403`, la frase "vuelve a intentarlo" sobra, porque la clase ya no existe. Un texto propio sería un texto nuevo que tiene que aprobar el humano; no lo pido como cambio.

#### T-02: bien
- **El remedio:** una `mutationKey` por clase (`claveGestionDeClase`) y `useGestionEnVuelo`, que lee `useIsMutating` y `queryClient.isMutating`.
- **Sobrevive al desmontaje.** La mutación sigue pendiente en la `MutationCache` hasta que termina su `onSuccess` o su `onError`, renovación incluida. La espera dura hasta que la fila sale.
- **Evita el segundo `POST`** por cada camino de la misma sesión:
  - cambiar de pestaña (ADM-T1C06 y 08);
  - «Cancelar» (07);
  - salir de la vista y volver (el `QueryClient` es el mismo);
  - el doble clic (la ref).
- **Lo que el cliente no puede evitar:** otra pestaña del navegador, con otra caché. Ahí el servidor responde `409` y la lista se renueva, que es lo correcto.
- **Cumple `CLAUDE.md`:** `enEspera={…isPending || enVuelo}` y una guarda síncrona (la ref más `sigueEnVuelo()`) antes de `mutate`.
- **Para 01d1:** «Restaurar» del aviso de la clase archivada debe usar `useRestaurarClase(claseId)`, con la misma `mutationKey`. Así se cubre "«Restaurar» desde el aviso y desde la tabla" de N-15 (Enmienda 2).

#### «Cancelar» de la confirmación con archivar en vuelo
No cierra y no se pone en espera.
- **Cumple la regla de `disabled` contra `enEspera`.** Esa regla es para el control cuya petición está en vuelo, y «Cancelar» no tiene petición. Ponerlo en `enEspera` diría algo falso ("se está cancelando"). Además, `disabled` lo prohíbe V-06 en JSX.
- **`DESIGN.md` §7.14 no cubre el caso.** La decisión es la misma que la del diálogo de borrar, que el tester dio por buena (ADM-T1C04).
- **¿Debe comunicar por qué no responde?** Sería mejor, pero hoy no es obligatorio:
  - el botón de al lado anuncia la espera, con `aria-busy` y su indicador;
  - el aviso cierra el ciclo en segundos;
  - el foco nunca se pierde.
- **No bloquea.** Va a A-04 como parte del patrón (confirmación en línea y diálogo con una acción en vuelo), con tres opciones que decide el humano al cierre:
  - dejarlo así;
  - ocultar «Cancelar» en vuelo cuando no tiene el foco;
  - un texto de estado.
- **Un detalle vecino:** si se vuelve a «Activas» con archivar en vuelo, la fila se monta otra vez con «Archivar», sin la confirmación abierta y sin indicar la espera, hasta que se abre la confirmación. No manda otra petición: aceptable.

#### T-03: bien
- `conteoFallo = conteo.isError && !borrar.isPending`: el error sustituye al conteo y al botón. Nunca se ven a la vez la frase y «Sí, borrar definitivamente».
- Con el borrado en vuelo, el conteo confirmado se queda. Así el botón en espera no desaparece con el foco dentro. Correcto.
- **Estado vecino que queda:** al reconectar con el `DELETE` en vuelo, el conteo falla; después el `DELETE` falla (`5xx`).
  - El diálogo muestra dos `MensajeError`: el del conteo y el del borrado.
  - El botón desaparece con el foco dentro, y Radix lo devuelve al contenido del diálogo, nunca a `<body>`.
  - Son dos fallos encadenados: va a la ronda 2.

### Hermanos y matriz actualizada
- **La tabla de hermanos coincide con el código en lo que afirma, salvo el foco de M-02.**
  - El remedio de T-01: archivar y restaurar ya lo tenían; se suman el conteo y el borrado (este, solo ante `403`).
  - El remedio de T-02: archivar y restaurar. No aplica al borrado, porque el diálogo es modal y no se cierra en vuelo. Tampoco a duplicar: un formulario nuevo es otra copia.
  - El remedio de T-03: solo el conteo.
- **Los estados vecinos coinciden** (vista desmontada, cambio de pestaña, `403`, `409`, `5xx` y reconexión), salvo "al cerrar, la fila vecina".
- **La matriz actualizada** (cuatro filas) coincide con el código, salvo la columna de foco de las dos filas que dicen "al cerrar, la fila vecina" (M-02).
- **Corrijo una afirmación mía de la verificación anterior.** El tester tiene razón: `invalidateQueries` sobre una consulta infinita no repite el cursor vencido. TanStack Query 5 vuelve a pedir desde el primer `pageParam` y recalcula los siguientes con las páginas nuevas. La decisión de usar `resetQueries` y `removeQueries` sigue siendo buena, porque empieza desde una sola página, pero no por la razón que di.

### Puntos de ataque para la ronda 2 (cuando se corrija M-02)
1. **M-02:** el foco al cerrar con la fila ya fuera:
   - en la primera, en una de en medio y en la última fila;
   - con varias páginas cargadas;
   - cerrando con Escape;
   - con el `DELETE` que responde `403`.
2. **El estado vecino de T-03:** reconexión con el `DELETE` en vuelo, con el conteo que falla y el `DELETE` que falla después.
3. **T-02 con dos acciones sobre la misma clase:**
   - «Restaurar» en vuelo y, a la vez, «Borrar definitivamente» de esa clase: el diálogo pide el conteo de una clase que está saliendo.
   - Archivar en vuelo, cambio de pestaña y regreso: un solo aviso, y dónde queda el foco cuando sale la fila.
4. **El conteo con `403` y `retry: 1`:** un solo mensaje. Las dos renovaciones no deben causar parpadeos ni mover el foco.
5. **`useGestionEnVuelo` después de un error:** archivar responde `5xx`; luego «Cancelar» y «Sí, archivar» deben volver a responder, porque la mutación ya no está pendiente.

### Cierre
**DEVUELTO** por M-02, en la ronda de corrección 1 de 3.
- Las cifras coinciden con mi corrida:
  - lint;
  - build;
  - `2482` en `134` archivos;
  - 54 casos (81 con los otros dos archivos, más 23 del tester);
  - V-01 257.
- T-01, T-02 y T-03 están bien corregidos, y "No se toca" está limpio.
- Lo que falta: el foco del hermano de T-01 va a la primera fila en vez de la vecina, en dos de tres posiciones de mi sonda.
- **Para el humano:**
  - No hay nada nuevo que decidir. El comportamiento de «Cancelar» con una acción en vuelo va con A-04 al cierre.
  - M-02 es un estado vecino del mismo mecanismo (el foco al quitar una fila). Para la medida de "hermanos" de `AGENTS.md`, el orquestador decide si cuenta como ronda extra por hermanos.

### Re-verificación de M-02
- **Resumen:** `resumen-programador.md` = `72fd6be2…`, subsección "### M-02" (línea 1030).
- **Archivos que cambiaron desde la huella `64cb69e3…`:** solo `frontend/src/features/clases/hooks.ts` y `frontend/src/features/clases/clases-admin-01c.test.tsx`.
  - Lo comprobé con `find -newermt` desde el cierre de mi verificación anterior, sobre `frontend`, `backend`, `shared` e `infra`.
  - La lista de cambios contra `52f1c97` sigue teniendo las mismas 22 entradas.
  - Huella nueva: `3203493e0940aa3a6f4eb7811dab2683a3fd8f95a3b133fc50934be6b940cfdd`.
- **Entorno:** puerta de carga de 10 % y 10 % (16:41:26), sin ningún `vitest`. Una corrida a la vez. Sin navegadores.

| Qué | Resumen | Mi corrida |
|---|---|---|
| `npm run lint` | exit 0 | exit 0; Prettier bien; `> tsc -b` sin errores |
| `npm run build` | exit 0, `✓ built in 866ms` | exit 0, `✓ built in 794ms` |
| Suite de módulos (comando literal) | `134 passed (134)` · `2497 passed (2497)` | **Igual** (16:41:34, 136 s), sin avisos de claves repetidas ni de `act` |
| `npx vitest list clases-admin-01c.test.tsx`, `grep -a -c "M-02"` | 15 | **15** (69 casos en el archivo) |
| V-01 | 257 | **257**: `sha256sum -c` de `ac79306a…` da 0 diferencias, y la del tester sigue en `1cc30b08…` |
| "No se toca" | Limpio | Limpio: fuera de `frontend/` no hay nada |

- **Mi sonda, repetida fuera del repositorio:** 9 de 9.
  - Lista `[5, 6, 7]`, por los dos caminos (conteo con `403` y `DELETE` con `403`), cerrando con «Cancelar»: el foco va a 6, 7 y 6, en la primera, la de en medio y la última. Son los 6 casos que antes fallaban en 2 de 3.
  - Los 3 del borrado con éxito siguen bien.
- **El remedio contra el código.** `ultimoLugar` (un `Map` de `id` a índice) se actualiza con los `ids` de cada render. Lee el lugar del objetivo **antes** de actualizar y borra la entrada al usarla.
  - **Varias páginas:** los `ids` son la unión sin repetidos de todas las páginas, así que el índice es el de la lista que se ve. Lo prueba "con dos páginas cargadas…".
  - **Cambio de pestaña:** el mapa conserva entradas de la otra pestaña, pero no dejan un lugar viejo.
    - Una fila solo llega a ser objetivo si está en la lista visible cuando gana el foco o se abre su diálogo. En ese render, su entrada se reescribe.
    - El diálogo es modal: con él abierto no se puede cambiar de pestaña.
    - Los `id` son UUID, así que una clase de otra pestaña no choca con una fila de esta.
    - Cuando una clase pasa de «Activas» a «Archivadas», su entrada se borra al salir como objetivo, o se reescribe al aparecer.
  - **Aproximación aceptable:** si, con el diálogo abierto, salen otras filas además de la del diálogo, el lugar guardado es el de la última vez que se vio la fila. El foco cae en la fila que hoy ocupa ese índice, nunca en `<body>`, y como máximo se corre un lugar.
  - El `?? 0` solo aplica a un objetivo que nunca se vio, lo que no puede pasar con el diálogo montado dentro de la vista.
- **Hermanos y estados vecinos:** la tabla del resumen coincide con el código, fila por fila.
  - Pasan por el mismo gancho:
    - cerrar con «Cancelar» y con Escape (el mismo `onCerrar`);
    - el conteo con `403` o `409`;
    - el `DELETE` con `403`;
    - la lista vacía;
    - varias páginas;
    - la reconexión con el foco en la fila;
    - borrar, restaurar y archivar con éxito;
    - el `409` de archivar y restaurar.
  - No aplica: cerrar sin que la fila haya salido (`useFocoAlCerrarElBorrado`), ni la lista en error o el cambio de pestaña (sin `ids`, manda `useFocoAlPasarAError`).
  - Los 15 casos cubren la primera fila, la de en medio y la última por los tres caminos. El programador demostró que detectan el defecto: con el cálculo viejo, 11 de 15 fallan.
- **La matriz** (columna de foco de las filas del conteo `403`/`409` y del `DELETE` `403`) ahora coincide con el código.

### Veredicto final de esta sección
**ACEPTADO.** M-02 cerrado, con T-01, T-02 y T-03 corregidos.

Las cifras coinciden:

| Qué | Resultado |
|---|---|
| lint y build | 0 |
| Suite de módulos | `2497` casos en `134` archivos |
| Casos de M-02 | 15 |
| V-01 | 257 |

Lo que no bloquea sigue con el destino ya anotado:
- «Cancelar» con una acción en vuelo, y N-01c-3, van a A-04 al cierre.
- Para 01d1, la misma `mutationKey` en «Restaurar» del aviso.
- El doble pedido del conteo con `retry: 1`.

**Puntos de ataque para la ronda 2:**
1. **El foco de M-02 en lo que no cubren los casos:**
   - con el diálogo abierto, salen dos filas a la vez: la del diálogo y otra anterior a ella;
   - una lista de una sola página después de haber cargado dos;
   - cambiar de pestaña, volver y quitar una fila: comprobar que `ultimoLugar` no use un índice de antes.
2. **El estado vecino de T-03:** reconectar con el `DELETE` en vuelo; el conteo falla y después el `DELETE` falla. Comprobar que no salgan dos `MensajeError` y adónde va el foco.
3. **Dos acciones sobre la misma clase:** «Restaurar» en vuelo y, a la vez, abrir «Borrar definitivamente» de esa clase. Archivar en vuelo, cambiar de pestaña y regresar: un solo aviso, y el foco al salir la fila.
4. **El conteo con `403` y `retry: 1`:** un solo mensaje, sin parpadeos ni foco movido por las dos renovaciones.
5. **`useGestionEnVuelo` después de un error:** archivar responde `5xx`; luego «Cancelar» y «Sí, archivar» vuelven a responder.

## Verificación de la corrección de la ronda 2 — ADMIN-01c

Veredicto: **ACEPTADO**. T-04 está bien corregido, la tabla del mecanismo coincide con el código y las cifras coinciden. Dejo tres estados vecinos para la ronda 3, la última. Ninguno bloquea.

**Lo que revisé:**
- `resumen-programador.md` = `42f1dccb…`, "ADMIN-01c — Corrección ronda 2" (línea 1093);
- `reporte-tester.md`, "Ronda 2 — ADMIN-01c" (línea 2065);
- plan `3822b6c0…`.

**Entorno:**
- La verificación anterior se cortó por el límite de la API antes de escribir aquí. Repetí todo limpio.
- Puerta de carga: 25 % y 24 % a las 19:00:14, sin ningún `vitest`. Antes hubo una lectura de 30 % y esperé.
- Una corrida a la vez. Sin navegadores.

### Cifras (desde `frontend/`)
**Archivos cambiados desde la huella `3203493e…`** (`find -newermt` desde el cierre de M-02, en `frontend`, `backend`, `shared` e `infra`):
- `components/dialogo-borrar-clase.tsx` y `clases-admin-01c.test.tsx`, del programador;
- `clases-admin-01c-r2.ataque.test.tsx`, del tester.

Nada más. Huella nueva: `ca4ee1d8bd4bbe803aa4514b76c0fa82a700d2c583b838139ac204affd4c4af6`.

| Qué | Resumen | Mi corrida |
|---|---|---|
| `npm run lint` | exit 0 | exit 0; Prettier bien; `> tsc -b` sin errores |
| `npm run build` | exit 0, `✓ built in 789ms` | exit 0, `✓ built in 1.05s` |
| Suite de módulos, comando literal | `135 passed (135)` · `2513 passed (2513)` | **Igual** (19:00:24, 150 s). Sin avisos de claves repetidas ni de `act` |
| `npx vitest list clases-admin-01c.test.tsx` con `grep -a -c "T-04"` | 8 | **8** (77 casos en el archivo) |
| V-01 | 258 | **258**: `sha256sum -c` de `ac79306a…` da 0 diferencias; `clases-admin-01c-r1` = `1cc30b08…` y `clases-admin-01c-r2` = `76b5b252…`, las del tester |
| "No se toca" | Limpio | Limpio: fuera de `frontend/` no cambia nada |

### La regla: un solo mensaje, el del último envío de la persona
Es la regla correcta y coincide con `CLAUDE.md`, "Formularios" (CHORE-03 T-05): la persona lee un solo mensaje, el del envío que acaba de hacer.
- El conteo no es un envío de la persona. Es la consulta que la prepara, y al reconectar se vuelve a pedir solo.
- Antes de pulsar, manda el conteo, porque es lo único que hay a la vista.
- Desde que pulsa, manda el borrado.

`conteoFallo = conteo.isError && borrar.isIdle` lo dice tal cual.

### La tabla del mecanismo, contra el código, combinación por combinación
Coincide en sus 17 filas.

- **`isIdle` después de `reset()` al cerrar.**
  - `cerrar()` llama a `reset()`, pero además `DialogoBorrarClase` desmonta `DialogoAbierto` al cerrar (`clase === null`), y lo vuelve a montar con `key={clase.id}`.
  - La siguiente apertura empieza con una mutación nueva, en reposo, y con el conteo fuera de la caché.
  - Está cubierto por dos lados. Lo prueban ADM-1C11 (b) y (c), ADM-1C15 (e) y "T-04: tras un error del borrado, cerrar y volver a abrir…".
- **Un `DELETE` con error seguido de un segundo intento.**
  - Durante el segundo, `isIdle` es falso y `status` es `pending`.
  - `borrar.isError` también es falso, así que **no queda a la vista el mensaje del primer intento**.
  - `conteoFallo` es falso, así que tampoco el error del conteo.
  - Se ve el conteo con el botón en espera, y el foco sigue en el botón. Al responder, sale un solo mensaje, el del segundo intento, o el diálogo se cierra con `204`.
  - Lo prueban ADM-1C04 y ADM-1C11 (a), ambos con un segundo `DELETE`.
- **`VALIDACION` fuera de contrato.**
  - Del `DELETE`: un mensaje legible (`mensajeDeErrorClases`), el conteo y el botón. ADM-1C15, con 5 casos.
  - Del conteo (consulta): no da el texto del servidor. Da la frase fija `errorConteo`, salvo `CLASE_NO_ARCHIVADA`. Es legible y es uno solo.
- **El orden de llegada.**
  - Si el conteo falla antes de que el `DELETE` responda, gana el `DELETE`: con `500`, `409`, red y `204`.
  - Si el conteo falla después del error del `DELETE`, gana el `DELETE`: con `500`, `409` y `403`.
  - Si el conteo falla antes de pulsar, gana el conteo.
  - Los ocho casos nuevos y ADM-T2C04 cubren los dos órdenes. El programador demostró que detectan el defecto: con la condición vieja, 5 de 8 fallan.
- **El foco.**
  - Con el `DELETE` en vuelo o después de su error, el botón ya no desaparece (`!conteoFallo` sigue verdadero), así que el foco no se mueve.
  - Antes de pulsar, el error del conteo quita el botón, pero el foco está en «Cancelar» (el inicial).

### Estados vecinos que no cubre la tabla (para la ronda 3)
Ninguno rompe la regla de un solo mensaje. Los dejo dichos ahora porque la ronda 3 es la última.

1. **El conteo que, después del error del `DELETE`, se vuelve a pedir y responde con otras cifras.**
   - La tabla dice que "se ve el conteo que la persona confirmó". Pero `conteo.data` se reemplaza con la respuesta nueva, y el texto cambia mientras se ve el error del borrado.
   - Sigue siendo un solo mensaje. Es una inexactitud del resumen, no un defecto: las cifras nuevas son las vigentes para el siguiente intento.
2. **El `DELETE` con un error con que `apiClient` redirige** (`401` sin refresco, `ACCESO_RESTRINGIDO` o `CAMBIO_DE_CONTRASENA_REQUERIDO`).
   - `borrar.isError` pinta un `MensajeError` en el diálogo hasta que la navegación desmonta la vista.
   - La matriz dice "Redirige: nada" para las acciones de la vista. Conviene que el tester mire si el texto llega a pintarse o a anunciarse (`role="alert"`) antes de la redirección.
3. **El conteo que, después del error del `DELETE`, responde `403`** porque otra pestaña borró la clase.
   - El conteo renueva las listas y la fila sale. Su error no se muestra, por la regla.
   - El diálogo sigue ofreciendo «Sí, borrar definitivamente» con el mensaje anterior. El siguiente intento da `403` y el mensaje "No tienes acceso…".
   - Hay salida y siempre un solo mensaje. Lo anoto para que el tester confirme el foco al cerrar (M-02).

### Puntos de ataque para la ronda 3
1. Los tres estados vecinos de arriba.
2. Los hermanos que anunció el tester: el error del conteo junto a cualquier otro mensaje del diálogo.
   - `409 CLASE_CON_COPIAS_EN_CURSO` seguido de una reconexión que falla;
   - el `403` del `DELETE` después de una reconexión;
   - dos reconexiones, una antes y otra después del error del `DELETE`.
3. Un segundo intento después de un error, con la reconexión en medio. Que el mensaje viejo no reaparezca durante el vuelo y que, al responder, quede solo el nuevo.
4. Cerrar con Escape justo cuando el `DELETE` responde con error. El diálogo debe cerrarse limpio, y al reabrir no debe quedar nada.

### Cierre
**ACEPTADO.** T-04 queda cerrado. El tester ataca la ronda 3 con los puntos de arriba.

**Detalles que siguen pendientes, con su destino:**
- «Cancelar» con una acción en vuelo y N-01c-3: A-04, al cierre.
- La misma `mutationKey` en «Restaurar» del aviso: 01d1.
- El doble pedido del conteo con `retry: 1`: inocuo.
- La lectura de §7.14 cuando salen dos filas a la vez (ADM-T2C01): A-04, para precisar la regla.

### Estados vecinos antes de la ronda 3
Veredicto: **DEVUELTO** por M-03. Uno de los diez casos nuevos falla en mi corrida, así que la cifra `2523 passed` no coincide. El código de producción está bien y cubre los tres estados vecinos y los cinco puntos de ataque.

**Qué revisé:**
- `resumen-programador.md` = `2ec5ffde…`, "### Estados vecinos antes de la ronda 3" (línea 1169).
- **Archivos cambiados desde la huella `ca4ee1d8…`:** solo `components/dialogo-borrar-clase.tsx` (19:09:41) y `clases-admin-01c.test.tsx` (19:07:52), por `find -newermt`. Los dos son anteriores a la corrida del programador (19:12:57). Huella nueva: `ddb3f7238121a1d1db4f28a67380028e920e48b01cb76b6c79cf0e6ca3b97012`.
- **Puerta de carga:** hubo lecturas de 27 %, 74 % y 29 %. Esperé hasta tener dos seguidas de 25 % o menos: 13 % y 11 % a las 19:17:45, sin ningún `vitest`. Corrí una cosa a la vez y sin navegadores.

| Qué | Resumen | Mi corrida |
|---|---|---|
| `npm run lint` | exit 0 | exit 0; Prettier bien |
| `npm run build` | exit 0, `✓ built in 854ms` | exit 0, `✓ built in 839ms` |
| Suite de módulos (comando literal) | `135 passed (135)` · `2523 passed (2523)` | **`Test Files 1 failed \| 134 passed (135)` · `Tests 1 failed \| 2522 passed (2523)`** (19:17:52). **No coincide** (M-03) |
| `vitest list` del archivo | 87; 12 con "vecino" (10 nuevos) | Igual: 87 y 12; 10 en el bloque "estados vecinos antes de la ronda 3" |
| V-01 | 258 | **258**: 0 diferencias con `ac79306a…`, y `r1` = `1cc30b08…` y `r2` = `76b5b252…` sin cambios |
| "No se toca" | Limpio | Limpio |

#### M-03 — "vecino: Escape justo cuando el DELETE responde con error…" falla siempre en mi equipo
- **Dónde:** `frontend/src/features/clases/clases-admin-01c.test.tsx`, el último caso del bloque "estados vecinos antes de la ronda 3" (aserción en `:1583`).
- **Lo que obtuve:** `expected <div role="dialog" …> to be null`.
  - Falla en la suite de módulos.
  - Falla en el archivo solo (`Tests 1 failed | 86 passed (87)`).
  - Falla tres de tres veces solo, con `-t "vecino: Escape justo"`.
  - El archivo no cambió después de la corrida del programador.
- **Causa:** la prueba depende del tiempo.
  - Suelta la respuesta `500` del `DELETE` y espera un solo `setTimeout(0)` antes del primer Escape.
  - Si el error no se procesó todavía (`fetch`, el `json` de la respuesta, la mutación y el render), el diálogo sigue en vuelo y, por diseño, no se cierra.
  - El segundo Escape sale enseguida, sin esperar a que el botón salga de la espera, y puede volver a caer en vuelo.
  - Cuántos turnos tarda la respuesta depende del equipo y de la carga.
  - El comportamiento del diálogo es el decidido: Escape en vuelo no cierra (ADM-T1C04). El defecto es de la prueba, no del producto.
- **Por qué importa:**
  - `.claude/agents/manager.md`, punto 3: una cifra que no coincide devuelve el resumen.
  - `AGENTS.md`, "Pruebas": no se da nada por terminado con pruebas en rojo.
  - Una prueba que depende del reloj del equipo deja la suite sin verificar en la revisión final y en la ronda 3.
- **Qué se espera:**
  - El caso pasa en cada corrida, solo o en la suite, con cualquier carga.
  - Los dos órdenes quedan comprobados por separado y sin depender del tiempo:
    - Escape que llega con el `DELETE` en vuelo: no cierra;
    - Escape después de que el error se ve: cierra limpio, sin aviso, con el foco en «Borrar definitivamente» y sin mensajes al reabrir.
  - Comprobar el estado (por ejemplo, que el botón ya no esté en espera) en lugar de suponer un número de turnos.
  - Los hermanos del mismo patrón: buscar en los casos nuevos de 01c y en los de la ronda 2 (T-04) otros `setTimeout(resolver, 0)` o esperas fijas que supongan el orden de llegada, y decir uno por uno si les pasa lo mismo.
  - Después, repetir la suite de módulos y reportar la cifra.

#### Lo que sí está bien (contra el código de `dialogo-borrar-clase.tsx`)
- **Vecino 1, el conteo congelado.**
  - `confirmado` se fija en el primer clic de la apertura (`borrar.isIdle && conteo.data`).
  - `conteoVisible` lo usa mientras el borrado no está en reposo.
  - En el segundo intento se sigue viendo el mismo conteo.
  - **No deja un conteo viejo en una apertura nueva:** `confirmado` es estado de `DialogoAbierto`, que se desmonta al cerrar (`clase === null`) y se vuelve a montar con `key={clase.id}`. Toda apertura empieza en `null`.
- **Vecino 2, los errores que redirigen.**
  - Ni el error del borrado ni el del conteo se pintan si `apiClient` redirige (`borradoFallo` y `conteoQueRedirige`). Con la vista desmontada, el gancho ya callaba.
  - Usa `errorQueRedirigeElCliente` de `../lib`, su propio módulo. No nombra `CODIGOS_QUE_REDIRIGE_EL_CLIENTE` ni los tres códigos, así que no choca con `apiClient-ch3-r1.ataque:59-84`, que sigue en verde en la suite: la lista de importadores sigue siendo calificaciones, clases y tareas.
- **Vecino 3, el `403` del conteo con el borrado ya respondido.**
  - `yaNoExiste` exige un borrado que respondió con error (ni en reposo ni en vuelo).
  - `conteoFallo` gana, y `borradoFallo` se apaga.
  - Queda una sola frase, sin botón. Las listas ya se renovaron (T-01), así que al cerrar la fila no está y el foco va a la vecina (M-02).
  - **Detalle:** con `409 CLASE_NO_ARCHIVADA` del conteo en la misma situación, gana el borrado (su mensaje y el botón). Volver a borrar tampoco puede servir, pero la matriz del plan deja el `409` en el diálogo y no hay dos mensajes. No bloquea.
- **El foco a «Cancelar».**
  - El efecto solo actúa con `conteoFallo`, y solo si el foco se perdió (`focoPerdido`) o quedó en el contenedor del diálogo, que es adonde lo lleva Radix cuando el botón desaparece.
  - Si la persona tiene el foco en otro control, no lo mueve. Fuera del diálogo no puede tenerlo, porque es modal.
  - Si la ventana pierde el foco, `activeElement` no cambia y el efecto no actúa.
  - **Detalle:** si la persona hace clic en el texto del diálogo, el contenedor (`tabIndex=-1`) recibe el foco, y el siguiente render con `conteoFallo` lo lleva a «Cancelar». Es raro e inofensivo. Va como punto de ataque.
- **Los cinco puntos de ataque de la ronda 2**, con su caso cada uno:
  - el `409` de copias con reconexión;
  - el `403` del `DELETE` tras una reconexión;
  - dos reconexiones;
  - el segundo intento con reconexión en medio (vecino 1);
  - Escape (M-03).
- **Reglas de `CLAUDE.md`:**
  - los tipos vienen de `types.ts` (`ConteoDeBorradoRespuesta`);
  - los predicados están en `lib.ts` y los textos en `data.ts`;
  - no hay `disabled`, `aria-busy` ni `aria-disabled`, y `enEspera=` sigue en 1 (V-06 en verde);
  - no hay ternarios anidados en el JSX;
  - no se usa `?? []`.
- **La tabla actualizada coincide con el código, fila por fila.** La fila de Escape describe bien el comportamiento: si Escape llega en vuelo, no cierra; si llega después, cierra. Lo que falla es la prueba que la cubre.

#### Puntos de ataque para la ronda 3 (cuando se acepte M-03)
1. El orden de llegada con esperas reales: Escape, «Cancelar» y el segundo clic justo antes y justo después de cada respuesta del `DELETE` (`500`, `403`, `409` y red).
2. El efecto de foco: el foco en el contenedor del diálogo por un clic en el texto, seguido de una recarga del conteo que falla.
3. El conteo congelado con dos intentos y una reconexión que responde otras cifras entre los dos; y al reabrir, el conteo nuevo.
4. Un error que redirige en el conteo antes de pulsar, sin datos: el diálogo queda en `Cargando` hasta que la página se va. Comprobar que no se anuncia nada y que la redirección ocurre.
5. Vecino 3 con varias páginas y con la lista vacía: el foco al cerrar.

#### Cierre
**DEVUELTO** por M-03.
- Solo hay que volver determinista el caso de Escape y revisar sus hermanos en las pruebas propias. El código de producción no necesita cambios.
- La ronda 3 espera a que la suite de módulos dé verde completo en mi corrida.

### Re-verificación de M-03

**Entrega revisada.** `resumen-programador.md` = `48213c88…`, subsección "### M-03" (línea 1236).

**Archivos que cambiaron desde la huella `ddb3f723…`.** Solo `clases-admin-01c.test.tsx` y `clases-admin-01c-rutas.test.tsx`, según `find -newermt`.
- `dialogo-borrar-clase.tsx` sigue con la hora 19:09:41: no cambió.
- Huella nueva: `f6ef3c17885a4056729e91a4ddf913d5e0fa284d20a7f6f22ddc0b2a1dbbb2bb`.

**Entorno.**
- Antes de cada corrida, dos lecturas seguidas de carga de 25 % o menos y ningún `vitest`:
  - 19:43:01, 24 %;
  - 19:43:53, 19 %;
  - 19:44:46, 0 %.
- Una corrida a la vez. Sin navegadores.

**Cifras.**

| Qué | Resumen | Mi corrida |
|---|---|---|
| `npm run lint` | exit 0 | exit 0, Prettier bien |
| `npm run build` | exit 0, `✓ built in 807ms` | exit 0, `✓ built in 807ms` |
| `clases-admin-01c.test.tsx` solo, dos veces | `88 passed (88)` | **`88 passed (88)`** las dos (19:43:03 y 19:43:54) |
| Suite de módulos (comando literal) | `135 passed (135)` · `2524 passed (2524)` | **Igual** (19:44:48, 136 s). Sin avisos de claves repetidas ni de `act` |
| V-01 | 258 | **258**: 0 diferencias con `ac79306a…`; `r1` = `1cc30b08…`, `r2` = `76b5b252…` |
| "No se toca" | Limpio | Limpio |

#### Los dos casos de Escape prueban lo que dicen, sin depender del tiempo
- **"Escape con el DELETE en vuelo no cierra el diálogo".**
  - Antes de Escape, espera el estado y no un tiempo: `waitFor(aria-busy="true")`.
  - `fireEvent` va envuelto en `act`, así que si Escape cerrara, el desmontaje ya se vería en las aserciones que siguen. Esas aserciones exigen el mismo diálogo, el botón en espera y el foco dentro.
  - Después suelta el `500` y comprueba un solo `alert` y la salida de la espera.
  - Su control positivo es el otro caso: el mismo Escape, fuera del vuelo, sí cierra. Así que "no cierra" no pasa porque Escape no llegue.
- **"Escape en cuanto el DELETE respondió con error".**
  - Espera el estado (el `alert` y que el botón no esté en espera) antes de Escape.
  - Después comprueba: que el diálogo se cerró; que no hubo aviso, tras `asentado()`; el foco en «Borrar definitivamente»; y una apertura nueva sin mensajes y con el botón disponible.

#### Las ayudas no dejan pasar un caso sin probar nada
- **Qué hacen.**
  - `asentado()` y `sinConsultasEnVuelo()` solo esperan a que la caché no tenga peticiones en vuelo.
  - Se llaman después de que el caso ya vio, con `findBy` o `waitFor`, el estado que quiere comprobar. No reemplazan esa espera ni pueden saltarse un estado intermedio que el caso necesite.
  - En las afirmaciones negativas (que el error del conteo no se ve), `sinConsultasEnVuelo()` es **más estricta** que el `reposar()` de antes: obliga a que la respuesta del conteo se procese antes de afirmar.
  - `enLaPestana()` espera `aria-pressed`, que es el estado que el siguiente clic necesita.
- **Comprobado con una mutación**, fuera del repositorio y sin tocar el árbol.
  - Corrí el `clases-admin-01c.test.tsx` real contra una copia de `dialogo-borrar-clase.tsx` con la condición de antes de T-04 (`conteo.isError && !borrar.isPending`), con un alias de una configuración en el scratchpad.
  - Con `-t "T-04|vecino"`: `Tests 7 failed | 14 passed | 67 skipped (88)`.
  - Fallan los cinco de T-04 con reconexión y los dos vecinos que pasan por ella (el `409` de copias y las dos reconexiones). Es decir, los casos de afirmación negativa que ahora usan `sinConsultasEnVuelo()` sí detectan el defecto.
- **Las esperas revisadas.** Las 23 del resumen están bien juzgadas. Las que se quedan en `clases-admin-01c-rutas.test.tsx` solo marcan el ritmo entre navegaciones, y lo que comprueban después va con `findBy` o `waitFor`.

#### Veredicto
**ACEPTADO.** M-03 cerrado.
- Las cifras coinciden: lint y build en 0, `88 passed` dos veces, `2524` en `135` y V-01 258.
- El código de producción de los estados vecinos ya estaba bien (subsección anterior).
- 01c queda lista para la ronda 3 del tester, la última.

**Puntos de ataque para la ronda 3**
1. El orden de llegada con esperas reales: Escape, «Cancelar» y el segundo clic, justo antes y justo después de cada respuesta del `DELETE` (`500`, `403`, `409` y red).
2. El efecto de foco: un clic en el texto del diálogo deja el foco en el contenedor; después, una recarga del conteo que falla.
3. El conteo congelado con dos intentos y una reconexión entre ellos que trae otras cifras; y al reabrir, el conteo nuevo.
4. Un error que redirige en el conteo, sin datos: sin anuncio, y la redirección ocurre.
5. El vecino 3 con varias páginas y con la lista que queda vacía: el foco al cerrar.
6. Las pruebas nuevas del programador bajo carga: que ninguna dependa del orden de llegada. Si el tester ve otra espera fija o una afirmación negativa sin control, la reporta.

## Revisión final — ADMIN-01c

Fecha: 2026-11-05. Plan: `plan.md`, SHA-256 `3822b6c0adb9823edb9c552dd6cfac78f4e0ffa2f4eca9fcade0be07d4fbdd78` (Enmiendas 1 a 10), comprobado. Tester: `reporte-tester.md`, "## Ronda 3 — ADMIN-01c" (línea 2187), RESISTE sin hallazgos. Programador: `resumen-programador.md`, secciones de 01c desde "ADMIN-01c — PARADA en el paso 14" (línea 744). Base de "No se toca": `52f1c97` (commit de 01b), con los seis archivos de proceso contra sus SHA-256 de `aprobacion.md`. Ignoré `docs/trabajo/DEPLOY-investigacion-vps.md`, que es ajeno.

Veredicto: **APROBADO**
Verificación propia: lint exit 0 · test frontend `Tests 6229 passed (6229)` · `Test Files 287 passed (287)` a la primera · build exit 0 (`✓ built in 917ms`)

### Entorno y corridas
- 01c no toca `shared/` ni el backend: basta la suite completa del frontend (CHORE-05). PA-01 no aplica.
- **Trabajo en paralelo:** la otra copia de trabajo no se usa (respuesta del humano en `aprobacion.md`, 2026-11-05). Sin navegadores.
- **Puerta de carga:** a las 20:04 la carga estaba en 29 % y 29 %, así que no arranqué la suite. Corrí primero `lint` y `build`, que no dan rojos por carga. Antes de la suite: 20:05:37 `20 %` y 20:05:38 `15 %`, sin ningún `node` con `vitest`.
- Una sola corrida de la suite, sin repeticiones: ningún archivo cayó.
- **Huella del árbol:** `git diff 52f1c97 -- frontend` más los archivos sin rastrear de `frontend/` sin `r3` da `f6ef3c17885a4056729e91a4ddf913d5e0fa284d20a7f6f22ddc0b2a1dbbb2bb`, la misma de mi re-verificación de M-03. Desde entonces solo se sumó `clases-admin-01c-r3.ataque.test.tsx`; con él, `e3828ac8221833d4bfa6407c1bd0b219701eb12be9dfd390905fe529de4f109b`. El código de producción que reviso es el que ya acepté.

### Cifras (desde `frontend/`)

| Qué | Comando | Resultado |
|---|---|---|
| lint | `npm run lint` | exit 0; `All matched files use Prettier code style!`; última línea `> tsc -b` sin errores |
| build | `npm run build` | exit 0; `✓ built in 917ms` |
| test | `npm run test` (20:05:49, 296 s) | `Test Files 287 passed (287)` · `Tests 6229 passed (6229)`. Sin avisos de claves repetidas, de `act` ni `stderr` |
| Conteo | `npx vitest list` con `grep -a -c "\.test\.ts"` y rutas únicas | 6229 casos y 287 archivos, iguales a la corrida |

**Cuadre contra 01b (6062 casos, 281 archivos):**
- Pruebas nuevas del programador, 3 archivos y 115 casos: `clases-admin-01c.test.tsx` 88, `clases-admin-01c-rutas.test.tsx` 22 y `lib/unir-paginas.test.ts` 5.
- `*.ataque` nuevas del tester, 3 archivos y 43 casos: `r1` 23, `r2` 8 y `r3` 12.
- Casos que crecen en archivos existentes, 9:
  - CH3-B15 de la lista cerrada (Enmienda 9), en `features/clases/errores-ch3.test.ts`: 4 (tres de (1) en modo `duplicar` y uno de (2));
  - `features/clases/errores-ch3-r1.ataque.test.ts:273` (vigilada), `it.each(CODIGOS_CON_MENSAJE_DEL_SERVIDOR)`: los cinco códigos nuevos "entran solos", como dice §D-R0 01c. El archivo no cambia.
- C-9, C-9b, C-9c y C-9d no cambian el número de casos (V-06 y V-07 siguen siendo un caso cada una).
- 6062 + 115 + 43 + 9 = **6229**; 281 + 6 = **287**.

### (a) 01c cumple su parte del plan
`git diff 52f1c97` contra §D-R0 01c: se hizo lo planeado, solo lo planeado y todo lo planeado.
- **"Se toca":** los 13 archivos rastreados que cambian y los 8 nuevos del programador están todos en "Se toca" de 01c (con `lib/unir-paginas.ts` y su prueba, de la corrección de la Enmienda 5), en la lista cerrada o son pruebas nuevas del encargo. `services/clasesService.ts` y `encabezado-clase.tsx` no se tocan (E10-3 y E10-6).
- **§D-9:** a 01c solo le toca dejar listo lo que usa 01d1. `useRestaurarClase(claseId)` existe, con su `mutationKey` por clase (`claveGestionDeClase`); el aviso de la clase archivada es de 01d1.
- **§D-10:** control segmentado con `?estado=`, dos tablas con «Cargar más clases» (`enEspera={isFetching}`, ref, `cancelRefetch: false`), acciones de cada estado, confirmación en línea de archivar, diálogo de borrar con conteo y contexto propio en el `DialogContent` (E-23, P-01c-1), duplicar dentro de `ClaseLayout` (`app/router.tsx`, solo la ruta `duplicar`), `ARCHIVO_EN_COPIA` en `components/adjuntos/data.ts` y `CLASE_CON_COPIAS_EN_CURSO` en el diálogo y en el formulario. Todo lo comprobé en la verificación de la implementación y no ha cambiado.
- **§D-11:** no tiene parte en 01c (es de 01f y 01g). Lo único compartido, `unirPaginasSinRepetidas`, vive en `lib/` y no importa de `features/`.
- **§D-12 y textos aprobados por el humano**, en `features/clases/data.ts`:
  - el título del diálogo es `Borrar definitivamente «${nombre}»` (`TEXTOS_BORRAR_CLASE.titulo`), sin comillas exteriores (Enmienda 4); ADM-1C04b lo compara por `textContent`;
  - «Estado de las clases» va como `aria-label` del `role="group"` (`clases-admin-view.tsx:163-164`), sin rótulo visible (Enmienda 10);
  - el aviso "Clase duplicada. Los archivos de los recursos pueden tardar unos minutos en estar disponibles." sale **siempre**, sin condición: desde el formulario montado (`formulario-duplicar-clase.tsx:60`) o, si ya se desmontó, desde el gancho (`hooks.ts:468`), nunca desde los dos;
  - los demás, carácter por carácter, como los cotejé en la verificación de la implementación.
- **Matriz de avisos y recargas:** coincidía con el código desde el primer resumen; las correcciones la cambiaron solo donde los hallazgos lo pedían (T-01: el conteo y el borrado renuevan ante una clase que ya no existe; T-03 y T-04: un solo mensaje en el diálogo, el del último envío; los tres estados vecinos de la ronda 2). Las dos celdas "como hoy" de la Enmienda 9 siguen igual.
- **ADM-1C01 a 1C17, con 1C04b y N-24:** cada viñeta tiene su caso con el título exacto (78 títulos cotejados uno por uno en la implementación). Los casos posteriores (M-02, T-04, estados vecinos y M-03) suman, no reemplazan: los 88 de `clases-admin-01c.test.tsx` contienen los 51 originales con sus títulos.
- **Enmienda 4:** título del borrado (arriba).
- **Enmienda 5:** cursor con posición solo en "Archivadas" (ADM-1C16 a y b), frase de lista cambiada por los cuatro caminos (ADM-1C16 c), descarte por `id` (ADM-1C17 a y b) y N-24.
- **Enmienda 9:** C-9, C-9b, C-9c y C-9d aplicados por el tester y en verde; P-01c-2 (`vidrio-fuerte` del control dentro del contexto opaco); P-01c-4 ("como hoy"); CH3-B15 con `erroresDeLaClaseDeApi(error, "duplicar")`; sin `if (m.isError) m.reset()`.
- **Enmienda 10:** CH3-B01 exacto (dos líneas en `TEXTOS_FIJOS_DE_SIEMPRE` y el comentario «cinco códigos»); foco tras duplicar como al crear o editar (`toast.success` y `navigate`, sin mover el foco a mano); `claveClasesAnteriores` fuera de 01c.

### Reglas que no se rompen y estilo
- **Capas y seguridad:** 01c es solo frontend. Ninguna regla de acceso se decide en la interfaz: el `403`, los `409` y el `400` del cursor los da el backend de 01a y 01b, y la interfaz solo los traduce.
- **`fetch`:** ninguno nuevo; todo por `apiClient` en `hooks.ts`.
- **Errores:** todo texto del servidor pasa por `lib/errores-de-api.ts` (envoltorios del módulo); predicados en `lib.ts` y textos en `data.ts`. Sin `.message` fuera de ese archivo.
- **Sin valores por defecto silenciosos:** sin `?? []`, sin ternarios anidados en JSX, retornos tempranos error → cargando → vacío → datos.
- **Estado de pago, cola, archivos, UTC, trabajos diferidos, secretos, `infra/`, migraciones, proveedores y `notifier`:** no aplican; nada de eso cambia.
- **`*.ataque`:** el programador no modificó, saltó ni borró ninguna (V-01, abajo). Sin `.skip`, `.only` ni `.todo` en las pruebas nuevas.

### (b) Hallazgos cerrados
| Hallazgo | Qué era | Cierre |
|---|---|---|
| T-01 (media) | Una clase borrada en otra pestaña se quedaba en «Archivadas»; la frase del conteo no se cumplía | El conteo y el `DELETE` renuevan listas y detalle ante una clase que ya no existe. Los 23 casos de `r1` en verde en mi suite |
| T-02 (media) | «Restaurar» o «Sí, archivar» se mandaban dos veces al desmontar y volver a montar la fila | `mutationKey` por clase y `useGestionEnVuelo` sobre la caché de mutaciones. En verde (`r1`) |
| T-03 (baja) | Error del conteo y «Sí, borrar definitivamente» a la vez | El error sustituye conteo y botón. En verde (`r1`) |
| T-04 (baja) | Dos `role="alert"` al reconectar con el `DELETE` en vuelo | Regla del último envío (`conteo.isError && borrar.isIdle`). ADM-T2C04 en verde (`r2`), y ADM-T3C01 a T3C07 lo atacan por cada orden de llegada (`r3`) |
| M-01 | Cifra de la corrida acotada (38 por 42) | Resumen corregido; cifra igual a la mía |
| M-02 | Foco al cerrar el diálogo de una fila que ya salió: caía en la primera fila | `useFocoAlQuitarUnaClase` con `ultimoLugar`; 15 casos, sonda 9 de 9; ADM-T3C06 y T3C07 lo confirman con dos páginas y con la lista vacía |
| M-03 | Caso propio dependiente del tiempo (Escape) | Partido en dos casos deterministas; sin esperas fijas en `clases-admin-01c.test.tsx`; orden aleatorio con dos semillas en verde (tester) |
| Tres estados vecinos de la ronda 2 | Conteo que cambia junto al error; error que redirige pintado antes de redirigir; `403` del conteo tras el error del `DELETE` | Cubiertos antes de la ronda 3 (conteo congelado, `errorQueRedirigeElCliente`, la frase sin botón con foco en «Cancelar»); ADM-T3C02 a T3C07 los atacan sin hallazgo |

No hay desacuerdos abiertos entre programador y tester: el tester no impugnó ninguna decisión del programador y el programador no pidió cambiar ninguna `*.ataque`.

### (c) V-01: 259 `*.ataque`
- **Rastreadas, 256:** reconstruí la lista `ac79306a…` desde la tabla de `reporte-tester.md:1548-1805` (lista `e1c89304…`, comprobada) con las dos filas de "Tras la Enmienda 9". Su SHA-256 da `ac79306abdf63ad4…`; `sha256sum -c` no da ninguna diferencia, y sus rutas son exactamente las de `git ls-files '*.ataque.test.ts' '*.ataque.test.tsx'`.
- **C-9, C-9b y C-9c:** `frontend/src/styles/clases-r1.ataque.test.ts` = `550ccd969fe3dc3735933656583c99f5c18d1f4e32668585293c5a337083d53d`.
- **C-9d:** `frontend/src/features/clases/foco-02c-r4.ataque.test.tsx` = `0165d4e27b1fff9230d17bec740d89c380b6f322923c7e5a044ac010f4b9358b`.
- **Nuevas del tester, sin rastrear, 3:**
  - `clases-admin-01c-r1.ataque.test.tsx` = `1cc30b08735944f9c972e2f1f360ef3c422b7f6a2bf647a8d9a8061d6fd4fc65`;
  - `clases-admin-01c-r2.ataque.test.tsx` = `76b5b2522f60795c0e7672da7b10ea95a3ce61d1aa26f102ef8eb057bd3ce6d9`;
  - `clases-admin-01c-r3.ataque.test.tsx` = `cffce654ebfb37dc10f8ce8bf7026fc982a8c3f79b677fa2eb82c4476e113f83`.
- Total **259**. Contra `52f1c97` solo cambian las dos de C-9 a C-9d, que son del tester. Las 259 están en verde en mi suite.

### Definición de terminado
- [x] Cumple la parte de interfaz de RF-69 (archivar y restaurar), RF-70 (borrar con conteo) y RF-71 (duplicar) que el plan asigna a 01c (§D-0.2 y §D-10).
- [x] Respeta las capas; la seguridad sigue en el middleware del backend (01a y 01b).
- [x] `lint`, `build` y `test` del frontend en verde, en mi corrida.
- [x] Pruebas de autorización: no hay endpoint nuevo en 01c (las de los endpoints están en 01a y 01b).
- [x] Migración: no aplica.
- [x] `infra/` y `.env.example`: no aplica.
- [ ] Documentos: `docs/DESIGN.md` (A-04) y `CLAUDE.md` (A-05, con `lib/unir-paginas.ts` de N-25) quedan para el cierre del encargo, como fija el plan (§D-R0 01c, paso 31). No bloquea 01c.

### Lista de diseño (01c toca `frontend/`)
- **`DESIGN.md`:** lo implementado sigue §7.3 (control segmentado), §7.9 (tabla y acciones), §7.11 (diálogo), §7.14 (confirmación en línea y foco al quitar una fila) y §8 (admin opaco y denso). Los patrones nuevos se documentan **al cierre del encargo** (A-04), no en 01c: `AGENTS.md` pide hacerlo "en ese mismo encargo" y el plan lo fija en §D-R0 01c ("`docs/DESIGN.md` no (va al cierre)"). `docs/DESIGN.md` no cambió desde `52f1c97`.
- **Solo tokens:** sin colores, tamaños, radios ni sombras sueltos (O-01c-2, grep vacío); el vidrio solo con `vidrio-fuerte`, que en el contexto opaco vale `--surface`.
- **Componentes de `components/ui/`:** `Dialog`, `Button`, `Card` y la tabla; nada hecho a mano que ya exista, y nada con el aspecto por defecto.
- **Sin rasgos prohibidos.** El estado no se comunica solo con color: el control segmentado lleva `Check`, `aria-pressed` y texto; "Archivada" es una columna con fecha.
- **Una sola acción principal por vista:** «Crear clase» en `/admin/clases` (las acciones de la fila son `outline` o `ghost`, y «Sí, archivar» es `destructive`); «Duplicar clase» en su vista; en el diálogo, la destructiva.
- **Textos:** español de México, sin emojis, los de §D-12.
- **Estados:** error, carga y vacío en las dos tablas, el diálogo y el formulario. El vacío de «Archivadas» ("Aún no hay clases archivadas") no lleva CTA propio, como lo aprobó §D-12: archivar se hace desde «Activas», y «Crear clase» sigue a la vista.
- **360 px y foco visible:** el título largo en varias líneas queda para H-4 (navegador, lo decide el humano); el foco tras cada acción está probado (ADM-1C02, 1C04, 1C09, M-02 y ADM-T3C).

### (d) Todo lo abierto tiene destino
| Pendiente | Destino |
|---|---|
| Patrón visual nuevo: control segmentado de dos opciones en contexto opaco, acciones de la fila y columna "Archivada", confirmación en línea de archivar, diálogo con conteo y contexto propio en el portal (primer diálogo del admin) y foco devuelto al botón que abrió un diálogo sin `DialogTrigger` | **A-04 al cierre** (`docs/DESIGN.md`) |
| N-01c-3: nombre accesible con el texto visible `aria-hidden` y un `sr-only` con la acción y la clase, contra la letra de §7.9 | **A-04 al cierre**: se documenta la variante o se cambia (decisión del humano) |
| «Cancelar» que no responde con una acción en vuelo (confirmación de archivar y diálogo de borrar) | **A-04 al cierre**, con las tres opciones para el humano: dejarlo así, ocultarlo en vuelo cuando no tiene el foco, o un texto de estado |
| §7.14 cuando salen dos filas a la vez (ADM-T2C01: el foco va a la que ocupa el lugar) | **A-04 al cierre**, para precisar la regla |
| `aria-describedby={undefined}` en el diálogo (la consecuencia no se anuncia como descripción) | **A-04 al cierre** y H-4 |
| «Restaurar» del aviso de la clase archivada con la misma `mutationKey` que la tabla (`useRestaurarClase(claseId)`) | **Programador de 01d1** (N-15 de la Enmienda 2) |
| Tipos de objeto en línea fuera de `types.ts`: `useRef<{ id; accion }>` (`hooks.ts:858`), el parámetro `partes` de `consecuencia` y `unidades` (`data.ts:217-225`), `unidad` de `cantidadCon` (`lib.ts`) y los parámetros desestructurados de `mutationFn`/`queryFn` nuevos (`{ id }`, `{ claseId, datos }`, `{ pageParam }`; el mismo patrón que ya usa el módulo, p. ej. `useMoverElemento`) | **Programador de 01d1**, que vuelve a tocar `hooks.ts`, `data.ts` y `lib.ts`, o **carril trivial al cierre** |
| Chore opcional de foco tras navegar (el `h1` de la clase tras duplicar, crear o editar; E10-3) | **ESTADO §3 al cierre**, junto al `chore` de foco y navegación del marco de la hoja de ruta |
| H-4: el título largo del diálogo a 360 px | **Comprobación humana al cierre** (máx. 7 puntos) |
| N-25: `lib/unir-paginas.ts` en "Ubicaciones compartidas" de `CLAUDE.md` | **A-05 al cierre** |
| Detalles: `TEXTOS_CLASES_ADMIN.archivada` fuera de `columnas.*`; el título de la prueba ADM-1C04b con comillas exteriores (su aserción es correcta); el doble pedido del conteo con `retry: 1` | **Carril trivial al cierre**; el último es inocuo y no requiere acción |

### (e) Medición del programador para ESTADO §6
Con la convención de las mediciones anteriores (CLASES-03e, CHORE-03): una ronda extra es toda ronda del tester después de la primera, y "por hermanos o estados vecinos" se cuenta la ronda en que el tester encuentra un vecino de un remedio anterior.

| Subentrega | Rondas del tester | Rondas extra | Por hermanos o estados vecinos | PARADAS | Resúmenes devueltos |
|---|---|---|---|---|---|
| **ADMIN-01c** | **3** (r1 ROTO por T-01 a T-03; r2 ROTO por T-04; r3 RESISTE) | **2** (r2 y r3) | **1** (r2: T-04, estado vecino del remedio de T-03, los errores del diálogo de borrar) | **1** (paso 14: CH3-B01, prueba normal que el plan no inventarió; resuelta con la Enmienda 10) | **3 de 7** (M-01, cifra de la implementación; M-02, estado vecino del foco en la corrección de la ronda 1; M-03, caso propio dependiente del tiempo en la entrega de los estados vecinos) |

- **Hermanos no extendidos que no costaron ronda del tester** (los detuvo la verificación del manager):
  - M-02 (foco al quitar una fila, vecino del remedio de T-01);
  - los tres estados vecinos de la corrección de la ronda 2 (mismo mecanismo que T-03 y T-04), cubiertos antes de la ronda 3 por decisión del orquestador.
  El orquestador registró M-02 y T-04 como estados vecinos; coincido.
- **T-01 de la ronda 1** era N-01c-1, el hermano de la decisión 3 que ya señalé al aceptar la implementación. No cuenta por la regla, que mide correcciones, no la primera entrega; lo anoto porque el aviso previo no bastó para que se extendiera antes del ataque.
- **Umbral de `AGENTS.md`:** 1 ronda extra por este patrón en 01c, menos de 2. Además el `programador` ya corre con `opus` (frontmatter de `.claude/agents/programador.md`), así que no hay cambio de modelo que aplicar.
- **Lo que hizo bien:** cifras iguales a las mías en cinco de siete entregas (no en M-01 ni en M-03, donde un caso suyo dependía del tiempo); se detuvo en el paso 14 en vez de tocar una prueba fuera de la lista cerrada; en la corrección de M-02 y de T-04 demostró que sus casos nuevos fallan con el código anterior (`cmp` y restaurado); M-03 lo resolvió con esperas por estado, sin tocar producción.
- **A vigilar:** los remedios del diálogo de borrar se extendieron por partes (T-03 → T-04 → tres vecinos), siempre sobre el mismo mecanismo: los mensajes del diálogo según el orden de llegada de dos peticiones.


### (f) Rutas del commit de 01c
25 entradas de `git add` (29 archivos). Cotejadas por programa contra `git status --porcelain --untracked-files=all`: la única ruta que queda fuera es `docs/trabajo/DEPLOY-investigacion-vps.md`, que es ajena.

**frontend, producción (13):**
- `app/router.tsx` y `components/adjuntos/data.ts`;
- en `features/clases/`: `clases-admin-view.tsx`, `duplicar-clase-view.tsx` (nuevo), `data.ts`, `hooks.ts`, `lib.ts` y `types.ts`;
- en `features/clases/components/`: `tabla-clases-admin.tsx`, y los nuevos `confirmar-archivado.tsx`, `dialogo-borrar-clase.tsx` y `formulario-duplicar-clase.tsx`;
- `lib/unir-paginas.ts` (nuevo).

**frontend, pruebas del programador (6):**
- nuevas: `features/clases/clases-admin-01c.test.tsx`, `features/clases/clases-admin-01c-rutas.test.tsx` y `lib/unir-paginas.test.ts`;
- lista cerrada: `features/clases/clases-admin-view.test.tsx`, `features/clases/errores-ch3.test.ts` y `features/clases/reexportaciones-01c.test.ts`.

**frontend, `*.ataque` del tester (5):**
- cambiadas por C-n: `styles/clases-r1.ataque.test.ts` (C-9, C-9b y C-9c) y `features/clases/foco-02c-r4.ataque.test.tsx` (C-9d);
- nuevas: `features/clases/clases-admin-01c-r1.ataque.test.tsx`, `-r2` y `-r3`.

**docs (1 entrada, 5 archivos):** `docs/trabajo/ADMIN-01-administracion/` (`plan.md`, `aprobacion.md`, `resumen-programador.md`, `reporte-tester.md` y `revision.md`).

`docs/ESTADO.md` no cambió desde `52f1c97`, así que no entra.

```
git status
git add frontend/src/app/router.tsx frontend/src/components/adjuntos/data.ts frontend/src/features/clases/clases-admin-view.tsx frontend/src/features/clases/duplicar-clase-view.tsx frontend/src/features/clases/data.ts frontend/src/features/clases/hooks.ts frontend/src/features/clases/lib.ts frontend/src/features/clases/types.ts frontend/src/features/clases/components/tabla-clases-admin.tsx frontend/src/features/clases/components/confirmar-archivado.tsx frontend/src/features/clases/components/dialogo-borrar-clase.tsx frontend/src/features/clases/components/formulario-duplicar-clase.tsx frontend/src/lib/unir-paginas.ts frontend/src/lib/unir-paginas.test.ts frontend/src/features/clases/clases-admin-01c.test.tsx frontend/src/features/clases/clases-admin-01c-rutas.test.tsx frontend/src/features/clases/clases-admin-view.test.tsx frontend/src/features/clases/errores-ch3.test.ts frontend/src/features/clases/reexportaciones-01c.test.ts frontend/src/styles/clases-r1.ataque.test.ts frontend/src/features/clases/foco-02c-r4.ataque.test.tsx frontend/src/features/clases/clases-admin-01c-r1.ataque.test.tsx frontend/src/features/clases/clases-admin-01c-r2.ataque.test.tsx frontend/src/features/clases/clases-admin-01c-r3.ataque.test.tsx docs/trabajo/ADMIN-01-administracion
```

Después del `git add`, `git status` no debe mostrar nada sin preparar ni sin rastrear, salvo `docs/trabajo/DEPLOY-investigacion-vps.md`.

### Problemas que bloquean
Ninguno.

### Problemas que no bloquean
Ninguno nuevo. Los abiertos están en la tabla de (d), con su destino.

### Desacuerdos arbitrados
Ninguno en esta revisión. P-01c-5 (opción a) se arbitró en la ronda 0 y sus tres casos están en verde.

### Documentos a actualizar
- Al cierre del encargo: `docs/DESIGN.md` (A-04, con lo de la tabla de (d)) y `CLAUDE.md` (A-05, con N-25).
- `docs/ESTADO.md` §3 (chore de foco tras navegar) y §6 (la medición de arriba), por el orquestador al cierre.

### Para el humano
- Nada que decidir para cerrar 01c.
- Al cierre del encargo decides, con A-04: N-01c-3 (el nombre accesible de las acciones de la fila) y qué hace «Cancelar» con una acción en vuelo (las tres opciones de la tabla de (d)).

### Veredicto
**APROBADO.** 01c cumple su parte del plan `3822b6c0…`:
- §D-9 (lo que deja listo para 01d1), §D-10 y §D-12, con los tres textos que aprobaste (el título del borrado, «Estado de las clases» y el aviso de duplicado, que sale siempre);
- la matriz de avisos y recargas;
- ADM-1C01 a 1C17, con 1C04b y N-24;
- las Enmiendas 4, 5, 9 y 10.

Además:
- T-01 a T-04, M-01 a M-03 y los tres estados vecinos de la ronda 2 están cerrados, y el tester dio RESISTE en la ronda 3.
- V-01 da 259: 256 rastreadas iguales a `ac79306a…` (con C-9 a C-9d) y las tres nuevas del tester.
- "No se toca" está limpio contra `52f1c97`, y los seis archivos de proceso coinciden con sus SHA-256.
- Mi suite completa del frontend da 6229/6229 en 287 archivos a la primera, con `lint` y `build` en verde.
- Todo lo abierto tiene destino.

### Resumen para el humano (15 líneas)
1. ADMIN-01c (pantalla de gestión de clases del admin) está **APROBADA**. El tester dio RESISTE en la ronda 3, sin hallazgos.
2. `/admin/clases` tiene ahora «Activas» y «Archivadas», con su URL y su historial.
3. El admin archiva con confirmación en línea, restaura, duplica en una vista propia y borra para siempre desde un diálogo que muestra lo que se pierde.
4. Tus textos están tal cual: `Borrar definitivamente «{nombre}»`, «Estado de las clases» y el aviso de duplicado en todo duplicado.
5. Se corrigieron T-01 (clase borrada en otra pestaña), T-02 (doble envío al cambiar de pestaña), T-03 y T-04 (dos mensajes a la vez en el diálogo).
6. También M-01 (una cifra), M-02 (el foco al cerrar el diálogo de una fila que ya salió) y M-03 (una prueba que dependía del tiempo).
7. Mi corrida completa del frontend: 6229/6229 en 287 archivos a la primera; `lint` y `build` en verde.
8. Las 259 pruebas de ataque coinciden con sus hashes; el programador no tocó ninguna.
9. No cambia `shared/`, el backend ni `infra/`; "No se toca" está limpio.
10. Medición: 3 rondas, 2 extra, 1 por estados vecinos (T-04). Por debajo del umbral, y el programador ya usa `opus`.
11. Pendiente para 01d1: «Restaurar» del aviso con la misma clave que la tabla, y los tipos en línea.
12. Pendiente para el cierre: `DESIGN.md` con el patrón nuevo (A-04) y `CLAUDE.md` (A-05).
13. Al cierre decides N-01c-3 (nombre accesible) y qué hace «Cancelar» con una acción en vuelo.
14. El commit lleva 25 entradas de `git add` (29 archivos), incluidas las 3 pruebas nuevas del tester y la carpeta del encargo.
15. No entra `docs/trabajo/DEPLOY-investigacion-vps.md`, que es ajeno.

## Verificación del resumen — ADMIN-01d1 — implementación

Veredicto: **DEVUELTO** por M-01. Faltan estados vecinos del mecanismo del foco y de la escucha, y uno de ellos contradice lo que el resumen declara. Todas las cifras coinciden. El código de las filas 1 a 21, «Restaurar», la tabla de O-01d1-8, los textos y "No se toca" están bien. Las tres lecturas del programador son aceptables y no necesitan enmienda.

Plan: `plan.md` = `3822b6c0…` (Enmiendas 1 a 10), comprobado. Resumen: `resumen-programador.md` = `b023dfe0…`, sección "ADMIN-01d1 — Implementación (2026-11-05)" (línea 1291). Ronda 0: `reporte-tester.md` = `61a9a24f…`, "Ronda 0 — ADMIN-01d1" (línea 2294). Base dentro de los paquetes: `3ae6a00`.

Entorno: solo frontend. La otra copia de trabajo no se usa. Sin navegadores. Corrí una cosa a la vez.
- **Puerta de carga antes de la suite:** 6 % y 4 % a las 21:40:56, sin ningún `vitest`. Las lecturas anteriores (de 21:38 a 21:40) pasaban de 25 %, así que esperé.
- **Huella del árbol entregado:** `34a8a73ac0f619bacdd57667b29c6b02e87d498b650889ba593ee749748f2a56`. Es `git diff 3ae6a00 -- frontend backend shared` más el `sha256sum` de los siete archivos sin rastrear, ordenados.

### Cifras: resumen contra mi corrida (desde `frontend/`)

| Qué | Resumen | Mi corrida |
|---|---|---|
| `npm run lint` | exit 0; `All matched files use Prettier code style!`; última línea `> tsc -b` | Igual: exit 0, la misma línea de Prettier y `> tsc -b` sin errores |
| `npm run build` | exit 0, `✓ built in 969ms` | exit 0, `✓ built in 823ms` (el tiempo no se contrasta) |
| Módulos y vigiladas, comando literal del resumen | `Test Files 158 passed (158)` · `Tests 3477 passed (3477)` | **Igual:** `Test Files 158 passed (158)` · `Tests 3477 passed (3477)` (21:41:03, 187 s), sin `FAIL` en la salida |
| `npx vitest list` de los dos archivos nuevos, con `grep -a -c` | 82: 5 y 77 | **Igual:** 5 y 77 |
| Reparto de los 77 | 1D102 6, 1D103 4, 1D104 43, 1D105 2, 1D106 8, 1D107 4, 1D108 1, 1D109 4 y 5 vecinos | **Igual.** `grep` por id da 1D105 7 y 1D109 5, porque cuenta los 5 vecinos (están en el `describe` de 1D105) y el [L] de 1D109 |
| C-10 (V-06) | En verde; 77; aviso 1 y categorías 0 | **Igual:** `styles/clases-r1.ataque.test.ts` = `0ea4c6b8…`, el de la ronda 0. `grep -c "enEspera="` da 1 y 0 |
| V-01 | 259; lista `825acabd…`; 0 diferencias | **Igual:** 259 rastreadas, ninguna sin rastrear. Mi lista, rearmada con `git ls-files` y `sha256sum`, da `825acabd5f73…`. Contra `3ae6a00` solo cambia la de C-10 |
| "No se toca" contra `3ae6a00` | Solo "Se toca" y C-10 | **Igual:** 17 modificados (16 de producción de "Se toca" y C-10) y 7 nuevos (5 de producción de "Se toca" y las 2 pruebas). Nada en `backend/` ni en `shared/`. `elemento-de-trabajo.tsx` sin cambios. Fuera de los paquetes, solo `docs/trabajo/ADMIN-01-administracion/` y el archivo ajeno `DEPLOY-investigacion-vps.md`, sin rastrear |

### Pruebas requeridas: ADM-1D101 a 1D109
- Cotejé cada título del mapeo del resumen con la salida de `npx vitest list`. Los 26 títulos (o su parte fija, antes de `%s`, `%i` o `$nombre`) existen, en el archivo que dice el resumen. Cada viñeta del plan tiene al menos un caso.
- **Los `it.each` se expanden en:** 1D102, 6; 1D103 activa, 2; 1D104, 21 + 21; 1D106 (ADM-1C15), 4; 1D107, 2 + 2; 1D109, 2 + 2.
- **Lo que comprueban, contra el plan:**
  - ADM-1D105 cuenta una sola petición del detalle y comprueba que la lista de Avisos no se vuelve a pedir (`exact`).
  - ADM-1D107 comprueba que no salen la publicación ni el `PUT`, y que lo escrito y el archivo se conservan hasta el detalle nuevo.
  - ADM-1D108 cuenta el detalle +1 y el código 2 (sin ciclo).
  - ADM-1D109 prueba las dos cachés, montado y desmontado, y los dos códigos que no reaccionan.
  - La fecha del aviso es un instante a mediodía UTC, comparado con `formatearFechaLarga` (O-01d1-9).
- **Las seis mutaciones del resumen:** no las repetí. La de la fila 1 la confirma la propia prueba: comprueba que no sale el `GET …/codigo`.

### Sondas (fuera del repositorio, sin tocar el árbol)
Copié `clase-archivada-01d1-vista.test.tsx` al scratchpad de la sesión, con las importaciones relativas pasadas al alias `@/`, y le agregué seis casos "SONDA". Los corrí con una configuración propia de Vitest (la raíz es `frontend/`; `node_modules` llega por una unión al de la raíz) y `-t "SONDA"`. Resultado: `6 passed | 77 skipped (83)`.
- **Puerta de carga:** la primera corrida fue a las 21:46:59 (16 % y 13 %), pero falló al arrancar por la configuración. Las dos siguientes las lancé en los 3 minutos posteriores sin una puerta nueva. No había ningún otro `vitest` corriendo: lo declaro.

| Sonda | Estado | Dónde queda el foco |
|---|---|---|
| SONDA-1 | Raíz de `ClaseLayout` con el foco (lo que deja en un navegador un clic en un espacio en blanco dentro de la clase); la clase pasa a archivada | **En el `h1`** (no se queda en la raíz) |
| SONDA-2 | Foco en «Mover» de la tarea (fila 13) | En el `h2` del tema "Unidad 1" |
| SONDA-3 | Renombrar tema abierto, foco en su campo (fila 11) | En el `h2` del tema |
| SONDA-4 | Ruta 20 (editar recurso), foco en "Título del recurso" | En el `h1` de la clase, como dice la tabla C |
| SONDA-6 | Una mutación de **otra** clase termina con `409 CLASE_ARCHIVADA` mientras esta está abierta | El detalle de **esta** clase se pide una vez más (+1) |
| SONDA-7 | Editor de categorías con el foco en un campo (fila 15) | En el `h1` |

### Problemas que bloquean

#### M-01 — Faltan tres estados vecinos del foco y de la escucha, y uno contradice lo declarado
- **Dónde:** `resumen-programador.md`, "Hermanos y estados vecinos de cada mecanismo", tablas B y C. En el código: `features/clases/hooks.ts`, `useFocoAlTituloDeLaClase` (segundo efecto) y `useDetalleViejoAnteClaseArchivada`; y `clase-layout.tsx`, la raíz con `tabIndex={-1}`.
- **Por qué importa:** `.claude/agents/manager.md`, "Verificación del resumen del programador", punto 4, y `AGENTS.md`, "Hermanos de un hallazgo" (decisiones del humano del 2026-10-02 y del 2026-10-05). La regla vale para todo remedio, también en el primer resumen: un estado vecino que falta, o lo que se dice de uno sin coincidir con el código, devuelve el resumen.
- **(a) Raíz con el foco: la tabla C no la lista, y lo que declara no coincide con el código.**
  - Este cambio hace enfocable la raíz de `ClaseLayout`. En un navegador, un clic en un espacio en blanco dentro de la clase ya no deja el foco en `<body>`: lo deja en la raíz (el resumen lo reconoce en "Pendiente").
  - En ese estado, cuando cambia la clave (la clase pasa a archivada o a activa), el segundo efecto de `useFocoAlTituloDeLaClase` ve `document.activeElement === raiz` y mueve el foco al `h1` (SONDA-1). No distingue entre la raíz que enfocó el gancho y la que enfocó la persona.
  - La tabla C dice "Foco soltado (en `<body>`) — No se mueve", y el comentario del gancho, "Si la persona soltó el foco … no se mueve". Dentro de la clase, ese `<body>` ya solo existe en jsdom: el caso vecino que lo fija prueba un estado al que no llega un navegador.
- **(b) Cambio de clase con el foco en un control que desaparece: no está en la tabla C.**
  - La tabla A dice que la clave cambia con el `claseId`, pero no qué pasa con el foco. Por lectura del código:
    - con la clase nueva ya en caché, la raíz se queda montada y el foco va al `h1` de la clase nueva;
    - sin ella, `ClaseLayout` pinta `Cargando`, la raíz no existe cuando corre el efecto y el foco se queda en `<body>`, como antes de 01d1.
  - No es una regresión, pero es un estado del mismo mecanismo y la regla pide declararlo.
- **(c) Un `409 CLASE_ARCHIVADA` de otra clase con esta abierta: no está en la tabla B.**
  - La escucha reacciona a cualquier error con ese código, sea de la clase que sea (lo pide el plan, Enmienda 3: "ante cualquier consulta o mutación"). Así, una mutación de la clase A que termina con la clase B abierta pide una vez más el detalle de B (SONDA-6, +1). El detalle de A lo marca su propio ayudante.
  - Es inofensivo y no pide cambio de código, pero la tabla B no lo dice.
- **Qué se espera:**
  - Las tablas B y C listan los tres estados y dicen, con lo que hace el código, cómo queda cada uno.
  - Para (a), el comportamiento coincide con lo declarado. Puede ser una de dos:
    - con la raíz enfocada por la persona, el foco no se mueve, como dice el contrato del gancho;
    - o el resumen justifica que vaya al `h1`, y el comentario del gancho deja de afirmar lo contrario.
  - En los dos casos, un caso propio lo fija enfocando la raíz, como hace SONDA-1.
  - Para (b) y (c), basta la declaración. Si el programador agrega casos, mejor.
  - Si cambia código o pruebas, el resumen trae otra vez `lint`, la suite de los módulos (comando literal) y `build`, con las cifras nuevas.
- **Re-verificación:** comparo la huella del árbol, reviso el cambio, repito `lint`, la suite de los módulos y `build`, y repito SONDA-1. Si el árbol no cambia (solo declaraciones), basta con cotejar las tablas contra el código.

### Las tres lecturas del programador
1. **Fila 14 («Mover» del material desde `seccion-de-tema.tsx`): aceptable, sin enmienda.**
   - `ElementoDeTrabajo` no tiene ninguna acción de escritura. Su único botón es «Ver material» (`aria-expanded`), que es de lectura.
   - El «Mover» del material lo pinta `ElementosDelTema`, en la misma condición que el de la tarea: `gestionar && !soloLectura && elemento.puedeMover`.
   - El inventario del plan apuntaba a un archivo que no escribe nada. La prueba busca el «Mover» dentro de la fila del material y comprueba que «Ver material» sigue: cubre lo que la fila 14 quería decir.
2. **El foco se queda en la fila o en su encabezado, no en el `h1`: aceptable, sin enmienda.**
   - `DESIGN.md` §7.14 manda llevar el foco al control o elemento más cercano que sigue y, si no queda ninguno, al encabezado del panel; nunca a `<body>`. Además, "no se le quita el foco a un control que la persona eligió".
   - Los mecanismos de fila (`useFilaEnFoco` de Avisos, de los temas y de los recursos) son la forma como el proyecto implementa §7.14. Corren antes porque son efectos de componentes hijos.
   - Mis sondas lo confirman: con «Mover» de la tarea y con renombrar el tema, el foco va al `h2` del tema; con «Borrar publicación», a la publicación (el caso vecino del programador). Fuera de una fila (categorías, ruta 20, formulario de publicar, «Restaurar»), va al `h1`. Nunca a `<body>`.
   - La celda de la matriz ("si el control desaparece, `h1`") se lee como el respaldo de todo lo que ninguna fila atiende. La precedencia se documenta en `DESIGN.md` con A-04.
3. **Una petición más del detalle al volver con el detalle viejo: aceptable, sin enmienda.**
   - Está acotada: +1, a lo sumo +2 en la prueba, y no entra en ciclo, porque el detalle es `lectura-del-alumno` y nunca recibe el código.
   - La decisión 4 (no pedir el código en una archivada) la reduce en cuanto llega el detalle nuevo.
   - Es la consecuencia, aceptada en la Enmienda 3, de dejar el detalle viejo con la vista desmontada.

### §D-9 contra el código
- **`ClaseLayout`:**
  - monta `useDetalleViejoAnteClaseArchivada(claseId)`, que se suscribe a las dos cachés, solo actúa ante el evento `updated` con la acción `error`, y se da de baja al desmontarse o al cambiar el `claseId`;
  - provee `ContextoDeSoloLectura` con `estaArchivada(data)`, siempre de forma explícita (S-15);
  - pinta el aviso bajo el encabezado, con la perspectiva por props: no suma ninguna llamada a `perspectivaDeRuta(`.
- **M-07 y N-16:** la invalidación es `exact: true` con `cancelRefetch: false`. El ayudante del gancho corre en el `onError` de la mutación, antes de que la caché notifique, y la escucha se une a esa misma petición. ADM-1D105 cuenta una sola.
- **`esClaseArchivada`:** vive en `components/clase/lib.ts`, mira solo `codigo` y solo importa `esApiError` de `services/apiClient` (O-01d1-4 y O-01d1-7).
- **El aviso:**
  - va en una `Card` propia, con `Archive` en `text-muted-foreground` y sin rojo, sin vidrio nuevo ni atributos de contexto (Enmienda 9);
  - los textos son los de §D-12, exactos;
  - «Restaurar» usa `useRestaurarClase(claseId)`, con la `mutationKey` de la tabla, y `useGestionEnVuelo`: `enEspera`, la guarda con ref y `sigueEnVuelo()`, sin `reset()`. Así se cierra el pendiente de la revisión final de 01c;
  - «Duplicar» es un enlace, no un botón: ADM-T1C16 sigue en verde.
- **Controles 1 a 21:** revisé cada uno en el diff.
  - La condición va alrededor del control, sin copiar JSX: la cifra de V-06 no se mueve por ellos.
  - Las filas 4, 6 y 18 se condicionan donde se pintan; la línea `const puedeBorrar = comentario.puedeBorrar` no cambia (O-01d1-3).
  - La fila 15 cambia el editor por `CategoriasDeSoloLectura`, que es texto sin controles.
  - Las filas 20 y 21 pintan `TEXTOS_DE_LA_CLASE.archivada` con su enlace de vuelta: la ruta de editar la clase cuelga del `ClaseLayout` del admin (`app/router.tsx:165`).
  - El código no se pide en una archivada.
- **`ClaseLayout` y el `h1` con `tabIndex={-1}`:**
  - no rompen ninguna vigilada: la suite literal incluye `clase-layout.test.tsx`, las de foco del módulo, `rutas-02c-r1`, `marco-r1` y `clase-03c1`, todas en verde;
  - siguen el patrón de foco del proyecto (raíces enfocables en editar recurso y en tareas; encabezados con `tabIndex={-1}` de §7.14);
  - lo único que traen es el estado vecino de M-01 (a).

### Matriz de avisos y recargas y O-01d1-8
- **O-01d1-8:**
  - `grep -c "marcarViejoElDetalleAnteClaseArchivada(queryClient, claseId, error)"` da 24; con la definición y las dos llamadas de la escucha, 27 apariciones.
  - Recorrí los 30 `useMutation` de `features/clases/hooks.ts`. Los 24 con `:claseId` en una ruta cerrada llevan el ayudante en la primera línea de su `onError`, antes de la comprobación de `errorQueRedirigeElCliente`. Los seis restantes son los que la tabla dice que no reciben el código: crear, unirse, archivar, restaurar, borrar y duplicar.
  - Los `onError` que devolvían una promesa la siguen devolviendo (`return avisarErrorDelTema(…)`, `avisarErrorDelRecurso`, `avisarErrorDelTexto`).
  - Ninguno de los cinco ayudantes trata `CLASE_ARCHIVADA` como error de campo: un solo aviso.
  - `renovarTrasError` no renueva nada con ese código (no está en `CODIGOS_QUE_RENUEVAN_LOS_TEMAS`).
- **Matriz:** cada fila coincide con el código.
  - «Restaurar»: `VALIDACION` con ADM-1C15 (a) a (c); el `403` y el `409` pasan por `esCambioDeLaClaseEnGestion`; `5xx` deja el aviso y el foco en «Restaurar»; los códigos que redirigen no avisan; con éxito se renuevan el detalle, las dos listas del admin y las propias, sin `claveClasesAnteriores`.
  - Escrituras, subida y código: como dice la tabla.
  - Lo que no coincide va en M-01 (c) y en N-01d1-1.

### Problemas que no bloquean
- **N-01d1-1 — La fila de la matriz "Solicitud de subida, vista desmontada" no dice la consecuencia.**
  - Dice "Sin escucha", y es correcto: `components/adjuntos` no se toca (Enmienda 3).
  - Lo que falta: el detalle no queda marcado como viejo. Si la persona vuelve antes de que pasen los 30 s de `staleTime`, la clase se ve activa, con sus controles, hasta la siguiente escritura (que recibe el `409` y la corrige) o hasta que vencen los datos.
  - Lo acepta el plan. Conviene escribirlo en la misma corrección de M-01.
- **N-01d1-2 — `clase-layout.tsx`: `soloLectura && data.archivadaEn && (…)` vuelve a leer `archivadaEn` fuera de `estaArchivada`** (N-11 lo quería en un solo lugar).
  - Es solo para estrechar el tipo de la fecha.
  - Se limpia si `estaArchivada` es un predicado de tipo. Puede esperar a 01d2, que vuelve a tocar `ClaseLayout` (N-05).

### Detalles menores
- Las filas 3 a 20 se prueban solo desde la perspectiva del maestro; la del admin solo en las filas 2 y 21, y la del alumno solo en ADM-1D102. Los componentes son los mismos y el contexto viene de `ClaseLayout`, así que no falta ninguna viñeta del plan.
- El caso vecino de «Borrar recurso» solo comprueba "no en `<body>`", sin decir dónde queda el foco.

### Pendientes con destino
- **Tipos en línea de `features/clases/hooks.ts`:** pasan a 01d2. `features/clases/types.ts` no está en "Se toca" de 01d1 y sí en el de 01d2. 01d1 no sumó ninguno (revisé las líneas nuevas del diff). El orquestador lo incluye en el encargo del programador de 01d2.
- **`docs/DESIGN.md`, con A-04 al cierre** (`docs/` fuera de `trabajo/` está en "No se toca"):
  - el patrón del aviso de clase archivada (la `Card` bajo el encabezado, el icono `Archive` atenuado y, para el admin, «Restaurar» y el enlace «Duplicar», `outline` y `sm`);
  - las categorías de solo lectura;
  - las rutas de escritura con su texto de archivada y "Volver a…";
  - la precedencia del foco: el mecanismo de la fila primero y el `h1` de la clase como respaldo.

### Puntos de ataque para el tester (cuando el resumen quede aceptado)
1. M-01 (a), una vez corregido: la raíz enfocada por la persona. También el foco en la raíz por un clic con la clase en una sección cualquiera, y después restaurar.
2. Cambio de clase con el foco perdido, con la clase nueva en caché y sin ella; y atrás y adelante entre una clase archivada y una activa.
3. Las filas 3 a 20 desde la perspectiva del admin; la fila 5 desde la del alumno.
4. Dos `409 CLASE_ARCHIVADA` a la vez (una mutación y la subida, o el código y una escritura): una sola petición del detalle y un solo aviso por disparador.
5. `retry: 1` de `app/providers.tsx` en `GET …/codigo`: que el intento intermedio no dispare la escucha y que el detalle se pida una vez.
6. «Restaurar» del aviso con `403 SIN_ACCESO_A_LA_CLASE` (borrada en otra pestaña): un aviso, y el detalle pasa a su error con el foco en su contenedor, no en `<body>`.
7. Una ruta de escritura (20 o 21) abierta con datos escritos cuando la clase pasa a archivada: que no salga ninguna petición del formulario después del aviso.
8. N-01d1-1: volver antes de que venzan los datos tras un `409` de la subida con la vista desmontada; que sea lo declarado y nada peor (ningún aviso doble ni un ciclo).

### Re-verificación de M-01

Veredicto: **ACEPTADO.** M-01 queda cerrado. El resumen de 01d1 pasa al tester (ronda 1).

Resumen: `resumen-programador.md` = `6d788553…`, subsección "### M-01 …" (línea 1588). Huella del árbol nuevo (mismo método que arriba): `5ab48da162cb6b060b5ec9f237e4a775b3275fff117adca9d0f0a318017bb8c7`.

**Qué cambió contra mi huella `34a8a73a…`:** solo los dos archivos que dice el resumen.
- **Cómo lo comprobé:** la huella era un hash concatenado y no guardé uno por archivo. Por eso lo comprobé de tres formas:
  - `git diff --stat 3ae6a00`: los 16 archivos restantes tienen las mismas cifras que en mi verificación, y solo `features/clases/hooks.ts` pasa de 148 a 157 líneas cambiadas;
  - por la hora de modificación, solo `hooks.ts` (21:54:26) y `clase-archivada-01d1-vista.test.tsx` (21:53:29) son posteriores a mi verificación; los 22 restantes son de antes de las 21:21;
  - para la prueba, la comparé con mi copia previa (la base de mis sondas): solo suma dos importaciones y el `describe` "M-01" al final; ningún caso anterior cambió.
- **`hooks.ts`:** en `useFocoAlTituloDeLaClase`, un `useLayoutEffect` con la misma clave anota si la raíz ya tenía el foco al pintarse el cambio, y el efecto que lleva el foco al `h1` no hace nada en ese caso. Lo demás, igual.

| Qué | Resumen | Mi corrida (desde `frontend/`) |
|---|---|---|
| `npm run lint` | exit 0, `> tsc -b` | Igual (puerta de carga 18 % y 23 % a las 22:03:16) |
| Módulos y vigiladas, comando literal | `158 passed (158)` · `3483 passed (3483)` | **Igual:** `Test Files 158 passed (158)` · `Tests 3483 passed (3483)` (22:04:55; puerta de carga 1 % y 23 % a las 22:04:47, ningún `vitest` corriendo), sin `FAIL` |
| `npm run build` | exit 0, `✓ built in 812ms` | exit 0, `✓ built in 813ms` |
| `npx vitest list` de los dos archivos | 88 (5 y 83); 6 con "M-01 (" | **Igual:** 5 y 83; 6 con "M-01 ("; los seis títulos del resumen existen tal cual |
| V-01 | 259, `825acabd…`, 0 diferencias | **Igual:** 259 rastreadas, ninguna sin rastrear; mi lista da `825acabd5f73…` |

**Sondas, repetidas fuera del repositorio:** las corrí sobre una copia de la prueba nueva, con 8 casos "SONDA", y dieron `8 passed | 83 skipped (91)` (puerta de carga 1 % y 10 % a las 22:08:50).

| Sonda | Estado | Resultado | Lo que dice el resumen |
|---|---|---|---|
| SONDA-1 (a) | Raíz con el foco; la clase pasa a archivada | Se queda en la raíz | Igual |
| SONDA-1b (a) | Raíz con el foco; se archiva y después se restaura | Se queda en la raíz | Igual ("dos cambios seguidos") |
| SONDA-1c | Foco en «Publicar anuncio»; se archiva y después se restaura | Va al `h1` y ahí se queda | Igual ("foco en el `h1`: no se mueve") |
| SONDA-6 (c) | Error `CLASE_ARCHIVADA` de una mutación ajena | Detalle +1, ningún aviso | Igual |
| SONDA-8 | Raíz con el foco; cambio a otra clase que está en caché | Se queda en la raíz | Igual |
| SONDA-9 | Raíz con el foco; cambio a otra clase que **no** está en caché | `<body>` | Ver N-01d1-3 |
| SONDA-10 | Atrás desde una activa (foco en un campo de categorías) a una archivada en caché, y adelante con el foco en el `h1` | `h1` de la archivada; después, el mismo `h1` con el nombre de la otra clase | Igual ("atrás y adelante" y "foco en el `h1`") |
| SONDA-11 | El detalle pasa a error (`403`) con el foco en «Publicar anuncio» | El contenedor del error (`useFocoAlPasarAError`) | Igual ("el detalle pasa a error") |

**Tablas B y C contra el código:**
- Las filas nuevas coinciden con el código y con las sondas:
  - "atrás y adelante" es un cambio de clase;
  - "el detalle pasa a error" queda como hoy: la raíz se desmonta y `useFocoAlPasarAError` lleva el foco al contenedor del error;
  - en "dos cambios seguidos", cada cambio de clave hace su propia anotación en el `useLayoutEffect`.
- "Trabajo y Recursos tienen el mismo mecanismo al cambiar de clase" es cierto: `clasePrevia` está en `trabajo-view.tsx:135`, `recursos-view.tsx:85` y `dudas-view.tsx:71`, además de `muro-view.tsx:87`.
- Las filas de N-01d1-1 y de (c) en la tabla B son correctas.

**La decisión de (a) frente a `DESIGN.md` §7.14 y `components/foco`: correcta.**
- §7.14 dice "no se le quita el foco a un control que la persona eligió", y `useFocoAlPerderseElControl` no mueve el foco de quien lo soltó (un clic en blanco borra su memoria).
- La raíz con `tabIndex={-1}` es el destino de respaldo del gancho. Que la persona la enfoque con un clic es la forma de soltar el foco dentro de la clase, así que lo coherente es no moverlo.
- **El mecanismo es sólido:** cuando el elemento con el foco sale del DOM, el navegador lo pasa a `<body>` en el mismo commit, antes de los efectos de layout. Así, el `useLayoutEffect` distingue la raíz que eligió la persona de la que enfoca el gancho en el efecto pasivo. `components/foco` no cambia (CAL-1D09).
- La mutación del programador (sin la guarda caen solo los dos casos de (a)) muestra que los casos detectan el defecto.

### Problemas que no bloquean (re-verificación)
- **N-01d1-3 — La fila "Cambio de clase con el foco en la raíz — No se mueve" vale solo con la clase nueva en caché.**
  - Sin caché, `ClaseLayout` pinta `Cargando`, la raíz se desmonta y el foco queda en `<body>` (SONDA-9). Es el mismo resultado y la misma razón que la fila "(b) … sin la nueva en caché", que sí está declarada, y es lo que pasaba antes de 01d1: no es una regresión.
  - La precisión entra en el próximo resumen del programador (ronda 1 o cierre), sin rehacer este.
- N-01d1-2 sigue para 01d2. N-01d1-1 quedó declarado en la tabla B.

### Puntos de ataque para la ronda 1 del tester
1. El `useLayoutEffect` de (a):
   - la raíz enfocada justo antes de que llegue un detalle nuevo (con y sin cambio de archivada);
   - un clic en blanco seguido de una navegación entre secciones de la misma clase y luego el cambio;
   - que nunca deje el foco en `<body>` cuando el control sí se perdió.
2. Cambio de clase y atrás y adelante entre una archivada y una activa, en las cinco secciones y en las rutas 20 y 21, con y sin caché (incluido N-01d1-3).
3. Las filas 3 a 20 desde la perspectiva del admin; la fila 5 desde la del alumno.
4. Dos `409 CLASE_ARCHIVADA` a la vez (una mutación y la subida, o el código y una escritura): una sola petición del detalle y un solo aviso por disparador. Lo mismo con un error de otra clase en vuelo (M-01 (c)).
5. `retry: 1` de `app/providers.tsx` en `GET …/codigo`: que el intento intermedio no dispare la escucha y que el detalle se pida una vez.
6. «Restaurar» del aviso:
   - con `403 SIN_ACCESO_A_LA_CLASE` (borrada en otra pestaña): un aviso, y el foco en el contenedor del error;
   - con la restauración en vuelo desde la tabla y el aviso que se desmonta y se vuelve a montar.
7. Una ruta de escritura (20 o 21) con datos escritos cuando la clase pasa a archivada: ninguna petición del formulario después del aviso.
8. N-01d1-1: volver antes de que venzan los datos tras un `409` de la subida con la vista desmontada; que pase lo declarado y nada peor.

## Verificación de la corrección de la ronda 1 — ADMIN-01d1

Veredicto: **ACEPTADO.** T-01 queda corregido. Todas las cifras del resumen coinciden con mi corrida. La tabla de las filas 1 a 21 y la de estados vecinos coinciden con el código y con mis sondas. No hay nada que bloquee.

Resumen: `resumen-programador.md` = `384a7e2b…`, "## ADMIN-01d1 — Corrección ronda 1 (2026-11-05)" (línea 1652). Reporte: `reporte-tester.md` = `6182f6cb…`, "## Ronda 1 — ADMIN-01d1" (línea 2766). Huella del árbol nuevo: `4c3fcd74dc865187038a18ecabb8e6d08da2d31343a198cd8d9e76da55d2b6dc`.

**Qué cambió contra mi huella `5ab48da1…`:** solo los archivos que dice el resumen, más la prueba nueva del tester.
- **`git diff --stat 3ae6a00`:** cambian solo seis archivos de producción, cada uno con 3 o 4 líneas más:
  - `publicacion-del-muro.tsx`, de 7 a 10;
  - `comentarios-de-publicacion.tsx`, de 11 a 14;
  - `elemento-de-recurso.tsx`, de 5 a 8;
  - `seccion-de-tema.tsx`, de 15 a 19;
  - `trabajo-view.tsx`, de 18 a 21;
  - `editar-recurso-view.tsx`, de 9 a 12.

  Los demás tienen las mismas cifras que en la re-verificación de M-01.
- **Hora de modificación:** solo esos seis, `clase-archivada-01d1-vista.test.tsx` (22:38:35) y la prueba nueva del tester (22:22:16) son posteriores a mi re-verificación.
- **El remedio:** las siete líneas que agrega son `if (soloLectura && <abierto>) set<Abierto>(false)`, cada una con su comentario T-01; en `editar-recurso-view.tsx`, la de `reinicios`.

| Qué | Resumen | Mi corrida (desde `frontend/`) |
|---|---|---|
| `npm run lint` | exit 0, `> tsc -b` | Igual (puerta de carga 19 % y 23 % a las 22:47:05) |
| Módulos y vigiladas, comando literal | `159 passed (159)` · `3536 passed (3536)` | **Igual:** `Test Files 159 passed (159)` · `Tests 3536 passed (3536)` (22:48:58; puerta de carga 6 % y 8 % a las 22:48:56, ningún `vitest` corriendo), sin `FAIL`. Cuadra: 3483 + 45 del tester + 8 |
| `npm run build` | exit 0, `✓ built in 919ms` | exit 0, `✓ built in 827ms` |
| `npx vitest list` de los tres archivos | 5, 91 y 45; 8 con "T-01 " | **Igual:** 5, 91 y 45; 8 con "T-01 ". Los 8 títulos del resumen existen tal cual |
| V-01 | 260: los 259 de `825acabd…` y la nueva en `8d58d05c…` | **Igual:** la lista de las 259 rastreadas da `825acabd5f73…`; la nueva, sin rastrear, da `8d58d05c409c…`. Los siete rojos del tester (ADM-T1D111 ×3 y ADM-T1D112 ×4) pasan en verde dentro de la suite |

### El remedio: `setState` durante el render
- **React lo permite**, y es el patrón documentado de "ajustar el estado cuando cambia una entrada", con dos condiciones que aquí se cumplen:
  - cada componente actualiza solo su propio estado;
  - lo hace con una guarda que no puede repetirse: solo pasa a `false` o a 0 cuando aún no lo está.
- **No queda ningún render intermedio con el control abierto:** React descarta la salida de ese render y vuelve a renderizar antes de confirmar, así que el DOM nunca recibe la confirmación ni el formulario abiertos en una clase archivada. Tampoco corren efectos de ese render descartado.
- **El proyecto ya usa el mismo patrón** en `editar-recurso-view.tsx:77` y `features/tareas/editar-tarea-view.tsx:54` (`esperaLaLecturaFresca`). No lo prohíbe ninguna regla de `CLAUDE.md` ni ninguna estática (la suite literal pasa completa).
- **Por qué no desmontar:** también cerraría los estados de lectura que en una archivada deben seguir («Ver comentarios», «Ver recurso», «Ver material») y movería el foco de las filas. Es la elección correcta.

### Las filas 1 a 21, una por una contra el código
- **Las que llevan el remedio (4, 6, 8, 11, 12, 18 y 20):** su estado vive en un componente que sigue montado con la clase archivada:
  - `confirmando` en `PublicacionComun`, `FilaComentario`, `SeccionDeTema` y `ElementoDeRecurso`;
  - `creando` en `TrabajoDeLaClase`;
  - `renombrando` en `SeccionDeTema`;
  - `reinicios` en `EditarRecursoDeLaClase`.
- **Las demás (1, 3, 5, 13 a 16, 19 y 21):** su estado de abierto o de borrador vive en un componente que se desmonta y nace limpio al volver:
  - `CodigoDeClase`, `FormularioPublicacion`, `FormularioComentario`, `MoverElemento`, `EditorDeCategorias`, `FormularioRecurso` y `FormularioClase`;
  - el nombre escrito de las filas 8 y 11 vive en `FormularioTema`, que también se desmonta.
- **Las filas 2, 7 y 17** son enlaces, sin estado.
- **Filas 9 y 10 ("petición en vuelo"):** la tabla dice que no les aplica y es correcto. `ordenEnVuelo` no es un estado de abierto: es la verdad de una petición, y se limpia en `onSettled`. Lo comprobé con dos sondas (SONDA-12, con la respuesta final `409` y `200`): «Bajar» se pulsa, se archiva la clase y se restaura con el `PUT` todavía en vuelo.
  - Al restaurarse, «Bajar» vuelve en espera (`aria-busy="true"`) y un clic más no manda otro `PUT`: uno en total.
  - Al soltar la respuesta, el foco pasa del encabezado del tema (donde lo dejó el archivado) a «Bajar». Es la regla de hoy (§7.14: "tras Subir o Bajar, el foco vuelve al botón del tema que se movió, salvo que la persona ya lo haya llevado a otro lado"), y la persona seguía en esa sección.
  - Con `409` sale un solo aviso, y el detalle renovado ya no está archivado: no hay aviso fijo ni ciclo. Con `200`, ningún aviso.
- **El hermano de la fila 20 (`reinicios`): correcto y bien encontrado.**
  - `reinicios` es la `key` del formulario y, si es mayor que 0, activa `enfocarAlMontar`. Al volver a activa, el formulario nacía con esa marca y le quitaba el foco a la persona.
  - Ahora vuelve a 0 en solo lectura, y el formulario nace como al abrir la ruta con los datos de la caché.
  - Si `recargarTrasConflicto` termina con la clase ya archivada, su `setReinicios(n + 1)` vuelve a 0 en el render siguiente por la misma línea: no queda ningún hueco.

### El reinicio no mueve el foco
- Al pasar a `false`, los efectos de foco no hacen nada:
  - los de `confirmandoAnteriorRef` (publicación, comentario y recurso) enfocan el botón de borrar, que no está pintado: su ref es `null`;
  - `focoAlCerrarRef` de `SeccionDeTema` y de `TrabajoDeLaClase` solo lo marcan los manejadores de la persona («Cancelar», cerrar el formulario).
- **Sondas:**

| Sonda | Estado | Tras archivar | Tras restaurar |
|---|---|---|---|
| SONDA-14 | Foco en «Cancelar» de la confirmación de borrar una publicación | La publicación (mecanismo de la fila) | Se queda en la publicación; la confirmación, cerrada |
| SONDA-15 | Confirmación de borrar un tema abierta y el foco en «Cerrar sesión» | En «Cerrar sesión» | En «Cerrar sesión» |
| SONDA-16 | Renombrar abierto, con texto y el foco en el campo | El encabezado del tema | Se queda ahí; el formulario, cerrado |

### Estados vecinos: completos
La tabla del resumen cubre lo que pide el mecanismo "pasa a solo lectura y vuelve a activa":
- por cada camino: con la escritura y «Restaurar», con otra pestaña y con otra sesión;
- vueltas repetidas;
- con la vista desmontada y con un cambio de clase (fijan el estado vecino; no prueban el remedio, y el resumen lo dice);
- con un `409` en vuelo y con el borrado en vuelo con su guarda.

Con mis sondas suman el foco y las filas 9 y 10 en vuelo.
- **Un vecino que no está en la tabla, comprobado en el código:** se restaura con el `DELETE` de una publicación o un comentario todavía en vuelo y la persona vuelve a abrir la confirmación. «Sí, borrar» nace con `enEspera={borrar.isPending}`, porque la mutación vive en el componente que sigue montado, así que no sale otro `DELETE`. Va a los puntos de ataque; no hace falta otra declaración.

**N-01d1-3:** cerrado. La precisión está en el resumen ("solo vale con la clase nueva en caché"), y la confirmó SONDA-9 de la re-verificación de M-01.

### Detalles menores
- En SONDA-12 con `409`, el aviso "Esta clase está archivada…" llega cuando la clase ya se restauró. Es el texto del servidor en el momento de la petición, y el detalle renovado lo desmiente sin otro aviso. Es inherente a la carrera; no pide cambio.

### Puntos de ataque para la ronda 2 del tester
1. Restaurada con un `DELETE` en vuelo (publicación, comentario, tema o recurso): volver a abrir la confirmación y pulsar «Sí, borrar» antes de que se asiente. Una sola petición y un solo aviso.
2. Archivar y restaurar dos veces seguidas con la primera recarga del detalle aún en vuelo, con cada control de estado abierto: nada se reabre y no se confirma ningún render con el control abierto.
3. Ruta 20: `recargarTrasConflicto` en vuelo cuando la clase pasa a archivada, y restaurar después. El formulario nace sin quitar el foco y con la versión de la caché.
4. Los estados de lectura («Ver comentarios», «Ver recurso», «Ver material») se conservan al archivar y al restaurar, con el foco dentro de ellos.
5. «Subir» o «Bajar» en vuelo al archivar y restaurar, con el foco ya llevado por la persona a otra sección: al asentarse, el foco no se mueve.
6. Las confirmaciones abiertas desde la perspectiva del admin y la del alumno (la fila 6 con su propio comentario), al archivar y restaurar.

## Verificación de la corrección de la ronda 2 — ADMIN-01d1

Veredicto: **ACEPTADO.** T-02 queda corregido y el mecanismo de generación es correcto. Todas las cifras coinciden, y el comando literal sin bandera da verde con el equipo conectado a la corriente. No hay nada que bloquee. Queda un estado declarado a medias (N-01d1-4), que acepto. `editar-tarea-view.tsx` necesita una enmienda antes de la ronda 0 de 01d2.

Resumen: `resumen-programador.md` = `d24ebf5e…`, "## ADMIN-01d1 — Corrección ronda 2 (2026-11-06)" (línea 1752). Reporte: `reporte-tester.md` = `31f96886…`, "## Ronda 2 — ADMIN-01d1" (línea 2922). Huella del árbol nuevo: `46e9b94c08c68a104f54031fafeffb3499b5bcf79d7e65ceae48b96ee33d3b82`.

**Qué cambió contra mi huella `4c3fcd74…`:** solo lo que dice el resumen.
- **`git diff --stat 3ae6a00`:** `editar-recurso-view.tsx` pasa de 12 a 21 líneas y `trabajo-view.tsx`, de 21 a 26. Los demás archivos rastreados tienen las mismas cifras.
- **Hora de modificación:** solo son posteriores a mi verificación anterior esos dos, `components/clase/hooks.ts` (sin rastrear), `clase-archivada-01d1-vista.test.tsx` y la prueba nueva del tester.
- **Límite de la comprobación:** como en las anteriores, la huella es un hash del conjunto, así que esto se apoya en las cifras y en las horas.

| Qué | Resumen | Mi corrida (desde `frontend/`) |
|---|---|---|
| Equipo | A batería en sus corridas (`BatteryStatus` 1, 66 %) | Conectado: `BatteryStatus` 2 antes y después de la suite (de 32 % a 47 %) |
| `npm run lint` | exit 0, `> tsc -b` | Igual (puerta de carga 3 % y 5 % a las 10:28:44) |
| Módulos y vigiladas, **comando literal sin bandera** | No quedó verde: `8 failed` y `9 failed` (más de 1000 s). Solo con `--maxWorkers=4`: `Tests 3567 passed (3567)` · 160 (740 s) | **Verde a la primera:** `Test Files 160 passed (160)` · `Tests 3567 passed (3567)`, 202 s (10:30:10; puerta de carga 17 % y 14 % a las 10:30:03, ningún `vitest` corriendo), sin `FAIL` |
| `npm run build` | exit 0, `✓ built in 3.00s` | exit 0, `✓ built in 862ms` |
| `npx vitest list` | 5 y 103 en sus dos archivos; 12 con "T-02" | **Igual:** 5 y 103; 12 con "T-02", y sus títulos existen tal cual. Las del tester: 45 y 19 |
| V-01 | 261: los 259 de `825acabd…`, `8d58d05c…` y `32fd1be4…` | **Igual:** la lista de las 259 rastreadas da `825acabd5f73…`; las dos sin rastrear dan `8d58d05c…` y `32fd1be4…` |

**Lo que dice de la corrida:** las fallas del programador eran del entorno, no del código. Su causa probable era correcta: con corriente, la misma selección tarda 202 s y no cae nada, tampoco ADM-T1D110. ADM-T2D103b, el rojo del tester, está en verde.

### El mecanismo de generación: correcto
- **Se captura en el render del control.** `alGuardar` y `recargarTrasConflicto` nacen en `contenido()` con el `generacion` de ese render, y el manejador del formulario guarda las props del render en que se envió. En «Subir» y «Bajar», `generacionDelOrdenRef` se escribe en el manejador, con el valor del render del clic.
- **`sigueVigente` no deja sin correr un efecto legítimo.** La generación solo sube al entrar en solo lectura. Lo comprobé con sondas, sin nada en vuelo al archivar y restaurar:

| Sonda | Estado | Resultado |
|---|---|---|
| SONDA-22a | Archivar, restaurar y un guardado nuevo con `200` | Navega a Recursos |
| SONDA-22b | Archivar, restaurar y un guardado nuevo con `409` | Pide la recarga, reinicia con la versión del servidor y enfoca el campo |
| SONDA-22c | Archivar, restaurar y un «Subir» nuevo con el foco en otro control del tema | El foco vuelve a «Subir» |
| SONDA-23 | La clase nace archivada, se restaura y se guarda | Navega a Recursos |

- **Orden de los efectos:** en `trabajo-view.tsx`, el efecto que actualiza la ref va antes que el del foco diferido, porque el gancho se llama antes.
- **Detalle sin consecuencia:** `vigenteRef` se actualiza en un efecto pasivo, así que queda una ventana de milisegundos entre el commit y ese efecto. Si un guardado llegara justo ahí, navegaría a Recursos como si hubiera llegado un instante antes, y un reinicio lo absorbe el `setReinicios(0)` del render siguiente. No pide cambio.

### Los hermanos corregidos y las tablas contra el código
- **`alGuardar` de la ruta 20, el `409` después de restaurar y el foco diferido de «Subir» y «Bajar»:** correctos, cada uno con su caso y su control sin archivar. Con el foco diferido cambia lo que vi en SONDA-12 de la ronda anterior (el foco ya no pasa del encabezado del tema al botón), y es lo correcto: la persona ya no estaba en ese control.
- **Tabla de efectos asíncronos:** revisé con `grep` cada `mutate`, `mutateAsync`, `navigate` y `focus` de los componentes de las filas 1 a 21 (`codigo-de-clase`, `formulario-publicacion`, `formulario-comentario`, `formulario-tema`, `mover-elemento`, `editor-de-categorias`, `formulario-recurso` y `formulario-clase`). Cada fila coincide con el código: los que usan `mutate` con callbacks por llamada no los ejecutan con el componente desmontado, y los dos que usan `mutateAsync` siguen sobre la instancia desmontada, sin efecto en la nueva.
- **Tabla de órdenes de llegada:** coincide, salvo lo que falta decir en N-01d1-4.
- **La mutación del programador:** no la repetí. Según su resumen, sin `sigueVigente` caen 7 casos, y los 7 que pasan igual (controles, y estados que absorbe T-01 o el desmontaje) fijan estados vecinos, no este remedio; eso es coherente con lo que leí en el código.

### La decisión del `PUT` con éxito después de restaurar: aceptable
Sonda SONDA-20, con un servidor que compara la versión de verdad:
1. El formulario restaurado nace con lo de la caché ("Guía de estudio"), no con lo que se envió ("Guía nueva").
2. La persona escribe. Llega el `200`: "Cambios guardados", sigue en la ruta, conserva lo escrito y conserva el foco.
3. Su siguiente guardado manda la **versión 0** y recibe `409 RECURSO_MODIFICADO`. El servidor no se pisa: sigue en "Guía nueva". El formulario se reinicia con esa versión, con el foco en el campo, y lo escrito después se pierde.

**¿Cumple el plan?** El plan no cubre este orden, y su principio sí se respeta: §D-9 y §7.14 piden no quitarle a la persona lo que tiene en pantalla sin que lo pida. Navegar habría descartado lo escrito en silencio.

**¿Es correcto el aviso "guardado" con el formulario sin recargar?** Sí. Es verdad: el servidor guardó lo que la persona envió, y §7.21 dice que ninguna otra recarga toca lo escrito ni la versión de apertura.

**El único texto impreciso** es el del `409`: dice "Otra persona guardó…" cuando fue ella misma. Exige tres cosas a la vez (un `PUT` en vuelo, archivar y restaurar antes de que responda), así que no pide un texto nuevo.

### ADM-T1D110: fragilidad de la prueba, no defecto del código
La sonda SONDA-24 repite el camino con `retry: 1`: vuelve con el detalle viejo y publica enseguida.

| Momento | Detalle extra | `GET …/codigo` pedidos |
|---|---|---|
| Donde la prueba afirma | +1 | 2 |
| 2.5 s después | **+2** | 3 |
| 5 s después | +2 (sin ciclo) | 3 |

- **El `+2` ocurre siempre.** El error final del código llega cerca de 1 s después (el reintento de `retry: 1`), y su escucha pide el detalle otra vez. La prueba afirma `+1` porque suele mirar antes de ese segundo. En una corrida lenta el error llega primero, y por eso cayó con `expected 3 to be 2`. Es la petición extra de la decisión 9, ya aceptada: acotada y sin ciclo.
- **También son frágiles dos precondiciones del mismo caso:** `expect(avisoFijo()).toBeNull()` y `expect(detallesDe(A)).toBe(detallesAntes)`, porque el aviso aparece solo a los 1070 ms (SONDA-25).
- **Queda para el tester, en la ronda 3, con un C-n:** el caso debe dejar de depender del tiempo, por ejemplo reteniendo con una promesa la respuesta del código, sin relajar lo que protege (un solo aviso, ninguna solicitud de subida nueva, ningún ciclo). Solo él cambia ese archivo; V-01 se actualiza con su hash nuevo.

**Precisión a N-01d1-1: correcta.** Lo que escribí ("hasta la siguiente escritura") era demasiado fuerte para el maestro y el admin. Con SONDA-25, al volver antes del `staleTime` ven la clase activa cerca de 1 s y después aparece el aviso solo, sin escribir nada, con el detalle +1 y sin avisos emergentes. Lo que escribí sigue valiendo para quien no pide el código.

### El choque para 01d2: hace falta una enmienda antes de su ronda 0
- **El choque es real.** La condición de §D-9 (Enmienda 2: "no toca `recargarTrasConflicto`") fue mía, para que la guarda de archivada no alterara el camino del `409` de hoy y T-01 de CLASES-03d siguiera en FORO-01. Cuando la fila 36 oculte el formulario, `editar-tarea-view.tsx` tendrá los dos problemas de 01d1:
  - `reinicios` sobrevive en la vista (T-01);
  - `recargarTrasConflicto` y el `navigate(detalle)` de `handleGuardar` llegan sobre el formulario restaurado (T-02).
- **Lo que debe decir la enmienda (resultado, no implementación):**
  1. La condición se reemplaza. La guarda sigue siendo un retorno temprano. `editar-tarea-view.tsx` usa además el mismo mecanismo (`setReinicios(0)` en solo lectura y `useGeneracionDeSoloLectura`) en `recargarTrasConflicto` y en `handleGuardar`.
  2. Sin pasar por una archivada, el camino del `409` no cambia, con un caso de control. La falta de la guarda de vista desmontada (T-01 de CLASES-03d) sigue en FORO-01.
  3. "Pruebas requeridas" de 01d2 lleva, para las filas 22 a 37, las dos tablas de 01d1: los estados de abierto de cada control (T-01) y los efectos asíncronos con sus órdenes de llegada (T-02).
- **No es una decisión de producto:** la escribe el arquitecto y la verifico yo.

### Problemas que no bloquean
- **N-01d1-4 — Un `409 RECURSO_MODIFICADO` que llega con la clase archivada deja que el formulario restaurado nazca de una caché que ya se sabe vieja.**
  - La tabla dice "No pide la recarga", y es cierto; no dice la consecuencia.
  - SONDA-21: tras restaurar no sale ningún `GET` del recurso, y el formulario nace con "Guía de estudio" y la versión 0, aunque el servidor ya va en otra. El siguiente guardado recibe otro `409`, se reinicia y lo escrito después de restaurar se pierde.
  - Por lectura del código (no lo corrí), antes de la primera comprobación de `sigueVigente` la recarga salía igual y el formulario nacía fresco. El comentario de `renovarTrasErrorDelRecurso` ("con la vista montada, la recarga la hace `recargarTrasConflicto`") ya no vale en este estado.
  - **Por qué no bloquea:** nada se sobrescribe, el `409` dice la verdad (sí fue otra persona), el foco va al campo como en todo conflicto y exige un conflicto real, archivar antes de la respuesta y restaurar con la vista abierta.
  - **Recomendación:** no tocar código antes de la última ronda. Queda declarado aquí, el programador lo incorpora a la tabla en su próximo resumen, y el tester no lo cuenta como hallazgo nuevo. Si el orquestador prefiere cubrirlo antes de la ronda 3, como hizo con los vecinos de 01c, el resultado esperado es que el formulario restaurado nazca con la versión fresca.
- N-01d1-2 sigue para 01d2.

### Para el orquestador y el humano
- **Batería:** a batería, la suite tardó más de 1000 s y falló por tiempos vencidos; con corriente, 202 s y en verde. Conviene que la puerta de carga mire también `BatteryStatus` antes de una suite. Una corrida a batería que falla por tiempos no es un resultado: lo decide el humano.
- **Medición:** T-02 es estado vecino del hermano de la fila 20, como ya anotó el orquestador. En esta corrección el programador recorrió todos los efectos asíncronos y encontró tres más antes de que los viera nadie.

### Puntos de ataque para la ronda 3 del tester (la última)
1. **Primero, el C-n de ADM-T1D110**, para que el caso no dependa del tiempo.
2. **Manejadores de varios pasos:** con el archivo en subida (el `PUT` al almacén retenido), archivar y restaurar en las filas 3, 16 y 20. La instancia vieja sigue: un solo aviso, el formulario nuevo no cambia y nadie le quita el foco.
3. **Cambio de clase con efectos en vuelo:** un orden o un guardado en la clase A, cambio a una clase archivada y regreso, con y sin caché.
4. **Una segunda vuelta tras un reinicio legítimo:** `409`, reinicio, archivar y restaurar, otro `409` y otro reinicio. La marca de `enfocarAlMontar` y las generaciones no se confunden.
5. **«Subir» o «Bajar» que se asienta con la clase todavía archivada y restaurar después:** el foco no salta al restaurar.
6. **Los mismos órdenes de la ruta 20 desde la perspectiva del admin**, y el primer guardado justo después de restaurar.
7. **N-01d1-4 no se cuenta como hallazgo:** se puede atacar que su segundo `409` deje un solo aviso por envío y el foco en el campo.

## Revisión final — ADMIN-01d1

Fecha: 2026-11-06. Plan: `plan.md`, SHA-256 `3822b6c0adb9823edb9c552dd6cfac78f4e0ffa2f4eca9fcade0be07d4fbdd78` (Enmiendas 1 a 10), comprobado. Tester: `reporte-tester.md` = `30aaf7e8…`, "## Ronda 3 — ADMIN-01d1" (línea 3035), ROTO por T-03. Programador: `resumen-programador.md` = `abc88e9a…`, "## ADMIN-01d1 — Corrección ronda 3 (2026-11-06)" (línea 1863). Por decisión del humano (2026-11-06), T-03 lo verifica el manager, sin cuarta ronda del tester.

Veredicto: **APROBADO**
Verificación propia: lint exit 0 · test frontend `Tests 6456 passed (6456)` · `Test Files 292 passed (292)` a la primera · build exit 0 (`✓ built in 824ms`)

### Entorno y corridas
- 01d1 no toca `shared/` ni el backend: basta la suite completa del frontend. La otra copia de trabajo no se usa (`aprobacion.md`). Sin navegadores.
- **Equipo:** `BatteryStatus` 2 antes de `lint` y `build`, antes de la suite y después de ella.
- **Puerta de carga:** 11 % y 13 % a las 11:22:31 (`lint` y `build`); 11 % y 10 % a las 11:23:46 (suite), sin ningún `vitest`.
- **Una sola corrida de la suite:** inicio 11:23:52, 271.51 s, sin ningún `FAIL`. Nada se repitió.
- **Huella del árbol:** `82c41d68e9f7012f44329aa2423b20e28297564bb41dd2d3c5bf33087c320412`.

| Qué | Referencia | Mi corrida (desde `frontend/`) |
|---|---|---|
| `npm run lint` | exit 0 | exit 0; `> tsc -b` sin errores |
| `npm run build` | exit 0 | exit 0, `✓ built in 824ms` |
| Suite completa, `npx vitest run` | Cierre de 01c: 6229 casos en 287 archivos | **`Test Files 292 passed (292)` · `Tests 6456 passed (6456)`** |
| Cuadre | 6229 + 120 del programador (5 + 115) + 107 del tester (45 + 19 + 43) = 6456; 287 + 5 = 292 | **Exacto.** `npx vitest list` con `grep -a` da 6456 y 292 |
| Suite de módulos del resumen | `3622 passed` en 161 archivos | La cubre la completa. `npx vitest list` con el comando literal, contado con `grep -a`: **3622 y 161** |

### T-03: corregido
- **`useRegenerarCodigo`:** los avisos viven en el gancho (`features/clases/hooks.ts:628-638`), así que corren aunque `CodigoDeClase` ya no esté. ADM-T3D111 (a), (b) y (c), los tres rojos del tester, y sus dos controles están en verde.
- **`codigo-de-clase.tsx`, solo lo autorizado:** el diff contra `3ae6a00` son 12 líneas en `handleRegenerar`, que dejan `regenerar.mutate(undefined, { onSettled: () => setConfirmando(false) })` y un comentario. `toast` se queda porque lo usa «Copiar».
  - **Sin aviso doble:** el componente ya no avisa.
  - **T-06 de CLASES, intacto:** un fallo sigue cerrando la confirmación y dando un aviso; lo fijan `clases-r1.ataque` y "T-03 (T-06 de CLASES)".
  - **El foco, como hoy:** `debeEnfocarRegenerar` solo lo marca «Cancelar».
- **Decisión 1, `409 CLASE_ARCHIVADA` con el texto de archivada: correcta.** El "Inténtalo de nuevo" del texto fijo es una frase de recuperación que en una archivada no se cumple. El texto usado ya es el de §D-12 y el de la matriz, y pasa por `mensajeDeErrorClases`. No entra ningún texto nuevo. CH3-B08 no cambia: un `VALIDACION` o un `SERVICIO_OCUPADO` siguen con el texto fijo.
- **Decisión 2, los códigos que redirige `apiClient` ya no avisan en regenerar: correcta.** Es la regla de CLASES-03c2 (Enmienda 7): la página se va. El cambio es a propósito y tiene dos casos. Las mutaciones anteriores que sí avisan son una incoherencia que ya existía; revisé la lista en el código y coincide. Son 12 entradas: `avisarErrorDelTema` cubre dos mutaciones, así que son 13 ganchos. Van a ESTADO §3.
- **Hermano `useGuardarCategorias`: correcto.** Es el mismo patrón que `useComentar`: el error de una fila lo pinta el editor si sigue montado; si no, avisa el gancho, sin la ruta del campo. `editor-de-categorias.tsx` no cambia, y su caso de control fija que con el editor montado no hay aviso.
- **La tabla de dónde vive cada aviso, contra el código: correcta.** Reemplaza con razón a la fila 1 de la ronda 2 y a la fila de O-01d1-8. Revisé cada fila contra los ganchos (`features/clases/hooks.ts`) y los callbacks de `mutate` de los componentes. Comentar y mover, que el tester no había corrido, ahora tienen caso propio.
- **Mi parte:** T-03 se me pasó dos veces. En la verificación del resumen di por buena la fila de O-01d1-8 ("su aviso sigue en el componente"), y en la ronda 2 escribí que la tabla de efectos coincidía con el código, con la fila 1 mal clasificada ("Solo cierra"). Revisé qué efecto tenía cada callback, no qué se perdía si no corría. La tabla nueva hace esa pregunta, y por eso va a la Enmienda 11.
- **Detalle anterior a 01d1 (por lectura, no lo corrí):** al asentarse «Sí, regenerar», el botón con el foco sale y nada lo recoloca. Ya era así, y la autorización de T-03 no lo cubre. Va al `chore` de foco.

### (a) 01d1 cumple su parte del plan

| Parte del plan | Estado |
|---|---|
| §D-9, mecanismo | `ContextoDeSoloLectura` y `useSoloLecturaDeLaClase` en `components/clase/`, `estaArchivada` en `features/clases/lib.ts` y el proveedor explícito en `ClaseLayout` (S-14, S-15, N-11) |
| §D-9, aviso | `aviso-de-clase-archivada.tsx`, con la perspectiva por props; «Restaurar» (`outline`, `enEspera`, ref y la `mutationKey` de la tabla) y el enlace «Duplicar» |
| §D-9, inventario | Filas 1 a 21, cada una revisada en el diff. Fila 14: sin cambio en `elemento-de-trabajo.tsx`, que no escribe nada; su «Mover» está en `seccion-de-tema.tsx`. Filas 20 y 21: texto de archivada con su enlace de vuelta |
| §D-9, Enmienda 3 (M-07) | `useDetalleViejoAnteClaseArchivada` en `ClaseLayout`, con `esClaseArchivada` en `components/clase/lib.ts`; `components/adjuntos/` y los cuatro formularios sin cambios |
| N-16 | La escucha solo reacciona a la transición a error y se vuelve a suscribir al cambiar de clase. **Sin caso propio:** N-16 pedía que ADM-1D109 lo fijara y no lo hace, y no lo vi en mi verificación. Lo comprobé con una sonda (SONDA-30): tras cambiar de clase sin desmontar, un `CLASE_ARCHIVADA` pide una vez el detalle de la nueva (+1) y no toca el de la vieja. El código cumple; el caso va a la Enmienda 11 (ver (d)) |
| §D-12 | Textos exactos: los dos avisos fijos, "Esta clase está archivada: solo se puede consultar." y "Volver a la clase" |
| Matriz de avisos y recargas | Filas de 01d1 contra el código: coinciden, con la corrección de T-03 |
| ADM-1D101 a 1D109 | Existen, con sus títulos; `npx vitest list`: 3, 7, 4, 43, 7 (incluye los 5 vecinos del foco), 8, 4, 1 y 5 |
| Enmienda 9 | Ningún archivo nuevo escribe vidrio fuerte, vidrio azul ni atributos de contexto; V-07 sin cambios |
| Enmienda 10 | Ningún código fijo nuevo en los mapas de errores (CH3-B01 en verde); sin `claveClasesAnteriores` |

**Lo que el plan no pedía y entró:** solo los remedios de T-01 a T-03, con `useGeneracionDeSoloLectura` y el cambio autorizado en `codigo-de-clase.tsx`. Ningún control ni pantalla de más.

**"No se toca" contra `3ae6a00`:** limpio. Cambian 18 archivos rastreados de `frontend/` y hay 10 nuevos: todos en "Se toca" de 01d1, salvo `codigo-de-clase.tsx`, autorizado, y las `*.ataque` del tester. `backend/`, `shared/`, `infra/`, `CLAUDE.md`, `AGENTS.md`, `docs/ESTADO.md` y `docs/DESIGN.md` sin cambios. Fuera de los paquetes, solo `docs/trabajo/ADMIN-01-administracion/`.

**Definición de terminado:** cumple RF y RN de su parte; sin endpoint, migración ni configuración nuevos; `lint`, `build` y `test` en verde; los documentos van al cierre del encargo (abajo).

**Reglas que no se rompen:** no aplican las del backend. La interfaz solo oculta: el backend ya niega con `409 CLASE_ARCHIVADA` (01a). Ninguna seguridad queda solo en el frontend.

**Estilo de `CLAUDE.md`:** módulos y reglas 1 a 9 respetados, retornos tempranos, sin `?? []`, sin tipos fuera de `types.ts` en lo nuevo. `setState` durante el render, con guarda: patrón ya usado en el proyecto.

**Lista de diseño:**
- Solo tokens y componentes de `components/ui/`, sin vidrio nuevo.
- El estado va con texto e icono, sin rojo.
- Una acción principal por vista: «Restaurar» y «Duplicar» son `outline`, y «Crear tarea» no se pinta en una archivada.
- Textos concretos, sin emojis.
- Vacío de categorías con su texto; en solo lectura no hay acción que ofrecer.
- 360 px: el aviso pasa a columna y las categorías usan `wrap-anywhere`. **No lo vi en un navegador:** entra en la comprobación humana de 01g.
- El patrón nuevo del aviso se documenta con A-04, al cierre del encargo: `docs/DESIGN.md` está en "No se toca" hasta entonces.

### (b) Hallazgos

| Hallazgo | Qué era | Cómo quedó |
|---|---|---|
| M-01 (media) | Foco: raíz con el foco que iba al `h1`; cambio de clase y error de otra clase sin declarar | La raíz elegida por la persona no se mueve (`useLayoutEffect`); declarado; 6 casos y mis sondas |
| T-01 (media) | Al restaurar se reabría lo que estaba a medio usar | Reinicio en el render en que se ve la clase en solo lectura; ADM-T1D111 y T1D112 en verde |
| T-02 (media) | Ruta 20: la recarga tras un conflicto en vuelo reiniciaba el formulario restaurado | `useGeneracionDeSoloLectura`; ADM-T2D103b en verde; hermanos `alGuardar`, `409` tras restaurar y foco diferido |
| T-03 (media) | «Regenerar código» perdía su aviso con el componente desmontado | Avisos en el gancho; ADM-T3D111 (a), (b) y (c) en verde; hermano `useGuardarCategorias` |
| N-01d1-1 | Subida con `409` y vista desmontada | Declarado y precisado: el maestro y el admin ven el aviso cerca de 1 s después de volver |
| N-01d1-3 | Cambio de clase sin caché, con el foco en la raíz | Declarado; igual que antes de 01d1 |

**Sin desacuerdos abiertos:** el programador no pidió cambiar ninguna `*.ataque`. La C-n de ADM-T1D110 la pedí yo por una dependencia del tiempo, y la aplicó el tester.

### (c) V-01: 262 `*.ataque`
- **Rastreadas, 259:** la lista rearmada con `git ls-files` y `sha256sum` da `825acabd5f732dec57c0e06839b3f584d00e9bc325fa7a758e5e045a8445d73f`, la de la ronda 0.
- **C-10:** contra `3ae6a00` solo cambia `styles/clases-r1.ataque.test.ts`, en `0ea4c6b87c65c927…`.
- **Nuevas del tester, sin rastrear, 3:**
  - `clase-archivada-01d1-r1.ataque.test.tsx`, `b465fd900c2a1268…` (con la C-n de ADM-T1D110);
  - `clase-archivada-01d1-r2.ataque.test.tsx`, `32fd1be4f0b95796…`;
  - `clase-archivada-01d1-r3.ataque.test.tsx`, `a188c90deb61bafe…`.
- **El programador no tocó ninguna:** cada cambio lo hizo el tester y consta en su reporte.

### (d) Lo abierto, con su destino

| Qué | Destino |
|---|---|
| N-01d1-4: `409 RECURSO_MODIFICADO` con la clase archivada; al restaurar, el formulario nace de una caché vieja | ESTADO §3, al cierre (decisión del orquestador) |
| «Sí, regenerar» sin guarda con ref | **Ya tiene destino:** es la fila 3 de CHORE-04 (`docs/ESTADO.md:279`), y E-38 la deja ahí. No hace falta otra fila: basta una nota de que los avisos pasaron al gancho |
| Las 12 entradas (13 ganchos) que avisan ante un código que redirige `apiClient` | ESTADO §3, al cierre, con destino carril trivial o `chore` posterior |
| Foco tras «Sí, regenerar» (anterior a 01d1, por lectura) | `chore` de foco y navegación |
| N-01d1-2 (`estaArchivada` como predicado de tipo) y los tipos en línea de `features/clases/hooks.ts` | 01d2, que tiene `types.ts` en "Se toca" |
| `docs/DESIGN.md` (A-04) | Cierre del encargo: el aviso de clase archivada, las categorías de solo lectura, las rutas de escritura con su texto y "Volver a…", y la precedencia del foco (la fila primero, el `h1` de respaldo; la raíz elegida por la persona no se mueve) |
| `CLAUDE.md` (A-05) | Cierre del encargo. A "`components/clase/` con el contexto de solo lectura" conviene sumarle `useGeneracionDeSoloLectura` y `esClaseArchivada` |
| Caso de N-16 en la suite (la sonda SONDA-30 confirma que el código cumple) | 01d2, por la Enmienda 11 |
| Enmienda 11 | Antes de la ronda 0 de 01d2 (abajo) |

**La Enmienda 11 debe llevar una tabla más de la que anoté en la ronda 2.** Además de `editar-tarea-view.tsx` con el mismo mecanismo y el caso de control del `409`, "Pruebas requeridas" de las filas 22 a 37 lleva **tres** tablas de 01d1:
1. los estados de abierto de cada control (T-01);
2. los efectos asíncronos con sus órdenes de llegada (T-02);
3. **dónde vive el aviso de cada mutación (T-03)**, con los callbacks de `mutate` de `features/tareas` y de Dudas y Personas.

Suma también el caso de N-16 (cambio de clase sin desmontar `ClaseLayout`, que 01d2 vuelve a tocar por N-05): hoy solo lo respalda mi sonda.

Son las tres rondas de esta subentrega: conviene pedirlas en el plan para que 01d2 no las repita. Es la misma razón por la que `AGENTS.md` ya obliga a inventariar los `VALIDACION` y las frases de recuperación.

### (e) Medición del programador para ESTADO §6
Misma convención que en 01c: una ronda extra es toda ronda del tester después de la primera, y "por hermanos o estados vecinos" cuenta la ronda en que el tester encuentra un vecino de un remedio anterior o un hermano mal declarado.

| Subentrega | Rondas del tester | Rondas extra | Por hermanos o estados vecinos | PARADAS | Resúmenes devueltos |
|---|---|---|---|---|---|
| **ADMIN-01d1** | **3** (r1 ROTO por T-01; r2 ROTO por T-02; r3 ROTO por T-03; T-03 lo verificó el manager, sin cuarta ronda) | **2** (r2 y r3) | **2** (r2: T-02, vecino del remedio de T-01 en `reinicios`; r3: T-03, fila mal clasificada en la tabla de efectos de la corrección de T-02) | **0** | **1 de 5** (la implementación, por M-01; aceptadas M-01, ronda 1, ronda 2 y ronda 3) |

- **Umbral de `AGENTS.md`:** 2 rondas extra por este patrón en 01d1, así que **se alcanza**. El `programador` ya corre con `opus` y esfuerzo `medium` (`.claude/agents/programador.md`), así que no hay cambio de modelo que aplicar. Queda para el humano si sube el esfuerzo (abajo).
- **Interrupciones, no imputables al programador:**
  - **Pausa del humano** (2026-11-05) a mitad de la corrección de la ronda 2.
  - **Batería:** dos corridas del programador en rojo por tiempos vencidos (1018 s y 1080 s, con `8 failed` y `9 failed`), una corrida válida con `--maxWorkers=4` (740 s) y la corrección de T-03 detenida hasta conectar el equipo. Con corriente, la misma suite tarda de 170 s a 202 s y no cae nada. Desde entonces la puerta de carga mira `BatteryStatus`.
- **Lo que hizo bien:**
  - no reportó como verde las corridas a batería;
  - en la ronda 2 recorrió todos los efectos asíncronos y encontró tres hermanos reales;
  - encontró el hermano de la fila 20 (`reinicios`) y el de `useGuardarCategorias`;
  - demostró con mutaciones que sus casos detectan cada defecto;
  - cifras iguales a las mías en las cinco entregas.
- **A vigilar:** los tres hallazgos del tester son el mismo tema visto desde tres lados: lo que sobrevive o se pierde cuando un control se oculta mientras la vista sigue montada. La tabla de la ronda 2 fue un avance, pero clasificó una fila sin preguntarse qué se perdía. La misma fila me pasó de largo a mí (ver T-03).

### (f) Rutas del commit de 01d1
29 entradas de `git add` (32 archivos). Cotejadas por programa contra `git status --porcelain --untracked-files=all` (33 líneas): la única ruta que queda fuera es `docs/trabajo/DEPLOY-investigacion-vps.md`, que es ajena.

**frontend, producción (22):**
- en `components/clase/`: `data.ts`, y los nuevos `contexto-de-solo-lectura.ts`, `hooks.ts` y `lib.ts`;
- en `features/clases/`: `categorias-view.tsx`, `clase-layout.tsx`, `data.ts`, `editar-clase-view.tsx`, `editar-recurso-view.tsx`, `hooks.ts`, `lib.ts`, `muro-view.tsx`, `recursos-view.tsx` y `trabajo-view.tsx`;
- en `features/clases/components/`: `codigo-de-clase.tsx`, `comentarios-de-publicacion.tsx`, `elemento-de-recurso.tsx`, `encabezado-clase.tsx`, `publicacion-del-muro.tsx` y `seccion-de-tema.tsx`, y los nuevos `aviso-de-clase-archivada.tsx` y `categorias-de-solo-lectura.tsx`.

**frontend, pruebas del programador (2):** `features/clases/clase-archivada-01d1.test.ts` y `clase-archivada-01d1-vista.test.tsx`, nuevas. Ninguna prueba normal existente cambió.

**frontend, `*.ataque` del tester (4):**
- cambiada por C-10: `styles/clases-r1.ataque.test.ts`;
- nuevas: `features/clases/clase-archivada-01d1-r1.ataque.test.tsx`, `-r2` y `-r3`.

**docs (1 entrada, 4 archivos):** `docs/trabajo/ADMIN-01-administracion/` (`aprobacion.md`, `resumen-programador.md`, `reporte-tester.md` y `revision.md`). `plan.md` no cambió desde `3ae6a00`.

`docs/ESTADO.md` no cambió desde `3ae6a00`, así que no entra. Si el orquestador lo actualiza antes del commit, se suma.

```
git status
git add frontend/src/components/clase/contexto-de-solo-lectura.ts frontend/src/components/clase/data.ts frontend/src/components/clase/hooks.ts frontend/src/components/clase/lib.ts frontend/src/features/clases/categorias-view.tsx frontend/src/features/clases/clase-layout.tsx frontend/src/features/clases/data.ts frontend/src/features/clases/editar-clase-view.tsx frontend/src/features/clases/editar-recurso-view.tsx frontend/src/features/clases/hooks.ts frontend/src/features/clases/lib.ts frontend/src/features/clases/muro-view.tsx frontend/src/features/clases/recursos-view.tsx frontend/src/features/clases/trabajo-view.tsx frontend/src/features/clases/components/aviso-de-clase-archivada.tsx frontend/src/features/clases/components/categorias-de-solo-lectura.tsx frontend/src/features/clases/components/codigo-de-clase.tsx frontend/src/features/clases/components/comentarios-de-publicacion.tsx frontend/src/features/clases/components/elemento-de-recurso.tsx frontend/src/features/clases/components/encabezado-clase.tsx frontend/src/features/clases/components/publicacion-del-muro.tsx frontend/src/features/clases/components/seccion-de-tema.tsx frontend/src/features/clases/clase-archivada-01d1.test.ts frontend/src/features/clases/clase-archivada-01d1-vista.test.tsx frontend/src/styles/clases-r1.ataque.test.ts frontend/src/features/clases/clase-archivada-01d1-r1.ataque.test.tsx frontend/src/features/clases/clase-archivada-01d1-r2.ataque.test.tsx frontend/src/features/clases/clase-archivada-01d1-r3.ataque.test.tsx docs/trabajo/ADMIN-01-administracion/
```

Después del `git add`, `git status` no debe mostrar nada sin preparar ni sin rastrear, salvo `docs/trabajo/DEPLOY-investigacion-vps.md`.

### Problemas que bloquean
Ninguno.

### Problemas que no bloquean
Ninguno nuevo. Los abiertos están en la tabla de (d), con su destino.

### Desacuerdos arbitrados
Ninguno en esta revisión. ADM-T1D110 se arbitró en la verificación de la ronda 2: fragilidad de la prueba, resuelta con una C-n del tester.

### Documentos a actualizar
- `docs/ESTADO.md` §3 (N-01d1-4 y las 12 entradas; nota en la fila 3 de CHORE-04; el foco tras «Sí, regenerar» en el `chore` de foco) y §6 (la medición de arriba), por el orquestador al cierre.
- `docs/DESIGN.md` (A-04) y `CLAUDE.md` (A-05), al cierre del encargo.
- `plan.md`: Enmienda 11, antes de la ronda 0 de 01d2.

### Para el humano
- Nada que decidir para cerrar 01d1.
- **Opcional:** el programador alcanzó el umbral de 2 rondas extra por este patrón, y ya usa `opus` con esfuerzo `medium`. Puedes dejarlo así o subirle el esfuerzo para 01d2; el modelo no tiene a dónde subir.
- **Para la comprobación humana de 01g:** dos puntos que ningún agente pudo ver, porque exigen un navegador: el aviso de clase archivada a 360 px, y que un clic en un espacio en blanco dentro de la clase no mueva el foco cuando la clase cambia de estado.

### Veredicto
**APROBADO.** 01d1 cumple su parte del plan `3822b6c0…`:
- §D-9 con sus Enmiendas 3, 9 y 10, los controles 1 a 21, §D-12, la matriz de avisos y recargas, ADM-1D101 a 1D109, M-07 y N-16.

Además:
- T-01, T-02, T-03 y M-01 están cerrados; N-01d1-1 y N-01d1-3, declarados. T-03 lo verifiqué yo, sin cuarta ronda, por decisión del humano.
- V-01 da 262: 259 rastreadas iguales a `825acabd…` (con C-10) y las tres nuevas del tester.
- "No se toca" está limpio contra `3ae6a00`, con `codigo-de-clase.tsx` limitado a lo autorizado.
- Mi suite completa del frontend da 6456/6456 en 292 archivos a la primera, con `lint` y `build` en verde.
- Todo lo abierto tiene destino.

### Resumen para el humano (15 líneas)
1. ADMIN-01d1 (la clase archivada en la interfaz) está **APROBADA**.
2. Una clase archivada se abre con su aviso y la fecha, y es de solo lectura: se ocultan los 21 controles de escritura de esta parte.
3. El admin puede «Restaurar» y «Duplicar» desde el aviso; las categorías se leen sin editor y las rutas de editar explican por qué no se puede.
4. Si la clase se archiva con la pantalla abierta, la siguiente escritura lo dice, el detalle se renueva y aparece el aviso, sin perder lo escrito hasta ese momento.
5. Se corrigieron T-01 (lo abierto reaparecía al restaurar), T-02 (una recarga vieja borraba lo escrito) y T-03 (se perdía el aviso de «Regenerar código»), más M-01 (foco).
6. T-03 lo verifiqué yo, como decidiste, con el cambio en `codigo-de-clase.tsx` limitado a los avisos.
7. Mi corrida completa del frontend: 6456/6456 en 292 archivos a la primera; `lint` y `build` en verde.
8. Las 262 pruebas de ataque coinciden con sus hashes; el programador no tocó ninguna.
9. No cambia `shared/`, el backend ni `infra/`; "No se toca" está limpio.
10. Medición: 3 rondas, 2 extra, las 2 por hermanos o vecinos (T-02 y T-03), 0 PARADAS, 1 de 5 resúmenes devueltos. Alcanza el umbral; el programador ya usa `opus`.
11. Las fallas por tiempo de la mañana venían de la batería: con corriente, todo en verde.
12. Pendiente antes de 01d2: la Enmienda 11, con `editar-tarea-view.tsx` y las tres tablas de esta subentrega.
13. Pendiente al cierre: `DESIGN.md` (A-04), `CLAUDE.md` (A-05) y las filas de ESTADO §3.
14. El commit lleva 29 entradas de `git add` (32 archivos), incluidas las 3 pruebas nuevas del tester y la carpeta del encargo.
15. No entra `docs/trabajo/DEPLOY-investigacion-vps.md`, que es ajeno.

## Verificación de la Enmienda 11 — ADMIN-01

Veredicto: **CAMBIOS REQUERIDOS** (M-10 y M-11). Lo que pedí en la revisión final de 01d1 está, y las tablas A, B, B2 y C coinciden con el código. Faltan dos cosas que un programador no puede resolver sin adivinar: textos que piden lo que en una archivada ya no se puede hacer, y un criterio de término que no se puede cumplir tal como está escrito.

Plan enmendado: `plan.md` = `b019cb0e82addf0e868cd8a3caee90f4f29c9593807fab266191b72674bdd6d4` (1982 líneas, sin CR). Es igual a la entrada "Enmienda 11 del arquitecto" de `aprobacion.md` y a su copia `copias-plan/plan-admin01-v13-enmienda11-b019cb0e.md`. Copia previa: `3822b6c0adb9823edb9c552dd6cfac78f4e0ffa2f4eca9fcade0be07d4fbdd78`, comprobada. Base del código: `7655a5b`; `git diff --stat 7655a5b` no da nada en `frontend/`, `backend/`, `shared/`, `infra/`, `CLAUDE.md`, `AGENTS.md`, `docs/DESIGN.md` ni `docs/ESTADO.md`.

Entorno: solo lectura y `grep`. No corrí ninguna prueba ni ningún navegador. `BatteryStatus` 2, carga 29 %, ningún `node` con `vitest`.

### Cotejo del diff
`git diff --no-index` completo contra la copia previa: 218 inserciones y 4 borrados, en 10 hunks. Los 4 borrados son líneas reemplazadas, y lo que retiran queda tachado o sustituido. En lo añadido no hay caracteres invisibles (`U+200B` a `U+200D`, `U+FEFF`, `U+00A0`, `U+0085`), y el único `\u` es el de la nota final al orquestador.

| Hunk | Sección | E11-n |
|---|---|---|
| 1, línea 2 | Encabezado | E11-14 |
| 2, línea 375 | Fila 29 del inventario | E11-3 |
| 3, línea 392 | §D-9: condición de la Enmienda 2, tachada | E11-1 |
| 4, +41 en la línea 422 | §D-9: bloque "Enmienda 11" | E11-1, E11-2, E11-3 y E11-4 |
| 5, línea 839 | ADM-1D211 | E11-1 |
| 6, +101 en la línea 852 | Pruebas: ADM-1D219 a 1D223 y las tablas | E11-5, E11-6 y E11-7 |
| 7, +31 en la línea 1427 | §D-R0 01d2 | E11-8, E11-9, E11-10 y E11-11 |
| 8, línea 1586 | Matriz | E11-12 |
| 9, +7 en la línea 1687 | Pasos, 19b | E11-13 |
| 10, +33 en la línea 1950 | La tabla E11-n y las notas | La propia tabla |

Las dos viñetas finales del bloque de §D-9 (N-01d1-4 para las filas 33 y 36, y la decisión heredada de la ronda 2) no tienen E11-n propio. Viven en esa sección y en la nota "Al cierre", así que no las cuento como cambio sin registrar.

### (a) Lo que pedí en la revisión final de 01d1: está

| Pedido | Dónde | Estado |
|---|---|---|
| `editar-tarea-view.tsx` con el mismo mecanismo | §D-9, "Fila 36" | Correcto: es lo que hace `editar-recurso-view.tsx:69`, `:73`, `:119`, `:129` y `:131`. Sobre `editar-tarea-view.tsx:85-88` y `:95-99`, las comprobaciones caen donde deben |
| La frase de la Enmienda 2, reemplazada | Línea 392 | Tachada, y remite a "Fila 36" |
| Caso de control del `409` | ADM-1D222 (a), y (b) con archivar y restaurar sin nada en vuelo | Correcto; es lo que comprobé con SONDA-22a a 23 en la fila 20 |
| T-01 de CLASES-03d en FORO-01 | "Fila 36", punto 5; celda "Vista desmontada" de B2 | Correcto: sin guarda de vista desmontada |
| Tres tablas para las filas 22 a 37 | A, B, B2 y C | Están; abajo, contra el código |
| El caso de N-16 | ADM-1D219 | Correcto: es mi SONDA-30, contada por URL (+1 en la nueva, +0 en la vieja) |

### (b) Las tablas, contra el código
Leí cada archivo de las filas 22 a 37 y cada `mutate`, `mutateAsync`, `toast` y `navigate` de sus componentes. **Todos los `archivo:línea` coinciden con `7655a5b`.**

**Tabla A (estados de abierto):**
- **Con remedio, y bien:** `confirmando` en las filas 24, 26, 28 y 29; `enfocarCampo` en la 25; `confirmando` y `conEntregas` en la 32; `reinicios` en la 33 y la 36.
- **`enfocarCampo`, el que pidió mirar el orquestador: está y es correcto.** Sin el reinicio, `FormularioRespuesta` vuelve a montarse con `enfocarAlMontar` (`formulario-respuesta.tsx:38-41`). En solo lectura no vuelve a ponerse en `true`: con 0 respuestas y plegado no hay control, y plegar lo deja en `false` (`elemento-de-duda.tsx:90`).
- **El reinicio no mueve el foco en las filas 24, 26, 28 y 32.** Su efecto llama a `…BtnRef.current?.focus()`, pero en solo lectura el botón no está y la ref es `null`.
- **Fila 29, con `key`: correcta.** `FilaMaestro` no lee el contexto y `lista-maestros-de-clase.tsx` no se toca. La lista se monta de nuevo y el foco perdido lo recoge `useFocoAlTituloDeLaClase`, porque la clave de `ClaseLayout` cambia con `soloLectura`.
- **`MaestrosDeClaseView` y `AlumnosView` están bajo el proveedor:** no tienen ruta propia, las monta `personas-view.tsx:170-183`, dentro de `ClaseLayout`. Las rutas de `features/tareas` también (`app/router.tsx:93-174`).
- **No falta ningún estado.** Solo omite guardas en vuelo del mismo tipo que la que sí lista (`borrandoRef`, `elemento-de-duda.tsx:51`): se limpian en `onSettled`, porque el componente sigue montado.

**Tablas B y B2 (efectos asíncronos):** correctas, celda por celda.
- `useEditarTarea` no pide la tarea ante `TAREA_MODIFICADA` (no está en `CODIGOS_QUE_RENUEVAN_LA_TAREA`, `features/tareas/data.ts:368-373`), así que "no pide la recarga" es cierto con la generación.
- `onSuccess` y `onError` de `borrar.mutate` corren porque `AccionesDeLaTarea` sigue montado, y `borrandoRef` se libera. Por eso es correcto no desmontarlo desde `detalle-tarea-view.tsx`.
- El manejador de `FormularioDeCalificacion` y el de `CamposDelFormulario` guardan las props del render en que se envió, así que la generación capturada es la del envío.

**Tabla C (dónde vive cada aviso), la que falló en T-03: correcta.** Le hice la pregunta de T-03 a cada mutación: si el callback no corre, ¿qué se pierde?
- Las siete de `features/tareas/hooks.ts` están y están bien clasificadas.
- Las nueve de `features/clases` avisan en el gancho (`useAsignarMaestro:575`, `useRetirarMaestro:597`, `useAgregarAlumno:711`, `useQuitarAlumno:736`, `useCrearDuda:1811`, `useMarcarDuda:1837`, `useBorrarDuda:1902`, `useResponder:1926`, `useBorrarRespuesta:1949`). Ninguno de sus componentes llama a `toast`.
- **Ningún aviso doble con los remedios:** con `montado` en falso, el gancho avisa y el `catch` no; con `montado` en verdadero, igual que hoy. En la fila 32, con la vista montada y otra generación, calla el gancho y avisa el `onError`.
- **Los textos salen legibles:** `mensajeDeErrorTareas` quita la ruta (`lib.ts:154-163`, `:363-373` y `:624-625`), y `TAREA_CON_ENTREGAS` y `ENTREGA_VACIA` están en `CODIGOS_CON_MENSAJE_DEL_SERVIDOR`.

Lo que las tablas no preguntan, y encontré al revisar qué queda en pantalla con el control oculto, es M-10.

### (c) Los cuatro archivos que entran en "Se toca"
| Archivo | Alcance | Vigiladas y estáticas |
|---|---|---|
| `acciones-de-la-tarea.tsx` | Contexto, `null`, dos reinicios y `onError` | **Sin PARADA.** `entregas-01e-r1:741-768`: importar de `@/components/clase/` no cumple `from "@/features/`, y no nombra vidrio, `fixed`, `animate-` ni correo. `estatico-02c-r1:78-90`: sigue leyendo `.puedeBorrar`, siempre que no escriba `puedeBorrar =` con otro valor. `ver-mas-01e-r3:296-339`: sin tipos. V-06: sigue en 2 |
| `formulario-tarea.tsx` | `useMontado` y la rama del campo | Sin PARADA: V-06 en 1, V-07 igual, y `toast` y `mensajeDeErrorTareas` ya están importados. La Enmienda 3 lo dejaba fuera solo en 01d1, por M-07, y su razón sigue valiendo: el aviso nuevo es otra cosa |
| `features/clases/lib.ts` | Predicado de tipo | Sin PARADA: `estaArchivada({})` y las otras dos llamadas de `clase-archivada-01d1.test.ts:16-24` compilan con el mismo parámetro. `ver-mas-01e-r3` exige que el tipo vaya en `types.ts`, y el plan lo dice |
| `components/clase/hooks.ts` | Solo gana `useMontado` | Ver (d) |

**Tamaño: cumple.** Mi conteo de la lista coincide: 18 + 10 + 4 = 32, y 30 sin los dos que pueden quedar sin cambio. El arquitecto solo cuenta producción. Con la lista cerrada, C-11, C-12 y 2 o 3 pruebas nuevas, son **35 a 38 archivos tocados**, más las `*.ataque` que escriba el tester. La regla dice que una subentrega se parte *solo si* pasa de unos 30: permite el corte, no lo obliga. No cortar es lo más barato aquí, y lo dejo escrito con la cifra real.

### (d) `useMontado` a `components/clase/hooks.ts`: sin choque
- **Nadie lo nombra en una prueba.** `grep` en `frontend/src`: solo `features/clases/editar-recurso-view.tsx` y `features/clases/hooks.ts` (13 usos internos). Por eso `hooks.ts` necesita importarlo y reexportarlo, como dice el plan.
- **`reexportaciones-01c`:** no lo menciona, y sus `import` no cambian.
- **`refactor-01c-r1`:** `:407-425` pide que `components/` no importe de `features/`, y se cumple. `hooks.ts` de `components/clase/` no está en el mapa de símbolos movidos.
- **CAL-T-94 y CAL-1C13:** leen `components/clase/data.ts`, no `hooks.ts`. Sobre `features/tareas/hooks.ts`, importar el gancho no suma nada de lo prohibido.
- **`estatico-02c-r1`:** solo cuenta `.puedeBorrar` y `perspectivaDeRuta(`.
- **`estatico-03c1-r1:79-81`:** sobre `features/clases/hooks.ts` solo pide `useIndicadorDeSecciones` y que no declare `Medida…`.
- **Simulaciones:** nadie simula `@/components/clase/…`. Las únicas de `./hooks` son las de los inicios (`inicio-sin-datos-*`), que no lo usan.

### (e) Grep repetido: no hacen falta C-n ni cambios en la lista cerrada
Repetí la búsqueda sin apoyarme en la del arquitecto: cada `cleanup()` y `unmount()` a mitad de un caso de `features/tareas`, cada título con "en vuelo", "desmont" o "Volver a las entregas", cada respuesta diferida con `4xx`, y cada prueba que lee por texto los archivos que cambian.

| Comportamiento que cambia | Pruebas que pasan por ahí | Resultado |
|---|---|---|
| El error de un campo con el control desmontado, que ahora avisa | CAL-T-134 (`puntajes.0.criterioId`: ya avisaba, sin lugar), CAL-T-88 (`200`), `entregas-01d-r2:545` (`409`), `entregas-01d-r3:640-660` (`503`) | Ninguna espera silencio con un error de campo y el formulario desmontado |
| `TAREA_CON_ENTREGAS` con la vista montada | `entregas-01e:605-726`, `entregas-01e-r1:623-668` | `montado` verdadero, igual que hoy |
| Filas 24 a 36, sin proveedor | `conflicto-01a`, `editar-tarea-view`, `tareas-01a-r1`, `tareas-01d-r1` a `r4`, y las de Dudas y Personas | El contexto vale `false` y la generación no sube |
| Las pruebas de 01d1 | `clase-archivada-01d1*` | Ninguna monta Dudas, Personas ni `features/tareas` |
| Pruebas con `archivadaEn` | `clase-archivada-01d1*` y `clases-admin-01c*`, solo en `features/clases` | Ninguna en `features/tareas`, `features/calificaciones` ni `app/` |
| Cuentas por texto | CAL-T-127 (5 llamadas, 4 con cuatro argumentos), `renovarTrasErrorDeLaEntrega(` en 3, `entregas-01d-r3:720-735` | El remedio no suma llamadas ni ganchos exportados |
| V-06 | `styles/clases-r1.ataque.test.ts:270-277`, `:331-332`, `:360-363` | Sin botones nuevos. Sigue en 77, y C-12 la lleva a 78 |
| Tipos en línea | Ninguna prueba nombra las anotaciones que se mueven (`pageParam` y `mutationFn` solo salen en dobles propios) | Sin cambio |

Las referencias de las vigiladas de §D-R0 (`:741-768`, `:530-560`, `:720-735`, `:530-555`, `:72-125`, `:881-894`, `:296-339`, `:407-425`) son las correctas. **De acuerdo con E11-11**, con M-10 y M-11 aparte: M-10 suma casos nuevos y no cambia pruebas existentes, porque ninguna monta esos textos con una clase archivada.

### (f) Alcance, contrato y textos
- **Contrato, backend y `shared/`:** sin cambio. **Textos de §D-12:** sin cambio. El aviso nuevo usa `mensajeDeErrorTareas`.
- **El aviso nuevo con mensajes existentes: sí es comportamiento nuevo, y se aparta de una celda.**
  - La fila de 01d2 (Enmienda 2) de la matriz aprobada dice "(de hoy)" en `VALIDACION`, y hoy ese error, con el control fuera, no dice nada. E11-12 agrega otra fila que dice lo contrario para ese caso.
  - **No contradice la decisión de fondo:** la regla de `features/tareas` ya es que los avisos viven en el gancho y corren aunque la vista ya no esté (`hooks.ts:152-153`), y `features/clases` hace esto mismo desde CLASES-03c2 (`avisarErrorDelTexto`). Es T-03 aplicado a sus hermanos, sin texto nuevo.
  - **Lo que hay que decirle al humano:** no solo aplica a una archivada. Vale también al salir de la vista con un envío en vuelo, en crear y editar tarea, calificar, el hilo y entregar. Lo acepto; es una mejora con riesgo bajo.
  - **Dos textos, legibles aunque fuera de lugar:** al admin, `TAREA_CON_ENTREGAS` le dice "Si la borras, también se borrarán…" en un aviso, sin el segundo paso. Es cierto y no promete nada que no pueda hacer. A quien sale con un `ENTREGA_VACIA` le llega su motivo, también cierto.
- **`useMontado`:** refactor que toca dos dominios, y por eso pide confirmación (`AGENTS.md`). Es el mínimo: una función, sin cambio de firma.
- **N-01d1-4 extendido a las filas 33 y 36:** correcto. Exige lo mismo que en la 20 (un conflicto real, archivar antes de la respuesta y restaurar con la vista abierta) y nada se sobrescribe.

### Problemas que bloquean

#### M-10 — Filas 27 a 30 (y la 3, de 01d1): el control se oculta, pero el texto que pide usarlo se queda
Dónde: `plan.md`, §D-9, filas 22 y 27 a 30, y fila 3; bloque "Enmienda 11". En el código, sin nada que los condicione:

| Archivo | Texto | Por qué no se cumple en una archivada |
|---|---|---|
| `maestros-de-clase-view.tsx:70` (`minimo`) | "Una clase necesita al menos un maestro. Asigna a otro antes de quitar a este." | No hay buscador ni «Quitar» |
| `maestros-de-clase-view.tsx:78` (`tope`) | "La clase ya tiene 2 maestros. Quita a uno para asignar a otro." | La fila 29 quita «Quitar» |
| `maestros-de-clase-view.tsx:73-86` | La tarjeta "Asignar maestro" | La fila 30 solo quita el buscador; queda el título, sin nada debajo. El arquitecto lo llevó al humano como detalle visual, y lo es solo a medias: con dos maestros, debajo queda `tope` |
| `tabla-alumnos.tsx:187` (`TEXTOS_TABLA_ALUMNOS.vacio`) | "Aún no hay alumnos. Comparte el código de la clase o búscalos arriba." | No hay código (fila 1) ni buscador (fila 27) |
| `muro-view.tsx:123` (`vacioMaestro`, `vacioAdmin`) | "Publica el primer aviso de tu clase." | Fila 3, de 01d1 |
| `dudas-view.tsx:160` (`TEXTOS_DUDAS.frase`) | "Lo que escribas aquí lo ve toda la clase." | La fila 22 quita el formulario; no pide nada imposible, pero ya no describe nada |

Por qué importa:
- `AGENTS.md`: "Si un camino no puede cumplir la promesa, el plan cambia el texto o el remedio; no lo deja como observación". Estrictamente, esa regla habla de frases para salir de un error; estas piden lo mismo a quien lee, y el defecto para la persona es igual.
- Es el mismo tema de T-01, T-02 y T-03 visto desde un cuarto lado: qué queda en pantalla cuando se oculta un control. El tester lo va a encontrar, y sería otra ronda.
- **Mi parte:** el de `muro-view.tsx` ya está en `7655a5b`. Se me pasó en la revisión final de 01d1, que aprobé, y tampoco lo vio el tester.

Qué se espera:
- En una archivada, ninguno de esos textos se pinta como está, **sin textos nuevos**. Ya existen `TEXTOS_PERSONAS.vacio` ("Aún no hay alumnos en esta clase", `features/clases/data.ts:443`) y `TEXTOS_MURO.vacioEstudiante` ("Aún no hay avisos en esta clase.").
- `minimo`, `tope` y `TEXTOS_DUDAS.frase` no se pintan. La tarjeta "Asignar maestro" tampoco, salvo que el humano decida otra cosa (abajo).
- `muro-view.tsx` entra en "Se toca" de 01d2 con ese alcance exacto, porque no está en la lista. Si el arquitecto prefiere dejarlo fuera, va con una fila en ESTADO §3 y su razón.
- "Pruebas requeridas" lleva un caso por cada texto con la clase archivada y el control de que, con la clase activa, sigue igual.
- La tabla A, o una cuarta tabla breve, responde por cada fila: **¿qué texto queda que mencione el control oculto?** Hay que recorrer también `TEXTOS_ENTREGAS` y `TEXTOS_CALIFICAR`: yo los revisé y no encontré otros (`sinCalificar`, `TEXTOS_ENTREGAS.vacio` y `TEXTOS_TRABAJO.vacio` son neutros), pero conviene que quede en el inventario.

#### M-11 — El criterio de término de los tipos en línea no se puede cumplir
Dónde: `plan.md`, §D-R0 01d2, "Pendientes de 01d1": "Al terminar, el comando solo da esas dos líneas".

Por qué importa: el patrón `mutationFn: (\(.*\)\?{` significa "`mutationFn: (` seguido de cualquier cosa opcional y `{`", así que también encuentra una línea ya sin tipo en línea. Comprobado con `grep -c`:
- `mutationFn: ({ id }: VariablesDeMaestro) =>` da **1**;
- `mutationFn: ({` da **1**.

Al mover los tipos conservando la desestructuración, siguen saliendo **10 líneas más** (`:340`, `:510`, `:532`, `:578`, `:600`, `:739`, `:1372`, `:1481`, `:1643` y `:1840`). El programador tendría que detenerse, o reescribir diez firmas sin desestructurar solo para satisfacer el comando. En 01c salieron cinco PARADAS por inventarios así. La cifra de 23 anotaciones sí es correcta: el comando da 24 líneas en `7655a5b`, menos `:581` y `:963`, más el `useRef` de `:955`.

Qué se espera: un criterio que distinga el tipo en línea de la desestructuración. Este funciona: `grep -nE "\}: \{|: \{ [a-zA-Z]*: " frontend/src/features/clases/hooks.ts`. Hoy da 24 líneas (la misma lista, con `:1484` en lugar de `:1481`), con tres firmas ya movidas de prueba da 0, y al terminar deben quedar solo las equivalentes a `:581` y `:963`. El `useRef` se comprueba aparte, como dice el plan.

### Problemas que no bloquean
- **El foco de las filas no es siempre el `h1`.** La matriz dice "`h1` de la clase si el control desapareció". Con el código, y con la precedencia ya aceptada en 01d1 (la fila primero, el `h1` de respaldo):
  - fila 28: al `h2` "Alumnos" (`tabla-alumnos.tsx:164-166`);
  - fila 30: al `h2` del panel, por el efecto de `maestros-de-clase-view.tsx:33-37`;
  - filas 23, 24 y 26: a la fila o al encabezado de `dudas-view` y `respuestas-de-duda`;
  - fila 29: al `h1`, por la `key`.

  Nunca a `<body>`. No pide cambio: la matriz del primer resumen lo declara fila por fila, y el tester no lo cuenta como hallazgo.
- **E-31 (línea 143) quedó vieja.** Dice que 01d2 toca `features/tareas` "solo para ocultar controles", y que no rehace `editar-tarea-view` ni los ganchos. Desde la Enmienda 2, y más con esta, no es exacto. Sigue siendo cierto que T-01 a T-05 de CLASES-03d no se corrigen. La nota de A-07 debe decirlo así, y ESTADO §3 (`docs/ESTADO.md:332`) conserva el destino: se resuelve al cierre.

### Detalles menores
- `HiloPrivado` ya tiene `puedeEscribir`: la fila 34 se resuelve pasando `puedeEscribir={perspectiva === "maestro" && !soloLectura}`, sin la prop `soloLectura` que dice el inventario. Si el programador lo hace así, lo declara y `hilo-privado.tsx` queda sin cambio.
- Con `muro-view.tsx` (M-10), el conteo de "Se toca" pasa a 33 (31 sin los dos opcionales).

### Para el humano
Son los cuatro puntos que el orquestador ya llevó, con mi opinión:
1. **`useMontado` a `components/clase/hooks.ts`:** recomiendo aceptarlo. No choca con ninguna prueba y evita un segundo gancho igual en `features/tareas`.
2. **Aviso nuevo con mensajes existentes cuando el control ya no está:** recomiendo aceptarlo, sabiendo que también aplica al salir de la vista con un envío en vuelo, no solo en una archivada.
3. **N-01d1-4 en las filas 33 y 36:** recomiendo aceptarlo como declarado, igual que en la 20.
4. **Los dos detalles visuales.** Recomiendo no pintar la tarjeta "Asignar maestro" (M-10) y quitar también la columna "Acciones" en una archivada (`tabla-alumnos.tsx:198` y su celda), que sin «Quitar» se queda vacía. Ninguna de las dos pide un texto nuevo. Pase lo que pase con la tarjeta y la columna, `minimo` y `tope` no deben pintarse.

### Veredicto de esta verificación
**CAMBIOS REQUERIDOS: M-10 y M-11**, antes de la ronda 0 de 01d2. Regresa al arquitecto. Son cambios pequeños y no reabren el resto: (a), (b), (c), (d) y (e) quedan verificados y, en la siguiente verificación, cotejo solo el diff contra `b019cb0e…`, con su copia previa guardada.

## Verificación de la corrección de la Enmienda 11 — ADMIN-01

Veredicto: **CAMBIOS REQUERIDOS** (M-12, solo de registro). M-10 y M-11 quedan cerrados, y la decisión de ocultar la columna y la tarjeta está bien escrita. Lo único que falta: el plan atribuye al humano dos aceptaciones que no constan en `aprobacion.md`.

Plan: `plan.md` = `82f0e21a381021c062ae5cdeddf55f711b52034ab938ca2a1dbc1c5e0307c1d2` (2040 líneas, sin CR). Es igual a la entrada "Corrección de la Enmienda 11" de `aprobacion.md` y a su copia `copias-plan/plan-admin01-v14-enmienda11c-82f0e21a.md`. Copia contra la que coteja: `b019cb0e…`, comprobada. Base del código: `7655a5b`; `git diff --stat 7655a5b` no da nada en `frontend/`, `backend/`, `shared/`, `infra/`, `CLAUDE.md`, `AGENTS.md`, `docs/DESIGN.md` ni `docs/ESTADO.md`.

Entorno: solo lectura y `grep`. No corrí ninguna prueba ni ningún navegador, así que lo que digo sobre pruebas que no cambian sale de leerlas, no de ejecutarlas. `BatteryStatus` 2, carga 14 %, ningún `node` con `vitest`.

### Cotejo del diff
`git diff --no-index` completo: 76 inserciones y 18 borrados, en 10 hunks. Los 18 borrados son líneas reemplazadas.

| Hunk | Sección (líneas del plan nuevo) | E11-n |
|---|---|---|
| 1 | Encabezado (2) | E11-14 |
| 2 | Filas 28 y 30 del inventario (374 y 376) | E11-16 |
| 3 | `useMontado` autorizado (450) | E11-15 |
| 4 | §D-9, +11 (463-473) | E11-24 y E11-26 (la línea "Aceptado"), E11-16, E11-17, E11-18 y E11-22 |
| 5 | ADM-1D224 a 1D232 (874-883) | E11-20 |
| 6 | Tabla D y su grep (975-994) | E11-18 |
| 7 | §D-R0 01d2 (1468-1491) | E11-15, E11-19, E11-20 (la viñeta de la tabla D), E11-21 y E11-23 |
| 8 | Pasos 19b (1736-1739) | E11-19, E11-20 y E11-22 |
| 9 | "Lo que no cambia" (2007) | Precisión de E11-18 y E11-19, sin fila propia |
| 10 | Tabla E11-n y nota de cierre (2018-2038) | E11-8 y E11-14 (retocadas), E11-15 a E11-26, y mi nota sobre E-31 |

**E11-25** no tiene hunk propio: registra una viñeta que ya estaba en `b019cb0e…`, igual que E11-24 salvo su línea "Aceptado". Es correcto como registro, y nada queda sin fila. El resto del plan no cambia.

### (a) M-10: cerrado, y el grep de la tabla D está completo
Los seis textos de M-10 están con su remedio y sin texto nuevo. Los dos que encontró el arquitecto son correctos:

- **`TEXTOS_CATEGORIAS.frase`** (`categorias-view.tsx:56`, `data.ts:833-834`): lo pasé por alto. "Los pesos deben sumar 100 %" se dirige a quien edita. Su segunda oración sí valdría en lectura ("Cada categoría cuenta según su peso…"), pero quitar la frase entera evita un texto nuevo, y `CategoriasDeSoloLectura` ya muestra nombre y peso.
- **"Puedes seguir editando"** (filas 20 y 36): también se me pasó, y es exactamente la clase de texto de M-10. `grep` en todo `frontend/src`: solo está en `features/clases/data.ts:748` y `:750`, y en `features/tareas/data.ts:69` y `:71`. Los demás avisos de recarga dicen "Mostramos la última versión" (`TEXTOS_CATEGORIAS_RECARGA`, `recargaFallida`, `avisoRecargaFallida`).
- **Lo que dice el plan al restaurar es cierto, por la forma de cada gancho:**
  - fila 20, `features/clases/hooks.ts:1274-1277`: `fallosVistos` se actualiza antes de mirar `hayDatos`, así que el fallo queda contado y al restaurar no avisa;
  - fila 36, `features/tareas/hooks.ts:264-274`: con `activo` en falso no anota nada, y al restaurar avisa una vez.
- **El grep.** Lo repetí por mi cuenta en los tres `data.ts`, con los verbos del arquitecto y otros (`sube`, `adjunta`, `responde`, `marca`, `mueve`, `elige`, `pulsa`, `primer`, `sigue`, `seguir`, `aquí`), y seguí los que se pintan en una sección de la clase. **No aparece ningún texto más.** Cada renglón de "neutros" y de "no se pintan" coincide; el de privacidad, por ejemplo, solo dice quién puede ver el hilo. Las frases R1 a R5 y las de calificaciones ("Vuelve a abrir…") siguen cumpliéndose, porque son lecturas.

### (b) M-11: cerrado
- El criterio ya no depende del comando viejo, y el plan dice por qué.
- `grep -nE "\}: \{|: \{ [a-zA-Z]*: "` da 24 líneas en `7655a5b`, y `grep -n "useRef<{"` da solo `:955`. Con líneas de ejemplo ya movidas, el primero da 0.
- Queda claro que la desestructuración se conserva y que un literal nuevo se declara. La cifra de 23 no cambia.

### (c) La decisión del humano: columna y tarjeta, sin caídas
- **Coincide con lo que el humano seleccionó** (`aprobacion.md:163`: "Ocultarlas enteras"), en las filas 28 y 30, en §D-9 y en ADM-1D226 y ADM-1D227. Las referencias son exactas: `tabla-alumnos.tsx:198` y `:77-117`, y `maestros-de-clase-view.tsx:73-86`.
- **La tarjeta se va entera y `tope` con ella.** El primer `Card`, con `encabezadoRef`, sigue, así que el efecto de `:33-37` sigue teniendo a dónde llevar el foco. El reinicio de `confirmando` de la fila 28 se queda, porque `FilaAlumno` sigue montada: bien.
- **Vigiladas y estáticas:** ninguna cae.
  - **V-06:** `styles/clases-r1.ataque.test.ts:360-363` cuenta `enEspera=` en `tabla-alumnos.tsx` en el texto del archivo, y el botón sigue en el código, condicionado. Las demás cifras no cambian.
  - **"Acciones":** las columnas que se comprueban son de otras tablas (`clases-admin-01c:259` y `:264`, `clases-admin-view:118`, `entregas-01e:322`). Ninguna prueba afirma "Acciones" en `tabla-alumnos`.
  - **"Asignar maestro":** `app/clase-03c1.test.tsx:323` y `:334`, sin `archivadaEn`.
- **Casos ADM-1D224 a 1D232:** uno por fila de la tabla D, con su control de clase activa y el regreso al restaurar. El formulario de duplicar, que sigue pintando el buscador, está en ADM-1D226: es la condición que puse en la fila 29. Correctos.

### (d) Los tres archivos de 01d1: alcance exacto, sin choque
| Archivo | Alcance | Comprobación |
|---|---|---|
| `muro-view.tsx` | Solo el vacío | `soloLectura` ya está en `:42`. `styles/clases-r1:237` (`enEspera=` 1) y `estatico-02c-r1` no cambian |
| `categorias-view.tsx` | Solo la frase | `soloLectura` ya está en `:33`. El título sigue, y es el `ancla` de `clase-archivada-01d1-vista:596`. `ver-mas-01e-r3` y `styles/clases-r1:284` no cambian |
| `editar-recurso-view.tsx` | Solo `!soloLectura` en el gancho | `soloLectura` ya está en `:61`, antes de `:87`. También sale de "Siguen sin tocarse" y E11-4 lo dice con precisión. `estatico-02c-r1` no cambia |

**Las cuatro pruebas de 01d1 y `clase-archivada-01d1.test.ts`, leídas con ese fin:**
- **Ninguna nombra** esos textos: ni `Publica el primer`, `vacioMaestro`, `vacioAdmin`, `TEXTOS_MURO`, `TEXTOS_CATEGORIAS`, `pesos`, `frase`, `Puedes seguir`, `recargaRed`, `RecargaFallida`, `Comparte`, `Asignar`, `Acciones`, `minimo` ni `tope`. Lo único parecido son los botones "Publicar anuncio" y "Publicar recurso", y "Publicación borrada".
- **Ninguna hace fallar un `GET` del recurso con la clase archivada.** Los casos de la ruta 20 (`vista:1470` y `:1518`, `r2:644`, y `r3:384` con su guion de `PUT`) responden `200` al `GET`; los `500` son del `PUT`, de `restaurar`, de `regenerar` o del almacén. El gancho no llega a la rama que cambia, y ningún conteo exacto de avisos se mueve.
- **Ninguna monta Dudas ni Personas**, y la lista vacía de `vista:1209` no afirma su texto.
- **`clase-archivada-01d1.test.ts`:** sin relación con estos textos.

**Conclusión: no entra ninguna normal de 01d1 en la lista cerrada, ni ninguna `*.ataque` como C-n.** De acuerdo con el plan.

**Pruebas con `archivadaEn` en todo `frontend/src`:** solo `clase-archivada-01d1*` y `clases-admin-01c*`, y las de 01c no entran a Personas, Dudas ni Avisos. Sin proveedor el contexto vale `false`, así que el resto no cambia.

### (e) Tamaño: cumple, sin corte
Mi conteo coincide: 18 + 3 = 21 de `features/clases`, 10 de `features/tareas` y 4 sueltos dan **35** (33 sin los dos opcionales). Con la lista cerrada, C-11, C-12 y 2 o 3 pruebas nuevas, **38 a 41**, más las `*.ataque` del tester. La regla permite cortar y no obliga; el plan ya da la cifra real. El humano puede pedir un corte (`aprobacion.md:165` dice que se le llevó el punto), y no hay ningún motivo técnico que lo exija.

### (f) Nada más cambia
Ni contrato, ni backend, ni `shared/`, ni C-n, ni lista cerrada, ni la cifra 78 de V-06, y ningún texto nuevo: `TEXTOS_PERSONAS.vacio` y `TEXTOS_MURO.vacioEstudiante` ya existen. Las tablas A, B, B2 y C son las de `b019cb0e…`. En lo añadido no hay caracteres invisibles.

### Problemas que bloquean

#### M-12 — El plan dice "Aceptado por el humano" en dos puntos que no constan
Dónde: `plan.md:463` ("Aceptado por el humano (2026-11-06), sin decisión pendiente: el aviso con mensajes existentes… y N-01d1-4…"), E11-24 ("Aceptado por el humano") y E11-26 (origen "Decisión del humano (2026-11-06)").

Por qué importa:
- `aprobacion.md:163` registra solo dos decisiones del humano: `useMontado` y "Ocultarlas enteras". De estos dos puntos, el único registro es que se le llevaron (`:162`) y, en N-01d1-4, una **decisión del orquestador** (`:150`). Yo los recomendé, pero mi recomendación no es su aceptación.
- `AGENTS.md`: la aprobación "es por escrito y el orquestador la registra en `aprobacion.md`". El carril es sensible, y este plan es lo que van a leer el programador y el manager de los próximos encargos. Una decisión atribuida al humano sin registro es la clase de error que después nadie vuelve a revisar, sobre todo el primer punto, que también cambia lo que pasa fuera de una archivada.
- No digo que el humano no lo haya aceptado: digo que no puedo comprobarlo.

Qué se espera, según lo que haya ocurrido:
- **Si el humano sí lo decidió:** el orquestador lo anota en `aprobacion.md`, con la decisión tal como la dio el humano. El plan no cambia, su hash sigue siendo `82f0e21a…`, y esta verificación queda **APROBADA** sin otra ronda: me basta con ver la entrada.
- **Si no lo decidió:** el orquestador se lo pregunta, y se anota su respuesta. Si no se le va a preguntar, el arquitecto cambia esas tres líneas a lo que consta (aceptado por el manager y por el orquestador, declarado al humano), y yo coteo solo ese diff.

### Problemas que no bloquean
- **Dos puntos sin respuesta del humano:** según `aprobacion.md:165`, se le llevaron la frase de categorías y el tamaño, y su respuesta no consta. El plan ya trae una opción razonable en cada uno, pero si responde otra cosa hace falta un ajuste pequeño. Conviene tenerla antes de la ronda 0.
- **Un estado vecino de la fila 36, para la matriz:** un fallo de recarga callado en solo lectura, y después salir al detalle sin restaurar. El gancho de `features/tareas` no lo anotó (con `activo` en falso no hay `ultimoFalloAvisado`), así que el detalle lo avisa al montarse, una vez: "Mostramos la última versión". Por lectura del código; no lo corrí. El texto es cierto y no pide cambio. El primer resumen lo declara y el tester no lo cuenta como hallazgo.

### Detalles menores
- **Vigiladas de la tabla D:** la lista no está completa. También afirman esos textos `app/clase-03c1.test.tsx:323`, `:334`, `:412` y `:413`, `dudas-03e:1444` y `:1715`, `dudas-caminos-03e:305`, `editar-recurso-03d:815`, `:828` y `:1070`, `alumnos-view:445` y `:672`, y `editar-tarea-view:1052`. Ninguna tiene `archivadaEn`, así que no cambian: no causa PARADA ni pide enmienda, y lo que afirma la viñeta sigue siendo cierto.
- **El foco de la fila 30:** "al `h2` del panel" solo vale si el foco estaba en una fila de candidatos. Si estaba en el campo de búsqueda, va al `h1` por `ClaseLayout`. Lo mismo para las filas 27, 31 a 33 y 36, que el párrafo no nombra. El primer resumen lo declara fila por fila, como ya dice el plan.
- **E11-9** sigue diciendo "con el comando del resumen de 01d1"; lo corrige E11-21 y el cuerpo del plan ya está bien.

### Para el humano
1. **¿Aceptas el aviso nuevo y N-01d1-4?** Es lo de M-12. El aviso también sale al dejar la vista con un envío en vuelo, no solo en una archivada. N-01d1-4 deja, en un caso poco frecuente, un formulario restaurado con una versión vieja: el siguiente guardado recibe un `409` y se pierde lo escrito después de restaurar, sin sobrescribir nada. Mi recomendación sigue siendo aceptar los dos.
2. **La frase de categorías:** en una archivada desaparece entera, con su segunda oración. Recomiendo aceptarlo.
3. **El tamaño de 01d2:** 38 a 41 archivos con pruebas, sin corte. Recomiendo no cortar.

### Veredicto de esta verificación
**CAMBIOS REQUERIDOS: M-12.** No hace falta tocar el contenido del plan si el humano confirma: con esa entrada en `aprobacion.md`, el plan `82f0e21a…` queda aprobado y 01d2 puede arrancar su ronda 0. M-10 y M-11 están cerrados, y (a) a (f) quedan verificados.

## Verificación de la Enmienda 12 — ADMIN-01

Veredicto: **CAMBIOS REQUERIDOS** (M-13). P-01, P-02, P-03 y OA-1 a OA-4 están bien resueltos por lectura. Falta una sola cosa, y es pequeña: la vista nueva de una clase anterior pinta una frase de recuperación más, la del error del detalle, sin sus caminos, y no dice a dónde va el foco cuando ese error la reemplaza.

Plan: `plan.md` = `ab372fe025e8e1d4592f1120d255bcb58f09c729c6d2759704479ea5b3d2883f` (2138 líneas, sin CR). Es igual a la entrada "Enmienda 12 del arquitecto" de `aprobacion.md`. Copia previa: `82f0e21a…`, comprobada. Producción sin cambios desde `7655a5b`; en `frontend/` solo cambian los dos archivos de C-11 (`edf4d96e…`) y C-12 (`537e10bc…`), los hashes que dio el tester.

**Lo que no pude correr:** en las tres comprobaciones, `BatteryStatus` dio **1** (100 % de carga), con carga de CPU 14 % y ningún `vitest`. Con la regla de este encargo no corrí nada: **ni ESLint por entrada estándar ni una sonda de C-40 y C-41**. Lo que digo aquí de `lint` y de esos dos C-n sale de leer la configuración y las pruebas, no de ejecutarlas. Quedan cubiertos así, sin que yo los haya visto: el tester, al reanudar la ronda 0, debe dejar C-40 y C-41 en verde con el código de hoy y con N-05 (si no, PARADA, dice el plan), y el `lint` del programador cubre P-02. Si conectan el equipo y lo pides, corro las dos cosas.

### Cotejo del diff
`git diff --no-index` completo: 108 inserciones y 10 borrados, en 14 hunks. Los borrados son líneas reemplazadas, y lo que retiran queda tachado o sustituido. En lo añadido no hay caracteres invisibles, y el único `\u` es el de la nota al orquestador.

| Hunk | Sección (línea del plan nuevo) | E12-n |
|---|---|---|
| 1 | Encabezado (2) | E12-12 |
| 2 | S-15 (54) | E12-1 |
| 3 | E-02 (109) | E12-3 |
| 4 | §D-9, `ClaseLayout` (334) | E12-4 |
| 5 | §D-9, vista de una clase anterior, N-05 y "Volver a mis clases" (386-399) | E12-1, E12-3, E12-4, E12-5 y E12-6 |
| 6 | §D-12 (592-593) | E12-5 y E12-8 |
| 7 | ADM-1D102 (845) | E12-1 |
| 8 | ADM-1D203 y ADM-1D206 (857 y 860) | E12-4 y E12-3 |
| 9 | ADM-1D233 a ADM-1D235 (899-918) | E12-2, E12-6 y E12-5 |
| 10 | §D-R0: nota de `errores-ch3` y alcance de `lib.ts` (1501 y 1506) | E12-5 y E12-7 |
| 11 | §D-R0: bloque de la Enmienda 12 (1539-1559) | E12-2, E12-3, E12-4, E12-5, E12-7, E12-8, E12-9 y E12-10 |
| 12 | Matriz (1686) | E12-6 y E12-5 |
| 13 | Pasos, 19c (1797-1804) | E12-11 |
| 14 | Tabla E12-n (2106-2138) | La propia tabla |

### (a) P-01: correcto
- **El reparto es el que pide N-05.** `ClaseLayout` redirige antes del proveedor, así que al alumno solo le llega `false`. Su `true` lo provee la vista de una clase anterior. Lo dicen S-15, ADM-1D102 y §D-9, sin contradicción.
- **Lista cerrada:** `clase-archivada-01d1-vista.test.tsx:351` y su comentario `:342`, exactos. `:354` (estudiante, activa) se queda.
- **C-40 y C-41:** las referencias son exactas (`-r1:518`, `:450-451`; `-r2:435-436`; `ABIERTOS` en `:529` hereda).
- **El maestro tiene esos controles, con los mismos componentes:**
  - `formularioComentario: true` (`features/clases/data.ts:592`), que es lo que pinta `FormularioComentario` (`comentarios-de-publicacion.tsx`);
  - «Borrar» sale de `comentario.puedeBorrar` y no del rol, y los dobles lo traen en `true` (`-r1:226`, `-r2:224`);
  - `-r1:68` ya tiene al maestro como rol por defecto, y `abrirComentarios` no depende del rol.
- **Se conserva lo que protegen.** La fila 5 es la única con el formulario de comentar, y el admin no lo tiene (`formularioComentario: false`): pasarla al maestro, y no quitarla, es lo correcto. C-41 no duplica "comentario (admin)": en el maestro convive con el formulario.
- **Lo del alumno lo cubren ADM-1D208, ADM-1D213a y ADM-1D233.** En (b) y (c) el aviso vive en el gancho (`useBorrarComentario:1134`, `useComentar:1108`), así que sale con el formulario desmontado. Un `409 CLASE_ARCHIVADA` no es error de campo y da un solo aviso (`:1126-1127`).
- **E12-9, repetido por mi cuenta:** `archivadaEn` solo en esos diez archivos. `estudiante` solo en `-vista:351`, `:354`, `-r1:518` y `-r2:436`, más las declaraciones del tipo y `BASES`. `CLASE_ARCHIVADA` en `features/tareas`, solo en `errores-ch3-r1.ataque`. Exacto, y coincide con los cuatro de la sonda N-05 del tester.

### (b) P-02: correcto; ESLint sin correr
- **La ruta hija** usa el mismo patrón de `ClaseLayout` en `app/router.tsx`. `app/` ya importa de los dos módulos. Queda dentro de `RequireRol rol="estudiante"`, y `MisCalificacionesView` lee `:claseId` de la ruta madre con `useParams`.
- **`<Outlet key={claseId} />`:** una `key` sobre el `Outlet` remonta lo que cuelga de él, que es lo que pide E-02.
- **`app/rutas-*` y `router*`:** ninguna recorre `rutas` para fijar su lista (`grep` de `rutas.map`, `.find`, `.filter` y `.children`), y ninguna prueba nombra `clases-anteriores` fuera de las filas de C-12. `perspectivaDeRuta` da "estudiante" con ese prefijo, y `estatico-02c-r1:123-133` no cambia, porque la vista pasa la perspectiva fija.
- **`lint`, por lectura de `eslint.config.mjs:173-205`:**
  - `features/clases/clase-anterior-view.tsx` cae en `features/*/*`: sin `@/features/` ni `..`, y el plan usa `@/components/…` y `./…`;
  - `mis-calificaciones-view.tsx`, igual, con `@/components/clase/hooks`;
  - `encabezado-clase.tsx` cae en `components/**`, donde solo se prohíbe `../..`.
  - Es lo mismo que comprobó el tester con la variante que fallaba, pero **no lo ejecuté**.

### (c) P-03: correcto
`encabezado-clase.tsx:30` ya lee `soloLectura` y recibe `perspectiva` por props, así que el cambio es solo el destino de `:38`. La única prueba que nombra ese archivo es `styles/clases-r1.ataque.test.ts:237` (`enEspera=` 0). `lib.test.ts:285` fija `CAPACIDADES_POR_PERSPECTIVA`, que no cambia. `clase-layout.test.tsx:142` y `:377` usan clases activas. ADM-1D203 lleva el control de la clase activa, del admin y de restaurar.

### (d) OA-1: correcto, con un hueco en la misma vista (M-13)
- **La frase vieja no se podía cumplir, y la nueva sí:** "Volver a clases anteriores" y abrir la misma clase.
- **Los caminos (a), (b) y (c) de ADM-1D235 funcionan con el mecanismo de hoy:** es lo que fija CAL-T-224, con el `staleTime` de 30 s de `app/providers.tsx`. Por lectura de TanStack Query, un fallo deja la consulta marcada como vieja, así que volver a montarla o regresar a esa opción vuelve a pedir la primera página. Si alguno no cumpliera, el plan ya dice PARADA.
- **`features/calificaciones/data.ts`:** una clave más. `errores-ch3.test.ts:52-55` mira nombres exportados, y ninguna prueba enumera las claves de `MENSAJES_ERROR_CALIFICACIONES`.
- **`mis-calificaciones-view.tsx`:**
  - CAL-1D09: sigue con doce archivos; importa de `@/components/`, y el texto no toca sus reglas.
  - CAL-T-189: un solo `toast.error`. El cambio está en el texto de `:155`, sin aviso nuevo.
  - Las pruebas del texto de hoy no tienen proveedor, o tienen la clase activa.
- **La excepción de `CLAUDE.md` se respeta:** es otro texto fijo del lugar, nunca texto del servidor.
- **Texto nuevo:** no consta aprobación del humano en `aprobacion.md`, y el plan no la da por hecha: "el programador no lo escribe hasta que el humano lo apruebe", con la alternativa ya aprobada de §D-12. Correcto.

### (e) OA-2: correcto, sin ciclo
- **N-05 y esta redirección leen la misma consulta** (`useClase`, `claveClaseDetalle`, `hooks.ts:198-203`), con el mismo orden de estados, así que no pueden contradecirse en un mismo dato.
- **"Una sola petición por transición" se cumple con `staleTime: 30_000`:** al llegar la respuesta que dispara la redirección, el dato está fresco y el destino no vuelve a pedirlo. Si el dato estaba viejo, la petición en vuelo se comparte. El caso ADM-1D234 (c) usa la configuración real.
- **El `Outlet` solo se pinta en el estado 4**, así que con la clase activa no se pide "Mis calificaciones" (ADM-1D234 (a)).
- **`ClaseLayout` tampoco se pinta para el alumno** en una archivada: la vista destino no le llega con el proveedor en `true`.
- **Comportamiento nuevo:** es un dato para el humano, y `aprobacion.md:170` dice que va a él. No consta su respuesta. No veo razón técnica para otra salida.

### (f) OA-3, OA-4 y el grep de E12-9
- **OA-3:** `consultaDeClasesAdmin` y `siguienteCursorDeClasesAdmin` están en `:747-772` y fuerzan `estado` y `LIMITE_CLASES_ADMIN`, como dice el plan. Las dos nuevas no declaran tipos en `lib.ts`, lo que pide `ver-mas-01e-r3`.
- **OA-4:** "Volver a Actividades de aprendizaje" no existe hoy en ningún `data.ts`, y ninguna prueba lo nombra. Va una sola vez, y el enlace en línea no crea archivos.
- **E12-9:** ver (a). Las vigiladas nuevas existen y sus líneas son correctas (`estatico-01d:58-122`, `estatico-01d-r1:89-98`, `clase-layout.test:142` y `:377`, `lib.test:285`, `estatico-02c-r1:123-133`). Las O-01d2-1 a 12 son trampas del programador, y en lo que pude cruzar ninguna oculta otro hueco.

### (g) Tamaño: cumple, sin corte
Mi conteo coincide: 22 de `features/clases`, 10 de `features/tareas`, 3 de `features/calificaciones`, y 1 de `services/`, `app/` y `components/clase/` dan **38** (36 sin los dos opcionales). Con los seis de pruebas existentes y 2 o 3 nuevas, **44 a 47** (36 + 6 + 2 y 38 + 6 + 3), más las `*.ataque` del tester.

La regla permite cortar y no obliga. **Sobre esta cifra no consta respuesta del humano:** su "No cortar" (`aprobacion.md:166`) fue sobre 38 a 41. El plan dice "no se corta" como decisión de plan, sin atribuírsela. Si quisiera cortar, el corte natural son las listas y la vista de una clase anterior; no hay un motivo técnico que lo exija.

### (h) Nada más cambia
Ni contrato, ni backend, ni `shared/`, ni las tablas A a D, ni C-11 ni C-12, ni la cifra 78 de V-06. Ninguna línea añadida dice que el humano aceptó algo.

### Problemas que bloquean

#### M-13 — La vista de una clase anterior: la frase del error del detalle no tiene caminos, y su foco no está dicho
Dónde: `plan.md`, §D-9 (estado 1 de la vista, línea 389), ADM-1D234 (d), ADM-1D235 y la fila de la matriz (línea 1686).

Por qué importa:
- **La frase.** Ante un `5xx` o un fallo de red del detalle, `mensajeDeConsultaClases` da "Algo salió mal. Inténtalo de nuevo." (`features/clases/data.ts:345`). Es una frase de recuperación en una vista nueva. ADM-1D234 (d) solo cubre el `403`, y ADM-1D235 recorre las tres frases de "Mis calificaciones", no esta. `AGENTS.md` pide un caso por camino en cada una.
- **El foco.** La matriz dice "el resto, como hoy", pero esta vista no tiene un hoy. `ClaseLayout` usa `useFocoAlPasarAError` (`clase-layout.tsx:37`) porque, si el detalle pasa a error, el control con el foco desaparece y el foco cae en `<body>`. La vista nueva tiene el mismo problema: el filtro "Mostrar" y "Ver más tareas" salen con ella. Sin decirlo, el programador puede omitirlo y el tester lo encontrará: es la clase de ronda que este encargo viene evitando.

Qué se espera:
- ADM-1D235 suma la frase del detalle, con el router real y la configuración de `app/providers.tsx`: "Volver a clases anteriores" y abrir la misma clase, y atrás y adelante. En cada uno se vuelve a pedir el detalle y el texto desaparece. Vale para la primera carga y para una recarga que falla con el detalle en caché.
- §D-9 y la matriz dicen a dónde va el foco cuando el error del detalle reemplaza la vista con el foco dentro, nunca a `<body>`, con su caso. El precedente es `ClaseLayout`.
- Sin textos nuevos y sin C-n.

### Problemas que no bloquean
- **El alumno pierde el foco en la redirección de N-05.** El plan lo declara: no se mueve a mano, no se comprueba y no cuenta como hallazgo. Es coherente con la decisión del humano sobre duplicar (Enmienda 10), pero con una diferencia: aquí la navegación **no la pide la persona**, y el foco queda en `<body>`. Con eso, ADM-T1D103 ya no protege ese estado en el alumno. Lo acepto porque exige archivar con la vista abierta, y la alternativa sería decidir el foco de una pantalla nueva. Conviene que quede en la fila del `chore` de foco y navegación al cierre (`docs/ESTADO.md:256`).
- **Sin ejecutar:** C-40, C-41 y `lint`, como dije arriba.

### Detalles menores
- Las filas 35 y 36 no dicen el destino del enlace. Del texto se entiende `${base}/trabajo`, pero `crear-tarea-view.tsx` cancela hoy hacia `base`, el muro: conviene que ADM-1D201 lo afirme.

### Para el humano
Según `aprobacion.md:171`, ya se le llevaron estos puntos; no consta respuesta de ninguno:
1. **Texto nuevo:** "Tus tareas cambiaron mientras las veías. Vuelve a abrir esta clase para verlas completas." Recomiendo aprobarlo: dice lo que la persona puede hacer en esa vista.
2. **Una clase activa en esa vista redirige a la clase.** Recomiendo aceptarlo.
3. **Tamaño: 44 a 47 archivos, sin corte.** Recomiendo no cortar.

### Veredicto de esta verificación
**CAMBIOS REQUERIDOS: M-13.** Regresa al arquitecto. Lo demás (a) a (h) queda verificado por lectura, y en la siguiente verificación coteo solo el diff contra `ab372fe0…`. El tester puede usar C-40 y C-41 tal como están cuando se reanude la ronda 0, y si ahí no quedan en verde es PARADA. Esa reanudación y el programador siguen esperando esta corrección y la respuesta del humano sobre el texto.

### Verificación de la corrección — Enmienda 12

Veredicto: **APROBADO.** M-13 queda cerrado por lectura, con el plan `e3279dd14df32f72b512e2f9ace1351b6e45cd490dcd7cfec6354cc553d18b60`.

Plan: 2152 líneas, sin CR, igual a la entrada "Corrección de la Enmienda 12" de `aprobacion.md` y a su copia `copias-plan/plan-admin01-v16-enmienda12c-e3279dd1.md`. Copia previa: `ab372fe0…`, comprobada.

**Sin corridas, como pediste.** No corrí pruebas ni ESLint. **Siguen sin verificar** C-40, C-41 y `lint`, que se comprueban después, con corriente. Este APROBADO no los cubre.

#### Cotejo del diff
`git diff --no-index` completo: 27 inserciones y 13 borrados, en 10 hunks. Los borrados son líneas reemplazadas. En lo añadido no hay caracteres invisibles, y no hay `\u`: la nota al orquestador no cambia.

| Hunk | Sección | E12-n |
|---|---|---|
| 1 | Encabezado | E12-12 |
| 2 | §D-9: estado 1, frase de OA-1 y foco de N-05 | E12-15, E12-13 y E12-17 |
| 3 | §D-12: texto aprobado, sin la alternativa | E12-13 |
| 4 | ADM-1D201 | E12-16 |
| 5 | ADM-1D235 y ADM-1D236 | E12-14 y E12-15 |
| 6 | §D-R0: tamaño | E12-13 |
| 7 | Matriz | E12-15 |
| 8 | Pasos 19c: puntos 2 y 7 | E12-13, E12-15 y E12-16 |
| 9 | Párrafo "Decisiones del humano" | E12-13 |
| 10 | Tabla: E12-5 y E12-12 retocadas, filas E12-13 a E12-17, y nota "Al cierre" | La propia tabla y E12-17 |

#### La frase de ADM-1D235: se cumple por cada camino
"Algo salió mal. Inténtalo de nuevo." (`features/clases/data.ts:345`), por lectura del código y de `@tanstack/query-core` 5.103.2:

| Estado | Camino | Por qué se cumple |
|---|---|---|
| Primera carga que falla | (e) volver y reabrir; (f) atrás y adelante | Sin datos, montar la vista otra vez siempre vuelve a pedir |
| Recarga que falla con el detalle en caché | (e) y (f) | El fallo deja `isInvalidated: true`, así que la consulta es vieja aunque no hayan pasado los 30 s, y montar la vista la vuelve a pedir |
| Sigue fallando | Los dos | El texto sigue. Sin ciclo: esta vista no se suscribe a nada que vuelva a pedir el detalle, y `retry: 1` lo acota |

- **El enlace del camino (e) está en el mismo estado 1**, así que la persona siempre lo tiene.
- **Cubre el `5xx` y el fallo de red**, con `it.each`, que es lo que da ese texto.
- **Es correcto que no haya caso de repetir un control ni de pulsar la sección.** El único control es el enlace de vuelta, y la vista no tiene secciones ni otro enlace a su misma ruta.

#### El foco, con `useFocoAlPasarAError`: correcto
- **Es el mismo uso que `clase-layout.tsx:34-37` y `:49`**, y las citas son exactas. El gancho ya se exporta desde `features/clases/hooks.ts`, y `./hooks` es un import que admite `features/*/*`. `foco-02c-r3` a `r5` lo nombran, pero lo prueban montando las vistas de hoy: ninguna lee el código fuente ni enumera a quién lo usa.
- **Cada control de ADM-1D236 corresponde a una guarda de `hooks.ts:929-941`:**

| Caso | Guarda |
|---|---|
| Primera carga que falla: no mueve | `huboDatos` en falso |
| Segundo fallo seguido: no mueve | `habiaError` |
| Foco en la barra: se queda | `focoPerdido` en falso |
| Otra clase anterior sin desmontar: empieza de cero | `clave` |

- **El caso principal también se cumple.** Al pasar a error, el `Outlet` sale con el filtro o «Ver más tareas», el foco se pierde, y el efecto, que corre después del commit, encuentra el contenedor ya montado.
- **Sin archivos, C-n ni lista cerrada nuevos**, como dice E12-15: la vista ya estaba en "Se toca".

#### Las decisiones del humano coinciden con `aprobacion.md`
- **Texto:** el de §D-12, §D-9 y E12-5 es literalmente el de "Decisiones del humano sobre la Enmienda 12": "Tus tareas cambiaron mientras las veías. Vuelve a abrir esta clase para verlas completas." La alternativa sale y 19c.2 queda tachado: correcto.
- **Tamaño:** "No cortar", sobre 44 a 47 archivos, coincide. Mis cifras de la verificación anterior no cambian.
- **La redirección con una clase activa:** `aprobacion.md` dice que se le informó, y el plan la deja como "Dato para él", sin atribuirle una aceptación: correcto.
- Ninguna línea añadida atribuye al humano otra decisión.

#### Nada más cambia
- **E12-16:** ADM-1D201 afirma `${base}/trabajo`, y es cierto que hoy `crear-tarea-view.tsx:29` cancela hacia `base`.
- **E12-17:** el foco de N-05 queda con destino en `docs/ESTADO.md:256`, con el motivo correcto.
- Sin cambios en "Se toca", el contrato, el backend, `shared/`, las tablas A a D, C-11, C-12, C-40, C-41 ni V-06. El código de producción no cambió.

#### Problemas que no bloquean
- **Un estado vecino del foco, para la matriz del primer resumen.** Si el foco ya está en el contenedor del error y el detalle se recupera sin navegar (por ejemplo, con el `refetchOnReconnect` por defecto), el contenedor sale y el foco cae en `<body>`, porque el gancho solo actúa al entrar en error. Es lo que ya hace `ClaseLayout` hoy, y exige perder y recuperar la red con la vista abierta. Lo vi por lectura; no lo corrí. No pide cambio: el programador lo declara, el tester no lo cuenta como hallazgo, y va a la misma fila del `chore` de foco al cierre.

#### Detalles menores
- **E12-11** sigue diciendo "la aprobación del texto antes de escribirlo", aunque 19c.2 ya lo tacha. El cuerpo del plan está bien, y no pide enmienda.

#### Veredicto de esta verificación
**APROBADO.** No queda ningún M-n abierto en el plan. El tester puede reanudar la ronda 0 con C-40 y C-41, ya con corriente. Si no quedan en verde con el código de hoy y con N-05, es PARADA, como dice el plan.

## Verificación del resumen — ADMIN-01d2

Veredicto: **ACEPTADO.** Todas las cifras coinciden, las tablas A, B, B2, C y D coinciden con el código fila por fila, y mis sondas no encontraron ningún defecto. Lo más importante que queda es una falta de cobertura, no un defecto: la segunda guarda de la generación, la de "al llegar", en las filas 33 y 36, no la detecta ninguno de los 207 casos del programador. Es el mismo camino que fue T-02 en 01d1. El código la cumple (N-01d2-1). Sale como primer punto de ataque.

Plan: `plan.md` = `e3279dd14df32f72b512e2f9ace1351b6e45cd490dcd7cfec6354cc553d18b60` (Enmiendas 1 a 12), comprobado. Resumen: `resumen-programador.md` = `6a97c2ef…`, "ADMIN-01d2 — Implementación (2026-11-06)" (línea 1962). Ronda 0: `reporte-tester.md`, líneas 3183 y 3712. Base: `7655a5b`.

Entorno: solo frontend; la otra copia de trabajo no se usa; sin navegadores; una corrida a la vez. `BatteryStatus` 2 en las lecturas de las 15:18 y de las 15:33, sin `--maxWorkers` y sin repetir archivos.
- **Puerta de carga antes de la suite de módulos:** 4 % y 3 %, ningún otro `vitest` (15:18).
- **Sondas:** puertas de 15 % y 24 % (primera tanda) y de 2 % y 8 % (la última, 15:33:21). Las tandas intermedias las lancé seguidas, sin lectura nueva y sin ningún otro `vitest`: lo declaro.
- **Huella del árbol entregado:** `327446d7414ff1df431cd7c83382ef32f13358ba08236e87a2f27e5cf9d2dedd` (`git diff 7655a5b -- frontend backend shared` más el `sha256sum` de los seis archivos sin rastrear). La misma antes y después de mis sondas: no toqué el árbol.

### Cifras: resumen contra mi corrida (desde `frontend/`)

| Qué | Resumen | Mi corrida |
|---|---|---|
| `npm run lint` | exit 0; `All matched files use Prettier code style!`; `> tsc -b` | **Igual**, exit 0 |
| `npm run build` | exit 0, `✓ built in 923ms` | exit 0, `✓ built in 775ms` (el tiempo no se contrasta) |
| Módulos, comando literal | `Test Files 211 passed (211)` · `Tests 4606 passed (4606)` · 224 s | **Igual:** `Test Files 211 passed (211)` · `Tests 4606 passed (4606)` · 226 s (15:18:39), a la primera y sin `FAIL` |
| `npx vitest list` de los dos archivos nuevos | 115 + 92 = 207 | **Igual:** 115 y 92 |
| ADM-1D102 | 5 casos | **Igual:** 5 |
| Archivos | 38 + 6 = 44 (36 de producción y 2 de pruebas nuevas) | **Igual:** 38 y 6. `detalle-tarea-view.tsx` y `personas-view.tsx` sin cambio, como permite el plan |
| V-01 | 262 contra `e2ee9ba2…`, 0 distintos | **Igual:** extraje la lista de `reporte-tester.md:3830`, da `e2ee9ba2…`; `sha256sum -c` 262 OK y 0 distintos; los nombres coinciden con `git ls-files \| grep ataque` (262); 0 sin rastrear |
| "No se toca" | 0 fuera de `frontend/` | **Igual:** `git diff --name-only 7655a5b -- backend shared infra eslint.config.mjs package.json frontend/package.json frontend/eslint.config.mjs` da 0. Los ocho componentes que el plan deja sin tocar y `components/foco`, `lib` y `components/adjuntos`: 0. `docs/DESIGN.md`, `docs/ESTADO.md`, `AGENTS.md` y `CLAUDE.md` sin cambios |
| `renovarTrasErrorDeLaEntrega(` y `avisarDelErrorDeLaEntrega(` | 3 y 5 | **Igual** |
| M-11 | dos líneas, literales de objeto; `useRef<{` nada | **Igual:** `:622` y `:1004`, y 0 |

### Mapeo de las pruebas requeridas

Lo comparé con un guion: cada viñeta del resumen contra la salida de `npx vitest list`, por archivo y título.
- **37 identificadores** (ADM-1D201 a 1D236, con 1D213a y 1D213b). El conteo de cada uno coincide y suma 207.
- **0 títulos con diferencia y 0 casos sin mapear.** Los títulos repetidos son los de un `describe.each` o un `it.each`, y el resumen los repite las veces correctas.
- **Lo que pide cada ADM contra lo que hay:** los revisé uno por uno. ADM-1D221 son las 28 celdas de la tabla B2 sin la fila "Sin archivar" (7 columnas por 4 órdenes). Esa fila son los 7 casos de ADM-1D222 (a), y las 35 celdas quedan cubiertas. ADM-1D223 da 9 + 5 × 2 + 5 + 6 = 30.

### C-n, lista cerrada y alcance

- **C-11, C-12, C-40 y C-41:** en verde dentro de la suite. Sus hashes son los que anotó el tester: `edf4d96e…`, `537e10bc…`, `53909e72…` y `907f9ba5…`. Son las únicas `*.ataque` que cambian contra `7655a5b`, y el programador no las tocó.
- **Lista cerrada:** solo cambian `features/tareas/errores-ch3.test.ts:44` (14 a 15) y `features/clases/clase-archivada-01d1-vista.test.tsx` (sale `["estudiante", true]` y se ajusta el comentario). Nada más de esos dos archivos, ninguna otra prueba normal.
- **Alcance exacto de las Enmiendas 11 y 12**, contra el diff:

| Archivo | Alcance del plan | ¿Se cumple? |
|---|---|---|
| `acciones-de-la-tarea.tsx` | Contexto, `null`, dos reinicios, `onError` con generación | Sí; suma solo el `import` de `toast` que ese `onError` necesita |
| `formulario-tarea.tsx` | `useMontado` y la rama del error de campo | Sí |
| `features/clases/lib.ts` | `estaArchivada` y los dos ayudantes de OA-3; otra función, declarada | Sí; `rutaDeClaseAnterior`, declarada (decisión 5) |
| `components/clase/hooks.ts` | Solo `useMontado` | Sí |
| `muro-view.tsx`, `categorias-view.tsx`, `editar-recurso-view.tsx` | Solo su fila de la tabla D | Sí |
| `encabezado-clase.tsx` | Solo el destino | Sí |
| `features/calificaciones/data.ts` | Solo la clave, sin exportar nada nuevo | Sí |
| `mis-calificaciones-view.tsx` | Lectura del contexto y elección del texto | Sí |
| `features/tareas/data.ts` | La clave de "Volver" y `CLASE_ARCHIVADA` | Sí |
| `app/router.tsx` | Dos rutas del alumno, con su hija, y una del maestro | Sí |
| `features/clases/data.ts` | Rutas, textos, límite y reexportaciones | Sí |

Los textos nuevos son los de §D-12, tal cual. `cursorDeClaseAnterior` es literalmente el que aprobó el humano.

### Tablas contra el código

Imprimí cada `archivo:línea` citado en las cinco tablas y todos dicen lo que el resumen afirma. Lo que importa de cada una:

- **Tabla A:** las filas "Se desmonta" se desmontan de verdad (22, 25, 27, 30, 33, 34, 35 y 36 condicionan el componente que guarda el estado). Las filas que sobreviven tienen su reinicio en el render. Las tres de más son correctas: `confirmandoAnteriorRef` corre con `borrarBtnRef` ya en `null` y no mueve nada.
- **Tabla B y B2:** las guardas están en las líneas citadas. `generacion` nace en el render, y el manejador en vuelo conserva la de su envío, porque `FormularioTarea` y `PanelDeCalificacion` llaman a la prop de su propio render.
- **Tabla C, con la pregunta que me faltó en 01d1 (¿qué se pierde si el callback no corre?):**
  - Filas 23, 24 y 26: `mutate` solo lleva `onSettled` con la guarda, y el componente sigue montado.
  - Filas 27 a 30: sin callbacks.
  - Filas 22 y 25: el callback de `mutate` solo limpia un formulario que ya no existe; el éxito y el error viven en `useCrearDuda` y `useResponder`, con `montado` en el error de campo.
  - Fila 32: `TAREA_CON_ENTREGAS` da un solo aviso en los dos estados. Con el componente montado y otra generación lo da el callback; desmontado, el gancho.
  - Filas 33, 34 y entregar: el `montado` está en el gancho. Filas 35 y 36: en el `catch` de `formulario-tarea.tsx:243`, y el gancho sigue callando.
  - Toda mutación de `features/tareas/hooks.ts` (7) llama a `marcarViejoElDetalleAnteClaseArchivada`. Revisé todos los `toast.` y `.mutate(` de los archivos de las filas 22 a 37: ningún aviso se quedó fuera.
- **Tabla D:** revisé los `TEXTOS_*` que se pintan en una archivada (Dudas, respuestas, personas, entregas, hilo, gradebook, "Mis calificaciones"). Ninguno más pide usar un control oculto. El bloque de respuestas abierto y vacío no deja un título huérfano: su `h3` es `sr-only`.
- **`Ver entregas` sigue en una archivada:** vive en `PanelDeEntregas`, no en `AccionesDeLaTarea`.
- **Backend:** `GET /clases/:claseId` y "Mis calificaciones" llevan `lectura-del-alumno` (`handlers/clases/clases.ts:127`, `handlers/calificaciones.ts:136`), así que la vista de clase anterior no recibe el `409`.

### Sondas (fuera del repositorio, sin tocar el árbol)

Copié los dos archivos de prueba al scratchpad, con las importaciones pasadas al alias `@/`, y les agregué 29 casos "SONDA", corridos con una configuración propia. Todos en verde: `Tests 22 passed | 207 skipped (229)`, y las siguientes tandas `6 passed` más 1 que falló por mi selector y `1 passed` al corregirlo (F34).

| Sonda | Estado | Resultado | Lo que dice el resumen |
|---|---|---|---|
| F22 | Foco en el campo de "Escribe tu duda"; se archiva | `h1` | **No lo dice:** la fila 22 falta en "Foco, fila por fila" (N-01d2-2) |
| F23, F24, F25 | Foco en «Marcar», «Borrar duda», «Responder» y el campo de la respuesta | La fila de la duda | Coincide |
| F26 | Foco en «Borrar» de una respuesta | La fila de la respuesta | Coincide |
| F27 y F27b | Campo de búsqueda y «Agregar a la clase» | `h1` | Coincide |
| F30b | Foco en «Asignar a la clase» de una fila | `h2` "Maestros de la clase" | Coincide |
| F30 | Foco en el campo "Buscar maestro por nombre" | **`h1`** | **Solo dice `h2`** (N-01d2-2) |
| F31, F32, F33, F34, F35, F36 | Editar, borrar, calificar, hilo, crear y editar | `h1` | Coincide |
| L1 | «Cargar más» con `5xx` y `retry: 1`; repetir con dos clics; pedir otra vez | Dos intentos; las filas vuelven sin la página 2; foco en el botón; al pedirla, foco en "Clase 2" y 0 avisos | Coincide |
| L2 | Foco en una fila cuando el mensaje la reemplaza | `h1` de la lista | Coincide |
| D1 | Detalle, primera carga que falla, con `<Providers>` reales; atrás y adelante; `Volver` y abrir | 2 peticiones por transición (el reintento), sin ciclo; con el servidor sano se pinta y el texto se va | Coincide |
| D2 | Recarga con caché y las opciones de `providers.tsx` | Igual | Coincide |
| D3 | Modal "Cálculo" abierto y la clase se restaura (OA-2) | Va a la clase; sin diálogo; `pointer-events` limpio; foco en `<body>` | Coincide (vecino 3) |
| D4 | Modal abierto y la clase se archiva (N-05) | Va a la clase anterior; sin diálogo; `pointer-events` limpio | Coincide |
| D5 | Caché activa y vencida, servidor archivada, entrando por la ruta normal | **1 petición,** queda en la clase anterior | Coincide (ADM-1D234 c) |
| I24, I28, I32 | Borrado en vuelo; archivar y restaurar; reabrir y dos clics | 1 solo `DELETE`, en las tres; la confirmación no reaparece | No lo dice; es correcto |
| T1, T1b, T2, T2b | **Recarga tras el `409` ya en vuelo**; archivar y restaurar; llega (bien o con `500`) | No reinicia, lo escrito y el foco siguen, ningún otro aviso; T1b, al restaurar, no se lleva el foco | **No lo lista** (N-01d2-1) |

**Mutación de la guarda "al llegar"**, por alias, sin tocar el árbol: quité `if (!sigueVigente(generacion)) return` de `editar-tarea-view.tsx:125` y la comparación de `entrega-de-alumno-view.tsx:126`. Con las dos fuera: `Tests 3 failed | 97 passed (100)`. Caen T1, T2 y T2b, solo mis sondas; **los 92 casos de `clase-archivada-01d2-tareas` siguen en verde.** Es un control positivo de mis sondas, y también la prueba de N-01d2-1.

### Hermanos, estados vecinos y matriz

- **Hermanos:** las siete filas coinciden con el código y con sus casos, salvo la que falta (N-01d2-1).
- **Los siete vecinos declarados son ciertos:**
  - (1) `useFocoAlPasarAError` solo actúa al entrar en error.
  - (2) Con `activo` en falso, `ultimoFalloAvisado` no anota; `useAvisoDeRecargaFallida` avisa al montarse el detalle.
  - (3) D3 lo confirma.
  - (4) El plan lo declara.
  - (5) `mis-calificaciones-view.tsx:90-100`: sin `a`, cae en el `h2`.
  - (6) Lo prueba ADM-1D204 (d).
  - (7) Enmienda 10.
- **Matriz:** cada fila coincide con el código; las de foco, con las sondas de arriba, salvo N-01d2-2. La columna "Dos clics, una petición" de las listas la cubren la ref y `cancelRefetch: false`. La guarda de la ref queda sin detección propia, como declara el programador en su única mutación que no cae: es correcto, porque la pide `CLAUDE.md` y `cancelRefetch: false` ya evita la segunda petición.

### Frases de recuperación de ADM-1D235

Las leí caso por caso contra `rutas` y `app/providers.tsx`:

| Frase | Camino | Cómo se cumple | Configuración del caso |
|---|---|---|---|
| Texto del cursor | (a) Volver y abrir; (b) atrás y adelante; (c) otro filtro y regresar | El fallo deja `isInvalidated` en la consulta (TanStack Query, `query.js`), así que se pide aunque no haya vencido el `staleTime`, sin tocar `useMisCalificaciones` | `Providers` |
| "No pudimos cargar tus calificaciones" | Los mismos | Igual; sin datos, además, carga al montarse | `Providers` |
| "No pudimos cargar más tareas" | Repetir «Ver más tareas» | `fetchNextPage` vuelve a pedir esa página | `Providers` |
| "Algo salió mal" | (e) y (f), en dos estados, con `5xx` y red | Sin datos carga al montarse; con caché, `isInvalidated` | `clienteDePrueba` (`retry: false`), ver N-01d2-3; mis sondas D1 y D2 lo repiten con `retry: 1` |

El camino de "pulsar la sección" no existe en esa vista. "Repetir un control" solo aplica a «Ver más tareas». Coincide con el plan. Ningún camino queda como observación.

### N-05, la ruta hija y E12-6

- Las dos redirecciones leen `claveClaseDetalle` con `useClase`, y ninguna inventa una petición: el ciclo no se puede formar. ADM-1D234 (c) lo prueba en los dos sentidos y D5 lo repite con los datos vencidos: una sola petición.
- `<Outlet key={claseId} />` está en `clase-anterior-view.tsx:74`, y `ConClaseDeLaRuta` no lleva `key`.
- El orden es error → cargando → activa → archivada, como en §D-9. El contenedor del error lleva `ref` y `tabIndex={-1}`, con `useFocoAlPasarAError`.
- `ClaseLayout` provee `true` solo al maestro y al admin: el alumno sale antes del `Provider`.

### `useGeneracionDeSoloLectura` en las filas 33, 35 y 36

- **Fila 36:** primera rama de `contenido()`, `setReinicios(0)`, guardas en `:113`, `:123` y `:125`. Sin guarda de vista desmontada, como pide el plan (T-01 de CLASES-03d, destino FORO-01).
- **Fila 35:** guarda en `crear-tarea-view.tsx:31`, sin estado de abierto.
- **Fila 33:** `:120`, `:126`, `:136` y `:155`; `montadoRef` se queda.
- **Control del `409`:** ADM-1D222 (a) fila 36 (un aviso, una lectura, reiniciado y foco en el título), fila 33 (recarga, reinicia, foco en el encabezado), y ADM-1D222 (b) las repite después de archivar y restaurar, y con la clase que nace archivada. La generación solo sube al entrar en solo lectura, así que sin pasar por una archivada el camino es el de hoy. Las vigiladas de la fila 36 siguen en verde.

### Arbitrajes

1. **ADM-1D204 (d) contra la matriz: se acepta, sin enmienda.** No hay contradicción de fondo: la misma fila de la matriz dice "reemplaza con su texto" y "`h1` si el botón desaparece", así que ya contempla que el botón pueda seguir, y el encabezado de la matriz dice que el programador "la confirma o la corrige en su primer resumen". El mensaje reemplaza las filas y el botón queda debajo: cumple las dos frases, sin texto ni control nuevo. El camino del `400` con `resetQueries` es además un defecto que él mismo encontró y resolvió, y L1 y ADM-1D204 lo confirman. **A saber:** se aparta de `clases-admin-view.tsx:133`, donde el botón desaparece con el error, porque ADM-1C07 no pide ese camino; repetir devuelve las filas y no trae la página siguiente, que se pide con otro clic. Es lo que pide el plan ("se vuelve a pedir la primera página"). El humano lo ve en la comprobación de pantalla.
2. **`useRecuperarListaDeClasesAnteriores`: se acepta.** "Se toca" nombra `hooks.ts (useClasesAnteriores)` como referencia, sin la cláusula de PARADA de los archivos de las Enmiendas 11 y 12. Lo piden los caminos de ADM-1D204 y sigue a `useRecuperarListaDeClasesAdmin`. Sin tipos ni textos.
3. **Enlaces del pie en una `Card`: se acepta; cumple `DESIGN.md`.** §6 y §7.2: el texto nunca va directo sobre el fondo con orbes. El enlace usa `buttonVariants({ variant: "link", size: "enlace" })` (§7.3, enlaces sueltos). `Card` no escribe `vidrio-fuerte` ni `data-material` en el archivo, así que V-07 y la Enmienda 9 no cambian, y `Card` es la superficie de siempre: no es la "otra superficie" que la Enmienda 9 manda a PARADA. Corrigió producción y no la `*.ataque`, que es lo correcto. Va a A-04 al cierre, junto con la lista de clases anteriores: **no están en la lista de A-04 del plan y son patrones nuevos.**
4. **Filas sin "Archivada el": es correcto no inventar el texto, y la decisión es del humano** (ver "Para el humano").
5. **`{ cancelRefetch: false }` en `features/tareas`: se acepta.** Es lo que usa el ayudante de `features/clases` desde 01d1, y lo que hace cierta la frase del plan ("invalidar dos veces la misma clave no pide dos veces"): sin eso, la segunda invalidación cancela y repite. `exact: true` se conserva. Riesgo residual, el mismo del ayudante de 01d1: si en ese instante había un `GET` del detalle anterior al archivado, se une a él, la clase sigue viéndose activa y el siguiente `409` lo corrige.
6. **`estaArchivada` genérica: se acepta.** Es solo de tipos, conserva los campos de quien la llama y `clase-archivada-01d1.test.ts` no cambia. La firma no genérica también habría compilado con `estaArchivada({})`, así que la razón que da no es la única posible; no cambia nada.

Decisión 9 del resumen (la vista de clase anterior no monta `useDetalleViejoAnteClaseArchivada`): correcta. Solo llega a `lectura-del-alumno`, que nunca recibe el `409`. Decisión 11 (el caso de más de M-06): correcta, y es la que da valor a la invalidación del gancho.

### Problemas que no bloquean

- **N-01d2-1. La guarda "al llegar" de las filas 33 y 36 no tiene caso propio.** `editar-tarea-view.tsx:125` y `entrega-de-alumno-view.tsx:126`. La tabla de hermanos no lista el estado "la recarga ya en vuelo al archivar", el mismo camino de T-02 en 01d1. B2 ordena la llegada de la escritura, no la de la recarga, así que el plan tampoco lo pedía, y "33 recarga (3), 36 recarga (3)" de las mutaciones solo vale para las guardas juntas. **El código cumple:** T1, T1b, T2 y T2b en verde. Con el precedente de N-16 y de los vecinos de 01c, un vecino que el código cumple no devuelve el resumen. **Destino:** primer punto de ataque del tester; las cuatro sondas están en `C:\Users\Carlos\AppData\Local\Temp\claude\cbc20defe2ff00dc\ce73329e-6e87-4432-b4fc-239c50515013\scratchpad\mgr01d2\casos-tareas.tsx`. Si el orquestador prefiere que el programador los sume antes, son cuatro casos sin tocar producción y yo reviso solo eso.
- **N-01d2-2. "Foco, fila por fila" tiene dos imprecisiones.** Falta la fila 22 (`h1`), y la 30 depende del control: «Asignar a la clase», `h2`; el campo de búsqueda, `h1`. Nunca `<body>`, y el plan dice que el foco de estas filas no cuenta como hallazgo. El programador lo corrige en su siguiente resumen.
- **N-01d2-3. ADM-1D235 (e) y (f) usan `retry: false`, no la configuración de `app/providers.tsx`.** `AGENTS.md` y el plan la piden para las frases, y el comentario del archivo lo reconoce. Con la caché a mano hace falta el `QueryClient`, pero puede llevar `retry: 1`. Mis sondas D1 (con `<Providers>`) y D2 (`retry: 1`) lo repiten y cumplen: dos peticiones por transición y sin ciclo. Punto de ataque, no hallazgo.

### Detalles menores

- `clase-anterior-view.tsx:64`: el `h1` lleva `tabIndex={-1}` sin `ref`, y nadie lo enfoca.
- `marcarViejoElDetalleAnteClaseArchivada` queda dos veces, en `features/clases/hooks.ts` y `features/tareas/hooks.ts`. El plan lo pide así ("el hermano"), pero toca la regla 5; si se quiere una sola, sube en un chore.

### Documentos a actualizar (al cierre del encargo, ninguno ahora)

- **A-04:** suma la lista de clases anteriores y archivadas (con el botón bajo el mensaje), la vista de una clase anterior y el enlace del pie en una `Card`.
- **A-05 (`CLAUDE.md`):** `useMontado` en `components/clase/`, `claveClaseDetalle` y `claveClasesAnteriores` en `services/clasesService.ts`, y las rutas nuevas.
- **ESTADO §3:** N-01d1-4 extendido a las filas 33 y 36, y el foco de N-05 y OA-2 en el `chore` de foco, con el vecino 1.

### Para el humano

Ninguna de estas consta en `aprobacion.md`. No bloquean la ronda del tester.

1. **¿Las filas de las dos listas llevan "Archivada el {fecha}" o solo la fecha?** Hoy: nombre, maestros y la fecha sola, sin decir de qué es. Un prefijo es texto nuevo y lo decide él. Mi recomendación: agregarlo; un dato sin rótulo se entiende peor, y el cambio es de una línea. Conviene preguntarlo ahora y no al final de 01g.
2. **Tareas con fecha futura en una clase anterior.** La fila dice "Vence en N días" y "Asignado", aunque el alumno ya no puede entregar. Sale de `vencimientoDe` y `estadoDeEntregaVisible`, sin cambio en 01d2, y el plan no lo trata. Solo pasa si la clase se archiva antes de la fecha límite. Si quiere otro texto, va como fila de ESTADO §3.
3. **Comprobación visual al final de 01g:** el enlace del pie dentro de su `Card` y el botón «Cargar más» bajo el mensaje de error, sin filas.

### Puntos de ataque para el tester

1. **Recarga tras el `409` ya en vuelo (N-01d2-1):** filas 33 y 36, con archivar y restaurar antes de que llegue, bien y con `500`, en una y dos vueltas. Hazlo también con `tarea.refetch()` en la fila 33 (`RUBRICA_MODIFICADA`).
2. **ADM-1D235 (e) y (f) con `retry: 1` (N-01d2-3)**, y un fallo de red seguido de otro `5xx`.
3. **Lista con `5xx` y `400` alternados:** `5xx` en la página 2, repetir, `400` en la siguiente; ir y volver a media secuencia; el foco en una fila al llegar el error; la lista del maestro y la del alumno.
4. **N-05 y OA-2 con otras cosas abiertas:** «Ver más tareas» en vuelo, filtro distinto de "Todas" y un `403` que llega con la redirección en curso. Sin afirmar un destino de foco en la redirección (§D-9).
5. **Fila 32:** `TAREA_CON_ENTREGAS` del admin con dos vueltas y el segundo paso abierto antes de archivar; `DELETE` con éxito cuando la clase ya está archivada.
6. **Formulario desmontado con un archivo a medio subir (filas 35 y 36):** el `PUT` al almacén llega, el formulario sigue su camino y el `POST` o `PUT` de la tarea recibe `409 CLASE_ARCHIVADA`: un solo aviso, sin navegar.
7. **Alumno con entrega en vuelo:** subida en vuelo y N-05 a la vez, con un `ENTREGA_VACIA` que llega después de la redirección.
8. **Restaurar con `mis-calificaciones` en error:** el texto de la clase anterior no debe verse en la clase activa tras OA-2 (`soloLectura` cambia con la consulta en error).
9. **Dudas en una archivada:** bloque abierto y vacío, «Ver más respuestas» en vuelo al archivar, y plegar y desplegar: nada de título huérfano ni foco en `<body>`.

### Veredicto de esta verificación

**ACEPTADO.** Ningún M-n. El tester puede atacar 01d2. No hice ninguna suite completa: queda para la revisión final, con PA y `lint`, `test` y `build` de nuevo.

### Antes de la ronda 1

Veredicto: **ACEPTADO.** El texto es el que aprobó el humano, los casos de N-01d2-1 detectan las dos guardas, N-01d2-2 y N-01d2-3 quedan cerrados, y solo cambiaron los archivos declarados.

Resumen: `resumen-programador.md` = `0c4afca9…`, "### Antes de la ronda 1 (2026-11-06)" (línea 2413). Plan `e3279dd1…`, sin cambio. `BatteryStatus` 2, sin `--maxWorkers` y sin repetir archivos. Puertas de carga, sin otro `vitest`: 6 % y 3 % (16:05:39, antes de `lint`, `build` y módulos); 8 % y 12 % (16:11:02, antes de las mutaciones).

| Qué | Resumen | Mi corrida |
|---|---|---|
| `npm run lint` | exit 0; `> tsc -b` | **Igual** |
| `npm run build` | exit 0, `✓ built in 804ms` | exit 0, `✓ built in 814ms` (el tiempo no se contrasta) |
| Módulos, comando literal | `Test Files 211 passed (211)` · `Tests 4617 passed (4617)` · 228 s | **Igual:** `Test Files 211 passed (211)` · `Tests 4617 passed (4617)` · 224 s (16:07:01), a la primera y sin `FAIL` |
| `npx vitest list` | 117 + 101 = 218 | **Igual** |
| V-01 | 262 contra `e2ee9ba2…`, 0 distintos | **Igual;** 262 en `git ls-files`, 0 sin rastrear |
| "No se toca" | 0; 38 + 6 archivos | **Igual** |

**Huella nueva:** `8363111fd9d993a3ea32d6f6c2529050adef0f467ac9253bbed0d6c4e91aeeb0` (antes `327446d7…`). Es la misma antes y después de mis mutaciones.

#### Solo cambiaron los archivos declarados

- **Por fecha:** después de `revision.md` solo cambiaron seis archivos de `frontend/src`: los cuatro declarados, más `editar-tarea-view.tsx` y `entrega-de-alumno-view.tsx`, que el programador mutó y restauró.
- **Esas dos vistas están restauradas:** al aplicarles mi misma mutación quedan idénticas a las copias que hice en la verificación anterior.
- **`features/clases/data.ts`:** contra el diff de mi verificación anterior, solo suma `archivadaEl` y su comentario.
- **`lista-de-clases-anteriores.tsx`:** solo cambia la línea de la fecha, contra la versión que leí entonces.
- **Las dos pruebas:** contra mis copias, solo suman los 11 casos, `clienteComoElDeProviders`, y cambian ADM-1D235 (e) y (f). No se quitó ni se debilitó ningún caso. En (f) la aserción se endurece: ahora fija dos peticiones por transición, y que no hay una tercera.
- **Ninguna `*.ataque` cambió.**

#### El texto

`aprobacion.md` dice "Archivada el {fecha}". `TEXTOS_CLASES_ANTERIORES.archivadaEl` es literalmente `` `Archivada el ${fecha}` ``, y lo pintan las dos listas por el mismo componente. Los dos casos lo afirman en las dos perspectivas y comprueban que la fecha ya no va sola.

**Una consecuencia que no estaba a la vista:** `formatearFechaLarga` da día de la semana, día y mes, sin año: "Archivada el lunes 5 de octubre". Es la misma fecha del aviso fijo, y el plan pide esa función. Ver "Para el humano".

#### N-01d2-1: los casos detectan las guardas

Repetí las mutaciones por alias, fuera del árbol, sobre una copia de la prueba nueva, con `-t "recarga en vuelo"`:

| Mutación | Resultado | Lo que dice el resumen |
|---|---|---|
| Sin mutar (control) | `9 passed` | — |
| Sin `editar-tarea-view.tsx:125` | `2 failed`: los dos de "fila 36, recarga en vuelo, $orden" | Igual |
| Sin `entrega-de-alumno-view.tsx:126` | `6 failed`: los tres de la fila 33 en cada orden | Igual |
| Sin las dos | `8 failed \| 1 passed` | Igual |

El caso que no cae con ninguna, "llega con la clase archivada…", protege otra cosa, como él declara: el `setReinicios(0)` de `:52`. Los 9 casos no dependen de tiempos: esperan por estado y dejan correr 50 turnos de promesas. La fila "Generación, guarda 'al llegar'" ya está en la tabla de hermanos (`resumen-programador.md:2121`). **N-01d2-1 queda cerrado.**

#### La guarda del `catch` de `entrega-de-alumno-view.tsx:136`

**Sí es código muerto en la práctica, y aceptarla sin caso es correcto.**
- `refetch` no rechaza: `QueryObserver.fetch` pasa por `#executeFetch`, que hace `promise.catch(noop)` si no se pide `throwOnError`, y aquí no se pide (`queryObserver.js:236-250`). Un `500` o una cancelación llegan como resultado, por `entregaNueva.isError`, que sí está cubierto con la guarda de `:126`.
- Lo demás dentro del `try` son funciones puras y `setReinicios`, que tampoco lanzan.
- El `catch` no es de 01d2: ya estaba en `7655a5b` (`:127`). La guarda la pide el plan (Enmienda 11, filas 33 y 34: "antes del aviso de su `catch`"), y si ese camino llegara a correr, se comporta como las otras dos.
- Un caso exigiría simular TanStack Query para llegar a una rama que la librería no alcanza. No aporta nada. Quitar el `try/catch` sería un cambio fuera de "Se toca" y sin efecto para la persona: no se hace aquí, y no merece fila propia.

#### N-01d2-2 y N-01d2-3

- **N-01d2-2, cerrado.** `resumen-programador.md:2146` dice ahora: fila 22, `h1`; fila 30, según el control («Asignar a la clase», `h2`; campo de búsqueda, `h1`). Coincide con mis sondas F22, F30 y F30b. El programador dice que no lo volvió a medir, y es cierto que no hace falta: esos archivos no cambiaron.
- **N-01d2-3, cerrado.** `clienteComoElDeProviders` tiene las mismas opciones de consultas que `app/providers.tsx` (`retry: 1`, `refetchOnWindowFocus: false`, `staleTime: 30_000`), y ADM-1D235 (e) y (f) lo usan. El resto de las frases ya montaban `Providers`. `clienteDePrueba` sigue en casos que no son frases de recuperación.

#### Para el humano

Las dos decisiones anteriores ya constan en `aprobacion.md`: el texto de la fila y el vencimiento "A ESTADO, como está". Queda una, que no bloquea y es de la comprobación visual del final de 01g:

**La fecha de las filas no lleva año:** "Archivada el lunes 5 de octubre". En una lista de clases de varios ciclos, dos fechas iguales de años distintos se leen igual. Sumar el año pide otro formato, y `lib/format.ts` no se toca en este encargo (E-37). Si lo quiere, va como fila de ESTADO §3, junto con el aviso fijo, que usa la misma fecha.

#### Puntos de ataque para la ronda 1

Los de la verificación anterior, sin el 1 y el 2, que ya tienen casos propios:

1. **Lista con `5xx` y `400` alternados:** `5xx` en la página 2, repetir, `400` en la siguiente; ir y volver a media secuencia; el foco en una fila al llegar el error; la lista del maestro y la del alumno.
2. **N-05 y OA-2 con otras cosas abiertas:** «Ver más tareas» en vuelo, filtro distinto de "Todas" y un `403` que llega con la redirección en curso. Sin afirmar un destino de foco en la redirección (§D-9).
3. **Fila 32:** `TAREA_CON_ENTREGAS` del admin con dos vueltas y el segundo paso abierto antes de archivar; `DELETE` con éxito cuando la clase ya está archivada.
4. **Filas 35 y 36 con un archivo a medio subir:** el `PUT` al almacén llega, el formulario sigue su camino y el `POST` o `PUT` de la tarea recibe `409 CLASE_ARCHIVADA`: un solo aviso, sin navegar.
5. **Alumno con entrega en vuelo:** subida en vuelo y N-05 a la vez, con un `ENTREGA_VACIA` que llega después de la redirección.
6. **Restaurar con "Mis calificaciones" en error:** el texto de la clase anterior no debe verse en la clase activa tras OA-2.
7. **Dudas en una archivada:** bloque abierto y vacío, «Ver más respuestas» en vuelo al archivar, y plegar y desplegar: nada de título huérfano ni foco en `<body>`.
8. **La recarga en vuelo con más vueltas:** una vista desmontada mientras la recarga sigue en vuelo, y un segundo `409` que llega con la primera recarga sin resolver. Los 9 casos no cubren esos dos órdenes.

#### Veredicto de esta verificación

**ACEPTADO.** Ningún M-n y ningún N-n abierto. El tester puede empezar la ronda 1 de 01d2. La suite completa queda para la revisión final.

## Arbitraje de T-02 — ADMIN-01d2

Origen: `reporte-tester.md`, "## Ronda 1 — ADMIN-01d2" (línea 4097; `9a8cdc10…`), y ADM-T1D220 (`features/clases/clase-archivada-01d2-r1.ataque.test.tsx:603`). Plan `e3279dd1…`, sin cambio.

**Decisión: (a). Es un defecto, se corrige en 01d2, con un arbitraje y sin enmienda.** ADM-T1D220 queda como está, sin C-n.

### Lo que ve la persona

Lo medí con el router real, las opciones de `app/providers.tsx` y el código de hoy. El alumno y el maestro abren su lista (vacía), entran a una clase activa, la clase se archiva y leen "Clase archivada el …. Solo puedes consultarla.". Pulsan "Volver…":

| Rol | Texto | Peticiones de la lista |
|---|---|---|
| Alumno | **"No tienes clases anteriores"** | 0 |
| Maestro | **"No tienes clases archivadas"** | 0 |

El texto es falso, y la pantalla anterior acaba de decir lo contrario. Si la persona no sale de la lista, se queda así: el `staleTime` solo actúa al volver a montarla. Con más clases archivadas, el defecto es igual, aunque menos visible: falta la que acaba de ver. La ventana es estrecha (el archivado cae dentro de los 30 s desde que se pidió la lista), y por eso la severidad sigue siendo baja. Pero el remedio cuesta poco, y la ronda de corrección ya está abierta por T-01 y T-03.

### Por qué no lo cubre la Enmienda 10

E10-6 decide una cosa, y esa se queda: **ninguna mutación del admin marca vieja esa clave**, porque en su sesión nunca tiene datos. Su frase general ("ven el cambio en su siguiente petición") describe a quien no sabe que hubo un cambio. Aquí la sesión lo sabe: su propia consulta de detalle lo acaba de leer. Es un caso que E10-6 no contempló, no una decisión contraria.

### El remedio mínimo

Un gancho en `features/clases/hooks.ts`, sin tipos ni textos nuevos, que `ClaseLayout` y `clase-anterior-view.tsx` llaman con su `claseId` y con si la clase está archivada:

- Con la clase archivada, lee `claveClasesAnteriores()` de la caché.
- Si no hay lista, no hace nada (la sesión del admin, o quien aún no la abrió).
- Si la clase ya está en sus páginas, no hace nada.
- Si no está, `removeQueries({ queryKey: clave, exact: true })`.

**Las decisiones del remedio, y por qué:**

| Decisión | Razón |
|---|---|
| Quitar la lista, no marcarla vieja | Lo probé: con `invalidateQueries`, mientras se vuelve a pedir **se sigue leyendo el vacío falso** (alumno y maestro). Al quitarla, se lee "Cargando" y después la lista. El precedente de quitarla es `useRecuperarListaDeClasesAnteriores`. Nadie la observa en ese momento, porque la lista y la clase son rutas distintas |
| Mirar si ya está en la lista | Sin esa guarda, abrir una clase desde la lista y volver pediría la lista cada vez. Con ella, 0 peticiones (sonda) |
| Leer el detalle, no la escucha `useDetalleViejoAnteClaseArchivada` | La escucha solo ve errores `409`. El detalle puede llegar archivado sin ningún `409`, como en ADM-T1D220 (una recarga de la clase). El dato que cuenta es lo que dice el detalle, y es el mismo que decide el aviso |
| No ponerlo en `AvisoDeClaseArchivada` | Pinta un aviso y no tiene por qué tocar la caché. `ClaseLayout` y la vista de clase anterior ya leen el detalle |
| Las dos vistas | `ClaseLayout` cubre al maestro; `clase-anterior-view.tsx`, al alumno que llega por N-05 o por un enlace guardado |

**Lo comprobé fuera del árbol**, con copias de las dos vistas y un gancho propio, por alias del router:
- **ADM-T1D220, en las dos listas:** en verde.
- **Sin vacío falso mientras se pide:** alumno y maestro, con la petición retenida.
- **Con la clase ya en la lista:** 0 peticiones al volver.
- **Pruebas vecinas (`clase-archivada-01d2-r1.ataque`, `01d2-vista`, `01d1-vista`, `01d1-r1.ataque` y `app/router.test`):** `Tests 323 passed (323)` en 5 archivos.

**Ese 323 no es una cifra de verificación:** el programador ya trabaja T-01 y T-03 en el árbol (huella `330feae0…`), y por eso ADM-T1D227 ya no sale en rojo. No corrí ninguna suite completa. Puerta de carga: 8 % y 8 % (16:42:38), `BatteryStatus` 2, ningún otro `vitest` en esa lectura. No toqué el árbol.

### Enmienda o arbitraje

**Arbitraje, como P-01c-5.** No cambia el contrato, ni el backend, ni `shared/`, no hay texto nuevo y ninguna decisión del humano se revierte.
- **"Se toca":** `features/clases/hooks.ts` ya está, y es la familia de `useClasesAnteriores`, como `useRecuperarListaDeClasesAnteriores`. `clase-anterior-view.tsx` es nuevo de 01d2. `clase-layout.tsx` ya está, y la cláusula de PARADA de las Enmiendas 11 y 12 no lo alcanza: es de los archivos que esas enmiendas suman.
- **Lista cerrada y C-n:** sin cambios. Ninguna prueba nombra la clave por su función ni la compara. Las únicas simulaciones de `./hooks` son las de los dos `inicio-sin-datos`, que no montan estas vistas. ADM-T1D220 ya espera este comportamiento.
- **Lo que este arbitraje precisa del plan, sin tocar su hash:**
  - `plan.md:426` ("ven el cambio en su siguiente petición de la lista"): vale salvo cuando la propia sesión lee el detalle archivado y su lista no trae la clase.
  - `plan.md:1509` ("la clave la usan solo `useClasesAnteriores` y sus pruebas"): suma este gancho. Sigue cierto que ninguna mutación del admin la marca vieja, y `hooks.ts:438` no cambia.
  - La matriz de 01d2 suma esta fila en el resumen del programador, y el cierre lo lleva a los documentos.

**Para el humano:** no hace falta una decisión; solo se le informa. Es un defecto del mismo mecanismo y no agrega ni texto ni control.

### Lo que no se extiende

- **El sentido contrario (restaurada, y la lista aún la trae):** se queda como el vecino 7 ya declarado. La fila no es falsa como un vacío, y al abrirla OA-2 lleva a la clase.
- **La barra lateral y las listas del inicio, que siguen trayendo la clase archivada hasta su siguiente petición (el hermano que anotó el tester):** no entran. No afirman nada falso sobre la clase y el enlace funciona (N-05 o solo lectura). Renovarlas tiene otro costo: la barra está montada, se volvería a pedir mientras la persona está en la clase, y cambiaría peticiones que hoy fijan otras pruebas. **Sí roza `ARCHITECTURE-ESSENTIALS.md`** ("una clase archivada no aparece en la barra ni en el inicio"), en la misma sesión y por poco tiempo. **Destino:** fila de ESTADO §3 al cierre, con destino en el `chore` de foco y navegación o uno posterior. El orquestador la anota con las demás.

### Para el programador

- Corrige T-02 con este remedio, dentro de la ronda de corrección 1. ADM-T1D220 no se toca.
- **Casos propios requeridos, en las dos listas:**
  - la clase no está en la lista en caché: al volver no se lee el vacío mientras se pide, y sale la clase (petición retenida);
  - la clase ya está: 0 peticiones al volver;
  - sin lista en caché: no pasa nada, también con la perspectiva del admin.
- **Hermanos y estados vecinos que debe listar:**
  - detalle que pasa a archivada con la vista abierta, y que nace archivada;
  - alumno por N-05 y por un enlace guardado;
  - maestro;
  - la clase en una página sin cargar (se quita la lista y solo cuesta una lectura);
  - archivar, restaurar y volver a archivar;
  - otra clase archivada (`claseId` en las dependencias del efecto).
- **Sin invalidar** `CLAVE_CLASES_INSCRITAS` ni `CLAVE_CLASES_IMPARTIDAS`, ni marcar nada al restaurar.

**Medición:** T-02 es un hueco del plan, no un remedio sin extender por analogía. No cuenta como ronda extra por hermanos del programador.

**Veredicto:** T-02 resuelto con (a).

## Verificación de la corrección de la ronda 1 — ADMIN-01d2

Veredicto: **ACEPTADO.** T-01, T-02 y T-03 quedan corregidos, las cifras coinciden, y las tablas de vistas y de hermanos coinciden con el código. Ningún M-n. Lo único nuevo son dos detalles que no bloquean.

Resumen: `resumen-programador.md` = `42ab7157…`, "## ADMIN-01d2 — Corrección ronda 1" (línea 2468) y "### Hermanos autorizados de T-01" (línea 2666). Plan `e3279dd1…`, sin cambio. Ronda 1: `reporte-tester.md`, línea 4097. Autorización del humano: `aprobacion.md`, "Decisiones del humano (2026-11-06)".

Entorno: solo frontend; `BatteryStatus` 2 en todas las lecturas; sin `--maxWorkers` y sin repetir archivos; sin navegadores; una corrida a la vez y ningún otro `vitest`. Puertas de carga: 13 % y 12 % (17:24:14, antes de `lint`, `build`, los archivos del tester y módulos); 5 % y 1 % (17:30:01, antes de las mutaciones); 3 % y 11 % (17:42:07, antes de las sondas). **Huella:** `c38db192f0627789af8d06ac7936f5723adbae419e1cad1ab8ed0ce352dfa273`, igual antes y después de mis mutaciones y sondas.

### Cifras: resumen contra mi corrida (desde `frontend/`)

| Qué | Resumen | Mi corrida |
|---|---|---|
| `npm run lint` | exit 0; `> tsc -b` | **Igual** |
| `npm run build` | exit 0, `✓ built in 814ms` | exit 0, `✓ built in 784ms` (el tiempo no se contrasta) |
| Módulos, comando literal | `Test Files 213 passed (213)` · `Tests 4719 passed (4719)` | **Igual** (17:25:45, 230 s), a la primera y sin `FAIL` |
| Los dos archivos del tester | `Tests 57 passed (57)` | **Igual** |
| `npx vitest list` | 153 y 110 | **Igual** |
| V-01 | 262 contra `e2ee9ba2…`, más `0fc7408a…` y `af127fae…` sin rastrear: 264 | **Igual:** 262 OK y 0 distintos; las dos, con esos hashes |
| "No se toca" contra `7655a5b` | 0 fuera de `frontend/`; solo suman los dos archivos autorizados | **Igual:** 0 fuera de `frontend/`; 40 modificados y 8 sin rastrear. Los 2 modificados de más son `trabajo-view.tsx` y `recursos-view.tsx`; los 2 sin rastrear de más, las `*.ataque` del tester |

**El diff autorizado:** en cada uno de los dos archivos, el `import` de `@/components/clase/lib` y `&& !esClaseArchivada(temas.error)` en el segundo argumento. Tres líneas por archivo, nada más. Coincide con lo que autorizó el humano, y cada vista tiene sus casos y su mutación, como pidió.

### Mutaciones (en memoria, con un plugin de Vite; el árbol no se toca)

Sobre los cuatro archivos de 01d2 (los dos de pruebas propias y los dos del tester). Control sin mutar: `Tests 320 passed (320)`.

| Quito | Resultado | Caen |
|---|---|---|
| T-01: `if (esClaseArchivada(consulta.state.error)) return` | `8 failed` | ADM-T1D215 y siete casos T-01: detalle, entregas, entrega de un alumno, editar, redirección, fallos seguidos, error ya en caché |
| `trabajo-view.tsx`: la condición | `2 failed` | "la recarga de los temas" y "fallos seguidos" |
| `recursos-view.tsx`: la condición | `2 failed` | Los mismos, en Recursos. El resumen no los había identificado en esta vista; son estos |
| T-02: la guarda de "ya la trae" | `8 failed` | Lista con la clase, varias páginas, restaurada y otra clase, en las dos listas |
| T-02: invalidar en lugar de quitar | `7 failed` | Pasa a archivada, nace archivada, otra clase y enlace guardado |
| T-03: el `return null` | `3 failed` | ADM-T1D227 y dos casos T-03 |
| T-03: el destino de respaldo del foco | `1 failed` | "T-03 vecino" |

### T-01

- **Cubre las cuatro vistas.** Las cuatro llamadas (`detalle-tarea-view.tsx:53`, `entregas-view.tsx:59`, `entrega-de-alumno-view.tsx:98` y `editar-tarea-view.tsx:69`) pasan como `fallo` la consulta de la tarea, y el gancho lee el error de esa misma consulta (`claveTarea`). No hay ninguna llamada con otra consulta cuyo error se pueda confundir.
- **No calla otros errores.** La condición es exacta (`esClaseArchivada`) y va después de anotar la marca: el `409` queda atendido y no se come el siguiente. Mi sonda: `5xx` avisa, `409` no, `5xx` avisa otra vez (1, 1 y 2 avisos en 4 lecturas).
- **Alumno con todo a la vez** (tarea, su entrega y su hilo con `409`): termina en la clase anterior sin ningún aviso. Ningún texto falso, y ninguno de más.

### Los hermanos, con la tabla de vistas

Cada fila la contrasté con `enClaseArchivada` del backend y con `app/router.tsx`. Un grep de "última versión", "Puedes seguir editando" y `No pudimos actualizar` en los `data.ts` da ocho textos, de cinco usos (Actividades, Recursos, Categorías, ruta 20 y las tareas), y todos están en la tabla.

- **`categorias-view.tsx`: es correcto no tocarla.**
  - `GET …/categorias` lleva `roles: ["maestro", "admin"]` y `enClaseArchivada: "lectura"` (`handlers/tareas/categorias.ts:15` y `:17`), y `evaluarClaseArchivada` solo niega `lectura` al estudiante (`core/clases/archivada.ts:22`). A esos dos roles no les llega el `409`.
  - El alumno no tiene esa ruta (`router.tsx:85-104`), `useCategorias` nace con `enabled` en `gestionarTrabajo` y `formulario-tarea.tsx` tampoco es del alumno.
- **No queda otra vista del alumno con el aviso falso.** Sus rutas son Avisos, Actividades, Recursos, Dudas, Personas, Calificaciones y el detalle de una tarea:
  - Avisos, Dudas, Personas y `seccion-de-tema.tsx` pintan su error con el texto de archivada, que es cierto.
  - `seccion-de-recursos.tsx:64` avisa con `mensajeDeConsultaClases`, el mismo texto cierto, y con un solo `id` de aviso.
  - Mis calificaciones es `lectura-del-alumno`.
  - Actividades, Recursos y el detalle ya están corregidos.
- **Ruta 20, ruta 36, `TEXTOS_CALIFICAR.avisoRecargaFallida` e hilo:** como dice la tabla. Son de maestro y admin, o el texto es cierto.
- **Una aclaración sobre "toda la sección a la vez":** el programador declara que ese caso no protege la guarda, y mis mutaciones lo confirman: no cae. Es correcto como declarado, porque fija que ningún otro camino da el aviso.

### T-02, contra mi arbitraje

`useClaseArchivadaEnSuLista` (`features/clases/hooks.ts:419`) es lo que pedí:
- Con la clase archivada lee la lista. Sin lista, nada. Con la clase en sus páginas, nada. Si no, `removeQueries` con `exact: true`.
- La llaman `clase-layout.tsx:49` y `clase-anterior-view.tsx:31`.
- No toca `CLAVE_CLASES_INSCRITAS` ni `CLAVE_CLASES_IMPARTIDAS`, no marca nada al restaurar, y ninguna mutación del admin toca la clave. E10-6 sigue en pie.
- Sin tipos nuevos y sin textos.
- ADM-T1D220 en verde, sin cambios en la `*.ataque`.
- Los casos del arbitraje y la lista de vecinos están todos, con su título. Con "invalidar en lugar de quitar", el caso del vacío mientras se pide cae: lo que el arbitraje exigía.

### T-03 y su efecto

- **El remedio** es el correcto: `respuestas-de-duda.tsx` devuelve `null` solo con `soloLectura`, sin filas y sin error, después de los ganchos.
- **El efecto en el foco lo medí**, con la última respuesta borrada y el `DELETE` en vuelo al archivar:

| Estado | Foco |
|---|---|
| Al archivar (con la confirmación abierta) | La fila de la respuesta |
| Llega la respuesta y no queda ninguna | **La fila de la duda** (`data-duda-id`) |
| Al restaurar, con el formulario de vuelta | Sigue en la fila de la duda; no se la lleva el formulario |
| Quedan otras respuestas | La fila de la respuesta vecina |
| Control: la misma secuencia en una clase activa | El `h3` "Respuestas", como hoy |

  Nunca en `<body>`. `encabezadoRef.current ?? …` no cambia nada mientras el `h3` existe.
- **Los hermanos** (títulos que quedan solos) coinciden con el código. El bloque vacío del admin en una clase activa se queda: es de antes de 01d2, el `h3` es `sr-only` y es destino de foco.

### Tabla de hermanos y estados vecinos

Las tablas de T-01, T-02 y T-03 coinciden con el código. "Cambio de clave (otra tarea)" lo declara por lectura, y es correcto: `ultimoFalloAvisado` es un `WeakMap` por consulta. "Con `callado`" también: el fallo callado no llega a esa rama. La fila nueva de la matriz, "detalle que llega archivado con la lista en caché sin la clase", coincide con el código.

### Problemas que no bloquean

- **`aria-controls` en el bloque vacío.** Lo declara el programador, y lo medí: con el bloque en `null`, «Ocultar respuestas» apunta a un `id` que no existe. Sin efecto para quien no usa tecnología de asistencia, y el `aria-expanded` sigue siendo cierto. No lo reabro a última hora. **Destino:** fila de ESTADO §3 al cierre, como dice él.
- **"T-03 vecino" solo afirma que el foco no cae en `<body>`, no que va a la fila de la duda.** La mutación del respaldo sí lo hace caer, y mi sonda mide el destino. Para el tester, en el punto 5.

### Detalles menores

- `resumen-programador.md`, los dos párrafos de V-01: "mÃ¡s" tiene la codificación mal. Sin efecto en las cifras.
- La tabla de arriba en "Corrección ronda 1" sigue diciendo "No: PARADA" en dos filas; "Hermanos autorizados de T-01" lo corrige de forma expresa. Correcto como historial.

### Puntos de ataque para la ronda 2

1. **T-01 con `callado`:** en la entrega de un alumno, la tarea con `409` mientras la entrega se vuelve a pedir o la reemplaza, y salir de la vista; y al volver, un `5xx` nuevo avisa una sola vez. Con otra tarea sin desmontar.
2. **Recursos, con órdenes de llegada:** los temas y las secciones de los dos bloques en `409` y en `5xx` alternados; un solo aviso a la vista y nunca "última versión" justo antes de la redirección.
3. **T-02 con la lista en movimiento:** «Cargar más» en vuelo al salir hacia la clase, y su respuesta después de quitar la lista; lista en error en caché; dos clases archivadas seguidas; atrás del historial desde la clase anterior hacia la lista.
4. **T-02 con páginas sin cargar:** una clase en una página sin cargar, abierta varias veces: una lectura por apertura, sin ciclo y sin perder la lista.
5. **T-03 con más de una respuesta:** dos `DELETE` en vuelo con la clase archivada, llegando en los dos órdenes, y el destino exacto del foco; «Ver más respuestas» con la última página vacía.
6. **T-03, respuesta nueva:** el bloque vacío en una archivada que recibe respuestas por una recarga (reaparece sin llevarse el foco), y una recarga con error, y luego sana, que no lo deja en `null`.
7. **Regresión de la corrección:** las cuatro vistas del gancho con el `409`, con y sin datos, después de archivar y restaurar dos veces.

**Lo que no se cuenta como hallazgo:** `aria-controls` del bloque vacío, la barra lateral y las listas del inicio con la clase archivada (arbitraje de T-02), la fecha sin año, y lo que ya lista la ronda 1.

### Veredicto de esta verificación

**ACEPTADO.** Ningún M-n. El tester puede empezar la ronda 2 de 01d2. La suite completa queda para la revisión final.

## Arbitraje de T-04 — ADMIN-01d2

Origen: `reporte-tester.md`, "## Ronda 2 — ADMIN-01d2" (línea 4259; `32ab7f98…`), y ADM-T2D202 (`features/clases/clase-archivada-01d2-r2.ataque.test.tsx:533`). Plan `e3279dd1…`, sin cambio.

**Decisión sobre T-04: (a). Se corrige, sin enmienda y sin C-n.** ADM-T2D202 queda como está. **Decisión sobre O-r2-1: se acepta, no necesita nada.** **Ninguna de las dos va al humano para decidir:** no hay texto, contrato ni decisión suya que cambie; solo se le informa.

**Es una omisión de mi arbitraje de T-02.** Escribí "si no hay lista, no hace nada" sin separar "no hay lista" de "su primera página está en vuelo". El programador hizo lo que pedí, y mi verificación de la ronda 1 tampoco lo vio. **Medición:** no se cuenta contra el programador como una ronda extra por no extender un remedio.

### Por qué (a)

Es el mismo texto falso que T-02 decidió corregir, y lo medí: "No tienes clases anteriores" o "No tienes clases archivadas", sin ninguna petición más. La ventana es más estrecha, pero aceptarlo dejaría una regla difícil de explicar, "la lista dice la verdad salvo si…", y el remedio son dos líneas de un solo archivo.

### El remedio mínimo

Solo `useClaseArchivadaEnSuLista` (`features/clases/hooks.ts:424-426`), sin tipos ni textos nuevos. Cierra una regla de una frase, que es la que evita otro vecino:

> **Al leer la clase archivada, la lista en caché solo se queda si no tiene nada en vuelo y ya trae esa clase, o si no hay nada que quitar.**

```ts
const consulta = queryClient.getQueryState<InfiniteData<ListaClasesAnterioresRespuesta>>(clave)
const enVuelo = consulta?.fetchStatus === "fetching"
if (!enVuelo && consulta?.data === undefined) return
if (!enVuelo && consulta?.data?.pages.some((pagina) => pagina.clases.some((clase) => clase.id === claseId))) return
queryClient.removeQueries({ queryKey: clave, exact: true })
```

**Por qué esta forma y no las otras:**

| Opción | Por qué no |
|---|---|
| Quitar solo si no hay datos y está en vuelo | Era mi primera versión. Cierra T-04, pero deja el vacío falso en un vecino que medí: con la clase ya en la lista y una recarga en vuelo que no la trae (restaurada y vuelta a archivar), al volver se lee el vacío |
| Solo cancelar la petición | Es lo mismo que quitarla cuando no hay datos, y con datos no resuelve que estén viejos. Son dos caminos en lugar de uno |
| Que el gancho observe la consulta | Agrega una suscripción y un estado, y sigue actuando sobre una respuesta que llega con la vista ya desmontada |

**Una petición en vuelo se quita sin riesgo:** nadie la observa, porque la lista es otra ruta, y su respuesta tardía no vuelve a entrar. Ya lo fija ADM-T2D201.

**El costo:** si la persona sale de la lista hacia la clase con algo en vuelo, y la clase resulta archivada, al volver hay una lectura más y se pierden las páginas ya cargadas. No hay ciclo ni vacío falso. Con nada en vuelo, el costo es el de T-02.

### Lo comprobé fuera del árbol

Con el remedio aplicado en memoria, por un plugin de Vite; no toqué el árbol. Las dos listas dan lo mismo. Sin ningún otro `vitest`; puertas 8 % y 2 % (18:06:50) y 17 % y 11 % (18:12:02); `BatteryStatus` 2 (18:06:50). Huella de frontend `85d1eccf…`, igual antes y después. No corrí ninguna suite completa.

| Estado de la lista al leer la clase archivada | Hoy | Con el remedio | Peticiones de la lista |
|---|---|---|---|
| Primera página en vuelo; llega sin la clase antes de volver (T-04) | **Vacío falso** | Sale la clase | 2 |
| Primera página en vuelo; se vuelve con ella aún en vuelo | **Vacío falso** al llegar | Sale la clase; sin vacío en medio ni al final | 2 |
| Primera página en vuelo que después falla | Sale la clase | Sale la clase | 2 |
| Pedida después del archivado, todavía en vuelo | Sale la clase | Sale la clase | **2 (una más; el costo)** |
| Con la clase en la lista y una recarga en vuelo que no la trae | **Vacío falso** | Sale la clase | 3 |
| Sin lista ni nada en vuelo | Sale la clase | Sale la clase | 1 |

**Pruebas vecinas** (`clase-archivada-01d2-vista`, `01d2-r1.ataque`, `01d2-r2.ataque`, `01d1-vista`, `01d1-r1.ataque` y `clases-admin-01c`):
- Hoy: `Tests 2 failed | 450 passed (452)`. Los dos rojos son ADM-T2D202, uno por lista.
- Con el remedio: `Test Files 6 passed (6)` · `Tests 452 passed (452)`. Incluye ADM-T1D220, ADM-T2D201, ADM-T2D203, ADM-T2D204, ADM-T2D206 y todos los T-02, en sus estados vecinos. Sigue siendo 0 peticiones con la lista quieta que ya trae la clase, con una página o con varias.

### Todos los estados de ese mecanismo, para que no aparezca otro vecino en la ronda 3

Los recorrí contra `query.state`: los datos (con la clase, sin ella o ninguno) por `fetchStatus` (quieta, en vuelo o en pausa), más los momentos de la vista.

| Estado | Qué pasa con el remedio | ¿Cubierto? |
|---|---|---|
| Sin consulta en la caché | No hace nada; al abrirla, se pide | Sí (T-02, sesión del admin) |
| Sin datos, quieta (error de la primera carga) | No hace nada; al abrirla, se pide porque no hay datos | Sí (sonda; ADM-T2D203 lo cubre con filas) |
| Sin datos, en vuelo | **Se quita (T-04)** | **Nuevo** |
| Sin datos, en pausa (sin red) | No hace nada: la petición aún no sale, así que al salir ya traerá la clase | Por lectura |
| Sin la clase, quieta | Se quita | Sí (T-02) |
| Sin la clase, en vuelo (recarga o «Cargar más») | Se quita | Sí (ADM-T2D201) |
| Sin la clase, en pausa | Se quita | Por lectura; mismo camino que "quieta" |
| Con la clase, quieta | Se queda | Sí (T-02) |
| Con la clase, en vuelo | **Se quita** | **Nuevo** |
| Con la clase, en pausa | Se queda | Por lectura |
| Con la lista en error y filas | Se decide por sus filas, y al desmontarse ya salió | Sí (ADM-T2D203) |
| Otra clase archivada sin desmontar | `claseId` en las dependencias | Sí (T-02 y ADM-T2D204) |
| Página sin cargar | Se quita; una lectura por apertura | Sí (ADM-T2D206) |
| Alumno por N-05, y por un enlace guardado | Las dos vistas llaman al gancho; la segunda ya no encuentra nada | Sí (T-02) |
| ¿Puede empezar una lectura de la lista con la clase abierta? | No: solo `useClasesAnteriores` la pide, y solo la lista la monta. Por eso el efecto no necesita volver a correr | Por lectura |

**Lo único que queda fuera, y no cuenta como hallazgo en la ronda 3:**
- **El sentido contrario:** una clase restaurada que sigue en la lista (vecino 7, arbitraje de T-02).
- **La barra lateral y las listas del inicio** con la clase archivada (fila de ESTADO §3 al cierre).
- **La lista abierta, sin salir de ella,** mientras el admin archiva otra clase: la sesión no lo sabe, y eso es lo que aceptó E10-6.

### Para el programador

Dentro de la ronda de corrección 2. Solo `features/clases/hooks.ts` y sus pruebas; actualiza el comentario del gancho.

**Casos propios requeridos, en las dos listas:**
- primera página en vuelo, que llega antes de volver y que llega después de volver: sin vacío en ningún momento, y sale la clase;
- primera página en vuelo que falla;
- con la clase en la lista y una recarga en vuelo: sale de la caché;
- el control: con la lista quieta que ya trae la clase, 0 peticiones;
- una mutación que cae por cada condición nueva.

**El resumen copia en su tabla de hermanos** los estados de arriba, con su caso o con "por lectura".

### O-r2-1: se acepta

**La medición es correcta y no necesita nada.** Con las secciones en `409` y después los temas en `5xx`, el último aviso es "No pudimos actualizar Recursos. Mostramos la última versión que tenemos." y luego llega la redirección.

- **El texto es cierto cuando sale:** ese `5xx` es un fallo real y, en ese momento, la vista sigue mostrando la última versión. T-01 era otra cosa: un `409` presentado como un fallo de recarga.
- **"Nunca última versión justo antes de la redirección" fue una frase de mi punto de ataque, no un requisito.** Lo que pide el plan es que `CLASE_ARCHIVADA` dé su aviso, y se cumple. El `5xx` no recibe `CLASE_ARCHIVADA`.
- **Hace falta que el servidor falle justo en ese intervalo,** y se corrige solo con la redirección, en menos de lo que tarda el detalle.
- **Callarlo pediría cruzar el error de una consulta con el de otras,** o callar un `5xx` real con el riesgo de esconder fallos ciertos. Sería sobreconstruir.
- **Hermanos, por lectura:** `trabajo-view.tsx` y el detalle de la tarea siguen la misma razón.

Sin fila de ESTADO y sin cambios. ADM-T2D214 hace bien en no afirmar el orden final.

### Veredicto

- **T-04:** se corrige con el remedio de arriba.
- **O-r2-1:** aceptado.
- **Ronda 3, la última:** ataca este mecanismo y lo demás. Los puntos los dejaré al verificar la corrección.

## Verificación de la corrección de la ronda 2 — ADMIN-01d2

Veredicto: **ACEPTADO.** T-04 queda corregido con el remedio del arbitraje, y todas las cifras coinciden. Los 10 fallos de la corrida a batería son por tiempo: no hay defecto, pero esos tres archivos son frágiles con carga. Esto importa para la revisión final y tiene destino abajo.

Resumen: `resumen-programador.md` = `13f75a7b…`, "## ADMIN-01d2 — Corrección ronda 2" (línea 2721). Plan `e3279dd1…`, sin cambio.

Entorno: solo frontend; `BatteryStatus` 2 en todas las lecturas (conectado). Sin `--maxWorkers` y sin repetir archivos.
- **Puerta de carga:** con ningún otro `vitest`, esperé de 18:59 a 19:00 con lecturas de hasta 76 %; pasó con 2 % y 6 % (19:00:49).
- **La carga subió durante la corrida:** a las 19:10:17 leí 53 % y 51 %, con `Warframe.x64` entre los procesos. La suite tardó 383 s, contra unos 230 s con el equipo libre, cerca de los 398 s del programador. No terminé ningún proceso ajeno. **Sale en verde con esa carga externa**, lo que es un dato a favor.

### Cifras: resumen contra mi corrida (desde `frontend/`)

| Qué | Resumen | Mi corrida |
|---|---|---|
| `npm run lint` | exit 0; `> tsc -b` | **Igual** |
| `npm run build` | exit 0, `✓ built in 1.79s` | exit 0, `✓ built in 1.29s` (el tiempo no se contrasta) |
| Módulos, comando literal | `Test Files 215 passed (215)` · `Tests 4769 passed (4769)` | **Igual** (19:03:33), a la primera y sin `FAIL` |
| Los cuatro archivos del tester | `Tests 95 passed (95)` | **Igual** |
| `npx vitest list` | 165 y 110 | **Igual** |
| V-01 | 262 contra `e2ee9ba2…`, más 4 sin rastrear: 266 | **Igual:** 262 OK y 0 distintos; las cuatro con `0fc7408a…`, `af127fae…`, `4e3a45f7…` y `940817a8…` |
| "No se toca" contra `7655a5b` | 0 fuera de `frontend/` | **Igual;** 40 modificados y 10 sin rastrear |

**Huella:** `0bffaad4a2636cd5a9cc93c4dd2e6342682020d1e5861fbd34b7bbf0e09376be`, igual antes y después de lo mío. **Solo cambiaron los dos archivos declarados contra `85d1eccf…`:** después de mi arbitraje, solo `features/clases/hooks.ts` y `clase-archivada-01d2-vista.test.tsx` tienen fecha nueva en `frontend/src`. Contra mi copia anterior, la prueba solo suma líneas y no quita ninguna. Lo único que leí como cambio en `hooks.ts` es el gancho y su comentario; no tengo una copia anterior de ese archivo para compararlo entero, y lo declaro.

### El remedio y los 12 casos

- **El remedio es el del arbitraje,** línea por línea: `getQueryState`, `enVuelo` con `fetchStatus === "fetching"` y las dos guardas. Prettier parte la segunda, y es la misma condición. Lo que el comentario del gancho dice coincide con el código.
- **Los 12 casos (6 por lista) cubren lo que pedí:** primera página en vuelo que llega antes y después de volver, primera página que falla, la clase en la lista con una recarga en vuelo y el control con 0 peticiones. Suma uno, correcto: fija el costo de "una lectura más".
- **Su tabla de estados** es la del arbitraje, con su caso o "por lectura". Declara bien que "sin datos, quieta" no tiene caso suyo; lo cubro abajo como punto de ataque.
- **Mis mutaciones, en memoria, sobre `01d2-vista` y `01d2-r2.ataque`** (control `189 passed`):

| Quito | Resultado | Caen |
|---|---|---|
| `!enVuelo` de la guarda "sin datos" | `8 failed` | ADM-T2D202 (2) y seis T-04 |
| `!enVuelo` de la guarda "ya la trae" | `2 failed` | "con la clase en la lista y una recarga en vuelo" |
| `removeQueries` por `invalidateQueries` | `21 failed` | T-02 y T-04 |

  Coinciden con las suyas. ADM-T2D202, en las dos listas, en verde sin tocar la `*.ataque`.

### La corrida a batería: revisé los 10 uno por uno

Su salida quedó en el scratchpad (`mod7.txt`, `Tests 10 failed | 4759 passed (4769)`, 968 s). Lo que el programador no revisó:

| Archivo | Caso | Error | Dónde |
|---|---|---|---|
| `personas-03c1-r1.ataque` | CL3-R1-15 | `Test timed out in 15000ms` | `:420` |
| `personas-03c1-r2.ataque` | CL3-R2-09 (4 casos, un mismo error agrupado) | `Test timed out in 15000ms` | `:262` |
| `personas-03c1-r2.ataque` | CL3-R2-10, CL3-R2-11 y CL3-R2-12 | `Test timed out in 15000ms` | `:318`, `:357` y `:384` |
| `clases-admin-02c-r1.ataque` | "dos clics en el mismo instante" | `Test timed out in 15000ms` (17805 ms) | `:154` |
| `clases-admin-02c-r1.ataque` | "doble clic humano (30 ms)" | `Unable to find role="button"`, en su primer `findByRole` | `:129` |

**Veredicto: la causa es solo el tiempo. No es un defecto de 01d2.**
- **9 de 10 son el vencimiento de 15 s, y el otro es la espera de 3 s de `asyncUtilTimeout` esperando la primera pintura.** Ningún caso cae por una aserción sobre lo que se ve.
- **Con la misma huella, salen en verde:** la corrida del programador y la mía (383 s, con carga externa).
- **Los tres archivos solos,** con el equipo al 50 % de carga por lo de arriba: `Tests 42 passed (42)` en 29.5 s. El caso más lento, 3365 ms; ninguno pasa de 3.4 s.
- **Ninguno ejercita el gancho de T-04 con trabajo real:** en una clase activa, `useClaseArchivadaEnSuLista` regresa en su primera línea, y `/admin/clases` no monta `ClaseLayout`.
- **La batería explica la escala:** 968 s contra unos 230 s, 4.2 veces. Es el mismo patrón de 01d1 (`aprobacion.md`, corrección de la ronda 2: 8 y 9 fallos por tiempo en pruebas de otros encargos, a batería).

**Son frágiles con carga, en este sentido preciso:** montan el router real con una tabla de 50 filas o más y, a 3.4 s por caso solos, tienen un margen de 4.4 veces contra los 15 s, que una corrida completa a batería consume. No son frágiles por orden, por lógica ni por tiempos fijos.

**Destino para la revisión final, que las incluye en la suite completa:**
1. **La corro conectada y con la puerta de carga.** Si la carga externa sube a media corrida, lo declaro.
2. **Si caen por tiempo, reviso los errores uno por uno,** repito solos esos archivos y, si hace falta, uso `--maxWorkers=4`, como pide la instrucción del humano. Solo cuenta como defecto si cae una aserción, o si caen repetidos en condiciones limpias.
3. **Fila de ESTADO §3 al cierre, para el orquestador,** con destino en un `chore` de pruebas posterior: `personas-03c1-r1.ataque` (CL3-R1-15), `personas-03c1-r2.ataque` (CL3-R2-09 a 12) y `clases-admin-02c-r1.ataque` (`:129` y `:154`) vencen a batería. Ahí se decide si llevan un `timeout` propio o se aligeran. **No se toca nada en 01d2:** son `*.ataque` de otros encargos y el `testTimeout` del paquete no está en "Se toca".

### Puntos de ataque para la ronda 3, la última

El mecanismo de la lista ya tiene sus estados decididos. Lo que falta probar:

1. **Los estados "por lectura" de la tabla, con `onlineManager`:** "sin datos, en pausa", "sin la clase, en pausa" y "con la clase, en pausa". Al volver la red, sin vacío falso.
2. **"Sin datos, quieta" (error de la primera carga),** que no tiene caso del programador, con `retry: 1`: también la ventana del reintento (`fetchStatus` sigue en `fetching` durante la espera).
3. **T-04 cruzado con la limpieza de la lista:** salir con la lista en error y la recarga en vuelo (`useRecuperarListaDeClasesAnteriores` y el gancho compiten por quitarla) y volver en los dos órdenes, sin dos peticiones de más ni textos de error.
4. **Dos clases seguidas con la lista en vuelo:** primero una activa (no toca la lista) y después una archivada, y al revés; y N-05 en medio, para el alumno.
5. **El recorrido completo de cada rol, con `app/providers.tsx`,** de punta a punta, como cierre de 01d2:
   - alumno: inicio → "Clases anteriores" → una clase → «Ver más tareas» y el filtro → volver;
   - maestro: inicio → "Clases archivadas" → una clase, Personas, Dudas y una tarea → volver;
   - admin: una archivada → Personas → restaurar.
6. **Regresión de T-01 a T-04,** con los cuatro archivos de ataque en verde, y un orden aleatorio de esos archivos.

**Lo que no cuenta como hallazgo:** O-r2-1; la clase restaurada que sigue en la lista (vecino 7); la barra lateral y el inicio con la clase archivada; la lista abierta mientras el admin archiva otra clase (E10-6); `aria-controls` del bloque vacío; la fecha sin año; N-01d1-4 extendido; el foco en la redirección de N-05; el foco del contenedor de error al recuperarse sin navegar; el fallo callado de la fila 36; el `catch` de `entrega-de-alumno-view.tsx:136`; y los vencimientos de tiempo a batería, de arriba.

### Veredicto de esta verificación

**ACEPTADO.** Ningún M-n. El tester puede empezar la ronda 3 de 01d2, la última. La suite completa queda para la revisión final.

## Revisión final — ADMIN-01d2

Fecha: 2026-11-09. Plan: `plan.md`, SHA-256 `e3279dd14df32f72b512e2f9ace1351b6e45cd490dcd7cfec6354cc553d18b60` (Enmiendas 1 a 12), comprobado. Tester: `reporte-tester.md` = `fef88c28…`, "## Ronda 3 — ADMIN-01d2" (línea 4397), **RESISTE**. Programador: `resumen-programador.md` = `13f75a7b…`, "## ADMIN-01d2 — Corrección ronda 2" (línea 2721). Base: `7655a5b`.

Veredicto: **APROBADO**
Verificación propia: lint exit 0 · test frontend `Tests 6859 passed (6859)` · `Test Files 299 passed (299)`, a la primera y a batería · build exit 0 (`✓ built in 3.77s`)

### Entorno y corridas

- **Solo frontend:** 01d2 no toca `shared/` ni el backend, así que basta la suite completa del frontend y no aplica PA-07. Sin navegadores. La otra copia de trabajo no se usa.
- **Una corrida anterior que no cuenta.** El 2026-11-06 hice `lint`, `build` y la suite completa (`6859 passed`, 299 archivos, 288 s, conectado), pero mi revisión se cortó por el límite semanal de la API antes de escribir aquí. Por indicación del orquestador repetí todo el 2026-11-09, con el árbol en la misma huella. Cuento solo la repetición.
- **Equipo a batería** (`BatteryStatus` 1, 94 %), por instrucción del humano: se corre igual y se declara.
- **Puerta de carga, sin ningún `vitest`:** 6 % y 4 % (07:45:17); al terminar, 8 % y 3 % (07:52:01).
- **Una sola corrida de la suite:** inicio 07:45:21, 387 s, sin ningún `FAIL` ni vencimiento. Nada se repitió y no hizo falta `--maxWorkers`.
- **Huella del árbol:** `df6f431d15f3ef2c3bb11f6c8209cc91c7998950ee3b20ba609969d08735d207`, igual a la de la ronda 3 y antes y después de mis corridas.

| Qué | Referencia | Mi corrida (desde `frontend/`) |
|---|---|---|
| `npm run lint` | exit 0 | exit 0; `All matched files use Prettier code style!` y `> tsc -b` sin errores |
| `npm run build` | exit 0 | exit 0, `✓ built in 3.77s` |
| Suite completa, `npx vitest run` | Cierre de 01d1: 6456 casos en 292 archivos | **`Test Files 299 passed (299)` · `Tests 6859 passed (6859)`** |
| Cuadre por archivo | Contra el listado del cierre de 01d1 | **Exacto.** `npx vitest list` con `grep -a` da 6859 y 299 |

**El cuadre, archivo por archivo:** 6456 − 1 + 275 + 128 + 1 = 6859, y 292 + 7 = 299.
- −1: `clase-archivada-01d1-vista` (ADM-1D102 de 6 a 5, la lista cerrada de la Enmienda 12).
- +275: las dos pruebas del programador, 165 y 110.
- +128: las cinco `*.ataque` nuevas del tester (28, 29, 24, 14 y 33).
- +1: `lib/errores-ch3-r2.ataque` (84 a 85), la vigilada que recorre los códigos de tareas: `CLASE_ARCHIVADA` "entra solo", como dice §D-R0.

Ningún otro archivo cambia de conteo.

**Las tres pruebas frágiles con carga:** en esta corrida a batería, su caso más lento tardó 4.4 s de 15. El caso más lento de toda la suite, 11.4 s. Ninguno venció.

### (a) 01d2 cumple su parte del plan

| Parte del plan | Estado |
|---|---|
| §D-9, controles 22 a 37 | Revisados en el diff, fila por fila (verificación del resumen). Filas 31 y 32 en `acciones-de-la-tarea.tsx`, que sigue montado y devuelve `null`; 33 con `CalificacionDeLaEntrega`; 34 con `soloLectura` en `HiloPrivado`; 35 y 36 con el texto de archivada y "Volver a Actividades de aprendizaje" hacia `${base}/trabajo`; 37 con el título como texto |
| Enmienda 11 | Reinicios en el render (24, 25, 26, 28 y 32), `key` en la 29, generación en 32, 33, 35 y 36, `useMontado` en `components/clase/hooks.ts` y en los cuatro ganchos más el `catch` de `formulario-tarea.tsx`, tipos en línea fuera de `hooks.ts` (M-11) y `estaArchivada` como predicado de tipo (N-01d1-2) |
| **Columna y tarjeta ocultas** (decisión del humano, 2026-11-06) | `tabla-alumnos.tsx` no pinta «Acciones» (encabezado y celda), y `maestros-de-clase-view.tsx` no pinta la tarjeta "Asignar maestro" en una archivada. Vuelven al restaurar (ADM-1D226 y 1D227). El formulario de duplicar conserva su buscador |
| Tabla D (M-10 y E11-15 a E11-26) | `minimo`, `tope`, `TEXTOS_DUDAS.frase` y `TEXTOS_CATEGORIAS.frase` sin pintar; vacíos neutros en Personas y Avisos; sin "Puedes seguir editando" en las rutas 20 y 36 en solo lectura |
| Enmienda 12 | N-05 en `ClaseLayout`, con `replace` y antes del `Outlet`; la vista de clase anterior compuesta en `app/router.tsx` con su ruta hija y `<Outlet key={claseId} />`; OA-2 hacia la clase activa; "Volver a mis clases" a `/maestro/clases-archivadas`; M-13 (`useFocoAlPasarAError`) |
| Tablas A, B, B2, C y D | Contra el código fila por fila en la verificación del resumen, con sondas, y otra vez en cada corrección. La tabla C hace la pregunta de T-03 de 01d1 (¿qué se pierde si el callback no corre?), y ni el tester ni yo encontramos un aviso perdido |
| Matriz de avisos y recargas | Filas de 01d2 contra el código, más las dos que sumaron las correcciones: "detalle que llega archivado con la lista en caché sin la clase", y la regla de T-04 |
| ADM-1D201 a 1D236 | Todos existen, con su título; 218 casos en total entre las dos pruebas del programador |
| **Textos aprobados por el humano** | "Tus tareas cambiaron mientras las veías. Vuelve a abrir esta clase para verlas completas." en `features/calificaciones/data.ts:114`, literal (`aprobacion.md`, decisiones sobre la Enmienda 12). `Archivada el {fecha}` en `features/clases/data.ts:457`, literal (`aprobacion.md`, decisiones sobre 01d2) |
| §D-12 | Los demás textos de 01d2, tal cual: listas, vacíos, errores, "Volver a clases anteriores" y "Volver a Actividades de aprendizaje" |
| Enmiendas 9 y 10 | Sin vidrio fuerte, vidrio azul ni atributos de contexto nuevos (V-07 sin cambio); ningún código fijo nuevo en los mapas de errores; `claveClasesAnteriores` sin ninguna mutación del admin |
| `DESIGN.md` | Los patrones nuevos de 01d2 están en la lista de A-04 (abajo), al cierre del encargo, como acordó el plan |

### (b) Hallazgos y arbitrajes

| Hallazgo | Cierre |
|---|---|
| T-01 (media): "Mostramos la última versión" con un `409 CLASE_ARCHIVADA` | `useAvisoDeRecargaFallida` de `features/tareas` y los dos hermanos autorizados por el humano (`trabajo-view.tsx` y `recursos-view.tsx`, solo esa condición y su `import`). En verde: ADM-T1D215, ADM-T2D221 a 223 y los casos propios |
| T-02 (baja): vacío falso en la lista tras ver el aviso | Arbitraje (a) aplicado: `useClaseArchivadaEnSuLista`. ADM-T1D220 en verde, sin tocar |
| T-03 (baja): título "Respuestas" huérfano | `null` en solo lectura sin filas, con la fila de la duda como destino del foco. ADM-T1D227 y ADM-T2D207 (destino medido) en verde |
| T-04 (baja): T-02 con la primera página en vuelo | Arbitraje (a) aplicado tal cual (`getQueryState`, `enVuelo`). ADM-T2D202 en verde, sin tocar |
| O-r2-1 | Aceptado en el arbitraje de T-04, sin cambios |

**Una precisión a la tabla del arbitraje de T-04**, que medió el tester (ADM-T3D201). "Sin datos, en pausa" no se queda en pausa: al irse el último observador, la petición se revierte y la lista queda sin datos y quieta. El resultado para la persona es el mismo: no se quita, al volver se pide y sale la clase. Así queda la fila para los documentos:

> "Sin datos, en pausa: al salir de la lista la petición se revierte y la consulta queda sin datos y quieta; el gancho no hace nada y la lista se pide al volver a abrirla."

**Lo que el tester dejó por lectura, sin contarlo como hallazgo** (ADM-T3D208 y 209): si la lista falla después de salir, al volver se lee su texto de error mientras `refetchOnMount` la vuelve a pedir, y se quita al llegar. Coincido: el último intento sí falló, el texto es cierto y la vista se cura sola. Sin fila.

### (c) V-01: 267

- **`sha256sum -c` de la lista `e2ee9ba2…`:** 262 OK y 0 distintos. Esa lista ya incluye C-11 `edf4d96e…`, C-12 `537e10bc…`, C-40 `53909e72…` y C-41 `907f9ba5…`, y comprobé los cuatro uno por uno.
- **Las cinco nuevas, sin rastrear, con su hash:**
  - `clases/clase-archivada-01d2-r1` `0fc7408a…`;
  - `tareas/clase-archivada-01d2-r1` `af127fae…`;
  - `clases/clase-archivada-01d2-r2` `4e3a45f7…`;
  - `tareas/clase-archivada-01d2-r2` `940817a8…`;
  - `clases/clase-archivada-01d2-r3` `6f30bd0f…`.
- **Total:** `git ls-files` da 262 rastreadas y hay 5 sin rastrear: 267. El programador no tocó ninguna `*.ataque`.

### (d) "No se toca" contra `7655a5b`

- **Fuera del alcance de 01d2, todo limpio.** `git diff --name-only 7655a5b` da 0 en `backend`, `shared`, `infra`, `eslint.config.mjs`, `package.json`, `package-lock.json`, `frontend/package.json`, `frontend/vite.config.ts`, `frontend/vitest.config.ts`, `AGENTS.md`, `CLAUDE.md`, `docs/DESIGN.md`, `docs/PRD.md`, `docs/ARCHITECTURE*.md`, `docs/ESTADO.md` y `.claude`.
- **`frontend/`:** 40 modificados y 11 nuevos. Son los 36 de producción de "Se toca" con el alcance de las Enmiendas 11 y 12, más los dos autorizados por el humano (`trabajo-view.tsx` y `recursos-view.tsx`, tres líneas por archivo), las dos de la lista cerrada, las dos pruebas nuevas del programador y las nueve `*.ataque` del tester (C-11, C-12, C-40, C-41 y cinco nuevas).
- **Los ocho componentes que el plan deja sin tocar,** más `detalle-tarea-view.tsx` y `personas-view.tsx`: sin cambio.

### (e) Lo abierto, con su destino

**Filas de ESTADO §3 al cierre del encargo (las escribe el orquestador):**

| Fila | Destino |
|---|---|
| **N-01d1-4 extendido:** un `409` (`RECURSO_MODIFICADO`, `TAREA_MODIFICADA` o de calificar) que llega con la clase archivada no pide la recarga. Al restaurar, el formulario nace de la caché, y el siguiente guardado recibe otro `409`. Nada se sobrescribe. Rutas 20 y 36, y calificar (fila 33) | Riesgo declarado (decisión del humano, 2026-11-06); revisar en FORO-01, que rehace esos ganchos |
| **La barra lateral y las listas del inicio** siguen trayendo una clase que la sesión acaba de leer archivada, hasta su siguiente petición. Roza `ARCHITECTURE-ESSENTIALS.md` ("una clase archivada no aparece en la barra ni en el inicio") | `chore` de foco y navegación, o uno posterior |
| **`aria-controls` de «Ocultar respuestas»** apunta a un `id` que no existe cuando el bloque de una archivada está vacío (y con `pedir` en falso, desde antes) | `chore` de foco y navegación |
| **El vencimiento en una clase anterior:** una tarea con fecha futura dice "Vence en N días" y "Asignado", aunque el alumno ya no puede entregar | "A ESTADO, como está" (decisión del humano, 2026-11-06); destino: el encargo que retome "Clases anteriores" (N-08) |
| **Pruebas frágiles con carga:** `personas-03c1-r1.ataque` (CL3-R1-15), `personas-03c1-r2.ataque` (CL3-R2-09 a 12) y `clases-admin-02c-r1.ataque` (`:129` y `:154`) vencieron a batería en la corrida del programador del 2026-11-06 (968 s). En mi corrida a batería de hoy pasaron (máximo 4.4 s de 15) | `chore` de pruebas: ajustar el `timeout` de cada una o aligerarlas |
| **El foco en la redirección de N-05 y de OA-2** queda en `<body>` | `chore` de foco y navegación (decisión del plan, E12-17) |
| **El foco en el contenedor del error de la clase anterior,** si el detalle se recupera sin navegar (`refetchOnReconnect`), cae en `<body>`, igual que `ClaseLayout` hoy | `chore` de foco y navegación |

**Sigue pendiente del humano, sin que conste una decisión en `aprobacion.md`:** la fecha sin año ("Archivada el lunes 5 de octubre", y el aviso fijo con la misma fecha). No bloquea. Si lo quiere, es otra fila de ESTADO §3: `lib/format.ts` no se toca en este encargo (E-37).

**A-04, `DESIGN.md`, al cierre del encargo.** Suma a su lista los patrones nuevos de 01d2, marcados "propuesta (ADMIN-01d2)":
- la lista de clases anteriores y archivadas: filas con divisores en una `Card`, con nombre, maestros y `Archivada el {fecha}`;
- «Cargar más» que se queda bajo el mensaje de error de la página siguiente, con el foco;
- el enlace del pie de los inicios dentro de una `Card`;
- la vista de una clase anterior: encabezado con "Volver a clases anteriores", el aviso y "Mis calificaciones" sin secciones, con los títulos como texto;
- las rutas de escritura en una archivada (texto y enlace de vuelta);
- en una archivada, la tabla sin «Acciones» y Personas sin la tarjeta "Asignar maestro".

**A-05, `CLAUDE.md`, al cierre del encargo:**
- en `components/clase/`: `useMontado` (sube desde `features/clases`), `useGeneracionDeSoloLectura` y `esClaseArchivada`;
- en `services/clasesService.ts`: `claveClaseDetalle` y `claveClasesAnteriores`;
- en la fila del módulo `clases`: "Clases anteriores" del alumno, "Clases archivadas" del maestro y la vista de una clase anterior;
- en la fila de `calificaciones`: que "Mis calificaciones" se monta también en la vista de una clase anterior.

**Más documentos al cierre:**
- §D-12 suma `Archivada el {fecha}`, como dice `aprobacion.md`.
- La nota de E-31 queda vieja: 01d2 sí cambió `editar-tarea-view.tsx` y los ganchos de tareas.
- PRD §6 ("Clases anteriores", A-03).

### (f) Medición para ESTADO §6

- **Rondas del tester:** 3, de ellas 2 extra.
  - Ronda 1: ROTO (T-01, T-02, T-03).
  - Ronda 2: ROTO (T-04).
  - Ronda 3: RESISTE.
- **Rondas extra por hermanos o estados vecinos, atribuibles al programador: 0.**
  - T-01 fue un hermano que el plan no revisó (hermano 5 de la Enmienda 3: la lectura de una tarea en caché no es una lista). El programador sí encontró y declaró sus hermanos (`trabajo-view.tsx` y `recursos-view.tsx`) y paró por alcance.
  - T-02 y T-03 fueron huecos del plan (E10-6 y la tabla D).
  - **T-04 es un estado vecino del remedio de T-02, pero la omisión es de mi arbitraje,** no del programador, que aplicó lo que pedí.
  - No se alcanza el umbral. El programador ya usa `opus` con esfuerzo `medium`.
- **PARADAS: 2.**
  - Ronda 0 del tester: P-01 a P-03, resueltas con la Enmienda 12.
  - El programador, parcial, en la corrección de la ronda 1: los hermanos de T-01 fuera de "Se toca", autorizados por el humano.
- **Resúmenes del programador devueltos: 0 de 5** (implementación, "Antes de la ronda 1", corrección de la ronda 1, "Hermanos autorizados de T-01" y corrección de la ronda 2).
- **Plan:**
  - Enmienda 11: CAMBIOS REQUERIDOS por M-10 y M-11. Su corrección: M-12, de registro, por un error del orquestador. Después, aprobada.
  - Enmienda 12: CAMBIOS REQUERIDOS por M-13. Su corrección: APROBADO.
- **Arbitrajes: 2** (T-02 y T-04 con O-r2-1), los dos con la opción (a).
- **Interrupciones ajenas:**
  - La tapa cerrada el 2026-11-06, a las 13:59: la corrida del programador quedó colgada y el arnés lo detuvo ("no progress for 600s").
  - La batería, desde las 18:16 del mismo día: la corrida de 968 s, que no contó.
  - El límite semanal de la API cortó esta revisión, del 2026-11-06 al 2026-11-09.
  - Además: la desviación del tester con `npx` (dos paquetes en la caché, que el orquestador borró por decisión del humano) y la carga externa durante varias corridas (`Warframe.x64`); no terminé ningún proceso ajeno.

### (g) Enmiendas y O-3

- **El encargo lleva 12 enmiendas;** el plan sigue en `e3279dd1…`.
- **O-3 sigue pendiente.** Es la Enmienda 13 (`aprobacion.md`, decisión del orquestador en la ronda 0 de 01d2), antes de la ronda 0 de 01e. Todavía no está en el plan: ni "Enmienda 13" ni su tabla de cambios.
- **Debe partir del hash actual de `backend/test/gestion-02a-r1.ataque.test.ts`:** `73c55120814b8d6bbcceda5d4a3b5c8f1ed1ab58f54400831ac1a710d3b4584a`. Es el que dejó C-33 en 01b, y no cambió desde entonces.
- **Qué pide:** que `:693-734` (las claves `["id", "nombre"]` de los maestros del detalle) admita el `cuentaDesactivada` de S-16, como C-n del tester, verificado por `git diff`.

### (h) Rutas del commit de 01d2

**52 entradas de `git add`, que cubren 56 archivos.** Las coteje por programa contra `git status --porcelain --untracked-files=all` (57 líneas), y `git add -n` con esas entradas lista exactamente 56 rutas. La única que queda fuera es `docs/trabajo/DEPLOY-investigacion-vps.md`, que es ajena.

- **frontend, producción (38):** `app/router.tsx`, `components/clase/hooks.ts`, `features/calificaciones/components/lista-de-mis-calificaciones.tsx`, `features/calificaciones/data.ts`, `features/calificaciones/mis-calificaciones-view.tsx`, `features/clases/alumnos-view.tsx`, `features/clases/categorias-view.tsx`, `features/clases/clase-anterior-view.tsx`, `features/clases/clase-layout.tsx`, `features/clases/clases-anteriores-view.tsx`, `features/clases/clases-archivadas-view.tsx`, `features/clases/components/elemento-de-duda.tsx`, `features/clases/components/encabezado-clase.tsx`, `features/clases/components/lista-de-clases-anteriores.tsx`, `features/clases/components/respuestas-de-duda.tsx`, `features/clases/components/tabla-alumnos.tsx`, `features/clases/data.ts`, `features/clases/dudas-view.tsx`, `features/clases/editar-recurso-view.tsx`, `features/clases/hooks.ts`, `features/clases/inicio-estudiante-view.tsx`, `features/clases/inicio-maestro-view.tsx`, `features/clases/lib.ts`, `features/clases/maestros-de-clase-view.tsx`, `features/clases/muro-view.tsx`, `features/clases/recursos-view.tsx`, `features/clases/trabajo-view.tsx`, `features/clases/types.ts`, `features/tareas/components/acciones-de-la-tarea.tsx`, `features/tareas/components/formulario-tarea.tsx`, `features/tareas/components/hilo-privado.tsx`, `features/tareas/crear-tarea-view.tsx`, `features/tareas/data.ts`, `features/tareas/editar-tarea-view.tsx`, `features/tareas/entrega-de-alumno-view.tsx`, `features/tareas/hooks.ts`, `features/tareas/lib.ts`, `services/clasesService.ts`.
- **frontend, pruebas del programador (4):** `features/clases/clase-archivada-01d1-vista.test.tsx`, `features/clases/clase-archivada-01d2-vista.test.tsx`, `features/tareas/clase-archivada-01d2-tareas.test.tsx`, `features/tareas/errores-ch3.test.ts`. `clase-archivada-01d1-vista.test.tsx` y `errores-ch3.test.ts` son la lista cerrada; las otras dos son nuevas.
- **frontend, `*.ataque` del tester (9):** `features/clases/clase-archivada-01d1-r1.ataque.test.tsx`, `features/clases/clase-archivada-01d1-r2.ataque.test.tsx`, `features/clases/clase-archivada-01d2-r1.ataque.test.tsx`, `features/clases/clase-archivada-01d2-r2.ataque.test.tsx`, `features/clases/clase-archivada-01d2-r3.ataque.test.tsx`, `features/tareas/clase-archivada-01d2-r1.ataque.test.tsx`, `features/tareas/clase-archivada-01d2-r2.ataque.test.tsx`, `features/tareas/errores-ch3-r1.ataque.test.ts`, `styles/clases-r1.ataque.test.ts`. C-11, C-12, C-40 y C-41 están cambiadas; las cinco `clase-archivada-01d2-r*`, nuevas.
- **docs (1 entrada, 5 archivos):** `docs/trabajo/ADMIN-01-administracion/` (`aprobacion.md`, `plan.md` con las Enmiendas 11 y 12, `reporte-tester.md`, `resumen-programador.md` y `revision.md`).

`docs/ESTADO.md` no cambió desde `7655a5b`, así que no entra. Si el orquestador lo actualiza antes del commit, se suma.

```
git status
git add docs/trabajo/ADMIN-01-administracion/ frontend/src/app/router.tsx frontend/src/components/clase/hooks.ts frontend/src/features/calificaciones/components/lista-de-mis-calificaciones.tsx frontend/src/features/calificaciones/data.ts frontend/src/features/calificaciones/mis-calificaciones-view.tsx frontend/src/features/clases/alumnos-view.tsx frontend/src/features/clases/categorias-view.tsx frontend/src/features/clases/clase-anterior-view.tsx frontend/src/features/clases/clase-archivada-01d1-r1.ataque.test.tsx frontend/src/features/clases/clase-archivada-01d1-r2.ataque.test.tsx frontend/src/features/clases/clase-archivada-01d1-vista.test.tsx frontend/src/features/clases/clase-archivada-01d2-r1.ataque.test.tsx frontend/src/features/clases/clase-archivada-01d2-r2.ataque.test.tsx frontend/src/features/clases/clase-archivada-01d2-r3.ataque.test.tsx frontend/src/features/clases/clase-archivada-01d2-vista.test.tsx frontend/src/features/clases/clase-layout.tsx frontend/src/features/clases/clases-anteriores-view.tsx frontend/src/features/clases/clases-archivadas-view.tsx frontend/src/features/clases/components/elemento-de-duda.tsx frontend/src/features/clases/components/encabezado-clase.tsx frontend/src/features/clases/components/lista-de-clases-anteriores.tsx frontend/src/features/clases/components/respuestas-de-duda.tsx frontend/src/features/clases/components/tabla-alumnos.tsx frontend/src/features/clases/data.ts frontend/src/features/clases/dudas-view.tsx frontend/src/features/clases/editar-recurso-view.tsx frontend/src/features/clases/hooks.ts frontend/src/features/clases/inicio-estudiante-view.tsx frontend/src/features/clases/inicio-maestro-view.tsx frontend/src/features/clases/lib.ts frontend/src/features/clases/maestros-de-clase-view.tsx frontend/src/features/clases/muro-view.tsx frontend/src/features/clases/recursos-view.tsx frontend/src/features/clases/trabajo-view.tsx frontend/src/features/clases/types.ts frontend/src/features/tareas/clase-archivada-01d2-r1.ataque.test.tsx frontend/src/features/tareas/clase-archivada-01d2-r2.ataque.test.tsx frontend/src/features/tareas/clase-archivada-01d2-tareas.test.tsx frontend/src/features/tareas/components/acciones-de-la-tarea.tsx frontend/src/features/tareas/components/formulario-tarea.tsx frontend/src/features/tareas/components/hilo-privado.tsx frontend/src/features/tareas/crear-tarea-view.tsx frontend/src/features/tareas/data.ts frontend/src/features/tareas/editar-tarea-view.tsx frontend/src/features/tareas/entrega-de-alumno-view.tsx frontend/src/features/tareas/errores-ch3-r1.ataque.test.ts frontend/src/features/tareas/errores-ch3.test.ts frontend/src/features/tareas/hooks.ts frontend/src/features/tareas/lib.ts frontend/src/services/clasesService.ts frontend/src/styles/clases-r1.ataque.test.ts
git commit -m "ADMIN-01d2, clase archivada en solo lectura: controles 22 a 37, clases anteriores del alumno y archivadas del maestro (frontend)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

Después del `git add`, `git status` no debe mostrar nada sin preparar ni sin rastrear, salvo `docs/trabajo/DEPLOY-investigacion-vps.md`.

### Definición de terminado y reglas

- **Cumple el plan** (sección (a)), sin endpoint nuevo, sin migración y sin cambios en `infra/` ni en la configuración.
- **Capas y middleware:** no aplica en el frontend. Nada se oculta en la interfaz que el backend no niegue ya: cada control oculto tiene su `409 CLASE_ARCHIVADA` en el sexto paso (01a).
- **Estado de pago:** ninguna vista nueva lo muestra al alumno.
- **Secretos, `localStorage`, proveedores:** nada nuevo.
- **Estilo (`CLAUDE.md`):** lo fijan `lint` y las vigiladas estáticas, en verde:
  - tipos en `types.ts`, también los que estaban en línea en `hooks.ts`;
  - textos en `data.ts`;
  - funciones puras en `lib.ts`;
  - retornos tempranos, sin ternarios anidados en JSX y sin `?? []`;
  - `enEspera` con guarda de ref;
  - ningún módulo importa de otro (la vista de clase anterior se compone en el router).
- **Diseño:** solo tokens y componentes de `components/ui/`. El estado no se comunica solo con color. Sin texto suelto sobre el fondo (los enlaces del pie van en una `Card`). Una sola acción principal por vista. Vacíos y errores en cada lista.
- **Lo que no pude ver sin navegador:** los 360 px y la apariencia. Van a la comprobación humana de 01g.

### Problemas que bloquean
Ninguno.

### Problemas que no bloquean
Ninguno nuevo. Lo abierto está en la tabla de (e), con su destino.

### Detalles menores
Los de mis verificaciones anteriores (el `h1` con `tabIndex` sin `ref` en `clase-anterior-view.tsx:64`, `marcarViejoElDetalleAnteClaseArchivada` repetido en dos módulos y la codificación "mÃ¡s" en dos párrafos del resumen) no cambian el veredicto. Los dos primeros pueden ir a un `chore`.

### Desacuerdos arbitrados
En esta subentrega, todos con la opción (a): T-02, T-04 y O-r2-1, con sus secciones. En esta revisión no hay ninguno nuevo.

### Documentos a actualizar
- **`docs/ESTADO.md`, por el orquestador:** §3 con las filas de (e), y §6 con la medición de (f).
- **Al cierre del encargo:** `docs/DESIGN.md` (A-04, con lo de (e)), `CLAUDE.md` (A-05), §D-12 con `Archivada el {fecha}`, PRD §6 y la nota de E-31.
- **`plan.md`:** la Enmienda 13 (O-3), antes de la ronda 0 de 01e.

### Para el humano
- **Nada que decidir para cerrar 01d2.**
- **Pendiente, sin bloquear:** la fecha sin año ("Archivada el lunes 5 de octubre"). Si quieres el año, va como fila de ESTADO §3.
- **Para la comprobación humana de 01g,** lo que solo se ve en un navegador:
  - las listas "Clases anteriores" y "Clases archivadas" a 360 px;
  - «Cargar más» bajo el mensaje de error;
  - el enlace del pie de los inicios dentro de su `Card`.

### Veredicto
**APROBADO.** 01d2 cumple su parte del plan `e3279dd1…`: §D-9 con las Enmiendas 11 y 12, los controles 22 a 37, las tablas A a D, la matriz, ADM-1D201 a 1D236 y los textos aprobados. Además:
- T-01 a T-04 están cerrados, con los arbitrajes de T-02 y T-04 aplicados.
- V-01 da 267.
- "No se toca" está limpio, con los dos archivos que autorizó el humano.
- Mi suite completa del frontend da 6859/6859 en 299 archivos a la primera, a batería, con `lint` y `build` en verde.
- Todo lo abierto tiene destino.

### Resumen para el humano (15 líneas)
1. ADMIN-01d2 (el resto de la clase archivada en la interfaz) está **APROBADA**.
2. En una clase archivada se ocultan los controles 22 a 37: Dudas, Personas, tareas, calificar e hilo privado. La columna «Acciones» y la tarjeta "Asignar maestro" no se pintan, como decidiste.
3. El alumno ve sus clases archivadas en "Clases anteriores", solo con sus calificaciones; el maestro, en "Clases archivadas". Cada fila dice "Archivada el {fecha}".
4. Si la clase se archiva con la pantalla abierta, el alumno pasa a la clase anterior y el maestro ve el aviso, sin perder avisos ni lo escrito antes de la respuesta.
5. Corregidos: T-01 (un aviso falso de "última versión"), T-02 y T-04 (la lista decía que no había ninguna) y T-03 (un título huérfano).
6. La ronda 3 del tester resistió sin hallazgos.
7. Mi corrida completa del frontend: 6859/6859 en 299 archivos a la primera, a batería; `lint` y `build` en verde.
8. Las 267 pruebas de ataque coinciden con sus hashes; el programador no tocó ninguna.
9. No cambia `shared/`, el backend ni `infra/`. "No se toca" está limpio, con `trabajo-view.tsx` y `recursos-view.tsx` como autorizaste.
10. Medición: 3 rondas, 2 extra. Ninguna atribuible al programador: T-04 fue omisión de mi arbitraje. 2 PARADAS, 0 resúmenes devueltos.
11. Pendiente tuyo, sin bloquear: ¿la fecha de "Archivada el…" lleva año?
12. Antes de 01e: la Enmienda 13 (O-3).
13. Al cierre del encargo: `DESIGN.md`, `CLAUDE.md` y las filas de ESTADO §3 que listo.
14. El commit lleva 52 entradas de `git add` (56 archivos), incluidas las cinco pruebas nuevas del tester y la carpeta del encargo.
15. No entra `docs/trabajo/DEPLOY-investigacion-vps.md`, que es ajeno.

## Verificación de la Enmienda 13 — ADMIN-01

Veredicto: **APROBADO**. Sin problemas que bloqueen; no hay M-n nuevo (el último sigue siendo M-13). C-42 resuelve O-3 sin quitarle nada a lo que protege el caso, el rojo que se espera es el correcto y la vigilada está bien corregida. El grep de hermanos tiene un hueco (el ayudante `desactivarUsuarioDePrueba`), pero lo repetí con ese hueco cubierto y el resultado no cambia: el único choque es C-42.

Verificación propia: sin suites, porque solo cambia el plan (lo pidió el orquestador). Hice todo leyendo: `git diff --no-index`, `sha256sum` y `grep` sobre `ea718bc`. No abrí navegadores.

### Hashes y cotejo
- Copia previa: `e3279dd14df32f72b512e2f9ace1351b6e45cd490dcd7cfec6354cc553d18b60`, la que dio el orquestador.
- `plan.md` = `7018e1f321364350554c1a2fdd2cd2e5f0c54ea18c3586ce8c62a1ad2b4e97cf`, 2192 líneas, sin CR. Es igual a la entrada "Enmienda 13 del arquitecto" de `aprobacion.md`.
- HEAD `ea718bc`. `backend/test/gestion-02a-r1.ataque.test.ts` = `73c55120814b8d6bbcceda5d4a3b5c8f1ed1ab58f54400831ac1a710d3b4584a`, el hash de partida de C-42.
- `git diff --no-index` completo: 42 inserciones y 2 borrados, en 5 hunks. Los dos borrados son líneas que se reemplazan (el encabezado y la vigilada), y lo que retiran queda dicho o tachado (`~~:268~~`).
- **Caracteres de lo añadido:** solo letras del español con tilde o ñ, §, ′, …, — y →, como dice la nota. Las «» del hunk 1 vienen del texto viejo del encabezado. El único `\u` es el de la nota al orquestador.

| Hunk | Sección (línea del plan nuevo) | E13-n |
|---|---|---|
| 1 | Encabezado, Estado (2) | E13-6 |
| 2 | §D-R0 01e, vigiladas de la Enmienda 1 (1376) | E13-2 |
| 3 | §D-R0 01e, `*.ataque` que cambian: C-42 y el grep de hermanos (1384-1399) | E13-1 y E13-3 |
| 4 | Pasos, "Antes del paso 20" (1830) | E13-4 |
| 5 | Tabla E13-n (2170-2192) | La propia tabla (con E13-5) |

### (a) C-42: correcto
- **El choque es real y así lo describe el plan.** `:705` da de baja a `b` en una clase activa. `:729` exige `["id", "nombre"]` a todos los maestros del detalle. El detalle sale de `leerClase` → `SELECT_CLASE_DETALLE` → `maestrosDeFilas` (`adapters/db/clases.ts:67-101`, `:219-233`), y S-16 (plan `:55` y `:315`) marca ahí al inactivo para cualquier lector, también para el alumno. P-01 a′ ya lo aprobó.
- **No se pierde nada de lo que el caso protege:**
  - `prohibidas` (`:711-722`) se queda con `"activo"`. `clavesDe` compara claves exactas, y `cuentaDesactivada` no es ninguna de ellas.
  - Se quedan los correos y "deudor" (`:723-727`).
  - Se quedan las inscritas (`:730-735`): `listarClasesInscritas` lee solo `nombre` (`clases.ts:363`), y S-16 no la toca.
  - La comprobación nueva es más fuerte que la de hoy, por tres cosas: exige exactamente los dos ids (el dado de baja no se filtra), deja `a` con `["id", "nombre"]` exacto y le pide a `b` `cuentaDesactivada` con `toBe(true)`. Busca por `id` con mensaje, sin `return` temprano.
- **Rojo esperado:** con `ea718bc`, `b` sale sin la clave (`SELECT_MAESTROS_DE_CLASE` es `{ id, nombre }` en `:68`), así que falla solo la aserción de las claves de `b`. Los dos ids ya pasan hoy, porque el detalle no filtra a los inactivos. Después del paso 23 pasa a verde. Las causas que el plan pide reportar como hallazgo son las que distinguen un S-16 mal hecho: la clave en `a`, `false`, la clave en inscritas o un maestro de menos.
- **Vigilada `:268`→`:269`:** comprobado. `:269` es `expect(retirada.json()).toEqual({ maestros: [{ id: nuevo.id, nombre: nuevo.nombre }] })`, con un maestro activo, y no cambia con S-16.
- **Numeración:** C-42 es el siguiente después de C-41 y no se repite en el plan.

### (b) Grep de hermanos, repetido: el resultado se sostiene
- **Lo que coincide con el plan:**
  - patrón 1 (`maestro.*(toEqual|…)`): 18 archivos;
  - patrón 2 (`activo: false|…|SET activo|activo = \$`): 25 archivos;
  - `cuentaDesactivada`: no aparece en ningún `.ts` ni `.tsx` de `backend`, `shared` ni `frontend/src`;
  - `shared/src/clases.ts` no tiene `strictObject` ni `.strict()`, así que el `parse` de las pruebas conserva la clave;
  - `shared/` no tiene pruebas;
  - en el frontend, ninguna prueba compara los maestros de una respuesta.
- **Lo que yo sumé:**
  - `Object.keys(` con cualquier expresión de maestros también encuentra `clases-archivadas-r1.ataque:856` (`GET /clases/anteriores`, `["nombre"]`), que el plan ya vigila en `:848-856`. S-16 no toca `clases-archivadas.ts:91`.
  - Las listas de claves prohibidas (`admin-muro-02b-r1:745-754`, `borrado-duplicado-r1:472-480`, `gestion-02a-r1:711-722`) comparan claves exactas.
  - Las expresiones `/activo/i` y `not.toContain("activo")` (`enlaces-registro.integracion:277`) no reconocen "cuentaDesactivada", porque ahí dice "activa", no "activo".
- **El hueco (N-1, abajo):** el patrón 2 no ve a quienes llaman a `desactivarUsuarioDePrueba(` (`ayudas-auth.ts:88-90`), que son 17 archivos. Los revisé uno por uno:
  - En casi todos, la cuenta dada de baja es de un estudiante: `alumnos.integracion`, `entregas*`, `gradebook*`, `calificaciones-*`, `hilo-*`, `mis-calificaciones-01b-r1`, `exportacion-calificaciones`, `tareas-borrar-con-entregas`.
  - En el resto, es de autenticación o de invitación: `auth-login.ataque`, `auth-refresco`, `restablecer`, `worker-correo-de-cuenta`, y `cuentas-03a-r1:593` y `:792`. Estos dos últimos son maestros, pero ninguno pide una respuesta con los maestros de una clase.
  - **Ninguno choca con S-16.**
- **Restaurar:** ninguna prueba de hoy archiva una clase, da de baja a su maestro, la restaura y compara maestros de forma exacta.
- **Lo que fija el plan, confirmado:** la lista cerrada de 01e no crece, ninguna otra `*.ataque` cambia, y las vigiladas nuevas citan las líneas correctas (las comprobé).

### (c) Sin texto nuevo, sin cambio de comportamiento y sin "No se toca"
- C-42 cambia una `*.ataque`, que es del tester.
- No hay texto de interfaz.
- Ningún archivo de producción ni de "Se toca" cambia. S-16 y §D-7.10 ya estaban aprobados.
- `gestion-02a-r1.ataque.test.ts` no está en ninguna lista "No se toca".
- El conteo de 01e sube en un archivo del tester. No hay corte nuevo, y no hace falta.

### (d) "Antes del paso 20": coherente con §D-R0 01e
- Los C-n de la ronda 0 de 01e en §D-R0 son exactamente C-6 a C-8 (`:1373-1383`), C-25 a C-32 (`:1419-1427`) y ahora C-42. No hay otro.
- El paso 25 (`:1836`) sigue diciendo "después de la ronda 0 de 01e con C-25 a C-32" para M-09. Es correcto: ahí habla solo de `config/logger.ts`.
- La PARADA del paso 25 por un rojo de C-42 distinto del esperado encaja con su "Debe esperar", y S-16 llega en el paso 23.

### Problemas que no bloquean
- **N-1 — el grep del patrón 2 no ve a quienes llaman a `desactivarUsuarioDePrueba`.** Por eso la frase "solo cuatro tienen un maestro dado de baja" omite `cuentas-03a-r1`, que da de baja a maestros en `:593` y `:792` dentro de flujos de invitación. No cambia el resultado. Lo cubre esta verificación, en (b), y no pide enmienda. Para los greps de hermanos que vengan, conviene buscar también los ayudantes que escriben el mismo campo.

### Detalles menores
- "Rojo en `:729`" y "`:728-729`" (E13-1 y el bloque del paso 20) nombran las líneas de hoy. Después de C-42, el rojo cae en la línea de la aserción de `b`.
- El caso permite cambiar el título (`:694`). En la ronda 0 de 01e, cuando verifique el diff contra `73c55120…`, voy a aceptar solo el título de `:694` y el bloque que reemplaza `:728-729`. Cualquier otra línea es hallazgo.
- `:1673` ("C-n: ninguno nuevo fuera de … C-25 a C-32") es del grep de la Enmienda 5 y habla de su propio alcance. No contradice a C-42.

### Destino de O-3
Resuelta por la Enmienda 13, como dice E13-5. Lo marqué en las filas `:1533` y `:2334` de este archivo. El diff de C-42 lo verifico en la ronda 0 de 01e.

## Verificación del resumen — ADMIN-01e

Veredicto: **DEVUELTO**, por un solo hallazgo pequeño (M-14): `core/usuarios/fila.ts` es una función de `core/` sin prueba unitaria. Todas las cifras del resumen coinciden con mis corridas, el mapeo de las 22 pruebas requeridas está completo, la migración es la del plan, "No se toca" está limpio y las 267 `*.ataque` tienen los hashes de la ronda 0. El arreglo es acotado: un archivo de prueba, sin tocar código de producción. Además, hay una decisión para el humano (el tope crudo del motivo, arbitraje 1), que conviene resolver antes de devolver, para que el programador haga los dos cambios en la misma vuelta.

Plan: `plan.md` = `7018e1f321364350554c1a2fdd2cd2e5f0c54ea18c3586ce8c62a1ad2b4e97cf` (Enmiendas 1 a 13), comprobado. Resumen: `resumen-programador.md` = `c5b31b7b…`, "ADMIN-01e — Implementación (2026-11-09)" (línea 2816) y "Continuación tras la confirmación de la migración" (línea 2928), comprobado. Ronda 0: `reporte-tester.md` = `ec63a977…`, línea 4527. Base dentro de los paquetes: `ea718bc`.

Entorno: sin otra copia ni otra suite (respuesta del humano por el orquestador); antes de cada corrida comprobé que ningún `node` corría `vitest` (el único `node` vivo es ajeno, `codex-runtimes … host-daemon.mjs`, y no lo toqué). Docker 28.5.1. Red `uacam5 2`, perfil Privado, autorizada por el humano para hoy (PA-01). `BatteryStatus` 2, al 100 %. Sin navegadores. Una corrida después de otra.
- **Huella del árbol entregado:** `19223130125dcc20f1b4b51d654b42e519ef0fa3b20b3f1e8c5d70d5c0b0787f` (`git diff ea718bc -- frontend backend shared` más el `sha256sum` de los 23 archivos sin rastrear de los paquetes). No toqué el árbol.

### Cifras: resumen contra mi corrida

| Qué | Resumen | Mi corrida |
|---|---|---|
| `shared`: `npm run lint` · `npm run build` | `All matched files use Prettier code style!` · exit 0 (`> tsc -p tsconfig.json`) | **Igual**, exit 0 los dos |
| backend: `npm run lint` | exit 0; última línea `> tsc -p tsconfig.json --noEmit && tsc -p tsconfig.test.json` | **Igual**, exit 0 |
| backend: `npm run build` | — (el resumen no lo corre) | exit 0 (`> tsc -p tsconfig.json`) |
| frontend: `npm run lint` · `npm run build` | exit 0 (`> tsc -b`) · `✓ built in 1.08s` | **Igual**: exit 0 · `✓ built in 1.24s` (el tiempo no se contrasta) |
| Módulos del backend, `npx vitest run $(cat modulos-01e.txt)` (70 rutas) | `Test Files 73 passed (73)` · `Tests 1027 passed (1027)` | **Igual**, a la primera, sin `FAIL` (09:51:17, 105 s) |
| Contención en esa corrida | `40P01`, `deadlock detected`, `could not serialize`, `too many clients`, "Error no controlado": 0; `"code":"P2028"` 5 | **Igual.** Los 5 `P2028`: `req-1`, `req-3` y `req-5` del proceso de `servicio-ocupado` (los tres deterministas) y `req-1m` (`sesiones.ts:39`, el login) y `req-20` (`tokens-cuenta.ts:119`, el restablecimiento) de `cuentas-r3.ataque:713-800`, que retiene la fila más de 5 s a propósito |
| Frontend, `npx vitest run src/features/clases src/lib/errores-ch3-r2.ataque.test.ts` | `Test Files 114 passed (114)` · `Tests 2482 passed (2482)` | **Igual** (09:53:49, 220 s) |
| Casos ADM-1E | 77 en 12 archivos; por archivo y por id, la tabla del resumen | **Igual** (ver "Mapeo") |
| Migración | `migration.sql` `6b427bd4…`; deriva `No difference detected.` | **Igual** el hash. La deriva no la repetí: necesita la base de desarrollo y no aporta sobre ADM-1E16, que pasó |
| SHA-256 de `shared/src/usuarios-admin.ts` y `schema.prisma` | `465fdd57…` y `394760a4…` | **Igual** |
| Hunks de la lista cerrada y del esquema | los del resumen | **Igual** (`git diff -U0`) |
| `instantaneaUnica: true` (C-8, O-01e-2) | `gestion-de-usuarios.ts` 2, `movimientos.ts` 1, `clases.ts` 4 | **Igual**; 0 en `maestros-de-clase.ts`, `tokens-cuenta.ts` e `inscripciones.ts` |

**¿La lista de módulos cubre lo que exige el plan?** Sí. Tiene las 7 pruebas nuevas, la lista cerrada, los 11 archivos de los C-n, todas las vigiladas que §D-R0 → 01e nombra (Enmiendas 1, 4, 7, 8 y 13, M-09 y generales) y las de los hermanos (tokens de cuenta, patrón 1 de la Enmienda 13). Por mi cuenta busqué por grep las pruebas que ejercen código tocado y no estaban en la lista: `crearClaseAdministrada` (`clases-r2` y `clases-r3`), «Personas» y la guarda (`alumnos-autorizacion`, `guarda-clase-r2`), tokens y servicio ocupado (`servicio-ocupado-ch-r1`, `worker-correo-de-cuenta`, `core/auth/enlaces.test.ts`), el log (`enlaces-ch-r2`, `guarda-ch-r3`, `clases-archivadas-r2`, `borrado-duplicado-r2`, `exportacion-02a-r1`, `config/env.test.ts`), las migraciones (`calificaciones-migracion`, `clases-archivadas-migracion`, `migracion-01a-r1`, `migracion-clases-03a`, `-03b`, `migracion-clases03a-r1`, `migracion-maestros-de-clase`, `sexto-paso-02a-r1`) y las estáticas que leen `backend/src` (`instantanea-01b-r1`, `muro-c-r1`, `muro-c-r2`, `tareas-01a-r1`, `tareas-01b-r1`, `worker-03c-r1`, `calificaciones-estatico-01b-r1`, `dudas.integracion`, `notifier-registro`, y las de asignar maestros de la invitación masiva). Las corrí aparte, después de la de módulos (resultado abajo). En el frontend, los únicos consumidores de los esquemas que cambian (`maestroDeClaseSchema`, `personasRespuestaSchema` y los que los usan) están en `features/clases`; la única prueba que lee `shared/src` es `errores-ch3-r2`. La lista del frontend es correcta.

### Mapeo de las pruebas requeridas (ADM-1E01 a ADM-1E22)

Comparé cada título citado en el resumen con los títulos de los archivos (77 `it(` con "ADM-1E", ningún otro caso en esos archivos) y con `npx vitest list` (abajo). **0 títulos con diferencia y 0 viñetas sin caso.** Por id: 1E01 17, 1E02 7, 1E03 1, 1E04 2, 1E05 6, 1E06 1, 1E07 3, 1E08 5, 1E09 4, 1E10 2, 1E11 2, 1E12 1, 1E13 2, 1E14 1, 1E15 1, 1E16 2, 1E17 3, 1E18 2, 1E19 2, 1E20 1, 1E21 7, 1E22 5 = 77. Por archivo: `acceso` 5, `baja` 6, `busqueda` 4, `textos` 2, `logger-sin-consulta` 3, `usuarios-admin` 21, `-baja` 17, `-pago-acceso` 9, `-resumen-movimientos` 4, `-autorizacion` 1, `-migracion` 2, `logs-usuarios-admin` 3.

Lo que pide cada viñeta contra lo que hace el caso (leí los 77):
- **ADM-1E02, 1E10 y 1E11 cumplen E8-4:** todo con un `q` propio (`marcaDePrueba`); el resumen, con `leerResumenAdmin(tx)` en una transacción `instantaneaUnica` con `timeout: 10_000` que se deshace con un centinela, y por HTTP solo la forma y `alumnos ≥ 1`; los movimientos, recorriendo hasta 40 páginas por id, con `secuencia` estrictamente descendente y sin ids repetidos.
- **ADM-1E05:** los seis casos del plan, más la invitación viva de un maestro. "Repetir → sin escribir" lo comprueba con `actualizadoEn`.
- **ADM-1E13:** el segundo caso es el que solo cierra M-18 (la cuenta pasa a inactiva bajo la retención, sin revocar el token); el primero pasaría también sin M-18, y el resumen lo dice.
- **ADM-1E14:** un solo caso que recorre las 13 entradas (9 rutas y 4 `HEAD`) con sin token, estudiante, maestro y restringido; comprueba que el objetivo no cambia y que no se crea ninguna cuenta. Ninguna ruta lleva `:claseId`, así que no hay caso de clase ajena; es correcto.
- **ADM-1E18:** los dos órdenes con `conFilaRetenida`, para asignar, crear y duplicar, y `asignadosActivos` en 0 o en 1. Cumple "nunca queda un maestro inactivo asignado a una clase activa" en los dos sentidos.
- **ADM-1E21:** (a) a (i), con (i) afirmando el `200 [N3, N5]` y el comentario de R-19.
- **ADM-1E22:** las cinco peticiones del plan (con el `q` de más que arbitro abajo), la precondición por petición y las dos aserciones; el caso unitario usa el secreto distintivo de N-26.
- **Lista cerrada:** solo `movimientos-inscripcion.integracion.test.ts` (PR-B16g y PR-B16h, con los cuatro hunks declarados) y E6 de `bloqueo-usuario.integracion.test.ts` (título, el nombre en su lugar alfabético y la línea `// ADMIN-01e (§D-7): …`). `commonPrefix: false` en PR-B16g es necesario y no debilita lo que protege: sigue exigiendo una sola aparición de «movimiento» y suma el `403` del maestro.

### Migración, "No se toca" y `*.ataque`

- **Migración contra el plan (línea 660):** los cuatro índices pedidos y nada más: GIN `gin_trgm_ops` sobre `email`, `(nombre_busqueda, id)`, `(rol, nombre_busqueda, id)` y `movimientos_inscripcion (secuencia DESC)`; sin el `(alumno_id, secuencia DESC)` que quitó la Enmienda 1; el comentario de `MovimientoInscripcion` al día (A-09). Solo índices: compatible hacia atrás, y revertir el código no rompe la base. El orden distinto de las cuatro sentencias (aceptado por el orquestador) no tiene efecto: no dependen entre sí. ADM-1E16 comprueba que la migración está aplicada y la definición de cada índice.
- **"No se toca":** `git diff --name-only ea718bc` más los archivos sin rastrear dan solo archivos de "Se toca" de 01e, los 11 `*.ataque` de la ronda 0 y `docs/trabajo/ADMIN-01-administracion/`. `config/logger.ts` cambia solo en `serializers.req` (el tipo de entrada, la función y una línea en las opciones; `redact` y `level` iguales). `handlers/admin.ts` solo suma el `import` y el `register` con su comentario, sin `estadoPago` (OA-01e-1). `inscripciones.ts` solo toca `listarPersonas` y su tipo, con Prisma. `tokens-cuenta.ts`, solo las tres líneas de M-18. Ignoré `docs/trabajo/DEPLOY-investigacion-vps.md` (del 2026-11-04, ajeno, como en las revisiones anteriores).
- **`*.ataque`:** extraje la lista V-01 del reporte de la ronda 0: da `b17af275…` (267 líneas) y `sha256sum -c` da 267 OK. Ninguna `*.ataque` sin rastrear; las 11 modificadas son las de los C-n. El programador no tocó ninguna.

**Corrida aparte de las pruebas fuera de la lista** (las 32 rutas del párrafo anterior, después de la de módulos y de la del frontend, 09:57:40): `Test Files 32 passed (32)` · `Tests 375 passed (375)`, sin `FAIL` y sin `40P01`, `deadlock`, `could not serialize`, `too many clients`, "Error no controlado" ni `P2028`. La lista del programador era suficiente para lo que pide el plan; esta corrida solo confirma que nada de lo tocado rompe a sus vecinos.

**Conteo:** `npx vitest list` con los 12 archivos del resumen da 77 casos con "ADM-1E", con los mismos números por archivo y por id. Un guion comparó los 77 títulos citados en el resumen con los 77 de la lista: 0 faltan y 0 sobran.

### Hallazgo

#### M-14 — `core/usuarios/fila.ts` no tiene prueba unitaria (bloquea)
Dónde: `backend/src/core/usuarios/fila.ts` (`filaDeUsuarioAdmin`), nuevo; no hay `fila.test.ts`.
Por qué importa: `AGENTS.md`, "Pruebas": "Toda función de `core/` lleva pruebas unitarias"; el plan, §Cambios por capa → `backend/core/` 01e: "Cada uno con su prueba". Es justo la función que decide que el estado de pago y la restricción viajen solo en las filas de estudiantes (RN-02). Hoy la cubren las pruebas de integración (ADM-1E02 y el `superRefine` de `usuarioAdminFilaSchema`, que daría un `500` y no una fuga), pero ninguna de las mutaciones del resumen la toca, y una regresión solo se vería como `500` en la API.
Qué se espera: una prueba unitaria de `filaDeUsuarioAdmin` en `core/usuarios/`, con el prefijo `ADM-1E01` como las demás de esa carpeta: un estudiante trae los cinco campos (fechas en ISO o `null`); un maestro y el admin traen exactamente `id`, `nombre`, `email`, `rol`, `activo` y `creadoEn` (claves exactas, ni `estadoPago` con `undefined`); `creadoEn` en ISO. El resumen de la corrección trae el conteo nuevo de ADM-1E01 y una mutación que la haga caer (por ejemplo, quitar la guarda del rol). No toca código de producción. La verificación de la corrección será acotada: `lint` del backend, `src/core/usuarios` y la huella del árbol.

### Arbitrajes

1. **Tope de 1000 caracteres del motivo (`shared/src/usuarios-admin.ts:20-23` y `:144-152`). Parte cabe en el plan; el tope, no: va al humano.**
   - **Lo que cabe:** prohibir los caracteres de control y los inversores de dirección. En este código, "texto" de un campo libre es `textoLargoSchema` (descripción, avisos, comentarios). Sin esa regla, un `\0` en el motivo da un `500` de PostgreSQL. Su texto ("El texto tiene caracteres no permitidos") ya existe en `shared/`.
   - **Lo que no cabe:** el tope crudo de 1000. S-10 y §Cambios (`shared/` 01e) fijan el motivo en "0 a 300 visibles tras `normalizarTextoLargo`". Con el tope, un motivo de hasta 300 visibles con más de 1000 unidades de UTF-16 (300 visibles más 701 espacios o saltos de línea internos, o unos 300 emojis con modificadores) responde `400` "motivo: No puede tener más de 1000 caracteres". Es un texto nuevo para la persona: en 01f llega al diálogo de restringir (ADM-1F08), junto a un campo cuyo límite es 300. Además, el precedente que cita (`LONGITUD_MAXIMA_BUSQUEDA_CRUDA`) cuenta puntos de código (`Array.from`), y `.max` de zod cuenta unidades de UTF-16: no es la misma medida.
   - Decisión en "Para el humano". No bloquea por sí sola la ronda 1, pero conviene resolverla antes de devolver M-14, para que el programador haga los dos cambios en la misma vuelta.
2. **`q=<marca>` en la primera lista de ADM-1E22: se acepta, sin enmienda.** La Enmienda 8 (E8-4, forma (a)) obliga a toda prueba nueva de 01e a filtrar la lista global con un filtro propio. Sin el `q`, el `cursorNombre` de la página 2 sería el de la cuenta de otra prueba, y "el log no contiene el nombre de las alumnas" no probaría nada sobre el cursor. Con el `q`, se conservan la ruta, `rol`, `estadoPago`, `cursor` y `cursorNombre`; la precondición exige el `200` de la página 2 (sin cursor válido sería `400`) y la marca entra en la lista de secretos. Nada de lo que protege el caso se pierde.
3. **`core/usuarios/fila.ts`: el lugar se acepta; la falta de prueba es M-14.** La carpeta `core/usuarios/` es nueva en "Se toca". La función es pura (solo importa el tipo `Rol` de `shared/`) y saca del handler la comparación de `rol` que decide qué campos viajan (regla 2 y §Autorización: "ningún handler compara roles").
4. **Orden de guardas de la baja (admin → mismo estado → `409 MAESTRO_CON_CLASES`): se acepta.** §D-7.4 enumera los tres casos sin fijar el orden, y ADM-1E05 pide "repetir → sin escribir". `PUT …/activo` es idempotente. Con el otro orden, repetir la baja de un maestro ya inactivo al que una restauración dejó en una clase activa (N-14, decisión del humano) respondería un `409` por un cambio que ya está hecho, y en 01f el diálogo pediría reasignar clases para dar de baja una cuenta que ya está dada de baja. Que el admin dé `409` también con `activo: true` está dentro de "admin → 409" del plan. El texto habla de "dar de baja", pero la ficha de 01f no ofrece acciones sobre la cuenta del admin (detalle menor, abajo).

### Hermanos de los remedios del plan, contra el código

- **N-03 (bloqueo de los maestros):** solo hay tres escritores de `maestros_de_clase` (grep de `maestroDeClase.create` y `maestros: { create`). Asignar usa `bloquearMaestrosActivos` después de `bloquearClase` (`maestros-de-clase.ts:69`). Crear corre cada intento en su `enTransaccion`, con el bloqueo, y devuelve `null` (`404`) si falta un maestro (`clases.ts:188-205`); conserva la lectura previa sin bloqueo, como pide §D-7.9. Duplicar lo tiene desde 01b (`duplicado-de-clase.ts:104`). Restaurar es el camino de N-14, aceptado. ADM-1E18 cubre los dos órdenes de los tres. Coincide con el resumen.
- **S-16 (`cuentaDesactivada`):** `maestrosDeFilas` la pone solo con `activo === false`. Alcanza al detalle, a la lista del admin, a crear y editar (`SELECT_CLASE_DETALLE` y `:506`) y a asignar y quitar (`leerMaestros`, el mismo `select`). «Personas» la pone con Prisma (`inscripciones.ts:121-144`). Inscritas y anteriores leen solo `nombre` (C-42 lo exige). El duplicado no pide `activo` y sus maestros están bloqueados como activos. Coincide con el resumen. Hay un vecino que el resumen no nombra: el campo de compatibilidad `maestro` de `personasRespuestaSchema` sigue siendo `personaConCorreoSchema`. Si el principal está dado de baja, `maestros[0]` trae la marca y `maestro` no. El plan solo pide la lista (§D-7.10), así que no es un defecto. Va como punto de ataque y como nota para 01f.
- **M-18:** `usarTokenYCambiarContrasena` es el único consumidor de un token, y relee `activo` bajo el bloqueo. `prepararTokenDeRecuperacion` puede crear un token para una cuenta que se dio de baja después del pedido, pero el worker no envía el correo si `registro.usuario.activo` es falso (`workers/correo-de-cuenta.ts:73-78`), y el token no se puede usar. Coincide con el resumen.
- **M-09:** el serializador vale para toda petición (Fastify da prioridad al `serializers.req` propio sobre el suyo: `logger-factory.js:100` y `:126`). Ningún archivo de `backend/src` registra `url`, `query` ni `request` por su cuenta (grep). `setNotFoundHandler` responde sin la ruta. El worker no registra `req`. Coincide con el resumen.
- **Cursor con posición:** solo `GET /admin/usuarios` (`cursorNombre`, comparado literalmente con el `nombre` de la fila leída con los mismos filtros, en la misma instantánea). Movimientos va sin posición, como dice el plan. `(cursor === undefined) !== (cursorNombre === undefined)` da `400` antes de abrir la transacción.

### Matriz de las rutas nuevas, contra el código

Las nueve rutas (`handlers/admin/usuarios.ts`) llevan `protegido({ roles: ["admin"] })`, sin `pertenencia` ni `enClaseArchivada`. Ningún handler compara rol ni estado: las decisiones son de `core/usuarios/`, y el bloqueo y el conteo, del adaptador. Los datos de pago y de acceso salen solo en las filas de estudiantes (`filaDeUsuarioAdmin`), y `usuarioAdminFilaSchema` lo exige en los dos sentidos. El lote responde solo `{ actualizados }`. Resumen y movimientos no llevan estado de pago (ADM-1E11 lo comprueba con `clavesDe` y `"deudor"`). ADM-1E14 comprueba los `403` y que sus cuerpos no lo llevan. La tabla del resumen coincide con el código fila por fila. Sin interfaz en 01e: no hay matriz de avisos y recargas.

### No bloquean

- **N-01e-1 — `GET /admin/usuarios?q=` (vacío) responde `400 BUSQUEDA_MUY_CORTA`, no "sin filtro".** Cumple §D-7.1 y es lo que prueba ADM-1E02. El destino es 01f: la tabla de usuarios y la de estado de pago (01g) deben omitir `q` cuando el buscador está vacío. Queda como nota para el arquitecto, para el inventario de 01f.
- **N-01e-2 — `personas.maestro` sin la marca** (ver S-16, arriba). En 01f, «Personas» y cualquier vista nueva leen `maestros`, no `maestro`.

### Detalles menores (no requieren cambio en 01e)

- `"al_corriente" | "deudor"` está escrito a mano en `core/usuarios/fila.ts` (dos veces) y en `gestion-de-usuarios.ts` (`EstadoPagoDb`), como ya hacía `inscripciones.ts:38`. `shared/` exporta el esquema y no el tipo.
- "No hay ninguna cuenta con ese identificador." está repetido entre `handlers/admin.ts:64` y `core/usuarios/textos.ts`. `admin.ts` no se toca más allá del `register` (OA-01e-1).
- Con `activo: true`, la cuenta del admin responde "La cuenta de administración no se da de baja." (arbitraje 4). Es inalcanzable desde la ficha de 01f.
- En el handler de la lista, `let busqueda: { nombre: string; email: string } | undefined` repite en línea la forma de `BusquedaDeUsuarios` de `core/usuarios/busqueda.ts`.

### Puntos de ataque para la ronda 1 de 01e (después de la corrección de M-14)

1. **Protocolo de bloqueo con todo a la vez sobre un mismo alumno:** baja, restringir, lote de estado de pago (con el id en mayúsculas y en minúsculas), login, refresco, `establecer-contrasena` y `restablecer` (del admin). Busca un `40P01`, un `500`, un `P2028` que no sea el de una retención deliberada de más de 5 s, una sesión viva tras la baja o la restricción, y M-18 con la baja confirmada entre la verificación del token y el bloqueo.
2. **N-03 y N-14 con la marca:** restaurar una archivada cuyo único maestro está dado de baja y después repetir la baja (200 sin escribir) o reactivarlo. Quitar al único maestro activo de una clase activa para dejar solo uno dado de baja: ¿lo permite? ¿Qué responde la baja entonces? Contrástalo con RN-06 y con N-14. También O-R1-1 (una archivada con 0 maestros: `500` por `min(1)` en `GET /clases/anteriores` y en `conMaestroPrincipal`) y N-18.
3. **S-16:** `activo` no sale en ninguna respuesta. La marca va solo en el inactivo y siempre `true`. Debe salir en detalle, lista del admin, crear, editar, asignar, quitar y «Personas», y nunca en inscritas, anteriores, candidatos ni duplicar. `personas.maestro` (compatibilidad), con el principal dado de baja: sin `500` (el `parse` lo quita).
4. **Lista de usuarios:** `q` con `\` al final, `%`, `_`, `+`, mayúsculas Unicode (`İ`, `ß`, `ǅ`), 120 y 121 normalizados, 1000 y 1001 crudos, vacío, repetido (`q=a&q=b`), solo espacios. Inyección. `rol` o `estadoPago` repetidos o inválidos. Un cursor cuya cuenta cambia de estado de pago entre dos páginas con `estadoPago`, se da de baja (sigue en la lista) o se renombra. `cursorNombre` con `\0` o con 10 000 caracteres. Que nada responda `500`.
5. **Motivo de la restricción**, según lo que decida el humano: los bordes de 300 visibles con relleno invisible o de espacios hasta pasar las 1000 unidades de UTF-16, emojis con modificadores, controles C0 y C1, inversores y `motivo` que no es texto (`null`, número u objeto). Restringir de nuevo con el mismo motivo escrito de otra forma (espacios externos, `\r\n`): no debe escribir. Restablecer con motivo.
6. **M-09, otras salidas del log con la consulta:** el `err` de un JSON inválido, de un `415` o de una ruta inexistente con consulta, un `HEAD`, una petición abortada, el `400` de `validarParametros` (que el mensaje no repita el valor) y el worker. A `trace`, que no aparezca ni el estado de pago, ni un nombre, ni un correo, ni un cursor.
7. **Alta de alumno:** dos altas a la vez con el mismo correo (una `201`, la otra `409`, ningún `500`). El correo de una cuenta dada de baja da `409`. Correo con mayúsculas y espacios. La temporal no aparece en los logs, y `no-store` va también en el `409`, si aplica.
8. **Lote de estado de pago:** 100 ids con uno del admin, de un maestro o inexistente → `400` sin escribir ninguna fila. Alumnos dados de baja o restringidos: el plan no lo prohíbe; confirma que es coherente y que `fecha_estado_pago` solo cambia en las filas que cambian.
9. **Movimientos y resumen:** el cursor de un movimiento borrado con su clase (borrado definitivo de 01b) → `400`; el actor maestro o el alumno dados de baja; ni estado de pago ni restricción en ninguna clave. En el resumen, las inactivas y las archivadas no cuentan; `HEAD`.
10. **Autorización de las cuentas raras:** un maestro con `acceso_restringido` en la base (no debería existir), una cuenta inactiva con un token de acceso vivo y el admin con su propio `PUT …/acceso` (`409 NO_ES_ALUMNO`).

### Para el humano

- **Motivo de la restricción, tope crudo de 1000 (arbitraje 1).** S-10 fija el motivo en "de 0 a 300 caracteres visibles". El programador agregó, además, un tope de 1000 unidades de UTF-16 con el texto "No puede tener más de 1000 caracteres", que en 01f vería el administrador junto a un campo de 300. Solo se alcanza con más de unos 700 caracteres invisibles o espacios entre los 300 visibles. Opciones:
  - **(a)** Dejarlo como está (tope de 1000 con ese texto).
  - **(b)** Dejar el tope, pero con el texto de S-10, "El motivo no puede tener más de 300 caracteres": un solo mensaje para la persona.
  - **(c)** Quitar el tope y dejar solo la regla de los 300 visibles y la prohibición de controles e inversores. Es lo literal del plan y no agrega ningún texto; el tamaño del cuerpo ya lo limita Fastify.
  - **Mi recomendación: (c).** Con (b) o (c), el cambio es de una o dos líneas en `shared/` y va en la misma vuelta que M-14, con un caso en ADM-1E09.

## Verificación de la corrección — ADMIN-01e

Veredicto: **ACEPTADO.** M-14 está corregido, la decisión del humano sobre el motivo ("Quitarlo", opción (c)) está aplicada tal cual y las cifras coinciden. Hay un aviso de entorno (dos `beforeAll` que vencieron a batería en la primera corrida) y una nota de forma en el resumen. Ninguno de los dos bloquea.

Resumen: `resumen-programador.md` = `5f5d845220945af39a06ba7f2d4ddf6ca6119be60d7d2c892b3baa202043b434`, "## ADMIN-01e — Corrección de la verificación (2026-11-09)" (línea 3041), comprobado. Plan sin cambios: `7018e1f3…`.

Entorno: sin otra copia ni otra suite (ningún proceso con `vitest` antes de cada corrida); Docker encendido; red `uacam5 2` autorizada hoy. **A batería:** `BatteryStatus` 1, al 91 %. Se corrió igual, como pide el humano, y se declara. Una corrida después de otra, sin navegadores y sin tocar el árbol.

### Cifras: resumen contra mi corrida

| Qué | Resumen | Mi corrida |
|---|---|---|
| `shared`: `npm run lint` · `npm run build` | `All matched files use Prettier code style!` · exit 0 | **Igual**, exit 0 los dos |
| backend: `npm run lint` | exit 0; `> tsc -p tsconfig.json --noEmit && tsc -p tsconfig.test.json` | **Igual** |
| backend: `src/core/usuarios` y las tres integraciones (`-pago-acceso`, `usuarios-admin`, `-autorizacion`) | `Test Files 8 passed (8)` · `Tests 53 passed (53)` | **Igual en la segunda corrida** (11:05:07, 31 s), sin `FAIL`, sin `40P01`, sin `P2028` ni `500`. La primera (11:04:16) dio `2 failed`: los `beforeAll` de `usuarios-admin-pago-acceso` (`:62`) y de `usuarios-admin.integracion` (`:72`) vencieron su `hookTimeout` de 10 s al construir la app, sin llegar a ningún caso (21 pasaron y 32 se saltaron). Ver N-01e-3 |
| frontend: `errores-ch3-r2.ataque` · `lint` · `build` | `Tests 85 passed (85)` · exit 0 · `✓ built in 1.48s` | **Igual**: `85 passed` · exit 0 · `✓ built in 1.65s` |
| `npx vitest list` de los 12 archivos de antes más `fila.test.ts` | 82 casos ADM-1E; 1E01 20 (3 de `fila.test.ts`); 1E09 6 | **Igual**: 82, 20 (3) y 6. Los cinco títulos nuevos coinciden literalmente con el resumen |
| SHA-256 de los cuatro archivos | `78752dcb…`, `f5b08d47…`, `b2ebe59f…` y `db851281…` | **Igual** |
| V-01 | — | 267 OK contra `b17af275…`; ninguna `*.ataque` sin rastrear |
| Huella del árbol | — | `1afb36bc1f77821b45d875f23f4d3a640b4a71a51d952f952214f95bef037e85` (25 archivos rastreados cambiados y 24 sin rastrear: 49, uno más que antes, `fila.test.ts`) |

**Alcance:** desde mi verificación anterior (10:01) solo cambiaron, por fecha de modificación, `shared/src/usuarios-admin.ts`, `fila.test.ts`, las dos integraciones declaradas y `fila.ts`. Este último solo tiene la fecha nueva por las mutaciones restauradas: su contenido es el que revisé (la guarda `rol !== "estudiante"` en `:46`, las fechas con `isoONulo`, 55 líneas). No cambió código de producción fuera de `shared/src/usuarios-admin.ts`.

### M-14 y la decisión del motivo, contra el código

- **M-14, cerrado.** Los tres casos de `fila.test.ts` piden lo que pedí: el estudiante con las once claves (fechas en ISO o `null`, nunca sin la clave), y el maestro y el admin con exactamente las seis comunes (`Object.keys` y `toEqual` exactos, aunque la cuenta tenga datos de pago o de acceso). Sin la guarda del rol, el tercer caso cae; lo confirman la lectura y la mutación del resumen (`1 failed`).
- **Motivo, como decidió el humano.** `MAXIMO_CRUDO_MOTIVO` ya no existe y el esquema usa `.pipe(textoLargoSchema(Number.POSITIVE_INFINITY))` (`shared/src/usuarios-admin.ts:147`): `.max` no se alcanza y el texto "No puede tener más de 1000 caracteres" desaparece para el motivo. Se conservan el rechazo de controles e inversores con el texto que ya existía y la medida de S-10 (hasta 300 visibles; sin visibles, sin motivo). No hay texto nuevo.
  - Los dos casos nuevos de ADM-1E09 aceptan 300 visibles con 1795 caracteres en total y 300 emojis de dos unidades, y guardan los dos tal cual. 301 visibles con el mismo relleno dan `400` "motivo: El motivo no puede tener más de 300 caracteres". `\0`, `\a` y U+202E dan `400` "motivo: El texto tiene caracteres no permitidos", sin escribir y sin `500`.
  - Los 300 emojis (600 unidades) no habrían tocado el tope viejo. El caso que sí lo prueba es el del relleno, y la mutación con el tope de vuelta lo hace caer.
- **Los escapes que la herramienta convirtió en caracteres literales.** Barrí los 49 archivos de 01e (`git status` de `frontend`, `backend` y `shared`, incluidas las 11 `*.ataque`) buscando controles C0 y C1 (sin `\t`, `\n` ni `\r`), espacios de ancho cero, marcas e inversores de dirección (U+200B a U+200F, U+202A a U+202E, U+2066 a U+2069) y BOM: **0 caracteres.** En las dos pruebas, `\u0000`, `\u0007` y `\u202e` están escritos como escapes (`usuarios-admin-pago-acceso.integracion.test.ts:273` y `usuarios-admin.integracion.test.ts:323`). El comentario de `shared/src/usuarios-admin.ts` dice "el carácter nulo", en texto.

### Arbitraje: el tope crudo de 1000 de `q` en la lista de usuarios se queda

No es hermano del motivo, por tres razones:
- **Es la regla que ya existía:** la de S-12 y el buscador de candidatos (`busquedaCandidatosSchema` y `estadoDeTerminoDeBusqueda`, con `LONGITUD_MAXIMA_BUSQUEDA_CRUDA`, que cuenta puntos de código). §D-7.1 pide el mismo criterio para `q`.
- **No agrega ningún texto:** responde "La búsqueda no puede tener más de 120 caracteres", el mismo del límite documentado.
- **No rechaza ningún término que el plan declare válido:** el plan no fija un mínimo de visibles ni permite relleno en un término de búsqueda. Un texto de más de 1000 puntos de código no es una búsqueda razonable, y su mensaje es el de siempre.

En el motivo el problema era distinto: el límite documentado eran los visibles, y el tope traía un texto nuevo que lo contradecía. Sin cambio.

### No bloquean

- **N-01e-3 — dos `beforeAll` vencieron a batería.** La primera corrida dio `Hook timed out in 10000ms` en `construirApp`/`app.ready()` de `usuarios-admin-pago-acceso.integracion.test.ts:62` y `usuarios-admin.integracion.test.ts:72`. La segunda, un minuto después y en el mismo estado de batería, pasó completa. No es un defecto del código: no llegó a correr ningún caso. Es el mismo patrón de fragilidad con carga que ya está anotado para ESTADO §3 (las pruebas frágiles de 01d2). Si se repite en la suite completa del cierre, esos dos archivos necesitan un `timeout` explícito en su `beforeAll`, como el de otros archivos de integración. No cuenta contra el programador.
- **N-01e-4 — el resumen de la corrección tiene seis U+202E literales** (`resumen-programador.md:3054`, `:3057` y cuatro en `:3059`). Según el visor, invierten el orden de lo que sigue en la línea. `docs/trabajo/` se versiona: antes del commit de 01e, el orquestador o el programador los cambia por el texto `\u202e`. No afecta al código.
- Siguen en pie N-01e-1 (`q` vacío en 01f y 01g) y N-01e-2 (`personas.maestro` sin la marca), y los detalles menores de la verificación anterior.

### Puntos de ataque finales para la ronda 1 de 01e

1. **Protocolo de bloqueo con todo a la vez sobre un mismo alumno:** baja, restringir, lote de estado de pago (con el id en mayúsculas y en minúsculas), login, refresco, `establecer-contrasena` y `restablecer` (del admin). Busca un `40P01`, un `500`, un `P2028` que no venga de una retención deliberada de más de 5 s, una sesión viva tras la baja o la restricción, y M-18 con la baja confirmada entre la verificación del token y el bloqueo.
2. **N-03 y N-14 con la marca:** restaurar una archivada cuyo único maestro está dado de baja y después repetir la baja (200 sin escribir) o reactivarlo. Quitar al único maestro activo de una clase activa para dejar solo uno dado de baja: ¿lo permite? ¿Qué responde la baja entonces? Contrástalo con RN-06 y N-14. También O-R1-1 (una archivada con 0 maestros: `500` por `min(1)` en `GET /clases/anteriores` y en `conMaestroPrincipal`) y N-18.
3. **S-16:** `activo` no sale en ninguna respuesta, y la marca va solo en el inactivo y siempre `true`. Debe salir en detalle, lista del admin, crear, editar, asignar, quitar y «Personas», y nunca en inscritas, anteriores, candidatos ni duplicar. `personas.maestro` (compatibilidad), con el principal dado de baja: sin `500` (N-01e-2).
4. **Lista de usuarios:** `q` con `\` al final, `%`, `_`, `+`, mayúsculas Unicode (`İ`, `ß`, `ǅ`), 120 y 121 normalizados, 1000 y 1001 crudos (este tope se queda: arbitraje de arriba), vacío, repetido (`q=a&q=b`) y solo espacios. Inyección. `rol` o `estadoPago` repetidos o inválidos. Un cursor cuya cuenta cambia de estado de pago entre dos páginas con `estadoPago`, se da de baja (sigue en la lista) o se renombra. `cursorNombre` con `\0` o con 10 000 caracteres. Nada responde `500`.
5. **Motivo de la restricción, sin tope crudo (decisión del humano, 2026-11-09).** La única medida son los 300 visibles tras `normalizarTextoLargo`, y se rechazan los controles y los inversores.
   - **Bordes de la medida:** 300 y 301 visibles con relleno de espacios, saltos, tabuladores, ZWJ (U+200D), selectores de variación y caracteres que `contarCaracteresVisibles` cuenta como vacíos; emojis compuestos (familias, banderas, tonos de piel); un motivo enorme dentro del límite del cuerpo de Fastify (1 MiB). Debe responder `200` o `400` legible, sin `500` ni un tiempo de respuesta absurdo, y guardarse tal cual.
   - **Caracteres prohibidos:** todos los controles C0 y C1 (salvo `\n` y `\t`) y los inversores (U+202A a U+202E, U+2066 a U+2069) → `400` "motivo: El texto tiene caracteres no permitidos", sin escribir. Comprueba también los separadores U+2028 y U+2029 y que `\r\n` se normalice.
   - **Tipos y estados:** `motivo` que no es texto (`null`, número, objeto o arreglo) → `400` legible. Restringir de nuevo con el mismo motivo escrito de otra forma (espacios externos, `\r\n`) no debe escribir. Un motivo de solo invisibles cuenta como sin motivo. Restablecer con motivo lo ignora.
   - **Que la respuesta no fugue nada:** el `400` no repite el motivo, y el log a `trace` no lo registra.
6. **M-09, otras salidas del log con la consulta:** el `err` de un JSON inválido, de un `415` o de una ruta inexistente con consulta, un `HEAD`, una petición abortada, el `400` de `validarParametros` (que el mensaje no repita el valor) y el worker. A `trace`, que no aparezca ni el estado de pago, ni un nombre, ni un correo, ni un cursor.
7. **Alta de alumno:** dos altas a la vez con el mismo correo (una `201`, la otra `409`, ningún `500`). El correo de una cuenta dada de baja da `409`. Correo con mayúsculas y espacios. La temporal no aparece en los logs, y `no-store` va también en el `409`, si aplica.
8. **Lote de estado de pago:** 100 ids con uno del admin, de un maestro o inexistente → `400` sin escribir ninguna fila. Alumnos dados de baja o restringidos: el plan no lo prohíbe; confirma que es coherente y que `fecha_estado_pago` solo cambia en las filas que cambian.
9. **Movimientos y resumen:** el cursor de un movimiento borrado con su clase (borrado definitivo de 01b) → `400`; el actor maestro o el alumno dados de baja; ni estado de pago ni restricción en ninguna clave. En el resumen, las inactivas y las archivadas no cuentan; `HEAD`.
10. **Autorización de las cuentas raras:** un maestro con `acceso_restringido` en la base (no debería existir), una cuenta inactiva con un token de acceso vivo y el admin con su propio `PUT …/acceso` (`409 NO_ES_ALUMNO`).
11. **Fragilidad con carga (N-01e-3):** si alguna corrida tuya ve vencer un `beforeAll` de las pruebas de 01e, anótalo con la hora y el estado de batería, sin contarlo como hallazgo de código.

## Verificación de la corrección de la ronda 1 — ADMIN-01e

Veredicto: **ACEPTADO.** T-01 está corregido en el esquema: `q` con el carácter nulo da `400 VALIDACION` y ya no llega a PostgreSQL. Las cifras coinciden, los hermanos y los estados vecinos que lista el programador coinciden con el código, y no hay hallazgos nuevos.

Tester: `reporte-tester.md` = `e458d5b1075c2b086a865aad4e2fe1fab9cea4f93f4524c9c1273ee20c270ce5`, "## Ronda 1 — ADMIN-01e" (línea 5054). Resumen: `resumen-programador.md` = `ff4aea309dce459d278ebb238070e18dc7c42c11e1ace16e9bb9331ae3d51a21`, "## ADMIN-01e — Corrección ronda 1 (2026-11-09)" (línea 3100). Los dos, comprobados. Plan sin cambios (`7018e1f3…`). `revision.md` partía de `5d7871ff…`, el hash que dejó el orquestador al aplicar N-01e-4 (registrado en `aprobacion.md`).

Entorno: sin otra copia ni otra suite (ningún proceso con `vitest` antes de cada corrida); Docker encendido; red `uacam5 2` autorizada hoy. **A batería:** `BatteryStatus` 1, del 66 % al 62 %. Se corrió igual y se declara. Una corrida después de otra, sin navegadores y sin tocar el árbol.

### Cifras: resumen contra mi corrida

| Qué | Resumen | Mi corrida |
|---|---|---|
| `shared`: `npm run lint` · `npm run build` | `All matched files use Prettier code style!` · exit 0 | **Igual**, exit 0 los dos |
| backend: `npm run lint` | exit 0 | **Igual** |
| frontend: `npm run lint` | — | exit 0 |
| Módulos de 01e (`modulos-01e.txt`, `4605cfa2…`, 70 rutas) más `usuarios-admin-01e-r1.ataque` y `logs-usuarios-01e-r1.ataque` | `Test Files 76 passed (76)` · `Tests 1051 passed (1051)` | **Igual**, a la primera (11:47:45, 104 s), sin `FAIL`. ADM-T1E01 en verde |
| Contención | 0 de `40P01`, `deadlock`, `could not serialize`, `too many clients` y "Error no controlado"; `P2028` 5, los deterministas | **Igual**: `P2028` 5 (`req-1`, `req-3`, `req-5`, `req-1m`, `req-20`); 0 "Error no controlado" (los cuatro de T-01 desaparecieron); 0 `500` |
| frontend: `errores-ch3-r2.ataque` | `Tests 85 passed (85)` | **Igual** |
| `npx vitest list` (los 12 archivos de 01e más los dos del tester) | 83 casos ADM-1E; ADM-1E02 con 8 | **Igual**: 83 y 8, más 18 ADM-T1E. El título nuevo coincide literalmente |
| SHA-256 de los dos archivos cambiados | `2b12cc14…` (`shared/src/usuarios-admin.ts`) y `30f4f20d…` (`usuarios-admin.integracion.test.ts`) | **Igual**. Son los únicos más nuevos que el reporte del tester |
| V-01 | — | 267 OK contra `b17af275…`, más las dos nuevas sin rastrear con los hashes del tester (`309b944a…`, 16 casos, y `9679a4e3…`, 2): **269**. El programador no tocó ninguna |
| Huella del árbol | — | `8190dfa1492f1210a516fc9cd5b1e4926b55e2d44f68b54fa9f9abd880cf67e6` (25 rastreados cambiados más 26 sin rastrear, con las dos `*.ataque` nuevas) |
| Caracteres invisibles | 0 en 25 archivos | 0 en los 51 archivos de los paquetes (controles C0 y C1 salvo `\t`, `\n` y `\r`; U+200B a U+200F, U+202A a U+202E, U+2028, U+2029, U+2066 a U+2069, U+2800, U+3164 y BOM) y en los tres `.md` del encargo. El nulo se construye con `String.fromCharCode(0)`, en `shared/src/usuarios-admin.ts:22` y en la prueba |

### Arbitraje 1: rechazar el nulo en el esquema de `q`

- **La premisa que corrigió el programador es correcta.** El buscador de candidatos no rechaza el nulo en su esquema: lo deja llegar a la base y traduce el `22021` en el adaptador (`adapters/db/maestros-de-clase.ts:126-130`, con `traducirErrorPrisma` de `adapters/db/errores.ts:44-55`). Rechazarlo en el esquema es mejor para `q`: es entrada inválida, y no llega a la base ni abre la transacción de la instantánea.
- **El prefijo `q:` se acepta.** Lo pone `validarParametros` en todo `VALIDACION` de un esquema; no es texto propio, y es el mismo formato que "cursor: no es válido" o "estadoPago: …" de esta misma ruta. El texto ("Los datos enviados tienen caracteres no permitidos.") ya existía en el backend, así que no es texto nuevo para la persona.
  - En 01f, esa consulta llega a `mensajeDeErrorDeConsulta`, que ante un `VALIDACION` muestra el texto fijo de la vista, así que la persona nunca lo lee.
  - Si llegara por `quitarRutaDelMensaje`, `q: ` es una ruta y "Los" empieza con mayúscula, así que no se come nada más.
- **`errores-ch3-r2.ataque` y el inventario lo cubren.** La regla estática de `shared/src` solo mira los literales que empiezan con "palabra:", y el literal nuevo no empieza así: ni el inventario ni la regla cambian, y la prueba sigue en verde (85). La del backend busca un nombre en camelCase pegado a dos puntos detrás de un prefijo: "Los datos…" no lo es.
- **El texto queda en dos lugares** (`adapters/db/errores.ts:54` y `shared/src/usuarios-admin.ts:55`). Es un detalle menor: `shared/` no puede importar del backend, y mover el del backend a `shared/` tocaría `errores.ts`, que no está en "Se toca". Queda para ESTADO §3 al cierre, con destino a un chore, si el orquestador lo cree útil.
- **La traducción del `22021` en `listarUsuarios` no hace falta como defensa en 01e.**
  - El único llamador es el handler, que valida antes con el esquema.
  - Después del esquema, nada del término puede producir un `22021`. El nulo era el único carácter que PostgreSQL no admite en un texto UTF-8. Los demás controles pasan y dan `200` (los cubre ADM-T1E02). Los bytes que no son UTF-8 llegan como U+FFFD y dan `200` o `400` (dos URL de ADM-T1E01).
  - `cursorNombre` no va al SQL, y `cursor`, `rol` y `estadoPago` están tipados.
  - Un `22021` que apareciera ahí sería un error inesperado, y el `500` es la respuesta correcta para lo inesperado.
  - Si en 01f o 01g otra ruta reutiliza `listarUsuarios` sin el esquema, la traducción se agrega en ese momento. Lo anoto como vigilancia para el arquitecto, sin cambio ahora.

### Arbitraje 2: hermanos y estados vecinos, contra el código

- **Hermanos (cada texto de 01e que llega a la base):** la tabla del resumen coincide con el código fila por fila.
  - `nombre`: `nombreSchema` rechaza los caracteres de `CARACTERES_NO_PERMITIDOS_EN_NOMBRE` (`shared/src/auth.ts:45-48`), y ADM-1E04 prueba `"Ana\u0000Ruiz"`.
  - `email`: `correoSchema`; además, `crearAlumnoConTemporal` traduce con `traducirErrorPrisma`.
  - `motivo`: `textoLargoSchema(Number.POSITIVE_INFINITY)`, y ADM-1E09 prueba `\u0000`.
  - `cursorNombre`: se compara en JavaScript (`gestion-de-usuarios.ts:128`) y nunca entra al SQL.
  - `cursor`, `alumnoIds` e `id` son UUID; `rol` y `estadoPago`, `z.enum`.
  - Solo `q` necesitaba el remedio. Coincide con el barrido del tester.
- **Estados vecinos (cada forma en que llega `q`):** todas pasan por el mismo esquema antes de `core/` y del adaptador.
  - El caso nuevo recorre siete: nulo al final, al principio y en medio; con `rol`; con `rol` y `estadoPago`; en la página 2 con `cursor` y `cursorNombre` válidos; y solo nulos (que antes habría caído en `BUSQUEDA_MUY_CORTA` o en la base).
  - Con el `return` después del mensaje de longitud, un término largo y con nulo da un solo mensaje, el de longitud.
  - El `HEAD` usa la misma validación.
  - Los buscadores de fuera de 01e siguen traduciendo en su adaptador; no se tocan, y es correcto.
- **Mutación:** con la condición anulada, caen el caso nuevo y ADM-T1E01 (`2 failed`), según el resumen. Lo confirma la lectura: los dos dependen solo de esa regla.

### OA-01e-r1-1 (decisión del humano)

"Aceptarla y anotarla": quitar al único maestro activo de una clase activa, dejándola solo con uno dado de baja, es la segunda vía de N-14. Va con N-14 en A-01 y A-03 al cierre, sin cambio en el código. ADM-T1E12 la deja documentada en verde. Ya no es un punto de ataque.

### No bloquean

- Siguen en pie N-01e-1 (`q` vacío en 01f y 01g), N-01e-2 (`personas.maestro` sin la marca) y N-01e-3 (los `beforeAll` frágiles a batería; esta vez no vencieron). N-01e-4 quedó aplicado por el orquestador.
- **Para 01f (del reporte del tester):** los mensajes de zod en inglés en campos técnicos (`rol`, `estadoPago`, `cursor`, `limite`, `activo` y `restringido`), y "Escribe tu nombre completo" en el alta que hace el admin. Las vistas de 01f los tratan como `VALIDACION` fuera de contrato o pintan su propio texto. Nota para el inventario del arquitecto, sin cambio en 01e.

### Puntos de ataque para la ronda 2 de 01e

1. **El remedio de T-01 y sus vecinos en `q`:** el nulo en cada posición y en cada forma de codificarlo en la URL (`%00`, y `+` o `%20` junto a él); el nulo junto con el tope crudo (1000 y 1001 puntos de código; debe salir un solo mensaje, el de longitud) y con 120 y 121 normalizados; `q` repetido con un nulo en una de las copias; el `HEAD` con nulo. Busca un `500`, un "Error no controlado" o dos mensajes a la vez.
2. **Lo que el esquema deja pasar hacia la base:** los demás controles C0 y C1 (`\u0001` a `\u001f`, `\u007f` a `\u009f`), los inversores y los separadores de línea dentro de `q`. Deben dar `200` con su búsqueda literal o un `400` legible, nunca `500`. Bytes que no son UTF-8 y sustitutos sueltos (`%ED%A0%80`, `%C0%80`, `%FF`), en `q` y en `cursorNombre`.
3. **El resto de las entradas de texto de 01e con el nulo, en una tormenta:** `nombre` (editar y alta), `email` del alta, `motivo`, `cursorNombre` (debe dar `400` "cursor: no es válido"), y los parámetros de ruta y de consulta con el nulo donde se espera un UUID o un enum. Nada da `500` y nada queda escrito.
4. **Regresión de la ronda 1:** ADM-T1E01 a ADM-T1E18 siguen en verde, sin "Error no controlado" en la corrida de módulos, y con la contención en sus números de siempre (los cinco `P2028` deterministas).
5. **El log con el `400` nuevo:** con `LOG_LEVEL=trace`, la petición con `q` y nulo (y el resto de la consulta cargada: estado de pago, nombre, correo y cursor) deja `req.url` sin consulta, y ni el `err` ni ninguna otra línea repiten el término ni el nulo.
6. **N-01e-3:** si vence un `beforeAll`, anótalo con la hora y el estado de batería, sin contarlo como hallazgo de código.

Fuera de ataque, por decisión del humano: OA-01e-r1-1 (segunda vía de N-14).

## Revisión final — ADMIN-01e

Fecha: 2026-11-09. Plan: `plan.md` = `7018e1f321364350554c1a2fdd2cd2e5f0c54ea18c3586ce8c62a1ad2b4e97cf` (Enmiendas 1 a 13), comprobado. Tester: `reporte-tester.md` = `882e2fdeca7ab65b56672067ba2499ead0674f9155b29e9c0b9bd1bc5b3c3e1b`, "## Ronda 2 — ADMIN-01e" (línea 5202), **RESISTE**. Programador: `resumen-programador.md` = `ff4aea30…`, "## ADMIN-01e — Corrección ronda 1" (línea 3100). Base de "No se toca" dentro de los paquetes: `ea718bc`.

Veredicto: **APROBADO**
Verificación propia: lint exit 0 en los tres paquetes · test backend `Tests 3042 passed (3042)` · `Test Files 275 passed (275)`, frontend `Tests 6859 passed (6859)` · `Test Files 299 passed (299)`, las dos a la primera · build exit 0 en los tres paquetes (frontend `✓ built in 2.33s`) · deriva `No difference detected.`, exit 0

### Entorno y corridas

- **Trabajo en paralelo:** sin otra copia ni otra suite (respuesta del humano, por el orquestador). Antes de cada suite comprobé que ningún proceso corría `vitest`. Una suite después de otra: primero la del backend y después la del frontend, nunca a la vez.
- **PA-01:** red `uacam5 2`, perfil Privado, autorizada por el humano para hoy. Docker 28.5.1.
- **Energía:** a batería (`BatteryStatus` 1) del 54 % (12:03) al 51 % (12:09), durante `lint`, `build` y toda la suite del backend. Se corrió igual, como pide el humano, y se declara. Al terminar la del frontend (12:18), el equipo ya estaba conectado (`BatteryStatus` 2, 59 %). La CPU llegó al 97 % durante la suite del backend.
- **N-01e-3:** ningún `beforeAll` venció. La suite del backend no tiene "Hook timed out" ni casos saltados.
- **El árbol no cambió desde la verificación de la ronda 1**, salvo las dos `*.ataque` nuevas del tester de la ronda 2. `shared/src/usuarios-admin.ts` y `usuarios-admin.integracion.test.ts` conservan `2b12cc14…` y `30f4f20d…`. No toqué el código.

| Paquete | Comando | Tester (ronda 2) | Manager |
|---|---|---|---|
| shared | `npm run lint` · `npm run build` | — | exit 0 (`All matched files use Prettier code style!`) · exit 0 |
| backend | `npm run lint` · `npm run build` | lint exit 0 | exit 0 · exit 0 |
| backend | `npm test` (suite completa, la única de la subentrega) | módulos más sus 4 archivos: `Tests 1059 passed (1059)` · 78 | `Test Files 275 passed (275)` · `Tests 3042 passed (3042)`, a la primera (12:06:39 a 12:11:04, 248 s). `npx vitest list`: 3042 casos en 275 archivos; 83 `ADM-1E`, 18 `ADM-T1E`, 8 `ADM-T2E` (y 37 `ADM-1A` y 46 `ADM-1B`, sin cambio) |
| backend | PA-07 completa | módulos: 0/0/0/0 · 0 · 5 | limpia, con control positivo (abajo) |
| backend | deriva y `migrate status` | — | `19 migrations found` · `Database schema is up to date!`; `npx prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --exit-code`: `No difference detected.`, exit 0 (no propone borrar los índices parciales ni los `CHECK` de 01a y 01b) |
| frontend | `npm run lint` · `npm run build` | — | exit 0 · `✓ built in 2.33s` |
| frontend | `npm run test` (suite completa) | — | `Test Files 299 passed (299)` · `Tests 6859 passed (6859)`, a la primera (12:11:16, 322 s). Igual que al cierre de 01d2: 01e no toca el frontend, y lo que comparte por `shared/` (la marca opcional de S-16) no cambia ningún doble |

**Cuadre con 01b**, la última subentrega que cerró el backend (2933 casos en 258 archivos; 01c, 01d1 y 01d2 no tocaron el backend):
- **17 archivos nuevos** (275 − 258): 13 del programador (5 de `core/usuarios`, `logger-sin-consulta` y 7 de integración) y 4 del tester (`usuarios-admin-01e-r1` y `-r2`, `logs-usuarios-01e-r1` y `-r2`).
- **109 casos nuevos** (3042 − 2933): 83 `ADM-1E` del programador y 26 del tester (16 + 2 + 6 + 2). La lista cerrada y los C-n no suman casos. Cuadra exacto.

### PA-07 sobre la suite completa del backend
Comando: `npm test`, desde `backend/`, con la salida completa en un archivo. Atribuí por `requestId` dentro de cada app (pid).
- **Conteo por término:** `40P01` 0 · `deadlock detected` 0 · `could not serialize` 0 · `too many clients` 0 · `"Error no controlado"` 10 · `"code":"P2028"` 5.
- **Control positivo:** están los tres `P2028` deterministas de `servicio-ocupado.integracion`, en nivel 40 y en la misma app (pid 7856):
  - `POST /api/auth/cambiar-contrasena`: `tx.sesion.findFirst()` (`usuarios.ts:293`).
  - `POST /api/auth/refrescar`: `tx.sesion.updateMany()` (`sesiones.ts:72`).
  - `POST /api/clases/:claseId/publicaciones/:publicacionId/comentarios`: `$queryRawUnsafe` de `encolar` (`adapters/queue/index.ts:63`).
- **Los otros dos `P2028`** son los permitidos de `cuentas-r3.ataque` (pid 22664): `POST /api/auth/login`, con `tx.sesion.create()` (`sesiones.ts:39`), y `POST /api/auth/restablecer`, con `tx.tokenCuenta.updateMany()` (`tokens-cuenta.ts:119`). Esta línea se movió tres por M-18; la llamada es la misma. Ninguno es de `maxWait`.
- **Inventario:** los 10 "Error no controlado" son los mismos del cierre de 01a y de 01b, por ruta y llamada:
  - 5 "fallo simulado de la base en la búsqueda" (`POST /api/auth/login`, `handlers/auth/index.ts:125`);
  - 1 "fallo simulado de la base al crear la sesión" (`:134`);
  - 3 `ZodError` de la URL del almacén (`handlers/archivos.ts:62` y `:97`, y `handlers/clases/muro.ts:87`);
  - 1 "boom" (`GET /api/prueba/error-comun`).
  - Ninguno sale de una ruta de 01e. Los cuatro de T-01 desaparecieron.

**PA-07 limpia.**

### Problemas que bloquean
Ninguno.

### (a) 01e contra su parte del plan: cumple
Revisé `git diff ea718bc` y los archivos nuevos contra los pasos 20 a 25. **Se hizo lo planeado, solo lo planeado y todo lo planeado.** El detalle, archivo por archivo, está en mis tres verificaciones de 01e (líneas 5698, 5812 y 5876). El código de producción solo cambió después de ellas por lo que verifiqué en cada una: M-14 (prueba), el tope del motivo y T-01, los dos en `shared/src/usuarios-admin.ts`.
- **Pasos 20 a 25:**
  - `shared/src/usuarios-admin.ts` con los esquemas de §Cambios (`cursorNombre`, `siguienteCursorNombre`, el lote sin repetidos y el motivo de S-10, ya sin tope crudo);
  - `core/usuarios/` (baja, acceso, búsqueda, textos y fila), cada uno con su prueba;
  - la migración;
  - `gestion-de-usuarios.ts`, `movimientos.ts`, M-18, N-03 y S-16;
  - las nueve rutas en `handlers/admin/usuarios.ts`, registradas por `admin.ts` (OA-01e-1);
  - ADM-1E01 a 1E22 (83 casos) y la lista cerrada.
- **§D-7 y §D-8:**
  - **Rutas:** las nueve con `protegido({ roles: ["admin"] })` y parámetro `:id`; ningún handler compara roles ni estados.
  - **Lista de usuarios:** SQL crudo parametrizado con los comodines escapados, en una instantánea única. El cursor va con su posición (`cursorNombre`). El nulo de `q` se rechaza en el esquema (T-01).
  - **Baja:** protocolo de bloqueo (PB), el orden de guardas arbitrado y la revocación de sesiones y enlaces con `UPDATE`.
  - **Alta:** con la temporal y `no-store`.
  - **Lote de estado de pago:** `ORDER BY id FOR NO KEY UPDATE` y `400` sin escribir.
  - **Acceso:** PB y revocación al restringir.
  - **Resumen:** tres `COUNT` en una instantánea.
  - **Movimientos:** sin filtros, por `secuencia DESC`, con la firma "Administración".
- **S-16, N-03, M-18 y M-09:** aplicados y verificados con sus hermanos (líneas 5767 a 5773). La marca `cuentaDesactivada` sale solo en el maestro inactivo. Asignar y crear bloquean a los maestros en el orden sin ciclo de §D-7.9. El token relee `activo` bajo el bloqueo. El log registra la ruta sin la consulta (`config/logger.ts`, solo `serializers.req`: 23 líneas de diff, sin tocar `redact` ni `level`).
- **Enmienda 13:** C-42 se aplicó tal cual y está en verde. La vigilada `gestion-02a-r1.ataque:269` sigue igual.
- **Migración `20261109150104_admin_01_usuarios_y_movimientos`:**
  - Cuatro índices: GIN `gin_trgm_ops` de `email`, `(nombre_busqueda, id)`, `(rol, nombre_busqueda, id)` y `movimientos_inscripcion (secuencia DESC)`. Son exactamente los del plan, línea 660, con el SQL que confirmó el humano (en otro orden, aceptado por el orquestador).
  - **Compatible hacia atrás:** solo índices. Revertir el código no rompe la base.
  - Su comentario del esquema está al día (A-09).
- **Lista cerrada y vigiladas:** entre las pruebas normales existentes solo cambian PR-B16g y PR-B16h (`movimientos-inscripcion.integracion`) y E6 (`bloqueo-usuario.integracion`). Todas las vigiladas de §D-R0 01e pasan en la suite completa.

**Reglas que no se rompen:**
- **Capas.** `core/usuarios/` es puro: solo importa `AppError`, tipos de `shared/` y `core/clases/busqueda.ts`. Prisma vive solo en `adapters/db`. Los handlers validan, llaman y serializan.
- **Middleware.** Ninguna verificación de rol a mano. Ninguna ruta de 01e es pública ni lleva `:claseId`.
- **Estado de pago.** Viaja solo en las filas de estudiantes y solo para el admin. ADM-1E14, ADM-1E15, ADM-T1E y ADM-T2E lo comprueban también en los `403` y en el log.
- **Consultas sanas.** Ninguna consulta dentro de un ciclo. Todas las lecturas van por índice (los cuatro nuevos más los de siempre). Las listas paginan de 1 a 100. El SQL crudo va con plantilla parametrizada.
- **Cola.** 01e no encola nada: ni correos ni avisos.
- **Archivos.** No se tocan.
- **UTC.** Las fechas van en ISO.
- **Secretos.** La temporal no aparece en los logs (ADM-1E07 y ADM-T1E).
- **Autenticación.** La temporal se guarda con argon2id y obliga a cambiarla. La baja revoca sesiones y enlaces. M-18 cierra el uso de un enlace bajo una baja concurrente.
- **`infra/`, `.env.example`, proveedores y `notifier`:** sin cambios.

**Estilo de `CLAUDE.md`:** usa retornos tempranos. `core/` y `adapters/` lanzan `AppError`. Los errores de Prisma se traducen solo en `adapters/db`. No hay `?? []` en producción. Los detalles menores de la verificación del resumen (dos tipos de estado de pago escritos a mano, un texto repetido, un tipo en línea en el handler) no cambian el veredicto.

**Definición de terminado:**
- Cumple RF-51, RF-54 y RF-55, y la parte de RF-52 y RN-04 que toca a 01e.
- Respeta capas y middleware.
- `lint`, `test` y `build` están en verde en los tres paquetes.
- Tiene pruebas de autorización para las nueve rutas y sus `HEAD` (ADM-1E14).
- La migración es compatible.
- `infra/` y `.env.example` no aplican.
- Los README de A-06 y los comentarios de A-09 están al día. Lo demás es del cierre del encargo.

### (b) T-01 de la ronda 1: cerrado
- **T-01 (media):** `q` con el carácter nulo daba `500` (PostgreSQL `22021`).
  - **Corregido** en el esquema: `400 VALIDACION` "q: Los datos enviados tienen caracteres no permitidos.", sin texto nuevo. Los arbitrajes están en la línea 5900.
  - La ronda 2 lo confirmó en quince URL, cada una también en `HEAD`, con los bordes de 120 y 1000, en la página 2 y con los demás controles. También probó el nulo en las dieciséis entradas restantes de 01e: todas dan `400`, sin `500` y sin fugas en el log.
  - En la suite completa no hay ningún "Error no controlado" de `GET /api/admin/usuarios`.
- **OA-01e-r1-1:** el humano decidió "Aceptarla y anotarla" (va a A-01 y A-03, abajo).

### (c) V-01: 271 `*.ataque`, ninguna tocada por el programador
- Las 267 rastreadas coinciden con la lista de la ronda 0 de 01e (`b17af275…`, `sha256sum -c` sin diferencias). Contra `ea718bc` solo cambian las 11 de los C-n (C-6 a C-8, C-25 a C-32 y C-42), con los hashes de la ronda 0.
- Las cuatro nuevas, sin rastrear y del tester, coinciden con sus hashes:
  - `usuarios-admin-01e-r1` `309b944a…` (16 casos);
  - `logs-usuarios-01e-r1` `9679a4e3…` (2);
  - `usuarios-admin-01e-r2` `f7cc197f…` (6);
  - `logs-usuarios-01e-r2` `8b08c0e6…` (2).
- **Total: 271.** No se borró ni se saltó ninguna: la suite completa no tiene casos `skip` ni `todo`.
- **Caracteres invisibles:** 0 en los 53 archivos de los paquetes y en los cinco `.md` del encargo (controles C0 y C1 salvo `\t`, `\n` y `\r`; U+200B a U+200F, U+202A a U+202E, U+2028, U+2029, U+2066 a U+2069, U+2800, U+3164 y BOM).
- **"No se toca":** limpio contra `ea718bc`.
  - Fuera de los paquetes, solo cambia `docs/trabajo/ADMIN-01-administracion/`. `docs/trabajo/DEPLOY-investigacion-vps.md` es ajeno.
  - `config/logger.ts` cambia solo en `serializers.req`.
  - `handlers/admin.ts` solo suma el `register`.
  - `inscripciones.ts` solo toca `listarPersonas`.
  - Fuera de los paquetes nada más cambió (`infra/`, `AGENTS.md`, `CLAUDE.md`, `docs/ESTADO.md` y los demás `docs/`).

### (d) Lo abierto, con destino

| Id | Qué | Destino |
|---|---|---|
| OA-01e-r1-1 | Quitar al único maestro activo de una clase activa la deja solo con uno dado de baja (segunda vía de N-14) | **A-01 y A-03 al cierre del encargo**, junto a N-14, como decisión del humano ("Aceptarla y anotarla", 2026-11-09). Sin cambio de código |
| N-01e-1 | `GET /admin/usuarios?q=` vacío responde `400 BUSQUEDA_MUY_CORTA` | **Arquitecto, inventario de 01f y 01g:** las tablas omiten `q` cuando el buscador está vacío |
| N-01e-2 | El campo de compatibilidad `personas.maestro` no lleva `cuentaDesactivada` | **01f:** las vistas leen `maestros`. El retiro de `maestro` ya está en la fila de ESTADO §3 del retiro de compatibilidad de CLASES-02 |
| (ronda 1 del tester) | Mensajes de zod en inglés en campos técnicos (`rol`, `estadoPago`, `cursor`, `limite`, `activo` y `restringido`), y "Escribe tu nombre completo" en el alta que hace el admin | **Arquitecto, inventario de 01f:** `VALIDACION` fuera de contrato, o texto propio de la vista |
| (arbitraje de la ronda 1) | Si 01f o 01g reutilizan `listarUsuarios` sin `listaUsuariosConsultaSchema`, el `22021` volvería a dar `500` | **Arquitecto de 01f y 01g**, como vigilancia: agregar la traducción en el adaptador en ese momento |
| N-01e-3 | Dos `beforeAll` de 01e vencieron sus 10 s una vez, a batería y con carga (en la verificación de la corrección; no se repitió en ninguna corrida después, tampoco en la suite completa) | **Fila de ESTADO §3 al cierre**, junto a la de las pruebas frágiles con carga de 01d2 (chore de pruebas): `timeout` explícito en el `beforeAll` si vuelve a pasar |
| O-R1-1 | Una clase archivada con 0 maestros daría `500` por `min(1)` en `GET /clases/anteriores` y en `conMaestroPrincipal` | **Fila de ESTADO §3 al cierre (riesgo con destino).** Hoy no se alcanza por la API (ADM-T1E14). Destino: el encargo que permita borrar cuentas o asignaciones sin pasar por la regla de 1 a 2 maestros |
| N-32 | Unas 30 líneas duplicadas entre `adapters/db/clases.ts` y `duplicado-de-clase.ts` | **Carril trivial al cierre de ADMIN-01**, como indicó el orquestador. Sin cambio de comportamiento |
| (detalles menores de 01e) | `"al_corriente" \| "deudor"` escrito a mano dos veces; "No hay ninguna cuenta con ese identificador." repetido en `handlers/admin.ts:64` y `core/usuarios/textos.ts`; "Los datos enviados tienen caracteres no permitidos." en `adapters/db/errores.ts:54` y en `shared/src/usuarios-admin.ts:55`; el texto de "dar de baja" ante `activo: true` del admin; un tipo en línea en el handler de la lista | **Con N-32, en el mismo carril trivial al cierre**, o en un chore si el orquestador prefiere. Ninguno cambia comportamiento |
| R-06 de CLASES-02 (ESTADO §3) | "Al agregar la baja de usuarios… revisar la validación de maestros al crear una clase" | **Se cierra:** "Hecho en ADMIN-01e (§D-7.9, N-03; ADM-1E12 y ADM-1E18)". El orquestador la marca al actualizar ESTADO |
| O-04 de CLASES-02a (ESTADO §3) | La consulta de la URL en el log | **Se cierra con M-09** (A-07 bis del plan): "Hecho en ADMIN-01e: el logger registra la ruta sin la consulta" |
| A-07 bis y A-01/A-02 | Filas y anotaciones que el plan ya fija para 01e: retiro de `POST /admin/usuarios/buscar`, R-16 y R-17 (desde 01e el caso (a) es alcanzable), R-19, logs sin consulta en ESSENTIALS y `ARCHITECTURE.md` §17, y el contrato del cursor con posición | **Al cierre del encargo**, como dice el plan |
| (ronda 1 del tester) | La petición abortada no tiene prueba propia (`inject` no corta el socket) | **Aceptado, sin fila:** el serializador es el mismo para toda línea con `req`, y lo cubrió la sonda M-09 de la ronda 0 |

### (e) Medición para ESTADO §6

- **Rondas del tester:** 2, de ellas 1 extra, más la ronda 0 (los C-n de la Enmienda 13 y de §D-R0, sin PARADA).
  - Ronda 1: ROTO (T-01, media).
  - Ronda 2: RESISTE.
- **Ronda extra atribuible al programador: 1, por un defecto propio, no por hermanos.** T-01 (un término libre que llega a SQL crudo sin rechazar el nulo ni traducir el `22021`) no aplicó el precedente del buscador de candidatos. No es hermano ni estado vecino del remedio de un hallazgo anterior. **Rondas extra por hermanos o estados vecinos: 0.** No se alcanza el umbral, y el programador ya usa `opus`.
- **PARADAS: 1,** la prevista por el plan antes de `prisma migrate dev` (paso 22), con la confirmación del humano.
- **Resúmenes del programador devueltos: 1 de 3.**
  - La implementación, por M-14: `core/usuarios/fila.ts` sin prueba unitaria.
  - La corrección de la verificación y la corrección de la ronda 1, aceptadas.
- **Decisiones del humano: 3.** La migración ("Autorizo"), el tope del motivo ("Quitarlo") y OA-01e-r1-1 ("Aceptarla y anotarla"). **Del orquestador: 1,** el orden distinto de las cuatro sentencias de la migración.
- **Plan:** una enmienda (13, O-3), aprobada sin M-n antes de la ronda 0.
- **Arbitrajes del manager:**
  - Cuatro en la verificación del resumen: el tope del motivo, `q` en ADM-1E22, `fila.ts` y el orden de guardas.
  - Uno en la corrección: el tope de `q` se queda.
  - Dos en la ronda 1: el nulo en el esquema con el prefijo `q:`, y los hermanos.
- **Interrupciones:** ninguna. Casi todo el día a batería, por instrucción del humano (al terminar esta revisión ya estaba conectado). En una corrida de verificación, dos `beforeAll` vencieron por carga (N-01e-3) y la repetición pasó. El orquestador reemplazó ocho U+202E literales en dos `.md` (N-01e-4).

### (f) Bloque de commit de 01e

**46 entradas de `git add`, que cubren 58 archivos.** Las cotejé por programa: `git add -n` con estas entradas lista exactamente 58 rutas, y `comm` contra `git status --porcelain --untracked-files=all` (59 líneas) solo deja fuera `docs/trabajo/DEPLOY-investigacion-vps.md`, que es ajeno.
- **shared (3):** `src/clases.ts`, `src/index.ts`, `src/usuarios-admin.ts`.
- **backend, esquema y migración (2 entradas, 2 archivos):** `prisma/schema.prisma` y la carpeta `prisma/migrations/20261109150104_admin_01_usuarios_y_movimientos/` (`migration.sql`).
- **backend, producción (13 entradas, 18 archivos):**
  - `src/adapters/README.md`;
  - `src/adapters/db/`: `clases.ts`, `gestion-de-usuarios.ts`, `index.ts`, `inscripciones.ts`, `maestros-de-clase.ts`, `movimientos.ts` y `tokens-cuenta.ts`;
  - `src/config/logger.ts`;
  - la carpeta `src/core/usuarios/`, con los cinco módulos y sus cinco pruebas: 10 archivos en una entrada;
  - `src/handlers/README.md`, `src/handlers/admin.ts` y la carpeta `src/handlers/admin/` (`usuarios.ts`).
- **backend, pruebas del programador (12):** `src/config/logger-sin-consulta.test.ts`, `test/ayudas-usuarios-admin.ts`, `test/logs-usuarios-admin.integracion.test.ts`, los seis `test/usuarios-admin*.integracion.test.ts`, y la lista cerrada (`test/bloqueo-usuario.integracion.test.ts` y `test/movimientos-inscripcion.integracion.test.ts`). Las de `core/usuarios` van en su carpeta.
- **backend, `*.ataque` del tester (15):**
  - las 11 de los C-n: `api-real`, `gestion-02a-r1`, `lecturas-fx-r1`, `logs-03a-r1`, `logs-03b-r1`, `logs-03c-r1`, `logs-cuentas-r1`, `logs-muro-c-r1`, `logs-muro-c-r2`, `logs-r2` y `sesiones-y-cadena`;
  - las 4 nuevas: `usuarios-admin-01e-r1`, `usuarios-admin-01e-r2`, `logs-usuarios-01e-r1` y `logs-usuarios-01e-r2`.
- **docs (1 entrada, 5 archivos):** `docs/trabajo/ADMIN-01-administracion/` (`aprobacion.md`, `plan.md` con la Enmienda 13, `reporte-tester.md`, `resumen-programador.md` y `revision.md`).

`docs/ESTADO.md` no cambió desde `ea718bc`, así que no entra. Si el orquestador lo actualiza antes del commit, se suma.

```
git status
git add docs/trabajo/ADMIN-01-administracion/ shared/src/clases.ts shared/src/index.ts shared/src/usuarios-admin.ts backend/prisma/schema.prisma backend/prisma/migrations/20261109150104_admin_01_usuarios_y_movimientos/ backend/src/adapters/README.md backend/src/adapters/db/clases.ts backend/src/adapters/db/gestion-de-usuarios.ts backend/src/adapters/db/index.ts backend/src/adapters/db/inscripciones.ts backend/src/adapters/db/maestros-de-clase.ts backend/src/adapters/db/movimientos.ts backend/src/adapters/db/tokens-cuenta.ts backend/src/config/logger.ts backend/src/config/logger-sin-consulta.test.ts backend/src/core/usuarios/ backend/src/handlers/README.md backend/src/handlers/admin.ts backend/src/handlers/admin/ backend/test/ayudas-usuarios-admin.ts backend/test/bloqueo-usuario.integracion.test.ts backend/test/movimientos-inscripcion.integracion.test.ts backend/test/logs-usuarios-admin.integracion.test.ts backend/test/usuarios-admin.integracion.test.ts backend/test/usuarios-admin-autorizacion.integracion.test.ts backend/test/usuarios-admin-baja.integracion.test.ts backend/test/usuarios-admin-migracion.integracion.test.ts backend/test/usuarios-admin-pago-acceso.integracion.test.ts backend/test/usuarios-admin-resumen-movimientos.integracion.test.ts backend/test/api-real.ataque.test.ts backend/test/gestion-02a-r1.ataque.test.ts backend/test/lecturas-fx-r1.ataque.test.ts backend/test/logs-03a-r1.ataque.test.ts backend/test/logs-03b-r1.ataque.test.ts backend/test/logs-03c-r1.ataque.test.ts backend/test/logs-cuentas-r1.ataque.test.ts backend/test/logs-muro-c-r1.ataque.test.ts backend/test/logs-muro-c-r2.ataque.test.ts backend/test/logs-r2.ataque.test.ts backend/test/sesiones-y-cadena.ataque.test.ts backend/test/logs-usuarios-01e-r1.ataque.test.ts backend/test/logs-usuarios-01e-r2.ataque.test.ts backend/test/usuarios-admin-01e-r1.ataque.test.ts backend/test/usuarios-admin-01e-r2.ataque.test.ts
git commit -m "ADMIN-01e, gestión de usuarios del administrador: lista, ficha, baja y reactivación, alta de alumno, estado de pago por lote, acceso, resumen y movimientos (shared y backend)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

Después del `git add`, `git status` no debe mostrar nada sin preparar ni sin rastrear, salvo `docs/trabajo/DEPLOY-investigacion-vps.md`.

### Problemas que no bloquean
Ninguno nuevo. Lo abierto está en la tabla de (d), con su destino.

### Detalles menores
Los de la verificación del resumen, en la tabla de (d) (fila "detalles menores de 01e"). No cambian el veredicto.

### Desacuerdos arbitrados
- **Verificación del resumen:** el tope del motivo (lo decidió el humano: "Quitarlo"), `q` en ADM-1E22, `core/usuarios/fila.ts` y el orden de guardas de la baja.
- **Corrección de la verificación:** el tope crudo de `q` se queda.
- **Corrección de la ronda 1:** el nulo se rechaza en el esquema de `q`, con el prefijo `q:` y sin traducir el `22021` en el adaptador; y los hermanos.

Ninguno queda abierto, y en esta revisión no hay ninguno nuevo.

### Documentos a actualizar
- **`docs/ESTADO.md`, por el orquestador:** §3, con las filas y los cierres de (d) (R-06 de CLASES-02 y O-04 de CLASES-02a cerrados; N-01e-3 y O-R1-1 nuevas), y §6, con la medición de (e).
- **Al cierre del encargo:** A-01 y A-03, con la segunda vía de N-14 (OA-01e-r1-1); A-01 y A-02, con los logs sin consulta y el contrato del cursor con posición; A-07 bis, como fija el plan. Los README (A-06) y el comentario del esquema (A-09) ya están al día.
- **Carril trivial al cierre:** N-32, con los detalles menores de 01e.

### Para el humano
- **Nada que decidir para cerrar 01e.** Tus tres decisiones (migración, tope del motivo y OA-01e-r1-1) están aplicadas o tienen destino.
- 01e no tiene interfaz: lo que se ve en un navegador llega con 01f y 01g, y su comprobación humana es la de 01g (H-5 a H-7).

### Veredicto
**APROBADO.** 01e cumple su parte del plan `7018e1f3…`: los pasos 20 a 25, §D-7, §D-8, S-16, N-03, M-18, M-09, la Enmienda 13, ADM-1E01 a 1E22 (83 casos) y la migración de solo índices, sin deriva. Además:
- M-14 y T-01 están cerrados, y la ronda 2 resistió.
- PA-07 está limpia, con control positivo e inventario sin cambios.
- V-01 da 271, y el programador no tocó ninguna `*.ataque`.
- "No se toca" está limpio.
- Mis suites completas dan backend 3042/3042 en 275 archivos y frontend 6859/6859 en 299, las dos a la primera, con `lint`, `build` y deriva en verde.
- Todo lo abierto tiene destino.

### Resumen para el humano (15 líneas)
1. ADMIN-01e (la gestión de usuarios del administrador, solo `shared` y backend) está **APROBADA**.
2. Nueve rutas nuevas, solo para el admin: lista de usuarios con búsqueda y filtros, ficha, editar nombre, baja y reactivación, alta de alumno con contraseña temporal, estado de pago por lote, restringir y restablecer acceso, resumen del panel y registro de altas y bajas.
3. Una baja revoca sesiones y enlaces. Un maestro con clases activas no se puede dar de baja. En las archivadas sale como «Cuenta desactivada».
4. La migración solo agrega cuatro índices (la autorizaste), y no hay deriva.
5. El log de la API ya no guarda la consulta de la URL: ni estado de pago, ni nombres, ni búsquedas.
6. Corregidos: M-14 (faltaba una prueba unitaria) y T-01 (el carácter nulo en la búsqueda daba error 500).
7. Aplicadas tus decisiones: sin tope crudo en el motivo, y la segunda vía de N-14 se anota al cierre.
8. La ronda 2 del tester resistió sin hallazgos.
9. Mis corridas completas: backend 3042/3042 (275 archivos) y frontend 6859/6859 (299), a la primera; `lint` y `build` en verde. El backend corrió a batería.
10. La contención del backend está limpia: solo los 5 bloqueos esperados y los 10 errores de prueba de siempre.
11. Las 271 pruebas de ataque coinciden con sus hashes, y el programador no tocó ninguna.
12. Medición: 2 rondas, 1 extra, por un defecto propio y no por hermanos; 1 PARADA (la migración, prevista); 1 de 3 resúmenes devuelto.
13. Pendientes con destino: notas para 01f y 01g, dos filas nuevas y dos cierres en ESTADO §3, y N-32 al carril trivial.
14. El commit lleva 46 entradas de `git add` (58 archivos), incluidas la migración, las cuatro pruebas nuevas del tester y la carpeta del encargo.
15. No entra `docs/trabajo/DEPLOY-investigacion-vps.md`, que es ajeno.
