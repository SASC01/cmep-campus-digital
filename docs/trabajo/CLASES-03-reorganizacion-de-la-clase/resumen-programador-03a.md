# Resumen del programador — CLASES-03a

> **Nota de transcripción (orquestador, 2026-10-28).** Las instrucciones de entorno del programador le impidieron escribir este archivo, así que entregó el resumen como texto y el orquestador lo transcribió tal cual, sin cambiar contenido, según la regla "Transcripción con cotejo" de `AGENTS.md`. Cotejo en `aprobacion.md`.

```
Plan: docs/trabajo/CLASES-03-reorganizacion-de-la-clase/plan.md (SHA-256 ba4bd5ec…cb8b, 1000 líneas, Enmiendas 1 y 2)
Pasos completados: 8 de 8 de 03a; verificación final con PARADA (Hook timed out repetidos).
```

## PARADA: «Hook timed out» en las dos corridas
**Comando:** `npm run test` desde `backend/`. Salidas en el scratchpad: `test-03a-b.txt` (corrida 1) y `test-03a-c.txt` (corrida 2).

**Corrida 1** (`Duration 555.67s`): `Test Files  11 failed | 210 passed (221)` · `Tests  3 failed | 2520 passed | 167 skipped (2690)`.
- 8 «Hook timed out in 10000ms» en `beforeAll(construirApp)`:
  - `admin-correo.integracion:19`
  - `admin-restablecimiento.integracion:20`
  - `archivos-d-r1.ataque:87`
  - `cuentas-03a-r1.ataque:43`
  - `entregas.integracion:65`
  - `recursos-autorizacion.integracion:52`
  - `registro-maestro.integracion:22`
  - `tareas-01a-r1.ataque:54`
- Además, 3 casos fallaron por tiempo:
  - CAL-T-24 de `calificaciones-01a-r2.ataque` (15 s)
  - PR-A15h de `clases-autorizacion.integracion` (15 s)
  - «sin token 401; …» de `gestion-02a-r1.ataque`

**Corrida 2** (`Duration 463.51s`): `Test Files  3 failed | 218 passed (221)` · `Tests  1 failed | 2668 passed | 21 skipped (2690)`.
- 2 «Hook timed out»: `muro-admin.integracion:62` y `registro-maestro.integracion:22`.
- CAL-T-24 volvió a fallar con «Test timed out in 15000ms».

**En aislamiento pasan:** `npx vitest run test/calificaciones-01a-r2.ataque.test.ts test/muro-admin.integracion.test.ts test/registro-maestro.integracion.test.ts` dio `Test Files  3 passed (3)` · `Tests  28 passed (28)`.

**Antecedentes y entorno:**
- Ya hubo 22 «Hook timed out» en la corrida que hice antes de escribir las pruebas nuevas. Fallan siempre por tiempo y nunca por aserción, y los archivos cambian de una corrida a otra (solo `registro-maestro` se repite).
- No corrí ninguna otra suite a la vez. Sí estaban activos en el equipo procesos que no arranqué y no toqué: Chrome, ChatGPT/Codex, VS Code y Docker Desktop.
- No los doy por carga, como pediste. El orquestador o el humano deciden si se corre de nuevo con el equipo libre.

## Corregido en este tramo (E6)
Es la fila de la lista cerrada de la Enmienda 2. Diff completo de `backend/test/bloqueo-usuario.integracion.test.ts`:
```
@@ -685,7 +685,8 @@
   // CALIFICACIONES-01b: calificaciones.ts (los agregados del gradebook y de "Mis calificaciones").
-  it("E6: solo salud.ts, …, tareas.ts, entregas.ts y calificaciones.ts usan SQL etiquetado en adapters/db", async () => {
+  // CLASES-03a (§D-3.7): recursos.ts (el FOR NO KEY UPDATE de la fila del recurso al editarlo).
+  it("E6: solo salud.ts, …, tareas.ts, entregas.ts, calificaciones.ts y recursos.ts usan SQL etiquetado en adapters/db", async () => {
@@ -712,6 +713,7 @@
       "publicaciones.ts",
+      "recursos.ts",
       "referencias.ts",
```

## Verificación
| Qué | Comando | Última línea |
|---|---|---|
| build de `shared/` | `npm run build` | `> tsc -p tsconfig.json` (exit 0) |
| lint del backend | `npm run lint` | `> tsc -p tsconfig.json --noEmit && tsc -p tsconfig.test.json` (exit 0) |
| prisma validate | `npx prisma validate` | `The schema at prisma\schema.prisma is valid 🚀` |
| build del backend | `npm run build` | `> tsc -p tsconfig.json` (exit 0) |
| test del backend | `npm run test` | dos corridas, arriba; no verde |

## Conteos
- `npx vitest list` desde `backend/` → `list-03a.txt`: 2690 casos (`grep -cE "^(test|src)/"`) en 221 archivos (`sed 's/ > .*//' | sort -u | wc -l`).
- Antes había 216 archivos y 2617 casos; son +5 archivos y +73 casos (`grep -c CL3-A` da 73).
- Por archivo (`grep -c "^<archivo> >"`):
  - `src/core/recursos.test.ts`: 11
  - `test/migracion-clases-03a.integracion.test.ts`: 6
  - `test/recursos.integracion.test.ts`: 29
  - `test/recursos-autorizacion.integracion.test.ts`: 15
  - `test/recursos-filtros.integracion.test.ts`: 12
- En la corrida 2 pasaron los cinco archivos nuevos, C-1, C-2, E6 y `lecturas-consistentes`: los únicos archivos que fallaron son los tres de la lista de arriba.

## Migración final
Carpeta `backend/prisma/migrations/20261028165322_clases_03_recursos/`; `migration.sql` con SHA-256 `a2e81df7fc75e044e7232da0095472b1f15777a1c3f744a1ac3d5d0de5430e6f`.
- La parte generada por `--create-only` coincidió línea por línea con lo de `migrate diff`.
- El texto es exactamente el que propuse: enum `bloque_recurso`, el `ALTER TABLE` con `bloque` y `version`, el `UPDATE` del reparto con su comentario, los `CHECK` `publicaciones_bloque_solo_material` y `publicaciones_version_no_negativa` con su comentario, y los índices `publicaciones_clase_id_tipo_tema_id_creado_en_id_idx` y `publicaciones_clase_id_bloque_tema_id_creado_en_id_idx`.
- Está aplicada en `campus_dev` (127.0.0.1:5433) con `prisma migrate dev` y después corrí `prisma generate`.

## Archivos
**Creados:**
- `shared/src/recursos.ts`
- `backend/src/core/recursos.ts` y `backend/src/core/recursos.test.ts`
- `backend/src/adapters/db/recursos.ts`
- `backend/src/handlers/clases/recursos.ts`
- la carpeta de la migración
- `backend/test/migracion-clases-03a.integracion.test.ts`, `recursos.integracion.test.ts`, `recursos-autorizacion.integracion.test.ts` y `recursos-filtros.integracion.test.ts`

**Modificados:**
- `shared/src/clases.ts`, `tareas.ts` e `index.ts`
- `backend/prisma/schema.prisma`
- `backend/src/adapters/db/index.ts`, `publicaciones.ts`, `tareas.ts` y `temas.ts`
- `backend/src/app.ts`
- `backend/src/handlers/clases/muro.ts`, `handlers/tareas/tareas.ts` y `handlers/tareas/temas.ts`
- `backend/src/adapters/README.md` y `handlers/README.md`
- De la lista cerrada: `backend/test/ayudas-tareas.ts`, `lecturas-consistentes.integracion.test.ts` (`:738`, gana `actor`) y `bloqueo-usuario.integracion.test.ts` (E6)

Ninguna `*.ataque` tocada. Las dos `*.ataque` modificadas que muestra el árbol (C-1 y C-2) son del tester.

## Pruebas requeridas › 03a
- **CL3-A01** (`test/migracion-clases-03a.integracion.test.ts`):
  - «CL3-A01: el material del admin queda en aprendizaje, el del maestro en docente, anuncio y tarea sin bloque; actualizado_en no cambia y version es 0 en todas»
  - «CL3-A01: en el esquema migrado existen los dos CHECK nuevos, validados»
- **CL3-A02** (mismo archivo):
  - «CL3-A02: un anuncio o una tarea con bloque se rechaza con publicaciones_bloque_solo_material»
  - «CL3-A02: un material con bloque nulo se acepta (DH-02 a) y uno con bloque también»
  - «CL3-A02: una versión de -1 se rechaza con publicaciones_version_no_negativa»
- **CL3-A03** (mismo archivo): «CL3-A03: los dos índices nuevos existen con sus columnas y su orden»
- **CL3-A04** (`src/core/recursos.test.ts`):
  - «CL3-A04: el admin publica en aprendizaje y un maestro en docente»
  - «CL3-A04: con un estudiante lanza ERROR_INTERNO (500), nunca un bloque por defecto»
  - «CL3-A04: el bloque guardado manda sobre el rol del autor»
  - «CL3-A04: con el bloque nulo, la regla del reparto de la migración (admin aprendizaje, los demás docente)»
  - «CL3-A04: tabla completa actor × autor × bloque» (editar y borrar)
  - «CL3-A04: con el bloque nulo sigue el bloque efectivo del autor» (editar, borrar y mover)
  - «CL3-A04: con el bloque que da bloqueAlPublicar al autor, coincide con puedeBorrar en todas las combinaciones»
  - «CL3-A04: tabla completa actor × bloque; un estudiante nunca»
- **CL3-A05** (`test/recursos.integracion.test.ts`):
  - «CL3-A05: un maestro publica en docente y el admin en aprendizaje (en la base y en GET …/recursos); un anuncio queda sin bloque»
  - «CL3-A05: la respuesta de POST no cambia de forma»
  - «CL3-A05: MATERIAL_CREADO se encola una vez y, si la publicación falla, no queda ni el material ni el trabajo»
  - «CL3-A05: ningún material publicado por la API queda con bloque nulo»
  - «CL3-A05: crearPublicacion llamada sin bloque deja el material con bloque nulo, como antes»
- **CL3-A06** (`test/recursos-filtros.integracion.test.ts`):
  - «CL3-A06: con tipo=anuncio solo salen los anuncios, del más reciente al más antiguo, también al estudiante»
  - «CL3-A06: con tipo=anuncio, la página sigue con el cursor de un anuncio»
  - «CL3-A06: un cursor que es un material o una tarea responde 400 «cursor: no es válido»»
  - «CL3-A06: tipo=material, otro valor o el parámetro repetido responden 400 VALIDACION»
  - «CL3-A06: sin tipo, la lista de hoy: anuncios, materiales y tareas»
- **CL3-A07** (mismo archivo):
  - «CL3-A07: con seccion=actividades solo salen tareas, con la entrega del alumno»
  - «CL3-A07: un cursor que es un material responde 400 «cursor: no es válido»»
  - «CL3-A07: seccion=otra o repetida responde 400 VALIDACION»
  - «CL3-A07: sin seccion, lo de hoy: materiales y tareas»
- **CL3-A08** (mismo archivo):
  - «CL3-A08: con cada sección salen los mismos temas en el mismo orden y los conteos cuentan solo lo de la sección»
  - «CL3-A08: un material con bloque nulo no cuenta en ninguna sección de recursos y sí en el total; sin seccion, el total de hoy»
  - «CL3-A08: seccion=otra o repetida responde 400 VALIDACION»
- **CL3-A09** (`test/recursos-autorizacion.integracion.test.ts`):
  - «CL3-A09 y CL3-A11: cada ruta, sin sesión, responde 401 NO_AUTENTICADO»
  - «… con cambio de contraseña pendiente, responde 403 CAMBIO_DE_CONTRASENA_REQUERIDO»
  - «… con un alumno restringido inscrito, responde 403 ACCESO_RESTRINGIDO»
  - «… en una clase ajena (maestro de otra clase y, en la lista, el alumno no inscrito) o inexistente, responde 403 SIN_ACCESO_A_LA_CLASE, igual»
  - «… en cada negación, los recursos y sus archivos quedan como estaban»
  - «… cada ruta responde su éxito al maestro de la clase y al admin, sin estadoPago, accesoRestringido, email ni rol; la lista tampoco lleva version»
  - «CL3-A09: el estudiante inscrito ve los dos bloques, sin estadoPago, accesoRestringido, email, rol ni version»
- **CL3-A10** (`test/recursos.integracion.test.ts`):
  - «CL3-A10: filtra por bloque y por tema («sin-tema» y un id) y ordena por creado_en DESC, id DESC»
  - «CL3-A10: pagina con el cursor de la misma lista»
  - «CL3-A10: los adjuntos salen con vista previa (imagen) y sin ella (PDF), y el conteo de comentarios»
  - «CL3-A10: puedeEditar, puedeBorrar y puedeMover para el admin, el autor maestro, otro maestro y el estudiante en los dos bloques»
  - «CL3-A10: los materiales con bloque nulo no salen en ningún bloque»
  - «CL3-A10: bloque ausente, otro valor o repetido, y tema ausente, responden 400 VALIDACION»
  - «CL3-A10: un tema de otra clase o inexistente responde 404 TEMA_NO_ENCONTRADO»
  - «CL3-A10: un cursor de otro bloque, de otro tema, de otra clase o inexistente responde 400 con el mismo texto»
  - «CL3-A10: un cursor que se borra entre su comprobación y la página no deja la página vacía (instantánea única)»
- **CL3-A11** (`test/recursos-autorizacion.integracion.test.ts`):
  - los casos «CL3-A09 y CL3-A11» de arriba
  - «CL3-A11: GET y PUT …/recursos/:recursoId responden 403 ROL_NO_PERMITIDO al estudiante inscrito»
  - «CL3-A11: el maestro de la clase y el admin reciben el recurso con version y tema»
  - «CL3-A11: el id de un anuncio, de una tarea o de un material de otra clase responde 404 RECURSO_NO_ENCONTRADO, igual que uno inexistente»
  - «CL3-A11: un recursoId que no es UUID responde 400 VALIDACION»
- **CL3-A12** (mismo archivo):
  - «CL3-A12: el autor maestro edita su recurso del docente; otro maestro y el admin reciben 403 EDICION_NO_PERMITIDA sin cambiar título, versión ni archivos»
  - «CL3-A12: el admin edita un recurso de aprendizaje; un maestro de la clase recibe 403 sin cambiar nada»
  - «CL3-A12: un material con bloque nulo sigue el bloque efectivo del rol de su autor»
- **CL3-A13** (`test/recursos.integracion.test.ts`):
  - «CL3-A13: con una versión vieja responde 409 RECURSO_MODIFICADO sin escribir»
  - «CL3-A13: dos PUT simultáneos con la misma versión dan un 200 y un 409» (retiene la fila con `formadasDetrasDe`, `timeout: 30_000`)
  - «CL3-A13: tras mover el recurso de tema, el PUT con la versión anterior responde 409»
- **CL3-A14** (mismo archivo):
  - «CL3-A14: cambia título, descripción (normalizada) y tema, y la versión sube 1»
  - «CL3-A14: un tema de otra clase o ya borrado responde 404 TEMA_NO_ENCONTRADO sin escribir»
  - «CL3-A14: archivos: conserva, quita (descartado sin publicación) y agrega (confirmado, comprobado en el almacén)»
  - «CL3-A14: un archivo ajeno o de otro recurso responde 400 ARCHIVO_INVALIDO sin escribir»
  - «CL3-A14: más de 5 archivos, título vacío, de invisibles o de 201, versión ausente o negativa y la clave temaId ausente responden 400 VALIDACION»
- **CL3-A15** (mismo archivo):
  - «CL3-A15: el admin borra cualquiera y el autor maestro el suyo del docente»
  - «CL3-A15: un maestro sobre el de otro maestro o uno de aprendizaje (con bloque o nulo del admin) recibe 403 BORRADO_NO_PERMITIDO sin borrar»
  - «CL3-A15: un anuncio sigue la regla de hoy (otro maestro no; el admin sí)»
- **CL3-A16** (mismo archivo):
  - «CL3-A16: un maestro sobre un recurso de aprendizaje recibe 403 MOVER_NO_PERMITIDO sin cambiar el tema ni la versión»
  - «CL3-A16: el admin mueve uno de aprendizaje y otro maestro mueve el del docente de un maestro; la versión sube 1»
  - «CL3-A16: una tarea sube tareas.version y no publicaciones.version; un anuncio responde 409 ANUNCIO_SIN_TEMA»
- **CL3-A17** (mismo archivo): «CL3-A17: en un recurso de cada bloque se listan, se comentan y se borran comentarios»
- **CL3-A18**:
  - `test/recursos-autorizacion.integracion.test.ts`: «CL3-A18: la API arranca con la guarda onRoute y existen GET, HEAD y PUT de las rutas de recursos, todas protegidas»
  - `test/sesiones-y-cadena.ataque.test.ts`: el caso C-1 del tester

## Condiciones de la Enmienda 2
- El SQL crudo nuevo vive solo en `adapters/db/recursos.ts`.
- Los comentarios nuevos de `app.ts` (ninguno), `adapters/db/tareas.ts` e `index.ts` (ninguno) no nombran las palabras que vigilan CAL-1A18 y CAL-1B08.
- La migración no tiene `DO $$` ni los sufijos vigilados.
- Las pruebas nuevas no usan `LOCK TABLE`; las dos transacciones que retienen filas llevan `timeout: 30_000`.
- Las fechas de orden son instantes fijos: no hay fechas relativas al reloj que comparar.

## Desviaciones
1. `editarRecurso` y `leerRecurso` devuelven `null` y el handler responde `404 RECURSO_NO_ENCONTRADO`, igual que en las tareas.
2. Los parámetros opcionales se declaran `tipo?: "anuncio" | undefined` y `seccion?: "actividades" | undefined`, por `exactOptionalPropertyTypes`.
3. `leerRecurso` y `editarRecurso` aceptan un material con bloque nulo usando su `bloqueEfectivo`; la lista no lo muestra.
4. La descripción de `editarRecursoSchema` reutiliza la del material (`crearPublicacionSchema.options[1].shape.texto`).
5. La ayuda de retención de fila de CL3-A13 vive dentro de `recursos.integracion.test.ts`, con el mismo método que `tareas-version.integracion.test.ts`, porque `conFilaRetenida` no admite `publicaciones`.
6. Las ayudas de gancho de CL3-A10 (`ejecutorEspiado`, `unaVezDespuesDe`) las importé de `ayudas-gradebook.ts`.

## Pendiente
- Que la suite completa del backend corra en verde. Hoy falla solo por tiempos y queda para la decisión del orquestador o del humano.
- Fuera de alcance: el backend usa el `hookTimeout` por defecto de Vitest (10 s). CHORE-03 solo subió el del frontend.
