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

---

# Rearranque (2026-11-14): subentregas de la Enmienda 9

Lo anterior es la ronda 0 de 01a1 del 2026-11-05, sobre `e94ee59` y el plan de la Enmienda 6; queda como historial. Desde aquí, las rondas son sobre la rama `feat/foro-01-actividad-tipo-foro` (base `fd4a7ad`) y el plan aprobado el 2026-11-14 (SHA-256 `e899f7b5…`).

## Ronda 0 — FORO-01a (2026-11-14)


Veredicto de la ronda 0: **aplicada, sin PARADA.** C-1, C-2 y C-6 aplicados con el texto de §E7.5.1; ninguna prueba fuera de la lista cerrada, de los C-n o de las vigiladas cuenta algo que 01a cambia. Plan verificado antes de empezar: `plan.md` 2729 líneas, SHA-256 `e899f7b5bb1fe9b0cb2be14cc1268a7eb365a15cdef7ddbf8efbdd31ba61fd88` (coincide con el aprobado).

### Arranque
- `docker info`: responde (Docker Desktop, servidor 28.5.1). Equipo con corriente (`Win32_Battery.BatteryStatus` 2, 100 %), no a batería. Red declarada de confianza por el humano para hoy; no toqué Docker ni el firewall.
- V-01 de arranque, desde la raíz: `sha256sum -c ".../foro01-arranque/v01-foro01a-base.txt"` → 291 `OK` (105 de `backend/`, 186 de `frontend/`), salida 0. Las rutas de la lista son exactamente las 291 `*.ataque` del árbol (`git ls-files --others --cached --exclude-standard`, cotejo con `diff`).
- `git diff --quiet fd4a7ad -- backend frontend shared`: sin diferencias antes de empezar.

### Comprobación de arranque (§E7.5.0; línea "Grep de la lista" de §E7.5.1), sobre el árbol = `fd4a7ad`
Todos desde `backend/`:
- `grep -rlE 'printRoutes|rutasDeLaApp\(' test --include='*.ts'` → **7 archivos**, como dice el plan: `ayudas-clases-archivadas.ts` (la ayuda que define `rutasDeLaApp`), `clases-archivadas-matriz.integracion` (lista cerrada), `clases-archivadas-r1.ataque`, `gestion-clases-autorizacion.integracion`, `movimientos-inscripcion.integracion`, `recursos-autorizacion.integracion` (vigiladas) y `sesiones-y-cadena.ataque` (C-1). En `src/`, ninguno.
- `grep -rnoE '\b(leerTarea|crearTarea|editarTarea|borrarTarea|listarEntregas|leerEntregaDeAlumno|listarHiloPrivado|calificarEntrega)\(' src test` → llamadas en `src/adapters/db/{tareas,entregas}.ts`, `src/handlers/calificaciones.ts`, `src/handlers/tareas/{tareas,entregas,hilo-privado}.ts` y, en pruebas, `borrado-duplicado-r1.ataque` (2), `calificaciones-01a-r2.ataque` (2), `calificaciones-concurrencia.integracion` (1), `calificaciones-lecturas-consistentes.integracion` (2), `entregas-lecturas.integracion` (2), `instantanea-01b-r1.ataque` (5), `lecturas-consistentes.integracion` (2) y `tareas.integracion` (5). Todas pasan los argumentos de hoy; un parámetro opcional nuevo no cambia ninguna.
- Las funciones de `core/` de §D-2.4 (`validarCategoriaRequerida`, `mensajeTareaConEntregas`, `exigirBorradoConEntregasPermitido`, `tareaModificada`, `entregaModificada`, `rubricaModificada`, `decidirCalificacion`, `entregaNoCalificable`, `exigirEntregaCalificable`, `tareaConCalificaciones`, `exigirRubricaCongelada`, `errorTareaNoEncontrada`): fuera de `core/` y `adapters/db`, solo las llaman `core/tareas/tareas.test.ts` y `core/calificaciones/calificar.test.ts`, con los argumentos de hoy. Un último parámetro opcional con `"tarea"` por omisión no cambia ninguna llamada.
- `grep -rnE 'tipo_publicacion|TipoPublicacion' test` → `migracion-clases03a-r1.ataque.test.ts:128` (inserta tipos que existen) y un comentario de `migracion-tareas.integracion.test.ts:23`. Coincide con el plan.
- `grep -rn 'instantaneaUnica: true' src/adapters/db` → **24** usos: `borrado-de-clase` 1, `calificaciones` 2, `clases-archivadas` 1, `clases` 4, `dudas` 2, `entregas` 4, `exportacion-de-calificaciones` 1, `gestion-de-usuarios` 2, `movimientos` 1, `publicaciones` 2, `recursos` 2, `tareas` 2. Son las veinticuatro del título de hoy; con los cinco de foros, veintinueve (C-2).

**Búsqueda propia de pruebas no inventariadas** (backend, frontend y `shared/`; sin `.env`):
- Catálogo de la base (`pg_enum`, `enum_range`, `pg_constraint`, `pg_indexes`, `information_schema`, `_prisma_migrations`): las que lo leen piden objetos por nombre (índices y CHECK de su encargo; `usuarios-admin-migracion:24` cuenta solo su migración por nombre). Ninguna enumera los valores de `tipo_publicacion` ni las tablas. El CHECK `publicaciones_titulo_segun_tipo` lo nombran solo `muro.integracion:201-219` y `migracion-tareas.integracion:69-105`, ya vigiladas.
- Lecturas de carpetas (`readdirSync`/`readdir`): las de `prisma/migrations` aplican "hasta la suya" o buscan una por sufijo (`calificaciones-migracion:463`, `clases-archivadas-migracion:130`, `migracion-01a-r1:89`, `migracion-clases-03a:90`, `migracion-clases-03b:89`, `migracion-clases03a-r1:86`, `migracion-maestros-de-clase:28`, `sexto-paso-02a-r1:164`); las de `src/` son reglas generales que `handlers/foros.ts`, `adapters/db/foros.ts` y `core/foros/` cumplen si siguen el diseño (`tareas-01b-r1:789`, nadie fuera de `notifier` escribe notificaciones; `muro-c-r1:1136` y `muro-c-r2:326`, sin copias de la regla de caracteres visibles; `higiene-de-pruebas:251-302`, sin `setErrorHandler` ni `addHook` fuera de su lugar). Las demás son vigiladas de §E8.5.
- `lecturas-fx-r2.ataque.test.ts:918-952` (solo `handlers/clases/muro.ts` llama a `listarPublicaciones` y `listarComentarios`, con un argumento) no está en la lista de vigiladas por línea, pero 01a no suma llamadas: §E8.1 cambia `listarPublicaciones` por dentro y el foro lista con `listarForos`. No es PARADA; lo dejo como observación para el programador (si `handlers/foros.ts` llamara a `listarPublicaciones(`, caería).
- Exportaciones de `shared/src/index.ts`: ninguna prueba del backend ni del frontend enumera el módulo (`import * as`, `Object.keys`). Las listas de códigos que se cuentan (`CODIGOS_CON_MENSAJE_DEL_SERVIDOR` en `features/{tareas,clases}`, `CODIGOS_QUE_REDIRIGE_EL_CLIENTE`) son del frontend y 01a no las cambia.
- Prefijos `"<nombre>: …"` de `shared/src`: solo los lee `frontend/src/lib/errores-ch3-r2.ataque.test.ts` (C-6, con `import.meta.glob` sobre `shared/src/*.ts`). Su segundo caso (`:268-276`, el backend) solo pide que nada siga a un prefijo con otro nombre en camelCase: vigilado.
- Archivos de `adapters/db` o `handlers` nombrados en listas: `calificaciones-estatico:69` y `:94-103`, `calificaciones-lecturas-estatico:113`, `exportacion-calificaciones-estatico:134` y `arquitectura-cuentas-r1:108`, todos ya vigilados; ninguno lista archivos de forma cerrada que 01a deba ampliar.

**Resultado: ninguna prueba no inventariada. Sin PARADA.**

### Respaldo
Copias de los tres archivos, antes de tocarlos, en `foro01-arranque/r0-01a-respaldo/` del scratchpad: `sesiones-y-cadena.ataque.test.ts` (`e177959b…`), `lecturas-fx-r1.ataque.test.ts` (`e3e7d53e…`) y `errores-ch3-r2.ataque.test.ts` (`5d41a2af…`), iguales a los del árbol en `fd4a7ad`.

### C-1 — `backend/test/sesiones-y-cadena.ataque.test.ts` (aplicado)
- Líneas del plan cotejadas: el comentario de ADMIN-01e en `:573-584`, el título en `:585` y la lista hasta `:750`. Coinciden.
- Cambios (`git diff -U0 fd4a7ad`): `:585` → `:585-592` (el comentario de FORO-01a, partido en 7 líneas sin cambiar una palabra, y el título con "ADMIN-01b, ADMIN-01e y FORO-01a"); `+1` DELETE después de `…/dudas/:dudaId/respuestas/:respuestaId` (`:624`); `+10` GET después de `GET …/dudas/:dudaId/respuestas` (`:647-656`); `+10` HEAD después del HEAD equivalente (`:694-703`); `+3` POST después de `POST …/dudas/:dudaId/respuestas` (`:752-754`); `+2` PUT después de `PUT …/dudas/:dudaId/resuelta` (`:775-776`).
- Comprobación mecánica (node, sobre el texto): la lista pasa de 138 a 164 entradas, 26 nuevas, ninguna quitada ni repetida, y es igual a su `sort()`. El orden coincide con el ajuste de `e81ff10`.
- Qué afirma ahora: bajo `/api` existen exactamente las rutas de hoy más las 26 entradas de las 16 rutas del foro; ninguna crea admins; siguen creando maestros solo las tres de hoy.
- Antes: `npx vitest run test/sesiones-y-cadena.ataque.test.ts` → `Tests  35 passed (35)`.
- Después: el mismo comando → `Tests  1 failed | 34 passed (35)`. **Rojo esperado:** `expected [ …(138) ] to deeply equal [ …(164) ]`; las 26 líneas del diff son todas `-` (esperadas y no recibidas) y todas de `/foros`; ningún `+`. Las rutas aún no existen. Los otros 34 casos, verdes como antes.

### C-2 — `backend/test/lecturas-fx-r1.ataque.test.ts` (aplicado)
- Líneas del plan cotejadas: el título en `:758`, la lista `usos` en `:805-839`, con `"adapters/db/exportacion-de-calificaciones.ts:1"` en `:827` y el comentario de ADMIN-01e en `:828`. Coinciden.
- Cambios: `:758`, el título dice "veintinueve lecturas (…, dos de gestión de usuarios, una de movimientos y cinco de foros)"; `:828-831`, el comentario de FORO-01a (3 líneas, mismo texto) y `"adapters/db/foros.ts:5"`, entre la exportación y el comentario de ADMIN-01e. `<n>` = 5, el previsto; si el programador declara otro número, el título y la entrada cambian en otra ronda.
- Qué afirma ahora: además de lo de hoy (nadie fuera de `adapters/db` nombra la opción, `index.ts` no reexporta `enTransaccion`, los niveles solo en `cliente.ts`, los dos usos de `tareas.ts` en código), `adapters/db/foros.ts` tiene exactamente cinco `instantaneaUnica: true`.
- Antes: `npx vitest run test/lecturas-fx-r1.ataque.test.ts` → `Tests  24 passed (24)`.
- Después: el mismo comando → `Tests  1 failed | 23 passed (24)`. **Rojo esperado:** en la última aserción, `expected [ …(12) ] to deeply equal [ …(13) ]`, con la única línea `-   "adapters/db/foros.ts:5"`: el archivo aún no existe. Las aserciones anteriores del caso pasan (la falla es la última). Los otros 23 casos, verdes como antes.

### C-6 — `frontend/src/lib/errores-ch3-r2.ataque.test.ts` (aplicado)
- Líneas del plan cotejadas: `INVENTARIO` en `:231-254`, con `"resuelta",` en `:253`. Coinciden.
- Cambios: `:254-257`, después de `"resuelta",`, el comentario de FORO-01a (2 líneas, mismo texto) y `"foroId"` y `"participacionId"`. `"conForos"` no se agregó (va en C-7, 01b). `conTercero` sigue esperando `[]`.
- Qué afirma ahora: en `shared/src`, todo mensaje con prefijo `«palabra:»` usa un nombre del inventario, que ahora admite `foroId` y `participacionId`, y nada lo sigue con otro nombre en camelCase.
- Antes y después: `npx vitest run src/lib/errores-ch3-r2.ataque.test.ts` → `Tests  85 passed (85)` en las dos. **Verde, y es lo correcto:** `INVENTARIO` es una lista de permitidos; hoy ningún archivo de `shared/src` usa esos prefijos, así que agregarlos no cambia el resultado. Lo que vigila se activa cuando exista `shared/src/foros.ts`: con un prefijo fuera de la lista, el caso de `:258` cae.
- Comprobación de legibilidad, con las dos expresiones de `quitarRutaDelMensaje` leídas del propio `lib/errores-de-api.ts` (`RUTA_DEL_MENSAJE` y `CAMPO_QUE_REPITE_EL_ESQUEMA`, en node): `"foroId: foroId: debe ser un identificador válido"` → `"debe ser un identificador válido"`; `"participacionId: participacionId: debe ser un identificador válido"` → `"debe ser un identificador válido"`; con un solo prefijo, lo mismo.

### PA-07 (sobre los dos archivos del backend, uno a la vez)
Conteo en la salida completa de cada una de las cuatro corridas (antes y después de cada archivo): `40P01` 0, `deadlock detected` 0, `could not serialize` 0, `too many clients` 0, `"Error no controlado"` 0 y `"code":"P2028"` 0. Ningún motivo para detenerse. El control positivo y el cotejo con los permitidos son de la corrida completa del manager.

### Lint
- `npx prettier --check` sobre los tres archivos (en su paquete): "All matched files use Prettier code style!". No hizo falta escribir nada.
- `cd backend; npm run lint` → salida 0; última línea: `tsc -p tsconfig.json --noEmit && tsc -p tsconfig.test.json` (sin errores).
- `cd frontend; npm run lint` → salida 0; última línea: `tsc -b` (sin errores).

### V-01 final
- `sha256sum -c ".../v01-foro01a-base.txt"` → 288 `OK` y 3 `FAILED`: exactamente `backend/test/lecturas-fx-r1.ataque.test.ts`, `backend/test/sesiones-y-cadena.ataque.test.ts` y `frontend/src/lib/errores-ch3-r2.ataque.test.ts`. El árbol sigue con las mismas 291 rutas.
- `git diff --stat fd4a7ad -- backend frontend shared`: solo esos tres archivos (43 inserciones, 2 eliminaciones: los dos títulos).
- Lista nueva: `foro01-arranque/v01-foro01a-r0.txt` del scratchpad, 291 líneas en el formato de la base, SHA-256 `ba15a1739252d6245223cab95639ec8e9e999bfae5d3ce75d7c65442e56d0e8a`. Hashes nuevos: `lecturas-fx-r1` `e212c1b0…`, `sesiones-y-cadena` `5d3e50ee…`, `errores-ch3-r2` `fd52583f…`.

### Paradas y discrepancias
Ninguna. Toda línea que cita §E7.5.1 coincidió con el archivo. No toqué código de producción, pruebas normales ni otras `*.ataque`; no usé `git checkout`, `restore` ni `stash`.

## Ronda 1 — FORO-01a (2026-11-14)


Veredicto: **RESISTE.** Ningún hallazgo: 0 críticos, 0 altos, 0 medios, 0 bajos. 28 casos de ataque nuevos en 6 archivos, todos verdes contra el código de hoy, y 8 mutaciones reales de guardas de "Se toca", que tumban mis casos y se restauraron byte a byte.

### Arranque
- `docker info`: responde (Docker Desktop, servidor 28.5.1). Equipo con corriente (sin cambio desde la ronda 0); red de confianza por declaración del humano, solo hoy. No toqué Docker ni el firewall.
- V-01 contra `foro01-arranque/v01-foro01a-r0.txt`: `sha256sum -c` → 291 `OK`, 0 fallas.
- Migraciones: `20261114223913_foro_01_tipo_foro/migration.sql` `8ec418c5…` y `20261114224719_foro_01_participaciones/migration.sql` `478c2e22…`: coinciden con lo confirmado por el humano.
- Leí `resumen-programador.md` (335 líneas), las dos últimas secciones de `revision.md`, de `plan.md` "Puntos de ataque", §D-2, §D-3, §D-4, "Acceso a datos" y "Autorización", y el código nuevo (`shared/src/foros.ts`, `core/foros/participacion.ts`, `core/actividades.ts`, `adapters/db/{foros,actividades}.ts`, `handlers/foros.ts` y el diff de `tareas.ts`, `entregas.ts`, `publicaciones.ts` y `calificar.ts`).

### Hallazgos
Ninguno. Ninguna de mis pruebas queda roja contra el código de hoy, y ninguna corrida tuvo un `500` en un flujo normal.

### Atacado sin hallazgos (por punto de ataque, con el caso que lo prueba)
Todo en `backend/test/`, archivos nuevos `foros-01a-r1-*.ataque.test.ts`.
1. **Clase archivada sin escribir nada.** `foros-01a-r1-archivada` › ATQ-FORO-01. El foro, la principal, la réplica y la calificación con devolución nacen por la API (con recordatorio y `trabajo_id`), y la clase se archiva por `POST /admin/clases/:id/archivar`. Las 6 escrituras, con cada rol que las admite (10 peticiones, con datos que en una clase abierta sí cambiarían algo), responden `409 CLASE_ARCHIVADA`. Una foto de la clase queda idéntica antes y después de las escrituras y de las 10 lecturas: publicaciones (título, texto, tema, `version`, `actualizado_en`), tareas (fecha, puntos, tardías, `trabajo_id`, `version`), entregas (estado, fecha, retraso, calificación, `version`), participaciones, devoluciones y los trabajos de pg-boss de la clase con su estado. El maestro y el admin leen con `200`.
2. **Carreras.** `foros-01a-r1-carreras`:
   - ATQ-FORO-20: la frontera del milisegundo, con los adaptadores y una hora fija, sin tardías. Con la hora = fecha límite, la principal es a tiempo y calificar a quien no participó da `ENTREGA_NO_CALIFICABLE`. Un milisegundo después, `FORO_CERRADO` sin fila perezosa, y la calificación entra sin fecha de entrega. Después, publicar con la hora anterior da `PARTICIPACION_CALIFICADA`.
   - ATQ-FORO-21: retención deliberada de la fila de la entrega (`FOR UPDATE`; la principal se da por formada solo cuando `formadasDetrasDe` la ve esperando esa fila; la retenedora lleva `timeout` de 30 s). Si la rival califica sin participar, la principal formada responde `409 PARTICIPACION_CALIFICADA`. Si la rival publica otra principal, `409 PARTICIPACION_YA_PUBLICADA`. Nunca hay segunda principal ni `500`.
   - ATQ-FORO-22: 4 vueltas de 4 principales de alumnos distintos contra el borrado confirmado del admin. El borrado da `204`, cada principal `201` o `404 TAREA_NO_ENCONTRADA`, y no quedan filas.
   - ATQ-FORO-23: dos calificaciones simultáneas con la misma versión dan `200` y `409 ENTREGA_MODIFICADA` (con el texto del foro), con una sola subida de versión y un solo `CALIFICACION_PUBLICADA`.
   - ATQ-FORO-24: cerrar un foro vencido mientras publican tres alumnos. La edición da `200`, y cada principal es `201` con retraso o `409 FORO_CERRADO` sin fila.
3. **IDOR por ids cruzados.** `foros-01a-r1-ids-y-fugas`:
   - ATQ-FORO-10: el foro de otra clase del mismo maestro, con un alumno inscrito en las dos, bajo el `claseId` propio. Las 14 rutas con `:foroId` dan `404 TAREA_NO_ENCONTRADA` a cada rol admitido (27 peticiones), sin cambios en ninguno de los dos foros ni fila perezosa.
   - ATQ-FORO-11: en 10 y 11, una principal de otra clase, el id del propio foro y el de una réplica dan `404 PARTICIPACION_NO_ENCONTRADA`, sin escribir.
   - ATQ-FORO-12: en 13 a 16, como `:alumnoId`, un alumno de otra clase, un maestro, el admin, un alumno dado de baja, uno que salió de la clase con su principal y un id inexistente dan `404 ALUMNO_NO_ENCONTRADO`, sin entregas ni devoluciones nuevas.
   - ATQ-FORO-13: cursores cruzados (una réplica de otra principal y la propia principal en 10; una participación de otro alumno o de otro foro en 14; una devolución de otro alumno en 7 y en 15) dan `400 VALIDACION`, sin traer el texto ajeno.
   - El tipo cruzado en las rutas de tareas, entregas y calificaciones lo cubren FORO-1A45 a FORO-1A48 del programador (no lo repetí); el tipo en lo demás va en el punto 6.
4. **Fugas a profundidad.** `foros-01a-r1-ids-y-fugas` › ATQ-FORO-14, con un foro del admin, vencido y con tardías:
   - el alumno no recibe `conRetraso` de la principal ni de la réplica tardías del otro alumno (llave ausente, no `false`), y sí el de las suyas;
   - el autor admin sale como `{ id, nombre: "Administración", administracion: true }`, sin `rol`, en la lista y en el detalle;
   - la `201` de su réplica a una principal ajena solo trae `replica`, con su propio retraso;
   - el autor de cada réplica trae solo `administracion`, `id` y `nombre`;
   - el maestro ve la marca en todas;
   - las devoluciones del alumno no traen las de nadie más.

   El estado de pago, la restricción, el correo y el rol a toda profundidad en las 16 rutas los cubre FORO-1A50.
5. **Autorización completa.** `foros-01a-r1-archivada`:
   - ATQ-FORO-02: con cambio de contraseña obligatorio, un alumno inscrito y un maestro de la clase reciben `403 CAMBIO_DE_CONTRASENA_REQUERIDO` en cada ruta de su rol (21 peticiones), sin escribir;
   - ATQ-FORO-03: un alumno y un maestro dados de baja, con su JWT vigente, reciben `401 NO_AUTENTICADO` en las 16 rutas;
   - ATQ-FORO-04: el autor del foro que ya no imparte la clase recibe `403 SIN_ACCESO_A_LA_CLASE` en las 13 rutas de maestro, también en las de lectura.

   Sin sesión, rol incorrecto, clase ajena, clase inexistente, restringido y el admin en cada ruta los cubren FORO-1A49 y FORO-1B01 a FORO-1B05; los contrasté con la matriz y no encontré una celda sin caso.
6. **Tipo cruzado y la clase entera.** `foros-01a-r1-tipo-y-validacion`:
   - ATQ-FORO-30: `PUT …/publicaciones/:foroId/tema` da `404 PUBLICACION_NO_ENCONTRADA` sin cambiar el tema. `?tipo=foro` en el muro da `400`. `GET …/trabajo` (con y sin `seccion=actividades`) no lista el foro y lo rechaza como cursor (`400`). `GET …/temas` (con y sin sección) da `200`.
   - ATQ-FORO-31: una clase con foro, principal, réplicas de alumno y de maestro y una calificación con devolución se duplica sin ningún foro ni tarea. Archivada, su conteo da `actividades 1, entregas 1, calificaciones 1`, y el borrado definitivo da `204` sin participaciones ni publicación. Los usuarios siguen y el recordatorio queda `cancelled`.
7. **El recordatorio.** `foros-01a-r1-tipo-y-validacion`:
   - ATQ-FORO-32: a 24 h + 2 min se programa a la fecha − 24 h. Editar a 23 h lo cancela y deja `trabajo_id` nulo. Editar a 3 días, sin `trabajo_id`, programa uno nuevo. Cambiar solo el título no lo toca. Borrar cancela el vivo y `TAREA_CREADA`.
   - ATQ-FORO-33: `editarTarea` (con `tipo: "foro"`) con un `alReprogramar` que cancela el recordatorio y después lanza. La cancelación se revierte con la escritura: el trabajo sigue `created`, y `trabajo_id`, la versión, la fecha y el título no cambian.
   - ATQ-FORO-37: con el recordatorio ya `active`, editar la fecha da `200` y programa uno nuevo con la fecha nueva; borrar después da `204` sin trabajos vivos.
8. **Validación.** `foros-01a-r1-tipo-y-validacion`:
   - ATQ-FORO-34: la principal admite 5000 caracteres y no 5001 (`texto: No puede tener más de 5000 caracteres`), y la réplica 1000 y no 1001. Solo combinantes, solo invisibles (U+200B, U+2060, U+FEFF), `\u0000`, `\u0007`, U+202E o solo blancos dan `400 «texto: …»` en la principal y en la réplica, sin escribir ni dejar fila perezosa. El límite es de unidades de UTF-16, como el resto del proyecto (`textoLargoCon`, `.max`); es lo que pide §D-3.2.
   - ATQ-FORO-35: `limite` de 0, 101, -1, 1.5 o `abc`, y `cursor=abc`, dan `400 VALIDACION` (`limite: …` o `cursor: …`) en las 7 listas con paginación, y `limite=100` da `200`. Un id mal formado da `400` con `foroId: foroId: …`, `participacionId: participacionId: …` o `alumnoId: alumnoId: …`, también en el `PUT` de calificar; es la forma que limpia C-6.
   - ATQ-FORO-36: las llaves de más se ignoran.
     - El foro, con `tipo`, `requiereAdjuntos`, `autorId`, `trabajoId`, `version` e `id`, queda `foro`, sin adjuntos requeridos, del autor real, en versión 0 y con su propio id y `trabajo_id`.
     - La principal y la réplica, con `id`, `autorId`, `principalId`, `foroId` y `conRetraso`, quedan del autor real, en su foro y principal y sin retraso.
9. **Calificaciones por la API real.** `foros-01a-r1-calificaciones` › ATQ-FORO-40, con tres foros (vencido con tardías, vencido sin tardías y abierto) y dos alumnos. Los pasos son publicar a tiempo, publicar tarde con tardías, calificar a quien participó y calificar a quien no participó con el foro cerrado. Antes del primero y después de cada uno, y para cada alumno y foro, coinciden con lo esperado:
   - las celdas del gradebook y de la exportación;
   - `vencidasSinEntregar` y `porcentaje` (en el gradebook y en la exportación);
   - los cinco filtros de "Mis calificaciones", con la `entrega` de cada fila;
   - la `entrega` de la lista de foros;
   - "Participantes" (estado, retraso, si hay fecha, `entregadas` y `total`).

   Al final, el alumno con 40 % queda en riesgo por promedio (`alumnosEnRiesgo: 1`, modo puntos).
10. **Migraciones.** `foros-01a-r1-calificaciones`:
    - ATQ-FORO-41: con los cuatro tipos, el CHECK del título rechaza un foro y un material sin título y un anuncio con título; un foro con bloque viola `publicaciones_bloque_solo_material`; un foro y una tarea con título entran.
    - ATQ-FORO-42: borrar la fila de `tareas` del foro (no la publicación) se lleva principales y réplicas; borrar una réplica no toca su principal; la principal y la réplica del mismo alumno conviven con el índice único parcial.

    El rechazo de la segunda principal, la cascada desde la publicación y el `RESTRICT` del autor los cubren FORO-1A12 y FORO-1A13.
11. **Adjuntos del planteamiento** (fuera de la lista del manager; no tenían caso con un foro). `foros-01a-r1-adjuntos`:
    - ATQ-FORO-50: crear con un archivo subido lo confirma en el foro; el alumno lo ve sin la clave del objeto y lo descarga; el restringido (`403 ACCESO_RESTRINGIDO`) y el de otra clase (`403`) no; quitarlo en la edición lo descarta y la descarga da `404`.
    - ATQ-FORO-51: no se adjunta un archivo de otra clase, uno de otra persona ni uno ya publicado en un material: `400` al crear y al editar, sin foro nuevo, sin cambiar el título y sin mover el archivo.
    - ATQ-FORO-52: borrar el foro descarta su adjunto y la descarga da `404`.

### Observaciones (no son hallazgos)
- **O-r1-1. El cursor de "Participantes" (ruta 12) acepta el id de cualquier usuario como posición.** Con `?cursor=<un alumno de otra clase>` responde `200` con la página que sigue a su nombre, sin `400`. El mecanismo es `condicionesDePaginaDeAlumnos` (`adapters/db/inscripciones.ts:87-105`), que solo exige que el usuario exista: es el roster de hoy, que también usan las entregas de una tarea y el gradebook. Es la decisión de "cursor con posición" de ADMIN-01 (Enmienda 5, M-08, R-19 aceptado; "el roster y el gradebook existentes, riesgo con destino"). No filtra datos: solo devuelve alumnos inscritos de la propia clase. Saqué ese caso de ATQ-FORO-13, porque no es de 01a y su archivo está en "No se toca".
- **O-r1-2. La principal que llega en el milisegundo exacto, formada detrás de una calificación de un milisegundo después, pierde.** Con la hora de la petición = fecha límite (a tiempo) y la calificación de "no participó" un milisegundo después, ya cerrado, la principal recibe `409 PARTICIPACION_CALIFICADA` (ATQ-FORO-20, al final, y ATQ-FORO-21). Es coherente con §D-4 y con la tarea: la hora se toma al recibir la petición, y la fila de la entrega pone las dos en serie. Lo anoto por si el humano quiere otra regla para el foro; no lo pide ningún RF.
- **O-r1-3.** Mover un foro de tema por la ruta del muro responde `404` en 01a (§E8.1, declarado), y borrar el tema deja el foro "Sin tema" sin contarlo antes (`temas.ts`, `TIPOS_CON_TEMA` sin `foro`, FK `SET NULL`). Los dos están declarados para 01b.
- La observación de `borrarComentario` y `borrarMiComentario` es la aceptada (va a `ESTADO.md`); no la ataqué.

### Mis mutaciones
Archivos de "Se toca" de 01a, sin preguntar, con este procedimiento:
- copia previa en el scratchpad (`tester-r1/respaldo-MTn`);
- un solo cambio en un ancla que aparece exactamente una vez (`tester-r1/mutar.cjs` aborta si no);
- la corrida de mi archivo;
- la restauración desde la copia y la comparación byte a byte (`Buffer.compare`: "cmp igual: true" en las 8);
- el SHA-256 de cada archivo mutado, igual al de antes (`sha256sum -c`: `foros.ts`, `actividades.ts`, `handlers/foros.ts` y `calificar.ts` en OK);
- `git diff --stat -- src` igual antes y después (`8 files changed, 218 insertions(+), 85 deletions(-)`; los archivos nuevos no salen en él, por eso el SHA).

No muté nada de "No se toca" ni de lo que nunca se muta.

| Mutación | Archivo · ancla | Corrida | Cae |
|---|---|---|---|
| MT1 | `adapters/db/foros.ts` · `const donde = { foroId, principalId: participacionId }` → `{ foroId }` | `Tests  2 failed \| 3 passed (5)` | ATQ-FORO-13 y ATQ-FORO-14 |
| MT2 | ídem · `const donde = { foroId, autorId: alumnoId }` → `{ foroId }` | `Tests  1 failed \| 4 passed (5)` | ATQ-FORO-13 |
| MT3 | ídem · `estado: fila.estado,` (en `publicarParticipacion`) → `"asignado"` | `Tests  2 failed \| 3 passed (5)` | ATQ-FORO-20 y ATQ-FORO-21 |
| MT4 | ídem · quitar `await exigirPrincipal(…)` de `publicarReplica` | `Tests  1 failed \| 4 passed (5)` | ATQ-FORO-11 |
| MT5 | `adapters/db/actividades.ts` · `where: { id, claseId, tipo }` → `{ id, tipo }` | `Tests  1 failed \| 4 passed (5)` | ATQ-FORO-10 |
| MT6 | `adapters/db/foros.ts` · `esPropia: fila.autor.id === actorId` → `true` | `Tests  1 failed \| 4 passed (5)` | ATQ-FORO-14 |
| MT7 | `handlers/foros.ts` · la ruta 4 (`app.put` de `…/foros/:foroId`) con `enClaseArchivada: "lectura"` | `Tests  1 failed \| 3 passed (4)` | ATQ-FORO-01 |
| MT8 | `core/calificaciones/calificar.ts` · la rama `foro` de `exigirEntregaCalificable` sin `throw` | `Tests  1 failed \| 4 passed (5)` | ATQ-FORO-20 |

Redundancias declaradas:
- **MT3.** Para la segunda mitad de ATQ-FORO-21 (`YA_PUBLICADA`), con `fechaEntrega` relevada en lugar del estado, el índice único parcial también da `409` por `traducirErrorPrisma`. Por eso elegí la mutación del estado, que la primera mitad (`CALIFICADA`) sí vigila.
- **ATQ-FORO-33.** No tiene mutación de un ancla: lo que vigila es la transacción de `enTransaccion` entera.
- **ATQ-FORO-10.** En las escrituras, el `clase_id` de `bloquearTareaParaEntregar` (`entregas.ts`) y el de `esActividadDeTipo` se cubren el uno al otro. MT5 cae por la ruta 8, que solo tiene el segundo.

### Archivos nuevos (6; 28 casos)
`npx vitest list test/foros-01a-r1` (desde `backend/`), contado con `grep -a ' > ' | grep -ac 'ATQ-FORO-'` → **28**:
- `backend/test/foros-01a-r1-archivada.ataque.test.ts`: 4 (ATQ-FORO-01 a 04);
- `backend/test/foros-01a-r1-ids-y-fugas.ataque.test.ts`: 5 (ATQ-FORO-10 a 14);
- `backend/test/foros-01a-r1-carreras.ataque.test.ts`: 5 (ATQ-FORO-20 a 24);
- `backend/test/foros-01a-r1-tipo-y-validacion.ataque.test.ts`: 8 (ATQ-FORO-30 a 37);
- `backend/test/foros-01a-r1-calificaciones.ataque.test.ts`: 3 (ATQ-FORO-40 a 42);
- `backend/test/foros-01a-r1-adjuntos.ataque.test.ts`: 3 (ATQ-FORO-50 a 52).

Sin ayudas nuevas compartidas: cada archivo trae las suyas. Usé `ayudas-foros.ts` y las demás ayudas solo como import, sin cambiarlas. Ningún `LOCK TABLE`; la única retención (ATQ-FORO-21) es de una fila, con `timeout: 30_000` y `maxWait: 5_000`. Toda prueba tiene aserciones, y las precondiciones que faltan lanzan con su mensaje. Ninguna compara con la hora real fuera de márgenes de horas: las fronteras de ATQ-FORO-20 van con una hora fija pasada a los adaptadores, y las de 24 h, con márgenes de minutos.

### Comandos (desde `backend/`, uno a la vez)
- Cada archivo, en su ronda: `npx vitest run test/foros-01a-r1-archivada.ataque.test.ts` → `Tests  4 passed (4)`; `…-ids-y-fugas…` → `Tests  5 passed (5)`; `…-carreras…` → `Tests  5 passed (5)`; `…-tipo-y-validacion…` → `Tests  7 passed (7)` (y ATQ-FORO-37 sola, con `-t`, `1 passed | 7 skipped`); `…-calificaciones…` → `Tests  3 passed (3)`; `…-adjuntos…` → `Tests  3 passed (3)`.
- `npm run lint` → salida 0; última línea `tsc -p tsconfig.json --noEmit && tsc -p tsconfig.test.json` (sin errores).
- La suite de los módulos, con los 35 filtros de la §8 del resumen (mis archivos entran por `test/foros`): `npx vitest run test/foros test/migracion-foro-01 … test/middleware-orden` → `Test Files  156 passed (156)` · `Tests  1685 passed (1685)` (`Duration  184.07s`). 1685 = 1654 de la verificación del manager + 3 de M-09 + mis 28.
- PA-07, en la salida completa de esa corrida: `40P01` 0, `deadlock detected` 0, `could not serialize` 0, `too many clients` 0, `"Error no controlado"` 0, `"code":"P2028"` 0. También en 0 en la corrida suelta de `foros-01a-r1-carreras`. El control positivo y el cotejo con los permitidos son de la corrida completa del manager.
- `git diff --stat -- backend/src shared/src frontend/src` sigue en `11 files changed, 270 insertions(+), 86 deletions(-)`, igual que en la verificación de M-09. Las dos migraciones conservan `8ec418c5…` y `478c2e22…`.

### V-01
- `sha256sum -c foro01-arranque/v01-foro01a-r0.txt` → 291 `OK`: ninguna `*.ataque` anterior cambió.
- `foro01-arranque/v01-foro01a-r1.txt` (scratchpad): las 291 líneas de la ronda 0 sin cambio, más mis 6 archivos = **297** líneas (el árbol tiene 297 `*.ataque`). SHA-256 `bdfaa952c6482624d418b6f12fc22dc61194fae513646e51f60b0bbd2a65ca32`.

### No atacado y por qué
- **La suite completa del backend y PA-07 con su control positivo:** las corre el manager al cerrar (`AGENTS.md`, "Suites por ronda").
- **El frontend:** 01a no toca su producción; no corrí su suite. Mis archivos son solo del backend.
- **El comentario del muro sembrado en un foro** (`borrarComentario`): aceptado, va a `ESTADO.md`.
- **R-02** (volver a un backend anterior) y **DH-02** (la regla tardía por omisión, incluido que con tardías nunca se califica a quien no participó): aceptados.
- **El borrado de participaciones del admin (ruta 17), `conForos`, `conTipo`, los foros en "Actividades" y los conteos de temas con foros:** son de 01b.
- **La baja y la reactivación de una cuenta con participaciones** (DH-18): es FORO-1B10, de 01b. En 01a solo ataqué el `401` de la cuenta dada de baja (ATQ-FORO-03) y el `404` de un alumno dado de baja como `:alumnoId` (ATQ-FORO-12).
- **El navegador:** 01a no tiene interfaz.

## Ronda 0 — FORO-01b (2026-11-16)


Veredicto de la ronda 0: **aplicada, sin PARADA.** C-1 bis, C-3 y C-7 aplicados con el texto de §E7.5.2. La búsqueda propia no encontró ninguna prueba normal ni `*.ataque` de otro encargo sin inventariar. En **mis propias pruebas de la ronda 1 de 01a** aparecieron dos cosas que 01b cambia: una segura (C-T1, ATQ-FORO-30) y una posible (C-T2, ATQ-FORO-10). Como son `*.ataque` de este encargo y mías, las apliqué como C-n del tester y las declaro aquí. Por eso, contra la base, difieren **cinco** archivos y no tres.

### Arranque
- `docker info`: responde (servidor 28.5.1). Equipo con corriente (`BatteryStatus` 2, 100 %). Red de la casa del humano, con la regla del firewall (su declaración de hoy). No toqué Docker ni el firewall.
- `git log`: `451aa35` (01a) sobre `d8e8fd3`. Árbol limpio en los paquetes; plan `e899f7b5…`.
- V-01 de arranque: `sha256sum -c foro01-arranque/v01-foro01a-r1.txt` (lista con SHA-256 `bdfaa952…`) → 297 `OK`, 0 fallas. El árbol tiene las mismas 297 `*.ataque`.

### Comprobación de arranque (§E7.5.0; "Grep de la lista" de §E7.5.2), sobre `451aa35`
- `grep -rn "traducirErrorPrisma(" backend/src` (sin `errores.ts`) → **9** llamadas. Son las siete de §E7.2 (`clases.ts:124`, `inscripciones.ts:241`, `maestros-de-clase.ts:128`, `usuarios.ts:74,176,250` y `gestion-de-usuarios.ts:253`) más las dos de 01a en `adapters/db/foros.ts:487` y `:546`. La de `:546` (`publicarReplica`) es la que 01b cambia. **Ninguna pasa `alFaltarReferencia`.** Que sean nueve y no siete se explica por 01a; el plan las cuenta desde `fd4a7ad`.
- `grep -rln "puedeBorrar(" --include=*.test.ts` → `core/autoria.test.ts` y `core/recursos.test.ts`, ninguna con datos de un foro (`grep foro` en las dos: nada).
- `grep -rln "columnaParaResponder\|columnaDelGradebookSchema\|tareaDeMisCalificacionesSchema" backend/test` → solo `calificaciones-lecturas-estatico.test.ts` (CAL-1B08, vigilada).
- `grep -rn "trabajoQuerySchema\|temasQuerySchema"` en las pruebas del backend y el frontend → `backend/test/esquemas-tareas.test.ts:17,432-457` y `frontend/src/lib/errores-de-api.test.ts:24,464-465`, vigiladas (`data.tema` y `limite` en la salida).
- `grep -rln "seccion=actividades" backend/test` → `recursos-clases03a-r1.ataque` (CL3a-r1-17), `recursos-clases03a-r2.ataque` (CL3a-r2-07), `recursos-filtros.integracion` (CL3-A07) y mi `foros-01a-r1-tipo-y-validacion.ataque`. Ninguna pide `conForos`, y ninguna de las tres primeras siembra un foro: sin `conForos`, la respuesta no cambia.

**Búsqueda propia** (backend, frontend y `shared/`; sin `.env`):
- **Rutas bajo `/api`:** los 7 archivos con `printRoutes` o `rutasDeLaApp(` son los de 01a.
  - `sesiones-y-cadena` es C-1 bis y `clases-archivadas-matriz` está en la lista cerrada.
  - `movimientos-inscripcion:252` cuenta solo `movimiento` en el árbol, y la ruta 17 no lo nombra.
  - `gestion-clases-autorizacion` (PR-2A24) y `recursos-autorizacion` (CL3-A18) buscan rutas por nombre.
  - ADM-T1A09 (`clases-archivadas-r1:631-686`) acepta, para la ruta 17: `403 ROL_NO_PERMITIDO` del maestro ajeno, `ACCESO_RESTRINGIDO` del restringido y `CAMBIO_DE_CONTRASENA_REQUERIDO` del pendiente. Las tres son vigiladas.
- **Borrados (`delete`/`deleteMany`):** la única enumeración es O-4 de `lecturas-fx-r2` (C-3). Los demás `DELETE FROM` de las pruebas son datos sembrados.
- **El `tipo` en "Actividades", el gradebook, "Mis calificaciones" y la exportación:**
  - sin `conForos` ni `conTipo` la respuesta no cambia;
  - ninguna prueba enumera las opciones de `elementoDeTrabajoSchema.tipo`;
  - las pruebas del frontend que arman elementos de "Trabajo" (`trabajo-01e-r1/r2`, `ver-mas-01e-r3`, `descarga-ch3-r2`) usan `tarea` y `material`, que siguen valiendo;
  - el frontend de producción no tiene un `switch`, un `Record` ni un `satisfies never` sobre ese `tipo` (los dos `satisfies never` son del estado de pago y de la entrega).
- **Llaves de los `strictObject`:** las pruebas que leen `shared/src/calificaciones.ts` o `tareas.ts` son vigiladas: CAL-1B08, CAL-1A18, CAL-T-68 y CAL-T-69 (`calificaciones-estatico-01b-r1`), CAL2-A08 y la de `temas-01a-r3`. CAL2-A09 (`esquemas-exportacion:88`) mira la exportación, que no cambia. Las que comparan `Object.keys(…Schema.shape)` (`entregas.integracion:1154`, `esquemas-tareas:416-421`, `tareas-version:537`) son de esquemas que 01b no toca.
- **`conForos` y `conTipo`:** ninguna prueba los nombra hoy, salvo un `conTipo` local de `foros.integracion.test.ts:492` (una variable).
- **Los textos del `409` de categorías:** son los vigilados de §E7.5.2. Borrar un tema no tiene `409` (`SET NULL`).
- **Los README:** ninguna prueba los lee (las coincidencias de `README` son comentarios del código de producción).
- **Mover de tema:** `tareas-01a-r1.ataque:737-746` lee el cuerpo de `moverATema` y pide `tx.tarea.updateMany` antes de `bloquearTemaParaUsar` y de `tx.publicacion.updateMany`, sin ciclos ni SQL crudo. 01b cambia la condición de esa rama (que sume `foro`), no el orden. Es una regla para el programador, no una enumeración: no es PARADA y la dejo como **vigilada nueva**.
- **Lo mismo con `temas-01a-r3.ataque:440-485`.** Lista por ruta los archivos de `core/tareas/`, `handlers/tareas/`, `adapters/db/{temas,categorias,referencias,bloqueo-clase}.ts`, y les prohíbe `console.`, `estadoPago`, `.rol`, `relacion ===` y `=== "admin|maestro|estudiante"` fuera de `core/`. 01b toca `temas.ts` y `categorias.ts`, que ya están en la lista, sin agregar archivos a esas carpetas. Es **vigilada nueva**: §E8.5 solo nombraba `:426-428`.

**Mis pruebas de la ronda 1 de 01a**, revisadas una por una:
- **C-T1: `foros-01a-r1-tipo-y-validacion.ataque`, ATQ-FORO-30. 01b lo cambia con seguridad.** El caso afirmaba que mover un foro con `PUT …/publicaciones/:foroId/tema` responde `404 PUBLICACION_NO_ENCONTRADA` sin cambiar su tema. Era la conducta declarada para 01a en §E8.1 ("Mover un foro responde `404`… El total de temas no cuenta foros hasta 01b"). §D-3.3 manda que en 01b `TIPOS_CON_TEMA` sume `"foro"` y que la rama de `moverATema` que sube `tareas.version` aplique al foro, así que caería en cuanto el programador lo implemente. Lo reescribí con la conducta de 01b; el detalle va abajo.
- **C-T2: `foros-01a-r1-ids-y-fugas.ataque`, ATQ-FORO-10. 01b puede cambiarlo.** El caso filtra `rutasDelForo(…)` con `numero >= 3` y exige 14 rutas. La lista cerrada 3 de §E7.5.2 dice que FORO-1A49 "suma la ruta 17". Si el programador la agrega a `rutasDelForo` (de `ayudas-foros.ts`) en lugar de una exportación nueva, el caso pasaría a 15 y caería. §E7.5.0 dice que una ayuda existente solo gana exportaciones, pero el riesgo es barato de cerrar. Acoté el filtro a `numero >= 3 && numero <= 16`, con su comentario, y lo que protege no cambia.
- El resto no cambia con 01b:
  - **ATQ-FORO-14** solo mira `autor`, `conRetraso` y `propia`, nunca todas las llaves de una participación. Por eso `puedeBorrar` no lo toca, y el `parse` usa el esquema de `shared`, que lo tendrá.
  - **ATQ-FORO-12** recorre las rutas `>= 13` con su tabla `ROLES`, que no tiene la 17: si la ruta 17 aparece en la ayuda, se salta sin peticiones.
  - **ATQ-FORO-01 a 04** filtran por sus tablas `ROLES`, `ESCRITURAS` y `LECTURAS`. La ATQ-FORO-03 manda la 17 sin token, y da 401 de todas formas.
  - **ATQ-FORO-40** compara solo `entrega` en "Mis calificaciones" y las celdas del gradebook, que no ganan `tipo` sin `conTipo`.
  - **ATQ-FORO-31** (el conteo y el borrado de la clase) no depende de nada que 01b cambie. FORO-1B08 y FORO-1B09 lo amplían.

### Respaldo
`foro01-arranque/r0-01b-respaldo/` (scratchpad), antes de tocar nada. Los cinco archivos coinciden con `v01-foro01a-r1.txt`: `sesiones-y-cadena` `5d3e50ee…`, `lecturas-fx-r2` `b008263d…`, `errores-ch3-r2` `fd52583f…`, `foros-01a-r1-tipo-y-validacion` `71fb0895…` y `foros-01a-r1-ids-y-fugas` `d7008214…`.

### C-1 bis — `backend/test/sesiones-y-cadena.ataque.test.ts` (aplicado)
- Las líneas de §E7.5.2 se ubicaron por su contenido, porque las de C-1 de 01a las movieron: el comentario de FORO-01a termina en `:591`, el título está en `:592` y `"DELETE /api/clases/:claseId/foros/:foroId"` en `:624`. El texto coincide con lo que el plan cita.
- Cambios: el comentario de C-1 bis, en 3 líneas con el mismo texto, va antes del título; el título dice "…, ADMIN-01e, FORO-01a y FORO-01b: ninguna crea admins…"; y la entrada `"DELETE /api/clases/:claseId/foros/:foroId/participaciones/:participacionId"` va justo después de `"DELETE /api/clases/:claseId/foros/:foroId"`, que es su lugar en `sort()`.
- Qué afirma ahora: bajo `/api` existen las rutas de hoy más la ruta 17, y nada más.
- `npx vitest run test/sesiones-y-cadena.ataque.test.ts`:
  - antes → `Tests  35 passed (35)`;
  - después → `Tests  1 failed | 34 passed (35)`. **Rojo esperado:** `expected [ …(164) ] to deeply equal [ …(165) ]`, y la única diferencia es `- "DELETE /api/clases/:claseId/foros/:foroId/participaciones/:participacionId"`. La ruta aún no existe. Los otros 34 casos, verdes.

### C-3 — `backend/test/lecturas-fx-r2.ataque.test.ts` (aplicado)
- Las líneas citadas (`:957-1001`) coinciden: el comentario de ADMIN-01b, C-4 en `:967-971`, el título en `:972` y la lista en `:984-999`, con `"movimientoInscripcion"` en `:995` y `"publicacion"` en `:996`.
- Cambios: el comentario de C-3 (4 líneas, mismo texto) va después del de ADMIN-01b y antes del `it`; el título dice "…, puntajes de rúbrica, dudas y participaciones de foro; …"; y `"participacionForo"` queda entre `"movimientoInscripcion"` y `"publicacion"`, en el orden de `sort()`.
- `npx vitest run test/lecturas-fx-r2.ataque.test.ts`:
  - antes → `Tests  19 passed (19)`;
  - después → `Tests  1 failed | 18 passed (19)`. **Rojo esperado:** `expected [ 'categoria', 'clase', …(9) ] to deeply equal [ …(10) ]`, con la única diferencia `- "participacionForo"`. El `deleteMany` todavía no existe. Los otros 18, verdes.

### C-7 — `frontend/src/lib/errores-ch3-r2.ataque.test.ts` (aplicado)
- Después de las entradas de C-6 (`"foroId"` y `"participacionId"`, en `:256-257`) van el comentario de C-7 (2 líneas, mismo texto), `"conForos"` y `"conTipo"`.
- Comprobación de legibilidad, con las dos expresiones de `quitarRutaDelMensaje` leídas de `lib/errores-de-api.ts`: `"conForos: conForos: no es válido"` da `"no es válido"`, igual que `"conTipo: conTipo: no es válido"`, y con un solo prefijo, lo mismo.
- `npx vitest run src/lib/errores-ch3-r2.ataque.test.ts`, antes y después → `Tests  85 passed (85)`. **Verde, como C-6:** `INVENTARIO` es una lista de permitidos y hoy ningún mensaje de `shared/src` lleva esos prefijos.

### C-T1 — `backend/test/foros-01a-r1-tipo-y-validacion.ataque.test.ts`, ATQ-FORO-30 (del tester, aplicado)
- **Antes** (ronda 1 de 01a), el caso afirmaba:
  - mover el foro con `PUT …/publicaciones/:foroId/tema` responde `404 PUBLICACION_NO_ENCONTRADA` sin cambiar su tema;
  - `?tipo=foro` en el muro es `400`;
  - "Trabajo" (con y sin `seccion=actividades`) no lista el foro ni lo acepta como cursor;
  - `GET …/temas` responde `200`.
- **Ahora**, con un comentario `FORO-01b ronda 0 (C-T1 del tester…)` que cita §E7.5.2, §D-3.3 y E1-9, el caso pide lo de 01b:
  - `GET …/temas` sin sección cuenta el foro en su tema (`elementos: 1`), y con `?seccion=actividades` no (`elementos: 0`);
  - el muro y "Trabajo" sin `conForos` siguen como antes, ahora comprobados antes de mover;
  - mover el foro con `{ temaId: null }` responde `200` con `{ publicacionId, temaId: null }`, deja la publicación sin tema y sube `tareas.version` de 0 a 1;
  - después, `sinTema` cuenta el foro sin sección (1) y no con `?seccion=actividades` (0).
- Otros cambios en el archivo: el import de `listaTemasRespuestaSchema` y el formato de Prettier.
- `npx vitest run test/foros-01a-r1-tipo-y-validacion.ataque.test.ts`:
  - antes → `Tests  8 passed (8)`;
  - después → `Tests  1 failed | 7 passed (8)`. **Rojo esperado:** el primer `expect` del caso ve `elementos: 0` donde pide `1`, porque `TIPOS_CON_TEMA` aún no tiene `foro`. Mover también responde `404` hoy (lo fijaba la ronda 1). Los otros 7 casos, verdes.
- **Lo decide el arquitecto si no está de acuerdo.** Todo sale del texto de §D-3.3 y E1-9: el total sin sección cuenta los foros, `"actividades"` sigue siendo `{ tipo: "tarea" }`, y `moverATema` sube la versión del foro. El código de respuesta (`200`) y el cuerpo son los de mover una tarea hoy.

### C-T2 — `backend/test/foros-01a-r1-ids-y-fugas.ataque.test.ts`, ATQ-FORO-10 (del tester, aplicado)
- `.filter(({ numero }) => numero >= 3)` pasa a `.filter(({ numero }) => numero >= 3 && numero <= 16)`, con el comentario `FORO-01b ronda 0 (C-T2 del tester, §E7.5.2, lista cerrada 3): …`. Lo que protege no cambia: las 14 rutas de 01a con `:foroId`, para cada rol, con el foro de otra clase.
- Antes y después → `Tests  5 passed (5)`. Verde hoy, y sigue verde si la ruta 17 entra en `rutasDelForo`.

### PA-07 (las corridas sueltas de los cuatro archivos del backend, antes y después)
En las ocho salidas: `40P01` 0, `deadlock detected` 0, `could not serialize` 0, `too many clients` 0, `"Error no controlado"` 0 y `"code":"P2028"` 0.

### Lint
- `npx prettier --write`, acotado a los cinco archivos de su paquete: solo reformateó `foros-01a-r1-tipo-y-validacion`; los otros cuatro, "unchanged".
- `cd backend; npm run lint` → salida 0; última línea `tsc -p tsconfig.json --noEmit && tsc -p tsconfig.test.json`.
- `cd frontend; npm run lint` → salida 0; última línea `tsc -b`.

### V-01 final
- `sha256sum -c foro01-arranque/v01-foro01a-r1.txt` → 292 `OK` y 5 `FAILED`. Los cinco son los tres C-n del plan (`sesiones-y-cadena`, `lecturas-fx-r2` y `errores-ch3-r2`) y mis C-T1 y C-T2 (`foros-01a-r1-tipo-y-validacion` y `foros-01a-r1-ids-y-fugas`).
- `git diff --stat 451aa35 -- backend frontend shared` → esos mismos 5 archivos, sin producción (65 inserciones y 28 eliminaciones).
- `foro01-arranque/v01-foro01b-r0.txt` (scratchpad): 297 líneas, en el orden y el formato de la de 01a, SHA-256 `ac9a34db172e7db3e4a1193c38b713d6844c9476a37248f8577b82cc890ebb18`.

### Paradas y discrepancias
- Ninguna PARADA.
- **Discrepancias con el plan:**
  - las líneas de C-1 bis se movieron por C-1 de 01a, y su contenido coincide;
  - el grep de `traducirErrorPrisma(` da 9 llamadas y no 7, por las dos de `foros.ts` de 01a.
- **Diferencia con el encargo:** difieren cinco archivos y no tres, por C-T1 y C-T2, que son míos y quedan declarados arriba.
- **Vigiladas nuevas** que sumo para el programador: `tareas-01a-r1.ataque:737-746` (el orden de `moverATema`) y `temas-01a-r3.ataque:440-485` (sin `.rol` ni comparaciones de rol en `temas.ts` y `categorias.ts`).

## Ronda 1 — FORO-01b (2026-11-16)


Veredicto: **RESISTE.** Ningún hallazgo: 0 críticos, 0 altos, 0 medios y 0 bajos. Escribí 18 casos de ataque nuevos en 3 archivos, todos verdes contra el código de hoy. Hice 5 mutaciones reales en archivos de "Se toca" de 01b, en 6 corridas; cada una tumba al menos un caso mío (MB4, después de reforzar ATQ-FORO-84) y se restauró byte a byte. Las 6 pruebas de mi ronda 1 de 01a siguen verdes.

### Arranque
- `docker info`: responde (servidor 28.5.1). Equipo con corriente; red de la casa del humano. No toqué Docker ni el firewall.
- V-01 contra `foro01-arranque/v01-foro01b-r0.txt`: `sha256sum -c` → 297 `OK`. `git status --short -- backend/prisma` está vacío, sin migraciones.
- Leí completos el resumen de 01b (`resumen-programador.md:356-556`, con sus 7 desviaciones, 15 mutaciones y las redundancias N1 y N3) y la verificación del manager (`revision.md:1127-1263`, puntos de ataque). También leí el diff de `shared/src` (`foros.ts`, `tareas.ts`, `recursos.ts`, `calificaciones.ts`), de `core/autoria.ts` y `core/foros/participacion.ts`, de `adapters/db/{foros,tareas,temas,categorias,calificaciones,errores}.ts` y de `handlers/{foros,calificaciones}.ts`.

### Hallazgos
Ninguno.

### Atacado sin hallazgos (por punto, con el caso que lo prueba)
Todo en `backend/test/`, archivos nuevos `foros-01b-r1-*.ataque.test.ts`.
1. **Concurrencia de la ruta 17.** `foros-01b-r1-borrado-carreras`:
   - ATQ-FORO-60: se retiene la fila del foro `FOR UPDATE`, como `borrarTarea`. El borrado de una principal queda formado detrás (`formadasDetrasDe`; retenedora con `timeout: 30_000`) y responde `404 TAREA_NO_ENCONTRADA` «Ese foro ya no existe.» cuando confirma el borrado del foro, sin dejar filas.
   - ATQ-FORO-61: 5 vueltas, cada una con el borrado de una principal (con réplicas) a la vez que el borrado confirmado del foro. Los dos responden 204 o 404, nunca 500, `P2002` ni `P2003`, y no queda ninguna fila del foro. Los dos órdenes salen en la práctica.
   - ATQ-FORO-62: 5 vueltas de borrar la principal a la vez que su autor vuelve a publicar. Nunca hay dos principales, y la entrega queda `entregado` (versión 3) si y solo si hay principal nueva; si no, queda `asignado` (versión 2).
   - ATQ-FORO-63: 5 vueltas de dos réplicas en vuelo, del otro alumno y del maestro, contra el borrado de su principal. Cada réplica responde 201 o `404 PARTICIPACION_NO_ENCONTRADA`, nunca 500 ni `P2003`, y no queda ninguna réplica huérfana.
   - ATQ-FORO-64: tres borrados a la vez de la misma principal y tres de la misma réplica, sin retención. Cada grupo da un 204 y dos 404, y la versión sube una sola vez.
   - ATQ-FORO-65: borrar a la vez que se archiva la clase. El archivado responde 200, el borrado 204 o `409 CLASE_ARCHIVADA` (la carrera aceptada de ADM-T1A04), y la entrega queda coherente con lo que confirmó.
2. **`puedeBorrar` y las llaves.** `foros-01b-r1-estados` › ATQ-FORO-71, con los dos alumnos deudores:
   - en las listas 8 y 10, `puedeBorrar` vale `true` solo para el admin, también en una archivada, y `false` para el maestro y los alumnos;
   - la 201 de una réplica del alumno y del maestro trae solo `replica`, con `puedeBorrar: false` y sus llaves exactas;
   - las llaves exactas de cada fila tienen `conRetraso` solo si quien pide es maestro o admin, o si la fila es propia;
   - el autor solo trae `administracion`, `id` y `nombre`, y no aparece ninguna de las `CLAVES_QUE_NUNCA_SALEN`.
3. **El borrado, estado por estado, con las vistas.** `foros-01b-r1-estados` › ATQ-FORO-70. Hay tres foros (abierto, vencido con tardías y cerrado sin tardías) y dos alumnos, y la prueba sigue 9 pasos:
   - publicar a tiempo, tarde, y en el cerrado (sembrado);
   - calificar a Y;
   - borrar la principal de X en los tres foros;
   - borrar la principal calificada de Y, que conserva su calificación;
   - X vuelve a publicar a tiempo y tarde, y en el cerrado recibe `409 FORO_CERRADO`;
   - el maestro califica a X sin participar en el cerrado (versión 2);
   - Y no vuelve a publicar (`409 PARTICIPACION_YA_PUBLICADA`) y sí replica.

   Antes del primer paso y después de cada uno coinciden con lo esperado:
   - las celdas del gradebook y de la exportación;
   - `vencidasSinEntregar` y `porcentaje`;
   - los cinco filtros de "Mis calificaciones", con su `entrega`;
   - la `entrega` y el conteo de principales de la lista de foros;
   - "Participantes" (estado, retraso, fecha y `entregadas`).

   ATQ-FORO-72 cubre a los demás actores y los ids cruzados:
   - ni el alumno ni el maestro borran su propia réplica, y el alumno tampoco su principal: 403 del rol;
   - con el foro propio en la ruta, el admin recibe `404 PARTICIPACION_NO_ENCONTRADA` por una réplica o una principal de otro foro de la clase, y por una principal de otra clase;
   - con el foro de otra clase en la ruta, recibe `404 TAREA_NO_ENCONTRADA`;
   - nada se borra ni cambia de versión.
4. **El opt-in.** `foros-01b-r1-optin`:
   - ATQ-FORO-80: sin `conForos` ni `conTipo`, con una tarea, un foro y un material en la clase, el frontend viejo recibe lo de siempre:
     - "Trabajo" con y sin sección no trae el foro;
     - el muro y Recursos no lo traen;
     - los temas de Actividades no lo cuentan;
     - las columnas del gradebook y las filas de "Mis calificaciones" tienen las llaves de antes, sin `tipo`;
     - la exportación nunca trae `tipo`, tampoco con `?conTipo=si`.
   - ATQ-FORO-81: `conForos` con `SI`, vacío, repetido, sin `seccion` o con `seccion=aprendizaje` o `docente` responde `400 «conForos: …»` en Trabajo y en los temas. En Recursos se ignora (200, sin el foro). Con `seccion=actividades&conForos=si`, un material o un foro de otro tema como cursor responden 400.
   - ATQ-FORO-82: `conTipo` con `SI`, vacío, repetido o `no` responde `400 «conTipo: …»` en el gradebook y en "Mis calificaciones". En una clase archivada, el gradebook del maestro y "Mis calificaciones" del alumno (`lectura-del-alumno`) traen el tipo de cada columna con `conTipo=si`.
5. **El `409` de categorías.** `foros-01b-r1-optin`:
   - ATQ-FORO-83: con solo un foro, con dos foros y con un foro y una tarea, el texto exacto dice «tiene 1 actividad.» o «tiene 2 actividades.», y la categoría sigue.
   - ATQ-FORO-84: al quitar a la vez una categoría con dos tareas y otra con un foro (3 vueltas), el texto es el de una de las dos, con su propia cuenta de foros. En el caso determinista, se quita solo la de tareas y se conserva la del foro, y el texto es ««A» tiene 2 tareas.», no «actividades».
6. **Temas.** `foros-01b-r1-optin`:
   - ATQ-FORO-85: renombrar un tema con un foro y una tarea responde `elementos: 2`. Borrarlo deja el foro sin tema, y `sinTema` cuenta el foro sin sección y con `conForos=si`, no con `seccion=actividades`.
   - ATQ-FORO-86: mover un foro sube su versión. Guardar el formulario abierto antes responde `409 TAREA_MODIFICADA` con «este foro» y sin cambios; con la versión nueva, se guarda.
7. **ADMIN-01 con datos más ricos.** `foros-01b-r1-borrado-carreras`:
   - ATQ-FORO-66: una principal calificada que el admin borró, otra sin calificar también borrada, y réplicas de un maestro dado de baja que sigue en la clase archivada.
     - El conteo da `actividades 1, entregas 1, calificaciones 1`: cuenta la calificada, que conserva su fecha, y no la que volvió a "sin participar".
     - El duplicado no copia nada del foro, y el borrado definitivo responde 204 sin filas, con los usuarios intactos.
   - ATQ-FORO-67: un alumno calificado dado de baja sale del gradebook, y su principal sigue en la lista con su nombre y `puedeBorrar` para el admin. El admin la borra; al reactivarlo, vuelve con su calificación.
8. **Regresiones de 01a.** Las seis `foros-01a-r1-*`, una a la vez: archivada 4, ids y fugas 5, carreras 5, tipo y validación 8, calificaciones 3 y adjuntos 3, todas verdes.

### Observaciones (no son hallazgos)
- **O-01b-1. La lista de foros distingue "nunca participó" de "le borraron la principal".**
  - Sin fila de entrega, la `entrega` del alumno en `GET …/foros` es `null`. Después de que el admin borra su principal sin calificar, la fila queda y la lista trae `{ estado: "asignado", conRetraso: false }`.
  - Es lo que dice §D-3.2 ("null para maestro y admin, o sin fila"), y "Mis calificaciones", el gradebook y "Participantes" lo tratan igual que a un asignado.
  - Lo anoto para el frontend (01c1): las dos formas deben pintarse igual.
  - Mi primera versión de ATQ-FORO-70 esperaba `null` y la corregí: el error era de mi prueba, no del código.
- **O-01b-2. `puedeBorrar` vale `true` para el admin también en una clase archivada, donde la ruta 17 responde 409.** Es la regla del plan (`puedeBorrarParticipacion = actor.rol === "admin"`, §D-11), y el frontend oculta la escritura con su contexto de solo lectura (ADMIN-01). No es un permiso: el backend la niega.
- **O-01b-3. `conForos` en `GET …/recursos` se ignora (200).** `recursosQuerySchema` es un `z.object` sin `strict`. No trae foros y el plan no lo define, así que no es hallazgo.

### Mis mutaciones
Todas en archivos de "Se toca" de 01b (§E7.5.2), sin preguntar, con el procedimiento de la ronda 1 de 01a:
- copia previa;
- `tester-r1/mutar.cjs`, que aborta si el ancla no aparece exactamente una vez;
- la corrida de mi archivo;
- la restauración y la comparación byte a byte, con «cmp igual: true» en las 6 corridas;
- `sha256sum -c` de `foros.ts`, `categorias.ts` y `handlers/calificaciones.ts` en OK después de todas.

`git diff --stat -- src` se mantuvo igual antes y después (`14 files changed, 382 insertions(+), 46 deletions(-)`). No muté nada de "No se toca".

| Mutación | Archivo · ancla | Corrida | Cae |
|---|---|---|---|
| MB1 | `adapters/db/foros.ts` · en `borrarParticipacion`, `bloquearTareaParaEntregar(…)` → un `tarea.findFirst` sin bloqueo | `Tests  1 failed \| 7 passed (8)` | ATQ-FORO-60 (ya no espera la fila del foro) |
| MB2 | ídem · sin `version: { increment: 1 }` al volver a "sin participar" | `Tests  4 failed \| 4 passed (8)` | ATQ-FORO-62, 63, 64 y 65 |
| MB3 | ídem · `puedeBorrar` de `replicaDe` → `true` | `Tests  1 failed \| 2 passed (3)` | ATQ-FORO-71 |
| MB4 | `adapters/db/categorias.ts` · la cuenta de foros sin `categoriaId` | primero `Tests  7 passed (7)`: **no cayó**; con el caso determinista agregado a ATQ-FORO-84, `Tests  1 failed \| 6 skipped (7)` | ATQ-FORO-84 |
| MB5 | `handlers/calificaciones.ts` · la exportación con `columnaParaResponder(tarea, true)` | `Tests  1 failed \| 6 passed (7)` | ATQ-FORO-80 |

Sobre MB4: en las tres vueltas, el `groupBy` eligió primero la categoría con el foro, así que la cuenta mal acotada daba lo mismo. Agregué a ATQ-FORO-84 el caso determinista (se quita solo «A» y «B» se queda con su foro), que sí lo vigila; la versión final del caso cae con MB4.

Redundancia declarada: ATQ-FORO-61 y ATQ-FORO-63 son carreras sin retención (`Promise.all`, 5 vueltas). Vigilan que no haya 500 ni filas huérfanas en cualquier orden, no un orden fijo. Los órdenes fijos los cubren ATQ-FORO-60 (retención de la fila del foro), FORO-1A67 y FORO-1A68 del programador.

### Archivos nuevos (3; 18 casos)
`npx vitest list test/foros-01b-r1` (desde `backend/`), contado con `grep -a ' > ' | grep -ac 'ATQ-FORO-'`, da **18** casos:
- `backend/test/foros-01b-r1-borrado-carreras.ataque.test.ts`: 8 (ATQ-FORO-60 a 67);
- `backend/test/foros-01b-r1-estados.ataque.test.ts`: 3 (ATQ-FORO-70 a 72);
- `backend/test/foros-01b-r1-optin.ataque.test.ts`: 7 (ATQ-FORO-80 a 86).

No hay ayudas compartidas nuevas: cada archivo trae las suyas, y las ayudas existentes solo se importan. No hay ningún `LOCK TABLE`. La única retención (ATQ-FORO-60) es de una fila, con `timeout: 30_000` y `maxWait: 5_000`. Toda prueba tiene aserciones, y una precondición que falta lanza con su mensaje. No toqué mis `*.ataque` de 01a, ninguna otra prueba ni la ayuda del programador.

### Comandos (desde `backend/`, uno a la vez)
- Cada archivo, en su ronda:
  - `npx vitest run test/foros-01b-r1-borrado-carreras.ataque.test.ts` → `Tests  8 passed (8)`;
  - `…-estados…` → `Tests  3 passed (3)`;
  - `…-optin…` → `Tests  7 passed (7)`, y ATQ-FORO-84 sola, ya reforzada, con `-t` → `1 passed | 6 skipped`.
- Regresiones de 01a: las seis `foros-01a-r1-*` sueltas, en verde (4, 5, 5, 8, 3 y 3).
- `npm run lint` → salida 0; última línea `tsc -p tsconfig.json --noEmit && tsc -p tsconfig.test.json`.
- La suite de los 38 filtros de la §7 del resumen de 01b, tal cual (mis archivos entran por `test/foros`) → `Test Files  180 passed (180)` · `Tests  1919 passed (1919)` (`Duration  137.86s`). 1919 = 1901 de la verificación del manager + mis 18.
- PA-07, en la salida completa de esa corrida: `40P01` 0, `deadlock detected` 0, `could not serialize` 0, `too many clients` 0, `"Error no controlado"` 0 y `"code":"P2028"` 0. En la corrida suelta de `borrado-carreras` también dio 0 en los seis.
- `git diff --stat -- src` se mantiene en `14 files changed, 382 insertions(+), 46 deletions(-)`, igual que antes de mis mutaciones.

### V-01
- `sha256sum -c foro01-arranque/v01-foro01b-r0.txt` → 297 `OK`: ninguna `*.ataque` anterior cambió.
- `foro01-arranque/v01-foro01b-r1.txt` (scratchpad) tiene las 297 de la ronda 0 sin cambio más mis 3 archivos, **300** líneas; el árbol tiene 300 `*.ataque`. SHA-256 `60b38386e9fe8506953006a265f76bb2505076589028902abe5bb3a46776884d`.

### No atacado y por qué
- **La suite completa del backend y PA-07 con su control positivo:** las corre el manager al cerrar.
- **El frontend:** 01b no toca su producción. C-7 quedó verde en la ronda 0, y el manager corrió `src/lib`, `src/features/clases`, `src/features/tareas` y `src/features/calificaciones`.
- **`borrarComentario` sin filtro de tipo, R-02, DH-02, O-r1-1, O-r1-2 y las redundancias N1 y N3:** aceptados.
- **El orden de la fila retenida de FORO-1A67 y FORO-1A68:** lo arbitró el manager. No lo repetí; lo complementan ATQ-FORO-60 a 64.
- **Un `conForos` con valores en otras rutas fuera de Trabajo, temas y Recursos:** las demás no lo leen.
- **El navegador:** 01b no tiene interfaz.

## Ronda 0 — FORO-01c1 (2026-11-16)


Veredicto de la ronda 0: **aplicada, sin PARADA.** Apliqué los siete C-n de 01c1 (C-9, C-10, C-11, C-17, C-18, C-19 y C-20) con el texto de §E8.2, §E9.2, §E9.3 y §E7.5.4. La búsqueda propia no encontró ninguna prueba que cuente, enumere o indexe las secciones fuera de la lista cerrada, de los C-n o de las vigiladas. **Ninguna de mis propias `*.ataque` cambia con 01c1:** las once que escribí en FORO-01 están en `backend/test/` (seis de 01a y tres de 01b, más los C-T1 y C-T2 de la ronda 0 de 01b sobre dos de ellas), y 01c1 es solo frontend.

### Arranque
- Equipo con corriente (`BatteryStatus` 2). No hace falta Docker: 01c1 es solo frontend y no corrí nada del backend.
- `git log`: `ebbcb40` (01b). `git status --short -- backend frontend shared` vacío al empezar.
- V-01 de arranque: `sha256sum -c foro01-arranque/v01-foro01b-r1.txt` (lista con SHA-256 `60b38386…`) → 300 `OK`, 0 fallas.

### Comprobación de arranque (§E8.2, patrones, y §E8.3, línea "Grep"), sobre `ebbcb40`, en todo `frontend/src`
Todas las búsquedas multilínea las hice en node sobre los `*.test.ts(x)` (`tester-r1/grep01c1.cjs`), porque `grep -P` no admite el locale de este shell.
- `"Actividades de aprendizaje",\s*"Recursos"` → 8 archivos:
  - de la lista cerrada (5): `app/router-01d.test.tsx`, `features/clases/clase-layout.test.tsx`, `dudas-caminos-03e.test.tsx`, `lib.test.ts` y `secciones-03c1.test.tsx`;
  - C-n (2): `clases-admin-02c-r1.ataque` (C-18) y `heredados-02d-r1.ataque` (C-9);
  - vigilada (1): `textos-03c1.test.ts:15-24`, que enumera claves explícitas de `TEXTOS_CLASE`; sumar `foro` no la cambia (§E8.2).
- `"Dudas",\s*"Personas"` → los mismos 8.
- `esperadas\(\d` → `indicador-03c1-r1.ataque` (C-19), `indicador-03c1-r2.ataque` (C-20) y `secciones-03c1.test.tsx` (lista cerrada).
- `medidasDeLaOpcion\(\d` → `app/router-01d.test.tsx` y `clase-layout.test.tsx`, los dos de la lista cerrada.
- `opcionDe\(lista, \d\)` → `indicador-03c1-r1` y `-r2` (C-19 y C-20).
- `--indicador-x` → 9 pruebas.
  - Siete están en la lista cerrada o son C-n: `router-01d`, `rutas-01d-r1` (C-17), `clase-layout`, `heredados-02d-r1`, `indicador-03c1-r1`, `-r2` y `secciones-03c1`. A ellas se suma el componente `secciones-de-clase.tsx`, que es producción.
  - Las otras dos son reglas, no índices:
    - `components/layout/estatico-r1.ataque:154` es un comentario dentro de la lista de valores arbitrarios;
    - `features/clases/estatico-03c1-r1.ataque` (CL3-R1-30 a 35) pide que el indicador use solo esas dos variables, que `secciones-de-clase.tsx` no use corchetes ni tipos sueltos y que `hooks.ts` no declare tipos. Es la regla general que el manager ya señaló (CL3-R1-34). Queda **vigilada**: 01c1 suma `useForos` a `features/clases/hooks.ts`, y los tipos van en `types.ts`.
- `"[1-6]\d0px"` → `rutas-01d-r1` (C-17), `indicador-03c1-r1` y `-r2` (C-19 y C-20), `secciones-03c1.test.tsx` (lista cerrada) y `styles/tokens.test.ts`, que son tokens y no secciones.
- `indiceDeSeccionActiva\(` → `lib.test.ts` y `recursos-lib-03d.test.ts`, los dos de la lista cerrada.
- `toHaveLength\(6\)` → `clase-layout.test.tsx` (lista cerrada, PR-2C08). Las otras tres no cuentan secciones:
  - `clase-archivada-01d2-vista.test.tsx:1596` cuenta 6 celdas de una tabla;
  - `recursos-03d.test.tsx:583-589` cuenta 6 peticiones de recursos;
  - `trabajo-view.test.tsx:879` y `:1033` cuentan 6 peticiones o lugares de "Trabajo".
- `getAllByRole\("link"\)\[\d\]` → `app/foco-barra-02d-r2.ataque` y `foco-pestana-02d-r3.ataque`, que indexan la lista de clases de la barra (vigiladas, §E8.2).
- `seis secciones` → `clase-layout.test.tsx` y `secciones-03c1.test.tsx` (lista cerrada) y `heredados-02d-r1.ataque` (C-9; solo en sus comentarios de historial).
- `SECCIONES_DE_LA_CLASE` en las pruebas → 0.
- §E8.3, `\.refetch\(` y `mutate(Async)?\(` en los archivos nuevos: los archivos de 01c1 todavía no existen. Queda para la ronda 1, contra ATQ-CH4-32 y ATQ-CH4-34.

**Las listas cerradas de las reglas estáticas** (CHORE-04, CHORE-06 y V-06), abiertas una por una:
- **`lib/estado-por-id-estatico-ch6.test.ts` (CH6-A30):**
  - `SIN_KEY_EN_EL_RENDER_PROP` es una lista cerrada que hoy incluye `dudas-view.tsx#DudasDeLaClase`: las listas con memoria de foco que no llevan la key en el render prop.
  - Si `ForosView` copiara esa forma de `DudasView` sin la key, CH6-A30 (a) caería y haría falta sumarla a esa lista (prueba normal, no inventariada).
  - El plan lo descarta: §E7.5.4, "Grep de la lista": "Render props de `ConClaseDeLaRuta`: los nuevos llevan `key={claseId}` (CH6-A30 (a))". Con eso no cambia nada. Queda **vigilada**, con esta restricción para el programador: `ForosView` pinta `ConClaseDeLaRuta` con `key={claseId}` en el render prop. Si no, PARADA.
- **`lib/guardas-de-doble-clic-estatico.test.ts`:** CH4-01 a CH4-03 son reglas sobre toda la producción. CH4-04 tiene una lista cerrada de lectores de `isFetchingNextPage`: `mis-calificaciones-view.tsx`, `hilo-privado.tsx` y `entregas-view.tsx`. `dudas-view.tsx` no lo lee, así que `ForosView` tampoco debe (§E7.5.4, "Grep de la lista"). Vigilada.
- **`lib/guardas-ch4-r1.ataque.test.ts`:** las listas de ATQ-CH4-31, 32 y 34 cambian con C-15 (01c2) y C-16 (01e), no en 01c1. "Ver más foros" con `fetchNextPage({ cancelRefetch: false })` no las toca. Vigilada.
- **`styles/clases-r1.ataque.test.ts` (V-06):** es C-11.
- **Las pruebas que recorren el router:** `app/marco-r1.ataque:376` y `features/admin/cuentas-view.test.tsx:185` comprueban con `matchRoutes` que cada enlace de la navegación principal y de la ficha de una cuenta tenga una ruta. Ninguno es un enlace de la sección ni de la lista de foros, así que los enlaces a `foros/:foroId` y `foros/nuevo`, que hasta 01c2 caen en el comodín (§E9.5), no las tocan.
- **`estatico-02c-r1.ataque:140`** fija la línea `path: "clases/nueva"` del router; la ruta `foro` no coincide con ese patrón.

**Resultado: ninguna prueba sin inventariar. Sin PARADA.**

### Mis propias `*.ataque`
Ninguna cambia. Las once de FORO-01 (`backend/test/foros-01a-r1-*` y `foros-01b-r1-*`) son del backend; 01c1 no toca el backend ni `shared/`.

### Respaldo
Los siete archivos, antes de tocarlos, en `foro01-arranque/r0-01c1-respaldo/` (scratchpad). Cada uno coincide con su línea de `v01-foro01b-r1.txt`.

### Antes de cambiar nada (desde `frontend/`, `npx vitest run <ruta>`, uno a la vez)
`heredados-02d-r1` 9 de 9, `estatico-02c-r1` 5 de 5, `styles/clases-r1` 11 de 11, `rutas-01d-r1` 7 de 7, `clases-admin-02c-r1` 17 de 17, `indicador-03c1-r1` 13 de 13 e `indicador-03c1-r2` 17 de 17, todo en verde.

### C-9: `features/clases/heredados-02d-r1.ataque.test.tsx` (aplicado)
- Las líneas citadas (`:209-273`) coinciden: el comentario de 03e termina en `:229-231` y las tres listas están en el `it.each`.
- Cambios:
  - El comentario literal de C-9 (§E9.3) va después del de 03e: `// FORO-01c1 ronda 0 (C-9, §E8.2; §D-8.1): …`.
  - En las tres listas (estudiante, maestro y admin), `"Foro"` entra después de `"Actividades de aprendizaje"`. Prettier las parte en una línea por elemento.
  - La medida de «Personas» sale de `esperadas.indexOf(activa)`, así que no hay otra cifra que tocar.
- Qué afirma ahora: siete secciones con «Foro» tercera, la activa con `aria-current` y el indicador en su índice.
- Después: `Tests  3 failed | 6 passed (9)`. **Rojo esperado** en los tres casos del `it.each` (`expected [ 'Avisos', …(5) ] to deeply equal [ 'Avisos', …(6) ]`), porque producción aún no tiene «Foro». Los otros seis, verdes.

### C-10: `features/clases/estatico-02c-r1.ataque.test.ts` (aplicado)
- Las líneas citadas (`:123-133`) coinciden. El comentario literal de C-10 va antes del `expect`, y `"/src/features/clases/foros-view.tsx"` queda en su lugar del orden, entre `editar-recurso-view.tsx` y `muro-view.tsx`.
- **Es condicional** (§E7.5.4): vale si `ForosView` llama a `perspectivaDeRuta(` como `dudas-view.tsx` (§E8.3: "`ForosView` como `DudasView`"). La lista es exacta (`toEqual`). Si el programador hace `ForosView` sin esa llamada, este caso caerá. Entonces se quita la entrada, que es mía en esta ronda; él no la toca.
- Después: `Tests  1 failed | 4 passed (5)`. **Rojo esperado:** `expected [ …(9) ] to deeply equal [ …(10) ]`, porque `foros-view.tsx` aún no existe.

### C-11: `styles/clases-r1.ataque.test.ts` (V-06, aplicado)
- Las líneas citadas (`:206-383`) coinciden: el `it` está en `:206`, `toHaveLength(90)` en `:213` y la lista `fijos` en `:220-379`.
- Cambios:
  - **El comentario.** El plan da su texto como `// FORO-01c1 ronda 0 (C-11, §E8.2): de 90 a <n> enEspera=, …`, con puntos suspensivos. Lo completé con <n> = 91, la cifra prevista (§E8.2, C-11), y con la aclaración de §E8.2: "un archivo nuevo sin `enEspera=` no necesita entrada en `fijos`".
  - El título y `toHaveLength` pasan de 90 a 91.
  - `fijos` suma `"/src/features/clases/foros-view.tsx": 1`, con su comentario «Ver más foros». Las vistas del foro de 01c2 no se escriben (Enmienda 9).
  - Si el programador declara otra cifra, el título, el comentario y `toHaveLength` cambian en la ronda 1.
- Después: `Tests  1 failed | 10 passed (11)`. **Rojo esperado:** `expected [ …(90) ] to have a length of 91 but got 90`.

### C-17: `app/rutas-01d-r1.ataque.test.tsx` (aplicado)
- Las líneas citadas (`:197-210`) coinciden. El comentario literal de C-17 va después del de 03e, y `:210` pasa de `{ x: "500px", ancho: "130px" }` a `{ x: "600px", ancho: "140px" }`.
- Después: `Tests  2 failed | 5 passed (7)`. **Rojo esperado** en los dos casos que miden el indicador de «Calificaciones» (`expected { x: '500px', ancho: '130px' } to deeply equal { x: '600px', ancho: '140px' }`).

### C-18: `features/clases/clases-admin-02c-r1.ataque.test.tsx` (aplicado)
- Las líneas citadas (`:380-393`) coinciden. El comentario literal de C-18 va después del de 03e (`:380-381`), y la lista suma `"Foro",` entre `"Actividades de aprendizaje",` y `"Recursos",`.
- Después: `Tests  1 failed | 16 passed (17)`. **Rojo esperado:** `expected [ 'Avisos', …(5) ] to deeply equal [ 'Avisos', …(6) ]`.

### C-19: `features/clases/indicador-03c1-r1.ataque.test.tsx` (aplicado)
- Apliqué cada línea con un script (`tester-r1/c19.cjs`) que antes comprueba que la línea tiene exactamente lo que el plan dice. Todas coincidieron en `ebbcb40`:
  - `esperadas(5)` → `esperadas(6)` en `:354`, `:373`, `:387`, `:404`, `:420`, `:431`, `:456`, `:567`, `:578`, `:589` y `:594` (once);
  - `esperadas(4)` → `esperadas(5)` en `:523`;
  - `opcionDe(lista, 5)` → `opcionDe(lista, 6)` en `:406`, `:421`, `:433` y `:458`;
  - `"500px"` → `"600px"` en `:357` y `:376`.
- El comentario literal de C-19 va después de `:301-304`.
- **Detalle de forma.** El plan pide cambiar "su comentario de `:522`" a "«Personas» pasa al índice 5". No reescribí el comentario de 03e; agregué debajo `// FORO-01c1 ronda 0 (C-19, §E8.2): «Personas» pasa al índice 5.`, que es como el proyecto conserva el historial en estos archivos. Si el arquitecto prefería reemplazar la línea, es cosa de texto: no cambia ninguna aserción.
- `esperadas(0)`, `esperadas(1)` y los `scrollLeft` que fija la prueba no cambian.
- Después: `Tests  11 failed | 2 passed (13)`. **Rojo esperado** en los once, uno por uno con el reporte JSON:
  - diez dan `expected { x: '500px', ancho: '130px' } to deeply equal { x: '600px', ancho: '140px' }`;
  - CL3-R1-05 da `expected { x: '400px', ancho: '120px' } to deeply equal { x: '500px', ancho: '130px' }` («Personas»).

  Todos son «Calificaciones» o «Personas» un índice antes, porque producción aún no tiene «Foro».

### C-20: `features/clases/indicador-03c1-r2.ataque.test.tsx` (aplicado, con el texto completo de §E8.2 reescrito por §E9.2)
- Cada línea se comprobó antes de cambiarla (`tester-r1/c20.cjs`), y todas coincidieron:
  - `esperadas(5)` → `esperadas(6)` en `:439`, `:475`, `:526`, `:557` y `:576`;
  - `opcionDe(lista, 5)` → `opcionDe(lista, 6)` en `:528`, `:554` y `:558`;
  - los argumentos sueltos `5,` → `6,` en `:383`, `:404`, `:429`, `:446`, `:466` y `:484`, y `4,` → `5,` en `:420` y `:499` (cada línea era exactamente `5,` o `4,`);
  - el comentario de `:506-508`, «Calificaciones» de 500..630 a 600..740;
  - en el control de CL3-R2-08, `"Recursos"` → `"Foro"` (`:599`) y `"recursos maestro"` → `"foro maestro"` (`:600`), con la línea literal de C-20 debajo del comentario de `:594-596`;
  - el router de prueba suma `{ path: "foro", element: <p>{`foro ${rol}`}</p> },` con su comentario literal, en la línea anterior al comentario de `:78`;
  - el comentario literal de C-20 va después de `:300-304`.
- Lo que no cambia: los argumentos `1,` (`:390`) y `0` (`:414`, `:440`, `:476`), `esperadas(0)`, `esperadas(1)`, `esperadas(2)`, `opcionDe(lista, 0)` y `opcionDe(lista, 2)`. Las tablas de CL3-R2-07 y CL3-R2-08 usan los índices 0 y 1 y no cambian. **No apareció ningún otro índice ≥ 2 de una sección:** no hubo PARADA.
- Después: `Tests  17 failed (17)`. **Rojo esperado** en los diecisiete, uno por uno con el reporte JSON:
  - doce son la medida de «Calificaciones» o de «Personas» un índice antes;
  - los cuatro de CL3-R2-07 son `Error: Precondición: la opción 6`, porque hoy solo hay seis opciones;
  - el control de CL3-R2-08 da `Unable to find … the role "link" and name "Foro"`.

  Todo por la falta de «Foro» en producción.

### Por qué no hay verdes
§E8.2 inventaría siete C-n para 01c1 y ninguno es una lista de permitidos que se amplía: todos cuentan, ordenan o miden la sección «Foro» o un archivo que todavía no existe. Por eso los siete quedan rojos hasta que el programador implemente. En la ronda 0 de 01a, C-6 era la única lista de permitidos y quedó verde.

### Lint
- `npx prettier --write`, solo sobre los siete archivos: los siete quedaron "unchanged" (Prettier ya había partido las listas de C-9 en la escritura).
- `cd frontend; npm run lint` → salida 0; última línea `tsc -b`.

### V-01 final
- `sha256sum -c foro01-arranque/v01-foro01b-r1.txt` → 293 `OK` y 7 `FAILED`. Los siete son exactamente los de los C-n: `app/rutas-01d-r1`, `features/clases/clases-admin-02c-r1`, `estatico-02c-r1`, `heredados-02d-r1`, `indicador-03c1-r1`, `indicador-03c1-r2` y `styles/clases-r1`.
- `git diff --stat ebbcb40 -- backend frontend shared`: solo esos 7 archivos (102 inserciones y 44 eliminaciones), sin producción.
- `foro01-arranque/v01-foro01c1-r0.txt` (scratchpad): 300 líneas en el formato y el orden de la base. SHA-256 `a79d29789a31a995bf62b0be7d2fd82ee3919f96c6b5ad48b1db4a2143a482d2`.

### Paradas y discrepancias
- **Ninguna PARADA.** Todas las líneas que citan §E8.2, §E9.2 y §E7.5.4 coincidieron con los archivos en `ebbcb40`.
- **Dos precisiones de forma, sin cambio de aserciones:**
  - El comentario de C-11 tiene puntos suspensivos en el plan. Lo completé con 91 y con la aclaración de §E8.2.
  - En C-19, el comentario de `:522` se conserva y lleva una línea nueva debajo, en lugar de reescribirse.
- **C-10 es condicional:** si `ForosView` no llama a `perspectivaDeRuta(`, se retira en la ronda 1. La entrada es mía.
- **Vigiladas que el programador debe cumplir por diseño:**
  - CH6-A30 (a): `ForosView` con `key={claseId}` en el render prop; si no, la lista cerrada `SIN_KEY_EN_EL_RENDER_PROP` caería.
  - CH4-04: ningún lector nuevo de `isFetchingNextPage`.
  - CL3-R1-34: sin tipos en `features/clases/hooks.ts`.
  - §E9.4, en `features/clases`: sin `?? []`, sin ternarios anidados en JSX, sin `disabled` en JSX, sin valores arbitrarios y sin importar de otro módulo.

## Ronda 1 — FORO-01c1 (2026-11-16)


Veredicto: **RESISTE.** Ningún hallazgo: 0 críticos, 0 altos, 0 medios y 0 bajos. Escribí 33 casos de ataque nuevos en 2 archivos del frontend, y todos pasan contra el código de hoy. Hice 6 mutaciones reales en archivos de "Se toca" de 01c1 (`foros-view.tsx` y `features/clases/hooks.ts`), en 7 corridas; todas tumban un caso mío (MC1, después de reforzar ATQ-FORO-101 y 102) y se restauraron byte a byte. Las siete `*.ataque` de la ronda 0 siguen verdes.

### Arranque
- Solo frontend; no corrí nada del backend. Equipo con corriente.
- V-01 contra `foro01-arranque/v01-foro01c1-r0.txt` (`a79d2978…`): `sha256sum -c` → 300 `OK`.
- Leí:
  - el resumen de 01c1 y su corrección M-10 (`resumen-programador.md:558-873`), con la matriz, los hermanos frente a `DudasView`, las mutaciones y las redundancias F2, F5 y F14;
  - las dos verificaciones del manager (`revision.md:1389-1715`);
  - `git diff ebbcb40 -- frontend`, `foros-view.tsx` completo, y `useFilaEnFoco`, `useAvisoDeRecargaFallida`, `useListaConservadaTrasLaPagina`, `useRecargarAlPulsarLaSeccion` y `useMarcarViejaSiQuedoEnError`;
  - `DESIGN.md` §7.14 y `CLAUDE.md`, "Componentes".

### Hallazgos
Ninguno. Dos rojos de la primera corrida fueron defectos de mis pruebas, no del código; están en "Observaciones".

### Atacado sin hallazgos (por punto, con el caso que lo prueba)
Archivos nuevos en `frontend/src/features/clases/`:
- `foros-01c1-r1.ataque.test.tsx` (router real y `Providers`: `staleTime` de 30 s y un reintento);
- `foros-01c1-r1-foco.ataque.test.tsx` (router real con un `QueryClient` igual al de la app, a la vista de la prueba).

1. **«Vuelve a abrir Foro» por los caminos que el plan no inventarió:**
   - ATQ-FORO-90: con la frase en A, ir a «Foro» de B y volver con el historial. La primera petición nueva de A va sin cursor, la frase sale, llega «Foro 7» y no hay aviso.
   - ATQ-FORO-91: lo mismo por la barra de clases (B y su «Foro», y de vuelta A y su «Foro»).
   - ATQ-FORO-92: pulsar «Foro» dos veces en el mismo instante, y una tercera después, con la recarga retenida, pide **una sola** primera página. Al soltarla, la frase sale.
2. **El aviso heredado o doble:**
   - ATQ-FORO-93: «Ver más foros» de A falla con la vista de A desmontada (sin observadores, TanStack no reintenta). Al volver a A no sale el aviso del fallo viejo, la lista se ve sin `alert` mientras la recarga vuela y luego llegan las filas.
   - ATQ-FORO-94: dos fallos con un montaje entre ellos (ir a «Avisos» y volver) dan exactamente dos avisos, y la lista y el botón siguen.
   - ATQ-FORO-95: en `StrictMode`, un fallo da un solo aviso.
   - ATQ-FORO-96: A y B conservadas; de A a B y de vuelta dos veces da dos avisos en total y ninguna alerta mientras vuela cada recarga.
3. **Los códigos con que `apiClient` redirige** (401 sin refresco, `ACCESO_RESTRINGIDO` y `CAMBIO_DE_CONTRASENA_REQUERIDO`):
   - ATQ-FORO-97 (×3): en la primera página, `irA` y ningún aviso;
   - ATQ-FORO-98 (×3): en la recarga al pulsar «Foro» de una lista conservada, `irA` y ningún aviso más que el del fallo de la página.
4. **El foco del efecto de N-28:**
   - ATQ-FORO-101 (control): una fila enfocada suelta el foco a `<body>` y, pasado el instante de `useFilaEnFoco`, un render real (otro conteo que cambia) no mueve el foco.
   - ATQ-FORO-102: soltar el foco y el render en el mismo `act` tampoco lo mueve; la fila sigue en la lista. **La carrera que temía el manager no se da con una consulta.** TanStack notifica con `setTimeout(0)`, detrás del `setTimeout(0)` que `useFilaEnFoco` encola en el `focusout`, así que la ref ya está limpia cuando corre el efecto.
   - ATQ-FORO-103: con la recarga retenida, la lista pasa por «Cargando los foros…» con la fila enfocada fuera. El foco va al `h2` y se queda ahí cuando vuelven las filas.
   - ATQ-FORO-104: el foco en «Crear foro» no se mueve con una recarga que cambia la lista. En «Ver más foros», una recarga que deja una sola página lo lleva a un elemento conectado, nunca a `<body>`.
   - ATQ-FORO-105: con una fila enfocada en A, volver con el historial a «Foro» de B, ya visitada, deja el foco en un encabezado (el título de la clase o el `h2`), nunca en `<body>`.
   - ATQ-FORO-106: con el foco en «Crear foro», la clase entra en solo lectura (el detalle llega archivado). «Crear foro» sale y el foco va al título de la clase (`h1` «Historia»).
   - Cambiar de ventana o de pestaña con una fila enfocada: `useFilaEnFoco` conserva la ref mientras la ventana no tiene el foco, pero el elemento activo sigue siendo la fila, así que `focoPerdido` es falso y el efecto no actúa. Lo leí en el código; jsdom no simula el foco de la ventana.
5. **La página siguiente:**
   - ATQ-FORO-107: el servidor anuncia otra página y la entrega vacía. «Ver más foros» sale, el foco va al `h2` y hay 20 filas, sin repetir.
   - Las filas repetidas no las ataqué con una prueba (ver "No atacado").
6. **El mensaje de la primera página** (ATQ-FORO-99, ×9):

   | Lo que responde el servidor | Mensaje |
   |---|---|
   | 500 sin cuerpo | «Algo salió mal. Inténtalo de nuevo.» |
   | 502 con HTML | ídem |
   | sin red | ídem |
   | 503 con mensaje vacío | ídem |
   | 503 con mensaje de solo espacios | ídem |
   | `VALIDACION` con ruta | ídem |
   | 404 `CLASE_NO_ENCONTRADA` | ídem |
   | `VALIDACION` de `claseId` | «No tienes acceso a esta clase.» |
   | 403 `SIN_ACCESO_A_LA_CLASE` | ídem |

   En cada caso hay un solo `alert`, ningún texto del servidor a la vista y ningún aviso.
7. **La lista conservada** (ATQ-FORO-100, además de 93 a 96):
   - después de conservarla, el 400 del cursor muestra la frase sin otro aviso;
   - una recuperación que falla con `403 SIN_ACCESO_A_LA_CLASE` reemplaza la lista con su texto, sin otro aviso.
8. **Las filas:**
   - ATQ-FORO-108, con el reloj fijo (`vi.setSystemTime`), en la perspectiva del alumno. En el milisegundo de la fecha límite, la fila dice «Venció…» y la insignia «Sin entregar»; un milisegundo antes, «Vence hoy» y «Asignado». Las dos formas de la entrega sin participar (`null` y `{ asignado, conRetraso: false }`) dan el mismo texto de fila.
   - ATQ-FORO-109: un título de 300 caracteres sin espacios y 1 234 567 participaciones se ven enteros («1234567 participaciones», en palabras), y la fila sigue siendo un solo enlace con «Foro:».
9. **La clase archivada:**
   - ATQ-FORO-106 cubre «Crear foro» que sale al entrar en solo lectura, con el foco en su sitio;
   - FORO-1C14 del programador cubre la lista de una clase que ya llega archivada;
   - `ForosView` no tiene efectos asíncronos que escriban, así que "un efecto que llega después de entrar en solo lectura" no tiene objeto aquí.
10. **Las reglas estáticas** (ATQ-FORO-110, sobre el texto de `foros-view.tsx` sin comentarios):
    - no aparecen `isFetchingNextPage` (CH4-04), `?? []`, `disabled`, `fetch(`, `console.`, vidrio (V-07), valores arbitrarios `-[…]` ni importaciones de `@/features/…`;
    - los únicos tipos declarados son `…Props`;
    - la key de la clase va en el render prop (CH6-A30 (a));
    - hay un solo `enEspera=` (V-06 en 91).

    CH4-04, CH6-A30, V-06 y V-07 también pasan en la suite de `src/lib` y `src/styles`.

### Observaciones (no son hallazgos)
- **O-01c1-1. Cambio de clase hacia una clase que no está en la caché: el foco queda en `<body>`.** No es de 01c1: es `ClaseLayout`, que está en "No se toca", y pasa igual en cualquier sección.
  - La reproducción fue mi primera versión de ATQ-FORO-105: con una fila enfocada en «Foro» de A, `router.navigate` a «Foro» de B, que nunca se abrió.
  - Mecanismo: mientras llega el detalle de B, `ClaseDeLaRuta` pinta `<Cargando />` en lugar de la raíz (`clase-layout.tsx:53-73`). `useFocoAlTituloDeLaClase` (`hooks.ts:296-312`) recibe la clave nueva sin raíz a la que llevar el foco, y cuando la raíz vuelve ya no hay cambio de clave.
  - Con B en la caché (volver con el historial a una clase visitada, que es el camino real desde una fila enfocada), el foco va al título: ATQ-FORO-105, verde.
  - La barra de clases no lo provoca, porque al pulsarla el foco está en el enlace de la barra.
  - Destino propuesto: `docs/ESTADO.md` §3, para quien vuelva a tocar `ClaseLayout`.
- **O-01c1-2. Dos rojos de mi primera corrida fueron míos:**
  - ATQ-FORO-110 contaba como tipo el `type ReactNode` de una importación. Lo corregí: solo cuentan las declaraciones al inicio de línea.
  - ATQ-FORO-103, sin retener la recarga, nunca llegaba a «Cargando». `resetQueries` y la respuesta caían en el mismo render y la fila no salía; ahora la recarga se retiene.
- **O-01c1-3. ATQ-FORO-101 y 102 al principio no provocaban un render.** `setQueryData` con los mismos datos conserva la referencia (structural sharing) y no notifica, así que la mutación MC1 sobrevivió. Los reescribí para que cambie el conteo de otra fila, con una precondición que lo comprueba en pantalla, y entonces MC1 cayó.
- **O-01c1-4. El estado de la fila y su insignia se calculan con dos `new Date()`:** el de `complementoDe` en `ForosDeLaClase` y el de `FilaDeEntrega`. En el milisegundo exacto de la fecha límite podrían discrepar si el reloj avanza entre los dos. Con el reloj fijo no discrepan (ATQ-FORO-108). Es un caso de un milisegundo y sin efecto práctico; lo dejo anotado.
- **O-01c1-5. Las filas repetidas en la página siguiente** no son alcanzables: el backend pagina por `(creado_en, id)`, que no cambian, con el cursor de Prisma y `skip: 1` (`adapters/db/foros.ts`, `listarForos`), así que una fila no aparece en dos páginas. Por eso la vista no necesita `unirPaginasSinRepetidas`, a diferencia de las listas de ADMIN-01, cuya clave de orden cambia (R-19).

### Mis mutaciones
Archivos de "Se toca" de 01c1, sin preguntar:
- copia previa;
- `tester-r1/mutar.cjs`, que aborta si el ancla no aparece exactamente una vez;
- restauración y comparación byte a byte («cmp igual: true» en las 7 corridas);
- `sha256sum -c` de `foros-view.tsx` y `hooks.ts` en OK;
- `git diff --stat -- src` igual antes y después (`20 files changed, 251 insertions(+), 93 deletions(-)`).

No muté nada de "No se toca".

| Mutación | Archivo · ancla | Cae |
|---|---|---|
| MC1 | `foros-view.tsx` · quitar `idEnFoco === null \|\|` del efecto de N-28 | primero **sobrevivió** (O-01c1-3); con el render real caen ATQ-FORO-101 y 102 |
| MC2 | ídem · sin `encabezadoRef.current?.focus()` en el efecto | ATQ-FORO-103 |
| MC3 | `features/clases/hooks.ts` · `useAvisoDeRecargaFallida` con `useRef(0)` en lugar de `useRef(errorUpdateCount)` | ATQ-FORO-93, 94 y 96 |
| MC4 | `foros-view.tsx` · sin `useRecargarAlPulsarLaSeccion(foros)` | ATQ-FORO-92, 98 (×3) y 100 |
| MC5 | ídem · `if (foros.isError)` sin `&& !conserva` | ATQ-FORO-93 y 96 |
| MC6 | ídem · el render prop sin `key={claseId}` | ATQ-FORO-110 |

Redundancias conocidas y aceptadas por el manager: F2 (la ref de «Ver más foros»), F5 (`useMarcarViejaSiQuedoEnError`) y F14 (`useFocoAlPasarAError`). No las repetí. ATQ-FORO-90 pasa sin `useMarcarViejaSiQuedoEnError` por la misma razón que F5.

### Archivos nuevos (2; 33 casos)
`npx vitest list src/features/clases/foros-01c1-r1` (desde `frontend/`), contado con `grep -a ' > ' | grep -ac 'ATQ-FORO-'`, da **33** casos:
- `frontend/src/features/clases/foros-01c1-r1.ataque.test.tsx`: 23 (ATQ-FORO-90 a 100; los `it.each` de 97 y 98 tienen tres casos cada uno, y el de 99, nueve);
- `frontend/src/features/clases/foros-01c1-r1-foco.ataque.test.tsx`: 10 (ATQ-FORO-101 a 110).

Cómo están hechos:
- Los elementos se localizan por rol, nombre o texto, nunca por clases de estilo.
- Toda prueba con fechas fija el reloj (ATQ-FORO-108) o las arma a partir de `Date.now()` con márgenes de días.
- Toda prueba tiene aserciones; las precondiciones que faltan lanzan con su mensaje.
- No toqué ninguna `*.ataque` existente, ninguna prueba normal ni producción.

### Comandos (desde `frontend/`, uno a la vez)
- `npx vitest run src/features/clases/foros-01c1-r1.ataque.test.tsx` → `Tests  23 passed (23)`.
- `npx vitest run src/features/clases/foros-01c1-r1-foco.ataque.test.tsx` → `Tests  10 passed (10)`.
- `npm run lint` → salida 0; última línea `> tsc -b`.
- `npx vitest run src/features/clases` → `Test Files  128 passed (128)` · `Tests  3138 passed (3138)` (298 s). 3138 = 3105 de la verificación del manager + mis 33.
- `npx vitest run src/app src/lib src/styles` → `Test Files  62 passed (62)` · `Tests  1100 passed (1100)`. El manager corrió 1111 con `como-se-entrega-01a.test.tsx`, que esta vez no entra en el filtro; las siete `*.ataque` de la ronda 0 están dentro de las dos corridas y siguen verdes.
- `git diff --stat -- frontend/src` sigue en `20 files changed, 251 insertions(+), 93 deletions(-)`, igual que antes de mis mutaciones.

### V-01
- `sha256sum -c foro01-arranque/v01-foro01c1-r0.txt` → 300 `OK`: ninguna `*.ataque` anterior cambió.
- `foro01-arranque/v01-foro01c1-r1.txt` (scratchpad): las 300 de la ronda 0 sin cambio más mis 2 archivos, **302** líneas; el árbol tiene 302 `*.ataque`. SHA-256 `061d8fd917a761dddef38e6562f6ffaf94e72073f3d4bfe87afa0494fbc7634c`.

### No atacado y por qué
- **Las filas repetidas en la página siguiente:** no son alcanzables desde el backend (O-01c1-5). Probé la página siguiente vacía (ATQ-FORO-107).
- **El ancho de 360 px y el corte visual de títulos largos:** jsdom no maqueta. ATQ-FORO-109 comprueba el texto entero y el enlace. Lo visual queda para la comprobación del humano en 01e.
- **El foco de la ventana y de la pestaña:** jsdom no lo simula. Lo leí en `useFilaEnFoco` (punto 4).
- **Las vistas del foro, crear, editar, borrar, participar y calificar:** son de 01c2 a 01e; en 01c1 las filas y «Crear foro» van a rutas que aún no existen (§E9.5).
- **La suite completa del frontend:** la corre el manager al cerrar.
- **El navegador:** no se abre.

## Ronda 0 — FORO-01c2 (2026-11-16)

Veredicto de la ronda 0: **sin PARADA y sin cambios en el árbol.** La comprobación de arranque no encontró ninguna prueba ajena sin inventariar.
- **C-8 queda pendiente**, con una condición exacta: depende de cómo implemente el programador T-02 y T-03.
- **C-15 queda preparado sin escribir**, con la secuencia del orquestador, más una propuesta para adelantar la mitad que el plan ya fija letra por letra.
- **Ninguna de mis `*.ataque` cambia con 01c2.**

### Arranque
- Base de 01c2: `88b37af` (01c1). Solo frontend. `git status --short -- backend frontend shared` vacío; los dos archivos `docs/trabajo/ENVIVO-…` y `DEPLOY-…` son del humano y no los toqué.
- V-01 de arranque: `sha256sum -c foro01-arranque/v01-foro01c2-base.txt` → 302 de 302 `OK`.

### Comprobación de arranque (§E7.5.0), sobre `88b37af`, en `frontend/src`
**§E7.5.3, "Grep de la lista", en lo que toca a 01c2:**
- `TEXTOS_FORMULARIO_PUBLICACION.*sinTema` → solo el comentario de `features/tareas/como-se-entrega-01a.test.tsx:262`: PR-1A17 ya entró en 01c1.
- `<FormularioTarea|<AccionesDeLaTarea` → `crear-tarea-view.tsx`, `detalle-tarea-view.tsx` y `editar-tarea-view.tsx`. Con `tipo` opcional y `"tarea"` por omisión, ninguna llamada cambia.
- Pruebas que cuentan los `GET` de `/temas` o `/categorias`:
  - en `features/tareas`: `formulario-tarea.test.tsx:664`, `:689` y `:714` y `editar-tarea-view.test.tsx:321` (`toBeGreaterThan(1)`, siguen valiendo), y `tareas-01a-r1.ataque.test.tsx:195` (`toHaveLength(2)`, C-8);
  - en todo `src`: también `app/clase-03c1.test.tsx:531-553`, `features/clases/avisos-03d.test.tsx:469`, `clase-archivada-01d1-vista.test.tsx:1952/1971`, `clase-archivada-01d2-vista.test.tsx:1097/2655`, `recursos-enmienda13-03e.test.tsx:555-558`, `trabajo-01e-r1.ataque.test.tsx:359-363` y `formularios-ch3*.test.tsx`. Todas son de "Actividades", Avisos, Recursos o el editor de categorías de `features/clases`, no del formulario de la tarea que cambian T-02 y T-03.
- `CODIGOS_CON_MENSAJE_DEL_SERVIDOR` (tareas) → sigue en 15 (`errores-ch3.test.ts:44` y `errores-ch3-r1.ataque.test.ts:112`, vigiladas).

**§E7.5.4, "Grep de la lista", en lo que toca a 01c2:**
- `perspectivaDeRuta(` en producción → las nueve vistas de `features/clases` de la lista de C-10 (con `foros-view.tsx`) y `features/tareas/hooks.ts`. Las vistas del foro de `features/tareas` deben tomar la perspectiva como las de la tarea, por `hooks.ts`. Si una la llamara directamente, `estatico-02c-r1.ataque` (C-10) caería: vigilada.
- `enEspera=` en producción → 91. §E8.3 ("V-06 en 01c2") dice que las vistas del foro no suman ninguno; si suman, PARADA.
- `isFetchingNextPage` → los tres lectores de la lista cerrada de CH4-04 (`mis-calificaciones-view.tsx`, `hilo-privado.tsx` y `entregas-view.tsx`).
- Render props de `ConClaseDeLaRuta` en `features/tareas` → `crear-tarea-view.tsx:68` en una línea, con `key={claseId}`; `detalle-tarea-view.tsx:162`, `editar-tarea-view.tsx:179`, `entrega-de-alumno-view.tsx:281` y `entregas-view.tsx:226` en varias líneas, revisadas a mano por CH6-A30 (c).
  - Las vistas nuevas del foro siguen la regla: render prop de una línea con `key={claseId}`, o de varias con la key por id (lista cerrada 6: `key={foro.id}` y `key={foroId}`).

**§E8.3, "Línea Grep" (los patrones de §E8.2 en todo `frontend/src`, más `.refetch(` y `mutate(`):**
- Los patrones de las secciones (`"Actividades de aprendizaje",\s*"Recursos"`, `"Dudas",\s*"Personas"`, `esperadas\(\d`, `medidasDeLaOpcion\(\d`, `opcionDe\(lista, \d\)`, `"[1-6]\d0px"`, `indiceDeSeccionActiva\(`, `toHaveLength\(6\)`, `getAllByRole("link")[n]` y `seis secciones`) solo dan archivos que 01c1 ya ajustó (lista cerrada o C-n) o vigilados. 01c2 no cambia las secciones.
- `.refetch(` sin `{ cancelRefetch: false }` en producción → exactamente las cinco líneas de la lista cerrada de ATQ-CH4-34:
  - `editar-recurso-view.tsx:136`;
  - `editar-tarea-view.tsx:132`;
  - `entrega-de-alumno-view.tsx:122` y `:123`;
  - `features/clases/hooks.ts:1242`.

  01c2 suma `editar-foro-view.tsx` (C-15).
- `mutate(Async)?(` en `features/tareas` → nueve llamadas, todas en manejadores a dos espacios. La única fuera de esa forma es `editar-tarea-view.tsx:120` (`handleGuardar` anidado), que está en la lista de ATQ-CH4-32. 01c2 suma `editar-foro-view.tsx` (C-15) y la de `crear-foro-view.tsx`, que, por la lista cerrada 5 (`EXCEPCIONES` de CH4-01), corre dentro de `handleGuardar` de `formulario-tarea.tsx`.

**Búsqueda propia, de lo que el plan pudo no ver con 01c1 ya en el árbol:**
- **Rutas del router:** solo dos pruebas leen el texto de `app/router.tsx`.
  - `components/layout/estatico-r1.ataque:93` prohíbe "Fondo" u "orbe".
  - `features/clases/estatico-02c-r1.ataque:139-147` fija la línea `path: "clases/nueva"` y prohíbe `"/maestro/clases/nueva"` y `"/maestro/clases/${…}/editar"` literales.

  Las rutas nuevas (`foros/nuevo`, `foros/:foroId`, `foros/:foroId/editar` y la redirección de `foros/nuevo` del alumno a `/login`) no coinciden con esos patrones, siempre que los enlaces se armen con la base (`${base}/foros/…`), como `foros-view.tsx`. Las pruebas que recorren `rutas` con `matchRoutes` (`app/marco-r1.ataque:376` y `features/admin/cuentas-view.test.tsx:185`) solo miran la navegación principal y la ficha de una cuenta.
- **`mutationKey`:** ninguna prueba enumera las `mutationKey` (`toEqual`, `toContain` o `sort`). Las de CHORE-04 las leen por su forma, no por su valor.
- **Claves de `trabajoService`:** 18 pruebas importan alguna clave, pero ninguna enumera las exportaciones del servicio (`Object.keys`).
- **Textos de `features/tareas/data.ts` y la traducción de errores:**
  - las enumeraciones de textos fijos son de `features/admin`, `features/auth` y `features/clases` (`errores-ch3*`, `reexportaciones-01c`);
  - en `features/tareas`, `errores-ch3.test.ts:44` y `errores-ch3-r1.ataque:112` cuentan los 15 `CODIGOS_CON_MENSAJE_DEL_SERVIDOR` de la tarea, y `estatico-01c-r1.ataque:113-125` recorre `TEXTOS_CALIFICAR` y `TEXTOS_CALIFICACION` (01e).

  La traducción del foro va en tablas propias (§E9.4: `TRADUCCION_DE_ERRORES_FORO` y sus códigos, con `textoDelAvisoAlCalificarElForo` en 01e), así que ninguna de esas cuentas cambia. Si el programador sumara códigos a `CODIGOS_CON_MENSAJE_DEL_SERVIDOR` de la tarea en lugar de una tabla propia, caerían las dos: vigiladas, como dice §E7.5.3.
- **Parámetros de tipo de `import.meta.glob`:** el único distinto de `<string>` es `como-se-entrega-01a.test.tsx:241` (`TEXTOS_FORMULARIO_RECURSO`), ya ajustado en 01c1 y sin relación con 01c2. `features/tareas/tareas-01d-r3.ataque.test.tsx:391` lee `features/tareas/**` (vigilada, §E9.4: sin tipos fuera de `types.ts`).
- **La regla de §E9.4 para `features/tareas`:**
  - `tareas-01d-r1:479-537`: sin `fetch(`, `console.`, `?? []`, `dangerouslySetInnerHTML` ni emojis;
  - `tareas-01d-r2:504-541`: sin `disabled`, sin escalas anuladas y sin importaciones `@/features/…`, también del propio módulo;
  - `tareas-01d-r3:390-410`: sin tipos fuera de `types.ts`.

  Las tres se aplican a los archivos nuevos `foro-view.tsx`, `crear-foro-view.tsx` y `editar-foro-view.tsx`. Vigiladas.

**Resultado: ninguna prueba ajena sin inventariar. Sin PARADA.**

### Mis propias `*.ataque` y las de 01a y 01b del frontend
**Ninguna cambia.**
- `foros-01c1-r1.ataque.test.tsx` y `foros-01c1-r1-foco.ataque.test.tsx` no navegan a `…/foros/:foroId` ni a `…/foros/nuevo`, ni miran el `href` de las filas o de «Crear foro», ni dependen de la ruta comodín. ATQ-FORO-109 solo lee el nombre y el texto del enlace de la fila.
- La única `*.ataque` del frontend de 01a y 01b es `lib/errores-ch3-r2.ataque.test.ts` (C-6 y C-7), que lee los prefijos de `shared/src`. 01c2 no toca `shared/`.
- Los que fijan el destino de las filas y de «Crear foro» son de la lista cerrada del programador, no míos: `features/clases/foros-01c.test.tsx:319` y `:326`, que miran solo el `href`, y `:245-253`, que mira `indiceDeSeccionActiva` sobre `…/foros` y `…/foros/x` y no cambia con el router. Ninguno espera el comodín.

### C-8 (condicional): `features/tareas/tareas-01a-r1.ataque.test.tsx:176-195` — **pendiente**
- **Lo que fija el caso:**
  - el doble responde los `/temas` en secuencia (`:93`, `siguiente(temas, cuenta.temas++)`, con `temas: [conTema, sinTemas]` en `:186` y la última respuesta repetida);
  - el `QueryClient` de la prueba es nuevo y tiene `staleTime` 0 (`:129`);
  - tras un `404 TEMA_NO_ENCONTRADO` al guardar, el formulario renueva los temas y no la tarea, y hoy hay exactamente dos `GET …/temas` (`:195`): el del montaje (`conTema`) y la renovación (`sinTemas`).
- **El remedio de T-02 y T-03** (§D-8.6) pide, al abrir la edición, volver a pedir temas y categorías, sin decidir la ausencia con la caché ni con una lectura previa en vuelo.
  - Si el programador lo implementa con `refetchOnMount: "always"`, o con la consulta del montaje cuando la caché está vacía, el montaje sigue pidiendo **uno**. El caso no cambia y C-8 **no aplica**.
  - Si lo implementa como una petición explícita además de la del montaje (un `invalidateQueries`, que por omisión cancela y repite, o un `refetch()` en un efecto), el montaje pide **dos**. Entonces el formulario recibe `sinTemas` antes de guardar, y el caso cambia en la cifra y en la secuencia.
- **Condición exacta para aplicarlo:** que, con la implementación del programador, el caso caiga porque `:195` no da 2, o porque el montaje consume más de una respuesta de la secuencia de `:93`. En ese caso ajusto **solo** esa cifra y esa secuencia, por ejemplo `temas: [conTema, conTema, sinTemas]` y `toHaveLength(3)`, con el comentario literal del plan: `// FORO-01c2, C-8 (§E8.3; §D-8.6, T-02 y T-03): al abrir la edición se vuelven a pedir los temas; lo demás que protege el caso no cambia.`
- Si cambia otra cosa (por ejemplo, que lo escrito ya no se conserva o que la versión del segundo guardado cambia), PARADA.
- Hoy: `npx vitest run src/features/tareas/tareas-01a-r1.ataque.test.tsx` → `Tests  6 passed (6)`.

### C-15: `lib/guardas-ch4-r1.ataque.test.ts` (ATQ-CH4-32 y ATQ-CH4-34) — preparado, sin escribir
- **ATQ-CH4-32** (`:87-92`):
  - **Dónde:** la lista de `:89-92` compara `fuera` en el orden del glob (`import.meta.glob("/src/**/*.{ts,tsx}")`, `:11`, alfabético). La entrada nueva va entre `:90` (`…/features/clases/components/editor-de-categorias.tsx en «const reemplazarFilas…»`) y `:91` (`…/features/tareas/editar-tarea-view.tsx en «const handleGuardar = async (datos: CrearTarea, version: number) => {»`), porque `editar-foro-view` va antes que `editar-tarea-view`. La comprobó el manager.
  - **Texto:** `"/src/features/tareas/editar-foro-view.tsx en «<la línea de handleGuardar, tal cual la declare el programador, sin la sangría>»"`. Lleva arriba, en la línea siguiente al comentario de `:87-88`, el literal de §E8.2: `// FORO-01c2 ronda 0 (C-15, §E8.2): la edición del foro tiene la forma de la de la tarea (la guarda vive en formulario-tarea.tsx y la recarga tras el conflicto es una sola petición esperada).`
- **ATQ-CH4-34** (`:106-121`):
  - **Dónde:** la lista de `:112-120` se ordena con `.sort()`, así que el lugar no importa. Va después de la de `editar-tarea-view.tsx` (`:115`), con el mismo comentario literal arriba.
  - **Texto:** `"/src/features/tareas/editar-foro-view.tsx: const resultado = await consulta.refetch()"`.
- Hoy: `npx vitest run src/lib/guardas-ch4-r1.ataque.test.ts` → `Tests  6 passed (6)`.

**Mi opinión sobre la secuencia** (el programador declara, yo aplico en una "ronda 0 bis" antes de la verificación del manager, y mientras tanto ATQ-CH4-32 y ATQ-CH4-34 pueden quedar en rojo sin que sea PARADA): **la acepto.** Es lo que pide §E9.6 ("el programador declara las dos líneas tal cual y el tester las copia, como en C-16").

Propongo una mejora, que no apliqué y que decide el manager:
- **La línea de ATQ-CH4-34 ya está fija en el plan**, letra por letra: §E8.2, C-15, "la recarga tras el conflicto, `const resultado = await consulta.refetch()`, dentro de `recargarTrasConflicto`". Puedo aplicarla ahora, en esta ronda 0. Así ATQ-CH4-34 queda roja solo por la razón esperada (falta `editar-foro-view.tsx`) y se pone verde cuando el programador cree el archivo con esa forma.
- **Solo la de ATQ-CH4-32 espera a la declaración**, porque §E9.6 deja la firma de `handleGuardar` al programador.
- En los dos caminos, el programador no toca `guardas-ch4-r1.ataque.test.ts`. Si su forma no es la del plan, es PARADA suya (§E8.2: "Si la forma es otra, PARADA").

### Nota para 01d (no se hace ahora)
FORO-1D29 debe cubrir las dos formas de la entrega del alumno sin participar en "Actividades": `entrega: null` y `{ estado: "asignado", conRetraso: false }`, la segunda cuando el admin borró la principal (O-01b-1). Las dos deben dar la misma insignia y la misma segunda línea, con el foro abierto y vencido, como ya lo prueba FORO-1C02 en "Foro" (`foros-01c.test.tsx:354-378`).

### Corridas (desde `frontend/`, una a la vez)
- `npx vitest run src/features/tareas/tareas-01a-r1.ataque.test.tsx` → `Tests  6 passed (6)`.
- `npx vitest run src/lib/guardas-ch4-r1.ataque.test.ts` → `Tests  6 passed (6)`.
- Sin `lint`: no cambié ningún archivo de `frontend/`.

### V-01 final
`sha256sum -c foro01-arranque/v01-foro01c2-base.txt` → 302 de 302 `OK`. Ninguna `*.ataque` cambió, y `git status --short -- frontend backend shared` sigue vacío. No hay lista nueva: la vigente sigue siendo `v01-foro01c2-base.txt`.

### Paradas
Ninguna.

## Ronda 0 bis — FORO-01c2 (2026-11-16)

Resultado: **C-15 aplicado; C-8 no se activa; sin PARADA.** Solo cambió `frontend/src/lib/guardas-ch4-r1.ataque.test.ts`, con 4 líneas añadidas y ninguna quitada. Plan vigente: 2897 líneas, con la Enmienda 10 (§E10, que no cambia ninguna `*.ataque`).

### Arranque
- V-01 de arranque: `sha256sum -c foro01-arranque/v01-foro01c2-base.txt` → 302 de 302 `OK`. La implementación del programador (los archivos de `frontend/` que da `git status`, entre ellos `editar-foro-view.tsx`, `crear-foro-view.tsx` y `foro-view.tsx`, nuevos) no tocó ninguna `*.ataque`.

### La forma que fija §E8.2 (C-15), comprobada en `frontend/src/features/tareas/editar-foro-view.tsx`
- `EdicionDelForo` es el componente interno, montado con `key={foroId}` en `:154`, dentro de la raíz de foco de `EditarForoDeLaClase`.
- `handleGuardar` está en `:108`, a cuatro espacios, dentro de la función anidada `contenido()` (`:81`). Llama a `editar.mutateAsync({ ...cuerpoDeForo(datos), version })` (`:109`) y no tiene ref propia.
- La guarda vive en `formulario-tarea.tsx`: `guardandoRef` en `:192`, `:210` y `:217`, la llamada a `onGuardar` en `:243` y la liberación en el `finally` de `:279`. Es la excepción de §D-5, la misma que ya cubre `editar-tarea-view.tsx`.
- `const resultado = await consulta.refetch()` está en `:119`, dentro de `recargarTrasConflicto` (`:116`). Es una sola petición esperada, después de las comprobaciones de montado y vigencia (`:117` y `:118`), y `FormularioTarea` la recibe como `onConflicto` (`:135`).
- **La forma es la del plan.**

### C-15 aplicado en `frontend/src/lib/guardas-ch4-r1.ataque.test.ts`
- **Respaldo previo:** `tester-r1/guardas-ch4-r1.ataque.test.ts.antes-c15`, con SHA-256 `1b8b1b6b…20e73`, igual al de la lista base.
- **Antes**, con la implementación y sin C-15, `npx vitest run src/lib/guardas-ch4-r1.ataque.test.ts` → `Tests  2 failed | 4 passed (6)`. Las dos entradas que reportó el caso al fallar, y de ahí las copié:
  - ATQ-CH4-32: `+ "/src/features/tareas/editar-foro-view.tsx en «const handleGuardar = async (datos: CrearTarea, version: number) => {»"`;
  - ATQ-CH4-34: `+ "/src/features/tareas/editar-foro-view.tsx: const resultado = await consulta.refetch()"`.

  Las dos coinciden letra por letra con lo que declaró el programador.
- **ATQ-CH4-32**, en la lista de `:89`: pasa de 2 entradas (editor-de-categorias y editar-tarea-view) a **3**. La nueva va entre las dos, en el orden del glob: queda en `:92`, con el comentario literal en `:91`.
- **ATQ-CH4-34**, en la lista ordenada con `.sort()`: pasa de 5 entradas a **6**. La nueva va después de la de `editar-tarea-view.tsx`: queda en `:119`, con el comentario literal en `:118`.
- **Comentario literal**, en las dos: `// FORO-01c2 ronda 0 (C-15, §E8.2): la edición del foro tiene la forma de la de la tarea (la guarda vive en formulario-tarea.tsx y la recarga tras el conflicto es una sola petición esperada).`
- **Nada más cambió.** `diff` contra el respaldo da solo `90a91,92` y `115a118,119`; `git diff --stat` da `1 file changed, 4 insertions(+)`.

### C-8 (`features/tareas/tareas-01a-r1.ataque.test.tsx:176-195`): no se activa
Con la implementación del programador, el caso sigue en verde con sus 2 `GET …/temas` (`:195`) y la misma secuencia: abrir la edición no suma una petición ni consume una segunda respuesta. No lo apliqué; el archivo está igual a la lista base.

### Corridas (desde `frontend/`, una a la vez)
- `npx vitest run src/lib/guardas-ch4-r1.ataque.test.ts` → `Tests  6 passed (6)`.
- `npx vitest run src/features/tareas/tareas-01a-r1.ataque.test.tsx` → `Tests  6 passed (6)`.
- `npm run lint` → ESLint sin errores; Prettier dice `All matched files use Prettier code style!`; `tsc -b` termina sin salida y con código 0.

### V-01 final
- **Lista nueva:** `foro01-arranque/v01-foro01c2-r0.txt`. Tiene las mismas 302 rutas, en el orden de la base, y `sha256sum -c` da 302 de 302 `OK`. Su SHA-256 es `df38e3f083a089e9a0f3161e17ab2c037161c51c909c8e1c8147ef87d04c21d3`.
- **Cotejo con la base** (`v01-foro01c2-base.txt`, SHA-256 `061d8fd9…7634c`): `diff` da una sola línea, la 287, la de `frontend/src/lib/guardas-ch4-r1.ataque.test.ts`, que pasa de `1b8b1b6b…20e73` a `c793d8dc985dd3500a56e721618e96c572da534a8a31a501a68efaf73f10231f`.

### Paradas
Ninguna. No ataqué: la ronda 1 viene después de que el manager verifique el resumen del programador.

## Ronda 1 — FORO-01c2 (2026-11-16)
# Reporte del Tester — FORO-01c2 (vistas del foro: detalle, crear y editar) — Ronda 1
Veredicto: **ROTO**. Un hallazgo de severidad media, T-01.

Verificación propia (desde `frontend/`, una corrida a la vez, sin otra copia de trabajo corriendo):
- `npm run lint`: salida 0, termina en `> tsc -b`.
- `npx vitest run src/features/tareas`: `Tests  3 failed | 1497 passed (1500)` (`Test Files  1 failed | 50 passed (51)`). Los 3 rojos son los de T-01.
- `npx vitest run src/app src/lib src/services`: `Tests  983 passed (983)` (`Test Files  66 passed (66)`).
- Mis `*.ataque` de 01c1, `npx vitest run src/features/clases/foros-01c1-r1.ataque.test.tsx src/features/clases/foros-01c1-r1-foco.ataque.test.tsx`: `Tests  33 passed (33)`.

**Archivo nuevo:** `frontend/src/features/tareas/foros-01c2-r1.ataque.test.tsx`, con 41 casos (`npx vitest list … | grep -a -c "^src/"`) y los ids ATQ-FORO-111 a ATQ-FORO-123.
- Arnés: el router real (`rutas`) y el `QueryClient` de `app/providers.tsx` (`staleTime` de 30 s, un reintento).
- El doble del servidor responde un `400 VALIDACION` con `foroId:` ante un id que no es uuid, como `foroIdParamSchema` de `shared/src/foros.ts`.
- No localiza nada por clases de estilo, y todos los casos afirman algo.

V-01 de arranque: `sha256sum -c v01-foro01c2-r0.txt` → 302 de 302 `OK` (lista con SHA-256 `df38e3f0…`).

## Hallazgos

### T-01 — Un `:foroId` igual a «lista» comparte clave con la lista de «Foro»: la aplicación entera se rompe
Para no confundirlo con los T-01 a T-05 de CLASES-03d que nombra el plan: es el T-01 de FORO-01c2, ronda 1.

**Severidad:** media. Es un caso borde mal resuelto: se llega solo con una URL escrita, guardada o compartida, pero tumba la aplicación completa hasta recargar.

**Prueba:** `frontend/src/features/tareas/foros-01c2-r1.ataque.test.tsx`
- «ATQ-FORO-111: maestro abre «Foro» y después …/foros/lista: la vista dice que el foro no existe, sin romperse, y la lista sigue sirviendo»;
- «ATQ-FORO-111: estudiante abre «Foro» y después …/foros/lista: …»;
- «ATQ-FORO-111: el maestro abre «Foro» y después …/foros/lista/editar: la vista dice que el foro no existe, sin romperse».

**Pasos:**
1. Como maestro, admin o alumno, abrir la sección «Foro» de una clase. La lista queda en caché con la clave `["clases", claseId, "foros", "lista"]` (`claveListaDeForos`).
2. Ir a `…/clases/:claseId/foros/lista`, o, con maestro o admin, a `…/foros/lista/editar`.
3. Pasa lo siguiente:
   - `useForo(claseId, "lista")` pide `claveForo(claseId, "lista")`, que es `["clases", claseId, "foros", "lista"]`: la **misma** clave (`services/trabajoService.ts:26-29`);
   - `consulta.data` es el `{ pages, pageParams }` de la consulta infinita, así que `const { foro } = consulta.data` da `undefined`;
   - el detalle cae en `foro-view.tsx:83` (`foro.autor`), y la edición en `editar-foro-view.tsx:103` (`foro.puedeEditar`).

**Esperado:** la vista pinta «Ese foro ya no existe.». El servidor responde `400 VALIDACION` con `foroId: debe ser un identificador válido`, y §E7.3, punto 6, junto con `errorQueReemplazaLaVistaDelForo`, manda reemplazar la vista con ese texto. Después, «Foro» sigue mostrando su lista.

**Obtenido:** `TypeError: Cannot read properties of undefined (reading 'autor')`, y `'puedeEditar'` en la edición.
- El árbol de rutas no tiene `errorElement`, así que React Router reemplaza **toda** la aplicación con su pantalla por defecto, «Unexpected Application Error!», con la traza en pantalla.
- Ni la barra ni el marco sobreviven. Se sale solo recargando.

**Controles (verdes, en el mismo archivo):**
- sin la lista en caché, `…/foros/lista` sí dice «Ese foro ya no existe.»;
- abrir «Foro» después de `…/foros/lista` muestra la lista sin romperse.

El defecto aparece solo cuando la lista ya está en caché, que es el camino normal de quien acaba de pasar por «Foro».

**Requisito o regla violada:**
- §D-8.3 y §E7.3, punto 6: un `VALIDACION` de `foroId:` reemplaza la vista con «Ese foro ya no existe.»;
- `CLAUDE.md`, «Componentes: siempre error → cargando → vacío → datos»: la vista llega a «datos» con un dato que no es el suyo;
- §E8.2 / §D-8, claves: el prefijo del foro se diseñó para que «lo de cada foro colgará del suyo» (`trabajoService.ts:22-24`), pero la lista y cada foro comparten espacio de nombres.

El precedente del repositorio es el contrario: las entregas meten el segmento `"alumno"` justamente para que `claveEntregaDeAlumno` no choque con `claveListaDeEntregas` (`features/tareas/lib.ts:488-498`, comentario de ENTREGAS-01e).

**Hermanos probables:**
- `…/foros/lista/editar`: verificado, cae igual.
- En 01d y 01e, todo lo que cuelgue de `claveForo(claseId, foroId)` (participaciones, réplicas, participantes y devoluciones, desviación 3) hereda el mismo espacio. Con `foroId = "lista"`, colgaría de la clave de la lista.
- Fuera de 01c2, sin verificar, como observación O-01c2-2: `claveClaseDetalle(claseId) = ["clases", claseId]` contra `claveClasesAnteriores() = ["clases", "anteriores"]` (`services/clasesService.ts:21` y `:25`).

## Atacado sin hallazgos (por punto del manager)

**1. Borrar un foro con éxito** (ATQ-FORO-112, dos casos, y ATQ-FORO-113 «borrar»):
- probado con «Sí, borrar foro» (maestro) y con «Borrar con las participaciones» (admin, tras el `409 TAREA_CON_ENTREGAS`);
- después del `DELETE` no sale ningún `GET` del foro borrado, aunque el gancho hace `removeQueries` con la vista observando. Antes de navegar no se vuelve a pintar el detalle;
- «Ese foro ya no existe.» no aparece ni un instante (lo vigila un `MutationObserver` sobre el documento);
- hay un solo aviso, «Foro borrado», y ningún error;
- al llegar a «Foro», la lista se vuelve a pedir aunque estaba fresca en caché;
- quedan viejas las actividades, los temas, las categorías y las calificaciones (`isInvalidated`).

El foco tras borrar no lo ataqué: es la desviación 6, pendiente de decisión del humano.

**2. Temas y categorías al abrir la edición** (ATQ-FORO-118, cinco casos):
- si las dos lecturas fallan (con su reintento), los campos no se muestran y guardar manda el `temaId` y el `categoriaId` del foro;
- una lectura correcta posterior los muestra elegidos;
- un `VALIDACION` de `temaId:` con el campo oculto pinta su texto una sola vez y sin aviso. Cuando el campo aparece, el texto sigue siendo uno solo, el `Tema` queda con `aria-invalid="true"` y su `aria-describedby` apunta a ese texto;
- el reinicio tras un `409` vuelve a pedir las dos listas y el siguiente guardado lleva la versión 4, el tema y la categoría;
- abrir y cerrar la edición tres veces pide cada lista exactamente una vez por apertura, sin avisos.

La lectura de «Actividades» en vuelo al abrir la cubre FORO-1C34 (con la mutación N4 del programador), y no la dupliqué.

**3. La edición del foro sin caso (N-33)** (ATQ-FORO-119, cinco casos):
- con el foro en caché, una recarga que falla por `503` o por red avisa «No pudimos actualizar el foro. Puedes seguir editando; revisa tu conexión.»;
- una que falla por `429` avisa «…; inténtalo de nuevo en un momento.»;
- avisa una vez por fallo (dos fallos, dos avisos) y conserva lo escrito;
- en una clase archivada no avisa;
- si una recarga quita `puedeEditar` con el foco en «Título», la vista dice «No puedes editar este foro.» y el foco va a la raíz (`tabindex="-1"`, que contiene el mensaje), nunca a `<body>`. Sin aviso.

**4. Saltos con escrituras en vuelo:**
- **ATQ-FORO-114:** el `409` de A llega con la edición de B montada (salto con el router):
  - un solo aviso, el del conflicto, y ninguna lectura más de A ni de B;
  - A queda vieja;
  - lo escrito en B no se toca y su botón no queda en espera.
- **ATQ-FORO-115** (tres casos): con el borrado de A en vuelo, saltar al detalle de B. Con `204`, `404` o `403 BORRADO_NO_PERMITIDO`:
  - la persona sigue en B (no se navega a «Foro»);
  - B no se vuelve a pedir, y su «Borrar foro» queda disponible;
  - hay un solo aviso;
  - A sale de la caché (con `204` y con `404`) o queda vieja sin pedirse (con `403`).
- **ATQ-FORO-123:** publicar en la clase A y saltar a `…/foros/nuevo` de la clase B con la publicación en vuelo:
  - no se navega al foro nuevo y hay un solo «Foro publicado»;
  - el formulario de B nace vacío y su botón no queda en espera;
  - hay una sola escritura.

**5. Clase archivada** (ATQ-FORO-116, dos casos):
- **`409 CLASE_ARCHIVADA` al borrar:**
  - un aviso, y la clase se vuelve a pedir;
  - desaparecen «Editar foro» y «Borrar foro»;
  - no se navega y el detalle se queda.
- **Al guardar:**
  - un aviso, y el foro no se vuelve a pedir;
  - la ruta pasa a «Esta clase está archivada: solo se puede consultar.», con «Volver a Foro» y sin formulario.

Restaurar y volver a abrir la edición lo cubre FORO-1C41 (tarea y foro), y no lo dupliqué.

**6. `VALIDACION` y traducciones:**
- **Mutaciones M1 y M2** (abajo):
  - sumar `version` a los campos pintados de la tarea tumba FORO-1C40, en sus dos modos, y FORO-1C08 / FORO-1C11 (FORO-1C08);
  - sumarlo solo a los del foro tumba FORO-1C08 y FORO-1C11 (FORO-1C08), y deja vivo FORO-1C40. Es lo que pedía el manager.
- **ATQ-FORO-122** (cuatro casos):
  - una primera lectura con `VALIDACION` de `participacionId:` reemplaza la vista con un texto propio, sin el del servidor y sin aviso;
  - una recarga con `participacionId:` o con `ALUMNO_NO_ENCONTRADO` nunca muestra el texto crudo, ni en la vista ni en un aviso, y avisa a lo más una vez;
  - guardar con `participacionId:` da un solo aviso, «Esa participación ya no existe.», ningún texto crudo, conserva lo escrito y el botón sale de la espera.

**7. Las tres redirecciones de `apiClient`** (ATQ-FORO-117, seis casos):
- en la primera carga del detalle y de la edición, y en la recarga tras un `409`, con `401` sin refresco, `403 ACCESO_RESTRINGIDO` y `403 CAMBIO_DE_CONTRASENA_REQUERIDO`, se llama a `irA`;
- ningún aviso, salvo el del conflicto en el tercer camino.

**8. `AccionesDeLaTarea` con sus dos mutaciones** (ATQ-FORO-121, tres casos): sin `tipo`, con `"tarea"` y con `"foro"`, montada sola:
- los textos, el `href` de editar (`…/tareas/:id/editar` o `…/foros/:id/editar`) y la ruta del `DELETE` son solo de su tipo;
- el botón en vuelo es el de su tipo, el aviso es el de su tipo y hay una sola escritura.

**9. Los hermanos en la tarea (regresiones):**
- la suite de `src/features/tareas` queda verde salvo T-01: ADM-1D221 fila 36, PR-1D04, PR-1D05, FORO-1C30 a FORO-1C36, FORO-1C41 y las `*.ataque` previas de tareas;
- **doble clic:** FORO-1C50 los cubre con dos clics en un mismo render, y el programador los tumbó con N1 y N2. No repetí esas mutaciones;
- **«con el control montado de nuevo»:**
  - borrar otra vez exige volver a pulsar «Borrar foro» y luego «Sí, borrar foro», es decir, confirmar de nuevo, igual que la tarea;
  - guardar otra vez exige pulsar el botón principal de un formulario que se montó de nuevo;
  - ninguno de los dos reenvía con un solo clic sin confirmar, así que no aplica la regla de la caché de mutaciones de `CLAUDE.md`;
- **frases de recuperación:** las cubren FORO-1C24, FORO-1C26, FORO-1C27 y FORO-1C37, que siguen verdes. El salto de clase en crear (ATQ-FORO-123) no deja ninguna frase.

**10. N-32** (ATQ-FORO-113, dos casos, y ATQ-FORO-112). La conducta es la que dicen los títulos:
- publicar vuelve a pedir los temas y las categorías que el formulario mira, y deja viejas las calificaciones y las actividades;
- borrar deja viejas las actividades, los temas, las categorías y las calificaciones, y la lista de «Foro» se vuelve a pedir.

N-32 es solo de los títulos de FORO-1C05 y FORO-1C13, no un defecto de producción. Con la mutación M3 (quitar las invalidaciones de borrar), ATQ-FORO-112 y ATQ-FORO-113 caen.

**11. El alumno** (ATQ-FORO-120, dos casos, y ATQ-FORO-111 con el alumno):
- `…/foros/nuevo` y `…/foros/:foroId/editar` no le muestran ningún formulario y no escriben nada;
- el detalle no trae «Editar foro» ni «Borrar foro», aunque el servidor dijera `puedeEditar` y `puedeBorrar` en verdadero (la perspectiva decide qué se muestra);
- estado de pago: `shared/src/foros.ts` y las tres vistas no tienen `estadoPago` ni `accesoRestringido` (grep con 0 resultados).

### Mutaciones (8, todas en «Se toca» de 01c2)
Cada una con copia previa, un solo cambio en un ancla contada como única, restauración desde la copia y `filecmp` byte a byte (`cmp igual: True` en las ocho). Script: `scratchpad/tester-r1/mut01c2.py`. Al final, `sha256sum -c` de los seis archivos contra la lista previa da `OK` en todos.

| Mutación | Archivo y cambio | Cae |
|---|---|---|
| M1 | `data.ts`: `CAMPOS_DEL_FORMULARIO` suma `"version"` | FORO-1C40 ×2, FORO-1C08 y FORO-1C11 (FORO-1C08) |
| M2 | `data.ts`: `CAMPOS_DEL_FORMULARIO_DEL_FORO` sale de `[...CAMPOS_DEL_FORMULARIO, "version"]` | FORO-1C08 y FORO-1C11 (FORO-1C08); FORO-1C40 sigue verde |
| M3 | `hooks.ts`: sin el `await invalidarTrasCambiarElForo` de `useBorrarForo` | ATQ-FORO-112 ×2 y ATQ-FORO-113 (borrar) |
| M4 | `editar-foro-view.tsx`: sin `if (!montado.current) return` en `recargarTrasConflicto` | ATQ-FORO-114 |
| M5 | `editar-foro-view.tsx`: sin `!soloLectura` en el aviso de la recarga fallida | ATQ-FORO-119 (clase archivada) |
| M6 | `formulario-tarea.tsx`: sin el `ErrorDeCampo` del tema oculto | ATQ-FORO-118 (VALIDACION con el campo oculto) |
| M7 | `foro-view.tsx`: las acciones también para la perspectiva del alumno | ATQ-FORO-120 (detalle) |
| M8 | `crear-foro-view.tsx`: sin la guarda de montado y vigencia antes de navegar | ATQ-FORO-123 |

### Observaciones
- **O-01c2-1, defectos de mis pruebas en su primera corrida, ya corregidos:**
  - ATQ-FORO-117: el refresco fallido del primer montaje limpia el token, y faltaba `establecerToken` antes del segundo montaje;
  - ATQ-FORO-113: la clase del doble tiene una categoría, y faltaba elegirla para publicar;
  - ATQ-FORO-118: sin las listas en caché, el formulario pinta «Cargando» o el error de las opciones, que es la conducta de antes de 01c2. El arnés ahora las siembra antes de abrir la edición.
- **O-01c2-2, hermano probable de T-01, anterior a 01c2 y sin verificar:**
  - `claveClaseDetalle(claseId) = ["clases", claseId]` (`services/clasesService.ts:21`) coincide con `claveClasesAnteriores() = ["clases", "anteriores"]` (`:25`) cuando la URL es `…/clases/anteriores`. La ruta literal es `clases-anteriores`, así que `anteriores` cae en `:claseId`;
  - si «Clases anteriores» ya está en caché, `ClaseLayout` recibiría la lista como si fuera el detalle;
  - es de ADMIN-01d2 y está fuera de «Se toca» de 01c2. No lo ataqué con prueba; lo decide el manager.
- **O-01c2-3:** al guardar la edición con éxito, el gancho invalida los temas y las categorías con el formulario todavía montado. Salen dos `GET` justo antes de navegar al detalle. La tarea hace lo mismo y no tiene efecto visible.

## No atacado y por qué
- **El foco tras borrar un foro con éxito:** es la desviación 6, pendiente de decisión del humano (opciones A y B del manager).
- **Las mutaciones N1 y N2 del programador** (doble clic): no las repetí. FORO-1C50 está verde y su reescritura la revisó el manager.
- **Las `*.ataque` del backend** de 01a y 01b: 01c2 no toca `backend/` (`git status` vacío ahí), y el orquestador limitó las suites de esta ronda al frontend.
- **La suite completa del frontend:** la corre el manager al cerrar.
- **El navegador:** no se abre.

### V-01 final
- La lista base `v01-foro01c2-r0.txt` sigue con 302 de 302 `OK`.
- Lista nueva: `foro01-arranque/v01-foro01c2-r1.txt`, con 303 rutas (las 302 sin cambios más `frontend/src/features/tareas/foros-01c2-r1.ataque.test.tsx`, SHA-256 `0da9e707…2ea7`). `sha256sum -c` da 303 de 303 `OK`, y su SHA-256 es `487a062fad9136141d0bc411d6c2417e4decc77628f8987239dbe999c9938900`.
- Ninguna `*.ataque` previa cambió.
- `git status --short -- frontend backend shared` da 27: los 26 de antes más mi archivo nuevo.

## Ronda 2 — FORO-01c2 (2026-11-16)
# Reporte del Tester — FORO-01c2 (el remedio de T-01 y N-32) — Ronda 2
Veredicto: **ROTO**. Dos hallazgos de severidad baja, T-02 y T-03; ninguno crítico, alto ni medio.

- **El remedio de T-01 resiste.** La clave nueva no choca con ninguna otra, el aislamiento entre la lista y cada foro es el correcto, y la ronda 1 sigue verde.
- **T-02 es nuevo.** Un uuid en mayúsculas en la ruta, que el backend acepta y pasa a minúsculas, deja la clave de la vista distinta de la que borra el gancho.
- **T-03 es nuevo.** El detalle del foro, nuevo en 01c2, no se marca viejo cuando `features/clases` renombra o borra un tema o guarda las categorías, a diferencia del de la tarea.

En los dos, el remedio probable cae fuera de lo que 01c2 puede tocar o de su alcance (ver cada hallazgo); lo arbitra el manager.

**Verificación propia** (desde `frontend/`, una corrida a la vez, sin otra copia de trabajo corriendo):
- `npm run lint`: salida 0, termina en `> tsc -b`.
- `npx vitest run src/features/tareas`: `Tests  2 failed | 1548 passed (1550)` (`Test Files  1 failed | 52 passed (53)`). Los 2 rojos son T-02.
- `npx vitest run src/features/clases`: `Tests  3 failed | 3138 passed (3141)` (`Test Files  1 failed | 128 passed (129)`). Los 3 rojos son T-03.
- `npx vitest run src/app src/lib src/services`: `Tests  983 passed (983)` (`Test Files  66 passed (66)`).

**Archivos nuevos** (los ids empiezan en ATQ-FORO-124):
- `frontend/src/features/tareas/foros-01c2-r2.ataque.test.tsx`: 39 casos, de ATQ-FORO-124 a ATQ-FORO-126 y ATQ-FORO-128. Su doble del servidor hace lo mismo que el backend: pasa un uuid a minúsculas, contesta `400 VALIDACION` con `foroId:` (o `tareaId:`) a un id que no es uuid y `404` a una ruta que no existe.
- `frontend/src/features/clases/foros-01c2-r2-temas.ataque.test.tsx`: 3 casos, ATQ-FORO-127. Llama a los ganchos de producción `useRenombrarTema`, `useBorrarTema` y `useGuardarCategorias` de `features/clases/hooks.ts`, y monta el detalle con el router real.

Ninguno localiza elementos por clases de estilo y todos los casos afirman algo. El archivo de la ronda 1 no se tocó.

V-01 de arranque: `sha256sum -c v01-foro01c2-r1.txt` dio 303 de 303 `OK` (lista con SHA-256 `487a062f…`).

## Hallazgos

### T-02 — Un uuid en mayúsculas en la ruta: después de borrar, «atrás» pinta el foro borrado, y un 404 al borrar no reemplaza la vista
**Severidad:** baja. Solo se llega escribiendo la URL a mano, o con un enlace que alguien pasó a mayúsculas.

**Pruebas:** en `frontend/src/features/tareas/foros-01c2-r2.ataque.test.tsx`:
- «ATQ-FORO-126: en mayúsculas, borrar con éxito y volver «atrás» no pinta el foro borrado»;
- «ATQ-FORO-126: en mayúsculas, borrar con un 404 con la vista montada la reemplaza con «Ese foro ya no existe.»».

Los controles en minúsculas pasan: «ATQ-FORO-126 (control): …» y la fila «minúsculas (control)».

**Por qué pasa:**
- El backend acepta el id en mayúsculas y lo pasa a minúsculas (`shared/src/foros.ts:20-24`, `foroIdSchema` con `.transform((id) => id.toLowerCase())`), así que `GET …/foros/<UUID-EN-MAYÚSCULAS>` responde el foro con su `id` en minúsculas.
- La vista guarda el foro bajo la clave de la ruta, `claveForo(claseId, <MAYÚSCULAS>)`, en `foro-view.tsx:45` (`useForo(claseId, foroId)`).
- `AccionesDeLaTarea` borra con el id de los datos, `useBorrarForo(claseId, tarea.id)` en `acciones-de-la-tarea.tsx:46`, que está en minúsculas. Por eso:
  - con éxito, `removeQueries({ queryKey: claveForo(claseId, <minúsculas>) })` (`hooks.ts:789`) no encuentra la consulta que mira la vista, y la de las mayúsculas queda en caché, fresca durante 30 s;
  - con un error, `renovarTrasErrorAlBorrar` busca observadores en la clave de las minúsculas, no encuentra ninguno y toma el camino de «la vista ya no está»: `removeQueries` de una clave que no existe y ninguna recarga del foro que se ve.

**Pasos y obtenido:**
1. **Borrado con éxito.** Abrir «Foro», luego `…/foros/<A EN MAYÚSCULAS>`, luego «Borrar foro» → «Sí, borrar foro». La app navega a «Foro» y avisa «Foro borrado». Al pulsar «atrás», el detalle pinta el foro borrado, con su título y su «Borrar foro», sin pedir nada.
   - **Esperado,** como en minúsculas (el control, y la regla T-05 de FORO-1C35 y FORO-1C36): «Ese foro ya no existe.».
2. **Borrado que choca con otra persona.** En `…/foros/<A EN MAYÚSCULAS>`, otra persona ya lo borró. «Borrar foro» → «Sí, borrar foro» responde `404`. Sale el aviso «Ese foro ya no existe.», pero la vista sigue pintando el foro.
   - **Esperado,** como en minúsculas (PR-1D05 y la desviación 7): se vuelve a pedir el foro y su `404` reemplaza la vista.

**Requisito o regla violada:**
- T-05, en FORO-1C35 y FORO-1C36: «atrás» no pinta el que ya no existe;
- la matriz de §D-10 para `404` con la vista montada: «el foro se vuelve a pedir y su `404` reemplaza la vista»;
- `CLAUDE.md`: «Lo abierto es del id de la ruta». La clave que se escribe y la que se lee deben ser la misma.

**Hermanos probables:**
- **La tarea, sin verificar.** `…/tareas/<MAYÚSCULAS>` con `useBorrarTarea(claseId, tarea.id)`, en el mismo `AccionesDeLaTarea`. `tareaIdParamSchema` también pasa el id a minúsculas (`shared/src/tareas.ts:223`). Es anterior a 01c2.
- **La edición en mayúsculas.** Escribe en la clave de las mayúsculas (`useEditarForo(claseId, foroId)`), y un detalle en minúsculas que ya estaba en caché queda viejo hasta 30 s.
- **01d y 01e,** todo lo que cuelgue de `claveForo` con el id de la ruta frente al id de los datos.

**Remedio de familia, citado de la revisión del manager (O-01c2-2):** que las vistas rechacen un id que no sea un uuid canónico antes de pedir nada. Cubriría también este caso si «canónico» incluye las minúsculas. No lo propongo; lo arbitra el manager.

### T-03 — Renombrar o borrar un tema, o guardar las categorías, no marca viejo el detalle del foro, y sí el de la tarea
**Severidad:** baja. Es un dato viejo a la vista durante a lo más 30 s (el `staleTime`). No se pierde nada, porque al guardar el formulario confirma sus listas (T-02 y T-03 de CLASES-03d).

**Prueba:** en `frontend/src/features/clases/foros-01c2-r2-temas.ataque.test.tsx`, los tres casos de «ATQ-FORO-127: «%s» marca viejo el detalle del foro como el de la tarea, y al volver al foro antes de 30 s se ve lo nuevo», uno por cada acción: «Renombrar el tema», «Borrar el tema» y «Guardar las categorías».

**Pasos:**
1. El maestro abre el detalle de un foro con el tema «Unidad 1» y la categoría «Participación (30 %)».
2. Va a «Foro».
3. Desde la misma sesión, con los ganchos de producción `useRenombrarTema`, `useBorrarTema` o `useGuardarCategorias`, que son los que usan el editor de temas y el de categorías, renombra o borra el tema, o cambia el peso a 45.
4. Antes de 30 s vuelve al foro.

**Esperado:** como en la tarea, cuyo control en el mismo caso pasa (`claveTarea` queda con `isInvalidated === true`). El foro también queda viejo, se vuelve a pedir al abrirlo y «Detalles» dice «Unidad 1: la Revolución», «Sin tema» o «Participación (45 %)».

**Obtenido,** en los tres: `{ loQueSeVe: "Unidad 1" | "Participación (30 %)", seVolvioAPedir: false, marcadoViejo: false }`.
- Las tres mutaciones invalidan `["clases", claseId, "tareas"]` (`features/clases/hooks.ts:1471`, `:1494` y `:2135`, con el comentario «El nombre del tema también sale en el detalle de sus tareas» y «La categoría y su peso también salen en el detalle de las tareas»).
- Ninguna invalida `clavePrefijoDeForos`. En producción nadie lo hace: el grep de `clavePrefijoDeForos` fuera de `trabajoService.ts` da 0.

**Requisito o regla violada:**
- §D-8.3: el detalle del foro tiene la composición del de la tarea, con «Detalles», la categoría con su peso y el tema;
- la regla de esas tres mutaciones de `features/clases`: lo que cambia el detalle se marca viejo;
- `AGENTS.md`, «Hermanos de un hallazgo»: el patrón de la tarea no se extendió al foro.

**Dónde iría el remedio:** en `features/clases/hooks.ts`, que es «No se toca» en 01c2 y sí entra en 01d, que toca `features/clases`. Lo decide el manager, por ejemplo como condición de 01d.

**Hermanos probables:**
- **`useMoverElemento`** (`features/clases/hooks.ts:1597`) solo invalida `claveTarea(claseId, publicacionId)` y `claveRecurso`. Cuando 01d deje mover foros en «Actividades», el detalle del foro quedará viejo igual. No es alcanzable hoy.
- **El detalle de un recurso**, anterior y sin verificar. `claveRecurso` es `["clases", c, "recurso", id]`, y renombrar o borrar un tema invalida `clavePrefijoDeRecursos` (`["clases", c, "recursos"]`), que no lo alcanza. No sé si el detalle del recurso muestra el tema; no lo ataqué porque es de CLASES-03d.

## Atacado sin hallazgos (por punto del orquestador)

**1. Otros `:foroId` que no son uuid** (ATQ-FORO-124, 24 casos).
- Ids probados:
  - **maestro:** `foro`, `FORO`, `Lista`, `foros`, `%20`, `foro/editar`, `nuevo/editar`, `FORO/editar` y `%20/editar`;
  - **alumno:** `foro`, `FORO` y `%20`.
- En los dos órdenes: primero «Foro» y el foro B, luego la palabra; y al revés.
- Resultado: siempre dice «Ese foro ya no existe.», o, con `%20` (la ruta llega como `…/foros/` y el servidor no la tiene), un `MensajeError` sin el texto del servidor. Nunca «Unexpected Application Error», y la lista y el foro B quedan **con la misma referencia** en caché.
- Después, «Foro» muestra su fila y B se abre bien.

Que borrar y editar sigan invalidando y quitando con la clave nueva lo cubren ATQ-FORO-125 (punto 2) y la ronda 1 (punto 4).

**2. Aislamiento entre claves** (ATQ-FORO-125, tres casos).
- **Invalidar `claveForo(A)`:** pide A otra vez y no marca la lista ni B.
- **Invalidar la lista:** no marca ni pide ningún foro.
- **Invalidar `clavePrefijoDeForos`:** alcanza los tres.
- **`removeQueries` de B:** deja la lista.
- **Borrar A con éxito:** saca solo A. B queda en caché, con la misma referencia y sin marcar (abrirlo no lo pide), y la lista se vuelve a pedir.
- **Guardar A:** escribe la respuesta en A sin pedirlo, marca la lista y no toca B.

En producción ninguna clave del foro está escrita a mano: el grep de `"foros"` y de `claveForo|claveListaDeForos|clavePrefijoDeForos` fuera de `trabajoService.ts` solo da usos de las funciones y el segmento de ruta de `data.ts:505`.

Nada dependía de que la lista colgara de donde cuelga un foro: `features/clases` solo usa `claveListaDeForos` (`foros-view.tsx:65` y `:83`, `hooks.ts:1818`), y su suite sigue verde.

**3. Hermanos dentro de lo que FORO-01 tocó** (ATQ-FORO-128, ocho casos).
- Rutas probadas: `…/tareas/sin-tema`, `…/tareas/lista`, `…/tareas/trabajo`, `…/tareas/entregas`, `…/tareas/<uuid>/entregas/lista`, `…/tareas/<uuid>/entregas/alumno`, `…/foros/lista` y `…/foros/foro`.
- Con estas listas en caché: el trabajo «sin tema», los temas, las categorías, «Foro» y la lista de entregas.
- Cada una dice su texto o un `MensajeError` sin romperse, y ninguna lista cambia de referencia.
- No hay otro choque alcanzable: `claveTarea` (`[…, "tareas", id]`) no tiene hermanas fijas en ese nivel, y las entregas usan `"lista"` y `"alumno"` un nivel más abajo.
- `ClaseLayout` y `services/clasesService.ts` no se atacaron, como pidió el orquestador.

**4. Lo de la ronda 1 con la clave nueva.** Las 41 de `foros-01c2-r1.ataque.test.tsx` siguen en verde dentro de la suite de `src/features/tareas`:
- ATQ-FORO-111, ya en verde;
- ATQ-FORO-112: ningún `GET` después de borrar;
- ATQ-FORO-114: T-01 y T-04, con `isInvalidated` sobre la clave nueva;
- ATQ-FORO-115: T-05, con `removeQueries` e `isInvalidated` sobre la clave nueva;
- ATQ-FORO-116: la clase archivada;
- ATQ-FORO-118: T-02 y T-03;
- ATQ-FORO-119: la edición;
- ATQ-FORO-123: los saltos de clase.

El foco tras borrar ya lo decidió el humano (desviación 6, opción A), así que no se ataca.

**5. Los hermanos que declaró el programador:**
- **1, `lista/editar`:** cierto, con ATQ-FORO-111 en verde.
- **2, `foros/nuevo`:** cierto. ATQ-FORO-124 `nuevo/editar` dice «Ese foro ya no existe.», y la ruta literal del alumno lleva a `/login` (ATQ-FORO-120 de la ronda 1).
- **3, ninguna clave literal:** cierto, por grep.
- **4, las claves de 01d y 01e:** son futuras, nada que comprobar hoy.
- **5, las demás claves de `trabajoService.ts`:** cierto, con ATQ-FORO-128.
- **6, O-01c2-2:** fuera del ataque, por la instrucción.

**Los que faltan** son T-02 (el id de la ruta frente al id de los datos, con un uuid en mayúsculas) y, como vecino del mismo mecanismo de claves (quién invalida la del foro), T-03.

## Mutaciones (3, en «Se toca» de 01c2)
Cada una con copia previa, un ancla contada como única, restauración desde la copia y `filecmp` (`cmp igual: True` en las tres). Al final, `sha256sum -c` de `services/trabajoService.ts` y `features/tareas/hooks.ts` contra la lista previa da `OK`. Script: `scratchpad/tester-r1/mut01c2.py`, claves R1 a R3.

| Mutación | Archivo y cambio | Cae |
|---|---|---|
| R1 | `trabajoService.ts`: `claveForo` bajo `"lista"` en lugar de `"foro"` (la lista se vuelve prefijo de cada foro) | ATQ-FORO-125 ×3 |
| R2 | `hooks.ts`: el `removeQueries` de borrar con éxito usa el prefijo de los foros (`claveForo(…).slice(0, 3)`) | ATQ-FORO-125 (borrar) |
| R3 | `hooks.ts`: sin el `setQueryData` de guardar con éxito | ATQ-FORO-125 (guardar) |

La forma vieja de `claveForo` (sin segmento) no la repetí: es la P6 del programador, que tumba sus cuatro casos de T-01, y con ella mis ATQ-FORO-111 de la ronda 1 caían.

## Observaciones
- **O-01c2-4, un defecto de mi prueba en su primera corrida, ya corregido:** ATQ-FORO-127 se detenía en la primera aserción (`isInvalidated`) y no mostraba lo que se ve. Ahora reúne en un solo `toEqual` lo que se ve, si se volvió a pedir y si se marcó viejo.
- **O-01c2-5, `%20` como `:foroId`:** `useParams` lo decodifica a `" "`, y la petición sale como `…/foros/ ` (`apiClient` no codifica el id). El parser de URL le quita el espacio final y la petición llega como `…/foros/`, una ruta que el servidor no tiene. La vista dice el genérico, no «Ese foro ya no existe.». Es correcto, sin choque y sin romperse. En general, los ids de la ruta llegan sin codificar a la ruta de la API. Es anterior a 01c2 (lo hacen también la tarea y la clase) y lo cubriría el remedio de familia de O-01c2-2.

## No atacado y por qué
- **`ClaseLayout`, `services/clasesService.ts` y O-01c2-2:** fuera, por instrucción del orquestador.
- **El hermano de T-02 en la tarea y el del recurso de T-03:** no los verifiqué con prueba porque son anteriores a 01c2. Quedan como probables.
- **El foco tras borrar:** decisión del humano (desviación 6, opción A).
- **Las `*.ataque` del backend:** 01c2 no toca `backend/`.
- **La suite completa:** la corre el manager al cerrar.
- **El navegador:** no se abre.

### V-01 final
- La lista de arranque `v01-foro01c2-r1.txt` sigue con 303 de 303 `OK`: ninguna `*.ataque` previa cambió.
- Lista nueva: `foro01-arranque/v01-foro01c2-r2.txt`, con 305 rutas (las 303 de antes más mis dos archivos nuevos). `sha256sum -c` da 305 de 305 `OK`, y su SHA-256 es `0f9dd7792081553b324c236a50117267dc71b33a9d42739e9d263499df306ab7`.
  - `frontend/src/features/tareas/foros-01c2-r2.ataque.test.tsx`: SHA-256 `0b799262…66be7`, 39 casos.
  - `frontend/src/features/clases/foros-01c2-r2-temas.ataque.test.tsx`: SHA-256 `42148ef2…e6f8a`, 3 casos.
- `git status --short -- frontend backend shared` da 30: los 28 de antes más mis dos archivos.

## Ronda 3 — FORO-01c2 (2026-11-16)
# Reporte del Tester — FORO-01c2 (los remedios de T-02 y T-03) — Ronda 3, la última
Veredicto: **RESISTE**. No hay ningún hallazgo nuevo. Los remedios de T-02 y de T-03 aguantan por todos los caminos que ataqué, y lo de las rondas 1 y 2 sigue en verde con los dos.

**Verificación propia** (desde `frontend/`, una corrida a la vez, sin otra copia de trabajo corriendo):
- `npm run lint`: salida 0, termina en `> tsc -b`.
- `npx vitest run src/features/tareas`: `Tests  1573 passed (1573)` (`Test Files  54 passed (54)`).
- `npx vitest run src/features/clases`: `Tests  3149 passed (3149)` (`Test Files  130 passed (130)`).
- `npx vitest run src/app src/lib src/services`: `Tests  983 passed (983)` (`Test Files  66 passed (66)`).

**Archivos nuevos** (ids desde ATQ-FORO-129):
- `frontend/src/features/tareas/foros-01c2-r3.ataque.test.tsx`: 20 casos, de ATQ-FORO-129 a ATQ-FORO-133. Prueba un `:foroId` en mayúsculas y otro mezclado (los grupos pares en mayúsculas). El doble del servidor pasa el uuid a minúsculas, como `foroIdSchema`, y cuenta cualquier petición de un foro que salga con el id sin canonizar.
- `frontend/src/features/clases/foros-01c2-r3-temas.ataque.test.tsx`: 8 casos, ATQ-FORO-134. Llama a los ganchos de producción `useRenombrarTema`, `useBorrarTema`, `useGuardarCategorias` y `useEditarClase`, con el router real.

Ninguno localiza elementos por clases de estilo y todos los casos afirman algo. Mis archivos de las rondas 1 y 2 no se tocaron.

V-01 de arranque: `sha256sum -c v01-foro01c2-r2.txt` dio 305 de 305 `OK` (lista con SHA-256 `0f9dd779…`).

## Hallazgos
Ninguno.

## Atacado sin hallazgos (por punto del orquestador)

**1. T-02 con ids en mayúsculas o mezclados:**
- **ATQ-FORO-129** (cinco casos), borrar desde `…/foros/<MAYÚSCULAS>` y desde `…/foros/<MeZcLaDo>`:
  - **con éxito:** salen de la caché las dos formas de la clave y, al volver «atrás», la vista dice «Ese foro ya no existe.». Hay un solo «Foro borrado» y ninguna petición sale con el id sin canonizar;
  - **`403 BORRADO_NO_PERMITIDO` con la vista montada:** se pide el foro exactamente una vez, hay un solo aviso con el texto del servidor y la vista sigue;
  - **`404` con la vista montada (mezclado):** la vista se reemplaza con «Ese foro ya no existe.».
- **ATQ-FORO-130:**
  - la descarga con `403 SIN_ACCESO_A_LA_CLASE` en mayúsculas da un aviso, vuelve a pedir el foro (en minúsculas) y su `403` reemplaza la vista;
  - una recarga fallida en mayúsculas avisa una vez. Pasar a la URL en minúsculas no repite el aviso ni pide otra vez (es la misma instancia de la consulta y la misma memoria `ultimoFalloAvisado`), y el siguiente fallo avisa otra vez.
- **ATQ-FORO-131,** el historial entre `<A>` y `<a>`:
  - en el detalle, la confirmación de borrar abierta en mayúsculas sigue abierta en minúsculas y al volver «atrás», sin otra lectura;
  - en la edición, lo escrito se conserva sin otra lectura, y guardar manda una sola petición con la versión de apertura (3) y lleva al detalle en minúsculas.

  Es el mismo foro: no se monta dos veces ni guarda estado aparte.
- **ATQ-FORO-132,** la edición desde mayúsculas:
  - **un `409` con la vista montada:** un solo aviso, una sola lectura, el reinicio con el foco en «Título», y el siguiente guardado pasa con la versión 4;
  - **un `409` con la vista ya desmontada:** ninguna lectura, el foro queda viejo, y al volver en minúsculas se pide y guardar pasa con la versión 4;
  - **perder `puedeEditar` con el foco dentro (mezclado):** dice «No puedes editar este foro.» y el foco va a la raíz (`tabindex="-1"`), nunca a `<body>`;
  - **«Cancelar»:** apunta al detalle canónico y lo pinta de la caché sin otra lectura.
- **El alumno** (ATQ-FORO-133, dos casos): en mayúsculas y mezclado ve el foro sin acciones, con una sola lectura canónica.

**2. T-03 en los dos sentidos** (ATQ-FORO-134):
- **«Renombrar el tema», «Borrar el tema» y «Guardar las categorías»,** con el detalle del foro y la lista de «Foro» en caché y sin observadores:
  - los dos quedan con `isInvalidated === true` sin pedirse en ese momento, y al volver se pide cada uno exactamente una vez;
  - la tarea sigue marcándose vieja como antes.
- **Las tres mutaciones con un `500`:** no marcan viejos ni el foro, ni la lista, ni la tarea.
- **«Guardar las categorías» con una lectura del foro que nunca termina** (el detalle en caché sin observador): la mutación llega a `success` sin esperar nada y sin pedir el foro, con un solo aviso. La espera de «Guardar» no se alarga.

**3. Vecinos 13, 21 y 22:**
- **13, «Editar la clase»** (`useEditarClase`; ATQ-FORO-134, cuarta fila): el prefijo `claveClaseDetalle(claseId)` alcanza el detalle y la lista del foro. Quedan viejos y se piden al volver.

  Asignar maestros usa el mismo prefijo (`invalidarMaestrosDeLaClase`, `features/clases/hooks.ts:672-…`). Lo verifiqué por lectura y no le hice un caso aparte.
- **21** (ATQ-FORO-133): `…/foros/LISTA`, `…/foros/Lista/editar` y `…/foros/NUEVO/editar`, con «Foro» en caché, dicen «Ese foro ya no existe.» sin romperse. La lista conserva la misma referencia, y «Foro» se ve después.
- **22** (ATQ-FORO-133): la URL en mayúsculas que queda en el historial, al volver «atrás», pinta el mismo foro de la caché sin otra lectura. La barra conserva las mayúsculas, que el manager aceptó.

**4. Regresión:**
- las suites de `src/features/tareas` (1573) y de `src/features/clases` están en verde, con mis archivos de las rondas 1, 2 y 3;
- en `src/features/tareas`, `foros-01c2-r1` (41) y `foros-01c2-r2` (39); en `src/features/clases`, `foros-01c2-r2-temas` (3);
- siguen verdes las claves de T-01, el aislamiento, las guardas, los `VALIDACION`, las redirecciones, la clase archivada y los saltos.

**5. El detalle menor del manager** (ATQ-FORO-132, «hallazgo menor del manager»):
- **Pasos:** abrir el detalle en minúsculas (queda en caché), ir a `…/<MAYÚSCULAS>/editar`, contar las lecturas **antes** de guardar y guardar.
- **Resultado:** al llegar al detalle no sale ninguna lectura del foro, se pinta el título nuevo y la URL queda en minúsculas.
- **La conducta es la correcta.** El caso sí vigila «sin volver a pedirlo»: S2 lo tumba.

## Mutaciones (5)
Están en «Se toca» (`foro-view.tsx` y `editar-foro-view.tsx`) y en `features/clases/hooks.ts`, solo sobre las tres invalidaciones nuevas, como autorizó el orquestador.

Cada una con copia previa, un ancla contada como única, restauración desde la copia y `filecmp` (`cmp igual: True` en las cinco). Al final, `sha256sum -c` de los tres archivos contra la lista previa da `OK`. Script: `scratchpad/tester-r1/mut-r3-extra.py`, sobre `mut01c2.py`.

| Mutación | Archivo y cambio | Cae |
|---|---|---|
| S1 | `foro-view.tsx`: sin `idCanonicoDeLaRuta` a la entrada | 10: ATQ-FORO-129 ×5, ATQ-FORO-130 ×2, ATQ-FORO-131 (detalle) y ATQ-FORO-133 (alumno) ×2 |
| S2 | `editar-foro-view.tsx`: sin `idCanonicoDeLaRuta` a la entrada | 6: ATQ-FORO-131 (edición) y ATQ-FORO-132 ×5, incluido el caso del detalle menor del manager |
| S3 | `features/clases/hooks.ts`: sin la invalidación nueva de `useRenombrarTema` | ATQ-FORO-134 «Renombrar el tema» |
| S4 | ídem, de `useBorrarTema` | ATQ-FORO-134 «Borrar el tema» |
| S5 | ídem, de `useGuardarCategorias` | ATQ-FORO-134 «Guardar las categorías» |

## Observaciones
- **O-01c2-6, un defecto de mi prueba en su primera corrida, ya corregido:** en `foros-01c2-r3-temas.ataque.test.tsx`, `useEditarClase` recibía `descripcion: null`, que el tipo de `editarClaseSchema` no admite. `tsc -b` lo marcó y ahora la prueba manda solo `nombre`.
- **O-01c2-7, anterior a FORO-01:** la tarea tiene el mismo defecto que T-02 con un uuid en mayúsculas. Ya lo registró el manager en su arbitraje, con destino a `ESTADO.md` §3, y no lo volví a probar.
- **O-01c2-8, anterior a FORO-01 y sin verificar con prueba:** el `claseId` en mayúsculas (`…/clases/<CLASE EN MAYÚSCULAS>/foros/<a>`).
  - `ConClaseDeLaRuta` pasa el `claseId` crudo, así que la lista, el foro y sus invalidaciones viven bajo la clave en mayúsculas. Dentro de esa URL son consistentes entre sí.
  - Un mismo foro abierto con las dos formas del `claseId` tendría dos entradas en la caché, y borrar o guardar en una no alcanza la otra hasta que pasen los 30 s.
  - Es de la familia de O-01c2-2 (`ConClaseDeLaRuta` y `clasesService`, en «No se toca»), así que no lo ataqué.
- **O-01c2-9:** React Router compara las rutas sin distinguir mayúsculas, así que `…/foros/NUEVO` entra a la ruta literal `foros/nuevo` (crear, para el maestro; `/login`, para el alumno), y no a `:foroId`. No es un defecto y no le escribí un caso. `…/foros/NUEVO/editar` sí entra a `:foroId/editar` y dice «Ese foro ya no existe.» (ATQ-FORO-133).

## No atacado y por qué
- **`ClaseLayout`, `services/clasesService.ts` y la tarea en mayúsculas:** fuera, por la instrucción del orquestador. Quedan como observaciones.
- **`useMoverElemento`:** es de 01d.
- **Asignar maestros:** lo verifiqué por lectura, no con un caso (el mismo prefijo que «Editar la clase»).
- **Las `*.ataque` del backend:** 01c2 no toca `backend/`.
- **La suite completa:** la corre el manager al cerrar.
- **El navegador:** no se abre.

### V-01 final
- La lista de arranque `v01-foro01c2-r2.txt` sigue con 305 de 305 `OK`: ninguna `*.ataque` previa cambió.
- Lista nueva: `foro01-arranque/v01-foro01c2-r3.txt`, con 307 rutas (las 305 de antes más mis dos archivos nuevos). `sha256sum -c` da 307 de 307 `OK`, y su SHA-256 es `7137cd23f1c3b707a0f5026ba74f6cd02c3b0da6e5c647306eb4390f6ed9f022`.
  - `frontend/src/features/tareas/foros-01c2-r3.ataque.test.tsx`: SHA-256 `54b81bff…07ace5`, 20 casos.
  - `frontend/src/features/clases/foros-01c2-r3-temas.ataque.test.tsx`: SHA-256 `c07d27e0…a802e1`, 8 casos.
- `git status --short -- frontend backend shared` da 33: los 31 de antes más mis dos archivos.
