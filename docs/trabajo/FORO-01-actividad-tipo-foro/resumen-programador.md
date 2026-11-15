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
