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
