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
