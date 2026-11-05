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
| O-3 (ronda 0) | `gestion-02a-r1.ataque:693-734` exige las claves `["id", "nombre"]` en los maestros del detalle y, en 01e, S-16 suma `cuentaDesactivada` | **Antes de la ronda 0 de 01e**: no está en §D-R0 de 01e (que solo vigila `:268`). Hace falta una enmienda corta del arquitecto que la sume como C-n del tester, verificada por el manager. Si no, la ronda 0 de 01e o el programador chocan con ella (PARADA) |
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
