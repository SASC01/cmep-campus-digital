# Resumen del programador — FORO-01 · actividad tipo foro

Resúmenes verificables de cada subentrega y de cada corrección (`AGENTS.md`, "Resúmenes verificables del programador"). Plan aprobado: `plan.md`, SHA-256 `e899f7b5…` (Enmiendas 1 a 9). Rama `feat/foro-01-actividad-tipo-foro`, base `fd4a7ad`.

## Implementación — FORO-01a (2026-11-14)


Plan: `docs/trabajo/FORO-01-actividad-tipo-foro/plan.md` (SHA-256 `e899f7b5…`, Enmiendas 1 a 9; manda §E9 sobre §E8 y §E8 sobre §E7).
Pasos completados: 11 de 11 (§E7.11, 01a), con las dos PARADA de migración confirmadas por escrito por el humano.
Equipo: conectado a la corriente o sin dato de batería; no se detectó batería.

### 1. Las dos migraciones (FORO-1B07)

| Carpeta | SHA-256 de `migration.sql` | Confirmación del humano |
|---|---|---|
| `backend/prisma/migrations/20261114223913_foro_01_tipo_foro/` | `8ec418c582ffdbedd5e53590594f8394fb161f1f4f410178df430e2e50ee112e` | "Confirmo, aplícala" (sobre ese SHA) |
| `backend/prisma/migrations/20261114224719_foro_01_participaciones/` | `478c2e22081b4e1915a919c747cd538c73a1ae733b06e37d9226bb40d1b0db0f` | "Confirmo, aplícala" (sobre ese SHA) |

Antes de aplicar cada una se comprobó su SHA-256 con `sha256sum`: coincidía. Ninguna se tocó después de aplicarla.

- `npx prisma migrate dev` (primera; desde `backend/`), salida: `Applying migration \`20261114223913_foro_01_tipo_foro\`` / `The following migration(s) have been applied: …` / `Your database is now in sync with your schema.` Sin preguntas, sin deriva, sin propuesta de reinicio.
- `npx prisma migrate dev` (segunda), salida: `Applying migration \`20261114224719_foro_01_participaciones\`` / `The following migration(s) have been applied: …` / `Your database is now in sync with your schema.` Sin preguntas, sin deriva.
- `npx prisma validate`: `The schema at prisma\schema.prisma is valid 🚀`.
- `npx prisma generate`: `✔ Generated Prisma Client (7.10.0) to .\src\adapters\db\generated in 206ms`. (Prisma 7 no regenera el cliente al aplicar; se corrió aparte.)
- `npx prisma migrate status`: `21 migrations found in prisma/migrations` / `Database schema is up to date!`
- `npx prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --exit-code`: `No difference detected.`, código de salida 0. No propone borrar el índice único parcial ni tocar el CHECK: no hubo PARADA.

### 2. Archivos de 01a (`git status --short`, contra `fd4a7ad`)

Producción (19, como §E8.1):
- `shared/src/foros.ts` (nuevo), `shared/src/tareas.ts` (solo `export` en `idOpcionalSchema`), `shared/src/index.ts` (bloque `./foros.js` entre `./dudas.js` y `./errores.js`, e `idOpcionalSchema` en el bloque de `./tareas.js`).
- `backend/prisma/schema.prisma` y las dos carpetas de migración.
- `backend/src/core/actividades.ts` y `core/foros/participacion.ts` (nuevos), `core/tareas/tareas.ts`, `core/calificaciones/calificar.ts` y `core/clases/duplicado.ts` (solo la línea del tipo y su comentario).
- `backend/src/adapters/db/actividades.ts` y `adapters/db/foros.ts` (nuevos), `adapters/db/tareas.ts` (solo `leerTarea`/`leerTareaCon`, `crearTarea`, `editarTarea`, `borrarTarea`, y sus ayudas privadas `errorTareaNoEncontrada`, `asegurarReferencias` y `autorYPertenencia`), `adapters/db/entregas.ts`, `adapters/db/publicaciones.ts` (solo `crearPublicacion` y `listarPublicaciones`, más dos constantes privadas) y `adapters/db/index.ts` (bloque nuevo al final).
- `backend/src/handlers/foros.ts` (nuevo) y `backend/src/app.ts` (import y registro después de `calificacionesHandler`).

Pruebas nuevas (10) y una ayuda nueva:
- `backend/src/core/actividades.test.ts`, `backend/src/core/foros/participacion.test.ts`, `backend/src/core/clases/duplicado-con-foros.test.ts`.
- `backend/test/migracion-foro-01.integracion.test.ts`, `foros.integracion.test.ts`, `foros-participaciones.integracion.test.ts`, `foros-calificar.integracion.test.ts`, `foros-cierre-de-tareas.integracion.test.ts`, `foros-autorizacion.integracion.test.ts` y `foros-estatico.test.ts`.
- Ayuda nueva: `backend/test/ayudas-foros.ts` (§E7.5.0 la permite).

Prueba normal de la lista cerrada (1): `backend/test/clases-archivadas-matriz.integracion.test.ts` (las 16 filas y el comentario, tal cual §E7.5.1).
`*.ataque` de la ronda 0 (3, del tester, sin tocar): `backend/test/sesiones-y-cadena.ataque.test.ts`, `backend/test/lecturas-fx-r1.ataque.test.ts`, `frontend/src/lib/errores-ch3-r2.ataque.test.ts`.

Total: 19 + 10 + 1 + 3 = 33, más la ayuda `ayudas-foros.ts` = 34 archivos tocados (el plan estimó ~33; la ayuda es la diferencia).
Ningún archivo de "No se toca" cambió: `git status --short` no muestra nada en `middleware/`, `adapters/auth|notifier|queue`, `config/`, `workers/`, `infra/`, `.env.example`, `handlers/tareas/*`, `handlers/clases/*`, `adapters/db/duplicado-de-clase.ts` ni `frontend/src` de producción.

### 3. Matriz de rutas contra los casos de autorización (paso 11)

Cadena de todas (por construcción de `protegido()`): `authenticate → withProfile → withPasswordGate → withAccess → requireRole → requireMembership | requireOwnership → handler`. Ningún handler compara rol, relación ni autoría (FORO-1A51). Archivo de los casos: `backend/test/foros-autorizacion.integracion.test.ts` salvo donde se indica.

| # | Ruta | `protegido({…})` | Clase archivada |
|---|---|---|---|
| 1 | `POST /clases/:claseId/foros` | maestro, admin · propiedad | cerrada |
| 2 | `GET …/foros` | estudiante, maestro, admin · inscripcion | lectura |
| 3 | `GET …/foros/:foroId` | estudiante, maestro, admin · inscripcion | lectura |
| 4 | `PUT …/foros/:foroId` | maestro, admin · propiedad | cerrada |
| 5 | `DELETE …/foros/:foroId` | maestro, admin · propiedad | cerrada |
| 6 | `GET …/mi-participacion` | estudiante · inscripcion | lectura |
| 7 | `GET …/mi-participacion/devoluciones` | estudiante · inscripcion | lectura |
| 8 | `GET …/participaciones` | estudiante, maestro, admin · inscripcion | lectura |
| 9 | `POST …/participaciones` | estudiante · inscripcion | cerrada |
| 10 | `GET …/participaciones/:participacionId/replicas` | estudiante, maestro, admin · inscripcion | lectura |
| 11 | `POST …/participaciones/:participacionId/replicas` | estudiante, maestro · inscripcion | cerrada |
| 12 | `GET …/participantes` | maestro, admin · propiedad | lectura |
| 13 | `GET …/participantes/:alumnoId` | maestro, admin · propiedad | lectura |
| 14 | `GET …/participantes/:alumnoId/participaciones` | maestro, admin · propiedad | lectura |
| 15 | `GET …/participantes/:alumnoId/devoluciones` | maestro, admin · propiedad | lectura |
| 16 | `PUT …/participantes/:alumnoId/calificacion` | maestro · propiedad | cerrada |

Cada negativa, para las 16 rutas a la vez (cada caso recorre las 16):
- Sin sesión (401 `NO_AUTENTICADO`): "FORO-1A49: sin sesión, cada ruta responde 401 NO_AUTENTICADO".
- Rol incorrecto (403 `ROL_NO_PERMITIDO`, 16 combinaciones, incluido el admin en 11 y 16): "FORO-1A49: con un rol que la ruta no admite, 403 ROL_NO_PERMITIDO (el admin en 6, 7, 9, 11 y 16; el maestro en 6, 7 y 9; el alumno en las de gestión)".
- Clase ajena (403 `SIN_ACCESO_A_LA_CLASE`, maestro de otra clase y alumno no inscrito): "FORO-1A49: un maestro de otra clase y un alumno no inscrito reciben 403 SIN_ACCESO_A_LA_CLASE en cada ruta de su rol".
- Clase inexistente (igual que la ajena): "FORO-1A49: una clase inexistente responde lo mismo que una ajena (403 SIN_ACCESO_A_LA_CLASE)".
- Alumno restringido (403 `ACCESO_RESTRINGIDO`): "FORO-1A49: un alumno inscrito con acceso restringido recibe 403 ACCESO_RESTRINGIDO en las 16 rutas (RN-09)".
- Estado de pago y demás campos (llaves exactas, a toda profundidad, con el alumno deudor, para los tres roles): "FORO-1A50: las 16 rutas, con éxito y con error, para el alumno, el maestro y el admin". Las llaves exactas del detalle: "FORO-1A20: el maestro y el admin crean un foro: 201 con el detalle, sin requiereAdjuntos, trabajo, rol ni correos" (`foros.integracion.test.ts`).
- Clase archivada, escrituras (409 al rol admitido, 403 al otro, nada escrito): "FORO-1B01: en una clase archivada, cada escritura responde 409 CLASE_ARCHIVADA al rol que la admite y 403 al que no, sin escribir nada".
- Clase archivada, lecturas (200 maestro y admin, 409 alumno): "FORO-1B02: en una clase archivada, las lecturas responden 200 al maestro y al admin y 409 CLASE_ARCHIVADA al alumno".
- Clase archivada, el 403 va antes: "FORO-1B03: en una clase archivada, una clase ajena o un rol incorrecto siguen dando 403 antes de mirar si está archivada".
- La política de cada ruta en la tabla de ADMIN-01 (FORO-1B04): `clases-archivadas-matriz.integracion.test.ts`, los cinco "ADM-1A09 (a)" a "(e)".
- Restaurar: "FORO-1B05: restaurar la clase vuelve a abrir las escrituras del foro".
- La cadena exacta de cada ruta en el texto del handler: "FORO-1A51: cada una de las 16 rutas lleva su protegido exacto de §D-3.1, con enClaseArchivada: «lectura» en las 10 lecturas y sin ella en las 6 escrituras" (`foros-estatico.test.ts`).
- Filtros de datos del adaptador (no permisos): `:alumnoId` que no es alumno inscrito activo, 404 `ALUMNO_NO_ENCONTRADO` en 13 a 16 ("FORO-1A44: …", `foros-calificar.integracion.test.ts`); id de otra actividad, 404 (FORO-1A47).

### 4. Consultas de `adapters/db/foros.ts` y `actividades.ts`: índice y paginación

Sin SQL crudo, sin consultas en ciclos (un `groupBy` o un `findMany` por página), sin importar la cola. Los bloqueos son los de `entregas.ts`, importados sin cambiar su cuerpo. Los errores de Prisma pasan por `traducirErrorPrisma` (`adapters/db/errores.ts`, sin cambio): el choque del índice único parcial es `409 PARTICIPACION_YA_PUBLICADA` y un `22021` es `400`. **`instantaneaUnica: true` en el texto de `adapters/db/foros.ts`: 5** (`grep -c "instantaneaUnica: true" backend/src/adapters/db/foros.ts` → `5`), ninguno en un comentario.

| Función (transacción) | Consulta | Índice | Paginación |
|---|---|---|---|
| `esActividadDeTipo` (la del llamador) | `publicacion.findFirst({ id, claseId, tipo })` | PK de `publicaciones` | — |
| `listarForos` (instantánea) | cursor: `publicacion.findFirst({ id, claseId, tipo: "foro" })` | PK | cursor `id`, `limite` 1–100 (20) |
| | página: `publicacion.findMany({ claseId, tipo: "foro" })`, `creadoEn desc, id desc`, con autor, tema y `tarea` | `publicaciones (clase_id, tipo, tema_id, creado_en DESC, id DESC)` por su prefijo; autor, tema y tarea por PK | `take limite+1` + `paginar` |
| | principales de la página: un `participacionForo.groupBy(foroId)` con `principalId: null` | `(foro_id, principal_id, creado_en, id)` | ids de la página |
| | entregas del alumno: un `entrega.findMany({ tareaId in, alumnoId })` | único `(tarea_id, alumno_id)` | ids de la página |
| `leerMiParticipacion` (instantánea) | el foro: `tarea.findFirst({ id, claseId, publicacion.tipo })` | PK de `tareas` y de `publicaciones` | — |
| | la entrega: `entrega.findUnique(tareaId_alumnoId)`; su calificación (`calificacionDe`: `puntajeRubrica.findMany({ entregaId })`) | único `(tarea_id, alumno_id)`; PK de `puntajes_rubrica` | — |
| | la principal: `participacionForo.findFirst({ foroId, autorId, principalId: null })` | `participaciones_foro_una_principal` / `(foro_id, autor_id, …)` | — |
| `listarParticipaciones` (instantánea) | foro (`esActividadDeTipo`); cursor `findFirst({ id, foroId, principalId: null })`; página `findMany({ foroId, principalId: null })` `creadoEn, id` asc | PK; `(foro_id, principal_id, creado_en, id)` | cursor `id`, 1–100 (20) |
| | réplicas de la página: un `groupBy(principalId)` con `foroId` y `principalId in` | `(foro_id, principal_id, …)` o `(principal_id, creado_en, id)` (ver FORO-1A15) | ids de la página |
| `listarReplicas` (instantánea) | foro; principal (`exigirPrincipal`); cursor `findFirst({ id, foroId, principalId })`; página `findMany({ foroId, principalId })` asc | PK; `(principal_id, creado_en, id)` | cursor `id`, 1–100 (20) |
| `publicarParticipacion` (READ COMMITTED) | `bloquearTareaParaEntregar` (llave compartida de `tareas`), `esActividadDeTipo`, `asegurarFilaDeEntrega`, `bloquearEntrega`, relectura de `fechaEntrega` por PK, `participacionForo.create`, `entrega.update` por PK, `leerMiParticipacionCon` | PK de `tareas`; único `(tarea_id, alumno_id)`; PK | — |
| `publicarReplica` (READ COMMITTED) | `bloquearTareaParaEntregar`, `esActividadDeTipo`, `exigirPrincipal`, `participacionForo.create` | PK de `tareas`; PK | — |
| `listarParticipacionesDeAlumno` (instantánea) | foro; `alumnoInscrito` (PK de `inscripciones`); cursor `findFirst({ id, foroId, autorId })`; página `findMany({ foroId, autorId })` asc con `principal` por PK | `(foro_id, autor_id, creado_en, id)` | cursor `id`, 1–100 (20) |

Las rutas 3, 4, 5, 7, 12, 13, 15 y 16 reutilizan `leerTarea`, `editarTarea`, `borrarTarea`, `listarHiloPrivado`, `listarEntregas`, `leerEntregaDeAlumno` y `calificarEntrega` con `tipo: "foro"`: las mismas consultas e índices de hoy más el filtro por la PK de la publicación.

### 5. Hermanos del mecanismo: el `tipo` en cada función que lee o escribe `tareas` o `publicaciones`

| Archivo · función | Con un foro | Con una tarea (en una ruta del foro) | Caso |
|---|---|---|---|
| `tareas.ts` · `leerTareaCon` / `leerTarea` | ruta de tarea: null → 404; `tipo: "foro"`: lo lee | null → 404 "Ese foro ya no existe." | FORO-1A45 (GET), FORO-1A47 (ruta 3) |
| `tareas.ts` · `crearTarea` | escribe `tipo` y `requiereAdjuntos = false` | — | FORO-1A20 |
| `tareas.ts` · `editarTarea` | null antes de la autoría, sin escribir | null | FORO-1A45 (PUT), FORO-1A47 (ruta 4) |
| `tareas.ts` · `borrarTarea` | false antes de la autoría y de descartar archivos | false | FORO-1A45 (DELETE, también con `?confirmar=entregas`), FORO-1A47 (ruta 5) |
| `tareas.ts` · `adjuntosConfirmadosDe` | lo ignora (solo lectura de archivos por publicación, para preparar la edición, que después rechaza el tipo) | igual | FORO-1A45 (nada cambia) |
| `tareas.ts` · `listarTrabajoCon` / `listarTrabajo` | lo ignora: `tipos` sin `foro` (sin cambio en 01a; `conForos` es de 01b) | — | sin caso nuevo; vigiladas de "Trabajo de clase" en verde |
| `entregas.ts` · `existeLaTarea` (descargas del alumno y del maestro) | 404 `TAREA_NO_ENCONTRADA` | — | FORO-1A46 (las dos descargas) |
| `entregas.ts` · `leerMiEntregaCon` (`GET …/entrega`, subida de archivo) | null → 404 | — | FORO-1A46 |
| `entregas.ts` · `entregar`, `anularEntrega`, `comentarEnHiloPrivado` | null después del bloqueo, sin fila perezosa ni comentario | — | FORO-1A46 |
| `entregas.ts` · `calificarEntrega` | ruta de tarea: null; `tipo: "foro"`: califica | null | FORO-1A46, FORO-1A47 (ruta 16), FORO-1A42 |
| `entregas.ts` · `leerEntregaDeAlumnoCon`, `listarEntregasCon`, `listarHiloPrivadoCon` | ruta de tarea: null; `tipo: "foro"`: lo lee | null | FORO-1A46, FORO-1A47 (rutas 7, 12, 13, 15), FORO-1A43, FORO-1A44 |
| `entregas.ts` · `bloquearTareaParaEntregar`, `bloquearTareaParaCalificar`, `asegurarFilaDeEntrega`, `bloquearEntrega` | no miran el tipo (cuerpo sin cambio); quien las llama comprueba el tipo justo después del bloqueo | — | FORO-1A46, FORO-1A47 |
| `publicaciones.ts` · `crearPublicacion` | no puede crear un foro (el parámetro es `"anuncio" \| "material"`) | — | vigiladas del muro |
| `publicaciones.ts` · `listarPublicaciones` | sin `tipo`: excluido, también como cursor (400); con `tipo=anuncio`: igual que hoy | — | FORO-1A26 |
| `publicaciones.ts` · `borrarPublicacion`, `comentar`, `listarComentarios` | 404 (filtran `TIPOS_DEL_MURO`, sin cambio) | — | FORO-1A48 |
| `publicaciones.ts` · `borrarComentario`, `borrarMiComentario` | **no filtran el tipo** (sin cambio, fuera de "Se toca"); inalcanzable porque no se puede crear un comentario del muro en un foro (FORO-1A48 lo prueba) | — | observación (§9) |
| `foros.ts` · todas | — | null o 404 (`esActividadDeTipo` o `publicacion: { tipo: "foro" }`) | FORO-1A47 |
| `temas.ts` · `moverATema` | 404 `PUBLICACION_NO_ENCONTRADA` (sin cambio en 01a, §E8.1) | — | sin caso en 01a (01b) |
| `calificaciones.ts`, `exportacion-de-calificaciones.ts` | lo cuentan como columna (lo que se quiere) | — | FORO-1A40, FORO-1A41 |
| `core/clases/duplicado.ts` · `esRecursoDeAprendizaje` | false: no se copia | — | FORO-1A08 |

Estados vecinos del mismo mecanismo (la comprobación del tipo dentro de la transacción): la fila no existe (null), es de otra clase (null por `clase_id`), es de otra actividad (null o false después del bloqueo, antes de cualquier escritura), la borraron en medio (el bloqueo ya devuelve null: FORO-1A28) y la clase está archivada (el sexto paso responde antes: FORO-1B01).

### 6. Mutaciones reales de cada guarda nueva

Script: `C:\Users\Carlos\AppData\Local\Temp\claude\cbc20defe2ff00dc\af34580f-db0f-4e17-b8f4-34eb4bf290b3\scratchpad\scripts\mutaciones.py` (fuera del repositorio, en el scratchpad de la sesión). Por cada mutación: copia del archivo, cambio de una sola ancla (debe aparecer exactamente una vez), corrida de las pruebas indicadas, restauración desde la copia y `filecmp.cmp(..., shallow=False)`. Las 13 restauraciones dieron `cmp igual: True`, y `git diff --stat -- src` dio la misma línea antes y después (`8 files changed, 218 insertions(+), 85 deletions(-)`).

| Mutación | Archivo | Resultado | Cae |
|---|---|---|---|
| M1: quitar `esActividadDeTipo` de `editarTarea` | `adapters/db/tareas.ts` | `Tests  2 failed \| 3 passed (5)` | FORO-1A45, FORO-1A47 |
| M2: quitarlo de `borrarTarea` | ídem | `Tests  2 failed \| 3 passed (5)` | FORO-1A45, FORO-1A47 |
| M3: quitar `publicacion: { tipo }` de `leerTareaCon` | ídem | `Tests  2 failed \| 3 passed (5)` | FORO-1A45, FORO-1A47 |
| M4: quitarlo de `entregar` | `adapters/db/entregas.ts` | `Tests  1 failed \| 4 passed (5)` | FORO-1A46 |
| M5: quitarlo de `calificarEntrega` | ídem | `Tests  2 failed \| 3 passed (5)` | FORO-1A46, FORO-1A47 |
| M6: lista del muro sin el filtro de tipos | `adapters/db/publicaciones.ts` | `Tests  1 failed \| 14 passed (15)` | FORO-1A26 |
| M7: `conRetraso` visible para todos | `adapters/db/foros.ts` | `Tests  1 failed \| 14 passed (15)` | FORO-1A32 |
| M8: quitar `PARTICIPACION_YA_PUBLICADA` | `core/foros/participacion.ts` | `Tests  3 failed \| 25 passed (28)` | FORO-1A02 (dos), FORO-1A04 |
| M9: quitar `enClaseArchivada` de la ruta 8 | `handlers/foros.ts` | `Tests  2 failed \| 18 passed (20)` | FORO-1A51, FORO-1B02 |
| M10: una decisión con la fecha en el adaptador | `adapters/db/foros.ts` | `Tests  1 failed \| 9 passed (10)` | FORO-1A06 (i) |
| M11: calificar un foro con la regla de la tarea | `core/calificaciones/calificar.ts` | `Tests  1 failed \| 22 passed (23)` | FORO-1A06 (i) (la estática) |
| M12: un foro que pide adjuntos | `adapters/db/tareas.ts` | `Tests  1 failed \| 14 passed (15)` | FORO-1A20 |
| M13: la lista de foros sin `tipo: "foro"` | `adapters/db/foros.ts` | `Tests  2 failed \| 13 passed (15)` | FORO-1A24 (dos) |

Redundancia declarada: con M11, FORO-1A06 (ii) (la equivalencia) sigue en verde, porque con el valor por omisión de DH-02 la regla de la tarea y la del foro dan lo mismo (el plan lo dice en §D-2.2, fila P-03 c′). La guarda la vigila la parte estática, FORO-1A06 (i), que sí cae. La equivalencia vigila que, si cambia `reglaDeParticipacion`, calificar la siga.

### 7. Pruebas requeridas de 01a: archivo y título exacto de cada caso

Rojo primero: FORO-1A07 (`Tests  6 failed | 1 passed (7)` antes de dar el parámetro), FORO-1A01 a FORO-1A06 (ii) (`participacion.test.ts` sin el módulo: `Test Files  1 failed (1)`) y FORO-1A08 (rojo de tipos: `tsc -p tsconfig.test.json`, `error TS2322: Type '"foro"' is not assignable to type 'TipoDePublicacionOriginal'`). Las de integración nacieron contra rutas y adaptadores que no existían; su rojo se demuestra con las 13 mutaciones de §6, que tumban los casos que vigilan cada guarda.

- `backend/test/migracion-foro-01.integracion.test.ts` › "FORO-1A10: con un anuncio, un material y una tarea con entrega, las dos migraciones se aplican y no cambian ninguna fila"
- `backend/test/migracion-foro-01.integracion.test.ts` › "FORO-1A10: en el esquema migrado, tipo_publicacion termina en foro y el CHECK del título lo admite, validado"
- `backend/test/migracion-foro-01.integracion.test.ts` › "FORO-1A11: un foro con título y su fila de tareas entra; un foro sin título viola publicaciones_titulo_segun_tipo; un anuncio con título sigue rechazado"
- `backend/test/migracion-foro-01.integracion.test.ts` › "FORO-1A12: dos principales del mismo autor en el mismo foro violan participaciones_foro_una_principal; dos réplicas del mismo autor y principales en foros distintos, no"
- `backend/test/migracion-foro-01.integracion.test.ts` › "FORO-1A13: borrar la publicación del foro se lleva tareas, participaciones, entregas y sus comentarios; borrar una principal se lleva sus réplicas"
- `backend/test/migracion-foro-01.integracion.test.ts` › "FORO-1A13: el autor de una participación no se puede borrar (restrict)"
- `backend/test/migracion-foro-01.integracion.test.ts` › "FORO-1A15: existen los tres índices y el único parcial con su definición"
- `backend/test/migracion-foro-01.integracion.test.ts` › "FORO-1A15: con seqscan apagado, la lista de réplicas y la búsqueda de la cascada usan participaciones_foro_principal_id_creado_en_id_idx, y el conteo de réplicas usa un índice sin recorrer la tabla"
- `backend/test/foros-autorizacion.integracion.test.ts` › "FORO-1A49: sin sesión, cada ruta responde 401 NO_AUTENTICADO"
- `backend/test/foros-autorizacion.integracion.test.ts` › "FORO-1A49: con un rol que la ruta no admite, 403 ROL_NO_PERMITIDO (el admin en 6, 7, 9, 11 y 16; el maestro en 6, 7 y 9; el alumno en las de gestión)"
- `backend/test/foros-autorizacion.integracion.test.ts` › "FORO-1A49: un maestro de otra clase y un alumno no inscrito reciben 403 SIN_ACCESO_A_LA_CLASE en cada ruta de su rol"
- `backend/test/foros-autorizacion.integracion.test.ts` › "FORO-1A49: una clase inexistente responde lo mismo que una ajena (403 SIN_ACCESO_A_LA_CLASE)"
- `backend/test/foros-autorizacion.integracion.test.ts` › "FORO-1A49: un alumno inscrito con acceso restringido recibe 403 ACCESO_RESTRINGIDO en las 16 rutas (RN-09)"
- `backend/test/foros-autorizacion.integracion.test.ts` › "FORO-1A50: las 16 rutas, con éxito y con error, para el alumno, el maestro y el admin"
- `backend/test/foros-autorizacion.integracion.test.ts` › "FORO-1B01: en una clase archivada, cada escritura responde 409 CLASE_ARCHIVADA al rol que la admite y 403 al que no, sin escribir nada"
- `backend/test/foros-autorizacion.integracion.test.ts` › "FORO-1B02: en una clase archivada, las lecturas responden 200 al maestro y al admin y 409 CLASE_ARCHIVADA al alumno"
- `backend/test/foros-autorizacion.integracion.test.ts` › "FORO-1B03: en una clase archivada, una clase ajena o un rol incorrecto siguen dando 403 antes de mirar si está archivada"
- `backend/test/foros-autorizacion.integracion.test.ts` › "FORO-1B05: restaurar la clase vuelve a abrir las escrituras del foro"
- `backend/test/foros-calificar.integracion.test.ts` › "FORO-1A40: un foro calificado sale como columna del gradebook y de la exportación, con su calificación, y pondera en su categoría como una tarea"
- `backend/test/foros-calificar.integracion.test.ts` › "FORO-1A41: un foro vencido sin principal cuenta en vencidasSinEntregar; con principal o calificado sin participar, no; Mis calificaciones lo lista en cada filtro"
- `backend/test/foros-calificar.integracion.test.ts` › "FORO-1A42: con rúbrica (suma escalada) y sin rúbrica, y recalificar"
- `backend/test/foros-calificar.integracion.test.ts` › "FORO-1A42: la versión vieja o una principal publicada después de abrir el panel dan 409 ENTREGA_MODIFICADA, y puntos viejos 409 RUBRICA_MODIFICADA, con el texto del foro"
- `backend/test/foros-calificar.integracion.test.ts` › "FORO-1A42: a quien no participó, con el foro abierto, 409 ENTREGA_NO_CALIFICABLE con el texto del foro; cerrado, 200 y calificado sin fecha de entrega"
- `backend/test/foros-calificar.integracion.test.ts` › "FORO-1A43: encola CALIFICACION_PUBLICADA con solo ids y un id nuevo por publicación; el comentario sale en las devoluciones del alumno y del maestro, ascendentes"
- `backend/test/foros-calificar.integracion.test.ts` › "FORO-1A44: la lista con total y entregadas (quienes participaron), el participante con su versión y sin enlaces ni adjuntos, y lo que escribió con enRespuestaA"
- `backend/test/foros-cierre-de-tareas.integracion.test.ts` › "FORO-1A45: GET, PUT y DELETE /tareas/:id con el id de un foro responden 404 TAREA_NO_ENCONTRADA y nada cambia (título, archivos, trabajo_id ni trabajos)"
- `backend/test/foros-cierre-de-tareas.integracion.test.ts` › "FORO-1A46: con el id de un foro, las rutas de la entrega, de las entregas, del hilo privado, de calificar y las dos descargas responden 404 sin fila de entrega ni comentario nuevos"
- `backend/test/foros-cierre-de-tareas.integracion.test.ts` › "FORO-1A47: con el id de una tarea, un anuncio o un material, cada ruta del foro con :foroId responde 404 «Ese foro ya no existe.» sin escribir nada"
- `backend/test/foros-cierre-de-tareas.integracion.test.ts` › "FORO-1A47: con un foro real, una participación que no es de él responde 404 PARTICIPACION_NO_ENCONTRADA en las rutas 10 y 11"
- `backend/test/foros-cierre-de-tareas.integracion.test.ts` › "FORO-1A48: DELETE /publicaciones/:foroId, y leer o escribir los comentarios del muro de un foro, responden 404"
- `backend/test/foros-estatico.test.ts` › "FORO-1A06 (i): en core/foros/participacion.ts, las decisiones con la fecha viven solo dentro de reglaDeParticipacion, y aceptaTardias solo se declara en ForoParaParticipar"
- `backend/test/foros-estatico.test.ts` › "FORO-1A06 (i): adapters/db/foros.ts, adapters/db/actividades.ts y handlers/foros.ts no deciden con la fecha; sus menciones de aceptaTardias y fechaLimite son las admitidas"
- `backend/test/foros-estatico.test.ts` › "FORO-1A06 (i): el cuerpo de exigirEntregaCalificable llama a reglaDeParticipacion en la rama del foro"
- `backend/test/foros-estatico.test.ts` › "FORO-1A51: no compara relación ni rol, no toca Prisma ni SQL ni notifier"
- `backend/test/foros-estatico.test.ts` › "FORO-1A51: solo encola COLA_TAREA_CREADA, COLA_RECORDATORIO_24H y COLA_CALIFICACION_PUBLICADA, y solo cancela COLA_RECORDATORIO_24H y COLA_TAREA_CREADA"
- `backend/test/foros-estatico.test.ts` › "FORO-1A51: cada una de las 16 rutas lleva su protegido exacto de §D-3.1, con enClaseArchivada: «lectura» en las 10 lecturas y sin ella en las 6 escrituras"
- `backend/test/foros-estatico.test.ts` › "FORO-1A51: app.ts registra forosHandler con el almacén, después de calificacionesHandler"
- `backend/test/foros-estatico.test.ts` › "FORO-1A52: adapters/db/foros.ts y actividades.ts sin $queryRaw, $executeRaw ni FOR …, sin consultas en ciclos y sin importar adapters/queue"
- `backend/test/foros-estatico.test.ts` › "FORO-1A52: las respuestas de shared/src/foros.ts son z.strictObject"
- `backend/test/foros-estatico.test.ts` › "FORO-1A53: ningún comentario nombra las palabras de las listas estáticas (CAL-1A18, N-01) y tareas.ts no nombra la opción de la instantánea en un comentario"
- `backend/test/foros-participaciones.integracion.test.ts` › "FORO-1A27: diez principales simultáneas del mismo alumno dan una 201 y nueve 409 PARTICIPACION_YA_PUBLICADA, una sola fila principal y la entrega entregado con version 1"
- `backend/test/foros-participaciones.integracion.test.ts` › "FORO-1A28: una réplica mientras se borra el foro responde 201 antes o 404 después, nunca 500 ni P2003"
- `backend/test/foros-participaciones.integracion.test.ts` › "FORO-1A29: a tiempo, la entrega queda entregado con la hora de la principal, sin retraso y con la versión siguiente"
- `backend/test/foros-participaciones.integracion.test.ts` › "FORO-1A29: después de la fecha con tardías, la participación y la entrega quedan con retraso"
- `backend/test/foros-participaciones.integracion.test.ts` › "FORO-1A29: sin tardías y vencido, 409 FORO_CERRADO sin fila perezosa; reabrirlo (fecha futura o aceptar tardías) deja publicar"
- `backend/test/foros-participaciones.integracion.test.ts` › "FORO-1A30: calificado sin participar (cerrado), 409 PARTICIPACION_CALIFICADA aunque se reabra; sus réplicas siguen la regla"
- `backend/test/foros-participaciones.integracion.test.ts` › "FORO-1A31: el alumno replica en una principal ajena y en la suya sin haber publicado antes la suya (DH-04 a)"
- `backend/test/foros-participaciones.integracion.test.ts` › "FORO-1A31: el maestro replica después de la fecha en un foro sin tardías, sin retraso"
- `backend/test/foros-participaciones.integracion.test.ts` › "FORO-1A31: una principal de otro foro, una réplica como principal o una inexistente responden 404 PARTICIPACION_NO_ENCONTRADA"
- `backend/test/foros-participaciones.integracion.test.ts` › "FORO-1A32: principales ascendentes con réplicas y propia; conRetraso para el maestro y el admin en todas y para el alumno solo en la suya"
- `backend/test/foros-participaciones.integracion.test.ts` › "FORO-1A32: las páginas siguen con su cursor, y un cursor de otro foro o una réplica en la lista de principales responden 400"
- `backend/test/foros-participaciones.integracion.test.ts` › "FORO-1A33: sin fila, asignado sin calificación; puedeParticipar y los avisos de retraso los decide la regla"
- `backend/test/foros-participaciones.integracion.test.ts` › "FORO-1A33: con principal, su id y la fecha de entrega; calificada, con el desglose por criterio"
- `backend/test/foros-participaciones.integracion.test.ts` › "FORO-1A34: participar y replicar no encolan ningún trabajo"
- `backend/test/foros-participaciones.integracion.test.ts` › "FORO-1A35: texto vacío, solo invisibles o demasiado largo responde 400 VALIDACION con «texto: …»; un carácter nulo, 400 y nunca 500"
- `backend/test/foros.integracion.test.ts` › "FORO-1A20: el maestro y el admin crean un foro: 201 con el detalle, sin requiereAdjuntos, trabajo, rol ni correos"
- `backend/test/foros.integracion.test.ts` › "FORO-1A20: TAREA_CREADA lleva el id del foro y solo ids; RECORDATORIO_24H queda en created con start_after = fecha − 24 h y su id en trabajo_id"
- `backend/test/foros.integracion.test.ts` › "FORO-1A20: a menos de 24 h no se programa recordatorio y trabajo_id queda nulo"
- `backend/test/foros.integracion.test.ts` › "FORO-1A20: si falla el encolado, no queda el foro ni su trabajo"
- `backend/test/foros.integracion.test.ts` › "FORO-1A20: sin planteamiento, 400 VALIDACION con el texto del foro"
- `backend/test/foros.integracion.test.ts` › "FORO-1A21: con la versión vieja, 409 TAREA_MODIFICADA con el texto del foro y nada cambia"
- `backend/test/foros.integracion.test.ts` › "FORO-1A21: mover la fecha cancela el recordatorio y crea otro, en la misma transacción"
- `backend/test/foros.integracion.test.ts` › "FORO-1A21: con una calificada, cambiar los puntos responde 409 TAREA_CON_CALIFICACIONES con el texto del foro"
- `backend/test/foros.integracion.test.ts` › "FORO-1A21: con categorías en la clase, crear o editar sin una responde 409 CATEGORIA_REQUERIDA con el texto del foro"
- `backend/test/foros.integracion.test.ts` › "FORO-1A22: sin participaciones, 204 y cancela el recordatorio y TAREA_CREADA"
- `backend/test/foros.integracion.test.ts` › "FORO-1A22: con una principal, el maestro recibe 409 TAREA_CON_ENTREGAS con el texto del foro; el admin confirma y se borra en cascada"
- `backend/test/foros.integracion.test.ts` › "FORO-1A23: un maestro no edita ni borra el foro del admin ni el de otro maestro que sigue en la clase; sí el de uno que ya no la da; puedeEditar y puedeBorrar en el detalle"
- `backend/test/foros.integracion.test.ts` › "FORO-1A24: del más reciente al más antiguo, con cursor, con el conteo de principales y la entrega solo para el alumno"
- `backend/test/foros.integracion.test.ts` › "FORO-1A24: un foro de otra clase, una tarea o un anuncio como cursor responden 400 VALIDACION"
- `backend/test/foros.integracion.test.ts` › "FORO-1A26: la lista del muro sin tipo no devuelve foros ni acepta uno como cursor; con tipo=anuncio, igual"
- `backend/src/core/actividades.test.ts` › "FORO-1A07: con «foro», cada error de una sola llamada lleva el código de hoy y el texto del foro"
- `backend/src/core/actividades.test.ts` › "FORO-1A07: sin el parámetro (y con «tarea»), el texto de hoy, letra por letra"
- `backend/src/core/actividades.test.ts` › "FORO-1A07: CATEGORIA_REQUERIDA, con «foro» y sin el parámetro"
- `backend/src/core/actividades.test.ts` › "FORO-1A07: TAREA_CON_ENTREGAS en singular y plural, al admin y al maestro, con «foro» y sin el parámetro"
- `backend/src/core/actividades.test.ts` › "FORO-1A07: decidirCalificacion lanza RUBRICA_MODIFICADA con el texto de su actividad"
- `backend/src/core/actividades.test.ts` › "FORO-1A07: exigirEntregaCalificable lanza ENTREGA_NO_CALIFICABLE con el texto de su actividad"
- `backend/src/core/actividades.test.ts` › "FORO-1A07: exigirRubricaCongelada lanza TAREA_CON_CALIFICACIONES con el texto de su actividad"
- `backend/src/core/foros/participacion.test.ts` › "FORO-1A01: el alumno, en la principal y en la réplica, antes, en el milisegundo exacto y un milisegundo después, con y sin tardías"
- `backend/src/core/foros/participacion.test.ts` › "FORO-1A01: el maestro, siempre abierta y sin retraso, también después en un foro sin tardías"
- `backend/src/core/foros/participacion.test.ts` › "FORO-1A01: el admin, siempre cerrada y sin retraso"
- `backend/src/core/foros/participacion.test.ts` › "FORO-1A02: el orden de los errores: YA_PUBLICADA antes que CALIFICADA antes que FORO_CERRADO"
- `backend/src/core/foros/participacion.test.ts` › "FORO-1A02: calificado con fechaEntrega es YA_PUBLICADA y sin ella es CALIFICADA, aunque el foro esté abierto"
- `backend/src/core/foros/participacion.test.ts` › "FORO-1A02: sin principal y con el foro abierto, devuelve el conRetraso de la regla"
- `backend/src/core/foros/participacion.test.ts` › "FORO-1A03: el alumno con el foro cerrado recibe FORO_CERRADO"
- `backend/src/core/foros/participacion.test.ts` › "FORO-1A03: el maestro nunca recibe FORO_CERRADO y replica sin retraso"
- `backend/src/core/foros/participacion.test.ts` › "FORO-1A03: el alumno con el foro abierto recibe el conRetraso de la regla"
- `backend/src/core/foros/participacion.test.ts` › "FORO-1A04: en cada combinación de FORO-1A01 × estado (con y sin principal), sin lanzar"
- `backend/src/core/foros/participacion.test.ts` › "FORO-1A05: el estudiante solo en lo suyo; el maestro y el admin, siempre"
- `backend/src/core/foros/participacion.test.ts` › "FORO-1A06 (ii): exigirEntregaCalificable con «foro» lanza si y solo si el estado es asignado y la principal todavía está abierta"
- `backend/src/core/foros/participacion.test.ts` › "FORO-1A06 (ii): accionesDelForo devuelve en participarConRetraso y replicarConRetraso el conRetraso de la regla"
- `backend/src/core/clases/duplicado-con-foros.test.ts` › "FORO-1A08: esRecursoDeAprendizaje de un foro da false con cualquier bloque y autor"
- `backend/src/core/clases/duplicado-con-foros.test.ts` › "FORO-1A08: planDeDuplicado con un foro entre los recursos no lo copia, ni sus archivos, y sí copia el material de aprendizaje"

Las demás de §E7.4 para 01a:
- FORO-1B04 (ADM-1A09 con las 16 rutas, lista cerrada): `backend/test/clases-archivadas-matriz.integracion.test.ts` › "ADM-1A09 (a): las rutas con :claseId de printRoutes son exactamente las de la tabla de §D-1, métodos incluidos y HEAD aparte" y los casos (b) a (e) del mismo archivo, sin cambiar.
- FORO-1B07 y el antiguo FORO-1A14 (`migrate diff`): no es una prueba; comando y salida en §1.
- C-1, C-2 y C-6 (del tester): verdes sin tocarlas (§8).
- FORO-1A25 y FORO-1A26b: van en 01b (§E7.4); no se cubren en 01a.

### 8. Verificación (comando exacto y última línea; una corrida a la vez, nunca dos suites juntas)

- `shared`: `npm run lint` → `All matched files use Prettier code style!`; `npm run build` → `> tsc -p tsconfig.json` (sin errores).
- `backend`: `npm run lint` → `> tsc -p tsconfig.json --noEmit && tsc -p tsconfig.test.json` (sin errores; incluye ESLint, Prettier y el typecheck de las pruebas); `npm run build` → `> tsc -p tsconfig.json` (sin errores).
- `frontend`: `npm run lint` → `> tsc -b` (sin errores); `npm run build` → `✓ built in 2.15s`.
- Suite del backend, módulos tocados y vigiladas (desde `backend/`): `npx vitest run test/foros test/migracion-foro-01 test/clases-archivadas test/tareas test/entregas test/hilo test/calificaciones test/gradebook test/mis-calificaciones test/exportacion test/temas test/categorias test/muro test/admin-muro test/logs-muro test/trabajo test/instantanea test/referencias src/core test/sesiones-y-cadena test/lecturas-fx test/arquitectura-cuentas test/bloqueo-usuario test/higiene-de-pruebas test/gestion-clases-autorizacion test/movimientos-inscripcion test/recursos-autorizacion test/duplicado-de-clase test/borrado test/migracion-tareas test/migracion-clases03a test/esquemas-tareas test/autoria-02b test/guarda-todas-las-rutas test/middleware-orden` → `Tests  1654 passed (1654)` (`Test Files  150 passed (150)`).
  - La primera corrida dio `Tests  1 failed | 1653 passed (1654)`: FORO-1A47 contaba `participacionForo.count()` de toda la base, y otro archivo creaba participaciones en paralelo. Se acotó el conteo a la clase de la prueba (`{ foro: { claseId } }`), se corrió el archivo solo (`Tests  5 passed (5)`) y después la suite completa de arriba otra vez.
- C-1 (`test/sesiones-y-cadena.ataque.test.ts`) y C-2 (`test/lecturas-fx-r1.ataque.test.ts`): dentro de esa corrida, verdes, sin tocarlas.
- Suite del frontend (desde `frontend/`): `npx vitest run src/lib` → `Tests  296 passed (296)` (`Test Files  23 passed (23)`), con C-6 (`src/lib/errores-ch3-r2.ataque.test.ts`) dentro.
- Conteo de casos nuevos: `npx vitest list test/foros test/migracion-foro-01 src/core/actividades.test.ts src/core/foros src/core/clases/duplicado-con-foros.test.ts`, contado con `grep -a ' > ' … | grep -ac 'FORO-'` → **92 casos en 10 archivos**: `actividades.test.ts` 7, `duplicado-con-foros.test.ts` 2, `participacion.test.ts` 13, `foros-autorizacion` 10, `foros-calificar` 7, `foros-cierre-de-tareas` 5, `foros-estatico` 10, `foros-participaciones` 15, `foros.integracion` 15, `migracion-foro-01` 8.
- `instantaneaUnica: true` en `backend/src/adapters/db/foros.ts`: `grep -c "instantaneaUnica: true" backend/src/adapters/db/foros.ts` → `5` (C-2 espera 5: no cambia).

### 9. Desviaciones del plan, dudas y observaciones

Desviaciones (ninguna toca un archivo fuera de "Se toca" ni una prueba fuera de la lista cerrada):
1. **Los dos cambios de `publicaciones.ts` (§E8.1) se hicieron antes del paso 6**, justo después de aplicar la primera migración: con el cliente regenerado, `tsc` no compilaba sin ellos (lo había previsto el orquestador).
2. **FORO-1A15, el `EXPLAIN` del conteo de réplicas.** Con `foro_id = $1 AND principal_id IN (…)`, PostgreSQL usa `participaciones_foro_foro_id_principal_id_creado_en_id_idx`, que también sirve sin recorrer la tabla. El caso comprueba que la lista de réplicas y la búsqueda de la cascada (`principal_id = $1`) nombran `participaciones_foro_principal_id_creado_en_id_idx`, y que el conteo es un `Index (Only) Scan` sin `Seq Scan`. El índice (M-03) existe y sirve a lo que el plan le pide; solo el conteo lo resuelve el otro.
3. **La participación lleva `creadoEn = ahora`**, la misma hora que `entregas.fecha_entrega` (FORO-1A29: "`fecha_entrega` = hora de la principal"); la réplica, también.
4. **`editarTarea` también fuerza `requiereAdjuntos = false` con `tipo: "foro"`** (el plan lo dice de `crearTarea`; es su hermano). El handler ya manda `false`; con `"tarea"` no cambia nada.
5. **La firma del autor (`firmaDelAutor`) de la lista de foros, de las participaciones y de las réplicas se hace en `adapters/db/foros.ts`** (el plan lo dice de `listarParticipaciones`; se extendió a las demás listas nuevas). El detalle del foro (`TareaDetalleDb`) se firma en el handler, como la tarea.
6. **`exigirVersion` recibe `() => tareaModificada(tipo)` y `() => entregaModificada(tipo)`** en lugar de la referencia: así llega el texto de la actividad.
7. **FORO-1A47 recorre 14 rutas, no 16:** las rutas 1 y 2 no llevan `:foroId`.
8. **FORO-1A41 cubre cuatro de los cinco filtros de "Mis calificaciones"** (`sin-entregar`, `entregadas`, `calificadas`, `todas`); `asignadas` no tiene caso (el foro del caso está vencido).
9. **Un archivo más que el estimado:** la ayuda `backend/test/ayudas-foros.ts` (34 en lugar de ~33).

Dudas para el manager (con la línea del plan que respalda lo elegido):
- **El singular de `TAREA_CON_ENTREGAS` del admin en un foro.** `plan.md:1332` da un solo texto, "Este foro tiene {n} alumno(s) con participación o calificación. Si lo borras, también se borrarán sus participaciones, sus réplicas y sus calificaciones…", y dice "(mismo singular y plural que hoy)". Solo varía la cuenta ("1 alumno con…" / "N alumnos con…"); "sus" se lee como del foro. Si se esperaba "su participación, … y su calificación" en singular, es una línea de `core/actividades.ts` y su caso.
- **`entregaCerrada({ ...foro, requiereAdjuntos: false }, ahora)`.** `plan.md:1291` pide `abierta = !entregaCerrada(foro, ahora)`; `TareaParaEntregar` exige `requiereAdjuntos`, que `entregaCerrada` no lee. Misma regla, mismo milisegundo.
- **`tareaNoEncontrada` en `TEXTOS_POR_ACTIVIDAD`.** `plan.md:1338` (fila de `errorTareaNoEncontrada` en §D-2.4) pide "Ese foro ya no existe." en `adapters/db/tareas.ts` y en el `404` de `handlers/foros.ts`; los tres lo leen de la tabla.

Observación (no corregida; fuera de "Se toca"):
- **`borrarComentario` y `borrarMiComentario` (`adapters/db/publicaciones.ts`) no filtran el tipo de la publicación**, a diferencia de `borrarPublicacion`, `comentar` y `listarComentarios`. Hoy es inalcanzable para un foro (y para una tarea), porque no se puede crear un comentario del muro en ninguno de los dos (FORO-1A48 lo prueba). Si se sembrara uno a mano, borrarlo daría `204`. Lo anoto para el arquitecto; no lo cambio porque `publicaciones.ts` solo está en "Se toca" para `crearPublicacion` y `listarPublicaciones`.

No verificado:
- La suite completa de cada paquete (la corre el manager al cerrar, `AGENTS.md`, "Suites por ronda").
- En el frontend se corrió `src/lib` (paso 11); `src/features/clases`, que `plan.md:2052` también nombra para las rondas de 01a, no se corrió (ningún archivo del frontend cambió; `lint` y `build` pasaron).
- No se abrió ningún navegador; 01a no tiene interfaz.

## Corrección tras la verificación del manager — FORO-01a: M-09 (2026-11-14)


**M-09: corregido.** Archivo: `backend/test/foros-calificar.integracion.test.ts`, un `describe` nuevo con tres casos, antes del de FORO-1A42. FORO-1A41 de antes no cambió.
- "FORO-1A41: un foro abierto sin principal del alumno está en asignadas y no en sin-entregar; al publicar su principal sale de asignadas y aparece en entregadas"
- "FORO-1A41: cada estado de la entrega (asignado abierto, vencido sin participar, entregado, entregado con retraso, calificado con y sin participación) está exactamente en sus filtros"
- "FORO-1A24 y FORO-1A44: los mismos seis estados en la entrega de la lista de foros del alumno y en Participantes del maestro"

**¿Rojo contra el código de hoy?** No: los tres pasaron a la primera, así que no hay hallazgo de producción. Ningún archivo de producción cambió: `git status --short` muestra lo mismo que antes y `git diff --stat -- src/adapters/db/calificaciones.ts` sale vacío.

**La guarda, con mutación real.** Usé el script de §6, con la copia restaurada y comprobada con `filecmp.cmp(shallow=False)`. La guarda vive en `adapters/db/calificaciones.ts`, en `condicionDelFiltro`, rama `asignadas`: `{ fechaLimite: { gte: ahora }, entregas: sinEntregar }`.
- **M14**, quitar `fechaLimite: { gte: ahora }` (lo que separa `asignadas` de `sin-entregar`): `Tests  1 failed | 9 passed (10)`. Cae "FORO-1A41: cada estado de la entrega …". Restaurado; `cmp igual: True`.
  - Redundancia declarada: el caso de la transición sigue verde con esta mutación, porque no tiene ningún foro vencido. La separación la vigila el caso de los seis estados.
- **M15**, quitar `entregas: sinEntregar` (lo que hace que un foro sin principal cuente como asignado y uno con principal no): `Tests  2 failed | 8 passed (10)`. Caen los dos casos FORO-1A41 nuevos. Restaurado; `cmp igual: True`.

**Hermanos: cada estado de la entrega de un foro, filtro por filtro y vista por vista.** Todos son del caso de los seis estados (FORO-1A41), salvo la columna FORO-1A24/1A44, que es del tercer caso. Los casos de antes que también los cubren van entre paréntesis.

| Estado de la entrega del alumno | todas | asignadas | entregadas | calificadas | sin-entregar | Lista de foros (FORO-1A24) · Participantes (FORO-1A44) |
|---|---|---|---|---|---|---|
| asignado, foro abierto (sin fila) | sí | **sí** (también el caso de la transición) | no | no | no | `entrega: null` · `asignado`, sin fecha, entregadas 0 (FORO-1A44 de antes, el otro alumno) |
| asignado, foro vencido sin participar | sí (FORO-1A41 de antes) | no | no | no | **sí** (FORO-1A41 de antes) | `entrega: null` · `asignado`, sin fecha, entregadas 0 |
| entregado a tiempo | sí | no (también el caso de la transición) | **sí** (también el caso de la transición) | no | no | `{ entregado, conRetraso: false }` · `entregado`, con fecha, entregadas 1 (FORO-1A44 de antes) |
| entregado con retraso | sí | no | **sí** | no | no | `{ entregado, conRetraso: true }` (FORO-1A24 de antes) · `entregado`, `conRetraso: true`, entregadas 1 |
| calificado con participación | sí | no | no | **sí** | no | `{ calificado, conRetraso: false }` · `calificado`, con fecha, entregadas 1 |
| calificado sin participar | sí (FORO-1A41 de antes) | no | no | **sí** (FORO-1A41 de antes) | no | `{ calificado, conRetraso: false }` · `calificado`, sin fecha, entregadas 0 |

En `todas`, el caso de los seis estados comprueba además la `entrega` de cada fila de "Mis calificaciones": asignado sin calificación, entregado con retraso y calificado sin participar con su calificación.

**Corridas** (desde `backend/`, una a la vez):
- `npx vitest run test/foros-calificar` → `Tests  10 passed (10)` (`Test Files  1 passed (1)`).
- `npm run lint` → `> tsc -p tsconfig.json --noEmit && tsc -p tsconfig.test.json` (sin errores; ESLint, Prettier y el typecheck de las pruebas).

**Conteo:** `npx vitest list test/foros test/migracion-foro-01 src/core/actividades.test.ts src/core/foros src/core/clases/duplicado-con-foros.test.ts`, contado con `grep -a ' > ' … | grep -ac 'FORO-'` → **95 casos `FORO-` en 10 archivos** (eran 92). `foros-calificar.integracion.test.ts` pasa de 7 a 10.

**Archivos de esta corrección:** solo `backend/test/foros-calificar.integracion.test.ts` (prueba nueva de 01a). Ninguno de producción, ninguna `*.ataque`, nada de "No se toca". El conteo de 01a sigue en 34.

**Desviación 8 del resumen anterior:** queda sin objeto; los cinco filtros tienen caso.

## Carril trivial — hookTimeout de 30 s en el backend (2026-11-14)

Autorizado por el humano el 2026-11-14 ("Subir el tiempo y repetir"), fuera de "Se toca" de FORO-01a. Es la decisión del 2026-10-28 (`docs/ESTADO.md` §3, "Tiempo de espera de levantar la app en el backend"). Solo cambió `backend/vitest.config.ts`; nada de producción, de pruebas ni de `*.ataque`.

```diff
@@ -9,5 +9,7 @@ export default defineConfig({
     setupFiles: ["./test/setup.ts"],
     include: ["src/**/*.test.ts", "test/**/*.test.ts"],
     testTimeout: 15000,
+    // beforeAll(construirApp) excedió los 10 s por omisión con el equipo cargado en la suite completa (CLASES-03a y el cierre de FORO-01a).
+    hookTimeout: 30_000,
   },
 })
```

Verificación (desde `backend/`, una corrida a la vez; la suite completa la repite el manager):
- `npm run lint` → `> tsc -p tsconfig.json --noEmit && tsc -p tsconfig.test.json` (sin errores).
- `npx vitest run test/admin-correo test/admin-restablecimiento test/archivos-d-r2 test/auth-registro test/autorizacion-cuentas test/invitacion-flujo-03a-r2` → `Tests  87 passed (87)` (`Test Files  7 passed (7)`). Son 7 archivos y no 6 porque el filtro `test/auth-registro` incluye `auth-registro.ataque.test.ts` y `auth-registro.integracion.test.ts`. Usé los filtros tal como venían.

## Implementación — FORO-01b (2026-11-16)


Plan: `docs/trabajo/FORO-01-actividad-tipo-foro/plan.md` (Enmiendas 1 a 9; §E7.5.2 y §E7.11, pasos 12 a 19). Base dentro de los paquetes: `451aa35`. Sin migraciones: `schema.prisma` no cambió.
Pasos completados: 8 de 8 (12 a 19).

### 1. Archivos de 01b (`git status --short` contra `451aa35`)

Producción (18, como §E7.5.2):
- `shared/src/foros.ts` (`puedeBorrar` en `participacionSchema` y `replicaSchema`), `shared/src/tareas.ts` (`temaDeTrabajoSchema`, `conForos` con su `.superRefine` y su `.transform` en `trabajoQuerySchema` y `temasQuerySchema`, `foro` en `elementoDeTrabajoSchema.tipo`, `SeccionDeTrabajo` y `SeccionDeTemasConForos`), `shared/src/recursos.ts` (solo la línea del tema, ahora `temaDeTrabajoSchema`), `shared/src/calificaciones.ts` (`conTipo` en las dos consultas y `tipo` opcional dentro de los dos `z.strictObject`), `shared/src/index.ts` (las exportaciones nuevas).
- `backend/src/core/autoria.ts` (solo `puedeBorrarParticipacion`) y `core/foros/participacion.ts` (`efectoDeBorrarPrincipal`).
- `backend/src/adapters/db/foros.ts` (`borrarParticipacion`, `puedeBorrar` en las listas, el `catch` de `publicarReplica`), `errores.ts` (`alFaltarReferencia`), `index.ts`, `tareas.ts` (solo `listarTrabajoCon`/`listarTrabajo`, `ElementoDeTrabajoDb.tipo` y dos constantes privadas), `temas.ts`, `categorias.ts` (solo el texto del `409` y el conteo de foros en su camino) y `calificaciones.ts` (`SELECT_TAREA`, `columnaDe` y `ColumnaDelGradebookDb.tipo`).
- `backend/src/handlers/foros.ts` (la ruta 17 y `actor` en las listas), `handlers/calificaciones.ts` (`columnaParaResponder` y `conTipo`), `handlers/README.md` y `adapters/README.md`.

Pruebas nuevas (5): `backend/src/core/foros/borrado.test.ts`; `backend/test/foros-borrar.integracion.test.ts`, `foros-actividades.integracion.test.ts`, `foros-tipo-en-calificaciones.integracion.test.ts` y `foros-admin-01.integracion.test.ts`.
Lista cerrada (4): `backend/test/clases-archivadas-matriz.integracion.test.ts` (la fila de la ruta 17 con su comentario, tal cual), `backend/src/adapters/db/errores.test.ts` (cuatro casos nuevos de `alFaltarReferencia`; los de antes no cambian), `backend/test/foros-autorizacion.integracion.test.ts` (FORO-1A49, FORO-1A50 y FORO-1B01 suman la ruta 17; FORO-1A50 suma las llaves con `puedeBorrar`) y `backend/test/foros-estatico.test.ts` (FORO-1A51 suma la ruta 17; FORO-1A52 admite y fija el único `participacionForo.deleteMany`).
Ayuda existente que solo gana una exportación: `backend/test/ayudas-foros.ts` (`rutaDeBorrarParticipacion`).
`*.ataque` de la ronda 0 (5, del tester, sin tocar): `sesiones-y-cadena` (C-1 bis), `lecturas-fx-r2` (C-3), `frontend/src/lib/errores-ch3-r2` (C-7), `foros-01a-r1-tipo-y-validacion` (C-T1) y `foros-01a-r1-ids-y-fugas` (C-T2).

Total: 18 + 5 + 4 + 5 = 32, más la ayuda = **33** (el arbitraje estimó ~32; la ayuda es la diferencia). Ningún archivo de "No se toca": nada en `middleware/`, `adapters/auth|notifier|queue`, `config/`, `workers/`, `infra/`, `handlers/tareas/*`, `handlers/clases/*`, `core/clases/*`, `core/tareas/*` ni en la producción del frontend.

### 2. La ruta 17 en la matriz de autorización

`DELETE /api/clases/:claseId/foros/:foroId/participaciones/:participacionId` · `protegido({ roles: ["admin"], pertenencia: "propiedad" })` (cadena completa: `authenticate → withProfile → withPasswordGate → withAccess → requireRole → requireOwnership`), sin `enClaseArchivada` (cerrada). Sin verificación a mano: el handler valida `participacionParamSchema` y llama a `borrarParticipacion` con `perfilDe(request)`; la regla de quién borra es `puedeBorrarParticipacion` en `core/autoria.ts`.

| Negativa | Resultado | Caso (archivo › título) |
|---|---|---|
| Sin sesión | 401 `NO_AUTENTICADO` | `foros-autorizacion` › "FORO-1A49: sin sesión, cada ruta responde 401 NO_AUTENTICADO" |
| Maestro de la clase, alumno autor, otro alumno | 403 `ROL_NO_PERMITIDO` | `foros-borrar` › "FORO-1A62: el maestro, el alumno autor y otro alumno reciben 403 del rol; …"; `foros-autorizacion` › "FORO-1A49: con un rol que la ruta no admite, 403 ROL_NO_PERMITIDO (…; el maestro en 6, 7, 9 y 17; el alumno en las de gestión y en la 17)" |
| Alumno restringido | 403 `ACCESO_RESTRINGIDO` | los dos de arriba: "FORO-1A62: …" y "FORO-1A49: un alumno inscrito con acceso restringido recibe 403 ACCESO_RESTRINGIDO en las 17 rutas (RN-09)" |
| Clase inexistente (el admin) | 403 `SIN_ACCESO_A_LA_CLASE` | "FORO-1A62: …"; "FORO-1A49: una clase inexistente responde lo mismo que una ajena (403 SIN_ACCESO_A_LA_CLASE)" |
| Clase ajena | el admin tiene relación con toda clase que existe: no aplica por rol; el foro de otra clase es 404 | "FORO-1A62: el admin con un foro de otra clase, el id de una tarea o una participación de otro foro recibe 404 sin borrar nada" |
| Ids cruzados (foro de otra clase, id de una tarea, participación de otro foro, inexistente) | 404 `TAREA_NO_ENCONTRADA` o `PARTICIPACION_NO_ENCONTRADA`, nada borrado | el mismo FORO-1A62 |
| Clase archivada | admin 409 `CLASE_ARCHIVADA`; alumno y maestro 403 del rol; nada borrado | `foros-autorizacion` › "FORO-1B01: en una clase archivada, cada escritura responde 409 CLASE_ARCHIVADA al rol que la admite y 403 al que no, sin escribir nada"; la política en `clases-archivadas-matriz` (ADM-1A09 (a) a (e)) |
| Estado de pago y demás | ninguna respuesta de las 17 lleva `estadoPago`, `accesoRestringido`, `email`, `correo`, `rol`, `trabajoId` ni `requiereAdjuntos` | `foros-autorizacion` › "FORO-1A50: las 17 rutas, con éxito y con error, para el alumno, el maestro y el admin; las listas de participaciones y réplicas llevan puedeBorrar" |
| La cadena exacta en el texto | — | `foros-estatico` › "FORO-1A51: cada una de las 17 rutas lleva su protegido exacto de §D-3.1 y §D-11, con enClaseArchivada: «lectura» en las 10 lecturas y sin ella en las 7 escrituras" |

### 3. Consultas nuevas o cambiadas, con su índice

| Función | Consulta | Índice |
|---|---|---|
| `borrarParticipacion` (READ COMMITTED) | `bloquearTareaParaEntregar` (llave compartida de la fila de `tareas`) | PK de `tareas` |
| | `esActividadDeTipo` | PK de `publicaciones` |
| | `participacionForo.findFirst({ id, foroId })` | PK de `participaciones_foro` |
| | principal: `bloquearEntrega` (fila de la entrega del autor) y relectura `findFirst({ id, foroId, principalId: null })` | único `(tarea_id, alumno_id)`; PK |
| | `entrega.update` por PK; `participacionForo.deleteMany({ id, foroId })` (las réplicas caen por la FK sobre sí misma) | PK; `(principal_id, creado_en, id)` para la cascada |
| `listarParticipaciones`, `listarReplicas` | sin consultas nuevas: `puedeBorrar` se calcula en memoria con el actor | las de 01a |
| `listarTrabajoCon` | el mismo `where`, con `tipo in ["tarea", "foro"]` en la sección `actividades-con-foros` (también el cursor); las entregas de la página, ahora de tareas y foros, en la misma única consulta | `publicaciones (clase_id, tipo, tema_id, creado_en DESC, id DESC)`; único `(tarea_id, alumno_id)` |
| `listarTemasCon` | el mismo `groupBy` por `tema_id`; `TIPOS_CON_TEMA` suma `foro`; la sección `actividades-con-foros` filtra `tipo in [tarea, foro]` | `(clase_id, tipo, tema_id, …)` y `(clase_id, tema_id, …)` |
| `moverATema` | sin consulta nueva: la rama que sube `tareas.version` también aplica al foro, en su mismo lugar | PK |
| `rechazarSiTienenTareas` | solo en el camino del `409`, una sentencia más: `tarea.count({ categoriaId, publicacion: { tipo: "foro" } })` | `tareas (categoria_id)` y PK de `publicaciones` |
| `leerGradebookCon`, `leerMisCalificacionesCon` (y la exportación) | `SELECT_TAREA` lee también `publicacion.tipo`, en la misma relación ya leída | PK de `publicaciones` |

Sin SQL crudo nuevo, sin consultas en ciclos, sin `instantaneaUnica` nuevas (`foros.ts` sigue en 5), sin encolar.

### 4. Hermanos por mecanismo

**Dónde entra `foro` como tipo** (cada lugar, qué hace y el caso que lo prueba):

| Lugar | Con un foro | Caso |
|---|---|---|
| Temas sin sección (`listarTemas`, `renombrarTema`) | lo cuenta (E1-9: también pasa a «Sin tema» al borrar un tema) | "FORO-1A25: los conteos de los temas: …"; ATQ-FORO-30 |
| Temas con `?seccion=actividades` | no lo cuenta | los mismos |
| Temas con `?seccion=actividades&conForos=si` | lo cuenta | "FORO-1A25: los conteos de los temas: …" |
| Temas con `aprendizaje` o `docente` | no (filtran `material`) | sin caso nuevo; vigiladas de recursos en verde |
| Mover de tema (`moverATema`) | lo mueve y sube `tareas.version` | "FORO-1A25: mover un foro de tema sube tareas.version"; ATQ-FORO-30 |
| "Actividades" sin `conForos` | no lo lista ni lo acepta como cursor | "FORO-1A25: un foro como cursor sin conForos, …"; ATQ-FORO-30 |
| "Actividades" con `conForos=si` | lo lista con `tipo: "foro"`, su `entrega` (alumno) y `puedeMover` (de la rama de la tarea), y es cursor válido | "FORO-1A25: seccion=actividades no trae foros; con conForos=si …" |
| "Trabajo de clase" sin sección | no lo lista (sin cambio) | ATQ-FORO-30 |
| `conForos` sin `seccion=actividades`, con otro valor o repetido | 400 "conForos: no es válido" (trabajo y temas) | "FORO-1A25: un foro como cursor sin conForos, …"; C-7 en el frontend |
| Categorías: el conteo de `GET …/categorias` | cuenta tareas y foros (sin cambio) | "FORO-1A26b: con un foro, y con un foro y una tarea, …" |
| Categorías: el texto del 409 | con solo tareas, el de hoy; con foros, "actividad(es)" | "FORO-1A26b: con solo tareas, …" y "FORO-1A26b: con un foro, …" |
| Gradebook | columna con `tipo` solo con `conTipo=si` | "FORO-1B06: con conTipo=si, …" y "FORO-1B06: sin el parámetro, …" |
| "Mis calificaciones" | ídem | los mismos |
| Exportación | nunca `tipo`, tampoco si se le pide | "FORO-1B06: la exportación nunca lleva tipo, tampoco si se le pide" |
| Riesgo (vencidas sin entregar) | un foro cerrado cuya principal se borra cuenta como vencida sin entregar | "FORO-1A66: con el foro cerrado, no vuelve a publicar (409 FORO_CERRADO), cuenta como vencida sin entregar y el maestro la puede calificar" |
| Borrado definitivo de la clase | cuenta el foro (actividades), su entrega y su calificación; borra todo y manda sus objetos a la cola | "FORO-1B08: …" |
| Duplicar la clase | no copia el foro ni sus archivos, activa o archivada | "FORO-1B09: …" |
| Baja de cuentas | sus participaciones siguen con su nombre; sale de Participantes, gradebook y exportación | "FORO-1B10: …" (los dos) |

**Cada estado del borrado** (el caso de `foros-borrar.integracion.test.ts` que lo prueba):

| Estado | Resultado | Caso |
|---|---|---|
| Principal sin calificar | entrega a `asignado`, sin fecha ni retraso, versión + 1; puede volver a publicar | "FORO-1A66: sin calificación, …" |
| Principal sin calificar, foro cerrado | 409 `FORO_CERRADO` al volver a publicar, vencida sin entregar, calificable | "FORO-1A66: con el foro cerrado, …" |
| Principal calificada (rúbrica y devolución) | todo intacto (entrega, puntajes, devolución, gradebook, "Mis calificaciones", exportación); 409 `PARTICIPACION_YA_PUBLICADA` al volver a publicar; sí replica | "FORO-1A65: …" |
| Con réplicas de tres personas | cascada; bajan las principales y el conteo de la lista de foros | "FORO-1A64: …" |
| Una réplica (de un alumno y de un maestro) | solo ella; baja el conteo de réplicas | "FORO-1A63: …" |
| Dos borrados de la misma principal sin calificar | 204 y 404; versión + 1 una sola vez | "FORO-1A67: dos borrados de una principal sin calificar, …" |
| Dos borrados de la misma principal calificada | 204 y 404; calificación intacta | "FORO-1A67: dos borrados de una principal calificada, …" |
| Dos borrados de la misma réplica | 204 y 404 | "FORO-1A67: dos borrados de una réplica, …" |
| Una principal y una de sus réplicas a la vez | principal 204; réplica 204 o 404; nunca 500 | "FORO-1A67: una principal y una de sus réplicas borradas a la vez: …" |
| Borrado del id viejo contra volver a publicar | 404; la principal nueva y su entrega intactas | "FORO-1A67: un borrado del id viejo …" |
| Réplica en vuelo contra borrar su principal (los dos órdenes) | réplica 201 y el borrado se la lleva / borrado 204 y réplica 404 | "FORO-1A67: una réplica formada antes …" y "FORO-1A67: con el borrado formado antes, …" |
| Borrar contra calificar (los dos órdenes) | conserva / 409 `ENTREGA_MODIFICADA` | "FORO-1A68: calificar formado antes …" y "FORO-1A68: el borrado formado antes …" |
| Clase archivada | 409 al admin, 403 a los demás, nada borrado | "FORO-1B01: …" |
| Borrar no encola | ningún trabajo | "FORO-1A69: borrar una principal y una réplica no encola ningún trabajo" |

### 5. Mutaciones reales

Todas en archivos de "Se toca" de 01b (ninguno de "No se toca", ninguna migración, ningún `.env`, ninguna `*.ataque`). Script: `C:\Users\Carlos\AppData\Local\Temp\claude\cbc20defe2ff00dc\af34580f-db0f-4e17-b8f4-34eb4bf290b3\scratchpad\scripts\mutaciones01b.py` (sobre el de 01a): copia previa, un solo cambio en un ancla que aparece exactamente una vez, corrida, restauración desde la copia y `filecmp.cmp(shallow=False)`. Las 14 dieron `cmp igual: True`, y `git diff --stat -- src` dio la misma línea antes y después (`14 files changed, 382 insertions(+), 46 deletions(-)`).

| Mutación | Archivo | Resultado | Cae |
|---|---|---|---|
| N1: cualquiera borra | `core/autoria.ts` | `Tests  2 failed \| 19 passed (21)` | FORO-1A60, FORO-1A70 |
| N2: una calificada vuelve a sin participar | `core/foros/participacion.ts` | `Tests  4 failed \| 17 passed (21)` | FORO-1A61, FORO-1A65, FORO-1A67 (calificada), FORO-1A68 |
| N3: sin la relectura después del bloqueo | `adapters/db/foros.ts` | `Tests  2 failed \| 16 passed (18)` | FORO-1A67 (dos borrados sin calificar; el id viejo contra volver a publicar) |
| N4: la réplica sin `alFaltarReferencia` | `adapters/db/foros.ts` | `Tests  1 failed \| 17 passed (18)` | FORO-1A67 (el borrado formado antes) |
| N5: `traducirErrorPrisma` sin la rama nueva | `adapters/db/errores.ts` | `Tests  2 failed \| 7 passed (9)` | FORO-1A69 (P2003 y 23503) |
| N6: `TIPOS_CON_TEMA` sin `foro` | `adapters/db/temas.ts` | `Tests  3 failed \| 11 passed (14)` | FORO-1A25 (conteos, mover), ATQ-FORO-30 |
| N7: mover un foro sin subir la versión | `adapters/db/temas.ts` | `Tests  2 failed \| 12 passed (14)` | FORO-1A25 (mover), ATQ-FORO-30 |
| N8: `actividades-con-foros` sin foros | `adapters/db/tareas.ts` | `Tests  1 failed \| 5 passed (6)` | FORO-1A25 (la lista) |
| N9: el texto de la categoría sin la rama de foros | `adapters/db/categorias.ts` | `Tests  1 failed \| 5 passed (6)` | FORO-1A26b (con foros) |
| N10: el gradebook sin `tipo` | `handlers/calificaciones.ts` | `Tests  1 failed \| 3 passed (4)` | FORO-1B06 (con `conTipo=si`) |
| N11: las entregas de la página solo de tareas | `adapters/db/tareas.ts` | `Tests  1 failed \| 5 passed (6)` | FORO-1A25 (la lista) |
| N12: `conForos` sin su condición | `shared/src/tareas.ts` (con `npm run build` de `shared` antes y después; restaurado con `cp` y `cmp`: "cmp igual") | `Tests  1 failed \| 5 passed (6)` | FORO-1A25 (los 400 de `conForos`) |
| N13: la entregada no vuelve | `adapters/db/foros.ts` | `Tests  9 failed \| 9 passed (18)` | FORO-1A65, FORO-1A66 (los dos), FORO-1A67 (varios) |
| N14: la ruta 17 también al maestro | `handlers/foros.ts` | `Tests  4 failed \| 34 passed (38)` | FORO-1A51, FORO-1A49 (rol), FORO-1B01, FORO-1A62 |
| N15: la exportación con `tipo` | `handlers/calificaciones.ts` | `Tests  1 failed \| 3 passed (4)` | FORO-1B06 (la exportación) |

Redundancias declaradas:
- Con N1, FORO-1A62 sigue verde: la ruta exige `roles: ["admin"]` y `requireRole` rechaza al maestro y al alumno antes del adaptador; el `403 BORRADO_NO_PERMITIDO` del adaptador es inalcanzable, como dice §D-11 (paso 4), y la regla la vigilan FORO-1A60 (en `core/`) y FORO-1A70 (en las listas).
- Con N3, los dos borrados de una principal calificada siguen verdes: el segundo no escribe la entrega (conservar) y su `deleteMany` cuenta 0 y responde 404. La relectura la vigilan los otros dos casos de N3.

### 6. Pruebas requeridas de 01b: archivo y título exacto

Rojo primero: FORO-1A60 y FORO-1A61 (`npx vitest run src/core/foros/borrado.test.ts` antes de implementar: `TypeError: puedeBorrarParticipacion is not a function` y `TypeError: efectoDeBorrarPrincipal is not a function`, `Test Files  1 failed (1)`). Las de integración y FORO-1A69 se escribieron después del código: su rojo es el de las 15 mutaciones de §5, que tumban cada caso que vigila una guarda; C-1 bis, C-3 y C-T1 estaban rojas por la ronda 0 y quedaron verdes con la implementación.

- `backend/src/core/foros/borrado.test.ts` › "FORO-1A60: solo el admin borra; el maestro, el alumno autor y otro alumno, no (PB-1 a)"
- `backend/src/core/foros/borrado.test.ts` › "FORO-1A61: calificado conserva la calificación y entregado vuelve a sin participar (PB-2 a)"
- `backend/src/core/foros/borrado.test.ts` › "FORO-1A61: asignado es inalcanzable (la transacción relee la principal después de bloquear la entrega) y lanza ERROR_INTERNO"
- `backend/test/foros-borrar.integracion.test.ts` › "FORO-1A62: el maestro, el alumno autor y otro alumno reciben 403 del rol; un restringido, 403 ACCESO_RESTRINGIDO; el admin con una clase inexistente, 403 SIN_ACCESO_A_LA_CLASE; nada se borra"
- `backend/test/foros-borrar.integracion.test.ts` › "FORO-1A62: el admin con un foro de otra clase, el id de una tarea o una participación de otro foro recibe 404 sin borrar nada"
- `backend/test/foros-borrar.integracion.test.ts` › "FORO-1A63: el admin borra una réplica de un alumno y una de un maestro; la principal y las demás réplicas siguen y el conteo de réplicas baja"
- `backend/test/foros-borrar.integracion.test.ts` › "FORO-1A64: borrar una principal con réplicas de tres personas se lleva todas sus réplicas; bajan la lista de principales y el conteo de la lista de foros"
- `backend/test/foros-borrar.integracion.test.ts` › "FORO-1A65: con la principal calificada (rúbrica y devolución), borrarla deja intactos la entrega, los puntajes, la devolución y las calificaciones de la clase; no puede volver a publicar y sí replicar"
- `backend/test/foros-borrar.integracion.test.ts` › "FORO-1A66: sin calificación, la entrega vuelve a asignado con la versión siguiente; calificar con la versión anterior da 409 ENTREGA_MODIFICADA; con el foro abierto, vuelve a publicar"
- `backend/test/foros-borrar.integracion.test.ts` › "FORO-1A66: con el foro cerrado, no vuelve a publicar (409 FORO_CERRADO), cuenta como vencida sin entregar y el maestro la puede calificar"
- `backend/test/foros-borrar.integracion.test.ts` › "FORO-1A67: una réplica formada antes que el borrado de su principal se inserta y el borrado se la lleva"
- `backend/test/foros-borrar.integracion.test.ts` › "FORO-1A67: con el borrado formado antes, la réplica responde 404 PARTICIPACION_NO_ENCONTRADA, nunca 500 ni P2003"
- `backend/test/foros-borrar.integracion.test.ts` › "FORO-1A67: dos borrados de una principal sin calificar, formados detrás de la entrega: un 204 y un 404, y la versión sube una sola vez"
- `backend/test/foros-borrar.integracion.test.ts` › "FORO-1A67: dos borrados de una principal calificada, formados detrás de la entrega: un 204 y un 404, y la calificación queda intacta"
- `backend/test/foros-borrar.integracion.test.ts` › "FORO-1A67: dos borrados de una réplica, formados detrás de la fila del foro: un 204 y un 404"
- `backend/test/foros-borrar.integracion.test.ts` › "FORO-1A67: una principal y una de sus réplicas borradas a la vez: la principal da 204, la réplica 204 o 404, nunca 500, y no queda ninguna"
- `backend/test/foros-borrar.integracion.test.ts` › "FORO-1A67: un borrado del id viejo formado detrás de la entrega mientras el primero confirma y el alumno publica su principal nueva responde 404; la principal nueva y su entrega quedan intactas"
- `backend/test/foros-borrar.integracion.test.ts` › "FORO-1A68: calificar formado antes que el borrado: el borrado ve calificado y conserva"
- `backend/test/foros-borrar.integracion.test.ts` › "FORO-1A68: el borrado formado antes que calificar: la versión sube y calificar con la anterior recibe 409 ENTREGA_MODIFICADA"
- `backend/test/foros-borrar.integracion.test.ts` › "FORO-1A69: borrar una principal y una réplica no encola ningún trabajo"
- `backend/test/foros-borrar.integracion.test.ts` › "FORO-1A70: las listas de principales y de réplicas devuelven puedeBorrar en true solo para el admin"
- `backend/test/foros-actividades.integracion.test.ts` › "FORO-1A25: seccion=actividades no trae foros; con conForos=si los trae mezclados con las tareas, por fecha, con la entrega del alumno y puedeMover"
- `backend/test/foros-actividades.integracion.test.ts` › "FORO-1A25: un foro como cursor sin conForos, conForos sin seccion=actividades o con otro valor responden 400 VALIDACION «conForos: no es válido» (o el del cursor)"
- `backend/test/foros-actividades.integracion.test.ts` › "FORO-1A25: los conteos de los temas: con seccion=actividades sin foros, con conForos=si con foros, y sin sección el total con foros"
- `backend/test/foros-actividades.integracion.test.ts` › "FORO-1A25: mover un foro de tema sube tareas.version"
- `backend/test/foros-actividades.integracion.test.ts` › "FORO-1A26b: con solo tareas, 409 CATEGORIA_CON_TAREAS con el texto de hoy, letra por letra"
- `backend/test/foros-actividades.integracion.test.ts` › "FORO-1A26b: con un foro, y con un foro y una tarea, el texto habla de actividades (singular y plural) y nada cambia; GET …/categorias cuenta tareas y foros"
- `backend/test/foros-tipo-en-calificaciones.integracion.test.ts` › "FORO-1B06: con conTipo=si, cada columna del gradebook y de Mis calificaciones lleva su tipo (tarea o foro)"
- `backend/test/foros-tipo-en-calificaciones.integracion.test.ts` › "FORO-1B06: sin el parámetro, las columnas son las de siempre, llave por llave (sin tipo)"
- `backend/test/foros-tipo-en-calificaciones.integracion.test.ts` › "FORO-1B06: conTipo=no o repetido responde 400 VALIDACION «conTipo: no es válido»"
- `backend/test/foros-tipo-en-calificaciones.integracion.test.ts` › "FORO-1B06: la exportación nunca lleva tipo, tampoco si se le pide"
- `backend/test/foros-admin-01.integracion.test.ts` › "FORO-1B08: el conteo incluye el foro, su entrega y su calificación; el borrado responde 204, no deja ninguna fila del foro y manda sus objetos a la cola"
- `backend/test/foros-admin-01.integracion.test.ts` › "FORO-1B09: la copia de una clase activa y la de una archivada no tienen foro, ni tareas, participaciones, entregas ni puntajes, ningún archivo del planteamiento se copia y la original queda intacta"
- `backend/test/foros-admin-01.integracion.test.ts` › "FORO-1B10: un alumno dado de baja conserva sus participaciones con su nombre, sale de Participantes, del gradebook y de la exportación; reactivarlo lo devuelve todo"
- `backend/test/foros-admin-01.integracion.test.ts` › "FORO-1B10: un maestro dado de baja que sigue en una clase archivada conserva sus réplicas a la vista"
- `backend/src/adapters/db/errores.test.ts` › "FORO-1A69: con la opción, un P2003 (llave foránea sin fila) se lanza como el AppError de alFaltarReferencia"
- `backend/src/adapters/db/errores.test.ts` › "FORO-1A69: con la opción, un error del driver adapter con el código 23503 de PostgreSQL también se traduce"
- `backend/src/adapters/db/errores.test.ts` › "FORO-1A69: sin la opción, un P2003 se relanza tal cual, como hasta ahora"
- `backend/src/adapters/db/errores.test.ts` › "FORO-1A69: con la opción, un P2002 sigue yendo a alDuplicar y otro código se relanza"

De la lista cerrada (títulos cambiados o casos ampliados, con la ruta 17):
- `backend/test/foros-autorizacion.integracion.test.ts` › "FORO-1A49: sin sesión, cada ruta responde 401 NO_AUTENTICADO", "FORO-1A49: con un rol que la ruta no admite, 403 ROL_NO_PERMITIDO (el admin en 6, 7, 9, 11 y 16; el maestro en 6, 7, 9 y 17; el alumno en las de gestión y en la 17)", "FORO-1A49: un maestro de otra clase y un alumno no inscrito reciben 403 SIN_ACCESO_A_LA_CLASE en cada ruta de su rol", "FORO-1A49: una clase inexistente responde lo mismo que una ajena (403 SIN_ACCESO_A_LA_CLASE)", "FORO-1A49: un alumno inscrito con acceso restringido recibe 403 ACCESO_RESTRINGIDO en las 17 rutas (RN-09)", "FORO-1A50: las 17 rutas, con éxito y con error, para el alumno, el maestro y el admin; las listas de participaciones y réplicas llevan puedeBorrar" y "FORO-1B01: en una clase archivada, cada escritura responde 409 CLASE_ARCHIVADA al rol que la admite y 403 al que no, sin escribir nada". FORO-1B02, FORO-1B03 y FORO-1B05 no cambian (la ruta 17 va aparte, en `conLa17`).
- `backend/test/foros-estatico.test.ts` › "FORO-1A51: cada una de las 17 rutas lleva su protegido exacto de §D-3.1 y §D-11, con enClaseArchivada: «lectura» en las 10 lecturas y sin ella en las 7 escrituras" y "FORO-1A52: adapters/db/foros.ts y actividades.ts sin $queryRaw, $executeRaw ni FOR …, sin consultas en ciclos y sin importar adapters/queue; el único borrado es participacionForo.deleteMany".
- FORO-1B04 (ADM-1A09 con las 17 rutas): `backend/test/clases-archivadas-matriz.integracion.test.ts`, los casos "ADM-1A09 (a)" a "(e)", con la fila nueva.

### 7. Verificación (comando exacto y última línea; una corrida a la vez)

- `shared`: `npm run lint` → `All matched files use Prettier code style!`; `npm run build` → `> tsc -p tsconfig.json` (sin errores).
- `backend`: `npm run lint` → `> tsc -p tsconfig.json --noEmit && tsc -p tsconfig.test.json` (sin errores); `npm run build` → `> tsc -p tsconfig.json` (sin errores).
- `frontend`: `npm run lint` → `> tsc -b` (sin errores); `npm run build` → `✓ built in 1.75s`.
- Suite del backend, módulos tocados y vigiladas (desde `backend/`): `npx vitest run test/foros test/migracion-foro-01 test/clases-archivadas test/tareas test/entregas test/hilo test/calificaciones test/gradebook test/mis-calificaciones test/exportacion test/temas test/categorias test/muro test/admin-muro test/logs-muro test/trabajo test/instantanea test/referencias src/core src/adapters test/sesiones-y-cadena test/lecturas-fx test/arquitectura-cuentas test/bloqueo-usuario test/higiene-de-pruebas test/gestion-clases-autorizacion test/movimientos-inscripcion test/recursos test/dudas test/duplicado-de-clase test/borrado test/migracion-tareas test/migracion-clases03a test/esquemas test/autoria-02b test/guarda-todas-las-rutas test/middleware-orden test/usuarios-admin-baja` → `Tests  1901 passed (1901)` (`Test Files  177 passed (177)`).
- Las cuatro `*.ataque` del backend de la ronda 0, aparte: `npx vitest run test/sesiones-y-cadena.ataque.test.ts test/lecturas-fx-r2.ataque.test.ts test/foros-01a-r1-tipo-y-validacion.ataque.test.ts test/foros-01a-r1-ids-y-fugas.ataque.test.ts` → `Tests  67 passed (67)` (`Test Files  4 passed (4)`).
- Frontend, una después de otra (desde `frontend/`): `npx vitest run src/lib` → `Tests  296 passed (296)` (incluye C-7); `npx vitest run src/features/clases` → `Tests  3068 passed (3068)`; `npx vitest run src/features/tareas` → `Tests  1355 passed (1355)`; `npx vitest run src/features/calificaciones` → `Tests  474 passed (474)`.
- Conteo: `npx vitest list src/core/foros/borrado.test.ts test/foros-borrar test/foros-actividades test/foros-tipo-en-calificaciones test/foros-admin-01 src/adapters/db/errores.test.ts test/foros-autorizacion test/foros-estatico`, contado con `grep -a`: **35 casos `FORO-` en los 5 archivos nuevos** (`borrado.test.ts` 3, `foros-borrar` 18, `foros-actividades` 6, `foros-tipo-en-calificaciones` 4, `foros-admin-01` 4) y **4 en `errores.test.ts`** (FORO-1A69). Total de casos `FORO-` de FORO-01 fuera de las `*.ataque`: `npx vitest list test/foros test/migracion-foro-01 src/core/actividades.test.ts src/core/foros src/core/clases/duplicado-con-foros.test.ts src/adapters/db/errores.test.ts | grep -a ' > ' | grep -av '\.ataque\.' | grep -ac 'FORO-'` → **134** (eran 95), en 16 archivos.

### 8. Desviaciones, dudas y lo no verificado

Desviaciones (ninguna toca un archivo fuera de "Se toca" ni una prueba fuera de la lista cerrada):
1. **`mensajeConActividades` vive en `adapters/db/categorias.ts`** y reemplaza a `mensajeConTareas`, privada. El arbitraje decía `core/tareas/categorias.ts` o fuera de esa carpeta; `core/tareas/categorias.ts` no está en "Se toca" de 01b, así que va fuera, en el archivo que ya lo estaba.
2. **`listarParticipaciones` y `listarReplicas` reciben `actor` (`ParticipanteDeAutoria`) en lugar de `actorId`**, para calcular `puedeBorrar` con `puedeBorrarParticipacion`. El handler pasa `perfilDe(request)`.
3. **`borrarParticipacion` devuelve `false` si el foro no existe o es de otro tipo** y el handler responde `404 TAREA_NO_ENCONTRADA` "Ese foro ya no existe.", como las demás rutas del foro; la participación que falta sí la lanza el adaptador (`404 PARTICIPACION_NO_ENCONTRADA`).
4. **`columnaParaResponder` se llama con una flecha en las tres rutas** (`.map((tarea) => columnaParaResponder(tarea, …))`): con el segundo parámetro, pasarla como referencia a `.map` le daría el índice como `conTipo`.
5. **La ruta 17 va aparte en las pruebas**: `rutaDeBorrarParticipacion` es una exportación nueva de `ayudas-foros.ts` (sin cambiar `rutasDelForo`), y `foros-autorizacion` la suma solo a FORO-1A49, FORO-1A50 y FORO-1B01 (`conLa17`). Así no cambian FORO-1B02, FORO-1B03, FORO-1B05, FORO-1A47 ni ATQ-FORO-10.
6. **`errores.ts` también traduce el `23503` de PostgreSQL** que adjunta el driver adapter, además del `P2003`, con la misma lectura de `codigoDePostgres` que ya usaba el `22021`.
7. **Un archivo más que el estimado:** la ayuda `ayudas-foros.ts` (33 en lugar de ~32).

Dudas: ninguna nueva. La conducta de la ruta 17 en una clase archivada (cerrada también para el admin) es S-E3-1, aceptada.

No verificado:
- La suite completa de cada paquete (la corre el manager al cerrar).
- Los casos de concurrencia de FORO-1A67 y FORO-1A68 dependen de que PostgreSQL entregue la fila retenida en el orden en que las operaciones se formaron (`formadasDetrasDe`); pasaron en las dos corridas que hice (la del archivo solo y la de los módulos), pero es un orden del motor, no una garantía del código.
- No se abrió ningún navegador; 01b no tiene interfaz.

## Implementación — FORO-01c1 (2026-11-16)


Plan: `docs/trabajo/FORO-01-actividad-tipo-foro/plan.md` (§E8.3, 01c1: la sección «Foro» y su lista). Solo `frontend/`; no se corrió nada del backend ni se tocó `shared/`.

Estado: **terminado** (sin PARADA).

### Archivos (23, contra ~23 estimados)

Producción (7):
- `frontend/src/features/clases/foros-view.tsx` (nuevo): `ForosView` y `ForosDeLaClase`, sobre el patrón de `DudasView`.
- `frontend/src/features/clases/data.ts`: `TEXTOS_CLASE.foro`, la entrada `foro` tercera de `SECCIONES_DE_LA_CLASE`, `LIMITE_FOROS` y `TEXTOS_FOROS`; PR-1A17: sale `TEXTOS_FORMULARIO_PUBLICACION.sinTema` y `TEXTOS_TRABAJO.sinTema` pasa a `TEXTOS_DE_LA_CLASE.sinTema`.
- `frontend/src/features/clases/hooks.ts`: `useForos` (infinita, `claveListaDeForos`, `listaForosRespuestaSchema`, `LIMITE_FOROS`).
- `frontend/src/features/clases/types.ts`: reexporta `ElementoDeForo` y `ListaForosRespuesta` de `@campus/shared`.
- `frontend/src/features/clases/components/fila-de-entrega.tsx`: props opcionales `rotulo` (por omisión `TEXTOS_TRABAJO.tarea`) y `complemento` (se pinta a la derecha).
- `frontend/src/services/trabajoService.ts`: solo `clavePrefijoDeForos` y `claveListaDeForos`.
- `frontend/src/app/router.tsx`: `{ path: "foro", element: <ForosView /> }` en las tres ramas.

Pruebas nuevas (2):
- `frontend/src/features/clases/foros-01c.test.tsx`
- `frontend/src/features/clases/recuperar-foros-01c.test.tsx`

Pruebas normales de la lista cerrada (7), cada una solo con lo que pide §E8.2 y PR-1A17:
- `frontend/src/features/clases/secciones-03c1.test.tsx`
- `frontend/src/features/clases/clase-layout.test.tsx`
- `frontend/src/features/clases/lib.test.ts`
- `frontend/src/features/clases/recursos-lib-03d.test.ts`
- `frontend/src/app/router-01d.test.tsx`
- `frontend/src/features/clases/dudas-caminos-03e.test.tsx`
- `frontend/src/features/tareas/como-se-entrega-01a.test.tsx` (línea 262, PR-1A17; y la 241, ver desviación 2)

`*.ataque` de la ronda 0 (7), no tocadas por mí; aparecen en `git status` porque el tester las dejó modificadas: `app/rutas-01d-r1`, `clases/clases-admin-02c-r1`, `clases/estatico-02c-r1`, `clases/heredados-02d-r1`, `clases/indicador-03c1-r1`, `clases/indicador-03c1-r2`, `styles/clases-r1`. Las siete pasan (ver verificación).

### Pruebas requeridas (01c1)

| Viñeta | Archivo | Título exacto |
|---|---|---|
| FORO-1C01 (su parte de 01c1) | `foros-01c.test.tsx` | "FORO-1C01: indiceDeSeccionActiva da 2 en …/foro, …/foro/ y …/FORO, y -1 en …/foros y …/foros/x (%s)" ×3 roles; "FORO-1C01: %s en …/foro ve las siete secciones con «Foro» tercera, con su href y aria-current, y la vista monta «Foro»" ×3 roles |
| FORO-1C02 | `foros-01c.test.tsx` | "FORO-1C02: cargando, vacío y datos, en ese orden"; "FORO-1C02: con la primera página fallida (5xx), la lista se reemplaza por su mensaje de error, sin aviso"; "FORO-1C02: el maestro y el admin ven el conteo de participaciones y «Crear foro»; las filas llevan «Foro:» y van al foro" (×2); "FORO-1C02: el alumno ve su frase, sin «Crear foro», y el estado de su participación en cada fila (con retraso, calificado)"; "FORO-1C02: entrega null y { estado: asignado, conRetraso: false } se pintan igual, con el foro abierto y vencido (S-10)" (×2) |
| FORO-1C03 | `foros-01c.test.tsx` | "FORO-1C03: pide la página siguiente con el cursor, lleva el foco al primer foro nuevo y, en la última página, ya no se ofrece"; "FORO-1C03: con la lista marcada vieja, pulsar «Foro» la recarga y «Ver más foros» queda en espera hasta que llega" |
| FORO-1C14 (la lista) | `foros-01c.test.tsx` | "FORO-1C14: %s en una clase archivada ve la lista, sin «Crear foro»" (maestro y admin) |
| FORO-1C20 | `recuperar-foros-01c.test.tsx` | "FORO-1C20: pulsar «Foro» estando ahí pide la primera página otra vez y la frase desaparece" |
| FORO-1C21 | `recuperar-foros-01c.test.tsx` | "FORO-1C21: ir a «Avisos» y volver antes de 30 s pide la primera página y la frase desaparece" |
| FORO-1C22 | `recuperar-foros-01c.test.tsx` | "FORO-1C22: atrás y adelante del historial piden la primera página y la frase desaparece" |
| FORO-1C23 | `recuperar-foros-01c.test.tsx` | "FORO-1C23: con la frase a la vista no se ofrece «Ver más foros» y no hay aviso" |
| FORO-1C50 («Ver más foros») | `foros-01c.test.tsx` | "FORO-1C50: dos clics en el mismo render de «Ver más foros» piden una sola página" |
| FORO-1C51 | `foros-01c.test.tsx` | "FORO-1C51: con %s, la lista se queda, un solo aviso, «Ver más foros» sigue a la vista y el foco queda en el botón" (503 y sin red); "FORO-1C51: mientras una recarga la recupera (pulsar «Foro»), la lista se ve sin error; si esa recarga falla, la reemplaza" |
| FORO-1C52 (la lista entre dos clases) | `foros-01c.test.tsx` | "FORO-1C52: la lista de la clase A con un «Ver más» en vuelo no hereda su aviso al saltar a la clase B" |
| FORO-1C53 («Ver más foros») | `foros-01c.test.tsx` | "FORO-1C53: con %s, ningún aviso" (401 sin refresco, 403 ACCESO_RESTRINGIDO, 403 CAMBIO_DE_CONTRASENA_REQUERIDO) |
| FORO-1C54 | `foros-01c.test.tsx` | "FORO-1C54: con la lista en error, pulsar «Foro» la pide una sola vez"; "FORO-1C54: con la lista vieja, una sola petición; sana y fresca, ninguna"; "FORO-1C54: con una petición en vuelo, pulsar «Foro» no la cancela ni la duplica"; "FORO-1C54: salir y volver antes de 30 s con la lista en error la pide" |

Las demás viñetas de §E8.3 (crear, editar, el foro, su lectura, FORO-1C05 a 1C13, 1C24 a 1C27, 1C37, y FORO-1C01 en `foros/:foroId`) son de 01c2 y no están cubiertas aquí.

### Red-first

La mutación F0 deja la vista sin contenido (`{() => null}` en el render prop de `ForosView`). Con ella, `npx vitest run src/features/clases/foros-01c.test.tsx src/features/clases/recuperar-foros-01c.test.tsx` da `Tests  28 failed | 3 passed (31)`. Los 3 casos que sobreviven son los de `indiceDeSeccionActiva` (FORO-1C01, uno por rol): dependen de `SECCIONES_DE_LA_CLASE` y caen con F9. Las 4 frases de recuperación caen. La primera corrida de las dos pruebas contra el código ya escrito fue en rojo por defectos de la prueba (la regex del nombre de la fila, el `alert` vacío y la ruta de Avisos). Esos defectos se corrigieron en la prueba, no en la vista.

### Verificación (desde `frontend/`, una corrida a la vez)

- `npm run lint`: salida 0. Última línea: `> tsc -b`, sin errores; antes, `All matched files use Prettier code style!`.
- `npx vitest run src/features/clases`: `Tests  3099 passed (3099)`, con `Test Files  126 passed (126)`.
- `npx vitest run src/app src/lib src/styles src/features/tareas/como-se-entrega-01a.test.tsx`: `Tests  1111 passed (1111)`, con `Test Files  63 passed (63)`.
- `npm run build`: `✓ built in 882ms`.
- La suite completa del paquete no se corrió; la corre el manager al cerrar.

### Conteos

- `npx vitest list src/features/clases/foros-01c.test.tsx src/features/clases/recuperar-foros-01c.test.tsx`, contado con `grep -a -c`, da 31 casos: 27 de `foros-01c` (`grep -a -c "^src/features/clases/foros-01c"`) y 4 de `recuperar-foros-01c`.
- `enEspera=` en producción: `grep -rho "enEspera=" frontend/src --include=*.tsx --exclude=*.test.tsx | wc -l` da 91, de 90 a 91. El único nuevo está en `foros-view.tsx` (`grep -c` da 1). Con las pruebas son 92: una prueba `.test.tsx` ajena también lo menciona. V-06 de `styles/clases-r1.ataque.test.ts` (91) pasa.
- Archivos: `git status --short frontend` da 20 modificados y 3 nuevos, o sea 23, contra ~23 estimados. Ninguno fuera de "Se toca", aparte de las 7 `*.ataque` del tester.

### `*.ataque` de la ronda 0

Las siete pasan, dentro de las dos corridas de arriba:
- C-9: `indicador-03c1-r1` y `-r2`.
- C-10: `rutas-01d-r1` y `clases-admin-02c-r1`. Es condicional y aplica, porque la vista llama a `perspectivaDeRuta(`.
- C-11: `styles/clases-r1`, con 91 `enEspera=`.
- C-17 a C-20: `estatico-02c-r1` y `heredados-02d-r1`.

No toqué ninguna.

### Matriz de avisos y recargas (§D-10, `ForosView`), confirmada con dos correcciones

| Disparador | Clase de error | Qué se renueva | Qué se anuncia | Foco |
|---|---|---|---|---|
| Primera página | `5xx` o red | — | Reemplaza con `MensajeError`, sin aviso. **Corrección:** el texto es el genérico del módulo de `mensajeDeErrorDeLista` ("Algo salió mal. Inténtalo de nuevo."), no "No pudimos cargar los foros." (desviación 1). Un `503 SERVICIO_OCUPADO` muestra el texto del servidor traducido, como en Dudas | `h2` (`useFocoAlPasarAError`) si el control enfocado desaparece |
| Primera página | `VALIDACION` de `claseId` | — | Reemplaza con el texto fijo del lugar (`mensajeDeConsultaClases`) | ídem |
| Primera página | Redirige (`401`, `ACCESO_RESTRINGIDO`, `CAMBIO_DE_CONTRASENA_REQUERIDO`) | — | Nada: `apiClient` saca a la persona | — |
| «Ver más foros» | `400` del cursor | La lista sale de la caché (`useListaConservadaTrasLaPagina` no la conserva) | La frase, sin aviso, sin «Ver más foros» (FORO-1C23) | `h2` |
| «Ver más foros» | `5xx` o red | — | Un aviso (`useAvisoDeRecargaFallida`); la lista se queda y el botón sigue a la vista (FORO-1C51) | Se queda en el botón |
| «Ver más foros» | Redirige | — | Ningún aviso (FORO-1C53) | — |
| «Ver más foros» en vuelo a la vez | Segundo clic | — | Una sola página (FORO-1C50) | — |
| «Ver más foros» en vuelo con la vista desmontada (salto a la clase B) | Cualquiera | — | La clase B no hereda el aviso (`key={claseId}` y la clave del gancho; FORO-1C52) | — |
| Pulsar «Foro» estando ahí | Lista en error o vieja | Una petición, sin cancelar ni duplicar lo que vuela (FORO-1C54, FORO-1C03) | Si la recarga falla, reemplaza la lista. **Corrección:** con la lista conservada, mientras la recarga vuela no se ve error (FORO-1C51) | `h2` si el foco estaba en una fila (FORO-1C51, aserción nueva) |
| Salir y volver antes de 30 s | Lista en error | La pide de nuevo (FORO-1C54) | — | — |

01c1 no tiene mutaciones (crear, editar y borrar son de 01c2). Por eso no hay filas `409` ni `onError` con la vista desmontada.

### Frase de recuperación: «La lista de foros cambió mientras la veías. Vuelve a abrir Foro para verla completa.»

Un caso por camino, con el router real y `Providers`. En cada uno, la primera petición nueva va sin `cursor`, aparece "Foro 7" y la frase desaparece:
- **FORO-1C20:** pulsar «Foro» estando ahí, otra `location.key`.
- **FORO-1C21:** ir a «Avisos» y volver antes de 30 s.
- **FORO-1C22:** atrás y adelante del historial, con `router.navigate(-1)` y `router.navigate(1)`.
- **FORO-1C23:** repetir el control que falló no es posible, porque «Ver más foros» no se ofrece. El caso comprueba también que no hay `toast.error`.
- Otro filtro u otra ventana: la lista no los tiene.

### Hermanos por mecanismo (contra `DudasView`)

| Mecanismo de `DudasView` | En `ForosView` |
|---|---|
| `useListaConservadaTrasLaPagina` | Sí, con `claveListaDeForos` |
| `useAvisoDeRecargaFallida` con `claseId` | Sí |
| `useFocoAlPasarAError` | Sí. Lo vigila la aserción nueva de FORO-1C51 (mutación F14) |
| `useRecargarAlPulsarLaSeccion` | Sí |
| `useMarcarViejaSiQuedoEnError` | Sí. Su mutación sobrevive (ver abajo) |
| `useFocoAlCargarMas` con fila y `h2` | Sí, con el enlace de la fila (`[data-foro-id] a`) |
| `enEspera={isFetching}` y `fetchNextPage({ cancelRefetch: false })` | Sí |
| `key` por clase | **Distinto a propósito:** Dudas monta `DudasDeLaClase` sin `key` y lleva la clase en sus ganchos (lista cerrada de CH6-A30). Foro va con `key={claseId}`, como pide el encargo. Así no necesita `clasePrevia` en `enfocarForo` |
| Foco de la fila al borrar o marcar (`useFilaEnFoco`, `vecinaDeFila`) | No aplica: la lista de foros no tiene acciones por fila |
| Guarda síncrona con ref en «Ver más» | Dudas no la lleva; Foro sí, porque el encargo la pide. Es redundante (ver abajo) |

Estados del mecanismo de la lista:
- primera carga;
- recarga sana;
- recarga en error con caché;
- fallo de página conservado y luego recuperado;
- dos fallos seguidos: el aviso se da uno por fallo, por `errorUpdateCount`;
- cambio de clase;
- salir y volver.

Todos están cubiertos por los casos de arriba, salvo "dos fallos de «Ver más» seguidos". Ese camino lo cubre el gancho compartido y su prueba en Dudas; aquí no tiene un caso propio.

### Mutaciones

Todas en archivos de "Se toca": `foros-view.tsx` y `data.ts`. Cada una con copia, ancla única, restauración y `filecmp` igual. Los SHA-256 de antes y después coinciden: `foros-view.tsx` `fa50946c…d115` y `data.ts` `0c3be335…f921`. Script: `scratchpad/scripts/mutaciones01c.py`.

| Mutación | Resultado |
|---|---|
| F0 vista vacía | 28 caídos de 31 |
| F1 sin `key={claseId}` | Cae CH6-A30 (a) |
| F2 sin la guarda `cargandoMasRef` | **Sobrevive** |
| F3 `fetchNextPage()` sin `cancelRefetch` | Cae CH4-03 |
| F4 sin `useRecargarAlPulsarLaSeccion` | 5 caídos (FORO-1C20, 1C03, 1C51 y 1C54 ×2) |
| F5 sin `useMarcarViejaSiQuedoEnError` | **Sobrevive** |
| F6 sin conservar (`isError` a secas) | 3 de FORO-1C51 |
| F7 «Crear foro» en archivada | FORO-1C14 ×2 |
| F8 sin complemento | FORO-1C02 ×3 |
| F9 sin la sección `foro` | 14 caídos |
| F10 `enEspera={isFetchingNextPage}` | FORO-1C03 (espera en la recarga) |
| F11 frase para todos | FORO-1C02 maestro y admin |
| F12 sin `useAvisoDeRecargaFallida` | FORO-1C51 ×3 |
| F13 sin `enlace.focus()` | FORO-1C03 |
| F14 sin `useFocoAlPasarAError` | Sobrevivía. Agregué la aserción de foco en el `h2` cuando la recarga fallida quita la fila enfocada al caso "FORO-1C51: mientras una recarga la recupera…". Primero la probé con el foco en «Ver más foros»: sobrevivió, porque `useFocoAlCargarMas` ya lleva ese foco al `h2`; con el foco en una fila, cae |

Redundancias declaradas:
- **F2:** la guarda síncrona de «Ver más foros» es redundante con `fetchNextPage({ cancelRefetch: false })`. Un segundo `fetchNextPage` con una página en vuelo devuelve la misma promesa y no pide otra. La dejo porque el encargo la pide (CHORE-04); FORO-1C50 la verifica junto con `cancelRefetch`.
- **F5:** `useMarcarViejaSiQuedoEnError` es redundante con TanStack Query 5.103.2, que ya deja inválida la consulta en error al salir. `CLAUDE.md` lo registra como garantía escrita. FORO-1C54 ("salir y volver…") pasa con y sin el gancho.

### Desviaciones y dudas

1. **El texto del error de la primera página.** §D-9 propone "No pudimos cargar los foros.", pero no lo uso. Para producirlo haría falta una función nueva en `features/clases/lib.ts`, o una entrada en la traducción del módulo, y ese archivo no está en "Se toca" de 01c1. Seguí a `DudasView` con `mensajeDeErrorDeLista(error, TEXTOS_FOROS.cambioMientrasLosVeias)`, que muestra el genérico del módulo ante un `5xx`. Decide el manager o el arquitecto: aceptarlo, o abrir `lib.ts` en 01c2 o 01e para ese texto.
2. **`como-se-entrega-01a.test.tsx`, línea 241.** Además de la 262 de PR-1A17, cambié el tipo del glob a `TEXTOS_FORMULARIO_RECURSO`. Sin ese cambio, `tsc -b` falla: el tipo nombraba `TEXTOS_FORMULARIO_PUBLICACION.sinTema`, que PR-1A17 quita. Es la misma prueba de la lista cerrada y la misma consecuencia de PR-1A17.
3. **Nombres de las props nuevas de `FilaDeEntrega`.** El plan no los fija; elegí `rotulo` (por omisión, "Tarea:") y `complemento` (opcional, a la derecha). Las filas de "Actividades" siguen sin cambio.
4. **La fila del alumno no pasa `entrega` a `FilaDeEntrega`.** La segunda línea queda con la fecha límite y el estado va como `complemento`, con `EstadoEntregaBadge` y `estadoDeEntregaVisible`. Así no se pinta dos veces el mismo estado.
5. **La guarda con ref de «Ver más foros» es redundante** (F2, arriba). Se deja porque el encargo la pide.

### Patrón visual nuevo

La fila de entrega con un complemento a la derecha: la insignia del estado para el alumno, y el conteo "{n} participaciones" en texto atenuado para el maestro y el admin. Es una variante de un patrón existente de `DESIGN.md`. No toqué `DESIGN.md`, que no está en "Se toca" de 01c1: queda para documentarlo en 01e, como prevé el plan.

### No verificado

- La suite completa del paquete; la corre el manager al cerrar.
- No abrí ningún navegador. El aspecto de la fila con complemento y el orden de las siete secciones en pantalla angosta los cubren solo las pruebas automáticas (medidas de `secciones-03c1` y `clase-layout`).
- "Dos fallos de «Ver más foros» seguidos" no tiene un caso propio en `ForosView` (ver hermanos).

## Corrección tras la verificación del manager — FORO-01c1: M-10 (2026-11-16)


## Corrección tras la verificación del manager — FORO-01c1: M-10 (2026-11-16)

Estado: **terminado**, sin PARADA. N-28 salió rojo contra el código y su remedio cabía en `foros-view.tsx`, así que lo apliqué; no toqué `components/foco/`.

### M-10: corregido

FORO-1C51 ya tiene los tres caminos de su viñeta. Los dos que faltaban están en `frontend/src/features/clases/foros-01c.test.tsx`, en el bloque "FORO-1C51 · la lista conservada con la vista montada de nuevo (M-10)". Cada camino tiene dos variantes: la recarga responde, o la recarga falla.
- **Volver:**
  - "FORO-1C51 (volver): con la lista conservada, ir a «Avisos» y volver a «Foro» con la recarga en vuelo la muestra sin error; si la recarga responde, llegan las filas"
  - "FORO-1C51 (volver): con la lista conservada, ir a «Avisos» y volver a «Foro» con la recarga en vuelo la muestra sin error; si la recarga falla, la reemplaza"
- **Saltar de clase:**
  - "FORO-1C51 (saltar de clase): con la lista de A conservada, ir a «Foro» de B y regresar a A con el historial y la recarga en vuelo la muestra sin error; si la recarga responde, llegan las filas"
  - "FORO-1C51 (saltar de clase): con la lista de A conservada, ir a «Foro» de B y regresar a A con el historial y la recarga en vuelo la muestra sin error; si la recarga falla, la reemplaza"
- **Pulsar «Foro»:** sigue siendo el caso que ya existía, "FORO-1C51: mientras una recarga la recupera (pulsar «Foro»), la lista se ve sin error; si esa recarga falla, la reemplaza".

Cómo están armados los casos nuevos:
- Usan el router real (`rutas`) y `Providers`.
- Primero, «Ver más foros» falla con un 503 y se ve un aviso. Después se retiene la primera página de A hasta que la prueba la suelta; cada petición, incluido el reintento, recibe su propia respuesta.
- Mientras la recarga vuela, cada caso comprueba:
  - que se ve "Foro 6";
  - que no hay `role="alert"` ni el texto "Algo salió mal. Inténtalo de nuevo.";
  - que `document.activeElement` no cambia después de esperar.
- Si la recarga responde, llegan las filas (también "Foro 25") y no aparece ningún `alert`. Si falla, aparece el `alert` y la lista desaparece.
- En el salto de clase, además, hay un solo aviso en total: A no repite su aviso al volver.

Ningún caso salió rojo contra el código: los cuatro pasaron a la primera.

### N-30: atendido

Caso nuevo, en el bloque "FORO-1C51 · dos fallos seguidos de «Ver más foros» (N-30)": "FORO-1C51: dos fallos seguidos dan dos avisos, uno por fallo; la lista y «Ver más foros» siguen a la vista". Pasó a la primera.

### N-28: atendido y declarado

**Declaración:** la vista sigue a `DudasView` y no usa la raíz con `tabIndex={-1}` ni `useFocoAlPerderseElControl` de §D-8.2. El destino del foco es el `h2` con `tabIndex={-1}`. §E7.3, punto 5, lo permite.

**Caso nuevo,** en el bloque "FORO-1C02 · una recarga correcta que quita la fila enfocada (N-28)": "FORO-1C02: si una recarga correcta quita el foro que tenía el foco, el foco va al h2, nunca a <body>". Simula la recarga con `invalidateQueries`, que sirve igual para `refetchOnReconnect`.

**Salió rojo contra el código** (`Received element with focus:` vacío, o sea `<body>`). Es un hallazgo de producción y lo corregí en `foros-view.tsx`, que está en "Se toca":
- `useFilaEnFoco("data-foro-id")`, de `./hooks`, recuerda qué foro tenía el foco.
- Un efecto lleva el foco al `h2` si ese foro ya no está y el foco se perdió (`focoPerdido`, de `./lib`).
- Así queda cubierta cualquier recarga, sea correcta o fallida.
- No toqué `components/foco/`, `hooks.ts` ni `lib.ts`; solo usé lo que ya exportan.

### N-29: corregido

Fila corregida de la matriz:

| Disparador | Clase de error | Qué se renueva | Qué se anuncia | Foco |
|---|---|---|---|---|
| «Ver más foros» | `400` del cursor | La lista **no** sale de la caché: queda en error con sus datos. Al salir, `useMarcarViejaSiQuedoEnError` la marca vieja (la librería ya lo hace). Al volver, al pulsar «Foro» o con atrás y adelante, la política única la pide desde la primera página (FORO-1C20 a FORO-1C22) | La frase, sin aviso y sin «Ver más foros» (FORO-1C23) | `h2` (`useFocoAlPasarAError`, o el efecto de N-28 si el foco estaba en una fila) |

### El texto del error de la primera página: decisión del humano

El humano decidió el 2026-11-16 que se queda el genérico del módulo, "Algo salió mal. Inténtalo de nuevo.", igual que en Dudas, Avisos y Recursos. No se usa "No pudimos cargar los foros." y `features/clases/lib.ts` no se toca. No cambié código por esto.

Fila corregida de la matriz:

| Disparador | Clase de error | Qué se renueva | Qué se anuncia | Foco |
|---|---|---|---|---|
| Primera página | `5xx` o red | — | Reemplaza con `MensajeError`, sin aviso, con el genérico "Algo salió mal. Inténtalo de nuevo." (decisión del humano del 2026-11-16). Un `503 SERVICIO_OCUPADO` muestra el texto del servidor traducido, como en Dudas | `h2` si el control enfocado desaparece |

### Mutaciones

Todas en archivos de "Se toca": `foros-view.tsx` y `hooks.ts` de `features/clases`. Cada una con copia, ancla única, restauración y `filecmp` igual (`cmp igual: True`). Los SHA-256 de los dos archivos coinciden antes y después:
- `foros-view.tsx`: `099c3eaa…f962`
- `hooks.ts`: `2892d76c…0854`

Script: `C:\Users\Carlos\AppData\Local\Temp\claude\cbc20defe2ff00dc\af34580f-db0f-4e17-b8f4-34eb4bf290b3\scratchpad\scripts\mutaciones01c.py`.

| Mutación | Remedio que quita | Resultado |
|---|---|---|
| G1, en `hooks.ts` | La memoria por consulta de `useListaConservadaTrasLaPagina` (`return ahora`: solo el fallo de ahora) | 5 caídos: «pulsar» y los 4 casos de volver y saltar de clase |
| F6 | La conservación en la vista (`if (foros.isError)`) | 8 caídos: los 3 de antes de FORO-1C51, los 4 de M-10 y el de N-30 |
| G2 | El efecto de N-28 (sin `encabezadoRef.current?.focus()`) | Cae el caso de N-28 |
| G3 | Un aviso por fallo (`errorUpdateCount > 0 ? 1 : 0`) | Cae el caso de N-30 |
| F14 | `useFocoAlPasarAError` | **Ahora sobrevive** (en la ronda anterior caía) |

F14 queda como redundancia declarada, con su mecanismo:
- Los únicos controles enfocables de la lista son los enlaces de las filas y «Ver más foros».
- Si una recarga fallida reemplaza la lista, el foco que estaba en una fila lo lleva al `h2` el efecto de N-28. El que estaba en «Ver más foros» lo lleva `useFocoAlCargarMas`.
- Dejo el gancho porque es parte de la política de lista de `DudasView`, que §E7.3 manda seguir.

Las redundancias anteriores (F2 y F5) no cambian.

### Hermanos, viñeta por viñeta

| Viñeta | Camino o variante | ¿Tiene su caso? |
|---|---|---|
| FORO-1C20 a FORO-1C23 | Frase del cursor: pulsar «Foro», ir a Avisos y volver, atrás y adelante, y «Ver más» no ofrecido | Sí, uno por camino |
| FORO-1C20 a FORO-1C23 | Saltar a Foro de otra clase y volver; pulsar «Foro» dos veces con la frase a la vista | **No.** El plan no los inventarió (el manager los deja como punto de ataque). El primero pasa por el mismo mecanismo que FORO-1C22 con `key={claseId}` |
| FORO-1C50 | Dos clics en el mismo render | Sí |
| FORO-1C50 | Clic durante una recarga | Sí (FORO-1C03, espera) |
| FORO-1C51 | 503 y sin red | Sí |
| FORO-1C51 | Recuperación al pulsar, al volver y al saltar de clase, cada una con la recarga que responde y la que falla | Sí (pulsar solo con la que falla; volver y saltar con las dos) |
| FORO-1C51 | Dos fallos seguidos | Sí (N-30) |
| FORO-1C52 | «Ver más» en vuelo al saltar de A a B | Sí |
| FORO-1C52 | Volver a A después de que A falló con la vista desmontada | Parcial: el caso "saltar de clase" de M-10 vuelve a A con un fallo ya conservado y comprueba que hay un solo aviso. No hay un caso en que A falle mientras está desmontada y luego se vuelva |
| FORO-1C53 | 401 sin refresco, `ACCESO_RESTRINGIDO` y `CAMBIO_DE_CONTRASENA_REQUERIDO` en «Ver más» | Sí, los tres |
| FORO-1C53 | Los mismos tres en la **primera** página | **No.** La viñeta de 01c1 habla de «Ver más foros». Queda como punto de ataque |
| FORO-1C54 | En error, vieja, sana y fresca, en vuelo, salir y volver | Sí, los cinco estados |

Estados del mecanismo del foco (el mecanismo de N-28) y si el remedio les aplica:
- **Recarga correcta que quita la fila enfocada:** sí, es el caso nuevo.
- **Recarga fallida que reemplaza la lista con el foco en una fila:** sí, la cubren el efecto y `useFocoAlPasarAError`.
- **Foco en «Ver más foros» cuando se acaba la lista:** ya lo cubre `useFocoAlCargarMas` (FORO-1C03).
- **Cambio de clase:** la vista se monta de nuevo con `key={claseId}` y la ref empieza en `null`.
- **Una fila que sigue en la lista:** no se mueve el foco.
- **Dos recargas seguidas:** después del primer traslado, la ref queda en `null` y no vuelve a mover el foco.

### Producción

Un solo archivo, `frontend/src/features/clases/foros-view.tsx`:
- importa `useEffect`, `useFilaEnFoco` y `focoPerdido`;
- suma el efecto de N-28.

Sin cambios de `enEspera=`: siguen siendo 91.

### Verificación (desde `frontend/`, una corrida a la vez)

| Comando | Última línea |
|---|---|
| `npm run lint` | salida 0; termina en `> tsc -b`, sin errores |
| `npx vitest run src/features/clases` | `Tests  3105 passed (3105)` (`Test Files  126 passed (126)`) |
| `npx vitest run src/app src/lib src/styles src/features/tareas/como-se-entrega-01a.test.tsx` | `Tests  1111 passed (1111)` (`Test Files  63 passed (63)`) |
| `npm run build` | `✓ built in 853ms` |

No corrí la suite completa del paquete.

### Conteos

- **Casos:** `npx vitest list src/features/clases/foros-01c.test.tsx src/features/clases/recuperar-foros-01c.test.tsx`, contado con `grep -a -c`, da 37:
  - `^src/features/clases/foros-01c`: 33, contra 27 antes (4 de M-10, 1 de N-30 y 1 de N-28);
  - `^src/features/clases/recuperar-foros-01c`: 4.
  - La suite de `features/clases` pasa de 3099 a 3105, los mismos 6.
- **`enEspera=` en producción:** `grep -rho "enEspera=" src --include=*.tsx --exclude=*.test.tsx | wc -l` da 91.
- **Archivos:** `git status --short frontend | wc -l` da 23. No hay archivos nuevos; esta corrección solo tocó `foros-view.tsx` y `foros-01c.test.tsx`.

## Implementación — FORO-01c2 (2026-11-16)

Plan: `docs/trabajo/FORO-01-actividad-tipo-foro/plan.md` (2897 líneas, con la Enmienda 10). Manda §E10, luego §E9, §E8 y §E7. Base: `88b37af`. Solo `frontend/`: no toqué `shared/` ni el backend y no corrí nada del backend.

Estado: **terminado**. Hubo una PARADA en el paso 1, resuelta por el humano; la cuento abajo.

### La PARADA y su resolución
- **Qué la provocó.** Con el remedio de T-01 aplicado, `npx vitest run src/features/tareas` dio 11 rojos:
  - 10 casos del foro en `hermanos-03d-01c`, esperados, porque las vistas del foro aún no existían;
  - «ADM-1D221 fila 36, 409, con la vista desmontada: como hoy, pide la recarga», de `clase-archivada-01d2-tareas.test.tsx:961-974`. Es una prueba normal fuera de la lista cerrada. Falló en `:972` con `expected 1 to be 2`.
- **Comprobación por mutación.** Quité `if (!montado.current) return` de `recargarTrasConflicto` y el caso volvió a verde. Restauré el archivo y `cmp` dio idéntico.
- **Decisión del humano (2026-11-16).**
  - Opción (A): Enmienda 10. El caso entra a la lista cerrada con el «después» literal de §E10.2.
  - N-31: los tres cambios mecánicos de `editar-tarea-view.test.tsx` se aplican sin condición.
  - La lista cerrada de pruebas normales queda en 4.

### Orden seguido (E1-27)
1. Los hermanos T-01 a T-05 y FORO-1C41, primero en rojo, y luego ADM-1D221 y N-31.
2. Los vecinos de CH6-A14.
3. `tipo` y la traducción del foro.
4. Las claves, las tres vistas y el router.
5. Las pruebas de las vistas.
6. La lista cerrada.

### Archivos tocados contra `88b37af`
`git status --short -- frontend` da 25: 14 modificados y 11 nuevos.

**Producción (13):**
- En `features/tareas/`:
  - `components/formulario-tarea.tsx`: T-02, T-03 y `tipo`.
  - `components/acciones-de-la-tarea.tsx`: `tipo`.
  - `components/detalles-de-la-tarea.tsx`: la prop opcional `politica`, y sin la fila «Entrega» en un foro.
  - `editar-tarea-view.tsx`: T-01.
  - `foro-view.tsx`, `crear-foro-view.tsx` y `editar-foro-view.tsx`: nuevos.
  - `hooks.ts`:
    - T-02 y T-03 con `useListaConfirmadaAlAbrir` y `useOpcionesDelFormulario`;
    - T-04 con `marcarViejaLaActividadTrasConflicto`;
    - T-05 con `renovarTrasErrorAlBorrar`;
    - la variante `useAvisoDeRecargaFallidaDe`;
    - `useForo`, `useCrearForo`, `useEditarForo`, `useBorrarForo` y `useAvisoDeRecargaFallidaDelForo`.
  - `data.ts`:
    - `CODIGOS_QUE_DEJAN_VIEJA_LA_ACTIVIDAD`;
    - `TRADUCCION_DE_ERRORES_FORO`, con sus mensajes y sus 18 códigos;
    - `CAMPOS_DEL_FORMULARIO_DEL_FORO`;
    - `CODIGOS_QUE_REEMPLAZAN_LA_VISTA_DEL_FORO` y `PREFIJOS_QUE_REEMPLAZAN_LA_VISTA_DEL_FORO`;
    - los textos del formulario, del detalle y de las acciones por tipo;
    - `POLITICA_DEL_FORO`.
  - `lib.ts`:
    - `mensajeDeErrorForo`, `mensajeDeConsultaForo` y `erroresDelForoDeApi`;
    - `erroresDelFormularioDeApi` y `mensajeDelFormulario`;
    - `cuerpoDeTarea` con `tipo`, y `cuerpoDeForo`;
    - `errorQueReemplazaLaVistaDelForo` y `avisoDeRecargaFallidaAlEditarElForo`;
    - `rutaDeBorrarForo` y `textoDeLaEntrega`.
  - `types.ts`: `TipoDeActividad`, `ActividadDetalle`, `TextosDeLaPolitica` y las reexportaciones de `ForoDetalle`, `CrearForo` y `EditarForo`.
- `services/trabajoService.ts`: `claveForo` y `consultaForo`.
- `app/router.tsx`:
  - en el maestro y en el admin, `foros/nuevo`, `foros/:foroId` y `foros/:foroId/editar`;
  - en el estudiante, `foros/nuevo` lleva a `/login` y `foros/:foroId` muestra el foro.

**Pruebas nuevas (8),** todas en `features/tareas/`: `hermanos-03d-01c.test.tsx`, `vecinos-formulario-tarea-01c.test.tsx`, `formulario-foro-01c.test.tsx`, `traduccion-foro-01c.test.ts`, `foro-detalle-01c.test.tsx`, `crear-editar-foro-01c.test.tsx`, `errores-foro-01c.test.tsx` y `recuperar-foro-01c.test.tsx`. Ninguna ayuda nueva: cada prueba trae su propio doble del servidor.

**Lista cerrada de pruebas normales (4):**
- `lib/guardas-de-doble-clic-estatico.test.ts`: `EXCEPCIONES` suma `"/src/features/tareas/crear-foro-view.tsx#crear.mutateAsync"` y `"/src/features/tareas/editar-foro-view.tsx#editar.mutateAsync"`, con el comentario literal de §E7.5.4, punto 5.
- `lib/estado-por-id-estatico-ch6.test.ts` (CH6-A30 (c)): suma `toContain("key={foro.id}")` para `tareas/foro-view.tsx` y `toContain("key={foroId}")` para `tareas/editar-foro-view.tsx`.
- `features/tareas/clase-archivada-01d2-tareas.test.tsx`: solo ADM-1D221 fila 36 con la vista desmontada, con el «después» literal de §E10.2 (título, comentario, la precondición `isInvalidated === false`, el aviso único después de `reposar`, ninguna lectura más e `isInvalidated === true`). La precondición se cumple y el caso pasa.
- `features/tareas/editar-tarea-view.test.tsx` (N-31), solo estas tres líneas, con el comentario de §E10.3. Hoy pasaban en verde y las cambié igual, por la decisión del humano. No toqué ninguna aserción.
  - `:159-160`: `screen.getByLabelText("Categoría")` → `await screen.findByLabelText("Categoría")`, y lo mismo con «Tema».
  - `:236`: `screen.getByRole("option", { name: "Sin categoría" })` → `await screen.findByRole("option", { name: "Sin categoría" })`.
  - `:334-335`: después de `await screen.findByLabelText("Título")` se suma `await screen.findByLabelText("Tema")`, antes de `guardar()`. `:343` no cambia.

**`*.ataque`:** no toqué ninguna. Los 25 archivos entran todos en «Se toca».

### C-15: las dos líneas, tal como quedan en `frontend/src/features/tareas/editar-foro-view.tsx`
Las dos viven en la función anidada `contenido()` de `EdicionDelForo`, el componente interno que se monta con `key={foroId}`.
- `handleGuardar`, a cuatro espacios; llama a `editar.mutateAsync`:
  `    const handleGuardar = async (datos: CrearTarea, version: number) => {`
  La entrada de ATQ-CH4-32 sería: `"/src/features/tareas/editar-foro-view.tsx en «const handleGuardar = async (datos: CrearTarea, version: number) => {»"`.
- La recarga tras el conflicto, dentro de `recargarTrasConflicto`:
  `      const resultado = await consulta.refetch()`
  La entrada de ATQ-CH4-34 sería: `"/src/features/tareas/editar-foro-view.tsx: const resultado = await consulta.refetch()"`.
- **Rojos esperados hasta la ronda 0 bis del tester** (`npx vitest run src/lib/guardas-ch4-r1.ataque.test.ts`):
  - ATQ-CH4-32: `AssertionError: expected [ …(3) ] to deeply equal [ …(2) ]`, con `+ "/src/features/tareas/editar-foro-view.tsx en «const handleGuardar = async (datos: CrearTarea, version: number) => {»"`.
  - ATQ-CH4-34: `AssertionError: expected [ …(6) ] to deeply equal [ …(5) ]`, con `+ "/src/features/tareas/editar-foro-view.tsx: const resultado = await consulta.refetch()"`.
  - Los dos traen solo la línea nueva de `editar-foro-view.tsx`. El remedio de T-01 no cambió las dos líneas de `editar-tarea-view.tsx` que ya estaban en esas listas.

### C-8 y V-06
- **C-8** no se activa: `tareas-01a-r1.ataque.test.tsx:176-195` sigue verde, con 2 `GET …/temas`. Al abrir la edición, la lectura que confirma la lista se une a la del montaje cuando no había lista en caché.
- **V-06:** `grep -rho "enEspera=" frontend/src --include=*.tsx --exclude=*.test.tsx | wc -l` da 91, igual que en `88b37af`. Las vistas del foro no suman ningún `enEspera=`: «Publicar foro» y «Guardar cambios» viven en `FormularioTarea`, y «Sí, borrar foro» y «Borrar con las participaciones», en `AccionesDeLaTarea`.

### Pruebas requeridas de 01c2: archivo y título exacto

Todas en `frontend/src/features/tareas/`. Los títulos con `%s` o `$x` son de `it.each` o `describe.each`. En `hermanos-03d-01c` y `errores-foro-01c`, la variante del foro o de editar lleva el id del caso entre paréntesis, por ejemplo «FORO-1C36 (FORO-1C30): …».

| Caso | Archivo | Título |
|---|---|---|
| FORO-1C01 (router real en `foros/:foroId`) | `foro-detalle-01c.test.tsx` | «FORO-1C01: %s en …/foros/:foroId ve las siete secciones sin aria-current y sin indicador, como en tareas/:id» (×3 roles). Incluye el control en `…/foro`: indicador y `aria-current` presentes |
| FORO-1C04 | `formulario-foro-01c.test.tsx` | «FORO-1C04: con tipo «foro» al crear, los rótulos del foro, «Planteamiento» y «Participaciones después de la fecha límite», sin «Cómo se entrega», y «Publicar foro»»; «FORO-1C04: el planteamiento es obligatorio: sin él dice «Escribe el planteamiento del foro» y no pide nada; sin título, «Escribe el título del foro»»; «FORO-1C04: con tipo «foro», un envío válido entrega los datos, y su cuerpo de foro no lleva requiereAdjuntos»; «FORO-1C04: con tipo «foro» al editar, «Editar foro», los valores del foro y «Guardar cambios»»; «FORO-1C04: sin tipo, el formulario de la tarea, igual que hoy» |
| FORO-1C05 | `crear-editar-foro-01c.test.tsx` | «FORO-1C05: «Publicar foro» manda el cuerpo del foro (sin requiereAdjuntos), avisa «Foro publicado», marca viejas la lista de «Foro», las actividades, los temas y las calificaciones, y navega al foro nuevo»; «FORO-1C05: «Guardar cambios» manda la versión de apertura, avisa «Cambios guardados», escribe el foro con la respuesta, marca vieja la lista y vuelve al detalle»; «FORO-1C05: un 409 TAREA_MODIFICADA avisa con el texto del servidor, recarga el foro una vez, reinicia el formulario con la versión actual y el foco en «Título»; el siguiente guardado sale con esa versión» |
| FORO-1C06 | `errores-foro-01c.test.tsx` | «FORO-1C06: un VALIDACION de un campo que el formulario no pinta (foroId, y uno fuera de contrato) da un solo aviso legible y ningún ErrorDeCampo» |
| FORO-1C07 | `errores-foro-01c.test.tsx` | «FORO-1C07: un VALIDACION con el mensaje «%s» da el genérico del módulo, un solo aviso» (vacío y solo espacios) |
| FORO-1C08 | `errores-foro-01c.test.tsx` | «FORO-1C08: con prefijo de ruta «rubrica.1.criterio:», el ErrorDeCampo va en la fila 2, sin la ruta y sin aviso»; «FORO-1C08: «%s», un campo que el formulario del foro pinta solo en otro tipo o en ningún modo, cuenta como no pintado: un aviso y ningún ErrorDeCampo» (`requiereAdjuntos` y `version`) |
| FORO-1C09 | `errores-foro-01c.test.tsx` | «FORO-1C09: tras el ErrorDeCampo de «puntos:» del servidor, un envío que la validación local rechaza muestra solo «Escribe el planteamiento del foro»» |
| FORO-1C10 | `traduccion-foro-01c.test.ts` | «FORO-1C10: mensajeDeErrorForo da el resto sin la ruta, o el genérico, en cada entrada de la tabla»; «FORO-1C10: mensajeDeConsultaForo da el genérico ante toda la tabla y conserva los ids con texto fijo»; «FORO-1C10: erroresDelForoDeApi da null en las rutas de la tabla y el genérico en un campo pintado sin texto visible» |
| FORO-1C11 | `errores-foro-01c.test.tsx` | Las seis de FORO-1C06 a FORO-1C09 en editar, como «FORO-1C11 (FORO-1C06): …» y así hasta «FORO-1C11 (FORO-1C09): …», más «FORO-1C11: cada entrada de la tabla da un solo aviso, con el resto sin la ruta o el genérico, ningún ErrorDeCampo, y lo escrito se conserva» |
| FORO-1C12 | `foro-detalle-01c.test.tsx` | «FORO-1C12: el alumno ve la insignia «Foro», el título, el planteamiento en texto plano, el adjunto, la rúbrica y «Detalles» con la política, sin acciones»; «FORO-1C12: la política dice «Se aceptan participaciones con retraso» si el foro las acepta»; «FORO-1C12: %s con puedeEditar=%s y puedeBorrar=%s ve solo las acciones que dice el servidor» (×3); «FORO-1C12: cargando y luego el foro; un 404 dice «Ese foro ya no existe.» y un 403 de la clase, «No tienes acceso a esta clase.», sin aviso»; «FORO-1C12: una recarga fallida con el foro en caché conserva la vista y avisa una vez por fallo (T-12)» |
| FORO-1C13 | `foro-detalle-01c.test.tsx` | «FORO-1C13: la confirmación en línea lleva el foco a «Cancelar» y cancelar lo devuelve a «Borrar foro»»; «FORO-1C13: con éxito avisa «Foro borrado», saca el foro de la caché, marca vieja la lista de «Foro» y navega a «Foro»»; «FORO-1C13: un 409 TAREA_CON_ENTREGAS abre el segundo paso con el mensaje del servidor, sin aviso; «Borrar con las participaciones» solo para el admin (%s: %s)» (admin y maestro) |
| FORO-1C14 (vistas) | `foro-detalle-01c.test.tsx` y `crear-editar-foro-01c.test.tsx` | «FORO-1C14: %s en una clase archivada ve el foro sin «Editar foro» ni «Borrar foro»» (maestro y admin); «FORO-1C14: al %s en una clase archivada la ruta pinta el texto de archivada y «Volver a Foro», sin formulario» (crear y editar); «FORO-1C14: un 409 CLASE_ARCHIVADA al publicar avisa una vez, conserva lo escrito y marca vieja la clase (exact)» |
| FORO-1C24 | `recuperar-foro-01c.test.tsx` | «FORO-1C24: desde «Foro», pulsando su fila»; «FORO-1C24: atrás y adelante del historial»; «FORO-1C24: saltar al foro B y volver al A (con key por el foro, la vista se monta de nuevo)» |
| FORO-1C26 | `recuperar-foro-01c.test.tsx` | «FORO-1C26: un segundo fallo da un segundo aviso; una lectura correcta muestra la versión nueva, sin otro aviso, y volver a abrir no repite ninguno» |
| FORO-1C27 | `recuperar-foro-01c.test.tsx` | «FORO-1C27: «%s» con un 5xx avisa «Algo salió mal. Inténtalo de nuevo.»; el mismo botón, sin recargar la vista, vuelve a pedir y con éxito no queda otro aviso de error» («Publicar foro», «Guardar cambios», «Sí, borrar foro») |
| FORO-1C30 | `hermanos-03d-01c.test.tsx` | «FORO-1C30: T-01, un 409 con la edición ya desmontada da un solo aviso y no vuelve a pedir la tarea» |
| FORO-1C31 | `hermanos-03d-01c.test.tsx` | «FORO-1C31: T-04, tras ese 409 volver antes de 30 s a la edición pide la tarea, nace con la versión del servidor y guardar no da otro 409» |
| FORO-1C32 | `hermanos-03d-01c.test.tsx` | «FORO-1C32: mientras la lectura de los temas y las categorías no llega, sus campos no se muestran y guardar conserva los de la tarea»; «FORO-1C32: si esa lectura falla, los campos no se muestran y guardar conserva los de la tarea» |
| FORO-1C33 | `hermanos-03d-01c.test.tsx` | «FORO-1C33: cuando la lectura llega con el tema y la categoría, los campos los muestran elegidos y guardar los conserva» |
| FORO-1C34 | `hermanos-03d-01c.test.tsx` | «FORO-1C34: una lectura de los temas que salió antes de abrir y llega después no confirma: sale otra y guardar conserva el tema»; «FORO-1C34: volver a abrir la edición vuelve a pedir los temas y las categorías» |
| FORO-1C35 | `hermanos-03d-01c.test.tsx` | «FORO-1C35: T-05, borrar con 404 con la vista ya desmontada la quita de la caché: «atrás» dice «Esa tarea ya no existe.» sin pintar la tarea vieja»; «FORO-1C35: T-05, borrar con 403 BORRADO_NO_PERMITIDO con la vista ya desmontada la marca vieja sin pedirla; al volver se pide» |
| FORO-1C36 | `hermanos-03d-01c.test.tsx` | Los nueve de arriba en el foro: «FORO-1C36 (FORO-1C30): …» a «FORO-1C36 (FORO-1C35): …», con «el foro» en lugar de «la tarea» |
| FORO-1C37 | `foro-detalle-01c.test.tsx` | «FORO-1C37: con 404 ARCHIVO_NO_ENCONTRADO, un aviso; la vista sigue y el foco sigue en «Descargar»»; «FORO-1C37: con 403 SIN_ACCESO_A_LA_CLASE, un aviso y se vuelve a pedir el foro; su respuesta reemplaza la vista»; «FORO-1C37: con un 5xx, «Algo salió mal. Inténtalo de nuevo.»; repetir el botón vuelve a pedir la descarga» |
| FORO-1C40 | `vecinos-formulario-tarea-01c.test.tsx` | «FORO-1C40: en $modo, un 400 VALIDACION de «version:» (un campo que el formulario no pinta en ningún modo; solo lo lleva el cuerpo de la edición) da un solo aviso legible, ningún ErrorDeCampo, conserva lo escrito y el botón sale de la espera»; «FORO-1C40: en $modo, tras el ErrorDeCampo de «puntos:» del servidor, un envío que la validación local rechaza por el título muestra solo «Escribe el título de la tarea», sin aviso y sin pedir nada» (en la tarea nueva y en su edición) |
| FORO-1C41 | `hermanos-03d-01c.test.tsx` | «FORO-1C41: en $tipo, un 409 TAREA_MODIFICADA que llega con la clase archivada deja vieja la actividad; al restaurar y volver a abrir la edición nace con la versión del servidor y guardar no da otro 409» (tarea y foro) |
| FORO-1C43 | `traduccion-foro-01c.test.ts` | «FORO-1C43: «Ese foro ya no existe.» a TAREA_NO_ENCONTRADA y a un VALIDACION de foroId; «Esa participación ya no existe.» a PARTICIPACION_NO_ENCONTRADA y a uno de participacionId»; «FORO-1C43: los 18 códigos del foro (los 15 de las tareas y los 3 nuevos) dan el texto del servidor, o el genérico si no tiene texto visible»; «FORO-1C43: la traducción de las tareas no cambia: 15 códigos, «Esa tarea ya no existe.» y los tres códigos del foro sin el texto del servidor»; «FORO-1C43: errorQueReemplazaLaVistaDelForo: sin foro, 404, 403 de la clase o un VALIDACION de claseId, foroId o alumnoId; un 5xx con foro, no» |
| FORO-1C50 (vistas) | `foro-detalle-01c.test.tsx` y `crear-editar-foro-01c.test.tsx` | «FORO-1C50: dos clics en el mismo render de «%s» mandan un solo DELETE» («Sí, borrar foro» y «Borrar con las participaciones»); «FORO-1C50: dos clics en el mismo render de «%s» mandan una sola petición» («Publicar foro» y «Guardar cambios») |
| FORO-1C52 (vistas) | `foro-detalle-01c.test.tsx` y `crear-editar-foro-01c.test.tsx` | «FORO-1C52: con la confirmación de «Borrar foro» abierta en el foro A, saltar con el historial al foro B no la deja abierta y ningún clic borra B»; «FORO-1C52: la edición del foro A a medio escribir no pasa al foro B al saltar con el historial, y guardar en B lleva la versión de B» |
| FORO-1C53 (vistas) | `foro-detalle-01c.test.tsx` y `crear-editar-foro-01c.test.tsx` | «FORO-1C53: borrar con %s no avisa»; «FORO-1C53: la recarga del foro con %s no avisa»; «FORO-1C53: la descarga de un adjunto con %s no avisa»; «FORO-1C53: «%s» con %s no avisa» (publicar y guardar). Cada uno con 401 sin refresco, 403 ACCESO_RESTRINGIDO y 403 CAMBIO_DE_CONTRASENA_REQUERIDO, y el destino de `irA` |
| ADM-1D221 fila 36 (§E10.2) | `clase-archivada-01d2-tareas.test.tsx` | «ADM-1D221 fila 36, 409, con la vista desmontada: un aviso; no pide la recarga y deja vieja la tarea» |

### Primero en rojo (los hermanos)
Escribí `hermanos-03d-01c` antes de los remedios. Con `-t "tarea"` dio `Tests  9 failed | 1 passed | 10 skipped (20)`, y cada uno cayó por el remedio que le faltaba:
- **T-01:** 2 lecturas en lugar de 1.
- **T-04:** no pedía al volver.
- **T-02 y T-03:** sin la lectura al abrir; el campo «Tema» vacío.
- **T-05:** pintaba el `h2` viejo.
- **FORO-1C41:** no pedía al volver.

El que pasaba desde el inicio era el del `403`: sin observador, la caché ya quedaba vieja. Lo cubre igual el remedio de T-05, que pone `refetchType: "none"`.

Los casos del foro estaban en rojo porque las vistas aún no existían. FORO-1C40 pasó desde el inicio: la conducta ya era correcta. Lo vigila la mutación N17.

### Matriz de avisos y recargas (§D-10), confirmada o corregida

`ForoView`:

| Disparador | Clase de error | Qué se renueva | Qué se anuncia | Foco | En vuelo a la vez | Con la vista desmontada |
|---|---|---|---|---|---|---|
| Lectura del foro | `404`, `403 SIN_ACCESO_A_LA_CLASE` o `VALIDACION` de `claseId`, `foroId` o `alumnoId` | — | Reemplaza la vista, sin aviso (FORO-1C12) | Raíz (`useFocoAlPerderseElControl`) | Una petición por clave | Nada |
| Lectura del foro | `5xx` o red, con caché | — | Un aviso por fallo: «No pudimos actualizar el foro. Mostramos la última versión que tenemos.» (T-12, FORO-1C12 y FORO-1C26); la vista se queda | No se mueve | — | El fallo ya avisado no se repite al volver (memoria por consulta, FORO-1C26) |
| Lectura del foro | `5xx` o red, sin caché | — | Reemplaza, con el genérico | Raíz | — | — |
| Lectura del foro | Redirige | — | Nada (FORO-1C53) | — | — | — |
| «Sí, borrar foro» y «Borrar con las participaciones» | `409 TAREA_CON_ENTREGAS` | — | Segundo paso en línea con el texto del servidor, sin aviso (FORO-1C13) | «Cancelar» | Una sola petición (FORO-1C50) | Un aviso con el texto del servidor |
| Ídem | `404 TAREA_NO_ENCONTRADA` | Con la vista montada, el foro se vuelve a pedir y su `404` reemplaza la vista. Desmontada, el foro sale de la caché (T-05) y las listas quedan viejas | Un aviso: «Ese foro ya no existe.» | Raíz | — | Sale de la caché; «atrás» dice «Ese foro ya no existe.» sin pintar el viejo (FORO-1C36) |
| Ídem | `403 BORRADO_NO_PERMITIDO` | Montada, se vuelve a pedir. Desmontada, queda vieja sin pedirla | Un aviso con el texto del servidor | Raíz | — | Queda vieja; al volver se pide (FORO-1C36) |
| Ídem | `409 CLASE_ARCHIVADA` | `claveClaseDetalle` (`exact: true`) queda vieja | Un aviso | — | — | Un aviso |
| Ídem | `5xx` o red | — | Un aviso con el genérico; repetir el botón lo vuelve a intentar (FORO-1C27) | El botón | — | Un aviso |
| Ídem | Redirige | — | Nada (FORO-1C53) | — | — | Nada |
| Ídem | Éxito | El foro sale de la caché; quedan viejas la lista de «Foro», las actividades, los temas, las categorías y las calificaciones | «Foro borrado» | **Corrección: no va al `h2` de «Foro»** (desviación 6) | — | El aviso sí sale |
| Descargar un adjunto | `404 ARCHIVO_NO_ENCONTRADO` | — | Un aviso | Se queda en «Descargar» (FORO-1C37) | — | — |
| Descargar un adjunto | `403 SIN_ACCESO_A_LA_CLASE` | El foro se vuelve a pedir y su respuesta reemplaza la vista | Un aviso | Raíz | — | — |
| Descargar un adjunto | `5xx` | — | Un aviso con el genérico; repetir el botón vuelve a pedir | El botón | — | — |
| Descargar un adjunto | Redirige | — | Nada | — | — | — |

`CrearForoView`, «Publicar foro»:
- **Campo pintado** (`titulo`, `instrucciones`, `fechaLimite`, `puntos`, `categoriaId`, `temaId`, `rubrica.N.*`): `ErrorDeCampo`, sin aviso.
- **Campo no pintado** (`requiereAdjuntos`, `version`, `foroId` o fuera de contrato), mensaje vacío o con ruta: un aviso (FORO-1C06 a FORO-1C08).
- **`CATEGORIA_REQUERIDA`:** bajo «Categoría», y se vuelven a pedir las categorías.
- **`409 CLASE_ARCHIVADA`:** un aviso, lo escrito se conserva y la clase queda vieja (FORO-1C14).
- **`5xx`:** un aviso, lo escrito se conserva y repetir el botón lo vuelve a intentar (FORO-1C27).
- **Redirige:** nada (FORO-1C53).
- **Éxito:** «Foro publicado» y se navega al foro nuevo; quedan viejas la lista de «Foro», las actividades, los temas, las categorías y las calificaciones (FORO-1C05).
- **En vuelo a la vez:** una sola petición (FORO-1C50).
- **Con la vista desmontada:** el aviso sale y no se navega (`montado` y la generación de solo lectura).

`EditarForoView`, «Guardar cambios»:
- **Errores de campo:** como al crear.
- **`409 TAREA_MODIFICADA`:** un aviso con el texto del servidor, una sola recarga esperada y el formulario se reinicia con la versión nueva, con el foco en «Título» (FORO-1C05).
  - Con la vista desmontada, o con la clase archivada: el aviso y nada más; el foro queda viejo y al volver se pide (FORO-1C36 (FORO-1C30) y (FORO-1C31), FORO-1C41).
- **`TAREA_CON_CALIFICACIONES`:** un aviso y el foro queda viejo.
- **`404`, `EDICION_NO_PERMITIDA` o `SIN_ACCESO`:** un aviso y se vuelve a pedir el foro; un `404` reemplaza la vista.
- **Éxito:** «Cambios guardados»; la respuesta se escribe en `claveForo`; quedan viejas las listas y las calificaciones; se vuelve al detalle.
- **Recarga fallida con caché:** un aviso por fallo con el texto de editar (desviación 1).
- **Redirige:** nada.
- **Al abrir:** los temas y las categorías se vuelven a pedir (T-02 y T-03).

Lo que cambia en la tarea por los hermanos:
- **T-01:** un `409` con la edición desmontada no vuelve a pedir la tarea.
- **T-04:** `TAREA_MODIFICADA` y `TAREA_CON_CALIFICACIONES` la dejan vieja sin pedirla.
- **T-05:** borrar sin observador, con `404`, la saca de la caché; con `403`, la deja vieja.
- **T-02 y T-03:** al abrir la edición se vuelven a pedir los temas y las categorías.
- **Con la vista montada** (PR-1D05 y PR-1D04) no cambia nada.

### Hermanos y estados vecinos de cada remedio

**T-01** (`recargarTrasConflicto`):
- Montada, con éxito: reinicia (FORO-1C05 y PR-1D04).
- Montada, si la recarga falla: aviso y lo escrito se queda (PR-1D04).
- Montada, si la recarga trae `404`, `403` o `puedeEditar: false`: la vista se reemplaza.
- Desmontada antes de la respuesta: ninguna petición (FORO-1C30, FORO-1C36 y ADM-1D221).
- Desmontada durante la recarga: no se aplica. La recarga ya salió con la vista montada (ADM-T1D210 a ADM-T1D212, vigiladas).
- Clase archivada: no recarga (`sigueVigente`) y queda vieja por T-04 (FORO-1C41).
- Aplicado en la tarea y en el foro.

**T-04:**
- `TAREA_MODIFICADA` y `TAREA_CON_CALIFICACIONES`, montada o desmontada, en la tarea y en el foro.
- **No aplica a `CLASE_ARCHIVADA`**, que no está en `CODIGOS_QUE_DEJAN_VIEJA_LA_ACTIVIDAD` (ADM-1D211, hermano vigilado).
- Calificar es de 01e (FORO-1E41) y el recurso es de `features/clases`: ninguno se aplica aquí.

**T-02 y T-03,** estados de la lista al abrir la edición:

| Estado | Qué hace | Prueba |
|---|---|---|
| Sin caché | Se une a la lectura del montaje y confirma en el mismo render | PR-1D04 y C-8 |
| Con caché fresca | Pide una lectura nueva | FORO-1C33 |
| Con caché vieja | Se une a la del montaje | — |
| Con una lectura previa en vuelo | La cancela (`cancelQueries`) y pide otra | FORO-1C34 |
| Pendiente | Los campos no se muestran y se conserva el valor | FORO-1C32 |
| Fallida | Igual que pendiente | FORO-1C32 |
| Llega con el valor | Se ve elegido | FORO-1C33 |
| Llega sin el valor | La opción vacía (T-08 de siempre) | PR-1D04 `:334` |
| Reinicio tras un `409` | El formulario se monta de nuevo y vuelve a pedir | — |
| Volver a abrir | Vuelve a pedir | FORO-1C34 |
| Crear | Sin cambio | `formulario-tarea.test` |

- Aplicado a temas y categorías, en la tarea y en el foro.
- Si el servidor marca un campo oculto, su `ErrorDeCampo` se pinta igual (desviación 4).

**T-05:**
- Montada: lo de siempre (PR-1D05 `:517` y `:541`, vigiladas y verdes).
- Desmontada con `404`: sale de la caché (FORO-1C35 y FORO-1C36).
- Desmontada con `403`: queda vieja (ídem).
- `SIN_ACCESO_A_LA_CLASE` o `EDICION_NO_PERMITIDA` desmontada: queda vieja.
- `TAREA_CON_ENTREGAS`: sin cambio.
- Éxito: en la tarea, como hoy; en el foro, `removeQueries`.

**FORO-1C41:** la tarea y el foro.

### `VALIDACION` fuera de contrato en el formulario del foro
- **Campo que no se pinta** (`foroId` y `campoFueraDeContrato`): FORO-1C06, al crear y al editar.
- **Campo pintado solo en otro modo o tipo** (`requiereAdjuntos`, que solo pinta la tarea, y `version`): FORO-1C08.
- **Mensaje vacío o de espacios:** FORO-1C07.
- **Prefijo con ruta** (`rubrica.1.criterio:`): FORO-1C08, el `ErrorDeCampo` en la fila 2.
- **Rechazo del servidor seguido de uno local:** FORO-1C09.
- **Recorrido de `ENTRADAS_FUERA_DE_CONTRATO`:** en las funciones (FORO-1C10: `mensajeDeErrorForo`, `mensajeDeConsultaForo` y `erroresDelForoDeApi`) y en la vista de editar (FORO-1C11).

### Frases de recuperación, un caso por camino
- **«No pudimos actualizar el foro. Mostramos la última versión que tenemos.»** No pide una acción; el plan le asigna FORO-1C24 y FORO-1C26. Volver a abrir el foro antes de 30 s lo pide de nuevo, por cada camino:
  - desde «Foro», pulsando su fila;
  - atrás y adelante;
  - saltar a otro foro y volver, el camino propio de una vista con `key` por el foro.

  Además, el siguiente fallo vuelve a avisar y una lectura correcta lo deja atrás (FORO-1C26).
  - Otros caminos:
    - «Actividades» es FORO-1D30 (01d);
    - pulsar la sección estando en ella no aplica, porque en `foros/:foroId` ninguna sección está activa (FORO-1C01).
- **«Algo salió mal. Inténtalo de nuevo.»** de publicar, guardar, borrar y descargar: repetir el mismo botón sin recargar la vista lo vuelve a pedir (FORO-1C27 y FORO-1C37).
- **Las frases de edición** («…Puedes seguir editando…») no prometen una acción nueva: siguen la regla de la tarea.

### Guardas y remedios comprobados por mutación
Todas las mutaciones fueron en archivos de «Se toca»: copia previa, un solo cambio en un ancla única (contada antes de correr), restauración desde la copia y `filecmp` byte a byte, con `cmp igual: True` en todas. Los scripts son `scratchpad/scripts/mutaciones01c2.py` y, para §E10.2, `mutaciones01c.py`.

| Mutación | Qué quita | Resultado |
|---|---|---|
| H1 (`editar-tarea-view.tsx`, §E10.2) | `if (!montado.current) return` | Cae ADM-1D221 en `:978` (las lecturas). Caen también FORO-1C30 y FORO-1C31 |
| H2 (`hooks.ts`, §E10.2) | La llamada a `marcarViejaLaActividadTrasConflicto` en `useEditarTarea` | Cae ADM-1D221 en `:979` (`isInvalidated`). Caen también FORO-1C31 y FORO-1C41. Las dos tumban aserciones distintas |
| N1 (`acciones-de-la-tarea.tsx`) | La guarda `borrandoRef` | FORO-1C50 «Sí, borrar foro» y «Borrar con las participaciones» |
| N2 (`formulario-tarea.tsx`) | `guardandoRef.current \|\|` de `handleSubmit` | FORO-1C50 «Publicar foro» y «Guardar cambios». Sobrevivía con dos `fireEvent.click` sueltos, porque cada uno es su propio `act` y el segundo veía `enEspera`. Lo corregí con los dos clics en un solo `act`, como `dosClicsEnElMismoRender` de CHORE-04 |
| N3 (`hooks.ts`) | `removeQueries` de T-05 | FORO-1C35 y FORO-1C36 (FORO-1C35) |
| N4 (`hooks.ts`) | La detección de la lectura previa en vuelo | FORO-1C34 y su gemela del foro |
| N5 (`formulario-tarea.tsx`) | `!temasConfirmados \|\|` | FORO-1C32 ×2 y FORO-1C36 (FORO-1C32) ×2 |
| N6 (`crear-foro-view.tsx`) | `cuerpoDeForo` (el cuerpo lleva `requiereAdjuntos`) | FORO-1C05 |
| N7 (`formulario-tarea.tsx`) | `tipo === "tarea" &&` de «Cómo se entrega» | FORO-1C04 ×2, FORO-1C08 ×2 y FORO-1C11 (FORO-1C08) ×2 |
| N8 (`foro-view.tsx`) | `key={foro.id}` | CH6-A30 (c) y FORO-1C52. Al principio FORO-1C52 sobrevivía: el foro B nunca había estado en caché y «Cargando» desmontaba la confirmación. Lo reescribí con B ya en caché |
| N9 (`hooks.ts`) | `removeQueries` al borrar un foro con éxito | FORO-1C13 «con éxito» |
| N10 (`hooks.ts`) | La guarda de redirección en la descarga del foro | FORO-1C53, las tres descargas |
| N11 (`hooks.ts`) | `marcarViejaLaActividadTrasConflicto` en `useEditarForo` | FORO-1C36 (FORO-1C31) y FORO-1C41 en el foro |
| N12 (`editar-foro-view.tsx`) | `if (!montado.current) return` | FORO-1C36 (FORO-1C30) y (FORO-1C31) |
| N13 (`data.ts`) | Pinta `requiereAdjuntos` en el foro | FORO-1C10 y FORO-1C08 ×2 |
| N14 (`hooks.ts`) | La memoria del fallo ya avisado | FORO-1C24, los tres caminos |
| N15 (`lib.ts`) | El foro se traduce con la traducción de las tareas | FORO-1C43 ×2 y FORO-1C06 ×2 |
| N16 (`foro-view.tsx`) | El aviso de la recarga también cuando reemplaza la vista | FORO-1C37 (`403`) |
| N17 (`formulario-tarea.tsx`) | La validación local suma los errores del servidor en lugar de reemplazarlos | FORO-1C40 ×2, FORO-1C09 y FORO-1C11 (FORO-1C09) |
| N18 (`editar-foro-view.tsx`) | `key={foroId}` | CH6-A30 (c) y FORO-1C52 (la edición). También la reescribí con B ya en caché |

Ninguna redundancia queda sin declarar. Las dos mutaciones que sobrevivieron (N2 y N8) llevaron a reescribir sus pruebas, y ahora caen.

### Una `*.ataque` que se puso roja y la corregí en producción
`lib/errores-ch3-r1.ataque.test.ts`, O-05, cayó con `"/src/features/tareas/lib.ts: _LA_VISTA_DEL_FORO.some((prefijo) => error.message"`. La regla solo admite `PREFIJOS_QUE_REEMPLAZAN_LA_VISTA.some((prefijo) => error.message`, con el nombre exacto de la tarea, o `.test(error.message`.

Remedio, dentro de «Se toca» y sin tocar la prueba:
- `PREFIJOS_QUE_REEMPLAZAN_LA_VISTA_DEL_FORO` pasa a ser una expresión, `/^(?:claseId|foroId|alumnoId):/`, en `data.ts`;
- `errorQueReemplazaLaVistaDelForo` la usa con `.test(error.message)`.

La conducta no cambia: FORO-1C43 sigue verde. Lo cuento en la desviación 9.

### Verificación
Desde `frontend/`, una corrida a la vez y sin ninguna otra copia de trabajo activa.

| Comando | Última línea |
|---|---|
| `npm run lint` | sale con 0; termina en `> tsc -b`, sin errores; antes, `All matched files use Prettier code style!` |
| `npx vitest run src/features/tareas` | `Tests  1459 passed (1459)` (`Test Files  50 passed (50)`) |
| `npx vitest run src/app src/lib src/services` | `Tests  2 failed \| 981 passed (983)` (`Test Files  1 failed \| 65 passed (66)`). Los 2 rojos son los esperados de C-15 (ATQ-CH4-32 y ATQ-CH4-34), con el mensaje de arriba |
| `npm run build` | `✓ built in 894ms` |

No corrí la suite completa del paquete; la corre el manager al cerrar.

### Conteos
- `npx vitest list` de las 8 pruebas nuevas, contadas con `grep -a -c "^src/"`, dan 104 casos en 8 archivos:

  | Archivo | Casos |
  |---|---|
  | `hermanos-03d-01c` | 20 |
  | `vecinos-formulario-tarea-01c` | 4 |
  | `formulario-foro-01c` | 5 |
  | `traduccion-foro-01c` | 7 |
  | `foro-detalle-01c` | 31 |
  | `crear-editar-foro-01c` | 15 |
  | `errores-foro-01c` | 15 |
  | `recuperar-foro-01c` | 7 |

- `enEspera=` en producción: `grep -rho "enEspera=" src --include=*.tsx --exclude=*.test.tsx | wc -l` da 91, sin cambio.
- Archivos: `git status --short -- frontend` da 25, contra los ~27 de §E10.5 contando el condicional. Son 13 de producción, 8 pruebas nuevas y 4 normales de la lista cerrada; ninguna `*.ataque`.

### Desviaciones
1. **Textos que §D-9 no trae y que escribí con el patrón de la tarea:**
   - «No pudimos actualizar el foro. Puedes seguir editando; revisa tu conexión.» y «…; inténtalo de nuevo en un momento.» (recarga fallida al editar);
   - «No puedes editar este foro.» (sin `puedeEditar`);
   - el rótulo de la política en «Detalles», «Participaciones después de la fecha límite», que reutiliza el rótulo del grupo del formulario.

   Opciones: (a) aceptarlos tal cual; (b) que el humano dé otros, en 01d o 01e.
2. **Sin el panel «Participantes» ni «Ver participantes» en `ForoView`.** §D-8.3 lo marca «01e; E1-10» y su ruta llega en 01e.
3. **En `trabajoService.ts`, solo `claveForo` y `consultaForo`.** Las claves de participaciones, réplicas, participantes y devoluciones son de 01d y 01e, que las usan.
4. **T-02 y T-03 con `cancelQueries` en lugar de `refetch({ cancelRefetch: true })`.** ATQ-CH4-34 es una lista cerrada y no admite otro `.refetch(` sin `{ cancelRefetch: false }`. Además:
   - con un campo oculto que el servidor marca, su `ErrorDeCampo` se pinta igual, sin el campo;
   - mientras las categorías no están confirmadas, la regla local de «Elige la categoría» no se aplica (decide el servidor).
5. **Crear, editar y borrar un foro también marcan viejas las categorías** (su conteo), como la tarea. La matriz no lo nombra.
6. **El foco tras borrar un foro con éxito no va al `h2` de «Foro».** La vista navega a «Foro», pero esa vista (`features/clases/foros-view.tsx`) no lleva el foco al cargar, y `features/clases` está en «No se toca» en 01c2. Pasa lo mismo que al borrar una tarea, que navega a «Actividades».

   Opciones: (a) aceptarlo; (b) que `ForosView` enfoque su `h2` al llegar desde un borrado (con el estado de la navegación), en una subentrega que pueda tocar `features/clases` (01d).
7. **Borrar un foro con `404` y la vista montada** sigue la regla de la tarea: vuelve a pedirlo y su `404` reemplaza la vista, como fija PR-1D05. El `removeQueries` de la matriz se aplica cuando la vista ya no está (T-05). Al borrar con éxito, el foro sí sale de la caché.
8. **`useAvisoDeRecargaFallida` se partió en una variante que recibe la clave (`useAvisoDeRecargaFallidaDe`).** La compara por su texto (`JSON.stringify`) para que una clave nueva en cada render no repita los efectos. La firma de hoy no cambia y `avisarDelErrorDeLaEntrega(` sigue con 5 llamadas.
9. **`PREFIJOS_QUE_REEMPLAZAN_LA_VISTA_DEL_FORO` es una expresión y no una lista** (ver O-05).
10. **FORO-1C26:** leí «una lectura correcta quita el aviso» como que, tras una lectura correcta, no sale ningún aviso más (tampoco al volver a abrir) y se ve la versión nueva. Un aviso de sonner ya mostrado no se retira.
11. **FORO-1C40 en la edición:** el formulario de la tarea pinta los mismos campos al crear y al editar, así que no hay un «campo pintado solo en el otro modo». Usé `version:`, que solo lleva el cuerpo de la edición y ningún modo pinta, en los dos modos.

### PARADAS
Una sola: la del paso 1, resuelta con la Enmienda 10 (opción A) y N-31. No hubo ninguna otra.

### No verificado
- La suite completa del paquete.
- No abrí ningún navegador: la composición visual de `ForoView` y la insignia «Foro» solo las cubren las pruebas automáticas.
- `DESIGN.md` §7.34 llega en 01e.

## Corrección tras la ronda 1 — FORO-01c2: T-01 y N-32 (2026-11-16)

Estado: **terminado**, sin PARADA. Solo toqué archivos de «Se toca» y una prueba nueva. No toqué ninguna `*.ataque`.

### T-01: corregido
- **Causa:** `claveForo(claseId, "lista")` era `["clases", claseId, "foros", "lista"]`, la misma clave que `claveListaDeForos(claseId)`. Con la lista en caché, `…/foros/lista` y `…/foros/lista/editar` recibían sus páginas y la aplicación entera se rompía.
- **Remedio,** en `frontend/src/services/trabajoService.ts`, con el precedente del segmento `"alumno"` en las entregas:
  - antes: `claveForo = (claseId, foroId) => [...clavePrefijoDeForos(claseId), foroId]`, que daba `["clases", claseId, "foros", foroId]`;
  - después: `claveForo = (claseId, foroId) => [...clavePrefijoDeForos(claseId), "foro", foroId]`, que da `["clases", claseId, "foros", "foro", foroId]`.
- **Lo que no cambia:**
  - `claveListaDeForos` (de 01c1, en `88b37af`) sigue igual, así que `features/clases` y sus pruebas no se tocan;
  - todo sigue colgando de `clavePrefijoDeForos`, así que invalidar el prefijo alcanza la lista y cada foro;
  - lo de 01d y 01e seguirá colgando de `claveForo`.
- **Por qué no puede volver a chocar:** en la posición 3, la lista lleva `"lista"` y cada foro lleva `"foro"`. Ninguna clave coincide con la otra ni es prefijo de la otra, sea cual sea el `foroId`.
- **Desviación del plan:** §D-8 (`plan.md:1748-1749`) escribe literalmente `claveForo(claseId, foroId) = ["clases", claseId, "foros", foroId]`. El remedio cambia esa forma. No edité el plan; lo arbitra el manager.

### Casos nuevos y su rojo previo
**`frontend/src/features/tareas/claves-foro-01c2.test.ts`** (nuevo), 7 casos:
- Título: «T-01: con foroId «%s», claveForo no es la de la lista ni una es prefijo de la otra, y las dos cuelgan de clavePrefijoDeForos».
- Valores de `foroId`: `lista`, `foro`, `nuevo`, `""`, un uuid, `LISTA` y `foros`.
- Antes del remedio caía el de `lista`.

**`frontend/src/features/tareas/foro-detalle-01c.test.tsx`,** en el bloque «T-01 (ronda 1 de 01c2) · el foro «lista» no recibe la lista de «Foro» de la caché». El doble del servidor ahora responde `400 VALIDACION` con `foroId:` ante un id que no es uuid, y la lista de «Foro» trae filas.
- «T-01: %s abre «Foro» y después …/foros/lista: dice «Ese foro ya no existe.» sin romperse, y al volver a «Foro» la lista sigue», con maestro y con estudiante.
- «T-01: el maestro abre «Foro» y después …/foros/lista/editar: dice «Ese foro ya no existe.» sin romperse, y al volver a «Foro» la lista sigue».
- «T-01: abrir primero …/foros/lista y después «Foro» no ensucia la lista: «Foro» muestra sus filas». Es el control del camino inverso y pasaba desde antes.

Rojo previo: `npx vitest run src/features/tareas/foro-detalle-01c.test.tsx src/features/tareas/claves-foro-01c2.test.ts` dio `Tests  4 failed | 38 passed (42)`.
- Los tres de las vistas cayeron por `TypeError: Cannot read properties of undefined (reading 'autor')`, o `'puedeEditar'` en la edición, con «Error handled by React Router default ErrorBoundary».
- El de las claves cayó con `lista`.

Después del remedio, los cuatro pasan, y también los tres casos de ATQ-FORO-111 del tester.

### Hermanos y estados vecinos, uno por uno
1. **`…/foros/lista/editar`:** aplica y está aplicado; la misma clave lo resuelve. Tiene su caso propio, arriba.
2. **`foros/nuevo` como `:foroId`:** la ruta literal `foros/nuevo` va antes de `foros/:foroId` en las tres ramas. En el estudiante lleva a `/login`; en el maestro y el admin, a `CrearForoView`. Así que `"nuevo"` nunca llega a `useForo` desde `foros/nuevo`.
   - Sí llega desde `…/foros/nuevo/editar`, del maestro y del admin, que entra por `foros/:foroId/editar`.
   - Ahí `claveForo(claseId, "nuevo")` ya no choca con nada y el servidor responde `400 VALIDACION` de `foroId:`, así que la vista dice «Ese foro ya no existe.».
   - El caso puro cubre `nuevo`; no hay un caso de vista para esa ruta.
3. **Claves literales del foro en lugar de `claveForo`:**
   - **Producción:** todo `setQueryData`, `removeQueries`, `invalidateQueries`, `getQueryState`, `cancelQueries` y la variante del aviso del foro en `features/tareas/hooks.ts`, y `consultaForo`, usan `claveForo`. No encontré ninguna clave literal.
   - **Mis pruebas:** `hermanos-03d-01c.test.tsx` leía `["clases", CLASE, config.segmento, ACTIVIDAD_ID]` en el caso del `403` de T-05. Ahora usa `claveForo` o `claveTarea` según el tipo. Las demás pruebas ya usaban `claveForo`.
   - **La `*.ataque` del tester:** usa `claveForo`, así que no se puso roja.
4. **Las claves de 01d y 01e** (participaciones, réplicas, mi participación, participantes, un participante, sus participaciones y las devoluciones) colgarán de `claveForo`, o sea de `[…, "foros", "foro", foroId, …]`. Quedan fuera del espacio de la lista y debajo del foro, así que invalidar `claveForo` las alcanza. No las creé.
5. **Las demás claves de `trabajoService.ts`:** no hay un choque alcanzable.
   - `claveTarea(claseId, tareaId)` es `[…, "tareas", tareaId]`. Ninguna clave fija vive en `[…, "tareas", <palabra>]`: solo `features/clases` invalida el prefijo `[…, "tareas"]`, y las entregas cuelgan con `"entrega"` y `"entregas"` bajo la tarea. La ruta `tareas/nueva` es literal.
   - `claveTrabajo(claseId, tema)` es `[…, "trabajo", tema]`, con `tema` igual a `"sin-tema"` o al id de un tema. Ese id sale de los datos, nunca de la ruta, y un uuid no puede ser `"sin-tema"`.
   - `claveTemas` y `claveCategorias` no llevan ningún id.
6. **O-01c2-2, `claveClaseDetalle("anteriores")` frente a `claveClasesAnteriores()`:** no lo toqué (`services/clasesService.ts` está en «No se toca» y es anterior a FORO-01). Por lectura del router, **es alcanzable**:
   - `…/estudiante/clases/:claseId`, `…/maestro/clases/:claseId` y `…/admin/clases/:claseId` aceptan `claseId = "anteriores"`, y `ClaseLayout` pediría `["clases", "anteriores"]`, la misma clave que «Clases anteriores» (`/estudiante/clases-anteriores`) o «Clases archivadas» del maestro dejan en caché;
   - lo mismo pasa con `CLAVE_CLASES_INSCRITAS = ["clases", "inscritas"]` y `CLAVE_CLASES_IMPARTIDAS = ["clases", "impartidas"]` frente a `claveClaseDetalle("inscritas")` o `("impartidas")`. Esas dos listas las carga siempre la barra lateral, así que `…/clases/inscritas` o `…/clases/impartidas` pediría la clase con la lista en caché;
   - no lo verifiqué con una prueba. Lo dejo como observación para el orquestador.

### N-32: corregido
- **FORO-1C13, éxito** (`foro-detalle-01c.test.tsx`).
  - Título nuevo: «FORO-1C13: con éxito avisa «Foro borrado», saca el foro de la caché, marca viejas la lista de «Foro» (que se vuelve a pedir), las actividades, los temas, las categorías y las calificaciones, y navega a «Foro»».
  - Aserciones nuevas:
    - la lista, que estaba fresca en caché, se vuelve a pedir al llegar a «Foro»;
    - `isInvalidated === true` en las actividades (`[…trabajo, "sin-tema"]`), los temas, las categorías y las calificaciones (`[…calificaciones, "gradebook"]`).
- **FORO-1C05, publicar** (`crear-editar-foro-01c.test.tsx`).
  - Título nuevo: «FORO-1C05: «Publicar foro» manda el cuerpo del foro (sin requiereAdjuntos), avisa «Foro publicado», marca viejas la lista de «Foro», las actividades y las calificaciones, vuelve a pedir los temas y navega al foro nuevo».
  - Aserción nueva: los temas se vuelven a pedir. El formulario abierto los observa, así que no quedan en `isInvalidated` sino que se piden otra vez.
- **Mutaciones** (en `hooks.ts`, quitando una invalidación a la vez de `invalidarTrasCambiarElForo`):

  | Mutación | Qué quita | Qué cae |
  |---|---|---|
  | P1 | la lista | FORO-1C05 publicar y guardar, y FORO-1C13 |
  | P2 | las actividades | FORO-1C05 publicar y FORO-1C13 |
  | P3 | los temas | FORO-1C05 publicar y FORO-1C13 |
  | P4 | las categorías | FORO-1C13 |
  | P5 | las calificaciones | FORO-1C05 publicar y FORO-1C13 |

  Todas con copia, ancla única (el bloque de cinco líneas del foro), restauración y `cmp igual: True`.
- **Mutación de T-01:** P6 vuelve a la forma vieja de `claveForo` en `trabajoService.ts`. Caen los 4 casos de T-01: el puro y los tres de las vistas. `cmp igual: True`.

### `*.ataque` que el remedio puso en rojo
Ninguna. ATQ-FORO-111 pasa a verde y las demás siguen en verde. `lib/guardas-ch4-r1.ataque.test.ts` aparece modificado en `git status`, pero es la ronda 0 bis del tester (C-15) y ahora está en verde.

### Conteos
`npx vitest list` de los tres archivos que cambiaron, contado con `grep -a -c`:

| Archivo | Casos | Antes |
|---|---|---|
| `claves-foro-01c2` (nuevo) | 7 | — |
| `foro-detalle-01c` | 35 | 31 |
| `crear-editar-foro-01c` | 15 | sin cambio |

### Verificación
Desde `frontend/`, una corrida a la vez:

| Comando | Última línea |
|---|---|
| `npm run lint` | sale con 0; termina en `> tsc -b` |
| `npm run build` | `✓ built in 902ms` |
| `npx vitest run src/features/tareas` | `Tests  1511 passed (1511)` (`Test Files  52 passed (52)`) |
| `npx vitest run src/features/clases` | `Tests  3138 passed (3138)` (`Test Files  128 passed (128)`) |
| `npx vitest run src/app src/lib src/services` | `Tests  983 passed (983)` (`Test Files  66 passed (66)`) |

### `git status --short -- frontend`
```
 M frontend/src/app/router.tsx
 M frontend/src/features/tareas/clase-archivada-01d2-tareas.test.tsx
 M frontend/src/features/tareas/components/acciones-de-la-tarea.tsx
 M frontend/src/features/tareas/components/detalles-de-la-tarea.tsx
 M frontend/src/features/tareas/components/formulario-tarea.tsx
 M frontend/src/features/tareas/data.ts
 M frontend/src/features/tareas/editar-tarea-view.test.tsx
 M frontend/src/features/tareas/editar-tarea-view.tsx
 M frontend/src/features/tareas/hooks.ts
 M frontend/src/features/tareas/lib.ts
 M frontend/src/features/tareas/types.ts
 M frontend/src/lib/estado-por-id-estatico-ch6.test.ts
 M frontend/src/lib/guardas-ch4-r1.ataque.test.ts
 M frontend/src/lib/guardas-de-doble-clic-estatico.test.ts
 M frontend/src/services/trabajoService.ts
?? frontend/src/features/tareas/claves-foro-01c2.test.ts
?? frontend/src/features/tareas/crear-editar-foro-01c.test.tsx
?? frontend/src/features/tareas/crear-foro-view.tsx
?? frontend/src/features/tareas/editar-foro-view.tsx
?? frontend/src/features/tareas/errores-foro-01c.test.tsx
?? frontend/src/features/tareas/formulario-foro-01c.test.tsx
?? frontend/src/features/tareas/foro-detalle-01c.test.tsx
?? frontend/src/features/tareas/foro-view.tsx
?? frontend/src/features/tareas/foros-01c2-r1.ataque.test.tsx
?? frontend/src/features/tareas/hermanos-03d-01c.test.tsx
?? frontend/src/features/tareas/recuperar-foro-01c.test.tsx
?? frontend/src/features/tareas/traduccion-foro-01c.test.ts
?? frontend/src/features/tareas/vecinos-formulario-tarea-01c.test.tsx
```

Son 28 en total. Mío nuevo en esta ronda: `claves-foro-01c2.test.ts`. Del tester: `guardas-ch4-r1.ataque.test.ts` (C-15) y `foros-01c2-r1.ataque.test.tsx`. La desviación 6 queda como la tarea, por decisión del humano, sin cambios.

## Corrección tras la ronda 2 — FORO-01c2: T-02 y T-03 (2026-11-16)

Estado: **terminado**, sin PARADA. No toqué ninguna `*.ataque`, y ninguna prueba normal ni `*.ataque` ajena se puso roja.

### T-02: el uuid en mayúsculas en la ruta (corregido con el remedio aceptado por el manager)
- **Antes:** `ForoView` y `EditarForoView` pasaban el `:foroId` tal cual venía en la ruta. El backend lo pasa a minúsculas, así que con un uuid en mayúsculas la consulta, la `key`, los ganchos y la clave de foco vivían bajo una clave, y el borrado y los enlaces (que usan `foro.id`) bajo otra.
- **Después:**
  - `features/tareas/lib.ts` gana `idCanonicoDeLaRuta = (id) => id.toLowerCase()`, una función pura con su comentario.
  - `foro-view.tsx` hace `<DetalleDelForo claseId={claseId} foroId={idCanonicoDeLaRuta(foroId)} />`.
  - `editar-foro-view.tsx` hace `<EditarForoDeLaClase claseId={claseId} foroId={idCanonicoDeLaRuta(foroId)} />`.
  - Las dos lo aplican a la entrada, así que todo lo de abajo usa el id canónico: la consulta, las `key`, la clave de foco, los ganchos, `detalle`, «Cancelar» y la navegación tras guardar.
  - Un id que no es uuid llega al servidor igual que antes (solo cambian las letras), y el servidor responde su `400` de `foroId`.
- **Lo que no hice,** porque el manager lo rechazó: ni `AccionesDeLaTarea` con el id de la URL, ni rechazar las mayúsculas, ni normalizar dentro de los ganchos.
- **La tarea tiene el mismo defecto y no lo corregí:** `detalle-tarea-view.tsx` no está en «Se toca». Va a `ESTADO.md` §3.

### T-03: el detalle del foro al renombrar o borrar un tema, o al guardar las categorías (corregido con autorización escrita del humano)
Este es el diff exacto de `frontend/src/features/clases/hooks.ts` contra `88b37af` (`git diff -U2`). Solo cambian el import y las tres invalidaciones autorizadas:

```diff
@@ -66,4 +66,5 @@ import {
   claveCategorias,
   claveListaDeForos,
+  clavePrefijoDeForos,
   clavePrefijoDelTrabajo,
   claveTarea,
@@ -1466,8 +1467,9 @@ export const useRenombrarTema = (claseId: string) => {
     onSuccess: async () => {
       toast.success(TEXTOS_TEMAS.avisoRenombrado)
-      // El nombre del tema también sale en el detalle de sus tareas.
+      // El nombre del tema también sale en el detalle de sus tareas y de sus foros (FORO-01c2, T-03).
       await Promise.all([
         invalidarTemas(queryClient, claseId),
         queryClient.invalidateQueries({ queryKey: ["clases", claseId, "tareas"] }),
+        queryClient.invalidateQueries({ queryKey: clavePrefijoDeForos(claseId) }),
       ])
     },
@@ -1490,7 +1492,9 @@ export const useBorrarTema = (claseId: string) => {
     onSuccess: async () => {
       toast.success(TEXTOS_TEMAS.avisoBorrado)
+      // FORO-01c2 (T-03): el tema también sale en el detalle de sus foros.
       await Promise.all([
         invalidarTemasYTrabajo(queryClient, claseId),
         queryClient.invalidateQueries({ queryKey: ["clases", claseId, "tareas"] }),
+        queryClient.invalidateQueries({ queryKey: clavePrefijoDeForos(claseId) }),
       ])
     },
@@ -2132,6 +2136,9 @@ export const useGuardarCategorias = (claseId: string) => {
       queryClient.setQueryData(claveCategorias(claseId), respuesta)
       toast.success(TEXTOS_CATEGORIAS.avisoGuardadas)
-      // La categoría y su peso también salen en el detalle de las tareas.
-      await queryClient.invalidateQueries({ queryKey: ["clases", claseId, "tareas"] })
+      // La categoría y su peso también salen en el detalle de las tareas y de los foros (FORO-01c2, T-03).
+      await Promise.all([
+        queryClient.invalidateQueries({ queryKey: ["clases", claseId, "tareas"] }),
+        queryClient.invalidateQueries({ queryKey: clavePrefijoDeForos(claseId) }),
+      ])
     },
```

- **SHA-256** de `features/clases/hooks.ts`: antes `2892d76c…0854`, después `32d7d025292b7863a487d9c5b2286446a99c1813ef03866e7a23e917dd26aa64`.
- **Alcance:** el prefijo completo de los foros, el mismo que la tarea da a `["clases", claseId, "tareas"]`, como acepta el arbitraje. `useMoverElemento` queda para 01d.

### Casos nuevos, con su rojo previo
- **`frontend/src/features/tareas/claves-foro-01c2.test.ts`,** bloque «T-02 (ronda 2 de 01c2) · el id de la ruta en su forma canónica»:
  - «T-02: idCanonicoDeLaRuta pasa un uuid a minúsculas, deja igual uno ya canónico y no inventa nada con lo que no es uuid»;
  - «T-02: con el id en mayúsculas y en minúsculas, claveForo da la misma clave tras la forma canónica».
- **`frontend/src/features/tareas/crear-editar-foro-01c.test.tsx`,** bloque «T-02 (ronda 2 de 01c2) · editar con el id de la ruta en mayúsculas»:
  - «T-02: con el detalle en minúsculas en caché, guardar desde …/foros/<MAYÚSCULAS>/editar escribe en esa misma clave: el detalle muestra lo nuevo sin volver a pedirlo».
  - El doble del servidor ahora pasa el uuid a minúsculas, como `foroIdParamSchema`.
- **Rojo previo, por mutación.** Escribí el remedio antes que estos casos. Para cumplir el «rojo primero», lo comprobé quitando la forma canónica (mutaciones Q1 y Q2, abajo):
  - sin la normalización en `EditarForoView`, el caso de la edición cae: el detalle en minúsculas sigue con el título viejo;
  - sin la de `ForoView`, caen los dos casos «en mayúsculas» de ATQ-FORO-126.
  - Las pruebas puras no dependen de una vista.
- **T-03:** no agregué casos. Lo vigilan los tres de ATQ-FORO-127, que estaban en rojo antes del remedio (el reporte del tester) y ahora pasan. Q3 a Q5 los tumban uno por uno.

### Los vecinos de «la clave bajo la que vive un foro»
**Quién la lee**
| # | Vecino | Estado | Caso o razón |
|---|---|---|---|
| 1 | `useForo` en `ForoView` | Aplica; aplicado (recibe el id canónico) | ATQ-FORO-126 en mayúsculas (Q1) |
| 2 | `useForo` en `EditarForoDeLaClase` (clave de foco) | Aplica; aplicado (el mismo `foroId` canónico) | El caso T-02 de la edición (Q2) |
| 3 | `useForo` en `EdicionDelForo` | Aplica; aplicado | El caso T-02 de la edición |
| 4 | El aviso de recarga fallida en las dos vistas y su memoria `ultimoFalloAvisado` | Aplica; aplicado. La memoria va por la instancia de la consulta, y esa instancia es la de la clave canónica | FORO-1C12, FORO-1C24 y FORO-1C26. No hay caso propio en mayúsculas: la clave es la misma de 1 y 2 |
| 5 | `renovarTrasErrorAlBorrar`, que cuenta los observadores de `claveForo(claseId, tarea.id)` | Aplica; aplicado. `tarea.id` y la clave que mira la vista ahora coinciden | ATQ-FORO-126: «en mayúsculas, borrar con un 404 con la vista montada la reemplaza con «Ese foro ya no existe.»» |

**Quién la escribe**
| # | Vecino | Estado | Caso o razón |
|---|---|---|---|
| 6 | `useEditarForo` al guardar (`setQueryData`) | Aplicado | El caso T-02 de la edición |
| 7 | La recarga y el reinicio tras un `409` (`consulta.refetch()`) | Aplicado: la consulta es la de la clave canónica | FORO-1C05 (el 409), con la misma clave |

**Quién la quita o la marca vieja**
| # | Vecino | Estado | Caso o razón |
|---|---|---|---|
| 8 | Borrar con éxito (`removeQueries(claveForo(claseId, tarea.id))`) | Aplicado | ATQ-FORO-126: «en mayúsculas, borrar con éxito y volver «atrás» no pinta el foro borrado» |
| 9 | `marcarViejaLaActividadTrasConflicto` | Aplicado: recibe el `foroId` canónico de `useEditarForo` | FORO-1C36 (FORO-1C31) y FORO-1C41 |
| 10 | `pedirDeNuevoElForo` | Aplicado: recibe el canónico desde la edición, `tarea.id` desde el borrado y el canónico desde la descarga | FORO-1C37 y FORO-1C36 (FORO-1C35) |
| 11 | `invalidarTrasCambiarElForo` | No aplica: no usa el `foroId` (invalida las listas) | — |
| 12 | Las tres mutaciones de `features/clases/hooks.ts` | Aplicado | ATQ-FORO-127 ×3 (Q3, Q4 y Q5) |
| 13 | `features/clases/hooks.ts`, alrededor de `:367` y `:674` (con el import nuevo, una línea más abajo). Invalidan `claveClaseDetalle(claseId)` sin `exact`, el prefijo `["clases", claseId]` | Ya aplica: alcanza `["clases", claseId, "foros", …]`, la lista y cada foro | Sin caso nuevo |

**`key` y navegación**
| # | Vecino | Estado | Caso o razón |
|---|---|---|---|
| 14 | `key={foroId}` de la edición y `key={foro.id}` del bloque del detalle | Coinciden: los dos son el id canónico | FORO-1C52 (las dos vistas) |
| 15 | La navegación tras publicar (`foro.id`) y los enlaces de la lista (`foro.id`) | Ya eran canónicos; no aplica cambio | FORO-1C05 y FORO-1C24 (desde «Foro») |
| 16 | «Cancelar» y la vuelta al detalle tras guardar (`detalle = …/foros/${foroId}`) | Aplicado: se arma con el canónico | El caso T-02 de la edición: tras guardar, el detalle en minúsculas muestra lo nuevo. «Editar foro» de `AccionesDeLaTarea` usa `tarea.id`, que también es canónico |

**Fuera, con su razón**
| # | Vecino | Por qué queda fuera |
|---|---|---|
| 17 | `useMoverElemento` | Es de 01d (fila «Mover un foro» de §D-10), con el id de la publicación, que es canónico |
| 18 | La tarea | El mismo defecto en `detalle-tarea-view.tsx` y sus hermanas, que no están en «Se toca». Va a `ESTADO.md` §3 |
| 19 | El `claseId` en mayúsculas | Es de la familia de O-01c2-2 (`ConClaseDeLaRuta` y `services/clasesService.ts`, en «No se toca»). No lo toqué |
| 20 | El detalle o la edición de un recurso | `editar-recurso-view.tsx` usa el `:recursoId` de la ruta, misma familia. Observación sin verificar; `features/clases` no se toca salvo lo autorizado |

**Vecinos que agrego**
| # | Vecino | Estado |
|---|---|---|
| 21 | Un id que no es uuid y solo difiere en mayúsculas (`…/foros/LISTA`) | Ahora va al servidor como `lista` y bajo `claveForo(claseId, "lista")`. Con T-01 ya no choca con la lista; el servidor responde `400` de `foroId` y la vista dice «Ese foro ya no existe.». Lo cubren el caso puro, que incluye `LISTA`, y los casos de T-01 |
| 22 | La URL de la barra del navegador | Sigue con las mayúsculas que escribió la persona: no se redirige a la forma canónica. Solo cambia la clave y lo que se pide. Me pareció suficiente, porque el arbitraje no pide redirigir |

### Mutaciones
Todas con copia, ancla única, restauración y `cmp igual: True`.

| Mutación | Qué quita | Qué cae |
|---|---|---|
| Q1 (`foro-view.tsx`) | `idCanonicoDeLaRuta` | Los dos casos «en mayúsculas» de ATQ-FORO-126 |
| Q2 (`editar-foro-view.tsx`) | `idCanonicoDeLaRuta` | «T-02: con el detalle en minúsculas en caché, guardar desde …/foros/<MAYÚSCULAS>/editar…» |
| Q3 (`features/clases/hooks.ts`) | La invalidación nueva de `useRenombrarTema` | ATQ-FORO-127 «Renombrar el tema» |
| Q4 (`features/clases/hooks.ts`) | La de `useBorrarTema` | ATQ-FORO-127 «Borrar el tema» |
| Q5 (`features/clases/hooks.ts`) | La de `useGuardarCategorias` | ATQ-FORO-127 «Guardar las categorías» |

### Conteos
`npx vitest list`, contado con `grep -a -c`:
- `claves-foro-01c2`: 9 casos, antes 7;
- `crear-editar-foro-01c`: 16, antes 15.

### Verificación
Desde `frontend/`, una corrida a la vez:

| Comando | Última línea |
|---|---|
| `npm run lint` | sale con 0; termina en `> tsc -b` |
| `npm run build` | `✓ built in 1.29s` |
| `npx vitest run src/features/tareas` | `Tests  1553 passed (1553)` (`Test Files  53 passed (53)`) |
| `npx vitest run src/features/clases` | `Tests  3141 passed (3141)` (`Test Files  129 passed (129)`) |
| `npx vitest run src/app src/lib src/services` | `Tests  983 passed (983)` (`Test Files  66 passed (66)`) |

### PARADAS y `*.ataque` rojas por el remedio
Ninguna.

### `git status --short -- frontend`
Son 31 entradas: 16 modificadas y 15 nuevas. Respecto de la ronda 1, se suman `features/clases/hooks.ts` (autorizado) y las dos `*.ataque` del tester de esta ronda (`foros-01c2-r2.ataque.test.tsx` y `features/clases/foros-01c2-r2-temas.ataque.test.tsx`).
```
 M frontend/src/app/router.tsx
 M frontend/src/features/clases/hooks.ts
 M frontend/src/features/tareas/clase-archivada-01d2-tareas.test.tsx
 M frontend/src/features/tareas/components/acciones-de-la-tarea.tsx
 M frontend/src/features/tareas/components/detalles-de-la-tarea.tsx
 M frontend/src/features/tareas/components/formulario-tarea.tsx
 M frontend/src/features/tareas/data.ts
 M frontend/src/features/tareas/editar-tarea-view.test.tsx
 M frontend/src/features/tareas/editar-tarea-view.tsx
 M frontend/src/features/tareas/hooks.ts
 M frontend/src/features/tareas/lib.ts
 M frontend/src/features/tareas/types.ts
 M frontend/src/lib/estado-por-id-estatico-ch6.test.ts
 M frontend/src/lib/guardas-ch4-r1.ataque.test.ts
 M frontend/src/lib/guardas-de-doble-clic-estatico.test.ts
 M frontend/src/services/trabajoService.ts
?? frontend/src/features/clases/foros-01c2-r2-temas.ataque.test.tsx
?? frontend/src/features/tareas/claves-foro-01c2.test.ts
?? frontend/src/features/tareas/crear-editar-foro-01c.test.tsx
?? frontend/src/features/tareas/crear-foro-view.tsx
?? frontend/src/features/tareas/editar-foro-view.tsx
?? frontend/src/features/tareas/errores-foro-01c.test.tsx
?? frontend/src/features/tareas/formulario-foro-01c.test.tsx
?? frontend/src/features/tareas/foro-detalle-01c.test.tsx
?? frontend/src/features/tareas/foro-view.tsx
?? frontend/src/features/tareas/foros-01c2-r1.ataque.test.tsx
?? frontend/src/features/tareas/foros-01c2-r2.ataque.test.tsx
?? frontend/src/features/tareas/hermanos-03d-01c.test.tsx
?? frontend/src/features/tareas/recuperar-foro-01c.test.tsx
?? frontend/src/features/tareas/traduccion-foro-01c.test.ts
?? frontend/src/features/tareas/vecinos-formulario-tarea-01c.test.tsx
```

## Implementación — FORO-01d (2026-11-16)

Plan: `docs/trabajo/FORO-01-actividad-tipo-foro/plan.md` (3374 líneas, con la Enmienda 12). Manda §E12, luego §E11, §E10 y así hasta §E7. Base: `60b5c88`. Solo `frontend/`: no toqué `shared/` ni el backend, y no corrí nada del backend.

Estado: **terminado**. Hubo una PARADA, resuelta por la Enmienda 12; la cuento abajo.

### La PARADA y su resolución
- **Qué la provocó.** Con los componentes de participación escritos, `npx vitest run src/features/clases` dio un rojo en `features/clases/estatico-02c-r1.ataque.test.ts`. La lista de lectores de `.puedeBorrar` no tenía `participacion-del-foro.tsx` ni `replicas-de-participacion.tsx`. Además, `npx vitest run src/app src/lib src/services src/styles` dio el rojo de V-06 (`styles/clases-r1.ataque.test.ts`), de 91 a 96 `enEspera=`. Las dos son `*.ataque` y no las toqué.
- **Resolución (Enmienda 12).** El tester aplicó en la ronda 0 bis:
  - C-21 (§E12.1): suma los dos componentes a los lectores de `.puedeBorrar`; la segunda regla no cambia;
  - C-13 (§E12.4): V-06 de 91 a 96, con `fijos` `formulario-de-participacion` 1, `participaciones-del-foro` 1, `replicas-de-participacion` 3, `participacion-del-foro` 0 y `mi-participacion` 0.
- **Lo que hice yo después.**
  - Quité la prop de rol con que pasaba «Borrar»: el botón lo decide solo el dato, `!soloLectura && ….puedeBorrar`, como confirmó el manager.
  - Respeté las dos restricciones nuevas de §E12.2:
    - ningún `.tsx` dice «Ocultar», ni en comentarios: `grep -rn "Ocultar" frontend/src --include=*.tsx --exclude=*.test.tsx` no da nada;
    - `features/clases` no tiene `.split(":")` ni copias de la expresión de ruta.
  - Cerré N-34 en `foro-detalle-01c.test.tsx:435-437`.

### Archivos tocados contra `60b5c88`
`git status --short -- frontend` da 27 entradas: 16 modificadas y 11 nuevas. Por clase:

**Producción (14 de los 15 de «Se toca»; `features/clases/types.ts` no hizo falta):**
- En `features/clases/`:
  - `hooks.ts`: `useTrabajo` con `conForos: "si"`; `useTemasDeLaSeccion` con `conForos=si` en «actividades»; `useMoverElemento` marca viejo `claveForo(claseId, publicacionId)` con `exact: true` (FORO-1D39).
  - `data.ts`: «Crear foro», la insignia «Foro», el rótulo «Foro:» y los textos de categorías en actividades (E1-9).
  - `trabajo-view.tsx`: «Crear foro» (`outline`), fuera de una clase archivada.
  - `components/seccion-de-tema.tsx`: la fila del foro con su insignia y su enlace a `foros/:id`.
- En `features/tareas/`, nuevos en `components/`: `participaciones-del-foro.tsx`, `participacion-del-foro.tsx`, `replicas-de-participacion.tsx`, `formulario-de-participacion.tsx` y `mi-participacion.tsx`.
- En `features/tareas/`, modificados:
  - `foro-view.tsx`: monta «Participaciones» y, para el alumno, «Tu participación»;
  - `hooks.ts`: las lecturas, las mutaciones, `pedirDeNuevoSoloElForo` y `useVerMasConservandoLaLista`;
  - `data.ts`: los textos de §D-9 y los límites;
  - `lib.ts`: las claves de §E11.3, las rutas y las funciones puras;
  - `types.ts`: las reexportaciones de `shared/` y tres interfaces.
- R-01d-5: no cambié los ganchos del foro de 01c2, `AccionesDeLaTarea`, `DetallesDeLaTarea` ni `idCanonicoDeLaRuta`.

**Pruebas nuevas (6):**
- `features/clases/actividades-foros-01d.test.tsx`;
- en `features/tareas/`: `participar-01d.test.tsx`, `errores-participacion-01d.test.tsx`, `replicas-01d.test.tsx`, `borrar-participacion-01d.test.tsx` y `recuperar-participaciones-01d.test.tsx`.

**Lista cerrada de pruebas normales (3):**
- `features/clases/contenido-03c2.test.tsx:235/242`: el título y la URL `…/temas?seccion=actividades&conForos=si`.
- `features/clases/categorias-view.test.tsx`: los textos de categorías en actividades.
- `features/tareas/foro-detalle-01c.test.tsx:435-437` (N-34): el «después» literal.

**`*.ataque` modificadas por el tester, no por mí (4):**
- `features/clases/categorias-01e-r1.ataque.test.tsx` y `categorias-01e-r2.ataque.test.tsx` (C-12);
- `features/clases/estatico-02c-r1.ataque.test.ts` (C-21);
- `styles/clases-r1.ataque.test.ts` (C-13).

Nada fuera de «Se toca»: ni `fila-de-entrega.tsx`, ni `services/**`, ni `components/**`, ni `router.tsx`, ni `entregas-view.tsx`. Tampoco `docs/trabajo/DEPLOY-investigacion-vps.md`, que es del humano.

### `enEspera=` por archivo (V-06)
`grep -rho "enEspera=" frontend/src --include=*.tsx --exclude=*.test.tsx | wc -l` da **96**. Por archivo, con `grep -o 'enEspera=' <archivo> | wc -l`:

| Archivo | `enEspera=` | Control |
|---|---|---|
| `formulario-de-participacion.tsx` | 1 | «Publicar participación» |
| `participaciones-del-foro.tsx` | 1 | «Ver más participaciones» |
| `replicas-de-participacion.tsx` | 3 | «Sí, borrar …», «Publicar réplica» y «Ver más réplicas» |
| `participacion-del-foro.tsx` | 0 | — |
| `mi-participacion.tsx` | 0 | — |

Los dos «Ver más» usan `enEspera={….isFetching}`, no `isFetchingNextPage`.

### Pruebas requeridas de 01d: archivo y título exacto
Los archivos de `features/tareas/` se nombran sin carpeta; el de `features/clases/` lleva la suya. Los títulos con `%s` son de `it.each`. Las variantes de réplica de FORO-1D05 a FORO-1D09 se llaman «FORO-1D10 (FORO-1D0x): …» y corren dos veces, en los `describe` «Errores fuera de contrato al publicar 'la réplica'» (maestro) y «… 'la réplica del alumno'».

| Caso | Archivo | Título |
|---|---|---|
| FORO-1D01 | `participar-01d.test.tsx` | «FORO-1D01: el alumno sin principal y con el foro abierto ve «Escribe tu participación» y «Publicar participación», sin la nota de retraso»; «FORO-1D01: con participarConRetraso, la nota de retraso antes del campo»; «FORO-1D01: cerrado (sin poder participar, sin principal ni calificación), el texto de cerrado y ningún formulario»; «FORO-1D01: con su principal publicada, ni formulario ni texto de cerrado»; «FORO-1D01: el admin ve la nota de la administración y ningún formulario; el maestro, ningún formulario de principal; ninguno pide «mi-participacion»» |
| FORO-1D02 | `participar-01d.test.tsx` | «FORO-1D02: avisa, escribe «Tu participación» y la lista con la respuesta sin pedirlas otra vez, marca viejas la lista de «Foro», las actividades y las calificaciones, y lleva el foco a la participación nueva». La guarda está en FORO-1D50 |
| FORO-1D03 | `participar-01d.test.tsx` | «FORO-1D03: %s avisa con el texto del servidor, conserva lo escrito y vuelve a pedir «Tu participación» y la lista» (`PARTICIPACION_YA_PUBLICADA`, `PARTICIPACION_CALIFICADA` y `FORO_CERRADO`) |
| FORO-1D04 | `participar-01d.test.tsx` | «FORO-1D04: «Con retraso» sale solo con conRetraso, y cada participación muestra su fecha y hora»; «FORO-1D04: la nota de retraso sale solo de participarConRetraso: en false no sale aunque el foro esté vencido; el cerrado, solo de puedeParticipar» |
| FORO-1D04b | `participar-01d.test.tsx` | «FORO-1D04b: los componentes de participación no leen la hora ni la fecha límite, y las funciones de la participación de lib.ts no comparan con la hora» |
| FORO-1D05 | `errores-participacion-01d.test.tsx` | «FORO-1D05: un VALIDACION de un campo que el formulario no pinta (foroId) da un solo aviso legible y ningún ErrorDeCampo» |
| FORO-1D06 | `errores-participacion-01d.test.tsx` | «FORO-1D06: un VALIDACION con el mensaje «%s» da un solo aviso con el genérico de publicar» (vacío y solo espacios) |
| FORO-1D07 | `errores-participacion-01d.test.tsx` | «FORO-1D07: con prefijo de ruta «texto.0:», el ErrorDeCampo de «Escribe tu participación» sin la ruta y sin aviso» |
| FORO-1D08 | `errores-participacion-01d.test.tsx` | «FORO-1D08: tras el ErrorDeCampo de «texto:» del servidor, un envío vacío muestra solo «Escribe tu participación» y no pide nada» |
| FORO-1D09 | `errores-participacion-01d.test.tsx` | «FORO-1D09: cada entrada de ENTRADAS_FUERA_DE_CONTRATO da un solo aviso, con el resto sin la ruta o el genérico, ningún ErrorDeCampo, y lo escrito se conserva» |
| FORO-1D10 | `replicas-01d.test.tsx` | «FORO-1D10 (FORO-1D05): …», «FORO-1D10 (FORO-1D06): un VALIDACION con el mensaje «%s» …», «FORO-1D10 (FORO-1D07): con prefijo de ruta «texto.0:», el ErrorDeCampo de «Escribe tu réplica» sin la ruta y sin aviso», «FORO-1D10 (FORO-1D08): … «Escribe tu réplica» y no pide nada» y «FORO-1D10 (FORO-1D09): …»; cada uno para el maestro y para el alumno que puede replicar (12 casos) |
| FORO-1D11 | `replicas-01d.test.tsx` | «FORO-1D11: sin réplicas, quien puede replicar ve «Replicar»; al abrir dice «Ocultar réplicas», es el mismo botón y conserva el foco»; «FORO-1D11: con réplicas, «Ver réplicas (n)»; al abrir se ven y al plegar vuelve a decir «Ver réplicas (n)»»; «FORO-1D11: con 0 en la lista y réplicas que llegan al abrir el bloque, al plegar dice «Ver réplicas (n)» con lo visto (O-r1-2)»; «FORO-1D11: el admin sin réplicas no ve el control; con réplicas, «Ver réplicas (n)»»; «FORO-1D11: el alumno que no puede replicar no ve «Replicar» ni el formulario; el que puede, sí» |
| FORO-1D12 | `replicas-01d.test.tsx` | «FORO-1D12: la réplica se agrega al bloque sin pedirlo otra vez, el conteo sube, el campo se vacía y el foco vuelve al campo»; «FORO-1D12: con 404 PARTICIPACION_NO_ENCONTRADA avisa «Esa participación ya no existe.» y renueva la lista»; «FORO-1D12: abrir las réplicas de una principal que ya no existe (404 PARTICIPACION_NO_ENCONTRADA) dice «Esa participación ya no existe.» en el bloque, sin aviso, y renueva la lista una vez». **Maestro después de la fecha: no cubierto con un caso propio.** El formulario de réplica sale de `puedeReplicar` (el maestro siempre, fuera de una archivada), sin leer la fecha, y FORO-1D04b vigila que los componentes no lean la hora |
| FORO-1D20 | `recuperar-participaciones-01d.test.tsx` | «FORO-1D20: abrir el foro desde «Foro» antes de 30 s pide la primera página y la frase desaparece» |
| FORO-1D21 | igual | «FORO-1D21: abrirlo desde «Actividades de aprendizaje» pide la primera página y la frase desaparece» |
| FORO-1D22 | igual | «FORO-1D22: atrás y adelante del historial piden la primera página y la frase desaparece» |
| FORO-1D23 | igual | «FORO-1D23: pulsar «Foro» y volver al foro pide la primera página y la frase desaparece»; «FORO-1D23: saltar al foro B y volver al A pide la primera página de A y la frase desaparece» |
| FORO-1D24 | igual | «FORO-1D24: «Ocultar réplicas» y «Ver réplicas» vuelven a pedir la primera página, no la de la caché» |
| FORO-1D25 | igual | «FORO-1D25: salir del foro y volver antes de 30 s, y abrir el bloque, pide la primera página»; «FORO-1D25: saltar al foro B y volver al A, y abrir el bloque, pide la primera página» |
| FORO-1D26 | igual | «FORO-1D26: una recarga fallida conserva la lista y avisa una vez; el siguiente fallo avisa otra vez; una lectura correcta no avisa y volver a abrir no repite ninguno» |
| FORO-1D27 | igual | «FORO-1D27: (estudiante) «Escribe tu participación» con un 5xx avisa; lo escrito sigue y el mismo botón publica»; «FORO-1D27: (maestro) «Escribe tu réplica» con un 5xx avisa; lo escrito sigue y el mismo botón publica» |
| FORO-1D28 | `participar-01d.test.tsx` | «FORO-1D28: sin participar, «Asignado» y «Todavía no participas.»»; «FORO-1D28: con su principal (conRetraso false), «Entregado» y «Participaste el … a las …»»; «FORO-1D28: con su principal (conRetraso true), «Entregado con retraso» y «Participaste el … a las … con retraso»»; «FORO-1D28: el maestro y el admin no ven «Tu participación»» |
| FORO-1D29 | `features/clases/actividades-foros-01d.test.tsx` | «FORO-1D29: %s pide los temas y el trabajo con seccion=actividades&conForos=si, con la misma clave de caché» (×3); «FORO-1D29: %s ve el foro como «Foro: …», con la insignia «Foro», y su enlace lleva a foros/:id» (alumno y maestro); «FORO-1D29: %s ve «Crear foro» junto a «Crear tarea», hacia foros/nuevo, y no en una clase archivada» (maestro y admin); «FORO-1D29: el alumno no ve «Crear foro»»; «FORO-1D29: para el alumno, entrega null y { asignado, conRetraso: false } pintan la misma insignia y la misma segunda línea, con el foro %s» (abierto y vencido); «FORO-1D29: «Mover» un foro con éxito avisa y lo pasa al tema»; «FORO-1D29: «Mover» un foro con %s da un solo aviso, como el de una tarea» (`TEMA_NO_ENCONTRADO` y `PUBLICACION_NO_ENCONTRADA`). **`TAREA_MODIFICADA` en la edición abierta tras «Mover»: no cubierta con un caso propio.** La cubren por partes FORO-1C05 de 01c2 (la edición del foro ante un `409 TAREA_MODIFICADA` recarga y sigue con la versión nueva) y FORO-1D39 (mover marca viejo `claveForo`, así que abrir la edición después pide la versión nueva) |
| FORO-1D30 | `features/clases/actividades-foros-01d.test.tsx` | «FORO-1D30: tras la recarga fallida, abrir el foro desde su fila en «Actividades» lo pide de nuevo y muestra la versión nueva» |
| FORO-1D31 | igual | «FORO-1D31: «0 actividades», «1 actividad» y «Tiene 3 actividades.»; sin categorías, «Sus actividades se califican por puntos.»»; «FORO-1D31: un 409 CATEGORIA_CON_TAREAS con el texto de foros avisa una vez con el mensaje del servidor» |
| FORO-1D32 | `participar-01d.test.tsx` | «FORO-1D32: la primera carga fallida dice «No pudimos cargar tu participación.», sin aviso y sin el formulario» |
| FORO-1D33 | `recuperar-participaciones-01d.test.tsx` | «FORO-1D33: volver a abrir el foro desde «Foro» antes de 30 s pide «Tu participación» de nuevo»; «FORO-1D33: el siguiente fallo avisa otra vez y una lectura correcta no deja más avisos» |
| FORO-1D35 | `borrar-participacion-01d.test.tsx` | «FORO-1D35: el admin ve «Borrar» en cada principal y en cada réplica; el maestro y el alumno no»; «FORO-1D35: en una clase archivada el admin no ve «Borrar»»; «FORO-1D35: la confirmación de una principal y la de una réplica, con sus textos; «Cancelar» la cierra y devuelve el foco a «Borrar»». La guarda está en FORO-1D50 |
| FORO-1D36 | igual | «FORO-1D36: con 404 PARTICIPACION_NO_ENCONTRADA avisa «Esa participación ya no existe.», renueva la lista y la fila sale»; «FORO-1D36: con 403 BORRADO_NO_PERMITIDO avisa con el texto del servidor y renueva la lista»; «FORO-1D36: con un 5xx, un solo aviso; la confirmación sigue abierta y el botón sale de la espera»; «FORO-1D36: con 409 CLASE_ARCHIVADA avisa con el texto del servidor, la clase se vuelve a pedir y «Borrar» desaparece» |
| FORO-1D37 | igual | «FORO-1D37: tras un 5xx, el mismo botón vuelve a pedir el borrado y con éxito avisa «Participación borrada»»; y además, en el `describe` «FORO-1D37 · lo que se renueva al borrar», «FORO-1D37: con éxito se marcan viejas la lista de «Foro» (el conteo) y las calificaciones de la clase, y la lista de principales se vuelve a pedir» y «FORO-1D37: borrar una principal saca de la caché el bloque de sus réplicas» |
| FORO-1D38 | igual | «FORO-1D38: al borrar una principal de en medio, el foco va al «Borrar» de la que ocupa su lugar; la última, al de la anterior; sin vecinas, al h3»; «FORO-1D38: al borrar una réplica, el foco va al «Borrar» de la vecina y el conteo de la principal baja; sin vecinas, al encabezado del bloque» |
| FORO-1D39 | `features/clases/actividades-foros-01d.test.tsx` | «FORO-1D39: con el detalle en caché y sin observador, mover deja viejo el foro sin pedirlo y sin marcar sus participaciones; volver antes de 30 s lo pide y «Detalles» muestra el tema» (mutaciones D7 y D8 en rojo) |
| FORO-1D40 | `participar-01d.test.tsx` | «FORO-1D40: pide las participaciones y «Tu participación» en minúsculas, y publicar escribe en la clave que la vista lee: la nueva aparece sin otra lectura» (mutaciones D25 y D14 en rojo) |
| FORO-1D41 | `participar-01d.test.tsx` | «FORO-1D41: claveMiParticipacion, claveParticipaciones y claveReplicas cuelgan de claveForo con sus segmentos fijos»; «FORO-1D41: con participacionId «%s» ninguna clave coincide con otra del foro ni es prefijo de una que no sea suya, y ninguna es prefijo de la lista» (`mia`, `participaciones`, `replicas`, `lista` y `foro`) |
| FORO-1D42 | `participar-01d.test.tsx` | «FORO-1D42: con el foro en %s no sale ninguna lectura de participaciones ni de «Tu participación»» (×3); «FORO-1D42: si la lista de participaciones recibe %s con el foro en caché, se pide una sola vez más el foro, su respuesta reemplaza la vista con un solo mensaje y la lista no se repite» (×3); «FORO-1D42: con un servidor inconsistente (el foro responde 200 y la lista otra vez 403), el bloque se queda con su texto genérico, sin ciclo»; «FORO-1D42: un 404 NO_ENCONTRADO de la lista se queda en el bloque y no vuelve a pedir el foro». Sin `exact` (D1), el caso del servidor inconsistente se pone en rojo |
| FORO-1D50 | varios | «FORO-1D50: dos clics en el mismo render de «Publicar participación» mandan una sola petición» (`participar-01d`); «FORO-1D50: dos clics en el mismo render de «Publicar réplica» mandan una sola petición» y «FORO-1D50: dos clics en el mismo render de «Ver más réplicas» piden una sola página, y la página siguiente lleva el foco a la primera réplica nueva» (`replicas-01d`); «FORO-1D50: dos clics en el mismo render de «%s» mandan un solo DELETE» («Sí, borrar participación» y «Sí, borrar réplica», en `borrar-participacion-01d`); «FORO-1D50: dos clics en el mismo render de «Ver más participaciones» piden una sola página, y el foco va a la primera nueva» (`recuperar-participaciones-01d`) |
| FORO-1D51 | `recuperar-participaciones-01d.test.tsx` | «FORO-1D51: «Ver más participaciones» que falla (%s) conserva la lista, avisa una vez y el botón sigue a la vista» (`503` y sin red); «FORO-1D51: montar la vista con un fallo de recarga ya avisado (y su recarga en vuelo) no lo repite (memoria por consulta)»; con FORO-1D26 (dos fallos, dos avisos) y FORO-1D20 a FORO-1D25 (el cursor vencido, sin «Ver más»). «Ver más réplicas» con `5xx` no tiene un caso propio: usa el mismo gancho |
| FORO-1D52 | `participar-01d.test.tsx` | «FORO-1D52: el maestro con el bloque de réplicas abierto y una réplica a medio escribir salta al foro B y vuelve: nada queda abierto, nada se envía y el foco no cae en <body>»; «FORO-1D52: el admin con la confirmación de «Borrar» abierta salta al foro B y vuelve: no queda abierta y nada se borra» |
| FORO-1D53 | varios | «FORO-1D53: publicar con %s no avisa» y «FORO-1D53: la recarga de la lista y de «Tu participación» con %s no avisa» (`participar-01d`); «FORO-1D53: publicar una réplica con %s no avisa» (`replicas-01d`); «FORO-1D53: borrar una participación con %s no avisa» (`borrar-participacion-01d`); «FORO-1D53: «Ver más participaciones» con %s no avisa» (`recuperar-participaciones-01d`). Cada uno con `401 sin refresco`, `403 ACCESO_RESTRINGIDO` y `403 CAMBIO_DE_CONTRASENA_REQUERIDO` |
| FORO-1D54 | `features/clases/actividades-foros-01d.test.tsx` | «FORO-1D54: con la sección en error, pulsar «Actividades de aprendizaje» estando ahí la pide una sola vez, otra vez con conForos=si» |

**Casos que sumé en esta ronda, al cotejar el plan contra `npx vitest list`:**
- **FORO-1D10, el alumno que replica:** el plan dice «alumno y maestro» y solo estaba el maestro. Suma 6 casos.
- **FORO-1D53, el «Ver más»:** el plan lo nombra y no estaba. Suma 3 casos.
- **FORO-1D12, abrir el bloque de una principal que ya no existe:** ningún caso vigilaba la renovación de la lista desde la lectura; la mutación D34 sobrevivía. Suma 1 caso.
- **FORO-1D31, el `409 CATEGORIA_CON_TAREAS`:** el plan lo nombra y no estaba en el archivo del encargo. Suma 1 caso.

### Matriz de avisos y recargas
Las columnas de error son:
- «Reemplaza»: `404 TAREA_NO_ENCONTRADA`, `403 SIN_ACCESO_A_LA_CLASE` o `400 VALIDACION` de `foroId`, según `errorQueReemplazaLaVistaDelForo`.
- «Redirige»: los códigos de `CODIGOS_QUE_REDIRIGE_EL_CLIENTE`.
- «409» y «5xx o red».

Reglas comunes a toda la tabla:
- En «Reemplaza», se vuelve a pedir solo el foro (`pedirDeNuevoSoloElForo`, `exact`) y su respuesta reemplaza la vista con un solo mensaje. En una lectura, una vez por cada `errorUpdateCount` nuevo (R-01d-3). En una mutación, en su `onError`, como `alFallarUnaAccionDelForo` de 01c2: además va el aviso de la acción.
- En «Redirige», nunca hay aviso.

| Disparador | Reemplaza | Redirige | 409 | 5xx o red | Foco | En vuelo a la vez | Con la vista desmontada |
|---|---|---|---|---|---|---|---|
| Lectura de «Participaciones» (`useParticipaciones`) | pide el foro; el bloque no se repite (FORO-1D42) | sin aviso; el fallo queda marcado como avisado | `CLASE_ARCHIVADA`: sin aviso (`useAvisoDeRecargaFallidaDe`) | primera carga: «No pudimos cargar las participaciones.», sin aviso; recarga con datos: conserva la lista y avisa «No pudimos actualizar las participaciones. …» una vez por fallo (FORO-1D26 y FORO-1D51); cursor vencido: «Las participaciones cambiaron…», sin «Ver más» (FORO-1D20 a FORO-1D23) | no se mueve; si la recarga quita la fila enfocada, el foco va al `h3` | una lectura: la de TanStack Query | al salir en error queda vieja (`useMarcarViejaSiQuedoEnError`); el fallo ya avisado no se repite al montar (memoria por consulta, FORO-1D51) |
| Lectura de «Tu participación» (`useMiParticipacion`, solo el alumno) | igual (FORO-1D42) | sin aviso | sin aviso | primera carga: «No pudimos cargar tu participación.», sin aviso y sin formulario (FORO-1D32); recarga con datos: «No pudimos actualizar tu participación. …» una vez por fallo (FORO-1D33) | no se mueve | una | el fallo avisado no se repite (memoria por consulta) |
| Lectura de las réplicas (`useReplicas`, solo con el bloque abierto) | igual | sin aviso | — | primera carga: «No pudimos cargar las réplicas.»; con `404 PARTICIPACION_NO_ENCONTRADA`, «Esa participación ya no existe.» y la lista se renueva una vez por fallo (FORO-1D12); cursor vencido: «Las réplicas cambiaron…», sin «Ver más réplicas» (FORO-1D24 y FORO-1D25); recarga con datos: **sin aviso** (desviación 6) | no se mueve | una | al cerrar el bloque en error queda vieja: volver a abrirlo pide la primera página (FORO-1D24) |
| «Ver réplicas (n)», «Replicar» y «Ocultar réplicas» (un solo botón con `aria-expanded`) | — (no pide; abre o cierra el bloque) | — | — | — | se queda en el botón (FORO-1D11) | — | — |
| «Ver más participaciones» y «Ver más réplicas» (`useVerMasConservandoLaLista`) | sin aviso; pide el foro por la lectura | sin aviso | — | `5xx`: la lista se queda, con un aviso (FORO-1D51); cursor: la frase, sin aviso | a la primera fila nueva o, si no hay, al encabezado (`useFocoAlCargarMas`; FORO-1D50) | guarda `pidiendoRef` y `fetchNextPage({ cancelRefetch: false })`: dos clics piden una sola página (FORO-1D50) | sin aviso (`montado`) |
| «Publicar participación» (`usePublicarParticipacion`) | pide el foro y avisa con la acción | sin aviso (FORO-1D53) | `PARTICIPACION_YA_PUBLICADA`, `PARTICIPACION_CALIFICADA` y `FORO_CERRADO`: aviso con el texto del servidor, lo escrito se conserva y se piden «Tu participación» y la lista (FORO-1D03); `CLASE_ARCHIVADA`: la clase se marca vieja y un aviso | «No pudimos publicar tu participación. Inténtalo de nuevo.»; repetir publica (FORO-1D27); un `VALIDACION` de `texto` va al `ErrorDeCampo` (FORO-1D05 a FORO-1D09) | éxito: a la participación nueva (FORO-1D02); error: se queda en el botón | guarda `publicandoRef` (FORO-1D50) | el error de `texto` sale como aviso (`montado`); el éxito escribe la caché y avisa igual |
| «Publicar réplica» (`usePublicarReplica`) | igual | sin aviso | `FORO_CERRADO`: se pide «Tu participación»; `PARTICIPACION_NO_ENCONTRADA` (404): «Esa participación ya no existe.» y la lista se renueva (FORO-1D12) | «No pudimos publicar tu réplica. …»; repetir publica (FORO-1D27) | éxito: el campo se vacía y el foco vuelve al campo (FORO-1D12) | guarda `publicandoRef` (FORO-1D50) | igual que la principal |
| «Sí, borrar participación» o «Sí, borrar réplica» (`useBorrarParticipacion`) | pide el foro y avisa | sin aviso (FORO-1D53) | `CLASE_ARCHIVADA`: aviso con el texto del servidor, la clase se vuelve a pedir y «Borrar» desaparece (FORO-1D36); `404 PARTICIPACION_NO_ENCONTRADA` y `403 BORRADO_NO_PERMITIDO`: aviso y se renuevan la lista y el bloque de la principal (FORO-1D36) | un aviso; la confirmación sigue abierta y el botón sale de la espera; repetir borra (FORO-1D36 y FORO-1D37) | éxito: al «Borrar» de la vecina, o al `h3` o al `h4` si no hay vecinas (FORO-1D38); cancelar: vuelve a «Borrar» (FORO-1D35) | guarda `borrandoRef`, también en «Cancelar» (FORO-1D50) | las invalidaciones y el aviso viven en el gancho y corren igual; el foco no se mueve |
| «Mover» de un foro en «Actividades» (`useMoverElemento`) | los avisos y el foco de hoy (§7.22) | igual | igual | igual | el de hoy | el de hoy | éxito: además marca viejo `claveForo` (`exact`), sin pedirlo y sin tocar las participaciones (FORO-1D39) |
| «Crear foro» (enlace) | — | — | — | — | — | — | — |

### «Con la vista desmontada» y «en vuelo a la vez»
- Los hooks que dependen de `montado` son dos: `usePublicarParticipacion` y `usePublicarReplica` (para decidir entre el `ErrorDeCampo` y el aviso), y `useVerMasConservandoLaLista` (sin aviso).
- `useBorrarParticipacion` no depende de `montado`. Con «Borrar» desmontado (otra ruta), su `onError` del gancho avisa una vez y renueva. El `onBorrada` del `mutate` ya no corre, así que no hay foco que mover.
- **Dos mutaciones a la vez** (publicar una réplica mientras se borra otra) no se pisan:
  - publicar escribe en la última página del bloque;
  - borrar invalida con `exact` la lista y el bloque de su principal, y la lectura que sigue trae el estado del servidor con las dos.

### Desviaciones del plan (numeradas) y PARADAS
**PARADA 1 (única):** `estatico-02c-r1.ataque` y V-06, contada arriba. La resolvió la Enmienda 12 (C-21 y C-13, aplicadas por el tester).

**Desviaciones.** Las valora el manager.

1. **FORO-1D42 cuenta `+2` lecturas del foro, no `+1`.**
   - Por qué son dos peticiones: «una sola lectura más del foro» (§E11.2) es una lectura lógica, `invalidateQueries({ queryKey: claveForo(claseId, foroId), exact: true }, { cancelRefetch: false })`. Con la configuración de `app/providers.tsx` (`retry: 1`), cuando el doble responde otra vez con error, esa lectura sale dos veces: el intento y su reintento. Las dos son el mismo `fetchQuery` de la misma consulta, y TanStack Query sube `errorUpdateCount` una sola vez, al final.
   - Por qué no hay una tercera: `usePedirElForoAnteUnFalloNuevo` llama a `pedirDeNuevoSoloElForo` una vez por cada `errorUpdateCount` nuevo del bloque, no del foro. El bloque no se vuelve a pedir: la invalidación es `exact` sobre el foro y no alcanza a `…/participaciones` ni a `…/mia`. Por eso no hay un fallo nuevo del bloque que dispare otra lectura.
   - El caso lo comprueba:
     - con el foro que también falla, la lista cuenta exactamente 2 (su petición y su reintento) y el foro `+2`, después de reposar 1,5 s;
     - con el servidor inconsistente (el foro en `200` y la lista otra vez `403`), las dos cuentas no se mueven entre dos reposos de 1,5 s.
   - Quitar `exact` lo pone en rojo (mutación D1, abajo): la invalidación alcanza el bloque y forma el ciclo.
2. **FORO-1D29, el foro abierto del alumno:** la segunda línea muestra la fecha límite, como una tarea asignada en «Actividades» (la arma `segundaLineaDeLaFila` de `FilaDeEntrega`, que no se toca), no la palabra «Asignado». El caso compara entre sí las dos filas (`entrega: null` y `{ estado: "asignado", conRetraso: false }`): misma insignia y misma segunda línea. En el vencido, las dos dicen «Sin entregar».
3. **FORO-1D06:** el mensaje vacío o de solo espacios da el genérico de la acción, «No pudimos publicar tu participación. Inténtalo de nuevo.» o «… tu réplica …», no el genérico del módulo. Es lo mismo que da el recorrido de `ENTRADAS_FUERA_DE_CONTRATO` (FORO-1D09) con `mensajeAlPublicarParticipacion`.
4. **Textos que no están en §D-9:**
   - el nombre accesible de cada «Borrar», «participación de {nombre}» o «réplica de {nombre}», como `sr-only` dentro del botón (`TEXTOS_PARTICIPACIONES.borrarParticipacionDe` y `borrarReplicaDe`);
   - el `h4` `sr-only` «Réplicas» (`TEXTOS_PARTICIPACIONES.replicas`), destino del foco al borrar la última réplica (§D-11 lo pide: «al encabezado del bloque»).

   **Lo que hacen los bloques hermanos:**
   - **Comentarios de una publicación** (`features/clases/components/comentarios-de-publicacion.tsx`): el bloque tiene `<h3 … className="sr-only">` con `TEXTOS_COMENTARIOS.titulo` («Comentarios»), que es el mismo patrón que mi `h4`. Su «Borrar» dice solo «Borrar», sin el nombre del autor.
   - **Respuestas de una duda** (`features/clases/components/respuestas-de-duda.tsx:279`): igual, con un `h3` `sr-only` y «Borrar» sin el nombre.
   - **Las participaciones (este mismo encargo):** «Borrar» con el nombre `sr-only`.
   - **Precedente en `features/tareas`** del nombre `sr-only` en un botón que se repite por fila:
     - `tabla-de-entregas.tsx:63`, «Ver entrega» con el nombre del alumno;
     - `lista-de-adjuntos-publicados.tsx:38`, «Quitar» con el nombre del adjunto;
     - `editor-de-rubrica.tsx:131`, «Quitar» con el número del criterio.

   El encabezado oculto sigue a los hermanos. El nombre en «Borrar» sigue a `features/tareas`, pero no a los comentarios ni a las respuestas, que dejan varios «Borrar» iguales en la misma vista. Si se quiere uniformar, la decisión es del humano; no cambia el comportamiento.
5. **FORO-1D10 vive en `replicas-01d.test.tsx`**, no en `errores-participacion-01d.test.tsx`: sale del mismo cuerpo de casos de FORO-1D05 a FORO-1D09 (`describe.each` por formulario), solo con el formulario de réplica, para el alumno y para el maestro.
6. **Sin aviso ante una recarga de fondo fallida del bloque de réplicas con datos.** El bloque conserva lo que ve y no avisa, porque §D-9 no tiene texto para eso. El «Ver más réplicas» que falla sí avisa (`useVerMasConservandoLaLista`), y la primera carga fallida la dice el bloque.

   **Lo que hacen los hermanos:**
   - **Comentarios de una publicación:** sí avisan. `comentarios-de-publicacion.tsx:167` llama a `useAvisoDeRecargaFallida(errorUpdateCount, conserva, mensajeDeConsultaClases(error), publicacionId)`: un aviso por fallo, con el texto de consulta del módulo.
   - **Respuestas de una duda:** sí avisan, igual (`respuestas-de-duda.tsx:164`).
   - **Participaciones (la lista):** sí avisan, «No pudimos actualizar las participaciones. …» (`TEXTOS_PARTICIPACIONES.recargaFallida`), una vez por fallo (FORO-1D26 y FORO-1D51).
   - **«Tu participación»:** sí avisa (FORO-1D33).

   Es decir, el bloque de réplicas es el único de los cinco que no avisa. El remedio cabe en un cambio: sumar en `ReplicasDeParticipacion` un `useAvisoDeRecargaFallidaEnElForo(claveReplicas(…), activo, replicas, <texto>)`, con la misma condición que la lista. Pero necesita un texto que §D-9 no tiene (por ejemplo, «No pudimos actualizar las réplicas. Mostramos la última versión que tenemos.»), y yo no invento textos. **Propongo que vaya al humano:** el texto y si se suma en 01d o en 01e.

### Las claves y sus vecinas, una por una (§E11.3)
Todas las claves cuelgan de `clavePrefijoDeForos(claseId) = ["clases", claseId, "foros"]`:

| Clave | Forma literal | ¿Prefijo de otra? | Quién la invalida, y con qué alcance |
|---|---|---|---|
| `claveListaDeForos` | `[…, "foros", "lista"]` | No: ningún foro vive bajo `"lista"` (T-01 de 01c2) | publicar y borrar, sin `exact`: es una hoja con sus páginas |
| `claveForo` | `[…, "foros", "foro", foroId]` | Sí: de las tres de abajo | `pedirDeNuevoSoloElForo`, **con `exact`** (FORO-1D42, D1); «Mover» de un foro, **con `exact`** (FORO-1D39, D8) |
| `claveMiParticipacion` | `[…claveForo, "mia"]` | No (hoja) | el `409` de la participación, sin `exact`, porque no tiene hijas; publicar la escribe con `setQueryData` |
| `claveParticipaciones` | `[…claveForo, "participaciones"]` | No | con `exact`: el `409` de la participación, el `404` de la réplica, borrar (éxito, `404` y `403`) y el efecto de `useReplicas` ante `PARTICIPACION_NO_ENCONTRADA` |
| `claveReplicas` | `[…claveForo, "replicas", participacionId]` | No | con `exact`: borrar una réplica renueva el bloque de su principal; borrar una principal **quita** su bloque (`removeQueries`, `exact`) |

FORO-1D41 lo fija con `participacionId` igual a `"mia"`, `"participaciones"`, `"replicas"`, `"lista"` y `"foro"`: ninguna clave coincide con otra ni es prefijo de una ajena.

Fuera del foro, publicar y borrar marcan viejas `clavePrefijoDeCalificaciones(claseId)`. Publicar marca también `clavePrefijoDelTrabajo(claseId)`. Las dos sin `exact` a propósito, porque son prefijos de varias consultas (§D-8.4).

**Las vecinas de `useMoverElemento`** (`features/clases/hooks.ts:1607-1615`):
- `claveForo(claseId, publicacionId)` con `exact` se suma a lo que ya marcaba por el mismo id: los temas y el trabajo, `claveTarea` y `claveRecurso`;
- como la tarea y el recurso de antes, se marca sin saber el tipo: con una tarea o un recurso movidos, `claveForo` de ese id no existe en la caché y la invalidación no hace nada;
- con `exact` no alcanza a las participaciones ni a «Tu participación» de ese foro. FORO-1D39 lo verifica en `actividades-foros-01d.test.tsx:401-402`: `isInvalidated` en `true` en `claveForo` y en `false` en `claveParticipaciones`.

### Frases de recuperación: un caso por camino
Todas las pruebas usan el router real (`rutas`) y la configuración de `app/providers.tsx`.

- **«Las participaciones cambiaron mientras las veías. Vuelve a abrir el foro para verlas completas.»** Archivo: `recuperar-participaciones-01d.test.tsx`. En cada camino se pide la primera página y la frase desaparece. Mientras se ve la frase, no hay «Ver más participaciones».
  - Abrir el foro desde «Foro» antes de 30 s: FORO-1D20.
  - Abrirlo desde «Actividades de aprendizaje»: FORO-1D21.
  - Atrás y adelante del historial: FORO-1D22.
  - Pulsar «Foro» y volver al foro: FORO-1D23.
  - Saltar al foro B y volver al A: FORO-1D23, segundo caso.
- **«Las réplicas cambiaron mientras las veías. Vuelve a abrirlas para verlas completas.»** Mismo archivo.
  - «Ocultar réplicas» y «Ver réplicas» (repetir el control): FORO-1D24. Pide la primera página, no la de la caché.
  - Salir del foro y volver antes de 30 s, y abrir el bloque: FORO-1D25.
  - Saltar al foro B, volver al A y abrir el bloque: FORO-1D25, segundo caso.
- **«No pudimos actualizar las participaciones. Mostramos la última versión que tenemos.»** No pide ninguna acción: dice lo que se muestra. Mismo archivo.
  - El siguiente fallo avisa otra vez, una lectura correcta no avisa, y volver a abrir el foro no repite ninguno: FORO-1D26.
  - Montar con un fallo ya avisado no lo repite: FORO-1D51.
- **«No pudimos actualizar tu participación. Mostramos la última versión que tenemos.»** Mismo archivo.
  - Volver a abrir el foro desde «Foro» antes de 30 s pide «Tu participación» de nuevo: FORO-1D33.
  - El siguiente fallo avisa otra vez y una lectura correcta no deja más avisos: FORO-1D33.
- **«No pudimos publicar tu participación. Inténtalo de nuevo.» y «No pudimos publicar tu réplica. Inténtalo de nuevo.»** Repetir el mismo botón publica, porque lo escrito seguía ahí: FORO-1D27, en `recuperar-participaciones-01d.test.tsx` (`it.each` del alumno y del maestro).
- **«Algo salió mal. Inténtalo de nuevo.» al borrar.** Repetir «Sí, borrar …» vuelve a pedir el borrado: FORO-1D37, en `borrar-participacion-01d.test.tsx`.
- **El `5xx` de «Ver más participaciones».** La lista se queda, con un solo aviso, y el botón sigue a la vista: FORO-1D51 (`it.each` con `503` y sin red). El aviso es el texto de consulta del módulo, que no promete ninguna acción. Ningún caso repite el botón después del fallo. «Ver más réplicas» con `5xx` usa el mismo gancho (`useVerMasConservandoLaLista`), sin un caso propio.
- **Otra clase.** Las claves llevan la clase y el foro, y los foros de otra clase tienen otro id. Saltar al mismo bloque en el foro de otra clase pasa por la misma lógica que saltar al foro B: la clave cambia y la vista se monta de nuevo, con `key` por el foro (01c2). No escribí un caso aparte con dos clases. Lo declaro como **no cubierto con un caso propio**, cubierto por el mecanismo del foro B.

### `VALIDACION` fuera de contrato: el formulario de la participación y el de la réplica
Los dos formularios pasan por el mismo cuerpo de casos (`describe.each` por formulario).
- La participación (alumno) está en `errores-participacion-01d.test.tsx`.
- La réplica (maestro y alumno que puede replicar) está en `replicas-01d.test.tsx`, como «FORO-1D10 (FORO-1D0x): …».

En cada caso se comprueba lo mismo:
- un solo mensaje: un aviso o un `ErrorDeCampo`, nunca los dos ni ninguno;
- lo escrito se conserva;
- el botón sale de la espera (`aria-busy` deja de ser `"true"`).

| Entrada del servidor | Lo que ve la persona | Caso |
|---|---|---|
| `400 VALIDACION` de un campo que el formulario no pinta (`foroId:`) | un aviso legible, sin la ruta; ningún `ErrorDeCampo` | FORO-1D05 |
| mensaje vacío o de solo espacios | el genérico de la acción («No pudimos publicar tu participación/réplica. Inténtalo de nuevo.»), un aviso (desviación 3) | FORO-1D06 |
| prefijo con ruta, `texto.0: …` | el `ErrorDeCampo` del campo, sin la ruta y sin aviso (`errorDelTextoDeLaParticipacion`, `/^texto(\.\d+)?:/`) | FORO-1D07 |
| un rechazo del servidor (el `ErrorDeCampo` de `texto:`), seguido de un envío vacío | solo «Escribe tu participación» o «Escribe tu réplica» (la validación local reemplaza el error en el mismo estado), sin otra petición | FORO-1D08 |
| cada entrada de `ENTRADAS_FUERA_DE_CONTRATO` | un aviso con el resto sin la ruta o el genérico, ningún `ErrorDeCampo` | FORO-1D09 |

Un campo que se pinta solo en otro modo no existe aquí: los dos formularios tienen solo `texto`, y `foroId` (FORO-1D05) es el no pintado.

### Mutaciones reales
Todas son de archivos de «Se toca». Cada mutación se hizo con:
- copia previa en el scratchpad;
- un ancla que aparece una sola vez (`assert texto.count(ancla) == 1`);
- `vitest run` de los archivos que la vigilan, con `-t`;
- restauración desde la copia y comparación byte a byte (`filecmp.cmp(..., shallow=False)`).

En las 39 corridas (34 + 3 + 2), «restaurado; cmp igual: True». Scripts:
- `scratchpad/scripts/mutaciones01d.py` (D1 a D34);
- `mutaciones01d_b.py` (D14 de nuevo, D34 de nuevo y D35);
- `mutaciones01d_c.py` (D14 con un filtro por caso: en Windows, `npx.cmd` pasa por `cmd`, que leyó el `|` de `-t "FORO-1D02|FORO-1D40"` como tubería, y la primera corrida de D14 no corrió ningún caso).

| Id | Mutación (archivo) | Resultado | Caso que la vigila |
|---|---|---|---|
| D1 | sin `exact: true` en `pedirDeNuevoSoloElForo` (`tareas/hooks.ts`) | **rojo**, 4 | los tres FORO-1D42 «si la lista … con el foro en caché …» y «FORO-1D42: con un servidor inconsistente … sin ciclo» (timeout de 5 s: el ciclo) |
| D2 | sin `publicandoRef` en «Publicar participación» (`formulario-de-participacion.tsx`) | **rojo**, 1 | «FORO-1D50: dos clics en el mismo render de «Publicar participación» mandan una sola petición» |
| D3 | sin `publicandoRef` en «Publicar réplica» (`replicas-de-participacion.tsx`) | **rojo**, 1 | «FORO-1D50: dos clics en el mismo render de «Publicar réplica» mandan una sola petición» |
| D4 | sin la guarda de `borrandoRef` en «Sí, borrar …» (`replicas-de-participacion.tsx`) | **rojo**, 2 | «FORO-1D50: dos clics en el mismo render de «Sí, borrar participación» mandan un solo DELETE» y lo mismo con «Sí, borrar réplica» |
| D5 | sin `if (pidiendoRef.current) return` en «Ver más» (`tareas/hooks.ts`) | sobrevive (3 verdes) | redundancia declarada abajo |
| D6 | `fetchNextPage({ cancelRefetch: true })` en «Ver más» (`tareas/hooks.ts`) | sobrevive (3 verdes) | redundancia declarada abajo |
| D35 | D5 y D6 juntas | **rojo**, 2 | «FORO-1D50: dos clics en el mismo render de «Ver más participaciones» …» y «FORO-1D50: … «Ver más réplicas» …» |
| D7 | sin la invalidación de `claveForo` en `useMoverElemento` (`clases/hooks.ts`) | **rojo**, 1 | «FORO-1D39: con el detalle en caché y sin observador, mover deja viejo el foro …» |
| D8 | la misma invalidación sin `exact` | **rojo**, 1 | el mismo FORO-1D39 (`isInvalidated` de las participaciones en `false`) |
| D9 | `useTrabajo` sin `conForos: "si"` | **rojo**, 3 | «FORO-1D29: %s pide los temas y el trabajo con seccion=actividades&conForos=si, con la misma clave de caché» (×3) |
| D10 | los temas sin `conForos=si` | **rojo**, 3 | los mismos tres |
| D11 | «Crear foro» también en una clase archivada (`trabajo-view.tsx`) | **rojo**, 2 | «FORO-1D29: %s ve «Crear foro» junto a «Crear tarea», hacia foros/nuevo, y no en una clase archivada» (maestro y admin) |
| D12 | `usePedirElForoAnteUnFalloNuevo` sin llamar a `pedirDeNuevoSoloElForo` | **rojo**, 3 | los tres FORO-1D42 con el foro en caché |
| D13 | publicar sin escribir «Tu participación» con la respuesta | **rojo**, 1 | FORO-1D02 |
| D14 | publicar sin agregar la nueva a la lista | **rojo**, 1 y 1 | FORO-1D02; «FORO-1D40: pide las participaciones … y publicar escribe en la clave que la vista lee …» |
| D15 | publicar sin marcar vieja la lista de «Foro» | **rojo**, 1 | FORO-1D02 |
| D16 | publicar sin marcar viejas las actividades | **rojo**, 1 | FORO-1D02 |
| D17 | publicar sin marcar viejas las calificaciones | **rojo**, 1 | FORO-1D02 |
| D18 | el `409` de la participación sin renovar «Tu participación» | **rojo**, 3 | «FORO-1D03: %s avisa con el texto del servidor, conserva lo escrito y vuelve a pedir «Tu participación» y la lista» (×3) |
| D19 | publicar réplica sin agregarla al bloque | **rojo**, 1 | «FORO-1D12: la réplica se agrega al bloque sin pedirlo otra vez …» |
| D20 | publicar réplica con `404 PARTICIPACION_NO_ENCONTRADA` sin renovar la lista | **rojo**, 1 | «FORO-1D12: con 404 PARTICIPACION_NO_ENCONTRADA avisa … y renueva la lista» |
| D21 | borrar sin marcar vieja la lista de «Foro» | **rojo**, 1 | «FORO-1D37: con éxito se marcan viejas la lista de «Foro» (el conteo) y las calificaciones …» |
| D22 | borrar sin marcar viejas las calificaciones | **rojo**, 1 | el mismo |
| D23 | borrar una principal sin quitar su bloque de réplicas | **rojo**, 1 | «FORO-1D37: borrar una principal saca de la caché el bloque de sus réplicas» |
| D24 | borrar con `404` o `403 BORRADO_NO_PERMITIDO` sin renovar la lista | **rojo**, 2 | los dos FORO-1D36 de `404` y `403` |
| D25 | `foroId={foroId}` en lugar de `idCanonicoDeLaRuta(foroId)` (`foro-view.tsx`) | **rojo**, 1 | FORO-1D40 |
| D26 | el conteo sin `Math.max` (`tareas/lib.ts`) | **rojo**, 1 | «FORO-1D11: con 0 en la lista y réplicas que llegan al abrir el bloque …» |
| D27 | sin el foco a la participación nueva | **rojo**, 1 | FORO-1D02 |
| D28 | sin el foco al «Borrar» de la vecina | **rojo**, 1 | «FORO-1D38: al borrar una principal de en medio …» |
| D29 | la lista sin `useMarcarViejaSiQuedoEnError` | sobrevive (15 verdes) | redundancia declarada abajo |
| D30 | el bloque de réplicas sin `useMarcarViejaSiQuedoEnError` | sobrevive (18 verdes) | redundancia declarada abajo |
| D31 | `errorDelTextoDeLaParticipacion` solo con `texto:` (sin `texto.0:`) | **rojo**, 3 | «FORO-1D07: con prefijo de ruta «texto.0:» …» y los dos «FORO-1D10 (FORO-1D07): …» (maestro y alumno) |
| D32 | la lista sin su texto de recarga fallida | **rojo**, 1 | FORO-1D26 |
| D33 | «Tu participación» sin su texto de recarga fallida | **rojo**, 2 | los dos FORO-1D33 |
| D34 | `useReplicas` sin renovar la lista ante `404 PARTICIPACION_NO_ENCONTRADA` | primera corrida: sobrevive (2 verdes, ningún caso la vigilaba); **después del caso nuevo, rojo**, 1 | «FORO-1D12: abrir las réplicas de una principal que ya no existe (404 PARTICIPACION_NO_ENCONTRADA) dice «Esa participación ya no existe.» en el bloque, sin aviso, y renueva la lista una vez» (nuevo) |

**Las sobrevivientes, con su mecanismo:**
- **D5 y D6, el «Ver más».** Cada defensa basta sola:
  - `fetchNextPage({ cancelRefetch: false })` devuelve la misma promesa mientras hay una lectura en vuelo, y el segundo clic no pide otra página (D5 sobrevive por eso);
  - la guarda `pidiendoRef` corta el segundo clic antes de llamar (D6 sobrevive por eso).
  - Quitar las dos a la vez (D35) pone en rojo los dos FORO-1D50. Las dos se quedan porque las pide la regla del repositorio (`CLAUDE.md`, «Componentes», y `lib/guardas-de-doble-clic-estatico.test.ts`, que exige `cancelRefetch: false` en los «Ver más»).
- **D29 y D30, `useMarcarViejaSiQuedoEnError`.** Con TanStack Query 5.103.2, una consulta que queda en error al quitarse su último observador ya queda inválida: la librería la deja así. `CLAUDE.md` («Ubicaciones compartidas», `components/seccion/`) registra el gancho como una garantía escrita de lo mismo. Por eso los caminos de FORO-1D20 a FORO-1D25 (volver a abrir pide la primera página) siguen verdes sin él. Se queda por la política única de recarga (CHORE-06), como en las listas de `features/clases`.
- **D34** ya no sobrevive: escribí el caso que faltaba (arriba).

### Guardas de doble clic, cada una con su mutación
Cada guarda está en un manejador con nombre del componente dueño de la mutación, a dos espacios. Se toma justo antes de `mutate` y se suelta en el `onSettled` de ese `mutate`.

| Control | Guarda | Archivo | Mutación |
|---|---|---|---|
| «Publicar participación» | `publicandoRef` en `handleSubmit`, después de `evento.preventDefault()` y antes de la guarda `isPending` | `formulario-de-participacion.tsx` | D2, rojo |
| «Publicar réplica» | `publicandoRef` en `handleSubmit` de `FormularioDeReplica` | `replicas-de-participacion.tsx` | D3, rojo |
| «Sí, borrar participación» y «Sí, borrar réplica» | `borrandoRef` en `handleBorrar`; «Cancelar» lo lee también (`handleCancelar`) | `replicas-de-participacion.tsx` (`BorrarDelForo`) | D4, rojo |
| «Ver más participaciones» y «Ver más réplicas» | `pidiendoRef` en `handleVerMas` (liberada en `finally`), más `fetchNextPage({ cancelRefetch: false })` | `tareas/hooks.ts` (`useVerMasConservandoLaLista`) | D5 y D6 sobreviven cada una sola; D35 (las dos), rojo |

La `mutationKey` de estas mutaciones no lleva un id de la ruta, y ninguna se reenvía con un solo clic sobre el control montado de nuevo: «Sí, borrar …» pide abrir la confirmación otra vez. Por eso no hace falta leer la caché de mutaciones.

### Hermanos y estados vecinos
- **`pedirDeNuevoSoloElForo`** se usa en las tres lecturas (lista, «Tu participación» y réplicas, por `usePedirElForoAnteUnFalloNuevo`) y en las tres mutaciones (`onError` de publicar, replicar y borrar). Los estados:
  - primera carga: pide el foro una vez;
  - recarga con datos: lo mismo;
  - fallo ya en la caché al montar: no pide nada, porque la cuenta parte del `errorUpdateCount` del montaje;
  - dos fallos seguidos: uno por cada `errorUpdateCount`, sin ciclo, porque la invalidación es `exact` sobre el foro;
  - cambio de foro: el componente se monta de nuevo con `key={foro.id}` (01c2).
- **El aviso de recarga fallida**: la lista y «Tu participación» lo tienen; el bloque de réplicas no (desviación 6). En los dos que avisan, los estados:
  - el primer fallo avisa;
  - el segundo avisa otra vez;
  - una lectura correcta no avisa;
  - montar con un fallo ya avisado no lo repite (memoria por consulta, `ultimoFalloAvisado`);
  - con un error que redirige o un `CLASE_ARCHIVADA`, no avisa.
- **El foco tras una acción:**
  - publicar la principal lleva el foco a la fila nueva; publicar una réplica, al campo;
  - borrar lleva el foco a la vecina o al encabezado (`h3` en la lista, `h4` en el bloque);
  - «Ver más» lo lleva a la primera fila nueva o al encabezado;
  - con un error, se queda donde estaba.

  Ninguno cae en `<body>` (FORO-1D52 lo verifica al saltar de foro).
- **«Borrar» por el dato:** las principales (`participacion-del-foro.tsx`) y las réplicas (`replicas-de-participacion.tsx`) leen `!soloLectura && ….puedeBorrar`. No hay otro control de borrar en el foro.
- **El id canónico (R-01d-4):** `foro-view.tsx` pasa `idCanonicoDeLaRuta(foroId)` a `DetalleDelForo`, y todo lo de 01d recibe ese `foroId` (D25 en rojo). No hay otra entrada de id de la ruta en 01d.

### `git status --short -- frontend`, por clase
27 entradas:

| Clase | Cuántas | Archivos |
|---|---|---|
| Producción modificada | 9 | `clases/components/seccion-de-tema.tsx`, `clases/data.ts`, `clases/hooks.ts`, `clases/trabajo-view.tsx`, `tareas/data.ts`, `tareas/foro-view.tsx`, `tareas/hooks.ts`, `tareas/lib.ts`, `tareas/types.ts` |
| Producción nueva | 5 | `tareas/components/formulario-de-participacion.tsx`, `mi-participacion.tsx`, `participacion-del-foro.tsx`, `participaciones-del-foro.tsx`, `replicas-de-participacion.tsx` |
| Pruebas nuevas | 6 | `clases/actividades-foros-01d.test.tsx`; en `tareas/`: `borrar-participacion-01d.test.tsx`, `errores-participacion-01d.test.tsx`, `participar-01d.test.tsx`, `recuperar-participaciones-01d.test.tsx`, `replicas-01d.test.tsx` |
| Lista cerrada (normales modificadas) | 3 | `clases/categorias-view.test.tsx`, `clases/contenido-03c2.test.tsx`, `tareas/foro-detalle-01c.test.tsx` |
| `*.ataque` modificadas por el tester (C-12, C-13 y C-21) | 4 | `clases/categorias-01e-r1.ataque.test.tsx`, `clases/categorias-01e-r2.ataque.test.tsx`, `clases/estatico-02c-r1.ataque.test.ts`, `styles/clases-r1.ataque.test.ts` |

Fuera de `frontend/`, `git status --short` muestra además los documentos del encargo (`docs/ESTADO.md`, `aprobacion.md`, `plan.md`, `reporte-tester.md` y `revision.md`, que no escribí yo) y `docs/trabajo/DEPLOY-investigacion-vps.md`, del humano, que no toqué. Este resumen solo agrega su sección a `resumen-programador.md`.

### Verificación
Desde `frontend/`, una corrida a la vez. No corrí la suite completa del paquete: la corre el manager al cerrar.

| Comando | Última línea |
|---|---|
| `npm run lint` | sale con 0; `All matched files use Prettier code style!` y termina en `> tsc -b`, sin errores. Corrido dos veces; la segunda, después de las últimas pruebas |
| `npm run build` | `✓ built in 1.11s` (con el aviso de siempre del tamaño de los trozos) |
| `npx vitest run src/features/tareas` | `Tests  1682 passed (1682)` (`Test Files  59 passed (59)`) |
| `npx vitest run src/features/clases` | `Tests  3167 passed (3167)` (`Test Files  131 passed (131)`). Corrida después del caso nuevo de FORO-1D31; la anterior dio `Tests  3166 passed (3166)` |
| `npx vitest run src/app src/lib src/services src/styles` | `Tests  1159 passed (1159)` (`Test Files  69 passed (69)`) |
| `npx vitest run src/components` | `Tests  381 passed (381)` (`Test Files  30 passed (30)`) |

### Conteos
- Con `npx vitest list` sobre los seis archivos nuevos (`grep -a -c "<archivo>.test.tsx >"`):
  - `participar-01d.test.tsx`: 41;
  - `errores-participacion-01d.test.tsx`: 6;
  - `replicas-01d.test.tsx`: 25;
  - `borrar-participacion-01d.test.tsx`: 17;
  - `recuperar-participaciones-01d.test.tsx`: 20;
  - `features/clases/actividades-foros-01d.test.tsx`: 18.
  - Total: **127 casos en 6 archivos** (`grep -a -o "^[^ ]*test.tsx" | sort -u | wc -l` da 6).
- `git status --short -- frontend | wc -l` da 27.
- `enEspera=` en producción: 96.
- Mutaciones: 35 (D1 a D35) en 39 corridas. 31 terminan en rojo:
  - D14 dio rojo al correrla con un filtro por caso; la primera corrida no corrió ninguno, por el `|`;
  - D34 dio rojo con el caso nuevo de FORO-1D12;
  - D35 (D5 y D6 juntas) dio rojo.
- Sobreviven 4, con su redundancia declarada: D5, D6, D29 y D30.

## Corrección tras la verificación del manager — FORO-01d: M-11, M-12 y N-38 (2026-11-16)

La verificación está en `revision.md`, "## Verificación del resumen — FORO-01d — implementación (2026-11-16)". El texto del aviso nuevo es decisión del humano (2026-11-16, «Texto propio»). No hubo PARADA. Los archivos tocados están todos en «Se toca»:
- producción: `features/tareas/data.ts`, `lib.ts` y `components/replicas-de-participacion.tsx`;
- pruebas: mis archivos nuevos `features/tareas/replicas-01d.test.tsx` y `participar-01d.test.tsx`.

No toqué ninguna `*.ataque` ni nada de la lista cerrada.

### Hallazgos
- **M-11, corregido.** Agregué un caso en `replicas-01d.test.tsx`:
  - Título: «FORO-1D12: con el foro vencido y sin tardías, el maestro ve «Escribe tu réplica», publica y la réplica entra al bloque».
  - Para fijarlo, el doble del servidor ganó `vencido` en cada foro: con él, `fechaLimite` es `2026-01-15T16:00:00.000Z` y `aceptaTardias` es `false`. El alumno queda con `puedeParticipar` y `puedeReplicar` en falso.
  - **La conducta ya existía**, así que el caso pasó a la primera. **Mutación E1:** quitar al maestro de `puedeReplicar` en `participaciones-del-foro.tsx` lo pone en rojo.
- **M-12, corregido, en dos partes.**
  1. **«Ver más réplicas» con `5xx`.** Caso nuevo: «FORO-1D51: «Ver más réplicas» que falla (503) conserva las réplicas, avisa una vez, el botón sale de la espera y el foco se queda en él».
     - La conducta ya existía (el gancho es compartido).
     - **Mutación E2:** el botón llama a `replicas.fetchNextPage()` sin `handleVerMas` → rojo.
     - **Mutación E7:** quitar `!replicas.isFetchNextPageError` del aviso nuevo da dos avisos → rojo.
  2. **El aviso de la recarga de fondo del bloque de réplicas.** Es la desviación 6, que queda cerrada.
     - `data.ts`: `TEXTOS_PARTICIPACIONES.recargaFallidaReplicas` = «No pudimos actualizar las réplicas. Mostramos la última versión que tenemos.».
     - `components/replicas-de-participacion.tsx`: `useAvisoDeRecargaFallidaEnElForo(claveReplicas(…), activo, replicas, …)`, el mismo gancho que usan la lista de participaciones y «Tu participación».
     - `activo` exige `isError` y datos a la vista, y excluye cinco casos: el fallo de una página, el cursor vencido, un error que reemplaza la vista, y `404 PARTICIPACION_NO_ENCONTRADA`.
     - El último es una exclusión mía: la principal ya no existe, la lista se renueva y la fila sale, así que «Mostramos la última versión» sería falso.
     - Para no importar `apiClient` en un componente, `lib.ts` ganó `esParticipacionNoEncontrada`.
     - La clase archivada, los códigos con que `apiClient` redirige y la memoria por consulta los filtra el gancho (`useAvisoDeRecargaFallidaDe`, sin cambios).
- **N-38, corregido.** En «FORO-1D52: el maestro con el bloque de réplicas abierto y una réplica a medio escribir salta al foro B y vuelve: …» (`participar-01d.test.tsx`):
  - Ahora afirma que el foco está en la raíz de `DetalleDelForo`: un `div` con `tabindex="-1"` que contiene el `h2` «Segundo debate» y el `h3` «Participaciones».
  - Dejé el título como estaba.
  - **Mutación E11:** quitar `useFocoAlPerderseElControl` de `foro-view.tsx` → rojo.

### Casos nuevos, con su rojo previo o su mutación
Todos están en `features/tareas/replicas-01d.test.tsx` salvo N-38.

| Título exacto | Rojo |
|---|---|
| «FORO-1D12: con el foro vencido y sin tardías, el maestro ve «Escribe tu réplica», publica y la réplica entra al bloque» | E1 |
| «FORO-1D51: «Ver más réplicas» que falla (503) conserva las réplicas, avisa una vez, el botón sale de la espera y el foco se queda en él» | E2 y E7 |
| «FORO-1D51: una recarga fallida del bloque con réplicas a la vista las conserva y avisa una vez; el siguiente fallo avisa otra vez; una lectura correcta no avisa» | rojo antes del remedio; E3 |
| «FORO-1D51: cerrar y volver a abrir el bloque con un fallo ya avisado (y su recarga en vuelo) no lo repite (memoria por consulta)» | rojo antes del remedio; E3 |
| «FORO-1D51: una recarga del bloque con réplicas a la vista que falla con %s no avisa «No pudimos actualizar las réplicas…»» con «el cursor vencido» | E4 |
| el mismo, con «un 403 SIN_ACCESO_A_LA_CLASE (reemplaza la vista)» | E5 |
| el mismo, con «un 409 CLASE_ARCHIVADA» | E8 |
| el mismo, con «un 403 ACCESO_RESTRINGIDO (apiClient redirige)» | E9 |
| el mismo, con «un 404 PARTICIPACION_NO_ENCONTRADA (la lista se renueva)» | E6 |
| «FORO-1D51: dos bloques de principales distintas no heredan el aviso; si los dos fallan a la vez, sale un aviso por bloque» | rojo antes del remedio; E3 |
| «FORO-1D42: con un fallo de las réplicas que reemplazaría la vista en la caché, volver a abrir el bloque no pide el foro por el fallo viejo; solo la lectura nueva que falla lo pide una vez, sin ciclo» | ninguna (ver abajo) |
| «FORO-1D42: con réplicas a la vista y una recarga que falló con un código que reemplazaría la vista, volver a abrir el bloque no pide el foro por ese fallo; solo la lectura nueva que falla lo pide una vez» | E10b |
| N-38, en `participar-01d.test.tsx`: la aserción nueva de FORO-1D52 | E11 |

Ejecución de las mutaciones:
- Cada una con copia previa, ancla única, restauración y comparación byte a byte. Las 13 corridas dieron «restaurado; cmp igual: True».
- Scripts: `scratchpad/scripts/mutaciones01d_m12.py` (E1 a E11) y `mutaciones01d_m12b.py` (E10b). Registros: `scratchpad/mut01d_m12.log` y `mut01d_m12b.log`.
- **E10** (`useRef(0)` en lugar de `useRef(fallo.errorUpdateCount)` en `usePedirElForoAnteUnFalloNuevo`) **sobrevivió** contra el primer caso de FORO-1D42. Escribí el segundo, que sí la tumba (E10b). La razón está abajo.
- Corrida previa al remedio, con `npx vitest run src/features/tareas/replicas-01d.test.tsx src/features/tareas/participar-01d.test.tsx -t "M-11|M-12|useReplicas|FORO-1D52"`: `Tests  3 failed | 10 passed | 64 skipped (77)`. Los 3 rojos fueron los tres casos del aviso.

### El detalle de `useReplicas` (el que señaló el manager)
**Es la conducta que quiero, y la ref ya inicia con el `errorUpdateCount` del montaje.**
- El `{ errorUpdateCount: 0, error: null }` de `useReplicas` solo lo recibe el control de `ParticipacionDelForo`, que llama a `useReplicas(…, false)` para el conteo. Nunca actúa, porque su cuenta nunca cambia, y así no se duplica la lectura del foro con el bloque.
- El bloque abierto (`ReplicasDeParticipacion`) llama a `useReplicas(…, true)` y pasa la consulta real. Su ref arranca con el `errorUpdateCount` que hay en la caché al montar (R-01d-3).
- Por qué E10 sobrevivía al primer caso: cuando el fallo viejo no tiene datos, TanStack Query 5 (`fetchState` en el resultado optimista del montaje) pone `error: null` y `status: "pending"` mientras vuelve a pedir. Aun con la ref en 0, `pedirDeNuevoSoloElForo(null)` no hace nada.
- Cuando el fallo viejo tiene datos (una recarga que falló), el error sí queda a la vista al montar. Ahí la ref importa: con `useRef(0)` se pediría el foro por un fallo ya atendido. El segundo caso lo fija y E10b lo tumba.
- En los dos caminos, solo la lectura nueva que falla pide el foro, una vez, y las cuentas no suben después de dos reposos de 1,5 s.

### Fila nueva de la matriz de avisos y recargas
| Disparador | Reemplaza | Redirige | 409 | 5xx o red | Foco | En vuelo a la vez | Con la vista desmontada |
|---|---|---|---|---|---|---|---|
| Recarga de fondo del bloque de réplicas con datos a la vista | sin aviso; pide el foro una vez por fallo nuevo (R-01d-3) | sin aviso; el fallo queda marcado como avisado | `CLASE_ARCHIVADA`: sin aviso (lo filtra el gancho; FORO-1D51 con E8) | conserva las réplicas y avisa «No pudimos actualizar las réplicas. …» una vez por fallo; un segundo fallo avisa otra vez; una lectura correcta, nada | no se mueve | una lectura por bloque (TanStack Query). Con dos bloques abiertos que fallan a la vez, **dos avisos**, uno por bloque | el bloque cerrado no vuelve a pedir (sin observador habilitado). Al abrirlo con el fallo ya avisado y su recarga en vuelo, no repite el aviso (memoria por consulta) |

También cambió esta fila de la matriz anterior:
- **«Ver más réplicas» con `5xx`:** un solo aviso, el de `useVerMasConservandoLaLista`. El aviso de recarga no se suma, porque excluye el fallo de página.

**Por qué dos bloques que fallan a la vez dan dos avisos:**
- Cada bloque es una lista distinta que la persona abrió, con su propia consulta y su propia memoria (`ultimoFalloAvisado` guarda la consulta como clave). Cada aviso dice que una lista a la vista quedó en su última versión.
- Callar el segundo exigiría compartir la memoria entre consultas, y entonces el aviso de un bloque podría callar el fallo de otro. Eso es justo lo que el caso prueba que no pasa: el fallo de A no calla el de B.
- Es lo mismo que hacen dos bloques de comentarios abiertos en «Avisos» (`useAvisoDeRecargaFallida`, una memoria por publicación).
- No cambié `useAvisoDeRecargaFallidaDe` (R-01d-5).

### Hermanos y estados vecinos del remedio
Los bloques del foro con aviso de recarga fallida usan todos `useAvisoDeRecargaFallidaEnElForo`, es decir, `useAvisoDeRecargaFallidaDe` con `callado = false`.

| Bloque | Primera carga | Cursor | Fallo de página | Reemplaza | Archivada | Redirige | Memoria por consulta | Entre consultas |
|---|---|---|---|---|---|---|---|---|
| Lista de participaciones (`participaciones-del-foro.tsx`) | sin aviso (exige datos) | excluido | excluido | excluido | gancho | gancho | sí (FORO-1D51) | n/a: hay una sola por foro, y cambiar de foro monta de nuevo con otra clave |
| «Tu participación» (`mi-participacion.tsx`) | sin aviso (exige datos) | n/a: no pagina | n/a | excluido | gancho | gancho | sí | n/a |
| Réplicas (`replicas-de-participacion.tsx`, nuevo) | sin aviso (exige datos) | excluido | excluido | excluido | gancho | gancho | sí | sí: una por principal; el caso de dos bloques prueba que no se heredan |

Las tres cumplen las mismas reglas. La única diferencia es la exclusión de `PARTICIPACION_NO_ENCONTRADA`, que solo existe en las réplicas.

El detalle del foro (`useAvisoDeRecargaFallidaDelForo`, 01c2) usa el mismo gancho base; no lo toqué. Los comentarios y las respuestas de `features/clases` usan otro gancho (`useAvisoDeRecargaFallida`, con el texto de consulta del módulo) y quedan fuera de este encargo.

**Estados del mecanismo en las réplicas:**
- primera carga: sin aviso (el bloque dice «No pudimos cargar las réplicas.»);
- recarga fallida: un aviso;
- segundo fallo: otro aviso;
- lectura correcta: ninguno;
- montar con el fallo ya avisado y su recarga en vuelo: ninguno;
- dos bloques: uno por bloque;
- cerrar el bloque: deja de observar.

### Verificación
Desde `frontend/`, una corrida a la vez.

| Comando | Última línea |
|---|---|
| `npm run lint` | sale con 0; `All matched files use Prettier code style!` y termina en `> tsc -b`, sin errores |
| `npm run build` | `✓ built in 927ms` |
| `npx vitest run src/features/tareas` | `Tests  1694 passed (1694)` (`Test Files  59 passed (59)`); antes 1682, +12 |
| `npx vitest run src/features/clases` | `Tests  3167 passed (3167)` (`Test Files  131 passed (131)`); sin cambios |
| `npx vitest run src/app src/lib src/services src/styles src/components` | `Tests  1540 passed (1540)` (`Test Files  99 passed (99)`), que son las cifras de antes sumadas (1159 + 381 y 69 + 30) |

### Conteos
Con `npx vitest list` sobre los seis archivos nuevos (`grep -a -c "<archivo>.test.tsx >"`):
- `participar-01d.test.tsx`: 41. No cambia: N-38 es una aserción dentro de un caso que ya existía.
- `errores-participacion-01d.test.tsx`: 6.
- `replicas-01d.test.tsx`: **37** (antes 25; +12). Los 12 son:
  - M-11: 1;
  - «Ver más réplicas» con `5xx`: 1;
  - el aviso: 8 (1 + 1 + 5 + 1);
  - el detalle de `useReplicas`: 2.
- `borrar-participacion-01d.test.tsx`: 17.
- `recuperar-participaciones-01d.test.tsx`: 20.
- `features/clases/actividades-foros-01d.test.tsx`: 18.
- Total: **139 casos en 6 archivos**.

La suite de `features/tareas` sube de 1682 a 1694, los mismos +12.

### `enEspera=` y «Ocultar»
- `grep -rho "enEspera=" frontend/src --include=*.tsx --exclude=*.test.tsx | wc -l` da **96**; sigue igual.
- `replicas-de-participacion.tsx` sigue con 3. La corrección no suma ninguno.
- `grep -rln "Ocultar" frontend/src --include=*.tsx --exclude=*.test.tsx | wc -l` da 0.

### `git status --short -- frontend`
Sigue en 27 entradas, sin archivos nuevos. Esta corrección cambió cinco:
- en producción: `features/tareas/data.ts`, `features/tareas/lib.ts` y `features/tareas/components/replicas-de-participacion.tsx`;
- en pruebas: `features/tareas/replicas-01d.test.tsx` y `features/tareas/participar-01d.test.tsx`.

La clasificación de las 27 no cambia: 9 de producción modificados, 5 de producción nuevos, 6 pruebas nuevas, 3 de la lista cerrada y 4 `*.ataque` del tester.

## Corrección tras la ronda 1 — FORO-01d: T-01 y T-02 (2026-11-16)

Leí `reporte-tester.md` ("## Ronda 1 — FORO-01d") y `revision.md` ("## Arbitraje de la ronda 1 — FORO-01d: T-01 y T-02"). Las formas de los dos remedios son las que fijó el arbitraje.

Todo lo que toqué está en «Se toca»:
- Producción: `features/tareas/lib.ts`, `hooks.ts`, `components/participaciones-del-foro.tsx`, `components/participacion-del-foro.tsx` y `components/replicas-de-participacion.tsx`.
- Dos pruebas nuevas mías: `features/tareas/unir-paginas-del-foro-01d.test.ts` y `features/tareas/foco-participaciones-01d.test.tsx`. Su arnés es una copia del de `replicas-01d.test.tsx`, sin cambios de conducta.

No toqué `lib/unir-paginas.ts`, `components/foco/`, la clave de foco de `foro-view.tsx` ni los ganchos de 01c2. Tampoco ninguna `*.ataque`.

### PARADA: ATQ-FORO-137 contradice O-01d-2
- **Qué pasa.** Con los dos remedios y el aviso de O-01d-2, `foros-01d-r1.ataque.test.tsx` queda con un solo rojo: «ATQ-FORO-137: con 404 PARTICIPACION_NO_ENCONTRADA al recargar las réplicas, el foco no cae en <body> y no hay avisos de más».
- **Dónde cae.** La aserción del foco (`:592`) ya pasa. Cae `:593`, `expect(aviso.error).not.toHaveBeenCalled()`, con «expected "vi.fn()" to not be called at all, but actually been called 1 times».
- **Por qué.** El aviso que sale es justo el que manda O-01d-2: «Esa participación ya no existe.», una vez por fallo. El título del caso dice «no hay avisos de más», pero la aserción pide cero avisos. Escribió esa línea cuando la exclusión aceptada no avisaba nada.
- **No la toqué** (es `*.ataque`). Las dos salidas posibles son:
  - el tester ajusta `:593` a «un solo aviso, con ese texto»;
  - el manager revierte O-01d-2. En ese caso, la mutación F4 indica la línea que se quita.

  Decide el manager.
- **Lo demás está en verde.** Los dos ATQ-FORO-135 y los dos ATQ-FORO-136 pasan. ATQ-FORO-137 pasa hasta `:592`.

### T-01: antes → después
- **Antes:**
  - las tres uniones de páginas del foro usaban `unirPaginasSinRepetidas` (`lib/unir-paginas.ts`, se queda con la primera aparición): la lista de principales, el bloque de réplicas y el conteo de `participacion-del-foro.tsx`;
  - publicar escribía la respuesta al final de la última página cargada;
  - al cargar más, la copia del servidor se descartaba y la nueva quedaba entre la 20 y la 21.
- **Después:**
  - `features/tareas/lib.ts` tiene `unirPaginasConLaUltimaAparicion`: se queda con la última aparición de cada id y no muta la entrada;
  - los tres usos del foro la llaman;
  - publicar sigue escribiendo al final de lo cargado. La respuesta se ve en el acto, con el foco en ella y sin otra lectura (FORO-1D02 intacto);
  - al cargar más, la copia del servidor queda en su lugar, al final.
  - En las réplicas, el campo se vacía y el foco vuelve al campo, como antes.
  - `lib/unir-paginas.ts` no cambia.
- **Vecino B5, aplicado** (`hooks.ts`, `usePublicarReplica`). Publicar una réplica también sube `replicas` de su principal en la caché de la lista. Antes, con réplicas por cargar, el control plegado decía «Ver réplicas (25)» después de publicar la 26.ª: el mayor entre 25 del servidor y 21 vistas. Ahora dice 26, y al cargar más sigue en 26, sin contar dos veces la nueva.

### T-02: antes → después
- **Antes:** el bloque no tenía remedio propio. Lo único que movía el foco era el gancho de la vista, y su clave solo cambia con la consulta del foro (R-01d-6). Un control que desaparecía dentro de «Participaciones» dejaba el foco en `<body>`.
- **Después:** gancho nuevo `useFocoAlEncabezadoSiSePierde(bloqueRef, encabezadoRef, selectorDeFila?)` en `features/tareas/hooks.ts`, con `focoPerdido` de `components/foco/lib.ts`, que solo se importa.
  - **Qué recuerda.** Con `focusin`, si el control enfocado estaba dentro del bloque y, cuando hay selector, su fila.
  - **Cuándo borra la memoria.** Ante un `focusout` sin destino con el control aún conectado y la ventana con foco, es decir, un clic en blanco, como `useFocoAlPerderseElControl`.
  - **Cuándo mueve el foco.** Después de cada render de su dueño, solo si el control ya no está en el documento y el foco se perdió. Lo lleva al encabezado.
  - **Dónde va:**
    - En `ParticipacionesDelForo`, con el `section` como bloque y el `h3` «Participaciones» como destino. Va después del efecto que ya lleva el foco a la fila nueva o a la vecina tras borrar: si ese efecto movió el foco, el nuevo no hace nada.
    - En `ReplicasDeParticipacion`, con su `div` y el `h4` «Réplicas», pero solo cuando lo que desapareció es la réplica del control (`selectorDeFila = "[data-replica-id]"`). Lo demás que desaparece en el bloque lo atiende «Participaciones» y lo lleva al `h3`: el formulario, la principal entera y la clase en solo lectura.
  - **Nombres accesibles.** Los dos encabezados ya tenían `tabIndex={-1}` y su texto («Participaciones», visible, y «Réplicas», `sr-only`). Ningún `.tsx` escribe «Ocultar».
- **O-01d-2, aplicado** en `ReplicasDeParticipacion`. Ante una recarga con datos a la vista que recibe `404 PARTICIPACION_NO_ENCONTRADA`, se avisa una vez por fallo con «Esa participación ya no existe.» (`MENSAJES_ERROR_FORO.participacionNoEncontrada`), por el mismo gancho con memoria por consulta. «No pudimos actualizar las réplicas…» sigue excluido en ese caso.

### Casos nuevos, con su rojo previo
- **`features/tareas/unir-paginas-del-foro-01d.test.ts`** (6). Los 6 dieron rojo antes del remedio (`unirPaginasConLaUltimaAparicion is not a function`):
  - «FORO-1D60: sin repetidas, conserva el orden de las páginas y de sus filas»;
  - «FORO-1D60: una fila repetida entre páginas queda en el lugar de su última aparición, con esa copia»;
  - «FORO-1D60: una fila repetida en la misma página queda en su última aparición»;
  - «FORO-1D60: sin páginas o con páginas vacías, la lista vacía»;
  - «FORO-1D60: con una sola página, la misma página»;
  - «FORO-1D60: no muta la entrada».
- **`features/tareas/foco-participaciones-01d.test.tsx`** (20). Rojo en la corrida previa al remedio: 16 de 20. Para los otros cuatro, la mutación que los tumba:

| Caso (título) | Rojo previo o mutación |
|---|---|
| «FORO-1D61 (A1): publicar con la lista en error lleva el foco al h3 «Participaciones»» (también B3: «Tu participación» se escribe) | rojo previo; F1 |
| «FORO-1D61 (A2): el 409 %s al publicar quita el formulario y lleva el foco al h3, con un solo aviso» (`PARTICIPACION_YA_PUBLICADA`, `PARTICIPACION_CALIFICADA` y `FORO_CERRADO`) | rojo previo (×3); F1 |
| «FORO-1D61 (A3): publicar con un error que reemplaza la vista lleva el foco a la raíz de la vista, como hoy» | verde de entrada; F9 |
| «FORO-1D61 (A4): publicar una réplica con 404 PARTICIPACION_NO_ENCONTRADA saca la fila y lleva el foco al h3, con un solo aviso» | rojo previo; F1 |
| «FORO-1D61 (A5): el alumno que publica una réplica con 409 FORO_CERRADO pierde el formulario y el foco va al h3» | rojo previo; F1 |
| «FORO-1D61 (A6, O-01d-2): la recarga de las réplicas con 404 saca la principal con una réplica a medio escribir; el foco va al h3 y avisa una vez «Esa participación ya no existe.»» | rojo previo; F1 y F4 |
| «FORO-1D61 (A6, O-01d-2): un segundo 404 de las réplicas de otra principal avisa otra vez; volver a abrir no repite el aviso» | rojo previo; F4 |
| «FORO-1D61 (A7): una recarga de la lista que quita la fila con el foco lo lleva al h3, sin aviso» | rojo previo; F1 |
| «FORO-1D61 (A8): una recarga del bloque que quita la réplica con el foco lo lleva al h4 «Réplicas» de su bloque» | rojo previo; F2 |
| «FORO-1D61 (A10): borrar con 404 PARTICIPACION_NO_ENCONTRADA saca la fila con «Sí, borrar …» enfocado y el foco va al h3» | rojo previo; F1 |
| «FORO-1D61 (A10): borrar con 403 BORRADO_NO_PERMITIDO deja la fila y el foco en «Sí, borrar …», aunque la lista renovada traiga otra fila» | verde de entrada; F7. En su primera versión F7 sobrevivía porque la lista renovada no cambiaba y el bloque no se volvía a pintar; la reescribí para que cambie |
| «FORO-1D61 (A11): la clase que entra en solo lectura con el foco en «Escribe tu réplica» lleva el foco al h3» | rojo previo; F1 |
| «FORO-1D61 (A14): «Tu participación» que pierde el formulario en una recarga (otra pestaña) lleva el foco al h3» | rojo previo; F1 |
| «FORO-1D61: soltar el foco con un clic en blanco y después perder el control en una recarga no se lleva el foco» | verde de entrada; F8 |
| «FORO-1D62 (B1): con páginas por cargar, la principal publicada se ve al final de lo cargado, con el foco y sin otra lectura; al cargar más queda al final» | rojo previo; F3 |
| «FORO-1D62 (B2): con réplicas por cargar, la réplica publicada se ve al final de lo cargado, el campo se vacía, el foco vuelve al campo y no hay otra lectura; al cargar más queda al final» | rojo previo; F3 |
| «FORO-1D62 (B4): borrar la última principal de la primera página con la siguiente cargada lleva el foco al «Borrar» de la vecina, que venía de la otra página» | verde de entrada; F6 |
| «FORO-1D62 (B5): con réplicas por cargar, publicar sube el conteo plegado una vez, y al cargar más no cuenta dos veces la nueva» | rojo previo; F5 |

Corrida previa al remedio: `npx vitest run src/features/tareas/foco-participaciones-01d.test.tsx src/features/tareas/unir-paginas-del-foro-01d.test.ts` dio `Tests  22 failed | 4 passed (26)`.

### Los vecinos del arbitraje, uno por uno
**A. Controles con foco que pueden desaparecer:**
1. **Publicar la principal.** Aplica y está aplicado. Con la lista cargada, el foco va a la nueva (FORO-1D02 y FORO-1D62 B1). Con la lista en error, al `h3` (FORO-1D61 A1 y ATQ-FORO-136).
2. **Los tres `409` al publicar.** Aplica y está aplicado: el foco va al `h3`, con un solo aviso (FORO-1D61 A2 ×3 y ATQ-FORO-136). Lo escrito se pierde con el formulario, como fijó el manager.
3. **Publicar con un error que reemplaza la vista.** No aplica al remedio del bloque. El bloque se desmonta y el gancho de la vista lleva el foco a la raíz, como hoy (FORO-1D61 A3, que tumba F9).
4. **Publicar una réplica con `404 PARTICIPACION_NO_ENCONTRADA`.** Aplica y está aplicado: el foco va al `h3`, con el aviso de §D-10, uno solo (FORO-1D61 A4).
5. **Publicar una réplica con `409 FORO_CERRADO`.** Aplica y está aplicado: el alumno pierde el formulario y el foco va al `h3` (FORO-1D61 A5). Va al `h3` y no al `h4`, porque el formulario no está dentro de una réplica.
6. **La recarga de las réplicas con `404`.** Aplica y está aplicado: el foco va al `h3` y se avisa una vez «Esa participación ya no existe.» (FORO-1D61 A6 ×2; O-01d-2). ATQ-FORO-137 es la PARADA de arriba.
7. **La recarga de la lista que quita la fila con el foco.** Aplica y está aplicado: el foco va al `h3`, sin aviso (FORO-1D61 A7). Pasa lo mismo con `pedirDeNuevoElForo` y con un borrado desde otra sesión, porque todos llegan por la recarga de la lista.
8. **Una recarga del bloque que quita la réplica con el foco.** Aplica y está aplicado: el foco va al `h4` (FORO-1D61 A8; F2).
9. **Borrar como acción propia.** Sin cambio: el foco va a la vecina o al encabezado (FORO-1D38). El remedio va después y no actúa, porque el foco ya no está perdido.
10. **Borrar con `404` o con `403`.**
    - Con `404`, la fila sale y el foco va al `h3` (FORO-1D61 A10, primero).
    - Con `403`, la fila se queda y el foco sigue en «Sí, borrar …», aunque el bloque se vuelva a pintar (FORO-1D61 A10, segundo; F7).
    - En una réplica, el mismo `404` hace salir la réplica. Su bloque se recarga y el foco va al `h4`, por el mismo mecanismo de A8.
11. **La clase entra en solo lectura.** Aplica y está aplicado: el foco va al `h3` (FORO-1D61 A11, con el campo de la réplica enfocado). En un «Borrar» de principal o de réplica pasa lo mismo: no es la réplica la que sale, así que el bloque de réplicas no actúa y lo atiende «Participaciones».
12. **«Ocultar réplicas» y «Ver réplicas».** No aplica: el foco se queda en el botón, que es el mismo control y sigue conectado (FORO-1D11, «… es el mismo botón y conserva el foco»). El remedio no actúa, porque el foco no está perdido.
13. **«Ver más».** Sin cambio: el foco va a la primera fila nueva o al encabezado (FORO-1D50 y `useFocoAlCargarMas`).
14. **«Tu participación» pierde el formulario en una recarga.** Aplica y está aplicado: el foco va al `h3` (FORO-1D61 A14).
15. **El foro que cierra por la fecha.** No aplica: el cliente no compara fechas (FORO-1D04b). Hasta que llega una recarga no cambia nada, y una recarga que quita el formulario es el caso 14.
16. **El foro entero reemplazado.** No aplica al bloque: el foco va a la raíz, sin cambio (las vigiladas de 01c2, FORO-1C52, FORO-1D52 con N-38, y FORO-1D61 A3). Ninguna cayó.

**B. Escrituras en una caché paginada:**
1. **Publicar la principal con páginas pendientes.** Aplicado, con la regla de la última aparición (ATQ-FORO-135 y FORO-1D62 B1, que cubre la parte sin «Ver más»; F3).
2. **Publicar una réplica con páginas pendientes.** Aplicado (ATQ-FORO-135 y FORO-1D62 B2, que cubre la parte sin «Ver más»; F3).
3. **Publicar con la lista en error o sin cargar.** Sin cambio de código: `setQueryData` no escribe en una lista sin datos y «Tu participación» sí se escribe (FORO-1D61 A1 lo afirma: «Participaste el …»).
4. **Borrar con varias páginas cargadas, con la vecina en otra página.** Funciona sin cambio: la lista se renueva con `exact`, TanStack Query 5 vuelve a calcular el cursor de cada página desde las nuevas, y la vecina se encuentra (FORO-1D62 B4; F6).
5. **El conteo plegado.** Aplicado: publicar una réplica sube el conteo de su principal en la lista, y la regla de la última aparición no cuenta dos veces la que llegó del servidor (FORO-1D62 B5; F5). Al borrar, la lista se renueva y trae el conteo del servidor (FORO-1D38).
6. **El conteo de la lista de «Foro».** Sin cambio: se marca vieja al publicar y al borrar (FORO-1D02 y FORO-1D37).

**Vecino que agrego: el clic en blanco.** Quien suelta el foco con un clic en blanco y después pierde ese control en una recarga no debe recibir el foco de vuelta. Aplicado («FORO-1D61: soltar el foco con un clic en blanco …»; F8).

### Filas de la matriz que cambian
| Disparador | Antes | Después |
|---|---|---|
| Publicar la principal, éxito con la lista en error o sin fila nueva | foco en `<body>` | `h3` «Participaciones» |
| Publicar la principal, los tres `409` de la participación | aviso; foco en `<body>` | aviso; el formulario sale; `h3` |
| Publicar una réplica, `404` y `409 FORO_CERRADO` | aviso; foco en `<body>` | aviso; `h3` |
| Recarga de las réplicas con datos y `404 PARTICIPACION_NO_ENCONTRADA` | sin aviso; la fila sale; foco en `<body>` | **un aviso por fallo, «Esa participación ya no existe.»**; la fila sale; `h3` |
| Recarga de la lista que quita la fila con el foco, y «Tu participación» que quita el formulario | foco en `<body>` | `h3` |
| Recarga del bloque que quita la réplica con el foco | foco en `<body>` | `h4` «Réplicas» |
| Borrar con `404` | aviso; foco en `<body>` | aviso; `h3` (`h4` si era una réplica) |
| La clase entra en solo lectura con el foco en un control de escritura | foco en `<body>` | `h3` |
| Publicar una réplica con páginas por cargar | conteo plegado sin la nueva | el conteo la incluye |
| Cualquier reemplazo de la vista o salto de foro | raíz | raíz (sin cambio) |

**En vuelo a la vez y con la vista desmontada:**
- El remedio vive en los componentes del bloque: con la vista desmontada no actúa, y manda el gancho de la vista.
- Dos bloques de réplicas que pierden una réplica a la vez llevan el foco cada uno a su `h4`. Solo uno tenía el foco, así que solo ese se mueve.
- El aviso de O-01d-2 lleva una memoria por consulta, una por principal (FORO-1D61 A6, segundo).

### Mutaciones
Todas con copia, ancla única, restauración y `filecmp`: «restaurado; cmp igual: True» en las 11 corridas (9 + F7 de nuevo + F3 de nuevo, listando todos los rojos). Script: `scratchpad/scripts/mutaciones01d_r1.py`. Registros: `scratchpad/mut01d_r1.log` y `mut01d_r1b.log`.

| Id | Mutación | Resultado |
|---|---|---|
| F1 | sin `useFocoAlEncabezadoSiSePierde` en `participaciones-del-foro.tsx` | rojo, 14: ATQ-FORO-136 ×2 y FORO-1D61 A1, A2 ×3, A4, A5, A6 (primero), A7, A10 (`404`), A11 y A14. ATQ-FORO-137 también cae, pero ya estaba rojo por la PARADA; con F1 cae antes, en la aserción del foco |
| F2 | sin el gancho en `replicas-de-participacion.tsx` | rojo, 1: FORO-1D61 A8 |
| F3 | `unirPaginasConLaUltimaAparicion` con la regla de la primera aparición | rojo, 6 propios del remedio: FORO-1D60 (las dos repetidas), FORO-1D62 B1 y B2, y ATQ-FORO-135 ×2. El séptimo rojo de la corrida es ATQ-FORO-137, el de la PARADA, que no depende de F3. Lo listé con `mutaciones01d_r1c.py`; el registro es `mut01d_r1c.log` |
| F4 | sin el aviso de O-01d-2 | rojo, 2: FORO-1D61 A6 ×2 |
| F5 | sin subir el conteo de la principal al publicar una réplica | rojo, 1: FORO-1D62 B5 |
| F6 | la vecina, solo la anterior | rojo, 1: FORO-1D62 B4 |
| F7 | mover el foco aunque el control siga conectado | primera corrida: sobrevive (el caso no volvía a pintar el bloque). Con el caso reescrito: rojo, 1 (FORO-1D61 A10, `403`) |
| F8 | sin borrar la memoria en un clic en blanco | rojo, 1: el caso del clic en blanco |
| F9 | sin `useFocoAlPerderseElControl` en `foro-view.tsx` | rojo, 1: FORO-1D61 A3 |

### Verificación
Desde `frontend/`, una corrida a la vez.

| Comando | Última línea |
|---|---|
| `npm run lint` | sale con 0; `All matched files use Prettier code style!` y termina en `> tsc -b`, sin errores |
| `npm run build` | `✓ built in 881ms` |
| `npx vitest run src/features/tareas` | `Tests  1 failed \| 1734 passed (1735)` (`Test Files  1 failed \| 61 passed (62)`). El único rojo es ATQ-FORO-137, la PARADA |
| `npx vitest run src/features/clases` | `Tests  3167 passed (3167)` (`Test Files  131 passed (131)`) |
| `npx vitest run src/app src/lib src/services src/styles src/components` | `Tests  1540 passed (1540)` (`Test Files  99 passed (99)`) |

Cuenta de `features/tareas`: 1735 = 1694 de antes + 15 del archivo del tester + 26 míos (6 + 20).

### Conteos
Con `npx vitest list` y `grep -a -c "<archivo> >"`:
- `foco-participaciones-01d.test.tsx`: 20 (nuevo);
- `unir-paginas-del-foro-01d.test.ts`: 6 (nuevo);
- `participar-01d.test.tsx`: 41;
- `errores-participacion-01d.test.tsx`: 6;
- `replicas-01d.test.tsx`: 37;
- `borrar-participacion-01d.test.tsx`: 17;
- `recuperar-participaciones-01d.test.tsx`: 20;
- `features/clases/actividades-foros-01d.test.tsx`: 18.

Total: **165 casos en mis 8 archivos de 01d**.

### `enEspera=`, «Ocultar» y `*.ataque`
- `grep -rho "enEspera=" frontend/src --include=*.tsx --exclude=*.test.tsx | wc -l` da **96**, sin cambio. `replicas-de-participacion.tsx` sigue con 3; ninguno cambió de lugar.
- Ningún `.tsx` de producción escribe «Ocultar» (`grep -rln` da 0).
- **`*.ataque` en rojo por el remedio:** solo ATQ-FORO-137 en `:593`, la PARADA de arriba. Las 7 `*.ataque` del foro de 01c1 y 01c2 y las vigiladas siguen en verde dentro de las suites de `features/tareas` y `features/clases`: `foro-detalle-01c:498`, `foros-01c2-r3:359`, FORO-1C52 y FORO-1D52.

### `git status --short -- frontend`
Son 30 entradas: las 27 de antes, más `foros-01d-r1.ataque.test.tsx` (del tester) y mis dos pruebas nuevas, `foco-participaciones-01d.test.tsx` y `unir-paginas-del-foro-01d.test.ts`.

| Clase | Cuántas |
|---|---|
| Producción modificada | 9 |
| Producción nueva | 5 |
| Pruebas nuevas mías | 8 |
| Lista cerrada | 3 |
| `*.ataque` del tester | 5 (4 modificadas y 1 nueva) |

## Implementación — FORO-01e (2026-11-17)

Plan: `docs/trabajo/FORO-01-actividad-tipo-foro/plan.md` (3933 líneas, con la Enmienda 13). Manda §E13; después, §E12 a §E7. Base: `24916a4`.
- Solo `frontend/`: no toqué `shared/` ni el backend, y no corrí nada del backend.
- `docs/DESIGN.md` **no está editado**. El texto literal va abajo, en «Texto para `docs/DESIGN.md`», para que el orquestador pida la autorización.

**Estado: terminado, salvo `DESIGN.md`.**
- **PARADAS:** ninguna.
- **Rojos esperados:** V-06 (C-14) y ATQ-CH4-34 (C-16), hasta la ronda 0 bis. Están detallados en «Rojos esperados».

### Lo que se hizo, por paso (§E13.16)
- **32. N-39.** Corregí el comentario de `esParticipacionNoEncontrada` (`features/tareas/lib.ts`). Ahora dice que el bloque avisa una vez por fallo «Esa participación ya no existe.» y que la lista se renueva.
- **33. Claves, rutas y tipos (§E13.5, literales), en `features/tareas/lib.ts`:**
  - claves: `clavePrefijoDeParticipantes`, `claveListaDeParticipantes`, `claveParticipante`, `claveParticipacionesDeAlumno`, `claveDevoluciones` y `claveMisDevoluciones`;
  - rutas de la API: `rutaDePaginaDeParticipantes`, `rutaDeParticipante`, `rutaDePaginaDeParticipacionesDeAlumno`, `rutaDePaginaDeDevoluciones`, `rutaDePaginaDeMisDevoluciones` y `rutaDeCalificacionDeParticipante`;
  - enlaces: `enlaceAlForo`, `enlaceAParticipantes` y `enlaceAParticipante`;
  - frases: `conteoDeParticipantes` y `fraseDeParticipante`.

  En `types.ts`: `ActividadDelPanel`, `TextosDeLaTablaDeEntregas`, `ConsultaDeDevoluciones`, `TextosDeDevoluciones` y las reexportaciones `ListaParticipacionesDeAlumnoRespuesta` y `ParticipacionDeAlumno`.
- **34. FORO-1E42 y FORO-1E41:**
  - `useBorrarParticipacion` suma `invalidateQueries({ queryKey: clavePrefijoDeParticipantes(claseId, foroId) })`, sin `exact`.
  - `useCalificarEntrega`, ante un `409` de calificar, marca vieja la entrega (`exact: true`, `refetchType: "none"`) antes de su aviso. Nada más cambia en ese gancho.
- **35. Ganchos nuevos** en `features/tareas/hooks.ts`: `useParticipantes`, `useParticipante`, `useParticipacionesDeAlumno`, `useDevoluciones`, `useMisDevoluciones` y `useCalificarParticipacion` (§E13.4).
  - Además, las dos funciones literales de R-01e-14: `pedirDeNuevoSoloLaParticipante` y `usePedirLaParticipanteAnteUnFalloNuevo`.
  - Y `useMarcarElFalloComoAvisado` (desviación 2).
  - Ningún nombre lleva «Comentar», «MiEntrega», «Hilo», «Entregar» ni «Anular». Los cinco ganchos que coinciden son los de antes.
- **36. El panel con `actividad` (R-01e-1 y R-01e-5).**
  - `PanelDeCalificacion` y su formulario aceptan `actividad?: ActividadDelPanel` y `tarea: ActividadDetalle`.
  - Crean siempre `useCalificarEntrega` y `useCalificarParticipacion`, y usan `calificar` según la actividad.
  - La ayuda del comentario, «Podrás calificar…» y la nota sin entrega salen de `TEXTOS_DEL_PANEL_POR_TIPO`, con los textos de DH-19.
  - `.version` sigue en 2, y sigue habiendo un solo `primary` y 3 campos.
- **37. Las vistas y el router:**
  - archivos nuevos: `participantes-view.tsx`, `participante-view.tsx` (con «Sus participaciones» dentro) y `components/devoluciones.tsx`;
  - `TablaDeEntregas` gana `textos` y `destinoDeFila`, opcionales: sin ellos, la tabla es la de hoy;
  - `app/router.tsx`:
    - en el maestro y en el admin, `foros/:foroId/participantes` y `foros/:foroId/participantes/:alumnoId`;
    - en el alumno, `foros/:foroId/participantes` lleva a `/login`.
- **38. «Tu participación» y `ForoView`:**
  - `MiParticipacion` suma, con calificación:
    - el `h4` «Calificación» y `CalificacionDeLaEntrega`;
    - «No participaste en este foro y ya está calificado.» si no hay `fechaEntrega`;
    - `DevolucionesDeTuMaestro`, que solo se monta con calificación (R-01e-11). Mientras carga o vacío no se pinta.
  - `ForoView` gana el panel «Participantes» (`h3` y «Ver participantes», `outline`, con el icono `Users`) para el maestro y el admin. No pide nada.
- **39. `features/calificaciones`** (sin `hooks.ts`, que no hizo falta, y sin `data.ts`):
  - `rutaDelGradebook` y `rutaDeMisCalificaciones` suman `conTipo=si`;
  - `enlaceAParticipante` y `enlaceAForo`, relativos;
  - la tabla y la lista eligen el destino por `tipo`.
- **40. DH-21 (a)** en `features/clases/hooks.ts`. El diff exacto va abajo.
- **41. Las 6 pruebas nuevas y la lista cerrada (2).** C-14 y C-16 los aplica el tester en la ronda 0 bis, con las cifras y las líneas de abajo.
- **42. `DESIGN.md`:** queda el texto, sin aplicar.
- **43. Las corridas:** abajo.

### `enEspera=` por archivo (C-14) y líneas de `participante-view.tsx` (C-16)
- `grep -rho "enEspera=" frontend/src --include=*.tsx --exclude=*.test.tsx | wc -l` da **99**: los 96 de antes más 3.
- Por archivo, con `grep -o 'enEspera=' <archivo> | wc -l`:
  - `features/tareas/participantes-view.tsx`: **1**, «Ver más alumnos»;
  - `features/tareas/participante-view.tsx`: **1**, «Ver más participaciones»;
  - `features/tareas/components/devoluciones.tsx`: **1**, «Ver más comentarios»;
  - `features/tareas/components/panel-de-calificacion.tsx`: **1**, sin cambio.
  - Ninguno cambió de lugar en los archivos que ya existían.
- **C-16:** las líneas de `participante-view.tsx` con `.refetch(` sin opción. Las dos están dentro de `recargarTrasConflicto`, a dos espacios del componente, que solo corre desde el `catch` de `enviar` del panel, con `enviandoRef` ya tomado:
  - `"/src/features/tareas/participante-view.tsx: consulta.refetch(),"`
  - `"/src/features/tareas/participante-view.tsx: recargaLaTareaTrasConflicto(error) ? foro.refetch() : Promise.resolve(null),"`
  - `participante-view.tsx` no pasa `refetch` como valor ni lo desestructura.

### El diff de `features/clases/hooks.ts` (DH-21 a)
`git diff 24916a4 -- frontend/src/features/clases/hooks.ts` da dos bloques: el import y las tres invalidaciones, con su comentario. Nada más cambia.
```diff
@@ import { api, esApiError } from "@/services/apiClient"
+import { clavePrefijoDeCalificaciones } from "@/services/calificacionesService"
@@ const invalidarPersonasDeLaClase
+// FORO-01e (DH-21 a, decisión del humano 2026-11-17): también cambian quiénes aparecen en las entregas de
+// cada tarea, en «Participantes» de cada foro y en el gradebook de la clase; se marcan viejos por prefijo
+// (sin observador no se pide nada; al volver se piden).
@@
     queryClient.invalidateQueries({ queryKey: CLAVE_CLASES_IMPARTIDAS }),
+    queryClient.invalidateQueries({ queryKey: ["clases", claseId, "tareas"] }),
+    queryClient.invalidateQueries({ queryKey: clavePrefijoDeForos(claseId) }),
+    queryClient.invalidateQueries({ queryKey: clavePrefijoDeCalificaciones(claseId) }),
   ])
```
- El import de `clavePrefijoDeCalificaciones` es nuevo. Sin él, la tercera invalidación de DH-21 no se puede escribir. Lo declaro aquí para que el manager lo vea con el diff.
- `clavePrefijoDeForos` ya estaba importada.

### Pruebas requeridas de 01e: archivo y título
Los archivos sin carpeta son de `features/tareas/`; `foro-01e.test.tsx` es de `features/calificaciones/`. Las cifras de cada archivo están en «Conteos».

| Caso | Archivo | Título |
|---|---|---|
| FORO-1E01 | `participantes-01e` | «FORO-1E01: el conteo, la tabla con sus columnas y «Ver participación» con el nombre oculto, hacia la participación del alumno»; «FORO-1E01: con más de 20 alumnos, «Ver más alumnos» trae la página siguiente; con el cursor vencido, la frase y sin «Ver más alumnos»» |
| FORO-1E02 | `participantes-01e` | «FORO-1E02: el maestro ve su nombre, su estado, lo que escribió (fecha, «Con retraso», «En respuesta a») y el panel; las devoluciones, en solo lectura»; «FORO-1E02: el admin lee la calificación (o «Sin calificar todavía.»), sin formulario»; «FORO-1E02: sin participar, «Todavía no participa.» y el panel dice cuándo se podrá calificar» |
| FORO-1E03 | `participantes-01e` | «FORO-1E03: sin rúbrica, con comentario: avisa «Calificación publicada», manda la versión de apertura, escribe la participante y las devoluciones se vuelven a pedir»; «FORO-1E03: con rúbrica, los puntos de cada criterio; recalificar avisa «Calificación actualizada»». Las invalidaciones de la matriz están en FORO-1E43 |
| FORO-1E04 | `participantes-01e` | «FORO-1E04: %s avisa con el texto del servidor, vuelve a pedir la participante (y el foro si depende de él) y reinicia el panel con el foco en «Calificación»» (×3: `ENTREGA_MODIFICADA`, `RUBRICA_MODIFICADA` y `ENTREGA_NO_CALIFICABLE`) |
| FORO-1E05 | `errores-calificar-foro-01e` | «FORO-1E05: un VALIDACION de %s (un campo que el panel no pinta en este modo) da un solo aviso legible y ningún ErrorDeCampo» (×3: `foroId` sin rúbrica, `puntajes` en un foro sin rúbrica y `calificacion` en un foro con rúbrica) |
| FORO-1E06 | `errores-calificar-foro-01e` | «FORO-1E06: un VALIDACION con el mensaje «%s» da un solo aviso con el genérico» (vacío y solo espacios) |
| FORO-1E07 | `errores-calificar-foro-01e` | «FORO-1E07: con prefijo de ruta «puntajes.1.puntos:», el ErrorDeCampo va bajo el criterio 2, sin la ruta y sin aviso» |
| FORO-1E08 | `errores-calificar-foro-01e` | «FORO-1E08: tras el ErrorDeCampo de «calificacion:» del servidor, un envío que la validación local rechaza muestra solo «Escribe la calificación.» y no pide nada» |
| FORO-1E09 | `errores-calificar-foro-01e` | «FORO-1E09: cada entrada de ENTRADAS_FUERA_DE_CONTRATO da un solo aviso (mensajeDeErrorForo; los campos, erroresDeCalificacionDeApi, la de la tarea), con el resto sin la ruta o el genérico, ningún ErrorDeCampo, y lo escrito se conserva». La traducción de los campos es `erroresDeCalificacionDeApi`, la misma que la de la tarea; la de los avisos es `mensajeDeErrorForo` |
| FORO-1E10 | `mi-calificacion-foro-01e` | «FORO-1E10: calificada con rúbrica: la calificación, la fecha, su desglose y «Comentarios de tu maestro» con sus comentarios»; «FORO-1E10: calificada sin comentarios: no se pinta «Comentarios de tu maestro» (sí se piden una vez)»; «FORO-1E10: sin calificación no se piden «Comentarios de tu maestro» (R-01e-11) ni se pinta la calificación»; «FORO-1E10: calificada sin haber participado: «No participaste en este foro y ya está calificado.» con la calificación» |
| FORO-1E11 | `foro-01e` | «FORO-1E11: %s: el gradebook pide conTipo=si; la celda del foro enlaza a la participación del alumno y la de la tarea, a su entrega» (maestro y admin); «FORO-1E11: sin tipo en la respuesta, cada celda enlaza como una tarea (como hoy)» |
| FORO-1E12 | `foro-01e` | «FORO-1E12: pide conTipo=si; el foro enlaza a ../foros/:id y la tarea a ../tareas/:id»; «FORO-1E12: en una clase anterior (solo lectura) el foro no lleva enlace, como la tarea (S-04)» |
| FORO-1E13 | `foro-01e` | «FORO-1E13: la categoría «Foros» del foro calificado aparece con su porcentaje y su conteo» |
| FORO-1E14 | `foro-01e` | «FORO-1E14: el .xlsx lleva la columna del foro con la calificación del alumno» |
| FORO-1E20 a FORO-1E22 | `recuperar-participantes-01e` | «FORO-1E20: «Ver participantes» desde el foro pide la primera página y la frase desaparece»; «FORO-1E21: atrás y adelante del historial piden la primera página y la frase desaparece»; «FORO-1E22: ir a «Foro» y volver antes de 30 s pide la primera página y la frase desaparece» |
| FORO-1E23 a FORO-1E25 y FORO-1E30 a FORO-1E32 | `recuperar-participantes-01e` | «FORO-1E23 y FORO-1E30 (%s): «Ver participación» desde «Participantes» pide la primera página y la frase desaparece»; «FORO-1E24 y FORO-1E31 (%s): atrás y adelante del historial piden la primera página y la frase desaparece»; «FORO-1E25 y FORO-1E32 (%s): desde una celda del gradebook pide la primera página y la frase desaparece». Cada uno con lo que escribió el alumno y con las devoluciones |
| FORO-1E26 | `recuperar-participantes-01e` | «FORO-1E26: con un 5xx avisa «Algo salió mal. Inténtalo de nuevo.»; lo escrito sigue y el mismo botón califica» |
| FORO-1E27 a FORO-1E29 | `recuperar-participantes-01e` | «FORO-1E27: abrir el foro desde «Foro» antes de 30 s pide la primera página y la frase desaparece»; «FORO-1E28: abrirlo desde «Actividades de aprendizaje» pide la primera página y la frase desaparece»; «FORO-1E29: atrás y adelante del historial piden la primera página y la frase desaparece» |
| FORO-1E33 y FORO-1E34 | `recuperar-participantes-01e` | «FORO-1E33: una recarga fallida conserva la vista y avisa; el siguiente fallo vuelve a avisar»; «FORO-1E34: volver a abrirla antes de 30 s la pide de nuevo; una lectura correcta no deja más avisos» |
| FORO-1E35 y FORO-1E51 | `recuperar-participantes-01e` | «FORO-1E35 y FORO-1E51: «%s» que falla con 503 conserva la lista, avisa una vez y el mismo botón vuelve a pedir la página» (×3: alumnos, participaciones y comentarios). La recarga de fondo de FORO-1E51 la cubre FORO-1E49; el cursor, FORO-1E54 |
| FORO-1E40 | `vecinos-panel-01e` | «FORO-1E40: en $nombre, tras el ErrorDeCampo de «calificacion:» del servidor, un envío vacío muestra solo «Escribe la calificación.», sin aviso y sin otro PUT» (la tarea y el foro) |
| FORO-1E41 | `vecinos-panel-01e` | «FORO-1E41: en $nombre, el 409 que llega con la clase ya archivada deja vieja la entrega sin pedirla; al restaurar y volver a abrirla se pide»; «FORO-1E41: en $nombre, el 409 que llega con la vista desmontada da un solo aviso, no pide nada y volver a abrirla la pide» (la tarea y el foro) |
| FORO-1E42 | `participantes-01e` | «FORO-1E42: con las dos en caché y sin observador quedan con isInvalidated en true sin pedirlas; al volver antes de 30 s se piden y muestran lo nuevo» |
| FORO-1E43 | `vecinos-panel-01e` | «FORO-1E43: %s, escribe la participante y marca viejas la lista de participantes, las calificaciones y la lista de «Foro»; no toca el foro, las participaciones, «Tu participación» ni lo que escribió el alumno; las devoluciones, solo con comentario» (sin y con comentario) |
| FORO-1E44 | `participantes-01e` | «FORO-1E44: al %s un alumno quedan viejos «Participantes», las entregas de una tarea y el prefijo de calificaciones, sin pedirlos; al volver se piden y el conteo es el nuevo» (agregar y quitar) |
| FORO-1E45 | `errores-calificar-foro-01e` | «FORO-1E45: cuelgan de claveForo con sus segmentos fijos»; «FORO-1E45: con alumnoId «%s» ninguna clave coincide con otra del foro ni es prefijo de una que no sea suya» (×6: `lista`, `alumno`, `participaciones`, `devoluciones`, `mia` y `foro`) |
| FORO-1E46 | `participantes-01e` | «FORO-1E46: «Participantes» y la participación de un alumno piden en minúsculas, y calificar escribe en la clave que la vista lee: el panel nace con la respuesta sin otra lectura» |
| FORO-1E47 | `participantes-01e` | seis casos: la recarga que quita la fila de «Participantes» (el foco al `h2`); «Ver más alumnos» (a la primera fila nueva); lo que escribió (al `h3`); las devoluciones (al `h3`); la clase que pasa a solo lectura (nunca `<body>`); y el `404 ALUMNO_NO_ENCONTRADO`, que reemplaza la vista (la raíz) |
| FORO-1E48 | `recuperar-participantes-01e` | «FORO-1E48: «$nombre»: la primera carga fallida (503) lo dice en su bloque, sin aviso, y no pide la participante» (×2); «FORO-1E48: «Comentarios de tu maestro»: la primera carga fallida lo dice en el bloque, sin aviso; con calificación en null no se pide»; «FORO-1E48: «%s» con %s: una sola lectura lógica más de la participante, sin repetir el bloque; si la participante responde lo mismo, la vista se reemplaza con un solo mensaje» (×8); «FORO-1E48: «$nombre» con un servidor inconsistente (la participante responde bien y el bloque otra vez 403) se queda con su texto, sin ciclo» (×2); «FORO-1E48: «$nombre» con un 404 NO_ENCONTRADO se queda en el bloque y no vuelve a pedir la participante» (×2); «FORO-1E48: «Comentarios de tu maestro» con un servidor inconsistente (el foro responde bien y el bloque 403) se queda con su texto, sin ciclo» |
| FORO-1E49 | `recuperar-participantes-01e` | «FORO-1E49: $nombre: una recarga fallida conserva lo que se ve y avisa; el siguiente fallo avisa otra vez; volver a abrir antes de 30 s pide y una lectura correcta no avisa» (×3: «Participantes», lo que escribió y las devoluciones); «FORO-1E49: «Comentarios de tu maestro» (DH-19): una recarga fallida avisa; el siguiente fallo avisa otra vez» |
| FORO-1E50 | `participantes-01e` | «FORO-1E50: dos clics en el mismo render de «Calificar y devolver» mandan un solo PUT»; «FORO-1E50: dos clics en el mismo render de «%s» piden una sola página» (×3) |
| FORO-1E52 | `participantes-01e` | «FORO-1E52: con el panel a medio llenar, saltar con el historial a %s y volver: lo escrito no se conserva ni se envía» (×3: el mismo alumno en otro foro, otro alumno del mismo foro, y el mismo alumno en un foro de otra clase) |
| FORO-1E53 | `participantes-01e` | «FORO-1E53: calificar con %s no avisa» (×3); «FORO-1E53: «Ver más alumnos» y las recargas de la participante, lo que escribió y las devoluciones con %s no avisan» (×3) |
| FORO-1E54 | `recuperar-participantes-01e` | «FORO-1E54: «Ver participantes» de otro foro y de vuelta: la lista del primero se pide de nuevo y la frase desaparece»; «FORO-1E54 (%s): con la frase a la vista no hay «Ver más»» (×2). Lo que no se ofrece mientras se ve la frase también lo afirman FORO-1E20 a FORO-1E32 |
| FORO-1E55 | `recuperar-participantes-01e` | «FORO-1E55: avisa «No pudimos cargar la participación actual…» una sola vez (no el de recarga fallida); repetir manda la versión de apertura, recibe el 409 y la recarga reinicia el panel; volver a abrirla antes de 30 s la pide»; «FORO-1E55: tras la recarga fallida, volver a abrir la participación antes de 30 s la pide» |

**Rojo primero.** Escribí las pruebas después del código: es la desviación 1. Por eso cada caso tiene la mutación real que lo tumba. Son 35 mutaciones (G1 a G35), con su tabla en «Mutaciones».

### Matriz de avisos y recargas (vistas y bloques nuevos)
Columnas de error:
- **Reemplaza:** `404 TAREA_NO_ENCONTRADA` del foro, `404 ALUMNO_NO_ENCONTRADO`, `403 SIN_ACCESO_A_LA_CLASE` o un `VALIDACION` de `claseId:`, `foroId:` o `alumnoId:`.
- **Redirige:** `apiClient`; nunca hay aviso.

| Disparador | Reemplaza | Redirige | 409 | 5xx o red | Foco | En vuelo a la vez | Con la vista desmontada |
|---|---|---|---|---|---|---|---|
| Lista de «Participantes» | reemplaza la vista (la raíz) | sin aviso | — | primera carga: reemplaza con el genérico; recarga con datos: la conserva y avisa (DH-20) una vez por fallo; cursor: la frase, sin «Ver más alumnos» | una fila que sale va al `h2` | una lectura | al salir en error queda vieja (`useMarcarViejaSiQuedoEnError`); un fallo ya avisado no se repite |
| «Ver más alumnos» | sin aviso | sin aviso | — | un aviso; la lista se queda | la primera fila nueva o el `h2` | guarda con ref y `cancelRefetch: false` | sin aviso |
| La participante | reemplaza (la raíz) | sin aviso | — | recarga con datos: «No pudimos actualizar la participación de este alumno…» una vez por fallo; sin datos, el genérico | — | — | — |
| «Sus participaciones» y «Comentarios de la devolución» | el bloque dice su texto y la participante se pide una vez (exact; R-01e-14) | sin aviso | — | primera carga: su texto (DH-19); recarga con datos: su aviso (DH-19); cursor: la frase, sin «Ver más» | la fila que sale va al `h3` del bloque | una | quedan viejos al salir en error |
| «Comentarios de tu maestro» (alumno) | el bloque dice su texto y el foro se pide una vez (exact) | sin aviso | — | igual, con sus textos | `h4` | una | igual |
| «Calificar y devolver» (foro) | aviso con `mensajeDeErrorForo`; se piden el foro y la participante (exact) | sin aviso | aviso con el texto del servidor; la participante queda vieja sin pedirla (FORO-1E41); con la vista montada, recarga la participante (y el foro con `RUBRICA_MODIFICADA` o `ENTREGA_NO_CALIFICABLE`) y reinicia el panel; si la recarga falla, «No pudimos cargar la participación actual…» (DH-19), un solo aviso | el genérico; lo escrito se conserva; repetir funciona | éxito y reinicio: el `h3` «Calificación»; error de campo: el campo | guarda `enviandoRef` | los avisos viven en el gancho; la vista no recarga |
| `409 CLASE_ARCHIVADA` al calificar | — | — | aviso del servidor; la clase se marca vieja; el panel sale y queda la lectura | — | nunca `<body>` (FORO-1E47) | — | — |

### Vecinos de las claves y del foco
**Las claves nuevas (§E13.5):**

| Clave | Quién la lee | Quién la escribe | Quién la invalida o la quita, y con qué alcance |
|---|---|---|---|
| `claveListaDeParticipantes` | `useParticipantes` | — | calificar (sin `exact`, es una hoja); DH-21 por `clavePrefijoDeForos`; `pedirDeNuevoElForo` y T-03 por prefijo |
| `claveParticipante` | `useParticipante` | calificar (`setQueryData`, exacta) | el `409` de calificar (`exact`, `refetchType: "none"`); `pedirDeNuevoSoloLaParticipante` (`exact`); borrar una participación (por `clavePrefijoDeParticipantes`) |
| `claveParticipacionesDeAlumno` | `useParticipacionesDeAlumno` | — | borrar una participación (prefijo); no la toca calificar (FORO-1E43) |
| `claveDevoluciones` | `useDevoluciones` | — | calificar con comentario (`exact`) |
| `claveMisDevoluciones` | `useMisDevoluciones` | — | `renovarTrasErrorDeLaParticipacion` de 01d, por `claveMiParticipacion` sin `exact`: es inocuo (§E13.5) |
| `clavePrefijoDeParticipantes` | — | — | `useBorrarParticipacion` (FORO-1E42) |

`borrar foro` (`removeQueries(claveForo)`) se lleva todo lo de arriba.

**El foco, camino por camino:**
- **«Ver participación» de una fila que sale:** al `h2` (G21).
- **«Ver más alumnos», participaciones o comentarios al cargar lo último:** a la primera fila nueva o al encabezado (`useFocoAlCargarMas`).
- **Lo que escribió o una devolución que sale en una recarga:** al `h3` del bloque (G22 y G23).
- **El cursor:** el control desaparece y aparece la frase. El foco va al encabezado del bloque por el mismo gancho.
- **`409` con reinicio:** al `h3` «Calificación» (FORO-1E04 y FORO-1E55).
- **La clase en solo lectura:** el panel sale y el foco no cae en `<body>` (FORO-1E47). Va al `h3` de la lectura o a la raíz, por `useFocoAlPerderseElControl`.
- **La vista reemplazada:** a la raíz (FORO-1E47, `404`).
- **Salto a otro foro, otro alumno u otra clase:** el contenido se monta de nuevo por la `key` (FORO-1E52).

### Desviaciones del plan (numeradas) y PARADAS
**PARADAS:** ninguna.
1. **Rojo primero por mutación, no por orden.** Escribí el código antes que las pruebas. Cada caso nuevo lo tumba su mutación real (G1 a G35, todas en rojo).
2. **Un solo aviso tras la recarga fallida de un `409`.** Para que la persona lea solo el aviso de DH-19 (2) y no también el de la recarga fallida de la participante, hice dos cosas:
   - `participante-view.tsx` lleva un estado `recargando` que apaga los avisos de recarga mientras dura la recarga tras el `409`;
   - `hooks.ts` gana `useMarcarElFalloComoAvisado`, que marca ese fallo como ya avisado en la memoria por consulta (`ultimoFalloAvisado`).

   FORO-1E55 y G18 lo fijan.
3. **`useCalificarParticipacion` pide también la participante** (`pedirDeNuevoSoloLaParticipante`), además del foro (§E13.4), ante un error que reemplaza la vista. Sin eso, un `404 ALUMNO_NO_ENCONTRADO` al calificar dejaría la vista con el panel; en la tarea, el mismo caso lo cubre `pedirDeNuevoLaTarea`, porque la entrega cuelga de la tarea.
4. **Textos sin lugar en §D-9:**
   - «Sus participaciones» vacía dice «Todavía no participa.» (el texto de §D-9 de la participante);
   - la carga de la participación usa `Cargando` sin texto, es decir, «Cargando…».

   No inventé textos.
5. **El panel «Participantes» de `ForoView` se pinta también en una clase archivada.** Es lectura (las rutas 12 a 16 son `enClaseArchivada: "lectura"`), no una acción de escritura.
6. **Rama del alumno:** solo `foros/:foroId/participantes` lleva a `/login`, como dice §E13.14. `…/participantes/:alumnoId` cae en `*`. No hay caso requerido.
7. **FORO-1E41 y FORO-1E55, «al volver a abrir se pide»:**
   - los casos afirman la lectura, como dice el plan;
   - el panel nace con la versión que había en la caché mientras esa lectura vuela, igual que en la tarea (M-06 de CALIFICACIONES);
   - guardar antes de que llegue la lectura da un `409` y la recarga de siempre.

   Lo dejo como observación para el manager.
8. **El import de `clavePrefijoDeCalificaciones` en `features/clases/hooks.ts`** (DH-21), declarado con el diff.

### Texto para `docs/DESIGN.md` (literal; sin aplicar)
Es el de §E13.11, con cada «(a confirmar en 01e)» resuelto contra lo implementado.
- La §7.34 va **después de la §7.33** (después de la línea 939). No repite los encabezados con que `styles/tokens-r1.ataque` corta las secciones: `### Tokens`, `### Materiales`, `### Escala`, `### Radios`, `### Bordes` y `## 5.`.
- No lleva el carácter `−`.

````markdown
### 7.34 Foro (propuesta (FORO-01))

Un foro es una actividad calificable (como una tarea, §7.20 y §7.27) en la que la clase participa por escrito.
- **La fila del foro en «Foro» (FORO-01c1):** la fila de §7.7, con dos diferencias. Al inicio del enlace va "Foro:" oculto (`rotulo`), en lugar de "Tarea:", y a la derecha, un complemento (`complemento`): para el alumno, la insignia de su estado (§7.8); para el maestro y el admin, «{n} participaciones», «1 participación» o «Sin participaciones», en `--text-small` y `--muted-foreground`. Sin `complemento` ni `rotulo`, la fila es la de §7.7. En la lista, «Crear foro» es la acción principal del maestro y del admin, y no se pinta en una clase archivada.
- **En «Actividades» (FORO-01d):** la fila del foro es la de §7.7 con "Foro:" oculto y, a la derecha, la insignia neutra «Foro» con `MessagesSquare`. Enlaza al foro. «Crear foro» (`outline`, `MessagesSquare`) va junto a «Crear tarea», que sigue siendo la única `primary`; no se pinta en una archivada. «Mover» funciona igual que el de una tarea.
- **El detalle del foro (FORO-01c2):** la composición de §7.20, con la insignia «Foro», el `h3` «Planteamiento» y la política del foro en «Detalles». Para el maestro y el admin, en la columna derecha, un panel «Participantes» (`h3`) con «Ver participantes» (`outline`, icono `Users`), también en una clase archivada (es lectura; no pide nada), y debajo las acciones del foro.
- **El panel «Participaciones» (FORO-01d):** un `Card` bajo el planteamiento, con el `h3` «Participaciones» (`tabIndex={-1}`) y «Lo que publiques aquí lo ve toda la clase.».
  - El alumno que puede participar ve «Escribe tu participación» y «Publicar participación», su acción principal. Antes del campo puede ir la nota de retraso, y si ya no puede participar, el texto de cerrado.
  - El admin ve «La administración puede leer este foro, pero no participar en él.».
- **Cada participación:** la lista va de la más antigua a la más reciente, con divisores de 1 px en `--border` (§7.25). Lleva la firma (`FirmaDelAutor`), la fecha y la hora en `--text-small` y `--muted-foreground`, «Tuya» si es propia, la insignia `warning` «Con retraso» con `Clock` (nunca solo color) y el texto plano.
- **El control de réplicas:** un solo botón que conserva el foco al cambiar de texto, con `aria-expanded`.
  - «Ver réplicas (n)» con una o más, y el conteo es el mayor entre el de la lista y lo que el bloque ya cargó.
  - «Replicar» sin réplicas, para quien puede replicar.
  - Desplegado, «Ocultar réplicas».
  - El admin, sin réplicas que leer, no ve control.
- **El bloque de réplicas:** su `h4` «Réplicas», oculto (`sr-only`, `tabIndex={-1}`), la lista ascendente con firma, fecha y hora y «Con retraso», «Ver más réplicas», y «Escribe tu réplica» con «Publicar réplica» (`outline`). El maestro replica siempre; el alumno, si puede; el admin, nunca. En una archivada no hay formulario.
- **Publicar:** lo nuevo aparece al final de lo cargado. Con páginas por cargar, al pulsar «Ver más» queda en su lugar, porque las listas se unen con la última aparición de cada fila. Una recarga antes de «Ver más» lo deja de mostrar hasta cargar más (O-01d-5).
- **«Borrar» (solo el admin, decidido por `puedeBorrar` del dato):** «Borrar» con el nombre oculto («participación de {nombre}», «réplica de {nombre}»), la confirmación en línea de §7.14 con sus textos y «Sí, borrar participación» o «Sí, borrar réplica». Al pedirla, el foco va a «Cancelar». Al borrar, va al mismo control de la vecina o a la vecina y, sin vecinas, al `h3` o al `h4` del bloque.
- **"Tu participación" (alumno):** un `Card` en la columna derecha, una región con el `h3` «Tu participación», la insignia de su estado y «Participaste el {fecha} a las {hh:mm}» («… con retraso») o «Todavía no participas.». Desde 01e, con calificación, debajo de un divisor de 1 px en `--border`: el `h4` «Calificación» con la calificación en lectura de §7.27 (y antes, «No participaste en este foro y ya está calificado.» si no participó) y el bloque «Comentarios de tu maestro» (`h4`, `tabIndex={-1}`), que solo se pide con calificación y no se pinta mientras carga ni si está vacío.
- **El foco cuando desaparece un control dentro de un bloque** (una recarga, un `409`, un `404`, la clase que pasa a solo lectura): va al encabezado de ese bloque (el `h3` «Participaciones», el `h4` «Réplicas» y, desde 01e, el `h2` «Participantes», el `h3` «Sus participaciones» y el `h3` «Comentarios de la devolución» o el `h4` «Comentarios de tu maestro»), nunca a `<body>`. La raíz de la vista queda para la vista reemplazada y para el salto a otro foro.
- **Errores y vacío:** «Aún no hay participaciones en este foro.».
  - La primera carga fallida de cada bloque dice su texto en el bloque, sin aviso («No pudimos cargar las participaciones.», «No pudimos cargar las réplicas.», «No pudimos cargar las participaciones de este alumno.», «No pudimos cargar los comentarios de la devolución.», «No pudimos cargar los comentarios de tu maestro.»).
  - Una recarga fallida con datos conserva lo que se ve y avisa una vez por fallo.
  - Si la principal desaparece mientras se ven sus réplicas, el aviso es «Esa participación ya no existe.» y la fila sale.
  - El cursor vencido dice su frase, sin «Ver más».
- **"Participantes" (FORO-01e):** §7.26 con los textos del foro: «Volver al foro», el `h2` «Participantes» (`tabIndex={-1}`), el título del foro, «Participaron {n} de {m} alumnos.» («de 1 alumno»), la tabla de entregas con las columnas «Alumno», «Estado», «Participó» y «Acciones», «Ver participación» (`outline`, `sm`) con el nombre oculto, y «Ver más alumnos». Una recarga fallida con datos conserva la lista y avisa «No pudimos actualizar la lista de alumnos. Mostramos la última versión que tenemos.» (DH-20).
- **La participación de un alumno (FORO-01e):** §7.26 con «Volver a los participantes», su nombre en `h2` con su insignia, el título del foro y «Participó el {fecha} a las {hh:mm}» o «Todavía no participa.». Debajo, cada uno en su `Card`:
  - «Sus participaciones» (`h3`), lo que escribió, de lo más antiguo a lo más reciente con divisores de 1 px: la fecha y la hora, «Con retraso» (`warning`, `Clock`), «En respuesta a» con la firma de la persona a quien responde (`FirmaDelAutor`) en sus réplicas, el texto plano y «Ver más participaciones»;
  - el panel de §7.27 para el maestro, con los textos del foro («Se publica en los comentarios de la devolución.», «Podrás calificar cuando el alumno participe o cuando se cierre el foro.», «Este alumno no participó y el foro ya está cerrado.»); la calificación en lectura para el admin y en una clase archivada;
  - «Comentarios de la devolución» (`h3`), en solo lectura, con «Ver más comentarios» y, vacío, «Aún no hay comentarios de la devolución.».
````

**Las sumas a otras secciones** (con la marca "propuesta (FORO-01)"):
- **§7.10, "Error de la página siguiente":** "La lista de «Foro» sigue a Dudas. En `features/tareas`, las listas del foro conservan la lista también ante una recarga de fondo fallida, como Entregas, y además avisan una vez por fallo: las participaciones, las réplicas, lo que escribió un alumno, las devoluciones y «Participantes» (DH-20)."
- **§7.10, "Error":** "Un bloque dentro de una vista con datos (las participaciones, las réplicas, lo que escribió un alumno, los comentarios de la devolución, «Comentarios de tu maestro») dice el error de su primera carga en su propio `MensajeError`, con un texto propio."
- **§7.14, "Lo abierto es de su clase":** suma "el foro, la participación y el participante (`key` por el foro, y por el foro y el alumno juntos)".
- **§7.14, nuevo párrafo, "Foco al encabezado del bloque (FORO-01d, T-02)":** "Cuando desaparece el control que tenía el foco dentro de un bloque con encabezado propio (una recarga, un `409`, un `404`, la clase en solo lectura), el foco va a ese encabezado (`tabIndex={-1}`); la raíz queda para la vista reemplazada. Lo implementa `useFocoAlEncabezadoSiSePierde` (`features/tareas/hooks.ts`)."
- **§7.14, la regla de N-28 (FORO-01c1):** "Una recarga correcta que quita la fila enfocada de «Foro» lleva el foco al `h2` de la lista."
- **§7.3 y §7.16:** "siete secciones", con «Foro» tercera.
- **§7.8:** "la insignia neutra «Foro» con `MessagesSquare`".
- **§7.22:** "la fila del foro y «Crear foro»".

**Lo que confirmé o corregí de las marcas «(a confirmar en 01e)»:**
- "Tu participación": confirmado, con dos precisiones:
  - el encabezado es `h4`, porque va dentro del `Card` con su `h3`;
  - se suma «No participaste en este foro y ya está calificado.» (DH-19).
- "Participantes": confirmado. Se suman el título del foro y el aviso de DH-20.
- La participación de un alumno: confirmado, con cuatro precisiones:
  - cada bloque va en su `Card`;
  - «En respuesta a» va con la firma;
  - los tres textos del panel son los de DH-19;
  - el admin y la clase archivada leen la calificación.
- El detalle: «Ver participantes» lleva el icono `Users` y se ve también en una clase archivada (desviación 5).

### Mutaciones
Script: `scratchpad/scripts/mutaciones01e.py` (G1 a G35). Registros: `scratchpad/mut01e.log` y `mut01e-b.log`.
- Cada una con copia previa, ancla única (comprobada con `--anclas`), restauración y `filecmp`. Las 36 corridas dieron «restaurado; cmp igual: True».
- Todas son en archivos de «Se toca». En `features/clases/hooks.ts`, solo sobre las tres invalidaciones de DH-21.
- **Todas dan rojo.** G26 (sin la `key` compuesta) sobrevivió en su primera corrida: el salto pasaba por la carga y desmontaba el panel de todos modos. Reescribí FORO-1E52 para que la otra participación ya esté en la caché, y ahora G26 da rojo (3 casos).

| Id | Mutación | Cae |
|---|---|---|
| G1 | `pedirDeNuevoSoloLaParticipante` sin `exact` | FORO-1E48, servidor inconsistente (×2) |
| G2 | el bloque no pide la participante | FORO-1E48, las 8 combinaciones de bloque y código |
| G3 | borrar sin `clavePrefijoDeParticipantes` | FORO-1E42 |
| G4 | el `409` de la tarea sin marcar vieja la entrega | FORO-1E41, la tarea (×2) |
| G5 | el `409` del foro sin marcar vieja la participante | FORO-1E41, el foro (×2) |
| G6 | las devoluciones se invalidan siempre | FORO-1E43, sin comentario |
| G7 | sin la lista de participantes | FORO-1E43 (×2) |
| G8 | sin la lista de «Foro» | FORO-1E43 (×2) |
| G9 | sin el prefijo de calificaciones | FORO-1E43 (×2) |
| G10 | la participante se invalida por prefijo | FORO-1E43 (×2) |
| G11, G12 y G13 | DH-21 sin tareas, sin foros o sin calificaciones | FORO-1E44 (×2 cada una) |
| G14 | el panel usa siempre la mutación de la tarea | FORO-1E03 (×2) |
| G15 | el panel usa siempre los textos de la tarea | FORO-1E02 |
| G16 | «Participantes» sin su aviso | FORO-1E49 |
| G17 | la participante sin su aviso | FORO-1E33 y FORO-1E34 |
| G18 | sin `marcarComoAvisado` | FORO-1E55 |
| G19 | lo que escribió, sin su aviso | FORO-1E49 |
| G20 | las devoluciones sin su aviso | FORO-1E49 (×2) |
| G21, G22 y G23 | sin el foco al encabezado | FORO-1E47, uno cada una |
| G24 y G25 | sin el id canónico | FORO-1E46 |
| G26 | sin la `key` compuesta | FORO-1E52 (×3) |
| G27 | el panel sin `enviandoRef` | FORO-1E50 |
| G28 y G29 | sin `conTipo=si` | FORO-1E11 (×2) y FORO-1E12 |
| G30 y G31 | el enlace siempre de la tarea | FORO-1E11 (×2) y FORO-1E12 |
| G32 | «Comentarios de tu maestro» sin la condición | FORO-1E10 |
| G33 | «Participantes» sin la frase del cursor | FORO-1E20 a FORO-1E22 y FORO-1E54 |
| G34 | `ForoView` sin «Ver participantes» | FORO-1E20, FORO-1E21 y FORO-1E54 |
| G35 | calificar un foro sin callar el error del campo | FORO-1E07 |

**Redundancias declaradas, sin mutación propia:**
- **Los «Ver más» de 01e** usan `useVerMasConservandoLaLista` de 01d. Su guarda y su `cancelRefetch: false` son redundantes entre sí, como ya se declaró en 01d (D5, D6 y D35). FORO-1E50 vigila los tres botones.
- **`useMarcarViejaSiQuedoEnError`** en los tres bloques: es una garantía escrita (TanStack Query 5.103.2), como D29 y D30 de 01d.

### Rojos esperados (hasta la ronda 0 bis)
- **V-06** (`styles/clases-r1.ataque.test.ts:225`): «expected [ …(99) ] to have a length of 96 but got 99». Se resuelve con C-14, con las cifras de arriba.
- **ATQ-CH4-34** (`lib/guardas-ch4-r1.ataque.test.ts`): «expected [ …(8) ] to deeply equal [ …(6) ]». Los dos `+` son las líneas de C-16 de arriba.
- No hay ningún otro rojo.

### Verificación
Desde `frontend/`, una corrida a la vez.

| Comando | Última línea |
|---|---|
| `npm run lint` | sale con 0; `All matched files use Prettier code style!` y luego `> tsc -b`, sin errores |
| `npm run build` | `✓ built in 905ms` |
| `npx vitest run src/features/tareas` | `Tests  1850 passed (1850)` (`Test Files  68 passed (68)`) |
| `npx vitest run src/features/calificaciones` | `Tests  481 passed (481)` (`Test Files  24 passed (24)`) |
| `npx vitest run src/features/clases` | `Tests  3167 passed (3167)` (`Test Files  131 passed (131)`). DH-21 no rompió nada en `features/clases` |
| `npx vitest run src/app src/lib src/services src/styles src/components` | `Tests  2 failed \| 1538 passed (1540)` (`Test Files  2 failed \| 97 passed (99)`). Los dos rojos son los esperados: V-06 y ATQ-CH4-34 |

### Conteos
Con `npx vitest list` sobre las seis pruebas nuevas (`grep -a -c "^src/features/<archivo>.test.tsx >"`):

| Archivo | Casos |
|---|---|
| `tareas/participantes-01e` | 33 |
| `tareas/errores-calificar-foro-01e` | 15 |
| `tareas/mi-calificacion-foro-01e` | 4 |
| `tareas/recuperar-participantes-01e` | 43 |
| `tareas/vecinos-panel-01e` | 8 |
| `calificaciones/foro-01e` | 7 |

Total: **110 casos en 6 archivos**.
- `features/tareas` pasa de 1747 a 1850 (+103 = 33 + 15 + 4 + 43 + 8).
- `features/calificaciones` pasa de 474 a 481 (+7).

### `git status --short -- frontend` contra `24916a4`
Son 24 entradas. Por clase:

| Clase | Cuántas | Archivos |
|---|---|---|
| Producción modificada | 13 | `app/router.tsx`; en `features/calificaciones/`, `lib.ts`, `components/tabla-del-gradebook.tsx` y `components/lista-de-mis-calificaciones.tsx`; `features/clases/hooks.ts` (DH-21); en `features/tareas/`, `components/mi-participacion.tsx`, `components/panel-de-calificacion.tsx`, `components/tabla-de-entregas.tsx`, `data.ts`, `foro-view.tsx`, `hooks.ts`, `lib.ts` y `types.ts` (son 8 en `tareas`) |
| Producción nueva | 3 | `features/tareas/participantes-view.tsx`, `participante-view.tsx` y `components/devoluciones.tsx` |
| Pruebas nuevas | 6 | las de «Conteos» |
| Lista cerrada | 2 | `features/calificaciones/lib.test.ts` (las cuatro URL con `conTipo=si`) y `lib/estado-por-id-estatico-ch6.test.ts` (CH6-A30 (c), literal de §E13.2) |
| `*.ataque` | 0 | — |

- Producción en `frontend/`: 16, que son 13 modificadas y 3 nuevas. Corresponden a los 15 de §E13.14 en `frontend/` (11 de `tareas`, 3 de `calificaciones` y `app/router.tsx`) más `features/clases/hooks.ts` por DH-21. Falta `docs/DESIGN.md`, pendiente de la autorización.
- `features/calificaciones/hooks.ts` no hizo falta.
- No toqué `docs/trabajo/DEPLOY-investigacion-vps.md`.

## Corrección tras la verificación del manager — FORO-01e: M-13, N-46 y DH-22 (2026-11-17)

Leí `revision.md`, "## Verificación del resumen — FORO-01e — implementación (2026-11-17)".
- **PARADAS:** ninguna.
- **Archivos:**
  - producción: `features/tareas/data.ts` y `participante-view.tsx` (DH-22);
  - pruebas, todas mías: `features/tareas/recuperar-participantes-01e.test.tsx` y `participantes-01e.test.tsx`.
- No toqué ninguna `*.ataque`, ni `docs/DESIGN.md`.
- Las dos líneas de C-16 (`participante-view.tsx:241-242`) no cambian.
- `enEspera=` sigue en 99.

**Proceso:** esta vez el caso fue primero.
- **Los textos de DH-22:** primero los casos, que dieron 3 en rojo (`Tests  3 failed | 3 passed | 28 skipped (34)`); después, el código.
- **M-13:** la conducta ya existía, así que su rojo se demuestra con las mutaciones reales H1 a H6, todas en rojo.

### M-13: casos nuevos (`features/tareas/recuperar-participantes-01e.test.tsx`)
| Título | Mutaciones que lo tumban |
|---|---|
| «FORO-1E48: «Comentarios de tu maestro» con 404 TAREA_NO_ENCONTRADA: una sola lectura lógica más del foro, sin repetir el bloque; si el foro responde lo mismo, la vista se reemplaza con un solo mensaje (M-13)» | H1, H2 y H3 |
| ídem con «403 SIN_ACCESO_A_LA_CLASE» | H1, H2 y H4 |
| ídem con «400 VALIDACION de foroId» | H1, H2 y H5 |
| «FORO-1E48: «Comentarios de tu maestro» con un 404 NO_ENCONTRADO se queda en el bloque y no vuelve a pedir el foro (M-13)» | H6 |
| El caso del servidor inconsistente de «Comentarios de tu maestro», que ya existía: ahora afirma `expect(foro).toBe(2)`, es decir, la carga más una lectura de más, y ningún ciclo | H1, H2 y H4 |
| `ERRORES` de los bloques de la participante suma «400 VALIDACION de foroId», que espera «Ese foro ya no existe.»: «FORO-1E48: «Sus participaciones» con 400 VALIDACION de foroId: …» y «FORO-1E48: «Comentarios de la devolución» con 400 VALIDACION de foroId: …» | H5 |

**Las mutaciones** (`scratchpad/scripts/mutaciones01e_m13.py`, registro `mut01e-m13.log`). Cada una con copia, ancla única, restauración y `filecmp`, y las 8 dieron «cmp igual: True»:
| Id | Mutación | Resultado |
|---|---|---|
| H1 | `useMisDevoluciones` sin `usePedirElForoAnteUnFalloNuevo` | 4 en rojo |
| H2 | `pedirDeNuevoSoloElForo` sin `exact` | 4 en rojo |
| H3 | `CODIGOS_QUE_REEMPLAZAN_LA_VISTA_DEL_FORO` sin `TAREA_NO_ENCONTRADA` | 1 en rojo |
| H4 | sin `SIN_ACCESO_A_LA_CLASE` | 2 en rojo |
| H5 | `PREFIJOS_QUE_REEMPLAZAN_LA_VISTA_DEL_FORO` sin `foroId` | 3 en rojo: los dos bloques de la participante y «Comentarios de tu maestro» |
| H6 | `pedirDeNuevoSoloElForo` sin su guarda (pide ante cualquier error) | 1 en rojo: el `NO_ENCONTRADO` |
| H7 | la lista vacía con el texto viejo | FORO-1E42 en rojo |
| H8 | la vista con `Cargando` sin texto | el caso de DH-22 en rojo |

No apareció ningún defecto de producción en M-13.

### DH-22: los dos textos
Son constantes en `features/tareas/data.ts` (`TEXTOS_PARTICIPANTE`):
- `cargando: "Cargando la participación…"`. La usa `participante-view.tsx` en `<Cargando texto={…} />`. Caso nuevo en `participantes-01e`: «DH-22: mientras carga, la participación de un alumno dice «Cargando la participación…»» (H8).
- `sinParticipaciones: "Aún no hay participaciones de este alumno."`. Es la lista vacía de «Sus participaciones». La afirman dos casos que ya existían:
  - FORO-1E42 lo busca dentro del bloque (H7);
  - FORO-1E02 «sin participar» afirma que «Todavía no participa.» sale una sola vez y que el bloque dice el texto nuevo.

### D-5 comprobado
El caso «FORO-1E47: la clase que pasa a solo lectura con el foco en el panel lo lleva a la raíz o al título, nunca a <body>» ahora afirma que el foco llega al `h1` de la clase, y pasa. El foco lo lleva `useFocoAlTituloDeLaClase` de `ClaseLayout` (§7.32).
- **Sin mutación propia:** ese gancho vive en `components/`, que está fuera de «Se toca».
- **El título** se queda como estaba; la aserción es la del `h1`.

### N-46: cada caso sin mutación propia
| Caso | Clase | Qué lo vigila |
|---|---|---|
| FORO-1E01 | Heredado y nuevo a la vez | La tabla es `TablaDeEntregas`, que vigilan `entregas-01e*`. Los textos y el destino nuevos los tumban G33 (la frase del cursor) y G21 (el foco de la fila). El enlace de cada fila lo cubren FORO-1E46 (G24) y FORO-1E23 a FORO-1E25, que lo pulsan |
| FORO-1E05 | Heredado | La regla de qué pinta el panel es `erroresDeCalificacionDeApi` (CALIFICACIONES-01c, CAL-1C y CAL-T sobre el panel de la tarea). Lo único nuevo es el aviso con `mensajeDeErrorForo`: G35 lo vigila en el camino del error de campo, y FORO-1E05 afirma el texto del foro («Ese foro ya no existe.») |
| FORO-1E06 | Heredado | `mensajeDeErrorForo` da el genérico ante un texto sin caracteres visibles. Lo vigila `traduccion-foro-01c` (FORO-1C10) |
| FORO-1E08 | Heredado | La validación local del panel reemplaza los errores en su estado (`setErrores`). Lo vigilan los casos de CH6-A14 y los del panel de 01c en la tarea, y FORO-1E40 en la tarea y en el foro |
| FORO-1E09 | Heredado | `ENTRADAS_FUERA_DE_CONTRATO` sobre `mensajeDeErrorForo` (FORO-1C10) y sobre `erroresDeCalificacionDeApi` (la tarea) |
| FORO-1E13 | Heredado | El modal pinta lo que da el servidor (CAL-1D05). El caso solo fija que una categoría con un foro se ve igual |
| FORO-1E14 | Heredado | La exportación no cambia en 01e (CAL2-B09 y las `exportacion-02b-r*`). El caso fija la columna del foro en el .xlsx |
| FORO-1E23 a FORO-1E25 y FORO-1E30 a FORO-1E32 | Redundante | La frase desaparece porque `useMarcarViejaSiQuedoEnError` marca vieja la consulta en error al salir, y TanStack Query 5.103.2 ya la deja inválida (como D29 y D30 de 01d). Sin la frase del cursor del bloque, caerían como G33 en «Participantes» |
| FORO-1E26 | Heredado | El panel sale de la espera y conserva lo escrito (`finally` de `enviar`, CAL-1C). El aviso genérico es `mensajeDeErrorForo`. G14 tumba el camino del foro |
| FORO-1E27 a FORO-1E29 | Redundante | Igual que FORO-1E23 a 1E25, en `DevolucionesDeTuMaestro`. Además, G32 tumba «Comentarios de tu maestro» entero |
| FORO-1E35 y FORO-1E51 | Heredado | `useVerMasConservandoLaLista` de 01d: un solo aviso y la lista se queda. Lo vigilan FORO-1D51 y sus mutaciones de 01d |
| FORO-1E40 | Heredado | Es el mismo mecanismo que FORO-1E08: `setErrores` en el envío local, y lo vigila CH6-A14 en la tarea |
| FORO-1E45 | Pura | Son las formas literales. Cambiar un segmento las pone en rojo; es la forma de FORO-1D41, que no lleva mutación |
| FORO-1E53 | Heredado | `errorQueRedirigeElCliente` en el gancho de calificar y en el de «Ver más», más el filtro del aviso de recarga (`useAvisoDeRecargaFallidaDe`). Los vigilan FORO-1C53 y FORO-1D53 |

### R-01e-14: hermanos y estados vecinos, uno por uno
Los tres bloques son «Comentarios de tu maestro» (`useMisDevoluciones`, con el foro como principal), «Sus participaciones» y «Comentarios de la devolución» (`useParticipacionesDeAlumno` y `useDevoluciones`, con la participante como principal).

| Estado | «Comentarios de tu maestro» | «Sus participaciones» y «Comentarios de la devolución» |
|---|---|---|
| Primera carga con un error que reemplaza la vista | caso (M-13) ×3: `404`, `403` y `VALIDACION` de `foroId`; H1, H3, H4 y H5 | caso ×10 (5 errores × 2 bloques, con `foroId` nuevo); G2 y H5 |
| Primera carga con `5xx` | caso (FORO-1E48, el texto en el bloque y sin pedir la principal) | caso ×2 |
| `404 NO_ENCONTRADO` | caso (M-13); H6 | caso ×2 |
| Servidor inconsistente | caso, que ahora afirma la lectura de más del foro (`foro === 2`); H1 y H2 | caso ×2; G1 |
| Recarga con datos que reemplaza la vista | no hay caso propio. Es el mismo efecto (`errorUpdateCount` nuevo) que la primera carga | ídem |
| «Ver más» que falla | no pide la principal por sí mismo: el gancho de 01d no avisa ante lo que reemplaza la vista, y el `errorUpdateCount` nuevo pide la principal con el mismo efecto | FORO-1E35 y FORO-1E51 (`5xx`) |
| Volver a montar con el fallo en caché | la ref nace con el `errorUpdateCount` del montaje y no pide (literal de R-01e-14, como E10b de 01d). Sin caso propio en 01e | ídem |
| Fallos seguidos | cada `errorUpdateCount` nuevo pide una vez. Sin caso propio | ídem |
| Dos bloques que fallan a la vez | no aplica: hay un solo bloque de cada uno por vista | «Sus participaciones» y «Comentarios de la devolución» piden la misma participante con `exact` y `cancelRefetch: false`, así que la segunda petición se une a la primera. Sin caso propio |
| Clase archivada | las rutas 7 y 13 a 16 son `lectura` para maestro y admin; el alumno sale por N-05. Sin caso propio | ídem |
| Códigos que redirigen | no reemplazan la vista: el bloque no pide la principal y no avisa (FORO-1E53) | FORO-1E53 |
| Cambio de foro o de alumno | `key={foro.id}` en `ForoView` (FORO-1D52) | `key` compuesta (FORO-1E52, G26) |

Los estados «sin caso propio» quedan como punto de ataque 1 del tester, como dice la verificación.

### Texto final para `docs/DESIGN.md`
Es lo que el humano autoriza: el texto de la implementación con D-1 a D-5 y DH-22 aplicados. `docs/DESIGN.md` sigue sin editar.
- **Ubicación (D-1):** la §7.34 va **después de la última viñeta de la §7.33** y antes de `## 8. Densidad por rol` (hoy, línea 947), separada por una línea en blanco.
- No repite los encabezados con que `styles/tokens-r1.ataque` corta las secciones (`### Tokens`, `### Materiales`, `### Escala`, `### Radios`, `### Bordes` y `## 5.`), no tiene tablas ni el carácter `−`.
- **D-5 está comprobado**, no supuesto. El caso «FORO-1E47: la clase que pasa a solo lectura con el foco en el panel…» ahora afirma que el foco llega al `h1` de la clase, y pasa. Lo pone `useFocoAlTituloDeLaClase` de `ClaseLayout`, que está fuera de «Se toca», así que no lo muté.
- **Una frase más que la de D-3:** al final de la subviñeta de errores sumé «Mientras carga, la vista dice «Cargando la participación…» (DH-22).». Es el otro texto de DH-22.

````markdown
### 7.34 Foro (propuesta (FORO-01))

Un foro es una actividad calificable (como una tarea, §7.20 y §7.27) en la que la clase participa por escrito.
- **La fila del foro en «Foro» (FORO-01c1):** la fila de §7.7, con dos diferencias. Al inicio del enlace va "Foro:" oculto (`rotulo`), en lugar de "Tarea:", y a la derecha, un complemento (`complemento`): para el alumno, la insignia de su estado (§7.8); para el maestro y el admin, «{n} participaciones», «1 participación» o «Sin participaciones», en `--text-small` y `--muted-foreground`. Sin `complemento` ni `rotulo`, la fila es la de §7.7. En la lista, «Crear foro» es la acción principal del maestro y del admin, y no se pinta en una clase archivada.
- **En «Actividades» (FORO-01d):** la fila del foro es la de §7.7 con "Foro:" oculto y, a la derecha, la insignia neutra «Foro» con `MessagesSquare`. Enlaza al foro. «Crear foro» (`outline`, `MessagesSquare`) va junto a «Crear tarea», que sigue siendo la única `primary`; no se pinta en una archivada. «Mover» funciona igual que el de una tarea.
- **El detalle del foro (FORO-01c2):** la composición de §7.20, con la insignia «Foro», el `h3` «Planteamiento» y la política del foro en «Detalles». Para el maestro y el admin, en la columna derecha, un panel «Participantes» (`h3`) con «Ver participantes» (`outline`, icono `Users`), también en una clase archivada (es lectura; no pide nada), y debajo las acciones del foro.
- **El panel «Participaciones» (FORO-01d):** un `Card` bajo el planteamiento, con el `h3` «Participaciones» (`tabIndex={-1}`) y «Lo que publiques aquí lo ve toda la clase.».
  - El alumno que puede participar ve «Escribe tu participación» y «Publicar participación», su acción principal. Antes del campo puede ir la nota de retraso, y si ya no puede participar, el texto de cerrado.
  - El admin ve «La administración puede leer este foro, pero no participar en él.».
- **Cada participación:** la lista va de la más antigua a la más reciente, con divisores de 1 px en `--border` (§7.25). Lleva la firma (`FirmaDelAutor`), la fecha y la hora en `--text-small` y `--muted-foreground`, «Tuya» si es propia, la insignia `warning` «Con retraso» con `Clock` (nunca solo color) y el texto plano.
- **El control de réplicas:** un solo botón que conserva el foco al cambiar de texto, con `aria-expanded`.
  - «Ver réplicas (n)» con una o más, y el conteo es el mayor entre el de la lista y lo que el bloque ya cargó.
  - «Replicar» sin réplicas, para quien puede replicar.
  - Desplegado, «Ocultar réplicas».
  - El admin, sin réplicas que leer, no ve control.
- **El bloque de réplicas:** su `h4` «Réplicas», oculto (`sr-only`, `tabIndex={-1}`), la lista ascendente con firma, fecha y hora y «Con retraso», «Ver más réplicas», y «Escribe tu réplica» con «Publicar réplica» (`outline`). El maestro replica siempre; el alumno, si puede; el admin, nunca. En una archivada no hay formulario.
- **Publicar:** lo nuevo aparece al final de lo cargado. Con páginas por cargar, al pulsar «Ver más» queda en su lugar, porque las listas se unen con la última aparición de cada fila. Una recarga antes de «Ver más» lo deja de mostrar hasta cargar más (O-01d-5).
- **«Borrar» (solo el admin, decidido por `puedeBorrar` del dato):** «Borrar» con el nombre oculto («participación de {nombre}», «réplica de {nombre}»), la confirmación en línea de §7.14 con sus textos y «Sí, borrar participación» o «Sí, borrar réplica». Al pedirla, el foco va a «Cancelar». Al borrar, va al mismo control de la vecina o a la vecina y, sin vecinas, al `h3` o al `h4` del bloque.
- **"Tu participación" (alumno):** un `Card` en la columna derecha, una región con el `h3` «Tu participación», la insignia de su estado y «Participaste el {fecha} a las {hh:mm}» («… con retraso») o «Todavía no participas.». Desde 01e, con calificación, debajo de un divisor de 1 px en `--border`: el `h4` «Calificación» con la calificación en lectura de §7.27 (y antes, «No participaste en este foro y ya está calificado.» si no participó) y el bloque «Comentarios de tu maestro» (`h4`, `tabIndex={-1}`), que solo se pide con calificación y no se pinta mientras carga ni si está vacío.
- **El foco cuando desaparece un control dentro de un bloque** (una recarga, un `409`, un `404`, la clase que pasa a solo lectura): va al encabezado de ese bloque (el `h3` «Participaciones», el `h4` «Réplicas» y, desde 01e, el `h2` «Participantes», el `h3` «Sus participaciones» y el `h3` «Comentarios de la devolución» o el `h4` «Comentarios de tu maestro»), nunca a `<body>`. La raíz de la vista queda para la vista reemplazada y para el salto a otro foro. Si la clase pasa a solo lectura con el foco en el panel de calificación, el foco sigue §7.32 (el `h1` de la clase).
- **Errores y vacío:** «Aún no hay participaciones en este foro.».
  - La primera carga fallida de cada bloque dice su texto en el bloque, sin aviso («No pudimos cargar las participaciones.», «No pudimos cargar las réplicas.», «No pudimos cargar las participaciones de este alumno.», «No pudimos cargar los comentarios de la devolución.», «No pudimos cargar los comentarios de tu maestro.»).
  - Una recarga fallida con datos conserva lo que se ve y avisa una vez por fallo.
  - Si la principal desaparece mientras se ven sus réplicas, el aviso es «Esa participación ya no existe.» y la fila sale.
  - El cursor vencido dice su frase, sin «Ver más».
- **"Participantes" (FORO-01e):** §7.26 con los textos del foro: «Volver al foro», el `h2` «Participantes» (`tabIndex={-1}`), el título del foro, «Participaron {n} de {m} alumnos.» («de 1 alumno»), la tabla de entregas con las columnas «Alumno», «Estado», «Participó» y «Acciones», «Ver participación» (`outline`, `sm`) con el nombre oculto, y «Ver más alumnos». Una recarga fallida con datos conserva la lista y avisa «No pudimos actualizar la lista de alumnos. Mostramos la última versión que tenemos.» (DH-20). Estados: error (la vista se reemplaza, como Entregas) → cargando («Cargando las participaciones…») → vacío («Aún no hay alumnos en esta clase.») → datos. Si el cursor ya no sirve, dice «La lista de alumnos cambió mientras la veías. Vuelve a abrir Participantes para verla completa.», sin «Ver más alumnos».
- **La participación de un alumno (FORO-01e):** §7.26 con «Volver a los participantes», su nombre en `h2` con su insignia, el título del foro y «Participó el {fecha} a las {hh:mm}» o «Todavía no participa.». Debajo, cada uno en su `Card`:
  - «Sus participaciones» (`h3`), lo que escribió, de lo más antiguo a lo más reciente con divisores de 1 px: la fecha y la hora, «Con retraso» (`warning`, `Clock`), «En respuesta a» con la firma de la persona a quien responde (`FirmaDelAutor`) en sus réplicas, el texto plano y «Ver más participaciones»;
  - el panel de §7.27 para el maestro, con los textos del foro («Se publica en los comentarios de la devolución.», «Podrás calificar cuando el alumno participe o cuando se cierre el foro.», «Este alumno no participó y el foro ya está cerrado.»); la calificación en lectura para el admin y en una clase archivada;
  - «Comentarios de la devolución» (`h3`), en solo lectura, con «Ver más comentarios» y, vacío, «Aún no hay comentarios de la devolución.».
  - Errores: «No encontramos a ese alumno en esta clase.», «Ese foro ya no existe.» o la falta de acceso reemplazan la vista. Una recarga fallida con datos avisa una vez por fallo «No pudimos actualizar la participación de este alumno. Mostramos la última versión que tenemos.». Si falla la recarga tras un `409` de calificar, el aviso es «No pudimos cargar la participación actual. Revisa tu conexión e inténtalo de nuevo.». La lista vacía de «Sus participaciones» dice «Aún no hay participaciones de este alumno.». Mientras carga, la vista dice «Cargando la participación…» (DH-22).
````

**Las sumas a otras secciones** (con la marca "propuesta (FORO-01)"):
- **§7.10, "Error de la página siguiente":** "La lista de «Foro» sigue a Dudas. En `features/tareas`, las listas del foro conservan la lista también ante una recarga de fondo fallida, como Entregas, y además avisan una vez por fallo: las participaciones, las réplicas, lo que escribió un alumno, las devoluciones y «Participantes» (DH-20)."
- **§7.10, "Error":** "Un bloque dentro de una vista con datos (las participaciones, las réplicas, lo que escribió un alumno, los comentarios de la devolución, «Comentarios de tu maestro») dice el error de su primera carga en su propio `MensajeError`, con un texto propio."
- **§7.14, "Lo abierto es de su clase":** suma «"Participantes" (`key` por el foro) y la participación de un alumno (`key` por el foro y el alumno juntos, como la entrega de un alumno)».
- **§7.14, nuevo párrafo, "Foco al encabezado del bloque (FORO-01d, T-02)":** "Cuando desaparece el control que tenía el foco dentro de un bloque con encabezado propio (una recarga, un `409`, un `404`, la clase en solo lectura), el foco va a ese encabezado (`tabIndex={-1}`); la raíz queda para la vista reemplazada. Lo implementa `useFocoAlEncabezadoSiSePierde` (`features/tareas/hooks.ts`)."
- **§7.14, la regla de N-28 (FORO-01c1):** "Una recarga correcta que quita la fila enfocada de «Foro» lleva el foco al `h2` de la lista."
- **§7.3 y §7.16:** "siete secciones", con «Foro» tercera.
- **§7.8:** "la insignia neutra «Foro» con `MessagesSquare`".
- **§7.22:** "la fila del foro y «Crear foro»".


### Verificación
Desde `frontend/`, una corrida a la vez.

| Comando | Última línea |
|---|---|
| `npm run lint` | sale con 0; `All matched files use Prettier code style!` y luego `> tsc -b`, sin errores |
| `npm run build` | `✓ built in 1.19s` |
| `npx vitest run src/features/tareas` | `Tests  1857 passed (1857)` (`Test Files  68 passed (68)`) |
| `npx vitest run src/features/calificaciones` | `Tests  481 passed (481)` (`Test Files  24 passed (24)`) |
| `npx vitest run src/features/clases` | `Tests  3167 passed (3167)` (`Test Files  131 passed (131)`) |
| `npx vitest run src/app src/lib src/services src/styles src/components` | `Tests  1540 passed (1540)` (`Test Files  99 passed (99)`), con C-14 y C-16 ya aplicados |

### Conteos
Con `npx vitest list` sobre las seis pruebas nuevas (`grep -a -c "^src/features/<archivo>.test.tsx >"`):
- `tareas/participantes-01e`: 34 (+1, DH-22);
- `tareas/errores-calificar-foro-01e`: 15;
- `tareas/mi-calificacion-foro-01e`: 4;
- `tareas/recuperar-participantes-01e`: 49 (+6: los 3 errores y el `NO_ENCONTRADO` de «Comentarios de tu maestro», y el `VALIDACION` de `foroId` en los 2 bloques de la participante);
- `tareas/vecinos-panel-01e`: 8;
- `calificaciones/foro-01e`: 7.

Total: **117 casos en 6 archivos**. `features/tareas` pasa de 1850 a 1857 (+7).

### `enEspera=` y C-16
- `grep -rho "enEspera=" src --include=*.tsx --exclude=*.test.tsx | wc -l` da **99**, con las mismas cifras por archivo.
- Las líneas 241 y 242 de `participante-view.tsx` no cambiaron.

### `git status --short -- frontend` contra `24916a4`
Son 26 entradas:
- 13 de producción modificadas y 3 nuevas;
- 6 pruebas nuevas;
- 2 de la lista cerrada;
- 2 `*.ataque` que aplicó el tester en la ronda 0 bis: `lib/guardas-ch4-r1.ataque.test.ts` (C-16) y `styles/clases-r1.ataque.test.ts` (C-14).

Esta corrección no suma archivos: cambia `features/tareas/data.ts`, `participante-view.tsx`, `recuperar-participantes-01e.test.tsx` y `participantes-01e.test.tsx`.


## Corrección tras la ronda 1 — FORO-01e: T-01, y docs/DESIGN.md (2026-11-17)

Archivos tocados en esta corrección:
- `features/tareas/participante-view.tsx` (producción);
- `features/tareas/recuperar-participantes-01e.test.tsx` (11 casos nuevos);
- `features/tareas/participantes-01e.test.tsx` (solo el título de FORO-1E47);
- `docs/DESIGN.md`, con la autorización del humano.

No toqué ninguna `*.ataque` ni otro archivo.

### T-01 — corregido
**Antes.** En `recargarTrasConflicto`, si la lectura del foro fallaba, la función salía temprano sin marcar como avisado el fallo de la participante. El foro daba su aviso de recarga y el gancho de recarga fallida de la participante daba otro, así que salían tres avisos con el del `409`. Además, con la vista desmontada al terminar la recarga, ningún fallo quedaba marcado, y al volver se avisaba un fallo que ya nadie había visto.

**Después** (`participante-view.tsx`, después del `Promise.all`; las dos líneas de C-16 no cambiaron de texto y quedan en las líneas 247 y 248):
- `vigente = montadoRef.current && sigueVigente(generacion)`, y `falloElForo = foroNuevo !== null && foroNuevo.isError`.
- Si falló la participante, y además falló el foro o la recarga ya no está vigente, el fallo de la participante queda marcado como avisado (`marcarComoAvisado(claveParticipante(...))`).
- Si falló el foro y la recarga ya no está vigente, el fallo del foro también queda marcado (`claveForo`).
- Con `!vigente || falloElForo`, la función termina. Si falló el foro, su aviso es el único de la recarga, como en la tarea (`entrega-de-alumno-view.tsx:110-116`).
- Lo demás sigue igual: la participante sola da DH-19 y, sin fallos, el panel se reinicia.
- El aviso de recarga fallida de la participante se activa además con `!foroReemplazaLaVista`. Así, cuando el foro reemplaza la vista, la participante no avisa.
- Nuevo import: `claveForo` de `@/services/trabajoService`.

**Los avisos, de 3 a 2:** con el foro y la participante fallando salen el del `409` y el de la recarga del foro, «No pudimos actualizar el foro. Mostramos la última versión que tenemos.». Es lo que pide §E13.7: un solo aviso de la recarga.

### Casos nuevos
Están en `src/features/tareas/recuperar-participantes-01e.test.tsx`, describe «T-01 (ronda 1) · la recarga tras un 409 de calificar con el foro y la participante». Los títulos son exactos.

**Escritos antes del remedio.** El rojo es de la corrida con el código anterior: `npx vitest run src/features/tareas/recuperar-participantes-01e.test.tsx -t "T-01"` dio `Tests  5 failed | 4 passed | 49 skipped (58)`.

| # | Título | Con el código anterior |
|---|---|---|
| 1 | «T-01: RUBRICA_MODIFICADA con el foro y la participante fallando da el aviso del 409 y uno solo de la recarga (el del foro, como la tarea); salir y volver con la relectura en vuelo no lo repite» | rojo (3 avisos) |
| 2 | «T-01: ENTREGA_NO_CALIFICABLE con el foro y la participante fallando da el aviso del 409 y uno solo de la recarga (el del foro, como la tarea); salir y volver con la relectura en vuelo no lo repite» | rojo (3 avisos) |
| 3 | «T-01: con solo el foro fallando, el aviso del 409 y el de la recarga del foro» | verde (control) |
| 4 | «T-01: con solo la participante fallando, el aviso del 409 y el de DH-19» | verde (control) |
| 5 | «T-01: sin fallos, un solo aviso y el panel se reinicia con el foco en «Calificación»» | verde (control) |
| 6 | «T-01: si el foro responde 404 en la recarga (la vista se reemplaza) y la participante 503, solo queda el aviso del 409 y el mensaje de la vista» | rojo |
| 7 | «T-01: si la participante responde 404 ALUMNO_NO_ENCONTRADO y el foro 503, la vista se reemplaza y solo queda el aviso del 409» | verde (control) |
| 8 | «T-01: con un código que redirige en la lectura del foro y la participante 503, ningún aviso de recarga» | rojo |
| 9 | «T-01: con la vista desmontada durante la recarga, las dos lecturas fallan y al volver (con la relectura en vuelo) no sale ningún aviso de recarga» | rojo |

**Escritos después del remedio.** Las mutaciones T3 y T4 sobrevivían con los 9 casos anteriores, así que estos dos casos vigilan dos ramas que no tenían caso. Pasan con el remedio, y su rojo es el de la mutación de la rama que vigilan (T3 y T4, abajo).

| # | Título |
|---|---|
| 10 | «T-01: con la vista desmontada durante la recarga y solo la participante fallando, al volver (con la relectura en vuelo) no sale ningún aviso de recarga» |
| 11 | «T-01: una recarga de fondo en que el foro responde 404 (la vista se reemplaza) y después la participante 503 no da el aviso de la participante» |

**Con el remedio:**
- `npx vitest run src/features/tareas/recuperar-participantes-01e.test.tsx -t "T-01"` da `Tests  11 passed | 49 skipped (60)`.
- ATQ-FORO-148 del tester pasa: lo cubre la suite de `tareas`, abajo.

**Detalle del manager.** El título de FORO-1E47 en `participantes-01e.test.tsx` ahora dice «FORO-1E47: la clase que pasa a solo lectura con el foco en el panel lo lleva al título de la clase (el h1, §7.32), nunca a <body>».

### Mutaciones
Se hicieron con copia previa, ancla única (comprobada con `--anclas`), restauración y `filecmp.cmp(..., shallow=False)`. El script es `scratchpad/scripts/mutaciones01e_t01.py`. Las corridas son `npx vitest run <archivo> -t <filtro>`, con un filtro sin `|`, porque el `|` se rompe en `npx.cmd`. La primera tanda con `"T-01|ATQ-FORO-148"` no corrió (T1 y T5), así que se repitió por separado.

| Mutación (en `participante-view.tsx`) | Resultado | Restaurado |
|---|---|---|
| T1: `(falloElForo \|\| !vigente)` → `!vigente`, sin marcar la participante cuando falla el foro | caen casos 1, 2 y 8 (`Tests  3 failed \| 8 passed \| 49 skipped (60)`) y ATQ-FORO-148 (`Tests  1 failed \| 2 passed \| 6 skipped (9)`) | `cmp igual: True` |
| T2: quitar `if (falloElForo && !vigente) marcarComoAvisado(claveForo(...))` | cae el caso 9 (`1 failed \| 10 passed`) | True |
| T3: `(falloElForo \|\| !vigente)` → `falloElForo`, sin marcar la participante con la vista desmontada | cae el caso 10 (`1 failed \| 10 passed`) | True |
| T4: quitar `!foroReemplazaLaVista &&` del aviso de la participante | cae el caso 11 (`1 failed \| 10 passed`) | True |
| T5: `if (!vigente \|\| falloElForo) return` → `if (!vigente) return` | caen casos 1, 2, 6 y 8 (`4 failed \| 7 passed`) y ATQ-FORO-148 (`1 failed \| 2 passed`) | True |

### Hermanos y estados vecinos, uno por uno
1. **`ENTREGA_NO_CALIFICABLE`.** Aplica, y está aplicado: es la misma rama (`recargaLaTareaTrasConflicto`). Caso 2; mutaciones T1 y T5.
2. **Los otros `409` de calificar.**
   - `VERSION_DESACTUALIZADA` y los que no recargan el foro: no aplica. El foro no se pide (`Promise.resolve(null)`, C-16), así que solo hay una lectura y un aviso posible (DH-19). Siguen cubiertos por los casos de 01e, ATQ-FORO-148 y sus controles.
   - `CLASE_ARCHIVADA`: no aplica, porque no recarga; es el punto 6.
3. **Solo el foro, solo la participante, ambos, ninguno.** Aplica, y está aplicado: casos 3, 4, 1 y 2, y 5. Con solo el foro, su aviso es el único; con solo la participante, DH-19; sin fallos, el panel se reinicia con el foco en «Calificación».
4. **Un error del foro que reemplaza la vista, y uno de la participante que la reemplaza.** Aplica, y está aplicado.
   - Foro 404 con la participante 503: caso 6 (T5), y el mismo estado en una recarga de fondo, caso 11 (T4).
   - Participante 404 `ALUMNO_NO_ENCONTRADO` con el foro 503: caso 7. La salida por `falloElForo` marca la participante y no hay DH-19.
5. **Un código con el que `apiClient` redirige.** Aplica, y está aplicado: caso 8 (T1 y T5). El foro con `403 ACCESO_RESTRINGIDO` y la participante 503 no dan ningún aviso de recarga. El aviso del foro ya no avisa los códigos que redirigen, y la participante queda marcada.
6. **Clase archivada y vista desmontada.**
   - Vista desmontada: aplica, y está aplicado. Casos 9 (los dos fallan; T2) y 10 (solo la participante; T3).
   - Clase archivada: aplica por el mismo camino, `sigueVigente(generacion)` en falso, que marca lo que haya fallado y no avisa. No tiene caso propio con el `409` de calificar y la clase archivándose en vuelo. El camino es el mismo `!vigente` que vigila el caso 9.
7. **La memoria de las dos claves.**
   - Volver a montar con el fallo en caché: casos 1, 2, 9 y 10. Salen y vuelven con la relectura en vuelo y no repiten el aviso.
   - El siguiente fallo de fondo sí avisa: lo vigila FORO-1E33 («el siguiente fallo vuelve a avisar»), que sigue verde. La marca es por `errorUpdateCount`, así que un fallo nuevo tiene otra marca.
   - StrictMode: no aplica un remedio nuevo. La marca vive en un `WeakMap` por consulta (no en estado del componente) y es idempotente, así que marcarla dos veces es igual que una. Se escribe en el manejador asíncrono, no en un efecto que StrictMode duplique.
8. **El mismo patrón en otras vistas.**
   - La tarea (`entrega-de-alumno-view.tsx`, No se toca): ya da 2 avisos (el del `409` y el de la recarga de la tarea) y es el modelo del remedio. No la toqué.
   - `editar-foro-view.tsx`: tras un `409` solo vuelve a pedir el foro (una sola lectura), así que no tiene doble fallo. No aplica, y no lo toqué.

### La fila de la matriz que cambia
Es la de la participación de un alumno. Disparador: la recarga tras un `409` `RUBRICA_MODIFICADA` o `ENTREGA_NO_CALIFICABLE`.

| Estado | Antes | Después |
|---|---|---|
| Foro y participante fallan (5xx o red) | 3 avisos: el `409`, el del foro y el de la participante | 2: el `409` y el del foro; la participante queda avisada |
| Foro 404 y participante 5xx | la vista se reemplaza y sale además el aviso de la participante | la vista se reemplaza con solo el aviso del `409` |
| El foro redirige y la participante 5xx | aviso de la participante | ninguno de recarga |
| Vista desmontada al terminar | los fallos quedaban sin marcar y al volver avisaban | los dos quedan marcados; al volver, ninguno |

El foco no cambia: si la vista se reemplaza, a su raíz; si no, se queda donde estaba.

### docs/DESIGN.md
Lo apliqué con `Edit`, sin reescribirlo. Antes: 1003 líneas, `c340ccaa…`.

| Lugar | Línea | Qué |
|---|---|---|
| §7.8 | 550 (más la línea en blanco 549) | E-2, el párrafo «**Insignia «Foro» (propuesta (FORO-01)):** …», literal, después del de «Tarea» |
| §7.10, viñeta «Error» | 595 | la frase «Un bloque dentro de una vista con datos … con un texto propio.», como última subviñeta, seguida de «(propuesta (FORO-01))» |
| §7.10, «Error de la página siguiente» | 596 | al final, «La lista de «Foro» sigue a Dudas. En `features/tareas`, … «Participantes» (DH-20).», seguida de «(propuesta (FORO-01))» |
| §7.14, «Lo abierto es de su clase» | 669 | al final, la regla de N-28 «Una recarga correcta que quita la fila enfocada de «Foro» lleva el foco al `h2` de la lista.», seguida de «(propuesta (FORO-01))» |
| §7.14 | 671 | el párrafo nuevo de E-4, «**Foco al encabezado del bloque (FORO-01d, T-02; propuesta (FORO-01)):** …», literal |
| §7.16 | 692 | E-1, la subviñeta «**Foro:**» reemplazada, literal |
| §7.22 | 789 | E-3, la viñeta «**Foro (propuesta (FORO-01)):** …», literal, después de «**Tarea:**» |
| §7.34 | 953-984 | el bloque de «Texto final para `docs/DESIGN.md`», después de la última viñeta de §7.33 y antes de `## 8. Densidad por rol`, separado por una línea en blanco |

§7.3 no cambia (E-1).

**Lo que no apliqué, porque no cuadra:** la suma de D-4 a «Lo abierto es de su clase», «"Participantes" (`key` por el foro) y la participación de un alumno (`key` por el foro y el alumno juntos, como la entrega de un alumno)». Es una frase nominal sin verbo, y el párrafo no tiene una enumeración de vistas o de `key` donde quepa literal. Su lista es «la clase, tarea, alumno o recurso en que se abrió». Para insertarla habría que agregar palabras propias (por ejemplo, «En el foro, lo cumplen …»), y la instrucción es no adaptarla. Pido el texto literal con su lugar.

**Forma de la marca en §7.10 y en la regla de N-28:** las frases van literales y la marca va detrás, como «(propuesta (FORO-01))», sin cambiar el punto final de la frase. Si el manager la prefiere en otra forma, es un cambio de forma.

**El único cambio en §7.34 frente al bloque autorizado** (por T-01, declarado; un `diff` del bloque contra `resumen-programador.md:2693-2723` da una sola línea distinta, la 31 del bloque):
- Antes: «Si falla la recarga tras un `409` de calificar, el aviso es «No pudimos cargar la participación actual. Revisa tu conexión e inténtalo de nuevo.».»
- Después: «Si falla la recarga tras un `409` de calificar, el aviso es «No pudimos cargar la participación actual. Revisa tu conexión e inténtalo de nuevo.»; si falla la del foro (sola o con la de la participación), el único aviso de la recarga es el del foro, «No pudimos actualizar el foro. Mostramos la última versión que tenemos.» (T-01).»
- El texto del foro es el de `features/tareas/data.ts:282` (`avisoRecargaFallida` del foro).

**Las cifras del archivo:**
- `git diff --stat -- docs/DESIGN.md`: `docs/DESIGN.md | 44 +++++++++++++++++++++++++++++++++++++++++---` y `1 file changed, 41 insertions(+), 3 deletions(-)`.
- Después: **1041 líneas**, SHA-256 `871eb399e8f36049bc110bb3bb280bc558efdd6deb33ee28048310310af934b0`.
- `npx vitest run src/styles` da `Tests  176 passed (176)` (`Test Files  3 passed (3)`).

### Verificación
Desde `frontend/`, una corrida a la vez y nadie más corría nada.

| Comando | Última línea |
|---|---|
| `npm run lint` | salida 0; `All matched files use Prettier code style!` y `tsc -b` sin errores |
| `npm run build` | `✓ built in 1.21s` (salida 0) |
| `npx vitest run src/features/tareas` | `Tests  1877 passed (1877)`, `Test Files  69 passed (69)` |
| `npx vitest run src/features/calificaciones` | `Tests  481 passed (481)`, `Test Files  24 passed (24)` |
| `npx vitest run src/features/clases` | `Tests  3167 passed (3167)`, `Test Files  131 passed (131)` |
| `npx vitest run src/app src/lib src/services src/styles src/components` | `Tests  1540 passed (1540)`, `Test Files  99 passed (99)` |
| `npx vitest run src/styles` | `Tests  176 passed (176)` |

`features/tareas` pasa de 1857 a 1877 (+20). Son 11 casos de T-01 y 9 de `foros-01e-r1.ataque.test.tsx`, que es un archivo nuevo del tester (69 archivos, antes 68).

### Conteos
`npx vitest list src/features/tareas src/features/calificaciones`, contado con `grep -ac "^src/features/<ruta>.test.tsx >"`:
- `tareas/participantes-01e`: 34;
- `tareas/errores-calificar-foro-01e`: 15;
- `tareas/mi-calificacion-foro-01e`: 4;
- `tareas/recuperar-participantes-01e`: **60** (antes 49; +11 de T-01, y `grep -ac "T-01:"` sobre sus líneas da 11);
- `tareas/vecinos-panel-01e`: 8;
- `calificaciones/foro-01e`: 7.

Total: **128 casos en 6 archivos** (antes 117).

### `enEspera=` y C-16
- `grep -rl "enEspera=" frontend/src --include=*.tsx | grep -v "\.test\." | xargs grep -o "enEspera=" | wc -l` da **99**.
- C-16: `consulta.refetch(),` y `recargaLaTareaTrasConflicto(error) ? foro.refetch() : Promise.resolve(null),` siguen con su texto, en las líneas 247 y 248 de `participante-view.tsx`.

### `git status --short -- frontend docs/DESIGN.md`
Son 28 entradas:
- `docs/DESIGN.md` (M);
- las 26 de antes en `frontend/`;
- `frontend/src/features/tareas/foros-01e-r1.ataque.test.tsx` (`??`), del tester en la ronda 1.

Esta corrección no suma archivos propios.
