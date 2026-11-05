# Reporte del Tester — FORO-01 · actividad tipo foro

> **Nota de transcripción (para el orquestador).** El arnés rechazó la escritura de este archivo por el tester en la ronda 0 de 01a1. Se aplica tal cual, con cotejo.
>
> **Nota del orquestador (2026-11-05).** Transcrito tal cual desde el texto que entregó el tester, sin cambiar contenido (regla de transcripción con cotejo, `AGENTS.md`). Cotejo mecánico al final del archivo ("Cotejo de la transcripción").

## Ronda 0 — 01a1
Veredicto: **PARADA**, por dos motivos independientes:
1. **PARADA de diseño (P-01a1-1).** Una `*.ataque` del frontend que no está en los C-n de §D-R0 01a1, `frontend/src/lib/errores-ch3-r2.ataque.test.ts` (T-01 de CHORE-03), queda en rojo con los literales que el plan manda escribir en `shared/src`: `"conForos: no es válido"` (§D-3.2, E1-4) y los mensajes de `foroIdParamSchema` y `participacionParamSchema` (`"foroId: …"`, `"participacionId: …"`). No la toqué.
2. **Corridas sin ejecutar (P-01a1-2).** La otra copia de trabajo (`C:\Users\Carlos\Documents\Proyecto_PlataformaEducativa`, ADMIN-01) estaba corriendo suites durante esta ronda, en contra de la respuesta del humano registrada en `aprobacion.md` ("No, puede correr"). No corrí `vitest` ni `lint` del backend. Decide el humano cuándo se corren.

C-1 y C-2 están como los pide §D-R0 01a1: los heredé de la ronda detenida y los dejé sin cambios (detalle abajo). Ninguna otra `*.ataque` del backend rompe con el diseño.

Verificación propia: lint del backend **sin ejecutar** (P-01a1-2) · test **sin ejecutar** (P-01a1-2).

Fecha: 2026-11-05. Rama `feat/foro-01`, base `e94ee59`. Plan: `plan.md`, SHA-256 `1b7daae3a6da9db255a675c32eeb21d5d9e791d17e315a76fc404b93fa26f44e` (Enmienda 5), comprobado con `sha256sum`. Con `git diff --no-index -U0` contra la copia `plan-foro-01-e4.md` del scratchpad, los hunks de la Enmienda 5 caen en 01a2, 01b y en frases de la ruta 17 (§D-3.1, fila 17; "Autorización", fila 17 y "las 17 rutas"). §D-R0 01a1, "Pruebas requeridas" de 01a1 y §D-3.4 no cambian: **lo de 01a1 no cambió**.

### Precondiciones
- `docker info`: motor `28.5.1`, Docker Desktop. Solo corren los contenedores de `infra/` (`campus-dev-postgres-1`, `campus-dev-minio-1`, `campus-dev-livekit-1`).
- `Get-NetConnectionProfile`: `uacam5 2`, categoría **Private**, con Internet. El humano la declaró de confianza solo para la sesión de hoy y aceptó el riesgo residual de Ryuk en categoría Privada (`aprobacion.md`, "Antes de la ronda 0 de 01a"). La regla "Campus: bloquear entrada a Docker en redes publicas" está habilitada solo en el perfil Público y no cubre esta red, como ya se sabía.
- **La otra copia corre suites (P-01a1-2).** Con `Get-CimInstance Win32_Process`:
  - de 08:06:04 a 08:39:41: `npm run test` (bash → `npm-cli.js run test`, PID 27940) con `vitest run` de `C:\Users\Carlos\Documents\Proyecto_PlataformaEducativa\node_modules` (PID 17704) y unos 12 hilos de trabajo. Sin contenedores de Testcontainers, así que fue una suite del frontend o una que no levantó base;
  - de 08:40:57 en adelante: `npx vitest run --reporter=default --reporter=json --outputFile.json=…/scratchpad/fe-test2.json` (PID 8796, y `vitest.mjs` PID 6304), de la misma copia y desde el scratchpad de otra sesión. Seguía corriendo a las 08:41:51, con 13 procesos de `vitest`.
- **Carga (ESTADO §5).** Mientras corría la primera: 99 %, 74 %, 90 %, 99 %, 100 % y 100 % de CPU, con 14.2 a 15.5 GB libres. En el hueco entre las dos (08:40): 33 %, 34 % y 34 %, y luego 0 %, 6 % y 2 %. Volvió a 99 % al arrancar la segunda. No hubo una ventana sin otra suite en la que correr.

### V-01
Comando: `find backend frontend -name "*.ataque.test.ts*" -not -path "*/node_modules/*" | sort | xargs sha256sum`, sobre el árbol de trabajo (LF), comparado con dos bases:
- **Contra `e94ee59`** (`git show e94ee59:<ruta> | sha256sum`): la lista de archivos es la misma, 249 (94 del backend y 155 del frontend). Ninguno borrado ni nuevo. Solo cambian `backend/test/sesiones-y-cadena.ataque.test.ts` y `backend/test/lecturas-fx-r1.ataque.test.ts`.
- **Contra la última tabla de cierre de CALIFICACIONES-02** (su `reporte-tester.md`: la del backend al cierre de la ronda 1 de 02a, 94 filas, y la del frontend al cierre de la ronda 2 de 02b, 155 filas): las 249 de `e94ee59` coinciden fila por fila. El SHA-256 de la lista ordenada del frontend sigue siendo `a2f8282929a69aa29e60f8b4f39fe92057c17a524ceb6882c356752416caf674`.
  - Nota: la tabla del backend de 02a dice "CRLF", pero sus hashes son los del contenido LF de los blobs. En esta copia el árbol está en LF.
- **Saltadas:** el diff de los dos archivos no agrega `.skip`, `.only`, `.todo`, `skipIf` ni `runIf`, y los otros 247 son idénticos a la base.
- `git diff --numstat e94ee59 -- backend frontend shared`: `5 1 backend/test/lecturas-fx-r1.ataque.test.ts` y `33 1 backend/test/sesiones-y-cadena.ataque.test.ts`. Nada más en los paquetes. El "+34 −1" y "+6 −1" del encargo son la cuenta de `--stat`, que suma la línea cambiada.

### C-1 y C-2: lo heredado y lo que cambié
Heredé los dos cambios de la ronda detenida. Los revisé contra `e94ee59` y contra §D-R0 01a1 y **no cambié nada**: ya estaban como pide el plan vigente, sin la ruta 17.
- **C-1**, `backend/test/sesiones-y-cadena.ataque.test.ts`, el caso de la línea 553 de `e94ee59` ("bajo /api solo existen las rutas de …"):
  - Comentario antes del `it`: "FORO-01a, C-1 (§D-R0; §D-3.1): se agregan exactamente las 26 entradas de las 16 rutas del foro …", con el desglose (10 GET con su HEAD, 3 POST, 2 PUT y 1 DELETE) y "Ninguna crea cuentas ni cambia roles y ninguna es pública".
  - Título: "…, CLASES-03b y CALIFICACIONES-02a: …" pasa a "…, CLASES-03b, CALIFICACIONES-02a y FORO-01a: …".
  - La lista esperada pasa de 117 a 143 entradas. Lo comprobé evaluando el arreglo con `node`: está ordenada igual que `[...rutas].sort()`, no tiene repetidos y trae exactamente 26 entradas con `/foros`. Coinciden una a una con las rutas 1 a 16 de §D-3.1, con sus nombres de parámetro (`:foroId`, `:participacionId`, `:alumnoId`).
  - **No está** `DELETE /api/clases/:claseId/foros/:foroId/participaciones/:participacionId`, que es C-1 bis de 01a2.
- **C-2**, `backend/test/lecturas-fx-r1.ataque.test.ts`, el caso "la opción solo se puede activar dentro de adapters/db: …":
  - Título: "diecinueve lecturas (… dos de dudas y una de la exportación)" pasa a "veinticuatro lecturas (… dos de dudas, una de la exportación y cinco de foros)", como se hizo en CALIFICACIONES-02a.
  - En `usos` se suma `"adapters/db/foros.ts:5"`, entre `exportacion-de-calificaciones.ts:1` y `publicaciones.ts:2`, con el comentario "FORO-01a, C-2 (§D-R0; §D-3.4): listarForos, leerMiParticipacion, listarParticipaciones, listarReplicas y listarParticipacionesDeAlumno corren en la instantánea única. El conteo es del texto del archivo; el 5 es el previsto por el plan y lo confirma el programador."
  - El 5 es el número previsto por §D-R0. Si el programador declara otro `<n>` en su resumen, lo pongo en la ronda 1 como parte de C-2, que es lo que dice el plan ("El programador declara `<n>` y el tester lo pone").
  - El resto del caso no cambió.

### Estado esperado de C-1 y C-2 antes del programador (sin ejecutar, P-01a1-2)
Comando previsto, en una sola corrida: `cd backend; npx vitest run test/sesiones-y-cadena.ataque.test.ts test/lecturas-fx-r1.ataque.test.ts`. Espero un rojo por archivo y el resto en verde:
- **C-1, `sesiones-y-cadena.ataque.test.ts:585`.** `expected [ …(117) ] to deeply equal [ …(143) ]`, y el diff solo marca como faltantes las 26 entradas de `…/foros`. Motivo: `handlers/foros.ts` todavía no existe.
- **C-2, `lecturas-fx-r1.ataque.test.ts:805`.** `expected [ …(8) ] to deeply equal [ …(9) ]`, y el diff solo marca como faltante `"adapters/db/foros.ts:5"`. Motivo: `adapters/db/foros.ts` todavía no existe. Las aserciones anteriores del caso deben pasar: nadie fuera de `adapters/db` nombra la opción, `index.ts` no reexporta `enTransaccion`, los niveles solo viven en `cliente.ts` y `tareas.ts` tiene dos líneas de código con la opción.

No lo comprobé con una corrida.

### Recorrido de las `*.ataque` del backend contra el diseño de 01a1 y las "Vigiladas"
Son 94 archivos: 88 en `backend/test/` y 6 en `backend/src/`. Busqué las que leen código o rutas (`readFileSync`, `readdirSync`, `import.meta.glob`, `printRoutes`, `onRoute`, que son 22) y, en todas, las que nombran `tipo_publicacion`, `foro`, `conForos`, `trabajoQuerySchema`, `temasQuerySchema`, `elementoDeTrabajoSchema`, `.shape` o los cuerpos de `tareas.ts`, `temas.ts`, `entregas.ts` y `publicaciones.ts`. Si el programador cumple §D-3.3, §D-3.4 y §D-R0 01a1, **ninguna otra rompe**:

| Prueba | Qué lee | Por qué no rompe con 01a1 |
|---|---|---|
| `hilo-01c-r1` (vigilada, :718-733) | `FOR KEY SHARE` en `src`, `comentarEnHiloPrivado` y el texto crudo de `entregas.ts` | `foros.ts` importa los bloqueos de `entregas.ts` y no escribe SQL. Pasar a `export const` no cambia el conteo (1 `FOR KEY SHARE`, 4 `instantaneaUnica: true`). Además, ese describe exige que `adapters/db` no importe `adapters/queue`, y `foros.ts` no encola (FORO-1A52, S-09) |
| `entregas-01b-r1` (vigilada, :1005-1032) | `bloquearTareaParaEntregar`, `entregar` y `anularEntrega`; `Unsafe` y ciclos en `entregas.ts`; `adapters/queue` en cuatro archivos de `adapters/db` | `indexOf("const bloquearTareaParaEntregar")` también encuentra `export const …`. Si las exportaciones de §D-3.3 alargan el corte hasta el siguiente `\nconst `, el corte sigue conteniendo el `FOR KEY SHARE`. `esActividadDeTipo` va después de `bloquearTareaParaEntregar(tx` y no quita esa llamada |
| `lecturas-fx-r1`, el resto del caso de C-2 (vigilada, :794-804) | el texto crudo de `src/` y `tareas.ts` | `tareas.ts` conserva dos líneas de código con la opción (§D-3.3, "Nada de lo anterior cambia … `instantaneaUnica`"). `actividades.ts` no la usa |
| `lecturas-fx-r2` O-4 (vigilada, :967-…) | `.x.delete(`/`.deleteMany(` y `DELETE FROM`/`TRUNCATE` en `src` | El foro se borra con `borrarTarea` (`publicacion.deleteMany`, que ya está). `publicarParticipacion` revierte la fila perezosa con la transacción, no la borra. El borrado de `participacionForo` es de 01a2 (C-3) |
| `lecturas-fx-r2`, estático de `publicaciones.ts` (vigilada, E1-18, :1072-1108) | los cuerpos de `listarPublicaciones` y `listarComentarios` | El filtro `tipo: { in: […] }` y la comprobación inalcanzable que lanza `ERROR_INTERNO` no casan con `create\|update\|delete\|$queryRaw\|FOR …`, y la opción se conserva |
| `tareas-01a-r1`, estático de 01a (:722-765) | el orden en `moverATema` y en `editarTarea` | `esActividadDeTipo` va después del `FOR NO KEY UPDATE OF t` y antes de `puedeEditarTarea(`. No es una escritura `tx.<modelo>.<op>(`. `exigirVersion(` y `validarFechaLimite(` conservan su nombre y su orden. `moverATema` solo amplía la condición de la rama que sube `tareas.version` |
| `instantanea-01b-r1` (punto 7) | `tareas.ts`: las escrituras no usan la opción; `leerTareaCon` y `listarTrabajoCon` no escriben; `leerTarea` y `listarTrabajo` sí la usan | §D-3.3 solo agrega `tipo` y filtros. `esActividadDeTipo` en `editarTarea` y `borrarTarea` no es la opción |
| `temas-01a-r1` (vigilada, :985-1031 y 1033-…) | `FOR KEY SHARE` en dos archivos; los cinco handlers de `handlers/tareas/`; ciclos en `temas.ts`, `categorias.ts` y `referencias.ts` | `handlers/foros.ts` vive fuera de `handlers/tareas/`, así que su `encolar(` y su `cancelar(` no entran en la regla. El `count` nuevo de `categorias.ts` va fuera de un ciclo (E1-9) |
| `temas-01a-r3` (:426-…) | `$queryRawUnsafe`; Prisma fuera de `adapters/`; la lista cerrada de `core/tareas/`, `handlers/tareas/` y cuatro archivos de `adapters/db` (sin `console.`, `estadoPago` ni roles) | Los archivos nuevos (`core/actividades.ts`, `core/foros/`, `adapters/db/actividades.ts` y `foros.ts`, `handlers/foros.ts`) no entran en esos prefijos. Los cambios de `temas.ts` y `categorias.ts` no comparan roles. Su caso :281 manda `?limite=-1&cursor=…&orden=nombre` a `GET …/temas`: con el `.transform` de E1-4, `z.object` sigue quitando llaves extra y sin `conForos` la respuesta es la de hoy |
| `arquitectura-cuentas-r1` (vigilada, :69-74) | `$queryRawUnsafe`, `obtenerDb` en handlers y middleware, `adapters/notifier`, dependencias | Sin SQL crudo nuevo ni dependencias. `handlers/foros.ts` usa los adaptadores, no el cliente |
| `muro-c-r1` (vigilada, :633-661) y su caso de visibles (:1127-…) | quién nombra las colas de avisos; `Default_Ignorable_Code_Point`, U+2800 y U+1D159 | El foro encola `TAREA_CREADA`, `RECORDATORIO_24H` y `CALIFICACION_PUBLICADA`, no las colas de avisos. Los textos se normalizan con las ayudas de `shared/`, no con una copia de la regla |
| `muro-c-r2` (T-31) | `normalizarTextoLargo =` en `frontend/src` | 01a1 no toca `frontend/` |
| `tareas-01b-r1` | quién escribe en `notificaciones` | 01a1 no escribe ahí |
| `calificaciones-estatico-01a-r1` (CAL-T-20 y CAL-T-21) y `-01b-r1` (CAL-T-68 y CAL-T-69) | `colas.ts`, `respuestas-de-entrega.ts`, `adapters/db/calificaciones.ts` y `handlers/calificaciones.ts` | Los cuatro están en "No se toca" de 01a1 |
| `alumnos-b-r1` | `inscripciones.ts` y `alumnos.ts` | 01a1 no los toca |
| `migracion-01a-r1`, `migracion-clases03a-r1` y `sexto-paso-02a-r1` | las migraciones hasta la suya y la de `clases_administradas` | Aplican "hasta la suya" por nombre ordenado. Las dos de FORO van después y no se aplican |
| `guarda-ch-r1`, `guarda-ch-r3`, `guarda-clase-r1` y `nombres-guarda-r3` | la guarda `onRoute`, con apps propias y `construirApp` | Las rutas de §D-3.1 pasan por `protegido()`, con `:claseId` en el tercer segmento |
| `sesiones-y-cadena`, los demás casos | `POST /api/admin/maestros` y el admin único | No cambian |
| `categorias-01a-r1` (vigilada, E1-9, :399-418) y `referencias-01b-r1` (:236) | el texto del `409 CATEGORIA_CON_TAREAS` con solo tareas | Con `foros === 0`, el texto es el de hoy, letra por letra |
| `nombres-ids-01a-r2`, `cuerpos-02a-r2` y el resto | la API con tareas, materiales y anuncios | Sin `conForos` las respuestas son las de hoy (§D-6), y ninguna recorre los valores de `tipo_publicacion`. La única que inserta con `::tipo_publicacion` (`migracion-clases03a-r1:128`) usa `material` |

**Fuera del backend: P-01a1-1 (PARADA de diseño).** Por la regla de `shared/` (`AGENTS.md`, "Pruebas", y §D-R0 01a1, "Frontend": "Si alguna prueba del frontend falla por los tipos nuevos de `shared/`, PARADA"), recorrí también las `*.ataque` del frontend que leen `shared/src` o `backend/src`. Solo hay una: `frontend/src/lib/errores-ch3-r2.ataque.test.ts`. Las demás que usan `import.meta.glob` leen `/src/**` del frontend, y ninguna importa `@campus/shared` como espacio de nombres.
- **Caso:** "ataque CHORE-03 03a r2 · T-01: el supuesto de la regla contra las fuentes reales" › "en shared/src, todo mensaje que empieza con «palabra:» es un nombre del inventario, y lo que lo sigue no es otro nombre" (líneas 270-279). Recorre los literales `"<nombre>: <resto>"` de `shared/src/*.ts` y exige que `<nombre>` esté en el conjunto cerrado `INVENTARIO` (líneas 230-254: `archivoId`, `maestroId`, `claseId`, `alumnoId`, `temaId`, `publicacionId`, `comentarioId`, `categoriaId`, `tareaId`, `confirmar`, `tema`, `${campo}`, `tipo`, `bloque`, `recursoId`, `seccion`, `dudaId`, `respuestaId` y `resuelta`).
- **Qué la rompe:**
  - §D-3.2 (E1-4) manda escribir en `shared/src/tareas.ts`, literalmente, `conForos: z.literal("si", { error: "conForos: no es válido" }).optional()`. `conForos` no está en `INVENTARIO`.
  - §D-3.2, "Parámetros": `foroIdParamSchema` y `participacionParamSchema` llevan "su mensaje "`<campo>`: debe ser un identificador válido"". Si se escriben como los de hoy (`"tareaId: debe ser …"`, `"dudaId: …"`), `foroId` y `participacionId` tampoco están. Solo se salvarían con la ayuda `idDeRuta` de `shared/src/entregas.ts:135-136` (literal `${campo}`), que no se exporta, y `shared/src/entregas.ts` está en "No se toca".
- **Reproducción sin código de producción:** apliqué la expresión de la prueba (`/["'`]([\p{L}\p{N}_.${}()-]+?):[ \t]([^"'`\n]*)/gu`) y el `INVENTARIO` copiado del archivo a las tres líneas que manda el plan (guion `demo-t01.mjs` en el scratchpad). Salida: `conForos FUERA del inventario`, `foroId FUERA del inventario` y `participacionId FUERA del inventario`. Con el código de 01a1, el caso falla con `fuera` igual a esas entradas, `expected [ … ] to deeply equal []`.
- **Por qué es PARADA y no un C-n:** §D-R0 01a1 solo autoriza C-1 y C-2 y no lista esta prueba entre las "Vigiladas". La lista "Vigiladas" cita `frontend/src/lib/errores-de-api.test.ts:463-470`, que es otra prueba. El precedente es C-26 de CLASES-03b (Enmienda 3 b), que sumó `dudaId`, `respuestaId` y `resuelta` a `INVENTARIO` por enmienda. Decide el arquitecto, por enmienda: sumar un C-n que agregue `conForos`, `foroId` y `participacionId` a `INVENTARIO` (con la comprobación de que `quitarRutaDelMensaje` deja texto legible en esos mensajes, como en el Arbitraje 2 de CLASES-03a), o cambiar los mensajes.
- **Para 01b (aviso, no es de esta ronda):** §D-6 manda escribir `conTipo: z.literal("si", { error: "conTipo: no es válido" })` en `gradebookQuerySchema` y `misCalificacionesQuerySchema`. Choca con la misma prueba: `conTipo` tampoco está en `INVENTARIO`.

### Pendiente para cerrar la ronda 0
1. **P-01a1-1:** la enmienda del arquitecto para `errores-ch3-r2.ataque.test.ts` (C-n nuevo o cambio de mensajes) y, si es un C-n, aplicarlo yo.
2. **P-01a1-2:** que el humano confirme que la otra copia no está corriendo una suite. Con eso, medir la carga y correr `cd backend; npx vitest run test/sesiones-y-cadena.ataque.test.ts test/lecturas-fx-r1.ataque.test.ts` y `cd backend; npm run lint` para mostrar los dos rojos esperados. Si el C-n de P-01a1-1 toca el frontend, también `cd frontend; npx vitest run src/lib/errores-ch3-r2.ataque.test.ts`, que antes del programador debe seguir en verde.
3. La suite completa y PA-07 completa son del manager al cerrar la subentrega.

### Comandos y última línea
- `cd backend; npm run lint`: **sin ejecutar** (P-01a1-2). Es un `tsc` doble y no es una suite, pero con la otra copia en una suite del frontend no le sumé carga: en ESTADO §5, la carga del equipo ya tumbó por tiempo pruebas de 5 s del frontend.
- `cd backend; npx vitest run test/sesiones-y-cadena.ataque.test.ts test/lecturas-fx-r1.ataque.test.ts`: **sin ejecutar** (P-01a1-2).
- PA-07 (versión de rondas): no hay salida que contar. Sin corrida no hay conteo de `40P01`, `deadlock detected`, `could not serialize`, `too many clients`, `"Error no controlado"` ni `"code":"P2028"`.
- `sha256sum docs/trabajo/FORO-01-actividad-tipo-foro/plan.md`: `1b7daae3a6da9db255a675c32eeb21d5d9e791d17e315a76fc404b93fa26f44e`.
- `git diff --numstat e94ee59 -- backend frontend shared`: `5 1 backend/test/lecturas-fx-r1.ataque.test.ts` y `33 1 backend/test/sesiones-y-cadena.ataque.test.ts`.

### SHA-256 de las `*.ataque` al cierre de la ronda 0 de 01a1 (base de V-01 de la ronda 1)
Son 249: 94 del backend y 155 del frontend. Comando: el de V-01, sobre el árbol de trabajo (LF). SHA-256 de la salida de `find … | sort | xargs sha256sum`:
- backend, `dfdee81d1eb51d356410f9244f113bfd6c4e933d77f55c7a51976338e1730fc6`;
- frontend, `a2f8282929a69aa29e60f8b4f39fe92057c17a524ceb6882c356752416caf674`.

**Frontend:** las 155 filas son idénticas, una por una, a la tabla "SHA-256 de las `*.ataque` del frontend al cierre de la ronda 2 de 02b" de `docs/trabajo/CALIFICACIONES-02-exportar-a-excel/reporte-tester.md`, y el hash de la lista también es el mismo. La tabla completa, con las 249 filas, está en el scratchpad (`tabla-r0.md`).

**Backend:** solo cambian las dos filas marcadas.

| Archivo | SHA-256 | Nota |
|---|---|---|
| `backend/src/config/correo.ataque.test.ts` | `bcce2cae771f97957d8691bef7fff4ec42412daaeabf726aeb0afc59f6f25671` | |
| `backend/src/config/env.ataque.test.ts` | `dcb78d222544e8dc4fbece59468f555b04abe971b70016e9bb17fcae3e958580` | |
| `backend/src/config/logger.ataque.test.ts` | `71e7f049447d2d1ecedd897c55ea0b6d31221753f0a7e7473c7ac6e8667f0a95` | |
| `backend/src/core/clases/codigo-r1.ataque.test.ts` | `91f620c1a27778eebc2bed5eec1bc9b0e3fe1199b32ed00f9dd910011d6a1805` | |
| `backend/src/core/clases/codigo-r2.ataque.test.ts` | `262691f5786ad63b2393d0ba5ff97538f6dacf43343bed019ad23c12a07d8686` | |
| `backend/src/workers/ritmo-03c-r1.ataque.test.ts` | `e769cbfcc3a83a64b51c6437f80684640a7c928ad6b8c5c1671fdff005d7b734` | |
| `backend/test/admin-muro-02b-r1.ataque.test.ts` | `294be1af0bf69d6c05f54e2f0d8e587c78a5527d0b64d1a224c058e31ce013d0` | |
| `backend/test/admin-unico.ataque.test.ts` | `388ad0e585639b8c3e0e0a6657fb42c1b9cb83db721c4863c4fa19e0be42ec85` | |
| `backend/test/alumnos-b-r1.ataque.test.ts` | `d2cc28b62bf988ae14ba975a9bc8d534aec0eebce30da93d7ded9a26026b0857` | |
| `backend/test/alumnos-b-r2.ataque.test.ts` | `00346d471355abc7971b921649e7192b8987fe27912c00cb7e41aef2065369e9` | |
| `backend/test/alumnos-b-r3.ataque.test.ts` | `fc11ab4b914d4a88612953f82db354e2b9cea9bef86e24321ef7e031f3ac3837` | |
| `backend/test/api-real.ataque.test.ts` | `441a766a94e7d9b26807790402e06ed94d4cc378d8f6ecf0bccc3259c7ff55fb` | |
| `backend/test/archivos-d-r1.ataque.test.ts` | `d9e1de5b1bd43f54cf3a4dcf153d1eeabdc36b4dec02fbeb9d8a0239f298dfe9` | |
| `backend/test/archivos-d-r2.ataque.test.ts` | `1637eb447cd12ac5bdddc7634980dbc10a25cbad5de01bf6c09f40ed930ff1a9` | |
| `backend/test/arquitectura-cuentas-r1.ataque.test.ts` | `42bb7bf3086230c6edc65ab73976ac8a801956336561aadbee65cc3b40eb8612` | |
| `backend/test/arranque-r1.ataque.test.ts` | `38adb0984744a0810287711f57ba0498287d0bc96344b8948ba1c490ca807716` | |
| `backend/test/auth-login.ataque.test.ts` | `2c83d82d10bdd9b7a969768774d75b18b7a71a594bbaac5fae36a0e134d2336c` | |
| `backend/test/auth-registro.ataque.test.ts` | `73d3a2ae708a0ef676547a8094115b1419423057378387269bc3eadb34c7724e` | |
| `backend/test/autoria-02b-r1.ataque.test.ts` | `6f557e8e860bce6374671e90086e9c14b1861a308b6fbb434564612647892713` | |
| `backend/test/calificaciones-01a-r1.ataque.test.ts` | `5e02a27716d63e8ce0fe6b6171bff089eb3ee2548260349b16950d7e65a1bcf9` | |
| `backend/test/calificaciones-01a-r2.ataque.test.ts` | `afb531e7ccab1cb53f0322d7d099a7f435dbd42325de8c225525e3784b93f6cc` | |
| `backend/test/calificaciones-carreras-01a-r1.ataque.test.ts` | `dd919ebd74a2c6ac60c244a1563b46895821b0d25e5051cda25fffb72b653416` | |
| `backend/test/calificaciones-estatico-01a-r1.ataque.test.ts` | `b09baaec53455cea1a0674890ebd9353007e6f2628001446e873b09279ffba07` | |
| `backend/test/calificaciones-estatico-01b-r1.ataque.test.ts` | `29eed2e93af2775a4605160ea533bd462fd03cb1cfe4c47154898358a7255869` | |
| `backend/test/calificaciones-instantanea-01b-r1.ataque.test.ts` | `6e4c0eb47ff8020b0a539e5b70b24c8c1d05f7773ea092cd513e39c68cf4534e` | |
| `backend/test/categorias-01a-r1.ataque.test.ts` | `6e3c92c13f146a01c8dcfdc7dd04bea59f0e2562051f6ac65f95f924ef73e4db` | |
| `backend/test/clases-r1.ataque.test.ts` | `95bba9bac44366ad5a361e93dd2f278cb0a1cc889fa479049acc7b45a9a5e71b` | |
| `backend/test/clases-r2.ataque.test.ts` | `a87817d56c236c0ba3597214cac23b10483bbc28ae44800c592ed5ce2ef97f38` | |
| `backend/test/clases-r3.ataque.test.ts` | `72de7d8af3d3f772abc19db065f6e418f6eb76ce78d87fe6ebb51335fc99825a` | |
| `backend/test/clases-r4.ataque.test.ts` | `be97c4e48ac9551bed1d01552e90ab8cdf085cf928ae6c8c3d81809e35f7ce62` | |
| `backend/test/concurrencia-02a-r1.ataque.test.ts` | `000ec9008c73d25121c82a46f5ea0f67e6c8c387cb04e361ef82812b57956098` | |
| `backend/test/cuentas-03a-r1.ataque.test.ts` | `530546b4d70a2b9ad36f98f37e2af45480e81a1101ee3516d15426f78350bf82` | |
| `backend/test/cuentas-r1.ataque.test.ts` | `6303ddc170545f616c66773c3f5475cb3be1fea9347d8059354d6ade8d676c16` | |
| `backend/test/cuentas-r2.ataque.test.ts` | `3a4e81c111b8eeb7df065804aa85062fa3fc607f0147149b71ac21c14e7818d9` | |
| `backend/test/cuentas-r3.ataque.test.ts` | `f54f79f7b2a83e95fe440053ccaf15cb3ebb01ce5dfd4c6655e22159a5fd7e6b` | |
| `backend/test/cuerpos-02a-r2.ataque.test.ts` | `a2f9bff596330a7d55d1ca9d47197fc831eb132f52c759610e2d667895c3332f` | |
| `backend/test/dudas-clases03b-r1.ataque.test.ts` | `4ea45eaa95c5ea2e1ec91e04d2bba32689a30bd341ade16625b28aabdb96d6d9` | |
| `backend/test/enlaces-03b-r1.ataque.test.ts` | `d7a9da854ce8ab8ad8d2437db2e8c2a642a777ea3261a6b038da28be022df848` | |
| `backend/test/enlaces-03b-r2.ataque.test.ts` | `dc1b7ee7ea58966f5db33ccb4581885a9669dea2263954ae46d17a83e1ef6eaf` | |
| `backend/test/enlaces-ch-r2.ataque.test.ts` | `b051b1986496e35e3e306c4c6bc306a763542bca4b350574d0c02e2c484deb35` | |
| `backend/test/entorno-ch-r1.ataque.test.ts` | `d28cc4de621a680e6b54b2bff889700300d558ec7849717584518d2f03ec8cae` | |
| `backend/test/entregas-01b-r1.ataque.test.ts` | `47b02c6d3916713bf9236a619fdb59a641d2e805f1f0b7e9b2c161fe719ddc3a` | |
| `backend/test/entregas-01b-r2.ataque.test.ts` | `5baaf6f8fb76320620ed4a84efaca2b2d473460f62360e0d48738b97a0ac584a` | |
| `backend/test/exportacion-02a-r1.ataque.test.ts` | `885668a621af11f17b4ac706db705aef33231b7773e4783147d21b318bdd0f9a` | |
| `backend/test/formada-ch-r1.ataque.test.ts` | `ba1ac9b17cc9bf747522bd4ec8b87df436008482e643b18eea8e9a8c041c59b3` | |
| `backend/test/gestion-02a-r1.ataque.test.ts` | `ec9602d5f109b45a6d428e708d9b6cdd37a7509a6ff9031fa6fd8a2da0e25e9b` | |
| `backend/test/gradebook-01b-r1.ataque.test.ts` | `e4e9365ea010f3f670b6c1194d1a592e95db43bff0496d4ea1646fc5225ca8b4` | |
| `backend/test/guarda-ch-r1.ataque.test.ts` | `5f4133f949d2f337a8f63b75cf82cb77114db7812d67c1960105f5000c31a326` | |
| `backend/test/guarda-ch-r2.ataque.test.ts` | `7a7dac6d87edf81059fcff9c07471aaf49d690ec159be4b9fd4aa32b0909a215` | |
| `backend/test/guarda-ch-r3.ataque.test.ts` | `610ee44e5d0bcea46eb4e3645f9adf1998a76947a25af7e3f8248ea3a633df79` | |
| `backend/test/guarda-clase-r1.ataque.test.ts` | `e5d149f3ac52b726e1fe08908249706341330f88eaa6674b9a9ac67b98b1e864` | |
| `backend/test/guarda-clase-r2.ataque.test.ts` | `c979d2c9c420a2177fa6ebddb78eb2ce84d5f043b94270f690916a6fc75d6f8f` | |
| `backend/test/guarda-r2.ataque.test.ts` | `20982e2b98f1b162146a211923f3d5ec19d4e170c4aa3a5bfc6f82c3b6173aad` | |
| `backend/test/hilo-01c-r1.ataque.test.ts` | `2649f3d357dcb806361ac101c57fcb504b9c798b631048f0b3e200f63da7dc30` | |
| `backend/test/instantanea-01b-r1.ataque.test.ts` | `2d2216ee9db290b318825a6f73c346d4767cacc12d95f5ca76457a78b63fedc3` | |
| `backend/test/intentos-r2.ataque.test.ts` | `a8b79d5ad98270be3747f493865708a78bb73add08d832584db4464c3582777a` | |
| `backend/test/invitacion-flujo-03a-r2.ataque.test.ts` | `2619b44eea3370494c95ac128fcfd9e3ffc20d1581a19f549bf371f603a11d7d` | |
| `backend/test/invitacion-masiva-03c-r1.ataque.test.ts` | `704155928183aec193ae7e157b86b3e9361d2b63c7a47be1ed859605fab4ffa6` | |
| `backend/test/invitacion-masiva-03c-r2.ataque.test.ts` | `dd9b7454e8786bf0b833d265900ccaecf595808cebc8e9a77c9aef15298a1038` | |
| `backend/test/lecturas-fx-r1.ataque.test.ts` | `a25045d3679cf6b879255733717b8d3487aeb6408c7272d87d40bc46f20d9c1a` | C-2 de FORO-01a1; en `e94ee59`: `849134d1af25c6f4bae7225030dc123421d770cc253237ee8ec47b9fdc948529` |
| `backend/test/lecturas-fx-r2.ataque.test.ts` | `4090a21f3b389a24bc67d5f585440a55c39c8387112bdb35116863c5e609662c` | |
| `backend/test/logs-02a-r1.ataque.test.ts` | `f9f9ec59ec8d1a5ccb180522798140c45604440f48edcd68a3e02863d90ae347` | |
| `backend/test/logs-02b-r1.ataque.test.ts` | `a2006c163d9e6cd3e4a2a773d1501826daf3c8e7bb184d205bfc6442318fb59c` | |
| `backend/test/logs-03a-r1.ataque.test.ts` | `bd8b303c434efec0785e0691d31d6f6e87dbf3305f50fa27cce0f78cbb251e3a` | |
| `backend/test/logs-03b-r1.ataque.test.ts` | `b58d5d013658433fe5839634e2db5a31b8d2b8f69587bc36958752d3cd33bbf7` | |
| `backend/test/logs-03c-r1.ataque.test.ts` | `0e4abf3bc5d92fa0c380805453190703862567930dd74b9e7fcc1809564d181f` | |
| `backend/test/logs-archivos-d-r1.ataque.test.ts` | `1e775a19682f3a5995d7c035bcc810a36bf50c22045b6ffbfc5a98b821255db0` | |
| `backend/test/logs-archivos-d-r3.ataque.test.ts` | `e9ce866d511e3ee6029015b74e20b4d342a60be99b3aac97e86f00283a3c77f1` | |
| `backend/test/logs-cuentas-r1.ataque.test.ts` | `e008935b107752d203f6423b2f1c9e0f5a4339f0a77154746bf262cecb90351a` | |
| `backend/test/logs-muro-c-r1.ataque.test.ts` | `690e30ed39111c0a074fc159015967cd9f0fdc24d9a340e6a0d7be4b980a9d45` | |
| `backend/test/logs-muro-c-r2.ataque.test.ts` | `0809c60700e26183e7771b4b1a40b05cbf554c2ed7929190cf4d89a52722e551` | |
| `backend/test/logs-r2.ataque.test.ts` | `5af3909e4b7ca485e78979567872ea78bf41e6d679b9ec2c761eaa0b250df689` | |
| `backend/test/migracion-01a-r1.ataque.test.ts` | `d6b9adaf1c14a61fe369f510774ef702cfa20f28f3cb19b0eb7357440dcb0783` | |
| `backend/test/migracion-clases03a-r1.ataque.test.ts` | `2afd58e1ead0a293aa7bd58c639f3e5126d153a418f9a26450228468e12b2bed` | |
| `backend/test/mis-calificaciones-01b-r1.ataque.test.ts` | `bc6d49f9fc1f5eb20e305945fef57caeebeb108bff5d5cf4ba10b8040687d69c` | |
| `backend/test/muro-c-r1.ataque.test.ts` | `d23bf1312777bdc000810e403a5b4d99c9c0e12998e4cc11be5ef5a2253f6935` | |
| `backend/test/muro-c-r2.ataque.test.ts` | `7825cfc9b484df740fa0e9562a195d1bbcaf4caf72ea55fa847b5394ab96c125` | |
| `backend/test/nombres-guarda-r3.ataque.test.ts` | `8b733b86fc6d54ece008389a59793fae4ec4a65146eb37215e900e50a5337d46` | |
| `backend/test/nombres-ids-01a-r2.ataque.test.ts` | `3fd2583a4de7cd432b2e09a5130c23d6a59fa475e5e0aa69f23739351acbf9cf` | |
| `backend/test/nombres-tokens-r2.ataque.test.ts` | `00a6eb6f7ccd7d8790c356befcc96ddfda6eacce0be53de255cfe3626d8f2adb` | |
| `backend/test/nowait-ch-r1.ataque.test.ts` | `80b5a848f69b429e7dadec86c07bec1d3e3eed8a042efba41ce912ded39e7bab` | |
| `backend/test/recursos-clases03a-r1.ataque.test.ts` | `42f4e113762ef26459e95642ff4b814613353d64d462ab2b01ecdeef4b9e160d` | |
| `backend/test/recursos-clases03a-r2.ataque.test.ts` | `ff4d112aff8685fcd9c5ca933a0b359e2b4e9bedad8f1b5d3d787cfdec711516` | |
| `backend/test/referencias-01b-r1.ataque.test.ts` | `ad0dab1952e509237acac12bb1f6774fa9c5de8b44d1e6928edc65cc67a78c21` | |
| `backend/test/servicio-ocupado-ch-r1.ataque.test.ts` | `6f2abc2cefd77d74cd1e3abbdce9c41bb53d00bd4d8e5ba7e496c4441c2697e5` | |
| `backend/test/sesiones-y-cadena.ataque.test.ts` | `9e06a771a7f87b06f356a5af4e35496749c07cf0e1ee4aa0a8956d953b8b9b5c` | C-1 de FORO-01a1; en `e94ee59`: `78680f5e046af46ed8e1b403dd5c2e81a1492eb1aa99e132fb26e4e6d92f0446` |
| `backend/test/sexto-paso-02a-r1.ataque.test.ts` | `70ac720f2e7fcadee5bbcb6414887ab08129dea7cd91df012046953b1584e8b6` | |
| `backend/test/tareas-01a-r1.ataque.test.ts` | `c89c30851e6b409cd045017181147bf674df947762a8dea3f3fb981bd9b36e09` | |
| `backend/test/tareas-01b-r1.ataque.test.ts` | `79bc7aafc11676d36129610a4b5cd5fe5d8234d0d748487fd2f3e48c5f772c79` | |
| `backend/test/temas-01a-r1.ataque.test.ts` | `ae60c11cff5c82df4954db48582df4bd5a64957ff9afaf9712aa43a038f8e189` | |
| `backend/test/temas-01a-r3.ataque.test.ts` | `dc7b86a621062ed671c1e7174a745019133fbd410c7a2e78114b2a2c50affe95` | |
| `backend/test/worker-03c-r1.ataque.test.ts` | `f09e9a0038c47d1a2223376a0af260baf573f0c45bf770201c48c9e30296f04b` | |
| `backend/test/worker-r1.ataque.test.ts` | `9f60f9d65d52d2021a1eb04e9f01d3cc68f22744c845bf93d6621aa4fe9713a8` | |
| `backend/test/worker-r2.ataque.test.ts` | `77d11bd85f202a9eec92a363df82e63fb9a784ca9d368d49f62e61c1a2aa967b` | |

### Cotejo de la transcripción (orquestador, 2026-11-05)
- SHA-256 del texto transcrito, antes de esta sección: `af27713e1ae18b29d70883469e419c90883d6a1e403f57e60e24f114c9cdf764`.
- Tabla del backend: las 94 filas transcritas (ruta y SHA-256) son idénticas a `find backend -name "*.ataque.test.ts*" -not -path "*/node_modules/*" | sort | xargs sha256sum` sobre el árbol y a las 94 filas del backend de `tabla-r0.md` del scratchpad (`diff` sin diferencias en los dos).
- SHA-256 de las listas ordenadas, recalculados: backend `dfdee81d1eb51d356410f9244f113bfd6c4e933d77f55c7a51976338e1730fc6`, frontend `a2f8282929a69aa29e60f8b4f39fe92057c17a524ceb6882c356752416caf674`: coinciden con el reporte.
- `git diff --numstat e94ee59 -- backend frontend shared`: `5 1 backend/test/lecturas-fx-r1.ataque.test.ts` y `33 1 backend/test/sesiones-y-cadena.ataque.test.ts`, como dice el reporte.
