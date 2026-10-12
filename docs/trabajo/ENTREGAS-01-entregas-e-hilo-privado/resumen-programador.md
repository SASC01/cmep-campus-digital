# Resumen del programador — ENTREGAS-01a — Implementación (detenida en PARADA PA-02/PA-03)

Plan: `docs/trabajo/ENTREGAS-01-entregas-e-hilo-privado/plan.md` (LISTO, Enmiendas 1 a 3). Base `<R>` = `dd8edcb`, rama `feat/entregas`. Fecha: 2026-10-11.

## Estado: PARADA en el paso 5 (pruebas normales fuera de la lista cerrada)

Al sumar `requiereAdjuntos` a `DatosDeTarea` (`adapters/db/tareas.ts`; §D-2.2: "`crearTarea` y `editarTarea` lo guardan"), `tsc -p tsconfig.test.json` deja de compilar dos llamadas de pruebas normales del backend que **no están** en la lista cerrada del programador. Además, una tercera, del frontend, va a caer por la misma razón en cuanto el estado del formulario lleve "Cómo se entrega". No toqué ninguna.

| # | Prueba | Qué cae | Por qué no está en la lista cerrada |
|---|---|---|---|
| 1 | `backend/test/tareas.integracion.test.ts:702`, ayudante `sembrar()` del `describe` "reversión con la transacción de los trabajos de pg-boss (PR-1B13)" | `crearTarea({ … })` sin `requiereAdjuntos` → TS2345 | Llama a `crearTarea`: no edita ni es un doble de `TareaDetalle`. Lo usan dos casos que editan ("editar: si falla el encolado del recordatorio nuevo, …" y "editar: si falla la cancelación del recordatorio viejo, …", que sí están en la lista por `:761` y `:852`) y uno que no edita ("borrar: si falla la cancelación de TAREA_CREADA, …"). |
| 2 | `backend/test/tareas.integracion.test.ts:807`, caso "crear: si falla el encolado de RECORDATORIO_24H, no queda la tarea ni TAREA_CREADA" | El mismo TS2345 | Crea, no edita. |
| 3 | `frontend/src/features/tareas/lib.test.ts:29`, doble `estadoValido(): EstadoDelFormulario` | Con "Cómo se entrega" en `EstadoDelFormulario` (§D-8.1, igual que `aceptaTardias`), el doble no compila en `tsc -b` | Es un doble de `EstadoDelFormulario`, no de `TareaDetalle`. El inventario del tester (`reporte-tester.md`, "Pruebas normales que 01a rompe…") nombra `lib.test.ts` solo por `tareaDeEjemplo: TareaDetalle`. |

- **El cambio que haría falta en las tres es mecánico:** sumar `requiereAdjuntos: true` (el valor por defecto de la columna y del esquema), sin tocar ninguna aserción ni ningún título. En el backend, además, `datosDeEdicion` necesita `version`, pero eso ya está en la lista (`:761` y `:852`).
- **Lo que no hice para esquivar la PARADA:** no dejé `requiereAdjuntos` opcional en `crearTarea`, ni lo saqué de `EstadoDelFormulario`, solo para que esas pruebas compilen. Sería relajar un tipo para que algo compile (está prohibido) y me apartaría de §D-2.2 y §D-8.1.
- **Qué pido:** que el orquestador sume estas tres a la lista cerrada de 01a ("sumar `requiereAdjuntos: true`, sin cambiar aserciones"), o que el arquitecto decida otra cosa. Con eso sigo desde el paso 5.
- **Por qué no salió en el inventario:** el tester buscó las llamadas a `editarTarea` y los dobles de `TareaDetalle`, pero `DatosDeTarea` lo comparten crear y editar, y `EstadoDelFormulario` es otro tipo.
- Busqué más usuarios de los tipos que cambian (`EstadoDelFormulario`, `DatosDeTarea`, `crearTarea(`, `editarTarea(`) en `backend/src`, `backend/test` y `frontend/src`. Solo aparecen los archivos de producción del plan, `backend/test/tareas.integracion.test.ts` y `frontend/src/features/tareas/lib.test.ts`. No encontré otra prueba normal afectada.

## Pasos (1 a 10)

| Paso | Estado | Qué se hizo | Archivos |
|---|---|---|---|
| 1 | Hecho | `requiereAdjuntos` en `crearTareaSchema` (`.default(true)`, mensaje "Elige cómo se entrega la tarea") y en `tareaDetalleSchema`. `version` en `tareaDetalleSchema`. `editarTareaSchema = crearTareaSchema.extend({ version })` (entero, ≥ 0). `TAREA_MODIFICADA` en `CODIGOS_TAREAS`. `index.ts` no cambia: ya reexporta todo lo que se usa. `npm run build` de `shared`: `> tsc -p tsconfig.json`, sin errores. | `shared/src/tareas.ts` |
| 2 | Hecho, sin correr | `core/concurrencia.ts` con `exigirVersion` y su prueba (PR-1A02). `tareaModificada()` (409, con el mensaje de §D-7) en `core/tareas/tareas.ts`, con su prueba. | `backend/src/core/concurrencia.ts`, `backend/src/core/concurrencia.test.ts`, `backend/src/core/tareas/tareas.ts`, `backend/src/core/tareas/tareas.test.ts` |
| 3 | Hecho | `schema.prisma` según §D-1 y la migración `20261012035613_entregas_e_hilo_privado`, con los `CHECK` a mano al final. Aplicada en `campus_dev` (A-1). Detalle en "Migración". PR-1A01 aún sin escribir. | `backend/prisma/schema.prisma`, `backend/prisma/migrations/20261012035613_entregas_e_hilo_privado/migration.sql` |
| 4 | Hecho, sin cambios | `tsc -p tsconfig.json --noEmit` no pide ningún ajuste en `adapters/db/publicaciones.ts` por el `publicacionId` nulo, así que el archivo no cambia. | — |
| 5 | **Detenido** | Ver el detalle debajo de la tabla. | `backend/src/adapters/db/tareas.ts`, `backend/src/handlers/tareas/tareas.ts` |
| 6 a 10 | Sin empezar | `moverATema`, frontend, triviales, `DESIGN.md`, `adapters/README.md` y verificaciones. | — |

**Paso 1, comprobación de `version` contra `shared/dist`:**
- Dan `false`: `undefined`, `null`, `-1`, `1.5`, `"1"` y `2^53`. Zod 4 rechaza los enteros mayores que `Number.MAX_SAFE_INTEGER`.
- Dan `true`: `0`, `-0` y `2^53 − 1`.

**Paso 5, lo que ya está en el código:**
- `editarTarea` lee `t.version` en el mismo `SELECT … FOR NO KEY UPDATE OF t` y comprueba en el orden de §D-2.1:
  1. la tarea no existe → `null`;
  2. autoría → `403`;
  3. `exigirVersion` → `409`;
  4. fecha, categoría y tema.
- El `UPDATE` de `tareas` suma `version: { increment: 1 }` y `requiereAdjuntos`.
- `crearTarea` guarda `requiereAdjuntos`.
- `leerTarea` devuelve `requiereAdjuntos` y `version`.
- El `?? ""` del título en `leerTarea` pasa a `AppError("ERROR_INTERNO", "La tarea no tiene título.", 500)`. Es inalcanzable por el `CHECK`; el de `listarTrabajo` es de 01b.
- El handler pasa `version` y `requiereAdjuntos`.

**Paso 5, lo que falta:**
- Las pruebas PR-1A03 a PR-1A06, PR-1A09 y PR-1A10.
- Las normales de la lista cerrada, incluidas (i), (ii) y (iii).
- La corrida.

## Migración

- **Nombre:** `backend/prisma/migrations/20261012035613_entregas_e_hilo_privado/migration.sql`.
- **Cómo la creé, en dos pasos:**
  1. `npx prisma migrate dev --create-only --name entregas_e_hilo_privado`, para revisar el SQL y agregar los `CHECK` antes de aplicarla, sin editar una migración ya aplicada.
  2. `npx prisma migrate dev --name entregas_e_hilo_privado`, contra `campus_dev`.
  - Sin `migrate reset` ni `down -v`.
- **PA-06: no aplica.** Lo que Prisma generó es exactamente la parte "Prisma" de §D-1 y no propuso borrar ni recrear nada:
  - el enum `estado_entrega`;
  - la tabla `entregas`, con sus dos índices y sus dos FK;
  - `requiere_adjuntos` y `version` en `tareas`;
  - en `archivos`, `entrega_id` con su índice y su FK `NO ACTION`;
  - en `comentarios`, `publicacion_id` nulo y `entrega_id` con su índice y su FK `CASCADE`.
- **`CHECK` a mano, al final del archivo, tal como los escribe §D-1:**

```sql
ALTER TABLE "entregas" ADD CONSTRAINT "entregas_fecha_segun_estado"
  CHECK (("estado" = 'asignado') = ("fecha_entrega" IS NULL));
ALTER TABLE "entregas" ADD CONSTRAINT "entregas_asignada_sin_retraso_ni_enlaces"
  CHECK ("estado" <> 'asignado' OR ("con_retraso" = false AND "enlaces" = '[]'::jsonb));
ALTER TABLE "entregas" ADD CONSTRAINT "entregas_enlaces_es_lista"
  CHECK (jsonb_typeof("enlaces") = 'array' AND jsonb_array_length("enlaces") <= 5);
ALTER TABLE "entregas" ADD CONSTRAINT "entregas_version_no_negativa" CHECK ("version" >= 0);
ALTER TABLE "tareas" ADD CONSTRAINT "tareas_version_no_negativa" CHECK ("version" >= 0);
ALTER TABLE "comentarios" ADD CONSTRAINT "comentarios_un_solo_contexto"
  CHECK (num_nonnulls("publicacion_id", "entrega_id") = 1);
ALTER TABLE "archivos" DROP CONSTRAINT "archivos_confirmado_si_y_solo_si_contexto";
ALTER TABLE "archivos" ADD CONSTRAINT "archivos_confirmado_si_y_solo_si_contexto"
  CHECK (num_nonnulls("publicacion_id", "entrega_id") <= 1
         AND (("estado" = 'confirmado') = (num_nonnulls("publicacion_id", "entrega_id") = 1)));
```

- **Verificación, en orden:**
  - `npx prisma generate` → `✔ Generated Prisma Client (7.10.0) to .\src\adapters\db\generated in 210ms`.
  - `npx prisma validate` → `The schema at prisma\schema.prisma is valid 🚀`.
  - `npx prisma format --check` → `All files are formatted correctly!` (código 0).
  - `npx prisma migrate status` → `13 migrations found in prisma/migrations` · `Database schema is up to date!`.
  - `npx prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --script` → `-- This is an empty migration.`; con `--exit-code`, código 0.

## Verificaciones hechas hasta la PARADA

- **`tsc` del backend:**
  - `cd backend; npx tsc -p tsconfig.json --noEmit` → sin errores.
  - `npx tsc -p tsconfig.test.json` → 4 TS2345, todos en `tareas.integracion.test.ts`: `:702` y `:807` están fuera de la lista; `:761` y `:852` están dentro, pendientes de sumar `version` y `requiereAdjuntos`.
- **Prettier,** solo `--check` y por archivo: los seis archivos tocados del `backend` y `shared/src/tareas.ts` dan `All matched files use Prettier code style!`.
- **No corrí** `lint`, `test` ni `build` de `backend` ni de `frontend`: la PARADA llegó antes. Por eso este resumen no trae ningún conteo de `npx vitest list` ni ninguna prueba nueva verificada en verde (PR-1A02 está escrita, pero no corrió).
- **V-01: 163/163 coinciden,** 0 faltantes y 0 sobrantes, antes de empezar y al detenerme.
  - Comando: `git ls-files -co --exclude-standard | grep -E '\.ataque\.test\.tsx?$' | sort | xargs sha256sum`.
  - Lo comparé con la tabla de la ronda 0 complementaria (`reporte-tester.md`, desde la línea 488).
- **"No se toca": vacío.** Comando: `git diff --stat dd8edcb -- AGENTS.md CLAUDE.md docs/ARCHITECTURE.md docs/ARCHITECTURE-ESSENTIALS.md docs/PRD.md .claude infra backend/.env.example frontend/.env.example package.json package-lock.json shared/package.json backend/package.json frontend/package.json backend/src/middleware backend/src/adapters/auth backend/src/adapters/notifier backend/src/adapters/storage backend/src/config backend/src/workers backend/src/worker.ts backend/src/server.ts backend/src/adapters/db/cliente.ts backend/src/adapters/db/errores.ts backend/src/adapters/db/referencias.ts backend/src/adapters/db/bloqueo-clase.ts backend/src/core/autoria.ts backend/src/core/clases backend/src/handlers/clases backend/src/handlers/validacion.ts backend/src/handlers/errores.ts backend/test/setup.ts backend/test/global-setup.ts frontend/src/services frontend/src/app frontend/src/styles frontend/src/components frontend/src/lib frontend/vitest.config.ts frontend/src/features/auth frontend/src/features/admin frontend/src/features/diagnostico frontend/src/features/clases`.
- **PA-01:** no la volví a comprobar, porque no corrí la suite del backend. Docker Desktop estaba encendido: `docker ps` mostró sanos los tres contenedores de `infra/`, y no los toqué.
- No abrí navegadores, no terminé procesos, no instalé nada y no hice commit.


# Resumen del programador — ENTREGAS-01a — Implementación (reanudación tras la Enmienda 4)

Plan: `docs/trabajo/ENTREGAS-01-entregas-e-hilo-privado/plan.md`, SHA-256 `ffc6fdd1171e746caa88e8bcf7af30775b429db2b9ffe890b73381b32ee2f3d3` (Enmiendas 1 a 4; comprobado con `sha256sum` al reanudar). Base `<R>` = `dd8edcb`. Pasos completados: **10 de 10**. Sin PARADAS nuevas.

## 1. Resolución de la PARADA

- **Enmienda 4** (aprobada por el manager en `revision.md`, "Verificación de la Enmienda 4"): la lista cerrada suma las llamadas directas a `crearTarea` y `editarTarea` y los dobles de `EstadoDelFormulario`, solo para sumar `requiereAdjuntos: true` y la `version` vigente, sin tocar aserciones.
- Los tres casos de la PARADA se resolvieron así:
  - `tareas.integracion.test.ts:701-702` (`sembrar()`): suma `requiereAdjuntos: true`.
  - `tareas.integracion.test.ts:806-807`: suma `requiereAdjuntos: true`.
  - `lib.test.ts:29` (`estadoValido()`): suma `requiereAdjuntos: true`.
- No apareció ninguna otra prueba fuera de la lista: `tsc -p tsconfig.test.json` y `tsc -b` compilan, y las suites completas están en verde.

## 2. Pasos 5 a 10

| Paso | Qué se hizo | Archivos |
|---|---|---|
| 5 | Lo descrito arriba en "Paso 5, lo que ya está en el código" (sin cambios desde la PARADA). Además: PR-1A03 a PR-1A06, PR-1A09 y PR-1A10 en un archivo nuevo, las normales de la lista cerrada (sección 4) y C-8 en verde. | `backend/src/adapters/db/tareas.ts`, `backend/src/handlers/tareas/tareas.ts`, `backend/test/tareas-version.integracion.test.ts` (nuevo), `backend/test/entregas-migracion.integracion.test.ts` (nuevo, PR-1A01) |
| 6 | `moverATema`: si la publicación es de tipo `tarea`, `tx.tarea.updateMany({ where: { id, claseId }, data: { version: { increment: 1 } } })` justo después de comprobar que no es un anuncio y **antes** de bloquear el tema y de actualizar `publicaciones` (orden de §D-0.6). Fuera de todo ciclo. PR-1A07 y PR-1A08. | `backend/src/adapters/db/temas.ts` |
| 7 | Frontend según §D-8 (Enmienda 2); detalle debajo de la tabla. | `frontend/src/features/tareas/{types.ts, data.ts, lib.ts, hooks.ts, editar-tarea-view.tsx, components/formulario-tarea.tsx, components/detalles-de-la-tarea.tsx}`, pruebas nuevas `conflicto-01a.test.tsx` y `como-se-entrega-01a.test.tsx` |
| 8 | Triviales heredados; detalle debajo de la tabla. | `frontend/src/components/clase/data.ts`, `frontend/src/features/clases/data.ts` (solo la línea de `sinTema`), `frontend/src/features/tareas/data.ts`, `frontend/src/features/tareas/components/editor-de-rubrica.tsx`, `frontend/src/features/tareas/editar-tarea-view.test.tsx` |
| 9 | `DESIGN.md` y `adapters/README.md`; detalle debajo de la tabla. | `docs/DESIGN.md`, `backend/src/adapters/README.md` |
| 10 | Verificaciones, una suite a la vez (sección 6). | — |

**Paso 7, frontend (§D-8, Enmienda 2):**
- **"Cómo se entrega":** un control segmentado dentro de `formulario-tarea.tsx` (mismo patrón y mismas clases que el de entregas tardías, justo antes de él), sin `enEspera` ni `disabled` nuevos. Va con su `ErrorDeCampo` para un `VALIDACION` del servidor (es hermano de `CAMPOS_DEL_FORMULARIO`; ver la sección 9).
- **`EstadoDelFormulario`** suma `requiereAdjuntos`, y `cuerpoDeTarea` y `estadoInicialDelFormulario` lo usan.
- **`versionDeApertura`** se guarda con `useState(() => tarea === null ? null : tarea.version)` y el formulario la entrega con `onGuardar(datos, versionDeApertura)`.
- **La vista de edición** arma `{ ...datos, version }`; `useEditarTarea` recibe `EditarTarea`.
- **Lo que no cambió del aviso:** `TAREA_MODIFICADA` entra en `CODIGOS_CON_MENSAJE_DEL_SERVIDOR`, no en `CODIGOS_QUE_RENUEVAN_LA_TAREA`, y `useEditarTarea.onError` no cambia.
- **`esTareaModificada`** queda en `lib.ts`.
- **En el `catch` de `handleGuardar`,** después de la rama de la subida fallida: `if (esTareaModificada(error)) { await onConflicto?.(); return }`.
- **Props nuevas del formulario:** `onConflicto` y `enfocarAlMontar` (un efecto de montaje lleva el foco a "Título").
- **En la vista:** `reinicios`, `recargarTrasConflicto` (`consulta.refetch()`; reinicia solo con éxito y con `puedeEditar`) y `key={reinicios}`.
- **Detalle:** la fila "Entrega".
- Sin `AvisoDeConflicto` ni "Cargar la versión actual".

**Paso 8, triviales:**
- **O-1:** el `it.each` de T-15 de PR-1D04 pasa a objetos con un campo `nombre`, y el título interpola solo `$nombre`.
- **O-2:**
  - `TEXTOS_DE_LA_CLASE.sinTema`;
  - `sinTema` de `TEXTOS_FORMULARIO_PUBLICACION`, `TEXTOS_FORMULARIO_TAREA` y `TEXTOS_DETALLE_TAREA` toma su valor de ahí;
  - `MENSAJES_ERROR_TAREAS.categoriaRequerida` toma el de `TEXTOS_FORMULARIO_TAREA.categoriaRequerida`;
  - `sinAccesoALaClase` es `TEXTOS_DE_LA_CLASE.sinAcceso`.
- **O-3:** con la nota del tope visible, "Agregar criterio" lleva `aria-describedby` hacia ella.

**Paso 9, documentos:**
- `DESIGN.md`, con la marca "propuesta (ENTREGAS-01a)":
  - §7.20: la fila "Entrega";
  - §7.21: el campo "Cómo se entrega" y la viñeta "Conflicto al guardar".
- `adapters/README.md`: una sección nueva con la versión, `moverATema` y la tabla del orden de bloqueo de §D-0.6.

## 3. Pruebas requeridas (01a)

| Viñeta | Archivo | Título exacto del caso |
|---|---|---|
| PR-1A01 | `backend/test/entregas-migracion.integracion.test.ts` | "PR-1A01: un comentario sin contexto o con los dos contextos se rechaza (comentarios_un_solo_contexto)"; "PR-1A01: un archivo confirmado con los dos contextos o sin ninguno, y uno pendiente con contexto, se rechazan (archivos_confirmado_si_y_solo_si_contexto)"; "PR-1A01: una entrega asignada con fecha de entrega, con retraso o con enlaces se rechaza; una entregada sin fecha también"; "PR-1A01: una entrega con 6 enlaces o con enlaces que no son una lista se rechaza; con 5 pasa"; "PR-1A01: version negativa se rechaza en tareas y en entregas"; "PR-1A01: una tarea creada por la API nace con requiere_adjuntos = true y version = 0" |
| PR-1A02 | `backend/src/core/concurrencia.test.ts` | "PR-1A02: con la misma versión no lanza ni construye el error"; "PR-1A02: con una versión distinta lanza exactamente el error que recibe"; "PR-1A02: no compara por tipo ni por identidad: -0 y 0 son la misma versión"; "PR-1A02: con enteros grandes compara el valor exacto" |
| PR-1A03 | `backend/test/tareas-version.integracion.test.ts` | "PR-1A03: con la versión vigente el PUT responde 200, la versión sube en 1 y los cambios quedan"; "PR-1A03: con una versión vieja responde 409 TAREA_MODIFICADA y no cambia título, instrucciones, fecha, criterios, archivos, tema, trabajo_id ni el RECORDATORIO_24H". Además, `backend/src/core/tareas/tareas.test.ts` › "PR-1A03: TAREA_MODIFICADA es un 409 con el mensaje de §D-7" |
| PR-1A04 | ídem | "PR-1A04: dos PUT simultáneos con la misma versión (fila de tareas retenida) dan exactamente un 200 y un 409; la versión final es la de partida + 1" |
| PR-1A05 | ídem | "PR-1A05: una tarea de otra clase responde 404 aunque la versión sea vieja"; "PR-1A05: el maestro que no puede editar recibe 403 EDICION_NO_PERMITIDA aunque la versión sea vieja"; "PR-1A05: con una versión vieja y una fecha límite inválida responde 409 (la versión se mira antes)" |
| PR-1A06 | ídem | "PR-1A06: version ausente, null, negativa, decimal, cadena o mayor que MAX_SAFE_INTEGER responde 400 VALIDACION sin escribir"; "PR-1A06: una version enviada al crear se descarta y la tarea nace con version 0" |
| PR-1A07 | ídem | "PR-1A07: mover una tarea de tema sube su versión en 1 y un PUT con la versión de antes responde 409"; "PR-1A07: mover un material no toca ninguna fila de tareas" |
| PR-1A08 | ídem | "PR-1A08: edición y movimiento simultáneos: con la edición primero, los dos responden 200 y la versión final es 2, sin deadlock ni 500"; "PR-1A08: edición y movimiento simultáneos: con el movimiento primero, la edición posterior recibe 409, sin deadlock ni 500" |
| PR-1A09 | ídem | "PR-1A09: crear sin requiereAdjuntos da true; false se guarda y se devuelve; editar lo cambia"; "PR-1A09: el GET del alumno, del maestro y del admin devuelve requiereAdjuntos"; "PR-1A09: un requiereAdjuntos que no es booleano responde 400 al crear y al editar, sin escribir" |
| PR-1A10 | ídem | "PR-1A10: crear, ver y editar responden exactamente las llaves de tareaDetalleSchema, sin estado de pago, correo, rol ni trabajo_id, para el alumno, el maestro y el admin" |
| PR-1A11 | `frontend/src/features/tareas/como-se-entrega-01a.test.tsx` | "PR-1A11: al crear, «Cómo se entrega» es un control segmentado con «Con archivos o enlaces» elegido, antes de las entregas tardías"; "PR-1A11: elegir «Marcar como completada» envía requiereAdjuntos: false; sin tocarlo, true"; "PR-1A11: al editar, el control muestra el valor de la tarea y el cuerpo lo conserva"; hermano: "PR-1A11: un VALIDACION de requiereAdjuntos al guardar se muestra bajo el grupo, sin aviso" |
| PR-1A12 | `frontend/src/features/tareas/conflicto-01a.test.tsx` | "PR-1A12: editar envía la version con que se abrió el formulario aunque una recarga posterior traiga otra" |
| PR-1A13 | ídem | "PR-1A13: ante 409 TAREA_MODIFICADA un solo aviso con el mensaje del servidor, un solo GET, «Guardar cambios» en espera sin disabled durante la recarga, reinicio con la versión nueva, foco en «Título» y el guardado siguiente con version + 1" |
| PR-1A14 (a) a (h) | ídem | "PR-1A14 (a): un segundo 409 seguido vuelve a avisar, recarga una vez más, reinicia con v + 2, lleva el foco a «Título» y el guardado siguiente envía v + 2"; "PR-1A14 (b): una recarga de fondo con éxito y la versión de otra persona no reinicia, conserva lo escrito, no avisa y el guardado envía la de apertura"; "PR-1A14 (c): si la recarga tras el 409 falla con 500, dos avisos en total, lo escrito y los elegidos siguen, «Guardar cambios» deja la espera, el foco no cae en <body> y un guardado nuevo envía otra vez v"; "PR-1A14 (d): con '404 TAREA_NO_ENCONTRADA' en la recarga tras el 409, el mensaje reemplaza el formulario, el foco va a la raíz y no hay aviso de recarga fallida" y "… con '403 SIN_ACCESO_A_LA_CLASE' …"; "PR-1A14 (e): si la recarga tras el 409 trae puedeEditar en false, dice «No puedes editar esta tarea.» y el foco va a la raíz"; "PR-1A14 (f): los archivos elegidos antes del 409 se piden y se suben una sola vez, ningún PUT posterior lleva su id y tras el reinicio la lista de elegidos está vacía"; "PR-1A14 (g): en la primera apertura el foco no se mueve a «Título»"; "PR-1A14 (h): «Cancelar» durante la recarga tras el 409 navega al detalle sin errores en la consola" |
| PR-1A15 | `frontend/src/features/tareas/como-se-entrega-01a.test.tsx` | "PR-1A15: dice «Con archivos o enlaces» si la tarea requiere adjuntos"; "PR-1A15: dice «Se marca como completada (los archivos son opcionales)» si no los requiere" |
| PR-1A16 | `frontend/src/features/tareas/editar-tarea-view.test.tsx` | Las seis filas de "PR-1D04: $nombre: el primer fallo conserva el formulario con el foco en «Título»; el segundo lo reemplaza y el foco va a la raíz, no a <body>" (por ejemplo, "PR-1D04: '500 y después 404': …"). Con `npx vitest list src/features/tareas/editar-tarea-view.test.tsx` salen seis títulos distintos, cada uno con una sola aparición (`uniq -c` = 1 en todos) |
| PR-1A17 | `frontend/src/features/tareas/como-se-entrega-01a.test.tsx` | "PR-1A17: categoriaRequerida es el mismo valor en el formulario y en los mensajes de error"; "PR-1A17: sinAccesoALaClase es TEXTOS_DE_LA_CLASE.sinAcceso"; "PR-1A17: «Sin tema» de features/clases y de los dos objetos de features/tareas es TEXTOS_DE_LA_CLASE.sinTema" |
| PR-1A18 | ídem | "PR-1A18: con 20 criterios, «Agregar criterio» nombra la nota del tope en aria-describedby y la nota existe"; "PR-1A18: con menos de 20 criterios, «Agregar criterio» no lleva aria-describedby y no hay nota" |

**Reglas que cumplen las pruebas nuevas:**
- **Reloj fijo:** en el frontend, `vi.useFakeTimers({ toFake: ["Date"] })` en las dos pruebas nuevas; en `core/` no hay fechas; en la integración, las fechas límite van con días de margen.
- **Bloqueos:** ningún `LOCK TABLE`.
- **Retención de la fila de `tareas` (PR-1A04 y PR-1A08):** la hace la función local `conTareaRetenida` de `tareas-version.integracion.test.ts`.
  - Sigue el mismo método que `conFilaRetenida`: `FOR UPDATE`, y cada operación se da por formada con `formadasDetrasDe`.
  - Lleva `timeout: 30_000` y `maxWait: 5_000`, más que la espera de 10 s por operación.
  - Por qué no reutiliza `conFilaRetenida`: la ayuda compartida no admite la tabla `tareas` y está en "No se toca".
- **Sin precondiciones con `return`:** las precondiciones fallan con su mensaje.

## 4. Pruebas normales cambiadas (todas de la lista cerrada; ninguna aserción quitada ni debilitada)

**Backend, `tareas.integracion.test.ts`:**
- Suma `version` a los cuerpos de los `PUT` del `describe` "editar una tarea (PR-1B08)": 0 en la primera edición y 1 en `sinAdjuntos`.
- Suma `requiereAdjuntos: true` en `sembrar()` (`:701`) y en el caso del encolado fallido (`:806`).
- Suma `version: 0` y `requiereAdjuntos: true` en `datosDeEdicion` (lo usan `:761` y `:852`).

**Backend, `tareas-autoria.integracion.test.ts`:**
- El ayudante `editar` envía la `version` vigente, leída de la fila (como ya hacía con `fechaLimite`).
- El `PUT` del maestro ajeno (`:280`) suma `version: 0`.

**Backend, `tareas-autorizacion.integracion.test.ts`:** el payload del `PUT` suma `version: 0`; cada caso usa un escenario nuevo.

**Backend, `tareas-concurrencia.integracion.test.ts`:**
- **(i)** y **(ii)** exactamente como dice la lista cerrada: `version: 0`; ninguna respuesta `>= 500`; los códigos ordenados son `[200, 409]` o un `200` y nueve `409`, todos los `409` con `TAREA_MODIFICADA`; se conserva el recordatorio vivo y se suma `version` 1.
- "editar y borrar a la vez" y "editar con el tema que se borra" solo suman `version: 0`.

**Backend, `esquemas-tareas.test.ts`:** **(iii)** con el título nuevo y las tres aserciones del plan; `extend` conservó las instancias, así que el `toBe` campo por campo pasa.

**Frontend:**
- `app/router.test.tsx`, `features/tareas/detalle-tarea-view.test.tsx`, `features/tareas/editar-tarea-view.test.tsx`, `features/tareas/formulario-tarea.test.tsx` y `features/tareas/lib.test.ts` (`tareaDeEjemplo`): suman `requiereAdjuntos: true` y `version: 0` a los dobles de `TareaDetalle`.
- `lib.test.ts`, `estadoValido()`: suma `requiereAdjuntos: true` (Enmienda 4).
- `editar-tarea-view.test.tsx`, O-1: sección 2.

## 5. Conteos

- **Comandos:** `cd backend; npx vitest list --json=<archivo>` y `cd frontend; npx vitest list --json=<archivo>`, una corrida a la vez; casos y archivos contados del JSON.
- **Backend, antes:** 2164 casos en 173 archivos. Mi lista "antes" se tomó con las 5 pruebas de `core/` ya escritas (`concurrencia.test.ts` y un caso en `tareas/tareas.test.ts`), así que la base sobre el árbol de la ronda 0 complementaria es **2159 en 172**. Coincide con el reporte del tester.
- **Backend, después:** **2186 casos en 175 archivos**, es decir +27 casos y +3 archivos:
  - 16 en `tareas-version.integracion.test.ts`;
  - 6 en `entregas-migracion.integracion.test.ts`;
  - 4 en `concurrencia.test.ts`;
  - 1 en `tareas/tareas.test.ts`;
  - (iii) cambia de título y no suma casos.
- **Frontend, antes:** **2243 casos en 150 archivos**.
- **Frontend, después:** **2265 casos en 152 archivos**, es decir +22:
  - 11 en `conflicto-01a.test.tsx`;
  - 11 en `como-se-entrega-01a.test.tsx`;
  - las seis filas de O-1 reemplazan a las seis de antes, sin cambiar el conteo.
- **Corridas:** coinciden con lo anterior: backend `Tests  2186 passed (2186)` y frontend `Tests  2265 passed (2265)`.

## 6. lint, test y build

| Paquete | Comando | Última línea |
|---|---|---|
| shared | `cd shared; npm run build` | `> tsc -p tsconfig.json` (código 0) |
| shared | `cd shared; npm run lint` | `All matched files use Prettier code style!` (código 0) |
| backend | `cd backend; npm run lint` | `> tsc -p tsconfig.json --noEmit && tsc -p tsconfig.test.json` (código 0) |
| backend | `cd backend; npm test` (04:26:43Z a 04:28:25Z) | `Test Files  175 passed (175)` · `Tests  2186 passed (2186)` · `Duration  97.05s (transform 11.30s, setup 4.90s, import 182.51s, tests 744.94s, environment 44ms)` (código 0) |
| backend | `cd backend; npm run build` | `> tsc -p tsconfig.json` (código 0) |
| backend | `cd backend; npx prisma validate` | `The schema at prisma\schema.prisma is valid 🚀` |
| frontend | `cd frontend; npm run lint` | `> tsc -b` (código 0) |
| frontend | `cd frontend; npm test` (04:34:10Z a 04:35:41Z) | `Test Files  152 passed (152)` · `Tests  2265 passed (2265)` · `Duration  87.75s (transform 17.89s, setup 58.58s, import 182.02s, tests 387.85s, environment 270.94s)` (código 0) |
| frontend | `cd frontend; npm run build` | `✓ built in 663ms` (código 0) |

- **Rojos esperados:** ninguno queda. C-8 está en verde dentro de la corrida completa, y las normales de la lista cerrada también.
- **Orden de las corridas:** nunca dos suites a la vez. Primero `shared`, después el backend (lint, test, build) y por último el frontend. El frontend se corrió dos veces completo: la segunda, después de agregar el `ErrorDeCampo` de la sección 9, y su última línea es la que aparece en la tabla.

**PA-07,** sobre la salida completa de `npm test` del backend, contada con `grep -a -o -F`:

| Término | Cuenta |
|---|---|
| `40P01` | 0 |
| `deadlock detected` | 0 |
| `could not serialize` | 0 |
| `too many clients` | 0 |
| `"Error no controlado"` | 10 |
| `"code":"P2028"` | 5 |
| `Unable to start a transaction` | 0 |

- **Los 10 `"Error no controlado"` son exactamente I-1:**
  - 6 de `POST /api/auth/login` con los fallos simulados;
  - 3 `ZodError` de `archivos-d-r2` T-39 (`POST …/archivos`, `POST …/archivos/:archivoId/descarga` y `GET …/publicaciones`);
  - 1 de `GET /api/prueba/error-comun`.
- **Los 5 `P2028` son los permitidos,** todos con nivel `warn`.
- **Control positivo completo:**
  - los tres de `servicio-ocupado`, en un mismo proceso: `POST /api/auth/cambiar-contrasena` › `tx.sesion.findFirst()`, `POST /api/auth/refrescar` › `tx.sesion.updateMany()` y `POST …/publicaciones/:publicacionId/comentarios` › `prisma.$queryRawUnsafe()`;
  - los dos de `cuentas-r3`, en otro proceso: `POST /api/auth/login` › `tx.sesion.create()` y `POST /api/auth/restablecer` › `tx.tokenCuenta.updateMany()`.
- **Ninguno sale de las rutas de tareas, temas o categorías,** tampoco de las retenciones de PR-1A04 y PR-1A08.
- **Cómo se atribuyó:** un script cruza `pid` y `reqId` con la última "incoming request".

## 7. V-01

- Comando: `git ls-files -co --exclude-standard | grep -E '\.ataque\.test\.tsx?$' | sort | xargs sha256sum`, comparado con la tabla de la ronda 0 complementaria (`reporte-tester.md`, desde la línea 488).
- Resultado: **163/163 coinciden,** 0 faltantes, 0 sobrantes, al terminar todo el trabajo.
- No toqué ninguna `*.ataque`.

## 8. "No se toca"

- **Comando:** `git diff --stat dd8edcb -- AGENTS.md CLAUDE.md docs/ARCHITECTURE.md docs/ARCHITECTURE-ESSENTIALS.md docs/PRD.md .claude infra backend/.env.example frontend/.env.example package.json package-lock.json shared/package.json backend/package.json frontend/package.json backend/src/middleware backend/src/adapters/auth backend/src/adapters/notifier backend/src/adapters/storage backend/src/config backend/src/workers backend/src/worker.ts backend/src/server.ts backend/src/adapters/db/cliente.ts backend/src/adapters/db/errores.ts backend/src/adapters/db/referencias.ts backend/src/adapters/db/bloqueo-clase.ts backend/src/core/autoria.ts backend/src/core/clases backend/src/handlers/clases backend/src/handlers/validacion.ts backend/src/handlers/errores.ts backend/test/setup.ts backend/test/global-setup.ts backend/test/ayudas-auth.ts backend/test/ayudas-clases.ts backend/test/ayudas-tareas.ts backend/test/ayudas-concurrencia.ts backend/test/almacen-en-memoria.ts frontend/src/services frontend/src/app/providers.tsx frontend/src/app/router.tsx frontend/src/styles frontend/src/components/ui frontend/src/components/layout frontend/src/components/mensaje-error.tsx frontend/src/components/cargando.tsx frontend/src/components/estado-vacio.tsx frontend/src/components/adjuntos frontend/src/lib frontend/vitest.config.ts frontend/src/features/auth frontend/src/features/admin frontend/src/features/diagnostico`. Resultado: **vacío**.
- **`features/clases`:** `git diff --stat dd8edcb -- frontend/src/features/clases` muestra solo `data.ts | 2 +-`, la línea de `sinTema`.
- **`frontend/src/app/`:** solo cambió `router.test.tsx` (los dobles de la lista cerrada); `router.tsx` y `providers.tsx` no se tocaron.

## 9. Hermanos y estados vecinos

**Versión de apertura** (`versionDeApertura`):

| Estado o camino | ¿Aplica? |
|---|---|
| Primera apertura | Sí: nace del inicializador perezoso (PR-1A12) |
| Recarga de fondo con éxito | Sí: no la cambia (PR-1A12 y PR-1A14 (b)) |
| Recarga fallida | Sí: no la cambia (PR-1A14 (c), que reenvía `v`) |
| Reinicio por `409` | Sí: nace de la versión nueva (PR-1A13 y PR-1A14 (a)) |
| `StrictMode` (doble montaje) | No hace falta: el inicializador da el mismo valor |
| Crear | No aplica: se pasa `null` y la vista de crear la ignora; el servidor descarta `version` al crear (PR-1A06) |

**Conflicto y recarga** (`onConflicto`, `recargarTrasConflicto`, `key={reinicios}`):
- **Estados vecinos de §D-8.3.7,** todos con prueba: segundo `409` (a), recarga de fondo (b), `refetch` fallido (c), `404` y `403` (d), pérdida de `puedeEditar` (e), archivos elegidos (f), primera apertura (g) y "Cancelar" durante la recarga (h).
- **Doble envío durante la recarga:** el clic y el Enter (envío del formulario) los cubre PR-1A13.
- **Un solo aviso y un solo GET:** los cubren PR-1A13 y PR-1A14 (a).
- **Los códigos de T-11** (`TAREA_NO_ENCONTRADA`, `EDICION_NO_PERMITIDA`, `SIN_ACCESO_A_LA_CLASE`) siguen por `CODIGOS_QUE_RENUEVAN_LA_TAREA`, sin cambio; `tareas-01d-r2` sigue en verde.
- **Crear** no pasa `onConflicto`: no puede recibir `TAREA_MODIFICADA`.
- **Hallazgo al probar, no corregido por estar fuera del alcance:** la clave de foco de la vista (`claveDeFocoDeLaTarea`, TAREAS-01d) solo detecta una respuesta nueva por `dataUpdatedAt`.
  - Con el reloj totalmente fijo, una recarga en el mismo milisegundo que la anterior no cambia la clave, y en (e) el foco caería en `<body>`.
  - En las pruebas, el ayudante `guardar()` avanza el reloj 5 s antes de cada guardado, como una persona que tarda en guardar.
  - En la vida real, entre abrir y recibir un `409` pasan milisegundos de sobra.
  - Lo anoto en la sección 10 como observación para el tester y el manager.

**"Cómo se entrega":**

| Hermano | ¿Aplica? |
|---|---|
| Crear (valor por defecto) | Sí (PR-1A11) |
| Editar (valor de la tarea) | Sí (PR-1A11) |
| Cuerpo enviado | Sí (PR-1A11) |
| Detalle | Sí (PR-1A15) |
| Valor por defecto del servidor | Sí (PR-1A09) |
| Error del servidor bajo el campo | Sí, aplicado en esta entrega: como `requiereAdjuntos` está en `CAMPOS_DEL_FORMULARIO`, un `VALIDACION` de ese campo deja de avisar con un `toast`, así que agregué su `ErrorDeCampo` bajo el grupo, con `aria-describedby`. Sin eso se habría perdido en silencio. Prueba: "PR-1A11: un VALIDACION de requiereAdjuntos al guardar se muestra bajo el grupo, sin aviso" |
| Error del cliente | No aplica: un booleano siempre es válido |
| Control de entregas tardías (`aceptaTardias`) | Sin cambio: no está en `CAMPOS_DEL_FORMULARIO`, así que su `VALIDACION` sigue saliendo como aviso |

**`moverATema`:**

| Camino | Qué pasa |
|---|---|
| Mover una tarea a un tema | Sube la versión (PR-1A07) |
| Mover una tarea a "Sin tema" (`temaId: null`) | También sube la versión: el `updateMany` no depende del destino |
| Mover un material | No toca `tareas` (PR-1A07) |
| Mover un anuncio | `409 ANUNCIO_SIN_TEMA` antes de escribir |
| Tema inexistente | Se revierte con la transacción |
| Edición y movimiento a la vez | Probado en los dos órdenes (PR-1A08) |
| Mover a su mismo tema | Sube la versión (escribe la fila); aceptable por §D-2.3 |

- **Otros caminos que cambian lo que muestra el formulario sin subir la versión:** borrar un tema (`publicaciones.tema_id` pasa a nulo por `ON DELETE SET NULL`).
  - Por qué no es una pérdida silenciosa: un guardado posterior con ese tema recibe `404 TEMA_NO_ENCONTRADO` y el formulario deja "Sin tema" (T-08).
  - No lo cambié: el plan no lo pide.
- **Categorías:** no se pueden quitar con tareas, así que no hay camino equivalente.
- **Orden de bloqueo:** `editarTarea`, `moverATema` y `borrarTarea` toman `tareas` antes que `publicaciones`. En PA-07, 0 `deadlock detected`.

**`requiereAdjuntos` en las lecturas:**
- `leerTarea` sirve a las tres lecturas (el `GET` y las respuestas de crear y de editar) para el alumno, el maestro y el admin (PR-1A09 y PR-1A10).
- El resumen del muro (`resumenDeTareaSchema`) y "Trabajo de clase" no lo llevan: el plan de 01a no lo pide.

**Otros hermanos revisados:**
- El primer `it.each` de PR-1D04 (VALIDACION de `tareaId`/`claseId`) ya interpola solo cadenas y tiene títulos únicos: no lo cambié.
- El `?? ""` del título en `listarTrabajo` es de 01b, como dice el plan.

## 10. Desviaciones, observaciones y lo no verificado

- **Desviación 1,** PR-1A17 en `features/clases`:
  - La regla 9 de ESLint (`no-restricted-imports`) impide importar `@/features/clases/data` desde `features/tareas`, y una prueba nueva dentro de `features/clases` queda fuera de lo que A-3 permite en 01a.
  - Por eso el caso carga ese módulo con `import.meta.glob(…, { eager: true })` y compara con `toBe`. Es la misma técnica de lectura de fuentes de las `*.ataque`; el código de producción no se acopla.
  - Si el manager prefiere otra ubicación, se mueve sin cambiar la aserción.
- **Desviación 2,** la migración: la creé con `--create-only` y la apliqué después con `migrate dev`. Así los `CHECK` quedaron dentro del archivo antes de aplicarla, sin editar una migración aplicada. El nombre es el del plan.
- **Desviación 3,** la vista de edición: hay un `if (version === null) return` inalcanzable (al editar, el formulario siempre nace de una tarea). Evita un `throw` fuera de TanStack Query.
- **Observación para el tester y el manager:** la clave de foco de la sección 9. Ya existía desde TAREAS-01d y no la toqué; la ve solo una prueba con el reloj totalmente fijo.
- **Vite:** el `build` del frontend imprime la advertencia de tamaño de chunk; no cambió el código que la produce.
- **No verificado:**
  - el formulario en un navegador real (foco, lector de pantalla y H-6; quedan para la comprobación humana al final de 01e);
  - la migración sobre una base con datos de TAREAS-01: `campus_dev` la aplicó sin error, pero no revisé qué datos tiene; el tester lo tiene previsto en la ronda 1.
- No abrí navegadores, no terminé procesos, no instalé nada y no hice commit.


# Resumen del programador — ENTREGAS-01b — Implementación

Plan: `docs/trabajo/ENTREGAS-01-entregas-e-hilo-privado/plan.md` (estado LISTO, Enmiendas 1 a 4). Base dentro de los paquetes: `82888dd`; fuera, `dd8edcb`. Pasos completados: **10 de 10**. Sin migración, sin dependencias, sin commit. No abrí navegadores ni terminé procesos.

## 1. Pasos

| Paso | Qué hice | Archivos |
|---|---|---|
| 1 | Esquemas de §D-3.2: `enlaceDeEntregaSchema` (http/https, sin usuario ni contraseña, 1 a 2048, normalizado a `URL.href`), `urlDeEntregaRespuestaSchema`, `entregarSchema` (estricto; ids en minúsculas, sin repetidos tampoco en mayúsculas), `anularEntregaSchema` (`z.strictObject({})`), `estadoEntregaSchema`, `miEntregaSchema`, `entregaDeAlumnoSchema`, `filaDeEntregaSchema`, `listaEntregasRespuestaSchema` (todos `z.strictObject`), parámetros de ruta en minúsculas y `CODIGOS_ENTREGAS`. En `tareas.ts`: `entrega` en `elementoDeTrabajoSchema`, `CONFIRMAR_BORRADO_CON_ENTREGAS`, `borrarTareaQuerySchema` (estricto), `BorrarTareaQuery` y `TAREA_CON_ENTREGAS`. Reexportes en `index.ts`. `npm run build` de `shared` | `shared/src/entregas.ts` (nuevo), `shared/src/tareas.ts`, `shared/src/index.ts` |
| 2 | `core/entregas/entregas.ts`: `esTarde`, `entregaCerrada`, `exigirEntregaAbierta`, `decidirEntrega`, `decidirAnulacion`, `accionesDeEntrega`, `alumnoDeLaRelacion` y los `AppError` de §D-7 (más `alumnoNoEncontrado`). `politica.ts`: `prefijoDeMateriales`, `prefijoDeEntrega`, `claveDeEntrega`. `core/tareas/tareas.ts`: `mensajeTareaConEntregas` y `exigirBorradoConEntregasPermitido`. Con sus pruebas | `backend/src/core/entregas/entregas.ts` y `.test.ts` (nuevos), `backend/src/core/archivos/politica.ts`, `backend/src/core/tareas/tareas.ts`, `backend/src/core/tareas/tareas.test.ts` |
| 3 | `COLA_ENTREGA_REALIZADA` y `datosEntregaRealizadaSchema` (`z.strictObject`, `version >= 1`); la cola entra en `OPCIONES_DE_COLAS` con la política de los avisos. Sin consumidor | `backend/src/core/eventos/avisos-de-clase.ts`, `backend/src/adapters/queue/colas.ts` |
| 4 | PR-1B17 y PR-1B18 primero, rojas (sección 2). Remedio: `buscarArchivoConfirmado` suma `publicacionId: { not: null }`; `buscarArchivosParaConfirmar` exige `prefijo` y suma `entregaId: null` y `claveObjeto: { startsWith: prefijo, mode: "insensitive" }`; `handlers/adjuntos.ts` generaliza `archivosParaConfirmar({ …, prefijo })` y conserva `archivosParaPublicar` como envoltorio con `prefijoDeMateriales(claseId)`. `handlers/archivos.ts` no cambió | `backend/src/adapters/db/archivos.ts`, `backend/src/handlers/adjuntos.ts`, `backend/test/ayudas-entregas.ts` (nuevo), `backend/test/entregas-archivos.integracion.test.ts` (nuevo), `backend/test/archivos.integracion.test.ts` (lista cerrada) |
| 5 | `condicionesDePagina` pasa a `export const condicionesDePaginaDeAlumnos` sin cambiar su cuerpo; las dos funciones que la usaban la llaman igual | `backend/src/adapters/db/inscripciones.ts` |
| 6 | `adapters/db/entregas.ts`: `leerMiEntrega`, `entregar`, `anularEntrega`, `buscarArchivoDeMiEntrega`, `buscarArchivoDeEntregaDeAlumno`, `listarEntregas`, `leerEntregaDeAlumno`; privadas `bloquearTareaParaEntregar` (el único `FOR KEY SHARE` del archivo: `grep -c "FOR KEY SHARE"` da 1), `asegurarFilaDeEntrega` (`INSERT … ON CONFLICT DO NOTHING`), `bloquearEntrega` (`FOR NO KEY UPDATE`) y `confirmarArchivosDeEntrega`. Tres literales `instantaneaUnica: true` (`grep -c` da 3), ninguno en comentarios. Reexportes en `db/index.ts`. E6 de `bloqueo-usuario.integracion` suma `entregas.ts` (lista cerrada) | `backend/src/adapters/db/entregas.ts` (nuevo), `backend/src/adapters/db/index.ts`, `backend/test/bloqueo-usuario.integracion.test.ts` |
| 7 | `handlers/tareas/entregas.ts` (`entregasHandler`, recibe `{ almacen }`) con las ocho rutas y la cadena exacta de "Autorización"; registro en `app.ts` después de `tareasHandler`. PR-1B05 a PR-1B16 (con PR-1B09 bis), PR-1B19 a PR-1B21, PR-1B24 a PR-1B26 | `backend/src/handlers/tareas/entregas.ts` (nuevo), `backend/src/app.ts`, pruebas nuevas de la sección 3 |
| 8 | `borrarTarea` con `confirmarEntregas` opcional (ausente es `false`): después del `FOR UPDATE OF t` y de la autoría, `tx.entrega.count` (`entregado` y `calificado`) y `exigirBorradoConEntregasPermitido` antes de escribir; después descarta los archivos de entregas (`entrega: { tareaId }`) y los de la publicación; la cascada borra entregas e hilos (ningún `delete` explícito de `entregas`). El `DELETE` valida `borrarTareaQuerySchema` y pasa `confirmar === CONFIRMAR_BORRADO_CON_ENTREGAS`. `listarTrabajo` con `alumnoId?: string \| null` y una sola consulta de entregas; el handler usa `alumnoDeLaRelacion`. El `titulo ?? ""` de `listarTrabajo` pasa a un error controlado (inalcanzable por el `CHECK`). PR-1B22, PR-1B22 bis y PR-1B23. Dobles de "Trabajo de clase" del frontend con `entrega: null` | `backend/src/adapters/db/tareas.ts`, `backend/src/handlers/tareas/tareas.ts`, `frontend/src/features/clases/trabajo-view.test.tsx` (lista cerrada) |
| 9 | `handlers/README.md`: viñetas de `tareas/entregas.ts` y de lo nuevo en `tareas/tareas.ts`. `adapters/README.md`: el párrafo de `referencias.ts` (N-01: ya no dice "las únicas lecturas `FOR KEY SHARE` del proyecto"; nombra la excepción de `entregas.ts`), la fila "Borrar tarea" de la tabla de bloqueos y una sección nueva de `db/entregas.ts` | `backend/src/handlers/README.md`, `backend/src/adapters/README.md` |
| 10 | `lint`, `test` y `build` de `shared`, `backend` y `frontend`, de uno en uno (sección 6) | — |

## 2. PR-1B17 y PR-1B18 en rojo antes del remedio y en verde después

- **Rojo** (paso 4, antes de cambiar `buscarArchivoConfirmado` y `buscarArchivosParaConfirmar`): `cd backend; npx vitest run test/entregas-archivos.integracion.test.ts` → `Tests  4 failed | 1 passed (5)` · última línea `Duration  23.38s (transform 2.18s, setup 88ms, import 4.53s, tests 4.00s, environment 0ms)`. Las cuatro caen por la razón esperada: la descarga de la clase respondió `200` con la URL del archivo de entrega (`expected 200 to be 404`), y publicar un material, crear y editar una tarea con el archivo de entrega respondieron `201`/`201`/`200` y lo confirmaron. La que pasaba es el control de PR-1B17 (los archivos de publicaciones se descargan).
- **Verde** (mismo comando, después del remedio): `Tests  5 passed (5)` · última línea `Duration  23.24s (transform 2.17s, setup 125ms, import 4.41s, tests 3.93s, environment 1ms)`.

## 3. Pruebas requeridas → archivo y título exacto

| Viñeta | Archivo › título exacto |
|---|---|
| PR-1B01 | `backend/src/core/entregas/entregas.test.ts` › "PR-1B01: esTarde es falso hasta el milisegundo de la fecha límite inclusive y verdadero desde el siguiente"; "PR-1B01: entregaCerrada solo sin tardías y ya tarde; con tardías nunca se cierra"; "PR-1B01: el mismo instante escrito con distintos desfases da el mismo resultado (todo se compara en UTC)" |
| PR-1B02 | mismo archivo › "PR-1B02: la matriz completa respeta el orden de los errores (calificada, ya realizada, cerrada, vacía)"; "PR-1B02: cada error es un AppError con su estado HTTP (409, y 400 la vacía) y el mensaje de §D-7"; "PR-1B02: conRetraso en la frontera: falso en la fecha límite exacta, verdadero un milisegundo después (con tardías)"; "PR-1B02: sin tardías se entrega en la fecha límite exacta (sin retraso) y se cierra un milisegundo después"; "PR-1B02: sin adjuntos requeridos, una entrega vacía pasa (Marcar como completada)"; "PR-1B02: exigirEntregaAbierta aplica las mismas reglas sin mirar el contenido (la usa la subida, S-10)" |
| PR-1B03 | mismo archivo › "PR-1B03: decidirAnulacion respeta el orden (no realizada, calificada, cerrada) en toda la matriz"; "PR-1B03: decidirAnulacion lanza AppError 409 con el mensaje de §D-7"; "PR-1B03: accionesDeEntrega nunca contradice a decidirEntrega (con un archivo) ni a decidirAnulacion, en toda la matriz y en la frontera"; "PR-1B03: valores concretos: asignado abierta entrega; entregado abierta anula; cerrada ni entrega ni anula; calificada nada" |
| PR-1B03 bis | mismo archivo › "PR-1B03 bis: estudiante devuelve el id del perfil; maestro y admin devuelven null"; "PR-1B03 bis: handlers/tareas/tareas.ts no compara la relación a mano y usa alumnoDeLaRelacion" (además lo sigue exigiendo `temas-01a-r3.ataque`, en verde) |
| PR-1B04 (core) | mismo archivo › "PR-1B04: la clave de un archivo de entrega es entregas/{tareaId}/{alumnoId}/{archivoId} y empieza con su prefijo"; "PR-1B04: los prefijos y la clave van en minúsculas, y el prefijo de materiales es materiales/{claseId}/"; "PR-1B04: el prefijo de una entrega no es prefijo de la de otro alumno ni de otra tarea, ni de un material" |
| PR-1B04 (`shared/`) | `backend/test/esquemas-entregas.test.ts` › "PR-1B04: acepta http y https y devuelve URL.href (recortado y normalizado)"; "PR-1B04: rechaza javascript:, data:, file:, ftp:, sin protocolo, con usuario o contraseña, vacío, solo espacios y solo https://"; "PR-1B04: 2048 caracteres se aceptan y 2049 se rechazan"; "PR-1B04: un inversor de dirección o un carácter de control queda codificado en el href"; "PR-1B04: la respuesta vuelve a exigir http o https: un enlace javascript: guardado hace fallar el parse"; "PR-1B04: sin campos es una entrega vacía ({ archivoIds: [], enlaces: [] }) y los ids pasan a minúsculas"; "PR-1B04: rechaza 6 enlaces, 6 archivos, ids repetidos (también en mayúsculas) y llaves de más"; "PR-1B04: un enlace inválido dentro de la lista se rechaza con el mensaje del enlace y su posición" |
| PR-1B05 | `backend/test/entregas.integracion.test.ts` › "PR-1B05: sin fila responde asignado, sin fecha ni listas, puedeAnular falso, puedeEntregar según el cierre, y no crea la fila"; "PR-1B05: una tarea de otra clase responde 404 TAREA_NO_ENCONTRADA" |
| PR-1B06 | mismo archivo › "PR-1B06: con 2 archivos y 2 enlaces a tiempo responde 200 entregado, confirma los archivos con entrega_id, sube la versión a 1 y encola un ENTREGA_REALIZADA con solo ids"; "PR-1B06: si la transacción se revierte después de encolar ENTREGA_REALIZADA, no queda trabajo, ni fila de entrega, ni archivo confirmado" |
| PR-1B07 | mismo archivo › "PR-1B07: tarde con entregas tardías aceptadas responde 200 con conRetraso true"; "PR-1B07: tarde sin entregas tardías responde 409 ENTREGA_CERRADA sin fila, archivo confirmado ni trabajo" |
| PR-1B08 | mismo archivo › "PR-1B08: sin archivos ni enlaces, una tarea que no requiere adjuntos se marca como completada (200 entregado con listas vacías)"; "PR-1B08: sin archivos ni enlaces, una tarea que requiere adjuntos responde 400 ENTREGA_VACIA sin escribir nada" |
| PR-1B09 | mismo archivo › "PR-1B09: entregar dos veces responde 409 ENTREGA_YA_REALIZADA y no cambia la entrega ni encola otro trabajo"; "PR-1B09: dos entregas simultáneas del mismo alumno sin fila previa dan un 200 y un 409, una sola fila, un solo trabajo y solo los archivos de la que ganó confirmados". Con la fila retenida: `backend/test/entregas-concurrencia.integracion.test.ts` › "PR-1B09: con la fila de la entrega retenida, dos entregas quedan en serie: un 200 y un 409 ENTREGA_YA_REALIZADA, una sola fila, un solo trabajo y solo los archivos de la primera confirmados" |
| PR-1B09 bis | `backend/test/entregas-concurrencia.integracion.test.ts` › "PR-1B09 bis (a): desde entregado, si pasa primero la anulación, la entrega posterior también pasa (versión v + 2, sus archivos confirmados y un ENTREGA_REALIZADA nuevo con esa versión)"; "PR-1B09 bis (a): desde entregado, si pasa primero la entrega, recibe 409 ENTREGA_YA_REALIZADA y la anulación deja asignado con versión v + 1"; "PR-1B09 bis (b): desde asignado, con la entrega primero y la anulación detrás, la anulación espera y anula lo entregado (versión + 2)"; "PR-1B09 bis (b): desde asignado, si la anulación llega antes, recibe 409 ENTREGA_NO_REALIZADA y la entrega pasa (versión + 1)". O-3 de la Enmienda 1: cada orden lanza la primera operación, espera con `formadasDetrasDe` a que esté formada detrás de la fila de `entregas` retenida y solo entonces la segunda; (b) parte de una fila existente en `asignado`; la ayuda es local (`conFilaDeEntregasRetenida` en `ayudas-entregas.ts`, `timeout` explícito de 30 s) |
| PR-1B10 | `backend/test/entregas.integracion.test.ts` › "PR-1B10: el archivo de otro alumno de la misma tarea"; "PR-1B10: un archivo subido por un maestro con clave materiales/…"; "PR-1B10: un archivo del mismo alumno con clave de materiales (forzado en la base)"; "PR-1B10: un archivo del mismo alumno subido para otra tarea"; "PR-1B10: un archivo ya confirmado en otra entrega o en una publicación"; "PR-1B10: un archivo pendiente de hace más de 24 h"; "PR-1B10: un archivo que no se subió al almacén (ARCHIVO_NO_SUBIDO) y uno distinto de lo declarado (ARCHIVO_INVALIDO)"; "PR-1B10: un archivo de otra clase con el prefijo de esta entrega" |
| PR-1B11 | mismo archivo › "PR-1B11: anular una entrega la deja en asignado, sin fecha ni enlaces, descarta sus archivos y sube la versión"; "PR-1B11: sin fila o ya anulada responde 409 ENTREGA_NO_REALIZADA sin crear ni cambiar nada"; "PR-1B11: una entrega calificada (puesta a mano) responde 409 ENTREGA_CALIFICADA sin tocar sus archivos"; "PR-1B11: una entrega cerrada (P-02 a) responde 409 ENTREGA_CERRADA"; "PR-1B11: un cuerpo con llaves responde 400 sin anular; un cuerpo vacío ({}) anula" |
| PR-1B12 | mismo archivo › "PR-1B12: volver a entregar después de anular, antes de la fecha límite, queda sin retraso y la versión sigue subiendo (1, 2, 3)"; "PR-1B12: volver a entregar después de la fecha límite (con tardías) queda con retraso aunque la primera fuera a tiempo (S-03)" |
| PR-1B13 | mismo archivo › "PR-1B13: con la entrega cerrada, mover la fecha límite a futuro permite entregar a tiempo"; "PR-1B13: con la entrega cerrada, cambiar a aceptar con retraso permite entregar con retraso"; "PR-1B13: anular una entrega cerrada después de mover la fecha límite a futuro funciona" |
| PR-1B14 | mismo archivo › "PR-1B14: responde 201 y guarda la clave entregas/{tareaId}/{alumnoId}/{archivoId}, sin el nombre del archivo y sin devolverla"; "PR-1B14: con la entrega ya realizada, calificada o cerrada responde 409 sin fila nueva"; "PR-1B14: una tarea de otra clase responde 404, y un tipo, una extensión o un tamaño inválidos responden 400, sin fila nueva"; "PR-1B14: sin almacén responde 503 ALMACEN_NO_CONFIGURADO sin fila nueva" |
| PR-1B15 | mismo archivo › "PR-1B15: el alumno descarga el suyo con una URL de adjunto y sin caché"; "PR-1B15: el de otro alumno, uno de material, uno pendiente, uno descartado y uno de otra tarea responden 404 ARCHIVO_NO_ENCONTRADO, igual" |
| PR-1B16 | mismo archivo › "PR-1B16: el maestro de la clase y el admin descargan el archivo del alumno de la ruta"; "PR-1B16: con el :alumnoId de otro alumno responde 404 ARCHIVO_NO_ENCONTRADO"; "PR-1B16: un alumno dado de baja o desactivado responde 404 ALUMNO_NO_ENCONTRADO" |
| PR-1B17 | `backend/test/entregas-archivos.integracion.test.ts` › "PR-1B17: con el id de un archivo de entrega, la descarga de la clase responde 404 ARCHIVO_NO_ENCONTRADO al compañero, al dueño, al maestro y al admin, sin firmar nada"; "PR-1B17: los archivos de un material, de un anuncio y de una tarea se siguen descargando igual para el alumno, el maestro y el admin" |
| PR-1B18 | mismo archivo › "PR-1B18: publicar un material con el id de un archivo de entrega pendiente del mismo usuario responde 400 sin publicar ni confirmarlo"; "PR-1B18: crear una tarea con el id de un archivo de entrega pendiente del mismo usuario responde 400 sin crearla ni confirmarlo"; "PR-1B18: editar una tarea con el id de un archivo de entrega pendiente del mismo usuario responde 400 sin cambiarla ni confirmarlo" |
| PR-1B19 | `backend/test/entregas.integracion.test.ts` › "PR-1B19: 50 por defecto, en orden alfabético con desempate por id, y el cursor avanza sin repetir ni saltar"; "PR-1B19: limite hasta 100 y 101 responde 400"; "PR-1B19: cada fila con su estado (asignado sin fila, entregado, con retraso, calificado), total y entregadas sin contar a quien salió de la clase ni a un desactivado; las filas traen exactamente las llaves del esquema" |
| PR-1B20 | `backend/test/entregas-lecturas.integracion.test.ts` › "PR-1B20: un cursor de un usuario inexistente responde 400 VALIDACION «cursor: no es válido»"; "PR-1B20: una entrega que se crea y un alumno que se inscribe entre la página y los conteos no dejan una respuesta incoherente" |
| PR-1B21 | `backend/test/entregas.integracion.test.ts` › "PR-1B21: un inscrito sin fila responde asignado con version 0; con entrega, sus datos y su versión"; "PR-1B21: de otra clase, dado de baja, desactivado, inexistente o un maestro como :alumnoId responden 404 ALUMNO_NO_ENCONTRADO"; "PR-1B21: una tarea de otra clase responde 404 TAREA_NO_ENCONTRADA en la lista y en la entrega de un alumno" |
| PR-1B22 | `backend/test/tareas-borrar-con-entregas.integracion.test.ts` › "PR-1B22 (a): el maestro autor con 2 entregas recibe 409 TAREA_CON_ENTREGAS con el mensaje en plural y nada cambia"; "PR-1B22 (b): el maestro con 1 entrega recibe el mensaje en singular y nada cambia"; "PR-1B22 (c): el admin sin parámetro, con 1 y con 3 entregas, recibe 409 con su mensaje en singular y en plural, y nada cambia"; "PR-1B22 (d): el admin con ?confirmar=entregas borra con 204: no quedan publicación, tarea, criterios, entregas (también las asignado) ni hilos; los archivos quedan descartado sin contexto y los trabajos de la tarea cancelados"; "PR-1B22 (e): el maestro con ?confirmar=entregas y entregas recibe el mismo 409 del maestro (nunca 403 ni 204); sin entregas, la misma petición borra con 204"; "PR-1B22 (f): con solo filas asignado (una con hilo privado y otra anulada, con su archivo ya descartado), el maestro autor borra con 204 sin parámetro y el hilo se va con la tarea"; "PR-1B22 (g): cuentan una entrega calificada (puesta a mano), la de un alumno dado de baja y la de uno desactivado"; "PR-1B22 (h): el maestro que no puede borrar (el autor sigue en la clase) recibe 403 BORRADO_NO_PERMITIDO sin el conteo, y una tarea de otra clase con entregas responde 404 TAREA_NO_ENCONTRADA"; "PR-1B22 (i): una consulta inválida responde 400 VALIDACION sin escribir, para el maestro y el admin; sin consulta y sin entregas, 204 como siempre"; "PR-1B22 (j): un estudiante con ?confirmar=entregas recibe 403 ROL_NO_PERMITIDO y un alumno restringido 403 ACCESO_RESTRINGIDO; nada cambia". La foto de cada `409` incluye publicación, tarea, criterios, entregas (`estado`, `version`), comentarios de los hilos, archivos (`estado`, `publicacion_id`, `entrega_id`), `trabajo_id` (en la fila de la tarea) y los trabajos `RECORDATORIO_24H`, `TAREA_CREADA` y `ENTREGA_REALIZADA` con su estado |
| PR-1B22 bis | `backend/test/entregas-concurrencia.integracion.test.ts` › "PR-1B22 bis (a): una entrega en curso retiene la tarea y el borrado del maestro sin parámetro espera y, al confirmar la entrega, responde 409 con un conteo que la incluye; nada se borra"; "PR-1B22 bis (b): el borrado del admin con el parámetro retiene la tarea y una entrega que llega espera y responde 404 TAREA_NO_ENCONTRADA, sin fila de entrega, sin archivo confirmado y sin ENTREGA_REALIZADA"; "PR-1B22 bis (b): con el borrado retenido, una anulación que llega espera y responde 404 TAREA_NO_ENCONTRADA, sin 500 por la llave foránea de los archivos"; "PR-1B22 bis (c): un comentario privado en curso (fabricado: toma la tarea con bloqueo de llave compartida y deja una fila asignado con su comentario) hace esperar al borrado del maestro, que después responde 204 y se lleva el hilo"; "PR-1B22 bis (d): una anulación que confirma antes del borrado del maestro deja el conteo en 0 y el borrado pasa con 204". Sobre (c): es la carrera de O-3 de la Enmienda 2 ("comentario primero y luego el borrado → 204"), con el comentario fabricado dentro de la retenedora porque el hilo es de 01c; la variante "borrado primero y comentario después → 404" es de 01c (PR-1C06) |
| PR-1B23 | `backend/test/entregas-lecturas.integracion.test.ts` › "PR-1B23: el alumno recibe en cada tarea su entrega (estado y conRetraso) o null, nunca la de otro alumno; los materiales, null"; "PR-1B23: el maestro y el admin reciben null en todos los elementos"; "PR-1B23: con alumno, la consulta de entregas es una sola por página (también con una página de 10 tareas); sin alumno, ninguna" |
| PR-1B24 | `backend/test/entregas-autorizacion.integracion.test.ts` › "PR-1B24: son las ocho rutas de la tabla de Autorización, cinco del alumno y tres de los maestros"; "PR-1B24: cada ruta: sin token, 401 NO_AUTENTICADO"; "PR-1B24: rol incorrecto: el maestro de la clase y el admin en las rutas del alumno, y el alumno inscrito en las de los maestros, reciben 403 ROL_NO_PERMITIDO sin escribir"; "PR-1B24: clase ajena (alumno no inscrito en las del alumno, maestro de otra clase en las de los maestros) y clase inexistente responden igual: 403 SIN_ACCESO_A_LA_CLASE"; "PR-1B24: cada ruta: el alumno restringido recibe 403 ACCESO_RESTRINGIDO y después no hay fila de entrega, archivo ni trabajo nuevos"; "PR-1B24: cada ruta: con cambio de contraseña pendiente, 403 CAMBIO_DE_CONTRASENA_REQUERIDO"; "PR-1B24: con los ids de la ruta en mayúsculas, el alumno, el maestro y el admin reciben la respuesta de la ruta"; "PR-1B24: ninguna respuesta de este archivo (de ningún rol, también las de error) contiene estadoPago, deudor, al_corriente, accesoRestringido ni un correo" (los alumnos de la clase son deudores) |
| PR-1B25 | mismo archivo › "PR-1B25: en una clase donde no es maestro, el admin lista las entregas, ve la de un alumno y descarga sus archivos"; "PR-1B25: las cinco rutas del alumno le responden 403 ROL_NO_PERMITIDO al admin" |
| PR-1B26 | `backend/test/entregas-concurrencia.integracion.test.ts` › "PR-1B26: con la fila de la entrega retenida más que el timeout de la transacción, entregar rechaza con 503 SERVICIO_OCUPADO y no escribe nada" (retención que vence; se llama al adaptador, ver Desviación 8) |
| PR-1B27 | `backend/src/core/tareas/tareas.test.ts` › "PR-1B27: la matriz entregas (0, 1, 2, 30) × rol (admin, maestro, estudiante) × confirmación: con 0 nunca lanza; con al menos una, solo el admin con confirmación pasa"; "PR-1B27: los mensajes exactos de §D-3.8 en singular (1) y en plural (2 y 30), para el admin y para el maestro"; "PR-1B27: el maestro con confirmación recibe el mismo 409 que sin ella (nunca un 403)" |
| PR-1B28 | `backend/test/esquemas-entregas.test.ts` › "PR-1B28: acepta {} y { confirmar: 'entregas' }"; "PR-1B28: rechaza 'true', 'ENTREGAS', '', un arreglo y una llave de más" |

Todas las viñetas de 01b tienen caso. Las integraciones de cierre y retraso usan fechas con al menos 2 h de margen respecto de la hora real (la frontera del milisegundo solo en `core/`). Ninguna prueba pide `LOCK TABLE`; las retenciones son de fila y la ayuda local pasa `timeout: 30_000` y `maxWait: 5_000`.

## 4. Pruebas normales que cambié (todas de la lista cerrada)

- `backend/test/archivos.integracion.test.ts` › "PR-D05f: un error forzado dentro de la transacción no deja archivos confirmados ni trabajos": la llamada a `buscarArchivosParaConfirmar` suma `prefijo: prefijoDeMateriales(e.claseId)` y su importación (`git diff --stat`: 2 inserciones). Ninguna aserción cambió.
- `backend/test/bloqueo-usuario.integracion.test.ts` › E6: título nuevo "E6: solo salud.ts, bloqueo-usuario.ts, enlaces-registro.ts, invitaciones.ts, publicaciones.ts, referencias.ts, temas.ts, categorias.ts, tareas.ts y entregas.ts usan SQL etiquetado en adapters/db", la lista suma `"entregas.ts"` entre `"enlaces-registro.ts"` e `"invitaciones.ts"` y el comentario de `:677-684` suma dos líneas de ENTREGAS-01b (N-02). Nada más.
- `frontend/src/features/clases/trabajo-view.test.tsx`: la interfaz local `Elemento` y los dobles `tarea()` y `material()` suman `entrega: null` (4 inserciones). Ninguna aserción cambió.
- Sin cambio, por diseño: `lecturas-consistentes.integracion.test.ts` (el compilador no pidió `alumnoId`) y `tareas.integracion.test.ts:780` (`confirmarEntregas` opcional).
- Ninguna otra prueba normal cayó. Las únicas pruebas de archivos existentes en las que sumé casos nuevos (sin tocar los existentes) son `core/tareas/tareas.test.ts` (PR-1B27, donde el plan la ubica).

## 5. Conteos

| | Antes | Después | Comando |
|---|---|---|---|
| backend | 177 archivos / 2233 pruebas | **185 archivos / 2348 pruebas** | `cd backend; npx vitest list` (contadas con `grep -a -c " > "` y archivos únicos con `sed 's/ > .*//' \| sort -u`) |
| frontend | 153 / 2271 (del orquestador) | **153 archivos / 2271 pruebas** | `cd frontend; npx vitest list` (mismo conteo) |

Backend: +8 archivos (`core/entregas/entregas.test.ts` 18, `esquemas-entregas.test.ts` 10, `entregas-archivos.integracion` 5, `entregas.integracion` 43, `entregas-concurrencia.integracion` 11, `tareas-borrar-con-entregas.integracion` 10, `entregas-autorizacion.integracion` 10, `entregas-lecturas.integracion` 5 = 112) y `core/tareas/tareas.test.ts` pasa de 11 a 14 (+3): 2233 + 115 = 2348. Las corridas dan las mismas cifras (sección 6).

## 6. Verificación (una suite a la vez, en este orden)

- **shared build:** `cd shared; npm run build` → `> tsc -p tsconfig.json` (código 0).
- **shared lint:** `cd shared; npm run lint` → `All matched files use Prettier code style!`.
- **backend lint:** `cd backend; npm run lint` → `> tsc -p tsconfig.json --noEmit && tsc -p tsconfig.test.json` (código 0; ESLint y Prettier sin hallazgos).
- **backend test:** `cd backend; npm test > <scratchpad>/test-back.txt 2>&1`, de 14:57:19Z a 15:00:50Z, código 0 → `Test Files  185 passed (185)` · `Tests  2348 passed (2348)` · última línea `Duration  202.53s (transform 29.85s, setup 8.11s, import 355.00s, tests 1605.26s, environment 102ms)`.
- **backend build:** `cd backend; npm run build` → `> tsc -p tsconfig.json` (código 0).
- **frontend lint:** `cd frontend; npm run lint` → `> tsc -b` (código 0).
- **frontend test:** `cd frontend; npm test > <scratchpad>/test-front.txt 2>&1`, código 0 → `Test Files  153 passed (153)` · `Tests  2271 passed (2271)` · última línea `Duration  208.19s (transform 61.26s, setup 189.58s, import 551.22s, tests 934.59s, environment 465.91s)`.
- **frontend build:** `cd frontend; npm run build` → `✓ built in 8.97s` (con la advertencia de tamaño de chunk de siempre).
- **prisma validate:** n/a (sin cambios de esquema).

**PA-07** sobre `test-back.txt` (`grep -a -o -F` y la atribución por `pid` y `requestId` del script del tester):

| Término | Cuenta |
|---|---|
| `40P01` | 0 |
| `deadlock detected` | 0 |
| `could not serialize` | 0 |
| `too many clients` | 0 |
| `"Error no controlado"` | 10, exactamente los de I-1: 5 + 1 de `POST /api/auth/login` (fallos simulados), 3 `ZodError` de `archivos-d-r2` T-39 (`POST …/archivos`, `POST …/archivos/:id/descarga`, `GET …/publicaciones`) y 1 `boom` de `GET /api/prueba/error-comun` |
| `"code":"P2028"` | 5, todos permitidos |
| `Unable to start a transaction` | 0 |

Control positivo completo: los tres de `servicio-ocupado` (`POST /api/auth/cambiar-contrasena` › `tx.sesion.findFirst()`, `POST /api/auth/refrescar` › `tx.sesion.updateMany()`, `POST …/publicaciones/:id/comentarios` › `prisma.$queryRawUnsafe()`, mismo `pid`, nivel 40) y los dos de `cuentas-r3` (`POST /api/auth/login` › `tx.sesion.create()`, `POST /api/auth/restablecer` › `tx.tokenCuenta.updateMany()`). Ningún `P2028` ni `"Error no controlado"` sale de una ruta de entregas o de tareas. **PA-07 limpia.**

## 7. V-01

`git ls-files -co --exclude-standard | grep -E '\.ataque\.test\.tsx?$'`, `sha256sum` de cada uno y `diff` contra la tabla de la ronda 0 de 01b de `reporte-tester.md`: **166/166 iguales**, 0 faltantes, 0 sobrantes. No toqué ninguna `*.ataque`.

## 8. "No se toca"

- Dentro de los paquetes, base `82888dd`: `git diff --stat 82888dd -- backend/src/middleware backend/src/adapters/auth backend/src/adapters/notifier backend/src/adapters/storage backend/src/adapters/live backend/src/config backend/src/workers backend/src/worker.ts backend/src/server.ts backend/src/adapters/db/cliente.ts backend/src/adapters/db/errores.ts backend/src/adapters/db/referencias.ts backend/src/adapters/db/bloqueo-clase.ts backend/src/core/autoria.ts backend/src/core/clases backend/src/handlers/clases backend/src/handlers/validacion.ts backend/src/handlers/errores.ts backend/src/handlers/archivos.ts backend/test/setup.ts backend/test/global-setup.ts backend/test/ayudas-auth.ts backend/test/ayudas-clases.ts backend/test/ayudas-concurrencia.ts backend/test/ayudas-cuentas.ts backend/test/ayudas-tareas.ts backend/test/almacen-en-memoria.ts backend/test/notifier-en-memoria.ts backend/test/preparar-cola.ts backend/test/entorno-de-pruebas.ts backend/.env.example frontend/.env.example backend/package.json frontend/package.json shared/package.json frontend/src/services frontend/src/app frontend/src/styles frontend/src/components frontend/src/lib frontend/vitest.config.ts frontend/src/features/auth frontend/src/features/admin frontend/src/features/diagnostico frontend/src/features/tareas backend/prisma` → **vacío**.
- `features/clases` (sin `*.ataque`): `git diff --stat 82888dd -- frontend/src/features/clases ':!*.ataque.test.tsx'` → solo `trabajo-view.test.tsx | 4 ++++` (lista cerrada).
- Fuera de los paquetes, base `dd8edcb`: `git diff --stat dd8edcb -- AGENTS.md CLAUDE.md .claude/agents infra package.json package-lock.json` → **vacío**; y `git diff --stat 82888dd -- docs/ARCHITECTURE.md docs/ARCHITECTURE-ESSENTIALS.md docs/PRD.md docs/DESIGN.md` → **vacío** (no los toqué).
- Fuera de A-2 no cambié código cerrado: los de A-2 que sí toqué son `adapters/db/archivos.ts`, `inscripciones.ts` (solo el renombre exportado), `tareas.ts`, `db/index.ts`, `handlers/adjuntos.ts` y `core/archivos/politica.ts`. `adapters/db/temas.ts` y `publicaciones.ts` no cambiaron.

## 9. Hermanos y estados vecinos

**Entregar y anular, por estado de la fila, cierre y tardías** (la decisión es siempre de `core/` con la tarea y la fila bloqueadas):

| Estado de partida | Abierta | Vencida con tardías | Cerrada (sin tardías, vencida) |
|---|---|---|---|
| Sin fila (asignado) | Entregar 200 y crea la fila (PR-1B06); anular 409 `ENTREGA_NO_REALIZADA` sin crear fila (PR-1B11) | Entregar 200 con retraso (PR-1B07) | Entregar 409 `ENTREGA_CERRADA` sin fila, archivo ni trabajo (PR-1B07); subir 409 (PR-1B14) |
| Fila en asignado (tras anular, o por el hilo) | Entregar 200, la versión sigue (PR-1B12, PR-1B09 bis b); anular 409 (PR-1B11 "ya anulada") | Entregar 200 con retraso aunque la primera fuera a tiempo (PR-1B12) | Entregar 409 (matriz de PR-1B02; la ruta es la misma que sin fila) |
| Entregado | Entregar 409 `ENTREGA_YA_REALIZADA` (PR-1B09); anular 200 (PR-1B11); subir 409 (PR-1B14) | Anular 200 (matriz de PR-1B03; misma ruta que abierta) | Anular 409 `ENTREGA_CERRADA` (PR-1B11); reabrir con la fecha a futuro permite anular (PR-1B13) |
| Calificado (puesto a mano) | Entregar 409 `ENTREGA_CALIFICADA` (PR-1B02); anular 409 sin tocar archivos (PR-1B11); subir 409 (PR-1B14) | Igual (el orden de §D-3.1 mira primero el estado) | Igual |

- `requiereAdjuntos` sí/no × vacío, archivo o enlace: matriz de PR-1B02 e integración PR-1B08.
- Reapertura (P-02 a): mover la fecha a futuro (PR-1B13, entregar y anular) y cambiar a aceptar tardías (PR-1B13). La frontera del milisegundo: solo `core/` (PR-1B01, PR-1B02).
- Carreras: entregar contra entregar (PR-1B09, con y sin retención), entregar contra anular en los dos órdenes y desde los dos estados (PR-1B09 bis), entregar y anular contra borrar (PR-1B22 bis a, b, d), timeout de la transacción (PR-1B26). Entregar mientras el maestro cambia la fecha o `aceptaTardias`: queda en serie por diseño (`FOR KEY SHARE` contra `FOR NO KEY UPDATE` no chocan; la entrega decide con la tarea confirmada que vio), sin prueba propia en 01b.

**Subida y descarga, por ruta y tipo de usuario:**

| Ruta | Alumno dueño | Compañero | Maestro de la clase | Admin | Remedio aplicado |
|---|---|---|---|---|---|
| `POST /clases/:id/archivos/:archivoId/descarga` (clase) | 404 con archivo de entrega | 404 | 404 | 404 | Sí: `publicacionId: { not: null }` (PR-1B17); materiales, anuncios y tareas siguen en 200 |
| `POST …/entrega/archivos/:archivoId/descarga` | 200 `attachment`, `no-store` (PR-1B15) | No llega a otro: la ruta usa su propio id; el id de otro alumno da 404 (PR-1B15) | 403 rol (PR-1B24) | 403 rol (PR-1B25) | Filtro `entrega: { tareaId, alumnoId }` |
| `POST …/entregas/:alumnoId/archivos/:archivoId/descarga` | 403 rol (PR-1B24) | 403 rol | 200 (PR-1B16); `:alumnoId` de otro, 404 (PR-1B16); baja o desactivado, 404 `ALUMNO_NO_ENCONTRADO` | 200 (PR-1B16, PR-1B25) | Inscripción activa por PK + el mismo filtro |
| `POST …/entrega/archivos` (subida) | 201 (PR-1B14) | Sube a su propia clave | 403 rol | 403 rol | S-10 con `exigirEntregaAbierta` |
| Confirmar en una publicación (muro, crear y editar tarea) | — | — | Archivo de entrega: 400 (PR-1B18) | Mismo camino (`archivosParaPublicar`) | Prefijo de materiales obligatorio |
| Confirmar en una entrega | Material propio, de otra tarea, de otra clase, de otro alumno o de un maestro: 400 (PR-1B10) | — | — | — | Prefijo de la entrega obligatorio |

- La vista previa de una imagen de entrega (`adjuntosParaResponder`, URL `inline` de 5 minutos) sale en las respuestas de las rutas de entrega del alumno y de los maestros, con la misma regla que en el muro; no es una ruta de descarga nueva.
- El `UPDATE` que confirma en `crearPublicacion` y en `confirmarArchivos` de `tareas.ts` no repite el prefijo (decisión del plan, §D-3.6): la lectura previa ya filtró y el `CHECK` impide dos contextos. El `UPDATE` de la entrega sí lo repite.
- Mayúsculas: `tareaId`, `alumnoId` y `archivoId` de las ocho rutas y los `archivoIds` del cuerpo pasan a minúsculas (PR-1B24 con ids en mayúsculas); la clave de entrega siempre nace en minúsculas; el prefijo de materiales se compara sin distinguir mayúsculas porque la clave de un material lleva el `:claseId` tal como llegó (Desviación 6).

**`borrarTarea`, con y sin entregas, con y sin parámetro, por rol:**

| Llamador | Sin entregas, sin parámetro | Sin entregas, con parámetro | Con entregas, sin parámetro | Con entregas, con parámetro |
|---|---|---|---|---|
| Maestro autor | 204 (PR-1B22 i) | 204 (PR-1B22 e) | 409 del maestro, singular y plural (PR-1B22 a, b) | El mismo 409 (PR-1B22 e) |
| Maestro que no puede borrar | 403 `BORRADO_NO_PERMITIDO` (autoría primero) | 403 | 403 sin conteo (PR-1B22 h) | 403 |
| Admin | 204 (TAREAS-01, sin cambio) | 204: con 0 entregas la regla nunca lanza (PR-1B27); sin caso de integración propio | 409 del admin, singular y plural (PR-1B22 c) | 204 en cascada (PR-1B22 d) |
| Estudiante | 403 rol | 403 rol (PR-1B22 j) | 403 rol | 403 rol (PR-1B22 j) |
| Restringido | 403 `ACCESO_RESTRINGIDO` (PR-1B22 j) | igual | igual | igual |

- Qué cuenta: `entregado` y `calificado`, también de alumnos dados de baja o desactivados (PR-1B22 g); las `asignado` no cuentan y se van con la tarea, con su hilo (PR-1B22 f, PR-1B22 bis c).
- Consultas inválidas (`true`, `ENTREGAS`, vacío, repetido, otra llave) → 400 para maestro y admin (PR-1B22 i, PR-1B28). Tarea de otra clase → 404 (PR-1B22 h).

**`listarTrabajo` por relación:** estudiante → su entrega o `null`, nunca la de otro (PR-1B23); maestro y admin → `null` en todos, sin consulta de entregas (PR-1B23); materiales → `null`; página sin tareas → ninguna consulta de entregas; página con tareas → exactamente una (`entrega.findMany`, contada con el ejecutor envuelto, PR-1B23). El filtro por tema (`tema=<uuid>`) usa el mismo código que `sin-tema`; sin caso propio con entregas.

**Cursor de `listarEntregas`:** sin cursor y avanzando sin repetir ni saltar (PR-1B19); usuario inexistente → 400 (PR-1B20); la página y los conteos en la misma instantánea (PR-1B20). Un cursor de un alumno dado de baja o desactivado, o de un maestro, sirve (regla del roster, N-04, aceptada en §D-0.7); no lo probé aparte porque la función es la misma del roster, sin cambios.

**`titulo ?? ""`:** `leerTarea` (01a) y `listarTrabajo` (01b) responden ahora un error controlado si faltara el título; no queda otro `?? ""` de título en `adapters/db/tareas.ts`.

## 10. Desviaciones, PARADAS y lo no verificado

**PARADAS:** ninguna. Ninguna `*.ataque` ni prueba normal fuera de la lista cerrada cayó; sin migración.

**Desviaciones (de forma, no de contrato):**
1. `alumnoDeEntregaParamSchema` y los demás parámetros de entregas se arman sobre un `tareaDeEntregaParamSchema` propio de `shared/src/entregas.ts` (mismo mensaje y mismo paso a minúsculas que `tareaIdParamSchema`), no con `tareaIdParamSchema.extend(alumnoIdParamSchema.shape)`: `tareas.ts` importa `estadoEntregaSchema` de `entregas.ts`, y la importación de vuelta dejaba un esquema sin inicializar al cargar el índice. Además `alumnoIdParamSchema` de `clases.ts` no pasa el id a minúsculas, y el plan pide los ids en minúsculas.
2. `anularEntregaSchema` (`z.strictObject({})`) vive en `shared/` y el handler solo lo valida si llega un cuerpo (`validarCuerpo` rechaza un cuerpo ausente).
3. `exigirEntregaAbierta` (exportada de `core/`) son las reglas de `decidirEntrega` sin `ENTREGA_VACIA`; `decidirEntrega` la llama y la subida (S-10) también.
4. Las descargas de entrega, `listarEntregas` y `leerEntregaDeAlumno` comprueban primero la tarea en la clase (`404 TAREA_NO_ENCONTRADA`), como pide la viñeta "En todas" de "Autorización"; §D-3.6 solo nombraba el filtro del archivo.
5. `ALUMNO_NO_ENCONTRADO` lo lanza el adaptador (`alumnoNoEncontrado` de `core/entregas/entregas.ts`); `TAREA_NO_ENCONTRADA` de lectura y escritura sale por `null` hacia el handler, como en `tareas.ts`.
6. `buscarArchivosParaConfirmar` compara el prefijo con `mode: "insensitive"` y los prefijos nacen en minúsculas: la clave de un material lleva el `:claseId` tal como llegó a la ruta de subida (`claveDeMaterial` no cambia, por el plan), y sin esto un material subido con el id de la clase en mayúsculas dejaría de confirmarse. Los ids son UUID y `/`, así que el `ILIKE` no tiene comodines.
7. El `POST …/entrega` usa el `claseId` en minúsculas para los datos de `ENTREGA_REALIZADA`.
8. PR-1B26 llama al adaptador `entregar` con la fila de la entrega retenida 5,5 s (la transacción vence a los 5 s): la ruta HTTP habría dejado una sexta línea `"code":"P2028"` en la salida y PA-07 exige exactamente las 5 permitidas. Que un `AppError` 503 llegue igual a la respuesta HTTP lo cubren las pruebas de `servicio-ocupado`.
9. PR-1B04 de `core/` vive en `core/entregas/entregas.test.ts`; la de `shared/` y PR-1B28, en `test/esquemas-entregas.test.ts` (nuevo), para no tocar `esquemas-tareas.test.ts`, que no está en la lista cerrada.
10. `listarTrabajo`: un error `ERROR_INTERNO` propio para un elemento sin título (inalcanzable), porque el de `leerTarea` dice "La tarea no tiene título." y aquí también hay materiales.

**Observaciones y pendientes:**
- `enlaceDeEntregaSchema` limita a 2048 caracteres la entrada, como dice el plan; el `href` normalizado puede quedar más largo si lleva caracteres que se codifican (por ejemplo, un inversor pasa de 1 a 9 caracteres). No lo limité porque el plan no lo pide; la base acota a 5 enlaces.
- R-17 sigue pendiente (comentario de cabecera de `adapters/db/referencias.ts`, "No se toca"); el párrafo de `adapters/README.md` ya está corregido (N-01).
- La viñeta antigua de `archivos.ts` en `handlers/README.md` (CLASES-d) no la reescribí; la viñeta nueva de 01b dice que la descarga de la clase solo sirve archivos de publicaciones.

**No verificado:** la subida y la descarga reales contra MinIO (las pruebas usan el doble del almacén; H-1 queda para la comprobación humana de 01e); el `503` de `entregar` por la ruta HTTP (ver Desviación 8).


# Resumen del programador — ENTREGAS-01b — Corrección de la ronda 1 (T-01)

**T-01: corregido.** No hubo PARADAS ni desviaciones. No toqué ninguna `*.ataque` ni ninguna prueba normal de la lista cerrada, y no hice commit.

## Cambio exacto

- **Archivo:** `shared/src/entregas.ts`, en `enlaceDeEntregaSchema`.
- **Qué cambia:** después de `.transform((texto) => new URL(texto).href)` se suma `.pipe(z.string().max(LONGITUD_MAXIMA_ENLACE, MENSAJE_ENLACE))`, con un comentario que explica el porqué.
- **Resultado:** el tope de 2048 se mide también sobre el enlace normalizado, que es el que se guarda y se devuelve. El tope sobre el texto crudo se conserva, para no procesar entradas enormes.
- **Error:** si la forma normalizada pasa de 2048, el esquema responde `400 VALIDACION` con el mensaje único de enlaces («Escribe un enlace que empiece con https:// o http://.»). En `entregarSchema` el error lleva la ruta `enlaces.N`. Como el esquema falla en `validarCuerpo`, antes de cualquier transacción, no se escribe nada.
- **Alcance:** es una sola regla en `shared/`. El servidor ya la usa y el frontend la usará en 01d. No cambié nada en el backend.

## Pruebas nuevas

- **Archivo:** `backend/test/esquemas-entregas.test.ts` › describe "enlaceDeEntregaSchema mide el enlace normalizado (T-01)". Son 4 casos:
  - "T-01: un enlace crudo de 2048 caracteres que al normalizar pasa de 2048 se rechaza con el mensaje de enlaces (ñ, espacios e inversores)"
  - "T-01: un enlace crudo corto que normaliza a 2048 o menos se acepta y queda normalizado"
  - "T-01: exactamente 2048 caracteres normalizados se aceptan y 2049 se rechazan"
  - "T-01: dentro de entregarSchema, el enlace que se alarga de más se rechaza en su posición"
- **La prueba del tester** `backend/test/entregas-01b-r1.ataque.test.ts` › "T-r1-2 (N-02): …" pasa en verde. Con el remedio, las tres variantes responden `400 VALIDACION`.

## Hermanos y estados vecinos

| Límite que se mide antes de una transformación | ¿Aplica el patrón? | Qué hice |
|---|---|---|
| Largo de un enlace de entrega: entregar del alumno (PR-1B06), lectura del alumno y lectura del maestro | Sí: es el hallazgo | Corregido en el esquema, que es el único punto de entrada. Las dos lecturas devuelven lo guardado, que ya cumple el tope |
| Tope de 5 enlaces (`entregarSchema`) | No: se cuenta la lista tal como llega, y la transformación no quita ni junta enlaces (no hay deduplicación ni se descartan vacíos; un vacío se rechaza) | Nada |
| Tope de 5 archivos y "sin repetidos" de `archivoIds` | No: la transformación solo pasa a minúsculas, que no cambia el largo. Los repetidos con distinta capitalización ya se comparan en minúsculas antes de transformar (PR-1B04) | Nada |
| Nombre de archivo (`validarArchivoDeclarado`: de 1 a 255 puntos de código, caracteres prohibidos) | No: el nombre se guarda tal como llega. `disposicionDeContenido` solo lo codifica para la cabecera de la URL firmada, no lo guarda ni lo devuelve en el JSON, y no tiene tope propio | Nada |
| Textos largos con `normalizarTextoLargo` (título, instrucciones y rúbrica de la tarea; título, texto y comentarios del muro) | No: `conTextosNormalizados` y `conTextosDeTareaNormalizados` normalizan antes de validar (§D-C4), y la normalización solo acorta (CRLF a LF, `trim`). El máximo se mide sobre lo que se guarda | Nada |
| `descripcionClaseSchema` | No: `trim`, después `transform` y después `pipe(textoLargoSchema(2000))`. Mide después de transformar | Nada |
| Nombres de tema y de categoría (`claveDeNombre`, NFKC) | No: la clave normalizada solo sirve para comparar repetidos, no se guarda. El nombre guardado es el crudo, medido | Nada |
| Término de búsqueda (`normalizarTerminoDeBusqueda`) | No: ya mide crudo (1000) y normalizado (120) | Nada |
| `nombre_busqueda` de una cuenta (`normalizarParaBusqueda`, NFD: los silabarios hangul pueden alargarse) | No es un tope que se mida y se exceda: es una columna interna sin límite propio, que no se devuelve | Nada (fuera del hallazgo) |
| Código de clase (`normalizarCodigoDeClase`) | No: la normalización solo quita separadores y pasa a mayúsculas, así que acorta | Nada |

**Estados vecinos del mecanismo** (el enlace pasa por validar → normalizar → guardar → responder):

| Estado | Resultado | Prueba |
|---|---|---|
| Crudo largo que normaliza largo | Rechazado | T-01 caso 1; `T-r1-2` por HTTP |
| Crudo corto que normaliza corto | Aceptado y normalizado | T-01 caso 2; PR-1B04 |
| Frontera exacta normalizada (2048 / 2049) | Aceptado / rechazado | T-01 caso 3 |
| Crudo de más de 2048 | Rechazado por el tope crudo | PR-1B04 |
| Enlace dentro de la lista, en una posición distinta de la primera | Rechazado en su posición | T-01 caso 4 |
| Lectura de un enlace ya guardado | Nunca supera el tope | Solo el esquema escribe enlaces; en 01b no hay datos previos |

Al validar en el frontend (01d), el mismo esquema dará el mismo error.

## Conteos

| | Antes | Después | Comando |
|---|---|---|---|
| backend | 186 archivos / 2369 pruebas (con la `*.ataque` del tester) | **186 archivos / 2373 pruebas** (+4: `esquemas-entregas.test.ts` pasa de 10 a 14) | `cd backend; npx vitest list` (`grep -a -c " > "`; archivos únicos con `sed 's/ > .*//' \| sort -u`) |
| frontend | 153 / 2271 | **153 / 2271** | `cd frontend; npx vitest list` |

## Verificación (de una en una)

- **shared build:** `cd shared; npm run build` → `> tsc -p tsconfig.json`.
- **shared lint:** `npm run lint` → `All matched files use Prettier code style!`.
- **backend lint:** `cd backend; npm run lint` → `> tsc -p tsconfig.json --noEmit && tsc -p tsconfig.test.json`.
- **backend test:** `npm test > <scratchpad>/r1-test-back.txt 2>&1`, código 0 → `Test Files  186 passed (186)` · `Tests  2373 passed (2373)` · `Duration  116.58s (transform 13.42s, setup 5.42s, import 201.82s, tests 929.21s, environment 49ms)`.
- **backend build:** `npm run build` → `> tsc -p tsconfig.json`.
- **frontend lint:** `cd frontend; npm run lint` → `> tsc -b`.
- **frontend test:** `npm test` → `Test Files  153 passed (153)` · `Tests  2271 passed (2271)` · `Duration  96.93s (transform 24.09s, setup 63.12s, import 200.87s, tests 436.80s, environment 294.74s)`.
- **frontend build:** `npm run build` → `✓ built in 1.30s`.

## PA-07

Atribuido con `pa07-tester.mjs` sobre `r1-test-back.txt`.

| Término | Cuenta |
|---|---|
| `40P01` | 0 |
| `deadlock detected` | 0 |
| `could not serialize` | 0 |
| `too many clients` | 0 |
| `Unable to start a transaction` | 0 |
| `"Error no controlado"` | 10, exactamente I-1: 6 de `POST /api/auth/login`, 3 `ZodError` de T-39 y 1 `boom` |
| `"code":"P2028"` | 5, los permitidos |

Los 5 `P2028` son el control positivo completo: `cambiar-contrasena`, `refrescar` y comentarios del muro (de `servicio-ocupado`), más `login` y `restablecer` (de `cuentas-r3`). **PA-07 limpia.**

## V-01

Comparé el SHA-256 de las `*.ataque` contra la tabla de la ronda 1 de 01b en `reporte-tester.md`: **167/167 iguales**, sin faltantes ni sobrantes.

## "No se toca"

- `git diff --stat 82888dd --` sobre las mismas rutas de la entrega anterior (middleware, adapters protegidos, config, workers, `referencias.ts`, `handlers/archivos.ts`, ayudas compartidas de `backend/test/`, `package.json`, servicios y librerías protegidas del frontend, `features/tareas`, `backend/prisma`, `docs/ARCHITECTURE*.md`, `PRD.md` y `DESIGN.md`) → **vacío**.
- `git diff --stat dd8edcb -- AGENTS.md CLAUDE.md .claude/agents infra package.json package-lock.json` → **vacío**.
- Archivos tocados en esta corrección: `shared/src/entregas.ts` y `backend/test/esquemas-entregas.test.ts`.


# Resumen del programador — ENTREGAS-01c — Implementación

Hice los 5 pasos de 01c.

- **Plan:** `plan.md`, LISTO.
- **Base de comparación:** `159cc7e` dentro de los paquetes y `dd8edcb` fuera.
- **Sin cambios de este tipo:** ninguna PARADA, ninguna desviación, ninguna migración, ninguna dependencia nueva y ningún commit.
- **Pruebas existentes:** no toqué ninguna `*.ataque` ni ninguna prueba normal; la lista cerrada de 01c no hizo falta.

## Pasos

### 1. Esquemas en `shared/`

En `shared/src/entregas.ts`:
- `comentarioPrivadoSchema`: `z.strictObject` con `id`, `texto`, `autor` (`autorDelMuroSchema`), `creadoEn` y `propio`. No lleva `puedeBorrar` (S-04).
- `comentarioPrivadoRespuestaSchema` y `listaComentariosPrivadosRespuestaSchema`, ambos estrictos.
- Sus tipos, reexportados en `shared/src/index.ts`.

El cuerpo de un comentario reutiliza `crearComentarioSchema` de `clases.ts`: de 1 a 1000 caracteres visibles. Los nombres nuevos no entran en el patrón de la regla de 7 esquemas de `entregas-01b-r1`, como prevé el manager. `npm run build` de `shared` pasa.

### 2. Evento del comentario

En `backend/src/core/eventos/avisos-de-clase.ts`:
- `datosComentarioCreadoSchema` pasa a ser `z.union([datosComentarioDelMuroSchema, datosComentarioPrivadoSchema])`: dos `z.strictObject` con llaves distintas (`publicacionId` o `entregaId`).
- `DatosComentarioCreado` conserva el nombre y la forma del muro, y se suman los alias `DatosComentarioDelMuro` y `DatosComentarioPrivado`.
- `core/eventos/avisos-de-clase.test.ts` no cambió y sigue en verde.

PR-1C08 está en `backend/src/core/eventos/comentario-creado.test.ts`, que es nuevo.

### 3. Adaptador del hilo

En `backend/src/adapters/db/entregas.ts`:
- **`listarHiloPrivado`** corre en una instantánea única. Es el cuarto literal `instantaneaUnica: true` del archivo (`grep -c` da 4) y ninguno está en comentarios. Lee, en este orden:
  - la tarea, por `(id, clase_id)`;
  - el alumno de la ruta, solo si `comprobarInscripcion` (inscripción por PK, cuenta activa, rol estudiante);
  - la entrega. Sin fila, el hilo sale vacío y no se crea; un cursor sin fila responde `400`;
  - el cursor, comprobado contra `(id, entrega_id)`;
  - la página, por `(entrega_id, creado_en, id)` en orden ascendente.
- **`comentarEnHiloPrivado`** corre en READ COMMITTED. Pasos:
  - reutiliza `bloquearTareaParaEntregar`, así que `FOR KEY SHARE` sigue apareciendo una sola vez (`grep -c` da 1);
  - comprueba al alumno, si aplica;
  - crea la fila perezosa con `asegurarFilaDeEntrega`, sin bloquearla. Eso cumple S-15: comentar no cambia el estado ni la versión de la entrega;
  - crea el comentario;
  - llama a `alGuardar(sql, { entregaId })`.
- La firma (`firmaDelAutor`) y `propio` se arman en el adaptador. El rol nunca sale y ninguna selección toca el correo, el estado de pago ni la restricción.
- Reexportes en `backend/src/adapters/db/index.ts`.

### 4. Handler y registro

`backend/src/handlers/tareas/hilo-privado.ts` es nuevo (`hiloPrivadoHandler`) y se registra en `backend/src/app.ts` después de `entregasHandler`. Tiene las 4 rutas con la cadena exacta de "Autorización":

| Ruta | `roles` | Sexto paso |
|---|---|---|
| `GET` y `POST …/entrega/comentarios` | `["estudiante"]` | `inscripcion` |
| `GET …/entregas/:alumnoId/comentarios` | `["maestro", "admin"]` | `propiedad` |
| `POST …/entregas/:alumnoId/comentarios` | `["maestro"]` | `propiedad` |

- El texto pasa por `conTextosNormalizados` y `crearComentarioSchema`.
- El aviso se encola en la transacción con `encolar(COLA_COMENTARIO_CREADO, { comentarioId, entregaId, claseId }, { id, sql })`; el id del comentario es el id del trabajo.
- El handler no compara rol ni relación, no lee `.rol`, no usa Prisma ni SQL y no llama a `cancelar(`.

Pruebas nuevas:
- `backend/test/hilo-privado.integracion.test.ts`
- `backend/test/hilo-privado-concurrencia.integracion.test.ts`
- `backend/test/hilo-privado-autorizacion.integracion.test.ts`

### 5. README y verificación

- `backend/src/handlers/README.md`: viñeta de `tareas/hilo-privado.ts`.
- `backend/src/adapters/README.md`: sección "El hilo privado en `db/entregas.ts`".
- `lint`, `test` y `build` de cada paquete, de uno en uno (ver "Verificación").

Rojos esperados de la ronda 0 (C-1 a C-4 y C-9): ya pasan. También pasan `entregas-01b-r1` y `entregas-01b-r2`, con la regla de `FOR KEY SHARE` una sola vez y la de los 7 esquemas.

## Pruebas requeridas → archivo y título exacto

| Viñeta | Archivo › título exacto |
|---|---|
| PR-1C01 | `backend/test/hilo-privado.integracion.test.ts` › "PR-1C01: sin fila de entrega responde un hilo vacío y no crea la fila"; "PR-1C01: con comentarios, en orden ascendente, con propio correcto y la firma del autor (Administración para el admin, sin rol)"; "PR-1C01: pagina de 20 en 20 con cursor, sin repetir ni saltar"; "PR-1C01: un cursor de otro hilo (de otro alumno o de otra tarea), de un comentario del muro o sin fila de entrega responde 400 VALIDACION" |
| PR-1C02 | mismo archivo › "PR-1C02: sin fila la crea en asignado (versión 0), responde 201 y encola un COMENTARIO_CREADO con id = id del comentario y solo ids"; "PR-1C02: con la entrega entregada, calificada o cerrada, comentar no cambia su estado ni su versión (S-15)"; "PR-1C02: texto vacío, solo invisibles o de 1001 caracteres visibles responde 400 sin crear fila ni comentario ni trabajo; 1000 visibles se aceptan" |
| PR-1C03 | mismo archivo › "PR-1C03: el maestro lista y comenta en el hilo de un alumno inscrito; el alumno lo ve con propio falso y el otro maestro de la clase también lo ve"; "PR-1C03: alumno de otra clase, dado de baja, desactivado, inexistente o un maestro como :alumnoId responden 404 ALUMNO_NO_ENCONTRADO al leer y al escribir, sin crear fila, comentario ni trabajo" |
| PR-1C04 | mismo archivo › "PR-1C04: el alumno no llega al hilo de otro: su ruta usa su propio id y la de los maestros le responde 403"; "PR-1C04: las rutas del muro no ven, no cuentan ni borran un comentario privado". Cubre la lista del muro (conteo de la tarea en 0), los comentarios de un anuncio y de la tarea, `DELETE …/mis-comentarios/:id` y `DELETE …/publicaciones/:publicacionId/comentarios/:id` sobre el anuncio y sobre la tarea, con alumno, maestro y admin: `404` y el comentario sigue |
| PR-1C05 | mismo archivo › "PR-1C05: el admin lee el hilo de un alumno de cualquier clase y escribir le responde 403 sin crear fila, comentario ni trabajo" |
| PR-1C06 | mismo archivo › "PR-1C06: con la tarea ya borrada, comentar (alumno y maestro) y leer responden 404 TAREA_NO_ENCONTRADA sin dejar comentario ni entrega huérfanos"; "PR-1C06: una tarea de otra clase responde 404 TAREA_NO_ENCONTRADA al leer y al comentar". Carreras, en `backend/test/hilo-privado-concurrencia.integracion.test.ts` › "PR-1C06: el borrado retiene la tarea y un comentario del alumno que llega espera y responde 404 TAREA_NO_ENCONTRADA, sin comentario, sin fila de entrega y sin trabajo" (la parte de PR-1B22 bis que pidió el manager, con `formadasDetrasDe`); "PR-1C06: lo mismo con el comentario del maestro en el hilo del alumno y el borrado del admin con ?confirmar=entregas: 404 sin comentario ni fila"; "PR-1C06: el comentario llega primero (retiene la tarea con su bloqueo de llave) y el borrado del maestro sin parámetro espera; al confirmar, el comentario responde 201 y el borrado 204, y el hilo se va con la tarea"; "PR-1C06: con una entrega realizada, el comentario primero y el borrado del maestro después responde 409 TAREA_CON_ENTREGAS, y el comentario y la entrega se conservan sin cambiar la versión" |
| PR-1C07 | `backend/test/hilo-privado-autorizacion.integracion.test.ts` › "PR-1C07: son las cuatro rutas del hilo de la tabla de Autorización"; "PR-1C07: cada ruta: sin token, 401 NO_AUTENTICADO"; "PR-1C07: rol incorrecto: maestro y admin en las del alumno, el alumno en las de los maestros y el admin al escribir como maestro reciben 403 ROL_NO_PERMITIDO sin escribir"; "PR-1C07: clase ajena y clase inexistente responden igual: 403 SIN_ACCESO_A_LA_CLASE"; "PR-1C07: cada ruta: el alumno restringido recibe 403 ACCESO_RESTRINGIDO y no deja comentario, fila de entrega ni trabajo (tampoco en el hilo del restringido)"; "PR-1C07: cada ruta: con cambio de contraseña pendiente, 403 CAMBIO_DE_CONTRASENA_REQUERIDO"; "PR-1C07: con los ids de la ruta en mayúsculas, el alumno escribe y lee, el maestro escribe y lee y el admin lee"; "PR-1C07: ninguna respuesta de este archivo (de ningún rol, también las de error) contiene estadoPago, deudor, al_corriente, accesoRestringido, el rol ni un correo" (los alumnos de la clase son deudores) |
| PR-1C08 | `backend/src/core/eventos/comentario-creado.test.ts` › "PR-1C08: acepta la forma del muro y la del hilo privado, y cada una solo encaja en su esquema"; "PR-1C08: rechaza una forma con publicacionId y entregaId a la vez, una sin ninguno y una con llaves de más"; "PR-1C08: los ids deben ser uuid en las dos formas" |

Todas las viñetas tienen caso. Las retenciones usan `conFilaDeEntregasRetenida` (`timeout: 30_000`) y ninguna prueba toma `LOCK TABLE`.

## Pruebas normales cambiadas

Ninguna.

## Conteos

| Paquete | Antes | Después | Comando |
|---|---|---|---|
| backend | 187 archivos / 2378 pruebas | **191 / 2407** | `cd backend; npx vitest list` (`grep -a -c " > "`; archivos únicos con `sed 's/ > .*//' \| sort -u`) |
| frontend | — | **2271 pruebas**, sin cambio | `cd frontend; npx vitest list` |

El backend suma 4 archivos y 29 pruebas: `comentario-creado.test.ts` (3), `hilo-privado.integracion` (14), `hilo-privado-concurrencia.integracion` (4) y `hilo-privado-autorizacion.integracion` (8).

## Verificación

| Paquete | Paso | Comando | Última línea |
|---|---|---|---|
| shared | build | `cd shared; npm run build` | código 0 |
| shared | lint | `npm run lint` | `All matched files use Prettier code style!` |
| backend | lint | `cd backend; npm run lint` | `> tsc -p tsconfig.json --noEmit && tsc -p tsconfig.test.json` |
| backend | test | `npm test > <scratchpad>/c-test-back.txt 2>&1` (16:58:24Z a 17:00:40Z, código 0) | `Test Files  191 passed (191)` · `Tests  2407 passed (2407)` · `Duration  130.56s (transform 16.95s, setup 5.45s, import 217.51s, tests 1057.69s, environment 70ms)` |
| backend | build | `npm run build` | `> tsc -p tsconfig.json` |
| frontend | lint | `cd frontend; npm run lint` | `> tsc -b` |
| frontend | test | `npm test` | `Test Files  153 passed (153)` · `Tests  2271 passed (2271)` · `Duration  154.86s (transform 38.16s, setup 116.23s, import 388.41s, tests 611.36s, environment 508.54s)` |
| frontend | build | `npm run build` | `✓ built in 1.29s` |

La primera corrida de `npm run lint` del backend cayó por formato en `hilo-privado.ts`. Lo formateé con `npx prettier --write` solo en ese archivo y la segunda corrida quedó en verde.

## PA-07

Atribución con `pa07-tester.mjs` sobre `c-test-back.txt`. **PA-07 limpia.**

| Término | Cuenta |
|---|---|
| `40P01` | 0 |
| `deadlock detected` | 0 |
| `could not serialize` | 0 |
| `too many clients` | 0 |
| `Unable to start a transaction` | 0 |
| `"Error no controlado"` | 10, exactamente I-1 |
| `"code":"P2028"` | 5, los permitidos |

- **I-1:** 6 de `POST /api/auth/login`, 3 `ZodError` de T-39 y 1 `boom`.
- **Control positivo completo:** los 3 de `servicio-ocupado` (`cambiar-contrasena`, `refrescar` y los comentarios del muro, mismo `pid`) y los 2 de `cuentas-r3` (`login` y `restablecer`).
- Ninguna línea sale de las rutas del hilo ni de sus carreras.

## V-01

Contra la tabla de 168 de la ronda 0 de 01c en `reporte-tester.md`: **168/168 iguales**, sin faltantes ni sobrantes.

## "No se toca"

- Dentro de los paquetes, `git diff --stat 159cc7e --` sobre middleware, los adaptadores protegidos, `adapters/db/publicaciones.ts`, `adapters/queue`, `referencias.ts`, `cliente.ts`, `errores.ts`, `bloqueo-clase.ts`, `core/autoria.ts`, `core/clases`, `handlers/clases`, `handlers/archivos.ts`, `validacion.ts`, `errores.ts`, las ayudas de `backend/test/` (incluida `ayudas-entregas.ts`), `.env.example`, `package.json`, `frontend/` completo, `backend/prisma`, `docs/ARCHITECTURE*.md`, `PRD.md` y `DESIGN.md`: **vacío**.
- Fuera de los paquetes, `git diff --stat dd8edcb -- AGENTS.md CLAUDE.md .claude/agents infra package.json package-lock.json`: **vacío**.
- Archivos tocados en 01c:
  - **Modificados:** `shared/src/entregas.ts`, `shared/src/index.ts`, `backend/src/core/eventos/avisos-de-clase.ts`, `backend/src/adapters/db/entregas.ts`, `backend/src/adapters/db/index.ts`, `backend/src/app.ts` y los dos README.
  - **Nuevos:** `backend/src/handlers/tareas/hilo-privado.ts` y los 4 archivos de pruebas.

## Hermanos y estados vecinos

### Comentar según el estado de la entrega y el actor

| Estado de la entrega | Alumno (su hilo) | Maestro (hilo del alumno) | Admin |
|---|---|---|---|
| Sin fila | `201`; crea la fila en `asignado`, versión 0 (PR-1C02) | `201`; crea la fila (PR-1C03) | Lee: hilo vacío y no la crea (PR-1C05); escribir: `403` sin fila (PR-1C05) |
| Fila en `asignado` | `201` sin cambiar la fila (PR-1C06, en carrera) | Mismo camino | Lee |
| `entregado` | `201`; estado, versión y `actualizado_en` sin cambio (PR-1C02) | Mismo camino: no bloquea ni escribe la entrega | Lee |
| `calificado` | `201` sin cambio (PR-1C02) | Mismo camino | Lee |
| Cerrada (sin tardías y vencida), con fila | `201` sin cambio (PR-1C02) | Mismo camino | Lee |
| Cerrada, sin fila | `201`; la fila nace en `asignado` (PR-1C02) | Mismo camino | — |

Por qué el hilo no cambia la entrega: no mira el cierre ni el estado (S-04) y, salvo crear la fila si falta, nunca la escribe.

### El alumno de la ruta en las rutas de los maestros

Inscrito y activo responde `200`/`201`. Responden `404 ALUMNO_NO_ENCONTRADO`, sin fila, comentario ni trabajo, al leer y al escribir (PR-1C03):
- un alumno de otra clase;
- un alumno dado de baja, aunque tenga fila de entrega;
- un alumno desactivado;
- un id inexistente;
- un maestro como `:alumnoId`.

El alumno restringido no llega a ninguna ruta, tampoco a su propio hilo: `403` sin escritura (PR-1C07).

### La tarea borrada antes y después

| Caso | Resultado | Prueba |
|---|---|---|
| Borrada antes | `404 TAREA_NO_ENCONTRADA` al leer y al comentar, para alumno, maestro y admin, sin huérfanos | PR-1C06 |
| De otra clase | `404` | PR-1C06 |
| El borrado retiene la tarea y el comentario llega (alumno, o maestro con el admin borrando con el parámetro) | `404` sin comentario, fila ni trabajo | PR-1C06 |
| El comentario retiene la tarea y llega el borrado del maestro | `201` y después `204`: el hilo se va en cascada con la tarea | PR-1C06 |
| Lo mismo con una entrega realizada | `201` y `409 TAREA_CON_ENTREGAS`, y se conservan el comentario y la versión | PR-1C06 |

Ningún caso dio `500`, `P2003` ni deadlock.

### Cursor del hilo

Responden `400 VALIDACION` "cursor: no es válido", igual en la ruta del alumno y en la de los maestros (PR-1C01):
- un cursor de otro alumno;
- un cursor de otra tarea;
- un comentario del muro;
- un cursor sin fila de entrega.

La paginación es de 20 por defecto y hasta 100 (PR-1C01). Que el comentario del cursor se borre en medio no puede pasar en 01c, porque no hay borrado de comentarios privados (S-04). La comprobación y la página comparten instantánea igual.

### Texto en la frontera

Responden `400` sin fila, comentario ni trabajo (PR-1C02):
- vacío;
- solo espacios;
- solo invisibles (`U+200B`, `U+2800`);
- 1001 caracteres visibles;
- un cuerpo sin `texto`;
- `texto` que no es cadena.

1000 visibles entre saltos de línea se aceptan después de `normalizarTextoLargo` (PR-1C02). Es la misma regla del muro: `crearComentarioSchema` mide después de normalizar, que solo acorta (el hermano de T-01 ya revisado).

### Aislamiento frente al muro

Las cinco rutas de comentarios del muro (lista, conteo, `GET`, los dos `DELETE`) no ven, no cuentan ni borran un comentario privado (PR-1C04). No hizo falta cambiar `publicaciones.ts`.

## Observaciones y lo no verificado

- Los esquemas de respuesta del hilo son `z.strictObject`, pero la regla estática de 7 esquemas de `entregas-01b-r1` no los nombra (lo anotó el tester para su ronda 1).
- **No verificado:** el hilo en un navegador. Queda para la comprobación humana de 01e (H-5).


# Resumen del programador — ENTREGAS-01d — Implementación

> La implementación se interrumpió una vez por un error de red de la API y la retomé desde el árbol, sin rehacer nada. Ya estaban escritos los pasos 1 y 2: `lib/estado-de-entrega.ts`, `components/estado-entrega-badge.tsx` y los tres archivos de `components/adjuntos/`. Los releí, comprobé que compilaban y seguí desde ahí.

- **Base:** `ec1c4b3` dentro de los paquetes; `dd8edcb` fuera de ellos.
- **Pasos completados:** 6 de 6.
- **Lo que no hice:** commit, abrir navegadores, instalar dependencias ni tocar el backend.

## PARADA y su resolución

Al correr el frontend con el código de los pasos 1 a 4, la prueba normal `features/clases/trabajo-view.test.tsx` › "PR-1E01 · …" (`:361`) cayó. La prueba esperaba "Venció el …" en la fila vencida del estudiante. Por §D-9.8, sin entrega y vencida, esa fila tiene que decir "Sin entregar". La prueba no estaba en la lista cerrada, así que me detuve sin tocarla.

La resolvió la Enmienda 5: viñeta nueva de "Pruebas existentes que el programador puede cambiar", aprobada por el manager. Apliqué exactamente lo que permite (sección "Pruebas normales cambiadas").

## Pasos

1. **`lib/estado-de-entrega.ts` (nuevo).**
   - `estadoDeEntregaVisible` y `TEXTOS_ESTADO_DE_ENTREGA`.
   - Los tipos `EstadoDeEntregaVisible` y `EntregaParaElEstado`.
   - Prueba nueva: `lib/estado-de-entrega.test.ts`.

   **`components/estado-entrega-badge.tsx` (nuevo).** `EstadoEntregaBadge`: cinco estados con su texto, tono e icono de §7.8; el último `return` es `estado satisfies never`. Prueba nueva: `components/estado-entrega-badge.test.tsx`.

2. **`components/adjuntos/`, solo agregados (R-04).**
   - `lib.ts`: `rutaDeArchivosDeLaClase`.
   - `hooks.ts`: `useSolicitarSubidaEn(ruta)` y `useUrlDeDescargaEn(ruta)`. `useSolicitarSubida(claseId)` y `useUrlDeDescarga(claseId)` pasan a ser sus envoltorios con la ruta de la clase: misma firma y misma petición.
   - `adjuntos-de-publicacion.tsx`: prop opcional `rutaDeArchivos`. La ficha visual se comparte (`VistaDeFicha`, con un solo `enEspera=` en el archivo). `FichaDeAdjunto` sigue usando `useUrlDeDescarga(claseId)` y la ficha nueva `FichaDeAdjuntoEnRuta` usa `useUrlDeDescargaEn(ruta)`.
   - Prueba nueva: `components/adjuntos/adjuntos-01d.test.tsx`.

3. **`features/tareas`.**
   - `data.ts`: `TEXTOS_TU_TRABAJO`, `TEXTOS_HILO_PRIVADO`, `LIMITE_DEL_HILO` y `CODIGOS_DE_CONFLICTO_DE_ENTREGA`. Los códigos `ENTREGA_*` entran en `CODIGOS_CON_MENSAJE_DEL_SERVIDOR`. Quité `tuTrabajoTexto`, el texto de TAREAS-01 que este paso reemplaza.
   - `lib.ts`: `claveMiEntrega` (cuelga de `claveTarea`), `claveHilo`, `rutaDeMiEntrega`, `rutaDeMiHilo`, `rutaDePaginaDelHilo`, `yaEsTarde`, `entregaCerradaAhora`, `fraseDeEntrega`, `esConflictoDeEntrega`, `esEntregaVacia`, `errorDeEnlacesDeApi` y `errorDeTextoDeApi`.
   - `types.ts`: reexporta de `shared/` `ComentarioPrivado`, `CrearComentario`, `Entregar`, `EstadoEntrega`, `ListaComentariosPrivadosRespuesta` y `MiEntrega`.
   - `hooks.ts`: `useMiEntrega`, `useEntregar`, `useAnularEntrega`, `useHiloPrivado` y `useComentarEnHilo`. Los avisos viven en el gancho; un `409` de la entrega avisa y vuelve a pedirla.
   - Componentes: `tu-trabajo.tsx` (reescrito), `formulario-de-entrega.tsx`, `campo-de-enlaces.tsx`, `entrega-realizada.tsx`, `lista-de-enlaces.tsx` y `hilo-privado.tsx` (nuevos).
   - `detalle-tarea-view.tsx`: en la perspectiva del alumno, "Tu trabajo" y "Comentarios privados".
   - Prueba nueva: `features/tareas/entregas-01d.test.tsx`.

4. **`features/clases` (lo que permite A-3).**
   - `components/fila-de-entrega.tsx`: prop opcional `entrega`.
   - `components/seccion-de-tema.tsx`: pasa `entrega` solo cuando no se gestiona el trabajo (la perspectiva del alumno, T-16).
   - `data.ts`: `CLASES_DEL_CUADRO_DE_ENTREGA`.
   - `lib.ts`: `segundaLineaDeLaFila`.
   - `types.ts`: `SegundaLineaDeLaFila`.
   - Prueba nueva: `features/clases/fila-de-entrega-01d.test.tsx`.

5. **`docs/DESIGN.md`**, todo con la marca "propuesta (ENTREGAS-01d)":
   - §7.7: la fila del alumno, que reemplaza "Mientras no existan entregas…".
   - §7.8: la implementación de `EstadoEntregaBadge`.
   - §7.19: los adjuntos de una entrega.
   - §7.20: la columna derecha del alumno.
   - Secciones nuevas §7.24 "Zona de entrega" y §7.25 "Hilo privado".

6. **Verificación:** shared build, y en frontend lint, test y build, de uno en uno (sección "Verificación").

## Las tres condiciones del tester

1. **R-04 y el doble de `refactor-01c-r1`.**
   - Sin `rutaDeArchivos`, `AdjuntosDePublicacion` monta solo `FichaDeAdjunto`, que llama a `useUrlDeDescarga(claseId)` como antes.
   - `useUrlDeDescargaEn` solo lo llama `FichaDeAdjuntoEnRuta`, que se monta únicamente cuando hay ruta. No hay ganchos condicionales.
   - `refactor-01c-r1.ataque` y `reexportaciones-01c.test.ts` pasan en verde. PR-1D13 fija las mismas URL de siempre.
2. **`entrega` opcional en `FilaDeEntrega`** (`entrega?: ElementoDeTrabajo["entrega"] | undefined`). Sin ella, la fila es la de siempre. `reloj-01e-r4.ataque` pasa en verde.
3. **El encabezado y la firma.**
   - El `h3` "Tu trabajo" se pinta en los tres estados: cargando, error y datos.
   - `HiloPrivado` firma con `FirmaDelAutor` y no lee `.propio` ni `.administracion`.
   - `tareas-01d-r1.ataque:359` y `estatico-02c-r1.ataque` pasan en verde.

**C-11 (V-06) y C-5 en verde.**
- C-11: total de 53 `enEspera=`. Por archivo: `formulario-de-entrega.tsx` 1, `entrega-realizada.tsx` 1, `hilo-privado.tsx` 2; `tu-trabajo.tsx`, `campo-de-enlaces.tsx`, `lista-de-enlaces.tsx` y `estado-entrega-badge.tsx` 0. `adjuntos-de-publicacion.tsx` sigue en 1.
- C-5: el único `target="_blank"` está en `lista-de-enlaces.tsx`, con `rel="noopener noreferrer"` en el mismo elemento. En la corrida intermedia de la PARADA, C-5 cayó porque un comentario del archivo contenía el literal `target="_blank"`. Reescribí el comentario.

## Pruebas requeridas → archivo y título exacto

| Viñeta | Archivo › título exacto |
|---|---|
| PR-1D01 | `src/lib/estado-de-entrega.test.ts` › "PR-1D01: los cinco resultados: asignado, sin entregar, entregado, entregado con retraso y calificado"; "PR-1D01: una fila asignado (anulada o solo con hilo) se trata como sin entrega"; "PR-1D01: la frontera de la fecha límite es la de vencimientoDe (vencida desde su milisegundo exacto)" |
| PR-1D02 | `src/components/estado-entrega-badge.test.tsx` › "PR-1D02: $estado dice «$texto» con su tono y su icono (nunca solo color)" (5 filas: asignado, sin-entregar, entregado, entregado-con-retraso, calificado) |
| PR-1D03 | `src/features/tareas/entregas-01d.test.tsx` › "PR-1D03: el encabezado se pinta mientras carga y tras un error; error → cargando → datos"; "PR-1D03: abierta y sin entrega muestra el formulario; con adjuntos requeridos el botón dice «Entregar tarea»"; "PR-1D03: sin adjuntos requeridos y vacío dice «Marcar como completada»; con un archivo o un enlace, «Entregar tarea»" |
| PR-1D04 | mismo archivo › "PR-1D04: cada archivo se pide por la ruta de la entrega, se sube sin el token y después se entrega con sus ids y los enlaces; al terminar, aviso, «Entregado», «Trabajo de clase» viejo y el foco en «Tu trabajo»"; "PR-1D04: el botón está en espera desde la primera subida hasta la respuesta, y un doble clic o un Enter repetido hacen una sola entrega"; "PR-1D04: si falla una subida, el aviso nombra el archivo, no hay POST …/entrega y lo elegido se conserva" |
| PR-1D05 | mismo archivo › "PR-1D05: un javascript: muestra el error bajo el campo y no se agrega"; "PR-1D05: con 5 enlaces, «Agregar enlace» no agrega y la nota lo dice"; "PR-1D05: «Quitar» lleva el foco al «Quitar» vecino y, sin enlaces, al campo" |
| PR-1D06 | mismo archivo › "PR-1D06: en una tarea que requiere adjuntos, entregar sin nada muestra el error del grupo y no pide nada" |
| PR-1D07 | mismo archivo › "PR-1D07: %s avisa con el mensaje del servidor y vuelve a pedir la entrega" (ENTREGA_YA_REALIZADA, ENTREGA_CERRADA y ENTREGA_CALIFICADA); "PR-1D07: ENTREGA_VACIA marca el grupo y un VALIDACION de enlaces.1 marca la lista, sin aviso" |
| PR-1D08 | mismo archivo › "PR-1D08: vencida y con tardías, la nota de retraso"; "PR-1D08: cerrada sin entrega, la frase y ningún botón ni campo"; "PR-1D08: cerrada con entrega, la entrega sin «Anular entrega»" |
| PR-1D09 | mismo archivo › "PR-1D09: la fecha en la zona local, los adjuntos descargados por la ruta de la entrega y los enlaces con su href exacto en otra pestaña"; "PR-1D09: sin archivos ni enlaces dice «Marcaste como completada el …»"; "PR-1D09: una respuesta con un enlace javascript: hace fallar el parse y la vista muestra el error (el enlace nunca se pinta)" |
| PR-1D10 | mismo archivo › "PR-1D10: la confirmación en línea lleva el foco a «Cancelar»; «Cancelar» lo regresa a «Anular entrega»"; "PR-1D10: ya vencida y con tardías, la frase avisa que volver a entregar quedará con retraso"; "PR-1D10: «Sí, anular entrega» en espera y una sola petición con doble clic; al terminar, aviso, formulario vacío y foco en «Tu trabajo»"; "PR-1D10: con puedeAnular falso no hay «Anular entrega»" |
| PR-1D11 | mismo archivo › "PR-1D11: vacío dice «Aún no hay comentarios privados.»"; "PR-1D11: la lista va en orden ascendente, con la firma del autor y la insignia «Administración» si la da el servidor"; "PR-1D11: «Ver más comentarios» está en espera también durante una recarga (isFetching)"; "PR-1D11: al cargar lo último, el foco va al primer comentario nuevo"; "PR-1D11: enviar hace una sola petición con doble clic; vacío da el error de campo; al enviar, el campo se vacía y recibe el foco" |
| PR-1D12 | `src/features/clases/fila-de-entrega-01d.test.tsx` › "PR-1D12: $nombre dice «$texto» con el color del cuadro de §7.7" (5 filas: entregada, con retraso, calificada, vencida sin entrega, vencida y anulada); "PR-1D12: una tarea pendiente sin entregar conserva el texto y el color de vencimientoDe"; "PR-1D12: sin entrega (maestro y admin) la fila no cambia: una vencida dice «Venció el …»". También `trabajo-view.test.tsx` (perspectivas de maestro y admin, sin cambio) |
| PR-1D13 | `src/components/adjuntos/adjuntos-01d.test.tsx` › "PR-1D13: sin rutaDeArchivos, «Descargar» pide /api/clases/:claseId/archivos/:id/descarga, como siempre"; "PR-1D13: con rutaDeArchivos, «Descargar» pide la descarga a esa ruta"; "PR-1D13: useSolicitarSubida(claseId) y useUrlDeDescarga(claseId) siguen pidiendo las mismas URL" |
| PR-1D14 | `src/features/tareas/entregas-01d.test.tsx` › "PR-1D14: «Detalles», «Tu trabajo» y «Comentarios privados», en ese orden, con el texto de privacidad de P-01" |

- **Reloj:** `entregas-01d.test.tsx` y `fila-de-entrega-01d.test.tsx` fijan el reloj con `vi.useFakeTimers({ toFake: ["Date"] })` en `2030-01-10T12:00:00Z`. Las dos pruebas puras (PR-1D01 y PR-1D02) reciben `ahora` explícito o no dependen de la hora.
- **Almacén:** usa un origen distinto del de la API.

## Pruebas normales cambiadas

Todas son de la lista cerrada (la viñeta de "Tu trabajo" de TAREAS-01 y la Enmienda 5). No toqué ninguna otra aserción.

- **`features/clases/trabajo-view.test.tsx` › PR-1E01 (`:361`):** la fila vencida de la perspectiva del estudiante pasa de `/Venció el /` a `/Sin entregar/`, con un comentario que cita la Enmienda 5 y §D-9.8.
- **`features/tareas/detalle-tarea-view.test.tsx`:**
  - `stubApi` responde `GET …/entrega` con un doble válido (asignado, `puedeEntregar: true`) y `…/entrega/comentarios` con `{ comentarios: [], siguienteCursor: null }`.
  - En "PR-1D05: el estudiante ve la tarea completa, «Tu trabajo» y ninguna acción de maestro", el encabezado pasa a `await screen.findByRole("heading", { name: "Tu trabajo" })`.
  - En el mismo caso, el texto de TAREAS-01 pasa a `await screen.findByRole("button", { name: "Entregar tarea" })`.
- **`app/router.test.tsx` › PR-1D07:** no cambió; pasa en verde.

## Conteos

| | Antes | Después | Comando |
|---|---|---|---|
| frontend | 153 archivos / 2271 pruebas | **158 / 2319** | `cd frontend; npx vitest list` (`grep -a -c " > "`; archivos únicos con `sed 's/ > .*//' \| sort -u`) |

El aumento es de 5 archivos y 48 pruebas:

| Archivo | Pruebas |
|---|---|
| `entregas-01d.test.tsx` | 30 |
| `fila-de-entrega-01d.test.tsx` | 7 |
| `estado-entrega-badge.test.tsx` | 5 |
| `estado-de-entrega.test.ts` | 3 |
| `adjuntos-01d.test.tsx` | 3 |

## Verificación

Corrí los pasos de uno en uno, sin el backend.

| Paso | Comando | Resultado (última línea) |
|---|---|---|
| shared build | `cd shared; npm run build` | código 0 |
| frontend lint | `cd frontend; npm run lint` | `> tsc -b` (ESLint y Prettier sin hallazgos) |
| frontend test | `npm test > <scratchpad>/d-test-front.txt 2>&1`, código 0 | `Test Files  158 passed (158)` · `Tests  2319 passed (2319)` · `Duration  112.49s (transform 28.00s, setup 61.37s, import 287.76s, tests 527.64s, environment 286.65s)` |
| frontend build | `npm run build` | `✓ built in 758ms` |
| PA-07 | — | No aplica: no corrí el backend |

## V-01

**169/169** iguales a la tabla de la ronda 0 de 01d (incluye las reescrituras C-5 y C-11). Ninguna `*.ataque` cambió.

## "No se toca"

- **Dentro, contra `ec1c4b3`:** `git diff --stat ec1c4b3 --` sobre `services`, `app`, `styles`, `components/ui`, `components/layout`, `components/clase`, `mensaje-error`, `cargando`, `estado-vacio`, `lib/vencimiento.ts`, `lib/format.ts`, `lib/ruta-de-clase.ts`, `lib/errores-de-api.ts`, `vitest.config.ts`, `features/auth`, `features/admin`, `features/diagnostico`, `backend`, `shared`, los `package.json`, `ARCHITECTURE*`, `PRD.md`. Las `*.ataque` quedan fuera de esta comprobación; las cubre V-01. Resultado: **vacío**.
- **Fuera, contra `dd8edcb`:** `AGENTS.md`, `CLAUDE.md`, `.claude/agents`, `infra`, `package*.json`: **vacío**.
- **`features/clases`:** solo cambiaron `fila-de-entrega.tsx`, `seccion-de-tema.tsx`, `data.ts`, `lib.ts` y `types.ts` (A-3), `trabajo-view.test.tsx` (Enmienda 5) y la prueba nueva `fila-de-entrega-01d.test.tsx`.
- **`components/adjuntos`:** solo agregados.

## Hermanos y estados vecinos

### Foco

| Estado o camino | Destino del foco | Cubierto por |
|---|---|---|
| Tras entregar | `h3` "Tu trabajo" (el formulario desaparece) | PR-1D04 |
| Tras anular | `h3` "Tu trabajo". Uso `mutateAsync` para que el foco no dependa de que `EntregaRealizada` siga montada | PR-1D10 |
| Tras un `409` | La entrega se vuelve a pedir; si el botón que tenía el foco desaparece, va a la sección (`useFocoAlPerderseElControl`, la misma clave del detalle) | PR-1D07 (nueva lectura). Sin caso propio del foco: el gancho ya está probado en el detalle (T-09) |
| Tras una subida fallida | Se queda en "Entregar tarea" (no desaparece) | PR-1D04 |
| Tras quitar el último enlace | Al campo "Enlace"; con vecinos, al "Quitar" vecino | PR-1D05 |
| Tras quitar el último archivo elegido | A "Adjuntar archivos"; con vecinos, al "Quitar" vecino | Sin caso propio; mismo mecanismo que el formulario de tarea |
| Recarga que quita el botón enfocado ("Anular entrega" al pasar a cerrada o calificada, el formulario al aparecer una entrega de otra pestaña) | A la sección de "Tu trabajo" | Mismo gancho; sin caso propio |
| Confirmación de anular | A "Cancelar" al pedirla; de vuelta a "Anular entrega" al cancelar | PR-1D10 |
| "Ver más comentarios" que desaparece | Al primer comentario nuevo; sin nuevos, al `h3` del hilo | PR-1D11 |
| Enviar comentario | De vuelta al campo | PR-1D11 |
| Primera carga | No se mueve | — |

### `enEspera` y guarda síncrona con ref en cada acción

| Acción | Espera | Guarda | Cubierto por |
|---|---|---|---|
| "Entregar tarea" / "Marcar como completada" | `enProceso \|\| isPending` | `entregandoRef` | PR-1D04 (doble clic, Enter, `aria-busy`, sin `disabled`) |
| "Sí, anular entrega" | Sí | `anulandoRef`; "Cancelar" no cierra en vuelo | PR-1D10 |
| "Enviar comentario" | Sí | `enviandoRef` | PR-1D11 |
| "Ver más comentarios" | `enEspera={isFetching}` | `pidiendoMasRef` y no pide mientras `isFetching` | PR-1D11, durante la recarga |
| "Agregar enlace", "Quitar" y "Adjuntar archivos" | No esperan nada (estado local) | No actúan mientras se entrega (`fija`), con la nota `role="status"` | — |

### Cierre y retraso en cada estado de la entrega

| Situación | Qué muestra | Cubierto por |
|---|---|---|
| Sin entrega, abierta | Formulario | PR-1D03 |
| Sin entrega, vencida con tardías | Formulario más la nota de retraso | PR-1D08 |
| Sin entrega, cerrada | Solo la frase de cierre | PR-1D08 |
| Entregada, abierta | Entrega más "Anular entrega" | PR-1D09, PR-1D10 |
| Entregada, vencida con tardías | La frase de anular avisa del retraso | PR-1D10 |
| Entregada, cerrada | Entrega con la frase de cierre, sin anular | PR-1D08 |
| Calificada | "Tu entrega ya está calificada." sin anular | PR-1D10 |

Lo que se muestra lo decide el servidor (`puedeEntregar`, `puedeAnular`); el cliente solo elige la frase y la nota.

### Tarea con y sin `requiereAdjuntos`

| Caso | Resultado | Cubierto por |
|---|---|---|
| Con adjuntos requeridos | Siempre "Entregar tarea"; vacía, error del grupo sin petición | PR-1D03, PR-1D06 |
| Sin adjuntos requeridos | "Marcar como completada" mientras no haya nada, y "Entregar tarea" en cuanto hay un archivo o un enlace, también al volver a vaciar | PR-1D03 |
| Sin adjuntos requeridos, entrega vacía | Aviso "Marcaste la tarea como completada" (lo decide el gancho por el cuerpo enviado) | — |
| `ENTREGA_VACIA` del servidor | Se marca el grupo, sin aviso | PR-1D07 |

### Fila de "Trabajo de clase"

| Caso | Resultado | Cubierto por |
|---|---|---|
| Alumno: cada estado y la anulada vencida | Su texto y su color | PR-1D12 |
| Alumno: pendiente o próxima sin entregar | Texto de `vencimientoDe` | PR-1D12 |
| Maestro y admin (sin `entrega`) | La fila de siempre | PR-1D12 y `trabajo-view.test.tsx` |

## Lo no verificado

- **Lo visual en navegador:** 360 px con un enlace de 2048 caracteres, foco visible, lector de pantalla (H-7) y subida y descarga reales contra MinIO (H-1). Queda para la comprobación humana de 01e.
- **Sin caso propio:** el foco al quitar el último archivo elegido y el foco cuando una recarga quita el botón enfocado (ambos usan mecanismos ya probados).


# Resumen del programador — ENTREGAS-01d — Corrección de la ronda 1 (T-01 a T-03)

**T-01, T-02 y T-03 quedan corregidos.**

- No hubo PARADAS ni desviaciones.
- No toqué `*.ataque` ni pruebas normales de la lista cerrada, `services/` ni ningún archivo de "No se toca".
- No agregué ganchos nuevos ni `disabled`, y no cambié `enEspera` ni las guardas.
- No hice commit ni abrí navegadores.

## Cambio exacto por hallazgo

**T-01 y T-02 (`features/tareas/hooks.ts`): una sola regla para lo que se renueva tras un error.**
- `reaccionarAlErrorDeLaEntrega` pasa a ser `renovarTrasErrorDeLaEntrega`. La usan `useEntregar`, `useAnularEntrega` y ahora también `useComentarEnHilo`.
- **409 de la entrega** (`esConflictoDeEntrega`: `ENTREGA_YA_REALIZADA`, `ENTREGA_NO_REALIZADA`, `ENTREGA_CALIFICADA`, `ENTREGA_CERRADA`): `Promise.all` de dos invalidaciones.
  - `claveTarea(claseId, tareaId)`, por prefijo. La llave de la entrega cuelga de la de la tarea, así que se pide una vez la tarea y una vez la entrega.
  - `clavePrefijoDelTrabajo(claseId)`.
- **Otro código:** `pedirDeNuevoLaTarea`, la regla de las tareas con `CODIGOS_QUE_RENUEVAN_LA_TAREA`.
  - Un 404 renueva el muro, "Trabajo de clase", los temas, las categorías y la tarea con su entrega.
  - `EDICION_NO_PERMITIDA`, `BORRADO_NO_PERMITIDO` y `SIN_ACCESO_A_LA_CLASE` renuevan la tarea y su entrega.
  - Los demás no renuevan nada.
- `useComentarEnHilo` recibe `(claseId, tareaId, rutaDelHilo)`. Por eso `HiloPrivado` y su formulario suman las props `claseId` y `tareaId`, y `detalle-tarea-view.tsx` se las pasa.

**T-03 (`features/tareas/components/campo-de-enlaces.tsx`).**
- El `ErrorDeCampo` del servidor (`idErrorDelServidor`) entra en el `aria-describedby` del campo "Enlace".
- `aria-invalid` del campo pasa a `error !== null || errorDelServidor !== null`.
- El error se quita al cambiar los enlaces, como antes.

**`docs/DESIGN.md` §7.24**, viñeta "Errores del servidor": dice qué se renueva ante un 409 y un 404 y la asociación del error de enlaces. Lleva la marca "propuesta (ENTREGAS-01d), ronda 1".

## Pruebas nuevas

Todas en `frontend/src/features/tareas/entregas-01d.test.tsx`, con el reloj fijo del archivo (`vi.useFakeTimers({ toFake: ["Date"] })`):

- "Ronda 1: un 409 ENTREGA_CERRADA al entregar vuelve a pedir la tarea y la entrega (una vez cada una) y marca viejo «Trabajo de clase»; la insignia y «Detalles» dicen la tarea vigente"
- "Ronda 1: un 409 al anular (ENTREGA_CERRADA y ENTREGA_NO_REALIZADA) vuelve a pedir la tarea y la entrega y marca viejo «Trabajo de clase», con un solo aviso"
- "Ronda 1: %s al entregar no renueva nada: ni la tarea, ni la entrega, ni «Trabajo de clase»", en 6 filas: 400 ENTREGA_VACIA, 400 VALIDACION de enlaces.0, 400 VALIDACION de archivoIds, 400 ARCHIVO_INVALIDO, 503 ALMACEN_NO_CONFIGURADO y 500
- "Ronda 1: un 404 TAREA_NO_ENCONTRADA al entregar avisa una vez y renueva la tarea: el detalle dice «Esa tarea ya no existe.» y el foco no queda en <body>"
- "Ronda 1: un 404 TAREA_NO_ENCONTRADA al comentar en el hilo avisa una vez y renueva la tarea (el detalle dice «Esa tarea ya no existe.»); un VALIDACION del texto se marca bajo el campo, sin aviso ni renovación"
- "Ronda 1 (T-03): el error de enlaces del servidor describe el campo «Enlace» y lo marca inválido; al cambiar los enlaces se quita"

Las cuatro `*.ataque` rojas del tester (T-01, T-02 ×2 y T-03) pasan en verde, igual que sus controles.

## Hermanos y estados vecinos

### Al entregar (`useEntregar`)

| Código | Se renueva | Se anuncia | Foco | ¿Desaparece un botón? |
|---|---|---|---|---|
| `409 ENTREGA_YA_REALIZADA` | Tarea, entrega y "Trabajo de clase" | Un aviso con el mensaje del servidor | A la sección "Tu trabajo" (`useFocoAlPerderseElControl`) | Sí: el formulario (pasa a la entrega hecha) |
| `409 ENTREGA_CALIFICADA` | Igual | Igual | Igual | Sí: el formulario |
| `409 ENTREGA_CERRADA` | Igual: la insignia, la nota y "Detalles" usan la tarea nueva | Igual | Igual | Sí: el formulario (pasa a la frase de cierre) |
| `400 ENTREGA_VACIA` | Nada | `ErrorDeCampo` del grupo, que describe "Entregar tarea" o "Marcar como completada"; sin aviso | Se queda en el botón | No |
| `VALIDACION` de `enlaces.N` | Nada | `ErrorDeCampo` bajo los enlaces, que describe el campo "Enlace" y lo marca inválido; sin aviso | Se queda en el botón | No |
| `VALIDACION` de `archivoIds` | Nada | Un aviso con el mensaje sin prefijo | Se queda en el botón | No |
| `404 TAREA_NO_ENCONTRADA` | Muro, "Trabajo de clase", temas, categorías, tarea y entrega | Un aviso; la vista pasa a "Esa tarea ya no existe." | A la raíz del detalle (`useFocoAlPerderseElControl`), nunca `<body>` | Sí: todo el detalle |
| `ARCHIVO_INVALIDO` / `ARCHIVO_NO_SUBIDO` al entregar | Nada | Un aviso con su mensaje | Se queda en el botón | No |
| Fallo al pedir la subida o al subir | Nada | Un aviso que nombra el archivo; no se llega al `POST …/entrega` | Se queda en el botón | No |
| `503 ALMACEN_NO_CONFIGURADO` | Nada | Un aviso | Se queda en el botón | No |
| 5xx o red | Nada | Un aviso genérico | Se queda en el botón | No |
| `403 SIN_ACCESO_A_LA_CLASE` | Tarea y entrega | Un aviso; la vista pasa a "No tienes acceso a esta clase." | A la raíz | Sí |

### Al anular (`useAnularEntrega`)

| Código | Se renueva | Se anuncia | Foco | ¿Desaparece un botón? |
|---|---|---|---|---|
| `409 ENTREGA_NO_REALIZADA` | Tarea, entrega y "Trabajo de clase" | Un aviso | A la sección "Tu trabajo" | Sí: la confirmación (pasa al formulario) |
| `409 ENTREGA_CALIFICADA` | Igual | Un aviso | Igual | Sí: la confirmación y "Anular" |
| `409 ENTREGA_CERRADA` | Igual: la frase de cierre usa la tarea nueva | Un aviso | Igual | Sí |
| `404 TAREA_NO_ENCONTRADA` | Muro, "Trabajo de clase", temas, categorías, tarea y entrega | Un aviso; la vista pasa a "Esa tarea ya no existe." | A la raíz | Sí |
| 5xx o red | Nada | Un aviso | Se queda en "Sí, anular entrega"; la guarda se libera | No |

### Al comentar en el hilo (`useComentarEnHilo`)

| Código | Se renueva | Se anuncia | Foco | ¿Desaparece un botón? |
|---|---|---|---|---|
| `404 TAREA_NO_ENCONTRADA` | Lo mismo que al entregar | Un aviso; la vista pasa a "Esa tarea ya no existe." | A la raíz | Sí |
| `VALIDACION` de `texto` | Nada | `ErrorDeCampo` con el mensaje del servidor (sin prefijo) bajo el campo, sin aviso | Se queda en "Enviar comentario" | No |
| 5xx o red | Nada | Un aviso | Se queda | No |

Un comentario correcto renueva solo el hilo (sin cambio).

### `useEditarTarea` (01a)

No cambia. Ya seguía la misma regla: `CODIGOS_QUE_RENUEVAN_LA_TAREA` con `pedirDeNuevoLaTarea`, y `409 TAREA_MODIFICADA` con la recarga de la vista. Como ahora `claveMiEntrega` cuelga de `claveTarea`, una renovación de la tarea desde la edición también marca vieja la entrega. Es inocuo: la edición no monta "Tu trabajo".

## Conteos

| Paquete | Antes | Después | Comando |
|---|---|---|---|
| frontend | 160 archivos / 2364 pruebas (con las `*.ataque` del tester) | **160 / 2375** (+11, todas en `entregas-01d.test.tsx`) | `cd frontend; npx vitest list` |

## Verificación

| Paso | Comando | Resultado |
|---|---|---|
| shared | `cd shared; npm run build` | código 0 |
| frontend lint | `cd frontend; npm run lint` | `> tsc -b` |
| frontend test | `npm test > <scratchpad>/r1d-test.txt 2>&1`, código 0 | `Test Files  160 passed (160)` · `Tests  2375 passed (2375)` · `Duration  125.63s (transform 35.49s, setup 70.02s, import 314.78s, tests 592.02s, environment 321.04s)` |
| frontend build | `npm run build` | `✓ built in 757ms` |

## V-01

**171/171** iguales a la tabla de la ronda 1 de 01d, incluidas `entregas-01d-r1.ataque` y `fila-01d-r1.ataque`.

## "No se toca"

| Comparación | Rutas | Resultado |
|---|---|---|
| Dentro, contra `ec1c4b3` | `services`, `app`, `styles`, `components/ui`, `components/layout`, `components/clase`, `lib/vencimiento.ts`, `lib/format.ts`, `lib/ruta-de-clase.ts`, `lib/errores-de-api.ts`, `vitest.config.ts`, `features/auth`, `features/admin`, `features/diagnostico`, `backend`, `shared`, `package.json` | **vacío** |
| Fuera, contra `dd8edcb` | `AGENTS.md`, `CLAUDE.md`, `.claude/agents`, `infra`, `package*.json` | **vacío** |

Archivos tocados en esta ronda:
- `features/tareas/hooks.ts`
- `features/tareas/components/campo-de-enlaces.tsx`
- `features/tareas/components/hilo-privado.tsx`
- `features/tareas/detalle-tarea-view.tsx`
- `features/tareas/entregas-01d.test.tsx`
- `docs/DESIGN.md`


# Resumen del programador — ENTREGAS-01d — Corrección de la ronda 2 (T-04 y T-05)

Plan: `docs/trabajo/ENTREGAS-01-entregas-e-hilo-privado/plan.md` (Enmiendas 1 a 5), subentrega 01d, hallazgos de "Reporte del Tester — ENTREGAS-01d — Ronda 2".

## Hallazgos atendidos

- **T-04 — corregido.** Un solo mensaje por campo.
  - `campo-de-enlaces.tsx`: prop nueva obligatoria `onDescartarErrorDelServidor: () => void`. Se llama al escribir en "Enlace" (`onChange`) y al intentar agregar (`agregar`, antes de validar, también si el enlace es inválido). Quitar un enlace ya lo descartaba (cambia la lista). Además, si el error local dice lo mismo que el del servidor, el del servidor no se pinta ni se nombra en `aria-describedby` (`errorDelServidorVisible`).
  - `formulario-de-entrega.tsx`: `handleDescartarErrorDeEnlaces = () => setErrorDeEnlaces(null)`, pasado a `CampoDeEnlaces`.
  - Hermano aplicado, `hilo-privado.tsx` (`FormularioDelHilo`): el error del texto que da el servidor vive en su propio estado (`errorDelServidor`), se descarta al escribir y al volver a enviar; bajo el campo hay un solo `ErrorDeCampo` (`error ?? errorDelServidor`).
- **T-05 — corregido.** Un solo aviso por error, con el mecanismo de `features/tareas` y sin ganchos nuevos.
  - `hilo-privado.tsx`, `handleVerMas`: no avisa si el hilo ya no está montado (`montadoRef`, puesto y quitado en un `useEffect` del componente), si el error reemplaza la vista (`errorQueReemplazaLaVista(true, error)`) o si `apiClient` ya redirigió (`errorQueRedirigeElCliente`, nuevo en `lib.ts`, con `CODIGOS_QUE_REDIRIGE_EL_CLIENTE` en `data.ts`: `ACCESO_RESTRINGIDO`, `CAMBIO_DE_CONTRASENA_REQUERIDO`, `NO_AUTENTICADO`).
  - `hooks.ts`, `useHiloPrivado(claseId, tareaId, rutaDelHilo)` (firma ampliada del gancho existente, no es un gancho nuevo): si una página del hilo falla, pasa el error por `pedirDeNuevoLaTarea` (regla T-11). Así un `404`/`403` de "Ver más comentarios" sin otra petición en vuelo no queda mudo: la tarea se renueva y la vista dice su mensaje.
  - `hooks.ts`, `avisarDelErrorDeLaEntrega` (función, no gancho): el aviso de `useEntregar`, `useAnularEntrega` y `useComentarEnHilo`. Un error que reemplaza la vista se avisa una vez por la consulta de la tarea (WeakMap por instancia de la caché con su `dataUpdatedAt`, el mismo mecanismo que `useAvisoDeRecargaFallida`); los demás errores avisan cada uno. `renovarTrasErrorDeLaEntrega(` sigue con tres llamadas.

## Pruebas nuevas

Archivo `frontend/src/features/tareas/entregas-01d.test.tsx`, describe "un mensaje por campo y un aviso por error (ronda 2, T-04 y T-05)", reloj fijo (`vi.useFakeTimers({ toFake: ["Date"] })` del `beforeEach` del archivo):

1. "Ronda 2 (T-04): con el error de enlaces del servidor puesto, escribir en «Enlace» lo descarta: el campo deja de estar inválido y su descripción ya no lo nombra"
2. "Ronda 2 (T-04): si el error local y el del servidor dicen lo mismo, el texto aparece una sola vez y la descripción del campo no repite ids"
3. "Ronda 2 (T-04, hermano): el error del texto que da el servidor al comentar se descarta al escribir; queda un solo mensaje bajo el campo"
4. "Ronda 2 (T-05): «Ver más comentarios» con un 404 TAREA_NO_ENCONTRADA no avisa: la tarea se renueva y el detalle dice «Esa tarea ya no existe.»"
5. "Ronda 2 (T-05): «Ver más comentarios» con un 503 y el hilo montado avisa una vez y no renueva la tarea"
6. "Ronda 2 (T-05): «Ver más comentarios» que responde un 503 después de que el hilo se desmontó no avisa"
7. "Ronda 2 (T-05): «Ver más comentarios» con un 403 ACCESO_RESTRINGIDO: apiClient redirige y no hay aviso"
8. "Ronda 2 (T-05, hermano): entregar y comentar a la vez con el mismo 404 dan un solo aviso y el detalle dice «Esa tarea ya no existe.»"
9. "Ronda 2 (T-05, hermano): anular con «Ver más comentarios» en vuelo, los dos con 404, da un solo aviso"
10. "Ronda 2 (T-05, hermano): «Ver más comentarios» con un 503 mientras un 409 al entregar renueva la entrega: un aviso por cada error"

Las dos pruebas rojas del tester pasan ahora: `entregas-01d-r2.ataque.test.tsx` › "ataque ENTREGAS-01d r2: errores de enlaces del cliente y del servidor a la vez (T-r2-3)" › "con el error del servidor puesto, un enlace inválido escrito a mano: el mismo texto no aparece dos veces y aria-describedby no repite ids", y › "ataque ENTREGAS-01d r2: comentar con errores (T-r2-4)" › "TAREA_NO_ENCONTRADA al comentar con «Ver más comentarios» en vuelo que también responde 404: un solo aviso". No se tocó ninguna `*.ataque`.

## Hermanos y estados vecinos

### T-04 (mensaje por campo)

| Hermano o estado | Aplica | Estado |
|---|---|---|
| "Enlace": escribir con el error del servidor puesto | aplica | aplicado (prueba 1) |
| "Enlace": intentar agregar (válido o inválido) con el error del servidor puesto | aplica | aplicado (`agregar`; prueba roja del tester) |
| "Enlace": quitar un enlace | aplica | ya lo hacía (`handleCambiarEnlaces`); prueba del tester "quitar el enlace que rechazó el servidor…" |
| "Enlace": error local previo idéntico al que luego da el servidor | aplica | aplicado (dedupe por texto; prueba 2) |
| "Enlace": con la lista fija (entrega en vuelo) | no aplica | `agregar` y `quitar` no actúan; escribir sí descarta, y el `catch` pone el error nuevo |
| Archivos elegidos (`errorDeArchivos`) | no aplica | solo hay error local (un estado); los errores de archivos del servidor son avisos |
| Grupo "Entregar tarea" con `ENTREGA_VACIA` | no aplica | un solo estado booleano para el local y el del servidor: nunca dos mensajes; se quita al agregar archivos o enlaces |
| Comentario del hilo, `VALIDACION texto` | aplica | aplicado (prueba 3) |
| 01a "Cómo se entrega" (`formulario-tarea.tsx`) | no aplica | un solo mapa `errores` por campo: el local reemplaza al del servidor, nunca dos mensajes. Descartarlo al cambiar sería un cambio de comportamiento de TAREAS/01a, fuera de esta ronda (anotado abajo) |

### T-05 (un aviso por error)

| Hermano o estado | Aplica | Estado |
|---|---|---|
| Comentar 404 con "Ver más" en vuelo que responde 404 después | aplica | aplicado (`montadoRef` y reemplazo de vista; prueba roja del tester) |
| Igual con `403 SIN_ACCESO_A_LA_CLASE` | aplica | aplicado (mismo camino: `errorQueReemplazaLaVista`) |
| "Ver más" responde 404 antes que el comentario | aplica | aplicado: "Ver más" no avisa y el comentario avisa una vez |
| "Ver más" solo, con 404 | aplica | aplicado: sin aviso, la tarea se renueva y la vista dice su mensaje (prueba 4) |
| "Ver más" con 5xx o red, hilo montado | aplica | sigue avisando una vez (prueba 5) |
| "Ver más" que responde con el hilo desmontado | aplica | aplicado (prueba 6) |
| "Ver más" con `ACCESO_RESTRINGIDO` / `CAMBIO_DE_CONTRASENA_REQUERIDO` / `401` con refresco fallido | aplica | aplicado: sin aviso (prueba 7 para el primero; los otros dos por el mismo código) |
| "Ver más" con 5xx mientras un 409 al entregar renueva la entrega | aplica | un aviso por cada error (prueba 10) |
| "Ver más" con 409 | no aplica | un `GET` no responde 409 de la entrega |
| Entregar y comentar a la vez con el mismo 404 | aplica | aplicado (`avisarDelErrorDeLaEntrega`; prueba 8) |
| Anular con "Ver más" en vuelo, los dos 404 | aplica | aplicado (prueba 9) |
| Entregar y anular a la vez | no aplica | no pueden coexistir: la zona muestra el formulario o la entrega hecha |
| Zona de entrega con la entrega en recarga y un 404 | no aplica | la consulta de la entrega no avisa (con datos deja ver la última; sin datos, `MensajeError` en la sección); el aviso lo da solo la mutación |
| Dos mutaciones con errores distintos que no reemplazan la vista (p. ej. 503 y 409) | no aplica el dedupe | son dos errores: un aviso cada uno |
| Mutaciones con `ACCESO_RESTRINGIDO` | no cambiado | `apiClient` navega con recarga completa; el aviso que puedan dar los ganchos sigue el patrón de todo el proyecto (anotado en la ronda 1) |
| `useEditarTarea` / `useBorrarTarea` | no aplica | fuera de 01d; no cambiaron |

## Verificación (de uno en uno)

- `cd shared; npm run build` → última línea `> tsc -p tsconfig.json` (código 0).
- `cd frontend; npm run lint` → última línea `> tsc -b` (código 0).
- `cd frontend; npm run test` (salida a archivo) → `Test Files  161 passed (161)` · `Tests  2408 passed (2408)` · última línea `Duration  103.61s (transform 27.49s, setup 69.43s, import 221.26s, tests 452.24s, environment 317.00s)`.
- `cd frontend; npm run build` → última línea `✓ built in 702ms` (código 0).

## Conteos

- `cd frontend; npx vitest list` → 2408 casos (líneas con `.test.ts(x) > `) en 161 archivos. Antes: 161 / 2398. Diferencia: +10 casos, 0 archivos; todos en `entregas-01d.test.tsx` (41 → 51; `grep -c "entregas-01d.test.tsx"` sobre la lista).

## V-01

SHA-256 de las `*.ataque` (`git ls-files -co --exclude-standard | grep -E '\.ataque\.test\.tsx?$' | xargs sha256sum`) contra la "Tabla de SHA-256 de las 172 `*.ataque` al cierre de la ronda 2 de 01d" de `reporte-tester.md`: **172/172 coinciden**, sin archivos de más ni de menos.

## "No se toca"

- **Dentro, contra `ec1c4b3`:** `git diff --stat ec1c4b3 --` sobre `services`, `app`, `styles`, `components/ui`, `components/layout`, `components/clase`, `mensaje-error`, `cargando`, `estado-vacio`, `lib/vencimiento.ts`, `lib/format.ts`, `lib/ruta-de-clase.ts`, `lib/errores-de-api.ts`, `vitest.config.ts`, `features/auth`, `features/admin`, `features/diagnostico`, `backend`, `shared`, los `package.json`, `ARCHITECTURE*`, `PRD.md` (sin las `*.ataque`, que cubre V-01): **vacío**. Sin archivos sin seguimiento en esas rutas.
- **Fuera, contra `dd8edcb`:** `AGENTS.md`, `CLAUDE.md`, `.claude/agents`, `infra`, `package*.json`: **vacío**.

## Archivos modificados en esta ronda

`frontend/src/features/tareas/components/campo-de-enlaces.tsx`, `frontend/src/features/tareas/components/formulario-de-entrega.tsx`, `frontend/src/features/tareas/components/hilo-privado.tsx`, `frontend/src/features/tareas/hooks.ts`, `frontend/src/features/tareas/lib.ts`, `frontend/src/features/tareas/data.ts`, `frontend/src/features/tareas/entregas-01d.test.tsx`, `docs/DESIGN.md` (§7.24 "Errores del servidor" y §7.25 "Ver más comentarios" y formulario, marcadas "propuesta (ENTREGAS-01d), ronda 2").

## Desviaciones del plan

Ninguna. `useHiloPrivado` amplía su firma (recibe `claseId` y `tareaId`, como `useComentarEnHilo`); no es un gancho nuevo.

## Pendiente o fuera de alcance

- 01a "Cómo se entrega" y los demás campos del formulario de tarea conservan el error del servidor hasta el siguiente envío (un solo mensaje, nunca dos). Descartarlo al cambiar el campo sería otro encargo.
- Dos mutaciones que fallan a la vez con el mismo error que no reemplaza la vista (p. ej. dos 503) dan un aviso cada una, con el mismo texto.
